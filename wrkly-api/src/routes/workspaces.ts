import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import slugify from 'slugify';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import { AppError, NotFoundError, ForbiddenError } from '../lib/errors';
import prisma from '../lib/prisma';

const createWorkspaceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
});

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

const updateMemberSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

async function generateSlug(name: string): Promise<string> {
  const base = slugify(name, { lower: true, strict: true });
  let slug = base;
  let attempts = 0;
  const MAX_ATTEMPTS = 5;
  while (attempts < MAX_ATTEMPTS) {
    const existing = await prisma.workspace.findUnique({ where: { slug } });
    if (!existing) return slug;
    const suffix = Math.random().toString(36).slice(2, 6);
    slug = `${base}-${suffix}`;
    attempts++;
  }
  // Final fallback with timestamp
  return `${base}-${Date.now().toString(36)}`;
}

export async function workspaceRoutes(app: FastifyInstance) {
  // ── GET /api/workspaces ─────────────────────────────────────────────────
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: request.userId },
      include: {
        workspace: {
          include: { _count: { select: { members: true } } },
        },
      },
    });

    const workspaces = memberships.map((m: {
      role: string;
      workspace: { id: string; name: string; slug: string; description: string | null; createdAt: Date; _count: { members: number } };
    }) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      description: m.workspace.description,
      memberCount: m.workspace._count.members,
      myRole: m.role,
      createdAt: m.workspace.createdAt,
    }));

    return reply.send({ workspaces });
  });

  // ── GET /api/workspaces/:id ──────────────────────────────────────────────
  app.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id: rawId } = request.params as { id: string };
    const member = await requireWorkspaceMember(request, rawId);

    const workspace = await prisma.workspace.findUnique({
      where: { id: member.workspaceId },
      select: { id: true, name: true, slug: true, description: true, ownerId: true, createdAt: true },
    });
    if (!workspace) return reply.status(404).send({ error: 'Workspace not found' });

    return reply.send({ workspace });
  });

  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const result = createWorkspaceSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: result.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { name, description } = result.data;
    const slug = await generateSlug(name);

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        description,
        ownerId: request.userId,
        members: {
          create: { userId: request.userId, role: 'OWNER' },
        },
      },
    });

    return reply.status(201).send({ workspace });
  });

  // ── PATCH /api/workspaces/:id ────────────────────────────────────────────
  app.patch('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id: rawId } = request.params as { id: string };
    const member = await requireWorkspaceMember(request, rawId, 'ADMIN');
    const id = member.workspaceId;

    const result = updateWorkspaceSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: result.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const workspace = await prisma.workspace.update({
      where: { id },
      data: result.data,
    });

    return reply.send({ workspace });
  });

  // ── DELETE /api/workspaces/:id ───────────────────────────────────────────
  app.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id: rawId } = request.params as { id: string };
    const member = await requireWorkspaceMember(request, rawId, 'OWNER');

    await prisma.workspace.delete({ where: { id: member.workspaceId } });

    return reply.status(204).send();
  });

  // ── GET /api/workspaces/:id/members ─────────────────────────────────────
  app.get('/:id/members', { preHandler: authenticate }, async (request, reply) => {
    const { id: rawId } = request.params as { id: string };
    const memberRecord = await requireWorkspaceMember(request, rawId);
    const id = memberRecord.workspaceId;

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: id },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return reply.send({ members });
  });

  // ── POST /api/workspaces/:id/members ────────────────────────────────────
  app.post('/:id/members', { preHandler: authenticate }, async (request, reply) => {
    const { id: rawId } = request.params as { id: string };
    const memberRecord = await requireWorkspaceMember(request, rawId, 'ADMIN');
    const id = memberRecord.workspaceId;

    const result = addMemberSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: result.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const { email, role } = result.data;

    const targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, avatarUrl: true },
    });
    if (!targetUser) throw new NotFoundError('User');

    const existing = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId: targetUser.id } },
    });
    if (existing) throw new AppError('User is already a member of this workspace', 409);

    const member = await prisma.workspaceMember.create({
      data: { workspaceId: id, userId: targetUser.id, role },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return reply.status(201).send({ member });
  });

  // ── PATCH /api/workspaces/:id/members/:userId ────────────────────────────
  app.patch('/:id/members/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { id: rawId, userId } = request.params as { id: string; userId: string };
    const memberRecord = await requireWorkspaceMember(request, rawId, 'OWNER');
    const id = memberRecord.workspaceId;

    if (userId === request.userId) {
      throw new ForbiddenError('Cannot change your own role');
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!targetMember) throw new NotFoundError('Member');
    if (targetMember.role === 'OWNER') {
      throw new ForbiddenError('Cannot change the role of another OWNER');
    }

    const result = updateMemberSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: result.error.issues.map((i: z.ZodIssue) => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const member = await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId: id, userId } },
      data: { role: result.data.role },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });

    return reply.send({ member });
  });

  // ── DELETE /api/workspaces/:id/members/:userId ───────────────────────────
  app.delete('/:id/members/:userId', { preHandler: authenticate }, async (request, reply) => {
    const { id: rawId, userId } = request.params as { id: string; userId: string };
    const isSelf = userId === request.userId;

    let id = rawId;

    // Must be ADMIN/OWNER to remove others; anyone can remove themselves
    if (!isSelf) {
      const memberRecord = await requireWorkspaceMember(request, rawId, 'ADMIN');
      id = memberRecord.workspaceId;
    } else {
      // Still need to resolve slug to ID to delete correctly
      const ws = await prisma.workspace.findFirst({
         where: { OR: [{ id: rawId }, { slug: rawId }] }
      });
      if (ws) id = ws.id;
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });
    if (!targetMember) throw new NotFoundError('Member');
    if (targetMember.role === 'OWNER') {
      throw new ForbiddenError('Cannot remove the workspace OWNER');
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId: id, userId } },
    });

    return reply.status(204).send();
  });
}
