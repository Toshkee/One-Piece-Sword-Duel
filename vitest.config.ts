import { defineConfig } from 'vitest/config';

// Pure game-logic tests run in Node — no browser/Phaser runtime needed,
// which is the whole point of keeping combat math in pure functions.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
  },
});
