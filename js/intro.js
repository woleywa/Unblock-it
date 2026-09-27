// Happy Blocks — "New!" pop-ups: the first time a level uses something new, a card with a tiny
// board that plays how it works on a loop, and an "OK, got it" button.
const Intro = (() => {
  const SEEN = 'unblock_seen_intros';
  const seen = () => { try { return JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch (e) { return []; } };
  const markSeen = k => { try { localStorage.setItem(SEEN, JSON.stringify([...new Set([...seen(), k])])); } catch (e) {} };

  const CS = 46, GUT = 23;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let run = 0; // bumps when the card closes, so a playing scene stops

  // A tiny board: W×H cells, walls, doors, and things on it that the scene script moves around.
  function board(host, W, H, walls = []) {
    host.innerHTML = '';
    Object.assign(host.style, { width: W * CS + 2 * GUT + 'px', height: H * CS + 2 * GUT + 'px' });
    const wl = new Set(walls.map(([r, c]) => r + ',' + c));
    for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
      const d = document.createElement('div');
      d.className = wl.has(r + ',' + c) ? 'wall' : 'cell';
      Object.assign(d.style, { left: GUT + c * CS + 3 + 'px', top: GUT + r * CS + 3 + 'px', width: CS - 6 + 'px', height: CS - 6 + 'px', borderRadius: Math.round(CS * 0.2) + 'px' });
      host.appendChild(d);
    }
    const xy = (r, c) => [GUT + c * CS, GUT + r * CS];
    const put = (d, r, c) => { const [x, y] = xy(r, c); d.style.transform = `translate(${x}px, ${y}px)`; d.style.setProperty('--z', 1 + Math.round(r) + (+d.dataset.h || 1)); d._rc = [r, c]; };
    const S = {
      xy,
      door(side, start, len, color, frozen) {
        const t = GUT - 10, along = GUT + start * CS + 4, l = len * CS - 8;
        const box = side === 'L' ? { left: '5px', top: along + 'px', width: t + 'px', height: l + 'px' }
          : side === 'R' ? { left: GUT + W * CS + 5 + 'px', top: along + 'px', width: t + 'px', height: l + 'px' }
          : side === 'T' ? { top: '5px', left: along + 'px', height: t + 'px', width: l + 'px' }
          : { top: GUT + H * CS + 5 + 'px', left: along + 'px', height: t + 'px', width: l + 'px' };
        const d = Art.door({ side, len, color, frozen }, box, GUT);
        d._door = { side, start, len, color, box };
        host.appendChild(d);
        return d;
      },
      block(p, r, c) {
        const d = document.createElement('div');
        d.className = 'block';
        Object.assign(d.style, { width: p.w * CS + 'px', height: p.h * CS + 'px' });
        d.dataset.h = p.h;
        d.innerHTML = Art.blockSVG(p, CS);
        d._p = p;
        put(d, r, c);
        host.appendChild(d);
        return d;
      },
      redraw(d, p) { d._p = p; d.innerHTML = Art.blockSVG(p, CS); },
      lane(r, c, col) {
        const d = Art.lane(col, CS, { left: GUT + c * CS + 3 + 'px', top: GUT + r * CS + 3 + 'px', width: CS - 6 + 'px', height: CS - 6 + 'px', borderRadius: Math.round(CS * 0.2) + 'px' });
        host.appendChild(d);
        return d;
      },
      fire(n, r, c) { const d = Art.fire(n, CS); d.dataset.h = 1; put(d, r, c); host.appendChild(d); return d; },
      forest(r, c) { const d = Art.forest(CS); d.dataset.h = 1; put(d, r, c); host.appendChild(d); return d; },
      put,
    };
    return S;
  }

  // Stand-in for a pointer: the drags move the blocks on their own (a drawn finger lagged behind them).
  function finger() { return document.createElement('div'); }

  // Drag block d along cells [[r,c], …] with the finger, one smooth glide per step.
  async function drag(S, f, d, path, id) {
    const [r0, c0] = d._rc, p = d._p;
    const at = (r, c) => { const [x, y] = S.xy(r, c); return [x + p.w * CS / 2, y + p.h * CS / 2]; };
    let [fx, fy] = at(r0, c0);
    f.style.transition = 'transform 0.35s ease, opacity 0.2s';
    f.style.transform = `translate(${fx}px, ${fy}px)`;
    f.style.opacity = 1;
    await wait(420);
    if (id !== run) return;
    f.classList.add('press');
    d.classList.add('dragging');
    await wait(160);
    for (const [r, c] of path) {
      if (id !== run) return;
      S.put(d, r, c);
      [fx, fy] = at(r, c);
      f.style.transform = `translate(${fx}px, ${fy}px)`;
      await wait(260);
    }
  }
  function release(f, d) {
    f.classList.remove('press');
    d.classList.remove('dragging');
    d.classList.add('settle');
    setTimeout(() => d.classList.remove('settle'), 400);
  }
  function lift(f) { f.style.opacity = 0; }

  // Drag a block out through a door: into the door, then gone with sparks.
  async function out(S, host, f, d, side, id) {
    const [r, c] = d._rc, p = d._p;
    const dr = { T: -1, B: 1, L: 0, R: 0 }[side], dc = { L: -1, R: 1, T: 0, B: 0 }[side];
    const far = side === 'T' || side === 'B' ? p.h + 0.4 : p.w + 0.4;
    await drag(S, f, d, [[r + dr * 0.6, c + dc * 0.6]], id);
    if (id !== run) return;
    lift(f);
    d.classList.remove('dragging');
    d.classList.add('leaving');
    S.put(d, r + dr * far, c + dc * far);
    const [x, y] = S.xy(r + (dr > 0 ? p.h : dr < 0 ? 0 : p.h / 2), c + (dc > 0 ? p.w : dc < 0 ? 0 : p.w / 2));
    Art.burst(host, x, y, p.color, [dc, dr]);
    await wait(420);
    d.remove();
  }

  // How each thing works, as a little looping play. Each returns when one round is over.
  const SCENES = {
    basics: {
      title: 'How to play',
      text: 'Drag each block out through the door of its colour. Fewer moves = more stars ⭐',
      async play(host, id) {
        const S = board(host, 4, 3);
        S.door('R', 1, 1, 'red'); S.door('T', 0, 2, 'blue');
        const red = S.block({ w: 1, h: 1, color: 'red' }, 1, 0);
        const blue = S.block({ w: 2, h: 1, color: 'blue' }, 1, 2);
        const f = finger(host);
        await wait(500);
        await out(S, host, f, blue, 'T', id);
        await drag(S, f, red, [[1, 1], [1, 2], [1, 3]], id); if (id !== run) return;
        await out(S, host, f, red, 'R', id);
      },
    },
    walls: {
      title: 'Walls',
      text: 'Blocks can’t pass walls. Find a way around them.',
      async play(host, id) {
        const S = board(host, 4, 3, [[1, 2]]);
        S.door('R', 0, 1, 'green');
        const g = S.block({ w: 1, h: 1, color: 'green' }, 1, 0);
        const f = finger(host);
        await wait(500);
        await drag(S, f, g, [[1, 1], [1, 1.25]], id); if (id !== run) return;
        S.put(g, 1, 1); g.classList.add('shake'); Sound.bump && Sound.bump(); await wait(350); g.classList.remove('shake');
        await drag(S, f, g, [[0, 1], [0, 2], [0, 3]], id); if (id !== run) return;
        await out(S, host, f, g, 'R', id);
      },
    },
    ice: {
      title: 'Ice',
      text: 'Frozen blocks can’t move. Each block that leaves melts them one step — at 0 they thaw.',
      async play(host, id) {
        const S = board(host, 4, 3);
        S.door('R', 1, 2, 'red'); S.door('T', 0, 1, 'blue');
        const iceP = { w: 1, h: 1, color: 'blue', ice: 2 };
        const ice = S.block(iceP, 0, 0);
        const a = S.block({ w: 1, h: 1, color: 'red' }, 1, 2), b = S.block({ w: 1, h: 1, color: 'red' }, 2, 1);
        const f = finger(host);
        await wait(500);
        await out(S, host, f, a, 'R', id); if (id !== run) return;
        S.redraw(ice, { ...iceP, ice: 1 }); ice.classList.add('thawed'); await wait(500); ice.classList.remove('thawed');
        await drag(S, f, b, [[2, 2], [2, 3]], id); if (id !== run) return;
        await out(S, host, f, b, 'R', id); if (id !== run) return;
        S.redraw(ice, { ...iceP, ice: 0 }); ice.classList.add('thawed'); await wait(600); ice.classList.remove('thawed');
        await out(S, host, f, ice, 'T', id);
      },
    },
    frozen: {
      title: 'Frozen doors',
      text: 'A frozen door opens after that many blocks have left.',
      async play(host, id) {
        const S = board(host, 4, 3);
        const fd = S.door('R', 1, 1, 'pink', 2); S.door('B', 0, 2, 'yellow');
        const pk = S.block({ w: 1, h: 1, color: 'pink' }, 1, 2);
        const y1 = S.block({ w: 1, h: 1, color: 'yellow' }, 2, 0), y2 = S.block({ w: 1, h: 1, color: 'yellow' }, 0, 1);
        const f = finger(host);
        const count = n => { if (n) fd.querySelector('b').textContent = n; else { const nd = S.door('R', 1, 1, 'pink'); nd.classList.add('pulse'); fd.remove(); } };
        await wait(500);
        await out(S, host, f, y1, 'B', id); if (id !== run) return;
        count(1); fd.classList.add('pulse'); await wait(450);
        await drag(S, f, y2, [[1, 1], [2, 1]], id); if (id !== run) return;
        await out(S, host, f, y2, 'B', id); if (id !== run) return;
        count(0); await wait(500);
        await drag(S, f, pk, [[1, 3]], id); if (id !== run) return;
        await out(S, host, f, pk, 'R', id);
      },
    },
    layered: {
      title: 'Layered blocks',
      text: 'The outside leaves through its door. The core stays behind — then take it to its own door.',
      async play(host, id) {
        const S = board(host, 4, 3);
        S.door('R', 1, 1, 'purple'); S.door('B', 0, 1, 'yellow');
        const P = { w: 1, h: 1, color: 'purple', inner: 'yellow' };
        const blk = S.block(P, 1, 1);
        const f = finger(host);
        await wait(500);
        await drag(S, f, blk, [[1, 2], [1, 3]], id); if (id !== run) return;
        // The shell flies out, the core drops back into place.
        lift(f); release(f, blk);
        const [x, y] = S.xy(1.5, 4); Art.burst(host, x, y, 'purple', [1, 0]);
        S.redraw(blk, { w: 1, h: 1, color: 'yellow' }); blk.classList.add('thawed');
        await wait(650); blk.classList.remove('thawed');
        await drag(S, f, blk, [[1, 2], [1, 1], [1, 0], [2, 0]], id); if (id !== run) return;
        await out(S, host, f, blk, 'B', id);
      },
    },
    fire: {
      title: 'Fire!',
      text: 'Nothing can cross fire. Each water block you drag out sprays every fire once — out fire, open road.',
      async play(host, id) {
        const S = board(host, 4, 3);
        S.door('R', 1, 1, 'red'); S.door('B', 0, 1, 'water');
        const fire = S.fire(1, 1, 2);
        const red = S.block({ w: 1, h: 1, color: 'red' }, 1, 0);
        const w = S.block({ w: 1, h: 1, color: 'water' }, 2, 1);
        const f = finger(host);
        await wait(500);
        await drag(S, f, red, [[1, 1], [1, 1.2]], id); if (id !== run) return;
        S.put(red, 1, 1); red.classList.add('shake'); await wait(350); red.classList.remove('shake');
        await drag(S, f, w, [[2, 0]], id); if (id !== run) return;
        await out(S, host, f, w, 'B', id); if (id !== run) return;
        const [x0, y0] = S.xy(3, 0.5), [x1, y1] = S.xy(1.5, 2.5);
        Art.sprinkle(host, x0, y0, x1, y1);
        Sound.splash && Sound.splash();
        await wait(480);
        Art.steam(host, x1, y1, true);
        fire.style.transition = 'opacity 0.4s, transform 0.4s'; fire.style.opacity = 0;
        await wait(500); fire.remove();
        await drag(S, f, red, [[1, 2], [1, 3]], id); if (id !== run) return;
        await out(S, host, f, red, 'R', id);
      },
    },
    prison: {
      title: 'Prison',
      text: 'Blocks behind bars can’t move. Every 🔑 key block you drag out opens one lock — at 0 they’re free.',
      async play(host, id) {
        const S = board(host, 4, 3);
        S.door('T', 1, 1, 'blue'); S.door('B', 0, 1, 'red'); S.door('B', 3, 1, 'red');
        const JP = { w: 1, h: 1, color: 'blue', lock: 2, lockColor: 'gold' };
        const jail = S.block(JP, 1, 1);
        const k1 = S.block({ w: 1, h: 1, color: 'red', key: true, keyColor: 'gold' }, 1, 0);
        const k2 = S.block({ w: 1, h: 1, color: 'red', key: true, keyColor: 'gold' }, 1, 3);
        const f = finger(host);
        await wait(500);
        jail.classList.add('shake'); await wait(400); jail.classList.remove('shake');
        await drag(S, f, k1, [[2, 0]], id); if (id !== run) return;
        await out(S, host, f, k1, 'B', id); if (id !== run) return;
        S.redraw(jail, { ...JP, lock: 1 }); jail.classList.add('thawed'); await wait(450); jail.classList.remove('thawed');
        await drag(S, f, k2, [[2, 3]], id); if (id !== run) return;
        await out(S, host, f, k2, 'B', id); if (id !== run) return;
        S.redraw(jail, { w: 1, h: 1, color: 'blue' }); jail.classList.add('thawed');
        const [x, y] = S.xy(1.5, 1.5); Art.burst(host, x, y, 'gold', [0, -1]);
        await wait(700); jail.classList.remove('thawed');
        await drag(S, f, jail, [[0, 1]], id); if (id !== run) return;
        await out(S, host, f, jail, 'T', id);
      },
    },
    lanes: {
      title: 'Colour lanes',
      text: 'Striped floor lanes let only blocks of their colour across. Everyone else has to go around.',
      async play(host, id) {
        const S = board(host, 4, 3);
        S.lane(0, 2, 'green'); S.lane(1, 2, 'green');
        S.door('R', 0, 1, 'green'); S.door('R', 1, 1, 'red');
        const red = S.block({ w: 1, h: 1, color: 'red' }, 1, 0);
        const g = S.block({ w: 1, h: 1, color: 'green' }, 0, 1);
        const f = finger(host);
        await wait(500);
        // Red can't get onto the green lane…
        await drag(S, f, red, [[1, 1], [1, 1.25]], id); if (id !== run) return;
        S.put(red, 1, 1); red.classList.remove('dragging'); red.classList.add('shake'); await wait(350); red.classList.remove('shake');
        // …green crosses it easily…
        await drag(S, f, g, [[0, 2], [0, 3]], id); if (id !== run) return;
        await out(S, host, f, g, 'R', id); if (id !== run) return;
        // …and red goes around.
        await drag(S, f, red, [[2, 1], [2, 2], [2, 3], [1, 3]], id); if (id !== run) return;
        await out(S, host, f, red, 'R', id);
      },
    },
    arrows: {
      title: 'Arrow blocks',
      text: 'Blocks with arrows only slide the way the arrows point — ↔ or ↕.',
      async play(host, id) {
        const S = board(host, 4, 3);
        S.door('R', 1, 1, 'blue'); S.door('T', 0, 1, 'green');
        const a = S.block({ w: 1, h: 1, color: 'blue', axis: 'h' }, 1, 0);
        const g = S.block({ w: 1, h: 1, color: 'green' }, 1, 2);
        const f = finger(host);
        await wait(500);
        // Up doesn't work: it only goes sideways.
        await drag(S, f, a, [[0.8, 0]], id); if (id !== run) return;
        S.put(a, 1, 0); a.classList.add('shake'); await wait(350); a.classList.remove('shake');
        await drag(S, f, a, [[1, 1]], id); if (id !== run) return;
        a.classList.remove('dragging'); a.classList.add('shake'); await wait(350); a.classList.remove('shake');
        await drag(S, f, g, [[0, 2]], id); if (id !== run) return;
        await out(S, host, f, g, 'T', id); if (id !== run) return;
        await drag(S, f, a, [[1, 2], [1, 3]], id); if (id !== run) return;
        await out(S, host, f, a, 'R', id);
      },
    },
    beaver: {
      title: 'Beavers!',
      text: 'Pull a beaver onto a tree and it eats it — something may be hiding inside. Each beaver eats one tree, and every tree must go.',
      async play(host, id) {
        const S = board(host, 4, 3);
        S.door('T', 3, 1, 'yellow');
        const hidden = S.block({ w: 1, h: 1, color: 'yellow' }, 0, 3);
        hidden.style.opacity = 0;
        const trees = S.forest(0, 3);
        const bv = S.block({ w: 1, h: 1, color: 'beaver' }, 2, 0);
        const f = finger(host);
        await wait(500);
        await drag(S, f, bv, [[2, 1], [2, 2], [2, 3], [1, 3], [0.6, 3]], id); if (id !== run) return;
        // Pulled onto the tree: it hops on, chomps, and is gone.
        lift(f); bv.classList.remove('dragging'); bv.classList.add('hop');
        S.put(bv, 0, 3); bv.style.setProperty('--z', 60);
        await wait(260); if (id !== run) return;
        bv.classList.add('chomp'); Sound.munch && Sound.munch();
        trees.classList.add('eaten');
        const [x, y] = S.xy(0.5, 3.5);
        [0, 160, 320].forEach(t => setTimeout(() => { Art.burst(host, x, y, 'wood', [0, -1]); Art.burst(host, x, y, 'leaf', [0, 1]); }, t));
        await wait(440); bv.classList.add('full');
        await wait(350); bv.remove(); trees.remove();
        hidden.style.transition = 'opacity 0.3s'; hidden.style.opacity = 1; hidden.classList.add('thawed');
        await wait(700);
        await out(S, host, f, hidden, 'T', id);
      },
    },
  };

  async function loop(key, id) {
    const host = document.getElementById('intro-board');
    while (id === run) {
      await SCENES[key].play(host, id);
      await wait(900);
    }
  }

  // Show the card for `key`. Only the first time, unless `again`.
  function show(key, again) {
    if (!SCENES[key] || (!again && seen().includes(key))) return false;
    const sc = SCENES[key];
    document.getElementById('intro-title').textContent = sc.title;
    document.getElementById('intro-text').textContent = sc.text;
    document.getElementById('intro').hidden = false;
    Art.defs();
    loop(key, ++run);
    markSeen(key);
    return true;
  }
  function close() {
    run++;
    document.getElementById('intro').hidden = true;
    document.getElementById('intro-board').innerHTML = '';
  }
  document.getElementById('intro-ok').addEventListener('click', close);

  return { show, close, has: k => !!SCENES[k], reset: () => { try { localStorage.removeItem(SEEN); } catch (e) {} } };
})();
