/**
 * Singleton Socket.io client for Wrkly frontend.
 *
 * Lazily created with the user's auth token.
 * Use connectSocket(token) after login and disconnectSocket() on logout.
 */

import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

// Module-level singleton — never re-created between re-renders
let _socket: Socket | null = null;

/**
 * Returns the current socket instance (may be disconnected).
 * Prefer `connectSocket` to ensure it's authenticated.
 */
export function getSocket(): Socket | null {
  return _socket;
}

/**
 * Creates (or reconnects) the socket with a fresh auth token.
 * Safe to call multiple times — tears down the previous socket first.
 */
export function connectSocket(token: string): Socket {
  if (_socket) {
    // Only reconnect if credentials changed or socket is closed
    if (_socket.connected && (_socket.auth as { token?: string })?.token === token) {
      return _socket;
    }
    _socket.disconnect();
    _socket = null;
  }

  _socket = io(WS_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  });

  return _socket;
}

/**
 * Disconnects and destroys the socket.
 * Call on logout or app unmount.
 */
export function disconnectSocket(): void {
  if (_socket) {
    _socket.disconnect();
    _socket = null;
  }
}

export type { Socket };
