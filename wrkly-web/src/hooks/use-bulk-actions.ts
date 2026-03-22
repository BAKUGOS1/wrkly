import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';

// ── Bulk Move ─────────────────────────────────────────────────────────────────

export function useBulkMoveCards(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      cardIds,
      targetListId,
    }: {
      cardIds: string[];
      targetListId: string;
    }) => {
      // Fire moves sequentially; position each card after the last
      let position = Date.now();
      for (const cardId of cardIds) {
        await apiFetch(`/api/cards/${cardId}/move`, {
          method: 'PATCH',
          body: JSON.stringify({ listId: targetListId, position }),
        });
        position += 1024;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to move cards',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
  });
}

// ── Bulk Add Label ────────────────────────────────────────────────────────────

export function useBulkAddLabel(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      cardIds,
      labelId,
    }: {
      cardIds: string[];
      labelId: string;
    }) => {
      await Promise.all(
        cardIds.map((cardId) =>
          apiFetch(`/api/cards/${cardId}/labels/${labelId}`, { method: 'POST' })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add label',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

// ── Bulk Set Due Date ─────────────────────────────────────────────────────────

export function useBulkSetDueDate(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      cardIds,
      dueDate,
    }: {
      cardIds: string[];
      dueDate: string | null;
    }) => {
      await Promise.all(
        cardIds.map((cardId) =>
          apiFetch(`/api/cards/${cardId}`, {
            method: 'PATCH',
            body: JSON.stringify({ dueDate }),
          })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to set due date',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

// ── Bulk Archive ──────────────────────────────────────────────────────────────

export function useBulkArchive(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ cardIds }: { cardIds: string[] }) => {
      await Promise.all(
        cardIds.map((cardId) =>
          apiFetch(`/api/cards/${cardId}`, { method: 'DELETE' })
        )
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to archive cards',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
  });
}
