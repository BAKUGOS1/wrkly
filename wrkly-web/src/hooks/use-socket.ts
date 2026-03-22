'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket';

/**
 * Manages the Socket.io connection lifecycle and board room membership.
 *
 * - Connects with the user's auth token on mount (if authenticated)
 * - Joins `board:{boardId}` room when boardId is provided
 * - Leaves previous board room when boardId changes
 * - Leaves the board room on unmount
 * - Reconnects to the board room after a socket reconnection
 */
export function useSocket(boardId?: string) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const [isConnected, setIsConnected] = useState(false);

  // Track the currently joined boardId so we can leave it when it changes
  const currentBoardRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!token) return;

    const socket = connectSocket(token);

    // ── Connection state ────────────────────────────────────────────────────

    const onConnect = () => {
      setIsConnected(true);

      // Re-join board room after reconnect — include presence profile
      if (currentBoardRef.current) {
        socket.emit('join-board', {
          boardId: currentBoardRef.current,
          name: user?.name ?? 'Unknown',
          avatarUrl: user?.avatarUrl ?? undefined,
        });
      }
    };

    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Update state if already connected (socket reused from previous mount)
    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, [token, user]);

  // ── Board room join/leave ────────────────────────────────────────────────

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Leave old room if boardId changed
    if (currentBoardRef.current && currentBoardRef.current !== boardId) {
      socket.emit('leave-board', { boardId: currentBoardRef.current });
    }

    if (boardId) {
      socket.emit('join-board', {
        boardId,
        name: user?.name ?? 'Unknown',
        avatarUrl: user?.avatarUrl ?? undefined,
      });
      currentBoardRef.current = boardId;
    } else {
      currentBoardRef.current = undefined;
    }

    return () => {
      // Leave room on unmount
      if (currentBoardRef.current) {
        socket?.emit('leave-board', { boardId: currentBoardRef.current });
        currentBoardRef.current = undefined;
      }
    };
  }, [boardId]);

  return { isConnected };
}

/**
 * Disconnects the socket on logout.
 * Call this in your auth logout handler or in a component that watches auth state.
 */
export function useSocketCleanup() {
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    // When token becomes null (logout), disconnect
    if (!token) {
      disconnectSocket();
    }
  }, [token]);
}
