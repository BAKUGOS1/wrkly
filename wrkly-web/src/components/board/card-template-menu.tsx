'use client';

import { useState, useCallback } from 'react';
import { Layers, Plus, Trash2, Loader2, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useCardTemplates,
  useCreateCardTemplate,
  useCreateCardFromTemplate,
  useDeleteCardTemplate,
} from '@/hooks/use-card-templates';
import { cn } from '@/lib/utils';

// ── Save-as-Template button (appears in card detail sidebar) ──────────────────

interface SaveAsTemplateButtonProps {
  boardId: string;
  cardId: string;
}

export function SaveAsTemplateButton({ boardId, cardId }: SaveAsTemplateButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const { mutateAsync: createTemplate, isPending } = useCreateCardTemplate(boardId);

  const handleSave = useCallback(async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await createTemplate({ name: trimmed, cardId });
    setName('');
    setOpen(false);
  }, [name, cardId, createTemplate]);

  return (
    <>
      <Button
        variant="secondary"
        className="w-full justify-start text-muted-foreground text-sm h-8 px-3 hover:bg-muted/80"
        onClick={() => setOpen(true)}
      >
        <LayoutTemplate className="mr-2 h-4 w-4" />
        Save as Template
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              Save this card (with all its blocks) as a reusable template.
            </p>
            <Input
              placeholder="Template name…"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!name.trim() || isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── "Create from Template" popover + dialog (next to "+ Add a card") ──────────

interface CreateFromTemplateButtonProps {
  boardId: string;
  listId: string;
  nextPosition: number;
  onCreated?: () => void;
}

export function CreateFromTemplateButton({
  boardId,
  listId,
  nextPosition,
  onCreated,
}: CreateFromTemplateButtonProps) {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<{ id: string; name: string } | null>(null);
  const [cardTitle, setCardTitle] = useState('');

  const { data, isLoading } = useCardTemplates(boardId);
  const { mutate: deleteTemplate } = useDeleteCardTemplate(boardId);
  const { mutateAsync: createFromTemplate, isPending: isCreating } = useCreateCardFromTemplate(boardId);

  const templates = data?.templates ?? [];

  const handleSelectTemplate = (t: { id: string; name: string }) => {
    setSelectedTemplate(t);
    setCardTitle(t.name);
    setPopoverOpen(false);
    setDialogOpen(true);
  };

  const handleCreate = useCallback(async () => {
    if (!selectedTemplate || !cardTitle.trim()) return;
    await createFromTemplate({
      listId,
      templateId: selectedTemplate.id,
      title: cardTitle.trim(),
      position: nextPosition,
    });
    setDialogOpen(false);
    setCardTitle('');
    setSelectedTemplate(null);
    onCreated?.();
  }, [selectedTemplate, cardTitle, listId, nextPosition, createFromTemplate, onCreated]);

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
            title="Create from template"
          >
            <Layers className="h-3.5 w-3.5" />
            Templates
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 p-2" sideOffset={4}>
          <p className="px-1 pb-1.5 text-xs font-medium text-muted-foreground">
            Card Templates
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : templates.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <LayoutTemplate className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No templates saved yet.</p>
              <p className="text-[11px] text-muted-foreground/70">
                Open a card and use &ldquo;Save as Template&rdquo; in the sidebar.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-0.5 max-h-60 overflow-y-auto">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="group flex items-center gap-2 rounded-md px-2 py-2 hover:bg-accent cursor-default"
                >
                  <button
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => handleSelectTemplate(t)}
                  >
                    <LayoutTemplate className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm">{t.name}</span>
                      {!!t.blockCount && (
                        <span className="text-[10px] text-muted-foreground">
                          {t.blockCount} block{t.blockCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </span>
                  </button>
                  {/* Delete template */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                        title="Delete template"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete template?</AlertDialogTitle>
                        <AlertDialogDescription>
                          &ldquo;{t.name}&rdquo; will be permanently deleted.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className={cn('bg-destructive text-destructive-foreground hover:bg-destructive/90')}
                          onClick={() => deleteTemplate(t.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Card title dialog after selecting template */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[380px]">
          <DialogHeader>
            <DialogTitle>Create from &ldquo;{selectedTemplate?.name}&rdquo;</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-sm text-muted-foreground">
              Give this card a title before creating it.
            </p>
            <Input
              placeholder="Card title…"
              value={cardTitle}
              onChange={(e) => setCardTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!cardTitle.trim() || isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Plus className="mr-1 h-4 w-4" />
              Create Card
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
