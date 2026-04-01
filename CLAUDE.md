# Wrkly — Project Brain

> AI-powered task orchestration and project management platform.
> Domain: **wrkly.in** | Repo: `github.com/BAKUGOS1/wrkly`

---

## Stack

| Layer          | Technology                                                  |
| -------------- | ----------------------------------------------------------- |
| Frontend       | Next.js 14 (App Router), React 18, TypeScript 5             |
| Styling        | Tailwind CSS + custom CSS tokens (dark-mode-first HSL vars) |
| UI Components  | shadcn/ui primitives + custom components                    |
| State          | Zustand (auth, ui stores) + TanStack React Query (server)   |
| Icons          | Lucide React                                                |
| Backend        | Fastify 5, TypeScript, Node.js                              |
| ORM            | Prisma 5 + PostgreSQL                                       |
| Auth           | JWT (@fastify/jwt) + bcryptjs                               |
| Real-time      | Socket.io + @socket.io/redis-adapter                        |
| Background     | BullMQ + Redis (ioredis)                                    |
| AI             | OpenAI SDK (GPT-4o-mini)                                    |
| Email          | Resend (sender: team@wrkly.in)                              |
| Validation     | Zod 4                                                       |
| Testing        | Vitest + @vitest/coverage-v8                                |
| Package Mgr    | pnpm (workspace: wrkly-web, wrkly-api)                      |
| Deployment     | Vercel (web), Railway/Docker (api)                          |

---

## Monorepo Layout

```
wrkly/
├── wrkly-web/          # Next.js frontend
│   └── src/
│       ├── app/        # App Router pages
│       ├── components/ # Feature + UI components
│       ├── hooks/      # Custom React hooks
│       ├── lib/        # API client, utilities
│       ├── stores/     # Zustand stores (auth-store, ui-store)
│       └── types/      # Shared TypeScript types
├── wrkly-api/          # Fastify backend
│   └── src/
│       ├── routes/     # API route handlers (18 route files)
│       ├── services/   # Business logic (ai, email, automation-engine)
│       ├── middleware/  # auth, rate-limit, workspace-auth
│       ├── lib/        # prisma, errors, realtime, feature-flags
│       ├── jobs/       # BullMQ background jobs
│       └── server.ts   # Entry point
│   └── prisma/
│       ├── schema.prisma
│       └── seed.ts
├── .claude/            # AI agent config
└── CLAUDE.md           # This file
```

---

## Commands

```bash
# Frontend (wrkly-web/)
pnpm dev                    # Start Next.js dev server (port 3000)
pnpm build                  # Production build
pnpm lint                   # ESLint + type check

# Backend (wrkly-api/)
pnpm dev                    # Start Fastify with tsx watch (port 4000)
pnpm build                  # prisma generate && tsc
pnpm start                  # Production start (pushes schema + runs dist)
pnpm test                   # Vitest run
pnpm test:watch             # Vitest in watch mode
pnpm test:coverage          # Vitest with v8 coverage

# Database
npx prisma db push          # Push schema to DB
npx prisma generate         # Regenerate Prisma client
npx prisma studio           # Visual DB browser (port 5555)
npx prisma db seed          # Run seed.ts

# Monorepo (root)
pnpm install                # Install all deps
docker compose up -d        # Start PostgreSQL + Redis
```

---

## Conventions

### TypeScript
- **Strict mode** everywhere — no `any` types (use `unknown` + type guards)
- Functions under 50 lines; extract helpers
- Use `type` imports: `import type { X } from 'y'`
- Zod for ALL request validation

### Frontend
- Functional components + hooks only
- Zustand for global state (auth, ui), TanStack Query for server state
- `cn()` utility for conditional Tailwind classes
- `next/image` for all images
- Dark mode first — use CSS custom properties (`--primary`, `--background`, etc.)
- All interactive elements need unique `id` attributes
- File per component, colocated with feature folder

### Backend
- Fastify route plugins — each file exports `async function xRoutes(app: FastifyInstance)`
- Route prefix pattern: `app.register(routes, { prefix: '/api/...' })`
- All errors via `AppError` / `NotFoundError` from `lib/errors.ts`
- Services are singletons: `export const xService = new XService()`
- Realtime events: `cardEvents.created(boardId, data, userId)`
- Rate limiting via `createRateLimit()` from `middleware/rate-limit.ts`
- Feature flags via `isFeatureEnabled('FLAG_NAME')` from `lib/feature-flags.ts`

### Database
- Prisma models use `@id @default(cuid())` for IDs
- Soft deletes via `isArchived Boolean @default(false)`
- Position-based ordering with `Float` type
- Always include `where: { isArchived: false }` in queries
- Use `select:` to limit returned fields (never return full models)

### Git
- Conventional commits: `feat:`, `fix:`, `chore:`, `design:`, `docs:`
- Branch from `main`, PR back to `main`
- Never commit `.env` files

### Brand
- All SVG assets in `wrkly-web/public/brand/`
- Pixel-grid design language (3+2 grid with glass highlights)
- Color palette: blue→indigo→violet gradient spectrum

---

## Environment Variables (required)

```
DATABASE_URL=              # PostgreSQL connection string
JWT_SECRET=                # Secret for JWT signing
RESEND_API_KEY=            # Email service key
OPENAI_API_KEY=            # For AI features
CORS_ORIGIN=               # Comma-separated allowed origins
REDIS_URL=                 # For Socket.io adapter + BullMQ
GOOGLE_CLIENT_ID=          # OAuth (optional)
GOOGLE_CLIENT_SECRET=      # OAuth (optional)
```

---

## API Route Map

| Method  | Endpoint                               | Purpose                    |
| ------- | -------------------------------------- | -------------------------- |
| POST    | /api/auth/register                     | User registration          |
| POST    | /api/auth/login                        | User login                 |
| GET/POST| /api/workspaces                        | List/create workspaces     |
| GET/POST| /api/workspaces/:id/boards             | List/create boards         |
| GET     | /api/boards/:id                        | Full board with lists+cards|
| CRUD    | /api/boards/:boardId/lists             | List management            |
| CRUD    | /api/lists/:listId/cards               | Card management            |
| CRUD    | /api/cards/:cardId/blocks              | Block (rich content) mgmt  |
| CRUD    | /api/cards/:cardId/comments            | Comment management         |
| POST    | /api/ai/command                        | AI parse NL command        |
| POST    | /api/ai/summarize                      | AI board summary           |
| POST    | /api/ai/generate-tasks                 | AI task generation         |
| POST    | /api/ai/assist-content                 | AI writing assistant       |
| GET     | /api/search                            | Full-text search           |
| GET     | /api/notifications                     | User notifications         |
