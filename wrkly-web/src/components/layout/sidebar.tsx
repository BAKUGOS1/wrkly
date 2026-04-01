'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Plus,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckSquare,
  Settings,
  LogOut
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { Workspace } from '@/types';
import { Logo } from '@/components/ui/logo';

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

export function Sidebar() {
  const pathname = usePathname();
  const { toggleSidebar, sidebarOpen } = useUIStore();
  const collapsed = !sidebarOpen;
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  // Still need workspaces here just to establish active workspace for fetching boards
  const { data: workspacesData } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => apiFetch<{ workspaces: WorkspaceWithCounts[] }>('/api/workspaces'),
    enabled: !!token,
  });

  const workspaces = workspacesData?.workspaces;

  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  // Auto-select first workspace logic, could also try to infer from pathname
  useEffect(() => {
    const match = pathname.match(/\/workspace\/([^/]+)/);
    if (match && match[1]) {
      setActiveWorkspaceId(match[1]);
    } else if (workspaces && workspaces.length > 0 && !activeWorkspaceId) {
      setActiveWorkspaceId(workspaces[0].id);
    }
  }, [pathname, activeWorkspaceId, workspaces]);

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
    { href: '/workspaces', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/my-tasks', label: 'My Tasks', icon: CheckSquare },
  ];

  if (collapsed) {
    return (
      <div className="flex h-full w-[64px] flex-col items-center border-r border-border bg-background py-[16px] gap-[8px] transition-all">
        {/* Brand Logo (Collapsed) */}
        <div className="mb-[16px] mt-[8px]">
          <Logo variant="icon" width={28} height={28} />
        </div>

        {navItems.map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            size="icon"
            className={cn(
              'h-[40px] w-[40px] text-muted-foreground',
              pathname === item.href && 'bg-primary/10 text-primary'
            )}
            onClick={item.href === '#' ? undefined : undefined}
            asChild={item.href !== '#'}
          >
            {item.href === '#' ? (
              <item.icon className="h-[20px] w-[20px]" />
            ) : (
              <Link href={item.href}>
                <item.icon className="h-[20px] w-[20px]" />
              </Link>
            )}
          </Button>
        ))}
        <Separator className="my-[8px] w-[32px]" />
        {boardsLoading ? (
          <Loader2 className="h-[16px] w-[16px] animate-spin text-muted-foreground" />
        ) : (
          boards.map((board) => (
            <Button
              key={board.id}
              variant="ghost"
              size="icon"
              className={cn(
                'h-[40px] w-[40px]',
                pathname === `/board/${board.id}` && 'bg-primary/10'
              )}
              asChild
            >
              <Link href={`/board/${board.id}`}>
                <div
                  className="h-[12px] w-[12px] rounded-[3px]"
                  style={{ backgroundColor: board.background ?? '#94a3b8' }}
                />
              </Link>
            </Button>
          ))
        )}
        <div className="mt-auto flex flex-col items-center gap-[16px]">
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <ChevronRight className="h-[20px] w-[20px] text-muted-foreground" />
          </Button>
        </div>
      </div>
    );
  }

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?';

  return (
    <div className="flex h-full w-[256px] flex-col border-r border-border bg-background transition-all">
      {/* Brand Logo */}
      <div className="flex h-[64px] shrink-0 items-center px-[24px]">
        <Logo variant="full" width={100} height={28} />
      </div>

      {/* Workspace selector */}
      <div className="px-[16px] py-[12px]">
        <WorkspaceSwitcher />
      </div>

      <Separator className="opacity-50" />

      {/* Navigation */}
      <nav className="space-y-[4px] px-[16px] py-[12px]">
        {navItems.map((item) => {
          const isActive = item.href !== '#' && pathname === item.href;
          return (
            <Button
              key={item.label}
              variant={isActive ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start text-[14px] font-medium h-[36px] px-[12px]',
                isActive ? 'bg-primary/10 text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-surface-container-high hover:text-foreground'
              )}
              asChild={item.href !== '#'}
            >
              {item.href === '#' ? (
                <>
                  <item.icon className="mr-[12px] h-[18px] w-[18px]" />
                  {item.label}
                </>
              ) : (
                <Link href={item.href}>
                  <item.icon className="mr-[12px] h-[18px] w-[18px]" />
                  {item.label}
                </Link>
              )}
            </Button>
          );
        })}
      </nav>

      {/* Boards */}
      <div className="mt-[8px] flex-1 px-[16px]">
        <div className="flex items-center justify-between px-[12px] py-[8px]">
          <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Workspaces
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-[24px] w-[24px] text-muted-foreground"
            onClick={() => useUIStore.getState().setActiveModal('create-workspace')}
            title="Create workspace"
          >
            <Plus className="h-[14px] w-[14px]" />
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-[380px])] px-[0px]">
          {boardsLoading ? (
            <div className="space-y-[8px] p-[12px]">
              <Skeleton className="h-[32px] w-full bg-surface-container-high" />
              <Skeleton className="h-[32px] w-[90%] bg-surface-container-high" />
              <Skeleton className="h-[32px] w-[95%] bg-surface-container-high" />
            </div>
          ) : boards.length === 0 ? (
            <p className="p-[12px] text-[13px] text-muted-foreground">
              No boards found.
            </p>
          ) : (
            <div className="space-y-[2px]">
              {boards.map((board) => {
                const isActive = pathname.startsWith(`/board/${board.id}`);
                return (
                <Button
                  key={board.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start text-[14px] font-medium h-[36px] px-[12px]',
                    isActive
                      ? 'bg-primary/10 text-primary hover:bg-primary/10'
                      : 'text-muted-foreground hover:bg-surface-container-high hover:text-foreground'
                  )}
                  asChild
                >
                  <Link href={`/board/${board.id}`}>
                    <div
                      className="mr-[12px] h-[14px] w-[14px] shrink-0 rounded-[4px]"
                      style={{ backgroundColor: board.background ?? '#94a3b8' }}
                    />
                    <span className="truncate">{board.name}</span>
                  </Link>
                </Button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Bottom Profile Mini-Card & Toggle */}
      <div className="mt-auto border-t border-border p-[16px]">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="mb-[16px] flex items-center gap-[12px] rounded-[12px] bg-transparent hover:bg-surface-container-high p-[8px] cursor-pointer transition-colors">
                <div className="h-[36px] w-[36px] shrink-0 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center">
                  {user.avatarUrl ? (
                     // eslint-disable-next-line @next/next/no-img-element
                     <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-[13px] font-semibold text-primary">{initials}</span>
                  )}
                </div>
                <div className="flex flex-col overflow-hidden text-left">
                  <span className="truncate text-[13px] font-semibold text-foreground">{user.name}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{user.email}</span>
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[200px]">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.location.href = '/settings'} className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => {
                  useAuthStore.getState().logout();
                  window.location.href = '/login';
                }} 
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground h-[32px] text-[13px] px-[12px] bg-transparent"
          onClick={toggleSidebar}
        >
          <ChevronLeft className="mr-[8px] h-[16px] w-[16px]" />
          Collapse menu
        </Button>
      </div>
    </div>
  );
}
