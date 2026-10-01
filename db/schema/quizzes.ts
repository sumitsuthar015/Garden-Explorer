import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { publishStatusEnum, questionDifficultyEnum } from "./enums";
import { locations } from "./locations";

/** A short quiz attached to a location. A location may keep more than one. */
export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Quick Quiz"),
    description: text("description"),
    /** Points awarded once the whole quiz is finished (learning-focused). */
    completionPoints: integer("completion_points").notNull().default(25),
    displayOrder: integer("display_order").notNull().default(0),
    status: publishStatusEnum("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("quizzes_location_id_idx").on(table.locationId),
    index("quizzes_status_idx").on(table.status),
  ],
);

export const quizQuestions = pgTable(
  "quiz_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    /** Shown after the first incorrect attempt. */
    hint: text("hint"),
    /** Shown once the answer is correct or revealed. */
    explanation: text("explanation"),
    points: integer("points").notNull().default(20),
    difficulty: questionDifficultyEnum("difficulty").notNull().default("easy"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("quiz_questions_quiz_id_idx").on(table.quizId),
    index("quiz_questions_order_idx").on(table.quizId, table.displayOrder),
    index("quiz_questions_difficulty_idx").on(table.difficulty),
  ],
);

export const quizOptions = pgTable(
  "quiz_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => quizQuestions.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("quiz_options_question_id_idx").on(table.questionId),
    index("quiz_options_order_idx").on(table.questionId, table.displayOrder),
    /**
     * Database-level guarantee that a question can never have two correct
     * answers. Combined with the app-level "exactly one correct" publish check.
     */
    uniqueIndex("quiz_options_single_correct_idx")
      .on(table.questionId)
      .where(sql`${table.isCorrect} = true`),
    uniqueIndex("quiz_options_question_text_unique_idx").on(table.questionId, table.text),
  ],
);
