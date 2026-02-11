// Service worker for Weather Potato PWA
const CACHE_NAME = 'weather-potato-v2'; // Increment version to force cache refresh
const RUNTIME_CACHE = 'weather-potato-runtime-v2';

// Files to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/index.html'
];

// Install event - cache core files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching core files');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Service worker installed, skipping waiting');
        return self.skipWaiting(); // Activate immediately
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service worker activated, claiming clients');
      return self.clients.claim(); // Take control immediately
    })
  );
});

// Fetch event - network first for HTML, cache first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Network first for HTML (always get latest)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the response
          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((response) => {
            return response || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Cache first for all other assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', request.url);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone and cache the response
            const responseToCache = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              console.log('[SW] Caching new resource:', request.url);
              cache.put(request, responseToCache);
            });

            return response;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            throw error;
          });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
