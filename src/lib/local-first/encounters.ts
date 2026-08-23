import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  query,
  type Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS } from '@/lib/firebase/schema';
import { canViewAllCongregationRecords } from '@/lib/permissions';
import type { Encounter } from '@/types/api';
import { getHouseholdById } from './households';
import { isoDate, nowIso, nullableString } from './shared';
import type { LocalEncounter, LocalHousehold, LocalVisit } from './types';
import { getAllVisits } from './visits';

export interface CreateEncounterInput {
  userId?: string | null;
  publisherName?: string | null;
  visitId?: string | null;
  householdId?: string | null;
  contactId?: string | null;
  encounterDate?: string | null;
  name?: string | null;
  gender?: string | null;
  ageGroup?: string | null;
  role?: string | null;
  response: Encounter['response'];
  languageSpoken?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  bestTimeToCall?: string | null;
  locationDescription?: string | null;
  topicDiscussed?: string | null;
  literatureAccepted?: string | null;
  bibleStudyInterest?: boolean;
  bibleStudyPublication?: string | null;
  bibleStudyLesson?: string | null;
  returnVisitRequested?: boolean;
  nextVisitDate?: string | null;
  nextVisitTime?: string | null;
  nextVisitNotes?: string | null;
  notes?: string | null;
}

export interface EncounterFilters {
  visitId?: string | null;
  householdId?: string | null;
  userId?: string | null;
  userRole?: string | null;
  groupMateUserIds?: string[] | Set<string> | null;
}

function encounterCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.encounters);
}

function encounterDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.encounters, id);
}

function encounterFromSnapshot(snapshot: QueryDocumentSnapshot): LocalEncounter {
  return snapshot.data() as LocalEncounter;
}

export function filterEncounter(record: LocalEncounter, filters?: EncounterFilters): boolean {
  if (record.deletedAt) return false;
  if (!filters) return true;
  if (filters.visitId && record.visitId !== filters.visitId) return false;
  if (filters.householdId && record.householdId !== filters.householdId) return false;
  if (
    filters.userId &&
    !canViewAllCongregationRecords(filters.userRole) &&
    record.userId !== filters.userId &&
    !(
      filters.groupMateUserIds &&
      record.userId &&
      (filters.groupMateUserIds instanceof Set
        ? filters.groupMateUserIds.has(record.userId)
        : filters.groupMateUserIds.includes(record.userId))
    )
  ) {
    return false;
  }
  return true;
}

export const matchesEncounterFilters = filterEncounter;

export function toEncounterView(
  record: LocalEncounter,
  household?: LocalHousehold | null,
  visit?: LocalVisit | null
): Encounter {
  return {
    id: record.id,
    visitId: record.visitId,
    householdId: record.householdId,
    userId: record.userId ?? '',
    publisherName: record.publisherName ?? household?.creatorName ?? null,
    name: record.name,
    gender: record.gender,
    ageGroup: record.ageGroup,
    role: record.role,
    response: record.response,
    languageSpoken: record.languageSpoken,
    language: record.languageSpoken,
    phoneNumber: record.phoneNumber ?? null,
    email: record.email ?? null,
    bestTimeToCall: record.bestTimeToCall ?? null,
    locationDescription: record.locationDescription ?? null,
    topicDiscussed: record.topicDiscussed,
    topicsDiscussed: record.topicDiscussed,
    literatureAccepted: record.literatureAccepted,
    literatureOffered: record.literatureAccepted,
    bibleStudyInterest: record.bibleStudyInterest,
    bibleStudyPublication: record.bibleStudyPublication ?? null,
    bibleStudyLesson: record.bibleStudyLesson ?? null,
    returnVisitRequested: record.returnVisitRequested,
    nextVisitDate: record.nextVisitDate ?? null,
    nextVisitTime: record.nextVisitTime ?? null,
    nextVisitNotes: record.nextVisitNotes,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    householdAddress: household?.address ?? null,
    householdCity: household?.city ?? null,
    houseNumber: household?.houseNumber ?? null,
    unitNumber: household?.unitNumber ?? null,
    streetName: household?.streetName ?? null,
    visitDate: visit?.visitDate ?? record.encounterDate,
    visitOutcome: visit?.outcome ?? null,
  };
}

export function localEncounterFromApi(encounter: Encounter, existingId?: string): LocalEncounter {
  const now = nowIso();
  const encounterDate = encounter.visitDate ?? encounter.createdAt;
  return {
    id: existingId ?? encounter.id,
    serverId: encounter.id,
    userId: encounter.userId ?? null,
    publisherName: encounter.publisherName ?? null,
    visitId: encounter.visitId,
    visitServerId: encounter.visitId,
    householdId: encounter.householdId,
    householdServerId: encounter.householdId,
    contactId: encounter.contactId ?? null,
    contactServerId: encounter.contactId ?? null,
    encounterDate: isoDate(encounterDate, now),
    name: encounter.name ?? null,
    gender: encounter.gender ?? null,
    ageGroup: encounter.ageGroup ?? null,
    role: encounter.role ?? null,
    response: encounter.response,
    languageSpoken: encounter.languageSpoken ?? null,
    phoneNumber: encounter.phoneNumber ?? null,
    email: encounter.email ?? null,
    bestTimeToCall: encounter.bestTimeToCall ?? null,
    locationDescription: encounter.locationDescription ?? null,
    topicDiscussed: encounter.topicDiscussed ?? null,
    literatureAccepted: encounter.literatureAccepted ?? null,
    bibleStudyInterest: Boolean(encounter.bibleStudyInterest),
    bibleStudyPublication: encounter.bibleStudyPublication ?? null,
    bibleStudyLesson: encounter.bibleStudyLesson ?? null,
    returnVisitRequested: Boolean(encounter.returnVisitRequested),
    nextVisitDate: encounter.nextVisitDate ?? null,
    nextVisitTime: encounter.nextVisitTime ?? null,
    nextVisitNotes: encounter.nextVisitNotes ?? null,
    notes: encounter.notes ?? null,
    deletedAt: null,
    createdAt: isoDate(encounter.createdAt, now),
    updatedAt: isoDate(encounter.updatedAt, now),
  };
}

export async function createEncounter(input: CreateEncounterInput): Promise<LocalEncounter> {
  const now = nowIso();
  const visits = input.visitId ? await getAllVisits({}) : [];
  const visit = input.visitId ? visits.find((item) => item.id === input.visitId) : null;
  const householdId = nullableString(input.householdId) ?? visit?.householdId ?? null;
  const household = householdId ? await getHouseholdById(householdId) : null;

  const record: LocalEncounter = {
    id: createClientId(),
    serverId: null,
    userId: nullableString(input.userId),
    publisherName: nullableString(input.publisherName) ?? household?.creatorName ?? null,
    visitId: nullableString(input.visitId),
    visitServerId: visit?.serverId ?? null,
    householdId,
    householdServerId: household?.serverId ?? null,
    contactId: nullableString(input.contactId),
    contactServerId: nullableString(input.contactId),
    encounterDate: nullableString(input.encounterDate) ?? now,
    name: nullableString(input.name),
    gender: nullableString(input.gender),
    ageGroup: nullableString(input.ageGroup),
    role: nullableString(input.role),
    response: input.response,
    languageSpoken: nullableString(input.languageSpoken),
    phoneNumber: nullableString(input.phoneNumber),
    email: nullableString(input.email),
    bestTimeToCall: nullableString(input.bestTimeToCall),
    locationDescription: nullableString(input.locationDescription),
    topicDiscussed: nullableString(input.topicDiscussed),
    literatureAccepted: nullableString(input.literatureAccepted),
    bibleStudyInterest: Boolean(input.bibleStudyInterest),
    bibleStudyPublication: nullableString(input.bibleStudyPublication),
    bibleStudyLesson: nullableString(input.bibleStudyLesson),
    returnVisitRequested: Boolean(input.returnVisitRequested),
    nextVisitDate: nullableString(input.nextVisitDate),
    nextVisitTime: nullableString(input.nextVisitTime),
    nextVisitNotes: nullableString(input.nextVisitNotes),
    notes: nullableString(input.notes),
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await writeBatch(getPlannerFirestore()).set(encounterDocument(record.id), record).commit();
  return record;
}

export async function applyRemoteEncounters(encounters: Encounter[]): Promise<number> {
  const batch = writeBatch(getPlannerFirestore());
  for (const encounter of encounters) {
    const local = localEncounterFromApi(encounter);
    batch.set(encounterDocument(local.id), local, { merge: true });
  }
  await batch.commit();
  return encounters.length;
}

export async function updateEncounter(
  id: string,
  input: Partial<CreateEncounterInput>
): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: nowIso() };
  if (input.visitId !== undefined) updates.visitId = nullableString(input.visitId);
  if (input.householdId !== undefined) updates.householdId = nullableString(input.householdId);
  if (input.encounterDate !== undefined)
    updates.encounterDate = nullableString(input.encounterDate) ?? nowIso();
  if (input.name !== undefined) updates.name = nullableString(input.name);
  if (input.gender !== undefined) updates.gender = nullableString(input.gender);
  if (input.ageGroup !== undefined) updates.ageGroup = nullableString(input.ageGroup);
  if (input.role !== undefined) updates.role = nullableString(input.role);
  if (input.response !== undefined) updates.response = input.response;
  if (input.languageSpoken !== undefined)
    updates.languageSpoken = nullableString(input.languageSpoken);
  if (input.phoneNumber !== undefined) updates.phoneNumber = nullableString(input.phoneNumber);
  if (input.email !== undefined) updates.email = nullableString(input.email);
  if (input.bestTimeToCall !== undefined)
    updates.bestTimeToCall = nullableString(input.bestTimeToCall);
  if (input.locationDescription !== undefined)
    updates.locationDescription = nullableString(input.locationDescription);
  if (input.topicDiscussed !== undefined)
    updates.topicDiscussed = nullableString(input.topicDiscussed);
  if (input.literatureAccepted !== undefined) {
    updates.literatureAccepted = nullableString(input.literatureAccepted);
  }
  if (input.bibleStudyInterest !== undefined)
    updates.bibleStudyInterest = Boolean(input.bibleStudyInterest);
  if (input.bibleStudyPublication !== undefined)
    updates.bibleStudyPublication = nullableString(input.bibleStudyPublication);
  if (input.bibleStudyLesson !== undefined)
    updates.bibleStudyLesson = nullableString(input.bibleStudyLesson);
  if (input.returnVisitRequested !== undefined) {
    updates.returnVisitRequested = Boolean(input.returnVisitRequested);
  }
  if (input.nextVisitDate !== undefined)
    updates.nextVisitDate = nullableString(input.nextVisitDate);
  if (input.nextVisitTime !== undefined)
    updates.nextVisitTime = nullableString(input.nextVisitTime);
  if (input.nextVisitNotes !== undefined)
    updates.nextVisitNotes = nullableString(input.nextVisitNotes);
  if (input.notes !== undefined) updates.notes = nullableString(input.notes);
  await updateDoc(encounterDocument(id), updates);
}

export async function getAllEncounters(filters?: EncounterFilters): Promise<LocalEncounter[]> {
  const snapshot = await getDocs(encounterCollection());
  return snapshot.docs
    .map(encounterFromSnapshot)
    .filter((encounter) => filterEncounter(encounter, filters))
    .sort((left, right) => right.encounterDate.localeCompare(left.encounterDate));
}

export async function getEncountersByVisit(visitId: string): Promise<LocalEncounter[]> {
  return getAllEncounters({ visitId });
}

export async function getEncountersByHousehold(householdId: string): Promise<LocalEncounter[]> {
  return getAllEncounters({ householdId });
}

export function watchEncounters(
  filters: EncounterFilters | undefined,
  onChange: (encounters: LocalEncounter[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const constraints: QueryConstraint[] = [];
  if (filters?.visitId) constraints.push(where('visitId', '==', filters.visitId));
  if (filters?.householdId) constraints.push(where('householdId', '==', filters.householdId));
  const encounterQuery =
    constraints.length > 0 ? query(encounterCollection(), ...constraints) : encounterCollection();

  return onSnapshot(
    encounterQuery,
    { includeMetadataChanges: true },
    (snapshot) => {
      onChange(
        snapshot.docs
          .map(encounterFromSnapshot)
          .filter((encounter) => filterEncounter(encounter, filters))
          .sort((left, right) => right.encounterDate.localeCompare(left.encounterDate))
      );
    },
    onError
  );
}

export async function deleteEncounter(id: string): Promise<void> {
  const now = nowIso();
  await updateDoc(encounterDocument(id), {
    deletedAt: now,
    updatedAt: now,
  });
}

export function encounterPayload(
  record: LocalEncounter,
  householdServerId: string | null,
  visitServerId: string | null
) {
  return {
    clientId: record.id,
    visitId: visitServerId,
    householdId: householdServerId,
    encounterDate: record.encounterDate,
    name: record.name,
    gender: record.gender,
    ageGroup: record.ageGroup,
    role: record.role,
    response: record.response,
    languageSpoken: record.languageSpoken,
    topicDiscussed: record.topicDiscussed,
    literatureAccepted: record.literatureAccepted,
    bibleStudyInterest: record.bibleStudyInterest,
    returnVisitRequested: record.returnVisitRequested,
    nextVisitDate: record.nextVisitDate ?? null,
    nextVisitTime: record.nextVisitTime ?? null,
    nextVisitNotes: record.nextVisitNotes,
    notes: record.notes,
  };
}

export async function markEncounterSynced(
  _document: unknown,
  _encounter: Encounter
): Promise<void> {
  return undefined;
}
