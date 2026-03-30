'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Menu,
  Search,
  HelpCircle,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import { NotificationDropdown } from '@/components/shared/notification-dropdown';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';


// ── Top Bar ──────────────────────────────────────────────────────────────────

export function TopBar() {
  const pathname = usePathname();
  const { toggleSidebar, toggleCommandBar } = useUIStore();
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

  // Dynamic breadcrumbs based on pathname
  const getBreadcrumbs = (): string[] => {
    const parts = pathname.split('/').filter(Boolean);
    const crumbs: string[] = [];

    if (parts[0] === 'workspaces') {
      crumbs.push('Workspaces');
    } else if (parts[0] === 'workspace' && parts[1]) {
      // Capitalize workspace slug for display
      const wsName = parts[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      crumbs.push(wsName);
      crumbs.push('Dashboard');
    } else if (parts[0] === 'board' && parts[1]) {
      crumbs.push('Board');
    } else if (parts[0] === 'settings') {
      crumbs.push('Settings');
    } else if (parts[0] === 'forgot-password') {
      crumbs.push('Forgot Password');
    } else if (parts[0] === 'reset-password') {
      crumbs.push('Reset Password');
    } else {
      crumbs.push('Home');
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="flex h-[64px] items-center gap-[16px] border-b border-border bg-background px-[24px]">
      {/* Mobile hamburger */}
      {isMobile && (
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="h-[20px] w-[20px]" />
        </Button>
      )}

      {/* Left: Breadcrumbs */}
      <div className="hidden md:flex items-center text-[14px] text-muted-foreground font-medium">
        {breadcrumbs.map((crumb, idx) => (
          <div key={idx} className="flex items-center">
            {idx > 0 && <ChevronRight className="mx-[8px] h-[14px] w-[14px] opacity-50" />}
            <span className={idx === breadcrumbs.length - 1 ? "text-foreground" : "hover:text-foreground cursor-pointer transition-colors"}>
              {crumb}
            </span>
          </div>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Middle: Global Search Pill */}
      <div
        className="hidden max-w-[320px] flex-1 sm:flex items-center h-[36px] bg-surface-container-high hover:bg-surface-variant transition-colors rounded-full px-[16px] border border-transparent hover:border-border cursor-pointer text-muted-foreground"
        onClick={toggleCommandBar}
      >
        <Search className="h-[16px] w-[16px] mr-[12px] opacity-70" />
        <span className="text-[14px] flex-1">Search anything...</span>
        <kbd className="pointer-events-none inline-flex h-[20px] select-none items-center gap-[4px] rounded-[4px] bg-background/50 px-[6px] font-mono text-[11px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={toggleCommandBar}
      >
        <Search className="h-[20px] w-[20px]" />
      </Button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: Actions */}
      <div className="flex items-center gap-[12px]">
        <Button variant="outline" size="sm" className="hidden lg:flex h-[32px] px-[16px] rounded-[8px] border-border text-[13px] font-medium">
          <UserPlus className="mr-[8px] h-[14px] w-[14px]" />
          Invite
        </Button>

        <ThemeToggle />

        {/* Notification Bell */}
        <div className="relative">
          <NotificationDropdown />
        </div>

        {/* Help */}
        <Button variant="ghost" size="icon" className="h-[36px] w-[36px] rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-container-high">
          <HelpCircle className="h-[20px] w-[20px]" />
        </Button>
      </div>
    </header>
  );
}
