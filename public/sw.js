const CACHE_NAME = 'econopulse-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install Service Worker
self.addEventListener('install', (event) => {
  console.log('💾 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('💾 Service Worker: Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('💾 Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('💾 Service Worker: Installation failed', error);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  console.log('💾 Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('💾 Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('💾 Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch Strategy: Network First, falling back to cache
self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle GET requests
  if (req.method !== 'GET') return;
  // Skip API (dynamic) except maybe simple GET public endpoints
  if (req.url.includes('/api/')) return;

  event.respondWith(
    fetch(req)
      .then((response) => {
        // Only cache OK, basic/cors responses
        if (response && response.status === 200 && (response.type === 'basic' || response.type === 'cors')) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseClone).catch(()=>{});
          });
        }
        return response;
      })
      .catch(() => caches.match(req).then((cached) => {
        if (cached) {
          console.log('💾 Service Worker: Serving from cache:', req.url);
          return cached;
        }
        if (req.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Offline content not available', { status: 503, statusText: 'Service Unavailable' });
      }))
  );
});

// Handle background sync for market data updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'market-data-sync') {
    console.log('💾 Service Worker: Background sync triggered');
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
      console.log('💾 Service Worker: Market data synced successfully');
    }
  } catch (error) {
    console.error('💾 Service Worker: Background sync failed', error);
  }
}

// Handle push notifications (for future market alerts)
self.addEventListener('push', (event) => {
  console.log('💾 Service Worker: Push message received');
  
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
  console.log('💾 Service Worker: Notification clicked');
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/ai-pulse')
    );
  }
});