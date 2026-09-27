# Happy Blocks (was Unblock It) — notes for Claude

The app was renamed "Happy Blocks"; the repo, URL, localStorage keys (`unblock_*`) and Firebase project keep
the old name on purpose (changing them would lose progress / break links).

Vanilla JS, no build step for the game. **Website: Firebase Hosting** https://happyblocks-game.web.app, published
from `www/` (npm run build:web) by the `hosting` job in apps.yml (secret FIREBASE_SERVICE_ACCOUNT; or
`firebase deploy --only hosting` with the service-account key). GitHub Pages (woleywa.github.io/Unblock-it)
and the project's default site unblock-it-913f7.web.app (same files, second entry in firebase.json) only forward there: index.html's first script redirects, carrying localStorage progress as ?carry= (merged
by game.js). Custom domain: not yet — when added, update native.js WEB, authorized domains, privacy.html. Bump `?v=N` on the script/style tags
in `index.html` AND the `CACHE` name + file list in `sw.js` on every change, or phones keep the old
version.

## Apps (see APPS.md)
- Capacitor 8 wraps the same files: `npm run build:web` copies them to `www/` (gitignored), `npm run sync`
  also copies into `ios/` and `android/`. App id `com.woleywa.happyblocks`. `.github/workflows/apps.yml`
  builds an Android debug APK (artifact) and an unsigned iOS simulator build on every push to main.
- Firebase Auth uses `initializeAuth` (not `getAuth`): getAuth loads the popup/redirect iframe, which never
  loads in the iOS web view, so sign-in hung in the app. The apps bundle the SDK: build-web copies
  node_modules/firebase's CDN builds to www/vendor/firebase and rewrites the gstatic imports.
- `js/native.js`: `Native.app`, `Native.buzz()` (haptics), `Native.webBase()` (invite links must use the
  public web URL, not capacitor://), status bar, Android back button. No service worker in the apps.
- Live updates: job `web-update` publishes www as `bundle-<run>.zip` + `update.json` on release
  `app-web`; native.js `checkForUpdate` downloads a newer build via @capgo/capacitor-updater (manual
  mode, stats off) and applies it next launch. `www/version.json` = { build: GITHUB_RUN_NUMBER (0 local),
  minNative }. Native-code changes: bump app build numbers + MIN_NATIVE_BUILD in tools/build-web.js.
- Icons/splash: source art in `assets/` (rendered from Art.blockSVG), `npm run icons` makes every size.
- Account deletion (Apple requirement): online.js `deleteAccount` (re-auth with password, leave team,
  delete runs/player/name/save, then the auth user).

## Rules (engine.js)
- A block leaves through a door of its colour on the edge it touches, if its span fits in the door and
  nothing is between it and the door. Blocks slide anywhere through empty cells.
- Ice (`ice: n`) on a block: can't move; counts down once per block that leaves.
- Frozen doors (`frozen: n`): closed; count down once per block that leaves.
- Layered blocks (`inner`): the outer colour leaves; the core stays **next to the door** (applyExit with
  the gate slides it there first — matches dragging in the game).
- The engine also supports keys/locks, tracks, arrows, stars, inner-wall doors (from the Block Out
  solver it started from); levels don't use them yet.

- Fire (`fire: n`, colour 'fire', 1×1): an unmovable piece blocking its cell; each 'water' piece that
  leaves lowers every fire by 1 and removes it at 0. Done = no pieces left except fires
  (`Engine.done`). Fire levels (stage 7) leave out sky/blue (water is teal). The generator only keeps
  fire levels where some move crosses a burning cell.

- Forest (colour 'forest', 1×1, `under`: hidden colour or null) and beaver (colour 'beaver', 1×1, no door):
  a beaver that ends a drag next to forest hops onto ONE forest cell and eats it; the beaver is used up
  (`Engine.eatAround(level, st, id, forestId)`, same id → the hidden block). Every forest must go, so the
  generator puts one beaver per forest cell. The solver never exits beavers, tries `findEat` (also a beaver
  already next to trees — in the game it can sit there unfed), and findUnblock's first stage is a
  fastSearch in `'eat'` mode (goal: beaver next to forest). In the game the beaver eats only when pulled
  onto the tree (pointermove → finishDrag(null, way)); solution steps record it as `e: forestId`.
- Arrow blocks (`axis` h/v): the generator only gives an arrow to a block already lined up with its
  door (else it could never leave). Drawn as two arrowheads at the block's ends (art.js).
- Colour lanes (`level.tracks` [[r, c, colour]]): striped floor cells (Art.lane); the generator lays 1–2
  straight lanes over empty cells or blocks of that colour only.
- Prison: `lock: n, lockColor: 'gold'` blocks (bars + padlock) and `key: true, keyColor: 'gold'` blocks
  (golden key); each key that leaves opens one lock on every prison (Engine.applyExit).
- Chains (`tether: { r, c, len }`): the post is a wall cell; `Engine.inReach` limits where the block may
  sit (fits + fastSearch footprints) and `Engine.reachesDoor` which doors it can use. game.js drawChains()
  draws posts (with the reach number) and chains, live while dragging.
- "New!" pop-ups: js/intro.js (`Intro.show(key, again)`), one looping mini-board scene per feature
  (basics, walls, ice, frozen, layered, fire, beaver) drawn with the real Art functions and a 👆 finger.
  start() shows it once per feature (localStorage `unblock_seen_intros`) and adds "▶ Show me" to the hint.
- Generator: `--append` makes only the stages after the existing levels; `--redo 38,39` replaces levels;
  both use mulberry32 (the original LCG repeats itself — it made identical levels) and every board is
  checked against the others for duplicates. A full rebuild still uses the LCG (same levels as before).

## Game (game.js)
- Drag: the block slides cell by cell toward the finger (greedy, larger axis first), stopping at
  obstacles. Pushed past the board edge with a clear lane to a door of its colour → it leaves. Dropped
  touching such a door → it leaves. Each drag that moved = 1 move.
- Dragging glides with the finger between cells (snapped cell moves on at half a cell), with a small
  rubber-band give against obstacles; drawn in requestAnimationFrame.
- Blocks are stacked by bottom row (`--z`) so a block's side/shadow tucks behind the one below; the face
  is lifted by half the thickness so face + side fit inside the block's own cells.
- Only a block's tiles take pointer events (the block div covers its bounding box).
- Stars: ≤ par ★★★, ≤ ceil(par × 1.4) ★★, else ★. Progress in localStorage `unblock_progress_v1`.

## Look (art.js + style.css)
- Blocks are one SVG each (`Art.blockSVG`): the polyomino's true outline (edge tracing, inset, rounded
  outer corners, softer inner corners), a darker copy below for thickness, a drop shadow, a vertical
  gradient face, gloss and per-cell shines, a blinking face (an "o" mouth while dragged), a jewel core
  for layered blocks, frosted ice with cracks and a count. Iced blocks and frozen doors hide their colour entirely
  (ice palette for face and side, no face/core); thawing pops the block with sparks. Only the `.hit` face path takes touches.
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
- The service worker never caches Firestore/auth traffic (only own files, fonts, the SDK). The page and
  unversioned files are network-first (fetched with cache: 'no-cache', 4 s timeout → cached copy), so
  links like #level=N run the newest code on the first load; ?v=N files, fonts and the SDK are cache-first.
- Teams (`teams/{code}`): `stars` = members' stars added up, `members` ≤ 20. The rules check both sides:
  a player's stars change only together with their team's total (`increment`), joining/leaving moves
  members ±1 and exactly that player's stars. online.js `writePlayer`/`moveTo` batch these; `retry`
  re-reads the player doc once on permission-denied (stale copy).
- Challenges (`challenges/{code}` + `entries/{uid}`): `start` + `window` min is when it's open, `playMin`
  (0 = none) is each player's clock from `started` (server time), `levels` 0 = endless, `players` caps
  `joined` (incremented in the same batch as the entry). The server clock decides (rules use
  `request.time`, 30 s grace); the client estimates skew from its own writes (`Online.now()`).
  Everyone's level order comes from the challenge `seed` (social.js `seqOf`, pool in
  challenge-levels.js, easy → hard). Entry `runs` = { position: best moves }; stars recomputed from par.
- Accounts: everyone starts as an anonymous guest; "Save my progress" links email + password to the same
  uid; signing in elsewhere switches uid and fires `online-user` (game.js merges local ↔ `saves/{uid}`,
  best of each). Email/password was enabled via the Identity Toolkit admin API with the service account.
- Friends: one-way list in the private `saves/{uid}.friends`; Friends tab = you + them. Add by nickname,
  by tapping a player on the Players tab, or with a friend link `#f=UID`.
- Names/teams allow emoji and any letters (2–16 / 2–20 characters, counted with Intl.Segmenter); rules
  only refuse slashes, control characters and blanks. Any team member can rename the team.
- Developer mode: accounts in `config/dev { uids }` (set with the service account). online.js stores
  `unblock_dev` in localStorage; the privacy page's 🛠 Developer section (only then) has an on/off switch
  (`unblock_dev_on`) and, in the app, the update status + "Check for updates" (applies at once). On:
  every level is open (game.js `devOn`). Off: a normal player, including no 💡 hint (`devPaused`).
- App updates: after a download the game shows "✨ New version ready · Tap to update" on the home screen /
  level list only (never mid-level) → `Native.applyUpdate` (CapacitorUpdater.set). Also checks when the app
  comes back to the foreground. GitHub serves update.json as octet-stream → native HTTP may return base64.
- Hints (💡 in the game bar): only for registered players listed in `config/hints { uids }` (public
  read, no client writes — set it with the service account, scratchpad `sethints.cjs`-style PATCH).
  Never in challenges. The whole solution is cached; while the board matches the next step's start,
  the next hint is that step (so following hints wins at par).
- Exits: at its door with the way clear, a pull of ~0.18 cell toward it sends a block out; letting go
  at the door, or one cell away after moving toward it, or a flick (≥ 4 cells/s) from ≤ 4 cells away,
  does too. The leave animation starts from where the block is (no snap back).
- Home screen must fit one screen (no scrolling; sizes use vh clamps, checked at 375×667 → 430×932). Help shows as one `#help-pill` line; the list is the `#help-sheet` overlay.
- Help requests: `help/{id}` (12-char id; listed by asker/`to` friends, readable by anyone with the id) +
  `answers/{uid}` with the helper's drags `{p, r, c, g}` (game.js `sol`, recorded in finishDrag, trimmed
  on undo). Home shows cards (social.js `helpBox`); a helper's win sends `Social.sendSolution`; the asker
  follows it (`💡 Next move`, compares the board with `replayTo`) or watches it (`watching` = no stars).
  Links `?level=N&help=ID` → `pendingHelp`. `players.helped` counts friends helped (🤝 on Friends tab).
- Links: `#join=CODE` (team), `#c=CODE` (challenge), `#f=UID` (friend), `?level=N` or `#level=N` (opens campaign level N
  for anyone, even if locked — the "Ask a friend to solve this" button under the board). On iPhone a link opens Safari, which is a different
  account from the home-screen app — so codes can be typed in too.
- Note: game.js has a global `history` (undo stack) — use `window.history` for the browser's.
- **Deploying rules**: the user gave a Firebase service-account key (kept outside the repo; never
  commit it). `firebase deploy` fails on the `:test` call (403), so publish via the Rules REST API:
  POST `projects/unblock-it-913f7/rulesets` with the file, then PATCH `releases/cloud.firestore`
  (google-auth-library, cloud-platform scope). Test rules first in the emulator (Java is available):
  `firebase emulators:exec --only firestore` with @firebase/rules-unit-testing.
- End-to-end: Playwright against the auth + firestore emulators by rewriting online.js on the fly to
  call `connectFirestoreEmulator`/`connectAuthEmulator` (clear data with DELETE
  `/emulator/v1/projects/<id>/databases/(default)/documents`).
- Local test: serve the SDK from `npm pack firebase@10.14.1` by routing gstatic URLs in Playwright,
  and launch Chromium with the sandbox proxy + ignoreHTTPSErrors.
