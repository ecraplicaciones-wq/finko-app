const CACHE_NAME = 'finko-cache-v4.1';

// Solo archivos externos que raramente cambian
const STATIC_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Archivos PROPIOS de tu app (los que sí editas)
const LOCAL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './state.js',
  './storage.js',
  './theme.js',
  './ui.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Solo pre-cacheamos los externos al instalar
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null))
    )
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Archivos EXTERNOS → Cache First (no cambian)
  const isExternal = STATIC_ASSETS.some(a => event.request.url.startsWith(a.split('?')[0]));
  if (isExternal) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Archivos PROPIOS → Network First (siempre busca lo nuevo)
  const isLocal = LOCAL_ASSETS.some(a => url.pathname.endsWith(a.replace('./', '/')));
  if (isLocal || url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Guarda la versión nueva en caché por si se va el internet
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => {
          // Sin internet → usa la caché como respaldo
          return caches.match(event.request);
        })
    );
    return;
  }
});
