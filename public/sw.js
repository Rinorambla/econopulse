// ——— EconoPulse Service Worker (Disabled for routing fix) ———
// Version bump when changing caching logic
const VERSION = '1.2.0-disabled';

// Install: immediately skip waiting to unregister
self.addEventListener('install', (event) => {
  console.log('[SW] Uninstalling old service worker...');
  self.skipWaiting();
});

// Activate: delete all caches and unregister
self.addEventListener('activate', (event) => {
  console.log('[SW] Clearing all caches...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => {
      console.log('[SW] All caches cleared. Service worker disabled.');
      return self.registration.unregister();
    }).then(() => {
      // Force refresh all clients
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_UNREGISTERED' });
        });
      });
    })
  );
});

// Fetch: pass through, no interception
self.addEventListener('fetch', (event) => {
  // Do nothing - let browser handle all requests normally
  return;
});
