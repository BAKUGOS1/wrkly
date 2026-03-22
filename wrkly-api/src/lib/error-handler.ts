import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError, PrismaClientInitializationError, PrismaClientValidationError } from '@prisma/client/runtime/library';
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

  // 3. PrismaClientKnownRequestError (query errors)
  if (error instanceof PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return reply.status(409).send({ error: 'Resource already exists' });
    }
    if (error.code === 'P2025') {
      return reply.status(404).send({ error: 'Resource not found' });
    }
    request.server.log.error(error);
    return reply.status(500).send({ error: `Database error (${error.code}): ${error.message}` });
  }

  // 3b. PrismaClientInitializationError (connection refused, bad URL, etc.)
  if (error instanceof PrismaClientInitializationError) {
    request.server.log.error(error);
    return reply.status(503).send({ error: `Database connection error: ${error.message}` });
  }

  // 3c. PrismaClientValidationError (schema mismatch, missing fields)
  if (error instanceof PrismaClientValidationError) {
    request.server.log.error(error);
    return reply.status(500).send({ error: `Database validation error: ${error.message}` });
  }

  // 4. JWT errors
  if (error.code && error.code.startsWith('FST_JWT')) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }
  if (error.statusCode === 401) {
    return reply.status(401).send({ error: 'Invalid or expired token' });
  }

  // 5. Unknown errors — expose message in non-production for debugging
  request.server.log.error(error);
  const msg = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : `Internal server error: ${error.message}`;
  return reply.status(500).send({ error: msg });
}

