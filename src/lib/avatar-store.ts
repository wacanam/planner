import { getLocalFirstDB } from '@/lib/local-first/database';
import { notifyAvatarSynced, notifyLocalFirstChange } from '@/lib/local-first/events';
import { nowIso, syncErrorMessage } from '@/lib/local-first/shared';

const AVATAR_FLAG_PREFIX = 'pending_avatar_';

export async function storePendingAvatarBlob(userId: string, blob: Blob): Promise<void> {
  const database = await getLocalFirstDB();
  const now = nowIso();
  await database.avataruploads.incrementalUpsert({
    id: userId,
    userId,
    fileName: blob instanceof File ? blob.name : 'avatar.jpg',
    mimeType: blob.type || 'image/jpeg',
    dataUrl: await blobToDataUrl(blob),
    syncStatus: 'pending',
    syncError: null,
    createdAt: now,
    updatedAt: now,
    lastSyncedAt: null,
  });
  notifyLocalFirstChange();
}

export async function getPendingAvatarBlob(userId: string): Promise<Blob | null> {
  const database = await getLocalFirstDB();
  const document = await database.avataruploads.findOne(userId).exec();
  const upload = document?.toMutableJSON() as { dataUrl?: string; mimeType?: string } | undefined;
  if (!upload?.dataUrl) return null;
  return dataUrlToBlob(upload.dataUrl, upload.mimeType ?? 'image/jpeg');
}

export async function clearPendingAvatarBlob(userId: string): Promise<void> {
  const database = await getLocalFirstDB();
  const document = await database.avataruploads.findOne(userId).exec();
  if (document) await document.remove();
  setPendingAvatarFlag(userId, false);
  notifyLocalFirstChange();
}

export async function storeAuthToken(_token: string): Promise<void> {
  // Auth tokens are no longer stored locally. API calls request fresh session tokens.
}

export function hasPendingAvatarFlag(userId: string): boolean {
  try {
    return localStorage.getItem(`${AVATAR_FLAG_PREFIX}${userId}`) === '1';
  } catch {
    return false;
  }
}

export function setPendingAvatarFlag(userId: string, value: boolean): void {
  try {
    if (value) localStorage.setItem(`${AVATAR_FLAG_PREFIX}${userId}`, '1');
    else localStorage.removeItem(`${AVATAR_FLAG_PREFIX}${userId}`);
  } catch {
    // localStorage can be unavailable in strict privacy modes.
  }
}

export async function registerAvatarSync(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  await syncPendingAvatarUploads();
}

export async function syncPendingAvatarUploads(): Promise<number> {
  const database = await getLocalFirstDB();
  const documents = await database.avataruploads.find().exec();
  let synced = 0;

  for (const document of documents) {
    const upload = document.toMutableJSON() as {
      userId: string;
      dataUrl: string;
      mimeType: string;
      fileName: string;
      syncStatus: string;
    };
    if (upload.syncStatus === 'synced') continue;

    try {
      await document.incrementalPatch({ syncStatus: 'syncing', syncError: null, updatedAt: nowIso() });
      const token = await getFreshToken();
      const blob = dataUrlToBlob(upload.dataUrl, upload.mimeType);
      const formData = new FormData();
      formData.append('file', blob, upload.fileName || 'avatar.jpg');

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.status === 503) {
        await document.incrementalPatch({
          syncStatus: 'failed',
          syncError: 'Profile picture storage is not configured yet.',
          updatedAt: nowIso(),
        });
        continue;
      }

      if (!response.ok) {
        throw new Error(`Avatar upload failed: HTTP ${response.status}`);
      }

      const payload = (await response.json()) as { data?: { avatarUrl?: string | null } };
      await document.remove();
      setPendingAvatarFlag(upload.userId, false);
      notifyAvatarSynced(upload.userId, payload.data?.avatarUrl ?? null);
      synced += 1;
    } catch (error) {
      await document.incrementalPatch({
        syncStatus: 'failed',
        syncError: syncErrorMessage(error),
        updatedAt: nowIso(),
      });
    }
  }

  if (synced > 0) notifyLocalFirstChange();
  return synced;
}

async function getFreshToken(): Promise<string> {
  const response = await fetch('/api/auth/token');
  if (!response.ok) throw new Error('Unable to refresh auth token');
  const payload = (await response.json()) as { token?: string };
  if (!payload.token) throw new Error('Auth token response did not include a token');
  return payload.token;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string, fallbackMimeType: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeType = /data:(.*?);base64/.exec(header)?.[1] || fallbackMimeType;
  const binary = atob(base64 ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new Blob([bytes], { type: mimeType });
}