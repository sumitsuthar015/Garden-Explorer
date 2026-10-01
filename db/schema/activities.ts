import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { activityTypeEnum, publishStatusEnum } from "./enums";
import { locations } from "./locations";

/**
 * Config for each activity type — validated by `lib/validation/activity.ts`.
 *  - observation:     { confirmLabel }             (free, always "correct")
 *  - yes_no:          { answer: boolean }
 *  - multiple_choice: { options: string[], correctIndex: number }
 *  - selection:       { options: string[], correctIndexes: number[] }
 *  - thinking:        { sampleAnswer?: string }    (free text, never graded)
 */
export type ActivityConfig = {
  confirmLabel?: string;
  answer?: boolean;
  options?: string[];
  correctIndex?: number;
  correctIndexes?: number[];
  sampleAnswer?: string;
  minLength?: number;
};

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    type: activityTypeEnum("type").notNull().default("observation"),
    /** The instruction the visitor reads, e.g. "Can you spot a butterfly?" */
    prompt: text("prompt").notNull(),
    hint: text("hint"),
    successMessage: text("success_message").notNull().default("Nice work!"),
    config: jsonb("config").$type<ActivityConfig>().notNull().default({}),
    points: integer("points").notNull().default(10),
    /** Activities run in this order on the location page. */
    displayOrder: integer("display_order").notNull().default(0),
    status: publishStatusEnum("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("activities_location_id_idx").on(table.locationId),
    index("activities_order_idx").on(table.locationId, table.displayOrder),
  ],
);
