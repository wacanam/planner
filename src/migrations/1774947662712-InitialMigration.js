class InitialMigration1774947662712 {
  name = 'InitialMigration1774947662712';

  async up(queryRunner) {
    // Drop old indexes (if they exist)
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_location_geom"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_zone_geom"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_route_geom"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_tasks_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_tasks_due_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_tasks_location_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."idx_tasks_zone_id"`);

    // Ensure proper timestamp defaults
    await queryRunner.query(`ALTER TABLE "locations" ALTER COLUMN "createdAt" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "locations" ALTER COLUMN "updatedAt" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "zones" ALTER COLUMN "createdAt" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "zones" ALTER COLUMN "updatedAt" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "routes" ALTER COLUMN "createdAt" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "routes" ALTER COLUMN "updatedAt" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "createdAt" SET DEFAULT now()`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "updatedAt" SET DEFAULT now()`);

    // Recreate spatial indexes
    await queryRunner.query(`CREATE INDEX "idx_location_geom" ON "locations" USING GiST ("coordinates")`);
    await queryRunner.query(`CREATE INDEX "idx_zone_geom" ON "zones" USING GiST ("boundary")`);
    await queryRunner.query(`CREATE INDEX "idx_route_geom" ON "routes" USING GiST ("path")`);

    // Recreate task indexes
    await queryRunner.query(`CREATE INDEX "idx_tasks_status" ON "tasks" ("status")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_due_date" ON "tasks" ("dueDate")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_location_id" ON "tasks" ("assignedLocationId")`);
    await queryRunner.query(`CREATE INDEX "idx_tasks_zone_id" ON "tasks" ("relatedZoneId")`);
  }

  async down(queryRunner) {
    // Drop all indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_zone_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_location_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_due_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tasks_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_route_geom"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_zone_geom"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_location_geom"`);

    // Revert timestamp defaults
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "tasks" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "routes" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "routes" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "zones" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "zones" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "locations" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP`);
    await queryRunner.query(`ALTER TABLE "locations" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP`);
  }
}

module.exports = { InitialMigration1774947662712 };
