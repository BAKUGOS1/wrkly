---
name: pr-review
argument-hint: [pr-number]
---

Review pull request #$ARGUMENTS:

1. Run `gh pr view $ARGUMENTS --json title,body,files,additions,deletions,author`
2. Run `gh pr diff $ARGUMENTS` — read the full diff
3. Categorize changes:
   - **Frontend** (wrkly-web/src/) — check component patterns, types, accessibility
   - **Backend** (wrkly-api/src/) — check route/service patterns, auth, validation
   - **Database** (prisma/) — check schema changes, migrations needed
   - **Config** — check env changes, dependency updates
4. Run the code-reviewer agent analysis on changed files
5. Check for:
   - Missing Zod validation on new endpoints
   - Missing `authenticate` middleware on new routes
   - Missing `select:` in new Prisma queries
   - Missing `isArchived: false` in new queries
   - Missing realtime event emissions for mutations
   - `any` types or `// @ts-ignore` comments
   - New dependencies without justification
6. Run `cd wrkly-api && pnpm test` — verify tests pass
7. Run `cd wrkly-web && pnpm build` — verify build passes
8. Write review summary:
   - **Approve** if no critical issues
   - **Request changes** with specific line-level feedback if issues found
9. Post review: `gh pr review $ARGUMENTS --approve` or `gh pr review $ARGUMENTS --request-changes --body "..."`
