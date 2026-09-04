// src/lib/local-first/personal-calls.ts
import { getHouseholdById } from './households';

/**
 * Local-First Personal Ministry Notebook
 *
 * Stores personal return visits, Bible study notes, scriptures, and contact information
 * strictly inside the publisher's local browser IndexedDB.
 *
 * DATA PRIVACY GUARANTEE:
 * These records are NEVER sent, synchronized, or written to Firestore or any central cloud.
 * They belong exclusively to the individual publisher on their personal device.
 */

export interface PersonalCallRecord {
  id: string;
  userId: string;
  householdId?: string | null;
  territoryId?: string | null;
  address: string;
  houseNumber?: string | null;
  unitNumber?: string | null;
  streetName?: string | null;
  personName?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  language?: string | null;
  status: 'note' | 'initial_contact' | 'return_visit' | 'bible_study' | 'interested' | 'inactive';
  notes?: string | null;
  scripturesDiscussed?: string | null;
  literaturePlaced?: string | null;
  nextVisitDate?: string | null;
  nextVisitTime?: string | null;
  nextVisitNotes?: string | null;
  createdAt: string;
  updatedAt: string;
}

const DB_NAME = 'kanataran-personal-notebook';
const DB_VERSION = 1;
const STORE_NAME = 'personal_calls';

function getIndexedDB(): IDBFactory | null {
  if (typeof window === 'undefined') return null;
  return (
    window.indexedDB ||
    (window as any).mozIndexedDB ||
    (window as any).webkitIndexedDB ||
    (window as any).msIndexedDB ||
    null
  );
}

export function openPersonalCallsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const idb = getIndexedDB();
    if (!idb) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = idb.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('userId', 'userId', { unique: false });
        store.createIndex('householdId', 'householdId', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error('Failed to open Personal Calls IndexedDB'));
  });
}

export async function getPersonalCalls(userId: string): Promise<PersonalCallRecord[]> {
  try {
    const db = await openPersonalCallsDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('userId');
      const request = index.getAll(IDBKeyRange.only(userId));

      request.onsuccess = () => {
        const results = (request.result as PersonalCallRecord[]) || [];
        // Sort descending by updatedAt
        results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[PersonalCalls] Failed to load calls from IndexedDB:', error);
    return [];
  }
}

export async function getPersonalCallByHousehold(
  userId: string,
  householdId: string
): Promise<PersonalCallRecord | null> {
  try {
    const db = await openPersonalCallsDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('householdId');
      const request = index.getAll(IDBKeyRange.only(householdId));

      request.onsuccess = () => {
        const results = (request.result as PersonalCallRecord[]) || [];
        const userMatch = results.find((r) => r.userId === userId) || null;
        resolve(userMatch);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function savePersonalCall(call: PersonalCallRecord): Promise<void> {
  // If territoryId or address is missing but householdId is present, auto-resolve from household
  if (call.householdId && !call.territoryId) {
    try {
      const hh = await getHouseholdById(call.householdId);
      if (hh?.territoryId) {
        call.territoryId = hh.territoryId;
      }
      if (hh?.address && (!call.address || call.address === 'Address not listed')) {
        call.address = hh.address;
      }
      if (hh?.streetName && !call.streetName) {
        call.streetName = hh.streetName;
      }
      if (hh?.houseNumber && !call.houseNumber) {
        call.houseNumber = hh.houseNumber;
      }
      if (hh?.unitNumber && !call.unitNumber) {
        call.unitNumber = hh.unitNumber;
      }
    } catch {
      // Offline fallback
    }
  }

  const db = await openPersonalCallsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(call);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deletePersonalCall(id: string): Promise<void> {
  const db = await openPersonalCallsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Migrates existing cloud encounters & contacts authored by the user into local IndexedDB,
 * resolving territoryId and complete address from associated households.
 */
export async function importPersonalCallsFromCloud(
  userId: string,
  cloudEncounters: any[],
  cloudContacts: any[] = [],
  cloudHouseholds: any[] = []
): Promise<number> {
  const db = await openPersonalCallsDb();
  let count = 0;

  // Build a map of contacts by householdId or contactId
  const contactMap = new Map<string, any>();
  for (const c of cloudContacts) {
    if (c.householdId) contactMap.set(c.householdId, c);
    if (c.id) contactMap.set(c.id, c);
  }

  // Build a map of households by id
  const householdMap = new Map<string, any>();
  for (const h of cloudHouseholds) {
    if (h.id) householdMap.set(h.id, h);
  }

  // Group encounters by householdId to consolidate notes per call
  const encountersByHousehold = new Map<string, any[]>();
  for (const enc of cloudEncounters) {
    const key = enc.householdId || enc.id;
    const list = encountersByHousehold.get(key) || [];
    list.push(enc);
    encountersByHousehold.set(key, list);
  }

  // Auto-fetch missing households if not provided in cloudHouseholds
  for (const hhId of encountersByHousehold.keys()) {
    if (hhId && !householdMap.has(hhId)) {
      try {
        const hh = await getHouseholdById(hhId);
        if (hh) householdMap.set(hhId, hh);
      } catch {
        // Fallback if offline
      }
    }
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const [hhId, encList] of encountersByHousehold.entries()) {
      // Pick latest encounter
      const sorted = [...encList].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      const latest = sorted[0];
      const associatedHousehold = householdMap.get(hhId);
      const associatedContact =
        contactMap.get(hhId) || (latest.contactId ? contactMap.get(latest.contactId) : null);

      const resolvedTerritoryId =
        associatedHousehold?.territoryId ||
        latest.territoryId ||
        associatedContact?.territoryId ||
        null;

      const resolvedAddress =
        associatedHousehold?.address ||
        latest.householdAddress ||
        associatedContact?.householdAddress ||
        'Address not listed';

      const resolvedStreetName = associatedHousehold?.streetName || latest.streetName || null;

      const resolvedHouseNumber = associatedHousehold?.houseNumber || latest.houseNumber || null;

      const resolvedUnitNumber = associatedHousehold?.unitNumber || latest.unitNumber || null;

      const record: PersonalCallRecord = {
        id: `personal-${hhId}`,
        userId,
        householdId: latest.householdId || (hhId.startsWith('personal-') ? null : hhId) || null,
        territoryId: resolvedTerritoryId,
        address: resolvedAddress,
        houseNumber: resolvedHouseNumber,
        unitNumber: resolvedUnitNumber,
        streetName: resolvedStreetName,
        personName: latest.name || associatedContact?.name || null,
        phoneNumber: latest.phoneNumber || associatedContact?.phoneNumber || null,
        email: latest.email || associatedContact?.email || null,
        language: latest.language || latest.languageSpoken || associatedContact?.language || null,
        status: latest.bibleStudyInterest
          ? 'bible_study'
          : latest.returnVisitRequested
            ? 'return_visit'
            : 'interested',
        notes: latest.notes || latest.nextVisitNotes || associatedContact?.notes || null,
        scripturesDiscussed: latest.topicsDiscussed || latest.topicDiscussed || null,
        literaturePlaced: latest.literatureOffered || latest.literatureAccepted || null,
        nextVisitDate: latest.nextVisitDate || null,
        nextVisitTime: latest.nextVisitTime || null,
        nextVisitNotes: latest.nextVisitNotes || null,
        createdAt: latest.createdAt || new Date().toISOString(),
        updatedAt: latest.updatedAt || new Date().toISOString(),
      };

      store.put(record);
      count++;
    }

    tx.oncomplete = () => resolve(count);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Hydrates any call that has a householdId but missing territoryId or address details
 */
async function hydrateCallsWithTerritory(
  calls: PersonalCallRecord[]
): Promise<PersonalCallRecord[]> {
  for (const call of calls) {
    if (call.householdId && !call.territoryId) {
      try {
        const hh = await getHouseholdById(call.householdId);
        if (hh) {
          let changed = false;
          if (hh.territoryId && !call.territoryId) {
            call.territoryId = hh.territoryId;
            changed = true;
          }
          if (hh.address && (!call.address || call.address === 'Address not listed')) {
            call.address = hh.address;
            changed = true;
          }
          if (hh.streetName && !call.streetName) {
            call.streetName = hh.streetName;
            changed = true;
          }
          if (hh.houseNumber && !call.houseNumber) {
            call.houseNumber = hh.houseNumber;
            changed = true;
          }
          if (hh.unitNumber && !call.unitNumber) {
            call.unitNumber = hh.unitNumber;
            changed = true;
          }
          if (changed) {
            await savePersonalCall(call);
          }
        }
      } catch {
        // Continue if offline or lookup fails
      }
    }
  }
  return calls;
}

/**
 * Export personal calls to a JSON string
 */
export async function exportPersonalCallsAsJson(userId: string): Promise<string> {
  const calls = await getPersonalCalls(userId);
  await hydrateCallsWithTerritory(calls);
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      userId,
      count: calls.length,
      personalCalls: calls,
    },
    null,
    2
  );
}

/**
 * Export personal calls to CSV
 */
export async function exportPersonalCallsAsCsv(userId: string): Promise<string> {
  const calls = await getPersonalCalls(userId);
  await hydrateCallsWithTerritory(calls);
  const headers = [
    'Address',
    'House Number',
    'Unit',
    'Territory ID',
    'Person Name',
    'Phone',
    'Email',
    'Status',
    'Language',
    'Scriptures / Topics',
    'Literature',
    'Next Visit Date',
    'Notes',
    'Last Updated',
  ];

  const escapeCsv = (val: string | null | undefined) => {
    if (!val) return '""';
    return `"${String(val).replace(/"/g, '""')}"`;
  };

  const rows = calls.map((c) => [
    escapeCsv(c.address),
    escapeCsv(c.houseNumber),
    escapeCsv(c.unitNumber),
    escapeCsv(c.territoryId),
    escapeCsv(c.personName),
    escapeCsv(c.phoneNumber),
    escapeCsv(c.email),
    escapeCsv(c.status),
    escapeCsv(c.language),
    escapeCsv(c.scripturesDiscussed),
    escapeCsv(c.literaturePlaced),
    escapeCsv(c.nextVisitDate),
    escapeCsv(c.notes),
    escapeCsv(c.updatedAt),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
