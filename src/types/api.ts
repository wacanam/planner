// src/types/api.ts
// Shared entity types — single source of truth for API response shapes.
// These reflect the actual JSON that each route returns AFTER apiClient
// unwraps the { data: T } envelope.

// ─── Congregation ──────────────────────────────────────────────────────────────

/** /api/congregations  and  /api/congregations/:id */
export interface Congregation {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
  status: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Members / Join requests ───────────────────────────────────────────────────

/** /api/congregations/:id/members */
export interface Member {
  id: string;
  userId: string;
  congregationId: string;
  congregationRole: string | null;
  status: string;
  joinMessage: string | null;
  joinedAt: string;
  /** null when the user row is missing (leftJoin) */
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
    role: string | null;
  } | null;
}

/** /api/congregations/:id/join-requests
 *  Different select from the same table — no userId, no congregationRole,
 *  but adds reviewNote / reviewedAt. */
export interface JoinRequest {
  id: string;
  congregationId: string;
  status: string;
  joinMessage: string | null;
  reviewNote: string | null;
  joinedAt: string;
  reviewedAt: string | null;
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
  } | null;
}

// ─── Territories ───────────────────────────────────────────────────────────────

/** /api/congregations/:id/territories  (list — includes flat joined fields)
 *  /api/territories/:id                (detail — no publisherName / groupName) */
export interface Territory {
  id: string;
  number: string;
  name: string;
  notes: string | null;
  status: string;
  householdsCount: number;
  coveragePercent: string;
  congregationId: string;
  publisherId: string | null;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
  /** Flat joined field — present on list endpoint, absent on detail endpoint */
  publisherName?: string | null;
  /** Flat joined field — present on list endpoint, absent on detail endpoint */
  groupName?: string | null;
}

// ─── Territory requests ────────────────────────────────────────────────────────

/** /api/congregations/:id/territory-requests
 *  Route maps publisherName into a nested publisher object as well. */
export interface TerritoryRequest {
  id: string;
  congregationId: string;
  publisherId: string;
  territoryId: string | null;
  status: string;
  message: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  responseMessage: string | null;
  requestedAt: string;
  publisherName: string | null;
  publisher: { name: string } | null;
}

// ─── Groups ────────────────────────────────────────────────────────────────────

export interface GroupMember {
  id: string;
  userId: string;
  user: {
    name: string | null;
    email: string | null;
  };
}

/** /api/congregations/:id/groups */
export interface Group {
  id: string;
  congregationId: string;
  name: string;
  createdAt: string;
  members: GroupMember[];
}

// ─── Assignments ───────────────────────────────────────────────────────────────

/** /api/territories/:id/assignments — flat joined fields (no nested objects) */
export interface Assignment {
  id: string;
  territoryId: string;
  userId: string | null;
  serviceGroupId: string | null;
  status: string;
  assignedAt: string | null;
  dueAt: string | null;
  returnedAt: string | null;
  notes: string | null;
  coverageAtAssignment: string;
  createdAt: string;
  assigneeName: string | null;
  assigneeEmail: string | null;
  groupName: string | null;
}

// ─── Notifications ─────────────────────────────────────────────────────────────

/** /api/notifications — the route returns { data: Notification[], unreadCount }
 *  but apiClient unwraps res.data.data, so the hook receives Notification[].
 *  unreadCount is derived locally by filtering isRead. */
export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: string | null;
  isRead: boolean;
  createdAt: string;
}

// ─── Reports ───────────────────────────────────────────────────────────────────

/** /api/congregations/:id/reports/coverage */
export interface CoverageTerritory {
  id: string;
  number: string;
  name: string;
  status: string;
  coveragePercent: number;
  publisherName?: string;
}

export interface CoverageReport {
  totalTerritories: number;
  avgCoveragePercent: number;
  byStatus: {
    available: number;
    assigned: number;
    completed: number;
    archived: number;
  };
  territories: CoverageTerritory[];
}

/** /api/congregations/:id/reports/publishers */
export interface PublisherStats {
  userId: string;
  name: string;
  email: string;
  activeAssignments: number;
  totalCompleted: number;
  territories: string[];
}

export interface PublishersReport {
  publishers: PublisherStats[];
}

/** /api/congregations/:id/reports/activity */
export interface ActivityAssignment {
  id: string;
  territoryName: string;
  territoryNumber: string;
  publisherName: string;
  assignedAt: string | null;
}

export interface ActivityReturn {
  id: string;
  territoryName: string;
  territoryNumber: string;
  publisherName: string;
  returnedAt: string | null;
  coverageAtAssignment: number;
}

export interface ActivityReport {
  assignments: ActivityAssignment[];
  returns: ActivityReturn[];
}
