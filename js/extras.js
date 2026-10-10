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
  // Everyone gets the same board on the same day, from the pool of hard daily boards (js/daily-levels.js,
  // packed boards and mixes); every board once before any repeats.
  const POOL = typeof DAILY_LEVELS !== 'undefined' ? DAILY_LEVELS : CHALLENGE_LEVELS;
  const dailyLevel = d => POOL[((d - 1) * 37 % POOL.length + POOL.length) % POOL.length];

  // The streak as it stands today: still alive if the last solve was yesterday (or the day before,
  // when this week's freeze is unused).
  // Freezes that can cover missed days: this week's free one, plus any a friend gave you (❄ gift).
  const freezesLeft = d => (meta.streak.freeze !== week(d) ? 1 : 0) + (meta.freezes || 0);
  function streakNow() {
    const s = meta.streak, d = today();
    if (s.last === d || s.last === d - 1) return s.n;
    const missed = d - 1 - s.last;
    if (s.last && missed <= freezesLeft(d)) return s.n;
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
      const missed = d - 1 - st.last;
      if (st.last === d - 1) st.n++;
      else if (st.last && missed > 0 && missed <= freezesLeft(d)) {
        // Use the weekly freeze first, then gifted ones.
        let need = missed;
        if (st.freeze !== week(d)) { st.freeze = week(d); need--; }
        meta.freezes = Math.max(0, (meta.freezes || 0) - need);
        st.n++;
        note = ` ❄ ${missed === 1 ? 'A streak freeze' : missed + ' streak freezes'} saved it!`;
      }
      else if (st.last !== d) st.n = 1;
      st.last = d;
      st.best = Math.max(st.best || 0, st.n);
    }
    // Only the last 60 days are kept.
    for (const k of Object.keys(meta.daily)) if (+k < d - 60) delete meta.daily[k];
    persist();
    check();
    const n = streakNow();
    $('win-text').textContent = `${m} moves · par ${level.par}`;
    $('win-best').innerHTML = `<div class="streak-big"><b>🔥 ${n}</b><span>day streak${n === 1 ? '' : ' — keep it going tomorrow!'}</span></div>${note ? `<p class="note">${note}</p>` : ''}`;
    $('next').hidden = false;
    $('to-ch').hidden = false;
    $('next').className = 'big'; $('replay').className = 'ghost'; $('replay').textContent = 'Play again'; $('next').style.order = $('to-ch').style.order = '';
  }

  async function share(d) {
    const r = meta.daily[d] || { s: 0, m: 0 };
    const text = T(`Happy Blocks daily #${d} ${'⭐'.repeat(r.s)}${'☆'.repeat(3 - r.s)} ${r.m} moves 🔥${streakNow()}`);
    const url = Native.webBase() + '?daily';
    if (navigator.share) { try { await navigator.share({ text, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(`${text} ${url}`); ask('Copied! Paste it to your friends.', { cancel: false }); }
    catch (e) { ask('Copy this and send it to your friends:', { input: `${text} ${url}`, copy: true, cancel: false, ok: 'Done' }); }
  }

  // The home screen button: today's number, the streak, and a tick once it's done.
  function homeButton() {
    chestButton();
    nudge();
    checkGifts();
    const mc = Object.keys(meta.ach || {}).length, st = $('stars-total');
    if (st && st.textContent) st.textContent = st.textContent.split('  ·  🏅')[0] + `  ·  🏅 ${mc}`;
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
    for (const [k, v] of Object.entries(m.ach || {})) if (!meta.ach[k]) { meta.ach[k] = v; changed = true; }
    for (const k of Object.keys(meta.ach)) if (!(m.ach || {})[k]) mine = true;
    for (const [k, v] of Object.entries(m.count || {})) if (v > (meta.count[k] || 0)) { meta.count[k] = v; changed = true; }
    if (m.story && m.story.ch1 === 'done' && (meta.story || {}).ch1 !== 'done') { meta.story = { ...(meta.story || {}), ch1: 'done' }; changed = true; }
    for (const [ev, d] of Object.entries(m.ev || {})) {
      if (ev === 'got') { for (const [k, v] of Object.entries(d || {})) if (!(meta.ev.got || {})[k]) { meta.ev.got = { ...(meta.ev.got || {}), [k]: v }; changed = true; } continue; }
      const mineEv = evData(ev);
      for (const [i, st] of Object.entries((d && d.s) || {})) if (st > (mineEv.s[i] || 0)) { mineEv.s[i] = st; changed = true; }
      for (const [i, mv] of Object.entries((d && d.m) || {})) if (!(mineEv.m[i] <= mv)) { mineEv.m[i] = mv; changed = true; }
    }
    for (const k of Object.keys(meta.ev.got || {})) if (!((m.ev || {}).got || {})[k]) mine = true;
    if ((m.freezes || 0) > meta.freezes) { meta.freezes = m.freezes; changed = true; }
    if ((m.biscuits || 0) > meta.biscuits) { meta.biscuits = m.biscuits; changed = true; }
    if (m.snitch && (m.snitch.sp || 0) > ((meta.snitch || {}).sp || 0)) { meta.snitch = m.snitch; changed = true; } else if (meta.snitch && (!m.snitch || meta.snitch.sp > m.snitch.sp)) mine = true;
    if ((m.chests || 0) > meta.chests) { meta.chests = m.chests; changed = true; } else if ((m.chests || 0) < meta.chests) mine = true;
    if (m.style && !meta.style.skin && !meta.style.sky && (m.style.skin || m.style.sky)) { meta.style = m.style; changed = true; applyStyle(); }
    if (changed) { try { localStorage.setItem(KEY, JSON.stringify(meta)); } catch (e) {} homeButton(); }
    return mine;
  }

  // ── Star chests: one at each step of AT stars, with the next style in line ──
  // Chests get rarer as you go: the stars needed for each one (the last needs every level perfect).
  const AT = [40, 90, 140, 190, 240, 290, 330, 360];
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
  // Event rewards (🎃 Halloween in the Events tab): won there, then usable everywhere like the chest styles.
  REWARDS.push(
    { id: 'pumpkin', kind: 'skin', name: 'Pumpkin', ev: 'halloween', need: 5, how: 'Solve 5 Halloween levels in Events to unlock this.' },
    { id: 'bat', kind: 'skin', name: 'Little bat', ev: 'halloween', need: 10, how: 'Solve 10 Halloween levels in Events to unlock this.' },
    { id: 'halloween', kind: 'sky', name: 'Halloween night', ev: 'halloween', need: 15, how: 'Solve 15 Halloween levels in Events to unlock this.', sw: 'radial-gradient(circle at 72% 26%,#fff6d6 0 14%,#ffd27a 16%,transparent 24%),linear-gradient(180deg,#5a2a7a,#24103e 55%,#0b0414)' },
    { id: 'witch', kind: 'skin', name: 'Witch hat', ev: 'halloween', story: true, how: 'Finish Mörfi’s Halloween story in Events to unlock this.' },
  );
  const HALLOWEEN_SKINS = ['pumpkin', 'witch', 'bat'];
  meta.chests = meta.chests || 0;               // how many chests have been opened
  meta.style = meta.style || { skin: '', sky: '' };
  const stars = () => Object.values(progress.stars).reduce((a, b) => a + b, 0);
  const waiting = () => Math.max(0, AT.filter(n => stars() >= n).length - meta.chests);
  meta.ev = meta.ev || {};                      // events: { got: { rewardId: day }, halloween: { s: {i: stars}, m: {i: moves} } }
  const owned = id => { const r = REWARDS.find(x => x.id === id); return !!r && (r.ev ? !!(meta.ev.got || {})[id] : REWARDS.indexOf(r) < meta.chests); };
  const evData = name => (meta.ev[name] = meta.ev[name] || { s: {}, m: {} });
  // Unlocks an event reward (once) and returns its picture.
  function unlock(id) {
    const r = REWARDS.find(x => x.id === id);
    if (!r) return '';
    meta.ev.got = meta.ev.got || {};
    if (!meta.ev.got[id]) { meta.ev.got[id] = today(); persist(); }
    return `<div class="reward">${preview(r, 96)}</div>`;
  }
  // The look of a level: Halloween levels wear the pumpkin unless you already picked a Halloween style;
  // every other level gets your own style back. Also the night sky behind Halloween levels.
  function theme(lv) {
    const hw = !!lv && lv.theme === 'halloween', mine = meta.style.skin || '';
    window.SKIN = hw && !HALLOWEEN_SKINS.includes(mine) ? 'pumpkin' : mine;
    document.documentElement.classList.toggle('ev-halloween', hw || (lv === 'events'));
  }

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
    $('chest-body').innerHTML = `<div class="chest-big" id="chest-lid">🎁</div><p>You collected ${AT[meta.chests]} ★ — tap to open!</p>`;
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
      return `<button class="opt ${on ? 'on' : ''} ${got ? '' : 'locked'}" data-k="${kind}" data-id="${got ? r.id : ''}" data-lock="${got || r.ev ? '' : AT[i]}" data-how="${got || !r.ev ? '' : r.id}" title="${r.name}">${
        kind === 'sky' ? `<div class="sw" style="background:${r.sw}"></div>` : preview(r, 44)}${got ? '' : `<b style="position:absolute">🔒${r.ev ? '🎃' : AT[i]}</b>`}</button>`;
    };
    box.innerHTML = `<h3>🎨 Block style</h3><div class="row">${opt(null, 'skin')}${REWARDS.filter(r => r.kind === 'skin').map(r => opt(r, 'skin')).join('')}</div>`
      + `<h3>🌌 Sky</h3><div class="row">${opt(null, 'sky')}${REWARDS.filter(r => r.kind === 'sky').map(r => opt(r, 'sky')).join('')}</div>`;
    box.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      if (b.dataset.lock) { ask(`Collect ${b.dataset.lock} ★ to unlock this — it comes in a star chest.`, { cancel: false }); return; }
      if (b.dataset.how) { ask(REWARDS.find(r => r.id === b.dataset.how).how, { cancel: false }); return; }
      meta.style[b.dataset.k] = b.dataset.id; persist(); applyStyle(); stylePicker();
    });
  }

  // ── Medals ──
  meta.ach = meta.ach || {};                    // medal id → day it was won
  meta.count = meta.count || {};                // running counts (timed wins, beavers fed, prisons opened…)
  const threeStars = () => Object.values(progress.stars).filter(v => v === 3).length;
  const solved = () => Object.values(progress.stars).filter(v => v > 0).length;
  const MEDALS = [
    { id: 'first', icon: '🎉', name: 'First steps', text: 'Solve your first level', ok: () => solved() >= 1 },
    { id: 'ten', icon: '🔟', name: 'Warming up', text: 'Solve 10 levels', ok: () => solved() >= 10 },
    { id: 'fifty', icon: '🏃', name: 'Halfway hero', text: 'Solve 50 levels', ok: () => solved() >= 50 },
    { id: 'hundred', icon: '💯', name: 'Centurion', text: 'Solve 100 levels', ok: () => solved() >= 100 },
    { id: 'par10', icon: '⭐', name: 'Sharp', text: '10 levels with ⭐⭐⭐', ok: () => threeStars() >= 10 },
    { id: 'par50', icon: '🌟', name: 'Perfectionist', text: '50 levels with ⭐⭐⭐', ok: () => threeStars() >= 50 },
    { id: 'clean', icon: '🧼', name: 'No take-backs', text: 'Solve a level of par 15+ without undo', ok: () => (meta.count.clean || 0) >= 1 },
    { id: 'better', icon: '🧠', name: 'Big brain', text: 'Beat par (fewer moves than par)', ok: () => (meta.count.better || 0) >= 1 },
    { id: 'quick', icon: '⚡', name: 'Lightning', text: 'Solve a level of par 15+ in under a minute', ok: () => (meta.count.quick || 0) >= 1 },
    { id: 'timed', icon: '⏱', name: 'Against the clock', text: 'Beat a time challenge', ok: () => (meta.count.timed || 0) >= 1 },
    { id: 'timed4', icon: '⏰', name: 'Speed demon', text: 'Beat 4 time challenges', ok: () => (meta.count.timed || 0) >= 4 },
    { id: 'beaver', icon: '🦫', name: 'Beaver buddy', text: 'Feed 10 trees to beavers', ok: () => (meta.count.beaver || 0) >= 10 },
    { id: 'jail', icon: '🔓', name: 'Jailbreak', text: 'Open 5 prisons', ok: () => (meta.count.jail || 0) >= 5 },
    { id: 'fire', icon: '🚒', name: 'Firefighter', text: 'Put out 10 fires', ok: () => (meta.count.fire || 0) >= 10 },
    { id: 'daily', icon: '📅', name: 'Daily habit', text: 'Solve a daily puzzle', ok: () => Object.keys(meta.daily).length >= 1 },
    { id: 'streak7', icon: '🔥', name: 'On fire', text: '7-day daily streak', ok: () => (meta.streak.best || 0) >= 7 },
    { id: 'streak30', icon: '🌋', name: 'Unstoppable', text: '30-day daily streak', ok: () => (meta.streak.best || 0) >= 30 },
    { id: 'helper', icon: '🤝', name: 'Good friend', text: 'Solve a level for a friend who asked for help', ok: () => (meta.count.helped || 0) >= 1 },
    { id: 'style', icon: '🎨', name: 'Fashionista', text: 'Open 4 star chests', ok: () => meta.chests >= 4 },
    { id: 'generous', icon: '🎁', name: 'Generous', text: 'Send 5 gifts to friends', ok: () => (meta.count.gifts || 0) >= 5 },
    { id: 'loved', icon: '💝', name: 'Well loved', text: 'Get 10 gifts from friends', ok: () => (meta.count.gotGifts || 0) >= 10 },
    { id: 'biscuit', icon: '🍪', name: 'Golden biscuit', text: 'Finish Mörfi’s first Very Important Mission', ok: () => (meta.count.story1 || 0) >= 1 },
  ];
  let popT = 0;
  function check() {
    const fresh = MEDALS.filter(m => !meta.ach[m.id] && m.ok());
    if (!fresh.length) return;
    fresh.forEach(m => { meta.ach[m.id] = today(); });
    persist();
    // One banner per new medal, one after another.
    fresh.forEach((m, i) => setTimeout(() => {
      const e = $('medal-pop');
      e.innerHTML = `<span>${m.icon}</span><div><small>New medal!</small><b>${m.name}</b></div>`;
      e.hidden = false; e.classList.remove('in'); void e.offsetWidth; e.classList.add('in');
      Sound.thaw && Sound.thaw();
      clearTimeout(popT); popT = setTimeout(() => { e.hidden = true; }, 2600);
    }, 900 + i * 2800));
    homeButton();
  }
  // Something happened in a level: count it (and look for new medals).
  function event(k, n = 1) { meta.count[k] = (meta.count[k] || 0) + n; check(); }
  // A level was solved: { moves, par, undo, secs, timed, helped }.
  function onWin(w) {
    if (w.par >= 15 && !w.undo) meta.count.clean = (meta.count.clean || 0) + 1;
    if (w.moves < w.par) meta.count.better = (meta.count.better || 0) + 1;
    if (w.par >= 15 && w.secs < 60) meta.count.quick = (meta.count.quick || 0) + 1;
    if (w.timed) meta.count.timed = (meta.count.timed || 0) + 1;
    if (w.helped) meta.count.helped = (meta.count.helped || 0) + 1;
    check();
  }
  function medals() {
    const got = MEDALS.filter(m => meta.ach[m.id]).length;
    $('medals-title').textContent = `🏅 Medals ${got}/${MEDALS.length}`;
    $('medals-list').innerHTML = MEDALS.map(m => `<div class="medal ${meta.ach[m.id] ? 'got' : ''}"><span>${meta.ach[m.id] ? m.icon : '🔒'}</span><div><b>${m.name}</b><small>${m.text}</small></div></div>`).join('');
    $('medals').hidden = false;
  }
  $('medals-done').addEventListener('click', () => { $('medals').hidden = true; });
  $('stars-total').addEventListener('click', medals);

  // ── Friends: who's just ahead of you (a friendly push), or that you lead ──
  let nudgeAt = 0;
  async function nudge() {
    const o = window.Online, e = $('nudge');
    if (!e || !o || !o.name || !(o.friends || []).length || Date.now() - nudgeAt < 60000) return;
    nudgeAt = Date.now();
    try {
      const rows = await o.friendsBoard(), me = rows.find(r => r.mine);
      if (!me) return;
      const ahead = rows.filter(r => !r.mine && r.stars > me.stars).sort((a, b) => a.stars - b.stars)[0];
      const behind = rows.filter(r => !r.mine && r.stars <= me.stars).sort((a, b) => b.stars - a.stars)[0];
      e.textContent = ahead ? `🏁 ${ahead.name} is ${ahead.stars - me.stars} ★ ahead of you — catch up!`
        : behind ? `👑 You lead your friends! ${behind.name} is ${me.stars - behind.stars} ★ behind.` : '';
      e.classList.toggle('on', !!e.textContent);
    } catch (err) { console.warn('nudge', err); }
  }
  $('nudge').addEventListener('click', () => { rankTab = 'friends'; ranks(); });
  window.addEventListener('online-user', () => { nudgeAt = 0; setTimeout(nudge, 800); });
  window.addEventListener('online-ready', () => setTimeout(nudge, 1500));

  // ── Gifts for friends: reactions and a couple of special ones ──
  const GIFTS = {
    clap: { icon: '👏', name: 'Applause', say: 'is applauding you!' },
    love: { icon: '💖', name: 'Love', say: 'sent you love!' },
    fire: { icon: '🔥', name: 'You’re on fire', say: 'says you’re on fire!' },
    haha: { icon: '😂', name: 'Haha', say: 'is laughing with you!' },
    brain: { icon: '🤯', name: 'Big brain', say: 'thinks you’re a big brain!' },
    biscuit: { icon: '🍪', name: 'A biscuit', say: 'sent you a biscuit! Mörfi approves.', special: true },
    freeze: { icon: '❄️', name: 'Streak freeze', say: 'sent you a streak freeze — it saves your daily streak if you miss a day.', special: true },
  };
  meta.freezes = meta.freezes || 0;
  meta.biscuits = meta.biscuits || 0;
  function giftCard(title, body, btns) {
    $('gift-title').textContent = title;
    $('gift-body').innerHTML = body;
    $('gift-btns').innerHTML = btns;
    $('gift').hidden = false;
  }
  const closeGift = () => { $('gift').hidden = true; };
  function giftPicker(to, name) {
    const row = keys => keys.map(k => `<button class="gift-opt ${GIFTS[k].special ? 'special' : ''}" data-k="${k}"><span>${GIFTS[k].icon}</span><small>${GIFTS[k].name}</small></button>`).join('');
    giftCard(`🎁 A gift for ${name}`, `<p class="note">One gift per friend a day.</p><h3 class="gift-h">Reactions</h3><div class="gift-grid">${row(['clap', 'love', 'fire', 'haha', 'brain'])}</div>
      <h3 class="gift-h">Something special</h3><div class="gift-grid two">${row(['biscuit', 'freeze'])}</div>`, '<button class="ghost" id="gift-cancel">Cancel</button>');
    $('gift-cancel').onclick = closeGift;
    document.querySelectorAll('.gift-opt').forEach(b => b.onclick = async () => {
      const k = b.dataset.k;
      b.classList.add('sending');
      try {
        const ok = await window.Online.sendGift(to, k, today());
        if (!ok) { giftCard('Already sent today', `<p>You’ve already sent ${name} a gift today — try again tomorrow! 🌙</p>`, '<button class="big" id="gift-ok">OK</button>'); $('gift-ok').onclick = closeGift; return; }
        event('gifts');
        giftCard('Sent!', `<div class="gift-big">${GIFTS[k].icon}</div><p>${GIFTS[k].name} is on its way to ${name}.</p>`, '<button class="big" id="gift-ok">Yay</button>');
        $('gift-ok').onclick = closeGift;
        Sound.win && Sound.win();
      } catch (e) {
        giftCard('Couldn’t send', `<p>${e.message || 'No connection right now — try again in a moment.'}</p>`, '<button class="big" id="gift-ok">OK</button>'); $('gift-ok').onclick = closeGift;
      }
    });
  }
  // Gifts waiting for me: shown one by one when the game opens (or you come back home).
  let giftsAt = 0, giftQueue = [];
  async function checkGifts() {
    const o = window.Online;
    if (!o || !o.name || Date.now() - giftsAt < 45000 || !$('gift').hidden) return;
    giftsAt = Date.now();
    try { giftQueue = await o.incomingGifts(); } catch (e) { return console.warn('gifts', e); }
    showGift();
  }
  function showGift() {
    const g = giftQueue.shift();
    if (!g) return;
    const k = GIFTS[g.kind] || GIFTS.love;
    if (g.kind === 'freeze') meta.freezes++;
    if (g.kind === 'biscuit') meta.biscuits++;
    meta.count.gotGifts = (meta.count.gotGifts || 0) + 1;
    persist();
    window.Online.giftSeen(g.id).catch(() => {});
    giftCard('🎁 A gift!', `<div class="gift-big bounce">${k.icon}</div><p><b>${esc(g.fromName)}</b> ${k.say}</p>${g.kind === 'freeze' ? `<p class="note">You have ❄ ${meta.freezes} saved.</p>` : g.kind === 'biscuit' ? `<p class="note">🍪 ${meta.biscuits} biscuit${meta.biscuits === 1 ? '' : 's'} collected.</p>` : ''}`,
      `<button class="ghost" id="gift-close">Close</button><button class="big" id="gift-thanks">💖 Say thanks</button>`);
    Art.confetti();
    const next = () => { closeGift(); setTimeout(showGift, 350); check(); };
    $('gift-close').onclick = next;
    $('gift-thanks').onclick = async () => {
      try { await window.Online.sendGift(g.from, 'love', today()); } catch (e) {}
      next();
    };
  }
  window.addEventListener('online-ready', () => setTimeout(checkGifts, 2500));
  window.addEventListener('online-user', () => { giftsAt = 0; setTimeout(checkGifts, 1500); });

  applyStyle();
  $('to-daily').addEventListener('click', () => { Sound.unlock(); play(); });
  // A shared result links to ?daily: open today's puzzle.
  if (new URLSearchParams(location.search).has('daily')) setTimeout(play, 300);

  return { play, homeButton, merge, meta: () => meta, today, stylePicker, event, onWin, medals, check, save: persist, giftPicker, unlock, owned, theme, evData, rewards: ev => REWARDS.filter(r => r.ev === ev), preview, applyStyle };
})();
window.Extras = Extras;
Extras.homeButton();
// Medals already earned by earlier play show up a moment after start.
setTimeout(() => Extras.check(), 1500);
