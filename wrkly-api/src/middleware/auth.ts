import type { FastifyRequest, FastifyReply } from 'fastify';
import { UnauthorizedError } from '../lib/errors';
import prisma from '../lib/prisma';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export async function authenticate(request: FastifyRequest, _reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing authentication token');
  }

  let decoded: { userId: string };

  try {
    decoded = await request.jwtVerify<{ userId: string }>();
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

  if (!decoded?.userId) {
    throw new UnauthorizedError('Invalid token payload');
  }

  // Verify the user still exists — guards against deleted accounts using old tokens
  const userExists = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true },
  });

  if (!userExists) {
    throw new UnauthorizedError('User account no longer exists');
  }

  request.userId = decoded.userId;
}

