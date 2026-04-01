'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  LayoutGrid,
  Plus,
  Calendar,
  FileText,
  Loader2,
  Sparkles,
  BarChart3,
  History,
  Rocket,
  Bot,
} from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { useUIStore } from '@/stores/ui-store';
import { useSearch } from '@/hooks/use-search';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { queryKeys } from '@/lib/query-keys';
import { AI_CONFIG } from '@/lib/ai-config';

import { ActionPreview } from './action-preview';
import type { ParsedAction } from './action-preview';
import { BoardSummaryDialog } from './board-summary-dialog';
import { GenerateTasksDialog } from './generate-tasks-dialog';
import { BoardInsightsPanel } from './board-insights-panel';
import { UltraplanDialog } from './ultraplan-dialog';
import { AgentExecution } from './agent-execution';

// ── History helpers ──────────────────────────────────────────────────────────

const HISTORY_KEY = 'wrkly:ai-command-history';
const MAX_HISTORY = 5;

function getHistory(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}
function addHistory(cmd: string) {
  const history = getHistory().filter((h) => h !== cmd);
  history.unshift(cmd);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

// ── Types ────────────────────────────────────────────────────────────────────

interface SearchResultCard {
  id: string;
  title: string;
  listName?: string;
  boardId: string;
  boardName?: string;
  labels?: { color: string; name?: string }[];
  dueDate?: string | null;
}

interface SearchResponse {
  results: {
    board: { id: string; name: string };
    cards: SearchResultCard[];
  }[];
}

interface CommandResponse {
  interpretation: string;
  actions: ParsedAction[];
  confidence: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function AiCommandBar() {
  const router = useRouter();
  const params = useParams();
  const currentBoardId = params.id as string | undefined;
  
  const { commandBarOpen, toggleCommandBar } = useUIStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState('');
  const [internalOpen, setInternalOpen] = useState(false);

  // Dialog states
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [ultraplanOpen, setUltraplanOpen] = useState(false);
  
  // AI Command Mode Parse State
  const [parsedCommand, setParsedCommand] = useState<CommandResponse | null>(null);
  const [history] = useState(() => getHistory());

  // Agent Mode state
  const [agentMode, setAgentMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('wrkly:agent-mode') !== 'false';
  });
  const [agentPlan, setAgentPlan] = useState<{ toolCalls: Array<{ name: string; args: Record<string, unknown> }>; summary: string } | null>(null);

  // Sync open state with store
  useEffect(() => {
    setInternalOpen(commandBarOpen);
  }, [commandBarOpen]);

  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setQuery('');
      setParsedCommand(null);
      setAgentPlan(null);
    }
    toggleCommandBar();
  }, [toggleCommandBar]);

  // Keyboard shortcut: Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandBar();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [toggleCommandBar]);

  // ── AI Mutations ───────────────────────────────────────────────────────────

  const parseMutation = useMutation({
    mutationFn: async (command: string) => {
      if (!currentBoardId) throw new Error('Must be on a board to use AI commands');
      const res = await apiFetch<CommandResponse>('/api/ai/command', {
        method: 'POST',
        body: JSON.stringify({ boardId: currentBoardId, command }),
      });
      return res;
    },
    onSuccess: (data) => {
      setParsedCommand(data);
      // Save to history (strip leading /)
      const cmd = query.startsWith('/') ? query.slice(1).trim() : query.trim();
      if (cmd) addHistory(cmd);
    },
    onError: (err) => {
      let description = err instanceof Error ? err.message : 'Try rephrasing your request.';
      if (description.includes('Rate limit')) {
        description = "You've used too many AI requests. Please try again later.";
      } else if (description.includes('timeout') || description.toLowerCase().includes('taking too long')) {
        description = "AI is taking too long, please try again.";
      }

      toast({
        title: "I couldn't understand that command",
        description,
        variant: 'destructive',
      });
      setParsedCommand(null);
    },
  });

  const executeMutation = useMutation({
    mutationFn: async (actions: ParsedAction[]) => {
      if (!currentBoardId) throw new Error('Must be on a board to execute commands');
      await apiFetch('/api/ai/command/execute', {
        method: 'POST',
        body: JSON.stringify({ boardId: currentBoardId, actions }),
      });
    },
    onSuccess: () => {
      // Board invalidation will trigger refresh. WebSockets might also handle this,
      // but invalidating is a safe fallback to ensure consistency.
      if (currentBoardId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.boards.detail(currentBoardId) });
      }
      toast({ title: 'AI actions executed successfully' });
      handleOpenChange(false);
    },
    onError: (err) => {
      let description = err instanceof Error ? err.message : 'Unknown error';
      if (description.includes('Rate limit')) {
        description = "You've used too many AI requests. Please try again later.";
      } else if (description.includes('timeout') || description.toLowerCase().includes('taking too long')) {
        description = "AI is taking too long, please try again.";
      }

      toast({
        title: 'Failed to execute actions',
        description,
        variant: 'destructive',
      });
    },
  });

  // Agent Mode mutation
  const agentPlanMutation = useMutation({
    mutationFn: async (command: string) => {
      if (!currentBoardId) throw new Error('Must be on a board to use AI agent');
      const res = await apiFetch<{ toolCalls: Array<{ name: string; args: Record<string, unknown> }>; summary: string }>(
        '/api/ai/agent',
        {
          method: 'POST',
          body: JSON.stringify({ boardId: currentBoardId, command }),
        }
      );
      return res;
    },
    onSuccess: (data) => {
      setAgentPlan(data);
      const cmd = query.startsWith('/') ? query.slice(1).trim() : query.trim();
      if (cmd) addHistory(cmd);
    },
    onError: (err) => {
      toast({
        title: 'Agent failed to plan',
        description: err instanceof Error ? err.message : 'Try rephrasing.',
        variant: 'destructive',
      });
    },
  });

  // ── Search Logic ───────────────────────────────────────────────────────────

  const isAiMode = query.startsWith('/');
  const searchQuery = isAiMode ? '' : query; // Don't run standard search if in AI mode

  // Use debounced search hook
  const { data, isLoading, isFetching } = useSearch(searchQuery);

  const searchResults = (data as unknown as SearchResponse)?.results ?? [];
  const hasQuery = searchQuery.trim().length >= 2;
  const showSearchLoading = hasQuery && (isLoading || isFetching);
  const hasSearchResults = searchResults.length > 0;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isAiMode && query.length > 2 && !parsedCommand && !agentPlan && !parseMutation.isPending && !agentPlanMutation.isPending) {
      e.preventDefault();
      const cmd = query.slice(1).trim();
      if (agentMode) {
        agentPlanMutation.mutate(cmd);
      } else {
        parseMutation.mutate(cmd);
      }
    }
  };

  const handleSelect = useCallback(
    (boardId: string, cardId: string) => {
      handleOpenChange(false);
      router.push(`/board/${boardId}?card=${cardId}`);
    },
    [router, handleOpenChange]
  );

  const handleQuickAction = useCallback(
    (action: string) => {
      handleOpenChange(false);
      if (action === 'create-board') {
        useUIStore.getState().setActiveModal('create-board');
      } else if (action === 'create-workspace') {
        useUIStore.getState().setActiveModal('create-workspace');
      } else if (action === 'ai-summarize') {
        setSummaryOpen(true);
      } else if (action === 'ai-generate-tasks') {
        setGenerateOpen(true);
      } else if (action === 'ai-insights') {
        setInsightsOpen(true);
      } else if (action === 'ai-ultraplan') {
        setUltraplanOpen(true);
      }
    },
    [handleOpenChange]
  );

  return (
    <>
      <CommandDialog open={internalOpen} onOpenChange={handleOpenChange}>
        <div className="relative">
          {/* Custom Input to handle the Sparkles icon change */}
          <CommandInput
            placeholder={
              currentBoardId
                ? 'Type "/" for AI commands, or search cards/boards…'
                : 'Search cards and boards… (Go to a board to use AI)'
            }
            value={query}
            onValueChange={(val) => {
              setQuery(val);
              setParsedCommand(null); // Clear preview when user types
              if (parseMutation.isError) parseMutation.reset();
            }}
            onKeyDown={handleKeyDown}
            className={isAiMode ? 'text-purple-600 dark:text-purple-400 placeholder:text-purple-300' : ''}
          />
          {/* Overlay custom icon for AI mode */}
          {isAiMode && (
            <div className="absolute left-3 top-3.5 z-10 pointer-events-none">
              <Sparkles className="h-4 w-4 text-purple-500" />
            </div>
          )}
          {/* Hide the default search icon if AI mode */}
          {isAiMode && (
            <style jsx global>{`
              .relative [cmdk-input-wrapper] svg.lucide-search {
                display: none;
              }
              .relative [cmdk-input-wrapper] {
                padding-left: 14px;
              }
            `}</style>
          )}
        </div>

        <CommandList className={isAiMode && parsedCommand ? 'max-h-none h-fit' : undefined}>
          {/* ── AI Mode State ── */}
          {isAiMode && currentBoardId && (parseMutation.isPending || agentPlanMutation.isPending) && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-purple-500">
              <div className="flex gap-1 items-center">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>●</span>
              </div>
              {agentMode ? 'Agent is planning...' : 'AI is thinking...'}
            </div>
          )}

          {isAiMode && !currentBoardId && AI_CONFIG.enabled && (
            <div className="py-6 text-center text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-950/20">
              Must be inside a board to run AI commands.
            </div>
          )}

          {isAiMode && !AI_CONFIG.enabled && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              AI features are currently disabled.
            </div>
          )}

          {isAiMode && parsedCommand && AI_CONFIG.enabled && (
            <div className="p-2">
              <ActionPreview
                interpretation={parsedCommand.interpretation}
                confidence={parsedCommand.confidence}
                actions={parsedCommand.actions}
                isExecuting={executeMutation.isPending}
                onExecute={() => executeMutation.mutate(parsedCommand.actions)}
                onCancel={() => handleOpenChange(false)}
              />
            </div>
          )}

          {/* Agent plan preview */}
          {isAiMode && agentPlan && AI_CONFIG.agentEnabled && (
            <div className="p-2">
              <AgentExecution
                boardId={currentBoardId!}
                toolCalls={agentPlan.toolCalls}
                summary={agentPlan.summary}
                onClose={() => handleOpenChange(false)}
              />
            </div>
          )}

          {/* Prompt the user to press Enter if they're typing a command */}
          {isAiMode && currentBoardId && AI_CONFIG.enabled && !parseMutation.isPending && !agentPlanMutation.isPending && !parsedCommand && !agentPlan && query.length > 2 && (
            <div className="py-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
              Press <kbd className="bg-muted px-2 py-0.5 rounded text-xs border">Enter</kbd> to ask {agentMode ? 'Agent' : 'AI'}
            </div>
          )}

          {/* ── AI History (shown when AI mode is active but no query) ── */}
          {isAiMode && currentBoardId && AI_CONFIG.enabled && !parseMutation.isPending && !agentPlanMutation.isPending && !parsedCommand && !agentPlan && query === '/' && history.length > 0 && (
            <CommandGroup heading="Recent AI Commands">
              {history.map((cmd, i) => (
                <CommandItem
                  key={i}
                  onSelect={() => {
                    setQuery(`/${cmd}`);
                    if (agentMode) {
                      agentPlanMutation.mutate(cmd);
                    } else {
                      parseMutation.mutate(cmd);
                    }
                  }}
                  className="text-purple-600 dark:text-purple-400"
                >
                  <History className="mr-2 h-4 w-4" />
                  {cmd}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* ── Standard Search Mode State ── */}
          {!isAiMode && (
            <>
              {/* Loading state */}
              {showSearchLoading && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Searching…
                </div>
              )}

              {/* No results */}
              {hasQuery && !showSearchLoading && !hasSearchResults && (
                <CommandEmpty>
                  <div className="flex flex-col items-center gap-1">
                    <Search className="h-8 w-8 text-muted-foreground/50" />
                    <span>No cards found for &apos;{query}&apos;</span>
                  </div>
                </CommandEmpty>
              )}

              {/* Search results grouped by board */}
              {hasQuery &&
                !showSearchLoading &&
                hasSearchResults &&
                searchResults.map((group) => (
                  <CommandGroup key={group.board.id} heading={group.board.name}>
                    {group.cards.map((card) => (
                      <CommandItem
                        key={card.id}
                        value={`${card.title} ${card.listName ?? ''}`}
                        onSelect={() => handleSelect(card.boardId, card.id)}
                        className="flex items-center gap-3"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">
                            {card.title}
                          </span>
                          {card.listName && (
                            <span className="block truncate text-xs text-muted-foreground">
                              in {card.listName}
                            </span>
                          )}
                        </div>

                        {/* Label dots */}
                        {card.labels && card.labels.length > 0 && (
                          <div className="flex shrink-0 items-center gap-0.5">
                            {card.labels.slice(0, 4).map((label, i) => (
                              <span
                                key={i}
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: label.color }}
                                title={label.name ?? undefined}
                              />
                            ))}
                          </div>
                        )}

                        {/* Due date */}
                        {card.dueDate && (
                          <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(card.dueDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}

              {/* Quick actions (shown when no query) */}
              {!hasQuery && (
                <>
                  {AI_CONFIG.enabled && (
                    <CommandGroup heading="AI Actions" className={!currentBoardId ? 'opacity-50 pointer-events-none' : ''}>
                      <CommandItem onSelect={() => handleQuickAction('ai-summarize')} className="text-purple-600 dark:text-purple-400">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Summarize this board
                      </CommandItem>
                      <CommandItem onSelect={() => handleQuickAction('ai-insights')} className="text-purple-600 dark:text-purple-400">
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Board Insights & Analytics
                      </CommandItem>
                      <CommandItem onSelect={() => handleQuickAction('ai-generate-tasks')} className="text-purple-600 dark:text-purple-400">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate tasks from description
                      </CommandItem>
                    </CommandGroup>
                  )}
                  {AI_CONFIG.ultraplanEnabled && (
                    <CommandGroup heading="AI Power Tools" className={!currentBoardId ? 'opacity-50 pointer-events-none' : ''}>
                      <CommandItem onSelect={() => handleQuickAction('ai-ultraplan')} className="text-purple-600 dark:text-purple-400">
                        <Rocket className="mr-2 h-4 w-4" />
                        Project Auto-Pilot (ULTRAPLAN)
                      </CommandItem>
                    </CommandGroup>
                  )}
                  {/* Agent mode toggle */}
                  {AI_CONFIG.agentEnabled && currentBoardId && (
                    <CommandGroup heading="AI Settings">
                      <CommandItem
                        onSelect={() => {
                          const next = !agentMode;
                          setAgentMode(next);
                          localStorage.setItem('wrkly:agent-mode', String(next));
                          toast({ title: next ? '🤖 Agent Mode ON' : '⚡ Classic Mode ON', description: next ? 'AI will use tool-calling for commands' : 'AI will use parse + preview mode' });
                        }}
                      >
                        <Bot className="mr-2 h-4 w-4" />
                        {agentMode ? 'Switch to Classic Mode' : 'Switch to Agent Mode'}
                        <span className="ml-auto text-[10px] text-muted-foreground">{agentMode ? 'Agent' : 'Classic'}</span>
                      </CommandItem>
                    </CommandGroup>
                  )}
                  {AI_CONFIG.enabled && <CommandSeparator />}
                  <CommandGroup heading="Quick Actions">
                    <CommandItem onSelect={() => handleQuickAction('create-board')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create new board
                    </CommandItem>
                    <CommandItem
                      onSelect={() => handleQuickAction('create-workspace')}
                    >
                      <LayoutGrid className="mr-2 h-4 w-4" />
                      Create new workspace
                    </CommandItem>
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup heading="Tip">
                    <div className="px-2 py-3 text-xs text-muted-foreground">
                      Start typing with <strong>/</strong> to enter AI command mode.
                      <br />
                      Use{' '}
                      <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                        ⌘K
                      </kbd>{' '}
                      to toggle this dialog anytime.
                    </div>
                  </CommandGroup>
                </>
              )}
            </>
          )}
        </CommandList>
      </CommandDialog>

      {/* Render the sub-dialogs */}
      {currentBoardId && (
        <>
          <BoardSummaryDialog
            boardId={currentBoardId}
            open={summaryOpen}
            onOpenChange={setSummaryOpen}
          />
          <GenerateTasksDialog
            boardId={currentBoardId}
            open={generateOpen}
            onOpenChange={setGenerateOpen}
          />
          <BoardInsightsPanel
            boardId={currentBoardId}
            open={insightsOpen}
            onOpenChange={setInsightsOpen}
          />
          <UltraplanDialog
            boardId={currentBoardId}
            open={ultraplanOpen}
            onOpenChange={setUltraplanOpen}
          />
        </>
      )}
    </>
  );
}
