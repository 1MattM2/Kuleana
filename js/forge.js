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
  F.STAND = { x: 15.2 * T, y: 5.2 * T };
  F.TROUGH = { x: 3.4 * T, y: 6.4 * T };
  F.SMITH = { x: 10.6 * T, y: 6.6 * T };
  const rect = (c, col, x, y, w, h) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const OB = () => PAL.R.obsidian, FI = () => PAL.R.fire, KO = () => PAL.R.koa;
  const css = (c) => PAL.css(c);

  // ---------------------------------------------------------------- the room
  function bakeRoom() {
    const [cv, c] = K.canvas(W, H), O = OB();
    // basalt flagstones, irregular, with ash in the joints and the furnace's glow warming the near ones
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const cx = Math.floor((x + (Math.floor(y / 22) % 2) * 13) / 26), cy = Math.floor(y / 22), lx = (x + (cy % 2) * 13) % 26, ly = y % 22;
      const v = K.hash2(cx, cy, 5), joint = lx === 0 || ly === 0, lit = lx === 1 || ly === 1;
      let col = joint ? [40, 34, 40] : lit ? O[4] : v > 0.66 ? O[3] : v > 0.33 ? O[2] : [52, 46, 60];
      const heat = Math.max(0, 1 - Math.hypot(x - F.FURNACE.x, (y - F.FURNACE.y) * 1.3) / 150);
      if (!joint && heat > 0) col = [col[0] + (255 - col[0]) * heat * 0.25, col[1] + (120 - col[1]) * heat * 0.18, col[2] * (1 - heat * 0.3)];
      if (joint && K.hash2(x, y, 3) > 0.7) col = [70, 62, 66];
      if (!joint && K.hash2(x >> 1, y >> 1, 9) > 0.9985) col = FI()[2];      // a fallen ember
      c.fillStyle = `rgb(${col[0] | 0},${col[1] | 0},${col[2] | 0})`; c.fillRect(x, y, 1, 1);
    }
    // back wall: obsidian blocks with mortar lit by the furnace
    const wallH = Math.round(F.FLOOR_TOP);
    for (let y = 0; y < wallH; y++) for (let x = 0; x < W; x++) {
      const row = Math.floor(y / 10), bx = Math.floor((x + (row % 2) * 9) / 18), lx = (x + (row % 2) * 9) % 18, ly = y % 10, v = K.hash2(bx, row, 8);
      let col = lx === 0 || ly === 0 ? [26, 20, 28] : ly === 1 ? O[3] : v > 0.5 ? O[2] : O[1];
      if ((lx === 0 || ly === 0) && Math.abs(x - F.FURNACE.x) < 90) col = [120 - Math.abs(x - F.FURNACE.x), 50, 30];
      c.fillStyle = PAL.css(col.length === 3 && col.every((q) => typeof q === "number") ? col : col); c.fillRect(x, y, 1, 1);
    }
    rect(c, css(O[0]), 0, wallH - 2, W, 3);
    // the wall's lower edge: a koa beam
    rect(c, css(KO()[1]), 0, wallH, W, 3); rect(c, css(KO()[3]), 0, wallH, W, 1);
    // side walls
    for (const sx of [0, W - 14]) for (let y = wallH; y < H; y++) for (let x = 0; x < 14; x++) { const v = K.hash2((sx + x) >> 3, y >> 3, 4); c.fillStyle = css(x === (sx ? 0 : 13) ? O[0] : v > 0.5 ? O[2] : O[1]); c.fillRect(sx + x, y, 1, 1); }
    // doorway: a step of basalt out into the daylight
    const fy = H - 0.7 * T;
    rect(c, css(O[0]), 0, fy - 2, F.DOOR.x0, 3); rect(c, css(O[0]), F.DOOR.x1, fy - 2, W - F.DOOR.x1, 3);
    for (let x = 0; x < W; x += 6) { if (x + 6 > F.DOOR.x0 && x < F.DOOR.x1) continue; rect(c, css(O[2]), x, fy, 6, H - fy); rect(c, css(O[3]), x + 1, fy, 4, 1); }
    const g = c.createLinearGradient(0, H, 0, H - 3 * T); g.addColorStop(0, "rgba(255,240,200,0.35)"); g.addColorStop(1, "rgba(255,240,200,0)");
    c.fillStyle = g; c.beginPath(); c.moveTo(F.DOOR.x0, H); c.lineTo(F.DOOR.x1, H); c.lineTo(F.DOOR.x1 + 30, H - 3 * T); c.lineTo(F.DOOR.x0 - 30, H - 3 * T); c.fill();
    // tools hung on the wall: tongs, hammers, a rasp
    const tools = [[60, 30, "tongs"], [76, 30, "hammer"], [92, 30, "hammer2"], [440, 30, "tongs"], [456, 30, "rasp"]];
    for (const [x, y, k] of tools) {
      rect(c, css(O[0]), x, y - 6, 2, 2);
      if (k === "tongs") { for (let i = 0; i < 26; i++) { rect(c, "#5a5a64", x - 2 + (i > 18 ? (i - 18) * 0.3 : 0), y - 4 + i, 1, 1); rect(c, "#8a8a96", x + 2 - (i > 18 ? (i - 18) * 0.3 : 0), y - 4 + i, 1, 1); } }
      else if (k === "rasp") { rect(c, "#4a4a54", x, y - 4, 3, 22); for (let i = 0; i < 20; i += 2) rect(c, "#9a9aa6", x, y - 4 + i, 3, 1); rect(c, css(KO()[2]), x, y + 18, 3, 8); }
      else { rect(c, css(KO()[2]), x, y - 4, 2, 22); rect(c, css(KO()[4]), x, y - 4, 1, 22); rect(c, "#3a3a44", x - 4, y + 16, 10, 6); rect(c, "#7a7a86", x - 4, y + 16, 10, 1); }
    }
    // the coal heap
    for (let k = 0; k < 140; k++) { const a = K.hash2(k, 1, 2) * Math.PI, r = K.hash2(k, 2, 3) * 18, x = 80 + Math.cos(a) * r * 1.4, y = 4.6 * T - Math.sin(a) * r * 0.8 + 10; rect(c, K.hash2(k, 3, 4) > 0.8 ? "#4a4450" : K.hash2(k, 4, 5) > 0.97 ? css(FI()[2]) : "#18141c", x, y, 2, 2); }
    return cv;
  }
  // the furnace: a squat dome of basalt with an arched mouth of magma, a chimney, and bellows
  function bakeFurnace() {
    const w = 96, h = 92, [cv, c] = K.canvas(w, h), O = OB();
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - w / 2) / 44, dy = (y + 0.5 - h + 4) / 56;
      if (y < 30) { if (Math.abs(x - w / 2) < 11 - y * 0.06) { const v = K.hash2(x >> 2, y >> 2, 3); c.fillStyle = css(Math.abs(x - w / 2) > 9 - y * 0.06 ? O[0] : v > 0.5 ? O[3] : O[2]); c.fillRect(x, y, 1, 1); } continue; }
      if (dx * dx + dy * dy > 1) continue;
      const row = Math.floor(y / 8), bx = Math.floor((x + (row % 2) * 6) / 12), mortar = y % 8 === 0 || (x + (row % 2) * 6) % 12 === 0;
      const lit = -dx * 0.6 - dy * 0.5;
      c.fillStyle = css(dx * dx + dy * dy > 0.92 ? O[0] : mortar ? O[1] : lit > 0.4 ? O[4] : lit > 0 ? O[3] : K.hash2(bx, row, 2) > 0.5 ? O[2] : O[1]); c.fillRect(x, y, 1, 1);
    }
    // the mouth (filled live each frame), its arch of fitted stones
    for (let a = 0; a <= Math.PI; a += 0.02) { const x = w / 2 + Math.cos(a) * 19, y = h - 22 - Math.sin(a) * 19; c.fillStyle = css(O[4]); c.fillRect(Math.round(x), Math.round(y), 2, 2); }
    c.clearRect(w / 2 - 17, h - 22, 34, 20);
    for (let a = 0; a <= Math.PI; a += 0.02) for (let r = 0; r < 17; r++) { const x = w / 2 + Math.cos(a) * r, y = h - 22 - Math.sin(a) * r; c.clearRect(Math.round(x), Math.round(y), 1, 1); }
    return { img: cv, w, h, mx: w / 2, my: h - 22 };
  }
  // the smith: the market folk's figure in a leather apron, a dark headwrap and soot
  function smithArt() {
    const C = window.CHARART, P = Object.assign({}, C.MERCHANT_PAL, { a: [70, 62, 70], A: [44, 38, 46], c: [110, 100, 110], v: [120, 76, 44], V: [80, 48, 28], s: [150, 96, 62], S: [112, 70, 46], k: [178, 120, 84] });
    const [c, x] = K.canvas(24, 32); K.pixmap(x, C.MERCHANT, P, 0, 0); return c;
  }
  F.build = function () {
    F.ground = bakeRoom(); F.furnace = bakeFurnace(); F.smith = smithArt();
    F.sparks = []; F.steam = [];
  };
  F.solidAt = function (x, y) {
    if (y > H - 0.7 * T) return !(x > F.DOOR.x0 + 4 && x < F.DOOR.x1 - 4) || y > H + 30;
    if (x < 0.5 * T || x > W - 0.5 * T || y < F.FLOOR_TOP + 4) return true;
    if (Math.abs(x - F.FURNACE.x) < 48 && y < F.FURNACE.y + 26) return true;                     // the furnace
    if (Math.abs(x - F.ANVIL.x) < 12 && Math.abs(y - F.ANVIL.y) < 6) return true;                 // the anvil
    if (Math.abs(x - F.TROUGH.x) < 22 && Math.abs(y - F.TROUGH.y) < 7) return true;              // the trough
    if (Math.abs(x - F.STAND.x) < 9 && Math.abs(y - F.STAND.y) < 5) return true;                  // the armour stand
    if (Math.abs(x - F.SMITH.x) < 7 && Math.abs(y - F.SMITH.y) < 5) return true;
    if (x < 3.6 * T && y < 4.8 * T + 10 && x > 1.2 * T) return true;                              // the coal heap
    return false;
  };
  F.near = function (x, y) {
    if (Math.hypot(x - F.SMITH.x, y - F.SMITH.y) < 30 || Math.hypot(x - F.ANVIL.x, y - F.ANVIL.y) < 26) return "smith";
    if (Math.hypot(x - F.STAND.x, y - F.STAND.y) < 26) return "stand";
    return null;
  };

  // ---------------------------------------------------------------- drawing
  F.render = function (actx, bctx, g, ox, oy, LW, LH, t, py) {
    const O = OB(), Fi = FI();
    actx.fillStyle = "#0c0808"; actx.fillRect(0, 0, LW, LH);
    actx.drawImage(F.ground, ox, oy, LW, LH, 0, 0, LW, LH);
    // the furnace and its living mouth
    const fu = F.furnace, fx = Math.round(F.FURNACE.x - fu.w / 2 - ox), fy = Math.round(F.FURNACE.y + 26 - fu.h - oy);
    for (let y = 0; y < 20; y++) for (let x = -17; x <= 17; x++) {
      if (y > 0 && Math.hypot(x, 20 - y) > 18) continue;
      const n = K.noise(x * 0.2 + t * 1.5, y * 0.25 - t * 2), v = n + (y / 20) * 0.5;
      actx.fillStyle = css(v > 1.05 ? Fi[4] : v > 0.85 ? Fi[3] : v > 0.6 ? Fi[2] : Fi[1]); actx.fillRect(fx + fu.mx + x, fy + fu.my - 20 + y + 1, 1, 1);
    }
    actx.drawImage(fu.img, fx, fy);
    // smoke from the chimney, and the bellows breathing
    for (let k = 0; k < 5; k++) { const u = (t * 0.35 + k / 5) % 1, r = 3 + u * 9; actx.fillStyle = `rgba(60,56,64,${0.5 * (1 - u)})`; actx.fillRect(Math.round(fx + fu.w / 2 - r + Math.sin(u * 5 + k) * 4), Math.round(fy - u * 36), Math.round(r * 2), Math.round(r)); }
    const bp = 0.5 + 0.5 * Math.sin(t * 2.4), bx = fx + fu.w + 2, by = fy + fu.h - 22;
    actx.fillStyle = css(KO()[1]); actx.fillRect(bx, by + 6 - bp * 4, 22, 3 + bp * 8); actx.fillStyle = css(KO()[3]); actx.fillRect(bx, by + 6 - bp * 4, 22, 1);
    actx.fillStyle = "#6a4a30"; actx.fillRect(bx + 2, by + 7 - bp * 4, 18, 1 + bp * 7); actx.fillStyle = css(KO()[0]); actx.fillRect(bx - 8, by + 9, 10, 2); actx.fillRect(bx + 22, by + 6, 8, 2);
    if (g) { Level.glowAt(g, F.FURNACE.x - ox, F.FURNACE.y + 10 - oy, 150, "255,120,40", 0.5 + 0.1 * Math.sin(t * 7)); Level.glowAt(g, F.ANVIL.x - ox, F.ANVIL.y - 8 - oy, 40, "255,170,80", 0.25); }
    // the weapons you have forged, hung on the wall
    let wx = 3.4 * T;
    for (const k of Gear.ORDER) { const E = Gear.ELEMENTS[k]; if (!Combat.unlocked.has(E.weapon)) continue; const w = Combat.weapons.find((q) => q.id === E.weapon); if (!w) continue; actx.fillStyle = css(O[0]); actx.fillRect(Math.round(wx - ox), Math.round(14 - oy), 30, 30); actx.drawImage(w.icon, Math.round(wx + 1 - ox), Math.round(15 - oy)); wx += 34; }
    // the trough, steaming
    const tx = Math.round(F.TROUGH.x - ox), ty = Math.round(F.TROUGH.y - oy);
    actx.fillStyle = css(KO()[0]); actx.fillRect(tx - 22, ty - 10, 44, 14); actx.fillStyle = css(KO()[2]); actx.fillRect(tx - 21, ty - 9, 42, 1);
    actx.fillStyle = "#1a4a6a"; actx.fillRect(tx - 19, ty - 7, 38, 8); actx.fillStyle = "#3a7aa0"; actx.fillRect(tx - 19 + ((t * 8) % 30 | 0), ty - 6, 6, 1);
    const draws = [];
    // the anvil on its stump
    draws.push({ y: F.ANVIL.y, f: (c) => { const ax = Math.round(F.ANVIL.x - ox), ay = Math.round(F.ANVIL.y - oy); c.fillStyle = css(KO()[1]); c.fillRect(ax - 7, ay - 8, 14, 9); c.fillStyle = css(KO()[3]); c.fillRect(ax - 7, ay - 8, 14, 1); c.fillStyle = "#1c1c24"; c.fillRect(ax - 11, ay - 15, 22, 7); c.fillRect(ax - 5, ay - 9, 10, 2); c.fillStyle = "#5a5a68"; c.fillRect(ax - 11, ay - 15, 22, 2); c.fillStyle = "#8a8a98"; c.fillRect(ax - 10, ay - 15, 16, 1); c.fillStyle = "#1c1c24"; c.fillRect(ax + 11, ay - 14, 5, 3); } });
    // Kamaka at the anvil, his hammer rising and falling; sparks on each blow
    const beat = (t * 1.4) % 1, strike = beat < 0.12;
    if (strike && !F.struck) { F.struck = true; for (let k = 0; k < 14; k++) F.sparks.push({ x: F.ANVIL.x - 2, y: F.ANVIL.y - 15, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 90, life: 0.5 + Math.random() * 0.3 }); window.Ambience && Ambience.sfx && Math.random() < 0.6 && Ambience.sfx("clack"); }
    if (!strike) F.struck = false;
    draws.push({ y: F.SMITH.y, f: (c) => {
      const sx = Math.round(F.SMITH.x - ox), sy = Math.round(F.SMITH.y - oy);
      c.drawImage(F.smith, sx - 12, sy - 31);
      const a = strike ? 0.3 : -1.6 + Math.sin(beat * Math.PI) * 0.4, hx = sx - 6, hy = sy - 16;
      for (let s = 0; s < 12; s++) { c.fillStyle = css(KO()[s % 2 ? 2 : 3]); c.fillRect(Math.round(hx + Math.cos(Math.PI + a) * s * 0.9), Math.round(hy + Math.sin(Math.PI + a) * s * 0.9), 1, 1); }
      c.fillStyle = "#2a2a34"; c.fillRect(Math.round(hx + Math.cos(Math.PI + a) * 11) - 2, Math.round(hy + Math.sin(Math.PI + a) * 11) - 2, 5, 4);
    } });
    // the armour stand, wearing what you wear
    draws.push({ y: F.STAND.y, f: (c) => {
      const sx = Math.round(F.STAND.x - ox), sy = Math.round(F.STAND.y - oy), a = Gear.worn();
      c.fillStyle = css(KO()[1]); c.fillRect(sx - 1, sy - 28, 3, 28); c.fillRect(sx - 7, sy - 1, 15, 2);
      const v = a ? a.pal.v : [60, 50, 50], V = a ? a.pal.V : [40, 34, 34], l = a ? a.pal.l : [80, 70, 70];
      c.fillStyle = PAL.css(V); c.fillRect(sx - 7, sy - 26, 15, 13); c.fillStyle = PAL.css(v); c.fillRect(sx - 6, sy - 25, 13, 11); c.fillStyle = PAL.css(l); c.fillRect(sx - 6, sy - 25, 4, 11);
      c.fillStyle = css(KO()[3]); c.fillRect(sx - 3, sy - 31, 7, 5);
    } });
    for (const d of draws.sort((p, q) => p.y - q.y)) d.f(d.y < py ? actx : bctx);
    // sparks and steam
    const dt = 1 / 60;
    for (const s of F.sparks) { s.vy += 260 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt; bctx.fillStyle = s.life > 0.3 ? "#fff4b8" : "#ff9a3a"; bctx.fillRect(Math.round(s.x - ox), Math.round(s.y - oy), 1, 1); if (g) Level.glowAt(g, s.x - ox, s.y - oy, 5, "255,180,80", 0.6); }
    F.sparks = F.sparks.filter((s) => s.life > 0 && s.y < F.ANVIL.y + 6);
    for (let k = 0; k < 4; k++) { const u = (t * 0.4 + k / 4) % 1; bctx.fillStyle = `rgba(230,236,240,${0.45 * (1 - u)})`; bctx.fillRect(Math.round(tx - 12 + k * 7 + Math.sin(u * 6 + k) * 3), Math.round(ty - 10 - u * 26), 4 + u * 6, 3 + u * 3); }
    // the room's warm dark
    const gr = actx.createRadialGradient(F.FURNACE.x - ox, F.FURNACE.y + 40 - oy, 40, F.FURNACE.x - ox, F.FURNACE.y + 40 - oy, W * 0.75);
    gr.addColorStop(0, "rgba(255,120,40,0.06)"); gr.addColorStop(1, "rgba(10,4,4,0.5)");
    bctx.fillStyle = gr; bctx.fillRect(0, 0, LW, LH);
  };

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
