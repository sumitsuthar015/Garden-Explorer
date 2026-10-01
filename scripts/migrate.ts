/**
 * Apply Drizzle migrations to the database in `DATABASE_URL`.
 *
 * Uses the versioned SQL files in `drizzle/migrations` — never `db:push`. That
 * matters in production: `push` diffs the schema and can drop data, whereas
 * `migrate` only ever applies the reviewed statements, once, in order.
 *
 *   npm run db:migrate
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import path from "node:path";

import { loadEnvFiles } from "../lib/env/load";
import { allowSlowNetworkHandshakes } from "../lib/network";

loadEnvFiles();
neonConfig.poolQueryViaFetch = false;
allowSlowNetworkHandshakes();

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;

  if (!url) {
    console.error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.",
    );
    process.exitCode = 1;
    return;
  }

  if (/localhost|127\.0\.0\.1/.test(url) && process.env.NODE_ENV === "production") {
    console.error("Refusing to migrate: a local DATABASE_URL in a production run looks wrong.");
    process.exitCode = 1;
    return;
  }

  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);

  console.log("Applying migrations from drizzle/migrations …");

  try {
    await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle", "migrations") });
    console.log("✓ Migrations applied. No data was dropped or reset.");
  } catch (error) {
    console.error("Migration failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

void main();
