---
paths:
  - "wrkly-api/**/*.ts"
  - "wrkly-api/prisma/**"
  - "wrkly-api/Dockerfile"
  - "wrkly-api/docker-compose.yml"
  - "docker-compose.yml"
---

# Backend Rules — Wrkly API (Complete Reference)

> This rule is auto-loaded when editing ANY file in `wrkly-api/`. It covers the entire backend stack:
> Fastify 5 • Prisma 5 • PostgreSQL • Socket.io • Redis • BullMQ • OpenAI • Resend

---

## 1. Architecture Overview

```
wrkly-api/src/
├── server.ts           ← Entry point (Fastify, plugins, hooks, start)
├── routes/             ← HTTP route handlers (18 files)
│   ├── auth.ts         ← Register, login, password reset, Google OAuth
│   ├── workspaces.ts   ← CRUD workspaces + member management
│   ├── boards.ts       ← CRUD boards within workspaces
│   ├── lists.ts        ← CRUD lists within boards
│   ├── cards.ts        ← CRUD cards within lists
│   ├── blocks.ts       ← Rich content blocks inside cards
│   ├── comments.ts     ← Card comments
│   ├── labels.ts       ← Board labels + card label assignments
│   ├── ai.ts           ← AI-powered commands, summarize, generate tasks
│   ├── automations.ts  ← Automation rules (triggers + actions)
│   ├── search.ts       ← Full-text search across cards/boards
│   ├── notifications.ts← User notification feed
│   ├── activity.ts     ← Activity log timeline
│   ├── templates.ts    ← Board templates
│   ├── card-templates.ts← Card templates
│   ├── upload.ts       ← File upload (multipart)
│   ├── workspace-stats.ts← Workspace analytics
│   └── index.ts        ← Route registration hub
├── services/           ← Business logic (decoupled from HTTP)
│   ├── ai.ts           ← OpenAI GPT-4o-mini integration
│   ├── email.ts        ← Resend transactional emails
│   ├── automation-engine.ts ← Rule evaluation engine
│   ├── activity.ts     ← Activity log writer
│   └── notifications.ts← Notification dispatcher
├── middleware/          ← Request lifecycle hooks
│   ├── auth.ts         ← JWT verification → request.userId
│   ├── workspace-auth.ts← Role-based workspace access
│   └── rate-limit.ts   ← Redis-backed rate limiting
├── lib/                ← Shared infrastructure
│   ├── prisma.ts       ← Prisma client singleton
│   ├── errors.ts       ← AppError, NotFoundError, ForbiddenError
│   ├── error-handler.ts← Global Fastify error handler
│   ├── realtime.ts     ← Socket.io event emitters (cardEvents, listEvents)
│   ├── socket.ts       ← Socket.io server init + Redis adapter
│   ├── storage.ts      ← File upload path config
│   ├── feature-flags.ts← Feature toggle system
│   └── redis.ts        ← ioredis client singleton
├── jobs/               ← BullMQ background workers
│   └── index.ts        ← Job registration and queue setup
└── data/               ← Static data (board templates JSON)
```

---

## 2. Route Handler Pattern

Every route file MUST follow this exact structure:

```typescript
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceMember } from '../middleware/workspace-auth';
import { AppError, NotFoundError } from '../lib/errors';
import prisma from '../lib/prisma';
import { cardEvents } from '../lib/realtime';
import { createRateLimit } from '../middleware/rate-limit';
import { isFeatureEnabled } from '../lib/feature-flags';

// ── Zod Schemas ───────────────────────────────────────────────────
const createSchema = z.object({
  name: z.string().min(1).max(100).describe('Resource name'),
});

// ── Rate Limiters ─────────────────────────────────────────────────
const resourceLimiter = createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 50,
  keyPrefix: 'resource',
});

// ── Route Plugin ──────────────────────────────────────────────────
export async function resourceRoutes(app: FastifyInstance) {

  // GET — List resources
  app.get('/', {
    preHandler: [authenticate],
  }, async (request, reply) => {
    const resources = await prisma.resource.findMany({
      where: { isArchived: false },
      orderBy: { position: 'asc' },
      select: { id: true, name: true, createdAt: true },
    });
    return reply.send(resources);
  });

  // POST — Create resource
  app.post('/', {
    preHandler: [authenticate, resourceLimiter],
  }, async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: parsed.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }

    const resource = await prisma.resource.create({
      data: { ...parsed.data, createdById: request.userId },
      select: { id: true, name: true },
    });

    return reply.status(201).send(resource);
  });
}
```

### Registration in `routes/index.ts`
```typescript
import { resourceRoutes } from './resource';
app.register(resourceRoutes, { prefix: '/api/resources' });
```

---

## 3. Authentication & Authorization

### Middleware Chain
```
Request → authenticate → requireWorkspaceMember → Route Handler
```

### `authenticate` (mandatory on all protected routes)
- Extracts JWT from `Authorization: Bearer <token>` header
- Injects `request.userId` (string, CUID)
- Returns 401 if token is missing, expired, or invalid

### `requireWorkspaceMember(request, workspaceId, minimumRole)`
- Checks user is a member of the workspace with at least `minimumRole`
- Role hierarchy: `OWNER` > `ADMIN` > `MEMBER` > `VIEWER`
- Returns 403 if insufficient permissions

### Usage
```typescript
app.post('/endpoint', {
  preHandler: [authenticate],
}, async (request, reply) => {
  const workspaceId = await getBoardWorkspaceId(boardId);
  await requireWorkspaceMember(request, workspaceId, 'MEMBER');
  // ... handler logic
});
```

---

## 4. Request Validation (Zod)

### Rules
- **Every** request body, query param, and URL param MUST be validated
- Schemas defined at the **top** of the route file
- Use `.safeParse()` — never `.parse()` (which throws)
- Return structured 400 errors with field-level messages

### Common Zod Patterns
```typescript
// String with constraints
z.string().min(1).max(500).trim()

// Optional with default
z.string().optional().default('untitled')

// Enum
z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'])

// Nested object
z.object({
  cards: z.array(z.object({
    title: z.string().min(1).max(500),
    description: z.string().optional(),
  })),
})

// ID validation
z.string().cuid()  // or z.string().min(1) for flexibility
```

---

## 5. Database (Prisma + PostgreSQL)

### Model Conventions
```prisma
model Card {
  id          String   @id @default(cuid())
  title       String
  description String?
  position    Float
  isArchived  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  listId      String
  list        List     @relation(fields: [listId], references: [id])
  createdById String
  createdBy   User     @relation(fields: [createdById], references: [id])
}
```

### Query Rules
| Rule | Why |
|------|-----|
| Always use `select:` | Never return full models — reduces payload + prevents leaking sensitive fields |
| Always filter `isArchived: false` | Soft-deleted data must never appear in normal queries |
| Use `orderBy: { position: 'asc' }` | Lists and cards are position-ordered |
| Use `take:` + `skip:` for lists | Prevent unbounded queries |
| Use `$transaction` for multi-step mutations | Ensure atomicity |
| Use `findFirst` + `orderBy: { position: 'desc' }` | Get max position for new items |

### Position Calculation
```typescript
const last = await prisma.card.findFirst({
  where: { listId, isArchived: false },
  orderBy: { position: 'desc' },
  select: { position: true },
});
const position = last ? last.position + 1.0 : 1.0;
```

### N+1 Prevention
```typescript
// ✅ Single query with nested select
const board = await prisma.board.findUnique({
  where: { id: boardId },
  select: {
    lists: {
      where: { isArchived: false },
      select: {
        cards: { where: { isArchived: false }, select: { id: true, title: true } }
      }
    }
  }
});

// ❌ N+1: querying in a loop
for (const list of lists) {
  const cards = await prisma.card.findMany({ where: { listId: list.id } });
}
```

---

## 6. Error Handling

### Error Classes (`lib/errors.ts`)
```typescript
throw new AppError('Something went wrong', 500);       // Generic
throw new NotFoundError('Board');                       // 404
throw new ForbiddenError('Insufficient permissions');   // 403
```

### Global Error Handler (`lib/error-handler.ts`)
Catches all errors, formats response:
```json
{ "error": "Board not found", "statusCode": 404 }
```

### Rules
- Never throw raw `Error` — always use `AppError` or subclasses
- Never expose stack traces in production responses
- Log errors server-side: `app.log.error(err)`

---

## 7. Realtime Events (Socket.io)

### Event Pattern
After EVERY mutation, emit the appropriate event:
```typescript
import { cardEvents, listEvents } from '../lib/realtime';

// After creating a card
cardEvents.created(boardId, { card, listId }, userId);

// After moving a card
cardEvents.moved(boardId, { cardId, fromListId, toListId, position }, userId);

// After updating a card
cardEvents.updated(boardId, { cardId, changes: { title: 'new' } }, userId);

// After archiving a card
cardEvents.archived(boardId, { cardId, listId }, userId);

// After creating a list
listEvents.created(boardId, { list }, userId);
```

### Room Pattern
- Clients join `board:{boardId}` room on board view
- Events are broadcast to all room members except the sender

---

## 8. AI Integration (OpenAI)

### Service: `services/ai.ts`
- Uses `OpenAI` SDK with `gpt-4o-mini` model
- Four capabilities: `parseCommand`, `summarizeBoard`, `generateTasks`, `assistCardContent`
- All responses parsed from JSON using `parseJSONSafely()` (strips markdown fences)

### Feature Flags
Every AI endpoint is gated:
```typescript
if (!isFeatureEnabled('AI_COMMANDS')) {
  return reply.status(503).send({ error: 'AI features are currently disabled' });
}
```

### Rate Limiting
AI endpoints have separate, aggressive rate limits:
```typescript
const commandLimiter = createRateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour window
  maxRequests: 20,            // 20 per hour per user
  keyPrefix: 'ai-cmd',
});
```

---

## 9. Background Jobs (BullMQ)

- Queue system backed by Redis
- Workers defined in `jobs/`
- Used for: email sending, automation rule evaluation, periodic cleanup
- Initialize after server starts: `initializeJobs()`

---

## 10. Email (Resend)

### Service: `services/email.ts`
- Sender: `team@wrkly.in` (verified domain)
- Templates: welcome, password reset, workspace invite, notification digest
- Always async — never block the request

---

## 11. File Uploads

- Plugin: `@fastify/multipart`
- Max size: 10 MB
- Stored in: `wrkly-api/uploads/`
- Served as static: `/uploads/{filename}`
- Route: `POST /api/upload`

---

## 12. Rate Limiting

### `createRateLimit(config)` from `middleware/rate-limit.ts`
```typescript
createRateLimit({
  windowMs: 60 * 1000,    // Time window
  maxRequests: 100,        // Max requests per window per user
  keyPrefix: 'resource',   // Redis key prefix for isolation
})
```

### Recommended Limits
| Endpoint Type | Window | Max |
|---------------|--------|-----|
| Auth (login) | 1 min | 5 |
| AI commands | 1 hour | 20 |
| AI summarize | 1 hour | 10 |
| AI assist | 1 hour | 30 |
| Search | 1 min | 30 |
| File upload | 1 min | 10 |
| General CRUD | 1 min | 100 |

---

## 13. Environment & Configuration

### Required Environment Variables
```
DATABASE_URL=postgresql://user:pass@host:5432/wrkly
JWT_SECRET=<random-64-char-string>
RESEND_API_KEY=re_xxxxx
OPENAI_API_KEY=sk-xxxxx
CORS_ORIGIN=https://wrkly.in,http://localhost:3000
REDIS_URL=redis://localhost:6379
PORT=4000
NODE_ENV=development|production
```

### Server Configuration
- Port: `process.env.PORT ?? 4000`
- Host: `0.0.0.0` (required for Docker/Railway)
- Logger: `true` (Fastify's built-in pino logger)
- CORS: origin whitelist from `CORS_ORIGIN` env var

---

## 14. Testing

### Framework: Vitest
- Config: `wrkly-api/vitest.config.ts`
- Run: `pnpm test` | `pnpm test:watch` | `pnpm test:coverage`

### Test File Naming
```
wrkly-api/tests/
├── routes/
│   └── {resource}.test.ts    ← Integration tests
├── services/
│   └── {service}.test.ts     ← Unit tests
└── setup.ts                  ← Shared fixtures
```

### Route Test Pattern
```typescript
import { describe, it, expect } from 'vitest';

describe('POST /api/workspaces', () => {
  it('should create workspace and return slug', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Test Workspace' },
    });
    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body)).toHaveProperty('slug');
  });
});
```

---

## 15. Deployment

### Docker
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm i -g pnpm && pnpm install --frozen-lockfile --prod
COPY prisma ./prisma
COPY dist ./dist
RUN npx prisma generate
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

### Railway
- Auto-deploys from `main` branch
- Start command: `pnpm start` (runs `prisma db push` then `node dist/server.js`)
- Health check: `GET /health` → `{ "status": "ok" }`

### Pre-deploy Checklist
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` passes
- [ ] Environment variables are set in production
- [ ] `JWT_SECRET` is NOT the dev default
- [ ] `DATABASE_URL` points to production database
- [ ] `CORS_ORIGIN` includes production frontend URL
