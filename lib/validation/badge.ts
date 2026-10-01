import { z } from "zod";

import { LOCATION_CATEGORIES } from "@/lib/constants";
import { displayOrderSchema, publishStatusSchema, uuidSchema } from "./common";

export const badgeCriteriaTypes = [
  "locations_completed",
  "trail_completed",
  "trails_completed",
  "quiz_first_try",
  "activities_completed",
  "xp_earned",
  "category_completed",
  "location_completed",
  "quiz_accuracy",
] as const;

export const badgeRuleConfigSchema = z.object({
  count: z.coerce.number().int().min(1).max(9999).optional(),
  trailSlug: z.string().trim().max(80).optional(),
  category: z.enum(LOCATION_CATEGORIES).optional(),
  locationSlug: z.string().trim().max(80).optional(),
  accuracyPercent: z.coerce.number().int().min(1).max(100).optional(),
  minQuestions: z.coerce.number().int().min(1).max(500).optional(),
});

export const badgeSchema = z
  .object({
    id: uuidSchema.optional(),
    code: z
      .string()
      .trim()
      .toLowerCase()
      .min(2, "Code must be at least 2 characters")
      .max(60, "Code must be 60 characters or fewer")
      .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, "Use lowercase letters, numbers and underscores"),
    name: z
      .string()
      .trim()
      .min(2, "Badge name must be at least 2 characters")
      .max(80, "Badge name must be 80 characters or fewer"),
    description: z
      .string()
      .trim()
      .min(5, "Describe what earns this badge")
      .max(400, "Description must be 400 characters or fewer"),
    icon: z.string().trim().min(1, "Choose an icon").max(8, "Use a single emoji"),
    criteriaType: z.enum(badgeCriteriaTypes),
    config: badgeRuleConfigSchema.default({}),
    displayOrder: displayOrderSchema,
    status: publishStatusSchema.default("published"),
  })
  .superRefine((value, ctx) => {
    const config = value.config ?? {};

    switch (value.criteriaType) {
      case "locations_completed":
      case "trails_completed":
      case "quiz_first_try":
      case "activities_completed":
      case "xp_earned":
        if (!config.count || config.count < 1) {
          ctx.addIssue({
            code: "custom",
            path: ["config", "count"],
            message: "Set how many are needed",
          });
        }
        break;
      case "trail_completed":
        if (!config.trailSlug) {
          ctx.addIssue({
            code: "custom",
            path: ["config", "trailSlug"],
            message: "Choose the trail",
          });
        }
        break;
      case "location_completed":
        if (!config.locationSlug) {
          ctx.addIssue({
            code: "custom",
            path: ["config", "locationSlug"],
            message: "Choose the location",
          });
        }
        break;
      case "category_completed":
        if (!config.category) {
          ctx.addIssue({
            code: "custom",
            path: ["config", "category"],
            message: "Choose the category",
          });
        }
        if (!config.count || config.count < 1) {
          ctx.addIssue({
            code: "custom",
            path: ["config", "count"],
            message: "Set how many places in this category",
          });
        }
        break;
      case "quiz_accuracy":
        if (!config.accuracyPercent || config.accuracyPercent < 1) {
          ctx.addIssue({
            code: "custom",
            path: ["config", "accuracyPercent"],
            message: "Set a target accuracy percentage",
          });
        }
        if (!config.minQuestions || config.minQuestions < 1) {
          ctx.addIssue({
            code: "custom",
            path: ["config", "minQuestions"],
            message: "Set the minimum number of answered questions",
          });
        }
        break;
    }
  });

export type BadgeInput = z.infer<typeof badgeSchema>;
