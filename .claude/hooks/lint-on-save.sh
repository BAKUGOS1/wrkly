#!/bin/bash
# Post-edit hook: auto-lint saved TypeScript/TSX files
# Runs after every Edit or Write operation on source files

CHANGED_FILES=$(git diff --name-only --diff-filter=M 2>/dev/null | grep -E "\.(ts|tsx)$")

if [ -z "$CHANGED_FILES" ]; then
  exit 0
fi

echo "🧹 Auto-linting changed files..."

# Check if changed files are in wrkly-api or wrkly-web
API_FILES=$(echo "$CHANGED_FILES" | grep "^wrkly-api/")
WEB_FILES=$(echo "$CHANGED_FILES" | grep "^wrkly-web/")

if [ -n "$API_FILES" ]; then
  cd wrkly-api
  echo "$API_FILES" | sed 's|^wrkly-api/||' | xargs npx eslint --fix --quiet 2>/dev/null
  cd ..
fi

if [ -n "$WEB_FILES" ]; then
  cd wrkly-web
  echo "$WEB_FILES" | sed 's|^wrkly-web/||' | xargs npx eslint --fix --quiet 2>/dev/null
  cd ..
fi

echo "✅ Lint complete."
exit 0
