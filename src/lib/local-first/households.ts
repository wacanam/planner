import type { RxDocument } from 'rxdb';
import { getLocalFirstDB } from './database';
import { notifyLocalFirstChange } from './events';
import { isoDate, nowIso, nullableNumber, nullableString, pendingStatus } from './shared';
import type { LocalHousehold } from './types';
import type { Household } from '@/types/api';

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
  notes?: string | null;
  lwpNotes?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  territoryId?: string | null;
  congregationId?: string | null;
}

type HouseholdDocument = RxDocument<LocalHousehold>;

export function toHouseholdView(record: LocalHousehold): Household & { _pending?: boolean } {
  return {
    id: record.id,
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
    updatedById: record.updatedById,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    _pending: pendingStatus(record.syncStatus),
  };
}

export function localHouseholdFromApi(household: Household, existingId?: string): LocalHousehold {
  const now = nowIso();
  return {
    id: existingId ?? household.id,
    serverId: household.id,
    congregationId: null,
    territoryId: null,
    address: household.address,
    houseNumber: household.houseNumber ?? null,
    unitNumber: household.unitNumber ?? null,
    streetName: household.streetName,
    city: household.city,
    postalCode: household.postalCode ?? null,
    country: household.country ?? null,
    latitude: household.latitude ?? null,
    longitude: household.longitude ?? null,
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
    updatedById: household.updatedById ?? null,
    syncStatus: 'synced',
    syncError: null,
    offlineCreated: false,
    deletedAt: null,
    lastSyncedAt: now,
    createdAt: isoDate(household.createdAt, now),
    updatedAt: isoDate(household.updatedAt, now),
  };
}

function createLocalHouseholdRecord(input: CreateHouseholdInput): LocalHousehold {
  const now = nowIso();
  const address = input.address.trim();
  const streetName = nullableString(input.streetName) ?? address;
  const city = nullableString(input.city) ?? '';
  return {
    id: crypto.randomUUID(),
    serverId: null,
    congregationId: nullableString(input.congregationId),
    territoryId: nullableString(input.territoryId),
    address,
    houseNumber: nullableString(input.houseNumber),
    unitNumber: nullableString(input.unitNumber),
    streetName,
    city,
    postalCode: nullableString(input.postalCode),
    country: nullableString(input.country),
    latitude: nullableString(input.latitude),
    longitude: nullableString(input.longitude),
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
    createdById: null,
    updatedById: null,
    syncStatus: 'pending',
    syncError: null,
    offlineCreated: true,
    deletedAt: null,
    lastSyncedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function createHousehold(input: CreateHouseholdInput): Promise<LocalHousehold> {
  const database = await getLocalFirstDB();
  const record = createLocalHouseholdRecord(input);
  await database.households.insert(record);
  notifyLocalFirstChange();
  return record;
}

export async function upsertHousehold(record: LocalHousehold): Promise<void> {
  const database = await getLocalFirstDB();
  await database.households.incrementalUpsert({
    ...record,
    syncStatus: 'pending',
    syncError: null,
    updatedAt: nowIso(),
  });
  notifyLocalFirstChange();
}

export async function bulkUpsertHouseholds(records: Array<CreateHouseholdInput & { id?: string }>) {
  const database = await getLocalFirstDB();
  const now = nowIso();
  for (const input of records) {
    const id = input.id ?? crypto.randomUUID();
    const existing = await database.households.findOne(id).exec();
    const existingData = existing?.toMutableJSON() as LocalHousehold | undefined;
    if (existingData?.syncStatus && existingData.syncStatus !== 'synced') continue;
    await database.households.incrementalUpsert({
      id,
      serverId: id,
      congregationId: nullableString(input.congregationId),
      territoryId: nullableString(input.territoryId),
      address: input.address,
      houseNumber: nullableString(input.houseNumber),
      unitNumber: nullableString(input.unitNumber),
      streetName: nullableString(input.streetName) ?? input.address,
      city: nullableString(input.city) ?? '',
      postalCode: nullableString(input.postalCode),
      country: nullableString(input.country),
      latitude: nullableString(input.latitude),
      longitude: nullableString(input.longitude),
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
      createdById: null,
      updatedById: null,
      syncStatus: 'synced',
      syncError: null,
      offlineCreated: false,
      deletedAt: null,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }
  notifyLocalFirstChange();
}

export async function applyRemoteHouseholds(households: Household[]): Promise<number> {
  const database = await getLocalFirstDB();
  let applied = 0;

  for (const household of households) {
    const existingByServerId = await database.households
      .findOne({ selector: { serverId: household.id } })
      .exec();
    const existingById = existingByServerId ? null : await database.households.findOne(household.id).exec();
    const existing = existingByServerId ?? existingById;
    const existingData = existing?.toMutableJSON() as LocalHousehold | undefined;

    if (existingData?.deletedAt || (existingData?.syncStatus && existingData.syncStatus !== 'synced')) {
      continue;
    }

    await database.households.incrementalUpsert(localHouseholdFromApi(household, existingData?.id));
    applied += 1;
  }

  if (applied > 0) notifyLocalFirstChange();
  return applied;
}

export async function getAllHouseholds(): Promise<LocalHousehold[]> {
  const database = await getLocalFirstDB();
  const documents = await database.households.find().exec();
  return documents
    .map((document) => document.toMutableJSON() as LocalHousehold)
    .filter((household) => !household.deletedAt)
    .sort((left, right) => left.address.localeCompare(right.address));
}

export async function getHouseholdById(id: string): Promise<LocalHousehold | undefined> {
  const database = await getLocalFirstDB();
  const document = await database.households.findOne(id).exec();
  const record = document?.toMutableJSON() as LocalHousehold | undefined;
  return record && !record.deletedAt ? record : undefined;
}

export async function deleteHousehold(id: string): Promise<void> {
  const database = await getLocalFirstDB();
  const document = await database.households.findOne(id).exec();
  if (!document) return;
  await document.incrementalPatch({
    deletedAt: nowIso(),
    syncStatus: 'pending',
    syncError: null,
    updatedAt: nowIso(),
  });
  notifyLocalFirstChange();
}

export function householdPayload(record: LocalHousehold) {
  return {
    clientId: record.id,
    address: record.address,
    houseNumber: record.houseNumber,
    unitNumber: record.unitNumber,
    streetName: record.streetName,
    city: record.city,
    postalCode: record.postalCode,
    country: record.country,
    type: record.type,
    floor: record.floor,
    occupantsCount: record.occupantsCount,
    languages: record.languages,
    bestTimeToCall: record.bestTimeToCall,
    status: record.status,
    notes: record.notes,
    lwpNotes: record.lwpNotes,
    latitude: record.latitude,
    longitude: record.longitude,
    territoryId: record.territoryId,
    congregationId: record.congregationId,
  };
}

export async function markHouseholdSynced(
  document: HouseholdDocument,
  household: Household
): Promise<void> {
  const local = localHouseholdFromApi(household, document.primary);
  await document.incrementalPatch({
    ...local,
    id: document.primary,
    serverId: household.id,
    syncStatus: 'synced',
    syncError: null,
    offlineCreated: false,
    deletedAt: null,
    lastSyncedAt: nowIso(),
  });
}