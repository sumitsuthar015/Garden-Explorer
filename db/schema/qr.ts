import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { qrStatusEnum } from "./enums";
import { locations } from "./locations";
import { trails } from "./trails";

/**
 * A physical QR sticker in the garden.
 *
 * `publicCode` is the stable identifier printed on the sign (e.g. BUTTERFLY-003).
 * Editing location content NEVER changes it, so signs never need reprinting.
 * Internal UUIDs are never exposed on the public route.
 */
export const qrCodes = pgTable(
  "qr_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicCode: text("public_code").notNull(),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    /** Optional default trail context used right after a scan. */
    primaryTrailId: uuid("primary_trail_id").references(() => trails.id, { onDelete: "set null" }),
    status: qrStatusEnum("status").notNull().default("active"),
    /** Display label on the printed sign, defaults to the location name. */
    label: text("label"),
    scanCount: integer("scan_count").notNull().default(0),
    lastScannedAt: timestamp("last_scanned_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("qr_codes_public_code_unique_idx").on(table.publicCode),
    index("qr_codes_status_idx").on(table.status),
    index("qr_codes_location_id_idx").on(table.locationId),
    index("qr_codes_primary_trail_id_idx").on(table.primaryTrailId),
  ],
);
