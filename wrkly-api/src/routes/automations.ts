import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import { NotFoundError } from '../lib/errors';
import prisma from '../lib/prisma';

// ── Schemas ───────────────────────────────────────────────────────────────────

const triggerSchema = z.object({
  event: z.enum([
    'card.created',
    'card.moved',
    'card.updated',
    'label.added',
    'assignee.added',
    'card.due_date_approaching',
    'card.overdue',
    'checklist.completed',
  ]),
  // Optional qualifiers: from_list_name, to_list_name, label_name, etc.
  conditions: z.record(z.string(), z.any()).optional(),

  // Allow pass-through for trigger-level qualifiers like from_list_name, to_list_name
  from_list_name: z.string().optional(),
  to_list_name:   z.string().optional(),
  label_name:     z.string().optional(),
});

const actionSchema = z.object({
  type: z.enum([
    'add_label',
    'remove_label',
    'move_card',
    'assign_user',
    'set_due_date',
    'send_notification',
    'add_comment',
    'archive_card',
    'webhook',
  ]),
  params: z.record(z.string(), z.any()),
});

const createAutomationSchema = z.object({
  name:    z.string().min(1).max(100),
  trigger: triggerSchema,
  actions: z.array(actionSchema).min(1).max(10),
});

const updateAutomationSchema = z.object({
  name:     z.string().min(1).max(100).optional(),
  trigger:  triggerSchema.optional(),
  actions:  z.array(actionSchema).min(1).max(10).optional(),
  isActive: z.boolean().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getBoardContext(boardId: string) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { workspaceId: true, isArchived: true },
  });
  if (!board || board.isArchived) throw new NotFoundError('Board');
  return board;
}

async function getAutomationWithBoard(id: string) {
  const rule = await prisma.automationRule.findUnique({
    where: { id },
    select: {
      id:         true,
      boardId:    true,
      name:       true,
      isActive:   true,
      trigger:    true,
      conditions: true,
      actions:    true,
      runCount:   true,
      lastRunAt:  true,
      createdById: true,
      board: { select: { workspaceId: true } },
    },
  });
  if (!rule) throw new NotFoundError('AutomationRule');
  return rule;
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function automationRoutes(app: FastifyInstance) {

  // ── 1. GET /api/boards/:boardId/automations ────────────────────────────────
  app.get('/boards/:boardId/automations', { preHandler: authenticate }, async (request, reply) => {
    const { boardId } = request.params as { boardId: string };

    const board = await getBoardContext(boardId);
    await requireWorkspaceMember(request, board.workspaceId, 'MEMBER');

    const automations = await prisma.automationRule.findMany({
      where:   { boardId },
      orderBy: { createdAt: 'asc' },
      select: {
        id:         true,
        name:       true,
        isActive:   true,
        trigger:    true,
        conditions: true,
        actions:    true,
        runCount:   true,
        lastRunAt:  true,
        createdAt:  true,
        createdBy: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    return reply.send({ automations });
  });

  // ── 2. POST /api/boards/:boardId/automations ──────────────────────────────
  app.post('/boards/:boardId/automations', { preHandler: authenticate }, async (request, reply) => {
    const { boardId } = request.params as { boardId: string };

    const board = await getBoardContext(boardId);
    await requireWorkspaceMember(request, board.workspaceId, 'ADMIN');

    const parsed = createAutomationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { name, trigger, actions } = parsed.data;

    // Validate that referenced lists/labels exist on this board
    await validateRuleReferences(boardId, trigger, actions);

    const rule = await prisma.automationRule.create({
      data: {
        boardId,
        name,
        trigger,
        actions,
        createdById: request.userId,
      },
      select: {
        id:         true,
        name:       true,
        isActive:   true,
        trigger:    true,
        conditions: true,
        actions:    true,
        runCount:   true,
        lastRunAt:  true,
        createdAt:  true,
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return reply.status(201).send(rule);
  });

  // ── 3. PATCH /api/automations/:id ─────────────────────────────────────────
  app.patch('/automations/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await getAutomationWithBoard(id);
    await requireWorkspaceMember(request, existing.board.workspaceId, 'ADMIN');

    const parsed = updateAutomationSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { name, trigger, actions, isActive } = parsed.data;

    // Validate references only if trigger or actions are being updated
    if (trigger || actions) {
      await validateRuleReferences(
        existing.boardId,
        trigger ?? (existing.trigger as z.infer<typeof triggerSchema>),
        actions ?? (existing.actions as z.infer<typeof actionSchema>[])
      );
    }

    const updated = await prisma.automationRule.update({
      where: { id },
      data:  { name, trigger, actions, isActive },
      select: {
        id:         true,
        name:       true,
        isActive:   true,
        trigger:    true,
        conditions: true,
        actions:    true,
        runCount:   true,
        lastRunAt:  true,
        updatedAt:  true,
      },
    });

    return reply.send(updated);
  });

  // ── 4. DELETE /api/automations/:id ────────────────────────────────────────
  app.delete('/automations/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await getAutomationWithBoard(id);
    await requireWorkspaceMember(request, existing.board.workspaceId, 'ADMIN');

    await prisma.automationRule.delete({ where: { id } });

    return reply.status(204).send();
  });

  // ── 5. PATCH /api/automations/:id/toggle ──────────────────────────────────
  app.patch('/automations/:id/toggle', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await getAutomationWithBoard(id);
    await requireWorkspaceMember(request, existing.board.workspaceId, 'ADMIN');

    const updated = await prisma.automationRule.update({
      where: { id },
      data:  { isActive: !existing.isActive },
      select: { id: true, isActive: true },
    });

    return reply.send(updated);
  });

  // ── 6. POST /api/automations/:id/test ─────────────────────────────────────
  app.post('/automations/:id/test', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await getAutomationWithBoard(id);
    await requireWorkspaceMember(request, existing.board.workspaceId, 'ADMIN');

    const trigger  = existing.trigger as z.infer<typeof triggerSchema>;
    const actions  = (existing.actions as z.infer<typeof actionSchema>[]) ?? [];

    // Fetch all non-archived cards on this board for dry-run evaluation
    const lists = await prisma.list.findMany({
      where: { boardId: existing.boardId, isArchived: false },
      select: {
        id:   true,
        name: true,
        cards: {
          where: { isArchived: false },
          select: {
            id:    true,
            title: true,
            listId: true,
            list:  { select: { name: true } },
            labels: { select: { label: { select: { name: true } } } },
          },
        },
      },
    });

    const allCards = lists.flatMap((l: {
      id: string;
      name: string;
      cards: {
        id: string;
        title: string;
        listId: string;
        list: { name: string };
        labels: { label: { name: string | null } }[];
      }[];
    }) => l.cards);

    const matches: Array<{
      cardId:    string;
      cardTitle: string;
      listName:  string;
      actions:   Array<{ type: string; description: string }>;
    }> = [];

    for (const card of allCards) {
      // Build a synthetic event from the current card state and the trigger type
      const syntheticEvent = {
        type:    trigger.event,
        boardId: existing.boardId,
        cardId:  card.id,
        data: {
          toListName:   card.list?.name ?? '',
          fromListName: '',
          labelName:    card.labels[0]?.label?.name ?? '',
        },
      };

      // Simple trigger matching (mirrors the engine logic but standalone for dry-run)
      const triggerMatches = triggerMatchesDryRun(trigger, syntheticEvent);
      if (!triggerMatches) continue;

      matches.push({
        cardId:    card.id,
        cardTitle: card.title,
        listName:  card.list?.name ?? '',
        actions:   actions.map((a) => ({
          type:        a.type,
          description: describeAction(a),
        })),
      });
    }

    return reply.send({ matches, totalCards: allCards.length });
  });
}

// ── Reference validation helper ──────────────────────────────────────────────

async function validateRuleReferences(
  boardId: string,
  trigger: z.infer<typeof triggerSchema>,
  actions: z.infer<typeof actionSchema>[]
) {
  for (const action of actions) {
    // Validate list references in move_card actions
    if (action.type === 'move_card' && action.params.list_name) {
      const list = await prisma.list.findFirst({
        where: { boardId, name: { equals: String(action.params.list_name), mode: 'insensitive' }, isArchived: false },
        select: { id: true },
      });
      if (!list) throw new NotFoundError(`List "${action.params.list_name}" not found on this board`);
    }

    // Validate label references in add_label / remove_label actions
    if ((action.type === 'add_label' || action.type === 'remove_label') && action.params.label) {
      const label = await prisma.label.findFirst({
        where: { boardId, name: { equals: String(action.params.label), mode: 'insensitive' } },
        select: { id: true },
      });
      if (!label) throw new NotFoundError(`Label "${action.params.label}" not found on this board`);
    }

    // Validate user references in assign_user actions
    if (action.type === 'assign_user' && action.params.userId) {
      const boardRecord = await prisma.board.findUnique({
        where: { id: boardId },
        select: { workspaceId: true },
      });
      if (boardRecord) {
        const member = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: boardRecord.workspaceId,
              userId: String(action.params.userId),
            },
          },
          select: { userId: true },
        });
        if (!member) throw new NotFoundError(`User "${action.params.userId}" is not a member of this workspace`);
      }
    }
  }

  // Validate trigger list names
  if (trigger.to_list_name) {
    const list = await prisma.list.findFirst({
      where: { boardId, name: { equals: trigger.to_list_name, mode: 'insensitive' }, isArchived: false },
      select: { id: true },
    });
    if (!list) throw new NotFoundError(`Trigger list "${trigger.to_list_name}" not found on this board`);
  }
}

// ── Dry-run trigger matcher (no DB, for /test endpoint) ──────────────────────

function triggerMatchesDryRun(
  trigger: z.infer<typeof triggerSchema>,
  event: { type: string; data: Record<string, unknown> }
): boolean {
  if (trigger.event !== event.type) return false;
  if (trigger.to_list_name   && event.data.toListName   !== trigger.to_list_name)   return false;
  if (trigger.from_list_name && event.data.fromListName !== trigger.from_list_name) return false;
  if (trigger.label_name     && event.data.labelName    !== trigger.label_name)     return false;
  return true;
}

// ── Human-readable action descriptions for /test response ────────────────────

function describeAction(action: z.infer<typeof actionSchema>): string {
  switch (action.type) {
    case 'add_label':         return `Add label "${action.params.label ?? ''}"`;
    case 'remove_label':      return `Remove label "${action.params.label ?? ''}"`;
    case 'move_card':         return `Move card to list "${action.params.list_name ?? ''}"`;
    case 'assign_user':       return `Assign user "${action.params.userId ?? ''}"`;
    case 'set_due_date':      return action.params.offset_days !== undefined
      ? `Set due date in ${action.params.offset_days} days`
      : `Set due date to "${action.params.date ?? ''}"`;
    case 'send_notification': return `Send notification: "${action.params.title ?? ''}"`;
    case 'add_comment':       return `Add comment: "${String(action.params.content ?? '').slice(0, 50)}..."`;
    case 'archive_card':      return 'Archive the card';
    case 'webhook':           return `Call webhook: ${action.params.url ?? ''}`;
    default:                  return action.type;
  }
}
