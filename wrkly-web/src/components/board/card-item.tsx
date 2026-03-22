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
      className="group flex cursor-pointer flex-col gap-[8px] rounded-[8px] bg-surface-container-lowest p-[14px] shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-border/5 transition-all hover:shadow-md hover:ring-border/20"
    >
      {/* Cover Image Placeholder */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {(card as any).coverUrl && (
        <div className="-mx-[14px] -mt-[14px] mb-[4px] h-[96px] overflow-hidden rounded-t-[8px] bg-muted">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any, @next/next/no-img-element */}
          <img src={(card as any).coverUrl} alt="Cover" className="h-[full] w-[full] object-cover" />
        </div>
      )}

      {/* Labels */}
      {displayLabels.length > 0 && (
        <div className="flex flex-wrap gap-[6px] mb-[2px]">
          {displayLabels.map((label) => (
            <span
              key={label.id}
              className="px-[6px] py-[2px] rounded-[4px] text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: label.color }}
              title={label.name}
            >
              {label.name || "LABEL"}
            </span>
          ))}
        </div>
      )}

      {/* Title */}
      <h4 className="text-[14px] font-medium leading-snug text-foreground line-clamp-2">
        {card.title}
      </h4>

      {/* Footer Details */}
      {(dueStatus !== 'none' || (card._count?.blocks ?? 0) > 0 || (card._count?.comments ?? 0) > 0 || assignees.length > 0) && (
        <div className="mt-[4px] flex items-center justify-between">
          <div className="flex items-center gap-[12px]">
            {/* Due Date */}
            {dueStatus !== 'none' && (
              <div className={cn("flex items-center gap-[4px] rounded-[4px] px-[6px] py-[2px] text-[11px]", getDueBadgeClass())}>
                <Clock className="h-[12px] w-[12px]" />
                <span className="font-semibold">{format(new Date(card.dueDate!), 'MMM d')}</span>
              </div>
            )}

            {/* Indicators */}
            {(card._count?.blocks ?? 0) > 0 && (
              <div className="flex items-center gap-[4px] text-[12px] text-muted-foreground">
                <AlignLeft className="h-[14px] w-[14px]" />
              </div>
            )}
            {(card._count?.comments ?? 0) > 0 && (
              <div className="flex items-center gap-[4px] text-[12px] text-muted-foreground">
                <MessageSquare className="h-[14px] w-[14px]" />
                <span className="font-medium">{card._count!.comments}</span>
              </div>
            )}
          </div>

          {/* Avatars */}
          {assignees.length > 0 && (
            <div className="flex -space-x-[6px]">
              {assignees.slice(0, maxStack).map((a) => (
                <Avatar key={a.user.id} className="h-[24px] w-[24px] border-2 border-surface-container-lowest">
                  <AvatarImage src={a.user.avatarUrl || ''} />
                  <AvatarFallback className="text-[9px] font-bold bg-surface-container-high uppercase">
                    {a.user.name.substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {assignees.length > maxStack && (
                <div className="flex h-[24px] w-[24px] items-center justify-center rounded-full border-2 border-surface-container-lowest bg-surface-container-high text-[9px] font-bold text-muted-foreground">
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
