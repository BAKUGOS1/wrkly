'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronsUpDown, Check, Plus } from 'lucide-react';
import { useWorkspaces } from '@/hooks/use-workspaces';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateWorkspaceDialog } from './create-workspace-dialog';

export function WorkspaceSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { data, isLoading } = useWorkspaces();
  
  const [openDialog, setOpenDialog] = React.useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  const workspaces = data?.workspaces || [];
  
  // Try to determine the active workspace from the URL, or default to the first one
  const activeWorkspaceId = React.useMemo(() => {
    const match = pathname.match(/\/app\/workspace\/([^/]+)/);
    if (match && match[1]) {
        return match[1];
    }
    // Check if on a board page, but without board details here we can't easily resolve workspace.
    // So fallback to the first workspace if available and no specific workspace route is matched.
    return workspaces.length > 0 ? workspaces[0].id : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const handleWorkspaceSelect = (id: string) => {
    setIsDropdownOpen(false);
    router.push(`/workspace/${id}`);
  };

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={isDropdownOpen}
            aria-label="Select a workspace"
            className="w-full justify-between px-3 h-10 font-medium"
          >
            {isLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : (
              <span className="truncate">
                {activeWorkspace?.name ?? 'Select workspace'}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
            Workspaces
          </DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onSelect={() => handleWorkspaceSelect(workspace.id)}
              className="flex items-center justify-between text-sm"
            >
              <span className="truncate">{workspace.name}</span>
              {activeWorkspaceId === workspace.id && (
                <Check className="ml-2 h-4 w-4 shrink-0 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => {
              setIsDropdownOpen(false);
              setOpenDialog(true);
            }}
            className="text-primary hover:text-primary font-medium"
          >
            <div className="flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              Create New Workspace
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateWorkspaceDialog 
        open={openDialog} 
        onOpenChange={setOpenDialog} 
      />
    </>
  );
}
