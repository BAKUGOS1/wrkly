import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

// Using inline types to prevent circular deps or excessive imports, 
// if not exported from types.
interface SearchResult {
  id: string;
  type: 'card' | 'board';
  title: string;
  subtitle?: string;
  workspaceId: string;
  url: string;
  matchScore: number;
}

export function useSearch(query: string, workspaceId?: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  return useQuery({
    queryKey: queryKeys.search.query(debouncedQuery, workspaceId),
    queryFn: () => {
      const qs = new URLSearchParams({ q: debouncedQuery });
      if (workspaceId) {
        qs.append('workspaceId', workspaceId);
      }
      return apiFetch<{ results: SearchResult[] }>(`/api/search?${qs.toString()}`);
    },
    enabled: debouncedQuery.length >= 2,
  });
}
