import { boolean, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * Encounter - a specific person spoken to in the ministry.
 *
 * It may happen during a visit, at a household without a visit record,
 * or completely outside a household assignment.
 */
export const encounters = pgTable('encounters', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Linked visit/household context when available.
  visitId: uuid('visitId'),
  householdId: uuid('householdId'),
  userId: uuid('userId').notNull(),

  // Person identity
  name: varchar('name', { length: 255 }),
  gender: varchar('gender', { length: 20 }),
  ageGroup: varchar('ageGroup', { length: 30 }),
  role: varchar('role', { length: 50 }),

  // Conversation details
  response: varchar('response', { length: 50 }).notNull(),
  languageSpoken: varchar('languageSpoken', { length: 100 }),
  topicDiscussed: varchar('topicDiscussed', { length: 255 }),
  literatureAccepted: text('literatureAccepted'),
  bibleStudyInterest: boolean('bibleStudyInterest').notNull().default(false),

  // Follow-up
  returnVisitRequested: boolean('returnVisitRequested').notNull().default(false),
  nextVisitNotes: text('nextVisitNotes'),

  // Notes
  notes: text('notes'),

  // Offline sync
  syncStatus: varchar('syncStatus', { length: 20 }).notNull().default('pending'),
  offlineCreated: boolean('offlineCreated').notNull().default(false),
  syncedAt: timestamp('syncedAt'),

  // Audit
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type Encounter = typeof encounters.$inferSelect;
export type NewEncounter = typeof encounters.$inferInsert;
