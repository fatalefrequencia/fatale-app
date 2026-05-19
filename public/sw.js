// Self-cleaning PWA Service Worker to purge all cached assets globally and restore client-server parity
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map(key => caches.delete(key)));
    })
    .then(() => self.registration.unregister())
    .then(() => self.clients.claim())
    .then(() => {
      return self.clients.matchAll().then((clients) => {
        clients.forEach(client => {
          if (client.url) {
            client.navigate(client.url);
          }
        });
      });
    })
  );
});

self.addEventListener("fetch", (event) => {
  // Pure network pass-through
  return;
});
