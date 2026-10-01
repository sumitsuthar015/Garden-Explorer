import { z } from "zod";

import { AGE_GROUPS, TRAIL_DIFFICULTIES } from "@/lib/constants";
import {
  displayOrderSchema,
  optionalTextSchema,
  publishStatusSchema,
  slugSchema,
  urlOrEmptySchema,
  uuidSchema,
} from "./common";

export const trailSchema = z.object({
  id: uuidSchema.optional(),
  gardenId: uuidSchema.optional(),
  name: z
    .string()
    .trim()
    .min(3, "Trail name must be at least 3 characters")
    .max(120, "Trail name must be 120 characters or fewer"),
  slug: slugSchema,
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or fewer")
    .default(""),
  goals: z.string().trim().max(1200, "Goals must be 1200 characters or fewer").default(""),
  difficulty: z.enum(TRAIL_DIFFICULTIES).default("easy"),
  ageGroup: z.enum(AGE_GROUPS).default("all-ages"),
  estimatedMinutes: z.coerce.number().int().min(5).max(600).catch(45),
  coverImageUrl: urlOrEmptySchema.optional(),
  coverImagePublicId: optionalTextSchema(300),
  coverImageAlt: optionalTextSchema(240),
  themeColor: optionalTextSchema(9),
  icon: optionalTextSchema(8),
  status: publishStatusSchema.default("draft"),
  displayOrder: displayOrderSchema,
});

export type TrailInput = z.infer<typeof trailSchema>;

export const trailStopSchema = z.object({
  id: uuidSchema.optional(),
  trailId: uuidSchema.optional(),
  locationId: uuidSchema,
  instructionToNext: z
    .string()
    .trim()
    .max(600, "Instructions must be 600 characters or fewer")
    .default(""),
  estimatedMinutes: z.coerce.number().int().min(0).max(240).optional(),
});

export type TrailStopInput = z.infer<typeof trailStopSchema>;

/** Full ordered stop list submitted by the drag-and-drop trail builder. */
export const trailStopsOrderSchema = z.object({
  trailId: uuidSchema,
  stops: z
    .array(
      z.object({
        /** Null for a stop that has not been persisted yet. */
        id: uuidSchema.nullable().optional(),
        locationId: uuidSchema,
        instructionToNext: z.string().trim().max(600).default(""),
      }),
    )
    .max(60, "A trail can contain at most 60 stops"),
});

export type TrailStopsOrderInput = z.infer<typeof trailStopsOrderSchema>;

/**
 * Publish guard for trails. `publishedLocationIds` is read from the database so
 * a trail can never go live pointing at a location visitors cannot open.
 */
export function validateTrailForPublishing(
  trail: { name: string; slug: string },
  stops: { position: number; locationId: string; instructionToNext: string }[],
  publishedLocationIds: Set<string>,
): string[] {
  const problems: string[] = [];

  if (!trail.name.trim()) problems.push("Give the trail a name before publishing.");
  if (!trail.slug.trim()) problems.push("Set a public URL slug before publishing.");

  if (stops.length === 0) {
    problems.push("Add at least one stop before publishing.");
    return problems;
  }

  const ordered = [...stops].sort((a, b) => a.position - b.position);
  const expected = ordered.map((_, index) => index + 1);
  if (ordered.some((stop, index) => stop.position !== expected[index])) {
    problems.push("Stop positions are out of sequence — save the stop order again.");
  }

  const duplicates = new Set<string>();
  for (const stop of ordered) {
    if (duplicates.has(stop.locationId)) {
      problems.push("The same location appears twice in this trail.");
      break;
    }
    duplicates.add(stop.locationId);
  }

  const unpublished = ordered.filter((stop) => !publishedLocationIds.has(stop.locationId));
  if (unpublished.length > 0) {
    problems.push(
      `${unpublished.length} stop${unpublished.length === 1 ? " is" : "s are"} linked to an unpublished location. Publish those locations first, or remove them from the trail.`,
    );
  }

  const missingInstructions = ordered
    .slice(0, -1)
    .filter((stop) => stop.instructionToNext.trim().length < 10);
  if (missingInstructions.length > 0) {
    problems.push(
      `Stop ${missingInstructions[0].position} has no written directions to the next place. Visitors have no map, so these instructions are essential.`,
    );
  }

  return problems;
}
