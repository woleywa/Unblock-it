// Happy Blocks — drawing: jelly blocks (one SVG shape per block), doors, sparks, confetti.
const Art = (() => {
  // light, base, dark, side (the block's visible thickness)
  const PAL = {
    red:    ['#ff7a82', '#e8263a', '#c0142a', '#860a1b'],
    blue:   ['#8db8ff', '#3d7bff', '#2a5fe3', '#1c42ad'],
    yellow: ['#fff5a0', '#ffe22e', '#f2c800', '#b08f00'],
    green:  ['#8ff2b0', '#2fcf6f', '#1dab56', '#12803f'],
    purple: ['#d8b0ff', '#a45cff', '#8439e8', '#6124b6'],
    orange: ['#ffb07a', '#ff7417', '#e85d00', '#a13d00'],
    pink:   ['#ffb0da', '#ff5fb2', '#ea3a92', '#b52470'],
    sky:    ['#a6eeff', '#3fd0ff', '#18aeee', '#0b83bc'],
    water:  ['#a8fff4', '#1fd6c6', '#0fb0a8', '#0a7d80'],
    beaver: ['#e2ae78', '#a86a38', '#834f26', '#5c3416'],
  };
  // Frozen blocks are ice all the way through: their colour stays hidden until they thaw.
  const ICE = ['#ffffff', '#dff4ff', '#b6e0fa', '#8cc3e6'];
  const NS = 'http://www.w3.org/2000/svg';

  // Shared gradients, once per page.
  function defs() {
    if (document.getElementById('art-defs')) return;
    const s = document.createElementNS(NS, 'svg');
    s.id = 'art-defs'; s.setAttribute('width', 0); s.setAttribute('height', 0); s.style.position = 'absolute';
    let h = '<defs>';
    for (const [k, [l, b, d]] of Object.entries({ ...PAL, ice: ICE })) {
      h += `<linearGradient id="face-${k}" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${l}"/><stop offset="0.45" stop-color="${b}"/><stop offset="1" stop-color="${d}"/></linearGradient>`;
      h += `<radialGradient id="core-${k}" cx="0.4" cy="0.3" r="0.9"><stop offset="0" stop-color="${l}"/><stop offset="0.6" stop-color="${b}"/><stop offset="1" stop-color="${d}"/></radialGradient>`;
    }
    h += '<linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>';
    h += '<linearGradient id="ice" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4fcff" stop-opacity="0.95"/><stop offset="0.5" stop-color="#c9ecff" stop-opacity="0.82"/><stop offset="1" stop-color="#9fd8ff" stop-opacity="0.8"/></linearGradient>';
    h += '</defs>';
    s.innerHTML = h;
    document.body.prepend(s);
  }

  // The true outline of a polyomino: trace its boundary edges into loops (clockwise on screen),
  // move every edge inward by `inset`, and round each corner — outer corners by `rad`, inner
  // (concave) ones by a little less, so the block reads as one soft piece of jelly.
  function shapePath(offs, cs, inset, rad) {
    const has = new Set(offs.map(([r, c]) => r + ',' + c));
    const edges = new Map();
    const add = (x0, y0, x1, y1) => edges.set(x0 + ',' + y0, [x1, y1]);
    for (const [r, c] of offs) {
      if (!has.has((r - 1) + ',' + c)) add(c, r, c + 1, r);
      if (!has.has(r + ',' + (c + 1))) add(c + 1, r, c + 1, r + 1);
      if (!has.has((r + 1) + ',' + c)) add(c + 1, r + 1, c, r + 1);
      if (!has.has(r + ',' + (c - 1))) add(c, r + 1, c, r);
    }
    let d = '';
    const seen = new Set();
    for (const startKey of edges.keys()) {
      if (seen.has(startKey)) continue;
      // Walk one loop of unit edges.
      const pts = [];
      let key = startKey;
      while (!seen.has(key)) {
        seen.add(key);
        pts.push(key.split(',').map(Number));
        const nx = edges.get(key);
        key = nx[0] + ',' + nx[1];
      }
      // Keep corners only.
      const n0 = pts.length;
      const corner = pts.filter((q, i) => {
        const a = pts[(i - 1 + n0) % n0], b = pts[(i + 1) % n0];
        return (q[0] - a[0]) * (b[1] - q[1]) - (q[1] - a[1]) * (b[0] - q[0]) !== 0;
      });
      const n = corner.length;
      const dir = (a, b) => [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])];
      // Inset: each vertex moves along the inward normals of its two edges.
      const V = corner.map((q, i) => {
        const a = corner[(i - 1 + n) % n], b = corner[(i + 1) % n];
        const d1 = dir(a, q), d2 = dir(q, b);
        return [q[0] * cs + inset * (-d1[1] - d2[1]), q[1] * cs + inset * (d1[0] + d2[0])];
      });
      for (let i = 0; i < n; i++) {
        const a = V[(i - 1 + n) % n], q = V[i], b = V[(i + 1) % n];
        const d1 = dir(a, q), d2 = dir(q, b);
        const convex = d1[0] * d2[1] - d1[1] * d2[0] > 0;
        const len1 = Math.hypot(q[0] - a[0], q[1] - a[1]), len2 = Math.hypot(b[0] - q[0], b[1] - q[1]);
        const r = Math.min(convex ? rad : rad * 0.55, len1 / 2, len2 / 2);
        const A = [q[0] - d1[0] * r, q[1] - d1[1] * r], B = [q[0] + d2[0] * r, q[1] + d2[1] * r];
        d += (i === 0 ? 'M' : 'L') + A[0].toFixed(2) + ',' + A[1].toFixed(2);
        d += `A${r.toFixed(2)},${r.toFixed(2)} 0 0 ${convex ? 1 : 0} ${B[0].toFixed(2)},${B[1].toFixed(2)}`;
      }
      d += 'Z';
    }
    return d;
  }

  // The cell nearest the middle of a block: where its face (or count) goes.
  function heart(offs, whole) {
    const mr = offs.reduce((a, q) => a + q[0], 0) / offs.length, mc = offs.reduce((a, q) => a + q[1], 0) / offs.length;
    if (whole) return [mr, mc];
    return offs.reduce((b, q) => Math.hypot(q[0] - mr, q[1] - mc) < Math.hypot(b[0] - mr, b[1] - mc) ? q : b);
  }

  // A little face: eyes (blinking), cheeks, and a mouth that turns into an "o" while dragged.
  function face(cx, cy, s) {
    const e = s * 0.15, ey = cy - s * 0.04;
    const ink = '#2a1740';
    return `<g class="face" style="--d:${(Math.random() * 5).toFixed(2)}s">
      <ellipse cx="${cx - s * 0.2}" cy="${cy + s * 0.1}" rx="${s * 0.085}" ry="${s * 0.05}" fill="#ff4f8b" opacity="0.28"/>
      <ellipse cx="${cx + s * 0.2}" cy="${cy + s * 0.1}" rx="${s * 0.085}" ry="${s * 0.05}" fill="#ff4f8b" opacity="0.28"/>
      <g class="eyes" style="transform-origin:${cx}px ${ey}px">
        <ellipse cx="${cx - e}" cy="${ey}" rx="${s * 0.055}" ry="${s * 0.075}" fill="${ink}"/>
        <ellipse cx="${cx + e}" cy="${ey}" rx="${s * 0.055}" ry="${s * 0.075}" fill="${ink}"/>
        <circle cx="${cx - e + s * 0.02}" cy="${ey - s * 0.03}" r="${s * 0.022}" fill="#fff"/>
        <circle cx="${cx + e + s * 0.02}" cy="${ey - s * 0.03}" r="${s * 0.022}" fill="#fff"/>
      </g>
      <path class="smile" d="M${cx - s * 0.08},${cy + s * 0.09} Q${cx},${cy + s * 0.17} ${cx + s * 0.08},${cy + s * 0.09}" fill="none" stroke="${ink}" stroke-width="${s * 0.035}" stroke-linecap="round"/>
      <ellipse class="oh" cx="${cx}" cy="${cy + s * 0.12}" rx="${s * 0.045}" ry="${s * 0.055}" fill="${ink}"/>
    </g>`;
  }

  // The whole block as one SVG: shadow, side, face gradient, gloss, core, ice, face.
  // The face is lifted by half the block's thickness so face + side sit inside its own cells, with a
  // gap to the neighbours on every side (nothing hangs over the block below).
  function blockSVG(p, cs, { faceOn = true } = {}) {
    const offs = Engine.cellsOf(p, 0, 0);
    const W = p.w * cs, H = p.h * cs, inset = cs * 0.06, rad = cs * 0.24, depth = Math.max(3, cs * 0.075);
    const frozen = p.ice > 0;
    const [l, b, d, side] = frozen ? ICE : PAL[p.color] || PAL.blue;
    const faceFill = frozen ? 'ice' : p.color;
    const shape = shapePath(offs, cs, inset, rad);
    const uid = 'c' + Math.random().toString(36).slice(2, 8);
    let s = `<svg class="jelly" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" overflow="visible">`;
    s += `<defs><clipPath id="${uid}"><path d="${shape}"/></clipPath></defs>`;
    s += `<g transform="translate(0 ${(-depth / 2).toFixed(2)})">`;
    s += `<path class="shadow" d="${shape}" transform="translate(0 ${depth * 1.35})" fill="#0b0624" opacity="0.3"/>`;
    if (p.color === 'beaver' && !frozen) {
      // Round ears peeking over the top edge.
      const [er, ec] = heart(offs, !p.shape);
      for (const dx of [-0.24, 0.24]) s += `<circle cx="${(ec + 0.5 + dx) * cs}" cy="${(er + 0.1) * cs}" r="${cs * 0.12}" fill="${side}"/><circle cx="${(ec + 0.5 + dx) * cs}" cy="${(er + 0.1) * cs}" r="${cs * 0.06}" fill="#e9b98c"/>`;
    }
    s += `<path d="${shape}" transform="translate(0 ${depth})" fill="${side}"/>`;
    s += `<path class="hit" d="${shape}" fill="url(#face-${faceFill})"/>`;
    s += `<g clip-path="url(#${uid})" pointer-events="none">`;
    // Soft light from the top and a round shine on every cell.
    s += `<rect x="0" y="0" width="${W}" height="${H * 0.5}" fill="url(#gloss)" opacity="0.55"/>`;
    for (const [r, c] of offs) s += `<ellipse cx="${(c + 0.32) * cs}" cy="${(r + 0.24) * cs}" rx="${cs * 0.16}" ry="${cs * 0.09}" fill="#fff" opacity="0.3" transform="rotate(-18 ${(c + 0.32) * cs} ${(r + 0.24) * cs})"/>`;
    if (p.color === 'water' && !frozen) {
      // Water: gentle waves and a few bubbles inside.
      for (const [r, c] of offs) {
        const x = c * cs, y = r * cs;
        for (const k of [0.55, 0.8]) s += `<path d="M${x},${y + cs * k} q${cs * 0.125},${-cs * 0.08} ${cs * 0.25},0 t${cs * 0.25},0 t${cs * 0.25},0 t${cs * 0.25},0" fill="none" stroke="#fff" stroke-width="${cs * 0.035}" opacity="0.35" stroke-linecap="round"/>`;
        s += `<circle cx="${x + cs * 0.78}" cy="${y + cs * 0.3}" r="${cs * 0.05}" fill="none" stroke="#fff" stroke-width="${cs * 0.02}" opacity="0.6"/><circle cx="${x + cs * 0.2}" cy="${y + cs * 0.42}" r="${cs * 0.03}" fill="#fff" opacity="0.5"/>`;
      }
    }
    s += `<path d="${shape}" fill="none" stroke="${l}" stroke-width="${cs * 0.05}" opacity="0.7"/>`;
    s += `<path d="${shape}" fill="none" stroke="${d}" stroke-width="${cs * 0.035}" opacity="0.5" transform="translate(0 ${-cs * 0.02})"/>`;
    s += '</g>';
    if (p.inner && !frozen) {
      // Layered: a jewel-like core inside, the part that stays behind.
      const core = shapePath(offs, cs, cs * 0.27, cs * 0.14);
      s += `<path d="${core}" fill="#000" opacity="0.25" transform="translate(0 ${-cs * 0.025})" pointer-events="none"/>`;
      s += `<path d="${core}" fill="url(#core-${p.inner})" stroke="rgba(255,255,255,0.55)" stroke-width="${cs * 0.03}" pointer-events="none"/>`;
    }
    const [hr, hc] = heart(offs, !p.shape);
    if (faceOn && !p.inner && !frozen) s += face((hc + 0.5) * cs, (hr + 0.5) * cs, cs);
    if (p.color === 'beaver' && !frozen) {
      // Buck teeth and a little nose.
      const x = (hc + 0.5) * cs, y = (hr + 0.5) * cs;
      s += `<ellipse cx="${x}" cy="${y + cs * 0.04}" rx="${cs * 0.06}" ry="${cs * 0.04}" fill="#3a1f0c"/>`;
      s += `<g class="teeth"><rect x="${x - cs * 0.07}" y="${y + cs * 0.15}" width="${cs * 0.065}" height="${cs * 0.11}" rx="${cs * 0.015}" fill="#fffdf2" stroke="#caa" stroke-width="${cs * 0.008}"/>`
        + `<rect x="${x + cs * 0.005}" y="${y + cs * 0.15}" width="${cs * 0.065}" height="${cs * 0.11}" rx="${cs * 0.015}" fill="#fffdf2" stroke="#caa" stroke-width="${cs * 0.008}"/></g>`;
    }
    if (p.axis && !frozen) {
      // One-way block: little wheels it rolls on — under it for ↔, on its right side for ↕ (like a lift).
      // Drawn over its edge so they always show; they spin while it's dragged.
      const r = cs * 0.15, h = p.axis === 'h';
      const edge = h ? Math.max(...offs.map(q => q[0])) : Math.max(...offs.map(q => q[1]));
      const line = offs.filter(q => (h ? q[0] : q[1]) === edge).map(q => h ? q[1] : q[0]);
      const lo = Math.min(...line) * cs + cs * 0.28, hi = (Math.max(...line) + 1) * cs - cs * 0.28;
      const at = (edge + 1) * cs - (h ? cs * 0.04 : cs * 0.1);
      for (const t of lo === hi ? [lo] : [lo, hi]) {
        const [x, y] = h ? [t, at] : [at, t];
        s += `<g class="wheel" style="transform-origin:${x}px ${y}px"><circle cx="${x}" cy="${y + r * 0.18}" r="${r}" fill="#0b0624" opacity="0.35"/><circle cx="${x}" cy="${y}" r="${r}" fill="#2a2440"/><circle cx="${x}" cy="${y}" r="${r * 0.58}" fill="#e6e9f7"/>`
          + `<path d="M${x - r * 0.42},${y} H${x + r * 0.42} M${x},${y - r * 0.42} V${y + r * 0.42}" stroke="#9aa0bf" stroke-width="${r * 0.16}"/><circle cx="${x}" cy="${y}" r="${r * 0.2}" fill="#2a2440"/></g>`;
      }
    }
    if (p.key && !frozen) {
      // Key block: a golden key lying on it (below the face).
      const x = (hc + 0.5) * cs, y = (hr + 0.5) * cs + cs * 0.27, k = cs * 0.1;
      s += `<g pointer-events="none" transform="translate(${x} ${y}) rotate(-12)">
        <circle cx="${-k * 1.3}" cy="0" r="${k}" fill="none" stroke="#7a5200" stroke-width="${k * 0.95}"/>
        <circle cx="${-k * 1.3}" cy="0" r="${k}" fill="none" stroke="#ffd34d" stroke-width="${k * 0.55}"/>
        <path d="M${-k * 0.3},0 H${k * 1.9} M${k * 1.3},0 V${k * 0.8} M${k * 1.85},0 V${k * 0.65}" stroke="#7a5200" stroke-width="${k * 0.75}" stroke-linecap="round"/>
        <path d="M${-k * 0.3},0 H${k * 1.9} M${k * 1.3},0 V${k * 0.8} M${k * 1.85},0 V${k * 0.65}" stroke="#ffd34d" stroke-width="${k * 0.38}" stroke-linecap="round"/></g>`;
    }
    if (p.lock && !frozen) {
      // In prison: iron bars over the whole block and a padlock with how many keys it still needs.
      s += `<g pointer-events="none"><g clip-path="url(#${uid})">`;
      for (let x = cs * 0.2; x < W; x += cs * 0.3) s += `<rect x="${x - cs * 0.035}" y="0" width="${cs * 0.07}" height="${H}" rx="${cs * 0.03}" fill="#3a3f55" opacity="0.85"/><rect x="${x - cs * 0.035}" y="0" width="${cs * 0.025}" height="${H}" fill="#c9cfe6" opacity="0.6"/>`;
      s += `</g>`;
      const x = (hc + 0.5) * cs, y = (hr + 0.5) * cs + cs * 0.24, w = cs * 0.38, h = cs * 0.3;
      s += `<path d="M${x - w * 0.3},${y - h * 0.45} v${-h * 0.35} a${w * 0.3},${w * 0.3} 0 0 1 ${w * 0.6},0 v${h * 0.35}" fill="none" stroke="#5b6078" stroke-width="${cs * 0.05}"/>`;
      s += `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${cs * 0.05}" fill="#ffc933" stroke="#7a5200" stroke-width="${cs * 0.025}"/>`;
      s += `<text x="${x}" y="${y + h * 0.3}" text-anchor="middle" font-size="${h * 0.85}" font-weight="700" fill="#5a2d00" font-family="Fredoka, system-ui, sans-serif">${p.lock}</text></g>`;
    }
    if (p.ice) {
      s += `<g pointer-events="none"><path d="${shape}" fill="url(#ice)" opacity="0.6"/>`;
      // Frost cracks and sparkles.
      for (const [r, c] of offs) {
        const x = c * cs, y = r * cs;
        s += `<path d="M${x + cs * 0.2},${y + cs * 0.75} L${x + cs * 0.42},${y + cs * 0.55} L${x + cs * 0.38},${y + cs * 0.4} M${x + cs * 0.42},${y + cs * 0.55} L${x + cs * 0.62},${y + cs * 0.62}" stroke="#fff" stroke-width="${cs * 0.03}" fill="none" opacity="0.8" stroke-linecap="round"/>`;
      }
      s += `<path d="${shape}" fill="none" stroke="#fff" stroke-width="${cs * 0.05}" opacity="0.9"/>`;
      const x = (hc + 0.5) * cs, y = (hr + 0.5) * cs, rr = cs * 0.24;
      s += `<circle cx="${x}" cy="${y}" r="${rr}" fill="#fff" opacity="0.92"/><text x="${x}" y="${y + rr * 0.42}" text-anchor="middle" font-size="${rr * 1.2}" font-weight="700" fill="#1f5b9c" font-family="Fredoka, system-ui, sans-serif">${p.ice}</text></g>`;
    }
    return s + '</g></svg>';
  }

  // A fire on one cell: a glowing ember bed, three flickering flame layers, rising sparks, a count.
  const FLAME = 'M50,6 C60,26 84,38 82,62 C80,84 66,95 50,95 C34,95 19,84 18,63 C17,45 32,37 35,20 C41,33 45,34 50,6 Z';
  function fire(n, cs) {
    const d = document.createElement('div');
    d.className = 'fire';
    const layer = (cls, fill, sc) => `<path class="fl ${cls}" d="${FLAME}" fill="${fill}" transform="translate(50 95) scale(${sc}) translate(-50 -95)"/>`;
    let s = `<svg viewBox="0 0 100 100" width="${cs}" height="${cs}" overflow="visible">`;
    s += '<defs><radialGradient id="ember" cx="0.5" cy="0.85" r="0.6"><stop offset="0" stop-color="#ffd35a" stop-opacity="0.9"/><stop offset="0.5" stop-color="#ff6a1a" stop-opacity="0.55"/><stop offset="1" stop-color="#ff3d00" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="fl-o" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff4a12"/><stop offset="1" stop-color="#ff8a1f"/></linearGradient>'
      + '<linearGradient id="fl-m" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff9a1f"/><stop offset="1" stop-color="#ffd23f"/></linearGradient>'
      + '<linearGradient id="fl-i" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff3b0"/><stop offset="1" stop-color="#fffbe8"/></linearGradient></defs>';
    s += '<ellipse cx="50" cy="84" rx="46" ry="22" fill="url(#ember)"/>';
    s += '<g class="flames">' + layer('o', 'url(#fl-o)', 0.9) + layer('m', 'url(#fl-m)', 0.66) + layer('i', 'url(#fl-i)', 0.38) + '</g>';
    for (let i = 0; i < 4; i++) s += `<circle class="ember-spark" cx="${30 + i * 13}" cy="70" r="${2.5 + (i % 2)}" fill="#ffd35a" style="--i:${i}"/>`;
    s += '</svg>';
    s += `<b class="fire-count">${n}</b>`;
    d.innerHTML = s;
    d.style.width = d.style.height = cs + 'px';
    return d;
  }

  // A forest on one cell: a grassy mound with two fluffy round trees that sway, a tiny mushroom and a
  // flower. What's hidden stays hidden.
  function forest(cs) {
    const d = document.createElement('div');
    d.className = 'forest';
    const tree = (x, y, k, i, dark, mid, light) => `<g class="tree" style="--i:${i};transform-origin:${x}px ${y + 26 * k}px">
      <rect x="${x - 3.2 * k}" y="${y + 8 * k}" width="${6.4 * k}" height="${18 * k}" rx="${3 * k}" fill="#8a5a2e"/>
      <rect x="${x - 3.2 * k}" y="${y + 8 * k}" width="${2.4 * k}" height="${18 * k}" rx="${1.2 * k}" fill="#a8743f"/>
      <circle cx="${x - 9 * k}" cy="${y + 2 * k}" r="${10 * k}" fill="${dark}"/><circle cx="${x + 9 * k}" cy="${y + 2 * k}" r="${10 * k}" fill="${dark}"/>
      <circle cx="${x}" cy="${y - 8 * k}" r="${13 * k}" fill="${mid}"/><circle cx="${x - 7 * k}" cy="${y - 1 * k}" r="${9 * k}" fill="${mid}"/><circle cx="${x + 7 * k}" cy="${y}" r="${9 * k}" fill="${mid}"/>
      <ellipse cx="${x - 5 * k}" cy="${y - 13 * k}" rx="${5.5 * k}" ry="${3.8 * k}" fill="${light}" opacity="0.85"/>
      <circle cx="${x + 6 * k}" cy="${y - 4 * k}" r="${1.6 * k}" fill="#ff6f8f"/><circle cx="${x - 8 * k}" cy="${y + 3 * k}" r="${1.4 * k}" fill="#ff6f8f"/></g>`;
    d.innerHTML = `<svg viewBox="0 0 100 100" width="${cs}" height="${cs}" overflow="visible">
      <rect x="4" y="6" width="92" height="90" rx="26" fill="#1d5e36"/><rect x="4" y="6" width="92" height="44" rx="24" fill="#2a7a45" opacity="0.8"/>
      <ellipse cx="50" cy="86" rx="38" ry="7" fill="#1d6a35" opacity="0.55"/>
      ${tree(66, 46, 1.25, 1, '#2fa34c', '#56d46f', '#c8f9bd')}${tree(36, 50, 1.55, 0, '#2b9a48', '#4ccb66', '#bdf5b1')}
      <g transform="translate(18 80)"><rect x="-1.6" y="-4" width="3.2" height="6" rx="1.4" fill="#fff4e0"/><path d="M-6,-3 Q0,-11 6,-3 Z" fill="#ff5a6e"/><circle cx="-2" cy="-5.5" r="1" fill="#fff"/><circle cx="2" cy="-4.5" r="0.8" fill="#fff"/></g>
      <g transform="translate(84 82)"><circle r="2.2" cx="0" cy="-3" fill="#fff"/><circle r="2.2" cx="-2.8" cy="0" fill="#fff"/><circle r="2.2" cx="2.8" cy="0" fill="#fff"/><circle r="2.2" cx="0" cy="2.4" fill="#fff"/><circle r="1.8" fill="#ffd34d"/></g>
    </svg>`;
    d.style.width = d.style.height = cs + 'px';
    return d;
  }

  // Water drops flying in an arc from (x0, y0) to (x1, y1).
  function sprinkle(host, x0, y0, x1, y1, delay = 0) {
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('i');
      s.className = 'drop';
      host.appendChild(s);
      const jx = (Math.random() - 0.5) * 18, jy = (Math.random() - 0.5) * 12, lift = 50 + Math.random() * 50;
      const frames = [];
      for (let k = 0; k <= 8; k++) {
        const t = k / 8, x = x0 + (x1 + jx - x0) * t, y = y0 + (y1 + jy - y0) * t - lift * 4 * t * (1 - t);
        frames.push({ transform: `translate(${x}px, ${y}px) translate(-50%,-50%) scale(${0.6 + 0.5 * Math.sin(t * Math.PI)})`, opacity: k === 8 ? 0.2 : 1 });
      }
      s.animate(frames, { duration: 420 + Math.random() * 120, delay: delay + i * 22, easing: 'ease-in', fill: 'both' }).onfinish = () => s.remove();
    }
  }

  // A puff of steam where a fire went out (or a little one when it's only damped).
  function steam(host, x, y, big) {
    for (let i = 0; i < (big ? 10 : 4); i++) {
      const s = document.createElement('i');
      s.className = 'steam';
      const size = (big ? 22 : 14) + Math.random() * 16;
      Object.assign(s.style, { left: x + 'px', top: y + 'px', width: size + 'px', height: size + 'px' });
      host.appendChild(s);
      const dx = (Math.random() - 0.5) * 50, dy = -30 - Math.random() * (big ? 60 : 30);
      s.animate([
        { transform: 'translate(-50%,-50%) scale(0.4)', opacity: 0 },
        { transform: `translate(calc(-50% + ${dx * 0.25}px), calc(-50% + ${dy * 0.2}px)) scale(1)`, opacity: 0.95, offset: 0.15 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${big ? 2.6 : 1.7})`, opacity: 0 },
      ], { duration: 1200 + Math.random() * 600, delay: i * 40, easing: 'ease-out', fill: 'both' }).onfinish = () => s.remove();
    }
  }

  // A door: a glowing bar with arrows marching out, or a frosted tile with its count.
  function door(gt, box, gut) {
    const dEl = document.createElement('div');
    const flat = gt.side === 'L' || gt.side === 'R';
    const [l, b, dd] = PAL[gt.color] || PAL.blue;
    dEl.className = 'door' + (gt.frozen ? ' frozen' : '');
    Object.assign(dEl.style, box);
    dEl.dataset.gate = gt.id;
    if (gt.frozen) {
      dEl.innerHTML = `<span class="flake">❄</span><b>${gt.frozen}</b>`;
      dEl.style.fontSize = Math.max(11, Math.round(gut * 0.62)) + 'px';
      dEl.style.flexDirection = flat ? 'column' : 'row';
      return dEl;
    }
    dEl.style.background = `linear-gradient(${flat ? '90deg' : '180deg'}, ${l}, ${b} 45%, ${dd})`;
    dEl.style.setProperty('--glow', b);
    const rot = { L: 180, R: 0, T: -90, B: 90 }[gt.side];
    const n = Math.max(1, Math.min(3, gt.len));
    let chev = '';
    for (let i = 0; i < n; i++) chev += `<svg class="chev" style="--i:${i};transform:rotate(${rot}deg)" viewBox="0 0 10 10" width="${gut * 0.5}" height="${gut * 0.5}"><path d="M3,2 L7,5 L3,8" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    dEl.innerHTML = `<span class="chevs" style="flex-direction:${flat ? 'row' : 'column'}">${chev}</span>`;
    if (gt.side === 'L' || gt.side === 'T') dEl.querySelector('.chevs').style.flexDirection = flat ? 'row-reverse' : 'column-reverse';
    return dEl;
  }

  // A colour lane: a floor cell striped in its colour; only blocks of that colour may cross it.
  function lane(color, cs, box) {
    const [l, b] = PAL[color] || PAL.blue;
    const d = document.createElement('div');
    d.className = 'lane';
    Object.assign(d.style, box);
    d.style.setProperty('--l', l); d.style.setProperty('--b', b);
    return d;
  }

  // Sparks bursting from where a block went out.
  function burst(host, x, y, color, dir) {
    const [l, b] = color === 'ice' ? ['#ffffff', '#cdeeff'] : color === 'wood' ? ['#f2d29b', '#a0692f'] : color === 'leaf' ? ['#a6e98a', '#2e8b3a'] : color === 'gold' ? ['#fff3b0', '#ffc933'] : PAL[color] || PAL.blue;
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('i');
      s.className = 'spark';
      const size = 5 + Math.random() * 7;
      Object.assign(s.style, { left: x + 'px', top: y + 'px', width: size + 'px', height: size + 'px', background: i % 3 ? b : l });
      host.appendChild(s);
      const a = Math.atan2(dir[1], dir[0]) + (Math.random() - 0.5) * 2.2, v = 40 + Math.random() * 70;
      s.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * v}px), calc(-50% + ${Math.sin(a) * v}px)) scale(0.2)`, opacity: 0 },
      ], { duration: 500 + Math.random() * 300, easing: 'cubic-bezier(.1,.8,.3,1)' }).onfinish = () => s.remove();
    }
  }

  function confetti() {
    const cols = Object.values(PAL).map(p => p[1]);
    for (let i = 0; i < 70; i++) {
      const c = document.createElement('i');
      c.className = 'confetti';
      const w = 6 + Math.random() * 6;
      Object.assign(c.style, { left: Math.random() * 100 + 'vw', width: w + 'px', height: w * (Math.random() < 0.5 ? 1 : 1.8) + 'px', background: cols[i % cols.length], borderRadius: Math.random() < 0.4 ? '50%' : '3px' });
      document.body.appendChild(c);
      const drift = (Math.random() - 0.5) * 160, spin = (Math.random() - 0.5) * 1440;
      c.animate([
        { transform: 'translate(0, -20px) rotate(0deg)' },
        { transform: `translate(${drift}px, 105vh) rotate(${spin}deg)` },
      ], { duration: 1800 + Math.random() * 1600, delay: Math.random() * 400, easing: 'cubic-bezier(.3,.1,.7,1)' }).onfinish = () => c.remove();
    }
  }

  return { PAL, defs, blockSVG, door, lane, burst, confetti, fire, sprinkle, steam, forest };
})();
