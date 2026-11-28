// Gear: elemental shards, armour and cloth sets, the forge's recipes, and the village.
//
// Shards: creatures of an element sometimes drop a shard of it (somewhat rare). Three shards of an
// element can be forged into that element's weapon, or woven into its cloth set, at Kamaka's forge.
//
// Armour: one suit is worn at a time (Settings > Gear, or the armour stand in the forge).
//   - Six suits of battle armour, one won at the end of each zone, each a step up for its stage.
//   - Nine elemental cloth sets (three shards each), lighter, each with its element's gift.
//
// Village: buildings on the island, on staked plots. Rescuing someone can raise one (the smith raises
// the forge); later, buildings will be built by the player.
(function () {
  const Gear = (window.Gear = {});

  // ---------------------------------------------------------------- elements
  Gear.ELEMENTS = {
    tribal: { name: "Tribal", col: "#f2b45e", glow: "242,180,94", weapon: "kakau", cloth: "cloth_tribal" },
    fire: { name: "Fire", col: "#ff8a3a", glow: "255,138,58", weapon: "firestaff", cloth: "cloth_fire" },
    water: { name: "Water", col: "#5ab8ff", glow: "90,184,255", weapon: "tide", cloth: "cloth_water" },
    glow: { name: "Glowing water", col: "#5af2e8", glow: "90,242,232", weapon: "glowtide", cloth: "cloth_glow" },
    blood: { name: "Blood", col: "#ff5a6a", glow: "255,90,106", weapon: "fangs", cloth: "cloth_blood" },
    storm: { name: "Storm", col: "#a8c4ff", glow: "168,196,255", weapon: "storm", cloth: "cloth_storm" },
    celestial: { name: "Celestial", col: "#c8b4ff", glow: "200,180,255", weapon: "starfall", cloth: "cloth_celestial" },
    life: { name: "Life", col: "#7ad860", glow: "122,216,96", weapon: "maul", cloth: "cloth_life" },
    earth: { name: "Stone", col: "#d8c49a", glow: "216,196,154", weapon: "stone", cloth: "cloth_earth" },
    // plasma is every element at once: no creature carries it and it has no shard (see Gear.ORDER)
    plasma: { name: "Plasma", col: "#f4f6ff", glow: "255,255,255", weapon: "lua", cloth: "cloth_plasma" },
  };
  Gear.ORDER = ["tribal", "fire", "life", "water", "storm", "glow", "blood", "celestial", "earth"];
  // which creatures carry which element (more classes arrive with later lands)
  Gear.ELEMENT_OF = { firedancer: "fire", firegecko: "fire", wisp: "fire", hive: "fire", vine: "life", hydra: "life", snake: "life", gecko: "earth", runner: "earth",
    crab: "water", spitcrab: "water", shark: "water", bigshark: "water", spidercrab: "water", tshark: "fire", ray: "storm", giantray: "storm", pueo: "earth", spear: "tribal", dart: "tribal", brute: "tribal" };
  Gear.DROP = 0.06;              // a shard is a lucky find, not a given
  Gear.dropChance = () => Gear.DROP * (S.charms.luck ? 2 : 1);
  Gear.WEAPON_EL = {};
  for (const [k, e] of Object.entries(Gear.ELEMENTS)) Gear.WEAPON_EL[e.weapon] = k;
  Gear.WEAPON_EL.heel = "fire";

  // ---------------------------------------------------------------- armour
  // stats: hp (extra hit points, 2 per heart), block (chance to turn a blow aside), speed, rollCd
  // (roll cooldown multiplier), kb (knockback multiplier), crit, el / elMul (bonus for that element's
  // weapons), momMul, startMom, regen (seconds per heal), lifesteal (hits per heal), chain (storm arc
  // chance), waterWalk, immune (hazards it ignores), fireSoak (fire blows deal 1 less).
  // pal: the vest's colours on the hero.
  Gear.ARMOR = {
    kapa: { name: "Kapa Wrap", tier: 1, src: "Zone 1, second land", desc: "Layers of beaten bark-cloth.", hp: 2, pal: { v: [196, 170, 130], V: [140, 110, 80], l: [232, 216, 184] } },
    lauhala: { name: "Lauhala Vest", tier: 2, src: "Zone 2, second land", desc: "Tight-woven pandanus turns a glancing blow.", hp: 2, block: 0.12, pal: { v: [190, 150, 90], V: [128, 94, 54], l: [228, 198, 132] } },
    koabark: { name: "Koa Bark Mail", tier: 3, src: "Zone 3, second land", desc: "Plates of koa bark: hard to knock down.", hp: 4, kb: 0.5, pal: { v: [130, 84, 52], V: [84, 50, 30], l: [176, 120, 76] } },
    niho: { name: "Niho Mano Coat", tier: 4, src: "Zone 4, second land", desc: "Shark-tooth scales: bite back harder.", hp: 4, block: 0.12, dmgAll: 0.1, pal: { v: [200, 204, 206], V: [120, 126, 132], l: [244, 244, 238] } },
    ahuula: { name: "ʻAhu ʻUla", tier: 5, src: "Zone 5, second land", desc: "A feather cloak of chiefs: swift and sure.", hp: 4, speed: 1.12, rollCd: 0.8, momMul: 1.15, pal: { v: [214, 60, 40], V: [150, 36, 30], l: [250, 200, 80] } },
    obsidian: { name: "Obsidian Guard", tier: 6, src: "Zone 6, second land", desc: "Volcanic glass, ground smooth and bound.", hp: 6, block: 0.2, hazardHalf: 1, pal: { v: [56, 50, 66], V: [30, 26, 38], l: [124, 112, 146] } },
    cloth_tribal: { name: "Kākau Cloth", el: "tribal", desc: "Momentum builds fast and you start every land fired up.", hp: 2, elMul: 1.2, momMul: 1.35, startMom: 34, pal: { v: [62, 42, 32], V: [32, 22, 18], l: [242, 172, 92] } },
    cloth_fire: { name: "Ahi Cloth", el: "fire", desc: "Burning ground and steam can't touch you.", hp: 2, elMul: 1.2, immune: ["flames", "steam", "boil", "fireball"], pal: { v: [230, 92, 32], V: [160, 50, 20], l: [255, 192, 82] } },
    cloth_water: { name: "Kai Cloth", el: "water", desc: "Wade through water as if it were dry sand.", hp: 2, elMul: 1.2, waterWalk: 1, pal: { v: [40, 112, 200], V: [24, 70, 140], l: [142, 212, 255] } },
    cloth_glow: { name: "Glowtide Cloth", el: "glow", desc: "The sea's glow mends you, a heart-half every few breaths.", hp: 2, elMul: 1.2, regen: 9, pal: { v: [60, 60, 172], V: [36, 30, 110], l: [92, 240, 230] } },
    cloth_blood: { name: "Mako Cloth", el: "blood", desc: "Every dozen blows you land heals you.", hp: 2, elMul: 1.2, lifesteal: 12, pal: { v: [160, 30, 44], V: [100, 16, 30], l: [255, 112, 122] } },
    cloth_storm: { name: "Uila Cloth", el: "storm", desc: "Your blows arc lightning to another foe; shocks can't hurt you.", hp: 2, elMul: 1.2, chain: 0.18, immune: ["zap", "bolt"], pal: { v: [70, 80, 142], V: [40, 46, 90], l: [202, 222, 255] } },
    cloth_celestial: { name: "Hōkū Cloth", el: "celestial", desc: "Starlight finds the weak spot: more critical hits.", hp: 2, elMul: 1.2, crit: 0.1, pal: { v: [70, 50, 140], V: [40, 28, 90], l: [242, 222, 142] } },
    cloth_life: { name: "Ola Cloth", el: "life", desc: "Woven with living fern: heals and berries mend you twice as much.", hp: 2, elMul: 1.2, healMul: 2, pal: { v: [58, 120, 44], V: [30, 70, 24], l: [168, 230, 112] } },
    cloth_earth: { name: "Pōhaku Cloth", el: "earth", desc: "Rooted like stone: nothing knocks you back.", hp: 4, elMul: 1.2, kb: 0, pal: { v: [122, 106, 88], V: [80, 68, 56], l: [202, 186, 152] } },
    // the plasma cloth: white, edged in every element's colour, and a little of every gift at once; you leave a trail of white light
    cloth_plasma: { name: "Kea Cloth", el: "plasma", desc: "White as the noon sun. A little of every gift: keen strikes, arcing shocks, mending, and fire and storm can't touch you.", hp: 4, elMul: 1.25, crit: 0.06, chain: 0.08, regen: 16, lifesteal: 18, speed: 1.05, immune: ["zap", "bolt", "flames", "steam", "boil"], trail: 1, pal: { v: [238, 240, 250], V: [176, 182, 206], l: [255, 255, 255] } },
  };
  Gear.NORMAL = ["kapa", "lauhala", "koabark", "niho", "ahuula", "obsidian"];
  const FIRE_SRC = /flame|fire|boil|steam|hive|wisp|mote|pulse|ember|talons|feather|rock|geyser/;

  // ---------------------------------------------------------------- shells: the island's money
  // Common shells wash up on every beach and fall from creatures now and then; uncommon ones are
  // scarcer; the rare ones come from the great beasts (bosses).
  Gear.SHELLS = {
    clam: { name: "Clam shell", tier: 0 }, auger: { name: "Lance auger", tier: 0 }, limpet: { name: "Hawaiian limpet", tier: 0 },
    cone: { name: "Leopard cone", tier: 1 }, triton: { name: "Nicobar triton", tier: 1 }, miter: { name: "Episcopal miter", tier: 1 },
    helmet: { name: "Horned helmet", tier: 2 }, trumpet: { name: "Triton's trumpet", tier: 2 },
  };
  Gear.TIER_NAME = ["common", "uncommon", "rare"];
  Gear.randomShell = (tier) => { const ks = Object.keys(Gear.SHELLS).filter((k) => Gear.SHELLS[k].tier === tier); return ks[(Math.random() * ks.length) | 0]; };
  // each shell drawn small and true to life (cached)
  const shellCache = {};
  Gear.shellArt = (k) => {
    if (shellCache[k]) return shellCache[k];
    const [c, x] = K.canvas(13, 13), P = (px, py, col) => { x.fillStyle = col; x.fillRect(px, py, 1, 1); };
    const O = "#2a1c18";
    if (k === "clam") { for (let y = 0; y < 9; y++) for (let xx = -6; xx <= 6; xx++) { const r = Math.hypot(xx, 9 - y); if (r > 7.5 || y > 8) continue; const rib = Math.round(Math.atan2(9 - y, xx) * 4) % 2; P(6 + xx, 2 + y, r > 6.6 ? O : rib ? "#e8b8a8" : "#f8e4d4"); } for (let xx = 3; xx <= 9; xx++) P(xx, 11, "#c89888"); }
    else if (k === "auger") { for (let s = 0; s < 12; s++) { const w = Math.max(0, 2.6 - s * 0.2); for (let o = -w; o <= w; o++) P(Math.round(2 + s * 0.75 + o * 0.6), Math.round(11 - s * 0.85 + o * 0.6), Math.abs(o) >= w - 0.5 ? O : (s % 3 === 0 ? "#8a5a3a" : "#f2e2c8")); } }
    else if (k === "limpet") { for (let y = 0; y < 13; y++) for (let xx = 0; xx < 13; xx++) { const dx = xx - 6, dy = (y - 7) * 1.3, r = Math.hypot(dx, dy); if (r > 5.6) continue; const ray = Math.round(Math.atan2(dy, dx) * 3) % 2; P(xx, y, r > 4.9 ? O : r < 1.2 ? "#f4ece0" : ray ? "#7a7a70" : "#c8c0b0"); } }
    else if (k === "cone") { for (let y = 0; y < 12; y++) { const w = y < 3 ? 2 + y * 1.3 : 6 - (y - 3) * 0.6; for (let xx = -Math.round(w); xx <= Math.round(w); xx++) P(6 + xx, y, Math.abs(xx) >= Math.round(w) ? O : K.hash2(xx + 9, y, 5) > 0.72 ? "#5a3820" : "#f4efe4"); } }
    else if (k === "triton") { for (let y = 0; y < 13; y++) { const w = 1 + Math.sin((y / 12) * Math.PI) * 4.5; for (let xx = -Math.round(w); xx <= Math.round(w); xx++) P(6 + xx, y, Math.abs(xx) >= Math.round(w) ? O : y % 4 === 0 ? "#f2d8a8" : xx < 0 ? "#c87a3a" : "#9a5428"); if (y % 4 === 1) { P(6 - Math.round(w) - 1, y, "#e8c890"); P(6 + Math.round(w) + 1, y, "#e8c890"); } } }
    else if (k === "miter") { for (let y = 0; y < 13; y++) { const w = y < 8 ? 0.5 + y * 0.45 : 4 - (y - 8) * 0.7; for (let xx = -Math.round(w); xx <= Math.round(w); xx++) P(6 + xx, y, Math.abs(xx) >= Math.round(w) ? O : (xx + y) % 3 === 0 && y % 2 ? "#d84a2a" : "#f6f0e6"); } }
    else if (k === "helmet") { for (let y = 0; y < 13; y++) for (let xx = 0; xx < 13; xx++) { const dx = xx - 6, dy = y - 7, r = Math.hypot(dx, dy * 1.1); if (r > 6) continue; P(xx, y, r > 5.3 ? O : dx > 1 && dy > 0 ? "#e89a5a" : r < 2.4 ? "#f4e6c8" : (xx + y) % 4 === 0 ? "#8a5a34" : "#d8b888"); } for (const hx of [2, 6, 10]) { P(hx, 1, "#f4e6c8"); P(hx, 2, "#c8a070"); } }
    else if (k === "trumpet") { for (let s = 0; s < 13; s++) { const w = Math.max(0.5, 3.4 - s * 0.22); for (let o = -w; o <= w; o += 1) P(Math.round(1 + s * 0.85 + o * 0.5), Math.round(11 - s * 0.7 + o * 0.85), Math.abs(o) >= w - 0.5 ? O : (s + Math.round(o)) % 3 === 0 ? "#6a3418" : "#f2d6a0"); } P(2, 11, "#f08a4a"); P(3, 12, "#f08a4a"); }
    shellCache[k] = c; return c;
  };

  // ---------------------------------------------------------------- Makani's trades
  // Prices: a common shell is worth about 1, an uncommon about 4, a rare about 15 (a level pays a handful). Heals to carry (H), elemental shards, talismans (one-use elemental super attacks, T to
  // unleash, Y to choose which), and the bestiary. Prices climb with what an item is worth: everyday
  // things cost common shells, strong ones want an uncommon shell too, the best a rare one.
  Gear.TALISMANS = {
    // each unleashes its element's weapon special, grander: wider (where the special is small) and harder
    t_fire: { name: "Ahi talisman", el: "fire", weapon: "firestaff", r: 1.5, desc: "Unleashes the Wheel of Pele, grander." },
    t_storm: { name: "Uila talisman", el: "storm", weapon: "storm", r: 1, desc: "Unleashes the Tempest (already vast), harder." },
    t_water: { name: "Kai talisman", el: "water", weapon: "tide", r: 1.5, desc: "Unleashes the Riptide, grander." },
    t_life: { name: "Ola talisman", el: "life", weapon: "maul", r: 1.5, desc: "Unleashes the Wildwood, grander." },
    t_tribal: { name: "Kū talisman", el: "tribal", weapon: "kakau", r: 1.3, desc: "Unleashes the Awakening, grander." },
    t_star: { name: "Hōkū talisman", el: "celestial", weapon: "starfall", r: 1.2, desc: "Unleashes the Heavens, grander." },
    t_glow: { name: "ʻŌlino talisman", el: "glow", weapon: "glowtide", r: 1.3, desc: "Unleashes the Glowing Maelstrom, grander." },
    t_blood: { name: "Mako talisman", el: "blood", weapon: "fangs", r: 1.3, desc: "Unleashes the Blood Frenzy, grander." },
    t_earth: { name: "Pōhaku talisman", el: "earth", weapon: "stone", r: 1.3, desc: "Unleashes the Earthshaker, grander." },
    t_plasma: { name: "Lā talisman", el: "plasma", weapon: "lua", r: 1.25, desc: "Unleashes Nā Lā Māhoe, the Twin Suns, grander." },
  };
  // Makani's market. Three things are always on the counter (the two heals and the bestiary); the rest is
  // a rotating stock drawn from a pool that grows as you clear levels (`from` = levels cleared, of the 18 in
  // the six zones; the final boss isn't counted). Every elemental shard and talisman enters the pool around
  // when its element starts turning up in the world, so the market fills gaps rather than racing ahead.
  //   cleared  0  1  2  3  4  5  6  ...  9  ...  12  ...  15  ...  17
  //   shards   tribal fire life water storm .. glow .. blood .. celestial .. earth
  //   talisman tribal(2) fire(3) life(4) water(5) storm(6) glow(8) blood(11) star(13) earth(16) plasma(17)
  // Prices: common shell ~1, uncommon ~4, rare ~15. An early shard is about a level's earnings; a late one,
  // in a land that pays more, still about one level's. Rotating slots: 2 shards + 1 talisman, then 2 + 2
  // once 3 levels are cleared, then 3 + 2 from 9 cleared.
  Gear.SHOP = [
    { id: "tonic", kind: "heal", name: "ʻŌhelo tonic", desc: "Heals two hearts. Carry up to 5 (H to drink).", cap: 5, cost: { clam: 2 } },
    { id: "salve", kind: "heal", name: "Noni salve", desc: "Heals you fully. Carry up to 3.", cap: 3, cost: { limpet: 2, cone: 1 } },
    { id: "book", kind: "book", name: "Moʻolelo of Beasts", desc: "A bestiary: what every creature is, and how it fights. (Settings > Bestiary)", cost: { trumpet: 1, triton: 3 } },
    { id: "shard_tribal", kind: "shard", el: "tribal", from: 0, name: "Tribal shard", desc: "Chipped from a tiki's mask.", cost: { clam: 3, auger: 2 } },
    { id: "shard_fire", kind: "shard", el: "fire", from: 1, name: "Fire shard", desc: "Still warm in the hand.", cost: { limpet: 3, cone: 1 } },
    { id: "shard_life", kind: "shard", el: "life", from: 2, name: "Life shard", desc: "A seed of green light.", cost: { auger: 3, triton: 1 } },
    { id: "shard_water", kind: "shard", el: "water", from: 3, name: "Water shard", desc: "Cool, with the sea inside it.", cost: { clam: 3, miter: 1 } },
    { id: "shard_storm", kind: "shard", el: "storm", from: 4, name: "Storm shard", desc: "It hums against your palm.", cost: { limpet: 2, cone: 1, miter: 1 } },
    { id: "shard_glow", kind: "shard", el: "glow", from: 6, name: "Glowing-water shard", desc: "It lights your hand from inside.", cost: { auger: 3, triton: 1, miter: 1 } },
    { id: "shard_blood", kind: "shard", el: "blood", from: 9, name: "Blood shard", desc: "Dark red, and warm, like something alive.", cost: { clam: 4, cone: 2, triton: 1 } },
    { id: "shard_celestial", kind: "shard", el: "celestial", from: 12, name: "Celestial shard", desc: "A sliver of night sky with a star in it.", cost: { limpet: 4, miter: 2, helmet: 1 } },
    { id: "shard_earth", kind: "shard", el: "earth", from: 15, name: "Stone shard", desc: "Heavy as the mountain it came from.", cost: { auger: 4, triton: 2, trumpet: 1 } },
    { id: "t_tribal", kind: "talisman", from: 2, cap: 3, cost: { clam: 3, cone: 1 } },
    { id: "t_fire", kind: "talisman", from: 3, cap: 3, cost: { auger: 2, cone: 1 } },
    { id: "t_life", kind: "talisman", from: 4, cap: 3, cost: { auger: 2, triton: 1 } },
    { id: "t_water", kind: "talisman", from: 5, cap: 3, cost: { clam: 2, miter: 1 } },
    { id: "t_storm", kind: "talisman", from: 6, cap: 3, cost: { limpet: 2, miter: 1 } },
    { id: "t_glow", kind: "talisman", from: 8, cap: 3, cost: { limpet: 3, miter: 1, cone: 1 } },
    { id: "t_blood", kind: "talisman", from: 11, cap: 3, cost: { clam: 3, triton: 2 } },
    { id: "t_star", kind: "talisman", from: 13, cap: 2, cost: { helmet: 1, cone: 1 } },
    { id: "t_earth", kind: "talisman", from: 16, cap: 2, cost: { helmet: 1, triton: 2 } },
    { id: "t_plasma", kind: "talisman", from: 17, cap: 1, cost: { helmet: 2, trumpet: 1 } },
  ];
  for (const it of Gear.SHOP) if (it.kind === "talisman") Object.assign(it, { name: Gear.TALISMANS[it.id].name, desc: Gear.TALISMANS[it.id].desc + " One use (T)." });
  Gear.FIXED = ["tonic", "salve", "book"];
  // how far the journey has come: levels cleared, of the eighteen (everything, in the test world)
  Gear.progress = () => (Gear.infinite ? 18 : window.Level && Level.ZONES ? Level.ZONES.reduce((n, z) => n + z.levels.filter((l) => Level.cleared.has(l)).length, 0) : 0);
  Gear.rerollStock = () => {
    const pr = Gear.progress(), pool = Gear.SHOP.filter((it) => !Gear.FIXED.includes(it.id) && (it.from || 0) <= pr);
    const shards = pool.filter((it) => it.kind === "shard"), tal = pool.filter((it) => it.kind === "talisman");
    const ns = pr >= 9 ? 3 : 2, nt = pr >= 3 ? 2 : 1;
    // the newest arrivals are a little likelier to be on the counter
    const pick = (a, n) => a.map((it) => ({ it, w: Math.random() * (1 + ((it.from || 0) >= pr - 3 ? 0.6 : 0)) })).sort((x, y) => y.w - x.w).slice(0, n).map((q) => q.it.id);
    S.stock = pick(shards, ns).concat(pick(tal, nt));
  };
  Gear.shopList = () => { if (!S.stock || !S.stock.length) Gear.rerollStock(); return Gear.SHOP.filter((it) => Gear.FIXED.includes(it.id) || S.stock.includes(it.id)); };
  Gear.soldOut = (it) => (it.kind === "book" ? S.book : it.cap ? (S.items[it.id] || 0) >= it.cap : false);
  Gear.canBuy = (it) => !Gear.soldOut(it) && (Gear.infinite || Object.entries(it.cost).every(([k, n]) => S.shells[k] >= n));
  Gear.buy = (it) => {
    if (!Gear.canBuy(it)) return false;
    if (!Gear.infinite) for (const [k, n] of Object.entries(it.cost)) S.shells[k] -= n;
    if (it.kind === "shard") S.shards[it.el]++; else if (it.kind === "book") S.book = true; else { S.items[it.id] = (S.items[it.id] || 0) + 1; if (it.kind === "talisman") S.pick = it.id; }
    Gear.changed(); return true;
  };
  Gear.shellTotal = () => Object.values(S.shells).reduce((a, b) => a + b, 0);
  // Shells are earned by finishing a level (and found on beaches). [common, uncommon, rare chance]
  // [common, uncommon, rare] for a first clear, by zone and level (a rare under 1 is a chance; 1.5 = one,
  // and an even chance of a second). Zones 3-6 are set out here ahead of their lands.
  Gear.PAY = [
    [[3, 0, 0], [4, 1, 0], [5, 2, 0]],
    [[5, 2, 0], [6, 2, 0.4], [7, 3, 1]],
    [[7, 3, 0.4], [8, 3, 0.6], [9, 4, 1]],
    [[9, 4, 0.6], [10, 4, 0.8], [11, 5, 1.3]],
    [[11, 5, 0.8], [12, 5, 1], [13, 6, 1.5]],
    [[13, 6, 1], [14, 6, 1.3], [15, 7, 2]],
  ];
  Gear.payout = (name) => {
    const D2 = window.Level && Level.DEFS[name], P = D2 && D2.zone && Gear.PAY[D2.zone - 1] && Gear.PAY[D2.zone - 1][D2.level - 1]; if (!P) return null;
    const first = !S.clears[name]; S.clears[name] = (S.clears[name] || 0) + 1;
    const rr = first ? P[2] : P[2] * 0.25, nc = first ? P[0] : Math.max(1, Math.floor(P[0] / 2)), nu = first ? P[1] : Math.floor(P[1] / 2), rare = Math.floor(rr) + (Math.random() < rr % 1 ? 1 : 0);
    const got = [];
    for (let i = 0; i < nc; i++) got.push(Gear.randomShell(0));
    for (let i = 0; i < nu; i++) got.push(Gear.randomShell(1));
    for (let i = 0; i < rare; i++) got.push(Gear.randomShell(2));
    for (const k of got) S.shells[k]++;
    Gear.changed();
    return { got, first, nc, nu, rare };
  };
  Gear.addShell = (k, n) => { if (!Gear.SHELLS[k]) return; S.shells[k] += n || 1; Gear.changed(); };
  Gear.count = (id) => S.items[id] || 0;
  Gear.PACK = 2;
  Gear.PERISH = () => ["tonic", "salve"].concat(Object.keys(Gear.TALISMANS));
  Gear.pack = () => S.pack;
  Gear.packFree = (id) => Gear.count(id) - S.pack.filter((q) => q === id).length;   // units not already packed
  Gear.packAdd = (id) => { if (S.pack.length >= Gear.PACK || Gear.packFree(id) <= 0) return false; S.pack.push(id); Gear.changed(); return true; };
  Gear.packRemove = (i) => { S.pack.splice(i, 1); Gear.changed(); };
  // keep the pack honest, and fill empty slots (heals first) when nobody chose
  Gear.packTidy = (fill) => { const want = {}; S.pack = S.pack.filter((id) => { want[id] = (want[id] || 0) + 1; return want[id] <= Gear.count(id); }); if (fill) for (const id of Gear.PERISH()) while (S.pack.length < Gear.PACK && Gear.packFree(id) > 0) S.pack.push(id); };
  Gear.units = () => Gear.PERISH().reduce((n, id) => n + Gear.count(id), 0);
  // in battle only what's packed can be used; elsewhere, anything you carry
  Gear.battle = false;
  Gear.infinite = false;   // the test world: consumables never run out, and the market asks nothing
  const takeFrom = (id) => { if (Gear.infinite) return S.items[id] > 0 && (!Gear.battle || S.pack.includes(id)); if (!S.items[id]) return false; if (Gear.battle) { const i = S.pack.indexOf(id); if (i < 0) return false; S.pack.splice(i, 1); } S.items[id]--; return true; };
  const usable = (id) => S.items[id] > 0 && (!Gear.battle || S.pack.includes(id));
  // drink a heal: the tonic first, the salve if there's no tonic or you're nearly out
  Gear.takeHeal = (hp, max) => { const useSalve = usable("salve") && (!usable("tonic") || hp <= 2 || max - hp > 6); const id = useSalve ? "salve" : usable("tonic") ? "tonic" : null; if (!id || !takeFrom(id)) return 0; Gear.changed(); return id === "salve" ? max : 4; };
  // the talisman in hand, and choosing another
  Gear.pick = () => { if (S.pick && usable(S.pick)) return S.pick; const k = Object.keys(Gear.TALISMANS).find((q) => usable(q)); S.pick = k || null; return S.pick; };
  Gear.nextPick = () => { const ks = Object.keys(Gear.TALISMANS).filter((q) => usable(q)); if (!ks.length) return null; S.pick = ks[(ks.indexOf(S.pick) + 1) % ks.length]; Gear.changed(); return S.pick; };
  Gear.spend = (id) => { if (!takeFrom(id)) return false; Gear.changed(); return true; };
  Gear.hasHeal = () => usable("tonic") || usable("salve");
  // the bestiary: who you've met, and how many you've beaten
  Gear.noteKill = (type) => { S.kills[type] = (S.kills[type] || 0) + 1; };
  Gear.hasBook = () => !!S.book;
  Gear.BEASTS = {
    gecko: ["Sun-crested gecko", "fire", "Darts in bursts, flares its crest, and lunges. Strike as it recovers."],
    vine: ["Vine-lasher", "earth", "Hides as a fern; lashes, sweeps, and spits thorn seeds, then tunnels away."],
    wisp: ["Sun-wisp", "fire", "A flame spirit: traced swoops, rings of fire, homing sparks; pairs sweep a beam."],
    spear: ["Tiki spearman", "tribal", "War-cries, lunges, jabs in threes. Guards from the front: get behind it."],
    dart: ["Tiki darter", "tribal", "Keeps away and shows its line of fire. Close the gap."],
    snake: ["Bush snake", "earth", "Slithers fast, coils, and lunges far for two hearts. Roll through the strike."],
    runner: ["Stampede gecko", "earth", "Charges in herds. Get out of the line."],
    hydra: ["Lau-Poʻo, the Many-Headed", "earth", "A giant plant whose heads lash and spit; wound it and it grows more. Mini-boss."],
    firedancer: ["Tiki fire-dancer", "fire", "Twirls a staff burning at both ends: a spinning wheel, a sweep, a ring of fire."],
    firegecko: ["Fire gecko", "fire", "Curls into a fireball and rolls at you, leaving flames behind."],
    hive: ["Kahu-Ahi, the Bonfire Hive", "fire", "A nest that pours out wisps, then gathers them into one fire spirit. Boss."],
    crab: ["ʻŌhiki, the sand crab", "water", "Zigzags in and scurries aside from blows. A pack rings you and strikes as one; a loner burrows to ambush."],
    spitcrab: ["Bubble crab", "water", "Hangs back with its pack, spitting foam; slams its claw when crowded."],
    brute: ["Tiki brute", "tribal", "A carved giant with stone fists. Paws the ground, then charges to ram; darters shelter behind him."],
    shark: ["Reef shark", "water", "A silhouette that lines up and lunges. Leaps sandbars, beaches itself after you. Strike it from the water."],
    bigshark: ["Tiger shark", "water", "The big one: slow, long, two-heart lunges. Comes with the feeding frenzy."],
    tshark: ["Thermal shark", "fire", "Big and hot: its lunges boil the water, and it scalds a line of steam toward you."],
    ray: ["Stingray", "storm", "A gliding shadow: lightning rings in the water, and arcs of current at anyone on the shore."],
    pueo: ["Pueo", "earth", "A great horned owl. Bombs you with a stone, then circles close and swoops. Flocks attack together."],
    spidercrab: ["Pāpaʻi-Loa, the giant spider crab", "water", "Stilt legs that stab, a sweeping claw, a trampling scuttle; calls the crabs. Boss of the Coral Atolls."],
    giantray: ["Kai-Uila, the Storm Ray", "storm", "Many rays as one: storm rings, called lightning, a lightning field; it breaks apart to swarm you. Boss of the Thermal Cliffs."],
  };
  Gear.renderBook = (el) => {
    if (!S.book) { el.innerHTML = '<p class="mn-dim">Makani sells a bestiary, the Moʻolelo of Beasts, for a Triton\'s trumpet and a Nicobar triton.</p>'; return; }
    el.innerHTML = Object.entries(Gear.BEASTS).map(([k, [name, elx, desc]]) => { const n = S.kills[k] || 0, E = Gear.ELEMENTS[elx]; return n ? `<div class="mn-beast"><b>${name}</b> <span style="color:${E ? E.col : "#ccc"}">${E ? E.name : ""}</span> <span class="mn-dim">beaten ${n}</span><br><span class="mn-dim">${desc}</span></div>` : `<div class="mn-beast mn-dim">??? <span>not yet met</span></div>`; }).join("");
  };

  // ---------------------------------------------------------------- state
  const fresh = () => ({ shards: Object.fromEntries(Gear.ORDER.map((k) => [k, 0])), armors: [], worn: null, village: { built: [], rescued: [] }, shells: Object.fromEntries(Object.keys(Gear.SHELLS).map((k) => [k, 0])), charms: { heart: 0, whet: 0, luck: 0 }, items: {}, pick: null, book: false, kills: {}, pack: [], stock: [], beach: null, beachDue: false, clears: {}, dojo: 1, up: {}, armUp: {} });
  let S = fresh();
  Gear.state = () => S;
  Gear.reset = () => { S = fresh(); Gear.changed(); };
  // saves from before life replaced magma: their magma shards, talismans and cloth become life ones
  const migrate = (d) => {
    if (!d) return d;
    if (d.shards && d.shards.magma) { d.shards.life = (d.shards.life || 0) + d.shards.magma; delete d.shards.magma; }
    if (d.items && d.items.t_magma) { d.items.t_life = (d.items.t_life || 0) + d.items.t_magma; delete d.items.t_magma; }
    if (d.armors) d.armors = d.armors.map((k) => (k === "cloth_magma" ? "cloth_life" : k)); if (d.worn === "cloth_magma") d.worn = "cloth_life";
    if (d.pack) d.pack = d.pack.map((k) => (k === "t_magma" ? "t_life" : k)); if (d.pick === "t_magma") d.pick = "t_life";
    if (d.stock) d.stock = d.stock.map((k) => k.replace("magma", "life"));
    return d;
  };
  Gear.load = (d) => { d = migrate(d); S = fresh(); if (d) { Object.assign(S.shards, d.shards || {}); S.armors = (d.armors || []).filter((k) => Gear.ARMOR[k]); S.worn = Gear.ARMOR[d.worn] ? d.worn : null; S.village = { built: (d.village && d.village.built) || [], rescued: (d.village && d.village.rescued) || [] }; Object.assign(S.shells, d.shells || {}); Object.assign(S.charms, d.charms || {}); S.items = d.items || {}; S.pick = d.pick || null; S.book = !!d.book; S.kills = d.kills || {}; S.pack = d.pack || []; S.stock = d.stock || []; S.beach = d.beach || null; S.beachDue = !!d.beachDue; S.clears = d.clears || {}; S.dojo = d.dojo || 1; S.up = d.up || {}; S.armUp = d.armUp || {}; } Gear.changed(); };
  Gear.snapshot = () => JSON.parse(JSON.stringify(S));
  Gear.onChange = null;
  Gear.changed = () => { Gear.onChange && Gear.onChange(); window.Menu && Menu.refresh && Menu.refresh(); };

  Gear.addShard = (el, n) => { if (!S.shards[el] && S.shards[el] !== 0) return; S.shards[el] += n || 1; Gear.changed(); };
  Gear.hasArmor = (k) => S.armors.includes(k);
  Gear.gainArmor = (k) => { if (!Gear.ARMOR[k] || S.armors.includes(k)) return false; S.armors.push(k); if (!S.worn || (Gear.ARMOR[S.worn].tier || 0) < (Gear.ARMOR[k].tier || 0)) S.worn = k; Gear.changed(); return true; };
  Gear.wear = (k) => { if (k && !S.armors.includes(k)) return; S.worn = k; Gear.changed(); };
  Gear.worn = () => (S.worn ? Gear.ARMOR[S.worn] : null);
  Gear.wornId = () => S.worn;
  // the forge: three shards for the element's weapon or its cloth
  Gear.ZONE_DMG = [1, 1, 1.25, 1.5, 1.75, 2, 2.25];
  Gear.COST = 3;
  Gear.canCraft = (el, kind) => { const E = Gear.ELEMENTS[el]; if (!E || S.shards[el] < Gear.COST) return false; return kind === "weapon" ? !Combat.unlocked.has(E.weapon) : !S.armors.includes(E.cloth); };
  Gear.craft = (el, kind) => {
    if (!Gear.canCraft(el, kind)) return false;
    const E = Gear.ELEMENTS[el]; S.shards[el] -= Gear.COST;
    if (kind === "weapon") Combat.gain(E.weapon); else { S.armors.push(E.cloth); S.worn = S.worn || E.cloth; }
    Gear.changed(); return true;
  };

  // ---------------------------------------------------------------- the smith's upgrades
  // Kamaka can temper a weapon or reinforce a suit. Ordinary weapons take five levels (+12% damage each),
  // so an early club can keep up late in the game; elemental weapons, already strong, take two. Battle
  // suits take three (+1 heart and a little block each); a cloth, one. Each level asks for shells and
  // shards, and the shards climb through the elements of the journey (tribal, then storm, blood and
  // stone), so the top levels only come within reach later on.
  const SHELL_UP = [null, { clam: 2, limpet: 1 }, { auger: 2, cone: 1 }, { limpet: 3, triton: 1 }, { clam: 3, miter: 1, helmet: 1 }, { auger: 4, cone: 1, trumpet: 1 }];
  const SHARD_UP = [null, ["tribal", 1], ["tribal", 2], ["storm", 2], ["blood", 2], ["earth", 2]];
  const ARM_UP = [null, [{ limpet: 2, cone: 1 }, ["tribal", 2]], [{ clam: 3, triton: 1 }, ["water", 2]], [{ auger: 3, miter: 1, helmet: 1 }, ["earth", 2]]];
  Gear.UP_DMG = 0.12;
  Gear.upLevel = (kind, id) => (kind === "weapon" ? S.up[id] : S.armUp[id]) || 0;
  Gear.upMax = (kind, id) => (kind === "weapon" ? (Gear.WEAPON_EL[id] ? 2 : 5) : Gear.ARMOR[id] && Gear.ARMOR[id].el ? 1 : 3);
  Gear.upCost = (kind, id) => {
    const L = Gear.upLevel(kind, id) + 1; if (L > Gear.upMax(kind, id)) return null;
    if (kind === "weapon") { const el = Gear.WEAPON_EL[id]; return { shells: SHELL_UP[L], shards: el ? [el, 2 * L] : SHARD_UP[L] }; }
    const A = Gear.ARMOR[id]; if (A.el) return { shells: { cone: 1, miter: 1 }, shards: [A.el, 2] };
    return { shells: ARM_UP[L][0], shards: ARM_UP[L][1] };
  };
  Gear.canUpgrade = (kind, id) => { const c = Gear.upCost(kind, id); if (!c) return false; if (Gear.infinite) return true; return S.shards[c.shards[0]] >= c.shards[1] && Object.entries(c.shells).every(([k, n]) => S.shells[k] >= n); };
  Gear.upgrade = (kind, id) => {
    if (!Gear.canUpgrade(kind, id)) return false;
    const c = Gear.upCost(kind, id);
    if (!Gear.infinite) { S.shards[c.shards[0]] -= c.shards[1]; for (const [k, n] of Object.entries(c.shells)) S.shells[k] -= n; }
    if (kind === "weapon") S.up[id] = (S.up[id] || 0) + 1; else S.armUp[id] = (S.armUp[id] || 0) + 1;
    Gear.changed(); return true;
  };
  // ---------------------------------------------------------------- effects
  Gear.stats = () => {
    const a = Gear.worn() || {};
    const ch = S.charms;
    const up = S.worn ? S.armUp[S.worn] || 0 : 0;
    return { hp: (a.hp || 0) + ch.heart * 2 + up * 2, block: (a.block || 0) + (a.el ? 0 : up * 0.03), speed: a.speed || 1, rollCd: a.rollCd || 1, kb: a.kb === undefined ? 1 : a.kb, crit: a.crit || 0, el: a.el || null, elMul: a.elMul || 1, dmgAll: (a.dmgAll || 0) + ch.whet * 0.08,
      momMul: a.momMul || 1, startMom: a.startMom || 0, regen: a.regen || 0, lifesteal: a.lifesteal || 0, chain: a.chain || 0, waterWalk: !!a.waterWalk, immune: a.immune || [], fireSoak: !!a.fireSoak, hazardHalf: !!a.hazardHalf, healMul: a.healMul || 1, trail: !!a.trail };
  };
  // push the worn armour's numbers into the combat engine
  Gear.applyCombat = () => {
    const st = Gear.stats();
    Combat.critBonus = st.crit; Combat.momMul = st.momMul; Combat.lifesteal = st.lifesteal; Combat.chainChance = st.chain;
    Combat.dmgMul = (wid) => (1 + st.dmgAll) * (st.el && Gear.WEAPON_EL[wid] === st.el ? st.elMul : 1);
    Combat.upgrades = S.up;
  };
  // what a blow does to you after armour: returns the damage that lands (0 = none) and whether it was blocked
  Gear.incoming = (dmg, src) => {
    const st = Gear.stats();
    src = String(src || "");
    if (st.immune.some((k) => src.includes(k))) return { dmg: 0, immune: true };
    if (st.block && Math.random() < st.block) return { dmg: 0, blocked: true };
    // creatures hit harder deeper into the journey: zones 1-2 as tested, rising to double by zone 6
    const zone = window.Level && Level.cur && Level.cur.def.zone; if (zone) dmg = Math.max(1, Math.round(dmg * Gear.ZONE_DMG[zone - 1]));
    if (st.fireSoak && FIRE_SRC.test(src)) dmg -= 1;
    if (st.hazardHalf && /steam|boil|flames|rock|geyser|zap/.test(src) && dmg > 1) dmg -= 1;
    return { dmg: Math.max(0, dmg) };
  };

  // ---------------------------------------------------------------- the village
  // Plots on the island, staked out for buildings. The forge's plot is first; more come later.
  const T = 32;
  Gear.PLOTS = [
    { id: "forge", name: "The Forge", x: 44.5 * T, y: 23.2 * T, who: "smith" },
    { id: "stall", name: "Makani's stall", x: 0, y: 0, who: "vendor", hidden: true },
    { id: "plot2", name: "An empty plot", x: 53 * T, y: 21.4 * T, who: null },
  ];
  Gear.built = (id) => S.village.built.includes(id);
  Gear.rescued = (who) => S.village.rescued.includes(who);
  // someone rescued moves in; if they bring a building, it goes up at once
  Gear.rescue = (who) => {
    if (S.village.rescued.includes(who)) return false;
    S.village.rescued.push(who);
    for (const p of Gear.PLOTS) if (p.who === who && !S.village.built.includes(p.id)) S.village.built.push(p.id);
    Gear.changed(); return true;
  };
  Gear.build = (id) => { if (!S.village.built.includes(id)) { S.village.built.push(id); Gear.changed(); } };

  // ---------------------------------------------------------------- Settings > Gear (the armour you wear, and your shards)
  Gear.renderTab = (el) => {
    const st = S, w = Gear.worn();
    const fmt = (a) => [a.hp ? `+${a.hp / 2} heart${a.hp > 2 ? "s" : ""}` : "", a.block ? `${Math.round(a.block * 100)}% block` : "", a.speed && a.speed !== 1 ? `+${Math.round((a.speed - 1) * 100)}% speed` : "", a.kb === 0 ? "no knockback" : a.kb ? "half knockback" : "", a.crit ? `+${Math.round(a.crit * 100)}% crits` : "", a.dmgAll ? `+${Math.round(a.dmgAll * 100)}% damage` : "", a.el ? `+${Math.round((a.elMul - 1) * 100)}% ${Gear.ELEMENTS[a.el].name.toLowerCase()} weapons` : ""].filter(Boolean).join(" · ");
    const list = Gear.NORMAL.concat(Gear.ORDER.map((k) => Gear.ELEMENTS[k].cloth)).filter((k) => st.armors.includes(k));
    el.innerHTML = `
      <p class="mn-note">Wearing: <b>${w ? w.name : "your island clothes"}</b>${w ? `<br><span class="mn-dim">${w.desc} ${fmt(w)}</span>` : ""}</p>
      <div class="mn-gear">${list.length ? list.map((k) => { const a = Gear.ARMOR[k], c = a.pal.l; return `<button class="mn-armor${st.worn === k ? " on" : ""}" data-wear="${k}"><i style="background:rgb(${a.pal.v})"></i><span>${a.name}</span><small>${fmt(a)}</small></button>`; }).join("") : '<p class="mn-dim">No armour yet. Clear a zone, or weave cloth at the forge.</p>'}
        ${st.worn ? '<button class="mn-armor" data-wear="">Take it off</button>' : ""}</div>
      <p class="mn-note" style="margin-top:10px">Shards <span class="mn-dim">(3 of one element makes its weapon or cloth at the forge)</span></p>
      <div class="mn-shards">${Gear.ORDER.map((k) => { const E = Gear.ELEMENTS[k]; return `<span class="mn-shard"><i style="background:${E.col}"></i>${E.name} <b>${st.shards[k]}</b></span>`; }).join("")}</div>
      <p class="mn-note" style="margin-top:10px">Shells <span class="mn-dim">(trade them at Makani's stall)</span></p>
      <div class="mn-shards">${Object.entries(Gear.SHELLS).map(([k, sh]) => `<span class="mn-shard"><img src="${Gear.shellArt(k).toDataURL()}" style="width:13px;height:13px;image-rendering:pixelated;vertical-align:-2px;margin-right:4px">${sh.name} <b>${st.shells[k]}</b> <span class="mn-dim">${Gear.TIER_NAME[sh.tier]}</span></span>`).join("")}</div>`;
    el.querySelectorAll("[data-wear]").forEach((b) => (b.onclick = () => { Gear.wear(b.dataset.wear || null); }));
  };
})();
