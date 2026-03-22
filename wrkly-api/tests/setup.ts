/**
 * tests/setup.ts
 * ──────────────────────────────────────────────────────────
 * Shared test infrastructure:
 *  - Builds and starts a Fastify app instance (no network)
 *  - Provides createTestUser() + authHeader() helpers
 *  - Wraps every test in a transaction rollback so each test
 *    starts with a clean slate without nuking the DB.
 *
 * NOTE: We mock heavy side-effects (BullMQ, Socket.io, Redis)
 * so tests never require external services.
 */

import { vi, beforeAll, afterAll, beforeEach } from 'vitest';
import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import { registerRoutes } from '../src/routes';
import { errorHandler } from '../src/lib/error-handler';
import prisma from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';
import type { FastifyInstance, InjectOptions } from 'fastify';

// ── Mock side-effects that need Redis / Socket.io ─────────────────────────

vi.mock('../src/lib/realtime', () => ({
  cardEvents: {
    created:         vi.fn(),
    updated:         vi.fn(),
    moved:           vi.fn(),
    archived:        vi.fn(),
    labelsChanged:   vi.fn(),
    assigneesChanged: vi.fn(),
    blocksChanged:   vi.fn(),
  },
}));

vi.mock('../src/lib/automation-events', () => ({
  triggerAutomation: vi.fn(),
}));

vi.mock('../src/services/notifications', () => ({
  createNotification:       vi.fn(),
  notifyBoardMembers:       vi.fn(),
  createReminderNotification: vi.fn(),
}));

vi.mock('../src/jobs', () => ({
  initializeJobs: vi.fn(),
}));

// ── App factory ───────────────────────────────────────────────────────────

let _app: FastifyInstance;

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });

  app.register(fastifyCors, { origin: '*' });
  app.register(fastifyCookie);
  app.register(fastifyJwt, { secret: 'test-secret' });
  app.setErrorHandler(errorHandler);
  registerRoutes(app);

  await app.ready();
  return app;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────

beforeAll(async () => {
  _app = await buildApp();
});

afterAll(async () => {
  await _app.close();
  await prisma.$disconnect();
});

// Clean up created test data after each test via delete cascade
// Simpler and more reliable than transactions for Fastify inject tests.
beforeEach(async () => {
  // Delete in reverse dependency order so FK constraints don't fire
  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.cardAssignee.deleteMany();
  await prisma.cardLabel.deleteMany();
  await prisma.block.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.card.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.list.deleteMany();
  await prisma.label.deleteMany();
  await prisma.board.deleteMany();
  await prisma.workspaceMember.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();
});

// ── Exported helpers ──────────────────────────────────────────────────────

export function getApp(): FastifyInstance {
  return _app;
}

export interface TestUser {
  id:    string;
  email: string;
  name:  string;
  token: string;
}

/** Creates a unique user in the DB and returns their JWT. */
export async function createTestUser(
  overrides: Partial<{ email: string; name: string; password: string }> = {}
): Promise<TestUser> {
  const email    = overrides.email    ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@wrkly.test`;
  const name     = overrides.name     ?? 'Test User';
  const password = overrides.password ?? 'password123';

  const user = await prisma.user.create({
    data: { email, name, passwordHash: await hashPassword(password) },
    select: { id: true, email: true, name: true },
  });

  const token = _app.jwt.sign({ userId: user.id }, { expiresIn: '1h' });
  return { ...user, token };
}

/** Returns inject options with Authorization header pre-filled. */
export function auth(token: string): Pick<InjectOptions, 'headers'> {
  return { headers: { authorization: `Bearer ${token}` } };
}

/** Fire a request against the app without a real network. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function inject(opts: InjectOptions): Promise<any> {
  return _app.inject(opts);
}
