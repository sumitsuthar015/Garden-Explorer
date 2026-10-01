import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { LocationCard } from "@/components/public/location-card";
import { SectionHeading } from "@/components/public/section-heading";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getBranding } from "@/db/queries/gardens";
import {
  listPublishedCategoriesWithCounts,
  listPublishedLocationCards,
} from "@/db/queries/locations";
import {
  LOCATION_CATEGORIES,
  LOCATION_CATEGORY_ICONS,
  LOCATION_CATEGORY_LABELS,
  type LocationCategory,
} from "@/lib/constants";
import { categoryTheme } from "@/lib/subjects";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Explore the garden",
  description:
    "Browse every learning point in the garden by topic and discover what grows, lives and changes here.",
  alternates: { canonical: "/explore" },
};

function parseCategory(value: string | string[] | undefined): LocationCategory | "all" {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate) return "all";
  return (LOCATION_CATEGORIES as readonly string[]).includes(candidate)
    ? (candidate as LocationCategory)
    : "all";
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[]; q?: string | string[] }>;
}) {
  const params = await searchParams;
  const category = parseCategory(params.category);
  const rawSearch = Array.isArray(params.q) ? params.q[0] : params.q;
  const search = (rawSearch ?? "").slice(0, 80);

  const [branding, locations, categories] = await Promise.all([
    getBranding(),
    listPublishedLocationCards({ category, search, limit: 120 }),
    listPublishedCategoriesWithCounts(),
  ]);

  const totalPublished = categories.reduce((sum, entry) => sum + entry.total, 0);
  const activeCategoryLabel =
    category === "all" ? "All topics" : LOCATION_CATEGORY_LABELS[category];

  return (
    <div className="container-page py-10 sm:py-14">
      <SectionHeading
        as="h1"
        eyebrow="🧭 Garden places"
        title="Explore the garden"
        description={
          totalPublished > 0
            ? `Browse all ${totalPublished} learning point${totalPublished === 1 ? "" : "s"} in ${branding.gardenName}. Scan a QR sign on site, or open a place here to preview what you will learn.`
            : `Every learning point in ${branding.gardenName} will be listed here. Scan a QR sign on site, or open a place here to preview what you will learn.`
        }
        action={
          <Button asChild variant="warm">
            <Link href="/scan">Scan a QR Code</Link>
          </Button>
        }
      />

      {/* Filters are plain links so they work without JavaScript and stay indexable. */}
      <div className="mt-8 flex flex-col gap-4">
        <nav aria-label="Filter by topic">
          <ul className="flex flex-wrap gap-2">
            <li>
              <Link
                href="/explore"
                aria-current={category === "all" ? "page" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5",
                  category === "all"
                    ? "border-primary bg-primary text-primary-foreground shadow-soft"
                    : "border-border bg-card hover:border-primary/40 hover:bg-accent",
                )}
              >
                🌈 All topics
                <span className="text-xs opacity-80">{totalPublished}</span>
              </Link>
            </li>
            {categories.map((entry) => (
              <li key={entry.category}>
                <Link
                  href={`/explore?category=${entry.category}`}
                  aria-current={category === entry.category ? "page" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border-2 px-4 py-2 text-sm font-semibold transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5",
                    category === entry.category
                      ? "border-primary bg-primary text-primary-foreground shadow-soft"
                      : cn("border-transparent hover:border-current/30", categoryTheme(entry.category).chip),
                  )}
                >
                  <span aria-hidden="true">{LOCATION_CATEGORY_ICONS[entry.category]}</span>
                  {LOCATION_CATEGORY_LABELS[entry.category]}
                  <span className="text-xs opacity-80">{entry.total}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <form action="/explore" method="get" className="flex flex-col gap-2 sm:max-w-md sm:flex-row">
          {category !== "all" ? <input type="hidden" name="category" value={category} /> : null}
          <label htmlFor="explore-search" className="sr-only">
            Search garden places
          </label>
          <input
            id="explore-search"
            name="q"
            type="search"
            defaultValue={search}
            placeholder="Search places, e.g. leaf, loop, butterfly"
            className="h-12 flex-1 rounded-full border-2 border-input bg-card px-5 text-base shadow-[inset_0_1px_1px_rgb(31_41_51/0.03)] focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring/60"
          />
          <Button type="submit" variant="outline" className="h-12 rounded-full">
            🔍 Search
          </Button>
        </form>
      </div>

      <div className="mt-8">
        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          Showing <span className="font-medium text-foreground">{locations.length}</span>{" "}
          {locations.length === 1 ? "place" : "places"}
          {category !== "all" ? ` in ${activeCategoryLabel}` : ""}
          {search ? ` matching “${search}”` : ""}.
        </p>

        {locations.length === 0 ? (
          <EmptyState
            icon={<Compass className="size-5" aria-hidden="true" />}
            title={search ? "No places match that search" : "No garden places yet"}
            description={
              search
                ? "Try a different word, or clear the search to see every place in the garden."
                : "Once a garden admin publishes learning points they will be listed here."
            }
            action={
              search ? (
                <Button asChild variant="outline">
                  <Link href={category === "all" ? "/explore" : `/explore?category=${category}`}>
                    Clear search
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/about">About this garden</Link>
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {locations.map((location, index) => (
              <Reveal key={location.id} delay={(index % 4) * 90} className="h-full">
                <LocationCard location={location} />
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
