'use client';

import { useCallback, useMemo, useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FilterPopover, type FilterOption } from './filter-popover';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

export interface BoardFilters {
  labels: Set<string>;
  members: Set<string>;
  dueDate: Set<string>;
}

export const EMPTY_FILTERS: BoardFilters = {
  labels: new Set(),
  members: new Set(),
  dueDate: new Set(),
};

// Due date filter options (static)
const DUE_DATE_OPTIONS: FilterOption[] = [
  { id: 'none', label: 'No date' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'today', label: 'Due today' },
  { id: 'week', label: 'Due this week' },
  { id: 'month', label: 'Due this month' },
];

interface BoardFilterBarProps {
  labels: FilterOption[];
  members: FilterOption[];
  filters: BoardFilters;
  onFiltersChange: (filters: BoardFilters) => void;
  totalCards: number;
  visibleCards: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function BoardFilterBar({
  labels,
  members,
  filters,
  onFiltersChange,
  totalCards,
  visibleCards,
}: BoardFilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  const hasActiveFilters =
    filters.labels.size > 0 ||
    filters.members.size > 0 ||
    filters.dueDate.size > 0;

  // Toggle helpers
  const toggle = useCallback(
    (key: keyof BoardFilters, id: string) => {
      const next = new Set(filters[key]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onFiltersChange({ ...filters, [key]: next });
    },
    [filters, onFiltersChange]
  );

  const clearAll = useCallback(() => {
    onFiltersChange({
      labels: new Set(),
      members: new Set(),
      dueDate: new Set(),
    });
  }, [onFiltersChange]);

  // Collect active chips for display
  const chips = useMemo(() => {
    const result: { key: keyof BoardFilters; id: string; label: string; color?: string }[] = [];
    filters.labels.forEach((id) => {
      const opt = labels.find((l) => l.id === id);
      if (opt) result.push({ key: 'labels', id, label: opt.label, color: opt.color });
    });
    filters.members.forEach((id) => {
      const opt = members.find((m) => m.id === id);
      if (opt) result.push({ key: 'members', id, label: opt.label });
    });
    filters.dueDate.forEach((id) => {
      const opt = DUE_DATE_OPTIONS.find((d) => d.id === id);
      if (opt) result.push({ key: 'dueDate', id, label: opt.label });
    });
    return result;
  }, [filters, labels, members]);

  return (
    <div className="shrink-0">
      {/* Toggle row — always visible */}
      <div className="flex items-center gap-2 px-4 py-1.5">
        <Button
          variant={hasActiveFilters ? 'default' : 'ghost'}
          size="sm"
          className={cn('h-8 gap-1.5 text-xs', !hasActiveFilters && 'text-muted-foreground')}
          onClick={() => setExpanded((v) => !v)}
        >
          <Filter className="h-3.5 w-3.5" />
          Filter
          {hasActiveFilters && (
            <span className="ml-0.5 text-[10px]">•</span>
          )}
        </Button>

        {/* Card count summary */}
        {hasActiveFilters && (
          <span className="text-xs text-muted-foreground">
            Showing {visibleCards} of {totalCards} cards
          </span>
        )}
      </div>

      {/* Expanded filter controls */}
      {expanded && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 px-4 py-2 animate-in slide-in-from-top-2 fade-in duration-200">
          {/* Filter popovers */}
          <FilterPopover
            title="Labels"
            options={labels}
            selected={filters.labels}
            onToggle={(id) => toggle('labels', id)}
          />
          <FilterPopover
            title="Members"
            options={members}
            selected={filters.members}
            onToggle={(id) => toggle('members', id)}
          />
          <FilterPopover
            title="Due Date"
            options={DUE_DATE_OPTIONS}
            selected={filters.dueDate}
            onToggle={(id) => toggle('dueDate', id)}
          />

          {/* Active filter chips */}
          {chips.map((chip) => (
            <span
              key={`${chip.key}-${chip.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium"
            >
              {chip.color && (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: chip.color }}
                />
              )}
              {chip.label}
              <button
                className="ml-0.5 rounded-full p-0.5 hover:bg-muted transition-colors"
                onClick={() => toggle(chip.key, chip.id)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {/* Clear all */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={clearAll}
            >
              Clear all
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Filter logic (pure function, used by parent) ─────────────────────────────

/** Returns true if the card passes all active filters (AND between types, OR within) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function cardMatchesFilters(card: any, filters: BoardFilters): boolean {
  // Labels filter (OR within)
  if (filters.labels.size > 0) {
    const cardLabelIds: string[] = (card.labels ?? []).map((l: { id: string }) => l.id);
    const hasMatch = Array.from(filters.labels).some((id) => cardLabelIds.includes(id));
    if (!hasMatch) return false;
  }

  // Members filter (OR within)
  if (filters.members.size > 0) {
    const cardMemberIds: string[] = (card.assignees ?? []).map((a: { id: string }) => a.id);
    const hasMatch = Array.from(filters.members).some((id) => cardMemberIds.includes(id));
    if (!hasMatch) return false;
  }

  // Due date filter (OR within)
  if (filters.dueDate.size > 0) {
    const now = new Date();
    const dueDate = card.dueDate ? new Date(card.dueDate) : null;

    const matches = Array.from(filters.dueDate).some((filter) => {
      switch (filter) {
        case 'none':
          return !dueDate;
        case 'overdue':
          return dueDate ? dueDate < now : false;
        case 'today': {
          if (!dueDate) return false;
          return (
            dueDate.getFullYear() === now.getFullYear() &&
            dueDate.getMonth() === now.getMonth() &&
            dueDate.getDate() === now.getDate()
          );
        }
        case 'week': {
          if (!dueDate) return false;
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() + 7);
          return dueDate >= now && dueDate <= weekEnd;
        }
        case 'month': {
          if (!dueDate) return false;
          const monthEnd = new Date(now);
          monthEnd.setDate(monthEnd.getDate() + 30);
          return dueDate >= now && dueDate <= monthEnd;
        }
        default:
          return false;
      }
    });
    if (!matches) return false;
  }

  return true;
}
