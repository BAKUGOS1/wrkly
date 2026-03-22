'use client';

import { useState, useCallback } from 'react';
import { Plus, GripVertical, Trash2, LayoutTemplate } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensors,
  useSensor,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { BlockRenderer } from './block-renderer';
import { BlockTypePicker } from './block-type-picker';
import {
  useBlocks,
  useCreateBlock,
  useUpdateBlock,
  useDeleteBlock,
  useMoveBlock,
} from '@/hooks/use-blocks';
import type { Block } from '@/types';
import { cn } from '@/lib/utils';

interface BlockEditorProps {
  cardId: string;
}

// ── Position helper ───────────────────────────────────────────────────────────

function calcPosition(blocks: Block[], newIndex: number): number {
  const sorted = [...blocks].sort((a, b) => a.position - b.position);
  if (sorted.length === 0) return 1024;
  if (newIndex <= 0) return sorted[0].position / 2;
  if (newIndex >= sorted.length) return sorted[sorted.length - 1].position + 1024;
  return (sorted[newIndex - 1].position + sorted[newIndex].position) / 2;
}

// ── Sortable block row ────────────────────────────────────────────────────────

function SortableBlockRow({
  block,
  cardId,
  isDragOverlay,
}: {
  block: Block;
  cardId: string;
  isDragOverlay?: boolean;
}) {
  const { mutate: deleteBlock } = useDeleteBlock(cardId);
  const { mutate: updateBlock } = useUpdateBlock(cardId);

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = isDragOverlay
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition };

  const handleUpdate = useCallback(
    (content: Record<string, unknown>) => {
      updateBlock({ blockId: block.id, data: { content } });
    },
    [block.id, updateBlock]
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group/block relative flex gap-2',
        isDragging && !isDragOverlay && 'opacity-40'
      )}
      {...attributes}
    >
      {/* Left gutter: drag handle + delete */}
      <div className="flex w-6 shrink-0 flex-col items-center gap-1 pt-1 opacity-0 transition-opacity group-hover/block:opacity-100">
        {/* Drag handle — only activator for this sortable */}
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          tabIndex={-1}
          aria-label="Drag to reorder block"
          className="cursor-grab rounded p-0.5 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        {!isDragOverlay && (
          <button
            className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            title="Delete block"
            onClick={() => deleteBlock(block.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Block content */}
      <div className={cn('min-w-0 flex-1', isDragOverlay && 'pointer-events-none')}>
        <BlockRenderer block={block} onUpdate={handleUpdate} />
      </div>
    </div>
  );
}

// ── Block Editor ──────────────────────────────────────────────────────────────

export function BlockEditor({ cardId }: BlockEditorProps) {
  const { data, isLoading } = useBlocks(cardId);
  const { mutateAsync: createBlock } = useCreateBlock(cardId);
  const { mutate: moveBlock } = useMoveBlock(cardId);

  // Sorted server blocks
  const serverBlocks = [...(data?.blocks ?? [])].sort((a, b) => a.position - b.position);

  // Local order override during drag
  const [localBlocks, setLocalBlocks] = useState<Block[] | null>(null);
  const [activeBlock, setActiveBlock] = useState<Block | null>(null);

  const blocks = localBlocks ?? serverBlocks;

  // ── Sensors — only activate from handle, not from text content ──────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // delay+tolerance: prevents conflicts with text selection / mobile taps
      activationConstraint: { delay: 150, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const b = serverBlocks.find((b) => b.id === event.active.id);
      setActiveBlock(b ?? null);
      setLocalBlocks([...serverBlocks]);
    },
    [serverBlocks]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveBlock(null);

      if (!over || active.id === over.id) {
        setLocalBlocks(null);
        return;
      }

      if (localBlocks) {
        const oldIdx = localBlocks.findIndex((b) => b.id === active.id);
        const newIdx = localBlocks.findIndex((b) => b.id === over.id);

        if (oldIdx !== -1 && newIdx !== -1) {
          const reordered = arrayMove(localBlocks, oldIdx, newIdx);
          setLocalBlocks(reordered);

          // Calculate fractional position
          const otherBlocks = reordered.filter((b) => b.id !== active.id);
          const position = calcPosition(otherBlocks, newIdx);
          moveBlock({ blockId: String(active.id), position });
        }
      }

      // Let server data take over after mutation completes
      setLocalBlocks(null);
    },
    [localBlocks, moveBlock]
  );

  const handleDragCancel = useCallback(() => {
    setLocalBlocks(null);
    setActiveBlock(null);
  }, []);

  const handleAddBlock = useCallback(
    async (type: Block['type']) => {
      await createBlock({ type, content: {} });
    },
    [createBlock]
  );

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 rounded-md bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <LayoutTemplate className="h-4 w-4 shrink-0 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">
          Content Blocks
          {blocks.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({blocks.length})
            </span>
          )}
        </h3>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/10 px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No content blocks yet. Add one below.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {blocks.map((block) => (
                <SortableBlockRow key={block.id} block={block} cardId={cardId} />
              ))}
            </div>
          )}
        </SortableContext>

        {/* Drag overlay — ghost of the block at cursor */}
        <DragOverlay dropAnimation={{ duration: 120, easing: 'ease-out' }}>
          {activeBlock ? (
            <div className="rounded-lg border border-primary/30 bg-card/90 shadow-2xl shadow-black/20 backdrop-blur-sm opacity-95">
              <SortableBlockRow block={activeBlock} cardId={cardId} isDragOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Add block button */}
      <BlockTypePicker
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add block
          </Button>
        }
        onSelect={handleAddBlock}
      />
    </div>
  );
}
