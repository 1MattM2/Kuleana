// Per-pixel animated water for the visible screen area.
// Depth = distance from shore (baked in World). Colours come from the source water tile,
// recoloured into turquoise bands near the shore like the shoreline tile in docs/.
// Motion is deliberately slow: two copies of the water pattern drift past each other
// (an evolving shimmer, not a sliding texture), swells roll in every few seconds, and the
// tide rushes up the sand and slowly drains back.
(function () {
  const pk = K.rgb;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);

  const RAMPS = {
    mid: [pk(10, 126, 152), pk(14, 142, 166), pk(24, 162, 180), pk(70, 196, 206)],
    shallow: [pk(18, 172, 182), pk(24, 190, 190), pk(46, 208, 198), pk(112, 230, 214)],
    vshallow: [pk(40, 202, 194), pk(66, 218, 200), pk(104, 232, 210), pk(164, 242, 226)],
    river: [pk(26, 176, 190), pk(32, 192, 198), pk(58, 210, 206), pk(128, 236, 222)],
    riverDeep: [pk(16, 144, 170), pk(22, 160, 182), pk(38, 180, 194), pk(92, 214, 214)],
    deep: null,
  };
  const FOAM = pk(250, 254, 252), FOAM2 = pk(204, 244, 238), CREST = pk(226, 250, 246), SPARK = pk(236, 252, 255);
  const SWASH = pk(96, 224, 208), SWASH2 = pk(150, 238, 222);

  let level, canvas, ctx, img, out, vwC = 0, vhC = 0, TS = 32, TM = 31;

  const Water = (window.Water = {});
  Water.init = function (A) {
    const tx = A.px.tex_water;
    TS = tx.w; TM = TS - 1;
    const tex = tx.data;
    const lum = Array.from(tex, (c) => (c & 255) * 0.3 + ((c >>> 8) & 255) * 0.59 + ((c >>> 16) & 255) * 0.11);
    const sorted = lum.slice().sort((a, b) => a - b);
    const q = [sorted[(sorted.length * 0.62) | 0], sorted[(sorted.length * 0.86) | 0], sorted[(sorted.length * 0.965) | 0]];
    level = new Uint8Array(tex.length);
    const sums = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
    for (let i = 0; i < tex.length; i++) {
      const l = lum[i] < q[0] ? 0 : lum[i] < q[1] ? 1 : lum[i] < q[2] ? 2 : 3;
      level[i] = l;
      const c = tex[i];
      sums[l][0] += c & 255; sums[l][1] += (c >>> 8) & 255; sums[l][2] += (c >>> 16) & 255; sums[l][3]++;
    }
    // deep-water tones are the source tile's own colours, averaged per brightness level
    RAMPS.deep = sums.map((s) => (s[3] ? pk((s[0] / s[3]) | 0, (s[1] / s[3]) | 0, (s[2] / s[3]) | 0) : pk(20, 110, 140)));
  };

  function ensure(vw, vh) {
    if (vw === vwC && vh === vhC) return;
    vwC = vw; vhC = vh;
    [canvas, ctx] = K.canvas(vw, vh);
    img = ctx.createImageData(vw, vh);
    out = new Uint32Array(img.data.buffer);
  }

  // asymmetric wave cycle: quick rush up the beach, slow drain back. Returns reach 0..1.
  let rushing = false;
  // the large slow noise the tide and the swells both follow, sampled once a frame on an 8px grid (it is
  // smooth at this scale; looking it up per pixel was a large share of the frame)
  let NZ = null, nzW = 0, nzX = 0, nzY = 0;
  function noiseGrid(camX, camY, vw, vh) {
    const gx0 = Math.floor(camX / 8) - 1, gy0 = Math.floor(camY / 8) - 1, gw = Math.ceil(vw / 8) + 3, gh = Math.ceil(vh / 8) + 3;
    if (!NZ || NZ.length < gw * gh) NZ = new Float32Array(gw * gh);
    nzW = gw; nzX = gx0; nzY = gy0;
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) NZ[j * gw + i] = K.noise((gx0 + i) * 8 * 0.012, (gy0 + j) * 8 * 0.012);
  }
  const nzAt = (wx, wy) => { const fx = wx / 8 - nzX, fy = wy / 8 - nzY, i = fx | 0, j = fy | 0, u = fx - i, v = fy - j, o = j * nzW + i; return (NZ[o] * (1 - u) + NZ[o + 1] * u) * (1 - v) + (NZ[o + nzW] * (1 - u) + NZ[o + nzW + 1] * u) * v; };
  function tideAt(t, wx, wy) {
    let ph = t * 0.12 + wx * 0.0032 + wy * 0.0024 + (NZ ? nzAt(wx, wy) : K.noise(wx * 0.012, wy * 0.012)) * 0.35;
    ph -= Math.floor(ph);
    rushing = ph < 0.33;
    return rushing ? Math.sin((ph / 0.33) * Math.PI * 0.5) : Math.cos(((ph - 0.33) / 0.67) * Math.PI * 0.5);
  }

  // Open ocean far from any shore (the title screen): the same water texture and shimmer as the
  // island's sea, in its deep tones, with slow trenches and shoals, long swells that sometimes break
  // into whitecaps, sparkles, and the shadows of sea life passing underneath.
  let patch = null, pw = 0, ph2 = 0;
  Water.renderDeep = function (dst, camX, camY, vw, vh, t) {
    ensure(vw, vh);
    const deep = RAMPS.deep, mid = RAMPS.mid, G = 4, gw = Math.ceil(vw / G) + 2, gh = Math.ceil(vh / G) + 2;
    if (!patch || pw !== gw || ph2 !== gh) { patch = new Float32Array(gw * gh); pw = gw; ph2 = gh; }
    const ox = Math.floor(camX / G), oy = Math.floor(camY / G);
    for (let gy = 0; gy < gh; gy++) for (let gx = 0; gx < gw; gx++) patch[gy * gw + gx] = K.fbm((ox + gx) * G / 260 + t * 0.012, (oy + gy) * G / 260, 3);
    const aX = t * 1.3, aY = t * 0.55, bX = -t * 0.9 + 13, bY = t * 0.75 + 7, sparkFrame = Math.floor(t * 2);
    Water._swim.tick(camX, camY, vw, vh, t); const swim = Water._swim.raster(camX, camY, vw, vh, t), SM = Water._swim.mask;
    for (let y = 0; y < vh; y++) {
      const wy = camY + y, row = y * vw, gy = ((wy >> 2) - oy) * gw;
      for (let x = 0; x < vw; x++) {
        const wx = camX + x;
        const la = level[(((wx + aX) | 0) & TM) + ((((wy + aY) | 0) & TM) * TS)];
        const lb = level[(TM - (((wx + bX) | 0) & TM)) + ((((wy + bY) | 0) & TM) * TS)];
        const lv = la > lb ? la : lb, dith = BAYER[(wx & 3) | ((wy & 3) << 2)];
        const pv = patch[gy + (wx >> 2) - ox] + dith * 0.08;
        let c = pv > 0.64 ? mid[lv] : pv < 0.36 ? deep[lv > 0 ? lv - 1 : 0] : deep[lv];
        // long swells rolling across, now and then cresting white
        const ph = (wx * 0.55 + wy) * 0.016 - t * 0.32 + K.noise(wx * 0.008, wy * 0.008) * 0.9;
        const f = ph - Math.floor(ph);
        if (f < 0.07) {
          const brk = K.noise(wx * 0.025 + t * 0.04, wy * 0.025);
          if (brk > 0.71) c = f < 0.03 ? CREST : RAMPS.vshallow[2];
          else if (brk > 0.5) c = mid[lv < 3 ? lv + 1 : 3];
        }
        if (lv >= 2 && K.hash2(wx >> 1, wy >> 1, sparkFrame) > 0.9975) c = SPARK;
        if (swim) { const m = SM[row + x]; if (m === 1) c = Water._swim.shadowOf(c, 0.52); else if (m === 2) c = Water._swim.shadowOf(c, 0.8); }
        out[row + x] = c;
      }
    }
    ctx.putImageData(img, 0, 0);
    dst.drawImage(canvas, 0, 0);
  };

  // Passing under the title's open sea now and then: a few small sharks together, as dark silhouettes. Each swims along its own trail, its body bending in a wave that runs to
  // the tail (the same shapes and motion as the cave's), and the water over it is darkened pixel by pixel.
  const swimmers = []; let nextSwim = 2, lastT = null, smask = null;
  const SHAPES = {
    whale: { len: 104, speed: 16, wave: 4, freq: 2.2, body: (q) => (q < 0.07 ? 8.5 + q * 30 : q < 0.32 ? 10.6 - (q - 0.07) * 5 : Math.max(1.4, 9.4 * Math.pow(1 - (q - 0.32) / 0.66, 1.25))), P0: 0.2, PL: 0.15, PS: 12, pel: 6, tail: 11 },
    lemon: { len: 44, speed: 32, wave: 3, freq: 4.5, body: (q) => (q < 0.1 ? 1.6 + q * 26 : q < 0.36 ? 4.2 : Math.max(0.8, 4.2 * Math.pow(1 - (q - 0.36) / 0.6, 1.3))), P0: 0.24, PL: 0.13, PS: 7, pel: 3, tail: 5.5 },
  };
  function swimTick(camX, camY, vw, vh, t) {
    const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
    nextSwim -= dt;
    if (nextSwim <= 0 && swimmers.length < 4) {
      const whale = false, dir = Math.random() < 0.5 ? 1 : -1;   // (small sharks only: no whale shark on the title)
      const y0 = camY + vh * (0.2 + Math.random() * 0.6), x0 = dir > 0 ? camX - 140 : camX + vw + 140, a = dir > 0 ? (Math.random() - 0.5) * 0.4 : Math.PI + (Math.random() - 0.5) * 0.4;
      const n = whale ? 1 : 2 + ((Math.random() * 2) | 0);
      for (let k = 0; k < n; k++) swimmers.push({ kind: whale ? "whale" : "lemon", x: x0 - Math.cos(a) * k * 40 + (Math.random() - 0.5) * 20, y: y0 + (k - (n - 1) / 2) * 26 + (Math.random() - 0.5) * 10, a, a0: a, trail: [], ph: Math.random() * 6, life: 0 });
      nextSwim = whale ? 14 + Math.random() * 10 : 9 + Math.random() * 9;
    }
    for (const c of swimmers) {
      const S = SHAPES[c.kind]; c.life += dt;
      c.a = c.a0 + Math.sin(t * 0.25 + c.ph) * 0.35;
      const sp = S.speed * (0.85 + 0.15 * Math.sin(t * 0.7 + c.ph));
      c.x += Math.cos(c.a) * sp * dt; c.y += Math.sin(c.a) * sp * dt;
      const last = c.trail[0]; if (!last || Math.hypot(last[0] - c.x, last[1] - c.y) > 2) { c.trail.unshift([c.x, c.y]); if (c.trail.length > S.len) c.trail.length = S.len; }
    }
    for (let k = swimmers.length - 1; k >= 0; k--) { const c = swimmers[k]; if (c.life > 8 && (c.x < camX - 400 || c.x > camX + vw + 400)) swimmers.splice(k, 1); }
  }
  function swimRaster(camX, camY, vw, vh, t) {
    if (!smask || smask.length !== vw * vh) smask = new Uint8Array(vw * vh); else smask.fill(0);
    let any = false;
    for (const c of swimmers) {
      const S = SHAPES[c.kind], tr = c.trail; if (tr.length < 6) continue;
      const n = 14, pts = [];
      for (let k = 0; k <= n; k++) {
        const q = k / n, idx = Math.min(tr.length - 1, Math.round(q * (S.len / 2))), p = tr[idx], p2 = tr[Math.max(0, idx - 1)];
        let nx = -(p2[1] - p[1]), ny = p2[0] - p[0]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        const w = Math.sin(q * 5 - t * S.freq + c.ph) * q * q * S.wave; pts.push([p[0] + nx * w, p[1] + ny * w, q]);
      }
      const fins = (q) => { let f = 0; if (q > S.P0 && q < S.P0 + S.PL) f = Math.max(f, S.PS * (1 - (q - S.P0) / S.PL) * Math.min(1, (q - S.P0) / 0.035)); if (q > 0.58 && q < 0.66) f = Math.max(f, S.pel * (1 - (q - 0.58) / 0.08)); if (q > 0.9) f = Math.max(f, S.tail * Math.pow((q - 0.9) / 0.1, 0.8)); return f; };
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      const pad = c.kind === "whale" ? 30 : 14, bx0 = Math.max(0, Math.floor(x0 - pad - camX)), by0 = Math.max(0, Math.floor(y0 - pad - camY)), bx1 = Math.min(vw - 1, Math.ceil(x1 + pad - camX)), by1 = Math.min(vh - 1, Math.ceil(y1 + pad - camY));
      for (let sy = by0; sy <= by1; sy++) for (let sx = bx0; sx <= bx1; sx++) {
        const wx = sx + camX + 0.5, wy = sy + camY + 0.5; let best = 1e9, bs = 0, along = 0;
        for (let k = 0; k < pts.length - 1; k++) { const ax = pts[k][0], ay = pts[k][1], dx = pts[k + 1][0] - ax, dy = pts[k + 1][1] - ay, ll = dx * dx + dy * dy || 1, raw = ((wx - ax) * dx + (wy - ay) * dy) / ll, tt = Math.max(0, Math.min(1, raw)), d = Math.hypot(ax + dx * tt - wx, ay + dy * tt - wy); if (d < best) { best = d; bs = pts[k][2] + (pts[k + 1][2] - pts[k][2]) * tt; along = k === 0 && raw < 0 ? raw : k === pts.length - 2 && raw > 1 ? raw - 1 : 0; } }
        const capR = along < 0 ? S.body(0) : along > 0 ? 0.6 : 1e9, w = Math.min(capR, S.body(bs) + fins(bs)), i = sy * vw + sx;
        if (best < w) { smask[i] = 1; any = true; } else if (best < w + 1.5 && smask[i] === 0) smask[i] = 2;
      }
    }
    return any;
  }
  const shadowOf = (c, k) => { const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255; return (255 << 24) | (((b * k) | 0) << 16) | (((g * k) | 0) << 8) | ((r * k) | 0); };
  Water._swim = { tick: swimTick, raster: swimRaster, shadowOf, get mask() { return smask; } };
  // `Wd` is the water map to draw: the island (World) by default, or a sea level's own (js/sea.js)
  Water.render = function (dst, camX, camY, vw, vh, t, Wd) {
    ensure(vw, vh); noiseGrid(camX, camY, vw, vh);
    Wd = Wd || World;
    const W = Wd.W, H = Wd.H, terr = Wd.terr, wd = Wd.waterDist, ld = Wd.landDist, ocean = Wd.oceanMask, nearO = Wd.nearOcean;
    const aX = t * 1.3, aY = t * 0.55, bX = -t * 0.9 + 13, bY = t * 0.75 + 7;
    const flow = t * 5;
    const sparkFrame = Math.floor(t * 2);
    const deep = RAMPS.deep;

    for (let y = 0; y < vh; y++) {
      const wy = camY + y;
      const row = y * vw;
      const riverWob = (Math.sin(wy * 0.05 + t * 0.6) * 0.8) | 0;
      for (let x = 0; x < vw; x++) {
        const wx = camX + x;
        if (wx < 0 || wx >= W || wy < 0 || wy >= H) { out[row + x] = deep[0]; continue; }
        const i = wy * W + wx;
        if (terr[i] !== 0) {
          // waves washing up the beach
          const l = ld[i];
          if (l < 8 && nearO[i]) {
            const reach = tideAt(t, wx, wy) * 6.5;
            if (l < reach) {
              const front = reach - l;
              out[row + x] = front < 1.4 ? FOAM : front < 2.4 && ((wx + wy) & 1) ? FOAM2 : ((wx ^ wy) & 1) ? SWASH : SWASH2;
              continue;
            } else if (!rushing && l < reach + 3 && K.hash2(wx, wy, (t * 3) | 0) > 0.82) {
              out[row + x] = FOAM2; continue; // foam lace left behind as the water drains
            }
          }
          out[row + x] = 0;
          continue;
        }
        const d = wd[i];
        const dith = BAYER[(wx & 3) | ((wy & 3) << 2)];
        // two drifting copies of the water pattern -> slow, evolving shimmer
        const la = level[(((wx + aX) | 0) & TM) + ((((wy + aY) | 0) & TM) * TS)];
        const lb = level[(TM - (((wx + bX) | 0) & TM)) + ((((wy + bY) | 0) & TM) * TS)];
        const lv = la > lb ? la : lb;
        if (ocean[i]) {
          let de = d, lace = false;
          if (d < 16) { de = d + tideAt(t, wx, wy) * 6.5; lace = !rushing; }
          let c;
          if (de < 2.5) c = FOAM;
          else if (de < 4.5 && K.hash2(wx >> 1, wy, sparkFrame) > 0.45) c = FOAM2;
          else if (lace && de < 9 && K.hash2(wx, wy, sparkFrame) > 0.86) c = FOAM2;
          else {
            const band = de + dith * 7;
            c = band > 54 ? deep[lv] : band > 32 ? RAMPS.mid[lv] : band > 16 ? RAMPS.shallow[lv] : RAMPS.vshallow[lv];
            // swells: crest lines that roll slowly toward the shore
            if (d > 8 && d < 84) {
              // the island's swells follow the shore; out among the atolls the depth barely changes, so
              // there they run as long thin lines across the water instead
              const nz = nzAt(wx, wy), ph = Wd.sea ? (wx * 0.45 + wy) * 0.021 + d * 0.012 + t * 0.1 + nz * 0.8 : d * 0.034 + t * 0.1 + nz * 0.7;
              const f = ph - Math.floor(ph);
              if (f < (Wd.sea ? 0.08 : 0.15)) {
                const brk = Wd.sea ? K.noise(wx * 0.07 + t * 0.05, wy * 0.07) : K.noise(wx * 0.02 + t * 0.03, wy * 0.02);
                const need = Wd.sea ? 0.62 + d * 0.002 : 0.46 + d * 0.004;
                if (brk > need) {
                  if (Wd.sea) c = f < 0.035 && brk > need + 0.06 ? RAMPS.vshallow[3] : RAMPS.shallow[lv < 3 ? lv + 1 : 3];
                  else if (f < 0.06) c = CREST;
                  else if (f < 0.11) c = RAMPS.vshallow[3];
                  else if (brk > need + 0.08) c = RAMPS.shallow[lv < 3 ? lv + 1 : 3];
                }
              }
            }
            if (band > 26 && lv >= 2 && K.hash2(wx >> 1, wy >> 1, sparkFrame) > 0.997) c = SPARK;
          }
          out[row + x] = c;
        } else {
          // river / lagoon: water flows gently south
          const lr = level[((wx + riverWob) & TM) + ((((wy - flow) | 0) & TM) * TS)];
          const lv2 = lr > lb ? lr : lb;
          let c;
          if (d <= 1) c = FOAM2;
          else if (d <= 2 && K.hash2(wx, wy >> 1, sparkFrame) > 0.5) c = SWASH2;
          else c = d + dith * 4 > 26 ? RAMPS.riverDeep[lv2] : RAMPS.river[lv2];
          const ph = wy * 0.045 - t * 0.4 + K.noise(wx * 0.08, wy * 0.02) * 2.2;
          const f = ph - Math.floor(ph);
          if (d > 3 && f < 0.04 && K.noise(wx * 0.15, wy * 0.05 - t * 0.3) > 0.56) c = RAMPS.vshallow[3];
          if (lv2 >= 2 && K.hash2(wx >> 1, wy >> 1, sparkFrame + 3) > 0.995) c = SPARK;
          out[row + x] = c;
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    dst.drawImage(canvas, 0, 0);
  };
})();
