'use client';

import { useState } from 'react';
import { useOnlineUsers, type OnlineUser } from '@/hooks/use-online-users';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_VISIBLE = 5;

/** Generate a deterministic background color from a userId string. */
function userColor(userId: string): string {
  const colors = [
    'bg-indigo-500',
    'bg-emerald-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-cyan-500',
    'bg-violet-500',
    'bg-rose-500',
    'bg-amber-500',
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  return colors[hash % colors.length];
}

/** Get initials from a display name. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

interface AvatarProps {
  user: OnlineUser;
  /** Controls entry/exit animation via CSS. Pass false for overflow "+N" badge. */
  visible?: boolean;
}

function PresenceAvatar({ user }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="relative group/avatar animate-in fade-in slide-in-from-right-2 duration-300">
      {/* Avatar circle */}
      <div
        className={`w-7 h-7 rounded-full ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-white overflow-hidden shrink-0 ${
          user.avatarUrl && !imgError ? '' : userColor(user.userId)
        }`}
      >
        {user.avatarUrl && !imgError ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          initials(user.name)
        )}
      </div>

      {/* Green online dot */}
      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-1 ring-white" />

      {/* Tooltip */}
      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-150">
        <div className="bg-slate-800 text-white text-[11px] font-medium px-2 py-1 rounded-md whitespace-nowrap shadow-lg">
          {user.name}
        </div>
        {/* Arrow */}
        <div className="w-2 h-2 bg-slate-800 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2" />
      </div>
    </div>
  );
}

// ─── OnlineUsers component ────────────────────────────────────────────────────

interface OnlineUsersProps {
  /** The board room to track. Pass undefined to render nothing. */
  boardId: string | undefined;
  /** Optional extra class name for the container. */
  className?: string;
}

/**
 * Displays an avatar stack of users currently viewing the same board.
 *
 * - Shows up to 5 avatars, then "+N" overflow badge
 * - Each avatar has a green online dot + tooltip on hover
 * - Avatars animate in/out using Tailwind's animate-in classes
 *
 * Usage:
 * ```tsx
 * <OnlineUsers boardId={boardId} className="ml-4" />
 * ```
 *
 * Prerequisites: `useSocket(boardId)` must be called in a parent component
 * so the socket joins/leaves the board room correctly.
 */
export function OnlineUsers({ boardId, className = '' }: OnlineUsersProps) {
  const { onlineUsers } = useOnlineUsers(boardId);

  if (!boardId || onlineUsers.length === 0) return null;

  const visible = onlineUsers.slice(0, MAX_VISIBLE);
  const overflow = onlineUsers.length - MAX_VISIBLE;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Avatar stack — overlapping via negative margin */}
      <div className="flex items-center -space-x-2">
        {visible.map((user) => (
          <PresenceAvatar key={user.userId} user={user} />
        ))}

        {/* Overflow badge */}
        {overflow > 0 && (
          <div className="w-7 h-7 rounded-full bg-slate-200 ring-2 ring-white flex items-center justify-center text-[10px] font-bold text-slate-600 z-10">
            +{overflow}
          </div>
        )}
      </div>

      {/* Label */}
      <span className="text-[11px] text-slate-400 font-medium hidden sm:block">
        {onlineUsers.length === 1 ? '1 online' : `${onlineUsers.length} online`}
      </span>
    </div>
  );
}
