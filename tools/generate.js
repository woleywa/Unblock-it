// Level generator: random boards, kept only when the solver clears them in a target number of moves.
// Usage: node tools/generate.js [seed]              → writes js/levels.js (the campaign)
//        node tools/generate.js challenge [seed]    → writes js/challenge-levels.js (the pool for challenges)
const fs = require('fs');
const path = require('path');
const Engine = require('../js/engine.js');

const CHALLENGE = process.argv[2] === 'challenge';
// --append: keep the levels already in js/levels.js and only make the stages after them (much faster;
// the existing levels, and everyone's stars for them, stay exactly as they are).
const APPEND = process.argv.includes('--append');
// --redo 38,39,40: replace those levels (1-based) with new, different boards from the same stage.
const REDO = (process.argv[process.argv.indexOf('--redo') + 1] || '').split(',').filter(Boolean).map(Number);
if (process.argv.includes('--redo') && !REDO.length) throw new Error('--redo needs level numbers, e.g. --redo 38,39');
let seed = +(/^\d+$/.test(process.argv[CHALLENGE ? 3 : 2] || '') ? process.argv[CHALLENGE ? 3 : 2] : (CHALLENGE ? 7331 : 2026));
// The original generator (kept so a full rebuild gives the same levels). It loses precision and repeats
// itself after a while, so new levels (--append/--redo) use mulberry32 instead.
const lcg = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const mulberry = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const FRESH = process.argv.includes('--append') || process.argv.includes('--redo');
const rand = () => (FRESH ? mulberry : lcg)();
const pick = a => a[Math.floor(rand() * a.length)];
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));

const SHAPES = {
  dot: [[0, 0]], bar2h: [[0, 0], [0, 1]], bar2v: [[0, 0], [1, 0]], bar3h: [[0, 0], [0, 1], [0, 2]], bar3v: [[0, 0], [1, 0], [2, 0]],
  sq: [[0, 0], [0, 1], [1, 0], [1, 1]], l1: [[0, 0], [1, 0], [1, 1]], l2: [[0, 0], [0, 1], [1, 0]], l3: [[0, 0], [0, 1], [1, 1]], l4: [[0, 1], [1, 0], [1, 1]],
  t: [[0, 0], [0, 1], [0, 2], [1, 1]], z: [[0, 0], [0, 1], [1, 1], [1, 2]], big: [[0, 0], [1, 0], [2, 0], [2, 1]],
};
const COLORS = ['red', 'blue', 'yellow', 'green', 'purple', 'orange', 'pink', 'sky'];

// One stage per group of levels: board size, colours, fill, shapes, mechanics, and how many
// room-making moves (not a block leaving) the solver needs.
const STAGES = [
  { n: 5, W: [4, 5], H: [5, 6], colors: 2, fill: 0.55, shapes: ['dot', 'bar2h', 'bar2v', 'sq'], extra: [0, 1] },
  { n: 5, W: [5, 5], H: [6, 7], colors: 3, fill: 0.65, shapes: ['dot', 'bar2h', 'bar2v', 'sq', 'l1', 'l2', 'l3', 'l4'], extra: [1, 3] },
  { n: 5, W: [5, 6], H: [7, 8], colors: 3, fill: 0.7, walls: true, shapes: ['bar2h', 'bar2v', 'bar3h', 'bar3v', 'sq', 'l1', 'l2', 'l3', 'l4'], extra: [2, 5], note: 'walls' },
  { n: 5, W: [6, 6], H: [7, 8], colors: 4, fill: 0.72, ice: true, shapes: ['dot', 'bar2h', 'bar2v', 'sq', 'l1', 'l2', 'l3', 'l4', 't'], extra: [3, 7], note: 'ice' },
  { n: 5, W: [6, 7], H: [8, 9], colors: 4, fill: 0.72, ice: true, frozen: true, walls: true, shapes: ['bar2h', 'bar2v', 'bar3h', 'bar3v', 'sq', 'l1', 'l2', 'l3', 'l4', 't', 'z'], extra: [4, 10], note: 'frozen' },
  { n: 5, W: [7, 7], H: [8, 10], colors: 5, fill: 0.74, ice: true, frozen: true, layered: true, walls: true, shapes: ['bar2h', 'bar2v', 'bar3h', 'bar3v', 'sq', 'l1', 'l2', 'l3', 'l4', 't', 'z', 'big'], extra: [6, 14], note: 'layered' },
  // Fire: 2–4 burning cells; water blocks put them out as they leave.
  { n: 5, W: [6, 7], H: [7, 9], colors: 3, fill: 0.66, fire: true, ice: true, shapes: ['dot', 'bar2h', 'bar2v', 'bar3h', 'bar3v', 'sq', 'l1', 'l2', 'l3', 'l4', 't'], extra: [3, 9], note: 'fire' },
  // Mixed bag: every mechanic at once.
  { n: 5, W: [7, 7], H: [8, 9], colors: 3, fill: 0.7, fire: true, ice: true, frozen: true, walls: true, layered: true, shapes: ['dot', 'bar2h', 'bar2v', 'bar3h', 'bar3v', 'sq', 'l1', 'l2', 'l3', 'l4', 't', 'z'], extra: [6, 12] },
  // Big boards: lots of blocks, lots of colours.
  { n: 5, W: [8, 8], H: [9, 10], colors: 6, fill: 0.72, ice: true, frozen: true, walls: true, shapes: ['dot', 'bar2h', 'bar2v', 'bar3h', 'bar3v', 'sq', 'l1', 'l2', 'l3', 'l4', 't', 'z', 'big'], extra: [8, 16] },
  // Expert: tight, deep puzzles.
  { n: 5, W: [7, 8], H: [9, 10], colors: 5, fill: 0.76, ice: true, frozen: true, walls: true, layered: true, shapes: ['bar2h', 'bar2v', 'bar3h', 'bar3v', 'sq', 'l1', 'l2', 'l3', 'l4', 't', 'z', 'big'], extra: [12, 22] },
  // Beaver woods: forests block cells and hide blocks; a beaver dropped next to them eats them.
  { n: 5, W: [6, 7], H: [7, 8], colors: 3, fill: 0.6, beaver: true, shapes: ['dot', 'bar2h', 'bar2v', 'bar3h', 'bar3v', 'sq', 'l1', 'l2', 'l3', 'l4'], extra: [3, 10], note: 'beaver' },
];

function shapeBox(sh) { return { h: Math.max(...sh.map(q => q[0])) + 1, w: Math.max(...sh.map(q => q[1])) + 1 }; }

function makeLevel(st) {
  const W = int(...st.W), H = int(...st.H);
  const walls = [];
  if (st.walls) {
    // Staircase corners or a notch on one side.
    const corner = pick(['tl', 'tr', 'bl', 'br']);
    const k = int(1, 2);
    for (let i = 0; i < k; i++) for (let j = 0; j < k - i; j++) {
      const r = corner[0] === 't' ? i : H - 1 - i, c = corner[1] === 'l' ? j : W - 1 - j;
      walls.push([r, c]);
    }
    if (rand() < 0.5) walls.push([int(2, H - 3), pick([0, W - 1])]);
  }
  const occ = Array.from({ length: H }, () => Array(W).fill(0));
  walls.forEach(([r, c]) => occ[r][c] = -1);
  // Water is blue-green, so fire levels leave out the blues.
  const colors = COLORS.filter(c => (!st.fire || (c !== 'sky' && c !== 'blue')) && (!st.beaver || (c !== 'orange' && c !== 'green' && c !== 'yellow'))).sort(() => rand() - 0.5).slice(0, st.colors);
  if (st.fire) colors.push('water', 'water');
  const pieces = [];
  const free = H * W - walls.length;
  let used = 0, tries = 0;
  while (used / free < st.fill && tries++ < 400) {
    const sh = SHAPES[pick(st.shapes)], { h, w } = shapeBox(sh);
    const r = int(0, H - h), c = int(0, W - w);
    if (!sh.every(([a, b]) => occ[r + a][c + b] === 0)) continue;
    const id = pieces.length + 1;
    sh.forEach(([a, b]) => occ[r + a][c + b] = id);
    const p = { id, color: pick(colors), r, c, h, w, key: false, lock: 0, ice: 0 };
    if (sh.length !== h * w) p.shape = sh;
    pieces.push(p);
    used += sh.length;
  }
  if (st.fire) {
    const water = pieces.filter(p => p.color === 'water').length;
    if (water < 2 || water > 4) return null;
    // Fires go on empty cells, not in the outer ring (so they block the middle, not the doors).
    const k = int(2, 4);
    for (let i = 0, tries = 0; i < k && tries < 100; tries++) {
      const r = int(1, H - 2), c = int(1, W - 2);
      if (occ[r][c] !== 0) continue;
      occ[r][c] = -3;
      pieces.push({ id: pieces.length + 1, color: 'fire', fire: int(1, Math.min(2, water)), r, c, h: 1, w: 1, key: false, lock: 0, ice: 0 });
      i++;
    }
  }
  if (st.beaver) {
    // 1–2 beavers (1×1), then 2–4 forest cells inside the board, not touching a beaver; most hide a block.
    const free = (r, c) => r >= 0 && c >= 0 && r < H && c < W && occ[r][c] === 0;
    const beavers = int(1, 2);
    for (let i = 0, tries = 0; i < beavers && tries < 100; tries++) {
      const r = int(0, H - 1), c = int(0, W - 1);
      if (!free(r, c)) continue;
      occ[r][c] = -4;
      pieces.push({ id: pieces.length + 1, color: 'beaver', r, c, h: 1, w: 1, key: false, lock: 0, ice: 0 });
      i++;
    }
    const near = (r, c) => pieces.some(p => p.color === 'beaver' && Math.abs(p.r - r) + Math.abs(p.c - c) <= 1);
    const used = [...new Set(pieces.filter(p => p.color !== 'beaver').map(p => p.color))];
    const k = int(2, 4);
    for (let i = 0, tries = 0; i < k && tries < 100; tries++) {
      const r = int(1, H - 2), c = int(1, W - 2);
      if (!free(r, c) || near(r, c)) continue;
      occ[r][c] = -5;
      pieces.push({ id: pieces.length + 1, color: 'forest', under: rand() < 0.65 ? pick(used) : null, r, c, h: 1, w: 1, key: false, lock: 0, ice: 0 });
      i++;
    }
    if (!pieces.some(p => p.color === 'forest' && p.under)) return null;
  }
  const inUse = [...new Set(pieces.filter(p => !p.fire && p.color !== 'forest').map(p => p.color))];
  // One exit per colour, wide enough for every piece of that colour on the side it's on.
  const gates = [];
  const taken = { L: new Set(), R: new Set(), T: new Set(), B: new Set() };
  for (const col of inUse) {
    const mine = pieces.filter(p => (p.color === col && !p.fire) || (p.color === 'forest' && p.under === col));
    for (let attempt = 0; attempt < 30; attempt++) {
      const side = pick(['L', 'R', 'T', 'B']);
      const flat = side === 'L' || side === 'R';
      const span = Math.max(...mine.map(p => flat ? p.h : p.w));
      const n = flat ? H : W;
      const len = Math.min(n, Math.max(span, int(1, 3)));
      const start = int(0, n - len);
      const cells = [...Array(len).keys()].map(k => start + k);
      if (cells.some(k => taken[side].has(k) || taken[side].has(k - 1) || taken[side].has(k + 1))) continue;
      // The edge cell in front of the exit must not be a wall.
      if (cells.some(k => walls.some(([r, c]) => side === 'L' ? r === k && c === 0 : side === 'R' ? r === k && c === W - 1 : side === 'T' ? c === k && r === 0 : c === k && r === H - 1))) continue;
      cells.forEach(k => taken[side].add(k));
      gates.push({ id: gates.length + 1, side, start, len, color: col, frozen: 0 });
      break;
    }
  }
  if (gates.length !== inUse.length) return null;
  if (st.ice) for (const p of pieces) if (!p.fire && p.color !== 'water' && rand() < (st.fire ? 0.1 : 0.2)) p.ice = int(1, 3);
  if (st.frozen) for (const g of gates) if (rand() < 0.35) g.frozen = int(1, 3);
  if (st.layered) for (const p of pieces) if (rand() < 0.2 && (p.shape ? p.shape.length : p.h * p.w) >= 2) {
    const other = inUse.filter(c => c !== p.color);
    if (other.length) p.inner = pick(other);
  }
  return { W, H, walls, tracks: [], pieces, gates, tickPerCell: false };
}

function check(level, st) {
  const res = Engine.solve(JSON.parse(JSON.stringify(level)), 2500);
  if (!res.ok) return null;
  // Difficulty = moves that only make room (not a block leaving).
  const moves = res.steps.length, extra = res.steps.filter(x => x.kind !== 'exit').length;
  if (extra < st.extra[0] || extra > st.extra[1]) return null;
  // Fire must matter: some block has to cross a cell that was burning.
  if (level.pieces.some(p => p.fire)) {
    const burning = new Set(level.pieces.filter(p => p.fire).map(p => p.r + ',' + p.c));
    const crosses = res.steps.some(s => Engine.path(level, s.before, s.pieceId, s.r, s.c)
      .some(([r, c]) => Engine.cellsOf(s.before.pieces.find(p => p.id === s.pieceId), r, c).some(q => burning.has(q.join(',')))));
    if (!crosses) return null;
  }
  return moves;
}

// Challenges: quick-to-medium boards from every stage, 20 each (no intro notes — nothing new to explain).
const PLAN = CHALLENGE ? STAGES.map(st => ({ ...st, n: 20, note: undefined })) : STAGES;
const levels = (APPEND || REDO.length) ? require(CHALLENGE ? '../js/challenge-levels.js' : '../js/levels.js').slice() : [];
let skip = levels.length;
if (APPEND) seed = (seed + levels.length * 7919) % 2147483648;
// No two levels may be the same board (the old random generator can repeat itself).
const keyOf = l => JSON.stringify([l.W, l.H, l.walls, l.pieces.map(p => [p.color, p.r, p.c, p.h, p.w, p.shape || 0, p.ice || 0, p.fire || 0, p.inner || 0, p.under || 0]), l.gates]);
const keys = new Set(levels.filter((_, i) => !REDO.includes(i + 1)).map(keyOf));
if (REDO.length) {
  seed = (seed * 31 + REDO.reduce((a, n) => a * 131 + n, 7)) % 2147483648;
  const starts = []; let at = 0;
  for (const st of PLAN) { starts.push(at); at += st.n; }
  for (const n of REDO) {
    const i = n - 1, si = starts.findLastIndex(a => a <= i), st = PLAN[si];
    for (let tries = 1; tries < 4000; tries++) {
      const lv = makeLevel(st);
      if (!lv || keys.has(keyOf(lv))) continue;
      const par = check(lv, st);
      if (!par) continue;
      lv.par = par;
      if (levels[i].intro) lv.intro = levels[i].intro;
      levels[i] = lv; keys.add(keyOf(lv));
      process.stderr.write(`level ${n} (new): ${lv.W}×${lv.H}, ${lv.pieces.length} blocks, par ${par} (${tries} tries)\n`);
      break;
    }
  }
  skip = Infinity;
}
for (const st of PLAN) {
  if (skip >= st.n) { skip -= st.n; continue; }
  if (skip === Infinity) break;
  let made = 0, tries = 0;
  while (made < st.n && tries++ < 4000) {
    const lv = makeLevel(st);
    if (!lv || keys.has(keyOf(lv))) continue;
    const par = check(lv, st);
    if (!par) continue;
    lv.par = par;
    if (st.note && made === 0) lv.intro = st.note;
    levels.push(lv); keys.add(keyOf(lv));
    made++;
    process.stderr.write(`level ${levels.length}: ${lv.W}×${lv.H}, ${lv.pieces.length} blocks, par ${par} (${tries} tries)\n`);
  }
}
const NAME = CHALLENGE ? 'CHALLENGE_LEVELS' : 'LEVELS';
const out = `// Generated by tools/generate.js — every level was solved by the engine; par = its move count.\nconst ${NAME} = ` + JSON.stringify(levels) + `;\nif (typeof module !== "undefined") module.exports = ${NAME};\n`;
fs.writeFileSync(path.join(__dirname, CHALLENGE ? '../js/challenge-levels.js' : '../js/levels.js'), out);
console.log(`${levels.length} levels written`);
