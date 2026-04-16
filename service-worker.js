const CACHE_NAME = 'finko-pro-v3.1';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  // ─── Módulos JS ──────────────────────────────────────────────────────────
  './modules/events.js',
  './modules/state.js',
  './modules/storage.js',
  './modules/constants.js',
  './modules/utils.js',
  './modules/render.js',
  './modules/sections.js',
  './modules/dashboard.js',
  './modules/gastos.js',
  './modules/fijos.js',
  './modules/deudas.js',
  './modules/objetivos.js',
  './modules/inversiones.js',
  './modules/agenda.js',
  './modules/cuentas.js',
  './modules/historial.js',
  './modules/fondo.js',
  './modules/calculadoras.js',
  './modules/stats.js',
  './modules/ui-components.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      const results = await Promise.allSettled(
        PRECACHE_ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn(`[SW] No se pudo cachear: ${url}`, err)
          )
        )
      );
      const fallidas = results.filter(r => r.status === 'rejected').length;
      if (fallidas > 0) console.warn(`[SW] ${fallidas} asset(s) no se pudieron cachear.`);
    })
    .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log(`[SW] Eliminando caché obsoleto: ${key}`);
              return caches.delete(key);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin && !url.hostname.includes('fonts.g')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        fetch(event.request)
          .then(response => {
            if (response && response.status === 200 && response.type !== 'opaque') {
              const toCache = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
            }
          })
          .catch(() => {});
        return cached;
      }
      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'opaque') return response;
          const toCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, toCache));
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') return caches.match('./index.html');
          return new Response('', { status: 408, statusText: 'Offline' });
        });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => console.log('[SW] Caché limpiado manualmente.'));
  }
});