'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Workspace } from '@/types';

import { WorkspaceSwitcher } from '@/components/workspaces/workspace-switcher';

// ── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceWithCounts extends Workspace {
  _count?: { boards: number; members: number };
}

interface BoardSummary {
  id: string;
  name: string;
  background?: string | null;
}

// ── Sidebar Content ──────────────────────────────────────────────────────────

function SidebarContent({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const { toggleSidebar, toggleCommandBar } = useUIStore();
  const token = useAuthStore((s) => s.token);

  // Still need workspaces here just to establish active workspace for fetching boards
  const { data: workspacesData } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => apiFetch<{ workspaces: WorkspaceWithCounts[] }>('/api/workspaces'),
    enabled: !!token,
  });

  const workspaces = workspacesData?.workspaces ?? [];
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  // Auto-select first workspace logic, could also try to infer from pathname
  useEffect(() => {
    const match = pathname.match(/\/app\/workspace\/([^/]+)/);
    if (match && match[1]) {
      setActiveWorkspaceId(match[1]);
    } else if (workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(workspaces[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, activeWorkspaceId]);

  // Fetch boards for active workspace
  const { data: boardsData, isLoading: boardsLoading } = useQuery({
    queryKey: ['boards', activeWorkspaceId],
    queryFn: () =>
      apiFetch<{ boards: BoardSummary[] }>(
        `/api/workspaces/${activeWorkspaceId}/boards`
      ),
    enabled: !!activeWorkspaceId && !!token,
  });

  const boards = boardsData?.boards ?? [];

  const navItems = [
    { href: '/app', label: 'Dashboard', icon: LayoutDashboard },
    { href: '#', label: 'Search', icon: Search, hint: '⌘K', onClick: toggleCommandBar },
  ];

  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center py-4 gap-2">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            size="icon"
            className={cn(
              'h-10 w-10',
              pathname === item.href && 'bg-primary/10 text-primary'
            )}
            onClick={item.onClick}
            asChild={!item.onClick}
          >
            {item.onClick ? (
              <item.icon className="h-5 w-5" />
            ) : (
              <Link href={item.href}>
                <item.icon className="h-5 w-5" />
              </Link>
            )}
          </Button>
        ))}
        <Separator className="my-2 w-8" />
        {boardsLoading ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          boards.map((board) => (
            <Button
              key={board.id}
              variant="ghost"
              size="icon"
              className={cn(
                'h-10 w-10',
                pathname === `/board/${board.id}` && 'bg-primary/10'
              )}
              asChild
            >
              <Link href={`/board/${board.id}`}>
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: board.background ?? '#94a3b8' }}
                />
              </Link>
            </Button>
          ))
        )}
        <div className="mt-auto">
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Brand Logo */}
      <div className="flex h-14 shrink-0 items-center px-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/wrkly-primary-lockup-dark.svg" alt="wrkly" className="h-[24px] w-auto" />
      </div>

      {/* Workspace selector */}
      <div className="p-3">
        <WorkspaceSwitcher />
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = item.href !== '#' && pathname === item.href;
          return (
            <Button
              key={item.label}
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start gap-3 px-3 font-normal',
                isActive && 'bg-primary/10 text-primary font-medium'
              )}
              onClick={item.onClick}
              asChild={!item.onClick}
            >
              {item.onClick ? (
                <>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.hint && (
                    <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                      {item.hint}
                    </kbd>
                  )}
                </>
              ) : (
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )}
            </Button>
          );
        })}
      </nav>

      <Separator />

      {/* Board list */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Boards
        </span>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1 px-3">
        {boardsLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        ) : boards.length === 0 ? (
          <p className="px-3 py-4 text-sm text-muted-foreground">
            No boards yet
          </p>
        ) : (
          <div className="space-y-0.5">
            {boards.map((board) => {
              const isActive = pathname === `/board/${board.id}`;
              return (
                <Link
                  key={board.id}
                  href={`/board/${board.id}`}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    'hover:bg-accent',
                    isActive && 'bg-primary/10 text-primary font-medium'
                  )}
                >
                  <div
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: board.background ?? '#94a3b8' }}
                  />
                  <span className="truncate">{board.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Collapse button */}
      <Separator />
      <div className="p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={toggleSidebar}
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Collapse</span>
        </Button>
      </div>
    </div>
  );
}

// ── Sidebar Shell ────────────────────────────────────────────────────────────

export function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Mobile: render as Sheet overlay
  if (isMobile) {
    return (
      <Sheet open={sidebarOpen} onOpenChange={toggleSidebar}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SidebarContent collapsed={false} />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: collapsible sidebar
  return (
    <aside
      className={cn(
        'hidden md:flex flex-col border-r border-border bg-slate-50 dark:bg-slate-800/50 transition-all duration-200',
        sidebarOpen ? 'w-[260px]' : 'w-[60px]'
      )}
    >
      <SidebarContent collapsed={!sidebarOpen} />
    </aside>
  );
}
