import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { auditActionEnum } from "./enums";
import { user } from "./auth";

/**
 * Audit trail for important admin actions. Passwords, tokens and secrets are
 * never written here — `metadata` holds safe, non-sensitive context only.
 */
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminUserId: text("admin_user_id").references(() => user.id, { onDelete: "set null" }),
    adminEmail: text("admin_email"),
    action: auditActionEnum("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    entityLabel: text("entity_label"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admin_audit_logs_created_at_idx").on(table.createdAt),
    index("admin_audit_logs_admin_user_id_idx").on(table.adminUserId),
    index("admin_audit_logs_action_idx").on(table.action),
    index("admin_audit_logs_entity_idx").on(table.entityType, table.entityId),
  ],
);
