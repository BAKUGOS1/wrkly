'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Menu,
  Search,
  HelpCircle,
  ChevronRight,
  UserPlus,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { NotificationDropdown } from '@/components/shared/notification-dropdown';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ── Help Panel ────────────────────────────────────────────────────────────────

const HELP_ITEMS = [
  { label: 'Getting Started Guide', href: 'https://docs.wrkly.app/getting-started' },
  { label: 'Keyboard Shortcuts', href: null, shortcut: true },
  { label: 'AI Command Reference', href: 'https://docs.wrkly.app/ai-commands' },
  { label: 'Automations Guide', href: 'https://docs.wrkly.app/automations' },
  { label: 'Report a Bug', href: 'mailto:support@wrkly.app' },
];

const SHORTCUTS = [
  { keys: '⌘K', label: 'Open Command Bar / Search' },
  { keys: '/', label: 'AI Command Mode (in Command Bar)' },
  { keys: 'Esc', label: 'Close modal / dialog' },
  { keys: 'N', label: 'New card (on board)' },
  { keys: '⌘Z', label: 'Undo last action' },
];

function HelpPopover() {
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-[36px] w-[36px] rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-container-high"
            id="help-button"
          >
            <HelpCircle className="h-[20px] w-[20px]" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-[240px] p-2">
          <p className="text-xs font-semibold text-muted-foreground px-2 py-1 uppercase tracking-wide">Help & Resources</p>
          {HELP_ITEMS.map((item, i) => (
            item.shortcut ? (
              <button
                key={i}
                onClick={() => setShortcutsOpen(true)}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                <span>{item.label}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            ) : (
              <a
                key={i}
                href={item.href ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                <span>{item.label}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            )
          ))}
        </PopoverContent>
      </Popover>

      {/* Keyboard Shortcuts Dialog */}
      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
            <DialogDescription>Quick actions at your fingertips</DialogDescription>
          </DialogHeader>
          <div className="space-y-1 mt-2">
            {SHORTCUTS.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <span className="text-sm text-foreground">{s.label}</span>
                <kbd className="inline-flex items-center rounded border bg-muted px-2 py-0.5 font-mono text-[12px] font-medium text-muted-foreground">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Invite Button ─────────────────────────────────────────────────────────────

function InviteButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="hidden lg:flex h-[32px] px-[16px] rounded-[8px] border-border text-[13px] font-medium"
        onClick={() => setOpen(true)}
        id="invite-button"
      >
        <UserPlus className="mr-[8px] h-[14px] w-[14px]" />
        Invite
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Invite a teammate
            </DialogTitle>
            <DialogDescription>
              Invite colleagues by email to join your workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 p-4 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0 text-primary" />
              <span>
                To invite members, go to <strong>Workspace Settings → Members</strong> and enter their email address.
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button
                size="sm"
                onClick={() => {
                  setOpen(false);
                  // Navigate to workspace settings
                  const match = window.location.pathname.match(/\/workspace\/([^/]+)/);
                  if (match) window.location.href = `/workspace/${match[1]}/settings`;
                  else window.location.href = '/workspaces';
                }}
              >
                Go to Settings
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Top Bar ───────────────────────────────────────────────────────────────────

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
      const wsName = parts[1].split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      crumbs.push(wsName);
      if (parts[2] === 'settings') {
        crumbs.push('Settings');
      } else {
        crumbs.push('Dashboard');
      }
    } else if (parts[0] === 'board' && parts[1]) {
      crumbs.push('Board');
    } else if (parts[0] === 'settings') {
      crumbs.push('Settings');
    } else if (parts[0] === 'my-tasks') {
      crumbs.push('My Tasks');
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
        id="search-bar"
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
        <InviteButton />
        <ThemeToggle />

        {/* Notification Bell */}
        <div className="relative">
          <NotificationDropdown />
        </div>

        {/* Help */}
        <HelpPopover />
      </div>
    </header>
  );
}
