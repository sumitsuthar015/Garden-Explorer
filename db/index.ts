import { Pool, neonConfig } from "@neondatabase/serverless";

import { drizzle } from "drizzle-orm/neon-serverless";

import { getServerEnv } from "@/lib/env";
import { allowSlowNetworkHandshakes } from "@/lib/network";
import * as schema from "./schema";

/**
 * Neon Postgres access for Vercel serverless.
 *
 * The WebSocket `Pool` driver is used (instead of the HTTP driver) because the
 * app needs real interactive transactions: trail reordering and quiz option
 * replacement both mutate several rows that must change atomically.
 *
 * The pool is cached on `globalThis` so Next.js hot reloads in development do
 * not open a new pool on every edit.
 */
type Database = ReturnType<typeof createDatabase>;

// Process-wide and idempotent; applied on load so it also reaches a pool that
// survives a dev-server hot reload.
allowSlowNetworkHandshakes();

function createDatabase() {
  const env = getServerEnv();

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 4,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 10_000,
  });

  // Pool queries must travel over the WebSocket protocol so that
  // `db.transaction()` is a real transaction rather than a no-op.
  neonConfig.poolQueryViaFetch = false;

  return drizzle(pool, { schema, logger: false });
}

const globalForDb = globalThis as unknown as { __gardenDb?: Database };

/**
 * Lazily create (and cache) the Drizzle client.
 * Lazy so that importing modules which merely *reference* the database — for
 * example during `next build` route analysis — does not require DATABASE_URL.
 */
export function getDb(): Database {
  globalForDb.__gardenDb ??= createDatabase();
  return globalForDb.__gardenDb;
}

export const db = new Proxy({} as Database, {
  get(_target, property, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance as object, property, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
/** Either the pool client or an open transaction — query helpers accept both. */
export type DbClient = Database | Transaction;

export { schema };
export * from "./schema";
