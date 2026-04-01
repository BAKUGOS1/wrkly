'use client';

import { useMutation } from '@tanstack/react-query';
import { Sparkles, Loader2, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AI_CONFIG } from '@/lib/ai-config';

// ── Types ────────────────────────────────────────────────────────────────────

interface Suggestion {
  userId: string;
  name: string;
  reason: string;
  confidence: number;
}

interface AssigneeSuggestionProps {
  boardId: string;
  cardId: string;
  hasAssignees: boolean;
  onAssign: (userId: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AssigneeSuggestion({
  boardId,
  cardId,
  hasAssignees,
  onAssign,
}: AssigneeSuggestionProps) {
  const [dismissed, setDismissed] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ suggestions: Suggestion[] }>('/api/ai/suggest-assignee', {
        method: 'POST',
        body: JSON.stringify({ boardId, cardId }),
      });
      return res.suggestions;
    },
    onSuccess: (data) => setSuggestions(data),
  });

  // Don't show if: AI disabled, has assignees, dismissed, or already has suggestions
  if (!AI_CONFIG.suggestionsEnabled || hasAssignees || dismissed) return null;

  // Show trigger button if no suggestions yet
  if (!suggestions && !mutation.isPending) {
    return (
      <button
        onClick={() => mutation.mutate()}
        className="flex items-center gap-1.5 text-[11px] text-purple-500 hover:text-purple-400 transition-colors py-1"
      >
        <Sparkles className="h-3 w-3" />
        AI: Suggest assignee
      </button>
    );
  }

  // Loading
  if (mutation.isPending) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-purple-500 py-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Finding best match…
      </div>
    );
  }

  // Show suggestions
  if (suggestions && suggestions.length > 0) {
    return (
      <div className="flex flex-col gap-1.5 py-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium text-purple-500 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-2.5 w-2.5" />
            AI Suggestions
          </span>
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3 w-3" />
          </button>
        </div>
        {suggestions.map((s) => (
          <button
            key={s.userId}
            onClick={() => {
              onAssign(s.userId);
              setDismissed(true);
            }}
            className={cn(
              'flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-left transition-colors',
              'bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/10'
            )}
          >
            <UserPlus className="h-3.5 w-3.5 text-purple-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-foreground">{s.name}</span>
              <p className="text-[10px] text-muted-foreground truncate">{s.reason}</p>
            </div>
            <div
              className={cn(
                'h-1.5 w-1.5 rounded-full shrink-0',
                s.confidence >= 0.8 ? 'bg-green-500' :
                s.confidence >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              title={`${Math.round(s.confidence * 100)}% confidence`}
            />
          </button>
        ))}
      </div>
    );
  }

  return null;
}
