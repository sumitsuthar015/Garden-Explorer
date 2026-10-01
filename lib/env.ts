import { z } from "zod";

/**
 * Centralised environment configuration.
 *
 * Design notes:
 *  - Validation is LAZY. Importing this module never throws, so `next build`
 *    and unit tests work without a live database or Cloudinary account.
 *  - Accessing a missing *required* server value raises a CONFIG_MISSING
 *    AppError with a safe visitor message instead of leaking a stack trace.
 *  - Nothing here is prefixed with NEXT_PUBLIC_ except genuinely public values.
 */

const serverSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine((value) => value.startsWith("postgres://") || value.startsWith("postgresql://"), {
      message: "DATABASE_URL must be a postgres:// connection string",
    }),

  BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be at least 32 characters"),

  BETTER_AUTH_URL: z.string().url().optional(),

  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().min(1).default("garden-explorer"),

  /** Optional. When absent analytics writes are skipped silently-by-design. */
  GARDEN_ANALYTICS_SALT: z.string().optional(),

  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type ServerEnv = z.infer<typeof serverSchema>;

export class MissingEnvError extends Error {
  readonly keys: string[];
  constructor(keys: string[]) {
    super(`Missing or invalid environment variables: ${keys.join(", ")}`);
    this.name = "MissingEnvError";
    this.keys = keys;
  }
}

type CacheState = {
  value: ServerEnv | null;
  error: MissingEnvError | null;
};
const globalCache = globalThis as unknown as { __gardenEnvCache?: CacheState };
globalCache.__gardenEnvCache ??= { value: null, error: null };

/**
 * Resolve and validate server env. Throws MissingEnvError only when called.
 * Results (including the failure) are cached so a misconfigured deploy fails
 * fast and consistently rather than re-parsing on every request. In
 * development a failure is re-checked instead, because `next dev` reloads
 * `.env.local` when it is edited and the fix should apply without a restart.
 */
export function getServerEnv(): ServerEnv {
  const cache = globalCache.__gardenEnvCache!;
  if (cache.value) return cache.value;
  if (cache.error && process.env.NODE_ENV === "production") throw cache.error;

  const parsed = serverSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    CLOUDINARY_UPLOAD_FOLDER: process.env.CLOUDINARY_UPLOAD_FOLDER,
    GARDEN_ANALYTICS_SALT: process.env.GARDEN_ANALYTICS_SALT,
    NODE_ENV: process.env.NODE_ENV,
  });

  if (!parsed.success) {
    const keys = Array.from(
      new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "unknown"))),
    );
    const error = new MissingEnvError(keys);
    const alreadyReported = cache.error?.message === error.message;
    cache.error = error;
    // Log the variable NAMES only — never their values — and only once per problem.
    if (!alreadyReported) {
      console.error(
        JSON.stringify({
          level: "error",
          code: "ENV_VALIDATION_FAILED",
          missingKeys: keys,
        }),
      );
    }
    throw error;
  }

  cache.error = null;
  cache.value = parsed.data;
  return parsed.data;
}

/** Non-throwing probe used by the dashboard/settings screens and the doctor script. */
export function inspectServerEnv(): {
  ok: boolean;
  missing: string[];
  cloudinaryConfigured: boolean;
  databaseConfigured: boolean;
} {
  const parsed = serverSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    CLOUDINARY_UPLOAD_FOLDER: process.env.CLOUDINARY_UPLOAD_FOLDER,
    GARDEN_ANALYTICS_SALT: process.env.GARDEN_ANALYTICS_SALT,
    NODE_ENV: process.env.NODE_ENV,
  });

  const missing = parsed.success
    ? []
    : Array.from(new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "unknown"))));

  return {
    ok: missing.length === 0,
    missing,
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    cloudinaryConfigured: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET,
    ),
  };
}

export const isProduction = process.env.NODE_ENV === "production";

/**
 * Public app URL used for QR payloads, canonical tags, sitemap and OG metadata.
 * Falls back to the request host at runtime when unset (see `lib/site-url.ts`).
 */
export const PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
