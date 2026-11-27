// Art for the Sun Gate sanctum and the Volcanic Highlands: sun gates, carved ruin stone,
// crystals, braziers, hanging vines, sun seals, the gate keeper. Everything is rasterised per
// pixel from the master palette (js/palette.js) so it matches the island, the dojo and the cave.
(function () {
  const R = (window.Ruins = {});
  const TAU = Math.PI * 2;
  let A = null;
  R.init = (assets) => { A = assets; };
  const pk = (c) => PAL.pk(c);
  const ramp = (n) => PAL.packed[n];
  const lum = (v) => (v & 255) * 0.3 + ((v >>> 8) & 255) * 0.59 + ((v >>> 16) & 255) * 0.11;

  // ---------------------------------------------------------------- raster helpers
  // fn(x, y) returns a packed colour (or 0 for transparent). Optional sel-out outline.
  function raster(w, h, fn, outline) {
    const [c, ctx] = K.canvas(w, h), img = ctx.createImageData(w, h), d = new Uint32Array(img.data.buffer);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = fn(x, y); if (v) d[y * w + x] = v; }
    if (outline) selout(d, w, h);
    ctx.putImageData(img, 0, 0);
    return c;
  }
  R.raster = raster;
  // transparent pixels touching the shape take a dark tint of the colour they wrap
  function selout(d, w, h) {
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[y * w + x]) continue;
      let best = 0, bl = 1e9;
      for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]]) {
        const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const v = d[yy * w + xx]; if (v && (v >>> 24) === 255) { const l = lum(v); if (l < bl) { bl = l; best = v; } }
      }
      if (best) add.push(y * w + x, best);
    }
    for (let i = 0; i < add.length; i += 2) { const v = add[i + 1], f = 0.38; add[i + 1] = (255 << 24) | ((((v >>> 16) & 255) * f + 12) << 16) | ((((v >>> 8) & 255) * f + 6) << 8) | (((v & 255) * f + 10) | 0); d[add[i]] = add[i + 1]; }
  }
  R.selout = selout;
  const shade = (v, f) => (255 << 24) | (Math.min(255, ((v >>> 16) & 255) * f) << 16) | (Math.min(255, ((v >>> 8) & 255) * f) << 8) | Math.min(255, (v & 255) * f);

  // ---------------------------------------------------------------- carved ruin stone
  // Ashlar blocks in temple stone: per-block tone, bevelled top-left edges, dark mortar, glyph
  // carving borrowed from the island path texture, and moss creeping along the joints.
  function ashlar(x, y, opts) {
    const S = ramp("stone"), bw = opts.bw || 16, bh = opts.bh || 10;
    const row = Math.floor(y / bh), off = row % 2 ? bw >> 1 : 0, bx = Math.floor((x + off) / bw);
    const lx = (x + off) - bx * bw, ly = y - row * bh;
    if (lx === 0 || ly === 0) return K.hash2(bx, row, 9) > 0.6 && opts.moss ? PAL.i("fern", 3) : S[1];         // mortar
    const tone = K.hash2(bx, row, 3);
    let i = 3 + (tone > 0.75 ? 1 : tone < 0.2 ? -1 : 0);
    if (lx === 1 || ly === 1) i += 1;                                                // lit bevel
    if (lx === bw - 1 || ly === bh - 1) i -= 1;                                      // shadowed bevel
    // carved glyphs on some blocks (the island path's carving, recoloured to stone)
    if (opts.glyph && K.hash2(bx, row, 5) > 0.55) {
      const g = A.px.tex_glyph, v = g.data[((lx * 3 + bx * 11) & 63) + (((ly * 3 + row * 7) & 63) << 6)];
      const l = lum(v); if (l < 150) i -= 2; else if (l > 230) i += 1;
    }
    let c = S[Math.max(1, Math.min(5, i))];
    if (opts.moss && K.noise(x * 0.18 + 3, y * 0.18) > 0.7 && ly > bh * 0.5) c = PAL.i("fern", K.hash2(x, y, 2) > 0.5 ? 4 : 3);
    return c;
  }

  // ---------------------------------------------------------------- the sun disc (animated)
  // Painted like the sea-cave pool: strokes traced along a spiral flow field, colour-cycled so
  // light flows inward along them toward a white-hot core. Dormant, it is cold dull stone-gold.
  function discField(Rr) {
    const n = Rr * 2 + 1, lv = new Int8Array(n * n).fill(-1), ph = new Uint8Array(n * n), rnd = K.rng(Rr * 77);
    const inside = (x, y) => (x - Rr) ** 2 + (y - Rr) ** 2 <= Rr * Rr;
    const vel = (x, y) => { const dx = x - Rr, dy = y - Rr, r = Math.hypot(dx, dy) + 0.01; return [-dy / r * 1 - dx / r * 0.45, dx / r * 1 - dy / r * 0.45]; };
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (inside(x, y)) { const r = Math.hypot(x - Rr, y - Rr) / Rr; lv[y * n + x] = r < 0.22 ? 6 : r < 0.45 ? 5 : r < 0.75 ? 4 : 3; ph[y * n + x] = (rnd() * 255) | 0; }
    for (let k = 0; k < Rr * Rr * 1.1; k++) {
      let x = rnd() * n, y = rnd() * n; if (!inside(x, y)) continue;
      const r0 = Math.hypot(x - Rr, y - Rr) / Rr, a0 = Math.atan2(y - Rr, x - Rr);
      const ray = Math.cos(a0 * 12) > 0.55;
      let base = r0 < 0.22 ? 6 : r0 < 0.45 ? 5 : r0 < 0.7 ? 4 : 3; base += ray ? 1 : 0; base += rnd() < 0.3 ? -1 : 0;
      const off = (rnd() * 255) | 0, L = 5 + rnd() * 8;
      for (let s = 0; s < L; s += 0.7) {
        const xi = x | 0, yi = y | 0; if (!inside(xi, yi)) break;
        for (const [ox, oy] of [[0, 0], [1, 0]]) { const xx = xi + ox, yy = yi + oy; if (inside(xx, yy)) { lv[yy * n + xx] = Math.min(6, Math.max(1, base)); ph[yy * n + xx] = (off + s * 14) & 255; } }
        const [vx, vy] = vel(x, y), l = Math.hypot(vx, vy) || 1; x += vx / l * 0.7; y += vy / l * 0.7;
      }
    }
    return { n, lv, ph, Rr };
  }
  function makeDisc(Rr) {
    const f = discField(Rr), [c, ctx] = K.canvas(f.n, f.n), img = ctx.createImageData(f.n, f.n), d = new Uint32Array(img.data.buffer);
    const SUN = ramp("sun"), ST = ramp("stone");
    return {
      canvas: c, size: f.n,
      draw(t, open) {
        const flow = (t * 40) & 255, br = 0.5 + 0.5 * Math.sin(t * 1.3);
        for (let i = 0; i < f.lv.length; i++) {
          let l = f.lv[i]; if (l < 0) continue;
          if (open) { const p = (f.ph[i] - flow) & 255; if (p < 26) l += 2; else if (p < 70) l += 1; if (br > 0.75 && l >= 4) l += 1; d[i] = SUN[Math.min(6, l)]; }
          else { const p = (f.ph[i] - ((t * 6) & 255)) & 255; d[i] = l >= 5 ? SUN[p < 40 ? 2 : 1] : l >= 4 ? SUN[1] : ST[p < 30 ? 3 : 2]; }
        }
        ctx.putImageData(img, 0, 0);
        return c;
      },
    };
  }

  // ---------------------------------------------------------------- sun gates
  // The great gate: two carved pillars, a stepped lintel, a round stone frame of wedge blocks
  // with a keystone, vines draping over it. `big` is the sanctum's gate; small ones stand in ruins.
  R.gate = function (big) {
    const W = big ? 132 : 92, H = big ? 120 : 92, Rr = big ? 30 : 20, cx = W / 2, cy = big ? 52 : 38;
    const pilW = big ? 20 : 14, ringO = Rr + (big ? 11 : 8);
    const S = ramp("stone"), G = ramp("glyph");
    const art = raster(W, H, (x, y) => {
      const dx = x + 0.5 - cx, dy = y + 0.5 - cy, r = Math.hypot(dx, dy);
      // the round frame of wedge-shaped voussoirs
      if (r >= Rr - 0.5 && r < ringO) {
        const a = Math.atan2(dy, dx), seg = Math.floor(((a + TAU) % TAU) / (TAU / 20)), sa = ((a + TAU) % TAU) / (TAU / 20) - seg;
        if (sa < 0.07) return S[1];
        let i = 3 + (K.hash2(seg, 1, 7) > 0.6 ? 1 : 0) + (dx * -0.6 + dy * -0.8 > 0 ? 1 : -1);
        if (r > ringO - 1.5) i -= 1; if (r < Rr + 1) i -= 1;
        if (seg === 15 || seg === 14) i += 1;                                         // keystone at the top
        if (Math.abs(r - (Rr + ringO) / 2) < 0.8 && K.hash2(seg, 3, 1) > 0.4) return G[1];   // carved groove
        if (K.noise(x * 0.25, y * 0.25) > 0.74) return PAL.i("fern", 4);
        return S[Math.max(1, Math.min(5, i))];
      }
      if (r < Rr - 0.5) return 0;                                                     // the disc goes here
      // lintel / crest
      const topY = big ? 6 : 4, lintH = big ? 18 : 13;
      if (y >= topY && y < topY + lintH && x >= 2 && x < W - 2) {
        const stepIn = y < topY + (big ? 6 : 4) ? (big ? 16 : 10) : 0;
        if (x < 2 + stepIn || x >= W - 2 - stepIn) return 0;
        if (y === topY || (y === topY + (big ? 6 : 4) && (x < 2 + (big ? 16 : 10) + 1 || x >= W - 3 - (big ? 16 : 10)))) return S[5];
        if (y === topY + lintH - 1) return S[1];
        if (y > topY + lintH - 7 && y < topY + lintH - 2 && ((x >> 2) % 3 === 0)) return S[1];      // dentil band
        return ashlar(x, y - topY, { bw: 12, bh: 6, glyph: true, moss: true });
      }
      // pillars
      const inPil = (x >= 4 && x < 4 + pilW) || (x >= W - 4 - pilW && x < W - 4);
      if (inPil && y >= topY + lintH && y < H - 8) {
        const lx = x < W / 2 ? x - 4 : x - (W - 4 - pilW);
        if (lx === 0) return S[4]; if (lx === pilW - 1) return S[1]; if (lx === 1) return S[5];
        // carved glyph panel down the middle of each pillar
        if (lx > 3 && lx < pilW - 4 && y > topY + lintH + 6 && y < H - 16) {
          const v = A.px.tex_glyph.data[((lx * 4) & 63) + (((y * 2) & 63) << 6)];
          const l = lum(v); return l < 160 ? S[1] : l > 230 ? S[5] : l > 200 ? S[4] : S[3];
        }
        return ashlar(lx, y, { bw: pilW, bh: 9, moss: true });
      }
      // plinths and the step
      if (y >= H - 8) {
        if (x < 1 || x >= W - 1) return 0;
        if (y === H - 8) return S[5]; if (y === H - 1) return S[1];
        return ashlar(x, y, { bw: 18, bh: 4 });
      }
      // the back wall the disc sits in (deep shadow)
      if (x >= 4 + pilW && x < W - 4 - pilW && y >= topY + lintH && y < H - 8) return y > cy + ringO - 4 ? S[1] : 0;
      return 0;
    }, true);
    // vines draped over the top and down the pillars
    const vctx = art.getContext("2d"), rnd = K.rng(big ? 31 : 17);
    for (let k = 0; k < (big ? 7 : 4); k++) {
      let x = 6 + rnd() * (W - 12), y = 5; const len = 14 + rnd() * (big ? 40 : 26);
      for (let s = 0; s < len; s++) {
        x += (rnd() - 0.5) * 0.8; y += 1;
        vctx.fillStyle = PAL.css(PAL.R.fern[2]); vctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        if (s % 4 === 1) { vctx.fillStyle = PAL.css(PAL.R.palm[5]); vctx.fillRect(Math.round(x) + (s % 8 < 4 ? 1 : -1), Math.round(y), 1, 1); vctx.fillStyle = PAL.css(PAL.R.palm[4]); vctx.fillRect(Math.round(x) + (s % 8 < 4 ? 2 : -2), Math.round(y) + 1, 1, 1); }
      }
    }
    const disc = makeDisc(Rr);
    return { art, W, H, cx, cy, Rr, disc };
  };

  // ---------------------------------------------------------------- crystals (sea-cave light)
  // Hexagonal prisms with a lit left face, dark right face, a bright ridge and a glowing core,
  // coloured from the bioluminescent ramps. 6 shimmer frames: a band of light climbs the cluster.
  R.crystals = function (seed, big) {
    const rnd = K.rng(seed), fams = ["bio_teal", "bio_violet", "bio_blue"], n = big ? 5 : 3;
    const W = big ? 30 : 20, H = big ? 30 : 20, bx = W / 2, by = H - 3;
    const cr = [];
    for (let k = 0; k < n; k++) cr.push({ a: -Math.PI / 2 + (k - (n - 1) / 2) * 0.42 + (rnd() - 0.5) * 0.2, L: (big ? 22 : 13) * (k === (n >> 1) ? 1 : 0.55 + rnd() * 0.3), w: big ? 3.2 + rnd() : 2.2 + rnd() * 0.6, ox: (k - (n - 1) / 2) * (big ? 3 : 2), fam: fams[(k + seed) % 3] });
    cr.sort((p, q) => q.L - p.L);
    const frames = [];
    for (let f = 0; f < 6; f++) {
      frames.push(raster(W, H, (x, y) => {
        for (const c of cr) {
          const px = x + 0.5 - (bx + c.ox), py = y + 0.5 - by, ca = Math.cos(c.a), sa = Math.sin(c.a);
          const u = px * ca + py * sa, v = -px * sa + py * ca;           // u along the crystal, v across
          const tip = c.L - c.w * 1.4, wv = u < tip ? c.w : c.w * Math.max(0, (c.L - u) / (c.L - tip));
          if (u < -1 || u > c.L || Math.abs(v) > wv) continue;
          const Rm = ramp(c.fam), t = u / c.L, band = Math.abs(t - ((f / 6 + 0.15) % 1)) < 0.12;
          let i = v < -wv * 0.25 ? 5 : v > wv * 0.35 ? 2 : 4;                 // facets
          if (Math.abs(v + wv * 0.25) < 0.6) i = 6;                             // ridge
          if (t > 0.75) i += 1; if (u < 2) i -= 1;
          if (band) i += 1;
          return Rm[Math.max(1, Math.min(7, i))];
        }
        // a little obsidian base
        const dx = (x + 0.5 - bx) / (W * 0.34), dy = (y + 0.5 - by) / 3;
        if (dx * dx + dy * dy < 1) return PAL.i("obsidian", dy < -0.2 ? 4 : 2);
        return 0;
      }, true));
    }
    return { frames, W, H, ax: bx, ay: by + 1, fam: cr[0].fam };
  };

  // ---------------------------------------------------------------- braziers (stone bowl + live flame)
  R.brazier = function () {
    const W = 18, H = 16, S = ramp("stone");
    const bowl = raster(W, H, (x, y) => {
      const dx = x + 0.5 - W / 2;
      if (y < 6 && Math.abs(dx) < 8 - y * 0.2) return y === 0 ? S[5] : y === 1 ? PAL.i("fire", 1) : y < 3 ? S[4] : dx < -2 ? S[4] : dx > 3 ? S[2] : S[3];
      if (y >= 6 && y < 12 && Math.abs(dx) < 3) return dx < -1 ? S[4] : dx > 1 ? S[2] : S[3];
      if (y >= 12 && Math.abs(dx) < 6) return y === 12 ? S[4] : S[2];
      return 0;
    }, true);
    const flames = [];
    for (let f = 0; f < 6; f++) flames.push(raster(14, 16, (x, y) => {
      const dx = x + 0.5 - 7, u = (15 - y) / 15, t = f / 6 * TAU;
      const sway = Math.sin(u * 3 + t) * 1.6 * u, w = (5.5 - u * 5) * (0.85 + 0.15 * Math.sin(t * 2 + u * 5));
      const e = Math.abs(dx - sway) / Math.max(0.5, w);
      if (e > 1 || u > 0.95 - 0.1 * Math.sin(t + 1)) return 0;
      const heat = (1 - e) * (1 - u * 0.8);
      return PAL.i("fire", heat > 0.7 ? 4 : heat > 0.45 ? 3 : heat > 0.2 ? 2 : 1);
    }));
    return { bowl, flames, W, H };
  };

  // ---------------------------------------------------------------- broken ruin column
  R.column = function (seed) {
    const r = K.rng(seed), h = 34 + ((r() * 16) | 0), W = 16, S = ramp("stone");
    const bite = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0].map(() => (r() * 5) | 0);
    return raster(W, h + 6, (x, y) => {
      if (x < 2 || x > 13) return 0;
      if (y < 4 + bite[x]) return 0;
      if (y === 4 + bite[x]) return S[5];
      if (y > h + 1) return x < 1 || x > 14 ? 0 : y === h + 2 ? S[4] : S[2];                       // base
      let i = x < 5 ? 4 : x > 11 ? 2 : 3;
      if ((x === 5 || x === 9) && y > 8) i -= 1;                                                      // fluting
      if (y % 12 === 0) i = 1;                                                                        // drum joints
      if (K.noise(x * 0.3 + seed, y * 0.3) > 0.72) return PAL.i("fern", 3 + ((x + y) & 1));
      return S[i];
    }, true);
  };

  // ---------------------------------------------------------------- the shrine of Pele
  R.shrine = function () {
    const W = 34, H = 22, S = ramp("stone");
    return raster(W, H, (x, y) => {
      if (y < 4) return x > 3 && x < W - 4 ? (y === 0 ? S[5] : S[4]) : 0;
      if (x < 2 || x > W - 3) return 0;
      if (y >= 7 && y <= 13 && x >= 12 && x <= W - 13) return y === 7 ? PAL.i("fire", 1) : PAL.i("fire", (x + y) % 3 === 0 ? 3 : 2);   // ember glyph
      return ashlar(x, y, { bw: 10, bh: 6, glyph: true });
    }, true);
  };

  // ---------------------------------------------------------------- the gate keeper, Kahu Lā
  // An elder kahu in a feathered ʻahuʻula cloak (hibiscus red, sun-gold crescents), white hair and
  // beard, ti-leaf lei, holding a staff crowned with a small sun. Same chibi build as the hero.
  const KEEPER = [
    "........................",
    "..........oooo..........",
    ".........owwwwo.........",
    "........owwWWwwo........",
    ".......oowwwwwwoo.......",
    "......owwwWWWWwwwo......",
    ".....owwWwwwwwwwWwwo....",
    ".....owwwkkkkkkkkwwo....",
    ".....owkkkkkkkkkkkwo....",
    ".....owkeekkkkeekkwo....",
    ".....oSkkkkkkkkkkkSo....",
    ".....oSkwkkkkkkkwkSo....",
    "......okwwwkkkwwwko.....",
    "......owwwwwwwwwwwo.....",
    ".......owwwWwwwwwo......",
    "....oooyyowwwwwoyyooo...",
    "...oyyYyyLowwwoLyyYyyo..",
    "..orryYyyLLLlLLLyyYyrro.",
    "..orrrrrrrLLlLLrrrrrrro.",
    "..orrRrrrrrrrrrrrrRrrro.",
    "..orRRrrrrrrrrrrrrRRrro.",
    "..orRrrrrrrrrrrrrrrRrro.",
    "..orrrrrryrrrrryrrrrrro.",
    "..orrrrryyyrrryyyrrrrro.",
    "..orrrryyYyyryyYyyrrrro.",
    "...orryyYYyyyyyYYyyrro..",
    "...oyyyyyyyyyyyyyyyyyo..",
    "....otttttttttttttto....",
    "....otTtttTtttTtttTo....",
    ".....oSso......oSso.....",
    ".....offo......offo.....",
    ".....oooo......oooo.....",
  ];
  const KPAL = {
    o: PAL.INK, w: [236, 232, 222], W: [184, 178, 170], k: PAL.R.skin[3], S: PAL.R.skin[1], e: [36, 24, 30],
    r: PAL.R.hibiscus[2], R: PAL.R.hibiscus[1], y: PAL.R.sun[4], Y: PAL.R.sun[3],
    l: PAL.R.palm[5], L: PAL.R.palm[3], t: PAL.R.kapa[3], T: [196, 176, 140], f: PAL.R.koa[2],
  };
  R.keeper = function () {
    const frames = [];
    for (let f = 0; f < 4; f++) {                       // 0,1 breathe  2 blink  3 cloak sway
      const [c, ctx] = K.canvas(24, 33);
      const rows = KEEPER.map((row, y) => {
        if (f === 2 && y === 9) return row.replace(/ee/g, "SS");
        return row;
      });
      rows.forEach((row, y) => {
        let shift = 0;
        if (f === 1 && y < 15) shift = 0;
        for (let x = 0; x < row.length; x++) {
          const ch = row[x]; if (ch === ".") continue;
          const col = KPAL[ch]; if (!col) continue;
          let yy = y + (f === 1 && y < 27 ? 1 : 0), xx = x + (f === 3 && y > 20 && y < 27 ? (y > 23 ? 1 : 0) : 0);
          ctx.fillStyle = PAL.css(col); ctx.fillRect(xx, yy, 1, 1);
        }
      });
      frames.push(c);
    }
    return frames;
  };

  // ---------------------------------------------------------------- sun seals (arena barriers)
  // A lattice of sunlight strung between the exit's edges: woven diagonal strands that flow.
  R.drawSeal = function (ctx, g, x0, y0, x1, y1, t, life) {
    const SUN = ramp("sun"), w = Math.round(x1 - x0), h = Math.round(y1 - y0);
    if (w <= 0 || h <= 0) return;
    const img = ctx.getImageData(Math.round(x0), Math.round(y0), w, h), d = new Uint32Array(img.data.buffer);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const a = ((x + y + t * 22) & 7) === 0, b = ((x - y - t * 22 + 999) & 7) === 0;
      if ((a || b) && K.hash2(x, y, (t * 4) | 0) < life) d[y * w + x] = SUN[a && b ? 6 : a ? 5 : 4];
      else if (((x + y) & 1) && K.hash2(x >> 1, y >> 1, 3) < 0.06 * life) d[y * w + x] = SUN[3];
    }
    ctx.putImageData(img, Math.round(x0), Math.round(y0));
    if (g) { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(255,200,90,${0.35 * life})`); gr.addColorStop(1, `rgba(255,200,90,${0.15 * life})`); g.fillStyle = gr; g.fillRect(x0 - 6, y0 - 6, w + 12, h + 12); }
  };

  // ---------------------------------------------------------------- ʻōhelo berry cluster (heals)
  R.berry = raster(9, 9, (x, y) => {
    const B = ramp("hibiscus");
    for (const [cx, cy] of [[3, 5], [6, 5], [4.5, 2.8]]) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d < 2) return d < 0.8 && x < cx ? PAL.pk([255, 210, 190]) : x < cx ? B[3] : B[2]; }
    if (y === 0 && x === 5) return PAL.i("palm", 4);
    return 0;
  }, true);

  // ---------------------------------------------------------------- hanging vines (drawn live)
  // A strand hanging from a cliff lip or ruin top; it sways with the shared wind, leaves in pairs.
  R.drawVine = function (ctx, x, y, len, t, ph) {
    const F = PAL.R.fern, P2 = PAL.R.palm, w = K.W ? K.W.x : 0.3;
    let px = x;
    for (let s = 0; s < len; s++) {
      const u = s / len, off = Math.sin(t * 1.1 + ph + u * 2) * 1.6 * u * u + w * 2.2 * u * u;
      const xx = Math.round(x + off), yy = Math.round(y + s);
      ctx.fillStyle = PAL.css(F[s % 5 === 0 ? 1 : 2]); ctx.fillRect(xx, yy, 1, 1);
      if (s % 4 === 2 && s < len - 1) {
        const side = (s >> 2) % 2 ? 1 : -1;
        ctx.fillStyle = PAL.css(P2[5]); ctx.fillRect(xx + side, yy, 1, 1);
        ctx.fillStyle = PAL.css(P2[4]); ctx.fillRect(xx + side * 2, yy + 1, 1, 1);
        ctx.fillStyle = PAL.css(P2[3]); ctx.fillRect(xx + side, yy + 1, 1, 1);
      }
      px = xx;
    }
  };
})();
