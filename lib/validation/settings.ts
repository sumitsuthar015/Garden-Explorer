import { z } from "zod";

import { hexColorSchema, optionalUuidSchema, optionalTextSchema, urlOrEmptySchema } from "./common";

export const settingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Garden name must be at least 2 characters")
    .max(120, "Garden name must be 120 characters or fewer"),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or fewer")
    .default(""),
  siteTitle: z
    .string()
    .trim()
    .min(2, "Site title must be at least 2 characters")
    .max(120, "Site title must be 120 characters or fewer"),
  seoDescription: z
    .string()
    .trim()
    .min(10, "SEO description must be at least 10 characters")
    .max(300, "SEO description must be 300 characters or fewer"),
  primaryColor: hexColorSchema,
  logoUrl: urlOrEmptySchema.optional(),
  logoPublicId: optionalTextSchema(300),
  faviconUrl: urlOrEmptySchema.optional(),
  faviconPublicId: optionalTextSchema(300),
  contactEmail: z
    .string()
    .trim()
    .max(200)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || z.email().safeParse(value).success, "Enter a valid email"),
  contactPhone: optionalTextSchema(40),
  contactAddress: optionalTextSchema(300),
  defaultTrailId: optionalUuidSchema,
  analyticsEnabled: z.coerce.boolean().default(true),
  privacyNotes: z
    .string()
    .trim()
    .max(4000, "Privacy notes must be 4000 characters or fewer")
    .optional()
    .transform((value) => (value ? value : null)),
});

export type SettingsInput = z.infer<typeof settingsSchema>;

/** Admin sign-in. Only used as a client-side shape check; Better Auth owns auth. */
export const loginSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password").max(200),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password").max(200),
    newPassword: z
      .string()
      .min(12, "Use at least 12 characters")
      .max(200, "Password must be 200 characters or fewer")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
