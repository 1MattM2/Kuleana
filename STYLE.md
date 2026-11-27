# Kuleana Style Guide

This is the standard every new area, creature, effect and sound must meet. It's distilled from the pieces that set the
bar: the **sea-cave pool and its whale shark**, the **Hale Koa dojo**, the **weapon effects**, and the **island flora**.

The master palette lives in `tools/palette.py`. It generates `js/palette.js` (the `PAL` object the game draws from) and
`docs/palette.png` (the swatch sheet). Run `python3 tools/palette.py audit` to check how closely an asset sticks to it.

---

## 1. Colour

- **Only draw from the master ramps.** Each ramp runs dark → light and is hue-shifted: shadows cool and deep,
  highlights warm. Never pick an off-palette colour "by eye". If a ramp is missing, add it to `tools/palette.py`
  (measured from real art) and regenerate.
- **Terrain family:** `obsidian` (lava rock, cliffs, walls), `soil` (volcanic earth), `grass`, `sand`, `glyph`
  (the island's carved path), `stone` (temple and ruin stone), `sun` (the sun-court tiles and every sun motif).
- **Flora family:** `palm`, `fern`, `taro`, `bark`, `hibiscus`. Plants are the island's own sprites; reuse them.
- **Water family:** `water` (open ocean, deep to mid), `water_shallow`, `foam` (swash and crests), `river`, and the
  sea-cave bioluminescence `bio_blue`, `bio_teal` and `bio_violet`.
- **Light family:** `fire`, `haze` (distant air), `sun`, plus the light ends of the `bio_*` ramps.
- **Crafted family:** `koa` (dojo planks, bridges, tiki wood), `lauhala`, `kapa`, `steel`, `feather`, `skin`.
- **Emissive colours** (`sun` light end, `fire`, `bio_*`, crystal light) are the only ones that also go into the
  additive glow layer. Everything else is lit, never glowing.

## 2. Pixels

- **One art pixel = one game pixel.** The world is built on a 32px tile, and the screen scales by whole numbers.
- **No blended in-between colours.** Gradients are made with 4×4 ordered dithering (`PAL.bayer`), the way the cave
  pool, cloud shadows and sun court are made. Never scale art by a fraction without a palette snap.
- **Source art is read on its own pixel grid** (e.g. the palm sheet ≈ 5.1px, the new tile sheet ≈ 6.56px). Resampling
  off-grid is what made early palms look smeared.
- **Outlines are a dark tint of the thing they wrap** (sel-out), never flat black: the darkest step of the ramp, or
  `PAL.INK` for characters.
- **Light comes from the top-left.** Top/left edges get one step lighter; bottom/right edges one step darker; raised
  carvings are lit on top and shadowed below.

## 3. Form and texture

- **Organic shapes are rasterised per pixel from smooth maths** and shaded with a ramp, like the whale shark and the
  Glowtide vortex. That keeps them crisp at any angle and lets them animate smoothly.
- **Texture comes from structure, not noise:** flow-aligned brush strokes (cave pool), plank grain and nails (dojo),
  leaf veins and frond ribs (flora), strata and cracks (obsidian). Noise only chooses where structure goes.
- **Every surface has three things:** a base material, an edge treatment (lit lip, dark rim, overgrowth eating into
  it, like the island path), and life (moss, tufts, flowers, vines, debris).

## 4. Motion

- **Animate with continuous values, not frame flips.** Positions, angles and spines are simulated (springs, verlet
  chains, trail history), then rasterised each frame, like the sharks' trailing spines.
- **Secondary motion everywhere:** tails, capes, feathers, vines and leaves lag behind and settle.
- **One wind** (`K.wind`/`K.sway`) drives every plant, cape and feather in the scene, so everything leans together.
- **Readable telegraphs:** every enemy attack has a pose, a flash and a sound before it lands.

## 5. Animation reference

These are the living systems already in the game. New things should move with the same feel.

| System | Where | How it moves |
|---|---|---|
| **Wind** | `js/util.js` (`K.windStrength`, `K.updateWind`, `K.sway`) | One island-wide wind off the sea: a steady breeze plus gusts that build, peak and fade. A shared, slightly underdamped spring turns it into a lean every plant uses, so everything bows together and overshoots a touch on release. |
| **Plants** | `tools/build_assets.py` (`wind_frames`), `js/props.js` | Each plant is pre-rendered at 7 lean levels × 4 flutter phases. Crowns tilt as a whole and their tips stretch downwind; bushes and taro bend from a planted base with the top dipping. A random set of leaves flickers lighter now and then (faster in gusts). Grass tufts and tiny flowers lean on the same wind. |
| **Ocean** | `js/water.js` | Depth bands from the shore (deep → mid → shallow → swash). Two copies of the water texture drift past each other for an evolving shimmer, never a sliding scroll. Swells roll in as crest lines every few seconds. The tide rushes up the sand quickly, drains back slowly and leaves lace foam behind. Sparse sparkles. |
| **River** | `js/water.js` | Flows gently downstream with sideways wobble, faint flow lines and foam at the banks. |
| **Bioluminescent pool** | `js/cave.js` | Thousands of brush strokes traced along a swirling vortex flow field. Light runs along each stroke in the direction of the current (palette colour-cycling), breathes slowly, and flares into rings around drips, footsteps and swimming fins. |
| **Whale shark and sharks** | `js/cave.js` | Each body follows its own trail of past positions (a spine), with a travelling wave toward the tail. Steering is smooth and slow; plankton glows along the edges of the silhouette. |
| **Hero** | `js/charart.js`, `js/main.js` | 4-frame walk with bob and arm swing; headband tails flap faster in gusts and when running; dash afterimages tinted in the weapon colour. |
| **Weapon effects** | `js/combat.js` | Ribbons that sweep in fast (ease-out) and trail away slower (ease-in); painterly fire tongues lick backward off the edge; hit-stop, shake and flash land on contact. |
| **Ambient life** | `js/main.js`, `js/props.js` | Leaves and petals blow along the wind, cloud shadows drift, crabs scuttle, butterflies wander on smooth noise paths, torches flicker on 3 frames. |

Rules that fall out of these:
- **Ease everything.** Nothing starts or stops instantly except impacts. Use springs, ease-in/out and trails.
- **Loops are never visible:** layer two cycles of different lengths (two water copies, gust plus breeze), or drive
  the motion from noise.
- **Speed is gentle at rest and sharp in action:** idle motion is slow (water, wind, breathing); attacks are fast.

## 6. Light and depth

- **Light is its own additive layer** (the `glow` canvas): fire, sun, bioluminescence, crystals, shafts of sunlight.
- **Depth is atmospheric perspective:** layers further away move slower (parallax), get smaller, and are pushed
  toward the `haze` ramp. Cliffs show a tall face that dithers into the air below.

### Building a new area

Repeat the steps that made the sanctum and the highlands match the island:
1. **Reuse the island's materials first.** Use grass (`tex_grass`), sand (`tex_sand`), the carved path (`tex_glyph`),
   obsidian (`tex_rock`) and the sun court (6×5 tiles, medallion, sandstone kerb). Look textures up with the island's
   patch offsets (`patchIdx`) so the 32px repeat never shows.
2. **Treat rock the island's way.** Give it a 1px `ROCK_LINE` outline, a lit `ROCK_HI` north rim and a striated face.
   Ivy hangs from it as single strands with alternating leaves, never as solid bands.
3. **Show height with depth.** Cliff faces hang below every ledge and dither into the air. The ground far below is
   layers of the island's palm crowns, snapped to ramps blended toward `haze` (further = hazier, slower, smaller).
4. **Keep carved things on the grid** (paths, courts, stairs, bridges). Let natural edges wander (noise-perturbed
   tile lookup).
5. **Check it in the browser** at native scale next to the island before calling it done.

## 7. Sound

- **No bells, chimes or cute tones** (the celestial harp is the one deliberate exception).
- **Swings are air with weight:** a smooth Doppler whoosh (never a click), a sub-bass push on heavy swings, and a
  scraped, inharmonic metal ring on blades.
- **Elements sound like the element:** water gushes and splashes, fire ignites and roars and crackles, storms crackle
  and thunder, stone grinds and crumbles, celestial weapons play a harp.
- **Every hit has a material:** wood (tiki), plant (vine), fire (wisp), flesh (gecko), straw (dummies).
- **Elemental weapons carry the element through every swing,** not only on hits (`elementSwing` in `js/audio.js`).
- **Menace comes from weight:** a waveshaped crunch on contact and a sub "thoom" at the peak of heavy swings.
- **The harp** is Karplus-Strong strings tuned to D major pentatonic, kept warm (low-passed, low register) so it never
  turns into a chime.

## 8. Benchmarks

When in doubt, compare new work against these and match their care:

| Benchmark | File | Why |
|---|---|---|
| Sea-cave pool | `js/cave.js` | flow-field brush strokes, colour cycling, palette discipline |
| Whale shark and lemon sharks | `js/cave.js` | spine-trail animation, per-pixel silhouettes, glowing rim |
| Hale Koa dojo | `js/dojo.js` | crafted materials: plank grain, woven mats, kapa motifs |
| Weapon effects | `js/combat.js` | layered ribbons, painterly fire, telegraphed timing |
| Island flora | `tools/build_assets.py` | the user's sprites on their native grid, one shared wind |
| Island ocean | `js/water.js` | depth bands, swells, rushing and draining tide, foam lace |
| Highlands terrain | `js/levels.js` | island materials reused per pixel; tall cliffs that dither into hazy parallax valleys |
| Highlands creatures | `js/enemies.js` | verlet vine body, flame corona with comet tail, carved masks on springy capes |
