'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { MessageSquare, Send, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/use-comments';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import type { Comment, User } from '@/types';

// ── Types ────────────────────────────────────────────────────────────────────

interface CommentWithUser extends Comment {
  user?: User;
}

interface CardCommentsProps {
  cardId: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string) {
  return (
    name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '?'
  );
}

/** MVP @mention: render @[userId] as bold inline text */
function renderContent(content: string) {
  const parts = content.split(/(@\[[^\]]+\])/g);
  return parts.map((part, i) => {
    const match = part.match(/^@\[([^\]]+)\]$/);
    if (match) {
      return (
        <span key={i} className="font-semibold text-primary">
          @{match[1]}
        </span>
      );
    }
    return part;
  });
}

// ── Auto-grow textarea hook ──────────────────────────────────────────────────

function useAutoGrow(ref: React.RefObject<HTMLTextAreaElement | null>, value: string) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 6 * 24)}px`; // max ~6 rows
  }, [ref, value]);
}

// ── Single Comment ───────────────────────────────────────────────────────────

function CommentItem({
  comment,
  isOwn,
  onDelete,
}: {
  comment: CommentWithUser;
  isOwn: boolean;
  onDelete: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(comment.content);
  const [showConfirm, setShowConfirm] = useState(false);

  const userName = comment.user?.name ?? 'Unknown';

  return (
    <div className="group flex gap-3">
      {/* Avatar */}
      <Avatar className="h-8 w-8 shrink-0 mt-0.5">
        <AvatarImage src={comment.user?.avatarUrl ?? undefined} alt={userName} />
        <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
          {getInitials(userName)}
        </AvatarFallback>
      </Avatar>

      {/* Body */}
      <div className="min-w-0 flex-1">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{userName}</span>
          <span className="text-[11px] text-muted-foreground">
            {formatDistanceToNow(new Date(comment.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>

        {/* Content or edit mode */}
        {isEditing ? (
          <div className="mt-1">
            <textarea
              className="w-full resize-none rounded-md border border-border bg-background p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
            />
            <div className="mt-1 flex items-center gap-2">
              <Button size="sm" onClick={() => setIsEditing(false)}>
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditValue(comment.content);
                  setIsEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-sm whitespace-pre-wrap text-foreground/90">
            {renderContent(comment.content)}
          </p>
        )}

        {/* Actions (only for own comments, on hover) */}
        {isOwn && !isEditing && (
          <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3 w-3" /> Edit
            </button>
            {showConfirm ? (
              <span className="inline-flex items-center gap-1 text-[11px]">
                <button
                  className="rounded px-1.5 py-0.5 text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(comment.id)}
                >
                  Confirm
                </button>
                <button
                  className="rounded px-1.5 py-0.5 text-muted-foreground hover:bg-muted"
                  onClick={() => setShowConfirm(false)}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setShowConfirm(true)}
              >
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export function CardComments({ cardId }: CardCommentsProps) {
  const currentUser = useAuthStore((s) => s.user);
  const { data: commentsData, isLoading } = useComments(cardId);
  const createComment = useCreateComment(cardId);
  const deleteComment = useDeleteComment(cardId);

  const [newComment, setNewComment] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useAutoGrow(textareaRef, newComment);

  const comments = (commentsData?.comments ?? []) as CommentWithUser[];

  // Auto-scroll to bottom when comments change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments.length]);

  const handleSubmit = useCallback(async () => {
    const trimmed = newComment.trim();
    if (!trimmed) return;
    setNewComment('');
    await createComment.mutateAsync({ content: trimmed });
  }, [newComment, createComment]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleDelete = useCallback(
    (commentId: string) => {
      deleteComment.mutate(commentId);
    },
    [deleteComment]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold text-foreground">
          Comments
          {comments.length > 0 && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              ({comments.length})
            </span>
          )}
        </h3>
      </div>

      {/* New comment input */}
      <div className="flex gap-3">
        <Avatar className="h-8 w-8 shrink-0 mt-0.5">
          <AvatarImage
            src={currentUser?.avatarUrl ?? undefined}
            alt={currentUser?.name ?? 'You'}
          />
          <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
            {getInitials(currentUser?.name)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="relative">
            <textarea
              ref={textareaRef}
              className={cn(
                'w-full resize-none rounded-md border border-border bg-muted/30 p-3 pr-12 text-sm',
                'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background',
                'transition-colors hover:bg-muted/50'
              )}
              rows={1}
              placeholder="Write a comment…"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button
              size="icon"
              variant="ghost"
              className="absolute right-1.5 bottom-1.5 h-7 w-7 text-muted-foreground hover:text-primary disabled:opacity-30"
              disabled={!newComment.trim() || createComment.isPending}
              onClick={handleSubmit}
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send comment</span>
            </Button>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Press <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">⌘</kbd>+
            <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">Enter</kbd> to send
          </p>
        </div>
      </div>

      {/* Comment list */}
      <div ref={scrollRef} className="flex flex-col gap-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-24 rounded bg-muted" />
                  <div className="h-3 w-full rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No comments yet. Be the first to add one!
          </p>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              isOwn={comment.userId === currentUser?.id}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </div>
  );
}
