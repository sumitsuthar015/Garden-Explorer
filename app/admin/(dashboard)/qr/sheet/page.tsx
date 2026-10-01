import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Flag } from "lucide-react";

import { PrintButton } from "@/components/admin/print-button";
import { QrOriginWarning } from "@/components/admin/qr-origin-warning";
import { QrPoster } from "@/components/admin/qr-poster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ensurePrimaryGarden, getBranding } from "@/db/queries/gardens";
import { listQrCodesForPosterSheet } from "@/db/queries/qr";
import { getTrailDetailForAdmin } from "@/db/queries/trails";
import { generateQrDataUrl } from "@/lib/qr/generate";
import { getSiteOrigin, qrTargetUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Print QR signs",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ trail?: string | string[] }>;
}

/**
 * Batch poster sheet.
 *
 * Generates a page per active sign in a grid — every sign in the garden, or
 * with `?trail=<id>` only that trail's signs in walking order. QR images are
 * produced server-side so the browser prints them at full fidelity.
 */
export default async function QrSheetPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const trailId = (Array.isArray(query.trail) ? query.trail[0] : query.trail) ?? "";

  const [branding, garden, origin] = await Promise.all([
    getBranding(),
    ensurePrimaryGarden(),
    getSiteOrigin(),
  ]);
  const [allRows, trail] = await Promise.all([
    listQrCodesForPosterSheet(garden.id),
    trailId ? getTrailDetailForAdmin(trailId) : Promise.resolve(null),
  ]);

  // Only rows whose location is published make sense on a physical sign.
  let rows = allRows.filter((row) => row.locationStatus === "published");
  if (trail) {
    const order = new Map(trail.stops.map((stop) => [stop.locationId, stop.position]));
    rows = rows
      .filter((row) => order.has(row.locationId))
      .sort((a, b) => (order.get(a.locationId) ?? 0) - (order.get(b.locationId) ?? 0));
  }

  return (
    <>
      {/* Static, server-built print CSS — no visitor input is interpolated. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@page { size: A4; margin: 10mm; }
@media print {
  .print-hidden { display: none !important; }
  body { background: #ffffff !important; }
  .sheet-grid { gap: 6mm !important; }
  .sheet-page { break-after: page; }
}`,
        }}
      />

      <div className="print-hidden mb-5 flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={trail ? `/admin/trails/${trail.trail.id}` : "/admin/qr"}>
            <ArrowLeft aria-hidden="true" />
            {trail ? `Back to ${trail.trail.name}` : "Back to QR codes"}
          </Link>
        </Button>
        <PrintButton label={trail ? "Print this trail's signs" : "Print all signs"} />
        {trail ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/trails/${trail.trail.id}/poster`}>
              <Flag aria-hidden="true" />
              Trail start poster
            </Link>
          </Button>
        ) : null}
      </div>

      <QrOriginWarning origin={origin} />

      <Card className="print-hidden mb-5 p-5">
        <h2 className="font-heading text-base font-semibold">
          {trail ? `Signs for ${trail.trail.name}, in walking order` : "Print every active sign"}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {rows.length} active sign{rows.length === 1 ? "" : "s"} will be printed two to a page.
          Print at 100% scale. Disabled QR codes are excluded automatically.
          {trail && rows.length < trail.stops.length
            ? ` ${trail.stops.length - rows.length} stop${trail.stops.length - rows.length === 1 ? " has" : "s have"} no active QR code yet — create one on the QR codes page.`
            : ""}
        </p>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          title="No active QR codes to print"
          description="Create a QR code for a garden place and it will appear here, ready to print."
          action={
            <Button asChild>
              <Link href="/admin/qr">Back to QR codes</Link>
            </Button>
          }
        />
      ) : (
        <div className="sheet-grid grid grid-cols-1 gap-6 lg:grid-cols-2">
          {await Promise.all(
            rows.map(async (row) => {
              const targetUrl = await qrTargetUrl(row.publicCode);
              const dataUrl = await generateQrDataUrl(targetUrl, { width: 600, margin: 4 });
              return (
                <div key={row.id} className="break-inside-avoid" style={{ breakInside: "avoid" }}>
                  <QrPoster
                    variant="sheet"
                    siteTitle={branding.siteTitle}
                    locationName={row.locationName ?? row.publicCode}
                    publicCode={row.publicCode}
                    icon={row.locationIcon}
                    dataUrl={dataUrl}
                    targetUrl={targetUrl}
                  />
                </div>
              );
            }),
          )}
        </div>
      )}
    </>
  );
}
