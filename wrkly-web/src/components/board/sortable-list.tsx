'use client';

import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableListProps {
  listId: string;
  isDragOverlay?: boolean;
  children: React.ReactNode;
}

// ── SortableList ─────────────────────────────────────────────────────────────

export const SortableList = memo(function SortableList({
  listId,
  isDragOverlay = false,
  children,
}: SortableListProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: listId,
    // Mark this sortable as a "list" type to disambiguate from card sortables
    data: { type: 'list', listId },
  });

  const style = isDragOverlay
    ? undefined
    : {
        transform: CSS.Translate.toString(transform),
        transition,
      };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative shrink-0',
        isDragging && !isDragOverlay && 'opacity-40 z-0'
      )}
      {...attributes}
    >
      {/* Drag handle — only visible on list header hover. This ref is forwarded
          so ListHeader can attach it to the grip button. */}
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        tabIndex={-1}
        aria-label="Drag to reorder list"
        className={cn(
          'absolute left-1/2 top-2 z-20 -translate-x-1/2',
          'flex h-5 w-8 cursor-grab items-center justify-center rounded',
          'opacity-0 transition-opacity',
          'group-hover/list:opacity-60 hover:!opacity-100 hover:bg-muted',
          'active:cursor-grabbing',
          isDragOverlay && 'hidden'
        )}
      >
        <GripHorizontal className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* List content */}
      <div className={cn(isDragOverlay && 'rotate-2 scale-95')}>
        {children}
      </div>
    </div>
  );
});
