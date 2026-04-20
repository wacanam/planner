const CACHE_NAME = 'ministry-planner-v1';
const STATIC_ASSETS = ['/', '/offline', '/notifications'];
const SW_VERSION = 'debug-v1';
let swDebugEnabled = false;
let swDebugCounter = 0;

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(precacheStaticAssets());
  self.skipWaiting();
});

async function precacheStaticAssets() {
  const cache = await caches.open(CACHE_NAME);

  await Promise.all(
    STATIC_ASSETS.map(async (asset) => {
      try {
        const response = await fetch(asset, { cache: 'no-cache' });
        if (!response.ok) return;
        await cache.put(asset, response.clone());
      } catch {
        // Ignore individual precache failures so one bad route doesn't abort install.
      }
    })
  );
}

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
  swDebug('Background sync event received', { tag: event.tag });
  if (event.tag === 'avatar-upload') {
    event.waitUntil(syncAvatarUpload());
  }
  if (event.tag === 'visits-sync') {
    event.waitUntil(syncVisitsAndHouseholds());
  }
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'MANUAL_SYNC') {
    swDebug('Manual sync message received');
    event.waitUntil(runManualSync());
    return;
  }
  if (event.data?.type === 'SET_SW_DEBUG') {
    swDebugEnabled = Boolean(event.data.enabled);
    swDebug('Verbose SW debug updated', { enabled: swDebugEnabled });
    event.waitUntil(
      notifyClients({
        type: 'SW_DEBUG_STATE',
        enabled: swDebugEnabled,
        version: SW_VERSION,
      })
    );
    return;
  }
  if (event.data?.type === 'GET_SW_DEBUG_STATE') {
    event.waitUntil(
      notifyClients({
        type: 'SW_DEBUG_STATE',
        enabled: swDebugEnabled,
        version: SW_VERSION,
      })
    );
    return;
  }
  if (event.data?.type === 'PING_SW') {
    swDebug('Ping received from page');
    event.waitUntil(
      notifyClients({
        type: 'SW_PONG',
        enabled: swDebugEnabled,
        version: SW_VERSION,
      })
    );
  }
});

async function notifyClients(message) {
  const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of allClients) {
    client.postMessage(message);
  }
}

function swTrace(level, ...args) {
  const consoleObject = self.console;
  const logger = consoleObject?.[level];
  if (typeof logger === 'function') {
    logger.apply(consoleObject, args);
  }
}

function swDebug(message, data) {
  swTrace('log', '[SW DEBUG]', message, data ?? '');
  if (!swDebugEnabled) return;

  swDebugCounter += 1;
  void notifyClients({
    type: 'SW_DEBUG_LOG',
    entry: {
      id: swDebugCounter,
      at: new Date().toISOString(),
      message,
      data: data ?? null,
    },
  });
}

async function readErrorDetails(response) {
  try {
    const text = await response.text();
    return text || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

function unwrapApiData(payload) {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload.data;
  }
  return payload;
}

function ensureArrayPayload(payload) {
  const data = unwrapApiData(payload);
  return Array.isArray(data) ? data : [];
}

function isObject(value) {
  return value !== null && typeof value === 'object';
}

async function saveIdMapping(db, kind, tempId, serverId) {
  await db.put('auth', { serverId, updatedAt: Date.now() }, `sync-map:${kind}:${tempId}`);
}

async function getIdMapping(db, kind, tempId) {
  const entry = await db.get('auth', `sync-map:${kind}:${tempId}`);
  if (!isObject(entry)) return null;
  return typeof entry.serverId === 'string' ? entry.serverId : null;
}

async function remapQueuedEntries(db, store, rewrite) {
  const entries = await db.getAll(store);
  let updated = 0;

  for (const entry of entries) {
    if (!isObject(entry) || !('data' in entry) || typeof entry.id !== 'string') continue;
    const nextData = rewrite(entry.data, entry);
    if (!nextData) continue;
    await db.put(store, { ...entry, data: nextData }, entry.id);
    updated += 1;
  }

  return updated;
}

async function runManualSync() {
  try {
    swDebug('Manual sync started');
    await syncAvatarUpload();
    await syncVisitsAndHouseholds();
    swDebug('Manual sync finished successfully');
    await notifyClients({ type: 'MANUAL_SYNC_COMPLETE' });
  } catch (err) {
    swTrace('error', '[SW] Manual sync failed:', err);
    swDebug('Manual sync failed', { error: err instanceof Error ? err.message : String(err) });
    await notifyClients({
      type: 'MANUAL_SYNC_ERROR',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

/**
 * Ask an active page client for a fresh auth token.
 * The page fetches /api/auth/token (which has session context)
 * and posts it back — avoids storing potentially expired tokens in IDB.
 */
async function requestFreshToken() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clients.length === 0) throw new Error('No active page to request token from');
  swDebug('Requesting fresh auth token', { clients: clients.length });

  return new Promise((resolve, reject) => {
    const messageChannel = new MessageChannel();
    const timeout = setTimeout(() => reject(new Error('Token request timed out')), 10_000);
    messageChannel.port1.onmessage = (event) => {
      clearTimeout(timeout);
      if (event.data?.token) {
        swDebug('Fresh auth token received');
        resolve(event.data.token);
      } else {
        swDebug('Fresh auth token request failed', {
          error: event.data?.error ?? 'No token in response',
        });
        reject(new Error('No token in response'));
      }
    };
    clients[0].postMessage({ type: 'REQUEST_AUTH_TOKEN' }, [messageChannel.port2]);
  });
}

async function syncAvatarUpload() {
  const db = await openIDB();
  const userIds = await db.getAllKeys('pending-avatars');
  swDebug('Avatar sync scan complete', { pending: userIds.length });

  if (userIds.length === 0) return;

  // Get a fresh token from the page before uploading
  let token;
  try {
    token = await requestFreshToken();
  } catch (err) {
    // No active page or timed out — Background Sync will retry automatically
    swTrace('log', '[SW] Could not get auth token:', err.message);
    swDebug('Avatar sync stopped: token fetch failed', { error: err.message });
    throw err; // Re-throw so Background Sync retries later
  }

  for (const userId of userIds) {
    const blob = await db.get('pending-avatars', userId);
    if (!blob) continue;
    swDebug('Syncing avatar upload', { userId });

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
        swDebug('Avatar upload response received', { userId, status: res.status });

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
          swTrace('log', '[SW] R2 not configured, keeping avatar in IDB');
          swDebug('Avatar upload skipped because R2 is not configured', { userId });
          success = true; // treat as "handled" so we don't loop forever
          break;
        } else {
          throw new Error(`Upload failed: ${res.status}`);
        }
      } catch (err) {
        attempt++;
        swDebug('Avatar upload attempt failed', {
          userId,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
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
  swDebug('Visits/households sync started');

  let token;
  try {
    token = await requestFreshToken();
  } catch (err) {
    swTrace('log', '[SW] Could not get auth token for visits sync:', err.message);
    swDebug('Visits/households sync stopped: token fetch failed', { error: err.message });
    throw err;
  }

  // Sync pending households first (visits may reference them)
  const pendingHouseholds = await db.getAll('pending-households');
  swDebug('Pending households loaded', { count: pendingHouseholds.length });
  for (const entry of pendingHouseholds) {
    let attempt = 0;
    const MAX_ATTEMPTS = 3;
    const BACKOFF_MS = [2000, 5000, 10000];
    let success = false;
    while (!success && attempt < MAX_ATTEMPTS) {
      try {
        swDebug('Syncing pending household', {
          pendingId: entry.id,
          attempt: attempt + 1,
          payload: entry.data,
        });
        const res = await fetch('/api/households', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(entry.data),
        });
        swDebug('Pending household response received', {
          pendingId: entry.id,
          status: res.status,
        });
        if (res.ok) {
          const createdHousehold = unwrapApiData(await res.json());
          const syncedHouseholdId =
            isObject(createdHousehold) && typeof createdHousehold.id === 'string'
              ? createdHousehold.id
              : null;

          if (syncedHouseholdId) {
            await saveIdMapping(db, 'household', entry.id, syncedHouseholdId);
            const remappedVisits = await remapQueuedEntries(db, 'pending-visits', (data) => {
              if (!isObject(data) || data.householdId !== entry.id) return null;
              return { ...data, householdId: syncedHouseholdId };
            });
            const remappedEncounters = await remapQueuedEntries(
              db,
              'pending-encounters',
              (data) => {
                if (!isObject(data) || data.householdId !== entry.id) return null;
                return { ...data, householdId: syncedHouseholdId };
              }
            );
            swDebug('Remapped pending visits after household sync', {
              pendingId: entry.id,
              syncedHouseholdId,
              remappedVisits,
              remappedEncounters,
            });
          }

          await db.delete('pending-households', entry.id);
          const allClients = await self.clients.matchAll({ type: 'window' });
          for (const client of allClients) {
            client.postMessage({
              type: 'HOUSEHOLD_SYNCED',
              pendingId: entry.id,
              serverId: syncedHouseholdId,
            });
          }
          success = true;
        } else if (res.status === 401) {
          swDebug('Pending household hit 401, refreshing token', { pendingId: entry.id });
          try {
            token = await requestFreshToken();
          } catch {
            throw new Error('Token refresh failed');
          }
          attempt++;
        } else {
          const details = await readErrorDetails(res);
          throw new Error(`POST /api/households failed: ${res.status} ${details}`);
        }
      } catch (err) {
        attempt++;
        swDebug('Pending household attempt failed', {
          pendingId: entry.id,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
        } else {
          await notifyClients({
            type: 'HOUSEHOLD_SYNC_ERROR',
            pendingId: entry.id,
            error: err instanceof Error ? err.message : String(err),
            payload: entry.data,
          });
          throw err;
        }
      }
    }
  }

  // Sync pending visits
  const pendingVisits = await db.getAll('pending-visits');
  swDebug('Pending visits loaded', { count: pendingVisits.length });
  for (const entry of pendingVisits) {
    let attempt = 0;
    const MAX_ATTEMPTS = 3;
    const BACKOFF_MS = [2000, 5000, 10000];
    let success = false;
    while (!success && attempt < MAX_ATTEMPTS) {
      try {
        const originalHouseholdId = isObject(entry.data) ? entry.data.householdId : null;
        const resolvedHouseholdId =
          typeof originalHouseholdId === 'string'
            ? ((await getIdMapping(db, 'household', originalHouseholdId)) ?? originalHouseholdId)
            : originalHouseholdId;
        const visitPayload =
          resolvedHouseholdId && isObject(entry.data) && resolvedHouseholdId !== originalHouseholdId
            ? { ...entry.data, householdId: resolvedHouseholdId }
            : entry.data;

        if (visitPayload !== entry.data) {
          await db.put('pending-visits', { ...entry, data: visitPayload }, entry.id);
          swDebug('Resolved pending visit household reference', {
            pendingId: entry.id,
            from: originalHouseholdId,
            to: resolvedHouseholdId,
          });
        }

        swDebug('Syncing pending visit', {
          pendingId: entry.id,
          attempt: attempt + 1,
          payload: visitPayload,
        });
        const res = await fetch('/api/visits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(visitPayload),
        });
        swDebug('Pending visit response received', {
          pendingId: entry.id,
          status: res.status,
        });
        if (res.ok) {
          const createdVisit = unwrapApiData(await res.json());
          const syncedVisitId =
            isObject(createdVisit) && typeof createdVisit.id === 'string' ? createdVisit.id : null;

          if (syncedVisitId) {
            await saveIdMapping(db, 'visit', entry.id, syncedVisitId);
            const remappedEncounters = await remapQueuedEntries(
              db,
              'pending-encounters',
              (data) => {
                if (!isObject(data) || data.visitId !== entry.id) return null;
                return { ...data, visitId: syncedVisitId };
              }
            );
            swDebug('Remapped pending encounters after visit sync', {
              pendingId: entry.id,
              syncedVisitId,
              remappedEncounters,
            });
          }

          await db.delete('pending-visits', entry.id);
          const allClients = await self.clients.matchAll({ type: 'window' });
          for (const client of allClients) {
            client.postMessage({
              type: 'VISIT_SYNCED',
              pendingId: entry.id,
              serverId: syncedVisitId,
            });
          }
          success = true;
        } else if (res.status === 401) {
          swDebug('Pending visit hit 401, refreshing token', { pendingId: entry.id });
          try {
            token = await requestFreshToken();
          } catch {
            throw new Error('Token refresh failed');
          }
          attempt++;
        } else {
          const details = await readErrorDetails(res);
          throw new Error(`POST /api/visits failed: ${res.status} ${details}`);
        }
      } catch (err) {
        attempt++;
        swDebug('Pending visit attempt failed', {
          pendingId: entry.id,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
        } else {
          await notifyClients({
            type: 'VISIT_SYNC_ERROR',
            pendingId: entry.id,
            error: err instanceof Error ? err.message : String(err),
            payload: entry.data,
          });
          throw err;
        }
      }
    }
  }

  // Sync pending encounters
  const pendingEncounters = await db.getAll('pending-encounters');
  swDebug('Pending encounters loaded', { count: pendingEncounters.length });
  for (const entry of pendingEncounters) {
    let attempt = 0;
    const MAX_ATTEMPTS = 3;
    const BACKOFF_MS = [2000, 5000, 10000];
    let success = false;
    while (!success && attempt < MAX_ATTEMPTS) {
      try {
        const originalVisitId = isObject(entry.data) ? entry.data.visitId : null;
        const originalHouseholdId = isObject(entry.data) ? entry.data.householdId : null;
        const visitId =
          typeof originalVisitId === 'string'
            ? ((await getIdMapping(db, 'visit', originalVisitId)) ?? originalVisitId)
            : originalVisitId;
        const householdId =
          typeof originalHouseholdId === 'string'
            ? ((await getIdMapping(db, 'household', originalHouseholdId)) ?? originalHouseholdId)
            : originalHouseholdId;
        let encounterPayload = entry.data;

        if (isObject(entry.data)) {
          if (visitId !== originalVisitId || householdId !== originalHouseholdId) {
            encounterPayload = {
              ...entry.data,
              ...(visitId !== undefined ? { visitId } : {}),
              ...(householdId !== undefined ? { householdId } : {}),
            };
          }
        }

        if (encounterPayload !== entry.data) {
          await db.put('pending-encounters', { ...entry, data: encounterPayload }, entry.id);
          swDebug('Resolved pending encounter visit reference', {
            pendingId: entry.id,
            visitFrom: originalVisitId,
            visitTo: visitId,
            householdFrom: originalHouseholdId,
            householdTo: householdId,
          });
        }

        const endpoint = visitId ? `/api/visits/${visitId}/encounters` : '/api/profile/encounters';

        swDebug('Syncing pending encounter', {
          pendingId: entry.id,
          visitId,
          householdId,
          endpoint,
          attempt: attempt + 1,
          payload: encounterPayload,
        });
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(encounterPayload),
        });
        swDebug('Pending encounter response received', {
          pendingId: entry.id,
          status: res.status,
        });
        if (res.ok) {
          await db.delete('pending-encounters', entry.id);
          const allClients = await self.clients.matchAll({ type: 'window' });
          for (const client of allClients) {
            client.postMessage({ type: 'ENCOUNTER_SYNCED', pendingId: entry.id });
          }
          success = true;
        } else if (res.status === 401) {
          swDebug('Pending encounter hit 401, refreshing token', { pendingId: entry.id });
          try {
            token = await requestFreshToken();
          } catch {
            throw new Error('Token refresh failed');
          }
          attempt++;
        } else {
          const details = await readErrorDetails(res);
          throw new Error(`POST ${endpoint} failed: ${res.status} ${details}`);
        }
      } catch (err) {
        attempt++;
        swDebug('Pending encounter attempt failed', {
          pendingId: entry.id,
          attempt,
          error: err instanceof Error ? err.message : String(err),
        });
        if (attempt < MAX_ATTEMPTS) {
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt - 1]));
        } else {
          await notifyClients({
            type: 'ENCOUNTER_SYNC_ERROR',
            pendingId: entry.id,
            error: err instanceof Error ? err.message : String(err),
            payload: entry.data,
          });
          throw err;
        }
      }
    }
  }

  // ────── After all syncs complete, refresh the read caches from API ────────────
  try {
    swTrace('log', '[SW] Syncs complete, refreshing caches from API...');
    swDebug('Refreshing read caches after sync');

    // Refresh households cache
    try {
      const householdsRes = await fetch('/api/households', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (householdsRes.ok) {
        const households = ensureArrayPayload(await householdsRes.json());
        await db.put('households-cache', { data: households, cachedAt: Date.now() }, 'all');
        swTrace('log', '[SW] Updated households-cache with', households.length, 'households');
        swDebug('Households cache refreshed');
      }
    } catch (err) {
      swTrace('warn', '[SW] Failed to refresh households cache:', err.message);
      swDebug('Households cache refresh failed', { error: err.message });
    }

    // Refresh visits cache
    try {
      const visitsRes = await fetch('/api/visits', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (visitsRes.ok) {
        const visits = ensureArrayPayload(await visitsRes.json());
        await db.put('visits-cache', { data: visits, cachedAt: Date.now() }, 'my-visits');
        swTrace('log', '[SW] Updated visits-cache with', visits.length, 'visits');
        swDebug('Visits cache refreshed');
      }
    } catch (err) {
      swTrace('warn', '[SW] Failed to refresh visits cache:', err.message);
      swDebug('Visits cache refresh failed', { error: err.message });
    }

    // Notify all clients that caches were updated
    const allClients = await self.clients.matchAll({ type: 'window' });
    for (const client of allClients) {
      client.postMessage({ type: 'CACHE_UPDATED' });
    }
    swTrace('log', '[SW] Notified', allClients.length, 'clients of cache update');
    swDebug('Clients notified about cache refresh', { clients: allClients.length });
  } catch (err) {
    swTrace('error', '[SW] Error refreshing caches:', err);
    swDebug('Post-sync cache refresh failed', {
      error: err instanceof Error ? err.message : String(err),
    });
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
        db.createObjectStore('pending-visits');
      }
      if (!db.objectStoreNames.contains('pending-households')) {
        db.createObjectStore('pending-households');
      }
      if (!db.objectStoreNames.contains('pending-encounters')) {
        db.createObjectStore('pending-encounters');
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
    put: (store, value, key) =>
      new Promise((res, rej) => {
        const objectStore = tx(store, 'readwrite');
        const r = key === undefined ? objectStore.put(value) : objectStore.put(value, key);
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
