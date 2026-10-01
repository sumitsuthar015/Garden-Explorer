import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { badgeCriteriaEnum, publishStatusEnum } from "./enums";

/**
 * Config for a badge rule. Evaluated by the pure functions in `lib/badges.ts`
 * so badge maths is never hardcoded into UI components.
 */
export type BadgeRuleConfig = {
  /** Required count for count-based rules. */
  count?: number;
  /** Trail slug for trail_completed / trails_completed. */
  trailSlug?: string;
  /** Location category for category_completed. */
  category?: string;
  /** Location slug for location_completed. */
  locationSlug?: string;
  /** Minimum quiz accuracy (0-100) for quiz_accuracy. */
  accuracyPercent?: number;
  /** Minimum number of answered questions before accuracy counts. */
  minQuestions?: number;
};

export const badges = pgTable(
  "badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    /** Single emoji so the badge needs no image asset. */
    icon: text("icon").notNull().default("🏅"),
    criteriaType: badgeCriteriaEnum("criteria_type").notNull(),
    config: jsonb("config").$type<BadgeRuleConfig>().notNull().default({}),
    displayOrder: integer("display_order").notNull().default(0),
    status: publishStatusEnum("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("badges_code_unique_idx").on(table.code),
    index("badges_status_idx").on(table.status),
  ],
);
