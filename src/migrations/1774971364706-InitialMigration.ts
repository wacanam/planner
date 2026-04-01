import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1774971364706 implements MigrationInterface {
    name = 'InitialMigration1774971364706'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "encounters" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "visitId" uuid, "householdId" uuid NOT NULL, "userId" uuid NOT NULL, "type" character varying(50) NOT NULL, "description" text NOT NULL, "personSpoken" character varying(255), "date" TIMESTAMP NOT NULL DEFAULT now(), "duration" integer, "followUp" boolean NOT NULL DEFAULT false, "followUpDate" TIMESTAMP, "followUpNotes" text, "syncedAt" TIMESTAMP, "offlineCreated" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b2e596be58aabc4ccc8f8458b53" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_encounters_household" ON "encounters" ("householdId") `);
        await queryRunner.query(`CREATE TABLE "visits" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "householdId" uuid NOT NULL, "assignmentId" uuid NOT NULL, "householdStatusBefore" character varying(50), "householdStatusAfter" character varying(50), "visitDate" TIMESTAMP NOT NULL DEFAULT now(), "duration" integer, "visitedByIds" uuid array NOT NULL, "outcome" character varying(50), "literatureGiven" text array, "returnVisitPlanned" boolean NOT NULL DEFAULT false, "nextVisitDate" TIMESTAMP, "notes" text, "syncedAt" TIMESTAMP, "syncStatus" character varying(50) NOT NULL DEFAULT 'PENDING', "offlineCreated" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0b0b322289a41015c6ea4e8bf30" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_visits_visit_date" ON "visits" ("visitDate") `);
        await queryRunner.query(`CREATE INDEX "idx_visits_assignment" ON "visits" ("assignmentId") `);
        await queryRunner.query(`CREATE INDEX "idx_visits_household" ON "visits" ("householdId") `);
        await queryRunner.query(`CREATE TABLE "households" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "congregationId" uuid NOT NULL, "territoryId" uuid NOT NULL, "address" character varying(255) NOT NULL, "houseNumber" character varying(50), "streetName" character varying(255) NOT NULL, "city" character varying(255) NOT NULL, "postalCode" character varying(20), "location" geometry(Point,4326) NOT NULL, "occupantsNames" text array, "occupantsCount" integer, "ageRange" character varying(100), "specialNeeds" text, "status" character varying(50) NOT NULL DEFAULT 'NEW', "lastVisitDate" TIMESTAMP, "lastVisitNotes" text, "preferredLiterature" text array, "languagePreference" character varying(50), "doNotDisturb" boolean NOT NULL DEFAULT false, "bestTimeToCall" character varying(100), "notes" text, "lwpNotes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "createdByUserId" uuid, "updatedByUserId" uuid, "createdById" uuid, "updatedById" uuid, CONSTRAINT "PK_2b1aef2640717132e9231aac756" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_households_location" ON "households" USING GiST ("location") `);
        await queryRunner.query(`CREATE INDEX "idx_households_territory" ON "households" ("territoryId") `);
        await queryRunner.query(`CREATE TABLE "offline_sync_queue" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "entityType" character varying(50) NOT NULL, "entityId" uuid NOT NULL, "operation" character varying(50) NOT NULL, "data" jsonb NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "status" character varying(50) NOT NULL DEFAULT 'PENDING', "syncedAt" TIMESTAMP, "error" text, "retryCount" integer NOT NULL DEFAULT '0', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_40d6a4ca8795a28bf1e71cdea6a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_sync_queue_status" ON "offline_sync_queue" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_sync_queue_user" ON "offline_sync_queue" ("userId") `);
        await queryRunner.query(`ALTER TABLE "encounters" ADD CONSTRAINT "FK_f90c00a3817b63ed58717f0b9d3" FOREIGN KEY ("visitId") REFERENCES "visits"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "encounters" ADD CONSTRAINT "FK_eaa96168a617659edc26d7cba45" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "encounters" ADD CONSTRAINT "FK_eb1ada7afd9245678a12522f466" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "visits" ADD CONSTRAINT "FK_59a45a5a62dc601ee0571a5c9fe" FOREIGN KEY ("householdId") REFERENCES "households"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "visits" ADD CONSTRAINT "FK_0d4c45e5c1dd0208b4828dad3fa" FOREIGN KEY ("assignmentId") REFERENCES "territory_assignments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "households" ADD CONSTRAINT "FK_9302a3aaad7dd9e0d6264a647e3" FOREIGN KEY ("congregationId") REFERENCES "congregations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "households" ADD CONSTRAINT "FK_863dcc419dd99906076069b549a" FOREIGN KEY ("territoryId") REFERENCES "territories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "households" ADD CONSTRAINT "FK_a72d34e52474956c28cdbfcd8e6" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "households" ADD CONSTRAINT "FK_fb77aecba88dd96daaca1caebaa" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "offline_sync_queue" ADD CONSTRAINT "FK_8e1d163b209dda1479e6f32f608" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "offline_sync_queue" DROP CONSTRAINT "FK_8e1d163b209dda1479e6f32f608"`);
        await queryRunner.query(`ALTER TABLE "households" DROP CONSTRAINT "FK_fb77aecba88dd96daaca1caebaa"`);
        await queryRunner.query(`ALTER TABLE "households" DROP CONSTRAINT "FK_a72d34e52474956c28cdbfcd8e6"`);
        await queryRunner.query(`ALTER TABLE "households" DROP CONSTRAINT "FK_863dcc419dd99906076069b549a"`);
        await queryRunner.query(`ALTER TABLE "households" DROP CONSTRAINT "FK_9302a3aaad7dd9e0d6264a647e3"`);
        await queryRunner.query(`ALTER TABLE "visits" DROP CONSTRAINT "FK_0d4c45e5c1dd0208b4828dad3fa"`);
        await queryRunner.query(`ALTER TABLE "visits" DROP CONSTRAINT "FK_59a45a5a62dc601ee0571a5c9fe"`);
        await queryRunner.query(`ALTER TABLE "encounters" DROP CONSTRAINT "FK_eb1ada7afd9245678a12522f466"`);
        await queryRunner.query(`ALTER TABLE "encounters" DROP CONSTRAINT "FK_eaa96168a617659edc26d7cba45"`);
        await queryRunner.query(`ALTER TABLE "encounters" DROP CONSTRAINT "FK_f90c00a3817b63ed58717f0b9d3"`);
        await queryRunner.query(`DROP INDEX "public"."idx_sync_queue_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_sync_queue_status"`);
        await queryRunner.query(`DROP TABLE "offline_sync_queue"`);
        await queryRunner.query(`DROP INDEX "public"."idx_households_territory"`);
        await queryRunner.query(`DROP INDEX "public"."idx_households_location"`);
        await queryRunner.query(`DROP TABLE "households"`);
        await queryRunner.query(`DROP INDEX "public"."idx_visits_household"`);
        await queryRunner.query(`DROP INDEX "public"."idx_visits_assignment"`);
        await queryRunner.query(`DROP INDEX "public"."idx_visits_visit_date"`);
        await queryRunner.query(`DROP TABLE "visits"`);
        await queryRunner.query(`DROP INDEX "public"."idx_encounters_household"`);
        await queryRunner.query(`DROP TABLE "encounters"`);
    }

}
