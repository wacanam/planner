// mobile/src/types/api.ts
// Shared entity types used by mobile Firestore hooks and application screens.

export interface MapPoint {
  lat: number;
  lng: number;
}

export type RoadType =
  | 'street'
  | 'avenue'
  | 'highway'
  | 'dirt'
  | 'walkway'
  | 'alley'
  | 'bridge'
  | 'stairs'
  | 'trail'
  | 'waterway';

export interface MapRoad {
  id: string;
  name?: string;
  color?: string;
  points: MapPoint[];
  createdById?: string | null;
  creatorName?: string | null;
  createdAt?: string | number | null;
  updatedById?: string | null;
  updatedByName?: string | null;
  updatedAt?: string | number | null;
}

export type LandmarkType =
  | 'tree'
  | 'hazard'
  | 'landmark'
  | 'gate'
  | 'school'
  | 'church'
  | 'store'
  | 'hospital'
  | 'restaurant'
  | 'park'
  | 'government'
  | 'water'
  | 'bridge'
  | 'gas_station'
  | 'transit'
  | 'tower'
  | 'building'
  | 'other';

export interface MapLandmark {
  id: string;
  type: LandmarkType;
  lat: number;
  lng: number;
  label?: string;
  createdById?: string | null;
  creatorName?: string | null;
  createdAt?: string | number | null;
  updatedById?: string | null;
  updatedByName?: string | null;
  updatedAt?: string | number | null;
}

export interface MapStartFlag {
  lat: number;
  lng: number;
  label?: string;
  createdById?: string | null;
  creatorName?: string | null;
  createdAt?: string | number | null;
  updatedById?: string | null;
  updatedByName?: string | null;
  updatedAt?: string | number | null;
}

export interface MapBoundaryPolygon {
  id: string;
  name?: string;
  points: MapPoint[];
  color?: string;
  createdById?: string | null;
  creatorName?: string | null;
  createdAt?: string | number | null;
  updatedById?: string | null;
  updatedByName?: string | null;
  updatedAt?: string | number | null;
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
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedByRole?: string | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  declinedBy?: string | null;
  declinedByName?: string | null;
  reviewNote?: string | null;
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
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedByRole?: string | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  declinedBy?: string | null;
  declinedByName?: string | null;
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
  type?: string | null;
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
  congregationId?: string | null;
  userId: string | null;
  serviceGroupId: string | null;
  status: string;
  endorsementStatus?: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  endorsementType?: 'assign' | 'return' | 'revoke';
  endorsedBy?: string | null;
  endorsedByName?: string | null;
  endorsedAt?: string | null;
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedByName?: string | null;
  rejectedAt?: string | null;
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

export type NotificationSoundStyle = 'chime' | 'ding' | 'pop' | 'subtle';

export interface UserNotificationSettings {
  soundEnabled: boolean;
  soundStyle: NotificationSoundStyle;
  territoryUpdates: boolean;
  shareUpdates: boolean;
  membershipUpdates: boolean;
  accountUpdates: boolean;
  systemAnnouncements: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: UserNotificationSettings = {
  soundEnabled: true,
  soundStyle: 'chime',
  territoryUpdates: true,
  shareUpdates: true,
  membershipUpdates: true,
  accountUpdates: true,
  systemAnnouncements: true,
};

export interface NotificationDataPayload {
  congregationId?: string;
  territoryId?: string;
  territoryNumber?: string;
  assignmentId?: string;
  shareId?: string;
  householdId?: string;
  mode?: string;
  requestId?: string;
  requestType?: string;
  role?: string;
  url?: string;
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data: string | null;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
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
  mode: 'collaborate' | 'transfer' | 'view' | string;
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
  isWorkedInServiceYear?: boolean;
}

export interface CoverageReport {
  totalTerritories: number;
  avgCoveragePercent: number;
  totalDoors: number;
  workedDoors: number;
  unworkedDoors: number;
  activeAssignmentRate: number;
  avgTurnaroundDays: number;
  serviceYear?: number | 'all';
  availableServiceYears?: number[];
  unworkedInCurrentSYCount?: number;
  workedInCurrentSYCount?: number;
  byStatus: {
    available: number;
    assigned: number;
    completed: number;
    archived: number;
  };
  byHealth: {
    fresh: number;
    active: number;
    dormant: number;
    stale: number;
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
  serviceYear?: number;
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

export interface MinistryTeachingMetrics {
  interestedContacts: {
    total: number;
    receptive: number;
    studyInterested: number;
    returnVisitRequested: number;
  };
  interestedCount: number;
  returnVisits: {
    total: number;
    visited: number;
    missed: number;
    upcoming: number;
  };
  bibleStudies: {
    conducted: number;
    offered: number;
    missed: number;
    activeCount: number;
  };
}

export interface GroupTeachingStats {
  groupId: string;
  name: string;
  overseerName: string | null;
  memberCount: number;
  metrics: MinistryTeachingMetrics;
}

export interface PublisherTeachingStats {
  userId: string;
  name: string;
  email: string;
  role?: string;
  groupName?: string;
  metrics: MinistryTeachingMetrics;
}

export interface TeachingAnalyticsReport {
  totals: MinistryTeachingMetrics;
  byGroup: GroupTeachingStats[];
  byPublisher: PublisherTeachingStats[];
  serviceYear?: number | 'all';
}

export interface DoorAnalyticsReport {
  totalDoors: number;
  workedDoors: number;
  unworkedDoors: number;
  doNotCallCount: number;
  returnVisitsCount: number;
  returnVisitsMissedCount?: number;
  studyConductedCount?: number;
  studyOfferedCount?: number;
  studyMissedCount?: number;
  interestedCount?: number;
  foreignLanguageCount?: number;
  vacantCount?: number;
  inaccessibleCount?: number;
  busyCount?: number;
  outcomeCounts: {
    notHome: number;
    contacted: number;
    placedLiterature: number;
    returnVisit: number;
    returnVisitMissed?: number;
    busy: number;
    doNotCall: number;
    studyConducted: number;
    studyOffered?: number;
    studyMissed?: number;
    minorOnly: number;
    foreignLanguage: number;
    inaccessible: number;
    vacant: number;
    moved: number;
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
  notificationSettings?: UserNotificationSettings;
  createdAt: string;
  updatedAt: string;
}

// ─── Domain Status & Outcomes ──────────────────────────────────────────────────

export type HouseholdStatus =
  | 'new'
  | 'available'
  | 'return_visit'
  | 'bible_study'
  | 'not_home'
  | 'busy'
  | 'do_not_visit'
  | 'foreign_language'
  | 'inaccessible'
  | 'vacant'
  | 'moved'
  | 'inactive';

export type VisitOutcome =
  | 'answered'
  | 'not_home'
  | 'busy'
  | 'return_visit_completed'
  | 'return_visit_missed'
  | 'study_conducted'
  | 'study_offered'
  | 'study_missed'
  | 'literature_placed'
  | 'minor_only'
  | 'foreign_language'
  | 'inaccessible'
  | 'vacant'
  | 'do_not_visit'
  | 'moved'
  | 'other';

export type EncounterResponse =
  | 'receptive'
  | 'study_accepted'
  | 'study_offered'
  | 'return_visit_requested'
  | 'neutral'
  | 'busy'
  | 'not_interested'
  | 'hostile'
  | 'do_not_visit_demanded'
  | 'foreign_speaker'
  | 'minor'
  | 'moving_away';

// ─── Visits ────────────────────────────────────────────────────────────────────

export interface Visit {
  id: string;
  userId: string;
  congregationId?: string | null;
  publisherName?: string | null;
  householdId: string;
  visitDate: string;
  outcome: VisitOutcome | string;
  householdStatusBefore?: HouseholdStatus | string | null;
  householdStatusAfter?: HouseholdStatus | string | null;
  duration?: number | null;
  literatureLeft?: string | null;
  literaturePlaced?: string | null;
  bibleTopicDiscussed?: string | null;
  returnVisitPlanned: boolean;
  nextVisitDate?: string | null;
  nextVisitTime?: string | null;
  nextVisitNotes?: string | null;
  scheduledAppointmentType?: 'return_visit' | 'bible_study' | null;
  bibleStudyStatus?: 'conducted' | 'offered' | 'missed' | 'none' | null;
  studyOffered?: boolean;
  isAppointmentMissed?: boolean;
  assignmentId?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  householdAddress?: string;
  householdCity?: string;
  houseNumber?: string | null;
  unitNumber?: string | null;
  streetName?: string | null;
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
  latitude?: number | string | null;
  longitude?: number | string | null;
  type?: string | null;
  floor?: number | null;
  occupantsCount?: number | null;
  languages?: string | null;
  bestTimeToCall?: string | null;
  status: HouseholdStatus | string;
  notes?: string | null;
  lwpNotes?: string | null;
  lastVisitDate?: string | null;
  lastVisitOutcome?: VisitOutcome | string | null;
  territoryId?: string | null;
  congregationId?: string | null;
  createdById?: string | null;
  creatorName?: string | null;
  collaboratorIds?: string[] | null;
  readOnlyUserIds?: string[] | null;
  transferredFrom?: string | null;
  transferredFromId?: string | null;
  transferredAt?: string | null;
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
  response: EncounterResponse | string;
  language?: string | null;
  languageSpoken?: string | null;
  topicsDiscussed?: string | null;
  topicDiscussed?: string | null;
  literatureOffered?: string | null;
  literatureAccepted?: string | null;
  bibleStudyInterest: boolean;
  studyOffered?: boolean;
  returnVisitRequested: boolean;
  nextVisitNotes?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  householdAddress?: string | null;
  householdCity?: string | null;
  houseNumber?: string | null;
  unitNumber?: string | null;
  streetName?: string | null;
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

// ─── Invitations ─────────────────────────────────────────────────────────────

export type InvitationType = 'congregation' | 'system_admin';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Invitation {
  id: string; // Unique token / invite code
  type: InvitationType;
  congregationId?: string | null;
  congregationName?: string | null;
  email?: string | null;
  congregationRole?: string | null;
  groupId?: string | null;
  groupName?: string | null;
  groupRole?: string | null;
  systemRole?: string | null;
  invitedBy: string;
  invitedByName: string;
  invitedByRole: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  acceptedAt?: string | null;
  acceptedByUserId?: string | null;
  acceptedByUserName?: string | null;
}

