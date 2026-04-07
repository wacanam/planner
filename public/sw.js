const CACHE_NAME = 'ministry-planner-v1';
const STATIC_ASSETS = ['/', '/offline', '/territories', '/notifications'];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

// ─── Fetch strategy ───────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/offline').then((r) => r || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});

// ─── Background Sync — avatar upload ─────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'avatar-upload') {
    event.waitUntil(syncAvatarUpload());
  }
  if (event.tag === 'visits-sync') {
    event.waitUntil(syncVisitsAndHouseholds());
  }
});

/**
 * Ask an active page client for a fresh auth token.
 * The page fetches /api/auth/token (which has session context)
 * and posts it back — avoids storing potentially expired tokens in IDB.
 */
async function requestFreshToken() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clients.length === 0) throw new Error('No active page to request token from');

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();
    const timeout = setTimeout(() => reject(new Error('Token request timed out')), 10_000);
    messageChannel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      if (event.data?.token) {
        resolve(event.data.token);
      } else {
        reject(new Error('No token in response'));
      }
    };
    clients[0].postMessage({ type: 'REQUEST_AUTH_TOKEN' }, [messageChannel.port2]);
  });
}

async function syncAvatarUpload() {
  const db = await openIDB();
  const userIds = await db.getAllKeys('pending-avatars');

  if (userIds.length === 0) return;

  // Get a fresh token from the page before uploading
  let token;
  try {
    token = await requestFreshToken();
  } catch (err) {
    // No active page or timed out — Background Sync will retry automatically
    console.log('[SW] Could not get auth token:', err.message);
    throw err; // Re-throw so Background Sync retries later
  }

  for (const userId of userIds) {
    const blob = await db.get('pending-avatars', userId);
    if (!blob) continue;

    let success = false;
    let attempt = 0;
    const MAX_ATTEMPTS = 3;
    const BACKOFF_MS = [2000, 5000, 10000];

    while (!success && attempt < MAX_ATTEMPTS) {
      try {
        const formData = new FormData();
        formData.append('file', blob, 'avatar.jpg');

        const res = await fetch('/api/profile/avatar', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          await db.delete('pending-avatars', userId);

          // Notify all open clients
          const allClients = await self.clients.matchAll({ type: 'window' });
          for (const client of allClients) {
            client.postMessage({
              type: 'AVATAR_SYNCED',
              userId,
              avatarUrl: data?.data?.avatarUrl,
            });
          }
          success = true;
        } else if (res.status === 401) {
          // Token expired mid-retry — request a fresh one and retry once more
          try {
            token = await requestFreshToken();
          } catch {
            throw new Error('Token refresh failed during upload');
          }
          attempt++; // retry immediately with new token
        } else if (res.status === 503) {
          // R2 not configured — don't retry, keep in IDB until configured
          console.log('[SW] R2 not configured, keeping avatar in IDB');
          success = true; // treat as "handled" so we don't loop forever
          break;
        } else {
          throw new Error(`Upload failed: ${res.status}`);
        }
      } catch (err) {
        attempt++;
        if (attempt < MAX_ATTEMPTS) {
          // Exponential backoff
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
        } else {
          // All retries exhausted — re-throw so Background Sync retries the whole sync event later
          throw err;
        }
      }
    }
  }
}

// ─── Background Sync — visits + households ────────────────────────────────────

async function syncVisitsAndHouseholds() {
  const db = await openIDB();

  let token;
  try {
    token = await requestFreshToken();
  } catch (err) {
    console.log('[SW] Could not get auth token for visits sync:', err.message);
    throw err;
  }

  // Sync pending households first (visits may reference them)
  const pendingHouseholds = await db.getAll('pending-households');
  for (const entry of pendingHouseholds) {
    let attempt = 0;
    const MAX_ATTEMPTS = 3;
    const BACKOFF_MS = [2000, 5000, 10000];
    let success = false;
    while (!success && attempt < MAX_ATTEMPTS) {
      try {
        const res = await fetch('/api/households', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(entry.data),
        });
        if (res.ok) {
          await db.delete('pending-households', entry.id);
          const allClients = await self.clients.matchAll({ type: 'window' });
          for (const client of allClients) {
            client.postMessage({ type: 'HOUSEHOLD_SYNCED', pendingId: entry.id });
          }
          success = true;
        } else if (res.status === 401) {
          try {
            token = await requestFreshToken();
          } catch {
            throw new Error('Token refresh failed');
          }
          attempt++;
        } else {
          throw new Error(`POST /api/households failed: ${res.status}`);
        }
      } catch (err) {
        attempt++;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
        } else {
          throw err;
        }
      }
    }
  }

  // Sync pending visits
  const pendingVisits = await db.getAll('pending-visits');
  for (const entry of pendingVisits) {
    let attempt = 0;
    const MAX_ATTEMPTS = 3;
    const BACKOFF_MS = [2000, 5000, 10000];
    let success = false;
    while (!success && attempt < MAX_ATTEMPTS) {
      try {
        const res = await fetch('/api/visits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(entry.data),
        });
        if (res.ok) {
          await db.delete('pending-visits', entry.id);
          const allClients = await self.clients.matchAll({ type: 'window' });
          for (const client of allClients) {
            client.postMessage({ type: 'VISIT_SYNCED', pendingId: entry.id });
          }
          success = true;
        } else if (res.status === 401) {
          try {
            token = await requestFreshToken();
          } catch {
            throw new Error('Token refresh failed');
          }
          attempt++;
        } else {
          throw new Error(`POST /api/visits failed: ${res.status}`);
        }
      } catch (err) {
        attempt++;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
        } else {
          throw err;
        }
      }
    }
  }

  // Sync pending encounters
  const pendingEncounters = await db.getAll('pending-encounters');
  for (const entry of pendingEncounters) {
    let attempt = 0;
    const MAX_ATTEMPTS = 3;
    const BACKOFF_MS = [2000, 5000, 10000];
    let success = false;
    while (!success && attempt < MAX_ATTEMPTS) {
      try {
        const visitId = entry.data.visitId;
        const res = await fetch(`/api/visits/${visitId}/encounters`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(entry.data),
        });
        if (res.ok) {
          await db.delete('pending-encounters', entry.id);
          const allClients = await self.clients.matchAll({ type: 'window' });
          for (const client of allClients) {
            client.postMessage({ type: 'ENCOUNTER_SYNCED', pendingId: entry.id });
          }
          success = true;
        } else if (res.status === 401) {
          try {
            token = await requestFreshToken();
          } catch {
            throw new Error('Token refresh failed');
          }
          attempt++;
        } else {
          throw new Error(`POST /api/visits/:id/encounters failed: ${res.status}`);
        }
      } catch (err) {
        attempt++;
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
        } else {
          throw err;
        }
      }
    }
  }

  // ────── After all syncs complete, refresh the read caches from API ────────────
  try {
    console.log('[SW] Syncs complete, refreshing caches from API...');
    
    // Refresh households cache
    try {
      const householdsRes = await fetch('/api/households', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (householdsRes.ok) {
        const households = await householdsRes.json();
        // Store in IDB cache
        const tx = db.transaction('households-cache', 'readwrite');
        await tx.store.put({ data: households, cachedAt: Date.now() }, 'all');
        console.log('[SW] Updated households-cache with', households.length, 'households');
      }
    } catch (err) {
      console.warn('[SW] Failed to refresh households cache:', err.message);
    }

    // Refresh visits cache
    try {
      const visitsRes = await fetch('/api/visits', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (visitsRes.ok) {
        const visits = await visitsRes.json();
        // Store in IDB cache
        const tx = db.transaction('visits-cache', 'readwrite');
        await tx.store.put({ data: visits, cachedAt: Date.now() }, 'my-visits');
        console.log('[SW] Updated visits-cache with', visits.length, 'visits');
      }
    } catch (err) {
      console.warn('[SW] Failed to refresh visits cache:', err.message);
    }

    // Notify all clients that caches were updated
    const allClients = await self.clients.matchAll({ type: 'window' });
    for (const client of allClients) {
      client.postMessage({ type: 'CACHE_UPDATED' });
    }
    console.log('[SW] Notified', allClients.length, 'clients of cache update');
  } catch (err) {
    console.error('[SW] Error refreshing caches:', err);
  }
}

// ─── Minimal IDB helper ───────────────────────────────────────────────────────

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ministry-planner', 4);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending-avatars')) {
        db.createObjectStore('pending-avatars');
      }
      if (!db.objectStoreNames.contains('auth')) {
        db.createObjectStore('auth');
      }
      if (!db.objectStoreNames.contains('pending-visits')) {
        db.createObjectStore('pending-visits', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending-households')) {
        db.createObjectStore('pending-households', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pending-encounters')) {
        db.createObjectStore('pending-encounters', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('visits-cache')) {
        db.createObjectStore('visits-cache');
      }
      if (!db.objectStoreNames.contains('households-cache')) {
        db.createObjectStore('households-cache');
      }
    };
    req.onsuccess = (e) => resolve(wrapDB(e.target.result));
    req.onerror = () => reject(req.error);
  });
}

function wrapDB(db) {
  const tx = (store, mode) => db.transaction(store, mode).objectStore(store);
  return {
    get: (store, key) =>
      new Promise((res, rej) => {
        const r = tx(store, 'readonly').get(key);
        r.onsuccess = () => res(r.result ?? null);
        r.onerror = () => rej(r.error);
      }),
    getAllKeys: (store) =>
      new Promise((res, rej) => {
        const r = tx(store, 'readonly').getAllKeys();
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      }),
    delete: (store, key) =>
      new Promise((res, rej) => {
        const r = tx(store, 'readwrite').delete(key);
        r.onsuccess = () => res();
        r.onerror = () => rej(r.error);
      }),
    getAll: (store) =>
      new Promise((res, rej) => {
        const r = tx(store, 'readonly').getAll();
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      }),
  };
}
