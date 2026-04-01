import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase1CongregationFoundation1780000000000 implements MigrationInterface {
  name = 'Phase1CongregationFoundation1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add createdById to congregations
    await queryRunner.query(`ALTER TABLE "congregations" ADD COLUMN IF NOT EXISTS "createdById" uuid`);
    await queryRunner.query(`
      ALTER TABLE "congregations"
        ADD CONSTRAINT "FK_congregations_createdById"
        FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL
        NOT VALID
    `);

    // congregation_members (publishers)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "congregation_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "congregationId" uuid NOT NULL,
        "congregationRole" varchar(50),
        "joinedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_congregation_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_congregation_members_user_cong" UNIQUE ("userId", "congregationId"),
        CONSTRAINT "FK_congregation_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_congregation_members_congregation" FOREIGN KEY ("congregationId") REFERENCES "congregations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_congregation_members_congregation" ON "congregation_members" ("congregationId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_congregation_members_user" ON "congregation_members" ("userId")`);

    // groups
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "groups" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "congregationId" uuid NOT NULL,
        "name" varchar(255) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_groups" PRIMARY KEY ("id"),
        CONSTRAINT "FK_groups_congregation" FOREIGN KEY ("congregationId") REFERENCES "congregations"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_groups_congregation" ON "groups" ("congregationId")`);

    // group_members
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "group_members" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "groupId" uuid NOT NULL,
        "groupRole" varchar(50) NOT NULL DEFAULT 'member',
        "joinedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_group_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_group_members_user_group" UNIQUE ("userId", "groupId"),
        CONSTRAINT "FK_group_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_group_members_group" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE
      )
    `);

    // Add publisherId and groupId to territories
    await queryRunner.query(`ALTER TABLE "territories" ADD COLUMN IF NOT EXISTS "publisherId" uuid`);
    await queryRunner.query(`ALTER TABLE "territories" ADD COLUMN IF NOT EXISTS "groupId" uuid`);
    await queryRunner.query(`
      ALTER TABLE "territories"
        ADD CONSTRAINT "FK_territories_publisher"
        FOREIGN KEY ("publisherId") REFERENCES "users"("id") ON DELETE SET NULL
        NOT VALID
    `);
    await queryRunner.query(`
      ALTER TABLE "territories"
        ADD CONSTRAINT "FK_territories_group"
        FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL
        NOT VALID
    `);
    await queryRunner.query(`
      ALTER TABLE "territories"
        ADD CONSTRAINT "CHK_territories_publisher_or_group"
        CHECK ("publisherId" IS NULL OR "groupId" IS NULL)
    `);

    // territory_requests
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "territory_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "congregationId" uuid NOT NULL,
        "publisherId" uuid NOT NULL,
        "territoryId" uuid,
        "status" varchar(20) NOT NULL DEFAULT 'pending',
        "approvedBy" uuid,
        "approvedAt" TIMESTAMP,
        "requestedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_territory_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_territory_requests_congregation" FOREIGN KEY ("congregationId") REFERENCES "congregations"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_territory_requests_publisher" FOREIGN KEY ("publisherId") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_territory_requests_approver" FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_territory_requests_congregation" ON "territory_requests" ("congregationId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_territory_requests_status" ON "territory_requests" ("status")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "territory_requests"`);
    await queryRunner.query(`ALTER TABLE "territories" DROP CONSTRAINT IF EXISTS "CHK_territories_publisher_or_group"`);
    await queryRunner.query(`ALTER TABLE "territories" DROP CONSTRAINT IF EXISTS "FK_territories_group"`);
    await queryRunner.query(`ALTER TABLE "territories" DROP CONSTRAINT IF EXISTS "FK_territories_publisher"`);
    await queryRunner.query(`ALTER TABLE "territories" DROP COLUMN IF EXISTS "groupId"`);
    await queryRunner.query(`ALTER TABLE "territories" DROP COLUMN IF EXISTS "publisherId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "group_members"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "groups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "congregation_members"`);
    await queryRunner.query(`ALTER TABLE "congregations" DROP CONSTRAINT IF EXISTS "FK_congregations_createdById"`);
    await queryRunner.query(`ALTER TABLE "congregations" DROP COLUMN IF EXISTS "createdById"`);
  }
}
