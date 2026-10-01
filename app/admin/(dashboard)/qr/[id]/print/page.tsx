import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PrintButton } from "@/components/admin/print-button";
import { QrOriginWarning } from "@/components/admin/qr-origin-warning";
import { QrPoster } from "@/components/admin/qr-poster";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getBranding } from "@/db/queries/gardens";
import { getQrPrintData } from "@/db/queries/qr";
import { generateQrDataUrl } from "@/lib/qr/generate";
import { getSiteOrigin, qrTargetPath, qrTargetUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Print QR sign",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paper?: string | string[] }>;
}

export default async function QrPrintPage({ params, searchParams }: PageProps) {
  const [{ id }, query, branding, origin] = await Promise.all([
    params,
    searchParams,
    getBranding(),
    getSiteOrigin(),
  ]);

  const data = await getQrPrintData(id);
  if (!data) notFound();

  const paperParam = Array.isArray(query.paper) ? query.paper[0] : query.paper;
  const paper = paperParam === "letter" ? "letter" : "a4";

  const targetUrl = await qrTargetUrl(data.qr.publicCode);
  // A high-resolution PNG keeps the printed modules crisp at poster size.
  const dataUrl = await generateQrDataUrl(targetUrl, { width: 1024, margin: 4 });

  return (
    <>
      {/*
        Page setup is defined here rather than in globals so the printed sheet
        geometry only affects the poster, never the rest of the admin area.
      */}
      {/* Static, server-built CSS for this page only — no visitor input is interpolated. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `@page { size: ${paper === "letter" ? "letter" : "A4"}; margin: 12mm; }
@media print {
  .print-hidden { display: none !important; }
  body { background: #ffffff !important; }
  .print-sheet { box-shadow: none !important; border: 0 !important; margin: 0 !important; padding: 0 !important; }
}`,
        }}
      />

      <div className="print-hidden mb-5 flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/qr">
            <ArrowLeft aria-hidden="true" />
            Back to QR codes
          </Link>
        </Button>
      </div>

      <QrOriginWarning origin={origin} />

      <Card className="print-hidden mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-heading text-base font-semibold">Printable sign</h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Print at 100% scale — do not let the printer &quot;fit to page&quot;, which shrinks the
              QR modules and makes scanning unreliable. Laminate or mount the sheet so it survives
              the weather, and leave the white margin around the QR square visible.
            </p>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Paper size</dt>
                <dd className="font-medium">{paper === "letter" ? "US Letter" : "A4"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Encoded URL</dt>
                <dd className="font-mono break-all">{targetUrl}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Print URL</dt>
                <dd className="break-all">{origin}{qrTargetPath(data.qr.publicCode)}</dd>
              </div>
            </dl>
          </div>

          <div className="flex flex-wrap gap-2">
            <PrintButton />
            <Button asChild variant="outline" size="sm">
              <a
                href={`/api/qr/${encodeURIComponent(data.qr.publicCode)}/png`}
                download={`${data.qr.publicCode}.png`}
              >
                Download PNG
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a
                href={`/api/qr/${encodeURIComponent(data.qr.publicCode)}/svg`}
                download={`${data.qr.publicCode}.svg`}
              >
                Download SVG
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild variant={paper === "a4" ? "default" : "outline"} size="sm">
            <Link href={`/admin/qr/${id}/print?paper=a4`}>A4</Link>
          </Button>
          <Button asChild variant={paper === "letter" ? "default" : "outline"} size="sm">
            <Link href={`/admin/qr/${id}/print?paper=letter`}>US Letter</Link>
          </Button>
        </div>
      </Card>

      <div className="print-sheet mx-auto w-full max-w-[210mm] rounded-xl border border-border bg-white shadow-soft">
        <QrPoster
          siteTitle={branding.siteTitle}
          locationName={data.locationName}
          publicCode={data.qr.publicCode}
          dataUrl={dataUrl}
          targetUrl={targetUrl}
          shortDescription={data.locationShortDescription}
          icon={data.locationIcon}
          trailName={data.primaryTrailName}
        />
      </div>

      <p className="print-hidden mt-5 text-xs leading-relaxed text-muted-foreground">
        Tip: after printing, scan the sheet with your own phone before mounting it in the garden.
      </p>
    </>
  );
}
