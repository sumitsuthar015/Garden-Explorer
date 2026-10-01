import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { inspectServerEnv } from "@/lib/env";
import { getAdminSession } from "@/lib/permissions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { TriangleAlert } from "lucide-react";

/**
 * Layer 1 of admin authorization: every route inside this group requires a
 * signed-in admin or editor. Anonymous requests are redirected to the login
 * page with a return path, and the session is read on the server — hiding links
 * in the UI is never treated as protection.
 *
 * Layer 2 lives in each server action (`requireAdminPermission`).
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const env = inspectServerEnv();

  return (
    <AdminShell
      user={{ name: session.user.name, email: session.user.email, role: session.user.role }}
    >
      {!env.ok ? (
        <Alert variant="warning" className="mb-5">
          <TriangleAlert aria-hidden="true" />
          <div>
            <AlertTitle>Some configuration is missing</AlertTitle>
            <AlertDescription>
              <span className="block">
                These environment variables are missing or invalid:{" "}
                <span className="font-mono text-xs">{env.missing.join(", ")}</span>
              </span>
              <span className="mt-1 block">
                Features that depend on them are disabled rather than failing silently. Add the values
                in your environment and restart.
              </span>
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      {!env.cloudinaryConfigured ? (
        <Alert variant="info" className="mb-5">
          <TriangleAlert aria-hidden="true" />
          <div>
            <AlertTitle>Media uploads are not configured</AlertTitle>
            <AlertDescription>
              Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to enable image
              uploads. Everything else in the admin area works without them.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      {children}
    </AdminShell>
  );
}
