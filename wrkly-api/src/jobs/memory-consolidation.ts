import prisma from '../lib/prisma';
import { aiService } from '../services/ai';
import { isFeatureEnabled } from '../lib/feature-flags';

export const QUEUE_NAME = 'memory-consolidation';

/**
 * "Dream Engine" — scans boards and compresses old card data into a compact
 * AI-generated summary stored in the BoardMemory table.
 *
 * Runs every 24 hours. Caps at 5 boards per tick to manage API costs.
 */
export async function consolidateBoardMemories(): Promise<void> {
  if (!isFeatureEnabled('AI_MEMORY')) {
    console.log('[memory] AI_MEMORY feature disabled — skipping');
    return;
  }

  console.log('[memory] Starting memory consolidation...');

  // Find boards with significant history (> 20 cards total incl. archived)
  const boards = await prisma.board.findMany({
    where: { isArchived: false },
    select: {
      id: true,
      name: true,
      workspaceId: true,
      boardMemory: { select: { updatedAt: true } },
    },
    take: 20, // Pre-filter pool
  });

  // Filter to boards that need updating (no memory or stale > 20 hours)
  const staleThreshold = new Date(Date.now() - 20 * 60 * 60 * 1000); // 20 hours ago
  const needsUpdate = boards.filter(
    (b) => !b.boardMemory || b.boardMemory.updatedAt < staleThreshold
  );

  // Cap at 5 per tick
  const toProcess = needsUpdate.slice(0, 5);

  if (toProcess.length === 0) {
    console.log('[memory] All boards have fresh memory — skipping');
    return;
  }

  for (const board of toProcess) {
    try {
      // Get archived/closed cards (cards in "Done"/"Completed" lists or archived)
      const archivedCards = await prisma.card.findMany({
        where: {
          OR: [
            { isArchived: true, list: { boardId: board.id } },
            {
              isArchived: false,
              list: {
                boardId: board.id,
                name: { in: ['Done', 'Completed', 'Closed', 'Shipped'] },
              },
            },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
        select: {
          title: true,
          list: { select: { name: true } },
          updatedAt: true,
        },
      });

      if (archivedCards.length < 10) {
        console.log(`[memory] Board "${board.name}" has too few archived cards (${archivedCards.length}) — skipping`);
        continue;
      }

      // Get recent activity summary
      const activityCounts = await prisma.activityLog.groupBy({
        by: ['action'],
        where: { boardId: board.id },
        _count: { action: true },
      });
      const activitySummary = activityCounts
        .map((a) => `${a.action}: ${a._count.action} times`)
        .join(', ');

      // Get member names
      const members = await prisma.workspaceMember.findMany({
        where: { workspaceId: board.workspaceId },
        select: { user: { select: { name: true } } },
      });
      const memberNames = members.map((m) => m.user.name);

      // Generate compressed memory
      const summary = await aiService.consolidateMemory(
        board.name,
        archivedCards.map((c) => ({
          title: c.title,
          listName: c.list.name,
          doneAt: c.updatedAt.toISOString().split('T')[0],
        })),
        activitySummary,
        memberNames
      );

      // Upsert the memory record
      const windowStart = archivedCards.length > 0
        ? archivedCards[archivedCards.length - 1].updatedAt
        : new Date();
      const windowEnd = archivedCards.length > 0
        ? archivedCards[0].updatedAt
        : new Date();

      await prisma.boardMemory.upsert({
        where: { boardId: board.id },
        create: {
          boardId: board.id,
          summary,
          cardCount: archivedCards.length,
          windowStart,
          windowEnd,
        },
        update: {
          summary,
          cardCount: archivedCards.length,
          windowStart,
          windowEnd,
        },
      });

      console.log(`[memory] ✅ Consolidated memory for "${board.name}" (${archivedCards.length} cards)`);
    } catch (err) {
      console.error(`[memory] ❌ Failed for board "${board.name}":`, err);
    }
  }

  console.log(`[memory] Memory consolidation complete — processed ${toProcess.length} board(s)`);
}
