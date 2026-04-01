import { pgTable, uuid, varchar, text, integer, decimal, timestamp } from 'drizzle-orm/pg-core';
import { RotationStatus } from '../enums';

export const territoryRotations = pgTable('territory_rotations', {
    id: uuid('id').defaultRandom().primaryKey(),
    territoryId: uuid('territoryId').notNull(),
    assignedUserId: uuid('assignedUserId'),
    status: varchar('status', { length: 50 }).notNull().default(RotationStatus.ACTIVE),
    startDate: timestamp('startDate').notNull(),
    completedDate: timestamp('completedDate'),
    coverageAchieved: decimal('coverageAchieved', { precision: 5, scale: 2 })
        .notNull()
        .default('0'),
    visitsMade: integer('visitsMade').notNull().default(0),
    notes: text('notes'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type TerritoryRotation = typeof territoryRotations.$inferSelect;
export type NewTerritoryRotation = typeof territoryRotations.$inferInsert;
