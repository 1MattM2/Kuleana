// The Sun Gate sanctum (hub) and the Volcanic Highlands (first expedition).
//
// Terrain is resolved per pixel (like the island's coastline), so cliff edges, moss and sand
// patches are organic, while carved things (paths, sun tiles, stairs, bridges) stay on the grid.
// Every material is the island's own: obsidian rock and cliffs, meadow grass, beach sand, the
// carved path, the sun-court tiles, plus a volcanic soil made from the obsidian. Depth comes from
// tall cliff faces dropping to real ground far below: a jungle of island palms, hazed by distance.
(function () {
  const T = 32;
  const Level = (window.Level = { cur: null, baked: {} });
  let A = null;
  Level.init = (assets) => { A = assets; Ruins.init(assets); };

  const VOID = 0, WALL = 1, SOIL = 2, GRASS = 3, SAND = 4, PATH = 5, SUN = 6, PAVE = 7, STAIR = 8, BH = 9, BV = 10;
  const CH = { "#": WALL, " ": VOID, ".": SOIL, ",": GRASS, ":": SAND, "=": PATH, o: SUN, "%": PAVE, S: STAIR, H: BH, V: BV };
  const walk = (v) => v >= SOIL;

  // ------------------------------------------------------------------ level definitions
  const DEFS = {
    sanctum: {
      title: "SUN GATE", sub: "Sanctum of Kuleana", bg: "abyss", cliff: 120, wallFace: 30, ivy: 0.55,
      map: [
        "############################",
        "############################",
        "############################",
        "#####==================#####",
        "#####====oooooooooo====#####",
        "#####====oooooooooo====#####",
        "#####====oooooooooo====#####",
        "#####====oooooooooo====#####",
        "#####==================#####",
        "#######SS##########SS#######",
        "#######SS##########SS#######",
        "##==,=======     ....,,,..##",
        "##=,,,======     ...,,,,,.##",
        "##,,,,,=====HHHHH...,,,,,.##",
        "##=,,,======     ....,,,..##",
        "##==,=======     .........##",
        "#  SSS                SSS  #",
        "#  SSS                SSS  #",
        "#  SSS                SSS  #",
        "#  SSS                SSS  #",
        "#  SSS                SSS  #",
        "#  SSS                SSS  #",
        "###SSS####.........###SSS###",
        "###SSS,,%%%%%%%%%%%%%,SSS###",
        "###,,,,.%%%%%%%%%%%%%.,,,###",
        "#####,,,%%%ooooooo%%%,,,####",
        "#####,,,%%%ooooooo%%%,,,####",
        "####,,,,%%%ooooooo%%%,,,,###",
        "#####,,,%%%ooooooo%%%,,,####",
        "#####,,,%%%ooooooo%%%,,,####",
        "######,.%%%%%%%%%%%%%.,#####",
        "########....=====....#######",
        "##########..=====..#########",
        "############=====###########",
      ],
      spawn: { x: 14, y: 32.2 }, returnAt: { x: 14, y: 8.55 },
      exits: [{ x0: 11, y0: 33.6, x1: 17, y1: 35, to: "island" }],
      sun: { x: 14.5, y: 27.5 },
      props: [
        { k: "gate", big: 1, x: 14, y: 7.2 },
        { k: "column", x: 6.2, y: 4.8 }, { k: "column", x: 21.8, y: 4.8 }, { k: "column", x: 6.2, y: 8.6 }, { k: "column", x: 21.8, y: 8.6 },
        { k: "brazier", x: 8.6, y: 8.4 }, { k: "brazier", x: 19.4, y: 8.4 },
        { k: "crystals", big: 1, x: 3.4, y: 12.6 }, { k: "crystals", x: 5.2, y: 15.4 }, { k: "crystals", x: 10.6, y: 11.8 }, { k: "crystals", big: 1, x: 24.6, y: 14.6 },
        { k: "tiki", x: 9.2, y: 24.2 }, { k: "tiki", x: 19.8, y: 24.2 }, { k: "tiki", x: 9.2, y: 30.6 }, { k: "tiki", x: 19.8, y: 30.6 },
        { k: "brazier", x: 7.4, y: 27.6 }, { k: "brazier", x: 21.6, y: 27.6 },
        { k: "palm", x: 5.6, y: 29.4 }, { k: "palm", x: 23, y: 28.6 }, { k: "fern", x: 6.4, y: 25.2 }, { k: "fern", x: 22.4, y: 25.6 }, { k: "monstera", x: 24.2, y: 12.4 },
        { k: "fern", x: 20.5, y: 11.6 }, { k: "hibiscus", x: 23.8, y: 30.8 }, { k: "taro", x: 4.4, y: 28.4 }, { k: "boulder", x: 18.2, y: 15.3, s: 1 },
      ],
      npcs: [{ name: "Kahu Lā", x: 17.4, y: 8.6, lines: [
        "Aloha, young one. I am Kahu Lā, keeper of the Sun Gate.",
        "This old volcano sleeps now. When it slept, the sun came to rest in that gate.",
        "Through it lie every land the sun once touched. The first is the Volcanic Highlands.",
        "Geckos, vine-lashers, sun-wisps, and the Tiki tribe guard the old ruins there.",
        "Roll with Space to slip their blows. Strike without being struck and your momentum will build.",
        "Go. And whenever you see a sun gate, it will bring you home."] }],
      shafts: [{ x: 4, y: -1, ang: 0.38, w: 3.2, len: 26 }, { x: 23.5, y: -1, ang: -0.34, w: 2.6, len: 24 }, { x: 14, y: -1.6, ang: 0.02, w: 2, len: 13 }],
      portal: { x: 14, y: 7.6, to: "highlands", needsTalk: true },
    },
    highlands: {
      title: "VOLCANIC HIGHLANDS", sub: "Where the sun first touched stone", bg: "valley", cliff: 104, wallFace: 24, ivy: 0.3,
      map: [
        "                                                                ",
        "                                                                ",
        "                                                                ",
        "                                                                ",
        "   ###########################                                  ",
        "   ###########################                                  ",
        "   ###########   .                                              ",
        "      ..... ...........       #############################     ",
        "     oooooo........,,,,,      #############################     ",
        "    .oooooo.......,,,,,,,.    #############################     ",
        "    .ooo.........,,,,,,,,,.   #############################     ",
        "    .oo.......%%%%%%%,,,,.......,,,,,,,,....##                  ",
        "     ........,%ooooo%,,,........,,,,,,,,...===========....      ",
        "      .....,,,%ooooo%...........,,,,,,,,...===========....      ",
        "        ..,,,,%ooooo%.:....................===========....      ",
        "        .,,,,,%%%%%%%::::..              .................      ",
        "        ..,,,,,,,..:::::::.                            SSS      ",
        "         ..,,,,,....:::::.                             SSS      ",
        "           ..,........:.                               SSS      ",
        "            ...........                                SSS      ",
        "                 .                                     ....     ",
        "                                                      ......    ",
        "                                                     .,,,....   ",
        "                         #######################     ,,,,,...   ",
        "                         #%%%%%...........%%%%%     ,,,,,,,...  ",
        "                         #%%%%%%%%%%%%%%%%%,,,%     .,,,,,....  ",
        "                         #%%%%%%%%%%%%%%%%,,,,,     ..,,,.....  ",
        "                         #%....%%%%%%%%%%%,,,,,     ..........  ",
        "                         #.....%%ooooooo%%.,,,.    ......:..... ",
        "                         #.....%%ooooooo%%....%     ...:::::..  ",
        "                         #.....%%ooooooo%%....%HHHHH..:::::::.  ",
        "                         #.,,,,%%ooooooo%%....%     ..:::::::.  ",
        "                         #.,,,,%%ooooooo%%.....     ..:::::::.  ",
        "                         #,,,,,%%%%%%%%%%%.....      ..:::::.   ",
        "                         #%,,,,%%%%%%%%%%%....%      ....:...   ",
        "                         #%,,,,%%%%%%%%%%%%%%%%       ......    ",
        "                         #%%%%%%%%%%%%%%%%%%%%%        ....     ",
        "                      ####%%%%%.....SSS...%%%%%                 ",
        "                      ##############SSS                         ",
        "                      ##############SSS                         ",
        "       #############################SSS                         ",
        "       #############################SSS                         ",
        "       ####........#################SSS                         ",
        "         ...======..################SSS                         ",
        "        ....======,,################SSS                         ",
        "       .....======,,################SSS                         ",
        "       ....,======,,,,,   ###   .##.....                        ",
        "       ..,,,,,..,,,,..,,,,,,,,,,........                        ",
        "       .,,,,,,,...::..,,,,,,,,,,......                          ",
        "       ,,,,,,,,,.:::.................                           ",
        "       .,,,,,,,.::::::...........                               ",
        "        .,,,,,...:::::                                          ",
        "         ..,......:::                                           ",
        "           ........                                             ",
        "                                                                ",
        "                                                                ",
        "                                                                ",
        "                                                                ",
      ],
      spawn: { x: 14.5, y: 46.4 },
      sun: { x: 36.5, y: 30.5 }, sun2: { x: 16.5, y: 13.5 },
      props: [
        // A. the arrival court
        { k: "gate", x: 14.5, y: 43.2 }, { k: "tiki", x: 9.4, y: 44.6 }, { k: "tiki", x: 19.8, y: 44.6 },
        { k: "palm", x: 8.6, y: 47.6 }, { k: "palm", x: 21.4, y: 51.2 }, { k: "fern", x: 10.6, y: 52.2 }, { k: "fern", x: 18.4, y: 44.4 },
        { k: "crystals", big: 1, x: 7.6, y: 50.4 }, { k: "crystals", x: 9.2, y: 52.6 }, { k: "hibiscus", x: 16.6, y: 53.2 }, { k: "taro", x: 12.6, y: 53 }, { k: "boulder", x: 20.6, y: 47.6, s: 2 },
        { k: "smallplant", x: 11.4, y: 49.6 }, { k: "smallplant", x: 19.2, y: 52.4 },
        // B. the ledge
        { k: "smallplant", x: 24.4, y: 48.8 }, { k: "smallplant", x: 31.8, y: 46.6 }, { k: "smallplant", x: 36.2, y: 49.6 },
        { k: "fern", x: 25.2, y: 46.6 }, { k: "boulder", x: 30.4, y: 49.6, s: 1 }, { k: "taro", x: 34.2, y: 49.4 }, { k: "palm", x: 38.6, y: 48.6 },
        // D. the sun court
        { k: "column", x: 27.4, y: 25.2 }, { k: "column", x: 45.4, y: 25.2 }, { k: "column", x: 27.4, y: 36.4 }, { k: "column", x: 45.4, y: 36.4 },
        { k: "column", x: 31, y: 25.4 }, { k: "column", x: 41.8, y: 25.4 }, { k: "tiki", x: 36.5, y: 25.6 },
        { k: "brazier", x: 30, y: 28 }, { k: "brazier", x: 43, y: 28 }, { k: "brazier", x: 30, y: 34.6 }, { k: "brazier", x: 43, y: 34.6 },
        { k: "fern", x: 26.8, y: 31 }, { k: "palm", x: 44.6, y: 33.6 }, { k: "hibiscus", x: 27.2, y: 33.6 },
        // F. crystal overlook
        { k: "crystals", big: 1, x: 59.4, y: 24.6 }, { k: "crystals", big: 1, x: 53.6, y: 33.4 }, { k: "crystals", x: 60.4, y: 29.4 }, { k: "crystals", x: 55.2, y: 21.6 },
        { k: "palm", x: 52.6, y: 23.6 }, { k: "fern", x: 60.6, y: 33.6 }, { k: "taro", x: 57.6, y: 22.4 }, { k: "boulder", x: 58.6, y: 35.4, s: 2 },
        { k: "smallplant", x: 55.6, y: 27.4 }, { k: "smallplant", x: 59.8, y: 31.6 },
        // G. the ridge
        { k: "smallplant", x: 44.4, y: 14.6 }, { k: "smallplant", x: 35.4, y: 13.8 }, { k: "smallplant", x: 52.6, y: 13.2 },
        { k: "column", x: 47.4, y: 11.6 }, { k: "column", x: 50.6, y: 11.6 }, { k: "fern", x: 41.6, y: 11.4 }, { k: "palm", x: 33.6, y: 11.6 }, { k: "boulder", x: 39.4, y: 14.6, s: 1 },
        { k: "hibiscus", x: 54.6, y: 15.2 }, { k: "taro", x: 31.4, y: 14.6 },
        // H. the hollow / I. Pele's shrine and the gate home
        { k: "column", x: 14.2, y: 10.6 }, { k: "column", x: 20.8, y: 10.6 }, { k: "column", x: 14.2, y: 16.6 }, { k: "column", x: 20.8, y: 16.6 },
        { k: "tiki", x: 10.4, y: 15.4 }, { k: "tiki", x: 24.6, y: 14.4 }, { k: "palm", x: 9.6, y: 17.6 }, { k: "palm", x: 25.6, y: 9.6 }, { k: "fern", x: 22.4, y: 17.8 }, { k: "boulder", x: 12, y: 18.8, s: 2 },
        { k: "smallplant", x: 9.2, y: 16.2 }, { k: "smallplant", x: 24.6, y: 18.4 },
        { k: "shrine", x: 7.6, y: 10.6 }, { k: "gate", x: 10.4, y: 7.6 }, { k: "brazier", x: 5.4, y: 9.2 }, { k: "crystals", big: 1, x: 4.2, y: 11.8 }, { k: "hibiscus", x: 11.6, y: 9.6 },
      ],
      enemies: [
        { e: "gecko", x: 17, y: 49 }, { e: "gecko", x: 12, y: 50.5 },
        { e: "vine", x: 27, y: 47.6 }, { e: "gecko", x: 30, y: 48.4 }, { e: "vine", x: 33.6, y: 47.4 }, { e: "gecko", x: 36.6, y: 47.4 },
        { e: "wisp", x: 56, y: 26 }, { e: "wisp", x: 58.5, y: 31 }, { e: "wisp", x: 54, y: 30 }, { e: "gecko", x: 57, y: 33 }, { e: "gecko", x: 55, y: 24 }, { e: "vine", x: 61, y: 27 },
        { e: "vine", x: 46, y: 12.6 }, { e: "gecko", x: 49, y: 14 }, { e: "dart", x: 43, y: 13, tribe: 3 }, { e: "spear", x: 41, y: 13.6, tribe: 3 }, { e: "vine", x: 36.6, y: 11.6 }, { e: "gecko", x: 34, y: 13.6 }, { e: "wisp", x: 38, y: 15 },
      ],
      arenas: [
        { title: "THE TRIBE OF THE SUN COURT", rect: [26, 24, 46, 37], seals: [[36, 37.4, 39, 38.2], [46.2, 29, 47.2, 32]],
          waves: [
            [{ e: "spear", x: 33, y: 27, tribe: 1, enter: "leap" }, { e: "spear", x: 40, y: 27, tribe: 1, enter: "leap" }, { e: "spear", x: 36.5, y: 26.4, tribe: 1, enter: "leap" }, { e: "dart", x: 29, y: 30, tribe: 1, enter: "leap" }, { e: "dart", x: 44, y: 30, tribe: 1, enter: "leap" }],
            [{ e: "spear", x: 29, y: 32, tribe: 2, enter: "leap" }, { e: "spear", x: 44, y: 32, tribe: 2, enter: "leap" }, { e: "dart", x: 31, y: 26, tribe: 2, enter: "leap" }, { e: "dart", x: 42, y: 26, tribe: 2, enter: "leap" }, { e: "wisp", x: 36.5, y: 29, enter: "descend" }, { e: "gecko", x: 28, y: 35, enter: "scurry" }, { e: "gecko", x: 45, y: 35, enter: "scurry" }],
          ] },
        { title: "THE HOLLOW OF KŪ", rect: [7, 6, 27, 20], seals: [[27.4, 11, 28.4, 14.6]],
          waves: [
            [{ e: "spear", x: 15, y: 9, tribe: 4, enter: "leap" }, { e: "spear", x: 20, y: 9, tribe: 4, enter: "leap" }, { e: "dart", x: 12, y: 12, tribe: 4, enter: "leap" }, { e: "dart", x: 23, y: 12, tribe: 4, enter: "leap" }, { e: "vine", x: 11, y: 16.8, enter: "burst" }, { e: "vine", x: 23.6, y: 16.4, enter: "burst" }],
            [{ e: "wisp", x: 13, y: 12, enter: "descend" }, { e: "wisp", x: 22, y: 12, enter: "descend" }, { e: "spear", x: 17.5, y: 9, tribe: 5, enter: "leap" }, { e: "spear", x: 12, y: 15, tribe: 5, enter: "leap" }, { e: "dart", x: 23, y: 15, tribe: 5, enter: "leap" }, { e: "gecko", x: 9, y: 13, enter: "scurry" }, { e: "gecko", x: 25, y: 16, enter: "scurry" }],
          ] },
      ],
      gates: [{ x: 14.5, y: 44.4, to: "sanctum" }, { x: 10.4, y: 8.8, to: "sanctum" }],
      shrine: { x: 7.6, y: 11.2, unlock: "heel" },
    },
  };
  Level.DEFS = DEFS;

  // ------------------------------------------------------------------ terrain
  function tileMap(def) {
    const rows = def.map, tw = rows[0].length, th = rows.length, g = new Uint8Array(tw * th);
    rows.forEach((r, y) => { for (let x = 0; x < tw; x++) g[y * tw + x] = CH[r[x]] === undefined ? WALL : CH[r[x]]; });
    const at = (x, y) => (x < 0 || y < 0 || x >= tw || y >= th ? VOID : g[y * tw + x]);
    // remove lonely walkable specks (they read as floating dirt)
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) if (walk(at(x, y)) && at(x, y) < PATH) { let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (walk(at(x + dx, y + dy))) n++; if (n <= 1) g[y * tw + x] = VOID; }
    return { tw, th, g, at };
  }

  function bake(def) {
    const tm = tileMap(def), W = tm.tw * T, H = tm.th * T, N = W * H;
    // tiles near carved things keep straight edges (so bridges and stairs always connect)
    const straight = new Uint8Array(tm.tw * tm.th);
    for (let y = 0; y < tm.th; y++) for (let x = 0; x < tm.tw; x++) {
      const v = tm.at(x, y); if (v >= PATH) continue;
      // a landing: the tile a flight of stairs or a bridge runs into, along its own direction of travel
      const S2 = (a, b) => tm.at(a, b) === STAIR || tm.at(a, b) === BV, H2 = (a, b) => tm.at(a, b) === BH;
      if (S2(x, y - 1) || S2(x, y + 1) || H2(x - 1, y) || H2(x + 1, y)) straight[y * tm.tw + x] = 1;
    }
    // organic borders: look the tile up at a coordinate nudged by noise
    const G = 4, gw = (W >> 2) + 2, gh = (H >> 2) + 2, ofx = new Float32Array(gw * gh), ofy = new Float32Array(gw * gh);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) { const x = gx * G, y = gy * G; ofx[gy * gw + gx] = (K.fbm(x / 34, y / 34, 3) - 0.5) * 30 + (K.noise(x / 9, y / 9) - 0.5) * 6; ofy[gy * gw + gx] = (K.fbm(x / 34 + 50, y / 34 + 20, 3) - 0.5) * 30 + (K.noise(x / 9 + 9, y / 9) - 0.5) * 6; }
    const terr = new Uint8Array(N);
    for (let y = 0; y < H; y++) {
      const ty = y >> 5;
      for (let x = 0; x < W; x++) {
        const tx = x >> 5, t0 = tm.g[ty * tm.tw + tx];
        if (t0 >= PATH || straight[ty * tm.tw + tx]) { terr[y * W + x] = t0; continue; }
        const j = (y >> 2) * gw + (x >> 2), px = x + ofx[j], py = y + ofy[j];
        const t1 = tm.at(Math.floor(px / T), Math.floor(py / T));
        terr[y * W + x] = t1 < PATH ? t1 : t0;
      }
    }
    // collision (8px cells)
    const CS = 8, CW = W / CS, CHh = H / CS, solid = new Uint8Array(CW * CHh);
    for (let cy = 0; cy < CHh; cy++) for (let cx = 0; cx < CW; cx++) { let n = 0; for (let sy = 1; sy < CS; sy += 3) for (let sx = 1; sx < CS; sx += 3) if (!walk(terr[(cy * CS + sy) * W + cx * CS + sx])) n++; solid[cy * CW + cx] = n >= 5 ? 1 : 0; }
    // column scans: how far each void pixel hangs below the ground above it; how high each wall pixel sits above the ground below
    const up = new Uint8Array(N), down = new Uint8Array(N), dn = new Uint8Array(N);
    for (let x = 0; x < W; x++) {
      let d = 255; for (let y = 0; y < H; y++) { const i = y * W + x, v = terr[i]; if (v !== VOID && v !== BH && v !== BV) d = 0; else { d = Math.min(255, d + 1); up[i] = d; } }
      d = 255; for (let y = H - 1; y >= 0; y--) { const i = y * W + x; if (terr[i] !== WALL) d = 0; else { d = Math.min(255, d + 1); down[i] = d; } }
      d = 255; for (let y = H - 1; y >= 0; y--) { const i = y * W + x, v = terr[i]; if (v !== VOID && v !== BH && v !== BV) d = 0; else { d = Math.min(255, d + 1); dn[i] = d; } }
    }
    const { ground, lower, embers } = paint(def, tm, terr, up, down, W, H, dn);
    const vines = vineSpots(def, terr, up, W, H);
    const below = { palms: [], mists: [] };
    // the forest far below: the island's own palms, standing on the lower floor wherever it shows
    const floorAt = (x, y, m) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return false; const i = y * W + x, v = terr[i]; return (v === VOID || v === BH || v === BV) && up[i] > def.cliff + m; };
    if (def.bg === "valley") {
      const r = K.rng(77), crowns = ["crown_a", "crown_d", "crown_a_f", "crown_d_f"];
      for (let y = 8; y < H + 60; y += 22) for (let x = ((y / 22) & 1) * 13; x < W + 10; x += 26) {
        const px = (x + (r() - 0.5) * 16) | 0, py = (y + (r() - 0.5) * 12) | 0;
        if (K.fbm(px / 170 + 5, py / 170, 2) < 0.4 || !floorAt(px, py, 6) || !floorAt(px - 5, py, 6) || !floorAt(px + 5, py, 6)) continue;
        below.palms.push({ x: px, y: py, th: 24 + ((r() * 22) | 0), cr: crowns[(r() * 4) | 0] });
      }
      below.palms.sort((a, b) => a.y - b.y);
      for (let k = 0; k < (W * H) / 60000; k++) below.mists.push({ x: r() * W, y: r() * H, sp: 3 + r() * 5, a: 0.18 + r() * 0.16 });
    }
    return { tm, terr, up, W, H, CS, CW, CH: CHh, solid, ground, lower, embers, vines, below };
  }

  // ------------------------------------------------------------------ painting the ground
  function paint(def, tm, terr, up, down, W, H, dn) {
    const img = new ImageData(W, H), out = new Uint32Array(img.data.buffer), pk = K.rgb;
    const OB = PAL.packed.obsidian, SO = PAL.packed.soil, GR = PAL.packed.grass, SA = PAL.packed.sand, GL = PAL.packed.glyph, ST = PAL.packed.stone, FE = PAL.packed.fern, HZ = PAL.packed.haze;
    const rock = A.px.tex_rock.data, grassT = A.px.tex_grass.data, sandT = A.px.tex_sand.data, glyph = A.px.tex_glyph.data;
    const lum = (v) => (v & 255) * 0.3 + ((v >>> 8) & 255) * 0.59 + ((v >>> 16) & 255) * 0.11;
    const rockIdx = (v) => { const l = lum(v); return l < 18 ? 0 : l < 33 ? 1 : l < 41 ? 2 : l < 48 ? 3 : l < 60 ? 4 : 5; };
    const B = PAL.bayer, CL = def.cliff, FACE = def.wallFace, valley = def.bg === "valley";
    const T_ = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? VOID : terr[y * W + x]);
    const sunC = def.sun, sun2 = def.sun2;
    const ROCK_LINE = pk(18, 13, 22), ROCK_HI = pk(118, 104, 136);
    const mixc = (a, b, f) => pk(((a & 255) + ((b & 255) - (a & 255)) * f) | 0, (((a >>> 8) & 255) + (((b >>> 8) & 255) - ((a >>> 8) & 255)) * f) | 0, (((a >>> 16) & 255) + (((b >>> 16) & 255) - ((a >>> 16) & 255)) * f) | 0);
    const patchIdx = (x, y, salt) => {
      const pcx = Math.floor((x + K.noise(x / 26, y / 26) * 30) / 72), pcy = Math.floor((y + K.noise(x / 26 + 70, y / 26) * 30) / 72);
      let u = (x + ((K.hash2(pcx, pcy, salt) * 32) | 0)) & 31; if (K.hash2(pcx, pcy, salt + 17) > 0.5) u = 31 - u;
      return u | (((y + ((K.hash2(pcx, pcy, salt + 9) * 32) | 0)) & 31) << 5);
    };
    // ivy: single strands hanging from the top of a rock face, leaves alternating side to side
    const strand = (x, len) => (K.hash2(x, 0, 77) > 0.8 && K.noise(x * 0.06, 3) > 1 - def.ivy * 0.9 ? 5 + ((K.hash2(x, 1, 78) * ((len || FACE) - 4)) | 0) : 0);
    const ivyAt = (x, s, len) => {
      const L0 = strand(x, len); if (L0 && s < L0) return s === L0 - 1 ? FE[4] : FE[2];
      const Ll = strand(x - 1, len), Lr = strand(x + 1, len);
      if (Ll && s < Ll - 1 && s % 4 === 1) return FE[4];
      if (Lr && s < Lr - 1 && s % 4 === 3) return FE[3];
      return 0;
    };
    const shade = (v, f) => pk(Math.min(255, (v & 255) * f) | 0, Math.min(255, ((v >>> 8) & 255) * f) | 0, Math.min(255, ((v >>> 16) & 255) * f) | 0);
    // soil / grass / sand, each with the island's patch variation and their edges against each other
    const groundSoft = (t, x, y) => {
      const ti = patchIdx(x, y, t);
      let c;
      if (t === SOIL) {
        // volcanic soil: the obsidian's own grain, warmed into earth, scattered with pebbles
        const n0 = K.noise(x / 6, y / 6), up2 = K.noise(x / 6, (y - 1.6) / 6), fine = K.noise(x / 2.2 + 11, y / 2.2);
        const v = n0 * 0.6 + fine * 0.3 + (K.fbm(x / 70 + 9, y / 70, 2) - 0.5) * 0.5 + B(x, y) * 0.12;
        let ix = v < 0.34 ? 1 : v < 0.5 ? 2 : v < 0.66 ? 3 : 4;
        if (n0 - up2 < -0.05) ix += 1; else if (n0 - up2 > 0.06) ix -= 1;                 // clods: lit tops, shaded undersides
        c = SO[Math.max(0, Math.min(5, ix))];
        if (K.hash2(x >> 1, y >> 1, 21) > 0.988) c = OB[5];
      } else if (t === GRASS) {
        c = grassT[ti];
        const v = K.fbm(x / 140 + 300, y / 140, 3) * 0.72 + K.noise(x / 46, y / 46) * 0.28 + B(x, y) * 0.07;
        if (v < 0.38) c = shade(c, 0.82); else if (v > 0.66) c = shade(c, 1.08);
      } else c = sandT[ti];
      // grass gets the island's dark rim against other ground; sand darkens toward soil
      let rim = 9;
      if (t !== SOIL) for (let dy = -2; dy <= 2 && rim > 1; dy++) for (let dx = -2; dx <= 2; dx++) { const tt = T_(x + dx, y + dy); if (tt !== t && tt >= SOIL && tt <= SAND && (t === GRASS || tt === SOIL)) { const m = Math.max(Math.abs(dx), Math.abs(dy)); if (m < rim) rim = m; } }
      if (t === GRASS) { if (rim === 1) c = GR[0]; else if (rim === 2 && ((x + y) & 1)) c = GR[1]; }
      if (t === SAND) { if (rim === 1) c = SA[0]; else if (rim === 2) c = SA[1]; }
      return c;
    };
    // the island's sun court: one 16px tile grid with the medallion centred on a grid corner
    const sunCourt = (x, y, ctr) => {
      const SUNR = PAL.packed.sun, mx = Math.round(ctr.x * T / 16) * 16, my = Math.round(ctr.y * T / 16) * 16;
      const dx = x + 0.5 - mx, dy = y + 0.5 - my, rr = Math.hypot(dx, dy);
      if (rr <= 45) {
        if (rr > 44) return SUNR[0]; if (rr > 41) return dx + dy < 0 ? SUNR[4] : SUNR[3]; if (rr > 40) return SUNR[1];
        if (rr <= 16) { if (rr > 15) return SUNR[1]; if (rr > 13) return SUNR[4]; if (rr > 11.5) return SUNR[3]; return dx + dy < -9 ? SUNR[6] : SUNR[5]; }
        const a = Math.atan2(dy, dx), sec = (2 * Math.PI) / 12, k = Math.floor((a + Math.PI) / sec + 0.5), frac = (a + Math.PI) / sec - k;
        const len = k % 2 ? 30 : 37.5, hw = 0.44 * (1 - (rr - 16) / (len - 16));
        if (rr < len && Math.abs(frac) < hw) return Math.abs(frac) > hw * 0.55 && frac > 0 ? SUNR[3] : SUNR[4];
        return SUNR[2];
      }
      const lx = x & 15, ly = y & 15, gx = x >> 4, gy = y >> 4, ax = Math.min(lx, 16 - lx), ay = Math.min(ly, 16 - ly);
      if (ax + ay <= 4) { if (ax + ay === 4) return SUNR[1]; return ((gx + gy + (lx > 8 ? 1 : 0) + (ly > 8 ? 1 : 0)) & 1) ? SUNR[4] : SUNR[1]; }
      if (lx === 0 || ly === 0) return SUNR[1];
      const base = [SUNR[3], pk(220, 128, 50), SUNR[2]][(K.hash2(gx, gy, 41) * 3) | 0];
      if (lx === 1 || ly === 1) return pk(252, 192, 104); if (lx === 15 || ly === 15) return shade(base, 0.82);
      return base;
    };
    const low = new ImageData(W, H), lo = new Uint32Array(low.data.buffer), embers = [];
    // the ground far below. Highlands: jungle floor (the island's grass and soil, darkened under the
    // canopy and pushed into the haze). Sanctum: the volcano's obsidian floor with dull lava cracks.
    const lowerFloor = (x, y, d) => {
      let c;
      if (valley) {
        c = grassT[patchIdx(x, y, 3)];
        const n = K.fbm(x / 90 + 17, y / 90, 3) + B(x, y) * 0.08;
        if (n < 0.4) c = mixc(c, SO[3], 0.6); else if (n > 0.62) c = shade(c, 1.08);
        c = mixc(shade(c, 0.74), HZ[2], 0.34);
      } else {
        c = mixc(shade(rock[patchIdx(x, y, 5)], 0.55), OB[1], 0.35);
        const v = K.noise(x / 26, y / 26), m = K.fbm(x / 70 + 3, y / 70, 2);
        if (Math.abs(v - 0.5) < 0.014 && m > 0.5) { c = PAL.pk(PAL.R.fire[Math.abs(v - 0.5) < 0.006 ? 2 : 1]); if (K.hash2(x, y, 31) < 0.01 && embers.length < 260) embers.push([x, y]); }
      }
      if (d < 20) c = shade(c, 0.5 + d * 0.025);                                                // the cliff's shadow at its foot
      return c;
    };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, t = terr[i];
      let c = 0;
      if (t === VOID || t === BH || t === BV) {
        const k = up[i];
        if (k > CL) {
          // beside a ledge's east or west edge: the rock flank of the cliff, a few pixels of it
          let side = 9, st = 0; for (let dd = 1; dd <= 4 && side === 9; dd++) { const a2 = T_(x - dd, y), b2 = T_(x + dd, y); if ((a2 !== VOID && a2 !== BH && a2 !== BV) || (b2 !== VOID && b2 !== BH && b2 !== BV)) { side = dd; st = a2 === STAIR || b2 === STAIR; } }
          const g2 = dn[i], below0 = T_(x, y + g2);
          if (g2 <= 2 && below0 === GRASS && K.noise(x * 0.4, 51) > 0.45) { lo[i] = g2 === 1 ? GR[1] : GR[0]; continue; }      // grass hanging over the lip
          let c2 = side === 1 ? OB[0] : side <= 4 ? (st ? (side === 2 ? ST[2] : ST[1]) : valley ? mixc(OB[side === 2 ? 3 : 2], HZ[2], 0.25) : OB[side === 2 ? 2 : 1]) : lowerFloor(x, y, k - CL);
          if (g2 <= 12 && side > 4) c2 = shade(c2, 0.45 + g2 * 0.045);                 // hidden in the shadow of the ledge in front
          lo[i] = c2;
          continue;
        }
        // a cliff face of obsidian dropping from the ledge to the floor far below: strata, ledges, ivy
        let ix = rockIdx(rock[(x & 31) | (((y * 0.55) & 31) << 5)]) + 1;
        ix -= Math.floor(k / 40);
        if ((x * 13 + (x >> 2) * 7) % 7 === 0) ix -= 1;                                      // vertical cracks
        const band = (k + ((K.hash2(x >> 3, 0, 7) * 7) | 0)) % 19;
        if (band === 0) ix += 1; else if (band === 1) ix -= 1;                                // ledges in the rock
        if (k === 1) ix = 0; else if (k <= 3) ix = 5;                                         // lit lip under the edge
        c = OB[Math.max(0, Math.min(6, ix))];
        if (k > 3) { const iv = ivyAt(x, k - 3, 26); if (iv) c = iv; }
        if (k > 3 && k < 7 && K.noise(x * 0.2, 9) > 0.62) c = (x + k) & 1 ? FE[2] : FE[1];            // a mossy fringe under the lip
        // further down is further away: the rock takes on the haze (or the volcano's dark) toward its foot
        const f = k / CL;
        if (valley) { if (B(x, y) + 0.5 < f * 1.1) c = mixc(c, HZ[2], 0.18 + f * 0.22); }
        else c = shade(c, 1 - f * 0.45);
        if (k >= CL - 1) c = OB[0];                                                           // where the cliff meets the ground below
        else if (k > CL - 6 && valley && K.noise(x * 0.3, 21) > 0.45) c = mixc(GR[1], HZ[2], 0.35);   // undergrowth at its foot
        lo[i] = c; continue;
      }
      if (t === WALL) {
        const d = down[i], rc = rock[patchIdx(x, y, 7)];
        if (d <= FACE && T_(x, y + d) !== VOID) {
          // the face of rising rock: the island's striated cliff, taller, with ledges and hanging ivy
          if (d <= 1) c = ROCK_LINE;
          else {
            c = shade(rc, d > FACE - 2 ? 0.8 : d < 5 ? 0.5 : 0.62);
            const strata = (x * 13 + ((x >> 2) * 7)) % 6;
            if (strata === 0) c = shade(c, 0.7); else if (strata === 3 && d < FACE - 3) c = shade(c, 1.15);
            const ledge = (d + ((K.hash2(x >> 4, 1, 5) * 9) | 0)) % 11;
            if (ledge === 0 && d > 4 && d < FACE - 3) c = shade(rc, 0.9); else if (ledge === 1 && d > 4 && d < FACE - 3) c = shade(c, 0.6);
            const iv = ivyAt(x, FACE - d);
            if (iv) c = iv;
          }
        } else {
          // the rock's top: the island texture as is, a lit rim along its north edge, outline at the sides
          c = rc;
          if (T_(x, y - 1) !== WALL) c = ROCK_HI; else if (T_(x, y - 2) !== WALL) c = mixc(rc, ROCK_HI, 0.5);
          // moss and grass creep over the top and hang over the lip of the face
          const m = K.fbm(x / 30 + 70, y / 30, 3), lip = d - FACE;
          if (lip > 0 && lip < 4 && K.noise(x * 0.25, 13) > 0.45) c = lip === 1 ? FE[2] : (x + y) & 1 ? FE[3] : GR[1];
          else if (m > 0.6 && B(x, y) + 0.5 < (m - 0.6) * 7) c = m > 0.67 ? (K.hash2(x, y, 3) > 0.85 ? FE[4] : FE[3]) : FE[2];
          if (T_(x - 1, y) !== WALL || T_(x + 1, y) !== WALL) c = ROCK_LINE;
        }
        out[i] = c; continue;
      }
      // ---- walkable ground
      if (t === SOIL || t === GRASS || t === SAND) c = groundSoft(t, x, y);
      else if (t === PATH) {
        // the island's carved road, its edges eaten by moss and soil
        const tx = x >> 5, ty = y >> 5, lx = x & 31, ly = y & 31;
        const nb = (dx, dy) => tm.at(tx + dx, ty + dy) === PATH;
        const e = Math.min(nb(-1, 0) ? 99 : lx, nb(1, 0) ? 99 : 31 - lx, nb(0, -1) ? 99 : ly, nb(0, 1) ? 99 : 31 - ly) - (1 + K.noise(x * 0.3, y * 0.3) * 5.5 + K.noise(x * 0.9, y * 0.9) * 1.5);
        if (e < 0) c = groundSoft(K.noise(x * 0.07, y * 0.07) > 0.5 ? GRASS : SOIL, x, y);
        else {
          c = glyph[(x & 63) + ((y & 63) << 6)];
          if (e < 2) c = shade(c, 0.8); else if (e < 4 && ((x + y) & 1)) c = shade(c, 0.9);
          if (K.noise(x * 0.12, y * 0.12) > 0.8 && K.hash2(x, y, 3) > 0.72) c = GR[1 + ((x + y) & 1)];
        }
      } else if (t === SUN) {
        c = sunCourt(x, y, (sun2 && Math.hypot(x - sun2.x * T, y - sun2.y * T) < Math.hypot(x - sunC.x * T, y - sunC.y * T)) ? sun2 : sunC);
        let e = 9; for (let dd = 1; dd <= 6 && e === 9; dd++) if (T_(x - dd, y) !== SUN || T_(x + dd, y) !== SUN || T_(x, y - dd) !== SUN || T_(x, y + dd) !== SUN) e = dd - 1;
        if (e < 3) c = shade(glyph[(x & 63) + ((y & 63) << 6)], e < 1 ? 0.62 : 0.85);
        else if (e < 6 && K.hash2(x, y, 5) > 0.75) c = mixc(c, GR[2], 0.55);
      } else if (t === PAVE) {
        // ruin floor: the island's carved sandstone path, weathered, with moss in its cracks
        c = glyph[(x & 63) + ((y & 63) << 6)];
        const w = K.fbm(x / 40 + 31, y / 40, 2);
        if (w < 0.4) c = shade(c, 0.88);
        if (K.noise(x * 0.12, y * 0.12) > 0.78 && K.hash2(x, y, 3) > 0.7) c = GR[1 + ((x + y) & 1)];
      } else if (t === STAIR) {
        // a carved stairway: each step is a lit nosing, a sandstone tread and a shadowed riser,
        // running between stone cheek walls (the island's temple stone)
        const tx = x >> 5, ty = y >> 5, lx = x & 31, ly = y & 7, eL = tm.at(tx - 1, ty) !== STAIR, eR = tm.at(tx + 1, ty) !== STAIR;
        if ((eL && lx < 6) || (eR && lx > 25)) {
          // cheek walls of fitted stone blocks, lit on top, mossy in their joints
          const o = eL && lx < 6 ? lx : 31 - lx, left = eL && lx < 6, by = y + (left ? 0 : 6), block = by % 12 === 0, bk = K.hash2(Math.floor(by / 12), x >> 5, left ? 3 : 4);
          c = o === 0 ? OB[1] : o === 5 ? ST[1] : block ? (bk > 0.6 ? FE[2] : ST[1]) : o === 1 ? ST[5] : ST[bk > 0.66 ? 4 : bk > 0.33 ? 3 : 2];
          if (!block && o > 1 && o < 5 && (by % 12) === 1) c = ST[5];
        } else {
          const v = glyph[((x * 2) & 63) + (((y >> 3) * 13 + ly) & 63) * 64], l = lum(v);
          if (ly === 0) c = GL[5];                                                // the nosing catches the light
          else if (ly <= 4) c = l > 230 ? GL[4] : l > 175 ? GL[3] : GL[2];       // the tread
          else if (ly === 7) c = GL[0];                                           // where the riser meets the step below
          else c = l > 200 ? GL[2] : GL[1];                                       // the riser, in shadow
          // each step is cut into slabs: staggered joints and a slightly different stone per slab
          const step = y >> 3, sx2 = (x + (step & 1) * 9 + step * 5) % 13, slab = K.hash2(Math.floor((x + (step & 1) * 9 + step * 5) / 13), step, 23);
          if (sx2 === 0 && ly > 0) c = ly < 5 ? GL[1] : GL[0];
          else if (ly > 0 && ly < 5) c = slab > 0.72 ? shade(c, 1.07) : slab < 0.25 ? shade(c, 0.9) : c;
          const inner = Math.min(eL ? lx - 6 : 99, eR ? 25 - lx : 99);
          if (inner < 2 && ly > 0 && ly < 7) c = shade(c, 0.8);                   // the cheek's shadow on the steps
          if (ly >= 1 && ly <= 4 && inner < 5 && K.hash2(x >> 1, y >> 1, 13) > 0.84) c = FE[(x + y) & 1 ? 3 : 2];   // moss in the corners
        }
      } else c = 0;   // bridges are drawn as props over the void
      // ---- edges of walkable ground
      if (c) {
        const below = T_(x, y + 1), below2 = T_(x, y + 2), above = T_(x, y - 1);
        if (below === VOID) c = OB[1];                                         // the dark edge of the drop
        else if (below2 === VOID && t !== STAIR) c = shade(c, 1.18);           // lit lip
        if ((T_(x - 1, y) === VOID || T_(x + 1, y) === VOID) && t < BH) c = OB[1];
        if (above === VOID && t < BH) c = OB[1];                               // the rim of a ledge seen from behind
        else if (T_(x, y - 2) === VOID && t < BH) c = shade(c, 1.2);
        let wall = 0; for (let d = 1; d <= 6; d++) if (T_(x, y - d) === WALL) { wall = d; break; }
        if (wall) c = shade(c, 0.6 + wall * 0.055);                            // shadow at the foot of the rock
      }
      out[i] = c;
    }
    decorate(def, terr, out, W, H);
    const [cv, cx] = K.canvas(W, H);
    cx.putImageData(img, 0, 0);
    const [lv, lx] = K.canvas(W, H);
    lx.putImageData(low, 0, 0);
    if (valley) undergrowth(lx, terr, up, W, H, CL);
    return { ground: cv, lower: lv, embers };
  }
  // ferns, monstera, taro and hibiscus on the floor far below, hazed by the distance
  function undergrowth(ctx, terr, up, W, H, CL) {
    const r = K.rng(41), floor = (x, y) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return false; const i = y * W + x, v = terr[i]; return (v === VOID || v === BH || v === BV) && up[i] > CL + 2; };
    const kinds = [["flora_fern", 0], ["flora_monstera", 0], ["plant_taro_a", 1], ["bush_hibiscus", 1]];
    for (let k = 0; k < (W * H) / 2600; k++) {
      const x = (r() * W) | 0, y = (r() * H) | 0, [n, sheet] = kinds[(r() * kinds.length) | 0], img = A.img[n];
      const w = sheet ? A.meta[n].fw : img.width, h = sheet ? A.meta[n].fh : img.height;
      if (!floor(x, y) || !floor(x - w / 2, y) || !floor(x + w / 2, y) || !floor(x - w / 2, y - h) || !floor(x + w / 2, y - h) || !floor(x, y - h / 2)) continue;
      ctx.drawImage(hazed(img, n), 0, 0, w, h, Math.round(x - w / 2), Math.round(y - h), w, h);
    }
  }
  // a copy of a sprite pushed into the distance: darker and toward the haze (cached)
  const hazeCache = new Map();
  function hazed(img, key) {
    if (hazeCache.has(key)) return hazeCache.get(key);
    const [c, x] = K.canvas(img.width, img.height); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, img.height), p = d.data, h = PAL.R.haze[2];
    for (let i = 0; i < p.length; i += 4) if (p[i + 3]) for (let j = 0; j < 3; j++) { const v = p[i + j] * 0.74; p[i + j] = v + (h[j] - v) * 0.34; }
    x.putImageData(d, 0, 0); hazeCache.set(key, c); return c;
  }

  // stamped detail: blade clumps, clover, pebbles and tiny blooms (as on the island meadow)
  function decorate(def, terr, out, W, H) {
    const r = K.rng(def.title.length * 97), GR = PAL.packed.grass, SO = PAL.packed.soil, OB = PAL.packed.obsidian;
    const put = (x, y, c, on) => { if (x >= 0 && y >= 0 && x < W && y < H && terr[y * W + x] === on) out[y * W + x] = c; };
    for (let k = 0; k < (W * H) / 140; k++) {
      const x = (r() * W) | 0, y = (r() * H) | 0, t = terr[y * W + x];
      if (t !== GRASS && t !== SOIL) continue;
      const kind = r();
      if (t === GRASS && kind < 0.55) { const n = 2 + ((r() * 3) | 0); for (let b = 0; b < n; b++) { const bx = x + b * 2 - n, h = 2 + ((r() * 3) | 0); put(bx, y, GR[0], GRASS); for (let j = 1; j <= h; j++) put(bx + (j > 1 && r() < 0.5 ? 1 : 0), y - j, j === h ? GR[5] : j === h - 1 ? GR[4] : GR[2], GRASS); } }
      else if (t === GRASS && kind < 0.72) { put(x, y, GR[4], GRASS); put(x + 1, y, GR[4], GRASS); put(x, y - 1, GR[4], GRASS); put(x, y + 1, GR[1], GRASS); }
      else if (t === SOIL && kind < 0.5) { put(x, y, OB[4], SOIL); put(x + 1, y, OB[3], SOIL); put(x, y + 1, SO[0], SOIL); put(x + 1, y + 1, SO[0], SOIL); }
      else if (t === SOIL && kind < 0.75) { for (let j = 0; j < 3; j++) put(x + j - 1, y - (j === 1 ? 1 : 0), GR[j === 1 ? 3 : 2], SOIL); }
      else if (t === GRASS && kind < 0.82) { put(x, y, r() < 0.5 ? K.rgb(250, 236, 120) : K.rgb(250, 250, 240), GRASS); put(x, y + 1, GR[0], GRASS); }
    }
  }

  // vines hang from cliff lips
  function vineSpots(def, terr, up, W, H) {
    const r = K.rng(def.title.length * 13), v = [];
    for (let k = 0; k < (W * H) / 2600; k++) {
      const x = (r() * W) | 0, y = (r() * H) | 0, i = y * W + x;
      if (terr[i] === VOID && up[i] === 1 && walk(terr[i - W])) v.push({ x, y: y + 1, len: 10 + r() * (def.bg === "valley" ? 34 : 50), ph: r() * 6 });
    }
    return v;
  }

  let mistC = null;
  function mist() {
    if (mistC) return mistC;
    const w = 160, h = 56, HZ = PAL.R.haze;
    mistC = Ruins.raster(w, h, (x, y) => { const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2), v = 1 - (dx * dx + dy * dy) + (K.noise(x / 14, y / 10) - 0.5) * 0.6; return v > 0 && PAL.bayer(x, y) + 0.5 < v * 0.9 ? PAL.pk(HZ[5]) : 0; });
    return mistC;
  }

  // ------------------------------------------------------------------ props
  const gateArt = {}, crystalArt = {}, colArt = {};
  let brazArt = null, keeperArt = null, shrineArt = null, tikiArt = null, smallFrames = null;
  // glows are pre-rendered once per size and colour, then stamped with an alpha (building a fresh
  // radial gradient for every mote, crystal and brazier every frame was a steady cost)
  const glowCache = new Map();
  const glowAt = (g, cx, cy, R2, rgb, a) => {
    const R = Math.max(2, Math.round(R2)), key = R + ":" + rgb;
    let c = glowCache.get(key);
    if (!c) { const [cv, x] = K.canvas(R * 2, R * 2), gr = x.createRadialGradient(R, R, 0, R, R, R); gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`); x.fillStyle = gr; x.fillRect(0, 0, R * 2, R * 2); glowCache.set(key, (c = cv)); }
    if (a <= 0) return;
    const ga = g.globalAlpha; g.globalAlpha = Math.min(1, a); g.drawImage(c, cx - R, cy - R); g.globalAlpha = ga;
  };
  function makeProp(p, L) {
    const x = p.x * T, y = p.y * T, o = { x, y, k: p.k };
    const sway = (t, st) => K.sway(o, t, x, y, st || 14, 7, 4);
    switch (p.k) {
      case "gate": {
        const key = p.big ? "big" : "small", G = gateArt[key] || (gateArt[key] = Ruins.gate(!!p.big)), big = !!p.big;
        o.draw = (ctx, ox, oy, t, g) => {
          const X = Math.round(x - G.W / 2 - ox), Y = Math.round(y - G.H - oy + 8), open = big ? L.portalOpen : true;
          ctx.drawImage(G.art, X, Y);
          ctx.drawImage(G.disc.draw(t, open), X + Math.round(G.cx - G.Rr), Y + Math.round(G.cy - G.Rr));
          if (g) {
            const cx = X + G.cx, cy = Y + G.cy;
            glowAt(g, cx, cy, G.Rr * 3, "255,210,120", open ? 0.55 + 0.12 * Math.sin(t * 1.7) : 0.12);
            if (open) { const bg = g.createLinearGradient(cx, cy, cx, cy + G.H * 0.9); bg.addColorStop(0, `rgba(255,220,140,${0.28 + 0.06 * Math.sin(t * 2)})`); bg.addColorStop(1, "rgba(255,220,140,0)"); g.fillStyle = bg; g.beginPath(); g.moveTo(cx - G.Rr * 0.8, cy); g.lineTo(cx + G.Rr * 0.8, cy); g.lineTo(cx + G.Rr * 1.6, cy + G.H); g.lineTo(cx - G.Rr * 1.6, cy + G.H); g.fill(); }
          }
        };
        const pw = big ? 22 : 16;
        o.solids = [[x - G.W / 2 + 2, y - 16, x - G.W / 2 + 6 + pw, y + 6], [x + G.W / 2 - 6 - pw, y - 16, x + G.W / 2 - 2, y + 6]];
        if (big) o.solids.push([x - G.Rr, y - 22, x + G.Rr, y - 10]);
        break;
      }
      case "crystals": {
        const seed = ((p.x * 7 + p.y * 3) | 0) % 4, key = (p.big ? "b" : "s") + seed, C = crystalArt[key] || (crystalArt[key] = Ruins.crystals(seed + (p.big ? 10 : 0), !!p.big));
        const ph = Math.random() * 6, rgb = C.fam === "bio_violet" ? "180,130,255" : C.fam === "bio_blue" ? "110,170,255" : "110,230,220";
        o.draw = (ctx, ox, oy, t, g) => {
          ctx.drawImage(C.frames[Math.floor((t * 2.4 + ph) % 6)], Math.round(x - C.ax - ox), Math.round(y - C.ay - oy));
          if (g) glowAt(g, x - ox, y - oy - C.H * 0.4, C.W * 1.3, rgb, 0.3 + 0.12 * Math.sin(t * 2 + ph));
        };
        o.solids = [[x - C.W * 0.3, y - 5, x + C.W * 0.3, y + 1]];
        break;
      }
      case "brazier": {
        const B2 = brazArt || (brazArt = Ruins.brazier()), ph = Math.random() * 6;
        o.draw = (ctx, ox, oy, t, g) => {
          const X = Math.round(x - B2.W / 2 - ox), Y = Math.round(y - B2.H - oy);
          ctx.drawImage(B2.bowl, X, Y);
          ctx.drawImage(B2.flames[Math.floor(t * 10 + ph) % 6], X + 2, Y - 13);
          if (g) glowAt(g, x - ox, Y - 4, 58, "255,160,70", 0.42 + 0.08 * Math.sin(t * 9 + ph));
        };
        o.solids = [[x - 7, y - 5, x + 7, y + 1]];
        break;
      }
      case "column": {
        const key = ((p.x * 3 + p.y * 5) | 0) % 5, C = colArt[key] || (colArt[key] = Ruins.column(key + 3));
        o.draw = (ctx, ox, oy) => ctx.drawImage(C, Math.round(x - 8 - ox), Math.round(y - C.height + 2 - oy));
        o.solids = [[x - 6, y - 6, x + 6, y + 1]];
        break;
      }
      case "tiki": {
        const ti = tikiArt || (tikiArt = Props.make.tiki());
        o.draw = (ctx, ox, oy) => ctx.drawImage(ti, Math.round(x - 7 - ox), Math.round(y - 26 - oy));
        o.solids = [[x - 6, y - 5, x + 6, y + 1]];
        break;
      }
      case "shrine": {
        const S2 = shrineArt || (shrineArt = Ruins.shrine());
        o.draw = (ctx, ox, oy, t, g) => {
          const X = Math.round(x - S2.width / 2 - ox), Y = Math.round(y - S2.height - oy);
          ctx.drawImage(S2, X, Y);
          if (!L.shrineTaken) {
            const w = Combat.weapons.find((q) => q.id === "heel");
            ctx.drawImage(w.icon, X + S2.width / 2 - 14, Y - 30 + Math.round(Math.sin(t * 2) * 2));
            if (g) glowAt(g, x - ox, Y - 16, 46, "255,140,60", 0.6);
          }
        };
        o.solids = [[x - 15, y - 10, x + 15, y + 1]];
        break;
      }
      case "palm": {
        const th = 38 + ((K.hash2(p.x * 10, p.y * 10, 1) * 18) | 0), tr = A.img.trunk_a, cr = K.hash2(p.x, p.y, 4) > 0.5 ? "crown_a" : "crown_d_f", cm = A.meta[cr];
        o.draw = (ctx, ox, oy, t) => {
          const bx = Math.round(x - ox), by = Math.round(y - oy);
          ctx.drawImage(tr, 0, tr.height - th, tr.width, th, bx - 5, by - th, tr.width, th);
          const s = sway(t, 6), f = s.level * 4 + s.flutter;
          ctx.drawImage(A.img[cr], f * cm.fw, 0, cm.fw, cm.fh, bx - cm.px, by - th + 2 - cm.py, cm.fw, cm.fh);
        };
        o.solids = [[x - 4, y - 4, x + 4, y + 1]];
        break;
      }
      case "smallplant": {
        const img = A.img.plant_monstera_a, B3 = smallFrames || (smallFrames = Props.bendFrames(img, 2, 7));
        o.draw = (ctx, ox, oy, t) => { const s2 = sway(t, 14); ctx.drawImage(B3.frames[s2.level], Math.round(x - img.width / 2 - B3.pad - ox), Math.round(y - img.height + 3 - oy)); };
        o.solids = [[x - 12, y - 6, x + 12, y + 1]];
        break;
      }
      case "fern": case "monstera": {
        const img = A.img[p.k === "fern" ? "flora_fern" : "flora_monstera"], B3 = Props.bendFrames(img, 3, 7);
        o.draw = (ctx, ox, oy, t) => { const s = sway(t, 12); ctx.drawImage(B3.frames[s.level], Math.round(x - img.width / 2 - B3.pad - ox), Math.round(y - img.height + 4 - oy)); };
        o.solids = [[x - 22, y - 10, x + 22, y + 1]];
        break;
      }
      case "hibiscus": case "taro": {
        const n = p.k === "hibiscus" ? "bush_hibiscus" : "plant_taro_a", m = A.meta[n], hw = p.k === "taro" ? 18 : 22;
        o.draw = (ctx, ox, oy, t) => { const s = sway(t, p.k === "taro" ? 9 : 18), f = s.level * 4 + s.flutter; ctx.drawImage(A.img[n], f * m.fw, 0, m.fw, m.fh, Math.round(x - m.px - ox), Math.round(y - m.py + 2 - oy), m.fw, m.fh); };
        o.solids = [[x - hw, y - 10, x + hw, y + 1]];
        break;
      }
      case "boulder": {
        const s = p.s || 1, w = [14, 20, 28, 36][s], h = [10, 15, 21, 27][s], img = Props.make.boulder(w, h, (x * 31 + y) | 0, true);
        o.draw = (ctx, ox, oy) => ctx.drawImage(img, Math.round(x - img.width / 2 - ox), Math.round(y - img.height + 3 - oy));
        o.solids = [[x - w * 0.42, y - h * 0.35, x + w * 0.42, y + 1]];
        break;
      }
    }
    return o;
  }

  // ------------------------------------------------------------------ load / queries
  Level.load = function (name) {
    const def = DEFS[name];
    const b = Level.baked[name] || (Level.baked[name] = bake(def));
    if (!keeperArt) keeperArt = Ruins.keeper();
    const L = { name, def, ...b, props: [], npcs: [], enemies: [], shots: [], fx: [], pickups: [], seals: [],
      portalOpen: !(def.portal && def.portal.needsTalk) || !!Level.portalUnlocked, shrineTaken: !!Level.heelTaken,
      arenas: (def.arenas || []).map((a) => ({ ...a, waves: arenaWaves(a.waves), state: "idle", wave: -1, live: [], sealT: 0 })), banner: null };
    for (const p of def.props) L.props.push(makeProp(p, L));
    for (const n of def.npcs || []) {
      const npc = { ...n, x: n.x * T, y: n.y * T, kind: "npc", phase: Math.random() * 6, lines: n.lines };
      npc.draw = (ctx, ox, oy, t, g) => drawKeeper(npc, ctx, ox, oy, t, g);
      L.npcs.push(npc);
    }
    const np = Level.players || 1;
    Enemies.hpScale = np >= 3 ? COOP.hp3 : np === 2 ? COOP.hp : 1; Enemies.bossScale = np;
    if (!Level.netGuest) for (const e of coopRoster(def.enemies || [], b)) { const en = Enemies.spawn(e.e, e.x * T, e.y * T, e.tribe || 0, L); if (en) L.enemies.push(en); }
    L.solids = [];
    for (const p of L.props) if (p.solids) L.solids.push(...p.solids);
    for (const n of L.npcs) L.solids.push([n.x - 7, n.y - 5, n.x + 7, n.y + 1]);
    L.spawn = { x: def.spawn.x * T, y: def.spawn.y * T };
    L.birds = def.bg === "valley" ? Array.from({ length: 9 }, () => ({ x: Math.random() * b.W, y: Math.random() * b.H, a: Math.random() * 6, sp: 22 + Math.random() * 12, ph: Math.random() * 6, h: def.cliff * (0.35 + Math.random() * 0.4) })) : [];
    L.air = makeAir(L);
    Level.cur = L;
    return L;
  };
  // the life in the air. Highlands: gnat clouds over the plants, butterflies, darting dragonflies,
  // and glowing motes drifting over the forest far below. Sanctum: embers rising out of the depths.
  function makeAir(L) {
    const r = K.rng(L.name.length * 31), W = L.W, H = L.H, CL = L.def.cliff, air = { gnats: [], flies: [], drags: [], motes: [] };
    const overFloor = (x, y) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return false; const i = y * W + x; return !walk(L.terr[i]) && L.terr[i] !== WALL && L.up[i] > CL; };
    const onGround = (x, y) => walk(tAt0(L, x, y));
    if (L.def.bg === "valley") {
      for (const p of L.props) if (/fern|palm|taro|hibiscus|monstera/.test(p.k) && r() < 0.6) air.gnats.push({ x: p.x + (r() - 0.5) * 20, y: p.y - 4, n: 7 + ((r() * 6) | 0), ph: r() * 9 });
      for (let k = 0; k < 400 && air.flies.length < 18; k++) { const x = r() * W, y = r() * H; if (onGround(x, y)) air.flies.push({ x, y, hx: x, hy: y, a: r() * 6, sp: r() * 9, col: (r() * 3) | 0, z: 10 + r() * 8 }); }
      for (let k = 0; k < 400 && air.drags.length < 10; k++) { const x = r() * W, y = r() * H; if (onGround(x, y)) air.drags.push({ x, y, hx: x, hy: y, tx: x, ty: y, wait: r() * 2, a: 0, z: 14 }); }
      for (let k = 0; k < 3000 && air.motes.length < 90; k++) { const x = r() * W, y = r() * H; if (overFloor(x, y)) air.motes.push({ x, y, ph: r() * 9, sp: 0.5 + r() }); }
    } else {
      for (let k = 0; k < 3000 && air.motes.length < 70; k++) { const x = r() * W, y = r() * H; if (overFloor(x, y)) air.motes.push({ x, y, y0: y, ph: r() * 9, sp: 6 + r() * 10, ember: 1 }); }
    }
    return air;
  }
  const tAt0 = (L, x, y) => { x |= 0; y |= 0; return x < 0 || y < 0 || x >= L.W || y >= L.H ? VOID : L.terr[y * L.W + x]; };
  const tAt = (x, y) => { const L = Level.cur; x |= 0; y |= 0; return x < 0 || y < 0 || x >= L.W || y >= L.H ? VOID : L.terr[y * L.W + x]; };
  Level.tileAt = tAt;
  Level.walkable = (x, y) => walk(tAt(x, y));
  Level.isVoid = (x, y) => tAt(x, y) === VOID;
  Level.solidAt = function (x, y) {
    const L = Level.cur, cx = Math.floor(x / L.CS), cy = Math.floor(y / L.CS);
    if (cx < 0 || cy < 0 || cx >= L.CW || cy >= L.CH || L.solid[cy * L.CW + cx]) return true;
    for (const b of L.solids) if (x > b[0] && x < b[2] && y > b[1] && y < b[3]) return true;
    for (const s of L.seals) if (x > s[0] && x < s[2] && y > s[1] && y < s[3]) return true;
    return false;
  };
  Level.sight = function (x0, y0, x1, y1) {
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 10);
    for (let k = 1; k < n; k++) if (tAt(x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n) === WALL) return false;
    return true;
  };
  Level.flyBlocked = (x, y) => tAt(x, y) === WALL;

  // ------------------------------------------------------------------ co-op scaling
  // Each extra hero adds about half as many creatures again, and each is a little tougher. The extra
  // creatures are spread out over the ground around the ones they are copied from (not stacked on
  // them), so a bigger crowd arrives as a wider front instead of a single clump. With three heroes,
  // arenas get one more wave rather than ever more creatures per wave. Bosses and mini-bosses
  // (spec `boss: true`) instead get one health bar per hero: see Enemies.bossScale.
  const COOP = { extra: 0.5, hp: 1.25, hp3: 1.4 };
  Level.COOP = COOP;
  function coopRoster(list, b) {
    const np = Level.players || 1;
    if (np < 2 || !list.length) return list;
    const out = list.slice(), n = Math.round(list.length * COOP.extra * (np - 1)), r = K.rng(list.length * 7 + 3 + np);
    const ok = (x, y) => { x = (x * T) | 0; y = (y * T) | 0; return x > 0 && y > 0 && x < b.W && y < b.H && walk(b.terr[y * b.W + x]); };
    const clear = (x, y, gap) => out.every((o) => Math.hypot(o.x - x, (o.y - y) / 0.8) > gap);
    for (let k = 0; k < n; k++) {
      const src = list[Math.floor((k + 0.5) * list.length / n) % list.length];
      let placed = false;
      for (let tries = 0; tries < 40 && !placed; tries++) {
        const a = r() * 6.28, d = 1.6 + r() * (1.4 + np * 0.6), x = src.x + Math.cos(a) * d, y = src.y + Math.sin(a) * d * 0.75;
        if (ok(x, y) && ok(x - 0.3, y) && ok(x + 0.3, y) && clear(x, y, tries < 30 ? 1.3 : 0.8)) { out.push({ ...src, x, y }); placed = true; }
      }
    }
    return out;
  }
  // with three heroes an arena gains a final wave, mixed from the creatures of the ones before it
  function arenaWaves(waves) {
    if ((Level.players || 1) < 3 || !waves.length) return waves;
    const mix = [];
    waves.forEach((w, wi) => w.forEach((s, i) => { if ((i + wi) % 2 === 0) mix.push({ ...s, tribe: s.tribe ? s.tribe + 40 : 0 }); }));
    return waves.concat([mix]);
  }

  // ------------------------------------------------------------------ arenas, pickups, birds (per frame)
  Level.update = function (dt, t, P0, api, others) {
    const L = Level.cur, heroes = [P0].concat(others || []);
    updateAir(L, dt, t);
    for (const bd of L.birds) { bd.a += Math.sin(t * 0.3 + bd.ph) * 0.15 * dt; bd.x += Math.cos(bd.a) * bd.sp * dt; bd.y += Math.sin(bd.a) * bd.sp * dt * 0.6; if (bd.x < -200) bd.x += L.W + 400; if (bd.x > L.W + 200) bd.x -= L.W + 400; if (bd.y < -200) bd.y += L.H + 400; if (bd.y > L.H + 200) bd.y -= L.H + 400; }
    if (Level.netGuest) { for (const a of L.arenas) if (a.state === "active" && !a.sealT0) { a.sealT0 = 1; a.sealT = t; } else if (a.state !== "active") a.sealT0 = 0; return; }
    for (const a of L.arenas) {
      const [x0, y0, x1, y1] = a.rect;
      // the trap springs only once a hero is well inside: clear of every doorway it will seal
      const isIn = (q) => q.x > x0 * T && q.x < (x1 + 1) * T && q.y > y0 * T && q.y < (y1 + 1) * T;
      const P = heroes.find((q) => !q.dead && isIn(q) && a.seals.every((s) => { const cx = K.clamp(q.x, s[0] * T, s[2] * T), cy = K.clamp(q.y, s[1] * T, s[3] * T); return Math.hypot(q.x - cx, q.y - cy) > 2.2 * T; }));
      if (a.state === "idle" && P) {
        a.state = "active"; a.wave = -1; a.next = t + 0.5; a.sealT = t;
        L.seals = a.seals.map((s) => [s[0] * T, s[1] * T, s[2] * T, s[3] * T]);
        const mx = (x0 + x1 + 1) / 2 * T, my = (y0 + y1 + 1) / 2 * T;
        for (const q of heroes) {
          // a partner left outside is pulled in beside the one who sprang it
          if (q !== P && !isIn(q)) { const off = (heroes.indexOf(q) % 2 ? 18 : -18) * (heroes.indexOf(q) > 1 ? 1.8 : 1); api.teleport(q, P.x + off, P.y); if (!q.isRemote) { q.x = P.x + off; q.y = P.y; } }
          // and nobody is ever sealed inside a doorway
          for (let k = 0; k < 200 && !q.isRemote && L.seals.some((s) => q.x > s[0] - 8 && q.x < s[2] + 8 && q.y > s[1] - 6 && q.y < s[3] + 6); k++) { const a2 = Math.atan2(my - q.y, mx - q.x); q.x += Math.cos(a2) * 2; q.y += Math.sin(a2) * 2; }
        }
        L.banner = { title: a.title, t0: t };
        api.sfx("sealUp"); api.sfx("warcry");
      }
      if (a.state === "active" && a.live.filter((e) => !e.dead).length === 0 && t > a.next) {
        a.wave++;
        if (a.wave >= a.waves.length) {
          a.state = "done"; L.seals = []; api.sfx("sealDown");
          L.banner = { title: "THE WAY IS OPEN", t0: t };
          const Pc = heroes.find((q) => !q.dead) || P0, nb = 3 + 2 * (heroes.length - 1);
          for (let k = 0; k < nb; k++) L.pickups.push({ x: Pc.x + (k - (nb - 1) / 2) * 18, y: Pc.y - 16, t0: t, vy: -60 });
          Combat.momentum = Math.min(100, Combat.momentum + 30);
        } else {
          a.live = coopRoster(a.waves[a.wave], L).map((s) => { const e = Enemies.spawn(s.e, s.x * T, s.y * T, s.tribe || 0, L); e.enter = s.enter || "leap"; e.introT = 0.9; e.alerted = true; L.enemies.push(e); return e; });
          a.next = t + 1.2;
          if (a.wave > 0) api.sfx("warcry");
        }
      }
    }
    for (const b of L.pickups) {
      if (b.vy !== undefined) { b.vy += 220 * dt; b.y += b.vy * dt; if (b.vy > 0 && t - b.t0 > 0.3) delete b.vy; }
      for (const q of heroes) if (!b.got && !q.dead && Math.hypot(q.x - b.x, q.y - 8 - b.y) < 14) { b.got = true; api.heal(2, q); api.sfx("berry"); }
    }
    L.pickups = L.pickups.filter((b) => !b.got && t - b.t0 < 40);
  };
  // the parts of a level the guest needs from the host each tick
  Level.serialize = function (L) {
    return { pk: L.pickups.map((b) => [Math.round(b.x), Math.round(b.y), b.vy !== undefined ? 1 : 0]), se: L.seals, ar: L.arenas.map((a) => a.state), po: L.portalOpen ? 1 : 0, sh: L.shrineTaken ? 1 : 0 };
  };
  Level.applySnap = function (L, S, t) {
    L.pickups = S.pk.map(([x, y]) => ({ x, y, t0: t }));
    L.seals = S.se; S.ar.forEach((st, i) => { if (L.arenas[i]) L.arenas[i].state = st; });
    if (S.po) L.portalOpen = true; if (S.sh) L.shrineTaken = true;
  };
  function updateAir(L, dt, t) {
    const A2 = L.air;
    for (const f of A2.flies) { f.a += (K.noise(t * 0.4 + f.sp * 7, f.sp) - 0.5) * 6 * dt; const dh = Math.hypot(f.hx - f.x, f.hy - f.y); if (dh > 80) f.a += Math.sin(Math.atan2(f.hy - f.y, f.hx - f.x) - f.a) * 2 * dt; f.x += Math.cos(f.a) * 16 * dt; f.y += Math.sin(f.a) * 11 * dt; }
    for (const d of A2.drags) {
      if (d.wait > 0) { d.wait -= dt; if (d.wait <= 0) { const a = Math.random() * 6.28, rr = 20 + Math.random() * 60; d.tx = d.hx + Math.cos(a) * rr; d.ty = d.hy + Math.sin(a) * rr * 0.7; d.a = Math.atan2(d.ty - d.y, d.tx - d.x); } }
      else { const k = Math.min(1, dt * 7); d.x += (d.tx - d.x) * k; d.y += (d.ty - d.y) * k; if (Math.hypot(d.tx - d.x, d.ty - d.y) < 1) d.wait = 0.5 + Math.random() * 1.6; }
    }
    for (const m of A2.motes) if (m.ember) { m.y -= m.sp * dt; if (m.y0 - m.y > L.def.cliff * 0.9) m.y = m.y0; }
  }
  Level.dropBerry = (x, y, t) => Level.cur.pickups.push({ x, y: y - 10, t0: t, vy: -70 });

  // ------------------------------------------------------------------ drawing
  Level.drawBack = function (ctx, ox, oy, LW, LH, t) {
    const L = Level.cur, B2 = L.below, CL = L.def.cliff;
    ctx.drawImage(L.lower, ox, oy, LW, LH, 0, 0, LW, LH);
    // bridge shadows fall on the ground far below
    eachBridge(ox, oy, LW, LH + CL, (v, X, Y) => { ctx.fillStyle = "rgba(6,10,8,0.32)"; if (v === BH) ctx.fillRect(X + 5, Y + 7 + CL, T, 20); else ctx.fillRect(X + 9, Y + 4 + CL, 20, T); });
    // the forest below: island palms, swaying in the same wind as everything else
    for (const p of B2.palms) {
      if (p.x < ox - 40 || p.x > ox + LW + 40 || p.y < oy - 10 || p.y - p.th - 50 > oy + LH) continue;
      const m = A.meta[p.cr], tr = hazed(A.img.trunk_a, "trunk"), cr = hazed(A.img[p.cr], p.cr), bx = Math.round(p.x - ox), by = Math.round(p.y - oy);
      ctx.drawImage(tr, 0, tr.height - p.th, tr.width, p.th, bx - 5, by - p.th, tr.width, p.th);
      const s2 = K.sway(p, t, p.x, p.y, 6, 7, 4), f = s2.level * 4 + s2.flutter;
      ctx.drawImage(cr, f * m.fw, 0, m.fw, m.fh, bx - m.px, by - p.th + 2 - m.py, m.fw, m.fh);
    }
    // birds gliding below you, their shadows on the canopy
    for (const bd of L.birds) {
      const gx = Math.round(bd.x - ox), gy = Math.round(bd.y - oy), by = gy - Math.round(bd.h);
      if (gx < -20 || gx > LW + 20 || by < -20 || gy > LH + 20) continue;
      const up = Math.sin(t * 4 + bd.ph) > 0.2, d = Math.cos(bd.a) > 0 ? 1 : -1;
      ctx.fillStyle = "rgba(6,10,8,0.28)"; ctx.fillRect(gx - 3, gy, 7, 1);
      ctx.fillStyle = PAL.css(PAL.R.haze[1]); ctx.fillRect(gx - 4, by + (up ? -1 : 1), 2, 1); ctx.fillRect(gx + 3, by + (up ? -1 : 1), 2, 1);
      ctx.fillStyle = PAL.css(PAL.R.haze[5]); ctx.fillRect(gx - 2, by, 5, 1); ctx.fillRect(gx - 3, by + (up ? -1 : 0), 1, 1); ctx.fillRect(gx + 3, by + (up ? -1 : 0), 1, 1); ctx.fillRect(gx + d * 2, by - 1, 1, 1);
    }
    // glowing motes drifting over the forest below / embers rising from the volcano's depths
    for (const m of L.air.motes) {
      const x = m.ember ? m.x + Math.sin(t * 1.3 + m.ph) * 3 : m.x + Math.sin(t * 0.4 * m.sp + m.ph) * 10, y = m.ember ? m.y : m.y + Math.sin(t * 0.3 * m.sp + m.ph * 2) * 6;
      if (x < ox - 4 || x > ox + LW + 4 || y < oy - 4 || y > oy + LH + 4) continue;
      const on = Math.sin(t * (m.ember ? 6 : 1.7) + m.ph) > (m.ember ? -0.4 : 0.1);
      if (on) { ctx.fillStyle = m.ember ? PAL.css(PAL.R.fire[(m.ph * 3 | 0) % 2 + 2]) : PAL.css(PAL.R.sun[5]); ctx.fillRect(Math.round(x - ox), Math.round(y - oy), 1, 1); }
    }
    // low mist drifting over the forest floor
    const mc = mist();
    for (const m of B2.mists) {
      const mx = ((m.x + t * m.sp * (K.W ? 0.5 + K.W.x : 1)) % (L.W + 200)) - 100;
      if (mx < ox - 170 || mx > ox + LW + 10 || m.y < oy - 60 || m.y > oy + LH + 10) continue;
      ctx.globalAlpha = m.a; ctx.drawImage(mc, Math.round(mx - ox), Math.round(m.y - oy)); ctx.globalAlpha = 1;
    }
    // the ledges, walls and paths you walk on
    ctx.drawImage(L.ground, ox, oy, LW, LH, 0, 0, LW, LH);
    eachBridge(ox, oy, LW, LH, (v, X, Y, tx, ty) => ctx.drawImage(bridgeTile(v, (tx * 7 + ty * 3) % 3), X, Y));
    for (const v of L.vines) if (v.x > ox - 10 && v.x < ox + LW + 10 && v.y > oy - 60 && v.y < oy + LH + 10) Ruins.drawVine(ctx, v.x - ox, v.y - oy, v.len, t, v.ph);
    for (const b of L.pickups) { const bob = b.vy === undefined ? Math.round(Math.sin(t * 3 + b.x) * 1.5) : 0; ctx.drawImage(Ruins.berry, Math.round(b.x - 4 - ox), Math.round(b.y - 6 - oy + bob)); }
  };
  function eachBridge(ox, oy, LW, LH, fn) {
    const tm = Level.cur.tm;
    for (let ty = Math.max(0, ((oy - Level.cur.def.cliff) / T) | 0); ty <= Math.min(tm.th - 1, ((oy + LH) / T) | 0); ty++) for (let tx = Math.max(0, (ox / T - 1) | 0); tx <= Math.min(tm.tw - 1, ((ox + LW) / T) | 0); tx++) {
      const v = tm.at(tx, ty); if (v === BH || v === BV) fn(v, tx * T - ox, ty * T - oy, tx, ty);
    }
  }
  // rope bridges planked like the Hale Koa floor: koa boards with a lit edge, dark seams, grain and
  // knots, lashed with twisted lauhala rope to posts. Gaps between boards show the drop beneath.
  const bridgeTiles = {};
  function bridgeTile(v, variant) {
    const key = v + ":" + variant; if (bridgeTiles[key]) return bridgeTiles[key];
    const [c, x] = K.canvas(T, T), rect = (col, a, b, w, h) => { x.fillStyle = col; if (v === BH) x.fillRect(a, b, w, h); else x.fillRect(b, a, h, w); };
    const PL = ["#5a3220", "#6c3c24", "#7a4628", "#86502e"], SEAM = "#3a1e12", LIT = "#9a6038", GRAIN = "#4a2816", POST = "#2a160c", ROPE = ["#a07a44", "#d8b470"];
    for (let a = 0, k = 0; a < T; a += 6, k++) {
      const h = (n) => K.hash2(variant * 9 + k, n, v), t0 = 5 + (h(1) > 0.6 ? 1 : 0), t1 = 27 - (h(2) > 0.7 ? 1 : 0), base = PL[(h(3) * 4) | 0];
      rect(base, a, t0, 5, t1 - t0);
      rect(LIT, a, t0, 5, 1); rect(SEAM, a + 4, t0, 1, t1 - t0); rect(SEAM, a, t1 - 1, 5, 1);
      for (let g = 0; g < 2; g++) { const gx = a + 1 + ((h(4 + g) * 3) | 0), gy = t0 + 2 + ((h(6 + g) * 10) | 0); rect(GRAIN, gx, gy, 1, 4 + ((h(8 + g) * 5) | 0)); }
      if (h(10) > 0.78) { rect(SEAM, a + 1, t0 + 9, 2, 2); rect(LIT, a + 1, t0 + 9, 1, 1); }     // a knot
    }
    // lashing: two twisted ropes along the edges, tied off at a post each tile
    for (let a = 0; a < T; a++) { const sag = Math.round(Math.sin((a / T) * Math.PI) * 1.2); rect(ROPE[(a >> 1) & 1], a, 3 + sag, 1, 1); rect(ROPE[(a >> 1) & 1], a, 28 + sag, 1, 1); rect(SEAM, a, 4 + sag, 1, 1); rect(SEAM, a, 29 + sag, 1, 1); }
    for (const b of [1, 26]) { rect(POST, 0, b, 3, 5); rect(LIT, 0, b, 3, 1); rect(ROPE[1], 0, b + 2, 3, 1); }
    bridgeTiles[key] = c; return c;
  }
  // flying insects, drawn over everything on the ground
  Level.drawAir = function (ctx, ox, oy, t, LW, LH) {
    const A2 = Level.cur.air, OB0 = PAL.css(PAL.R.obsidian[1]);
    ctx.fillStyle = OB0;
    for (const g of A2.gnats) {
      if (g.x < ox - 20 || g.x > ox + LW + 20 || g.y < oy - 30 || g.y > oy + LH + 10) continue;
      for (let k = 0; k < g.n; k++) { const a = t * (2.2 + k * 0.37) + k * 2.4 + g.ph; ctx.fillRect(Math.round(g.x + Math.sin(a) * (4 + k % 4) - ox), Math.round(g.y - 12 + Math.sin(a * 1.3 + k) * 4 - oy), 1, 1); }
    }
    for (const f of A2.flies) {
      if (f.x < ox - 10 || f.x > ox + LW + 10 || f.y < oy - 30 || f.y > oy + LH + 10) continue;
      ctx.drawImage(Props.butterflyFrames[f.col][Math.floor(t * 9 + f.sp) % 2], Math.round(f.x - 2 - ox), Math.round(f.y - f.z - oy - Math.abs(Math.sin(t * 3 + f.sp)) * 3));
    }
    for (const d of A2.drags) {
      if (d.x < ox - 10 || d.x > ox + LW + 10 || d.y < oy - 30 || d.y > oy + LH + 10) continue;
      const x = Math.round(d.x - ox), y = Math.round(d.y - d.z - oy + Math.sin(t * 3 + d.hx) * 1), ux = Math.cos(d.a), uy = Math.sin(d.a);
      for (let k = -3; k <= 2; k++) { ctx.fillStyle = PAL.css(k > 1 ? PAL.R.feather[0] : PAL.R.bio_teal[k > -2 ? 5 : 4]); ctx.fillRect(Math.round(x + ux * k), Math.round(y + uy * k), 1, 1); }
      ctx.fillStyle = Math.sin(t * 60 + d.hx) > 0 ? "rgba(230,246,240,0.85)" : "rgba(230,246,240,0.35)";
      for (const s2 of [-1, 1]) { ctx.fillRect(Math.round(x - uy * s2 * 2), Math.round(y + ux * s2 * 2), 1, 1); ctx.fillRect(Math.round(x - uy * s2 * 3 + ux), Math.round(y + ux * s2 * 3 + uy), 1, 1); }
      ctx.fillStyle = "rgba(6,10,8,0.25)"; ctx.fillRect(Math.round(d.x - ox) - 1, Math.round(d.y - oy), 3, 1);
    }
  };
  Level.drawables = function () { const L = Level.cur; return L.props.concat(L.npcs); };
  // shafts of sun spilling in from above, with dust turning in them
  Level.drawLight = function (g, ox, oy, t) {
    const L = Level.cur;
    for (const s of L.def.shafts || []) {
      const x = s.x * T - ox, y = s.y * T - oy, L2 = s.len * T, w = s.w * T, a = s.ang, dx = Math.sin(a), dy = Math.cos(a), nx = dy, ny = -dx, fl = 0.85 + 0.15 * Math.sin(t * 0.7 + s.x);
      const gr = g.createLinearGradient(x, y, x + dx * L2, y + dy * L2); gr.addColorStop(0, `rgba(255,226,150,${0.4 * fl})`); gr.addColorStop(0.7, `rgba(255,210,130,${0.16 * fl})`); gr.addColorStop(1, "rgba(255,210,130,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - nx * w * 0.35, y - ny * w * 0.35); g.lineTo(x + nx * w * 0.35, y + ny * w * 0.35); g.lineTo(x + dx * L2 + nx * w * 0.6, y + dy * L2 + ny * w * 0.6); g.lineTo(x + dx * L2 - nx * w * 0.6, y + dy * L2 - ny * w * 0.6); g.fill();
      for (let k = 0; k < 16; k++) { const u = ((k * 0.137 + t * 0.03) % 1), v = Math.sin(k * 7.1 + t * 0.4) * 0.45, px = x + dx * L2 * u + nx * w * v * (0.35 + u * 0.25), py = y + dy * L2 * u + ny * w * v * (0.35 + u * 0.25); g.fillStyle = `rgba(255,245,210,${0.55 * (1 - u)})`; g.fillRect(Math.round(px), Math.round(py), 1, 1); }
    }
    for (const b of L.pickups) glowAt(g, b.x - ox, b.y - oy - 4, 14, "255,120,110", 0.45);
    for (const m of L.air.motes) { const x = m.x - ox, y = m.y - oy; if (x < -10 || x > 490 || y < -10 || y > 280) continue; if (Math.sin(t * (m.ember ? 6 : 1.7) + m.ph) > (m.ember ? -0.4 : 0.1)) glowAt(g, x + (m.ember ? 0 : Math.sin(t * 0.4 * m.sp + m.ph) * 10), y, m.ember ? 6 : 5, m.ember ? "255,140,60" : "255,230,140", m.ember ? 0.5 : 0.35); }
    for (const [ex, ey] of L.embers) { if (ex < ox - 30 || ex > ox + 510 || ey < oy - 30 || ey > oy + 300) continue; glowAt(g, ex - ox, ey - oy, 18, "255,110,40", 0.16 + 0.1 * Math.sin(t * 1.3 + ex * 0.1)); }
  };
  Level.drawSeals = function (ctx, g, ox, oy, t) {
    const L = Level.cur;
    for (const a of L.arenas) if (a.state === "active") { const life = Math.min(1, (t - a.sealT) * 2); for (const s of L.seals) Ruins.drawSeal(ctx, g, s[0] - ox, s[1] - oy - 18, s[2] - ox, s[3] - oy, t, life); }
  };
  // the keeper breathes, blinks, his cloak stirs in gusts, his staff's little sun turns and pulses
  function drawKeeper(n, ctx, ox, oy, t, g) {
    const fr = keeperArt, ph = t + n.phase;
    const f = ph % 4.2 < 0.15 ? 2 : Math.sin(ph * 1.6) > 0.2 ? 1 : K.W && K.W.x > 0.55 && Math.sin(ph * 5) > 0 ? 3 : 0;
    const X = Math.round(n.x - 12 - ox), Y = Math.round(n.y - 31 - oy);
    ctx.drawImage(fr[f], X, Y);
    const sx = X + 21, sy = Y + 6, p = 0.5 + 0.5 * Math.sin(t * 2.2);
    ctx.fillStyle = PAL.css(PAL.R.koa[0]); ctx.fillRect(sx - 1, sy, 3, 27); ctx.fillStyle = PAL.css(PAL.R.koa[3]); ctx.fillRect(sx, sy, 1, 27);
    for (let a = 0; a < 8; a++) { const ang = (a / 8) * Math.PI * 2 + t * 0.6; ctx.fillStyle = PAL.css(PAL.R.sun[a % 2 ? 3 : 4]); ctx.fillRect(Math.round(sx + Math.cos(ang) * 4), Math.round(sy - 3 + Math.sin(ang) * 4), 1, 1); }
    ctx.fillStyle = PAL.css(PAL.R.sun[0]); ctx.fillRect(sx - 2, sy - 5, 5, 5); ctx.fillStyle = PAL.css(PAL.R.sun[p > 0.5 ? 6 : 5]); ctx.fillRect(sx - 1, sy - 4, 3, 3);
    if (g) glowAt(g, sx, sy - 3, 22, "255,214,120", 0.45 + 0.2 * p);
  }
  Level.T = T;
})();
