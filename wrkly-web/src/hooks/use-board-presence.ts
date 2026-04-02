'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSocket } from './use-socket';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth-store';

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PresenceUser {
  userId: string;
  name: string;
  avatarUrl?: string | null;
}

export interface CursorPosition {
  userId: string;
  name: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  color: string;
}

// ── Stable colors per user ────────────────────────────────────────────────────
const CURSOR_COLORS = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
];

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useBoardPresence(boardId: string) {
  const { isConnected } = useSocket(boardId);
  const currentUser = useAuthStore((s) => s.user);

  const [onlineUsers, setOnlineUsers]   = useState<PresenceUser[]>([]);
  const [cursors, setCursors]           = useState<CursorPosition[]>([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !boardId) return;

    // Receive full user list on join
    const onBoardUsers = (users: PresenceUser[]) => {
      setOnlineUsers(users.filter((u) => u.userId !== currentUser?.id));
    };

    // Someone joined
    const onUserJoined = (user: PresenceUser) => {
      if (user.userId === currentUser?.id) return;
      setOnlineUsers((prev) => {
        if (prev.some((u) => u.userId === user.userId)) return prev;
        return [...prev, user];
      });
    };

    // Someone left
    const onUserLeft = ({ userId }: { userId: string }) => {
      setOnlineUsers((prev) => prev.filter((u) => u.userId !== userId));
      setCursors((prev) => prev.filter((c) => c.userId !== userId));
    };

    // Cursor moved
    const onCursorMove = ({ userId, name, x, y }: { userId: string; name: string; x: number; y: number }) => {
      if (userId === currentUser?.id) return;
      setCursors((prev) => {
        const existing = prev.find((c) => c.userId === userId);
        const color = getColorForUser(userId);
        if (existing) {
          return prev.map((c) => c.userId === userId ? { ...c, x, y } : c);
        }
        return [...prev, { userId, name, x, y, color }];
      });
    };

    socket.on('board:users',   onBoardUsers);
    socket.on('user:joined',   onUserJoined);
    socket.on('user:left',     onUserLeft);
    socket.on('cursor:move',   onCursorMove);

    return () => {
      socket.off('board:users',  onBoardUsers);
      socket.off('user:joined',  onUserJoined);
      socket.off('user:left',    onUserLeft);
      socket.off('cursor:move',  onCursorMove);
    };
  }, [boardId, currentUser?.id]);

  // Broadcast cursor position
  const broadcastCursor = useCallback((x: number, y: number) => {
    const socket = getSocket();
    if (!socket || !currentUser) return;
    socket.emit('cursor:move', {
      boardId,
      name: currentUser.name,
      x,
      y,
    });
  }, [boardId, currentUser]);

  return {
    isConnected,
    onlineUsers,
    cursors,
    broadcastCursor,
    getColorForUser,
  };
}
