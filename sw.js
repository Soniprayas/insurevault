// VaultKey SW — always fetch fresh, never cache HTML
const VERSION = 'vaultkey-v11';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // NEVER cache HTML — always go to network
  if (url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request))
    );
    return;
  }
  // Cache only icons/manifest
  event.respondWith(
    caches.open(VERSION).then(cache =>
      cache.match(event.request).then(cached => {
        const fetched = fetch(event.request).then(res => {
          cache.put(event.request, res.clone());
          return res;
        });
        return cached || fetched;
      })
    )
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
