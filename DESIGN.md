# Kuleana: progression and balance

How the journey is paced: what you earn where, how strong it is, what it costs, and how the world keeps up.
The numbers live in code (`js/gear.js`, `js/combat.js`, level defs); this is the plan they follow.

## The journey
Six zones of three levels each, then the final boss (its own level, not counted below).

| Zone | Lands | Elements met there | Weapon (1st land) | Armour (2nd land) | Rescue (3rd land) |
|---|---|---|---|---|---|
| 1 Volcanic Highlands | highlands, canopy, crown | tribal, fire, life | Newa (Shrine of Kū) | Kapa Wrap | Makani the trader (his stall) |
| 2 The Archipelago | isles, reef, vents | water, storm | Leiomano | Lauhala Vest | Kamaka the smith (the forge) |
| 3 (to come) | | glowing water | Koa Blade | Koa Bark Mail | a third islander |
| 4 (to come) | | blood | Makau Kaula | Niho Mano Coat | |
| 5 (to come) | | celestial | Pololū | ʻAhu ʻUla | |
| 6 (to come) | | stone | Koʻi | Obsidian Guard | |
| The end | | plasma (all) | Koʻi-Lua | Kea Cloth (plasma) | |

You start with the ʻIhe and the Pāhoa.

## Elemental weapons and cloth
Each element has a weapon and a cloth set, forged at Kamaka's from three of its shards. Shards drop (6%) from
creatures of that element, and the market starts selling each one around when it turns up in the world. So an
elemental weapon usually arrives about half a zone after you first meet its element:

| Element | Creatures | Weapon | Usually forged |
|---|---|---|---|
| Tribal | tiki spearmen, darters, brutes, fire-dancers | Kākau Bands | late Zone 1 |
| Fire | fire-dancers, fire geckos, wisps, the hive, thermal sharks | Ahi Staff | late Zone 1 |
| Life | vine-lashers, bush snakes, the hydra | Ola Maul | Zone 1 to 2 |
| Water | crabs, sharks, the spider crab | Tidecutter | Zone 2 |
| Storm | stingrays, the Storm Ray | Stormcaller | late Zone 2 |
| Glowing water | (Zone 3) | Glowtide | Zone 3 to 4 |
| Blood | (Zone 4) | Mako Fangs | Zone 4 to 5 |
| Celestial | (Zone 5) | Starfall | Zone 5 to 6 |
| Stone | (Zone 6) | Pele's Grip | Zone 6 |
| Plasma | none: every element at once | Koʻi-Lua | just before the end |

(The Ember Heel, a fire weapon, is a gift of Pele still waiting for its land.)

## Weapon power
Every weapon's damage is scaled (`POW` in `js/combat.js`) so its single-target damage per second fits when
you get it. The scale was set by measuring every weapon against a dummy (no crits, no momentum) and comes in
step with the creatures' health (`hpMul`: Zone 1 1.0, Zone 2 1.25 to 1.55, and on up to about 4.5 by Zone 6).

| When | Weapons | Damage/s (target) |
|---|---|---|
| Start | ʻIhe, Pāhoa | 48 |
| Zone 1 | Newa 54; Kākau, Ahi Staff 64; Ola Maul, Ember Heel 67 | |
| Zone 2 | Leiomano 64; Tidecutter, Stormcaller 74 | |
| Zone 3 | Koa Blade 77; Glowtide 86 | |
| Zone 4 | Makau Kaula 90; Mako Fangs 99 | |
| Zone 5 | Pololū 102; Starfall 115 | |
| Zone 6 | Koʻi 115; Pele's Grip 128 | |
| The end | Koʻi-Lua 168 (its super, the Twin Suns, about 780 to one target) | |

The chain sickle and Stormcaller are set a little under the line: their strength is reach and crowds, which
one dummy undersells.

Supers charge from the damage you deal (dummies count): three diamonds fill as you hit, and a full charge turns
the next combo finisher into the super. Each weapon sets the damage a full charge takes (about two to three
combos on one foe; faster in a crowd).

## The smith's tempering (Kamaka's forge, Temper tab)
For keeping a favourite weapon or suit with you. Ordinary weapons gain the most, so an early club can stay
useful late in the game.

- **Weapons:** +12% damage a level. Ordinary weapons take 5 levels (+60%), elemental weapons 2 (+24%). A
  +5 Newa (about 86 damage/s) keeps up with Zone 3 to 4 gear.
- **Battle suits:** +1 heart and +3% block a level, 3 levels. **Cloth:** +1 heart, 1 level.
- **Costs** climb through the journey's shards, so the top levels arrive with time:

| Level | Shells | Shards (ordinary weapon) |
|---|---|---|
| 1 | 2 clam, 1 limpet | 1 tribal |
| 2 | 2 auger, 1 cone | 2 tribal |
| 3 | 3 limpet, 1 triton | 2 storm |
| 4 | 3 clam, 1 miter, 1 helmet | 2 blood |
| 5 | 4 auger, 1 cone, 1 trumpet | 2 stone |

  Elemental weapons pay their own shards (2 a level). Suit levels cost 2 tribal, then 2 water, then 2 stone
  shards with shells; a cloth level, 2 of its element's shards plus a cone and a miter.

## Shells and the market
Shells are the only currency. Common is worth about 1, uncommon about 4, rare about 15.

**Earned per level** (first clear; repeat clears pay about half, and a quarter of the rare chance):

| | Level 1 | Level 2 | Level 3 |
|---|---|---|---|
| Zone 1 | 3 / 0 / 0 | 4 / 1 / 0 | 5 / 2 / 0 |
| Zone 2 | 5 / 2 / 0 | 6 / 2 / 40% | 7 / 3 / 1 |
| Zone 3 | 7 / 3 / 40% | 8 / 3 / 60% | 9 / 4 / 1 |
| Zone 4 | 9 / 4 / 60% | 10 / 4 / 80% | 11 / 5 / 1 + 30% |
| Zone 5 | 11 / 5 / 80% | 12 / 5 / 1 | 13 / 6 / 1 + 50% |
| Zone 6 | 13 / 6 / 1 | 14 / 6 / 1 + 30% | 15 / 7 / 2 |

(common / uncommon / rare.) Beaches add a few: the island's after each expedition, and three in each Archipelago land.

**Makani's market.** Always on the counter: the ʻŌhelo tonic (2 clams), the Noni salve (2 limpets, 1 cone) and
the bestiary (1 trumpet, 3 tritons). Everything else rotates each time you come home, drawn from a pool that
grows as you clear levels. There are 2 shards and 1 talisman to begin with, then 2 and 2 after 3 levels, then
3 and 2 after 9:

| Enters the pool at (levels cleared) | Shard | Talisman |
|---|---|---|
| 0 | tribal (3 clam, 2 auger) | |
| 1 | fire (3 limpet, 1 cone) | |
| 2 | life (3 auger, 1 triton) | Kū, tribal (3 clam, 1 cone) |
| 3 | water (3 clam, 1 miter) | Ahi, fire (2 auger, 1 cone) |
| 4 | storm (2 limpet, 1 cone, 1 miter) | Ola, life (2 auger, 1 triton) |
| 5 | | Kai, water (2 clam, 1 miter) |
| 6 | glowing water (3 auger, 1 triton, 1 miter) | Uila, storm (2 limpet, 1 miter) |
| 8 | | ʻŌlino, glowing water (3 limpet, 1 miter, 1 cone) |
| 9 | blood (4 clam, 2 cone, 1 triton) | |
| 11 | | Mako, blood (3 clam, 2 triton) |
| 12 | celestial (4 limpet, 2 miter, 1 helmet) | |
| 13 | | Hōkū, celestial (1 helmet, 1 cone) |
| 15 | stone (4 auger, 2 triton, 1 trumpet) | |
| 16 | | Pōhaku, stone (1 helmet, 2 triton) |
| 17 | | Lā, plasma: the Twin Suns (2 helmet, 1 trumpet) |

## The world keeps up
- **Creature health** rises by zone (`hpMul`), bosses get one health bar per hero.
- **Creature damage** rises from Zone 3: ×1.25, ×1.5, ×1.75, ×2 by Zone 6 (`Gear.ZONE_DMG`), so the extra
  hearts from later suits and tempering matter.
- **Co-op:** each extra hero adds about half as many creatures again, spread out, with +25% health (two heroes)
  or +40% (three); with three, an arena gains one more wave; bosses get a full health bar per hero. Tested with
  three connected heroes on the new levels (the frenzy and the Storm Ray stay in step on every screen).

## Hale Koa (the dojo)
The hut grows in phases. The materials that pay for each phase are still to be designed.
1. The hall: the weapon rack (the weapons you've earned), armour stands for every suit and cloth, training dummies.
2. The Duel Hall: partner duels (the only player-versus-player anywhere) and challengers among the freed islanders.
3. The Arena Wing's Creature Hall: call any creature you've met.
4. The Boss Hall: call any boss. Both halls flood (statue fountains) for sea creatures.

The test world (main menu) has all four phases and everything else.
