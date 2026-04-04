import { integer, pgTable, text, timestamp, uuid, varchar, customType } from 'drizzle-orm/pg-core';

// PostGIS geometry type — Drizzle doesn't ship a built-in, so we use customType.
// Stored as geometry(Point,4326); JS value is the raw WKB hex string from Postgres.
// We only read it server-side for spatial queries; the client never uses this column directly.
const geometry = customType<{ data: string; driverData: string }>({
  dataType() { return 'geometry(Point,4326)'; },
});

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
  createdById: uuid('createdById'),
  updatedById: uuid('updatedById'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
  updatedAt: timestamp('updatedAt').defaultNow().notNull(),

  // ── Spatial (PostGIS) ─────────────────────────────────────────────────────
  // Auto-synced from latitude/longitude via DB trigger households_sync_location.
  // Use for ST_Within / ST_DWithin queries; never send to client.
  location: geometry('location'),
});

export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
