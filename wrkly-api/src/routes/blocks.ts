import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import { NotFoundError } from '../lib/errors';
import { blockInputSchema, validateBlockContent } from '../lib/block-validators';
import { cardEvents } from '../lib/realtime';
import { triggerAutomation } from '../lib/automation-events';
import prisma from '../lib/prisma';

type BlockType = 'TEXT' | 'CHECKLIST' | 'CODE' | 'IMAGE' | 'FILE' | 'DIVIDER';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Fetches a card and resolves the workspace chain.
 * Used to verify board membership through card → list → board → workspace.
 */
async function getCardWorkspaceId(cardId: string): Promise<string> {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { list: { select: { board: { select: { id: true, workspaceId: true } } } } },
  });
  if (!card) throw new NotFoundError('Card');
  return card.list.board.workspaceId;
}

// Returns workspaceId AND boardId for realtime emission
async function getCardContext(cardId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: { list: { select: { board: { select: { id: true, workspaceId: true } } } } },
  });
  if (!card) throw new NotFoundError('Card');
  return {
    workspaceId: card.list.board.workspaceId,
    boardId: card.list.board.id,
  };
}

/**
 * Fetches a block and resolves the full workspace chain.
 * Returns the block with its card's workspace info.
 */
async function getBlockContext(blockId: string) {
  const block = await prisma.block.findUnique({
    where: { id: blockId },
    include: {
      card: {
        select: {
          list: {
            select: { board: { select: { id: true, workspaceId: true } } },
          },
        },
      },
    },
  });
  if (!block) throw new NotFoundError('Block');
  return block;
}

const moveBlockSchema = z.object({
  position: z.number(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

export async function blockRoutes(app: FastifyInstance) {
  // ── 1. GET /api/cards/:cardId/blocks ──────────────────────────────────────
  app.get('/cards/:cardId/blocks', { preHandler: authenticate }, async (request, reply) => {
    const { cardId } = request.params as { cardId: string };

    const workspaceId = await getCardWorkspaceId(cardId);
    await requireWorkspaceMember(request, workspaceId);

    const blocks = await prisma.block.findMany({
      where: { cardId },
      orderBy: { position: 'asc' },
      select: { id: true, type: true, content: true, position: true },
    });

    return reply.send({ blocks });
  });

  // ── 2. POST /api/cards/:cardId/blocks ─────────────────────────────────────
  app.post('/cards/:cardId/blocks', { preHandler: authenticate }, async (request, reply) => {
    const { cardId } = request.params as { cardId: string };

    const ctx = await getCardContext(cardId);
    await requireWorkspaceMember(request, ctx.workspaceId, 'MEMBER');

    const parsed = blockInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { type, content, position: requestedPosition } = parsed.data;

    // Resolve position: use provided value or append after the last block
    let position: number;
    if (requestedPosition !== undefined) {
      position = requestedPosition;
    } else {
      const last = await prisma.block.findFirst({
        where: { cardId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      position = last ? last.position + 1.0 : 1.0;
    }

    const block = await prisma.block.create({
      data: { cardId, type, content, position },
      select: { id: true, type: true, content: true, position: true },
    });

    // Broadcast — reuse boardId from initial context (no extra DB query)
    cardEvents.blocksChanged(ctx.boardId, { cardId }, request.userId);

    return reply.status(201).send({ block });
  });

  // ── 3. PATCH /api/blocks/:id ──────────────────────────────────────────────
  app.patch('/blocks/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const ctx = await getBlockContext(id);
    const workspaceId = ctx.card.list.board.workspaceId;
    const boardId = ctx.card.list.board.id;
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');

    // No content in body → nothing to do
    const body = request.body as Record<string, unknown> | undefined;
    if (!body || !('content' in body)) {
      return reply.status(400).send({ error: 'content is required' });
    }

    // Validate incoming content against the block's existing type
    let validatedContent: unknown;
    try {
      validatedContent = validateBlockContent(ctx.type as BlockType, body.content);
    } catch {
      return reply.status(400).send({ error: 'Invalid content for block type' });
    }

    // Deep merge for CHECKLIST (replace items array wholesale if provided)
    // For all other types, take the validated content as-is.
    const existingContent =
      ctx.content !== null && typeof ctx.content === 'object' && !Array.isArray(ctx.content)
        ? (ctx.content as Record<string, unknown>)
        : {};

    const mergedContent =
      ctx.type === 'CHECKLIST'
        ? { ...existingContent, ...(validatedContent as Record<string, unknown>) }
        : validatedContent;

    const block = await prisma.block.update({
      where: { id },
      data: { content: mergedContent as object },
      select: { id: true, type: true, content: true, position: true },
    });

    // Broadcast — reuse boardId from initial context
    cardEvents.blocksChanged(boardId, { cardId: ctx.cardId }, request.userId);

    // Emit checklist.completed if this is a CHECKLIST block and all items are now checked
    if (ctx.type === 'CHECKLIST') {
      const content = mergedContent as Record<string, unknown>;
      const items = Array.isArray(content.items) ? content.items as Array<{ checked: boolean }> : [];
      if (items.length > 0 && items.every((item) => item.checked === true)) {
        triggerAutomation({
          type: 'checklist.completed',
          boardId,
          cardId: ctx.cardId,
          userId: request.userId,
          data: { blockId: id },
        });
      }
    }

    return reply.send({ block });
  });

  // ── 4. PATCH /api/blocks/:id/move ─────────────────────────────────────────
  app.patch('/blocks/:id/move', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const ctx = await getBlockContext(id);
    const boardId = ctx.card.list.board.id;
    await requireWorkspaceMember(request, ctx.card.list.board.workspaceId, 'MEMBER');

    const parsed = moveBlockSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const block = await prisma.block.update({
      where: { id },
      data: { position: parsed.data.position },
      select: { id: true, position: true },
    });

    cardEvents.blocksChanged(boardId, { cardId: ctx.cardId }, request.userId);

    return reply.send({ block });
  });

  // ── 5. DELETE /api/blocks/:id ─────────────────────────────────────────────
  app.delete('/blocks/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const ctx = await getBlockContext(id);
    const boardId = ctx.card.list.board.id;
    await requireWorkspaceMember(request, ctx.card.list.board.workspaceId, 'MEMBER');

    // Hard delete — blocks don't need soft-delete
    await prisma.block.delete({ where: { id } });

    cardEvents.blocksChanged(boardId, { cardId: ctx.cardId }, request.userId);

    return reply.status(204).send();
  });
}
