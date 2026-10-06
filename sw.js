// Offline support. The page itself (and any unversioned file) comes from the network first, so an
// update shows up straight away — the cache is only the fallback when offline. Files with ?v=N in
// their name never change, so they (and fonts/the Firebase SDK) come from the cache first.
const CACHE = 'unblock-it-v75';
const FILES = ['./', 'index.html', 'style.css?v=75', 'js/i18n.js?v=75', 'js/i18n-de.js?v=75', 'js/i18n-story-de.js?v=75', 'js/native.js?v=75', 'js/engine.js?v=75', 'js/levels.js?v=75', 'js/audio.js?v=75', 'js/art.js?v=75', 'js/challenge-levels.js?v=75', 'js/intro.js?v=75', 'js/game.js?v=75', 'js/daily-levels.js?v=75', 'js/extras.js?v=75', 'js/story.js?v=75', 'js/social.js?v=75', 'js/online.js?v=75',
  'manifest.webmanifest', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
function networkFirst(req) {
  // Give up on a slow network after 4 s and use the saved copy (the network answer still refreshes it).
  // no-cache: always ask the server (GitHub Pages otherwise lets the browser reuse a page for 10 minutes).
  const fresh = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req, { cache: 'no-cache' });
  const net = fresh.then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())); return res; });
  const late = new Promise(ok => setTimeout(ok, 4000)).then(() => caches.match(req, { ignoreSearch: req.mode === 'navigate' }));
  return Promise.race([net, late.then(hit => hit || net)]).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('./')));
}
function cacheFirst(req) {
  return caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) caches.open(CACHE).then(c => c.put(req, res.clone())); return res; }));
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Only the app's own files, fonts and the Firebase SDK; live data (Firestore, sign-in) goes straight
  // to the network.
  const u = new URL(e.request.url);
  const own = u.origin === location.origin;
  if (!own && !['fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com'].includes(u.hostname)) return;
  const fixed = !own || u.searchParams.has('v');
  e.respondWith(fixed ? cacheFirst(e.request) : networkFirst(e.request));
});
