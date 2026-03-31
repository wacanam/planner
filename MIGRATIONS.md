# Database Migrations Guide

This project supports **both auto-generated and manual migrations** using TypeORM.

## Workflow: Auto-Generate Migrations ✨

TypeORM can automatically generate migrations by comparing your entity definitions to the database schema.

### Step 1: Define/Update Entity

Create or modify your entity in `src/entities/YourEntity.ts`:

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

Add your entity to `cli-data-source.ts` in the entities array:

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

TypeORM will:
- ✅ Compare current entities to database schema
- ✅ Generate SQL changes automatically
- ✅ Create `src/migrations/TIMESTAMP-YourDescriptiveName.ts`

### Step 4: Convert TypeScript to JavaScript

**Important:** Generated migrations are TypeScript. Convert them:

1. Open the generated `.ts` file and copy the SQL queries
2. Create a `.js` file with the same name
3. Convert to CommonJS format:

```javascript
// Generated: src/migrations/1704069000000-YourMigration.ts
export class YourMigration1704069000000 implements MigrationInterface { ... }

// Convert to JavaScript: src/migrations/1704069000000-YourMigration.js
class YourMigration1704069000000 {
  async up(queryRunner) {
    // ... copy queries here
  }
  async down(queryRunner) {
    // ... copy rollback queries here
  }
}
module.exports = { YourMigration1704069000000 };
```

4. Delete the `.ts` file
5. Run migration: `pnpm db:migrate`

## Workflow: Manual Migration

If auto-generation doesn't work or you need custom SQL:

### 1. Create Entity

`src/entities/YourEntity.ts` - same as above

### 2. Register Entity

Add to `cli-data-source.ts` entities array

### 3. Create Migration (JavaScript)

`src/migrations/1704069000000-CreateYourEntityTable.js`:

```javascript
const { MigrationInterface, QueryRunner } = require('typeorm');

class CreateYourEntityTable1704069000000 {
  async up(queryRunner) {
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

  async down(queryRunner) {
    await queryRunner.query('DROP TABLE IF EXISTS "your_entities" CASCADE');
  }
}

module.exports = { CreateYourEntityTable1704069000000 };
```

### 4. Run Migration

```bash
pnpm db:migrate
```

## Available Commands

```bash
# Auto-generate migration from entity changes
pnpm db:generate -- --name MigrationName

# Create empty migration template
pnpm db:create src/migrations/MigrationName

# Run all migrations
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
├── migrations/         ← JavaScript migration files ONLY
│   ├── 1704067200000-InitialSetup.js
│   ├── 1704068400000-CreateTasksTable.js
│   └── 1774947522635-InitialMigration.js
└── lib/
    └── cli-data-source.ts  ← TypeORM config for migrations
```

## Workaround: Using tsx + TypeORM CLI

The project uses **tsx** (TypeScript executor) to run TypeORM CLI commands without compilation:

```bash
# Under the hood, pnpm db:generate runs:
tsx ./node_modules/typeorm/cli.js migration:generate src/migrations/YourMigration -d cli-data-source.ts
```

This bypasses Next.js build issues and works directly with TypeScript entities.

## Migration Best Practices

✅ **Do:**
- Define entities in TypeScript (`.ts`)
- Keep migration files in JavaScript (`.js`)
- Use `IF NOT EXISTS` for idempotent migrations
- Test migrations before pushing to main
- Include both `up()` and `down()` methods
- Use descriptive migration names

❌ **Don't:**
- Use TypeScript migrations in the codebase
- Forget to register entities in `cli-data-source.ts`
- Create migrations without corresponding entities
- Edit existing migrations (create new ones instead)
- Hardcode values without PostGIS syntax considerations

## Troubleshooting

**Error: "Cannot find module 'cli-data-source'"**
- Verify `cli-data-source.ts` exists in project root
- Check all entity imports are correct

**Error: "TypeORM generates TypeScript not JavaScript"**
- This is expected! Follow Step 4 to convert to JavaScript
- Always keep `.js` files in src/migrations/

**Spatial indexes missing**
- Use GiST indexes for PostGIS geometry
- Example: `CREATE INDEX idx_name ON table USING GiST (column)`
