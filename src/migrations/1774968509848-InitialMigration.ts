import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1774968509848 implements MigrationInterface {
  name = 'InitialMigration1774968509848';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "congregations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "slug" character varying(255) NOT NULL, "city" character varying(255), "country" character varying(100), "status" character varying(50) NOT NULL DEFAULT 'active', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_f56c0ab233efcd022a62387999b" UNIQUE ("slug"), CONSTRAINT "PK_f8d59734333e7f735ba8d6bff90" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "role" character varying(50) NOT NULL DEFAULT 'USER', "congregationId" uuid, "isActive" boolean NOT NULL DEFAULT true, "lastLoginAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "territories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "number" character varying(50) NOT NULL, "name" character varying(255) NOT NULL, "notes" text, "status" character varying(50) NOT NULL DEFAULT 'available', "householdsCount" integer NOT NULL DEFAULT '0', "coveragePercent" numeric(5,2) NOT NULL DEFAULT '0', "boundary" text, "congregationId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_5fd98f342e49509ee461d86f54f" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "territory_assignments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "territoryId" uuid NOT NULL, "userId" uuid, "serviceGroupId" uuid, "status" character varying(50) NOT NULL DEFAULT 'active', "assignedAt" TIMESTAMP, "dueAt" TIMESTAMP, "returnedAt" TIMESTAMP, "coverageAtAssignment" numeric(5,2) NOT NULL DEFAULT '0', "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9563ecc3c4ce7c84b8778544ed8" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "service_groups" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(255) NOT NULL, "description" text, "congregationId" uuid NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_c541600efebc3f4fefd3d082ef3" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE TABLE "territory_rotations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "territoryId" uuid NOT NULL, "assignedUserId" uuid, "status" character varying(50) NOT NULL DEFAULT 'active', "startDate" TIMESTAMP NOT NULL, "completedDate" TIMESTAMP, "coverageAchieved" numeric(5,2) NOT NULL DEFAULT '0', "visitsMade" integer NOT NULL DEFAULT '0', "notes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e19ceba3ca50a8df78a859ac984" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_d883ed317f0dc1c1ce32fa1745d" FOREIGN KEY ("congregationId") REFERENCES "congregations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "territories" ADD CONSTRAINT "FK_a3bc6f1a820ec74cc23b8ada07b" FOREIGN KEY ("congregationId") REFERENCES "congregations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "territory_assignments" ADD CONSTRAINT "FK_381955bedd166998731dbd8919d" FOREIGN KEY ("territoryId") REFERENCES "territories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "territory_assignments" ADD CONSTRAINT "FK_fafe00766224ce4a371589d465f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "territory_assignments" ADD CONSTRAINT "FK_3faf3700f0b2ff8f47da337ee18" FOREIGN KEY ("serviceGroupId") REFERENCES "service_groups"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "service_groups" ADD CONSTRAINT "FK_99b16434406add09c918c703451" FOREIGN KEY ("congregationId") REFERENCES "congregations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "territory_rotations" ADD CONSTRAINT "FK_eec8799503ac8b80eaa2b409005" FOREIGN KEY ("territoryId") REFERENCES "territories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "territory_rotations" ADD CONSTRAINT "FK_c73d85845d4a2d196e6e0ebb7c0" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "territory_rotations" DROP CONSTRAINT "FK_c73d85845d4a2d196e6e0ebb7c0"`
    );
    await queryRunner.query(
      `ALTER TABLE "territory_rotations" DROP CONSTRAINT "FK_eec8799503ac8b80eaa2b409005"`
    );
    await queryRunner.query(
      `ALTER TABLE "service_groups" DROP CONSTRAINT "FK_99b16434406add09c918c703451"`
    );
    await queryRunner.query(
      `ALTER TABLE "territory_assignments" DROP CONSTRAINT "FK_3faf3700f0b2ff8f47da337ee18"`
    );
    await queryRunner.query(
      `ALTER TABLE "territory_assignments" DROP CONSTRAINT "FK_fafe00766224ce4a371589d465f"`
    );
    await queryRunner.query(
      `ALTER TABLE "territory_assignments" DROP CONSTRAINT "FK_381955bedd166998731dbd8919d"`
    );
    await queryRunner.query(
      `ALTER TABLE "territories" DROP CONSTRAINT "FK_a3bc6f1a820ec74cc23b8ada07b"`
    );
    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_d883ed317f0dc1c1ce32fa1745d"`);
    await queryRunner.query(`DROP TABLE "territory_rotations"`);
    await queryRunner.query(`DROP TABLE "service_groups"`);
    await queryRunner.query(`DROP TABLE "territory_assignments"`);
    await queryRunner.query(`DROP TABLE "territories"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "congregations"`);
  }
}
