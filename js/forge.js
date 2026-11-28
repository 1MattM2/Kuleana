// Kamaka's forge: the first building of the village. On the island it stands on its plot north-west of
// Hale Koa (staked out and empty until the smith is rescued); inside, the dojo's craft in other
// materials: basalt flagstones and obsidian block walls, a furnace mouth of living magma with bellows,
// an anvil throwing sparks under the smith's hammer, a quenching trough breathing steam, a coal heap,
// a wall of forged weapons and a stand wearing your armour. Talk to Kamaka to forge shards into weapons
// or weave them into cloth.
(function () {
  const T = K.TILE;
  const MW = 18, MH = 11, W = MW * T, H = MH * T;
  const F = (window.Forge = { W, H });
  F.DOOR = { x0: 7.8 * T, x1: 10.2 * T };
  F.ENTRY = { x: 9 * T, y: H - 1.4 * T };
  F.FLOOR_TOP = 3.3 * T;
  F.ANVIL = { x: 9 * T, y: 6.2 * T };
  F.FURNACE = { x: 9 * T, y: 3.1 * T };
  F.STAND = { x: 15.2 * T, y: 5.4 * T };
  F.TROUGH = { x: 3.6 * T, y: 6.5 * T };
  F.SMITH = { x: 9 * T + 31, y: 6.0 * T };
  F.GRIND = { x: 13.6 * T, y: 8.3 * T };
  F.COAL = { x: 2.6 * T, y: 4.4 * T };
  F.BENCH = { x: 5.4 * T, y: 4.7 * T };
  F.WOOD = { x: 2.4 * T, y: 8.9 * T };
  F.BARREL = { x: 6.2 * T, y: 6.9 * T };
  const rect = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const OB = () => PAL.R.obsidian, FI = () => PAL.R.fire, KO = () => PAL.R.koa;
  const css = (c) => PAL.css(c);

  // ---------------------------------------------------------------- the room
  // Everything here is drawn from the master palette (tools/palette.py): obsidian for the lava stone, bark for
  // stone warmed by the furnace, koa for timber and leather, lauhala for baskets and the mat, kapa for cloth,
  // steel for iron, fire for flame and heat, skin for Kamaka. Gradients are 4x4 ordered dither (PAL.bayer),
  // outlines are the darkest step of what they wrap, and the light comes from the upper left (and, in here,
  // from the furnace).
  const P = () => PAL.R, pkc = (c) => PAL.pk(c), B = (x, y) => PAL.bayer(x, y);
  // fitted stones: a jittered grid of seeds, nearest seed per pixel; returns [cell id, edge, lit edge, shadow edge]
  function stones(cw, ch, salt) {
    const seed = (gx, gy) => [gx * cw + K.hash2(gx, gy, salt) * cw * 0.8 + cw * 0.1, gy * ch + K.hash2(gx, gy, salt + 1) * ch * 0.8 + ch * 0.1];
    const cell = (x, y) => { const gx = Math.floor(x / cw), gy = Math.floor(y / ch); let b = 1e9, b2 = 1e9, id = 0, cx0 = 0, cy0 = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const [sx, sy] = seed(gx + i, gy + j), d = (x - sx) ** 2 + ((y - sy) * cw / ch) ** 2; if (d < b) { b2 = b; b = d; id = (gx + i) * 7919 + (gy + j); cx0 = sx; cy0 = sy; } else if (d < b2) b2 = d; } return [id, Math.sqrt(b2) - Math.sqrt(b), cx0, cy0]; };
    return (x, y) => { const [id, gap, sx, sy] = cell(x, y), up = cell(x - 1, y - 1)[0], dn = cell(x + 1, y + 1)[0]; return [id, gap < 1.3, up !== id, dn !== id, (x - sx) / cw, (y - sy) / ch, sx, sy]; };
  }
  function bakeRoom() {
    const [cv, c] = K.canvas(W, H), im = c.createImageData(W, H), d = new Uint32Array(im.data.buffer), R = P();
    const O = R.obsidian.map(pkc), BK = R.bark.map(pkc), SO = R.soil.map(pkc), KO = R.koa.map(pkc), LH = R.lauhala.map(pkc), FI = R.fire.map(pkc);
    const floor = stones(19, 14, 11), wall = stones(14, 10, 23), wallH = Math.round(F.FLOOR_TOP), doorY = H - 0.7 * T;
    const FX = F.FURNACE.x, FY = F.FURNACE.y + 30;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let col;
      if (y < wallH) {
        // the back wall: fitted lava stones, a koa beam along the top and the wall's foot in shadow
        // (rounded cobbles: each lit on its upper left, shadowed lower right)
        const [id, edge, lit, sh, ux, uy, sx0, sy0] = wall(x, y), v = K.hash2(id, 1, 3), sheat = Math.max(0, 1 - Math.hypot(sx0 - FX, (sy0 - FY) * 1.25) / 190), ramp = sheat > K.hash2(id, 8, 8) * 0.9 + 0.1 ? BK : O;
        let ix = v > 0.66 ? 3 : v > 0.33 ? 2 : 1;
        const bump = -ux - uy; if (bump > 0.35) ix += 1; else if (bump < -0.45) ix -= 1;
        if (edge) ix = 0; else if (lit) ix += 1; else if (sh) ix -= 1;
        if (!edge && K.hash2(x >> 1, y >> 1, id & 255) > 0.93) ix -= 1;        // pitted, vesicular rock
        col = ramp[Math.max(0, Math.min(ramp.length - 1, ix))];
        if (y < 9) col = y === 0 || y === 8 ? KO[0] : y < 3 ? KO[4] : (x + (y << 2)) % 23 === 0 ? KO[1] : KO[3];
        else if (y > wallH - 4) col = y === wallH - 1 ? O[0] : O[1];
      } else if (x < 12 || x >= W - 12) {
        // the side walls, seen end on
        const v = K.hash2(x >> 2, y >> 3, 4); col = x === 11 || x === W - 12 ? O[0] : v > 0.5 ? O[2] : O[1];
      } else if (y >= doorY) {
        col = x > F.DOOR.x0 && x < F.DOOR.x1 ? (y === Math.ceil(doorY) ? O[4] : O[3]) : y === Math.ceil(doorY) ? O[0] : O[2];
      } else {
        // the floor: basalt flagstones, lit on their upper-left edges, the furnace's warmth across them
        // (a stone takes the furnace's warmth whole, nearer stones more often: no speckle)
        const [id, edge, lit, sh, , , sx0, sy0] = floor(x, y), v = K.hash2(id, 2, 5), sheat = Math.max(0, 1 - Math.hypot(sx0 - FX, (sy0 - FY) * 1.25) / 200), ramp = sheat > K.hash2(id, 8, 8) * 0.9 + 0.1 ? BK : O;
        let ix = v > 0.75 ? 3 : 2;
        if (edge) ix = 0; else if (lit) ix += 1; else if (sh) ix -= 1;
        col = ramp[Math.max(0, Math.min(ramp.length - 1, ix))];
        if (edge && K.hash2(x, y, 7) > 0.8) col = SO[2];                         // ash in the joints
        if (!edge && K.hash2(x >> 1, y >> 1, 9) > 0.9975) col = FI[2];          // a fallen ember
        // scorched stone round the anvil
        const sc = Math.hypot(x - F.ANVIL.x, (y - F.ANVIL.y) * 1.6);
        if (sc < 40 && !edge && (40 - sc) / 40 > B(x, y) * 0.8 + 0.35) col = sc < 22 ? SO[1] : SO[2];
        // the woven lauhala mat inside the door
        if (x > F.DOOR.x0 - 16 && x < F.DOOR.x1 + 16 && y > doorY - 30 && y < doorY - 4) {
          const mx = x - F.DOOR.x0 + 16, my = y - doorY + 30, cell = ((mx >> 2) + (my >> 2)) & 1, s2 = cell ? mx & 3 : my & 3;
          col = mx < 1 || my < 1 || mx > F.DOOR.x1 - F.DOOR.x0 + 30 || my > 24 ? LH[0] : s2 === 0 ? LH[1] : cell ? LH[3] : LH[2];
        }
      }
      d[y * W + x] = col;
    }
    c.putImageData(im, 0, 0);
    // daylight falling in through the door
    const g = c.createLinearGradient(0, H, 0, H - 3 * T); g.addColorStop(0, "rgba(255,240,200,0.28)"); g.addColorStop(1, "rgba(255,240,200,0)");
    c.fillStyle = g; c.beginPath(); c.moveTo(F.DOOR.x0, H); c.lineTo(F.DOOR.x1, H); c.lineTo(F.DOOR.x1 + 30, H - 3 * T); c.lineTo(F.DOOR.x0 - 30, H - 3 * T); c.fill();
    // koa posts in the corners of the back wall
    for (const px0 of [12, W - 20]) { rect(c, css(R.koa[0]), px0, 0, 8, wallH); rect(c, css(R.koa[3]), px0 + 1, 0, 6, wallH); rect(c, css(R.koa[4]), px0 + 1, 0, 2, wallH); }
    // tools hung on pegs beside the furnace: tongs, two hammers, a rasp, a fuller
    const ST = R.steel.map((q) => css(q));
    const tools = [[208, 24, "tongs"], [218, 26, "hammer"], [372, 24, "hammer2"], [382, 22, "tongs"], [392, 26, "rasp"]];
    for (const [x, y, k] of tools) {
      rect(c, css(R.koa[1]), x - 1, y - 7, 3, 3);
      if (k === "tongs") for (let i2 = 0; i2 < 28; i2++) { const sp = i2 > 20 ? (i2 - 20) * 0.35 : 0; rect(c, ST[0], x - 2 - sp, y - 4 + i2, 1, 1); rect(c, ST[1], x + 2 + sp, y - 4 + i2, 1, 1); }
      else if (k === "rasp") { rect(c, ST[0], x - 1, y - 4, 4, 22); for (let i2 = 0; i2 < 20; i2 += 2) rect(c, ST[1], x, y - 4 + i2, 2, 1); rect(c, css(R.koa[2]), x - 1, y + 18, 4, 8); }
      else { rect(c, css(R.koa[2]), x, y - 4, 2, 24); rect(c, css(R.koa[4]), x, y - 4, 1, 24); rect(c, ST[0], x - 4, y + 18, 10, 7); rect(c, ST[1], x - 3, y + 19, 8, 1); rect(c, ST[2], x - 3, y + 19, 3, 1); }
    }
    // the coal heap, black and glinting
    c.fillStyle = "rgba(6,4,10,0.55)"; c.beginPath(); c.ellipse(F.COAL.x, F.COAL.y + 13, 38, 9, 0, 0, Math.PI * 2); c.fill();
    const lumps = [];
    for (let k = 0; k < 160; k++) { const a = K.hash2(k, 1, 2) * Math.PI, r = Math.sqrt(K.hash2(k, 2, 3)), x = F.COAL.x + Math.cos(a) * r * 34, y = F.COAL.y + 12 - Math.sin(a) * r * 22; lumps.push([x, y, K.hash2(k, 5, 6) > 0.5 ? 4 : 3, k]); }
    lumps.sort((p2, q) => p2[1] - q[1]);
    for (const [x, y, sz, k] of lumps) { rect(c, css(R.obsidian[0]), Math.round(x) - 1, Math.round(y) - 1, sz + 2, sz + 1); rect(c, css(R.obsidian[1]), Math.round(x), Math.round(y), sz, sz - 1); rect(c, css(R.obsidian[K.hash2(k, 3, 4) > 0.5 ? 4 : 3]), Math.round(x), Math.round(y), sz - 1, 1); if (K.hash2(k, 3, 4) > 0.9) rect(c, css(R.obsidian[6]), Math.round(x), Math.round(y), 1, 1); }
    // a koa workbench: tongs, a file and a half-finished blade laid out, a woven crate of ore beside it
    { const bx = F.BENCH.x, by = F.BENCH.y, KO = R.koa;
      c.fillStyle = "rgba(6,4,10,0.45)"; c.fillRect(bx - 30, by - 2, 62, 5);
      for (const lx of [-27, 25]) { rect(c, css(KO[0]), bx + lx, by - 14, 4, 14); rect(c, css(KO[2]), bx + lx + 1, by - 14, 2, 13); }
      rect(c, css(KO[0]), bx - 31, by - 22, 64, 9); rect(c, css(KO[3]), bx - 30, by - 21, 62, 6); rect(c, css(KO[5]), bx - 30, by - 21, 62, 1); for (let k = -30; k < 32; k += 9) rect(c, css(KO[2]), bx + k, by - 20, 1, 5);
      rect(c, css(R.steel[0]), bx - 22, by - 24, 16, 2); rect(c, css(R.steel[2]), bx - 22, by - 24, 14, 1); rect(c, css(KO[1]), bx - 6, by - 24, 5, 2);       // the blade
      rect(c, css(R.steel[1]), bx + 4, by - 25, 10, 2); rect(c, css(R.steel[1]), bx + 6, by - 23, 9, 1);                                                     // the tongs
      rect(c, css(R.steel[0]), bx + 18, by - 26, 2, 4); rect(c, css(KO[3]), bx + 18, by - 29, 2, 3);                                                         // a chisel
      const LHr = R.lauhala; for (let y = 0; y < 10; y++) for (let x = 0; x < 14; x++) rect(c, css(x === 0 || x === 13 || y === 9 ? LHr[0] : y === 0 ? LHr[4] : (x + (y >> 1)) & 1 ? LHr[2] : LHr[3]), bx + 36 + x, by - 10 + y, 1, 1);
      for (let k = 0; k < 6; k++) rect(c, css(k % 2 ? R.stone[3] : R.stone[2]), bx + 38 + k * 2, by - 12 - (k % 3), 3, 3); }
    // split koa firewood stacked against the wall, end grain out
    { const wx = F.WOOD.x, wy = F.WOOD.y, BK = R.bark, KO = R.koa;
      c.fillStyle = "rgba(6,4,10,0.45)"; c.fillRect(wx - 30, wy - 2, 62, 5);
      for (let row = 0; row < 4; row++) for (let k = 0; k < 6 - row; k++) { const lx = wx - 26 + k * 10 + row * 5, ly = wy - 8 - row * 8; for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const rr = Math.hypot(x, y * 1.05); if (rr > 4.6) continue; c.fillStyle = css(rr > 3.8 ? BK[0] : rr > 3 ? BK[2] : (Math.round(rr) % 2) ? KO[4] : KO[3]); c.fillRect(lx + x, ly + y, 1, 1); } c.fillStyle = css(KO[5]); c.fillRect(lx - 2, ly - 2, 1, 1); } }
    // a water barrel of koa staves bound with cord
    { const bx = F.BARREL.x, by = F.BARREL.y, KO = R.koa, WR = R.water;
      c.fillStyle = "rgba(6,4,10,0.45)"; c.beginPath(); c.ellipse(bx, by + 1, 13, 4, 0, 0, Math.PI * 2); c.fill();
      for (let y = 0; y < 20; y++) for (let x = -11; x <= 11; x++) { const hw = 10 + Math.sin((y / 20) * Math.PI) * 1.5; if (Math.abs(x) > hw) continue; const band = y === 4 || y === 15; c.fillStyle = css(Math.abs(x) > hw - 1 ? KO[0] : band ? R.lauhala[1] : (x + 12) % 5 === 0 ? KO[1] : x < -3 ? KO[4] : KO[3]); c.fillRect(bx + x, by - 20 + y, 1, 1); }
      for (let x = -9; x <= 9; x++) { c.fillStyle = css(Math.abs(x) > 8 ? KO[1] : x < -4 ? WR[3] : WR[2]); c.fillRect(bx + x, by - 21, 1, 2); } c.fillStyle = css(KO[0]); c.fillRect(bx - 10, by - 22, 21, 1); }
    rect(c, css(R.koa[2]), F.COAL.x + 26, F.COAL.y - 14, 2, 26); rect(c, css(R.steel[1]), F.COAL.x + 23, F.COAL.y + 10, 8, 6); rect(c, css(R.steel[2]), F.COAL.x + 23, F.COAL.y + 10, 8, 1);   // a shovel
    return cv;
  }
  // the furnace: a great dome of fitted lava stone, its arched mouth ringed with voussoirs, a chimney stack
  // rising to the rafters; the fire inside is painted live
  function bakeFurnace() {
    const w = 128, h = 132, [cv, c] = K.canvas(w, h), im = c.createImageData(w, h), d = new Uint32Array(im.data.buffer), R = P();
    const O = R.obsidian.map(pkc), BK = R.bark.map(pkc), st = stones(12, 9, 41), my = h - 26, mr = 22;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const cx = x + 0.5 - w / 2;
      // the chimney stack
      if (y < 44) { if (Math.abs(cx) > 13) continue; const [id, edge, lit] = st(x, y), v = K.hash2(id, 3, 1); let ix = edge ? 0 : lit ? 4 : v > 0.5 ? 3 : 2; if (Math.abs(cx) > 12) ix = 0; else if (cx < -9 && !edge) ix += 1; d[y * w + x] = O[Math.min(6, ix)]; continue; }
      const dx = cx / 62, dy = (y + 0.5 - h + 2) / 88, rr = dx * dx + dy * dy;
      if (rr > 1 || y > h - 2) continue;
      const nz = Math.sqrt(Math.max(0, 1 - rr)), lightv = -dx * 0.55 - dy * 0.45 + nz * 0.5;
      const [id, edge, lit, sh] = st(x, y), v = K.hash2(id, 5, 2), heat = Math.max(0, 1 - Math.hypot(cx, y - my) / 46);
      const ramp = heat > B(x, y) + 0.45 ? BK : O;
      let ix = (lightv > 0.55 ? 4 : lightv > 0.3 ? 3 : lightv > 0.05 ? 2 : 1) + (v > 0.7 ? 1 : v < 0.2 ? -1 : 0);
      if (edge) ix = Math.max(0, ix - 3); else if (lit) ix += 1; else if (sh) ix -= 1;
      if (rr > 0.94) ix = 0;
      d[y * w + x] = ramp[Math.max(0, Math.min(ramp.length - 1, ix))];
    }
    c.putImageData(im, 0, 0);
    // the arch: voussoirs radiating round the mouth, then the mouth itself cut out (the fire shows through)
    for (let a = 0; a <= Math.PI; a += 0.012) for (let r = mr; r < mr + 6; r++) { const x = Math.round(w / 2 + Math.cos(a) * r), y = Math.round(my - Math.sin(a) * r), seg = Math.floor(a / (Math.PI / 9)); c.fillStyle = css(r === mr + 5 || Math.abs(a - (seg + 0.5) * Math.PI / 9) > Math.PI / 9 * 0.44 ? R.obsidian[0] : r < mr + 2 ? R.bark[5] : seg % 2 ? R.bark[3] : R.bark[4]); c.fillRect(x, y, 1, 1); }
    for (let a = 0; a <= Math.PI; a += 0.01) for (let r = 0; r < mr; r += 0.5) c.clearRect(Math.round(w / 2 + Math.cos(a) * r), Math.round(my - Math.sin(a) * r), 1, 1);
    c.clearRect(w / 2 - mr + 1, my, mr * 2 - 1, h - my);
    // a hearth step of dressed stone in front of the mouth
    for (let x = w / 2 - mr - 8; x < w / 2 + mr + 8; x++) { c.fillStyle = css(x === w / 2 - mr - 8 || x === w / 2 + mr + 7 ? R.obsidian[0] : R.obsidian[4]); c.fillRect(x, h - 6, 1, 1); c.fillStyle = css(R.obsidian[2]); c.fillRect(x, h - 5, 1, 4); }
    return { img: cv, w, h, mx: w / 2, my, mr };
  }

  // ---------------------------------------------------------------- Kamaka
  // Hand-pixelled like the hero and the merchant (24x32, chibi, the shared outline and skin colours): a burly
  // smith with his hair in a topknot tied with red kapa, a thick black beard, kākau bands on his arms, cloth
  // wraps at his wrists, a koa-leather apron over a red malo. Front, back and walking frames; at the anvil his
  // hammer arm is drawn on its own so it can swing.
  const KP = () => Object.assign({}, window.CHARART.PAL, {
    h: [26, 20, 30], H: [52, 44, 58], j: [96, 86, 108], b: [30, 24, 34], r: [196, 62, 42], R: [138, 42, 26],
    s: [150, 92, 60], S: [112, 66, 44], k: [176, 116, 78], a: [126, 80, 46], A: [90, 50, 32], l: [168, 112, 66],
    c: [60, 30, 18], u: [60, 30, 18], q: [232, 216, 184], t: [52, 30, 34], f: [70, 40, 26],
  });
  const K_FRONT = [
    "........................", "..........oooo..........", ".........ohhjho.........", ".........ohhhho.........",
    "..........orro..........", "........oohhhhoo........", ".......ohhhjjhhho.......", "......ohhHHhhHHhho......",
    "......ohkkkkkkkkho......", "......okkkkkkkkkko......", "......okhhkkkkhhko......", "......okkekkkkekko......",
    "......oskekkkkekso......", "......oSkkkSSkkkSo......", "......obbkkkkkkbbo......", ".......obbkmmkbbo.......",
    ".......obbbbbbbbo.......", "........obbbbbbo........", "...oooosSbbbbbbSsoooo...", "..oskksSaacbbcaaSskkso..",
    "..osttsSaaaccaaaSsttso..", "..oskksSAalaaaaASskkso..", "..oSkkSoAalaaaaAoSkkSo..", "..oSkkSoAalauuaAoSkkSo..",
    "...oqqoAAalaaaaAAoqqo...", "...osSoAaalaaaaaAoSso...", "....oooAaaalaaaaAooo....", ".......oAaaaaaaaAo......",
  ];
  const K_BACKHEAD = [
    "......ohhhhhhhhhho......", "......ohhhHhhhhhho......", "......ohhhhhhHhhho......", "......ohhhhhhhhhho......",
    "......oshhhhhhhhso......", "......oSshhhhhhsSo......", ".......oSssssssSo.......", ".......osssssssso.......",
    "........osSSSSso........", "........osssssso........",
  ];
  const K_LEGS = [
    [".......oSso..oSso.......", ".......oSso..oSso.......", ".......offo..offo.......", ".......oooo..oooo......."],
    [".......oSso..oSso.......", ".......offo..oSso.......", ".......oooo..offo.......", "..............oooo......"],
    [".......oSso..oSso.......", ".......oSso..offo.......", ".......offo..oooo.......", ".......oooo............."],
  ];
  // the back: the apron's ties crossing his bare back, the malo showing below
  const K_BACK = K_FRONT.slice(0, 8).concat(K_BACKHEAD, K_FRONT.slice(18).map((row, r) => {
    let out = row.replace(/[aAlbc]/g, r >= 6 ? "r" : "s").replace(/u/g, "c");
    if (r < 5) { const a2 = 8 + r, b2 = 15 - r; out = out.slice(0, a2) + "c" + out.slice(a2 + 1, b2) + "c" + out.slice(b2 + 1); }
    return out;
  }));
  // at the anvil: the front with the hammer arm (screen right) taken off, to be drawn swinging
  const K_WORK = K_FRONT.map((row, r) => (r >= 19 && r <= 25 ? row.slice(0, 17) + "o" + "......" : r === 18 ? row.slice(0, 17) + "o......" : row));
  const KF = {};
  function kFrame(kind, leg) {
    const key = kind + leg; if (KF[key]) return KF[key];
    const rows = (kind === "back" ? K_BACK : kind === "work" ? K_WORK : K_FRONT).concat(K_LEGS[leg]);
    const [c, x] = K.canvas(24, 32); K.pixmap(x, rows, KP(), 0, 0, false, 24); return (KF[key] = c);
  }
  // the hammer arm, from the shoulder: a bare arm with its kākau band and wrap, the koa haft and the iron head
  function drawHammerArm(ctx, ang) {
    const P2 = KP(), sx = 17.5, sy = 19.5, ca = Math.cos(ang), sa = Math.sin(ang), dot = (x, y, c, w) => { ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; ctx.fillRect(Math.round(x - w / 2), Math.round(y - w / 2), w, w); };
    for (const pass of [0, 1]) {
      for (let u = 0; u <= 6; u += 0.5) dot(sx + ca * u, sy + sa * u, pass ? (u > 4.5 ? P2.q : u > 1.5 && u < 3 ? P2.t : P2.k) : P2.o, pass ? 2 : 4);
      for (let u = 6; u <= 14; u += 0.5) dot(sx + ca * u, sy + sa * u, pass ? (u > 12 ? [52, 56, 70] : P2.a) : P2.o, pass ? 1 : 3);
    }
    const hx = sx + ca * 14, hy = sy + sa * 14;
    for (let i2 = -3; i2 <= 3; i2++) { dot(hx - sa * i2, hy + ca * i2, P2.o, 4); }
    for (let i2 = -3; i2 <= 3; i2++) { dot(hx - sa * i2, hy + ca * i2, i2 < -1 ? [150, 160, 176] : [80, 86, 104], 2); }
  }
  // a still Kamaka, for the Duel Hall
  function smithArt() { return kFrame("front", 0); }

  // ---- his day in the forge: hammering at the anvil, wandering the floor, stopping to admire the weapons on
  // the racks, going through the bench, the shard baskets and the barrel; turning to you when you come up,
  // and back to the anvil at once when there's work for you
  const WORK_AT = { x: 9 * T + 16, y: 5.7 * T };
  const SPOTS = {
    admire: [{ x: 130, y: 124 }, { x: 440, y: 124 }, { x: 505, y: 124 }],
    rummage: [{ x: 183, y: 160 }, { x: 470, y: 128 }, { x: 6.2 * T, y: 6.9 * T + 12 }],
  };
  function kam() {
    if (!F.kam) F.kam = { x: WORK_AT.x, y: WORK_AT.y, state: "work", t: 0, next: 6 + Math.random() * 6, face: -1, look: "front", walkPh: 0 };
    return F.kam;
  }
  const freeAt = (x, y) => { F.ignoreSmith = true; const s2 = F.solidAt(x, y) || F.solidAt(x - 5, y) || F.solidAt(x + 5, y); F.ignoreSmith = false; return !s2; };
  function goTo(k, x, y, then, fast) { k.state = "walk"; k.tx = x; k.ty = y; k.then = then; k.fast = fast; k.t = 0; k.stuck = 0; }
  function pickActivity(k) {
    const r = Math.random();
    if (r < 0.3) { const s2 = SPOTS.admire[(Math.random() * SPOTS.admire.length) | 0]; goTo(k, s2.x, s2.y, "admire"); }
    else if (r < 0.62) { const s2 = SPOTS.rummage[(Math.random() * SPOTS.rummage.length) | 0]; goTo(k, s2.x, s2.y, "rummage"); }
    else { for (let n = 0; n < 20; n++) { const x = 100 + Math.random() * 440, y = 140 + Math.random() * 160; if (freeAt(x, y)) { goTo(k, x, y, "idle"); return; } } k.state = "work"; k.next = 5; }
  }
  function kamUpdate(dt, t, px, py) {
    const k = kam();
    k.t += dt;
    const near = Math.hypot(px - k.x, py - k.y) < 46;
    if (F.work > 0 && k.state !== "work" && !(k.state === "walk" && k.then === "work")) goTo(k, WORK_AT.x, WORK_AT.y, "work", true);
    if (k.state === "walk") {
      const dx = k.tx - k.x, dy = k.ty - k.y, d = Math.hypot(dx, dy), sp = (k.fast ? 78 : 36) * dt;
      if (d < 2) { k.state = k.then; k.t = 0; k.next = k.then === "work" ? 7 + Math.random() * 8 : k.then === "idle" ? 1.5 + Math.random() * 2 : 3 + Math.random() * 2.5; k.moving = false; }
      else {
        const mx = (dx / d) * Math.min(sp, d), my = (dy / d) * Math.min(sp, d); let moved = false;
        if (freeAt(k.x + mx, k.y)) { k.x += mx; moved = true; } if (freeAt(k.x, k.y + my)) { k.y += my; moved = true; }
        if (!moved) { k.stuck += dt; if (k.stuck > 0.8) { goTo(k, WORK_AT.x, WORK_AT.y, "work", k.fast); if (!freeAt(k.x, k.y)) { k.x = WORK_AT.x; k.y = WORK_AT.y; } } }
        k.moving = moved; k.walkPh += dt * 8; k.face = Math.abs(dx) > 2 ? (dx > 0 ? 1 : -1) : k.face; k.look = Math.abs(dy) > Math.abs(dx) && dy < 0 ? "back" : "front";
      }
    } else {
      k.moving = false;
      if (k.state === "work") { k.face = -1; k.look = "work"; if (k.t > k.next && F.work <= 0 && !near) pickActivity(k); }
      else if (k.state === "admire" || k.state === "rummage") { k.look = "back"; if (k.t > k.next) { if (Math.random() < 0.6) goTo(k, WORK_AT.x, WORK_AT.y, "work"); else pickActivity(k); } }
      else if (k.state === "idle") { k.look = "front"; if (k.t > k.next) { if (Math.random() < 0.55) goTo(k, WORK_AT.x, WORK_AT.y, "work"); else pickActivity(k); } }
      // you've come up to him: he turns to you (unless he's busy with your order)
      if (near && !(k.state === "work" && F.work > 0)) { k.look = "front"; k.face = px >= k.x ? 1 : -1; }
    }
    F.SMITH.x = k.x; F.SMITH.y = k.y;
    return k;
  }
  F.drawKamaka = function (ctx, X, Y, k, arm, t) {
    const leg = k.moving ? 1 + (Math.floor(k.walkPh / Math.PI) % 2) : 0;
    const working = k.look === "work" && k.state === "work";
    const bob = k.state === "rummage" ? Math.round(Math.abs(Math.sin(t * 5))) : k.state === "admire" && Math.sin(t * 1.3) > 0.9 ? 1 : 0;
    ctx.fillStyle = "rgba(10,12,16,0.3)"; ctx.beginPath(); ctx.ellipse(X, Y, 8, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(X, Y + bob); ctx.scale(k.face < 0 ? -1 : 1, 1); ctx.translate(-12, -31);
    ctx.drawImage(kFrame(working ? "work" : k.look === "back" ? "back" : "front", working ? 0 : leg), 0, 0);
    if (working) drawHammerArm(ctx, arm);
    ctx.restore();
    // going through things: a little dust and the odd clink
    if (k.state === "rummage" && Math.random() < 0.08) Combat.addPart({ x: X + (Math.random() - 0.5) * 12, y: Y - 18, vx: (Math.random() - 0.5) * 20, vy: -20, g: 60, life: 0.5, col: "#c8b490", size: 1, kind: "debris" });
  };

  F.build = function () {
    F.ground = bakeRoom(); F.furnace = bakeFurnace(); F.smith = smithArt();
    F.sparks = []; F.steam = []; F.work = 0; F.workCol = null; F.quench = 0;
  };
  // Kamaka sets to work: called when he forges, weaves or tempers something for you. He hammers fast for a
  // while, the sparks fly in the colour of the element, and then he quenches it in a burst of steam.
  F.forgeWork = function (col) { F.work = 1.8; F.workCol = col || null; };
  F.solidAt = function (x, y) {
    if (y > H - 0.7 * T) return !(x > F.DOOR.x0 + 4 && x < F.DOOR.x1 - 4) || y > H + 30;
    if (x < 0.5 * T || x > W - 0.5 * T || y < F.FLOOR_TOP + 4) return true;
    if (Math.abs(x - F.FURNACE.x) < 60 && y < F.FURNACE.y + 32) return true;                     // the furnace and its hearth
    if (Math.abs(x - F.ANVIL.x) < 13 && Math.abs(y - F.ANVIL.y) < 6) return true;                 // the anvil
    if (Math.abs(x - F.TROUGH.x) < 24 && Math.abs(y - F.TROUGH.y) < 8) return true;              // the trough
    if (Math.abs(x - F.STAND.x) < 9 && Math.abs(y - F.STAND.y) < 5) return true;                  // the armour stand
    if (!F.ignoreSmith && Math.abs(x - F.SMITH.x) < 8 && Math.abs(y - F.SMITH.y) < 5) return true;
    if (Math.abs(x - F.GRIND.x) < 16 && Math.abs(y - F.GRIND.y) < 6) return true;                 // the grindstone
    if (Math.abs(x - F.COAL.x) < 36 && y < F.COAL.y + 18) return true;                            // the coal heap
    if (x > F.BENCH.x - 32 && x < F.BENCH.x + 52 && y < F.BENCH.y + 2) return true;               // the workbench
    if (Math.abs(x - F.WOOD.x) < 32 && y > F.WOOD.y - 36 && y < F.WOOD.y + 2) return true;         // the woodpile
    if (Math.abs(x - F.BARREL.x) < 12 && Math.abs(y - F.BARREL.y + 2) < 5) return true;           // the barrel
    return false;
  };
  F.near = function (x, y) {
    if (Math.hypot(x - F.SMITH.x, y - F.SMITH.y) < 32 || Math.hypot(x - F.ANVIL.x, y - F.ANVIL.y) < 26) return "smith";
    if (Math.hypot(x - F.STAND.x, y - F.STAND.y) < 26) return "stand";
    return null;
  };

  // ---------------------------------------------------------------- drawing
  let chalk = new Map();
  const chalkOf = (img) => { let c = chalk.get(img); if (c) return c; const [cv, x] = K.canvas(img.width, img.height); x.drawImage(img, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#e8e0d0"; x.fillRect(0, 0, img.width, img.height); chalk.set(img, cv); return cv; };
  F.render = function (actx, bctx, g, ox, oy, LW, LH, t, py, px) {
    F.lastPx = px || 0;
    const R = P(), Fi = R.fire, dt = 1 / 60;
    actx.fillStyle = "#0c0808"; actx.fillRect(0, 0, LW, LH);
    actx.drawImage(F.ground, ox, oy, LW, LH, 0, 0, LW, LH);
    if (F.work > 0) F.work -= dt;
    // ---- the furnace: live fire in the mouth, then the stone over it
    const fu = F.furnace, fx = Math.round(F.FURNACE.x - fu.w / 2 - ox), fy = Math.round(F.FURNACE.y + 32 - fu.h - oy), roar = 1 + (F.work > 0 ? 0.25 : 0) + 0.12 * Math.sin(t * 3.1);
    for (let y = 0; y < fu.mr + 26; y++) for (let x = -fu.mr; x <= fu.mr; x++) {
      const yy = y - fu.mr, inside = yy >= 0 ? Math.abs(x) < fu.mr : Math.hypot(x, yy) < fu.mr; if (!inside) continue;
      const n = K.noise(x * 0.18 + t * 0.9, y * 0.16 - t * 2.6), u = y / (fu.mr + 26), v = n * 0.75 + u * 0.75 * roar - Math.abs(x) / fu.mr * 0.25 + B(x, y) * 0.12;
      actx.fillStyle = css(v > 1.0 ? Fi[4] : v > 0.78 ? Fi[3] : v > 0.55 ? Fi[2] : v > 0.35 ? Fi[1] : Fi[0]); actx.fillRect(fx + fu.mx + x, fy + fu.my - fu.mr + y, 1, 1);
    }
    actx.drawImage(fu.img, fx, fy);
    // glowing coals heaped on the hearth, and flame tongues licking out over the arch
    for (let k = 0; k < 26; k++) { const cxk = fx + fu.mx - 18 + ((k * 37) % 36), cyk = fy + fu.h - 10 - ((k * 13) % 5), hot = Math.sin(t * 3 + k * 1.7) > 0.2; actx.fillStyle = css(hot ? Fi[3] : Fi[1]); actx.fillRect(cxk, cyk, 2, 2); if (hot && k % 3 === 0) { actx.fillStyle = css(Fi[4]); actx.fillRect(cxk, cyk, 1, 1); } }
    for (let k = 0; k < 4; k++) { const ph = (t * 1.3 + k * 0.27) % 1, lx = fx + fu.mx + Math.sin(k * 2.1 + t) * 10, ly = fy + fu.my - fu.mr + 2 - ph * 14; actx.fillStyle = `rgba(255,${180 - ph * 120 | 0},60,${(1 - ph) * 0.8})`; actx.fillRect(Math.round(lx), Math.round(ly), 2, 3); }
    // smoke rolling up the chimney
    for (let k = 0; k < 6; k++) { const u = (t * 0.3 + k / 6) % 1, r = 3 + u * 9; actx.fillStyle = `rgba(56,52,64,${0.45 * (1 - u)})`; actx.fillRect(Math.round(fx + fu.w / 2 - r + Math.sin(u * 5 + k) * 3), Math.round(fy - u * 30), Math.round(r * 2), Math.round(r)); }
    // ---- the bellows: two koa boards and a red leather bag between, breathing into the fire
    { const pump = 0.5 + 0.5 * Math.sin(t * (F.work > 0 ? 4.4 : 2.2)), bx = fx + fu.w - 6, by = fy + fu.h - 46, len = 38, open = 3 + pump * 9;
      const KO = R.koa, KP = R.kapa;
      actx.fillStyle = css(KO[0]); actx.fillRect(bx - 1, by + 18 - 1, len + 2, 5); actx.fillStyle = css(KO[3]); actx.fillRect(bx, by + 18, len, 3); actx.fillStyle = css(KO[4]); actx.fillRect(bx, by + 18, len, 1);
      for (let x = 0; x < len - 6; x++) { const hgt = open * (1 - x / (len * 1.2)), fold = Math.floor(x / 4) % 2; for (let y = 0; y < hgt; y++) { actx.fillStyle = css(y < 1 ? KP[0] : fold ? KP[1] : KP[2]); actx.fillRect(bx + 3 + x, Math.round(by + 18 - y), 1, 1); } }
      const topY = Math.round(by + 18 - open - 3); actx.fillStyle = css(KO[0]); actx.fillRect(bx - 1, topY - 1, len + 2, 5); actx.fillStyle = css(KO[3]); actx.fillRect(bx, topY, len, 3); actx.fillStyle = css(KO[5]); actx.fillRect(bx, topY, len, 1);
      actx.fillStyle = css(KO[2]); actx.fillRect(bx + len, topY - 4, 3, 8);                                     // the handle
      actx.fillStyle = css(R.steel[1]); actx.fillRect(bx - 8, by + 15, 9, 3); actx.fillStyle = css(R.steel[2]); actx.fillRect(bx - 8, by + 15, 9, 1);   // the nozzle
      if (pump < 0.08 && !F.puffed) { F.puffed = true; for (let k = 0; k < 5; k++) F.sparks.push({ x: F.FURNACE.x + 20 + Math.random() * 8, y: F.FURNACE.y + 12, vx: -20 - Math.random() * 30, vy: -30 - Math.random() * 40, life: 0.6, g: 60 }); } else if (pump > 0.2) F.puffed = false;
    }
    // ---- the racks of forged weapons on the wall: the element weapons you've made hang in their places;
    // the ones still to be made are only chalk outlines
    let slot = 0;
    for (const k of Gear.ORDER) {
      const E = Gear.ELEMENTS[k], w = Combat.weapons.find((q) => q.id === E.weapon); if (!w || !w.icon) continue;
      const rx = slot < 5 ? 26 + slot * 32 : 406 + (slot - 5) * 32, ry = 30, X = Math.round(rx - ox), Y = Math.round(ry - oy), have = Combat.unlocked.has(E.weapon);
      actx.fillStyle = css(R.koa[1]); actx.fillRect(X + 12, Y - 2, 4, 3); actx.fillStyle = css(R.koa[4]); actx.fillRect(X + 13, Y - 2, 2, 1);
      if (have) { actx.drawImage(w.icon, X, Y); if (g) Level.glowAt(g, X + 14, Y + 14, 16, E.glow, 0.12 + 0.05 * Math.sin(t * 2 + slot)); }
      else { actx.globalAlpha = 0.22; actx.drawImage(chalkOf(w.icon), X, Y); actx.globalAlpha = 1; }
      slot++;
    }
    // the plank shelf under each rack
    for (const [x0, n] of [[22, 5], [402, 4]]) { const X = Math.round(x0 - ox), Y = Math.round(62 - oy); actx.fillStyle = css(R.koa[0]); actx.fillRect(X, Y, n * 32 + 4, 4); actx.fillStyle = css(R.koa[3]); actx.fillRect(X, Y, n * 32 + 4, 2); actx.fillStyle = css(R.koa[5]); actx.fillRect(X, Y, n * 32 + 4, 1); }
    // ---- woven baskets of shards along the wall's foot: one for each element you hold, the shards glowing
    { let bi = 0; const S = Gear.state();
      for (const k of Gear.ORDER) {
        const n = (S.shards && S.shards[k]) || 0, E = Gear.ELEMENTS[k]; if (!n) continue;
        const bx = Math.round((C_BASKETS[bi] || 0) - ox), by = Math.round(F.FLOOR_TOP + 14 - oy), LHr = R.lauhala; bi++; if (bi > C_BASKETS.length) break;
        // the shards heaped in it
        const show = Math.min(5, n);
        for (let s2 = 0; s2 < show; s2++) { const sx2 = bx - 5 + s2 * 2.4, sh = 4 + ((s2 * 7) % 3); actx.fillStyle = E.col; actx.fillRect(Math.round(sx2), by - 6 - sh, 2, sh + 1); actx.fillStyle = "#ffffff"; actx.fillRect(Math.round(sx2), by - 6 - sh, 1, 1); }
        for (let y = 0; y < 8; y++) for (let x = -7; x <= 7; x++) { const w2 = 7 - y * 0.25; if (Math.abs(x) > w2) continue; actx.fillStyle = css(y === 0 ? LHr[4] : Math.abs(x) > w2 - 1 || y === 7 ? LHr[0] : ((x + 8 + (y >> 1)) & 1) ? LHr[2] : LHr[3]); actx.fillRect(bx + x, by - 7 + y, 1, 1); }
        if (g) Level.glowAt(g, bx, by - 10, 16, E.glow, 0.32 + 0.1 * Math.sin(t * 2.3 + bi));
      }
    }
    // ---- light: the furnace, its mouth pulsing, the coals
    if (g) { Level.glowAt(g, F.FURNACE.x - ox, F.FURNACE.y + 16 - oy, 190, "255,120,40", 0.42 + 0.08 * Math.sin(t * 5.3) + (F.work > 0 ? 0.08 : 0)); Level.glowAt(g, F.FURNACE.x - ox, F.FURNACE.y + 20 - oy, 46, "255,200,110", 0.6); Level.glowAt(g, F.COAL.x - ox, F.COAL.y + 6 - oy, 30, "255,110,50", 0.12); }
    // ---- the trough of quenching water, koa staves bound with cord
    const tx = Math.round(F.TROUGH.x - ox), ty = Math.round(F.TROUGH.y - oy), WR = R.water;
    actx.fillStyle = css(R.koa[0]); actx.fillRect(tx - 24, ty - 12, 48, 16); actx.fillStyle = css(R.koa[3]); actx.fillRect(tx - 23, ty - 11, 46, 2); actx.fillStyle = css(R.koa[2]); actx.fillRect(tx - 23, ty - 1, 46, 4);
    for (let k = -22; k <= 22; k += 6) { actx.fillStyle = css(R.koa[1]); actx.fillRect(tx + k, ty - 1, 1, 4); }
    for (let y = 0; y < 8; y++) for (let x = -21; x <= 21; x++) { const ph = Math.sin(x * 0.45 + t * 2.4 + y) + Math.sin(x * 0.2 - t * 1.3); actx.fillStyle = css(ph > 1.3 ? WR[4] : y < 2 ? WR[1] : ph > 0.4 ? WR[3] : WR[2]); actx.fillRect(tx + x, ty - 9 + y, 1, 1); }
    // ---- the y-sorted things: the anvil, Kamaka, the armour stand, the grindstone
    const draws = [];
    draws.push({ y: F.ANVIL.y, f: (c) => {
      const ax = Math.round(F.ANVIL.x - ox), ay = Math.round(F.ANVIL.y - oy), BK = R.bark, ST = R.steel;
      // the stump: rings on its top, bark down its sides
      for (let y = 0; y < 12; y++) for (let x = -10; x <= 10; x++) { if (Math.abs(x) > 10 - (y < 2 ? 1 : 0)) continue; c.fillStyle = css(y < 4 ? (Math.round(Math.hypot(x, (y - 2) * 3)) % 3 === 0 ? BK[2] : BK[4]) : Math.abs(x) > 8 ? BK[0] : (x + y * 3) % 5 === 0 ? BK[1] : x < -3 ? BK[3] : BK[2]); c.fillRect(ax + x, ay - 11 + y, 1, 1); }
      // the anvil: a waisted iron block with a horn to the left
      const top = ay - 19;
      c.fillStyle = css(ST[0]); c.fillRect(ax - 9, top - 1, 19, 6); c.fillRect(ax - 4, top + 4, 9, 5); c.fillRect(ax - 7, top + 8, 15, 3); c.fillRect(ax - 15, top, 6, 3);
      c.fillStyle = css(ST[1]); c.fillRect(ax - 8, top, 17, 4); c.fillRect(ax - 3, top + 4, 7, 4); c.fillRect(ax - 6, top + 8, 13, 2); c.fillRect(ax - 14, top + 1, 6, 1);
      c.fillStyle = css(ST[2]); c.fillRect(ax - 8, top, 17, 1); c.fillRect(ax - 14, top + 1, 2, 1);
      // the workpiece, glowing
      const hot = F.work > 0 ? 1 : 0.55 + 0.25 * Math.sin(t * 1.7), col = F.work > 0 && F.workCol ? F.workCol : css(Fi[hot > 0.7 ? 4 : 3]);
      c.fillStyle = col; c.fillRect(ax - 4, top - 2, 9, 2); c.fillStyle = css(Fi[4]); c.fillRect(ax - 2, top - 2, 3, 1);
      if (g) Level.glowAt(g, ax, top - 2, 26, F.work > 0 && F.workCol ? hexRgb(F.workCol) : "255,170,80", 0.25 + hot * 0.25);
    } });
    // Kamaka: about his day; at the anvil his hammer rises and falls (faster while he works for you)
    const k = kamUpdate(dt, t, F.lastPx || 0, py), fast = F.work > 0, rate = fast ? 2.6 : 1.05, atAnvil = k.state === "work" && Math.hypot(k.x - WORK_AT.x, k.y - WORK_AT.y) < 3;
    F.beat = (F.beat || 0) + dt * rate; const beat = F.beat % 1;
    let arm;
    if (beat < 0.55) arm = 0.6 - Math.sin((beat / 0.55) * Math.PI / 2) * 2.5;                 // the hammer rising over his shoulder
    else if (beat < 0.64) { const u = (beat - 0.55) / 0.09; arm = -1.9 + u * u * 2.5; }        // and coming down on the work
    else arm = 0.6;
    const strike = atAnvil && beat >= 0.63 && beat < 0.7;
    if (strike && !F.struck) {
      F.struck = true; const col = fast && F.workCol ? F.workCol : null;
      for (let n = 0; n < (fast ? 26 : 14); n++) F.sparks.push({ x: F.ANVIL.x - 1, y: F.ANVIL.y - 21, vx: (Math.random() - 0.5) * 150, vy: -50 - Math.random() * 100, life: 0.45 + Math.random() * 0.35, col });
      window.Ambience && Ambience.sfx && Ambience.sfx("clank");
    }
    if (!strike) F.struck = false;
    if (fast && F.work < 0.1 && !F.quenched) { F.quenched = true; F.quench = 1; window.Ambience && Ambience.sfx && Ambience.sfx("steam"); } else if (F.work > 0.5) F.quenched = false;
    if (F.quench > 0) F.quench -= dt * 0.8;
    draws.push({ y: k.y, f: (c) => F.drawKamaka(c, Math.round(k.x - ox), Math.round(k.y - oy), k, arm, t) });
    // the armour stand, wearing what you wear
    draws.push({ y: F.STAND.y, f: (c) => {
      const sx = Math.round(F.STAND.x - ox), sy = Math.round(F.STAND.y - oy), a = Gear.worn(), KO = R.koa;
      c.fillStyle = css(KO[0]); c.fillRect(sx - 2, sy - 30, 5, 30); c.fillRect(sx - 9, sy - 2, 19, 3); c.fillStyle = css(KO[3]); c.fillRect(sx - 1, sy - 30, 2, 29); c.fillRect(sx - 8, sy - 2, 17, 1);
      c.fillStyle = css(KO[0]); c.fillRect(sx - 11, sy - 27, 23, 3); c.fillStyle = css(KO[4]); c.fillRect(sx - 10, sy - 27, 21, 1);
      const v = a ? a.pal.v : [60, 50, 50], V = a ? a.pal.V : [40, 34, 34], l = a ? a.pal.l : [80, 70, 70];
      c.fillStyle = PAL.css([V[0] * 0.6, V[1] * 0.6, V[2] * 0.6]); c.fillRect(sx - 9, sy - 26, 19, 16); c.fillStyle = PAL.css(V); c.fillRect(sx - 8, sy - 25, 17, 14); c.fillStyle = PAL.css(v); c.fillRect(sx - 7, sy - 25, 14, 12); c.fillStyle = PAL.css(l); c.fillRect(sx - 7, sy - 25, 4, 12);
      c.fillStyle = css(KO[3]); c.fillRect(sx - 3, sy - 33, 7, 6); c.fillStyle = css(KO[5]); c.fillRect(sx - 3, sy - 33, 3, 2);
    } });
    // the grindstone: a stone wheel turning slowly in its koa frame, a trough of water beneath
    draws.push({ y: F.GRIND.y, f: (c) => {
      const gx = Math.round(F.GRIND.x - ox), gy = Math.round(F.GRIND.y - oy), SR = R.stone, KO = R.koa, a0 = t * 1.4;
      c.fillStyle = css(KO[0]); c.fillRect(gx - 15, gy - 6, 31, 7); c.fillStyle = css(KO[3]); c.fillRect(gx - 14, gy - 5, 29, 2);
      c.fillStyle = css(R.water[2]); c.fillRect(gx - 9, gy - 4, 19, 2);
      for (let y = -11; y <= 11; y++) for (let x = -4; x <= 4; x++) { const rr = Math.hypot(x * 2.6, y); if (rr > 11.5) continue; const ang = Math.atan2(y, x * 2.6) + a0, mark = Math.cos(ang * 6) > 0.85 && rr > 5; c.fillStyle = css(rr > 10.5 ? SR[1] : mark ? SR[2] : x < 0 ? SR[4] : SR[3]); c.fillRect(gx + x, gy - 16 + y, 1, 1); }
      c.fillStyle = css(KO[1]); c.fillRect(gx - 12, gy - 18, 2, 14); c.fillRect(gx + 11, gy - 18, 2, 14); c.fillRect(gx - 12, gy - 17, 25, 2); c.fillStyle = css(KO[4]); c.fillRect(gx - 12, gy - 17, 25, 1);
    } });
    for (const d of draws.sort((p2, q) => p2.y - q.y)) d.f(d.y < py ? actx : bctx);
    // ---- sparks, steam from the trough after a quench, and the room's warm dark
    for (const s of F.sparks) { s.vy += (s.g ?? 260) * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; bctx.fillStyle = s.col ? (s.life > 0.3 ? "#ffffff" : s.col) : s.life > 0.3 ? css(Fi[4]) : css(Fi[3]); bctx.fillRect(Math.round(s.x - ox), Math.round(s.y - oy), 1, 1); if (g) Level.glowAt(g, s.x - ox, s.y - oy, 5, s.col ? hexRgb(s.col) : "255,170,60", 0.5); }
    F.sparks = F.sparks.filter((s) => s.life > 0 && s.y < F.ANVIL.y + 10);
    const steam = 4 + Math.round(F.quench * 10);
    for (let k = 0; k < steam; k++) { const u = (t * (0.4 + F.quench * 0.6) + k / steam) % 1; bctx.fillStyle = `rgba(230,236,240,${(0.35 + F.quench * 0.4) * (1 - u)})`; bctx.fillRect(Math.round(tx - 16 + ((k * 9) % 32) + Math.sin(u * 6 + k) * 3), Math.round(ty - 11 - u * (26 + F.quench * 20)), Math.round(4 + u * 6), Math.round(3 + u * 3)); }
    const gr = actx.createRadialGradient(F.FURNACE.x - ox, F.FURNACE.y + 50 - oy, 50, F.FURNACE.x - ox, F.FURNACE.y + 50 - oy, W * 0.72);
    gr.addColorStop(0, "rgba(255,120,40,0.05)"); gr.addColorStop(1, "rgba(12,4,6,0.52)");
    bctx.fillStyle = gr; bctx.fillRect(0, 0, LW, LH);
  };
  // where the shard baskets stand along the wall, right of the bellows
  const C_BASKETS = [400, 416, 432, 448, 464, 480, 496, 512, 528];
  const hexRgb = (h) => { const n = parseInt(h.slice(1), 16); return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`; };

  // ---------------------------------------------------------------- on the island
  // The building: obsidian block walls, a roof of charred thatch, a stone chimney breathing smoke and
  // sparks, and a doorway full of firelight. Before it's built: the plot, staked and roped, with a sign.
  let exterior = null;
  function bakeExterior() {
    const w = 120, h = 104, [cv, c] = K.canvas(w, h), O = OB(), wallTop = 52;
    for (let y = wallTop; y < h - 2; y++) for (let x = 10; x < w - 10; x++) {
      const row = Math.floor(y / 7), lx = (x + (row % 2) * 6) % 12, ly = y % 7, v = K.hash2(Math.floor((x + (row % 2) * 6) / 12), row, 6);
      c.fillStyle = css(lx === 0 || ly === 0 ? O[0] : ly === 1 ? O[4] : v > 0.6 ? O[3] : v > 0.3 ? O[2] : O[1]); c.fillRect(x, y, 1, 1);
    }
    rect(c, css(O[0]), 9, wallTop, 1, h - wallTop - 2); rect(c, css(O[0]), w - 10, wallTop, 1, h - wallTop - 2); rect(c, css(O[0]), 9, h - 3, w - 18, 2);
    // a doorway full of firelight
    const dw = 22, dh = 30, dx0 = w / 2 - dw / 2;
    rect(c, css(O[0]), dx0 - 3, h - dh - 5, dw + 6, dh + 3);
    for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) { const v = y / dh; c.fillStyle = `rgb(${120 + v * 120 | 0},${40 + v * 70 | 0},${20 + v * 10 | 0})`; c.fillRect(dx0 + x, h - dh - 2 + y, 1, 1); }
    rect(c, css(KO()[1]), dx0 - 3, h - dh - 6, dw + 6, 3); rect(c, css(KO()[3]), dx0 - 3, h - dh - 6, dw + 6, 1);
    // charred thatch roof
    const straw = ["#1a120e", "#3a2a20", "#54402e", "#6e5638", "#8a6e46"];
    for (let y = 6; y < wallTop + 6; y++) {
      const half = Math.round(6 + ((y - 6) / wallTop) * (w / 2 - 2));
      for (let x = w / 2 - half; x < w / 2 + half; x++) {
        const strand = (K.hash2(x, Math.floor(y / 3), 71) * 3) | 0, shade = x > w / 2 ? 1 : 0;
        let col = straw[2 + (strand === 2 ? 1 : 0) - shade];
        if ((x + Math.floor(y / 2)) % 5 === 0 || y % 7 === 6) col = straw[1];
        if (x === Math.round(w / 2 - half) || x === Math.round(w / 2 + half) - 1) col = straw[0];
        c.fillStyle = col; c.fillRect(x, y, 1, 1);
      }
    }
    // the chimney: fitted stone, rising through the roof
    for (let y = 0; y < 40; y++) for (let x = 0; x < 14; x++) { const row = Math.floor(y / 5), v = K.hash2(Math.floor((x + (row % 2) * 3) / 6), row, 2); c.fillStyle = css(x === 0 || x === 13 ? O[0] : y % 5 === 0 ? O[1] : v > 0.5 ? O[3] : O[2]); c.fillRect(w - 38 + x, y, 1, 1); }
    rect(c, css(O[0]), w - 39, 0, 16, 3);
    // a magma-red sign over the door: crossed hammer and tongs
    rect(c, css(KO()[0]), w / 2 - 9, wallTop + 6, 18, 12); rect(c, css(KO()[2]), w / 2 - 8, wallTop + 7, 16, 10);
    c.strokeStyle = "#ff8a3a"; c.lineWidth = 1; c.beginPath(); c.moveTo(w / 2 - 5, wallTop + 15); c.lineTo(w / 2 + 5, wallTop + 8); c.moveTo(w / 2 + 5, wallTop + 15); c.lineTo(w / 2 - 5, wallTop + 8); c.stroke();
    return { img: cv, w, h, chimney: { x: w - 31, y: 0 } };
  }
  // what the island needs: objects to draw (y-sorted) and boxes to collide with
  F.islandObjects = function () {
    const out = [];
    for (const p of Gear.PLOTS) {
      if (Gear.built(p.id) && p.id === "forge") {
        const E = exterior || (exterior = bakeExterior()), x = p.x, y = p.y;
        out.push({ x, y, kind: "forge", box: null, draw(ctx, ox, oy, t, g) {
          ctx.drawImage(E.img, Math.round(x - E.w / 2 - ox), Math.round(y - E.h - oy + 1));
          // smoke and sparks out of the chimney
          for (let k = 0; k < 6; k++) { const u = (t * 0.3 + k / 6) % 1, r = 3 + u * 10, sx = x - E.w / 2 + E.chimney.x + 7 + Math.sin(u * 4 + k) * 5 + u * 16 * (K.W ? K.W.x : 0.3); ctx.fillStyle = `rgba(70,66,74,${0.55 * (1 - u)})`; ctx.fillRect(Math.round(sx - r - ox), Math.round(y - E.h - u * 50 - oy), Math.round(r * 2), Math.round(r * 1.2)); }
          if (Math.sin(t * 5) > 0.6) { ctx.fillStyle = "#ffb63c"; ctx.fillRect(Math.round(x - E.w / 2 + E.chimney.x + 7 - ox + Math.sin(t * 9) * 3), Math.round(y - E.h - 4 - ((t * 30) % 14) - oy), 1, 1); }
        } });
        out.push({ x: x - 34, y: y - 2, box: [x - 58, y - 44, x - 12, y], draw() {} }, { x: x + 34, y: y - 2, box: [x + 12, y - 44, x + 58, y], draw() {} }, { x, y: y - 32, box: [x - 12, y - 48, x + 12, y - 30], draw() {} });
      } else if (!Gear.built(p.id) && !p.hidden) {
        // a staked, roped plot with a little sign
        const x = p.x, y = p.y;
        out.push({ x, y: y - 40, kind: "plot", draw(ctx, ox, oy) {
          const pts = [[-46, -36], [46, -36], [46, 4], [-46, 4]];
          ctx.fillStyle = "rgba(10,12,16,0.12)"; ctx.fillRect(Math.round(x - 46 - ox), Math.round(y - 36 - oy), 92, 40);
          for (let k = 0; k < 4; k++) { const [ax, ay] = pts[k], [bx, by] = pts[(k + 1) % 4]; for (let s = 0; s <= 1; s += 0.02) { ctx.fillStyle = "#d8c890"; ctx.fillRect(Math.round(x + ax + (bx - ax) * s - ox), Math.round(y + ay + (by - ay) * s - oy - 4 + Math.sin(s * Math.PI) * 2), 1, 1); } }
          for (const [ax, ay] of pts) { ctx.fillStyle = "#3a2214"; ctx.fillRect(Math.round(x + ax - 1 - ox), Math.round(y + ay - 8 - oy), 3, 9); ctx.fillStyle = "#8a5a30"; ctx.fillRect(Math.round(x + ax - ox), Math.round(y + ay - 8 - oy), 1, 9); }
          ctx.fillStyle = "#3a2214"; ctx.fillRect(Math.round(x - 1 - ox), Math.round(y - 22 - oy), 2, 12); ctx.fillStyle = "#c89a5a"; ctx.fillRect(Math.round(x - 8 - ox), Math.round(y - 28 - oy), 16, 8); ctx.fillStyle = "#6a4020"; ctx.fillRect(Math.round(x - 6 - ox), Math.round(y - 26 - oy), 12, 1); ctx.fillRect(Math.round(x - 6 - ox), Math.round(y - 24 - oy), 9, 1);
        } });
      }
    }
    return out;
  };
  F.islandColliders = () => F.islandObjects().filter((o) => o.box).map((o) => o.box);
  F.door = () => { const p = Gear.PLOTS.find((q) => q.id === "forge"); return Gear.built("forge") ? { x: p.x, y: p.y } : null; };
  F.plotAt = (x, y) => Gear.PLOTS.find((p) => !p.hidden && !Gear.built(p.id) && Math.abs(x - p.x) < 50 && y > p.y - 44 && y < p.y + 14);
})();
