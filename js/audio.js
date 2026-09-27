// Tiny synthesized sounds (no audio files): slide, blocked, exit, win.
const Sound = (() => {
  let ctx = null, on = true;
  try { on = localStorage.getItem('unblock_sound') !== 'off'; } catch (e) {}
  const ac = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  };
  function tone(freq, dur, { type = 'sine', vol = 0.15, delay = 0, slide = 0 } = {}) {
    if (!on) return;
    const a = ac(); if (!a) return;
    const t = a.currentTime + delay;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination);
    o.start(t); o.stop(t + dur + 0.02);
  }
  // A burst of filtered noise: water hissing on a fire.
  function hiss(dur, { vol = 0.12, delay = 0, freq = 3000 } = {}) {
    if (!on) return;
    const a = ac(); if (!a) return;
    const t = a.currentTime + delay;
    const buf = a.createBuffer(1, Math.ceil(a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf; f.type = 'highpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(a.destination);
    src.start(t);
  }
  return {
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('unblock_sound', on ? 'on' : 'off'); } catch (e) {} return on; },
    unlock: ac,
    tick: () => tone(520, 0.05, { type: 'triangle', vol: 0.06 }),
    bump: () => tone(140, 0.12, { type: 'square', vol: 0.05, slide: 0.7 }),
    exit: () => { tone(660, 0.12, { type: 'triangle', vol: 0.12 }); tone(990, 0.16, { type: 'triangle', vol: 0.1, delay: 0.07 }); },
    splash: () => { tone(420, 0.1, { type: 'sine', vol: 0.08, slide: 1.8 }); tone(640, 0.1, { type: 'sine', vol: 0.06, delay: 0.06, slide: 1.6 }); },
    sizzle: (out) => { hiss(out ? 0.7 : 0.35, { vol: out ? 0.14 : 0.09 }); if (out) tone(220, 0.35, { type: 'sine', vol: 0.05, delay: 0.1, slide: 0.5 }); },
    thaw: () => tone(1300, 0.18, { type: 'sine', vol: 0.06, slide: 1.4 }),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.13, delay: i * 0.11 })),
  };
})();
