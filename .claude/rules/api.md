---
paths:
  - "wrkly-api/src/routes/**/*.ts"
  - "wrkly-api/src/services/**/*.ts"
  - "wrkly-api/src/middleware/**/*.ts"
  - "wrkly-api/src/server.ts"
  - "wrkly-api/src/lib/**/*.ts"
  - "wrkly-api/src/jobs/**/*.ts"
---

# API Rules — Wrkly Backend (Fastify 5)

## Route Structure
Every route file MUST follow this pattern:
```typescript
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import { AppError, NotFoundError } from '../lib/errors';
import prisma from '../lib/prisma';

// Zod schemas at the top of the file
const createSchema = z.object({ ... });

export async function xRoutes(app: FastifyInstance) {
  // GET /api/x — list
  app.get('/', { preHandler: [authenticate] }, async (request, reply) => { ... });

  // POST /api/x — create
  app.post('/', { preHandler: [authenticate] }, async (request, reply) => { ... });
}
```

## Authentication & Authorization
- `authenticate` middleware on ALL protected routes — no exceptions
- `requireWorkspaceMember(request, workspaceId, 'MEMBER')` for workspace-scoped ops
- Roles: `'OWNER'` > `'ADMIN'` > `'MEMBER'` > `'VIEWER'`
- Access `request.userId` after authentication (injected by JWT middleware)

## Validation
- Validate ALL request bodies with Zod: `const parsed = schema.safeParse(request.body)`
- Return 400 with structured errors on validation failure:
  ```typescript
  if (!parsed.success) {
    return reply.status(400).send({
      error: 'Validation error',
      details: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
    });
  }
  ```
- Validate query params and URL params too

## Error Handling
- Use `AppError` for operational errors (with status code)
- Use `NotFoundError('Resource')` for missing entities
- Never throw raw `Error` — always use the error classes from `lib/errors.ts`
- Fastify's global error handler (`lib/error-handler.ts`) catches all

## Realtime Events
After EVERY mutation (create/update/delete), emit the realtime event:
```typescript
import { cardEvents, listEvents } from '../lib/realtime';
// After creating a card:
cardEvents.created(boardId, { card, listId }, userId);
```

## Rate Limiting
- Use `createRateLimit()` from `middleware/rate-limit.ts`
- AI endpoints: per-user limits (20–30 req/hour)
- Auth endpoints: aggressive limits (5 req/min for login)
- Public endpoints: moderate limits (100 req/min)

## Response Format
- Success: `reply.send({ ... })` — 200 for GET/PATCH, 201 for POST
- Created: `reply.status(201).send({ ... })`
- Deleted: `reply.status(204).send()`
- Error: `reply.status(4xx).send({ error: '...' })`

## Services
- Business logic lives in `services/` — routes only handle HTTP concerns
- Services are classes with singleton export: `export const xService = new XService()`
- Services never import `request` or `reply` — they receive plain data and return plain data

## Feature Flags
Use `isFeatureEnabled('FLAG_NAME')` before AI/experimental endpoints:
```typescript
if (!isFeatureEnabled('AI_COMMANDS')) {
  return reply.status(503).send({ error: 'AI features are currently disabled' });
}
```
