import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  decimal,
  timestamp,
  jsonb,
  unique,
} from 'drizzle-orm/pg-core';

// ─── Enums (as const strings) ────────────────────────────────────────────────

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  SERVICE_OVERSEER: 'SERVICE_OVERSEER',
  TERRITORY_SERVANT: 'TERRITORY_SERVANT',
  USER: 'USER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const CongregationRole = {
  SERVICE_OVERSEER: 'service_overseer',
  TERRITORY_SERVANT: 'territory_servant',
} as const;
export type CongregationRole = (typeof CongregationRole)[keyof typeof CongregationRole];

export const GroupRole = {
  GROUP_OVERSEER: 'group_overseer',
  ASSISTANT_OVERSEER: 'assistant_overseer',
  MEMBER: 'member',
} as const;
export type GroupRole = (typeof GroupRole)[keyof typeof GroupRole];

export const TerritoryStatus = {
  AVAILABLE: 'available',
  ASSIGNED: 'assigned',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;
export type TerritoryStatus = (typeof TerritoryStatus)[keyof typeof TerritoryStatus];

export const AssignmentStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  RETURNED: 'returned',
} as const;
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

export const RotationStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;
export type RotationStatus = (typeof RotationStatus)[keyof typeof RotationStatus];

export const TerritoryRequestStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;
export type TerritoryRequestStatus =
  (typeof TerritoryRequestStatus)[keyof typeof TerritoryRequestStatus];

// ─── Tables ───────────────────────────────────────────────────────────────────

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

export const groups = pgTable('groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  congregationId: uuid('congregationId').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

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

export const territories = pgTable('territories', {
  id: uuid('id').defaultRandom().primaryKey(),
  number: varchar('number', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  notes: text('notes'),
  status: varchar('status', { length: 50 }).notNull().default(TerritoryStatus.AVAILABLE),
  householdsCount: integer('householdsCount').notNull().default(0),
  coveragePercent: decimal('coveragePercent', { precision: 5, scale: 2 }).notNull().default('0'),
  boundary: text('boundary'),
  congregationId: uuid('congregationId').notNull(),
  publisherId: uuid('publisherId'),
  groupId: uuid('groupId'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const serviceGroups = pgTable('service_groups', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  congregationId: uuid('congregationId').notNull(),
  isActive: boolean('isActive').notNull().default(true),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const territoryAssignments = pgTable('territory_assignments', {
  id: uuid('id').defaultRandom().primaryKey(),
  territoryId: uuid('territoryId').notNull(),
  userId: uuid('userId'),
  serviceGroupId: uuid('serviceGroupId'),
  status: varchar('status', { length: 50 }).notNull().default(AssignmentStatus.ACTIVE),
  assignedAt: timestamp('assignedAt'),
  dueAt: timestamp('dueAt'),
  returnedAt: timestamp('returnedAt'),
  coverageAtAssignment: decimal('coverageAtAssignment', {
    precision: 5,
    scale: 2,
  })
    .notNull()
    .default('0'),
  notes: text('notes'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const territoryRotations = pgTable('territory_rotations', {
  id: uuid('id').defaultRandom().primaryKey(),
  territoryId: uuid('territoryId').notNull(),
  assignedUserId: uuid('assignedUserId'),
  status: varchar('status', { length: 50 }).notNull().default(RotationStatus.ACTIVE),
  startDate: timestamp('startDate').notNull(),
  completedDate: timestamp('completedDate'),
  coverageAchieved: decimal('coverageAchieved', { precision: 5, scale: 2 })
    .notNull()
    .default('0'),
  visitsMade: integer('visitsMade').notNull().default(0),
  notes: text('notes'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const territoryRequests = pgTable('territory_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  congregationId: uuid('congregationId').notNull(),
  publisherId: uuid('publisherId').notNull(),
  territoryId: uuid('territoryId'),
  status: varchar('status', { length: 20 }).notNull().default(TerritoryRequestStatus.PENDING),
  approvedBy: uuid('approvedBy'),
  approvedAt: timestamp('approvedAt'),
  requestedAt: timestamp('requestedAt').defaultNow().notNull(),
});

export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  congregationId: uuid('congregationId').notNull(),
  territoryId: uuid('territoryId').notNull(),
  address: varchar('address', { length: 255 }).notNull(),
  houseNumber: varchar('houseNumber', { length: 50 }),
  streetName: varchar('streetName', { length: 255 }).notNull(),
  city: varchar('city', { length: 255 }).notNull(),
  postalCode: varchar('postalCode', { length: 20 }),
  // location stored as WKT/GeoJSON text (PostGIS geometry not directly mapped in Drizzle)
  location: text('location'),
  occupantsCount: integer('occupantsCount'),
  ageRange: varchar('ageRange', { length: 100 }),
  specialNeeds: text('specialNeeds'),
  status: varchar('status', { length: 50 }).notNull().default('NEW'),
  lastVisitDate: timestamp('lastVisitDate'),
  lastVisitNotes: text('lastVisitNotes'),
  languagePreference: varchar('languagePreference', { length: 50 }),
  doNotDisturb: boolean('doNotDisturb').notNull().default(false),
  bestTimeToCall: varchar('bestTimeToCall', { length: 100 }),
  notes: text('notes'),
  lwpNotes: text('lwpNotes'),
  createdByUserId: uuid('createdByUserId'),
  updatedByUserId: uuid('updatedByUserId'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const visits = pgTable('visits', {
  id: uuid('id').defaultRandom().primaryKey(),
  householdId: uuid('householdId').notNull(),
  assignmentId: uuid('assignmentId').notNull(),
  householdStatusBefore: varchar('householdStatusBefore', { length: 50 }),
  householdStatusAfter: varchar('householdStatusAfter', { length: 50 }),
  visitDate: timestamp('visitDate').defaultNow().notNull(),
  duration: integer('duration'),
  outcome: varchar('outcome', { length: 50 }),
  returnVisitPlanned: boolean('returnVisitPlanned').notNull().default(false),
  nextVisitDate: timestamp('nextVisitDate'),
  notes: text('notes'),
  syncedAt: timestamp('syncedAt'),
  syncStatus: varchar('syncStatus', { length: 50 }).notNull().default('PENDING'),
  offlineCreated: boolean('offlineCreated').notNull().default(false),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export const encounters = pgTable('encounters', {
  id: uuid('id').defaultRandom().primaryKey(),
  visitId: uuid('visitId'),
  householdId: uuid('householdId').notNull(),
  userId: uuid('userId').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  description: text('description').notNull(),
  personSpoken: varchar('personSpoken', { length: 255 }),
  date: timestamp('date').defaultNow().notNull(),
  duration: integer('duration'),
  followUp: boolean('followUp').notNull().default(false),
  followUpDate: timestamp('followUpDate'),
  followUpNotes: text('followUpNotes'),
  syncedAt: timestamp('syncedAt'),
  offlineCreated: boolean('offlineCreated').notNull().default(false),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

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

// Inferred types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Congregation = typeof congregations.$inferSelect;
export type NewCongregation = typeof congregations.$inferInsert;
export type CongregationMember = typeof congregationMembers.$inferSelect;
export type Group = typeof groups.$inferSelect;
export type GroupMember = typeof groupMembers.$inferSelect;
export type Territory = typeof territories.$inferSelect;
export type TerritoryAssignment = typeof territoryAssignments.$inferSelect;
export type TerritoryRotation = typeof territoryRotations.$inferSelect;
export type TerritoryRequest = typeof territoryRequests.$inferSelect;
export type ServiceGroup = typeof serviceGroups.$inferSelect;
