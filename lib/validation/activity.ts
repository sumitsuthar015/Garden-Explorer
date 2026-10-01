import { z } from "zod";

import { ACTIVITY_TYPES } from "@/lib/constants";
import {
  displayOrderSchema,
  optionalTextSchema,
  pointsSchema,
  publishStatusSchema,
  uuidSchema,
} from "./common";

/**
 * Activity config varies by type. The same refinement runs on the client
 * (React Hook Form resolver) and on the server, so nothing can be saved in an
 * unsolvable state.
 */
export const activityConfigSchema = z.object({
  confirmLabel: optionalTextSchema(60),
  answer: z.coerce.boolean().optional(),
  options: z.array(z.string().trim().min(1, "Option cannot be empty").max(120)).max(8).optional(),
  correctIndex: z.coerce.number().int().min(0).max(7).optional(),
  correctIndexes: z.array(z.coerce.number().int().min(0).max(7)).max(8).optional(),
  sampleAnswer: optionalTextSchema(400),
  minLength: z.coerce.number().int().min(0).max(400).optional(),
});

export const activitySchema = z
  .object({
    id: uuidSchema.optional(),
    locationId: uuidSchema,
    type: z.enum(ACTIVITY_TYPES),
    prompt: z
      .string()
      .trim()
      .min(5, "Prompt must be at least 5 characters")
      .max(600, "Prompt must be 600 characters or fewer"),
    hint: optionalTextSchema(400),
    successMessage: z
      .string()
      .trim()
      .min(1, "Success message is required")
      .max(240, "Success message must be 240 characters or fewer")
      .default("Nice work!"),
    config: activityConfigSchema.default({}),
    points: pointsSchema.default(10),
    displayOrder: displayOrderSchema,
    status: publishStatusSchema.default("published"),
  })
  .superRefine((value, ctx) => {
    const config = value.config ?? {};

    if (value.type === "multiple_choice" || value.type === "selection") {
      const options = (config.options ?? []).map((option) => option.trim());
      const nonEmpty = options.filter(Boolean);

      if (nonEmpty.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "options"],
          message: "Add at least two options",
        });
        return;
      }

      if (new Set(nonEmpty).size !== nonEmpty.length) {
        ctx.addIssue({
          code: "custom",
          path: ["config", "options"],
          message: "Options must be unique",
        });
      }

      if (value.type === "multiple_choice") {
        const index = config.correctIndex;
        if (index === undefined || index === null) {
          ctx.addIssue({
            code: "custom",
            path: ["config", "correctIndex"],
            message: "Choose the correct option",
          });
        } else if (index >= nonEmpty.length) {
          ctx.addIssue({
            code: "custom",
            path: ["config", "correctIndex"],
            message: "Correct option is out of range",
          });
        }
      }

      if (value.type === "selection") {
        const indexes = config.correctIndexes ?? [];
        if (!indexes.length) {
          ctx.addIssue({
            code: "custom",
            path: ["config", "correctIndexes"],
            message: "Choose at least one correct option",
          });
        } else if (indexes.some((indexItem) => indexItem >= nonEmpty.length)) {
          ctx.addIssue({
            code: "custom",
            path: ["config", "correctIndexes"],
            message: "One of the correct options is out of range",
          });
        }
      }
    }

    if (value.type === "yes_no" && typeof config.answer !== "boolean") {
      ctx.addIssue({
        code: "custom",
        path: ["config", "answer"],
        message: "Choose whether the expected answer is Yes or No",
      });
    }
  });

export type ActivityInput = z.infer<typeof activitySchema>;

/** A visitor's answer to an activity. */
export const activitySubmissionSchema = z.object({
  activityId: uuidSchema,
  response: z.string().trim().max(400).optional(),
  selectedIndexes: z.array(z.coerce.number().int().min(0).max(7)).max(8).optional(),
  yesNo: z.boolean().optional(),
  visitorId: z.string().trim().max(64).optional(),
  trailId: uuidSchema.optional(),
});

export type ActivitySubmission = z.infer<typeof activitySubmissionSchema>;
