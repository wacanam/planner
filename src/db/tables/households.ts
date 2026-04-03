import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Which congregation this household belongs to
  congregationId: uuid('congregationId').notNull(),
  address: varchar('address', { length: 255 }).notNull(),
  houseNumber: varchar('houseNumber', { length: 50 }),
  streetName: varchar('streetName', { length: 255 }).notNull(),
  city: varchar('city', { length: 255 }).notNull(),
  postalCode: varchar('postalCode', { length: 20 }),
  // Coordinates — determines which territory boundary the household falls in
  // Territory membership is resolved spatially, not by FK
  // Will use PostGIS geometry(Point, 4326) when map feature is added
  location: text('location'), // interim: WKT or "lat,lng" string
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
