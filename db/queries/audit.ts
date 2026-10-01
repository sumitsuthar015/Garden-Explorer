import { count, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { adminAuditLogs } from "@/db/schema";
import type { AdminAuditLog } from "@/db/schema";
import type { AuditAction } from "@/lib/constants";
import { logServerEvent } from "@/lib/errors";

/**
 * Admin audit trail.
 *
 * `metadata` must only ever contain safe, non-sensitive context.
 * Passwords, tokens, session ids and API secrets are never written here.
 */
export interface AuditEntry {
  adminUserId: string | null;
  adminEmail?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  entityLabel?: string | null;
  metadata?: Record<string, unknown>;
}

/** Best-effort: an audit failure must never roll back a successful mutation. */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(adminAuditLogs).values({
      adminUserId: entry.adminUserId,
      adminEmail: entry.adminEmail ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      entityLabel: entry.entityLabel ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (error) {
    logServerEvent("warn", "DATABASE_ERROR", {
      query: "writeAuditLog",
      action: entry.action,
      detail: error instanceof Error ? error.message : "unknown",
    });
  }
}

export async function listAuditLogs(options: {
  page: number;
  pageSize: number;
  action?: string;
}): Promise<{ rows: AdminAuditLog[]; total: number }> {
  const where = options.action ? eq(adminAuditLogs.action, options.action as AuditAction) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(adminAuditLogs)
      .where(where)
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(options.pageSize)
      .offset((options.page - 1) * options.pageSize),
    db.select({ value: count() }).from(adminAuditLogs).where(where),
  ]);

  return { rows, total: Number(totalRow?.value ?? 0) };
}
