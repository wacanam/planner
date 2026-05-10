import { getLocalFirstDB } from './database';
import { notifyLocalFirstChange } from './events';
import { nowIso, nullableNumber, nullableString } from './shared';
import type { LocalAvatarUpload, LocalEncounter, LocalHousehold, LocalVisit } from './types';
import { applyRemoteHouseholds } from './households';
import { applyRemoteVisits } from './visits';
import type { Household, Visit } from '@/types/api';

const LEGACY_DB_NAME = 'ministry-planner';
const LEGACY_DB_VERSION = 6;
const MIGRATION_KEY = 'planner:rxdb-legacy-idb-migrated';

interface LegacyPending<T = Record<string, unknown>> {
  id: string;
  data?: T;
  createdAt?: string;
}

interface LegacyCache<T> {
  data?: T;
  cachedAt?: number;
}

export async function migrateLegacyIDBToRxDB(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (localStorage.getItem(MIGRATION_KEY) === '1') return;

  try {
    const legacyDatabase = await openLegacyDatabase();
    if (!legacyDatabase) {
      localStorage.setItem(MIGRATION_KEY, '1');
      return;
    }

    await migrateCachedRecords(legacyDatabase);
    await migratePendingRecords(legacyDatabase);
    legacyDatabase.close();
    localStorage.setItem(MIGRATION_KEY, '1');
    notifyLocalFirstChange();
  } catch (error) {
    console.warn('[LocalFirst] Legacy IDB migration skipped:', error);
  }
}

function openLegacyDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    const request = indexedDB.open(LEGACY_DB_NAME, LEGACY_DB_VERSION);
    request.onerror = () => resolve(null);
    request.onupgradeneeded = () => {
      request.transaction?.abort();
      resolve(null);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function migrateCachedRecords(database: IDBDatabase) {
  const householdCache = await readStoreValues<LegacyCache<Household[]>>(database, 'households-cache');
  const visitCache = await readStoreValues<LegacyCache<Visit[]>>(database, 'visits-cache');

  for (const cache of householdCache) {
    if (Array.isArray(cache.data)) await applyRemoteHouseholds(cache.data);
  }

  for (const cache of visitCache) {
    if (Array.isArray(cache.data)) await applyRemoteVisits(cache.data);
  }
}

async function migratePendingRecords(database: IDBDatabase) {
  const localDatabase = await getLocalFirstDB();
  const now = nowIso();
  const pendingHouseholds = await readStoreValues<LegacyPending>(database, 'pending-households');
  const pendingVisits = await readStoreValues<LegacyPending>(database, 'pending-visits');
  const pendingEncounters = await readStoreValues<LegacyPending>(database, 'pending-encounters');
  const pendingAvatars = await readStoreEntries<Blob>(database, 'pending-avatars');

  for (const pending of pendingHouseholds) {
    const data = pending.data ?? {};
    const id = pending.id ?? crypto.randomUUID();
    await localDatabase.households.incrementalUpsert({
      id,
      serverId: null,
      congregationId: nullableString(data.congregationId),
      territoryId: nullableString(data.territoryId),
      address: nullableString(data.address) ?? 'Unnamed household',
      houseNumber: nullableString(data.houseNumber),
      unitNumber: nullableString(data.unitNumber),
      streetName: nullableString(data.streetName) ?? nullableString(data.address) ?? 'Unknown street',
      city: nullableString(data.city) ?? '',
      postalCode: nullableString(data.postalCode),
      country: nullableString(data.country),
      latitude: nullableString(data.latitude),
      longitude: nullableString(data.longitude),
      type: nullableString(data.type) ?? 'house',
      floor: nullableNumber(data.floor),
      occupantsCount: nullableNumber(data.occupantsCount),
      languages: nullableString(data.languages),
      bestTimeToCall: nullableString(data.bestTimeToCall),
      status: nullableString(data.status) ?? 'new',
      lastVisitDate: null,
      lastVisitOutcome: null,
      notes: nullableString(data.notes),
      lwpNotes: nullableString(data.lwpNotes),
      createdById: null,
      updatedById: null,
      syncStatus: 'pending',
      syncError: null,
      offlineCreated: true,
      deletedAt: null,
      lastSyncedAt: null,
      createdAt: pending.createdAt ?? now,
      updatedAt: now,
    } satisfies LocalHousehold);
  }

  for (const pending of pendingVisits) {
    const data = pending.data ?? {};
    const id = pending.id ?? crypto.randomUUID();
    await localDatabase.visits.incrementalUpsert({
      id,
      serverId: null,
      userId: null,
      householdId: nullableString(data.householdId) ?? '',
      householdServerId: null,
      visitDate: pending.createdAt ?? now,
      outcome: nullableString(data.outcome) ?? 'other',
      householdStatusBefore: null,
      householdStatusAfter: nullableString(data.householdStatusAfter),
      duration: nullableNumber(data.duration),
      literatureLeft: nullableString(data.literatureLeft),
      bibleTopicDiscussed: nullableString(data.bibleTopicDiscussed),
      returnVisitPlanned: Boolean(data.returnVisitPlanned),
      nextVisitDate: nullableString(data.nextVisitDate),
      nextVisitNotes: nullableString(data.nextVisitNotes),
      assignmentId: nullableString(data.assignmentId),
      notes: nullableString(data.notes),
      syncStatus: 'pending',
      syncError: null,
      offlineCreated: true,
      deletedAt: null,
      lastSyncedAt: null,
      createdAt: pending.createdAt ?? now,
      updatedAt: now,
    } satisfies LocalVisit);
  }

  for (const pending of pendingEncounters) {
    const data = pending.data ?? {};
    const id = pending.id ?? crypto.randomUUID();
    await localDatabase.encounters.incrementalUpsert({
      id,
      serverId: null,
      userId: null,
      visitId: nullableString(data.visitId),
      visitServerId: null,
      householdId: nullableString(data.householdId),
      householdServerId: null,
      encounterDate: nullableString(data.encounterDate) ?? pending.createdAt ?? now,
      name: nullableString(data.name),
      gender: nullableString(data.gender),
      ageGroup: nullableString(data.ageGroup),
      role: nullableString(data.role),
      response: nullableString(data.response) ?? 'other',
      languageSpoken: nullableString(data.languageSpoken),
      topicDiscussed: nullableString(data.topicDiscussed),
      literatureAccepted: nullableString(data.literatureAccepted),
      bibleStudyInterest: Boolean(data.bibleStudyInterest),
      returnVisitRequested: Boolean(data.returnVisitRequested),
      nextVisitNotes: nullableString(data.nextVisitNotes),
      notes: nullableString(data.notes),
      syncStatus: 'pending',
      syncError: null,
      offlineCreated: true,
      deletedAt: null,
      lastSyncedAt: null,
      createdAt: pending.createdAt ?? now,
      updatedAt: now,
    } satisfies LocalEncounter);
  }

  for (const pendingAvatar of pendingAvatars) {
    if (!(pendingAvatar.value instanceof Blob)) continue;
    const userId = String(pendingAvatar.key);
    await localDatabase.avataruploads.incrementalUpsert({
      id: userId,
      userId,
      fileName: 'avatar.jpg',
      mimeType: pendingAvatar.value.type || 'image/jpeg',
      dataUrl: await blobToDataUrl(pendingAvatar.value),
      syncStatus: 'pending',
      syncError: null,
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: null,
    } satisfies LocalAvatarUpload);
  }
}

function readStoreValues<T>(database: IDBDatabase, storeName: string): Promise<T[]> {
  if (!database.objectStoreNames.contains(storeName)) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).getAll();
    request.onsuccess = () => resolve((request.result ?? []) as T[]);
    request.onerror = () => reject(request.error);
  });
}

function readStoreEntries<T>(
  database: IDBDatabase,
  storeName: string
): Promise<Array<{ key: IDBValidKey; value: T }>> {
  if (!database.objectStoreNames.contains(storeName)) return Promise.resolve([]);
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const keyRequest = store.getAllKeys();
    const valueRequest = store.getAll();
    transaction.oncomplete = () => {
      const keys = keyRequest.result ?? [];
      const values = (valueRequest.result ?? []) as T[];
      resolve(keys.map((key, index) => ({ key, value: values[index] })));
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}