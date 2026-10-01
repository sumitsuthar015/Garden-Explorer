import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";

import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import type { MediaAsset } from "@/db/schema";

export interface AdminMediaFilters {
  page: number;
  pageSize: number;
  search: string;
}

export async function listMediaAssets(
  filters: AdminMediaFilters,
): Promise<{ rows: MediaAsset[]; total: number }> {
  const clauses: SQL[] = [];

  if (filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    const searchClause = or(
      ilike(mediaAssets.originalFilename, term),
      ilike(mediaAssets.publicId, term),
      ilike(mediaAssets.alt, term),
    );
    if (searchClause) clauses.push(searchClause);
  }

  const where = clauses.length ? and(...clauses) : undefined;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select()
      .from(mediaAssets)
      .where(where)
      .orderBy(desc(mediaAssets.createdAt))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db.select({ value: count() }).from(mediaAssets).where(where),
  ]);

  return { rows, total: Number(totalRow?.value ?? 0) };
}

export async function getMediaAssetByPublicId(publicId: string): Promise<MediaAsset | null> {
  const [row] = await db
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.publicId, publicId))
    .limit(1);
  return row ?? null;
}

export async function countMediaAssets(): Promise<number> {
  const [row] = await db.select({ value: count() }).from(mediaAssets);
  return Number(row?.value ?? 0);
}

export async function listRecentMedia(limit = 24): Promise<MediaAsset[]> {
  return db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt)).limit(limit);
}
