const CACHE_NAME = 'ministry-planner-v1';
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/territories',
  '/notifications',
];

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
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

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// ─── Background Sync — avatar upload ─────────────────────────────────────────
// Triggered when connectivity returns after storing avatar in IDB.
// Reads the pending blob from IDB and uploads to /api/profile/avatar.

self.addEventListener('sync', (event) => {
  if (event.tag === 'avatar-upload') {
    event.waitUntil(syncAvatarUpload());
  }
});

async function syncAvatarUpload() {
  // Open the same IDB used by the app
  const db = await openIDB();
  const userIds = await db.getAllKeys('pending-avatars');

  for (const userId of userIds) {
    const blob = await db.get('pending-avatars', userId);
    if (!blob) continue;

    try {
      // Get the auth token from IDB (stored by the app on login)
      const token = await getStoredToken(db);
      if (!token) continue; // Can't upload without auth — will retry

      const formData = new FormData();
      formData.append('file', blob, 'avatar.jpg');

      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        await db.delete('pending-avatars', userId);
        // Remove the localStorage flag via postMessage to all clients
        const clients = await self.clients.matchAll();
        for (const client of clients) {
          client.postMessage({ type: 'AVATAR_SYNCED', userId });
        }
      }
    } catch {
      // Will retry on next sync event
    }
  }
}

async function getStoredToken(db) {
  try {
    return await db.get('auth', 'token');
  } catch {
    return null;
  }
}

// ─── Minimal IDB helper (no external lib in SW) ───────────────────────────────

function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ministry-planner', 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pending-avatars')) {
        db.createObjectStore('pending-avatars');
      }
      if (!db.objectStoreNames.contains('auth')) {
        db.createObjectStore('auth');
      }
    };
    req.onsuccess = (e) => resolve(wrapDB(e.target.result));
    req.onerror = () => reject(req.error);
  });
}

function wrapDB(db) {
  const tx = (store, mode) => db.transaction(store, mode).objectStore(store);
  return {
    get: (store, key) => new Promise((res, rej) => {
      const r = tx(store, 'readonly').get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }),
    getAllKeys: (store) => new Promise((res, rej) => {
      const r = tx(store, 'readonly').getAllKeys();
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }),
    delete: (store, key) => new Promise((res, rej) => {
      const r = tx(store, 'readwrite').delete(key);
      r.onsuccess = () => res();
      r.onerror = () => rej(r.error);
    }),
  };
}
