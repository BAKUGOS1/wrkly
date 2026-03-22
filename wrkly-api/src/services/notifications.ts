import prisma from '../lib/prisma';
import { broadcastToUser } from '../lib/socket';

// Infer Notification shape directly from Prisma's return type
type Notification = Awaited<ReturnType<typeof prisma.notification.create>>;

// ── Types ─────────────────────────────────────────────────────────────────────

export type NotificationType = 'mention' | 'reminder' | 'automation' | 'assignment';

export interface CreateNotificationParams {
  userId: string;
  type:   NotificationType;
  title:  string;
  body?:  string;
  link?:  string;
}

export interface NotifyBoardMembersParams {
  boardId:        string;
  excludeUserId?: string;
  type:           string;
  title:          string;
  body?:          string;
  link?:          string;
}

export interface CreateReminderParams {
  userId:     string;
  cardId:     string;
  cardTitle:  string;
  boardId:    string;
  dueDate:    Date;
}

// ── Functions ─────────────────────────────────────────────────────────────────

/**
 * Creates a single notification record, persists it, then pushes it
 * to the recipient via WebSocket (if they are connected).
 */
export async function createNotification(
  params: CreateNotificationParams
): Promise<Notification> {
  const notification = await prisma.notification.create({
    data: {
      userId: params.userId,
      type:   params.type,
      title:  params.title,
      body:   params.body,
      link:   params.link,
    },
  });

  // Push to the user's private socket room (non-blocking — fire and respond)
  broadcastToUser(params.userId, 'notification:new', notification);

  return notification;
}

/**
 * Fans out a notification to all members of a board's workspace,
 * excluding the action performer. Uses createMany for efficiency,
 * then pushes each notification to connected members.
 */
export async function notifyBoardMembers(
  params: NotifyBoardMembersParams
): Promise<void> {
  // Resolve workspace from board
  const board = await prisma.board.findUnique({
    where: { id: params.boardId },
    select: { workspaceId: true },
  });
  if (!board) return; // Board gone — nothing to do

  // Fetch all member IDs in one query
  const members = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: board.workspaceId,
      ...(params.excludeUserId ? { NOT: { userId: params.excludeUserId } } : {}),
    },
    select: { userId: true },
  });

  if (members.length === 0) return;

  // Batch insert — one round-trip regardless of member count
  await prisma.notification.createMany({
    data: members.map(({ userId }: { userId: string }) => ({
      userId,
      type:  params.type,
      title: params.title,
      body:  params.body,
      link:  params.link,
    })),
    skipDuplicates: true,
  });

  // Push to each connected member — fetch the created notifications to get IDs/timestamps
  // We use a single query scoped to this batch (same title + type + recent createdAt)
  const pushed = await prisma.notification.findMany({
    where: {
      userId: { in: members.map((m: { userId: string }) => m.userId) },
      type:   params.type,
      title:  params.title,
      // Only notifications created in the last 10 seconds (this batch)
      createdAt: { gte: new Date(Date.now() - 10_000) },
    },
    select: {
      id: true,
      userId: true,
      type: true,
      title: true,
      body: true,
      link: true,
      isRead: true,
      createdAt: true,
    },
  });

  for (const notification of pushed) {
    broadcastToUser(notification.userId, 'notification:new', notification);
  }
}

/**
 * Creates a formatted due-date reminder notification for one user.
 */
export async function createReminderNotification(
  params: CreateReminderParams
): Promise<Notification> {
  const formatted = params.dueDate.toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  });

  return createNotification({
    userId: params.userId,
    type:   'reminder',
    title:  `Reminder: "${params.cardTitle}" is due ${formatted}`,
    body:   `The card "${params.cardTitle}" is due on ${formatted}.`,
    link:   `/app/board/${params.boardId}?card=${params.cardId}`,
  });
}
