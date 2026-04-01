import { pgTable, uuid, varchar, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const encounters = pgTable('encounters', {
    id: uuid('id').defaultRandom().primaryKey(),
    visitId: uuid('visitId'),
    householdId: uuid('householdId').notNull(),
    userId: uuid('userId').notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    description: text('description').notNull(),
    personSpoken: varchar('personSpoken', { length: 255 }),
    date: timestamp('date').defaultNow().notNull(),
    duration: integer('duration'),
    followUp: boolean('followUp').notNull().default(false),
    followUpDate: timestamp('followUpDate'),
    followUpNotes: text('followUpNotes'),
    syncedAt: timestamp('syncedAt'),
    offlineCreated: boolean('offlineCreated').notNull().default(false),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type Encounter = typeof encounters.$inferSelect;
export type NewEncounter = typeof encounters.$inferInsert;
