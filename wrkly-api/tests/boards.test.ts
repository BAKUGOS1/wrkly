import { describe, it, expect } from 'vitest';
import { inject, createTestUser, auth } from './setup';
import prisma from '../src/lib/prisma';

// ── shared helpers ─────────────────────────────────────────────────────────────

async function setupOwnerAndWorkspace() {
  const owner = await createTestUser();
  const wsRes = await inject({
    method:  'POST',
    url:     '/api/workspaces',
    payload: { name: 'Board Test WS' },
    ...auth(owner.token),
  });
  const workspace = wsRes.json().workspace as { id: string };
  return { owner, workspace };
}

async function createBoard(token: string, workspaceId: string, name = 'My Board') {
  const res = await inject({
    method:  'POST',
    url:     `/api/workspaces/${workspaceId}/boards`,
    payload: { name },
    ...auth(token),
  });
  expect(res.statusCode).toBe(201);
  return res.json().board as { id: string; name: string };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Boards — POST /api/workspaces/:id/boards', () => {
  it('creates board → 201 + default list auto-created', async () => {
    const { owner, workspace } = await setupOwnerAndWorkspace();

    const res = await inject({
      method:  'POST',
      url:     `/api/workspaces/${workspace.id}/boards`,
      payload: { name: 'Sprint Board' },
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().board.name).toBe('Sprint Board');

    const lists = await prisma.list.findMany({
      where: { boardId: res.json().board.id },
    });
    expect(lists.length).toBeGreaterThanOrEqual(1);
  });

  it('non-member cannot create board → 403', async () => {
    const { workspace } = await setupOwnerAndWorkspace();
    const outside       = await createTestUser();

    const res = await inject({
      method:  'POST',
      url:     `/api/workspaces/${workspace.id}/boards`,
      payload: { name: 'Blocked Board' },
      ...auth(outside.token),
    });
    expect(res.statusCode).toBe(403);
  });
});

describe('Boards — GET /api/boards/:id', () => {
  it('returns full board with lists, labels, and members', async () => {
    const { owner, workspace } = await setupOwnerAndWorkspace();
    const board = await createBoard(owner.token, workspace.id);

    const res = await inject({
      method: 'GET',
      url:    `/api/boards/${board.id}`,
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json().board;
    expect(body.id).toBe(board.id);
    expect(Array.isArray(body.lists)).toBe(true);
    expect(Array.isArray(body.labels)).toBe(true);
    expect(Array.isArray(body.members)).toBe(true);
  });

  it('unknown board → 404', async () => {
    const { owner } = await setupOwnerAndWorkspace();
    const res = await inject({
      method: 'GET',
      url:    '/api/boards/non-existent-id',
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('Boards — PATCH /api/boards/:id', () => {
  it('updates board name → 200', async () => {
    const { owner, workspace } = await setupOwnerAndWorkspace();
    const board = await createBoard(owner.token, workspace.id);

    const res = await inject({
      method:  'PATCH',
      url:     `/api/boards/${board.id}`,
      payload: { name: 'Renamed Board' },
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().board.name).toBe('Renamed Board');
  });
});

describe('Boards — DELETE /api/boards/:id', () => {
  it('archives board → 204', async () => {
    const { owner, workspace } = await setupOwnerAndWorkspace();
    const board = await createBoard(owner.token, workspace.id);

    const res = await inject({
      method: 'DELETE',
      url:    `/api/boards/${board.id}`,
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(204);

    const archived = await prisma.board.findUnique({ where: { id: board.id } });
    expect(archived?.isArchived).toBe(true);
  });
});
