'use client';

import { useState } from 'react';
import { Zap, Plus, ChevronRight, Play, Power, Trash2, Clock, BarChart2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToggleAutomation, useDeleteAutomation, type AutomationRule } from '@/hooks/use-automations';
import { TRIGGER_EVENTS } from './trigger-selector';
import { ACTION_TYPES } from './action-row';
import { cn } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

function describeTrigger(rule: AutomationRule): string {
  const found = TRIGGER_EVENTS.find((e) => e.value === rule.trigger.event);
  const base = found ? `When ${found.label}` : rule.trigger.event;
  if (rule.trigger.to_list_name) return `${base} → "${rule.trigger.to_list_name}"`;
  if (rule.trigger.label_name)   return `${base} "${rule.trigger.label_name}"`;
  return base;
}

function describeActions(rule: AutomationRule): string {
  if (!rule.actions.length) return 'No actions';
  const first = ACTION_TYPES.find((a) => a.value === rule.actions[0].type)?.label ?? rule.actions[0].type;
  const rest = rule.actions.length - 1;
  return rest > 0 ? `${first} + ${rest} more` : first;
}

function formatRelative(date: string | null | undefined): string {
  if (!date) return 'Never';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 2)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── RuleCard ──────────────────────────────────────────────────────────────────

interface RuleCardProps {
  rule:    AutomationRule;
  boardId: string;
  onEdit:  (rule: AutomationRule) => void;
}

function RuleCard({ rule, boardId, onEdit }: RuleCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { mutate: toggle, isPending: toggling } = useToggleAutomation(boardId);
  const { mutate: del,    isPending: deleting  } = useDeleteAutomation(boardId);

  return (
    <>
      <div
        className={cn(
          'group relative flex items-start gap-4 rounded-xl border p-4 transition-all duration-200',
          'hover:shadow-md hover:border-primary/30',
          rule.isActive
            ? 'border-border bg-card'
            : 'border-dashed border-border/60 bg-muted/20 opacity-70'
        )}
      >
        {/* Zap icon */}
        <div className={cn(
          'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          rule.isActive ? 'bg-primary/10' : 'bg-muted'
        )}>
          <Zap className={cn('h-4 w-4', rule.isActive ? 'text-primary' : 'text-muted-foreground')} />
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium leading-tight">{rule.name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{describeTrigger(rule)}</p>
              <p className="mt-0.5 truncate text-xs text-primary/70">{describeActions(rule)}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <BarChart2 className="h-3 w-3" />
              {rule.runCount} run{rule.runCount !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatRelative(rule.lastRunAt)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          <Switch
            checked={rule.isActive}
            disabled={toggling}
            onCheckedChange={() => toggle(rule.id)}
            aria-label={rule.isActive ? 'Disable automation' : 'Enable automation'}
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onEdit(rule)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete automation?</DialogTitle>
            <DialogDescription>
              &ldquo;{rule.name}&rdquo; will be permanently deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => { del(rule.id); setDeleteOpen(false); }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── RuleList ──────────────────────────────────────────────────────────────────

interface RuleListProps {
  rules:    AutomationRule[];
  boardId:  string;
  isLoading?: boolean;
  onNew:    () => void;
  onEdit:   (rule: AutomationRule) => void;
}

export function RuleList({ rules, boardId, isLoading, onNew, onEdit }: RuleListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-border bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {rules.length === 0
              ? 'No automation rules yet.'
              : `${rules.length} rule${rules.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button size="sm" onClick={onNew} className="gap-1.5">
          <Plus className="h-4 w-4" />
          New Rule
        </Button>
      </div>

      {/* Rules */}
      {rules.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-medium">Automate your workflow</p>
            <p className="text-sm text-muted-foreground max-w-xs">
              Create rules that react to events — move cards, assign members, or send notifications automatically.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={onNew} className="gap-1.5">
            <Play className="h-3.5 w-3.5" />
            Create first rule
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} boardId={boardId} onEdit={onEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
