import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { user } from "./auth";

/**
 * Cloudinary-backed media register.
 *
 * Vercel has no persistent filesystem, so nothing is ever stored locally:
 * the Cloudinary `publicId` + `secureUrl` pair is the single source of truth.
 */
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: text("public_id").notNull(),
    secureUrl: text("secure_url").notNull(),
    resourceType: text("resource_type").notNull().default("image"),
    format: text("format"),
    bytes: integer("bytes").notNull().default(0),
    width: integer("width"),
    height: integer("height"),
    /** Sanitised display name — never used as a filesystem path. */
    originalFilename: text("original_filename"),
    alt: text("alt"),
    folder: text("folder"),
    uploadedBy: text("uploaded_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("media_assets_public_id_unique_idx").on(table.publicId),
    index("media_assets_created_at_idx").on(table.createdAt),
    index("media_assets_folder_idx").on(table.folder),
  ],
);
