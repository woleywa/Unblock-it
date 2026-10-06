// Warns when a level has no difficulty rating (build:web runs it). Fix: node tools/rate.js
const { spawnSync } = require('child_process');
const r = spawnSync(process.execPath, [require('path').join(__dirname, 'rate.js'), '--check'], { encoding: 'utf8' });
const out = (r.stdout || '').trim();
console.log(r.status ? (process.env.GITHUB_ACTIONS ? '::warning::' : '⚠ ') + out : out);
