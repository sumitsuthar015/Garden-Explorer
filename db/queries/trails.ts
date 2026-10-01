import { and, asc, count, desc, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { locations, qrCodes, trailStops, trails } from "@/db/schema";
import type { Trail, TrailStop } from "@/db/schema";
import type { AgeGroup, LocationCategory, PublishStatus, TrailDifficulty } from "@/lib/constants";
import { logServerEvent } from "@/lib/errors";

/**
 * Trail queries.
 *
 * The "next place" system replaces maps completely: a stop's
 * `instructionToNext` is written physical directions. Nothing here uses GPS.
 */

export interface TrailCard {
  id: string;
  slug: string;
  name: string;
  description: string;
  difficulty: TrailDifficulty;
  ageGroup: AgeGroup;
  estimatedMinutes: number;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  icon: string | null;
  themeColor: string | null;
  stopCount: number;
}

export interface TrailStopView {
  position: number;
  instructionToNext: string;
  location: {
    id: string;
    slug: string;
    name: string;
    shortDescription: string;
    category: LocationCategory;
    icon: string | null;
    heroImageUrl: string | null;
    estimatedMinutes: number;
  };
}

export interface PublicTrailDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  goals: string[];
  difficulty: TrailDifficulty;
  ageGroup: AgeGroup;
  estimatedMinutes: number;
  coverImageUrl: string | null;
  coverImageAlt: string | null;
  icon: string | null;
  themeColor: string | null;
  stops: TrailStopView[];
  categories: LocationCategory[];
}

const TRAIL_CARD_COLUMNS = {
  id: trails.id,
  slug: trails.slug,
  name: trails.name,
  description: trails.description,
  difficulty: trails.difficulty,
  ageGroup: trails.ageGroup,
  estimatedMinutes: trails.estimatedMinutes,
  coverImageUrl: trails.coverImageUrl,
  coverImageAlt: trails.coverImageAlt,
  icon: trails.icon,
  themeColor: trails.themeColor,
  stopCount: sql<number>`(select count(*) from trail_stops ts where ts.trail_id = "trails"."id")`,
} as const;

export async function listPublishedTrails(): Promise<TrailCard[]> {
  try {
    const rows = await db
      .select(TRAIL_CARD_COLUMNS)
      .from(trails)
      .where(eq(trails.status, "published"))
      .orderBy(asc(trails.displayOrder), asc(trails.name));

    return rows.map((row) => ({ ...row, stopCount: Number(row.stopCount ?? 0) }));
  } catch (error) {
    logServerEvent("error", "TRAIL_FETCH_FAILED", {
      query: "listPublishedTrails",
      detail: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}

function parseGoals(goals: string): string[] {
  return goals
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);
}

export async function getPublishedTrailDetail(slug: string): Promise<PublicTrailDetail | null> {
  try {
    const [trail] = await db
      .select()
      .from(trails)
      .where(and(eq(trails.slug, slug), eq(trails.status, "published")))
      .limit(1);

    if (!trail) return null;

    const stops = await listTrailStops(trail.id);
    if (stops.length === 0) return null;

    return {
      id: trail.id,
      slug: trail.slug,
      name: trail.name,
      description: trail.description,
      goals: parseGoals(trail.goals),
      difficulty: trail.difficulty,
      ageGroup: trail.ageGroup,
      estimatedMinutes: trail.estimatedMinutes,
      coverImageUrl: trail.coverImageUrl,
      coverImageAlt: trail.coverImageAlt,
      icon: trail.icon,
      themeColor: trail.themeColor,
      stops,
      categories: [...new Set(stops.map((stop) => stop.location.category))],
    };
  } catch (error) {
    logServerEvent("error", "TRAIL_FETCH_FAILED", {
      query: "getPublishedTrailDetail",
      slug,
      detail: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

/** Ordered stops joined to their published location. */
export async function listTrailStops(trailId: string): Promise<TrailStopView[]> {
  const rows = await db
    .select({
      position: trailStops.position,
      instructionToNext: trailStops.instructionToNext,
      locationId: locations.id,
      slug: locations.slug,
      name: locations.name,
      shortDescription: locations.shortDescription,
      category: locations.category,
      icon: locations.icon,
      heroImageUrl: locations.heroImageUrl,
      estimatedMinutes: locations.estimatedMinutes,
      locationStatus: locations.status,
    })
    .from(trailStops)
    .innerJoin(locations, eq(locations.id, trailStops.locationId))
    .where(eq(trailStops.trailId, trailId))
    .orderBy(asc(trailStops.position));

  return rows
    .filter((row) => row.locationStatus === "published")
    .map((row) => ({
      position: row.position,
      instructionToNext: row.instructionToNext,
      location: {
        id: row.locationId,
        slug: row.slug,
        name: row.name,
        shortDescription: row.shortDescription,
        category: row.category,
        icon: row.icon,
        heroImageUrl: row.heroImageUrl,
        estimatedMinutes: row.estimatedMinutes,
      },
    }));
}

export interface TrailContext {
  trail: { id: string; slug: string; name: string; difficulty: TrailDifficulty };
  stops: TrailStopView[];
  currentPosition: number;
  totalStops: number;
  isFirst: boolean;
  isLast: boolean;
  nextStop: { location: TrailStopView["location"]; instruction: string; position: number } | null;
  previousStop: { location: TrailStopView["location"]; position: number } | null;
}

/**
 * Resolve the trail context for one location.
 *
 * When `preferredTrailId` is given (the QR's primary trail) it is used if the
 * location is actually part of it; otherwise the first published trail that
 * contains the location wins. Out-of-order scanning is intentionally allowed —
 * any position is valid, we only report where the visitor is.
 */
export async function findTrailContextForLocation(
  locationId: string,
  preferredTrailId?: string | null,
): Promise<TrailContext | null> {
  try {
    const candidateIds = await db
      .select({ trailId: trailStops.trailId })
      .from(trailStops)
      .innerJoin(trails, eq(trails.id, trailStops.trailId))
      .where(and(eq(trailStops.locationId, locationId), eq(trails.status, "published")))
      .orderBy(asc(trails.displayOrder));

    if (candidateIds.length === 0) return null;

    const trailId =
      preferredTrailId && candidateIds.some((row) => row.trailId === preferredTrailId)
        ? preferredTrailId
        : candidateIds[0].trailId;

    const [trail] = await db
      .select({
        id: trails.id,
        slug: trails.slug,
        name: trails.name,
        difficulty: trails.difficulty,
      })
      .from(trails)
      .where(eq(trails.id, trailId))
      .limit(1);

    if (!trail) return null;

    const stops = await listTrailStops(trail.id);
    const index = stops.findIndex((stop) => stop.location.id === locationId);
    if (index === -1) return null;

    const current = stops[index];
    const next = stops[index + 1] ?? null;
    const previous = index > 0 ? stops[index - 1] : null;

    return {
      trail,
      stops,
      currentPosition: current.position,
      totalStops: stops.length,
      isFirst: index === 0,
      isLast: index === stops.length - 1,
      nextStop: next
        ? {
            location: next.location,
            // Falls back to a clear instruction if an admin left it blank.
            instruction:
              current.instructionToNext.trim() ||
              `Continue along the trail to ${next.location.name}. Look for the Garden Explorer sign with its QR code.`,
            position: next.position,
          }
        : null,
      previousStop: previous ? { location: previous.location, position: previous.position } : null,
    };
  } catch (error) {
    logServerEvent("error", "TRAIL_FETCH_FAILED", {
      query: "findTrailContextForLocation",
      locationId,
      detail: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

/** Every published trail this location belongs to — powers trail switching. */
export async function listTrailsForLocation(
  locationId: string,
): Promise<{ slug: string; name: string; difficulty: TrailDifficulty; stopCount: number; position: number }[]> {
  const rows = await db
    .select({
      slug: trails.slug,
      name: trails.name,
      difficulty: trails.difficulty,
      position: trailStops.position,
      stopCount: sql<number>`(select count(*) from trail_stops ts where ts.trail_id = "trails"."id")`,
    })
    .from(trailStops)
    .innerJoin(trails, eq(trails.id, trailStops.trailId))
    .where(and(eq(trailStops.locationId, locationId), eq(trails.status, "published")))
    .orderBy(asc(trails.displayOrder));

  return rows.map((row) => ({ ...row, stopCount: Number(row.stopCount ?? 0) }));
}

export async function listPublishedTrailSlugs(): Promise<{ slug: string; updatedAt: Date }[]> {
  try {
    return await db
      .select({ slug: trails.slug, updatedAt: trails.updatedAt })
      .from(trails)
      .where(eq(trails.status, "published"));
  } catch {
    return [];
  }
}

export async function countPublishedTrails(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(trails)
    .where(eq(trails.status, "published"));
  return Number(row?.value ?? 0);
}

/* ------------------------------------------------------------------ *
 * Admin queries
 * ------------------------------------------------------------------ */

export interface AdminTrailListItem extends Trail {
  stopCount: number;
}

export interface AdminTrailFilters {
  page: number;
  pageSize: number;
  search: string;
  status: PublishStatus | "all";
  sort: string;
  direction: "asc" | "desc";
}

export async function listTrailsAdmin(
  gardenId: string,
  filters: AdminTrailFilters,
): Promise<{ rows: AdminTrailListItem[]; total: number }> {
  const clauses: SQL[] = [eq(trails.gardenId, gardenId)];

  if (filters.status !== "all") clauses.push(eq(trails.status, filters.status));
  if (filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    const searchClause = or(ilike(trails.name, term), ilike(trails.slug, term));
    if (searchClause) clauses.push(searchClause);
  }

  const where = and(...clauses);
  const direction = filters.direction === "asc" ? asc : desc;
  const sortColumn =
    filters.sort === "name"
      ? trails.name
      : filters.sort === "status"
        ? trails.status
        : trails.updatedAt;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        trail: trails,
        stopCount: sql<number>`(select count(*) from trail_stops ts where ts.trail_id = "trails"."id")`,
      })
      .from(trails)
      .where(where)
      .orderBy(direction(sortColumn))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db.select({ value: count() }).from(trails).where(where),
  ]);

  return {
    rows: rows.map((row) => ({ ...row.trail, stopCount: Number(row.stopCount ?? 0) })),
    total: Number(totalRow?.value ?? 0),
  };
}

export interface AdminTrailStop {
  id: string;
  locationId: string;
  position: number;
  instructionToNext: string;
  estimatedMinutes: number | null;
  locationName: string;
  locationSlug: string;
  locationStatus: PublishStatus;
  locationCategory: LocationCategory;
  locationIcon: string | null;
}

export interface AdminTrailDetail {
  trail: Trail;
  stops: AdminTrailStop[];
  qrCodesUsingAsPrimary: { id: string; publicCode: string }[];
}

export async function getTrailDetailForAdmin(id: string): Promise<AdminTrailDetail | null> {
  const [trail] = await db.select().from(trails).where(eq(trails.id, id)).limit(1);
  if (!trail) return null;

  const rows = await db
    .select({
      id: trailStops.id,
      locationId: trailStops.locationId,
      position: trailStops.position,
      instructionToNext: trailStops.instructionToNext,
      estimatedMinutes: trailStops.estimatedMinutes,
      locationName: locations.name,
      locationSlug: locations.slug,
      locationStatus: locations.status,
      locationCategory: locations.category,
      locationIcon: locations.icon,
    })
    .from(trailStops)
    .innerJoin(locations, eq(locations.id, trailStops.locationId))
    .where(eq(trailStops.trailId, id))
    .orderBy(asc(trailStops.position));

  const primaryRows = await db
    .select({ id: qrCodes.id, publicCode: qrCodes.publicCode })
    .from(qrCodes)
    .where(eq(qrCodes.primaryTrailId, id))
    .orderBy(asc(qrCodes.publicCode));

  return {
    trail,
    stops: rows,
    qrCodesUsingAsPrimary: primaryRows,
  };
}

export async function listTrailOptions(
  gardenId: string,
): Promise<{ id: string; name: string; slug: string; status: PublishStatus }[]> {
  return db
    .select({ id: trails.id, name: trails.name, slug: trails.slug, status: trails.status })
    .from(trails)
    .where(eq(trails.gardenId, gardenId))
    .orderBy(asc(trails.name));
}

export async function isTrailSlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: trails.id })
    .from(trails)
    .where(exceptId ? and(eq(trails.slug, slug), ne(trails.id, exceptId)) : eq(trails.slug, slug))
    .limit(1);
  return Boolean(row);
}

export async function countTrailsByStatus(gardenId: string): Promise<{
  total: number;
  published: number;
  draft: number;
}> {
  const [row] = await db
    .select({
      total: count(),
      published: sql<number>`count(*) filter (where ${trails.status} = 'published')`,
      draft: sql<number>`count(*) filter (where ${trails.status} = 'draft')`,
    })
    .from(trails)
    .where(eq(trails.gardenId, gardenId));

  return {
    total: Number(row?.total ?? 0),
    published: Number(row?.published ?? 0),
    draft: Number(row?.draft ?? 0),
  };
}

/** Stop rows for a trail, used by the publish guard. */
export async function getTrailStopsForValidation(
  trailId: string,
): Promise<Pick<TrailStop, "id" | "locationId" | "position" | "instructionToNext">[]> {
  return db
    .select({
      id: trailStops.id,
      locationId: trailStops.locationId,
      position: trailStops.position,
      instructionToNext: trailStops.instructionToNext,
    })
    .from(trailStops)
    .where(eq(trailStops.trailId, trailId))
    .orderBy(asc(trailStops.position));
}
