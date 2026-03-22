'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface ChecklistContent {
  title?: string;
  items?: ChecklistItem[];
}

interface ChecklistBlockProps {
  content: ChecklistContent;
  onUpdate: (content: ChecklistContent) => void;
}

function newItem(): ChecklistItem {
  return { id: crypto.randomUUID(), text: '', checked: false };
}

export function ChecklistBlock({ content, onUpdate }: ChecklistBlockProps) {
  const [title, setTitle] = useState(content.title ?? '');
  const [items, setItems] = useState<ChecklistItem[]>(content.items ?? [newItem()]);

  const save = useCallback(
    (nextItems: ChecklistItem[], nextTitle?: string) => {
      onUpdate({ title: nextTitle ?? title, items: nextItems });
    },
    [onUpdate, title]
  );

  const toggleItem = (id: string) => {
    const next = items.map((it) =>
      it.id === id ? { ...it, checked: !it.checked } : it
    );
    setItems(next);
    save(next);
  };

  const updateText = (id: string, text: string) => {
    const next = items.map((it) => (it.id === id ? { ...it, text } : it));
    setItems(next);
    save(next);
  };

  const deleteItem = (id: string) => {
    const next = items.filter((it) => it.id !== id);
    setItems(next);
    save(next);
  };

  const addItem = () => {
    const next = [...items, newItem()];
    setItems(next);
    save(next);
  };

  const checkedCount = items.filter((i) => i.checked).length;
  const progress = items.length > 0 ? (checkedCount / items.length) * 100 : 0;

  return (
    <div className="space-y-2">
      {/* Title */}
      <div className="flex items-center justify-between gap-2">
        <input
          className="flex-1 bg-transparent text-sm font-semibold focus:outline-none placeholder:text-muted-foreground"
          placeholder="Checklist title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => save(items, title)}
        />
        <span className="shrink-0 text-xs text-muted-foreground">
          {checkedCount}/{items.length}
        </span>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Items */}
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="group flex items-center gap-2">
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleItem(item.id)}
              className="h-4 w-4 shrink-0 cursor-pointer rounded border-border accent-primary"
            />
            <input
              className={cn(
                'flex-1 bg-transparent text-sm focus:outline-none',
                item.checked && 'line-through text-muted-foreground'
              )}
              placeholder="List item…"
              value={item.text}
              onChange={(e) => updateText(item.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); addItem(); }
              }}
            />
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              onClick={() => deleteItem(item.id)}
              tabIndex={-1}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={addItem}>
        <Plus className="mr-1 h-3.5 w-3.5" />
        Add item
      </Button>
    </div>
  );
}
