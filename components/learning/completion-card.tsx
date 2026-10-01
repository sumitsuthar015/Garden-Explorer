"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Home, RefreshCw } from "lucide-react";

import type { BadgeDefinition } from "@/lib/badges";
import { Mascot } from "@/components/kids/mascot";
import { CountUp } from "@/components/motion/count-up";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { celebrate } from "@/lib/celebrate";
import { levelForXp, type ExplorerLevel } from "@/lib/levels";
import { playSound } from "@/lib/sounds";
import { cn, percent } from "@/lib/utils";

export interface CompletionSummary {
  locationName: string;
  icon: string | null;
  category: string;
  /** XP that actually reached the visitor's total on this visit. */
  xpAwarded: number;
  totalXp: number;
  /** True when this place had already been completed before (XP counts once). */
  practiceRun: boolean;
  levelUp: ExplorerLevel | null;
  learned: boolean;
  observed: boolean;
  activityCount: number;
  activitiesCompleted: number;
  quizFinished: boolean;
  quizScore: { correct: number; answered: number };
}

interface CompletionCardProps {
  summary: CompletionSummary;
  trailProgress: { name: string; discovered: number; total: number; completed: boolean } | null;
  newlyEarnedBadges: BadgeDefinition[];
  allBadges: BadgeDefinition[];
  earnedBadgeCodes: string[];
  /** Rendered directly under the completion panel (next place / trail finale). */
  children?: React.ReactNode;
}

/** "PLACE COMPLETE" — the big payoff: confetti, fanfare, XP and level progress. */
export function CompletionCard({
  summary,
  trailProgress,
  newlyEarnedBadges,
  allBadges,
  earnedBadgeCodes,
  children,
}: CompletionCardProps) {
  const badgeCount = newlyEarnedBadges.length;

  React.useEffect(() => {
    const timers = [
      window.setTimeout(() => {
        celebrate("big");
        playSound("complete");
      }, 250),
    ];
    if (badgeCount > 0) timers.push(window.setTimeout(() => playSound("badge"), 1400));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [badgeCount]);

  const level = levelForXp(summary.totalXp);

  const checklist = [
    { label: "Learned about this place", done: summary.learned },
    { label: "Observed in the garden", done: summary.observed },
    {
      label:
        summary.activityCount === 0
          ? "No activity at this stop"
          : `Completed ${summary.activitiesCompleted} of ${summary.activityCount} activities`,
      done: summary.activityCount === 0 || summary.activitiesCompleted >= summary.activityCount,
    },
    {
      label: summary.quizFinished ? "Finished the quiz" : "No quiz at this stop",
      done: true,
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <Card className="overflow-hidden rounded-3xl border-2 border-amber-300 shadow-lift">
        <div className="relative isolate flex flex-col items-center gap-2 overflow-hidden bg-gradient-to-br from-amber-300 via-orange-300 to-pink-300 px-5 pt-6 pb-7 text-center">
          <span
            aria-hidden="true"
            className="sun-rays absolute top-1/2 left-1/2 -z-10 size-[42rem] -translate-x-1/2 -translate-y-1/2 animate-rays rounded-full"
          />
          <Mascot mood="cheer" className="w-28 sm:w-32" />
          <p className="animate-bounce-in rounded-full bg-white/90 px-4 py-1 font-heading text-sm font-bold tracking-wide text-orange-600 uppercase shadow-sm">
            {summary.icon ?? "🌟"} Place complete!
          </p>
          <h2 className="font-heading text-3xl leading-tight font-bold text-amber-950 text-balance">
            {summary.locationName}
          </h2>
          {summary.practiceRun ? (
            <p className="max-w-sm rounded-2xl bg-white/80 px-4 py-2 text-sm font-medium text-amber-950">
              🔁 Great practice! You finished this place before, so XP only counted the first
              time.
            </p>
          ) : (
            <p className="animate-bounce-in font-heading text-5xl font-bold text-white drop-shadow-[0_3px_0_rgb(194_65_12/0.5)] [animation-delay:400ms]">
              +<CountUp value={summary.xpAwarded} durationMs={1200} /> XP
            </p>
          )}
        </div>

        {summary.levelUp ? (
          <div className="flex animate-bounce-in items-center justify-center gap-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-center text-white [animation-delay:900ms]">
            <span aria-hidden="true" className="animate-jump text-3xl">
              {summary.levelUp.icon}
            </span>
            <p className="font-heading text-lg font-bold">
              LEVEL UP! You are now a {summary.levelUp.name}!
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="rounded-2xl border-2 border-amber-100 bg-amber-50/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 font-heading text-base font-bold">
                <span aria-hidden="true" className="text-2xl">
                  {level.current.icon}
                </span>
                Level {level.current.level} · {level.current.name}
              </p>
              <span className="text-sm font-semibold text-amber-700 tabular-nums">
                {summary.totalXp} XP
              </span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-amber-100">
              <div
                className="h-full animate-bar-fill rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400"
                style={{ width: `${level.percent}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {level.next
                ? `${level.xpToNext} XP more to become a ${level.next.icon} ${level.next.name}`
                : "You reached the top level — you are a Garden Genius!"}
            </p>
          </div>

          <ul className="grid gap-2.5 sm:grid-cols-2">
            {checklist.map((item, index) => (
              <li
                key={item.label}
                className="flex animate-rise items-start gap-3 rounded-2xl bg-muted/50 px-3 py-2.5 text-sm font-medium"
                style={{ animationDelay: `${500 + index * 120}ms` }}
              >
                <span
                  className={cn(
                    "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full",
                    item.done ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground",
                  )}
                >
                  {item.done ? (
                    <Check className="size-3.5" aria-hidden="true" strokeWidth={3} />
                  ) : (
                    <span className="size-1.5 rounded-full bg-current" />
                  )}
                </span>
                <span className={cn("leading-snug", !item.done && "text-muted-foreground")}>
                  {item.label}
                  <span className="sr-only">{item.done ? " — done" : " — not done"}</span>
                </span>
              </li>
            ))}
          </ul>

          {summary.quizScore.answered > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-violet-50 px-4 py-3">
              <p className="text-sm text-violet-950">
                Quiz: you answered{" "}
                <span className="font-bold">{summary.quizScore.correct}</span> of{" "}
                <span className="font-bold">{summary.quizScore.answered}</span> questions
                correctly.
              </p>
              <span aria-hidden="true" className="text-xl tracking-widest">
                {"⭐".repeat(summary.quizScore.correct)}
                {"☆".repeat(Math.max(0, summary.quizScore.answered - summary.quizScore.correct))}
              </span>
            </div>
          ) : null}

          {trailProgress ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">🥾 {trailProgress.name}</span>
                <span className="text-muted-foreground">
                  {trailProgress.discovered} / {trailProgress.total}
                </span>
              </div>
              <Progress
                value={percent(trailProgress.discovered, trailProgress.total)}
                aria-label={`Trail progress: ${trailProgress.discovered} of ${trailProgress.total} places discovered`}
              />
              <p className="text-xs text-muted-foreground">
                {trailProgress.completed
                  ? "You have discovered every place on this trail."
                  : `${trailProgress.total - trailProgress.discovered} place${
                      trailProgress.total - trailProgress.discovered === 1 ? "" : "s"
                    } still to discover.`}
              </p>
            </div>
          ) : null}
        </div>
      </Card>

      {newlyEarnedBadges.length > 0 ? (
        <Card className="overflow-hidden rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-50 to-white">
          <div className="flex flex-col items-center gap-4 px-5 py-6 text-center">
            <p className="font-heading text-lg font-bold text-amber-800">
              🏅 {newlyEarnedBadges.length === 1 ? "New badge unlocked!" : "New badges unlocked!"}
            </p>
            <ul className="flex flex-wrap justify-center gap-6">
              {newlyEarnedBadges.map((badge, index) => (
                <li
                  key={badge.code}
                  className="flex max-w-[12rem] animate-bounce-in flex-col items-center gap-2"
                  style={{ animationDelay: `${1300 + index * 250}ms` }}
                >
                  <span className="relative flex size-24 items-center justify-center">
                    <span
                      aria-hidden="true"
                      className="sun-rays absolute inset-[-40%] animate-rays rounded-full"
                    />
                    <span
                      aria-hidden="true"
                      className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-yellow-400 text-5xl shadow-lift ring-4 ring-white"
                    >
                      {badge.icon}
                    </span>
                  </span>
                  <span className="font-heading text-lg font-bold">{badge.name}</span>
                  <span className="text-sm text-muted-foreground">{badge.description}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      ) : null}

      {allBadges.length > 0 ? (
        <Card className="rounded-3xl p-5">
          <h3 className="font-heading text-lg font-bold">
            🏆 Your badge shelf ({earnedBadgeCodes.length} of {allBadges.length})
          </h3>
          <ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
            {allBadges.map((badge) => {
              const earned = earnedBadgeCodes.includes(badge.code);
              return (
                <li key={badge.code} className="flex flex-col items-center gap-1 text-center">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex size-12 items-center justify-center rounded-full text-2xl transition-transform hover:scale-110",
                      earned
                        ? "bg-gradient-to-br from-amber-200 to-yellow-300 shadow-soft"
                        : "bg-muted opacity-60 grayscale",
                    )}
                  >
                    {earned ? badge.icon : "🔒"}
                  </span>
                  <span className="text-[11px] leading-tight font-medium">
                    {badge.name}
                    <span className="sr-only">{earned ? " — earned" : " — not earned yet"}</span>
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4">
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/progress">See all progress</Link>
            </Button>
          </div>
        </Card>
      ) : null}

      {children}

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/explore">
            <Home aria-hidden="true" />
            Back to the garden
          </Link>
        </Button>
        <Button asChild variant="warm" className="rounded-full">
          <Link href="/scan">
            <RefreshCw aria-hidden="true" />
            Scan another sign
          </Link>
        </Button>
      </div>
    </div>
  );
}

interface TrailCompleteCardProps {
  trailName: string;
  discovered: number;
  total: number;
  stops: { slug: string; name: string; discovered: boolean }[];
  newlyEarnedBadges: BadgeDefinition[];
}

/** Final-stop celebration with every discovered place stamped. */
export function TrailCompleteCard({
  trailName,
  discovered,
  total,
  stops,
  newlyEarnedBadges,
}: TrailCompleteCardProps) {
  return (
    <Card className="overflow-hidden rounded-3xl border-2 border-violet-300 shadow-lift">
      <div className="relative isolate flex flex-col items-center gap-3 overflow-hidden bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 px-5 py-8 text-center text-white">
        <span
          aria-hidden="true"
          className="sun-rays absolute top-1/2 left-1/2 -z-10 size-[40rem] -translate-x-1/2 -translate-y-1/2 animate-rays rounded-full"
        />
        <span aria-hidden="true" className="animate-jump text-7xl drop-shadow">
          🏆
        </span>
        <p className="font-heading text-sm font-bold tracking-[0.16em] uppercase">Trail complete!</p>
        <h2 className="font-heading text-3xl leading-tight font-bold text-balance">{trailName}</h2>
        <p className="rounded-full bg-white/20 px-4 py-1 font-heading text-lg font-semibold">
          {discovered} / {total} places discovered
        </p>
      </div>

      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <h3 className="font-heading text-lg font-bold">📍 You explored:</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {stops.map((stop, index) => (
            <li
              key={stop.slug}
              className="flex animate-rise items-center gap-2.5 rounded-2xl bg-muted/50 px-3 py-2 text-sm font-medium"
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full",
                  stop.discovered ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground",
                )}
              >
                {stop.discovered ? (
                  <Check className="size-3.5" aria-hidden="true" strokeWidth={3} />
                ) : (
                  <span className="size-1.5 rounded-full bg-current" />
                )}
              </span>
              <span className={cn(!stop.discovered && "text-muted-foreground")}>{stop.name}</span>
              <span className="sr-only">{stop.discovered ? "discovered" : "not yet discovered"}</span>
            </li>
          ))}
        </ul>

        {newlyEarnedBadges.length > 0 ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
            🏅 You unlocked {newlyEarnedBadges.map((badge) => `${badge.icon} ${badge.name}`).join(", ")}!
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button asChild variant="warm" className="rounded-full">
            <Link href="/trails">Find another trail</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/progress">See my progress</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
