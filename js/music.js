// Background music, synthesized like the sound effects (no audio files): original chiptune loops in the
// style of old arcade machines — square-wave lead, triangle bass, a soft arpeggio and noise drums.
// "menu" plays on the menu screens, "puzzle" (calmer) on the board and in stories. Settings → Music.
const Music = (() => {
  let on = true;
  try { on = localStorage.getItem('unblock_music') !== 'off'; } catch (e) {}

  // ── Songs: one token per eighth note. "C5" a note, "-" holds the one before, "." rest. ──
  const SONGS = {
    menu: {
      bpm: 128, vol: 0.6,
      lead: `E5 . G5 . C6 - G5 E5 | A5 - G5 E5 C5 . E5 . | F5 . A5 . C6 - A5 F5 | G5 - - . D5 E5 F5 G5 |
             E5 G5 C6 G5 E5 G5 C6 E6 | D6 - C6 A5 E5 . A5 . | F5 A5 C6 A5 G5 B5 D6 B5 | C6 - - . G5 . C5 .`,
      bass: `C3 . C4 . C3 . C4 . | A2 . A3 . A2 . A3 . | F2 . F3 . F2 . F3 . | G2 . G3 . G2 . G3 . |
             C3 . C4 . C3 . C4 . | A2 . A3 . A2 . A3 . | F2 . F3 . G2 . G3 . | C3 . G2 . C3 . . .`,
      arp: `C4 E4 G4 E4 C4 E4 G4 E4 | A3 C4 E4 C4 A3 C4 E4 C4 | F3 A3 C4 A3 F3 A3 C4 A3 | G3 B3 D4 B3 G3 B3 D4 B3 |
            C4 E4 G4 E4 C4 E4 G4 E4 | A3 C4 E4 C4 A3 C4 E4 C4 | F3 A3 C4 A3 G3 B3 D4 B3 | C4 E4 G4 C5 G4 E4 C4 .`,
      drums: 'k h s h k k s h', // per bar: k kick, s snare, h hi-hat
    },
    // Halloween (Events tab, Halloween levels and story): A minor, a creepy chromatic turn, still cute.
    spooky: {
      bpm: 112, vol: 0.5,
      lead: `A4 . C5 . E5 - D#5 E5 | F5 - E5 . D5 . C5 . | D5 . F5 . A5 - G#5 A5 | E5 - - . B4 C5 D5 E5 |
             A5 . E5 . C5 . A4 . | F5 - E5 D5 C5 - B4 . | D5 F5 A5 F5 E5 G#5 B5 G#5 | A5 - - . E5 . A4 .`,
      bass: `A2 . A3 . A2 . A3 . | F2 . F3 . F2 . F3 . | D2 . D3 . D2 . D3 . | E2 . E3 . E2 . E3 . |
             A2 . A3 . A2 . A3 . | F2 . F3 . F2 . F3 . | D2 . D3 . E2 . E3 . | A2 . E2 . A2 . . .`,
      arp: `A3 C4 E4 C4 A3 C4 E4 C4 | F3 A3 C4 A3 F3 A3 C4 A3 | D3 F3 A3 F3 D3 F3 A3 F3 | E3 G#3 B3 G#3 E3 G#3 B3 G#3 |
            A3 C4 E4 C4 A3 C4 E4 C4 | F3 A3 C4 A3 F3 A3 C4 A3 | D3 F3 A3 F3 E3 G#3 B3 G#3 | A3 C4 E4 A4 E4 C4 A3 .`,
      drums: 'k h s h k h s h',
    },
    puzzle: {
      bpm: 92, vol: 0.4,
      lead: `D5 - - F5 A5 - G5 F5 | F5 - - D5 Bb4 - C5 D5 | C5 - - A4 F5 - E5 C5 | E5 - - - G5 - - . |
             D5 - F5 - A5 - D6 - | C6 - Bb5 - A5 - F5 - | G5 - - E5 C5 - D5 E5 | E5 - - - . - - .`,
      bass: `D3 - - - A2 - - - | Bb2 - - - F2 - - - | F2 - - - C3 - - - | C3 - - - G2 - - - |
             D3 - - - A2 - - - | Bb2 - - - F2 - - - | C3 - - - G2 - - - | C3 - - - . - - .`,
      arp: `. D4 F4 A4 . D4 F4 A4 | . D4 F4 Bb4 . D4 F4 Bb4 | . C4 F4 A4 . C4 F4 A4 | . C4 E4 G4 . C4 E4 G4 |
            . D4 F4 A4 . D4 F4 A4 | . D4 F4 Bb4 . D4 F4 Bb4 | . C4 E4 G4 . C4 E4 G4 | . C4 E4 G4 . . . .`,
      drums: 'k . h . k . h .',
    },
  };
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const freq = n => { const m = /^([A-G])(#|b)?(\d)$/.exec(n); const k = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (+m[3] + 1) * 12; return 440 * 2 ** ((k - 69) / 12); };
  // "C5 - . E5" → [{ f, len }, null, null, { f, len }]: a note at the step it starts, with its length in steps.
  function track(s) {
    const tok = s.replace(/\|/g, ' ').trim().split(/\s+/), out = tok.map(() => null);
    let last = -1;
    tok.forEach((t, i) => {
      if (t === '-') { if (last >= 0) out[last].len++; return; }
      last = -1;
      if (t !== '.') { out[i] = { f: freq(t), len: 1 }; last = i; }
    });
    return out;
  }
  for (const s of Object.values(SONGS)) { s.L = track(s.lead); s.B = track(s.bass); s.A = track(s.arp); s.D = s.drums.split(' '); s.steps = s.L.length; }

  // ── Instruments (scheduled at time t into `out`) ──
  let noiseBuf = null;
  const noise = a => {
    if (noiseBuf && noiseBuf.sampleRate === a.sampleRate) return noiseBuf;
    noiseBuf = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return noiseBuf;
  };
  function voice(a, out, f, t, dur, type, vol, sustain = 0.6) {
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(vol * sustain, t + 0.08);
    g.gain.setValueAtTime(vol * sustain, t + Math.max(0.09, dur - 0.05));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  function drum(a, out, kind, t) {
    if (kind === 'k') {
      const o = a.createOscillator(), g = a.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.16);
      return;
    }
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = noise(a);
    const hat = kind === 'h', dur = hat ? 0.035 : 0.11;
    f.type = hat ? 'highpass' : 'bandpass'; f.frequency.value = hat ? 7000 : 1800;
    g.gain.setValueAtTime(hat ? 0.022 : 0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.01);
  }
  function scheduleStep(a, out, s, i, t) {
    const st = 60 / s.bpm / 2, n = s.L[i], b = s.B[i], r = s.A[i], d = s.D[i % s.D.length];
    if (n) voice(a, out, n.f, t, n.len * st * 0.95, 'square', 0.05);
    if (b) voice(a, out, b.f, t, b.len * st * 0.9, 'triangle', 0.13, 0.8);
    if (r) voice(a, out, r.f, t, st * 0.7, 'square', 0.016, 0.5);
    if (d && d !== '.') drum(a, out, d, t);
  }
  // A soft low-pass over everything, so the square waves sound round rather than harsh.
  function bus(a) {
    const g = a.createGain(), f = a.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 3200; f.Q.value = 0.4;
    g.connect(f).connect(a.destination);
    return g;
  }

  // ── Player: a small look-ahead scheduler, so the beat stays steady even when the page is busy ──
  let a = null, cur = null, want = null, timer = null;
  function stop(fade = 0.4) {
    clearInterval(timer); timer = null;
    if (cur && a) { const g = cur.out.gain; g.cancelScheduledValues(a.currentTime); g.setValueAtTime(g.value, a.currentTime); g.linearRampToValueAtTime(0.0001, a.currentTime + fade); const o = cur.out; setTimeout(() => o.disconnect(), fade * 1000 + 100); }
    cur = null;
  }
  function start(name) {
    a = Sound.unlock(); if (!a) return;
    stop();
    const s = SONGS[name], out = bus(a);
    out.gain.setValueAtTime(0.0001, a.currentTime); out.gain.linearRampToValueAtTime(s.vol, a.currentTime + 0.6);
    cur = { name, s, out, i: 0, t: a.currentTime + 0.1 };
    const tick = () => {
      if (!cur) return;
      const st = 60 / cur.s.bpm / 2;
      while (cur.t < a.currentTime + 0.25) { scheduleStep(a, cur.out, cur.s, cur.i, cur.t); cur.i = (cur.i + 1) % cur.s.steps; cur.t += st; }
    };
    tick(); timer = setInterval(tick, 60);
  }
  function play(name) {
    want = name;
    if (!on || document.hidden || !name) { stop(); return; }
    if (!cur || cur.name !== name) start(name);
  }
  // Which tune goes with which screen.
  // Which tune goes with which screen. The Events tab sets a theme that carries into its levels and story.
  let th = null;
  const screen = id => {
    if (id === 'events') th = 'spooky';
    else if (id !== 'game' && id !== 'story') th = null;
    play(id === 'events' ? 'spooky' : id === 'game' || id === 'story' ? th || 'puzzle' : 'menu');
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop(0.1) : play(want)));
  // Browsers only start sound after a tap: the first one (anywhere) starts the music.
  addEventListener('pointerdown', () => { if (on && want && (!cur || (a && a.state !== 'running'))) { Sound.unlock(); if (!cur) play(want); } }, { capture: true, passive: true });

  return {
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('unblock_music', on ? 'on' : 'off'); } catch (e) {} play(want); return on; },
    play, screen, stop,
    theme(name) { th = name; },
    // For tests: render `secs` of a song into an OfflineAudioContext.
    render(ac, name, secs) { const s = SONGS[name], out = bus(ac); out.gain.value = s.vol; const st = 60 / s.bpm / 2; for (let i = 0, t = 0; t < secs; i++, t += st) scheduleStep(ac, out, s, i % s.steps, t); },
  };
})();
