'use client';

import { useRouter } from 'next/navigation';
import { Bell, AtSign, Clock, UserPlus, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/types';

// ── Icon mapping (keep in sync with notification-center.tsx) ──────────────────

const typeIcons: Record<string, typeof AtSign> = {
  mention:    AtSign,
  reminder:   Clock,
  assignment: UserPlus,
  automation: Zap,
};

function NotificationTypeIcon({ type }: { type: string }) {
  const Icon = typeIcons[type] ?? Bell;
  return <Icon className="h-4 w-4 shrink-0" />;
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface NotificationToastProps {
  notification: Notification;
  /** Called when the toast is dismissed or clicked */
  onDismiss: () => void;
}

/**
 * A transient toast that appears when a new real-time notification arrives.
 *
 * Features:
 * - Auto-dismisses after 5 seconds
 * - Click navigates to notification.link
 * - Slide-in entrance / slide-out exit animations
 */
export function NotificationToast({ notification, onDismiss }: NotificationToastProps) {
  const router = useRouter();

  const handleClick = () => {
    if (notification.link) {
      router.push(notification.link);
    }
    onDismiss();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        // Layout
        'flex w-[360px] items-start gap-3 rounded-xl border border-border/60 p-4',
        // Appearance
        'bg-background/95 shadow-lg backdrop-blur-md',
        // Interaction
        'cursor-pointer text-left transition-all duration-150',
        'hover:bg-accent/50 hover:shadow-xl',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        // Animation
        'animate-in slide-in-from-right-5 fade-in duration-300',
      )}
      aria-label={`Notification: ${notification.title}`}
    >
      {/* Colored icon container */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <NotificationTypeIcon type={notification.type} />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-foreground line-clamp-1">
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
            {notification.body}
          </p>
        )}
      </div>

      {/* Dismiss button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className={cn(
          'ml-1 shrink-0 rounded-md p-0.5 text-muted-foreground/60',
          'transition-colors hover:bg-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        )}
        aria-label="Dismiss notification"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </button>
  );
}
