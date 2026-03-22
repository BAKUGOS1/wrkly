'use client';

import { useEffect, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OnlineUser {
  userId: string;
  name: string;
  avatarUrl?: string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Tracks real-time user presence for a board room.
 *
 * Listens to three socket events:
 *   - "board:users"  → initial user list sent by the server on join
 *   - "user:joined"  → another user joined the board room
 *   - "user:left"    → another user fully left the board room (last tab closed)
 *
 * Multi-tab safety: the server only emits "user:joined" / "user:left" when
 * a user's FIRST or LAST socket joins/leaves a room, so deduplication is
 * handled at the source.
 *
 * @param boardId  The board whose presence to track. Pass undefined to disable.
 */
export function useOnlineUsers(boardId: string | undefined): {
  onlineUsers: OnlineUser[];
} {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  const handleBoardUsers = useCallback((users: OnlineUser[]) => {
    setOnlineUsers(users);
  }, []);

  const handleUserJoined = useCallback((user: OnlineUser) => {
    setOnlineUsers((prev) => {
      // Guard against duplicate entries (shouldn't happen but be safe)
      if (prev.some((u) => u.userId === user.userId)) return prev;
      return [...prev, user];
    });
  }, []);

  const handleUserLeft = useCallback(({ userId }: { userId: string }) => {
    setOnlineUsers((prev) => prev.filter((u) => u.userId !== userId));
  }, []);

  useEffect(() => {
    if (!boardId) {
      setOnlineUsers([]);
      return;
    }

    const socket = getSocket();
    if (!socket) return;

    socket.on('board:users', handleBoardUsers);
    socket.on('user:joined', handleUserJoined);
    socket.on('user:left', handleUserLeft);

    return () => {
      socket.off('board:users', handleBoardUsers);
      socket.off('user:joined', handleUserJoined);
      socket.off('user:left', handleUserLeft);
      // Clear presence when we stop watching
      setOnlineUsers([]);
    };
  }, [boardId, handleBoardUsers, handleUserJoined, handleUserLeft]);

  return { onlineUsers };
}
