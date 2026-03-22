"use client";

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { BoardView } from '@/components/board/board-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Filter, Zap, Share2 } from 'lucide-react';

export default function BoardPage({ params }: { params: { id: string } }) {
  const token = useAuthStore((s) => s.token);
  
  const { data, isLoading } = useQuery({
    queryKey: ['board', params.id],
    queryFn: () => apiFetch<{ board: { id: string; name: string; background?: string | null; lists: unknown[] } }>(`/api/boards/${params.id}`),
    enabled: !!token && !!params.id,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-64px)] bg-surface-container-low p-[24px]">
        <Skeleton className="h-[40px] w-[300px] mb-[24px]" />
        <div className="flex gap-[16px]">
          <Skeleton className="h-[500px] w-[280px] rounded-[12px]" />
          <Skeleton className="h-[500px] w-[280px] rounded-[12px]" />
        </div>
      </div>
    );
  }

  const board = data?.board;

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-container-low">
        <p className="text-[14px] text-muted-foreground">Board not found or you don&apos;t have access.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-surface-container-low overflow-hidden">
      {/* Board Header */}
      <div className="flex h-[60px] shrink-0 items-center justify-between border-b-2 border-surface-container-high bg-surface px-[24px]">
        <div className="flex items-center gap-[12px]">
          <div
            className="h-[20px] w-[20px] rounded-[6px]"
            style={{ backgroundColor: board.background ?? 'hsl(var(--primary))' }}
          />
          <h1 className="text-[18px] font-bold tracking-tight text-foreground font-manrope">
            {board.name}
          </h1>
        </div>

        <div className="flex items-center gap-[16px]">
          {/* Avatar Stack */}
          <div className="flex -space-x-[8px] mr-[8px]">
            {/* Mock avatars since members aren't fetched detailed enough yet */}
            {[1, 2, 3].map((_, i) => (
               <Avatar key={i} className="h-[28px] w-[28px] border-2 border-surface ring-1 ring-border/5">
                 <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">{(i + 1).toString()}</AvatarFallback>
               </Avatar>
            ))}
          </div>

          <Button variant="outline" className="h-[32px] px-[12px] text-[13px] rounded-[8px] bg-surface-container-lowest border-border/50 text-muted-foreground hover:text-foreground">
            <Filter className="mr-[6px] h-[14px] w-[14px]" />
            Filter
          </Button>

          <Button variant="outline" className="h-[32px] px-[12px] text-[13px] rounded-[8px] bg-surface-container-lowest border-border/50 text-muted-foreground hover:text-foreground">
            <Zap className="mr-[6px] h-[14px] w-[14px]" />
            Automations
          </Button>

          <div className="h-[16px] w-[1px] bg-border mx-[4px]" />

          <Button className="h-[32px] px-[16px] text-[13px] rounded-[8px] bg-primary text-primary-foreground hover:bg-primary-dim shadow-sm">
            <Share2 className="mr-[8px] h-[14px] w-[14px]" />
            Share
          </Button>
        </div>
      </div>

      {/* Kanban Canvas Wrapper */}
      <div className="flex-1 overflow-hidden relative">
        <BoardView board={board} />
      </div>
    </div>
  );
}
