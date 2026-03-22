"use client";

import { useWorkspaces } from "@/hooks/use-workspaces";
import { BoardGrid } from "@/components/boards/board-grid";
import { Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceDashboardPage({
  params,
}: {
  params: { slug: string };
}) {
  const { data, isLoading } = useWorkspaces();

  // Find the exact workspace by slug
  const workspace = data?.workspaces?.find((ws) => ws.slug === params.slug);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl w-full">
        <Skeleton className="mb-8 h-16 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Workspace not found
        </h2>
        <p className="mt-2 text-muted-foreground">
          The workspace you&apos;re looking for doesn&apos;t exist or you
          don&apos;t have access.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl w-full">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {workspace.name}
          </h1>
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {workspace._count?.members ?? 1} members
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-fit">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>

      {/* Board Grid Area */}
      <div>
        <h2 className="mb-4 text-lg font-semibold tracking-tight">Boards</h2>
        <BoardGrid workspaceId={workspace.id} />
      </div>
    </div>
  );
}
