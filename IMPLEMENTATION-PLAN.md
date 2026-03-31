# Ministry Planner - Detailed Implementation Plan

**Version:** 1.0  
**Date:** 2026-03-31  
**Project:** Congregation Territory Management System  
**Status:** Ready for Development

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [User Roles & RBAC](#user-roles--rbac)
3. [Data Model](#data-model)
4. [Technical Architecture](#technical-architecture)
5. [Implementation Phases](#implementation-phases)
6. [Database Schema](#database-schema)
7. [API Routes](#api-routes)
8. [Frontend Components](#frontend-components)
9. [Offline & Sync Strategy](#offline--sync-strategy)
10. [Development Workflow](#development-workflow)

---

## Project Overview

### Purpose
Ministry Planner is an **offline-first web application** for Jehovah's Witnesses congregations to manage territory assignments, track household visits, and ensure congregation territory is fully covered.

### Core Features
- **Territory Management** - Draw, divide, and manage congregation territories
- **Household Records** - Track family info, visit history, status, literature preferences
- **Visit Logging** - Record encounters and interactions with households
- **Offline-First** - Works completely offline, syncs when online
- **RBAC Access Control** - Role-based permissions for different user types
- **Reports & Analytics** - Coverage %, activity tracking, group performance

### Key Constraints
- ✅ Works offline (no internet required)
- ✅ Accessible via any browser (desktop, tablet, mobile)
- ✅ Syncs automatically when online
- ✅ Territory servant can access assigned territories only
- ✅ Service overseer can manage all territories and assignments
- ✅ Map-based territory visualization

### Tech Stack
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Node.js, TypeORM, PostgreSQL 17 (Neon)
- **Geo:** PostGIS 3.5 (spatial queries)
- **Maps:** Leaflet (offline-capable)
- **Offline:** Service Worker, IndexedDB, Background Sync API
- **Auth:** JWT + local session
- **Deployment:** Vercel (frontend), Neon (database)

---

## User Roles & RBAC

### Role Hierarchy

```
Super Admin
    ├── Full system access
    ├── Manage all users
    ├── Create congregations
    └── System configuration

    ↓
    
Admin
    ├── Manage congregation users
    ├── Oversee service overseers
    ├── Generate congregation reports
    └── Congregation configuration
    
    ↓
    
Service Overseer
    ├── Manage territory servants
    ├── Create/edit territories
    ├── Assign territories to groups/individuals
    ├── Manage territory rotations
    ├── View group activity & coverage
    └── Handle LPW assessments
    
    ↓
    
Territory Servant
    ├── View assigned territories (offline)
    ├── View household records (offline)
    ├── Log visits & encounters
    ├── Edit household notes
    ├── Sync data when online
    └── Print territory maps
    
    ↓
    
User
    └── Limited access (TBD - possibly view-only or no access)
```

### RBAC Permission Matrix

| Feature | Super Admin | Admin | Service Overseer | Territory Servant | User |
|---------|-----------|-------|------------------|------------------|------|
| **User Management** | ✅ All | ✅ Congregation | ❌ | ❌ | ❌ |
| **Create Territory** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Edit Territory** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Assign Territory** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Rotate Territory** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View Assigned Territory** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Edit Household** | ✅ | ✅ | ✅ | ✅ (own territory) | ❌ |
| **Log Visit** | ✅ | ✅ | ✅ | ✅ (own territory) | ❌ |
| **View All Reports** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View Own Activity** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Export/Print Territory** | ✅ | ✅ | ✅ | ✅ (own) | ❌ |

---

## Data Model

### Core Entities

#### 1. **User**
```typescript
interface User {
  id: UUID
  email: string (unique)
  passwordHash: string
  firstName: string
  lastName: string
  phone?: string
  role: Role (ENUM: SUPER_ADMIN, ADMIN, SERVICE_OVERSEER, TERRITORY_SERVANT, USER)
  congregationId?: UUID (null for super admin)
  createdAt: DateTime
  updatedAt: DateTime
  isActive: boolean
  lastLogin?: DateTime
}
```

#### 2. **Congregation**
```typescript
interface Congregation {
  id: UUID
  name: string
  location: string
  country: string
  administratorId: UUID (references User)
  totalTerritory?: Geometry (MultiPolygon - PostGIS)
  boundaryNotes?: string
  s54DocumentUrl?: string (S-54 document reference)
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### 3. **Territory**
```typescript
interface Territory {
  id: UUID
  congregationId: UUID
  number: string (e.g., "T-01", "T-02")
  name?: string
  boundary: Geometry (Polygon - PostGIS, SRID 4326)
  areaSquareKm?: number
  totalHouseholds?: number
  assignmentType: ENUM (INDIVIDUAL, GROUP)
  status: ENUM (ACTIVE, INACTIVE, ARCHIVED)
  coveragePercentage?: number (0-100)
  lastCoveredDate?: DateTime
  notes?: string
  s12MapUrl?: string (S-12 map card reference)
  s13RecordUrl?: string (S-13 assignment record reference)
  createdAt: DateTime
  updatedAt: DateTime
  deletedAt?: DateTime (soft delete)
  
  // Relationships
  assignments: TerritoryAssignment[]
  households: Household[]
  rotations: TerritoryRotation[]
}
```

#### 4. **TerritoryAssignment**
```typescript
interface TerritoryAssignment {
  id: UUID
  territoryId: UUID
  assigneeType: ENUM (INDIVIDUAL, GROUP)
  assigneeId: UUID (references User for individual, ServiceGroup for group)
  assignedDate: DateTime
  rotationSequence?: number (for rotation tracking)
  status: ENUM (ACTIVE, INACTIVE, RETIRED)
  notes?: string
  createdAt: DateTime
  updatedAt: DateTime
  
  // Relationships
  territory: Territory
  visits: Visit[]
}
```

#### 5. **ServiceGroup** (For group assignments)
```typescript
interface ServiceGroup {
  id: UUID
  congregationId: UUID
  name: string (e.g., "Group A", "Group B")
  leaderId: UUID (references User)
  members: User[] (array of member IDs)
  description?: string
  createdAt: DateTime
  updatedAt: DateTime
  
  // Relationships
  assignments: TerritoryAssignment[]
}
```

#### 6. **Household**
```typescript
interface Household {
  id: UUID
  congregationId: UUID
  territoryId: UUID
  address: string
  houseNumber?: string
  streetName: string
  city: string
  postalCode: string
  location: Geometry (Point - PostGIS, SRID 4326) // For mapping
  
  // Household Members
  occupants: {
    names: string[]
    count: number
    ageRange?: string
    specialNeeds?: string (elderly, visually impaired, etc.)
  }
  
  // Status & History
  status: ENUM (NEW, UNINTERESTED, INTERESTED, DO_NOT_CALL, MOVED, INACTIVE)
  lastVisitDate?: DateTime
  lastVisitNotes?: string
  
  // Literature & Communication
  preferredLiterature: string[] (types they request)
  languagePreference: string
  doNotDisturb: boolean
  bestTimeToCall?: string
  
  // Notes & Context
  notes: string (general notes)
  lwpNotes?: string (LPW assessment notes)
  
  // Audit
  createdAt: DateTime
  updatedAt: DateTime
  createdByUserId: UUID
  updatedByUserId: UUID
  
  // Relationships
  visits: Visit[]
  encounters: Encounter[]
}
```

#### 7. **Visit**
```typescript
interface Visit {
  id: UUID
  householdId: UUID
  assignmentId: UUID (which territory assignment generated this visit)
  householdStatusBefore: ENUM (status before visit)
  householdStatusAfter: ENUM (status after visit)
  
  // Visit Details
  visitDate: DateTime
  duration?: number (minutes)
  visitedBy: User[] (array of user IDs who participated)
  
  // Outcome
  outcome: ENUM (NO_ANSWER, NOT_AT_HOME, CONVERSATION, INTERESTED, NOT_INTERESTED, DO_NOT_CALL, LITERATURE_LEFT, RETURN_VISIT_PLANNED)
  literatureGiven: string[] (what was left)
  returnVisitPlanned: boolean
  nextVisitDate?: DateTime
  
  // Notes
  notes: string
  
  // Sync Tracking
  syncedAt?: DateTime
  syncStatus: ENUM (PENDING, SYNCED, CONFLICT) // For offline sync
  offlineCreated: boolean (true if created offline)
  
  // Audit
  createdAt: DateTime
  updatedAt: DateTime
  
  // Relationships
  household: Household
  encounters: Encounter[]
}
```

#### 8. **Encounter**
```typescript
interface Encounter {
  id: UUID
  visitId?: UUID (optional - can be created without visit)
  householdId: UUID
  userId: UUID (who recorded this)
  
  // Encounter Details
  type: ENUM (CONVERSATION, LITERATURE_DELIVERY, PHONE_CALL, LETTER, OTHER)
  description: string (what happened)
  personSpoken: string (name of person spoken to)
  
  // Context
  date: DateTime
  duration?: number (minutes)
  
  // Follow-up
  followUp: boolean
  followUpDate?: DateTime
  followUpNotes?: string
  
  // Offline Sync
  syncedAt?: DateTime
  offlineCreated: boolean
  
  // Audit
  createdAt: DateTime
  updatedAt: DateTime
}
```

#### 9. **TerritoryRotation**
```typescript
interface TerritoryRotation {
  id: UUID
  territoryId: UUID
  rotationName: string (e.g., "Rotation Q1-2026")
  
  // Rotation Cycle
  previousAssigneeId: UUID
  newAssigneeId: UUID
  rotationDate: DateTime
  rotationReason?: string
  
  // Tracking
  status: ENUM (PLANNED, COMPLETED, SKIPPED)
  completedDate?: DateTime
  notes?: string
  
  // Audit
  createdAt: DateTime
  updatedAt: DateTime
  createdByUserId: UUID
}
```

#### 10. **OfflineSyncQueue** (For offline-online sync)
```typescript
interface OfflineSyncQueue {
  id: UUID
  userId: UUID
  entityType: ENUM (VISIT, ENCOUNTER, HOUSEHOLD_UPDATE)
  entityId: UUID
  operation: ENUM (CREATE, UPDATE, DELETE)
  
  // Payload
  data: JSON (the actual data that needs syncing)
  timestamp: DateTime
  
  // Sync Status
  status: ENUM (PENDING, SYNCED, FAILED)
  syncedAt?: DateTime
  error?: string (if failed)
  retryCount: number
  
  // Audit
  createdAt: DateTime
  updatedAt: DateTime
}
```

---

## Technical Architecture

### Client-Server Architecture

```
┌─────────────────────────────────────────────┐
│         Territory Servant (Browser)         │
├─────────────────────────────────────────────┤
│  Service Worker (offline cache & sync)      │
│  IndexedDB (local data storage)             │
│  Leaflet Map (offline tiles)                │
│  React Components (UI)                      │
└──────────────┬──────────────────────────────┘
               │
        ┌──────▼───────────┐
        │  Online? Yes     │
        │                  │
        └────────┬─────────┘
                 │
    ┌────────────▼──────────────────┐
    │  Vercel (Next.js + API Routes)│
    │  ├─ /api/auth                 │
    │  ├─ /api/territories          │
    │  ├─ /api/households           │
    │  ├─ /api/visits               │
    │  ├─ /api/sync                 │
    │  └─ /api/reports              │
    └────────────┬───────────────────┘
                 │
    ┌────────────▼──────────────────┐
    │  Neon PostgreSQL + PostGIS    │
    │  ├─ Users (RBAC)              │
    │  ├─ Territories (Polygons)    │
    │  ├─ Households (Points)       │
    │  ├─ Visits (Event Log)        │
    │  └─ OfflineSyncQueue          │
    └───────────────────────────────┘
```

### Offline-First Data Flow

```
┌──────────────────────────────────┐
│  Territory Servant Offline       │
│  ├─ Service Worker              │
│  │  └─ Cache territory & map    │
│  ├─ IndexedDB                   │
│  │  ├─ Assigned territories     │
│  │  ├─ Household records        │
│  │  └─ Visit logs (queued)      │
│  └─ UI (React)                  │
│     ├─ Show offline map         │
│     ├─ List households          │
│     └─ Allow visit logging      │
└───────────────┬──────────────────┘
                │
        (offline work)
                │
    ┌───────────▼──────────────────┐
    │  Go Online                   │
    │  ├─ Detect connectivity      │
    │  ├─ Sync queue to server     │
    │  │  └─ POST /api/sync/batch  │
    │  ├─ Resolve conflicts        │
    │  ├─ Update local IndexedDB   │
    │  └─ Pull fresh data          │
    └──────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation & Infrastructure (Weeks 1-2)

#### Goals
- ✅ RBAC system with authentication
- ✅ Offline storage (IndexedDB, Service Worker)
- ✅ Sync engine
- ✅ User entities and basic API

#### Tasks

**Week 1:**

1. **User & Auth System**
   - [ ] Create `User` entity in TypeORM
   - [ ] Create `Congregation` entity
   - [ ] Create JWT auth API (`/api/auth/register`, `/api/auth/login`)
   - [ ] Hash passwords with bcrypt
   - [ ] Create auth middleware for RBAC
   - [ ] Create session management (JWT + refresh tokens)
   - [ ] Migration: Create users, congregations tables

2. **RBAC Permission System**
   - [ ] Create `@RequireRole()` decorator for API routes
   - [ ] Create permission check utility functions
   - [ ] Create role enum and permission matrix
   - [ ] Test auth flows with different roles

3. **Service Worker & Offline Storage**
   - [ ] Create Service Worker file (`public/sw.js`)
   - [ ] Register Service Worker in layout
   - [ ] Cache static assets (JS, CSS, images)
   - [ ] Cache offline page
   - [ ] Test offline mode

4. **IndexedDB Schema**
   - [ ] Design IndexedDB stores:
     - `users` - Cached user data
     - `territories` - Assigned territories
     - `households` - Household records
     - `visits` - Visit logs (local)
     - `sync_queue` - Pending syncs
   - [ ] Create IndexedDB wrapper class
   - [ ] Test CRUD operations

**Week 2:**

5. **Sync Engine**
   - [ ] Create `OfflineSyncQueue` entity
   - [ ] Create sync API route (`/api/sync/batch`)
   - [ ] Implement queue-to-server sync logic
   - [ ] Implement conflict resolution strategy
   - [ ] Create background sync API (BG Sync / Periodic Sync)
   - [ ] Test offline creation → online sync

6. **Connectivity Detection**
   - [ ] Detect online/offline status
   - [ ] Show connectivity indicator in UI
   - [ ] Trigger sync when online
   - [ ] Queue operations when offline

7. **Local Authentication**
   - [ ] Allow login to cache user session
   - [ ] Offline login with cached credentials
   - [ ] Sync user data on next online

8. **Migration & Database Setup**
   - [ ] Create all phase 1 entities migrations
   - [ ] Seed test data (users, congregations, roles)
   - [ ] Verify migrations run on Neon

#### Deliverables
- ✅ User authentication working
- ✅ RBAC enforced on API routes
- ✅ IndexedDB with sync queue
- ✅ Service Worker caching assets
- ✅ Offline login possible
- ✅ PR ready for review

---

### Phase 2: Territory Management (Weeks 3-4)

#### Goals
- ✅ Territory creation & editing
- ✅ Territory-to-user/group assignment
- ✅ Territory rotation tracking
- ✅ Service Overseer dashboard

#### Tasks

**Week 3:**

1. **Territory Entity & API**
   - [ ] Create `Territory` entity (with PostGIS Polygon)
   - [ ] Create `TerritoryAssignment` entity
   - [ ] Create `ServiceGroup` entity
   - [ ] Migration: territories, assignments, groups tables
   - [ ] API routes:
     - `GET /api/territories` (list by congregation)
     - `POST /api/territories` (create - SO only)
     - `PUT /api/territories/:id` (edit - SO only)
     - `GET /api/territories/:id` (get one)
     - `DELETE /api/territories/:id` (delete - SO only)

2. **Territory Geometry & PostGIS**
   - [ ] Implement PostGIS polygon storage
   - [ ] Add spatial indexes (GiST)
   - [ ] Create area calculation on save
   - [ ] Test polygon queries

3. **Territory Assignment API**
   - [ ] API routes:
     - `POST /api/assignments` (assign territory)
     - `PUT /api/assignments/:id` (change assignment)
     - `GET /api/assignments/by-user/:userId` (get user's territories)
   - [ ] Validation: Ensure SO only assigns
   - [ ] Auto-calculate coverage %

**Week 4:**

4. **Territory Rotation**
   - [ ] Create `TerritoryRotation` entity
   - [ ] API routes:
     - `POST /api/rotations` (create rotation)
     - `PUT /api/rotations/:id/complete` (mark completed)
     - `GET /api/rotations/:id` (view history)
   - [ ] Automation: Update assignments on rotation
   - [ ] History: Log all rotations

5. **Service Overseer Dashboard API**
   - [ ] API routes:
     - `GET /api/dashboard/territories` (all territories in congregation)
     - `GET /api/dashboard/coverage` (coverage metrics)
     - `GET /api/dashboard/assignments` (current assignments)
     - `GET /api/dashboard/activity` (recent activity)

6. **Frontend: Territory Management Pages**
   - [ ] Create `/territories` page (list all)
   - [ ] Create `/territories/new` page (create form)
   - [ ] Create `/territories/:id` page (view/edit)
   - [ ] Create `/territories/:id/assignments` page (manage assignments)
   - [ ] Create `/territories/:id/rotation` page (rotate)
   - [ ] Create dashboard components

7. **Map Territory Drawing Tool**
   - [ ] Integrate Leaflet.Draw or similar
   - [ ] Allow Service Overseer to draw polygon territories
   - [ ] Validate polygon boundaries
   - [ ] Save to database

#### Deliverables
- ✅ Territories can be created, edited, deleted
- ✅ Territories can be assigned to users/groups
- ✅ Territory rotations tracked
- ✅ Service Overseer dashboard
- ✅ Map drawing tool
- ✅ All data syncs to offline

---

### Phase 3: Household & Visit Management (Weeks 5-6)

#### Goals
- ✅ Household CRUD
- ✅ Visit logging (online & offline)
- ✅ Encounter tracking
- ✅ Territory Servant app

#### Tasks

**Week 5:**

1. **Household Entity & API**
   - [ ] Create `Household` entity (with PostGIS Point)
   - [ ] Migration: households table
   - [ ] API routes:
     - `GET /api/households` (by territory)
     - `POST /api/households` (create)
     - `PUT /api/households/:id` (edit)
     - `GET /api/households/:id` (view)
     - `DELETE /api/households/:id` (delete)
   - [ ] Validation: Only SO/TS can manage households in assigned territory

2. **Household Map Points**
   - [ ] Store location as PostGIS Point
   - [ ] Create spatial index
   - [ ] API to get households within territory bounds
   - [ ] Show on map

3. **Offline Household Sync**
   - [ ] Load assigned territory households to IndexedDB
   - [ ] Make editable offline
   - [ ] Queue changes on offline edit
   - [ ] Sync on next online

**Week 6:**

4. **Visit Entity & API**
   - [ ] Create `Visit` entity
   - [ ] Migration: visits table
   - [ ] API routes:
     - `POST /api/visits` (log visit)
     - `PUT /api/visits/:id` (edit visit)
     - `GET /api/households/:id/visits` (get household's visit history)
   - [ ] Auto-update household status after visit
   - [ ] Track sync status

5. **Encounter Entity & API**
   - [ ] Create `Encounter` entity
   - [ ] API routes:
     - `POST /api/encounters` (log encounter)
     - `GET /api/encounters/:householdId` (get history)
   - [ ] Link to visit (optional)

6. **Territory Servant UI**
   - [ ] Create `/app/territory` page (main view)
   - [ ] Territory selector/dropdown
   - [ ] Map view with household pins
   - [ ] Household list (address, last visit date, status)
   - [ ] Household detail modal (click pin/list item)
   - [ ] Add visit form
   - [ ] Visit history timeline
   - [ ] Offline indicator
   - [ ] Manual sync button

7. **Offline Visit Logging**
   - [ ] Queue visit to local IndexedDB when offline
   - [ ] Show "pending sync" badge
   - [ ] Sync on next online
   - [ ] Handle conflicts gracefully

#### Deliverables
- ✅ Households can be created, edited
- ✅ Visits can be logged (online & offline)
- ✅ Territory Servant can work offline
- ✅ All visit data syncs when online
- ✅ Household status updated automatically

---

### Phase 4: Maps & Offline Tile Caching (Week 7)

#### Goals
- ✅ Offline-capable map with cached tiles
- ✅ Territory boundaries on map
- ✅ Household locations visible
- ✅ Map-based territory drawing

#### Tasks

1. **Map Tile Caching**
   - [ ] Choose tile provider (OpenStreetMap via Leaflet)
   - [ ] Implement tile caching in Service Worker
   - [ ] Cache common zoom levels for territories
   - [ ] Test offline map viewing

2. **Territory Visualization**
   - [ ] Display territory polygon on map
   - [ ] Color-code by coverage %
   - [ ] Show boundaries clearly
   - [ ] Display S-12 info on territory

3. **Household Map Markers**
   - [ ] Show household points on map
   - [ ] Color by status (interested, not interested, etc.)
   - [ ] Click marker → show detail modal
   - [ ] Update marker color as status changes

4. **Territory Drawing (Service Overseer)**
   - [ ] Integrate Leaflet.Draw or Leaflet.PM
   - [ ] Allow SO to draw polygon
   - [ ] Validate boundaries
   - [ ] Save to database

5. **Map Export for Printing**
   - [ ] Ability to export territory as image/PDF
   - [ ] Format for S-12 printing
   - [ ] Include territory number, boundaries, household markers

#### Deliverables
- ✅ Maps work offline with cached tiles
- ✅ Territory boundaries visible
- ✅ Household locations marked
- ✅ Territory can be drawn and exported

---

### Phase 5: Reporting & Analytics (Week 8)

#### Goals
- ✅ Coverage reports
- ✅ Activity dashboards
- ✅ LPW notes tracking
- ✅ Export capabilities

#### Tasks

1. **Coverage Reports**
   - [ ] API: `GET /api/reports/coverage` (by territory, group, date range)
   - [ ] Calculate:
     - % of households visited
     - Last visit date per territory
     - Active vs inactive territories
   - [ ] Display in dashboard
   - [ ] Export as CSV/PDF

2. **Activity Dashboard**
   - [ ] API: `GET /api/reports/activity` (visits, encounters, users)
   - [ ] Charts:
     - Visits per week/month
     - Activity per territory servant
     - Activity per group
     - Household status distribution
   - [ ] Filters by date range, territory, user

3. **LPW Notes**
   - [ ] Add LPW-specific notes field to household/territory
   - [ ] Create LPW review page
   - [ ] Filter households needing LPW assessment
   - [ ] Generate LPW summary for Circuit Overseer visit

4. **Export & Printing**
   - [ ] Export territory assignment list
   - [ ] Export household list with visit history
   - [ ] Export coverage report
   - [ ] Print-friendly formats

#### Deliverables
- ✅ Service Overseer has complete coverage reports
- ✅ Activity dashboards with charts
- ✅ LPW assessments documented
- ✅ Data exportable for external use

---

### Phase 6: Polish, Testing & Deployment (Week 9)

#### Goals
- ✅ Bug fixes
- ✅ Performance optimization
- ✅ Security hardening
- ✅ User testing
- ✅ Production deployment

#### Tasks

1. **Testing**
   - [ ] Unit tests for critical functions
   - [ ] Integration tests for sync
   - [ ] Offline/online flow testing
   - [ ] RBAC permission testing
   - [ ] Cross-browser testing

2. **Performance**
   - [ ] Optimize API queries
   - [ ] Lazy-load territories/households
   - [ ] Cache frequently accessed data
   - [ ] Minimize bundle size

3. **Security**
   - [ ] HTTPS everywhere
   - [ ] CORS configuration
   - [ ] Rate limiting on API
   - [ ] Input validation & sanitization
   - [ ] SQL injection prevention (TypeORM)
   - [ ] XSS prevention (React)

4. **Documentation**
   - [ ] User guide for Territory Servants
   - [ ] Admin guide for Service Overseers
   - [ ] API documentation
   - [ ] Deployment runbook

5. **User Feedback**
   - [ ] Beta testing with real users
   - [ ] Collect feedback
   - [ ] Iterate on UX issues

6. **Deployment**
   - [ ] Production database setup
   - [ ] Vercel production deployment
   - [ ] Neon production branch setup
   - [ ] Monitoring & alerting
   - [ ] Backup strategy

#### Deliverables
- ✅ Production-ready application
- ✅ Complete documentation
- ✅ User training materials

---

## Database Schema

### SQL Migration: Initial Setup

```sql
-- Users & RBAC
CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN',
  'ADMIN',
  'SERVICE_OVERSEER',
  'TERRITORY_SERVANT',
  'USER'
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role user_role NOT NULL,
  congregation_id UUID REFERENCES congregations(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP
);

CREATE TABLE congregations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  country VARCHAR(255),
  administrator_id UUID REFERENCES users(id),
  total_territory GEOMETRY(MultiPolygon, 4326),
  boundary_notes TEXT,
  s54_document_url VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Territory Management
CREATE TYPE territory_status AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED'
);

CREATE TABLE territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id UUID NOT NULL REFERENCES congregations(id),
  number VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  boundary GEOMETRY(Polygon, 4326) NOT NULL,
  area_square_km DECIMAL(10, 2),
  total_households INTEGER,
  assignment_type VARCHAR(50) CHECK (assignment_type IN ('INDIVIDUAL', 'GROUP')),
  status territory_status DEFAULT 'ACTIVE',
  coverage_percentage DECIMAL(5, 2),
  last_covered_date TIMESTAMP,
  notes TEXT,
  s12_map_url VARCHAR(512),
  s13_record_url VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_territories_congregation ON territories(congregation_id);
CREATE INDEX idx_territories_boundary ON territories USING GIST(boundary);

CREATE TABLE service_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id UUID NOT NULL REFERENCES congregations(id),
  name VARCHAR(255) NOT NULL,
  leader_id UUID NOT NULL REFERENCES users(id),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE service_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES service_groups(id),
  user_id UUID NOT NULL REFERENCES users(id),
  UNIQUE(group_id, user_id)
);

CREATE TABLE territory_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id UUID NOT NULL REFERENCES territories(id),
  assignee_type VARCHAR(50) CHECK (assignee_type IN ('INDIVIDUAL', 'GROUP')),
  assignee_id UUID NOT NULL, -- references either user or service_group
  assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  rotation_sequence INTEGER,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assignments_territory ON territory_assignments(territory_id);
CREATE INDEX idx_assignments_assignee ON territory_assignments(assignee_id);

-- Households & Visits
CREATE TYPE household_status AS ENUM (
  'NEW',
  'UNINTERESTED',
  'INTERESTED',
  'DO_NOT_CALL',
  'MOVED',
  'INACTIVE'
);

CREATE TABLE households (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  congregation_id UUID NOT NULL REFERENCES congregations(id),
  territory_id UUID NOT NULL REFERENCES territories(id),
  address VARCHAR(255) NOT NULL,
  house_number VARCHAR(50),
  street_name VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  postal_code VARCHAR(20),
  location GEOMETRY(Point, 4326) NOT NULL, -- for mapping
  occupants_names TEXT[], -- JSON array
  occupants_count INTEGER,
  age_range VARCHAR(100),
  special_needs TEXT,
  status household_status DEFAULT 'NEW',
  last_visit_date TIMESTAMP,
  last_visit_notes TEXT,
  preferred_literature TEXT[],
  language_preference VARCHAR(50),
  do_not_disturb BOOLEAN DEFAULT false,
  best_time_to_call VARCHAR(100),
  notes TEXT,
  lwp_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id UUID REFERENCES users(id),
  updated_by_user_id UUID REFERENCES users(id)
);

CREATE INDEX idx_households_territory ON households(territory_id);
CREATE INDEX idx_households_location ON households USING GIST(location);

CREATE TYPE visit_outcome AS ENUM (
  'NO_ANSWER',
  'NOT_AT_HOME',
  'CONVERSATION',
  'INTERESTED',
  'NOT_INTERESTED',
  'DO_NOT_CALL',
  'LITERATURE_LEFT',
  'RETURN_VISIT_PLANNED'
);

CREATE TYPE sync_status AS ENUM (
  'PENDING',
  'SYNCED',
  'CONFLICT'
);

CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id),
  assignment_id UUID NOT NULL REFERENCES territory_assignments(id),
  household_status_before household_status,
  household_status_after household_status,
  visit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration INTEGER, -- minutes
  visited_by_ids UUID[] NOT NULL, -- array of user IDs
  outcome visit_outcome,
  literature_given TEXT[],
  return_visit_planned BOOLEAN DEFAULT false,
  next_visit_date TIMESTAMP,
  notes TEXT,
  synced_at TIMESTAMP,
  sync_status sync_status DEFAULT 'PENDING',
  offline_created BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_visits_household ON visits(household_id);
CREATE INDEX idx_visits_assignment ON visits(assignment_id);
CREATE INDEX idx_visits_visit_date ON visits(visit_date);

CREATE TYPE encounter_type AS ENUM (
  'CONVERSATION',
  'LITERATURE_DELIVERY',
  'PHONE_CALL',
  'LETTER',
  'OTHER'
);

CREATE TABLE encounters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID REFERENCES visits(id),
  household_id UUID NOT NULL REFERENCES households(id),
  user_id UUID NOT NULL REFERENCES users(id),
  type encounter_type NOT NULL,
  description TEXT NOT NULL,
  person_spoken VARCHAR(255),
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration INTEGER, -- minutes
  follow_up BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMP,
  follow_up_notes TEXT,
  synced_at TIMESTAMP,
  offline_created BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_encounters_household ON encounters(household_id);

-- Territory Rotations
CREATE TYPE rotation_status AS ENUM (
  'PLANNED',
  'COMPLETED',
  'SKIPPED'
);

CREATE TABLE territory_rotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id UUID NOT NULL REFERENCES territories(id),
  rotation_name VARCHAR(255) NOT NULL,
  previous_assignee_id UUID,
  new_assignee_id UUID,
  rotation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  rotation_reason TEXT,
  status rotation_status DEFAULT 'PLANNED',
  completed_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by_user_id UUID NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_rotations_territory ON territory_rotations(territory_id);

-- Offline Sync Queue
CREATE type sync_operation AS ENUM ('CREATE', 'UPDATE', 'DELETE');
CREATE TYPE sync_entity_type AS ENUM ('VISIT', 'ENCOUNTER', 'HOUSEHOLD_UPDATE');

CREATE TABLE offline_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  entity_type sync_entity_type NOT NULL,
  entity_id UUID NOT NULL,
  operation sync_operation NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status sync_status DEFAULT 'PENDING',
  synced_at TIMESTAMP,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sync_queue_user ON offline_sync_queue(user_id);
CREATE INDEX idx_sync_queue_status ON offline_sync_queue(status);
```

---

## API Routes

### Authentication

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| POST | `/api/auth/register` | None | Any | Register new user |
| POST | `/api/auth/login` | None | Any | Login (returns JWT) |
| POST | `/api/auth/logout` | JWT | Any | Logout |
| POST | `/api/auth/refresh` | JWT | Any | Refresh token |
| GET | `/api/auth/me` | JWT | Any | Get current user |

### Users & Management

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/users` | JWT | ADMIN, SUPER_ADMIN | List users in congregation |
| POST | `/api/users` | JWT | ADMIN, SUPER_ADMIN | Create user |
| PUT | `/api/users/:id` | JWT | ADMIN, SUPER_ADMIN | Update user |
| DELETE | `/api/users/:id` | JWT | ADMIN, SUPER_ADMIN | Delete user |
| GET | `/api/users/:id` | JWT | ADMIN, SUPER_ADMIN | Get user details |

### Congregations

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/congregations` | JWT | ADMIN, SUPER_ADMIN | List congregations |
| POST | `/api/congregations` | JWT | SUPER_ADMIN | Create congregation |
| GET | `/api/congregations/:id` | JWT | Any | Get congregation |
| PUT | `/api/congregations/:id` | JWT | ADMIN, SUPER_ADMIN | Update congregation |

### Territories

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/territories` | JWT | Any (sees assigned only for TS) | List territories |
| POST | `/api/territories` | JWT | SERVICE_OVERSEER, ADMIN | Create territory |
| GET | `/api/territories/:id` | JWT | SERVICE_OVERSEER, ADMIN, TS (if assigned) | Get territory |
| PUT | `/api/territories/:id` | JWT | SERVICE_OVERSEER, ADMIN | Update territory |
| DELETE | `/api/territories/:id` | JWT | ADMIN | Delete territory |
| GET | `/api/territories/:id/households` | JWT | SO, ADMIN, TS (if assigned) | Get households in territory |
| POST | `/api/territories/:id/assignments` | JWT | SO, ADMIN | Assign territory |
| GET | `/api/territories/:id/coverage` | JWT | SO, ADMIN | Get coverage metrics |

### Households

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/households` | JWT | SERVICE_OVERSEER, ADMIN, TS | List households (filtered by permission) |
| POST | `/api/households` | JWT | SERVICE_OVERSEER, ADMIN, TS | Create household |
| GET | `/api/households/:id` | JWT | SERVICE_OVERSEER, ADMIN, TS (if in territory) | Get household |
| PUT | `/api/households/:id` | JWT | SERVICE_OVERSEER, ADMIN, TS (if in territory) | Update household |
| DELETE | `/api/households/:id` | JWT | ADMIN | Delete household |
| GET | `/api/households/:id/visits` | JWT | SO, ADMIN, TS (if in territory) | Get visit history |

### Visits

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| POST | `/api/visits` | JWT | SERVICE_OVERSEER, TS | Log visit |
| GET | `/api/visits/:id` | JWT | SO, TS (if participated) | Get visit |
| PUT | `/api/visits/:id` | JWT | SO, TS (if participated) | Edit visit |
| GET | `/api/households/:id/visits` | JWT | SO, ADMIN, TS | Get household visits |

### Encounters

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| POST | `/api/encounters` | JWT | SERVICE_OVERSEER, TS | Log encounter |
| GET | `/api/encounters/:id` | JWT | SO, TS (if participated) | Get encounter |
| GET | `/api/households/:id/encounters` | JWT | SO, ADMIN, TS | Get household encounters |

### Territory Assignments

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| POST | `/api/assignments` | JWT | SERVICE_OVERSEER, ADMIN | Assign territory |
| GET | `/api/assignments/:id` | JWT | SO, ADMIN, TS (if assigned) | Get assignment |
| PUT | `/api/assignments/:id` | JWT | SO, ADMIN | Update assignment |
| GET | `/api/assignments/user/:userId` | JWT | SO, ADMIN, TS (self) | Get user's territories |

### Territory Rotations

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| POST | `/api/rotations` | JWT | SERVICE_OVERSEER, ADMIN | Create rotation |
| GET | `/api/rotations/:id` | JWT | SO, ADMIN | Get rotation |
| PUT | `/api/rotations/:id/complete` | JWT | SO, ADMIN | Complete rotation |
| GET | `/api/territories/:id/rotations` | JWT | SO, ADMIN | Get territory rotations |

### Sync & Offline

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| POST | `/api/sync/batch` | JWT | Any | Sync offline changes |
| GET | `/api/sync/status` | JWT | Any | Get sync status |
| POST | `/api/sync/pull` | JWT | Any | Pull data for offline use |

### Reports & Analytics

| Method | Route | Auth | Role | Description |
|--------|-------|------|------|-------------|
| GET | `/api/reports/coverage` | JWT | SO, ADMIN | Coverage report |
| GET | `/api/reports/activity` | JWT | SO, ADMIN | Activity report |
| GET | `/api/reports/group-performance` | JWT | SO, ADMIN | Group performance |
| GET | `/api/reports/lwp` | JWT | SO, ADMIN | LPW assessments |
| GET | `/api/reports/export` | JWT | SO, ADMIN | Export data (CSV/PDF) |

---

## Frontend Components

### Layout & Navigation

```typescript
// src/components/Layout.tsx
- Navigation bar with role-based menu
- Offline indicator
- Sync status
- User menu (profile, logout)

// src/components/Navigation.tsx
- Links by role:
  - SO: Territories, Assignments, Dashboard, Reports
  - TS: My Territory, Households, Visits
  - Admin: Users, Congregations, Reports
```

### Pages by Role

#### Service Overseer
- `/dashboard` - Overview, coverage metrics
- `/territories` - List, create, edit territories
- `/territories/:id` - Territory detail, household list
- `/territories/:id/map` - Map view with households
- `/territories/:id/assignments` - Assign to groups/individuals
- `/territories/:id/rotation` - Manage territory rotation
- `/assignments` - All assignments, reassignment
- `/groups` - Service group management
- `/reports` - Coverage, activity, LPW reports
- `/reports/export` - Export data

#### Territory Servant
- `/app/territory` - Main work area (assigned territory)
- `/app/territory/map` - Offline map view
- `/app/households` - List households in territory
- `/app/households/:id` - Household detail
- `/app/visit/new` - Log new visit
- `/app/visits` - My recent visits

#### Admin
- `/admin/users` - User management
- `/admin/congregations` - Congregation management
- `/admin/reports` - System reports

---

## Offline & Sync Strategy

### Offline Data Structure (IndexedDB)

```typescript
// IndexedDB Stores
{
  users: {
    keyPath: 'id',
    indexes: ['email']
  },
  territories: {
    keyPath: 'id',
    indexes: ['congregationId', 'assignedTo']
  },
  households: {
    keyPath: 'id',
    indexes: ['territoryId', 'lastVisitDate']
  },
  visits: {
    keyPath: 'id',
    indexes: ['householdId', 'visitDate', 'syncStatus']
  },
  encounters: {
    keyPath: 'id',
    indexes: ['householdId', 'date']
  },
  sync_queue: {
    keyPath: 'id',
    indexes: ['userId', 'status', 'timestamp']
  },
  map_tiles: {
    keyPath: 'url'
  }
}
```

### Sync Flow

```
1. User creates/edits visit OFFLINE
   - Write to IndexedDB (visits store)
   - Write to sync_queue (status: PENDING)
   - Update household status
   - Show "Pending Sync" badge

2. User goes ONLINE
   - Connectivity check via fetch("/ping")
   - Service Worker detects online
   - Trigger sync: GET /api/sync/status

3. Backend sync endpoint:
   - Receives sync_queue items
   - Validates each change
   - Writes to PostgreSQL
   - Checks for conflicts
   - Returns updated records

4. Client processes response:
   - Mark items as SYNCED
   - Receive updated data
   - Update IndexedDB with server data
   - Show sync complete notification

5. Conflict resolution:
   - Server detects conflicting change (another user edited same household)
   - Returns CONFLICT status
   - Client shows modal: "This record changed, merge?"
   - Manual resolution or auto-merge
```

### Service Worker Strategy

```typescript
// Cache strategy: Network-first for API, Cache-first for assets
- Assets (JS, CSS): Cache-first
- API calls (/api/*): Network-first with fallback
- Map tiles: Cache-first with periodic updates
- HTML pages: Network-first with fallback

// Background Sync
- Queue changes while offline
- On connectivity, trigger sync API
- Retry failed syncs with exponential backoff
```

---

## Development Workflow

### Git Workflow

```
main (production)
  ├─ develop (staging)
  │   ├─ feature/rbac-system
  │   ├─ feature/territory-mapping
  │   ├─ feature/visit-logging
  │   └─ feature/offline-sync
  └─ hotfix branches (as needed)
```

### Local Development

```bash
# Start dev server
pnpm dev

# Run migrations locally
pnpm db:migrate

# Generate new migration
pnpm db:generate -- --name DescribeMigration

# Run tests
pnpm test

# Format code
pnpm format

# Lint
pnpm lint
```

### PR Workflow

1. Create feature branch from `develop`
2. Implement feature
3. Write tests
4. Format & lint
5. Commit with clear messages
6. Push to GitHub
7. Open PR to `develop`
8. PR Reviewer checks code
9. Merge when approved
10. Deploy to staging (Neon preview branch)
11. Test on preview
12. Merge to `main` for production

### Testing Strategy

- Unit tests for utilities & hooks
- Integration tests for API routes
- End-to-end tests for key flows (offline → sync)
- Manual testing on different roles

---

## Success Criteria

✅ Phase 1: Users can authenticate, RBAC enforced, offline storage works
✅ Phase 2: Service Overseer can create/assign territories, rotations tracked
✅ Phase 3: Territory Servants can log visits offline, data syncs when online
✅ Phase 4: Maps work offline, territories visualized, households marked
✅ Phase 5: Comprehensive reports available, data exportable
✅ Phase 6: Production deployment, user documentation, training complete

---

## Notes

- This document is a living guide; iterate as you build
- Prioritize offline-first architecture (it's core to this app)
- Test sync thoroughly (it's complex and critical)
- Get user feedback early and often
- Keep performance in mind (mobile devices, slow networks)

---

**Ready to build!** 🚀
