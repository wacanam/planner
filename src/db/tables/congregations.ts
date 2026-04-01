import { pgTable, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

export const congregations = pgTable('congregations', {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    city: varchar('city', { length: 255 }),
    country: varchar('country', { length: 100 }),
    status: varchar('status', { length: 50 }).notNull().default('active'),
    createdById: uuid('createdById'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type Congregation = typeof congregations.$inferSelect;
export type NewCongregation = typeof congregations.$inferInsert;
