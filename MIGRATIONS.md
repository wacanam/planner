# Database Migrations Guide

This project uses **TypeORM migrations in TypeScript** (`.ts`).

## Why TypeScript Migrations?

- ✅ Full type safety
- ✅ Direct execution via `tsx` (no compilation needed)
- ✅ Consistency with entities and config (all `.ts`)
- ✅ Better IDE support and autocomplete
- ✅ Seamless with Next.js

## Workflow 1: Auto-Generated Migrations ⚡

### Step 1: Create/Update Entity

`src/entities/YourEntity.ts`:

```typescript
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('your_entities')
export class YourEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;
}
```

### Step 2: Register Entity

Add to `cli-data-source.ts`:

```typescript
import { YourEntity } from './src/entities/YourEntity';

export const CliDataSource = new DataSource({
  entities: [Location, Zone, Route, Task, YourEntity], // ← Add here
});
```

### Step 3: Generate Migration

```bash
pnpm db:generate -- --name YourDescriptiveName
```

✅ Creates `src/migrations/TIMESTAMP-YourDescriptiveName.ts`

### Step 4: Run Migration

```bash
pnpm db:migrate
```

## Workflow 2: Manual Migrations 🛠️

For custom SQL or complex changes:

### Step 1: Create Entity (if needed)

`src/entities/YourEntity.ts` - same as above

### Step 2: Register Entity (if needed)

Add to `cli-data-source.ts`

### Step 3: Create Migration Manually

`src/migrations/1774947846042-CreateYourEntityTable.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateYourEntityTable1774947846042 implements MigrationInterface {
  name = 'CreateYourEntityTable1774947846042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "your_entities" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "name" varchar(255) NOT NULL,
        "description" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_your_entities_name ON "your_entities" ("name")'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "your_entities" CASCADE');
  }
}
```

### Step 4: Run Migration

```bash
pnpm db:migrate
```

## Available Commands

```bash
# Auto-generate migration from entity changes
pnpm db:generate -- --name MigrationName

# Run all pending migrations
pnpm db:migrate

# Test database connection
pnpm db:verify
```

## File Structure

```
src/
├── entities/           ← TypeScript entities
│   ├── Location.ts
│   ├── Zone.ts
│   ├── Route.ts
│   └── Task.ts
└── migrations/         ← TypeScript migrations (auto or manual)
    └── 1774947846041-InitialMigration.ts
    └── 1774947846042-CreateYourEntityTable.ts (manual example)
```

## How It Works

1. **Entity → SQL:** TypeORM compares `.ts` entities to database
2. **Auto Generation:** Creates `up()` and `down()` methods automatically
3. **Direct Execution:** `tsx` runs `.ts` files directly
4. **TypeORM Runner:** `run-migrations.ts` calls `runMigrations()` API

## Best Practices

✅ **Do:**
- Use auto-generate for entity changes (fastest)
- Use manual for custom SQL (control)
- Always define `down()` for rollback
- Register all entities in `cli-data-source.ts`
- Test migrations in develop branch
- Keep migrations in sync with entities

❌ **Don't:**
- Edit generated migrations (delete and regenerate)
- Create migrations without entities
- Forget the `name` property
- Skip testing before merging

## TypeScript Migration Template

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class YourMigrationName1774947846042 implements MigrationInterface {
  name = 'YourMigrationName1774947846042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add your SQL queries here
    await queryRunner.query(`...`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add rollback queries here
    await queryRunner.query(`...`);
  }
}
```

## Troubleshooting

**Error: "Cannot find module..."**
- Check `cli-data-source.ts` exists in project root
- Verify all entity imports are correct

**Error: "No migrations are pending"**
- TypeORM found no differences between entities and database
- Check if you registered new entities in `cli-data-source.ts`

**Spatial indexes missing**
- Use PostGIS geometry columns in entities
- TypeORM auto-creates GiST indexes for spatial data
