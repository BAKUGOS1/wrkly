import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import type { Workspace, WorkspaceMember, User } from '@/types';

// Workspace type extended with relation counts for the list view
export interface WorkspaceWithCounts extends Workspace {
  _count?: { boards: number; members: number };
}

// Full member type including user details
export interface WorkspaceMemberWithUser extends WorkspaceMember {
  user: User;
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useWorkspaces() {
  return useQuery({
    queryKey: queryKeys.workspaces.all,
    queryFn: () => apiFetch<{ workspaces: WorkspaceWithCounts[] }>('/api/workspaces'),
  });
}

export function useWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.workspaces.members(workspaceId),
    queryFn: () =>
      apiFetch<{ members: WorkspaceMemberWithUser[] }>(`/api/workspaces/${workspaceId}/members`),
    enabled: !!workspaceId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      apiFetch<{ workspace: Workspace }>('/api/workspaces', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create workspace',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateWorkspace(workspaceId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { name?: string; description?: string }) =>
      apiFetch<{ workspace: Workspace }>(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.all });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update workspace',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

export function useInviteMember(workspaceId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { email: string; role?: 'ADMIN' | 'MEMBER' | 'VIEWER' }) =>
      apiFetch<{ member: WorkspaceMemberWithUser }>(`/api/workspaces/${workspaceId}/members`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.members(workspaceId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to invite member',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}
