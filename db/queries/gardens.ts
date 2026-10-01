import { and, asc, eq, ne } from "drizzle-orm";

import { db } from "@/db";
import { gardens, siteSettings } from "@/db/schema";
import type { Garden, SiteSettings } from "@/db/schema";
import { GARDEN_LOCATION } from "@/lib/constants";
import { logServerEvent } from "@/lib/errors";

/**
 * The first deployment shows one active garden, but every query here is
 * garden-scoped so multi-garden support needs no schema change.
 */

export interface GardenBranding {
  gardenId: string;
  gardenName: string;
  gardenSlug: string;
  gardenDescription: string;
  siteTitle: string;
  seoDescription: string;
  primaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  coverImageUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactAddress: string | null;
  defaultTrailId: string | null;
  analyticsEnabled: boolean;
  privacyNotes: string | null;
}

const FALLBACK_BRANDING: GardenBranding = {
  gardenId: "",
  gardenName: GARDEN_LOCATION.name,
  gardenSlug: "garden",
  gardenDescription: `A neighbourhood garden in ${GARDEN_LOCATION.area}, Mumbai — and an outdoor classroom. Scan the QR signs as you walk to learn about the plants, animals and science all around you.`,
  siteTitle: "Garden Explorer",
  seoDescription: `QR learning trails for kids at ${GARDEN_LOCATION.name}, ${GARDEN_LOCATION.area}: scan a sign to learn science, logic and coding with activities, quizzes, XP and badges.`,
  primaryColor: "#2F6B4F",
  logoUrl: null,
  faviconUrl: null,
  coverImageUrl: null,
  contactEmail: null,
  contactPhone: null,
  contactAddress: GARDEN_LOCATION.address,
  defaultTrailId: null,
  analyticsEnabled: true,
  privacyNotes: null,
};

export async function getActiveGarden(): Promise<Garden | null> {
  try {
    const [row] = await db
      .select()
      .from(gardens)
      .where(eq(gardens.status, "published"))
      .orderBy(asc(gardens.createdAt))
      .limit(1);
    return row ?? null;
  } catch (error) {
    logServerEvent("error", "DATABASE_ERROR", {
      query: "getActiveGarden",
      detail: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

export async function getGardenById(id: string): Promise<Garden | null> {
  const [row] = await db.select().from(gardens).where(eq(gardens.id, id)).limit(1);
  return row ?? null;
}

export async function getSiteSettings(gardenId: string): Promise<SiteSettings | null> {
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.gardenId, gardenId))
    .limit(1);
  return row ?? null;
}

/**
 * Resolved branding with hardcoded fallbacks, so the public site renders
 * correctly even before an admin has saved settings.
 */
export async function getBranding(): Promise<GardenBranding> {
  try {
    const garden = await getActiveGarden();
    if (!garden) return FALLBACK_BRANDING;

    const settings = await getSiteSettings(garden.id);

    return {
      gardenId: garden.id,
      gardenName: garden.name,
      gardenSlug: garden.slug,
      gardenDescription: garden.description,
      siteTitle: settings?.siteTitle || garden.name || FALLBACK_BRANDING.siteTitle,
      seoDescription: settings?.seoDescription || FALLBACK_BRANDING.seoDescription,
      primaryColor: settings?.primaryColor || FALLBACK_BRANDING.primaryColor,
      logoUrl: settings?.logoUrl ?? garden.logoUrl ?? null,
      faviconUrl: settings?.faviconUrl ?? null,
      coverImageUrl: garden.coverImageUrl,
      contactEmail: settings?.contactEmail ?? null,
      contactPhone: settings?.contactPhone ?? null,
      contactAddress: settings?.contactAddress ?? null,
      defaultTrailId: settings?.defaultTrailId ?? null,
      analyticsEnabled: settings?.analyticsEnabled ?? true,
      privacyNotes: settings?.privacyNotes ?? null,
    };
  } catch (error) {
    logServerEvent("error", "DATABASE_ERROR", {
      query: "getBranding",
      detail: error instanceof Error ? error.message : "unknown",
    });
    return FALLBACK_BRANDING;
  }
}

export async function listGardens(): Promise<Garden[]> {
  return db.select().from(gardens).orderBy(asc(gardens.name));
}

/** Resolve (or lazily create) the garden an admin mutation should write to. */
export async function ensurePrimaryGarden(): Promise<Garden> {
  const existing = await getActiveGarden();
  if (existing) return existing;

  const [anyGarden] = await db.select().from(gardens).orderBy(asc(gardens.createdAt)).limit(1);
  if (anyGarden) return anyGarden;

  const [created] = await db
    .insert(gardens)
    .values({
      name: "Garden Explorer",
      slug: "garden-explorer",
      description:
        "A community garden with QR learning trails. Edit this description in Admin → Settings.",
      status: "published",
    })
    .returning();

  return created;
}

/** Guard against two gardens sharing a slug. */
export async function isGardenSlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: gardens.id })
    .from(gardens)
    .where(exceptId ? and(eq(gardens.slug, slug), ne(gardens.id, exceptId)) : eq(gardens.slug, slug))
    .limit(1);
  return Boolean(row);
}
