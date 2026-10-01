import type { z } from "zod";

import type { AuditAction } from "@/lib/constants";
import { AppError, actionFail, actionOk, isAppError, type ActionResult } from "@/lib/errors";
import { toFieldErrors } from "@/lib/validation/common";
import { writeAuditLog } from "@/db/queries/audit";
import type { AdminUser } from "@/lib/permissions";

/**
 * Shared plumbing for every server action.
 *
 * Responsibilities kept in one place so no action can accidentally:
 *  - skip Zod validation,
 *  - leak a database error to the client,
 *  - forget the audit trail.
 */

/** Parse input or throw a VALIDATION_FAILED AppError carrying field errors. */
export function parseInput<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.output<TSchema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError("VALIDATION_FAILED", {
      fieldErrors: toFieldErrors(result.error),
    });
  }
  return result.data;
}

/** Convert FormData into a plain object, JSON-decoding `*Json` fields. */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [key, value] of formData.entries()) {
    if (typeof value !== "string") continue;

    if (key.endsWith("Json")) {
      const realKey = key.slice(0, -4);
      try {
        output[realKey] = JSON.parse(value);
      } catch {
        output[realKey] = undefined;
      }
      continue;
    }

    output[key] = value;
  }

  return output;
}

/**
 * Wrap an action body so every throw becomes a typed, visitor-safe failure.
 * `logCode` drives the structured server log line.
 */
export async function runAction<T>(
  logCode: Parameters<typeof actionFail>[1],
  body: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return actionOk(await body());
  } catch (error) {
    if (!isAppError(error)) {
      // Unexpected: log the real cause server-side, return a generic message.
      console.error(
        JSON.stringify({
          level: "error",
          code: logCode,
          name: error instanceof Error ? error.name : "UnknownError",
          detail: error instanceof Error ? error.message : String(error),
        }),
      );
    }
    return actionFail(error, logCode);
  }
}

/** Record an audit entry from an authenticated admin context. */
export async function audit(
  admin: AdminUser,
  action: AuditAction,
  entityType: string,
  entityId: string | null,
  entityLabel?: string | null,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await writeAuditLog({
    adminUserId: admin.id,
    adminEmail: admin.email,
    action,
    entityType,
    entityId,
    entityLabel: entityLabel ?? null,
    metadata,
  });
}
