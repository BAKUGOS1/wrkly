'use client';

import { useState } from 'react';
import { Plus, LayoutGrid } from 'lucide-react';
import { useBoards } from '@/hooks/use-boards';
import { BoardCard } from './board-card';
import { CreateBoardDialog } from './create-board-dialog';
import { Skeleton } from '@/components/ui/skeleton';

export function BoardGrid({ workspaceId }: { workspaceId: string }) {
  const { data, isLoading } = useBoards(workspaceId);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const boards = data?.boards ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  // Define the New Board Card
  const newBoardCard = (
    <button
      onClick={() => setCreateDialogOpen(true)}
      className="group flex h-32 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-transparent transition-all hover:bg-muted/50 hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted group-hover:bg-background transition-colors">
        <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
        New Board
      </span>
    </button>
  );

  if (boards.length === 0) {
    return (
      <>
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 text-center p-8">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <LayoutGrid className="h-8 w-8 text-primary" />
          </div>
          <h3 className="mb-1 text-xl font-semibold">No boards yet</h3>
          <p className="mb-6 max-w-sm text-sm text-muted-foreground">
            Create your first board to start organizing your projects, tasks, and team collaboration.
          </p>
          <button
            onClick={() => setCreateDialogOpen(true)}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            Create your first board
          </button>
        </div>
        <CreateBoardDialog workspaceId={workspaceId} open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {boards.map((board) => (
          <BoardCard key={board.id} board={board} />
        ))}
        {newBoardCard}
      </div>
      <CreateBoardDialog workspaceId={workspaceId} open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
    </>
  );
}
