/**
 * Deployment doctor.
 *
 *   npm run check                checks configuration and the database
 *   npm run check -- --url https://garden.example
 *                                also fetches the public pages and one QR route
 *
 * Read-only: it never migrates, seeds or writes anything. Exit code 1 means at
 * least one check failed, so it can gate a deploy step.
 */
import { Pool, neonConfig } from "@neondatabase/serverless";
import { readdirSync } from "node:fs";
import path from "node:path";

import { loadEnvFiles } from "../lib/env/load";
import { allowSlowNetworkHandshakes } from "../lib/network";

loadEnvFiles();
neonConfig.poolQueryViaFetch = false;
allowSlowNetworkHandshakes();

type Status = "pass" | "warn" | "fail";

interface CheckResult {
  status: Status;
  title: string;
  detail: string;
}

const results: CheckResult[] = [];

function record(status: Status, title: string, detail: string): void {
  results.push({ status, title, detail });
}

function argValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  const value = process.argv[index + 1];
  return value && !value.startsWith("--") ? value : null;
}

async function checkEnv(): Promise<void> {
  const { inspectServerEnv } = await import("../lib/env");
  const env = inspectServerEnv();

  if (env.databaseConfigured) {
    record("pass", "DATABASE_URL", "present");
  } else {
    record("fail", "DATABASE_URL", "missing — the app cannot reach Postgres");
  }

  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    record("fail", "BETTER_AUTH_SECRET", "missing — admin sign-in will not work");
  } else if (secret.length < 32) {
    record("fail", "BETTER_AUTH_SECRET", "shorter than 32 characters");
  } else if (/^(secret|changeme|password)/i.test(secret)) {
    record("warn", "BETTER_AUTH_SECRET", "looks like a placeholder value — generate a random one");
  } else {
    record("pass", "BETTER_AUTH_SECRET", "present and long enough");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    record(
      "warn",
      "NEXT_PUBLIC_APP_URL",
      "not set — on Vercel production the project's domain is used, elsewhere the request host",
    );
  } else if (!appUrl.startsWith("https://")) {
    record("warn", "NEXT_PUBLIC_APP_URL", `should be https in production (got ${appUrl})`);
  } else {
    record("pass", "NEXT_PUBLIC_APP_URL", appUrl);
  }

  if (process.env.BETTER_AUTH_URL) {
    record("pass", "BETTER_AUTH_URL", process.env.BETTER_AUTH_URL);
  } else {
    record("warn", "BETTER_AUTH_URL", "not set — Better Auth will use the request origin");
  }

  if (env.cloudinaryConfigured) {
    record("pass", "Cloudinary", "configured — image uploads are enabled");
  } else {
    record(
      "warn",
      "Cloudinary",
      "not configured — uploads are disabled, but image URLs can still be pasted",
    );
  }

  if (env.missing.length > 0) {
    record("warn", "Environment schema", `unresolved keys: ${env.missing.join(", ")}`);
  }
}

function checkMigrationsOnDisk(): void {
  try {
    const folder = path.join(process.cwd(), "drizzle", "migrations");
    const files = readdirSync(folder).filter((file) => file.endsWith(".sql"));
    if (files.length === 0) {
      record("fail", "Migrations", "no .sql files in drizzle/migrations — run npm run db:generate");
    } else {
      record("pass", "Migrations", `${files.length} migration file(s) on disk`);
    }
  } catch {
    record("fail", "Migrations", "drizzle/migrations is missing");
  }
}

async function checkDatabase(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    record("fail", "Database connection", "skipped — DATABASE_URL is not set");
    return;
  }

  const pool = new Pool({ connectionString: url, max: 1 });

  try {
    const client = await pool.connect();
    try {
      const version = await client.query<{ version: string }>("select version()");
      record("pass", "Database connection", version.rows[0]?.version ?? "connected");

      // Drizzle keeps its migration journal in its own `drizzle` schema.
      const tables = await client.query<{ table_name: string }>(
        "select table_name from information_schema.tables where table_schema in ('public', 'drizzle')",
      );
      const names = new Set(tables.rows.map((row) => row.table_name));

      const required = [
        "gardens",
        "locations",
        "location_content_blocks",
        "location_facts",
        "activities",
        "quizzes",
        "quiz_questions",
        "quiz_options",
        "qr_codes",
        "trails",
        "trail_stops",
        "badges",
        "scan_events",
        "quiz_attempt_events",
        "activity_events",
        "media_assets",
        "site_settings",
        "admin_audit_logs",
        "user",
        "session",
        "account",
        "verification",
        "__drizzle_migrations",
      ];

      const missing = required.filter((name) => !names.has(name));
      if (missing.length > 0) {
        record("fail", "Schema", `missing tables: ${missing.join(", ")} — run npm run db:migrate`);
      } else {
        record("pass", "Schema", `all ${required.length} expected tables are present`);
      }

      const published = await client.query<{ count: string }>(
        "select count(*)::text as count from locations where status = 'published'",
      );
      const locationCount = Number(published.rows[0]?.count ?? "0");
      if (locationCount === 0) {
        record("warn", "Published content", "no published locations yet — visitors see an empty garden");
      } else {
        record("pass", "Published content", `${locationCount} published location(s)`);
      }

      const qr = await client.query<{ count: string }>(
        "select count(*)::text as count from qr_codes where status = 'active'",
      );
      const qrCount = Number(qr.rows[0]?.count ?? "0");
      if (qrCount === 0) {
        record("warn", "QR codes", "no active QR codes yet — nothing can be scanned");
      } else {
        record("pass", "QR codes", `${qrCount} active code(s)`);
      }

      const admins = await client.query<{ count: string }>(
        "select count(*)::text as count from \"user\" where role in ('admin','editor')",
      );
      const adminCount = Number(admins.rows[0]?.count ?? "0");
      if (adminCount === 0) {
        record("warn", "Admin account", "none yet — run npm run admin:create");
      } else {
        record("pass", "Admin account", `${adminCount} admin/editor account(s)`);
      }
    } finally {
      client.release();
    }
  } catch (error) {
    // Socket failures arrive as an ErrorEvent wrapping the real error, not as an Error.
    const cause = error instanceof Error ? error : (error as { error?: unknown } | null)?.error;
    const message =
      cause instanceof Error && cause.message
        ? cause.message
        : "could not reach the database — check your internet connection and DATABASE_URL";
    record("fail", "Database connection", message.replace(/postgres(ql)?:\/\/\S+/g, "postgres://…"));
  } finally {
    await pool.end();
  }
}

async function checkPublicUrls(): Promise<void> {
  const base = argValue("--url");
  if (!base) {
    record("warn", "Live URL checks", "skipped — pass --url https://your-domain to check them");
    return;
  }

  const target = base.replace(/\/$/, "");

  const routes: { path: string; expect: number[]; label: string }[] = [
    { path: "/", expect: [200], label: "Home" },
    { path: "/explore", expect: [200], label: "Explore" },
    { path: "/trails", expect: [200], label: "Trails" },
    { path: "/scan", expect: [200], label: "Scanner" },
    { path: "/progress", expect: [200], label: "Progress" },
    { path: "/privacy", expect: [200], label: "Privacy" },
    { path: "/admin/login", expect: [200], label: "Admin login" },
    { path: "/q/THIS-CODE-DOES-NOT-EXIST", expect: [404], label: "Unknown QR returns 404" },
    { path: "/robots.txt", expect: [200], label: "robots.txt" },
    { path: "/sitemap.xml", expect: [200], label: "sitemap.xml" },
  ];

  for (const route of routes) {
    try {
      const response = await fetch(`${target}${route.path}`, { redirect: "manual" });
      if (route.expect.includes(response.status)) {
        record("pass", route.label, `${route.path} → ${response.status}`);
      } else {
        record(
          "fail",
          route.label,
          `${route.path} returned ${response.status}, expected ${route.expect.join(" or ")}`,
        );
      }
    } catch (error) {
      record(
        "fail",
        route.label,
        `${route.path} could not be fetched (${error instanceof Error ? error.message : "network error"})`,
      );
    }
  }

  // Admin routes must be protected, not merely hidden.
  try {
    const response = await fetch(`${target}/admin`, { redirect: "manual" });
    if (response.status === 307 || response.status === 302 || response.status === 303) {
      const location = response.headers.get("location") ?? "";
      if (location.includes("/admin/login")) {
        record("pass", "Admin protection", "/admin redirects anonymous visitors to /admin/login");
      } else {
        record("warn", "Admin protection", `/admin redirected to ${location} instead of the login page`);
      }
    } else if (response.status === 200) {
      record("fail", "Admin protection", "/admin returned 200 without a session");
    } else {
      record("warn", "Admin protection", `/admin returned ${response.status}`);
    }
  } catch (error) {
    record(
      "fail",
      "Admin protection",
      `could not be checked (${error instanceof Error ? error.message : "network error"})`,
    );
  }
}

function printResults(): void {
  const icons: Record<Status, string> = { pass: "✓", warn: "!", fail: "✗" };

  console.log("\nGarden Explorer — deployment check\n");

  for (const result of results) {
    console.log(`  ${icons[result.status]} ${result.title}: ${result.detail}`);
  }

  const failures = results.filter((result) => result.status === "fail").length;
  const warnings = results.filter((result) => result.status === "warn").length;

  console.log(
    `\n${results.length - failures - warnings} passed, ${warnings} warning(s), ${failures} failure(s)\n`,
  );

  if (failures > 0) {
    console.log("Fix the failures above before deploying.\n");
    process.exitCode = 1;
  } else if (warnings > 0) {
    console.log("No blocking problems. Review the warnings when you have time.\n");
  } else {
    console.log("All checks passed.\n");
  }
}

async function main(): Promise<void> {
  await checkEnv();
  checkMigrationsOnDisk();
  await checkDatabase();
  await checkPublicUrls();
  printResults();
}

void main().catch((error: unknown) => {
  console.error(`\n✗ Check failed to run: ${error instanceof Error ? error.message : "unknown"}\n`);
  process.exit(1);
});
