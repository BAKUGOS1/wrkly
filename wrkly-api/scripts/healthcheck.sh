#!/bin/sh
# Simple HTTP health probe — used by Railway/Docker HEALTHCHECK
# Exit 0 = healthy, exit 1 = unhealthy (triggers container restart)
curl -f http://localhost:4000/health || exit 1
