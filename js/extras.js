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
    if (changed) { try { localStorage.setItem(KEY, JSON.stringify(meta)); } catch (e) {} homeButton(); }
    return mine;
  }

  $('to-daily').addEventListener('click', () => { Sound.unlock(); play(); });
  // A shared result links to ?daily: open today's puzzle.
  if (new URLSearchParams(location.search).has('daily')) setTimeout(play, 300);

  return { play, homeButton, merge, meta: () => meta, today };
})();
window.Extras = Extras;
Extras.homeButton();
