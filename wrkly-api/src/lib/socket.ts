import { Server, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import type { FastifyInstance } from 'fastify';
import prisma from './prisma';

// ── Redis clients for pub/sub ─────────────────────────────────────────────────
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';

const pubClient = new Redis(redisUrl, { maxRetriesPerRequest: null, enableReadyCheck: false });
const subClient = pubClient.duplicate();

pubClient.on('error', (err) => console.error('[socket] Redis pub error:', err));
subClient.on('error', (err) => console.error('[socket] Redis sub error:', err));

// ── Socket.io instance (bound in initSocket) ──────────────────────────────────
let io: Server;

// ── Extended socket data typing ───────────────────────────────────────────────
interface SocketData {
  userId: string;
}

// ── Presence types ────────────────────────────────────────────────────────────

export interface PresenceUser {
  userId: string;
  name: string;
  avatarUrl?: string;
}

interface PresenceEntry extends PresenceUser {
  /** All socket IDs for this user in this board room (multi-tab support) */
  socketIds: Set<string>;
}

/**
 * In-process presence store.
 * boardPresence[boardId][userId] = PresenceEntry
 *
 * NOTE: This works on a single process. For multi-process deployments,
 * presence state should instead be stored in Redis with TTL-based heartbeats.
 */
const boardPresence = new Map<string, Map<string, PresenceEntry>>();

// ── Presence helpers ──────────────────────────────────────────────────────────

function addPresence(
  boardId: string,
  socketId: string,
  user: PresenceUser
): void {
  if (!boardPresence.has(boardId)) {
    boardPresence.set(boardId, new Map());
  }
  const room = boardPresence.get(boardId)!;
  const existing = room.get(user.userId);
  if (existing) {
    existing.socketIds.add(socketId);
  } else {
    room.set(user.userId, { ...user, socketIds: new Set([socketId]) });
  }
}

/**
 * Remove a socket from a board room's presence.
 * Returns true if the user's last socket was removed (they fully left).
 */
function removePresence(boardId: string, socketId: string, userId: string): boolean {
  const room = boardPresence.get(boardId);
  if (!room) return false;
  const entry = room.get(userId);
  if (!entry) return false;

  entry.socketIds.delete(socketId);
  if (entry.socketIds.size === 0) {
    room.delete(userId);
    if (room.size === 0) boardPresence.delete(boardId);
    return true; // last tab closed
  }
  return false; // user still has other tabs open
}

function getBoardUsers(boardId: string): PresenceUser[] {
  const room = boardPresence.get(boardId);
  if (!room) return [];
  return Array.from(room.values()).map(({ userId, name, avatarUrl }) => ({
    userId,
    name,
    avatarUrl,
  }));
}

// ── Initializer ───────────────────────────────────────────────────────────────

export function initSocket(fastify: FastifyInstance): Server {
  const frontendUrl = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

  io = new Server(fastify.server, {
    cors: {
      origin: frontendUrl,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Attach Redis adapter for horizontal scaling
  io.adapter(createAdapter(pubClient, subClient));

  // ── JWT authentication middleware ─────────────────────────────────────────
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret && process.env.NODE_ENV === 'production') {
        return next(new Error('JWT_SECRET is required'));
      }
      const signingKey = secret ?? 'dev-secret-change-in-production';
      const decoded = jwt.verify(token, signingKey) as { userId: string };

      if (!decoded?.userId) {
        return next(new Error('Invalid token payload'));
      }

      (socket.data as SocketData).userId = decoded.userId;
      return next();
    } catch {
      return next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const userId = (socket.data as SocketData).userId;
    fastify.log.info(`[socket] Connected: ${socket.id} (user: ${userId})`);

    // Auto-join user's private room for direct notifications
    socket.join(`user:${userId}`);

    // Track which boards this socket has joined (for presence cleanup on disconnect)
    const joinedBoards = new Set<string>();

    // ── Board room management + presence ───────────────────────────────────

    socket.on(
      'join-board',
      async ({ boardId, name, avatarUrl }: { boardId: string; name: string; avatarUrl?: string }) => {
        if (!boardId) return;

        // Verify the user is a member of the board's workspace
        try {
          const board = await prisma.board.findUnique({
            where: { id: boardId },
            select: { workspaceId: true },
          });
          if (!board) return;
          const member = await prisma.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: board.workspaceId, userId } },
          });
          if (!member) {
            fastify.log.warn(`[socket] ${userId} denied join to board:${boardId} — not a member`);
            return;
          }
        } catch (err) {
          fastify.log.error(`[socket] Error checking board membership: ${err instanceof Error ? err.message : String(err)}`);
          return;
        }

        socket.join(`board:${boardId}`);
        joinedBoards.add(boardId);
        fastify.log.info(`[socket] ${userId} joined board:${boardId}`);

        const user: PresenceUser = { userId, name: name ?? userId, avatarUrl };

        const wasAlreadyPresent = boardPresence.get(boardId)?.has(userId) ?? false;
        addPresence(boardId, socket.id, user);

        // Send current user list only to the joining socket
        socket.emit('board:users', getBoardUsers(boardId));

        // Broadcast to all OTHER sockets in the room (only if this is the user's first tab)
        if (!wasAlreadyPresent) {
          socket.to(`board:${boardId}`).emit('user:joined', { userId, name: user.name, avatarUrl });
        }
      }
    );

    socket.on('leave-board', ({ boardId }: { boardId: string }) => {
      if (!boardId) return;
      socket.leave(`board:${boardId}`);
      joinedBoards.delete(boardId);
      fastify.log.info(`[socket] ${userId} left board:${boardId}`);

      const fullyLeft = removePresence(boardId, socket.id, userId);
      if (fullyLeft) {
        // Only notify others when user's last tab disconnects
        socket.to(`board:${boardId}`).emit('user:left', { userId });
      }
    });

    // ── Disconnect ──────────────────────────────────────────────────────────

    socket.on('disconnect', (reason) => {
      fastify.log.info(`[socket] Disconnected: ${socket.id} (reason: ${reason})`);

      // Clean up presence for all boards this socket was in
      for (const boardId of joinedBoards) {
        const fullyLeft = removePresence(boardId, socket.id, userId);
        if (fullyLeft && io) {
          io.to(`board:${boardId}`).emit('user:left', { userId });
        }
      }
      joinedBoards.clear();
    });

    socket.on('error', (err) => {
      fastify.log.error(`[socket] Error on ${socket.id}: ${err.message}`);
    });
  });

  // ── Stale presence sweep (every 5 minutes) ────────────────────────────────
  const sweepInterval = setInterval(() => {
    for (const [boardId, users] of boardPresence) {
      for (const [uId, entry] of users) {
        for (const sid of entry.socketIds) {
          if (!io.sockets.sockets.has(sid)) {
            entry.socketIds.delete(sid);
          }
        }
        if (entry.socketIds.size === 0) {
          users.delete(uId);
          io.to(`board:${boardId}`).emit('user:left', { userId: uId });
        }
      }
      if (users.size === 0) boardPresence.delete(boardId);
    }
  }, 5 * 60 * 1000);

  // Cleanup interval on process exit
  process.on('beforeExit', () => clearInterval(sweepInterval));

  fastify.log.info('[socket] Socket.io server ready');
  return io;
}

// ── Broadcast helpers ─────────────────────────────────────────────────────────

/**
 * Broadcast an event to all sockets in a board room.
 * Call from route handlers after successful mutations.
 */
export function broadcastToBoard(
  boardId: string,
  event: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
): void {
  if (!io) {
    console.warn('[socket] broadcastToBoard called before initSocket');
    return;
  }
  io.to(`board:${boardId}`).emit(event, data);
}

/**
 * Broadcast an event to a specific user (all their connected sockets).
 */
export function broadcastToUser(
  userId: string,
  event: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
): void {
  if (!io) {
    console.warn('[socket] broadcastToUser called before initSocket');
    return;
  }
  io.to(`user:${userId}`).emit(event, data);
}

/** Get the raw io instance (for advanced usage) */
export function getIO(): Server {
  if (!io) throw new Error('Socket.io not initialized — call initSocket first');
  return io;
}
