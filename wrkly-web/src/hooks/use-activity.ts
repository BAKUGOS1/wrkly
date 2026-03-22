import { useInfiniteQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActivityItem {
  id: string;
  action: string;
  metadata: Record<string, string | number | boolean | null | undefined>;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

interface ActivityPage {
  activity: ActivityItem[];
  nextCursor: string | null;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export function useBoardActivity(boardId: string) {
  return useInfiniteQuery({
    queryKey: ['activity', 'board', boardId],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (pageParam) params.set('cursor', pageParam as string);
      return apiFetch<ActivityPage>(`/api/boards/${boardId}/activity?${params}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!boardId,
  });
}

export function useCardActivity(cardId: string) {
  return useInfiniteQuery({
    queryKey: ['activity', 'card', cardId],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (pageParam) params.set('cursor', pageParam as string);
      return apiFetch<ActivityPage>(`/api/cards/${cardId}/activity?${params}`);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!cardId,
  });
}
