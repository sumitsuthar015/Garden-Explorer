import type { BadgeRuleConfig } from "@/db/schema/badges";

/**
 * Badge evaluation.
 *
 * Rules live in the database (`badges.criteriaType` + `badges.config`) so the
 * maths is configurable from /admin/badges and nothing is hardcoded into a UI
 * component. These helpers are pure and run on the client against the
 * anonymous local progress record.
 */

export const BADGE_CRITERIA_TYPES = [
  "locations_completed",
  "trail_completed",
  "trails_completed",
  "quiz_first_try",
  "activities_completed",
  "xp_earned",
  "category_completed",
  "location_completed",
  "quiz_accuracy",
] as const;
export type BadgeCriteriaType = (typeof BADGE_CRITERIA_TYPES)[number];

export const BADGE_CRITERIA_LABELS: Record<BadgeCriteriaType, string> = {
  locations_completed: "Places discovered",
  trail_completed: "Complete a specific trail",
  trails_completed: "Trails completed",
  quiz_first_try: "Questions answered correctly first try",
  activities_completed: "Activities completed",
  xp_earned: "XP earned",
  category_completed: "Places completed in a category",
  location_completed: "A specific place completed",
  quiz_accuracy: "Quiz accuracy",
};

export interface BadgeDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  criteriaType: BadgeCriteriaType;
  config: BadgeRuleConfig;
  displayOrder: number;
}

export interface BadgeContext {
  /** Slugs of every place the visitor has completed. */
  completedLocationSlugs: string[];
  completedTrailSlugs: string[];
  activitiesCompleted: number;
  xp: number;
  firstTryCorrect: number;
  answeredQuestions: number;
  correctAnswers: number;
  /** Category lookup for slug -> category, used by category_completed. */
  locationCategories: Record<string, string>;
}

export type BadgeProgress = {
  current: number;
  target: number;
  percent: number;
};

/** How far along a visitor is toward a single badge (0-100). */
export function badgeProgress(badge: BadgeDefinition, context: BadgeContext): BadgeProgress {
  const config = badge.config ?? {};

  switch (badge.criteriaType) {
    case "locations_completed": {
      const target = config.count ?? 1;
      const current = context.completedLocationSlugs.length;
      return toProgress(current, target);
    }
    case "trails_completed": {
      const target = config.count ?? 1;
      const current = context.completedTrailSlugs.length;
      return toProgress(current, target);
    }
    case "trail_completed": {
      const target = 1;
      const current = config.trailSlug && context.completedTrailSlugs.includes(config.trailSlug) ? 1 : 0;
      return toProgress(current, target);
    }
    case "location_completed": {
      const target = 1;
      const current =
        config.locationSlug && context.completedLocationSlugs.includes(config.locationSlug) ? 1 : 0;
      return toProgress(current, target);
    }
    case "category_completed": {
      const target = config.count ?? 1;
      const current = config.category
        ? context.completedLocationSlugs.filter(
            (slug) => context.locationCategories[slug] === config.category,
          ).length
        : 0;
      return toProgress(current, target);
    }
    case "quiz_first_try": {
      const target = config.count ?? 1;
      return toProgress(context.firstTryCorrect, target);
    }
    case "activities_completed": {
      const target = config.count ?? 1;
      return toProgress(context.activitiesCompleted, target);
    }
    case "xp_earned": {
      const target = config.count ?? 1;
      return toProgress(context.xp, target);
    }
    case "quiz_accuracy": {
      const minimum = config.minQuestions ?? 5;
      const targetPercent = config.accuracyPercent ?? 80;
      if (context.answeredQuestions < minimum) {
        return toProgress(context.answeredQuestions, minimum);
      }
      const accuracy =
        context.answeredQuestions === 0
          ? 0
          : Math.round((context.correctAnswers / context.answeredQuestions) * 100);
      return toProgress(accuracy, targetPercent);
    }
    default:
      return { current: 0, target: 1, percent: 0 };
  }
}

function toProgress(current: number, target: number): BadgeProgress {
  const safeTarget = target > 0 ? target : 1;
  return {
    current: Math.min(current, safeTarget),
    target: safeTarget,
    percent: Math.min(100, Math.round((current / safeTarget) * 100)),
  };
}

export function hasEarnedBadge(badge: BadgeDefinition, context: BadgeContext): boolean {
  return badgeProgress(badge, context).percent >= 100;
}

/** All badges newly earned for a given context, ordered for a nice reveal. */
export function evaluateBadges(
  badges: BadgeDefinition[],
  context: BadgeContext,
  alreadyEarned: string[] = [],
): BadgeDefinition[] {
  const earned = new Set(alreadyEarned);
  return badges
    .filter((badge) => !earned.has(badge.code) && hasEarnedBadge(badge, context))
    .sort((a, b) => a.displayOrder - b.displayOrder);
}
