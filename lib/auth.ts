import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { account, session, user, verification } from "@/db/schema";
import { getServerEnv, isProduction, PUBLIC_APP_URL } from "@/lib/env";

/**
 * Admin authentication.
 *
 * Deliberate constraints:
 *  - Public sign-up is DISABLED. Visitors never authenticate.
 *  - `role` is `input: false`, so a client can never grant itself a role; it is
 *    only ever written by the `admin:create` script or an existing admin.
 *  - Sessions live in Postgres and are sent as httpOnly, sameSite=lax cookies,
 *    marked `secure` in production.
 *  - Tight rate limits on the sign-in/sign-up endpoints blunt brute force.
 */

type Auth = ReturnType<typeof buildAuth>;

export interface AuthOptionOverrides {
  /**
   * Only the `admin:create` script sets this. Public sign-up stays disabled for
   * every request-serving instance of the app.
   */
  allowSignUp?: boolean;
  /**
   * `nextCookies()` writes into the Next.js response. Standalone scripts run
   * outside a request, so they build an instance without it.
   */
  includeNextCookies?: boolean;
}

function trustedOrigins(): string[] {
  const origins = new Set<string>();
  const appUrl = PUBLIC_APP_URL || process.env.BETTER_AUTH_URL;
  if (appUrl) {
    try {
      origins.add(new URL(appUrl).origin);
    } catch {
      /* ignore malformed URL — validation already logged */
    }
  }
  // Vercel preview deployments get their own hostname; allow the known system
  // env value so preview logins work without hardcoding a domain.
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) origins.add(`https://${vercelUrl}`);
  if (!isProduction) {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }
  return [...origins];
}

/**
 * Auth options, shared by the running app and the admin-creation script.
 * Exported so the script can reuse the identical schema, hashing and session
 * configuration instead of duplicating (or bypassing) it.
 */
export function buildAuthOptions(overrides: AuthOptionOverrides = {}) {
  const env = getServerEnv();

  // `satisfies` keeps the literal types (e.g. `type: "string"`) while still
  // type-checking the whole shape against Better Auth's options.
  return {
    appName: "Garden Explorer",
    baseURL: env.BETTER_AUTH_URL ?? (PUBLIC_APP_URL || undefined),
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: trustedOrigins(),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification },
    }),
    emailAndPassword: {
      enabled: true,
      // No public visitor accounts — only scripts and admins create users.
      disableSignUp: overrides.allowSignUp !== true,
      minPasswordLength: 12,
      maxPasswordLength: 200,
      autoSignIn: false,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "admin",
          // Critical: clients cannot set or change their own role.
          input: false,
        },
      },
    },
    session: {
      expiresIn: 60 * 60 * 8, // 8 hours
      updateAge: 60 * 15, // slide the expiry every 15 minutes of activity
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/change-password": { window: 60, max: 5 },
      },
    },
    advanced: {
      // httpOnly + sameSite are Better Auth defaults; secure is explicit here.
      useSecureCookies: isProduction,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: isProduction,
        path: "/",
      },
    },
    // nextCookies() must remain the LAST plugin so Server Actions can set cookies.
    plugins: overrides.includeNextCookies === false ? [] : [nextCookies()],
  } satisfies BetterAuthOptions;
}

function buildAuth() {
  return betterAuth(buildAuthOptions());
}

/**
 * Create an admin/editor account.
 *
 * Used only by `npm run admin:create`. The instance allows sign-up for the
 * duration of this one call; `autoSignIn: false` means no session cookie is
 * issued and the role column is never client-writable.
 */
export async function createAdminAccount(input: {
  email: string;
  password: string;
  name: string;
  role?: AdminRole;
}): Promise<{ id: string; email: string; role: AdminRole }> {
  const instance = betterAuth(
    buildAuthOptions({ allowSignUp: true, includeNextCookies: false }),
  ) as Auth;

  const created = await instance.api.signUpEmail({
    body: {
      email: input.email,
      password: input.password,
      name: input.name,
    },
  });

  const role: AdminRole = input.role ?? "admin";
  await db
    .update(user)
    .set({ role, emailVerified: true, updatedAt: new Date() })
    .where(eq(user.id, created.user.id));

  return { id: created.user.id, email: created.user.email, role };
}

const globalForAuth = globalThis as unknown as { __gardenAuth?: Auth };

/** Lazily constructed so importing this module never requires env at build time. */
export function getAuth(): Auth {
  globalForAuth.__gardenAuth ??= buildAuth();
  return globalForAuth.__gardenAuth;
}

/**
 * Lazily-resolving façade around the Better Auth instance.
 *
 * Both traps matter:
 *  - `get` forwards property/method access (`auth.api.getSession()`), binding
 *    methods to the real instance.
 *  - `has` makes the `in` operator work. `toNextJsHandler()` decides how to
 *    dispatch with `"handler" in auth`: without a `has` trap the proxy target
 *    (an empty object) answers `false`, Better Auth then tries to *call* the
 *    proxy, and every `/api/auth/*` request fails with
 *    "TypeError: auth is not a function" — which is why admin sign-in never
 *    created a session.
 */
export const auth = new Proxy({} as Auth, {
  get(_target, property, receiver) {
    const instance = getAuth();
    const value = Reflect.get(instance as object, property, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
  has(_target, property) {
    return Reflect.has(getAuth() as object, property);
  },
});

export type AdminRole = "admin" | "editor";
export type AuthSession = Awaited<ReturnType<Auth["api"]["getSession"]>>;
