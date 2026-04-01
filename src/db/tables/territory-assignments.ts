import { decimal, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { AssignmentStatus } from '../enums';

export const territoryAssignments = pgTable('territory_assignments', {
    id: uuid('id').defaultRandom().primaryKey(),
    territoryId: uuid('territoryId').notNull(),
    userId: uuid('userId'),
    serviceGroupId: uuid('serviceGroupId'),
    status: varchar('status', { length: 50 }).notNull().default(AssignmentStatus.ACTIVE),
    assignedAt: timestamp('assignedAt'),
    dueAt: timestamp('dueAt'),
    returnedAt: timestamp('returnedAt'),
    coverageAtAssignment: decimal('coverageAtAssignment', {
        precision: 5,
        scale: 2,
    })
        .notNull()
        .default('0'),
    notes: text('notes'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type TerritoryAssignment = typeof territoryAssignments.$inferSelect;
export type NewTerritoryAssignment = typeof territoryAssignments.$inferInsert;
