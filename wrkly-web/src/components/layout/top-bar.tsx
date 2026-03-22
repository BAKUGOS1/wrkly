'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Search,
  LogOut,
  Settings,
  User as UserIcon,
} from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { apiFetch } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


// ── Top Bar ──────────────────────────────────────────────────────────────────

export function TopBar() {
  const router = useRouter();
  const { toggleSidebar, toggleCommandBar } = useUIStore();
  const { user, logout, token } = useAuthStore();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandBar();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleCommandBar]);



  // Fetch user data if not in store
  useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<{ user: { id: string; name: string; email: string; avatarUrl?: string; createdAt: string; updatedAt: string; oauthProvider?: string; oauthId?: string } }>('/api/auth/me'),
    enabled: !!token && !user,
    select: (data: { user: { id: string; name: string; email: string; avatarUrl?: string; createdAt: string; updatedAt: string; oauthProvider?: string; oauthId?: string } }) => {
      if (data?.user && token) {
        useAuthStore.getState().setAuth(data.user, token);
      }
      return data;
    },
  });

  const initials = user?.name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() ?? '?';

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-4">
      {/* Mobile hamburger */}
      {isMobile && (
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search trigger */}
      <Button
        variant="outline"
        size="sm"
        className="hidden sm:flex items-center gap-2 text-muted-foreground px-3 h-9"
        onClick={toggleCommandBar}
      >
        <Search className="h-4 w-4" />
        <span className="text-sm">Search…</span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-4">
          ⌘K
        </kbd>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={toggleCommandBar}
      >
        <Search className="h-5 w-5" />
      </Button>

      {/* Theme toggle */}
      <ThemeToggle />

      {/* Notification bell */}
      <NotificationCenter />

      {/* User avatar dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-9 w-9 rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatarUrl ?? undefined} alt={user?.name ?? 'User'} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="flex items-center gap-2 p-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatarUrl ?? undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user?.name ?? 'User'}</span>
              <span className="text-xs text-muted-foreground">{user?.email ?? ''}</span>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <UserIcon className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
