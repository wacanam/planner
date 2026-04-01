import { pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { GroupRole } from '../enums';

export const groupMembers = pgTable(
  'group_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('userId').notNull(),
    groupId: uuid('groupId').notNull(),
    groupRole: varchar('groupRole', { length: 50 }).notNull().default(GroupRole.MEMBER),
    joinedAt: timestamp('joinedAt').defaultNow().notNull(),
  },
  (t) => [unique().on(t.userId, t.groupId)]
);

export type GroupMember = typeof groupMembers.$inferSelect;
export type NewGroupMember = typeof groupMembers.$inferInsert;
