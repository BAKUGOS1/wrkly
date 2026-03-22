import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { AppError } from './errors';

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  // 1. AppError (custom)
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({ error: error.message });
  }

  // 2. ZodError
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation error',
      details: error.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  // Fastify wrapped Zod errors
  if (error.cause instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation error',
      details: error.cause.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message,
      })),
    });
  }

  // 3. PrismaClientKnownRequestError
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return reply.status(409).send({ error: 'Resource already exists' });
    }
    if (error.code === 'P2025') {
      return reply.status(404).send({ error: 'Resource not found' });
    }
    // Return the actual database error to frontend so we can debug Railway connection
    request.server.log.error(error);
    return reply.status(500).send({ error: `DB Error: ${error.message}` });
  }

  // 4. JWT errors
  if (error.code && error.code.startsWith('FST_JWT')) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
  if (error.statusCode === 401) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }

  // 5. Unknown errors
  request.server.log.error(error);
  return reply.status(500).send({ error: 'Internal server error' });
}
