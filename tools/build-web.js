// Copies the web game (the files GitHub Pages serves) into www/, which Capacitor puts in the apps.
// Usage: npm run build:web   (npm run sync also copies it into ios/ and android/)
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
const FILES = ['index.html', 'privacy.html', 'style.css', 'sw.js', 'manifest.webmanifest', 'js', 'icons'];
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const f of FILES) fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });
console.log(`www/ ready (${FILES.join(', ')})`);
