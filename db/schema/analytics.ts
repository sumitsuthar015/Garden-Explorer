import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { analyticsEventEnum } from "./enums";
import { activities } from "./activities";
import { locations } from "./locations";
import { qrCodes } from "./qr";
import { quizOptions, quizQuestions, quizzes } from "./quizzes";
import { trails } from "./trails";

/**
 * Anonymous analytics.
 *
 * Privacy rules baked into this schema:
 *  - No account, email, name or IP address is ever stored.
 *  - `visitorId` is a random UUID generated in the browser and kept in
 *    localStorage purely to de-duplicate sessions.
 *  - No precise location or device fingerprint.
 */

export const scanEvents = pgTable(
  "scan_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    qrId: uuid("qr_id").references(() => qrCodes.id, { onDelete: "set null" }),
    /** Kept even if the QR row is later deleted, so history stays meaningful. */
    publicCode: text("public_code").notNull(),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    trailId: uuid("trail_id").references(() => trails.id, { onDelete: "set null" }),
    visitorId: text("visitor_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("scan_events_qr_id_idx").on(table.qrId),
    index("scan_events_created_at_idx").on(table.createdAt),
    index("scan_events_location_id_idx").on(table.locationId),
    index("scan_events_trail_id_idx").on(table.trailId),
  ],
);

/** Generic funnel events (LOCATION_VIEWED, TRAIL_STARTED, BADGE_EARNED, …). */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: analyticsEventEnum("name").notNull(),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    trailId: uuid("trail_id").references(() => trails.id, { onDelete: "set null" }),
    quizId: uuid("quiz_id").references(() => quizzes.id, { onDelete: "set null" }),
    badgeCode: text("badge_code"),
    visitorId: text("visitor_id"),
    /** Optional numeric payload, e.g. points awarded. */
    value: integer("value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("analytics_events_name_idx").on(table.name),
    index("analytics_events_created_at_idx").on(table.createdAt),
    index("analytics_events_location_id_idx").on(table.locationId),
    index("analytics_events_trail_id_idx").on(table.trailId),
  ],
);

/** One row per submitted answer — powers "frequently missed questions". */
export const quizAttemptEvents = pgTable(
  "quiz_attempt_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id").references(() => quizzes.id, { onDelete: "set null" }),
    questionId: uuid("question_id").references(() => quizQuestions.id, { onDelete: "set null" }),
    optionId: uuid("option_id").references(() => quizOptions.id, { onDelete: "set null" }),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    visitorId: text("visitor_id"),
    isCorrect: boolean("is_correct").notNull(),
    attemptNumber: integer("attempt_number").notNull().default(1),
    usedHint: boolean("used_hint").notNull().default(false),
    revealed: boolean("revealed").notNull().default(false),
    pointsAwarded: integer("points_awarded").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("quiz_attempt_events_question_id_idx").on(table.questionId),
    index("quiz_attempt_events_created_at_idx").on(table.createdAt),
    index("quiz_attempt_events_location_id_idx").on(table.locationId),
    index("quiz_attempt_events_quiz_id_idx").on(table.quizId),
  ],
);

/** Observation / science activity completions. */
export const activityEvents = pgTable(
  "activity_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    activityId: uuid("activity_id").references(() => activities.id, { onDelete: "set null" }),
    locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
    visitorId: text("visitor_id"),
    completed: boolean("completed").notNull().default(true),
    pointsAwarded: integer("points_awarded").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("activity_events_activity_id_idx").on(table.activityId),
    index("activity_events_created_at_idx").on(table.createdAt),
    index("activity_events_location_id_idx").on(table.locationId),
  ],
);
