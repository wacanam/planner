import { integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * Household — a physical address/dwelling on the congregation's map.
 *
 * No FK to congregation or territory — membership is determined spatially
 * by coordinates. Territory boundaries can grow/shrink freely without
 * needing to update household records.
 *
 * Future: location column migrates to PostGIS geometry(Point, 4326)
 * for ST_Within() spatial queries against territory boundaries.
 */
export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),

  // ── Location ─────────────────────────────────────────────────────────────
  address: varchar('address', { length: 255 }).notNull(),
  houseNumber: varchar('houseNumber', { length: 50 }),
  unitNumber: varchar('unitNumber', { length: 50 }), // apartment/unit
  streetName: varchar('streetName', { length: 255 }).notNull(),
  city: varchar('city', { length: 255 }).notNull(),
  postalCode: varchar('postalCode', { length: 20 }),
  country: varchar('country', { length: 100 }),
  latitude: varchar('latitude', { length: 30 }), // decimal degrees
  longitude: varchar('longitude', { length: 30 }), // decimal degrees
  // Interim WKT/GeoJSON — will become geometry(Point,4326) with PostGIS
  location: text('location'),

  // ── Physical characteristics ──────────────────────────────────────────────
  // house | apartment | condo | townhouse | mobile_home | business | other
  type: varchar('type', { length: 50 }).default('house'),
  floor: integer('floor'), // floor number

  // ── Occupant info (observed over time) ───────────────────────────────────
  occupantsCount: integer('occupantsCount'),
  languages: text('languages'), // comma-separated or JSON array
  bestTimeToCall: varchar('bestTimeToCall', { length: 100 }),

  // ── Status ────────────────────────────────────────────────────────────────
  // new | active | not_home | return_visit | do_not_visit | moved | inactive
  status: varchar('status', { length: 50 }).notNull().default('new'),

  // ── Visit summary (denormalized for quick display) ────────────────────────
  lastVisitDate: timestamp('lastVisitDate'),
  lastVisitOutcome: varchar('lastVisitOutcome', { length: 50 }),

  // ── Notes ─────────────────────────────────────────────────────────────────
  notes: text('notes'),
  lwpNotes: text('lwpNotes'), // literature work placement notes

  // ── Audit ─────────────────────────────────────────────────────────────────
  createdById: uuid('createdById'), // who added this household
  updatedById: uuid('updatedById'), // who last edited it
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),
});

export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
