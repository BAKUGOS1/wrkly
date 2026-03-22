import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';
import { getSocket } from '@/lib/socket';
import type { Notification } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type NotificationCache = { notifications: Notification[] };
type UnreadCache      = { unreadCount: number };

// ── Subtle notification sound (Web Audio API) ─────────────────────────────────

function playNotificationBeep() {
  try {
    const ctx = new (window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext!)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available in this environment — silently skip
  }
}

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () => apiFetch<NotificationCache>('/api/notifications'),
    // Keep polling as fallback (covers missed WS events)
    refetchInterval: 60_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: queryKeys.notifications.unread,
    queryFn: () => apiFetch<UnreadCache>('/api/notifications/unread-count'),
    refetchInterval: 60_000,
  });
}

/**
 * Subscribes to real-time notification:new events from the server.
 *
 * @param isNotificationCenterOpen - pass `true` when the notification popover
 *   is open so that the toast is suppressed (user is already viewing it).
 */
export function useRealtimeNotifications(isNotificationCenterOpen = false) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Deduplication: track IDs we've already toasted within this session
  const toastedIds = useRef(new Set<string>());

  const handleNewNotification = useCallback(
    (notification: Notification) => {
      // 1. Prepend to the all-notifications cache
      queryClient.setQueryData<NotificationCache>(
        queryKeys.notifications.all,
        (old) => {
          if (!old) return { notifications: [notification] };
          // Deduplicate by ID (WebSocket may fire before the next poll)
          const exists = old.notifications.some((n) => n.id === notification.id);
          if (exists) return old;
          return { notifications: [notification, ...old.notifications] };
        }
      );

      // 2. Increment unread count
      queryClient.setQueryData<UnreadCache>(
        queryKeys.notifications.unread,
        (old) => ({ unreadCount: (old?.unreadCount ?? 0) + 1 })
      );

      // 3. Show toast — only if the notification center is closed and not duped
      if (!isNotificationCenterOpen && !toastedIds.current.has(notification.id)) {
        toastedIds.current.add(notification.id);

        toast({
          title: notification.title,
          description: notification.body ?? undefined,
          duration: 5000,
        });

        // 4. Play subtle audio cue
        playNotificationBeep();
      }
    },
    [queryClient, toast, isNotificationCenterOpen]
  );

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('notification:new', handleNewNotification);
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [handleNewNotification]);
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiFetch<{ message: string }>(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update notification',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>('/api/notifications/read-all', {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unread });
    },
    onError: (error) => {
      toast({
        title: 'Failed to mark all as read',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });
}
