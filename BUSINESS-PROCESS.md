# Ministry Planner — Business Process Documentation

## Overview

A congregation territory management tool for Jehovah's Witnesses. Tracks territory boundaries, household visits, assignments to publishers, and field ministry outcomes. Offline-first (mobile-friendly), role-based access.

---

## Actors & Roles

| Role | Description | Key Permissions |
|---|---|---|
| `USER` (Publisher) | Rank-and-file congregation member | Log visits on assigned territory; see own visit history |
| `TERRITORY_SERVANT` | Manages territory records | Create/edit territories, households; assign territories to publishers; view all visits in congregation |
| `SERVICE_OVERSEER` | Oversees field ministry | Everything TS can do; approve territory requests; view coverage reports |
| `ADMIN` | Congregation admin | Manage congregation members, groups; access all data |
| `SUPER_ADMIN` | System-wide admin | Full access across all congregations |

---

## Core Workflows

### 1. Congregation Setup
1. SUPER_ADMIN or ADMIN creates a congregation.
2. Publisher registers → lands on `/onboarding` → searches for congregation → sends join request.
3. ADMIN or SO approves/rejects join request → member status changes from `pending` → `active`.
4. Member is optionally assigned to a service group (congregation subdivision).

### 2. Territory Management
1. TS/SO creates a territory (name, number, notes, optional GeoJSON boundary polygon).
2. Territory starts as `available`.
3. TS/SO assigns territory to a publisher or service group → status becomes `assigned`.
4. Territory tracks:
   - `householdsCount` — number of households spatially within its boundary
   - `coveragePercent` — % of households that have been visited (status ≠ `not_visited`)
5. When all households are worked → TS/SO marks territory `completed` → territory is returned.
6. Territories can be assigned in **rotations** (TS assigns a batch; system tracks rotation progress).

### 3. Territory Request Flow
1. Publisher requests a territory via the app.
2. Territory Request record created (`pending`).
3. TS/SO reviews → approves (creates assignment) or rejects.
4. Publisher receives in-app notification either way.

### 4. Household Records
1. TS/SO or Publisher (with territory) adds households (address, type, lat/lng).
2. `location` field is a PostGIS `Point(4326)` — enables spatial queries.
3. Households are **not** locked to a territory by FK — they belong to whichever territory's boundary contains them (dynamic via ST_Within).
4. Each household tracks:
   - `status`: `not_visited | visited | return_visit | do_not_visit | moved | inactive`
   - `lastVisitDate`, `lastVisitOutcome`

### 5. Visit Recording (Core Field Ministry Loop)
This is the primary daily workflow for publishers in the field.

```
Publisher opens assignment → sees household list on map
  ↓
Taps household → taps "Log Visit"
  ↓
Fills form:
  - outcome: answered | not_home | return_visit | do_not_visit | moved | other
  - householdStatusAfter (optional — updates household status)
  - notes, literature left, Bible topic discussed
  - returnVisitPlanned (boolean), nextVisitDate, nextVisitNotes
  - duration (minutes)
  ↓
Submit:
  - Online → POST /api/visits → DB write + household status update + coverage recalc
  - Offline → IndexedDB queue (pending-visits) → SW background sync fires when reconnected
  ↓
Coverage % recalculated for territory
Publisher sees updated household list
```

#### Outcome → Household Status mapping
| Outcome | Suggested Status After |
|---|---|
| `answered` | `visited` |
| `not_home` | unchanged |
| `return_visit` | `return_visit` |
| `do_not_visit` | `do_not_visit` |
| `moved` | `moved` |
| `other` | unchanged |

### 6. Encounter Recording
After logging a visit, publisher can add **encounter records** (per person at the door):
- Name, gender, age group, role in household
- Response (interested, not interested, hostile, etc.)
- Literature accepted, Bible study interest, return visit requested

### 7. Offline Sync Flow
```
Publisher goes offline → continues logging visits
  ↓
Visits written to IndexedDB "pending-visits" store
  ↓
UI shows ⏳ badge on pending items
  ↓
Device reconnects → Service Worker "sync" event fires
  ↓
SW reads pending-visits, POSTs each to /api/visits with fresh JWT
  ↓
Success → SW posts VISIT_SYNCED message to page → UI clears ⏳ badge
Failure → SW retries with backoff (browser-controlled)
```

### 8. Reporting
- Coverage % per territory (auto-updated on every visit)
- Publisher activity report (visits per publisher per period)
- Territory coverage report (all territories, % worked)
- Available via `/api/congregations/:id/reports/*`

---

## Key Business Rules

1. **One active assignment per territory** — can't assign same territory twice without returning.
2. **Household spatial ownership** — determined dynamically by PostGIS; no FK to territory.
3. **Coverage = worked households / total households** — "worked" = status in `{visited, return_visit, do_not_visit, moved, inactive}`.
4. **Visit always scoped to a publisher** — `userId` required; congregation data is auditable.
5. **Offline visits are valid** — `offlineCreated: true` flag tracks origin; all sync via SW.
6. **Territory request requires SO/TS approval** — publishers cannot self-assign territories.

---

## Data Model Summary

```
Congregations
  └── Members (users with roles)
  └── Groups (service groups)
  └── Territories
        └── Territory Assignments (publisher ↔ territory, active/completed/returned)
        └── Territory Requests (publisher requests, SO approves)
        └── Territory Rotations (batch assignment cycles)
        └── Households (spatial, no territory FK)
              └── Visits (per publisher per household)
                    └── Encounters (per person met at door)
Notifications (join approvals, territory assignments)
Offline Sync Queue (server-side mirror of IDB pending items)
```
