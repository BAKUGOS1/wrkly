'use client';

import { useState, useEffect } from 'react';
import { Plus, Zap, FlaskConical, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCreateAutomation,
  useUpdateAutomation,
  useTestAutomation,
  type AutomationRule,
  type AutomationTrigger,
  type AutomationAction,
  type TestMatch,
} from '@/hooks/use-automations';
import { TriggerSelector } from './trigger-selector';
import { ActionRow } from './action-row';
import { cn } from '@/lib/utils';

// ── Defaults ──────────────────────────────────────────────────────────────────

const DEFAULT_TRIGGER: AutomationTrigger = { event: 'card.moved' };
const DEFAULT_ACTION: AutomationAction   = { type: 'add_label', params: {} };

// ── TestResultsPanel ──────────────────────────────────────────────────────────

function TestResultsPanel({ matches, totalCards }: { matches: TestMatch[]; totalCards: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FlaskConical className="h-4 w-4 text-primary" />
        Test results — {matches.length} of {totalCards} cards would match
      </div>
      {matches.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <XCircle className="h-4 w-4 text-muted-foreground" />
          No cards currently match this trigger.
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {matches.map((m) => (
            <div key={m.cardId} className="rounded-md border border-border bg-background p-2.5 text-xs">
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                {m.cardTitle}
                <span className="text-muted-foreground font-normal">in {m.listName}</span>
              </div>
              <ul className="mt-1 space-y-0.5 pl-5 text-muted-foreground">
                {m.actions.map((a, i) => (
                  <li key={i} className="list-disc">{a.description}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RuleBuilder ───────────────────────────────────────────────────────────────

interface RuleBuilderProps {
  open:      boolean;
  onClose:   () => void;
  boardId:   string;
  editRule?: AutomationRule | null;
  lists:     Array<{ id: string; name: string }>;
  labels:    Array<{ id: string; name?: string | null; color: string }>;
  members:   Array<{ id: string; name: string; avatarUrl?: string | null }>;
}

export function RuleBuilder({ open, onClose, boardId, editRule, lists, labels, members }: RuleBuilderProps) {
  const [name,    setName]    = useState('');
  const [trigger, setTrigger] = useState<AutomationTrigger>(DEFAULT_TRIGGER);
  const [actions, setActions] = useState<AutomationAction[]>([{ ...DEFAULT_ACTION }]);
  const [testResults, setTestResults] = useState<{ matches: TestMatch[]; totalCards: number } | null>(null);

  const { mutateAsync: createRule, isPending: creating } = useCreateAutomation(boardId);
  const { mutateAsync: updateRule, isPending: updating } = useUpdateAutomation(boardId);
  const { mutateAsync: testRule,   isPending: testing  } = useTestAutomation();

  const isSaving = creating || updating;
  const isEditing = !!editRule;

  // Pre-fill form when editing
  useEffect(() => {
    if (editRule) {
      setName(editRule.name);
      setTrigger(editRule.trigger);
      setActions(editRule.actions.length ? editRule.actions : [{ ...DEFAULT_ACTION }]);
    } else {
      setName('');
      setTrigger(DEFAULT_TRIGGER);
      setActions([{ ...DEFAULT_ACTION }]);
    }
    setTestResults(null);
  }, [editRule, open]);

  const handleAddAction = () => setActions((prev) => [...prev, { ...DEFAULT_ACTION }]);

  const handleUpdateAction = (index: number, action: AutomationAction) =>
    setActions((prev) => prev.map((a, i) => (i === index ? action : a)));

  const handleDeleteAction = (index: number) =>
    setActions((prev) => prev.filter((_, i) => i !== index));

  const handleTest = async () => {
    if (!editRule) return;
    setTestResults(null);
    const result = await testRule(editRule.id);
    setTestResults(result);
  };

  const handleSave = async () => {
    if (!name.trim())              return;
    if (actions.length === 0)      return;
    if (!trigger.event)            return;

    const payload = { name: name.trim(), trigger, actions };

    if (isEditing) {
      await updateRule({ id: editRule!.id, data: payload });
    } else {
      await createRule(payload);
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {isEditing ? 'Edit automation rule' : 'Create automation rule'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Rule name</label>
            <Input
              placeholder="e.g. Move to Done → add Complete label"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <Separator />

          {/* WHEN section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-amber-500/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-amber-600">
                When
              </span>
              <p className="text-xs text-muted-foreground">This rule fires when…</p>
            </div>
            <TriggerSelector
              trigger={trigger}
              lists={lists}
              labels={labels}
              onChange={setTrigger}
            />
          </div>

          <Separator />

          {/* THEN section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-primary">
                Then
              </span>
              <p className="text-xs text-muted-foreground">Execute these actions…</p>
            </div>

            <div className="space-y-2">
              {actions.map((action, i) => (
                <ActionRow
                  key={i}
                  action={action}
                  index={i}
                  lists={lists}
                  labels={labels}
                  members={members}
                  onChange={(a) => handleUpdateAction(i, a)}
                  onDelete={() => handleDeleteAction(i)}
                />
              ))}
            </div>

            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs"
              disabled={actions.length >= 10}
              onClick={handleAddAction}
            >
              <Plus className="h-3.5 w-3.5" />
              Add action
            </Button>
          </div>

          {/* Test results panel */}
          {testResults && (
            <TestResultsPanel matches={testResults.matches} totalCards={testResults.totalCards} />
          )}

          <Separator />

          {/* Footer */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {/* Test button — only when editing an existing rule */}
              {isEditing && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={testing}
                  onClick={handleTest}
                  className={cn('gap-1.5', testing && 'text-muted-foreground')}
                >
                  {testing
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <FlaskConical className="h-3.5 w-3.5" />
                  }
                  {testing ? 'Testing…' : 'Test rule'}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isSaving || !name.trim() || actions.length === 0}
                onClick={handleSave}
                className="gap-1.5"
              >
                {isSaving
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Zap className="h-3.5 w-3.5" />
                }
                {isSaving ? 'Saving…' : isEditing ? 'Update rule' : 'Create rule'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
