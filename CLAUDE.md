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

## Look (art.js + style.css)
- Blocks are one SVG each (`Art.blockSVG`): the polyomino's true outline (edge tracing, inset, rounded
  outer corners, softer inner corners), a darker copy below for thickness, a drop shadow, a vertical
  gradient face, gloss and per-cell shines, a blinking face (an "o" mouth while dragged), a jewel core
  for layered blocks, frosted ice with cracks and a count. Only the `.hit` face path takes touches.
- Doors glow in their colour with marching chevrons; frozen doors are frosted with ❄ and a count.
- Exits burst sparks; drops settle with a squash; wins pop stars in one by one plus confetti.
- Font: Fredoka (Google Fonts), falls back to system rounded.

## Levels
- `node tools/generate.js 2026` (~45 s). Candidate boards are kept when the solver clears them with a
  number of non-exit moves inside the stage's `extra` range; par = solver move count.
- Test: a Playwright script that plays each level by mouse drags along the solver's paths — all 30
  levels won at par (see session notes).

## Online (js/online.js + firestore.rules)
- Firebase project `unblock-it-913f7` (Spark, free). Anonymous auth gives each device an account; a
  nickname claims `names/{lowercase}`. Collections and rules: see the header of online.js and
  `firestore.rules` (pasted into the console by hand — keep the file and console in sync).
- Leaderboard sorts on `score = stars × 100000 − moves` (one field, no composite index needed).
- online.js is an ES module loaded from gstatic using **Firestore Lite** (plain requests, no live
  stream — the full SDK hung reading on iPhone while writes worked). Every call has a timeout.
  game.js works without it (`window.Online` absent).
- The service worker never caches Firestore/auth traffic (only own files, fonts, the SDK).
- Local test: serve the SDK from `npm pack firebase@10.14.1` by routing gstatic URLs in Playwright,
  and launch Chromium with the sandbox proxy + ignoreHTTPSErrors.
