// Offline support: serve the app from the cache, refresh it in the background.
const CACHE = 'unblock-it-v4';
const FILES = ['./', 'index.html', 'style.css?v=4', 'js/engine.js?v=4', 'js/levels.js?v=4', 'js/audio.js?v=4', 'js/art.js?v=4', 'js/game.js?v=4', 'js/online.js?v=4',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Only the app's own files, fonts and the Firebase SDK; live data (Firestore, sign-in) goes straight
  // to the network.
  const u = new URL(e.request.url);
  if (u.origin !== location.origin && !['fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'].includes(u.hostname)) return;
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(res => {
      if (res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
