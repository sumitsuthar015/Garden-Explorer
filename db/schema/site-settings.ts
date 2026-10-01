import { boolean, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { gardens } from "./gardens";
import { trails } from "./trails";
import { user } from "./auth";

/**
 * Typed site settings — one row per garden. Branding, SEO and contact details
 * are editable from /admin/settings so normal updates never require a deploy.
 */
export const siteSettings = pgTable(
  "site_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gardenId: uuid("garden_id")
      .notNull()
      .references(() => gardens.id, { onDelete: "cascade" }),
    siteTitle: text("site_title").notNull().default("Garden Explorer"),
    seoDescription: text("seo_description")
      .notNull()
      .default("Explore the garden with QR learning trails, activities and quizzes."),
    /** Hex brand colour applied through a CSS variable at request time. */
    primaryColor: text("primary_color").notNull().default("#2F6B4F"),
    logoUrl: text("logo_url"),
    logoPublicId: text("logo_public_id"),
    faviconUrl: text("favicon_url"),
    faviconPublicId: text("favicon_public_id"),
    /** Optional — the privacy page only shows a contact mechanism if set. */
    contactEmail: text("contact_email"),
    contactPhone: text("contact_phone"),
    contactAddress: text("contact_address"),
    defaultTrailId: uuid("default_trail_id").references(() => trails.id, { onDelete: "set null" }),
    /** Anonymous aggregate analytics toggle. */
    analyticsEnabled: boolean("analytics_enabled").notNull().default(true),
    /** Free-text addition rendered on /privacy so the policy stays truthful. */
    privacyNotes: text("privacy_notes"),
    updatedBy: text("updated_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("site_settings_garden_unique_idx").on(table.gardenId)],
);
