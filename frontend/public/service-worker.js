const CACHE_NAME = 'jalsaathi-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/src/main.jsx',
  '/src/index.css'
];

const LOG_PREFIX = '[ServiceWorker]';

// Install service worker and cache resources (only same-origin http/https URLs)
self.addEventListener('install', (event) => {
  console.log(`${LOG_PREFIX} Installing service worker...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log(`${LOG_PREFIX} ✅ Cache opened: ${CACHE_NAME}`);
        // Only cache same-origin http(s) URLs to avoid unsupported schemes
        const sameOriginUrls = urlsToCache.filter(u => {
          try {
            const url = new URL(u, self.location.href);
            const isSameOrigin = (url.origin === self.location.origin) && (url.protocol === 'http:' || url.protocol === 'https:');
            if (!isSameOrigin) {
              console.log(`${LOG_PREFIX} ⚠️  Skipping URL (not same-origin): ${u}`);
            }
            return isSameOrigin;
          } catch (e) {
            console.error(`${LOG_PREFIX} ❌ Error parsing URL: ${u}`, e);
            return false;
          }
        });
        console.log(`${LOG_PREFIX} 📦 Caching ${sameOriginUrls.length} URLs: ${sameOriginUrls.join(', ')}`);
        return cache.addAll(sameOriginUrls);
      })
      .catch((error) => {
        console.error(`${LOG_PREFIX} ❌ Cache installation failed:`, error);
      })
  );
  self.skipWaiting();
});

// Fetch from cache, fallback to network. Only cache same-origin http(s) responses.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const isApi = url.pathname.includes('/api/');
  
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          console.log(`${LOG_PREFIX} 💾 Cache hit: ${request.method} ${url.pathname}`);
          return cachedResponse;
        }

        // Avoid handling non-http(s) schemes (e.g., chrome-extension:)
        let reqUrl;
        try {
          reqUrl = new URL(request.url);
          if (reqUrl.protocol !== 'http:' && reqUrl.protocol !== 'https:') {
            console.log(`${LOG_PREFIX} ⏭️  Skipping non-http(s) scheme: ${reqUrl.protocol}`);
            return fetch(request);
          }
        } catch (e) {
          console.error(`${LOG_PREFIX} ❌ Error parsing request URL:`, e);
          return fetch(request);
        }

        const fetchRequest = request.clone();
        console.log(`${LOG_PREFIX} 🌐 Fetching: ${request.method} ${url.pathname}${isApi ? ' (API)' : ''}`);

        return fetch(fetchRequest).then((networkResponse) => {
          console.log(`${LOG_PREFIX} ✅ Response received: ${request.method} ${url.pathname} [${networkResponse.status}]`);
          
          // Check if valid response
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            console.log(`${LOG_PREFIX} ⏭️  Not caching: status=${networkResponse?.status}, type=${networkResponse?.type}`);
            return networkResponse;
          }

          // Only cache same-origin responses
          try {
            const responseUrl = new URL(networkResponse.url);
            if (responseUrl.origin !== self.location.origin) {
              console.log(`${LOG_PREFIX} ⏭️  Not caching: cross-origin response`);
              return networkResponse;
            }
          } catch (e) {
            console.error(`${LOG_PREFIX} ❌ Error parsing response URL:`, e);
            return networkResponse;
          }

          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(request, responseToCache).catch(err => {
                console.warn(`${LOG_PREFIX} ⚠️  Cache put failed for ${request.url}:`, err);
              });
              console.log(`${LOG_PREFIX} 💾 Cached: ${request.method} ${url.pathname}`);
            })
            .catch(err => {
              console.error(`${LOG_PREFIX} ❌ Error opening cache for put:`, err);
            });

          return networkResponse;
        }).catch((error) => {
          console.error(`${LOG_PREFIX} ❌ Fetch failed: ${request.method} ${url.pathname}`, error);
          // Return offline page or error response
          return new Response('Network error. Please check your connection.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
      .catch((error) => {
        console.error(`${LOG_PREFIX} ❌ Cache match failed:`, error);
        return fetch(request).catch(err => {
          console.error(`${LOG_PREFIX} ❌ Fetch fallback also failed:`, err);
          return new Response('Network error. Please check your connection.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});

// Activate service worker and remove old caches
self.addEventListener('activate', (event) => {
  console.log(`${LOG_PREFIX} Activating service worker...`);
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      console.log(`${LOG_PREFIX} 📋 Existing caches:`, cacheNames);
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`${LOG_PREFIX} 🗑️  Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  self.clients.claim();
  console.log(`${LOG_PREFIX} ✅ Service worker activated`);
});

self.addEventListener('message', (event) => {
  console.log(`${LOG_PREFIX} 📬 Message received:`, event.data);
});
