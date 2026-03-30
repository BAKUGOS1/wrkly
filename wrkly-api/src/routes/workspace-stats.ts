import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import prisma from '../lib/prisma';

export async function workspaceStatsRoutes(app: FastifyInstance) {
  // GET /api/workspaces/:slug/stats — real dashboard stats
  app.get('/workspaces/:slug/stats', { preHandler: authenticate }, async (request, reply) => {
    const { slug } = request.params as { slug: string };

    // Resolve workspace from slug
    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!workspace) {
      return reply.status(404).send({ error: 'Workspace not found' });
    }

    await requireWorkspaceMember(request, workspace.id);

    // Get all board IDs in this workspace
    const boards = await prisma.board.findMany({
      where: { workspaceId: workspace.id, isArchived: false },
      select: { id: true },
    });
    const boardIds = boards.map((b) => b.id);

    if (boardIds.length === 0) {
      return reply.send({
        totalBoards: 0,
        totalCards: 0,
        activeTasks: 0,
        overdueTasks: 0,
        completedTasks: 0,
        memberCount: 0,
      });
    }

    const now = new Date();

    // Aggregate card stats across all boards
    const [totalCards, overdueTasks, memberCount] = await Promise.all([
      // Total active (non-archived) cards
      prisma.card.count({
        where: {
          list: { boardId: { in: boardIds } },
          isArchived: false,
        },
      }),
      // Overdue cards (have a dueDate in the past, not archived)
      prisma.card.count({
        where: {
          list: { boardId: { in: boardIds } },
          isArchived: false,
          dueDate: { lt: now },
        },
      }),
      // Workspace members
      prisma.workspaceMember.count({
        where: { workspaceId: workspace.id },
      }),
    ]);

    return reply.send({
      totalBoards: boardIds.length,
      totalCards,
      activeTasks: totalCards, // all non-archived cards
      overdueTasks,
      completedTasks: 0, // Would need a "completed" status or list convention
      memberCount,
    });
  });

  // GET /api/workspaces/:slug/activity — real recent activity
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
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
        board: {
          select: { id: true, name: true },
        },
        card: {
          select: { id: true, title: true },
        },
      },
    });

    return reply.send({ activities });
  });
}
