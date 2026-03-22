#!/bin/sh
set -e

echo "=== Wrkly API Startup ==="
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL is set: $(if [ -n "$DATABASE_URL" ]; then echo YES; else echo NO; fi)"

echo ""
echo "--- Running Prisma DB Push ---"
./node_modules/.bin/prisma db push --schema=./prisma/schema.prisma --accept-data-loss --skip-generate
echo "--- Prisma DB Push Complete ---"

echo ""
echo "--- Starting Node.js Server ---"
exec node dist/server.js
