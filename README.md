# Happy Blocks (formerly Unblock It)

A sliding-block colour puzzle. Drag every block out through the door of its colour.

- 150 levels in 30 stages: walls, ice, frozen doors, layered blocks, fire (water blocks put it out), beavers,
  blocks on wheels, colour lanes, prisons and keys, chains, packed boards, and mixes of them; some are ⏱ time challenges
- **Daily puzzle** with streaks, star chests (block styles and skies), medals, gifts for friends
- **Story mode**: Mörfi's ISA missions, Bear & Kloenchen's bike tour and Wolfgang & Mike's "Treasure for Anton",
  with puzzles along the way
- **English and German** (Settings; starts in the phone's language)
- Every level was generated and checked by the built-in solver; its move count is the par (★★★)
- Undo, restart, saved progress and stars, sound effects (synthesized, no audio files)
- Accounts (email + password, optional — everyone starts as a guest), friends, nickname leaderboard, **teams** (up to 20 players; everyone's stars add up on the team leaderboard)
- **Challenges**: anyone starts one and shares a link or 6-letter code. The creator picks when it starts,
  how long it's open, and optionally each player's play time, the number of levels (from a separate pool
  of 120) and how many players can join. Live scores for players and teams. Friends can be invited
  straight from the app (they get a pop-up on their home screen).
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
| `js/extras.js` | Daily puzzle, streaks, star chests, medals, gifts |
| `js/story.js` | Story mode (characters and scenes drawn as SVG, chapters as step lists) |
| `js/intro.js` | "New!" cards that show each new block type |
| `js/i18n.js`, `js/i18n-de.js`, `js/i18n-story-de.js` | Languages (German dictionaries keyed by the English text) |
| `js/native.js` | iOS/Android app bits (Capacitor), live updates |
| `tools/` | Level generator, web build for the apps, translation check |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline + install |
| `tools/generate.js` | Level generator |

All artwork, names and levels are original.
