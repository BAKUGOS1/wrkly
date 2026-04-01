'use client';

import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Sparkles,
  Loader2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Lightbulb,
  X,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartTooltip,
  ResponsiveContainer,
} from 'recharts';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { AI_CONFIG } from '@/lib/ai-config';

// ── Types ────────────────────────────────────────────────────────────────────

interface BoardInsights {
  healthScore: number;
  healthLabel: string;
  bottlenecks: Array<{ listName: string; cardCount: number; reason: string }>;
  velocity: {
    cardsCompletedThisWeek: number;
    cardsCompletedLastWeek: number;
    trend: 'up' | 'down' | 'stable';
  };
  distribution: {
    byList: Array<{ name: string; count: number }>;
    byLabel: Array<{ name: string; count: number }>;
    byAssignee: Array<{ name: string; count: number }>;
  };
  recommendations: string[];
}

interface BoardInsightsPanelProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  'hsl(234, 89%, 64%)',   // primary blue
  'hsl(262, 83%, 68%)',   // accent violet
  'hsl(160, 84%, 39%)',   // success green
  'hsl(38, 92%, 50%)',    // warning amber
  'hsl(340, 75%, 55%)',   // rose
  'hsl(190, 80%, 45%)',   // teal
  'hsl(280, 60%, 55%)',   // purple
  'hsl(24, 85%, 55%)',    // orange
];

// ── Health Ring ──────────────────────────────────────────────────────────────

function HealthRing({ score, label }: { score: number; label: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color =
    score >= 80 ? 'hsl(160, 84%, 39%)' :
    score >= 60 ? 'hsl(234, 89%, 64%)' :
    score >= 40 ? 'hsl(38, 92%, 50%)' :
    'hsl(0, 84%, 60%)';

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-[140px] w-[140px]">
        <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle
            cx="60" cy="60" r={radius} fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold" style={{ color }}>{score}</span>
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">/ 100</span>
        </div>
      </div>
      <span
        className="text-sm font-semibold px-3 py-1 rounded-full"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Velocity ─────────────────────────────────────────────────────────────────

function VelocityCard({ velocity }: { velocity: BoardInsights['velocity'] }) {
  const TrendIcon = velocity.trend === 'up' ? TrendingUp : velocity.trend === 'down' ? TrendingDown : Minus;
  const trendColor = velocity.trend === 'up' ? 'text-green-500' : velocity.trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
  const diff = velocity.cardsCompletedThisWeek - velocity.cardsCompletedLastWeek;

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Sprint Velocity</h4>
      </div>
      <div className="flex items-end gap-6">
        <div>
          <span className="text-3xl font-bold text-foreground">{velocity.cardsCompletedThisWeek}</span>
          <p className="text-xs text-muted-foreground mt-0.5">cards this week</p>
        </div>
        <div className="flex items-center gap-1 pb-1">
          <TrendIcon className={cn('h-4 w-4', trendColor)} />
          <span className={cn('text-sm font-medium', trendColor)}>
            {diff > 0 ? `+${diff}` : diff} vs last week
          </span>
        </div>
      </div>
      <div className="mt-3 flex gap-1 h-[32px] items-end">
        {[velocity.cardsCompletedLastWeek, velocity.cardsCompletedThisWeek].map((val, i) => {
          const max = Math.max(velocity.cardsCompletedLastWeek, velocity.cardsCompletedThisWeek, 1);
          const height = (val / max) * 28 + 4;
          return (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all duration-500"
              style={{
                height: `${height}px`,
                backgroundColor: i === 1 ? 'hsl(234, 89%, 64%)' : 'hsl(var(--muted))',
              }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">Last week</span>
        <span className="text-[10px] text-muted-foreground">This week</span>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function BoardInsightsPanel({ boardId, open, onOpenChange }: BoardInsightsPanelProps) {
  const { toast } = useToast();
  const [insights, setInsights] = useState<BoardInsights | null>(null);

  // Read auto-load preference
  const [autoLoad, setAutoLoad] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('wrkly:auto-load-insights') !== 'false';
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<BoardInsights>('/api/ai/insights', {
        method: 'POST',
        body: JSON.stringify({ boardId }),
      });
      return res;
    },
    onSuccess: (data) => setInsights(data),
    onError: (err) => {
      toast({
        title: 'Failed to generate insights',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  // Auto-load when panel opens
  useEffect(() => {
    if (open && autoLoad && !insights && !mutation.isPending) {
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoLoad]);

  // Reset on close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) setInsights(null);
    onOpenChange(newOpen);
  };

  const toggleAutoLoad = () => {
    const next = !autoLoad;
    setAutoLoad(next);
    localStorage.setItem('wrkly:auto-load-insights', String(next));
  };

  if (!AI_CONFIG.insightsEnabled) return null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[480px] overflow-y-auto p-0 border-l border-border/40 bg-background">
        {/* Header */}
        <SheetHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/40 px-6 py-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Board Insights
            </SheetTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                {insights ? 'Refresh' : 'Generate'}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {/* Auto-load toggle */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
            <span className="text-xs text-muted-foreground">Auto-load on open</span>
            <button
              onClick={toggleAutoLoad}
              className={cn(
                'relative inline-flex h-5 w-9 rounded-full transition-colors',
                autoLoad ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 rounded-full bg-white transition-transform mt-0.5',
                  autoLoad ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="p-6">
          {mutation.isPending ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <div className="relative">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-accent animate-pulse" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Analyzing your board…</p>
                <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
              </div>
            </div>
          ) : insights ? (
            <div className="flex flex-col gap-6">
              {/* Health Score */}
              <div className="flex flex-col items-center py-4">
                <HealthRing score={insights.healthScore} label={insights.healthLabel} />
              </div>

              {/* Velocity */}
              <VelocityCard velocity={insights.velocity} />

              {/* Bottlenecks */}
              {insights.bottlenecks.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <h4 className="text-sm font-semibold">Bottlenecks</h4>
                  </div>
                  <div className="flex flex-col gap-2">
                    {insights.bottlenecks.map((b, i) => (
                      <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-warning/5 border border-warning/10">
                        <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-warning">{b.cardCount}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{b.listName}</p>
                          <p className="text-xs text-muted-foreground">{b.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Distribution by List */}
              {insights.distribution.byList.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold">Cards by List</h4>
                  </div>
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={insights.distribution.byList} layout="vertical" margin={{ left: 0, right: 16 }}>
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={90}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RechartTooltip
                          contentStyle={{
                            background: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {insights.distribution.byList.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Distribution by Assignee (Pie) */}
              {insights.distribution.byAssignee.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BarChart3 className="h-4 w-4 text-accent" />
                    <h4 className="text-sm font-semibold">Workload by Member</h4>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-[140px] w-[140px] shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={insights.distribution.byAssignee}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={60}
                            paddingAngle={3}
                          >
                            {insights.distribution.byAssignee.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-1.5 min-w-0">
                      {insights.distribution.byAssignee.map((a, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="truncate text-foreground">{a.name}</span>
                          <span className="text-muted-foreground ml-auto">{a.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {insights.recommendations.length > 0 && (
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="h-4 w-4 text-accent" />
                    <h4 className="text-sm font-semibold">AI Recommendations</h4>
                  </div>
                  <div className="flex flex-col gap-2">
                    {insights.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-accent/5">
                        <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        <span className="text-foreground/90">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Board Intelligence</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">
                  Get AI-powered health analysis, bottleneck detection, and actionable recommendations.
                </p>
              </div>
              <Button onClick={() => mutation.mutate()} className="gap-2" size="sm">
                <Sparkles className="h-3.5 w-3.5" />
                Generate Insights
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
