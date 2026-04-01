import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { TerritoryRequestStatus } from '../enums';

export const territoryRequests = pgTable('territory_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  congregationId: uuid('congregationId').notNull(),
  publisherId: uuid('publisherId').notNull(),
  territoryId: uuid('territoryId'),
  status: varchar('status', { length: 20 }).notNull().default(TerritoryRequestStatus.PENDING),
  message: text('message'),
  approvedBy: uuid('approvedBy'),
  approvedAt: timestamp('approvedAt'),
  responseMessage: text('responseMessage'),
  requestedAt: timestamp('requestedAt').defaultNow().notNull(),
});

export type TerritoryRequest = typeof territoryRequests.$inferSelect;
export type NewTerritoryRequest = typeof territoryRequests.$inferInsert;
