'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  AtSign,
  Clock,
  UserPlus,
  Zap,
  CheckCheck,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  useNotifications,
  useUnreadCount,
  useMarkRead,
  useMarkAllRead,
  useRealtimeNotifications,
} from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

const typeIcons: Record<string, typeof AtSign> = {
  mention: AtSign,
  reminder: Clock,
  assignment: UserPlus,
  automation: Zap,
};

function NotificationIcon({ type }: { type: string }) {
  const Icon = typeIcons[type] ?? Bell;
  return <Icon className="h-[14px] w-[14px] shrink-0 text-muted-foreground" />;
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: (id: string, link?: string | null) => void;
}) {
  return (
    <button
      onClick={() => onRead(notification.id, notification.link)}
      className={cn(
        'group flex w-full items-start gap-[12px] rounded-[8px] p-[12px] text-left transition-colors relative',
        'hover:bg-surface-container focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50',
        !notification.isRead ? 'bg-primary/5' : 'bg-transparent'
      )}
    >
      {/* Unread dot */}
      <div className="mt-[6px] flex shrink-0 items-center justify-center w-[8px]">
        {!notification.isRead && (
          <span className="h-[6px] w-[6px] rounded-full bg-primary" />
        )}
      </div>

      {/* Icon */}
      <div className={cn(
        "mt-[2px] flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-full border",
        !notification.isRead ? "border-primary/20 bg-primary/10 text-primary" : "border-border/50 bg-surface-container-high text-muted-foreground"
      )}>
        <NotificationIcon type={notification.type} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-[16px]">
        <p className={cn(
          "text-[13px] leading-snug",
          !notification.isRead ? "font-semibold text-foreground" : "font-medium text-foreground/80"
        )}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-[4px] text-[12px] text-muted-foreground line-clamp-2 leading-relaxed">
            {notification.body}
          </p>
        )}
        <p className="mt-[6px] text-[10px] font-medium text-muted-foreground/60 tracking-wide uppercase">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
    </button>
  );
}

export function NotificationDropdown() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data: notificationsData, isLoading } = useNotifications();
  const { data: unreadData } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  useRealtimeNotifications(open);

  const notifications = notificationsData?.notifications ?? [];
  const unreadCount = unreadData?.unreadCount ?? 0;

  const handleRead = (id: string, link?: string | null) => {
    markRead.mutate(id);
    if (link) {
      router.push(link);
      setOpen(false);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-[36px] w-[36px] rounded-full text-muted-foreground hover:text-foreground hover:bg-surface-container-high">
          <Bell className="h-[18px] w-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute right-[6px] top-[6px] flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-primary px-[4px] text-[9px] font-bold text-primary-foreground animate-in fade-in zoom-in-50 border-[2px] border-background">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[380px] p-0 rounded-[16px] bg-surface-container-lowest border border-border/40 shadow-xl overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 px-[20px] py-[16px] bg-surface-container-lowest">
          <h4 className="text-[14px] font-bold text-foreground font-manrope">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-[8px] py-[4px] text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-container rounded-[6px]"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="mr-[6px] h-[12px] w-[12px]" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-[400px] overflow-y-auto bg-surface-container-lowest overscroll-contain">
          {isLoading ? (
            <div className="space-y-[8px] p-[12px]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-[12px] rounded-[8px] p-[12px] animate-pulse">
                  <div className="mt-[6px] h-[6px] w-[6px] rounded-full bg-muted/50" />
                  <div className="h-[24px] w-[24px] rounded-full bg-muted/50" />
                  <div className="flex-1 space-y-[8px]">
                    <div className="h-[12px] w-3/4 rounded-[4px] bg-muted/50" />
                    <div className="h-[10px] w-1/2 rounded-[4px] bg-muted/30" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-[12px] py-[40px] text-muted-foreground">
              <div className="flex h-[48px] w-[48px] items-center justify-center rounded-full bg-surface-container-high border border-border/50">
                <Inbox className="h-[20px] w-[20px] text-muted-foreground/70" />
              </div>
              <div className="text-center">
                <p className="text-[14px] font-semibold text-foreground">You&apos;re all caught up</p>
                <p className="text-[12px] text-muted-foreground mt-[2px]">No new notifications to display.</p>
              </div>
            </div>
          ) : (
            <div className="p-[8px] flex flex-col gap-[2px]">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={handleRead}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-[20px] py-[12px] bg-surface-container/50 flex justify-center">
          <button
            onClick={() => {
              router.push('/settings');
              setOpen(false);
            }}
            className="text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground inline-flex items-center gap-[4px]"
          >
            Notification Settings 
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
