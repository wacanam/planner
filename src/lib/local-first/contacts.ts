import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS } from '@/lib/firebase/schema';
import type {
  Contact,
  ContactRole,
  ContactStatus,
  CreateContactInput,
  UpdateContactInput,
} from '@/types/api';
import { getHouseholdById } from './households';
import { nowIso, nullableString } from './shared';
import type { LocalContact, LocalHousehold } from './types';

function contactCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.contacts);
}

function contactDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.contacts, id);
}

function contactFromSnapshot(snapshot: QueryDocumentSnapshot): LocalContact {
  return snapshot.data() as LocalContact;
}

export function toContactView(
  record: LocalContact,
  household?: LocalHousehold | null,
  encountersCount?: number,
  lastVisitDate?: string | null,
  lastResponse?: string | null
): Contact {
  return {
    id: record.id,
    householdId: record.householdId,
    congregationId: record.congregationId,
    territoryId: record.territoryId,
    name: record.name,
    gender: (record.gender as Contact['gender']) || 'unknown',
    ageGroup: (record.ageGroup as Contact['ageGroup']) || 'adult',
    language: record.language || undefined,
    role: (record.role as ContactRole) || 'unknown',
    status: (record.status as ContactStatus) || 'active',
    phoneNumber: record.phoneNumber || undefined,
    email: record.email || undefined,
    bestTimeToCall: record.bestTimeToCall || undefined,
    bibleStudyInterest: Boolean(record.bibleStudyInterest),
    bibleStudyPublication: record.bibleStudyPublication || undefined,
    bibleStudyLesson: record.bibleStudyLesson || undefined,
    notes: record.notes || undefined,
    createdById: record.createdById,
    creatorName: record.creatorName ?? household?.creatorName ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    householdAddress: household?.address ?? null,
    householdCity: household?.city ?? null,
    encountersCount: encountersCount ?? 0,
    lastVisitDate: lastVisitDate ?? null,
    lastResponse: lastResponse ?? null,
  };
}

export async function createContact(input: CreateContactInput): Promise<LocalContact> {
  const timestamp = nowIso();
  const id = createClientId();

  const record: LocalContact = {
    id,
    serverId: id,
    householdId: input.householdId,
    householdServerId: input.householdId,
    congregationId: input.congregationId ?? null,
    territoryId: input.territoryId ?? null,
    name: input.name.trim(),
    gender: input.gender ?? 'unknown',
    ageGroup: input.ageGroup ?? 'adult',
    language: nullableString(input.language),
    role: input.role ?? 'unknown',
    status: input.status ?? 'active',
    phoneNumber: nullableString(input.phoneNumber),
    email: nullableString(input.email),
    bestTimeToCall: nullableString(input.bestTimeToCall),
    bibleStudyInterest: Boolean(input.bibleStudyInterest),
    bibleStudyPublication: nullableString(input.bibleStudyPublication),
    bibleStudyLesson: nullableString(input.bibleStudyLesson),
    notes: nullableString(input.notes),
    createdById: input.createdById ?? null,
    creatorName: nullableString(input.creatorName) ?? null,
    updatedById: input.createdById ?? null,
    deletedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  const batch = writeBatch(getPlannerFirestore());
  batch.set(contactDocument(id), record);
  await batch.commit();

  return record;
}

export async function updateContact(
  id: string,
  input: UpdateContactInput
): Promise<LocalContact | null> {
  const updates: Record<string, unknown> = {
    updatedAt: nowIso(),
  };

  if (input.name !== undefined) updates.name = input.name.trim();
  if (input.gender !== undefined) updates.gender = input.gender;
  if (input.ageGroup !== undefined) updates.ageGroup = input.ageGroup;
  if (input.language !== undefined) updates.language = nullableString(input.language);
  if (input.role !== undefined) updates.role = input.role;
  if (input.status !== undefined) updates.status = input.status;
  if (input.phoneNumber !== undefined) updates.phoneNumber = nullableString(input.phoneNumber);
  if (input.email !== undefined) updates.email = nullableString(input.email);
  if (input.bestTimeToCall !== undefined)
    updates.bestTimeToCall = nullableString(input.bestTimeToCall);
  if (input.bibleStudyInterest !== undefined)
    updates.bibleStudyInterest = Boolean(input.bibleStudyInterest);
  if (input.bibleStudyPublication !== undefined)
    updates.bibleStudyPublication = nullableString(input.bibleStudyPublication);
  if (input.bibleStudyLesson !== undefined)
    updates.bibleStudyLesson = nullableString(input.bibleStudyLesson);
  if (input.notes !== undefined) updates.notes = nullableString(input.notes);
  if (input.updatedById !== undefined) updates.updatedById = input.updatedById;

  await updateDoc(contactDocument(id), updates);
  return null;
}

export async function deleteContact(id: string): Promise<void> {
  await updateDoc(contactDocument(id), {
    deletedAt: nowIso(),
    updatedAt: nowIso(),
  });
}

export async function getContactsByHousehold(householdId: string): Promise<LocalContact[]> {
  const q = query(
    contactCollection(),
    where('householdId', '==', householdId),
    where('deletedAt', '==', null)
  );
  const snap = await getDocs(q);
  return snap.docs.map(contactFromSnapshot);
}

export async function findContactByName(
  householdId: string,
  name: string
): Promise<LocalContact | null> {
  const contacts = await getContactsByHousehold(householdId);
  const normalized = name.trim().toLowerCase();
  return contacts.find((c) => c.name.trim().toLowerCase() === normalized) || null;
}

export function subscribeContactsByHousehold(
  householdId: string,
  callback: (contacts: LocalContact[]) => void
): Unsubscribe {
  const q = query(contactCollection(), where('householdId', '==', householdId));

  return onSnapshot(
    q,
    (snap) => {
      const records = snap.docs.map(contactFromSnapshot).filter((c) => !c.deletedAt);
      callback(records);
    },
    (err) => {
      console.error('[contacts:subscribe] Error', err);
      callback([]);
    }
  );
}
