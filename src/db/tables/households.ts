import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Address fields
  address: varchar('address', { length: 255 }).notNull(),
  houseNumber: varchar('houseNumber', { length: 50 }),
  streetName: varchar('streetName', { length: 255 }).notNull(),
  city: varchar('city', { length: 255 }).notNull(),
  postalCode: varchar('postalCode', { length: 20 }),
  // Coordinates — the source of truth for spatial queries.
  // Which territory/congregation a household belongs to is determined by:
  //   ST_Within(household.location, territory.boundary)
  // No FK to territory or congregation — boundaries can grow/shrink freely.
  // Will migrate to PostGIS geometry(Point, 4326) when map feature is added.
  location: text('location'), // interim: "lat,lng" string or WKT Point
  latitude: text('latitude'),
  longitude: text('longitude'),
  // Descriptive fields
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
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
