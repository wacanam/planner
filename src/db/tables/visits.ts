import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * Visit — a publisher's record of going to a household.
 *
 * Belongs to the publisher (userId). One household can have many visits
 * from different publishers over time.
 */
export const visits = pgTable('visits', {
  id: uuid('id').defaultRandom().primaryKey(),

  // ── Who & When ────────────────────────────────────────────────────────────
  userId: uuid('userId').notNull(),                    // publisher who made the visit
  householdId: uuid('householdId').notNull(),          // which household
  visitDate: timestamp('visitDate').defaultNow().notNull(),

  // ── Outcome ───────────────────────────────────────────────────────────────
  // answered | not_home | return_visit | do_not_visit | moved | other
  outcome: varchar('outcome', { length: 50 }).notNull(),
  householdStatusBefore: varchar('householdStatusBefore', { length: 50 }), // snapshot
  householdStatusAfter: varchar('householdStatusAfter', { length: 50 }),   // updated status

  // ── What was done ─────────────────────────────────────────────────────────
  duration: integer('duration'),                       // minutes spent
  literatureLeft: text('literatureLeft'),              // what was placed/given
  bibleTopicDiscussed: varchar('bibleTopicDiscussed', { length: 255 }),

  // ── Follow-up ─────────────────────────────────────────────────────────────
  returnVisitPlanned: boolean('returnVisitPlanned').notNull().default(false),
  nextVisitDate: timestamp('nextVisitDate'),
  nextVisitNotes: text('nextVisitNotes'),

  // ── Context ───────────────────────────────────────────────────────────────
  assignmentId: uuid('assignmentId'),                  // active assignment at time of visit (optional)
  notes: text('notes'),

  // ── Offline sync ──────────────────────────────────────────────────────────
  // pending | synced | failed
  syncStatus: varchar('syncStatus', { length: 20 }).notNull().default('pending'),
  offlineCreated: boolean('offlineCreated').notNull().default(false),
  syncedAt: timestamp('syncedAt'),

  // ── Audit ─────────────────────────────────────────────────────────────────
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
