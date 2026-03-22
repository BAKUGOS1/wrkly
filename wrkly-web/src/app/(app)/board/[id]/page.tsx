"use client";

import { useState } from "react";
import { useBoard } from "@/hooks/use-boards";
import { BoardView } from "@/components/board/board-view";
import {
  BoardFilterBar,
  EMPTY_FILTERS,
  cardMatchesFilters,
  type BoardFilters,
} from "@/components/board/board-filter-bar";
import type { FilterOption } from "@/components/board/filter-popover";
import { Skeleton } from "@/components/ui/skeleton";
import { LayoutGrid, MoreHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { CardDetailModal } from "@/components/board/card-detail-modal";

export default function BoardPage({ params }: { params: { id: string } }) {
  const { data, isLoading, error } = useBoard(params.id);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const cardId = searchParams.get("card");
  const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex flex-1 gap-4 p-4">
          <Skeleton className="h-[80vh] w-[280px] rounded-xl" />
          <Skeleton className="h-[80vh] w-[280px] rounded-xl" />
          <Skeleton className="h-[80vh] w-[280px] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data?.board) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <LayoutGrid className="mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="text-2xl font-bold tracking-tight">Board not found</h2>
        <p className="mt-2 text-muted-foreground">
          The board might have been deleted or you don&apos;t have access.
        </p>
      </div>
    );
  }

  const board = data.board;

  // Derive filter options from board data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const labelOptions: FilterOption[] =
    (board as any).labels?.map((l: any) => ({
      id: l.id,
      label: l.name ?? l.color,
      color: l.color,
    })) ?? [];

  // Collect unique assignees across all cards
  const memberMap = new Map<string, FilterOption>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (board as any).lists?.forEach((list: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    list.cards?.forEach((card: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      card.assignees?.forEach((a: any) => {
        if (!memberMap.has(a.id)) {
          memberMap.set(a.id, { id: a.id, label: a.name ?? a.email });
        }
      });
    });
  });
  const memberOptions = Array.from(memberMap.values());

  // Count cards
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allCards =
    (board as any).lists?.flatMap((l: any) => l.cards ?? []) ?? [];
  const totalCards = allCards.length;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visibleCards = allCards.filter((c: any) =>
    cardMatchesFilters(c, filters),
  ).length;

  const closeCardModal = () => {
    router.replace(pathname, { scroll: false });
  };

  return (
    <div className="flex h-full flex-col bg-background/95">
      {/* Board Top Bar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b px-4 backdrop-blur bg-background/60">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold">{board.name}</h1>
          <div className="h-4 w-[1px] bg-border" />

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8">
              <Users className="mr-2 h-4 w-4" />
              Share
            </Button>
          </div>
        </div>

        <div>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <BoardFilterBar
        labels={labelOptions}
        members={memberOptions}
        filters={filters}
        onFiltersChange={setFilters}
        totalCards={totalCards}
        visibleCards={visibleCards}
      />

      {/* Main Board View Container */}
      <div
        className="flex-1 overflow-hidden relative"
        style={{
          backgroundColor: board.background
            ? `${board.background}10`
            : "transparent",
        }}
      >
        <BoardView board={board} filters={filters} />
      </div>

      {/* Conditional Card Modal Layer */}
      {cardId && (
        <CardDetailModal
          cardId={cardId}
          boardId={board.id}
          workspaceId={board.workspaceId}
          onClose={closeCardModal}
        />
      )}
    </div>
  );
}
