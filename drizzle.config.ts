import { defineConfig } from "drizzle-kit";

import { loadEnvFiles } from "./lib/env/load";

loadEnvFiles();

export default defineConfig({
  schema: "./db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Validated lazily by drizzle-kit itself so `drizzle-kit generate` (which
    // does not need a connection) still works before a database exists.
    url: process.env.DATABASE_URL ?? "",
  },
  strict: true,
  verbose: true,
});
