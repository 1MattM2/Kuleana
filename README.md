# Kuleana: Stage 1 (the island outside)

Open `index.html` in a browser (Chrome, Edge, Safari or Firefox). No server or install is needed.

**Surge:** Stormcaller, Glowtide and Starfall have ultimates (Tempest, Glowing Maelstrom, The Heavens). Land 3 full combos
with the weapon to fill its Surge diamonds; the next combo finisher becomes the ultimate.

**Controls:** WASD/arrows move, Shift run, J or left-click attack (keep pressing to combo), Space/K or right-click dodge-roll, Q/R/wheel/1-5 switch weapon, E talk/use, M mute.

**Title and saves:** the game opens on a title screen (Continue, New Game, Load Game, Settings) with three save slots. It autosaves when you arrive somewhere and every minute; Settings > Menu has Save game and Quit to title.

**Weapons:** every weapon you pick up (the dojo rack, Pele's shrine) is yours to keep. You carry up to **five**; the toolbar shows just those. If you own more than five, Kahu Lā asks you to choose your five before he sends you through the Sun Gate.

## What's here
- A walkable island built from the art in `docs/`, rendered as 32px-grid pixel art.
  - Ocean, beach, grass, lava rock and the carved glyph road use the textures cut from `hawaiian_outside_tileset`.
  - Palms, palm groves, taro, ferns and monstera come from `Trees_outside_decor` and `flora_outside_decor`; the
    hibiscus and plumeria bushes come from the tileset. Palms, taro and the flowering bushes get a hand-pixelled
    finish (rim light, shading, tinted outlines) and pre-rendered wind frames in `tools/build_assets.py`.
  - The bridge and the sun court are drawn in code using the colours and designs of the bridge tiles and `Solar_tileset`.
- Animation: waves roll in with white crests, foam washes up and back on the sand, the river flows,
  the water sparkles, plants and palms sway in wind gusts, leaves and petals blow past, and cloud shadows drift over.
- Two merchants at market stalls, crabs that scuttle away from you, butterflies, and a sealed temple gate
  (the dungeon entrance for a later stage).
- **Hale Koa, the training hut** (south of the market): walk in and test every weapon in the game on the training
  dummies. There are 17 melee weapons: Koa Blade, the Hawaiian ʻIhe, Pololū, Pāhoa, Newa, Leiomano and the Koʻi stone axe, Mako Fangs
  (slasher), Lava Maul (blunt), Ember Heel (painterly fire kicks), Stormcaller (clouds and lightning), Tidecutter and
  Glowtide (water and its bioluminescent variant), Starfall (celestial), Pele's Grip (stone, raising spikes from the
  ground), Kākau Bands (tribal symbol: tattoo sigils, niho bands and erupting totem pillars) and Makau Kaula
  (chain-sickle: short whips, orbits, a long throw and a widening spiral).
- **Ana ʻŌlino, the glowing sea cave**: walk into the opening in the south-east lava rock. The pool is a
  bioluminescent brush-stroke painting in the spirit of *The Starry Night* (strokes traced along swirling
  currents, light flowing along them). A whale shark and lemon sharks glide beneath as silhouettes, and the hero is
  a backlit silhouette too. Walk back up the tunnel to leave.

## The Sun Gate and the Volcanic Highlands
- The temple gate on the island leads into **the Sun Gate sanctum**, inside a dormant volcano. It has a sun plaza set
  in carved sandstone, stairs up both walls, a rope bridge over the volcano's dark throat, glowing crystals, braziers,
  sunlight shafts, and the great Sun Gate at the top. Talk to **Kahu Lā**, the keeper, to wake it. The sanctum is the
  hub; every area's sun gate brings you back here.
- **Volcanic Highlands** (the first expedition): ledges high above a jungle. Tall obsidian cliffs drop to real ground
  far below: a forest of the island's own palms, ferns, taro and hibiscus, hazed by the distance. Birds glide below
  you with their shadows on the canopy, mist drifts low, and gnats, butterflies and dragonflies fill the air. The route runs through an arrival court,
  a ledge, the **Sun Court** arena, a rope bridge to a crystal overlook, a ridge path, and **the Hollow of Kū**
  arena, ending at Pele's shrine (the Ember Heel) and a sun gate home.
- **Arenas:** stepping into one raises sun seals across its exits and the tribe leaps in, in waves. Clear them to
  open the way and get a few healing ʻōhelo berries (fallen enemies sometimes drop them too).
- **Enemies:** every attack has a pose, a gold spark and a sound before it lands.
  - The gecko and both tikis are the user's own sprites. The tikis' spear and blowpipe are cut from their sprites
    and rotated with RotSprite, so they can aim and thrust.
  - **Vine-Lasher:** hides as an ordinary island fern. It rises as a fern-green vine with a sun-crested head, then
    lashes, sweeps the ledge or spits thorn seeds. Hit it and it flinches and strikes back, or retreats underground
    and resurfaces somewhere else.
  - **Sun-Wisp:** a flame spirit with a comet tail. Its swoops get a short warning and can chain, it bursts in
    rings of fire, and its sparks home in. In pairs, wisps flank you, link a beam of light and sweep it across the
    ground to drive you into it.
  - **Tiki Spearman:** flanks with its tribe after a war cry. It lunges, jabs in threes and sweeps when you get
    behind it, and it **guards** blows from the front.
  - **Tiki Darter:** keeps its distance and shows its line of fire before it shoots. It volleys with other darters
    and lobs spore gourds; left alone, it fights up close.
- **Combat:** a dodge roll with invulnerability frames, *perfect dodge* slow-motion, and **Momentum**. Chain hits
  without getting hurt to fill it; tiers I–III make hits heavier and swings faster, and getting hit knocks it down.
  You start with the ʻIhe, Pāhoa and Newa; the dojo still lets you try everything.
- **Sound:** every sound is synthesised. The highlands has a jungle soundscape (cicadas, crickets, coquí frogs,
  birds, distant war drums). The sanctum breathes like a volcano: rumble, lava bubbling, steam, groaning stone, drips.
  - Elemental weapons carry their element through every swing: the Lava Maul and Ember Heel ignite and roar, the
    Tidecutter and Glowtide gush and bubble, and Starfall plays a plucked harp (Karplus-Strong strings).
  - Hits land with a distorted crunch and a sub-bass thud, and every enemy sounds like what it's made of.

## Co-op (up to 3 heroes)
- Press **Esc** for Settings (or **C** to jump to its Co-op tab). One player picks **Host a game** and shares the
  5-letter code; up to two others type it and press **Join**. Everyone needs to be online.
- Connection: browser to browser over WebRTC, as a star. Each guest talks only to the host, and the host passes on
  what each guest needs to know about the other. The free PeerJS broker (0.peerjs.com) only introduces players.
- The host runs the world (creatures, arenas, berries). Each hero moves and swings for themselves, and partners'
  swings play out on your screen. Doors, gates and exits take the whole party.
- Heroes are told apart by colour: the host wears red, the second hero gold and the third teal.
- **Scaling:** each extra hero adds about 50% more creatures, spawned spread out instead of in clumps. Creatures
  get +25% health with two heroes and +40% with three. With three heroes every arena gains an extra wave. Bosses and
  mini-bosses (`boss: true`) get ×2 or ×3 health instead.
- **Knocked down:** in co-op, falling knocks you down. A partner revives you by standing over you and holding
  **E** (**USE** on a phone) for 3 seconds, and you get up with half your hearts. If everyone falls, the area
  starts over.

## Phones and tablets
- On a touch screen the game shows touch controls (`js/touch.js`): a floating thumbstick on the left half (push it
  far to run) plus **ATK**, **ROLL**, **USE** (hold to revive) and **WPN** buttons, with **MENU** and **CO-OP** at
  the top right. Play in landscape.

## Zone 1: Kahu Lā's globe and three levels
- Talk to **Kahu Lā** in the sanctum to open his **globe**. Each zone is an island on it, and its levels are pins.
  Pick a level (W/S or tap), press E (or tap again) and he sends the whole party there. Finishing a level's last
  arena reveals the next one on the globe. Progress is remembered in the browser, and in co-op the host's
  progress counts.
- **Level 1: Volcanic Highlands** (as before).
- **Level 2: Canopy Passes.** Dense forest on the volcanic mountain tops, linked by wide rope-bridge passes.
  - **Bush snakes:** long, slithering and quick. They coil, then strike for two hearts.
  - **The Pass of Winds** arena.
  - **The Thundering Ridge:** survive a gecko **stampede**. Herds charge across from every side while swarms
    press in, against a countdown.
  - **The Garden of Many Heads:** the mini-boss **Lau-Poʻo**, a mound of leaves with three vine heads that lash
    and spit on their own. Wound it and it grows a fourth head, then a fifth.
- **Level 3: The Scorched Crown.** Ash-burnt sand, lava cracks far below, crystals everywhere.
  - **Fire-dancer tikis:** twirl a staff burning at both ends. They spin into you, sweep, and throw rings of
    fire.
  - **Fire geckos:** curl into fireballs, roll at you, and leave burning trails.
  - **Sun-wisps** in numbers.
  - **The boss, Kahu-Ahi, the Bonfire Hive:** a burning honeycomb nest that wisps pour out of, with flare
    volleys and heat bursts. At half health it calls every wisp home and rises as one giant fire spirit.
- Bosses and mini-bosses get a health bar across the top of the screen, and ×2 or ×3 health with 2 or 3 heroes.

## Performance
- Area ground is painted in 128px chunks on demand: what's on screen at once, the rest in spare frame time. Entering
  the Highlands went from about 1.1s to about 0.15s.
- Glows are cached sprites, and the canvas pixel ratio is capped at 2×.

## Sound
- Footsteps differ by surface: grass, dirt, sand, wood, tile/stone, and shallow water (ready for later areas).

## Progression, gear and the village
- **Weapons:** you start with the ʻIhe and Pāhoa. The first land of each zone gives a weapon (Zone 1: Newa from
  the Shrine of Kū; Zone 2: Leiomano). Planned: Koa Blade (Zone 3), Makau Kaula (4), Pololū (5), Koʻi (6).
  The dojo rack lends any weapon for practice only.
- **Specials:** elemental weapons build up by landing combo finishers, then unleash a special: Kākau (The
  Awakening), Stormcaller (Tempest), Glowtide (Glowing Maelstrom), Starfall (The Heavens), Ahi Staff (Wheel of
  Pele), Ember Heel (Pele's Stride), Lava Maul (Eruption), Tidecutter (Riptide), Mako Fangs (Blood Frenzy),
  Pele's Grip (Earthshaker).
- **Shards:** creatures sometimes drop a shard of their element (fire: fire-dancers, fire geckos; magma: wisps;
  water: sharks; storm: rays; tribal: spear, dart, brute tikis). Three make that element's weapon or cloth set
  at Kamaka's forge.
- **Armour:** one worn at a time. Six battle suits (one from each zone's second land), nine elemental cloth sets
  (from shards). Each changes your stats and the colour of your vest.
- **Shells and gold:** shells are the currency (common: clam, lance auger, Hawaiian limpet; uncommon: leopard
  cone, Nicobar triton, episcopal miter; rare: horned helmet, triton's trumpet). They drop now and then; bosses
  carry rare ones; they wash up on beaches. The island's beach brings a new lot only after an expedition (at
  least halfway through a level): bare 35% of the time, otherwise 1-5 shells (70% common, 25% uncommon, 5% rare).
  Gold drops from creatures and is saved for building the village.
- **The village:** each zone's third land rescues someone. Zone 1: Makani the trader reopens his stall. Zone 2:
  Kamaka the smith raises his forge. More plots wait for later buildings.
- **Makani's trades:** heals and the bestiary always; two shards and two talismans that change each time you come
  home. A common shell is worth about 1, an uncommon about 6, a rare about 25.
- **Battle prep:** before Kahu Lā sends you, choose up to five weapons, the armour to wear, and two items to
  pack (each heal or talisman takes a slot). In battle, only packed items can be used: H heals, T unleashes a
  talisman (its element's special, grander), Y picks which.
- **Inventory (I):** weapons in hand and owned, armour, gold, shells, shards and items. The HUD shows your gold
  and total shells under your hearts. Settings has Gear and Bestiary tabs.

## Settings and controls
- **Esc** opens Settings (it pauses solo play). Tabs: Co-op, Controls (every gameplay control), Sound (volume and
  mute) and Menu (how to work the menu: Tab or ← → to switch tabs, Esc to close).
- Dialogue: pressing E while a line is still being written shows the whole line; the next press moves on.

## Project layout
| Path | Purpose |
|---|---|
| `tools/build_assets.py` | Slices `docs/` art into game sprites/textures → `assets/*.png` + `js/assets_data.js` |
| `js/world.js` | Island layout (coast, river, cliffs, road) and per-pixel ground baking, collision, minimap |
| `js/water.js` | Animated water shader (depth bands, swells, foam, swash, river flow) |
| `js/props.js` | Placement of trees/plants/rocks, procedural stalls/temple/tikis, wind sway |
| `js/cave.js` | The sea cave: layout, stroke-painted bioluminescent pool, sharks, ripples |
| `js/combat.js` | Every melee weapon, combo strings, hit detection, slash effects, hit-stop, shake |
| `js/dojo.js` | Hale Koa training hut interior, weapon rack, training dummies |
| `js/palette.js` | The master palette (generated by `tools/palette.py`; see `STYLE.md`) |
| `js/ruins.js` | Sun Gate ruin art: gates with flow-field sun discs, crystals, braziers, columns, shrine, Kahu Lā, sun seals |
| `js/levels.js` | Sanctum + Highlands: per-pixel terrain (island materials), cliffs, valley parallax, props, arenas, berries |
| `js/gear.js` | Shards, armour and cloth, shells and gold, the shop's trades, items and the battle pack, the village |
| `js/forge.js` | Kamaka's forge: the island building, its interior, the smith |
| `js/sea.js` | Zone 2 water terrain, shore art, corals, thermal vents |
| `js/enemies3.js` | Zone 2 creatures and bosses |
| `js/zone2.js` | Zone 2 level definitions |
| `js/title.js` | Title screen and save slots |
| `js/enemies2.js` | Zone 1 levels 2–3 creatures: bush snake, stampede runner, fire gecko, fire-dancer, the hydra and the Bonfire Hive |
| `js/enemies.js` | Highlands creatures: AI, per-pixel bodies (verlet vine, flame wisp, carved tiki masks), projectiles |
| `js/audio.js` | Synthesised ambience and all sound effects (elemental weapon layers, harp, enemy voices) |
| `js/charart.js` | Hand-made hero (island warrior) + merchant pixel art |
| `js/net.js` | Co-op networking: host/join codes, up to 3 heroes (PeerJS over WebRTC, host relays) |
| `js/touch.js` | Touch controls for phones/tablets: thumbstick and action buttons |
| `js/menu.js` | Settings menu: co-op, controls, sound, menu keys |
| `js/main.js` | Game loop, player, camera, HUD, dialogue, co-op sync |

Colour and style rules are in `STYLE.md`; edit ramps in `tools/palette.py` and run it to regenerate `js/palette.js`.

After changing anything in `docs/`, rebuild the assets with `python3 tools/build_assets.py`. This needs Pillow and numpy.

Planned next stages (zones, the Sun Gate map, new levels and bosses, spot loading) are in `ROADMAP.md`.
