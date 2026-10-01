import { z } from "zod";

import { MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE, QR_CODE_PATTERN } from "@/lib/constants";

/**
 * Shared Zod primitives. Every schema in `lib/validation/` builds on these so
 * limits and messages stay consistent between client and server.
 */

export const uuidSchema = z.uuid("Must be a valid id");

export const optionalUuidSchema = z
  .string()
  .transform((value) => (value.trim() === "" ? null : value.trim()))
  .nullable()
  .refine((value) => value === null || z.uuid().safeParse(value).success, "Must be a valid id")
  .optional();

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters")
  .max(120, "Name must be 120 characters or fewer");

export const shortDescriptionSchema = z
  .string()
  .trim()
  .max(240, "Short description must be 240 characters or fewer")
  .default("");

export const descriptionSchema = z
  .string()
  .trim()
  .max(6000, "Description must be 6000 characters or fewer")
  .default("");

export const bodySchema = z
  .string()
  .trim()
  .max(6000, "Content must be 6000 characters or fewer")
  .default("");

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "Slug must be at least 2 characters")
  .max(80, "Slug must be 80 characters or fewer")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single dashes only");

export const publicCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(2, "Code must be at least 2 characters")
  .max(64, "Code must be 64 characters or fewer")
  .regex(
    QR_CODE_PATTERN,
    "Use uppercase letters, numbers and dashes (for example BUTTERFLY-003)",
  );

export const hexColorSchema = z
  .string()
  .trim()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Use a hex colour such as #2F6B4F");

/** The site's own photos (public/images/…), e.g. the built-in garden photos. */
const SITE_IMAGE_PATH = /^\/images\/[\w\-./]+$/;

function isSiteImagePath(value: string): boolean {
  return SITE_IMAGE_PATH.test(value) && !value.includes("..");
}

export const urlOrEmptySchema = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => value === "" || isSiteImagePath(value) || z.url().safeParse(value).success,
    "Must be a valid URL",
  )
  .transform((value) => (value === "" ? null : value));

export const mediaRefSchema = z
  .object({
    mediaUrl: urlOrEmptySchema.optional().nullable(),
    mediaPublicId: z.string().trim().max(300).optional().nullable(),
    mediaAlt: z.string().trim().max(240).optional().nullable(),
  })
  .partial();

export const displayOrderSchema = z.coerce
  .number()
  .int("Order must be a whole number")
  .min(0, "Order cannot be negative")
  .max(9999, "Order is too large")
  .default(0);

export const pointsSchema = z.coerce
  .number()
  .int("Points must be a whole number")
  .min(0, "Points cannot be negative")
  .max(1000, "Points must be 1000 or fewer");

/**
 * Optional free text. Empty strings normalise to `null` so a form can clear a
 * previously saved value, while an omitted key stays `undefined` (which Drizzle
 * treats as "do not touch this column").
 */
export const optionalTextSchema = (max = 600) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? null : value),
    z
      .string()
      .trim()
      .max(max, `Must be ${max} characters or fewer`)
      .nullable()
      .optional(),
  );

export const publishStatusSchema = z.enum(["draft", "published", "archived"]);

/** Query-string pagination shared by every admin table. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).catch(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).catch(DEFAULT_PAGE_SIZE),
  search: z.string().trim().max(120).catch("").default(""),
  sort: z.string().trim().max(40).catch("").default(""),
  direction: z.enum(["asc", "desc"]).catch("desc").default("desc"),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

/** Turn a ZodError into `{ field: [messages] }` for form display. */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const flattened: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.map(String).join(".") : "form";
    flattened[key] ??= [];
    flattened[key].push(issue.message);
  }
  return flattened;
}
