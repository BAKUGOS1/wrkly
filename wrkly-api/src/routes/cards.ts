import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import { NotFoundError, AppError } from '../lib/errors';
import prisma from '../lib/prisma';
import { cardEvents } from '../lib/realtime';
import { triggerAutomation } from '../lib/automation-events';

// ── Zod Schemas ───────────────────────────────────────────────────────────────

const createCardSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().optional(),
});

const updateCardSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  reminderAt: z.string().datetime().nullable().optional(),
});

const moveCardSchema = z.object({
  listId: z.string(),
  position: z.number(),
});

const labelActionSchema = z.object({
  labelId: z.string(),
});

const assigneeActionSchema = z.object({
  userId: z.string(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Fetch a card and resolve the full list → board → workspace chain.
 * Throws NotFoundError if the card doesn't exist.
 */
async function getCardContext(cardId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: {
      list: {
        select: {
          id: true,
          name: true,
          boardId: true,
          board: { select: { id: true, name: true, workspaceId: true } },
        },
      },
    },
  });
  if (!card) throw new NotFoundError('Card');
  return card;
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function cardRoutes(app: FastifyInstance) {
  // ── 1. POST /api/lists/:listId/cards ──────────────────────────────────────
  app.post('/lists/:listId/cards', { preHandler: authenticate }, async (request, reply) => {
    const { listId } = request.params as { listId: string };

    const list = await prisma.list.findUnique({
      where: { id: listId },
      select: { id: true, isArchived: true, boardId: true, board: { select: { workspaceId: true } } },
    });
    if (!list || list.isArchived) throw new NotFoundError('List');

    await requireWorkspaceMember(request, list.board.workspaceId, 'MEMBER');

    const parsed = createCardSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { title, description } = parsed.data;

    // Highest existing position in the list + 1.0
    const last = await prisma.card.findFirst({
      where: { listId, isArchived: false },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = last ? last.position + 1.0 : 1.0;

    const card = await prisma.card.create({
      data: { listId, title, description, position, createdById: request.userId },
      select: {
        id: true,
        title: true,
        position: true,
        listId: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Broadcast to board room — reuse boardId from initial query (no extra DB hit)
    cardEvents.created(list.boardId, { card, listId }, request.userId);

    // Queue automation evaluation — fire-and-forget
    triggerAutomation({
      type: 'card.created',
      boardId: list.boardId,
      cardId: card.id,
      userId: request.userId,
      data: { listId, title },
    });

    return reply.status(201).send({ card });
  });

  // ── 2. GET /api/cards/:id ──────────────────────────────────────────────────
  app.get('/cards/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const ctx = await getCardContext(id);
    await requireWorkspaceMember(request, ctx.list.board.workspaceId);

    const card = await prisma.card.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        reminderAt: true,
        coverImage: true,
        isArchived: true,
        position: true,
        createdAt: true,
        updatedAt: true,
        blocks: {
          orderBy: { position: 'asc' },
          select: { id: true, type: true, content: true, position: true },
        },
        labels: {
          select: {
            label: { select: { id: true, name: true, color: true } },
          },
        },
        assignees: {
          select: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            user: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
        list: { select: { id: true, name: true } },
      },
    });

    if (!card) throw new NotFoundError('Card');

    // Flatten join-table shapes for cleaner response
    const shaped = {
      ...card,
      labels: card.labels.map((cl: { label: { id: string; name: string | null; color: string } }) => cl.label),
      assignees: card.assignees.map((ca: { user: { id: string; name: string; email: string; avatarUrl: string | null } }) => ca.user),
      board: { id: ctx.list.board.id, name: ctx.list.board.name },
    };

    return reply.send({ card: shaped });
  });

  // ── 3. PATCH /api/cards/:id ────────────────────────────────────────────────
  app.patch('/cards/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const ctx = await getCardContext(id);
    await requireWorkspaceMember(request, ctx.list.board.workspaceId, 'MEMBER');

    const parsed = updateCardSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    // Build update data — only include defined fields
    const { title, description, dueDate, coverImage, reminderAt } = parsed.data;
    const updateData: {
      title?: string;
      description?: string;
      dueDate?: Date | null;
      coverImage?: string | null;
      reminderAt?: Date | null;
    } = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
    if (coverImage !== undefined) updateData.coverImage = coverImage;
    if (reminderAt !== undefined) updateData.reminderAt = reminderAt ? new Date(reminderAt) : null;

    // Build a string-safe snapshot for the activity log (no Date objects)
    const logMeta: Record<string, string | null | undefined> = {};
    if (title !== undefined) logMeta.title = title;
    if (description !== undefined) logMeta.description = description;
    if (dueDate !== undefined) logMeta.dueDate = dueDate ?? null;
    if (coverImage !== undefined) logMeta.coverImage = coverImage ?? null;
    if (reminderAt !== undefined) logMeta.reminderAt = reminderAt ?? null;

    const [card] = await prisma.$transaction([
      prisma.card.update({ where: { id }, data: updateData }),
      prisma.activityLog.create({
        data: {
          workspaceId: ctx.list.board.workspaceId,
          boardId: ctx.list.board.id,
          cardId: id,
          userId: request.userId,
          action: 'card.updated',
          metadata: logMeta,
        },
      }),
    ]);

    cardEvents.updated(ctx.list.board.id, { cardId: id, changes: updateData as object }, request.userId);

    // Queue automation evaluation
    triggerAutomation({
      type: 'card.updated',
      boardId: ctx.list.board.id,
      cardId: id,
      userId: request.userId,
      data: { changedFields: Object.keys(logMeta) },
    });

    return reply.send({ card });
  });

  // ── 4. PATCH /api/cards/:id/move ──────────────────────────────────────────
  app.patch('/cards/:id/move', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const ctx = await getCardContext(id);
    await requireWorkspaceMember(request, ctx.list.board.workspaceId, 'MEMBER');

    const parsed = moveCardSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { listId: toListId, position } = parsed.data;
    const fromListId = ctx.listId;

    // Determine activity type + metadata
    let action: string;
    let metadata: Record<string, string | number>;

    if (toListId !== fromListId) {
      // Moving to a different list — fetch destination list name for metadata
      const toList = await prisma.list.findUnique({
        where: { id: toListId },
        select: { id: true, name: true, board: { select: { workspaceId: true } } },
      });
      if (!toList) throw new NotFoundError('Destination list');
      // Ensure destination list belongs to the same workspace
      if (toList.board.workspaceId !== ctx.list.board.workspaceId) {
        throw new AppError('Cannot move card to a different workspace', 403);
      }

      action = 'card.moved';
      metadata = {
        fromListId,
        fromListName: ctx.list.name,
        toListId,
        toListName: toList.name,
      };
    } else {
      action = 'card.reordered';
      metadata = { listId: toListId, newPosition: position };
    }

    // Single Prisma update — fast for DnD
    const card = await prisma.card.update({
      where: { id },
      data: { listId: toListId, position },
      select: { id: true, listId: true, position: true },
    });

    // Fire-and-forget activity log (don't block response)
    prisma.activityLog
      .create({
        data: {
          workspaceId: ctx.list.board.workspaceId,
          boardId: ctx.list.board.id,
          cardId: id,
          userId: request.userId,
          action,
          metadata,
        },
      })
      .catch(() => {/* non-critical */});

    cardEvents.moved(ctx.list.board.id, {
      cardId: id,
      fromListId,
      toListId,
      position,
    }, request.userId);

    // Queue automation evaluation — only for cross-list moves
    if (toListId !== fromListId) {
      const toListName = (metadata as Record<string, string>).toListName ?? '';
      triggerAutomation({
        type: 'card.moved',
        boardId: ctx.list.board.id,
        cardId: id,
        userId: request.userId,
        data: {
          fromListId,
          fromListName: ctx.list.name,
          toListId,
          toListName,
        },
      });
    }

    return reply.send({ card });
  });

  // ── 5. DELETE /api/cards/:id ───────────────────────────────────────────────
  app.delete('/cards/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const ctx = await getCardContext(id);
    await requireWorkspaceMember(request, ctx.list.board.workspaceId, 'MEMBER');

    await prisma.$transaction([
      prisma.card.update({ where: { id }, data: { isArchived: true } }),
      prisma.activityLog.create({
        data: {
          workspaceId: ctx.list.board.workspaceId,
          boardId: ctx.list.board.id,
          cardId: id,
          userId: request.userId,
          action: 'card.archived',
          metadata: { title: ctx.title },
        },
      }),
    ]);

    cardEvents.archived(ctx.list.board.id, { cardId: id, listId: ctx.listId }, request.userId);

    return reply.status(204).send();
  });

  // ── 6. POST /api/cards/:id/labels ─────────────────────────────────────────
  app.post('/cards/:id/labels', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const ctx = await getCardContext(id);
    await requireWorkspaceMember(request, ctx.list.board.workspaceId, 'MEMBER');

    const parsed = labelActionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { labelId } = parsed.data;

    // Verify label belongs to the same board
    const label = await prisma.label.findFirst({
      where: { id: labelId, boardId: ctx.list.board.id },
    });
    if (!label) throw new NotFoundError('Label');

    // Upsert — silently ignore if already linked
    await prisma.cardLabel.upsert({
      where: { cardId_labelId: { cardId: id, labelId } },
      create: { cardId: id, labelId },
      update: {},
    });

    // Fetch updated label list for broadcast
    const updatedLabels = await prisma.cardLabel.findMany({
      where: { cardId: id },
      select: { label: { select: { id: true, name: true, color: true } } },
    });
    cardEvents.labelsChanged(ctx.list.board.id, { cardId: id, labels: updatedLabels.map((l: { label: { id: string; name: string | null; color: string } }) => l.label) }, request.userId);

    // Queue automation evaluation
    triggerAutomation({
      type: 'label.added',
      boardId: ctx.list.board.id,
      cardId: id,
      userId: request.userId,
      data: { labelId, labelName: label.name ?? '' },
    });

    return reply.status(201).send({
      label: { id: label.id, name: label.name, color: label.color },
    });
  });

  // ── 7. DELETE /api/cards/:id/labels/:labelId ──────────────────────────────
  app.delete('/cards/:id/labels/:labelId', { preHandler: authenticate }, async (request, reply) => {
    const { id, labelId } = request.params as { id: string; labelId: string };

    const ctx = await getCardContext(id);
    await requireWorkspaceMember(request, ctx.list.board.workspaceId, 'MEMBER');

    await prisma.cardLabel
      .delete({ where: { cardId_labelId: { cardId: id, labelId } } })
      .catch(() => {/* Already removed — treat as success */});

    const remainingLabels = await prisma.cardLabel.findMany({
      where: { cardId: id },
      select: { label: { select: { id: true, name: true, color: true } } },
    });
    cardEvents.labelsChanged(ctx.list.board.id, { cardId: id, labels: remainingLabels.map((l: { label: { id: string; name: string | null; color: string } }) => l.label) }, request.userId);

    return reply.status(204).send();
  });

  // ── 8. POST /api/cards/:id/assignees ──────────────────────────────────────
  app.post('/cards/:id/assignees', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const ctx = await getCardContext(id);
    await requireWorkspaceMember(request, ctx.list.board.workspaceId, 'MEMBER');

    const parsed = assigneeActionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { userId } = parsed.data;

    // Verify the target user is a workspace member
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: ctx.list.board.workspaceId, userId },
      },
    });
    if (!membership) throw new AppError('User is not a member of this workspace', 400);

    // Create assignee record (skip if already assigned)
    await prisma.cardAssignee
      .create({ data: { cardId: id, userId } })
      .catch(() => {/* Already assigned — skip */});

    // Notify the assigned user (only if it's not the assigner themselves)
    if (userId !== request.userId) {
      await prisma.notification
        .create({
          data: {
            userId,
            type: 'card.assigned',
            title: 'You were assigned to a card',
            body: `You were assigned to "${ctx.title}"`,
            link: `/cards/${id}`,
          },
        })
        .catch(() => {/* Non-critical */});
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, avatarUrl: true },
    });
    if (!user) throw new NotFoundError('User');

    const currentAssignees = await prisma.cardAssignee.findMany({
      where: { cardId: id },
      select: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    cardEvents.assigneesChanged(ctx.list.board.id, { cardId: id, assignees: currentAssignees.map((a: { user: { id: string; name: string; avatarUrl: string | null } }) => a.user) }, request.userId);

    // Queue automation evaluation
    triggerAutomation({
      type: 'assignee.added',
      boardId: ctx.list.board.id,
      cardId: id,
      userId: request.userId,
      data: { assigneeId: userId },
    });

    return reply.status(201).send({ assignee: user });
  });

  // ── 9. DELETE /api/cards/:id/assignees/:userId ────────────────────────────
  app.delete('/cards/:id/assignees/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };

    const ctx = await getCardContext(id);
    await requireWorkspaceMember(request, ctx.list.board.workspaceId, 'MEMBER');

    await prisma.cardAssignee
      .delete({ where: { cardId_userId: { cardId: id, userId } } })
      .catch(() => {/* Already removed */});

    const remainingAssignees = await prisma.cardAssignee.findMany({
      where: { cardId: id },
      select: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    cardEvents.assigneesChanged(ctx.list.board.id, { cardId: id, assignees: remainingAssignees.map((a: { user: { id: string; name: string; avatarUrl: string | null } }) => a.user) }, request.userId);

    return reply.status(204).send();
  });
}
