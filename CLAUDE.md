# Wrkly — Project Brain

> AI-powered task orchestration and project management platform.
> Domain: **wrkly.in** | Repo: `github.com/BAKUGOS1/wrkly`

---

## How to Use .claude/ When Generating Code

> **This section is mandatory reading for every AI session.** Before writing any code for this project, follow these instructions to activate the right context, skills, and agents.

### 1. Automatic Rule Loading (Always Active)

Rules in `.claude/rules/` are **auto-loaded based on which files you are editing**. You do not need to manually invoke them — they apply automatically:

| If you are editing files in... | Rule auto-loaded |
| --- | --- |
| `wrkly-api/**/*` | `.claude/rules/backend.md` — full backend reference |
| `wrkly-api/src/routes/**` | `.claude/rules/api.md` — route patterns |
| `wrkly-api/src/services/**` | `.claude/rules/api.md` + `.claude/rules/backend.md` |
| `wrkly-api/prisma/**` | `.claude/rules/database.md` — Prisma patterns |
| `wrkly-web/src/components/**` | `.claude/rules/frontend.md` — component rules |
| `wrkly-web/src/app/**` | `.claude/rules/frontend.md` — page rules |
| `wrkly-web/src/stores/**` | `.claude/rules/frontend.md` — Zustand rules |

**Action:** Read the matched rule file before generating any code in that area.

---

### 2. When to Activate Skills

Invoke a skill from `.claude/skills/` when you recognize one of these situations:

| Situation | Skill to Use |
| --- | --- |
| Building or editing **any UI component, page, or layout** | `@wrkly-design-system` — use the exact color tokens, component patterns, and brand guidelines |
| Implementing **any new feature or bug fix** | `@test-driven-development` — write the Vitest test first, watch it fail, then implement |
| **Something is broken** and you need to trace the cause | `@debugging-strategies` — follow the systematic reproduce→isolate→fix→verify loop |
| Finishing **any coding task** before marking it done | `@lint-and-validate` — run `tsc --noEmit` + `pnpm test` + `pnpm build` |

**How to invoke manually:**
```
Use @wrkly-design-system to build this component.
Use @test-driven-development to implement this feature.
Use @debugging-strategies to track down this bug.
```

---

### 3. When to Delegate to an Agent

Delegate complex or specialized tasks from `.claude/agents/` instead of doing everything inline:

| Task | Agent |
| --- | --- |
| Reviewing code before merge | `code-reviewer` — runs full security, convention, and quality check |
| Diagnosing a hard-to-find bug | `debugger` — systematic trace from route → service → database |
| Writing Vitest tests for a route or service | `test-writer` — generates comprehensive test suites |
| Cleaning up messy, duplicated, or long code | `refactorer` — applies DRY, extracts helpers, fixes types |
| Writing or updating docs, READMEs, or JSDoc | `doc-writer` — generates docs that match current code |
| Running a full security audit | `security-auditor` — checks auth, validation, rate limiting, data exposure |

---

### 4. Slash Commands for Common Workflows

Use these slash commands from `.claude/commands/` to run full multi-step workflows:

| Command | When to use |
| --- | --- |
| `/fix-issue 42` | When asked to fix a GitHub issue — reads issue, finds code, fixes, tests, commits |
| `/deploy production` | When deploying — runs pre-deploy checks, verifies env, pushes both services |
| `/pr-review 12` | When reviewing a PR — reads diff, checks conventions, runs tests, posts review |

---

### 5. Code Generation Checklist

Before writing any code for this project, mentally run through this checklist:

**Understand context**
- [ ] Which package am I working in? (`wrkly-api/` or `wrkly-web/`)
- [ ] Which rule file applies? (backend, frontend, database, api)
- [ ] Am I building UI? → Load `@wrkly-design-system`
- [ ] Am I implementing a feature? → Use `@test-driven-development`

**Generate code correctly**
- [ ] Backend routes: follow the plugin pattern in `.claude/rules/backend.md §2`
- [ ] Zod validation: every request body, query param, and URL param
- [ ] `authenticate` middleware: on every protected route
- [ ] Prisma queries: always use `select:` + `isArchived: false`
- [ ] After mutations: emit realtime event (`cardEvents.created(...)`)
- [ ] Frontend: CSS tokens (`hsl(var(--primary))`), not hardcoded colors
- [ ] Frontend: `cn()` for conditional classes, `next/image` for images
- [ ] No `any` types — use `unknown` + type guards

**Validate before finishing**
- [ ] `cd wrkly-api && npx tsc --noEmit` — no type errors
- [ ] `cd wrkly-api && pnpm test` — all tests pass
- [ ] `cd wrkly-web && pnpm build` — build succeeds
- [ ] Commit: `feat:` / `fix:` / `chore:` conventional format

---

### 6. Quick Reference

```
# Which rule do I need?
wrkly-api/src/routes/**   → .claude/rules/api.md + backend.md
wrkly-api/prisma/**       → .claude/rules/database.md
wrkly-web/src/**          → .claude/rules/frontend.md

# Which skill do I activate?
Building UI               → @wrkly-design-system
New feature / bug fix     → @test-driven-development
Debugging                 → @debugging-strategies
Before marking done       → @lint-and-validate

# Which agent do I use?
Review code               → code-reviewer
Hard debug                → debugger
Write tests               → test-writer
Clean up code             → refactorer
Write docs                → doc-writer
Security audit            → security-auditor

# Which command do I run?
Fix a GitHub issue        → /fix-issue {number}
Deploy the app            → /deploy {staging|production}
Review a PR               → /pr-review {number}
```

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
