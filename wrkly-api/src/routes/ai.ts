import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import { NotFoundError, AppError } from '../lib/errors';
import prisma from '../lib/prisma';
import { aiService } from '../services/ai';
import type { ParsedAction, BoardContext, BoardInsightsContext, ProjectPlan } from '../services/ai';
import { executeTool } from '../services/ai-tools';
import type { ToolCallResult } from '../services/ai-tools';
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
const insightsLimiter = createRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 5, keyPrefix: 'ai-ins' });
const suggestAssigneeLimiter = createRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 15, keyPrefix: 'ai-asg' });
const suggestRepliesLimiter = createRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 30, keyPrefix: 'ai-rep' });
const ultraplanLimiter = createRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 3, keyPrefix: 'ai-ulp' });
const agentLimiter = createRateLimit({ windowMs: 60 * 60 * 1000, maxRequests: 10, keyPrefix: 'ai-agt' });
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

  // ── POST /api/ai/insights ──────────────────────────────────────────────────

  const insightsSchema = z.object({ boardId: z.string() });

  app.post('/insights', { preHandler: [authenticate, insightsLimiter] }, async (request, reply) => {
    if (!isFeatureEnabled('AI_INSIGHTS')) {
      return reply.status(503).send({ error: 'AI features are currently disabled', feature: 'AI_INSIGHTS' });
    }
    const parsed = insightsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { boardId } = parsed.data;
    const workspaceId = await getBoardWorkspaceId(boardId);
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');

    // Build extended context with members, card details, and activity
    const baseContext = await fetchBoardContext(boardId);

    // Get workspace members with card counts
    const wsMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        userId: true,
        user: { select: { name: true } },
      },
    });

    const members = await Promise.all(
      wsMembers.map(async (m) => {
        const openCards = await prisma.card.count({
          where: {
            isArchived: false,
            assignees: { some: { userId: m.userId } },
            list: { board: { workspaceId }, isArchived: false },
          },
        });
        const doneCards = await prisma.card.count({
          where: {
            isArchived: false,
            assignees: { some: { userId: m.userId } },
            list: {
              name: { in: ['Done', 'Completed', 'Closed'] },
              board: { workspaceId },
              isArchived: false,
            },
          },
        });
        return { userId: m.userId, name: m.user.name, openCards, doneCards };
      })
    );

    // Fetch cards with full details
    const cardsWithDates = await prisma.card.findMany({
      where: { list: { boardId, isArchived: false }, isArchived: false },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        id: true,
        title: true,
        dueDate: true,
        createdAt: true,
        list: { select: { name: true } },
        assignees: { select: { user: { select: { name: true } } } },
        labels: { select: { label: { select: { name: true } } } },
      },
    });

    // Fetch recent activity
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivity = await prisma.activityLog.findMany({
      where: { boardId, createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { action: true, createdAt: true },
    });

    const insightsContext: BoardInsightsContext = {
      ...baseContext,
      members,
      cardsWithDates: cardsWithDates.map((c) => ({
        id: c.id,
        title: c.title,
        listName: c.list.name,
        dueDate: c.dueDate?.toISOString() ?? null,
        createdAt: c.createdAt.toISOString(),
        assignees: c.assignees.map((a) => a.user.name),
        labels: c.labels.map((l) => l.label?.name).filter((n): n is string => n !== null),
      })),
      recentActivity: recentActivity.map((a) => ({
        action: a.action,
        createdAt: a.createdAt.toISOString(),
      })),
    };

    const insights = await aiService.analyzeBoardHealth(insightsContext);
    return reply.send(insights);
  });

  // ── POST /api/ai/suggest-assignee ───────────────────────────────────────────

  const suggestAssigneeSchema = z.object({
    boardId: z.string(),
    cardId: z.string(),
  });

  app.post('/suggest-assignee', { preHandler: [authenticate, suggestAssigneeLimiter] }, async (request, reply) => {
    if (!isFeatureEnabled('AI_SUGGEST')) {
      return reply.status(503).send({ error: 'AI features are currently disabled', feature: 'AI_SUGGEST' });
    }
    const parsed = suggestAssigneeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { boardId, cardId } = parsed.data;
    const workspaceId = await getBoardWorkspaceId(boardId);
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');

    // Get card details
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: {
        title: true,
        list: { select: { name: true } },
        labels: { select: { label: { select: { name: true } } } },
      },
    });
    if (!card) return reply.status(404).send({ error: 'Card not found' });

    // Get workspace members with workload stats
    const wsMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        userId: true,
        user: { select: { name: true } },
      },
    });

    const membersWithStats = await Promise.all(
      wsMembers.map(async (m) => {
        const openCards = await prisma.card.count({
          where: {
            isArchived: false,
            assignees: { some: { userId: m.userId } },
            list: { board: { workspaceId }, isArchived: false },
          },
        });
        // Get labels this member typically works on
        const memberLabels = await prisma.cardLabel.findMany({
          where: { card: { assignees: { some: { userId: m.userId } } } },
          select: { label: { select: { name: true } } },
          take: 20,
        });
        const labelNames = [...new Set(
          memberLabels.map((cl) => cl.label?.name).filter((n): n is string => n !== null)
        )];
        return { userId: m.userId, name: m.user.name, openCards, labels: labelNames };
      })
    );

    const cardLabels = card.labels.map((l) => l.label?.name).filter((n): n is string => n !== null);

    const suggestions = await aiService.suggestAssignee(
      card.title,
      cardLabels,
      card.list.name,
      membersWithStats
    );

    return reply.send({ suggestions });
  });

  // ── POST /api/ai/suggest-replies ────────────────────────────────────────────

  const suggestRepliesSchema = z.object({
    cardId: z.string(),
  });

  app.post('/suggest-replies', { preHandler: [authenticate, suggestRepliesLimiter] }, async (request, reply) => {
    if (!isFeatureEnabled('AI_SUGGEST')) {
      return reply.status(503).send({ error: 'AI features are currently disabled', feature: 'AI_SUGGEST' });
    }
    const parsed = suggestRepliesSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { cardId } = parsed.data;

    // Get card info + recent comments
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: {
        title: true,
        description: true,
        list: { select: { boardId: true } },
        comments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            content: true,
            user: { select: { name: true } },
          },
        },
      },
    });
    if (!card) return reply.status(404).send({ error: 'Card not found' });

    // Verify board access
    const boardId = card.list.boardId;
    const workspaceId = await getBoardWorkspaceId(boardId);
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');

    const recentComments = card.comments.reverse().map((c) => ({
      user: c.user.name,
      content: c.content,
    }));

    const suggestions = await aiService.suggestCommentReplies(
      card.title,
      card.description,
      recentComments
    );

    return reply.send({ suggestions });
  });

  // ── POST /api/ai/ultraplan ────────────────────────────────────────────────

  const ultraplanSchema = z.object({
    boardId: z.string(),
    goal: z.string().min(5).max(2000),
  });

  app.post('/ultraplan', { preHandler: [authenticate, ultraplanLimiter] }, async (request, reply) => {
    if (!isFeatureEnabled('AI_ULTRAPLAN')) {
      return reply.status(503).send({ error: 'AI features are currently disabled', feature: 'AI_ULTRAPLAN' });
    }
    const parsed = ultraplanSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { boardId, goal } = parsed.data;
    const workspaceId = await getBoardWorkspaceId(boardId);
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');

    // Gather context for the planner
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        name: true,
        lists: {
          where: { isArchived: false },
          select: { name: true },
          orderBy: { position: 'asc' },
        },
      },
    });
    if (!board) return reply.status(404).send({ error: 'Board not found' });

    const wsMembers = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { user: { select: { name: true } } },
    });
    const memberNames = wsMembers.map((m) => m.user.name);
    const existingListNames = board.lists.map((l) => l.name);

    const plan = await aiService.generateProjectPlan(goal, board.name, memberNames, existingListNames);

    const userId = (request as any).userId as string;
    await logAiActivity(workspaceId, boardId, userId, 'ai:ultraplan_generated', { goal });

    return reply.send(plan);
  });

  // ── POST /api/ai/ultraplan/execute ────────────────────────────────────────

  const ultraplanExecuteSchema = z.object({
    boardId: z.string(),
    lists: z.array(
      z.object({
        name: z.string().min(1).max(100),
        cards: z.array(
          z.object({
            title: z.string().min(1).max(500),
            description: z.string().optional(),
            suggestedAssignee: z.string().nullable().optional(),
            estimatedDays: z.number().optional(),
            labels: z.array(z.string()).optional(),
            priority: z.string().optional(),
          })
        ),
      })
    ),
  });

  app.post('/ultraplan/execute', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = ultraplanExecuteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { boardId, lists } = parsed.data;
    const workspaceId = await getBoardWorkspaceId(boardId);
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');
    const userId = (request as any).userId as string;

    // Bulk create via transaction
    const results = await prisma.$transaction(async (tx) => {
      const created: Array<{ listName: string; cardCount: number }> = [];

      // Get current max list position
      const lastList = await tx.list.findFirst({
        where: { boardId, isArchived: false },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      let listPosition = lastList ? lastList.position + 1.0 : 1.0;

      for (const list of lists) {
        // Check if list already exists
        let dbList = await tx.list.findFirst({
          where: { boardId, name: list.name, isArchived: false },
          select: { id: true },
        });

        if (!dbList) {
          dbList = await tx.list.create({
            data: { boardId, name: list.name, position: listPosition },
            select: { id: true },
          });
          listPosition += 1.0;
        }

        let cardPosition = 1.0;
        for (const card of list.cards) {
          const newCard = await tx.card.create({
            data: {
              listId: dbList.id,
              title: card.title,
              description: card.description ?? null,
              position: cardPosition,
              createdById: userId,
              dueDate: card.estimatedDays
                ? new Date(Date.now() + card.estimatedDays * 24 * 60 * 60 * 1000)
                : null,
            },
            select: { id: true },
          });

          // Assign member if suggested
          if (card.suggestedAssignee) {
            const member = await tx.workspaceMember.findFirst({
              where: {
                workspaceId,
                user: { name: { contains: card.suggestedAssignee, mode: 'insensitive' } },
              },
              select: { userId: true },
            });
            if (member) {
              await tx.cardAssignee.create({
                data: { cardId: newCard.id, userId: member.userId },
              });
            }
          }

          // Create labels
          if (card.labels && card.labels.length > 0) {
            for (const labelName of card.labels) {
              let label = await tx.label.findFirst({
                where: { boardId, name: { equals: labelName, mode: 'insensitive' } },
                select: { id: true },
              });
              if (!label) {
                const colorIdx = await tx.label.count({ where: { boardId } });
                const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4'];
                label = await tx.label.create({
                  data: { boardId, name: labelName, color: colors[colorIdx % colors.length] },
                  select: { id: true },
                });
              }
              await tx.cardLabel.upsert({
                where: { cardId_labelId: { cardId: newCard.id, labelId: label.id } },
                create: { cardId: newCard.id, labelId: label.id },
                update: {},
              });
            }
          }

          cardPosition += 1.0;
        }

        created.push({ listName: list.name, cardCount: list.cards.length });
      }

      return created;
    });

    const totalCards = results.reduce((sum, r) => sum + r.cardCount, 0);
    await logAiActivity(workspaceId, boardId, userId, 'ai:ultraplan_executed', {
      listsCreated: results.length,
      cardsCreated: totalCards,
    });

    return reply.send({
      success: true,
      listsCreated: results.length,
      cardsCreated: totalCards,
      details: results,
    });
  });

  // ── POST /api/ai/agent ────────────────────────────────────────────────────

  const agentSchema = z.object({
    boardId: z.string(),
    command: z.string().min(1).max(1000),
  });

  const agentExecuteSchema = z.object({
    boardId: z.string(),
    toolCalls: z.array(
      z.object({
        name: z.string(),
        args: z.record(z.string(), z.any()),
      })
    ),
  });

  // Plan — returns tool calls for preview
  app.post('/agent', { preHandler: [authenticate, agentLimiter] }, async (request, reply) => {
    if (!isFeatureEnabled('AI_AGENT')) {
      return reply.status(503).send({ error: 'AI features are currently disabled', feature: 'AI_AGENT' });
    }
    const parsed = agentSchema.safeParse(request.body);
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

    // Check for board memory to enrich context
    const memory = await prisma.boardMemory.findUnique({
      where: { boardId },
      select: { summary: true },
    });

    const plan = await aiService.planWithTools(command, context, memory?.summary);

    return reply.send(plan);
  });

  // Execute — runs the approved tool calls
  app.post('/agent/execute', { preHandler: [authenticate] }, async (request, reply) => {
    const parsed = agentExecuteSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      });
    }

    const { boardId, toolCalls } = parsed.data;
    const workspaceId = await getBoardWorkspaceId(boardId);
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');
    const userId = (request as any).userId as string;

    const results: ToolCallResult[] = [];
    for (const tc of toolCalls) {
      const result = await executeTool(tc.name, tc.args, boardId, workspaceId, userId);
      results.push(result);
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    await logAiActivity(workspaceId, boardId, userId, 'ai:agent_executed', {
      toolCallCount: toolCalls.length,
      succeeded,
      failed,
    });

    return reply.send({
      results,
      summary: `Executed ${succeeded}/${toolCalls.length} actions successfully${failed > 0 ? ` (${failed} failed)` : ''}.`,
    });
  });
}
