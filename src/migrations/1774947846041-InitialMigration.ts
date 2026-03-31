import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1774947846041 implements MigrationInterface {
  name = 'InitialMigration1774947846041';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."idx_location_geom"`);
    await queryRunner.query(`DROP INDEX "public"."idx_zone_geom"`);
    await queryRunner.query(`DROP INDEX "public"."idx_route_geom"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_status"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_due_date"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_location_id"`);
    await queryRunner.query(`DROP INDEX "public"."idx_tasks_zone_id"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE INDEX "idx_tasks_zone_id" ON "tasks" ("relatedZoneId") `);
    await queryRunner.query(
      `CREATE INDEX "idx_tasks_location_id" ON "tasks" ("assignedLocationId") `
    );
    await queryRunner.query(`CREATE INDEX "idx_tasks_due_date" ON "tasks" ("dueDate") `);
    await queryRunner.query(`CREATE INDEX "idx_tasks_status" ON "tasks" ("status") `);
    await queryRunner.query(`CREATE INDEX "idx_route_geom" ON "routes" USING GiST ("path") `);
    await queryRunner.query(`CREATE INDEX "idx_zone_geom" ON "zones" USING GiST ("boundary") `);
    await queryRunner.query(
      `CREATE INDEX "idx_location_geom" ON "locations" USING GiST ("coordinates") `
    );
  }
}
