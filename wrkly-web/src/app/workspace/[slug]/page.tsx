"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Layers, CheckCircle2, AlertCircle, Plus, LayoutGrid, Clock, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CreateBoardDialog } from '@/components/boards/create-board-dialog';

// ── Types ────────────────────────────────────────────────────────────────────

interface BoardSummary {
  id: string;
  name: string;
  background?: string | null;
  description?: string | null;
  _count?: { lists: number; cards: number; members: number };
  members?: { user: { id: string; name: string; avatarUrl?: string | null } }[];
}

interface WorkspaceStats {
  totalBoards: number;
  totalCards: number;
  activeTasks: number;
  overdueTasks: number;
  memberCount: number;
}

interface ActivityItem {
  id: string;
  action: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string; avatarUrl?: string | null } | null;
  board: { id: string; name: string } | null;
  card: { id: string; title: string } | null;
}

export default function WorkspaceDashboard({ params }: { params: { slug: string } }) {
  const token = useAuthStore((s) => s.token);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  
  // Boards query
  const { data: boardsData, isLoading: boardsLoading } = useQuery({
    queryKey: ['boards', params.slug],
    queryFn: () =>
      apiFetch<{ boards: BoardSummary[] }>(`/api/workspaces/${params.slug}/boards`),
    enabled: !!token && !!params.slug,
  });

  // Stats query — real data
  const { data: statsData } = useQuery({
    queryKey: ['workspace-stats', params.slug],
    queryFn: () =>
      apiFetch<WorkspaceStats>(`/api/workspaces/${params.slug}/stats`),
    enabled: !!token && !!params.slug,
  });

  // Activity query — real data
  const { data: activityData } = useQuery({
    queryKey: ['workspace-activity', params.slug],
    queryFn: () =>
      apiFetch<{ activities: ActivityItem[] }>(`/api/workspaces/${params.slug}/activity?limit=10`),
    enabled: !!token && !!params.slug,
  });

  const boards = boardsData?.boards ?? [];
  const activities = activityData?.activities ?? [];

  const stats = [
    { label: 'Total Boards', value: statsData?.totalBoards ?? boards.length, icon: Layers, color: 'text-primary' },
    { label: 'Active Tasks', value: statsData?.activeTasks ?? 0, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Overdue', value: statsData?.overdueTasks ?? 0, icon: AlertCircle, color: 'text-destructive' },
  ];

  // Format activity description
  const formatAction = (activity: ActivityItem): string => {
    const meta = activity.metadata as Record<string, string> | null;
    switch (activity.action) {
      case 'card.created': return `created card`;
      case 'card.moved': return `moved card to ${meta?.toList ?? 'another list'}`;
      case 'card.updated': return `updated card`;
      case 'card.archived': return `archived card`;
      case 'board.created': return `created board`;
      case 'board.updated': return `updated board`;
      case 'comment.created': return `commented on`;
      case 'list.created': return `created list ${meta?.listName ?? ''}`;
      case 'member.added': return `added a member`;
      default: return activity.action.replace(/\./g, ' ');
    }
  };

  const getTimeAgo = (dateStr: string): string => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="mx-auto max-w-[1200px] pt-6 sm:pt-[48px] px-0">
      
      {/* Header */}
      <div className="mb-[32px] flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight font-manrope">Dashboard</h1>
          <p className="mt-[8px] text-[15px] text-muted-foreground">
            Overview of your active boards and recent activity.
          </p>
        </div>
        <Button
          className="h-[40px] px-[16px] rounded-[10px] w-full sm:w-auto"
          onClick={() => setShowCreateBoard(true)}
        >
          <Plus className="mr-[8px] h-[16px] w-[16px]" />
          New Board
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-[16px] sm:grid-cols-3 mb-[40px]">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex items-center gap-[16px] rounded-[12px] bg-surface-container-lowest p-[20px] transition-shadow hover:shadow-sm">
             <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-surface-container-low">
               <stat.icon className={cn("h-[24px] w-[24px]", stat.color)} />
             </div>
             <div>
               <p className="text-[14px] font-medium text-muted-foreground">{stat.label}</p>
               <h3 className="text-[28px] font-semibold tracking-tight">{stat.value}</h3>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[32px]">
        
        {/* Main Section: Your Boards */}
        <div className="lg:col-span-2">
          <div className="mb-[20px] flex items-center justify-between">
            <h2 className="text-[18px] font-semibold tracking-tight">Your Boards</h2>
          </div>
          
          <div className="grid grid-cols-1 gap-[20px] sm:grid-cols-2">
            {boardsLoading ? (
              <>
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-[12px] bg-surface-container-lowest p-[24px]"
                  >
                    <Skeleton className="mb-[16px] h-[6px] w-full" />
                    <Skeleton className="mb-[8px] h-[20px] w-[60%]" />
                    <Skeleton className="mb-[24px] h-[16px] w-[80%]" />
                    <div className="flex gap-[12px]">
                      <Skeleton className="h-[24px] w-[24px] rounded-full" />
                      <Skeleton className="h-[24px] w-[24px] rounded-full" />
                    </div>
                  </div>
                ))}
              </>
            ) : boards.length === 0 ? (
              <div className="col-span-2 rounded-[12px] border-2 border-dashed border-border p-[40px] text-center bg-surface-dim/20">
                <div className="mx-auto flex h-[48px] w-[48px] items-center justify-center rounded-full bg-surface-container-high mb-[16px]">
                  <LayoutGrid className="h-[24px] w-[24px] text-muted-foreground" />
                </div>
                <h3 className="text-[16px] font-medium mb-[4px]">No boards yet</h3>
                <p className="text-[14px] text-muted-foreground mb-[20px]">Get started by creating your first board for this workspace.</p>
                <Button variant="outline" onClick={() => setShowCreateBoard(true)}>Create Board</Button>
              </div>
            ) : (
              boards.map((board) => (
                <Link
                  key={board.id}
                  href={`/board/${board.id}`}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-[12px] bg-surface-container-lowest p-[24px] transition-all hover:bg-surface hover:shadow-[0_20px_40px_rgba(43,52,58,0.06)] ring-1 ring-border/5 hover:ring-border/20"
                >
                  {/* Accent Top Line */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[4px]"
                    style={{ backgroundColor: board.background ?? 'hsl(var(--primary))' }}
                  />
                  
                  <div>
                    <h3 className="text-[18px] font-bold tracking-tight text-foreground font-manrope transition-colors group-hover:text-primary">
                      {board.name}
                    </h3>
                    <p className="mt-[8px] text-[13px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {board.description || 'No description provided for this board.'}
                    </p>
                  </div>

                  {/* Metadata Row */}
                  <div className="mt-[24px] flex items-center justify-between">
                    <div className="flex items-center gap-[12px] text-[12px] font-medium text-muted-foreground">
                      <span className="flex items-center gap-[4px] bg-surface-container-low px-[8px] py-[4px] rounded-[6px]">
                        {board._count?.cards ?? 0} Cards
                      </span>
                      <span className="flex items-center gap-[4px] bg-surface-container-low px-[8px] py-[4px] rounded-[6px]">
                        {board._count?.lists ?? 0} Lists
                      </span>
                    </div>

                    {/* Real Avatar Stack */}
                    <div className="flex -space-x-[8px]">
                      {(board.members ?? []).slice(0, 3).map((m) => (
                         <Avatar key={m.user.id} className="h-[28px] w-[28px] border-2 border-surface-container-lowest">
                           <AvatarImage src={m.user.avatarUrl ?? undefined} />
                           <AvatarFallback className="text-[10px] bg-surface-container-high">
                             {m.user.name?.charAt(0)?.toUpperCase() ?? '?'}
                           </AvatarFallback>
                         </Avatar>
                      ))}
                      {(board.members?.length ?? 0) > 3 && (
                        <div className="flex h-[28px] w-[28px] items-center justify-center rounded-full border-2 border-surface-container-lowest bg-surface-container-high text-[10px] font-medium text-muted-foreground">
                          +{(board.members?.length ?? 0) - 3}
                        </div>
                      )}
                      {(!board.members || board.members.length === 0) && (
                        <div className="flex h-[28px] items-center text-[11px] text-muted-foreground">
                          <Users className="h-[14px] w-[14px] mr-1" />
                          {board._count?.members ?? 0}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right Section: Recent Activity */}
        <div>
          <div className="mb-[20px] flex items-center justify-between">
            <h2 className="text-[18px] font-semibold tracking-tight">Recent Activity</h2>
          </div>
          <div className="rounded-[12px] bg-surface-container-lowest p-[20px] ring-1 ring-border/10">
            {activities.length === 0 ? (
              <div className="py-[24px] text-center">
                <Clock className="mx-auto h-[24px] w-[24px] text-muted-foreground mb-[8px]" />
                <p className="text-[13px] text-muted-foreground">No activity yet</p>
                <p className="text-[12px] text-muted-foreground mt-[4px]">Actions on boards and cards will appear here.</p>
              </div>
            ) : (
              <ul className="space-y-[24px]">
                {activities.map((activity, idx) => (
                  <li key={activity.id} className="relative flex gap-[16px]">
                    {/* Vertical Line for timeline effect */}
                    {idx !== activities.length - 1 && (
                      <div className="absolute left-[16px] top-[32px] bottom-[-24px] w-[1px] bg-border" />
                    )}
                    <Avatar className="h-[32px] w-[32px] relative z-10 ring-4 ring-surface-container-lowest">
                      <AvatarImage src={activity.user?.avatarUrl ?? undefined} />
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {activity.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 pt-[4px]">
                      <p className="text-[13px] leading-snug">
                        <span className="font-semibold text-foreground">{activity.user?.name ?? 'Unknown'}</span>{' '}
                        <span className="text-muted-foreground">{formatAction(activity)}</span>
                        {activity.card && (
                          <>
                            {' '}
                            <span className="font-medium text-foreground">{activity.card.title}</span>
                          </>
                        )}
                        {!activity.card && activity.board && (
                          <>
                            {' '}
                            <span className="font-medium text-foreground">{activity.board.name}</span>
                          </>
                        )}
                      </p>
                      <div className="mt-[4px] flex items-center text-[11px] text-muted-foreground">
                        <Clock className="mr-[4px] h-[12px] w-[12px]" />
                        {getTimeAgo(activity.createdAt)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>

      {/* Create Board Dialog */}
      <CreateBoardDialog
        open={showCreateBoard}
        onOpenChange={setShowCreateBoard}
        workspaceId={params.slug}
      />
    </div>
  );
}
