const C = 'lithos-v66';
const F = ['./', './index.html', './net-web.js', './dungeon-art.js', './dungeon.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const ROOT = new URL('./', self.registration.scope).pathname;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(F)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.origin === location.origin && (e.request.mode === 'navigate' || u.pathname === ROOT || u.pathname.endsWith('/index.html'))) {
    // red primero para el HTML: así las correcciones llegan sin cambiar el número de versión; sin conexión usa la copia guardada
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(C).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
      if (res.ok && new URL(e.request.url).origin === location.origin) {
        const copy = res.clone();
        caches.open(C).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => e.request.mode === 'navigate' ? caches.match('./index.html') : undefined))
  );
});
