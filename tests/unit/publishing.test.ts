import { describe, expect, it } from "vitest";

import { validateQuizForPublishing, type StoredQuestionForValidation } from "@/lib/validation/quiz";
import { validateTrailForPublishing } from "@/lib/validation/trail";

describe("validateQuizForPublishing", () => {
  const question = (overrides: Partial<StoredQuestionForValidation> = {}): StoredQuestionForValidation => ({
    id: "question-1",
    prompt: "Why do butterflies visit flowers?",
    options: [
      { id: "a", text: "They find nectar", isCorrect: true },
      { id: "b", text: "They grow leaves", isCorrect: false },
    ],
    ...overrides,
  });

  it("accepts a solvable quiz", () => {
    expect(validateQuizForPublishing({ title: "Quick Quiz" }, [question()])).toEqual([]);
  });

  it("refuses a quiz with no questions", () => {
    expect(validateQuizForPublishing({ title: "Quick Quiz" }, [])).toContain(
      "Add at least one question before publishing.",
    );
  });

  it("refuses a question with fewer than two options", () => {
    const problems = validateQuizForPublishing({ title: "Q" }, [
      question({ options: [{ id: "a", text: "Only one", isCorrect: true }] }),
    ]);
    expect(problems.some((problem) => problem.includes("at least two options"))).toBe(true);
  });

  it("refuses a question with no correct answer", () => {
    const problems = validateQuizForPublishing({ title: "Q" }, [
      question({
        options: [
          { id: "a", text: "One", isCorrect: false },
          { id: "b", text: "Two", isCorrect: false },
        ],
      }),
    ]);
    expect(problems.some((problem) => problem.includes("no correct answer"))).toBe(true);
  });

  it("refuses a question with two correct answers", () => {
    const problems = validateQuizForPublishing({ title: "Q" }, [
      question({
        options: [
          { id: "a", text: "One", isCorrect: true },
          { id: "b", text: "Two", isCorrect: true },
        ],
      }),
    ]);
    expect(problems.some((problem) => problem.includes("more than one correct answer"))).toBe(true);
  });

  it("refuses duplicate options and blank prompts", () => {
    const problems = validateQuizForPublishing({ title: "Q" }, [
      question({
        prompt: "   ",
        options: [
          { id: "a", text: "Same", isCorrect: true },
          { id: "b", text: "same", isCorrect: false },
        ],
      }),
    ]);
    expect(problems.some((problem) => problem.includes("duplicate options"))).toBe(true);
    expect(problems.some((problem) => problem.includes("missing its question text"))).toBe(true);
  });

  it("reports the question number so the admin knows where to look", () => {
    const problems = validateQuizForPublishing({ title: "Q" }, [
      question(),
      question({
        id: "question-2",
        options: [{ id: "c", text: "Alone", isCorrect: true }],
      }),
    ]);
    expect(problems.some((problem) => problem.startsWith("Question 2"))).toBe(true);
  });
});

describe("validateTrailForPublishing", () => {
  const trail = { name: "Garden Science Trail", slug: "garden-science-trail" };
  const published = new Set(["loc-1", "loc-2", "loc-3"]);

  it("accepts a complete trail", () => {
    const problems = validateTrailForPublishing(
      trail,
      [
        { position: 1, locationId: "loc-1", instructionToNext: "Walk past the shed to the rose beds." },
        { position: 2, locationId: "loc-2", instructionToNext: "Continue to the pond decking." },
        { position: 3, locationId: "loc-3", instructionToNext: "" },
      ],
      published,
    );
    expect(problems).toEqual([]);
  });

  it("refuses a trail with no stops", () => {
    expect(validateTrailForPublishing(trail, [], published)).toContain(
      "Add at least one stop before publishing.",
    );
  });

  it("refuses a stop that points at an unpublished location", () => {
    const problems = validateTrailForPublishing(
      trail,
      [
        { position: 1, locationId: "loc-1", instructionToNext: "Go to the pond decking." },
        { position: 2, locationId: "loc-draft", instructionToNext: "" },
      ],
      published,
    );
    expect(problems.some((problem) => problem.includes("unpublished location"))).toBe(true);
  });

  it("refuses a trail whose stops repeat the same location", () => {
    const problems = validateTrailForPublishing(
      trail,
      [
        { position: 1, locationId: "loc-1", instructionToNext: "Follow the path to the pond." },
        { position: 2, locationId: "loc-1", instructionToNext: "" },
      ],
      published,
    );
    expect(problems.some((problem) => problem.includes("twice"))).toBe(true);
  });

  it("refuses a trail with out-of-sequence positions", () => {
    const problems = validateTrailForPublishing(
      trail,
      [
        { position: 2, locationId: "loc-1", instructionToNext: "Walk on to the pond decking." },
        { position: 5, locationId: "loc-2", instructionToNext: "" },
      ],
      published,
    );
    expect(problems.some((problem) => problem.includes("out of sequence"))).toBe(true);
  });

  it("requires written directions between stops, because there is no map", () => {
    const problems = validateTrailForPublishing(
      trail,
      [
        { position: 1, locationId: "loc-1", instructionToNext: "Go on." },
        { position: 2, locationId: "loc-2", instructionToNext: "" },
      ],
      published,
    );
    expect(problems.some((problem) => problem.toLowerCase().includes("direction"))).toBe(true);
  });

  it("does not require directions after the final stop", () => {
    const problems = validateTrailForPublishing(
      trail,
      [{ position: 1, locationId: "loc-1", instructionToNext: "" }],
      published,
    );
    expect(problems.filter((problem) => problem.toLowerCase().includes("direction"))).toEqual([]);
  });

  it("refuses a trail without a name or slug", () => {
    const problems = validateTrailForPublishing(
      { name: "  ", slug: "" },
      [{ position: 1, locationId: "loc-1", instructionToNext: "" }],
      published,
    );
    expect(problems.some((problem) => problem.includes("name"))).toBe(true);
    expect(problems.some((problem) => problem.includes("slug"))).toBe(true);
  });
});
