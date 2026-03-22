'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// ── Cycle order: system → light → dark ────────────────────────────────────────

const THEMES: Array<{ value: string; label: string; icon: React.ReactNode }> = [
  { value: 'system', label: 'System', icon: <Monitor className="h-4 w-4" /> },
  { value: 'light', label: 'Light', icon: <Sun className="h-4 w-4" /> },
  { value: 'dark', label: 'Dark', icon: <Moon className="h-4 w-4" /> },
];

function ThemeIcon({ theme }: { theme: string | undefined }) {
  if (theme === 'light') return <Sun className="h-4 w-4" />;
  if (theme === 'dark') return <Moon className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

// ── Toggle button (icon-only, with dropdown) ──────────────────────────────────

interface ThemeToggleProps {
  /** If true, show a single icon button that cycles through themes on click */
  cycle?: boolean;
  className?: string;
}

export function ThemeToggle({ cycle = false, className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Avoid hydration mismatch — only show icon after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleCycle = () => {
    const current = THEMES.findIndex((t) => t.value === theme);
    const next = THEMES[(current + 1) % THEMES.length];
    setTheme(next.value);
  };

  if (cycle) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 text-muted-foreground hover:text-foreground', className)}
        onClick={handleCycle}
        title={`Theme: ${theme ?? 'system'}`}
        aria-label="Toggle theme"
      >
        {mounted ? <ThemeIcon theme={theme} /> : <Monitor className="h-4 w-4" />}
        <span className="sr-only">Toggle theme</span>
      </Button>
    );
  }

  // Dropdown variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 text-muted-foreground hover:text-foreground', className)}
          aria-label="Select theme"
        >
          {mounted ? <ThemeIcon theme={theme} /> : <Monitor className="h-4 w-4" />}
          <span className="sr-only">Select theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {THEMES.map(({ value, label, icon }) => (
          <DropdownMenuItem
            key={value}
            className={cn(
              'flex items-center gap-2 cursor-pointer',
              theme === value && 'bg-accent text-accent-foreground font-medium'
            )}
            onClick={() => setTheme(value)}
          >
            {icon}
            {label}
            {value === 'system' && resolvedTheme && (
              <span className="ml-auto text-xs text-muted-foreground">
                ({resolvedTheme})
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
