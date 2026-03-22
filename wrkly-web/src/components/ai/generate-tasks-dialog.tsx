'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, Loader2, Layout } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { queryKeys } from '@/lib/query-keys';

interface GeneratedList {
  name: string;
  cards: { title: string; description?: string }[];
}

// Editable structured preview of tasks
function ListsPreview({ lists }: { lists: GeneratedList[] }) {
  return (
    <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2">
      {lists.map((list, i) => (
        <div key={i} className="border rounded-md bg-muted/30 p-3">
          <h4 className="font-semibold text-sm mb-2">{list.name}</h4>
          <div className="flex flex-col gap-2">
            {list.cards.map((card, j) => (
              <div key={j} className="bg-background border rounded p-2 text-sm shadow-sm">
                <div className="font-medium">{card.title}</div>
                {card.description && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {card.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

interface GenerateTasksDialogProps {
  boardId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GenerateTasksDialog({
  boardId,
  open,
  onOpenChange,
}: GenerateTasksDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState('');
  const [generatedLists, setGeneratedLists] = useState<GeneratedList[] | null>(null);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ lists: GeneratedList[]; confirm: boolean }>('/api/ai/generate-tasks', {
        method: 'POST',
        body: JSON.stringify({ boardId, description: prompt }),
      });
      return res.lists;
    },
    onSuccess: (data) => {
      setGeneratedLists(data);
    },
    onError: (err) => {
      toast({
        title: 'Failed to generate tasks',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (lists: GeneratedList[]) => {
      await apiFetch('/api/ai/generate-tasks/execute', {
        method: 'POST',
        body: JSON.stringify({ boardId, lists }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
      toast({ title: 'Tasks created successfully!' });
      handleClose();
    },
    onError: (err) => {
      toast({
        title: 'Failed to create tasks',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setPrompt('');
    setGeneratedLists(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5 text-primary" />
            Generate Board Structure
          </DialogTitle>
          <DialogDescription>
            Describe your project, and AI will create lists and tasks for you.
          </DialogDescription>
        </DialogHeader>

        {!generatedLists ? (
          <div className="flex flex-col gap-4 py-2">
            <Textarea
              placeholder="e.g. Build a marketing landing page. We need copy, design, dev, and SEO tasks..."
              value={prompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending || prompt.trim().length < 5}
                className="gap-2 bg-primary text-primary-foreground"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <ListsPreview lists={generatedLists} />
            <div className="flex justify-between items-center mt-2">
              <span className="text-sm text-muted-foreground">
                Total limits generated: {generatedLists.length}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setGeneratedLists(null)} disabled={executeMutation.isPending}>
                  Back & Edit Prompt
                </Button>
                <Button
                  onClick={() => executeMutation.mutate(generatedLists)}
                  disabled={executeMutation.isPending}
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  {executeMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create All on Board'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
