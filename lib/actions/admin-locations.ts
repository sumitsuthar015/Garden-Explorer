"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  activities,
  locationContentBlocks,
  locationFacts,
  locations,
  qrCodes,
  trailStops,
} from "@/db/schema";
import {
  getLocationDetailForAdmin,
  isLocationSlugTaken,
} from "@/db/queries/locations";
import { ensurePrimaryGarden } from "@/db/queries/gardens";
import { AppError, type ActionResult } from "@/lib/errors";
import { requireAdminPermission } from "@/lib/permissions";
import {
  activitySchema,
  contentBlockSchemaWithRefinement,
  createLocationSchema,
  locationFactSchema,
  reorderSchema,
  updateLocationSchema,
} from "@/lib/validation";
import { audit, parseInput, runAction } from "./helpers";

/**
 * Admin location mutations.
 *
 * Every action here performs BOTH layers of authorization:
 *  - route protection (the /admin layout already redirected anonymous users)
 *  - `requireAdminPermission()` before touching the database
 */

const LOCATION_LOG_CODE = "LOCATION_FETCH_FAILED";

function revalidateLocations(slug?: string | null) {
  revalidatePath("/admin/locations");
  revalidatePath("/admin/content");
  revalidatePath("/explore");
  revalidatePath("/");
  if (slug) {
    revalidatePath(`/locations/${slug}`);
    revalidatePath(`/admin/locations`);
  }
}

export async function createLocationAction(
  input: unknown,
): Promise<ActionResult<{ id: string; slug: string }>> {
  return runAction(LOCATION_LOG_CODE, async () => {
    const admin = await requireAdminPermission("location.create");
    const data = parseInput(createLocationSchema, input);
    const garden = await ensurePrimaryGarden();

    if (await isLocationSlugTaken(data.slug)) {
      throw new AppError("CONFLICT", {
        message: "That slug is already in use.",
        fieldErrors: { slug: ["Another place already uses this slug"] },
      });
    }

    const [created] = await db
      .insert(locations)
      .values({
        gardenId: data.gardenId ?? garden.id,
        name: data.name,
        slug: data.slug,
        shortDescription: data.shortDescription,
        description: data.description,
        category: data.category,
        heroImageUrl: data.heroImageUrl ?? null,
        heroImagePublicId: data.heroImagePublicId ?? null,
        heroImageAlt: data.heroImageAlt ?? null,
        icon: data.icon ?? null,
        estimatedMinutes: data.estimatedMinutes,
        status: data.status,
        featured: data.featured,
        displayOrder: data.displayOrder,
      })
      .returning({ id: locations.id, slug: locations.slug });

    await audit(admin, "LOCATION_CREATED", "location", created.id, data.name, {
      slug: data.slug,
      status: data.status,
    });
    revalidateLocations(data.slug);

    return created;
  });
}

export async function updateLocationAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(LOCATION_LOG_CODE, async () => {
    const admin = await requireAdminPermission("location.update");
    const data = parseInput(updateLocationSchema, input);

    const [existing] = await db.select().from(locations).where(eq(locations.id, data.id)).limit(1);
    if (!existing) throw new AppError("NOT_FOUND", { message: "That place no longer exists." });

    if (data.slug && (await isLocationSlugTaken(data.slug, data.id))) {
      throw new AppError("CONFLICT", {
        message: "That slug is already in use.",
        fieldErrors: { slug: ["Another place already uses this slug"] },
      });
    }

    await db
      .update(locations)
      .set({
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.shortDescription !== undefined
          ? { shortDescription: data.shortDescription }
          : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.heroImageUrl !== undefined ? { heroImageUrl: data.heroImageUrl } : {}),
        ...(data.heroImagePublicId !== undefined
          ? { heroImagePublicId: data.heroImagePublicId }
          : {}),
        ...(data.heroImageAlt !== undefined ? { heroImageAlt: data.heroImageAlt } : {}),
        ...(data.icon !== undefined ? { icon: data.icon } : {}),
        ...(data.estimatedMinutes !== undefined
          ? { estimatedMinutes: data.estimatedMinutes }
          : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.featured !== undefined ? { featured: data.featured } : {}),
        ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
        updatedAt: new Date(),
      })
      .where(eq(locations.id, data.id));

    const statusChanged = data.status !== undefined && data.status !== existing.status;
    await audit(
      admin,
      statusChanged && data.status === "published"
        ? "LOCATION_PUBLISHED"
        : statusChanged && data.status === "draft"
          ? "LOCATION_UNPUBLISHED"
          : statusChanged && data.status === "archived"
            ? "LOCATION_ARCHIVED"
            : "LOCATION_UPDATED",
      "location",
      data.id,
      data.name ?? existing.name,
      { status: data.status ?? existing.status },
    );
    revalidateLocations(data.slug ?? existing.slug);

    return { id: data.id };
  });
}

export async function setLocationStatusAction(
  id: string,
  status: "draft" | "published" | "archived",
): Promise<ActionResult<{ id: string }>> {
  return runAction(LOCATION_LOG_CODE, async () => {
    const admin = await requireAdminPermission(
      status === "published" ? "location.publish" : "location.update",
    );

    const detail = await getLocationDetailForAdmin(id);
    if (!detail) throw new AppError("NOT_FOUND", { message: "That place no longer exists." });

    // A location cannot be published without the basics a visitor needs.
    if (status === "published") {
      const problems: string[] = [];
      if (!detail.location.name.trim()) problems.push("The place needs a name.");
      if (!detail.location.slug.trim()) problems.push("The place needs a URL slug.");
      if (!detail.location.shortDescription.trim()) {
        problems.push("Add a short description — it is shown on cards and after a scan.");
      }
      if (problems.length > 0) {
        throw new AppError("VALIDATION_FAILED", {
          message: problems.join(" "),
          fieldErrors: { status: problems },
        });
      }
    }

    await db
      .update(locations)
      .set({ status, updatedAt: new Date() })
      .where(eq(locations.id, id));

    await audit(
      admin,
      status === "published"
        ? "LOCATION_PUBLISHED"
        : status === "archived"
          ? "LOCATION_ARCHIVED"
          : "LOCATION_UNPUBLISHED",
      "location",
      id,
      detail.location.name,
      { status },
    );
    revalidateLocations(detail.location.slug);

    return { id };
  });
}

export async function deleteLocationAction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(LOCATION_LOG_CODE, async () => {
    const admin = await requireAdminPermission("location.delete");

    const [existing] = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
    if (!existing) throw new AppError("NOT_FOUND", { message: "That place no longer exists." });

    // Deleting cascades to QR codes and trail stops, so it is only allowed for
    // places that are not live. Otherwise the safe action is to archive.
    const [{ scanCount }] = await db
      .select({ scanCount: sql<number>`coalesce(sum(${qrCodes.scanCount}), 0)` })
      .from(qrCodes)
      .where(eq(qrCodes.locationId, id));

    const [stop] = await db
      .select({ id: trailStops.id })
      .from(trailStops)
      .where(eq(trailStops.locationId, id))
      .limit(1);

    if (existing.status === "published" || Number(scanCount) > 0 || stop) {
      throw new AppError("CONFLICT", {
        message:
          "This place is published, has scans, or is part of a trail. Unpublish and archive it instead of deleting, so history and signs stay consistent.",
      });
    }

    await db.delete(locations).where(eq(locations.id, id));
    await audit(admin, "LOCATION_DELETED", "location", id, existing.name);
    revalidateLocations(existing.slug);

    return { id };
  });
}

/* ------------------------------------------------------------------ *
 * Facts
 * ------------------------------------------------------------------ */

export async function saveLocationFactAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(LOCATION_LOG_CODE, async () => {
    const admin = await requireAdminPermission("location.update");
    const data = parseInput(locationFactSchema, input);

    if (data.id) {
      await db
        .update(locationFacts)
        .set({
          label: data.label,
          value: data.value,
          displayOrder: data.displayOrder,
          updatedAt: new Date(),
        })
        .where(eq(locationFacts.id, data.id));
      await audit(admin, "LOCATION_UPDATED", "location_fact", data.id, data.label);
      revalidatePath("/admin/content");
      return { id: data.id };
    }

    const [created] = await db
      .insert(locationFacts)
      .values({
        locationId: data.locationId,
        label: data.label,
        value: data.value,
        displayOrder: data.displayOrder,
      })
      .returning({ id: locationFacts.id });

    await audit(admin, "LOCATION_UPDATED", "location_fact", created.id, data.label);
    revalidatePath("/admin/content");
    return created;
  });
}

export async function deleteLocationFactAction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(LOCATION_LOG_CODE, async () => {
    const admin = await requireAdminPermission("location.update");
    await db.delete(locationFacts).where(eq(locationFacts.id, id));
    await audit(admin, "LOCATION_UPDATED", "location_fact", id, null, { deleted: true });
    revalidatePath("/admin/content");
    return { id };
  });
}

/* ------------------------------------------------------------------ *
 * Content blocks
 * ------------------------------------------------------------------ */

export async function saveContentBlockAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(LOCATION_LOG_CODE, async () => {
    const admin = await requireAdminPermission("content.update");
    const data = parseInput(contentBlockSchemaWithRefinement, input);

    const values = {
      locationId: data.locationId,
      type: data.type,
      title: data.title ?? null,
      body: data.body,
      mediaUrl: data.mediaUrl ?? null,
      mediaPublicId: data.mediaPublicId ?? null,
      mediaAlt: data.mediaAlt ?? null,
      mediaCaption: data.mediaCaption ?? null,
      displayOrder: data.displayOrder,
      status: data.status,
      updatedAt: new Date(),
    };

    if (data.id) {
      await db.update(locationContentBlocks).set(values).where(eq(locationContentBlocks.id, data.id));
      await audit(admin, "CONTENT_BLOCK_UPDATED", "content_block", data.id, data.title ?? data.type);
      revalidatePath("/admin/content");
      revalidatePath("/admin/locations");
      return { id: data.id };
    }

    const [created] = await db
      .insert(locationContentBlocks)
      .values(values)
      .returning({ id: locationContentBlocks.id });

    await audit(
      admin,
      "CONTENT_BLOCK_CREATED",
      "content_block",
      created.id,
      data.title ?? data.type,
    );
    revalidatePath("/admin/content");
    return created;
  });
}

export async function deleteContentBlockAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  return runAction(LOCATION_LOG_CODE, async () => {
    const admin = await requireAdminPermission("content.update");
    await db.delete(locationContentBlocks).where(eq(locationContentBlocks.id, id));
    await audit(admin, "CONTENT_BLOCK_DELETED", "content_block", id);
    revalidatePath("/admin/content");
    return { id };
  });
}

/**
 * Reorder content. Positions are recalculated server-side from the submitted
 * id order — the client can never inject duplicate or negative positions.
 */
export async function reorderContentBlocksAction(
  input: unknown,
): Promise<ActionResult<{ count: number }>> {
  return runAction(LOCATION_LOG_CODE, async () => {
    const admin = await requireAdminPermission("content.update");
    const data = parseInput(reorderSchema, input);

    const existing = await db
      .select({ id: locationContentBlocks.id })
      .from(locationContentBlocks)
      .where(eq(locationContentBlocks.locationId, data.parentId));

    const known = new Set(existing.map((row) => row.id));
    const ordered = data.orderedIds.filter((id) => known.has(id));
    if (ordered.length === 0) throw new AppError("VALIDATION_FAILED");

    await db.transaction(async (tx) => {
      // Two-phase update keeps the (location_id, display_order) ordering
      // deterministic without ever leaving a gap or a duplicate.
      await tx
        .update(locationContentBlocks)
        .set({ displayOrder: sql`${locationContentBlocks.displayOrder} + 10000` })
        .where(eq(locationContentBlocks.locationId, data.parentId));

      for (const [index, id] of ordered.entries()) {
        await tx
          .update(locationContentBlocks)
          .set({ displayOrder: index, updatedAt: new Date() })
          .where(and(eq(locationContentBlocks.id, id), eq(locationContentBlocks.locationId, data.parentId)));
      }
    });

    await audit(admin, "CONTENT_BLOCK_UPDATED", "location", data.parentId, null, {
      reordered: ordered.length,
    });
    revalidatePath("/admin/content");
    return { count: ordered.length };
  });
}

/* ------------------------------------------------------------------ *
 * Activities
 * ------------------------------------------------------------------ */

export async function saveActivityAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(LOCATION_LOG_CODE, async () => {
    const admin = await requireAdminPermission("content.update");
    const data = parseInput(activitySchema, input);

    const values = {
      locationId: data.locationId,
      type: data.type,
      prompt: data.prompt,
      hint: data.hint ?? null,
      successMessage: data.successMessage,
      config: {
        // Persist only the keys the chosen type actually uses.
        ...(data.type === "observation" ? { confirmLabel: data.config?.confirmLabel ?? "I found one" } : {}),
        ...(data.type === "yes_no" ? { answer: data.config?.answer ?? false } : {}),
        ...(data.type === "multiple_choice" || data.type === "selection"
          ? { options: (data.config?.options ?? []).map((option) => option.trim()).filter(Boolean) }
          : {}),
        ...(data.type === "multiple_choice" ? { correctIndex: data.config?.correctIndex ?? 0 } : {}),
        ...(data.type === "selection" ? { correctIndexes: data.config?.correctIndexes ?? [] } : {}),
        ...(data.type === "thinking"
          ? {
              sampleAnswer: data.config?.sampleAnswer ?? undefined,
              minLength: data.config?.minLength ?? 0,
            }
          : {}),
      },
      points: data.points,
      displayOrder: data.displayOrder,
      status: data.status,
      updatedAt: new Date(),
    };

    if (data.id) {
      await db.update(activities).set(values).where(eq(activities.id, data.id));
      await audit(admin, "ACTIVITY_UPDATED", "activity", data.id, data.prompt.slice(0, 80));
      revalidatePath("/admin/content");
      return { id: data.id };
    }

    const [created] = await db.insert(activities).values(values).returning({ id: activities.id });
    await audit(admin, "ACTIVITY_CREATED", "activity", created.id, data.prompt.slice(0, 80));
    revalidatePath("/admin/content");
    return created;
  });
}

export async function deleteActivityAction(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(LOCATION_LOG_CODE, async () => {
    const admin = await requireAdminPermission("content.update");
    await db.delete(activities).where(eq(activities.id, id));
    await audit(admin, "ACTIVITY_DELETED", "activity", id);
    revalidatePath("/admin/content");
    return { id };
  });
}
