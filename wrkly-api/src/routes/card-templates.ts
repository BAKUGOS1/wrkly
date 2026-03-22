import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { Prisma, type BlockType } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import { NotFoundError, AppError } from '../lib/errors';
import prisma from '../lib/prisma';

// ── Schemas ───────────────────────────────────────────────────────────────────

const createTemplateSchema = z.object({
  name:        z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  cardId:      z.string(),
});

const applyTemplateSchema = z.object({
  templateId: z.string(),
  title:      z.string().min(1).max(500),
});

// ── Types ─────────────────────────────────────────────────────────────────────

interface TemplateBlock {
  type:    string;
  content: Prisma.InputJsonValue;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getBoardWorkspaceId(boardId: string): Promise<string> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { workspaceId: true },
  });
  if (!board) throw new NotFoundError('Board');
  return board.workspaceId;
}

async function getListContext(listId: string) {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { id: true, isArchived: true, board: { select: { id: true, workspaceId: true } } },
  });
  if (!list || list.isArchived) throw new NotFoundError('List');
  return list;
}

/**
 * When applying a template, regenerate IDs so each instantiation is unique.
 * This is especially important for CHECKLIST items that carry their own IDs.
 */
function freshenBlock(block: TemplateBlock): TemplateBlock {
  if (block.type !== 'CHECKLIST') return block;

  const content = block.content as { title?: string; items?: { id: string; text: string; checked: boolean }[] };
  return {
    type: block.type,
    content: {
      ...content,
      items: (content.items ?? []).map((item) => ({
        ...item,
        id: randomUUID(),    // fresh ID per checklist item
        checked: false,      // reset checked state
      })),
    },
  };
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function cardTemplateRoutes(app: FastifyInstance) {
  // ── 1. GET /api/boards/:boardId/card-templates ────────────────────────────
  app.get('/boards/:boardId/card-templates', { preHandler: authenticate }, async (request, reply) => {
    const { boardId } = request.params as { boardId: string };

    const workspaceId = await getBoardWorkspaceId(boardId);
    await requireWorkspaceMember(request, workspaceId);

    const templates = await prisma.cardTemplate.findMany({
      where: { boardId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, description: true, blocks: true },
    });

    const result = templates.map((t) => ({
      id:          t.id,
      name:        t.name,
      description: t.description,
      blockCount:  Array.isArray(t.blocks) ? (t.blocks as unknown[]).length : 0,
    }));

    return reply.send({ templates: result });
  });

  // ── 2. POST /api/boards/:boardId/card-templates ───────────────────────────
  app.post('/boards/:boardId/card-templates', { preHandler: authenticate }, async (request, reply) => {
    const { boardId } = request.params as { boardId: string };

    const workspaceId = await getBoardWorkspaceId(boardId);
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');

    const parsed = createTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { name, description, cardId } = parsed.data;

    // Verify the source card belongs to this board
    const sourceCard = await prisma.card.findFirst({
      where: { id: cardId, list: { boardId } },
      select: { id: true },
    });
    if (!sourceCard) throw new AppError('Card not found in this board', 404);

    // Read all blocks from the source card, ordered by position
    const blocks = await prisma.block.findMany({
      where: { cardId },
      orderBy: { position: 'asc' },
      select: { type: true, content: true },
    });

    const blocksJson: TemplateBlock[] = blocks.map((b) => ({
      type:    b.type,
      content: b.content as Prisma.InputJsonValue,
    }));

    const template = await prisma.cardTemplate.create({
      data: { boardId, name, description, blocks: blocksJson as unknown as Prisma.InputJsonValue, createdById: request.userId },
      select: { id: true, name: true, blocks: true },
    });

    return reply.status(201).send({
      template: {
        id:         template.id,
        name:       template.name,
        blockCount: Array.isArray(template.blocks) ? (template.blocks as unknown[]).length : 0,
      },
    });
  });

  // ── 3. POST /api/lists/:listId/cards/from-template ───────────────────────
  app.post('/lists/:listId/cards/from-template', { preHandler: authenticate }, async (request, reply) => {
    const { listId } = request.params as { listId: string };

    const listCtx = await getListContext(listId);
    await requireWorkspaceMember(request, listCtx.board.workspaceId, 'MEMBER');

    const parsed = applyTemplateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { templateId, title } = parsed.data;

    // Fetch the template (must belong to the same board)
    const template = await prisma.cardTemplate.findFirst({
      where: { id: templateId, boardId: listCtx.board.id },
      select: { blocks: true },
    });
    if (!template) throw new NotFoundError('Card template');

    const templateBlocks = (template.blocks as unknown as TemplateBlock[]) ?? [];

    // Compute next card position in the list
    const last = await prisma.card.findFirst({
      where: { listId, isArchived: false },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const cardPosition = last ? last.position + 1.0 : 1.0;

    // Create card + blocks atomically
    const card = await prisma.card.create({
      data: {
        listId,
        title,
        position:    cardPosition,
        createdById: request.userId,
        blocks: {
          create: templateBlocks.map((block, index) => ({
            type:     block.type as BlockType,
            content:  freshenBlock(block).content as object,
            position: index + 1.0,
          })),
        },
      },
      select: {
        id:       true,
        title:    true,
        position: true,
        listId:   true,
        blocks: {
          orderBy: { position: 'asc' },
          select:  { id: true, type: true, content: true, position: true },
        },
      },
    });

    return reply.status(201).send({ card });
  });

  // ── 4. DELETE /api/card-templates/:id ─────────────────────────────────────
  app.delete('/card-templates/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const template = await prisma.cardTemplate.findUnique({
      where: { id },
      select: { board: { select: { workspaceId: true } } },
    });
    if (!template) throw new NotFoundError('Card template');

    await requireWorkspaceMember(request, template.board.workspaceId, 'MEMBER');

    await prisma.cardTemplate.delete({ where: { id } });

    return reply.status(204).send();
  });
}
