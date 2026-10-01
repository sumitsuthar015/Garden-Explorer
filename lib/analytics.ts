import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  activities as activitiesTable,
  activityEvents,
  analyticsEvents,
  qrCodes,
  quizAttemptEvents,
  quizzes,
  scanEvents,
  siteSettings,
} from "@/db/schema";
import type { AnalyticsEventName } from "@/lib/constants";
import { logServerEvent } from "@/lib/errors";

/**
 * Anonymous analytics.
 *
 * Every function here is best-effort: a failed analytics write must NEVER break
 * the visitor's learning experience, so errors are logged and swallowed.
 *
 * Privacy: no IP address, no user agent, no email. `visitorId` is a random
 * browser-generated UUID used only to de-duplicate sessions.
 */

async function analyticsEnabled(gardenId: string | null): Promise<boolean> {
  if (!gardenId) return true;
  try {
    const [row] = await db
      .select({ enabled: siteSettings.analyticsEnabled })
      .from(siteSettings)
      .where(eq(siteSettings.gardenId, gardenId))
      .limit(1);
    return row?.enabled ?? true;
  } catch {
    return true;
  }
}

export interface ScanEventInput {
  publicCode: string;
  qrId: string | null;
  locationId: string | null;
  trailId: string | null;
  visitorId?: string | null;
  gardenId?: string | null;
}

/**
 * Record a QR scan: bump the counter, stamp `last_scanned_at` and append a row
 * to `scan_events`. Runs in one transaction so the counters cannot drift.
 */
export async function recordScanEvent(input: ScanEventInput): Promise<void> {
  try {
    if (!(await analyticsEnabled(input.gardenId ?? null))) return;

    await db.transaction(async (tx) => {
      if (input.qrId) {
        await tx
          .update(qrCodes)
          .set({
            scanCount: sql`${qrCodes.scanCount} + 1`,
            lastScannedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(qrCodes.id, input.qrId));
      }

      await tx.insert(scanEvents).values({
        qrId: input.qrId,
        publicCode: input.publicCode,
        locationId: input.locationId,
        trailId: input.trailId,
        visitorId: input.visitorId ?? null,
      });

      await tx.insert(analyticsEvents).values({
        name: "QR_SCANNED",
        locationId: input.locationId,
        trailId: input.trailId,
        visitorId: input.visitorId ?? null,
      });
    });
  } catch (error) {
    logServerEvent("warn", "ANALYTICS_WRITE_FAILED", {
      table: "scan_events",
      publicCode: input.publicCode,
      detail: error instanceof Error ? error.message : "unknown",
    });
  }
}

export interface AnalyticsEventInput {
  name: AnalyticsEventName;
  locationId?: string | null;
  trailId?: string | null;
  quizId?: string | null;
  badgeCode?: string | null;
  visitorId?: string | null;
  value?: number | null;
}

export async function recordAnalyticsEvent(input: AnalyticsEventInput): Promise<void> {
  try {
    await db.insert(analyticsEvents).values({
      name: input.name,
      locationId: input.locationId ?? null,
      trailId: input.trailId ?? null,
      quizId: input.quizId ?? null,
      badgeCode: input.badgeCode ?? null,
      visitorId: input.visitorId ?? null,
      value: input.value ?? null,
    });
  } catch (error) {
    logServerEvent("warn", "ANALYTICS_WRITE_FAILED", {
      table: "analytics_events",
      name: input.name,
      detail: error instanceof Error ? error.message : "unknown",
    });
  }
}

export interface QuizAttemptInput {
  quizId: string;
  questionId: string;
  optionId: string | null;
  locationId: string | null;
  visitorId?: string | null;
  isCorrect: boolean;
  attemptNumber: number;
  usedHint: boolean;
  revealed: boolean;
  pointsAwarded: number;
}

export async function recordQuizAttempt(input: QuizAttemptInput): Promise<void> {
  try {
    await db.insert(quizAttemptEvents).values({
      quizId: input.quizId,
      questionId: input.questionId,
      optionId: input.optionId,
      locationId: input.locationId,
      visitorId: input.visitorId ?? null,
      isCorrect: input.isCorrect,
      attemptNumber: input.attemptNumber,
      usedHint: input.usedHint,
      revealed: input.revealed,
      pointsAwarded: input.pointsAwarded,
    });
  } catch (error) {
    logServerEvent("warn", "QUIZ_SUBMISSION_FAILED", {
      stage: "analytics",
      questionId: input.questionId,
      detail: error instanceof Error ? error.message : "unknown",
    });
  }
}

export interface ActivityEventRecordInput {
  activityId: string;
  locationId: string | null;
  visitorId?: string | null;
  completed: boolean;
  pointsAwarded: number;
}

export async function recordActivityEvent(input: ActivityEventRecordInput): Promise<void> {
  try {
    await db.insert(activityEvents).values({
      activityId: input.activityId,
      locationId: input.locationId,
      visitorId: input.visitorId ?? null,
      completed: input.completed,
      pointsAwarded: input.pointsAwarded,
    });
  } catch (error) {
    logServerEvent("warn", "ANALYTICS_WRITE_FAILED", {
      table: "activity_events",
      activityId: input.activityId,
      detail: error instanceof Error ? error.message : "unknown",
    });
  }
}

/**
 * Guard used by the public analytics endpoint: an event may only reference a
 * quiz/activity that really exists and is published. Prevents junk injection.
 */
export async function assertionTargetIsPublic(input: {
  quizId?: string | null;
}): Promise<boolean> {
  if (!input.quizId) return true;
  try {
    const [row] = await db
      .select({ status: quizzes.status })
      .from(quizzes)
      .where(and(eq(quizzes.id, input.quizId), eq(quizzes.status, "published")))
      .limit(1);
    return Boolean(row);
  } catch {
    return false;
  }
}

export async function activityExists(activityId: string): Promise<boolean> {
  try {
    const [row] = await db
      .select({ id: activitiesTable.id })
      .from(activitiesTable)
      .where(eq(activitiesTable.id, activityId))
      .limit(1);
    return Boolean(row);
  } catch {
    return false;
  }
}
