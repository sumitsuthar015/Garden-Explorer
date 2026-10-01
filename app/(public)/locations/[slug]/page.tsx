import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, MapPin } from "lucide-react";

import {
  LearningExperience,
  type ClientTrailContext,
} from "@/components/learning/learning-experience";
import { SectionHeading } from "@/components/public/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { listPublishedBadges } from "@/db/queries/badges";
import { getBranding } from "@/db/queries/gardens";
import {
  getPublishedLocationCategoryIndex,
  getPublishedLocationDetail,
  listPublishedLocationCards,
} from "@/db/queries/locations";
import { listActiveQrCodesForLocation } from "@/db/queries/qr";
import { findTrailContextForLocation, listTrailsForLocation } from "@/db/queries/trails";
import { LOCATION_CATEGORY_LABELS } from "@/lib/constants";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ trail?: string | string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getPublishedLocationDetail(slug);
  if (!detail) return { title: "Place not found" };

  const description =
    detail.shortDescription ||
    `Discover ${detail.name} with a Garden Explorer learning point: cards, an observation activity and a quick quiz.`;

  return {
    title: detail.name,
    description,
    alternates: { canonical: `/locations/${detail.slug}` },
    openGraph: {
      type: "article",
      title: detail.name,
      description,
      images: detail.heroImageUrl ? [{ url: detail.heroImageUrl }] : undefined,
    },
  };
}

export default async function LocationPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const trailOverride = Array.isArray(query.trail) ? query.trail[0] : query.trail;

  const detail = await getPublishedLocationDetail(slug);
  if (!detail) notFound();

  const [trailContext, trailsForLocation, badges, categoryIndex, qrCodes, others, branding] =
    await Promise.all([
      findTrailContextForLocation(detail.id, null),
      listTrailsForLocation(detail.id),
      listPublishedBadges(),
      getPublishedLocationCategoryIndex(),
      listActiveQrCodesForLocation(detail.id),
      listPublishedLocationCards({ limit: 8 }),
      getBranding(),
    ]);

  const effectiveTrail =
    trailOverride && trailsForLocation.some((entry) => entry.slug === trailOverride)
      ? trailContext
      : trailContext;

  const clientTrail: ClientTrailContext | null = effectiveTrail
    ? {
        slug: effectiveTrail.trail.slug,
        name: effectiveTrail.trail.name,
        currentPosition: effectiveTrail.currentPosition,
        totalStops: effectiveTrail.totalStops,
        isLaterStop: effectiveTrail.currentPosition > 1,
        stops: effectiveTrail.stops.map((stop) => ({
          position: stop.position,
          slug: stop.location.slug,
          name: stop.location.name,
          icon: stop.location.icon,
          category: stop.location.category,
          shortDescription: stop.location.shortDescription,
        })),
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

  const recommended = others.find((candidate) => candidate.slug !== detail.slug) ?? null;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative aspect-[16/9] w-full overflow-hidden bg-accent sm:aspect-[21/9]">
        {detail.heroImageUrl ? (
          <Image
            src={detail.heroImageUrl}
            alt={detail.heroImageAlt ?? detail.name}
            fill
            sizes="100vw"
            className="object-cover"
            preload
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex h-full w-full items-center justify-center bg-gradient-to-br from-accent to-[#d7e8d9] text-7xl"
          >
            {detail.icon ?? "🌿"}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
        <div className="container-page absolute inset-x-0 bottom-0 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="soft">{LOCATION_CATEGORY_LABELS[detail.category]}</Badge>
            <Badge variant="outline" className="border-white/40 bg-black/25 text-white">
              <Clock className="size-3" aria-hidden="true" />
              about {detail.estimatedMinutes} min
            </Badge>
            {clientTrail ? (
              <Badge variant="default">
                Stop {clientTrail.currentPosition} of {clientTrail.totalStops}
              </Badge>
            ) : null}
          </div>
          <h1 className="mt-3 font-heading text-3xl leading-tight font-extrabold text-white text-balance sm:text-4xl lg:text-5xl">
            {detail.name}
          </h1>
        </div>
      </section>

      <div className="container-page flex flex-col gap-8 py-8 sm:py-10">
        <SectionHeading
          as="h2"
          title={`About ${detail.name}`}
          description={detail.shortDescription || "A learning point in the garden."}
        />

        {clientTrail ? (
          <Card className="flex flex-col gap-3 border-primary/25 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">
                Part of a trail
              </p>
              <p className="mt-1 font-heading font-semibold">
                {clientTrail.name} · stop {clientTrail.currentPosition} of {clientTrail.totalStops}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                You are at this stop right now. Follow the trail to see every place in order.
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link href={`/trails/${clientTrail.slug}`}>
                View trail
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </Card>
        ) : null}

        {/* The interactive learning experience: cards, activities, quiz,
            completion and the written directions to the next place. */}
        <LearningExperience
          location={detail}
          trail={clientTrail}
          otherTrails={trailsForLocation
            .filter((entry) => entry.slug !== clientTrail?.slug)
            .map((entry) => ({
              slug: entry.slug,
              name: entry.name,
              stopCount: entry.stopCount,
              position: entry.position,
            }))}
          badges={badges}
          locationCategories={categoryIndex}
          recommendedNext={
            recommended
              ? {
                  position: 0,
                  slug: recommended.slug,
                  name: recommended.name,
                  icon: recommended.icon,
                  category: recommended.category,
                  shortDescription: recommended.shortDescription,
                }
              : null
          }
        />

        {/* Visiting on site */}
        <Card className="p-5 sm:p-6">
          <h2 className="font-heading text-lg font-semibold">Visiting {branding.gardenName}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Look for this sign in the garden. Scanning it opens this page with your progress already
            in place — the same content you can read here.
          </p>

          {qrCodes.length > 0 ? (
            <ul className="mt-4 flex flex-wrap gap-2">
              {qrCodes.map((qr) => (
                <li key={qr.publicCode}>
                  <Badge variant="outline" className="font-mono">
                    /q/{qr.publicCode}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              No QR sign has been linked to this place yet.
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild variant="warm" size="sm">
              <Link href="/scan">Scan a QR Code</Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/explore">
                <MapPin aria-hidden="true" />
                All garden places
              </Link>
            </Button>
          </div>
        </Card>

        {others.filter((candidate) => candidate.slug !== detail.slug).length > 0 ? (
          <section>
            <SectionHeading
              title="Other places nearby"
              description="Once you have finished here, these are the next learning points to look for."
            />
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {others
                .filter((candidate) => candidate.slug !== detail.slug)
                .slice(0, 3)
                .map((candidate) => (
                  <li key={candidate.id}>
                    <Link
                      href={`/locations/${candidate.slug}`}
                      className="flex h-full items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
                    >
                      <span aria-hidden="true" className="text-2xl leading-none">
                        {candidate.icon ?? "🌿"}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-heading text-sm font-semibold">
                          {candidate.name}
                        </span>
                        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                          {candidate.shortDescription}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

// Pages are rendered on demand (`dynamic = "force-dynamic"`) because content is
// edited in the admin CMS and must be visible to visitors immediately.
