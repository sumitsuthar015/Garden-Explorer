import { asc, count, desc, eq, ilike, inArray, sql, and, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { locations, quizOptions, quizQuestions, quizzes } from "@/db/schema";
import type { Quiz, QuizOption, QuizQuestion } from "@/db/schema";
import type { PublishStatus, QuestionDifficulty } from "@/lib/constants";

/**
 * Quiz queries.
 *
 * Only `getQuizForAdmin` ever selects `isCorrect`. The public shape is built in
 * `db/queries/locations.ts:getPublishedQuizForLocation` and omits answer keys
 * entirely, because grading happens in a server action.
 */

export interface AdminQuizListItem {
  id: string;
  locationId: string;
  locationName: string;
  locationSlug: string;
  title: string;
  status: PublishStatus;
  questionCount: number;
  totalPoints: number;
  updatedAt: Date;
}

export interface AdminQuizFilters {
  page: number;
  pageSize: number;
  search: string;
  status: PublishStatus | "all";
  locationId: string;
  difficulty: QuestionDifficulty | "all";
  sort: string;
  direction: "asc" | "desc";
}

export async function listQuizzesAdmin(
  gardenId: string,
  filters: AdminQuizFilters,
): Promise<{ rows: AdminQuizListItem[]; total: number }> {
  const clauses: SQL[] = [eq(locations.gardenId, gardenId)];

  if (filters.status !== "all") clauses.push(eq(quizzes.status, filters.status));
  if (filters.locationId) clauses.push(eq(quizzes.locationId, filters.locationId));
  if (filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    clauses.push(ilike(quizzes.title, term));
  }
  if (filters.difficulty !== "all") {
    clauses.push(
      sql`exists (select 1 from quiz_questions qq where qq.quiz_id = "quizzes"."id" and qq.difficulty = ${filters.difficulty})`,
    );
  }

  const where = and(...clauses);
  const direction = filters.direction === "asc" ? asc : desc;
  const sortColumn =
    filters.sort === "title" ? quizzes.title : filters.sort === "status" ? quizzes.status : quizzes.updatedAt;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: quizzes.id,
        locationId: quizzes.locationId,
        locationName: locations.name,
        locationSlug: locations.slug,
        title: quizzes.title,
        status: quizzes.status,
        updatedAt: quizzes.updatedAt,
        questionCount: sql<number>`(select count(*) from quiz_questions qq where qq.quiz_id = "quizzes"."id")`,
        totalPoints: sql<number>`(select coalesce(sum(qq.points), 0) from quiz_questions qq where qq.quiz_id = "quizzes"."id")`,
      })
      .from(quizzes)
      .innerJoin(locations, eq(locations.id, quizzes.locationId))
      .where(where)
      .orderBy(direction(sortColumn))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db
      .select({ value: count() })
      .from(quizzes)
      .innerJoin(locations, eq(locations.id, quizzes.locationId))
      .where(where),
  ]);

  return {
    rows: rows.map((row) => ({
      ...row,
      questionCount: Number(row.questionCount ?? 0),
      totalPoints: Number(row.totalPoints ?? 0),
    })),
    total: Number(totalRow?.value ?? 0),
  };
}

export interface AdminQuizQuestion extends QuizQuestion {
  options: QuizOption[];
}

export interface AdminQuizDetail {
  quiz: Quiz;
  locationName: string;
  locationSlug: string;
  locationStatus: PublishStatus;
  questions: AdminQuizQuestion[];
}

export async function getQuizForAdmin(id: string): Promise<AdminQuizDetail | null> {
  const [row] = await db
    .select({
      quiz: quizzes,
      locationName: locations.name,
      locationSlug: locations.slug,
      locationStatus: locations.status,
    })
    .from(quizzes)
    .innerJoin(locations, eq(locations.id, quizzes.locationId))
    .where(eq(quizzes.id, id))
    .limit(1);

  if (!row) return null;

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, id))
    .orderBy(asc(quizQuestions.displayOrder), asc(quizQuestions.createdAt));

  const questionIds = questions.map((question) => question.id);
  const options = questionIds.length
    ? await db
        .select()
        .from(quizOptions)
        .where(inArray(quizOptions.questionId, questionIds))
        .orderBy(asc(quizOptions.displayOrder), asc(quizOptions.createdAt))
    : [];

  const grouped = new Map<string, QuizOption[]>();
  for (const option of options) {
    const list = grouped.get(option.questionId) ?? [];
    list.push(option);
    grouped.set(option.questionId, list);
  }

  return {
    quiz: row.quiz,
    locationName: row.locationName,
    locationSlug: row.locationSlug,
    locationStatus: row.locationStatus,
    questions: questions.map((question) => ({
      ...question,
      options: grouped.get(question.id) ?? [],
    })),
  };
}

/** Grading lookup: exactly the stored truth for one question. */
export async function getQuestionForGrading(questionId: string): Promise<{
  question: QuizQuestion;
  quiz: Quiz;
  locationId: string;
  locationStatus: PublishStatus;
  options: QuizOption[];
} | null> {
  const [row] = await db
    .select({
      question: quizQuestions,
      quiz: quizzes,
      locationStatus: locations.status,
    })
    .from(quizQuestions)
    .innerJoin(quizzes, eq(quizzes.id, quizQuestions.quizId))
    .innerJoin(locations, eq(locations.id, quizzes.locationId))
    .where(eq(quizQuestions.id, questionId))
    .limit(1);

  if (!row) return null;

  const options = await db
    .select()
    .from(quizOptions)
    .where(eq(quizOptions.questionId, questionId))
    .orderBy(asc(quizOptions.displayOrder), asc(quizOptions.createdAt));

  return {
    question: row.question,
    quiz: row.quiz,
    locationId: row.quiz.locationId,
    locationStatus: row.locationStatus,
    options,
  };
}

export async function getQuizSummaryForPublishValidation(quizId: string): Promise<{
  quiz: Quiz;
  questions: { id: string; prompt: string; options: { id: string; text: string; isCorrect: boolean }[] }[];
} | null> {
  const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
  if (!quiz) return null;

  const questions = await db
    .select({ id: quizQuestions.id, prompt: quizQuestions.prompt })
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(asc(quizQuestions.displayOrder));

  const questionIds = questions.map((question) => question.id);
  const options = questionIds.length
    ? await db
        .select({
          id: quizOptions.id,
          questionId: quizOptions.questionId,
          text: quizOptions.text,
          isCorrect: quizOptions.isCorrect,
        })
        .from(quizOptions)
        .where(inArray(quizOptions.questionId, questionIds))
        .orderBy(asc(quizOptions.displayOrder))
    : [];

  return {
    quiz,
    questions: questions.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      options: options
        .filter((option) => option.questionId === question.id)
        .map((option) => ({ id: option.id, text: option.text, isCorrect: option.isCorrect })),
    })),
  };
}

export async function countQuizzes(gardenId: string): Promise<{ total: number; published: number }> {
  const [row] = await db
    .select({
      total: count(),
      published: sql<number>`count(*) filter (where ${quizzes.status} = 'published')`,
    })
    .from(quizzes)
    .innerJoin(locations, eq(locations.id, quizzes.locationId))
    .where(eq(locations.gardenId, gardenId));

  return { total: Number(row?.total ?? 0), published: Number(row?.published ?? 0) };
}
