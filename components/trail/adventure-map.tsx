"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { useVisitorProgress } from "@/hooks/use-visitor-progress";
import { LOCATION_CATEGORY_LABELS, type LocationCategory } from "@/lib/constants";
import { categoryTheme } from "@/lib/subjects";
import { cn } from "@/lib/utils";

export interface AdventureStop {
  position: number;
  slug: string;
  name: string;
  icon: string | null;
  category: LocationCategory;
  shortDescription: string;
  /** Written directions to the following stop; empty for the last one. */
  instructionToNext: string;
  nextName: string | null;
}

/**
 * A trail drawn as a treasure-hunt map: stepping stones down a dotted path,
 * with stops this device has already completed ticked off and the next one
 * glowing. Nothing is locked — every stop can be opened at any time.
 */
export function AdventureMap({ stops }: { stops: AdventureStop[] }) {
  const { progress, ready } = useVisitorProgress();
  const isDone = (slug: string) => ready && slug in progress.locations;
  const nextIndex = ready ? stops.findIndex((stop) => !isDone(stop.slug)) : -1;

  return (
    <ol className="relative">
      <span
        aria-hidden="true"
        className="absolute top-8 bottom-8 left-8 w-1.5 -translate-x-1/2 rounded-full bg-[repeating-linear-gradient(to_bottom,#fcd34d_0_12px,transparent_12px_22px)] md:left-1/2"
      />

      {stops.map((stop, index) => {
        const done = isDone(stop.slug);
        const isNext = index === nextIndex;
        const onLeft = index % 2 === 0;
        const theme = categoryTheme(stop.category);

        return (
          <Reveal
            as="li"
            key={stop.slug}
            from={onLeft ? "left" : "right"}
            className="relative grid py-4 pl-20 md:grid-cols-2 md:gap-20 md:pl-0"
          >
            <span
              className={cn(
                "absolute top-6 left-8 z-10 flex size-16 -translate-x-1/2 items-center justify-center rounded-full text-3xl shadow-lift ring-4 ring-white md:left-1/2",
                done
                  ? "bg-emerald-500"
                  : isNext
                    ? "animate-glow-pulse bg-amber-300"
                    : "bg-white",
              )}
            >
              <span aria-hidden="true">{done ? "✅" : stop.icon ?? "🌿"}</span>
              <span className="absolute -top-1 -right-1 flex size-7 items-center justify-center rounded-full bg-primary font-heading text-sm font-bold text-white ring-2 ring-white">
                {stop.position}
              </span>
            </span>

            <div
              className={cn(
                "flex flex-col gap-3 rounded-3xl border-2 bg-card p-5 shadow-soft transition-transform duration-300 hover:-translate-y-1",
                onLeft ? "md:col-start-1" : "md:col-start-2",
                isNext ? "border-amber-300" : done ? "border-emerald-200" : "border-border",
              )}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", theme.chip)}>
                  {LOCATION_CATEGORY_LABELS[stop.category]}
                </span>
                {done ? (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                    Done!
                  </span>
                ) : isNext ? (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                    👉 Up next
                  </span>
                ) : null}
              </div>
              <h3 className="font-heading text-xl font-bold">{stop.name}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {stop.shortDescription || "A learning point on this trail."}
              </p>

              {/* Written directions to the next place — no GPS inside the garden. */}
              {stop.nextName ? (
                <p className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm leading-relaxed">
                  <span className="font-semibold">🧭 Clue to stop {stop.position + 1}: </span>
                  {stop.instructionToNext.trim() ||
                    `Follow the garden path to ${stop.nextName}.`}
                </p>
              ) : (
                <p className="rounded-2xl bg-violet-50 px-3.5 py-2.5 text-sm leading-relaxed text-violet-950">
                  <span className="font-semibold">🏁 Final stop — </span>
                  finish here and your trail is complete!
                </p>
              )}

              <Button asChild variant="outline" size="sm" className="w-fit rounded-full">
                <Link href={`/locations/${stop.slug}`}>
                  Open
                  <ArrowRight aria-hidden="true" />
                  <span className="sr-only"> {stop.name}</span>
                </Link>
              </Button>
            </div>
          </Reveal>
        );
      })}

      <li className="relative flex py-4 pl-20 md:justify-center md:pl-0">
        <span
          aria-hidden="true"
          className="absolute top-4 left-8 flex size-16 -translate-x-1/2 items-center justify-center rounded-full border-4 border-dashed border-violet-300 bg-violet-50 text-3xl md:left-1/2"
        >
          🏆
        </span>
        <span className="pt-5 font-heading text-lg font-bold text-violet-700 md:pt-20">
          Trail complete — badge time!
        </span>
      </li>
    </ol>
  );
}
