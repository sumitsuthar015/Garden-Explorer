import type { BadgeContext } from "@/lib/badges";
import type { AnswerOutcome } from "@/lib/scoring";
import {
  PROGRESS_VERSION,
  type CompletedLocationRecord,
  type QuizStats,
  type TrailProgressRecord,
  type VisitorProgress,
} from "./types";

/**
 * Pure progress reducers.
 *
 * Kept free of browser APIs and randomness (the caller passes `now` and the
 * visitor id) so every rule below is unit-testable.
 */

export function createEmptyProgress(visitorId: string, now: string): VisitorProgress {
  return {
    version: PROGRESS_VERSION,
    visitorId,
    xp: 0,
    locations: {},
    activities: [],
    quizzes: {},
    trails: {},
    badges: [],
    createdAt: now,
    updatedAt: now,
  };
}

function touch(progress: VisitorProgress, now: string): VisitorProgress {
  return { ...progress, updatedAt: now };
}

function addXp(progress: VisitorProgress, amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return progress.xp;
  return progress.xp + Math.round(amount);
}

const EMPTY_QUIZ_STATS: QuizStats = {
  answered: 0,
  correct: 0,
  firstTryCorrect: 0,
  revealed: 0,
};

export interface ActivityCompletionInput {
  activityId: string;
  locationSlug: string;
  locationName: string;
  category: string;
  viaCode?: string;
  points: number;
}

/** Mark an activity complete and award its points (idempotent per activity). */
export function completeActivity(
  progress: VisitorProgress,
  input: ActivityCompletionInput,
  now: string,
): VisitorProgress {
  const alreadyDone = progress.activities.includes(input.activityId);

  return touch(
    {
      ...progress,
      // Re-doing an activity from the same browser never double-counts points.
      activities: alreadyDone ? progress.activities : [...progress.activities, input.activityId],
      xp: alreadyDone ? progress.xp : addXp(progress, input.points),
    },
    now,
  );
}

export interface QuizAnswerInput {
  locationSlug: string;
  outcome: AnswerOutcome;
  correct: boolean;
}

/** Fold one answered question into the per-location quiz statistics. */
export function recordQuizAnswer(
  progress: VisitorProgress,
  input: QuizAnswerInput,
  now: string,
): VisitorProgress {
  const current = progress.quizzes[input.locationSlug] ?? EMPTY_QUIZ_STATS;

  const next: QuizStats = {
    answered: current.answered + 1,
    correct: current.correct + (input.correct ? 1 : 0),
    firstTryCorrect: current.firstTryCorrect + (input.outcome === "first_try" ? 1 : 0),
    revealed: current.revealed + (input.outcome === "revealed" ? 1 : 0),
  };

  return touch(
    { ...progress, quizzes: { ...progress.quizzes, [input.locationSlug]: next } },
    now,
  );
}

export interface LocationCompletionInput {
  slug: string;
  name: string;
  category: string;
  xp: number;
  viaCode?: string;
  trailSlug?: string | null;
}

/**
 * Complete a place: records discovery, awards the completion XP once and adds
 * the stop to its trail's discovered list (out-of-order scans are fine).
 */
export function completeLocation(
  progress: VisitorProgress,
  input: LocationCompletionInput,
  now: string,
): VisitorProgress {
  const existing = progress.locations[input.slug];
  const isFirstCompletion = !existing;

  const record: CompletedLocationRecord = existing
    ? { ...existing, completedAt: now, xp: existing.xp }
    : {
        slug: input.slug,
        name: input.name,
        category: input.category,
        xp: Math.round(input.xp),
        completedAt: now,
        viaCode: input.viaCode,
      };

  let trails = progress.trails;
  if (input.trailSlug && trails[input.trailSlug]) {
    const trail = trails[input.trailSlug];
    if (!trail.discovered.includes(input.slug)) {
      trails = {
        ...trails,
        [input.trailSlug]: { ...trail, discovered: [...trail.discovered, input.slug] },
      };
    }
  }

  return touch(
    {
      ...progress,
      locations: { ...progress.locations, [input.slug]: record },
      trails,
      xp: isFirstCompletion ? addXp(progress, input.xp) : progress.xp,
    },
    now,
  );
}

export interface TrailStartInput {
  slug: string;
  name: string;
  /** Stop slugs already completed, so a late start still credits earlier stops. */
  knownCompletedSlugs?: string[];
}

export function startTrail(
  progress: VisitorProgress,
  input: TrailStartInput,
  now: string,
): VisitorProgress {
  if (progress.trails[input.slug]) return progress;

  const discovered = (input.knownCompletedSlugs ?? []).filter(
    (slug) => slug in progress.locations,
  );

  const record: TrailProgressRecord = {
    slug: input.slug,
    name: input.name,
    discovered,
    startedAt: now,
    completedAt: null,
  };

  return touch({ ...progress, trails: { ...progress.trails, [input.slug]: record } }, now);
}

/** Record a free-roam discovery of a stop so the trail list stays truthful. */
export function discoverTrailStop(
  progress: VisitorProgress,
  trailSlug: string,
  locationSlug: string,
  now: string,
): VisitorProgress {
  const trail = progress.trails[trailSlug];
  if (!trail || trail.discovered.includes(locationSlug)) return progress;

  return touch(
    {
      ...progress,
      trails: {
        ...progress.trails,
        [trailSlug]: { ...trail, discovered: [...trail.discovered, locationSlug] },
      },
    },
    now,
  );
}

export function completeTrail(
  progress: VisitorProgress,
  trailSlug: string,
  now: string,
): VisitorProgress {
  const trail = progress.trails[trailSlug];
  if (!trail || trail.completedAt) return progress;

  return touch(
    {
      ...progress,
      trails: { ...progress.trails, [trailSlug]: { ...trail, completedAt: now } },
    },
    now,
  );
}

/** Award badges that have not been recorded yet. */
export function awardBadges(
  progress: VisitorProgress,
  codes: string[],
  now: string,
): VisitorProgress {
  const fresh = codes.filter((code) => !progress.badges.includes(code));
  if (fresh.length === 0) return progress;

  return touch({ ...progress, badges: [...progress.badges, ...fresh] }, now);
}

/** Build the badge evaluation context from a progress record. */
export function buildBadgeContext(
  progress: VisitorProgress,
  locationCategories: Record<string, string> = {},
): BadgeContext {
  let answered = 0;
  let correct = 0;
  let firstTry = 0;

  for (const stats of Object.values(progress.quizzes)) {
    answered += stats.answered;
    correct += stats.correct;
    firstTry += stats.firstTryCorrect;
  }

  const categories: Record<string, string> = { ...locationCategories };
  for (const record of Object.values(progress.locations)) {
    categories[record.slug] = record.category;
  }

  return {
    completedLocationSlugs: Object.keys(progress.locations),
    completedTrailSlugs: Object.values(progress.trails)
      .filter((trail) => trail.completedAt !== null)
      .map((trail) => trail.slug),
    activitiesCompleted: progress.activities.length,
    xp: progress.xp,
    firstTryCorrect: firstTry,
    answeredQuestions: answered,
    correctAnswers: correct,
    locationCategories: categories,
  };
}

/** `3 of 7` style summary for a trail. */
export function trailSummary(
  progress: VisitorProgress,
  trailSlug: string,
  totalStops: number,
): { discovered: number; total: number; completed: boolean; percent: number } {
  const trail = progress.trails[trailSlug];
  const discovered = trail ? trail.discovered.length : 0;
  const total = Math.max(totalStops, discovered);
  return {
    discovered,
    total,
    completed: Boolean(trail?.completedAt) || (total > 0 && discovered >= total),
    percent: total === 0 ? 0 : Math.min(100, Math.round((discovered / total) * 100)),
  };
}
