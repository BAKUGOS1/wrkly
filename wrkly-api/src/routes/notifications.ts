import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import prisma from '../lib/prisma';

// ── Schemas ───────────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  limit:      z.coerce.number().min(1).max(50).default(20),
  cursor:     z.string().optional(),
  unreadOnly: z.enum(['true', 'false']).optional(),
});

// ── Routes ────────────────────────────────────────────────────────────────────

export async function notificationRoutes(app: FastifyInstance) {
  // ── 1. GET /api/notifications ──────────────────────────────────────────────
  // Cursor-based pagination, ordered by createdAt DESC.
  // Uses the (userId, isRead, createdAt) index declared in schema.prisma.
  app.get('/notifications', { preHandler: authenticate }, async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { limit, cursor, unreadOnly } = parsed.data;
    const onlyUnread = unreadOnly === 'true';

    // Resolve cursor date BEFORE the main query to avoid undefined leaking into WHERE
    let cursorDate: Date | undefined;
    if (cursor) {
      const c = await prisma.notification.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });
      cursorDate = c?.createdAt;
      // If cursor ID was deleted, return empty — don't fall through to "all"
      if (!cursorDate) {
        return reply.send({ notifications: [], unreadCount: 0, nextCursor: null });
      }
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: request.userId,
          ...(onlyUnread ? { isRead: false } : {}),
          ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        // Fetch limit + 1 to detect whether a next page exists
        take: limit + 1,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          link: true,
          isRead: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: { userId: request.userId, isRead: false },
      }),
    ]);

    // Determine next cursor
    const hasNext = notifications.length > limit;
    const page = hasNext ? notifications.slice(0, limit) : notifications;
    const nextCursor = hasNext ? page[page.length - 1].id : null;

    return reply.send({ notifications: page, unreadCount, nextCursor });
  });

  // ── 2. GET /api/notifications/unread-count ─────────────────────────────────
  // Declared before /:id to avoid Fastify matching "unread-count" as a param.
  app.get('/notifications/unread-count', { preHandler: authenticate }, async (request, reply) => {
    const count = await prisma.notification.count({
      where: { userId: request.userId, isRead: false },
    });
    return reply.send({ count });
  });

  // ── 3. PATCH /api/notifications/read-all ──────────────────────────────────
  // Declared before /:id/read for the same reason.
  app.patch('/notifications/read-all', { preHandler: authenticate }, async (request, reply) => {
    const result = await prisma.notification.updateMany({
      where: { userId: request.userId, isRead: false },
      data: { isRead: true },
    });
    return reply.send({ updatedCount: result.count });
  });

  // ── 4. PATCH /api/notifications/:id/read ──────────────────────────────────
  app.patch('/notifications/:id/read', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const existing = await prisma.notification.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!existing) throw new NotFoundError('Notification');
    if (existing.userId !== request.userId) throw new ForbiddenError('Access denied');

    const notification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
      select: { id: true, isRead: true },
    });

    return reply.send({ notification });
  });
}
