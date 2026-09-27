// Copies the web game (the files GitHub Pages serves) into www/, which Capacitor puts in the apps.
// The apps carry their own copy of the Firebase SDK (www/vendor/firebase) instead of loading it from
// gstatic.com at start-up, so they don't depend on that download.
// Usage: npm run build:web   (npm run sync also copies it into ios/ and android/)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
const FILES = ['index.html', 'privacy.html', 'style.css', 'sw.js', 'manifest.webmanifest', 'js', 'icons'];
const CDN = 'https://www.gstatic.com/firebasejs/10.14.1/';
const SDK = ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore-lite.js'];
// Live updates: each build of the game gets a number (the GitHub run number; 0 for a local build), and
// says which native app build it needs at least. Bump MIN_NATIVE_BUILD (and the apps' build numbers)
// when a game change relies on new native code, so older apps don't get it.
const BUILD = +(process.env.GITHUB_RUN_NUMBER || 0);
const MIN_NATIVE_BUILD = 1;

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const f of FILES) fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });

const vendor = path.join(out, 'vendor', 'firebase');
fs.mkdirSync(vendor, { recursive: true });
const pkg = path.join(root, 'node_modules', 'firebase');
for (const f of SDK) {
  const src = fs.readFileSync(path.join(pkg, f), 'utf8').split(CDN).join('./').replace(/\/\/# sourceMappingURL=.*$/m, '');
  fs.writeFileSync(path.join(vendor, f), src);
}
const online = path.join(out, 'js', 'online.js');
const js = fs.readFileSync(online, 'utf8');
if (!js.includes(CDN)) throw new Error('online.js no longer imports the Firebase SDK from ' + CDN + ' — update tools/build-web.js');
fs.writeFileSync(online, js.split(CDN).join('../vendor/firebase/'));
fs.writeFileSync(path.join(out, 'version.json'), JSON.stringify({ build: BUILD, minNative: MIN_NATIVE_BUILD }) + '\n');
console.log(`www/ ready (game build ${BUILD})`);
