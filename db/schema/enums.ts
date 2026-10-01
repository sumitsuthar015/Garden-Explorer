import { pgEnum } from "drizzle-orm/pg-core";

/**
 * Postgres enums for the stable Garden Explorer vocabularies.
 * Values must stay in sync with `lib/constants.ts` — that file is the single
 * source of truth for the TypeScript unions used by validation and UI.
 */

export const locationCategoryEnum = pgEnum("location_category", [
  "plants",
  "animals",
  "science",
  "environment",
  "garden-knowledge",
  "logic",
  "observation",
  "coding",
]);

export const publishStatusEnum = pgEnum("publish_status", ["draft", "published", "archived"]);

export const qrStatusEnum = pgEnum("qr_status", ["active", "disabled"]);

export const contentBlockTypeEnum = pgEnum("content_block_type", [
  "text",
  "image",
  "fact",
  "did_you_know",
  "science",
  "observation",
  "thinking",
  "activity",
  "quiz",
  "callout",
  "video",
  "audio",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "observation",
  "yes_no",
  "multiple_choice",
  "selection",
  "thinking",
]);

export const trailDifficultyEnum = pgEnum("trail_difficulty", ["easy", "moderate", "challenging"]);

export const ageGroupEnum = pgEnum("age_group", ["all-ages", "ages-5-8", "ages-9-12", "ages-13-plus"]);

export const questionDifficultyEnum = pgEnum("question_difficulty", ["easy", "medium", "hard"]);

export const badgeCriteriaEnum = pgEnum("badge_criteria", [
  "locations_completed",
  "trail_completed",
  "trails_completed",
  "quiz_first_try",
  "activities_completed",
  "xp_earned",
  "category_completed",
  "location_completed",
  "quiz_accuracy",
]);

export const analyticsEventEnum = pgEnum("analytics_event", [
  "QR_SCANNED",
  "LOCATION_VIEWED",
  "ACTIVITY_STARTED",
  "ACTIVITY_COMPLETED",
  "QUIZ_STARTED",
  "QUESTION_ANSWERED",
  "QUIZ_COMPLETED",
  "TRAIL_STARTED",
  "TRAIL_COMPLETED",
  "BADGE_EARNED",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "LOCATION_CREATED",
  "LOCATION_UPDATED",
  "LOCATION_PUBLISHED",
  "LOCATION_UNPUBLISHED",
  "LOCATION_ARCHIVED",
  "LOCATION_DELETED",
  "CONTENT_BLOCK_CREATED",
  "CONTENT_BLOCK_UPDATED",
  "CONTENT_BLOCK_DELETED",
  "ACTIVITY_CREATED",
  "ACTIVITY_UPDATED",
  "ACTIVITY_DELETED",
  "QUIZ_CREATED",
  "QUIZ_UPDATED",
  "QUIZ_PUBLISHED",
  "QUIZ_UNPUBLISHED",
  "QUIZ_DELETED",
  "QUESTION_CREATED",
  "QUESTION_UPDATED",
  "QUESTION_DELETED",
  "QR_CREATED",
  "QR_UPDATED",
  "QR_DISABLED",
  "QR_ENABLED",
  "QR_REGENERATED",
  "QR_DELETED",
  "TRAIL_CREATED",
  "TRAIL_UPDATED",
  "TRAIL_REORDERED",
  "TRAIL_PUBLISHED",
  "TRAIL_UNPUBLISHED",
  "TRAIL_DELETED",
  "BADGE_CREATED",
  "BADGE_UPDATED",
  "BADGE_DELETED",
  "MEDIA_UPLOADED",
  "MEDIA_DELETED",
  "SETTINGS_UPDATED",
  "ADMIN_PASSWORD_CHANGED",
  "ADMIN_CREATED",
]);

export const adminRoleEnum = pgEnum("admin_role", ["admin", "editor"]);
