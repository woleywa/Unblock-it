// Happy Blocks — Story mode: Mörfi, Super Mega Snitch of the Intergalactic Snitch Association.
// A little stage with drawn scenery and characters that walk, bob, blink, jump and talk in speech
// bubbles; the story stops for puzzles now and then (played on the normal board through chPlay).
// Uses game.js globals: $, show, home, begin, chPlay, level, Sound, Art, Native; Extras for saving.
const Story = (() => {
  // ── Characters (drawn as SVG, feet at the bottom of a 120×170 box) ──
  const SKIN = '#f8dcc0', INK = '#1d1a26';
  const eyes = (lx, rx, y, r) => `<g class="eyes" style="transform-origin:60px ${y}px">
      ${[lx, rx].map(x => `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x + r * 0.35}" cy="${y - r * 0.4}" r="${r * 0.32}" fill="#fff"/><circle cx="${x - r * 0.35}" cy="${y + r * 0.35}" r="${r * 0.14}" fill="#fff"/>`).join('')}</g>`;
  const mouth = (x, y, w) => `<path class="smile" d="M${x - w},${y} Q${x},${y + w * 0.9} ${x + w},${y}" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>
      <ellipse class="oh" cx="${x}" cy="${y + 2}" rx="${w * 0.55}" ry="${w * 0.75}" fill="${INK}"/>`;
  const PROPS = {
    telescope: `<g class="prop"><rect x="84" y="78" width="30" height="8" rx="3" fill="#8a5a2e" transform="rotate(-18 84 82)"/><rect x="108" y="70" width="10" height="11" rx="3" fill="#ffd54a" transform="rotate(-18 84 82)"/></g>`,
    tea: `<g class="prop"><path d="M86,104 h14 l-2,10 h-10 z" fill="#fff"/><path d="M100,106 q5,0 3,5 q-2,3 -4,1" fill="none" stroke="#fff" stroke-width="2"/><path d="M90,98 q2,-4 0,-7 M95,98 q2,-4 0,-7" stroke="#fff" stroke-width="1.4" fill="none" opacity="0.7"/></g>`,
    biscuit: `<g class="prop"><circle cx="93" cy="108" r="8" fill="#e0a45a" stroke="#a86a2a" stroke-width="1.5"/><circle cx="90" cy="106" r="1.2" fill="#7a4a1a"/><circle cx="96" cy="110" r="1.2" fill="#7a4a1a"/><circle cx="95" cy="104" r="1" fill="#7a4a1a"/></g>`,
    book: `<g class="prop"><rect x="38" y="100" width="44" height="26" rx="3" fill="#6a4fb0"/><rect x="41" y="103" width="18" height="20" fill="#fff8ea"/><rect x="61" y="103" width="18" height="20" fill="#fff8ea"/><path d="M44,108 h12 M44,112 h12 M64,108 h12 M64,112 h12" stroke="#bbb" stroke-width="1"/></g>`,
    satchel: `<g class="prop"><path d="M40,92 L82,128" stroke="#8a5a2e" stroke-width="3"/><rect x="72" y="118" width="20" height="16" rx="4" fill="#b3743a"/><circle cx="82" cy="126" r="2.5" fill="#ffd54a"/><text x="82" y="131" font-size="5" text-anchor="middle" fill="#fff" font-weight="700" font-family="Fredoka,system-ui">ISA</text></g>`,
    bottle: `<g class="prop"><rect x="86" y="104" width="12" height="26" rx="4" fill="#dff2ff" stroke="#9ac8e8" stroke-width="1.5" opacity="0.9"/><rect x="88" y="98" width="8" height="7" rx="2" fill="#e8433f"/></g>`,
    spoon: `<g class="prop"><rect x="20" y="96" width="4" height="22" rx="2" fill="#cfd5e6" transform="rotate(20 22 107)"/><ellipse cx="18" cy="94" rx="5" ry="7" fill="#cfd5e6" transform="rotate(20 22 107)"/></g>`,
  };
  // A cartoon cat standing up: body, tail, head with ears, big eyes, pink nose, whiskers.
  function cat(o) {
    const ear = (x, flip) => `<path d="M${x - 14 * flip},${o.big ? 30 : 36} L${x - 2 * flip},${o.big ? 2 : 12} L${x + 12 * flip},${o.big ? 34 : 38} Z" fill="${o.patch || o.base}"/>
      <path d="M${x - 8 * flip},${o.big ? 30 : 34} L${x - 2 * flip},${o.big ? 12 : 20} L${x + 6 * flip},${o.big ? 32 : 36} Z" fill="#f2a8a8"/>`;
    const catEyes = (lx, rx, y) => `<g class="eyes" style="transform-origin:60px ${y}px">${[lx, rx].map(x => `<ellipse cx="${x}" cy="${y}" rx="7.5" ry="8" fill="${o.eye}"/>
      <ellipse cx="${x}" cy="${y}" rx="3.4" ry="6.4" fill="${INK}"/><circle cx="${x + 2.4}" cy="${y - 3}" r="2" fill="#fff"/>`).join('')}</g>`;
    const tail = `<path class="tail" d="M84,140 Q112,138 110,110 Q108,92 118,84" stroke="${o.tail}" stroke-width="10" fill="none" stroke-linecap="round" style="transform-origin:84px 140px"/>
      ${o.tailStripes ? `<path d="M96,140 l4,-9 M106,128 l8,-2 M109,112 l8,1 M112,96 l7,4" stroke="${o.stripe}" stroke-width="3" stroke-linecap="round"/>` : ''}`;
    return `${tail}
      <ellipse cx="60" cy="126" rx="31" ry="36" fill="${o.base}"/>
      ${o.patches}
      <ellipse cx="60" cy="130" rx="15" ry="22" fill="${o.muzzle}" opacity="${o.patch ? 0 : 0.9}"/>
      <g class="arm-l" style="transform-origin:34px 112px"><ellipse cx="30" cy="122" rx="8" ry="13" fill="${o.patch ? o.base : o.base}"/><ellipse cx="29" cy="133" rx="7" ry="5" fill="${o.muzzle}"/></g>
      <g class="arm-r" style="transform-origin:86px 112px"><ellipse cx="90" cy="122" rx="8" ry="13" fill="${o.base}"/><ellipse cx="91" cy="133" rx="7" ry="5" fill="${o.muzzle}"/></g>
      <g class="legs"><ellipse cx="46" cy="160" rx="12" ry="7" fill="${o.patch ? o.base : o.muzzle}"/><ellipse cx="74" cy="160" rx="12" ry="7" fill="${o.patch ? o.base : o.muzzle}"/>
        <path d="M40,162 v-3 M46,163 v-4 M52,162 v-3 M68,162 v-3 M74,163 v-4 M80,162 v-3" stroke="${o.shade}" stroke-width="1.4"/></g>
      ${ear(40, 1)}${ear(80, -1)}
      <ellipse cx="60" cy="70" rx="34" ry="31" fill="${o.base}"/>
      ${o.cap}
      <ellipse cx="60" cy="84" rx="17" ry="12" fill="${o.muzzle}"/>
      ${catEyes(46, 74, 70)}
      <ellipse cx="38" cy="84" rx="5" ry="3" fill="#ff8fb0" opacity="0.4"/><ellipse cx="82" cy="84" rx="5" ry="3" fill="#ff8fb0" opacity="0.4"/>
      <path d="M56,80 h8 l-4,4 z" fill="#e87a8a"/>
      <path class="smile" d="M60,84 v2 q-3,4 -7,1 M60,86 q3,4 7,1" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
      <ellipse class="oh" cx="60" cy="89" rx="3" ry="4" fill="${INK}"/>
      <path d="M46,84 L${o.big ? 8 : 16},78 M46,87 L${o.big ? 6 : 14},88 M46,90 L${o.big ? 10 : 18},97 M74,84 L${o.big ? 112 : 104},78 M74,87 L${o.big ? 114 : 106},88 M74,90 L${o.big ? 110 : 102},97" stroke="#fff" stroke-width="1.2" opacity="0.9"/>
      ${(o.props || []).map(p => PROPS[p] || '').join('')}`;
  }
  // A city bike: two wheels (they spin while riding), frame, saddle, handlebar, maybe a basket.
  function bike(color, basket) {
    const wheel = x => `<g class="wheel" style="transform-origin:${x}px 146px"><circle cx="${x}" cy="146" r="22" fill="none" stroke="#1a1a1e" stroke-width="5"/><circle cx="${x}" cy="146" r="18" fill="none" stroke="#c9ccd6" stroke-width="1"/>
      ${[0, 45, 90, 135].map(a => `<path d="M${x},146 m${22 * Math.cos(a * Math.PI / 180) * 0.8},${22 * Math.sin(a * Math.PI / 180) * 0.8} L${x - 22 * Math.cos(a * Math.PI / 180) * 0.8},${146 - 22 * Math.sin(a * Math.PI / 180) * 0.8}" stroke="#c9ccd6" stroke-width="1"/>`).join('')}<circle cx="${x}" cy="146" r="3" fill="#888"/></g>`;
    return `${wheel(16)}${wheel(104)}
      <path d="M16,146 L48,146 L76,106 L42,106 Z M48,146 L42,100 M76,106 L104,146 M76,106 L82,90" fill="none" stroke="${color}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M34,98 h18 q4,0 2,5 h-18 z" fill="#8a5a2e"/><path d="M76,90 h14" stroke="#1a1a1e" stroke-width="5" stroke-linecap="round"/>
      ${basket ? '<path d="M84,94 h24 l-3,18 h-18 z" fill="none" stroke="#3a3a40" stroke-width="2"/><path d="M88,94 l2,18 M96,94 v18 M104,94 l-2,18 M85,100 h22 M86,106 h20" stroke="#3a3a40" stroke-width="1.2"/>' : ''}`;
  }
  // The ISA badge: navy seal with gold wings, stars, a magnifying glass and the motto.
  function isaLogo(id = 'isa') {
    const star = (x, y, r) => `<path class="tw" d="M${x},${y - r} L${x + r * 0.3},${y - r * 0.3} L${x + r},${y} L${x + r * 0.3},${y + r * 0.3} L${x},${y + r} L${x - r * 0.3},${y + r * 0.3} L${x - r},${y} L${x - r * 0.3},${y - r * 0.3} Z" fill="#ffe27a"/>`;
    const wing = f => `<path d="M${200 + f * 92},150 Q${200 + f * 170},110 ${200 + f * 176},76 Q${200 + f * 186},120 ${200 + f * 150},170 Q${200 + f * 176},160 ${200 + f * 180},140 Q${200 + f * 170},190 ${200 + f * 110},200 Z" fill="url(#${id}g)" stroke="#a86a00" stroke-width="3"/>
      <path d="M${200 + f * 110},150 Q${200 + f * 150},130 ${200 + f * 160},100 M${200 + f * 110},172 Q${200 + f * 150},160 ${200 + f * 166},136" stroke="#a86a00" stroke-width="2" fill="none"/>`;
    return `<svg viewBox="0 0 400 320" class="isa-logo" role="img" aria-label="Intergalactic Snitch Association — Truth. Clues. Biscuits.">
      <defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff0a0"/><stop offset="0.5" stop-color="#ffc933"/><stop offset="1" stop-color="#d49a10"/></linearGradient>
        <path id="${id}top" d="M110,150 A90,90 0 0 1 290,150"/><path id="${id}rib" d="M96,238 Q200,286 304,238"/><path id="${id}mot" d="M112,292 Q200,322 288,292"/></defs>
      ${wing(-1)}${wing(1)}
      <circle cx="200" cy="150" r="104" fill="url(#${id}g)" stroke="#a86a00" stroke-width="3"/><circle cx="200" cy="150" r="94" fill="#16214a"/>
      ${[[140, 110, 7], [262, 108, 6], [150, 196, 6], [252, 200, 7], [200, 76, 5], [120, 150, 4], [282, 152, 4], [176, 96, 3], [226, 94, 3]].map(q => star(...q)).join('')}
      <text font-family="Fredoka,system-ui" font-weight="700" font-size="22" fill="#ffd54a" letter-spacing="2"><textPath href="#${id}top" startOffset="50%" text-anchor="middle">INTERGALACTIC</textPath></text>
      <text x="200" y="176" text-anchor="middle" font-family="Fredoka,system-ui" font-weight="700" font-size="84" fill="url(#${id}g)" stroke="#8a5a00" stroke-width="3" paint-order="stroke">ISA</text>
      <circle cx="200" cy="210" r="20" fill="#16214a" stroke="url(#${id}g)" stroke-width="7"/><path d="M214,224 l18,18" stroke="url(#${id}g)" stroke-width="9" stroke-linecap="round"/>${star(200, 210, 10)}
      <path d="M70,226 L96,222 Q200,270 304,222 L330,226 L316,244 L330,262 L296,256 Q200,300 104,256 L70,262 L84,244 Z" fill="#16214a" stroke="url(#${id}g)" stroke-width="4"/>
      <text font-family="Fredoka,system-ui" font-weight="700" font-size="21" fill="#ffd54a" letter-spacing="1.5"><textPath href="#${id}rib" startOffset="50%" text-anchor="middle">SNITCH ASSOCIATION</textPath></text>
      <text font-family="Fredoka,system-ui" font-weight="700" font-size="16" fill="currentColor" letter-spacing="1"><textPath href="#${id}mot" startOffset="50%" text-anchor="middle">TRUTH. CLUES. BISCUITS.</textPath></text>
    </svg>`;
  }
  const ART = {
    // Mörfi: black bob with antenna hairs, huge eyes, orange blouse, green skirt, boots.
    morfi: props => `
      <g class="ant"><path d="M52,24 Q46,8 40,4" stroke="${INK}" stroke-width="1.8" fill="none"/><circle cx="40" cy="4" r="2.6" fill="#ffd54a"/>
        <path d="M60,22 Q61,6 63,0" stroke="${INK}" stroke-width="1.8" fill="none"/><circle cx="63" cy="1" r="2.6" fill="#7fd6ff"/>
        <path d="M68,24 Q76,10 84,7" stroke="${INK}" stroke-width="1.8" fill="none"/><circle cx="84" cy="7" r="2.6" fill="#ffd54a"/></g>
      <path d="M22,62 Q20,18 60,18 Q100,18 98,62 L100,102 Q96,106 88,100 L88,66 L32,66 L32,100 Q24,106 20,102 Z" fill="#23282c"/>
      <circle cx="26" cy="70" r="7" fill="${SKIN}"/><circle cx="94" cy="70" r="7" fill="${SKIN}"/>
      <ellipse cx="60" cy="66" rx="32" ry="30" fill="${SKIN}"/>
      <path d="M28,58 Q30,24 60,24 Q90,24 92,58 Q84,40 70,38 Q66,48 60,50 Q56,40 50,38 Q36,42 28,58 Z" fill="#23282c"/>
      <path d="M40,52 q6,-4 11,0 M69,52 q6,-4 11,0" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      ${eyes(46, 74, 66, 8.5)}
      <ellipse cx="36" cy="78" rx="6" ry="3.5" fill="#ff8f8f" opacity="0.45"/><ellipse cx="84" cy="78" rx="6" ry="3.5" fill="#ff8f8f" opacity="0.45"/>
      <ellipse cx="60" cy="75" rx="2.2" ry="1.6" fill="#e08a80"/>
      ${mouth(60, 81, 4.5)}
      <path d="M40,96 Q60,90 80,96 L84,124 L36,124 Z" fill="#e8a35e"/>
      <path d="M48,96 L50,124 M72,96 L70,124" stroke="#3f4d33" stroke-width="3"/>
      <circle cx="60" cy="102" r="1.4" fill="#8a5a2e"/><circle cx="60" cy="108" r="1.4" fill="#8a5a2e"/><circle cx="60" cy="114" r="1.4" fill="#8a5a2e"/>
      <g class="arm-l" style="transform-origin:40px 98px"><ellipse cx="32" cy="108" rx="8" ry="12" fill="#e8a35e"/><circle cx="30" cy="121" r="4.5" fill="${SKIN}"/></g>
      <g class="arm-r" style="transform-origin:80px 98px"><ellipse cx="88" cy="108" rx="8" ry="12" fill="#e8a35e"/><circle cx="90" cy="121" r="4.5" fill="${SKIN}"/></g>
      <rect x="37" y="120" width="46" height="5" fill="#1d1a26"/><rect x="56" y="119" width="8" height="7" rx="1.5" fill="none" stroke="#d9a53a" stroke-width="1.6"/>
      <path d="M38,125 L82,125 L92,150 L28,150 Z" fill="#7a9a5a"/>
      <path d="M44,127 L40,149 M52,127 L50,149 M60,127 L60,149 M68,127 L70,149 M76,127 L80,149" stroke="#5f7d43" stroke-width="1"/>
      <g class="legs"><rect x="46" y="150" width="8" height="8" fill="#e0b24a"/><rect x="66" y="150" width="8" height="8" fill="#e0b24a"/>
        <path d="M43,157 h13 v8 q0,4 -4,4 h-11 q-3,0 -3,-3 q0,-4 5,-5 z" fill="${INK}"/><path d="M64,157 h13 v12 h-11 q-4,0 -4,-4 z" fill="${INK}"/></g>
      ${(props || []).map(p => PROPS[p] || '').join('')}`,
    // Puddy: a brown tabby with big ears, long whiskers and amber eyes (and a biscuit).
    puddy: props => cat({ base: '#a8875f', shade: '#8a6c48', patch: null, stripe: '#3f2c1c', eye: '#d9a53a', muzzle: '#e6d2ae', props, big: true,
      patches: `<path d="M40,102 q6,8 2,20 M52,98 q5,10 1,24 M68,98 q-5,10 -1,24 M80,102 q-6,8 -2,20" stroke="#3f2c1c" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      cap: `<path d="M46,40 q3,8 -1,14 M60,37 v15 M74,40 q-3,8 1,14 M30,60 q8,0 12,6 M90,60 q-8,0 -12,6 M31,72 q7,0 10,4 M89,72 q-7,0 -10,4" stroke="#3f2c1c" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
      tail: '#a8875f', tailStripes: true }),
    // Lilca: a white cat with dark tabby patches on her back and a tabby "cap" on her head, always with a book.
    lilca: props => cat({ base: '#fbf8f2', shade: '#e6e0d6', patch: '#4b3b30', stripe: '#241a14', eye: '#a8c44a', muzzle: '#fbf8f2', props,
      patches: `<path d="M34,104 Q40,92 60,92 Q82,92 88,106 L90,132 Q76,122 62,126 Q46,130 32,124 Z" fill="#4b3b30"/>
        <path d="M42,100 q4,10 0,22 M54,96 q4,12 0,26 M68,96 q4,12 0,26 M80,100 q4,10 0,20" stroke="#241a14" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
      cap: `<path d="M27,70 Q26,38 60,36 Q94,38 93,70 Q86,62 78,64 Q72,54 60,56 Q50,54 44,64 Q34,62 27,70 Z" fill="#4b3b30"/>
        <path d="M44,40 q2,8 -2,14 M60,37 v14 M76,40 q-2,8 2,14 M34,52 q6,2 8,8 M86,52 q-6,2 -8,8" stroke="#241a14" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,
      tail: '#4b3b30' }),
    // Bear: a teddy with sunglasses, navy jacket over a white tee with a green print, jeans, sneakers.
    bear: props => `
      <circle cx="30" cy="36" r="13" fill="#9a6a3a"/><circle cx="30" cy="36" r="7" fill="#c89a6a"/><circle cx="90" cy="36" r="13" fill="#9a6a3a"/><circle cx="90" cy="36" r="7" fill="#c89a6a"/>
      <ellipse cx="60" cy="64" rx="34" ry="31" fill="#9a6a3a"/>
      <path d="M48,36 q4,-10 8,-2 q3,-10 7,-1 q4,-9 7,2" fill="#9a6a3a" stroke="#7a5028" stroke-width="1.5"/>
      <ellipse cx="60" cy="80" rx="17" ry="12" fill="#d9b48a"/>
      <g class="eyes" style="transform-origin:60px 62px"><rect x="32" y="54" width="24" height="16" rx="7" fill="#221814"/><rect x="64" y="54" width="24" height="16" rx="7" fill="#221814"/>
        <path d="M56,60 h8" stroke="#221814" stroke-width="3"/><path d="M36,58 l6,0" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7"/><path d="M68,58 l6,0" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7"/></g>
      <ellipse cx="60" cy="75" rx="6" ry="4.5" fill="#221814"/>
      ${mouth(60, 83, 5)}
      <path d="M34,96 Q60,90 86,96 L90,138 L30,138 Z" fill="#1f2a44"/>
      <path d="M46,96 L50,136 L70,136 L74,96 Q60,92 46,96 Z" fill="#f4f1ea"/>
      <rect x="50" y="106" width="20" height="18" rx="3" fill="#5aa35a"/><path d="M53,112 q4,-4 7,0 t7,0 M53,118 q4,-4 7,0 t7,0" stroke="#2f6a3a" stroke-width="1.5" fill="none"/>
      <path d="M46,96 L50,136 M74,96 L70,136" stroke="#141c30" stroke-width="2"/>
      <g class="arm-l" style="transform-origin:36px 100px"><ellipse cx="30" cy="114" rx="9" ry="15" fill="#1f2a44"/><circle cx="29" cy="129" r="6" fill="#9a6a3a"/></g>
      <g class="arm-r" style="transform-origin:84px 100px"><ellipse cx="90" cy="114" rx="9" ry="15" fill="#1f2a44"/><circle cx="91" cy="129" r="6" fill="#9a6a3a"/></g>
      <g class="legs"><rect x="38" y="136" width="18" height="22" rx="4" fill="#243150"/><rect x="64" y="136" width="18" height="22" rx="4" fill="#243150"/>
        <path d="M34,158 h24 v6 q0,4 -4,4 h-18 q-4,0 -4,-4 z" fill="#f4f4f4" stroke="#cfcfcf"/><path d="M62,158 h24 v6 q0,4 -4,4 h-18 q-4,0 -4,-4 z" fill="#f4f4f4" stroke="#cfcfcf"/></g>
      ${(props || []).map(p => PROPS[p] || '').join('')}`,
    // Kloenchen: blonde ponytail, black V-neck tee, jeans, blue backpack, a gold watch.
    kloen: props => `
      <path d="M86,40 Q112,44 108,80 Q104,96 96,100 Q100,76 88,58 Z" fill="#d9b27a"/>
      <path d="M26,34 Q30,86 40,98 L80,98 Q90,86 94,34 Z" fill="#6f8fb0"/>
      <path d="M26,64 Q24,26 60,24 Q96,26 94,64 L92,76 L28,76 Z" fill="#d9b27a"/>
      <circle cx="26" cy="68" r="6" fill="#fbe0c8"/><circle cx="94" cy="68" r="6" fill="#fbe0c8"/>
      <ellipse cx="60" cy="66" rx="30" ry="29" fill="#fbe0c8"/>
      <path d="M30,58 Q32,30 62,30 Q90,30 92,56 Q80,40 62,42 Q58,52 42,52 Q34,52 30,58 Z" fill="#d9b27a"/>
      <circle cx="86" cy="40" r="5" fill="#3a3a44"/>
      ${eyes(47, 73, 68, 7.5)}
      <path d="M38,60 l4,-3 M82,60 l-4,-3" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>
      <ellipse cx="38" cy="80" rx="5.5" ry="3.2" fill="#ff8f8f" opacity="0.45"/><ellipse cx="82" cy="80" rx="5.5" ry="3.2" fill="#ff8f8f" opacity="0.45"/>
      <path class="smile" d="M53,82 Q60,90 67,82 Z" fill="#c0505a"/><ellipse class="oh" cx="60" cy="85" rx="3" ry="4" fill="${INK}"/>
      <path d="M40,96 Q60,90 80,96 L84,132 L36,132 Z" fill="#1d1d22"/><path d="M52,95 L60,108 L68,95 Z" fill="#fbe0c8"/>
      <path d="M44,96 L44,120 M76,96 L76,120" stroke="#6f8fb0" stroke-width="4"/>
      <g class="arm-l" style="transform-origin:40px 100px"><ellipse cx="33" cy="110" rx="7" ry="11" fill="#1d1d22"/><rect x="28" y="118" width="9" height="12" rx="4" fill="#fbe0c8"/><rect x="28" y="124" width="9" height="3" fill="#d9a53a"/></g>
      <g class="arm-r" style="transform-origin:80px 100px"><ellipse cx="87" cy="110" rx="7" ry="11" fill="#1d1d22"/><rect x="83" y="118" width="9" height="12" rx="4" fill="#fbe0c8"/></g>
      <g class="legs"><rect x="42" y="130" width="15" height="28" rx="4" fill="#4a6a9a"/><rect x="63" y="130" width="15" height="28" rx="4" fill="#4a6a9a"/>
        <path d="M39,158 h20 v5 q0,4 -4,4 h-14 q-4,0 -4,-4 z" fill="#f4f4f4" stroke="#cfcfcf"/><path d="M61,158 h20 v5 q0,4 -4,4 h-14 q-4,0 -4,-4 z" fill="#f4f4f4" stroke="#cfcfcf"/></g>
      ${(props || []).map(p => PROPS[p] || '').join('')}`,
    // On their bikes: a black city bike (Bear's has a basket) with the rider sitting on it.
    bearRide: () => bike('#26262c', true) + `<g transform="translate(8 -14) scale(0.82)">${ART.bear([])}</g>`,
    kloenRide: () => bike('#2c3440', false) + `<g transform="translate(10 -12) scale(0.8)">${ART.kloen([])}</g>`,
    // A black-and-white cat, very serious.
    cat2: props => cat({ base: '#fbf8f2', shade: '#e6e0d6', patch: '#1f1d22', stripe: '#1f1d22', eye: '#b8d45a', muzzle: '#fbf8f2', props,
      patches: `<path d="M32,110 Q36,94 56,92 L60,128 Q44,132 30,126 Z" fill="#1f1d22"/>`,
      cap: `<path d="M27,70 Q26,38 60,36 Q76,37 84,46 L80,62 Q72,54 62,56 Q52,54 46,62 Q34,62 27,70 Z" fill="#1f1d22"/>`, tail: '#1f1d22' }),
    // A little bird, flapping, with something in its beak.
    bird: () => `<g class="flap" style="transform-origin:60px 90px"><path d="M60,90 Q30,60 14,76 Q34,84 60,96 Z" fill="#6a8fd0"/><path d="M60,90 Q90,60 106,76 Q86,84 60,96 Z" fill="#6a8fd0"/></g>
      <ellipse cx="60" cy="96" rx="20" ry="15" fill="#8fb7ff"/><circle cx="76" cy="88" r="10" fill="#8fb7ff"/><circle cx="79" cy="86" r="2.4" fill="${INK}"/><path d="M85,89 l10,3 l-10,3 z" fill="#ffb300"/>
      <rect x="92" y="90" width="12" height="7" rx="3" fill="#fff4dc" stroke="#d9a53a" stroke-width="1.5"/>`,
    // The note: a tiny scroll tied with a golden ribbon.
    note: () => `<rect x="30" y="120" width="60" height="36" rx="8" fill="#fff4dc" stroke="#d9a53a" stroke-width="3"/><rect x="54" y="118" width="12" height="40" fill="#ffd54a"/><text x="60" y="144" text-anchor="middle" font-size="16" font-weight="700" fill="#1d2a5a" font-family="Fredoka,system-ui">?</text>`,
    // The secret box on the pier.
    box: () => `<rect x="20" y="118" width="80" height="46" rx="6" fill="#a8743f" stroke="#6a4520" stroke-width="3"/><rect x="16" y="108" width="88" height="16" rx="5" fill="#8a5a2e" stroke="#6a4520" stroke-width="3"/>
      <path d="M60,128 l4,8 9,1 -7,6 2,9 -8,-5 -8,5 2,-9 -7,-6 9,-1 z" fill="#ffd54a" stroke="#b37a00" stroke-width="1.5"/>`,

    // The beetle: small, shiny and a bit embarrassed.
    beetle: () => `
      <g class="legs"><path d="M40,150 l-10,10 M50,154 l-6,12 M70,154 l6,12 M80,150 l10,10" stroke="${INK}" stroke-width="3" stroke-linecap="round"/></g>
      <ellipse cx="60" cy="138" rx="30" ry="22" fill="#2fbf8f"/><path d="M60,116 V160" stroke="#1a7f5f" stroke-width="2.5"/>
      <ellipse cx="50" cy="130" rx="8" ry="5" fill="#9ff5d5" opacity="0.6"/>
      <circle cx="60" cy="112" r="14" fill="#2b2140"/>
      <g class="ant"><path d="M52,100 Q46,86 38,84 M68,100 Q74,86 82,84" stroke="#2b2140" stroke-width="2" fill="none"/><circle cx="38" cy="84" r="3" fill="#2b2140"/><circle cx="82" cy="84" r="3" fill="#2b2140"/></g>
      ${eyes(54, 66, 110, 3.8)}
      <ellipse cx="50" cy="118" rx="3" ry="2" fill="#ff8fb0" opacity="0.7"/><ellipse cx="70" cy="118" rx="3" ry="2" fill="#ff8fb0" opacity="0.7"/>`,
    // The suspicious flower (it screams too).
    flower: () => `
      <path d="M60,170 Q56,130 60,96" stroke="#3f9a4a" stroke-width="6" fill="none"/><path d="M58,140 Q40,128 30,134 Q44,146 58,142" fill="#4fbf5a"/>
      <g class="petals" style="transform-origin:60px 70px">${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="60" cy="44" rx="13" ry="22" fill="#ff7ab8" transform="rotate(${a} 60 70)"/>`).join('')}</g>
      <circle cx="60" cy="70" r="16" fill="#ffd54a"/>
      ${eyes(54, 66, 68, 3)}
      ${mouth(60, 76, 3.5)}`,
  };
  const NAMES = { morfi: 'Mörfi', puddy: 'Puddy', lilca: 'Lilca', beetle: 'Beetle', flower: 'Flower', mom: 'Beetle family', bear: 'Bear', kloen: 'Kloenchen', cat2: 'The cat', bearRide: 'Bear', kloenRide: 'Kloenchen' };
  const SIZE = { morfi: 1, puddy: 0.9, lilca: 0.9, beetle: 0.72, flower: 1.15, bear: 1.08, kloen: 1, bearRide: 1.12, kloenRide: 1.08, cat2: 0.62, bird: 0.6, note: 0.3, box: 0.55 };

  // ── Scenery (400×700, anchored at the bottom) ──
  const mushroomHouse = (x, y, s, cap = '#e8433f') => `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-22,0 Q-24,-46 -16,-60 L16,-60 Q24,-46 22,0 Z" fill="#fff4dc"/><path d="M-9,0 V-22 Q0,-30 9,-22 V0 Z" fill="#8a5a2e"/>
      <circle cx="-10" cy="-40" r="5" fill="#ffe27a" class="window"/>
      <path d="M-48,-56 Q-40,-104 0,-106 Q40,-104 48,-56 Q24,-66 0,-64 Q-24,-66 -48,-56 Z" fill="${cap}"/>
      <circle cx="-22" cy="-82" r="6" fill="#fff"/><circle cx="8" cy="-94" r="5" fill="#fff"/><circle cx="26" cy="-72" r="7" fill="#fff"/><circle cx="-2" cy="-74" r="4" fill="#fff"/></g>`;
  const grass = (y, color, n = 40, h = 26) => { let s = ''; for (let i = 0; i < n; i++) { const x = (i / n) * 420 - 10 + (i % 3) * 3, hh = h * (0.6 + ((i * 37) % 10) / 20); s += `<path d="M${x},${y} q2,${-hh * 0.6} ${(i % 2 ? 4 : -3)},${-hh}" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round" class="blade" style="--i:${i % 7}"/>`; } return s; };
  const clouds = () => [[40, 120, 1.2], [230, 80, 1.6], [320, 200, 1], [120, 240, 0.9], [300, 320, 1.3]].map(([x, y, k], i) => `<g class="cloud" style="--i:${i}" opacity="0.8"><ellipse cx="${x}" cy="${y}" rx="${60 * k}" ry="${9 * k}" fill="#fff"/><ellipse cx="${x + 30 * k}" cy="${y - 6 * k}" rx="${40 * k}" ry="${7 * k}" fill="#fff" opacity="0.8"/></g>`).join('');
  const pines = (y, n, c1, c2, h = 150) => Array.from({ length: n }, (_, i) => { const x = (i / n) * 440 - 20 + (i % 2) * 12, hh = h * (0.75 + ((i * 29) % 10) / 30); return `<path d="M${x},${y - hh} L${x + 26},${y - hh * 0.45} L${x + 14},${y - hh * 0.45} L${x + 34},${y} L${x - 34},${y} L${x - 14},${y - hh * 0.45} L${x - 26},${y - hh * 0.45} Z" fill="${i % 2 ? c1 : c2}"/><rect x="${x - 4}" y="${y}" width="8" height="14" fill="#6a4520"/>`; }).join('');
  const BG = {
    // Schönefeld: a big sky with wispy clouds and contrails, willow twigs, a field, a fence, houses and a pylon.
    field: () => `
      <defs><linearGradient id="skf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f7fc8"/><stop offset="0.7" stop-color="#a8c8ef"/><stop offset="1" stop-color="#dfeaf7"/></linearGradient></defs>
      <rect width="400" height="700" fill="url(#skf)"/><circle cx="210" cy="90" r="40" fill="#fffbe0" opacity="0.9" class="sun"/><circle cx="210" cy="90" r="80" fill="#fff" opacity="0.18"/>
      ${clouds()}<path d="M-20,300 L420,180 M40,380 L420,270" stroke="#fff" stroke-width="3" opacity="0.6"/>
      <g opacity="0.9">${[0, 1, 2, 3, 4].map(i => `<path d="M${300 + i * 22},0 q-10,70 -${20 + i * 8},${120 + i * 20}" stroke="#6a7a3a" stroke-width="2" fill="none"/>${[20, 45, 70, 95].map(t => `<ellipse cx="${300 + i * 22 - t * 0.2}" cy="${t + i * 10}" rx="3" ry="9" fill="#8a9a4a" transform="rotate(${20 - i * 8} ${300 + i * 22 - t * 0.2} ${t + i * 10})"/>`).join('')}`).join('')}</g>
      <rect x="18" y="470" width="44" height="36" fill="#e8eaee"/><rect x="70" y="474" width="40" height="32" fill="#dde0e6"/><rect x="118" y="480" width="54" height="26" fill="#e8e4dc"/>
      ${[0, 1, 2, 3].map(i => `<rect x="${24 + i * 10}" y="478" width="5" height="5" fill="#9aa4b4"/>`).join('')}
      <path d="M350,506 L356,440 L362,506 M346,452 h20 M348,466 h16" stroke="#6a6a70" stroke-width="2" fill="none"/><path d="M0,452 Q180,446 356,448 L400,450" stroke="#555" stroke-width="1" fill="none"/>
      <path d="M0,506 H400 V700 H0 Z" fill="#6aa04a"/><path d="M0,520 Q200,512 400,522 V700 H0 Z" fill="#5a9040"/>
      ${[30, 150, 270, 380].map(x => `<rect x="${x}" y="540" width="5" height="60" fill="#3a2e24"/>`).join('')}<path d="M0,556 H400 M0,574 H400" stroke="#6a6a6a" stroke-width="1" opacity="0.6"/>
      <path d="M260,700 Q300,620 400,600 V700 Z" fill="#cfcac0"/>${grass(620, '#7aa04a', 30, 40)}`,
    // The path with the cat: asphalt with fallen leaves, clover, tall grass and bushes.
    path: () => `
      <rect width="400" height="700" fill="#9fc46a"/>
      <path d="M0,0 H400 V380 Q300,420 200,400 Q100,380 0,420 Z" fill="#6f9a3a"/>${[40, 120, 200, 290, 360].map((x, i) => `<ellipse cx="${x}" cy="${240 + (i % 2) * 40}" rx="70" ry="110" fill="${i % 2 ? '#5f8a2e' : '#7aa848'}"/>`).join('')}
      ${grass(430, '#c8b060', 40, 120)}${grass(460, '#7ab04a', 44, 90)}
      <path d="M-40,700 L140,440 Q170,430 180,450 L110,700 Z" fill="#8a8e96"/><path d="M-40,700 L140,440" stroke="#7a7e86" stroke-width="3"/>
      ${[[40, 600], [80, 520], [120, 470], [20, 660], [150, 460], [60, 560]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="4" fill="${i % 2 ? '#d98a3a' : '#c8a060'}" transform="rotate(${i * 40} ${x} ${y})"/>`).join('')}
      ${grass(700, '#5fa03a', 40, 60)}`,
    // The pine forest near Stahnsdorf.
    forest: () => `
      <defs><linearGradient id="skw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb0e0"/><stop offset="1" stop-color="#d8ecd0"/></linearGradient></defs>
      <rect width="400" height="700" fill="url(#skw)"/>
      ${pines(470, 9, '#2f6a45', '#3a7a50', 260)}${pines(530, 8, '#1f5a35', '#26673d', 220)}
      <path d="M0,540 H400 V700 H0 Z" fill="#5a8a3a"/><path d="M150,700 Q190,600 200,540 Q210,600 260,700 Z" fill="#c8a878"/>
      ${[[40, 600], [320, 620], [80, 660]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="18" ry="6" fill="#8a6a3a" opacity="0.5"/>`).join('')}
      ${grass(700, '#6aa04a', 36, 40)}`,
    // The Wannsee: clouds, water, sailboats across the lake, trees on the shore, a pier railing.
    lake: () => `
      <defs><linearGradient id="skl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a9ab8"/><stop offset="1" stop-color="#e8ecf4"/></linearGradient><linearGradient id="wl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8aa8c0"/><stop offset="1" stop-color="#5a7a98"/></linearGradient></defs>
      <rect width="400" height="700" fill="url(#skl)"/>${[[60, 90, 1.8], [250, 140, 2.2], [150, 230, 1.6], [330, 60, 1.4]].map(([x, y, k], i) => `<g class="cloud" style="--i:${i}"><ellipse cx="${x}" cy="${y}" rx="${50 * k}" ry="${22 * k}" fill="#fff" opacity="0.85"/><ellipse cx="${x + 30 * k}" cy="${y + 8 * k}" rx="${40 * k}" ry="${18 * k}" fill="#dfe4ee"/></g>`).join('')}
      <path d="M0,390 Q60,370 120,386 Q220,376 300,388 Q360,380 400,386 V410 H0 Z" fill="#3f6a45"/><rect x="330" y="372" width="30" height="16" fill="#e8dcc8"/><path d="M326,372 l19,-12 19,12 z" fill="#b85a3a"/>
      ${[150, 175, 190, 210, 232, 250].map((x, i) => `<path d="M${x},${404 - (i % 2) * 3} v-34" stroke="#fff" stroke-width="1.5"/><path d="M${x + 2},${372} l${10 - (i % 3) * 2},26 h-10 z" fill="#fff" opacity="0.9"/>`).join('')}
      <rect y="405" width="400" height="295" fill="url(#wl)"/>${[440, 480, 530, 590].map((y, i) => `<path d="M${-20 + i * 30},${y} q20,-4 40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0" stroke="#fff" stroke-width="2" fill="none" opacity="${0.35 - i * 0.05}" class="wave" style="--i:${i}"/>`).join('')}
      <rect x="0" y="560" width="400" height="140" fill="#9a9aa0"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `<rect x="${i * 44}" y="560" width="40" height="18" fill="#a8a8ae" stroke="#8a8a90"/>`).join('')}
      <path d="M0,520 H400 M0,540 H400" stroke="#d8dce4" stroke-width="4"/>${[20, 110, 200, 290, 380].map(x => `<rect x="${x}" y="514" width="5" height="48" fill="#d8dce4"/>`).join('')}`,
    // The route of Etappe 2 on a map: it draws itself from Schönefeld to the Wannsee.
    map: () => `
      <rect width="400" height="700" fill="#f2efe4"/>
      <path d="M0,140 Q60,120 90,180 Q110,240 70,300 Q40,340 0,330 Z" fill="#cfe6b8"/><path d="M40,190 Q70,200 66,250 Q60,290 40,300 Q30,250 40,190 Z" fill="#a8d0ec"/>
      <path d="M150,380 Q260,360 320,420 Q280,470 180,460 Z" fill="#d8ecc8"/>
      ${[[0, 250, 400, 230], [0, 330, 400, 350], [120, 0, 170, 700], [260, 0, 240, 700], [0, 420, 400, 440]].map(([a, b, c, d]) => `<path d="M${a},${b} L${c},${d}" stroke="#ffffff" stroke-width="8"/><path d="M${a},${b} L${c},${d}" stroke="#f2c070" stroke-width="3"/>`).join('')}
      <path d="M0,300 Q100,280 170,300 Q250,320 400,290" stroke="#a8d0ec" stroke-width="6" fill="none"/>
      <text x="230" y="200" font-family="Fredoka,system-ui" font-weight="700" font-size="30" fill="#2a2a30">BERLIN</text>
      <path class="route" d="M360,390 Q330,386 320,372 Q300,350 280,368 Q240,386 200,380 Q170,378 150,396 Q128,410 110,392 Q96,378 80,374 Q60,372 46,360" stroke="#2f5fd0" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      ${[[320, 372], [280, 368], [200, 380], [150, 396], [110, 392]].map(([x, y], i) => `<g class="pin" style="--i:${i}"><circle cx="${x}" cy="${y}" r="10" fill="#1d1d22"/><rect x="${x - 5}" y="${y - 3.5}" width="10" height="7" rx="1.5" fill="#fff"/><circle cx="${x}" cy="${y}" r="2" fill="#1d1d22"/></g>`).join('')}
      <circle cx="360" cy="390" r="12" fill="#2f9a4a" stroke="#fff" stroke-width="3"/><text x="360" y="395" text-anchor="middle" font-size="13" font-weight="700" fill="#fff" font-family="Fredoka,system-ui">A</text>
      <circle cx="46" cy="360" r="14" fill="#c0602a" stroke="#fff" stroke-width="3"/><text x="46" y="365" text-anchor="middle" font-size="14" font-weight="700" fill="#fff" font-family="Fredoka,system-ui">B</text>
      <text x="374" y="418" text-anchor="end" font-size="13" font-weight="700" fill="#555" font-family="Fredoka,system-ui">Schönefeld</text><text x="118" y="424" font-size="13" font-weight="700" fill="#555" font-family="Fredoka,system-ui">Stahnsdorf</text><text x="14" y="336" font-size="13" font-weight="700" fill="#555" font-family="Fredoka,system-ui">Wannsee</text>
      <rect x="40" y="480" width="320" height="70" rx="18" fill="#fff" stroke="#e0dccf" stroke-width="2"/>
      <text x="200" y="508" text-anchor="middle" font-size="18" font-weight="700" fill="#2a2a30" font-family="Fredoka,system-ui">Etappe 2 · Schönefeld → Wannsee</text>
      <text x="200" y="534" text-anchor="middle" font-size="15" font-weight="600" fill="#777" font-family="Fredoka,system-ui">⏱ 4h 17m · ↔ 39.5 km · ↗ 120 m</text>`,
    
    village: () => `
      <defs><linearGradient id="sk1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a3fa8"/><stop offset="0.45" stop-color="#ff7a8a"/><stop offset="0.75" stop-color="#ffb56b"/></linearGradient></defs>
      <rect width="400" height="700" fill="url(#sk1)"/><circle cx="300" cy="420" r="46" fill="#ffe08a" opacity="0.9" class="sun"/>
      <path d="M0,470 Q60,400 120,440 Q180,380 250,430 Q320,390 400,440 V700 H0 Z" fill="#6a3f7a" opacity="0.7"/>
      <path d="M0,520 Q100,470 200,500 Q300,470 400,510 V700 H0 Z" fill="#3f8a4f"/>
      ${mushroomHouse(70, 560, 1.1)}${mushroomHouse(330, 545, 0.8, '#ff8a3c')}${mushroomHouse(210, 520, 0.55, '#d63fa0')}
      <rect y="560" width="400" height="140" fill="#2f7a42"/>${grass(565, '#4fbf5a', 44)}`,
    meadow: () => `
      <defs><linearGradient id="sk2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a4fb0"/><stop offset="0.6" stop-color="#ff9a7a"/><stop offset="1" stop-color="#ffd08a"/></linearGradient></defs>
      <rect width="400" height="700" fill="url(#sk2)"/>
      <path d="M0,500 Q100,450 200,480 Q300,450 400,490 V700 H0 Z" fill="#4f9a55"/>
      <circle cx="60" cy="140" r="1.5" fill="#fff"/><circle cx="300" cy="90" r="1.5" fill="#fff"/><circle cx="200" cy="170" r="1" fill="#fff"/>
      <rect y="560" width="400" height="140" fill="#3a8a48"/>${grass(565, '#5fcf6a', 50, 40)}
      <g transform="translate(40 560)"><ellipse cx="0" cy="-8" rx="14" ry="10" fill="#c9a26a"/><path d="M-4,-8 a6,6 0 1 1 8,0" fill="none" stroke="#8a6a3a" stroke-width="2"/><path d="M12,-4 q8,-2 10,-10" stroke="#c9a26a" stroke-width="3" fill="none"/></g>`,
    grass: () => `
      <rect width="400" height="700" fill="#2f6a3a"/>
      ${[0, 1, 2].map(k => grass(700 - k * 8, ['#1f5a2a', '#3f9a4a', '#5fcf6a'][k], 34, 520 - k * 90)).join('')}
      <circle cx="320" cy="120" r="30" fill="#ffe08a" opacity="0.35"/>`,
    leaf: () => `
      <rect width="400" height="700" fill="#2c6a3f"/>
      <path d="M-20,300 Q200,180 420,300 Q380,340 200,330 Q20,340 -20,300 Z" fill="#6fd06a"/><path d="M-20,300 Q200,250 420,300" stroke="#3f9a4a" stroke-width="5" fill="none"/>
      ${[40, 120, 200, 280, 360].map(x => `<path d="M${x},${300 - (x > 200 ? (400 - x) : x) * 0.18} l-20,26" stroke="#3f9a4a" stroke-width="3"/>`).join('')}
      <rect y="560" width="400" height="140" fill="#2f7a42"/>${grass(565, '#4fbf5a', 44)}`,
    leafhouse: () => `
      <defs><linearGradient id="sk3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2d7a"/><stop offset="1" stop-color="#ff8a7a"/></linearGradient></defs>
      <rect width="400" height="700" fill="url(#sk3)"/>
      <path d="M200,560 Q180,420 280,380 Q380,360 380,460 Q360,420 300,430 Q240,450 250,560 Z" fill="#6fd06a"/><path d="M250,560 Q240,450 300,430" stroke="#3f9a4a" stroke-width="4" fill="none"/>
      <ellipse cx="300" cy="540" rx="26" ry="20" fill="#3a2a1a"/><circle cx="300" cy="534" r="6" fill="#ffe27a" class="window"/>
      <rect y="560" width="400" height="140" fill="#2f7a42"/>${grass(565, '#4fbf5a', 44)}`,
    night: () => `
      <rect width="400" height="700" fill="#161236"/>
      ${Array.from({ length: 40 }, (_, i) => `<circle cx="${(i * 97) % 400}" cy="${(i * 53) % 420}" r="${1 + (i % 3) * 0.5}" fill="#fff" opacity="${0.4 + (i % 4) * 0.15}" class="twinkle" style="--i:${i % 5}"/>`).join('')}
      <circle cx="320" cy="110" r="30" fill="#fff3c8"/><circle cx="332" cy="100" r="28" fill="#161236"/>
      <path d="M0,520 Q100,470 200,500 Q300,470 400,510 V700 H0 Z" fill="#20462c"/>
      ${mushroomHouse(290, 590, 1.7)}
      <rect y="590" width="400" height="110" fill="#1a3a24"/>${grass(595, '#2f6a3a', 44)}`,
  };

  // ── Chapter 1: Mörfi and the Very Important Mission ──
  const CH1 = [
    { bg: 'village' },
    { show: { morfi: { x: 26, props: ['tea'] }, puddy: { x: 55, props: ['biscuit'] }, lilca: { x: 80, props: ['book'] } } },
    { narr: 'One evening, just as the sun was disappearing behind the trees, Mörfi was sitting outside her mushroom house.' },
    { narr: 'She had a tiny cup of tea. Puddy was eating a biscuit. Lilca was reading a book.' },
    { narr: 'And Mörfi was doing what Mörfi did best: snitching.' },
    { props: { morfi: ['telescope'] } },
    { say: 'morfi', text: 'Hmmmm…' },
    { say: 'puddy', text: 'What?' },
    { say: 'morfi', text: 'I have detected suspicious activity.', act: 'point' },
    { say: 'lilca', text: 'What kind of suspicious activity?' },
    { say: 'morfi', text: 'There.', act: 'point' },
    { narr: 'Everyone looked. Nothing. There was a mushroom. A tree. A snail. Another mushroom.' },
    { say: 'puddy', text: 'Mörfi… that’s a flower.' },
    { say: 'morfi', text: 'I know. The flower is facing the wrong direction.' },
    { say: 'lilca', text: 'Mörfi, flowers don’t have a direction.' },
    { say: 'morfi', text: 'That’s exactly what they WANT you to think.', act: 'gasp' },
    { props: { puddy: [] } },
    { say: 'puddy', text: 'This is serious.', act: 'jump' },
    { say: 'morfi', text: 'Extremely. Puddy, prepare the emergency equipment!', act: 'jump', props: ['satchel'] },
    { say: 'puddy', text: 'What equipment?', act: 'salute' },
    { say: 'morfi', text: 'Two biscuits. And a spoon.' },
    { say: 'puddy', text: 'For what?' },
    { say: 'morfi', text: 'I don’t know yet. That’s why it’s emergency equipment.' },
    { props: { puddy: ['spoon'] } },
    { walk: { morfi: 115, puddy: 125, lilca: 135 }, t: 1600 },
    { bg: 'grass', show: { morfi: { x: -15, props: ['satchel'] }, puddy: { x: -28, props: ['spoon'] }, lilca: { x: -40, props: ['book'] } } },
    { walk: { morfi: 62, puddy: 42, lilca: 22 }, t: 1500 },
    { narr: 'They crept through the grass…' },
    { puzzle: 4, scene: 'grass', title: 'Creep through the grass', hint: 'Clear a path so Mörfi can sneak through the grass!' },
    // …and off they sneak, through the grass.
    { bg: 'grass', front: 'grass', show: { morfi: { x: -12, props: ['satchel'] }, puddy: { x: -26, props: ['spoon'] }, lilca: { x: -40, props: ['book'] } } },
    { walk: { morfi: 118, puddy: 106, lilca: 94 }, t: 4200 },
    { bg: 'leaf', show: { morfi: { x: 20, props: ['satchel'] }, puddy: { x: 45, props: ['spoon'] }, lilca: { x: 70, props: ['book'] } } },
    { narr: 'They crawled underneath a leaf…' },
    { puzzle: 22, scene: 'leaf', title: 'Under the leaf', hint: 'Make room under the leaf — quietly!' },
    { bg: 'leaf', front: 'leaf', low: true, show: { morfi: { x: -12, props: ['satchel'] }, puddy: { x: -26, props: ['spoon'] }, lilca: { x: -40, props: ['book'] } } },
    { walk: { morfi: 118, puddy: 106, lilca: 94 }, t: 4200 },
    { bg: 'village', show: { morfi: { x: 20, props: ['satchel'] }, puddy: { x: 35, props: ['spoon'] }, lilca: { x: 48, props: ['book'] } } },
    { narr: 'They hid behind a mushroom…' },
    { puzzle: 40, scene: 'village', title: 'Behind the mushroom', hint: 'Get everyone behind the mushroom without being seen!' },
    { bg: 'village', front: 'mushroom', show: { morfi: { x: -12, props: ['satchel'] }, puddy: { x: -26, props: ['spoon'] }, lilca: { x: -40, props: ['book'] } } },
    { walk: { morfi: 58, puddy: 50, lilca: 42 }, t: 1800 },
    { act: { morfi: 'peek', puddy: 'peek', lilca: 'peek' }, wait: 1100 },
    { walk: { morfi: 118, puddy: 106, lilca: 94 }, t: 4200 },
    { bg: 'meadow', show: { morfi: { x: 18, props: ['satchel'] }, puddy: { x: 34, props: ['spoon'] }, lilca: { x: 50, props: ['book'] }, flower: { x: 80 } } },
    { narr: 'They approached the suspicious flower.' },
    { say: 'morfi', text: 'Stop.', act: 'stop' },
    { narr: 'Everyone froze. Mörfi leaned forward.' },
    { act: { flower: 'wiggle' } },
    { say: 'morfi', text: 'It moved.', act: 'gasp' },
    { say: 'lilca', text: 'Wind.' },
    { say: 'morfi', text: 'No.' },
    { act: { flower: 'wiggle' } },
    { say: 'morfi', text: 'THERE!', act: 'point' },
    { act: { morfi: 'scream', puddy: 'scream', lilca: 'scream', flower: 'scream' }, shake: true, narr: 'Puddy screamed. Lilca screamed. Mörfi screamed. The flower screamed.' },
    { narr: 'Everyone stopped. Mörfi stared at the flower. The flower stared back.' },
    { show: { beetle: { x: 66 } }, enter: 'beetle' },
    { say: 'beetle', text: 'Um… hello?' },
    { say: 'morfi', text: 'Oh.' },
    { say: 'beetle', text: 'I was just trying to get home.' },
    { say: 'morfi', text: 'So… you’re not an intergalactic spy?' },
    { say: 'beetle', text: 'No.' },
    { say: 'morfi', text: 'Secret agent? Double agent? Triple agent?' },
    { say: 'beetle', text: 'I’m a beetle.' },
    { say: 'morfi', text: 'Very convincing.' },
    { say: 'morfi', text: 'Don’t worry. I’ll escort you home.', act: 'salute' },
    { puzzle: 45, scene: 'meadow', title: 'Escort the beetle home', hint: 'Clear the meadow so the beetle can get home!' },
    { bg: 'meadow', front: 'grass', show: { beetle: { x: -8 }, morfi: { x: -20, props: ['satchel'] }, puddy: { x: -34, props: ['spoon'] }, lilca: { x: -48, props: ['book'] } } },
    { walk: { beetle: 124, morfi: 112, puddy: 100, lilca: 88 }, t: 4800 },
    { bg: 'leafhouse', show: { morfi: { x: 16, props: ['satchel'] }, puddy: { x: 32, props: ['spoon'] }, lilca: { x: 47, props: ['book'] }, beetle: { x: 64 } } },
    { narr: 'The beetle’s house was on the other side of the meadow, underneath a curled leaf.' },
    { show: { beetle2: { x: 82, who: 'beetle' } }, enter: 'beetle2' },
    { say: 'mom', text: 'Oh! You found him!', who: 'beetle2' },
    { say: 'morfi', text: 'ISA rescue operation completed successfully.', act: 'salute' },
    { say: 'puddy', text: '(You mean you got lost following a flower.)' },
    { say: 'morfi', text: 'Puddy. That’s classified.' },
    { say: 'lilca', text: 'Classified as what?' },
    { say: 'morfi', text: 'Super Mega Snitch Secret.', act: 'point' },
    { bg: 'night', show: { morfi: { x: 32, props: [] } } },
    { narr: 'That evening, back at the mushroom village, Mörfi received the highest possible award for the mission…' },
    { award: true },
    { say: 'morfi', text: '…', act: 'gasp' },
    { narr: 'She placed it proudly on the shelf. She stared at it. She smiled. Then she ate it.' },
    { eat: true },
    { narr: 'Because Mörfi was many things. A super snitch. A future Snitch Commander. A tiny blue-ish-yellow legend. But above all… Mörfi really liked biscuits. 🍪' },
    { show: { morfi: { x: 150 }, puddy: { x: 22 }, lilca: { x: 78, props: ['book'] } } },
    { say: 'puddy', text: 'She’ll probably report me for eating the last one tomorrow.' },
    { say: 'lilca', text: 'Definitely.' },
    { say: 'morfi', text: 'I HEARD THAT.', offstage: true },
    { end: 1 },
  ];
  // ── Chapter 2: The Bike Tour with Kloenchen ──
  const RIDE = { bearRide: { x: -18 }, kloenRide: { x: -52 } };
  const CH2 = [
    { bg: 'field' },
    { narr: 'It was a bright autumn morning in Schönefeld. The sky was full of wispy clouds — the kind that look painted with a very tired brush.' },
    { show: { bear: { x: 30, props: ['bottle'] }, kloen: { x: 66 } }, enter: 'kloen' },
    { say: 'kloen', text: 'Ready for Etappe 2? Almost 40 kilometres, all the way to the Wannsee!', act: 'wave' },
    { say: 'bear', text: 'Ready. I brought water.' },
    { say: 'kloen', text: 'Just water?' },
    { say: 'bear', text: 'And sunglasses. An adventurer is always prepared.' },
    { say: 'kloen', text: 'Bear, it’s a bike tour. Not an adventure.' },
    { say: 'bear', text: 'Every bike tour is an adventure if you’re brave enough.' },
    { bg: 'map', wait: 3200 },
    { narr: 'Etappe 2: from Schönefeld, past Stahnsdorf, to the Wannsee. 39.5 kilometres. Flat as a pancake.' },
    { bg: 'field', show: { ...RIDE } },
    { walk: { bearRide: 28, kloenRide: 72 }, t: 2600 },
    { narr: 'They pedalled past fields and fences. Everything was peaceful. Suspiciously peaceful.' },
    { show: { bird: { x: -10, y: 46 } } },
    { walk: { bird: 55 }, t: 1500 },
    { show: { note: { x: 57, y: 42 } } },
    { walk: { bird: 120 }, t: 1300, move: { note: { y: 0 } } },
    { say: 'kloenRide', text: 'Bear! That bird just dropped something!' },
    { say: 'bearRide', text: 'A clue.', act: 'gasp' },
    { narr: 'It was a tiny rolled-up note, tied with a golden ribbon. On the outside, just one big question mark.' },
    { say: 'bearRide', text: 'A secret message. From a bird. This is the best day of my life.' },
    { say: 'kloenRide', text: 'What does it say?' },
    { say: 'bearRide', text: '“Follow the path to the big water. Trust the cat. Bring biscuits.”' },
    { say: 'kloenRide', text: 'Trust the cat? What cat?' },
    { puzzle: 23, scene: 'field', title: 'Pedal past the fields', hint: 'Clear the way so Bear and Kloenchen can ride on!' },
    { bg: 'field', show: { ...RIDE } },
    { walk: { bearRide: 118, kloenRide: 96 }, t: 4000 },
    { bg: 'path', show: { bearRide: { x: 20 }, kloenRide: { x: 54 }, cat2: { x: 85 } } },
    { narr: 'Further along the path, someone was waiting by the grass. Black and white. Very still. Very serious.' },
    { say: 'kloenRide', text: 'That cat.' },
    { say: 'bearRide', text: 'Good afternoon. Are you… the cat?' },
    { say: 'cat2', text: 'Mrrp.' },
    { say: 'bearRide', text: 'That’s exactly what the cat would say.' },
    { narr: 'The cat looked at the note. Then it turned around and trotted off along the path, towards the forest.' },
    { walk: { cat2: 118 }, t: 1600 },
    { say: 'kloenRide', text: 'I think we’re supposed to follow it.' },
    { puzzle: 27, scene: 'path', title: 'Follow the cat', hint: 'Make a way through the bushes — don’t lose the cat!' },
    { bg: 'path', front: 'grass', show: { cat2: { x: -6 }, ...RIDE } },
    { walk: { cat2: 124, bearRide: 108, kloenRide: 86 }, t: 4200 },
    { bg: 'forest', show: { bearRide: { x: 28 }, kloenRide: { x: 72 } } },
    { narr: 'The path wound into the forest near Stahnsdorf. Tall pines, soft needles, and the smell of adventure.' },
    { say: 'bearRide', text: 'Kloenchen, I have a question.' },
    { say: 'kloenRide', text: 'Yes?' },
    { say: 'bearRide', text: 'Are we lost?' },
    { say: 'kloenRide', text: 'We’re not lost. We’re exploring.' },
    { say: 'bearRide', text: 'Exploring. Excellent. Very brave of us.' },
    { puzzle: 43, scene: 'forest', title: 'Through the pine forest', hint: 'Untangle the forest path!' },
    { bg: 'forest', show: { ...RIDE } },
    { walk: { bearRide: 118, kloenRide: 96 }, t: 4000 },
    { bg: 'lake', show: { bear: { x: 26, props: ['bottle'] }, kloen: { x: 58 } } },
    { narr: 'And then — there it was. The big water. The Wannsee, full of little white sailboats.' },
    { say: 'kloen', text: 'The note said the big water. We’re here!', act: 'wave' },
    { say: 'bear', text: 'But where’s the secret?' },
    { show: { cat2: { x: 84 }, box: { x: 72 } }, enter: 'cat2' },
    { narr: 'The cat was already on the pier, sitting next to a little wooden box with a golden star.' },
    { puzzle: 46, scene: 'lake', title: 'Reach the secret box', hint: 'Clear the pier to reach the box!' },
    { bg: 'lake', show: { bear: { x: 26, props: ['bottle'] }, kloen: { x: 50 }, box: { x: 70 }, cat2: { x: 86 } } },
    { narr: 'Bear opened the box very slowly. Very, very slowly.' },
    { award: 'bells' },
    { narr: 'Inside: two shiny golden bike bells… and a packet of biscuits.' },
    { say: 'kloen', text: 'There’s a card! “For the best bike tour team. Thank you for the biscuits. — The Lake Cat.”' },
    { say: 'bear', text: 'The CAT planned all of this?!', act: 'gasp' },
    { say: 'cat2', text: 'Mrrp.' },
    { say: 'bear', text: 'I KNEW it was an adventure!', act: 'jump' },
    { say: 'kloen', text: 'Okay. Maybe it was a little bit of an adventure. ✌️', act: 'wave' },
    { say: 'bear', text: 'Selfie! Say “biscuits!”' },
    { flash: true, narr: 'Click. Sunglasses on, peace sign up, the lake behind them — while the cat quietly ate the first biscuit.' },
    { say: 'cat2', text: 'Mrrp. 🍪' },
    { narr: 'On the way home, two golden bells rang all the way from the Wannsee. Ring ring! 🔔' },
    { end: 2 },
  ];
  const CHAPTERS = [
    { id: 1, series: 'morfi', num: 'Chapter 1', title: 'Mörfi and the Very Important Mission', short: 'Mörfi · Chapter 1', steps: CH1, icon: '🍄' },
    { id: 2, series: 'bear', num: 'Story 1', title: 'The Bike Tour with Kloenchen', short: 'Bear & Kloenchen', steps: CH2, icon: '🚲' },
  ];

  // ── The stage ──
  let ch = null, at = 0, waiting = false, typing = null, chars = {};
  const stage = () => $('story-stage');
  const saved = () => (Extras.meta().story = Extras.meta().story || {});

  // Things in front of the characters: tall grass they wade through, the leaf they crawl under, a mushroom to hide behind.
  const FRONT = {
    grass: () => grass(700, '#2f8a3f', 46, 105) + grass(700, '#4fbf5a', 38, 78),
    leaf: () => `<path d="M-20,420 Q200,330 420,420 Q360,460 200,452 Q40,462 -20,420 Z" fill="#6fd06a" opacity="0.95"/><path d="M-20,420 Q200,380 420,420" stroke="#3f9a4a" stroke-width="5" fill="none"/>` + grass(700, '#4fbf5a', 30, 60),
    mushroom: () => mushroomHouse(200, 660, 2.4, '#e8433f') + grass(700, '#4fbf5a', 30, 50),
  };
  function front(name) { stage().querySelector('.st-front').innerHTML = name ? FRONT[name]() : ''; }
  function setBg(name) {
    const svg = stage().querySelector('.st-bg');
    // The map is shown whole (nothing cut off at the sides); scenery fills the screen.
    svg.setAttribute('preserveAspectRatio', name === 'map' ? 'xMidYMid meet' : 'xMidYMax slice');
    stage().style.background = name === 'map' ? '#f2efe4' : '';
    svg.innerHTML = BG[name]();
    stage().dataset.bg = name;
  }
  function charEl(key, o) {
    const who = o.who || key;
    let e = chars[key];
    if (!e) {
      e = document.createElement('div');
      e.className = 'st-char';
      e.innerHTML = `<div class="st-body"><svg viewBox="-10 -10 140 185" class="st-svg"></svg></div>`;
      e.style.setProperty('--s', SIZE[who] || 1);
      stage().querySelector('.st-chars').appendChild(e);
      chars[key] = e;
      e._who = who; e._props = [];
    }
    if (o.props) e._props = o.props;
    e.querySelector('svg').innerHTML = ART[who](e._props);
    if (o.x != null) e.style.left = o.x + '%';
    if (o.y != null) e.style.bottom = o.y + 'vh';
    return e;
  }
  function clearChars() { stage().querySelector('.st-chars').innerHTML = ''; chars = {}; }
  function act(key, a) {
    const e = chars[key];
    if (!e) return;
    const b = e.querySelector('.st-body');
    b.classList.remove('a-' + a); void b.offsetWidth; b.classList.add('a-' + a);
    setTimeout(() => b.classList.remove('a-' + a), a === 'scream' ? 1400 : 900);
  }
  function bubble(key, text, name) {
    const box = $('st-say');
    box.hidden = false;
    box.className = 'st-say' + (key ? ' talk' : ' narr');
    $('st-who').textContent = key ? name : '';
    $('st-who').hidden = !key;
    const e = key && chars[key];
    // Point the bubble's tail at whoever is talking.
    box.style.setProperty('--tail', e ? e.style.left : '50%');
    Object.values(chars).forEach(c => c.classList.toggle('speaking', c === e));
    // Typewriter; a tap shows it all at once.
    clearInterval(typing);
    const t = $('st-text'); t.textContent = '';
    let i = 0;
    typing = setInterval(() => { t.textContent = text.slice(0, ++i); if (i % 3 === 0 && key) Sound.tick(); if (i >= text.length) { clearInterval(typing); typing = null; } }, 22);
    t.dataset.full = text;
    $('st-tap').hidden = false;
    waiting = true;
  }

  async function run() {
    while (ch && at < ch.steps.length) {
      const s = ch.steps[at];
      if (s.bg) { clearChars(); setBg(s.bg); front(s.front); stage().classList.toggle('low', !!s.low); $('st-say').hidden = true; }
      if (s.show) for (const [k, o] of Object.entries(s.show)) { charEl(k, o); if (o.x > 100) chars[k].remove(), delete chars[k]; }
      if (s.props) for (const [k, p] of Object.entries(s.props)) if (chars[k]) charEl(k, { props: p });
      if (s.enter && chars[s.enter]) { chars[s.enter].classList.add('pop-in'); }
      if (s.act && typeof s.act === 'object') Object.entries(s.act).forEach(([k, a]) => act(k, a));
      if (s.flash) { stage().classList.remove('flash'); void stage().offsetWidth; stage().classList.add('flash'); Sound.tick(); }
      if (s.shake) { stage().classList.remove('shake'); void stage().offsetWidth; stage().classList.add('shake'); Native.buzz(); }
      if (s.walk) {
        // Let the scene be drawn in its starting spot first (it may have only just been shown, e.g.
        // right after a puzzle); otherwise everyone would jump straight to the end of the walk.
        Object.keys(s.walk).concat(Object.keys(s.move || {})).forEach(k => { if (chars[k]) { chars[k].style.transition = 'none'; void chars[k].offsetWidth; } });
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        for (const [k, x] of Object.entries(s.walk)) { const e = chars[k]; if (!e) continue; e.classList.add('walking'); e.style.transition = `left ${s.t || 1200}ms linear`; e.style.left = x + '%'; }
        // Something falling or floating at the same time (y in vh above the ground).
        for (const [k, o] of Object.entries(s.move || {})) { const e = chars[k]; if (!e) continue; e.style.transition = `bottom ${s.t || 1200}ms cubic-bezier(.5,0,.8,.4), transform ${s.t || 1200}ms`; e.style.bottom = o.y + 'vh'; e.style.transform = 'translateX(-50%) rotate(200deg)'; }
        await new Promise(r => setTimeout(r, s.t || 1200));
        Object.values(chars).forEach(e => { e.classList.remove('walking'); e.style.transition = ''; });
      }
      if (s.wait) await new Promise(r => setTimeout(r, s.wait));
      if (s.award) { await award(s.award); }
      if (s.eat) { await eat(); }
      if (s.puzzle != null) { saved()['ch' + ch.id] = at; persistStory(); return puzzle(s); }
      if (s.end) { saved()['ch' + ch.id] = 'done'; persistStory(); Extras.event('story' + s.end); return finish(); }
      if (s.say) {
        if (s.act) act(s.who || s.say, s.act);
        if (s.props && chars[s.say]) charEl(s.say, { props: s.props });
        bubble(s.offstage ? null : (s.who || s.say), s.text, NAMES[s.say]);
        if (s.offstage) { $('st-who').hidden = false; $('st-who').textContent = NAMES[s.say] + ' (from inside)'; $('st-say').className = 'st-say talk offstage'; }
        at++;
        return;
      }
      if (s.narr) { bubble(null, s.narr); at++; return; }
      at++;
    }
  }
  function tap() {
    if (typing) { clearInterval(typing); typing = null; $('st-text').textContent = $('st-text').dataset.full; return; }
    if (!waiting) return;
    waiting = false;
    $('st-tap').hidden = true;
    run();
  }

  // The golden biscuit: floats down, shines, sits on the shelf.
  function award(kind) {
    return new Promise(done => {
      const e = document.createElement('div');
      e.className = 'st-award';
      e.innerHTML = kind === 'bells' ? `<svg viewBox="0 0 120 100">${[30, 84].map(x => `<g transform="translate(${x} 50)"><circle r="24" fill="url(#gb)" stroke="#b37a00" stroke-width="3"/><ellipse cx="-7" cy="-8" rx="8" ry="5" fill="#fff" opacity="0.6"/><rect x="-5" y="-32" width="10" height="10" rx="3" fill="#b37a00"/><circle cx="0" cy="6" r="4" fill="#b37a00"/></g>`).join('')}<defs><radialGradient id="gb" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#fff6c0"/><stop offset="0.5" stop-color="#ffd54a"/><stop offset="1" stop-color="#d49a10"/></radialGradient></defs></svg><b>Two golden bike bells!</b>` : `<svg viewBox="0 0 100 100"><defs><radialGradient id="gb" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#fff6c0"/><stop offset="0.5" stop-color="#ffd54a"/><stop offset="1" stop-color="#d49a10"/></radialGradient></defs>
        <circle cx="50" cy="50" r="40" fill="url(#gb)" stroke="#b37a00" stroke-width="4"/>${[[36, 40], [60, 34], [56, 60], [38, 62], [66, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#b37a00" opacity="0.6"/>`).join('')}</svg><b>Golden Biscuit</b>`;
      stage().appendChild(e);
      Sound.win(); Art.confetti();
      e._keep = true;
      if (kind === 'bells') { e.classList.add('big'); setTimeout(() => { e.classList.add('eaten'); setTimeout(() => e.remove(), 900); }, 3200); }
      setTimeout(done, 1600);
    });
  }
  function eat() {
    return new Promise(done => {
      const e = stage().querySelector('.st-award');
      act('morfi', 'jump');
      if (e) { e.classList.add('eaten'); setTimeout(() => e.remove(), 900); }
      Sound.munch && Sound.munch();
      setTimeout(done, 1000);
    });
  }

  // A puzzle in the middle of the story: the normal board, then back to the story.
  function puzzle(s) {
    begin(CHALLENGE_LEVELS[s.puzzle], `📖 ${s.title}`, s.hint);
    chPlay = {
      story: true,
      again: () => puzzle(s),
      back: () => { chPlay = null; $('win').hidden = true; storyHome(); },
      next: () => { chPlay = null; $('win').hidden = true; at++; openStage(); run(); },
      won: () => {
        $('win-text').textContent = 'Mission step complete! 🕵️';
        $('win-best').innerHTML = '';
        $('next').hidden = false; $('to-ch').hidden = false;
        $('next').className = 'big'; $('replay').className = 'ghost'; $('replay').textContent = 'Play again';
        $('next').style.order = $('to-ch').style.order = '';
      },
    };
    $('clock').hidden = true;
    if (s.scene) {
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      bg.setAttribute('class', 'scene-bg'); bg.setAttribute('viewBox', '0 0 400 700'); bg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
      bg.innerHTML = BG[s.scene]();
      $('game').prepend(bg);
      $('game').classList.add('scened', 'scene-' + s.scene);
    }
    $('next').textContent = 'Continue the story ▶';
    $('to-ch').textContent = 'Home';
  }

  function finish() {
    bubble(null, ch.id === 1 ? 'The end of chapter 1 — Mörfi will be back with another Very Important Mission soon. 🍄' : 'The end — Bear and Kloenchen will be back with another bike tour soon. 🚲🔔');
    waiting = false;
    $('st-tap').hidden = true;
    $('st-end').hidden = false;
  }
  function persistStory() { Extras.save && Extras.save(); }

  function openStage() {
    show('story');
    $('st-end').hidden = true;
  }
  function start(fromStart, id = 1) {
    ch = CHAPTERS.find(c => c.id === id) || CHAPTERS[0];
    document.querySelector('.st-title').textContent = '📖 ' + ch.short;
    const s = saved()['ch' + ch.id];
    at = !fromStart && typeof s === 'number' ? s : 0;
    openStage();
    // Resuming at a puzzle: rebuild that scene first (the nearest background before it).
    if (at > 0) {
      let b = at; while (b > 0 && !ch.steps[b].bg) b--;
      const back = at; at = b;
      const s0 = ch.steps[b]; clearChars(); setBg(s0.bg); front(s0.front); if (s0.show) for (const [k, o] of Object.entries(s0.show)) charEl(k, o);
      at = back;
    }
    run();
  }
  // ── The Story home: a cosy scene with the crew hanging out, and a card per chapter ──
  const SOON = [{ id: 2, title: 'The Case of the Missing Spoon', icon: '🥄' }, { id: 3, title: 'Snitch Commander', icon: '🎖️' }];
  function storyHome() {
    show('storyhome');
    const bg = document.querySelector('.sh-bg');
    if (!bg.dataset.done) { bg.innerHTML = BG.village(); bg.dataset.done = 1; }
    const box = document.querySelector('.sh-chars');
    if (!box.dataset.done) {
      box.dataset.done = 1;
      for (const [k, x, props] of [['puddy', 22, ['biscuit']], ['morfi', 50, ['tea']], ['lilca', 78, ['book']]]) {
        const e = document.createElement('div');
        e.className = 'st-char';
        e.style.left = x + '%'; e.style.setProperty('--s', SIZE[k]);
        e.innerHTML = `<div class="st-body"><svg viewBox="-10 -10 140 185" class="st-svg">${ART[k](props)}</svg></div>`;
        e.onclick = () => { const b = e.querySelector('.st-body'); b.classList.remove('a-jump'); void b.offsetWidth; b.classList.add('a-jump'); Sound.tick(); };
        box.appendChild(e);
      }
    }
    const card = c => {
      const st = saved()['ch' + c.id], going = typeof st === 'number' && st > 0;
      const status = st === 'done' ? '<span class="tag done">✅ Completed</span>' : going ? '<span class="tag go">In progress</span>' : `<span class="tag new">${c.id > 1 ? 'New story' : 'New!'}</span>`;
      return `<div class="sh-card"><div class="num">${c.icon}</div><div class="txt"><small>${c.num} ${status}</small><b>${c.title}</b>
          ${going ? `<a class="sh-restart" data-id="${c.id}">↻ From the start</a>` : ''}</div>
          <button class="big sh-play" data-id="${c.id}" data-done="${st === 'done' ? 1 : ''}">${st === 'done' ? '↻ Replay' : going ? '▶ Continue' : '▶ Play'}</button></div>`;
    };
    // One section per series: Mörfi's ISA missions (with the ISA badge), and Bear & Kloenchen's tours.
    $('sh-cards').innerHTML = `<div class="sh-series"><div class="sh-isa">${isaLogo('home')}</div><div><b>Mörfi &amp; the ISA</b><small>Top secret missions of a Super Mega Snitch</small></div></div>`
      + CHAPTERS.filter(c => c.series === 'morfi').map(card).join('')
      + `<div class="sh-series"><div class="sh-emoji">🐻🚲</div><div><b>Bear &amp; Kloenchen</b><small>Bike tours and little adventures</small></div></div>`
      + CHAPTERS.filter(c => c.series === 'bear').map(card).join('');
    document.querySelectorAll('.sh-play').forEach(b => b.onclick = () => { Sound.unlock(); start(!!b.dataset.done, +b.dataset.id); });
    document.querySelectorAll('.sh-restart').forEach(b => b.onclick = () => start(true, +b.dataset.id));
  }
  function menu() { storyHome(); }

  $('st-stage-tap').addEventListener('click', tap);
  $('st-skip').addEventListener('click', () => {
    // Skip to the next puzzle (or the end).
    clearInterval(typing); typing = null; waiting = false;
    while (at < ch.steps.length && ch.steps[at].puzzle == null && !ch.steps[at].end) {
      const s = ch.steps[at];
      if (s.bg) { clearChars(); setBg(s.bg); }
      if (s.show) for (const [k, o] of Object.entries(s.show)) { charEl(k, o); if (o.x > 100) chars[k].remove(), delete chars[k]; }
      at++;
    }
    run();
  });
  $('st-back').addEventListener('click', () => { clearInterval(typing); storyHome(); });
  $('st-end-home').addEventListener('click', () => storyHome());
  $('tab-story').addEventListener('click', () => { Sound.unlock(); storyHome(); });
  $('tab-puzzles').addEventListener('click', () => home());

  return { start, menu, home: storyHome };
})();
