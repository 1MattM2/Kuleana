# Kuleana roadmap (next stages)

Notes from the 2026-11-27 request. Co-op for 3, knockdown/revive, mobile controls and wave/boss scaling are done;
everything below is still to build.

## Performance: spot loading
- Levels are baked whole (per-pixel terrain for the entire map) the moment you enter. Split the bake into chunks
  (e.g. 512×512 px) and bake only those near the camera, filling the rest in idle time (`requestIdleCallback`).
- Pre-bake the next likely area in the background (e.g. the Highlands while you are in the sanctum).

## The Sun Gate map
- Talking to Kahu Lā opens a **globe / map**: pick a zone and level on it and he teleports you (the whole party).
- Zones hold several levels. Unlocked levels are pins on the globe.

## Zone 1: the Volcanic Highlands (3 levels)
1. **Level 1: the current Highlands** (Sun Court and Hollow of Kū).
2. **Level 2: the Canopy Passes.** Dense forest on top of the volcanic mountains, with huge bridge mountain passes
   where the fights happen.
   - New enemy: **bush snakes**, long and slithery and more dangerous than vine-lashers. They appear alongside the
     normal enemies.
   - **Stampedes and swarms** of geckos that you have to survive (a timed survival arena).
   - **Mini-boss: a multi-headed plant hydra**, a bigger vine creature with several heads. Use `boss: true` so it
     gets ×2/×3 HP with 2/3 heroes.
3. **Level 3: the Scorched Crown.** Scorched ground and a lot of sand, with plenty of the crystal decorations.
   - Lots of sun-wisps (fire guys).
   - New enemy: **fire-dancer tiki**, who swings and twirls a flaming fire-dance staff.
   - The geckos here are **fire geckos** that curl into mini fireballs and roll at you.
   - **Boss: the Bonfire Hive.** A flaming bonfire nest that wisps pour out of like a beehive. The wisps combine into
     one big fire spirit with a hive mind. Use `boss: true`.

## Hooks already in place
- `boss: true` on an enemy spec gives it HP × the number of heroes (`Enemies.bossScale`).
- With 3 heroes, every arena gains an extra mixed wave (`arenaWaves` in `js/levels.js`), and the extra creatures
  spawn spread out (`coopRoster`).
