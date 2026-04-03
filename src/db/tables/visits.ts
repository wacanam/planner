import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const visits = pgTable('visits', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Publisher who logged this visit — visits belong to the publisher
  userId: uuid('userId').notNull(),
  householdId: uuid('householdId').notNull(),
  // Optional: which assignment was active when this visit was made
  assignmentId: uuid('assignmentId'),
  householdStatusBefore: varchar('householdStatusBefore', { length: 50 }),
  householdStatusAfter: varchar('householdStatusAfter', { length: 50 }),
  visitDate: timestamp('visitDate').defaultNow().notNull(),
  duration: integer('duration'),
  outcome: varchar('outcome', { length: 50 }),
  returnVisitPlanned: boolean('returnVisitPlanned').notNull().default(false),
  nextVisitDate: timestamp('nextVisitDate'),
  notes: text('notes'),
  syncedAt: timestamp('syncedAt'),
  syncStatus: varchar('syncStatus', { length: 50 }).notNull().default('PENDING'),
  offlineCreated: boolean('offlineCreated').notNull().default(false),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type Visit = typeof visits.$inferSelect;
export type NewVisit = typeof visits.$inferInsert;
