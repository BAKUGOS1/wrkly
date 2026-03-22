import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import type { Block, CardDetail } from '@/types';

export function useBlocks(cardId: string) {
  return useQuery({
    queryKey: queryKeys.blocks.byCard(cardId),
    queryFn: () => apiFetch<{ blocks: Block[] }>(`/api/cards/${cardId}/blocks`),
    enabled: !!cardId,
  });
}

export function useCreateBlock(cardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { type: Block['type']; content?: Record<string, unknown> }) =>
      apiFetch<{ block: Block }>(`/api/cards/${cardId}/blocks`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(cardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.blocks.byCard(cardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create block',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateBlock(cardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ blockId, data }: { blockId: string; data: Partial<Block> }) =>
      apiFetch<{ block: Block }>(`/api/blocks/${blockId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onMutate: async ({ blockId, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.cards.detail(cardId) });
      
      const previousCard = queryClient.getQueryData<{ card: CardDetail }>(queryKeys.cards.detail(cardId));

      if (previousCard?.card?.blocks) {
        queryClient.setQueryData<{ card: CardDetail }>(queryKeys.cards.detail(cardId), {
          ...previousCard,
          card: {
            ...previousCard.card,
            blocks: previousCard.card.blocks.map((block) => 
               block.id === blockId ? { ...block, ...data } : block
            ),
          }
        });
      }

      return { previousCard };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.blocks.byCard(cardId) });
    },
    onError: (error, variables, context) => {
      if (context?.previousCard) {
        queryClient.setQueryData(queryKeys.cards.detail(cardId), context.previousCard);
      }
      toast({
        title: 'Failed to update block',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      // Always refetch to ensure server state is perfectly synced
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(cardId) });
    }
  });
}

export function useMoveBlock(cardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ blockId, position }: { blockId: string; position: number }) =>
      apiFetch<{ block: Block }>(`/api/blocks/${blockId}/move`, {
        method: 'PATCH',
        body: JSON.stringify({ position }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(cardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.blocks.byCard(cardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to move block',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteBlock(cardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (blockId: string) =>
      apiFetch<{ message: string }>(`/api/blocks/${blockId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(cardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.blocks.byCard(cardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete block',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}
