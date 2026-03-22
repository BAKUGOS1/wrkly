'use client';

import {
  Type,
  CheckSquare,
  Code2,
  Image as ImageIcon,
  Paperclip,
  Minus,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { Block } from '@/types';

type BlockType = Block['type'];

interface BlockTypeDef {
  type: BlockType;
  icon: React.ReactNode;
  label: string;
  description: string;
}

const BLOCK_TYPES: BlockTypeDef[] = [
  {
    type: 'TEXT',
    icon: <Type className="h-4 w-4" />,
    label: 'Text',
    description: 'Rich text content',
  },
  {
    type: 'CHECKLIST',
    icon: <CheckSquare className="h-4 w-4" />,
    label: 'Checklist',
    description: 'Task checklist with checkboxes',
  },
  {
    type: 'CODE',
    icon: <Code2 className="h-4 w-4" />,
    label: 'Code',
    description: 'Code snippet with syntax highlighting',
  },
  {
    type: 'IMAGE',
    icon: <ImageIcon className="h-4 w-4" />,
    label: 'Image',
    description: 'Image with optional caption',
  },
  {
    type: 'FILE',
    icon: <Paperclip className="h-4 w-4" />,
    label: 'File',
    description: 'File attachment',
  },
  {
    type: 'DIVIDER',
    icon: <Minus className="h-4 w-4" />,
    label: 'Divider',
    description: 'Visual separator',
  },
];

interface BlockTypePickerProps {
  trigger: React.ReactNode;
  onSelect: (type: BlockType) => void;
}

export function BlockTypePicker({ trigger, onSelect }: BlockTypePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2" sideOffset={6}>
        <p className="px-2 pb-1.5 text-xs font-medium text-muted-foreground">
          Add a block
        </p>
        <div className="grid gap-0.5">
          {BLOCK_TYPES.map((bt) => (
            <button
              key={bt.type}
              className="flex items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent"
              onClick={() => onSelect(bt.type)}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                {bt.icon}
              </span>
              <div>
                <p className="text-sm font-medium leading-tight">{bt.label}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {bt.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
