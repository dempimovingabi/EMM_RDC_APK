// sw.js
// Service Worker — EMM RD CONGO (Version 5)

const CACHE_NAME = 'emm-rdcongo-v5';
const MAX_DYNAMIC_ITEMS = 80;

const STATIC_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './css/main.css',
  './js/main.js',
  './js/config/constants.js',
  './js/config/routes.js',
  './js/core/app.js',
  './js/core/router.js',
  './js/core/store.js',
  './js/core/permissions.js',
  './js/core/province.context.js',
  './js/core/online-status.js',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png',
  './assets/icons/logo.png',
  './assets/son1.mp3'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

async function trimDynamicCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_DYNAMIC_ITEMS) return;
  const excess = keys.length - MAX_DYNAMIC_ITEMS;
  for (let i = 0; i < excess; i += 1) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const isStaticAsset = STATIC_ASSETS.some((asset) =>
    url.pathname.endsWith(asset.replace(/^\.\//, ''))
  );

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response && response.ok) {
              const copy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
            }
            return response;
          })
      )
    );
    return;
  }

  // Network-First avec repli sur le cache puis offline.html pour la navigation
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(async (cache) => {
            await cache.put(request, copy);
            await trimDynamicCache(cache);
          });
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (request.mode === 'navigate') {
          return caches.match('./offline.html');
        }
        return new Response('Hors ligne', { status: 503, statusText: 'Offline' });
      })
  );
});
