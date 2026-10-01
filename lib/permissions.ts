import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/auth";
import { AppError, logServerEvent } from "@/lib/errors";

/**
 * Admin authorization — the *second* layer.
 *
 * Layer 1 is route protection in `proxy.ts` / the admin layout (redirect to
 * /admin/login). Layer 2 is this module: EVERY admin server action and route
 * handler calls `requireAdmin()` before touching the database. Hiding a route
 * from navigation is never treated as security.
 */

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor";
}

/** Deduped per-request so a page with many actions reads the session once. */
export const getAdminSession = cache(async () => {
  try {
    const result = await auth.api.getSession({ headers: await headers() });
    if (!result?.user) return null;

    const role = (result.user as { role?: string }).role;
    if (role !== "admin" && role !== "editor") return null;

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role,
      } satisfies AdminUser,
      sessionId: result.session.id,
      expiresAt: result.session.expiresAt,
    };
  } catch (error) {
    // Next.js signals (e.g. "this route is dynamic" from `headers()` during a
    // build) are control flow, not auth failures — let them through.
    unstable_rethrow(error);
    // A missing/misconfigured auth secret must not surface to visitors.
    logServerEvent("error", "AUTH_FAILED", {
      detail: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
});

/** Throws FORBIDDEN when the caller is not a signed-in admin. */
export async function requireAdmin(): Promise<AdminUser> {
  const session = await getAdminSession();
  if (!session) {
    throw new AppError("FORBIDDEN", { logCode: "ADMIN_PERMISSION_DENIED" });
  }
  return session.user;
}

/**
 * Narrow a role to the destructive capabilities.
 * `editor` may manage content but not delete locations/trails, change settings,
 * or regenerate QR public codes.
 */
const EDITOR_FORBIDDEN_ACTIONS = new Set([
  "location.delete",
  "trail.delete",
  "quiz.delete",
  "qr.regenerate",
  "qr.delete",
  "badge.delete",
  "settings.update",
  "media.delete",
]);

export async function requireAdminPermission(action: string): Promise<AdminUser> {
  const admin = await requireAdmin();

  if (admin.role === "editor" && EDITOR_FORBIDDEN_ACTIONS.has(action)) {
    logServerEvent("warn", "ADMIN_PERMISSION_DENIED", {
      action,
      adminUserId: admin.id,
      role: admin.role,
    });
    throw new AppError("FORBIDDEN", { logCode: "ADMIN_PERMISSION_DENIED" });
  }

  return admin;
}

/** True when the signed-in user may perform `action` — used to hide admin UI. */
export function canPerform(role: AdminUser["role"], action: string): boolean {
  if (role === "admin") return true;
  return !EDITOR_FORBIDDEN_ACTIONS.has(action);
}
