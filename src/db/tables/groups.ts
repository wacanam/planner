import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const groups = pgTable('groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  congregationId: uuid('congregationId').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export type Group = typeof groups.$inferSelect;
export type NewGroup = typeof groups.$inferInsert;
