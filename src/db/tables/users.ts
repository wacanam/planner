import { boolean, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { UserRole } from '../enums';

export const users = pgTable('users', {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    password: varchar('password', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull().default(UserRole.USER),
    congregationId: uuid('congregationId'),
    isActive: boolean('isActive').notNull().default(true),
    lastLoginAt: timestamp('lastLoginAt'),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
