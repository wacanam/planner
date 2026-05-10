export interface FirestoreRecordMetadata {
  id: string;
  serverId: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LocalHousehold extends FirestoreRecordMetadata {
  congregationId: string | null;
  territoryId: string | null;
  address: string;
  houseNumber: string | null;
  unitNumber: string | null;
  streetName: string;
  city: string;
  postalCode: string | null;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
  type: string;
  floor: number | null;
  occupantsCount: number | null;
  languages: string | null;
  bestTimeToCall: string | null;
  status: string;
  lastVisitDate: string | null;
  lastVisitOutcome: string | null;
  notes: string | null;
  lwpNotes: string | null;
  createdById: string | null;
  updatedById: string | null;
}

export interface LocalVisit extends FirestoreRecordMetadata {
  userId: string | null;
  householdId: string;
  householdServerId: string | null;
  visitDate: string;
  outcome: string;
  householdStatusBefore: string | null;
  householdStatusAfter: string | null;
  duration: number | null;
  literatureLeft: string | null;
  bibleTopicDiscussed: string | null;
  returnVisitPlanned: boolean;
  nextVisitDate: string | null;
  nextVisitNotes: string | null;
  assignmentId: string | null;
  notes: string | null;
}

export interface LocalEncounter extends FirestoreRecordMetadata {
  userId: string | null;
  visitId: string | null;
  visitServerId: string | null;
  householdId: string | null;
  householdServerId: string | null;
  encounterDate: string;
  name: string | null;
  gender: string | null;
  ageGroup: string | null;
  role: string | null;
  response: string;
  languageSpoken: string | null;
  topicDiscussed: string | null;
  literatureAccepted: string | null;
  bibleStudyInterest: boolean;
  returnVisitRequested: boolean;
  nextVisitNotes: string | null;
  notes: string | null;
}