'use client';

import { Check, X, MoveRight, Loader2, Sparkles, Plus, Tag, Calendar, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type ActionType =
  | 'create_list'
  | 'create_card'
  | 'move_card'
  | 'add_label'
  | 'set_due_date'
  | 'archive_card';

export interface ParsedAction {
  type: ActionType;
  params: Record<string, string | undefined>;
}

interface ActionPreviewProps {
  interpretation: string;
  confidence: number;
  actions: ParsedAction[];
  isExecuting: boolean;
  onExecute: () => void;
  onCancel: () => void;
}

function getConfidenceColor(score: number) {
  if (score >= 0.8) return 'bg-green-500';
  if (score >= 0.5) return 'bg-yellow-500';
  return 'bg-red-500';
}

function ActionIcon({ type }: { type: ActionType }) {
  switch (type) {
    case 'create_list':
      return <Plus className="h-4 w-4 text-blue-500" />;
    case 'create_card':
      return <Check className="h-4 w-4 text-green-500" />;
    case 'move_card':
      return <MoveRight className="h-4 w-4 text-purple-500" />;
    case 'add_label':
      return <Tag className="h-4 w-4 text-orange-500" />;
    case 'set_due_date':
      return <Calendar className="h-4 w-4 text-indigo-500" />;
    case 'archive_card':
      return <Archive className="h-4 w-4 text-red-500" />;
  }
}

function formatCommand(action: ParsedAction) {
  switch (action.type) {
    case 'create_list':
      return `Create list "${action.params.name ?? 'Unknown'}"`;
    case 'create_card':
      return `Create card "${action.params.title ?? 'Unknown'}" in list ${action.params.listId ?? ''}`;
    case 'move_card':
      return `Move card to list ${action.params.targetListId ?? ''}`;
    case 'add_label':
      return `Add label "${action.params.label ?? ''}" to card`;
    case 'set_due_date':
      return `Set due date to ${action.params.dueDate ?? ''}`;
    case 'archive_card':
      return `Archive card`;
    default:
      return 'Unknown action';
  }
}

export function ActionPreview({
  interpretation,
  confidence,
  actions,
  isExecuting,
  onExecute,
  onCancel,
}: ActionPreviewProps) {
  return (
    <div className="flex flex-col gap-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Interpretation
        </h3>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-xs text-muted-foreground cursor-help">
                Confidence
                <div
                  className={`h-2 w-2 rounded-full ${getConfidenceColor(
                    confidence
                  )}`}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>AI certainty: {Math.round(confidence * 100)}%</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <p className="text-sm text-foreground bg-muted p-2 rounded-md">
        "{interpretation}"
      </p>

      <div className="flex flex-col gap-2 mt-2">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          Proposed Actions: {actions.length}
        </span>
        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-2">
          {actions.map((action, i) => (
            <div
              key={i}
              className="flex items-center gap-3 text-sm p-2 border rounded bg-background"
            >
              <ActionIcon type={action.type} />
              <span>{formatCommand(action)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={isExecuting}>
          Close
        </Button>
        <Button
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={onExecute}
          disabled={isExecuting || actions.length === 0}
        >
          {isExecuting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executing...
            </>
          ) : (
            `Execute All (${actions.length})`
          )}
        </Button>
      </div>
    </div>
  );
}
