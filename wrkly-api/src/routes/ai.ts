import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import { NotFoundError, AppError } from '../lib/errors';
import prisma from '../lib/prisma';
import { aiService } from '../services/ai';
import type { ParsedAction, BoardContext } from '../services/ai';
import { cardEvents, listEvents } from '../lib/realtime';
import { createRateLimit } from '../middleware/rate-limit';
import { isFeatureEnabled } from '../lib/feature-flags';

// ── Zod Schemas ───────────────────────────────────────────────────────────────

const commandSchema = z.object({
  boardId: z.string(),
  command: z.string().min(1).max(500),
});

const executeSchema = z.object({
  boardId: z.string(),
  actions: z.array(
    z.object({
      type: z.enum([
        'create_list',
        'create_card',
        'move_card',
        'add_label',
        'set_due_date',
        'archive_card',
      ]),
      params: z.record(z.string(), z.any()),
    })
  ),
});

const summarizeSchema = z.object({
  boardId: z.string(),
});

const generateTasksSchema = z.object({
  boardId:     z.string(),
  description: z.string().min(1).max(2000),
});

const generateTasksExecuteSchema = z.object({
  boardId: z.string(),
  lists: z.array(
    z.object({
      name:  z.string().min(1).max(100),
      cards: z.array(
        z.object({
          title:       z.string().min(1).max(500),
          description: z.string().optional(),
        })
      ),
    })
  ),
});

// ── AI Rate Limiters (Redis-backed) ───────────────────────────────────────────

const commandLimiter = createRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 20, keyPrefix: 'ai-cmd' });
const summarizeLimiter = createRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 10, keyPrefix: 'ai-sum' });
const generateTasksLimiter = createRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 10, keyPrefix: 'ai-gen' });
const assistContentLimiter = createRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 30, keyPrefix: 'ai-ast' });
// ── Helpers ───────────────────────────────────────────────────────────────────

/** Fetch a full board with lists + cards for AI context. */
async function fetchBoardContext(boardId: string): Promise<BoardContext> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: {
      id:   true,
      name: true,
      lists: {
        where: { isArchived: false },
        orderBy: { position: 'asc' },
        select: {
          id:   true,
          name: true,
          cards: {
            where: { isArchived: false },
            orderBy: { position: 'asc' },
            select: {
              id:    true,
              title: true,
              labels: { select: { label: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });

  if (!board) throw new NotFoundError('Board');

  return {
    boardId:   board.id,
    boardName: board.name,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lists: (board.lists as any[]).map((l) => ({
      id:        l.id as string,
      name:      l.name as string,
      cardCount: (l.cards as unknown[]).length,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cards: (board.lists as any[]).flatMap((l) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (l.cards as any[]).map((c) => ({
        id:     c.id as string,
        title:  c.title as string,
        listId: l.id as string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        labels: (c.labels as any[]).map((cl) => cl.label?.name as string | null).filter((n): n is string => n !== null),
      }))
    ),
  };
}

/** Get workspaceId for a board (throws if not found). */
async function getBoardWorkspaceId(boardId: string): Promise<string> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { workspaceId: true },
  });
  if (!board) throw new NotFoundError('Board');
  return board.workspaceId;
}

type JsonMeta = { [key: string]: string | number | boolean | null | JsonMeta | JsonMeta[] };

async function logAiActivity(
  workspaceId: string,
  boardId:     string,
  userId:      string,
  action:      string,
  metadata?:   JsonMeta
) {
  await prisma.activityLog.create({
    data: { workspaceId, boardId, userId, action, metadata },
  });
}

// ── Route executor helpers ────────────────────────────────────────────────────

/** Execute a single ParsedAction against the database. */
async function executeAction(
  action: ParsedAction,
  boardId: string,
  workspaceId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (action.type) {
      case 'create_list': {
        const name = String(action.params.name ?? '').trim();
        if (!name) return { success: false, error: 'create_list: name is required' };

        const last = await prisma.list.findFirst({
          where: { boardId, isArchived: false },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        const position = last ? last.position + 1.0 : 1.0;

        const list = await prisma.list.create({
          data: { boardId, name, position },
          select: { id: true, name: true, position: true },
        });

        listEvents.created(boardId, { list }, userId);
        await logAiActivity(workspaceId, boardId, userId, 'ai:created_list', { listName: name });
        return { success: true };
      }

      case 'create_card': {
        const listId = String(action.params.listId ?? '').trim();
        const title  = String(action.params.title  ?? '').trim();
        if (!listId || !title) return { success: false, error: 'create_card: listId and title required' };

        // Verify list exists in this board
        const list = await prisma.list.findFirst({
          where: { id: listId, boardId, isArchived: false },
          select: { id: true },
        });
        if (!list) return { success: false, error: `create_card: list ${listId} not found in board` };

        const last = await prisma.card.findFirst({
          where: { listId, isArchived: false },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        const position = last ? last.position + 1.0 : 1.0;

        const card = await prisma.card.create({
          data: {
            listId,
            title,
            description: action.params.description ? String(action.params.description) : undefined,
            position,
            createdById: userId,
          },
          select: { id: true, title: true, position: true, listId: true },
        });

        cardEvents.created(boardId, { card, listId }, userId);
        await logAiActivity(workspaceId, boardId, userId, 'ai:created_card', { cardTitle: title, listId });
        return { success: true };
      }

      case 'move_card': {
        const cardId       = String(action.params.cardId       ?? '').trim();
        const targetListId = String(action.params.targetListId ?? '').trim();
        if (!cardId || !targetListId) return { success: false, error: 'move_card: cardId and targetListId required' };

        const card = await prisma.card.findFirst({
          where: { id: cardId, list: { boardId } },
          select: { id: true, listId: true, position: true },
        });
        if (!card) return { success: false, error: `move_card: card ${cardId} not found` };

        const last = await prisma.card.findFirst({
          where: { listId: targetListId, isArchived: false },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        const newPosition = last ? last.position + 1.0 : 1.0;

        await prisma.card.update({
          where: { id: cardId },
          data:  { listId: targetListId, position: newPosition },
        });

        cardEvents.moved(boardId, {
          cardId,
          fromListId: card.listId,
          toListId:   targetListId,
          position:   newPosition,
        }, userId);
        await logAiActivity(workspaceId, boardId, userId, 'ai:moved_card', { cardId, targetListId });
        return { success: true };
      }

      case 'add_label': {
        const cardId    = String(action.params.cardId ?? '').trim();
        const labelName = String(action.params.label  ?? '').trim();
        if (!cardId || !labelName) return { success: false, error: 'add_label: cardId and label required' };

        // Find label in the board's workspace
        const label = await prisma.label.findFirst({
          where: { name: { equals: labelName, mode: 'insensitive' }, board: { id: boardId } },
          select: { id: true },
        });
        if (!label) return { success: false, error: `add_label: label "${labelName}" not found` };

        // Upsert to avoid duplicates
        await prisma.cardLabel.upsert({
          where:  { cardId_labelId: { cardId, labelId: label.id } },
          update: {},
          create: { cardId, labelId: label.id },
        });

        const labels = await prisma.cardLabel.findMany({
          where:  { cardId },
          select: { label: { select: { id: true, name: true, color: true } } },
        });
        cardEvents.labelsChanged(boardId, { cardId, labels: labels.map((cl: { label: { id: string; name: string | null; color: string } }) => cl.label) }, userId);
        return { success: true };
      }

      case 'set_due_date': {
        const cardId  = String(action.params.cardId  ?? '').trim();
        const dueDate = String(action.params.dueDate ?? '').trim();
        if (!cardId) return { success: false, error: 'set_due_date: cardId required' };

        const date = dueDate ? new Date(dueDate) : null;
        if (date && isNaN(date.getTime())) return { success: false, error: 'set_due_date: invalid date' };

        await prisma.card.update({
          where: { id: cardId },
          data:  { dueDate: date },
        });

        cardEvents.updated(boardId, { cardId, changes: { dueDate: date?.toISOString() ?? null } }, userId);
        return { success: true };
      }

      case 'archive_card': {
        const cardId = String(action.params.cardId ?? '').trim();
        if (!cardId) return { success: false, error: 'archive_card: cardId required' };

        const card = await prisma.card.findFirst({
          where: { id: cardId, list: { boardId } },
          select: { id: true, listId: true },
        });
        if (!card) return { success: false, error: `archive_card: card ${cardId} not found` };

        await prisma.card.update({
          where: { id: cardId },
          data:  { isArchived: true },
        });

        cardEvents.archived(boardId, { cardId, listId: card.listId }, userId);
        await logAiActivity(workspaceId, boardId, userId, 'ai:archived_card', { cardId });
        return { success: true };
      }

      default:
        return { success: false, error: `Unknown action type` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' };
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function aiRoutes(app: FastifyInstance) {
  // ── POST /api/ai/command ────────────────────────────────────────────────────
  app.post('/command', { preHandler: [authenticate, commandLimiter] }, async (request, reply) => {
    if (!isFeatureEnabled('AI_COMMANDS')) {
      return reply.status(503).send({ error: 'AI features are currently disabled', feature: 'AI_COMMANDS' });
    }
    const parsed = commandSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { boardId, command } = parsed.data;
    const workspaceId = await getBoardWorkspaceId(boardId);
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');

    const context = await fetchBoardContext(boardId);
    const result  = await aiService.parseCommand(command, context);

    return reply.send({
      interpretation: result.interpretation,
      actions:        result.actions,
      confidence:     result.confidence,
    });
  });

  // ── POST /api/ai/command/execute ────────────────────────────────────────────
  app.post('/command/execute', { preHandler: [authenticate, commandLimiter] }, async (request, reply) => {
    if (!isFeatureEnabled('AI_COMMANDS')) {
      return reply.status(503).send({ error: 'AI features are currently disabled', feature: 'AI_COMMANDS' });
    }
    const parsed = executeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { boardId, actions } = parsed.data;
    const workspaceId = await getBoardWorkspaceId(boardId);
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');

    const results: Array<{ action: string; success: boolean; error?: string }> = [];
    let executed = 0;

    for (const action of actions) {
      const result = await executeAction(
        action as ParsedAction,
        boardId,
        workspaceId,
        request.userId
      );
      results.push({ action: action.type, ...result });
      if (result.success) executed++;
    }

    return reply.send({ executed, results });
  });

  // ── POST /api/ai/summarize ──────────────────────────────────────────────────
  app.post('/summarize', { preHandler: [authenticate, summarizeLimiter] }, async (request, reply) => {
    if (!isFeatureEnabled('AI_SUMMARIZE')) {
      return reply.status(503).send({ error: 'AI features are currently disabled', feature: 'AI_SUMMARIZE' });
    }
    const parsed = summarizeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { boardId } = parsed.data;
    const workspaceId = await getBoardWorkspaceId(boardId);
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');

    const context = await fetchBoardContext(boardId);
    const summary = await aiService.summarizeBoard(context);

    return reply.send({ summary });
  });

  // ── POST /api/ai/generate-tasks ─────────────────────────────────────────────
  app.post('/generate-tasks', { preHandler: [authenticate, generateTasksLimiter] }, async (request, reply) => {
    if (!isFeatureEnabled('AI_GENERATE')) {
      return reply.status(503).send({ error: 'AI features are currently disabled', feature: 'AI_GENERATE' });
    }
    const parsed = generateTasksSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { boardId, description } = parsed.data;
    const workspaceId = await getBoardWorkspaceId(boardId);
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');

    const generated = await aiService.generateTasks(description);

    // Return with confirm flag so frontend shows preview before executing
    return reply.send({ lists: generated.lists, confirm: true });
  });

  // ── POST /api/ai/generate-tasks/execute ────────────────────────────────────
  app.post('/generate-tasks/execute', { preHandler: [authenticate, generateTasksLimiter] }, async (request, reply) => {
    if (!isFeatureEnabled('AI_GENERATE')) {
      return reply.status(503).send({ error: 'AI features are currently disabled', feature: 'AI_GENERATE' });
    }
    const parsed = generateTasksExecuteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { boardId, lists } = parsed.data;
    const workspaceId = await getBoardWorkspaceId(boardId);
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');

    const createdLists: Array<{
      id:    string;
      name:  string;
      cards: Array<{ id: string; title: string }>;
    }> = [];

    // Get current max list position in this board
    const lastList = await prisma.list.findFirst({
      where:   { boardId, isArchived: false },
      orderBy: { position: 'desc' },
      select:  { position: true },
    });
    let listPosition = lastList ? lastList.position + 1.0 : 1.0;

    for (const listInput of lists) {
      // Create list
      const list = await prisma.list.create({
        data:   { boardId, name: listInput.name, position: listPosition },
        select: { id: true, name: true, position: true },
      });
      listPosition += 1.0;

      listEvents.created(boardId, { list }, request.userId);

      // Create cards inside each list sequentially
      const createdCards: Array<{ id: string; title: string }> = [];
      let cardPosition = 1.0;

      for (const cardInput of listInput.cards) {
        const card = await prisma.card.create({
          data: {
            listId:      list.id,
            title:       cardInput.title,
            description: cardInput.description,
            position:    cardPosition,
            createdById: request.userId,
          },
          select: { id: true, title: true, position: true, listId: true },
        });
        cardPosition += 1.0;

        cardEvents.created(boardId, { card, listId: list.id }, request.userId);
        createdCards.push({ id: card.id, title: card.title });
      }

      createdLists.push({ id: list.id, name: list.name, cards: createdCards });
    }

    await logAiActivity(workspaceId, boardId, request.userId, 'ai:generated_tasks', {
      listsCreated: createdLists.length,
      cardsCreated: createdLists.reduce((sum, l) => sum + l.cards.length, 0),
    } as JsonMeta);

    return reply.status(201).send({ lists: createdLists });
  });

  // ── POST /api/ai/assist-content ─────────────────────────────────────────────
  
  const assistContentSchema = z.object({
    currentContent: z.string(),
    action: z.string(),
    customPrompt: z.string().optional(),
  });

  app.post('/assist-content', { preHandler: [authenticate, assistContentLimiter] }, async (request, reply) => {
    if (!isFeatureEnabled('AI_ASSIST')) {
      return reply.status(503).send({ error: 'AI features are currently disabled', feature: 'AI_ASSIST' });
    }
    const parsed = assistContentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { currentContent, action, customPrompt } = parsed.data;

    const result = await aiService.assistCardContent(currentContent, action, customPrompt);

    return reply.send({ result });
  });
}
