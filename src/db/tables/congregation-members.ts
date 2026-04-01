import { pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

export const congregationMembers = pgTable(
    'congregation_members',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('userId').notNull(),
        congregationId: uuid('congregationId').notNull(),
        congregationRole: varchar('congregationRole', { length: 50 }),
        joinedAt: timestamp('joinedAt').defaultNow().notNull(),
    },
    (t) => [unique().on(t.userId, t.congregationId)]
);

export type CongregationMember = typeof congregationMembers.$inferSelect;
export type NewCongregationMember = typeof congregationMembers.$inferInsert;
