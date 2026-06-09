const CACHE_VERSION = 'fitbit-air-v65';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const STATIC_ASSETS = [
  '/app.html',
  '/privacy.html',
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
let _stkNotifTimer = null;

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

  if (msg.type === 'SCHEDULE_STREAK_NOTIF') {
    const { streak, fireAt, es } = msg.payload || {};
    if (_stkNotifTimer) clearTimeout(_stkNotifTimer);
    const delay = fireAt - Date.now();
    if (delay > 0 && delay < 86400000) {
      const title = es
        ? `🔥 Tu racha de ${streak} días peligra`
        : `🔥 Your ${streak}-day streak is at risk`;
      const body = es
        ? '¡Abre la app y completa tus metas antes de medianoche!'
        : 'Complete your goals before midnight to keep it!';
      _stkNotifTimer = setTimeout(() => {
        self.registration.showNotification(title, {
          body,
          icon: '/icons/icon-192.png',
          badge: '/icons/icon-192.png',
          tag: 'streak-reminder',
          data: { url: '/app.html' },
          vibrate: [80, 40, 80, 40, 80],
          requireInteraction: true
        });
        _stkNotifTimer = null;
      }, delay);
    }
  }

  if (msg.type === 'CANCEL_STREAK_NOTIF') {
    if (_stkNotifTimer) { clearTimeout(_stkNotifTimer); _stkNotifTimer = null; }
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

// ══════════════════════════════════════════════════════════════════════════
// ── BACKGROUND STREAK CHECK — Service Worker side ────────────────────────
// Calls Google Health dailyRollUp for yesterday's steps. Only increments
// streak, never resets — the app handles resets with full gap-fill on open.
// IDB database "fb_sw": config store (credentials) + streak store (state).
// ══════════════════════════════════════════════════════════════════════════

function _swDbOpen() {
  return new Promise(function(res, rej) {
    var req = indexedDB.open('fb_sw', 1);
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('config')) db.createObjectStore('config', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('streak')) db.createObjectStore('streak', { keyPath: 'key' });
    };
    req.onsuccess = function(e) { res(e.target.result); };
    req.onerror   = function(e) { rej(e.target.error); };
  });
}

function _swDbGet(db, store, key) {
  return new Promise(function(res) {
    try {
      var req = db.transaction(store, 'readonly').objectStore(store).get(key);
      req.onsuccess = function(e) { res(e.target.result || null); };
      req.onerror   = function() { res(null); };
    } catch(e) { res(null); }
  });
}

function _swDbPut(db, store, value) {
  return new Promise(function(res) {
    try {
      var req = db.transaction(store, 'readwrite').objectStore(store).put(value);
      req.onsuccess = function() { res(); };
      req.onerror   = function() { res(); };
    } catch(e) { res(); }
  });
}

// YYYY-MM-DD using local timezone (offset = days from today, e.g. -1 = yesterday)
function _swLocalDate(offset) {
  var d = new Date();
  if (offset) d.setDate(d.getDate() + offset);
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

// Matches _parseCivilDate in app.html: { date:{year,month,day}, time:{hours,minutes,seconds} }
function _swCivilDate(ymd) {
  var p = ymd.split('-').map(Number);
  return { date: { year: p[0], month: p[1], day: p[2] }, time: { hours: 0, minutes: 0, seconds: 0 } };
}

// True if dateB is exactly 1 day after dateA (YYYY-MM-DD strings)
function _swIsConsecutive(dateA, dateB) {
  try {
    var a = new Date(dateA + 'T12:00:00');
    var b = new Date(dateB + 'T12:00:00');
    return (b - a) === 86400000;
  } catch(e) { return false; }
}

async function _swCheckStreak() {
  var db;
  try {
    db = await _swDbOpen();
    var cfg = await _swDbGet(db, 'config', 'gh_creds');
    if (!cfg || !cfg.access_token || !cfg.base_url) return;

    var cur = await _swDbGet(db, 'streak', 'main');
    if (!cur) cur = { key: 'main', count: 0, lastDate: '', lastCheck: '' };

    var yesterday = _swLocalDate(-1);
    // Already checked yesterday (or newer) — nothing to do
    if (cur.lastCheck && cur.lastCheck >= yesterday) return;

    var goal = cfg.goal || 10000;
    var today = _swLocalDate(0); // exclusive end for API

    var rollupBody = JSON.stringify({
      range: { start: _swCivilDate(yesterday), end: _swCivilDate(today) },
      windowSizeDays: 1
    });

    async function _swFetchSteps(tok) {
      var ac = new AbortController();
      var tid = setTimeout(function() { ac.abort(); }, 12000);
      try {
        return await fetch(cfg.base_url + '/users/me/dataTypes/steps/dataPoints:dailyRollUp', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' },
          body: rollupBody,
          signal: ac.signal
        });
      } finally { clearTimeout(tid); }
    }

    var resp = await _swFetchSteps(cfg.access_token);

    // 401 → refresh once and retry
    if (resp.status === 401 && cfg.refresh_token && cfg.token_url) {
      try {
        var rr = await fetch(cfg.token_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: cfg.refresh_token })
        });
        var rd = await rr.json();
        if (rd.access_token) {
          cfg.access_token = rd.access_token;
          if (rd.refresh_token) cfg.refresh_token = rd.refresh_token;
          await _swDbPut(db, 'config', cfg);
          resp = await _swFetchSteps(rd.access_token);
        } else { return; } // refresh token revoked
      } catch(e2) { return; }
    }

    // 429 / 5xx → skip silently, streak preserved as-is
    if (!resp.ok) return;

    var data = await resp.json();
    var pts = data.rollupDataPoints || [];
    var steps = 0;
    for (var i = 0; i < pts.length; i++) {
      var rp = pts[i];
      var rs = rp.civilStartTime || (rp.range && rp.range.start);
      if (!rs) continue;
      var D = rs.date || rs;
      var dk = '';
      if (typeof D === 'string') { dk = D; }
      else if (D && D.year && D.month && D.day) {
        dk = D.year + '-' + String(D.month).padStart(2,'0') + '-' + String(D.day).padStart(2,'0');
      }
      if (dk === yesterday) {
        steps = parseInt((rp.steps && (rp.steps.countSum || rp.steps.count_sum || rp.steps.count)) || 0) || 0;
        break;
      }
    }

    // Only increment — never reset from background (app reconciles on open)
    var newCount = cur.count;
    var newLast  = cur.lastDate;
    if (steps >= goal) {
      var consecutive = !cur.lastDate || _swIsConsecutive(cur.lastDate, yesterday);
      newCount = consecutive ? cur.count + 1 : 1;
      newLast  = yesterday;
    }
    // steps < goal → preserve streak unchanged (device may not have synced yet)

    await _swDbPut(db, 'streak', {
      key: 'main', count: newCount, lastDate: newLast,
      lastCheck: yesterday, steps: steps
    });

    // Notify any open app windows so the streak badge updates live
    var clients = await self.clients.matchAll({ includeUncontrolled: true });
    clients.forEach(function(c) {
      c.postMessage({ type: 'SW_STREAK_UPDATE', count: newCount, lastDate: newLast });
    });

  } catch(e) {
    // Network/IDB error — streak persists unchanged in IDB
  }
}

self.addEventListener('sync', function(event) {
  if (event.tag === 'streak-check') {
    event.waitUntil(_swCheckStreak());
  }
});

self.addEventListener('periodicsync', function(event) {
  if (event.tag === 'streak-daily') {
    event.waitUntil(_swCheckStreak());
  }
});

// ── END BACKGROUND STREAK ──────────────────────────────────────────────────

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

  // Same-origin HTML (app.html) → Network first so updates are always picked up immediately
  if (url.origin === self.location.origin && url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/app.html')))
    );
    return;
  }

  // Same-origin other assets (icons, manifest, etc.) → Cache first, network fallback
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
