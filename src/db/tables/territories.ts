import { decimal, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { TerritoryStatus } from '../enums';

export const territories = pgTable('territories', {
  id: uuid('id').defaultRandom().primaryKey(),
  number: varchar('number', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  notes: text('notes'),
  status: varchar('status', { length: 50 }).notNull().default(TerritoryStatus.AVAILABLE),
  householdsCount: integer('householdsCount').notNull().default(0),
  coveragePercent: decimal('coveragePercent', { precision: 5, scale: 2 }).notNull().default('0'),
  boundary: text('boundary'),
  congregationId: uuid('congregationId').notNull(),
  createdById: uuid('createdById'),
  publisherId: uuid('publisherId'),
  groupId: uuid('groupId'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type Territory = typeof territories.$inferSelect;
export type NewTerritory = typeof territories.$inferInsert;
