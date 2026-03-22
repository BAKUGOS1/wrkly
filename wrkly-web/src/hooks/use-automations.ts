import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AutomationTrigger {
  event: string;
  from_list_name?: string;
  to_list_name?: string;
  label_name?: string;
  conditions?: Record<string, unknown>;
}

export interface AutomationAction {
  type: string;
  params: Record<string, unknown>;
}

export interface AutomationRule {
  id: string;
  name: string;
  isActive: boolean;
  trigger: AutomationTrigger;
  conditions?: Record<string, unknown> | null;
  actions: AutomationAction[];
  runCount: number;
  lastRunAt?: string | null;
  createdAt?: string;
  createdBy?: { id: string; name: string; avatarUrl?: string | null };
}

export interface TestMatch {
  cardId: string;
  cardTitle: string;
  listName: string;
  actions: Array<{ type: string; description: string }>;
}

const QUERY_KEY = (boardId: string) => ['automations', boardId] as const;

// ── Queries ───────────────────────────────────────────────────────────────────

export function useAutomations(boardId: string) {
  return useQuery({
    queryKey: QUERY_KEY(boardId),
    queryFn: () =>
      apiFetch<{ automations: AutomationRule[] }>(`/api/boards/${boardId}/automations`),
    enabled: !!boardId,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useCreateAutomation(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: { name: string; trigger: AutomationTrigger; actions: AutomationAction[] }) =>
      apiFetch<AutomationRule>(`/api/boards/${boardId}/automations`, {
        method: 'POST',
        body:   JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(boardId) });
      toast({ title: 'Automation created' });
    },
    onError: (err) => {
      toast({
        title:       'Failed to create automation',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant:     'destructive',
      });
    },
  });
}

export function useUpdateAutomation(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{ name: string; trigger: AutomationTrigger; actions: AutomationAction[]; isActive: boolean }>;
    }) =>
      apiFetch<AutomationRule>(`/api/automations/${id}`, {
        method: 'PATCH',
        body:   JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(boardId) });
      toast({ title: 'Automation updated' });
    },
    onError: (err) => {
      toast({
        title:       'Failed to update automation',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant:     'destructive',
      });
    },
  });
}

export function useDeleteAutomation(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/automations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(boardId) });
      toast({ title: 'Automation deleted' });
    },
    onError: (err) => {
      toast({
        title:       'Failed to delete automation',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant:     'destructive',
      });
    },
  });
}

export function useToggleAutomation(boardId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string; isActive: boolean }>(`/api/automations/${id}/toggle`, {
        method: 'PATCH',
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(boardId) });
      toast({ title: data.isActive ? 'Automation enabled' : 'Automation disabled' });
    },
    onError: (err) => {
      toast({
        title:       'Failed to toggle automation',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant:     'destructive',
      });
    },
  });
}

export function useTestAutomation() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ matches: TestMatch[]; totalCards: number }>(`/api/automations/${id}/test`, {
        method: 'POST',
      }),
    onError: (err) => {
      toast({
        title:       'Test failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant:     'destructive',
      });
    },
  });
}
