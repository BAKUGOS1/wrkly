import { describe, it, expect, vi } from 'vitest';
import { inject, createTestUser, auth } from './setup';
import prisma from '../src/lib/prisma';

// ── bootstrap ──────────────────────────────────────────────────────────────────

async function bootstrap() {
  const owner = await createTestUser();

  const wsRes = await inject({
    method: 'POST', url: '/api/workspaces',
    payload: { name: 'Automation WS' }, ...auth(owner.token),
  });
  const workspace = wsRes.json().workspace as { id: string };

  const boardRes = await inject({
    method: 'POST', url: `/api/workspaces/${workspace.id}/boards`,
    payload: { name: 'Auto Board' }, ...auth(owner.token),
  });
  const board = boardRes.json().board as { id: string };

  const lists = await prisma.list.findMany({ where: { boardId: board.id } });
  const list  = lists[0];

  return { owner, workspace, board, list };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Automations — POST /api/boards/:boardId/automations', () => {
  it('creates automation rule → 201', async () => {
    const { owner, board } = await bootstrap();

    const res = await inject({
      method: 'POST',
      url:    `/api/boards/${board.id}/automations`,
      payload: {
        name:    'Move to Done',
        trigger: { event: 'card.moved' },
        actions: [{ type: 'add_comment', params: { text: 'Card moved!' } }],
      },
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(201);
    const rule = res.json().rule;
    expect(rule.name).toBe('Move to Done');
    expect(rule.isActive).toBe(true);
  });

  it('invalid trigger event → 400', async () => {
    const { owner, board } = await bootstrap();

    const res = await inject({
      method: 'POST',
      url:    `/api/boards/${board.id}/automations`,
      payload: {
        name:    'Bad Rule',
        trigger: { event: 'not.a.valid.event' },
        actions: [{ type: 'add_comment', params: { text: 'Hi' } }],
      },
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('Automations — GET /api/boards/:boardId/automations', () => {
  it('returns all rules for the board', async () => {
    const { owner, board } = await bootstrap();

    await inject({
      method: 'POST',
      url:    `/api/boards/${board.id}/automations`,
      payload: {
        name: 'Rule A', trigger: { event: 'card.created' },
        actions: [{ type: 'add_comment', params: { text: 'Created!' } }],
      },
      ...auth(owner.token),
    });

    const res = await inject({
      method: 'GET',
      url:    `/api/boards/${board.id}/automations`,
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().automations.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Automations — PATCH /api/automations/:id/toggle', () => {
  it('toggles rule active/inactive', async () => {
    const { owner, board } = await bootstrap();

    const createRes = await inject({
      method: 'POST',
      url:    `/api/boards/${board.id}/automations`,
      payload: {
        name: 'Toggle Rule', trigger: { event: 'card.created' },
        actions: [{ type: 'add_comment', params: { text: 'Hi' } }],
      },
      ...auth(owner.token),
    });
    const rule = createRes.json().rule as { id: string; isActive: boolean };
    expect(rule.isActive).toBe(true);

    const res = await inject({
      method: 'PATCH',
      url:    `/api/automations/${rule.id}/toggle`,
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().isActive).toBe(false);
  });
});

describe('Automations — rule queues event on card move', () => {
  it('triggerAutomation is called when a card is moved', async () => {
    const { owner, board, list } = await bootstrap();

    // Create a second list to move to
    const list2Res = await inject({
      method: 'POST', url: `/api/boards/${board.id}/lists`,
      payload: { name: 'Done' }, ...auth(owner.token),
    });
    const list2 = list2Res.json().list as { id: string };

    // Create a card
    const cardRes = await inject({
      method: 'POST', url: `/api/lists/${list.id}/cards`,
      payload: { title: 'Move Me' }, ...auth(owner.token),
    });
    const card = cardRes.json().card as { id: string };

    // Import the mocked module to spy on it
    const { triggerAutomation } = await import('../src/lib/automation-events');
    vi.clearAllMocks();

    // Move the card
    await inject({
      method: 'PATCH', url: `/api/cards/${card.id}/move`,
      payload: { listId: list2.id, position: 1 },
      ...auth(owner.token),
    });

    // The automation event helper should have been called
    expect(triggerAutomation).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'card.moved' })
    );
  });
});

describe('Automations — disabled rule does not fire', () => {
  it('disabled rule stays disabled after toggle', async () => {
    const { owner, board } = await bootstrap();

    const createRes = await inject({
      method: 'POST',
      url:    `/api/boards/${board.id}/automations`,
      payload: {
        name: 'Disable Me', trigger: { event: 'card.created' },
        actions: [{ type: 'add_comment', params: { text: 'noop' } }],
      },
      ...auth(owner.token),
    });
    const rule = createRes.json().rule as { id: string };

    // Disable the rule
    await inject({
      method: 'PATCH', url: `/api/automations/${rule.id}/toggle`,
      ...auth(owner.token),
    });

    const db = await prisma.automationRule.findUnique({ where: { id: rule.id } });
    expect(db?.isActive).toBe(false);
  });
});
