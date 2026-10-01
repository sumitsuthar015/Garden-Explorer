import { z } from "zod";

import { QR_STATUSES } from "@/lib/constants";
import { optionalTextSchema, publicCodeSchema, uuidSchema } from "./common";

export const qrCodeSchema = z.object({
  id: uuidSchema.optional(),
  publicCode: publicCodeSchema,
  locationId: uuidSchema,
  primaryTrailId: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || z.uuid().safeParse(value).success, "Select a valid trail"),
  status: z.enum(QR_STATUSES).default("active"),
  label: optionalTextSchema(120),
});

export type QrCodeInput = z.infer<typeof qrCodeSchema>;

export const updateQrCodeSchema = qrCodeSchema.partial().extend({ id: uuidSchema });

export const qrStatusUpdateSchema = z.object({
  id: uuidSchema,
  status: z.enum(QR_STATUSES),
});

/**
 * Public code lookup. The pattern is validated *before* any database access so
 * a hostile path segment like `../../../etc` can never reach a query.
 */
export const qrLookupSchema = z.object({
  code: publicCodeSchema,
});

export const regenerateQrCodeSchema = z.object({
  id: uuidSchema,
  /** Human-readable prefix, e.g. "BUTTERFLY" -> BUTTERFLY-4F2A. */
  prefix: z
    .string()
    .trim()
    .toUpperCase()
    .max(24)
    .regex(/^[A-Z0-9-]*$/, "Use uppercase letters and numbers only")
    .default(""),
});
