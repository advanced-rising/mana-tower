# Tower of Infinity

A fantasy idle/incremental game that grows from a single tower into the structure of the
cosmos. No network, no runtime dependencies — open the page and play.

Play: <https://advanced-rising.github.io/mana-tower/>

## Layout

The code lives in `src/` and esbuild bundles it into `dist/bundle.js`, which is committed.
Playing needs no build; only changing the code does.

```
index.html          46 lines of shell
src/style.css       the whole stylesheet
src/
  core.ts           language switch, sprite helpers
  producers.ts      the six buildings (kept apart so state can size its arrays)
  content.ts        research, runes, gear, every upgrade tree, trials, achievements
  state.ts          the save shape
  num.ts            log-space arithmetic and the notation ladder
  multipliers.ts    computeM — where every multiplier is combined
  dungeon.ts        floors, monsters, loot, the cosmic ladder
  prestige.ts       rebirth, ascension, transcendence, the infinity layers
  trials.ts         challenge entry and rewards
  automation.ts     what runs itself, and when it unlocks
  tick.ts           one step of the world
  save.ts           localStorage, import, export
  main.ts           the loop, hotkeys, boot
  ui/
    dom.ts  tabs.ts  widgets.ts  panels.ts  resbar.ts  render.ts
```

```bash
npm install
npm run build      # dist/bundle.js
npm run watch      # rebuild on save
npm run check      # tsc --noEmit
npm run art        # regenerate sprites and UI from tools/
```

Types are deliberately loose for now — the split came first, and it is verified to behave
exactly as the single file did. `npm run check` lists what is left to tighten.

A `window.__game` handle exposes the internals for the console and the test harness.

## The shape of a run

```
🪄 Gather mana (by hand)
   └ 🧙 Apprentice → ⚒️ Workshop → 🗼 Tower → 🏛️ Academy → 👑 Conclave → ✨ Starlit Spire
        Each tier builds the one below it. Only the Apprentice draws mana directly.

⚗️ Research        one-off purchases, spent in mana, lost on rebirth
⚔️ The Delve       your buildings are your attack power. Bosses every 10 floors.
                   Depth itself is a permanent multiplier.

🔮 Rebirth      → Soul Stones + Offerings   ── soul upgrades, runes
🏺 Ascension    → Relics                    ── relic upgrades (permanent)
⭐ Transcendence → Stardust                  ── star upgrades
⛓ Trials        constraints in exchange for permanent rewards
🏅 Achievements  each one lifts mana output
```

## Past the ceiling

A double-precision number stops at about `1.8e308`. The game does not stop there.

Mana, costs, dungeon HP and attack power are all carried as **base-10 logarithms**, added
and subtracted in log space (`logAdd`, `logSub`, `geoSumLog`). Nothing in the ledger has a
maximum. When a quantity does reach infinity, that is not an error state — it is a door.

```
Rebirth → Ascension → Transcendence → ∞ Infinity → Eternity → Reality → Void → Origin
                                       └ 10 Infinities open one Eternity
```

Each layer resets everything under it and pays out its own currency with its own upgrade
tree. Infinity keeps your stardust; Eternity and above fold even that away and start over
in earnest. The first break of any layer must be done by hand — after that it automates.

### How numbers are written

```
1,234 → 1.23M → 1.23B → 1.23T → 1.23aa … 1.23zz (1e2,040)
      → 1.23aaa … 1.23zzz (1e54,768) → e54,771 → ee4.74 → eee … → (e^12)3.4
```

Letters run three deep; above that the exponent itself is stacked into layers. There is no
last notation.

### The cosmic ladder

Delve depth is read as twelve nested tiers — the digits of the floor number are the
address of where you are.

```
floor → planet → system → cluster → galaxy → group → galactic cluster
      → supercluster → filament → cosmic web → observable universe → multiverse
```

Crossing a tier changes the chapter: the background, the palette and the framing of the UI
all move with you. Tiers you have not reached yet are shown as `?` — you are not told what
is up there until you arrive.

## Content

| Block | Count |
|---|---|
| `PRODUCERS` | 6 |
| `RESEARCH` | 21 |
| `RUNES` / `GEAR` | 12 / 18 |
| `SOUL_UPS` / `RELIC_UPS` / `STAR_UPS` | 16 / 24 / 16 |
| `INF_UPS` / `ETER_UPS` / `REAL_UPS` / `VOID_UPS` / `ORIGIN_UPS` | 10 / 16 / 10 / 8 / 6 |
| `CHALLENGES` | 20 |
| `ACHS` | 37 |

Every item has its own name and its own sprite — no two share either.

## Automation is a reward

You gather, build, research and delve by hand at first. Each automation unlocks as you go,
and every one of them can be switched on and off individually in the Automation tab. Once
all of them are open the game will run unattended indefinitely. Breaking a prestige layer
once by hand is what unlocks automating that layer.

## Pixel art

907 images, all generated. The source of truth is code, not a canvas.

```
tools/pixkit.py        drawing toolkit — masks, tone bands, majority smoothing, outlines
tools/foes.py          192 monsters: 24 base forms × 8 elemental affixes
tools/build_sprites.py art/sprites/*.png   (844 files, 16×16)
tools/build_ui.py      art/ui/*.png        (59 files — 9-slice frames, chapter tiles, logo)
```

Everything is 16×16 and drawn side-on, in the register of a 2000s Korean action MMO.
Shading is a small number of flat tone bands rather than a gradient, passed through a
majority filter to kill stray pixels, and closed with a visible outline. Monster parts —
flames, venom drips, frost shards — anchor to the silhouette's contour so nothing clips.

UI frames are CSS `border-image` 9-slices with hollow centres, so the page's own background
shows through. The logo is a TrueType face rendered without antialiasing, thresholded to
one bit and given a gold ramp.

```bash
python3 tools/build_sprites.py    # rebuild all sprites
python3 tools/build_ui.py         # rebuild frames, chapter tiles and logo
python3 tools/foes.py             # rebuild the bestiary
```

Sprites are only ever displayed at integer multiples of their native size.

## Korean / English

Both languages live in the one file. The switch is at the top right and the choice is
remembered. On first open it follows the browser (`ko*` → Korean, otherwise English).

Translations sit inside the content definitions themselves:

```js
nm:{ko:'견습 마법사', en:"Apprentice Mage"}       // name
d:()=>X('마나 생산 ×2', "Mana output ×2")        // description, translated when called
```

`X(ko, en)` reads the current language at call time, so a new item needs only two strings.

## Changing the numbers

Everything lives in the content-definition block near the top of the file. Each entry
mutates a multiplier object in `apply(m, lv)`, so **adding one line to an array reaches
both the UI and the maths**.

```js
{id:'q22', sp:'star', nm:{ko:'별의 계약',en:"Star Compact"}, cost:1e21,
 d:()=>X('마나 생산 ×100',"Mana output ×100"), req:'q21', apply:m=>m.prod*=100},
```

`computeM()` is where every multiplier is combined; `AUTO_DEFS` holds the automation
entries and their unlock conditions.

## Saves

- Written to `localStorage` every 15 seconds, and on tab hide or close
- Export / import as `.txt` (base64 JSON) from the Settings tab
- Offline progress runs 4 hours by default, up to 24 with the offline soul upgrade

## Hotkeys

`1`–`9`, `0` switch tabs · `Space` gather · `B` buy quantity · `E` toggle delving · `S` save
