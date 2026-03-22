import type { FastifyRequest } from 'fastify';
import { ForbiddenError } from '../lib/errors';
import prisma from '../lib/prisma';

type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

interface WorkspaceMemberRecord {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt: Date;
}

export async function requireWorkspaceMember(
  request: FastifyRequest,
  workspaceId: string,
  minRole?: WorkspaceRole
): Promise<WorkspaceMemberRecord> {
  const member = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId,
        userId: request.userId,
      },
    },
  });

  if (!member) {
    throw new ForbiddenError('You are not a member of this workspace');
  }

  if (minRole) {
    const memberLevel = ROLE_HIERARCHY[member.role as WorkspaceRole];
    const requiredLevel = ROLE_HIERARCHY[minRole];

    if (memberLevel < requiredLevel) {
      throw new ForbiddenError(
        `This action requires at least ${minRole} role`
      );
    }
  }

  return member as WorkspaceMemberRecord;
}
