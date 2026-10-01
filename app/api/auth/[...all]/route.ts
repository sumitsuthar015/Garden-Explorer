import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth";

/**
 * Better Auth catch-all handler (/api/auth/*).
 * Server-side only: no secrets are exposed through this route.
 */
export const { GET, POST } = toNextJsHandler(auth);

/** Auth endpoints must never be indexed or cached. */
export const dynamic = "force-dynamic";
export const revalidate = 0;
