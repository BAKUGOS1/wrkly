'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  User,
  LayoutDashboard,
  KanbanSquare,
  LogOut,
  Moon,
  Sun,
  Computer,
} from 'lucide-react';

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { useTheme } from 'next-themes';

export function CommandPalette() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const { setTheme } = useTheme();
  const commandBarOpen = useUIStore((state) => state.commandBarOpen);
  const toggleCommandBar = useUIStore((state) => state.toggleCommandBar);

  const setOpen = React.useCallback((open: boolean) => {
    if (open !== commandBarOpen) {
      toggleCommandBar();
    }
  }, [commandBarOpen, toggleCommandBar]);

  const runCommand = React.useCallback((command: () => unknown) => {
    toggleCommandBar(); // Close the palette
    command();
  }, [toggleCommandBar]);

  return (
    <CommandDialog open={commandBarOpen} onOpenChange={setOpen}>
      <CommandInput placeholder="Search boards, cards, or actions..." className="text-[14px] h-[48px]" />
      <CommandList className="bg-surface-container-low max-h-[360px]">
        <CommandEmpty>No results found.</CommandEmpty>
        
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push('/workspaces'))} className="text-[13px] py-[10px]">
            <LayoutDashboard className="mr-[12px] h-[16px] w-[16px] text-muted-foreground" />
            <span>Workspace Dashboard</span>
          </CommandItem>
          {/* We will dynamically populate boards here later */}
          <CommandItem onSelect={() => runCommand(() => router.push('/board/general'))} className="text-[13px] py-[10px]">
            <KanbanSquare className="mr-[12px] h-[16px] w-[16px] text-primary" />
            <span>General Board View</span>
          </CommandItem>
        </CommandGroup>
        
        <CommandSeparator />
        
        <CommandGroup heading="Settings & Actions">
          <CommandItem onSelect={() => runCommand(() => router.push('/settings'))} className="text-[13px] py-[10px]">
            <User className="mr-[12px] h-[16px] w-[16px] text-muted-foreground" />
            <span>Profile Settings</span>
            <CommandShortcut>⇧⌘P</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push('/board/general/settings'))} className="text-[13px] py-[10px]">
            <Settings className="mr-[12px] h-[16px] w-[16px] text-muted-foreground" />
            <span>Board Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Appearance">
          <CommandItem onSelect={() => runCommand(() => setTheme('light'))} className="text-[13px] py-[10px]">
            <Sun className="mr-[12px] h-[16px] w-[16px] text-muted-foreground" />
            <span>Light Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme('dark'))} className="text-[13px] py-[10px]">
            <Moon className="mr-[12px] h-[16px] w-[16px] text-muted-foreground" />
            <span>Dark Theme</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme('system'))} className="text-[13px] py-[10px]">
            <Computer className="mr-[12px] h-[16px] w-[16px] text-muted-foreground" />
            <span>System Theme</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Account">
          <CommandItem onSelect={() => runCommand(() => logout())} className="text-[13px] py-[10px] text-error">
            <LogOut className="mr-[12px] h-[16px] w-[16px] text-error" />
            <span className="text-error">Log Out</span>
          </CommandItem>
        </CommandGroup>

      </CommandList>
    </CommandDialog>
  );
}
