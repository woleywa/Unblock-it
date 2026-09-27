# Happy Blocks — design kit

Everything you need to understand, reuse or extend the look of Happy Blocks.

**The game has no image files.** Every block, face, tree, door and effect is drawn by code at
runtime: `code/art.js` builds each block as one SVG (outline, gradient, shine, face, badges) and
`code/style.css` adds the animations, glows and screen styling. The images in this folder are
exports of exactly those drawings (rendered from the real game code by a script), so tools and
other AIs can use them directly.

## What's here

| Folder | Contents |
|---|---|
| `blocks/` | Every block colour as a 1×1, a 2×1 bar and an L shape — SVG (vector, standalone) + PNG (transparent, 3×) |
| `specials/` | Frozen (ice) block, layered block, key block, prison block, arrow blocks ↔ ↕, beaver, water block, fire, forest |
| `board/` | Logo (SVG + PNG), app icon, a door, a frozen door, a colour-lane cell |
| `screens/` | Screenshots: home, level list, and one level of every type |
| `palette.json` | The block colours: `light`, `base`, `dark`, `side` for each |
| `code/` | `art.js` (all drawing) and `style.css` (all styling) — the source of truth |

## Style guide

- **Mood:** cute, soft, glossy "jelly" toys on a dreamy night sky. Friendly, never harsh.
- **Blocks:** rounded polyominoes (corner radius ≈ 24% of a cell), a vertical gradient
  `light → base → dark`, a visible thickness underneath in the `side` colour, a soft shadow,
  a white gloss band on the top half and one oval shine per cell. A thin light rim on top,
  a darker rim just inside.
- **Faces:** every block has one — dark plum eyes (`#2a1740`) with a white sparkle, a small smile,
  pink cheeks (`#ff4f8b` at 28%). Eyes blink now and then; the mouth becomes an "o" while dragged.
- **Background:** radial night gradient `#3b2a8f → #22185a → #120c2e` with slowly drifting,
  heavily blurred glows in violet `#7b3cff`, pink `#ff4fa3`, blue `#2f8bff` and gold `#ffd54a`.
- **Board:** a raised purple tray (`#5646b8 → #33287c`) with a darker lip; empty cells are sunken
  (`#1c1547 → #251d5a`, inner shadow). Walls are raised purple tiles.
- **Doors:** glowing pills in the block colour with white chevrons marching outward; a frozen door
  is frosted white with a ❄ and a count.
- **UI:** font **Fredoka** (rounded, weights 500–700). Text `#fffaf2`, secondary `#c3b9f0`.
  Primary buttons are thick gold (`#ffd54a` → `#e0a100`) with a darker bottom edge that squashes
  on press; secondary buttons are frosted glass (white at 9%, border at 16%).
- **Motion:** springy (`cubic-bezier(.3,1.6,.5,1)`), short (150–400 ms). Blocks glide with the
  finger, settle with a little bounce, and leave in a burst of sparks in their colour.

## Colours

| Name | light | base | dark | side |
|---|---|---|---|---|
| red | `#ff7a82` | `#e8263a` | `#c0142a` | `#860a1b` |
| blue | `#8db8ff` | `#3d7bff` | `#2a5fe3` | `#1c42ad` |
| yellow | `#fff5a0` | `#ffe22e` | `#f2c800` | `#b08f00` |
| green | `#8ff2b0` | `#2fcf6f` | `#1dab56` | `#12803f` |
| purple | `#d8b0ff` | `#a45cff` | `#8439e8` | `#6124b6` |
| orange | `#ffb07a` | `#ff7417` | `#e85d00` | `#a13d00` |
| pink | `#ffb0da` | `#ff5fb2` | `#ea3a92` | `#b52470` |
| sky | `#a6eeff` | `#3fd0ff` | `#18aeee` | `#0b83bc` |
| water | `#a8fff4` | `#1fd6c6` | `#0fb0a8` | `#0a7d80` |
| beaver | `#e2ae78` | `#a86a38` | `#834f26` | `#5c3416` |

## Game rules in one line each (for context)

Drag every block out through the door of its colour. Walls block. Ice melts one step per block
that leaves. Frozen doors open after that many blocks leave. Layered blocks leave their core
behind. Water blocks put out fire as they leave. Beavers eat one tree each. Arrow blocks slide one
way only. Colour lanes let only their colour across. Prison blocks open when every key block has
left. Chained blocks only reach as far as their chain.
