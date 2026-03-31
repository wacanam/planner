# Planner

A fullstack planner application built with modern web technologies.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** PostgreSQL with PostGIS via [Neon DB](https://neon.tech)
- **ORM:** TypeORM
- **PWA:** next-pwa
- **Package Manager:** PNPM
- **Styling:** Tailwind CSS
- **Language:** TypeScript

## Getting Started

### 1. Clone & Install

```bash
pnpm install
```

### 2. Configure Environment

Copy the example env file and fill in your Neon DB connection string:

```bash
cp .env.example .env.local
```

Update `DATABASE_URL` with your Neon DB connection string (found in the Neon dashboard).

### 3. Enable PostGIS on Neon DB

In your Neon DB SQL editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 4. Run Migrations

```bash
pnpm typeorm migration:run -d src/lib/data-source.ts
```

### 5. Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
src/
├── app/          # Next.js App Router pages
├── lib/
│   └── data-source.ts  # TypeORM DataSource config
├── entities/     # TypeORM entities
└── migrations/   # TypeORM migrations
public/
└── manifest.json # PWA manifest
```

## PWA

PWA is enabled in production builds via `next-pwa`. Add icons to `public/icons/` (192x192 and 512x512 PNG).
