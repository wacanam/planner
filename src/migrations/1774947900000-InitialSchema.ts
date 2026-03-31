import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1774947900000 implements MigrationInterface {
  name = 'InitialSchema1774947900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM types
    await queryRunner.query(
      `CREATE TYPE "public"."user_role" AS ENUM('SUPER_ADMIN', 'ADMIN', 'SERVICE_OVERSEER', 'TERRITORY_SERVANT', 'USER')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."territory_status" AS ENUM('ACTIVE', 'INACTIVE', 'ARCHIVED')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."household_status" AS ENUM('NEW', 'UNINTERESTED', 'INTERESTED', 'DO_NOT_CALL', 'MOVED', 'INACTIVE')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."visit_outcome" AS ENUM('NO_ANSWER', 'NOT_AT_HOME', 'CONVERSATION', 'INTERESTED', 'NOT_INTERESTED', 'DO_NOT_CALL', 'LITERATURE_LEFT', 'RETURN_VISIT_PLANNED')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."encounter_type" AS ENUM('CONVERSATION', 'LITERATURE_DELIVERY', 'PHONE_CALL', 'LETTER', 'OTHER')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sync_status" AS ENUM('PENDING', 'SYNCED', 'CONFLICT')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."rotation_status" AS ENUM('PLANNED', 'COMPLETED', 'SKIPPED')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sync_operation" AS ENUM('CREATE', 'UPDATE', 'DELETE')`
    );
    await queryRunner.query(
      `CREATE TYPE "public"."sync_entity_type" AS ENUM('VISIT', 'ENCOUNTER', 'HOUSEHOLD_UPDATE')`
    );

    // Create Congregation table
    await queryRunner.query(`
      CREATE TABLE "congregations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" VARCHAR(255) NOT NULL,
        "location" VARCHAR(255),
        "country" VARCHAR(255),
        "administrator_id" uuid,
        "total_territory" GEOMETRY(MultiPolygon, 4326),
        "boundary_notes" TEXT,
        "s54_document_url" VARCHAR(512),
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create User table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "email" VARCHAR(255) UNIQUE NOT NULL,
        "password_hash" VARCHAR(255) NOT NULL,
        "first_name" VARCHAR(255) NOT NULL,
        "last_name" VARCHAR(255) NOT NULL,
        "phone" VARCHAR(20),
        "role" "public"."user_role" NOT NULL,
        "congregation_id" uuid REFERENCES "congregations"("id"),
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "is_active" BOOLEAN DEFAULT true,
        "last_login" TIMESTAMP
      )
    `);

    // Create Territory table
    await queryRunner.query(`
      CREATE TABLE "territories" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "congregation_id" uuid NOT NULL REFERENCES "congregations"("id"),
        "number" VARCHAR(50) NOT NULL,
        "name" VARCHAR(255),
        "boundary" GEOMETRY(Polygon, 4326) NOT NULL,
        "area_square_km" NUMERIC(10, 2),
        "total_households" INTEGER,
        "assignment_type" VARCHAR(50) CHECK (assignment_type IN ('INDIVIDUAL', 'GROUP')),
        "status" "public"."territory_status" DEFAULT 'ACTIVE',
        "coverage_percentage" NUMERIC(5, 2),
        "last_covered_date" TIMESTAMP,
        "notes" TEXT,
        "s12_map_url" VARCHAR(512),
        "s13_record_url" VARCHAR(512),
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "deleted_at" TIMESTAMP
      )
    `);

    // Create ServiceGroup table
    await queryRunner.query(`
      CREATE TABLE "service_groups" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "congregation_id" uuid NOT NULL REFERENCES "congregations"("id"),
        "name" VARCHAR(255) NOT NULL,
        "leader_id" uuid NOT NULL REFERENCES "users"("id"),
        "description" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create TerritoryAssignment table
    await queryRunner.query(`
      CREATE TABLE "territory_assignments" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "territory_id" uuid NOT NULL REFERENCES "territories"("id"),
        "assignee_type" VARCHAR(50) CHECK (assignee_type IN ('INDIVIDUAL', 'GROUP')),
        "assignee_id" uuid NOT NULL,
        "assigned_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "rotation_sequence" INTEGER,
        "status" VARCHAR(50) DEFAULT 'ACTIVE',
        "notes" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Household table
    await queryRunner.query(`
      CREATE TABLE "households" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "congregation_id" uuid NOT NULL REFERENCES "congregations"("id"),
        "territory_id" uuid NOT NULL REFERENCES "territories"("id"),
        "address" VARCHAR(255) NOT NULL,
        "house_number" VARCHAR(50),
        "street_name" VARCHAR(255) NOT NULL,
        "city" VARCHAR(255) NOT NULL,
        "postal_code" VARCHAR(20),
        "location" GEOMETRY(Point, 4326) NOT NULL,
        "occupants_names" TEXT[],
        "occupants_count" INTEGER,
        "age_range" VARCHAR(100),
        "special_needs" TEXT,
        "status" "public"."household_status" DEFAULT 'NEW',
        "last_visit_date" TIMESTAMP,
        "last_visit_notes" TEXT,
        "preferred_literature" TEXT[],
        "language_preference" VARCHAR(50),
        "do_not_disturb" BOOLEAN DEFAULT false,
        "best_time_to_call" VARCHAR(100),
        "notes" TEXT,
        "lwp_notes" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "created_by_user_id" uuid REFERENCES "users"("id"),
        "updated_by_user_id" uuid REFERENCES "users"("id")
      )
    `);

    // Create Visit table
    await queryRunner.query(`
      CREATE TABLE "visits" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "household_id" uuid NOT NULL REFERENCES "households"("id"),
        "assignment_id" uuid NOT NULL REFERENCES "territory_assignments"("id"),
        "household_status_before" "public"."household_status",
        "household_status_after" "public"."household_status",
        "visit_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "duration" INTEGER,
        "visited_by_ids" uuid[] NOT NULL,
        "outcome" "public"."visit_outcome",
        "literature_given" TEXT[],
        "return_visit_planned" BOOLEAN DEFAULT false,
        "next_visit_date" TIMESTAMP,
        "notes" TEXT,
        "synced_at" TIMESTAMP,
        "sync_status" "public"."sync_status" DEFAULT 'PENDING',
        "offline_created" BOOLEAN DEFAULT false,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create Encounter table
    await queryRunner.query(`
      CREATE TABLE "encounters" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "visit_id" uuid REFERENCES "visits"("id"),
        "household_id" uuid NOT NULL REFERENCES "households"("id"),
        "user_id" uuid NOT NULL REFERENCES "users"("id"),
        "type" "public"."encounter_type" NOT NULL,
        "description" TEXT NOT NULL,
        "person_spoken" VARCHAR(255),
        "date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "duration" INTEGER,
        "follow_up" BOOLEAN DEFAULT false,
        "follow_up_date" TIMESTAMP,
        "follow_up_notes" TEXT,
        "synced_at" TIMESTAMP,
        "offline_created" BOOLEAN DEFAULT false,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create TerritoryRotation table
    await queryRunner.query(`
      CREATE TABLE "territory_rotations" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "territory_id" uuid NOT NULL REFERENCES "territories"("id"),
        "rotation_name" VARCHAR(255) NOT NULL,
        "previous_assignee_id" uuid,
        "new_assignee_id" uuid,
        "rotation_date" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "rotation_reason" TEXT,
        "status" "public"."rotation_status" DEFAULT 'PLANNED',
        "completed_date" TIMESTAMP,
        "notes" TEXT,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "created_by_user_id" uuid NOT NULL REFERENCES "users"("id")
      )
    `);

    // Create OfflineSyncQueue table
    await queryRunner.query(`
      CREATE TABLE "offline_sync_queue" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL REFERENCES "users"("id"),
        "entity_type" "public"."sync_entity_type" NOT NULL,
        "entity_id" uuid NOT NULL,
        "operation" "public"."sync_operation" NOT NULL,
        "data" JSONB NOT NULL,
        "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "status" "public"."sync_status" DEFAULT 'PENDING',
        "synced_at" TIMESTAMP,
        "error" TEXT,
        "retry_count" INTEGER DEFAULT 0,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX "idx_territories_congregation" ON "territories"("congregation_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_territories_boundary" ON "territories" USING GIST("boundary")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_assignments_territory" ON "territory_assignments"("territory_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_assignments_assignee" ON "territory_assignments"("assignee_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_households_territory" ON "households"("territory_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_households_location" ON "households" USING GIST("location")`
    );
    await queryRunner.query(`CREATE INDEX "idx_visits_household" ON "visits"("household_id")`);
    await queryRunner.query(`CREATE INDEX "idx_visits_assignment" ON "visits"("assignment_id")`);
    await queryRunner.query(`CREATE INDEX "idx_visits_visit_date" ON "visits"("visit_date")`);
    await queryRunner.query(
      `CREATE INDEX "idx_encounters_household" ON "encounters"("household_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_rotations_territory" ON "territory_rotations"("territory_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sync_queue_user" ON "offline_sync_queue"("user_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_sync_queue_status" ON "offline_sync_queue"("status")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sync_queue_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sync_queue_user"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_rotations_territory"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_encounters_household"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_visits_visit_date"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_visits_assignment"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_visits_household"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_households_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_households_territory"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_assignments_assignee"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_assignments_territory"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_territories_boundary"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_territories_congregation"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "offline_sync_queue"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "territory_rotations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "encounters"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "visits"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "households"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "territory_assignments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "service_groups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "territories"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "congregations"`);

    // Drop ENUM types
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."sync_entity_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."sync_operation"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."rotation_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."sync_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."encounter_type"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."visit_outcome"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."household_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."territory_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."user_role"`);
  }
}
