import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import type { Card, CardDetail } from '@/types';

export function useCard(cardId: string) {
  return useQuery({
    queryKey: queryKeys.cards.detail(cardId),
    queryFn: () => apiFetch<{ card: CardDetail }>(`/api/cards/${cardId}`),
    enabled: !!cardId,
  });
}

export function useArchiveCard(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (cardId: string) =>
      apiFetch<{ message: string }>(`/api/cards/${cardId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to archive card',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateCard(boardId: string, listId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { title: string; position: number }) =>
      apiFetch<{ card: Card }>(`/api/lists/${listId}/cards`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create card',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCard(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ cardId, data }: { cardId: string; data: Partial<Card> & Record<string, unknown> }) =>
      apiFetch<{ card: Card }>(`/api/cards/${cardId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(variables.cardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update card',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useMoveCard(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ cardId, listId, position }: { cardId: string; listId: string; position: number }) =>
      apiFetch<{ card: Card }>(`/api/cards/${cardId}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ listId, position }),
      }),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.boards.detail(boardId) });
      const previousBoard = queryClient.getQueryData(queryKeys.boards.detail(boardId));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      queryClient.setQueryData(queryKeys.boards.detail(boardId), (old: any) => {
        if (!old?.board) return old;
        
        const board = JSON.parse(JSON.stringify(old.board));
        let targetCard = null;

        // Extract card from old list
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (let i = 0; i < board.lists.length; i++) {
          const list = board.lists[i];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cardIdx = list.cards.findIndex((c: any) => c.id === variables.cardId);
          if (cardIdx > -1) {
            targetCard = list.cards[cardIdx];
            list.cards.splice(cardIdx, 1);
            break;
          }
        }

        if (targetCard) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const targetList = board.lists.find((l: any) => l.id === variables.listId);
          if (targetList) {
            targetCard.listId = variables.listId;
            targetCard.position = variables.position;
            targetList.cards.push(targetCard);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            targetList.cards.sort((a: any, b: any) => a.position - b.position);
          }
        }

        return { ...old, board };
      });

      return { previousBoard };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
    },
    onError: (error, variables, context) => {
      toast({
        title: 'Failed to move card',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      if (context?.previousBoard) {
        queryClient.setQueryData(queryKeys.boards.detail(boardId), context.previousBoard);
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
      }
    },
  });
}
