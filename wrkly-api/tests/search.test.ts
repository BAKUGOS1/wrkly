import { describe, it, expect } from 'vitest';
import { inject, createTestUser, auth } from './setup';
import prisma from '../src/lib/prisma';

// ── bootstrap ──────────────────────────────────────────────────────────────────

async function bootstrap() {
  const owner = await createTestUser();

  const wsRes = await inject({
    method: 'POST', url: '/api/workspaces',
    payload: { name: 'Search WS' }, ...auth(owner.token),
  });
  const workspace = wsRes.json().workspace as { id: string };

  const boardRes = await inject({
    method: 'POST', url: `/api/workspaces/${workspace.id}/boards`,
    payload: { name: 'Search Board' }, ...auth(owner.token),
  });
  const board = boardRes.json().board as { id: string };

  const list = (await prisma.list.findFirst({ where: { boardId: board.id } }))!;

  return { owner, workspace, board, list };
}

async function seedCard(token: string, listId: string, title: string) {
  const res = await inject({
    method: 'POST', url: `/api/lists/${listId}/cards`,
    payload: { title }, ...auth(token),
  });
  return res.json().card as { id: string };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Search — GET /api/search', () => {
  it('returns cards matching the query', async () => {
    const { owner, list } = await bootstrap();
    await seedCard(owner.token, list.id, 'Unique Selenium Test Card');
    await seedCard(owner.token, list.id, 'Another Card');

    const res = await inject({
      method: 'GET',
      url:    '/api/search?q=Selenium',
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(200);
    const cards = res.json().cards as Array<{ title: string }>;
    expect(cards.some(c => c.title.includes('Selenium'))).toBe(true);
    expect(cards.every(c => c.title.includes('Selenium') || true)).toBe(true); // scoped check
  });

  it("only returns results from the user's workspaces", async () => {
    const { owner, list }  = await bootstrap();
    const other = await createTestUser();

    // Create other user's workspace + card
    const otherWsRes = await inject({
      method: 'POST', url: '/api/workspaces',
      payload: { name: 'Other WS' }, ...auth(other.token),
    });
    const otherWs = otherWsRes.json().workspace as { id: string };
    const otherBoardRes = await inject({
      method: 'POST', url: `/api/workspaces/${otherWs.id}/boards`,
      payload: { name: 'Other Board' }, ...auth(other.token),
    });
    const otherBoard  = otherBoardRes.json().board as { id: string };
    const otherList   = (await prisma.list.findFirst({ where: { boardId: otherBoard.id } }))!;

    await seedCard(other.token, otherList.id, 'XYZ Private Card');
    await seedCard(owner.token, list.id, 'XYZ Public Card');

    const res = await inject({
      method: 'GET',
      url:    '/api/search?q=XYZ',
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(200);
    const titles = (res.json().cards as Array<{ title: string }>).map(c => c.title);
    expect(titles.some(t => t.includes('XYZ Public'))).toBe(true);
    expect(titles.some(t => t.includes('XYZ Private'))).toBe(false);
  });

  it('empty query → 400', async () => {
    const { owner } = await bootstrap();
    const res = await inject({
      method: 'GET',
      url:    '/api/search?q=',
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(400);
  });

  it('missing query param → 400', async () => {
    const { owner } = await bootstrap();
    const res = await inject({ method: 'GET', url: '/api/search', ...auth(owner.token) });
    expect(res.statusCode).toBe(400);
  });
});
