// Unblock It — drawing: jelly blocks (one SVG shape per block), doors, sparks, confetti.
const Art = (() => {
  // light, base, dark, side (the block's visible thickness)
  const PAL = {
    red:    ['#ff9a8c', '#ff5a4e', '#e33a30', '#b5261f'],
    blue:   ['#8db8ff', '#3d7bff', '#2a5fe3', '#1c42ad'],
    yellow: ['#ffe68a', '#ffc933', '#f2a900', '#c78300'],
    green:  ['#8ff2b0', '#2fcf6f', '#1dab56', '#12803f'],
    purple: ['#d8b0ff', '#a45cff', '#8439e8', '#6124b6'],
    orange: ['#ffc58a', '#ff8a2b', '#ee6a12', '#bd4e07'],
    pink:   ['#ffb0da', '#ff5fb2', '#ea3a92', '#b52470'],
    sky:    ['#a6eeff', '#3fd0ff', '#18aeee', '#0b83bc'],
  };
  const NS = 'http://www.w3.org/2000/svg';

  // Shared gradients, once per page.
  function defs() {
    if (document.getElementById('art-defs')) return;
    const s = document.createElementNS(NS, 'svg');
    s.id = 'art-defs'; s.setAttribute('width', 0); s.setAttribute('height', 0); s.style.position = 'absolute';
    let h = '<defs>';
    for (const [k, [l, b, d]] of Object.entries(PAL)) {
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
  function blockSVG(p, cs, { faceOn = true } = {}) {
    const offs = Engine.cellsOf(p, 0, 0);
    const W = p.w * cs, H = p.h * cs, inset = cs * 0.045, rad = cs * 0.24, depth = Math.max(3, cs * 0.09);
    const [l, b, d, side] = PAL[p.color] || PAL.blue;
    const shape = shapePath(offs, cs, inset, rad);
    const uid = 'c' + Math.random().toString(36).slice(2, 8);
    let s = `<svg class="jelly" width="${W}" height="${H + depth}" viewBox="0 0 ${W} ${H + depth}" overflow="visible">`;
    s += `<defs><clipPath id="${uid}"><path d="${shape}"/></clipPath></defs>`;
    s += `<path class="shadow" d="${shape}" transform="translate(0 ${depth * 1.6})" fill="#0b0624" opacity="0.35"/>`;
    s += `<path d="${shape}" transform="translate(0 ${depth})" fill="${side}"/>`;
    s += `<path class="hit" d="${shape}" fill="url(#face-${p.color})"/>`;
    s += `<g clip-path="url(#${uid})" pointer-events="none">`;
    // Soft light from the top and a round shine on every cell.
    s += `<rect x="0" y="0" width="${W}" height="${H * 0.5}" fill="url(#gloss)" opacity="0.55"/>`;
    for (const [r, c] of offs) s += `<ellipse cx="${(c + 0.32) * cs}" cy="${(r + 0.24) * cs}" rx="${cs * 0.16}" ry="${cs * 0.09}" fill="#fff" opacity="0.3" transform="rotate(-18 ${(c + 0.32) * cs} ${(r + 0.24) * cs})"/>`;
    s += `<path d="${shape}" fill="none" stroke="${l}" stroke-width="${cs * 0.05}" opacity="0.7"/>`;
    s += `<path d="${shape}" fill="none" stroke="${d}" stroke-width="${cs * 0.035}" opacity="0.5" transform="translate(0 ${-cs * 0.02})"/>`;
    s += '</g>';
    if (p.inner) {
      // Layered: a jewel-like core inside, the part that stays behind.
      const core = shapePath(offs, cs, cs * 0.27, cs * 0.14);
      s += `<path d="${core}" fill="#000" opacity="0.25" transform="translate(0 ${-cs * 0.025})" pointer-events="none"/>`;
      s += `<path d="${core}" fill="url(#core-${p.inner})" stroke="rgba(255,255,255,0.55)" stroke-width="${cs * 0.03}" pointer-events="none"/>`;
    }
    const [hr, hc] = heart(offs, !p.shape);
    if (faceOn && !p.inner) s += face((hc + 0.5) * cs, (hr + 0.5) * cs, cs);
    if (p.ice) {
      s += `<g pointer-events="none"><path d="${shape}" fill="url(#ice)"/>`;
      // Frost cracks and sparkles.
      for (const [r, c] of offs) {
        const x = c * cs, y = r * cs;
        s += `<path d="M${x + cs * 0.2},${y + cs * 0.75} L${x + cs * 0.42},${y + cs * 0.55} L${x + cs * 0.38},${y + cs * 0.4} M${x + cs * 0.42},${y + cs * 0.55} L${x + cs * 0.62},${y + cs * 0.62}" stroke="#fff" stroke-width="${cs * 0.03}" fill="none" opacity="0.8" stroke-linecap="round"/>`;
      }
      s += `<path d="${shape}" fill="none" stroke="#fff" stroke-width="${cs * 0.05}" opacity="0.9"/>`;
      const x = (hc + 0.5) * cs, y = (hr + 0.5) * cs, rr = cs * 0.24;
      s += `<circle cx="${x}" cy="${y}" r="${rr}" fill="#fff" opacity="0.92"/><text x="${x}" y="${y + rr * 0.42}" text-anchor="middle" font-size="${rr * 1.2}" font-weight="700" fill="#1f5b9c" font-family="Fredoka, system-ui, sans-serif">${p.ice}</text></g>`;
    }
    return s + '</svg>';
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
      dEl.style.setProperty('--c', b);
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

  // Sparks bursting from where a block went out.
  function burst(host, x, y, color, dir) {
    const [l, b] = PAL[color] || PAL.blue;
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

  return { PAL, defs, blockSVG, door, burst, confetti };
})();
