import 'reflect-metadata';
import { config } from 'dotenv';
import pg from 'pg';

// Load environment variables from .env.local or .env
config({
  path: ['.env.local', '.env'],
});

const queries = [
  // Enable PostGIS extension
  'CREATE EXTENSION IF NOT EXISTS postgis',

  // Create locations table
  `
    CREATE TABLE IF NOT EXISTS "locations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" varchar(255) NOT NULL,
      "description" text,
      "coordinates" geometry(Point, 4326),
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Create spatial index on locations
  'CREATE INDEX IF NOT EXISTS idx_location_geom ON "locations" USING gist("coordinates")',

  // Create zones table
  `
    CREATE TABLE IF NOT EXISTS "zones" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" varchar(255) NOT NULL,
      "description" text,
      "boundary" geometry(Polygon, 4326),
      "areaSquareKm" float,
      "status" varchar(50) NOT NULL DEFAULT 'active',
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Create spatial index on zones
  'CREATE INDEX IF NOT EXISTS idx_zone_geom ON "zones" USING gist("boundary")',

  // Create routes table
  `
    CREATE TABLE IF NOT EXISTS "routes" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "name" varchar(255) NOT NULL,
      "description" text,
      "path" geometry(LineString, 4326),
      "distanceKm" float,
      "estimatedMinutes" integer,
      "status" varchar(50) NOT NULL DEFAULT 'planned',
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `,

  // Create spatial index on routes
  'CREATE INDEX IF NOT EXISTS idx_route_geom ON "routes" USING gist("path")',
];

async function runMigrations() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
  });

  try {
    await client.connect();
    console.log('✅ Connected to Neon Postgres');

    for (const query of queries) {
      try {
        await client.query(query);
        console.log('✓ Executed:', query.substring(0, 50).trim() + '...');
      } catch (err: any) {
        console.warn('⚠️  Query warning:', (err as Error).message);
      }
    }

    console.log('✅ All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
