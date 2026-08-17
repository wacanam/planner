// src/types/api.ts
// Shared entity types used by Firestore hooks and application components.

// ─── Map Drawing Annotations ──────────────────────────────────────────────────

export interface MapPoint {
  lat: number;
  lng: number;
}

export interface MapRoad {
  id: string;
  name?: string;
  color?: string;
  points: MapPoint[];
}

export interface MapLandmark {
  id: string;
  type: 'tree' | 'hazard' | 'landmark' | 'gate' | 'school' | 'church' | 'store' | 'other';
  lat: number;
  lng: number;
  label?: string;
}

export interface MapStartFlag {
  lat: number;
  lng: number;
  label?: string;
}

export interface MapBoundaryPolygon {
  id: string;
  name?: string;
  points: MapPoint[];
  color?: string;
}

export interface BoundaryDisplaySettings {
  fillColor?: string;
  fillOpacity?: number;
  maskOpacity?: number;
  strokeColor?: string;
  strokeWeight?: number;
}

export interface TerritoryAnnotations {
  roads?: MapRoad[];
  landmarks?: MapLandmark[];
  startFlag?: MapStartFlag | null;
  boundaries?: MapBoundaryPolygon[];
  boundaryDisplay?: BoundaryDisplaySettings | null;
}

// ─── Congregation ──────────────────────────────────────────────────────────────

export interface Congregation {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  country: string | null;
  defaultLatitude?: number | null;
  defaultLongitude?: number | null;
  status: string;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Members / Join requests ───────────────────────────────────────────────────

export interface Member {
  id: string;
  userId: string;
  congregationId: string;
  congregationRole: string | null;
  groupId?: string | null;
  status: string;
  joinMessage: string | null;
  joinedAt: string;
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
    role: string | null;
    avatarUrl?: string | null;
  } | null;
}

export interface JoinRequest {
  id: string;
  congregationId: string;
  userId: string;
  status: string;
  joinMessage: string | null;
  reviewNote: string | null;
  joinedAt: string;
  reviewedAt: string | null;
  user: {
    id: string | null;
    name: string | null;
    email: string | null;
    avatarUrl?: string | null;
  } | null;
}

// ─── Territories ───────────────────────────────────────────────────────────────

export interface Territory {
  id: string;
  number: string;
  name: string;
  city?: string | null;
  notes: string | null;
  status: string;
  householdsCount: number;
  coveragePercent: string;
  congregationId: string;
  publisherId: string | null;
  groupId: string | null;
  createdAt: string;
  updatedAt: string;
  boundary?: string | null;
  boundaryCoordinates?:
    | Array<{ lat: number; lng: number }>
    | Array<Array<{ lat: number; lng: number }>>
    | null;
  annotations?: TerritoryAnnotations | null;
  publisherName?: string | null;
  groupName?: string | null;
}

// ─── Territory requests ────────────────────────────────────────────────────────

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

export type GroupMemberRole = 'group_overseer' | 'assistant_overseer' | 'member' | string;

export interface GroupMember {
  id: string;
  userId: string;
  role?: GroupMemberRole;
  user: {
    name: string | null;
    email: string | null;
  };
}

export interface Group {
  id: string;
  congregationId: string;
  name: string;
  overseerId?: string | null;
  overseerName?: string | null;
  assistantOverseerId?: string | null;
  assistantOverseerName?: string | null;
  createdAt: string;
  members: GroupMember[];
}

// ─── Assignments ───────────────────────────────────────────────────────────────

export interface Assignment {
  id: string;
  territoryId: string;
  userId: string | null;
  serviceGroupId: string | null;
  status: string;
  endorsementStatus?: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  endorsedBy?: string | null;
  endorsedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  assignedAt: string | null;
  dueAt: string | null;
  returnedAt: string | null;
  notes: string | null;
  coverageAtAssignment: string;
  createdAt: string;
  assigneeName: string | null;
  assigneeEmail: string | null;
  groupName: string | null;
  territoryName?: string | null;
  territoryNumber?: string | null;
  territory?: Territory | null;
}

// ─── Notifications ─────────────────────────────────────────────────────────────

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

// ─── Record Sharing ────────────────────────────────────────────────────────────

export interface HouseholdShare {
  id: string;
  householdId: string;
  householdAddress?: string | null;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  mode: 'collaborate' | 'transfer';
  status: 'pending' | 'accepted' | 'declined' | 'cancelled';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Reports ───────────────────────────────────────────────────────────────────

export type TerritoryHealthStatus = 'fresh' | 'active' | 'dormant' | 'stale';

export interface CoverageTerritory {
  id: string;
  number: string;
  name: string;
  status: string;
  coveragePercent: number;
  householdsCount: number;
  workedDoors: number;
  unworkedDoors: number;
  lastWorkedDate?: string | null;
  assignedAt?: string | null;
  publisherName?: string;
  groupName?: string;
  healthStatus: TerritoryHealthStatus;
  daysSinceWorked: number | null;
}

export interface CoverageReport {
  totalTerritories: number;
  avgCoveragePercent: number;
  totalDoors: number;
  workedDoors: number;
  unworkedDoors: number;
  activeAssignmentRate: number;
  avgTurnaroundDays: number;
  byStatus: {
    available: number;
    assigned: number;
    completed: number;
    archived: number;
  };
  byHealth: {
    fresh: number; // worked < 30 days
    active: number; // worked 30-90 days
    dormant: number; // worked 90-180 days
    stale: number; // worked > 180 days or never
  };
  territories: CoverageTerritory[];
}

export interface S13AssignmentRecord {
  id: string;
  territoryId: string;
  territoryNumber: string;
  territoryName: string;
  assigneeName: string;
  assigneeEmail: string | null;
  isGroupAssignment: boolean;
  groupName: string | null;
  assignedAt: string | null;
  dueAt: string | null;
  returnedAt: string | null;
  coverageAtAssignment: number;
  coverageAtReturn: number;
  durationDays: number | null;
  status: string;
}

export interface GroupReportStats {
  groupId: string;
  name: string;
  overseerName: string | null;
  assistantOverseerName: string | null;
  memberCount: number;
  assignedTerritoriesCount: number;
  totalDoors: number;
  workedDoors: number;
  avgCoveragePercent: number;
  territoryNumbers: string[];
}

export interface DoorAnalyticsReport {
  totalDoors: number;
  workedDoors: number;
  unworkedDoors: number;
  doNotCallCount: number;
  returnVisitsCount: number;
  outcomeCounts: {
    notHome: number;
    contacted: number;
    placedLiterature: number;
    returnVisit: number;
    busy: number;
    doNotCall: number;
    other: number;
  };
  topStreets: {
    streetName: string;
    doorsCount: number;
    workedCount: number;
  }[];
}

export interface PublisherStats {
  userId: string;
  name: string;
  email: string;
  role?: string;
  groupName?: string;
  activeAssignments: number;
  totalCompleted: number;
  totalVisits: number;
  lastActiveDate: string | null;
  territories: string[];
}

export interface PublishersReport {
  publishers: PublisherStats[];
}

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

// ─── User ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  congregationId?: string | null;
  groupId?: string | null;
  isActive: boolean;
  avatarUrl?: string | null;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Visits ────────────────────────────────────────────────────────────────────

export interface Visit {
  id: string;
  userId: string;
  publisherName?: string | null;
  householdId: string;
  visitDate: string;
  outcome: string;
  householdStatusBefore?: string | null;
  householdStatusAfter?: string | null;
  duration?: number | null;
  literatureLeft?: string | null;
  literaturePlaced?: string | null;
  bibleTopicDiscussed?: string | null;
  returnVisitPlanned: boolean;
  nextVisitDate?: string | null;
  nextVisitTime?: string | null;
  nextVisitNotes?: string | null;
  assignmentId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  householdAddress?: string;
  householdCity?: string;
  encounterCount?: number;
}

// ─── Households ────────────────────────────────────────────────────────────────

export interface Household {
  id: string;
  name?: string | null;
  address: string;
  houseNumber?: string | null;
  unitNumber?: string | null;
  streetName: string;
  city: string;
  postalCode?: string | null;
  country?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  location?: string | null;
  type: string;
  floor?: number | null;
  occupantsCount?: number | null;
  languages?: string | null;
  bestTimeToCall?: string | null;
  status: string;
  lastVisitDate?: string | null;
  lastVisitOutcome?: string | null;
  notes?: string | null;
  lwpNotes?: string | null;
  createdById?: string | null;
  creatorName?: string | null;
  collaboratorIds?: string[];
  territoryId?: string | null;
  congregationId?: string | null;
  totalVisitsCount?: number;
  totalEncountersCount?: number;
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Encounters ────────────────────────────────────────────────────────────────

export type EncounterLocationType = 'household' | 'street' | 'informal' | 'public_witnessing';

export interface Encounter {
  id: string;
  visitId: string | null;
  householdId: string | null;
  territoryId?: string | null;
  congregationId?: string | null;
  locationType?: EncounterLocationType;
  locationDescription?: string | null;
  userId: string;
  publisherName?: string | null;
  name?: string | null;
  gender?: string | null;
  ageGroup?: string | null;
  role?: string | null;
  response: string;
  language?: string | null;
  languageSpoken?: string | null;
  topicsDiscussed?: string | null;
  topicDiscussed?: string | null;
  literatureOffered?: string | null;
  literatureAccepted?: string | null;
  bibleStudyInterest: boolean;
  returnVisitRequested: boolean;
  nextVisitNotes?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  householdAddress?: string | null;
  householdCity?: string | null;
  visitDate?: string | null;
  visitOutcome?: string | null;
}

// ─── Account & Congregation Requests ──────────────────────────────────────────

export type AccountRequestType = 'delete_account' | 'leave_congregation';
export type AccountRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface AccountRequest {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userAvatarUrl?: string | null;
  type: AccountRequestType;
  congregationId?: string | null;
  congregationName?: string | null;
  reason?: string | null;
  status: AccountRequestStatus;
  requestedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewNote?: string | null;
}

