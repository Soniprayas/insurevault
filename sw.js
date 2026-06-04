// ─────────────────────────────────────────────
// VaultKey Service Worker — Auto-Update Edition
// Bump APP_VERSION with every deploy
// ─────────────────────────────────────────────
const APP_VERSION = 'vaultkey-v10';
const CACHE_NAME = APP_VERSION;

// Files to cache for offline use
const PRECACHE = [
  './',
  './index.html',
  './icon-192.png',
  './icon-512.png',
  './manifest.json',
];

// ── INSTALL: cache fresh files ──
self.addEventListener('install', event => {
  // Skip waiting forces the new SW to activate immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
});

// ── ACTIVATE: delete ALL old caches ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim()) // Take control of all open tabs immediately
  );
});

// ── FETCH: Network-first for HTML, cache-first for assets ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always fetch index.html fresh from network — never serve stale HTML
  if (url.pathname.endsWith('/') || url.pathname.endsWith('index.html')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          // Update cache with fresh copy
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html')) // Fallback to cache if offline
    );
    return;
  }

  // For everything else: cache-first (icons, manifest)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});

// ── MESSAGE: force update from app ──
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
