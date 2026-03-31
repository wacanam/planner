# Database Migrations Guide

This project uses **TypeORM auto-generated migrations** in TypeScript (`.ts`).

## Why TypeScript Migrations?

- ✅ Full type safety
- ✅ Direct execution via `tsx` (no compilation needed)
- ✅ Consistency with entities and config (all `.ts`)
- ✅ No manual conversion step
- ✅ Seamless with Next.js and modern tooling

## Simple Workflow

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

### Step 2: Register Entity in CLI Config

Add to `cli-data-source.ts`:

```typescript
import { YourEntity } from './src/entities/YourEntity';

export const CliDataSource = new DataSource({
  // ... other config
  entities: [Location, Zone, Route, Task, YourEntity], // ← Add here
});
```

### Step 3: Auto-Generate Migration

```bash
pnpm db:generate -- --name YourDescriptiveName
```

✅ Creates `src/migrations/TIMESTAMP-YourDescriptiveName.ts` with full SQL

### Step 4: Run Migration

```bash
pnpm db:migrate
```

**That's it!** No conversion, no manual SQL needed.

## TypeORM Auto-Generated Example

```typescript
// src/migrations/1774947846041-InitialMigration.ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1774947846041 implements MigrationInterface {
    name = 'InitialMigration1774947846041'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // SQL queries auto-generated from your entities
        await queryRunner.query(`...`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Rollback queries
        await queryRunner.query(`...`);
    }
}
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
├── entities/           ← TypeScript entity definitions
│   ├── Location.ts
│   ├── Zone.ts
│   ├── Route.ts
│   └── Task.ts
└── migrations/         ← TypeScript migrations (auto-generated)
    └── 1774947846041-InitialMigration.ts
```

## How It Works

1. **Entity Comparison:** TypeORM compares your `.ts` entities to the database
2. **SQL Generation:** Automatically generates `up()` and `down()` methods
3. **Direct Execution:** `tsx` runs `.ts` files directly without compilation
4. **TypeORM Runner:** `run-migrations.ts` uses TypeORM's `runMigrations()` API

## Best Practices

✅ **Do:**
- Let TypeORM generate migrations from entities
- Always define `down()` for rollback
- Test migrations in develop branch
- Register all entities in `cli-data-source.ts`
- Keep entities and migrations in sync

❌ **Don't:**
- Manually edit generated migrations (delete and regenerate)
- Create migrations without corresponding entities
- Forget to run migrations before deploying

## Troubleshooting

**Error: "Cannot find module..."**
- Ensure `cli-data-source.ts` exists in project root
- Check all entity imports in `cli-data-source.ts`

**Error: "No migrations are pending"**
- TypeORM found no changes between entities and database
- Make sure you've registered new entities in `cli-data-source.ts`

**Spatial indexes not created**
- Use geometry columns (PostGIS) in entities
- TypeORM auto-creates GiST indexes for spatial columns
