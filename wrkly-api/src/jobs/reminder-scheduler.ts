import prisma from '../lib/prisma';
import { createReminderNotification } from '../services/notifications';
import { triggerAutomation } from '../lib/automation-events';

const QUEUE_NAME = 'reminders';

// ── Due-date automation scan ─────────────────────────────────────────────────

/**
 * Scans all non-archived cards with a dueDate in the future
 * and queues automation events for those approaching or overdue.
 * Called on the same cadence as processReminders().
 */
export async function scanDueDateAutomations(): Promise<void> {
  const now = new Date();
  const APPROACHING_HOURS = 24; // Emit "approaching" if due within 24 h

  const cards = await prisma.card.findMany({
    where: {
      isArchived: false,
      dueDate:    { not: null },
    },
    select: {
      id:      true,
      dueDate: true,
      list: { select: { board: { select: { id: true } } } },
    },
  });

  for (const card of cards) {
    if (!card.dueDate) continue;
    const boardId = card.list.board.id;
    const msUntilDue = card.dueDate.getTime() - now.getTime();
    const hoursUntilDue = msUntilDue / (1000 * 60 * 60);

    if (msUntilDue < 0) {
      // Overdue
      triggerAutomation({
        type:   'card.overdue',
        boardId,
        cardId: card.id,
        data:   { overdueBy: Math.abs(hoursUntilDue) },
      });
    } else if (hoursUntilDue <= APPROACHING_HOURS) {
      // Approaching due date
      triggerAutomation({
        type:   'card.due_date_approaching',
        boardId,
        cardId: card.id,
        data:   { hoursUntilDue },
      });
    }
  }
}

// ── Processor ─────────────────────────────────────────────────────────────────

export async function processReminders(): Promise<void> {
  const now = new Date();

  // Fetch all due, unprocessed, non-archived cards with their assignees
  const cards = await prisma.card.findMany({
    where: {
      reminderAt:  { not: null, lte: now },
      isArchived:  false,
    },
    select: {
      id:          true,
      title:       true,
      dueDate:     true,
      reminderAt:  true,
      createdById: true,
      assignees: { select: { userId: true } },
      list: {
        select: { board: { select: { id: true } } },
      },
    },
  });

  if (cards.length === 0) return;

  let successCount = 0;

  for (const card of cards) {
    try {
      // Use assignees if any, fall back to the card creator
      const recipientIds =
        card.assignees.length > 0
          ? card.assignees.map((a: { userId: string }) => a.userId)
          : [card.createdById];

      const boardId = card.list.board.id;
      const dueDate = card.dueDate ?? card.reminderAt ?? now;

      // Notify each recipient (sequential within a card, isolated errors)
      await Promise.allSettled(
        recipientIds.map((userId: string) =>
          createReminderNotification({
            userId,
            cardId:    card.id,
            cardTitle: card.title,
            boardId,
            dueDate,
          })
        )
      );

      // Mark as processed — clear reminderAt atomically
      await prisma.card.update({
        where: { id: card.id },
        data:  { reminderAt: null },
      });

      successCount++;
    } catch (err) {
      // One card failing must not block the rest
      console.error(`[reminders] Failed to process card ${card.id}:`, err);
    }
  }

  console.log(`[reminders] Processed ${successCount}/${cards.length} reminders`);
}

export { QUEUE_NAME };
