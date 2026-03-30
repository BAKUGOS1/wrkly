import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { hashPassword, verifyPassword } from '../lib/auth';
import { AppError, UnauthorizedError } from '../lib/errors';
import { authenticate } from '../middleware/auth';
import prisma from '../lib/prisma';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../services/email';

// ── Schemas ────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(100),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  notificationSettings: z.object({
    emailGlobal: z.boolean().optional(),
    mentions: z.boolean().optional(),
    dueReminders: z.boolean().optional(),
    assignments: z.boolean().optional(),
    automations: z.boolean().optional(),
  }).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

// ── Routes ─────────────────────────────────────────────────────────────────

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
      select: { id: true, email: true, name: true, avatarUrl: true, notificationSettings: true },
    });

    const token = app.jwt.sign({ userId: user.id }, { expiresIn: '7d' });

    // Send welcome email (fire-and-forget)
    sendWelcomeEmail(email, name);

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
      select: { id: true, email: true, name: true, avatarUrl: true, passwordHash: true, notificationSettings: true },
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
      user: { id: user.id, email: user.email, name: user.name, avatarUrl: user.avatarUrl, notificationSettings: user.notificationSettings },
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
        notificationSettings: true,
        oauthProvider: true,
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
      select: { id: true, email: true, name: true, avatarUrl: true, notificationSettings: true },
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
          select: { id: true, email: true, name: true, avatarUrl: true, notificationSettings: true },
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
          select: { id: true, email: true, name: true, avatarUrl: true, notificationSettings: true },
        });
        isNewUser = true;

        // Send welcome email (fire-and-forget)
        sendWelcomeEmail(email, name);
      }
    }

    const token = app.jwt.sign({ userId: user.id }, { expiresIn: '7d' });
    const status = isNewUser ? 201 : 200;

    return reply.status(status).send({ user, token, isNewUser });
  });

  // PATCH /api/auth/me — update profile (name, avatarUrl, notificationSettings)
  app.patch('/me', { preHandler: authenticate }, async (request, reply) => {
    const result = updateProfileSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: result.error.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const { name, avatarUrl, notificationSettings } = result.data;
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (notificationSettings !== undefined) updateData.notificationSettings = notificationSettings;

    if (Object.keys(updateData).length === 0) {
      return reply.status(400).send({ error: 'No fields to update' });
    }

    const user = await prisma.user.update({
      where: { id: request.userId },
      data: updateData,
      select: { id: true, email: true, name: true, avatarUrl: true, notificationSettings: true },
    });

    return reply.send({ user });
  });

  // PATCH /api/auth/password — change password
  app.patch('/password', { preHandler: authenticate }, async (request, reply) => {
    const result = changePasswordSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: result.error.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const { currentPassword, newPassword } = result.data;

    const user = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { passwordHash: true, oauthProvider: true },
    });

    if (!user || !user.passwordHash) {
      throw new AppError('Cannot change password for OAuth accounts', 400);
    }

    const valid = await verifyPassword(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const newHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: request.userId },
      data: { passwordHash: newHash },
    });

    return reply.send({ message: 'Password updated successfully' });
  });

  // POST /api/auth/forgot-password — request password reset email
  app.post('/forgot-password', async (request, reply) => {
    const result = forgotPasswordSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: result.error.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const { email } = result.data;

    // Always return success to prevent user enumeration
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, oauthProvider: true },
    });

    if (user && !user.oauthProvider) {
      // Generate a secure token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordResetToken: resetToken, passwordResetExpiry: resetExpiry },
      });

      await sendPasswordResetEmail(email, user.name, resetToken);
    }

    // Always respond 200 to prevent email enumeration
    return reply.status(200).send({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  });

  // POST /api/auth/reset-password — reset password with token
  app.post('/reset-password', async (request, reply) => {
    const result = resetPasswordSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: result.error.issues.map((issue: z.ZodIssue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
    }

    const { token, newPassword } = result.data;

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
      select: { id: true },
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    return reply.send({ message: 'Password has been reset successfully. You can now log in.' });
  });

  // DELETE /api/auth/me — delete account
  app.delete('/me', { preHandler: authenticate }, async (request, reply) => {
    // Hard delete — Prisma cascades will clean up related records
    // First delete workspace memberships, then the user
    await prisma.$transaction(async (tx) => {
      // Remove from all workspace memberships
      await tx.workspaceMember.deleteMany({
        where: { userId: request.userId },
      });

      // Delete workspaces where user is the sole owner
      const ownedWorkspaces = await tx.workspace.findMany({
        where: { ownerId: request.userId },
        select: { id: true },
      });

      for (const ws of ownedWorkspaces) {
        const otherMembers = await tx.workspaceMember.count({
          where: { workspaceId: ws.id },
        });
        if (otherMembers === 0) {
          // No other members — delete the workspace
          await tx.workspace.delete({ where: { id: ws.id } });
        }
      }

      // Delete the user — cascades handle notifications, comments, etc.
      await tx.user.delete({ where: { id: request.userId } });
    });

    return reply.status(204).send();
  });
}
