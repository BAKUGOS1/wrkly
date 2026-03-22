import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import { AppError, NotFoundError } from '../lib/errors';
import { BOARD_TEMPLATES, TEMPLATES_BY_ID } from '../data/board-templates';
import prisma from '../lib/prisma';

// ── Schemas ───────────────────────────────────────────────────────────────────

const fromTemplateSchema = z.object({
  templateId: z.string(),
  name:       z.string().min(1).max(100).optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

export async function templateRoutes(app: FastifyInstance) {
  // ── 1. GET /api/templates/boards ──────────────────────────────────────────
  app.get('/templates/boards', { preHandler: authenticate }, async (_request, reply) => {
    return reply.send({ templates: BOARD_TEMPLATES });
  });

  // ── 2. POST /api/workspaces/:workspaceId/boards/from-template ─────────────
  app.post(
    '/workspaces/:workspaceId/boards/from-template',
    { preHandler: authenticate },
    async (request, reply) => {
      const { workspaceId } = request.params as { workspaceId: string };
      await requireWorkspaceMember(request, workspaceId, 'MEMBER');

      const parsed = fromTemplateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: 'Validation error',
          details: parsed.error.issues.map((i: z.ZodIssue) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        });
      }

      const { templateId, name } = parsed.data;

      const template = TEMPLATES_BY_ID.get(templateId);
      if (!template) throw new AppError(`Template "${templateId}" not found`, 404);

      const boardName = name ?? template.name;

      // Create board with all template lists in a single transaction
      const board = await prisma.board.create({
        data: {
          name:        boardName,
          workspaceId,
          createdById: request.userId,
          lists: {
            create: template.lists.map((listName, index) => ({
              name:     listName,
              position: index + 1.0,
            })),
          },
        },
        select: {
          id:          true,
          name:        true,
          description: true,
          background:  true,
          createdAt:   true,
          updatedAt:   true,
          lists: {
            orderBy: { position: 'asc' },
            select: {
              id:       true,
              name:     true,
              position: true,
              cards:    false,
            },
          },
        },
      });

      // WorkspaceId not needed in the read-back but required by NotFoundError guard
      if (!board) throw new NotFoundError('Board');

      return reply.status(201).send({ board });
    }
  );
}
