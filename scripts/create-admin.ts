/**
 * Create the first administrator.
 *
 *   npm run admin:create
 *
 * Credentials are read interactively (never echoed) or, for automation, from
 * ADMIN_EMAIL / ADMIN_PASSWORD. Nothing is hardcoded and nothing is written to
 * .env — the hash lives only in the database.
 */
import { eq } from "drizzle-orm";
import { createInterface } from "node:readline";

import { db, user } from "../db";
import { createAdminAccount } from "../lib/auth";
import { loadEnvFiles } from "../lib/env/load";

loadEnvFiles();

const MIN_PASSWORD_LENGTH = 12;

function fail(message: string): never {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

async function promptHidden(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const stdin = process.stdin;

  process.stdout.write(question);
  const wasRaw = stdin.isRaw;
  if (stdin.isTTY) stdin.setRawMode(true);

  return new Promise<string>((resolve) => {
    let value = "";

    const onData = (chunk: Buffer) => {
      const text = chunk.toString("utf8");

      for (const char of text) {
        if (char === "\r" || char === "\n") {
          if (stdin.isTTY) stdin.setRawMode(wasRaw ?? false);
          stdin.off("data", onData);
          rl.close();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          // Ctrl-C
          process.stdout.write("\n");
          process.exit(130);
        }
        if (char === "\u007f") {
          value = value.slice(0, -1);
          continue;
        }
        value += char;
      }
    };

    stdin.on("data", onData);
    stdin.resume();
  });
}

async function promptVisible(question: string, fallback: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise<string>((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim() || fallback);
    });
  });
}

function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(password)) return "Include a lowercase letter.";
  if (!/[A-Z]/.test(password)) return "Include an uppercase letter.";
  if (!/[0-9]/.test(password)) return "Include a number.";
  return null;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is not set. Add it to .env.local first.");
  }
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) {
    fail(
      "BETTER_AUTH_SECRET is missing or shorter than 32 characters. Generate one with:\n" +
        '  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }

  const interactive = process.stdin.isTTY;

  let email = process.env.ADMIN_EMAIL ?? "";
  let password = process.env.ADMIN_PASSWORD ?? "";
  let name = process.env.ADMIN_NAME ?? "";

  if (!email) {
    if (!interactive) {
      fail("ADMIN_EMAIL (and ADMIN_PASSWORD) must be provided when running non-interactively.");
    }
    email = await promptVisible("Admin email address: ", "");
  }

  email = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(`"${email}" does not look like an email address.`);

  if (!name) {
    name = interactive ? await promptVisible("Display name [Garden Admin]: ", "Garden Admin") : "Garden Admin";
  }

  if (!password) {
    if (!interactive) fail("ADMIN_PASSWORD must be provided when running non-interactively.");

    password = await promptHidden(`Password (min ${MIN_PASSWORD_LENGTH} characters, hidden): `);
    const confirmation = await promptHidden("Confirm password: ");

    if (password !== confirmation) fail("The passwords did not match.");
  }

  const problem = validatePassword(password);
  if (problem) fail(problem);

  const existing = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (existing.length > 0) {
    fail(`${email} already exists. Sign in and change the password from /admin/settings instead.`);
  }

  const created = await createAdminAccount({ email, password, name, role: "admin" });

  console.log(`
✓ Administrator created

  Email: ${created.email}
  Role:  ${created.role}

Sign in at /admin/login, then change this password from Settings.
`);
  process.exit(0);
}

void main().catch((error: unknown) => {
  // Never print a raw stack trace that could contain the connection string.
  console.error(
    `\n✗ Could not create the administrator: ${error instanceof Error ? error.message : "unknown error"}\n`,
  );
  process.exit(1);
});
