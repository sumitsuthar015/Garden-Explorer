"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { gardens, siteSettings, trails } from "@/db/schema";
import { ensurePrimaryGarden, getSiteSettings } from "@/db/queries/gardens";
import { AppError, type ActionResult } from "@/lib/errors";
import { requireAdminPermission } from "@/lib/permissions";
import { settingsSchema } from "@/lib/validation";
import { audit, parseInput, runAction } from "./helpers";

/**
 * Site settings. Everything a garden normally rebrands — name, logo, favicon,
 * brand colour, contact details and SEO copy — is editable here so routine
 * updates never require a code change or a deploy.
 */

const SETTINGS_LOG_CODE = "DATABASE_ERROR";

export async function updateSettingsAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(SETTINGS_LOG_CODE, async () => {
    const admin = await requireAdminPermission("settings.update");
    const data = parseInput(settingsSchema, input);

    const garden = await ensurePrimaryGarden();
    const existing = await getSiteSettings(garden.id);

    // The default trail must exist and be published before it can be assigned.
    if (data.defaultTrailId) {
      const [trail] = await db
        .select({ id: trails.id, status: trails.status, name: trails.name })
        .from(trails)
        .where(eq(trails.id, data.defaultTrailId))
        .limit(1);

      if (!trail) {
        throw new AppError("VALIDATION_FAILED", {
          message: "That trail no longer exists.",
          fieldErrors: { defaultTrailId: ["Choose an existing trail"] },
        });
      }
      if (trail.status !== "published") {
        throw new AppError("VALIDATION_FAILED", {
          message: `${trail.name} is not published yet.`,
          fieldErrors: { defaultTrailId: ["Publish the trail first"] },
        });
      }
    }

    await db
      .update(gardens)
      .set({
        name: data.name,
        description: data.description,
        logoUrl: data.logoUrl ?? null,
        logoPublicId: data.logoPublicId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(gardens.id, garden.id));

    const settingsValues = {
      gardenId: garden.id,
      siteTitle: data.siteTitle,
      seoDescription: data.seoDescription,
      primaryColor: data.primaryColor,
      logoUrl: data.logoUrl ?? null,
      logoPublicId: data.logoPublicId ?? null,
      faviconUrl: data.faviconUrl ?? null,
      faviconPublicId: data.faviconPublicId ?? null,
      contactEmail: data.contactEmail ?? null,
      contactPhone: data.contactPhone ?? null,
      contactAddress: data.contactAddress ?? null,
      defaultTrailId: data.defaultTrailId ?? null,
      analyticsEnabled: data.analyticsEnabled,
      privacyNotes: data.privacyNotes ?? null,
      updatedBy: admin.id,
      updatedAt: new Date(),
    };

    const [saved] = await db
      .insert(siteSettings)
      .values(settingsValues)
      .onConflictDoUpdate({
        target: siteSettings.gardenId,
        set: settingsValues,
      })
      .returning({ id: siteSettings.id });

    await audit(admin, "SETTINGS_UPDATED", "site_settings", saved.id, data.siteTitle, {
      analyticsEnabled: data.analyticsEnabled,
      before: existing?.primaryColor ?? null,
      after: data.primaryColor,
    });

    // Branding is rendered in the root layout, so purge broadly.
    revalidatePath("/", "layout");

    return { id: saved.id };
  });
}
