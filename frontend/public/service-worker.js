const CACHE_NAME = 'jalsaathi-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/index.css'
];

// Install service worker and cache resources (only same-origin http/https URLs)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Only cache same-origin http(s) URLs to avoid unsupported schemes
        const sameOriginUrls = urlsToCache.filter(u => {
          try {
            const url = new URL(u, self.location.href);
            return (url.origin === self.location.origin) && (url.protocol === 'http:' || url.protocol === 'https:');
          } catch (e) {
            return false;
          }
        });
        return cache.addAll(sameOriginUrls);
      })
      .catch((error) => {
        console.log('Cache installation failed:', error);
      })
  );
  self.skipWaiting();
});

// Fetch from cache, fallback to network. Only cache same-origin http(s) responses.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        // Avoid handling non-http(s) schemes (e.g., chrome-extension:)
        let reqUrl;
        try {
          reqUrl = new URL(event.request.url);
          if (reqUrl.protocol !== 'http:' && reqUrl.protocol !== 'https:') {
            return fetch(event.request);
          }
        } catch (e) {
          return fetch(event.request);
        }

        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then((networkResponse) => {
          // Check if valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }

          // Only cache same-origin responses
          try {
            const responseUrl = new URL(networkResponse.url);
            if (responseUrl.origin !== self.location.origin) {
              return networkResponse;
            }
          } catch (e) {
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache).catch(err => {
                console.warn('Cache put failed for', event.request, err);
              });
            });

          return networkResponse;
        }).catch((error) => {
          console.log('Fetch failed:', error);
          throw error;
        });
      })
      .catch((error) => {
        console.log('Cache match failed:', error);
        return fetch(event.request);
      })
  );
});

// Activate service worker and remove old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
});
