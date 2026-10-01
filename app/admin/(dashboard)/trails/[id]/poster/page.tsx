import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";

import { PrintButton } from "@/components/admin/print-button";
import { QrOriginWarning } from "@/components/admin/qr-origin-warning";
import { TrailPoster } from "@/components/admin/trail-poster";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getBranding } from "@/db/queries/gardens";
import { getTrailDetailForAdmin } from "@/db/queries/trails";
import { AGE_GROUP_LABELS } from "@/lib/constants";
import { generateQrDataUrl } from "@/lib/qr/generate";
import { absoluteUrl, getSiteOrigin } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Print trail poster",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * A "start here" poster for a trail. Its QR opens the trail's adventure map, so
 * one sign at the gate lets a family pick the trail and see every stop.
 */
export default async function TrailPosterPage({ params }: PageProps) {
  const { id } = await params;
  const [detail, branding, origin] = await Promise.all([
    getTrailDetailForAdmin(id),
    getBranding(),
    getSiteOrigin(),
  ]);
  if (!detail) notFound();

  const { trail, stops } = detail;
  const targetUrl = await absoluteUrl(`/trails/${trail.slug}`);
  const dataUrl = await generateQrDataUrl(targetUrl, { width: 1024, margin: 4 });

  return (
    <>
      {/* Static, server-built print CSS — no visitor input is interpolated. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@page { size: A4; margin: 12mm; }
@media print {
  .print-hidden { display: none !important; }
  body { background: #ffffff !important; }
  .print-sheet { box-shadow: none !important; border: 0 !important; margin: 0 !important; padding: 0 !important; }
}`,
        }}
      />

      <div className="print-hidden mb-5 flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/trails/${trail.id}`}>
            <ArrowLeft aria-hidden="true" />
            Back to {trail.name}
          </Link>
        </Button>
        <PrintButton label="Print poster" />
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/qr/sheet?trail=${trail.id}`}>Print this trail&apos;s stop signs</Link>
        </Button>
      </div>

      <QrOriginWarning origin={origin} />

      {trail.status !== "published" ? (
        <Alert variant="warning" className="print-hidden mb-5">
          <TriangleAlert aria-hidden="true" />
          <div>
            <AlertTitle>This trail is not published yet</AlertTitle>
            <AlertDescription>
              Visitors who scan this poster will see &quot;not found&quot; until you publish the
              trail from its page.
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      <Card className="print-hidden mb-5 p-5">
        <h2 className="font-heading text-base font-semibold">Trail start poster</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Put this at the garden gate or wherever the trail begins. Scanning it opens the trail&apos;s
          adventure map with every stop and its clue; each stop then has its own sign. Print at 100%
          scale on A4.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Encoded URL: <span className="font-mono break-all">{targetUrl}</span>
        </p>
      </Card>

      <div className="print-sheet mx-auto w-full max-w-[210mm]">
        <TrailPoster
          siteTitle={branding.siteTitle}
          gardenName={branding.gardenName}
          trailName={trail.name}
          icon={trail.icon}
          description={trail.description}
          stops={stops.map((stop) => ({ position: stop.position, name: stop.locationName }))}
          minutes={trail.estimatedMinutes}
          ageLabel={AGE_GROUP_LABELS[trail.ageGroup]}
          dataUrl={dataUrl}
          targetUrl={targetUrl}
        />
      </div>

      <p className="print-hidden mt-5 text-xs leading-relaxed text-muted-foreground">
        Tip: after printing, scan the sheet with your own phone before mounting it in the garden.
      </p>
    </>
  );
}
