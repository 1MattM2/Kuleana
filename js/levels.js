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
  Level.assets = () => A;

  // water (zone 2): shallow and medium water can be waded (medium slowly); deep water is the edge of the world
  // (zone 2 land: c = pink coral rock, the atolls' ground; b = basalt flagstones, the thermal cliffs' ground)
  const VOID = 0, WALL = 1, SOIL = 2, GRASS = 3, SAND = 4, PATH = 5, SUN = 6, PAVE = 7, STAIR = 8, BH = 9, BV = 10, SHAL = 11, MED = 12, DEEP = 13, CORAL = 14, BASALT = 15, WOOD = 16;
  const CH = { "#": WALL, " ": VOID, ".": SOIL, ",": GRASS, ":": SAND, "=": PATH, o: SUN, "%": PAVE, S: STAIR, H: BH, V: BV, _: SHAL, "-": MED, "~": DEEP, c: CORAL, b: BASALT, w: WOOD };
  const walk = (v) => v >= SOIL && v !== DEEP;
  const isWet = (v) => v >= SHAL && v <= DEEP;
  const soft = (v) => v < PATH || v >= SHAL;          // terrain whose borders are drawn organic (not carved)
  Level.T_ = { VOID, WALL, SOIL, GRASS, SAND, PATH, SUN, PAVE, STAIR, BH, BV, SHAL, MED, DEEP, CORAL, BASALT, WOOD, walk, isWet };

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
      title: "VOLCANIC HIGHLANDS", sub: "Where the sun first touched stone", zone: 1, level: 1, bg: "valley", cliff: 104, wallFace: 24, ivy: 0.3,
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
        { title: "THE HOLLOW OF KŪ", rect: [7, 6, 27, 20], seals: [[27.4, 11, 28.4, 14.6]], unlocks: "canopy",
          waves: [
            [{ e: "spear", x: 15, y: 9, tribe: 4, enter: "leap" }, { e: "spear", x: 20, y: 9, tribe: 4, enter: "leap" }, { e: "dart", x: 12, y: 12, tribe: 4, enter: "leap" }, { e: "dart", x: 23, y: 12, tribe: 4, enter: "leap" }, { e: "vine", x: 11, y: 16.8, enter: "burst" }, { e: "vine", x: 23.6, y: 16.4, enter: "burst" }],
            [{ e: "wisp", x: 13, y: 12, enter: "descend" }, { e: "wisp", x: 22, y: 12, enter: "descend" }, { e: "spear", x: 17.5, y: 9, tribe: 5, enter: "leap" }, { e: "spear", x: 12, y: 15, tribe: 5, enter: "leap" }, { e: "dart", x: 23, y: 15, tribe: 5, enter: "leap" }, { e: "gecko", x: 9, y: 13, enter: "scurry" }, { e: "gecko", x: 25, y: 16, enter: "scurry" }],
          ] },
      ],
      gates: [{ x: 14.5, y: 44.4, to: "sanctum" }, { x: 10.4, y: 8.8, to: "sanctum" }],
      shrine: { x: 7.6, y: 11.2, unlock: "newa" },
    },
    canopy: {
      title: "CANOPY PASSES", sub: "Forest on the mountains' backs", bg: "valley", cliff: 110, wallFace: 26, ivy: 0.5, amb: "highlands", zone: 1, level: 2,
      map: [
        "   ###########################                                          ",
        "   ###########################                                          ",
        "                                                                        ",
        "        ,,,,    ,,,,,,                                                  ",
        "      ,,,,,,,,,,,,,,,,,,,,                                              ",
        "     ,,,,,,,,,,,,,,,,,,,,,,                                             ",
        "     ,,,,,,,........,,,,,,,,                                            ",
        "     ,,,,,............,,,,,,                                            ",
        "      ,,,,............,,,,,,                                            ",
        "      ,,,,,............,,,,                                             ",
        "        ,,,,........,,,,,                                               ",
        "         ,,,,,.,...,,,,                                                 ",
        "      ,,,,,,,,,,,,,,,,                                                  ",
        "      ,,,,, ,,,,,,,,,                                                   ",
        "       SSS       ,,,                                                    ",
        "       SSS                     ############################             ",
        "  #####SSS#####                ############################             ",
        "  ###,,SSS#####                ############################             ",
        "    ,,,,,,,                               ,,     ,,,,,,                 ",
        "    ,,,,,,,,                          ,,,,,,,,,,,,,,,,,,                ",
        "   ,,,,,,,,,,                     ,,,,,,,,,,,,,,,,:,,,,,,               ",
        "   ,,,,,,,,,,,                 ,,,,,,,,,,,,,,,,:::::::,,,               ",
        "   ,,,,,,,,,,,,               ,,,,,,,,,,,,,,,.::::::::,,,,              ",
        "   ,,,,,,,,,,,,              ,,,,,,,,,,,.......:::::::,,,,              ",
        "   ,,,,.,,,,,,,,HHHHHHHHHHHHHH,,,,,,,............::.,,,,,               ",
        "  ,,,.....,,,,,,HHHHHHHHHHHHHH,,,,,,................,,,,,               ",
        "  ,,......,,,,,,HHHHHHHHHHHHHH,,,,,,................,,,,                ",
        "   ,,.....,,,,,              ,,,,,,,,................,,,                ",
        "   ,,,,,,,,,,,                ,,,,,,,,..............,,,,                ",
        "    ,,,,,,                     ,,,,,,,,,..........,,,,,                 ",
        "     ,,,,,                        ,,,,,,,,,.,.,,,,,,,,,                 ",
        "      ,,                             ,,,,,,,,,,,,,,,,,,                 ",
        "                                      ,,,,,,,,,,,,,,,,                  ",
        "                                       ,,,,,,,,,,,,,,                   ",
        "                                        ,,,,,,,,,,,                     ",
        "                                          ,,,,,                         ",
        "                                           VVV                          ",
        "                                           VVV                          ",
        "                                           VVV                          ",
        "                                           VVV                          ",
        "                                           VVV                          ",
        "                                           VVV                          ",
        "                                           VVV                          ",
        "                                           VVV                          ",
        "   ####################             ######,,,,,######                   ",
        "   #######,############             ######,,,,,######                   ",
        "   #####,,,,,##########                  ,,,,,,                         ",
        "        ,,,,,,,,                        ,,,,,,                          ",
        "       ,,,,,,,,,,,,                   ,,,,,,,,,,,,,                     ",
        "       ,,,,,,,,,,,,,                 ,,,,,,,,,,,,,,,,                   ",
        "     ,,,,,,,,,,,,,,,,,              ,,,,,,.....,,,,,,,                  ",
        "    ,,,,,,,,,,,,,,,,,,HHHHHHHHHHHHHH,,,,,.......,,,,,,                  ",
        "    ,,,,,,,,,,,,,,,,,,HHHHHHHHHHHHHH,,,,,........,,,,,                  ",
        "   ,,,,,,,.,.,,,,,,,,,HHHHHHHHHHHHHH,,,,,.......,,,,,                   ",
        "    ,,,,.........,,,,,              ,,,,,,.....,,,,,,                   ",
        "    ,,............,,,,                ,,,,,,,,,,,,,,                    ",
        "     ,,...........,,,                 ,,,,,,,,,,,,,                     ",
        "       ,,,,..   ,,,                    ,,,,,,,,,,                       ",
        "         ,,,                           ,,,,                             ",
        "                                                                        ",
        "                                                                        ",
        "                                                                        ",
      ],
      spawn: { x: 12, y: 53 },
      props: [{k: "taro", x: 24.8, y: 7.9}, {k: "boulder", x: 36.8, y: 26.7, s: 1}, {k: "palm", x: 8.9, y: 53.2}, {k: "fern", x: 9.1, y: 27.9}, {k: "fern", x: 22.5, y: 8.4}, {k: "smallplant", x: 10.3, y: 6.4}, {k: "palm", x: 48.0, y: 21.6}, {k: "hibiscus", x: 48.1, y: 32.8}, {k: "palm", x: 37.5, y: 22.9}, {k: "taro", x: 50.2, y: 31.0}, {k: "smallplant", x: 16.0, y: 54.0}, {k: "palm", x: 51.2, y: 52.3}, {k: "palm", x: 33.7, y: 22.5}, {k: "palm", x: 40.5, y: 49.0}, {k: "smallplant", x: 48.2, y: 50.1}, {k: "palm", x: 5.4, y: 52.1}, {k: "smallplant", x: 5.9, y: 27.0}, {k: "fern", x: 46.6, y: 49.3}, {k: "smallplant", x: 35.9, y: 29.0}, {k: "boulder", x: 43.6, y: 31.1, s: 2}, {k: "smallplant", x: 9.1, y: 4.8}, {k: "hibiscus", x: 50.2, y: 50.8}, {k: "fern", x: 8.4, y: 7.3}, {k: "palm", x: 5.5, y: 54.2}, {k: "palm", x: 7.1, y: 24.4}, {k: "hibiscus", x: 46.6, y: 54.3}, {k: "boulder", x: 35.7, y: 22.3, s: 1}, {k: "monstera", x: 9.0, y: 51.5}, {k: "palm", x: 17.1, y: 56.5}, {k: "taro", x: 11.2, y: 7.9}, {k: "hibiscus", x: 52.7, y: 25.1}, {k: "fern", x: 52.5, y: 19.7}, {k: "smallplant", x: 12.0, y: 22.4}, {k: "palm", x: 46.1, y: 20.5}, {k: "monstera", x: 48.5, y: 53.6}, {k: "fern", x: 53.1, y: 22.9}, {k: "taro", x: 40.9, y: 31.9}, {k: "palm", x: 18.0, y: 50.8}, {k: "smallplant", x: 54.8, y: 22.0}, {k: "palm", x: 18.1, y: 55.4}, {k: "palm", x: 8.2, y: 56.4}, {k: "smallplant", x: 15.9, y: 51.0}, {k: "palm", x: 20.5, y: 9.7}, {k: "fern", x: 34.3, y: 27.5}, {k: "fern", x: 39.1, y: 23.4}, {k: "hibiscus", x: 54.9, y: 25.7}, {k: "fern", x: 39.1, y: 49.5}, {k: "palm", x: 8.7, y: 29.6}, {k: "fern", x: 51.9, y: 28.1}, {k: "palm", x: 40.5, y: 30.0}, {k: "palm", x: 6.5, y: 55.8}, {k: "fern", x: 49.5, y: 26.1}, {k: "palm", x: 49.9, y: 54.9}, {k: "hibiscus", x: 19.7, y: 11.4}, {k: "smallplant", x: 55.0, y: 20.3}, {k: "taro", x: 10.8, y: 20.7}, {k: "monstera", x: 10.1, y: 55.5}, {k: "monstera", x: 52.4, y: 30.6}, {k: "fern", x: 8.3, y: 26.3}, {k: "palm", x: 39.5, y: 28.3}, {k: "boulder", x: 11.1, y: 9.6, s: 2}, {k: "palm", x: 41.2, y: 33.8}, {k: "smallplant", x: 26.6, y: 7.0}, {k: "hibiscus", x: 38.6, y: 25.9}, {k: "palm", x: 6.7, y: 22.5}, {k: "palm", x: 34.6, y: 23.8}, {k: "fern", x: 47.2, y: 56.2}, {k: "fern", x: 46.2, y: 30.9}, {k: "hibiscus", x: 40.5, y: 54.6}, {k: "fern", x: 53.8, y: 29.8}, {k: "hibiscus", x: 7.8, y: 5.8}, {k: "fern", x: 14.7, y: 55.0}, {k: "fern", x: 38.4, y: 29.5}, {k: "monstera", x: 17.2, y: 53.0}, {k: "palm", x: 42.6, y: 55.4}, {k: "taro", x: 40.6, y: 51.0}, {k: "palm", x: 6.6, y: 6.8}, {k: "palm", x: 39.2, y: 20.8}, {k: "boulder", x: 33.7, y: 25.9, s: 2}, {k: "palm", x: 50.4, y: 28.4}, {k: "smallplant", x: 49.0, y: 34.0}, {k: "smallplant", x: 4.1, y: 26.2}, {k: "monstera", x: 48.7, y: 23.4}, {k: "fern", x: 50.8, y: 22.0}, {k: "taro", x: 37.4, y: 24.7}, {k: "smallplant", x: 44.1, y: 20.7}, {k: "smallplant", x: 15.6, y: 49.4}, {k: "palm", x: 39.4, y: 52.7}, {k: "smallplant", x: 42.1, y: 56.9}, {k: "fern", x: 9.5, y: 47.7}, {k: "monstera", x: 50.1, y: 20.6}, {k: "monstera", x: 45.2, y: 55.1}, {k: "taro", x: 22.0, y: 10.3}, {k: "taro", x: 48.2, y: 51.9}, {k: "fern", x: 12.9, y: 11.5}, {k: "boulder", x: 7.4, y: 54.4, s: 1}, {k: "palm", x: 42.3, y: 48.9}, {k: "fern", x: 6.1, y: 28.7}, {k: "palm", x: 33.0, y: 28.8}, {k: "monstera", x: 49.0, y: 30.0}, {k: "hibiscus", x: 12.2, y: 5.3}, {k: "taro", x: 51.6, y: 32.5}, {k: "smallplant", x: 11.4, y: 11.1}, {k: "taro", x: 5.2, y: 23.2}, {k: "fern", x: 9.1, y: 21.8}, {k: "hibiscus", x: 7.5, y: 51.6}, {k: "hibiscus", x: 53.0, y: 26.9}, {k: "smallplant", x: 51.0, y: 24.0}, {k: "fern", x: 10.8, y: 27.8}, {k: "palm", x: 18.5, y: 13.1}, {k: "smallplant", x: 38.6, y: 51.3}, {k: "smallplant", x: 52.8, y: 51.2}, {k: "palm", x: 41.4, y: 20.2}, {k: "fern", x: 19.9, y: 55.8}, {k: "monstera", x: 51.7, y: 53.9}, {k: "boulder", x: 9.6, y: 9.0, s: 1}, {k: "palm", x: 8.6, y: 49.7}, {k: "taro", x: 13.8, y: 12.9}, {k: "fern", x: 40.8, y: 21.9}, {k: "smallplant", x: 38.1, y: 53.7}, {k: "gate", x: 12, y: 49.2}, {k: "gate", x: 22, y: 4.6}, {k: "tiki", x: 8.6, y: 50.4}, {k: "tiki", x: 15.6, y: 50.4}, {k: "column", x: 37.6, y: 48.8}, {k: "column", x: 37.6, y: 55.4}, {k: "brazier", x: 40, y: 47.8}, {k: "brazier", x: 48, y: 47.8}, {k: "column", x: 33, y: 20.2}, {k: "column", x: 55, y: 20.2}, {k: "tiki", x: 44, y: 19.4}, {k: "crystals", big: 1, x: 26, y: 6.2}, {k: "crystals", x: 7, y: 6.4}, {k: "brazier", x: 19.4, y: 4.4}, {k: "brazier", x: 24.6, y: 4.4}],
      enemies: [{e: "gecko", x: 9, y: 54}, {e: "gecko", x: 15, y: 55}, {e: "vine", x: 6, y: 52}, {e: "snake", x: 44, y: 40}, {e: "snake", x: 17, y: 24.6}, {e: "dart", x: 10, y: 20, tribe: 12}, {e: "snake", x: 11, y: 28}, {e: "snake", x: 20, y: 25}, {e: "snake", x: 26, y: 24.5}, {e: "gecko", x: 23, y: 25.6}, {e: "snake", x: 6, y: 22}, {e: "vine", x: 10, y: 21}, {e: "dart", x: 5, y: 26, tribe: 12}, {e: "spear", x: 9, y: 27, tribe: 12}, {e: "gecko", x: 4, y: 24}],
      arenas: [
        { title: "THE PASS OF WINDS", rect: [36, 45, 53, 58], seals: [[35.2, 50.6, 36.2, 54.2], [41.6, 43.4, 46.4, 44.4]],
          waves: [[{e: "snake", x: 41, y: 50, enter: "scurry"}, {e: "snake", x: 47, y: 54, enter: "scurry"}, {e: "snake", x: 44, y: 49, enter: "scurry"}, {e: "gecko", x: 40, y: 54, enter: "scurry"}, {e: "gecko", x: 48, y: 50, enter: "scurry"}],
                  [{e: "spear", x: 42, y: 49, tribe: 11}, {e: "spear", x: 46, y: 49, tribe: 11}, {e: "dart", x: 40, y: 52, tribe: 11}, {e: "dart", x: 49, y: 53, tribe: 11}, {e: "spear", x: 44, y: 48.6, tribe: 11}, {e: "vine", x: 44, y: 55, enter: "burst"}, {e: "vine", x: 39, y: 50, enter: "burst"}],
                  [{e: "snake", x: 40, y: 51, enter: "scurry"}, {e: "snake", x: 48, y: 53, enter: "scurry"}, {e: "wisp", x: 44, y: 50, enter: "descend"}, {e: "wisp", x: 42, y: 54, enter: "descend"}, {e: "snake", x: 46, y: 51, enter: "scurry"}, {e: "dart", x: 50, y: 51, tribe: 13}]] },
        { title: "THE THUNDERING RIDGE", sub: "Survive the stampede", rect: [30, 18, 58, 33], seals: [[41.6, 33.2, 46.4, 34.2], [29.6, 22.6, 30.6, 27.4]], survive: 34, herd: 1.3,
          waves: [[{e: "gecko", x: 38, y: 23, enter: "scurry"}, {e: "gecko", x: 50, y: 23, enter: "scurry"}, {e: "gecko", x: 40, y: 29, enter: "scurry"}, {e: "gecko", x: 48, y: 29, enter: "scurry"}],
                  [{e: "snake", x: 44, y: 22, enter: "scurry"}, {e: "snake", x: 38, y: 29, enter: "scurry"}, {e: "gecko", x: 36, y: 26, enter: "scurry"}, {e: "gecko", x: 52, y: 26, enter: "scurry"}],
                  [{e: "vine", x: 38, y: 27, enter: "burst"}, {e: "vine", x: 50, y: 27, enter: "burst"}, {e: "gecko", x: 44, y: 30, enter: "scurry"}]] },
        { title: "THE GARDEN OF MANY HEADS", rect: [5, 2, 27, 13], seals: [[5.6, 12.6, 10.4, 13.4]], unlocks: "crown", reward: "armor:kapa",
          waves: [[{e: "hydra", x: 16, y: 7.5, enter: "burst"}, {e: "vine", x: 8, y: 6, enter: "burst"}, {e: "vine", x: 24, y: 9, enter: "burst"}]] },
      ],
      gates: [{ x: 12, y: 50.4, to: "sanctum" }, { x: 22, y: 5.8, to: "sanctum" }],
    },
    crown: {
      title: "THE SCORCHED CROWN", sub: "Where the mountain still burns", bg: "scorched", scorch: true, cliff: 104, wallFace: 24, ivy: 0.05, amb: "sanctum", zone: 1, level: 3,
      map: [
        "                                    #################################   ",
        "                                    #################################   ",
        "                                                   ::                   ",
        "                                            :::::::::::                 ",
        "                                          :::::::::::::::               ",
        "                                         :::::::::::::::::::::::::::    ",
        "                                        ::::::::::::::::::::::::::::::  ",
        "                                       :::::::::::oooooo::::::::::::::: ",
        "                                       :::::::::ooooooooo:::::::::::::: ",
        "                                       ::::::::ooooooooooo::::::::::::: ",
        "                                        ::::::::ooooooooo:::::::::::::: ",
        "                                        :::::::::ooooooo::::::::::::::  ",
        "                                         ::::::::::::::::::::::::::::   ",
        "                                         :::::::::::::::::::::::::      ",
        "                                          :::::::::::::::::::::         ",
        "                                           :::::::::  ::: :::::         ",
        "                                             ::::         :::::         ",
        "                                                           VVV          ",
        "                                                           VVV          ",
        "                                                           VVV          ",
        "                                                           VVV          ",
        "                                                     ######VVV#######   ",
        "                     ###########################     #####:::::######   ",
        "                     ###########################          :::::::::     ",
        "                     ###########################          :::::::::     ",
        "                              ::::    ::::::           :::::::::::::    ",
        "                         ::::::::::::::::::::         ::::::::::::::    ",
        "                       :::::::::::::::::::::::        ::::::::::::::    ",
        "                      :::::::::::o::::::::::::       ::::::::::::::::   ",
        "                     :::::::::oooooooo::::::::::     ::::::......::::   ",
        "                     :::::::::ooooooooo:::::::::HHHHH:::::.......::::   ",
        "                     :::::::::ooooooooo:::::::::HHHHH:::::........:::   ",
        "                     :::::::::ooooooooo:::::::::HHHHH::::........::::   ",
        "                       ::::::::ooooooo::::::::::      :::::......:::    ",
        "                         ::::::::::o::::::::           :::::..:::::     ",
        "                            :::::::::::::::               ::::::::      ",
        "                              ::::::::::::                 :::::::      ",
        "                              :::::::::                     :::::       ",
        "                                :::::                         ::        ",
        "                                 SSS                                    ",
        "                                 SSS                                    ",
        "                                 SSS                                    ",
        "   ###################           SSS                                    ",
        "   ###################          :::::                                   ",
        "   #######::::::######          :::::                                   ",
        "        :::::::::            ::::::::::::::                             ",
        "       ::::::::::        :::::::::::::::::::                            ",
        "      ::::::::::::      :::::::::::::::::::::                           ",
        "      ::::::::::::::   ::::::::::::::::::::::                           ",
        "     ::::::::::::::::::::::::::::.......::::                            ",
        "    ::::::.:::::::::::::::::::::.........:::                            ",
        "    :::.......::::::::::::::::::.........::                             ",
        "    :::........:::::::   :::::::.........:                              ",
        "    :::.......:::::::       :::::.......:                               ",
        "    :::::::.::::::::         ::::::::::::                               ",
        "      :::::::::::             ::::::::::                                ",
        "                               :::::::                                  ",
        "                                                                        ",
        "                                                                        ",
        "                                                                        ",
      ],
      spawn: { x: 12, y: 51 },
      sun: { x: 34, y: 31 }, sun2: { x: 52, y: 9 },
      props: [{k: "crystals", x: 58.9, y: 26.0, big: 1}, {k: "boulder", x: 9.5, y: 53.1, s: 1}, {k: "boulder", x: 38.2, y: 51.2, s: 2}, {k: "brazier", x: 26.1, y: 27.2}, {k: "smallplant", x: 64.5, y: 24.4}, {k: "tiki", x: 28.8, y: 29.0}, {k: "crystals", x: 64.4, y: 34.0, big: 1}, {k: "boulder", x: 43.9, y: 32.7, s: 1}, {k: "crystals", x: 60.6, y: 10.9, big: 1}, {k: "tiki", x: 58.7, y: 12.1}, {k: "crystals", x: 62.2, y: 28.6}, {k: "smallplant", x: 7.4, y: 49.2}, {k: "crystals", x: 17.1, y: 54.0}, {k: "crystals", x: 40.2, y: 26.8, big: 1}, {k: "tiki", x: 43.6, y: 5.9}, {k: "boulder", x: 63.0, y: 30.6, s: 2}, {k: "boulder", x: 15.3, y: 54.8, s: 2}, {k: "smallplant", x: 7.0, y: 52.2}, {k: "crystals", x: 61.3, y: 8.3, big: 1}, {k: "crystals", x: 50.5, y: 14.8}, {k: "crystals", x: 59.4, y: 29.3}, {k: "crystals", x: 30.9, y: 27.1}, {k: "brazier", x: 32.8, y: 50.3}, {k: "column", x: 42.6, y: 10.8}, {k: "boulder", x: 8.9, y: 47.0, s: 1}, {k: "brazier", x: 28.7, y: 47.2}, {k: "boulder", x: 44.2, y: 8.5, s: 1}, {k: "crystals", x: 37.0, y: 48.6}, {k: "column", x: 47.3, y: 14.7}, {k: "crystals", x: 34.8, y: 47.8}, {k: "crystals", x: 28.6, y: 32.2}, {k: "smallplant", x: 63.7, y: 36.7}, {k: "boulder", x: 17.9, y: 52.1, s: 2}, {k: "crystals", x: 40.7, y: 51.7}, {k: "crystals", x: 13.2, y: 54.1}, {k: "smallplant", x: 61.4, y: 33.6}, {k: "tiki", x: 36.5, y: 27.1}, {k: "boulder", x: 36.3, y: 55.8, s: 2}, {k: "crystals", x: 20.9, y: 51.7}, {k: "crystals", x: 45.3, y: 11.5, big: 1}, {k: "crystals", x: 37.2, y: 46.6, big: 1}, {k: "tiki", x: 62.7, y: 24.2}, {k: "crystals", x: 42.2, y: 31.5, big: 1}, {k: "crystals", x: 66.4, y: 11.3}, {k: "crystals", x: 46.0, y: 5.6}, {k: "crystals", x: 63.3, y: 12.4}, {k: "boulder", x: 59.6, y: 34.6, s: 2}, {k: "boulder", x: 58.3, y: 6.8, s: 1}, {k: "crystals", x: 67.3, y: 9.4, big: 1}, {k: "crystals", x: 64.7, y: 7.3}, {k: "tiki", x: 66.9, y: 28.4}, {k: "crystals", x: 30.0, y: 51.6, big: 1}, {k: "smallplant", x: 58.1, y: 31.2}, {k: "smallplant", x: 47.6, y: 6.5}, {k: "column", x: 69.7, y: 8.5}, {k: "crystals", x: 67.8, y: 7.6}, {k: "column", x: 44.7, y: 14.8}, {k: "crystals", x: 32.3, y: 46.7}, {k: "boulder", x: 28.0, y: 49.3, s: 2}, {k: "crystals", x: 7.5, y: 54.4, big: 1}, {k: "brazier", x: 64.7, y: 27.0}, {k: "brazier", x: 60.1, y: 32.1}, {k: "brazier", x: 38.4, y: 53.2}, {k: "crystals", x: 65.9, y: 32.6}, {k: "crystals", x: 24.4, y: 30.8}, {k: "boulder", x: 26.1, y: 33.4, s: 2}, {k: "crystals", x: 57.3, y: 13.9}, {k: "boulder", x: 56.8, y: 28.5, s: 1}, {k: "brazier", x: 64.4, y: 10.9}, {k: "crystals", x: 36.8, y: 36.2}, {k: "tiki", x: 11.0, y: 55.0}, {k: "crystals", x: 38.6, y: 35.9}, {k: "tiki", x: 34.7, y: 54.6}, {k: "brazier", x: 66.6, y: 30.3}, {k: "crystals", x: 22.2, y: 31.5}, {k: "tiki", x: 40.6, y: 48.5}, {k: "crystals", x: 34.5, y: 51.7}, {k: "crystals", x: 32.4, y: 52.5}, {k: "crystals", x: 62.8, y: 26.3}, {k: "boulder", x: 15.6, y: 52.5, s: 1}, {k: "gate", x: 12, y: 47.2}, {k: "gate", x: 45, y: 5.4}, {k: "brazier", x: 42, y: 5.6}, {k: "brazier", x: 48, y: 5.6}],
      enemies: [{e: "firegecko", x: 9, y: 52}, {e: "firegecko", x: 15, y: 53}, {e: "firedancer", x: 36, y: 49}, {e: "firegecko", x: 30, y: 51}, {e: "firegecko", x: 40, y: 52}, {e: "firegecko", x: 33, y: 47}, {e: "wisp", x: 38, y: 48}, {e: "wisp", x: 60, y: 27}, {e: "wisp", x: 64, y: 32}, {e: "wisp", x: 57, y: 33}, {e: "firegecko", x: 62, y: 29}, {e: "firegecko", x: 58, y: 30}, {e: "firedancer", x: 63, y: 34}],
      arenas: [
        { title: "THE DANCE OF EMBERS", rect: [21, 24, 47, 39], seals: [[31.6, 37.6, 36.4, 38.4], [46.6, 28.6, 47.6, 33.4]],
          waves: [[{e: "firedancer", x: 29, y: 29}, {e: "firedancer", x: 39, y: 29}, {e: "firegecko", x: 27, y: 33, enter: "scurry"}, {e: "firegecko", x: 41, y: 33, enter: "scurry"}],
                  [{e: "wisp", x: 30, y: 28, enter: "descend"}, {e: "wisp", x: 38, y: 28, enter: "descend"}, {e: "wisp", x: 34, y: 34, enter: "descend"}, {e: "firedancer", x: 34, y: 27}, {e: "firegecko", x: 25, y: 31, enter: "scurry"}],
                  [{e: "firedancer", x: 28, y: 32}, {e: "firedancer", x: 40, y: 32}, {e: "spear", x: 31, y: 27, tribe: 21}, {e: "spear", x: 37, y: 27, tribe: 21}, {e: "dart", x: 34, y: 35, tribe: 21}]] },
        { title: "KAHU-AHI", rect: [38, 2, 70, 17], seals: [[57.6, 16.6, 62.4, 17.4]], final: 1, unlocks: "isles", reward: "rescue:vendor",
          waves: [[{e: "hive", x: 52, y: 9.4, enter: "burst"}]] },
      ],
      gates: [{ x: 12, y: 48.4, to: "sanctum" }, { x: 45, y: 6.6, to: "sanctum" }],
    },
  };
  Level.DEFS = DEFS;

  // ------------------------------------------------------------------ terrain
  function tileMap(def) {
    const rows = def.map, tw = rows[0].length, th = rows.length, g = new Uint8Array(tw * th);
    rows.forEach((r, y) => { for (let x = 0; x < tw; x++) g[y * tw + x] = CH[r[x]] === undefined ? WALL : CH[r[x]]; });
    const at = (x, y) => (x < 0 || y < 0 || x >= tw || y >= th ? VOID : g[y * tw + x]);
    // remove lonely walkable specks (they read as floating dirt)
    for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) if (walk(at(x, y)) && at(x, y) < PATH && !def.sea) { let n = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (walk(at(x + dx, y + dy))) n++; if (n <= 1) g[y * tw + x] = VOID; }
    return { tw, th, g, at };
  }

  function bake(def) {
    const tm = tileMap(def), W = tm.tw * T, H = tm.th * T, N = W * H;
    // tiles near carved things keep straight edges (so bridges and stairs always connect)
    const straight = new Uint8Array(tm.tw * tm.th);
    for (let y = 0; y < tm.th; y++) for (let x = 0; x < tm.tw; x++) {
      const v = tm.at(x, y); if (!soft(v)) continue;
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
        if (!soft(t0) || straight[ty * tm.tw + tx] || def.indoor) { terr[y * W + x] = t0; continue; }   // Hale Koa's halls are built square
        const j = (y >> 2) * gw + (x >> 2), px = x + ofx[j], py = y + ofy[j];
        const t1 = tm.at(Math.floor(px / T), Math.floor(py / T));
        terr[y * W + x] = soft(t1) ? t1 : t0;
      }
    }
    // At sea, the coast is rounded off: where the map's tiles step diagonally the shore came out in hard
    // stair-steps, so the land/water outline is blurred and re-thresholded, and each pixel that changes
    // side takes the ground (or water) nearest it. Carved things (stairs, bridges, walls) are left alone.
    if (def.sea) {
      const R = 9, land = new Float32Array(N);
      for (let i = 0; i < N; i++) land[i] = isWet(terr[i]) ? 0 : 1;
      const tmp = new Float32Array(N), sm = new Float32Array(N), n2 = 2 * R + 1;
      for (let pass = 0; pass < 2; pass++) {
        const src = pass ? sm : land;
        for (let y = 0; y < H; y++) { let acc = 0; const row = y * W; for (let x = -R; x <= R; x++) acc += src[row + Math.min(W - 1, Math.max(0, x))]; for (let x = 0; x < W; x++) { tmp[row + x] = acc / n2; acc += src[row + Math.min(W - 1, x + R + 1)] - src[row + Math.max(0, x - R)]; } }
        for (let x = 0; x < W; x++) { let acc = 0; for (let y = -R; y <= R; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x]; for (let y = 0; y < H; y++) { sm[y * W + x] = acc / n2; acc += tmp[Math.min(H - 1, y + R + 1) * W + x] - tmp[Math.max(0, y - R) * W + x]; } }
      }
      const fixed = (v) => v === WALL || v === STAIR || v === BH || v === BV || v === WOOD || v === PAVE || v === SUN || v === PATH;
      const out = terr.slice();
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x, v = terr[i], isL = land[i] > 0.5, want = sm[i] > 0.5;
        if (isL === want || fixed(v) || straight[(y >> 5) * tm.tw + (x >> 5)]) continue;
        // the nearest pixel already of the wanted kind (and not a carved one) lends its ground
        let got = -1;
        for (let r2 = 1; r2 <= 14 && got < 0; r2++) for (let k = 0; k < 8 * r2 && got < 0; k++) {
          const a = (k / (8 * r2)) * Math.PI * 2, xx = Math.round(x + Math.cos(a) * r2), yy = Math.round(y + Math.sin(a) * r2);
          if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
          const w = terr[yy * W + xx]; if (fixed(w)) continue;
          if (want ? !isWet(w) : isWet(w)) got = w;
        }
        if (got >= 0) out[i] = got;
      }
      terr.set(out);
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
    const { ground, lower, embers, chunks } = paint(def, tm, terr, up, down, W, H, dn);
    const vines = def.sea ? [] : vineSpots(def, terr, up, W, H);
    const water = def.sea && window.Sea ? Sea.buildWater(def, terr, W, H) : null;
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
    return { tm, terr, up, W, H, CS, CW, CH: CHh, solid, ground, lower, embers, chunks, vines, below, water };
  }

  // ------------------------------------------------------------------ painting the ground
  function paint(def, tm, terr, up, down, W, H, dn) {
    const pk = K.rgb;
    const OB = PAL.packed.obsidian, SO = PAL.packed.soil, GR = PAL.packed.grass, SA = PAL.packed.sand, GL = PAL.packed.glyph, ST = PAL.packed.stone, FE = PAL.packed.fern, HZ = PAL.packed.haze;
    const rock = A.px.tex_rock.data, grassT = A.px.tex_grass.data, sandT = A.px.tex_sand.data, glyph = A.px.tex_glyph.data;
    const pebT = A.px.tex_pebble && A.px.tex_pebble.data, pinkT = A.px.tex_pinkcoral && A.px.tex_pinkcoral.data;
    const deadT = A.px.tex_coraldead && A.px.tex_coraldead.data, liveT = A.px.tex_corallive && A.px.tex_corallive.data;
    const CORAL_R = [K.rgb(160, 104, 120), K.rgb(184, 126, 140), K.rgb(204, 148, 158), K.rgb(220, 168, 174), K.rgb(234, 190, 190)];
    // a 64px texture laid in big patches, each shifted and sometimes mirrored, so its repeat never shows
    const patch64 = (x, y, salt) => {
      const pcx = Math.floor((x + K.noise(x / 40, y / 40) * 46) / 150), pcy = Math.floor((y + K.noise(x / 40 + 70, y / 40) * 46) / 150);
      let u = (x + ((K.hash2(pcx, pcy, salt) * 64) | 0)) & 63; if (K.hash2(pcx, pcy, salt + 17) > 0.5) u = 63 - u;
      return u | (((y + ((K.hash2(pcx, pcy, salt + 9) * 64) | 0)) & 63) << 6);
    };
    // basalt, after the concept: fitted flagstones of dark slate, each its own tone, bevelled to the light
    const BAS = [[22, 24, 24], [36, 38, 36], [50, 52, 48], [64, 66, 60], [80, 82, 74], [100, 100, 90], [124, 122, 108]].map((q) => pk(q[0], q[1], q[2]));
    const stoneAt = (x, y, cell) => {
      const gx0 = Math.floor(x / cell), gy0 = Math.floor(y / cell);
      let d1 = 1e9, d2 = 1e9, id = 0, fx = 0, fy = 0;
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
        const cx = gx0 + i, cy = gy0 + j, px2 = (cx + 0.15 + K.hash2(cx, cy, 81) * 0.7) * cell, py2 = (cy + 0.15 + K.hash2(cx, cy, 82) * 0.7) * cell * 0.9;
        const d = Math.hypot(x - px2, (y - py2) * 1.1);
        if (d < d1) { d2 = d1; d1 = d; id = cx * 7919 + cy; fx = px2; fy = py2; } else if (d < d2) d2 = d;
      }
      return { edge: d2 - d1, id, dx: x - fx, dy: y - fy };
    };
    const basaltAt = (x, y) => {
      const s2 = stoneAt(x + K.noise(x / 9, y / 9) * 3, y + K.noise(x / 9 + 40, y / 9) * 3, 15), tone = K.hash2(s2.id, 3, 5);
      if (s2.edge < 1.3) return BAS[0];
      if (s2.edge < 2.4) return s2.dx + s2.dy < 0 ? BAS[4 + (tone > 0.6 ? 1 : 0)] : BAS[1];          // bevel: lit up-left, shadowed down-right
      let ix = 2 + ((tone * 2.99) | 0);
      const n = K.noise(x / 3.5, y / 3.5) + B(x, y) * 0.2; if (n > 0.72) ix++; else if (n < 0.22) ix--;
      if (K.hash2(x >> 1, y >> 1, s2.id & 255) > 0.985) ix = 1;                                       // a pit in the stone
      return BAS[Math.max(1, Math.min(6, ix))];
    };
    const toBasalt = (v) => BAS[Math.max(0, Math.min(6, Math.round(lum(v) / 255 * 7.4) - 1))];
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
        if (def.scorch) { c = mixc(c, OB[1], 0.45); if (K.hash2(x, y, 61) > 0.996) c = PAL.pk(PAL.R.fire[2]); }
      } else if (t === GRASS) {
        c = grassT[ti];
        const v = K.fbm(x / 140 + 300, y / 140, 3) * 0.72 + K.noise(x / 46, y / 46) * 0.28 + B(x, y) * 0.07;
        if (v < 0.38) c = shade(c, 0.82); else if (v > 0.66) c = shade(c, 1.08);
      } else {
        c = sandT[ti];
        // the archipelago's beaches: drifts of pebbled sand (lava pebbles, white shell grit) among the plain
        if (def.sea && pebT) { const pb = K.fbm(x / 110 + 61, y / 110, 3) + (B(x, y) + 0.5) * 0.06; if (pb > (def.pebbles || 0.54)) c = pebT[patch64(x, y, 11)]; else if (pb > (def.pebbles || 0.54) - 0.03 && K.hash2(x, y, 12) > 0.6) c = pebT[patch64(x, y, 11)]; }
        if (def.scorch) {
          // sun-baked ash sand: dulled toward the volcanic soil, burnt in dark drifts, with cinders in it
          const b = K.fbm(x / 60 + 40, y / 60, 3), fine = K.noise(x / 5, y / 5);
          c = mixc(shade(c, 0.86), SO[3], 0.38);
          if (b < 0.5) c = mixc(c, OB[1], Math.min(0.75, (0.5 - b) * 2.6 + (PAL.bayer(x, y) + 0.5) * 0.08));
          if (fine > 0.72 && b < 0.55) c = mixc(c, OB[2], 0.5);
          if (K.hash2(x, y, 77) > 0.997) c = PAL.pk(PAL.R.fire[K.hash2(x, y, 78) > 0.5 ? 2 : 3]);
        }
      }
      // grass gets the island's dark rim against other ground; sand darkens toward soil
      if (def.sea && window.Sea) { const sc = Sea.shore(t, x, y, c, T_); if (sc) c = sc; }
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
    const embers = [];
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
    // The ground is painted in chunks, on demand: the ones in view at once, the rest a few at a time
    // in spare frame time (Level.idle). Entering an area no longer stalls on painting all of it.
    const [cv, gx] = K.canvas(W, H), [lv, lx] = K.canvas(W, H);
    const CHK = 128, ncx = Math.ceil(W / CHK), ncy = Math.ceil(H / CHK), done = new Uint8Array(ncx * ncy);
    const deco = decorate(def, terr, W, H, CHK, ncx, ncy), plants = valley ? undergrowth(terr, up, W, H, CL) : [];
    function chunk(ci, cj) {
      if (ci < 0 || cj < 0 || ci >= ncx || cj >= ncy || done[cj * ncx + ci]) return false;
      done[cj * ncx + ci] = 1;
      const x0 = ci * CHK, y0 = cj * CHK, cw = Math.min(CHK, W - x0), ch = Math.min(CHK, H - y0);
      const img = new ImageData(cw, ch), out = new Uint32Array(img.data.buffer), low = new ImageData(cw, ch), lo = new Uint32Array(low.data.buffer);
      for (let y = y0; y < y0 + ch; y++) for (let x = x0; x < x0 + cw; x++) {
        const i = y * W + x, li = (y - y0) * cw + (x - x0), t = terr[i];
        let c = 0;
        if (t === VOID || t === BH || t === BV) {
          const k = up[i];
          if (k > CL) {
            // beside a ledge's east or west edge: the rock flank of the cliff, a few pixels of it
            let side = 9, st = 0; for (let dd = 1; dd <= 4 && side === 9; dd++) { const a2 = T_(x - dd, y), b2 = T_(x + dd, y); if ((a2 !== VOID && a2 !== BH && a2 !== BV) || (b2 !== VOID && b2 !== BH && b2 !== BV)) { side = dd; st = a2 === STAIR || b2 === STAIR; } }
            const g2 = dn[i], below0 = T_(x, y + g2);
            if (g2 <= 2 && below0 === GRASS && K.noise(x * 0.4, 51) > 0.45) { lo[li] = g2 === 1 ? GR[1] : GR[0]; continue; }      // grass hanging over the lip
            let c2 = side === 1 ? OB[0] : side <= 4 ? (st ? (side === 2 ? ST[2] : ST[1]) : valley ? mixc(OB[side === 2 ? 3 : 2], HZ[2], 0.25) : OB[side === 2 ? 2 : 1]) : lowerFloor(x, y, k - CL);
            if (g2 <= 12 && side > 4) c2 = shade(c2, 0.45 + g2 * 0.045);                 // hidden in the shadow of the ledge in front
            lo[li] = c2;
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
          lo[li] = c; continue;
        }
        if (t === WALL && def.indoor) {
          // indoors (Hale Koa's halls): woven lauhala walls between koa posts, under a dark beamed ceiling
          const d = down[i];
          if (d <= FACE && T_(x, y + d) !== VOID) {
            const post = (x % 96) < 8, wd = ((x + y) >> 2) & 1, we = ((x - y + 400) >> 2) & 1;
            c = post ? ((x % 96) < 2 ? pk(30, 16, 10) : (x % 96) < 4 ? pk(138, 84, 48) : pk(106, 60, 34)) : wd ^ we ? pk(176, 138, 80) : pk(154, 116, 64);
            if (!post && (((x + y) & 3) === 0 || ((x - y + 400) & 3) === 0)) c = pk(110, 80, 48);
            if (d <= 2) c = pk(30, 16, 10); else if (d > FACE - 4) c = pk(58, 34, 20);
            if (d > 6 && d < 9 && !post) c = pk(138, 42, 26);                                        // a red kapa band along the wall
          } else {
            const by = y % 24; c = by < 3 ? pk(74, 42, 24) : by < 4 ? pk(30, 16, 10) : (x % 40) < 4 ? pk(46, 26, 16) : pk(24, 14, 10);
            if (T_(x - 1, y) !== WALL || T_(x + 1, y) !== WALL) c = pk(14, 8, 6);
          }
          out[li] = c; continue;
        }
        if (t === WALL && def.basalt) {
          // a basalt sea cliff: tall columns with dark joints and broken, staggered ends on the face; on
          // top, flagstones, with ferns and orange lichen in the cracks
          const d = down[i];
          if (d <= FACE && T_(x, y + d) !== VOID) {
            const col = Math.floor((x + K.noise(x / 14, 3) * 3) / 7), cx2 = (x + K.noise(x / 14, 3) * 3) % 7, brk = (d + ((K.hash2(col, 1, 9) * 11) | 0)) % 13;
            let ix = 2 + ((K.hash2(col, 2, 9) * 2.2) | 0);
            if (cx2 < 1) ix = 0; else if (cx2 < 2) ix += 2; else if (cx2 > 5) ix -= 1;               // the joint, the lit face, the turned edge
            if (brk === 0) ix = 0; else if (brk === 1) ix = Math.min(6, ix + 2);                     // a broken column end
            c = BAS[Math.max(0, Math.min(6, ix))];
            if (d <= 1) c = ROCK_LINE; else if (d > FACE - 3) c = shade(c, 0.7); else if (d < 5) c = shade(c, 0.75);
            const iv = ivyAt(x, FACE - d); if (iv) c = iv;
            if (K.hash2(x >> 1, y >> 1, 44) > 0.993) c = pk(214, 120, 52);                          // lichen
          } else {
            c = shade(basaltAt(x, y), 0.92);
            if (T_(x, y - 1) !== WALL) c = BAS[6]; else if (T_(x, y - 2) !== WALL) c = BAS[5];
            const m = K.fbm(x / 30 + 70, y / 30, 3), lip = d - FACE;
            if (lip > 0 && lip < 4 && K.noise(x * 0.25, 13) > 0.45) c = lip === 1 ? FE[2] : (x + y) & 1 ? FE[3] : GR[1];
            else if (m > 0.62 && B(x, y) + 0.5 < (m - 0.62) * 7) c = m > 0.68 ? (K.hash2(x, y, 3) > 0.85 ? FE[4] : FE[3]) : FE[2];
            else if (K.hash2(x >> 1, y >> 1, 45) > 0.994) c = pk(214, 120, 52);
            if (T_(x - 1, y) !== WALL || T_(x + 1, y) !== WALL) c = ROCK_LINE;
          }
          out[li] = c; continue;
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
            if (def.wallGreen) {
              // (the Thermal Cliffs) jungle on the clifftops: the island's grass, darker under the canopy, fern
              // clumps, and a fringe of fronds spilling over the edge of the drop
              c = shade(grassT[patchIdx(x, y, GRASS)], 0.8);
              if (m > 0.62) c = shade(c, 0.86); else if (m < 0.36) c = shade(c, 1.06);
              const fc = K.noise(x / 9 + 40, y / 9);
              if (fc > 0.66 && B(x, y) + 0.5 < (fc - 0.66) * 9) c = fc > 0.72 ? (K.hash2(x, y, 3) > 0.8 ? FE[5] : FE[4]) : FE[3];
              if (lip > 0 && lip < 7 && K.noise(x * 0.22, 13) > 0.36 - lip * 0.04) c = lip <= 2 ? FE[2] : (x + y) & 1 ? FE[3] : FE[4];
            }
            else if (lip > 0 && lip < 4 && K.noise(x * 0.25, 13) > 0.45) c = lip === 1 ? FE[2] : (x + y) & 1 ? FE[3] : GR[1];
            else if (m > 0.6 && B(x, y) + 0.5 < (m - 0.6) * 7) c = m > 0.67 ? (K.hash2(x, y, 3) > 0.85 ? FE[4] : FE[3]) : FE[2];
            if (T_(x - 1, y) !== WALL || T_(x + 1, y) !== WALL) c = ROCK_LINE;
          }
          out[li] = c; continue;
        }
        // ---- walkable ground
        if (t === WOOD) {
          // koa planks, as in Hale Koa: staggered joints, grain, a lit edge, a knot here and there
          const row = y >> 3, ly = y & 7, off = (row * 37) % 60, px2 = x + off, seg = Math.floor(px2 / 52), lx = px2 - seg * 52;
          const PLK = [pk(90, 50, 32), pk(108, 60, 36), pk(122, 70, 40), pk(134, 80, 46)];
          c = PLK[(K.hash2(seg, row, 5) * 4) | 0];
          if (ly === 7 || lx === 51) c = pk(58, 30, 18); else if (ly === 0) c = pk(154, 96, 56);
          else if (K.hash2(px2 >> 3, row * 3 + (ly >> 1), 9) > 0.86) c = pk(74, 40, 22);
          if (K.hash2(seg, row, 9) > 0.82 && Math.abs(lx - 26) < 2 && ly > 2 && ly < 5) c = pk(58, 30, 18);
          let wall = 0; for (let dd = 1; dd <= 8; dd++) if (T_(x, y - dd) === WALL) { wall = dd; break; }
          if (wall) c = shade(c, 0.55 + wall * 0.055);
        } else if (t === CORAL) {
          // pink coral rock: the reef raised into land. Darker and wet where the sea laps it, a sunlit crust
          // just above that, and here and there a living head of brighter coral
          // weathered coral stone in a soft rose: the reef rock's own structure (its polyps and ridges) kept,
          // but at half strength under broad gentle patches of tone, and in muted colours
          let tl = 0.5; if (pinkT) { const v = pinkT[patch64(x, y, 31)]; tl = ((v & 255) * 0.3 + ((v >>> 8) & 255) * 0.59 + ((v >>> 16) & 255) * 0.11 - 70) / 170; }
          const cv = (K.fbm(x / 52 + 3, y / 52, 3) * 0.75 + K.noise(x / 13 + 9, y / 13) * 0.25) * 0.55 + tl * 0.45 + B(x, y) * 0.06;
          c = CORAL_R[Math.max(0, Math.min(4, Math.floor((cv - 0.2) * 7.5)))];
          // broad patches of the atoll are bleached dead coral, their edges dithered into the rose stone
          const zone = K.fbm(x / 230 + 17, y / 230 - 5, 2) + B(x, y) * 0.08;
          if (deadT && zone < 0.4) c = mixc(deadT[patch64(x, y, 53)], CORAL_R[3], 0.12);
          if (K.hash2(x >> 1, y >> 1, 77) > 0.993) c = CORAL_R[0];
          else if (K.hash2(x, y, 78) > 0.996) c = CORAL_R[4];
          let near = 9; for (let dd = 1; dd <= 4 && near === 9; dd++) for (const [dx, dy] of [[dd, 0], [-dd, 0], [0, dd], [0, -dd]]) if (isWet(T_(x + dx, y + dy))) { near = dd; break; }
          if (near === 1) c = pk(126, 92, 98); else if (near === 2) c = shade(c, 0.8); else if (near === 3 && B(x, y) > -0.2) c = shade(c, 0.9);
          else if (near === 4) c = shade(c, 1.05);
        } else if (t === BASALT) {
          c = basaltAt(x, y);
          if (def.sea && window.Sea) { let near = 9; for (const [dx, dy, d] of [[2, 0, 2], [-2, 0, 2], [0, 2, 2], [0, -2, 2], [4, 0, 4], [-4, 0, 4], [0, 4, 4], [0, -4, 4]]) if (d < near && isWet(T_(x + dx, y + dy))) near = d; if (near <= 2) c = shade(c, 0.7); else if (near <= 4 && B(x, y) > 0) c = shade(c, 0.85); }
          if (T_(x, y - 1) !== BASALT && T_(x, y - 1) !== WALL && T_(x, y - 1) !== STAIR) c = BAS[5];
        } else if (t === SOIL || t === GRASS || t === SAND) c = groundSoft(t, x, y);
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
          if (def.basalt) c = toBasalt(c);
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
        out[li] = c;
      }
      for (const [x, y, c, on] of deco[cj * ncx + ci]) if (terr[y * W + x] === on) out[(y - y0) * cw + (x - x0)] = c;
      gx.putImageData(img, x0, y0); lx.putImageData(low, x0, y0);
      if (plants.length) {
        lx.save(); lx.beginPath(); lx.rect(x0, y0, cw, ch); lx.clip();
        for (const q of plants) if (q.x + q.w > x0 && q.x < x0 + cw && q.y + q.h > y0 && q.y < y0 + ch) lx.drawImage(q.img, 0, 0, q.w, q.h, q.x, q.y, q.w, q.h);
        lx.restore();
      }
      return true;
    }
    return { ground: cv, lower: lv, embers, chunks: { CHK, ncx, ncy, done, chunk } };
  }
  // ferns, monstera, taro and hibiscus on the floor far below, hazed by the distance
  function undergrowth(terr, up, W, H, CL) {
    const r = K.rng(41), out = [], floor = (x, y) => { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= W || y >= H) return false; const i = y * W + x, v = terr[i]; return (v === VOID || v === BH || v === BV) && up[i] > CL + 2; };
    const kinds = [["flora_fern", 0], ["flora_monstera", 0], ["plant_taro_a", 1], ["bush_hibiscus", 1]];
    for (let k = 0; k < (W * H) / 2600; k++) {
      const x = (r() * W) | 0, y = (r() * H) | 0, [n, sheet] = kinds[(r() * kinds.length) | 0], img = A.img[n];
      const w = sheet ? A.meta[n].fw : img.width, h = sheet ? A.meta[n].fh : img.height;
      if (!floor(x, y) || !floor(x - w / 2, y) || !floor(x + w / 2, y) || !floor(x - w / 2, y - h) || !floor(x + w / 2, y - h) || !floor(x, y - h / 2)) continue;
      out.push({ img: hazed(img, n), x: Math.round(x - w / 2), y: Math.round(y - h), w, h });
    }
    return out;
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
  function decorate(def, terr, W, H, CHK, ncx, ncy) {
    const r = K.rng(def.title.length * 97), GR = PAL.packed.grass, SO = PAL.packed.soil, OB = PAL.packed.obsidian;
    const buckets = Array.from({ length: ncx * ncy }, () => []);
    const put = (x, y, c, on) => { if (x >= 0 && y >= 0 && x < W && y < H) buckets[((y / CHK) | 0) * ncx + ((x / CHK) | 0)].push([x, y, c, on]); };
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
    return buckets;
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
  Level.PROPS = {};   // extra prop kinds (js/sea.js)
  const gateArt = {}, crystalArt = {}, colArt = {};
  let brazArt = null, keeperArt = null, shrineArt = null, tikiArt = null, smallFrames = null;
  // glows are pre-rendered once per size and colour, then stamped with an alpha (building a fresh
  // radial gradient for every mote, crystal and brazier every frame was a steady cost)
  const glowCache = new Map();
  Level.glowAt = (g, cx, cy, R2, rgb, a) => glowAt(g, cx, cy, R2, rgb, a);
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
        o.draw = (ctx, ox, oy) => ctx.drawImage(ti, Math.round(x - ti.width / 2 - ox), Math.round(y - ti.height + 1 - oy));
        o.solids = [[x - 6, y - 5, x + 6, y + 1]];
        break;
      }
      case "shrine": {
        const S2 = shrineArt || (shrineArt = Ruins.shrine());
        o.draw = (ctx, ox, oy, t, g) => {
          const X = Math.round(x - S2.width / 2 - ox), Y = Math.round(y - S2.height - oy);
          ctx.drawImage(S2, X, Y);
          if (!L.shrineTaken) {
            const w = Combat.weapons.find((q) => q.id === L.def.shrine.unlock);
            ctx.drawImage(w.icon, X + S2.width / 2 - 14, Y - 30 + Math.round(Math.sin(t * 2) * 2));
            if (g) glowAt(g, x - ox, Y - 16, 46, "255,200,120", 0.6);
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
      default: if (Level.PROPS[p.k]) Level.PROPS[p.k](p, L, o, x, y); break;
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
    // later zones are tougher: def.hpMul raises every creature's health (bosses scale with the heroes)
    Enemies.hpScale = (np >= 3 ? COOP.hp3 : np === 2 ? COOP.hp : 1) * (def.hpMul || 1); Enemies.bossScale = np * (def.bossMul || 1);
    if (!Level.netGuest) for (const e of coopRoster(withCover(def.enemies || []), b)) { const en = Enemies.spawn(e.e, e.x * T, e.y * T, e.tribe || 0, L); if (en) L.enemies.push(en); }
    L.solids = [];
    for (const p of L.props) if (p.solids) L.solids.push(...p.solids);
    if (def.sea && !Level.netGuest) { const r = K.rng(name.length * 41 + 7); for (let k = 0, n = 0; k < 600 && n < 3; k++) { const x = r() * b.W, y = r() * b.H, i = (y | 0) * b.W + (x | 0); if (b.terr[i] !== SAND || !b.water || b.water.landDist[i] > 12 || b.water.landDist[i] < 3) continue; L.pickups.push({ x, y, t0: 0, beach: 1, shell: Gear.randomShell(r() < 0.85 ? 0 : 1) }); n++; } }
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
  // wading: medium water slows anyone on foot
  // a hall of Hale Koa that the fountains have flooded counts as water (js/dojowing.js runs the flood)
  const floodAt = (x, y) => { const Fs = Level.cur && Level.cur.floods; if (!Fs) return 0; for (const F of Fs) { if (F.level < 0.55) continue; const [x0, y0, x1, y1] = F.rect; if (x < x0 || y < y0 || x > x1 || y > y1 || !walk(tAt(x, y))) continue; return Math.min(x - x0, x1 - x, y - y0, y1 - y) > 70 ? MED : SHAL; } return 0; };
  Level.slowAt = (x, y) => { const f = floodAt(x, y); if (f) return f === MED ? 0.8 : 0.93; const v = tAt(x, y); return v === MED ? 0.62 : v === SHAL ? 0.93 : 1; };
  Level.waterAt = (x, y) => floodAt(x, y) || (isWet(tAt(x, y)) ? tAt(x, y) : 0);

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
    const src0 = list.filter((q) => !(Enemies.STATS[q.e] || {}).boss); if (!src0.length) return list;
    const out = list.slice(), n = Math.round(src0.length * COOP.extra * (np - 1)), r = K.rng(list.length * 7 + 3 + np);
    const ok = (x, y) => { x = (x * T) | 0; y = (y * T) | 0; return x > 0 && y > 0 && x < b.W && y < b.H && walk(b.terr[y * b.W + x]); };
    const clear = (x, y, gap) => out.every((o) => Math.hypot(o.x - x, (o.y - y) / 0.8) > gap);
    for (let k = 0; k < n; k++) {
      const src = src0[Math.floor((k + 0.5) * src0.length / n) % src0.length];
      let placed = false;
      for (let tries = 0; tries < 40 && !placed; tries++) {
        const a = r() * 6.28, d = 1.6 + r() * (1.4 + np * 0.6), x = src.x + Math.cos(a) * d, y = src.y + Math.sin(a) * d * 0.75;
        if (ok(x, y) && ok(x - 0.3, y) && ok(x + 0.3, y) && clear(x, y, tries < 30 ? 1.3 : 0.8)) { out.push({ ...src, x, y }); placed = true; }
      }
    }
    return out;
  }
  // a tiki brute is always covering for a darter: if a group has a brute and no darter of his tribe, one
  // is added just behind him (the darters' AI keeps them in his shadow, js/enemies3.js)
  function withCover(list) {
    const out = list.slice();
    for (const s of list) if (s.e === "brute" && !list.some((o) => o.e === "dart" && (o.tribe || 0) === (s.tribe || 0))) out.push({ ...s, e: "dart", x: s.x + 0.6, y: s.y - 1.1 });
    return out;
  }
  Level.withCover = withCover;
  // with three heroes an arena gains a final wave, mixed from the creatures of the ones before it
  function arenaWaves(waves) {
    if ((Level.players || 1) < 3 || !waves.length) return waves;
    const mix = [];
    waves.forEach((w, wi) => w.forEach((s, i) => { if ((i + wi) % 2 === 0 && !(Enemies.STATS[s.e] || {}).boss) mix.push({ ...s, tribe: s.tribe ? s.tribe + 40 : 0 }); }));
    return mix.length ? waves.concat([mix]) : waves;
  }

  // ------------------------------------------------------------------ arenas, pickups, birds (per frame)
  Level.update = function (dt, t, P0, api, others) {
    const L = Level.cur, heroes = [P0].concat(others || []);
    updateAir(L, dt, t);
    if (L.def.sea && window.Sea) { Sea.update(L, dt, t, heroes, api); Sea.fish(L, dt, t); Sea.crabs(L, dt, heroes); }
    if (L.def.dojo && window.DojoWing) { Level.time = t; DojoWing.update(L, dt); }
    for (const bd of L.birds) { bd.a += Math.sin(t * 0.3 + bd.ph) * 0.15 * dt; bd.x += Math.cos(bd.a) * bd.sp * dt; bd.y += Math.sin(bd.a) * bd.sp * dt * 0.6; if (bd.x < -200) bd.x += L.W + 400; if (bd.x > L.W + 200) bd.x -= L.W + 400; if (bd.y < -200) bd.y += L.H + 400; if (bd.y > L.H + 200) bd.y -= L.H + 400; }
    if (Level.netGuest) { for (const a of L.arenas) if (a.state === "active" && !a.sealT0) { a.sealT0 = 1; a.sealT = t; if (a.frenzy && window.Sea) Sea.frenzyStart(L, a); } else if (a.state !== "active") { if (a.sealT0 && a.frenzy && window.Sea) Sea.frenzyEnd(L); a.sealT0 = 0; } return; }
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
        L.banner = { title: a.title, sub: a.sub, t0: t };
        api.sfx("sealUp"); api.sfx("warcry");
        if (a.survive) { a.endT = t + a.survive * (a.frenzy ? 1 : 1 + 0.12 * (heroes.length - 1)); a.herdT = t + 2; a.waveT = t + 0.5; a.t0 = t; }
        if (a.frenzy && window.Sea) { Sea.frenzyStart(L, a); L.banner = { title: a.title, sub: a.sub || "Survive the frenzy", t0: t }; }
      }
      if (a.state === "active" && t > (a.herdCheck || 0)) { a.herdCheck = t + 1.5; herdIn(a, L, heroes); }
      if (a.state === "active" && a.survive) { survival(a, L, t, heroes, api); continue; }
      if (a.state === "active" && a.live.filter((e) => !e.dead).length === 0 && t > a.next) {
        a.wave++;
        if (a.wave >= a.waves.length) {
          finishArena(a, L, t, api);
          rewards(heroes, P0, L, t);
        } else {
          a.live = coopRoster(withCover(a.waves[a.wave]), L).map((s) => { const [sx2, sy2] = arenaSpot(a, L, s.e, s.x, s.y, heroes), e = Enemies.spawn(s.e, sx2, sy2, s.tribe || 0, L); e.enter = s.enter || "leap"; e.introT = 0.9; e.alerted = true; L.enemies.push(e); return e; }).filter(Boolean);
          a.next = t + 1.2;
          if (a.wave > 0) api.sfx("warcry");
        }
      }
    }
    for (const b of L.pickups) {
      if (b.vy !== undefined) { b.vy += 220 * dt; b.y += b.vy * dt; if (b.vy > 0 && t - b.t0 > 0.3) { delete b.vy; onGround(b); } }
      // picked up from a generous reach, and drawn the last few pixels toward the hero
      for (const q of heroes) { const dd = Math.hypot(q.x - b.x, q.y - 8 - b.y); if (!b.got && !q.dead && dd < 40 && dd > 1 && b.vy === undefined) { const k = Math.min(1, dt * 6); b.x += (q.x - b.x) * k; b.y += (q.y - 8 - b.y) * k; } }
      for (const q of heroes) if (!b.got && !q.dead && Math.hypot(q.x - b.x, q.y - 8 - b.y) < 26) { b.got = true; if (b.el) api.shard(b.el, q); else if (b.shell) api.shell(b.shell, q); else { api.heal(2, q); api.sfx("berry"); } }
    }
    L.pickups = L.pickups.filter((b) => !b.got && (b.beach || t - b.t0 < (b.el || b.shell ? 90 : 40)));
  };
  function rewards(heroes, P0, L, t) {
    const Pc = heroes.find((q) => !q.dead) || P0, nb = 3 + 2 * (heroes.length - 1);
    for (let k = 0; k < nb; k++) L.pickups.push({ x: Pc.x + (k - (nb - 1) / 2) * 18, y: Pc.y - 16, t0: t, vy: -60 });
    Combat.momentum = Math.min(100, Combat.momentum + 30);
  }
  function finishArena(a, L, t, api) {
    a.state = "done"; L.seals = []; api.sfx("sealDown");
    if (Level.onProgress) Level.onProgress(L);
    L.banner = { title: "THE WAY IS OPEN", t0: t };
    if (a.unlocks || a.final) { Level.cleared.add(L.name); if (Level.onUnlock) Level.onUnlock(); }
    if (a.unlocks && !Level.unlocked.has(a.unlocks)) { Level.unlock(a.unlocks); L.banner = { title: "THE WAY IS OPEN", sub: "A new land glows on Kahu Lā's globe", t0: t }; }
    if (a.final) L.banner = { title: a.zoneDone || "ZONE 1 CLEARED", sub: a.zoneSub || "The Volcanic Highlands are at peace", t0: t };
    if (a.reward && Level.onReward) Level.onReward(a.reward);
  }
  // a stampede: herds of geckos thunder across the arena from every side while smaller waves press
  // in. Hold out until the dust settles.
  // Where a wave's creature actually comes in: always inside the sealed arena, on ground that suits it
  // (water for sea creatures, open air for fliers, dry footing for the rest, crabs kept out of the deeper
  // water), and drawn in toward the heroes so a wave arrives together rather than strung out across it.
  function arenaSpot(a, L, kind, x, y, heroes) {
    const st = Enemies.STATS[kind] || {}, [x0, y0, x1, y1] = a.rect, X0 = x0 * T + 10, Y0 = y0 * T + 10, X1 = (x1 + 1) * T - 10, Y1 = (y1 + 1) * T - 10;
    const ok = (px, py) => {
      if (px < X0 || px > X1 || py < Y0 || py > Y1) return false;
      if (L.seals && L.seals.some((s) => px > s[0] - 14 && px < s[2] + 14 && py > s[1] - 14 && py < s[3] + 14)) return false;
      const w = Level.waterAt(px, py);
      if (st.aquatic) return w >= 11 && Level.waterAt(px + 12, py) >= 11 && Level.waterAt(px - 12, py) >= 11;
      if (st.fly) return !Level.flyBlocked(px, py);
      if (Level.solidAt(px, py) || Level.solidAt(px - 8, py) || Level.solidAt(px + 8, py)) return false;
      return !(w >= 12);
    };
    const live = heroes.filter((q) => !q.dead), hx = live.length ? live.reduce((s2, q) => s2 + q.x, 0) / live.length : (X0 + X1) / 2, hy = live.length ? live.reduce((s2, q) => s2 + q.y, 0) / live.length : (Y0 + Y1) / 2;
    let px = Math.max(X0, Math.min(X1, x * T)), py = Math.max(Y0, Math.min(Y1, y * T));
    // pulled in toward the heroes (but not on top of them)
    const d = Math.hypot(px - hx, py - hy); if (d > 130) { const k = (d - 130) / d * 0.85; px += (hx - px) * k; py += (hy - py) * k; }
    if (ok(px, py)) return [px, py];
    for (let r = 12; r < 900; r += 12) for (let k = 0, n = Math.max(8, Math.round(r / 6)); k < n; k++) { const ang = (k / n) * Math.PI * 2, qx = px + Math.cos(ang) * r, qy = py + Math.sin(ang) * r * 0.8; if (ok(qx, qy) && Math.hypot(qx - hx, qy - hy) > 60) return [qx, qy]; }
    return [px, py];
  }
  Level.arenaSpot = arenaSpot;
  // an arena's creature that has somehow ended up outside it (or stuck) is brought back in
  function herdIn(a, L, heroes) {
    const [x0, y0, x1, y1] = a.rect;
    for (const e of a.live) {
      if (e.dead || e.introT > 0) continue;
      const out = e.x < x0 * T - 8 || e.x > (x1 + 1) * T + 8 || e.y < y0 * T - 8 || e.y > (y1 + 1) * T + 8;
      if (!out) { e.outT = 0; continue; }
      e.outT = (e.outT || 0) + 1;
      if (e.outT >= 2) { const [nx, ny] = arenaSpot(a, L, e.type, e.x / T, e.y / T, heroes); e.x = nx; e.y = ny; e.enter = "leap"; e.introT = 0.6; e.outT = 0; e.state = "idle"; }
    }
  }
  function survival(a, L, t, heroes, api) {
    const [x0, y0, x1, y1] = a.rect.map((v) => v * T), np = heroes.length;
    a.live = a.live.filter((e) => !e.dead);
    L.timer = Math.max(0, a.endT - t);
    if (a.frenzy && t < a.endT) { Sea.frenzyTick(a, L, t, heroes, api); return; }
    if (t < a.endT) {
      if (t > a.waveT && a.live.length < 4 + np * 2) { const w = a.waves[(a.wave = (a.wave + 1) % a.waves.length)]; for (const s of coopRoster(w, L)) { const [sx2, sy2] = arenaSpot(a, L, s.e, s.x, s.y, heroes), e = Enemies.spawn(s.e, sx2, sy2, s.tribe || 0, L); if (!e) continue; e.enter = s.enter || "leap"; e.introT = 0.9; e.alerted = true; L.enemies.push(e); a.live.push(e); } a.waveT = t + 7; }
      if (t > a.herdT) {
        a.herdT = t + a.herd * (np >= 3 ? 0.8 : 1);
        // pick a side, aim across at the heroes, and send a staggered line of runners
        const side = (Math.random() * 4) | 0, tgt = heroes[(Math.random() * heroes.length) | 0], n = 4 + np + ((Math.random() * 3) | 0);
        for (let k = 0; k < n; k++) {
          const u = (k + 0.5) / n, jitter = (Math.random() - 0.5) * 30;
          let x, y;
          if (side === 0) { x = x0 + 16 + Math.random() * 20; y = y0 + (y1 - y0) * u + jitter; } else if (side === 1) { x = x1 + T - 16 - Math.random() * 20; y = y0 + (y1 - y0) * u + jitter; }
          else if (side === 2) { y = y0 + 16 + Math.random() * 20; x = x0 + (x1 - x0) * u + jitter; } else { y = y1 + T - 16 - Math.random() * 20; x = x0 + (x1 - x0) * u + jitter; }
          if (!walk(tAt(x, y)) || Level.solidAt(x, y)) continue;
          const e = Enemies.spawn("runner", x, y, 0, L); if (!e) continue;
          const base = side === 0 ? 0 : side === 1 ? Math.PI : side === 2 ? Math.PI / 2 : -Math.PI / 2, toT = Math.atan2(tgt.y - y, tgt.x - x);
          e.runA = base + Math.max(-0.5, Math.min(0.5, Math.atan2(Math.sin(toT - base), Math.cos(toT - base)))); e.bounds = [x0, y0, x1 + T, y1 + T]; e.alerted = true; e.introT = 0.15 + k * 0.08; e.enter = "scurry";
          L.enemies.push(e);
        }
        api.sfx("stampede");
      }
    } else {
      // the dust settles: what's left scatters, and the way opens
      for (const e of L.enemies) if (!e.dead && (e.type === "runner" || a.live.includes(e))) { e.dead = true; e.gone = true; if (!a.frenzy) Enemies.death(e); }
      if (a.frenzy && window.Sea) Sea.frenzyEnd(L);
      a.live = []; L.timer = 0;
      finishArena(a, L, t, api); rewards(heroes, heroes[0], L, t);
    }
  }
  // ------------------------------------------------------------------ zones and progress
  // Kahu Lā's globe: zones of several levels each. Clearing a level's last arena unlocks the next.
  Level.ZONES = [
    { name: "VOLCANIC HIGHLANDS", lon: 0.35, lat: -0.25, levels: ["highlands", "canopy", "crown"] },
    { name: "???", lon: 2.4, lat: 0.3, levels: [] },
    { name: "???", lon: 4.3, lat: -0.45, levels: [] },
  ];
  Level.unlocked = new Set(["highlands"]);
  Level.cleared = new Set();
  Level.unlock = (n) => { if (!DEFS[n] || Level.unlocked.has(n)) return; Level.unlocked.add(n); if (Level.onUnlock) Level.onUnlock(n); };
  // the parts of a level the guest needs from the host each tick
  Level.serialize = function (L) {
    return { pk: L.pickups.map((b) => [Math.round(b.x), Math.round(b.y), b.vy !== undefined ? 1 : 0, b.el || 0, b.shell || 0]), se: L.seals, ar: L.arenas.map((a) => a.state), po: L.portalOpen ? 1 : 0, sh: L.shrineTaken ? 1 : 0, tm: L.timer ? Math.round(L.timer * 10) / 10 : 0, vs: window.Sea ? Sea.serialize(L) : null, dw: L.def.dojo && window.DojoWing ? DojoWing.serialize(L) : null };
  };
  Level.applySnap = function (L, S, t) {
    L.pickups = S.pk.map(([x, y, , el, sh]) => ({ x, y, t0: t, el: el || undefined, shell: sh || undefined }));
    L.seals = S.se; S.ar.forEach((st, i) => { if (L.arenas[i]) L.arenas[i].state = st; });
    if (Level.onProgress) Level.onProgress(L);
    if (S.po) L.portalOpen = true; if (S.sh) L.shrineTaken = true; L.timer = S.tm || 0; if (S.vs && window.Sea) Sea.apply(L, S.vs, t); if (S.dw && window.DojoWing) DojoWing.apply(L, S.dw);
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
  // paint whatever ground is in (or right next to) view
  Level.ensure = function (x, y, w, h) {
    const C = Level.cur && Level.cur.chunks; if (!C) return;
    for (let cj = Math.floor(y / C.CHK); cj <= Math.floor((y + h) / C.CHK); cj++) for (let ci = Math.floor(x / C.CHK); ci <= Math.floor((x + w) / C.CHK); ci++) C.chunk(ci, cj);
  };
  // spend spare frame time painting the rest, nearest to the camera first
  Level.idle = function (budgetMs, cx, cy) {
    const C = Level.cur && Level.cur.chunks; if (!C) return;
    const t0 = performance.now();
    while (performance.now() - t0 < budgetMs) {
      let best = -1, bd = 1e18;
      for (let k = 0; k < C.done.length; k++) if (!C.done[k]) { const dx = (k % C.ncx + 0.5) * C.CHK - cx, dy = (((k / C.ncx) | 0) + 0.5) * C.CHK - cy, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = k; } }
      if (best < 0) return;
      C.chunk(best % C.ncx, (best / C.ncx) | 0);
    }
  };
  Level.dropBerry = (x, y, t) => Level.cur.pickups.push({ x, y: y - 10, t0: t, vy: -70 });
  Level.dropShard = (x, y, el, t) => Level.cur.pickups.push({ x, y: y - 10, t0: t, vy: -90, el });
  Level.dropShell = (x, y, k, t) => Level.cur.pickups.push({ x, y: y - 10, t0: t, vy: -80, shell: k });
  // a berry that lands in rock, a prop or over a drop rolls out to the nearest ground you can stand on
  function onGround(b) {
    const ok = (x, y) => walk(tAt(x, y + 8)) && !Level.solidAt(x, y + 8) && !Level.solidAt(x - 5, y + 8) && !Level.solidAt(x + 5, y + 8);
    if (ok(b.x, b.y)) return;
    for (let r = 4; r < 200; r += 4) for (let a = 0; a < Math.PI * 2; a += 0.35) { const x = b.x + Math.cos(a) * r, y = b.y + Math.sin(a) * r; if (ok(x, y)) { b.x = x; b.y = y; return; } }
  }

  // ------------------------------------------------------------------ drawing
  Level.drawBack = function (ctx, ox, oy, LW, LH, t) {
    const L = Level.cur, B2 = L.below, CL = L.def.cliff;
    Level.ensure(ox - 32, oy - 32, LW + 64, LH + 64);
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
    for (const pr of L.props) if (pr.ground && pr.draw) pr.draw(ctx, ox, oy, t);
    if (L.floods && window.DojoWing) DojoWing.drawFlood(ctx, L, ox, oy, LW, LH, t);
    if (L.water) { Level.camHint = { x: ox + LW / 2, y: oy + LH / 2 }; Water.render(ctx, ox, oy, LW, LH, t, L.water); Sea.drawUnder(ctx, L, ox, oy, LW, LH, t); Sea.drawFish(ctx, L, ox, oy, LW, LH, t); Sea.drawCrabs(ctx, L, ox, oy, LW, LH); }
    eachBridge(ox, oy, LW, LH, (v, X, Y, tx, ty) => { const tm = L.tm, a = v === BH ? tm.at(tx, ty - 1) !== v : tm.at(tx - 1, ty) !== v, b = v === BH ? tm.at(tx, ty + 1) !== v : tm.at(tx + 1, ty) !== v; ctx.drawImage(bridgeTile(v, (tx * 7 + ty * 3) % 3, a, b), X, Y); });
    for (const v of L.vines) if (v.x > ox - 10 && v.x < ox + LW + 10 && v.y > oy - 60 && v.y < oy + LH + 10) Ruins.drawVine(ctx, v.x - ox, v.y - oy, v.len, t, v.ph);
    for (const b of L.pickups) { const bob = b.vy === undefined ? Math.round(Math.sin(t * 3 + b.x) * 1.5) : 0; if (b.el) drawShard(ctx, b, b.x - ox, b.y - oy + bob, t); else if (b.shell) { ctx.drawImage(Gear.shellArt(b.shell), Math.round(b.x - 8 - ox), Math.round(b.y - 12 - oy + bob)); if (Math.sin(t * 3 + b.x) > 0.85) { ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(b.x + 3 - ox), Math.round(b.y - 11 - oy + bob), 1, 1); } } else ctx.drawImage(Ruins.berry, Math.round(b.x - 4 - ox), Math.round(b.y - 6 - oy + bob)); }
  };
  // an elemental shard: a faceted crystal in its element's colour, turning and glinting
  function drawShard(ctx, b, x, y, t) {
    const E = Gear.ELEMENTS[b.el], c = E.col, X = Math.round(x), Y = Math.round(y - 4), w = Math.abs(Math.cos(t * 2 + b.x)) * 3 + 1;
    ctx.fillStyle = "rgba(10,12,16,0.3)"; ctx.fillRect(X - 3, Math.round(y + 3), 7, 2);
    ctx.fillStyle = "#140c16"; ctx.fillRect(X - Math.ceil(w) - 1, Y - 6, Math.ceil(w) * 2 + 3, 13);
    for (let k = -6; k <= 6; k++) { const hw = Math.round(w * (1 - Math.abs(k) / 7)); ctx.fillStyle = k < -2 ? "#ffffff" : c; ctx.fillRect(X - hw, Y + k, hw * 2 + 1, 1); }
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.fillRect(X - 1, Y - 3, 1, 3);
    if (Math.sin(t * 5 + b.y) > 0.8) { ctx.fillStyle = "#ffffff"; ctx.fillRect(X + 3, Y - 7, 1, 1); }
  }
  function eachBridge(ox, oy, LW, LH, fn) {
    const tm = Level.cur.tm;
    for (let ty = Math.max(0, ((oy - Level.cur.def.cliff) / T) | 0); ty <= Math.min(tm.th - 1, ((oy + LH) / T) | 0); ty++) for (let tx = Math.max(0, (ox / T - 1) | 0); tx <= Math.min(tm.tw - 1, ((ox + LW) / T) | 0); tx++) {
      const v = tm.at(tx, ty); if (v === BH || v === BV) fn(v, tx * T - ox, ty * T - oy, tx, ty);
    }
  }
  // rope bridges planked like the Hale Koa floor: koa boards with a lit edge, dark seams, grain and
  // knots, lashed with twisted lauhala rope to posts. Gaps between boards show the drop beneath.
  const bridgeTiles = {};
  function bridgeTile(v, variant, eA = true, eB = true) {
    const key = v + ":" + variant + (eA ? "a" : "") + (eB ? "b" : ""); if (bridgeTiles[key]) return bridgeTiles[key];
    const [c, x] = K.canvas(T, T), rect = (col, a, b, w, h) => { x.fillStyle = col; if (v === BH) x.fillRect(a, b, w, h); else x.fillRect(b, a, h, w); };
    const PL = ["#5a3220", "#6c3c24", "#7a4628", "#86502e"], SEAM = "#3a1e12", LIT = "#9a6038", GRAIN = "#4a2816", POST = "#2a160c", ROPE = ["#a07a44", "#d8b470"];
    for (let a = 0, k = 0; a < T; a += 6, k++) {
      const h = (n) => K.hash2(variant * 9 + k, n, v), t0 = eA ? 5 + (h(1) > 0.6 ? 1 : 0) : 0, t1 = eB ? 27 - (h(2) > 0.7 ? 1 : 0) : 32, base = PL[(h(3) * 4) | 0];
      rect(base, a, t0, 5, t1 - t0);
      rect(LIT, a, t0, 5, 1); rect(SEAM, a + 4, t0, 1, t1 - t0); rect(SEAM, a, t1 - 1, 5, 1);
      for (let g = 0; g < 2; g++) { const gx = a + 1 + ((h(4 + g) * 3) | 0), gy = t0 + 2 + ((h(6 + g) * 10) | 0); rect(GRAIN, gx, gy, 1, 4 + ((h(8 + g) * 5) | 0)); }
      if (h(10) > 0.78) { rect(SEAM, a + 1, t0 + 9, 2, 2); rect(LIT, a + 1, t0 + 9, 1, 1); }     // a knot
    }
    // lashing: two twisted ropes along the edges, tied off at a post each tile
    for (let a = 0; a < T; a++) { const sag = Math.round(Math.sin((a / T) * Math.PI) * 1.2); if (eA) { rect(ROPE[(a >> 1) & 1], a, 3 + sag, 1, 1); rect(SEAM, a, 4 + sag, 1, 1); } if (eB) { rect(ROPE[(a >> 1) & 1], a, 28 + sag, 1, 1); rect(SEAM, a, 29 + sag, 1, 1); } }
    for (const b of [eA ? 1 : -1, eB ? 26 : -1]) if (b >= 0) { rect(POST, 0, b, 3, 5); rect(LIT, 0, b, 3, 1); rect(ROPE[1], 0, b + 2, 3, 1); }
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
  Level.drawables = function () { const L = Level.cur; return L.props.filter((p) => !p.ground).concat(L.npcs); };
  // shafts of sun spilling in from above, with dust turning in them
  Level.drawLight = function (g, ox, oy, t) {
    const L = Level.cur;
    for (const s of L.def.shafts || []) {
      const x = s.x * T - ox, y = s.y * T - oy, L2 = s.len * T, w = s.w * T, a = s.ang, dx = Math.sin(a), dy = Math.cos(a), nx = dy, ny = -dx, fl = 0.85 + 0.15 * Math.sin(t * 0.7 + s.x);
      const gr = g.createLinearGradient(x, y, x + dx * L2, y + dy * L2); gr.addColorStop(0, `rgba(255,226,150,${0.4 * fl})`); gr.addColorStop(0.7, `rgba(255,210,130,${0.16 * fl})`); gr.addColorStop(1, "rgba(255,210,130,0)");
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - nx * w * 0.35, y - ny * w * 0.35); g.lineTo(x + nx * w * 0.35, y + ny * w * 0.35); g.lineTo(x + dx * L2 + nx * w * 0.6, y + dy * L2 + ny * w * 0.6); g.lineTo(x + dx * L2 - nx * w * 0.6, y + dy * L2 - ny * w * 0.6); g.fill();
      for (let k = 0; k < 16; k++) { const u = ((k * 0.137 + t * 0.03) % 1), v = Math.sin(k * 7.1 + t * 0.4) * 0.45, px = x + dx * L2 * u + nx * w * v * (0.35 + u * 0.25), py = y + dy * L2 * u + ny * w * v * (0.35 + u * 0.25); g.fillStyle = `rgba(255,245,210,${0.55 * (1 - u)})`; g.fillRect(Math.round(px), Math.round(py), 1, 1); }
    }
    for (const b of L.pickups) glowAt(g, b.x - ox, b.y - oy - 4, b.el ? 22 : 14, b.el ? Gear.ELEMENTS[b.el].glow : b.shell ? "255,240,210" : "255,120,110", b.el ? 0.6 : b.shell ? 0.25 : 0.45);
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
