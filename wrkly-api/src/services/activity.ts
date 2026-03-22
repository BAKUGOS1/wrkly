import { Prisma } from '@prisma/client';
import prisma from '../lib/prisma';

// ── Standard action type constants ────────────────────────────────────────────

export const Actions = {
  CARD_CREATED:         'card.created',
  CARD_UPDATED:         'card.updated',
  CARD_MOVED:           'card.moved',
  CARD_REORDERED:       'card.reordered',
  CARD_ARCHIVED:        'card.archived',
  LIST_CREATED:         'list.created',
  LIST_RENAMED:         'list.renamed',
  LIST_MOVED:           'list.moved',
  LIST_ARCHIVED:        'list.archived',
  COMMENT_ADDED:        'comment.added',
  MEMBER_ADDED:         'member.added',
  BOARD_CREATED:        'board.created',
  BOARD_UPDATED:        'board.updated',
  AUTOMATION_EXECUTED:  'automation.executed',
} as const;

export type ActionType = typeof Actions[keyof typeof Actions];

// ── logActivity ───────────────────────────────────────────────────────────────

export interface LogActivityParams {
  workspaceId: string;
  boardId?:    string;
  cardId?:     string;
  userId?:     string;
  action:      string;
  metadata?:   Prisma.InputJsonObject;
}

/**
 * Writes an ActivityLog record to the database.
 * Fire-and-forget safe — callers can await or not depending on criticality.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  await prisma.activityLog.create({
    data: {
      workspaceId: params.workspaceId,
      boardId:     params.boardId,
      cardId:      params.cardId,
      userId:      params.userId,
      action:      params.action,
      metadata:    params.metadata as Prisma.InputJsonObject | undefined,
    },
  });
}
