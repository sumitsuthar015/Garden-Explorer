"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { locations, qrCodes, trails } from "@/db/schema";
import { ensurePrimaryGarden } from "@/db/queries/gardens";
import { findQrCodeByPublicCode } from "@/db/queries/qr";
import { AppError, type ActionResult } from "@/lib/errors";
import { requireAdminPermission } from "@/lib/permissions";
import {
  publicCodeSchema,
  qrCodeSchema,
  regenerateQrCodeSchema,
  updateQrCodeSchema,
} from "@/lib/validation";
import { audit, parseInput, runAction } from "./helpers";

/**
 * QR management.
 *
 * Guarantees encoded in this module:
 *  - `public_code` is unique and validated as a printable, URL-safe token.
 *  - Editing a location NEVER changes its QR code, so printed signs stay valid.
 *  - Regenerating a public code is an explicit, separately audited action,
 *    because it invalidates a sticker that is already on a sign.
 */

const QR_LOG_CODE = "QR_RESOLUTION_FAILED";

function revalidateQr() {
  revalidatePath("/admin/qr");
  revalidatePath("/admin");
}

export async function createQrCodeAction(
  input: unknown,
): Promise<ActionResult<{ id: string; publicCode: string }>> {
  return runAction(QR_LOG_CODE, async () => {
    const admin = await requireAdminPermission("qr.create");
    const data = parseInput(qrCodeSchema, input);

    const code = publicCodeSchema.parse(data.publicCode);

    if (await findQrCodeByPublicCode(code)) {
      throw new AppError("CONFLICT", {
        message: "That code already exists.",
        fieldErrors: { publicCode: ["This code is already printed on another sign"] },
      });
    }

    const [location] = await db
      .select({ id: locations.id, name: locations.name })
      .from(locations)
      .where(eq(locations.id, data.locationId))
      .limit(1);
    if (!location) {
      throw new AppError("VALIDATION_FAILED", {
        message: "Choose a garden place for this QR code.",
        fieldErrors: { locationId: ["Choose a garden place"] },
      });
    }

    await assertTrailExists(data.primaryTrailId ?? null);

    const [created] = await db
      .insert(qrCodes)
      .values({
        publicCode: code,
        locationId: data.locationId,
        primaryTrailId: data.primaryTrailId ?? null,
        status: data.status,
        label: data.label ?? location.name,
      })
      .returning({ id: qrCodes.id, publicCode: qrCodes.publicCode });

    await audit(admin, "QR_CREATED", "qr_code", created.id, created.publicCode, {
      locationId: data.locationId,
      status: data.status,
    });
    revalidateQr();

    return created;
  });
}

export async function updateQrCodeAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(QR_LOG_CODE, async () => {
    const admin = await requireAdminPermission("qr.update");
    const data = parseInput(updateQrCodeSchema, input);

    const [existing] = await db.select().from(qrCodes).where(eq(qrCodes.id, data.id)).limit(1);
    if (!existing) throw new AppError("NOT_FOUND", { message: "That QR code no longer exists." });

    if (data.publicCode && data.publicCode !== existing.publicCode) {
      // Changing a printed code is treated as a regeneration and audited as such.
      const duplicate = await findQrCodeByPublicCode(data.publicCode);
      if (duplicate && duplicate.id !== data.id) {
        throw new AppError("CONFLICT", {
          message: "That code already exists.",
          fieldErrors: { publicCode: ["This code is already in use"] },
        });
      }
    }

    if (data.primaryTrailId !== undefined) {
      await assertTrailExists(data.primaryTrailId ?? null);
    }

    await db
      .update(qrCodes)
      .set({
        ...(data.publicCode !== undefined ? { publicCode: data.publicCode } : {}),
        ...(data.locationId !== undefined ? { locationId: data.locationId } : {}),
        ...(data.primaryTrailId !== undefined ? { primaryTrailId: data.primaryTrailId } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.label !== undefined ? { label: data.label } : {}),
        updatedAt: new Date(),
      })
      .where(eq(qrCodes.id, data.id));

    await audit(
      admin,
      data.publicCode && data.publicCode !== existing.publicCode ? "QR_REGENERATED" : "QR_UPDATED",
      "qr_code",
      data.id,
      data.publicCode ?? existing.publicCode,
      { from: existing.publicCode, to: data.publicCode ?? existing.publicCode },
    );
    revalidateQr();

    return { id: data.id };
  });
}

export async function setQrStatusAction(
  id: string,
  status: "active" | "disabled",
): Promise<ActionResult<{ id: string }>> {
  return runAction(QR_LOG_CODE, async () => {
    const admin = await requireAdminPermission("qr.update");

    const [existing] = await db.select().from(qrCodes).where(eq(qrCodes.id, id)).limit(1);
    if (!existing) throw new AppError("NOT_FOUND", { message: "That QR code no longer exists." });

    await db.update(qrCodes).set({ status, updatedAt: new Date() }).where(eq(qrCodes.id, id));

    await audit(
      admin,
      status === "disabled" ? "QR_DISABLED" : "QR_ENABLED",
      "qr_code",
      id,
      existing.publicCode,
    );
    revalidateQr();

    return { id };
  });
}

/**
 * Explicitly mint a NEW public code for a QR row.
 *
 * This is the only operation that can invalidate a printed sign, so it is
 * gated behind an admin-only permission and always audited with both codes.
 */
export async function regenerateQrCodeAction(
  input: unknown,
): Promise<ActionResult<{ id: string; publicCode: string }>> {
  return runAction(QR_LOG_CODE, async () => {
    const admin = await requireAdminPermission("qr.regenerate");
    const data = parseInput(regenerateQrCodeSchema, input);

    const [existing] = await db.select().from(qrCodes).where(eq(qrCodes.id, data.id)).limit(1);
    if (!existing) throw new AppError("NOT_FOUND", { message: "That QR code no longer exists." });

    const prefix = data.prefix || existing.publicCode.replace(/-[^-]*$/, "");

    let next = "";
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const token = crypto.randomUUID().replace(/-/g, "").slice(0, 5).toUpperCase();
      const candidate = publicCodeSchema.parse(`${prefix}-${token}`);
      if (!(await findQrCodeByPublicCode(candidate))) {
        next = candidate;
        break;
      }
    }

    if (!next) {
      throw new AppError("INTERNAL_ERROR", {
        message: "Could not generate a unique code. Please try again.",
      });
    }

    await db
      .update(qrCodes)
      .set({ publicCode: next, updatedAt: new Date() })
      .where(eq(qrCodes.id, data.id));

    await audit(admin, "QR_REGENERATED", "qr_code", data.id, next, {
      previousCode: existing.publicCode,
    });
    revalidateQr();

    return { id: data.id, publicCode: next };
  });
}

export async function deleteQrCodeAction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(QR_LOG_CODE, async () => {
    const admin = await requireAdminPermission("qr.delete");

    const [existing] = await db.select().from(qrCodes).where(eq(qrCodes.id, id)).limit(1);
    if (!existing) throw new AppError("NOT_FOUND", { message: "That QR code no longer exists." });

    if (existing.status === "active" && existing.scanCount > 0) {
      throw new AppError("CONFLICT", {
        message:
          "This sign has been scanned by visitors. Disable it instead of deleting, so the scan history stays intact.",
      });
    }

    await db.delete(qrCodes).where(eq(qrCodes.id, id));
    await audit(admin, "QR_DELETED", "qr_code", id, existing.publicCode);
    revalidateQr();

    return { id };
  });
}

/** Suggest the next sequential code for a location, e.g. BUTTERFLY-004. */
export async function suggestPublicCodeAction(
  locationId: string,
): Promise<ActionResult<{ suggestion: string }>> {
  return runAction(QR_LOG_CODE, async () => {
    await requireAdminPermission("qr.create");
    await ensurePrimaryGarden();

    const [location] = await db
      .select({ slug: locations.slug, name: locations.name })
      .from(locations)
      .where(eq(locations.id, locationId))
      .limit(1);

    if (!location) throw new AppError("NOT_FOUND");

    const prefix = location.slug
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 20);

    const existing = await db
      .select({ publicCode: qrCodes.publicCode })
      .from(qrCodes);

    const taken = new Set(existing.map((row) => row.publicCode));

    for (let index = 1; index <= 999; index += 1) {
      const candidate = `${prefix}-${String(index).padStart(3, "0")}`;
      if (!taken.has(candidate)) return { suggestion: candidate };
    }

    return { suggestion: `${prefix}-${crypto.randomUUID().slice(0, 4).toUpperCase()}` };
  });
}

async function assertTrailExists(trailId: string | null): Promise<void> {
  if (!trailId) return;

  const [trail] = await db
    .select({ id: trails.id, name: trails.name, status: trails.status })
    .from(trails)
    .where(eq(trails.id, trailId))
    .limit(1);

  if (!trail) {
    throw new AppError("VALIDATION_FAILED", {
      message: "That trail no longer exists.",
      fieldErrors: { primaryTrailId: ["Choose an existing trail"] },
    });
  }

  if (trail.status !== "published") {
    throw new AppError("VALIDATION_FAILED", {
      message: `${trail.name} is not published yet, so it cannot be a primary trail.`,
      fieldErrors: { primaryTrailId: ["Publish the trail first"] },
    });
  }
}
