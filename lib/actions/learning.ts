"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { activities, locations, trails } from "@/db/schema";
import { getQuestionForGrading } from "@/db/queries/quizzes";
import { resolveQrCode } from "@/db/queries/qr";
import {
  recordActivityEvent,
  recordAnalyticsEvent,
  recordQuizAttempt,
  recordScanEvent,
} from "@/lib/analytics";
import { MAX_ANSWER_ATTEMPTS } from "@/lib/constants";
import { AppError, type ActionResult } from "@/lib/errors";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/security";
import { classifyAnswer, isFinalAttempt, pointsForAnswer, type AnswerOutcome } from "@/lib/scoring";
import {
  activitySubmissionSchema,
  analyticsEventSchema,
  publicCodeSchema,
  quizAnswerSubmissionSchema,
} from "@/lib/validation";
import { runAction } from "./helpers";

/**
 * Public server actions for the learning experience.
 *
 * SECURITY CONTRACT
 *  - The browser never receives correct answers or answer keys.
 *  - Grading always reads the stored row; client-supplied "correct" flags,
 *    points or outcomes are ignored entirely.
 *  - XP is anonymous and device-local by design (there is no visitor account),
 *    so the values returned here only ever drive that local display.
 *  - Every action is rate limited and Zod validated.
 */

export interface ScanRecorded {
  recorded: boolean;
}

/** Called once by the /q page so a scan is counted exactly once per visit. */
export async function recordScanAction(
  rawCode: string,
  trailSlug: string | null,
): Promise<ActionResult<ScanRecorded>> {
  return runAction("QR_RESOLUTION_FAILED", async () => {
    await enforceRateLimit(RATE_LIMITS.scanResolve);

    const code = publicCodeSchema.parse(rawCode);
    const resolution = await resolveQrCode(code);
    if (resolution.status !== "ok") {
      throw new AppError(resolution.status === "not_found" ? "QR_NOT_FOUND" : "QR_INACTIVE");
    }

    // A visitor following a specific trail from the location page overrides the
    // QR's configured primary trail for this scan.
    let trailId = resolution.primaryTrail?.id ?? null;
    if (trailSlug) {
      const [trail] = await db
        .select({ id: trails.id })
        .from(trails)
        .where(and(eq(trails.slug, trailSlug), eq(trails.status, "published")))
        .limit(1);
      trailId = trail?.id ?? trailId;
    }

    await recordScanEvent({
      publicCode: code,
      qrId: resolution.qr.id,
      locationId: resolution.location.id,
      trailId,
    });

    return { recorded: true };
  });
}

export interface QuizAnswerResult {
  correct: boolean;
  outcome: AnswerOutcome;
  pointsAwarded: number;
  attemptNumber: number;
  /** False once the visitor has used up their tries and seen the answer. */
  canRetry: boolean;
  showHint: boolean;
  hint: string | null;
  revealAnswer: boolean;
  explanation: string | null;
  /** Only populated when the answer is correct or has been revealed. */
  correctOptionId: string | null;
  correctOptionText: string | null;
}

/**
 * Grade one quiz answer.
 *
 * Wrong answers never block the visitor:
 *  attempt 1 -> hint offered, learn a little
 *  attempt 2 -> hint repeated, "almost there"
 *  attempt 3 -> answer revealed with an explanation, visitor continues
 */
export async function submitQuizAnswerAction(
  rawInput: unknown,
): Promise<ActionResult<QuizAnswerResult>> {
  return runAction("QUIZ_SUBMISSION_FAILED", async () => {
    await enforceRateLimit(RATE_LIMITS.quizAnswer);

    const input = quizAnswerSubmissionSchema.parse(rawInput);
    const stored = await getQuestionForGrading(input.questionId);

    if (!stored) throw new AppError("QUIZ_INVALID");
    // A draft/unpublished quiz must never be graded or leak its answers.
    if (stored.quiz.status !== "published" || stored.locationStatus !== "published") {
      throw new AppError("QUIZ_INVALID");
    }

    const correctOption = stored.options.find((option) => option.isCorrect) ?? null;
    if (!correctOption) throw new AppError("QUIZ_INVALID");

    const attemptNumber = Math.min(input.attemptNumber, MAX_ANSWER_ATTEMPTS);
    const selected = input.optionId
      ? stored.options.find((option) => option.id === input.optionId) ?? null
      : null;

    const correct = Boolean(selected && selected.isCorrect);
    const finalAttempt = isFinalAttempt(attemptNumber);
    const revealAnswer = !correct && finalAttempt;

    const outcome = classifyAnswer({
      attemptNumber,
      usedHint: input.usedHint,
      correct,
      revealAnswer,
    });

    const pointsAwarded = correct || revealAnswer
      ? pointsForAnswer(stored.question.points, outcome)
      : 0;

    await recordQuizAttempt({
      quizId: stored.quiz.id,
      questionId: stored.question.id,
      optionId: selected?.id ?? null,
      locationId: stored.locationId,
      visitorId: input.visitorId ?? null,
      isCorrect: correct,
      attemptNumber,
      usedHint: input.usedHint,
      revealed: revealAnswer,
      pointsAwarded,
    });

    await recordAnalyticsEvent({
      name: "QUESTION_ANSWERED",
      locationId: stored.locationId,
      trailId: input.trailId ?? null,
      quizId: stored.quiz.id,
      visitorId: input.visitorId ?? null,
      value: pointsAwarded,
    });

    const disclosed = correct || revealAnswer;

    return {
      correct,
      outcome,
      pointsAwarded,
      attemptNumber,
      canRetry: !correct && !revealAnswer,
      showHint: !correct && Boolean(stored.question.hint),
      hint: !correct ? stored.question.hint : null,
      revealAnswer,
      explanation: disclosed ? stored.question.explanation : null,
      correctOptionId: disclosed ? correctOption.id : null,
      correctOptionText: disclosed ? correctOption.text : null,
    };
  });
}

export interface ActivityResult {
  correct: boolean;
  completed: boolean;
  pointsAwarded: number;
  message: string;
  hint: string | null;
  /** Set for choice activities once the visitor is correct or out of tries. */
  correctIndexes: number[] | null;
  sampleAnswer: string | null;
}

/**
 * Grade an observation / science activity.
 * Observation and thinking activities are never "wrong" — they simply complete.
 */
export async function submitActivityAction(
  rawInput: unknown,
): Promise<ActionResult<ActivityResult>> {
  return runAction("ACTIVITY_SUBMISSION_FAILED", async () => {
    await enforceRateLimit(RATE_LIMITS.activitySubmit);

    const input = activitySubmissionSchema.parse(rawInput);

    const [row] = await db
      .select({
        activity: activities,
        locationStatus: locations.status,
      })
      .from(activities)
      .innerJoin(locations, eq(locations.id, activities.locationId))
      .where(eq(activities.id, input.activityId))
      .limit(1);

    if (!row || row.locationStatus !== "published" || row.activity.status !== "published") {
      throw new AppError("NOT_FOUND", { message: "That activity is not available right now." });
    }

    const { activity } = row;
    const config = activity.config ?? {};
    const options = config.options ?? [];

    let correct = true;
    let correctIndexes: number[] | null = null;

    switch (activity.type) {
      case "yes_no": {
        correct = typeof input.yesNo === "boolean" && input.yesNo === Boolean(config.answer);
        break;
      }
      case "multiple_choice": {
        const selectedIndex = input.selectedIndexes?.[0];
        correct = typeof selectedIndex === "number" && selectedIndex === config.correctIndex;
        if (correct) correctIndexes = [config.correctIndex ?? 0];
        break;
      }
      case "selection": {
        const expected = [...(config.correctIndexes ?? [])].sort((a, b) => a - b);
        const given = [...(input.selectedIndexes ?? [])].sort((a, b) => a - b);
        correct =
          expected.length > 0 &&
          expected.length === given.length &&
          expected.every((value, index) => value === given[index]);
        if (correct) correctIndexes = expected;
        break;
      }
      case "observation":
      case "thinking":
      default:
        correct = true;
    }

    const validIndexes = (input.selectedIndexes ?? []).filter(
      (index) => index >= 0 && index < options.length,
    );
    if (validIndexes.length !== (input.selectedIndexes ?? []).length) {
      throw new AppError("VALIDATION_FAILED", { message: "That option is not part of this activity." });
    }

    const pointsAwarded = correct ? activity.points : 0;

    await recordActivityEvent({
      activityId: activity.id,
      locationId: activity.locationId,
      visitorId: input.visitorId ?? null,
      completed: true,
      pointsAwarded,
    });

    await recordAnalyticsEvent({
      name: "ACTIVITY_COMPLETED",
      locationId: activity.locationId,
      trailId: input.trailId ?? null,
      visitorId: input.visitorId ?? null,
      value: pointsAwarded,
    });

    return {
      correct,
      completed: true,
      pointsAwarded,
      message: correct ? activity.successMessage : "Have another look and try again — you can always retry.",
      hint: correct ? null : activity.hint,
      correctIndexes,
      sampleAnswer: correct ? config.sampleAnswer ?? null : null,
    };
  });
}

/** Record that a quiz was started (anonymous funnel event). */
export async function recordQuizStartedAction(
  quizId: string,
  locationId: string,
  visitorId: string | null,
  trailId: string | null,
): Promise<ActionResult<{ recorded: boolean }>> {
  return runAction("ANALYTICS_WRITE_FAILED", async () => {
    await enforceRateLimit(RATE_LIMITS.analytics);
    await recordAnalyticsEvent({
      name: "QUIZ_STARTED",
      quizId,
      locationId,
      visitorId,
      trailId,
    });
    return { recorded: true };
  });
}

/** Record that a visitor finished a quiz. */
export async function recordQuizCompletedAction(
  quizId: string,
  locationId: string,
  visitorId: string | null,
  trailId: string | null,
  pointsAwarded: number,
): Promise<ActionResult<{ recorded: boolean }>> {
  return runAction("ANALYTICS_WRITE_FAILED", async () => {
    await enforceRateLimit(RATE_LIMITS.analytics);
    await recordAnalyticsEvent({
      name: "QUIZ_COMPLETED",
      quizId,
      locationId,
      visitorId,
      trailId,
      value: pointsAwarded,
    });
    return { recorded: true };
  });
}

/** Record that a learning point was finished. XP itself stays device-local. */
export async function recordLocationCompletedAction(
  locationId: string,
  visitorId: string | null,
  trailId: string | null,
): Promise<ActionResult<{ recorded: boolean }>> {
  return runAction("ANALYTICS_WRITE_FAILED", async () => {
    await enforceRateLimit(RATE_LIMITS.analytics);

    const [row] = await db
      .select({ id: locations.id })
      .from(locations)
      .where(and(eq(locations.id, locationId), eq(locations.status, "published")))
      .limit(1);

    if (!row) throw new AppError("NOT_FOUND");

    await recordAnalyticsEvent({
      name: "LOCATION_VIEWED",
      locationId,
      trailId,
      visitorId,
      value: 1,
    });

    return { recorded: true };
  });
}

/** Generic anonymous event endpoint used for trail start/complete and badges. */
export async function trackEventAction(
  rawInput: unknown,
): Promise<ActionResult<{ recorded: boolean }>> {
  return runAction("ANALYTICS_WRITE_FAILED", async () => {
    await enforceRateLimit(RATE_LIMITS.analytics);

    const input = analyticsEventSchema.parse(rawInput);

    // Badge codes are the only free-text field; keep the table clean.
    if (input.name === "BADGE_EARNED" && !input.badgeCode) {
      throw new AppError("VALIDATION_FAILED", { message: "A badge code is required." });
    }

    await recordAnalyticsEvent({
      name: input.name,
      locationId: input.locationId ?? null,
      trailId: input.trailId ?? null,
      quizId: input.quizId ?? null,
      badgeCode: input.badgeCode ?? null,
      visitorId: input.visitorId ?? null,
      value: input.value ?? null,
    });

    return { recorded: true };
  });
}

export type { ActionResult };
