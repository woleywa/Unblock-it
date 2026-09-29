// Happy Blocks — teams and challenges (screens). Data goes through window.Online (online.js).
// Uses game.js globals: $, show, esc, askName, totals, starsFor, begin, chPlay, home, ranks.
const Social = (() => {
  const on = () => window.Online;
  const link = (k, code) => `${Native.webBase()}#${k}=${code}`;

  // ── Small helpers ──────────────────────────────────────────
  let toastT = 0;
  function toast(t) {
    const e = $('toast');
    e.textContent = t; e.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { e.hidden = true; }, 2200);
  }
  async function share(title, text, url) {
    if (navigator.share) {
      try { await navigator.share({ title, text, url }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(`${text} ${url}`); toast('Link copied — paste it to your friends'); }
    catch (e) { ask('Copy this link and send it to your friends:', { input: url, copy: true, cancel: false, ok: 'Done' }); }
  }
  // Run `then` once the player is online with a nickname.
  async function needName(then) {
    const o = on();
    if (!o || !(await o.ready)) { toast('This needs an internet connection'); return false; }
    if (!o.name) { askName(then); return false; }
    then();
    return true;
  }
  const errText = e => e.code === 'permission-denied' ? 'That isn’t allowed right now — try again.'
    : e.code === 'timeout' || e.code === 'unavailable' ? 'Couldn’t reach the server — check your connection.' : (e.message || 'Something went wrong.');
  function fmtLeft(ms) {
    ms = Math.max(0, ms);
    const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60;
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  }
  const fmtMin = m => m >= 1440 ? `${m / 1440} day${m === 1440 ? '' : 's'}` : m >= 60 ? `${m / 60} hour${m === 60 ? '' : 's'}` : `${m} min`;
  const now = () => (on() ? on().now() : Date.now());
  const medal = i => i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1;
  const loading = box => { box.innerHTML = '<p class="note">Loading…</p>'; };

  // ── Saved challenge state (this device) ────────────────────
  const SAVE = 'unblock_challenges_v1';
  let store = { known: [], runs: {} };
  try { store = { known: [], runs: {}, ...JSON.parse(localStorage.getItem(SAVE) || '{}') }; } catch (e) {}
  const persist = () => { try { localStorage.setItem(SAVE, JSON.stringify(store)); } catch (e) {} };
  const remember = code => { store.known = [code, ...store.known.filter(c => c !== code)].slice(0, 30); persist(); };

  // Everyone in a challenge gets the same levels, in the same order, from its seed.
  function seqOf(ch) {
    let a = ch.seed >>> 0;
    const rnd = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const ids = [...CHALLENGE_LEVELS.keys()];
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    // The pool is ordered easy → hard, so sorting by index ramps the difficulty up.
    if (ch.levels) return ids.slice(0, ch.levels).sort((x, y) => x - y);
    const out = [];
    for (let i = 0; i < ids.length; i += 10) out.push(...ids.slice(i, i + 10).sort((x, y) => x - y));
    return out;
  }
  const endOf = ch => ch.start + ch.window * 60000;
  const myEnd = (ch, e) => Math.min(endOf(ch), e && ch.playMin ? e.started + ch.playMin * 60000 : Infinity);
  function phase(ch, e, t = now()) {
    if (t < ch.start) return 'soon';
    if (t >= endOf(ch)) return 'over';
    if (e && t >= myEnd(ch, e)) return 'done';
    return 'open';
  }
  function scoreRuns(ch, runs) {
    const seq = seqOf(ch);
    let stars = 0, moves = 0;
    for (const [p, m] of Object.entries(runs)) { stars += starsFor(m, CHALLENGE_LEVELS[seq[p]].par); moves += m; }
    return { stars, moves, solved: Object.keys(runs).length };
  }
  const title = ch => `${ch.byName}’s challenge`;
  function rules(ch) {
    return [
      ch.levels ? `${ch.levels} levels` : 'Endless levels',
      ch.playMin ? `${ch.playMin} min each` : 'No time limit each',
      `${ch.players === 1 ? 'Solo' : `${ch.players} players`}`,
    ];
  }

  // ── Challenges list ────────────────────────────────────────
  async function list() {
    show('chs');
    $('ch-code-err').textContent = '';
    const box = $('ch-list');
    loading(box);
    const o = on();
    if (!o || !(await o.ready)) { box.innerHTML = '<p class="note">Challenges need an internet connection.</p>'; return; }
    try {
      const found = new Map();
      const mine = await Promise.all(store.known.slice(0, 15).map(c => o.getChallenge(c).catch(() => null)));
      mine.filter(Boolean).forEach(c => found.set(c.code, c));
      if (o.team) (await o.teamChallenges(o.team.code)).forEach(c => found.set(c.code, c));
      const t = now();
      const all = [...found.values()].filter(c => endOf(c) > t - 7 * 86400e3);
      const live = all.filter(c => endOf(c) > t).sort((a, b) => endOf(a) - endOf(b));
      const over = all.filter(c => endOf(c) <= t).sort((a, b) => endOf(b) - endOf(a)).slice(0, 10);
      const card = c => {
        const p = phase(c, null, t);
        const when = p === 'soon' ? `⏳ Starts in <span class="count" data-t="${c.start}"></span>`
          : p === 'over' ? '🏁 Finished' : `🟢 Live · <span class="count" data-t="${endOf(c)}"></span> left`;
        return `<button class="ch-card ${p}" data-code="${c.code}">
          <span class="ch-top"><b>${esc(title(c))}</b>${c.teamName ? `<i class="tag-team">${esc(c.teamName)}</i>` : ''}</span>
          <span class="ch-when">${when}</span>
          <small>${rules(c).join(' · ')} · ${c.joined}/${c.players} joined</small></button>`;
      };
      box.innerHTML = (live.length ? '<h3 class="sec">Live & coming up</h3>' + live.map(card).join('') : '')
        + (over.length ? '<h3 class="sec">Finished</h3>' + over.map(card).join('') : '')
        || '<p class="note">No challenges yet. Start one and invite your friends — or your team!</p>';
      box.querySelectorAll('.ch-card').forEach(b => b.addEventListener('click', () => openCh(b.dataset.code)));
      tick();
    } catch (e) {
      console.warn(e);
      box.innerHTML = `<p class="note">${esc(errText(e))}<br><button class="ghost small" id="chs-retry">Try again</button></p>`;
      $('chs-retry').addEventListener('click', list);
    }
  }
  $('ch-code-form').addEventListener('submit', async e => {
    e.preventDefault();
    const code = on() ? on().normCode($('ch-code').value) : '';
    if (code.length !== 6) { $('ch-code-err').textContent = 'Codes have 6 letters and numbers'; return; }
    $('ch-code').value = '';
    openCh(code);
  });

  // ── New challenge form ─────────────────────────────────────
  const pick = k => +document.querySelector(`#new-ch .opts[data-k="${k}"] .on`).dataset.v;
  function formSync() {
    const win = pick('window');
    // Play time can't be longer than the challenge is open.
    document.querySelectorAll('#new-ch .opts[data-k="playMin"] button').forEach(b => {
      b.disabled = +b.dataset.v > win;
      if (b.disabled && b.classList.contains('on')) { b.classList.remove('on'); b.parentNode.firstElementChild.classList.add('on'); }
    });
    const n = +$('np').value;
    $('np-val').textContent = n === 1 ? '1 (solo)' : n;
    const pm = pick('playMin'), lv = pick('levels'), st = pick('startIn');
    $('new-ch-sum').textContent = `${st ? `Starts in ${fmtMin(st)}` : 'Starts now'} and stays open ${fmtMin(win)}. `
      + (pm ? `Everyone gets ${pm} minutes from when they tap Start. ` : 'Play as long as it’s open. ')
      + (lv ? `${lv} levels — ` : 'New levels keep coming — ') + 'collect the most stars!';
  }
  document.querySelectorAll('#new-ch .opts').forEach(g => g.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b || b.disabled) return;
    g.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    formSync();
  }));
  $('np').addEventListener('input', formSync);
  $('ch-new').addEventListener('click', () => needName(() => {
    const o = on();
    // Default: one spot per teammate.
    $('np').value = o.team ? Math.max(2, Math.min(20, o.team.members)) : 4;
    $('new-ch-err').textContent = '';
    formSync();
    $('new-ch').hidden = false;
  }));
  $('new-ch-cancel').addEventListener('click', () => { $('new-ch').hidden = true; });
  $('new-ch-form').addEventListener('submit', async e => {
    e.preventDefault();
    $('new-ch-go').disabled = true;
    $('new-ch-err').textContent = '';
    try {
      const ch = await on().createChallenge({ startIn: pick('startIn'), window: pick('window'), playMin: pick('playMin'), levels: pick('levels'), players: +$('np').value });
      remember(ch.code);
      $('new-ch').hidden = true;
      openCh(ch.code, true);
    } catch (err) { console.warn(err); $('new-ch-err').textContent = errText(err); }
    $('new-ch-go').disabled = false;
  });

  // ── One challenge ──────────────────────────────────────────
  let cur = null; // { ch, entry, rows, seq, fresh, loadedAt, phase }
  async function openCh(code, fresh) {
    show('ch');
    $('ch-title').textContent = 'Challenge';
    ['ch-info', 'ch-grid', 'ch-scores'].forEach(id => { $(id).innerHTML = ''; });
    loading($('ch-me'));
    const o = on();
    if (!o || !(await o.ready)) { $('ch-me').innerHTML = '<p class="note">Challenges need an internet connection.</p>'; return; }
    try {
      const ch = await o.getChallenge(code);
      if (!ch) { $('ch-me').innerHTML = `<p class="note">No challenge with the code <b>${esc(code)}</b>.</p>`; cur = null; return; }
      remember(ch.code);
      const [entry, rows] = await Promise.all([o.name ? o.myEntry(ch.code) : null, o.entries(ch.code)]);
      cur = { ch, entry, rows, seq: seqOf(ch), fresh, loadedAt: Date.now() };
      syncRuns();
      hub();
    } catch (e) {
      console.warn(e);
      $('ch-me').innerHTML = `<p class="note">${esc(errText(e))}<br><button class="ghost small" id="ch-retry">Try again</button></p>`;
      $('ch-retry').addEventListener('click', () => openCh(code));
    }
  }
  // This device's best runs and the server's, merged; anything better here gets sent up.
  function syncRuns() {
    const { ch, entry } = cur;
    if (!entry) return;
    const local = store.runs[ch.code] || {}, merged = { ...entry.runs };
    let better = false;
    for (const [p, m] of Object.entries(local)) if (!(merged[p] <= m)) { merged[p] = m; better = true; }
    store.runs[ch.code] = merged; persist();
    entry.runs = merged;
    if (better && phase(ch, entry) === 'open') pushRuns();
  }
  async function pushRuns() {
    const { ch, entry } = cur;
    const s = scoreRuns(ch, entry.runs);
    try { await on().saveEntry(ch.code, entry.runs, s.stars, s.moves); Object.assign(entry, s); return true; }
    catch (e) { console.warn(e); toast('Couldn’t save your score yet — it’ll retry'); return false; }
  }
  async function reloadScores() {
    if (!cur) return;
    cur.loadedAt = Date.now();
    try { cur.rows = await on().entries(cur.ch.code); cur.ch = (await on().getChallenge(cur.ch.code)) || cur.ch; scores(); info(); } catch (e) { console.warn(e); }
  }

  function info() {
    const { ch } = cur;
    $('ch-info').innerHTML = [
      ...rules(ch).map(r => `<span>${r}</span>`),
      `<span>👥 ${ch.joined}/${ch.players}</span>`,
      ch.teamName ? `<span class="tag-team">${esc(ch.teamName)}</span>` : '',
    ].join('');
  }
  function hub() {
    const { ch, entry, fresh } = cur;
    const o = on();
    $('ch-title').textContent = title(ch);
    info();
    const p = cur.phase = phase(ch, entry);
    const me = $('ch-me');
    const invite = `<button class="ghost" id="ch-invite">📨 Invite · code <b>${ch.code}</b></button>`;
    const full = ch.joined >= ch.players;
    if (p === 'soon') {
      me.innerHTML = `<div class="hero"><small>Starts in</small><b class="count big-count" data-t="${ch.start}"></b></div>${invite}`;
    } else if (p === 'over' || p === 'done') {
      const s = entry ? scoreRuns(ch, entry.runs) : null;
      me.innerHTML = `<div class="hero"><small>${p === 'over' ? 'This challenge has finished' : 'Your time is up'}</small>`
        + (s ? `<b>★ ${s.stars}</b><small>${s.solved} level${s.solved === 1 ? '' : 's'} · ${s.moves} moves</small>` : '<b>🏁</b>')
        + `</div>${p === 'done' ? `<p class="note small">Open for another <span class="count" data-t="${endOf(ch)}"></span> — see how the others do.</p>` : ''}`;
    } else if (!entry) {
      const clock = ch.playMin ? `You get <b>${ch.playMin} minutes</b> from when you tap Start.` : `Play as much as you like until it closes.`;
      me.innerHTML = `<div class="hero"><small>Closes in</small><b class="count big-count" data-t="${endOf(ch)}"></b></div>`
        + (!o.name ? `<button class="big" id="ch-start">Pick a nickname to play</button>`
          : full ? `<p class="note">It’s full — all ${ch.players} spots are taken.</p>`
            : `<p class="note small">${clock}</p><button class="big" id="ch-start">▶ Start</button>`)
        + (fresh || !full ? invite : '');
    } else {
      me.innerHTML = `<div class="hero"><small>${ch.playMin ? 'Your time left' : 'Closes in'}</small><b class="count big-count" data-t="${myEnd(ch, entry)}"></b>`
        + `<small>★ ${scoreRuns(ch, entry.runs).stars} so far</small></div>`
        + (!full || fresh ? invite : '');
    }
    const st = $('ch-start');
    if (st) st.addEventListener('click', startCh);
    const inv = $('ch-invite');
    if (inv) inv.addEventListener('click', () => invitePlayers(ch));
    grid();
    scores();
    tick();
  }
  const invitePlayers = ch => share('Happy Blocks challenge', `Join my Happy Blocks challenge! Code ${ch.code}.`, link('c', ch.code));
  $('ch-share').addEventListener('click', () => cur && invitePlayers(cur.ch));

  async function startCh() {
    if (!on().name) { askName(() => openCh(cur.ch.code)); return; }
    const b = $('ch-start');
    b.disabled = true;
    try {
      cur.entry = await on().joinChallenge(cur.ch.code);
      store.runs[cur.ch.code] = {}; persist();
      cur.ch.joined++;
      Sound.unlock();
      play(0);
      reloadScores();
    } catch (e) {
      console.warn(e);
      b.disabled = false;
      toast(e.code === 'permission-denied' ? 'Couldn’t join — it may be full or closed' : errText(e));
      reloadScores().then(hub);
    }
  }

  function grid() {
    const { ch, entry, seq } = cur;
    const g = $('ch-grid');
    if (!entry) { g.innerHTML = ''; return; }
    const runs = entry.runs || {};
    const playable = cur.phase === 'open';
    const top = Math.max(-1, ...Object.keys(runs).map(Number));
    const shown = ch.levels ? seq.length : Math.min(seq.length, Math.max(6, top + 5));
    g.innerHTML = '';
    for (let p = 0; p < shown; p++) {
      const m = runs[p], s = m ? starsFor(m, CHALLENGE_LEVELS[seq[p]].par) : 0;
      const b = document.createElement('button');
      b.className = 'lvl' + (playable ? '' : ' locked') + (m ? ' done' : '');
      b.innerHTML = `<b>${p + 1}</b><small>${[1, 2, 3].map(k => `<i class="${k <= s ? 'on' : ''}">★</i>`).join('')}</small>`;
      if (playable) b.addEventListener('click', () => play(p));
      g.appendChild(b);
    }
  }

  function scores() {
    const { rows, ch } = cur;
    const box = $('ch-scores');
    if (!rows.length) { box.innerHTML = '<h3 class="sec">Scores</h3><p class="note">No one has started yet.</p>'; return; }
    const li = (r, i) => `<li class="${r.mine ? 'mine' : ''}"><span class="pos">${medal(i)}</span>`
      + `<span class="who">${esc(r.name)}${r.teamName ? `<i class="tag-team">${esc(r.teamName)}</i>` : ''}</span>`
      + `<span class="st">★ ${r.stars}</span><span class="mv">${r.solved} lvl · ${r.moves} mv</span></li>`;
    let html = `<h3 class="sec">Scores</h3><ol class="rank-list">${rows.map(li).join('')}</ol>`;
    // Teams: everyone's stars added up.
    const teams = {};
    for (const r of rows) if (r.team) (teams[r.team] = teams[r.team] || { name: r.teamName, stars: 0, n: 0 }), teams[r.team].stars += r.stars, teams[r.team].n++;
    const tl = Object.values(teams).sort((a, b) => b.stars - a.stars);
    if (tl.length) html += `<h3 class="sec">Teams</h3><ol class="rank-list">${tl.map((t, i) =>
      `<li class="${on().team && on().team.name === t.name ? 'mine' : ''}"><span class="pos">${medal(i)}</span><span class="who">${esc(t.name)}</span><span class="st">★ ${t.stars}</span><span class="mv">${t.n} player${t.n === 1 ? '' : 's'}</span></li>`).join('')}</ol>`;
    if (phase(ch, null) !== 'over') html += '<p class="note small">Scores update every few seconds.</p>';
    box.innerHTML = html;
  }

  // ── Playing a challenge level ─────────────────────────────
  function play(pos) {
    const { ch, seq } = cur;
    const code = ch.code;
    chPlay = {
      code, pos,
      again: () => play(pos),
      back: () => { chPlay = null; $('win').hidden = true; hub(); show('ch'); reloadScores(); },
      next: () => {
        const n = pos + 1;
        if (n < seq.length && phase(ch, cur.entry) === 'open') play(n);
        else chPlay.back();
      },
      won: async (m, s) => {
        const runs = cur.entry.runs;
        const best = runs[pos];
        if (!(best <= m)) { runs[pos] = m; store.runs[code] = runs; persist(); }
        $('next').hidden = pos + 1 >= seq.length;
        const box = $('win-best');
        const tot = scoreRuns(ch, runs);
        box.innerHTML = `<h4>This challenge</h4><div class="row mine"><span>★ ${tot.stars} · ${tot.solved} level${tot.solved === 1 ? '' : 's'}</span><b id="win-rank"></b></div>`;
        if (best <= m) return;
        if (await pushRuns()) {
          try {
            cur.rows = await on().entries(code);
            const i = cur.rows.findIndex(r => r.mine);
            if (i >= 0 && $('win-rank')) $('win-rank').textContent = `#${i + 1} of ${cur.rows.length}`;
          } catch (e) { console.warn(e); }
        }
      },
    };
    $('clock').hidden = false;
    begin(CHALLENGE_LEVELS[seq[pos]], `Challenge · ${ch.levels ? `${pos + 1}/${ch.levels}` : `#${pos + 1}`}`, '');
    tick();
  }
  function timeUp() {
    const tot = scoreRuns(cur.ch, cur.entry.runs);
    $('win').hidden = true;
    $('timeup-text').textContent = `You collected ★ ${tot.stars} from ${tot.solved} level${tot.solved === 1 ? '' : 's'}.`;
    $('timeup').hidden = false;
    busy = true;
    Sound.bump();
  }
  $('timeup-ok').addEventListener('click', () => { $('timeup').hidden = true; if (chPlay) chPlay.back(); });

  // Countdowns, the game clock, and live scores.
  function tick() {
    const t = now();
    document.querySelectorAll('.screen:not([hidden]) .count').forEach(e => { e.textContent = fmtLeft(+e.dataset.t - t); });
    if (chPlay && !chPlay.daily && !$('game').hidden && cur) {
      const left = myEnd(cur.ch, cur.entry) - t;
      $('clock').textContent = `⏱ ${fmtLeft(left)}`;
      $('clock').classList.toggle('hurry', left < 60000);
      if (left <= 0 && $('timeup').hidden) timeUp();
    }
    if (cur && !$('ch').hidden) {
      if (phase(cur.ch, cur.entry, t) !== cur.phase) hub();
      else if (Date.now() - cur.loadedAt > 15000) reloadScores();
    }
  }
  setInterval(tick, 500);

  // ── Team ──────────────────────────────────────────────────
  let pendingJoin = null; // a team code from an invite link
  async function team() {
    show('team');
    const box = $('team-body');
    loading(box);
    const o = on();
    if (!o || !(await o.ready)) { box.innerHTML = '<p class="note">Teams need an internet connection.</p>'; return; }
    if (!o.name) {
      box.innerHTML = '<p class="note">Play together: your stars count for your team, and teammates see each other’s challenges.</p><button class="big" id="team-name">Pick a nickname first</button>';
      $('team-name').addEventListener('click', () => askName(team));
      return;
    }
    try {
      await o.refreshTeam();
      const invite = pendingJoin && (!o.team || o.team.code !== pendingJoin) ? await o.getTeam(pendingJoin) : null;
      if (pendingJoin && !invite) toast('That invite link has no team behind it');
      pendingJoin = null;
      let html = '';
      if (invite) {
        html += `<div class="panel invite"><h3>Join ${esc(invite.name)}?</h3><p class="note small">${invite.members}/20 players · ★ ${invite.stars}${o.team ? `<br>You’ll leave ${esc(o.team.name)}.` : ''}</p>
          <button class="big" id="inv-yes">Join team</button><button class="ghost" id="inv-no">Not now</button><p class="err" id="inv-err"></p></div>`;
      }
      if (o.team) {
        const t = o.team;
        const [members, rank] = await Promise.all([o.teamMembers(t.code), o.myTeamRank()]);
        html += `<div class="hero team-hero"><small>Your team</small><b>${esc(t.name)}</b><button class="rename" id="team-rename" aria-label="Rename team">✏️</button><small>★ ${t.stars} · #${rank} of all teams · ${t.members}/20 players</small></div>
          <button class="ghost" id="team-invite">📨 Invite · code <b>${t.code}</b></button>
          <h3 class="sec">Players</h3><ol class="rank-list">${members.map((m, i) =>
            `<li class="${m.mine ? 'mine' : ''}"><span class="pos">${medal(i)}</span><span class="who">${esc(m.name)}</span><span class="st">★ ${m.stars}</span><span class="mv">${m.levels} lvl</span></li>`).join('')}</ol>
          <button class="ghost" id="team-chs">⚡ Team challenges</button>
          <button class="ghost small" id="team-leave">Leave team</button>`;
      } else if (!invite) {
        html += `<p class="note">Team up! Everyone’s stars add up on the team leaderboard, and your challenges show up for each other.</p>
          <form class="panel" id="team-new" autocomplete="off"><h3>Start a team</h3>
            <input id="team-new-name" maxlength="40" placeholder="Team name, e.g. 🦙 Llamas" spellcheck="false"><button class="big" type="submit">Create team</button></form>
          <form class="panel" id="team-join" autocomplete="off"><h3>Join a team</h3>
            <input id="team-join-code" maxlength="8" placeholder="Invite code" autocapitalize="characters" spellcheck="false"><button class="ghost" type="submit">Join</button></form>
          <p class="err" id="team-err"></p>`;
      }
      box.innerHTML = html;
      const act = (id, fn) => { const e = $(id); if (e) e.addEventListener(e.tagName === 'FORM' ? 'submit' : 'click', ev => { ev.preventDefault(); fn(e); }); };
      const busyDo = async (el, errBox, fn) => {
        el.querySelectorAll('button').forEach(b => { b.disabled = true; });
        try { await fn(); team(); } catch (e) {
          console.warn(e);
          if (errBox && $(errBox)) $(errBox).textContent = errText(e); else toast(errText(e));
          el.querySelectorAll('button').forEach(b => { b.disabled = false; });
        }
      };
      act('inv-yes', el => busyDo(el.parentNode, 'inv-err', async () => { await o.joinTeam(invite.code, totals()); toast(`Welcome to ${invite.name}!`); }));
      act('inv-no', () => team());
      act('team-new', el => busyDo(el, 'team-err', () => o.createTeam($('team-new-name').value, totals())));
      act('team-join', el => busyDo(el, 'team-err', () => o.joinTeam($('team-join-code').value, totals())));
      act('team-invite', () => share('Happy Blocks team', `Join my team “${o.team.name}” in Happy Blocks! Code ${o.team.code}.`, link('join', o.team.code)));
      act('team-chs', () => list());
      act('team-rename', async () => {
        const n = await ask('New team name', { input: o.team.name, ok: 'Rename' });
        if (n == null || n.trim() === o.team.name) return;
        o.renameTeam(n).then(() => { toast('Team renamed'); team(); }).catch(e => toast(errText(e)));
      });
      act('team-leave', async el => { if (await ask(`Leave ${o.team.name}? Your stars leave with you.`, { ok: 'Leave team', danger: true })) busyDo(el.parentNode, null, () => o.leaveTeam(totals())); });
    } catch (e) {
      console.warn(e);
      box.innerHTML = `<p class="note">${esc(errText(e))}<br><button class="ghost small" id="team-retry">Try again</button></p>`;
      $('team-retry').addEventListener('click', team);
    }
  }

  // Leaderboard → Teams tab.
  async function rankTeams() {
    const list = $('rank-list'), meBox = $('rank-me');
    list.innerHTML = '';
    meBox.innerHTML = '<p class="note">Loading…</p>';
    const o = on();
    if (!o || !(await o.ready)) { meBox.innerHTML = '<p class="note">The leaderboard needs an internet connection.</p>'; return; }
    try {
      if (o.name) await o.submit(null, 0, totals());
      await o.refreshTeam();
      const [rows, rank] = await Promise.all([o.topTeams(50), o.myTeamRank()]);
      meBox.innerHTML = o.team
        ? `<div class="me-card"><span><b>${esc(o.team.name)}</b> is <b>#${rank}</b></span><span>★ ${o.team.stars}</span></div>`
        : '<button class="big" id="rank-team">👥 Join or start a team</button>';
      if (!o.team) $('rank-team').addEventListener('click', team);
      list.innerHTML = rows.length ? rows.map((t, i) =>
        `<li class="${t.mine ? 'mine' : ''}"><span class="pos">${medal(i)}</span><span class="who">${esc(t.name)}</span><span class="st">★ ${t.stars}</span><span class="mv">${t.members} player${t.members === 1 ? '' : 's'}</span></li>`).join('')
        : '<p class="note">No teams yet — start the first!</p>';
    } catch (e) {
      console.warn(e);
      meBox.innerHTML = `<p class="note">${esc(errText(e))}<br><button class="ghost small" id="rank-retry">Try again</button></p>`;
      $('rank-retry').addEventListener('click', ranks);
    }
  }

  // ── Account: nickname, email + password, sign in/out ──────
  let acctMode = 'save';
  function account() {
    const o = on();
    if (!o) { toast('This needs an internet connection'); return; }
    $('acct-nick').innerHTML = o.name ? `Nickname: <b>${esc(o.name)}</b>` : 'No nickname yet';
    $('acct-rename').textContent = o.name ? 'Change' : 'Pick one';
    const body = $('acct-body');
    if (o.account) {
      body.innerHTML = `<p class="note small">Signed in as <b>${esc(o.account)}</b>. Your stars, team and friends are saved to your account — sign in with it on any device.</p>
        <button class="ghost" id="acct-out" type="button">Sign out on this device</button>
`;

      $('acct-out').addEventListener('click', async () => {
        if (!await ask('Sign out? This device goes back to a fresh guest. Your account keeps everything.', { ok: 'Sign out' })) return;
        try {
          progress = { stars: {}, moves: {} }; saveProgress();
          store = { known: [], runs: {} }; persist();
          await o.signOut();
          $('acct').hidden = true; home(); toast('Signed out');
        } catch (e) { toast(errText(e)); }
      });
    } else {
      const signin = acctMode === 'signin';
      body.innerHTML = `<p class="note small">${signin
        ? 'Sign in to the account you made on another device. What you’ve played here is added to it.'
        : 'You’re playing as a guest on this device. Add an email and password to keep your progress safe and play on other devices — even the home-screen app and Safari.'}</p>
        <form id="acct-form" autocomplete="on">
          <input type="email" id="acct-email" placeholder="Email" autocomplete="email" autocapitalize="off" spellcheck="false">
          <input type="password" id="acct-pw" placeholder="${signin ? 'Password' : 'Password (6+ characters)'}" autocomplete="${signin ? 'current-password' : 'new-password'}">
          <button class="big" type="submit" id="acct-go">${signin ? 'Sign in' : 'Save my progress'}</button>
        </form>
        <p class="err" id="acct-err"></p>
        ${signin ? '<button class="linkish" id="acct-forgot" type="button">Forgot your password?</button>' : ''}
        <button class="linkish" id="acct-mode" type="button">${signin ? 'New here? Save this device’s progress instead' : 'I already have an account — sign in'}</button>`;
      $('acct-mode').addEventListener('click', () => { acctMode = signin ? 'save' : 'signin'; account(); });
      if (signin) $('acct-forgot').addEventListener('click', async () => {
        const email = $('acct-email').value;
        if (!email.trim()) { $('acct-err').textContent = 'Type your email first'; return; }
        try { await o.resetPassword(email); $('acct-err').textContent = ''; toast('Check your email for a reset link'); } catch (e) { $('acct-err').textContent = e.message; }
      });
      $('acct-form').addEventListener('submit', async e => {
        e.preventDefault();
        const email = $('acct-email').value, pw = $('acct-pw').value;
        $('acct-go').disabled = true; $('acct-err').textContent = '';
        try {
          if (signin) {
            // Guest runs on this device don't belong to the account.
            store = { known: store.known, runs: {} }; persist();
            await o.signIn(email, pw);
            toast(o.name ? `Welcome back, ${o.name}!` : 'Signed in');
          } else {
            await o.createAccount(email, pw);
            toast('Saved! Sign in with this email on your other devices');
          }
          acctMode = 'save';
          $('acct').hidden = true;
          meChip();
        } catch (err) { console.warn(err); $('acct-err').textContent = err.message || errText(err); }
        if ($('acct-go')) $('acct-go').disabled = false;
      });
    }
    // Delete: registered players (with their password) and guests who have a nickname.
    if (o.account || o.name) {
      body.insertAdjacentHTML('beforeend', `<button class="linkish" id="acct-del" type="button">Delete my ${o.account ? 'account' : 'nickname and scores'}</button>
        <form id="acct-del-form" class="danger" hidden autocomplete="off">
          <p class="note small">This deletes ${o.account ? 'your account' : 'your nickname and scores'} for good: nickname, stars, team spot, friends and records. It can’t be undone.</p>
          ${o.account ? '<input type="password" id="acct-del-pw" placeholder="Your password" autocomplete="current-password">' : ''}
          <button class="big red" type="submit" id="acct-del-go">Delete forever</button>
          <p class="err" id="acct-del-err"></p>
        </form>`);
      $('acct-del').addEventListener('click', () => { $('acct-del-form').hidden = false; $('acct-del').hidden = true; if ($('acct-del-pw')) $('acct-del-pw').focus(); });
      $('acct-del-form').addEventListener('submit', async e => {
        e.preventDefault();
        $('acct-del-go').disabled = true; $('acct-del-err').textContent = '';
        try {
          await o.deleteAccount($('acct-del-pw') ? $('acct-del-pw').value : '', LEVELS.length);
          progress = { stars: {}, moves: {} }; saveProgress();
          store = { known: [], runs: {} }; persist();
          $('acct').hidden = true; home(); toast('Deleted');
        } catch (err) { console.warn(err); $('acct-del-err').textContent = err.message || errText(err); $('acct-del-go').disabled = false; }
      });
    }
    body.insertAdjacentHTML('beforeend', '<a class="linkish" href="privacy.html">Privacy policy</a>');
    $('acct').hidden = false;
    // Say so instead of silently waiting when the server can't be reached.
    o.ready.then(ok => { if (!ok && $('acct-err')) $('acct-err').textContent = 'Can’t reach the server right now — check your connection and try again.'; });
  }
  $('acct-close').addEventListener('click', () => { $('acct').hidden = true; });
  $('acct-rename').addEventListener('click', () => { $('acct').hidden = true; askName(account); });

  // ── Friends ───────────────────────────────────────────────
  async function rankFriends() {
    const list = $('rank-list'), meBox = $('rank-me');
    list.innerHTML = '';
    meBox.innerHTML = '<p class="note">Loading…</p>';
    const o = on();
    if (!o || !(await o.ready)) { meBox.innerHTML = '<p class="note">Friends need an internet connection.</p>'; return; }
    if (!o.name) {
      meBox.innerHTML = '<button class="big" id="fr-nick">Pick a nickname to add friends</button>';
      $('fr-nick').addEventListener('click', () => askName(ranks));
      return;
    }
    try {
      await o.submit(null, 0, totals());
      const rows = await o.friendsBoard();
      meBox.innerHTML = `<div class="fr-top">
        <form class="code-row" id="fr-add" autocomplete="off"><input id="fr-name" placeholder="Friend’s nickname" spellcheck="false" autocapitalize="off"><button class="ghost" type="submit">Add</button></form>
        <p class="err" id="fr-err"></p>
        <button class="ghost" id="fr-share">📨 Send my friend link</button></div>`;
      list.innerHTML = rows.length > 1 ? rows.map((r, i) =>
        `<li class="${r.mine ? 'mine' : ''}"><span class="pos">${medal(i)}</span><span class="who">${esc(r.name)}${r.helped ? ` <i class="helped" title="Friends helped">🤝${r.helped}</i>` : ''}</span><span class="st">★ ${r.stars}</span>`
        + (r.mine ? `<span class="mv">you</span>` : `<button class="unfriend" data-uid="${esc(r.uid)}" data-name="${esc(r.name)}" aria-label="Remove">✕</button>`) + '</li>').join('')
        : '<p class="note">Add friends by nickname, or send them your link — then you can race each other here.</p>';
      $('fr-add').addEventListener('submit', async e => {
        e.preventDefault();
        $('fr-err').textContent = '';
        try { const n = await o.addFriend($('fr-name').value); toast(`${n} added`); rankFriends(); }
        catch (err) { $('fr-err').textContent = err.message || errText(err); }
      });
      $('fr-share').addEventListener('click', () => share('Happy Blocks', `Add me as a friend on Happy Blocks — I’m ${o.name}!`, link('f', o.uid)));
      list.querySelectorAll('.unfriend').forEach(b => b.addEventListener('click', async () => {
        if (!await ask(`Remove ${b.dataset.name} from your friends?`, { ok: 'Remove', danger: true })) return;
        try { await o.removeFriend(b.dataset.uid); rankFriends(); } catch (e) { toast(errText(e)); }
      }));
    } catch (e) {
      console.warn(e);
      meBox.innerHTML = `<p class="note">${esc(errText(e))}<br><button class="ghost small" id="rank-retry">Try again</button></p>`;
      $('rank-retry').addEventListener('click', ranks);
    }
  }
  // From the players board, or a friend link.
  function offerFriend(f, name) {
    needName(async () => {
      const o = on();
      if (f === o.uid) return;
      if (o.friends.includes(f)) { toast(`${name || 'They'} ${name ? 'is' : 'are'} already your friend`); return; }
      if (!await ask(`Add ${name || 'this player'} as a friend?`, { ok: 'Add friend' })) return;
      try { const n = await o.addFriendId(f); toast(`${n} added to your friends`); } catch (e) { toast(e.message || errText(e)); }
    });
  }
  window.addEventListener('online-user', () => { cur = null; });

  // ── Help requests: ask friends to solve a level; their solution comes back ──
  const DONE = 'unblock_help_done';
  let done = new Set();
  try { done = new Set(JSON.parse(localStorage.getItem(DONE) || '[]')); } catch (e) {}
  const markDone = id => { done.add(id); try { localStorage.setItem(DONE, JSON.stringify([...done].slice(-200))); } catch (e) {} };
  let asking = null; // { level, id } while the "Ask for help" card is open
  const picked = () => [...document.querySelectorAll('#help-friends input:checked')].map(x => x.value);

  async function askHelp(i) {
    const o = on();
    if (!o || !(await o.ready)) return shareLevel(i);   // offline: just a link to the level
    if (!o.name) { askName(() => askHelp(i)); return; }
    asking = { level: i, id: null };
    $('help-what').textContent = `Level ${i + 1} · par ${LEVELS[i].par}. The friends you pick see it on their home screen. When one solves it, their moves come back to you.`;
    $('help-friends').innerHTML = '<p class="note small">Loading friends…</p>';
    $('help-err').textContent = '';
    $('help-send').hidden = true;
    $('help-ask').hidden = false;
    try {
      const rows = (await o.friendsBoard()).filter(r => !r.mine);
      $('help-friends').innerHTML = rows.length
        ? rows.map(r => `<label class="pick"><input type="checkbox" value="${esc(r.uid)}" checked><span>${esc(r.name)}</span></label>`).join('')
        : '<p class="note small">No friends yet — add them on Leaderboard → Friends, or share a link.</p>';
      $('help-send').hidden = !rows.length;
    } catch (e) { console.warn(e); $('help-friends').innerHTML = `<p class="note small">${esc(errText(e))}</p>`; }
  }
  $('help-pill').addEventListener('click', () => { $('help-sheet').hidden = false; helpBox(); });
  $('help-sheet-close').addEventListener('click', () => { $('help-sheet').hidden = true; });
  $('help-cancel').addEventListener('click', () => { $('help-ask').hidden = true; asking = null; });
  $('help-send').addEventListener('click', async () => {
    const to = picked();
    if (!to.length) { $('help-err').textContent = 'Pick at least one friend'; return; }
    $('help-send').disabled = true;
    try {
      await on().askHelp(asking.level, LEVELS[asking.level].par, to);
      $('help-ask').hidden = true;
      toast(`Asked ${to.length} friend${to.length === 1 ? '' : 's'} — you’ll see their solution on the home screen`);
    } catch (e) { console.warn(e); $('help-err').textContent = errText(e); }
    $('help-send').disabled = false;
  });
  $('help-link').addEventListener('click', () => {
    // The id is made here so the share sheet opens straight away (phones only allow it right after a tap).
    const o = on(), a = asking;
    if (!a.id) { a.id = o.newHelpId(); o.askHelp(a.level, LEVELS[a.level].par, picked(), a.id).catch(e => { console.warn(e); toast(errText(e)); }); }
    shareLevel(a.level, a.id);
  });

  // Home screen: friends asking me, and solutions for my own requests.
  let boxBusy = false;
  async function helpBox() {
    const box = $('help-box'), o = on();
    if (!o || !o.name) { box.innerHTML = ''; $('help-pill').hidden = true; return; }
    if (boxBusy || !(await o.ready)) return;
    boxBusy = true;
    try {
      const [inc, mine] = await Promise.all([o.incomingHelp(), o.myHelp()]);
      const cards = [];
      for (const h of inc) if (!done.has(h.id))
        cards.push(`<div class="help-card"><span>🆘 <b>${esc(h.fromName)}</b> is stuck on <b>Level ${h.level + 1}</b> · par ${h.par}</span>
          <button class="hc-go" data-help="${h.id}">Help</button><button class="hc-x" data-hide="${h.id}" aria-label="Hide">✕</button></div>`);
      for (const h of mine) {
        for (const a of h.answers) cards.push(`<div class="help-card got"><span>💡 <b>${esc(a.name)}</b> solved your <b>Level ${h.level + 1}</b> in ${a.moves} moves</span>
          <button class="hc-go" data-see="${h.id}" data-who="${esc(a.uid)}">See how</button><button class="hc-x" data-close="${h.id}" aria-label="Done">✕</button></div>`);
        if (!h.answers.length) cards.push(`<div class="help-card wait"><span>⏳ Waiting for help on <b>Level ${h.level + 1}</b></span>
          <button class="hc-x" data-close="${h.id}" aria-label="Cancel">✕</button></div>`);
      }
      box.innerHTML = cards.join('') || '<p class="note small">Nothing here right now.</p>';
      // On the home screen: one small line for the most useful thing, the rest in the Help sheet.
      const asks = inc.filter(h => !done.has(h.id)), sols = mine.flatMap(h => h.answers.map(a => ({ h, a }))), waiting = mine.filter(h => !h.answers.length);
      const more = asks.length + sols.length + waiting.length - 1;
      const top = sols.length ? `💡 ${esc(sols[0].a.name)} sent a solution` : asks.length ? `🆘 ${esc(asks[0].fromName)} needs help` : waiting.length ? `⏳ Waiting for help · Level ${waiting[0].level + 1}` : '';
      $('help-pill').innerHTML = top ? `${top}${more > 0 ? ` <i>+${more}</i>` : ''}` : '';
      $('help-pill').hidden = !top;
      $('help-pill').classList.toggle('quiet', !sols.length && !asks.length);
      box.querySelectorAll('[data-help]').forEach(b => b.addEventListener('click', () => {
        const h = inc.find(x => x.id === b.dataset.help);
        start(h.level, { help: { id: h.id, from: h.from, fromName: h.fromName } });
      }));
      box.querySelectorAll('[data-see]').forEach(b => b.addEventListener('click', () => {
        const h = mine.find(x => x.id === b.dataset.see), a = h.answers.find(x => x.uid === b.dataset.who);
        start(h.level, { answer: { name: a.name, steps: a.steps } });
        $('hint').textContent = `Follow ${a.name}’s moves with 💡 Next move, or ▶ Watch them all.`;
      }));
      box.querySelectorAll('[data-hide]').forEach(b => b.addEventListener('click', () => { markDone(b.dataset.hide); boxBusy = false; helpBox(); }));
      box.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', async () => {
        if (!await ask('Remove this help request? Any solutions in it go too.', { ok: 'Remove', danger: true })) return;
        try { await o.closeHelp(b.dataset.close); } catch (e) { toast(errText(e)); }
        boxBusy = false; helpBox();
      }));
    } catch (e) { console.warn(e); }
    boxBusy = false;
  }

  // Solved a friend's level: send them my moves.
  async function sendSolution(ctx, steps) {
    const o = on(), box = $('win-help');
    if (!o || ctx.from === o.uid) return;
    const go = async () => {
      box.innerHTML = '<p class="note small">🤝 Sending your solution…</p>';
      try {
        const sent = await o.answerHelp(ctx.id, steps, totals());
        markDone(ctx.id);
        box.innerHTML = `<p class="note small">🤝 ${sent ? `Sent to ${esc(ctx.fromName)} — thanks for helping!` : `${esc(ctx.fromName)} already has a solution from you with fewer moves.`}</p>`;
      } catch (e) { console.warn(e); box.innerHTML = `<p class="note small">${esc(errText(e))}</p>`; }
    };
    if (o.name) return go();
    box.innerHTML = `<button class="ghost join" id="help-nick">🤝 Pick a nickname to send it to ${esc(ctx.fromName)}</button>`;
    $('help-nick').addEventListener('click', () => askName(go));
  }

  // Opened from a help link (?level=N&help=ID): once online, this is "helping <friend>".
  async function takePendingHelp() {
    const o = on();
    if (!pendingHelp || !o || !(await o.ready)) return;
    const ph = pendingHelp; pendingHelp = null;
    try {
      const h = await o.getHelp(ph.id);
      if (!h || h.from === o.uid || $('game').hidden || idx !== ph.level) return;
      helpCtx = { id: h.id, from: h.from, fromName: h.fromName };
      $('hint').textContent = `🤝 Helping ${h.fromName} — solve it and your moves go to them.`;
    } catch (e) { console.warn(e); }
  }
  window.addEventListener('online-ready', () => { takePendingHelp(); on().ready.then(() => { if (!$('home').hidden) helpBox(); }); });
  window.addEventListener('online-user', () => { if (!$('home').hidden) helpBox(); });

  // ── Links: #join=CODE (team), #c=CODE (challenge), #f=UID (friend) ──
  function route() {
    const fm = location.hash.match(/^#f=([A-Za-z0-9]{10,40})$/);
    const m = location.hash.match(/^#(join|c)=([A-Za-z0-9]{6})$/);
    if (!m && !fm) return;
    window.history.replaceState(null, '', location.pathname + location.search);
    if (fm) {
      on().ready.then(async () => {
        try { const p = await on().getFriendName(fm[1]); offerFriend(fm[1], p); } catch (e) { offerFriend(fm[1]); }
      });
      return;
    }
    const code = m[2].toUpperCase();
    if (m[1] === 'join') { pendingJoin = code; team(); } else openCh(code);
  }
  window.addEventListener('hashchange', route);
  if (/^#(join|c|f)=/.test(location.hash)) {
    if (window.Online) route(); else window.addEventListener('online-ready', route, { once: true });
  }

  $('to-chs').addEventListener('click', list);
  $('to-team').addEventListener('click', team);
  $('chs-back').addEventListener('click', home);
  $('ch-back').addEventListener('click', list);
  $('team-back').addEventListener('click', home);

  return { rankTeams, rankFriends, offerFriend, account, openCh, list, team, askHelp, helpBox, sendSolution };
})();
