// Zone 2, the Archipelago: the sea as terrain, and what lives on its shores and under its surface.
//
// - buildWater: turns a level's shallow / medium / deep tiles into the same depth map the island's
//   water renderer uses (js/water.js), blurred so the shallows shade softly into the reef and the
//   reef into the deep, with real distance-to-shore for foam and the waves washing up the sand.
// - shore: wet sand at the tide line, shells and starfish above it.
// - props: hala (pandanus) trees on stilt roots, beach naupaka with its half-flowers, tide-pool rocks,
//   sea stacks, driftwood; under the water: coral heads (branching, brain, fan, table) and thermal
//   vents, basalt chimneys ringed by mineral mats of orange, gold and teal, breathing bubbles and steam,
//   and now and then erupting in a scalding geyser.
(function () {
  const Sea = (window.Sea = {});
  const T = 32;
  const pk = (c) => PAL.pk(c), R = () => PAL.R, A = () => Level.assets();
  const mix = (a, b, f) => { const ar = a & 255, ag = (a >>> 8) & 255, ab = (a >>> 16) & 255; return (255 << 24) | ((ab + (((b >>> 16) & 255) - ab) * f) << 16) | ((ag + (((b >>> 8) & 255) - ag) * f) << 8) | (ar + ((b & 255) - ar) * f); };

  // ---------------------------------------------------------------- the water map
  function chamfer(N, W, H, isSeed) {
    const d = new Float32Array(N);
    for (let i = 0; i < N; i++) d[i] = isSeed(i) ? 0 : 1e4;
    const D = 1.414;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let v = d[i]; if (v === 0) continue; if (x > 0) v = Math.min(v, d[i - 1] + 1); if (y > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + D); if (x < W - 1) v = Math.min(v, d[i - W + 1] + D); } d[i] = v; }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; let v = d[i]; if (v === 0) continue; if (x < W - 1) v = Math.min(v, d[i + 1] + 1); if (y < H - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + D); if (x > 0) v = Math.min(v, d[i + W - 1] + D); } d[i] = v; }
    return d;
  }
  function boxBlur(src, W, H, r) {
    const tmp = new Float32Array(src.length), out = new Float32Array(src.length), n = 2 * r + 1;
    for (let y = 0; y < H; y++) { let acc = 0; const row = y * W; for (let x = -r; x <= r; x++) acc += src[row + Math.min(W - 1, Math.max(0, x))]; for (let x = 0; x < W; x++) { tmp[row + x] = acc / n; acc += src[row + Math.min(W - 1, x + r + 1)] - src[row + Math.max(0, x - r)]; } }
    for (let x = 0; x < W; x++) { let acc = 0; for (let y = -r; y <= r; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x]; for (let y = 0; y < H; y++) { out[y * W + x] = acc / n; acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x]; } }
    return out;
  }
  Sea.buildWater = function (def, terr, W, H) {
    const TT = Level.T_, N = W * H, wterr = new Uint8Array(N), base = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const v = terr[i], x = i % W, y = (i / W) | 0;
      if (v === TT.SHAL || v === TT.MED || v === TT.DEEP) { base[i] = v === TT.SHAL ? 9 : v === TT.MED ? 36 : 74; base[i] += (K.noise(x / 40, y / 40) - 0.5) * 8; }
      else { wterr[i] = 1; base[i] = 0; }
    }
    let depth = boxBlur(base, W, H, 9); depth = boxBlur(depth, W, H, 6);
    const toLand = chamfer(N, W, H, (i) => wterr[i] === 1), toWater = chamfer(N, W, H, (i) => wterr[i] === 0);
    const waterDist = new Uint8Array(N), landDist = new Uint8Array(N), oceanMask = new Uint8Array(N), nearOcean = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (wterr[i] === 0) { oceanMask[i] = 1; waterDist[i] = Math.min(255, Math.max(1, Math.min(depth[i] * 1.15, toLand[i] * 1.6 + 1))) | 0; }
      else { landDist[i] = Math.min(255, toWater[i]) | 0; if (toWater[i] < 10 && (terr[i] === TT.SAND || terr[i] === TT.CORAL)) nearOcean[i] = 1; }
    }
    return { W, H, terr: wterr, waterDist, landDist, oceanMask, nearOcean, sea: true };
  };

  // ---------------------------------------------------------------- the shore
  // sand darkens and cools where the sea wets it; above the tide line a few shells and starfish
  Sea.shore = function (t, x, y, c, T_) {
    const TT = Level.T_;
    if (t !== TT.SAND) return 0;
    let near = 9;
    for (const [dx, dy, d] of [[2, 0, 2], [-2, 0, 2], [0, 2, 2], [0, -2, 2], [4, 0, 4], [-4, 0, 4], [0, 4, 4], [0, -4, 4], [6, 3, 6], [-6, -3, 6], [3, -6, 6], [-3, 6, 6]]) if (d < near && TT.isWet(T_(x + dx, y + dy))) near = d;
    const SA = PAL.packed.sand, WET = PAL.pk([118, 128, 118]);
    if (near <= 2) return mix(mix(c, SA[0], 0.55), WET, 0.25);
    if (near <= 4) return mix(c, SA[1], 0.5);
    if (near <= 6 && PAL.bayer(x, y) > 0) return mix(c, SA[1], 0.3);
    const h = K.hash2(x >> 1, y >> 1, 91);
    if (h > 0.9965) return PAL.pk(K.hash2(x, y, 3) > 0.5 ? [246, 214, 204] : [250, 242, 226]);       // a shell
    if (h > 0.9958) return PAL.pk([238, 128, 70]);                                                    // a starfish arm
    return 0;
  };

  // ---------------------------------------------------------------- a tiny pixel painter for props
  function painter(w, h) {
    const [c, ctx] = K.canvas(w, h), img = ctx.createImageData(w, h), d = new Uint32Array(img.data.buffer);
    const set = (x, y, col) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h) d[y * w + x] = col; };
    const disc = (x, y, r, col) => { for (let yy = -Math.ceil(r); yy <= r; yy++) for (let xx = -Math.ceil(r); xx <= r; xx++) if (xx * xx + yy * yy <= r * r) set(x + xx, y + yy, typeof col === "function" ? col(xx, yy) : col); };
    const done = (outline) => { if (outline) Ruins.selout(d, w, h); ctx.putImageData(img, 0, 0); return c; };
    return { c, d, set, disc, done, w, h };
  }

  // hala (pandanus): a leaning ringed trunk on a tripod of stilt roots, branching into rosettes of long
  // saw-edged leaves that droop at the tips, with a ripening orange fruit
  function makeHala(seed) {
    const r = K.rng(seed), P = painter(64, 72), KO = PAL.packed.koa, PA = PAL.packed.palm, FE = PAL.packed.fern, SU = PAL.packed.sun;
    const bx = 30, by = 70, tx = 28 + (r() - 0.5) * 8, ty = 30;
    // stilt roots
    for (let k = 0; k < 5; k++) { const ex = bx + (k - 2) * 6 + (r() - 0.5) * 3, sx = bx + (tx - bx) * 0.25, sy = by - 13; for (let u = 0; u <= 1; u += 0.04) { const x = sx + (ex - sx) * u, y = sy + (by - sy) * u - Math.sin(u * Math.PI) * 3; P.set(x, y, u > 0.8 ? KO[1] : KO[2]); P.set(x + 1, y, KO[1]); } }
    // the trunk, ringed with old leaf scars
    for (let u = 0; u <= 1; u += 0.01) { const x = bx + (tx - bx) * u + Math.sin(u * 3) * 2, y = by - 12 - (by - 12 - ty) * u; for (let o = -2; o <= 2; o++) P.set(x + o, y, (Math.round(y) % 3 === 0) ? KO[1] : o < 0 ? KO[4] : o > 1 ? KO[1] : KO[3]); }
    // branches to two or three rosettes
    const tips = [[tx - 13, ty - 9], [tx + 12, ty - 12], [tx - 1, ty - 18]].slice(0, 2 + (r() > 0.5 ? 1 : 0));
    for (const [px, py] of tips) for (let u = 0; u <= 1; u += 0.04) { const x = tx + (px - tx) * u, y = ty + (py - ty) * u; P.set(x, y, KO[2]); P.set(x + 1, y, KO[1]); }
    // fruit under the first rosette
    const [fx, fy] = tips[0]; P.disc(fx + 2, fy + 5, 3.4, (xx, yy) => ((xx + yy + 8) % 3 === 0 ? SU[1] : xx + yy < -1 ? SU[4] : SU[3]));
    // rosettes of strap leaves, fanned all round and drooping
    for (const [px, py] of tips) for (let k = 0; k < 13; k++) {
      const a = (k / 13) * Math.PI * 2 + r() * 0.3, L = 13 + r() * 6;
      for (let s = 0; s < L; s += 0.5) {
        const f = s / L, x = px + Math.cos(a) * s, y = py + Math.sin(a) * s * 0.55 + f * f * 9;
        const upper = Math.sin(a) < 0, c = f > 0.85 ? PA[1] : upper ? (s % 3 < 1 ? PA[5] : PA[4]) : (s % 3 < 1 ? PA[3] : PA[2]);
        P.set(x, y, c); P.set(x, y + 1, f < 0.7 ? FE[2] : PA[1]);
        if (((s * 2) | 0) % 4 === 0 && f > 0.2) P.set(x + Math.sin(a), y - Math.cos(a) * 0.55, PA[5]);   // the saw edge catching light
      }
    }
    return P.done(true);
  }
  // beach naupaka: a low mound of fleshy, glossy leaves with little white half-flowers
  function makeNaupaka(seed) {
    const r = K.rng(seed), P = painter(34, 22), PA = PAL.packed.palm, FE = PAL.packed.fern;
    const leaves = [];
    for (let k = 0; k < 34; k++) { const a = r() * Math.PI, rr = r() * 12; leaves.push([17 + Math.cos(a) * rr * 1.2, 20 - Math.sin(a) * rr * 1.1 - 2, r() * Math.PI]); }
    leaves.sort((a, b) => a[1] - b[1]);
    for (const [x, y, a] of leaves) for (let yy = -2; yy <= 2; yy++) for (let xx = -3; xx <= 3; xx++) { const u = xx * Math.cos(a) + yy * Math.sin(a), v = -xx * Math.sin(a) + yy * Math.cos(a); if ((u / 3.2) ** 2 + (v / 1.8) ** 2 > 1) continue; P.set(x + xx, y + yy, v < -0.6 ? PA[5] : u > 1.5 ? PA[3] : v > 0.8 ? FE[2] : PA[4]); }
    for (let k = 0; k < 7; k++) { const x = 6 + r() * 22, y = 6 + r() * 10; P.set(x, y, PAL.pk([250, 250, 244])); P.set(x + 1, y, PAL.pk([250, 250, 244])); P.set(x, y + 1, PAL.pk([226, 214, 236])); P.set(x + 1, y - 1, PAL.pk([196, 150, 210])); }
    return P.done(true);
  }
  // a cluster of black lava rock holding little pools that mirror the sky
  function makeTidepool(seed) {
    const r = K.rng(seed), P = painter(40, 26), OB = PAL.packed.obsidian;
    for (let k = 0; k < 7; k++) { const cx = 8 + r() * 24, cy = 10 + r() * 10, rr = 4 + r() * 5; P.disc(cx, cy, rr, (xx, yy) => (yy < -rr * 0.4 ? OB[5] : xx + yy > rr * 0.6 ? OB[1] : K.hash2(cx + xx, cy + yy, 5) > 0.8 ? OB[4] : OB[3])); }
    for (let k = 0; k < 3; k++) { const cx = 10 + r() * 20, cy = 12 + r() * 6; P.disc(cx, cy, 2.4, (xx, yy) => (yy < 0 ? PAL.pk([150, 220, 230]) : PAL.pk([60, 150, 170]))); P.set(cx - 1, cy - 1, PAL.pk([240, 250, 250])); }
    for (let k = 0; k < 6; k++) P.set(6 + r() * 28, 6 + r() * 14, k % 2 ? PAL.pk([236, 120, 80]) : PAL.packed.fern[4]);
    return P.done(true);
  }
  // a sea stack: the island's own lava boulders piled into a pillar, mossy on top
  function makeSeastack(seed) {
    const [c, x] = K.canvas(40, 60), r = K.rng(seed + 5);
    const parts = [[34, 22, 30], [28, 18, 18], [22, 15, 6]];
    for (const [w, h, y] of parts) { const b = Props.make.boulder(w, h, (seed * 31 + y) | 0, y < 10); x.drawImage(b, Math.round(20 - b.width / 2 + (r() - 0.5) * 4), y + 60 - 52 - b.height + h); }
    return c;
  }
  function makeDriftwood(seed) {
    const r = K.rng(seed), P = painter(34, 10), KO = PAL.packed.koa, GL = PAL.packed.glyph;
    for (let x = 2; x < 32; x++) { const y = 5 + Math.sin(x * 0.2 + seed) * 1.2; P.set(x, y - 1, GL[4]); P.set(x, y, x % 5 === 0 ? KO[2] : GL[3]); P.set(x, y + 1, GL[1]); }
    for (let k = 0; k < 2; k++) { const x0 = 8 + k * 14; for (let s = 0; s < 6; s++) P.set(x0 + s, 4 - s * 0.7, GL[3]); }
    return P.done(true);
  }


  const cache = {};
  const art = (key, fn) => cache[key] || (cache[key] = fn());
  const H = Level.PROPS;
  H.hala = (p, L, o, x, y) => {
    const seed = ((p.x * 13 + p.y * 7) | 0) % 6, img = art("hala" + seed, () => makeHala(seed + 3)), B = art("halab" + seed, () => Props.bendFrames(img, 2, 7));
    o.draw = (ctx, ox, oy, t) => { const s = K.sway(o, t, x, y, 8, 7, 4); ctx.drawImage(B.frames[s.level], Math.round(x - img.width / 2 - B.pad - ox), Math.round(y - img.height + 2 - oy)); };
    o.solids = [[x - 8, y - 6, x + 8, y + 1]];
  };
  H.naupaka = (p, L, o, x, y) => {
    const seed = ((p.x * 5 + p.y * 11) | 0) % 5, img = art("nau" + seed, () => makeNaupaka(seed + 1)), B = art("naub" + seed, () => Props.bendFrames(img, 1, 7));
    o.draw = (ctx, ox, oy, t) => { const s = K.sway(o, t, x, y, 14, 7, 4); ctx.drawImage(B.frames[s.level], Math.round(x - img.width / 2 - B.pad - ox), Math.round(y - img.height + 3 - oy)); };
    o.solids = [[x - 12, y - 7, x + 12, y + 1]];
  };
  H.tidepool = (p, L, o, x, y) => { const seed = ((p.x * 3 + p.y) | 0) % 4, img = art("tp" + seed, () => makeTidepool(seed + 2)); o.draw = (ctx, ox, oy, t) => { ctx.drawImage(img, Math.round(x - 20 - ox), Math.round(y - 20 - oy)); if (Math.sin(t * 2 + x) > 0.6) { ctx.fillStyle = "rgba(240,252,255,0.8)"; ctx.fillRect(Math.round(x - 8 - ox + Math.sin(t) * 4), Math.round(y - 9 - oy), 1, 1); } }; o.solids = [[x - 16, y - 12, x + 16, y + 1]]; };
  H.seastack = (p, L, o, x, y) => { const seed = ((p.x * 7 + p.y * 3) | 0) % 4, img = art("ss" + seed, () => makeSeastack(seed)); o.draw = (ctx, ox, oy, t) => { ctx.drawImage(img, Math.round(x - 20 - ox), Math.round(y - 54 - oy)); for (let k = 0; k < 3; k++) { const a = t * 1.2 + k * 2.1, rr = 13 + ((t * 6 + k * 4) % 8); ctx.fillStyle = `rgba(230,250,250,${0.5 - ((t * 6 + k * 4) % 8) / 16})`; ctx.fillRect(Math.round(x + Math.cos(a) * rr - ox), Math.round(y + Math.sin(a) * rr * 0.4 - oy), 2, 1); } }; o.solids = [[x - 11, y - 8, x + 11, y + 2]]; };
  H.driftwood = (p, L, o, x, y) => { const seed = ((p.x * 3 + p.y * 5) | 0) % 3, img = art("dw" + seed, () => makeDriftwood(seed + 4)); o.draw = (ctx, ox, oy) => ctx.drawImage(img, Math.round(x - 17 - ox), Math.round(y - 7 - oy)); o.solids = [[x - 14, y - 3, x + 14, y + 1]]; };
  // corals live under the water layer's surface: drawn by drawUnder, not y-sorted with things above water
  // the concept's reef flora, living in the shallows: seagrass meadows that sway in the swell, coral
  // clusters, tube sponges and brain coral, all seen through the water
  const FLORA = { seagrass: ["f_seagrass", "f_grass1"], coralmix: ["f_coralmix"], sponge: ["f_sponges", "f_sponge"], brain: ["f_brain"] };
  // (the old hand-drawn coral heads are gone: a "coral" spot now grows one of the concept's corals)
  FLORA.coral = ["f_coralmix", "f_sponges", "f_brain", "f_sponge", "f_coralmix"];
  for (const k of Object.keys(FLORA)) H[k] = (p, L, o, x, y) => {
    const names = FLORA[k], name = names[((p.x * 7 + p.y * 3) | 0) % names.length], im = A().img[name]; if (!im) { o.draw = () => {}; return; }
    const sway = k === "seagrass" ? art("fb" + name, () => Props.bendFrames(im, 2, 7)) : null;
    (L.under || (L.under = [])).push({ kind: "flora", x, y, img: im, sway, ph: (x * 0.37 + y * 0.11) % 6, flip: ((p.x * 5 + p.y) | 0) % 2 });
    o.draw = () => {};
  };
  // thermal vents: the chimney stands above the water, its mats and glow lie beneath
  H.vent = (p, L, o, x, y) => {
    const vk = p.vk !== undefined ? p.vk : ((p.x * 3 + p.y) | 0) % 3;
    const v = { x, y, vk, state: "idle", st: Math.random() * 3, next: 3 + Math.random() * 5, hit: {}, mats: art("mats" + vk, () => makeMats(vk)), bub: [] };
    (L.vents || (L.vents = [])).push(v); (L.under || (L.under = [])).push({ kind: "vent", v, x, y });
    o.draw = (ctx, ox, oy, t, g) => drawVent(v, ctx, ox, oy, t, g);
  };

  // ---------------------------------------------------------------- thermal vents
  // mineral mats around a vent, like a hot spring's rings: teal at the cool edge, gold, orange, then a
  // deep rust ring at the mouth, dithered so they melt into the water
  // three kinds of vent, after the concept: rust and gold, violet, and an electric blue-teal
  const VENT_KINDS = [
    { rings: [[0.3, [150, 60, 30]], [0.48, [236, 120, 40]], [0.66, [250, 196, 70]], [0.82, [120, 200, 140]], [1, [60, 170, 180]]], glow: "255,150,60", mouth: [255, 200, 110] },
    { rings: [[0.3, [70, 30, 90]], [0.48, [150, 70, 190]], [0.66, [210, 140, 240]], [0.82, [120, 170, 230]], [1, [70, 150, 200]]], glow: "200,120,255", mouth: [240, 200, 255] },
    { rings: [[0.3, [20, 50, 90]], [0.48, [40, 120, 220]], [0.66, [120, 210, 250]], [0.82, [110, 230, 210]], [1, [60, 180, 190]]], glow: "110,190,255", mouth: [210, 240, 255] },
  ];
  Sea.VENT_KINDS = VENT_KINDS;
  function makeMats(seed) {
    const R0 = 34, P = painter(R0 * 2, R0 * 2), rings = VENT_KINDS[seed % 3].rings;
    for (let y = 0; y < R0 * 2; y++) for (let x = 0; x < R0 * 2; x++) {
      const dx = x + 0.5 - R0, dy = (y + 0.5 - R0) / 0.62, rr = (Math.hypot(dx, dy) + (K.noise(x / 6 + seed, y / 6) - 0.5) * 8) / R0;
      if (rr > 1) continue;
      const ring = rings.find((q) => rr <= q[0]); const fade = rr > 0.82 ? (1 - rr) / 0.18 : 1;
      if (PAL.bayer(x, y) + 0.5 > fade * 0.95 + 0.05) continue;
      P.set(x, y, PAL.pk(ring[1]));
    }
    return P.done(false);
  }
  function drawVent(v, ctx, ox, oy, t, g) {
    const x = Math.round(v.x - ox), y = Math.round(v.y - oy), OB = R().obsidian, FI = R().fire, heat = v.state === "erupt" ? 1 : v.state === "warn" ? 0.6 + 0.4 * Math.sin(t * 30) : 0.35 + 0.15 * Math.sin(t * 2 + v.x);
    // the vent itself is only its mouth in the sea floor: a hot glowing slit in the mats, the water over it
    // churning; the steam and the geyser come straight up out of it
    void OB;
    const VK = VENT_KINDS[v.vk || 0], M = VK.mouth;
    ctx.fillStyle = `rgba(${M[0]},${M[1]},${M[2]},${0.55 + heat * 0.4})`; ctx.beginPath(); ctx.ellipse(x + 0.5, y - 0.5, 4 + heat * 2, 1.6 + heat, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = PAL.css(FI[heat > 0.7 ? 4 : 3]); ctx.fillRect(x - 1, y - 1, 3, 1);
    for (let k = 0; k < 5; k++) { const a = t * 3 + k * 1.3, rr = 3 + ((t * 7 + k * 2) % 5); ctx.fillStyle = "rgba(240,252,255,0.7)"; ctx.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y - 0.5 + Math.sin(a) * rr * 0.4), 1, 1); }
    if (g) { Level.glowAt(g, x, y - 2, 24 + heat * 30, VK.glow, 0.32 + heat * 0.45); Level.glowAt(g, x, y, 50, VK.glow, 0.18); }
    // steam curling up and drifting with the wind
    for (let k = 0; k < 9; k++) {
      const u = ((t * 0.42 + k / 9 + v.x * 0.01) % 1), sx = x + Math.sin(u * 5 + k) * 4 + u * 14 * (K.W ? K.W.x : 0.3), sy = y - 3 - u * 56, r2 = 2 + u * 7, a = (1 - u) * (0.4 + heat * 0.3);
      ctx.fillStyle = `rgba(236,240,244,${a.toFixed(2)})`; ctx.fillRect(Math.round(sx - r2), Math.round(sy - r2 * 0.6), Math.round(r2 * 2), Math.round(r2 * 1.2));
    }
    // the geyser: a white column of boiling water with spray falling from its crown
    if (v.state === "erupt") {
      const u = Math.min(1, v.st / 0.25), h = 44 * u * (1 - Math.max(0, v.st - 0.9) / 0.3);
      for (let yy = 0; yy < h; yy++) { const w = 3 + (yy / h) * 3 + Math.sin(yy * 0.6 + t * 30) * 1.2; ctx.fillStyle = yy > h - 4 ? "#ffffff" : yy % 3 === 0 ? "#cfeef4" : "#f4fcff"; ctx.fillRect(Math.round(x - w), y - 1 - yy, Math.round(w * 2), 1); }
      for (let k = 0; k < 14; k++) { const a = k * 0.45 + t * 3, rr = (t * 60 + k * 9) % 26; ctx.fillStyle = "#e8f8fc"; ctx.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y - 1 - h + rr * 1.2 + Math.sin(a) * 2), 1, 2); }
      if (g) Level.glowAt(g, x, y - 12, 60, "255,240,220", 0.35);
    } else if (v.state === "warn") {
      ctx.strokeStyle = `rgba(255,220,140,${0.5 + 0.4 * Math.sin(t * 24)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, 22, 13, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // Everything beneath the surface (reef flora, coral, the vents' mineral mats, the fish) is painted into its
  // own layer, which is then seen THROUGH the water: it wavers a pixel with the refraction, and the very
  // same animated water surface (shimmer, swell lines, sparkles) is laid over it, so one ripple runs
  // across the sea and everything in it.
  let UC = null, ux = null, uw = 0, uh = 0;
  function underLayer(LW, LH) { if (!UC || uw !== LW || uh !== LH) { [UC, ux] = K.canvas(LW, LH); uw = LW; uh = LH; } ux.globalCompositeOperation = "source-over"; ux.globalAlpha = 1; ux.clearRect(0, 0, LW, LH); return ux; }
  // the Coral Atolls' shallows and reef flats are thick with coral: more is grown in round the placed
  // pieces, from a fixed seed (the same on every machine), clear of the shore and of each other
  function growReef(L) {
    L.reefGrown = true;
    if (!(L.def.sea && L.def.level === 2)) return;
    const r = K.rng(L.name.length * 131 + 7), U = L.under || (L.under = []), have = U.map((u) => [u.x, u.y]), names = ["f_coralmix", "f_sponges", "f_brain", "f_sponge", "f_coralmix", "f_seagrass", "f_grass1"];
    const n = Math.round((L.W * L.H) / (32 * 32) * 0.11);
    for (let k = 0, made = 0; k < n * 6 && made < n; k++) {
      const x = 16 + r() * (L.W - 32), y = 16 + r() * (L.H - 32), w = Level.waterAt(x, y);
      if (w !== 11 && w !== 12) continue;
      if (!(Level.waterAt(x + 14, y) && Level.waterAt(x - 14, y) && Level.waterAt(x, y + 10) && Level.waterAt(x, y - 16))) continue;
      if (have.some(([hx, hy]) => Math.abs(hx - x) < 22 && Math.abs(hy - y) < 18)) continue;
      const name = names[(r() * names.length) | 0], im = A().img[name]; if (!im) continue;
      const sway = name === "f_seagrass" || name === "f_grass1" ? art("fb" + name, () => Props.bendFrames(im, 2, 7)) : null;
      U.push({ kind: "flora", x, y, img: im, sway, ph: r() * 6, flip: r() < 0.5 }); have.push([x, y]); made++;
    }
  }
  Sea.drawUnder = function (ctx, L, ox, oy, LW, LH, t) {
    if (!L.reefGrown) growReef(L);
    const u2 = underLayer(LW, LH);
    for (const u of L.under || []) {
      if (u.x < ox - 60 || u.x > ox + LW + 60 || u.y < oy - 50 || u.y > oy + LH + 50) continue;
      if (u.kind === "flora") {
        const im = u.sway ? u.sway.frames[Math.max(0, Math.min(u.sway.frames.length - 1, Math.round((Math.sin(t * 1.3 + u.ph) * 0.5 + 0.5) * (u.sway.frames.length - 1))))] : u.img, w = im.width, h = im.height;
        if (u.flip) { u2.save(); u2.translate(Math.round(u.x - ox), 0); u2.scale(-1, 1); u2.drawImage(im, Math.round(-w / 2), Math.round(u.y - h + 2 - oy)); u2.restore(); }
        else u2.drawImage(im, Math.round(u.x - w / 2 - ox), Math.round(u.y - h + 2 - oy));
      } else { const v = u.v, heat = v.state === "erupt" ? 1 : v.state === "warn" ? 0.8 : 0.5; u2.globalAlpha = 0.6 + heat * 0.4; u2.drawImage(v.mats, Math.round(v.x - 34 - ox), Math.round(v.y - 21 - oy)); u2.globalAlpha = 1; }
    }
    drawFishInto(u2, L, ox, oy, LW, LH, t);
    // the water over it all: its own surface, at the same pixels, tinting what lies beneath
    const surf = Water.surface && Water.surface();
    if (surf) { u2.globalCompositeOperation = "source-atop"; u2.globalAlpha = 0.4; u2.drawImage(surf, 0, 0); u2.globalAlpha = 1; u2.globalCompositeOperation = "source-over"; }
    // refraction: the layer drawn in bands of rows, each nudged a pixel with a slow wave
    const B2 = 3;
    for (let y = 0; y < LH; y += B2) { const dx = Math.round(Math.sin(t * 1.7 + (oy + y) * 0.16) * 0.9 + Math.sin(t * 0.9 + (oy + y) * 0.05) * 0.4); ctx.drawImage(UC, 0, y, LW, B2, dx, y, LW, B2); }
    // bubbles from the vents rise up through it and burst at the surface (above the water)
    for (const u of L.under || []) {
      if (u.kind !== "vent" || u.x < ox - 60 || u.x > ox + LW + 60 || u.y < oy - 50 || u.y > oy + LH + 50) continue;
      const v = u.v;
      for (let k = 0; k < (v.state === "idle" ? 5 : 14); k++) {
        const ph = ((t * (0.8 + (k % 3) * 0.3) + k * 0.37) % 1), a = k * 2.4, rr = 3 + (k % 5) * 3;
        ctx.fillStyle = ph > 0.85 ? "rgba(255,255,255,0.9)" : "rgba(210,246,250,0.7)";
        ctx.fillRect(Math.round(v.x + Math.cos(a) * rr * (1 - ph) - ox), Math.round(v.y + Math.sin(a) * rr * 0.5 - ph * 6 - oy), ph > 0.85 ? 2 : 1, 1);
      }
    }
  };
  // ---------------------------------------------------------------- fish
  // Little shoals pass through the open water now and then: four to seven fish, each its own animal,
  // that swim together (they keep close to the one in front, match its heading and give each other room)
  // so the shoal stretches, bunches and turns fish by fish rather than as one stiff shape. In a frenzy, a
  // great bait ball of them mills round, scattering from the sharks that hunt it. All decoration: every
  // machine runs its own.
  const wet2 = (L, x, y) => { const v = Level.tileAt(x, y); return v === 12 || v === 13 || v === 11; };
  const open2 = (L, x, y) => { const v = Level.tileAt(x, y); return v === 12 || v === 13; };
  function shoal(x, y, a, n, sp) { const r = Math.random; return { x, y, a, sp, life: 0, fish: Array.from({ length: n }, (_, k) => ({ x: x - Math.cos(a) * k * 7 + (r() - 0.5) * 8, y: y - Math.sin(a) * k * 7 + (r() - 0.5) * 8, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ph: r() * 6, s: 0.8 + r() * 0.5 })) }; }
  // one fish's step: follow a point, keep with its neighbours, avoid crowding, cap its speed
  function swimFish(f, i, list, gx, gy, sp, dt, wC, flee) {
    let ax = (gx - f.x) * wC, ay = (gy - f.y) * wC, mx = 0, my = 0, n = 0;
    for (let k = Math.max(0, i - 3); k < Math.min(list.length, i + 4); k++) { if (k === i) continue; const o = list[k], dx = f.x - o.x, dy = f.y - o.y, d2 = dx * dx + dy * dy; if (d2 < 49 && d2 > 0.01) { ax += (dx / d2) * 60; ay += (dy / d2) * 60; } mx += o.vx; my += o.vy; n++; }
    if (n) { ax += (mx / n - f.vx) * 0.9; ay += (my / n - f.vy) * 0.9; }
    if (flee) { const dx = f.x - flee.x, dy = f.y - flee.y, d = Math.hypot(dx, dy); if (d < flee.r) { ax += (dx / (d || 1)) * 900 * (1 - d / flee.r); ay += (dy / (d || 1)) * 900 * (1 - d / flee.r); } }
    f.vx += ax * dt; f.vy += ay * dt;
    const v = Math.hypot(f.vx, f.vy), cap = sp * (flee && Math.hypot(f.x - flee.x, f.y - flee.y) < flee.r ? 3.2 : 1.35);
    if (v > cap) { f.vx *= cap / v; f.vy *= cap / v; }
    f.x += f.vx * dt; f.y += f.vy * dt;
  }
  Sea.fish = function (L, dt, t) {
    const F = L.fishS || (L.fishS = { list: [], next: 2 });
    F.next -= dt;
    if (F.next <= 0 && F.list.length < (L.def.fish || 3)) {
      F.next = 5 + Math.random() * 7;
      const cam = Level.camHint || { x: L.W / 2, y: L.H / 2 };
      for (let k = 0; k < 30; k++) {
        const a = Math.random() * Math.PI * 2, x = cam.x + Math.cos(a) * 300, y = cam.y + Math.sin(a) * 200; if (!open2(L, x, y)) continue;
        const head = a + Math.PI + (Math.random() - 0.5) * 0.8, sp = 24 + Math.random() * 14;
        F.list.push(shoal(x, y, head, 4 + ((Math.random() * 4) | 0), sp));
        // sometimes a second little shoal close behind the first
        if (Math.random() < 0.4) F.list.push(shoal(x - Math.cos(head) * 40 + (Math.random() - 0.5) * 30, y - Math.sin(head) * 40 + (Math.random() - 0.5) * 30, head + (Math.random() - 0.5) * 0.4, 3 + ((Math.random() * 3) | 0), sp));
        break;
      }
    }
    for (const s of F.list) {
      s.life += dt;
      // the lead point wanders on, turning away from the shallows and the shore
      const ahead = (d) => open2(L, s.x + Math.cos(s.a) * d, s.y + Math.sin(s.a) * d);
      if (!ahead(44)) s.a += dt * 2.4; else s.a += (Math.sin(t * 0.37 + s.fish.length * 1.7) * 0.25 + Math.sin(t * 1.3 + s.x * 0.01) * 0.12) * dt;
      s.x += Math.cos(s.a) * s.sp * dt; s.y += Math.sin(s.a) * s.sp * dt;
      // each fish chases the one ahead of it (the first chases the lead point)
      s.fish.forEach((f, i) => { const g = i === 0 ? s : s.fish[i - 1]; swimFish(f, i, s.fish, g.x + Math.sin(t + f.ph) * 3, g.y + Math.cos(t * 1.2 + f.ph) * 3, s.sp, dt, i === 0 ? 2.2 : 3.2, null); });
    }
    F.list = F.list.filter((s) => s.life < 45 && s.x > -150 && s.y > -150 && s.x < L.W + 150 && s.y < L.H + 150);
    // the frenzy's bait ball: every fish circles the ball's drifting heart, and scatters from any shark
    // that comes in close, the ball closing up again behind it; a lunge through it takes a few
    const B = L.school;
    if (B && B.active) {
      B.t += dt;
      const tx = B.cx + Math.cos(B.t * 0.3) * B.rx * 0.45, ty = B.cy + Math.sin(B.t * 0.42) * B.ry * 0.4;
      B.x += (tx - B.x) * Math.min(1, dt * 0.7); B.y += (ty - B.y) * Math.min(1, dt * 0.7);
      const sharks = (L.enemies || []).filter((e) => !e.dead && (e.type === "shark" || e.type === "bigshark") && Math.hypot(e.x - B.x, e.y - B.y) < 140);
      B.fish.forEach((f, i) => {
        const ang = Math.atan2(f.y - B.y, f.x - B.x) + (f.ph > 3 ? 0.9 : -0.9), rr = 18 + (i % 9) * 3.2;
        let flee = null; for (const e of sharks) { const d = Math.hypot(f.x - e.x, f.y - e.y); if (d < 46 && (!flee || d < flee.d)) flee = { x: e.x, y: e.y, r: e.state === "lunge" ? 54 : 40, d }; }
        swimFish(f, i, B.fish, B.x + Math.cos(ang) * rr, B.y + Math.sin(ang) * rr * 0.72, 46, dt, 2.6, flee);
        if (!open2(L, f.x, f.y)) { f.x += (B.x - f.x) * 0.1; f.y += (B.y - f.y) * 0.1; }
      });
      for (const e of sharks) if (e.state === "lunge") for (const f of B.fish) if (!f.eaten && Math.hypot(f.x - e.x, f.y - e.y) < 9) { f.eaten = 1; for (let k = 0; k < 3; k++) Combat.addPart({ x: f.x, y: f.y, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 30, g: 120, life: 0.4, col: "#e8f8fc", size: 1, kind: "drop" }); }
      B.fish = B.fish.filter((f) => !f.eaten);
    }
  };
  // a fish from above: a tapered body pointed along its heading, a beating tail, a glint now and then
  function drawFishOne(c, f, ox, oy, t, alpha, len) {
    const a = Math.atan2(f.vy, f.vx), ca = Math.cos(a), sa = Math.sin(a), X = f.x - ox, Y = f.y - oy, beat = Math.sin(t * 14 + f.ph * 3);
    c.fillStyle = `rgba(6,26,40,${alpha})`;
    for (let k = -len; k <= len * 0.7; k += 0.7) { const w = k > -len * 0.4 && k < len * 0.3 ? 1 : 0; c.fillRect(Math.round(X + ca * k - sa * w * 0.5), Math.round(Y + sa * k + ca * w * 0.5), 1 + w, 1); }
    const tx = X - ca * (len + 1), ty = Y - sa * (len + 1);
    for (const sg of [-1, 1]) c.fillRect(Math.round(tx - sa * sg * (1.2 + beat * 0.6) - ca), Math.round(ty + ca * sg * (1.2 + beat * 0.6) - sa), 1, 1);
    if (((t * 3 + f.ph * 5) | 0) % 11 === 0) { c.fillStyle = `rgba(220,245,255,${alpha})`; c.fillRect(Math.round(X + ca * 2), Math.round(Y + sa * 2), 1, 1); }
  }
  function drawFishInto(c, L, ox, oy, LW, LH, t) {
    for (const s of (L.fishS && L.fishS.list) || []) {
      if (s.x < ox - 120 || s.x > ox + LW + 120 || s.y < oy - 120 || s.y > oy + LH + 120) continue;
      const a = 0.55 * Math.min(1, s.life / 2, (45 - s.life) / 3);
      for (const f of s.fish) if (wet2(L, f.x, f.y)) drawFishOne(c, f, ox, oy, t, a, 3 + f.s * 1.6);
    }
    const B = L.school; if (B && B.active) for (const f of B.fish) if (wet2(L, f.x, f.y)) drawFishOne(c, f, ox, oy, t, 0.6, 2.4 + f.s);
  }
  Sea.drawFish = function () {};   // the fish are drawn into the under-water layer (Sea.drawUnder)
  // a feeding frenzy (Level 1's open water): the great bait ball arrives, and the sharks follow it in
  Sea.frenzyStart = function (L, a) {
    const [x0, y0, x1, y1] = a.rect.map((v) => v * 32), cx = (x0 + x1 + 32) / 2, cy = (y0 + y1 + 32) / 2, r = Math.random;
    L.school = { x: cx, y: cy, active: true, cx, cy, rx: (x1 - x0) / 2, ry: (y1 - y0) / 2, t: 0, fish: Array.from({ length: 150 }, (_, k) => { const a2 = r() * Math.PI * 2, d = 6 + r() * 34; return { x: cx + Math.cos(a2) * d, y: cy + Math.sin(a2) * d * 0.7, vx: 0, vy: 0, ph: r() * 6, s: 0.6 + r() * 0.6 }; }) };
  };
  Sea.frenzyEnd = function (L) { if (L.school) L.school.active = false; };
  Sea.frenzyTick = function (a, L, t, heroes, api) {
    const [x0, y0, x1, y1] = a.rect.map((v) => v * 32), np = heroes.length, el = t - a.t0;
    a.live = a.live.filter((e) => !e.dead);
    const n = (k) => a.live.filter((e) => e.type === k).length;
    // more and more of them, and the big ones early
    const want = { shark: 3 + np + (el > 12 ? 1 : 0) + (el > 26 ? 2 : 0), bigshark: el < 6 ? 0 : el < 20 ? 1 + (np > 1 ? 1 : 0) : 2 + (np > 1 ? 1 : 0) + (el > 34 ? 1 : 0) };
    if (t > (a.spawnT || 0)) {
      a.spawnT = t + 1.1;
      for (const k of ["bigshark", "shark"]) if (n(k) < want[k]) {
        // in from the edge of the frenzy, out in the deeper water, away from the heroes
        for (let tries = 0; tries < 40; tries++) {
          const side = (Math.random() * 4) | 0, u = Math.random(), x = side < 2 ? (side ? x1 + 16 : x0 + 16) : x0 + (x1 - x0) * u, y = side >= 2 ? (side === 2 ? y0 + 16 : y1 + 16) : y0 + (y1 - y0) * u;
          const w = Level.tileAt(x, y); if (w !== 12 && w !== 13) continue; if (heroes.some((q) => Math.hypot(q.x - x, q.y - y) < 120)) continue;
          const e = Enemies.spawn(k, x, y, 0, L); if (!e) break; e.alerted = true; e.enter = "scurry"; e.introT = 0.9; e.frenzy = 1; L.enemies.push(e); a.live.push(e); break;
        }
        break;
      }
    }
  };
  // little crabs (not foes) about the beaches and the atolls' coral, scurrying from anyone who comes near
  function seaCrabs(L) {
    const r = K.rng(L.name.length * 71 + 3), list = (L.crabs = []), T_ = Level.T_;
    const okAt = (x, y) => { const v = Level.tileAt(x, y); return (v === T_.SAND || v === T_.CORAL) && !Level.solidAt(x, y); };
    const want = Math.round((L.W * L.H) / (32 * 32) / 260) + 10;
    for (let k = 0; k < want * 40 && list.length < want; k++) {
      const x = 16 + r() * (L.W - 32), y = 16 + r() * (L.H - 32);
      if (!okAt(x, y)) continue;
      // near the water's edge
      let wet = false; for (let a = 0; a < 8 && !wet; a++) { const d = 40 + r() * 60; if (Level.waterAt(x + Math.cos(a) * d, y + Math.sin(a) * d)) wet = true; }
      if (wet) list.push({ kind: "crab", x, y, vx: 0, vy: 0, timer: r() * 3, frame: 0, ghost: Level.tileAt(x, y) === T_.SAND && r() < 0.5 });
    }
    L.crabOk = okAt;
  }
  Sea.crabs = function (L, dt, heroes) {
    if (!L.crabs) seaCrabs(L);
    for (const c of L.crabs) { const h = (heroes || []).reduce((b, q) => (!b || Math.hypot(q.x - c.x, q.y - c.y) < Math.hypot(b.x - c.x, b.y - c.y) ? q : b), null); Props.crabStep(c, dt, h, L.crabOk); }
  };
  Sea.drawCrabs = function (ctx, L, ox, oy, LW, LH) {
    for (const c of L.crabs || []) { if (c.x < ox - 10 || c.x > ox + LW + 10 || c.y < oy - 10 || c.y > oy + LH + 10) continue; ctx.drawImage((c.ghost ? Props.ghostCrabFrames() : Props.crabFrames)[Math.floor(c.frame) % 2], Math.round(c.x - 4 - ox), Math.round(c.y - 5 - oy)); }
  };
  // vents breathe, rumble (a ring of light: get clear) and erupt; the host runs them
  Sea.update = function (L, dt, t, heroes, api) {
    if (!L.vents) return;
    for (const v of L.vents) {
      v.st += dt;
      if (Level.netGuest) continue;
      if (v.state === "idle" && v.st > v.next) { v.state = "warn"; v.st = 0; }
      else if (v.state === "warn" && v.st > (v.warnFor || 1.1)) { v.state = "erupt"; v.st = 0; v.hit = {}; api.sfx("geyser"); }
      else if (v.state === "erupt") {
        if (v.st < 1) for (const q of heroes) { const key = q.isRemote ? "r" + q.slot : "l"; if (v.hit[key] || q.dead) continue; if (Math.hypot(q.x - v.x, (q.y - v.y) / 0.62) < 24) { const ok = q.isRemote ? api.hurtRemote(q, 1, v.x, v.y, "steam") : api.hurt(1, v.x, v.y, "steam"); if (ok) v.hit[key] = 1; } }
        if (v.st > 1.2) { v.state = "idle"; v.st = 0; v.next = (L.def.ventRest || 5) + Math.random() * 4; v.warnFor = 0; }
      }
    }
  };
  // a boss (or anything else) can make a vent go off
  Sea.erupt = (v, warn) => { if (v.state === "idle") { v.state = "warn"; v.st = 0; v.warnFor = warn || 0.9; } };
  Sea.serialize = (L) => (L.vents ? L.vents.map((v) => (v.state === "erupt" ? 2 : v.state === "warn" ? 1 : 0)) : null);
  Sea.apply = (L, a, t) => { if (!a || !L.vents) return; a.forEach((s, i) => { const v = L.vents[i]; if (!v) return; const st = s === 2 ? "erupt" : s === 1 ? "warn" : "idle"; if (v.state !== st) { v.state = st; v.st = 0; } }); };
})();
