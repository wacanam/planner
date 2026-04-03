/**
 * IndexedDB store for pending avatar uploads.
 *
 * Offline-first pattern:
 * 1. App always stores Blob in IDB immediately (no network needed)
 * 2. App registers a Background Sync tag 'avatar-upload'
 * 3. Service Worker picks up the sync event when online and uploads to R2
 * 4. On success, SW deletes from IDB and notifies the page via postMessage
 *
 * Why IndexedDB over localStorage:
 * - Stores raw Blob natively (no base64 ~33% size bloat)
 * - Async / non-blocking
 * - Accessible from Service Worker for background sync
 * - Much higher storage quota
 */

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'ministry-planner';
const DB_VERSION = 4; // bumped to add visit/household cache stores
const AVATAR_STORE = 'pending-avatars';
const AUTH_STORE = 'auth';

let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(AVATAR_STORE)) {
        db.createObjectStore(AVATAR_STORE);
      }
      if (!db.objectStoreNames.contains(AUTH_STORE)) {
        db.createObjectStore(AUTH_STORE);
      }
    },
  });
  return _db;
}

/** Store a pending avatar Blob for a user */
export async function storePendingAvatarBlob(userId: string, blob: Blob): Promise<void> {
  const db = await getDB();
  await db.put(AVATAR_STORE, blob, userId);
}

/** Retrieve a pending avatar Blob (or null if none) */
export async function getPendingAvatarBlob(userId: string): Promise<Blob | null> {
  const db = await getDB();
  return (await db.get(AVATAR_STORE, userId)) ?? null;
}

/** Remove the pending avatar after successful upload */
export async function clearPendingAvatarBlob(userId: string): Promise<void> {
  const db = await getDB();
  await db.delete(AVATAR_STORE, userId);
}

/** Store the auth token in IDB so the Service Worker can use it for uploads */
export async function storeAuthToken(token: string): Promise<void> {
  const db = await getDB();
  await db.put(AUTH_STORE, token, 'token');
}

/** Cheap localStorage flag to avoid opening IDB on every render */
export function hasPendingAvatarFlag(userId: string): boolean {
  try {
    return localStorage.getItem(`idb_avatar_flag_${userId}`) === '1';
  } catch {
    return false;
  }
}

export function setPendingAvatarFlag(userId: string, value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(`idb_avatar_flag_${userId}`, '1');
    } else {
      localStorage.removeItem(`idb_avatar_flag_${userId}`);
    }
  } catch {
    // ignore
  }
}

/**
 * Register a Background Sync tag so the Service Worker uploads
 * the pending avatar when connectivity is available.
 * Falls back to immediate upload attempt if Background Sync is unsupported.
 */
export async function registerAvatarSync(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    // @ts-expect-error — BackgroundSync not in all TS types yet
    if (reg.sync) {
      // @ts-expect-error
      await reg.sync.register('avatar-upload');
    }
  } catch {
    // Background Sync not supported — SW will retry on next 'online' event
  }
}
