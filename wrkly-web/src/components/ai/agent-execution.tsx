'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  MoveRight,
  Plus,
  Tag,
  Calendar,
  Archive,
  Search,
  UserPlus,
  UserMinus,
  Type,
  Bot,
} from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

interface ToolCallResult {
  toolName: string;
  args: Record<string, unknown>;
  success: boolean;
  result: string;
}

interface AgentExecutionProps {
  boardId: string;
  toolCalls: ToolCall[];
  summary: string;
  onClose: () => void;
}

// ── Tool Icons ───────────────────────────────────────────────────────────────

function ToolIcon({ name }: { name: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    move_card: <MoveRight className="h-3.5 w-3.5 text-purple-500" />,
    create_card: <Plus className="h-3.5 w-3.5 text-green-500" />,
    create_list: <Plus className="h-3.5 w-3.5 text-blue-500" />,
    assign_member: <UserPlus className="h-3.5 w-3.5 text-cyan-500" />,
    remove_assignee: <UserMinus className="h-3.5 w-3.5 text-orange-500" />,
    set_due_date: <Calendar className="h-3.5 w-3.5 text-indigo-500" />,
    add_label: <Tag className="h-3.5 w-3.5 text-amber-500" />,
    archive_card: <Archive className="h-3.5 w-3.5 text-red-500" />,
    rename_list: <Type className="h-3.5 w-3.5 text-teal-500" />,
    search_cards: <Search className="h-3.5 w-3.5 text-gray-500" />,
  };
  return <>{iconMap[name] || <Bot className="h-3.5 w-3.5 text-muted-foreground" />}</>;
}

function formatToolCall(tc: ToolCall): string {
  const a = tc.args;
  switch (tc.name) {
    case 'move_card': return `Move card → list ${String(a.targetListId ?? '').slice(0, 8)}…`;
    case 'create_card': return `Create "${String(a.title ?? '').slice(0, 30)}"`;
    case 'create_list': return `Create list "${String(a.name ?? '')}"`;
    case 'assign_member': return `Assign ${String(a.memberName ?? '')} to card`;
    case 'remove_assignee': return `Remove assignee from card`;
    case 'set_due_date': return `Set due date to ${String(a.dueDate ?? '')}`;
    case 'add_label': return `Add label "${String(a.label ?? '')}"`;
    case 'archive_card': return `Archive card`;
    case 'rename_list': return `Rename list to "${String(a.newName ?? '')}"`;
    case 'search_cards': return `Search: "${String(a.query ?? '')}"`;
    default: return tc.name;
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function AgentExecution({ boardId, toolCalls, summary, onClose }: AgentExecutionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [results, setResults] = useState<ToolCallResult[] | null>(null);
  const [executionSummary, setExecutionSummary] = useState<string | null>(null);

  const executeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ results: ToolCallResult[]; summary: string }>(
        '/api/ai/agent/execute',
        {
          method: 'POST',
          body: JSON.stringify({ boardId, toolCalls }),
        }
      );
      return res;
    },
    onSuccess: (data) => {
      setResults(data.results);
      setExecutionSummary(data.summary);
      queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(boardId) });
      toast({ title: 'Agent completed', description: data.summary });
    },
    onError: (err) => {
      toast({
        title: 'Agent execution failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  const _succeeded = results?.filter((r) => r.success).length ?? 0;
  const failed = results?.filter((r) => !r.success).length ?? 0;

  return (
    <div className="flex flex-col gap-3 p-4 border rounded-xl bg-card">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          AI Agent — {toolCalls.length} Tool Call{toolCalls.length !== 1 ? 's' : ''}
        </h3>
        <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          Agent Mode
        </span>
      </div>

      {/* Summary */}
      <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">{summary}</p>

      {/* Tool calls list */}
      <div className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto pr-1">
        {toolCalls.map((tc, i) => {
          const result = results?.[i];
          const isRunning = executeMutation.isPending && !results;

          return (
            <div
              key={i}
              className={cn(
                'flex items-center gap-2 text-xs p-2 border rounded-lg transition-all',
                result?.success === true && 'border-green-500/20 bg-green-500/5',
                result?.success === false && 'border-red-500/20 bg-red-500/5',
                !result && 'bg-background'
              )}
            >
              {/* Status icon */}
              <div className="shrink-0 w-5 flex justify-center">
                {result?.success === true ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : result?.success === false ? (
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                ) : isRunning ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <div className="h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
                )}
              </div>

              {/* Tool icon */}
              <ToolIcon name={tc.name} />

              {/* Description */}
              <span className="flex-1 truncate text-foreground/90">{formatToolCall(tc)}</span>

              {/* Result text */}
              {result && (
                <span className={cn(
                  'text-[10px] truncate max-w-[120px]',
                  result.success ? 'text-green-600' : 'text-red-500'
                )}>
                  {result.result.slice(0, 40)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Execution summary */}
      {executionSummary && (
        <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-foreground/80">{executionSummary}</span>
          {failed > 0 && (
            <span className="text-red-500 ml-auto shrink-0">{failed} failed</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-1">
        <Button variant="outline" size="sm" onClick={onClose} disabled={executeMutation.isPending}>
          {results ? 'Done' : 'Cancel'}
        </Button>
        {!results && (
          <Button
            size="sm"
            className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            onClick={() => executeMutation.mutate()}
            disabled={executeMutation.isPending || toolCalls.length === 0}
          >
            {executeMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Execute All ({toolCalls.length})
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
