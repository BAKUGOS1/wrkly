'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Loader2,
  Rocket,
  X,
  Flag,
  User,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';
import { AI_CONFIG } from '@/lib/ai-config';

// ── Types ────────────────────────────────────────────────────────────────────

interface PlanCard {
  title: string;
  description?: string;
  suggestedAssignee?: string | null;
  estimatedDays?: number;
  labels?: string[];
  priority?: string;
}

interface PlanList {
  name: string;
  cards: PlanCard[];
}

interface ProjectPlan {
  projectTitle: string;
  lists: PlanList[];
  milestones: string[];
}

interface UltraplanDialogProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Priority Badge ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority?: string }) {
  if (!priority) return null;
  const colors: Record<string, string> = {
    high: 'bg-red-500/10 text-red-500 border-red-500/20',
    medium: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    low: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  };
  return (
    <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded border', colors[priority] || colors.medium)}>
      {priority}
    </span>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function UltraplanDialog({ boardId, open, onOpenChange }: UltraplanDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [goal, setGoal] = useState('');
  const [plan, setPlan] = useState<ProjectPlan | null>(null);
  const [phase, setPhase] = useState<'input' | 'draft' | 'executing'>('input');

  // Generate plan
  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<ProjectPlan>('/api/ai/ultraplan', {
        method: 'POST',
        body: JSON.stringify({ boardId, goal }),
      });
      return res;
    },
    onSuccess: (data) => {
      setPlan(data);
      setPhase('draft');
    },
    onError: (err) => {
      toast({
        title: 'Failed to generate plan',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // Execute plan
  const executeMutation = useMutation({
    mutationFn: async () => {
      if (!plan) throw new Error('No plan to execute');
      const res = await apiFetch<{ success: boolean; listsCreated: number; cardsCreated: number }>(
        '/api/ai/ultraplan/execute',
        {
          method: 'POST',
          body: JSON.stringify({ boardId, lists: plan.lists }),
        }
      );
      return res;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
      toast({
        title: '🚀 Project created!',
        description: `Created ${data.listsCreated} lists with ${data.cardsCreated} cards.`,
      });
      handleClose();
    },
    onError: (err) => {
      toast({
        title: 'Failed to execute plan',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      setPhase('draft');
    },
  });

  const handleClose = () => {
    setGoal('');
    setPlan(null);
    setPhase('input');
    onOpenChange(false);
  };

  const removeCard = (listIdx: number, cardIdx: number) => {
    if (!plan) return;
    const updated = { ...plan };
    updated.lists = updated.lists.map((l, i) =>
      i === listIdx ? { ...l, cards: l.cards.filter((_, j) => j !== cardIdx) } : l
    );
    setPlan(updated);
  };

  const removeList = (listIdx: number) => {
    if (!plan) return;
    setPlan({ ...plan, lists: plan.lists.filter((_, i) => i !== listIdx) });
  };

  const totalCards = plan?.lists.reduce((sum, l) => sum + l.cards.length, 0) ?? 0;
  const totalDays = plan?.lists.reduce(
    (sum, l) => sum + l.cards.reduce((s, c) => s + (c.estimatedDays || 0), 0),
    0
  ) ?? 0;

  if (!AI_CONFIG.ultraplanEnabled) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Rocket className="h-5 w-5 text-primary" />
            Project Auto-Pilot
          </DialogTitle>
          <DialogDescription>
            Describe your project goal and AI will generate a complete plan with lists, cards, assignments, and milestones.
          </DialogDescription>
        </DialogHeader>

        {/* ── Input Phase ── */}
        {phase === 'input' && (
          <div className="flex flex-col gap-4 py-2">
            <Textarea
              placeholder="e.g. Plan a marketing launch for our new SaaS product. We need research, content creation, design assets, social media campaigns, and a launch event..."
              value={goal}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGoal(e.target.value)}
              rows={6}
              className="resize-none text-sm"
              maxLength={2000}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{goal.length}/2000</span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending || goal.trim().length < 5}
                  className="gap-2"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating plan...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Plan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Draft Phase ── */}
        {phase === 'draft' && plan && (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Stats bar */}
            <div className="flex items-center gap-4 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
              <span className="text-sm font-semibold text-primary">{plan.projectTitle}</span>
              <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                <span>{plan.lists.length} lists</span>
                <span>·</span>
                <span>{totalCards} cards</span>
                {totalDays > 0 && (
                  <>
                    <span>·</span>
                    <span>~{totalDays} days</span>
                  </>
                )}
              </div>
            </div>

            {/* Milestones */}
            {plan.milestones.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {plan.milestones.map((m, i) => (
                  <div key={i} className="flex items-center gap-1.5 shrink-0">
                    <Flag className="h-3 w-3 text-accent" />
                    <span className="text-[11px] font-medium text-foreground/80 whitespace-nowrap">{m}</span>
                    {i < plan.milestones.length - 1 && (
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Kanban preview */}
            <div className="flex gap-3 overflow-x-auto flex-1 pb-2">
              {plan.lists.map((list, li) => (
                <div
                  key={li}
                  className="shrink-0 w-[220px] flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden"
                >
                  {/* List header */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-muted/30">
                    <span className="text-xs font-semibold truncate">{list.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">{list.cards.length}</span>
                      <button onClick={() => removeList(li)} className="text-muted-foreground hover:text-red-500 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-1.5 p-2 overflow-y-auto max-h-[350px]">
                    {list.cards.map((card, ci) => (
                      <div
                        key={ci}
                        className="rounded-lg border border-border/30 bg-background p-2 text-xs group relative"
                      >
                        <button
                          onClick={() => removeCard(li, ci)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>

                        <p className="font-medium text-foreground pr-4 leading-snug">{card.title}</p>
                        {card.description && (
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{card.description}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          <PriorityBadge priority={card.priority} />
                          {card.labels?.map((l, i) => (
                            <span key={i} className="text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/15">
                              {l}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                          {card.suggestedAssignee && (
                            <span className="flex items-center gap-0.5">
                              <User className="h-2.5 w-2.5" />
                              {card.suggestedAssignee}
                            </span>
                          )}
                          {card.estimatedDays && (
                            <span className="flex items-center gap-0.5">
                              <Calendar className="h-2.5 w-2.5" />
                              {card.estimatedDays}d
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Action bar */}
            <div className="flex justify-between items-center pt-2 border-t border-border/30">
              <Button variant="outline" size="sm" onClick={() => { setPlan(null); setPhase('input'); }}>
                ← Edit Goal
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleClose}>Cancel</Button>
                <Button
                  size="sm"
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => { setPhase('executing'); executeMutation.mutate(); }}
                  disabled={totalCards === 0}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Approve & Create All ({totalCards})
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Executing Phase ── */}
        {phase === 'executing' && (
          <div className="flex flex-col items-center justify-center gap-4 py-16">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <Rocket className="absolute -right-1 -top-1 h-5 w-5 text-accent animate-bounce" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold">Creating your project...</p>
              <p className="text-xs text-muted-foreground mt-1">
                Setting up {plan?.lists.length} lists and {totalCards} cards
              </p>
            </div>
            {/* Progress dots */}
            <div className="flex gap-1.5 mt-2">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-2 w-2 rounded-full bg-primary animate-pulse"
                  style={{ animationDelay: `${i * 200}ms` }}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
