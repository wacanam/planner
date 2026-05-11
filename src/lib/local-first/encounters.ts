import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS } from '@/lib/firebase/schema';
import { getHouseholdById } from './households';
import { getAllVisits } from './visits';
import { isoDate, nowIso, nullableString } from './shared';
import type { LocalEncounter, LocalHousehold, LocalVisit } from './types';
import type { Encounter } from '@/types/api';

export interface CreateEncounterInput {
  visitId?: string | null;
  householdId?: string | null;
  encounterDate?: string | null;
  name?: string | null;
  gender?: string | null;
  ageGroup?: string | null;
  role?: string | null;
  response: string;
  languageSpoken?: string | null;
  topicDiscussed?: string | null;
  literatureAccepted?: string | null;
  bibleStudyInterest?: boolean | null;
  returnVisitRequested?: boolean | null;
  nextVisitNotes?: string | null;
  notes?: string | null;
}

export interface EncounterFilters {
  visitId?: string | null;
  householdId?: string | null;
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

function filterEncounter(record: LocalEncounter, filters?: EncounterFilters) {
  if (record.deletedAt) return false;
  if (filters?.visitId && record.visitId !== filters.visitId) return false;
  if (filters?.householdId && record.householdId !== filters.householdId) return false;
  return true;
}

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
    nextVisitNotes: record.nextVisitNotes,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    householdAddress: household?.address ?? null,
    householdCity: household?.city ?? null,
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
    visitId: encounter.visitId,
    visitServerId: encounter.visitId,
    householdId: encounter.householdId,
    householdServerId: encounter.householdId,
    encounterDate: isoDate(encounterDate, now),
    name: encounter.name ?? null,
    gender: encounter.gender ?? null,
    ageGroup: encounter.ageGroup ?? null,
    role: encounter.role ?? null,
    response: encounter.response,
    languageSpoken: encounter.languageSpoken ?? null,
    topicDiscussed: encounter.topicDiscussed ?? null,
    literatureAccepted: encounter.literatureAccepted ?? null,
    bibleStudyInterest: Boolean(encounter.bibleStudyInterest),
    returnVisitRequested: Boolean(encounter.returnVisitRequested),
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
    userId: null,
    visitId: nullableString(input.visitId),
    visitServerId: visit?.serverId ?? null,
    householdId,
    householdServerId: household?.serverId ?? null,
    encounterDate: nullableString(input.encounterDate) ?? now,
    name: nullableString(input.name),
    gender: nullableString(input.gender),
    ageGroup: nullableString(input.ageGroup),
    role: nullableString(input.role),
    response: input.response,
    languageSpoken: nullableString(input.languageSpoken),
    topicDiscussed: nullableString(input.topicDiscussed),
    literatureAccepted: nullableString(input.literatureAccepted),
    bibleStudyInterest: Boolean(input.bibleStudyInterest),
    returnVisitRequested: Boolean(input.returnVisitRequested),
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
  if (input.encounterDate !== undefined) updates.encounterDate = nullableString(input.encounterDate) ?? nowIso();
  if (input.name !== undefined) updates.name = nullableString(input.name);
  if (input.gender !== undefined) updates.gender = nullableString(input.gender);
  if (input.ageGroup !== undefined) updates.ageGroup = nullableString(input.ageGroup);
  if (input.role !== undefined) updates.role = nullableString(input.role);
  if (input.response !== undefined) updates.response = input.response;
  if (input.languageSpoken !== undefined) updates.languageSpoken = nullableString(input.languageSpoken);
  if (input.topicDiscussed !== undefined) updates.topicDiscussed = nullableString(input.topicDiscussed);
  if (input.literatureAccepted !== undefined) {
    updates.literatureAccepted = nullableString(input.literatureAccepted);
  }
  if (input.bibleStudyInterest !== undefined) updates.bibleStudyInterest = Boolean(input.bibleStudyInterest);
  if (input.returnVisitRequested !== undefined) {
    updates.returnVisitRequested = Boolean(input.returnVisitRequested);
  }
  if (input.nextVisitNotes !== undefined) updates.nextVisitNotes = nullableString(input.nextVisitNotes);
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
  const encounterQuery = constraints.length > 0 ? query(encounterCollection(), ...constraints) : encounterCollection();

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
    nextVisitNotes: record.nextVisitNotes,
    notes: record.notes,
  };
}

export async function markEncounterSynced(_document: unknown, _encounter: Encounter): Promise<void> {
  return undefined;
}