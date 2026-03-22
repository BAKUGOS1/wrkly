'use client';

import { useState, useRef } from 'react';
import { ImageIcon, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

interface ImageBlockContent {
  url?: string;
  caption?: string;
}

interface ImageBlockProps {
  content: ImageBlockContent;
  onUpdate: (content: ImageBlockContent) => void;
}

export function ImageBlock({ content, onUpdate }: ImageBlockProps) {
  const { url, caption = '' } = content;
  const [isUploading, setIsUploading] = useState(false);
  const [editCaption, setEditCaption] = useState(caption);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch<{ url: string }>('/api/upload', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type — browser sets multipart boundary automatically
      });
      onUpdate({ ...content, url: res.url });
    } catch {
      // Error handled globally
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!url) {
    return (
      <div
        className="flex cursor-pointer flex-col items-center gap-3 rounded-md border-2 border-dashed border-border p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/30"
        onClick={() => fileRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : (
          <ImageIcon className="h-8 w-8 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">
          {isUploading ? 'Uploading…' : 'Click to upload an image'}
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  return (
    <div className="group/imgblock relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={caption || 'Image block'}
        className="w-full rounded-md object-cover"
      />
      {/* Re-upload button */}
      <Button
        size="sm"
        variant="secondary"
        className="absolute right-2 top-2 opacity-0 transition-opacity group-hover/imgblock:opacity-100"
        onClick={() => fileRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      {/* Caption */}
      <input
        className="mt-1 w-full bg-transparent px-1 text-center text-xs text-muted-foreground focus:outline-none"
        placeholder="Add a caption…"
        value={editCaption}
        onChange={(e) => setEditCaption(e.target.value)}
        onBlur={() => onUpdate({ ...content, caption: editCaption })}
      />
    </div>
  );
}
