/**
 * # Offline-First Store — Universal Foundation
 *
 * All offline-capable features in this app use this module.
 *
 * ## Pattern
 *
 * ### READ (SWR + IDB cache)
 * Use `withOfflineCache` as the SWR fetcher:
 * ```ts
 * useSWR(key, withOfflineCache('households-cache', cacheKey, (url) => apiClient.get(url)))
 * ```
 * - Online: fetches from server, caches result to IDB
 * - Offline: serves from IDB cache; throws if no cache exists
 *
 * ### WRITE (IDB queue → SW Background Sync)
 * ```ts
 * const id = await queueWrite('pending-visits', formData);
 * setPendingFlag('visits', true);
 * await registerSync('visits-sync');
 * ```
 * The Service Worker (`public/sw.js`) handles sync:
 * - Reads pending writes from IDB
 * - POSTs to server with retry + backoff
 * - Calls `clearPendingWrite` on success
 * - Sends postMessage to page: `{ type: 'SYNCED', tag, id }`
 *
 * ## Adding a new offline feature
 * 1. Add store names to `STORES` array below (bump DB_VERSION)
 * 2. Use `withOfflineCache` for reads
 * 3. Use `queueWrite + registerSync` for writes
 * 4. Add SW sync handler in `public/sw.js`
 * 5. Listen for postMessage in component to clear ⏳ badges
 */

import { openDB, type IDBPDatabase } from 'idb';

// ─── DB config — add new stores here, bump version ───────────────────────────

const DB_NAME = 'ministry-planner';
export const DB_VERSION = 3;

const STORES = [
  // Existing
  'pending-avatars',
  'auth',
  // Read caches
  'households-cache',
  'visits-cache',
  // Write queues
  'pending-households',
  'pending-visits',
] as const;

export type StoreName = (typeof STORES)[number];

let _db: IDBPDatabase | null = null;

export async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      }
    },
  });
  return _db;
}

// ─── Read cache ───────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

/** Cache server response to IDB keyed by a string */
export async function cacheData<T>(store: StoreName, key: string, data: T): Promise<void> {
  const db = await getDB();
  await db.put(store, { data, cachedAt: Date.now() } satisfies CacheEntry<T>, key);
}

/** Get cached data. Returns null if not cached. */
export async function getCachedData<T>(store: StoreName, key: string): Promise<T | null> {
  const db = await getDB();
  const entry = (await db.get(store, key)) as CacheEntry<T> | undefined;
  return entry?.data ?? null;
}

/**
 * SWR fetcher factory with IDB offline fallback.
 *
 * Wraps any fetcher: caches on success, returns IDB cache when offline.
 *
 * @example
 * useSWR(url, withOfflineCache('households-cache', territoryId, (u) => apiClient.get(u)))
 */
export type DataSource = 'server' | 'cache' | 'loading';

export function withOfflineCache<T>(
  cacheStore: StoreName,
  cacheKey: string,
  fetcher: (url: string) => Promise<T>,
  onSource?: (source: 'server' | 'cache') => void,
): (url: string) => Promise<T> {
  return async (url: string): Promise<T> => {
    try {
      const result = await fetcher(url);
      await cacheData(cacheStore, cacheKey, result);
      onSource?.('server');
      return result;
    } catch {
      const cached = await getCachedData<T>(cacheStore, cacheKey);
      if (cached !== null) {
        onSource?.('cache');
        return cached;
      }
      throw new Error('You are offline and no cached data is available.');
    }
  };
}

// ─── Write queue ──────────────────────────────────────────────────────────────

export interface PendingWrite<T = unknown> {
  id: string;        // temp UUID (client-side, replaced by server id after sync)
  data: T;
  createdAt: string;
}

/** Queue a write to IDB. Returns the temp id. */
export async function queueWrite<T>(store: StoreName, data: T): Promise<string> {
  const db = await getDB();
  const id = crypto.randomUUID();
  const entry: PendingWrite<T> = { id, data, createdAt: new Date().toISOString() };
  await db.put(store, entry, id);
  return id;
}

/** Get all pending writes for a store */
export async function getPendingWrites<T>(store: StoreName): Promise<PendingWrite<T>[]> {
  const db = await getDB();
  return ((await db.getAll(store)) as PendingWrite<T>[]);
}

/** Remove a pending write after successful server sync */
export async function clearPendingWrite(store: StoreName, id: string): Promise<void> {
  const db = await getDB();
  await db.delete(store, id);
}

// ─── Background Sync registration ────────────────────────────────────────────

/** Register a Background Sync tag with the Service Worker */
export async function registerSync(tag: string): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    // @ts-expect-error — BackgroundSync not in all TS type definitions yet
    if (reg.sync) await reg.sync.register(tag);
  } catch {
    // Not supported — SW will retry on 'online' event instead
  }
}

// ─── Pending flag (cheap localStorage check before opening IDB) ──────────────

/** Check if there are pending writes without opening IDB */
export function hasPendingFlag(key: string): boolean {
  try {
    return localStorage.getItem(`pending_${key}`) === '1';
  } catch {
    return false;
  }
}

/** Set/clear the pending flag */
export function setPendingFlag(key: string, value: boolean): void {
  try {
    if (value) localStorage.setItem(`pending_${key}`, '1');
    else localStorage.removeItem(`pending_${key}`);
  } catch {
    // ignore
  }
}
