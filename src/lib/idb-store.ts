/**
 * Reactive IDB Store — Core abstraction layer
 *
 * Pattern:
 * - React reads from IDB via reactive hooks
 * - React writes to IDB (queues if pending)
 * - SW updates IDB from API
 * - Any IDB change triggers React subscribers
 *
 * This is the ONLY place that touches IndexedDB.
 * Everything else goes through this library.
 */

import { type IDBPDatabase, openDB } from 'idb';

import React from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type StoreName =
  | 'pending-avatars'
  | 'auth'
  | 'households-cache'
  | 'visits-cache'
  | 'pending-households'
  | 'pending-visits'
  | 'pending-encounters';

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
}

type Listener<T> = (data: T | null, source: 'idb' | 'sw' | 'ui') => void;

// ─── Singleton DB instance ───────────────────────────────────────────────────

let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB('ministry-planner', 4, {
    upgrade(db) {
      const stores: StoreName[] = [
        'pending-avatars',
        'auth',
        'households-cache',
        'visits-cache',
        'pending-households',
        'pending-visits',
        'pending-encounters',
      ];
      for (const store of stores) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store);
        }
      }
    },
  });
  return _db;
}

// ─── Subscribers (reactive) ───────────────────────────────────────────────────

const subscribers = new Map<string, Set<Listener<unknown>>>();

function getSubscriberKey(store: StoreName, key: string): string {
  return `${store}:${key}`;
}

function subscribe<T>(store: StoreName, key: string, listener: Listener<T>): () => void {
  const subKey = getSubscriberKey(store, key);
  if (!subscribers.has(subKey)) {
    subscribers.set(subKey, new Set());
  }
  const listenerSet = subscribers.get(subKey);
  if (listenerSet) {
    listenerSet.add(listener as Listener<unknown>);
  }

  // Return unsubscribe function
  return () => {
    subscribers.get(subKey)?.delete(listener as Listener<unknown>);
  };
}

function notifySubscribers<T>(
  store: StoreName,
  key: string,
  data: T | null,
  source: 'idb' | 'sw' | 'ui'
) {
  const subKey = getSubscriberKey(store, key);
  const listeners = subscribers.get(subKey);
  if (listeners) {
    for (const listener of listeners) {
      listener(data, source);
    }
  }
}

// ─── Core Reactive Store ──────────────────────────────────────────────────────

/**
 * Read from IDB cache.
 * Returns null if not cached.
 */
export async function readFromIDB<T>(store: StoreName, key: string): Promise<T | null> {
  const db = await getDB();
  const entry = (await db.get(store, key)) as CacheEntry<T> | undefined;
  return entry?.data ?? null;
}

/**
 * Write to IDB cache.
 * Updates timestamp. Notifies subscribers.
 */
export async function writeToIDB<T>(
  store: StoreName,
  key: string,
  data: T,
  source: 'idb' | 'sw' | 'ui' = 'ui'
): Promise<void> {
  const db = await getDB();
  await db.put(store, { data, cachedAt: Date.now() } satisfies CacheEntry<T>, key);
  notifySubscribers(store, key, data, source);
}

/**
 * Delete from IDB.
 * Notifies subscribers with null.
 */
export async function deleteFromIDB(store: StoreName, key: string): Promise<void> {
  const db = await getDB();
  await db.delete(store, key);
  notifySubscribers(store, key, null, 'idb');
}

/**
 * Batch read all entries from a store.
 */
export async function readAllFromIDB<T>(
  store: StoreName
): Promise<Array<{ key: string; data: T }>> {
  const db = await getDB();
  const allKeys = await db.getAllKeys(store);
  const results: Array<{ key: string; data: T }> = [];

  for (const key of allKeys) {
    const entry = (await db.get(store, key)) as CacheEntry<T> | undefined;
    if (entry?.data) {
      results.push({ key: String(key), data: entry.data });
    }
  }

  return results;
}

/**
 * Get all pending writes for sync.
 */
export async function getPendingWrites<T>(
  store: 'pending-visits' | 'pending-households' | 'pending-encounters'
): Promise<Array<{ id: string; data: T }>> {
  const all = await readAllFromIDB<T>(store);
  return all.map(({ key, data }) => ({ id: key, data }));
}

/**
 * Clear a pending write after successful sync.
 */
export async function clearPendingWrite(
  store: 'pending-visits' | 'pending-households' | 'pending-encounters',
  id: string
): Promise<void> {
  await deleteFromIDB(store, id);
}

/**
 * Queue a write (for SW to pick up and sync).
 */
export async function queueWrite<T>(
  store: 'pending-visits' | 'pending-households' | 'pending-encounters',
  id: string,
  data: T
): Promise<void> {
  await writeToIDB(store, id, data, 'ui');
}

// ─── Reactive Hook Factory ───────────────────────────────────────────────────

/**
 * React hook that reads from IDB and stays in sync.
 *
 * @example
 * const [visits, isLoading, error] = useIDBStore('visits-cache', 'my-visits');
 */
export function useIDBStore<T>(
  store: StoreName,
  key: string,
  initialValue: T | null = null
): [T | null, boolean, string | null, (value: T) => Promise<void>] {
  const [data, setData] = React.useState<T | null>(initialValue);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const write = React.useCallback(
    async (value: T) => {
      try {
        await writeToIDB(store, key, value, 'ui');
      } catch (err) {
        setError(String(err));
        throw err;
      }
    },
    [store, key]
  );

  React.useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    // Initial load
    (async () => {
      try {
        const cached = await readFromIDB<T>(store, key);
        setData(cached);
        setError(null);
      } catch (err) {
        setError(String(err));
      } finally {
        setIsLoading(false);
      }

      // Subscribe for future updates
      unsubscribe = subscribe<T>(store, key, (newData) => {
        setData(newData);
      });
    })();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [store, key]);

  return [data, isLoading, error, write];
}

// ─── SW Integration helpers ───────────────────────────────────────────────────

/**
 * SW calls this to update the read cache from API.
 * This will notify all React subscribers automatically.
 */
export async function updateCacheFromAPI<T>(
  store: 'households-cache' | 'visits-cache',
  key: string,
  data: T
): Promise<void> {
  await writeToIDB(store, key, data, 'sw');
}

/**
 * SW calls this to bulk update cache (after API sync).
 */
export async function bulkUpdateCache<T>(
  store: 'households-cache' | 'visits-cache',
  entries: Array<{ key: string; data: T }>
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(store, 'readwrite');

  for (const { key, data } of entries) {
    await tx.store.put({ data, cachedAt: Date.now() } satisfies CacheEntry<T>, key);
    notifySubscribers(store, key, data, 'sw');
  }

  await tx.done;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Check if there are pending writes.
 */
export async function hasPendingWrites(): Promise<boolean> {
  const visits = await readAllFromIDB('pending-visits');
  const households = await readAllFromIDB('pending-households');
  const encounters = await readAllFromIDB('pending-encounters');

  return visits.length > 0 || households.length > 0 || encounters.length > 0;
}
