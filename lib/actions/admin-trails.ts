"use server";

import { eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { locations, trailStops, trails } from "@/db/schema";
import { ensurePrimaryGarden } from "@/db/queries/gardens";
import { getPublishedLocationIdSet } from "@/db/queries/locations";
import {
  getTrailDetailForAdmin,
  getTrailStopsForValidation,
  isTrailSlugTaken,
} from "@/db/queries/trails";
import { AppError, type ActionResult } from "@/lib/errors";
import { requireAdminPermission } from "@/lib/permissions";
import { trailSchema, trailStopsOrderSchema } from "@/lib/validation";
import { validateTrailForPublishing } from "@/lib/validation/trail";
import { audit, parseInput, runAction } from "./helpers";

/**
 * Trail management.
 *
 * Positions are always recalculated server-side from the submitted order, so a
 * drag-and-drop reorder can never produce duplicate or skipped stop numbers and
 * the unique `(trail_id, position)` index is never violated.
 */

const TRAIL_LOG_CODE = "TRAIL_FETCH_FAILED";

function revalidateTrails(slug?: string) {
  revalidatePath("/admin/trails");
  revalidatePath("/trails");
  revalidatePath("/");
  if (slug) revalidatePath(`/trails/${slug}`);
}

export async function createTrailAction(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  return runAction(TRAIL_LOG_CODE, async () => {
    const admin = await requireAdminPermission("trail.create");
    const data = parseInput(trailSchema, input);
    const garden = await ensurePrimaryGarden();

    if (await isTrailSlugTaken(data.slug)) {
      throw new AppError("CONFLICT", {
        message: "That slug is already in use.",
        fieldErrors: { slug: ["Another trail already uses this slug"] },
      });
    }

    const [created] = await db
      .insert(trails)
      .values({
        gardenId: data.gardenId ?? garden.id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        goals: data.goals,
        difficulty: data.difficulty,
        ageGroup: data.ageGroup,
        estimatedMinutes: data.estimatedMinutes,
        coverImageUrl: data.coverImageUrl ?? null,
        coverImagePublicId: data.coverImagePublicId ?? null,
        coverImageAlt: data.coverImageAlt ?? null,
        themeColor: data.themeColor ?? null,
        icon: data.icon ?? null,
        status: data.status,
        displayOrder: data.displayOrder,
      })
      .returning({ id: trails.id, slug: trails.slug });

    await audit(admin, "TRAIL_CREATED", "trail", created.id, data.name, { slug: data.slug });
    revalidateTrails(data.slug);

    return created;
  });
}

export async function updateTrailAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(TRAIL_LOG_CODE, async () => {
    const admin = await requireAdminPermission("trail.update");
    const data = parseInput(trailSchema, input);

    if (!data.id) throw new AppError("BAD_REQUEST", { message: "Missing trail id." });

    const [existing] = await db.select().from(trails).where(eq(trails.id, data.id)).limit(1);
    if (!existing) throw new AppError("NOT_FOUND", { message: "That trail no longer exists." });

    if (data.slug && (await isTrailSlugTaken(data.slug, data.id))) {
      throw new AppError("CONFLICT", {
        message: "That slug is already in use.",
        fieldErrors: { slug: ["Another trail already uses this slug"] },
      });
    }

    await db
      .update(trails)
      .set({
        name: data.name,
        slug: data.slug,
        description: data.description,
        goals: data.goals,
        difficulty: data.difficulty,
        ageGroup: data.ageGroup,
        estimatedMinutes: data.estimatedMinutes,
        coverImageUrl: data.coverImageUrl ?? null,
        coverImagePublicId: data.coverImagePublicId ?? null,
        coverImageAlt: data.coverImageAlt ?? null,
        themeColor: data.themeColor ?? null,
        icon: data.icon ?? null,
        status: data.status,
        displayOrder: data.displayOrder,
        updatedAt: new Date(),
      })
      .where(eq(trails.id, data.id));

    await audit(
      admin,
      data.status === "published" && existing.status !== "published"
        ? "TRAIL_PUBLISHED"
        : data.status !== "published" && existing.status === "published"
          ? "TRAIL_UNPUBLISHED"
          : "TRAIL_UPDATED",
      "trail",
      data.id,
      data.name,
    );
    revalidateTrails(data.slug);

    return { id: data.id };
  });
}

/**
 * Persist the full ordered stop list from the trail builder.
 *
 * Runs in one transaction and uses a two-phase position update so the
 * `(trail_id, position)` unique index is never transiently violated during a
 * reorder.
 */
export async function saveTrailStopsAction(
  input: unknown,
): Promise<ActionResult<{ count: number }>> {
  return runAction(TRAIL_LOG_CODE, async () => {
    const admin = await requireAdminPermission("trail.reorder");
    const data = parseInput(trailStopsOrderSchema, input);

    const [trail] = await db.select().from(trails).where(eq(trails.id, data.trailId)).limit(1);
    if (!trail) throw new AppError("NOT_FOUND", { message: "That trail no longer exists." });

    const locationIds = data.stops.map((stop) => stop.locationId);
    if (new Set(locationIds).size !== locationIds.length) {
      throw new AppError("VALIDATION_FAILED", {
        message: "The same place cannot appear twice in one trail.",
        fieldErrors: { stops: ["Remove the duplicate place"] },
      });
    }

    if (locationIds.length > 0) {
      const found = await db
        .select({ id: locations.id })
        .from(locations)
        .where(inArray(locations.id, locationIds));

      if (found.length !== locationIds.length) {
        throw new AppError("VALIDATION_FAILED", {
          message: "One of the selected places no longer exists.",
        });
      }
    }

    await db.transaction(async (tx) => {
      // Park existing positions out of the way first.
      await tx
        .update(trailStops)
        .set({ position: sql`${trailStops.position} + 100000` })
        .where(eq(trailStops.trailId, data.trailId));

      await tx.delete(trailStops).where(eq(trailStops.trailId, data.trailId));

      if (data.stops.length > 0) {
        await tx.insert(trailStops).values(
          data.stops.map((stop, index) => ({
            trailId: data.trailId,
            locationId: stop.locationId,
            position: index + 1,
            instructionToNext: stop.instructionToNext,
          })),
        );
      }
    });

    await audit(admin, "TRAIL_REORDERED", "trail", data.trailId, trail.name, {
      stops: data.stops.length,
    });
    revalidateTrails(trail.slug);

    return { count: data.stops.length };
  });
}

export async function setTrailStatusAction(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult<{ id: string }>> {
  return runAction(TRAIL_LOG_CODE, async () => {
    const admin = await requireAdminPermission(
      status === "published" ? "trail.publish" : "trail.update",
    );

    const detail = await getTrailDetailForAdmin(id);
    if (!detail) throw new AppError("NOT_FOUND", { message: "That trail no longer exists." });

    if (status === "published") {
      const stops = await getTrailStopsForValidation(id);
      const publishedLocationIds = await getPublishedLocationIdSet(detail.trail.gardenId);
      const problems = validateTrailForPublishing(detail.trail, stops, publishedLocationIds);

      if (problems.length > 0) {
        throw new AppError("VALIDATION_FAILED", {
          message: problems.join(" "),
          fieldErrors: { status: problems },
        });
      }
    }

    await db.update(trails).set({ status, updatedAt: new Date() }).where(eq(trails.id, id));

    await audit(
      admin,
      status === "published" ? "TRAIL_PUBLISHED" : "TRAIL_UNPUBLISHED",
      "trail",
      id,
      detail.trail.name,
      { status },
    );
    revalidateTrails(detail.trail.slug);

    return { id };
  });
}

export async function deleteTrailAction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(TRAIL_LOG_CODE, async () => {
    const admin = await requireAdminPermission("trail.delete");

    const [existing] = await db.select().from(trails).where(eq(trails.id, id)).limit(1);
    if (!existing) throw new AppError("NOT_FOUND", { message: "That trail no longer exists." });

    if (existing.status === "published") {
      throw new AppError("CONFLICT", {
        message: "Unpublish this trail before deleting it, so visitors never lose a route mid-walk.",
      });
    }

    await db.delete(trails).where(eq(trails.id, id));
    await audit(admin, "TRAIL_DELETED", "trail", id, existing.name);
    revalidateTrails(existing.slug);

    return { id };
  });
}

/** Validation report shown in the builder before publishing. */
export async function checkTrailPublishableAction(
  id: string,
): Promise<ActionResult<{ publishable: boolean; problems: string[] }>> {
  return runAction(TRAIL_LOG_CODE, async () => {
    await requireAdminPermission("trail.update");

    const detail = await getTrailDetailForAdmin(id);
    if (!detail) throw new AppError("NOT_FOUND");

    const stops = await getTrailStopsForValidation(id);
    const publishedLocationIds = await getPublishedLocationIdSet(detail.trail.gardenId);
    const problems = validateTrailForPublishing(detail.trail, stops, publishedLocationIds);

    return { publishable: problems.length === 0, problems };
  });
}
