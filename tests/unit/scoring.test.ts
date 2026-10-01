import { describe, expect, it } from "vitest";

import {
  classifyAnswer,
  isFinalAttempt,
  pointsForAnswer,
  sumPoints,
  wrongAnswerFeedback,
} from "@/lib/scoring";
import { MAX_ANSWER_ATTEMPTS } from "@/lib/constants";

describe("classifyAnswer", () => {
  it("awards the full outcome for a correct first try", () => {
    expect(
      classifyAnswer({ attemptNumber: 1, usedHint: false, correct: true, revealAnswer: false }),
    ).toBe("first_try");
  });

  it("reduces the outcome when the hint was used on the first try", () => {
    expect(
      classifyAnswer({ attemptNumber: 1, usedHint: true, correct: true, revealAnswer: false }),
    ).toBe("after_hint");
  });

  it("treats a correct later attempt as a retry", () => {
    expect(
      classifyAnswer({ attemptNumber: 2, usedHint: false, correct: true, revealAnswer: false }),
    ).toBe("after_retry");
  });

  it("keeps an incorrect answer at incorrect until the answer is revealed", () => {
    expect(
      classifyAnswer({ attemptNumber: 1, usedHint: false, correct: false, revealAnswer: false }),
    ).toBe("incorrect");
    expect(
      classifyAnswer({ attemptNumber: 3, usedHint: false, correct: false, revealAnswer: true }),
    ).toBe("revealed");
  });
});

describe("pointsForAnswer", () => {
  it("never returns a negative score", () => {
    for (const outcome of ["incorrect", "first_try", "after_hint", "after_retry", "revealed"] as const) {
      expect(pointsForAnswer(20, outcome)).toBeGreaterThanOrEqual(0);
    }
  });

  it("never awards more than the configured question value", () => {
    expect(pointsForAnswer(20, "first_try")).toBe(20);
    expect(pointsForAnswer(20, "after_hint")).toBe(15);
    expect(pointsForAnswer(20, "after_retry")).toBe(10);
    expect(pointsForAnswer(20, "revealed")).toBe(5);
  });

  it("awards nothing for an ordinary wrong answer", () => {
    expect(pointsForAnswer(20, "incorrect")).toBe(0);
  });

  it("falls back to the default value when a question has no points", () => {
    expect(pointsForAnswer(0, "first_try")).toBeGreaterThan(0);
  });
});

describe("wrongAnswerFeedback", () => {
  it("never uses failure language", () => {
    for (let attempt = 1; attempt <= MAX_ANSWER_ATTEMPTS; attempt += 1) {
      const feedback = wrongAnswerFeedback(attempt);
      const copy = `${feedback.title} ${feedback.body}`.toLowerCase();
      expect(copy).not.toContain("fail");
      expect(copy).not.toContain("wrong answer");
      expect(copy).not.toContain("incorrect");
    }
  });

  it("offers a retry before revealing the answer", () => {
    expect(wrongAnswerFeedback(1).action).toBe("Try Again");
    expect(wrongAnswerFeedback(1).willReveal).toBe(false);
    expect(wrongAnswerFeedback(2).willReveal).toBe(false);
  });

  it("reveals the answer on the final attempt and lets the visitor continue", () => {
    const final = wrongAnswerFeedback(MAX_ANSWER_ATTEMPTS);
    expect(final.willReveal).toBe(true);
    expect(final.action).toBe("Continue");
  });
});

describe("isFinalAttempt", () => {
  it("matches the configured attempt limit", () => {
    expect(isFinalAttempt(MAX_ANSWER_ATTEMPTS - 1)).toBe(false);
    expect(isFinalAttempt(MAX_ANSWER_ATTEMPTS)).toBe(true);
  });
});

describe("sumPoints", () => {
  it("ignores junk values and floors at zero", () => {
    expect(sumPoints([])).toBe(0);
    expect(sumPoints([10, 15, 5])).toBe(30);
    expect(sumPoints([-50, 10])).toBe(10);
    expect(sumPoints([Number.NaN, 10])).toBe(10);
  });
});
