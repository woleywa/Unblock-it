# Unblock It — notes for Claude

Vanilla JS, no build. Deployed by GitHub Pages from `main` (root). Bump `?v=N` on the script/style tags
in `index.html` AND the `CACHE` name + file list in `sw.js` on every change, or phones keep the old
version.

## Rules (engine.js)
- A block leaves through a door of its colour on the edge it touches, if its span fits in the door and
  nothing is between it and the door. Blocks slide anywhere through empty cells.
- Ice (`ice: n`) on a block: can't move; counts down once per block that leaves.
- Frozen doors (`frozen: n`): closed; count down once per block that leaves.
- Layered blocks (`inner`): the outer colour leaves; the core stays **next to the door** (applyExit with
  the gate slides it there first — matches dragging in the game).
- The engine also supports keys/locks, tracks, arrows, stars, inner-wall doors (from the Block Out
  solver it started from); levels don't use them yet.

## Game (game.js)
- Drag: the block slides cell by cell toward the finger (greedy, larger axis first), stopping at
  obstacles. Pushed past the board edge with a clear lane to a door of its colour → it leaves. Dropped
  touching such a door → it leaves. Each drag that moved = 1 move.
- Only a block's tiles take pointer events (the block div covers its bounding box).
- Stars: ≤ par ★★★, ≤ ceil(par × 1.4) ★★, else ★. Progress in localStorage `unblock_progress_v1`.

## Levels
- `node tools/generate.js 2026` (~45 s). Candidate boards are kept when the solver clears them with a
  number of non-exit moves inside the stage's `extra` range; par = solver move count.
- Test: a Playwright script that plays each level by mouse drags along the solver's paths — all 30
  levels won at par (see session notes).
