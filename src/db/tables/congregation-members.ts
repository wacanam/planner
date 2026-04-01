import { pgTable, uuid, varchar, text, timestamp, unique } from 'drizzle-orm/pg-core';

export const congregationMembers = pgTable(
    'congregation_members',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('userId').notNull(),
        congregationId: uuid('congregationId').notNull(),
        congregationRole: varchar('congregationRole', { length: 50 }),
        // pending = join request awaiting approval, active = full member
        status: varchar('status', { length: 20 }).notNull().default('active'),
        joinMessage: text('joinMessage'),   // optional note from requester
        reviewedBy: uuid('reviewedBy'),     // overseer who approved/rejected
        reviewedAt: timestamp('reviewedAt'),
        reviewNote: text('reviewNote'),
        joinedAt: timestamp('joinedAt').defaultNow().notNull(),
    },
    (t) => [unique().on(t.userId, t.congregationId)]
);

export type CongregationMember = typeof congregationMembers.$inferSelect;
export type NewCongregationMember = typeof congregationMembers.$inferInsert;
