const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateTasksTable1704068400000 {
  async up(queryRunner) {
    // Create tasks table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tasks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" varchar(255) NOT NULL,
        "description" text,
        "status" varchar(50) NOT NULL DEFAULT 'todo',
        "priority" varchar(50),
        "assignedLocationId" uuid,
        "relatedZoneId" uuid,
        "dueDate" timestamp,
        "completionPercentage" integer NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create index on status for queries
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_tasks_status ON "tasks" ("status")'
    );

    // Create index on dueDate for sorting
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON "tasks" ("dueDate")'
    );

    // Create index on assignedLocationId for foreign key lookups
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_tasks_location_id ON "tasks" ("assignedLocationId")'
    );

    // Create index on relatedZoneId for foreign key lookups
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_tasks_zone_id ON "tasks" ("relatedZoneId")'
    );
  }

  async down(queryRunner) {
    // Drop tasks table
    await queryRunner.query('DROP TABLE IF EXISTS "tasks" CASCADE');
  }
}

module.exports = { CreateTasksTable1704068400000 };
