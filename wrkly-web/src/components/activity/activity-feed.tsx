'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bot,
  Plus,
  ArrowRight,
  Pencil,
  Archive,
  MessageSquare,
  UserPlus,
  Zap,
  List,
  ChevronDown,
  ChevronUp,
  Loader2,
  ActivityIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useBoardActivity, useCardActivity, type ActivityItem } from '@/hooks/use-activity';
import { cn } from '@/lib/utils';

// ── Action formatting ─────────────────────────────────────────────────────────

type ActionConfig = {
  color: string;     // Tailwind text colour class
  bgColor: string;   // Tailwind bg colour class for the icon badge
  icon: React.ReactNode;
  format: (meta: ActivityItem['metadata'], userName: string) => string;
};

const ACTION_MAP: Record<string, ActionConfig> = {
  'card.created': {
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/40',
    icon: <Plus className="h-3 w-3" />,
    format: (_m, u) => `${u} created this card`,
  },
  'card.moved': {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40',
    icon: <ArrowRight className="h-3 w-3" />,
    format: (m, u) => `${u} moved from ${m.fromList ?? '?'} → ${m.toList ?? '?'}`,
  },
  'card.updated': {
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
    icon: <Pencil className="h-3 w-3" />,
    format: (m, u) => `${u} updated ${m.field ?? 'this card'}`,
  },
  'card.archived': {
    color: 'text-slate-600 dark:text-slate-400',
    bgColor: 'bg-slate-100 dark:bg-slate-900/40',
    icon: <Archive className="h-3 w-3" />,
    format: (_m, u) => `${u} archived this card`,
  },
  'list.created': {
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-100 dark:bg-violet-900/40',
    icon: <List className="h-3 w-3" />,
    format: (m, u) => `${u} created list "${m.name ?? ''}"`,
  },
  'comment.added': {
    color: 'text-sky-600 dark:text-sky-400',
    bgColor: 'bg-sky-100 dark:bg-sky-900/40',
    icon: <MessageSquare className="h-3 w-3" />,
    format: (m, u) => {
      const preview = String(m.preview ?? '').slice(0, 60);
      return `${u} commented: "${preview}${preview.length < 60 ? '' : '…'}"`;
    },
  },
  'member.added': {
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/40',
    icon: <UserPlus className="h-3 w-3" />,
    format: (m, u) => `${u} added ${m.member ?? 'a member'}`,
  },
  'automation.executed': {
    color: 'text-orange-500 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/40',
    icon: <Zap className="h-3 w-3" />,
    format: (m) =>
      `Automation "${m.name ?? ''}": ${m.description ?? 'ran'}`,
  },
};

const FALLBACK_ACTION: ActionConfig = {
  color: 'text-muted-foreground',
  bgColor: 'bg-muted',
  icon: <ActivityIcon className="h-3 w-3" />,
  format: (_, u) => `${u} performed an action`,
};

function getActionConfig(action: string): ActionConfig {
  return ACTION_MAP[action] ?? FALLBACK_ACTION;
}

// ── Single activity item ──────────────────────────────────────────────────────

function ActivityRow({ item }: { item: ActivityItem }) {
  const isAutomation = item.action.startsWith('automation.');
  const cfg = getActionConfig(item.action);
  const userName = item.user?.name ?? 'Unknown';
  const initials = userName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const timeAgo = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

  return (
    <div className="flex items-start gap-3 py-2">
      {/* Avatar or bot icon */}
      {isAutomation ? (
        <div className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', cfg.bgColor)}>
          <Bot className={cn('h-3.5 w-3.5', cfg.color)} />
        </div>
      ) : (
        <Avatar className="h-6 w-6 shrink-0">
          <AvatarImage src={item.user?.avatarUrl ?? undefined} />
          <AvatarFallback className="text-[9px] font-semibold">{initials}</AvatarFallback>
        </Avatar>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          {/* Action text with type-badge */}
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <span className={cn('inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium leading-none', cfg.bgColor, cfg.color)}>
              {cfg.icon}
              <span className="ml-0.5">{item.action.split('.')[1]}</span>
            </span>
            <span className="text-xs leading-snug text-foreground/80">
              {cfg.format(item.metadata, userName)}
            </span>
          </div>
          {/* Time */}
          <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap mt-0.5">
            {timeAgo}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function ActivitySkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 py-2">
          <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Board activity feed ───────────────────────────────────────────────────────

function BoardFeed({ boardId }: { boardId: string }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useBoardActivity(boardId);

  const items = data?.pages.flatMap((p) => p.activity) ?? [];

  if (isLoading) return <ActivitySkeleton />;
  if (items.length === 0)
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        No activity yet.
      </p>
    );

  return (
    <div>
      <div className="divide-y divide-border/50">
        {items.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </div>
      {hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full text-xs text-muted-foreground"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <ChevronDown className="mr-2 h-3.5 w-3.5" />
          )}
          Load more
        </Button>
      )}
    </div>
  );
}

// ── Card activity feed ────────────────────────────────────────────────────────

function CardFeed({ cardId }: { cardId: string }) {
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCardActivity(cardId);

  const items = data?.pages.flatMap((p) => p.activity) ?? [];

  if (isLoading) return <ActivitySkeleton count={3} />;
  if (items.length === 0)
    return (
      <p className="py-4 text-center text-xs text-muted-foreground">
        No activity yet.
      </p>
    );

  return (
    <div>
      <div className="divide-y divide-border/50">
        {items.map((item) => (
          <ActivityRow key={item.id} item={item} />
        ))}
      </div>
      {hasNextPage && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full text-xs text-muted-foreground"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? (
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
          ) : (
            <ChevronDown className="mr-2 h-3.5 w-3.5" />
          )}
          Load more
        </Button>
      )}
    </div>
  );
}

// ── Exported composite component ──────────────────────────────────────────────

interface ActivityFeedProps {
  boardId?: string;
  cardId?: string;
  /** Show as a collapsible section (default: false) */
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export function ActivityFeed({
  boardId,
  cardId,
  collapsible = false,
  defaultExpanded = true,
}: ActivityFeedProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const header = (
    <div className="flex items-center gap-2">
      <ActivityIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <h3 className="text-sm font-semibold">Activity</h3>
      {collapsible && (
        <button
          className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {header}
      {(!collapsible || expanded) && (
        <>
          {boardId && <BoardFeed boardId={boardId} />}
          {cardId && <CardFeed cardId={cardId} />}
          {!boardId && !cardId && (
            <p className="text-xs text-muted-foreground">
              Pass boardId or cardId to load activity.
            </p>
          )}
        </>
      )}
    </div>
  );
}
