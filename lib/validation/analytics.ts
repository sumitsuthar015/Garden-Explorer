import { z } from "zod";

import { ANALYTICS_EVENTS } from "@/lib/constants";
import { uuidSchema } from "./common";

export const analyticsEventSchema = z.object({
  name: z.enum(ANALYTICS_EVENTS),
  visitorId: z.string().trim().max(64).optional(),
  locationId: uuidSchema.optional(),
  trailId: uuidSchema.optional(),
  quizId: uuidSchema.optional(),
  badgeCode: z.string().trim().max(60).optional(),
  value: z.coerce.number().int().min(-100000).max(100000).optional(),
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

export const analyticsFilterSchema = z.object({
  range: z.enum(["7d", "30d", "90d", "all"]).catch("30d").default("30d"),
  locationId: z.string().trim().max(64).catch("").default(""),
  trailId: z.string().trim().max(64).catch("").default(""),
  event: z.enum(["", ...ANALYTICS_EVENTS]).catch("").default(""),
});

export type AnalyticsFilterInput = z.infer<typeof analyticsFilterSchema>;

/** Number of days back a range covers; `null` means "all time". */
export function rangeToDays(range: AnalyticsFilterInput["range"]): number | null {
  switch (range) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    default:
      return null;
  }
}
