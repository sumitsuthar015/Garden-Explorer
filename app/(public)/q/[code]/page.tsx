import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  LearningExperience,
  type ClientTrailContext,
  type ClientTrailStop,
} from "@/components/learning/learning-experience";
import { QrStatusScreen } from "@/components/qr/qr-status-screen";
import { ScanRecorder } from "@/components/qr/scan-recorder";
import { Button } from "@/components/ui/button";
import { listPublishedBadges } from "@/db/queries/badges";
import { getBranding } from "@/db/queries/gardens";
import {
  getPublishedLocationCategoryIndex,
  getPublishedLocationDetail,
  listPublishedLocationCards,
  type PublicLocationDetail,
} from "@/db/queries/locations";
import { resolveQrCode } from "@/db/queries/qr";
import { findTrailContextForLocation, listTrailsForLocation } from "@/db/queries/trails";
import { logServerEvent } from "@/lib/errors";
import type { BadgeDefinition } from "@/lib/badges";
import { qrLookupSchema } from "@/lib/validation";

/**
 * The most important route in the product: /q/BUTTERFLY-003
 *
 * Order of operations (matching the product spec):
 *  1. validate the code FORMAT before any database access
 *  2. look up the active QR code
 *  3. identify the linked location and its publication state
 *  4. apply the QR's primary trail as context when one is configured
 *  5. record the scan (client-side, exactly once)
 *  6. load published content
 *  7. determine the next place
 *  8. render the learning experience
 *
 * Database errors are never surfaced: the visitor sees the friendly retry
 * screen instead, and the real cause is written to the server log. All data
 * loading happens before any JSX is built, so a database failure can never be
 * mistaken for a rendering failure.
 */

export const dynamic = "force-dynamic";

interface PageParams {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ trail?: string | string[] }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const parsed = qrLookupSchema.safeParse({ code: decodeURIComponent(code) });
  if (!parsed.success) {
    return { title: "QR code not recognised", robots: { index: false, follow: false } };
  }

  const resolution = await resolveQrCode(parsed.data.code);
  if (resolution.status !== "ok") {
    return { title: "Learning point", robots: { index: false, follow: false } };
  }

  return {
    title: resolution.location.name,
    description:
      resolution.location.shortDescription ||
      `A Garden Explorer learning point: ${resolution.location.name}.`,
    alternates: { canonical: `/locations/${resolution.location.slug}` },
    // The canonical location page is the indexable one; QR links are not.
    robots: { index: false, follow: true },
  };
}

/* ------------------------------------------------------------------ *
 * Data loading — no JSX below the fold of this section
 * ------------------------------------------------------------------ */

type QrView =
  | { kind: "not_found" }
  | { kind: "inactive"; locationName: string | null }
  | { kind: "location_unavailable"; locationName: string | null }
  | { kind: "error" }
  | {
      kind: "ready";
      detail: PublicLocationDetail;
      trail: ClientTrailContext | null;
      otherTrails: { slug: string; name: string; stopCount: number; position: number }[];
      badges: BadgeDefinition[];
      categoryIndex: Record<string, string>;
      recommendedNext: ClientTrailStop | null;
      gardenName: string;
    };

async function loadQrView(publicCode: string, trailOverride: string | undefined): Promise<QrView> {
  try {
    const resolution = await resolveQrCode(publicCode);

    if (resolution.status === "not_found") return { kind: "not_found" };
    if (resolution.status === "inactive") {
      return { kind: "inactive", locationName: resolution.locationName };
    }
    if (resolution.status === "location_unavailable") {
      return { kind: "location_unavailable", locationName: resolution.locationName };
    }

    const { location, primaryTrail } = resolution;

    const [detail, trailContext, trailsForLocation, badges, categoryIndex, branding] =
      await Promise.all([
        getPublishedLocationDetail(location.slug),
        findTrailContextForLocation(location.id, primaryTrail?.id ?? null),
        listTrailsForLocation(location.id),
        listPublishedBadges(),
        getPublishedLocationCategoryIndex(),
        getBranding(),
      ]);

    if (!detail) {
      return { kind: "location_unavailable", locationName: location.name };
    }

    // A `?trail=` override lets a location page say "follow this trail instead".
    const preferredTrail = trailOverride
      ? trailsForLocation.find((entry) => entry.slug === trailOverride)
      : undefined;

    const effectiveTrail = preferredTrail
      ? await findTrailContextForLocation(location.id, null)
      : trailContext;

    const clientTrail: ClientTrailContext | null = effectiveTrail
      ? {
          slug: effectiveTrail.trail.slug,
          name: effectiveTrail.trail.name,
          currentPosition: effectiveTrail.currentPosition,
          totalStops: effectiveTrail.totalStops,
          // Out-of-order scans are never blocked — the arrival screen simply
          // explains that this is a later stop when that happens.
          isLaterStop: effectiveTrail.currentPosition > 1,
          stops: effectiveTrail.stops.map(toStop),
          previousPlace: effectiveTrail.previousStop
            ? {
                slug: effectiveTrail.previousStop.location.slug,
                name: effectiveTrail.previousStop.location.name,
                position: effectiveTrail.previousStop.position,
              }
            : null,
          nextPlace: effectiveTrail.nextStop
            ? {
                position: effectiveTrail.nextStop.position,
                name: effectiveTrail.nextStop.location.name,
                slug: effectiveTrail.nextStop.location.slug,
                icon: effectiveTrail.nextStop.location.icon,
                shortDescription: effectiveTrail.nextStop.location.shortDescription,
                instruction: effectiveTrail.nextStop.instruction,
              }
            : null,
        }
      : null;

    const recommendedNext = clientTrail
      ? null
      : await findFreeRoamSuggestion(location.slug, location.category);

    return {
      kind: "ready",
      detail,
      trail: clientTrail,
      otherTrails: trailsForLocation
        .filter((entry) => entry.slug !== clientTrail?.slug)
        .map((entry) => ({
          slug: entry.slug,
          name: entry.name,
          stopCount: entry.stopCount,
          position: entry.position,
        })),
      badges,
      categoryIndex,
      recommendedNext,
      gardenName: branding.gardenName,
    };
  } catch (error) {
    // Never expose database errors — log the real cause server-side instead.
    logServerEvent("error", "QR_RESOLUTION_FAILED", {
      publicCode,
      detail: error instanceof Error ? error.message : "unknown",
    });
    return { kind: "error" };
  }
}

/* ------------------------------------------------------------------ *
 * Route
 * ------------------------------------------------------------------ */

export default async function QrLearningPage({ params, searchParams }: PageParams) {
  const [{ code }, query] = await Promise.all([params, searchParams]);

  // 1. Format validation first — a hostile path segment never reaches the DB,
  //    and gets the same 404 as an unknown code so it learns nothing.
  const decoded = decodeURIComponent(code);
  const parsed = qrLookupSchema.safeParse({ code: decoded });

  if (!parsed.success) notFound();

  const publicCode = parsed.data.code;
  const rawTrail = Array.isArray(query.trail) ? query.trail[0] : query.trail;
  const trailOverride = rawTrail?.trim().slice(0, 80) || undefined;

  const view = await loadQrView(publicCode, trailOverride);

  if (view.kind === "not_found") notFound();

  if (view.kind === "inactive") {
    return (
      <QrStatusScreen
        problem="inactive"
        locationName={view.locationName ?? undefined}
        scannedCode={publicCode}
      />
    );
  }

  if (view.kind === "location_unavailable") {
    return (
      <QrStatusScreen
        problem="location_unavailable"
        locationName={view.locationName ?? undefined}
        scannedCode={publicCode}
      />
    );
  }

  if (view.kind === "error") {
    return <QrStatusScreen problem="error" scannedCode={publicCode} />;
  }

  return (
    <div className="container-page py-6 sm:py-10">
      <ScanRecorder publicCode={publicCode} trailSlug={view.trail?.slug ?? null} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-primary uppercase">
          <span aria-hidden="true">📍</span>
          {view.gardenName}
          {view.trail ? ` · ${view.trail.name}` : ""}
        </p>
        <Button asChild variant="ghost" size="sm">
          <Link href="/scan">Scan another sign</Link>
        </Button>
      </div>

      <LearningExperience
        location={view.detail}
        trail={view.trail}
        otherTrails={view.otherTrails}
        badges={view.badges}
        locationCategories={view.categoryIndex}
        recommendedNext={view.recommendedNext}
        viaCode={publicCode}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function toStop(stop: {
  position: number;
  location: {
    slug: string;
    name: string;
    icon: string | null;
    category: string;
    shortDescription: string;
  };
}): ClientTrailStop {
  return {
    position: stop.position,
    slug: stop.location.slug,
    name: stop.location.name,
    icon: stop.location.icon,
    category: stop.location.category,
    shortDescription: stop.location.shortDescription,
  };
}

/** Free-roam suggestion: a nearby published place in the same category. */
async function findFreeRoamSuggestion(
  currentSlug: string,
  category: string,
): Promise<ClientTrailStop | null> {
  const candidates = await listPublishedLocationCards({ limit: 40 });

  const sameCategory = candidates.find(
    (candidate) => candidate.slug !== currentSlug && candidate.category === category,
  );
  const anyOther = candidates.find((candidate) => candidate.slug !== currentSlug);
  const chosen = sameCategory ?? anyOther;

  if (!chosen) return null;

  return {
    position: 0,
    slug: chosen.slug,
    name: chosen.name,
    icon: chosen.icon,
    category: chosen.category,
    shortDescription: chosen.shortDescription,
  };
}
