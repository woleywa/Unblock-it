# Unblock It

A sliding-block colour puzzle. Drag every block out through the door of its colour.

- 30 levels in six stages: basics, bigger boards, walls, ice, frozen doors, layered blocks
- Every level was generated and checked by the built-in solver; its move count is the par (★★★)
- Undo, restart, saved progress and stars, sound effects (synthesized, no audio files)
- Installable web app: works offline; on iPhone use Share → Add to Home Screen

## Play

Hosted with GitHub Pages at `https://woleywa.github.io/unblock-it/` (enable Pages: Settings → Pages →
Deploy from branch `main`, folder `/`).

Locally: `python3 -m http.server` in this folder, then open http://localhost:8000.

## Levels

`node tools/generate.js [seed]` rebuilds `js/levels.js`. Stages (sizes, colours, mechanics and how many
room-making moves the solver must need) are set at the top of the generator.

## Files

| File | Role |
|------|------|
| `index.html`, `style.css` | Screens and look |
| `js/game.js` | Board drawing, dragging, exits, stars, progress |
| `js/engine.js` | Rules and solver (pure functions) |
| `js/levels.js` | Generated levels |
| `js/audio.js` | Sound effects (Web Audio) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline + install |
| `tools/generate.js` | Level generator |

All artwork, names and levels are original.
