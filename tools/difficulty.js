// How hard is a level? Measured, not guessed, so new levels can be rated the same way as old ones.
//   extra  = moves the solver needs that only make room (not a block leaving) — the generator's own difficulty knob
//   score  = extra + 1.2 × mechanics on the board (ice, fire, walls, chains, …) + 0.08 × par + 0.1 × blocks
//   diff   = tier 1–5 from fixed thresholds on the score (so a tier keeps its meaning as levels are added)
// Stored on each level as `diff` and `dscore`. tools/generate.js rates every new level; `node tools/rate.js`
// (re)rates every pool and rewrites DIFFICULTY.md.
const THRESHOLDS = [7, 12, 18, 26];
const NAMES = ['Easy', 'Medium', 'Hard', 'Expert', 'Master'];

function mechanics(l) {
  const s = new Set();
  for (const p of l.pieces) {
    if (p.ice) s.add('ice'); if (p.fire) s.add('fire'); if (p.color === 'forest' || p.color === 'beaver') s.add('beaver');
    if (p.key || p.lock) s.add('prison'); if (p.axis) s.add('arrows'); if (p.tether) s.add('chains'); if (p.inner) s.add('layers');
  }
  if ((l.walls || []).length) s.add('walls');
  if ((l.tracks || []).length) s.add('lanes');
  if ((l.gates || []).some(g => g.frozen)) s.add('frozen doors');
  return [...s];
}
function rate(level, extra) {
  const score = extra + 1.2 * mechanics(level).length + 0.08 * level.par + 0.1 * level.pieces.length;
  return { diff: 1 + THRESHOLDS.filter(t => score >= t).length, dscore: Math.round(score * 10) / 10 };
}
// Solves the level and rates it (null if the solver can't).
function measure(level, Engine, ms = 4000) {
  const r = Engine.solve(JSON.parse(JSON.stringify(level)), ms);
  if (!r.ok) return null;
  const extra = r.steps.filter(x => x.kind !== 'exit').length;
  return { extra, ...rate(level, extra) };
}
module.exports = { THRESHOLDS, NAMES, mechanics, rate, measure };
