# Kuleana: Stage 1 (the island outside)

Open `index.html` in a browser (Chrome, Edge, Safari or Firefox). No server or install is needed.

**Surge:** Stormcaller, Glowtide and Starfall have ultimates (Tempest, Glowing Maelstrom, The Heavens). Land 3 full combos
with the weapon to fill its Surge diamonds; the next combo finisher becomes the ultimate.

**Controls:** WASD/arrows move, Shift run, J or left-click attack (keep pressing to combo), Space/K or right-click dodge-roll, Q/R/wheel/1-9 switch weapon, E talk/use, M mute.

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

## Co-op
- Press **Esc** for Settings (or **C** to jump to its Co-op tab). One player picks **Host a game** and shares the
  5-letter code; the other types it and presses **Join**. Both of you need to be online.
- Connection: browser to browser over WebRTC. The free PeerJS broker (0.peerjs.com) only introduces the two players;
  after that, game data goes directly between you. The PeerJS library loads from unpkg the first time you host or join.
- The host runs the world (creatures, arenas, berries). Each of you moves and swings for yourself, and your
  partner's swings play out on your screen. Doors, gates and exits take you both.
- **Scaling:** with two heroes, each area has about 50% more creatures, each with 25% more health
  (`Level.COOP` in `js/levels.js`). Bot tests of the Sun Court arena put each player's damage taken close to solo.
- If you fall, you get back up beside your partner. If you both fall, the area starts over.

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
| `js/enemies.js` | Highlands creatures: AI, per-pixel bodies (verlet vine, flame wisp, carved tiki masks), projectiles |
| `js/audio.js` | Synthesised ambience and all sound effects (elemental weapon layers, harp, enemy voices) |
| `js/charart.js` | Hand-made hero (island warrior) + merchant pixel art |
| `js/net.js` | Co-op networking: host/join codes, connection (PeerJS over WebRTC) |
| `js/menu.js` | Settings menu: co-op, controls, sound, menu keys |
| `js/main.js` | Game loop, player, camera, HUD, dialogue, co-op sync |

Colour and style rules are in `STYLE.md`; edit ramps in `tools/palette.py` and run it to regenerate `js/palette.js`.

After changing anything in `docs/`, rebuild the assets with `python3 tools/build_assets.py`. This needs Pillow and numpy.
