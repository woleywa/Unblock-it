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
      // A post at (pr, pc) and a chain to block d, redrawn every frame while the scene plays.
      chain(d, pr, pc, len) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', W * CS + 2 * GUT); svg.setAttribute('height', H * CS + 2 * GUT);
        Object.assign(svg.style, { position: 'absolute', left: 0, top: 0, zIndex: 0, pointerEvents: 'none', overflow: 'visible' });
        host.appendChild(svg);
        const [x0, y0] = xy(pr + 0.5, pc + 0.5);
        let on = true;
        const tick = () => {
          if (!on) return;
          const hb = host.getBoundingClientRect(), bb = d.isConnected ? d.getBoundingClientRect() : null;
          let h = `<circle cx="${x0}" cy="${y0}" r="${CS * 0.22}" fill="#8a6a44" stroke="#4a3520" stroke-width="${CS * 0.05}"/><circle cx="${x0}" cy="${y0 - CS * 0.05}" r="${CS * 0.12}" fill="#b89366"/>`
            + `<circle cx="${x0 + CS * 0.27}" cy="${y0 - CS * 0.27}" r="${CS * 0.15}" fill="#fff" stroke="#2b2f45" stroke-width="${CS * 0.02}"/><text x="${x0 + CS * 0.27}" y="${y0 - CS * 0.27 + CS * 0.075}" text-anchor="middle" font-size="${CS * 0.2}" font-weight="700" fill="#2b2f45" font-family="Fredoka, system-ui, sans-serif">${len}</text>`;
          if (bb && !d.classList.contains('leaving')) {
            const x1 = bb.left - hb.left + bb.width / 2, y1 = bb.top - hb.top + bb.height / 2;
            const dist = Math.abs(x1 - x0) / CS + Math.abs(y1 - y0) / CS, slack = Math.max(0, len - dist) / len;
            const pth = `M${x0},${y0} Q${(x0 + x1) / 2},${(y0 + y1) / 2 + CS * 0.45 * slack} ${x1},${y1}`;
            h = `<path d="${pth}" fill="none" stroke="#2b2f45" stroke-width="${CS * 0.16}" stroke-linecap="round"/><path d="${pth}" fill="none" stroke="#b9c0d8" stroke-width="${CS * 0.1}" stroke-linecap="round" stroke-dasharray="${CS * 0.16} ${CS * 0.1}"/>` + h;
          }
          svg.innerHTML = h;
          requestAnimationFrame(tick);
        };
        tick();
        return () => { on = false; };
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
  // Glide block d along cells [[r,c], …] in one smooth move (a short pause first, like picking it up).
  async function drag(S, f, d, path, id) {
    await wait(300);
    if (id !== run) return;
    d.classList.add('dragging');
    const pts = [d._rc, ...path];
    const tf = ([r, c]) => { const [x, y] = S.xy(r, c); return `translate(${x}px, ${y}px)`; };
    // Time per stretch in proportion to its length, so the speed stays even along the route.
    const len = pts.slice(1).map((q, i) => Math.hypot(q[0] - pts[i][0], q[1] - pts[i][1]));
    const total = len.reduce((a, b) => a + b, 0) || 1;
    let run0 = 0;
    const frames = pts.map((q, i) => { if (i) run0 += len[i - 1]; return { transform: tf(q), offset: run0 / total }; });
    const [r, c] = path[path.length - 1];
    await d.animate(frames, { duration: Math.max(260, total * 230), easing: 'ease-in-out' }).finished.catch(() => {});
    if (id !== run) return;
    S.put(d, r, c);
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
    if (id !== run) return;
    const [r, c] = d._rc, p = d._p;
    // A block only ever leaves through a door of its colour on that side, in line with it.
    const ok = [...host.querySelectorAll('.door')].some(e => { const g = e._door; if (!g || g.side !== side || g.color !== p.color) return false;
      const lo = side === 'L' || side === 'R' ? r : c, n = side === 'L' || side === 'R' ? p.h : p.w; return lo >= g.start && lo + n <= g.start + g.len; });
    if (!ok) console.warn('intro: no door for', p.color, side, r, c);
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
        S.door('R', 1, 1, 'red'); S.door('T', 2, 2, 'blue');
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
        S.door('R', 1, 1, 'red'); S.door('B', 1, 1, 'water');
        const fire = S.fire(1, 1, 2);
        const red = S.block({ w: 1, h: 1, color: 'red' }, 1, 0);
        const w = S.block({ w: 1, h: 1, color: 'water' }, 2, 1);
        const f = finger(host);
        await wait(500);
        await drag(S, f, red, [[1, 1], [1, 1.2]], id); if (id !== run) return;
        S.put(red, 1, 1); red.classList.add('shake'); await wait(350); red.classList.remove('shake');
        await out(S, host, f, w, 'B', id); if (id !== run) return;
        const [x0, y0] = S.xy(3, 1.5), [x1, y1] = S.xy(1.5, 2.5);
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
    chains: {
      title: 'Chains',
      text: 'A chained block only goes as far as its chain reaches (the number on the post) — so it needs a door within reach.',
      async play(host, id) {
        const S = board(host, 4, 3);
        S.door('T', 1, 1, 'red'); S.door('R', 0, 1, 'blue');
        const red = S.block({ w: 1, h: 1, color: 'red' }, 1, 1);
        const blue = S.block({ w: 1, h: 1, color: 'blue' }, 0, 1);
        const stop = S.chain(red, 1, 0, 2);
        const f = finger(host);
        await wait(500);
        // As far as it goes: the chain pulls tight…
        await drag(S, f, red, [[1, 2], [1, 2.25]], id); if (id !== run) return stop();
        S.put(red, 1, 2); red.classList.remove('dragging'); red.classList.add('shake'); await wait(400); red.classList.remove('shake');
        // …so clear the way to the door that's in reach.
        await drag(S, f, blue, [[0, 2], [0, 3]], id); if (id !== run) return stop();
        await out(S, host, f, blue, 'R', id); if (id !== run) return stop();
        await drag(S, f, red, [[1, 1], [0, 1]], id); if (id !== run) return stop();
        await out(S, host, f, red, 'T', id);
        stop();
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
      title: 'Blocks on wheels',
      text: 'Blocks on wheels only roll one way: wheels underneath roll ↔, wheels on the side roll ↕.',
      async play(host, id) {
        const S = board(host, 4, 3);
        S.door('R', 1, 1, 'blue'); S.door('T', 2, 1, 'green');
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
