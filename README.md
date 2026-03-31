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

### 2. Create Neon Project

1. Go to [neon.tech](https://neon.tech) and create a new project
2. Note your connection string from the Connect dialog

### 3. Configure Environment

Copy the template and add your Neon connection string:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and replace the `DATABASE_URL` with your Neon connection string.

### 4. Enable PostGIS Extension

In your Neon dashboard SQL editor, run:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 5. Verify Connection (Optional)

Test your connection with:

```bash
pnpm ts-node verify-connection.ts
```

You should see:
```
✅ Data Source has been initialized successfully.
✅ Successfully connected to Neon!
PostgreSQL version: PostgreSQL 16.x
PostGIS version: 3.x.x
```

### 6. Run Migrations

Initialize your database schema with the sample entities:

```bash
pnpm typeorm migration:run -d src/lib/data-source.ts
```

This will create tables for `locations`, `zones`, and `routes` with PostGIS geometry support.

### 7. Start Development Server

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
