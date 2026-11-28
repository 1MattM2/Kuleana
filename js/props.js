// Scenery: procedural pixel-art props + placement of everything on the island.
// Plants and trees are the sprites cut from docs/ (see tools/build_assets.py); a few
// structures (stalls, temple, tikis, rocks) are drawn here in the same palette.
(function () {
  const T = K.TILE;
  const Props = (window.Props = {});

  // --------------------------------------------------------------- drawing helpers
  // Pre-rendered bend frames: the base stays planted and the top leans (quadratic bend).
  // The frame is picked by a per-plant spring following the wind (K.sway), so plants ease
  // back and forth instead of tearing every frame.
  const bendCache = new Map();
  Props.bendFrames = function (img, maxPx, n) {
    const key = img;
    let byAmp = bendCache.get(key);
    if (!byAmp) bendCache.set(key, (byAmp = {}));
    const k2 = maxPx + ":" + n;
    if (byAmp[k2]) return byAmp[k2];
    const pad = Math.ceil(maxPx) + 1, w = img.width, h = img.height;
    const frames = [];
    for (let f = 0; f < n; f++) {
      const amp = (-0.25 + (1.25 * f) / (n - 1)) * maxPx; // matches K.sway levels: slight recoil .. full gust
      const [c, ctx] = K.canvas(w + pad * 2, h);
      for (let r = 0; r < h; r++) {
        const u = 1 - (r + 0.5) / h;
        ctx.drawImage(img, 0, r, w, 1, pad + Math.round(amp * u * u), r, w, 1);
      }
      frames.push(c);
    }
    return (byAmp[k2] = { frames, pad });
  };

  const shadowCache = {};
  Props.shadow = function (rw, rh) {
    rw = Math.max(2, Math.round(rw)); rh = Math.max(1, Math.round(rh));
    const key = rw + "x" + rh;
    if (shadowCache[key]) return shadowCache[key];
    const [c, ctx] = K.canvas(rw * 2 + 1, rh * 2 + 1);
    ctx.fillStyle = "#0b1a18";
    for (let y = -rh; y <= rh; y++) for (let x = -rw; x <= rw; x++) {
      if ((x * x) / (rw * rw) + (y * y) / (rh * rh) <= 1) ctx.fillRect(x + rw, y + rh, 1, 1);
    }
    return (shadowCache[key] = c);
  };
  Props.drawShadow = function (ctx, x, y, rw, rh, a) {
    const s = Props.shadow(rw, rh);
    ctx.globalAlpha = a || 0.25;
    ctx.drawImage(s, Math.round(x - rw), Math.round(y - rh));
    ctx.globalAlpha = 1;
  };

  function px(ctx, x, y, c) { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); }
  function rect(ctx, x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); }

  // --------------------------------------------------------------- generated sprites
  function makeBoulder(w, h, seed, mossy) {
    const [c, ctx] = K.canvas(w + 2, h + 2);
    const r = K.rng(seed);
    const pal = ["#120e18", "#2a2434", "#423a52", "#5e5472", "#82769a"];
    const cx = w / 2 + 1, cy = h / 2 + 1, rx = w / 2, ry = h / 2;
    const lobes = [r() * 6, r() * 6, r() * 6];
    const inside = (x, y) => {
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      const a = Math.atan2(dy, dx);
      const rr = 0.86 + 0.07 * Math.sin(a * 3 + lobes[0]) + 0.05 * Math.sin(a * 5 + lobes[1]) + 0.04 * Math.sin(a * 2 + lobes[2]);
      const flat = dy > 0.55 ? 0.55 : dy; // flat-ish bottom so it sits on the ground
      return dx * dx + flat * flat * 1.0 < rr * rr && dy < 0.98;
    };
    for (let y = 0; y < h + 2; y++) for (let x = 0; x < w + 2; x++) {
      if (!inside(x, y)) continue;
      const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
      if (edge) { px(ctx, x, y, pal[0]); continue; }
      const dx = (x - cx) / rx, dy = (y - cy) / ry;
      let l = 0.55 - dx * 0.35 - dy * 0.55 + (K.noise(x * 0.35 + seed, y * 0.35) - 0.5) * 0.5;
      // crack facets
      if (K.noise(x * 0.25 + seed * 3, y * 0.6) > 0.72) l -= 0.35;
      const idx = K.clamp(Math.floor(l * 4), 1, 4);
      px(ctx, x, y, pal[idx]);
      if (mossy && dy < -0.35 && K.noise(x * 0.4 + seed, y * 0.4) > 0.45) px(ctx, x, y, K.noise(x, y) > 0.5 ? "#3c9a3e" : "#5cbc48");
    }
    return c;
  }

  const TIKI = [
    "....oooooo....",
    "...oaaaaabo...",
    "..oaaaaaabbo..",
    "..orrrrrrrro..",
    "..oabbbbbbco..",
    ".ooaaaaaaacoo.",
    ".oakkkobkkkco.",
    ".oakeekoekeco.",
    ".oakkkobkkkco.",
    ".ooaaabbbaacoo",
    "..oaaabcbaaco.",
    "..oaaabcbaaco.",
    ".oaaaaacaaaaco",
    ".oakkkkkkkkkco",
    ".oakeekeekeeco",
    ".oakkkkkkkkkco",
    "..oaaaaaaaaco.",
    "..orrrrrrrrro.",
    "..oaabbaabbco.",
    "..oabbcabbcco.",
    "..oaaaaaaaaco.",
    "..oabbabbabco.",
    "..oaaaaaaaaco.",
    ".oobbbbbbbbcoo",
    ".obbccccccccbo",
    ".oooooooooooo.",
  ];
  const TIKI_PAL = { o: [34, 20, 16], a: [184, 122, 70], b: [144, 88, 50], c: [100, 58, 34], k: [26, 16, 14], e: [242, 226, 186], r: [196, 62, 42] };

  // ---- a carved Kū face, shared by the tiki statues (koa wood) and the temple gate's mask (stone).
  // u runs -1..1 across the face, v 0..1 down it. Returns what is carved there:
  // 0 surface, 1 raised (catches the light), 2 recess, 3 eye, 4 pupil, 5 tooth, 6 tongue, 7 deep shadow
  function kuFace(u, v) {
    const au = Math.abs(u);
    if (v < 0.06) return 1;                                                   // the brow band
    if (v > 0.11 && v < 0.19 && au < 0.92) return v < 0.13 ? 1 : 0;           // heavy brow ridge
    if (v >= 0.19 && v < 0.22 && au < 0.9) return 2;                          // carved line under it
    const de = ((au - 0.46) / 0.27) ** 2 + ((v - 0.34) / 0.14) ** 2;          // deep-set eyes of pearl shell
    if (de < 1) { if (de > 0.5) return 2; return ((au - 0.43) / 0.1) ** 2 + ((v - 0.35) / 0.07) ** 2 < 1 ? 4 : 3; }
    if (v > 0.27 && v < 0.63) {                                               // the flaring nose
      const hw = 0.1 + (v - 0.27) * 0.6;
      if (au < hw) { if (v > 0.55 && au > hw - 0.13) return 7; return u > hw - 0.06 ? 2 : 1; }
    }
    const dm = (u / 0.82) ** 2 + ((v - 0.81) / 0.17) ** 2;                    // the great figure-eight mouth
    if (dm < 1) {
      if (dm > 0.66) return 1;                                                // thick carved lips
      const col = Math.floor((u + 1) * 7) & 1;
      if (v < 0.79) return col ? 5 : 7;                                       // upper teeth
      if (au < 0.3 && v > 0.8) return 6;                                      // the tongue thrust out
      if (v > 0.88) return col ? 5 : 7;                                       // lower teeth
      return 7;
    }
    const dc = Math.hypot(au - 0.8, (v - 0.6) * 1.3);                         // koru spirals on the cheeks
    if (dc < 0.17) { const a = Math.atan2(v - 0.6, au - 0.8), f = ((dc / 0.17) * 2 - a / (Math.PI * 2)) % 1; if ((f + 1) % 1 < 0.38) return 2; }
    return 0;
  }
  // the koa tiki: a fanned crest, a red-painted band, the Kū face, arms carved over the belly, and
  // short legs on a stone plinth. Lit from the left like everything else, with a dark outline.
  function makeTiki() {
    const W = 18, H = 34, cx = 9, KO = PAL.R.koa, KA = PAL.R.kapa, OB = PAL.R.obsidian, FE = PAL.R.fern, ST = PAL.R.stone, pk = PAL.pk;
    const wood = (lit, m) => {
      let i = lit > 0.5 ? 4 : lit > 0.12 ? 3 : lit > -0.3 ? 2 : 1;
      if (m === 1) i += 1; else if (m === 2) i -= 1;
      return pk(KO[Math.max(0, Math.min(6, i))]);
    };
    return Ruins.raster(W, H, (x, y) => {
      const dx = x + 0.5 - cx;
      const lit = (hw) => -dx / hw * 0.75 + 0.22 + (K.hash2(x, y >> 1, 5) - 0.5) * 0.12;     // a carved log, round and grained
      if (y <= 6) {                                                                          // the fanned crest, ridged like feathers
        const hw = 3 + (6 - y) * 0.85; if (Math.abs(dx) > hw) return 0;
        const ridge = Math.round(dx / 1.6) & 1;
        return y === 0 ? pk(KO[5]) : wood(lit(hw), ridge ? 1 : 2);
      }
      if (y === 7) return Math.abs(dx) < 7 ? pk(KA[x < cx ? 2 : 1]) : 0;                   // a band of red earth paint
      if (y === 8) return Math.abs(dx) < 7 ? pk(KO[1]) : 0;
      if (y <= 21) {                                                                         // the face
        const hw = 7.4 - (y > 19 ? (y - 19) * 0.6 : 0); if (Math.abs(dx) > hw) return 0;
        const m = kuFace(dx / 7, (y - 9) / 13);
        if (m === 3) return pk(KA[3]); if (m === 4) return pk(OB[0]); if (m === 5) return pk(KA[3]); if (m === 6) return pk(PAL.R.hibiscus[2]); if (m === 7) return pk(OB[1]);
        return wood(lit(hw), m);
      }
      if (y === 22) return Math.abs(dx) < 6 ? pk(KA[x < cx ? 2 : 1]) : 0;
      if (y <= 29) {                                                                         // the body, arms folded over the belly
        const hw = 6.2; if (Math.abs(dx) > hw) return 0;
        const v = (y - 23) / 6, armX = 5.6 - v * 4.2, onArm = Math.abs(Math.abs(dx) - armX) < 0.9 && v < 0.95;
        if (onArm) return wood(lit(hw), 1);
        if (Math.abs(Math.abs(dx) - armX) < 1.7 && Math.abs(dx) > armX) return wood(lit(hw), 2);
        if (Math.abs(dx) < 1 && (y === 25 || y === 27)) return pk(KO[1]);                 // carved chevrons on the chest
        return wood(lit(hw), 0);
      }
      if (y <= 31) { const hw = 6; if (Math.abs(dx) > hw) return 0; if (Math.abs(dx) < 1.1) return pk(OB[1]); return wood(lit(hw), y === 31 ? 2 : 0); }
      if (y === 32) return Math.abs(dx) < 7.5 ? pk(K.hash2(x, 3, 9) > 0.7 ? FE[3] : ST[2]) : 0;          // stone plinth, a little mossy
      return Math.abs(dx) < 7.5 ? pk(ST[1]) : 0;
    }, true);
  }

  // Market stall: thatch roof, posts, counter of goods (fruit + potions as in the concept)
  function makeStall(seed, variant) {
    const w = 76, h = 70;
    const [c, ctx] = K.canvas(w, h);
    const r = K.rng(seed);
    const wood = ["#2a1810", "#6a4024", "#8e5a32", "#b47a46", "#d29a5c"];
    // back posts
    rect(ctx, 9, 16, 4, 30, wood[0]); rect(ctx, 10, 16, 2, 30, wood[2]);
    rect(ctx, 63, 16, 4, 30, wood[0]); rect(ctx, 64, 16, 2, 30, wood[2]);
    // counter
    rect(ctx, 2, 41, 72, 26, wood[0]);
    rect(ctx, 3, 42, 70, 5, wood[4]);
    rect(ctx, 3, 46, 70, 1, wood[3]);
    for (let x = 3; x < 73; x++) {
      const plank = Math.floor((x - 3) / 7);
      const col = (x - 3) % 7 === 0 ? wood[1] : plank % 2 ? wood[2] : wood[3];
      rect(ctx, x, 47, 1, 19, col);
    }
    rect(ctx, 3, 47, 70, 1, wood[1]);
    for (let x = 6; x < 73; x += 7) { px(ctx, x, 50, wood[0]); px(ctx, x, 62, wood[0]); }
    // goods on the counter
    let gx = 6;
    const goods = variant === 0 ? ["pine", "pot:#a050d8", "pot:#3c7ee0", "fruit", "pot:#e04848", "coco", "pot:#50c070"] : ["fruit", "pot:#e04848", "bananas", "pot:#a050d8", "coco", "pot:#3c7ee0", "pine"];
    for (const g of goods) {
      if (g.startsWith("pot")) {
        const col = g.slice(4);
        rect(ctx, gx + 1, 33, 3, 1, "#5a3a24"); // cork
        rect(ctx, gx, 34, 5, 1, "#1a1020");
        rect(ctx, gx - 1, 35, 7, 7, "#1a1020");
        rect(ctx, gx, 35, 5, 6, col);
        px(ctx, gx + 1, 36, "#ffffff"); px(ctx, gx + 1, 37, "rgba(255,255,255,0.6)");
        rect(ctx, gx, 40, 5, 1, "rgba(0,0,0,0.25)");
        gx += 9;
      } else if (g === "pine") {
        rect(ctx, gx + 1, 29, 1, 4, "#2e8a3a"); rect(ctx, gx + 3, 28, 1, 5, "#3ea848"); rect(ctx, gx + 5, 29, 1, 4, "#2e8a3a");
        rect(ctx, gx, 33, 7, 9, "#3a2410");
        rect(ctx, gx + 1, 33, 5, 8, "#e0a832");
        for (let y = 34; y < 41; y += 2) for (let x = gx + 1 + (y % 4 ? 0 : 1); x < gx + 6; x += 2) px(ctx, x, y, "#a8701e");
        gx += 10;
      } else if (g === "coco") {
        for (let k = 0; k < 2; k++) {
          const cx = gx + k * 5;
          rect(ctx, cx, 36, 6, 6, "#2a1810"); rect(ctx, cx + 1, 36, 4, 5, "#7a4a26"); px(ctx, cx + 2, 37, "#a8703c");
        }
        gx += 12;
      } else if (g === "bananas") {
        rect(ctx, gx, 37, 8, 4, "#3a2a10");
        rect(ctx, gx + 1, 37, 6, 3, "#f2d444"); rect(ctx, gx + 1, 39, 6, 1, "#c8a22a"); px(ctx, gx, 36, "#4a8a30");
        gx += 10;
      } else {
        // basket of red fruit
        rect(ctx, gx, 37, 9, 5, "#5a3a1c"); rect(ctx, gx + 1, 38, 7, 3, "#8e6a34");
        const fr = ["#e04030", "#f07040", "#e8c040"];
        for (let k = 0; k < 4; k++) { rect(ctx, gx + 1 + k * 2, 35 + (k % 2), 2, 2, fr[k % 3]); px(ctx, gx + 1 + k * 2, 35 + (k % 2), "#fff0c0"); }
        gx += 11;
      }
      if (gx > 66) break;
    }
    // thatched roof (front edge hangs over the counter)
    const straw = ["#5a3c14", "#a2742e", "#c89a46", "#e2bc66", "#f4d888"];
    for (let y = 0; y < 26; y++) {
      const inset = Math.max(0, 10 - Math.floor(y * 0.5));
      for (let x = inset; x < w - inset; x++) {
        const strand = (K.hash2(x, Math.floor(y / 3), seed) * 3) | 0;
        let col = straw[2 + (strand === 2 ? 1 : 0)];
        if ((x + Math.floor(y / 2)) % 5 === 0) col = straw[1];
        if (y % 6 === 5) col = straw[1];
        if (y < 2) col = straw[4];
        if (x === inset || x === w - inset - 1) col = straw[0];
        px(ctx, x, y, col);
      }
    }
    rect(ctx, 10, 0, w - 20, 1, straw[0]);
    // ragged fringe
    for (let x = 0; x < w; x++) {
      const len = 1 + ((K.hash2(x, 99, seed) * 4) | 0);
      for (let y = 26; y < 26 + len; y++) px(ctx, x, y, y === 25 + len ? straw[0] : straw[x % 3 === 0 ? 1 : 2]);
    }
    // shade under the roof
    ctx.fillStyle = "rgba(20,10,0,0.28)";
    ctx.fillRect(3, 30, 70, 4);
    return c;
  }

  // Carved temple gate set into the lava cliff (dungeon entrance for a later stage).
  function makeTemple(A) {
    const w = 168, h = 150;
    const [c, ctx] = K.canvas(w, h);
    const S = [[22, 20, 28], [58, 56, 66], [88, 86, 94], [120, 118, 124], [156, 154, 156], [190, 188, 186]];
    const css = (i) => K.css(S[i]);
    const glyph = A.px.tex_glyph;
    // carve using the glyph slabs' light/dark structure, recoloured to grey stone
    function carved(x0, y0, w0, h0, slab, bias) {
      const sx = (slab % 3) * 32, sy = ((slab / 3) | 0) * 32;
      for (let y = 0; y < h0; y++) for (let x = 0; x < w0; x++) {
        const v = glyph.data[(sx + Math.floor((x * 32) / w0)) + (sy + Math.floor((y * 32) / Math.max(h0, 32)) % 32) * 96];
        const l = ((v & 255) + ((v >>> 8) & 255) + ((v >>> 16) & 255)) / 3;
        let i = l > 205 ? 4 : l > 180 ? 3 : l > 150 ? 2 : 1;
        i = K.clamp(i + (bias || 0), 1, 5);
        px(ctx, x0 + x, y0 + y, css(i));
      }
    }
    function block(x, y, bw, bh, base) {
      rect(ctx, x, y, bw, bh, css(0));
      rect(ctx, x + 1, y + 1, bw - 2, bh - 2, css(base));
      rect(ctx, x + 1, y + 1, bw - 2, 1, css(Math.min(5, base + 1)));
      rect(ctx, x + 1, y + bh - 2, bw - 2, 1, css(Math.max(1, base - 1)));
    }
    // steps
    block(20, 134, 128, 8, 3);
    block(28, 128, 112, 7, 3);
    // pillars
    for (const x0 of [14, 124]) {
      rect(ctx, x0, 44, 30, 86, css(0));
      carved(x0 + 1, 45, 28, 84, x0 === 14 ? 3 : 5, 0);
      rect(ctx, x0 + 1, 45, 28, 2, css(4));
      rect(ctx, x0 + 1, 127, 28, 2, css(1));
      block(x0 - 3, 120, 36, 10, 2); // plinth
    }
    // doorway
    rect(ctx, 44, 46, 80, 84, css(0));
    for (let y = 47; y < 130; y++) {
      const g = Math.max(0, 1 - (y - 47) / 70);
      for (let x = 45; x < 123; x++) {
        const edge = Math.min(x - 45, 122 - x);
        const v = 8 + Math.max(0, 10 - edge) * 1.6 + g * 6;
        px(ctx, x, y, `rgb(${v | 0},${(v * 0.8) | 0},${(v * 1.25) | 0})`);
      }
    }
    // lintel
    rect(ctx, 6, 28, 156, 18, css(0));
    carved(7, 29, 154, 16, 1, 0);
    for (let x = 8; x < 160; x += 6) { px(ctx, x, 36, css(1)); px(ctx, x + 1, 35, css(1)); px(ctx, x + 2, 36, css(1)); px(ctx, x + 3, 37, css(1)); }
    rect(ctx, 7, 29, 154, 1, css(5));
    rect(ctx, 7, 44, 154, 1, css(1));
    // stepped crest with a carved mask
    block(28, 14, 112, 15, 3);
    block(50, 2, 68, 13, 3);
    carved(29, 15, 110, 13, 4, 0);
    // the crest mask: the same carved Kū face as the tikis, cut in the temple's grey stone, with
    // eyes of amber that seem to burn from inside
    for (let y = 0; y < 30; y++) for (let x = 62; x < 106; x++) {
      const dx = x + 0.5 - 84;
      if (y < 6) {                                                         // a fanned crest above the face
        const hw = 13 + y * 1.4; if (Math.abs(dx) > hw) continue;
        px(ctx, x, y, Math.abs(dx) > hw - 1 || y === 0 ? css(0) : css(Math.round(dx / 2.2) & 1 ? (dx < 0 ? 5 : 4) : 2));
        continue;
      }
      const hw = 20 - (y > 26 ? (y - 26) * 2 : 0); if (Math.abs(dx) > hw) continue;
      if (Math.abs(dx) > hw - 1) { px(ctx, x, y, css(0)); continue; }
      const m = kuFace(dx / 19, (y - 6) / 23), lit = -dx / 19 * 0.8 + 0.2;
      let c;
      if (m === 3) c = "#f0a030"; else if (m === 4) c = "#ffe27a"; else if (m === 5) c = css(5); else if (m === 6) c = "#a8402c"; else if (m === 7) c = css(0);
      else { let i = lit > 0.45 ? 4 : lit > 0 ? 3 : lit > -0.4 ? 2 : 1; if (m === 1) i += 1; if (m === 2) i -= 1; c = css(Math.max(0, Math.min(5, i))); }
      px(ctx, x, y, c);
    }
    // moss & vines
    const r = K.rng(77);
    for (let k = 0; k < 140; k++) {
      const x = (r() * w) | 0, y = (r() * 130) | 0;
      const d = ctx.getImageData(x, y, 1, 1).data;
      if (d[3] && !(x > 44 && x < 124 && y > 46)) px(ctx, x, y, r() > 0.5 ? "#3e8e3c" : "#5aae46");
    }
    for (const vx of [18, 40, 128, 150]) {
      let x = vx;
      for (let y = 28; y < 28 + 20 + ((r() * 30) | 0); y++) {
        x += r() > 0.75 ? (r() > 0.5 ? 1 : -1) : 0;
        px(ctx, x, y, "#2e7a34");
        if (r() > 0.7) px(ctx, x + 1, y, "#58b048");
      }
    }
    return c;
  }

  // Grass tuft: procedural blades, pre-rendered at several lean angles for wind.
  function makeTuft(seed) {
    const r = K.rng(seed);
    const w = 11, h = 9;
    const frames = [];
    const blades = [];
    const n = 4 + ((r() * 3) | 0);
    for (let k = 0; k < n; k++) blades.push({ x: 2 + ((r() * (w - 4)) | 0), h: 4 + ((r() * 5) | 0), lean: r() * 2 - 1 });
    const cols = ["#145a26", "#2a8432", "#5cbc42", "#9ee060"];
    for (let f = -2; f <= 2; f++) {
      const [c, ctx] = K.canvas(w + 4, h);
      for (const b of blades) {
        for (let y = 0; y < b.h; y++) {
          const u = y / b.h;
          const x = Math.round(b.x + 2 + b.lean * u * 2 + f * u * u * 1.5);
          px(ctx, x, h - 1 - y, cols[Math.min(3, (u * 4) | 0)]);
        }
      }
      frames.push(c);
    }
    return frames;
  }
  const FLOWER_MAPS = {
    hib: { rows: [".r.r.", "rrRrr", ".RyR.", "rrRrr", ".r.r."], pal: { r: [232, 58, 48], R: [176, 30, 36], y: [252, 220, 90] } },
    plu: { rows: [".w.w.", "wwwww", ".wyw.", "wwwww", ".w.w."], pal: { w: [252, 248, 236], y: [250, 200, 70] } },
    ili: { rows: [".y.", "yoy", ".y."], pal: { y: [250, 196, 60], o: [226, 120, 40] } },
  };
  function makeFlower(kind) {
    const m = FLOWER_MAPS[kind];
    const w = m.rows[0].length, h = m.rows.length;
    const frames = [];
    for (let f = -1; f <= 1; f++) {
      const [c, ctx] = K.canvas(w + 2, h + 3);
      // stem
      rect(ctx, 1 + (w >> 1), h, 1, 3, "#2a7a30");
      K.pixmap(ctx, m.rows, m.pal, 1 + f, 0, false, w);
      frames.push(c);
    }
    return frames;
  }
  const CRAB = [
    ["o.......o", "oo.....oo", ".orrrrro.", "orRrrrRro", ".o.o.o.o.", "........."],
    ["o.......o", ".oo...oo.", ".orrrrro.", "orRrrrRro", "o.o...o.o", "........."],
  ];
  const CRAB_PAL = { o: [120, 30, 20], r: [228, 92, 56], R: [24, 16, 16] };
  function makeCrab() {
    return CRAB.map((rows) => { const [c, ctx] = K.canvas(9, 6); K.pixmap(ctx, rows, CRAB_PAL, 0, 0, false, 9); return c; });
  }
  function makeButterfly(col) {
    const f = [];
    for (const rows of [["oo.oo", "oobooo".slice(0, 5), ".o.o."], [".o.o.", ".obo.", "....."]]) {
      const [c, ctx] = K.canvas(5, 3);
      K.pixmap(ctx, rows, { o: col, b: [30, 20, 20] }, 0, 0, false, 5);
      f.push(c);
    }
    return f;
  }

  // shared with the sanctum and highlands, so new areas reuse the island's exact art
  Props.make = { tiki: () => makeTiki(), boulder: (w, h, seed, mossy) => makeBoulder(w, h, seed, mossy), tuft: (seed) => makeTuft(seed), flower: (kind) => makeFlower(kind) };

  // --------------------------------------------------------------- object kinds
  // Each object: {x, y (ground/sort line), draw(ctx, ox, oy, t), shadow?(), box?:[x0,y0,x1,y1]}
  const NLV = 7, NFL = 4; // wind levels x leaf-flutter phases (see tools/build_assets.py wind_frames)
  let A_ = null;
  // a wind-frame strip from the build: original sprite, polished, pre-bent for each wind level
  function strip(name) {
    const m = A_.meta[name];
    return { img: A_.img[name], fw: m.fw, fh: m.fh, ax: m.px, ay: m.py - 2, px: m.px, py: m.py };
  }
  function dimImg(img, f) {
    const [c, ctx] = K.canvas(img.width, img.height);
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height);
    for (let i = 0; i < d.data.length; i += 4) { d.data[i] *= f; d.data[i + 1] *= f * 1.02; d.data[i + 2] *= f * 1.06; }
    ctx.putImageData(d, 0, 0);
    return c;
  }

  // bitmap sprite (from docs/ art) that bends downwind; quivers in strong gusts
  function spriteObj(img, x, y, opt) {
    opt = opt || {};
    const bend = opt.sway ? Props.bendFrames(img, opt.sway, NLV) : null;
    const stiff = opt.stiff || 16;
    const o = {
      x, y, img, w: img.width, h: img.height,
      ax: opt.ax === undefined ? img.width / 2 : opt.ax, ay: opt.ay === undefined ? img.height : opt.ay,
      sh: opt.shadow,
      draw(ctx, ox, oy, t) {
        const dx = Math.round(this.x - this.ax - ox), dy = Math.round(this.y - this.ay - oy);
        if (bend) {
          const s = K.sway(this, t, this.x, this.y, stiff, NLV, 1);
          ctx.drawImage(bend.frames[s.level], dx - bend.pad, dy);
        } else ctx.drawImage(this.img, dx, dy);
      },
    };
    if (opt.shadow) o.shadow = function (ctx, ox, oy) { Props.drawShadow(ctx, this.x - ox, this.y - oy - 1, this.sh[0], this.sh[1], this.sh[2]); };
    if (opt.box) o.box = [x + opt.box[0], y + opt.box[1], x + opt.box[2], y + opt.box[3]];
    return o;
  }

  // plant drawn from a wind-frame strip: bends downwind, leaves flutter individually
  function plantObj(P, x, y, opt) {
    opt = opt || {};
    const stiff = opt.stiff || 14;
    const o = {
      x, y,
      draw(ctx, ox, oy, t) {
        const s = K.sway(this, t, x, y, stiff, NLV, NFL);
        const f = s.level * NFL + s.flutter;
        ctx.drawImage(P.img, f * P.fw, 0, P.fw, P.fh, Math.round(x - P.ax - ox), Math.round(y - P.ay - oy), P.fw, P.fh);
      },
    };
    if (opt.shadow) o.shadow = (ctx, ox, oy) => Props.drawShadow(ctx, x - ox, y - oy - 1, opt.shadow[0], opt.shadow[1], opt.shadow[2]);
    if (opt.box) o.box = [x + opt.box[0], y + opt.box[1], x + opt.box[2], y + opt.box[3]];
    return o;
  }

  let CROWN_POOL = [], DIM_POOL = {}; const TRUNKS = {};
  function palmObj(x, y, r, opt) {
    opt = opt || {};
    const dim = opt.dim || 1;
    const pool = dim < 1 ? DIM_POOL[dim] : CROWN_POOL;
    const crown = pool[(r() * pool.length) | 0];
    const th = Math.round(opt.height || 42 + r() * 28);
    const lean = Math.round((r() * 2 - 1) * (opt.lean === undefined ? 10 : opt.lean));
    const tkey = th + ":" + lean + ":" + dim;
    const cached = TRUNKS[tkey] || (TRUNKS[tkey] = (() => {
      // the original grove trunk, bent into this palm's lean (it is stiff; the crown moves)
      const src = A_.img.trunk_a, tw = src.width, pad = Math.abs(lean) + 2;
      const [tc, tctx] = K.canvas(tw + pad * 2, th);
      for (let r2 = 0; r2 < th; r2++) {
        const u = 1 - r2 / th;
        tctx.drawImage(src, 0, src.height - th + r2, tw, 1, pad + Math.round(lean * Math.pow(u, 1.8)), r2, tw, 1);
      }
      return { tr: { pad: pad + (tw >> 1) }, img: dim < 1 ? dimImg(tc, dim) : tc };
    })());
    const trunk = cached.tr, timg = cached.img;
    const o = {
      x, y, box: opt.noBox ? undefined : [x - 4, y - 4, x + 4, y + 1],
      draw(ctx, ox, oy, t) {
        const bx = Math.round(x - ox), by = Math.round(y - oy);
        ctx.drawImage(timg, bx - trunk.pad, by - th);
        const s = K.sway(this, t, x, y, 6, NLV, NFL);
        const f = s.level * NFL + s.flutter;
        ctx.drawImage(crown.img, f * crown.fw, 0, crown.fw, crown.fh, bx + lean - crown.px, by - th + 2 - crown.py, crown.fw, crown.fh);
      },
      shadow: opt.noShadow ? undefined : function (ctx, ox, oy) {
        Props.drawShadow(ctx, x - ox + lean * 0.7 + 10, y - oy + 3, crown.fw * 0.3, 6, 0.15);
        Props.drawShadow(ctx, x - ox, y - oy, 6, 2, 0.3);
      },
    };
    return o;
  }

  // --------------------------------------------------------------- placement
  Props.build = function (A) {
    const W = World.W, H = World.H;
    const objs = [];
    const r = K.rng(20261126);
    const taken = [];
    const keepOut = [];
    const P = World.PLAZA;
    const roadY = World.PATH_Y * T + T;
    keepOut.push([10 * T, roadY - 36, 60 * T, roadY + 36]);
    keepOut.push([(P.x - 1) * T, (P.y - 1) * T, (P.x + P.w + 1) * T, (P.y + P.h + 1) * T + 40]);
    keepOut.push([World.START.x - 40, World.START.y - 40, World.START.x + 40, World.START.y + 30]);
    for (const b of World.bridges) keepOut.push([b.x0 - 30, b.y - 40, b.x1 + 30, b.y + 40]);

    const inKeepOut = (x, y, pad) => keepOut.some((k) => x > k[0] - pad && x < k[2] + pad && y > k[1] - pad && y < k[3] + pad);
    const free = (x, y, rad) => taken.every((t) => (t[0] - x) ** 2 + (t[1] - y) ** 2 > (t[2] + rad) ** 2);
    const terr = (x, y) => World.terrAt(x, y);
    const landDist = (x, y) => World.landDist[(y | 0) * W + (x | 0)];
    function scatter(n, rad, ok, make, tries) {
      let placed = 0;
      for (let k = 0; k < (tries || n * 40) && placed < n; k++) {
        const x = 40 + r() * (W - 80), y = 40 + r() * (H - 80);
        if (!ok(x, y) || inKeepOut(x, y, rad) || !free(x, y, rad)) continue;
        if (landDist(x, y) < rad * 1.3 || landDist(x, Math.max(0, y - rad)) < rad) continue; // never over the river or sea
        taken.push([x, y, rad]);
        const o = make(x | 0, y | 0);
        if (Array.isArray(o)) objs.push(...o); else objs.push(o);
        placed++;
      }
    }
    const isLand = (t) => t === World.SAND || t === World.GRASS;
    const footOk = (x, y, hw) => isLand(terr(x - hw, y)) && isLand(terr(x + hw, y)) && isLand(terr(x, y - 6)) && isLand(terr(x, y + 4));

    // ---- generated plant variants
    A_ = A;
    CROWN_POOL = ["crown_a", "crown_a_f", "crown_d", "crown_d_f"].map(strip);
    for (const d of [0.86, 0.72, 0.55]) DIM_POOL[d] = CROWN_POOL.map((c) => Object.assign({}, c, { img: dimImg(c.img, d) }));
    const TAROS = ["plant_taro_a", "plant_taro_a_f"].map(strip);
    const TARO_PATCH = ["flora_taro", "flora_taro_f"].map(strip);
    const BUSHES = { hibiscus: ["bush_hibiscus", "bush_hibiscus_f"].map(strip) };
    const GROVES = ["tree_grove", "tree_grove_f"].map(strip);

    // ---- temple gate
    const tpl = makeTemple(A);
    const TX = World.TEMPLE.x, TY = World.TEMPLE.y;
    objs.push({ x: TX, y: TY - 16, kind: "temple", box: [TX - 84, TY - 40, TX - 40, TY - 2],
      draw(ctx, ox, oy, t) {
        ctx.drawImage(tpl, Math.round(TX - tpl.width / 2 - ox), Math.round(TY - tpl.height - oy + 8));
        for (const sx of [-52, 52]) {
          const fx = Math.round(TX + sx - ox), fy = Math.round(TY - 66 - oy);
          ctx.fillStyle = "#2a1810"; ctx.fillRect(fx - 1, fy, 3, 10);
          ctx.fillStyle = "#5a3a20"; ctx.fillRect(fx - 2, fy, 5, 2);
          const f = ((Math.floor(t * 7 + sx) % 3) + 3) % 3;
          const fl = [["..y..", ".yoy.", ".ooo.", "..r.."], [".y...", ".oyy.", ".ooo.", "..r.."], ["...y.", ".yyo.", ".ooo.", "..r.."]][f];
          K.pixmap(ctx, fl, { y: [255, 240, 150], o: [250, 150, 40], r: [210, 70, 30] }, fx - 2, fy - 5, false, 5);
        }
      },
    });
    objs.push({ x: TX + 62, y: TY - 4, box: [TX + 40, TY - 40, TX + 84, TY - 2], draw() {} });
    objs.push({ x: TX, y: TY - 30, box: [TX - 40, TY - 36, TX + 40, TY - 18], draw() {} });
    taken.push([TX, TY - 40, 100]);
    World.templeDoor = { x: TX, y: TY - 8 };

    const tikiImg = makeTiki();
    const cx = (P.x + P.w / 2) * T;
    for (const [tx, ty] of [[P.x * T + 4, P.y * T + 22], [(P.x + P.w) * T - 4, P.y * T + 22], [cx - 44, (P.y + P.h) * T + 40], [cx + 44, (P.y + P.h) * T + 40]]) {
      objs.push(spriteObj(tikiImg, tx, ty, { box: [-6, -5, 6, 1], shadow: [8, 3, 0.3] }));
      taken.push([tx, ty, 14]);
    }

    // ---- sea-cave mouth in the south-east lava outcrop (glows from the pool inside)
    {
      const M = World.caveMouth, mx = M.x, my = M.y;
      const w = 48, h = 40;
      const [fc, fx] = K.canvas(w, h);
      const R = ["#16121e", "#2a2438", "#433a56", "#5e5474", "#7a6e92"];
      const inner = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - w / 2) / (w / 2), dy = (h - y - 0.5) / h;          // dy: 0 at ground, 1 at top
        const outerR = dx * dx + Math.pow(Math.max(0, dy) / 0.92, 2.2);
        const ix = (x + 0.5 - w / 2) / 13.5, iy = (h - y - 0.5) / 27;
        const innerR = ix * ix + Math.pow(Math.max(0, iy), 2.4);
        if (innerR < 1) { inner.push([x, y]); continue; }
        if (outerR > 1) continue;
        const edge = innerR < 1.25 || outerR > 0.82;
        const n = K.noise(x * 0.35 + 9, y * 0.35);
        let c = R[2];
        if (edge) c = R[0];
        else if (dx < -0.2 && n > 0.45) c = R[3];
        else if (n > 0.7) c = R[4];
        else if (n < 0.3) c = R[1];
        fx.fillStyle = c; fx.fillRect(x, y, 1, 1);
      }
      // stalactite teeth hanging over the opening
      fx.fillStyle = R[0];
      for (const [tx, th] of [[17, 4], [21, 6], [26, 3], [30, 5]]) for (let k = 0; k < th; k++) fx.fillRect(tx + (k > th - 2 ? 0 : 0), 13 + k, Math.max(1, 2 - (k >> 1)), 1);
      objs.push({ x: mx, y: my, kind: "caveMouth",
        draw(ctx, ox, oy, t) {
          const bx = Math.round(mx - w / 2 - ox), by = Math.round(my - h - oy);
          const g = 0.55 + 0.45 * Math.sin(t * 1.3);
          for (const [x, y] of inner) {
            const depth = (h - y) / 27;                  // 0 at the floor of the opening
            const shimmer = 0.5 + 0.5 * Math.sin(t * 2 + x * 0.6 + y * 0.3);
            const glow = Math.max(0, 1 - depth * 1.3) * g * (0.7 + 0.3 * shimmer);
            const r = (4 + 36 * glow) | 0, gg = (8 + 150 * glow) | 0, b = (18 + 190 * glow) | 0;
            ctx.fillStyle = `rgb(${r},${gg},${b})`; ctx.fillRect(bx + x, by + y, 1, 1);
          }
          ctx.drawImage(fc, bx, by);
          // light spilling onto the ground + motes drifting out
          ctx.globalCompositeOperation = "lighter";
          ctx.fillStyle = `rgba(40,150,190,${0.12 * g})`;
          for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(mx - ox, my - oy + 3, 22 - k * 6, 6 - k * 1.5, 0, 0, Math.PI * 2); ctx.fill(); }
          for (let k = 0; k < 6; k++) {
            const ph = (t * 0.25 + k / 6) % 1;
            const x = mx - ox + Math.sin(k * 2.3 + t * 0.7) * 10 + (k - 3) * 2, y = my - oy - 4 - ph * 34;
            ctx.fillStyle = `rgba(120,230,255,${(1 - ph) * 0.8})`; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
          }
          ctx.globalCompositeOperation = "source-over";
        },
      });
      keepOut.push([mx - 50, my - 50, mx + 50, my + 40]);
      taken.push([mx, my - 10, 40]);
    }

    // ---- Hale Koa: the warriors' training hut (A-frame thatch over woven walls, kapa-curtained door)
    {
      const hx = 47.5 * T, hy = 28 * T, w = 112, h = 96;
      const [hc, c] = K.canvas(w, h);
      const R = (col, x, y, ww, hh) => { c.fillStyle = col; c.fillRect(x, y, ww, hh); };
      const wallTop = 50, doorW = 20, doorH = 30, dx0 = w / 2 - doorW / 2;
      // walls: woven lauhala between koa corner posts
      for (let y = wallTop; y < h - 2; y++) for (let x = 10; x < w - 10; x++) {
        const d = ((x + y) >> 2) & 1, e = ((x - y + 300) >> 2) & 1;
        let col = d ^ e ? "#b89050" : "#a07a44";
        if (((x + y) & 3) === 0 || ((x - y + 300) & 3) === 0) col = "#6e5030";
        c.fillStyle = col; c.fillRect(x, y, 1, 1);
      }
      R("#1e100a", 9, wallTop, 1, h - wallTop - 2); R("#1e100a", w - 10, wallTop, 1, h - wallTop - 2); R("#1e100a", 9, h - 3, w - 18, 2);
      for (const x of [10, w - 16]) { R("#1e100a", x, wallTop - 2, 6, h - wallTop); R("#7a4628", x + 1, wallTop - 2, 4, h - wallTop - 1); R("#a06a3a", x + 1, wallTop - 2, 1, h - wallTop - 1); }
      // doorway with a red kapa curtain tied back
      R("#1e100a", dx0 - 2, h - doorH - 4, doorW + 4, doorH + 2);
      R("#120806", dx0, h - doorH - 2, doorW, doorH);
      for (let y = 0; y < doorH; y++) { const cw = Math.max(1, Math.round(6 - y * 0.12)); R("#8a2a1a", dx0, h - doorH - 2 + y, cw, 1); R("#8a2a1a", dx0 + doorW - cw, h - doorH - 2 + y, cw, 1); if (y % 5 === 0) { R("#e8d8b8", dx0 + 1, h - doorH - 2 + y, 1, 1); R("#e8d8b8", dx0 + doorW - 2, h - doorH - 2 + y, 1, 1); } }
      R("#d8c890", dx0, h - doorH + 12, 4, 2); R("#d8c890", dx0 + doorW - 4, h - doorH + 12, 4, 2);
      // A-frame thatched roof
      const straw = ["#5a3c14", "#a2742e", "#c89a46", "#e2bc66", "#f4d888"];
      for (let y = 0; y < wallTop + 6; y++) {
        const half = Math.round(4 + (y / (wallTop + 6)) * (w / 2 - 2));
        for (let x = w / 2 - half; x < w / 2 + half; x++) {
          const strand = (K.hash2(x, Math.floor(y / 3), 77) * 3) | 0, shade = x > w / 2 ? 1 : 0;
          let col = straw[2 + (strand === 2 ? 1 : 0) - shade];
          if ((x + Math.floor(y / 2)) % 5 === 0) col = straw[1];
          if (y % 7 === 6) col = straw[1];
          if (x === Math.round(w / 2 - half) || x === Math.round(w / 2 + half) - 1) col = straw[0];
          c.fillStyle = col; c.fillRect(x, y, 1, 1);
        }
      }
      for (let x = 0; x < w; x++) { const len = 1 + ((K.hash2(x, 5, 88) * 4) | 0); for (let y = wallTop + 6; y < wallTop + 6 + len; y++) if (x > 1 && x < w - 2) R(y === wallTop + 5 + len ? straw[0] : straw[x % 3 ? 2 : 1], x, y, 1, 1); }
      R("#2a160c", w / 2 - 3, 0, 6, 4); R("#5a3a20", w / 2 - 2, 1, 4, 2);                       // ridge cap
      // crossed spears over the door
      c.strokeStyle = "#1e100a"; c.lineWidth = 2; c.beginPath(); c.moveTo(w / 2 - 16, wallTop + 18); c.lineTo(w / 2 + 16, wallTop + 2); c.moveTo(w / 2 + 16, wallTop + 18); c.lineTo(w / 2 - 16, wallTop + 2); c.stroke();
      c.strokeStyle = "#b07a40"; c.lineWidth = 1; c.beginPath(); c.moveTo(w / 2 - 15, wallTop + 17); c.lineTo(w / 2 + 15, wallTop + 3); c.moveTo(w / 2 + 15, wallTop + 17); c.lineTo(w / 2 - 15, wallTop + 3); c.stroke();
      for (const sx of [-1, 1]) { R("#1e100a", w / 2 + 15 * sx - 2, wallTop + 1, 4, 3); R("#d8dce8", w / 2 + 15 * sx - 1, wallTop + 1, 2, 2); }
      R("#e8d8b8", w / 2 - 3, wallTop + 8, 6, 4); R("#8a2a1a", w / 2 - 2, wallTop + 9, 4, 2);    // kapa medallion
      const door = { x: hx, y: hy };
      World.hutDoor = door;
      objs.push({ x: hx, y: hy, kind: "hut", draw(ctx, ox, oy, t) {
        ctx.drawImage(hc, Math.round(hx - w / 2 - ox), Math.round(hy - h - oy + 1));
        for (const sx of [-46, 46]) {   // tiki torches
          const fx = Math.round(hx + sx - ox), fy = Math.round(hy - 30 - oy);
          ctx.fillStyle = "#1e100a"; ctx.fillRect(fx - 1, fy, 3, 28); ctx.fillStyle = "#7a4628"; ctx.fillRect(fx, fy, 1, 28);
          ctx.fillStyle = "#3a2214"; ctx.fillRect(fx - 2, fy - 1, 5, 3);
          const f = ((Math.floor(t * 8 + sx) % 3) + 3) % 3;
          K.pixmap(ctx, [["..y..", ".yoy.", "yoooy", ".oro.", "..r.."], [".y...", ".yoy.", ".ooo.", "yoroy", "..r.."], ["...y.", ".yoy.", "yooo.", ".oro.", "..r.."]][f], { y: [255, 240, 150], o: [250, 150, 40], r: [210, 70, 30] }, fx - 2, fy - 6, false, 5);
        }
      }, shadow(ctx, ox, oy) { Props.drawShadow(ctx, hx - ox, hy - oy, 58, 6, 0.25); } });
      // walls are solid; the doorway (centre) is open so you can walk in
      objs.push({ x: hx - 30, y: hy - 2, box: [hx - 56, hy - 40, hx - doorW / 2 - 1, hy], draw() {} });
      objs.push({ x: hx + 30, y: hy - 2, box: [hx + doorW / 2 + 1, hy - 40, hx + 56, hy], draw() {} });
      objs.push({ x: hx, y: hy - 30, box: [hx - 12, hy - 44, hx + 12, hy - 26], draw() {} });
      keepOut.push([hx - 80, hy - 110, hx + 80, hy + 40]);
      taken.push([hx, hy - 30, 70]);
    }

    // ---- market stalls + merchants
    World.npcs = [];
    const stalls = [[37 * T, 15 * T + 8, 0, "Makani", ["Aloha, traveller! Fresh fruit and potions.", "The old temple woke up when the sun stones glowed...", "Come back when you have shells to trade!"]],
                    [38 * T, 26 * T + 8, 1, "Leilani", ["E komo mai! Welcome to Kuleana.", "Mind the lava rocks to the east, they bite.", "They say the tide carries treasure at dusk."]]];
    for (const [sx, sy, v, name, lines] of stalls) {
      const img = makeStall(sx * 7 + sy, v);
      objs.push(spriteObj(img, sx, sy, { box: [-36, -16, 36, 0], shadow: [38, 5, 0.25] }));
      taken.push([sx, sy - 10, 52]);
      keepOut.push([sx - 50, sy - 70, sx + 50, sy + 40]);
      const npc = { x: sx - 46, y: sy + 4, name, lines, kind: "npc", phase: r() * 5, box: [sx - 52, sy - 2, sx - 40, sy + 4] };
      World.npcs.push(npc);
      objs.push(npc);
    }

    // ---- jungle wall: rows of palms, darker further back, with undergrowth along the edge
    const boundary = (x) => { let y = 100; while (y < 340 && terr(x, y) === World.JUNGLE) y++; return y; };
    Props.canopy = [];
    for (let row = 7; row >= 0; row--) {
      for (let x = -24 + (row % 2) * 12; x < W + 24; x += 22 + ((r() * 10) | 0)) {
        const y = boundary(x) - 8 - row * 21 - ((r() * 8) | 0);
        if (y < -8) continue;
        if (y >= 0 && (World.terrAt(x, y) === World.WATER || landDist(x, Math.max(0, y)) < 16)) continue; // leave the river open
        const dim = row >= 4 ? 0.55 : row >= 2 ? 0.72 : row >= 1 ? 0.86 : 1;
        objs.push(palmObj(x, y, r, { height: 30 + ((r() * 12) | 0) * 3, lean: 6, dim, noBox: true, noShadow: row > 0 }));
      }
    }
    const under = ["flora_fern", "flora_monstera", "flora_fern"];
    for (let x = -20; x < W + 30; x += 34 + ((r() * 18) | 0)) {
      const y = boundary(x) + 4 + ((r() * 6) | 0);
      if (y >= H || landDist(Math.max(0, x), y) < 36 || World.terrAt(x, y) === World.WATER) continue;
      if (r() < 0.25) { objs.push(plantObj(TARO_PATCH[(r() * 2) | 0], x, y, { stiff: 10, box: [-28, -12, 28, 0] })); taken.push([x, y - 8, 30]); continue; }
      const n = under[(r() * under.length) | 0], img = r() < 0.5 ? A.img[n] : A.flip[n];
      objs.push(spriteObj(img, x, y, { sway: 3, stiff: 12, ay: img.height - 4, box: [-30, -14, 30, 0] }));
      taken.push([x, y - 8, 30]);
    }

    // ---- palm groves (clusters of palms) and single palms
    for (const [gx, gy, f] of [[12.5 * T, 13 * T, 0], [44 * T, 40 * T, 1], [31 * T, 9 * T, 1], [18 * T, 41.5 * T, 0]]) {
      objs.push(plantObj(GROVES[f], gx, gy, { stiff: 7, shadow: [42, 7, 0.2], box: [-34, -10, 34, 0] }));
      taken.push([gx, gy - 20, 50]);
    }
    scatter(30, 18, (x, y) => terr(x, y) === World.SAND && landDist(x, y) > 14 && footOk(x, y, 6), (x, y) => palmObj(x, y, r));
    scatter(24, 20, (x, y) => terr(x, y) === World.GRASS && footOk(x, y, 6) && y > 7 * T, (x, y) => palmObj(x, y, r));

    // ---- flowering bushes (plumeria / hibiscus)
    const bush = (x, y) => {
      const kind = "hibiscus";
      return plantObj(BUSHES[kind][(r() * 2) | 0], x, y, { stiff: 20, box: [-26, -14, 26, 0], shadow: [30, 6, 0.25] });
    };
    scatter(26, 34, (x, y) => footOk(x, y, 26) && y > 7 * T, bush);
    for (let k = 0; k < 10; k++) {
      const x0 = 40 + r() * (W - 80), y0 = 7 * T + r() * (H - 9 * T);
      for (let j = 0; j < 3; j++) {
        const x = x0 + j * 50 + r() * 6, y = y0 + r() * 8;
        if (terr(x, y) === World.GRASS && footOk(x, y, 26) && landDist(x, y) > 36 && !inKeepOut(x, y, 30) && free(x, y, 26)) { taken.push([x, y, 26]); objs.push(bush(x | 0, y | 0)); }
      }
    }

    // ---- taro clumps, ferns and monstera near the jungle, rocks and river
    const thickets = ["flora_fern", "flora_monstera"];
    const thicket = (x, y) => { const n = thickets[(r() * 2) | 0], img = r() < 0.5 ? A.img[n] : A.flip[n];
      return spriteObj(img, x, y, { sway: 3.5, stiff: 12, ay: img.height - 4, box: [-28, -12, 28, 0], shadow: [32, 5, 0.2] }); };
    const taro = (x, y) => plantObj(TAROS[(r() * 2) | 0], x, y, { stiff: 9, box: [-10, -6, 10, 0], shadow: [13, 3, 0.22] });
    scatter(6, 30, (x, y) => terr(x, y) === World.GRASS && footOk(x, y, 26) && y > 8 * T, (x, y) => plantObj(TARO_PATCH[(r() * 2) | 0], x, y, { stiff: 10, box: [-28, -12, 28, 0], shadow: [32, 5, 0.2] }));
    scatter(12, 32, (x, y) => terr(x, y) === World.GRASS && y < 10 * T && footOk(x, y, 26), thicket);
    scatter(10, 30, (x, y) => terr(x, y) === World.GRASS && footOk(x, y, 26) && (World.terrAt(x + 44, y) === World.ROCK || World.terrAt(x, y - 40) === World.ROCK), thicket, 5000);
    scatter(6, 30, (x, y) => terr(x, y) === World.GRASS && footOk(x, y, 26) && y > 8 * T, thicket);
    scatter(14, 22, (x, y) => terr(x, y) === World.GRASS && footOk(x, y, 12) && y > 7 * T, (x, y) => [taro(x, y), taro(x + 14 + ((r() * 6) | 0), y + 3)]);
    scatter(12, 16, (x, y) => terr(x, y) === World.GRASS && footOk(x, y, 10) && y > 7 * T, taro);
    scatter(10, 16, (x, y) => terr(x, y) === World.GRASS && footOk(x, y, 10) && y > 7 * T, (x, y) => {
      const img = r() < 0.5 ? A.img.plant_monstera_a : A.flip.plant_monstera_a;
      return spriteObj(img, x, y, { sway: 3, stiff: 15, ay: img.height - 2, box: [-9, -6, 9, 0], shadow: [13, 3, 0.22] });
    });

    // ---- lava boulders
    const boulder = (x, y, s) => {
      const w = [14, 20, 28, 36][s], h = [10, 15, 21, 27][s];
      const img = makeBoulder(w, h, (x * 31 + y) | 0, r() < 0.5);
      return spriteObj(img, x, y, { ay: img.height - 3, box: [-w * 0.42, -h * 0.35, w * 0.42, 0], shadow: [w * 0.5, 3, 0.3] });
    };
    scatter(16, 16, (x, y) => footOk(x, y, 10) && (World.terrAt(x + 20, y) === World.ROCK || World.terrAt(x, y - 18) === World.ROCK), (x, y) => boulder(x, y, (r() * 4) | 0), 6000);
    for (const [bx, by, s] of [[33.2 * T, 27.4 * T, 3], [32.3 * T, 28.1 * T, 1], [34.3 * T, 28.4 * T, 0]]) { objs.push(boulder(bx | 0, by | 0, s)); taken.push([bx, by, 18]); }
    scatter(9, 12, (x, y) => terr(x, y) === World.SAND && landDist(x, y) > 6 && landDist(x, y) < 26 && footOk(x, y, 8), (x, y) => boulder(x, y, (r() * 2) | 0), 6000);

    // ---- grass tufts & tiny flowers (bend with the wind)
    const tufts = []; for (let k = 0; k < 8; k++) tufts.push(Props.bendFrames(makeTuft(900 + k)[2], 2.6, NLV));
    const flowers = ["hib", "plu", "ili"].map((k) => Props.bendFrames(makeFlower(k)[1], 1.6, NLV));
    function tinyObj(B, x, y) {
      const fw = B.frames[0].width, fh = B.frames[0].height;
      return { x, y, tiny: true, draw(ctx, ox, oy, t) {
        const s = K.sway(this, t, x, y, 30, NLV, 1);
        ctx.drawImage(B.frames[s.level], Math.round(x - fw / 2 - ox), Math.round(y - fh - oy));
      } };
    }
    for (let k = 0; k < 1800; k++) {
      const x = 20 + r() * (W - 40), y = 20 + r() * (H - 40);
      if (terr(x, y) !== World.GRASS || inKeepOut(x, y, -20)) continue;
      if (K.fbm(x / 120, y / 120, 2) < 0.4) continue;
      if (r() < 0.3) objs.push(tinyObj(flowers[r() < 0.45 ? 0 : r() < 0.6 ? 1 : 2], x | 0, y | 0));
      else objs.push(tinyObj(tufts[(r() * tufts.length) | 0], x | 0, y | 0));
    }
    for (let k = 0; k < 220; k++) {
      const x = 20 + r() * (W - 40), y = 20 + r() * (H - 40);
      if (terr(x, y) === World.SAND && World.terrAt(x, y - 8) === World.GRASS) objs.push(tinyObj(tufts[(r() * tufts.length) | 0], x | 0, y | 0));
    }

    Props.objects = objs;
    Props.colliders = objs.filter((o) => o.box).map((o) => o.box);

    // ---- critters
    Props.crabFrames = makeCrab();
    Props.butterflyFrames = [makeButterfly([250, 150, 40]), makeButterfly([90, 170, 250]), makeButterfly([250, 240, 240])];
    Props.critters = [];
    for (let k = 0; k < 60 && Props.critters.length < 6; k++) {
      const x = r() * W, y = r() * H;
      if (terr(x, y) === World.SAND && landDist(x, y) > 6 && landDist(x, y) < 50) Props.critters.push({ kind: "crab", x, y, vx: 0, timer: r() * 3, frame: 0 });
    }
    for (let k = 0; k < 9; k++) {
      let x = 0, y = 0;
      for (let tries = 0; tries < 200; tries++) { x = r() * W; y = r() * H; if (terr(x, y) === World.GRASS && y > 8 * T) break; }
      Props.critters.push({ kind: "fly", x, y, hx: x, hy: y, a: r() * 6, sp: 12 + r() * 8, col: k % 3, z: 7 + r() * 6, seed: r() * 100 });
    }
  };
})();
