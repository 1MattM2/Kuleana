// Lua Hōkū, the Star Cave: a sea cave under the south-east lava rock.
// The pool glows with bioluminescence painted like The Starry Night: brush-stroke bands that
// follow a swirling current (point vortices / spiral flow, drawn along their streamlines and
// drifting with time), a golden "moon" whirl, haloed stars. A whale shark and lemon sharks glide
// beneath as silhouettes; the hero is a backlit silhouette too.
(function () {
  const T = K.TILE;
  const MW = 44, MH = 28, W = MW * T, H = MH * T;
  const WALL = 0, FLOOR = 1, WATER = 2;
  const Cave = (window.Cave = { W, H, MW, MH });
  Cave.ENTRY = { x: 5 * T, y: 3.2 * T };   // just inside the tunnel
  Cave.EXIT_Y = 1.0 * T;                     // walk up past this to leave

  // ---------------------------------------------------------------- layout (tile units)
  const PATH = [[5, -2], [5, 4], [6.4, 8], [7.8, 12.5], [9.6, 17], [13, 21.4], [18.5, 23.8], [26, 24.6], [32.5, 23.6], [36.5, 20.8]];
  const PROM = [[8.5, 13.8], [12.5, 14.4], [15.6, 13.6]];
  const POOL = [[26, 12.5, 12.5, 8.6], [36.5, 11.8, 8.5, 6], [41.5, 12, 5.5, 4.6], [21, 20.6, 6.5, 3.3]];
  // flow: point vortices with a little sink (log spirals) + a drift toward the sea opening
  //  [x, y, circulation Γ (integer), sink m]
  // the great double swirl (like the centre of The Starry Night) and smaller eddies
  const WHIRLS = [[24.2, 11.6, 2.6, -0.2], [31.2, 15.4, -2.4, -0.2], [18.3, 17.8, 1.2, -0.15], [28.8, 6.8, 0.9, 0],
    [36.2, 18.4, -0.8, 0], [37.4, 9.6, -1.0, 0], [16.4, 10.4, 0.5, 0], [27.4, 19.6, 0.5, 0]];

  function segField(pts, x, y) {
    let best = 1e9;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0] * T, ay = pts[i][1] * T, bx = pts[i + 1][0] * T, by = pts[i + 1][1] * T;
      const dx = bx - ax, dy = by - ay;
      const t = K.clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy), 0, 1);
      const d = Math.hypot(ax + dx * t - x, ay + dy * t - y);
      if (d < best) best = d;
    }
    return best;
  }
  function poolField(x, y) {
    let v = 1e9;
    for (const [cx, cy, rx, ry] of POOL) {
      const dx = (x / T - cx) / rx, dy = (y / T - cy) / ry;
      v = Math.min(v, (Math.sqrt(dx * dx + dy * dy) - 1) * Math.min(rx, ry) * T);
    }
    return v;
  }

  function chamfer(N, isSource) {
    const d = new Uint16Array(N);
    for (let i = 0; i < N; i++) d[i] = isSource(i) ? 0 : 60000;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; let v = d[i];
      if (x > 0 && d[i - 1] + 2 < v) v = d[i - 1] + 2;
      if (y > 0) { if (d[i - W] + 2 < v) v = d[i - W] + 2; if (x > 0 && d[i - W - 1] + 3 < v) v = d[i - W - 1] + 3; if (x < W - 1 && d[i - W + 1] + 3 < v) v = d[i - W + 1] + 3; }
      d[i] = v;
    }
    for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
      const i = y * W + x; let v = d[i];
      if (x < W - 1 && d[i + 1] + 2 < v) v = d[i + 1] + 2;
      if (y < H - 1) { if (d[i + W] + 2 < v) v = d[i + W] + 2; if (x < W - 1 && d[i + W + 1] + 3 < v) v = d[i + W + 1] + 3; if (x > 0 && d[i + W - 1] + 3 < v) v = d[i + W - 1] + 3; }
      d[i] = v;
    }
    const out = new Uint8Array(N);
    for (let i = 0; i < N; i++) out[i] = Math.min(255, d[i] >> 1);
    return out;
  }

  // ---------------------------------------------------------------- build
  Cave.build = function (A) {
    const N = W * H;
    const terr = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const wob = (K.fbm(x / 40 + 500, y / 40, 3) - 0.5) * 30 + (K.noise(x * 0.2, y * 0.2) - 0.5) * 5;
      const p = segField(PATH, x, y) - 2.3 * T + wob;
      const pr = segField(PROM, x, y) - 1.6 * T + wob * 0.7;
      const pool = poolField(x, y) + wob;
      let t = WALL;
      if (p < 0 || pr < 0) t = FLOOR;
      if (pool < 0 && pr >= 0 && p > -0.9 * T) t = WATER;
      terr[i] = t;
    }
    const wd = chamfer(N, (i) => terr[i] !== WATER);   // depth into the pool
    const ld = chamfer(N, (i) => terr[i] === WATER);   // distance of rock from the water

    // ---- paint the pool with brush strokes that follow the current
    // velocity: drift toward the sea opening + point vortices (with a little sink -> spirals)
    function vel(x, y) {
      const zx = x / T, zy = y / T;
      let vx = 0.05, vy = 0;
      for (const [cx, cy, G, m] of WHIRLS) {
        const dx = zx - cx, dy = zy - cy, r2 = dx * dx + dy * dy + 0.06;
        vx += (m * dx - G * dy) / (2 * Math.PI * r2);
        vy += (m * dy + G * dx) / (2 * Math.PI * r2);
      }
      // near the shore the current runs along the rock instead of into it
      const xi = x | 0, yi = y | 0;
      if (xi > 1 && yi > 1 && xi < W - 2 && yi < H - 2) {
        const d = wd[yi * W + xi];
        if (d < 22) {
          const gx = wd[yi * W + xi + 2] - wd[yi * W + xi - 2], gy = wd[(yi + 2) * W + xi] - wd[(yi - 2) * W + xi];
          const gl = Math.hypot(gx, gy);
          if (gl > 0) {
            let tx = -gy / gl, ty = gx / gl;
            if (tx * vx + ty * vy < 0) { tx = -tx; ty = -ty; }
            const sp = Math.max(0.25, Math.hypot(vx, vy)), k = 1 - d / 22;
            vx = vx * (1 - k) + tx * sp * k; vy = vy * (1 - k) + ty * sp * k;
          }
        }
      }
      return [vx, vy];
    }
    const col = new Uint8Array(N);   // palette index: family*8 + level
    const pha = new Uint8Array(N);   // phase along each stroke (drives the flowing light)
    const rnd = K.rng(77);
    // base wash: deep night blues with soft variation
    for (let i = 0; i < N; i++) if (terr[i] === WATER) {
      const x = i % W, y = (i / W) | 0, n = K.fbm(x / 30 + 9, y / 30, 2);
      col[i] = n > 0.58 ? 2 : n > 0.4 ? 1 : 0;
      pha[i] = (rnd() * 255) | 0;
    }
    const inWater = (x, y) => x >= 0 && y >= 0 && x < W && y < H && terr[(y | 0) * W + (x | 0)] === WATER;
    function strokeColor(x, y, speed) {
      const i = (y | 0) * W + (x | 0);
      let lv = 2 + Math.min(3, speed * 2) + (K.noise(x / 18 + 5, y / 18) - 0.5) * 2.4 + (rnd() - 0.5) * 0.9;
      if (wd[i] < 7) lv += 2.2; else if (wd[i] < 14) lv += 1;
      if (wd[i] > 70 && speed < 0.35) lv -= 1;
      // colour families drift in broad currents: night blue, teal-green, and violet
      const n = K.fbm(x / 70 + 40, y / 70, 2), v = K.fbm(x / 90 + 140, y / 90 + 33, 2);
      let fam = 0;
      if (n > 0.55 && rnd() < 0.9) fam = 1;
      else if (v > 0.58 && rnd() < 0.85) fam = 2;
      return fam * 8 + K.clamp(Math.round(lv), 1, 7);
    }
    const spacing = 4;
    const seeds = [];
    for (let y = 0; y < H; y += spacing) for (let x = 0; x < W; x += spacing) {
      const sx = x + rnd() * spacing, sy = y + rnd() * spacing;
      if (inWater(sx, sy)) seeds.push([sx, sy]);
    }
    for (let k = seeds.length - 1; k > 0; k--) { const j = (rnd() * (k + 1)) | 0; [seeds[k], seeds[j]] = [seeds[j], seeds[k]]; }
    for (const [sx, sy] of seeds) {
      const [v0x, v0y] = vel(sx, sy), sp = Math.hypot(v0x, v0y);
      const L = (sp > 1.2 ? 9 : 12) + rnd() * 10;
      const c = strokeColor(sx, sy, sp);
      const thick = rnd() < 0.5 ? 3 : 2;
      const off = (rnd() * 255) | 0;
      // trace both ways along the streamline (midpoint method)
      const pts = [];
      for (const dir of [-1, 1]) {
        let x = sx, y = sy;
        for (let s2 = 0; s2 < L / 2; s2 += 0.8) {
          if (dir === 1 || s2 > 0) pts[dir === 1 ? "push" : "unshift"]([x, y]);
          let [vx, vy] = vel(x, y); let l = Math.hypot(vx, vy) || 1;
          const mx = x + (vx / l) * 0.4 * dir, my = y + (vy / l) * 0.4 * dir;
          [vx, vy] = vel(mx, my); l = Math.hypot(vx, vy) || 1;
          x += (vx / l) * 0.8 * dir; y += (vy / l) * 0.8 * dir;
          if (!inWater(x, y)) break;
        }
      }
      for (let k = 0; k < pts.length; k++) {
        const [x, y] = pts[k];
        const [vx, vy] = vel(x, y), l = Math.hypot(vx, vy) || 1;
        const nx = -vy / l, ny = vx / l;
        const taper = k === 0 || k === pts.length - 1 ? 1 : thick;
        for (let w = 0; w < taper; w++) {
          const px = (x + nx * (w - (taper - 1) / 2)) | 0, py = (y + ny * (w - (taper - 1) / 2)) | 0;
          if (!inWater(px, py)) continue;
          const i = py * W + px;
          col[i] = c; pha[i] = (off + k * 9) & 255;
        }
      }
    }
    // a thin dark seam under bright strokes keeps them crisp, like the outlines in the island art
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (terr[i] !== WATER || terr[i + W] !== WATER) continue;
      const a = col[i] & 7, b2 = col[i + W] & 7;
      if (a - b2 >= 3 && rnd() < 0.6) col[i + W] = (col[i + W] & 24) + Math.max(0, b2 - 1);
    }

    // ---- bake the rock (walls + ledges), lit by the pool
    const rock = A.px.tex_rock.data;
    const img = new ImageData(W, H), out = new Uint32Array(img.data.buffer), pk = K.rgb;
    const mix = (c, r2, g2, b2, a) => { const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255; return pk((r + (r2 - r) * a) | 0, (g + (g2 - g) * a) | 0, (b + (b2 - b) * a) | 0); };
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, t = terr[i];
      if (t === WATER) { out[i] = 0; continue; }
      const rc = rock[(x & 31) | ((y & 31) << 5)];
      let c;
      if (t === WALL) {
        let k = 99;
        for (let d = 1; d <= 12 && y + d < H; d++) if (terr[i + d * W] !== WALL) { k = d; break; }
        c = mix(rc, 12, 9, 26, 0.72);
        if (k <= 1) c = pk(6, 5, 14);
        else if (k <= 10) { c = mix(rc, 18, 16, 40, 0.6); if ((x * 13 + (x >> 2) * 7) % 6 === 0) c = mix(c, 6, 6, 16, 0.5); }
        else if (y > 0 && terr[i - W] !== WALL) c = pk(34, 34, 66);
        const l = ld[i];
        if (l < 40 && k <= 10) c = mix(c, 30, 110, 150, 0.32 * (1 - l / 40)); // cliffs catch the pool's glow
      } else {
        // wet basalt: broad noise tones dithered together, a little of the rock texture for grain
        const n = K.fbm(x / 26 + 3, y / 26, 3) + ((x ^ y) & 1 ? 0.03 : -0.03);
        c = n > 0.6 ? pk(44, 44, 72) : n > 0.47 ? pk(32, 33, 58) : n > 0.36 ? pk(24, 25, 46) : pk(17, 18, 36);
        c = mix(c, rc & 255, (rc >>> 8) & 255, (rc >>> 16) & 255, 0.12);
        if (K.noise(x * 0.3 + 7, y * 0.3) > 0.82) c = pk(58, 58, 88);                 // wet glints
        if (ld[i] < 30 && K.hash2(x >> 1, y >> 1, 5) > 0.9985) c = pk(70, 200, 210);    // glowing algae near the water
        const l = ld[i];
        if (l < 26) c = mix(c, 40, 130, 168, 0.4 * (1 - l / 26));
        if (y > 0 && terr[i - W] === WALL) c = mix(c, 8, 8, 18, 0.6);
      }
      out[i] = c;
    }
    const [gc, gctx] = K.canvas(W, H);
    gctx.putImageData(img, 0, 0);
    // collision (8px)
    const CS = 8, CW = W / CS, CH = H / CS, solid = new Uint8Array(CW * CH);
    for (let cy = 0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) {
      let n = 0;
      for (let sy = 1; sy < CS; sy += 3) for (let sx = 1; sx < CS; sx += 3) if (terr[(cy * CS + sy) * W + cx * CS + sx] !== FLOOR) n++;
      solid[cy * CW + cx] = n >= 5 ? 1 : 0;
    }
    Object.assign(Cave, { terr, wd, ld, col, pha, ground: gc, CS, CW, CH, solid });

    // ---- creatures
    const pick = (minDepth) => {
      for (let k = 0; k < 4000; k++) { const x = (Math.random() * W) | 0, y = (Math.random() * H) | 0; if (terr[y * W + x] === WATER && wd[y * W + x] > minDepth && x < W - 60) return [x, y]; }
      return [26 * T, 12 * T];
    };
    Cave.pick = pick;
    const mk = (kind, len, speed, depth) => { const [x, y] = pick(depth); return { kind, len, speed, depth, x, y, a: Math.random() * 6.28, tx: x, ty: y, trail: [], ph: Math.random() * 6 }; };
    Cave.creatures = [mk("whale", 104, 15, 44), mk("lemon", 44, 30, 18), mk("lemon", 42, 34, 18), mk("lemon", 40, 28, 18)];
    Cave.ripples = [];
    Cave.motes = [];
    for (let k = 0; k < 70; k++) Cave.motes.push({ x: Math.random() * W, y: Math.random() * H, ph: Math.random() * 6, sp: 3 + Math.random() * 6, gold: Math.random() < 0.2 });
  };

  Cave.solidAt = (x, y) => {
    const cx = Math.floor(x / Cave.CS), cy = Math.floor(y / Cave.CS);
    if (cx < 0 || cy < 0 || cx >= Cave.CW || cy >= Cave.CH) return y > 0 || cx < 0 || cx >= Cave.CW; // tunnel opens upward
    return Cave.solid[cy * Cave.CW + cx] === 1;
  };
  Cave.terrAt = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? WALL : Cave.terr[(y | 0) * W + (x | 0)]);

  // ---------------------------------------------------------------- simulation
  let lastStep = 0;
  Cave.update = function (dt, t, player) {
    for (const c of Cave.creatures) {
      const dx = c.tx - c.x, dy = c.ty - c.y;
      if (dx * dx + dy * dy < 40 * 40) { const [x, y] = Cave.pick(c.depth); c.tx = x; c.ty = y; }
      // steer smoothly toward the target, and away from shallow water ahead
      let want = Math.atan2(c.ty - c.y, c.tx - c.x);
      const ax = c.x + Math.cos(c.a) * c.len * 0.6, ay = c.y + Math.sin(c.a) * c.len * 0.6;
      const ai = (ay | 0) * W + (ax | 0);
      if (Cave.terrAt(ax, ay) !== WATER || Cave.wd[ai] < c.depth * 0.5) want = c.a + 1.2;
      let da = want - c.a; da = Math.atan2(Math.sin(da), Math.cos(da));
      const turn = (c.kind === "whale" ? 0.22 : 0.8) * dt;
      c.a += K.clamp(da, -turn, turn);
      const sp = c.speed * (0.85 + 0.15 * Math.sin(t * 0.7 + c.ph));
      c.x += Math.cos(c.a) * sp * dt; c.y += Math.sin(c.a) * sp * dt;
      const last = c.trail[0];
      if (!last || Math.hypot(last[0] - c.x, last[1] - c.y) > 2) { c.trail.unshift([c.x, c.y]); if (c.trail.length > c.len) c.trail.length = c.len; }
      if (Math.random() < dt * (c.kind === "whale" ? 0.3 : 0.35)) { const tp = c.trail[Math.min(c.trail.length - 1, (c.len / 2) | 0)]; if (tp) Cave.ripples.push({ x: tp[0], y: tp[1], t0: t, big: c.kind === "whale" }); }
    }
    // footsteps at the water's edge light the plankton
    if (player.moving && t - lastStep > 0.28) {
      const i = (player.y | 0) * W + (player.x | 0);
      if (Cave.ld[i] < 22) { lastStep = t; Cave.ripples.push({ x: player.x, y: player.y + 4, t0: t, step: true }); }
    }
    // drips from the ceiling
    if (Math.random() < dt * 0.9) { const [x, y] = Cave.pick(6); Cave.ripples.push({ x, y, t0: t, drip: true }); window.Ambience && Ambience.drip && Ambience.drip(); }
    Cave.ripples = Cave.ripples.filter((r) => t - r.t0 < 2.4);
    for (const m of Cave.motes) { m.y -= m.sp * dt; m.x += Math.sin(t * 0.4 + m.ph) * 4 * dt; if (m.y < -4) { m.y = H + 4; m.x = Math.random() * W; } }
  };

  // ---------------------------------------------------------------- rendering
  const pk = K.rgb;
  // night-blue -> cyan -> white ramp, and a gold ramp for the moon / stars
  // 3 families x 8 levels: night blue, teal-green, violet (bioluminescent pinks at the top)
  const PAL = [
    pk(4, 8, 22), pk(8, 18, 48), pk(14, 34, 86), pk(22, 58, 136), pk(36, 96, 186), pk(70, 150, 222), pk(140, 206, 244), pk(222, 246, 255),
    pk(4, 12, 20), pk(8, 28, 44), pk(14, 52, 72), pk(22, 90, 108), pk(38, 136, 140), pk(78, 186, 172), pk(150, 226, 206), pk(226, 250, 236),
    pk(10, 6, 24), pk(24, 14, 54), pk(46, 26, 96), pk(76, 44, 146), pk(116, 72, 196), pk(166, 116, 230), pk(214, 170, 246), pk(246, 226, 255),
  ];
  const RAMP = PAL.slice(0, 8);
  const SIL = pk(3, 6, 14);
  let buf, bctx, bimg, bout, mask, vwC = 0, vhC = 0;
  function ensure(vw, vh) {
    if (vw === vwC && vh === vhC) return;
    vwC = vw; vhC = vh;
    [buf, bctx] = K.canvas(vw, vh);
    bimg = bctx.createImageData(vw, vh); bout = new Uint32Array(bimg.data.buffer);
    mask = new Uint8Array(vw * vh);
  }

  // silhouettes of the swimmers into the mask: 1 = body, 2 = glowing edge
  function rasterCreatures(ox, oy, vw, vh, t) {
    mask.fill(0);
    for (const c of Cave.creatures) {
      const tr = c.trail;
      if (tr.length < 6) continue;
      const n = 14, pts = [];
      for (let k = 0; k <= n; k++) {
        const s = k / n, idx = Math.min(tr.length - 1, Math.round(s * (c.len / 2)));
        const p = tr[idx], q = tr[Math.max(0, idx - 1)];
        let nx = -(q[1] - p[1]), ny = q[0] - p[0]; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
        const wave = Math.sin(s * 5 - t * (c.kind === "whale" ? 2.2 : 4.5) + c.ph) * s * s * (c.kind === "whale" ? 4 : 3);
        pts.push([p[0] + nx * wave, p[1] + ny * wave, s]);
      }
      const whale = c.kind === "whale";
      // top-down shark outline: half-width of the body at s (0 = snout, 1 = tail tip), plus
      // swept-back pectoral fins, small pelvic fins and a forked tail
      const body = whale
        ? (s) => (s < 0.07 ? 8.5 + s * 30 : s < 0.32 ? 10.6 - (s - 0.07) * 5 : Math.max(1.4, 9.4 * Math.pow(1 - (s - 0.32) / 0.66, 1.25)))
        : (s) => (s < 0.1 ? 1.6 + s * 26 : s < 0.36 ? 4.2 : Math.max(0.8, 4.2 * Math.pow(1 - (s - 0.36) / 0.6, 1.3)));
      const P0 = whale ? 0.2 : 0.24, PL = whale ? 0.15 : 0.13, PS = whale ? 12 : 7;
      const fins = (s) => {
        let f = 0;
        if (s > P0 && s < P0 + PL) f = Math.max(f, PS * (1 - (s - P0) / PL) * Math.min(1, (s - P0) / 0.035));
        if (s > 0.58 && s < 0.66) f = Math.max(f, (whale ? 6 : 3) * (1 - (s - 0.58) / 0.08));
        if (s > 0.9) f = Math.max(f, (whale ? 11 : 5.5) * Math.pow((s - 0.9) / 0.1, 0.8));
        return f;
      };
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      const pad = whale ? 30 : 14;
      const bx0 = Math.max(0, Math.floor(x0 - pad - ox)), by0 = Math.max(0, Math.floor(y0 - pad - oy));
      const bx1 = Math.min(vw - 1, Math.ceil(x1 + pad - ox)), by1 = Math.min(vh - 1, Math.ceil(y1 + pad - oy));
      for (let sy = by0; sy <= by1; sy++) for (let sx = bx0; sx <= bx1; sx++) {
        const wx = sx + ox + 0.5, wy = sy + oy + 0.5;
        let best = 1e9, bs = 0, along = 0;
        for (let k = 0; k < pts.length - 1; k++) {
          const ax = pts[k][0], ay = pts[k][1], dx = pts[k + 1][0] - ax, dy = pts[k + 1][1] - ay;
          const ll = dx * dx + dy * dy || 1, raw = ((wx - ax) * dx + (wy - ay) * dy) / ll;
          const tt = K.clamp(raw, 0, 1);
          const d = Math.hypot(ax + dx * tt - wx, ay + dy * tt - wy);
          if (d < best) { best = d; bs = pts[k][2] + (pts[k + 1][2] - pts[k][2]) * tt; along = k === 0 && raw < 0 ? raw : k === pts.length - 2 && raw > 1 ? raw - 1 : 0; }
        }
        // past the snout or the tail tip only a rounded cap counts
        const capR = along < 0 ? body(0) : along > 0 ? 0.6 : 1e9;
        const w = Math.min(capR, body(bs) + fins(bs));
        const i = sy * vw + sx;
        if (best < w) mask[i] = 1;
        else if (best < w + 1.5 && mask[i] === 0) mask[i] = 2;
      }
    }
  }

  Cave.renderWater = function (dst, ox, oy, vw, vh, t, player) {
    ensure(vw, vh);
    rasterCreatures(ox, oy, vw, vh, t);
    const terr = Cave.terr, col = Cave.col, pha = Cave.pha, wd = Cave.wd, ld = Cave.ld;
    const rip = Cave.ripples.filter((r) => r.x > ox - 80 && r.x < ox + vw + 80 && r.y > oy - 80 && r.y < oy + vh + 80);
    const flow = (t * 34) & 255, flow2 = (t * 13 + 128) & 255, breathe = Math.sin(t * 0.5);
    const px = player.x, py = player.y;
    for (let y = 0; y < vh; y++) {
      const wy = oy + y, row = y * vw;
      for (let x = 0; x < vw; x++) {
        const wx = ox + x;
        if (wx < 0 || wy < 0 || wx >= W || wy >= H) { bout[row + x] = 0; continue; }
        const i = wy * W + wx;
        if (terr[i] !== WATER) {
          const l = ld[i];
          if (l <= 2) {
            const f = Math.sin(t * 1.6 + wx * 0.15 + wy * 0.11) * 0.5 + 0.5;
            bout[row + x] = f > 0.6 ? PAL[5] : f > 0.3 ? PAL[4] : 0;
          } else bout[row + x] = 0;
          continue;
        }
        const c0 = col[i], fam = c0 & 24;
        let lv = c0 & 7;
        // colour cycling: light runs along every stroke, in the direction of the current
        const ph = (pha[i] - flow) & 255;
        if (ph < 22) lv += 2; else if (ph < 60) lv += 1;
        if (((pha[i] - flow2) & 255) < 10) lv += 1;
        if (breathe > 0.6 && lv >= 5) lv += 1;
        // the hero's footsteps stir the plankton
        const pdx = wx - px, pdy = wy - py;
        if (pdx * pdx + pdy * pdy < 1400) lv += 1;
        for (let r = 0; r < rip.length; r++) {
          const R = rip[r], age = t - R.t0, rad = age * (R.drip ? 20 : 28);
          const d = Math.hypot(wx - R.x, wy - R.y);
          if (Math.abs(d - rad) < (R.big ? 1.8 : 1.1) && age < 2.2) lv += age < 0.9 ? 2 : 1;
        }
        let c = PAL[fam + (lv > 7 ? 7 : lv)];
        // swimmers: dark silhouettes beneath the light, plankton glowing on their edges
        const m = mask[row + x];
        if (m === 1) c = SIL;
        else if (m === 2) c = PAL[(lv + 2 > 7 ? 7 : lv + 2)];
        if (K.hash2(wx >> 1, wy >> 1, (t * 3) | 0) > 0.9978) c = PAL[7];
        bout[row + x] = c;
      }
    }
    bctx.putImageData(bimg, 0, 0);
    dst.drawImage(buf, 0, 0);
  };

  // glowing motes + light falling through the sea opening + deep vignette (world-space layer)
  Cave.renderOverlay = function (ctx, ox, oy, vw, vh, t) {
    ctx.globalCompositeOperation = "lighter";
    const ex = W - ox, ey = 12 * T - oy;
    if (ex > -200 && ex < vw + 400) {
      for (let k = 0; k < 4; k++) {
        const a = 0.035 + 0.02 * Math.sin(t * 0.5 + k);
        ctx.fillStyle = `rgba(120,180,230,${a})`;
        ctx.beginPath();
        ctx.moveTo(ex, ey - 50 + k * 22); ctx.lineTo(ex - 380, ey - 120 + k * 60); ctx.lineTo(ex - 380, ey - 70 + k * 60); ctx.lineTo(ex, ey - 36 + k * 22);
        ctx.fill();
      }
    }
    for (const m of Cave.motes) {
      const x = Math.round(m.x - ox), y = Math.round(m.y - oy);
      if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 1.6 + m.ph));
      ctx.fillStyle = m.gold ? `rgba(206,160,255,${tw})` : `rgba(120,230,255,${tw})`;
      ctx.fillRect(x, y, 1, 1);
      if (tw > 0.85) { ctx.fillStyle = m.gold ? "rgba(206,160,255,0.25)" : "rgba(120,230,255,0.25)"; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
    }
    ctx.globalCompositeOperation = "source-over";
  };
})();
