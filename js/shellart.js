// The eight shells of the beaches, each painted pixel by pixel from a description of the real thing, so the
// same shell comes out crisp at any size: 32x32 for the purse and Makani's counter, 16x16 lying on the sand.
//
//   clam     a ribbed venus clam: a fan from the hinge, radial ribs, cream with rose-brown growth bands
//   auger    the lance auger: a long needle spire of many whorls, cream with a brown band under each suture
//   limpet   the Hawaiian ʻopihi from above: a low ribbed dome, dark olive between pale ribs, a worn apex
//   cone     the leopard cone: a low stepped spire on a glossy white cone, rows of dark square spots
//   triton   the Nicobar triton: a spindle with knobbed spiral cords, orange-brown, white varices, a toothed lip
//   miter    the episcopal miter: a tall glossy white spindle with rows of orange-red squares
//   helmet   the horned helmet: a heavy rounded shell crowned with horns, mottled, an orange shield beneath
//   trumpet  Triton's trumpet: a long fat spire scaled in brown crescents, its flared mouth orange with dark teeth
//
// Light comes from the upper left. Each shell is shaded across its own form, given a glint where it is
// glossy, and outlined in a darker tone of its own colour (darkest on the shadow side).
(function () {
  const SA = (window.ShellArt = {});
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const ramp = (cs, t) => { t = clamp01(t) * (cs.length - 1); const i = Math.min(cs.length - 2, Math.floor(t)); return lerp(cs[i], cs[i + 1], t - i); };
  const hash = (a, b, s) => { let h = (a * 374761393 + b * 668265263 + (s || 0) * 982451653) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };
  const fract = (v) => v - Math.floor(v);
  // light on a rounded form: `a` runs -1..1 across it (negative = toward the light), `b` along it
  const lit = (a, b, gloss) => { const l = 0.88 - a * 0.26 - (b || 0) * 0.06; return gloss && a > -0.62 && a < -0.34 ? l + 0.2 : l; };

  // a long spire along a line from the mouth (x0,y0) to the apex (x1,y1): returns its frame at (x, y)
  function spire(x, y, x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const s = ((x - x0) * ux + (y - y0) * uy) / L, v = (x - x0) * -uy + (y - y0) * ux;   // v > 0: the upper-left side
    return { s, v };
  }

  const SHELLS = {
    clam(x, y) {
      // a rounded venus clam: an oval body with the beak of the hinge rising at the top; ribs fan out from the
      // hinge, growth bands ring it, and the lower margin is finely scalloped
      const hx = 0.5, hy = 0.15, ex = (x - 0.5) / 0.45, ey = (y - 0.57) / 0.37, rr = Math.hypot(ex, ey);
      const th = Math.atan2(x - hx, y - hy), scal = 1 + 0.02 * Math.cos(th * 22) * clamp01(ey * 2);
      const beak = y > 0.12 && y < 0.36 && Math.abs(x - 0.5) < (y - 0.1) * 0.75;
      if (rr > scal && !beak) return null;
      const t = clamp01(Math.hypot(x - hx, y - hy) / 0.78), rib = Math.cos(th * 22);
      let c = ramp([[250, 240, 222], [240, 220, 188], [226, 196, 158]], t);
      const band = Math.sin(t * 24 + Math.sin(th * 3) * 0.5);
      if (band > 0.74) c = lerp(c, [176, 104, 84], 0.55); else if (band > 0.48) c = lerp(c, [206, 146, 118], 0.28);
      if (Math.cos(th * 4 + 0.5) > 0.86) c = lerp(c, [168, 104, 84], 0.28);         // faint rays
      if (t < 0.12) c = [250, 242, 228];                                              // the pale beak
      const h = Math.sqrt(Math.max(0, 1 - Math.min(1, rr) ** 2));
      c = mul(c, 0.74 + 0.26 * h + rib * 0.06 - (x - 0.5) * 0.32 - (y - 0.5) * 0.16);
      if (rr > 0.9 * scal) c = mul(c, 0.84);                                          // the lip
      return c;
    },
    auger(x, y) {
      const { s, v } = spire(x, y, 0.2, 0.84, 0.86, 0.1);
      let w = 0.118 * Math.pow(Math.max(0, 1 - s), 0.9) + 0.012;
      if (s < 0.1) w *= Math.sqrt(Math.max(0, 1 - ((0.1 - s) / 0.12) ** 2));
      if (s < -0.02 || s > 1 || Math.abs(v) > w) return null;
      const a = -v / w, k = s * 11 + a * 0.25, f = fract(k);
      let c = [236, 222, 194];
      if (f < 0.09) c = [112, 70, 46];                                             // the suture
      else if (f < 0.34) { c = [168, 110, 70]; if (hash(Math.floor(k), Math.floor(a * 3 + 3), 2) > 0.6) c = [128, 80, 52]; }
      else if (Math.cos(s * 140) > 0.7) c = mul(c, 0.92);                         // fine axial ribs
      if (s < 0.08 && a > 0.1) c = [110, 72, 50];                                  // into the mouth
      return mul(c, lit(a, 0, true));
    },
    limpet(x, y) {
      const cx = 0.5, cy = 0.54, ex = (x - cx) / 0.42, ey = (y - cy) / 0.34, th = Math.atan2(ey, ex), rr = Math.hypot(ex, ey);
      const edge = 1 + 0.055 * Math.cos(th * 16);
      if (rr > edge) return null;
      const ax = 0.46, ay = 0.47, ph = Math.atan2(y - ay, x - ax), d = Math.hypot(x - ax, y - ay), rib = Math.cos(ph * 16);
      let c = rib > 0.25 ? [208, 190, 146] : rib > -0.3 ? [150, 130, 92] : [92, 78, 54];
      if (Math.sin(d * 70) > 0.8) c = mul(c, 0.86);                               // growth lines
      if (d < 0.07) c = [236, 224, 198];                                           // the worn apex
      else if (d < 0.1) c = lerp(c, [236, 224, 198], 0.5);
      const h = Math.sqrt(Math.max(0, 1 - (rr / edge) ** 2));
      c = mul(c, 0.62 + 0.42 * h - (x - cx) * 0.45 - (y - cy) * 0.35);
      if (rr > edge * 0.9) c = lerp(c, [60, 50, 36], 0.4);
      return c;
    },
    cone(x, y) {
      const top = 0.1, sh = 0.27, tip = 0.94;
      let hw;
      if (y < top || y > tip) return null;
      if (y < sh) hw = 0.37 * Math.pow((y - top) / (sh - top), 0.55);
      else { const u = (y - sh) / (tip - sh); hw = 0.37 * Math.pow(1 - u, 1.1) * (1 + 0.1 * Math.sin(Math.PI * u)) + 0.01; }
      const a = (x - 0.5) / hw; if (Math.abs(a) > 1) return null;
      let c;
      if (y < sh) {
        // the low spire: whorl lines spiralling to the point, flecked with brown
        const r = Math.hypot((x - 0.5) / 0.37, (y - sh) / (sh - top)), f = fract(r * 5 + Math.atan2(y - sh, x - 0.5) * 0.25);
        c = f < 0.18 ? [150, 110, 80] : hash(Math.floor(x * 30), Math.floor(y * 30), 4) > 0.82 ? [110, 70, 46] : [240, 232, 214];
        return mul(c, 0.95 - a * 0.15);
      }
      c = [246, 240, 226];
      // rows of squarish leopard spots, offset row to row
      const rows = (y - sh) * 13, row = Math.floor(rows), fr = fract(rows), col = a * 3.8 + (row % 2) * 0.5, fc = fract(col);
      if (fr > 0.16 && fr < 0.8 && fc > 0.16 && fc < 0.84 && hash(Math.floor(col), row, 7) > 0.28) c = hash(Math.floor(col), row, 8) > 0.5 ? [62, 40, 30] : [92, 58, 40];
      return mul(c, lit(a, (y - 0.5) * 0.5, true));
    },
    triton(x, y) {
      // a fusiform shell, its siphonal canal bending a little left at the foot
      if (y < 0.04 || y > 0.97) return null;
      let hw, cx = 0.5;
      if (y < 0.4) hw = 0.02 + 0.23 * ((y - 0.04) / 0.36);
      else if (y < 0.8) hw = 0.25 + 0.09 * Math.sin(Math.PI * (y - 0.4) / 0.4);
      else { hw = 0.25 * Math.pow(1 - (y - 0.8) / 0.17, 1.4) + 0.035; cx = 0.5 - (y - 0.8) * 0.4; }
      const cord = Math.cos(y * 64);
      if (y > 0.2 && y < 0.85) hw *= 1 + 0.07 * Math.max(0, cord);                // knobbed spiral cords
      const a = (x - cx) / hw; if (Math.abs(a) > 1) return null;
      let c = [204, 120, 64];
      if (cord > 0.45) c = [236, 170, 102];
      if (hash(Math.floor(y * 18), Math.floor(a * 4 + 4), 3) > 0.7) c = lerp(c, [116, 58, 34], 0.6);
      // whorl steps on the spire
      if (y < 0.42 && fract(y * 9) < 0.12) c = [104, 52, 32];
      // a white varix down the left of the body, and the mouth on the right with its white teeth
      if (y > 0.3 && y < 0.8 && a > -0.7 && a < -0.56) c = lerp(c, [246, 234, 212], 0.75);
      const mouth = y > 0.5 && y < 0.83 && a > 0.48;
      if (mouth) { c = [250, 236, 216]; if (a < 0.62 && fract(y * 34) < 0.38) c = [140, 78, 48]; if (a > 0.9) c = [226, 176, 120]; }
      return mul(c, lit(mouth ? a * 0.3 : a, 0, false));
    },
    miter(x, y) {
      if (y < 0.03 || y > 0.97) return null;
      let hw;
      if (y < 0.72) hw = 0.025 + 0.185 * Math.pow(Math.sin(Math.PI / 2 * (y - 0.03) / 0.69), 1.25);
      else hw = 0.21 * Math.pow(1 - (y - 0.72) / 0.25, 1.15) + 0.025;
      const k = y * 12, f = fract(k);
      if (y < 0.6 && f < 0.12) hw *= 0.88;                                         // stepped whorls
      const a = (x - 0.5) / hw; if (Math.abs(a) > 1) return null;
      let c = [248, 246, 238];
      if (y < 0.6 && f < 0.1) c = [190, 176, 160];
      const rows = y * 15, row = Math.floor(rows), fr = fract(rows), col = a * 3 + (row % 2) * 0.5, fc = fract(col);
      if (fr > 0.24 && fr < 0.76 && fc > 0.2 && fc < 0.8 && hash(Math.floor(col), row, 11) > 0.3) c = hash(row, Math.floor(col), 12) > 0.5 ? [214, 70, 38] : [232, 104, 52];
      // the narrow mouth with its pleated columella
      if (y > 0.62 && y < 0.92 && a > 0.35 && a < 0.62) c = fract(y * 30) < 0.5 ? [150, 84, 60] : [236, 208, 180];
      return mul(c, lit(a, 0, true));
    },
    helmet(x, y) {
      const cx = 0.5, cy = 0.58, ex = (x - cx) / 0.42, ey = (y - cy) / 0.36, rr = Math.hypot(ex, ey);
      // the crown of horns along the shoulder
      // [x, foot y, height, half-width at the foot]: blunt pointed horns along the shoulder
      const HORNS = [[0.24, 0.33, 0.1, 0.055], [0.4, 0.25, 0.13, 0.06], [0.58, 0.23, 0.14, 0.06], [0.76, 0.29, 0.1, 0.05]];
      let horn = -1;
      for (const [hx, hb, hh, hw] of HORNS) { const u = (y - (hb - hh)) / hh; if (u > 0 && u < 1.3 && Math.abs(x - hx) < hw * Math.min(1, u + 0.15)) { horn = clamp01(1 - u); break; } }
      if (rr > 1 && horn < 0) return null;
      if (horn >= 0 && rr > 0.92) return mul(lerp([250, 238, 214], [204, 170, 128], horn), 1.02 - (x - 0.5) * 0.5);
      let c = [234, 218, 190];
      // dorsal mottling in brown zigzags, and the spiral ribs
      const zig = Math.sin(x * 34 + Math.sin(y * 22) * 2.4);
      if (zig > 0.55) c = [158, 104, 68]; else if (zig > 0.2) c = [196, 150, 106];
      if (Math.cos(y * 52) > 0.82) c = mul(c, 0.9);
      // the bright orange shield showing below
      if (ey > 0.62) { c = lerp([238, 150, 82], [252, 206, 150], clamp01((ey - 0.62) * 2)); if (fract(x * 16) < 0.25 && ey > 0.78) c = [120, 56, 32]; }
      const h = Math.sqrt(Math.max(0, 1 - rr * rr));
      return mul(c, 0.66 + 0.36 * h - (x - cx) * 0.4 - (y - cy) * 0.3);
    },
    trumpet(x, y) {
      const { s, v } = spire(x, y, 0.27, 0.86, 0.86, 0.08);
      let w = 0.23 * Math.pow(Math.max(0, 1 - s), 0.95) + 0.014;
      if (s < 0.16) w *= Math.sqrt(Math.max(0, 1 - ((0.16 - s) / 0.2) ** 2));
      if (s < -0.04 || s > 1 || Math.abs(v) > w) return null;
      const a = -v / w, k = s * 7.5 + a * 0.22, f = fract(k), whorl = Math.floor(k);
      let c = [242, 228, 202];
      // rows of brown crescents, darker at their tops, like scales
      const cu = fract(a * 2.6 + whorl * 0.5), inC = f > 0.14 && f < 0.82 && Math.abs(cu - 0.5) < 0.36;
      if (inC) { const g = (f - 0.14) / 0.68; c = g < 0.35 ? [96, 54, 40] : g < 0.7 ? [150, 88, 56] : [196, 146, 104]; }
      if (f < 0.1) c = [100, 64, 44];                                              // the suture
      // the flared mouth: orange, ridged with dark teeth, a pale lip
      if (s < 0.24 && a > 0.05) { c = [240, 150, 74]; if (a > 0.5) c = fract(s * 40) < 0.45 ? [78, 40, 30] : [248, 232, 214]; }
      return mul(c, lit(a, 0, true) * (s < 0.24 && a > 0.05 ? 1.05 : 1));
    },
  };

  // paint one shell at N x N: supersampled 3x3 per pixel and the most common colour kept (crisp, no blur),
  // then outlined
  SA.draw = function (k, N) {
    const fn = SHELLS[k]; if (!fn) return null;
    const c = document.createElement("canvas"); c.width = c.height = N;
    const x = c.getContext("2d"), im = x.createImageData(N, N), d = im.data, cols = new Array(N * N).fill(null);
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      let hits = 0, acc = [0, 0, 0];
      for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) { const v = fn((px + (sx + 0.5) / 3) / N, (py + (sy + 0.5) / 3) / N); if (v) { hits++; acc[0] += v[0]; acc[1] += v[1]; acc[2] += v[2]; } }
      if (hits >= 5) { const ctr = fn((px + 0.5) / N, (py + 0.5) / N) || [acc[0] / hits, acc[1] / hits, acc[2] / hits]; cols[py * N + px] = N >= 24 ? ctr : lerp(ctr, [acc[0] / hits, acc[1] / hits, acc[2] / hits], 0.5); }
    }
    // the outline: a deep tone of the shell's own colour, darkest on the side away from the light
    const out = cols.slice();
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      if (cols[py * N + px]) continue;
      let nb = null, nx = 0, ny = 0;
      for (const [ddx, ddy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const qx = px + ddx, qy = py + ddy; if (qx < 0 || qy < 0 || qx >= N || qy >= N) continue; const q = cols[qy * N + qx]; if (q) { nb = q; nx += ddx; ny += ddy; } }
      if (!nb) continue;
      const shadow = nx < 0 || ny < 0;                                             // the shell lies to our upper left: we are its lower-right edge
      out[py * N + px] = lerp(mul(nb, shadow ? 0.32 : 0.48), [36, 22, 18], shadow ? 0.5 : 0.35);
    }
    for (let i = 0; i < N * N; i++) { const v = out[i]; if (!v) continue; d[i * 4] = Math.max(0, Math.min(255, v[0])); d[i * 4 + 1] = Math.max(0, Math.min(255, v[1])); d[i * 4 + 2] = Math.max(0, Math.min(255, v[2])); d[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0);
    return c;
  };
  SA.KINDS = Object.keys(SHELLS);
})();
