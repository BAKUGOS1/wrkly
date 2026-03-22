# Lessons Learned & Self-Improvement

*Document any mistakes, user corrections, and pattern improvements here.*

## Active Rules
1. **Always verify before marking done**: Demonstrated through TypeScript compile check before completion.
2. **Consult PROJECT.md**: Ensure all changes align with minimal impact and simplicity first rules.
3. **Pin Prisma to v5**: `pnpm add -D prisma@5 @prisma/client@5` — Prisma v7 is a breaking change that moves datasource URL config to external `.prisma/config.yaml` files, incompatible with standard `schema.prisma` syntax.
4. **Zod v4 uses `.issues` not `.errors`**: The `safeParse` error object changed from `.errors` to `.issues` in Zod v4. Always use `result.error.issues.map((issue: z.ZodIssue) => ...)`.
5. **Prisma v5 named relations**: When a single model (User) has multiple FK relations pointing to it from other models, each `@relation` must have a unique name string (e.g. `"BoardCreator"`) and the back-relation on User must match with `@relation("BoardCreator")`.
6. **No `&&` in PowerShell**: Use separate `run_command` calls for sequential commands. PowerShell does not support `&&` as a statement separator.

## Lesson Log
- *2026-03-18*: Prisma v7 breaking change — pin to v5 for production. Zod v4 `.issues` API change. Prisma named relations required when User has multiple FK references.
