'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutGrid,
  Plus,
  Calendar,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { useUIStore } from '@/stores/ui-store';
import { useSearch } from '@/hooks/use-search';

// ── Types ────────────────────────────────────────────────────────────────────

interface SearchResultCard {
  id: string;
  title: string;
  listName?: string;
  boardId: string;
  boardName?: string;
  labels?: { color: string; name?: string }[];
  dueDate?: string | null;
}

interface SearchResponse {
  results: {
    board: { id: string; name: string };
    cards: SearchResultCard[];
  }[];
}

// ── Component ────────────────────────────────────────────────────────────────

export function SearchDialog() {
  const router = useRouter();
  const { commandBarOpen, toggleCommandBar } = useUIStore();
  const [query, setQuery] = useState('');

  // Use debounced search hook
  const { data, isLoading, isFetching } = useSearch(query);

  // Cast to our expected grouped shape
  const searchResults = (data as unknown as SearchResponse)?.results ?? [];
  const hasQuery = query.trim().length >= 2;
  const showLoading = hasQuery && (isLoading || isFetching);
  const hasResults = searchResults.length > 0;

  // Reset query when dialog closes
  useEffect(() => {
    if (!commandBarOpen) {
      setQuery('');
    }
  }, [commandBarOpen]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandBar();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toggleCommandBar]);

  const handleSelect = useCallback(
    (boardId: string, cardId: string) => {
      toggleCommandBar();
      router.push(`/board/${boardId}?card=${cardId}`);
    },
    [router, toggleCommandBar]
  );

  const handleQuickAction = useCallback(
    (action: string) => {
      toggleCommandBar();
      if (action === 'create-board') {
        useUIStore.getState().setActiveModal('create-board');
      } else if (action === 'create-workspace') {
        useUIStore.getState().setActiveModal('create-workspace');
      }
    },
    [toggleCommandBar]
  );

  return (
    <CommandDialog open={commandBarOpen} onOpenChange={toggleCommandBar}>
      <CommandInput
        placeholder="Search cards, boards, or type a command…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {/* Loading state */}
        {showLoading && (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Searching…
          </div>
        )}

        {/* No results */}
        {hasQuery && !showLoading && !hasResults && (
          <CommandEmpty>
            <div className="flex flex-col items-center gap-1">
              <Search className="h-8 w-8 text-muted-foreground/50" />
              <span>No cards found for &apos;{query}&apos;</span>
            </div>
          </CommandEmpty>
        )}

        {/* Search results grouped by board */}
        {hasQuery &&
          !showLoading &&
          hasResults &&
          searchResults.map((group) => (
            <CommandGroup key={group.board.id} heading={group.board.name}>
              {group.cards.map((card) => (
                <CommandItem
                  key={card.id}
                  value={`${card.title} ${card.listName ?? ''}`}
                  onSelect={() => handleSelect(card.boardId, card.id)}
                  className="flex items-center gap-3"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {card.title}
                    </span>
                    {card.listName && (
                      <span className="block truncate text-xs text-muted-foreground">
                        in {card.listName}
                      </span>
                    )}
                  </div>

                  {/* Label dots */}
                  {card.labels && card.labels.length > 0 && (
                    <div className="flex shrink-0 items-center gap-0.5">
                      {card.labels.slice(0, 4).map((label, i) => (
                        <span
                          key={i}
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: label.color }}
                          title={label.name ?? undefined}
                        />
                      ))}
                    </div>
                  )}

                  {/* Due date */}
                  {card.dueDate && (
                    <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(card.dueDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

        {/* Quick actions (shown when no query) */}
        {!hasQuery && (
          <>
            <CommandGroup heading="Quick Actions">
              <CommandItem onSelect={() => handleQuickAction('create-board')}>
                <Plus className="mr-2 h-4 w-4" />
                Create new board
              </CommandItem>
              <CommandItem
                onSelect={() => handleQuickAction('create-workspace')}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Create new workspace
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Tip">
              <div className="px-2 py-3 text-xs text-muted-foreground">
                Start typing to search across all your cards and boards.
                <br />
                Use{' '}
                <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                  ⌘K
                </kbd>{' '}
                to toggle this dialog anytime.
              </div>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
