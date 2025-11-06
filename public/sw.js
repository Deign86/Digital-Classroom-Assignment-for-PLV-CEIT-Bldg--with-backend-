/* Minimal Service Worker for runtime caching
   - Caches navigation requests (Network-first, falls back to cache)
   - Caches same-origin JS/CSS/image assets with Cache-first strategy
   - This is a conservative, low-risk SW useful for improving repeat load performance.
*/

const CACHE_NAME = 'plv-app-v1';
const RUNTIME_CACHE = 'plv-runtime-v1';
const OFFLINE_URL = '/index.html';

self.addEventListener('install', (event) => {
  // Activate immediately
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cache the offline shell so navigations can fall back when offline
      return cache.addAll([OFFLINE_URL]).catch(() => { /* ignore failures */ });
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter(k => k !== CACHE_NAME && k !== RUNTIME_CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Simple fetch handler
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Network-first for navigation requests (HTML)
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(request).then((response) => {
        // Put a copy in the runtime cache
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      }).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Cache-first for same-origin static assets (js/css/img)
  if (url.origin === location.origin && /\.(js|css|png|jpg|jpeg|svg|webp|avif)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, res.clone())).catch(() => {});
        return res;
      }).catch(() => cached))
    );
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
