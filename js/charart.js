// Hand-made pixel art for characters (24x32 frames, '.' = transparent).
// Chibi proportions: big head, soft eyes with a shine pixel, small body.
// Body rows 0..24, legs rows 25..29 (feet on row 29), arms are separate so they can swing.
(function () {
  const PAL = {
    o: [36, 24, 30],    // outline
    h: [36, 30, 38],    // hair (near-black)
    H: [66, 56, 70],    // hair mid
    j: [104, 92, 112],  // hair shine
    s: [178, 114, 74],  // skin
    S: [138, 84, 56],   // skin shade
    k: [206, 142, 98],  // skin light
    e: [22, 16, 22],    // eye
    m: [120, 62, 52],   // mouth
    t: [58, 34, 34],    // tattoo
    r: [204, 52, 46],   // headband
    R: [140, 32, 38],   // headband shade / tails
    v: [30, 108, 116],  // vest
    V: [18, 72, 84],    // vest shade
    l: [70, 160, 158],  // vest light
    n: [246, 242, 224], // shark teeth
    c: [70, 46, 34],    // cord
    u: [120, 74, 44],   // belt
    y: [232, 190, 86],  // buckle
    p: [54, 58, 78],    // shorts
    P: [36, 38, 54],    // shorts shade
    q: [196, 158, 98],  // tapa pattern
    f: [96, 60, 38],    // sandals
  };

  // Male island warrior: spiky hair, red headband with tails that flap, tribal tattoos,
  // shark-tooth necklace, open teal vest, tapa-patterned shorts.
  const HERO = {
    down: [
      "........................",
      "........................",
      "..........o...o.........",
      ".......o.oho.ohoo.......",
      ".......ohohhhhhhho......",
      "......ohhhHHjHhhho......",
      ".....ohhHjjHHhhhhho.....",
      ".....ohhhhhhhhhhhho.....",
      ".....orrrrrrrrrrrro.....",
      ".....ohhkhhhhhhkhho.....",
      ".....ohkkkkkkkkkkho.....",
      ".....ohkhhkkkkhhkho.....",
      ".....oskkekkkkekkso.....",
      ".....oSkkekkkkekkSo.....",
      "......oSkkkmmkkkSo......",
      ".......ooSkkkkSoo.......",
      ".........oSkkSo.........",
      "......ovvvskksvvvo......",
      "......ovlvcnncvVvo......",
      "......ovlvsnnsvVVo......",
      "......ovlvsSSsvVVo......",
      "......ovvvsSSsvVVo......",
      "......ouuuuyuuuuuo......",
      "......opppPpppPppo......",
      "......oqpqpooqpqpo......",
    ],
    up: [
      "........................",
      "........................",
      "..........o...o.........",
      ".......o.oho.ohoo.......",
      ".......ohohhhhhhho......",
      "......ohhhHHjHhhho......",
      ".....ohhHjjHHhhhhho.....",
      ".....ohhhhhhhhhhhho.....",
      ".....orrrrrRRrrrrro.....",
      ".....ohhhhhhhhhhhho.....",
      ".....ohhhHhhhhhhhho.....",
      ".....ohhhhhhhhhHhho.....",
      ".....ohhHhhhhhhhhho.....",
      "......ohhhhhhhhhho......",
      ".......ohhhhhhhho.......",
      "........oShhhhSo........",
      ".........oSSSSo.........",
      "......ovvvvvvvvvvo......",
      "......ovlvvVVvvvVo......",
      "......ovlvvvvvvVVo......",
      "......ovvvvvvvvVVo......",
      "......ovvvvVVvvVVo......",
      "......ouuuuuuuuuuo......",
      "......opppPpppPppo......",
      "......oqpqpooqpqpo......",
    ],
    side: [
      "........................",
      "........................",
      "..........o.o...........",
      ".......o.ohohoo.........",
      "......ohhhhHhhhoo.......",
      ".....ohhhHjjHhhhhho.....",
      "....ohhhhHHhhhhhhhho....",
      "....ohhhhhhhhhhhhhhho...",
      "....orrrrrrrrrrrrrrro...",
      "....ohhhhhhhhkkkkkkko...",
      "....ohhhhhhhkkkkhhkko...",
      "....ohhhhhhSkkkkkekko...",
      "....ohhhhhhSkkkkkekko...",
      ".....ohhhhoSkkkkkkkko...",
      "......ohhoSSkkkkmkko....",
      "........ooSSkkkSoo......",
      "..........oSkkSo........",
      "........ovvvskkvvo......",
      "........ovlvcnnVvo......",
      "........ovlvvsnVvo......",
      "........ovlvvsSVVo......",
      "........ovvvvsSVVo......",
      "........ouuuuuyuuo......",
      "........opppPpppPo......",
      "........oqpqpqpqpo......",
    ],
  };

  // legs, rows 25..29, walk frames 0..3 (0 and 2 are the passing pose)
  const LEGS = {
    down: [
      [".......oSso..oSso", ".......oSso..oSso", ".......osko..oSko", ".......offo..offo", ".......oooo..oooo"],
      [".......oSso..oSso", ".......osko..oSso", ".......offo..oSko", ".......oooo..offo", ".............oooo"],
      [".......oSso..oSso", ".......oSso..oSso", ".......osko..oSko", ".......offo..offo", ".......oooo..oooo"],
      [".......oSso..oSso", ".......oSso..osko", ".......oSko..offo", ".......offo..oooo", ".......oooo"],
    ],
    side: [
      ["..........oSso", "..........oSso", "..........osko", "..........offfo", "..........ooooo"],
      [".........oSo.oso", "........oSso..osso", ".......oSso....osko", "......offfo.....offfo", "......ooooo.....ooooo"],
      ["..........oSso", "..........oSso", "..........osko", "..........offfo", "..........ooooo"],
      [".........oso.oSo", "........osso..oSso", ".......osko....oSso", "......offfo.....offfo", "......ooooo.....ooooo"],
    ],
  };
  LEGS.up = LEGS.down;

  // arms with a tribal tattoo band on the upper arm
  const ARM_L = ["..oo", ".oks", ".ott", ".oks", ".oks", ".okk", "..oo"];
  const ARM_R = ["oo..", "sSo.", "tto.", "sSo.", "sSo.", "kSo.", "oo.."];
  const ARM_SIDE = [".oo.", "osso", "otto", "okso", "okso", "okko", ".oo."];

  // headband tails, two flap poses each: [x, y, char]
  const TAILS = {
    down: [[[18, 8, "R"], [19, 8, "R"], [19, 9, "R"], [20, 9, "R"]], [[18, 8, "R"], [19, 7, "R"], [20, 7, "R"], [21, 8, "R"]]],
    up: [[[18, 8, "R"], [19, 8, "R"], [19, 9, "R"], [20, 9, "R"]], [[18, 8, "R"], [19, 7, "R"], [20, 7, "R"], [21, 8, "R"]]],
    side: [[[3, 8, "R"], [2, 8, "R"], [1, 9, "R"], [2, 9, "R"], [0, 10, "R"]], [[3, 8, "R"], [2, 7, "R"], [1, 7, "R"], [0, 8, "R"], [1, 8, "R"]]],
  };

  // Merchant NPC (straw hat, from the concept art)
  const MERCHANT_PAL = Object.assign({}, PAL, {
    a: [236, 200, 116], A: [186, 144, 74], c: [252, 230, 156],
    v: [206, 100, 58], V: [150, 64, 40], h: [70, 50, 44],
  });
  const MERCHANT = [
    "........................",
    "........................",
    "........................",
    "..........oooo..........",
    "........ooaaaaoo........",
    ".......oaaccaaaao.......",
    ".......oaaAAAAaao.......",
    "...ooooaaaaaaaaaaoooo...",
    "..oAaaaaaccaaaaaaaaaAo..",
    "..oAAAAaaaaaaaaaaAAAAo..",
    "...oooAAAAAAAAAAAAooo...",
    ".....ohkwekkkkwekho.....",
    ".....ohkeekkkkeekho.....",
    ".....oSkpkkkkkkpkSo.....",
    "......oSkkkmmkkkSo......",
    "......oooSssssSooo......",
    ".....osoovvsssvvoso.....",
    "....oskovvvVvvvvvoko....",
    "....osSovVvvvvVvvoSo....",
    "....osSovvvvvvvVvoSo....",
    "....oksovVvvvvvvvoko....",
    "....oSsobbbbbbbbbbSo....",
    ".....ootttTTTttttoo.....",
    "......ottttTTttttTo.....",
    "......otTtttTTtttTo.....",
    "......oTTtTo.oTttTo.....",
    "......oSso...oSso.......",
    "......oSso...oSso.......",
    "......osko...oSko.......",
    "......obbo...obbo.......",
    "......oooo...oooo.......",
    "........................",
  ];

  window.CHARART = { PAL, HERO, LEGS, ARM_L, ARM_R, ARM_SIDE, TAILS, MERCHANT, MERCHANT_PAL };
})();
