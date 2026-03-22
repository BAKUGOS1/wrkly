import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import type { MultipartFile } from '@fastify/multipart';

// ── Config ────────────────────────────────────────────────────────────────────

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.txt',
]);

// Resolve uploads directory relative to the project root
export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

// Ensure the directory exists at module load time
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ── Validation ────────────────────────────────────────────────────────────────

export class StorageError extends Error {
  constructor(message: string, public readonly statusCode: number = 400) {
    super(message);
    this.name = 'StorageError';
  }
}

function validateFile(mimetype: string, filename: string): void {
  if (!ALLOWED_MIME_TYPES.has(mimetype)) {
    throw new StorageError(`File type "${mimetype}" is not allowed`);
  }

  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new StorageError(`File extension "${ext}" is not allowed`);
  }
}

// ── saveFile ──────────────────────────────────────────────────────────────────

export interface SavedFile {
  url:      string;
  filename: string;
  size:     number;
}

/**
 * Saves an uploaded multipart file to the local uploads directory.
 * Returns a public URL and metadata.
 *
 * Swap this function body for an S3 presigned-URL implementation in V1
 * without touching any route handlers.
 */
export async function saveFile(file: MultipartFile): Promise<SavedFile> {
  validateFile(file.mimetype, file.filename);

  const originalName = path.basename(file.filename);
  // Sanitize filename — only allow safe characters
  const safeName   = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniqueName   = `${randomUUID()}-${safeName}`;
  const destPath     = path.join(UPLOADS_DIR, uniqueName);

  // Stream directly to disk while counting bytes
  let size = 0;
  const chunks: Buffer[] = [];

  for await (const chunk of file.file) {
    size += chunk.length;
    if (size > MAX_FILE_SIZE) {
      // Abort — discard remaining data
      file.file.resume();
      throw new StorageError('File exceeds the 10 MB size limit', 413);
    }
    chunks.push(chunk as Buffer);
  }

  fs.writeFileSync(destPath, Buffer.concat(chunks));

  return {
    url:      `/uploads/${uniqueName}`,
    filename: originalName,
    size,
  };
}
