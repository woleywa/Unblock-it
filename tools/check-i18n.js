// Story lines without a German version (they'd show in English in German mode), and translations that
// changed a character's name. Usage: node tools/check-i18n.js — build-web.js runs it and warns.
const fs = require('fs');
const path = require('path');
const js = f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
const DE = {};
new Function('DE', 'DE_RX', 'T', js('i18n-de.js') + js('i18n-story-de.js'))(DE, [], s => s);
const NAMES = ['Mörfi', 'Puddy', 'Lilca', 'Nori', 'Kloenchen', 'Bear', 'Blorp', 'Slowbert', 'Pica', 'Hoot', 'Snacko', 'Wolfgang', 'Mike', 'Anton'];
const src = js('story.js');
const lines = new Set();
for (const m of src.matchAll(/\b(?:text|narr|title|hint): '((?:[^'\\]|\\.)*)'/g)) lines.add(m[1].replace(/\\'/g, "'"));
for (const m of src.matchAll(/\b(?:card|narr|text): `([^`]*)`/g)) lines.add(m[1]);
const missing = [...lines].filter(s => !DE[s]);
const renamed = Object.entries(DE).filter(([en, de]) => NAMES.some(n => en.split(n).length !== de.split(n).length));
const warn = t => console.log((process.env.GITHUB_ACTIONS ? '::warning::' : '⚠ ') + t);
if (missing.length) warn(`${missing.length} story line(s) have no German yet (js/i18n-story-de.js): ${missing.slice(0, 5).map(s => JSON.stringify(s.slice(0, 60))).join(', ')}${missing.length > 5 ? ' …' : ''}`);
if (renamed.length) warn(`${renamed.length} German line(s) changed a character's name: ${renamed.slice(0, 3).map(([en]) => JSON.stringify(en.slice(0, 60))).join(', ')}`);
if (!missing.length && !renamed.length) console.log(`German: all ${lines.size} story lines translated, names unchanged`);
module.exports = { missing, renamed };
