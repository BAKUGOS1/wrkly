'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import type { AutomationTrigger } from '@/hooks/use-automations';

// ── Trigger event metadata ─────────────────────────────────────────────────────

export const TRIGGER_EVENTS = [
  { value: 'card.created',              label: 'a card is created' },
  { value: 'card.moved',                label: 'a card is moved' },
  { value: 'card.updated',              label: 'a card is updated' },
  { value: 'label.added',               label: 'a label is added' },
  { value: 'assignee.added',            label: 'someone is assigned' },
  { value: 'card.due_date_approaching', label: 'a due date is approaching' },
  { value: 'card.overdue',              label: 'a card becomes overdue' },
  { value: 'checklist.completed',       label: 'a checklist is completed' },
] as const;

interface TriggerSelectorProps {
  trigger:  AutomationTrigger;
  lists:    Array<{ id: string; name: string }>;
  labels:   Array<{ id: string; name?: string | null; color: string }>;
  onChange: (trigger: AutomationTrigger) => void;
}

export function TriggerSelector({ trigger, lists, labels, onChange }: TriggerSelectorProps) {
  const update = (patch: Partial<AutomationTrigger>) =>
    onChange({ ...trigger, ...patch });

  return (
    <div className="space-y-3">
      {/* Event selector */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground font-medium shrink-0">When</span>
        <Select value={trigger.event} onValueChange={(v) => update({ event: v, to_list_name: undefined, from_list_name: undefined, label_name: undefined })}>
          <SelectTrigger className="h-8 w-auto min-w-[200px] text-sm font-medium">
            <SelectValue placeholder="Select trigger…" />
          </SelectTrigger>
          <SelectContent>
            {TRIGGER_EVENTS.map((e) => (
              <SelectItem key={e.value} value={e.value}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* card.moved — to / from list selectors */}
      {trigger.event === 'card.moved' && (
        <div className="flex flex-wrap items-center gap-2 text-sm pl-4 border-l-2 border-primary/20">
          <span className="text-muted-foreground">to list</span>
          <Select value={trigger.to_list_name ?? ''} onValueChange={(v) => update({ to_list_name: v || undefined })}>
            <SelectTrigger className="h-8 w-auto min-w-[140px] text-sm">
              <SelectValue placeholder="Any list" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any list</SelectItem>
              {lists.map((l) => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground">from</span>
          <Select value={trigger.from_list_name ?? ''} onValueChange={(v) => update({ from_list_name: v || undefined })}>
            <SelectTrigger className="h-8 w-auto min-w-[140px] text-sm">
              <SelectValue placeholder="Any list" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any list</SelectItem>
              {lists.map((l) => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* card.created — optional "in list" */}
      {trigger.event === 'card.created' && (
        <div className="flex flex-wrap items-center gap-2 text-sm pl-4 border-l-2 border-primary/20">
          <span className="text-muted-foreground">in list</span>
          <Select value={trigger.to_list_name ?? ''} onValueChange={(v) => update({ to_list_name: v || undefined })}>
            <SelectTrigger className="h-8 w-auto min-w-[140px] text-sm">
              <SelectValue placeholder="Any list" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any list</SelectItem>
              {lists.map((l) => <SelectItem key={l.id} value={l.name}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* label.added — label selector */}
      {trigger.event === 'label.added' && (
        <div className="flex flex-wrap items-center gap-2 text-sm pl-4 border-l-2 border-primary/20">
          <span className="text-muted-foreground">label</span>
          <Select value={trigger.label_name ?? ''} onValueChange={(v) => update({ label_name: v || undefined })}>
            <SelectTrigger className="h-8 w-auto min-w-[140px] text-sm">
              <SelectValue placeholder="Any label" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Any label</SelectItem>
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
        </div>
      )}

      {/* card.due_date_approaching — hours input */}
      {trigger.event === 'card.due_date_approaching' && (
        <div className="flex flex-wrap items-center gap-2 text-sm pl-4 border-l-2 border-primary/20">
          <span className="text-muted-foreground">within</span>
          <Input
            type="number"
            min={1}
            className="h-8 w-20 text-sm"
            value={String(trigger.conditions?.hours_before ?? 24)}
            onChange={(e) => update({ conditions: { hours_before: Number(e.target.value) } })}
          />
          <span className="text-muted-foreground">hours</span>
        </div>
      )}
    </div>
  );
}
