import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  type QueryDocumentSnapshot,
  query,
  setDoc,
  type Unsubscribe,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getPlannerFirestore } from '@/lib/firebase/client';
import { createClientId, FIRESTORE_COLLECTIONS } from '@/lib/firebase/schema';
import { isTerritoryServant } from '@/lib/permissions';
import type { Household } from '@/types/api';
import { isoDate, nowIso, nullableNumber, nullableString } from './shared';
import type { LocalHousehold } from './types';

export interface CreateHouseholdInput {
  name?: string;
  address: string;
  houseNumber?: string | null;
  unitNumber?: string | null;
  streetName?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  type?: string | null;
  floor?: number | null;
  membersCount?: number | null;
  occupantsCount?: number | null;
  languages?: string | null;
  bestTimeToCall?: string | null;
  status?: string | null;
  lastVisitDate?: string | null;
  lastVisitOutcome?: string | null;
  notes?: string | null;
  lwpNotes?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  territoryId?: string | null;
  congregationId?: string | null;
  createdById?: string | null;
  creatorName?: string | null;
  collaboratorIds?: string[] | null;
  readOnlyUserIds?: string[] | null;
  transferredFrom?: string | null;
  transferredFromId?: string | null;
  transferredAt?: string | null;
  updatedById?: string | null;
}

export interface HouseholdFilters {
  congregationId?: string | null;
  territoryId?: string | null;
  userId?: string | null;
  userRole?: string | null;
  personalOnly?: boolean;
  groupMateUserIds?: string[] | Set<string> | null;
}

function householdCollection() {
  return collection(getPlannerFirestore(), FIRESTORE_COLLECTIONS.households);
}

function householdDocument(id: string) {
  return doc(getPlannerFirestore(), FIRESTORE_COLLECTIONS.households, id);
}

function householdFromSnapshot(snapshot: QueryDocumentSnapshot): LocalHousehold {
  return snapshot.data() as LocalHousehold;
}

export function toHouseholdView(record: LocalHousehold): Household {
  return {
    id: record.id,
    congregationId: record.congregationId,
    territoryId: record.territoryId,
    name: record.name,
    address: record.address,
    houseNumber: record.houseNumber,
    unitNumber: record.unitNumber,
    streetName: record.streetName,
    city: record.city,
    postalCode: record.postalCode,
    country: record.country,
    latitude: record.latitude,
    longitude: record.longitude,
    type: record.type,
    floor: record.floor,
    occupantsCount: record.occupantsCount,
    languages: record.languages,
    bestTimeToCall: record.bestTimeToCall,
    status: record.status,
    lastVisitDate: record.lastVisitDate,
    lastVisitOutcome: record.lastVisitOutcome,
    notes: record.notes,
    lwpNotes: record.lwpNotes,
    createdById: record.createdById,
    creatorName: record.creatorName,
    collaboratorIds: record.collaboratorIds || undefined,
    readOnlyUserIds: record.readOnlyUserIds || undefined,
    transferredFrom: record.transferredFrom,
    transferredFromId: record.transferredFromId,
    transferredAt: record.transferredAt,
    updatedById: record.updatedById,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function localHouseholdFromApi(household: Household, existingId?: string): LocalHousehold {
  const now = nowIso();
  return {
    id: existingId ?? household.id,
    serverId: household.id,
    congregationId: household.congregationId ?? null,
    territoryId: household.territoryId ?? null,
    name: household.name ?? null,
    address: household.address,
    houseNumber: household.houseNumber ?? null,
    unitNumber: household.unitNumber ?? null,
    streetName: household.streetName,
    city: household.city,
    postalCode: household.postalCode ?? null,
    country: household.country ?? null,
    latitude: household.latitude != null ? String(household.latitude) : null,
    longitude: household.longitude != null ? String(household.longitude) : null,
    type: household.type ?? 'house',
    floor: nullableNumber(household.floor),
    occupantsCount: nullableNumber(household.occupantsCount),
    languages: household.languages ?? null,
    bestTimeToCall: household.bestTimeToCall ?? null,
    status: household.status ?? 'new',
    lastVisitDate: household.lastVisitDate ?? null,
    lastVisitOutcome: household.lastVisitOutcome ?? null,
    notes: household.notes ?? null,
    lwpNotes: household.lwpNotes ?? null,
    createdById: household.createdById ?? null,
    creatorName: household.creatorName ?? null,
    collaboratorIds: household.collaboratorIds ?? null,
    readOnlyUserIds: household.readOnlyUserIds ?? null,
    transferredFrom: household.transferredFrom ?? null,
    transferredFromId: household.transferredFromId ?? null,
    transferredAt: household.transferredAt ?? null,
    updatedById: household.updatedById ?? null,
    deletedAt: null,
    createdAt: isoDate(household.createdAt, now),
    updatedAt: isoDate(household.updatedAt, now),
  };
}

function createLocalHouseholdRecord(
  input: CreateHouseholdInput,
  id = createClientId()
): LocalHousehold {
  const now = nowIso();
  const latitude = nullableString(input.latitude);
  const longitude = nullableString(input.longitude);
  const coordinateLabel =
    latitude && longitude ? `Pinned household ${latitude}, ${longitude}` : 'Pinned household';
  const address = nullableString(input.address) ?? nullableString(input.name) ?? coordinateLabel;
  const name = nullableString(input.name);
  const streetName = nullableString(input.streetName) ?? '';
  const city = nullableString(input.city) ?? '';
  return {
    id,
    serverId: id,
    congregationId: nullableString(input.congregationId),
    territoryId: nullableString(input.territoryId),
    name,
    address,
    houseNumber: nullableString(input.houseNumber),
    unitNumber: nullableString(input.unitNumber),
    streetName,
    city,
    postalCode: nullableString(input.postalCode),
    country: nullableString(input.country),
    latitude,
    longitude,
    type: nullableString(input.type) ?? 'house',
    floor: nullableNumber(input.floor),
    occupantsCount: nullableNumber(input.occupantsCount ?? input.membersCount),
    languages: nullableString(input.languages),
    bestTimeToCall: nullableString(input.bestTimeToCall),
    status: nullableString(input.status) ?? 'new',
    lastVisitDate: null,
    lastVisitOutcome: null,
    notes: nullableString(input.notes),
    lwpNotes: nullableString(input.lwpNotes),
    createdById: nullableString(input.createdById),
    creatorName: nullableString(input.creatorName),
    collaboratorIds: input.collaboratorIds ?? null,
    readOnlyUserIds: input.readOnlyUserIds ?? null,
    transferredFrom: nullableString(input.transferredFrom),
    transferredFromId: nullableString(input.transferredFromId),
    transferredAt: nullableString(input.transferredAt),
    updatedById: nullableString(input.updatedById),
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function filterHousehold(record: LocalHousehold, filters?: HouseholdFilters) {
  if (record.deletedAt) return false;
  if (
    filters?.congregationId &&
    record.congregationId &&
    record.congregationId !== filters.congregationId
  ) {
    return false;
  }
  if (filters?.territoryId && record.territoryId !== filters.territoryId) return false;

  // Personal scope filter: only show records owned by user, shared/transferred to user, or owned by group mates if user is a group overseer
  if (filters?.personalOnly) {
    if (isTerritoryServant(filters.userRole)) {
      return true;
    }
    if (!filters.userId) {
      return false;
    }
    const isOwner = Boolean(record.createdById && record.createdById === filters.userId);
    const isCollaborator = Boolean(record.collaboratorIds?.includes(filters.userId));
    const isReadOnly = Boolean(record.readOnlyUserIds?.includes(filters.userId));
    const isGroupMateRecord = Boolean(
      filters.groupMateUserIds &&
        record.createdById &&
        (filters.groupMateUserIds instanceof Set
          ? filters.groupMateUserIds.has(record.createdById)
          : filters.groupMateUserIds.includes(record.createdById))
    );

    return isOwner || isCollaborator || isReadOnly || isGroupMateRecord;
  }

  return true;
}

export async function createHousehold(input: CreateHouseholdInput): Promise<LocalHousehold> {
  const record = createLocalHouseholdRecord(input);
  await setDoc(householdDocument(record.id), record);
  return record;
}

export async function upsertHousehold(record: LocalHousehold): Promise<void> {
  await setDoc(
    householdDocument(record.id),
    { ...record, serverId: record.serverId ?? record.id, updatedAt: nowIso() },
    { merge: true }
  );
}

export async function bulkUpsertHouseholds(records: Array<CreateHouseholdInput & { id?: string }>) {
  const batch = writeBatch(getPlannerFirestore());
  for (const input of records) {
    const record = createLocalHouseholdRecord(input, input.id ?? createClientId());
    batch.set(householdDocument(record.id), record, { merge: true });
  }
  await batch.commit();
}

export async function updateHousehold(
  id: string,
  input: Partial<CreateHouseholdInput>
): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: nowIso() };
  if (input.address !== undefined)
    updates.address = nullableString(input.address) ?? 'Pinned household';
  if (input.name !== undefined) updates.name = nullableString(input.name);
  if (input.houseNumber !== undefined) updates.houseNumber = nullableString(input.houseNumber);
  if (input.unitNumber !== undefined) updates.unitNumber = nullableString(input.unitNumber);
  if (input.streetName !== undefined) updates.streetName = nullableString(input.streetName);
  if (input.city !== undefined) updates.city = nullableString(input.city);
  if (input.postalCode !== undefined) updates.postalCode = nullableString(input.postalCode);
  if (input.country !== undefined) updates.country = nullableString(input.country);
  if (input.type !== undefined) updates.type = nullableString(input.type) ?? 'house';
  if (input.floor !== undefined) updates.floor = nullableNumber(input.floor);
  if (input.occupantsCount !== undefined || input.membersCount !== undefined) {
    updates.occupantsCount = nullableNumber(input.occupantsCount ?? input.membersCount);
  }
  if (input.languages !== undefined) updates.languages = nullableString(input.languages);
  if (input.bestTimeToCall !== undefined)
    updates.bestTimeToCall = nullableString(input.bestTimeToCall);
  if (input.status !== undefined) updates.status = nullableString(input.status) ?? 'new';
  if (input.notes !== undefined) updates.notes = nullableString(input.notes);
  if (input.lwpNotes !== undefined) updates.lwpNotes = nullableString(input.lwpNotes);
  if (input.latitude !== undefined) updates.latitude = nullableString(input.latitude);
  if (input.longitude !== undefined) updates.longitude = nullableString(input.longitude);
  if (input.territoryId !== undefined) updates.territoryId = nullableString(input.territoryId);
  if (input.congregationId !== undefined)
    updates.congregationId = nullableString(input.congregationId);
  if (input.createdById !== undefined) updates.createdById = nullableString(input.createdById);
  if (input.creatorName !== undefined) updates.creatorName = nullableString(input.creatorName);
  if (input.collaboratorIds !== undefined) updates.collaboratorIds = input.collaboratorIds;
  if (input.readOnlyUserIds !== undefined) updates.readOnlyUserIds = input.readOnlyUserIds;
  if (input.transferredFrom !== undefined)
    updates.transferredFrom = nullableString(input.transferredFrom);
  if (input.transferredFromId !== undefined)
    updates.transferredFromId = nullableString(input.transferredFromId);
  if (input.transferredAt !== undefined)
    updates.transferredAt = nullableString(input.transferredAt);
  if (input.updatedById !== undefined) updates.updatedById = nullableString(input.updatedById);
  await updateDoc(householdDocument(id), updates);
}

export async function applyRemoteHouseholds(households: Household[]): Promise<number> {
  await bulkUpsertHouseholds(
    households.map((household) => ({
      id: household.id,
      name: household.name ?? undefined,
      address: household.address,
      houseNumber: household.houseNumber,
      unitNumber: household.unitNumber,
      streetName: household.streetName,
      city: household.city,
      postalCode: household.postalCode,
      country: household.country,
      latitude: household.latitude,
      longitude: household.longitude,
      type: household.type,
      floor: household.floor,
      occupantsCount: household.occupantsCount,
      languages: household.languages,
      bestTimeToCall: household.bestTimeToCall,
      status: household.status,
      notes: household.notes,
      lwpNotes: household.lwpNotes,
    }))
  );
  return households.length;
}

export async function getAllHouseholds(filters?: HouseholdFilters): Promise<LocalHousehold[]> {
  const snapshot = await getDocs(householdCollection());
  return snapshot.docs
    .map(householdFromSnapshot)
    .filter((household) => filterHousehold(household, filters))
    .sort((left, right) => left.address.localeCompare(right.address));
}

export async function getHouseholdById(id: string): Promise<LocalHousehold | undefined> {
  const snapshot = await getDoc(householdDocument(id));
  if (!snapshot.exists()) return undefined;
  const record = snapshot.data() as LocalHousehold;
  return record.deletedAt ? undefined : record;
}

export function watchHouseholds(
  filters: HouseholdFilters | undefined,
  onChange: (households: LocalHousehold[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const constraints = [];
  if (filters?.congregationId)
    constraints.push(where('congregationId', '==', filters.congregationId));
  if (filters?.territoryId) constraints.push(where('territoryId', '==', filters.territoryId));
  const householdQuery =
    constraints.length > 0 ? query(householdCollection(), ...constraints) : householdCollection();

  return onSnapshot(
    householdQuery,
    { includeMetadataChanges: true },
    (snapshot) => {
      onChange(
        snapshot.docs
          .map(householdFromSnapshot)
          .filter((household) => filterHousehold(household, filters))
          .sort((left, right) => left.address.localeCompare(right.address))
      );
    },
    onError
  );
}

export async function deleteHousehold(id: string): Promise<void> {
  const now = nowIso();
  await updateDoc(householdDocument(id), {
    deletedAt: now,
    updatedAt: now,
  });
}
