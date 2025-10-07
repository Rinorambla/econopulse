// ——— EconoPulse Service Worker (Enhanced) ———
// Version bump when changing caching logic
const VERSION = '1.1.0';
const STATIC_CACHE = `econopulse-static-${VERSION}`;
const DYNAMIC_CACHE = `econopulse-dynamic-${VERSION}`;
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];
const MAX_DYNAMIC_ENTRIES = 60;

function limitCache(cacheName, max) {
  caches.open(cacheName).then(cache =>
    cache.keys().then(keys => {
      if (keys.length > max) cache.delete(keys[0]).then(() => limitCache(cacheName, max));
    })
  );
}

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Install v', VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.error('[SW] Install error', err))
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate v', VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(k => {
          if (![STATIC_CACHE, DYNAMIC_CACHE].includes(k)) {
            console.log('[SW] Removing old cache', k);
            return caches.delete(k);
          }
        })
      )
    ).then(async () => {
      const clientsArr = await self.clients.matchAll({ includeUncontrolled: true });
      clientsArr.forEach(client => client.postMessage({ type: 'SW_ACTIVATED', version: VERSION }));
      return self.clients.claim();
    })
  );
});

// Fetch Strategy: Network First, falling back to cache
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Ignore analytics or external sources we don't want to cache
  if (url.origin !== self.location.origin && !/\.(?:png|jpg|jpeg|svg|webp|woff2?)$/i.test(url.pathname)) return;

  // API: use network first with fallback to cache if previously stored (only selected endpoints)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(DYNAMIC_CACHE).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // HTML navigations: network first -> offline page fallback
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then(c => c.put(request, clone));
          return res;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match('/offline.html')))
    );
    return;
  }

  // Static assets: stale-while-revalidate
  const isStatic = STATIC_ASSETS.includes(url.pathname) || /\.(?:png|jpg|jpeg|svg|gif|webp|ico|css|js|woff2?)$/i.test(url.pathname);
  if (isStatic) {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request)
          .then(res => {
            if (res && res.status === 200) {
              const clone = res.clone();
              caches.open(STATIC_CACHE).then(c => c.put(request, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Everything else: cache first with network fallback
  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
            caches.open(DYNAMIC_CACHE).then(c => {
              c.put(request, clone);
              limitCache(DYNAMIC_CACHE, MAX_DYNAMIC_ENTRIES);
            });
        }
        return res;
      }).catch(() => caches.match('/offline.html'))
    )
  );
});

// Handle background sync for market data updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'market-data-sync') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(syncMarketData());
  }
});

// Background sync function
async function syncMarketData() {
  try {
  const response = await fetch('/api/dashboard-data?scope=basic');
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put('/api/dashboard-data?scope=basic', response.clone());
  console.log('[SW] Market data synced');
    }
  } catch (error) {
    console.error('[SW] Background sync failed', error);
  }
}

// Handle push notifications (for future market alerts)
self.addEventListener('push', (event) => {
  console.log('[SW] Push');
  
  const options = {
    body: event.data ? event.data.text() : 'New market update available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Update',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('EconoPulse Alert', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click');
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/ai-pulse')
    );
  }
});

// Listen for skip waiting trigger from page
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
