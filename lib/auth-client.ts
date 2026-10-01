"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Browser auth client used only by the /admin area.
 * No visitor-facing code imports this, so public pages ship zero auth JS.
 */
export const authClient = createAuthClient({
  basePath: "/api/auth",
});

export const { signIn, signOut, useSession, changePassword } = authClient;
