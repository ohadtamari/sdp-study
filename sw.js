// Offline support: the app shell and the law text are cached on first visit.
// Bump VERSION whenever index.html or data.json change so phones pick up the new files.
const VERSION = 'sdp-v2';
const CORE = ['./', 'index.html', 'data.json', 'manifest.webmanifest', 'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'law-sections.pdf'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;
  // Network first for our own files (fresh law text and fixes), cache as fallback when offline.
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  // Fonts: cache first.
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); return res;
  })));
});
