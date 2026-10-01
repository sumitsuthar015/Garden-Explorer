import { relations } from "drizzle-orm";

import { account, session, user } from "./auth";
import { activities } from "./activities";
import { activityEvents, analyticsEvents, quizAttemptEvents, scanEvents } from "./analytics";
import { adminAuditLogs } from "./audit";
import { badges } from "./badges";
import { gardens } from "./gardens";
import { locationContentBlocks, locationFacts, locations } from "./locations";
import { mediaAssets } from "./media";
import { qrCodes } from "./qr";
import { quizOptions, quizQuestions, quizzes } from "./quizzes";
import { siteSettings } from "./site-settings";
import { trailStops, trails } from "./trails";

/**
 * All Drizzle relations live here so schema modules stay free of circular
 * imports. These power `db.query.*` relational lookups.
 */

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  auditLogs: many(adminAuditLogs),
  mediaUploads: many(mediaAssets),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, { fields: [account.userId], references: [user.id] }),
}));

export const gardensRelations = relations(gardens, ({ many, one }) => ({
  locations: many(locations),
  trails: many(trails),
  settings: one(siteSettings, {
    fields: [gardens.id],
    references: [siteSettings.gardenId],
  }),
}));

export const siteSettingsRelations = relations(siteSettings, ({ one }) => ({
  garden: one(gardens, { fields: [siteSettings.gardenId], references: [gardens.id] }),
  defaultTrail: one(trails, {
    fields: [siteSettings.defaultTrailId],
    references: [trails.id],
  }),
  updatedByUser: one(user, { fields: [siteSettings.updatedBy], references: [user.id] }),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  garden: one(gardens, { fields: [locations.gardenId], references: [gardens.id] }),
  facts: many(locationFacts),
  contentBlocks: many(locationContentBlocks),
  activities: many(activities),
  quizzes: many(quizzes),
  qrCodes: many(qrCodes),
  trailStops: many(trailStops),
  scanEvents: many(scanEvents),
}));

export const locationFactsRelations = relations(locationFacts, ({ one }) => ({
  location: one(locations, { fields: [locationFacts.locationId], references: [locations.id] }),
}));

export const locationContentBlocksRelations = relations(locationContentBlocks, ({ one }) => ({
  location: one(locations, {
    fields: [locationContentBlocks.locationId],
    references: [locations.id],
  }),
}));

export const activitiesRelations = relations(activities, ({ one, many }) => ({
  location: one(locations, { fields: [activities.locationId], references: [locations.id] }),
  events: many(activityEvents),
}));

export const quizzesRelations = relations(quizzes, ({ one, many }) => ({
  location: one(locations, { fields: [quizzes.locationId], references: [locations.id] }),
  questions: many(quizQuestions),
  attempts: many(quizAttemptEvents),
}));

export const quizQuestionsRelations = relations(quizQuestions, ({ one, many }) => ({
  quiz: one(quizzes, { fields: [quizQuestions.quizId], references: [quizzes.id] }),
  options: many(quizOptions),
  attempts: many(quizAttemptEvents),
}));

export const quizOptionsRelations = relations(quizOptions, ({ one }) => ({
  question: one(quizQuestions, {
    fields: [quizOptions.questionId],
    references: [quizQuestions.id],
  }),
}));

export const trailsRelations = relations(trails, ({ one, many }) => ({
  garden: one(gardens, { fields: [trails.gardenId], references: [gardens.id] }),
  stops: many(trailStops),
  primaryForQrCodes: many(qrCodes),
}));

export const trailStopsRelations = relations(trailStops, ({ one }) => ({
  trail: one(trails, { fields: [trailStops.trailId], references: [trails.id] }),
  location: one(locations, { fields: [trailStops.locationId], references: [locations.id] }),
}));

export const qrCodesRelations = relations(qrCodes, ({ one, many }) => ({
  location: one(locations, { fields: [qrCodes.locationId], references: [locations.id] }),
  primaryTrail: one(trails, {
    fields: [qrCodes.primaryTrailId],
    references: [trails.id],
  }),
  scans: many(scanEvents),
}));

export const scanEventsRelations = relations(scanEvents, ({ one }) => ({
  qrCode: one(qrCodes, { fields: [scanEvents.qrId], references: [qrCodes.id] }),
  location: one(locations, { fields: [scanEvents.locationId], references: [locations.id] }),
  trail: one(trails, { fields: [scanEvents.trailId], references: [trails.id] }),
}));

export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({
  location: one(locations, { fields: [analyticsEvents.locationId], references: [locations.id] }),
  trail: one(trails, { fields: [analyticsEvents.trailId], references: [trails.id] }),
  quiz: one(quizzes, { fields: [analyticsEvents.quizId], references: [quizzes.id] }),
}));

export const quizAttemptEventsRelations = relations(quizAttemptEvents, ({ one }) => ({
  quiz: one(quizzes, { fields: [quizAttemptEvents.quizId], references: [quizzes.id] }),
  question: one(quizQuestions, {
    fields: [quizAttemptEvents.questionId],
    references: [quizQuestions.id],
  }),
  option: one(quizOptions, { fields: [quizAttemptEvents.optionId], references: [quizOptions.id] }),
  location: one(locations, {
    fields: [quizAttemptEvents.locationId],
    references: [locations.id],
  }),
}));

export const activityEventsRelations = relations(activityEvents, ({ one }) => ({
  activity: one(activities, { fields: [activityEvents.activityId], references: [activities.id] }),
  location: one(locations, { fields: [activityEvents.locationId], references: [locations.id] }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one }) => ({
  uploadedByUser: one(user, { fields: [mediaAssets.uploadedBy], references: [user.id] }),
}));

export const adminAuditLogsRelations = relations(adminAuditLogs, ({ one }) => ({
  admin: one(user, { fields: [adminAuditLogs.adminUserId], references: [user.id] }),
}));

export const badgesRelations = relations(badges, () => ({}));
