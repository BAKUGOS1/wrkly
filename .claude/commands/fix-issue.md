---
name: fix-issue
argument-hint: [issue-number]
---

Fix GitHub issue #$ARGUMENTS:

1. Run `gh issue view $ARGUMENTS --json title,body,labels,assignees` — read the full issue
2. Understand the problem and identify relevant source files
3. Find related code using grep/glob in `wrkly-api/src/` and `wrkly-web/src/`
4. Implement the **minimal fix** that addresses the issue without side effects
5. Write a regression test if the fix is in `wrkly-api/` (Vitest)
6. Run verification:
   - `cd wrkly-api && pnpm test` — all tests pass
   - `cd wrkly-web && pnpm build` — no type errors
7. Commit: `fix: description (closes #$ARGUMENTS)`
8. Create a summary of what was changed and why
