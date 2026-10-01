/**
 * Central product constants. Values here are imported by both public and
 * admin code so that enum lists can never drift apart.
 */

export const APP_NAME = "Garden Explorer";

const GARDEN_MAPS_QUERY =
  "Dr Babasaheb Ambedkar Garden, Government Colony, Bandra East, Mumbai, Maharashtra 400051";

/**
 * The real garden this deployment serves. Powers the "Visit" section, the
 * footer address and the fallback branding shown before an admin saves settings.
 *
 * Every fact here comes from public listings (Google Maps, Mappls, Yappe),
 * checked in September 2026. Timings can change — the site says so.
 *
 * These links only help visitors *reach* the garden. Inside it, navigation is
 * still written directions, and the site never asks for a visitor's location.
 */
export const GARDEN_LOCATION = {
  name: "Dr Babasaheb Ambedkar Garden",
  /** Name as registered on Mappls. */
  officialName: "Bharatratna Dr Babasaheb Ambedkar Udyan",
  area: "Government Colony, Bandra East",
  city: "Mumbai, Maharashtra 400051",
  address: "Government Colony, Bandra East, Mumbai, Maharashtra 400051",
  plusCode: "3R6X+5PV Mumbai",
  openingHours: "Every day, 4:00 AM – 8:00 PM",
  landmark: "Near Ambedkar Chowk, about 500 m from Bandra Terminus",
  /** What visitors' reviews and photos taken in the garden show inside it. */
  features: [
    "Carved Sanchi-style gateway",
    "Statue of Dr Ambedkar",
    "Paved walkways",
    "Palm grove & signature wall",
    "Children's play area & jungle gym",
  ],
  namesake:
    "Named after Bharat Ratna Dr Bhimrao Ramji Ambedkar (1891–1956), who led the drafting of the Constitution of India.",
  sources: "Google Maps, Mappls, visitor reviews and photos taken in the garden",
  /** The garden's own Google Maps share link. */
  mapsUrl: "https://maps.app.goo.gl/uzFjkKGQWcjuegfw9",
  directionsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(GARDEN_MAPS_QUERY)}`,
  /** Keyless Google Maps embed. Loaded only after the visitor asks for it. */
  embedUrl: `https://www.google.com/maps/embed?origin=mfe&pb=!1m3!2m1!1s${GARDEN_MAPS_QUERY.replace(/ /g, "+")}!6i16`,
} as const;

export const LOCATION_CATEGORIES = [
  "plants",
  "animals",
  "science",
  "environment",
  "garden-knowledge",
  "logic",
  "observation",
  "coding",
] as const;
export type LocationCategory = (typeof LOCATION_CATEGORIES)[number];

export const LOCATION_CATEGORY_LABELS: Record<LocationCategory, string> = {
  plants: "Plants",
  animals: "Animals",
  science: "Science",
  environment: "Environment",
  "garden-knowledge": "Garden Knowledge",
  logic: "Logic",
  observation: "Observation",
  coding: "Coding",
};

/** Emoji-ish glyphs rendered as plain text so no icon font is required. */
export const LOCATION_CATEGORY_ICONS: Record<LocationCategory, string> = {
  plants: "🌿",
  animals: "🦋",
  science: "🔬",
  environment: "🌍",
  "garden-knowledge": "🧭",
  logic: "🧩",
  observation: "👀",
  coding: "💻",
};

export const PUBLISH_STATUSES = ["draft", "published", "archived"] as const;
export type PublishStatus = (typeof PUBLISH_STATUSES)[number];

export const PUBLISH_STATUS_LABELS: Record<PublishStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

/** QR codes additionally support a soft "disabled" state that keeps history. */
export const QR_STATUSES = ["active", "disabled"] as const;
export type QrStatus = (typeof QR_STATUSES)[number];

export const CONTENT_BLOCK_TYPES = [
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
] as const;
export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

export const CONTENT_BLOCK_LABELS: Record<ContentBlockType, string> = {
  text: "Text",
  image: "Image",
  fact: "Fact",
  did_you_know: "Did You Know?",
  science: "Science Discovery",
  observation: "Observe",
  thinking: "Think",
  activity: "Try It",
  quiz: "Quick Quiz",
  callout: "Callout",
  video: "Video",
  audio: "Audio",
};

export const ACTIVITY_TYPES = [
  "observation",
  "yes_no",
  "multiple_choice",
  "selection",
  "thinking",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  observation: "Observation",
  yes_no: "Yes / No",
  multiple_choice: "Multiple Choice",
  selection: "Simple Selection",
  thinking: "Thinking Question",
};

export const TRAIL_DIFFICULTIES = ["easy", "moderate", "challenging"] as const;
export type TrailDifficulty = (typeof TRAIL_DIFFICULTIES)[number];

export const TRAIL_DIFFICULTY_LABELS: Record<TrailDifficulty, string> = {
  easy: "Easy",
  moderate: "Moderate",
  challenging: "Challenging",
};

export const AGE_GROUPS = [
  "all-ages",
  "ages-5-8",
  "ages-9-12",
  "ages-13-plus",
] as const;
export type AgeGroup = (typeof AGE_GROUPS)[number];

export const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  "all-ages": "All ages",
  "ages-5-8": "Ages 5–8",
  "ages-9-12": "Ages 9–12",
  "ages-13-plus": "Ages 13+",
};

export const QUESTION_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

export const QUESTION_DIFFICULTY_LABELS: Record<QuestionDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/** Analytics event names. Keep in sync with `db/schema/analytics.ts`. */
export const ANALYTICS_EVENTS = [
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
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

export const AUDIT_ACTIONS = [
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
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Configurable learning-points defaults (admin can override per quiz question). */
export const DEFAULT_QUESTION_POINTS = 20;
export const DEFAULT_ACTIVITY_POINTS = 10;
export const DEFAULT_LOCATION_COMPLETION_XP = 25;

export const XP_AWARDS = {
  firstTry: 1,
  afterHint: 0.75,
  afterRetry: 0.5,
  revealed: 0.25,
} as const;

export const MAX_ANSWER_ATTEMPTS = 3;

/** localStorage namespace for the anonymous visitor profile. */
export const PROGRESS_STORAGE_KEY = "garden-explorer:progress:v1";

/** Number of scan events preserved per anonymous visitor session row. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // 8 MB
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** Shape rule for public QR codes: uppercase letters, digits and dashes. */
export const QR_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,63}$/;
