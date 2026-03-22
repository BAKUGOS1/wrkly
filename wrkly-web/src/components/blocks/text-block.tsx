'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import { useCallback, useRef } from 'react';
import { Bold, Italic, UnderlineIcon, Strikethrough, List, ListOrdered, Heading1, Heading2, Heading3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TextBlockContent {
  html?: string;
}

interface TextBlockProps {
  content: TextBlockContent;
  onUpdate: (content: TextBlockContent) => void;
}

function ToolbarButton({ onClick, isActive, title, children }: {
  onClick: () => void;
  isActive?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={cn(
        'flex h-6 w-6 items-center justify-center rounded text-xs transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}

import { AiContentAssist } from './ai-content-assist';

export function TextBlock({ content, onUpdate }: TextBlockProps) {
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerSave = useCallback(
    (html: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        onUpdate({ html });
      }, 500);
    },
    [onUpdate]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder: 'Write something…' }),
    ],
    content: content.html ?? '',
    onUpdate: ({ editor }) => triggerSave(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[60px] text-sm',
      },
    },
  });

  if (!editor) return null;

  const isActive = (name: string, attrs?: Record<string, unknown>) =>
    editor.isActive(name, attrs);

  return (
    <div className="group/textblock relative">
      {/* Inline toolbar — shown on focus/hover */}
      <div className="mb-1.5 flex items-center gap-0.5 opacity-0 transition-opacity group-focus-within/textblock:opacity-100 group-hover/textblock:opacity-100">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={isActive('bold')} title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={isActive('italic')} title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={isActive('underline')} title="Underline">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={isActive('strike')} title="Strikethrough">
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={isActive('heading', { level: 1 })} title="Heading 1">
          <Heading1 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={isActive('heading', { level: 3 })} title="Heading 3">
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={isActive('bulletList')} title="Bullet list">
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={isActive('orderedList')} title="Numbered list">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        
        <div className="mx-1 h-4 w-px bg-border" />
        
        <AiContentAssist
          currentContent={editor.getText() || ''}
          onApply={(newContent: string) => {
             // Let the editor handle parsing text/markdown if inserted as content.
             editor.commands.setContent(newContent, { emitUpdate: true });
          }}
        />
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
