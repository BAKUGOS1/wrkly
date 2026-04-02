'use client';

import { useState } from 'react';
import { Zap, X, ArrowLeft, Sparkles, Plus, Loader2, FlaskConical, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RuleList } from './rule-list';
import { TriggerSelector } from './trigger-selector';
import { ActionRow } from './action-row';
import {
  useAutomations,
  useCreateAutomation,
  useUpdateAutomation,
  useTestAutomation,
  type AutomationRule,
  type AutomationTrigger,
  type AutomationAction,
  type TestMatch,
} from '@/hooks/use-automations';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';

// ── View states ───────────────────────────────────────────────────────────────
type View = 'list' | 'builder';

const DEFAULT_TRIGGER: AutomationTrigger = { event: 'card.moved' };
const DEFAULT_ACTION: AutomationAction   = { type: 'add_label', params: {} };

// ── Test Results ──────────────────────────────────────────────────────────────
function TestResultsPanel({ matches, totalCards }: { matches: TestMatch[]; totalCards: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <FlaskConical className="h-4 w-4 text-primary" />
        {matches.length} of {totalCards} cards would match
      </div>
      {matches.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <XCircle className="h-4 w-4" />
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

// ── Props ─────────────────────────────────────────────────────────────────────
interface AutomationsDrawerProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AutomationsDrawer({ boardId, open, onOpenChange }: AutomationsDrawerProps) {
  const [view, setView] = useState<View>('list');
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [name, setName]       = useState('');
  const [trigger, setTrigger] = useState<AutomationTrigger>(DEFAULT_TRIGGER);
  const [actions, setActions] = useState<AutomationAction[]>([{ ...DEFAULT_ACTION }]);
  const [testResults, setTestResults] = useState<{ matches: TestMatch[]; totalCards: number } | null>(null);

  const { data, isLoading } = useAutomations(boardId);
  const rules = data?.automations ?? [];
  const activeCount = rules.filter((r) => r.isActive).length;

  // Board context for lists, labels, members
  const { data: boardData } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => apiFetch<{ board: { lists: Array<{ id: string; name: string; cards: Array<{ labels?: Array<{ id: string; name: string; color: string }>; assignees?: Array<{ id: string; name: string; avatarUrl: string | null }> }> }> } }>(`/api/boards/${boardId}`),
    enabled: !!boardId && open,
  });

  const boardLists = boardData?.board?.lists ?? [];
  const lists   = boardLists.map((l) => ({ id: l.id, name: l.name }));
  const allCards = boardLists.flatMap((l) => l.cards ?? []);
  const labels   = Array.from(new Map(allCards.flatMap((c) => c.labels ?? []).map((l) => [l.id, { id: l.id, name: l.name, color: l.color }])).values());
  const members  = Array.from(new Map(allCards.flatMap((c) => c.assignees ?? []).map((m) => [m.id, { id: m.id, name: m.name, avatarUrl: m.avatarUrl }])).values());

  const { mutateAsync: createRule, isPending: creating } = useCreateAutomation(boardId);
  const { mutateAsync: updateRule, isPending: updating } = useUpdateAutomation(boardId);
  const { mutateAsync: testRule,   isPending: testing  } = useTestAutomation();
  const isSaving  = creating || updating;
  const isEditing = !!editingRule;

  function openNew() {
    setEditingRule(null);
    setName('');
    setTrigger(DEFAULT_TRIGGER);
    setActions([{ ...DEFAULT_ACTION }]);
    setTestResults(null);
    setView('builder');
  }

  function openEdit(rule: AutomationRule) {
    setEditingRule(rule);
    setName(rule.name);
    setTrigger(rule.trigger);
    setActions(rule.actions.length ? rule.actions : [{ ...DEFAULT_ACTION }]);
    setTestResults(null);
    setView('builder');
  }

  function handleBack() {
    setView('list');
    setEditingRule(null);
    setTestResults(null);
  }

  function handleClose() {
    onOpenChange(false);
    setTimeout(() => { setView('list'); setEditingRule(null); setTestResults(null); }, 300);
  }

  async function handleTest() {
    if (!editingRule) return;
    setTestResults(null);
    const result = await testRule(editingRule.id);
    setTestResults(result);
  }

  async function handleSave() {
    if (!name.trim() || actions.length === 0) return;
    const payload = { name: name.trim(), trigger, actions };
    if (isEditing) {
      await updateRule({ id: editingRule!.id, data: payload });
    } else {
      await createRule(payload);
    }
    handleBack();
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[480px] p-0 flex flex-col gap-0 border-l border-border/60 bg-background/95 backdrop-blur-xl"
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {view !== 'list' && (
                <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1 text-muted-foreground hover:text-foreground" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <SheetTitle className="text-[15px] font-semibold leading-tight">
                    {view === 'list' ? 'Automations' : isEditing ? 'Edit Rule' : 'New Rule'}
                  </SheetTitle>
                  {view === 'list' && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {rules.length === 0 ? 'No rules yet' : `${activeCount} of ${rules.length} active`}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {view === 'list' && rules.length > 0 && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-medium">
                  {rules.length}
                </Badge>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <Separator className="shrink-0" />

        {/* ── Body ───────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {view === 'list' && (
            <>
              {rules.length === 0 && (
                <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <Sparkles className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <div>
                    <p className="text-[12px] font-medium text-primary">Automate repetitive work</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                      Rules run instantly when events happen — no manual work needed.
                    </p>
                  </div>
                </div>
              )}
              <RuleList rules={rules} boardId={boardId} isLoading={isLoading} onNew={openNew} onEdit={openEdit} />
            </>
          )}

          {view === 'builder' && (
            <div className="space-y-5">
              {/* Rule name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Rule name</label>
                <Input
                  placeholder="e.g. Move to Done → Complete label"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <Separator />

              {/* WHEN */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">When</span>
                  <p className="text-xs text-muted-foreground">This rule fires when…</p>
                </div>
                <TriggerSelector trigger={trigger} lists={lists} labels={labels} onChange={setTrigger} />
              </div>

              <Separator />

              {/* THEN */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">Then</span>
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
                      onChange={(a) => setActions((prev) => prev.map((x, j) => j === i ? a : x))}
                      onDelete={() => setActions((prev) => prev.filter((_, j) => j !== i))}
                    />
                  ))}
                </div>
                <Button size="sm" variant="outline" className={cn('gap-1.5 text-xs')} disabled={actions.length >= 10} onClick={() => setActions((p) => [...p, { ...DEFAULT_ACTION }])}>
                  <Plus className="h-3.5 w-3.5" />
                  Add action
                </Button>
              </div>

              {/* Test results */}
              {testResults && <TestResultsPanel matches={testResults.matches} totalCards={testResults.totalCards} />}

              <Separator />

              {/* Footer actions */}
              <div className="flex items-center justify-between gap-2">
                <div>
                  {isEditing && (
                    <Button size="sm" variant="outline" disabled={testing} onClick={handleTest} className="gap-1.5">
                      {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlaskConical className="h-3.5 w-3.5" />}
                      {testing ? 'Testing…' : 'Test rule'}
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleBack} disabled={isSaving}>Cancel</Button>
                  <Button size="sm" disabled={isSaving || !name.trim() || actions.length === 0} onClick={handleSave} className="gap-1.5">
                    {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                    {isSaving ? 'Saving…' : isEditing ? 'Update rule' : 'Create rule'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
