'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import { getSocket } from '@/lib/socket';

// ── Board event payload types ─────────────────────────────────────────────────

interface CardCreatedPayload {
  card: Record<string, unknown>;
  listId: string;
}

interface CardUpdatedPayload {
  cardId: string;
  changes: Record<string, unknown>;
}

interface CardMovedPayload {
  cardId: string;
  fromListId: string;
  toListId: string;
  position: number;
}

interface CardArchivedPayload {
  cardId: string;
  listId: string;
}

interface CardLabelsChangedPayload {
  cardId: string;
  labels: Array<{ id: string; name: string; color: string }>;
}

interface CardAssigneesChangedPayload {
  cardId: string;
  assignees: Array<{ id: string; name: string; avatarUrl?: string }>;
}

interface ListCreatedPayload {
  list: Record<string, unknown>;
}

interface ListUpdatedPayload {
  listId: string;
  name: string;
}

interface ListMovedPayload {
  listId: string;
  position: number;
}

interface ListArchivedPayload {
  listId: string;
}

interface BlocksChangedPayload {
  cardId: string;
}

interface CommentCreatedPayload {
  cardId: string;
  comment: Record<string, unknown>;
}

// ── Cache helper types ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BoardCache = any;

/**
 * Listens for all real-time board events and applies optimistic cache updates
 * to the TanStack Query board cache so other clients see changes instantly.
 *
 * Must be used alongside useSocket(boardId) which handles room membership.
 */
export function useBoardRealtime(boardId: string) {
  const queryClient = useQueryClient();
  const boardKey = queryKeys.boards.detail(boardId);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !boardId) return;

    // ── card:created ────────────────────────────────────────────────────────
    const onCardCreated = ({ card, listId }: CardCreatedPayload) => {
      queryClient.setQueryData(boardKey, (old: BoardCache) => {
        if (!old?.board) return old;
        const board = structuredClone(old.board);
        const list = board.lists?.find((l: BoardCache) => l.id === listId);
        if (list) {
          list.cards = [...(list.cards ?? []), card];
          list.cards.sort((a: BoardCache, b: BoardCache) => a.position - b.position);
        }
        return { ...old, board };
      });
    };

    // ── card:updated ────────────────────────────────────────────────────────
    const onCardUpdated = ({ cardId, changes }: CardUpdatedPayload) => {
      queryClient.setQueryData(boardKey, (old: BoardCache) => {
        if (!old?.board) return old;
        const board = structuredClone(old.board);
        for (const list of board.lists ?? []) {
          const idx = list.cards?.findIndex((c: BoardCache) => c.id === cardId);
          if (idx !== undefined && idx > -1) {
            list.cards[idx] = { ...list.cards[idx], ...changes };
            break;
          }
        }
        return { ...old, board };
      });

      // Also invalidate the card detail cache
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(cardId) });
    };

    // ── card:moved ──────────────────────────────────────────────────────────
    const onCardMoved = ({ cardId, fromListId, toListId, position }: CardMovedPayload) => {
      queryClient.setQueryData(boardKey, (old: BoardCache) => {
        if (!old?.board) return old;
        const board = structuredClone(old.board);
        let movedCard: BoardCache = null;

        // Remove from source list
        for (const list of board.lists ?? []) {
          if (list.id === fromListId) {
            const idx = list.cards?.findIndex((c: BoardCache) => c.id === cardId);
            if (idx !== undefined && idx > -1) {
              movedCard = { ...list.cards[idx], listId: toListId, position };
              list.cards.splice(idx, 1);
              break;
            }
          }
        }

        // Insert into destination list
        if (movedCard) {
          const targetList = board.lists?.find((l: BoardCache) => l.id === toListId);
          if (targetList) {
            targetList.cards = [...(targetList.cards ?? []), movedCard];
            targetList.cards.sort((a: BoardCache, b: BoardCache) => a.position - b.position);
          }
        }

        return { ...old, board };
      });
    };

    // ── card:archived ───────────────────────────────────────────────────────
    const onCardArchived = ({ cardId, listId }: CardArchivedPayload) => {
      queryClient.setQueryData(boardKey, (old: BoardCache) => {
        if (!old?.board) return old;
        const board = structuredClone(old.board);
        const list = board.lists?.find((l: BoardCache) => l.id === listId);
        if (list) {
          list.cards = list.cards?.filter((c: BoardCache) => c.id !== cardId) ?? [];
        }
        return { ...old, board };
      });
    };

    // ── card:labels-changed ─────────────────────────────────────────────────
    const onLabelsChanged = ({ cardId, labels }: CardLabelsChangedPayload) => {
      queryClient.setQueryData(boardKey, (old: BoardCache) => {
        if (!old?.board) return old;
        const board = structuredClone(old.board);
        for (const list of board.lists ?? []) {
          const card = list.cards?.find((c: BoardCache) => c.id === cardId);
          if (card) { card.labels = labels; break; }
        }
        return { ...old, board };
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(cardId) });
    };

    // ── card:assignees-changed ──────────────────────────────────────────────
    const onAssigneesChanged = ({ cardId, assignees }: CardAssigneesChangedPayload) => {
      queryClient.setQueryData(boardKey, (old: BoardCache) => {
        if (!old?.board) return old;
        const board = structuredClone(old.board);
        for (const list of board.lists ?? []) {
          const card = list.cards?.find((c: BoardCache) => c.id === cardId);
          if (card) { card.assignees = assignees; break; }
        }
        return { ...old, board };
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(cardId) });
    };

    // ── card:blocks-changed ─────────────────────────────────────────────────
    const onBlocksChanged = ({ cardId }: BlocksChangedPayload) => {
      // Blocks live in the card detail query, not the board cache
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(cardId) });
    };

    // ── list:created ────────────────────────────────────────────────────────
    const onListCreated = ({ list }: ListCreatedPayload) => {
      queryClient.setQueryData(boardKey, (old: BoardCache) => {
        if (!old?.board) return old;
        const board = structuredClone(old.board);
        board.lists = [...(board.lists ?? []), { ...list, cards: [] }];
        board.lists.sort((a: BoardCache, b: BoardCache) => a.position - b.position);
        return { ...old, board };
      });
    };

    // ── list:updated ────────────────────────────────────────────────────────
    const onListUpdated = ({ listId, name }: ListUpdatedPayload) => {
      queryClient.setQueryData(boardKey, (old: BoardCache) => {
        if (!old?.board) return old;
        const board = structuredClone(old.board);
        const list = board.lists?.find((l: BoardCache) => l.id === listId);
        if (list) list.name = name;
        return { ...old, board };
      });
    };

    // ── list:moved ──────────────────────────────────────────────────────────
    const onListMoved = ({ listId, position }: ListMovedPayload) => {
      queryClient.setQueryData(boardKey, (old: BoardCache) => {
        if (!old?.board) return old;
        const board = structuredClone(old.board);
        const list = board.lists?.find((l: BoardCache) => l.id === listId);
        if (list) {
          list.position = position;
          board.lists.sort((a: BoardCache, b: BoardCache) => a.position - b.position);
        }
        return { ...old, board };
      });
    };

    // ── list:archived ───────────────────────────────────────────────────────
    const onListArchived = ({ listId }: ListArchivedPayload) => {
      queryClient.setQueryData(boardKey, (old: BoardCache) => {
        if (!old?.board) return old;
        const board = structuredClone(old.board);
        board.lists = board.lists?.filter((l: BoardCache) => l.id !== listId) ?? [];
        return { ...old, board };
      });
    };

    // ── comment:created ─────────────────────────────────────────────────────
    const onCommentCreated = ({ cardId }: CommentCreatedPayload) => {
      // Comments live in card detail — just invalidate
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(cardId) });
    };

    // ── Register all listeners ──────────────────────────────────────────────
    socket.on('card:created', onCardCreated);
    socket.on('card:updated', onCardUpdated);
    socket.on('card:moved', onCardMoved);
    socket.on('card:archived', onCardArchived);
    socket.on('card:labels-changed', onLabelsChanged);
    socket.on('card:assignees-changed', onAssigneesChanged);
    socket.on('card:blocks-changed', onBlocksChanged);
    socket.on('list:created', onListCreated);
    socket.on('list:updated', onListUpdated);
    socket.on('list:moved', onListMoved);
    socket.on('list:archived', onListArchived);
    socket.on('comment:created', onCommentCreated);

    // ── Reconnect: refetch board to reconcile any missed events ────────────
    const onReconnect = () => {
      queryClient.invalidateQueries({ queryKey: boardKey });
    };
    socket.on('connect', onReconnect);

    // ── Cleanup: remove ALL listeners on unmount ────────────────────────────
    return () => {
      socket.off('card:created', onCardCreated);
      socket.off('card:updated', onCardUpdated);
      socket.off('card:moved', onCardMoved);
      socket.off('card:archived', onCardArchived);
      socket.off('card:labels-changed', onLabelsChanged);
      socket.off('card:assignees-changed', onAssigneesChanged);
      socket.off('card:blocks-changed', onBlocksChanged);
      socket.off('list:created', onListCreated);
      socket.off('list:updated', onListUpdated);
      socket.off('list:moved', onListMoved);
      socket.off('list:archived', onListArchived);
      socket.off('comment:created', onCommentCreated);
      socket.off('connect', onReconnect);
    };
  }, [boardId, boardKey, queryClient]);
}
