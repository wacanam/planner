# Ministry Planner - Congregation Territory Management System

A modern, **offline-first** web application for managing congregation territories, tracking household visits, and ensuring full ministry coverage. Built for Jehovah's Witnesses congregations and ministry servants.

## 🙏 Purpose

Ministry Planner helps congregations organize and manage house-to-house ministry work by:

- **Territory Management** - Create, divide, and assign congregation territories
- **Household Records** - Track families, visit history, and preferences
- **Visit Logging** - Record encounters and follow-ups offline
- **Coverage Tracking** - Monitor territory coverage and activity
- **Offline-First** - Work without internet, sync automatically when online
- **RBAC Access Control** - Role-based permissions for different user types

Perfect for Service Overseers managing territories and Territory Servants doing field work.

## ⚙️ Tech Stack

### Frontend
- **Next.js 16** with App Router & Turbopack
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **Leaflet** for offline-capable mapping
- **Service Worker** + **IndexedDB** for offline functionality

### Backend
- **Node.js** with TypeORM
- **PostgreSQL 17** via Neon
- **PostGIS 3.5** for spatial data (territories, households)
- **TypeScript migrations** (auto-generated)
- **JWT** authentication with RBAC

### Deployment
- **Vercel** for frontend hosting
- **Neon** for PostgreSQL with branching
- **GitHub Actions** for CI/CD

## 👥 User Roles

| Role | Purpose | Capabilities |
|------|---------|--------------|
| **Super Admin** | System management | Manage all users, congregations, system config |
| **Admin** | Congregation oversight | Manage users, territories, view all reports |
| **Service Overseer** | Ministry supervision | Create/assign territories, manage servants, view coverage |
| **Territory Servant** | Field work helper | Access assigned territories, log visits (offline or online) |
| **User** | Limited access | TBD - future role for additional access levels |

## 🎯 Key Features

### For Territory Servants (Field Workers)
✅ View assigned territories (works offline)
✅ See all households in territory with map pins
✅ Log visits and encounters (queued offline, syncs online)
✅ Track household status and notes
✅ Offline map navigation with cached tiles
✅ Print territory maps (S-12 format)

### For Service Overseers
✅ Create and draw territories on map
✅ Assign territories to individuals or groups
✅ Manage territory rotations
✅ Monitor coverage % by territory
✅ View activity dashboards
✅ Track group performance metrics
✅ Generate reports (coverage, activity, LPW assessments)

### For Admins
✅ Manage users and roles
✅ Manage congregations
✅ Generate system reports
✅ Monitor application health

### System Features
✅ **Offline-First** - Works completely offline, syncs when connected
✅ **Real-Time Sync** - Automatic background sync when online
✅ **Conflict Resolution** - Handles edits on same record gracefully
✅ **RBAC** - Role-based access control on all features
✅ **Mobile-Friendly** - Works on tablets, phones, desktops
✅ **PWA** - Can be installed as app on devices
✅ **PostGIS Integration** - Spatial queries for territories and households

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- pnpm 10+
- Neon account with PostgreSQL database
- Git for version control

### Installation

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
   # Edit .env.local and add your Neon DATABASE_URL
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

## 📝 Available Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start dev server (http://localhost:3000) |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm lint` | Run Biome linter |
| `pnpm format` | Format code with Biome |
| `pnpm db:migrate` | Run pending database migrations |
| `pnpm db:verify` | Test database connection |
| `pnpm db:generate -- --name Name` | Auto-generate migration from entities |
| `pnpm neon:auth` | Authenticate with Neon CLI |

## 🗂️ Project Structure

```
planner/
├── src/
│   ├── app/                 # Next.js app directory
│   │   ├── api/            # API routes
│   │   │   ├── auth/
│   │   │   ├── territories/
│   │   │   ├── households/
│   │   │   ├── visits/
│   │   │   └── sync/
│   │   ├── layout.tsx      # Root layout with Service Worker
│   │   ├── page.tsx        # Home page
│   │   └── globals.css
│   ├── entities/           # TypeORM entities (User, Territory, Household, etc.)
│   ├── migrations/         # TypeORM migrations (auto-generated .ts)
│   ├── lib/               # Utilities
│   │   ├── data-source.ts # TypeORM config
│   │   ├── auth.ts        # JWT, password hashing
│   │   ├── rbac.ts        # Permission checking
│   │   └── indexeddb.ts   # IndexedDB wrapper
│   └── components/        # React components
├── public/
│   ├── sw.js             # Service Worker
│   └── manifest.json     # PWA manifest
├── .github/workflows/    # CI/CD (build-test.yml, neon-branch.yml)
├── biome.json           # Linter/formatter config
├── next.config.js       # Next.js config (Turbopack)
├── vercel.json          # Vercel deployment config
├── cli-data-source.ts   # TypeORM CLI config
├── IMPLEMENTATION-PLAN.md # Detailed 6-phase implementation plan
└── README.md            # This file
```

## 🏗️ Database Schema Overview

### Core Entities
- **User** - Auth & roles (RBAC)
- **Congregation** - Organization unit
- **Territory** - Polygon areas with households
- **TerritoryAssignment** - Assigns territories to users/groups
- **ServiceGroup** - Groups of ministry servants
- **Household** - Family records with locations
- **Visit** - Visit events (offline-syncable)
- **Encounter** - Conversation/interaction records
- **TerritoryRotation** - Track territory reassignments
- **OfflineSyncQueue** - Queue for syncing offline changes

All spatial data (territories, households) use PostGIS for queries.

## 🔐 Authentication & RBAC

### Login Flow
1. User enters email/password
2. System verifies credentials
3. JWT token issued (+ offline session cache)
4. User can work offline with cached data
5. On reconnect, any offline changes sync automatically

### Permission Checking
Every API endpoint enforces:
- ✅ Valid JWT token required
- ✅ Role matches required permission
- ✅ Data access scoped to user's congregation/territory

Use `@RequireRole()` decorator on API routes to enforce permissions.

## 📱 Offline & Sync Strategy

### Offline Capabilities
- Full access to assigned territories (map + households)
- Log visits and encounters
- All data cached locally in IndexedDB
- Map tiles cached for offline navigation

### Sync Strategy
1. **Offline Queuing** - Changes stored in `OfflineSyncQueue`
2. **Connectivity Detection** - App detects when online
3. **Automatic Sync** - Queued changes sent to server
4. **Conflict Resolution** - Server detects conflicts, client resolves
5. **Pull Updates** - Latest server data synced to local storage

See `IMPLEMENTATION-PLAN.md` for detailed sync flow.

## 🗺️ Mapping & PostGIS

### Territory Mapping
- Territories are Polygon geometries stored in PostGIS
- Service Overseers can draw territories on map
- Print territories in S-12 format

### Household Locations
- Households are Point geometries
- Show as markers on territory map
- Color-coded by status (interested, not interested, etc.)
- Click to view details

### Offline Maps
- Map tiles cached via Service Worker
- Leaflet for map library
- Works offline with cached tiles

## 📊 Reports & Analytics

Service Overseers can generate:
- **Coverage Reports** - % of households visited by territory
- **Activity Dashboards** - Visits per week/month by user/group
- **LPW Assessments** - Notes and findings for local needs
- **Export Data** - CSV/PDF for external use

## 🔄 CI/CD Workflow

### GitHub Actions Workflows

**neon-branch.yml** - Creates preview databases for PRs
- On PR open: Creates Neon preview branch
- Runs migrations on preview
- Posts schema diff comment
- On PR close: Deletes preview branch

**build-test.yml** - Linting, type checks, builds
- Runs Biome linter
- Type checks with TypeScript
- Builds Next.js app
- All must pass before merge

### PR Workflow
1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes
3. Commit: `git commit -m "Feature: description"`
4. Push: `git push origin feature/my-feature`
5. Open PR to `develop`
6. CI/CD runs automatically
7. PR Reviewer checks code
8. Merge when approved
9. Automatic deployment to Vercel

## 🛠️ Development

### Creating Entities

1. Create TypeScript entity file in `src/entities/`
   ```typescript
   import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

   @Entity('your_entities')
   export class YourEntity {
     @PrimaryGeneratedColumn('uuid')
     id!: string;

     @Column()
     name!: string;
   }
   ```

2. Register in `cli-data-source.ts`:
   ```typescript
   entities: [YourEntity, ...otherEntities]
   ```

3. Auto-generate migration:
   ```bash
   pnpm db:generate -- --name CreateYourEntityTable
   ```

4. Run migration:
   ```bash
   pnpm db:migrate
   ```

### Creating API Routes

1. Create file in `src/app/api/` (e.g., `src/app/api/your-resource/route.ts`)
2. Implement handlers: `GET`, `POST`, `PUT`, `DELETE`
3. Use `@RequireRole()` for RBAC
4. Return JSON responses

Example:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { RequireRole } from '@/lib/rbac';

@RequireRole('SERVICE_OVERSEER', 'ADMIN')
export async function GET(req: NextRequest) {
  // Your logic
  return NextResponse.json({ data: [] });
}
```

## 📖 Documentation

- **IMPLEMENTATION-PLAN.md** - Complete 6-phase implementation roadmap
- **MIGRATIONS.md** - How to create and run migrations
- **CI-CD-SETUP.md** - GitHub Actions & Neon workflow
- **README.md** - This file

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes, format, lint
4. Commit with clear messages
5. Push and open PR
6. Wait for CI/CD and review
7. Merge when approved

## 🚢 Deployment

### Production Deployment
- Frontend automatically deploys to Vercel on `main` branch push
- Database migrations run before app starts
- Environment variables set in Vercel dashboard
- Monitoring & alerting configured

### Vercel Environment Variables
Add these in Vercel project settings:
- `DATABASE_URL` - Neon production connection string
- (Other env vars as needed)

## 📝 License

MIT

## 🙏 Support

For issues, feature requests, or questions:
1. Check existing issues on GitHub
2. Open new issue with detailed description
3. Include steps to reproduce for bugs
4. Follow project contribution guidelines

---

**Status:** 🚧 In Development (Phase 1: Auth & RBAC)  
**Last Updated:** 2026-03-31  
**Current Phase:** Foundation & Infrastructure (User Auth, RBAC, Service Worker, IndexedDB)
