# Wrkly — Production Deployment Guide

## Prerequisites

- GitHub account + repo (push to `main` triggers CI/CD)
- [Vercel](https://vercel.com) account (frontend)
- [Railway](https://railway.app) account (backend + DB + Redis)

---

## Step 1 — Push to GitHub

```bash
# From the wrkly root
git init
git add .
git commit -m "chore: initial commit"
git remote add origin https://github.com/<you>/wrkly.git
git push -u origin main
```

---

## Step 2 — Set up Vercel (Frontend)

1. Go to [vercel.com/new](https://vercel.com/new) → **Import Git Repository**
2. Select the `wrkly` repo → set **Root Directory** to `wrkly-web`
3. Framework preset will auto-detect **Next.js**
4. Add Environment Variables in the Vercel dashboard:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.wrkly.in` |
| `NEXT_PUBLIC_WS_URL` | `wss://api.wrkly.in` |
| `NEXT_PUBLIC_ENABLE_AI` | `true` |

5. Click **Deploy**

---

## Step 3 — Set up Railway (Backend)

1. Go to [railway.app/new](https://railway.app/new) → **Deploy from GitHub repo**
2. Select `wrkly` → set **Root Directory** to `wrkly-api`
3. Railway will detect the `Dockerfile` automatically

### Add Plugins

- Click **+ New** → **Database → PostgreSQL** — Railway injects `DATABASE_URL` automatically
- Click **+ New** → **Database → Redis** — Railway injects `REDIS_URL` automatically

### Set Railway Environment Variables

| Variable | Value |
|---|---|
| `JWT_SECRET` | *(generate a 64-char random string)* |
| `CORS_ORIGIN` | `https://wrkly.in` |
| `PORT` | `4000` |
| `ENABLE_AI` | `true` |
| `OPENAI_API_KEY` | *(your OpenAI key)* |
| `OPENAI_MODEL` | `gpt-4o` |
| `STORAGE_PROVIDER` | `local` or `r2` |

> `DATABASE_URL` and `REDIS_URL` are auto-injected by Railway plugins — do not set them manually.

---

## Step 4 — (Alternative DBs) Neon + Upstash

If you prefer serverless infrastructure instead of Railway plugins:

- **Neon** (Postgres): [neon.tech](https://neon.tech) → create project → copy `DATABASE_URL`
- **Upstash** (Redis): [upstash.com](https://upstash.com) → create database → copy `REDIS_URL`

Set both in Railway environment variables.

---

## Step 5 — (Optional) Cloudflare R2 for File Uploads

For production file uploads instead of local disk:

1. Go to Cloudflare Dashboard → R2 → Create bucket `wrkly-uploads`
2. Create an API token with R2 read/write permissions
3. Add to Railway environment:

| Variable | Value |
|---|---|
| `STORAGE_PROVIDER` | `r2` |
| `R2_ACCOUNT_ID` | *(from Cloudflare)* |
| `R2_ACCESS_KEY_ID` | *(API token)* |
| `R2_SECRET_ACCESS_KEY` | *(API token secret)* |
| `R2_BUCKET` | `wrkly-uploads` |
| `R2_PUBLIC_URL` | `https://uploads.wrkly.in` |

---

## Step 6 — Set up GitHub Actions Secrets

In your GitHub repo → **Settings → Secrets → Actions**, add:

| Secret | How to get it |
|---|---|
| `VERCEL_TOKEN` | Vercel dashboard → Account Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel dashboard → Account Settings |
| `VERCEL_PROJECT_ID` | Vercel project → Settings → General |
| `RAILWAY_TOKEN` | Railway dashboard → Account → Tokens |

---

## Step 7 — Set up Custom Domains

### Frontend — wrkly.in → Vercel
1. Vercel project → **Settings → Domains** → Add `wrkly.in`
2. Add Vercel's DNS records to your DNS provider (A + CNAME)

### Backend — api.wrkly.in → Railway
1. Railway service → **Settings → Domains** → Add `api.wrkly.in`
2. Add Railway's CNAME to your DNS provider

---

## Step 8 — Run Production Migrations

Railway runs migrations automatically via the `startCommand` in `railway.toml`:

```
npx prisma migrate deploy && node dist/server.js
```

To run manually (e.g., for seed data):

```bash
DATABASE_URL="<your-prod-url>" npx prisma migrate deploy
DATABASE_URL="<your-prod-url>" npx prisma db seed   # optional demo data
```

---

## Step 9 — Verify Health Check

```bash
curl https://api.wrkly.in/health
# Expected: 200 { "status": "ok" }
```

---

## Step 10 — CI/CD is Live

Every push to `main`:
1. **CI** — spins up Postgres 16 + Redis 7, runs migrations, type-checks both apps, runs all tests
2. **On success** → deploys frontend to Vercel + backend to Railway simultaneously

PRs do **not** deploy (only test + type-check).

---

## Quick Reference — Environment Variables

### `wrkly-api` (Railway)

```env
DATABASE_URL=         # auto-injected
REDIS_URL=            # auto-injected
JWT_SECRET=           # generate with: openssl rand -hex 32
CORS_ORIGIN=https://wrkly.in
PORT=4000
ENABLE_AI=true
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
NODE_ENV=production
```

### `wrkly-web` (Vercel)

```env
NEXT_PUBLIC_API_URL=https://api.wrkly.in
NEXT_PUBLIC_WS_URL=wss://api.wrkly.in
NEXT_PUBLIC_ENABLE_AI=true
```
