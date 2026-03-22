import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CardTemplate {
  id: string;
  name: string;
  boardId: string;
  blockCount?: number;
  createdAt: string;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useCardTemplates(boardId: string) {
  return useQuery({
    queryKey: ['cardTemplates', boardId],
    queryFn: () => apiFetch<{ templates: CardTemplate[] }>(`/api/boards/${boardId}/card-templates`),
    enabled: !!boardId,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateCardTemplate(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { name: string; cardId: string }) =>
      apiFetch<{ template: CardTemplate }>(`/api/boards/${boardId}/card-templates`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardTemplates', boardId] });
      toast({ title: 'Template saved!' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to save template',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useCreateCardFromTemplate(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      listId,
      templateId,
      title,
      position,
    }: {
      listId: string;
      templateId: string;
      title: string;
      position: number;
    }) =>
      apiFetch<{ card: unknown }>(`/api/lists/${listId}/cards/from-template`, {
        method: 'POST',
        body: JSON.stringify({ templateId, title, position }),
      }),
    onSuccess: () => {
      // Invalidate board so new card appears
      queryClient.invalidateQueries({ queryKey: ['board', boardId] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to create card from template',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCardTemplate(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (templateId: string) =>
      apiFetch<{ message: string }>(`/api/card-templates/${templateId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cardTemplates', boardId] });
      toast({ title: 'Template deleted' });
    },
    onError: (error) => {
      toast({
        title: 'Failed to delete template',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}
