"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  Pencil,
  Plus,
  Check,
  X,
  Archive,
  Users,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useBoard, useUpdateBoard } from "@/hooks/use-boards";
import {
  useCreateLabel,
  useUpdateLabel,
  useDeleteLabel,
} from "@/hooks/use-labels";
import { useWorkspaceMembers } from "@/hooks/use-workspaces";
import { useAutomations } from "@/hooks/use-automations";
import { RuleList } from "@/components/automations/rule-list";
import { RuleBuilder } from "@/components/automations/rule-builder";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Label } from "@/types";
import type { AutomationRule } from "@/hooks/use-automations";

// ── Background Color Presets ─────────────────────────────────────────────────

const BG_PRESETS = [
  "#6366f1",
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#64748b",
  "#1e293b",
  "#292524",
];

// ── General Tab ──────────────────────────────────────────────────────────────

function GeneralTab({
  board,
  boardId,
  workspaceId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  board: any;
  boardId: string;
  workspaceId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { mutateAsync: updateBoard, isPending } = useUpdateBoard(
    boardId,
    workspaceId,
  );

  const [name, setName] = useState(board.name ?? "");
  const [description, setDescription] = useState(board.description ?? "");
  const [background, setBackground] = useState<string>(board.background ?? "");
  const [archiveOpen, setArchiveOpen] = useState(false);

  // Debounced auto-save
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSave = useCallback(
    (
      updates: Partial<{
        name: string;
        description: string;
        background: string;
      }>,
    ) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await updateBoard(updates);
        toast({ title: "Board settings saved" });
      }, 800);
    },
    [updateBoard, toast],
  );

  const handleArchive = async () => {
    await updateBoard({ isArchived: true });
    setArchiveOpen(false);
    toast({ title: "Board archived" });
    router.replace(`/app/workspace/${workspaceId}`);
  };

  return (
    <div className="max-w-lg space-y-6">
      {/* Board Name */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Board name</label>
        <Input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            triggerSave({ name: e.target.value, description, background });
          }}
          placeholder="Enter board name"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <textarea
          className="w-full resize-none rounded-md border border-border bg-background p-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px]"
          rows={3}
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            triggerSave({ name, description: e.target.value, background });
          }}
          placeholder="Optional board description…"
        />
      </div>

      {/* Background color */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Background color</label>
        <div className="flex flex-wrap gap-2">
          {/* None / Clear */}
          <button
            className={cn(
              "h-8 w-8 rounded-md border-2 bg-muted/30 text-xs font-bold transition-all hover:scale-105",
              !background
                ? "border-primary ring-1 ring-primary"
                : "border-transparent",
            )}
            onClick={() => {
              setBackground("");
              triggerSave({ name, description, background: "" });
            }}
          >
            ∅
          </button>
          {BG_PRESETS.map((color) => (
            <button
              key={color}
              className={cn(
                "h-8 w-8 rounded-md border-2 transition-all hover:scale-105",
                background === color
                  ? "border-white ring-2 ring-primary"
                  : "border-transparent",
              )}
              style={{ backgroundColor: color }}
              onClick={() => {
                setBackground(color);
                triggerSave({ name, description, background: color });
              }}
            />
          ))}
        </div>
        {isPending && (
          <p className="text-xs text-muted-foreground animate-pulse">Saving…</p>
        )}
      </div>

      <Separator />

      {/* Danger Zone */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-destructive">Danger Zone</h3>
        <div className="rounded-md border border-destructive/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Archive this board</p>
              <p className="text-xs text-muted-foreground">
                Hides the board from view. You can restore it later.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={() => setArchiveOpen(true)}
            >
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </Button>
          </div>
        </div>
      </div>

      {/* Archive confirmation dialog */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive board?</DialogTitle>
            <DialogDescription>
              This board will be hidden from your workspace. You can restore it
              from workspace settings later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setArchiveOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleArchive}>
              <Archive className="mr-2 h-4 w-4" />
              Archive board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Label Row ────────────────────────────────────────────────────────────────

function LabelRow({ label, boardId }: { label: Label; boardId: string }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(label.name ?? "");
  const [editColor, setEditColor] = useState(label.color);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { mutateAsync: updateLabel, isPending: isUpdating } =
    useUpdateLabel(boardId);
  const { mutate: deleteLabel, isPending: isDeleting } =
    useDeleteLabel(boardId);

  const saveEdit = async () => {
    await updateLabel({
      labelId: label.id,
      data: { name: editName, color: editColor },
    });
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-border p-3">
        <input
          type="color"
          value={editColor}
          onChange={(e) => setEditColor(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border-0 p-0"
        />
        <Input
          className="h-8 flex-1"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Label name (optional)"
          onKeyDown={(e) => e.key === "Enter" && saveEdit()}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={saveEdit}
          disabled={isUpdating}
        >
          <Check className="h-4 w-4 text-primary" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => setIsEditing(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="group flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted/40 transition-colors">
        <span
          className="h-5 w-12 shrink-0 rounded"
          style={{ backgroundColor: label.color }}
        />
        <span className="flex-1 text-sm">
          {label.name || (
            <span className="text-muted-foreground italic">No name</span>
          )}
        </span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteOpen(true)}
            disabled={isDeleting}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete label?</DialogTitle>
            <DialogDescription>
              This will permanently remove the label and detach it from all
              cards. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteLabel(label.id);
                setDeleteOpen(false);
              }}
            >
              Delete label
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Labels Tab ───────────────────────────────────────────────────────────────

function LabelsTab({ labels, boardId }: { labels: Label[]; boardId: string }) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const { mutateAsync: createLabel, isPending } = useCreateLabel(boardId);

  const handleCreate = async () => {
    await createLabel({ name: newName.trim() || undefined, color: newColor });
    setNewName("");
    setNewColor("#6366f1");
  };

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-muted-foreground">
        Labels help categorise cards. Each board has its own set of labels.
      </p>

      {/* Existing labels */}
      <div className="rounded-md border border-border divide-y divide-border">
        {labels.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No labels yet. Create one below.
          </p>
        ) : (
          labels.map((label) => (
            <LabelRow key={label.id} label={label} boardId={boardId} />
          ))
        )}
      </div>

      {/* Add label */}
      <div className="space-y-2 rounded-md border border-border p-4 bg-muted/20">
        <h4 className="text-sm font-medium">Add label</h4>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="h-9 w-10 cursor-pointer rounded border-0 p-0"
          />
          <Input
            className="flex-1"
            placeholder="Label name (optional)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <Button size="sm" onClick={handleCreate} disabled={isPending}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const { data, isLoading } = useWorkspaceMembers(workspaceId);
  const members = data?.members ?? [];

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-start gap-3 rounded-md border border-border/60 bg-muted/20 p-4">
        <Users className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">
            Members are managed at the workspace level
          </p>
          <p>
            Board access is inherited from workspace membership. To invite or
            remove members, visit your workspace settings.
          </p>
          <button
            className="mt-2 inline-flex items-center gap-1 text-primary hover:underline text-xs font-medium"
            onClick={() =>
              router.push(`/app/workspace/${workspaceId}/settings`)
            }
          >
            Go to Workspace Settings <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Read-only member list */}
      <div className="rounded-md border border-border divide-y divide-border overflow-hidden">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 animate-pulse"
              >
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="space-y-1.5">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-3 w-32 rounded bg-muted" />
                </div>
              </div>
            ))
          : members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {m.user.name?.slice(0, 2).toUpperCase() ?? "??"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{m.user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {m.user.email}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium capitalize">
                  {m.role.toLowerCase()}
                </span>
              </div>
            ))}
      </div>
    </div>
  );
}

// ── Automations Tab ──────────────────────────────────────────────────────────

function AutomationsTab({
  boardId,
  lists,
  labels,
  workspaceId,
}: {
  boardId: string;
  lists:   Array<{ id: string; name: string }>;
  labels:  Array<{ id: string; name?: string | null; color: string }>;
  workspaceId: string;
}) {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editRule, setEditRule]       = useState<AutomationRule | null>(null);

  const { data, isLoading }  = useAutomations(boardId);
  const { data: membersData } = useWorkspaceMembers(workspaceId);
  const rules   = data?.automations ?? [];
  const members = (membersData?.members ?? []).map((m: { id: string; userId: string; user: { name: string; avatarUrl?: string | null } }) => ({
    id:       m.userId,
    name:     m.user.name,
    avatarUrl: m.user.avatarUrl,
  }));

  const handleNew = () => {
    setEditRule(null);
    setBuilderOpen(true);
  };

  const handleEdit = (rule: AutomationRule) => {
    setEditRule(rule);
    setBuilderOpen(true);
  };

  return (
    <div className="max-w-2xl">
      <p className="mb-4 text-sm text-muted-foreground">
        Automation rules run automatically when board events occur. Only Admins can create or edit rules.
      </p>
      <RuleList
        rules={rules}
        boardId={boardId}
        isLoading={isLoading}
        onNew={handleNew}
        onEdit={handleEdit}
      />
      <RuleBuilder
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        boardId={boardId}
        editRule={editRule}
        lists={lists}
        labels={labels}
        members={members}
      />
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function BoardSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data, isLoading } = useBoard(params.id);
  const board = data?.board;

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-64 w-full max-w-lg" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Board not found.</p>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const labels: Label[] = (board as any).labels ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back button + header */}
      <div className="mb-6 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => router.push(`/app/board/${params.id}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Board Settings</h1>
          <p className="text-sm text-muted-foreground">{board.name}</p>
        </div>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-6 h-auto gap-0.5 rounded-xl bg-muted p-1">
          <TabsTrigger
            value="general"
            className="rounded-lg text-xs sm:text-sm"
          >
            General
          </TabsTrigger>
          <TabsTrigger value="labels" className="rounded-lg text-xs sm:text-sm">
            Labels
            {labels.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {labels.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="rounded-lg text-xs sm:text-sm"
          >
            Members
          </TabsTrigger>
          <TabsTrigger
            value="automations"
            className="rounded-lg text-xs sm:text-sm"
          >
            Automations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralTab
            board={board}
            boardId={params.id}
            workspaceId={board.workspaceId}
          />
        </TabsContent>

        <TabsContent value="labels">
          <LabelsTab labels={labels} boardId={params.id} />
        </TabsContent>

        <TabsContent value="members">
          <MembersTab workspaceId={board.workspaceId} />
        </TabsContent>

        <TabsContent value="automations">
          <AutomationsTab
            boardId={params.id}
            lists={((board as unknown) as { lists: unknown[] }).lists ?? []}
            labels={labels}
            workspaceId={board.workspaceId}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
