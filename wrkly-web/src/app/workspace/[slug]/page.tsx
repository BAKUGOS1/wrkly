"use client";

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { Layers, CheckCircle2, AlertCircle, Plus, LayoutGrid, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// ── Types ────────────────────────────────────────────────────────────────────

interface BoardSummary {
  id: string;
  name: string;
  background?: string | null;
  description?: string | null;
  _count?: { lists: number; cards: number; members: number };
  members?: { user: { id: string; name: string; avatarUrl?: string } }[];
}

export default function WorkspaceDashboard({ params }: { params: { slug: string } }) {
  const token = useAuthStore((s) => s.token);
  
  const { data, isLoading } = useQuery({
    queryKey: ['boards', params.slug],
    queryFn: () =>
      apiFetch<{ boards: BoardSummary[] }>(`/api/workspaces/${params.slug}/boards`),
    enabled: !!token && !!params.slug,
  });

  const boards = data?.boards ?? [];
  
  // Placeholder stats - in a real app these would come from an API endpoint
  const stats = [
    { label: 'Total Boards', value: boards.length, icon: Layers, color: 'text-primary' },
    { label: 'Active Tasks', value: 24, icon: CheckCircle2, color: 'text-emerald-500' },
    { label: 'Overdue', value: 3, icon: AlertCircle, color: 'text-destructive' },
  ];

  // Placeholder activities
  const recentActivity = [
    { id: 1, user: 'Sarah', action: 'moved task', target: 'Create Landing Page', to: 'Done', time: '2 hours ago' },
    { id: 2, user: 'John', action: 'added a comment to', target: 'Fix Navigation Bug', time: '4 hours ago' },
    { id: 3, user: 'Alex', action: 'created new board', target: 'Q4 Roadmap', time: '1 day ago' },
  ];

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
        <Button className="h-[40px] px-[16px] rounded-[10px] w-full sm:w-auto">
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
            {isLoading ? (
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
                <Button variant="outline">Create Board</Button>
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

                    {/* Avatar Stack */}
                    <div className="flex -space-x-[8px]">
                      {[1, 2, 3].map((_, i) => (
                         <Avatar key={i} className="h-[28px] w-[28px] border-2 border-surface-container-lowest">
                           <AvatarFallback className="text-[10px] bg-surface-container-high">{(i + 1).toString()}</AvatarFallback>
                         </Avatar>
                      ))}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right Section: Recent Activity (if desktop, otherwise flows to bottom) */}
        <div>
          <div className="mb-[20px] flex items-center justify-between">
            <h2 className="text-[18px] font-semibold tracking-tight">Recent Activity</h2>
          </div>
          <div className="rounded-[12px] bg-surface-container-lowest p-[20px] ring-1 ring-border/10">
            <ul className="space-y-[24px]">
              {recentActivity.map((activity, idx) => (
                <li key={activity.id} className="relative flex gap-[16px]">
                  {/* Vertical Line for timeline effect */}
                  {idx !== recentActivity.length - 1 && (
                    <div className="absolute left-[16px] top-[32px] bottom-[-24px] w-[1px] bg-border" />
                  )}
                  <Avatar className="h-[32px] w-[32px] relative z-10 ring-4 ring-surface-container-lowest">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{activity.user[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 pt-[4px]">
                    <p className="text-[13px] leading-snug">
                      <span className="font-semibold text-foreground">{activity.user}</span>{' '}
                      <span className="text-muted-foreground">{activity.action}</span>{' '}
                      <span className="font-medium text-foreground">{activity.target}</span>
                      {activity.to && (
                        <>
                          <span className="text-muted-foreground"> to </span>
                          <span className="font-medium text-foreground">{activity.to}</span>
                        </>
                      )}
                    </p>
                    <div className="mt-[4px] flex items-center text-[11px] text-muted-foreground">
                      <Clock className="mr-[4px] h-[12px] w-[12px]" />
                      {activity.time}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
