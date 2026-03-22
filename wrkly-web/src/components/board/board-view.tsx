'use client';

import { useState, useCallback, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensors,
  useSensor,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { AddList } from './add-list';
import { ListColumn } from './list-column';
import { SortableCard } from './sortable-card';
import { SortableList } from './sortable-list';
import { type BoardFilters, EMPTY_FILTERS } from './board-filter-bar';
import { MultiSelectToolbar } from './multi-select-toolbar';
import { useUIStore } from '@/stores/ui-store';
import { useMoveCard } from '@/hooks/use-cards';
import { useSocket } from '@/hooks/use-socket';
import { useBoardRealtime } from '@/hooks/use-board-realtime';
import { useMoveList } from '@/hooks/use-lists';

// ── Types ─────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCard = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyList = any;

interface ActiveItem {
  type: 'card' | 'list';
  data: AnyCard | AnyList;
  sourceListId?: string;
}

// ── Position helpers ──────────────────────────────────────────────────────────

function calcCardPosition(cards: AnyCard[], newIndex: number): number {
  const sorted = [...cards].sort((a, b) => a.position - b.position);
  if (sorted.length === 0) return 1024;
  if (newIndex <= 0) return sorted[0].position / 2;
  if (newIndex >= sorted.length) return sorted[sorted.length - 1].position + 1024;
  return (sorted[newIndex - 1].position + sorted[newIndex].position) / 2;
}

function calcListPosition(lists: AnyList[], newIndex: number): number {
  const sorted = [...lists].sort((a, b) => a.position - b.position);
  if (sorted.length === 0) return 1024;
  if (newIndex <= 0) return sorted[0].position / 2;
  if (newIndex >= sorted.length) return sorted[sorted.length - 1].position + 1024;
  return (sorted[newIndex - 1].position + sorted[newIndex].position) / 2;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BoardView({
  board,
  filters,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  board: any;
  filters?: BoardFilters;
}) {
  const activeFilters = filters ?? EMPTY_FILTERS;
  useUIStore(); // Store subscription if necessary

  // Real-time: connect socket + join board room, then sync cache
  useSocket(board.id);
  useBoardRealtime(board.id);

  const { mutate: moveCard } = useMoveCard(board.id);
  const { mutate: moveList } = useMoveList(board.id);

  // ── Active drag item ──────────────────────────────────────────────────────
  const [activeItem, setActiveItem] = useState<ActiveItem | null>(null);

  // Local state for optimistic visual feedback during drags
  const [localLists, setLocalLists] = useState<AnyList[] | null>(null);
  // Ref to avoid stale closure reads
  const boardRef = useRef(board);
  boardRef.current = board;

  // Working list: local override during drags, board data otherwise
  const baseLists: AnyList[] = (
    localLists ?? (board.lists?.filter((l: AnyList) => !l.isArchived) ?? [])
  ).sort((a: AnyList, b: AnyList) => a.position - b.position);

  const nextPosition = baseLists.length * 1024 + 1024;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Helpers ───────────────────────────────────────────────────────────────

  const isListDrag = (event: { active: { data: { current?: { type?: string } } } }) =>
    event.active.data.current?.type === 'list';

  const findListOfCard = (cardId: string, lists: AnyList[]) =>
    lists.find((l: AnyList) => l.cards?.some((c: AnyCard) => c.id === cardId));

  // ── onDragStart ───────────────────────────────────────────────────────────
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const currentLists: AnyList[] = boardRef.current.lists?.filter((l: AnyList) => !l.isArchived) ?? [];

    if (isListDrag(event)) {
      const list = currentLists.find((l: AnyList) => l.id === event.active.id);
      setActiveItem({ type: 'list', data: list });
      setLocalLists(currentLists.map((l: AnyList) => ({ ...l, cards: [...(l.cards ?? [])] })));
    } else {
      const sourceList = findListOfCard(String(event.active.id), currentLists);
      const card = sourceList?.cards?.find((c: AnyCard) => c.id === event.active.id);
      setActiveItem({ type: 'card', data: card, sourceListId: sourceList?.id });
      setLocalLists(currentLists.map((l: AnyList) => ({ ...l, cards: [...(l.cards ?? [])] })));
    }
  }, []);

  // ── onDragOver ────────────────────────────────────────────────────────────
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // List drag — reorder lists horizontally in local state
    if (isListDrag(event)) {
      setLocalLists((prev) => {
        if (!prev) return prev;
        const lists = prev.map((l: AnyList) => ({ ...l }));
        const oldIdx = lists.findIndex((l: AnyList) => l.id === active.id);
        const newIdx = lists.findIndex((l: AnyList) => l.id === over.id);
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
        return arrayMove(lists, oldIdx, newIdx);
      });
      return;
    }

    // Card drag — handle same-list reorder and cross-list moves
    setLocalLists((prev) => {
      if (!prev) return prev;
      const lists = prev.map((l: AnyList) => ({ ...l, cards: [...(l.cards ?? [])] }));

      const activeListIdx = lists.findIndex((l: AnyList) =>
        l.cards.some((c: AnyCard) => c.id === active.id)
      );
      if (activeListIdx === -1) return prev;

      // Find destination: a card id or a list id (empty list droppable)
      let overListIdx = lists.findIndex((l: AnyList) =>
        l.cards.some((c: AnyCard) => c.id === over.id)
      );
      if (overListIdx === -1) {
        overListIdx = lists.findIndex((l: AnyList) => l.id === over.id);
      }
      if (overListIdx === -1) return prev;

      if (activeListIdx === overListIdx) {
        // Same list — reorder
        const cards = lists[activeListIdx].cards;
        const oldIdx = cards.findIndex((c: AnyCard) => c.id === active.id);
        const newIdx = cards.findIndex((c: AnyCard) => c.id === over.id);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          lists[activeListIdx].cards = arrayMove(cards, oldIdx, newIdx);
        }
      } else {
        // Cross-list
        const fromCards = lists[activeListIdx].cards;
        const cardIdx = fromCards.findIndex((c: AnyCard) => c.id === active.id);
        if (cardIdx === -1) return prev;
        const [card] = fromCards.splice(cardIdx, 1);

        const toCards = lists[overListIdx].cards;
        const overCardIdx = toCards.findIndex((c: AnyCard) => c.id === over.id);
        if (overCardIdx === -1) {
          toCards.push(card);
        } else {
          toCards.splice(overCardIdx, 0, card);
        }
      }

      return lists;
    });
  }, []);

  // ── onDragEnd ─────────────────────────────────────────────────────────────
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active } = event;

      if (isListDrag(event)) {
        // Commit list reorder
        if (localLists) {
          const newIdx = localLists.findIndex((l: AnyList) => l.id === active.id);
          const otherLists = localLists.filter((l: AnyList) => l.id !== active.id);
          const position = calcListPosition(otherLists, newIdx);
          moveList({ listId: String(active.id), position });
        }
      } else {
        // Commit card move
        if (localLists) {
          const destList = localLists.find((l: AnyList) =>
            l.cards?.some((c: AnyCard) => c.id === active.id)
          );
          if (destList) {
            const sortedCards = [...destList.cards].sort((a, b) => a.position - b.position);
            const newIdx = sortedCards.findIndex((c: AnyCard) => c.id === active.id);
            const otherCards = sortedCards.filter((c: AnyCard) => c.id !== active.id);
            const position = calcCardPosition(otherCards, newIdx);
            moveCard({ cardId: String(active.id), listId: destList.id, position });
          }
        }
      }

      setLocalLists(null);
      setActiveItem(null);
    },
    [localLists, moveCard, moveList]
  );

  const handleDragCancel = useCallback(() => {
    setLocalLists(null);
    setActiveItem(null);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  // Overlay content
  const overlayContent = () => {
    if (!activeItem) return null;
    if (activeItem.type === 'list') {
      return (
        <div className="w-[280px] opacity-90 shadow-2xl shadow-black/40">
          <div className="rotate-2 scale-95 origin-top">
            <ListColumn
              boardId={board.id}
              list={activeItem.data}
              filters={activeFilters}
              isDragOver={false}
            />
          </div>
        </div>
      );
    }
    return (
      <div className="rotate-1 shadow-2xl shadow-black/30 opacity-95 w-[272px]">
        <SortableCard card={activeItem.data} isDragOverlay />
      </div>
    );
  };

  // Track which list is being hovered (for card drags)
  const overListId =
    activeItem?.type === 'card' && localLists
      ? localLists.find((l: AnyList) =>
          l.cards?.some((c: AnyCard) => c.id === activeItem.data?.id)
        )?.id
      : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Horizontal SortableContext for list reordering */}
      <SortableContext
        items={baseLists.map((l: AnyList) => l.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="flex h-full w-full overflow-x-auto snap-x snap-mandatory sm:snap-none px-4 pb-4 gap-3 bg-transparent hide-scrollbar">
          {baseLists.map((list: AnyList) => (
            <SortableList key={list.id} listId={list.id}>
              <div className="group/list">
                <ListColumn
                  boardId={board.id}
                  list={list}
                  filters={activeFilters}
                  isDragOver={
                    activeItem?.type === 'card' && overListId === list.id
                  }
                />
              </div>
            </SortableList>
          ))}

          <AddList boardId={board.id} nextPosition={nextPosition} />
        </div>
      </SortableContext>

      {/* Ghost overlay */}
      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease-out' }}>
        {overlayContent()}
      </DragOverlay>

      {/* Multi-select bulk action toolbar */}
      <MultiSelectToolbar
        boardId={board.id}
        lists={baseLists}
        labels={board.labels ?? []}
        allCardIds={baseLists.flatMap((l: AnyList) => (l.cards ?? []).map((c: AnyCard) => c.id))}
      />
    </DndContext>
  );
}
