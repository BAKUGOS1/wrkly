'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, Loader2, Check, X, Send, Wand2 } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { AI_CONFIG } from '@/lib/ai-config';

interface AiContentAssistProps {
  currentContent: string;
  onApply: (newContent: string) => void;
  className?: string;
}

export function AiContentAssist({
  currentContent,
  onApply,
  className = '',
}: AiContentAssistProps) {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const assistMutation = useMutation({
    mutationFn: async ({ action, prompt }: { action: string; prompt?: string }) => {
      const res = await apiFetch<{ result: string }>('/api/ai/assist-content', {
        method: 'POST',
        body: JSON.stringify({ currentContent, action, customPrompt: prompt }),
      });
      return res.result;
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err) => {
      let description = err instanceof Error ? err.message : 'Unknown error';
      if (description.includes('Rate limit')) {
        description = "You've used too many AI requests. Please try again later.";
      } else if (description.includes('timeout') || description.toLowerCase().includes('taking too long')) {
        description = "AI is taking too long, please try again.";
      }
      
      toast({
        title: 'Failed to generate content',
        description,
        variant: 'destructive',
      });
    },
  });

  if (!AI_CONFIG.enabled) return null;

  const handleAction = (action: string) => {
    if (!currentContent.trim()) {
      toast({ title: 'Please enter some text first', variant: 'destructive' });
      return;
    }
    assistMutation.mutate({ action });
  };

  const handleCustomAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentContent.trim()) {
      toast({ title: 'Please enter some text first', variant: 'destructive' });
      return;
    }
    if (!customPrompt.trim()) return;
    assistMutation.mutate({ action: 'custom', prompt: customPrompt });
  };

  const handleApply = () => {
    if (result) {
      onApply(result);
      setOpen(false); // Close popover
    }
  };

  const handleDiscard = () => {
    setResult(null);
    setCustomPrompt('');
  };

  // Reset state when popover closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Small delay so animation finishes before resetting state
      setTimeout(() => {
        setResult(null);
        setCustomPrompt('');
        assistMutation.reset();
      }, 300);
    }
    setOpen(newOpen);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`h-6 w-6 rounded-full bg-background/80 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-600 dark:text-purple-400 shadow-sm border border-border/50 transition-opacity ${className}`}
          title="AI content assist"
        >
          <Sparkles className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3 shadow-xl flex flex-col gap-3"
        align="end"
        sideOffset={8}
      >
        <div className="flex items-center gap-2 pb-2 border-b">
          <Sparkles className="h-4 w-4 text-purple-500" />
          <h4 className="text-sm font-semibold">AI Assistant</h4>
        </div>

        {assistMutation.isPending ? (
          <div className="flex flex-col items-center justify-center py-6 gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
            <p className="text-sm text-muted-foreground animate-pulse">
              AI is drafting...
            </p>
          </div>
        ) : result ? (
          <div className="flex flex-col gap-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase flex justify-between">
              <span>Preview</span>
              <span>{result.length} characters</span>
            </div>
            <div className="bg-muted p-2 rounded text-sm text-foreground max-h-40 overflow-y-auto whitespace-pre-wrap">
              {result}
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" size="sm" onClick={handleDiscard}>
                <X className="h-4 w-4 mr-1" />
                Discard
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                onClick={handleApply}
              >
                <Check className="h-4 w-4 mr-1" />
                Apply
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2 h-8 text-xs font-medium"
                onClick={() => handleAction('improve')}
              >
                <Wand2 className="h-3.5 w-3.5 text-blue-500" />
                Improve writing
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2 h-8 text-xs font-medium"
                onClick={() => handleAction('shorter')}
              >
                <Wand2 className="h-3.5 w-3.5 text-green-500" />
                Make shorter
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2 h-8 text-xs font-medium"
                onClick={() => handleAction('detailed')}
              >
                <Wand2 className="h-3.5 w-3.5 text-orange-500" />
                Make more detailed
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2 h-8 text-xs font-medium"
                onClick={() => handleAction('checklist')}
              >
                <Wand2 className="h-3.5 w-3.5 text-purple-500" />
                Generate checklist
              </Button>
            </div>

            <div className="relative mt-1">
              <form onSubmit={handleCustomAction} className="flex gap-2">
                <Input
                  className="h-8 text-xs flex-1 pe-8"
                  placeholder="Tell AI what to do..."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                />
                <Button
                  type="submit"
                  size="icon"
                  variant="ghost"
                  className="absolute right-0 top-0 h-8 w-8 text-purple-600 hover:text-purple-700 hover:bg-transparent"
                  disabled={!customPrompt.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </form>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
