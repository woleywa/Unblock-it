# Level difficulty

Every level has `diff` (tier 1–5) and `dscore` (the number behind it), measured by the solver — see `tools/difficulty.js`.
`score = room-making moves + 1.2 × mechanics on the board + 0.08 × par + 0.1 × blocks`. Tiers:

| Tier | Name | Score |
|---|---|---|
| 1 | Easy | < 7 |
| 2 | Medium | 7 – 11.9 |
| 3 | Hard | 12 – 17.9 |
| 4 | Expert | 18 – 25.9 |
| 5 | Master | ≥ 26 |

New levels are rated by `tools/generate.js` as they are made. After changing a pool by hand, run `node tools/rate.js`
(it rewrites this file). Challenges (`diff` slider) draw from all three pools by tier.

## Levels per tier

| Pool | Easy | Medium | Hard | Expert | Master | Total |
|---|---|---|---|---|---|---|
| Campaign (LEVELS) | 19 | 40 | 28 | 44 | 19 | 150 |
| Challenge pool (CHALLENGE_LEVELS) | 55 | 30 | 23 | 12 | 0 | 120 |
| Daily pool (DAILY_LEVELS) | 0 | 4 | 26 | 42 | 16 | 88 |
| **All** | 74 | 74 | 77 | 98 | 35 | 358 |

## Campaign, stage by stage (tier of each of the five levels)

| Levels | Stage | Tiers |
|---|---|---|
| 1–5 | Warm-up | 1 1 1 1 1 |
| 6–10 | Getting busy | 1 1 1 1 1 |
| 11–15 | Walls | 1 2 2 1 1 |
| 16–20 | On ice | 2 1 2 2 2 |
| 21–25 | Frosty doors | 2 3 3 3 2 |
| 26–30 | Layers | 4 4 4 4 3 |
| 31–35 | Fire | 2 2 1 2 2 |
| 36–40 | Mixed bag | 4 4 4 3 4 |
| 41–45 | Big boards | 4 3 4 4 4 |
| 46–50 | Expert | 4 5 5 5 5 |
| 51–55 | Beaver woods | 2 3 2 2 3 |
| 56–60 | On wheels | 2 2 2 2 2 |
| 61–65 | Colour lanes | 2 1 3 2 2 |
| 66–70 | Prison | 2 1 2 2 2 |
| 71–75 | Chains | 2 2 3 2 2 |
| 76–80 | Packed | 1 2 1 2 2 |
| 81–85 | Ice, keys & arrows | 2 3 3 3 2 |
| 86–90 | Fire & lanes | 2 4 4 3 3 |
| 91–95 | Woods & chains | 3 4 3 4 2 |
| 96–100 | Grand finale | 3 3 4 4 3 |
| 101–105 | Packed on wheels | 3 3 4 2 2 |
| 106–110 | Fire & prison | 4 4 3 3 3 |
| 111–115 | Lanes & chains | 4 4 4 3 3 |
| 116–120 | Master | 4 4 5 5 4 |
| 121–125 | Fire & ice | 3 5 4 5 5 |
| 126–130 | Locked on wheels | 4 4 4 4 5 |
| 131–135 | Fire & chains | 5 4 4 4 4 |
| 136–140 | Packed prison | 5 4 4 4 5 |
| 141–145 | Burning lanes | 4 5 4 4 5 |
| 146–150 | Grand master | 5 4 5 5 5 |

## Story puzzles (pool index → tier)

- **CH1**: Creep through the grass (daily #32: Medium); Under the leaf (daily #36: Medium); Behind the mushroom (daily #73: Hard); Escort the beetle home (daily #79: Hard)
- **CH2**: Pedal past the fields (daily #34: Medium); Follow the cat (daily #78: Expert); Through the pine forest (daily #38: Medium); Reach the secret box (daily #72: Expert)
- **CH3**: Search the house (daily #63: Hard); Through the garden (daily #76: Hard); Follow the feather trail (daily #50: Hard); Climb the big tree (daily #74: Expert); Return everything (daily #44: Hard)
- **CH5**: The secret lift (daily #0: Expert); Search the headquarters (daily #6: Hard); Follow the crumbs (daily #16: Hard); Chase Snacko (daily #17: Hard); Refill the vault (daily #75: Expert)
- **CH4**: Up the rocky hill (daily #33: Hard); Find a gap in the clouds (daily #4: Expert); Chase the lights (daily #57: Hard); Home in the dark (daily #37: Hard); Pack the souvenirs (daily #40: Hard)
- **CH6**: Tidy the balcony table (daily #10: Expert); Under the chestnut tree (daily #22: Hard); Catch the feather (daily #46: Expert); Across the park (daily #60: Expert); Pack the treasure box (daily #81: Master)
