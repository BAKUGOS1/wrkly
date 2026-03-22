'use client';

import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { MessageSquare, AlignLeft, Clock } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { Card, User } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface CardWithRelations extends Card {
  labels?: { id: string; name: string; color: string }[];
  assignees?: { user: User }[];
  _count?: { comments: number; blocks: number };
}

interface CardItemProps {
  card: CardWithRelations;
  onClick?: (cardId: string) => void;
}

export function CardItem({ card, onClick }: CardItemProps) {
  // Due date logic
  let dueStatus: 'none' | 'overdue' | 'today' | 'soon' | 'future' = 'none';
  if (card.dueDate) {
    const due = new Date(card.dueDate);
    if (isPast(due) && !isToday(due)) {
      dueStatus = 'overdue';
    } else if (isToday(due)) {
      dueStatus = 'today';
    } else if (differenceInDays(due, new Date()) <= 3) {
      dueStatus = 'soon';
    } else {
      dueStatus = 'future';
    }
  }

  const getDueBadgeClass = () => {
    switch (dueStatus) {
      case 'overdue': return 'bg-destructive/10 text-destructive font-medium';
      case 'today': return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-500 font-medium';
      case 'soon': return 'text-yellow-700 dark:text-yellow-500 bg-muted/50';
      case 'future': return 'text-muted-foreground bg-muted/50';
      default: return 'hidden';
    }
  };
  
  const displayLabels = card.labels || [];
  const assignees = card.assignees || [];
  const maxStack = 3;

  return (
    <div
      onClick={() => onClick?.(card.id)}
      className="group flex cursor-pointer flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
    >
      {/* Cover Image Placeholder */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(card as any).coverUrl && (
        <div className="-mx-3 -mt-3 mb-1 h-24 overflow-hidden rounded-t-lg bg-muted">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any, @next/next/no-img-element */}
          <img src={(card as any).coverUrl} alt="Cover" className="h-full w-full object-cover" />
        </div>
      )}

      {/* Labels */}
      {displayLabels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {displayLabels.map((label) => (
            <span
              key={label.id}
              className="h-2 w-8 rounded-full"
              style={{ backgroundColor: label.color }}
              title={label.name}
            />
          ))}
        </div>
      )}

      {/* Title */}
      <h4 className="text-[14px] font-medium leading-snug text-card-foreground line-clamp-2">
        {card.title}
      </h4>

      {/* Footer Details */}
      {(dueStatus !== 'none' || (card._count?.blocks ?? 0) > 0 || (card._count?.comments ?? 0) > 0 || assignees.length > 0) && (
        <div className="mt-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Due Date */}
            {dueStatus !== 'none' && (
              <div className={cn("flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]", getDueBadgeClass())}>
                <Clock className="h-3 w-3" />
                <span>{format(new Date(card.dueDate!), 'MMM d')}</span>
              </div>
            )}

            {/* Indicators */}
            {(card._count?.blocks ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <AlignLeft className="h-3.5 w-3.5" />
              </div>
            )}
            {(card._count?.comments ?? 0) > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{card._count!.comments}</span>
              </div>
            )}
          </div>

          {/* Avatars */}
          {assignees.length > 0 && (
            <div className="flex -space-x-1.5">
              {assignees.slice(0, maxStack).map((a) => (
                <Avatar key={a.user.id} className="h-6 w-6 border-2 border-card">
                  <AvatarImage src={a.user.avatarUrl || ''} />
                  <AvatarFallback className="text-[10px] uppercase">
                    {a.user.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assignees.length > maxStack && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
                  +{assignees.length - maxStack}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
