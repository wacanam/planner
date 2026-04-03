/**
 * IndexedDB store for offline-first visit and household recording.
 *
 * Stores:
 *   pending-visits       — write queue, synced to /api/visits by SW
 *   pending-households   — write queue, synced to /api/households by SW
 *   visits-cache         — read cache keyed by territoryId
 *   households-cache     — read cache keyed by territoryId
 *
 * Offline-first write flow:
 *   1. App writes to pending store → registers 'visits-sync' tag
 *   2. SW syncs to server → posts VISIT_SYNCED / HOUSEHOLD_SYNCED → page clears pending
 *
 * Offline-first read flow:
 *   1. SWR fetches from server → caches result in IDB
 *   2. On network failure → SWR falls back to IDB cache
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { Visit, Household } from '@/types/api';

const DB_NAME = 'ministry-planner';
const DB_VERSION = 4;

const VISITS_STORE = 'pending-visits';
const HOUSEHOLDS_STORE = 'pending-households';
const VISITS_CACHE = 'visits-cache';
const HOUSEHOLDS_CACHE = 'households-cache';

let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('pending-avatars')) {
        db.createObjectStore('pending-avatars');
      }
      if (!db.objectStoreNames.contains('auth')) {
        db.createObjectStore('auth');
      }
      if (!db.objectStoreNames.contains(VISITS_STORE)) {
        db.createObjectStore(VISITS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(HOUSEHOLDS_STORE)) {
        db.createObjectStore(HOUSEHOLDS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(VISITS_CACHE)) {
        db.createObjectStore(VISITS_CACHE);
      }
      if (!db.objectStoreNames.contains(HOUSEHOLDS_CACHE)) {
        db.createObjectStore(HOUSEHOLDS_CACHE);
      }
    },
  });
  return _db;
}

// ─── Pending write types ───────────────────────────────────────────────────────

export interface PendingVisit {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
}

export interface PendingHousehold {
  id: string;
  data: Record<string, unknown>;
  createdAt: string;
}

// ─── Pending visits ────────────────────────────────────────────────────────────

export async function storePendingVisit(data: Record<string, unknown>): Promise<PendingVisit> {
  const db = await getDB();
  const entry: PendingVisit = { id: crypto.randomUUID(), data, createdAt: new Date().toISOString() };
  await db.put(VISITS_STORE, entry);
  return entry;
}

export async function getPendingVisits(): Promise<PendingVisit[]> {
  const db = await getDB();
  return db.getAll(VISITS_STORE);
}

export async function clearPendingVisit(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(VISITS_STORE, id);
}

// ─── Pending households ────────────────────────────────────────────────────────

export async function storePendingHousehold(data: Record<string, unknown>): Promise<PendingHousehold> {
  const db = await getDB();
  const entry: PendingHousehold = { id: crypto.randomUUID(), data, createdAt: new Date().toISOString() };
  await db.put(HOUSEHOLDS_STORE, entry);
  return entry;
}

export async function getPendingHouseholds(): Promise<PendingHousehold[]> {
  const db = await getDB();
  return db.getAll(HOUSEHOLDS_STORE);
}

export async function clearPendingHousehold(id: string): Promise<void> {
  const db = await getDB();
  await db.delete(HOUSEHOLDS_STORE, id);
}

// ─── Households read cache ─────────────────────────────────────────────────────

export async function cacheHouseholds(territoryId: string, data: Household[]): Promise<void> {
  const db = await getDB();
  await db.put(HOUSEHOLDS_CACHE, data, territoryId);
}

export async function getCachedHouseholds(territoryId: string): Promise<Household[] | null> {
  const db = await getDB();
  return (await db.get(HOUSEHOLDS_CACHE, territoryId)) ?? null;
}

// ─── Visits read cache ─────────────────────────────────────────────────────────

export async function cacheVisits(territoryId: string, data: Visit[]): Promise<void> {
  const db = await getDB();
  await db.put(VISITS_CACHE, data, territoryId);
}

export async function getCachedVisits(territoryId: string): Promise<Visit[] | null> {
  const db = await getDB();
  return (await db.get(VISITS_CACHE, territoryId)) ?? null;
}

// ─── Sync registration ─────────────────────────────────────────────────────────

export async function registerVisitSync(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    // @ts-expect-error — BackgroundSync not in all TS types yet
    if (reg.sync) {
      // @ts-expect-error
      await reg.sync.register('visits-sync');
    }
  } catch {
    // Background Sync not supported
  }
}
