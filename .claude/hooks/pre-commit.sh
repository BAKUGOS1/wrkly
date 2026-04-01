#!/bin/bash
# Pre-commit hook: type check → lint → test
# Exit code 2 = BLOCK the commit. Exit code 0 = allow.

echo "🔍 Running pre-commit checks..."

# ── Backend checks ──────────────────────────────────────────────────────────
echo "📦 [wrkly-api] Type checking..."
cd wrkly-api
npx tsc --noEmit 2>&1
if [ $? -ne 0 ]; then
  echo "❌ [wrkly-api] TypeScript errors found. Commit blocked."
  exit 2
fi

echo "🧪 [wrkly-api] Running tests..."
npx vitest run --silent 2>&1
if [ $? -ne 0 ]; then
  echo "❌ [wrkly-api] Tests failed. Commit blocked."
  exit 2
fi
cd ..

# ── Frontend checks ─────────────────────────────────────────────────────────
echo "📦 [wrkly-web] Type checking..."
cd wrkly-web
npx tsc --noEmit 2>&1
if [ $? -ne 0 ]; then
  echo "❌ [wrkly-web] TypeScript errors found. Commit blocked."
  exit 2
fi
cd ..

echo "✅ All pre-commit checks passed!"
exit 0
