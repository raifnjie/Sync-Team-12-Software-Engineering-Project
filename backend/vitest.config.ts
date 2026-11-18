import { defineConfig } from "vitest/config";

// Route tests use a real PostgreSQL test database (TEST_DATABASE_URL in .env).
// global-setup.ts resets and seeds it once per run; test files run one at a
// time because they share it.
export default defineConfig({
  test: {
    globalSetup: "./src/test/global-setup.ts",
    setupFiles: ["./src/test/env.ts"],
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 60_000,
  },
});
