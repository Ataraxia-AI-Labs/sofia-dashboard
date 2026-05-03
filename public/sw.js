// SofIA PWA Service Worker
// Caches dashboard shell + API responses for offline access.
//
// S133 PWA-003 (design tradeoff documented): we use a hand-rolled SW
// instead of next-pwa / @serwist/next on purpose. The tooling adds a
// build step + bundles ~15kb of runtime, while our caching strategy is
// simple enough (3 routes × 3 strategies) to read in 50 lines. Revisit
// if we ever need offline write queueing or background sync.

// S122-PWA-001: cache version is stamped on each release so deployments
// invalidate the old cache cleanly. Bump this when any of:
//   - STATIC_ASSETS changes
//   - cache-strategy logic in this file changes
//   - we ship a breaking dashboard layout/route change
// The activate handler below deletes any cache with a different name,
// so old SW + old assets get evicted automatically on the next visit.
const CACHE_VERSION = 'v4-2026-05';  // bump to invalidate
const CACHE_NAME = `sofia-${CACHE_VERSION}`;
const API_CACHE_NAME = `sofia-api-${CACHE_VERSION}`;

// S133 PWA-005: cap the runtime API cache so it can't grow unbounded
// on long-lived devices. Above this threshold we evict the oldest entries.
const API_CACHE_MAX_ENTRIES = 60;

// S122-PWA-002 / S133 PWA-004: pre-cached static shell. Includes the
// offline fallback page so non-dashboard navigations don't render a
// browser error when the network is gone.
const STATIC_ASSETS = [
  '/dashboard',
  '/login',
  '/offline',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
];

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches (both static + API namespaces)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// LRU-ish trim for the API cache (S133 PWA-005)
async function trimApiCache() {
  const cache = await caches.open(API_CACHE_NAME);
  const keys = await cache.keys();
  if (keys.length <= API_CACHE_MAX_ENTRIES) return;
  // Evict from the front (oldest insertion order — Cache API preserves order)
  const overflow = keys.length - API_CACHE_MAX_ENTRIES;
  await Promise.all(keys.slice(0, overflow).map((k) => cache.delete(k)));
}

// Fetch: network-first for API, cache-first for static
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip external requests
  if (url.origin !== self.location.origin) return;

  // S133 PWA-009: never intercept the Sentry tunnel route. Caching error
  // payloads is pointless and would hide outage signal from Sentry's own
  // de-dup / replay logic.
  if (url.pathname.startsWith('/monitoring')) return;

  // API calls: network-first with cache fallback (bounded cache)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          event.waitUntil(
            caches.open(API_CACHE_NAME).then(async (cache) => {
              await cache.put(request, clone);
              await trimApiCache();
            })
          );
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Dashboard pages: network-first, fallback to cache, finally /offline.
  if (url.pathname.startsWith('/dashboard')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          event.waitUntil(
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          );
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((r) => r || caches.match('/dashboard') || caches.match('/offline'))
        )
    );
    return;
  }

  // Static assets: cache-first, fall back to /offline page on hard miss.
  event.respondWith(
    caches.match(request).then((cached) =>
      cached ||
      fetch(request).catch(() =>
        // PWA-004: any non-dashboard navigation that hits the network and
        // fails now lands on a friendly offline page instead of a browser
        // error.
        request.mode === 'navigate' ? caches.match('/offline') : Response.error()
      )
    )
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/dashboard' },
    actions: data.actions || [],
  };

  event.waitUntil(self.registration.showNotification(data.title || 'SofIA', options));
});

// Notification click: open the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
