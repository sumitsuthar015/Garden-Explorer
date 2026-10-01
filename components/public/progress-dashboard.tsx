"use client";

import * as React from "react";
import Link from "next/link";
import { RotateCcw, Trash2 } from "lucide-react";

import type { BadgeDefinition } from "@/lib/badges";
import { badgeProgress } from "@/lib/badges";
import { levelForXp } from "@/lib/levels";
import { buildBadgeContext, trailSummary } from "@/lib/progress/actions";
import { hasAnyProgress } from "@/lib/progress/types";
import { categoryTheme } from "@/lib/subjects";
import { useVisitorProgress } from "@/hooks/use-visitor-progress";
import { Mascot, MascotSays } from "@/components/kids/mascot";
import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, percent } from "@/lib/utils";
import { toast } from "@/lib/toast";

export interface ProgressPlace {
  slug: string;
  name: string;
  icon: string | null;
  category: string;
  trailSlug: string | null;
}

export interface ProgressTrail {
  slug: string;
  name: string;
  stopCount: number;
  stops: { slug: string; name: string }[];
}

interface ProgressDashboardProps {
  places: ProgressPlace[];
  trails: ProgressTrail[];
  badges: BadgeDefinition[];
  locationCategories: Record<string, string>;
}

/** Passport stamps sit at slightly different angles, like real ink stamps. */
const STAMP_TILTS = ["-rotate-6", "rotate-3", "-rotate-2", "rotate-6", "-rotate-3", "rotate-2"];

/**
 * /progress — the explorer's passport.
 *
 * Everything on this page comes from the browser's local progress record, so
 * there is nothing to sign into and nothing stored on the server. The page says
 * so plainly, including the risk of losing progress when storage is cleared.
 */
export function ProgressDashboard({
  places,
  trails,
  badges,
  locationCategories,
}: ProgressDashboardProps) {
  const { progress, ready, reset } = useVisitorProgress();
  const [confirmReset, setConfirmReset] = React.useState(false);

  const discovered = Object.values(progress.locations);
  const context = buildBadgeContext(progress, locationCategories);
  const earnedCodes = new Set(progress.badges);

  const totalAnswered = Object.values(progress.quizzes).reduce(
    (sum, stats) => sum + stats.answered,
    0,
  );
  const totalCorrect = Object.values(progress.quizzes).reduce(
    (sum, stats) => sum + stats.correct,
    0,
  );
  const firstTry = Object.values(progress.quizzes).reduce(
    (sum, stats) => sum + stats.firstTryCorrect,
    0,
  );

  if (!ready) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-40 rounded-3xl" />
        <div className="grid gap-4 sm:grid-cols-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  if (!hasAnyProgress(progress)) {
    return (
      <div className="flex flex-col items-center gap-5 rounded-[2rem] border-2 border-dashed border-emerald-300 bg-gradient-to-br from-emerald-50 via-card to-amber-50 px-6 py-12 text-center">
        <MascotSays mood="wave" side="top">
          Your passport is empty — for now! Scan your first sign and I&apos;ll stamp it for you.
        </MascotSays>
        <h2 className="font-heading text-2xl font-bold">Your garden adventure starts here</h2>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          Scan the QR code on any Garden Explorer sign, or open a place from the explore page. Your
          XP, badges and trail progress will appear on this page.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="warm" size="lg" className="rounded-full">
            <Link href="/scan">Scan a QR Code</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/explore">Explore the garden</Link>
          </Button>
        </div>
      </div>
    );
  }

  const level = levelForXp(progress.xp);

  const stats = [
    { emoji: "⭐", label: "XP earned", value: progress.xp, tone: "from-amber-100 to-yellow-50 border-amber-200" },
    {
      emoji: "📍",
      label: "Places stamped",
      value: discovered.length,
      suffix: `/${places.length}`,
      tone: "from-emerald-100 to-lime-50 border-emerald-200",
    },
    {
      emoji: "🏅",
      label: "Badges",
      value: progress.badges.length,
      suffix: `/${badges.length}`,
      tone: "from-violet-100 to-fuchsia-50 border-violet-200",
    },
    {
      emoji: "✅",
      label: "Quiz answers",
      value: totalAnswered,
      note: `${totalCorrect} correct · ${firstTry} first try`,
      tone: "from-sky-100 to-cyan-50 border-sky-200",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Level card */}
      <Card className="relative isolate overflow-hidden rounded-[2rem] border-2 border-amber-300 bg-gradient-to-br from-amber-200 via-orange-200 to-pink-200 p-6 sm:p-8">
        <span
          aria-hidden="true"
          className="sun-rays absolute -top-40 -right-40 -z-10 size-[36rem] animate-rays rounded-full"
        />
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <Mascot mood={level.current.level >= 4 ? "cheer" : "happy"} className="w-28 shrink-0" />
          <div className="flex w-full flex-col gap-2">
            <p className="font-heading text-sm font-bold tracking-wide text-orange-700 uppercase">
              Level {level.current.level}
            </p>
            <p className="font-heading text-4xl leading-tight font-bold text-amber-950">
              <span aria-hidden="true">{level.current.icon}</span> {level.current.name}
            </p>
            <div className="h-4 overflow-hidden rounded-full bg-white/60 ring-1 ring-white">
              <div
                className="h-full animate-bar-fill rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-500"
                style={{ width: `${level.percent}%` }}
              />
            </div>
            <p className="text-sm font-medium text-amber-950/80">
              {level.next
                ? `${level.xpToNext} XP until you become a ${level.next.icon} ${level.next.name}`
                : "You reached the top level — you are a Garden Genius!"}
            </p>
          </div>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Reveal key={stat.label} delay={index * 80} className="h-full">
            <Card className={cn("h-full rounded-3xl border-2 bg-gradient-to-br p-5", stat.tone)}>
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
                <span aria-hidden="true" className="text-xl">
                  {stat.emoji}
                </span>
                {stat.label}
              </p>
              <p className="mt-1.5 font-heading text-4xl font-bold">
                <CountUp value={stat.value} />
                {stat.suffix ? (
                  <span className="text-xl font-semibold text-muted-foreground">{stat.suffix}</span>
                ) : null}
              </p>
              {stat.note ? <p className="mt-1 text-xs text-muted-foreground">{stat.note}</p> : null}
            </Card>
          </Reveal>
        ))}
      </div>

      {/* Passport stamps */}
      <Card className="rounded-[2rem] border-2 border-emerald-200 p-5 sm:p-6">
        <h2 className="font-heading text-2xl font-bold">🛂 Passport stamps</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {discovered.length} of {places.length} learning points visited.
        </p>
        <Progress
          className="mt-3"
          value={percent(discovered.length, places.length)}
          aria-label={`${discovered.length} of ${places.length} places discovered`}
        />
        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {places.map((place, index) => {
            const record = progress.locations[place.slug];
            const theme = categoryTheme(place.category);
            return (
              <li key={place.slug}>
                <Link
                  href={`/locations/${place.slug}`}
                  className="group flex flex-col items-center gap-2 rounded-2xl p-2 text-center transition-transform hover:-translate-y-1"
                >
                  <span
                    className={cn(
                      "flex size-24 items-center justify-center rounded-full text-4xl transition-transform duration-300 group-hover:scale-110",
                      record
                        ? cn(
                            "border-4 border-double border-emerald-600/60 bg-gradient-to-br shadow-soft",
                            theme.gradient,
                            STAMP_TILTS[index % STAMP_TILTS.length],
                          )
                        : "border-2 border-dashed border-border bg-muted/40 text-2xl text-muted-foreground",
                    )}
                  >
                    <span aria-hidden="true">{record ? place.icon ?? "🌿" : "?"}</span>
                  </span>
                  <span className="text-sm leading-tight font-semibold">{place.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {record ? `+${record.xp} XP · stamped` : "Not visited yet"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* Trails */}
      {trails.length > 0 ? (
        <Card className="rounded-[2rem] border-2 border-sky-200 p-5 sm:p-6">
          <h2 className="font-heading text-2xl font-bold">🥾 Trail progress</h2>
          <ul className="mt-4 flex flex-col gap-5">
            {trails.map((trail) => {
              const summary = trailSummary(progress, trail.slug, trail.stopCount);
              const record = progress.trails[trail.slug];
              const started = Boolean(record);

              return (
                <li key={trail.slug} className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/trails/${trail.slug}`}
                        className="font-heading text-lg font-semibold hover:text-primary hover:underline"
                      >
                        {trail.name}
                      </Link>
                      {summary.completed ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          🏆 Completed
                        </span>
                      ) : started ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                          In progress
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                          Not started
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">
                      {summary.discovered} / {summary.total}
                    </span>
                  </div>
                  <Progress
                    value={summary.percent}
                    aria-label={`${trail.name}: ${summary.discovered} of ${summary.total} places discovered`}
                  />
                  <ul className="mt-1 flex flex-wrap gap-2 text-xs">
                    {trail.stops.map((stop) => {
                      const done = stop.slug in progress.locations;
                      return (
                        <li
                          key={stop.slug}
                          className={cn(
                            "flex items-center gap-1.5 rounded-full px-2.5 py-1",
                            done ? "bg-emerald-50 text-emerald-900" : "bg-muted/60 text-muted-foreground",
                          )}
                        >
                          <span aria-hidden="true">{done ? "✅" : "⚪"}</span>
                          <span>{stop.name}</span>
                          <span className="sr-only">{done ? "discovered" : "not yet discovered"}</span>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      {/* Badges */}
      <Card className="rounded-[2rem] border-2 border-violet-200 p-5 sm:p-6">
        <h2 className="font-heading text-2xl font-bold">🏅 Trophy shelf</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {progress.badges.length} of {badges.length} earned. Every badge rule is set by the garden
          team.
        </p>
        {badges.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No badges have been published yet.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {badges.map((badge) => {
              const earned = earnedCodes.has(badge.code);
              const value = badgeProgress(badge, context);
              return (
                <li
                  key={badge.code}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border-2 p-4 transition-transform hover:-translate-y-0.5",
                    earned ? "border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50" : "border-border bg-card",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-14 shrink-0 items-center justify-center rounded-full text-3xl",
                      earned
                        ? "bg-gradient-to-br from-amber-200 to-yellow-400 shadow-soft ring-4 ring-white"
                        : "bg-muted grayscale",
                    )}
                  >
                    {earned ? badge.icon : "🔒"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-base font-bold">
                      {badge.name}
                      <span className="sr-only">{earned ? " — earned" : " — not earned yet"}</span>
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {badge.description}
                    </p>
                    {!earned ? (
                      <div className="mt-2 flex flex-col gap-1">
                        <Progress
                          value={value.percent}
                          className="h-2"
                          aria-label={`${badge.name}: ${value.percent}% complete`}
                        />
                        <p className="text-[11px] font-medium text-muted-foreground">
                          {value.current} of {value.target}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Data ownership */}
      <Card className="rounded-3xl p-5 sm:p-6">
        <h2 className="font-heading text-lg font-bold">Where this information lives</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your progress is stored only in this browser on this device. It is not linked to your
          name, an account or any personal detail, and the garden never receives a copy.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Because of that, progress can be lost: clearing your browser data, using private browsing,
          or opening the site on a different device will start you fresh. Keep the same browser if
          you want to keep your badges.
        </p>
        <div className="mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmReset(true)}
            className="rounded-full text-destructive hover:text-destructive"
          >
            <Trash2 aria-hidden="true" />
            Reset my progress
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="warm" className="rounded-full">
          <Link href="/scan">
            <RotateCcw aria-hidden="true" />
            Scan another sign
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/explore">Explore the garden</Link>
        </Button>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset all your progress?"
        description="Every discovered place, XP total, badge and quiz result stored in this browser will be deleted permanently. The garden cannot restore it because it never had a copy."
        confirmLabel="Reset progress"
        onConfirm={() => {
          reset();
          setConfirmReset(false);
          toast.success("Progress reset", "You are starting a fresh garden adventure.");
        }}
      />
    </div>
  );
}
