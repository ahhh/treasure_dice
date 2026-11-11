import { defineConfig } from 'vitest/config';

// The simulation tests are CPU-heavy and run much slower on CI runners than locally,
// so the 5s default timeout trips on whichever test happens to be closest to it.
export default defineConfig({
  test: {
    testTimeout: 60_000,
  },
});
