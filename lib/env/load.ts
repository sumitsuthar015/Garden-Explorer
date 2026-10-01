/**
 * Minimal .env loader used by scripts and drizzle-kit.
 *
 * Next.js loads `.env.local` automatically at runtime, but standalone scripts
 * (seed, migrations, admin creation, doctor) run outside Next so they need to
 * pull the same files in. Loaded in priority order, first value wins.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const ENV_FILES = [".env.local", ".env.development.local", ".env", ".env.example"];

let loaded = false;

export function loadEnvFiles(cwd: string = process.cwd()): void {
  if (loaded) return;
  loaded = true;

  for (const file of ENV_FILES) {
    const full = path.join(cwd, file);
    if (!existsSync(full)) continue;

    let source: string;
    try {
      source = readFileSync(full, "utf8");
    } catch {
      continue;
    }

    for (const rawLine of source.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const eq = line.indexOf("=");
      if (eq === -1) continue;

      const key = line.slice(0, eq).trim();
      if (!key || process.env[key] !== undefined) continue;

      let value = line.slice(eq + 1).trim();
      const quoted =
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"));
      if (quoted) value = value.slice(1, -1);

      process.env[key] = value;
    }
  }
}
