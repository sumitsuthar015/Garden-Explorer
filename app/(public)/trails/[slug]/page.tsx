import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Clock, Footprints, MapPin, Target } from "lucide-react";

import { SectionHeading } from "@/components/public/section-heading";
import { AdventureMap } from "@/components/trail/adventure-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getBranding } from "@/db/queries/gardens";
import { getPublishedTrailDetail, listPublishedTrails } from "@/db/queries/trails";
import {
  AGE_GROUP_LABELS,
  LOCATION_CATEGORY_ICONS,
  LOCATION_CATEGORY_LABELS,
  TRAIL_DIFFICULTY_LABELS,
} from "@/lib/constants";
import { trailGradient } from "@/lib/subjects";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const trail = await getPublishedTrailDetail(slug);
  if (!trail) return { title: "Trail not found" };

  const description =
    trail.description ||
    `A ${trail.stops.length}-stop learning trail with activities and quizzes: ${trail.name}.`;

  return {
    title: trail.name,
    description,
    alternates: { canonical: `/trails/${trail.slug}` },
    openGraph: {
      type: "article",
      title: trail.name,
      description,
      images: trail.coverImageUrl ? [{ url: trail.coverImageUrl }] : undefined,
    },
  };
}

export default async function TrailPage({ params }: PageProps) {
  const { slug } = await params;
  const [trail, allTrails, branding] = await Promise.all([
    getPublishedTrailDetail(slug),
    listPublishedTrails(),
    getBranding(),
  ]);

  if (!trail) notFound();

  const firstStop = trail.stops[0];
  const otherTrails = allTrails.filter((entry) => entry.slug !== trail.slug).slice(0, 3);

  return (
    <div className="flex flex-col">
      <section className="relative aspect-[16/9] w-full overflow-hidden bg-accent sm:aspect-[21/9]">
        {trail.coverImageUrl ? (
          <Image
            src={trail.coverImageUrl}
            alt={trail.coverImageAlt ?? trail.name}
            fill
            sizes="100vw"
            className="object-cover"
            preload
          />
        ) : (
          <div
            aria-hidden="true"
            className={cn(
              "relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br",
              trailGradient(trail.slug),
            )}
          >
            <span className="dot-grid absolute inset-0 opacity-60" />
            <span className="sun-rays absolute size-[44rem] animate-rays rounded-full" />
            <span className="relative -mt-10 animate-bob text-8xl drop-shadow sm:text-9xl">
              {trail.icon ?? "🥾"}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-transparent" />
        <div className="container-page absolute inset-x-0 bottom-0 pb-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="soft">{TRAIL_DIFFICULTY_LABELS[trail.difficulty]}</Badge>
            <Badge variant="outline" className="border-white/40 bg-black/25 text-white">
              {AGE_GROUP_LABELS[trail.ageGroup]}
            </Badge>
            <Badge variant="outline" className="border-white/40 bg-black/25 text-white">
              <Footprints className="size-3" aria-hidden="true" />
              {trail.stops.length} stops
            </Badge>
          </div>
          <h1 className="mt-3 font-heading text-3xl leading-tight font-extrabold text-white text-balance sm:text-4xl lg:text-5xl">
            {trail.name}
          </h1>
        </div>
      </section>

      <div className="container-page flex flex-col gap-8 py-8 sm:py-10">
        <SectionHeading
          as="h2"
          title="About this trail"
          description={trail.description || "A guided walk through the garden."}
        />

        <dl className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-card p-4">
            <dt className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Footprints className="size-3.5" aria-hidden="true" />
              Stops
            </dt>
            <dd className="mt-1.5 font-heading text-xl font-bold">{trail.stops.length}</dd>
          </div>
          <div className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-card p-4">
            <dt className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Clock className="size-3.5" aria-hidden="true" />
              Approximate duration
            </dt>
            <dd className="mt-1.5 font-heading text-xl font-bold">{trail.estimatedMinutes} min</dd>
          </div>
          <div className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-card p-4">
            <dt className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <Target className="size-3.5" aria-hidden="true" />
              Best for
            </dt>
            <dd className="mt-1.5 font-heading text-xl font-bold">
              {AGE_GROUP_LABELS[trail.ageGroup]}
            </dd>
          </div>
        </dl>

        {trail.goals.length > 0 ? (
          <Card className="rounded-3xl border-2 border-emerald-200 p-5 sm:p-6">
            <h2 className="font-heading text-xl font-bold">🎯 What you will learn</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {trail.goals.map((goal) => (
                <li key={goal} className="flex items-start gap-2.5 text-sm">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary"
                  />
                  <span className="leading-relaxed">{goal}</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {trail.categories.length > 0 ? (
          <div>
            <h2 className="font-heading text-lg font-semibold">Learning categories</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {trail.categories.map((category) => (
                <li key={category}>
                  <Link href={`/explore?category=${category}`}>
                    <Badge variant="soft" className="px-3 py-1.5 text-sm">
                      {LOCATION_CATEGORY_ICONS[category]} {LOCATION_CATEGORY_LABELS[category]}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <section>
          <SectionHeading
            title="🗺️ Your adventure map"
            description="Walk the stops in order if you can — but nothing is locked, so you can start wherever you are."
            action={
              firstStop ? (
                <Button asChild variant="warm">
                  <Link href={`/locations/${firstStop.location.slug}`}>
                    Start at stop 1
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              ) : null
            }
          />

          <div className="mt-8">
            <AdventureMap
              stops={trail.stops.map((stop, index) => ({
                position: stop.position,
                slug: stop.location.slug,
                name: stop.location.name,
                icon: stop.location.icon,
                category: stop.location.category,
                shortDescription: stop.location.shortDescription,
                instructionToNext: stop.instructionToNext,
                nextName: trail.stops[index + 1]?.location.name ?? null,
              }))}
            />
          </div>
        </section>

        <Card className="rounded-3xl border-2 border-sky-200 p-5 sm:p-6">
          <h2 className="inline-flex items-center gap-2 font-heading text-xl font-bold">
            <MapPin className="size-4.5 text-primary" aria-hidden="true" />
            How to begin
          </h2>
          <ol className="mt-3 flex flex-col gap-3">
            <li className="text-sm leading-relaxed text-muted-foreground">
              1. Walk to{" "}
              <span className="font-medium text-foreground">
                {firstStop?.location.name ?? "the first stop"}
              </span>
              .
            </li>
            <li className="text-sm leading-relaxed text-muted-foreground">
              2. Look for the Garden Explorer sign and scan its QR code with your phone camera.
            </li>
            <li className="text-sm leading-relaxed text-muted-foreground">
              3. Learn, observe and answer the quick quiz. Then follow the written directions to the
              next sign.
            </li>
            <li className="text-sm leading-relaxed text-muted-foreground">
              4. No account is needed. Your progress is kept privately in your own browser.
            </li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button asChild variant="warm">
              <Link href="/scan">Scan a QR Code</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/progress">My Progress</Link>
            </Button>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            {branding.gardenName} · {trail.stops.length} stops · about {trail.estimatedMinutes}{" "}
            minutes
          </p>
        </Card>

        {otherTrails.length > 0 ? (
          <section>
            <h2 className="font-heading text-lg font-semibold">Other trails in the garden</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-3">
              {otherTrails.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/trails/${entry.slug}`}
                    className="flex h-full flex-col gap-1.5 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
                  >
                    <span className="font-heading text-sm font-semibold">{entry.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {entry.stopCount} stops · {TRAIL_DIFFICULTY_LABELS[entry.difficulty]}
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
