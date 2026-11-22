// sw.js — Service Worker PWA EMM RD CONGO (Section 5.3 du CDC)
const CACHE_NAME = 'emm-rdcongo-v6';
const DYNAMIC_CACHE = 'emm-rdcongo-dyn-v6';
const MAX_DYNAMIC_ITEMS = 80;

const STATIC_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './css/main.css',
  './js/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxItems);
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    fetch(req)
      .then((networkRes) => {
        const clone = networkRes.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(req, clone);
          limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS);
        });
        return networkRes;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          return caches.match('./offline.html');
        }
        return new Response('', { status: 408 });
      })
  );
});
