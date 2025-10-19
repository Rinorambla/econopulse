// ——— EconoPulse Service Worker (Enhanced) ———
// Version bump when changing caching logic
const VERSION = '1.1.5';
const STATIC_CACHE = `econopulse-static-${VERSION}`;
const DYNAMIC_CACHE = `econopulse-dynamic-${VERSION}`;
// Unified cache name for convenience in some handlers
const CACHE_NAME = DYNAMIC_CACHE;
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
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(STATIC_ASSETS);
      // Best-effort prefetch of sentiment endpoint (non-blocking failure)
      try {
        const sentimentRes = await fetch('/api/market-sentiment-new', { cache: 'no-store' });
        if (sentimentRes.ok) {
          const clone = sentimentRes.clone();
          const dyn = await caches.open(DYNAMIC_CACHE);
          await dyn.put('/api/market-sentiment-new', clone);
        }
      } catch {}
  // Do NOT auto-activate; wait for explicit SKIP_WAITING from the UI
    } catch (err) {
      console.error('[SW] Install error', err);
    }
  })());
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
  if (url.origin !== self.location.origin) {
    // Skip caching for cross-origin requests except safe static assets
    const isStaticAsset = /\.(?:png|jpg|jpeg|svg|webp|gif|ico|woff2?)$/i.test(url.pathname);
    if (!isStaticAsset) return;
  }

  // API: special-case auth/me to be network-only (never cached to avoid stale auth state)
  if (url.pathname === '/api/me' || url.pathname.startsWith('/api/auth/')) {
    event.respondWith(fetch(request));
    return;
  }

  // API: use network first with fallback to cache if previously stored (only selected endpoints)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(DYNAMIC_CACHE).then(c => c.put(request, clone));
            return res;
          }
          // If network responded with error, try cache fallback
          return caches.match(request).then(cached => cached || res);
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Helper: network fetch with timeout
  const fetchWithTimeout = (req, ms = 8000) => {
    const ctrl = new AbortController();
    const id = setTimeout(() => ctrl.abort(), ms);
    return fetch(req, { signal: ctrl.signal }).finally(() => clearTimeout(id));
  };

  // HTML navigations: stale-while-revalidate with longer timeout and smart fallback to '/'
  if (request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html')) {
    event.respondWith((async () => {
      const cache = await caches.open(DYNAMIC_CACHE);
      const cached = await cache.match(request);
      if (cached) {
        // Revalidate in background
        fetchWithTimeout(request, 12000)
          .then(res => { if (res && res.ok) cache.put(request, res.clone()); })
          .catch(() => {});
        return cached;
      }
      try {
        const res = await fetchWithTimeout(request, 15000);
        if (res && res.ok) await cache.put(request, res.clone());
        return res;
      } catch {
        // Last resort: try cached root shell (from any cache) before offline page
        const root = await caches.match('/');
        if (root) return root;
        return (await caches.match('/offline.html')) || Response.error();
      }
    })());
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

  // Everything else: network first with gentle fallback (avoid holding main thread)
  event.respondWith(
    fetchWithTimeout(request, 6000).then(res => {
      if (res && res.ok) {
        const clone = res.clone();
        caches.open(DYNAMIC_CACHE).then(c => {
          c.put(request, clone);
          limitCache(DYNAMIC_CACHE, MAX_DYNAMIC_ENTRIES);
        });
      }
      return res;
    }).catch(() => caches.match(request).then(m => m || caches.match('/offline.html')))
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
