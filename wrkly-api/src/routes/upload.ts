import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { saveFile, StorageError } from '../lib/storage';

// ── Routes ────────────────────────────────────────────────────────────────────

export async function uploadRoutes(app: FastifyInstance) {
  // ── POST /api/upload ────────────────────────────────────────────────────────
  app.post('/upload', { preHandler: authenticate }, async (request, reply) => {
    const data = await request.file();

    if (!data) {
      return reply.status(400).send({ error: 'No file provided' });
    }

    try {
      const saved = await saveFile(data);
      return reply.status(201).send(saved);
    } catch (err) {
      if (err instanceof StorageError) {
        return reply.status(err.statusCode).send({ error: err.message });
      }
      throw err; // Re-throw unexpected errors to Fastify's global handler
    }
  });
}
