# Firestore MVP Implementation Plan

## Current Direction

Firebase Firestore is now the local-first data source for the MVP features: My Assignments, Records, and Territories.

## Data Layer

- Firestore client setup lives in `src/lib/firebase/client.ts`.
- Firebase Auth session and sign-in helpers live in `src/lib/firebase/auth.tsx`.
- Collection names and shared ID/time helpers live in `src/lib/firebase/schema.ts`.
- MVP local-first compatibility modules live in `src/lib/local-first/`.
- Hooks consume Firestore snapshots with metadata changes so pending local writes can be surfaced without a custom sync queue.

## MVP Screens

- My Assignments uses Firestore territories, assignments, households, visits, and encounters.
- Records uses Firestore household, visit, and encounter hooks.
- Territories uses Firestore territory, assignment, request, member, group, and boundary hooks.

## Offline Behavior

- Firestore persistent local cache is enabled in the browser.
- Writes are accepted while offline and synchronize automatically when the device reconnects.
- The global offline banner is intentionally small and keeps the workflow available.

## Remaining Product Work

- Keep new screens on Firebase Auth and Firestore hooks rather than auth/profile resource routes.
- Add Firebase security rules and emulator-backed tests before production launch.
- Expand UI polish after data parity is stable.
