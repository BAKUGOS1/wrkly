import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import { NotFoundError } from '../lib/errors';
import { calculatePosition } from '../lib/position';
import prisma from '../lib/prisma';
import { listEvents } from '../lib/realtime';

const createListSchema = z.object({
  name: z.string().min(1).max(100),
});

const updateListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

const moveListSchema = z.object({
  // Option 1: direct position number
  position: z.number().optional(),
  // Option 2: neighbor IDs (preferred for DnD)
  afterId: z.string().optional(),
  beforeId: z.string().optional(),
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getListWithWorkspace(listId: string) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    include: { board: { select: { id: true, workspaceId: true } } },
  });
  if (!list) throw new NotFoundError('List');
  return list;
}

// Prisma JSON field accepts this as valid metadata
type JsonMeta = { [key: string]: string | number | boolean | null | JsonMeta | JsonMeta[] };

async function logActivity(
  workspaceId: string,
  boardId: string,
  userId: string,
  action: string,
  metadata?: JsonMeta
) {
  await prisma.activityLog.create({
    data: { workspaceId, boardId, userId, action, metadata },
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function listRoutes(app: FastifyInstance) {
  // ── POST /api/boards/:boardId/lists ────────────────────────────────────────
  app.post('/boards/:boardId/lists', { preHandler: authenticate }, async (request, reply) => {
    const { boardId } = request.params as { boardId: string };

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, workspaceId: true, isArchived: true },
    });
    if (!board || board.isArchived) throw new NotFoundError('Board');

    await requireWorkspaceMember(request, board.workspaceId, 'MEMBER');

    const parsed = createListSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { name } = parsed.data;

    // Find the highest existing position in this board
    const last = await prisma.list.findFirst({
      where: { boardId, isArchived: false },
      orderBy: { position: 'desc' },
      select: { position: true },
    });

    const position = last ? last.position + 1.0 : 1.0;

    const [list] = await prisma.$transaction([
      prisma.list.create({
        data: { boardId, name, position },
        select: { id: true, name: true, position: true, boardId: true },
      }),
      prisma.activityLog.create({
        data: {
          workspaceId: board.workspaceId,
          boardId: board.id,
          userId: request.userId,
          action: 'list.created',
          metadata: { name },
        },
      }),
    ]);

    listEvents.created(boardId, { list }, request.userId);

    return reply.status(201).send({ list });
  });

  // ── PATCH /api/lists/:id ────────────────────────────────────────────────────
  app.patch('/lists/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await getListWithWorkspace(id);
    await requireWorkspaceMember(request, data.board.workspaceId, 'MEMBER');

    const parsed = updateListSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const oldName = data.name;
    const [list] = await prisma.$transaction([
      prisma.list.update({
        where: { id },
        data: parsed.data,
      }),
      prisma.activityLog.create({
        data: {
          workspaceId: data.board.workspaceId,
          boardId: data.board.id,
          userId: request.userId,
          action: 'list.renamed',
          metadata: { oldName, newName: parsed.data.name ?? oldName },
        },
      }),
    ]);

    listEvents.updated(data.board.id, { listId: id, name: list.name ?? data.name }, request.userId);

    return reply.send({ list });
  });

  // ── PATCH /api/lists/:id/move ───────────────────────────────────────────────
  app.patch('/lists/:id/move', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await getListWithWorkspace(id);
    await requireWorkspaceMember(request, data.board.workspaceId, 'MEMBER');

    const parsed = moveListSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    let position: number;

    if (parsed.data.position !== undefined) {
      position = parsed.data.position;
    } else {
      // Resolve neighbor positions from IDs
      const { afterId, beforeId } = parsed.data;

      const [afterList, beforeList] = await Promise.all([
        afterId
          ? prisma.list.findUnique({ where: { id: afterId }, select: { position: true } })
          : null,
        beforeId
          ? prisma.list.findUnique({ where: { id: beforeId }, select: { position: true } })
          : null,
      ]);

      position = calculatePosition(
        afterList?.position ?? null,
        beforeList?.position ?? null
      );
    }

    const [list] = await prisma.$transaction([
      prisma.list.update({
        where: { id },
        data: { position },
        select: { id: true, position: true },
      }),
      prisma.activityLog.create({
        data: {
          workspaceId: data.board.workspaceId,
          boardId: data.board.id,
          userId: request.userId,
          action: 'list.moved',
          metadata: { newPosition: position },
        },
      }),
    ]);

    listEvents.moved(data.board.id, { listId: id, position }, request.userId);

    return reply.send({ list });
  });

  // ── DELETE /api/lists/:id ───────────────────────────────────────────────────
  app.delete('/lists/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await getListWithWorkspace(id);
    await requireWorkspaceMember(request, data.board.workspaceId, 'ADMIN');

    // Archive the list and all its cards in a single transaction
    await prisma.$transaction([
      prisma.card.updateMany({
        where: { listId: id },
        data: { isArchived: true },
      }),
      prisma.list.update({
        where: { id },
        data: { isArchived: true },
      }),
      prisma.activityLog.create({
        data: {
          workspaceId: data.board.workspaceId,
          boardId: data.board.id,
          userId: request.userId,
          action: 'list.archived',
          metadata: { listName: data.name },
        },
      }),
    ]);

    listEvents.archived(data.board.id, { listId: id }, request.userId);

    return reply.status(204).send();
  });

  // ── POST /api/lists/:id/rebalance ───────────────────────────────────────────
  app.post('/lists/:id/rebalance', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const data = await getListWithWorkspace(id);
    await requireWorkspaceMember(request, data.board.workspaceId, 'ADMIN');

    const allLists = await prisma.list.findMany({
      where: { boardId: data.board.id, isArchived: false },
      orderBy: { position: 'asc' },
      select: { id: true },
    });

    // Re-number cleanly: 1.0, 2.0, 3.0 ...
    const updates = allLists.map((list: any, index: any) =>
      prisma.list.update({
        where: { id: list.id },
        data: { position: index + 1.0 },
        select: { id: true, position: true },
      })
    );

    const lists = await prisma.$transaction(updates);

    return reply.send({ lists });
  });
}
