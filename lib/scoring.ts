import { DEFAULT_QUESTION_POINTS, MAX_ANSWER_ATTEMPTS, XP_AWARDS } from "@/lib/constants";

/**
 * Learning-focused scoring.
 *
 * Wrong answers NEVER subtract XP — they simply award less. Point *values*
 * come from the database (admin editable); only the multipliers live here so
 * every surface (server grading, client progress, admin analytics) agrees.
 */

export type AnswerOutcome =
  | "incorrect"
  | "first_try"
  | "after_hint"
  | "after_retry"
  | "revealed";

export const ANSWER_OUTCOME_LABELS: Record<AnswerOutcome, string> = {
  incorrect: "Incorrect",
  first_try: "Correct first try",
  after_hint: "Correct after using the hint",
  after_retry: "Correct after trying again",
  revealed: "Answer revealed",
};

/** Multiplier applied to a question's configured points for each outcome. */
export const MULTIPLIER_BY_OUTCOME: Record<AnswerOutcome, number> = {
  incorrect: 0,
  first_try: XP_AWARDS.firstTry,
  after_hint: XP_AWARDS.afterHint,
  after_retry: XP_AWARDS.afterRetry,
  revealed: XP_AWARDS.revealed,
};

export interface AnswerContext {
  /** 1-based attempt counter. */
  attemptNumber: number;
  usedHint: boolean;
  correct: boolean;
  /** True on the final permitted attempt, when the answer is shown. */
  revealAnswer: boolean;
}

/**
 * Classify a submission.
 * The visitor is always allowed to continue; a "revealed" outcome still awards
 * participation points so nobody is left with nothing.
 */
export function classifyAnswer(context: AnswerContext): AnswerOutcome {
  if (context.correct) {
    if (context.attemptNumber <= 1) return context.usedHint ? "after_hint" : "first_try";
    return "after_retry";
  }
  return context.revealAnswer ? "revealed" : "incorrect";
}

/** Points for one submission. Never negative, never above the question value. */
export function pointsForAnswer(basePoints: number, outcome: AnswerOutcome): number {
  const base = Number.isFinite(basePoints) && basePoints > 0 ? basePoints : DEFAULT_QUESTION_POINTS;
  return Math.max(0, Math.round(base * MULTIPLIER_BY_OUTCOME[outcome]));
}

export function isFinalAttempt(attemptNumber: number): boolean {
  return attemptNumber >= MAX_ANSWER_ATTEMPTS;
}

/**
 * Gentle coaching copy shown after an incorrect answer.
 * Visitors are never blocked, never told they failed, and always offered a retry.
 */
export function wrongAnswerFeedback(attemptNumber: number): {
  title: string;
  body: string;
  action: string;
  willReveal: boolean;
} {
  if (attemptNumber <= 1) {
    return {
      title: "Not quite!",
      body: "That's a good guess.",
      action: "Try Again",
      willReveal: false,
    };
  }
  if (attemptNumber === 2) {
    return {
      title: "Almost there.",
      body: "Have another look at the hint and give it one more go.",
      action: "Try Again",
      willReveal: false,
    };
  }
  return {
    title: "Let's look at it together.",
    body: "Here is the correct answer, and why it is correct.",
    action: "Continue",
    willReveal: true,
  };
}

/** Sum of point awards, floored at zero. */
export function sumPoints(values: number[]): number {
  return values.reduce(
    (total, value) => total + (Number.isFinite(value) ? Math.max(0, value) : 0),
    0,
  );
}
