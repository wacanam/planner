const { MigrationInterface, QueryRunner } = require('typeorm');

class InitialMigration1774947522635 {
  name = 'InitialMigration1774947522635';

  async up(queryRunner) {
    // Recreate spatial indexes with correct GiST syntax
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_location_geom" ON "locations" USING GiST ("coordinates")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_zone_geom" ON "zones" USING GiST ("boundary")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_route_geom" ON "routes" USING GiST ("path")`
    );

    // Recreate task indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tasks_status" ON "tasks" ("status")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tasks_due_date" ON "tasks" ("dueDate")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tasks_location_id" ON "tasks" ("assignedLocationId")`
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_tasks_zone_id" ON "tasks" ("relatedZoneId")`
    );

    // Ensure timestamps have correct defaults
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "createdAt" SET DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "updatedAt" SET DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "zones" ALTER COLUMN "createdAt" SET DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "zones" ALTER COLUMN "updatedAt" SET DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "createdAt" SET DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "updatedAt" SET DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "createdAt" SET DEFAULT now()`
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "updatedAt" SET DEFAULT now()`
    );
  }

  async down(queryRunner) {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_zone_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_location_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_due_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_route_geom"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_zone_geom"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_location_geom"`);

    // Revert timestamp defaults
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`
    );
    await queryRunner.query(
      `ALTER TABLE "tasks" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`
    );
    await queryRunner.query(
      `ALTER TABLE "routes" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`
    );
    await queryRunner.query(
      `ALTER TABLE "zones" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`
    );
    await queryRunner.query(
      `ALTER TABLE "zones" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`
    );
    await queryRunner.query(
      `ALTER TABLE "locations" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`
    );
  }
}

module.exports = { InitialMigration1774947522635 };
