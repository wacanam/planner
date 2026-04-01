import { pgTable, uuid, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { JoinRequestStatus } from '../enums';

export const congregationJoinRequests = pgTable('congregation_join_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  congregationId: uuid('congregationId').notNull(),
  userId: uuid('userId').notNull(),
  message: text('message'), // optional note from the requester
  status: varchar('status', { length: 20 })
    .notNull()
    .default(JoinRequestStatus.PENDING),
  reviewedBy: uuid('reviewedBy'), // userId of overseer who approved/rejected
  reviewedAt: timestamp('reviewedAt'),
  reviewNote: text('reviewNote'),
  requestedAt: timestamp('requestedAt').defaultNow().notNull(),
});

export type CongregationJoinRequest = typeof congregationJoinRequests.$inferSelect;
export type NewCongregationJoinRequest = typeof congregationJoinRequests.$inferInsert;
