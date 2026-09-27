// Usage: serve the repo on http://localhost:8766 (e.g. npx http-server -p 8766), then node tools/design-kit.mjs.
// Needs Playwright; set the executablePath below to your Chromium.
// Renders every Happy Blocks graphic from the real game code into design/ (SVG + transparent PNG).
import { chromium } from 'playwright';
import fs from 'fs';
const OUT = new URL('../design', import.meta.url).pathname;
for (const d of ['blocks', 'specials', 'board', 'screens']) fs.mkdirSync(`${OUT}/${d}`, { recursive: true });
const b = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })).newPage();
await p.goto('http://localhost:8766/'); await p.waitForTimeout(500);
await p.evaluate(() => { try { localStorage.setItem('unblock_seen_intros', JSON.stringify(['basics','walls','ice','frozen','layered','fire','beaver','arrows','lanes','prison','chains','packed'])); } catch (e) {} });
// A staging area on a plain background.
await p.evaluate(() => { const s = document.createElement('div'); s.id = 'stage'; Object.assign(s.style, { position: 'fixed', left: '0', top: '0', padding: '14px', background: 'transparent', zIndex: 999 }); document.body.appendChild(s); document.querySelectorAll('main').forEach(m => m.hidden = true); const t = document.createElement('style'); t.id = 'kit-clear'; t.textContent = 'html,body{background:transparent!important} .sky{display:none!important}'; document.head.appendChild(t); });
const CS = 120;
// One SVG with the shared gradients copied in, so it stands alone.
async function svgFile(name, piece) {
  const svg = await p.evaluate(({ piece, CS }) => {
    Art.defs();
    const wrap = document.createElement('div'); wrap.innerHTML = Art.blockSVG(piece, CS, {});
    const s = wrap.firstElementChild; s.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    s.insertAdjacentHTML('afterbegin', document.getElementById('art-defs').innerHTML);
    // Room for the side and shadow under the block.
    const H = +s.getAttribute('height'), W = +s.getAttribute('width');
    s.setAttribute('viewBox', `-6 -10 ${W + 12} ${H + 26}`); s.setAttribute('width', W + 12); s.setAttribute('height', H + 26);
    s.querySelectorAll('.face').forEach(f => f.removeAttribute('style'));
    return s.outerHTML;
  }, { piece, CS });
  fs.writeFileSync(`${OUT}/${name}.svg`, svg);
  await p.evaluate(svg => { const st = document.getElementById('stage'); st.innerHTML = svg; }, svg);
  await (await p.$('#stage svg')).screenshot({ path: `${OUT}/${name}.png`, omitBackground: true });
}
async function htmlShot(name, js) {
  await p.evaluate(js);
  await p.waitForTimeout(250);
  await (await p.$('#stage > *')).screenshot({ path: `${OUT}/${name}.png`, omitBackground: true });
}
const colors = await p.evaluate(() => Object.keys(Art.PAL));
for (const c of colors) {
  await svgFile(`blocks/${c}`, { color: c, r: 0, c: 0, h: 1, w: 1 });
  await svgFile(`blocks/${c}-bar`, { color: c, r: 0, c: 0, h: 1, w: 2 });
  await svgFile(`blocks/${c}-L`, { color: c, r: 0, c: 0, h: 2, w: 2, shape: [[0, 0], [1, 0], [1, 1]] });
}
await svgFile('specials/ice-frozen-block', { color: 'blue', r: 0, c: 0, h: 1, w: 2, ice: 2 });
await svgFile('specials/layered-block', { color: 'purple', inner: 'yellow', r: 0, c: 0, h: 2, w: 2 });
await svgFile('specials/key-block', { color: 'red', key: true, keyColor: 'gold', r: 0, c: 0, h: 1, w: 1 });
await svgFile('specials/prison-block', { color: 'green', lock: 2, lockColor: 'gold', r: 0, c: 0, h: 1, w: 1 });
await svgFile('specials/arrow-block-h', { color: 'orange', axis: 'h', r: 0, c: 0, h: 1, w: 2 });
await svgFile('specials/arrow-block-v', { color: 'pink', axis: 'v', r: 0, c: 0, h: 2, w: 1 });
await svgFile('specials/beaver', { color: 'beaver', r: 0, c: 0, h: 1, w: 1 });
await svgFile('specials/water-block', { color: 'water', r: 0, c: 0, h: 1, w: 2 });
// Tiles that are HTML + SVG: grab them as PNG (and the inner SVG where there is one).
const tile = kind => `(() => { const st = document.getElementById('stage'); st.innerHTML = ''; const e = ${kind}; e.style.position = 'relative'; st.appendChild(e); })()`;
await htmlShot('specials/fire', tile('Art.fire(2, 120)'));
await htmlShot('specials/forest', tile('Art.forest(120)'));
await htmlShot('board/lane-green', tile("Art.lane('green', 120, { width: '114px', height: '114px', borderRadius: '24px' })"));
for (const [n, gt] of [['door-red', { side: 'R', len: 2, color: 'red' }], ['door-frozen', { side: 'T', len: 2, color: 'blue', frozen: 3 }]])
  await htmlShot(`board/${n}`, tile(`Art.door(${JSON.stringify(gt)}, ${gt.side === 'R' ? "{ width: '26px', height: '220px' }" : "{ width: '220px', height: '26px' }"}, 36)`));
// Logo: the four blocks, tilted, as one standalone SVG.
const logo = await p.evaluate(() => {
  Art.defs();
  const B = 120, gap = 8, one = c => Art.blockSVG({ color: c, r: 0, c: 0, h: 1, w: 1 }, B).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
  let g = '';
  [['red', 0, 0], ['blue', 0, 1], ['yellow', 1, 0], ['green', 1, 1]].forEach(([c, r, k]) => g += `<g transform="translate(${k * (B + gap)} ${r * (B * 1.09 + gap)})">${one(c)}</g>`);
  const W = 2 * B + gap;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W + 60}" height="${W + 80}" viewBox="-30 -30 ${W + 60} ${W + 80}">${document.getElementById('art-defs').innerHTML}<g transform="rotate(-8 ${W / 2} ${W / 2})">${g}</g></svg>`;
});
fs.writeFileSync(`${OUT}/board/logo.svg`, logo);
await p.evaluate(svg => { document.getElementById('stage').innerHTML = svg; }, logo);
await (await p.$('#stage svg')).screenshot({ path: `${OUT}/board/logo.png`, omitBackground: true });
await p.evaluate(() => { document.getElementById('stage').remove(); document.getElementById('kit-clear').remove(); });
await p.setViewportSize({ width: 390, height: 844 });
// Screens: one board per level type, the home screen and the level list.
const shots = { 'home': null, 'levels': 'levelList()', 'level-01-basics': 'start(0)', 'level-11-walls': 'start(10)', 'level-16-ice': 'start(15)', 'level-21-frozen-doors': 'start(20)',
  'level-26-layered': 'start(25)', 'level-31-fire': 'start(30)', 'level-51-beaver': 'start(50)', 'level-58-arrows': 'start(57)', 'level-63-lanes': 'start(62)',
  'level-66-prison': 'start(65)', 'level-72-chains': 'start(71)', 'level-76-packed': 'start(75)' };
for (const [n, js] of Object.entries(shots)) {
  await p.evaluate(js => { document.querySelectorAll('main').forEach(m => m.hidden = true); if (js) eval(js); else home(); }, js);
  await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/screens/${n}.png` });
}
fs.writeFileSync(`${OUT}/palette.json`, JSON.stringify(await p.evaluate(() => Object.fromEntries(Object.entries(Art.PAL).map(([k, [light, base, dark, side]]) => [k, { light, base, dark, side }]))), null, 2) + '\n');
await b.close();
console.log('done');
