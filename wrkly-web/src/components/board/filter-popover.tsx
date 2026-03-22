'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────────────

export interface FilterOption {
  id: string;
  label: string;
  color?: string;
}

interface FilterPopoverProps {
  title: string;
  options: FilterOption[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export function FilterPopover({
  title,
  options,
  selected,
  onToggle,
}: FilterPopoverProps) {
  const [open, setOpen] = useState(false);
  const count = selected.size;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-8 gap-1.5 text-xs',
            count > 0 && 'border-primary/40 bg-primary/5 text-primary'
          )}
        >
          {title}
          {count > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-56 p-2" sideOffset={6}>
        <p className="px-2 pb-2 text-xs font-medium text-muted-foreground">
          {title}
        </p>
        <div className="max-h-52 overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              No options available
            </p>
          ) : (
            options.map((opt) => {
              const isSelected = selected.has(opt.id);
              return (
                <button
                  key={opt.id}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                    'hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                    isSelected && 'bg-accent/50'
                  )}
                  onClick={() => onToggle(opt.id)}
                >
                  {/* Checkbox */}
                  <div
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>

                  {/* Color dot (labels) */}
                  {opt.color && (
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: opt.color }}
                    />
                  )}

                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
