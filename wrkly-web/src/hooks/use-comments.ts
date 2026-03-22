import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import type { Comment } from '@/types';

export function useComments(cardId: string) {
  return useQuery({
    queryKey: queryKeys.comments.byCard(cardId),
    queryFn: () => apiFetch<{ comments: Comment[] }>(`/api/cards/${cardId}/comments`),
    enabled: !!cardId,
  });
}

export function useCreateComment(cardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { content: string }) =>
      apiFetch<{ comment: Comment }>(`/api/cards/${cardId}/comments`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byCard(cardId) });
      // Invalidate card detail to update comment count
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(cardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to post comment',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteComment(cardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (commentId: string) =>
      apiFetch<{ message: string }>(`/api/comments/${commentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments.byCard(cardId) });
      // Invalidate card detail to update comment count
      queryClient.invalidateQueries({ queryKey: queryKeys.cards.detail(cardId) });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete comment',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}
