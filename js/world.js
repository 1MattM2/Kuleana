// World layout + ground baking.
// The island is described by a few smooth "fields" (ocean, river, rock, jungle) that are
// evaluated per pixel with noise, so coastlines and grass edges are organic rather than
// tile-blocky. Ground colours come straight from the textures cut out of docs/.
(function () {
  const T = K.TILE;
  const MW = 72, MH = 52, W = MW * T, H = MH * T;
  const WATER = 0, SAND = 1, GRASS = 2, ROCK = 3, JUNGLE = 4, PATH = 5, PLAZA = 6;

  const World = (window.World = { MW, MH, W, H, WATER, SAND, GRASS, ROCK, JUNGLE, PATH, PLAZA });

  // --------------------------------------------------------------- layout (tile units)
  const RIVER = [[27, -1], [27.4, 7], [26.4, 12.5], [25.6, 17], [26, 21], [26.6, 25], [25.8, 29], [24.2, 34], [22.9, 39], [22.3, 44], [22, 53]];
  World.PATH_Y = 19;                          // glyph road occupies rows 19-20
  World.PLAZA = { x: 55, y: 12, w: 6, h: 5 }; // solar mosaic court in front of the temple
  World.TEMPLE = { x: 58 * T, y: 12 * T };    // base centre of the temple doorway
  World.START = { x: 16 * T, y: 20 * T + 4 };

  function smin(a, b, k) {
    const h = K.clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);
    return K.lerp(b, a, h) - k * h * (1 - h);
  }
  function riverField(x, y) {
    let best = 1e9;
    for (let i = 0; i < RIVER.length - 1; i++) {
      const ax = RIVER[i][0] * T, ay = RIVER[i][1] * T, bx = RIVER[i + 1][0] * T, by = RIVER[i + 1][1] * T;
      const dx = bx - ax, dy = by - ay;
      let t = ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy);
      t = K.clamp(t, 0, 1);
      const ex = ax + dx * t - x, ey = ay + dy * t - y;
      const d = Math.sqrt(ex * ex + ey * ey);
      if (d < best) best = d;
    }
    const ty = y / T;
    const hw = (1.45 + 1.7 * Math.exp(-(((ty - 11.5) / 3.0) ** 2)) + 0.25 * Math.sin(ty * 0.9) + 0.5 * K.smooth(K.clamp((ty - 38) / 8, 0, 1))) * T;
    return best - hw;
  }
  function oceanField(x, y) {
    const tx = x / T, ty = y / T;
    const coastX = 9.5 + 2.2 * Math.sin(ty * 0.19 + 0.5) + 1.3 * Math.sin(ty * 0.47 + 2.0);
    const southY = 43.6 + 1.6 * Math.sin(tx * 0.15 + 1.0) + 0.9 * Math.sin(tx * 0.41);
    return smin((tx - coastX) * T, (southY - ty) * T, 3 * T);
  }
  function rockField(x, y) {
    const tx = x / T, ty = y / T;
    const ne = Math.min(tx - (52.6 + 0.8 * Math.sin(ty * 0.6)), 11.25 + 0.35 * Math.sin(tx * 0.9) - ty);
    const east = tx - (63.4 + 1.1 * Math.sin(ty * 0.33) + 0.5 * Math.sin(ty * 0.9 + 1));
    // south-east lava outcrop: the sea cave opens in its south face
    const se = Math.min(tx - (56.6 + 0.6 * Math.sin(ty * 0.9)), 37.3 + 0.25 * Math.sin(tx * 1.3) - ty, ty - 30.5);
    return Math.max(ne, east, se) * T;
  }
  function jungleField(x, y) {
    const tx = x / T, ty = y / T;
    return (5.4 + 0.7 * Math.sin(tx * 0.37) + 0.5 * Math.sin(tx * 0.11 + 2) - ty) * T;
  }

  // --------------------------------------------------------------- bake
  let pathEdge, plazaEdge;
  World.build = function (A) {
    const N = W * H;
    const terr = new Uint8Array(N);
    const shell = new Uint8Array(N);
    const tone = new Int8Array(N);

    // coarse field grid (every 4px), bilinear sampled per pixel
    const G = 4, GW = W / G + 2, GH = H / G + 2;
    const fO = new Float32Array(GW * GH), fR = new Float32Array(GW * GH), fK = new Float32Array(GW * GH),
      fJ = new Float32Array(GW * GH), fB = new Float32Array(GW * GH), fS = new Float32Array(GW * GH), fT = new Float32Array(GW * GH);
    for (let gy = 0; gy < GH; gy++) {
      for (let gx = 0; gx < GW; gx++) {
        const x = gx * G, y = gy * G, j = gy * GW + gx;
        const wob = K.fbm(x / 46, y / 46, 3) - 0.5;
        const wob2 = K.fbm(x / 23 + 50, y / 23, 2) - 0.5;
        fO[j] = oceanField(x, y) + wob * 34;
        fR[j] = riverField(x, y) + wob2 * 12;
        fK[j] = rockField(x, y) + wob * 26 + wob2 * 10;
        fJ[j] = jungleField(x, y) + wob * 40 + wob2 * 12;
        fB[j] = 120 + (K.fbm(x / 90 + 9, y / 90, 2) - 0.5) * 130;
        fS[j] = K.fbm(x / 60 + 200, y / 60, 2);
        fT[j] = K.fbm(x / 70 + 400, y / 70 + 99, 3);
      }
    }
    function bil(f, x, y) {
      const gx = x / G, gy = y / G, ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy, j = iy * GW + ix;
      const a = f[j], b = f[j + 1], c = f[j + GW], d = f[j + GW + 1];
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }

    const oceanMask = new Uint8Array(N);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x;
        const fine = (K.noise(x * 0.23, y * 0.23) - 0.5) * 6;
        const o = bil(fO, x, y) + fine;
        const r = bil(fR, x, y) + fine * 0.7;
        let t;
        if (o < 0) { t = WATER; oceanMask[i] = 1; }
        else if (r < 0) t = WATER;
        else if (bil(fJ, x, y) + fine > 0) t = JUNGLE;
        else if (bil(fK, x, y) + fine > 0) t = ROCK;
        else if (o < bil(fB, x, y) + fine * 2 || r < 7 + fine) t = SAND;
        else t = GRASS;
        terr[i] = t;
        const s = bil(fS, x, y);
        shell[i] = s > 0.6 ? 1 : 0;
        const tv = bil(fT, x, y) + (K.noise(x * 0.5, y * 0.5) - 0.5) * 0.05;
        tone[i] = tv < 0.4 ? -1 : tv > 0.62 ? 1 : 0;
      }
    }

    // ---- bridges: find river crossing on given rows
    function crossing(rowY, x0, x1) {
      let a = -1, b = -1;
      for (let x = x0; x < x1; x++) {
        let wet = false;
        for (let dy = -14; dy <= 14; dy += 7) if (terr[(rowY + dy) * W + x] === WATER) wet = true;
        if (wet) { if (a < 0) a = x; b = x; }
      }
      return [a - 12, b + 12];
    }
    World.bridges = [];
    const by1 = World.PATH_Y * T + T; // centre line of the road (between rows 19 and 20)
    const c1 = crossing(by1, 20 * T, 33 * T);
    World.bridges.push({ x0: c1[0], x1: c1[1], y: by1, dir: "h" });
    const by2 = 37 * T;
    const c2 = crossing(by2, 18 * T, 30 * T);
    World.bridges.push({ x0: c2[0], x1: c2[1], y: by2, dir: "h" });

    // ---- glyph road + plaza + sandy trail (tile aligned)
    const pathStart = Math.ceil(c1[1] / T);
    World.pathCells = [];
    const isPath = new Uint8Array(MW * MH);
    for (let tx = pathStart; tx <= 58; tx++) { isPath[World.PATH_Y * MW + tx] = 1; isPath[(World.PATH_Y + 1) * MW + tx] = 1; }
    for (const ty of [17, 18]) isPath[ty * MW + 57] = isPath[ty * MW + 58] = 1;
    isPath[World.PATH_Y * MW + pathStart - 1] = isPath[(World.PATH_Y + 1) * MW + pathStart - 1] = 2; // under the bridge end
    const P = World.PLAZA;
    const inPlazaTile = (tx, ty) => tx >= P.x && tx < P.x + P.w && ty >= P.y && ty < P.y + P.h;
    const paved = (tx, ty) => isPath[ty * MW + tx] > 0 || inPlazaTile(tx, ty);
    // how far inside the paving a pixel is, and the (noisy) overgrowth width at that spot
    pathEdge = function (x, y) {
      const tx = (x / T) | 0, ty = (y / T) | 0, lx = x & 31, ly = y & 31;
      const d = Math.min(paved(tx - 1, ty) ? 99 : lx, paved(tx + 1, ty) ? 99 : 31 - lx, paved(tx, ty - 1) ? 99 : ly, paved(tx, ty + 1) ? 99 : 31 - ly);
      return d - (1 + K.noise(x * 0.3, y * 0.3) * 5.5 + K.noise(x * 0.9, y * 0.9) * 1.5);
    };
    plazaEdge = function (x, y) {
      const W2 = P.w * T, H2 = P.h * T, R = 30, px = x - P.x * T, py = y - P.y * T;
      if (py > H2 - 16 && px >= 2 * T && px < 4 * T) return 99; // joins the road
      const ax = Math.abs(px - W2 / 2) - (W2 / 2 - R), ay = Math.abs(py - H2 / 2) - (H2 / 2 - R);
      const sd = Math.hypot(Math.max(ax, 0), Math.max(ay, 0)) + Math.min(Math.max(ax, ay), 0) - R;
      return -sd - (1 + K.noise(x * 0.3, y * 0.3) * 4 + K.noise(x * 0.9, y * 0.9) * 1.5);
    };
    for (let y = 0; y < H; y++) {
      const ty = (y / T) | 0;
      for (let x = 0; x < W; x++) {
        const tx = (x / T) | 0, i = y * W + x;
        if (isPath[ty * MW + tx] === 1) { if (pathEdge(x, y) > 0) terr[i] = PATH; }
        else if (inPlazaTile(tx, ty)) { if (plazaEdge(x, y) > 0) terr[i] = PLAZA; }
        else if (x < c1[0] && x > 12 * T && Math.abs(y - by1) < 22 + (K.fbm(x * 0.03, y * 0.03, 2) - 0.5) * 22 && terr[i] === GRASS) terr[i] = SAND;
      }
    }
    World.isPath = isPath;

    // ---- distance fields (chamfer 2/3, stored as px)
    function distance(isSource) {
      const d = new Uint16Array(N);
      for (let i = 0; i < N; i++) d[i] = isSource(i) ? 0 : 60000;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; let v = d[i];
        if (x > 0 && d[i - 1] + 2 < v) v = d[i - 1] + 2;
        if (y > 0) {
          if (d[i - W] + 2 < v) v = d[i - W] + 2;
          if (x > 0 && d[i - W - 1] + 3 < v) v = d[i - W - 1] + 3;
          if (x < W - 1 && d[i - W + 1] + 3 < v) v = d[i - W + 1] + 3;
        }
        d[i] = v;
      }
      for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
        const i = y * W + x; let v = d[i];
        if (x < W - 1 && d[i + 1] + 2 < v) v = d[i + 1] + 2;
        if (y < H - 1) {
          if (d[i + W] + 2 < v) v = d[i + W] + 2;
          if (x < W - 1 && d[i + W + 1] + 3 < v) v = d[i + W + 1] + 3;
          if (x > 0 && d[i + W - 1] + 3 < v) v = d[i + W - 1] + 3;
        }
        d[i] = v;
      }
      const out = new Uint8Array(N);
      for (let i = 0; i < N; i++) out[i] = Math.min(255, d[i] >> 1);
      return out;
    }
    const waterDist = distance((i) => terr[i] !== WATER); // depth: px from shore
    const landDist = distance((i) => terr[i] === WATER);  // px from water
    // which body of water a shore pixel touches (ocean vs river), propagated a little inland
    const nearOcean = new Uint8Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (landDist[i] > 0 && landDist[i] < 14) {
        const o = oceanField(x, y);
        nearOcean[i] = o < 60 ? 1 : 0;
      }
    }

    // ---- colour pass
    const tex = A.px;
    const sand = tex.tex_sand.data, shellT = tex.tex_sand_shells.data, grass = tex.tex_grass.data,
      rock = tex.tex_rock.data, glyph = tex.tex_glyph.data;
    const img = new ImageData(W, H);
    const out = new Uint32Array(img.data.buffer);
    const pk = K.rgb;
    function scale(c, f) {
      const r = Math.min(255, (c & 255) * f), g = Math.min(255, ((c >>> 8) & 255) * f), b = Math.min(255, ((c >>> 16) & 255) * f);
      return pk(r | 0, g | 0, b | 0);
    }
    function mix(c, r2, g2, b2, a) {
      const r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
      return pk((r + (r2 - r) * a) | 0, (g + (g2 - g) * a) | 0, (b + (b2 - b) * a) | 0);
    }
    const EDGE = pk(22, 84, 40), EDGE2 = pk(36, 112, 46);
    const ROCK_LINE = pk(18, 13, 22), ROCK_HI = pk(118, 104, 136);
    const isGr = (t) => t === GRASS || t === JUNGLE;
    const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16 - 0.5);
    // sun court: drawn on one 16px tile grid with the medallion centred on a grid corner
    const SUN = { out: pk(110, 44, 18), ring: pk(252, 212, 96), ringS: pk(226, 168, 60), line: pk(132, 52, 22), bg: pk(194, 90, 36),
      ray: pk(250, 200, 72), rayS: pk(232, 160, 52), core: pk(255, 232, 140), coreH: pk(255, 246, 200), coreR: pk(236, 172, 60),
      grout: pk(136, 56, 26), inA: pk(242, 192, 78), inB: pk(160, 64, 30), tiles: [pk(236, 152, 62), pk(220, 128, 50), pk(200, 102, 40)], bevel: pk(252, 192, 104) };
    function sunCourt(px, py) {
      const dx = px + 0.5 - (World.PLAZA.w * T) / 2, dy = py + 0.5 - (World.PLAZA.h * T) / 2, rr = Math.hypot(dx, dy);
      if (rr <= 45) {
        if (rr > 44) return SUN.out;
        if (rr > 41) return dx + dy < 0 ? SUN.ring : SUN.ringS;
        if (rr > 40) return SUN.line;
        if (rr <= 16) {
          if (rr > 15) return SUN.line;
          if (rr > 13) return SUN.ring;
          if (rr > 11.5) return SUN.coreR;
          return dx + dy < -9 ? SUN.coreH : SUN.core;
        }
        const a = Math.atan2(dy, dx), sec = (2 * Math.PI) / 12;
        const k = Math.floor((a + Math.PI) / sec + 0.5);
        const frac = (a + Math.PI) / sec - k;
        const len = k % 2 ? 30 : 37.5;
        const hw = 0.44 * (1 - (rr - 16) / (len - 16));
        if (rr < len && Math.abs(frac) < hw) return Math.abs(frac) > hw * 0.55 && frac > 0 ? SUN.rayS : SUN.ray;
        return SUN.bg;
      }
      const lx = px & 15, ly = py & 15, gx = px >> 4, gy = py >> 4;
      const mx = Math.min(lx, 16 - lx), my = Math.min(ly, 16 - ly);
      if (mx + my <= 4) {
        if (mx + my === 4) return SUN.grout;
        return ((gx + gy + (lx > 8 ? 1 : 0) + (ly > 8 ? 1 : 0)) & 1) ? SUN.inA : SUN.inB;
      }
      if (lx === 0 || ly === 0) return SUN.grout;
      const base = SUN.tiles[(K.hash2(gx, gy, 41) * 3) | 0];
      if (lx === 1 || ly === 1) return SUN.bevel;
      if (lx === 15 || ly === 15) return scale(base, 0.82);
      return base;
    }

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = y * W + x, t = terr[i];
        let c = 0;
        if (t === WATER) { out[i] = 0; continue; }
        // break up texture repetition: irregular patches, each with its own offset / mirror
        const wx = x + (K.noise(x / 26, y / 26) - 0.5) * 40, wy = y + (K.noise(x / 26 + 70, y / 26 + 70) - 0.5) * 40;
        const pcx = Math.floor(wx / 72), pcy = Math.floor(wy / 72);
        const hox = (K.hash2(pcx, pcy, t) * 32) | 0, hoy = (K.hash2(pcx, pcy, t + 9) * 32) | 0;
        let u = (x + hox) & 31;
        if (K.hash2(pcx, pcy, t + 17) > 0.5) u = 31 - u;
        const ti = u | (((y + hoy) & 31) << 5);
        if (t === SAND) {
          c = shell[i] && landDist[i] > 20 ? shellT[ti] : sand[ti];
          if (tone[i] < 0) c = scale(c, 0.95); else if (tone[i] > 0) c = scale(c, 1.03);
          const ld = landDist[i];
          if (ld <= 2) c = mix(c, 176, 128, 70, 0.55);
          else if (ld <= 5) c = mix(c, 196, 146, 78, 0.4);
          else if (ld <= 7 && ((x + y) & 1)) c = mix(c, 205, 156, 84, 0.25);
        } else if (isGr(t)) {
          c = grass[ti];
          // meadow variety: lush shady patches, sunny patches and a few drier spots,
          // dithered at their borders so they blend like pixel art
          const v = K.fbm(x / 170 + 300, y / 170, 3) * 0.72 + K.noise(x / 46, y / 46) * 0.28 + BAYER[(x & 3) | ((y & 3) << 2)] * 0.07;
          if (v < 0.36) c = mix(scale(c, 0.88), 24, 104, 52, 0.28);
          else if (v < 0.42) c = scale(c, 0.94);
          else if (v > 0.68) c = mix(scale(c, 1.06), 168, 196, 74, 0.26);
          else if (v > 0.6) c = mix(scale(c, 1.05), 140, 200, 70, 0.12);
          if (t === JUNGLE) c = mix(scale(c, 0.55), 10, 40, 24, 0.25);
          // dark rim where grass meets sand / water
          let rim = 9;
          for (let dy = -2; dy <= 2 && rim > 1; dy++) for (let dx = -2; dx <= 2; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
            const tt = terr[yy * W + xx];
            if (tt === SAND || tt === WATER) { const m = Math.max(Math.abs(dx), Math.abs(dy)); if (m < rim) rim = m; }
          }
          if (rim === 1) c = EDGE; else if (rim === 2) c = mix(c, 36, 112, 46, 0.55);
        } else if (t === ROCK) {
          let k = 99;
          for (let d = 1; d <= 14 && y + d < H; d++) if (terr[i + d * W] !== ROCK) { k = d; break; }
          const rc = rock[ti];
          if (k <= 1) c = ROCK_LINE;
          else if (k <= 12) {
            // cliff face: darker, vertical strata
            c = scale(rc, 0.62 + (k > 10 ? 0.18 : 0));
            const strata = (x * 13 + ((x >> 2) * 7)) % 6;
            if (strata === 0) c = scale(c, 0.7);
            else if (strata === 3 && k < 9) c = scale(c, 1.15);
          } else {
            c = rc;
            if (y > 0 && terr[i - W] !== ROCK) c = ROCK_HI;
            else if (y > 1 && terr[i - 2 * W] !== ROCK) c = mix(rc, 118, 104, 136, 0.5);
          }
          // side edges outline
          if ((x > 0 && terr[i - 1] !== ROCK) || (x < W - 1 && terr[i + 1] !== ROCK)) c = ROCK_LINE;
        } else if (t === PATH) {
          c = glyph[(x & 63) + (((y - World.PATH_Y * T) & 63) << 6)];
          const e = pathEdge(x, y);
          if (e < 2) c = scale(c, 0.8); else if (e < 4 && ((x + y) & 1)) c = scale(c, 0.9);
          if (K.noise(x * 0.12, y * 0.12) > 0.83 && K.hash2(x, y, 3) > 0.78) c = mix(c, 70, 150, 60, 0.7); // moss in the cracks
        } else if (t === PLAZA) {
          const px = x - World.PLAZA.x * T, py = y - World.PLAZA.y * T;
          c = sunCourt(px, py);
          const e = plazaEdge(x, y);
          if (e < 3) c = scale(glyph[(x & 63) + ((y & 63) << 6)], e < 1 ? 0.62 : 0.85); // sandstone kerb
          else if (e < 6 && K.hash2(x, y, 5) > 0.75) c = mix(c, 70, 150, 60, 0.55); // a little moss creeping in at the rim
        }
        // cast shadows from raised things above (rock, road slabs)
        if (t === SAND || isGr(t)) {
          for (let d = 1; d <= 7 && y - d >= 0; d++) {
            const tt = terr[i - d * W];
            if (tt === ROCK) { c = scale(c, 0.62 + d * 0.02); break; }
          }
          if (y > 0 && (terr[i - W] === PATH || terr[i - W] === PLAZA)) c = scale(c, 0.72);
          else if (y > 1 && (terr[i - 2 * W] === PATH || terr[i - 2 * W] === PLAZA)) c = scale(c, 0.86);
        }
        out[i] = c;
      }
    }
    // ---- meadow details stamped into the grass: blade clumps, clover, pebbles, tiny blooms
    {
      const r = K.rng(4242);
      const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < H && terr[y * W + x] === GRASS) out[y * W + x] = c; };
      const BL = [pk(22, 92, 40), pk(52, 140, 54), pk(98, 186, 74), pk(150, 216, 98)];
      for (let k = 0; k < 26000; k++) {
        const x = (r() * W) | 0, y = (r() * H) | 0;
        if (terr[y * W + x] !== GRASS || landDist[y * W + x] < 6) continue;
        const dens = K.noise(x / 60 + 11, y / 60);
        if (r() > dens * 1.3) continue;
        const kind = r();
        if (kind < 0.55) {                       // blade clump
          const n = 2 + ((r() * 3) | 0);
          for (let b = 0; b < n; b++) {
            const bx = x + b * 2 - n, hgt = 2 + ((r() * 3) | 0), lean = r() < 0.5 ? 0 : 1;
            put(bx, y, BL[0]);
            for (let h = 1; h <= hgt; h++) put(bx + (h > 1 ? lean : 0), y - h, h === hgt ? BL[3] : h === hgt - 1 ? BL[2] : BL[1]);
          }
        } else if (kind < 0.75) {                // clover
          const cl = pk(104, 192, 82), cd = pk(40, 120, 50);
          put(x, y, cl); put(x + 1, y, cl); put(x, y - 1, cl); put(x + 1, y + 1, cd); put(x - 1, y + 1, cl); put(x, y + 1, cd);
        } else if (kind < 0.86) {                // dark tuft shadow
          put(x, y, BL[0]); put(x + 1, y, BL[0]); put(x - 1, y - 1, BL[1]); put(x + 2, y - 1, BL[1]);
        } else if (kind < 0.94) {                // pebble
          put(x, y, pk(176, 170, 156)); put(x + 1, y, pk(150, 144, 132)); put(x, y + 1, pk(88, 96, 70)); put(x + 1, y + 1, pk(88, 96, 70));
        } else {                                 // tiny bloom
          const fc = r() < 0.5 ? pk(250, 236, 120) : pk(250, 250, 240);
          put(x, y, fc); put(x, y + 1, BL[0]);
        }
      }
    }
    const [gc, gctx] = K.canvas(W, H);
    gctx.putImageData(img, 0, 0);

    World.terr = terr;
    World.oceanMask = oceanMask;
    World.waterDist = waterDist;
    World.landDist = landDist;
    World.nearOcean = nearOcean;
    World.ground = gc;

    // ---- collision grid (8px)
    const CS = 8, CW = W / CS, CH = H / CS;
    const solid = new Uint8Array(CW * CH);
    for (let cy = 0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) {
      let n = 0;
      for (let sy = 1; sy < CS; sy += 3) for (let sx = 1; sx < CS; sx += 3) {
        const t = terr[(cy * CS + sy) * W + cx * CS + sx];
        if (t === WATER || t === ROCK || t === JUNGLE) n++;
      }
      solid[cy * CW + cx] = n >= 5 ? 1 : 0;
    }
    for (const b of World.bridges) {
      for (let cy = ((b.y - 14) / CS) | 0; cy <= ((b.y + 12) / CS) | 0; cy++)
        for (let cx = ((b.x0 + 2) / CS) | 0; cx <= ((b.x1 - 2) / CS) | 0; cx++) solid[cy * CW + cx] = 0;
    }
    // sea-cave mouth: find the outcrop's south face at x = 60.5 tiles and open a doorway in it
    {
      const mx = Math.round(60.5 * T);
      let my = 33 * T;
      while (my < 41 * T && terr[my * W + mx] === ROCK) my++;
      World.caveMouth = { x: mx, y: my };
      for (let cy = ((my - 22) / CS) | 0; cy <= ((my + 2) / CS) | 0; cy++)
        for (let cx = ((mx - 12) / CS) | 0; cx <= ((mx + 11) / CS) | 0; cx++) solid[cy * CW + cx] = 0;
    }
    World.CS = CS; World.CW = CW; World.CH = CH; World.solid = solid;

    // ---- minimap (1px = 12 world px)
    const MS = 12, mw = Math.ceil(W / MS), mh = Math.ceil(H / MS);
    const [mc, mctx] = K.canvas(mw, mh);
    const md = mctx.createImageData(mw, mh), mo = new Uint32Array(md.data.buffer);
    const MC = { 0: pk(30, 150, 170), 1: pk(240, 200, 110), 2: pk(60, 160, 60), 3: pk(60, 52, 70), 4: pk(26, 80, 40), 5: pk(214, 190, 140), 6: pk(214, 120, 50) };
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
      const t = terr[Math.min(H - 1, y * MS + 6) * W + Math.min(W - 1, x * MS + 6)];
      mo[y * mw + x] = t === WATER && waterDist[Math.min(H - 1, y * MS + 6) * W + Math.min(W - 1, x * MS + 6)] > 30 ? pk(20, 110, 140) : MC[t];
    }
    mctx.putImageData(md, 0, 0);
    World.minimap = mc; World.MS = MS;
  };

  World.terrAt = (x, y) => {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= W || y >= H) return WATER;
    return World.terr[y * W + x];
  };
  World.solidAt = (x, y) => {
    const cx = Math.floor(x / World.CS), cy = Math.floor(y / World.CS);
    if (cx < 0 || cy < 0 || cx >= World.CW || cy >= World.CH) return true;
    return World.solid[cy * World.CW + cx] === 1;
  };
})();
