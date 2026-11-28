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
  const pk = (c) => PAL.pk(c), R = () => PAL.R;
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
      else { landDist[i] = Math.min(255, toWater[i]) | 0; if (toWater[i] < 10 && terr[i] === TT.SAND) nearOcean[i] = 1; }
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
  // coral heads, seen through the water: branching, brain, fan and table corals in reef colours
  const CORAL_COLS = { branch: [[236, 120, 120], [250, 168, 150], [190, 80, 96]], brain: [[200, 200, 110], [228, 224, 150], [150, 150, 80]], fan: [[170, 110, 210], [206, 150, 236], [120, 70, 160]], table: [[90, 196, 180], [150, 226, 206], [50, 140, 140]] };
  function makeCoral(kind, seed) {
    const r = K.rng(seed), P = painter(30, 24), C = CORAL_COLS[kind].map((c) => PAL.pk(c));
    if (kind === "branch") { const twig = (x, y, a, l, dep) => { for (let s = 0; s < l; s++) { x += Math.cos(a); y += Math.sin(a); P.set(x, y, s > l - 2 ? C[1] : C[0]); P.set(x + 1, y, C[2]); } if (dep < 3) { twig(x, y, a - 0.5 - r() * 0.3, l * 0.7, dep + 1); twig(x, y, a + 0.5 + r() * 0.3, l * 0.7, dep + 1); } }; twig(15, 22, -Math.PI / 2, 7, 0); }
    else if (kind === "brain") P.disc(15, 13, 9, (xx, yy) => (Math.sin(xx * 1.3 + Math.sin(yy * 0.9) * 2) > 0.3 ? C[2] : xx + yy < -4 ? C[1] : C[0]));
    else if (kind === "fan") { for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * 0.22; for (let s = 0; s < 14; s++) P.set(15 + Math.cos(a) * s, 22 + Math.sin(a) * s, s % 3 === 0 ? C[1] : C[0]); } for (let y = 9; y < 20; y += 3) for (let x = 5; x < 26; x++) if (Math.hypot(x - 15, y - 22) < 14) P.set(x, y, C[2]); }
    else { for (let y = 0; y < 5; y++) for (let x = 2; x < 28; x++) if (Math.abs(x - 15) < 13 - y * 0.5) P.set(x, 12 + y, y === 0 ? C[1] : y < 3 ? C[0] : C[2]); for (let y = 17; y < 23; y++) { P.set(14, y, C[2]); P.set(15, y, C[0]); } }
    return P.done(false);
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
  H.coral = (p, L, o, x, y) => { const kinds = ["branch", "brain", "fan", "table"], kind = p.c || kinds[((p.x * 7 + p.y * 13) | 0) % 4], seed = ((p.x * 3 + p.y * 17) | 0) % 5; (L.under || (L.under = [])).push({ kind: "coral", x, y, img: art("co" + kind + seed, () => makeCoral(kind, seed + 1)), ph: (x + y) % 6 }); o.draw = () => {}; };
  // thermal vents: the chimney stands above the water, its mats and glow lie beneath
  H.vent = (p, L, o, x, y) => {
    const v = { x, y, state: "idle", st: Math.random() * 3, next: 3 + Math.random() * 5, hit: {}, mats: art("mats" + (((p.x + p.y) | 0) % 3), () => makeMats(((p.x + p.y) | 0) % 3)), bub: [] };
    (L.vents || (L.vents = [])).push(v); (L.under || (L.under = [])).push({ kind: "vent", v, x, y });
    o.draw = (ctx, ox, oy, t, g) => drawVent(v, ctx, ox, oy, t, g);
    o.solids = [[x - 7, y - 5, x + 7, y + 2]];
  };

  // ---------------------------------------------------------------- thermal vents
  // mineral mats around a vent, like a hot spring's rings: teal at the cool edge, gold, orange, then a
  // deep rust ring at the mouth, dithered so they melt into the water
  function makeMats(seed) {
    const R0 = 34, P = painter(R0 * 2, R0 * 2), rings = [[0.3, [150, 60, 30]], [0.48, [236, 120, 40]], [0.66, [250, 196, 70]], [0.82, [120, 200, 140]], [1, [60, 170, 180]]];
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
    // the chimney: a squat cone of basalt with a glowing mouth
    for (let yy = -9; yy <= 2; yy++) { const hw = 3 + (yy + 9) * 0.55; for (let xx = -Math.round(hw); xx <= Math.round(hw); xx++) { const d = xx / hw; ctx.fillStyle = PAL.css(yy === -9 ? OB[1] : d < -0.4 ? OB[4] : d < 0.3 ? OB[3] : OB[2]); ctx.fillRect(x + xx, y + yy, 1, 1); } }
    ctx.fillStyle = PAL.css(FI[heat > 0.7 ? 4 : 3]); ctx.fillRect(x - 2, y - 10, 5, 2); ctx.fillStyle = PAL.css(FI[2]); ctx.fillRect(x - 1, y - 8, 3, 3);
    if (g) Level.glowAt(g, x, y - 9, 26 + heat * 30, "255,150,60", 0.35 + heat * 0.45);
    // steam curling up and drifting with the wind
    for (let k = 0; k < 6; k++) {
      const u = ((t * 0.5 + k / 6 + v.x * 0.01) % 1), sx = x + Math.sin(u * 5 + k) * 4 + u * 10 * (K.W ? K.W.x : 0.3), sy = y - 12 - u * 34, r2 = 2 + u * 5, a = (1 - u) * (0.45 + heat * 0.3);
      ctx.fillStyle = `rgba(236,240,244,${a.toFixed(2)})`; ctx.fillRect(Math.round(sx - r2), Math.round(sy - r2 * 0.6), Math.round(r2 * 2), Math.round(r2 * 1.2));
    }
    // the geyser: a white column of boiling water with spray falling from its crown
    if (v.state === "erupt") {
      const u = Math.min(1, v.st / 0.25), h = 44 * u * (1 - Math.max(0, v.st - 0.9) / 0.3);
      for (let yy = 0; yy < h; yy++) { const w = 3 + (yy / h) * 3 + Math.sin(yy * 0.6 + t * 30) * 1.2; ctx.fillStyle = yy > h - 4 ? "#ffffff" : yy % 3 === 0 ? "#cfeef4" : "#f4fcff"; ctx.fillRect(Math.round(x - w), y - 10 - yy, Math.round(w * 2), 1); }
      for (let k = 0; k < 14; k++) { const a = k * 0.45 + t * 3, rr = (t * 60 + k * 9) % 26; ctx.fillStyle = "#e8f8fc"; ctx.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y - 10 - h + rr * 1.2 + Math.sin(a) * 2), 1, 2); }
      if (g) Level.glowAt(g, x, y - 20, 60, "255,240,220", 0.35);
    } else if (v.state === "warn") {
      ctx.strokeStyle = `rgba(255,220,140,${0.5 + 0.4 * Math.sin(t * 24)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, 22, 13, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  Sea.drawUnder = function (ctx, L, ox, oy, LW, LH, t) {
    if (!L.under) return;
    for (const u of L.under) {
      if (u.x < ox - 60 || u.x > ox + LW + 60 || u.y < oy - 50 || u.y > oy + LH + 50) continue;
      if (u.kind === "coral") {
        // seen through moving water: a little transparent, swaying, with light rippling over it
        ctx.globalAlpha = 0.74; ctx.drawImage(u.img, Math.round(u.x - 15 - ox + Math.sin(t * 0.9 + u.ph) * 0.6), Math.round(u.y - 20 - oy)); ctx.globalAlpha = 1;
        if (((t * 3 + u.ph) | 0) % 4 === 0) { ctx.fillStyle = "rgba(220,250,250,0.35)"; ctx.fillRect(Math.round(u.x - 8 - ox + ((t * 7) % 16)), Math.round(u.y - 12 - oy), 3, 1); }
      } else {
        const v = u.v, heat = v.state === "erupt" ? 1 : v.state === "warn" ? 0.8 : 0.5;
        ctx.globalAlpha = 0.55 + heat * 0.3; ctx.drawImage(v.mats, Math.round(v.x - 34 - ox), Math.round(v.y - 21 - oy)); ctx.globalAlpha = 1;
        // bubbles rising through the water and bursting at the surface
        for (let k = 0; k < (v.state === "idle" ? 5 : 14); k++) {
          const ph = ((t * (0.8 + (k % 3) * 0.3) + k * 0.37) % 1), a = k * 2.4, rr = 3 + (k % 5) * 3;
          ctx.fillStyle = ph > 0.85 ? "rgba(255,255,255,0.9)" : "rgba(210,246,250,0.7)";
          ctx.fillRect(Math.round(v.x + Math.cos(a) * rr * (1 - ph) - ox), Math.round(v.y + Math.sin(a) * rr * 0.5 - ph * 6 - oy), ph > 0.85 ? 2 : 1, 1);
        }
      }
    }
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
