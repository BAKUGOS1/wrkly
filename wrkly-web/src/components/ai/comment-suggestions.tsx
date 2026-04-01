'use client';

import { useMutation } from '@tanstack/react-query';
import { Sparkles, Loader2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AI_CONFIG } from '@/lib/ai-config';

// ── Types ────────────────────────────────────────────────────────────────────

interface CommentSuggestionsProps {
  cardId: string;
  onSelect: (text: string) => void;
  hasCommented: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

export function CommentSuggestions({ cardId, onSelect, hasCommented }: CommentSuggestionsProps) {
  const [dismissed, setDismissed] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ suggestions: string[] }>('/api/ai/suggest-replies', {
        method: 'POST',
        body: JSON.stringify({ cardId }),
      });
      return res.suggestions;
    },
    onSuccess: (data) => setSuggestions(data),
  });

  // Auto-fetch when component mounts (if AI enabled)
  useEffect(() => {
    if (AI_CONFIG.suggestionsEnabled && !hasCommented && !dismissed) {
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  // Hide after first comment or if dismissed
  if (!AI_CONFIG.suggestionsEnabled || hasCommented || dismissed) return null;

  // Loading state
  if (mutation.isPending) {
    return (
      <div className="flex items-center gap-1.5 py-1 px-1">
        <Loader2 className="h-3 w-3 animate-spin text-purple-500" />
        <span className="text-[11px] text-purple-500">Generating suggestions…</span>
      </div>
    );
  }

  // No suggestions
  if (suggestions.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 mb-2">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-medium text-purple-500 uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="h-2.5 w-2.5" />
          Quick Replies
        </span>
        <button
          onClick={() => setDismissed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {suggestions.map((text, i) => (
          <button
            key={i}
            onClick={() => {
              onSelect(text);
              setDismissed(true);
            }}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-medium',
              'bg-purple-500/5 text-purple-700 dark:text-purple-300',
              'border border-purple-500/15 hover:bg-purple-500/10 hover:border-purple-500/25',
              'transition-all duration-150 cursor-pointer'
            )}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
