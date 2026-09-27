# Happy Blocks (formerly Unblock It)

A sliding-block colour puzzle. Drag every block out through the door of its colour.

- 35 levels in seven stages: basics, bigger boards, walls, ice, frozen doors, layered blocks, fire
  (water blocks put the fires out)
- Every level was generated and checked by the built-in solver; its move count is the par (★★★)
- Undo, restart, saved progress and stars, sound effects (synthesized, no audio files)
- Accounts (email + password, optional — everyone starts as a guest), friends, nickname leaderboard, **teams** (up to 20 players; everyone's stars add up on the team leaderboard)
- **Challenges**: anyone starts one and shares a link or 6-letter code. The creator picks when it starts,
  how long it's open, and optionally each player's play time, the number of levels (from a separate pool
  of 120) and how many players can join. Live scores for players and teams.
- Installable web app: works offline; on iPhone use Share → Add to Home Screen

## Play

Play at **https://happyblocks-game.web.app** (Firebase Hosting, published by GitHub Actions on every push
to `main`; see `firebase.json`). The old GitHub Pages address forwards there.

Locally: `python3 -m http.server` in this folder, then open http://localhost:8000.

## Levels

`node tools/generate.js [seed]` rebuilds `js/levels.js`; `node tools/generate.js challenge [seed]` rebuilds
the challenge pool `js/challenge-levels.js`. Stages (sizes, colours, mechanics and how many
room-making moves the solver must need) are set at the top of the generator.

## Files

| File | Role |
|------|------|
| `index.html`, `style.css` | Screens and look |
| `js/game.js` | Board drawing, dragging, exits, stars, progress |
| `js/engine.js` | Rules and solver (pure functions) |
| `js/levels.js`, `js/challenge-levels.js` | Generated levels (campaign, challenge pool) |
| `js/online.js`, `firestore.rules` | Firebase: nickname, leaderboards, teams, challenges |
| `js/social.js` | Team and challenge screens |
| `js/audio.js` | Sound effects (Web Audio) |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline + install |
| `tools/generate.js` | Level generator |

All artwork, names and levels are original.
