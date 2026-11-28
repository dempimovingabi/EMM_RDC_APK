// sw.js
// Service Worker PWA — EMM RD CONGO (Cache v12 & Mode Hors Ligne résilient)

const CACHE_NAME = 'emm-rdcongo-v12';
const DYNAMIC_CACHE = 'emm-rdcongo-dyn-v12';

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/main.css',
  './assets/icons/logo-emm.png',
  './js/main.js',
  './js/config/constants.js',
  './js/config/routes.js',
  './js/config/firebase.config.js',
  './js/core/app.js',
  './js/core/router.js',
  './js/core/store.js',
  './js/core/province.context.js',
  './js/services/firestore.service.js',
  './js/services/sync.service.js',
  './js/ui/header.js',
  './js/ui/bottom-nav.js',
  './js/ui/toast.js',
  './js/utils/dom.js',
  './js/modules/auth/login.view.js',
  './js/modules/auth/auth.controller.js',
  './js/modules/dashboard/dashboard.view.js',
  './js/modules/administration/administration.view.js',
  './js/modules/tutoriels/tutoriels.view.js',
  './js/modules/depouillement/depouillement.view.js'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of CORE_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn('Cache ignoré pour :', asset, err);
        }
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Laisser passer les requêtes Firestore / Firebase / Google APIs directement vers le réseau
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis.com')
  ) {
    return;
  }

  // Stratégie Network-First avec repli sur le cache pour les fichiers de l'application
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          if (req.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('', { status: 503, statusText: 'Hors ligne' });
        })
    );
  }
});
