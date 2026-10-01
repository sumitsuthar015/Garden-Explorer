import { pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { publishStatusEnum } from "./enums";

/**
 * The architecture supports multiple gardens; the first deployment simply shows
 * a single active garden. Nothing in the query layer assumes exactly one row.
 */
export const gardens = pgTable(
  "gardens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description").notNull().default(""),
    logoUrl: text("logo_url"),
    logoPublicId: text("logo_public_id"),
    coverImageUrl: text("cover_image_url"),
    coverImagePublicId: text("cover_image_public_id"),
    status: publishStatusEnum("status").notNull().default("published"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("gardens_slug_unique_idx").on(table.slug)],
);
