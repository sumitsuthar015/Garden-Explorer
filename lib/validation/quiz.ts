import { z } from "zod";

import { QUESTION_DIFFICULTIES } from "@/lib/constants";
import {
  displayOrderSchema,
  optionalTextSchema,
  pointsSchema,
  publishStatusSchema,
  uuidSchema,
} from "./common";

export const quizOptionSchema = z.object({
  id: uuidSchema.optional(),
  text: z
    .string()
    .trim()
    .min(1, "Option text is required")
    .max(160, "Option text must be 160 characters or fewer"),
  isCorrect: z.coerce.boolean().default(false),
  displayOrder: displayOrderSchema,
});

export const quizQuestionSchema = z.object({
  id: uuidSchema.optional(),
  quizId: uuidSchema.optional(),
  prompt: z
    .string()
    .trim()
    .min(5, "Question must be at least 5 characters")
    .max(400, "Question must be 400 characters or fewer"),
  hint: optionalTextSchema(400),
  explanation: optionalTextSchema(600),
  points: pointsSchema.default(20),
  difficulty: z.enum(QUESTION_DIFFICULTIES).default("easy"),
  displayOrder: displayOrderSchema,
  options: z.array(quizOptionSchema).max(8).default([]),
});

export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;
export type QuizOptionInput = z.infer<typeof quizOptionSchema>;

export const quizSchema = z.object({
  id: uuidSchema.optional(),
  locationId: uuidSchema,
  title: z
    .string()
    .trim()
    .min(2, "Title is required")
    .max(120, "Title must be 120 characters or fewer")
    .default("Quick Quiz"),
  description: optionalTextSchema(400),
  completionPoints: pointsSchema.default(25),
  displayOrder: displayOrderSchema,
  status: publishStatusSchema.default("draft"),
});

export type QuizInput = z.infer<typeof quizSchema>;

/**
 * Publishing guard. A quiz can only go live when every question is solvable —
 * this runs on the server for the *stored* rows, never on client-supplied data.
 */
export interface StoredQuestionForValidation {
  id: string;
  prompt: string;
  options: { id: string; text: string; isCorrect: boolean }[];
}

export function validateQuizForPublishing(
  quiz: { title: string },
  questions: StoredQuestionForValidation[],
): string[] {
  const problems: string[] = [];

  if (!quiz.title.trim()) {
    problems.push("Give the quiz a title before publishing.");
  }

  if (questions.length === 0) {
    problems.push("Add at least one question before publishing.");
    return problems;
  }

  questions.forEach((question, index) => {
    const label = `Question ${index + 1}`;
    const options = question.options.filter((option) => option.text.trim().length > 0);

    if (!question.prompt.trim()) {
      problems.push(`${label} is missing its question text.`);
    }

    if (options.length < 2) {
      problems.push(`${label} needs at least two options.`);
    }

    const texts = options.map((option) => option.text.trim().toLowerCase());
    if (new Set(texts).size !== texts.length) {
      problems.push(`${label} has duplicate options.`);
    }

    const correct = options.filter((option) => option.isCorrect);
    if (correct.length === 0) {
      problems.push(`${label} has no correct answer selected.`);
    } else if (correct.length > 1) {
      problems.push(`${label} has more than one correct answer.`);
    }
  });

  return problems;
}

/** Public submission from the learning experience. */
export const quizAnswerSubmissionSchema = z.object({
  questionId: uuidSchema,
  optionId: uuidSchema.nullable().optional(),
  attemptNumber: z.coerce.number().int().min(1).max(10),
  usedHint: z.coerce.boolean().default(false),
  revealed: z.coerce.boolean().default(false),
  visitorId: z.string().trim().max(64).optional(),
  trailId: uuidSchema.optional(),
});

export type QuizAnswerSubmission = z.infer<typeof quizAnswerSubmissionSchema>;

export const quizCompletionSchema = z.object({
  quizId: uuidSchema,
  locationId: uuidSchema,
  visitorId: z.string().trim().max(64).optional(),
  trailId: uuidSchema.optional(),
});

export const reorderQuestionSchema = z.object({
  quizId: uuidSchema,
  orderedIds: z.array(uuidSchema).min(1, "Nothing to reorder"),
});
