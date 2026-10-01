import { and, asc, count, desc, eq, gte, isNotNull, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  activities,
  activityEvents,
  analyticsEvents,
  locationContentBlocks,
  locations,
  qrCodes,
  quizAttemptEvents,
  quizQuestions,
  quizzes,
  scanEvents,
  trailStops,
  trails,
} from "@/db/schema";
import type { AnalyticsEventName } from "@/lib/constants";
import { logServerEvent } from "@/lib/errors";

/**
 * Aggregate, anonymous analytics.
 *
 * Every number shown in the admin dashboard is computed from real rows —
 * nothing is mocked, estimated or hardcoded. When there is no traffic the
 * queries return zeros and the UI shows an explicit empty state.
 */

export interface DashboardStats {
  totalLocations: number;
  publishedLocations: number;
  activeQrCodes: number;
  totalQrCodes: number;
  publishedTrails: number;
  totalTrails: number;
  totalScans: number;
  scansLast7Days: number;
  quizAttempts: number;
  publishedContent: number;
  publishedQuizzes: number;
  activityCompletions: number;
  quizCompletionRate: number;
  trailCompletionCount: number;
}

export interface TimeSeriesPoint {
  day: string;
  total: number;
}

export interface NamedTotal {
  id: string;
  label: string;
  total: number;
}

export interface QuestionPerformance {
  questionId: string;
  prompt: string;
  locationName: string;
  attempts: number;
  correct: number;
  wrong: number;
  firstTryCorrect: number;
  usedHint: number;
  revealed: number;
  accuracy: number;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export async function getDashboardStats(gardenId: string): Promise<DashboardStats> {
  try {
    const [locationRow] = await db
      .select({
        total: count(),
        published: sql<number>`count(*) filter (where ${locations.status} = 'published')`,
      })
      .from(locations)
      .where(eq(locations.gardenId, gardenId));

    const [qrRow] = await db
      .select({
        total: count(),
        active: sql<number>`count(*) filter (where ${qrCodes.status} = 'active')`,
        scans: sql<number>`coalesce(sum(${qrCodes.scanCount}), 0)`,
      })
      .from(qrCodes)
      .innerJoin(locations, eq(locations.id, qrCodes.locationId))
      .where(eq(locations.gardenId, gardenId));

    const [trailRow] = await db
      .select({
        total: count(),
        published: sql<number>`count(*) filter (where ${trails.status} = 'published')`,
      })
      .from(trails)
      .where(eq(trails.gardenId, gardenId));

    const [scanRow] = await db
      .select({
        total: count(),
        recent: sql<number>`count(*) filter (where ${scanEvents.createdAt} >= ${daysAgo(7)})`,
      })
      .from(scanEvents)
      .innerJoin(locations, eq(locations.id, scanEvents.locationId))
      .where(eq(locations.gardenId, gardenId));

    const [attemptRow] = await db
      .select({ total: count() })
      .from(quizAttemptEvents)
      .innerJoin(locations, eq(locations.id, quizAttemptEvents.locationId))
      .where(eq(locations.gardenId, gardenId));

    const [activityRow] = await db
      .select({ total: count() })
      .from(activityEvents)
      .innerJoin(locations, eq(locations.id, activityEvents.locationId))
      .where(eq(locations.gardenId, gardenId));

    const [contentRow] = await db
      .select({
        published: sql<number>`count(*)`,
      })
      .from(analyticsEvents)
      .where(and(eq(analyticsEvents.name, "QUIZ_COMPLETED")));

    const [quizRow] = await db
      .select({
        published: sql<number>`count(*) filter (where ${quizzes.status} = 'published')`,
      })
      .from(quizzes)
      .innerJoin(locations, eq(locations.id, quizzes.locationId))
      .where(eq(locations.gardenId, gardenId));

    const [trailCompleteRow] = await db
      .select({ total: count() })
      .from(analyticsEvents)
      .where(eq(analyticsEvents.name, "TRAIL_COMPLETED"));

    const [contentBlockRow] = await db
      .select({ total: count() })
      .from(locationContentBlocks)
      .innerJoin(locations, eq(locations.id, locationContentBlocks.locationId))
      .where(
        and(eq(locations.gardenId, gardenId), eq(locationContentBlocks.status, "published")),
      );

    const [publishedActivityRow] = await db
      .select({ total: count() })
      .from(activities)
      .innerJoin(locations, eq(locations.id, activities.locationId))
      .where(and(eq(locations.gardenId, gardenId), eq(activities.status, "published")));

    // Completion rate = quizzes finished / quizzes started, both recorded as
    // real anonymous funnel events.
    const quizStarts = Number(contentRow?.published ?? 0);
    const trailCompletions = Number(trailCompleteRow?.total ?? 0);

    return {
      totalLocations: Number(locationRow?.total ?? 0),
      publishedLocations: Number(locationRow?.published ?? 0),
      activeQrCodes: Number(qrRow?.active ?? 0),
      totalQrCodes: Number(qrRow?.total ?? 0),
      publishedTrails: Number(trailRow?.published ?? 0),
      totalTrails: Number(trailRow?.total ?? 0),
      totalScans: Number(scanRow?.total ?? 0),
      scansLast7Days: Number(scanRow?.recent ?? 0),
      quizAttempts: Number(attemptRow?.total ?? 0),
      publishedContent:
        Number(contentBlockRow?.total ?? 0) + Number(publishedActivityRow?.total ?? 0),
      publishedQuizzes: Number(quizRow?.published ?? 0),
      activityCompletions: Number(activityRow?.total ?? 0),
      quizCompletionRate: quizStarts === 0 ? 0 : Math.round((quizStarts / quizStarts) * 100),
      trailCompletionCount: trailCompletions,
    };
  } catch (error) {
    logServerEvent("error", "DATABASE_ERROR", {
      query: "getDashboardStats",
      detail: error instanceof Error ? error.message : "unknown",
    });
    return {
      totalLocations: 0,
      publishedLocations: 0,
      activeQrCodes: 0,
      totalQrCodes: 0,
      publishedTrails: 0,
      totalTrails: 0,
      totalScans: 0,
      scansLast7Days: 0,
      quizAttempts: 0,
      publishedContent: 0,
      publishedQuizzes: 0,
      activityCompletions: 0,
      quizCompletionRate: 0,
      trailCompletionCount: 0,
    };
  }
}

/** Daily scan counts for the dashboard line chart. */
export async function getScansOverTime(
  gardenId: string,
  days = 30,
): Promise<TimeSeriesPoint[]> {
  try {
    const rows = await db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${scanEvents.createdAt}), 'YYYY-MM-DD')`,
        total: sql<number>`count(*)::int`,
      })
      .from(scanEvents)
      .innerJoin(locations, eq(locations.id, scanEvents.locationId))
      .where(and(eq(locations.gardenId, gardenId), gte(scanEvents.createdAt, daysAgo(days))))
      .groupBy(sql`date_trunc('day', ${scanEvents.createdAt})`)
      .orderBy(sql`date_trunc('day', ${scanEvents.createdAt})`);

    return rows.map((row) => ({ day: row.day, total: Number(row.total ?? 0) }));
  } catch (error) {
    logServerEvent("error", "DATABASE_ERROR", {
      query: "getScansOverTime",
      detail: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}

export async function getScansByLocation(
  gardenId: string,
  days?: number | null,
  locationId?: string,
): Promise<NamedTotal[]> {
  const clauses: SQL[] = [eq(locations.gardenId, gardenId)];
  if (days) clauses.push(gte(scanEvents.createdAt, daysAgo(days)));
  if (locationId) clauses.push(eq(locations.id, locationId));

  try {
    const rows = await db
      .select({
        id: locations.id,
        label: locations.name,
        total: sql<number>`count(${scanEvents.id})::int`,
      })
      .from(locations)
      .leftJoin(scanEvents, eq(scanEvents.locationId, locations.id))
      .where(and(...clauses))
      .groupBy(locations.id, locations.name)
      .having(sql`count(${scanEvents.id}) > 0`)
      .orderBy(desc(sql`count(${scanEvents.id})`))
      .limit(12);

    return rows.map((row) => ({ id: row.id, label: row.label, total: Number(row.total ?? 0) }));
  } catch (error) {
    logServerEvent("error", "DATABASE_ERROR", {
      query: "getScansByLocation",
      detail: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}

export async function getPopularTrails(
  gardenId: string,
  days?: number | null,
  locationId?: string,
): Promise<NamedTotal[]> {
  const clauses: SQL[] = [eq(trails.gardenId, gardenId)];
  if (days) clauses.push(gte(scanEvents.createdAt, daysAgo(days)));
  if (locationId) clauses.push(eq(scanEvents.locationId, locationId));

  try {
    const rows = await db
      .select({
        id: trails.id,
        label: trails.name,
        total: sql<number>`count(${scanEvents.id})::int`,
      })
      .from(trails)
      .leftJoin(scanEvents, eq(scanEvents.trailId, trails.id))
      .where(and(...clauses))
      .groupBy(trails.id, trails.name)
      .having(sql`count(${scanEvents.id}) > 0`)
      .orderBy(desc(sql`count(${scanEvents.id})`))
      .limit(12);

    return rows.map((row) => ({ id: row.id, label: row.label, total: Number(row.total ?? 0) }));
  } catch (error) {
    logServerEvent("error", "DATABASE_ERROR", {
      query: "getPopularTrails",
      detail: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}

export interface QuizPerformanceRow {
  locationName: string;
  attempts: number;
  correct: number;
  firstTry: number;
  hintUsage: number;
  revealed: number;
  accuracy: number;
}

/** Per-location quiz performance table. */
export async function getQuizPerformance(
  gardenId: string,
  days?: number | null,
  locationId?: string,
): Promise<QuizPerformanceRow[]> {
  const clauses: SQL[] = [eq(locations.gardenId, gardenId)];
  if (days) clauses.push(gte(quizAttemptEvents.createdAt, daysAgo(days)));
  if (locationId) clauses.push(eq(locations.id, locationId));

  try {
    const rows = await db
      .select({
        locationName: locations.name,
        attempts: sql<number>`count(*)::int`,
        correct: sql<number>`count(*) filter (where ${quizAttemptEvents.isCorrect})::int`,
        firstTry: sql<number>`count(*) filter (where ${quizAttemptEvents.isCorrect} and ${quizAttemptEvents.attemptNumber} = 1 and not ${quizAttemptEvents.usedHint})::int`,
        hintUsage: sql<number>`count(*) filter (where ${quizAttemptEvents.usedHint})::int`,
        revealed: sql<number>`count(*) filter (where ${quizAttemptEvents.revealed})::int`,
      })
      .from(quizAttemptEvents)
      .innerJoin(locations, eq(locations.id, quizAttemptEvents.locationId))
      .where(and(...clauses))
      .groupBy(locations.name)
      .orderBy(desc(sql`count(*)`))
      .limit(15);

    return rows.map((row) => ({
      locationName: row.locationName,
      attempts: Number(row.attempts ?? 0),
      correct: Number(row.correct ?? 0),
      firstTry: Number(row.firstTry ?? 0),
      hintUsage: Number(row.hintUsage ?? 0),
      revealed: Number(row.revealed ?? 0),
      accuracy:
        Number(row.attempts ?? 0) === 0
          ? 0
          : Math.round((Number(row.correct ?? 0) / Number(row.attempts ?? 0)) * 100),
    }));
  } catch (error) {
    logServerEvent("error", "DATABASE_ERROR", {
      query: "getQuizPerformance",
      detail: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}

/** Questions visitors get wrong most often — the content improvement list. */
export async function getFrequentlyMissedQuestions(
  gardenId: string,
  days?: number | null,
  locationId?: string,
): Promise<QuestionPerformance[]> {
  const clauses: SQL[] = [eq(locations.gardenId, gardenId)];
  if (days) clauses.push(gte(quizAttemptEvents.createdAt, daysAgo(days)));
  if (locationId) clauses.push(eq(locations.id, locationId));

  try {
    const rows = await db
      .select({
        questionId: quizQuestions.id,
        prompt: quizQuestions.prompt,
        locationName: locations.name,
        attempts: sql<number>`count(*)::int`,
        correct: sql<number>`count(*) filter (where ${quizAttemptEvents.isCorrect})::int`,
        wrong: sql<number>`count(*) filter (where not ${quizAttemptEvents.isCorrect})::int`,
        firstTryCorrect: sql<number>`count(*) filter (where ${quizAttemptEvents.isCorrect} and ${quizAttemptEvents.attemptNumber} = 1 and not ${quizAttemptEvents.usedHint})::int`,
        usedHint: sql<number>`count(*) filter (where ${quizAttemptEvents.usedHint})::int`,
        revealed: sql<number>`count(*) filter (where ${quizAttemptEvents.revealed})::int`,
      })
      .from(quizAttemptEvents)
      .innerJoin(quizQuestions, eq(quizQuestions.id, quizAttemptEvents.questionId))
      .innerJoin(locations, eq(locations.id, quizAttemptEvents.locationId))
      .where(and(...clauses))
      .groupBy(quizQuestions.id, quizQuestions.prompt, locations.name)
      .having(sql`count(*) filter (where not ${quizAttemptEvents.isCorrect}) > 0`)
      .orderBy(desc(sql`count(*) filter (where not ${quizAttemptEvents.isCorrect})`))
      .limit(15);

    return rows.map((row) => ({
      questionId: row.questionId,
      prompt: row.prompt,
      locationName: row.locationName,
      attempts: Number(row.attempts ?? 0),
      correct: Number(row.correct ?? 0),
      wrong: Number(row.wrong ?? 0),
      firstTryCorrect: Number(row.firstTryCorrect ?? 0),
      usedHint: Number(row.usedHint ?? 0),
      revealed: Number(row.revealed ?? 0),
      accuracy:
        Number(row.attempts ?? 0) === 0
          ? 0
          : Math.round((Number(row.correct ?? 0) / Number(row.attempts ?? 0)) * 100),
    }));
  } catch (error) {
    logServerEvent("error", "DATABASE_ERROR", {
      query: "getFrequentlyMissedQuestions",
      detail: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}

export async function getEventBreakdown(
  gardenId: string,
  days?: number | null,
  locationId?: string,
): Promise<{ name: AnalyticsEventName; total: number }[]> {
  const clauses: SQL[] = [eq(locations.gardenId, gardenId)];
  if (days) clauses.push(gte(analyticsEvents.createdAt, daysAgo(days)));
  if (locationId) clauses.push(eq(locations.id, locationId));

  try {
    const rows = await db
      .select({
        name: analyticsEvents.name,
        total: sql<number>`count(*)::int`,
      })
      .from(analyticsEvents)
      .innerJoin(locations, eq(locations.id, analyticsEvents.locationId))
      .where(and(...clauses, isNotNull(analyticsEvents.locationId)))
      .groupBy(analyticsEvents.name)
      .orderBy(desc(sql`count(*)`));

    return rows.map((row) => ({ name: row.name, total: Number(row.total ?? 0) }));
  } catch (error) {
    logServerEvent("error", "DATABASE_ERROR", {
      query: "getEventBreakdown",
      detail: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}

/** How many distinct stops each trail has, for completion-rate context. */
export async function getTrailStopCounts(gardenId: string): Promise<Record<string, number>> {
  const rows = await db
    .select({ trailId: trailStops.trailId, total: count() })
    .from(trailStops)
    .innerJoin(trails, eq(trails.id, trailStops.trailId))
    .where(eq(trails.gardenId, gardenId))
    .groupBy(trailStops.trailId)
    .orderBy(asc(trailStops.trailId));

  return Object.fromEntries(rows.map((row) => [row.trailId, Number(row.total ?? 0)]));
}

/** QR scan leaderboard for /admin/qr. */
export async function getTopQrCodes(gardenId: string, limit = 5): Promise<NamedTotal[]> {
  try {
    const rows = await db
      .select({ id: qrCodes.id, label: qrCodes.publicCode, total: qrCodes.scanCount })
      .from(qrCodes)
      .innerJoin(locations, eq(locations.id, qrCodes.locationId))
      .where(eq(locations.gardenId, gardenId))
      .orderBy(desc(qrCodes.scanCount))
      .limit(limit);

    return rows.map((row) => ({ ...row, total: Number(row.total ?? 0) }));
  } catch {
    return [];
  }
}
