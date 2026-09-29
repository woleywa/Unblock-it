// Happy Blocks — things that bring you back: the daily puzzle and its 🔥 streak.
// Uses game.js globals: $, begin, show, home, starsFor, chPlay, ask, Sound, Art.
// Everything here lives in one small "meta" record (localStorage, synced to the account's save).
const Extras = (() => {
  const KEY = 'unblock_meta';
  let meta = {};
  try { meta = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) {}
  meta.daily = meta.daily || {};                 // { dayNumber: { s: stars, m: moves } }
  meta.streak = meta.streak || { n: 0, last: 0, best: 0, freeze: 0 }; // freeze = week the freeze was used
  const persist = () => {
    try { localStorage.setItem(KEY, JSON.stringify(meta)); } catch (e) {}
    if (window.Online && window.Online.putSave) window.Online.putSave(progress).catch(() => {});
  };

  // ── Days: #1 is 29 Sep 2026; the day turns over at local midnight ──
  const EPOCH = new Date(2026, 8, 29);
  const today = () => { const n = new Date(); return Math.round((new Date(n.getFullYear(), n.getMonth(), n.getDate()) - EPOCH) / 86400000) + 1; };
  const week = d => Math.floor((d - 1) / 7);
  // Everyone gets the same board on the same day, from the challenge pool (every board once before repeats).
  const dailyLevel = d => CHALLENGE_LEVELS[((d - 1) * 53 % CHALLENGE_LEVELS.length + CHALLENGE_LEVELS.length) % CHALLENGE_LEVELS.length];

  // The streak as it stands today: still alive if the last solve was yesterday (or the day before,
  // when this week's freeze is unused).
  function streakNow() {
    const s = meta.streak, d = today();
    if (s.last === d || s.last === d - 1) return s.n;
    if (s.last === d - 2 && s.freeze !== week(d)) return s.n;
    return 0;
  }

  function play() {
    const d = today();
    begin(dailyLevel(d), `Daily #${d}`, meta.daily[d] ? `Solved today with ${meta.daily[d].m} moves — can you do better?` : '📅 Today’s puzzle — the same board for everyone.');
    chPlay = {
      daily: true,
      again: play,
      back: () => { chPlay = null; $('win').hidden = true; home(); },
      next: () => share(d),
      won: (m, s) => won(d, m, s),
    };
    $('clock').hidden = true;
    $('next').textContent = '📤 Share result';
    $('to-ch').textContent = 'Home';
  }

  function won(d, m, s) {
    const first = !meta.daily[d];
    const best = meta.daily[d];
    if (!best || s > best.s || (s === best.s && m < best.m)) meta.daily[d] = { s, m };
    let note = '';
    if (first) {
      const st = meta.streak;
      if (st.last === d - 1) st.n++;
      else if (st.last === d - 2 && st.freeze !== week(d)) { st.n++; st.freeze = week(d); note = ' ❄ Your weekly streak freeze saved it!'; }
      else if (st.last !== d) st.n = 1;
      st.last = d;
      st.best = Math.max(st.best || 0, st.n);
    }
    // Only the last 60 days are kept.
    for (const k of Object.keys(meta.daily)) if (+k < d - 60) delete meta.daily[k];
    persist();
    const n = streakNow();
    $('win-text').textContent = `${m} moves · par ${level.par}`;
    $('win-best').innerHTML = `<div class="streak-big"><b>🔥 ${n}</b><span>day streak${n === 1 ? '' : ' — keep it going tomorrow!'}</span></div>${note ? `<p class="note">${note}</p>` : ''}`;
    $('next').hidden = false;
    $('to-ch').hidden = false;
    $('next').className = 'big'; $('replay').className = 'ghost'; $('replay').textContent = 'Play again'; $('next').style.order = $('to-ch').style.order = '';
  }

  async function share(d) {
    const r = meta.daily[d] || { s: 0, m: 0 };
    const text = `Happy Blocks daily #${d} ${'⭐'.repeat(r.s)}${'☆'.repeat(3 - r.s)} ${r.m} moves 🔥${streakNow()}`;
    const url = Native.webBase() + '?daily';
    if (navigator.share) { try { await navigator.share({ text, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(`${text} ${url}`); ask('Copied! Paste it to your friends.', { cancel: false }); }
    catch (e) { ask('Copy this and send it to your friends:', { input: `${text} ${url}`, copy: true, cancel: false, ok: 'Done' }); }
  }

  // The home screen button: today's number, the streak, and a tick once it's done.
  function homeButton() {
    chestButton();
    const d = today(), done = meta.daily[d], n = streakNow();
    const b = $('to-daily');
    if (!b) return;
    b.innerHTML = `${done ? '✅' : '📅'} Daily${n ? ` <span class="flame">🔥${n}</span>` : ''}`;
    b.classList.toggle('todo', !done);
  }

  // Merge what the account has (another device) with what's here: best result per day, longest streak.
  function merge(m) {
    if (!m || typeof m !== 'object') return false;
    let changed = false, mine = false;
    for (const [k, v] of Object.entries(m.daily || {})) {
      const a = meta.daily[k];
      if (!a || v.s > a.s || (v.s === a.s && v.m < a.m)) { meta.daily[k] = v; changed = true; }
    }
    for (const k of Object.keys(meta.daily)) if (!(m.daily || {})[k]) mine = true;
    const s = m.streak;
    if (s && (s.last > meta.streak.last || (s.last === meta.streak.last && s.n > meta.streak.n))) { meta.streak = { ...s, best: Math.max(s.best || 0, meta.streak.best || 0) }; changed = true; }
    else if (!s || s.last < meta.streak.last) mine = true;
    if ((m.chests || 0) > meta.chests) { meta.chests = m.chests; changed = true; } else if ((m.chests || 0) < meta.chests) mine = true;
    if (m.style && !meta.style.skin && !meta.style.sky && (m.style.skin || m.style.sky)) { meta.style = m.style; changed = true; applyStyle(); }
    if (changed) { try { localStorage.setItem(KEY, JSON.stringify(meta)); } catch (e) {} homeButton(); }
    return mine;
  }

  // ── Star chests: every 30 stars opens one, with the next style in line ──
  const EVERY = 30;
  const REWARDS = [
    { id: 'sunset', kind: 'sky', name: 'Sunset sky', sw: 'linear-gradient(180deg,#ff8a5c,#b8386e 55%,#2a0f33)' },
    { id: 'cat', kind: 'skin', name: 'Cat ears' },
    { id: 'ocean', kind: 'sky', name: 'Ocean sky', sw: 'linear-gradient(180deg,#2fd0e0,#1a5f9e 55%,#071a33)' },
    { id: 'shades', kind: 'skin', name: 'Cool shades' },
    { id: 'candy', kind: 'skin', name: 'Candy stripes' },
    { id: 'space', kind: 'sky', name: 'Space', sw: 'radial-gradient(2px 2px at 30% 30%,#fff,transparent),radial-gradient(1.5px 1.5px at 70% 60%,#fff,transparent),linear-gradient(180deg,#2a1a5e,#0d0826 55%,#03020a)' },
    { id: 'sparkle', kind: 'skin', name: 'Sparkles' },
    { id: 'forest', kind: 'sky', name: 'Forest sky', sw: 'linear-gradient(180deg,#5fd18a,#1e6b45 55%,#081d12)' },
  ];
  meta.chests = meta.chests || 0;               // how many chests have been opened
  meta.style = meta.style || { skin: '', sky: '' };
  const stars = () => Object.values(progress.stars).reduce((a, b) => a + b, 0);
  const waiting = () => Math.max(0, Math.min(REWARDS.length, Math.floor(stars() / EVERY)) - meta.chests);
  const owned = id => REWARDS.findIndex(r => r.id === id) < meta.chests;

  function applyStyle() {
    window.SKIN = meta.style.skin || '';
    const h = document.documentElement;
    [...h.classList].filter(c => c.startsWith('sky-')).forEach(c => h.classList.remove(c));
    if (meta.style.sky) h.classList.add('sky-' + meta.style.sky);
  }
  const preview = (r, size = 64) => r.kind === 'sky'
    ? `<div class="swatch" style="background:${r.sw}"></div>`
    : (() => { const was = window.SKIN; window.SKIN = r.id; const svg = Art.blockSVG({ color: 'pink', r: 0, c: 0, h: 1, w: 1 }, size); window.SKIN = was; return svg; })();

  function chestButton() {
    const n = waiting(), b = $('chest-btn');
    if (!b) return;
    b.hidden = !n;
    b.textContent = n > 1 ? `🎁 ${n}` : '🎁 Open';
  }
  function openChest() {
    if (!waiting()) return;
    const r = REWARDS[meta.chests];
    $('chest-title').textContent = 'A star chest!';
    $('chest-body').innerHTML = `<div class="chest-big" id="chest-lid">🎁</div><p>You collected ${EVERY * (meta.chests + 1)} ★ — tap to open!</p>`;
    $('chest-btns').innerHTML = '';
    $('chest').hidden = false;
    $('chest-lid').onclick = () => {
      $('chest-lid').classList.add('open');
      Sound.win();
      setTimeout(() => {
        meta.chests++;
        persist();
        Art.confetti();
        $('chest-title').textContent = `New: ${r.name}!`;
        $('chest-body').innerHTML = `<div class="reward">${preview(r, 96)}<p>${r.kind === 'sky' ? 'A new sky for the whole game.' : 'A new look for your blocks.'}</p></div>`;
        $('chest-btns').innerHTML = '<button class="ghost" id="chest-later">Later</button><button class="big" id="chest-use">Use it</button>';
        $('chest-use').onclick = () => { meta.style[r.kind] = r.id; persist(); applyStyle(); closeChest(); };
        $('chest-later').onclick = closeChest;
      }, 480);
    };
  }
  function closeChest() { $('chest').hidden = true; chestButton(); if (!$('home').hidden) home(); }
  $('chest-btn').addEventListener('click', openChest);

  // The style picker in Settings: every block style and sky, locked ones show the stars they need.
  function stylePicker() {
    const box = $('set-styles');
    if (!box) return;
    const opt = (r, kind) => {
      const on = (meta.style[kind] || '') === (r ? r.id : '');
      if (!r) return `<button class="opt ${on ? 'on' : ''}" data-k="${kind}" data-id="">${kind === 'sky' ? '<div class="sw" style="background:linear-gradient(180deg,#3b2a8f,#22185a 55%,#120c2e)"></div>' : preview({ id: '', kind: 'skin' }, 44)}</button>`;
      const i = REWARDS.indexOf(r), got = owned(r.id);
      return `<button class="opt ${on ? 'on' : ''} ${got ? '' : 'locked'}" data-k="${kind}" data-id="${got ? r.id : ''}" data-lock="${got ? '' : EVERY * (i + 1)}" title="${r.name}">${
        kind === 'sky' ? `<div class="sw" style="background:${r.sw}"></div>` : preview(r, 44)}${got ? '' : `<b style="position:absolute">🔒${EVERY * (i + 1)}</b>`}</button>`;
    };
    box.innerHTML = `<h3>🎨 Block style</h3><div class="row">${opt(null, 'skin')}${REWARDS.filter(r => r.kind === 'skin').map(r => opt(r, 'skin')).join('')}</div>`
      + `<h3>🌌 Sky</h3><div class="row">${opt(null, 'sky')}${REWARDS.filter(r => r.kind === 'sky').map(r => opt(r, 'sky')).join('')}</div>`;
    box.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      if (b.dataset.lock) { ask(`Collect ${b.dataset.lock} ★ to unlock this — it comes in a star chest.`, { cancel: false }); return; }
      meta.style[b.dataset.k] = b.dataset.id; persist(); applyStyle(); stylePicker();
    });
  }

  applyStyle();
  $('to-daily').addEventListener('click', () => { Sound.unlock(); play(); });
  // A shared result links to ?daily: open today's puzzle.
  if (new URLSearchParams(location.search).has('daily')) setTimeout(play, 300);

  return { play, homeButton, merge, meta: () => meta, today, stylePicker };
})();
window.Extras = Extras;
Extras.homeButton();
