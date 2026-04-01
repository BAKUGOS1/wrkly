"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { BoardView } from '@/components/board/board-view';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ShareBoardDialog } from '@/components/board/share-board-dialog';
import { Filter, Zap, Share2, Settings, ChevronDown } from 'lucide-react';
import { BoardFilterBar, EMPTY_FILTERS, type BoardFilters } from '@/components/board/board-filter-bar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────

interface BoardMember {
  userId: string;
  role: string;
  user: { id: string; name: string; avatarUrl: string | null };
}

interface Board {
  id: string;
  name: string;
  background?: string | null;
  workspaceId: string;
  workspaceSlug?: string;
  lists: unknown[];
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function BoardPage({ params }: { params: { id: string } }) {
  const token = useAuthStore((s) => s.token);
  const [shareOpen, setShareOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);

  // Fetch board
  const { data, isLoading } = useQuery({
    queryKey: ['board', params.id],
    queryFn: () =>
      apiFetch<{ board: Board }>(`/api/boards/${params.id}`),
    enabled: !!token && !!params.id,
  });

  // Fetch workspace members for real avatars
  const { data: membersData } = useQuery({
    queryKey: ['workspace-members-board', data?.board?.workspaceId],
    queryFn: () =>
      apiFetch<{ members: BoardMember[] }>(
        `/api/workspaces/${data!.board.workspaceId}/members`
      ),
    enabled: !!data?.board?.workspaceId,
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
  const members = membersData?.members ?? [];

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center bg-surface-container-low">
        <p className="text-[14px] text-muted-foreground">Board not found or you don&apos;t have access.</p>
      </div>
    );
  }

  const displayMembers = members.slice(0, 5);
  const extraCount = Math.max(0, members.length - 5);

  // Build filter options from board data
  const boardLists = board.lists as Array<{
    id: string;
    cards: Array<{
      labels?: Array<{ id: string; name: string; color: string }>;
      assignees?: Array<{ id: string; name: string; avatarUrl: string | null }>;
    }>;
  }>;

  const allCards = boardLists?.flatMap((l) => l.cards ?? []) ?? [];
  const labelOptions = Array.from(
    new Map(
      allCards.flatMap((c) => c.labels ?? []).map((l) => [l.id, { id: l.id, label: l.name, color: l.color }])
    ).values()
  );
  const memberOptions = members.map((m) => ({ id: m.userId, label: m.user.name }));

  const hasActiveFilters =
    filters.labels.size > 0 || filters.members.size > 0 || filters.dueDate.size > 0;

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

        <div className="flex items-center gap-[12px]">
          {/* Real Member Avatars */}
          {displayMembers.length > 0 && (
            <div className="flex -space-x-[8px] mr-[4px]">
              {displayMembers.map((m) => {
                const initials = m.user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <Tooltip key={m.userId}>
                    <TooltipTrigger asChild>
                      <Avatar className="h-[28px] w-[28px] border-2 border-surface ring-1 ring-border/5 cursor-pointer">
                        <AvatarImage src={m.user.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {m.user.name}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {extraCount > 0 && (
                <div className="h-[28px] w-[28px] rounded-full border-2 border-surface bg-muted flex items-center justify-center ring-1 ring-border/5">
                  <span className="text-[10px] font-semibold text-muted-foreground">+{extraCount}</span>
                </div>
              )}
            </div>
          )}

          {/* Filter button */}
          <Button
            variant={hasActiveFilters ? 'default' : 'outline'}
            className="h-[32px] px-[12px] text-[13px] rounded-[8px] bg-surface-container-lowest border-border/50 text-muted-foreground hover:text-foreground"
            onClick={() => setFilterOpen((v) => !v)}
          >
            <Filter className="mr-[6px] h-[14px] w-[14px]" />
            Filter
            {hasActiveFilters && (
              <span className="ml-1.5 h-4 w-4 rounded-full bg-primary-foreground text-primary text-[10px] font-bold flex items-center justify-center">
                {filters.labels.size + filters.members.size + filters.dueDate.size}
              </span>
            )}
          </Button>

          {/* Automations button */}
          {board.workspaceSlug && (
            <Button
              variant="outline"
              className="h-[32px] px-[12px] text-[13px] rounded-[8px] bg-surface-container-lowest border-border/50 text-muted-foreground hover:text-foreground"
              asChild
            >
              <Link href={`/workspace/${board.workspaceSlug}`}>
                <Zap className="mr-[6px] h-[14px] w-[14px]" />
                Automations
              </Link>
            </Button>
          )}

          {/* Board settings */}
          {board.workspaceSlug && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-[32px] w-[32px] rounded-[8px] bg-surface-container-lowest border-border/50 text-muted-foreground hover:text-foreground"
                  asChild
                >
                  <Link href={`/workspace/${board.workspaceSlug}/settings`}>
                    <Settings className="h-[14px] w-[14px]" />
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Workspace Settings</TooltipContent>
            </Tooltip>
          )}

          <div className="h-[16px] w-[1px] bg-border mx-[4px]" />

          <Button
            className="h-[32px] px-[16px] text-[13px] rounded-[8px] bg-primary text-primary-foreground hover:bg-primary-dim shadow-sm"
            onClick={() => setShareOpen(true)}
          >
            <Share2 className="mr-[8px] h-[14px] w-[14px]" />
            Share
          </Button>
        </div>
      </div>

      {/* Filter bar (slides down) */}
      {filterOpen && (
        <BoardFilterBar
          labels={labelOptions}
          members={memberOptions}
          filters={filters}
          onFiltersChange={setFilters}
          totalCards={allCards.length}
          visibleCards={allCards.length}
        />
      )}

      {/* Kanban Canvas Wrapper */}
      <div className="flex-1 overflow-hidden relative">
        <BoardView board={board} filters={filters} />
      </div>

      {/* Share Dialog */}
      <ShareBoardDialog
        boardId={board.id}
        boardName={board.name}
        workspaceId={board.workspaceId}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  );
}
