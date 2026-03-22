'use client';

import { FileIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileBlockContent {
  url?: string;
  filename?: string;
  size?: number;
}

interface FileBlockProps {
  content: FileBlockContent;
}

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileBlock({ content }: FileBlockProps) {
  const { url, filename, size } = content;

  if (!url && !filename) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
        <FileIcon className="h-5 w-5 shrink-0" />
        <span>No file attached yet. Use the upload button above.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-muted/20 p-3">
      <FileIcon className="h-8 w-8 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{filename ?? 'file'}</p>
        {size && (
          <p className="text-xs text-muted-foreground">{formatBytes(size)}</p>
        )}
      </div>
      {url && (
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" asChild>
          <a href={url} download={filename} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4" />
            <span className="sr-only">Download</span>
          </a>
        </Button>
      )}
    </div>
  );
}
