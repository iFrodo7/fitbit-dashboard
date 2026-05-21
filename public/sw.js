const CACHE_VERSION = 'fitbit-air-v4';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const STATIC_ASSETS = [
  '/app.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Push notifications ──────────────────────────────────────────────
// Server-initiated push (requires backend + VAPID — see HANDOFF / issue #4).
// Until the backend exists, notifications are fired client-side via
// postMessage ('SHOW_NOTIFICATION') from app.html.
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text() }; }
  const title = data.title || 'Fitbit Air';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: data.tag || 'fitbit-air',
    data: { url: data.url || '/app.html' },
    vibrate: [40, 30, 40]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Client-triggered notifications (no backend needed)
self.addEventListener('message', (event) => {
  const msg = event.data || {};
  if (msg.type === 'SHOW_NOTIFICATION' && self.registration) {
    const { title, body, tag, url } = msg.payload || {};
    self.registration.showNotification(title || 'Fitbit Air', {
      body: body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: tag || 'fitbit-air',
      data: { url: url || '/app.html' },
      vibrate: [40, 30, 40]
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/app.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/app.html') && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  // Fitbit API → Network first, fallback to cache
  if (url.hostname.includes('fitbit.com')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Google Fonts → Cache first
  if (url.hostname.includes('fonts.g')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const clone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        return response;
      }))
    );
    return;
  }

  // Same-origin → Cache first, network fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      }).catch(() => caches.match('/app.html')))
    );
  }
});
