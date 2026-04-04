/**
 * Avatar-specific offline store helpers.
 * Delegates to the universal offline-store foundation.
 */

import { getDB, registerSync, hasPendingFlag, setPendingFlag } from './offline-store';

const STORE = 'pending-avatars';

export async function storePendingAvatarBlob(userId: string, blob: Blob): Promise<void> {
  const db = await getDB();
  await db.put(STORE, blob, userId);
}

export async function getPendingAvatarBlob(userId: string): Promise<Blob | null> {
  const db = await getDB();
  return (await db.get(STORE, userId)) ?? null;
}

export async function clearPendingAvatarBlob(userId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, userId);
}

export async function storeAuthToken(token: string): Promise<void> {
  const db = await getDB();
  await db.put('auth', token, 'token');
}

export function hasPendingAvatarFlag(userId: string): boolean {
  return hasPendingFlag(`avatar_${userId}`);
}

export function setPendingAvatarFlag(userId: string, value: boolean): void {
  setPendingFlag(`avatar_${userId}`, value);
}

export async function registerAvatarSync(): Promise<void> {
  await registerSync('avatar-upload');
}
