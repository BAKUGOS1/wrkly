import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../lib/auth';
import { AppError, UnauthorizedError } from '../lib/errors';
import { authenticate } from '../middleware/auth';
import prisma from '../lib/prisma';

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register
  app.post('/register', async (request, reply) => {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: result.error.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const { email, name, password } = result.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AppError('Email already registered', 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, name, passwordHash },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    const token = app.jwt.sign({ userId: user.id }, { expiresIn: '7d' });

    return reply.status(201).send({ user, token });
  });

  // POST /api/auth/login
  app.post('/login', async (request, reply) => {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: result.error.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, avatarUrl: true, passwordHash: true },
    });

    // Same message for missing user or wrong password — prevents user enumeration
    if (!user || !user.passwordHash) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = app.jwt.sign({ userId: user.id }, { expiresIn: '7d' });

    return reply.status(200).send({
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl },
      token,
    });
  });

  // GET /api/auth/me — protected
  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        _count: { select: { workspaceMembers: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    return reply.status(200).send({ user });
  });

  // POST /api/auth/google
  app.post('/google', async (request, reply) => {
    const body = request.body as {
      idToken?: string;
      access_token?: string;
      googleUser?: {
        sub: string;
        email: string;
        name: string;
        picture: string;
        email_verified: boolean;
      };
    };

    let email: string;
    let name: string;
    let avatarUrl: string;
    let oauthId: string;

    // Flow A: access_token + googleUser from @react-oauth/google (client-side)
    if (body.access_token && body.googleUser) {
      const gu = body.googleUser;
      if (!gu.email_verified) {
        throw new UnauthorizedError('Google email not verified');
      }
      email = gu.email;
      name = gu.name;
      avatarUrl = gu.picture;
      oauthId = gu.sub;
    }
    // Flow B: idToken (server-side verification via Google tokeninfo endpoint)
    else if (body.idToken) {
      let googlePayload: {
        email: string;
        email_verified: string;
        name: string;
        picture: string;
        sub: string;
      };

      try {
        const res = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(body.idToken)}`
        );
        if (!res.ok) {
          throw new UnauthorizedError('Invalid Google token');
        }
        googlePayload = await res.json() as typeof googlePayload;
      } catch (err) {
        if (err instanceof UnauthorizedError) throw err;
        throw new UnauthorizedError('Invalid Google token');
      }

      if (googlePayload.email_verified !== 'true') {
        throw new UnauthorizedError('Google email not verified');
      }

      email = googlePayload.email;
      name = googlePayload.name;
      avatarUrl = googlePayload.picture;
      oauthId = googlePayload.sub;
    } else {
      throw new AppError('idToken or access_token is required', 400);
    }

    // Try to find by oauthProvider + oauthId first
    let user = await prisma.user.findFirst({
      where: { oauthProvider: 'google', oauthId },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    let isNewUser = false;

    if (!user) {
      // Check if email already exists under a different provider
      const existing = await prisma.user.findUnique({ where: { email } });

      if (existing) {
        if (existing.oauthProvider !== 'google') {
          throw new AppError('Email registered with different method. Please sign in with email/password.', 409);
        }
        // Edge case: same provider but oauthId mismatch — update it
        user = await prisma.user.update({
          where: { id: existing.id },
          data: { oauthId, avatarUrl },
          select: { id: true, email: true, name: true, avatarUrl: true },
        });
      } else {
        // Brand new user via Google
        user = await prisma.user.create({
          data: {
            email,
            name,
            avatarUrl,
            oauthProvider: 'google',
            oauthId,
            passwordHash: null,
          },
          select: { id: true, email: true, name: true, avatarUrl: true },
        });
        isNewUser = true;
      }
    }

    const token = app.jwt.sign({ userId: user.id }, { expiresIn: '7d' });
    const status = isNewUser ? 201 : 200;

    return reply.status(status).send({ user, token, isNewUser });
  });

  // PATCH /api/auth/me — update profile (name, avatarUrl)
  app.patch('/me', { preHandler: authenticate }, async (request, reply) => {
    const body = request.body as { name?: string; avatarUrl?: string };

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.avatarUrl !== undefined) updateData.avatarUrl = body.avatarUrl;

    if (Object.keys(updateData).length === 0) {
      return reply.status(400).send({ error: 'No fields to update' });
    }

    const user = await prisma.user.update({
      where: { id: request.userId },
      data: updateData,
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    return reply.send({ user });
  });

  // PATCH /api/auth/password — change password
  app.patch('/password', { preHandler: authenticate }, async (request, reply) => {
    const body = request.body as { currentPassword?: string; newPassword?: string };

    if (!body.currentPassword || !body.newPassword) {
      return reply.status(400).send({ error: 'currentPassword and newPassword are required' });
    }
    if (body.newPassword.length < 8) {
      return reply.status(400).send({ error: 'New password must be at least 8 characters' });
    }

    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      throw new AppError('Cannot change password for OAuth accounts', 400);
    }

    const valid = await verifyPassword(body.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const newHash = await hashPassword(body.newPassword);
    await prisma.user.update({
      where: { id: request.userId },
      data: { passwordHash: newHash },
    });

    return reply.send({ message: 'Password updated successfully' });
  });
}
