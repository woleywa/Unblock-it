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
  fire: 'New: fire! Each water block you drag out sprays every fire once. Out fire, open road.',
};

// ── Progress ─────────────────────────────────────────────────
const SAVE = 'unblock_progress_v1';
let progress = { stars: {}, moves: {} };
try { progress = { stars: {}, moves: {}, ...JSON.parse(localStorage.getItem(SAVE) || '{}') }; } catch (e) {}
const saveProgress = () => { try { localStorage.setItem(SAVE, JSON.stringify(progress)); } catch (e) {} };
const starsOf = i => progress.stars[i] || 0;
const unlocked = i => i === 0 || starsOf(i - 1) > 0 || starsOf(i) > 0;
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
  // Leaving the board (e.g. an invite link opened mid-game) closes its cards and challenge play.
  if (id !== 'game') { $('win').hidden = true; $('timeup').hidden = true; chPlay = null; }
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
  $('stars-total').textContent = total ? `★ ${total} / ${LEVELS.length * 3}` : '';
  $('play').textContent = total ? 'Continue' : 'Play';
  $('sound').textContent = Sound.on ? '🔊 Sound on' : '🔇 Sound off';
  meChip();
  show('home');
}
const STAGES = [
  ['Warm-up', 'red'], ['Getting busy', 'orange'], ['Walls', 'purple'],
  ['On ice', 'sky'], ['Frosty doors', 'blue'], ['Layers', 'pink'], ['Fire', 'orange'],
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

function begin(lv, title, hint) {
  level = clone(lv);
  st = { pieces: clone(level.pieces), gates: clone(level.gates) };
  moves = 0; history = []; busy = false;
  $('level-name').textContent = title;
  $('hint').textContent = hint || '';
  $('win').hidden = true;
  $('clock').hidden = !chPlay;
  show('game');
  layout();
  render();
}
function start(i) {
  chPlay = null;
  idx = i;
  begin(LEVELS[i], `Level ${i + 1}`, i === 0 ? 'Drag each block out through the door of its colour.' : INTRO[LEVELS[i].intro]);
}

function status() { $('moves').textContent = `${moves} move${moves === 1 ? '' : 's'} · par ${level.par}`; }

function layout() {
  const aw = Math.min(window.innerWidth, 560) - 24, ah = window.innerHeight - (chPlay ? 190 : 150);
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
  for (let r = 0; r < level.H; r++) for (let c = 0; c < level.W; c++) {
    const [x, y] = px(r, c);
    b.appendChild(el(walls.has(r + ',' + c) ? 'wall' : 'cell', { left: x + 3 + 'px', top: y + 3 + 'px', width: cs - 6 + 'px', height: cs - 6 + 'px', borderRadius: Math.round(cs * 0.2) + 'px' }));
  }
  for (const gt of st.gates) b.appendChild(Art.door(gt, doorBox(gt), gut));
  for (const p of st.pieces) b.appendChild(p.fire ? fireEl(p) : blockEl(p));
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
  // Glide with the finger between cells wherever there's room (the snapped cell moves on at half a
  // cell); against something, give just a little, like pressing on jelly.
  const fits = (sr, sc) => Engine.fits(level, drag.g, p, drag.r + sr, drag.c + sc);
  const give = v => Math.sign(v) * Math.min(0.05, Math.abs(v) * 0.2);
  const lean = (v, free) => free ? Math.max(-0.49, Math.min(0.49, v)) : give(v);
  const dr = tr - drag.r, dc = tc - drag.c;
  let fr = lean(dr, Math.abs(dr) > 0.01 && fits(Math.sign(dr), 0)), fc = lean(dc, Math.abs(dc) > 0.01 && fits(0, Math.sign(dc)));
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
  });
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
  const { p, d, r0, c0, r, c, raf } = drag;
  if (raf) cancelAnimationFrame(raf);
  drag = null;
  d.classList.remove('dragging');
  const movedAtAll = out || r !== r0 || c !== c0;
  if (!movedAtAll) { place(d, r0, c0); settle(d); return; }
  history.push({ st: clone(st), moves });
  moves++;
  st.pieces = st.pieces.map(x => x.id === p.id ? { ...x, r, c } : x);
  if (!out) { place(d, r, c); settle(d); status(); return; }
  leave(p.id, d, out.gt, r, c);
}

function settle(d) { d.classList.remove('settle'); void d.offsetWidth; d.classList.add('settle'); }

function leave(id, d, gt, r, c) {
  busy = true;
  Sound.exit();
  const p = st.pieces.find(x => x.id === id);
  const far = gt.side === 'L' ? [r, -p.w - 1] : gt.side === 'R' ? [r, level.W + 1] : gt.side === 'T' ? [-p.h - 1, c] : [level.H + 1, c];
  place(d, r, c);
  requestAnimationFrame(() => { d.classList.add('leaving'); place(d, ...far); });
  const door = document.querySelector(`[data-gate="${gt.id}"]`);
  if (door) {
    door.classList.remove('pulse'); void door.offsetWidth; door.classList.add('pulse');
    const dir = { L: [-1, 0], R: [1, 0], T: [0, -1], B: [0, 1] }[gt.side];
    Art.burst($('board'), door.offsetLeft + door.offsetWidth / 2, door.offsetTop + door.offsetHeight / 2, p.color, dir);
  }
  if (navigator.vibrate) navigator.vibrate(12);
  const before = st.gates.filter(g => g.frozen).length, iced = st.pieces.filter(q => q.ice).length;
  const icedIds = st.pieces.filter(q => q.ice).map(q => q.id);
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
  }, fires.length ? 560 : 280);
}

// ── Win ──────────────────────────────────────────────────────
function starsFor(m, par) { return m <= par ? 3 : m <= Math.ceil(par * 1.4) ? 2 : 1; }
function win() {
  const s = starsFor(moves, level.par);
  Sound.win();
  $('win-stars').innerHTML = [1, 2, 3].map(k => `<span class="star ${k <= s ? 'on' : 'off'}" style="--k:${k}"><svg viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.8-4.9 4.5 1.3 6.5L12 17l-5.9 3.3 1.3-6.5L2.5 9.3l6.6-.8z"/></svg></span>`).join('');
  $('win-text').textContent = s === 3 ? `${moves} moves — perfect!` : `${moves} moves · ${level.par} for three stars`;
  $('win').hidden = false;
  Art.confetti();
  $('to-ch').hidden = !chPlay;
  if (chPlay) { chPlay.won(moves, s); return; }
  progress.stars[idx] = Math.max(starsOf(idx), s);
  progress.moves[idx] = Math.min(progress.moves[idx] || Infinity, moves);
  saveProgress();
  if (window.Online) window.Online.putSave(progress).catch(e => console.warn(e));
  winBoard(idx, moves);
  $('next').hidden = idx >= LEVELS.length - 1;
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
window.addEventListener('online-user', () => { meChip(); syncProgress(); });

// ── Buttons ──────────────────────────────────────────────────
$('play').addEventListener('click', () => { Sound.unlock(); start(firstOpen()); });
$('to-levels').addEventListener('click', levelList);
$('levels-back').addEventListener('click', home);
$('game-back').addEventListener('click', () => chPlay ? chPlay.back() : levelList());
$('sound').addEventListener('click', () => { Sound.toggle(); home(); });
$('undo').addEventListener('click', () => {
  if (busy || !history.length) return;
  const h = history.pop();
  st = h.st; moves = h.moves;
  render();
});
const again = () => chPlay ? chPlay.again() : start(idx);
$('restart').addEventListener('click', () => !busy && again());
$('next').addEventListener('click', () => chPlay ? chPlay.next() : start(idx + 1));
$('replay').addEventListener('click', again);
$('to-ch').addEventListener('click', () => chPlay && chPlay.back());
window.addEventListener('resize', () => { if (!$('game').hidden) { layout(); render(); } });

Art.defs();
home();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
