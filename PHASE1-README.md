# Phase 1: Congregation Foundation — API Documentation

## Overview

Multi-tenancy foundation based on **Congregations**. Users belong to congregations as **Publishers** with optional congregation-level roles. Territories can be assigned to individual publishers or groups.

## Stack

- Next.js 16 (App Router)
- TypeORM 0.3
- PostgreSQL (Neon)
- TypeScript
- JWT Authentication

---

## Auth

All endpoints require a Bearer JWT token:

```
Authorization: Bearer <token>
```

Get a token via the existing `/api/auth` login endpoint.

---

## Role Hierarchy

### Global Roles (on the `users` table)
| Role | Level |
|------|-------|
| `SUPER_ADMIN` | Bypasses all congregation checks |
| `ADMIN` | Bypasses all congregation checks |
| `USER` | Subject to congregation membership checks |

### Congregation Roles (on `congregation_members`)
| Role | Permissions |
|------|-------------|
| `service_overseer` | Manage members, groups, approve requests |
| `territory_servant` | Manage territories, approve requests |
| _(null)_ | Regular publisher — can request territories |

---

## Entities

| Entity | Table | Description |
|--------|-------|-------------|
| `User` | `users` | Authenticated accounts |
| `Congregation` | `congregations` | A congregation (tenant) |
| `CongregationMember` | `congregation_members` | Publisher membership + role |
| `Group` | `groups` | Field service groups within a congregation |
| `GroupMember` | `group_members` | User in a group with role (group_overseer, assistant_overseer, member) |
| `Territory` | `territories` | Territory card — assigned to publisher OR group (not both) |
| `TerritoryRequest` | `territory_requests` | Publisher request for a territory |

---

## API Endpoints

### Congregations

#### `POST /api/congregations`
Create a new congregation. Any authenticated user can create one.

**Body:**
```json
{ "name": "My Congregation", "city": "Springfield", "country": "US" }
```

**Response:** `201` with congregation object.

---

#### `GET /api/congregations/:id`
View congregation details. Requires membership (or global admin).

**Response:** `200` with congregation + `createdBy` relation.

---

### Members (Publishers)

#### `GET /api/congregations/:id/members`
List all members with their congregation roles.

**Auth:** Any congregation member.

---

#### `POST /api/congregations/:id/members`
Add a user as a congregation member.

**Auth:** `service_overseer` or global admin.

**Body:**
```json
{ "userId": "<uuid>" }
```

---

#### `PATCH /api/congregations/:id/members/:userId`
Assign (or remove) a congregation role.

**Auth:** `service_overseer` or global admin.

**Body:**
```json
{ "congregationRole": "territory_servant" }
// or null to remove role
```

---

### Groups

#### `GET /api/congregations/:id/groups`
List all groups with their members.

**Auth:** Any congregation member.

---

#### `POST /api/congregations/:id/groups`
Create a group.

**Auth:** `service_overseer` or global admin.

**Body:**
```json
{ "name": "Group A" }
```

---

#### `POST /api/congregations/:id/groups/:groupId/members`
Add a user to a group with a role.

**Auth:** `service_overseer` or global admin.

**Body:**
```json
{ "userId": "<uuid>", "groupRole": "group_overseer" }
```

`groupRole` options: `group_overseer`, `assistant_overseer`, `member` (default)

---

### Territories

#### `GET /api/congregations/:id/territories`
List all territories showing publisher and group assignments.

**Auth:** Any congregation member.

---

#### `POST /api/congregations/:id/territories`
Create a territory. Optionally assign to a publisher OR group (not both).

**Auth:** `territory_servant` or above.

**Body:**
```json
{
  "name": "Main Street North",
  "number": "T-042",
  "notes": "Apartment buildings",
  "publisherId": "<uuid>",  // OR
  "groupId": "<uuid>"       // not both
}
```

---

### Territory Requests

#### `GET /api/congregations/:id/territory-requests`
List territory requests. Uses `?status=pending|approved|rejected` (default: `pending`).

- `service_overseer` / `territory_servant` / global admins see **all** requests
- Regular publishers see **only their own**

---

#### `POST /api/congregations/:id/territory-requests`
Submit a territory request.

**Auth:** Any congregation member.

**Body:**
```json
{ "territoryId": "<uuid>" }  // optional — can be open request
```

---

#### `PATCH /api/congregations/:id/territory-requests/:requestId`
Approve or reject a request.

**Auth:** `territory_servant` or above.

**Body:**
```json
{ "status": "approved" }
// or
{ "status": "rejected" }
```

---

## Running Migrations

```bash
pnpm db:migrate
```

## Seeding Test Data

```bash
pnpm db:seed
```

### Test Users (after seed)

| Email | Password | Role |
|-------|----------|------|
| super@example.com | password123 | SUPER_ADMIN |
| admin@example.com | password123 | ADMIN (service_overseer in test congregation) |
| alice@example.com | password123 | USER (territory_servant, Group A overseer) |
| bob@example.com   | password123 | USER (congregation member, Group A) |
| carol@example.com | password123 | USER (congregation member, Group B assistant) |

---

## Constraints

- `territories`: Only one of `publisherId` or `groupId` can be set (DB CHECK constraint)
- `congregation_members`: Unique `(userId, congregationId)` — one membership per congregation
- `group_members`: Unique `(userId, groupId)` — one role per group
