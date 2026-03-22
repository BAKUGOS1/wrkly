import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import prisma from '../lib/prisma';
import { commentEvents } from '../lib/realtime';

// ── Schemas ───────────────────────────────────────────────────────────────────

const commentContentSchema = z.object({
  content: z.string().min(1).max(5000),
});

// Mention regex: matches @[userId]
const MENTION_RE = /@\[([a-zA-Z0-9_-]+)\]/g;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolves the workspace context for a card.
 * Returns { workspaceId, boardId, cardTitle } through the list → board chain.
 */
async function getCardContext(cardId: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    select: {
      title: true,
      list: {
        select: { board: { select: { id: true, workspaceId: true } } },
      },
    },
  });
  if (!card) throw new NotFoundError('Card');
  return {
    workspaceId: card.list.board.workspaceId,
    boardId: card.list.board.id,
    cardTitle: card.title,
  };
}

/**
 * Extracts unique user IDs from @[userId] mentions in content.
 */
function extractMentions(content: string): string[] {
  const ids = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_RE.source, 'g');
  while ((match = re.exec(content)) !== null) {
    ids.add(match[1]);
  }
  return [...ids];
}

// ── Routes ────────────────────────────────────────────────────────────────────

export async function commentRoutes(app: FastifyInstance) {
  // ── 1. GET /api/cards/:cardId/comments ────────────────────────────────────
  app.get('/cards/:cardId/comments', { preHandler: authenticate }, async (request, reply) => {
    const { cardId } = request.params as { cardId: string };

    const { workspaceId } = await getCardContext(cardId);
    await requireWorkspaceMember(request, workspaceId);

    const comments = await prisma.comment.findMany({
      where: { cardId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return reply.send({ comments });
  });

  // ── 2. POST /api/cards/:cardId/comments ───────────────────────────────────
  app.post('/cards/:cardId/comments', { preHandler: authenticate }, async (request, reply) => {
    const { cardId } = request.params as { cardId: string };

    const { workspaceId, boardId, cardTitle } = await getCardContext(cardId);
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');

    const parsed = commentContentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { content } = parsed.data;

    // Create the comment
    const comment = await prisma.comment.create({
      data: { cardId, userId: request.userId, content },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    // Fetch commenter's name for mention notifications
    const commenter = await prisma.user.findUnique({
      where: { id: request.userId },
      select: { name: true },
    });
    const commenterName = commenter?.name ?? 'Someone';

    // Process @mentions — non-blocking, fire-and-forget
    const mentionedIds = extractMentions(content).filter((id) => id !== request.userId);
    // Sanitize card title to prevent stored XSS via notification rendering
    const safeCardTitle = cardTitle.replace(/[<>&"']/g, '');
    if (mentionedIds.length > 0) {
      // Verify mentioned users are workspace members in one query
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId, userId: { in: mentionedIds } },
        select: { userId: true },
      });
      const validIds = members.map((m: any) => m.userId);

      if (validIds.length > 0) {
        prisma.notification
          .createMany({
            data: validIds.map((userId: any) => ({
              userId,
              type: 'mention',
              title: `${commenterName} mentioned you in "${safeCardTitle}"`,
              body: content.slice(0, 100),
              link: `/board/${boardId}?card=${cardId}`,
            })),
            skipDuplicates: true,
          })
          .catch(() => {/* non-critical */});
      }
    }

    // Activity log — fire-and-forget
    prisma.activityLog
      .create({
        data: {
          workspaceId,
          boardId,
          cardId,
          userId: request.userId,
          action: 'comment.added',
          metadata: { cardId, commentPreview: content.slice(0, 100) },
        },
      })
      .catch(() => {/* non-critical */});

    // Broadcast new comment to board room
    commentEvents.created(boardId, { cardId, comment }, request.userId);

    return reply.status(201).send({ comment });
  });

  // ── 3. PATCH /api/comments/:id ────────────────────────────────────────────
  app.patch('/comments/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.comment.findUnique({
      where: { id },
      select: { userId: true, cardId: true },
    });
    if (!existing) throw new NotFoundError('Comment');

    // Verify workspace membership (blocks removed members from editing)
    const { workspaceId } = await getCardContext(existing.cardId);
    await requireWorkspaceMember(request, workspaceId, 'MEMBER');

    // Only the author can edit
    if (existing.userId !== request.userId) {
      throw new ForbiddenError('Only the comment author can edit this comment');
    }

    const parsed = commentContentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: { content: parsed.data.content },
      select: {
        id: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return reply.send({ comment });
  });

  // ── 4. DELETE /api/comments/:id ───────────────────────────────────────────
  app.delete('/comments/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.comment.findUnique({
      where: { id },
      select: {
        userId: true,
        card: {
          select: { list: { select: { board: { select: { workspaceId: true } } } } },
        },
      },
    });
    if (!existing) throw new NotFoundError('Comment');

    const workspaceId = existing.card.list.board.workspaceId;
    const isAuthor = existing.userId === request.userId;

    if (!isAuthor) {
      // Must be ADMIN or OWNER to delete someone else's comment
      await requireWorkspaceMember(request, workspaceId, 'ADMIN');
    }

    await prisma.comment.delete({ where: { id } });

    return reply.status(204).send();
  });
}
