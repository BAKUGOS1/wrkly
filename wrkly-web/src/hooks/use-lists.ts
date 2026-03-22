import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import type { List, BoardFull } from '@/types';

// ── Mutations ────────────────────────────────────────────────────────────────

export function useCreateList(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { name: string; position: number }) =>
      apiFetch<{ list: List }>(`/api/boards/${boardId}/lists`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create list',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateList(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ listId, data }: { listId: string; data: Partial<{ name: string; isArchived: boolean; position: number }> }) =>
      apiFetch<{ list: List }>(`/api/lists/${listId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update list',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useArchiveList(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (listId: string) =>
      apiFetch<{ message: string }>(`/api/lists/${listId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to archive list',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useMoveList(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ listId, position }: { listId: string; position: number }) =>
      apiFetch<{ list: List }>(`/api/lists/${listId}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ position }),
      }),
    onMutate: async ({ listId, position }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.detail(boardId) });
      const previousBoard = queryClient.getQueryData<{ board: BoardFull }>(queryKeys.boards.detail(boardId));

      if (previousBoard?.board?.lists) {
        const lists = [...previousBoard.board.lists];
        const idx = lists.findIndex((l) => l.id === listId);
        if (idx > -1) {
          const [moved] = lists.splice(idx, 1);
          moved.position = position;
          lists.push(moved);
          lists.sort((a, b) => a.position - b.position);

          queryClient.setQueryData<{ board: BoardFull }>(queryKeys.boards.detail(boardId), {
            ...previousBoard,
            board: { ...previousBoard.board, lists },
          });
        }
      }

      return { previousBoard };
    },
    onError: (error, _vars, context) => {
      if (context?.previousBoard) {
        queryClient.setQueryData(queryKeys.boards.detail(boardId), context.previousBoard);
      }
      toast({
        title: 'Failed to move list',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
  });
}
