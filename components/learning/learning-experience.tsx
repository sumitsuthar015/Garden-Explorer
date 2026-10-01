"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

import type { PublicActivity, PublicLocationDetail } from "@/db/queries/locations";
import { DEFAULT_LOCATION_COMPLETION_XP } from "@/lib/constants";
import type { BadgeDefinition } from "@/lib/badges";
import {
  recordQuizCompletedAction,
  recordQuizStartedAction,
  recordLocationCompletedAction,
  trackEventAction,
} from "@/lib/actions/learning";
import type { AnswerOutcome } from "@/lib/scoring";
import { useVisitorProgress } from "@/hooks/use-visitor-progress";
import { getVisitorId } from "@/lib/progress/store";
import { Mascot } from "@/components/kids/mascot";
import { ActivityCard } from "@/components/learning/activity-card";
import { ArrivalScreen } from "@/components/learning/arrival-screen";
import { CompletionCard, TrailCompleteCard } from "@/components/learning/completion-card";
import { ContentBlockCard } from "@/components/learning/content-block-card";
import { NextPlaceCard, type NextPlaceData } from "@/components/learning/next-place-card";
import { QuizFlow } from "@/components/quiz/quiz-flow";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { levelUpBetween } from "@/lib/levels";
import { playSound } from "@/lib/sounds";
import { cn, percent } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 * Serializable props passed from the server page
 * ------------------------------------------------------------------ */

export interface ClientTrailStop {
  position: number;
  slug: string;
  name: string;
  icon: string | null;
  category: string;
  shortDescription: string;
}

export interface ClientTrailContext {
  slug: string;
  name: string;
  currentPosition: number;
  totalStops: number;
  stops: ClientTrailStop[];
  nextPlace: NextPlaceData | null;
  previousPlace: { slug: string; name: string; position: number } | null;
  isLaterStop: boolean;
}

export interface LearningExperienceProps {
  location: PublicLocationDetail;
  trail: ClientTrailContext | null;
  otherTrails: { slug: string; name: string; stopCount: number; position: number }[];
  badges: BadgeDefinition[];
  locationCategories: Record<string, string>;
  /** Shown when the visitor arrived without a trail context. */
  recommendedNext: ClientTrailStop | null;
  completionXp?: number;
  /** Set when the visitor arrived by scanning a specific QR sign. */
  viaCode?: string | null;
}

type Step =
  | { kind: "learn" }
  | { kind: "activity"; activity: PublicActivity }
  | { kind: "quiz" };

const NEUTRAL_ANSWER_OUTCOME: AnswerOutcome = "first_try";

/**
 * The full learning experience: arrival → learning cards → observation
 * activities → quiz → completion → next place.
 *
 * Anonymous by construction: all visitor state comes from the browser-local
 * progress record and no personal information is ever sent to the server.
 */
export function LearningExperience({
  location,
  trail,
  otherTrails,
  badges,
  locationCategories,
  recommendedNext,
  completionXp = DEFAULT_LOCATION_COMPLETION_XP,
  viaCode = null,
}: LearningExperienceProps) {
  const visitor = useVisitorProgress();

  const [stage, setStage] = React.useState<"arrival" | "running" | "complete">("arrival");
  const [stepIndex, setStepIndex] = React.useState(0);
  const [activitiesDone, setActivitiesDone] = React.useState<string[]>([]);
  const [quizStats, setQuizStats] = React.useState({ correct: 0, answered: 0 });

  /**
   * Points are accumulated in refs as well as state.
   * State drives the display; the refs guarantee the final total is exact even
   * when several answers are awarded inside one React batch.
   */
  const sessionXpRef = React.useRef(0);
  const quizPointsRef = React.useRef(0);
  const [sessionXp, setSessionXp] = React.useState(0);
  const [quizPoints, setQuizPoints] = React.useState(0);

  const addSessionXp = React.useCallback((points: number) => {
    sessionXpRef.current += points;
    setSessionXp(sessionXpRef.current);
  }, []);

  const addQuizPoints = React.useCallback((points: number) => {
    quizPointsRef.current += points;
    setQuizPoints(quizPointsRef.current);
  }, []);
  const [newBadges, setNewBadges] = React.useState<BadgeDefinition[]>([]);
  const [trailJustCompleted, setTrailJustCompleted] = React.useState(false);
  /** Snapshot when the visit starts, so the finale shows exactly what was banked. */
  const [xpAtStart, setXpAtStart] = React.useState(0);
  const [practiceRun, setPracticeRun] = React.useState(false);

  // Each new step (and the finale) starts at the top of the page, so a child
  // who tapped a button at the bottom never misses the next screen.
  const firstRenderRef = React.useRef(true);
  React.useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
  }, [stage, stepIndex]);

  const steps = React.useMemo<Step[]>(() => {
    const list: Step[] = [{ kind: "learn" }];
    for (const activity of location.activities) list.push({ kind: "activity", activity });
    if (location.quiz) list.push({ kind: "quiz" });
    return list;
  }, [location.activities, location.quiz]);

  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const progressPercent = percent(stepIndex, steps.length);

  const contentHighlights = React.useMemo(() => {
    const highlights = location.contentBlocks
      .map((block) => block.title?.trim())
      .filter((value): value is string => Boolean(value));
    if (highlights.length === 0 && location.shortDescription) {
      return [location.shortDescription];
    }
    return highlights;
  }, [location.contentBlocks, location.shortDescription]);

  /** Announce badge rules and trail context once the visit starts. */
  const beginVisit = React.useCallback(() => {
    const visitorId = getVisitorId();

    if (trail) {
      visitor.startTrail({
        slug: trail.slug,
        name: trail.name,
        knownCompletedSlugs: trail.stops.map((stop) => stop.slug),
      });
      void trackEventAction({
        name: "TRAIL_STARTED",
        trailId: undefined,
        visitorId,
      }).catch(() => undefined);
    }
  }, [trail, visitor]);

  function handleStart() {
    playSound("pop");
    setXpAtStart(visitor.progress.xp);
    setPracticeRun(location.slug in visitor.progress.locations);
    beginVisit();
    setStage("running");
    setStepIndex(0);
  }

  function nextStep() {
    if (stepIndex + 1 >= steps.length) {
      finish();
      return;
    }
    setStepIndex((value) => value + 1);
  }

  const activityPoints = React.useMemo(() => {
    return location.activities.reduce((total, activity) => total + activity.points, 0);
  }, [location.activities]);

  /** Bank everything locally, evaluate badges and record anonymous analytics. */
  const finish = React.useCallback(() => {
    const visitorId = getVisitorId();
    const totalSessionXp = sessionXpRef.current + quizPointsRef.current + completionXp;

    visitor.completeLocation({
      slug: location.slug,
      name: location.name,
      category: location.category,
      // Quiz points are banked with the completion bonus, once per place.
      xp: completionXp + quizPointsRef.current,
      viaCode: viaCode ?? undefined,
      trailSlug: trail?.slug ?? null,
    });

    let completedTrailNow = false;
    if (trail) {
      visitor.discoverTrailStop(trail.slug, location.slug);
      const summary = trail.stops.filter(
        (stop) => stop.slug === location.slug || stop.slug in visitor.progress.locations,
      );
      const alreadyDiscovered = new Set([
        ...Object.keys(visitor.progress.locations),
        location.slug,
      ]);
      completedTrailNow = trail.stops.every((stop) => alreadyDiscovered.has(stop.slug));
      if (completedTrailNow && summary.length > 0) {
        visitor.completeTrail(trail.slug);
        setTrailJustCompleted(true);
        void trackEventAction({ name: "TRAIL_COMPLETED", visitorId }).catch(() => undefined);
      }
    }

    // Badge evaluation runs against the *updated* snapshot on the next tick.
    const earned = visitor.syncBadges(badges, locationCategories);
    if (earned.length > 0) {
      setNewBadges(earned);
      for (const badge of earned) {
        void trackEventAction({
          name: "BADGE_EARNED",
          badgeCode: badge.code,
          visitorId,
        }).catch(() => undefined);
      }
    }

    sessionXpRef.current = totalSessionXp;
    setSessionXp(totalSessionXp);
    setStage("complete");

    void recordLocationCompletedAction(location.id, visitorId, null).catch(() => undefined);
  }, [
    badges,
    completionXp,
    location,
    locationCategories,
    trail,
    visitor,
    viaCode,
  ]);

  function handleActivityCompleted(activityId: string, points: number) {
    setActivitiesDone((previous) =>
      previous.includes(activityId) ? previous : [...previous, activityId],
    );
    if (!visitor.progress.activities.includes(activityId)) {
      addSessionXp(points);
      visitor.completeActivity({
        activityId,
        locationSlug: location.slug,
        locationName: location.name,
        category: location.category,
        viaCode: viaCode ?? undefined,
        points,
      });
    }
  }

  const visitorId = visitor.progress.visitorId || "";

  /* ------------------------------------------------------------ Arrival */
  if (stage === "arrival") {
    return (
      <div className="flex flex-col gap-5">
        <ArrivalScreen
          locationName={location.name}
          shortDescription={location.shortDescription}
          category={location.category}
          icon={location.icon}
          heroImageUrl={location.heroImageUrl}
          heroImageAlt={location.heroImageAlt}
          estimatedMinutes={location.estimatedMinutes}
          trailContext={
            trail
              ? {
                  trailName: trail.name,
                  position: trail.currentPosition,
                  totalStops: trail.totalStops,
                  isLaterStop: trail.isLaterStop,
                }
              : null
          }
          contentHighlights={contentHighlights}
          hasQuiz={Boolean(location.quiz)}
          hasActivities={location.activities.length > 0}
          activityCount={location.activities.length}
          questionCount={location.quiz?.questions.length ?? 0}
          maxXp={
            activityPoints +
            (location.quiz?.questions.reduce((total, question) => total + question.points, 0) ?? 0) +
            completionXp
          }
          onStart={handleStart}
        />

        {otherTrails.length > 0 ? (
          <Card className="p-5">
            <h2 className="font-heading text-sm font-semibold">
              This place is part of {otherTrails.length} trail
              {otherTrails.length === 1 ? "" : "s"}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {trail
                ? `You are following ${trail.name}. Other trails also include this stop.`
                : "You can pick one of these trails to follow from here."}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {otherTrails.map((entry) => (
                <li key={entry.slug}>
                  <Link
                    href={`/trails/${entry.slug}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-accent/50"
                  >
                    <span className="font-medium">{entry.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Stop {entry.position} of {entry.stopCount}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    );
  }

  /* --------------------------------------------------------- Completion */
  if (stage === "complete") {
    const summary = {
      locationName: location.name,
      icon: location.icon,
      category: location.category,
      // Exactly what reached the visitor's total — zero on a practice replay.
      xpAwarded: Math.max(0, visitor.progress.xp - xpAtStart),
      totalXp: visitor.progress.xp,
      practiceRun,
      levelUp: levelUpBetween(xpAtStart, visitor.progress.xp),
      learned: location.contentBlocks.length > 0 || location.description.length > 0,
      observed: location.activities.some((activity) => activity.type === "observation"),
      activityCount: location.activities.length,
      activitiesCompleted: activitiesDone.length,
      quizFinished: Boolean(location.quiz),
      quizScore: quizStats,
    };

    const trailProgressRecord = trail ? visitor.progress.trails[trail.slug] : null;
    const trailProgress = trail
      ? {
          name: trail.name,
          discovered: trailProgressRecord
            ? trailProgressRecord.discovered.length
            : 1,
          total: trail.totalStops,
          completed: Boolean(trailProgressRecord?.completedAt) || trailJustCompleted,
        }
      : null;

    const trailDiscovered = trail
      ? new Set([
          ...(trailProgressRecord?.discovered ?? []),
          location.slug,
          ...Object.keys(visitor.progress.locations),
        ])
      : new Set<string>();

    return (
      <div className="flex flex-col gap-5">
        <CompletionCard
          summary={summary}
          trailProgress={trailProgress}
          newlyEarnedBadges={newBadges}
          allBadges={badges}
          earnedBadgeCodes={visitor.progress.badges}
        >
          {trail && trailJustCompleted ? (
            <TrailCompleteCard
              trailName={trail.name}
              discovered={trail.stops.filter((stop) => trailDiscovered.has(stop.slug)).length}
              total={trail.totalStops}
              stops={trail.stops.map((stop) => ({
                slug: stop.slug,
                name: stop.name,
                discovered: trailDiscovered.has(stop.slug),
              }))}
              newlyEarnedBadges={newBadges}
            />
          ) : null}

          {trail && trail.nextPlace ? (
            <NextPlaceCard
              nextPlace={trail.nextPlace}
              totalStops={trail.totalStops}
              trailName={trail.name}
            />
          ) : null}

          {!trail && recommendedNext ? (
            <Card className="overflow-hidden border-primary/25">
              <div className="border-b border-border bg-accent/60 px-5 py-3.5">
                <p className="text-xs font-semibold tracking-[0.12em] text-primary uppercase">
                  Suggested next place
                </p>
              </div>
              <div className="flex flex-col gap-3 p-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  You are exploring freely. If you would like somewhere to go next, try this place —
                  or follow a trail so every stop is planned for you.
                </p>
                <Button asChild variant="outline" className="w-fit">
                  <Link href={`/locations/${recommendedNext.slug}`}>
                    {recommendedNext.icon ?? "🌿"} {recommendedNext.name}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </Card>
          ) : null}

          {!trail && otherTrails.length > 0 ? (
            <Card className="p-5">
              <h2 className="font-heading text-sm font-semibold">Follow a full trail</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {otherTrails.map((entry) => (
                  <li key={entry.slug}>
                    <Link
                      href={`/trails/${entry.slug}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-accent/50"
                    >
                      <span className="font-medium">{entry.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry.stopCount} stops
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </CompletionCard>
      </div>
    );
  }

  /* ------------------------------------------------------------ Running */
  const stepLabel =
    currentStep.kind === "learn"
      ? "Learning"
      : currentStep.kind === "activity"
        ? "Activity"
        : "Quiz";

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-3xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 via-white to-lime-50 p-4 shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <p className="font-heading text-base font-semibold">
            Step {stepIndex + 1} of {steps.length}
            <span className="font-normal text-muted-foreground"> · {stepLabel}</span>
          </p>
          {practiceRun ? (
            <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
              🔁 Practice run
            </span>
          ) : (
            <span
              key={sessionXp + quizPoints}
              className="animate-bounce-in rounded-full bg-amber-400 px-3 py-1 font-heading text-sm font-bold text-amber-950 tabular-nums shadow-sm"
            >
              ⭐ {sessionXp + quizPoints} XP
            </span>
          )}
        </div>

        {/* The mission path: one stepping stone per step, then the finish flag. */}
        <ol aria-hidden="true" className="flex items-center">
          {steps.map((step, index) => (
            <li key={index} className="flex flex-1 items-center">
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-lg transition-all duration-500",
                  index < stepIndex
                    ? "border-emerald-500 bg-emerald-500 font-bold text-white"
                    : index === stepIndex
                      ? "scale-110 animate-glow-pulse border-amber-400 bg-amber-100"
                      : "border-border bg-card opacity-60 grayscale",
                )}
              >
                {index < stepIndex ? "✓" : stepEmoji(step)}
              </span>
              <span className="mx-1 h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full bg-emerald-500 transition-[width] duration-700"
                  style={{ width: index < stepIndex ? "100%" : "0%" }}
                />
              </span>
            </li>
          ))}
          <li className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-amber-300 bg-white text-lg">
            🏁
          </li>
        </ol>
        <Progress
          value={progressPercent}
          className="sr-only"
          aria-label={`Learning progress: step ${stepIndex + 1} of ${steps.length}`}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
          disabled={stepIndex === 0}
        >
          <ArrowLeft aria-hidden="true" />
          Back
        </Button>
        <span className="text-xs text-muted-foreground">
          {location.name}
          {trail ? ` · Stop ${trail.currentPosition} of ${trail.totalStops}` : ""}
        </span>
      </div>

      {currentStep.kind === "learn" ? (
        <div className="flex flex-col gap-4">
          {location.description ? (
            <ContentBlockCard
              block={{
                id: "location-description",
                type: "text",
                title: `About ${location.name}`,
                body: location.description,
                mediaUrl: null,
                mediaAlt: null,
                mediaCaption: null,
              }}
            />
          ) : null}

          {location.contentBlocks.map((block, index) => (
            <ContentBlockCard
              key={block.id}
              block={block}
              className="animate-rise"
              style={{ animationDelay: `${120 + index * 110}ms` }}
            />
          ))}

          {location.facts.length > 0 ? (
            <Card className="animate-rise rounded-3xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 [animation-delay:350ms]">
              <h3 className="font-heading text-lg font-bold">⚡ Quick facts</h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                {location.facts.map((fact, index) => (
                  <div
                    key={fact.id}
                    className="rounded-2xl border border-sky-100 bg-white px-4 py-3 shadow-soft transition-transform hover:-translate-y-0.5 hover:rotate-[-0.5deg]"
                  >
                    <dt className="text-xs font-bold tracking-wide text-sky-700 uppercase">
                      {["🔹", "🔸", "✨", "🌟"][index % 4]} {fact.label}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ) : null}

          {location.description === "" && location.contentBlocks.length === 0 ? (
            <Card className="flex flex-col items-center gap-3 rounded-3xl p-8 text-center">
              <Mascot mood="think" className="w-20" />
              <h3 className="font-heading text-lg font-bold">Content is on its way</h3>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                The garden team has not published learning cards for this place yet. You can still
                continue to the activity and quiz.
              </p>
            </Card>
          ) : null}

          <Button size="xl" onClick={nextStep} className="group rounded-2xl">
            {stepIndex + 1 >= steps.length ? "Finish this place" : "Continue"}
            <ArrowRight className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Button>
        </div>
      ) : null}

      {currentStep.kind === "activity" ? (
        <>
          <ActivityCard
            // A fresh card per activity, so one activity's answer and feedback
            // never carry over into the next when two follow each other.
            key={currentStep.activity.id}
            activity={currentStep.activity}
            visitorId={visitorId}
            trailId={null}
            onCompleted={(points) => handleActivityCompleted(currentStep.activity.id, points)}
            onContinue={() => {
              if (!activitiesDone.includes(currentStep.activity.id)) {
                handleActivityCompleted(currentStep.activity.id, 0);
              }
              nextStep();
            }}
            continueLabel={stepIndex + 1 >= steps.length ? "Finish this place" : "Continue"}
          />
          {activitiesDone.includes(currentStep.activity.id) ? null : (
            <Button variant="ghost" className="w-fit" onClick={nextStep}>
              Skip for now
              <ArrowRight aria-hidden="true" />
            </Button>
          )}
          {activityPoints > 0 && !activitiesDone.includes(currentStep.activity.id) ? (
            <p className="text-xs text-muted-foreground">
              Completing this activity earns {currentStep.activity.points} XP.
            </p>
          ) : null}
        </>
      ) : null}

      {currentStep.kind === "quiz" && location.quiz ? (
        <QuizFlow
          quiz={location.quiz}
          visitorId={visitorId}
          trailId={null}
          onStarted={() => {
            void recordQuizStartedAction(
              location.quiz!.id,
              location.id,
              getVisitorId(),
              null,
            ).catch(() => undefined);
          }}
          onQuestionAnswered={(input) => {
            addQuizPoints(input.points);
            setQuizStats((previous) => ({
              correct: previous.correct + (input.correct ? 1 : 0),
              answered: previous.answered + 1,
            }));
            visitor.recordQuizAnswer({
              locationSlug: location.slug,
              outcome: input.outcome ?? NEUTRAL_ANSWER_OUTCOME,
              correct: input.correct,
            });
          }}
          onComplete={() => {
            // Points were already added per question in onQuestionAnswered.
            void recordQuizCompletedAction(
              location.quiz!.id,
              location.id,
              getVisitorId(),
              null,
              quizPointsRef.current,
            ).catch(() => undefined);
            // Safe against stale closures: the totals live in refs.
            finish();
          }}
        />
      ) : null}
    </div>
  );
}

/** The picture on each stepping stone of the mission path. */
function stepEmoji(step: Step): string {
  if (step.kind === "learn") return "📖";
  if (step.kind === "quiz") return "❓";
  switch (step.activity.type) {
    case "observation":
      return "👀";
    case "yes_no":
      return "👍";
    case "thinking":
      return "💭";
    default:
      return "🎯";
  }
}
