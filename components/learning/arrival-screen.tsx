"use client";

import * as React from "react";
import Image from "next/image";
import { Clock, Footprints } from "lucide-react";

import { MascotSays } from "@/components/kids/mascot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { celebrate } from "@/lib/celebrate";
import { LOCATION_CATEGORY_LABELS, type LocationCategory } from "@/lib/constants";
import { categoryTheme } from "@/lib/subjects";
import { cn } from "@/lib/utils";

interface ArrivalScreenProps {
  locationName: string;
  shortDescription: string;
  category: LocationCategory;
  icon: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  estimatedMinutes: number;
  /** e.g. "Stop 3 of 7" — omitted when the visitor is browsing freely. */
  trailContext: {
    trailName: string;
    position: number;
    totalStops: number;
    isLaterStop: boolean;
  } | null;
  contentHighlights: string[];
  hasQuiz: boolean;
  hasActivities: boolean;
  activityCount?: number;
  questionCount?: number;
  /** Most XP this place can award on a first visit. */
  maxXp?: number;
  onStart: () => void;
}

/**
 * The first screen after a scan.
 *
 * Answers the visitor's three immediate questions — where am I, what is this,
 * and where am I in the trail? — and makes finding the sign feel like a win.
 * Nothing is required of them yet.
 */
export function ArrivalScreen({
  locationName,
  shortDescription,
  category,
  icon,
  heroImageUrl,
  heroImageAlt,
  estimatedMinutes,
  trailContext,
  contentHighlights,
  hasQuiz,
  hasActivities,
  activityCount = 0,
  questionCount = 0,
  maxXp = 0,
  onStart,
}: ArrivalScreenProps) {
  const theme = categoryTheme(category);
  const emoji = icon ?? "🌿";

  // A little burst of confetti for finding the sign. Deferred so the
  // celebration layer has subscribed before it fires.
  React.useEffect(() => {
    const timer = window.setTimeout(() => celebrate("small"), 350);
    return () => window.clearTimeout(timer);
  }, []);

  const mission = [
    { emoji: "📖", label: "Read the fun facts", show: true },
    {
      emoji: "👀",
      label: `${activityCount} hands-on ${activityCount === 1 ? "activity" : "activities"}`,
      show: hasActivities,
    },
    {
      emoji: "❓",
      label: `${questionCount}-question quiz`,
      show: hasQuiz,
    },
    { emoji: "⭐", label: `Earn up to ${maxXp} XP`, show: maxXp > 0 },
  ].filter((item) => item.show);

  return (
    <Card className="overflow-hidden rounded-3xl border-2 border-amber-200 shadow-lift">
      <div
        className={cn(
          "relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br sm:aspect-[21/9]",
          theme.gradient,
        )}
      >
        {heroImageUrl ? (
          <Image
            src={heroImageUrl}
            alt={heroImageAlt ?? locationName}
            fill
            sizes="100vw"
            className="object-cover"
            preload
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
            <span className="dot-grid absolute inset-0 opacity-60" />
            <span className="sun-rays absolute size-[40rem] animate-rays rounded-full opacity-80" />
            <span className="relative flex size-28 animate-bounce-in items-center justify-center rounded-[2rem] bg-white/80 text-7xl shadow-lift ring-4 ring-white sm:size-32 sm:text-8xl">
              <span className="animate-bob">{emoji}</span>
            </span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent p-4 pt-12 sm:p-6 sm:pt-16">
          <span className="mb-2 inline-flex animate-bounce-in items-center gap-1.5 rounded-full bg-amber-400 px-3.5 py-1.5 font-heading text-sm font-bold text-amber-950 shadow-lift [animation-delay:250ms]">
            <span aria-hidden="true">🎉</span>
            You Found It!
          </span>
          <h1 className="font-heading text-3xl leading-tight font-bold text-white text-balance drop-shadow sm:text-4xl">
            {locationName}
          </h1>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <MascotSays mood="wave">
          Hi explorer! Welcome to <strong>{locationName}</strong>. Ready for a mini-adventure?
        </MascotSays>

        {trailContext ? (
          <div className="flex flex-col gap-2.5 rounded-2xl border-2 border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="font-heading text-base font-semibold">
              🥾 Stop {trailContext.position} of {trailContext.totalStops}
              <span className="font-normal text-muted-foreground"> · {trailContext.trailName}</span>
            </p>
            <div aria-hidden="true" className="flex gap-1.5">
              {Array.from({ length: trailContext.totalStops }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-2 flex-1 rounded-full",
                    index + 1 < trailContext.position
                      ? "bg-emerald-400"
                      : index + 1 === trailContext.position
                        ? "animate-pulse bg-amber-400"
                        : "bg-emerald-100",
                  )}
                />
              ))}
            </div>
            {trailContext.isLaterStop ? (
              <p className="text-sm leading-relaxed text-muted-foreground">
                You&apos;ve discovered a later stop in this trail. Learn here as long as you like —
                nothing is locked and you are not expected to have visited the earlier stops first.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="inline-flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-2.5 text-sm text-sky-900">
            <span aria-hidden="true">🧭</span>
            A free-roam discovery. Nothing to follow — explore at your own pace.
          </p>
        )}

        <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
          {shortDescription || "Discover what grows and lives here."}
        </p>

        <div className="flex flex-wrap gap-2">
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold", theme.chip)}>
            {emoji} {LOCATION_CATEGORY_LABELS[category]}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-sm font-medium">
            <Clock className="size-3.5" aria-hidden="true" />
            about {estimatedMinutes} min
          </span>
        </div>

        <div>
          <h2 className="font-heading text-lg font-bold">🎯 Your mission</h2>
          <ul className="mt-2 grid grid-cols-2 gap-2.5">
            {mission.map((item, index) => (
              <li
                key={item.label}
                className="flex animate-rise items-center gap-2.5 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/70 px-3 py-2.5 text-sm font-semibold"
                style={{ animationDelay: `${300 + index * 90}ms` }}
              >
                <span aria-hidden="true" className="text-2xl">
                  {item.emoji}
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        {contentHighlights.length > 0 ? (
          <div>
            <h2 className="font-heading text-lg font-bold">🔎 You will discover</h2>
            <ul className="mt-2 flex flex-col gap-1.5">
              {contentHighlights.slice(0, 4).map((highlight) => (
                <li key={highlight} className="flex items-start gap-2 text-base text-muted-foreground">
                  <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-amber-400" />
                  <span className="leading-relaxed">{highlight}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <Button
          size="xl"
          onClick={onStart}
          className="group relative w-full overflow-hidden rounded-2xl text-lg"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-primary/60 animate-ring-pulse"
          />
          <Footprints className="transition-transform group-hover:scale-110" aria-hidden="true" />
          Start Learning
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-white/30 blur-md animate-sweep"
          />
        </Button>
      </div>
    </Card>
  );
}
