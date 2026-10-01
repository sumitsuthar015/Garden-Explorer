import { defineConfig } from "vitest/config";

/**
 * Unit and integration tests.
 *
 * Everything here runs without a database: the pure domain logic (scoring,
 * validation, badge rules, QR parsing, progress bookkeeping) is kept separate
 * from the query layer precisely so it can be tested directly. Database and
 * browser behaviour is covered by the Playwright suite against a seeded garden.
 */
export default defineConfig({
  resolve: {
    // Resolves the `@/*` aliases straight from tsconfig.json — no extra plugin.
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    globals: true,
    reporters: ["default"],
    env: {
      NODE_ENV: "test",
      // The env module validates lazily; this keeps importing it side-effect free.
      BETTER_AUTH_SECRET: "test-secret-that-is-long-enough-for-validation",
    },
  },
});
