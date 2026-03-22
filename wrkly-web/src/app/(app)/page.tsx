import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Plus, Users, LayoutGrid } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CreateWorkspaceDialog } from "@/components/workspaces/create-workspace-dialog";

// ── Types ────────────────────────────────────────────────────────────────────

interface WorkspaceCard {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  _count?: { boards: number; members: number };
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => apiFetch<{ workspaces: WorkspaceCard[] }>("/api/workspaces"),
    enabled: !!token,
  });

  const workspaces = data?.workspaces ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Your Workspaces</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your projects and collaborate with your team
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          // Skeleton loading state
          <>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-border bg-card p-6"
              >
                <Skeleton className="mb-4 h-5 w-32" />
                <Skeleton className="mb-6 h-4 w-48" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => router.push(`/app/workspace/${ws.id}`)}
                className={cn(
                  "group relative rounded-xl border border-border bg-card p-6 text-left transition-all",
                  "hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                )}
              >
                {/* Name */}
                <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                  {ws.name}
                </h3>

                {/* Description */}
                {ws.description && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {ws.description}
                  </p>
                )}

                {/* Stats row */}
                <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {ws._count?.members ?? 0} members
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <LayoutGrid className="h-3.5 w-3.5" />
                    {ws._count?.boards ?? 0} boards
                  </span>
                </div>

                {/* Subtle gradient accent at the bottom on hover */}
                <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-b-xl bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}

            {/* New Workspace card */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className={cn(
                "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-6 transition-all",
                "text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              )}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Plus className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium">New Workspace</span>
            </button>
          </>
        )}
      </div>

      <CreateWorkspaceDialog
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
      />
    </div>
  );
}
