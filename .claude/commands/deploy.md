---
name: deploy
argument-hint: [environment: staging|production]
---

Deploy Wrkly to $ARGUMENTS environment:

## Pre-deploy checks
1. Run `cd wrkly-api && pnpm lint && pnpm test` — all must pass
2. Run `cd wrkly-web && pnpm build` — must compile without errors
3. Run `git status` — working tree must be clean (no uncommitted changes)

## Backend deployment (wrkly-api)
4. Verify `DATABASE_URL`, `JWT_SECRET`, `REDIS_URL` are set in Railway/$ARGUMENTS env
5. Run `cd wrkly-api && pnpm build` — compile TypeScript
6. If $ARGUMENTS is "production":
   - Verify `NODE_ENV=production` is set
   - Verify JWT_SECRET is NOT `dev-secret-change-in-production`
7. Push: `git push origin main` (Railway auto-deploys from main)

## Frontend deployment (wrkly-web)
8. Verify `NEXT_PUBLIC_API_URL` points to correct backend URL
9. Push triggers Vercel auto-deploy from main branch

## Post-deploy verification
10. Check health endpoint: `curl https://api.wrkly.in/health`
11. Check frontend loads: open `https://wrkly.in` in browser
12. Verify login flow works end-to-end

## Rollback plan
If anything fails: `git revert HEAD && git push origin main`
