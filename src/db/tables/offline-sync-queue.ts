import { pgTable, uuid, varchar, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const offlineSyncQueue = pgTable('offline_sync_queue', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('userId').notNull(),
    entityType: varchar('entityType', { length: 50 }).notNull(),
    entityId: uuid('entityId').notNull(),
    operation: varchar('operation', { length: 50 }).notNull(),
    data: jsonb('data').notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    status: varchar('status', { length: 50 }).notNull().default('PENDING'),
    syncedAt: timestamp('syncedAt'),
    error: text('error'),
    retryCount: integer('retryCount').notNull().default(0),
    createdAt: timestamp('createdAt').defaultNow().notNull(),
    updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type OfflineSyncQueue = typeof offlineSyncQueue.$inferSelect;
export type NewOfflineSyncQueue = typeof offlineSyncQueue.$inferInsert;
