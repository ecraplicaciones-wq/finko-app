// ==========================================================================
// ARCHIVO: service-worker.js 
// OBJETIVO: Hacer que la app funcione sin conexión a internet (Offline)
// y permitir su instalación como App Nativa (PWA) en celulares y PCs.
// ==========================================================================

// Nombre de la memoria caché. 
// ¡IMPORTANTE!: Cada vez que hagas un cambio en tu HTML, CSS o JS, 
// debes cambiar este número (Ej: de v4.1 a v4.2) para que los celulares 
// de tus usuarios descarguen la nueva versión.
const CACHE_NAME = 'finko-cache-v4.1'; 

// Lista exacta de archivos que el navegador descargará para funcionar sin WiFi.
// Asegúrate de que los nombres coincidan exactamente con los de tus carpetas.
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './main.js',
  './state.js',
  './storage.js',
  './theme.js',
  './ui.js',
  './manifest.json',
  // También guardamos fuentes y librerías externas para que carguen offline
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// =========================================================
// 1. FASE DE INSTALACIÓN (El primer encuentro)
// =========================================================
// Ocurre la primera vez que el usuario entra a la página. 
// Aquí descargamos todos los archivos de 'urlsToCache' al disco duro.
self.addEventListener('install', event => {
  // Obligamos al Service Worker nuevo a tomar el control inmediatamente,
  // sin esperar a que el usuario cierre la pestaña. (Buena práctica UX)
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ [Service Worker] Archivos guardados en caché con éxito.');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('❌ [Service Worker] Error al guardar caché:', err))
  );
});

// =========================================================
// 2. FASE DE ACTIVACIÓN (La limpieza)
// =========================================================
// Ocurre cuando el nuevo Service Worker toma el control.
// Aquí revisamos si cambiaste el CACHE_NAME y borramos la basura vieja.
self.addEventListener('activate', event => {
  // Reclamamos el control de todas las pestañas abiertas de inmediato
  event.waitUntil(self.clients.claim());

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si el nombre de la caché vieja no coincide con el actual, ¡Bórrala!
          if (cacheName !== CACHE_NAME) {
            console.log('🧹 [Service Worker] Borrando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// =========================================================
// 3. FASE DE FETCH (El Interceptor de Internet)
// =========================================================
// Ocurre CADA VEZ que la app pide un archivo, una imagen o una fuente.
// Estrategia: "Cache First" (Primero la caché, si no está, busca en internet).
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si el archivo está guardado en el celular, lo entregamos a la velocidad de la luz.
        if (response) return response;
        
        // Si no está guardado (ej. un link externo nuevo), dejamos que use el WiFi para buscarlo.
        return fetch(event.request);
      })
  );
});