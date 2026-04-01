'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useToast } from '@/hooks/use-toast';
import { format, isAfter, isBefore, isToday, addDays } from 'date-fns';
import {
  CheckSquare,
  Square,
  Clock,
  AlertTriangle,
  CalendarDays,
  ExternalLink,
  Inbox,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface MyCard {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string | null;
  isArchived: boolean;
  list: { name: string; board: { id: string; name: string } };
  labels: { label: { name: string; color: string } }[];
  priority?: string | null;
}

type FilterType = 'all' | 'today' | 'overdue' | 'upcoming';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDueBadge(dueDate: string | null | undefined) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  const now = new Date();
  if (isBefore(d, now)) return { label: 'Overdue', cls: 'bg-red-500/10 text-red-600 border-red-200' };
  if (isToday(d)) return { label: 'Due today', cls: 'bg-amber-500/10 text-amber-600 border-amber-200' };
  if (isBefore(d, addDays(now, 3))) return { label: 'Due soon', cls: 'bg-orange-500/10 text-orange-600 border-orange-200' };
  return { label: format(d, 'MMM d'), cls: 'bg-muted text-muted-foreground border-border' };
}

// ── Card Row ─────────────────────────────────────────────────────────────────

function TaskRow({ card, onComplete }: { card: MyCard; onComplete: (id: string) => void }) {
  const dueBadge = getDueBadge(card.dueDate);
  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    await onComplete(card.id);
    setCompleting(false);
  };

  return (
    <div className={cn(
      'group flex items-start gap-3 rounded-xl border border-border/50 bg-card p-3 transition-all hover:border-primary/20 hover:shadow-sm',
      completing && 'opacity-50 pointer-events-none'
    )}>
      {/* Check button */}
      <button
        onClick={handleComplete}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-green-500 transition-colors"
        title="Mark complete"
      >
        {completing
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <Square className="h-4 w-4 group-hover:hidden" />
        }
        {!completing && <CheckSquare className="h-4 w-4 hidden group-hover:block text-green-500" />}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{card.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {card.list.board.name} · {card.list.name}
          </span>
          {card.labels.slice(0, 3).map((l, i) => (
            <span
              key={i}
              className="text-[10px] px-1.5 py-0.5 rounded-full border font-medium"
              style={{ backgroundColor: l.label.color + '20', color: l.label.color, borderColor: l.label.color + '40' }}
            >
              {l.label.name}
            </span>
          ))}
        </div>
      </div>

      {/* Due badge */}
      {dueBadge && (
        <span className={cn('shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border', dueBadge.cls)}>
          {dueBadge.label}
        </span>
      )}

      {/* Open link */}
      <Link
        href={`/board/${card.list.board.id}?card=${card.id}`}
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
        title="Open card"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MyTasksPage() {
  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => apiFetch<{ cards: MyCard[] }>('/api/cards/mine'),
    enabled: !!token,
  });

  const completeMutation = useMutation({
    mutationFn: (cardId: string) =>
      apiFetch(`/api/cards/${cardId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isArchived: true }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
      toast({ title: '✅ Task completed!' });
    },
    onError: () => toast({ title: 'Failed to complete task', variant: 'destructive' }),
  });

  const cards = data?.cards ?? [];
  const now = new Date();

  const filtered = cards.filter((c) => {
    if (filter === 'overdue') return c.dueDate && isBefore(new Date(c.dueDate), now);
    if (filter === 'today') return c.dueDate && isToday(new Date(c.dueDate));
    if (filter === 'upcoming')
      return c.dueDate && isAfter(new Date(c.dueDate), now) && !isToday(new Date(c.dueDate));
    return true;
  });

  const overdueCount = cards.filter((c) => c.dueDate && isBefore(new Date(c.dueDate), now)).length;
  const todayCount = cards.filter((c) => c.dueDate && isToday(new Date(c.dueDate))).length;

  return (
    <div className="mx-auto max-w-3xl py-8 px-4">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-primary" />
            My Tasks
          </h1>
          <p className="mt-1 text-muted-foreground text-sm">
            Cards assigned to you across all boards
          </p>
        </div>
        {/* Stats pills */}
        <div className="flex items-center gap-2 mt-1">
          {overdueCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 border border-red-200">
              <AlertTriangle className="h-3 w-3" />
              {overdueCount} overdue
            </span>
          )}
          {todayCount > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-200">
              <Clock className="h-3 w-3" />
              {todayCount} due today
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)} className="mb-6">
        <TabsList className="h-9">
          <TabsTrigger value="all" className="text-xs gap-1.5">
            All <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{cards.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="overdue" className="text-xs gap-1.5">
            <AlertTriangle className="h-3 w-3" />
            Overdue
            {overdueCount > 0 && <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">{overdueCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="today" className="text-xs gap-1.5">
            <CalendarDays className="h-3 w-3" />
            Today
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs gap-1.5">
            <Clock className="h-3 w-3" />
            Upcoming
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <Inbox className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {filter === 'all' ? 'No tasks assigned to you' : `No ${filter} tasks`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {filter === 'all'
              ? 'When team members assign you to cards, they\'ll appear here.'
              : 'Switch to "All" to see all your tasks.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((card) => (
            <TaskRow
              key={card.id}
              card={card}
              onComplete={(id) => completeMutation.mutateAsync(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
