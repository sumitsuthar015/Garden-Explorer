import { z } from "zod";

import { PROGRESS_STORAGE_KEY } from "@/lib/constants";

/**
 * Anonymous visitor progress.
 *
 * Stored ONLY in the visitor's own browser (localStorage). No account, no
 * identifier that could be traced back to a person: `visitorId` is a random
 * UUID created in the browser and sent to the analytics endpoint purely to
 * de-duplicate anonymous sessions.
 */

export const PROGRESS_VERSION = 1 as const;

export interface CompletedLocationRecord {
  slug: string;
  name: string;
  category: string;
  xp: number;
  completedAt: string;
  /** QR code that opened this place, when the visitor arrived by scanning. */
  viaCode?: string;
}

export interface QuizStats {
  answered: number;
  correct: number;
  firstTryCorrect: number;
  revealed: number;
}

export interface TrailProgressRecord {
  slug: string;
  name: string;
  discovered: string[];
  startedAt: string;
  completedAt: string | null;
}

export interface VisitorProgress {
  version: typeof PROGRESS_VERSION;
  visitorId: string;
  xp: number;
  locations: Record<string, CompletedLocationRecord>;
  /** Activity ids that have been completed. */
  activities: string[];
  /** Keyed by location slug. */
  quizzes: Record<string, QuizStats>;
  /** Keyed by trail slug. */
  trails: Record<string, TrailProgressRecord>;
  badges: string[];
  createdAt: string;
  updatedAt: string;
}

const quizStatsSchema = z.object({
  answered: z.number().int().min(0),
  correct: z.number().int().min(0),
  firstTryCorrect: z.number().int().min(0),
  revealed: z.number().int().min(0),
});

const visitorProgressSchema = z.object({
  version: z.literal(PROGRESS_VERSION),
  visitorId: z.string().min(1).max(64),
  xp: z.number().int().min(0),
  locations: z.record(
    z.string(),
    z.object({
      slug: z.string(),
      name: z.string(),
      category: z.string(),
      xp: z.number().int(),
      completedAt: z.string(),
      viaCode: z.string().optional(),
    }),
  ),
  activities: z.array(z.string()),
  quizzes: z.record(z.string(), quizStatsSchema),
  trails: z.record(
    z.string(),
    z.object({
      slug: z.string(),
      name: z.string(),
      discovered: z.array(z.string()),
      startedAt: z.string(),
      completedAt: z.string().nullable(),
    }),
  ),
  badges: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Read the progress record out of localStorage, discarding anything corrupt. */
export function parseStoredProgress(raw: string | null): VisitorProgress | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    const result = visitorProgressSchema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export const PROGRESS_KEY = PROGRESS_STORAGE_KEY;

/** True when there is something worth showing on /progress. */
export function hasAnyProgress(progress: VisitorProgress): boolean {
  return (
    progress.xp > 0 ||
    Object.keys(progress.locations).length > 0 ||
    Object.keys(progress.trails).length > 0 ||
    progress.badges.length > 0
  );
}
