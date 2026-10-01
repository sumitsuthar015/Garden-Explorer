import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, ShieldCheck } from "lucide-react";

import { AdminPasswordForm } from "@/components/admin/admin-password-form";
import { SettingsForm } from "@/components/admin/settings-form";
import { AdminPageHeader } from "@/components/admin/stat-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listAuditLogs } from "@/db/queries/audit";
import { ensurePrimaryGarden, getSiteSettings } from "@/db/queries/gardens";
import { listTrailOptions } from "@/db/queries/trails";
import { isCloudinaryConfigured } from "@/lib/cloudinary";
import { requireAdmin } from "@/lib/permissions";
import { getSiteOrigin } from "@/lib/site-url";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  const garden = await ensurePrimaryGarden();
  const [settings, auditTrail, trails, origin] = await Promise.all([
    getSiteSettings(garden.id),
    listAuditLogs({ page: 1, pageSize: 12 }),
    listTrailOptions(garden.id),
    getSiteOrigin(),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Settings"
        description="Branding, contact details and SEO copy for your garden. Saving here republishes the public site immediately."
      />

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <SettingsForm
          defaultValues={{
            name: garden.name,
            description: garden.description,
            siteTitle: settings?.siteTitle ?? garden.name,
            seoDescription: settings?.seoDescription ?? "",
            primaryColor: settings?.primaryColor ?? "#2F6B4F",
            logoUrl: garden.logoUrl ?? "",
            logoPublicId: garden.logoPublicId ?? "",
            faviconUrl: settings?.faviconUrl ?? "",
            faviconPublicId: settings?.faviconPublicId ?? "",
            contactEmail: settings?.contactEmail ?? "",
            contactPhone: settings?.contactPhone ?? "",
            contactAddress: settings?.contactAddress ?? "",
            defaultTrailId: settings?.defaultTrailId ?? "",
            analyticsEnabled: settings?.analyticsEnabled ?? true,
            privacyNotes: settings?.privacyNotes ?? "",
          }}
          trails={trails.map((trail) => ({
            id: trail.id,
            name: trail.name,
            status: trail.status,
          }))}
        />

        <div className="flex flex-col gap-5">
          <AdminPasswordForm />

          <Card className="p-5">
            <h2 className="font-heading text-base font-semibold">This deployment</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Secrets are never displayed — only whether each integration is configured.
            </p>
            <dl className="mt-4 flex flex-col gap-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-muted-foreground">Public site URL</dt>
                <dd className="font-mono text-xs break-all">{origin}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Media uploads (Cloudinary)</dt>
                <dd className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck
                    className={
                      isCloudinaryConfigured() ? "size-4 text-success" : "size-4 text-warning"
                    }
                    aria-hidden="true"
                  />
                  {isCloudinaryConfigured() ? "Configured" : "Not configured"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Signed in as</dt>
                <dd className="font-medium wrap-anywhere">
                  {admin.email} ({admin.role})
                </dd>
              </div>
            </dl>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
                Open the public site
              </Link>
            </Button>
          </Card>

          <Card className="p-5">
            <h2 className="font-heading text-base font-semibold">Recent admin activity</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Who changed what, and when. Passwords and secrets are never logged.
            </p>

            {auditTrail.rows.length === 0 ? (
              <EmptyState
                className="mt-4 border-0 py-6"
                icon={<ShieldCheck className="size-5" aria-hidden="true" />}
                title="No activity recorded yet"
                description="Changes you make will appear here."
              />
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {auditTrail.rows.map((entry) => (
                  <li key={entry.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <p className="text-sm font-medium">
                      {entry.action.replaceAll("_", " ").toLowerCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.entityLabel ? `${entry.entityLabel} · ` : ""}
                      {entry.adminEmail ?? "system"} · {formatDateTime(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
