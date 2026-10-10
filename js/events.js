// Happy Blocks — Events tab (🎃): time-limited specials next to Puzzles and Story. Right now: Halloween —
// Mörfi's Halloween story (Story chapter 7), 20 spooky levels (js/halloween-levels.js), and rewards that
// unlock block styles and a sky for the whole game (Extras REWARDS with `ev: 'halloween'`).
// Progress lives in Extras meta.ev (synced with the account like the rest of meta).
const Events = (() => {
  const HW = {
    id: 'halloween', story: 7,
    until: new Date(2026, 10, 9), // shown as "x days left" until 8 Nov; still playable afterwards
    stages: ['Pumpkin patch', 'Trick or treat', 'Haunted house', 'Witching hour'],
    levels: typeof HALLOWEEN_LEVELS !== 'undefined' ? HALLOWEEN_LEVELS : [],
  };
  HW.levels.forEach(l => { l.theme = 'halloween'; });

  const data = () => Extras.evData(HW.id);
  const solved = () => Object.keys(data().s).filter(i => data().s[i] > 0).length;
  const starsGot = () => Object.values(data().s).reduce((a, b) => a + b, 0);
  const storyDone = () => ((Extras.meta().story || {})['ch' + HW.story]) === 'done';
  const unlocked = i => i === 0 || data().s[i - 1] > 0 || data().s[i] > 0;
  const daysLeft = () => Math.ceil((HW.until - Date.now()) / 86400000);

  // Rewards that are due (level count reached, story finished) but not handed out yet.
  function dueRewards() {
    return Extras.rewards(HW.id).filter(r => !Extras.owned(r.id) && (r.story ? storyDone() : solved() >= r.need));
  }

  function open() {
    show('events');
    Extras.theme('events');
    render();
    const due = dueRewards();
    if (due.length) setTimeout(() => celebrate(due), 350);
  }

  function render() {
    const n = HW.levels.length, got = solved(), st = storyDone(), going = typeof (Extras.meta().story || {})['ch' + HW.story] === 'number';
    const left = daysLeft();
    const rw = Extras.rewards(HW.id).map(r => {
      const has = Extras.owned(r.id);
      return `<div class="ev-rw ${has ? 'got' : ''}">${Extras.preview(r, 46)}<small>${has ? '✓' : r.story ? '📖' : `${Math.min(got, r.need)}/${r.need}`}</small></div>`;
    }).join('');
    let grid = '';
    HW.levels.forEach((lv, i) => {
      if (i % 5 === 0) grid += `<h3 class="ev-stage">${HW.stages[i / 5]}<small>★ ${[0, 1, 2, 3, 4].reduce((a, k) => a + (data().s[i + k] || 0), 0)} / 15</small></h3>`;
      const s = data().s[i] || 0, open = unlocked(i);
      grid += `<button class="ev-lvl ${open ? '' : 'locked'} ${s ? 'done' : ''} ${open && !s ? 'next' : ''}" data-i="${i}">${open ? `<b>${i + 1}</b><small>${[1, 2, 3].map(k => `<i class="${k <= s ? 'on' : ''}">★</i>`).join('')}</small>` : '<b>🔒</b>'}</button>`;
    });
    $('ev-body').innerHTML = `
      <div class="ev-hero">
        <div class="ev-title">Halloween</div>
        <div class="ev-sub">${left > 0 ? `🕸️ ${left} days left` : '🕸️ Still playable — back next October'}</div>
        <div class="ev-bar"><i style="width:${Math.round(got / n * 100)}%"></i></div>
        <small class="ev-count">${got} / ${n} levels · ★ ${starsGot()}</small>
      </div>
      <button class="ev-tile ev-story" id="ev-story"><span class="ev-ico">📖</span><span class="ev-txt"><b>Mörfi and the Halloween Ghost</b><small>${st ? '✅ Completed' : going ? 'In progress' : 'A spooky story with Puddy and Lilca'}</small></span><span class="ev-go">${st ? '↻' : '▶'}</span></button>
      <h3 class="ev-h">🎁 Rewards</h3><p class="ev-note">Block styles and a sky for the whole game</p>
      <div class="ev-rws">${rw}</div>
      <h3 class="ev-h">🎃 Spooky levels</h3>
      <div class="ev-grid">${grid}</div>`;
    $('ev-story').onclick = () => { Sound.unlock(); Story.start(st, HW.story); };
    document.querySelectorAll('.ev-lvl').forEach(b => b.onclick = () => { const i = +b.dataset.i; if (unlocked(i)) { Sound.unlock(); play(i); } });
  }

  // A Halloween level on the normal board (chPlay like the daily puzzle).
  function play(i) {
    const lv = HW.levels[i];
    begin(lv, `🎃 Halloween ${i + 1}`, i === 0 && !data().s[0] ? 'Trick or treat! Drag each block out through the door of its colour.' : '');
    chPlay = {
      event: HW.id, best: data().m[i],
      again: () => play(i),
      back: () => { chPlay = null; $('win').hidden = true; open(); },
      next: () => (i + 1 < HW.levels.length ? play(i + 1) : (chPlay = null, $('win').hidden = true, open())),
      won: (m, s) => {
        const d = data();
        d.s[i] = Math.max(d.s[i] || 0, s);
        d.m[i] = Math.min(d.m[i] || Infinity, m);
        Extras.save();
        if (window.Online && window.Online.name) window.Online.putSave(progress).catch(e => console.warn(e));
        $('win-best').innerHTML = '';
        $('next').hidden = false; $('to-ch').hidden = false;
        $('next').textContent = i + 1 < HW.levels.length ? 'Next level' : '🎃 Back to Halloween';
        $('to-ch').textContent = '🎃 Halloween';
        $('next').className = 'big'; $('replay').className = 'ghost'; $('replay').textContent = 'Play again';
        $('next').style.order = $('to-ch').style.order = '';
        const due = dueRewards();
        if (due.length) setTimeout(() => celebrate(due), 900);
      },
    };
    $('clock').hidden = true;
  }

  // New rewards: one card each, with "Use it" to wear it right away.
  function celebrate(list) {
    const r = list.shift();
    if (!r) return;
    const pic = Extras.unlock(r.id);
    Sound.win(); Art.confetti();
    $('chest-title').textContent = `New: ${r.name}!`;
    $('chest-body').innerHTML = `${pic}<p>${r.kind === 'sky' ? 'A new sky for the whole game.' : 'A new look for your blocks — in every level, not just Halloween.'}</p>`;
    $('chest-btns').innerHTML = '<button class="ghost" id="chest-later">Later</button><button class="big" id="chest-use">Use it</button>';
    $('chest').hidden = false;
    const next = () => { $('chest').hidden = true; if (!$('events').hidden) render(); setTimeout(() => celebrate(list), 250); };
    $('chest-later').onclick = next;
    $('chest-use').onclick = () => { const m = Extras.meta(); m.style[r.kind] = r.id; Extras.save(); Extras.applyStyle(); if (!$('game').hidden) Extras.theme(level); next(); };
  }

  // Called by show(): the night sky stays on in Events and Halloween levels, and goes when you leave.
  function screen(id) {
    if (id === 'events') return;
    if (id !== 'game' && id !== 'story') Extras.theme(null);
  }

  $('tab-events').addEventListener('click', () => { Sound.unlock(); open(); });
  return { open, screen, play, active: () => daysLeft() > 0 };
})();
