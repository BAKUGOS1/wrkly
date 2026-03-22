import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    setupFiles:  ['./tests/setup.ts'],
    // Run test files sequentially to avoid DB race conditions
    pool:        'forks',
    poolOptions: { forks: { singleFork: true } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include:  ['src/**/*.ts'],
      exclude:  ['src/server.ts', 'src/lib/prisma.ts'],
    },
  },
});
