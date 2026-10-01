import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ChevronLeft, ExternalLink, Flag, Printer, QrCode } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { TrailBuilder } from "@/components/admin/trail-builder";
import { TrailForm } from "@/components/admin/trail-form";
import { TrailStatusControls } from "@/components/admin/trail-status-controls";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ensurePrimaryGarden } from "@/db/queries/gardens";
import { getPublishedLocationIdSet, listLocationOptions } from "@/db/queries/locations";
import { getTrailDetailForAdmin, getTrailStopsForValidation } from "@/db/queries/trails";
import { validateTrailForPublishing } from "@/lib/validation/trail";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getTrailDetailForAdmin(id);
  return {
    title: detail ? detail.trail.name : "Trail",
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminTrailDetailPage({ params }: PageProps) {
  const { id } = await params;

  const detail = await getTrailDetailForAdmin(id);
  if (!detail) notFound();

  const garden = await ensurePrimaryGarden();
  const [locations, stops, publishedLocationIds] = await Promise.all([
    listLocationOptions(garden.id),
    getTrailStopsForValidation(id),
    getPublishedLocationIdSet(detail.trail.gardenId),
  ]);

  // The same rules the publish action enforces, shown before the click so the
  // admin is never surprised by a rejection.
  const problems = validateTrailForPublishing(detail.trail, stops, publishedLocationIds);

  return (
    <>
      <AdminPageHeader
        title={detail.trail.name}
        description={`${detail.stops.length} stop${detail.stops.length === 1 ? "" : "s"} · /trails/${detail.trail.slug} · ${detail.trail.estimatedMinutes} minutes`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/trails">
                <ChevronLeft aria-hidden="true" />
                All trails
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/trails/${detail.trail.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
                View on site
              </Link>
            </Button>
            <TrailStatusControls
              id={detail.trail.id}
              name={detail.trail.name}
              status={detail.trail.status}
            />
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <StatusBadge status={detail.trail.status} />
        {detail.trail.status !== "published" && problems.length === 0 ? (
          <span className="text-sm text-success">
            Ready to publish — press “Publish trail”.
          </span>
        ) : null}
        {detail.qrCodesUsingAsPrimary.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <QrCode className="size-4" aria-hidden="true" />
            {detail.qrCodesUsingAsPrimary.length} QR sign
            {detail.qrCodesUsingAsPrimary.length === 1 ? "" : "s"} start visitors on this trail
          </span>
        ) : null}
      </div>

      {problems.length > 0 ? (
        <Alert variant="warning" className="mb-5">
          <AlertCircle aria-hidden="true" />
          <div>
            <AlertTitle>Not ready to publish</AlertTitle>
            <AlertDescription>
              <ul className="flex list-disc flex-col gap-1 pl-4">
                {problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </AlertDescription>
          </div>
        </Alert>
      ) : null}

      <Tabs defaultValue="stops">
        <TabsList>
          <TabsTrigger value="stops">Stops &amp; directions</TabsTrigger>
          <TabsTrigger value="details">Trail details</TabsTrigger>
        </TabsList>

        <TabsContent value="stops" className="mt-5">
          <TrailBuilder
            trailId={detail.trail.id}
            trailName={detail.trail.name}
            initialStops={detail.stops.map((stop) => ({
              key: `stop-${stop.position}-${stop.locationId}`,
              locationId: stop.locationId,
              instructionToNext: stop.instructionToNext,
            }))}
            locations={locations.map((location) => ({
              id: location.id,
              name: location.name,
              slug: location.slug,
              status: location.status,
              category: location.category,
            }))}
          />
        </TabsContent>

        <TabsContent value="details" className="mt-5">
          <TrailForm
            mode="edit"
            defaultValues={{
              id: detail.trail.id,
              name: detail.trail.name,
              slug: detail.trail.slug,
              description: detail.trail.description,
              goals: detail.trail.goals,
              difficulty: detail.trail.difficulty,
              ageGroup: detail.trail.ageGroup,
              estimatedMinutes: detail.trail.estimatedMinutes,
              coverImageUrl: detail.trail.coverImageUrl ?? "",
              coverImagePublicId: detail.trail.coverImagePublicId ?? "",
              coverImageAlt: detail.trail.coverImageAlt ?? "",
              icon: detail.trail.icon ?? "",
              themeColor: detail.trail.themeColor ?? "",
              status: detail.trail.status,
              displayOrder: detail.trail.displayOrder,
            }}
          />
        </TabsContent>
      </Tabs>

      <Card className="mt-5 p-5">
        <h2 className="font-heading text-sm font-semibold">QR signs for this trail</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Put the <strong>trail start poster</strong> at the garden gate — scanning it opens this
          trail&apos;s adventure map. Then put each stop&apos;s own sign at that place. Changing the
          words on this trail never changes a printed code.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link href={`/admin/trails/${detail.trail.id}/poster`}>
              <Flag aria-hidden="true" />
              Print trail start poster
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/qr/sheet?trail=${detail.trail.id}`}>
              <Printer aria-hidden="true" />
              Print this trail&apos;s stop signs
            </Link>
          </Button>
        </div>
        <p className="mt-4 text-xs font-medium text-muted-foreground">Stops (open a place to edit its content):</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {detail.stops.length === 0 ? (
            <span className="text-sm text-muted-foreground">
              Add stops first, then create a QR sign for those places.
            </span>
          ) : (
            detail.stops.map((stop) => (
              <Button key={stop.id} asChild variant="outline" size="sm">
                <Link href={`/admin/locations/${stop.locationId}`}>
                  {stop.position}. {stop.locationName}
                </Link>
              </Button>
            ))
          )}
        </div>
        <Button asChild variant="ghost" size="sm" className="mt-3">
          <Link href="/admin/qr">
            <QrCode aria-hidden="true" />
            Manage QR codes
          </Link>
        </Button>
      </Card>
    </>
  );
}
