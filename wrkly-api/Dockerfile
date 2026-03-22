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

# Prune dev dependencies so we ship only what the runtime needs
RUN pnpm prune --prod

# ── Stage 2: runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache curl   # needed for healthcheck.sh

WORKDIR /app

ENV NODE_ENV=production

# Copy only the production artifacts
COPY --from=builder /app/dist         ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma       ./prisma
COPY --from=builder /app/package.json ./package.json

# Non-root user for least-privilege
RUN addgroup -S wrkly && adduser -S wrkly -G wrkly
USER wrkly

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "dist/server.js"]
