import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import prisma from '../lib/prisma';

export async function workspaceStatsRoutes(app: FastifyInstance) {
  // GET /api/workspaces/:slug/stats — rich dashboard stats
  app.get('/workspaces/:slug/stats', { preHandler: authenticate }, async (request, reply) => {
    const { slug } = request.params as { slug: string };

    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!workspace) {
      return reply.status(404).send({ error: 'Workspace not found' });
    }

    await requireWorkspaceMember(request, workspace.id);

    const boards = await prisma.board.findMany({
      where: { workspaceId: workspace.id, isArchived: false },
      select: { id: true },
    });
    const boardIds = boards.map((b) => b.id);

    if (boardIds.length === 0) {
      return reply.send({
        totalBoards: 0, totalCards: 0, activeTasks: 0, overdueTasks: 0,
        completedTasks: 0, memberCount: 0,
        velocityByWeek: [], cardsByList: [], topAssignees: [],
      });
    }

    const now = new Date();

    // ── Basic counts ────────────────────────────────────────────────────────
    const [totalCards, overdueTasks, memberCount, allLists] = await Promise.all([
      prisma.card.count({
        where: { list: { boardId: { in: boardIds } }, isArchived: false },
      }),
      prisma.card.count({
        where: { list: { boardId: { in: boardIds } }, isArchived: false, dueDate: { lt: now } },
      }),
      prisma.workspaceMember.count({ where: { workspaceId: workspace.id } }),
      prisma.list.findMany({
        where: { boardId: { in: boardIds }, isArchived: false },
        select: {
          id: true,
          name: true,
          _count: { select: { cards: { where: { isArchived: false } } } },
        },
      }),
    ]);

    // ── Cards by list (for doughnut chart) ─────────────────────────────────
    const cardsByList = allLists
      .map((l) => ({ name: l.name, count: l._count.cards }))
      .filter((l) => l.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ── Velocity — cards created per week for last 8 weeks ──────────────────
    const velocityByWeek: Array<{ week: string; cards: number }> = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const count = await prisma.card.count({
        where: {
          list: { boardId: { in: boardIds } },
          isArchived: false,
          createdAt: { gte: weekStart, lt: weekEnd },
        },
      });

      const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      velocityByWeek.push({ week: label, cards: count });
    }

    // ── Top assignees by card count ─────────────────────────────────────────
    const assigneeCounts = await prisma.cardAssignee.groupBy({
      by: ['userId'],
      where: { card: { list: { boardId: { in: boardIds } }, isArchived: false } },
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 8,
    });

    const topAssigneesWithNames = await Promise.all(
      assigneeCounts.map(async (a) => {
        const user = await prisma.user.findUnique({
          where: { id: a.userId },
          select: { id: true, name: true, avatarUrl: true },
        });
        return { userId: a.userId, name: user?.name ?? 'Unknown', avatarUrl: user?.avatarUrl, cards: a._count.userId };
      })
    );

    return reply.send({
      totalBoards: boardIds.length,
      totalCards,
      activeTasks: totalCards,
      overdueTasks,
      completedTasks: 0,
      memberCount,
      velocityByWeek,
      cardsByList,
      topAssignees: topAssigneesWithNames,
    });
  });

  // GET /api/workspaces/:slug/activity — recent activity feed
  app.get('/workspaces/:slug/activity', { preHandler: authenticate }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { limit = '10' } = request.query as { limit?: string };

    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!workspace) {
      return reply.status(404).send({ error: 'Workspace not found' });
    }

    await requireWorkspaceMember(request, workspace.id);

    const activities = await prisma.activityLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit, 10) || 10, 50),
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
        board: { select: { id: true, name: true } },
        card: { select: { id: true, title: true } },
      },
    });

    return reply.send({ activities });
  });
}
