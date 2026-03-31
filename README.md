# Planner - Fullstack Location-Based Planning App

A modern fullstack application built with Next.js 16, TypeORM, and PostGIS for location-based planning and task management.

## Stack

### Frontend
- **Next.js 16** with App Router & Turbopack
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **PWA** manifest for installability

### Backend
- **TypeORM** - ORM for database operations
- **PostgreSQL 17** via Neon
- **PostGIS 3.5** for spatial queries
- **TypeScript migrations** (auto-generated)

### Deployment
- **Vercel** for frontend hosting
- **Neon** for PostgreSQL with branching
- **GitHub Actions** for CI/CD

## Quick Start

### Prerequisites
- Node.js 20+
- pnpm 10+
- Neon account with project

### Setup

1. **Clone repository**
   ```bash
   git clone https://github.com/wacanam/planner.git
   cd planner
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Setup environment**
   ```bash
   cp .env.local.example .env.local
   # Add your Neon DATABASE_URL
   ```

4. **Run migrations**
   ```bash
   pnpm db:migrate
   ```

5. **Start development server**
   ```bash
   pnpm dev
   ```

Visit http://localhost:3000

## Database Migrations

### Auto-Generate from Entities
```bash
# 1. Update entity in src/entities/YourEntity.ts
# 2. Register in cli-data-source.ts
# 3. Generate migration:
pnpm db:generate -- --name YourDescriptiveName

# 4. Run migration:
pnpm db:migrate
```

### Manual Migration
Create `src/migrations/TIMESTAMP-YourMigration.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class YourMigration1774947846042 implements MigrationInterface {
  name = 'YourMigration1774947846042';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE ...`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE ...`);
  }
}
```

Then run: `pnpm db:migrate`

## Available Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm lint` | Run Biome linter |
| `pnpm format` | Format code with Biome |
| `pnpm db:migrate` | Run pending migrations |
| `pnpm db:verify` | Test database connection |
| `pnpm db:generate -- --name Name` | Auto-generate migration |
| `pnpm neon:auth` | Authenticate Neon CLI |

## CI/CD Workflows

### 1. Neon Branch Management (`neon-branch.yml`)

**Triggered on:** PR opened, reopened, synchronized, closed

**What it does:**
- ✅ Creates isolated Neon database branch for each PR
- ✅ Runs migrations on preview database
- ✅ Posts schema diff to PR comment
- ✅ Deletes branch when PR is closed

**Required Secrets/Variables:**
- `NEON_PROJECT_ID` - Your Neon project ID (vars)
- `NEON_API_KEY` - API key for Neon (secrets)

### 2. Build & Test (`build-test.yml`)

**Triggered on:** PR and push to main/develop

**What it does:**
- ✅ Installs dependencies
- ✅ Runs Biome linter
- ✅ Type checks with TypeScript
- ✅ Builds Next.js application

## Project Structure

```
planner/
├── src/
│   ├── app/              # Next.js app directory
│   ├── entities/         # TypeORM entities
│   │   ├── Location.ts
│   │   ├── Zone.ts
│   │   ├── Route.ts
│   │   └── Task.ts
│   ├── migrations/       # TypeORM migrations (.ts)
│   └── lib/
│       └── data-source.ts
├── public/
│   └── manifest.json     # PWA manifest
├── .github/workflows/    # CI/CD workflows
├── biome.json            # Linter config
├── next.config.js        # Next.js config
├── vercel.json           # Vercel config
├── cli-data-source.ts    # TypeORM CLI config
└── MIGRATIONS.md         # Migration guide
```

## Database Schema

### Entities

**Location** - Point geometry
- `id` - UUID primary key
- `name` - Location name
- `description` - Optional details
- `coordinates` - Point (SRID 4326)
- Spatial index on coordinates

**Zone** - Polygon geometry
- `id` - UUID primary key
- `name` - Zone name
- `boundary` - Polygon (SRID 4326)
- `areaSquareKm` - Calculated area
- `status` - active/inactive/archived

**Route** - LineString geometry
- `id` - UUID primary key
- `path` - LineString (SRID 4326)
- `distanceKm` - Calculated distance
- `estimatedMinutes` - ETA
- `status` - planned/in_progress/completed/cancelled

**Task** - Regular table
- `id` - UUID primary key
- `title` - Task name
- `description` - Details
- `status` - pending/in_progress/completed
- `priority` - high/medium/low
- `assignedLocationId` - FK to locations
- `relatedZoneId` - FK to zones
- `dueDate` - Deadline
- `completionPercentage` - 0-100

## Environment Variables

```env
# Database connection string from Neon
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Optional: Custom API URL
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Deployment

### Vercel (Frontend)

Already configured! Every push to `main` automatically deploys.

**Production:** https://planner-wacanam.vercel.app

To add environment variables:
1. Go to https://vercel.com/wacanam/planner/settings
2. Add `DATABASE_URL` environment variable
3. Redeploy

### Neon (Database)

- Project ID: `purple-sound-99622853`
- Branches: `production` (main), `develop`
- PostGIS enabled and ready

## Contributing

1. Create feature branch from `develop`
2. Make changes and commit
3. Push to GitHub
4. Create Pull Request
5. CI/CD will:
   - Create Neon preview branch
   - Run migrations on preview
   - Run linter & type checks
   - Build the app
6. Merge to `develop` when approved
7. Merge to `main` for production release

## License

MIT

## Support

For issues or questions, open a GitHub issue on [wacanam/planner](https://github.com/wacanam/planner/issues)
