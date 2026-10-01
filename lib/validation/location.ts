import { z } from "zod";

import { CONTENT_BLOCK_TYPES, LOCATION_CATEGORIES } from "@/lib/constants";
import {
  bodySchema,
  descriptionSchema,
  displayOrderSchema,
  nameSchema,
  optionalTextSchema,
  publishStatusSchema,
  shortDescriptionSchema,
  slugSchema,
  urlOrEmptySchema,
  uuidSchema,
} from "./common";

export const createLocationSchema = z.object({
  gardenId: uuidSchema.optional(),
  name: nameSchema,
  slug: slugSchema,
  shortDescription: shortDescriptionSchema,
  description: descriptionSchema,
  category: z.enum(LOCATION_CATEGORIES),
  heroImageUrl: urlOrEmptySchema.optional(),
  heroImagePublicId: optionalTextSchema(300),
  heroImageAlt: optionalTextSchema(240),
  icon: optionalTextSchema(8),
  estimatedMinutes: z.coerce.number().int().min(1).max(240).catch(5),
  status: publishStatusSchema.default("draft"),
  featured: z.coerce.boolean().catch(false),
  displayOrder: displayOrderSchema,
});

export const updateLocationSchema = createLocationSchema.partial().extend({
  id: uuidSchema,
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

export const locationFactSchema = z.object({
  id: uuidSchema.optional(),
  locationId: uuidSchema,
  label: z.string().trim().min(1, "Label is required").max(80, "Label is too long"),
  value: z.string().trim().min(1, "Value is required").max(240, "Value is too long"),
  displayOrder: displayOrderSchema,
});

export const contentBlockSchema = z.object({
  id: uuidSchema.optional(),
  locationId: uuidSchema,
  type: z.enum(CONTENT_BLOCK_TYPES),
  title: optionalTextSchema(160),
  body: bodySchema,
  mediaUrl: urlOrEmptySchema.optional(),
  mediaPublicId: optionalTextSchema(300),
  mediaAlt: optionalTextSchema(240),
  mediaCaption: optionalTextSchema(240),
  displayOrder: displayOrderSchema,
  status: publishStatusSchema.default("published"),
});

export type ContentBlockInput = z.infer<typeof contentBlockSchema>;

/** Media-backed blocks need a URL; everything else needs some body text. */
export function refineContentBlock(
  value: {
    type: (typeof CONTENT_BLOCK_TYPES)[number];
    body: string;
    mediaUrl?: string | null;
    mediaAlt?: string | null;
    title?: string | null;
  },
  ctx: z.RefinementCtx,
): void {
  const needsMedia = value.type === "image" || value.type === "video" || value.type === "audio";
  if (needsMedia) {
    if (!value.mediaUrl) {
      ctx.addIssue({
        code: "custom",
        path: ["mediaUrl"],
        message: "Upload a file for this content type",
      });
    }
    if (!value.mediaAlt) {
      ctx.addIssue({
        code: "custom",
        path: ["mediaAlt"],
        message: "Alt text is required so screen readers can describe this media",
      });
    }
    return;
  }

  if (!value.title && value.body.trim().length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["body"],
      message: "Add a title or some content",
    });
  }
}

export const contentBlockSchemaWithRefinement = contentBlockSchema.superRefine(refineContentBlock);

/** Reorder payload: a full ordered list of ids for one location. */
export const reorderSchema = z.object({
  parentId: uuidSchema,
  orderedIds: z.array(uuidSchema).min(1, "Nothing to reorder"),
});
