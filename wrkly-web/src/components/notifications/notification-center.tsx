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

// ── Icon Mapping ─────────────────────────────────────────────────────────────

const typeIcons: Record<string, typeof AtSign> = {
  mention: AtSign,
  reminder: Clock,
  assignment: UserPlus,
  automation: Zap,
};

function NotificationIcon({ type }: { type: string }) {
  const Icon = typeIcons[type] ?? Bell;
  return <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

// ── Single Notification Item ─────────────────────────────────────────────────

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
        'flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
        'hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        !notification.isRead && 'bg-primary/[0.03]'
      )}
    >
      {/* Unread dot */}
      <div className="mt-1.5 flex shrink-0 items-center justify-center w-2">
        {!notification.isRead && (
          <span className="h-2 w-2 rounded-full bg-primary" />
        )}
      </div>

      {/* Icon */}
      <div className="mt-0.5">
        <NotificationIcon type={notification.type} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'text-sm leading-snug',
            !notification.isRead ? 'font-semibold' : 'font-normal'
          )}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {notification.body}
          </p>
        )}
        <p className="mt-1 text-[11px] text-muted-foreground/70">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
    </button>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function NotificationCenter() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const { data: notificationsData, isLoading } = useNotifications();
  const { data: unreadData } = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  // Subscribe to real-time pushes — suppress toast when the panel is visible
  useRealtimeNotifications(open);

  const notifications = notificationsData?.notifications ?? [];
  const unreadCount = unreadData?.unreadCount ?? 0;

  const handleRead = (id: string, link?: string | null) => {
    markRead.mutate(id);
    if (link) {
      router.push(link);
    }
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-in fade-in zoom-in-50">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className="w-[380px] p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="mr-1 h-3 w-3" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-md px-3 py-2.5"
                >
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-muted" />
                  <div className="h-4 w-4 rounded bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
              <Inbox className="h-8 w-8" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-0.5 p-1.5">
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
        <div className="border-t border-border px-4 py-2.5">
          <button
            onClick={() => router.push('/app/notifications')}
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all →
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
