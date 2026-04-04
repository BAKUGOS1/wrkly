'use client';

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';
import { Plus, X, Tag, User, Calendar, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { SortableCard } from './sortable-card';
import { ListHeader } from './list-header';
import { cardMatchesFilters, type BoardFilters, EMPTY_FILTERS } from './board-filter-bar';
import { useCreateCard, useUpdateCard } from '@/hooks/use-cards';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CreateFromTemplateButton } from './card-template-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────

interface QuickFields {
  labelIds: string[];
  assigneeIds: string[];
  dueDate: string | null;
}

const EMPTY_QUICK: QuickFields = { labelIds: [], assigneeIds: [], dueDate: null };

// ── Auto-growing textarea hook ────────────────────────────────────────────────

function useAutoGrow(ref: React.RefObject<HTMLTextAreaElement>, value: string) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [ref, value]);
}

// ── Inline card creation form ────────────────────────────────────────────────

interface AddCardFormProps {
  boardId: string;
  listId: string;
  // Labels and members from the board for quick pickers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  boardLabels?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  boardMembers?: any[];
  nextPosition: number;
  onClose: () => void;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}

function AddCardForm({
  boardId,
  listId,
  boardLabels = [],
  nextPosition,
  onClose,
  scrollContainerRef,
}: AddCardFormProps) {
  const [title, setTitle] = useState('');
  const [quick, setQuick] = useState<QuickFields>(EMPTY_QUICK);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const { mutateAsync: createCard } = useCreateCard(boardId, listId);
  const { mutate: updateCard } = useUpdateCard(boardId);

  useAutoGrow(textareaRef, title);

  // Focus textarea on mount + scroll into view
  useEffect(() => {
    textareaRef.current?.focus();
    // Scroll the list so the form is visible
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleCreate = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { card } = await createCard({ title: trimmed, position: nextPosition });
      // Apply quick fields if any were set
      const hasQuickFields =
        quick.labelIds.length > 0 || quick.assigneeIds.length > 0 || quick.dueDate;
      if (hasQuickFields && card?.id) {
        updateCard({
          cardId: card.id,
          data: {
            ...(quick.dueDate && { dueDate: quick.dueDate }),
            ...(quick.labelIds.length && { labelIds: quick.labelIds }),
            ...(quick.assigneeIds.length && { assigneeIds: quick.assigneeIds }),
          },
        });
      }
      // Reset and stay open for rapid card creation
      setTitle('');
      setQuick(EMPTY_QUICK);
      textareaRef.current?.focus();
      // Scroll to bottom of list to keep the form visible
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [title, isSubmitting, nextPosition, quick, createCard, updateCard, scrollContainerRef]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCreate();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const toggleLabel = (labelId: string) => {
    setQuick((q) => ({
      ...q,
      labelIds: q.labelIds.includes(labelId)
        ? q.labelIds.filter((id) => id !== labelId)
        : [...q.labelIds, labelId],
    }));
  };

  return (
    <div
      ref={formRef}
      className="rounded-lg border border-primary/30 bg-card shadow-md p-2 flex flex-col gap-2"
    >
      {/* Auto-growing textarea */}
      <textarea
        ref={textareaRef}
        className="w-full resize-none border-none bg-transparent text-sm leading-snug focus:outline-none min-h-[56px] max-h-48 overflow-y-auto placeholder:text-muted-foreground"
        placeholder="Card title… (Enter to add, Shift+Enter for new line)"
        value={title}
        rows={2}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      {/* Quick action chips — selected fields shown below textarea */}
      {(quick.labelIds.length > 0 || quick.dueDate) && (
        <div className="flex flex-wrap items-center gap-1.5 px-0.5">
          {quick.labelIds.map((id) => {
            const label = boardLabels.find((l) => l.id === id);
            return label ? (
              <span
                key={id}
                className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-white"
                style={{ backgroundColor: label.color }}
              >
                {label.name || '·'}
                <button onClick={() => toggleLabel(id)} className="opacity-70 hover:opacity-100">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ) : null;
          })}
          {quick.dueDate && (
            <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(quick.dueDate), 'MMM d')}
              <button
                onClick={() => setQuick((q) => ({ ...q, dueDate: null }))}
                className="opacity-70 hover:opacity-100"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* Bottom row: quick action buttons + Add/Cancel */}
      <div className="flex items-center gap-1">
        {/* Labels quick picker */}
        {boardLabels.length > 0 && (
          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded p-0.5 transition-colors',
                  quick.labelIds.length > 0
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                title="Add labels"
              >
                <Tag className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-52 p-2" sideOffset={4}>
              <p className="px-1 pb-1 text-xs font-medium text-muted-foreground">Labels</p>
              <div className="flex flex-col gap-0.5">
                {boardLabels.map((label) => {
                  const selected = quick.labelIds.includes(label.id);
                  return (
                    <button
                      key={label.id}
                      className="flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                      onClick={() => toggleLabel(label.id)}
                    >
                      <span
                        className="h-3 w-8 shrink-0 rounded-sm"
                        style={{ backgroundColor: label.color }}
                      />
                      <span className="flex-1 text-xs">
                        {label.name || 'No name'}
                      </span>
                      {selected && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Due date quick picker */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded p-0.5 transition-colors',
                quick.dueDate
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title="Set due date"
            >
              <Calendar className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-3" sideOffset={4}>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Due date</p>
            <input
              type="date"
              className="rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              value={quick.dueDate ?? ''}
              onChange={(e) =>
                setQuick((q) => ({ ...q, dueDate: e.target.value || null }))
              }
            />
            {quick.dueDate && (
              <button
                className="mt-2 block text-xs text-destructive hover:underline"
                onClick={() => setQuick((q) => ({ ...q, dueDate: null }))}
              >
                Remove date
              </button>
            )}
          </PopoverContent>
        </Popover>

        {/* Member picker placeholder - visually present */}
        <button
          className="flex h-6 w-6 items-center justify-center rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Assign member (open card after creation)"
          disabled
        >
          <User className="h-3.5 w-3.5" />
        </button>

        <div className="flex-1" />

        {/* Add button */}
        <Button
          size="sm"
          className="h-7 px-3 text-xs"
          onClick={handleCreate}
          disabled={!title.trim() || isSubmitting}
        >
          Add
        </Button>

        {/* Cancel button */}
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground"
          onClick={onClose}
          tabIndex={-1}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Cancel</span>
        </Button>
      </div>
    </div>
  );
}

// ── List Column ───────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ListColumn({ boardId, list, filters, isDragOver }: {
  boardId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list: any;
  filters?: BoardFilters;
  isDragOver?: boolean;
}) {
  const activeFilters = filters ?? EMPTY_FILTERS;
  const router = useRouter();
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'dueDate' | 'created' | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Make the column droppable so empty lists accept cards
  const { setNodeRef: setDropRef } = useDroppable({ id: list.id });

  // Filter + sort cards
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sortedCards = [...(list.cards ?? [])]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((card: any) => cardMatchesFilters(card, activeFilters))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .sort((a: any, b: any) => {
      if (!sortBy) return a.position - b.position;
      if (sortBy === 'name') return (a.title ?? '').localeCompare(b.title ?? '');
      if (sortBy === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

  const nextPosition = (list.cards?.length ?? 0) * 1024 + 1024;

  const openAddCard = useCallback(() => {
    setIsAddingCard(true);
    // Scroll to bottom so form is visible immediately
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
  }, []);

  const closeAddCard = useCallback(() => setIsAddingCard(false), []);

  return (
    <div
      className={cn(
        'flex h-full max-h-[calc(100vh-140px)] w-[280px] shrink-0 flex-col rounded-[12px] pb-[8px] transition-colors',
        isDragOver ? 'bg-primary/5 ring-1 ring-primary/20' : 'bg-transparent'
      )}
    >
      {/* Header */}
      <ListHeader
        boardId={boardId}
        listId={list.id}
        name={list.name}
        cardCount={list.cards?.length ?? 0}
        onSort={(s) => setSortBy(s)}
      />

      {/* Cards Scroll Area */}
      <div
        ref={(node) => {
          // Attach both scroll ref and droppable ref
          (scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
          setDropRef(node);
        }}
        className="flex-1 overflow-y-auto px-2 pb-1 scrollbar-thin scrollbar-thumb-muted-foreground/20"
      >
        <SortableContext
          items={sortedCards.map((c: { id: string }) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2 py-1">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {sortedCards.map((card: any) => (
              <SortableCard
                key={card.id}
                card={card}
                onClick={(id: string) =>
                  router.push(`?card=${id}`)
                }
              />
            ))}

            {/* Inline card creation form — appears at bottom of card list */}
            {isAddingCard && (
              <AddCardForm
                boardId={boardId}
                listId={list.id}
                boardLabels={list.board?.labels ?? []}
                nextPosition={nextPosition}
                onClose={closeAddCard}
                scrollContainerRef={scrollRef}
              />
            )}
          </div>
        </SortableContext>
      </div>

      {/* Footer: "Add a card" button — hidden when form is open */}
      {!isAddingCard && (
        <div className="px-[8px] pt-[4px]">
          <Button
            variant="ghost"
            className="w-full justify-start text-[13px] font-medium text-muted-foreground hover:bg-surface-container-high hover:text-foreground rounded-[8px] h-[36px]"
            onClick={openAddCard}
          >
            <Plus className="mr-[8px] h-[16px] w-[16px]" />
            Add a card
          </Button>
          <CreateFromTemplateButton boardId={boardId} listId={list.id} nextPosition={nextPosition} />
        </div>
      )}
    </div>
  );
}
