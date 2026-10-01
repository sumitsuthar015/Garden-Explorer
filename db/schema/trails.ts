import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { ageGroupEnum, publishStatusEnum, trailDifficultyEnum } from "./enums";
import { gardens } from "./gardens";
import { locations } from "./locations";

/** An ordered walking route through the garden. A location can join many trails. */
export const trails = pgTable(
  "trails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gardenId: uuid("garden_id")
      .notNull()
      .references(() => gardens.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    /** What the visitor will learn — one goal per line, stored as text. */
    goals: text("goals").notNull().default(""),
    difficulty: trailDifficultyEnum("difficulty").notNull().default("easy"),
    ageGroup: ageGroupEnum("age_group").notNull().default("all-ages"),
    estimatedMinutes: integer("estimated_minutes").notNull().default(45),
    coverImageUrl: text("cover_image_url"),
    coverImagePublicId: text("cover_image_public_id"),
    coverImageAlt: text("cover_image_alt"),
    themeColor: text("theme_color"),
    icon: text("icon"),
    status: publishStatusEnum("status").notNull().default("draft"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("trails_slug_unique_idx").on(table.slug),
    index("trails_status_idx").on(table.status),
    index("trails_garden_id_idx").on(table.gardenId),
  ],
);

/**
 * A stop in a trail. `instructionToNext` is the printable walking direction the
 * visitor reads after finishing a stop — this replaces maps entirely.
 */
export const trailStops = pgTable(
  "trail_stops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    trailId: uuid("trail_id")
      .notNull()
      .references(() => trails.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    /** 1-based stop number; recalculated automatically on reorder. */
    position: integer("position").notNull(),
    /** "Leave the Butterfly Garden and follow the central garden path…" */
    instructionToNext: text("instruction_to_next").notNull().default(""),
    estimatedMinutes: integer("estimated_minutes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("trail_stops_trail_position_unique_idx").on(table.trailId, table.position),
    uniqueIndex("trail_stops_trail_location_unique_idx").on(table.trailId, table.locationId),
    index("trail_stops_trail_id_idx").on(table.trailId),
    index("trail_stops_position_idx").on(table.trailId, table.position),
    index("trail_stops_location_id_idx").on(table.locationId),
  ],
);
