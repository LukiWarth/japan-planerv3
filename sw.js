// Service Worker: App offline verfügbar machen, Kartenkacheln beim Ansehen merken
const V = 'japan-planer3-v2';
const TILES = 'japan2-tiles-v1';
const LEAF = 'https://unpkg.com/leaflet@1.9.4/dist/';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-180.png', LEAF + 'leaflet.css', LEAF + 'leaflet.js'];
const MAX_TILES = 800;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== TILES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length > MAX_TILES) await Promise.all(keys.slice(0, keys.length - MAX_TILES).map(k => cache.delete(k)));
}
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname.endsWith('openstreetmap.org') || u.hostname.endsWith('openstreetmap.de') || u.hostname.endsWith('arcgisonline.com')) {
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(r);
      const net = fetch(r).then(res => { if (res && (res.ok || res.type === 'opaque')) { c.put(r, res.clone()).then(() => trim(c)); } return res; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r, { cache: 'no-cache' }).then(res => { const cp = res.clone(); caches.open(V).then(c => c.put('index.html', cp)); return res; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok && (u.origin === location.origin || u.hostname === 'unpkg.com')) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); } return res; })));
});
