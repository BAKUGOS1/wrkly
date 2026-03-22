# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app

# Copy manifests first so layer cache is reused when only source changes
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Install ALL deps (including devDeps needed for tsc + prisma generate)
RUN pnpm install --frozen-lockfile

# Generate Prisma client against the schema
RUN pnpm exec prisma generate

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src/
RUN pnpm build

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache curl

WORKDIR /app

ENV NODE_ENV=production

# Copy production artifacts + full node_modules (prisma CLI needed for db push)
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma       ./prisma
COPY --from=builder /app/package.json ./package.json

# Non-root user
RUN addgroup -S wrkly && adduser -S wrkly -G wrkly
RUN chown -R wrkly:wrkly /app

USER wrkly

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Use shell form so && works. Use explicit binary path (not npx).
CMD sh -c "echo '=== Running Prisma DB Push ===' && ./node_modules/.bin/prisma db push --schema=./prisma/schema.prisma --accept-data-loss --skip-generate && echo '=== DB Push Complete ===' && node dist/server.js"
