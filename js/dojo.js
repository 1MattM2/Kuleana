// Hale Koa: the warriors' training hut. Koa plank floor, woven lauhala mats and walls, kapa banners,
// kukui-nut torches, a rack holding every weapon in the game, and straw training dummies.
(function () {
  const T = K.TILE;
  const MW = 18, MH = 11, W = MW * T, H = MH * T;
  const D = (window.Dojo = { W, H });
  D.DOOR = { x0: 7.8 * T, x1: 10.2 * T };
  D.ENTRY = { x: 9 * T, y: H - 1.4 * T };
  D.FLOOR_TOP = 3.1 * T;

  const pk = (r, g, b) => `rgb(${r},${g},${b})`;
  function rect(c, col, x, y, w, h) { c.fillStyle = col; c.fillRect(x, y, w, h); }

  function bakeRoom() {
    const [cv, c] = K.canvas(W, H);
    // koa plank floor: planks run left-right, staggered joints, grain, a few knots
    const PL = ["#5a3220", "#6c3c24", "#7a4628", "#86502e"];
    for (let y = 0, row = 0; y < H; y += 8, row++) {
      let x = -((row * 37) % 60);
      while (x < W) {
        const len = 44 + ((K.hash2(x, row, 3) * 40) | 0), base = PL[(K.hash2(x, row, 5) * 4) | 0];
        rect(c, base, x, y, len, 8);
        rect(c, "#3a1e12", x, y + 7, len, 1);                  // seam
        rect(c, "#9a6038", x, y, len, 1);                      // lit top edge
        rect(c, "#3a1e12", x + len - 1, y, 1, 8);              // butt joint
        for (let k = 0; k < 3; k++) { const gx = x + 4 + ((K.hash2(x, k, row) * (len - 10)) | 0), gy = y + 2 + k * 2; rect(c, "#4a2816", gx, gy, 6 + k * 3, 1); }
        if (K.hash2(x, row, 9) > 0.8) { rect(c, "#3a1e12", x + len / 2, y + 3, 2, 2); rect(c, "#9a6038", x + len / 2, y + 3, 1, 1); }
        x += len;
      }
    }
    // woven lauhala training mat
    const mx0 = 3 * T, my0 = 4.2 * T, mw = 12 * T, mh = 5 * T;
    rect(c, "#2a1a0e", mx0 - 2, my0 - 2, mw + 4, mh + 4);
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const cell = ((x >> 2) + (y >> 2)) & 1, s = cell ? (x & 3) : (y & 3);
      const col = s === 0 ? "#a07a44" : cell ? "#d8b470" : "#c8a060";
      c.fillStyle = col; c.fillRect(mx0 + x, my0 + y, 1, 1);
    }
    for (let x = 0; x < mw; x += 3) { rect(c, "#6a4a24", mx0 + x, my0 + 2, 2, 1); rect(c, "#6a4a24", mx0 + x, my0 + mh - 3, 2, 1); }   // woven border
    rect(c, "#8a2a20", mx0 + 6, my0 + 5, mw - 12, 1); rect(c, "#8a2a20", mx0 + 6, my0 + mh - 6, mw - 12, 1);
    // back wall: woven lauhala panels between koa posts, a heavy beam on top
    const wallH = 3.1 * T;
    for (let y = 0; y < wallH; y++) for (let x = 0; x < W; x++) {
      const d = ((x + y) >> 2) & 1, e = ((x - y + 400) >> 2) & 1;
      let col = d ^ e ? "#b08a50" : "#9a7440";
      if (((x + y) & 3) === 0 || ((x - y + 400) & 3) === 0) col = "#6e5030";
      c.fillStyle = col; c.fillRect(x, y, 1, 1);
    }
    rect(c, "#1e100a", 0, 0, W, 14); rect(c, "#4a2a18", 0, 2, W, 9); rect(c, "#6a3c22", 0, 3, W, 2);
    for (let x = 0; x < W; x += 6) rect(c, "#2a160c", x, 8, 3, 2);     // lashings
    for (const px of [0.5, 3.6, 14.4, 17.5]) { rect(c, "#1e100a", px * T - 5, 0, 10, wallH); rect(c, "#6a3c22", px * T - 4, 0, 8, wallH); rect(c, "#8a5430", px * T - 4, 0, 2, wallH); }
    rect(c, "#1e100a", 0, wallH - 3, W, 3); rect(c, "#3a2214", 0, wallH, W, 4);   // skirting + shadow on the floor
    // kapa banners with triangle and line motifs
    for (const bx of [2 * T, 16 * T]) {
      const bw = 26, bh = 58, x0 = bx - bw / 2, y0 = 16;
      rect(c, "#1e100a", x0 - 1, y0 - 1, bw + 2, bh + 2);
      rect(c, "#e8d8b8", x0, y0, bw, bh);
      for (let k = 0; k < 6; k++) {
        const yy = y0 + 4 + k * 9;
        for (let t = 0; t < bw - 4; t += 5) { c.fillStyle = k % 2 ? "#8a2a1a" : "#2a1a14"; c.beginPath(); c.moveTo(x0 + 2 + t, yy + 5); c.lineTo(x0 + 4.5 + t, yy); c.lineTo(x0 + 7 + t, yy + 5); c.fill(); }
        rect(c, "#2a1a14", x0 + 2, yy + 7, bw - 4, 1);
      }
      for (let t = 0; t < bw; t += 3) rect(c, "#2a1a14", x0 + t, y0 + bh, 2, 3);
    }
    // side walls (bamboo) and front wall with the doorway
    for (const sx of [0, W - 0.6 * T]) for (let x = 0; x < 0.6 * T; x += 5) { rect(c, "#3a3a14", sx + x, wallH, 5, H - wallH); rect(c, "#8a9a40", sx + x + 1, wallH, 3, H - wallH); rect(c, "#b8c860", sx + x + 1, wallH, 1, H - wallH); for (let y = wallH + 10; y < H; y += 22) rect(c, "#3a3a14", sx + x, y, 5, 2); }
    const fy = H - 0.7 * T;
    for (let x = 0; x < W; x += 5) { if (x + 5 > D.DOOR.x0 && x < D.DOOR.x1) continue; rect(c, "#3a3a14", x, fy, 5, H - fy); rect(c, "#8a9a40", x + 1, fy, 3, H - fy); rect(c, "#b8c860", x + 1, fy, 1, H - fy); }
    rect(c, "#1e100a", 0, fy - 2, D.DOOR.x0, 3); rect(c, "#1e100a", D.DOOR.x1, fy - 2, W - D.DOOR.x1, 3);
    // daylight spilling in through the door
    const g = c.createLinearGradient(0, H, 0, H - 3 * T);
    g.addColorStop(0, "rgba(255,236,180,0.35)"); g.addColorStop(1, "rgba(255,236,180,0)");
    c.fillStyle = g; c.beginPath(); c.moveTo(D.DOOR.x0, H); c.lineTo(D.DOOR.x1, H); c.lineTo(D.DOOR.x1 + 30, H - 3 * T); c.lineTo(D.DOOR.x0 - 30, H - 3 * T); c.fill();
    return cv;
  }

  // weapon rack against the back wall, holding every weapon (drawn after Combat.init)
  function bakeRack() {
    const ws = Combat.weapons, n = ws.length, slot = 18, w = n * slot + 16, h = 54;
    const [cv, c] = K.canvas(w, h);
    rect(c, "#1e100a", 0, 6, w, 6); rect(c, "#7a4628", 1, 7, w - 2, 4); rect(c, "#9a6038", 1, 7, w - 2, 1);
    rect(c, "#1e100a", 0, h - 12, w, 7); rect(c, "#6a3c22", 1, h - 11, w - 2, 5); rect(c, "#9a6038", 1, h - 11, w - 2, 1);
    for (const x of [2, w - 8]) { rect(c, "#1e100a", x, 0, 6, h); rect(c, "#7a4628", x + 1, 1, 4, h - 2); }
    ws.forEach((wp, i) => {
      const cx = 11 + i * slot;
      c.save(); c.translate(cx, 26); c.rotate(-Math.PI / 2); c.imageSmoothingEnabled = false;
      c.drawImage(wp.spr.c, -15, -7); c.restore();
      rect(c, "#2a160c", cx - 2, 9, 4, 3);
    });
    D.rackSlots = ws.map((_, i) => 11 + i * slot);
    return cv;
  }

  function makeDummy() {
    const [cv, c] = K.canvas(30, 44);
    // post and foot
    rect(c, "#1e100a", 13, 22, 5, 21); rect(c, "#7a4628", 14, 22, 3, 21); rect(c, "#9a6038", 14, 22, 1, 21);
    rect(c, "#1e100a", 7, 40, 17, 4); rect(c, "#6a3c22", 8, 41, 15, 2);
    // crossbar arms with rope
    rect(c, "#1e100a", 2, 17, 27, 5); rect(c, "#8a5430", 3, 18, 25, 3); rect(c, "#b07040", 3, 18, 25, 1);
    for (const x of [4, 25]) { rect(c, "#d8c890", x, 17, 2, 5); }
    // straw body
    for (let y = 0; y < 20; y++) { const hw = Math.round(7.5 * Math.sin(((y + 2) / 23) * Math.PI)); for (let x = -hw; x <= hw; x++) { const edge = Math.abs(x) === hw; c.fillStyle = edge ? "#5a4018" : (x + y * 3) % 5 === 0 ? "#a88440" : x < -hw / 3 ? "#f0d888" : "#d8b860"; c.fillRect(15 + x, 14 + y, 1, 1); } }
    rect(c, "#8a2a1a", 8, 22, 15, 2); rect(c, "#8a2a1a", 8, 29, 15, 2);       // rope bands
    // burlap head with a painted target
    for (let y = 0; y < 13; y++) for (let x = 0; x < 13; x++) { const dx = x - 6, dy = y - 6, r = Math.hypot(dx, dy); if (r > 6.4) continue; c.fillStyle = r > 5.6 ? "#3a2814" : r < 1.6 ? "#c82a1a" : r < 3.2 ? "#efe2c0" : r < 4.6 ? "#c82a1a" : (x + y) % 3 ? "#c8b080" : "#b09868"; c.fillRect(9 + x, 2 + y, 1, 1); }
    const [wv, wc] = K.canvas(30, 44); wc.drawImage(cv, 0, 0); wc.globalCompositeOperation = "source-in"; wc.fillStyle = "#ffffff"; wc.fillRect(0, 0, 30, 44);
    return { img: cv, white: wv };
  }

  D.build = function () {
    D.ground = bakeRoom();
    D.rack = bakeRack();
    D.rackPos = { x: W / 2 - D.rack.width / 2, y: 3.1 * T - D.rack.height - 4 };
    D.dummyArt = makeDummy();
    D.dummies = [[5.4, 6.6], [9, 5.6], [12.6, 6.6]].map(([x, y]) => ({ x: x * T, y: y * T, hp: 120, max: 120, ang: 0, angV: 0, flash: 0, dead: false, respawn: 0, hitT: -9, pop: -9 }));
    D.torches = [[1.2 * T, 2.4 * T], [16.8 * T, 2.4 * T], [3.1 * T, 2.6 * T], [14.9 * T, 2.6 * T]];
  };

  // which rack slot the hero is standing in front of (or -1)
  D.rackIndexAt = function (x, y) {
    if (y > D.FLOOR_TOP + 26) return -1;
    let best = -1, bd = 10;
    D.rackSlots.forEach((sx, i) => { const d = Math.abs(D.rackPos.x + sx - x); if (d < bd) { bd = d; best = i; } });
    return best;
  };
  D.solidAt = function (x, y) {
    if (y > H - 0.7 * T) return !(x > D.DOOR.x0 + 4 && x < D.DOOR.x1 - 4) || y > H + 30;
    if (x < 0.65 * T || x > W - 0.65 * T || y < D.FLOOR_TOP) return true;
    for (const d of D.dummies) if (!d.dead && Math.abs(x - d.x) < 8 && y > d.y - 6 && y < d.y + 3) return true;
    return false;
  };

  function drawDummy(ctx, d, ox, oy, t) {
    const A = D.dummyArt;
    if (d.dead) { const q = (Combat.clock - d.pop); return; }
    const pop = Math.min(1, (Combat.clock - d.pop) / 0.25);
    ctx.save();
    ctx.translate(Math.round(d.x - ox), Math.round(d.y - oy));
    ctx.rotate(K.clamp(d.ang, -0.5, 0.5));
    ctx.scale(1, pop < 1 ? 0.6 + 0.4 * pop : 1);
    ctx.drawImage(d.flash > 0 ? A.white : A.img, -15, -43);
    ctx.restore();
    if (Combat.clock - d.hitT < 2.5) {
      const w = 22, x = Math.round(d.x - ox - w / 2), y = Math.round(d.y - oy - 52), f = Math.max(0, d.hp / d.max);
      ctx.fillStyle = "#140c10"; ctx.fillRect(x - 1, y - 1, w + 2, 4);
      ctx.fillStyle = "#3a1a1a"; ctx.fillRect(x, y, w, 2);
      ctx.fillStyle = f > 0.5 ? "#7ad860" : f > 0.25 ? "#f2c84a" : "#e8483a"; ctx.fillRect(x, y, Math.round(w * f), 2);
    }
  }
  function drawTorch(ctx, g, x, y, ox, oy, t, k) {
    const X = Math.round(x - ox), Y = Math.round(y - oy);
    ctx.fillStyle = "#1e100a"; ctx.fillRect(X - 2, Y, 4, 14); ctx.fillStyle = "#7a4628"; ctx.fillRect(X - 1, Y, 2, 14);
    ctx.fillStyle = "#3a2214"; ctx.fillRect(X - 3, Y - 2, 6, 3);
    const f = Math.floor(t * 8 + k * 3) % 3;
    const fl = [["..y..", ".yoy.", "yoooy", ".oro.", "..r.."], [".y...", ".yoy.", ".ooo.", "yoroy", "..r.."], ["...y.", ".yoy.", "yooo.", ".oro.", "..r.."]][f];
    K.pixmap(ctx, fl, { y: [255, 240, 150], o: [250, 150, 40], r: [210, 70, 30] }, X - 2, Y - 7, false, 5);
    if (g) { const gr = g.createRadialGradient(X, Y - 4, 0, X, Y - 4, 60); gr.addColorStop(0, "rgba(255,170,80,0.32)"); gr.addColorStop(1, "rgba(255,170,80,0)"); g.fillStyle = gr; g.fillRect(X - 60, Y - 64, 120, 120); }
  }

  // ground layer, then objects split around the hero's depth (back -> actx, front -> bctx)
  D.render = function (actx, bctx, g, ox, oy, LW, LH, t, py) {
    actx.fillStyle = "#120a08"; actx.fillRect(0, 0, LW, LH);
    actx.drawImage(D.ground, ox, oy, LW, LH, 0, 0, LW, LH);
    actx.drawImage(D.rack, Math.round(D.rackPos.x - ox), Math.round(D.rackPos.y - oy));
    // highlight the equipped weapon on the rack
    const sx = D.rackPos.x + D.rackSlots[Combat.cur] - ox, sy = D.rackPos.y - oy;
    actx.strokeStyle = Combat.weapons[Combat.cur].col; actx.lineWidth = 1; actx.strokeRect(Math.round(sx - 9) + 0.5, Math.round(sy + 12) + 0.5, 18, 28);
    D.torches.forEach(([x, y], k) => drawTorch(actx, g, x, y, ox, oy, t, k));
    Combat.drawGround(actx, ox, oy);
    for (const d of D.dummies) {
      const s = Props.shadow(10, 3); actx.globalAlpha = 0.35; actx.drawImage(s, Math.round(d.x - ox - 10), Math.round(d.y - oy - 3)); actx.globalAlpha = 1;
      drawDummy(d.y < py ? actx : bctx, d, ox, oy, t);
    }
    // warm interior light
    const gr = actx.createRadialGradient(W / 2 - ox, H * 0.55 - oy, 40, W / 2 - ox, H * 0.55 - oy, W * 0.7);
    gr.addColorStop(0, "rgba(255,190,120,0.0)"); gr.addColorStop(1, "rgba(20,8,4,0.45)");
    bctx.fillStyle = gr; bctx.fillRect(0, 0, LW, LH);
  };
})();
