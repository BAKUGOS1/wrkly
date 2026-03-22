'use client';

import { useEffect, useCallback } from 'react';
import {
  X,
  Archive,
  Tag,
  ArrowRight,
  Calendar,
  Loader2,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUIStore } from '@/stores/ui-store';
import {
  useBulkMoveCards,
  useBulkAddLabel,
  useBulkArchive,
  useBulkSetDueDate,
} from '@/hooks/use-bulk-actions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ── Toolbar ───────────────────────────────────────────────────────────────────

interface MultiSelectToolbarProps {
  boardId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lists: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  labels?: any[];
  // All visible card ids — used for Cmd+A select-all
  allCardIds?: string[];
}

export function MultiSelectToolbar({
  boardId,
  lists,
  labels = [],
  allCardIds = [],
}: MultiSelectToolbarProps) {
  const { selectedCardIds, clearSelection, selectCards } = useUIStore();
  const count = selectedCardIds.size;

  const { mutateAsync: bulkMove, isPending: isMoving } = useBulkMoveCards(boardId);
  const { mutateAsync: bulkAddLabel, isPending: isLabelling } = useBulkAddLabel(boardId);
  const { mutateAsync: bulkArchive, isPending: isArchiving } = useBulkArchive(boardId);
  const { mutateAsync: bulkDueDate, isPending: isSettingDate } = useBulkSetDueDate(boardId);

  const isLoading = isMoving || isLabelling || isArchiving || isSettingDate;
  const cardIds = Array.from(selectedCardIds);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isEditable =
        tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;

      if (e.key === 'Escape') {
        clearSelection();
        return;
      }

      // Cmd+A / Ctrl+A: select all visible cards (when not in an input)
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && !isEditable) {
        e.preventDefault();
        selectCards(allCardIds);
        return;
      }

      // Delete / Backspace: bulk archive when cards are selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && count > 0 && !isEditable) {
        e.preventDefault();
        bulkArchive({ cardIds }).then(() => clearSelection());
      }
    },
    [clearSelection, selectCards, allCardIds, count, bulkArchive, cardIds]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Don't render if nothing selected
  if (count === 0) return null;

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleMove = async (targetListId: string) => {
    await bulkMove({ cardIds, targetListId });
    clearSelection();
  };

  const handleLabel = async (labelId: string) => {
    await bulkAddLabel({ cardIds, labelId });
    clearSelection();
  };

  const handleArchive = async () => {
    await bulkArchive({ cardIds });
    clearSelection();
  };

  const handleDueDate = async (date: string) => {
    await bulkDueDate({ cardIds, dueDate: date || null });
    clearSelection();
  };

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 z-50 -translate-x-1/2',
        'flex items-center gap-2 rounded-xl px-4 py-2.5',
        'border border-primary/20 bg-background/95 shadow-2xl ring-1 ring-primary/10 backdrop-blur-sm',
        'animate-in slide-in-from-bottom-4 duration-200'
      )}
    >
      {/* Count badge */}
      <div className="flex items-center gap-1.5 pr-3 border-r border-border">
        <CheckSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">
          {count} {count === 1 ? 'card' : 'cards'}
        </span>
      </div>

      {/* Move to list */}
      <Select onValueChange={handleMove} disabled={isLoading}>
        <SelectTrigger className="h-8 w-auto gap-1.5 border-0 bg-transparent px-2 text-xs font-medium hover:bg-muted">
          <ArrowRight className="h-3.5 w-3.5 shrink-0" />
          <SelectValue placeholder="Move to…" />
        </SelectTrigger>
        <SelectContent>
          {lists.map((l) => (
            <SelectItem key={l.id} value={l.id} className="text-xs">
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Add label */}
      {labels.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs"
              disabled={isLoading}
            >
              <Tag className="h-3.5 w-3.5" />
              Label
            </Button>
          </PopoverTrigger>
          <PopoverContent align="center" className="w-48 p-2" sideOffset={8}>
            <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">
              Apply label to {count} {count === 1 ? 'card' : 'cards'}
            </p>
            <div className="flex flex-col gap-0.5">
              {labels.map((label) => (
                <button
                  key={label.id}
                  className="flex items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
                  onClick={() => handleLabel(label.id)}
                >
                  <span
                    className="h-3 w-5 shrink-0 rounded-sm"
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Set due date */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-xs"
            disabled={isLoading}
          >
            <Calendar className="h-3.5 w-3.5" />
            Due date
          </Button>
        </PopoverTrigger>
        <PopoverContent align="center" className="w-auto p-3" sideOffset={8}>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Set due date for {count} {count === 1 ? 'card' : 'cards'}
          </p>
          <input
            type="date"
            className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            min={format(new Date(), 'yyyy-MM-dd')}
            onChange={(e) => handleDueDate(e.target.value)}
          />
        </PopoverContent>
      </Popover>

      {/* Divider */}
      <div className="h-5 w-px bg-border mx-0.5" />

      {/* Archive */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={handleArchive}
        disabled={isLoading}
      >
        {isArchiving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Archive className="h-3.5 w-3.5" />
        )}
        Archive
      </Button>

      {/* Clear selection */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        onClick={clearSelection}
        title="Clear selection (Esc)"
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Clear selection</span>
      </Button>
    </div>
  );
}

// ── Selectable card overlay wrapper ───────────────────────────────────────────

/**
 * Wraps any card child and adds shift-click selection with a visual overlay.
 * Use this to wrap SortableCard (or any card element) in the board list.
 */
interface SelectableCardWrapperProps {
  cardId: string;
  children: React.ReactNode;
  className?: string;
}

export function SelectableCardWrapper({
  cardId,
  children,
  className,
}: SelectableCardWrapperProps) {
  const { selectedCardIds, toggleCardSelection } = useUIStore();
  const isSelected = selectedCardIds.has(cardId);

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      toggleCardSelection(cardId);
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-lg transition-all',
        isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
        className
      )}
      onClick={handleClick}
    >
      {/* Blue checkmark overlay when selected */}
      {isSelected && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-end rounded-lg">
          <div className="m-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary shadow-sm">
            <svg
              viewBox="0 0 12 12"
              className="h-3 w-3 fill-primary-foreground"
            >
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
