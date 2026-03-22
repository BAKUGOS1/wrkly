import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import type { Board, BoardFull } from '@/types';

interface BoardSummary extends Board {
  _count?: { lists: number; cards: number };
}

// ── Queries ──────────────────────────────────────────────────────────────────

export function useBoards(workspaceId: string) {
  return useQuery({
    queryKey: queryKeys.boards.byWorkspace(workspaceId),
    queryFn: () =>
      apiFetch<{ boards: BoardSummary[] }>(`/api/workspaces/${workspaceId}/boards`),
    enabled: !!workspaceId,
  });
}

export function useBoard(boardId: string) {
  return useQuery({
    queryKey: queryKeys.boards.detail(boardId),
    queryFn: () => apiFetch<{ board: BoardFull }>(`/api/boards/${boardId}`),
    enabled: !!boardId,
  });
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useCreateBoard(workspaceId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { name: string; description?: string; background?: string }) =>
      apiFetch<{ board: Board }>(`/api/workspaces/${workspaceId}/boards`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boards.byWorkspace(workspaceId),
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create board',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateBoard(boardId: string, workspaceId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: Partial<{ name: string; description: string | null; background: string | null; isArchived: boolean }>) =>
      apiFetch<{ board: Board }>(`/api/boards/${boardId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.boards.byWorkspace(workspaceId),
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Failed to update board',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

// ── Board Templates ───────────────────────────────────────────────────────────

export interface BoardTemplate {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  lists: { name: string }[];
}

export function useBoardTemplates() {
  return useQuery({
    queryKey: ['boardTemplates'],
    queryFn: () => apiFetch<{ templates: BoardTemplate[] }>('/api/templates/boards'),
    staleTime: 10 * 60 * 1000, // templates rarely change
  });
}

export function useCreateBoardFromTemplate(workspaceId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { templateId: string; name: string; background?: string }) =>
      apiFetch<{ board: Board }>(`/api/workspaces/${workspaceId}/boards/from-template`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.boards.byWorkspace(workspaceId),
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create board from template',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive',
      });
    },
  });
}

