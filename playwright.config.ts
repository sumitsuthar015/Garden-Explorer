import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests.
 *
 * These run against a real Next server and a real database, because the product
 * *is* the database: a mocked QR lookup would prove nothing. Before running:
 *
 *   1. cp .env.example .env.local   and fill in DATABASE_URL + BETTER_AUTH_SECRET
 *   2. npm run db:migrate
 *   3. npm run db:seed
 *   4. npm run test:e2e:install     (first time only)
 *   5. npm run test:e2e
 *
 * Tests that depend on seeded demo content skip themselves with a clear message
 * when the garden is empty, instead of failing for the wrong reason.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  // Graded answers make a round trip to the database; allow for a distant one.
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Garden wifi is slow; a little patience avoids flaky false failures.
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],

  webServer: {
    command: `npx next dev --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
