'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MoreHorizontal,
  Pencil,
  Archive,
  Copy,
  ArrowUpDown,
  ArrowDownAZ,
  Calendar,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUpdateList } from '@/hooks/use-lists';

// ── Types ────────────────────────────────────────────────────────────────────

interface ListHeaderProps {
  boardId: string;
  listId: string;
  name: string;
  cardCount: number;
  onSort?: (sortBy: 'name' | 'dueDate' | 'created') => void;
  onArchive?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function ListHeader({
  boardId,
  listId,
  name,
  cardCount,
  onSort,
  onArchive,
}: ListHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: updateList } = useUpdateList(boardId);

  // Sync prop → local state when name changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(name);
    }
  }, [name, isEditing]);

  // Auto-focus + select on entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const submitRename = useCallback(async () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== name) {
      await updateList({ listId, data: { name: trimmed } });
    } else {
      setEditValue(name);
    }
    setIsEditing(false);
  }, [editValue, name, listId, updateList]);

  const cancelRename = useCallback(() => {
    setEditValue(name);
    setIsEditing(false);
  }, [name]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submitRename();
      }
      if (e.key === 'Escape') {
        cancelRename();
      }
    },
    [submitRename, cancelRename]
  );

  const handleArchive = useCallback(async () => {
    if (onArchive) {
      onArchive();
    } else {
      await updateList({ listId, data: { isArchived: true } });
    }
  }, [onArchive, updateList, listId]);

  return (
    <div className="flex items-center justify-between gap-1 px-3 py-2">
      {/* Name — inline edit */}
      {isEditing ? (
        <input
          ref={inputRef}
          className="w-full rounded px-2 py-1 text-sm font-semibold bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={submitRename}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <button
          className="flex-1 cursor-pointer rounded-[8px] px-[8px] py-[4px] text-left text-[14px] font-semibold transition-colors hover:bg-surface-container-high"
          onClick={() => setIsEditing(true)}
          title="Click to rename"
        >
          <span className="text-foreground">{name}</span>
          <span className="ml-[8px] px-[8px] py-[2px] rounded-full bg-surface-container-highest text-[11px] font-bold text-muted-foreground">
            {cardCount}
          </span>
        </button>
      )}

      {/* "…" Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={handleArchive}
          >
            <Archive className="mr-2 h-4 w-4" />
            Archive list
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Copy className="mr-2 h-4 w-4" />
            Copy list
            <span className="ml-auto text-[10px] text-muted-foreground">
              Soon
            </span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Sort by
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => onSort?.('name')}>
                <ArrowDownAZ className="mr-2 h-4 w-4" />
                Name
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSort?.('dueDate')}>
                <Calendar className="mr-2 h-4 w-4" />
                Due date
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSort?.('created')}>
                <Clock className="mr-2 h-4 w-4" />
                Created date
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
