import { and, asc, count, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";

import { db } from "@/db";
import {
  activities,
  locationContentBlocks,
  locationFacts,
  locations,
  quizOptions,
  quizQuestions,
  quizzes,
  trailStops,
} from "@/db/schema";
import type { ActivityConfig } from "@/db/schema/activities";
import type { Activity, Location, LocationContentBlock, LocationFact } from "@/db/schema";
import type { ActivityType, ContentBlockType, LocationCategory, PublishStatus } from "@/lib/constants";
import { logServerEvent } from "@/lib/errors";

/**
 * Location queries.
 *
 * Public functions only ever return `status = 'published'` rows. Admin
 * functions are explicitly named and are only called after `requireAdmin()`.
 */

export interface PublicActivityConfig {
  confirmLabel?: string;
  /** Present for yes/no and choice activities. */
  yesNo?: boolean;
  options?: string[];
  minLength?: number;
  sampleAnswer?: string;
}

export interface PublicActivity {
  id: string;
  type: ActivityType;
  prompt: string;
  hint: string | null;
  successMessage: string;
  points: number;
  config: PublicActivityConfig;
}

export interface PublicContentBlock {
  id: string;
  type: ContentBlockType;
  title: string | null;
  body: string;
  mediaUrl: string | null;
  mediaAlt: string | null;
  mediaCaption: string | null;
}

export interface PublicQuizOption {
  id: string;
  text: string;
}

export interface PublicQuizQuestion {
  id: string;
  prompt: string;
  /** Hint text is sent so the learning flow can offer it after a wrong answer. */
  hint: string | null;
  points: number;
  difficulty: string;
  options: PublicQuizOption[];
}

export interface PublicQuiz {
  id: string;
  title: string;
  description: string | null;
  completionPoints: number;
  questions: PublicQuizQuestion[];
}

export interface PublicLocationDetail {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  description: string;
  category: LocationCategory;
  icon: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  estimatedMinutes: number;
  featured: boolean;
  facts: { id: string; label: string; value: string }[];
  contentBlocks: PublicContentBlock[];
  activities: PublicActivity[];
  quiz: PublicQuiz | null;
}

export interface LocationCard {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  category: LocationCategory;
  icon: string | null;
  heroImageUrl: string | null;
  heroImageAlt: string | null;
  estimatedMinutes: number;
  featured: boolean;
  /** Number of completed stops when this card is listed inside a trail. */
  trailPosition?: number | null;
}

/**
 * Strip answer keys before anything reaches the browser.
 * Grading always happens in a server action against the stored row.
 */
export function sanitizeActivityConfig(
  type: ActivityType,
  config: ActivityConfig,
): PublicActivityConfig {
  const safe: PublicActivityConfig = {};
  if (config.confirmLabel) safe.confirmLabel = config.confirmLabel;
  if (type === "multiple_choice" || type === "selection") {
    safe.options = config.options ?? [];
  }
  if (type === "thinking") {
    if (config.sampleAnswer) safe.sampleAnswer = config.sampleAnswer;
    if (typeof config.minLength === "number") safe.minLength = config.minLength;
  }
  return safe;
}

const LOCATION_CARD_COLUMNS = {
  id: locations.id,
  slug: locations.slug,
  name: locations.name,
  shortDescription: locations.shortDescription,
  category: locations.category,
  icon: locations.icon,
  heroImageUrl: locations.heroImageUrl,
  heroImageAlt: locations.heroImageAlt,
  estimatedMinutes: locations.estimatedMinutes,
  featured: locations.featured,
} as const;

function locationFilters(options: {
  category?: LocationCategory | "all";
  featured?: boolean;
  search?: string;
}): SQL[] {
  const clauses: SQL[] = [eq(locations.status, "published")];

  if (options.category && options.category !== "all") {
    clauses.push(eq(locations.category, options.category));
  }
  if (options.featured) {
    clauses.push(eq(locations.featured, true));
  }
  if (options.search?.trim()) {
    const term = `%${options.search.trim()}%`;
    const searchClause = or(
      ilike(locations.name, term),
      ilike(locations.shortDescription, term),
      ilike(locations.description, term),
    );
    if (searchClause) clauses.push(searchClause);
  }

  return clauses;
}

export async function listPublishedLocationCards(options: {
  category?: LocationCategory | "all";
  featured?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<LocationCard[]> {
  try {
    const rows = await db
      .select(LOCATION_CARD_COLUMNS)
      .from(locations)
      .where(and(...locationFilters(options)))
      .orderBy(desc(locations.featured), asc(locations.displayOrder), asc(locations.name))
      .limit(options.limit ?? 60)
      .offset(options.offset ?? 0);

    return rows;
  } catch (error) {
    logServerEvent("error", "LOCATION_FETCH_FAILED", {
      query: "listPublishedLocationCards",
      detail: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}

export async function countPublishedLocations(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(locations)
    .where(eq(locations.status, "published"));
  return Number(row?.value ?? 0);
}

export async function listPublishedCategoriesWithCounts(): Promise<
  { category: LocationCategory; total: number }[]
> {
  try {
    const rows = await db
      .select({ category: locations.category, total: count() })
      .from(locations)
      .where(eq(locations.status, "published"))
      .groupBy(locations.category)
      .orderBy(desc(count()));

    return rows.map((row) => ({ category: row.category, total: Number(row.total) }));
  } catch (error) {
    logServerEvent("error", "LOCATION_FETCH_FAILED", {
      query: "listPublishedCategoriesWithCounts",
      detail: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}

/** Slug -> category map used by client-side badge rules. */
export async function getPublishedLocationCategoryIndex(): Promise<
  Record<string, string>
> {
  try {
    const rows = await db
      .select({ slug: locations.slug, category: locations.category })
      .from(locations)
      .where(eq(locations.status, "published"));

    return Object.fromEntries(rows.map((row) => [row.slug, row.category]));
  } catch {
    return {};
  }
}

/**
 * Full public learning payload for one location.
 * Returns null when the location is missing, archived or still a draft.
 */
export async function getPublishedLocationDetail(slug: string): Promise<PublicLocationDetail | null> {
  try {
    const [location] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.slug, slug), eq(locations.status, "published")))
      .limit(1);

    if (!location) return null;

    const [facts, blocks, activityRows, quiz] = await Promise.all([
      db
        .select()
        .from(locationFacts)
        .where(eq(locationFacts.locationId, location.id))
        .orderBy(asc(locationFacts.displayOrder)),
      db
        .select()
        .from(locationContentBlocks)
        .where(
          and(
            eq(locationContentBlocks.locationId, location.id),
            eq(locationContentBlocks.status, "published"),
          ),
        )
        .orderBy(asc(locationContentBlocks.displayOrder)),
      db
        .select()
        .from(activities)
        .where(and(eq(activities.locationId, location.id), eq(activities.status, "published")))
        .orderBy(asc(activities.displayOrder)),
      getPublishedQuizForLocation(location.id),
    ]);

    return {
      id: location.id,
      slug: location.slug,
      name: location.name,
      shortDescription: location.shortDescription,
      description: location.description,
      category: location.category,
      icon: location.icon,
      heroImageUrl: location.heroImageUrl,
      heroImageAlt: location.heroImageAlt,
      estimatedMinutes: location.estimatedMinutes,
      featured: location.featured,
      facts: facts.map((fact) => ({ id: fact.id, label: fact.label, value: fact.value })),
      contentBlocks: blocks.map((block) => ({
        id: block.id,
        type: block.type,
        title: block.title,
        body: block.body,
        mediaUrl: block.mediaUrl,
        mediaAlt: block.mediaAlt,
        mediaCaption: block.mediaCaption,
      })),
      activities: activityRows.map((activity) => ({
        id: activity.id,
        type: activity.type,
        prompt: activity.prompt,
        hint: activity.hint,
        successMessage: activity.successMessage,
        points: activity.points,
        config: sanitizeActivityConfig(activity.type, activity.config ?? {}),
      })),
      quiz,
    };
  } catch (error) {
    logServerEvent("error", "LOCATION_FETCH_FAILED", {
      query: "getPublishedLocationDetail",
      slug,
      detail: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

/** Public quiz shape — correct flags are deliberately omitted. */
export async function getPublishedQuizForLocation(locationId: string): Promise<PublicQuiz | null> {
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.locationId, locationId), eq(quizzes.status, "published")))
    .orderBy(asc(quizzes.displayOrder), asc(quizzes.createdAt))
    .limit(1);

  if (!quiz) return null;

  const questions = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(asc(quizQuestions.displayOrder), asc(quizQuestions.createdAt));

  if (questions.length === 0) return null;

  const questionIds = questions.map((question) => question.id);
  const options = await db
    .select({ id: quizOptions.id, questionId: quizOptions.questionId, text: quizOptions.text })
    .from(quizOptions)
    .where(inArray(quizOptions.questionId, questionIds))
    .orderBy(asc(quizOptions.displayOrder), asc(quizOptions.createdAt));

  const grouped = new Map<string, PublicQuizOption[]>();
  for (const option of options) {
    const list = grouped.get(option.questionId) ?? [];
    list.push({ id: option.id, text: option.text });
    grouped.set(option.questionId, list);
  }

  const usable = questions.filter((question) => (grouped.get(question.id)?.length ?? 0) >= 2);
  if (usable.length === 0) return null;

  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    completionPoints: quiz.completionPoints,
    questions: usable.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      hint: question.hint,
      points: question.points,
      difficulty: question.difficulty,
      options: grouped.get(question.id) ?? [],
    })),
  };
}

/** Slugs for the sitemap. */
export async function listPublishedLocationSlugs(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  try {
    return await db
      .select({ slug: locations.slug, updatedAt: locations.updatedAt })
      .from(locations)
      .where(eq(locations.status, "published"));
  } catch {
    return [];
  }
}

/** Trails a location belongs to, for the "part of this trail" panel. */
export async function listTrailSlugsForLocation(locationId: string): Promise<string[]> {
  try {
    const rows = await db
      .select({ trailId: trailStops.trailId })
      .from(trailStops)
      .where(eq(trailStops.locationId, locationId));
    return rows.map((row) => row.trailId);
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ *
 * Admin queries — callers must have already passed requireAdmin().
 * ------------------------------------------------------------------ */

export interface AdminLocationListItem extends Location {
  qrCount: number;
  contentBlockCount: number;
}

export interface AdminLocationFilters {
  page: number;
  pageSize: number;
  search: string;
  status: PublishStatus | "all";
  category: LocationCategory | "all";
  sort: string;
  direction: "asc" | "desc";
}

export async function listLocationsAdmin(
  gardenId: string,
  filters: AdminLocationFilters,
): Promise<{ rows: AdminLocationListItem[]; total: number }> {
  const clauses: SQL[] = [eq(locations.gardenId, gardenId)];

  if (filters.status !== "all") clauses.push(eq(locations.status, filters.status));
  if (filters.category !== "all") clauses.push(eq(locations.category, filters.category));
  if (filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    const searchClause = or(ilike(locations.name, term), ilike(locations.slug, term));
    if (searchClause) clauses.push(searchClause);
  }

  const where = and(...clauses);
  const direction = filters.direction === "asc" ? asc : desc;
  const sortColumn =
    filters.sort === "name"
      ? locations.name
      : filters.sort === "status"
        ? locations.status
        : filters.sort === "category"
          ? locations.category
          : locations.updatedAt;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        location: locations,
        qrCount: sql<number>`(select count(*) from qr_codes q where q.location_id = "locations"."id")`,
        contentBlockCount: sql<number>`(select count(*) from location_content_blocks b where b.location_id = "locations"."id")`,
      })
      .from(locations)
      .where(where)
      .orderBy(direction(sortColumn))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db.select({ value: count() }).from(locations).where(where),
  ]);

  return {
    rows: rows.map((row) => ({
      ...row.location,
      qrCount: Number(row.qrCount ?? 0),
      contentBlockCount: Number(row.contentBlockCount ?? 0),
    })),
    total: Number(totalRow?.value ?? 0),
  };
}

export async function listLocationOptions(gardenId: string): Promise<
  { id: string; name: string; slug: string; status: PublishStatus; category: LocationCategory }[]
> {
  return db
    .select({
      id: locations.id,
      name: locations.name,
      slug: locations.slug,
      status: locations.status,
      category: locations.category,
    })
    .from(locations)
    .where(eq(locations.gardenId, gardenId))
    .orderBy(asc(locations.name));
}

export interface AdminLocationDetail {
  location: Location;
  facts: LocationFact[];
  contentBlocks: LocationContentBlock[];
  activities: Activity[];
  quizzes: { id: string; title: string; status: PublishStatus; questionCount: number }[];
  trailIds: string[];
}

export async function getLocationDetailForAdmin(id: string): Promise<AdminLocationDetail | null> {
  const [location] = await db.select().from(locations).where(eq(locations.id, id)).limit(1);
  if (!location) return null;

  const [facts, blocks, activityRows, quizRows, stopRows] = await Promise.all([
    db
      .select()
      .from(locationFacts)
      .where(eq(locationFacts.locationId, id))
      .orderBy(asc(locationFacts.displayOrder)),
    db
      .select()
      .from(locationContentBlocks)
      .where(eq(locationContentBlocks.locationId, id))
      .orderBy(asc(locationContentBlocks.displayOrder)),
    db
      .select()
      .from(activities)
      .where(eq(activities.locationId, id))
      .orderBy(asc(activities.displayOrder)),
    db
      .select({
        id: quizzes.id,
        title: quizzes.title,
        status: quizzes.status,
        questionCount: sql<number>`(select count(*) from quiz_questions qq where qq.quiz_id = "quizzes"."id")`,
      })
      .from(quizzes)
      .where(eq(quizzes.locationId, id))
      .orderBy(asc(quizzes.displayOrder)),
    db.select({ trailId: trailStops.trailId }).from(trailStops).where(eq(trailStops.locationId, id)),
  ]);

  return {
    location,
    facts,
    contentBlocks: blocks,
    activities: activityRows,
    quizzes: quizRows.map((row) => ({ ...row, questionCount: Number(row.questionCount ?? 0) })),
    trailIds: stopRows.map((row) => row.trailId),
  };
}

export async function isLocationSlugTaken(slug: string, exceptId?: string): Promise<boolean> {
  const [row] = await db
    .select({ id: locations.id })
    .from(locations)
    .where(exceptId ? and(eq(locations.slug, slug), ne(locations.id, exceptId)) : eq(locations.slug, slug))
    .limit(1);
  return Boolean(row);
}

export async function countLocationsByStatus(gardenId: string): Promise<{
  total: number;
  published: number;
  draft: number;
  archived: number;
  featured: number;
}> {
  const [row] = await db
    .select({
      total: count(),
      published: sql<number>`count(*) filter (where ${locations.status} = 'published')`,
      draft: sql<number>`count(*) filter (where ${locations.status} = 'draft')`,
      archived: sql<number>`count(*) filter (where ${locations.status} = 'archived')`,
      featured: sql<number>`count(*) filter (where ${locations.featured} = true)`,
    })
    .from(locations)
    .where(eq(locations.gardenId, gardenId));

  return {
    total: Number(row?.total ?? 0),
    published: Number(row?.published ?? 0),
    draft: Number(row?.draft ?? 0),
    archived: Number(row?.archived ?? 0),
    featured: Number(row?.featured ?? 0),
  };
}

/* ------------------------------------------------------------------ *
 * Cross-location content browsing (/admin/content)
 * ------------------------------------------------------------------ */

export interface AdminContentBlockListItem extends LocationContentBlock {
  locationName: string;
  locationSlug: string;
  locationStatus: PublishStatus;
}

export interface AdminContentFilters {
  page: number;
  pageSize: number;
  search: string;
  type: ContentBlockType | "all";
  status: PublishStatus | "all";
  locationId: string;
  sort: string;
  direction: "asc" | "desc";
}

/**
 * Every learning card across the garden, so an admin can audit the writing
 * without opening each place one by one.
 */
export async function listContentBlocksAdmin(
  gardenId: string,
  filters: AdminContentFilters,
): Promise<{ rows: AdminContentBlockListItem[]; total: number }> {
  const clauses: SQL[] = [eq(locations.gardenId, gardenId)];

  if (filters.type !== "all") clauses.push(eq(locationContentBlocks.type, filters.type));
  if (filters.status !== "all") clauses.push(eq(locationContentBlocks.status, filters.status));
  if (filters.locationId) clauses.push(eq(locationContentBlocks.locationId, filters.locationId));
  if (filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    const searchClause = or(
      ilike(locationContentBlocks.title, term),
      ilike(locationContentBlocks.body, term),
    );
    if (searchClause) clauses.push(searchClause);
  }

  const where = and(...clauses);
  const direction = filters.direction === "asc" ? asc : desc;
  const sortColumn =
    filters.sort === "location"
      ? locations.name
      : filters.sort === "type"
        ? locationContentBlocks.type
        : locationContentBlocks.updatedAt;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        block: locationContentBlocks,
        locationName: locations.name,
        locationSlug: locations.slug,
        locationStatus: locations.status,
      })
      .from(locationContentBlocks)
      .innerJoin(locations, eq(locations.id, locationContentBlocks.locationId))
      .where(where)
      .orderBy(direction(sortColumn), asc(locationContentBlocks.displayOrder))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db
      .select({ value: count() })
      .from(locationContentBlocks)
      .innerJoin(locations, eq(locations.id, locationContentBlocks.locationId))
      .where(where),
  ]);

  return {
    rows: rows.map((row) => ({
      ...row.block,
      locationName: row.locationName,
      locationSlug: row.locationSlug,
      locationStatus: row.locationStatus,
    })),
    total: Number(totalRow?.value ?? 0),
  };
}

export interface AdminActivityListItem extends Activity {
  locationName: string;
  locationSlug: string;
  locationStatus: PublishStatus;
}

export interface AdminActivityFilters {
  page: number;
  pageSize: number;
  search: string;
  type: ActivityType | "all";
  status: PublishStatus | "all";
  locationId: string;
  sort: string;
  direction: "asc" | "desc";
}

/** Every observation and thinking activity across the garden. */
export async function listActivitiesAdmin(
  gardenId: string,
  filters: AdminActivityFilters,
): Promise<{ rows: AdminActivityListItem[]; total: number }> {
  const clauses: SQL[] = [eq(locations.gardenId, gardenId)];

  if (filters.type !== "all") clauses.push(eq(activities.type, filters.type));
  if (filters.status !== "all") clauses.push(eq(activities.status, filters.status));
  if (filters.locationId) clauses.push(eq(activities.locationId, filters.locationId));
  if (filters.search.trim()) {
    const term = `%${filters.search.trim()}%`;
    const searchClause = or(ilike(activities.prompt, term), ilike(activities.hint, term));
    if (searchClause) clauses.push(searchClause);
  }

  const where = and(...clauses);
  const direction = filters.direction === "asc" ? asc : desc;
  const sortColumn =
    filters.sort === "location"
      ? locations.name
      : filters.sort === "type"
        ? activities.type
        : activities.updatedAt;

  const [rows, [totalRow]] = await Promise.all([
    db
      .select({
        activity: activities,
        locationName: locations.name,
        locationSlug: locations.slug,
        locationStatus: locations.status,
      })
      .from(activities)
      .innerJoin(locations, eq(locations.id, activities.locationId))
      .where(where)
      .orderBy(direction(sortColumn), asc(activities.displayOrder))
      .limit(filters.pageSize)
      .offset((filters.page - 1) * filters.pageSize),
    db
      .select({ value: count() })
      .from(activities)
      .innerJoin(locations, eq(locations.id, activities.locationId))
      .where(where),
  ]);

  return {
    rows: rows.map((row) => ({
      ...row.activity,
      locationName: row.locationName,
      locationSlug: row.locationSlug,
      locationStatus: row.locationStatus,
    })),
    total: Number(totalRow?.value ?? 0),
  };
}

/** Used by the doctor script and publish guards. */
export async function getPublishedLocationIdSet(gardenId: string): Promise<Set<string>> {
  const rows = await db
    .select({ id: locations.id })
    .from(locations)
    .where(and(eq(locations.gardenId, gardenId), eq(locations.status, "published")));
  return new Set(rows.map((row) => row.id));
}
