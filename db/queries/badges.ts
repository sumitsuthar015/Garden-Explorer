import { asc, desc, eq, inArray, or } from "drizzle-orm";

import { db } from "@/db";
import { badges } from "@/db/schema";
import type { Badge } from "@/db/schema";
import type { BadgeDefinition } from "@/lib/badges";
import { logServerEvent } from "@/lib/errors";

/**
 * Badge queries.
 *
 * Badge *rules* live in the database and the evaluation logic is a pure
 * function in `lib/badges.ts`. Definitions are shipped to the client so
 * progress can be evaluated offline against local state — nothing about badge
 * maths is hardcoded into a UI component.
 */

export function toBadgeDefinition(badge: Badge): BadgeDefinition {
  return {
    id: badge.id,
    code: badge.code,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    criteriaType: badge.criteriaType as BadgeDefinition["criteriaType"],
    config: badge.config ?? {},
    displayOrder: badge.displayOrder,
  };
}

export async function listPublishedBadges(): Promise<BadgeDefinition[]> {
  try {
    const rows = await db
      .select()
      .from(badges)
      .where(eq(badges.status, "published"))
      .orderBy(asc(badges.displayOrder), asc(badges.name));

    return rows.map(toBadgeDefinition);
  } catch (error) {
    logServerEvent("error", "DATABASE_ERROR", {
      query: "listPublishedBadges",
      detail: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}

export async function listBadgesAdmin(): Promise<Badge[]> {
  return db
    .select()
    .from(badges)
    .orderBy(asc(badges.displayOrder), asc(badges.name));
}

export async function getBadgeById(id: string): Promise<Badge | null> {
  const [row] = await db.select().from(badges).where(eq(badges.id, id)).limit(1);
  return row ?? null;
}

/** Also returns archived badges so editing never silently "loses" one. */
export async function listBadgesByCodes(codes: string[]): Promise<Badge[]> {
  if (codes.length === 0) return [];
  return db
    .select()
    .from(badges)
    .where(inArray(badges.code, codes))
    .orderBy(desc(badges.displayOrder));
}

export async function isBadgeCodeTaken(code: string, exceptId?: string): Promise<boolean> {
  const rows = await db
    .select({ id: badges.id })
    .from(badges)
    .where(exceptId ? or(eq(badges.code, code), eq(badges.id, exceptId)) : eq(badges.code, code));

  return rows.some((row) => row.id !== exceptId);
}

export async function countBadges(): Promise<{ total: number; published: number }> {
  const rows = await db.select({ status: badges.status }).from(badges);
  return {
    total: rows.length,
    published: rows.filter((row) => row.status === "published").length,
  };
}
