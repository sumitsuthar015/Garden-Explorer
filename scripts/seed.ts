/**
 * Seed the garden with a complete, working demo.
 *
 *   npm run db:seed            create anything that is missing (safe to re-run)
 *   npm run db:seed -- --force rewrite the demo content too
 *
 * `--force` deletes and recreates the seeded content blocks, facts, activities,
 * quizzes and trail stops for the demo locations. Without it, existing content is
 * left exactly as it is, so re-running the script can never destroy real writing.
 */
import { and, eq, inArray, ne } from "drizzle-orm";

import { loadEnvFiles } from "../lib/env/load";

loadEnvFiles();

import { db } from "../db";
import {
  activities,
  badges,
  gardens,
  locationContentBlocks,
  locationFacts,
  locations,
  qrCodes,
  quizOptions,
  quizQuestions,
  quizzes,
  siteSettings,
  trailStops,
  trails,
} from "../db/schema";
import {
  BADGES,
  GARDEN,
  LOCATIONS,
  RETIRED_BADGE_CODES,
  RETIRED_LOCATION_SLUGS,
  RETIRED_TRAIL_SLUGS,
  SITE_SETTINGS,
  TRAILS,
} from "./seed-data";

const force = process.argv.includes("--force");

function log(message: string): void {
  console.log(message);
}

async function ensureGarden(): Promise<string> {
  const [existing] = await db.select().from(gardens).where(eq(gardens.slug, GARDEN.slug)).limit(1);

  if (existing) {
    await db
      .update(gardens)
      .set({ name: GARDEN.name, description: GARDEN.description, status: "published", updatedAt: new Date() })
      .where(eq(gardens.id, existing.id));
    return existing.id;
  }

  const [created] = await db
    .insert(gardens)
    .values({
      name: GARDEN.name,
      slug: GARDEN.slug,
      description: GARDEN.description,
      status: "published",
    })
    .returning({ id: gardens.id });

  return created.id;
}

async function ensureSettings(gardenId: string): Promise<void> {
  await db
    .insert(siteSettings)
    .values({ gardenId, ...SITE_SETTINGS })
    .onConflictDoUpdate({ target: siteSettings.gardenId, set: { ...SITE_SETTINGS, updatedAt: new Date() } });
}

interface LocationResult {
  id: string;
  created: boolean;
  contentRewritten: boolean;
}

async function ensureLocation(
  gardenId: string,
  seed: (typeof LOCATIONS)[number],
): Promise<LocationResult> {
  const [existing] = await db
    .select({ id: locations.id, heroImageUrl: locations.heroImageUrl })
    .from(locations)
    .where(eq(locations.slug, seed.slug))
    .limit(1);

  // A real garden photo fills an empty slot; a photo the admin chose stays unless --force.
  const image =
    seed.heroImage && (!existing?.heroImageUrl || force)
      ? { heroImageUrl: seed.heroImage.url, heroImageAlt: seed.heroImage.alt, heroImagePublicId: null }
      : {};

  const values = {
    gardenId,
    name: seed.name,
    slug: seed.slug,
    shortDescription: seed.shortDescription,
    description: seed.description,
    category: seed.category,
    icon: seed.icon,
    estimatedMinutes: seed.estimatedMinutes,
    status: "published" as const,
    featured: seed.featured,
    ...image,
    updatedAt: new Date(),
  };

  let locationId: string;
  let created = false;

  if (existing) {
    locationId = existing.id;

    const [block] = await db
      .select({ id: locationContentBlocks.id })
      .from(locationContentBlocks)
      .where(eq(locationContentBlocks.locationId, locationId))
      .limit(1);

    const hasContent = Boolean(block);

    if (!hasContent || force) {
      await db.update(locations).set(values).where(eq(locations.id, locationId));

      await Promise.all([
        db.delete(locationContentBlocks).where(eq(locationContentBlocks.locationId, locationId)),
        db.delete(locationFacts).where(eq(locationFacts.locationId, locationId)),
        db.delete(activities).where(eq(activities.locationId, locationId)),
        db.delete(quizzes).where(eq(quizzes.locationId, locationId)),
      ]);
    } else {
      if ("heroImageUrl" in image) {
        await db.update(locations).set(image).where(eq(locations.id, locationId));
      }
      return { id: locationId, created: false, contentRewritten: false };
    }
  } else {
    const [row] = await db.insert(locations).values(values).returning({ id: locations.id });
    locationId = row.id;
    created = true;
  }

  await db.insert(locationContentBlocks).values(
    seed.blocks.map((block) => ({
      locationId,
      type: block.type,
      title: block.title,
      body: block.body,
      displayOrder: block.order,
      status: "published" as const,
    })),
  );

  if (seed.facts.length > 0) {
    await db.insert(locationFacts).values(
      seed.facts.map((fact, index) => ({
        locationId,
        label: fact.label,
        value: fact.value,
        displayOrder: index,
      })),
    );
  }

  if (seed.activities.length > 0) {
    await db.insert(activities).values(
      seed.activities.map((activity, index) => ({
        locationId,
        type: activity.type,
        prompt: activity.prompt,
        hint: activity.hint ?? null,
        successMessage: activity.successMessage,
        config: activity.config,
        points: activity.points,
        displayOrder: index,
        status: "published" as const,
      })),
    );
  }

  if (seed.questions.length > 0) {
    const [quiz] = await db
      .insert(quizzes)
      .values({
        locationId,
        title: "Quick Quiz",
        description: `Three short questions about the ${seed.name.toLowerCase()}.`,
        completionPoints: 25,
        displayOrder: 0,
        status: "published",
      })
      .returning({ id: quizzes.id });

    for (const [index, question] of seed.questions.entries()) {
      const [row] = await db
        .insert(quizQuestions)
        .values({
          quizId: quiz.id,
          prompt: question.prompt,
          hint: question.hint,
          explanation: question.explanation,
          points: question.points,
          difficulty: question.difficulty,
          displayOrder: index,
        })
        .returning({ id: quizQuestions.id });

      await db.insert(quizOptions).values(
        question.options.map((text, optionIndex) => ({
          questionId: row.id,
          text,
          isCorrect: optionIndex === question.correctIndex,
          displayOrder: optionIndex,
        })),
      );
    }
  }

  return { id: locationId, created, contentRewritten: true };
}

async function ensureTrail(
  gardenId: string,
  seed: (typeof TRAILS)[number],
  locationIds: Map<string, string>,
): Promise<{ id: string; created: boolean }> {
  const [existing] = await db
    .select({ id: trails.id, coverImageUrl: trails.coverImageUrl })
    .from(trails)
    .where(eq(trails.slug, seed.slug))
    .limit(1);

  const image =
    seed.coverImage && (!existing?.coverImageUrl || force)
      ? { coverImageUrl: seed.coverImage.url, coverImageAlt: seed.coverImage.alt, coverImagePublicId: null }
      : {};

  const values = {
    gardenId,
    name: seed.name,
    slug: seed.slug,
    description: seed.description,
    goals: seed.goals,
    difficulty: seed.difficulty,
    ageGroup: seed.ageGroup,
    estimatedMinutes: seed.estimatedMinutes,
    icon: seed.icon,
    status: "published" as const,
    displayOrder: TRAILS.indexOf(seed),
    ...image,
    updatedAt: new Date(),
  };

  let trailId: string;
  let created = false;

  if (existing) {
    trailId = existing.id;
    await db.update(trails).set(values).where(eq(trails.id, trailId));
    await db.delete(trailStops).where(eq(trailStops.trailId, trailId));
  } else {
    const [row] = await db.insert(trails).values(values).returning({ id: trails.id });
    trailId = row.id;
    created = true;
  }

  const stops = seed.stops
    .map((stop, index) => {
      const locationId = locationIds.get(stop.slug);
      if (!locationId) return null;
      return {
        trailId,
        locationId,
        position: index + 1,
        instructionToNext: stop.instruction,
      };
    })
    .filter((stop): stop is NonNullable<typeof stop> => stop !== null);

  if (stops.length !== seed.stops.length) {
    throw new Error(`Trail "${seed.slug}" references a location that was not seeded.`);
  }

  await db.insert(trailStops).values(stops);

  return { id: trailId, created };
}

/**
 * Upsert one physical sign.
 *
 * `onConflictDoUpdate` keys on the printed code, so re-seeding never changes a
 * code that may already be stuck to a sign in the garden.
 */
async function ensureQrCode(input: {
  locationId: string;
  publicCode: string;
  primaryTrailId: string | null;
  label: string;
}): Promise<void> {
  await db
    .insert(qrCodes)
    .values({
      publicCode: input.publicCode,
      locationId: input.locationId,
      primaryTrailId: input.primaryTrailId,
      label: input.label,
      status: "active",
    })
    .onConflictDoUpdate({
      target: qrCodes.publicCode,
      set: {
        locationId: input.locationId,
        primaryTrailId: input.primaryTrailId,
        label: input.label,
        updatedAt: new Date(),
      },
    });
}

async function ensureBadges(): Promise<void> {
  for (const badge of BADGES) {
    await db
      .insert(badges)
      .values({
        code: badge.code,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        criteriaType: badge.criteriaType,
        config: badge.config,
        displayOrder: badge.displayOrder,
        status: "published",
      })
      .onConflictDoUpdate({
        target: badges.code,
        set: {
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          criteriaType: badge.criteriaType,
          config: badge.config,
          displayOrder: badge.displayOrder,
          status: "published",
          updatedAt: new Date(),
        },
      });
  }
}

/**
 * Archive places, trails and badges from earlier demo seeds that described
 * features this garden is not known to have, and switch off their signs.
 * Archiving (not deleting) keeps history intact and is reversible in the admin.
 */
async function retireOldDemoContent(): Promise<number> {
  let count = 0;

  if (RETIRED_LOCATION_SLUGS.length > 0) {
    const archived = await db
      .update(locations)
      .set({ status: "archived", featured: false, updatedAt: new Date() })
      .where(and(inArray(locations.slug, RETIRED_LOCATION_SLUGS), ne(locations.status, "archived")))
      .returning({ id: locations.id });
    count += archived.length;

    const ids = (
      await db.select({ id: locations.id }).from(locations).where(inArray(locations.slug, RETIRED_LOCATION_SLUGS))
    ).map((row) => row.id);
    if (ids.length > 0) {
      await db
        .update(qrCodes)
        .set({ status: "disabled", updatedAt: new Date() })
        .where(inArray(qrCodes.locationId, ids));
    }
  }

  if (RETIRED_TRAIL_SLUGS.length > 0) {
    const archived = await db
      .update(trails)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(inArray(trails.slug, RETIRED_TRAIL_SLUGS), ne(trails.status, "archived")))
      .returning({ id: trails.id });
    count += archived.length;
  }

  if (RETIRED_BADGE_CODES.length > 0) {
    const archived = await db
      .update(badges)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(inArray(badges.code, RETIRED_BADGE_CODES), ne(badges.status, "archived")))
      .returning({ id: badges.id });
    count += archived.length;
  }

  return count;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("\n✗ DATABASE_URL is not set. Add it to .env.local first.\n");
    process.exit(1);
  }

  log(`\nSeeding ${GARDEN.name}${force ? " (force: demo content will be rewritten)" : ""}\n`);

  const gardenId = await ensureGarden();
  await ensureSettings(gardenId);
  log("✓ Garden and site settings");

  const locationIds = new Map<string, string>();
  let created = 0;
  let rewritten = 0;

  for (const seed of LOCATIONS) {
    const result = await ensureLocation(gardenId, seed);
    locationIds.set(seed.slug, result.id);
    if (result.created) created += 1;
    if (result.contentRewritten) rewritten += 1;
  }

  log(`✓ ${LOCATIONS.length} garden places (${created} new, ${rewritten} with fresh content)`);

  const trailIds = new Map<string, string>();

  for (const seed of TRAILS) {
    const result = await ensureTrail(gardenId, seed, locationIds);
    trailIds.set(seed.slug, result.id);
  }

  log(`✓ ${TRAILS.length} trails with ordered stops and walking directions`);

  // Each sign's default context is the first trail that visits its place, so
  // a scan immediately shows "stop 3 of 6". The same sign still works for
  // every other trail that contains the place.
  const scienceTrailId = trailIds.get(TRAILS[0].slug) ?? null;

  for (const seed of LOCATIONS) {
    const locationId = locationIds.get(seed.slug);
    if (!locationId) continue;
    const firstTrail = TRAILS.find((trail) => trail.stops.some((stop) => stop.slug === seed.slug));
    await ensureQrCode({
      locationId,
      publicCode: seed.qrCode,
      primaryTrailId: firstTrail ? (trailIds.get(firstTrail.slug) ?? null) : null,
      label: seed.name,
    });
  }

  log(`✓ ${LOCATIONS.length} QR codes (${LOCATIONS.map((location) => location.qrCode).join(", ")})`);

  await ensureBadges();
  log(`✓ ${BADGES.length} badges`);

  const retired = await retireOldDemoContent();
  if (retired > 0) log(`✓ Retired ${retired} early demo item(s) that do not exist in this garden`);

  // A default trail is suggested to visitors who scan a sign with no primary trail.
  if (scienceTrailId) {
    await db
      .update(siteSettings)
      .set({ defaultTrailId: scienceTrailId, updatedAt: new Date() })
      .where(eq(siteSettings.gardenId, gardenId));
  }

  const total = await db
    .select({ id: locations.id })
    .from(locations)
    .where(inArray(locations.slug, LOCATIONS.map((location) => location.slug)));

  log(`
✓ Seed complete — ${total.length} places are live

  Public site   /
  Explore       /explore
  Trails        /trails
  Test a scan   /q/BUTTERFLY-003
  Progress      /progress

  Admin         /admin/login
  Create one:   npm run admin:create

Tip: print the signs from /admin/qr/sheet and paste them onto the real
garden signs. Editing a place never changes its printed code.
`);
  process.exit(0);
}

void main().catch((error: unknown) => {
  console.error(
    `\n✗ Seeding failed: ${error instanceof Error ? error.message : "unknown error"}\n`,
  );
  process.exit(1);
});
