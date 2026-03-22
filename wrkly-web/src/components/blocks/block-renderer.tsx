'use client';

import { TextBlock } from './text-block';
import { ChecklistBlock } from './checklist-block';
import { CodeBlock } from './code-block';
import { ImageBlock } from './image-block';
import { FileBlock } from './file-block';
import { DividerBlock } from './divider-block';
import type { Block } from '@/types';

interface BlockRendererProps {
  block: Block;
  onUpdate: (content: Record<string, unknown>) => void;
}

export function BlockRenderer({ block, onUpdate }: BlockRendererProps) {
  const content = block.content ?? {};

  switch (block.type) {
    case 'TEXT':
      return (
        <TextBlock
          content={content as { html?: string }}
          onUpdate={(c) => onUpdate(c as Record<string, unknown>)}
        />
      );

    case 'CHECKLIST':
      return (
        <ChecklistBlock
          content={content as { title?: string; items?: Array<{ id: string; text: string; checked: boolean }> }}
          onUpdate={(c) => onUpdate(c as Record<string, unknown>)}
        />
      );

    case 'CODE':
      return (
        <CodeBlock
          content={content as { code?: string; language?: string }}
          onUpdate={(c) => onUpdate(c as Record<string, unknown>)}
        />
      );

    case 'IMAGE':
      return (
        <ImageBlock
          content={content as { url?: string; caption?: string }}
          onUpdate={(c) => onUpdate(c as Record<string, unknown>)}
        />
      );

    case 'FILE':
      return (
        <FileBlock
          content={content as { url?: string; filename?: string; size?: number }}
        />
      );

    case 'DIVIDER':
      return <DividerBlock />;

    default:
      return (
        <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          Unknown block type: {block.type}
        </div>
      );
  }
}
