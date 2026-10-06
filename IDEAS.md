# Happy Blocks — ideas

A running list of ideas for the game. ✅ = built, 🔨 = in progress, 💡 = idea.

## New blocks and board pieces
- ✅ **Forest & beaver** — trees block cells and can hide a block; pull a beaver onto a tree and it eats
  it (wood chips flying), revealing what's hidden. Each beaver eats one tree and is gone.
- ✅ **Prison** — blocks behind iron bars with a padlock number; every 🔑 key block you drag out opens it
  one step. The engine already supports keys and locks.
- ✅ **Chained blocks** — a block chained to a post can only move as far as its chain reaches
  (e.g. 2 cells from the post); the chain is drawn and pulls tight when you drag.
- ✅ **Arrow blocks** — slide only one way (↔ or ↕). Already in the engine.
- ✅ **Colour lanes** — floor tracks only one colour may cross. Already in the engine.
- ✅ Walls, ice, frozen doors, layered blocks, fire & water.

## Learning the game
- ✅ **"New!" pop-up for every new feature** — the first time a level uses something new (ice, fire, beaver…),
  a short card shows a looping mini-animation of how it behaves, with an "OK, got it" button (and ▶ Show me).

## Ways to play
- ✅ **Daily puzzle** — the same level for everyone each day, a 🔥 streak, and a shareable result
  ("Happy Blocks #12 ⭐⭐⭐ 18 moves").
- 💡 **Level editor** — build a board, the solver checks it can be solved and sets par, share it with friends.
- 💡 **Time attack (solo)** — as many stars as possible in 5 minutes.
- ✅ Challenges (timed, for 1–20 players), teams, friends, help requests.
- ✅ Packed boards, levels mixing several specials, and ⏱ time-challenge levels.

## Progress and rewards
- ✅ **Medals / achievements** — e.g. "10 levels at par", "helped 5 friends", "no undo".
- ✅ **Themes** unlocked with stars — candy, space, neon…
- 💡 **Team weekly goal** — "collect 150 stars together this week".

## Friends and social
- 💡 **Push notifications** when a friend asks for help or sends a solution (needs the store apps).
- 💡 **Team vs team** challenges.
- ✅ Challenge difficulty slider (tiers from tools/difficulty.js). 💡 Use the tiers in stories too (pick puzzles by `diff`), and a "difficulty" badge on level cards.
- ✅ Help requests with solution replay, friends leaderboard, share links for any level.
- ✅ Invite friends to a challenge from the app (pop-up on their home screen).
- 💡 Show who invited you on the challenge card; remind friends who haven't joined yet.

## Comfort and accessibility
- ✅ **German** (Settings → English / Deutsch). 💡 More languages: add an i18n-xx.js dictionary; translate privacy.html.
- 💡 **Colour-blind mode** — a small symbol on each block and its door, so colour isn't the only clue.
- 💡 **Music** (off by default), and a haptics switch.

## Apps and hosting
- 💡 **Permanent APK download link** — publish app-debug.apk to a fixed GitHub release on every build.
- 💡 **Custom domain** (e.g. happyblocks.fun) on Firebase Hosting.
- 💡 **App Store / Google Play** release (needs the developer accounts; see APPS.md), TestFlight for friends.
- 💡 **Sign in with Apple / Google** as extra login options.
- ✅ iOS + Android apps with live updates, website on Firebase Hosting.
