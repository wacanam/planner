import { boolean, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * Encounter — a specific person met during a visit.
 *
 * One visit can have multiple encounters (e.g. spoke to two family members).
 * Captures who was met and how the conversation went.
 */
export const encounters = pgTable('encounters', {
  id: uuid('id').defaultRandom().primaryKey(),

  // ── Links ─────────────────────────────────────────────────────────────────
  visitId: uuid('visitId').notNull(),                  // which visit this happened during
  householdId: uuid('householdId').notNull(),          // denormalized for easy querying
  userId: uuid('userId').notNull(),                    // publisher who had this encounter

  // ── Person identity (what publisher observes/learns) ──────────────────────
  name: varchar('name', { length: 255 }),              // if they introduce themselves
  // male | female | unknown
  gender: varchar('gender', { length: 20 }),
  // child | youth | adult | elderly
  ageGroup: varchar('ageGroup', { length: 30 }),
  // owner | tenant | family_member | visitor | unknown
  role: varchar('role', { length: 50 }),

  // ── The conversation ──────────────────────────────────────────────────────
  // receptive | neutral | not_interested | hostile | do_not_visit | moved
  response: varchar('response', { length: 50 }).notNull(),
  languageSpoken: varchar('languageSpoken', { length: 100 }),
  topicDiscussed: varchar('topicDiscussed', { length: 255 }),
  literatureAccepted: text('literatureAccepted'),      // what they took
  bibleStudyInterest: boolean('bibleStudyInterest').notNull().default(false),

  // ── Follow-up ─────────────────────────────────────────────────────────────
  returnVisitRequested: boolean('returnVisitRequested').notNull().default(false),
  nextVisitNotes: text('nextVisitNotes'),              // what to remember about this person

  // ── Notes ─────────────────────────────────────────────────────────────────
  notes: text('notes'),

  // ── Offline sync ──────────────────────────────────────────────────────────
  syncStatus: varchar('syncStatus', { length: 20 }).notNull().default('pending'),
  offlineCreated: boolean('offlineCreated').notNull().default(false),
  syncedAt: timestamp('syncedAt'),

  // ── Audit ─────────────────────────────────────────────────────────────────
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type Encounter = typeof encounters.$inferSelect;
export type NewEncounter = typeof encounters.$inferInsert;
