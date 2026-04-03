/**
 * IndexedDB store for pending avatar uploads.
 *
 * Why IndexedDB over localStorage:
 * - Stores raw Blob natively (no base64 bloat ~33% size increase)
 * - Async / non-blocking
 * - Accessible from Service Worker for background sync
 * - Much higher storage quota (~50-500MB vs ~5MB)
 */

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'ministry-planner';
const DB_VERSION = 1;
const STORE = 'pending-avatars';

let _db: IDBPDatabase | null = null;

async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    },
  });
  return _db;
}

/** Store a pending avatar Blob for a user */
export async function storePendingAvatarBlob(userId: string, blob: Blob): Promise<void> {
  const db = await getDB();
  await db.put(STORE, blob, userId);
}

/** Retrieve a pending avatar Blob (or null if none) */
export async function getPendingAvatarBlob(userId: string): Promise<Blob | null> {
  const db = await getDB();
  return (await db.get(STORE, userId)) ?? null;
}

/** Remove the pending avatar after successful upload */
export async function clearPendingAvatarBlob(userId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, userId);
}

/** Check synchronously (no DB needed) whether a pending entry might exist */
export function hasPendingAvatarFlag(userId: string): boolean {
  try {
    return localStorage.getItem(`idb_avatar_flag_${userId}`) === '1';
  } catch {
    return false;
  }
}

/** Set/clear the flag in localStorage (cheap check before opening IDB) */
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
