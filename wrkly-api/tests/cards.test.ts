import { describe, it, expect } from 'vitest';
import { inject, createTestUser, auth } from './setup';
import prisma from '../src/lib/prisma';

// ── shared bootstrap ───────────────────────────────────────────────────────────

async function bootstrap() {
  const owner = await createTestUser();

  const wsRes = await inject({
    method: 'POST', url: '/api/workspaces',
    payload: { name: 'Cards WS' }, ...auth(owner.token),
  });
  const workspace = wsRes.json().workspace as { id: string };

  const boardRes = await inject({
    method: 'POST', url: `/api/workspaces/${workspace.id}/boards`,
    payload: { name: 'Cards Board' }, ...auth(owner.token),
  });
  const board = boardRes.json().board as { id: string };

  // Pick the auto-created default list
  const lists = await prisma.list.findMany({ where: { boardId: board.id } });
  const list  = lists[0];

  return { owner, workspace, board, list };
}

async function createCard(token: string, listId: string, title = 'My Card') {
  const res = await inject({
    method: 'POST', url: `/api/lists/${listId}/cards`,
    payload: { title }, ...auth(token),
  });
  expect(res.statusCode).toBe(201);
  return res.json().card as { id: string; title: string; position: number };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Cards — POST /api/lists/:listId/cards', () => {
  it('creates card → 201 with position ≥ 1', async () => {
    const { owner, list } = await bootstrap();

    const res = await inject({
      method: 'POST', url: `/api/lists/${list.id}/cards`,
      payload: { title: 'First Card' }, ...auth(owner.token),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().card.position).toBeGreaterThanOrEqual(1);
  });

  it('sequentially created cards have incrementing positions', async () => {
    const { owner, list } = await bootstrap();
    const c1 = await createCard(owner.token, list.id, 'Card 1');
    const c2 = await createCard(owner.token, list.id, 'Card 2');
    expect(c2.position).toBeGreaterThan(c1.position);
  });
});

describe('Cards — PATCH /api/cards/:id/move', () => {
  it('moves card to another list → card.listId updated', async () => {
    const { owner, board, list } = await bootstrap();

    // Create a second list
    const list2Res = await inject({
      method: 'POST', url: `/api/boards/${board.id}/lists`,
      payload: { name: 'List 2' }, ...auth(owner.token),
    });
    const list2 = list2Res.json().list as { id: string };

    const card = await createCard(owner.token, list.id);

    const res = await inject({
      method: 'PATCH', url: `/api/cards/${card.id}/move`,
      payload: { listId: list2.id, position: 1 }, ...auth(owner.token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().card.listId).toBe(list2.id);
  });
});

describe('Cards — Labels', () => {
  it('adds label to card → 201 + card-label relation exists', async () => {
    const { owner, board, list } = await bootstrap();

    // Create a board label
    const labelRes = await inject({
      method: 'POST', url: `/api/boards/${board.id}/labels`,
      payload: { name: 'Bug', color: '#FF0000' }, ...auth(owner.token),
    });
    const label = labelRes.json().label as { id: string };

    const card = await createCard(owner.token, list.id);

    const res = await inject({
      method: 'POST', url: `/api/cards/${card.id}/labels`,
      payload: { labelId: label.id }, ...auth(owner.token),
    });
    expect(res.statusCode).toBe(201);

    const rel = await prisma.cardLabel.findFirst({
      where: { cardId: card.id, labelId: label.id },
    });
    expect(rel).not.toBeNull();
  });
});

describe('Cards — Assignees', () => {
  it('assigns workspace member to card → 201 + relation exists', async () => {
    const { owner, workspace, list } = await bootstrap();
    const guest = await createTestUser();

    // Invite guest to workspace
    await inject({
      method: 'POST', url: `/api/workspaces/${workspace.id}/members`,
      payload: { email: guest.email, role: 'MEMBER' }, ...auth(owner.token),
    });

    const card = await createCard(owner.token, list.id);

    const res = await inject({
      method: 'POST', url: `/api/cards/${card.id}/assignees`,
      payload: { userId: guest.id }, ...auth(owner.token),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().assignee.id).toBe(guest.id);
  });

  it('cannot assign non-member → 400', async () => {
    const { owner, list } = await bootstrap();
    const outsider = await createTestUser();
    const card     = await createCard(owner.token, list.id);

    const res = await inject({
      method: 'POST', url: `/api/cards/${card.id}/assignees`,
      payload: { userId: outsider.id }, ...auth(owner.token),
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('Cards — GET /api/cards/:id (detail)', () => {
  it('returns card with blocks, comments, labels, assignees', async () => {
    const { owner, list } = await bootstrap();
    const card = await createCard(owner.token, list.id);

    const res = await inject({
      method: 'GET', url: `/api/cards/${card.id}`, ...auth(owner.token),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json().card;
    expect(Array.isArray(body.blocks)).toBe(true);
    expect(Array.isArray(body.comments)).toBe(true);
    expect(Array.isArray(body.labels)).toBe(true);
    expect(Array.isArray(body.assignees)).toBe(true);
  });
});
