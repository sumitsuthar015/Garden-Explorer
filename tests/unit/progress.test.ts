import { describe, expect, it } from "vitest";

import { createEmptyProgress, completeActivity } from "@/lib/progress/actions";
import { hasAnyProgress, parseStoredProgress } from "@/lib/progress/types";
import { evaluateBadges, hasEarnedBadge, badgeProgress, type BadgeContext, type BadgeDefinition } from "@/lib/badges";

const NOW = "2026-04-18T10:00:00.000Z";
const VISITOR = "3f6b1c2e-0000-4000-8000-000000000001";

function badge(overrides: Partial<BadgeDefinition> = {}): BadgeDefinition {
  return {
    id: "badge-1",
    code: "garden_explorer",
    name: "Garden Explorer",
    description: "You walked the whole trail.",
    icon: "🏆",
    criteriaType: "trail_completed",
    config: { trailSlug: "garden-science-trail" },
    displayOrder: 0,
    ...overrides,
  };
}

function context(overrides: Partial<BadgeContext> = {}): BadgeContext {
  return {
    completedLocationSlugs: [],
    completedTrailSlugs: [],
    activitiesCompleted: 0,
    xp: 0,
    firstTryCorrect: 0,
    answeredQuestions: 0,
    correctAnswers: 0,
    locationCategories: {},
    ...overrides,
  };
}

describe("visitor progress", () => {
  it("starts empty and records nothing personal", () => {
    const progress = createEmptyProgress(VISITOR, NOW);
    expect(hasAnyProgress(progress)).toBe(false);
    expect(progress).not.toHaveProperty("name");
    expect(progress).not.toHaveProperty("email");
    expect(progress.xp).toBe(0);
  });

  it("awards activity points once, no matter how often it is repeated", () => {
    const first = completeActivity(
      createEmptyProgress(VISITOR, NOW),
      {
        activityId: "activity-1",
        locationSlug: "butterfly-garden",
        locationName: "Butterfly Garden",
        category: "animals",
        points: 10,
      },
      NOW,
    );

    const second = completeActivity(
      first,
      {
        activityId: "activity-1",
        locationSlug: "butterfly-garden",
        locationName: "Butterfly Garden",
        category: "animals",
        points: 10,
      },
      NOW,
    );

    expect(first.xp).toBe(10);
    expect(second.xp).toBe(10);
    expect(second.activities).toHaveLength(1);
  });

  it("round-trips through storage and discards corrupt data", () => {
    const progress = createEmptyProgress(VISITOR, NOW);
    expect(parseStoredProgress(JSON.stringify(progress))).toEqual(progress);
    expect(parseStoredProgress("{ not json")).toBeNull();
    expect(parseStoredProgress(null)).toBeNull();
    expect(parseStoredProgress(JSON.stringify({ version: 99 }))).toBeNull();
  });

  it("reports progress once anything has been done", () => {
    const progress = { ...createEmptyProgress(VISITOR, NOW), xp: 15 };
    expect(hasAnyProgress(progress)).toBe(true);
  });
});

describe("badge rules", () => {
  it("awards a specific-trail badge only for that trail", () => {
    expect(
      hasEarnedBadge(badge(), context({ completedTrailSlugs: ["garden-science-trail"] })),
    ).toBe(true);
    expect(hasEarnedBadge(badge(), context({ completedTrailSlugs: ["plant-explorer"] }))).toBe(false);
  });

  it("counts category badges from the local category map", () => {
    const plantBadge = badge({
      code: "plant_detective",
      criteriaType: "category_completed",
      config: { category: "plants", count: 2 },
    });

    const partial = badgeProgress(
      plantBadge,
      context({
        completedLocationSlugs: ["rose-garden"],
        locationCategories: { "rose-garden": "plants" },
      }),
    );
    expect(partial.percent).toBe(50);

    const complete = badgeProgress(
      plantBadge,
      context({
        completedLocationSlugs: ["rose-garden", "medicinal-plant-garden"],
        locationCategories: { "rose-garden": "plants", "medicinal-plant-garden": "plants" },
      }),
    );
    expect(complete.percent).toBe(100);
  });

  it("requires a minimum number of answers before an accuracy badge counts", () => {
    const accuracy = badge({
      code: "sharp_shooter",
      criteriaType: "quiz_accuracy",
      config: { accuracyPercent: 80, minQuestions: 5 },
    });

    const tooFew = badgeProgress(
      accuracy,
      context({ answeredQuestions: 2, correctAnswers: 2 }),
    );
    expect(tooFew.percent).toBe(40);

    // Progress is measured against the target: hitting 80% accuracy completes it.
    const enough = badgeProgress(accuracy, context({ answeredQuestions: 5, correctAnswers: 4 }));
    expect(enough.percent).toBe(100);
    expect(hasEarnedBadge(accuracy, context({ answeredQuestions: 5, correctAnswers: 4 }))).toBe(true);

    const nearly = badgeProgress(accuracy, context({ answeredQuestions: 5, correctAnswers: 3 }));
    expect(nearly.percent).toBe(75);
  });

  it("never awards a badge twice and orders reveals by display order", () => {
    const second = badge({ id: "badge-2", code: "trail_finisher", criteriaType: "trails_completed", config: { count: 1 }, displayOrder: 2 });
    const first = badge({ id: "badge-3", code: "first_steps", criteriaType: "locations_completed", config: { count: 1 }, displayOrder: 1 });

    const earned = evaluateBadges(
      [second, first],
      context({ completedLocationSlugs: ["pond"], completedTrailSlugs: ["plant-explorer"] }),
      ["garden_explorer"],
    );

    expect(earned.map((item) => item.code)).toEqual(["first_steps", "trail_finisher"]);
    expect(
      evaluateBadges(
        [second],
        context({ completedTrailSlugs: ["plant-explorer"] }),
        ["trail_finisher"],
      ),
    ).toEqual([]);
  });

  it("caps progress at 100% even when the visitor overshoots", () => {
    const progress = badgeProgress(
      badge({ criteriaType: "locations_completed", config: { count: 2 } }),
      context({ completedLocationSlugs: ["a", "b", "c", "d"] }),
    );
    expect(progress.percent).toBe(100);
    expect(progress.current).toBe(2);
  });
});
