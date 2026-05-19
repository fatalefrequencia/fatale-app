const CACHE_NAME = "fatale-system-cache-v3";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/skull_icon.png"
];

// Install Service Worker and cache essential shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching App Shell...");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Service Worker and clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept requests and serve from cache if offline
self.addEventListener("fetch", (event) => {
  // Only handle GET requests to avoid API mutations failing
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  const isHtmlDoc = event.request.mode === "navigate" || 
                    requestUrl.pathname === "/" || 
                    requestUrl.pathname.endsWith("/index.html");

  if (isHtmlDoc) {
    // Network-first for html documents to ensure instant updates
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch((err) => {
        console.warn("[Service Worker] Fetch failed, network offline.", err);
      });
    })
  );
});
