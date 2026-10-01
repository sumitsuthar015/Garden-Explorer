"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { badges } from "@/db/schema";
import { getBadgeById, isBadgeCodeTaken } from "@/db/queries/badges";
import { AppError, type ActionResult } from "@/lib/errors";
import { requireAdminPermission } from "@/lib/permissions";
import { badgeSchema } from "@/lib/validation";
import { audit, parseInput, runAction } from "./helpers";

/**
 * Badge management.
 *
 * Badge *rules* are data, not code: each badge stores a criteria type plus a
 * JSON config, and `lib/badges.ts` evaluates them purely. That means a garden
 * admin can invent a new badge without a deployment.
 */

const BADGE_LOG_CODE = "DATABASE_ERROR";

function revalidateBadges() {
  revalidatePath("/admin/badges");
  revalidatePath("/progress");
}

export async function saveBadgeAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(BADGE_LOG_CODE, async () => {
    const admin = await requireAdminPermission("badge.update");
    const data = parseInput(badgeSchema, input);

    if (await isBadgeCodeTaken(data.code, data.id)) {
      throw new AppError("CONFLICT", {
        message: "That badge code is already in use.",
        fieldErrors: { code: ["Another badge already uses this code"] },
      });
    }

    const values = {
      code: data.code,
      name: data.name,
      description: data.description,
      icon: data.icon,
      criteriaType: data.criteriaType,
      config: data.config ?? {},
      displayOrder: data.displayOrder,
      status: data.status,
      updatedAt: new Date(),
    };

    if (data.id) {
      await db.update(badges).set(values).where(eq(badges.id, data.id));
      await audit(admin, "BADGE_UPDATED", "badge", data.id, data.name);
      revalidateBadges();
      return { id: data.id };
    }

    const [created] = await db.insert(badges).values(values).returning({ id: badges.id });
    await audit(admin, "BADGE_CREATED", "badge", created.id, data.name);
    revalidateBadges();

    return created;
  });
}

export async function deleteBadgeAction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(BADGE_LOG_CODE, async () => {
    const admin = await requireAdminPermission("badge.delete");

    const existing = await getBadgeById(id);
    if (!existing) throw new AppError("NOT_FOUND", { message: "That badge no longer exists." });

    await db.delete(badges).where(eq(badges.id, id));
    await audit(admin, "BADGE_DELETED", "badge", id, existing.name, { code: existing.code });
    revalidateBadges();

    return { id };
  });
}
