import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import { NotFoundError, AppError } from '../lib/errors';
import prisma from '../lib/prisma';

// ── Schemas ───────────────────────────────────────────────────────────────────

const HEX_COLOR_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const createLabelSchema = z.object({
  name: z.string().max(50),
  color: z.string().regex(HEX_COLOR_RE, 'color must be a valid hex code (e.g. "#EF4444")'),
});

const updateLabelSchema = z.object({
  name: z.string().max(50).optional(),
  color: z
    .string()
    .regex(HEX_COLOR_RE, 'color must be a valid hex code (e.g. "#EF4444")')
    .optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Resolves workspaceId for a board. */
async function getBoardWorkspaceId(boardId: string): Promise<string> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { workspaceId: true },
  });
  if (!board) throw new NotFoundError('Board');
  return board.workspaceId;
}

/** Fetches a label and its board's workspaceId. */
async function getLabelContext(labelId: string) {
  const label = await prisma.label.findUnique({
    where: { id: labelId },
    select: { id: true, name: true, color: true, boardId: true, board: { select: { workspaceId: true } } },
  });
  if (!label) throw new NotFoundError('Label');
  return label;
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function labelRoutes(app: FastifyInstance) {
  // ── 1. GET /api/boards/:boardId/labels ────────────────────────────────────
  app.get('/boards/:boardId/labels', { preHandler: authenticate }, async (request, reply) => {
    const { boardId } = request.params as { boardId: string };

    const workspaceId = await getBoardWorkspaceId(boardId);
    await requireWorkspaceMember(request, workspaceId);

    const labels = await prisma.label.findMany({
      where: { boardId },
      select: { id: true, name: true, color: true },
      orderBy: { name: 'asc' },
    });

    return reply.send({ labels });
  });

  // ── 2. POST /api/boards/:boardId/labels ───────────────────────────────────
  app.post('/boards/:boardId/labels', { preHandler: authenticate }, async (request, reply) => {
    const { boardId } = request.params as { boardId: string };

    const workspaceId = await getBoardWorkspaceId(boardId);
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');

    const parsed = createLabelSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { name, color } = parsed.data;

    // Enforce unique name per board
    const existing = await prisma.label.findUnique({
      where: { boardId_name: { boardId, name } },
      select: { id: true },
    });
    if (existing) throw new AppError(`A label named "${name}" already exists on this board`, 409);

    const label = await prisma.label.create({
      data: { boardId, name, color },
      select: { id: true, name: true, color: true },
    });

    return reply.status(201).send({ label });
  });

  // ── 3. PATCH /api/labels/:id ──────────────────────────────────────────────
  app.patch('/labels/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const ctx = await getLabelContext(id);
    await requireWorkspaceMember(request, ctx.board.workspaceId, 'MEMBER');

    const parsed = updateLabelSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    // Enforce unique name per board (when changing name)
    if (parsed.data.name && parsed.data.name !== ctx.name) {
      const conflict = await prisma.label.findUnique({
        where: { boardId_name: { boardId: ctx.boardId, name: parsed.data.name } },
        select: { id: true },
      });
      if (conflict) throw new AppError(`A label named "${parsed.data.name}" already exists on this board`, 409);
    }

    const label = await prisma.label.update({
      where: { id },
      data: parsed.data,
      select: { id: true, name: true, color: true },
    });

    return reply.send({ label });
  });

  // ── 4. DELETE /api/labels/:id ─────────────────────────────────────────────
  app.delete('/labels/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const ctx = await getLabelContext(id);
    await requireWorkspaceMember(request, ctx.board.workspaceId, 'ADMIN');

    // Cascade: Prisma schema has onDelete: Cascade on CardLabel → Label,
    // so CardLabel join records are cleaned up automatically.
    await prisma.label.delete({ where: { id } });

    return reply.status(204).send();
  });
}
