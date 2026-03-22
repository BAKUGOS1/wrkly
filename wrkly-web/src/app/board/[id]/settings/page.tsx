"use client";

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Skeleton } from '@/components/ui/skeleton';
import { BoardSettingsClient } from './board-settings-client';

export default function BoardSettingsPage({ params }: { params: { id: string } }) {
  const token = useAuthStore((s) => s.token);
  
  const { data, isLoading } = useQuery({
    queryKey: ['board', params.id],
    queryFn: () => apiFetch<{ board: { id: string; name: string; description: string | null; workspaceId: string } }>(`/api/boards/${params.id}`),
    enabled: !!token && !!params.id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] bg-surface-container-low p-[40px]">
        <Skeleton className="h-[40px] w-[300px] mb-[32px]" />
        <Skeleton className="h-[400px] w-full max-w-[800px] rounded-[12px]" />
      </div>
    );
  }

  const board = data?.board;

  if (!board) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] items-center justify-center bg-surface-container-low">
        <p className="text-[14px] text-muted-foreground">Board not found or you don&apos;t have access.</p>
      </div>
    );
  }

  return <BoardSettingsClient board={board} />;
}
