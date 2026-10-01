import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

import { LOCATION_CATEGORY_LABELS, type LocationCategory } from "@/lib/constants";
import type { LocationCard as LocationCardData } from "@/db/queries/locations";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { categoryTheme } from "@/lib/subjects";
import { cn } from "@/lib/utils";

interface LocationCardProps {
  location: LocationCardData;
  /** Optional "Stop 3" badge when listed inside a trail. */
  trailPosition?: number | null;
  completed?: boolean;
  className?: string;
}

/**
 * One card per row on mobile, two on tablet, three/four on desktop.
 * Falls back to a soft gradient tile with the category icon when no photo has
 * been uploaded, so the grid never shows a broken image.
 */
export function LocationCard({
  location,
  trailPosition,
  completed = false,
  className,
}: LocationCardProps) {
  const icon = location.icon || categoryFallbackIcon(location.category);
  const theme = categoryTheme(location.category);

  return (
    <Card
      className={cn(
        "group h-full overflow-hidden rounded-3xl border-2 transition-[transform,box-shadow,border-color] duration-300 ease-out hover:-translate-y-1.5 hover:rotate-[-0.4deg] hover:border-primary/30 hover:shadow-lift",
        className,
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-accent">
        {location.heroImageUrl ? (
          <Image
            src={location.heroImageUrl}
            alt={location.heroImageAlt ?? location.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.07]"
            // Cards are below the fold on most pages.
            loading="lazy"
          />
        ) : (
          <div
            aria-hidden="true"
            className={cn(
              "relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br",
              theme.gradient,
            )}
          >
            <span className="dot-grid absolute inset-0 opacity-60" />
            <span className="absolute -right-6 -bottom-8 text-8xl opacity-15 transition-transform duration-700 group-hover:-rotate-12 group-hover:scale-110">
              {icon}
            </span>
            <span className="relative flex size-20 items-center justify-center rounded-full bg-white/70 text-4xl shadow-soft ring-1 ring-white transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-110">
              {icon}
            </span>
          </div>
        )}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d271d]/35 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          <Badge variant="soft" className={cn("font-semibold shadow-sm backdrop-blur", theme.chip)}>
            {icon} {LOCATION_CATEGORY_LABELS[location.category]}
          </Badge>
          {trailPosition ? (
            <Badge variant="default">Stop {trailPosition}</Badge>
          ) : null}
          {completed ? <Badge variant="success">✓ Discovered</Badge> : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-col gap-1.5">
          <h3 className="font-heading text-xl leading-snug font-bold transition-colors group-hover:text-primary">
            {location.name}
          </h3>
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {location.shortDescription || "Discover what grows and lives here."}
          </p>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden="true" />
            {location.estimatedMinutes} min
          </span>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href={`/locations/${location.slug}`}>
              Explore
              <ArrowRight className="transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
              <span className="sr-only"> {location.name}</span>
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function categoryFallbackIcon(category: LocationCategory): string {
  switch (category) {
    case "plants":
      return "🌿";
    case "animals":
      return "🦋";
    case "science":
      return "🔬";
    case "environment":
      return "🌍";
    case "garden-knowledge":
      return "🧭";
    case "logic":
      return "🧠";
    case "observation":
      return "👀";
    default:
      return "🌱";
  }
}
