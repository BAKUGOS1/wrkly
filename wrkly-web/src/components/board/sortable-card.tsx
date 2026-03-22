'use client';

import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { CardItem } from './card-item';
import { cn } from '@/lib/utils';

interface SortableCardProps {
  card: {
    id: string;
    [key: string]: unknown;
  };
  isDragOverlay?: boolean;
  onClick?: (cardId: string) => void;
}

// ── SortableCard ─────────────────────────────────────────────────────────────

export const SortableCard = memo(function SortableCard({
  card,
  isDragOverlay = false,
  onClick,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={isDragOverlay ? undefined : style}
      className={cn(
        'relative group/sortable',
        isDragging && !isDragOverlay && 'opacity-40 z-0'
      )}
      {...attributes}
    >
      {/* Drag handle — only visible on hover */}
      {!isDragOverlay && (
        <button
          {...listeners}
          tabIndex={-1}
          className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 flex h-6 w-5 cursor-grab items-center justify-center rounded opacity-0 transition-opacity group-hover/sortable:opacity-60 hover:!opacity-100 hover:bg-muted active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      )}

      {/* Card content — shifted right to make room for the grip */}
      <div className={cn(!isDragOverlay && 'pl-4')}>
        <CardItem
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          card={card as any}
          onClick={isDragOverlay ? undefined : onClick}
        />
      </div>
    </div>
  );
});
