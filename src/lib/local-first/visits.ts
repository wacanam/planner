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
import { isoDate, nowIso, nullableNumber, nullableString } from './shared';
import type { LocalHousehold, LocalVisit } from './types';
import type { Visit } from '@/types/api';

export interface CreateVisitInput {
  householdId: string;
  assignmentId?: string | null;
  outcome: string;
  householdStatusAfter?: string | null;
  duration?: number | null;
  literatureLeft?: string | null;
  bibleTopicDiscussed?: string | null;
  returnVisitPlanned?: boolean | null;
  nextVisitDate?: string | null;
  nextVisitNotes?: string | null;
  notes?: string | null;
}

export interface VisitFilters {
  householdId?: string | null;
  assignmentId?: string | null;
}

function visitCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.visits);
}

function visitDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.visits, id);
}

function visitFromSnapshot(snapshot: QueryDocumentSnapshot): LocalVisit {
  return snapshot.data() as LocalVisit;
}

function filterVisit(record: LocalVisit, filters?: VisitFilters) {
  if (record.deletedAt) return false;
  if (filters?.householdId && record.householdId !== filters.householdId) return false;
  if (filters?.assignmentId && record.assignmentId !== filters.assignmentId) return false;
  return true;
}

export function toVisitView(
  record: LocalVisit,
  household?: LocalHousehold | null
): Visit {
  return {
    id: record.id,
    userId: record.userId ?? '',
    householdId: record.householdId,
    assignmentId: record.assignmentId,
    visitDate: record.visitDate,
    outcome: record.outcome,
    householdStatusBefore: record.householdStatusBefore,
    householdStatusAfter: record.householdStatusAfter,
    duration: record.duration,
    literatureLeft: record.literatureLeft,
    bibleTopicDiscussed: record.bibleTopicDiscussed,
    returnVisitPlanned: record.returnVisitPlanned,
    nextVisitDate: record.nextVisitDate,
    nextVisitNotes: record.nextVisitNotes,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    householdAddress: household?.address,
    householdCity: household?.city ?? undefined,
  };
}

export function localVisitFromApi(visit: Visit, existingId?: string): LocalVisit {
  const now = nowIso();
  return {
    id: existingId ?? visit.id,
    serverId: visit.id,
    userId: visit.userId ?? null,
    householdId: visit.householdId,
    householdServerId: visit.householdId,
    assignmentId: visit.assignmentId ?? null,
    visitDate: isoDate(visit.visitDate, now),
    outcome: visit.outcome,
    householdStatusBefore: visit.householdStatusBefore ?? null,
    householdStatusAfter: visit.householdStatusAfter ?? null,
    duration: nullableNumber(visit.duration),
    literatureLeft: visit.literatureLeft ?? null,
    bibleTopicDiscussed: visit.bibleTopicDiscussed ?? null,
    returnVisitPlanned: Boolean(visit.returnVisitPlanned),
    nextVisitDate: visit.nextVisitDate ?? null,
    nextVisitNotes: visit.nextVisitNotes ?? null,
    notes: visit.notes ?? null,
    deletedAt: null,
    createdAt: isoDate(visit.createdAt, now),
    updatedAt: isoDate(visit.updatedAt, now),
  };
}

export async function createVisit(input: CreateVisitInput): Promise<LocalVisit> {
  const now = nowIso();
  const household = await getHouseholdById(input.householdId);
  const record: LocalVisit = {
    id: createClientId(),
    serverId: null,
    userId: null,
    householdId: input.householdId,
    householdServerId: household?.serverId ?? input.householdId,
    assignmentId: nullableString(input.assignmentId),
    visitDate: now,
    outcome: input.outcome,
    householdStatusBefore: household?.status ?? null,
    householdStatusAfter: nullableString(input.householdStatusAfter),
    duration: nullableNumber(input.duration),
    literatureLeft: nullableString(input.literatureLeft),
    bibleTopicDiscussed: nullableString(input.bibleTopicDiscussed),
    returnVisitPlanned: Boolean(input.returnVisitPlanned),
    nextVisitDate: nullableString(input.nextVisitDate),
    nextVisitNotes: nullableString(input.nextVisitNotes),
    notes: nullableString(input.notes),
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  const batch = writeBatch(getPlannerFirestore());
  batch.set(visitDocument(record.id), record);

  if (household) {
    batch.set(
      doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.households, household.id),
      {
        lastVisitDate: record.visitDate,
        lastVisitOutcome: record.outcome,
        status: record.householdStatusAfter ?? household.status ?? 'new',
        updatedAt: now,
      },
      { merge: true }
    );
  }

  await batch.commit();
  return record;
}

export async function applyRemoteVisits(visits: Visit[]): Promise<number> {
  const batch = writeBatch(getPlannerFirestore());
  for (const visit of visits) {
    const local = localVisitFromApi(visit);
    batch.set(visitDocument(local.id), local, { merge: true });
  }
  await batch.commit();
  return visits.length;
}

export async function updateVisit(id: string, input: Partial<CreateVisitInput>): Promise<void> {
  const now = nowIso();
  const updates: Record<string, unknown> = { updatedAt: now };
  if (input.outcome !== undefined) updates.outcome = input.outcome;
  if (input.householdStatusAfter !== undefined) {
    updates.householdStatusAfter = nullableString(input.householdStatusAfter);
  }
  if (input.duration !== undefined) updates.duration = nullableNumber(input.duration);
  if (input.literatureLeft !== undefined) updates.literatureLeft = nullableString(input.literatureLeft);
  if (input.bibleTopicDiscussed !== undefined) {
    updates.bibleTopicDiscussed = nullableString(input.bibleTopicDiscussed);
  }
  if (input.returnVisitPlanned !== undefined) updates.returnVisitPlanned = Boolean(input.returnVisitPlanned);
  if (input.nextVisitDate !== undefined) updates.nextVisitDate = nullableString(input.nextVisitDate);
  if (input.nextVisitNotes !== undefined) updates.nextVisitNotes = nullableString(input.nextVisitNotes);
  if (input.notes !== undefined) updates.notes = nullableString(input.notes);
  if (input.assignmentId !== undefined) updates.assignmentId = nullableString(input.assignmentId);
  await updateDoc(visitDocument(id), updates);
}

export async function getAllVisits(filters?: VisitFilters): Promise<LocalVisit[]> {
  const snapshot = await getDocs(visitCollection());
  return snapshot.docs
    .map(visitFromSnapshot)
    .filter((visit) => filterVisit(visit, filters))
    .sort((left, right) => right.visitDate.localeCompare(left.visitDate));
}

export async function getVisitsByHousehold(householdId: string): Promise<LocalVisit[]> {
  return getAllVisits({ householdId });
}

export function watchVisits(
  filters: VisitFilters | undefined,
  onChange: (visits: LocalVisit[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const constraints: QueryConstraint[] = [];
  if (filters?.householdId) constraints.push(where('householdId', '==', filters.householdId));
  if (filters?.assignmentId) constraints.push(where('assignmentId', '==', filters.assignmentId));
  const visitQuery = constraints.length > 0 ? query(visitCollection(), ...constraints) : visitCollection();

  return onSnapshot(
    visitQuery,
    { includeMetadataChanges: true },
    (snapshot) => {
      onChange(
        snapshot.docs
          .map(visitFromSnapshot)
          .filter((visit) => filterVisit(visit, filters))
          .sort((left, right) => right.visitDate.localeCompare(left.visitDate))
      );
    },
    onError
  );
}

export async function deleteVisit(id: string): Promise<void> {
  const now = nowIso();
  await updateDoc(visitDocument(id), {
    deletedAt: now,
    updatedAt: now,
  });
}

export function visitPayload(record: LocalVisit, householdServerId: string) {
  return {
    clientId: record.id,
    householdId: householdServerId,
    assignmentId: record.assignmentId,
    outcome: record.outcome,
    householdStatusAfter: record.householdStatusAfter,
    duration: record.duration,
    literatureLeft: record.literatureLeft,
    bibleTopicDiscussed: record.bibleTopicDiscussed,
    returnVisitPlanned: record.returnVisitPlanned,
    nextVisitDate: record.nextVisitDate,
    nextVisitNotes: record.nextVisitNotes,
    notes: record.notes,
  };
}

export async function markVisitSynced(_document: unknown, _visit: Visit): Promise<void> {
  return undefined;
}