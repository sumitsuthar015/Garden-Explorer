import { and, asc, count, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { locations, qrCodes, trails } from "@/db/schema";
import type { QrCode } from "@/db/schema";
import type { LocationCategory, PublishStatus, QrStatus } from "@/lib/constants";
import { logServerEvent } from "@/lib/errors";

/**
 * QR resolution — the public entry point into the whole product.
 *
 * Everything is validated in order: format (before this module, in
 * `lib/validation/qr.ts`), existence, status, then the linked location's
 * publication state. Nothing here ever reveals an internal database id.
 */

export type QrResolution =
  | { status: "not_found" }
  | { status: "inactive"; locationName: string | null }
  | { status: "location_unavailable"; locationName: string | null }
  | {
      status: "ok";
      qr: QrCode;
      location: {
        id: string;
        slug: string;
        name: string;
        category: LocationCategory;
        shortDescription: string;
        icon: string | null;
        estimatedMinutes: number;
      };
      primaryTrail: { id: string; slug: string; name: string } | null;
    };

export async function resolveQrCode(publicCode: string): Promise<QrResolution> {
  try {
    const [row] = await db
      .select({
        qr: qrCodes,
        location: locations,
      })
      .from(qrCodes)
      .leftJoin(locations, eq(locations.id, qrCodes.locationId))
      .where(eq(qrCodes.publicCode, publicCode))
      .limit(1);

    if (!row) return { status: "not_found" };

    if (row.qr.status !== "active") {
      return { status: "inactive", locationName: row.location?.name ?? null };
    }

    const location = row.location;
    if (!location || location.status !== "published") {
      return { status: "location_unavailable", locationName: location?.name ?? null };
    }

    let primaryTrail: { id: string; slug: string; name: string } | null = null;
    if (row.qr.primaryTrailId) {
      const [trail] = await db
        .select({ id: trails.id, slug: trails.slug, name: trails.name, status: trails.status })
        .from(trails)
        .where(eq(trails.id, row.qr.primaryTrailId))
        .limit(1);

      // A trail that was unpublished must never be used as scan context.
      if (trail && trail.status === "published") {
        primaryTrail = { id: trail.id, slug: trail.slug, name: trail.name };
      }
    }

    return {
      status: "ok",
      qr: row.qr,
      location: {
        id: location.id,
        slug: location.slug,
        name: location.name,
        category: location.category,
        shortDescription: location.shortDescription,
        icon: location.icon,
        estimatedMinutes: location.estimatedMinutes,
      },
      primaryTrail,
    };
  } catch (error) {
    logServerEvent("error", "QR_RESOLUTION_FAILED", {
      publicCode,
      detail: error instanceof Error ? error.message : "unknown",
    });
    // Never leak a database failure to a visitor — surface it as "not found"
    // so the QR error screen (with retry) is shown instead of a stack trace.
    return { status: "not_found" };
  }
}

/** Public lookup used by the location page to show "access by QR". */
export async function listActiveQrCodesForLocation(
  locationId: string,
): Promise<{ publicCode: string; label: string | null }[]> {
  return db
    .select({ publicCode: qrCodes.publicCode, label: qrCodes.label })
    .from(qrCodes)
    .where(and(eq(qrCodes.locationId, locationId), eq(qrCodes.status, "active")))
    .orderBy(asc(qrCodes.publicCode));
}

/* ------------------------------------------------------------------ *
 * Admin queries
 * ------------------------------------------------------------------ */

export interface AdminQrListItem {
  id: string;
  publicCode: string;
  status: QrStatus;
  label: string | null;
  scanCount: number;
  lastScannedAt: Date | null;
  createdAt: Date;
  locationId: string;
  locationName: string | null;
  locationSlug: string | null;
  locationStatus: PublishStatus | null;
  locationIcon: string | null;
  primaryTrailId: string | null;
  primaryTrailName: string | null;
}

export interface AdminQrFilters {
  page: number;
  pageSize: number;
  search: string;
  status: QrStatus | "all";
  locationId: string;
  sort: string;
  direction: "asc" | "desc";
}

export async function listQrCodesAdmin(
  gardenId: string,
  filters: AdminQrFilters,
): Promise<{ rows: AdminQrListItem[]; total: number }> {
  const clauses: SQL[] = [eq(locations.gardenId, gardenId)];

  if (filters.status !== "all") clauses.push(eq(qrCodes.status, filters.status));
  if (filters.locationId) clauses.push(eq(qrCodes.locationId, filters.locationId));
  if (filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    const searchClause = or(ilike(qrCodes.publicCode, term), ilike(locations.name, term));
    if (searchClause) clauses.push(searchClause);
  }

  const where = and(...clauses);
  const direction = filters.direction === "asc" ? asc : desc;
  const sortColumn =
    filters.sort === "code"
      ? qrCodes.publicCode
      : filters.sort === "scans"
        ? qrCodes.scanCount
        : filters.sort === "location"
          ? locations.name
          : qrCodes.createdAt;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        id: qrCodes.id,
        publicCode: qrCodes.publicCode,
        status: qrCodes.status,
        label: qrCodes.label,
        scanCount: qrCodes.scanCount,
        lastScannedAt: qrCodes.lastScannedAt,
        createdAt: qrCodes.createdAt,
        locationId: qrCodes.locationId,
        locationName: locations.name,
        locationSlug: locations.slug,
        locationStatus: locations.status,
        locationIcon: locations.icon,
        primaryTrailId: qrCodes.primaryTrailId,
        primaryTrailName: trails.name,
      })
      .from(qrCodes)
      .leftJoin(locations, eq(locations.id, qrCodes.locationId))
      .leftJoin(trails, eq(trails.id, qrCodes.primaryTrailId))
      .where(where)
      .orderBy(direction(sortColumn))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db
      .select({ value: count() })
      .from(qrCodes)
      .leftJoin(locations, eq(locations.id, qrCodes.locationId))
      .where(where),
  ]);

  return { rows, total: Number(totalRow?.value ?? 0) };
}

export async function getQrCodeById(id: string): Promise<QrCode | null> {
  const [row] = await db.select().from(qrCodes).where(eq(qrCodes.id, id)).limit(1);
  return row ?? null;
}

/** Exact-match lookup used to enforce uniqueness with a friendly error message. */
export async function findQrCodeByPublicCode(publicCode: string): Promise<QrCode | null> {
  const [row] = await db
    .select()
    .from(qrCodes)
    .where(eq(qrCodes.publicCode, publicCode))
    .limit(1);
  return row ?? null;
}

export async function listQrCodeOptions(gardenId: string): Promise<
  { id: string; publicCode: string; locationName: string | null; status: QrStatus }[]
> {
  return db
    .select({
      id: qrCodes.id,
      publicCode: qrCodes.publicCode,
      locationName: locations.name,
      status: qrCodes.status,
    })
    .from(qrCodes)
    .leftJoin(locations, eq(locations.id, qrCodes.locationId))
    .where(eq(locations.gardenId, gardenId))
    .orderBy(asc(qrCodes.publicCode));
}

export async function countQrCodesByStatus(gardenId: string): Promise<{
  total: number;
  active: number;
  disabled: number;
  totalScans: number;
}> {
  const [row] = await db
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where ${qrCodes.status} = 'active')`,
      disabled: sql<number>`count(*) filter (where ${qrCodes.status} = 'disabled')`,
      totalScans: sql<number>`coalesce(sum(${qrCodes.scanCount}), 0)`,
    })
    .from(qrCodes)
    .leftJoin(locations, eq(locations.id, qrCodes.locationId))
    .where(eq(locations.gardenId, gardenId));

  return {
    total: Number(row?.total ?? 0),
    active: Number(row?.active ?? 0),
    disabled: Number(row?.disabled ?? 0),
    totalScans: Number(row?.totalScans ?? 0),
  };
}

/** Print-ready rows for the QR poster pages. */
export async function getQrPrintData(id: string): Promise<{
  qr: QrCode;
  locationName: string;
  locationSlug: string;
  locationShortDescription: string;
  locationIcon: string | null;
  primaryTrailName: string | null;
} | null> {
  const [row] = await db
    .select({
      qr: qrCodes,
      locationName: locations.name,
      locationSlug: locations.slug,
      locationShortDescription: locations.shortDescription,
      locationIcon: locations.icon,
      primaryTrailName: trails.name,
    })
    .from(qrCodes)
    .innerJoin(locations, eq(locations.id, qrCodes.locationId))
    .leftJoin(trails, eq(trails.id, qrCodes.primaryTrailId))
    .where(eq(qrCodes.id, id))
    .limit(1);

  return row ?? null;
}

export async function listQrCodesForPosterSheet(gardenId: string): Promise<AdminQrListItem[]> {
  const { rows } = await listQrCodesAdmin(gardenId, {
    page: 1,
    pageSize: 200,
    search: "",
    status: "active",
    locationId: "",
    sort: "code",
    direction: "asc",
  });
  return rows;
}
