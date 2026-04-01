---
paths:
  - "wrkly-api/prisma/**"
  - "wrkly-api/src/routes/**/*.ts"
  - "wrkly-api/src/services/**/*.ts"
  - "wrkly-api/src/lib/prisma*"
---

# Database Rules — Wrkly API (Prisma + PostgreSQL)

## Schema Conventions (`prisma/schema.prisma`)
- IDs: `@id @default(cuid())` — always CUID, never UUID or auto-increment
- Soft deletes: `isArchived Boolean @default(false)` — never hard delete user data
- Timestamps: `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`
- Position ordering: `position Float` — use fractional indexing for reorderable items
- Relations: always define both sides with `@relation` annotations
- Enums: define in schema file, use uppercase (`ADMIN`, `MEMBER`, `VIEWER`)

## Query Patterns
- **Always use `select:`** — never return full models to the client
  ```typescript
  // ✅ Good
  prisma.card.findMany({ select: { id: true, title: true } })

  // ❌ Bad
  prisma.card.findMany()
  ```
- **Always filter archived**: `where: { isArchived: false }` in every query
- **Position-based ordering**: `orderBy: { position: 'asc' }` for lists and cards
- **Paginate list endpoints**: use `take:` and `skip:` or cursor-based pagination
- **Use transactions** for multi-step mutations: `prisma.$transaction([...])`

## N+1 Prevention
- Use `include:` or nested `select:` for related data — never query in a loop
  ```typescript
  // ✅ Good
  prisma.board.findUnique({
    select: { lists: { select: { cards: true } } }
  })

  // ❌ Bad
  const board = await prisma.board.findUnique(...)
  for (const list of board.lists) {
    const cards = await prisma.card.findMany({ where: { listId: list.id } })
  }
  ```

## Migrations
- Run `npx prisma db push` for development
- Generate migration for production: `npx prisma migrate dev --name descriptive_name`
- Never use `--force-reset` in production
- Always run `npx prisma generate` after schema changes

## Seeding
- Seed file: `prisma/seed.ts`
- Run: `npx prisma db seed`
- Seed data should be idempotent (safe to run multiple times)
