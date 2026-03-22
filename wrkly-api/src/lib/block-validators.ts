import { z } from 'zod';

export type BlockType = 'TEXT' | 'CHECKLIST' | 'CODE' | 'IMAGE' | 'FILE' | 'DIVIDER';

// ── Per-type content schemas ──────────────────────────────────────────────────

const textContentSchema = z.object({
  html: z.string(),
});

const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean(),
});

const checklistContentSchema = z.object({
  title: z.string(),
  items: z.array(checklistItemSchema),
});

const codeContentSchema = z.object({
  language: z.string(),
  code: z.string(),
});

const imageContentSchema = z.object({
  url: z.string().url(),
  caption: z.string().optional(),
  width: z.number().optional(),
});

const fileContentSchema = z.object({
  url: z.string().url(),
  filename: z.string(),
  size: z.number(),
});

const dividerContentSchema = z.object({}).strict();

// ── Discriminated union schema (used for POST body validation) ────────────────

export const blockInputSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('TEXT'),      content: textContentSchema,      position: z.number().optional() }),
  z.object({ type: z.literal('CHECKLIST'), content: checklistContentSchema, position: z.number().optional() }),
  z.object({ type: z.literal('CODE'),      content: codeContentSchema,      position: z.number().optional() }),
  z.object({ type: z.literal('IMAGE'),     content: imageContentSchema,     position: z.number().optional() }),
  z.object({ type: z.literal('FILE'),      content: fileContentSchema,      position: z.number().optional() }),
  z.object({ type: z.literal('DIVIDER'),   content: dividerContentSchema,   position: z.number().optional() }),
]);

// ── Content-only schemas keyed by type (used for PATCH validation) ────────────

const contentSchemaByType: Record<BlockType, z.ZodTypeAny> = {
  TEXT:      textContentSchema,
  CHECKLIST: checklistContentSchema,
  CODE:      codeContentSchema,
  IMAGE:     imageContentSchema,
  FILE:      fileContentSchema,
  DIVIDER:   dividerContentSchema,
};

/**
 * Validates `content` against the schema for the given block type.
 * Returns the parsed (valid) content or throws a ZodError.
 */
export function validateBlockContent(type: BlockType, content: unknown): unknown {
  return contentSchemaByType[type].parse(content);
}

export type BlockInput = z.infer<typeof blockInputSchema>;
