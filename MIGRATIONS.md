# Database Migrations Guide

This project uses **JavaScript migrations** (`.js` files) for reliability and simplicity with TypeORM.

## Why .js Not .ts?

- ✅ No TypeScript compilation issues
- ✅ Direct execution without ts-node complexity
- ✅ Stable and reliable
- ✅ Works seamlessly with Neon PostgreSQL

## Creating New Migrations

When you need to create a new migration, follow this pattern:

### 1. Create Entity (TypeScript)

`src/entities/YourEntity.ts`:
```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('your_entities')
export class YourEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;
}
```

### 2. Create Migration (JavaScript)

`src/migrations/1704069000000-CreateYourEntityTable.js`:
```javascript
const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateYourEntityTable1704069000000 {
  async up(queryRunner) {
    // Create table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "your_entities" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes if needed
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_your_entities_name ON "your_entities" ("name")'
    );
  }

  async down(queryRunner) {
    // Rollback: drop table
    await queryRunner.query('DROP TABLE IF EXISTS "your_entities" CASCADE');
  }
}

module.exports = { CreateYourEntityTable1704069000000 };
```

## Running Migrations

Use the migration runner script:

```bash
pnpm exec ts-node run-migrations.ts
```

This script:
1. Connects to Neon PostgreSQL
2. Discovers all `.js` migrations in `src/migrations/`
3. Executes them in order
4. Reports success or warnings

## Migration Naming Convention

Use timestamps for ordering:
```
1704067200000-InitialSetup.js
1704068400000-CreateTasksTable.js
1704069000000-AddNewFeature.js
```

Format: `TIMESTAMP-DescriptiveAction.js`

## File Structure

```
src/migrations/
├── 1704067200000-InitialSetup.js           ✓ PostGIS + base tables
├── 1704068400000-CreateTasksTable.js       ✓ Tasks table
└── 1704069000000-YourNewMigration.js       ← Add here
```

## Testing Migrations

After creating a migration, test it:

```bash
# Run migrations
pnpm exec ts-node run-migrations.ts

# Verify the database
pnpm db:verify
```

## Important Notes

- ✅ Always create **both** entity (`.ts`) AND migration (`.js`)
- ✅ Keep entities and migrations in sync
- ✅ Use `IF NOT EXISTS` in DDL to make migrations idempotent
- ✅ Test migrations in develop branch before merging
- ✅ Never edit existing migrations - create new ones for changes
