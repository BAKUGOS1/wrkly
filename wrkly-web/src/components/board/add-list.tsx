'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCreateList } from '@/hooks/use-lists';

// ── Types ────────────────────────────────────────────────────────────────────

interface AddListProps {
  boardId: string;
  /** The position value to assign the new list (e.g., last position + 1024). */
  nextPosition: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AddList({ boardId, nextPosition }: AddListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: createList, isPending } = useCreateList(boardId);

  // Auto-focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      await createList({ name: trimmed, position: nextPosition });
      setName(''); // Clear for rapid creation — stays open
      // Re-focus for next entry
      inputRef.current?.focus();
    } catch {
      // Handled by hook toast
    }
  }, [name, nextPosition, createList]);

  const handleClose = useCallback(() => {
    setName('');
    setIsOpen(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape') {
        handleClose();
      }
    },
    [handleSubmit, handleClose]
  );

  if (!isOpen) {
    return (
      <div className="w-[280px] shrink-0">
        <button
          onClick={() => setIsOpen(true)}
          className="flex w-full items-center rounded-xl bg-white/10 dark:bg-black/10 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground border border-transparent hover:border-border"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add another list
        </button>
      </div>
    );
  }

  return (
    <div className="w-[280px] shrink-0">
      <div className="rounded-xl bg-muted/40 p-2 border border-border shadow-sm">
        <input
          ref={inputRef}
          className="w-full rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Enter list title…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="mt-2 flex items-center gap-2">
          <Button
            size="sm"
            disabled={!name.trim() || isPending}
            onMouseDown={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            {isPending ? 'Adding…' : 'Add list'}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onMouseDown={(e) => {
              e.preventDefault();
              handleClose();
            }}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Cancel</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
