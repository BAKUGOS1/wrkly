import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import { NotFoundError } from '../lib/errors';
import prisma from '../lib/prisma';

// ── Schema ────────────────────────────────────────────────────────────────────

const activityQuerySchema = z.object({
  limit:  z.coerce.number().min(1).max(100).default(30),
  cursor: z.string().optional(),
});

// ── Shared select shape ───────────────────────────────────────────────────────

const activitySelect = {
  id:        true,
  action:    true,
  metadata:  true,
  createdAt: true,
  user: { select: { id: true, name: true, avatarUrl: true } },
} as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolve the createdAt for a cursor ID so we can do a time-based page. */
async function resolveCursorDate(cursorId: string): Promise<Date | undefined> {
  const log = await prisma.activityLog.findUnique({
    where: { id: cursorId },
    select: { createdAt: true },
  });
  return log?.createdAt;
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function activityRoutes(app: FastifyInstance) {
  // ── 1. GET /api/boards/:boardId/activity ──────────────────────────────────
  app.get('/boards/:boardId/activity', { preHandler: authenticate }, async (request, reply) => {
    const { boardId } = request.params as { boardId: string };

    // Resolve workspaceId for membership check
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { workspaceId: true },
    });
    if (!board) throw new NotFoundError('Board');
    await requireWorkspaceMember(request, board.workspaceId);

    const parsed = activityQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { limit, cursor } = parsed.data;
    const cursorDate = cursor ? await resolveCursorDate(cursor) : undefined;

    const logs = await prisma.activityLog.findMany({
      where: {
        boardId,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      select: activitySelect,
    });

    const hasNext = logs.length > limit;
    const page = hasNext ? logs.slice(0, limit) : logs;
    const nextCursor = hasNext ? page[page.length - 1].id : null;

    return reply.send({ activities: page, nextCursor });
  });

  // ── 2. GET /api/cards/:cardId/activity ────────────────────────────────────
  app.get('/cards/:cardId/activity', { preHandler: authenticate }, async (request, reply) => {
    const { cardId } = request.params as { cardId: string };

    // Resolve workspaceId through card → list → board
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { list: { select: { board: { select: { workspaceId: true } } } } },
    });
    if (!card) throw new NotFoundError('Card');
    await requireWorkspaceMember(request, card.list.board.workspaceId);

    const parsed = activityQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { limit, cursor } = parsed.data;
    const cursorDate = cursor ? await resolveCursorDate(cursor) : undefined;

    const logs = await prisma.activityLog.findMany({
      where: {
        cardId,
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      select: activitySelect,
    });

    const hasNext = logs.length > limit;
    const page = hasNext ? logs.slice(0, limit) : logs;
    const nextCursor = hasNext ? page[page.length - 1].id : null;

    return reply.send({ activities: page, nextCursor });
  });
}
