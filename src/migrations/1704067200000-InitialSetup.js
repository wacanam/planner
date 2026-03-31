const { MigrationInterface, QueryRunner } = require('typeorm');

class InitialSetup1704067200000 {
  async up(queryRunner) {
    // Enable PostGIS extension
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS postgis');

    // Create locations table
    await queryRunner.query(`
      CREATE TABLE "locations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "coordinates" geometry(Point, 4326),
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create spatial index on locations
    await queryRunner.query(
      'CREATE INDEX idx_location_geom ON "locations" USING gist("coordinates")'
    );

    // Create zones table
    await queryRunner.query(`
      CREATE TABLE "zones" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "boundary" geometry(Polygon, 4326),
        "areaSquareKm" float,
        "status" varchar(50) NOT NULL DEFAULT 'active',
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create spatial index on zones
    await queryRunner.query(
      'CREATE INDEX idx_zone_geom ON "zones" USING gist("boundary")'
    );

    // Create routes table
    await queryRunner.query(`
      CREATE TABLE "routes" (
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
    `);

    // Create spatial index on routes
    await queryRunner.query(
      'CREATE INDEX idx_route_geom ON "routes" USING gist("path")'
    );
  }

  async down(queryRunner) {
    // Drop routes table
    await queryRunner.query('DROP TABLE IF EXISTS "routes" CASCADE');

    // Drop zones table
    await queryRunner.query('DROP TABLE IF EXISTS "zones" CASCADE');

    // Drop locations table
    await queryRunner.query('DROP TABLE IF EXISTS "locations" CASCADE');

    // Disable PostGIS extension (optional)
    // await queryRunner.query('DROP EXTENSION IF EXISTS postgis CASCADE');
  }
}

module.exports = { InitialSetup1704067200000 };
