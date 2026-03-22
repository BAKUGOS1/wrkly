import { getIO } from './socket';

// ── Realtime event service ────────────────────────────────────────────────────
//
// All real-time events flow through this module so event naming is consistent
// and the board-room broadcast logic stays in one place.
//
// Route handlers call emitBoardEvent() after a successful DB mutation. They
// pass excludeUserId (the requester's userId) so the triggering client — which
// already has the optimistic update applied — is skipped.
// ---------------------------------------------------------------------------

/**
 * Broadcast an event to every socket in `board:{boardId}` except the user
 * who performed the action (they already have an optimistic update).
 */
export function emitBoardEvent(
  boardId: string,
  event: string,
  data: object,
  excludeUserId?: string
): void {
  try {
    const io = getIO();
    const room = `board:${boardId}`;

    if (excludeUserId) {
      // Emit to all sockets in the room whose userId ≠ excludeUserId
      io.to(room).except(`user:${excludeUserId}`).emit(event, data);
    } else {
      io.to(room).emit(event, data);
    }
  } catch {
    // Socket.io not yet initialised (e.g. during integration tests) — fail silently.
  }
}

// ── Typed helpers for each domain ────────────────────────────────────────────
// Use these in route handlers for full type safety on the event payload.

// ── Cards ─────────────────────────────────────────────────────────────────────

export const cardEvents = {
  created: (boardId: string, payload: { card: object; listId: string }, userId?: string) =>
    emitBoardEvent(boardId, 'card:created', payload, userId),

  updated: (boardId: string, payload: { cardId: string; changes: object }, userId?: string) =>
    emitBoardEvent(boardId, 'card:updated', payload, userId),

  moved: (
    boardId: string,
    payload: { cardId: string; fromListId: string; toListId: string; position: number },
    userId?: string
  ) => emitBoardEvent(boardId, 'card:moved', payload, userId),

  archived: (boardId: string, payload: { cardId: string; listId: string }, userId?: string) =>
    emitBoardEvent(boardId, 'card:archived', payload, userId),

  labelsChanged: (boardId: string, payload: { cardId: string; labels: object[] }, userId?: string) =>
    emitBoardEvent(boardId, 'card:labels-changed', payload, userId),

  assigneesChanged: (boardId: string, payload: { cardId: string; assignees: object[] }, userId?: string) =>
    emitBoardEvent(boardId, 'card:assignees-changed', payload, userId),

  blocksChanged: (boardId: string, payload: { cardId: string }, userId?: string) =>
    emitBoardEvent(boardId, 'card:blocks-changed', payload, userId),
};

// ── Lists ─────────────────────────────────────────────────────────────────────

export const listEvents = {
  created: (boardId: string, payload: { list: object }, userId?: string) =>
    emitBoardEvent(boardId, 'list:created', payload, userId),

  updated: (boardId: string, payload: { listId: string; name: string }, userId?: string) =>
    emitBoardEvent(boardId, 'list:updated', payload, userId),

  moved: (boardId: string, payload: { listId: string; position: number }, userId?: string) =>
    emitBoardEvent(boardId, 'list:moved', payload, userId),

  archived: (boardId: string, payload: { listId: string }, userId?: string) =>
    emitBoardEvent(boardId, 'list:archived', payload, userId),
};

// ── Comments ──────────────────────────────────────────────────────────────────

export const commentEvents = {
  created: (boardId: string, payload: { cardId: string; comment: object }, userId?: string) =>
    emitBoardEvent(boardId, 'comment:created', payload, userId),
};
