# Ministry Planner

Ministry Planner is a mobile-first, offline-first web app for congregation territory assignments, household records, visits, and encounters. The MVP uses Firebase Firestore persistence.

## Tech Stack

- Next.js 16, React 19, TypeScript, App Router
- Tailwind CSS 4 with Shadcn/Radix UI primitives
- Firebase Firestore with persistent local cache and multi-tab support
- Firebase Authentication with email/password and Google sign-in
- Google Maps territory and household map surfaces with marker clustering
- Service worker for installability and app-shell caching

## MVP Features

- My Assignments: view assigned territories, open territory maps, manage households, and log visits or encounters offline.
- Records: review household, visit, and encounter history from Firestore-backed local cache.
- Territories: create territories, assign/return work, review requests, and edit territory boundaries.
- Offline status: a small top banner appears when connectivity drops while normal operations continue locally.

## Quick Start

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Configure `.env.local`:

   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=replace-me
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=replace-me
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=replace-me
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=replace-me
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=replace-me
   NEXT_PUBLIC_FIREBASE_APP_ID=replace-me
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=replace-me
   ```

   Enable Email/Password and Google providers in Firebase Authentication for local sign-in flows.
   Enable Maps JavaScript API in Google Cloud for territory boundaries, household pins, popups, and clustering.

3. Start the dev server:

   ```bash
   pnpm dev
   ```

Visit [http://localhost:3000](http://localhost:3000).

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the development server |
| `pnpm build` | Build the production app |
| `pnpm start` | Run the production server |
| `pnpm lint` | Run Biome linting |
| `pnpm format` | Format the repository |
| `pnpm test` | Run Vitest tests |

## Firestore Schema

The app schema is documented in [FIREBASE-FIRESTORE-SCHEMA.md](FIREBASE-FIRESTORE-SCHEMA.md). Core MVP collections include `users`, `congregations`, `congregationMembers`, `groups`, `territories`, `territoryRequests`, `assignments`, `households`, `visits`, `encounters`, and `notifications`.

## Validation

Run the full local validation pass before shipping changes:

```bash
pnpm lint && pnpm build && pnpm test
```
