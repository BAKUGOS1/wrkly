import { describe, it, expect } from 'vitest';
import { inject, createTestUser, auth } from './setup';
import prisma from '../src/lib/prisma';

// ── bootstrap ──────────────────────────────────────────────────────────────────

async function bootstrap() {
  const owner = await createTestUser();

  const wsRes = await inject({
    method: 'POST', url: '/api/workspaces',
    payload: { name: 'Blocks WS' }, ...auth(owner.token),
  });
  const workspace = wsRes.json().workspace as { id: string };

  const boardRes = await inject({
    method: 'POST', url: `/api/workspaces/${workspace.id}/boards`,
    payload: { name: 'Blocks Board' }, ...auth(owner.token),
  });
  const board = boardRes.json().board as { id: string };

  const list = (await prisma.list.findFirst({ where: { boardId: board.id } }))!;

  const cardRes = await inject({
    method: 'POST', url: `/api/lists/${list.id}/cards`,
    payload: { title: 'Block Card' }, ...auth(owner.token),
  });
  const card = cardRes.json().card as { id: string };

  return { owner, card };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Blocks — POST /api/cards/:cardId/blocks', () => {
  it('creates a TEXT block → 201 with correct content', async () => {
    const { owner, card } = await bootstrap();

    const res = await inject({
      method: 'POST', url: `/api/cards/${card.id}/blocks`,
      payload: { type: 'TEXT', content: { text: 'Hello world' } },
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(201);
    const block = res.json().block;
    expect(block.type).toBe('TEXT');
    expect((block.content as { text: string }).text).toBe('Hello world');
  });

  it('creates a CHECKLIST block with items → 201', async () => {
    const { owner, card } = await bootstrap();

    const res = await inject({
      method: 'POST', url: `/api/cards/${card.id}/blocks`,
      payload: {
        type:    'CHECKLIST',
        content: {
          items: [
            { text: 'Item 1', checked: false },
            { text: 'Item 2', checked: false },
          ],
        },
      },
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(201);
    const items = (res.json().block.content as { items: unknown[] }).items;
    expect(items).toHaveLength(2);
  });

  it('invalid content for TEXT block → 400', async () => {
    const { owner, card } = await bootstrap();

    const res = await inject({
      method: 'POST', url: `/api/cards/${card.id}/blocks`,
      payload: { type: 'TEXT', content: { items: [] } }, // wrong shape
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('Blocks — PATCH /api/blocks/:id', () => {
  it('updates text block content → 200', async () => {
    const { owner, card } = await bootstrap();

    const createRes = await inject({
      method: 'POST', url: `/api/cards/${card.id}/blocks`,
      payload: { type: 'TEXT', content: { text: 'Original' } },
      ...auth(owner.token),
    });
    const blockId = createRes.json().block.id as string;

    const res = await inject({
      method: 'PATCH', url: `/api/blocks/${blockId}`,
      payload: { content: { text: 'Updated' } },
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(200);
    expect((res.json().block.content as { text: string }).text).toBe('Updated');
  });
});

describe('Blocks — DELETE /api/blocks/:id', () => {
  it('deletes block → 204 + removed from DB', async () => {
    const { owner, card } = await bootstrap();

    const createRes = await inject({
      method: 'POST', url: `/api/cards/${card.id}/blocks`,
      payload: { type: 'TEXT', content: { text: 'To delete' } },
      ...auth(owner.token),
    });
    const blockId = createRes.json().block.id as string;

    const res = await inject({
      method: 'DELETE', url: `/api/blocks/${blockId}`,
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(204);

    const found = await prisma.block.findUnique({ where: { id: blockId } });
    expect(found).toBeNull();
  });
});
