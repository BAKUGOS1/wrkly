'use client';

import { X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { AutomationAction } from '@/hooks/use-automations';

// ── Supported action types ────────────────────────────────────────────────────

export const ACTION_TYPES = [
  { value: 'add_label',         label: 'Add label' },
  { value: 'remove_label',      label: 'Remove label' },
  { value: 'move_card',         label: 'Move card to list' },
  { value: 'assign_user',       label: 'Assign user' },
  { value: 'set_due_date',      label: 'Set due date' },
  { value: 'send_notification', label: 'Send notification' },
  { value: 'add_comment',       label: 'Add comment' },
  { value: 'archive_card',      label: 'Archive card' },
  { value: 'webhook',           label: 'Call webhook' },
] as const;

interface ActionRowProps {
  action:    AutomationAction;
  index:     number;
  lists:     Array<{ id: string; name: string }>;
  labels:    Array<{ id: string; name?: string | null; color: string }>;
  members:   Array<{ id: string; name: string; avatarUrl?: string | null }>;
  onChange:  (action: AutomationAction) => void;
  onDelete:  () => void;
}

export function ActionRow({ action, index, lists, labels, members, onChange, onDelete }: ActionRowProps) {
  const updateType = (type: string) => onChange({ type, params: {} });
  const updateParam = (key: string, value: unknown) =>
    onChange({ ...action, params: { ...action.params, [key]: value } });

  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/20 p-3">
      {/* Step number */}
      <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
        {index + 1}
      </span>

      <div className="flex-1 space-y-2">
        {/* Action type */}
        <Select value={action.type} onValueChange={updateType}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Select action…" />
          </SelectTrigger>
          <SelectContent>
            {ACTION_TYPES.map((a) => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Params ── based on action type */}
        {(action.type === 'add_label' || action.type === 'remove_label') && (
          <Select value={String(action.params.label ?? '')} onValueChange={(v) => updateParam('label', v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select label…" />
            </SelectTrigger>
            <SelectContent>
              {labels.map((l) => (
                <SelectItem key={l.id} value={l.name ?? l.id}>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ backgroundColor: l.color }} />
                    {l.name ?? 'Unlabelled'}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {action.type === 'move_card' && (
          <Select value={String(action.params.list_name ?? '')} onValueChange={(v) => updateParam('list_name', v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select list…" />
            </SelectTrigger>
            <SelectContent>
              {lists.map((l) => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {action.type === 'assign_user' && (
          <Select value={String(action.params.userId ?? '')} onValueChange={(v) => updateParam('userId', v)}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Select member…" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  <span className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {m.name.slice(0, 2).toUpperCase()}
                    </span>
                    {m.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {action.type === 'set_due_date' && (
          <div className="flex items-center gap-2 text-sm">
            <Input
              type="number"
              min={1}
              placeholder="e.g. 3"
              className="h-8 w-20 text-sm"
              value={String(action.params.offset_days ?? '')}
              onChange={(e) => updateParam('offset_days', Number(e.target.value))}
            />
            <span className="text-muted-foreground text-xs">days from now</span>
          </div>
        )}

        {action.type === 'send_notification' && (
          <div className="space-y-2">
            <Input
              placeholder="Notification title…"
              className="h-8 text-sm"
              value={String(action.params.title ?? '')}
              onChange={(e) => updateParam('title', e.target.value)}
            />
            <Select value={String(action.params.target ?? 'assignees')} onValueChange={(v) => updateParam('target', v)}>
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assignees">Card assignees</SelectItem>
                <SelectItem value="workspace_members">All workspace members</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {action.type === 'add_comment' && (
          <Input
            placeholder="Comment text…"
            className="h-8 text-sm"
            value={String(action.params.content ?? '')}
            onChange={(e) => updateParam('content', e.target.value)}
          />
        )}

        {action.type === 'webhook' && (
          <Input
            type="url"
            placeholder="https://example.com/webhook"
            className="h-8 text-sm"
            value={String(action.params.url ?? '')}
            onChange={(e) => updateParam('url', e.target.value)}
          />
        )}

        {action.type === 'archive_card' && (
          <p className="text-xs text-muted-foreground italic">The matched card will be archived.</p>
        )}
      </div>

      {/* Delete */}
      <Button
        size="icon"
        variant="ghost"
        className="mt-0.5 h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
