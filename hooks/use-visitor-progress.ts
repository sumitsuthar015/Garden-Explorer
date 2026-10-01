"use client";

import { useCallback, useSyncExternalStore } from "react";

import { evaluateBadges, type BadgeDefinition } from "@/lib/badges";
import * as actions from "@/lib/progress/actions";
import {
  getServerSnapshot,
  getSnapshot,
  mutate,
  resetProgress,
  subscribe,
} from "@/lib/progress/store";
import type { VisitorProgress } from "@/lib/progress/types";

export interface ProgressApi {
  progress: VisitorProgress;
  /** False during SSR and the very first render, true once hydrated. */
  ready: boolean;
  completeActivity: (input: actions.ActivityCompletionInput) => void;
  recordQuizAnswer: (input: actions.QuizAnswerInput) => void;
  completeLocation: (input: actions.LocationCompletionInput) => void;
  startTrail: (input: actions.TrailStartInput) => void;
  discoverTrailStop: (trailSlug: string, locationSlug: string) => void;
  completeTrail: (trailSlug: string) => void;
  /** Evaluates badge rules and records any newly earned badge. */
  syncBadges: (
    badges: BadgeDefinition[],
    locationCategories?: Record<string, string>,
  ) => BadgeDefinition[];
  reset: () => void;
}

const now = () => new Date().toISOString();

/** Anonymous, device-local progress. No account and no personal data. */
export function useVisitorProgress(): ProgressApi {
  const progress = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const completeActivity = useCallback((input: actions.ActivityCompletionInput) => {
    mutate((previous) => actions.completeActivity(previous, input, now()));
  }, []);

  const recordQuizAnswer = useCallback((input: actions.QuizAnswerInput) => {
    mutate((previous) => actions.recordQuizAnswer(previous, input, now()));
  }, []);

  const completeLocation = useCallback((input: actions.LocationCompletionInput) => {
    mutate((previous) => actions.completeLocation(previous, input, now()));
  }, []);

  const startTrail = useCallback((input: actions.TrailStartInput) => {
    mutate((previous) => actions.startTrail(previous, input, now()));
  }, []);

  const discoverTrailStop = useCallback((trailSlug: string, locationSlug: string) => {
    mutate((previous) => actions.discoverTrailStop(previous, trailSlug, locationSlug, now()));
  }, []);

  const completeTrail = useCallback((trailSlug: string) => {
    mutate((previous) => actions.completeTrail(previous, trailSlug, now()));
  }, []);

  const syncBadges = useCallback(
    (badges: BadgeDefinition[], locationCategories: Record<string, string> = {}) => {
      const context = actions.buildBadgeContext(getSnapshot(), locationCategories);
      const earned = evaluateBadges(badges, context, getSnapshot().badges);
      if (earned.length > 0) {
        mutate((previous) =>
          actions.awardBadges(
            previous,
            earned.map((badge) => badge.code),
            now(),
          ),
        );
      }
      return earned;
    },
    [],
  );

  return {
    progress,
    ready: progress.visitorId !== "",
    completeActivity,
    recordQuizAnswer,
    completeLocation,
    startTrail,
    discoverTrailStop,
    completeTrail,
    syncBadges,
    reset: resetProgress,
  };
}
