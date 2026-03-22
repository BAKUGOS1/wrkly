import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import type { Label } from '@/types';

// ── Mutations ────────────────────────────────────────────────────────────────

export function useCreateLabel(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { name?: string; color: string }) =>
      apiFetch<{ label: Label }>(`/api/boards/${boardId}/labels`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create label',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateLabel(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ labelId, data }: { labelId: string; data: { name?: string; color?: string } }) =>
      apiFetch<{ label: Label }>(`/api/labels/${labelId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update label',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteLabel(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (labelId: string) =>
      apiFetch<{ message: string }>(`/api/labels/${labelId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
      toast({ title: 'Label deleted' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete label',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}
