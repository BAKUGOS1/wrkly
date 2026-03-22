import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { AppError } from '../lib/errors';
import prisma from '../lib/prisma';

// ── Schema ────────────────────────────────────────────────────────────────────

const searchQuerySchema = z.object({
  q:           z.string().min(1).max(200),
  workspaceId: z.string().optional(),
  limit:       z.coerce.number().min(1).max(50).default(20),
});

// Shape returned by the raw SQL query
interface RawCardResult {
  id:          string;
  rank:        number;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function searchRoutes(app: FastifyInstance) {
  // ── GET /api/search ─────────────────────────────────────────────────────────
  app.get('/search', { preHandler: authenticate }, async (request, reply) => {
    const parsed = searchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { q, workspaceId, limit } = parsed.data;

    // ── 1. Resolve workspace scope ─────────────────────────────────────────
    let workspaceIds: string[];

    if (workspaceId) {
      // Verify the user is a member of the requested workspace
      const membership = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: { workspaceId, userId: request.userId },
        },
        select: { workspaceId: true },
      });
      if (!membership) throw new AppError('Workspace not found or access denied', 403);
      workspaceIds = [workspaceId];
    } else {
      // All workspaces the user belongs to
      const memberships = await prisma.workspaceMember.findMany({
        where: { userId: request.userId },
        select: { workspaceId: true },
      });
      workspaceIds = memberships.map((m) => m.workspaceId);
    }

    // No accessible workspaces → return empty
    if (workspaceIds.length === 0) {
      return reply.send({ results: [], totalCount: 0 });
    }

    // ── 2. Full-text search via raw SQL ────────────────────────────────────
    // Uses PostgreSQL's to_tsvector / plainto_tsquery for ranked FTS,
    // plus an ILIKE fallback to catch partial matches not in the tsvector.
    // Prisma.sql tagged template handles safe parameterization.
    // Escape special LIKE characters in user input
    const escapedQ = q.replace(/[\\%_]/g, '\\$&');

    const rawResults = await prisma.$queryRaw<RawCardResult[]>(Prisma.sql`
      SELECT
        c.id,
        ts_rank(
          to_tsvector('english', c.title || ' ' || COALESCE(c.description, '')),
          plainto_tsquery('english', ${q})
        ) AS rank
      FROM "Card"  c
      JOIN "List"  l ON l.id  = c."listId"
      JOIN "Board" b ON b.id  = l."boardId"
      WHERE c."isArchived" = false
        AND l."isArchived"  = false
        AND b."isArchived"  = false
        AND b."workspaceId" = ANY(ARRAY[${Prisma.join(workspaceIds)}]::text[])
        AND (
              to_tsvector('english', c.title || ' ' || COALESCE(c.description, ''))
                @@ plainto_tsquery('english', ${q})
              OR c.title       ILIKE ${'%' + escapedQ + '%'}
              OR c.description ILIKE ${'%' + escapedQ + '%'}
            )
      ORDER BY rank DESC, c."updatedAt" DESC
      LIMIT ${limit}
    `);

    const totalCount = rawResults.length;

    if (totalCount === 0) {
      return reply.send({ results: [], totalCount: 0 });
    }

    // ── 3. Enrich results via ORM (labels, list, board context) ───────────
    const matchedIds = rawResults.map((r) => r.id);

    // Preserve the rank-order from the raw query
    const rankOrder = new Map(rawResults.map((r, i) => [r.id, i]));

    const cards = await prisma.card.findMany({
      where: { id: { in: matchedIds } },
      select: {
        id:          true,
        title:       true,
        description: true,
        dueDate:     true,
        list: {
          select: {
            id:   true,
            name: true,
            board: { select: { id: true, name: true } },
          },
        },
        labels: {
          select: {
            label: { select: { name: true, color: true } },
          },
        },
      },
    });

    // Re-sort cards to match the relevance order from raw SQL
    cards.sort((a, b) => (rankOrder.get(a.id) ?? 0) - (rankOrder.get(b.id) ?? 0));

    const results = cards.map((card) => ({
      type:        'card' as const,
      id:          card.id,
      title:       card.title,
      description: card.description,
      board:       { id: card.list.board.id,  name: card.list.board.name },
      list:        { id: card.list.id,         name: card.list.name },
      dueDate:     card.dueDate,
      labels:      card.labels.map((cl) => ({ name: cl.label.name, color: cl.label.color })),
    }));

    return reply.send({ results, totalCount });
  });
}
