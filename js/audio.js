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
  return {
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('unblock_sound', on ? 'on' : 'off'); } catch (e) {} return on; },
    unlock: ac,
    tick: () => tone(520, 0.05, { type: 'triangle', vol: 0.06 }),
    bump: () => tone(140, 0.12, { type: 'square', vol: 0.05, slide: 0.7 }),
    exit: () => { tone(660, 0.12, { type: 'triangle', vol: 0.12 }); tone(990, 0.16, { type: 'triangle', vol: 0.1, delay: 0.07 }); },
    thaw: () => tone(1300, 0.18, { type: 'sine', vol: 0.06, slide: 1.4 }),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.13, delay: i * 0.11 })),
  };
})();
