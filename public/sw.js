const CACHE_NAME = 'cashback-hub-cache-v13';

// Assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/assets/icon.png',
  '/assets/android-icon-foreground.png',
  '/assets/android-icon-background.png',
];

// Helper: timeout promise for racing against slow/stalled networks
function timeoutPromise(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), ms);
  });
}

// Install Event: Cache essential shell
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching offline app shell');
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Some precache assets failed:', err);
      });
    })
  );
});

// Activate Event: Cleanup old caches & claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Lie-Fi protected Navigation + Cache-First Static Assets
self.addEventListener('fetch', (event) => {
  // Do not intercept non-GET requests or backend sync API calls
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }

  const acceptHeader = event.request.headers.get('accept') || '';
  const isHtmlNavigation =
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    acceptHeader.includes('text/html');

  // 1. Navigation requests (Opening the app in browser or PWA)
  // Fix for "Lie-Fi": when internet is weak, don't wait 60s for network to fail.
  // Wait at most 1500ms; if no response, immediately serve cached app shell!
  if (isHtmlNavigation) {
    event.respondWith(
      (async () => {
        const getCachedShell = async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached =
            (await cache.match('/index.html')) ||
            (await cache.match('/')) ||
            (await caches.match(event.request));
          return cached;
        };

        // Background network fetch with cache update
        const networkFetchPromise = fetch(event.request)
          .then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              const cache = await caches.open(CACHE_NAME);
              cache.put('/index.html', copy.clone());
              cache.put('/', copy);
            }
            return networkResponse;
          })
          .catch((err) => {
            console.log('[SW] Network navigation fetch failed/offline:', err.message);
            return null;
          });

        // Race network against a 1500ms timeout
        try {
          const networkResponse = await Promise.race([
            networkFetchPromise,
            timeoutPromise(1500),
          ]);
          if (networkResponse) {
            return networkResponse;
          }
        } catch (err) {
          // Timeout reached (weak internet) or network error
          console.warn('[SW] Slow network / Lie-Fi detected. Fast fallback to cached app shell.');
        }

        // Return cached shell immediately!
        const cached = await getCachedShell();
        if (cached) {
          return cached;
        }

        // If not in cache (first visit on flaky network), wait for network as last resort
        const lateNetwork = await networkFetchPromise;
        if (lateNetwork) return lateNetwork;

        return new Response('Офлайн: Приложение загружается...', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })()
    );
    return;
  }

  // 2. Static Assets (JS bundles, CSS, Fonts, Images)
  event.respondWith(
    caches.match(event.request).then(async (cachedResponse) => {
      if (cachedResponse) {
        // Cache-Hit: return instantly (0ms) from cache!
        // Stale-While-Revalidate: update in background
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      // Not in cache: fetch with a 4s timeout so it doesn't hang indefinitely
      try {
        const networkResponse = await Promise.race([
          fetch(event.request),
          timeoutPromise(4000),
        ]);
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      } catch (err) {
        if (acceptHeader.includes('text/html')) {
          const cache = await caches.open(CACHE_NAME);
          return (await cache.match('/index.html')) || (await cache.match('/'));
        }
        throw err;
      }
    })
  );
});
