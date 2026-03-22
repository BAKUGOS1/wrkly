'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Kanban,
  Bug,
  Rocket,
  Users,
  BookOpen,
  ShoppingCart,
  BarChart2,
  Loader2,
  Check,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useBoardTemplates,
  useCreateBoardFromTemplate,
} from '@/hooks/use-boards';
import { cn } from '@/lib/utils';

// ── Icon mapping ──────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  kanban:   <Kanban className="h-5 w-5" />,
  bug:      <Bug className="h-5 w-5" />,
  rocket:   <Rocket className="h-5 w-5" />,
  users:    <Users className="h-5 w-5" />,
  book:     <BookOpen className="h-5 w-5" />,
  cart:     <ShoppingCart className="h-5 w-5" />,
  chart:    <BarChart2 className="h-5 w-5" />,
};

const TEMPLATE_COLORS = [
  '#4F46E5', '#8B5CF6', '#EC4899', '#EF4444',
  '#F59E0B', '#10B981', '#3B82F6', '#64748B',
];

const PRESET_BG = [
  '#4F46E5', '#3B82F6', '#10B981', '#F59E0B',
  '#EF4444', '#8B5CF6', '#EC4899', '#6366F1',
];

// ── Template card ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  index,
  isSelected,
  onClick,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  template: any;
  index: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const accentColor = TEMPLATE_COLORS[index % TEMPLATE_COLORS.length];

  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full rounded-xl border-2 text-left transition-all duration-150',
        'hover:shadow-md hover:scale-[1.02]',
        isSelected
          ? 'border-primary shadow-md shadow-primary/10'
          : 'border-border hover:border-muted-foreground/30'
      )}
    >
      {/* Coloured header strip */}
      <div
        className="flex h-10 items-center gap-2 rounded-t-[10px] px-3"
        style={{ backgroundColor: accentColor }}
      >
        <span className="text-white/90">
          {ICON_MAP[template.icon ?? 'kanban'] ?? <Kanban className="h-5 w-5" />}
        </span>
        {isSelected && <Check className="ml-auto h-4 w-4 text-white" />}
      </div>

      {/* Body */}
      <div className="p-3 space-y-2">
        <p className="text-sm font-semibold leading-tight">{template.name}</p>
        {template.description && (
          <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
            {template.description}
          </p>
        )}

        {/* List name pills */}
        {template.lists?.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {template.lists.slice(0, 5).map((l: { name: string }, i: number) => (
              <span
                key={i}
                className="rounded-full border border-border bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground"
              >
                {l.name}
              </span>
            ))}
            {template.lists.length > 5 && (
              <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground">
                +{template.lists.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

// ── Template Picker ───────────────────────────────────────────────────────────

interface TemplatePickerProps {
  workspaceId: string;
  onSuccess?: (boardId: string) => void;
  onCancel: () => void;
}

export function TemplatePicker({ workspaceId, onSuccess, onCancel }: TemplatePickerProps) {
  const router = useRouter();
  const { data, isLoading } = useBoardTemplates();
  const { mutateAsync: createFromTemplate, isPending } = useCreateBoardFromTemplate(workspaceId);

  const templates: { id: string; name: string; icon?: string; description?: string; lists: { name: string }[] }[] = data?.templates ?? [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selected, setSelected] = useState<any>(null);
  const [boardName, setBoardName] = useState('');
  const [background, setBackground] = useState(PRESET_BG[0]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelect = (t: any) => {
    setSelected(t);
    setBoardName(t.name);
  };

  const handleCreate = async () => {
    if (!selected || !boardName.trim()) return;
    try {
      const res = await createFromTemplate({
        templateId: selected.id,
        name: boardName.trim(),
        background,
      });
      if (onSuccess) {
        onSuccess(res.board.id);
      } else {
        router.push(`/app/board/${res.board.id}`);
      }
    } catch {
      // Handled by hook toast
    }
  };

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border overflow-hidden">
            <Skeleton className="h-10 w-full rounded-none" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <div className="flex gap-1 pt-1">
                {[1,2,3].map((j) => <Skeleton key={j} className="h-4 w-12 rounded-full" />)}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Kanban className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No templates available yet.</p>
      </div>
    );
  }

  // ── Configure step (after selecting a template) ──────────────────────────
  if (selected) {
    return (
      <div className="space-y-4">
        <button
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setSelected(null)}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Back to templates
        </button>

        {/* Selected template badge */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
            style={{ backgroundColor: TEMPLATE_COLORS[(templates.indexOf(selected)) % TEMPLATE_COLORS.length] }}>
            {ICON_MAP[selected.icon ?? 'kanban'] ?? <Kanban className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{selected.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {selected.lists.length} list{selected.lists.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Board name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Board name</label>
          <Input
            placeholder="Board name"
            value={boardName}
            onChange={(e) => setBoardName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            disabled={isPending}
            autoFocus
          />
        </div>

        {/* Background */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Background color</label>
          <div className="flex flex-wrap gap-2">
            {PRESET_BG.map((color) => (
              <button
                key={color}
                type="button"
                className={cn(
                  'h-8 w-8 rounded-full shadow-sm transition-all hover:scale-105',
                  background === color ? 'scale-110 ring-2 ring-foreground ring-offset-2' : 'border border-border/50'
                )}
                style={{ backgroundColor: color }}
                onClick={() => setBackground(color)}
                disabled={isPending}
              />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleCreate}
            disabled={!boardName.trim() || isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Board
          </Button>
        </div>
      </div>
    );
  }

  // ── Template grid ───────────────────────────────────────────────────────────
  return (
    <div className="grid grid-cols-2 gap-3 max-h-[340px] overflow-y-auto pr-0.5">
      {templates.map((t, i) => (
        <TemplateCard
          key={t.id}
          template={t}
          index={i}
          isSelected={selected?.id === t.id}
          onClick={() => handleSelect(t)}
        />
      ))}
    </div>
  );
}
