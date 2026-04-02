'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { PresenceUser } from '@/hooks/use-board-presence';

interface PresenceAvatarsProps {
  users: PresenceUser[];
  getColor: (userId: string) => string;
  className?: string;
}

export function PresenceAvatars({ users, getColor, className }: PresenceAvatarsProps) {
  if (users.length === 0) return null;

  const displayUsers = users.slice(0, 5);
  const extraCount   = Math.max(0, users.length - 5);

  return (
    <div className={cn('flex -space-x-2 items-center', className)}>
      {displayUsers.map((user) => {
        const initials = user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
        const color = getColor(user.userId);
        return (
          <Tooltip key={user.userId}>
            <TooltipTrigger asChild>
              <div className="relative">
                {/* Online dot */}
                <span
                  className="absolute -top-0.5 -right-0.5 z-10 h-2.5 w-2.5 rounded-full border-2 border-background animate-pulse"
                  style={{ backgroundColor: color }}
                />
                <Avatar
                  className="h-[28px] w-[28px] border-2 border-background ring-1 ring-border/30 cursor-pointer transition-transform hover:scale-110 hover:z-10 relative"
                  style={{ borderColor: color + '44' }}
                >
                  <AvatarImage src={user.avatarUrl ?? undefined} />
                  <AvatarFallback
                    className="text-[10px] font-bold text-white"
                    style={{ backgroundColor: color }}
                  >
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              <span className="font-medium">{user.name}</span>
              <span className="ml-1.5 text-muted-foreground opacity-70">● Online</span>
            </TooltipContent>
          </Tooltip>
        );
      })}
      {extraCount > 0 && (
        <div className="h-[28px] w-[28px] rounded-full border-2 border-background bg-muted flex items-center justify-center ring-1 ring-border/30">
          <span className="text-[10px] font-semibold text-muted-foreground">+{extraCount}</span>
        </div>
      )}
    </div>
  );
}
