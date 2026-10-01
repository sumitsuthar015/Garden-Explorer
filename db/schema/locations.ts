import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { contentBlockTypeEnum, locationCategoryEnum, publishStatusEnum } from "./enums";
import { gardens } from "./gardens";

/**
 * A physical place in the garden. Visitors reach these through a QR code or by
 * browsing /explore. There is no GPS or coordinate column by design.
 */
export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gardenId: uuid("garden_id")
      .notNull()
      .references(() => gardens.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    /** One-line summary used on cards and in QR arrival screens. */
    shortDescription: text("short_description").notNull().default(""),
    /** Longer "About this place" copy. Plain text — rendered as paragraphs. */
    description: text("description").notNull().default(""),
    category: locationCategoryEnum("category").notNull().default("plants"),
    heroImageUrl: text("hero_image_url"),
    heroImagePublicId: text("hero_image_public_id"),
    heroImageAlt: text("hero_image_alt"),
    /** Emoji or short glyph shown on cards when no image exists. */
    icon: text("icon"),
    estimatedMinutes: integer("estimated_minutes").notNull().default(5),
    status: publishStatusEnum("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("locations_slug_unique_idx").on(table.slug),
    index("locations_status_idx").on(table.status),
    index("locations_garden_id_idx").on(table.gardenId),
    index("locations_category_idx").on(table.category),
    index("locations_featured_idx").on(table.featured),
  ],
);

/** Ordered short facts ("Height", "Blooms in") shown on the location page. */
export const locationFacts = pgTable(
  "location_facts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    value: text("value").notNull(),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("location_facts_location_id_idx").on(table.locationId),
    index("location_facts_order_idx").on(table.locationId, table.displayOrder),
  ],
);

/**
 * Flexible learning cards. Every location may use as few or as many block
 * types as it needs — nothing is required beyond the location itself.
 */
export const locationContentBlocks = pgTable(
  "location_content_blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    type: contentBlockTypeEnum("type").notNull().default("text"),
    title: text("title"),
    /** Plain text body. Multi-paragraph content is separated by blank lines. */
    body: text("body").notNull().default(""),
    mediaUrl: text("media_url"),
    mediaPublicId: text("media_public_id"),
    mediaAlt: text("media_alt"),
    mediaCaption: text("media_caption"),
    displayOrder: integer("display_order").notNull().default(0),
    status: publishStatusEnum("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("location_content_blocks_location_id_idx").on(table.locationId),
    index("location_content_blocks_order_idx").on(table.locationId, table.displayOrder),
    index("location_content_blocks_status_idx").on(table.status),
  ],
);
