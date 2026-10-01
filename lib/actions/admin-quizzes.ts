"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { locations, quizOptions, quizQuestions, quizzes } from "@/db/schema";
import {
  getQuizForAdmin,
  getQuizSummaryForPublishValidation,
} from "@/db/queries/quizzes";
import { AppError, type ActionResult } from "@/lib/errors";
import { requireAdminPermission } from "@/lib/permissions";
import {
  quizQuestionSchema,
  quizSchema,
  reorderQuestionSchema,
  validateQuizForPublishing,
} from "@/lib/validation";
import { audit, parseInput, runAction } from "./helpers";

/**
 * Quiz management.
 *
 * Two invariants are enforced here AND at the database level:
 *  - exactly one correct option per question (partial unique index on is_correct)
 *  - a quiz cannot be published unless every question is solvable
 *
 * Options are replaced wholesale inside a transaction rather than patched in
 * place, which keeps the unique indexes happy and makes the saved state match
 * exactly what the admin saw on screen.
 */

const QUIZ_LOG_CODE = "QUIZ_SUBMISSION_FAILED";

function revalidateQuizzes(locationSlug?: string | null) {
  revalidatePath("/admin/quizzes");
  revalidatePath("/admin/content");
  if (locationSlug) revalidatePath(`/locations/${locationSlug}`);
}

export async function createQuizAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(QUIZ_LOG_CODE, async () => {
    const admin = await requireAdminPermission("quiz.create");
    const data = parseInput(quizSchema, input);

    const [location] = await db
      .select({ id: locations.id, slug: locations.slug, name: locations.name })
      .from(locations)
      .where(eq(locations.id, data.locationId))
      .limit(1);
    if (!location) {
      throw new AppError("VALIDATION_FAILED", {
        message: "Choose a garden place for this quiz.",
        fieldErrors: { locationId: ["Choose a garden place"] },
      });
    }

    const [created] = await db
      .insert(quizzes)
      .values({
        locationId: data.locationId,
        title: data.title,
        description: data.description ?? null,
        completionPoints: data.completionPoints,
        displayOrder: data.displayOrder,
        // Always created as a draft: an empty quiz must never be publishable.
        status: "draft",
      })
      .returning({ id: quizzes.id });

    await audit(admin, "QUIZ_CREATED", "quiz", created.id, data.title, {
      locationId: data.locationId,
    });
    revalidateQuizzes(location.slug);

    return created;
  });
}

export async function updateQuizAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(QUIZ_LOG_CODE, async () => {
    const admin = await requireAdminPermission("quiz.update");
    const data = parseInput(quizSchema, input);

    if (!data.id) throw new AppError("BAD_REQUEST", { message: "Missing quiz id." });

    const existing = await getQuizForAdmin(data.id);
    if (!existing) throw new AppError("NOT_FOUND", { message: "That quiz no longer exists." });

    await db
      .update(quizzes)
      .set({
        title: data.title,
        description: data.description ?? null,
        completionPoints: data.completionPoints,
        displayOrder: data.displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(quizzes.id, data.id));

    await audit(admin, "QUIZ_UPDATED", "quiz", data.id, data.title);
    revalidateQuizzes(existing.locationSlug);

    return { id: data.id };
  });
}

/** Create or replace one question together with all of its options. */
export async function saveQuizQuestionAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction("QUIZ_SUBMISSION_FAILED", async () => {
    const admin = await requireAdminPermission("quiz.update");
    const data = parseInput(quizQuestionSchema, input);

    if (!data.quizId) {
      throw new AppError("VALIDATION_FAILED", {
        message: "Missing quiz id.",
        fieldErrors: { quizId: ["Missing quiz id"] },
      });
    }

    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, data.quizId)).limit(1);
    if (!quiz) throw new AppError("NOT_FOUND", { message: "That quiz no longer exists." });

    const options = data.options
      .map((option, index) => ({
        text: option.text.trim(),
        isCorrect: Boolean(option.isCorrect),
        displayOrder: index,
      }))
      .filter((option) => option.text.length > 0);

    if (options.length < 2) {
      throw new AppError("VALIDATION_FAILED", {
        message: "Add at least two answer options.",
        fieldErrors: { options: ["Add at least two answer options"] },
      });
    }

    const correctCount = options.filter((option) => option.isCorrect).length;
    if (correctCount !== 1) {
      throw new AppError("VALIDATION_FAILED", {
        message: "Mark exactly one option as the correct answer.",
        fieldErrors: { options: ["Mark exactly one correct answer"] },
      });
    }

    const lower = options.map((option) => option.text.toLowerCase());
    if (new Set(lower).size !== lower.length) {
      throw new AppError("VALIDATION_FAILED", {
        message: "Options must be unique.",
        fieldErrors: { options: ["Remove duplicate options"] },
      });
    }

    const questionId = await db.transaction(async (tx) => {
      const values = {
        quizId: data.quizId as string,
        prompt: data.prompt,
        hint: data.hint ?? null,
        explanation: data.explanation ?? null,
        points: data.points,
        difficulty: data.difficulty,
        displayOrder: data.displayOrder,
        updatedAt: new Date(),
      };

      let id = data.id;

      if (id) {
        await tx.update(quizQuestions).set(values).where(eq(quizQuestions.id, id));
        // Replace options wholesale so indexes stay consistent.
        await tx.delete(quizOptions).where(eq(quizOptions.questionId, id));
      } else {
        const [created] = await tx
          .insert(quizQuestions)
          .values(values)
          .returning({ id: quizQuestions.id });
        id = created.id;
      }

      await tx.insert(quizOptions).values(
        options.map((option) => ({
          questionId: id as string,
          text: option.text,
          isCorrect: option.isCorrect,
          displayOrder: option.displayOrder,
        })),
      );

      return id;
    });

    await audit(
      admin,
      data.id ? "QUESTION_UPDATED" : "QUESTION_CREATED",
      "quiz_question",
      questionId,
      data.prompt.slice(0, 80),
    );
    revalidateQuizzes();
    revalidatePath(`/admin/quizzes/${data.quizId}`);

    return { id: questionId };
  });
}

export async function deleteQuizQuestionAction(
  questionId: string,
): Promise<ActionResult<{ id: string }>> {
  return runAction(QUIZ_LOG_CODE, async () => {
    const admin = await requireAdminPermission("quiz.update");

    const [question] = await db
      .select({ id: quizQuestions.id, quizId: quizQuestions.quizId })
      .from(quizQuestions)
      .where(eq(quizQuestions.id, questionId))
      .limit(1);
    if (!question) throw new AppError("NOT_FOUND", { message: "That question no longer exists." });

    await db.delete(quizQuestions).where(eq(quizQuestions.id, questionId));
    await audit(admin, "QUESTION_DELETED", "quiz_question", questionId);
    revalidateQuizzes();
    revalidatePath(`/admin/quizzes/${question.quizId}`);

    return { id: questionId };
  });
}

/** Reorder questions, recalculating display order server-side. */
export async function reorderQuizQuestionsAction(
  input: unknown,
): Promise<ActionResult<{ count: number }>> {
  return runAction(QUIZ_LOG_CODE, async () => {
    const admin = await requireAdminPermission("quiz.update");
    const data = parseInput(reorderQuestionSchema, input);

    const existing = await db
      .select({ id: quizQuestions.id })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, data.quizId));

    const known = new Set(existing.map((row) => row.id));
    const ordered = data.orderedIds.filter((id) => known.has(id));
    if (ordered.length === 0) throw new AppError("VALIDATION_FAILED");

    await db.transaction(async (tx) => {
      await tx
        .update(quizQuestions)
        .set({ displayOrder: sql`${quizQuestions.displayOrder} + 10000` })
        .where(eq(quizQuestions.quizId, data.quizId));

      for (const [index, id] of ordered.entries()) {
        await tx
          .update(quizQuestions)
          .set({ displayOrder: index, updatedAt: new Date() })
          .where(and(eq(quizQuestions.id, id), eq(quizQuestions.quizId, data.quizId)));
      }
    });

    await audit(admin, "QUESTION_UPDATED", "quiz", data.quizId, null, {
      reordered: ordered.length,
    });
    revalidatePath(`/admin/quizzes/${data.quizId}`);

    return { count: ordered.length };
  });
}

export async function setQuizStatusAction(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult<{ id: string }>> {
  return runAction(QUIZ_LOG_CODE, async () => {
    const admin = await requireAdminPermission(
      status === "published" ? "quiz.publish" : "quiz.update",
    );

    const summary = await getQuizSummaryForPublishValidation(id);
    if (!summary) throw new AppError("NOT_FOUND", { message: "That quiz no longer exists." });

    // Publishing always revalidates the STORED rows — never client input.
    if (status === "published") {
      const problems = validateQuizForPublishing(summary.quiz, summary.questions);
      if (problems.length > 0) {
        throw new AppError("VALIDATION_FAILED", {
          message: problems.join(" "),
          fieldErrors: { status: problems },
        });
      }
    }

    await db.update(quizzes).set({ status, updatedAt: new Date() }).where(eq(quizzes.id, id));

    await audit(
      admin,
      status === "published" ? "QUIZ_PUBLISHED" : "QUIZ_UNPUBLISHED",
      "quiz",
      id,
      summary.quiz.title,
      { status },
    );
    revalidateQuizzes();
    revalidatePath(`/admin/quizzes/${id}`);

    return { id };
  });
}

export async function deleteQuizAction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(QUIZ_LOG_CODE, async () => {
    const admin = await requireAdminPermission("quiz.delete");

    const existing = await getQuizForAdmin(id);
    if (!existing) throw new AppError("NOT_FOUND", { message: "That quiz no longer exists." });

    if (existing.quiz.status === "published") {
      throw new AppError("CONFLICT", {
        message: "Unpublish this quiz before deleting it.",
      });
    }

    await db.delete(quizzes).where(eq(quizzes.id, id));
    await audit(admin, "QUIZ_DELETED", "quiz", id, existing.quiz.title);
    revalidateQuizzes(existing.locationSlug);

    return { id };
  });
}

/** Validation preview used by the quiz editor before an admin tries to publish. */
export async function checkQuizPublishableAction(
  id: string,
): Promise<ActionResult<{ publishable: boolean; problems: string[] }>> {
  return runAction(QUIZ_LOG_CODE, async () => {
    await requireAdminPermission("quiz.update");

    const summary = await getQuizSummaryForPublishValidation(id);
    if (!summary) throw new AppError("NOT_FOUND");

    const problems = validateQuizForPublishing(summary.quiz, summary.questions);
    return { publishable: problems.length === 0, problems };
  });
}
