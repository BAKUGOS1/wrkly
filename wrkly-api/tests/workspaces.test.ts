import { describe, it, expect } from 'vitest';
import { inject, createTestUser, auth } from './setup';
import prisma from '../src/lib/prisma';

// ── helpers ────────────────────────────────────────────────────────────────────

async function createWorkspace(token: string, name = 'Test Workspace') {
  const res = await inject({
    method:  'POST',
    url:     '/api/workspaces',
    payload: { name },
    ...auth(token),
  });
  expect(res.statusCode).toBe(201);
  return res.json().workspace as { id: string; slug: string; name: string };
}

// ─────────────────────────────────────────────────────────────────────────────

describe('Workspaces — POST /api/workspaces', () => {
  it('creates workspace → 201 + slug auto-generated', async () => {
    const user = await createTestUser();
    const res  = await inject({
      method:  'POST',
      url:     '/api/workspaces',
      payload: { name: 'My Space' },
      ...auth(user.token),
    });
    expect(res.statusCode).toBe(201);
    const ws = res.json().workspace;
    expect(ws.name).toBe('My Space');
    expect(ws.slug).toMatch(/my-space/);
  });

  it('creator is automatically added as OWNER member', async () => {
    const user = await createTestUser();
    const ws   = await createWorkspace(user.token);

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: ws.id, userId: user.id },
    });
    expect(member?.role).toBe('OWNER');
  });

  it('requires authentication → 401', async () => {
    const res = await inject({
      method:  'POST',
      url:     '/api/workspaces',
      payload: { name: 'No Auth WS' },
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('Workspaces — GET /api/workspaces', () => {
  it("lists only the user's own workspaces", async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();

    await createWorkspace(userA.token, 'A Space');
    await createWorkspace(userB.token, 'B Space');

    const res = await inject({ method: 'GET', url: '/api/workspaces', ...auth(userA.token) });
    expect(res.statusCode).toBe(200);
    const names = res.json().workspaces.map((w: { name: string }) => w.name);
    expect(names).toContain('A Space');
    expect(names).not.toContain('B Space');
  });
});

describe('Workspaces — invite member', () => {
  it('owner can invite another user → 201', async () => {
    const owner = await createTestUser();
    const guest = await createTestUser();
    const ws    = await createWorkspace(owner.token);

    const res = await inject({
      method:  'POST',
      url:     `/api/workspaces/${ws.id}/members`,
      payload: { email: guest.email, role: 'MEMBER' },
      ...auth(owner.token),
    });
    expect(res.statusCode).toBe(201);

    const member = await prisma.workspaceMember.findFirst({
      where: { workspaceId: ws.id, userId: guest.id },
    });
    expect(member?.role).toBe('MEMBER');
  });

  it('non-member cannot access workspace boards → 403', async () => {
    const owner   = await createTestUser();
    const outside = await createTestUser();
    const ws      = await createWorkspace(owner.token);

    const res = await inject({
      method: 'GET',
      url:    `/api/workspaces/${ws.id}/boards`,
      ...auth(outside.token),
    });
    expect(res.statusCode).toBe(403);
  });
});
