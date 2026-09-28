// Happy Blocks — screens, board drawing, dragging, exits, stars and saved progress.
const $ = id => document.getElementById(id);
const clone = o => JSON.parse(JSON.stringify(o));

const COLORS = {
  red: '#e8263a', blue: '#3d7bff', yellow: '#ffc933', green: '#2fcf6f',
  purple: '#a45cff', orange: '#ff9a1a', pink: '#ff5fb2', sky: '#3fd0ff',
};
const ARROW = { L: '◀', R: '▶', T: '▲', B: '▼' };
const INTRO = {
  walls: 'New: walls. Blocks can’t pass them.',
  ice: 'New: ice. It melts a step each time a block leaves.',
  frozen: 'New: frozen doors. They open after that many blocks leave.',
  layered: 'New: layered blocks. The outside leaves, the core stays behind.',
  fire: 'New: fire! Each water block you drag out sprays every fire once. Out fire, open road.',
  packed: 'Packed! The board is full — find the blocks that can leave first, then wiggle the rest free.',
  chains: 'New: chains. A chained block only goes as far as its chain reaches — the number on the post.',
  prison: 'New: prison! Locked blocks can’t move. Every 🔑 key block you drag out opens a lock.',
  lanes: 'New: colour lanes. Only blocks of that colour may cross them.',
  arrows: 'New: blocks on wheels! They only roll one way — wheels underneath ↔, wheels on the side ↕.',
  beaver: 'New: beavers! Pull one onto a tree and it eats it — something may be hiding inside.',
};

// ── Progress ─────────────────────────────────────────────────
const SAVE = 'unblock_progress_v1';
// Progress carried over from the old address (?carry=…): merged in, best of each level.
try {
  const q = new URLSearchParams(location.search), c = q.get('carry');
  if (c) {
    const got = JSON.parse(atob(c)), mine = JSON.parse(localStorage.getItem(SAVE) || '{}');
    const m = { stars: { ...(mine.stars || {}) }, moves: { ...(mine.moves || {}) } };
    for (const [k, v] of Object.entries(got.stars || {})) if (!(m.stars[k] >= v)) m.stars[k] = v;
    for (const [k, v] of Object.entries(got.moves || {})) if (!(m.moves[k] <= v)) m.moves[k] = v;
    localStorage.setItem(SAVE, JSON.stringify(m));
    q.delete('carry');
    window.history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
  }
} catch (e) { console.warn('carry', e); }
let progress = { stars: {}, moves: {} };
try { progress = { stars: {}, moves: {}, ...JSON.parse(localStorage.getItem(SAVE) || '{}') }; } catch (e) {}
const saveProgress = () => { try { localStorage.setItem(SAVE, JSON.stringify(progress)); } catch (e) {} };
const starsOf = i => progress.stars[i] || 0;
// Developer mode (accounts on config/dev, switchable on the privacy page): every level is open.
const devOn = () => { try { return localStorage.getItem('unblock_dev') === '1' && localStorage.getItem('unblock_dev_on') !== '0'; } catch (e) { return false; } };
const unlocked = i => i === 0 || starsOf(i - 1) > 0 || starsOf(i) > 0 || devOn();
// Totals for the leaderboard: stars, and the best move counts of the levels solved.
const totals = () => {
  const done = Object.keys(progress.stars).filter(k => progress.stars[k] > 0);
  return {
    stars: done.reduce((a, k) => a + progress.stars[k], 0),
    moves: done.reduce((a, k) => a + (progress.moves[k] || LEVELS[k].par * 2), 0),
    levels: done.length,
  };
};
const firstOpen = () => { const i = LEVELS.findIndex((_, k) => !starsOf(k)); return i < 0 ? LEVELS.length - 1 : i; };

// ── Screens ──────────────────────────────────────────────────
function show(id) {
  ['home', 'levels', 'ranks', 'game', 'chs', 'ch', 'team'].forEach(s => $(s).hidden = s !== id);
  updBanner();
  // Leaving the board (e.g. an invite link opened mid-game) closes its cards and challenge play.
  if (id !== 'game') stopClock();
  if (id !== 'game') { $('win').hidden = true; $('timeup').hidden = true; chPlay = null; }
  $('help-sheet').hidden = true;
}
function logo() {
  const box = document.querySelector('.logo');
  if (box.dataset.done) return;
  box.dataset.done = 1;
  box.innerHTML = '';
  [['red', 0, 0], ['blue', 0, 1], ['yellow', 1, 0], ['green', 1, 1]].forEach(([color, r, c], i) => {
    const d = document.createElement('div');
    d.className = 'logo-block';
    d.style.setProperty('--i', i);
    d.innerHTML = Art.blockSVG({ color, r: 0, c: 0, h: 1, w: 1 }, 64);
    box.appendChild(d);
  });
}
function home() {
  logo();
  const total = Object.values(progress.stars).reduce((a, b) => a + b, 0);
  $('stars-total').textContent = total ? `★ ${total}/${LEVELS.length * 3}` : '';
  $('play').textContent = total ? 'Continue' : 'Play';
  meChip();
  show('home');
  if (typeof Social !== 'undefined') Social.helpBox();
}
const STAGES = [
  ['Warm-up', 'red'], ['Getting busy', 'orange'], ['Walls', 'purple'],
  ['On ice', 'sky'], ['Frosty doors', 'blue'], ['Layers', 'pink'], ['Fire', 'orange'],
  ['Mixed bag', 'green'], ['Big boards', 'purple'], ['Expert', 'red'], ['Beaver woods', 'orange'], ['On wheels', 'sky'], ['Colour lanes', 'green'], ['Prison', 'yellow'], ['Chains', 'blue'], ['Packed', 'pink'], ['Ice, keys & arrows', 'sky'], ['Fire & lanes', 'orange'], ['Woods & chains', 'green'], ['Grand finale', 'purple'],
];
function levelList() {
  const g = $('level-grid');
  g.innerHTML = '';
  const next = firstOpen();
  LEVELS.forEach((_, i) => {
    if (i % 5 === 0) {
      const [name] = STAGES[Math.floor(i / 5)] || ['More'];
      const got = [0, 1, 2, 3, 4].reduce((a, k) => a + starsOf(i + k), 0);
      const h = document.createElement('h3');
      h.className = 'stage';
      h.innerHTML = `<span>${name}</span><small>★ ${got} / 15</small>`;
      g.appendChild(h);
    }
    const color = (STAGES[Math.floor(i / 5)] || STAGES[0])[1];
    const b = document.createElement('button');
    b.className = 'lvl' + (unlocked(i) ? '' : ' locked') + (i === next && !starsOf(i) ? ' next' : '');
    if (unlocked(i)) b.style.setProperty('--c', Art.PAL[color][1]), b.style.setProperty('--l', Art.PAL[color][0]), b.style.setProperty('--d', Art.PAL[color][3]);
    const st3 = [1, 2, 3].map(k => `<i class="${k <= starsOf(i) ? 'on' : ''}">★</i>`).join('');
    b.innerHTML = unlocked(i) ? `<b>${i + 1}</b><small>${st3}</small>` : '<b>🔒</b>';
    if (LEVELS[i].time) b.insertAdjacentHTML('beforeend', '<i class="timed">⏱</i>');
    b.addEventListener('click', () => unlocked(i) && start(i));
    g.appendChild(b);
  });
  show('levels');
  const cur = g.querySelector('.next');
  if (cur) cur.scrollIntoView({ block: 'center' });
}

// ── Game state ───────────────────────────────────────────────
let idx = 0, level = null, st = null, moves = 0, history = [], busy = false;
let cs = 48, gut = 24;
// Set while playing a challenge level (social.js): { code, pos, again(), next(), back(), won(moves, stars) }.
let chPlay = null;
// Every drag this attempt, as { p: block, r, c, g: door id or 0 } — sent to a friend who asked for help.
let sol = [];
// helpCtx: solving a friend's help request { id, from, fromName }; answer: watching/following a friend's
// solution { name, steps }; watching: the solution is playing itself (no stars saved).
let helpCtx = null, answer = null, watching = false;

function begin(lv, title, hint) {
  level = clone(lv);
  st = { pieces: clone(level.pieces), gates: clone(level.gates) };
  moves = 0; history = []; busy = false; sol = []; watching = false;
  $('level-name').textContent = title;
  $('hint').textContent = hint || '';
  $('win').hidden = true;
  $('clock').hidden = !chPlay;
  lvClock();
  $('ask-friend').hidden = !!chPlay || !!answer;
  ansBar();
  hintButton();
  show('game');
  layout();
  render();
}
function start(i, opts = {}) {
  chPlay = null;
  idx = i;
  helpCtx = opts.help || null;
  answer = opts.answer || null;
  const hint = helpCtx ? `🤝 Helping ${helpCtx.fromName} — solve it and your moves go to them.`
    : i === 0 ? 'Drag each block out through the door of its colour.' : INTRO[LEVELS[i].intro];
  begin(LEVELS[i], `Level ${i + 1}`, hint);
  // Something new in this level: the "New!" card the first time, and a "show me" link to see it again.
  const key = i === 0 ? 'basics' : LEVELS[i].intro;
  if (key && Intro.has(key) && !helpCtx && !answer) {
    const again = document.createElement('button');
    again.className = 'intro-again';
    again.textContent = '▶ Show me';
    again.onclick = () => Intro.show(key, true);
    $('hint').append(' ', again);
    Intro.show(key);
  }
}

function status() { $('moves').textContent = `${moves} move${moves === 1 ? '' : 's'} · par ${level.par}`; }

function layout() {
  const aw = Math.min(window.innerWidth, 560) - 24, ah = window.innerHeight - (chPlay ? 230 : 200) - (answer ? 50 : 0);
  cs = Math.floor(Math.min(aw / (level.W + 1), ah / (level.H + 1), 72));
  gut = Math.round(cs * 0.5);
}

const px = (r, c) => [gut + c * cs, gut + r * cs];
const el = (cls, css) => { const d = document.createElement('div'); d.className = cls; Object.assign(d.style, css || {}); return d; };

function doorBox(gt) {
  const along = gut + gt.start * cs + 4, len = gt.len * cs - 8, t = gut - 10;
  if (gt.side === 'L') return { left: '5px', top: along + 'px', width: t + 'px', height: len + 'px' };
  if (gt.side === 'R') return { left: (gut + level.W * cs + 5) + 'px', top: along + 'px', width: t + 'px', height: len + 'px' };
  if (gt.side === 'T') return { top: '5px', left: along + 'px', height: t + 'px', width: len + 'px' };
  return { top: (gut + level.H * cs + 5) + 'px', left: along + 'px', height: t + 'px', width: len + 'px' };
}

function blockEl(p) {
  const d = el('block', { width: p.w * cs + 'px', height: p.h * cs + 'px' });
  d.dataset.id = p.id;
  d.dataset.h = p.h;
  d.innerHTML = Art.blockSVG(p, cs);
  place(d, p.r, p.c);
  return d;
}
// Blocks lower on the board are drawn on top, so a block's side and shadow tuck behind the one below.
function forestEl(p) {
  const d = Art.forest(cs);
  d.dataset.forest = p.id;
  d.dataset.r = p.r; d.dataset.c = p.c;
  d.dataset.h = 1;
  place(d, p.r, p.c);
  return d;
}
function fireEl(p) {
  const d = Art.fire(p.fire, cs);
  d.dataset.fire = p.id;
  d.dataset.h = 1;
  place(d, p.r, p.c);
  return d;
}
function place(d, r, c) {
  const [x, y] = px(r, c);
  d.style.transform = `translate(${x}px, ${y}px)`;
  d.style.setProperty('--z', 1 + Math.round(r) + (+d.dataset.h || 1));
}

function render() {
  const b = $('board');
  b.innerHTML = '';
  b.style.width = level.W * cs + 2 * gut + 'px';
  b.style.height = level.H * cs + 2 * gut + 'px';
  const walls = new Set((level.walls || []).map(([r, c]) => r + ',' + c));
  const posts = new Set(level.pieces.filter(p => p.tether).map(p => p.tether.r + ',' + p.tether.c));
  for (let r = 0; r < level.H; r++) for (let c = 0; c < level.W; c++) {
    const [x, y] = px(r, c);
    b.appendChild(el(posts.has(r + ',' + c) ? 'cell post' : walls.has(r + ',' + c) ? 'wall' : 'cell', { left: x + 3 + 'px', top: y + 3 + 'px', width: cs - 6 + 'px', height: cs - 6 + 'px', borderRadius: Math.round(cs * 0.2) + 'px' }));
  }
  // Colour lanes: floor cells only blocks of that colour may cross.
  for (const [r, c, col] of level.tracks || []) {
    const [x, y] = px(r, c);
    b.appendChild(Art.lane(col, cs, { left: x + 3 + 'px', top: y + 3 + 'px', width: cs - 6 + 'px', height: cs - 6 + 'px', borderRadius: Math.round(cs * 0.2) + 'px' }));
  }
  for (const gt of st.gates) b.appendChild(Art.door(gt, doorBox(gt), gut));
  for (const p of st.pieces) b.appendChild(p.fire ? fireEl(p) : p.color === 'forest' ? forestEl(p) : blockEl(p));
  if (level.pieces.some(p => p.tether)) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'chains';
    svg.setAttribute('width', level.W * cs + 2 * gut); svg.setAttribute('height', level.H * cs + 2 * gut);
    b.appendChild(svg);
    drawChains();
  }
  status();
}

// Chains from each post to its block (the dragged one where the finger has it). Tight at full reach.
function drawChains(dragId, dr, dc) {
  const svg = $('chains');
  if (!svg) return;
  let h = '';
  // Posts stay after their block has gone.
  for (const q of level.pieces.filter(q => q.tether)) {
    const [x0, y0] = px(q.tether.r + 0.5, q.tether.c + 0.5);
    h += `<circle cx="${x0}" cy="${y0 + cs * 0.06}" r="${cs * 0.24}" fill="#1a1440" opacity="0.5"/><circle cx="${x0}" cy="${y0}" r="${cs * 0.22}" fill="#8a6a44" stroke="#4a3520" stroke-width="${cs * 0.05}"/><circle cx="${x0}" cy="${y0 - cs * 0.05}" r="${cs * 0.12}" fill="#b89366"/>`
      + `<circle cx="${x0 + cs * 0.27}" cy="${y0 - cs * 0.27}" r="${cs * 0.15}" fill="#fff" stroke="#2b2f45" stroke-width="${cs * 0.02}"/><text x="${x0 + cs * 0.27}" y="${y0 - cs * 0.27 + cs * 0.075}" text-anchor="middle" font-size="${cs * 0.2}" font-weight="700" fill="#2b2f45" font-family="Fredoka, system-ui, sans-serif">${q.tether.len}</text>`;
  }
  for (const p of st.pieces.filter(q => q.tether)) {
    const r = p.id === dragId ? dr : p.r, c = p.id === dragId ? dc : p.c, t = p.tether;
    const cells = Engine.cellsOf(p, r, c);
    const near = cells.reduce((a, q) => Math.hypot(q[0] - t.r, q[1] - t.c) < Math.hypot(a[0] - t.r, a[1] - t.c) ? q : a);
    const [x0, y0] = px(t.r + 0.5, t.c + 0.5), [x1, y1] = px(near[0] + 0.5, near[1] + 0.5);
    const dist = Math.abs(near[0] - t.r) + Math.abs(near[1] - t.c), slack = Math.max(0, t.len - dist) / t.len;
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + cs * 0.45 * slack;
    const d = `M${x0},${y0} Q${mx},${my} ${x1},${y1}`;
    h += `<path d="${d}" fill="none" stroke="#2b2f45" stroke-width="${cs * 0.16}" stroke-linecap="round"/>`
      + `<path d="${d}" fill="none" stroke="#b9c0d8" stroke-width="${cs * 0.1}" stroke-linecap="round" stroke-dasharray="${cs * 0.16} ${cs * 0.1}"/>`
      + `<path d="${d}" fill="none" stroke="#eef1ff" stroke-width="${cs * 0.035}" stroke-linecap="round" stroke-dasharray="${cs * 0.08} ${cs * 0.18}" opacity="0.8"/>`
      + `<circle cx="${x0}" cy="${y0 - cs * 0.05}" r="${cs * 0.09}" fill="#d9deef" stroke="#2b2f45" stroke-width="${cs * 0.03}"/>`;
  }
  svg.innerHTML = h;
}

// ── Dragging ─────────────────────────────────────────────────
let drag = null;

// The exit a block at (r, c) could leave through now, or null. Only exits on `side` if given.
function exitFor(p, r, c, side) {
  const g = Engine.grid(level, st.pieces);
  const cells = Engine.cellsOf(p, r, c);
  for (const gt of st.gates) {
    if (gt.frozen || gt.color !== p.color || (side && gt.side !== side)) continue;
    // Arrow blocks leave only along their arrow.
    if ((p.axis === 'h' && (gt.side === 'T' || gt.side === 'B')) || (p.axis === 'v' && (gt.side === 'L' || gt.side === 'R'))) continue;
    // A chained block only reaches doors within its chain's reach.
    if (!Engine.reachesDoor(level, p, gt, cells)) continue;
    const lane = Engine.laneOf(level, gt, cells);
    if (lane && lane.every(([y, x]) => { const v = g[y * level.W + x]; return v === -1 || v === p.id; })) return { gt, lane };
  }
  return null;
}

$('board').addEventListener('pointerdown', e => {
  if (busy || drag || watching) return;
  Sound.unlock();
  const d = e.target.closest('.block');
  if (!d) return;
  const p = st.pieces.find(x => x.id === +d.dataset.id);
  if (p.ice || p.lock) { d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); Sound.bump(); return; }
  clearHint();
  startClock();
  drag = { p, d, x0: e.clientX, y0: e.clientY, r0: p.r, c0: p.c, r: p.r, c: p.c, g: Engine.grid(level, st.pieces), trail: [] };
  d.classList.add('dragging');
  $('board').setPointerCapture(e.pointerId);
});

$('board').addEventListener('pointermove', e => {
  if (!drag) return;
  const { p, d } = drag;
  const tr = drag.r0 + (e.clientY - drag.y0) / cs, tc = drag.c0 + (e.clientX - drag.x0) / cs;
  // Slide cell by cell toward the finger, stopping at anything in the way (and sliding along it).
  for (let k = 0; k < 40; k++) {
    const dr = tr - drag.r, dc = tc - drag.c;
    const steps = [];
    if (Math.abs(dr) >= 0.5 && p.axis !== 'h') steps.push([Math.sign(dr), 0, Math.abs(dr)]);
    if (Math.abs(dc) >= 0.5 && p.axis !== 'v') steps.push([0, Math.sign(dc), Math.abs(dc)]);
    steps.sort((a, b) => b[2] - a[2]);
    const ok = steps.find(([sr, sc]) => Engine.fits(level, drag.g, p, drag.r + sr, drag.c + sc));
    if (!ok) break;
    drag.r += ok[0]; drag.c += ok[1];
    Sound.tick();
  }
  // Recent finger positions, for flicks.
  const now = performance.now();
  drag.trail.push([now, tr, tc]);
  while (drag.trail.length > 2 && now - drag.trail[0][0] > 100) drag.trail.shift();
  drag.tr = tr; drag.tc = tc;
  // At its door with the way clear, a light pull toward it is enough: in it goes.
  for (const out of exits(p, drag.r, drag.c)) {
    if (gapTo(out.gt.side, p, drag.r, drag.c) === 0 && pullTo(out.gt.side, tr - drag.r, tc - drag.c) > 0.18) { finishDrag(out); return; }
  }
  // The beaver pulled onto trees next to it: it hops on and eats them.
  if (p.color === 'beaver') {
    const way = Object.values(SIDE_DIR).find(([sr, sc]) => sr * (tr - drag.r) + sc * (tc - drag.c) > 0.25 && woodAt(p, drag.r, drag.c, sr, sc));
    if (way) { finishDrag(null, way); return; }
  }
  // Glide with the finger between cells wherever there's room (the snapped cell moves on at half a
  // cell); against something, give just a little, like pressing on jelly.
  const fits = (sr, sc) => Engine.fits(level, drag.g, p, drag.r + sr, drag.c + sc);
  const give = v => Math.sign(v) * Math.min(0.05, Math.abs(v) * 0.2);
  const lean = (v, free) => free ? Math.max(-0.49, Math.min(0.49, v)) : give(v);
  const dr = tr - drag.r, dc = tc - drag.c;
  let fr = p.axis === 'h' ? 0 : lean(dr, Math.abs(dr) > 0.01 && fits(Math.sign(dr), 0)), fc = p.axis === 'v' ? 0 : lean(dc, Math.abs(dc) > 0.01 && fits(0, Math.sign(dc)));
  // Both ways at once only if the diagonal cell is free too; otherwise the stronger pull wins.
  if (Math.abs(fr) > 0.05 && Math.abs(fc) > 0.05 && !fits(Math.sign(fr), Math.sign(fc))) {
    if (Math.abs(fr) > Math.abs(fc)) fc = give(dc); else fr = give(dr);
  }
  drag.fr = fr; drag.fc = fc;
  if (!drag.raf) drag.raf = requestAnimationFrame(() => {
    if (!drag) return;
    drag.raf = 0;
    const [x, y] = px(drag.r + drag.fr, drag.c + drag.fc);
    drag.d.style.transform = `translate(${x}px, ${y}px)`;
    if (drag.p.tether) drawChains(drag.p.id, drag.r + drag.fr, drag.c + drag.fc);
  });
});

const SIDE_DIR = { L: [0, -1], R: [0, 1], T: [-1, 0], B: [1, 0] };
// How far (dr, dc) points toward a side of the board.
const pullTo = (side, dr, dc) => SIDE_DIR[side][0] * dr + SIDE_DIR[side][1] * dc;
// Free rows/columns between the block at (r, c) and that edge.
function gapTo(side, p, r, c) {
  const cells = Engine.cellsOf(p, r, c), ys = cells.map(q => q[0]), xs = cells.map(q => q[1]);
  return side === 'L' ? Math.min(...xs) : side === 'R' ? level.W - 1 - Math.max(...xs) : side === 'T' ? Math.min(...ys) : level.H - 1 - Math.max(...ys);
}
// Every door this block could leave through from (r, c) right now.
const exits = (p, r, c) => ['L', 'R', 'T', 'B'].map(sd => exitFor(p, r, c, sd)).filter(Boolean);

const endDrag = () => {
  if (!drag) return;
  const { p, r, c, r0, c0, trail } = drag;
  // Finger speed over the last moment, in cells per millisecond.
  const [a, b] = [trail[0], trail[trail.length - 1]];
  const dt = a && b ? Math.max(16, b[0] - a[0]) : 1;
  const vr = a && b ? (b[1] - a[1]) / dt : 0, vc = a && b ? (b[2] - a[2]) / dt : 0;
  // Let go near its door (one cell away at most) or flicked toward it: it leaves.
  const out = exits(p, r, c).find(o => {
    const gap = gapTo(o.gt.side, p, r, c), speed = pullTo(o.gt.side, vr, vc);
    return gap === 0 || (gap === 1 && pullTo(o.gt.side, r - r0, c - c0) > 0) || (gap <= 4 && speed > 0.004);
  });
  finishDrag(out || null);
};
$('board').addEventListener('pointerup', endDrag);
$('board').addEventListener('pointercancel', endDrag);

// Is there forest right next to block p at (r, c), in direction (sr, sc)?
function woodAt(p, r, c, sr, sc) {
  const woods = new Set();
  for (const q of st.pieces) if (q.color === 'forest') for (const [y, x] of Engine.cellsOf(q)) woods.add(y + ',' + x);
  return Engine.cellsOf(p, r + sr, c + sc).some(([y, x]) => woods.has(y + ',' + x));
}

function finishDrag(out, eat) {
  const { p, d, r0, c0, r, c, raf } = drag;
  if (raf) cancelAnimationFrame(raf);
  drag = null;
  d.classList.remove('dragging');
  const movedAtAll = out || eat || r !== r0 || c !== c0;
  if (!movedAtAll) { place(d, r0, c0); settle(d); return; }
  history.push({ st: clone(st), moves, n: sol.length });
  moves++;
  sol.push({ p: p.id, r, c, g: out ? out.gt.id : 0, e: eat ? forestAt(p, r, c, ...eat) : 0 });
  st.pieces = st.pieces.map(x => x.id === p.id ? { ...x, r, c } : x);
  if (!out) { status(); if (eat) beaverEat(p.id, d, eat); else { place(d, r, c); settle(d); } return; }
  leave(p.id, d, out.gt, r, c);
}

function settle(d) { d.classList.remove('settle'); void d.offsetWidth; d.classList.add('settle'); }

function leave(id, d, gt, r, c) {
  busy = true;
  Sound.exit();
  const p = st.pieces.find(x => x.id === id);
  const far = gt.side === 'L' ? [r, -p.w - 1] : gt.side === 'R' ? [r, level.W + 1] : gt.side === 'T' ? [-p.h - 1, c] : [level.H + 1, c];
  // From wherever it is under the finger, straight into the door.
  requestAnimationFrame(() => { d.classList.add('leaving'); place(d, ...far); });
  const door = document.querySelector(`[data-gate="${gt.id}"]`);
  if (door) {
    door.classList.remove('pulse'); void door.offsetWidth; door.classList.add('pulse');
    const dir = { L: [-1, 0], R: [1, 0], T: [0, -1], B: [0, 1] }[gt.side];
    Art.burst($('board'), door.offsetLeft + door.offsetWidth / 2, door.offsetTop + door.offsetHeight / 2, p.color, dir);
  }
  Native.buzz();
  const before = st.gates.filter(g => g.frozen).length, iced = st.pieces.filter(q => q.ice).length;
  const icedIds = st.pieces.filter(q => q.ice).map(q => q.id), lockedIds = st.pieces.filter(q => q.lock).map(q => q.id);
  // Water: drops fly from the door onto every fire.
  const fires = p.color === 'water' ? st.pieces.filter(q => q.fire) : [];
  if (fires.length && door) {
    const x0 = door.offsetLeft + door.offsetWidth / 2, y0 = door.offsetTop + door.offsetHeight / 2;
    fires.forEach((f, i) => { const [x, y] = px(f.r + 0.5, f.c + 0.5); Art.sprinkle($('board'), x0, y0, x, y, 120 + i * 60); });
    setTimeout(Sound.splash, 150);
  }
  Engine.applyExit(level, st, id, r, c, gt);
  setTimeout(() => {
    busy = false;
    if (st.gates.filter(g => g.frozen).length < before || st.pieces.filter(q => q.ice).length < iced) Sound.thaw();
    // Prisons a key just opened: the bars fly off in gold sparks.
    for (const q of st.pieces.filter(q => !q.lock && lockedIds.includes(q.id))) {
      const e = document.querySelector(`.block[data-id="${q.id}"]`);
      if (!e) continue;
      e.classList.add('thawed');
      const [x, y] = px(q.r + q.h / 2, q.c + q.w / 2);
      Art.burst($('board'), x, y, 'gold', [0, -1]);
      Sound.thaw();
    }
    render();
    // Blocks whose ice just melted pop out in their colour.
    for (const q of st.pieces.filter(q => !q.ice && icedIds.includes(q.id))) {
      const e = document.querySelector(`.block[data-id="${q.id}"]`);
      if (!e) continue;
      e.classList.add('thawed');
      const [x, y] = px(q.r + q.h / 2, q.c + q.w / 2);
      Art.burst($('board'), x, y, 'ice', [0, -1]);
      Art.burst($('board'), x, y, q.color, [0, 1]);
    }
    // Fires the water reached: out in a puff of steam, or damped (one step lower).
    let out = false;
    for (const f of fires) {
      const [x, y] = px(f.r + 0.5, f.c + 0.5);
      const still = st.pieces.find(q => q.id === f.id);
      Art.steam($('board'), x, y - cs * 0.1, !still);
      if (!still) out = true;
      else { const e = document.querySelector(`[data-fire="${f.id}"]`); if (e) e.classList.add('hiss'); }
    }
    if (fires.length) Sound.sizzle(out);
    if (Engine.done(st)) win();
  }, fires.length ? 560 : 220);
}

// The beaver hops onto the trees next to it and chomps them (anything hidden inside pops out); the
// beaver is used up. `way` is the direction it was pulled; without one (replays) it finds the trees.
function forestAt(p, r, c, sr, sc) {
  const cells = new Set(Engine.cellsOf(p, r + sr, c + sc).map(q => q.join(',')));
  const f = st.pieces.find(q => q.color === 'forest' && cells.has(q.r + ',' + q.c));
  return f ? f.id : 0;
}
function beaverEat(id, d, way, fid) {
  const b = st.pieces.find(x => x.id === id);
  if (!b || b.color !== 'beaver') return;
  way = way || Object.values(SIDE_DIR).find(([sr, sc]) => forestAt(b, b.r, b.c, sr, sc));
  const eaten = Engine.eatAround(level, st, id, fid || (way ? forestAt(b, b.r, b.c, ...way) : 0));
  if (!eaten.length) { place(d, b.r, b.c); settle(d); return; }
  busy = true;
  const f = document.querySelector(`[data-forest="${eaten[0]}"]`);
  const fr = f ? +f.dataset.r : b.r, fc = f ? +f.dataset.c : b.c;
  // Hop on…
  d.classList.add('hop');
  d.style.setProperty('--z', 60);
  place(d, fr, fc);
  d.style.setProperty('--z', 60);
  setTimeout(() => {
    // …chomp…
    Sound.munch();
    Native.buzz();
    d.classList.add('chomp');
    if (f) f.classList.add('eaten');
    const [cx, cy] = px(fr + 0.5, fc + 0.5);
    [0, 160, 320].forEach(t => setTimeout(() => { Art.burst($('board'), cx, cy, 'wood', [0, -1]); Art.burst($('board'), cx, cy, 'leaf', [0, 1]); }, t));
  }, 260);
  // …and gone, with a happy little puff.
  setTimeout(() => d.classList.add('full'), 700);
  setTimeout(() => {
    busy = false;
    render();
    // What was under the trees pops out.
    const e = document.querySelector(`.block[data-id="${eaten[0]}"]`);
    if (e) e.classList.add('thawed');
    if (Engine.done(st)) win();
  }, 1050);
}

// ── Hint (registered players on the hint list; not in challenges) ─────────
// A developer who has switched developer mode off plays like everyone else: no hint button either.
const devPaused = () => { try { return localStorage.getItem('unblock_dev') === '1' && localStorage.getItem('unblock_dev_on') === '0'; } catch (e) { return false; } };
function hintButton() { $('hint-btn').hidden = !(window.Online && window.Online.canHint) || !!chPlay || devPaused(); }
window.addEventListener('online-hints', () => { hintButton(); if (!$('levels').hidden) levelList(); });
let hintPlan = null;
function clearHint() {
  document.querySelectorAll('.hint-mark').forEach(e => e.remove());
  if ($('hint').textContent.startsWith('Hint') || $('hint').textContent.startsWith('No hint')) $('hint').textContent = '';
}
$('hint-btn').addEventListener('click', () => {
  if (busy || drag) return;
  clearHint();
  $('hint-btn').disabled = true;
  // Let the button show it's thinking before the solver runs.
  setTimeout(() => {
    // Keep the whole solution: while the board matches the next step's start, just show that step.
    const key = x => JSON.stringify([x.pieces.map(q => [q.id, q.r, q.c, q.color, q.ice || 0, q.fire || 0, q.lock || 0]).sort((u, v) => u[0] - v[0]), x.gates.map(g => g.frozen)]);
    if (!hintPlan || hintPlan.level !== level || !hintPlan.steps.length || key(hintPlan.steps[0].before) !== key(st)) {
      const res = Engine.solve(clone({ ...level, pieces: st.pieces, gates: st.gates }), 4000);
      hintPlan = { level, steps: res.ok ? res.steps.slice() : [] };
    }
    $('hint-btn').disabled = false;
    const s = hintPlan.steps.shift();
    if (!s) { $('hint').textContent = 'No hint found from here — try undo or restart.'; return; }
    drawStep({ pieceId: s.pieceId, r: s.r, c: s.c, side: s.kind === 'exit' ? s.before.gates.find(g => g.id === s.gateId).side : null });
    $('hint').textContent = s.kind === 'exit' ? 'Hint: this block can go out now — like this.' : 'Hint: move the glowing block like this.';
  }, 30);
});

// Show one move on the board as a little film: a see-through copy of the block glides the exact route
// (on out through its door for an exit, side = that door's side; onto the trees for a beaver) and
// fades, again and again, until the player moves. The real block glows.
function drawStep({ pieceId, r, c, side }) {
  const p = st.pieces.find(x => x.id === pieceId);
  if (!p) return;
  const b = $('board');
  const route = Engine.path(level, st, pieceId, r, c);
  const pos = route.length ? route.slice() : [[p.r, p.c], [r, c]];
  if (side) {
    const [dr, dc] = SIDE_DIR[side], [lr, lc] = pos[pos.length - 1], k = gapTo(side, p, lr, lc) + Math.max(p.h, p.w) + 0.5;
    pos.push([lr + dr * k, lc + dc * k]);
  } else if (p.color === 'beaver') {
    const way = Object.values(SIDE_DIR).find(([sr, sc]) => woodAt(p, r, c, sr, sc));
    if (way) pos.push([r + way[0], c + way[1]]);
  }
  if (pos.length < 2) pos.push(pos[0]);
  const ghost = blockEl({ ...p });
  ghost.classList.add('hint-mark', 'hint-ghost');
  delete ghost.dataset.id;
  ghost.style.transition = 'none';
  b.appendChild(ghost);
  // Even speed: each stretch gets time for its length; a short hold at the start and the end.
  const len = pos.slice(1).map((q, i) => Math.hypot(q[0] - pos[i][0], q[1] - pos[i][1]));
  const total = len.reduce((x, y) => x + y, 0) || 1, move = Math.min(2200, 380 + total * 200), hold = 450, dur = move + 2 * hold;
  const tf = ([y, x]) => { const [X, Y] = px(y, x); return `translate(${X}px, ${Y}px)`; };
  let t = 0;
  const frames = [{ transform: tf(pos[0]), opacity: 0, offset: 0 }, { transform: tf(pos[0]), opacity: 0.75, offset: hold * 0.5 / dur }, { transform: tf(pos[0]), opacity: 0.75, offset: hold / dur }];
  pos.slice(1).forEach((q, i) => { t += len[i]; frames.push({ transform: tf(q), opacity: 0.75, offset: (hold + move * t / total) / dur }); });
  frames[frames.length - 1].opacity = side ? 0 : 0.75;
  frames.push({ transform: tf(pos[pos.length - 1]), opacity: 0, offset: 1 });
  ghost.animate(frames, { duration: dur, iterations: Infinity, easing: 'ease-in-out' });
  const blk = b.querySelector(`.block[data-id="${p.id}"]`);
  if (blk) blk.appendChild(el('hint-mark hint-glow'));
}

// ── A friend's solution: follow it move by move, or watch it play ─────────
const stateKey = x => JSON.stringify([x.pieces.map(q => [q.id, q.r, q.c, q.color, q.ice || 0, q.fire || 0, q.lock || 0]).sort((u, v) => u[0] - v[0]), x.gates.map(g => g.frozen)]);
// The board after the first n steps of a solution (null if a step doesn't fit this level).
function replayTo(steps, n) {
  const s2 = { pieces: clone(level.pieces), gates: clone(level.gates) };
  for (const m of steps.slice(0, n)) {
    const p = s2.pieces.find(x => x.id === m.p);
    if (!p) return null;
    s2.pieces = s2.pieces.map(x => x.id === m.p ? { ...x, r: m.r, c: m.c } : x);
    if (m.g) { const gt = s2.gates.find(g => g.id === m.g); if (!gt) return null; Engine.applyExit(level, s2, m.p, m.r, m.c, gt); }
    else if (m.e) Engine.eatAround(level, s2, m.p, m.e);
  }
  return s2;
}
function ansBar() {
  const bar = $('ans-bar');
  bar.hidden = !answer || !!chPlay;
  if (bar.hidden) return;
  $('ans-who').textContent = `${answer.name}’s solution · ${answer.steps.length} moves`;
}
$('ans-next').addEventListener('click', () => {
  if (busy || drag || watching || !answer) return;
  clearHint();
  const n = moves, here = replayTo(answer.steps, n);
  if (!here || stateKey(here) !== stateKey(st)) { $('hint').textContent = `You’ve left ${answer.name}’s path — tap ↻ to start over and follow it.`; return; }
  const m = answer.steps[n];
  if (!m) return;
  drawStep({ pieceId: m.p, r: m.r, c: m.c, side: m.g ? st.gates.find(g => g.id === m.g).side : null });
  $('hint').textContent = `Move ${n + 1} of ${answer.steps.length}`;
});
$('ans-watch').addEventListener('click', () => {
  if (busy || drag || !answer) return;
  const a = answer;
  start(idx, { answer: a });
  watching = true;
  $('hint').textContent = `Watching ${a.name}…`;
  let n = 0;
  const step = () => {
    if (!watching || answer !== a || $('game').hidden) return;
    if (busy) return setTimeout(step, 120);
    const m = a.steps[n++];
    if (!m) return;
    const d = document.querySelector(`.block[data-id="${m.p}"]`);
    if (!d) { watching = false; $('hint').textContent = 'This solution doesn’t fit the level any more.'; return; }
    moves++;
    st.pieces = st.pieces.map(x => x.id === m.p ? { ...x, r: m.r, c: m.c } : x);
    place(d, m.r, m.c); settle(d); status(); Sound.tick();
    if (m.e) setTimeout(() => beaverEat(m.p, d, null, m.e), 180);
    if (m.g) setTimeout(() => leave(m.p, d, st.gates.find(g => g.id === m.g), m.r, m.c), 260);
    setTimeout(step, m.g ? 700 : 520);
  };
  setTimeout(step, 600);
});

// ── Win ──────────────────────────────────────────────────────
function starsFor(m, par) { return m <= par ? 3 : m <= Math.ceil(par * 1.4) ? 2 : 1; }
function win() {
  stopClock();
  const s = starsFor(moves, level.par);
  Sound.win();
  $('win-stars').innerHTML = [1, 2, 3].map(k => `<span class="star ${k <= s ? 'on' : 'off'}" style="--k:${k}"><svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"/></svg></span>`).join('');
  $('win-text').textContent = s === 3 ? `${moves} moves — perfect!` : `${moves} moves · ${level.par} for three stars`;
  $('win').hidden = false;
  $('win-help').innerHTML = '';
  Art.confetti();
  $('to-ch').hidden = !chPlay;
  if (chPlay) { chPlay.won(moves, s); return; }
  if (watching) {
    // Just a replay: nothing is saved.
    watching = false;
    $('win-text').textContent = `That’s how ${answer.name} did it — ${moves} moves. Your turn!`;
    $('win-best').innerHTML = '';
    $('next').hidden = true;
    return;
  }
  progress.stars[idx] = Math.max(starsOf(idx), s);
  progress.moves[idx] = Math.min(progress.moves[idx] || Infinity, moves);
  saveProgress();
  if (window.Online) window.Online.putSave(progress).catch(e => console.warn(e));
  winBoard(idx, moves);
  $('next').hidden = idx >= LEVELS.length - 1;
  if (helpCtx && typeof Social !== 'undefined') Social.sendSolution(helpCtx, sol.slice());
}

// ── Online: nickname and leaderboards (js/online.js sets window.Online) ────
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
let askedName = false;
try { askedName = localStorage.getItem('unblock_asked_name') === '1'; } catch (e) {}

function meChip() {
  const on = window.Online;
  $('me-chip').hidden = !on;
  if (on) $('me-chip').textContent = (on.name ? `👤 ${on.name}` : '👤 Pick a nickname') + (on.account ? ' ✓' : ' · guest');
}

let nameDone = null;
function askName(then) {
  nameDone = then || null;
  $('name-input').value = (window.Online && window.Online.name) || '';
  $('name-err').textContent = '';
  $('name-modal').hidden = false;
  setTimeout(() => $('name-input').focus(), 50);
}
$('name-form').addEventListener('submit', async e => {
  e.preventDefault();
  if (!window.Online) return;
  $('name-save').disabled = true;
  $('name-err').textContent = '';
  try {
    await window.Online.setName($('name-input').value, totals());
    $('name-modal').hidden = true;
    meChip();
    if (nameDone) nameDone();
  } catch (err) {
    $('name-err').textContent = err.code === 'permission-denied' ? 'The leaderboard isn’t set up yet — try again later.' : (err.message || 'Couldn’t save — check your connection.');
  }
  $('name-save').disabled = false;
});
$('name-cancel').addEventListener('click', () => { $('name-modal').hidden = true; });
$('me-chip').addEventListener('click', () => Social.account());

// Win card: this level's best three, and an invitation to join the leaderboard.
async function winBoard(level, m) {
  const box = $('win-best');
  box.innerHTML = '';
  const on = window.Online;
  if (!on) return;
  if (!on.name) {
    if (askedName) return;
    const b = document.createElement('button');
    b.className = 'ghost join'; b.textContent = '🏆 Put me on the leaderboard';
    b.addEventListener('click', () => askName(() => winBoard(level, m)));
    box.appendChild(b);
    askedName = true;
    try { localStorage.setItem('unblock_asked_name', '1'); } catch (e) {}
    return;
  }
  try {
    await on.submit(level, m, totals());
    const best = await on.levelTop(level, 3);
    if (!best.length) return;
    box.innerHTML = '<h4>Best on this level</h4>' + best.map((r, i) =>
      `<div class="row${r.mine ? ' mine' : ''}"><span>${['🥇', '🥈', '🥉'][i]} ${esc(r.name)}</span><b>${r.moves} moves</b></div>`).join('');
  } catch (e) { console.warn(e); }
}

let rankTab = 'players';
document.querySelectorAll('#rank-tabs button').forEach(b => b.addEventListener('click', () => {
  rankTab = b.dataset.tab;
  ranks();
}));
async function ranks() {
  show('ranks');
  document.querySelectorAll('#rank-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === rankTab));
  if (rankTab === 'teams') return Social.rankTeams();
  if (rankTab === 'friends') return Social.rankFriends();
  const list = $('rank-list'), meBox = $('rank-me');
  const on = window.Online;
  list.innerHTML = ''; meBox.innerHTML = '';
  meBox.innerHTML = '<p class="note">Loading…</p>';
  if (!on || !(await on.ready)) { meBox.innerHTML = '<p class="note">The leaderboard needs an internet connection.</p>'; return; }
  try {
    if (on.name) await on.submit(null, 0, totals());
    const [rows, rank] = await Promise.all([on.top(50), on.myRank()]);
    meBox.innerHTML = on.name
      ? `<div class="me-card"><span>You’re <b>#${rank}</b> as <b>${esc(on.name)}</b></span><span>★ ${totals().stars}</span></div>`
      : '<button class="big" id="rank-join">Pick a nickname to join</button>';
    if (!on.name) $('rank-join').addEventListener('click', () => askName(ranks));
    list.innerHTML = rows.length ? rows.map((r, i) =>
      `<li class="${r.mine ? 'mine' : 'tap'}" data-uid="${esc(r.uid)}" data-name="${esc(r.name)}"><span class="pos">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span><span class="who">${esc(r.name)}</span><span class="st">★ ${r.stars}</span><span class="mv">${r.moves} moves</span></li>`).join('')
      : '<p class="note">No one yet — be the first!</p>';
    // Tap someone to add them as a friend.
    list.querySelectorAll('li.tap').forEach(li => li.addEventListener('click', () => Social.offerFriend(li.dataset.uid, li.dataset.name)));
  } catch (e) {
    console.warn(e);
    meBox.innerHTML = `<p class="note">${e.code === 'permission-denied' ? 'The leaderboard isn’t set up yet.' : 'Couldn’t load the leaderboard — check your connection.'}<br><button class="ghost small" id="rank-retry">Try again</button></p>`;
    $('rank-retry').addEventListener('click', ranks);
  }
}
$('to-board').addEventListener('click', ranks);
$('ranks-back').addEventListener('click', home);
// Progress lives on this device and in the account's private save; merge both ways (best of each).
async function syncProgress() {
  const on = window.Online;
  if (!on || !(await on.ready)) return;
  try {
    const s = await on.getSave();
    const cs = s.stars || {}, cm = s.moves || {};
    for (const k of Object.keys(cs)) if (cs[k] > starsOf(k)) progress.stars[k] = cs[k];
    for (const k of Object.keys(cm)) if (!(progress.moves[k] <= cm[k])) progress.moves[k] = cm[k];
    saveProgress();
    const behind = Object.keys(progress.stars).some(k => !(cs[k] >= progress.stars[k])) || Object.keys(progress.moves).some(k => !(cm[k] <= progress.moves[k]));
    if (behind) await on.putSave(progress);
    if (on.name) on.submit(null, 0, totals()).catch(() => {});
    if (!$('home').hidden) home();
  } catch (e) { console.warn(e); }
}
window.addEventListener('online-ready', () => {
  window.Online.ready.then(ok => { meChip(); if (ok) syncProgress(); });
});
// Signed in or out: a different account now.
window.addEventListener('online-user', () => { meChip(); syncProgress(); hintButton(); });

// ── Sharing a level: a link that opens it for anyone, even if they haven't got that far ──
$('ask-friend').addEventListener('click', () => Social.askHelp(idx));
// A plain link to the level (when there's no nickname / no connection for a proper request).
async function shareLevel(i, helpId) {
  const n = i + 1, url = `${Native.webBase()}?level=${n}${helpId ? '&help=' + helpId : ''}`;
  const text = `Can you solve Level ${n} in Happy Blocks? Par is ${LEVELS[i].par} moves — I'm stuck!`;
  if (navigator.share) { try { await navigator.share({ title: `Happy Blocks — Level ${n}`, text, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
  try { await navigator.clipboard.writeText(`${text} ${url}`); $('hint').textContent = 'Link copied — paste it to your friends.'; }
  catch (e) { ask('Copy this link and send it to your friends:', { input: url, copy: true, cancel: false, ok: 'Done' }); }
}
function openLevelLink() {
  const q = new URLSearchParams(location.search), h = location.hash.match(/^#level=(\d{1,3})$/);
  const n = q.get('level') || (h && h[1]), help = q.get('help');
  if (!n || !/^\d{1,3}$/.test(n)) return;
  q.delete('level'); q.delete('help');
  window.history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + (h ? '' : location.hash));
  const i = +n - 1;
  if (i < 0 || i >= LEVELS.length) return;
  start(i);
  // From a help request: once online, it becomes "helping <friend>".
  if (help && /^[A-Z0-9]{12}$/.test(help)) pendingHelp = { id: help, level: i };
}
let pendingHelp = null;
window.addEventListener('hashchange', openLevelLink);

// App update downloaded: offer it on the home screen or level list, never in the middle of a level.
var updReady = false;
function updBanner() { $('upd-banner').hidden = !updReady || !(!$('home').hidden || !$('levels').hidden); }
window.addEventListener('update-ready', () => { updReady = true; updBanner(); });
$('upd-banner').addEventListener('click', () => { $('upd-banner').textContent = 'Updating…'; Native.applyUpdate(); });

// ── Buttons ──────────────────────────────────────────────────
$('play').addEventListener('click', () => { Sound.unlock(); start(firstOpen()); });
$('to-levels').addEventListener('click', levelList);
$('levels-back').addEventListener('click', home);
$('game-back').addEventListener('click', () => chPlay ? chPlay.back() : levelList());
// ── In-game dialogs (instead of the browser's alert / confirm / prompt) ──
// ask('Add Bearfi as a friend?', { ok: 'Add friend' }) → true / false
// ask('New team name', { input: 'Old name' }) → the text, or null
// ask('Copy this link', { input: url, copy: true, cancel: false }) → shows the link ready to copy
function ask(text, o = {}) {
  return new Promise(done => {
    const inp = $('ask-input');
    $('ask-title').hidden = !o.title; $('ask-title').textContent = o.title || '';
    $('ask-text').textContent = text;
    inp.hidden = o.input == null; inp.value = o.input ?? ''; inp.readOnly = !!o.copy;
    $('ask-yes').textContent = o.ok || 'OK';
    $('ask-yes').classList.toggle('danger', !!o.danger);
    $('ask-no').hidden = o.cancel === false; $('ask-no').textContent = o.cancel || 'Cancel';
    $('ask').hidden = false;
    if (o.input != null) setTimeout(() => { inp.focus(); inp.select(); }, 60);
    const finish = v => { $('ask').hidden = true; $('ask-form').onsubmit = $('ask-no').onclick = null; done(v); };
    $('ask-form').onsubmit = e => { e.preventDefault(); finish(o.input != null && !o.copy ? inp.value : true); };
    $('ask-no').onclick = () => finish(o.input != null && !o.copy ? null : false);
  });
}

// ── Time challenge levels (level.time seconds; the clock starts with the first move) ──
let lvTimer = null;
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function stopClock() { clearInterval(lvTimer); lvTimer = null; $('clock').classList.remove('hurry'); }
function lvClock() {
  stopClock();
  if (chPlay) return;
  const t = level && level.time && !watching;
  $('clock').hidden = !t;
  if (t) $('clock').textContent = `⏱ ${mmss(level.time)} · starts with your first move`;
}
function startClock() {
  if (chPlay || lvTimer || !level.time || watching || moves) return;
  const end = Date.now() + level.time * 1000;
  const tick = () => {
    const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
    $('clock').textContent = `⏱ ${mmss(left)}`;
    $('clock').classList.toggle('hurry', left <= 15);
    if (left > 0) return;
    stopClock();
    busy = true;
    Sound.bump();
    ask('⏰ Time’s up! Want another go?', { title: 'Too slow!', ok: 'Try again', cancel: 'Levels' })
      .then(again => { busy = false; again ? start(idx) : levelList(); });
  };
  lvTimer = setInterval(tick, 250);
  tick();
}

// ── Settings (from home and from a level) ───────────────────
function settings() {
  $('set-sound').textContent = Sound.on ? '🔊 Sound: on' : '🔇 Sound: off';
  $('set-buzz').textContent = Native.buzzOn() ? '📳 Vibration: on' : '📴 Vibration: off';
  $('settings').hidden = false;
}
$('settings-home').addEventListener('click', () => { Sound.unlock(); settings(); });
$('settings-game').addEventListener('click', () => { Sound.unlock(); settings(); });
$('set-sound').addEventListener('click', () => { Sound.toggle(); settings(); });
$('set-buzz').addEventListener('click', () => { Native.setBuzz(!Native.buzzOn()); Native.buzz(); settings(); });
$('set-tips').addEventListener('click', () => { Intro.reset(); $('set-tips').textContent = '✓ You’ll see them again'; });
$('settings-done').addEventListener('click', () => { $('settings').hidden = true; $('set-tips').textContent = '💡 Show the “New!” tips again'; });
$('undo').addEventListener('click', () => {
  if (busy || !history.length) return;
  const h = history.pop();
  sol.length = h.n ?? sol.length;
  st = h.st; moves = h.moves;
  render();
});
// Again keeps a friend's solution / help request loaded.
const again = () => chPlay ? chPlay.again() : start(idx, { answer, help: helpCtx });
$('restart').addEventListener('click', () => !busy && again());
$('next').addEventListener('click', () => chPlay ? chPlay.next() : start(idx + 1));
$('replay').addEventListener('click', again);
$('to-ch').addEventListener('click', () => chPlay && chPlay.back());
window.addEventListener('resize', () => { if (!$('game').hidden) { layout(); render(); } });

Art.defs();
home();
openLevelLink();
// Offline cache for the web version; the apps carry their files already (and a cache could go stale).
if ('serviceWorker' in navigator && !Native.app) navigator.serviceWorker.register('sw.js').catch(() => {});
