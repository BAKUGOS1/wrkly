'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Loader2, RefreshCw } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface BoardSummaryDialogProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BoardSummaryDialog({
  boardId,
  open,
  onOpenChange,
}: BoardSummaryDialogProps) {
  const { toast } = useToast();
  const [summary, setSummary] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ summary: string }>('/api/ai/summarize', {
        method: 'POST',
        body: JSON.stringify({ boardId }),
      });
      return res.summary;
    },
    onSuccess: (data) => {
      setSummary(data);
    },
    onError: (err) => {
      toast({
        title: 'Failed to generate summary',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
      onOpenChange(false);
    },
  });

  // Auto-fetch when opened if we don't have a summary yet
  // We use `onOpenChange` wrapper to handle this
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !summary && !mutation.isPending) {
      mutation.mutate();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Board Summary
          </DialogTitle>
          <DialogDescription>
            AI-generated status update for this project.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 min-h-[100px] flex items-center justify-center border rounded-md bg-muted/50 p-4">
          {mutation.isPending ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm">Analyzing board state...</p>
            </div>
          ) : summary ? (
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {summary}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No summary available.</p>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            variant="secondary"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
            className="gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Regenerate
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
