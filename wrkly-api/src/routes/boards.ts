import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import prisma from '../lib/prisma';

const createBoardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  background: z.string().max(50).optional(),
});

const updateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  background: z.string().max(50).optional(),
});

async function getBoardWorkspaceId(boardId: string): Promise<string> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { workspaceId: true },
  });
  if (!board) throw new NotFoundError('Board');
  return board.workspaceId;
}

export async function boardRoutes(app: FastifyInstance) {
  // ── GET /api/workspaces/:workspaceId/boards ─────────────────────────────
  app.get('/workspaces/:workspaceId/boards', { preHandler: authenticate }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    await requireWorkspaceMember(request, workspaceId);

    const boards = await prisma.board.findMany({
      where: { workspaceId, isArchived: false },
      select: {
        id: true,
        name: true,
        background: true,
        description: true,
        createdAt: true,
        _count: {
          select: {
            lists: { where: { isArchived: false } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Get card counts per board in one query
    const boardIds = boards.map((b: any) => b.id);
    const cardCounts = await prisma.card.groupBy({
      by: ['listId'],
      where: {
        list: { boardId: { in: boardIds }, isArchived: false },
        isArchived: false,
      },
      _count: { id: true },
    });

    // Group card counts by list→board
    const listToBoard = await prisma.list.findMany({
      where: { boardId: { in: boardIds }, isArchived: false },
      select: { id: true, boardId: true },
    });
    const listBoardMap = new Map(listToBoard.map((l: any) => [l.id, l.boardId]));
    const cardCountByBoard = new Map<string, number>();
    for (const cc of cardCounts) {
      const boardId = listBoardMap.get(cc.listId);
      if (boardId) {
        cardCountByBoard.set(boardId as string, (cardCountByBoard.get(boardId as string) ?? 0) + cc._count.id);
      }
    }

    const result = boards.map((b: any) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      background: b.background,
      createdAt: b.createdAt,
      listCount: b._count.lists,
      cardCount: cardCountByBoard.get(b.id) ?? 0,
    }));

    return reply.send({ boards: result });
  });

  // ── POST /api/workspaces/:workspaceId/boards ────────────────────────────
  app.post('/workspaces/:workspaceId/boards', { preHandler: authenticate }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string };
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');

    const parsed = createBoardSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { name, description, background } = parsed.data;

    const board = await prisma.board.create({
      data: {
        name,
        description,
        background,
        workspaceId,
        createdById: request.userId,
        lists: {
          create: { name: 'To Do', position: 1.0 },
        },
      },
    });

    return reply.status(201).send({ board });
  });

  // ── GET /api/boards/:id — Full board with lists + cards ─────────────────
  app.get('/boards/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const workspaceId = await getBoardWorkspaceId(id);
    await requireWorkspaceMember(request, workspaceId);

    const board = await prisma.board.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        background: true,
        workspaceId: true,
        workspace: { select: { slug: true } },
        createdAt: true,
        updatedAt: true,
        lists: {
          where: { isArchived: false },
          orderBy: { position: 'asc' },
          select: {
            id: true,
            name: true,
            position: true,
            cards: {
              where: { isArchived: false },
              orderBy: { position: 'asc' },
              select: {
                id: true,
                title: true,
                position: true,
                dueDate: true,
                coverImage: true,
                _count: {
                  select: { blocks: true, comments: true },
                },
                labels: {
                  select: {
                    label: { select: { id: true, name: true, color: true } },
                  },
                },
                assignees: {
                  select: {
                    user: { select: { id: true, name: true, avatarUrl: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!board) throw new NotFoundError('Board');

    // Flatten join table shapes for cleaner API response
    const shaped = {
      ...board,
      workspaceSlug: board.workspace.slug,
      lists: board.lists.map((list: any) => ({
        ...list,
        cards: list.cards.map((card: any) => ({
          id: card.id,
          title: card.title,
          position: card.position,
          dueDate: card.dueDate,
          coverImage: card.coverImage,
          blockCount: card._count.blocks,
          commentCount: card._count.comments,
          labels: card.labels.map((cl: any) => cl.label),
          assignees: card.assignees.map((ca: any) => ca.user),
        })),
      })),
    };

    return reply.send({ board: shaped });
  });


  // ── PATCH /api/boards/:id ───────────────────────────────────────────────
  app.patch('/boards/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const workspaceId = await getBoardWorkspaceId(id);
    await requireWorkspaceMember(request, workspaceId, 'ADMIN');

    const parsed = updateBoardSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const board = await prisma.board.update({
      where: { id },
      data: parsed.data,
    });

    return reply.send({ board });
  });

  // ── DELETE /api/boards/:id (soft delete) ────────────────────────────────
  app.delete('/boards/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const workspaceId = await getBoardWorkspaceId(id);
    await requireWorkspaceMember(request, workspaceId, 'ADMIN');

    await prisma.board.update({
      where: { id },
      data: { isArchived: true },
    });

    return reply.status(204).send();
  });
}
