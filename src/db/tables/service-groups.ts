import { boolean, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const serviceGroups = pgTable('service_groups', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    congregationId: uuid('congregationId').notNull(),
    isActive: boolean('isActive').notNull().default(true),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type ServiceGroup = typeof serviceGroups.$inferSelect;
export type NewServiceGroup = typeof serviceGroups.$inferInsert;
