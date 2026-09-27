// Unblock It — screens, board drawing, dragging, exits, stars and saved progress.
const $ = id => document.getElementById(id);
const clone = o => JSON.parse(JSON.stringify(o));

const COLORS = {
  red: '#ff5a4e', blue: '#3d7bff', yellow: '#ffc933', green: '#2fcf6f',
  purple: '#a45cff', orange: '#ff8a2b', pink: '#ff5fb2', sky: '#3fd0ff',
};
const ARROW = { L: '◀', R: '▶', T: '▲', B: '▼' };
const INTRO = {
  walls: 'New: walls. Blocks can’t pass them.',
  ice: 'New: ice. It melts a step each time a block leaves.',
  frozen: 'New: frozen doors. They open after that many blocks leave.',
  layered: 'New: layered blocks. The outside leaves, the core stays behind.',
};

// ── Progress ─────────────────────────────────────────────────
const SAVE = 'unblock_progress_v1';
let progress = { stars: {} };
try { progress = { stars: {}, ...JSON.parse(localStorage.getItem(SAVE) || '{}') }; } catch (e) {}
const saveProgress = () => { try { localStorage.setItem(SAVE, JSON.stringify(progress)); } catch (e) {} };
const starsOf = i => progress.stars[i] || 0;
const unlocked = i => i === 0 || starsOf(i - 1) > 0 || starsOf(i) > 0;
const firstOpen = () => { const i = LEVELS.findIndex((_, k) => !starsOf(k)); return i < 0 ? LEVELS.length - 1 : i; };

// ── Screens ──────────────────────────────────────────────────
function show(id) { ['home', 'levels', 'game'].forEach(s => $(s).hidden = s !== id); }
function home() {
  const total = Object.values(progress.stars).reduce((a, b) => a + b, 0);
  $('stars-total').textContent = total ? `★ ${total} / ${LEVELS.length * 3}` : '';
  $('play').textContent = total ? 'Continue' : 'Play';
  $('sound').textContent = Sound.on ? '🔊 Sound on' : '🔇 Sound off';
  show('home');
}
function levelList() {
  const g = $('level-grid');
  g.innerHTML = '';
  const next = firstOpen();
  LEVELS.forEach((_, i) => {
    const b = document.createElement('button');
    b.className = 'lvl' + (unlocked(i) ? '' : ' locked') + (i === next && !starsOf(i) ? ' next' : '');
    b.innerHTML = `${i + 1}<small>${'★'.repeat(starsOf(i)) || (unlocked(i) ? '' : '🔒')}</small>`;
    b.addEventListener('click', () => unlocked(i) && start(i));
    g.appendChild(b);
  });
  show('levels');
}

// ── Game state ───────────────────────────────────────────────
let idx = 0, level = null, st = null, moves = 0, history = [], busy = false;
let cs = 48, gut = 24;

function start(i) {
  idx = i;
  level = clone(LEVELS[i]);
  st = { pieces: clone(level.pieces), gates: clone(level.gates) };
  moves = 0; history = []; busy = false;
  $('level-name').textContent = `Level ${i + 1}`;
  $('hint').textContent = i === 0 ? 'Drag each block out through the door of its colour.' : INTRO[level.intro] || '';
  $('win').hidden = true;
  show('game');
  layout();
  render();
}

function status() { $('moves').textContent = `${moves} move${moves === 1 ? '' : 's'} · par ${level.par}`; }

function layout() {
  const aw = Math.min(window.innerWidth, 560) - 24, ah = window.innerHeight - 150;
  cs = Math.floor(Math.min(aw / (level.W + 1), ah / (level.H + 1), 72));
  gut = Math.round(cs * 0.5);
}

const px = (r, c) => [gut + c * cs, gut + r * cs];
const el = (cls, css) => { const d = document.createElement('div'); d.className = cls; Object.assign(d.style, css || {}); return d; };

function doorBox(gt) {
  const along = gut + gt.start * cs + 3, len = gt.len * cs - 6, t = gut - 8;
  if (gt.side === 'L') return { left: '4px', top: along + 'px', width: t + 'px', height: len + 'px' };
  if (gt.side === 'R') return { left: (gut + level.W * cs + 4) + 'px', top: along + 'px', width: t + 'px', height: len + 'px' };
  if (gt.side === 'T') return { top: '4px', left: along + 'px', height: t + 'px', width: len + 'px' };
  return { top: (gut + level.H * cs + 4) + 'px', left: along + 'px', height: t + 'px', width: len + 'px' };
}

function blockEl(p) {
  const d = el('block', { width: p.w * cs + 'px', height: p.h * cs + 'px' });
  d.dataset.id = p.id;
  const offs = Engine.cellsOf(p, 0, 0);
  const has = new Set(offs.map(([r, c]) => r + ',' + c));
  const pad = 3;
  for (const [r, c] of offs) {
    const open = (dr, dc) => !has.has((r + dr) + ',' + (c + dc));
    const T = open(-1, 0) ? pad : 0, B = open(1, 0) ? pad : 0, L = open(0, -1) ? pad : 0, R = open(0, 1) ? pad : 0;
    const t = el('tile', {
      left: c * cs + L + 'px', top: r * cs + T + 'px', width: cs - L - R + 'px', height: cs - T - B + 'px',
      background: COLORS[p.color],
      borderRadius: [T && L, T && R, B && R, B && L].map(v => v ? '10px' : '2px').join(' '),
    });
    if (offs.length > 1) t.style.boxShadow = `inset 0 ${B ? -5 : 0}px 0 rgba(0,0,0,0.22), inset 0 ${T ? 4 : 0}px 0 rgba(255,255,255,0.32)`;
    if (p.inner) {
      const k = Math.round(cs * 0.26);
      t.appendChild(el('core', { left: k - L + 'px', top: k - T + 'px', right: k - R + 'px', bottom: k - B + 'px', background: COLORS[p.inner] }));
    }
    if (p.ice) t.appendChild(el('ice'));
    d.appendChild(t);
  }
  if (p.ice) {
    // The count sits on the cell nearest the block's middle.
    const mr = offs.reduce((a, q) => a + q[0], 0) / offs.length, mc = offs.reduce((a, q) => a + q[1], 0) / offs.length;
    const whole = !p.shape;
    const [lr, lc] = whole ? [mr, mc] : offs.reduce((b, q) => Math.hypot(q[0] - mr, q[1] - mc) < Math.hypot(b[0] - mr, b[1] - mc) ? q : b);
    const n = el('ice-num', { left: lc * cs + 'px', top: lr * cs + 'px', width: cs + 'px', height: cs + 'px', fontSize: Math.round(cs * 0.36) + 'px' });
    n.textContent = '❄' + p.ice;
    d.appendChild(n);
  }
  place(d, p.r, p.c);
  return d;
}
function place(d, r, c) { const [x, y] = px(r, c); d.style.transform = `translate(${x}px, ${y}px)`; }

function render() {
  const b = $('board');
  b.innerHTML = '';
  b.style.width = level.W * cs + 2 * gut + 'px';
  b.style.height = level.H * cs + 2 * gut + 'px';
  const walls = new Set((level.walls || []).map(([r, c]) => r + ',' + c));
  for (let r = 0; r < level.H; r++) for (let c = 0; c < level.W; c++) {
    const [x, y] = px(r, c);
    b.appendChild(el(walls.has(r + ',' + c) ? 'wall' : 'cell', { left: x + 2 + 'px', top: y + 2 + 'px', width: cs - 4 + 'px', height: cs - 4 + 'px' }));
  }
  for (const gt of st.gates) {
    const d = el('door' + (gt.frozen ? ' frozen' : ''), { ...doorBox(gt), background: COLORS[gt.color] });
    d.dataset.gate = gt.id;
    d.textContent = gt.frozen ? String(gt.frozen) : ARROW[gt.side];
    d.style.fontSize = Math.max(10, Math.round(gut * 0.62)) + 'px';
    // Frozen: ice over the door, its colour showing faintly through.
    if (gt.frozen) d.style.background = `linear-gradient(135deg, rgba(236,249,255,0.9), rgba(176,224,255,0.78)), ${COLORS[gt.color]}`;
    b.appendChild(d);
  }
  for (const p of st.pieces) b.appendChild(blockEl(p));
  status();
}

// ── Dragging ─────────────────────────────────────────────────
let drag = null;

// The exit a block at (r, c) could leave through now, or null. Only exits on `side` if given.
function exitFor(p, r, c, side) {
  const g = Engine.grid(level, st.pieces);
  const cells = Engine.cellsOf(p, r, c);
  for (const gt of st.gates) {
    if (gt.frozen || gt.color !== p.color || (side && gt.side !== side)) continue;
    const lane = Engine.laneOf(level, gt, cells);
    if (lane && lane.every(([y, x]) => { const v = g[y * level.W + x]; return v === -1 || v === p.id; })) return { gt, lane };
  }
  return null;
}

$('board').addEventListener('pointerdown', e => {
  if (busy || drag) return;
  Sound.unlock();
  const d = e.target.closest('.block');
  if (!d) return;
  const p = st.pieces.find(x => x.id === +d.dataset.id);
  if (p.ice) { d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); Sound.bump(); return; }
  drag = { p, d, x0: e.clientX, y0: e.clientY, r0: p.r, c0: p.c, r: p.r, c: p.c, g: Engine.grid(level, st.pieces) };
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
    if (Math.abs(dr) >= 0.5) steps.push([Math.sign(dr), 0, Math.abs(dr)]);
    if (Math.abs(dc) >= 0.5) steps.push([0, Math.sign(dc), Math.abs(dc)]);
    steps.sort((a, b) => b[2] - a[2]);
    const ok = steps.find(([sr, sc]) => Engine.fits(level, drag.g, p, drag.r + sr, drag.c + sc));
    if (!ok) break;
    drag.r += ok[0]; drag.c += ok[1];
    Sound.tick();
  }
  // Pushed past the board edge through a door of its colour: out it goes.
  const cells = Engine.cellsOf(p, 0, 0);
  const minR = Math.min(...cells.map(q => q[0])), maxR = Math.max(...cells.map(q => q[0]));
  const minC = Math.min(...cells.map(q => q[1])), maxC = Math.max(...cells.map(q => q[1]));
  const push = tc + minC < -0.45 ? 'L' : tc + maxC > level.W - 0.55 ? 'R' : tr + minR < -0.45 ? 'T' : tr + maxR > level.H - 0.55 ? 'B' : null;
  if (push) {
    const out = exitFor(p, drag.r, drag.c, push);
    if (out) { finishDrag(out); return; }
  }
  // Follow the finger a little past the snapped cell, for feel.
  const fr = Math.max(-0.25, Math.min(0.25, tr - drag.r)), fc = Math.max(-0.25, Math.min(0.25, tc - drag.c));
  const fits = (sr, sc) => Engine.fits(level, drag.g, p, drag.r + sr, drag.c + sc);
  const [x, y] = px(drag.r + (fits(Math.sign(fr), 0) ? fr : 0), drag.c + (fits(0, Math.sign(fc)) ? fc : 0));
  d.style.transform = `translate(${x}px, ${y}px)`;
});

const endDrag = () => {
  if (!drag) return;
  // Dropped touching a door of its colour: it leaves too.
  const out = exitFor(drag.p, drag.r, drag.c);
  finishDrag(out && out.lane.length === 0 ? out : null);
};
$('board').addEventListener('pointerup', endDrag);
$('board').addEventListener('pointercancel', endDrag);

function finishDrag(out) {
  const { p, d, r0, c0, r, c } = drag;
  drag = null;
  d.classList.remove('dragging');
  const movedAtAll = out || r !== r0 || c !== c0;
  if (!movedAtAll) { place(d, r0, c0); return; }
  history.push({ st: clone(st), moves });
  moves++;
  st.pieces = st.pieces.map(x => x.id === p.id ? { ...x, r, c } : x);
  if (!out) { place(d, r, c); status(); return; }
  leave(p.id, d, out.gt, r, c);
}

function leave(id, d, gt, r, c) {
  busy = true;
  Sound.exit();
  const p = st.pieces.find(x => x.id === id);
  const far = gt.side === 'L' ? [r, -p.w - 1] : gt.side === 'R' ? [r, level.W + 1] : gt.side === 'T' ? [-p.h - 1, c] : [level.H + 1, c];
  place(d, r, c);
  requestAnimationFrame(() => { d.classList.add('leaving'); place(d, ...far); });
  const door = document.querySelector(`[data-gate="${gt.id}"]`);
  if (door) { door.classList.remove('pulse'); void door.offsetWidth; door.classList.add('pulse'); }
  const before = st.gates.filter(g => g.frozen).length, iced = st.pieces.filter(q => q.ice).length;
  Engine.applyExit(level, st, id, r, c, gt);
  setTimeout(() => {
    busy = false;
    if (st.gates.filter(g => g.frozen).length < before || st.pieces.filter(q => q.ice).length < iced) Sound.thaw();
    render();
    if (!st.pieces.length) win();
  }, 280);
}

// ── Win ──────────────────────────────────────────────────────
function starsFor(m, par) { return m <= par ? 3 : m <= Math.ceil(par * 1.4) ? 2 : 1; }
function win() {
  const s = starsFor(moves, level.par);
  progress.stars[idx] = Math.max(starsOf(idx), s);
  saveProgress();
  Sound.win();
  $('win-stars').innerHTML = [1, 2, 3].map(k => `<span class="${k <= s ? '' : 'off'}">★</span>`).join('');
  $('win-text').textContent = s === 3 ? `${moves} moves — perfect!` : `${moves} moves · ${level.par} for three stars`;
  $('next').hidden = idx >= LEVELS.length - 1;
  $('win').hidden = false;
  confetti();
}
function confetti() {
  const cols = Object.values(COLORS);
  for (let i = 0; i < 40; i++) {
    const c = el('confetti', { left: Math.random() * 100 + 'vw', background: cols[i % cols.length], animationDuration: 1.2 + Math.random() * 1.2 + 's', animationDelay: Math.random() * 0.3 + 's' });
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3000);
  }
}

// ── Buttons ──────────────────────────────────────────────────
$('play').addEventListener('click', () => { Sound.unlock(); start(firstOpen()); });
$('to-levels').addEventListener('click', levelList);
$('levels-back').addEventListener('click', home);
$('game-back').addEventListener('click', levelList);
$('sound').addEventListener('click', () => { Sound.toggle(); home(); });
$('undo').addEventListener('click', () => {
  if (busy || !history.length) return;
  const h = history.pop();
  st = h.st; moves = h.moves;
  render();
});
$('restart').addEventListener('click', () => !busy && start(idx));
$('next').addEventListener('click', () => start(idx + 1));
$('replay').addEventListener('click', () => start(idx));
window.addEventListener('resize', () => { if (!$('game').hidden) { layout(); render(); } });

home();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
