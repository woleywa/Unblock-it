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
  const NAMES = { morfi: 'Mörfi', puddy: 'Puddy', lilca: 'Lilca', beetle: 'Beetle', flower: 'Flower', mom: 'Beetle family' };
  const SIZE = { morfi: 1, puddy: 0.9, lilca: 0.9, beetle: 0.72, flower: 1.15 };

  // ── Scenery (400×700, anchored at the bottom) ──
  const mushroomHouse = (x, y, s, cap = '#e8433f') => `<g transform="translate(${x} ${y}) scale(${s})">
      <path d="M-22,0 Q-24,-46 -16,-60 L16,-60 Q24,-46 22,0 Z" fill="#fff4dc"/><path d="M-9,0 V-22 Q0,-30 9,-22 V0 Z" fill="#8a5a2e"/>
      <circle cx="-10" cy="-40" r="5" fill="#ffe27a" class="window"/>
      <path d="M-48,-56 Q-40,-104 0,-106 Q40,-104 48,-56 Q24,-66 0,-64 Q-24,-66 -48,-56 Z" fill="${cap}"/>
      <circle cx="-22" cy="-82" r="6" fill="#fff"/><circle cx="8" cy="-94" r="5" fill="#fff"/><circle cx="26" cy="-72" r="7" fill="#fff"/><circle cx="-2" cy="-74" r="4" fill="#fff"/></g>`;
  const grass = (y, color, n = 40, h = 26) => { let s = ''; for (let i = 0; i < n; i++) { const x = (i / n) * 420 - 10 + (i % 3) * 3, hh = h * (0.6 + ((i * 37) % 10) / 20); s += `<path d="M${x},${y} q2,${-hh * 0.6} ${(i % 2 ? 4 : -3)},${-hh}" stroke="${color}" stroke-width="3" fill="none" stroke-linecap="round" class="blade" style="--i:${i % 7}"/>`; } return s; };
  const BG = {
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
  const CHAPTERS = [{ id: 1, title: 'Mörfi and the Very Important Mission', steps: CH1 }];

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
      if (s.shake) { stage().classList.remove('shake'); void stage().offsetWidth; stage().classList.add('shake'); Native.buzz(); }
      if (s.walk) {
        for (const [k, x] of Object.entries(s.walk)) { const e = chars[k]; if (!e) continue; e.classList.add('walking'); e.style.transition = `left ${s.t || 1200}ms linear`; e.style.left = x + '%'; }
        await new Promise(r => setTimeout(r, s.t || 1200));
        Object.values(chars).forEach(e => { e.classList.remove('walking'); e.style.transition = ''; });
      }
      if (s.wait) await new Promise(r => setTimeout(r, s.wait));
      if (s.award) { await award(); }
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
  function award() {
    return new Promise(done => {
      const e = document.createElement('div');
      e.className = 'st-award';
      e.innerHTML = `<svg viewBox="0 0 100 100"><defs><radialGradient id="gb" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#fff6c0"/><stop offset="0.5" stop-color="#ffd54a"/><stop offset="1" stop-color="#d49a10"/></radialGradient></defs>
        <circle cx="50" cy="50" r="40" fill="url(#gb)" stroke="#b37a00" stroke-width="4"/>${[[36, 40], [60, 34], [56, 60], [38, 62], [66, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="#b37a00" opacity="0.6"/>`).join('')}</svg><b>Golden Biscuit</b>`;
      stage().appendChild(e);
      Sound.win(); Art.confetti();
      e._keep = true;
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
    bubble(null, 'The end of chapter 1 — Mörfi will be back with another Very Important Mission soon. 🍄');
    waiting = false;
    $('st-tap').hidden = true;
    $('st-end').hidden = false;
  }
  function persistStory() { Extras.save && Extras.save(); }

  function openStage() {
    show('story');
    $('st-end').hidden = true;
  }
  function start(fromStart) {
    ch = CHAPTERS[0];
    const s = saved()['ch1'];
    at = !fromStart && typeof s === 'number' ? s : 0;
    openStage();
    // Resuming at a puzzle: rebuild that scene first (the nearest background before it).
    if (at > 0) {
      let b = at; while (b > 0 && !ch.steps[b].bg) b--;
      const back = at; at = b;
      const s0 = ch.steps[b]; clearChars(); setBg(s0.bg); if (s0.show) for (const [k, o] of Object.entries(s0.show)) charEl(k, o);
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
    const st = saved()['ch1'];
    const status = st === 'done' ? '<span class="tag done">✅ Completed</span>' : typeof st === 'number' && st > 0 ? '<span class="tag go">In progress</span>' : '<span class="tag new">New!</span>';
    $('sh-cards').innerHTML = `<div class="sh-card">
        <div class="num">1</div><div class="txt"><small>Chapter 1</small><b>${CHAPTERS[0].title}</b>${status}</div>
        <div class="btns"><button class="big" id="sh-play">${st === 'done' ? '↻ Replay' : typeof st === 'number' && st > 0 ? '▶ Continue' : '▶ Play'}</button>
        ${typeof st === 'number' && st > 0 ? '<button class="ghost small" id="sh-restart">↻ From the start</button>' : ''}</div></div>`
      + `<div class="sh-soon">🔒 Coming soon: ${SOON.map(c => `${c.icon} <b>${c.title}</b>`).join(' · ')}</div>`;
    $('sh-play').onclick = () => { Sound.unlock(); start(st === 'done'); };
    if ($('sh-restart')) $('sh-restart').onclick = () => start(true);
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
