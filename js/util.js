// Shared helpers: seeded randomness, value noise, canvas + pixel utilities.
(function () {
  const K = (window.K = {});
  K.TILE = 32;

  // ---- deterministic hash / rng
  K.hash2 = function (x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul((s | 0) + 1, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
  K.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  // ---- tileable value noise (256x256 lattice)
  const NS = 256, NM = NS - 1;
  const lattice = new Float32Array(NS * NS);
  (function () {
    const r = K.rng(1337);
    for (let i = 0; i < lattice.length; i++) lattice[i] = r();
  })();
  K.noise = function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    let fx = x - xi, fy = y - yi;
    fx = fx * fx * (3 - 2 * fx);
    fy = fy * fy * (3 - 2 * fy);
    const x0 = xi & NM, y0 = yi & NM, x1 = (x0 + 1) & NM, y1 = (y0 + 1) & NM;
    const a = lattice[y0 * NS + x0], b = lattice[y0 * NS + x1];
    const c = lattice[y1 * NS + x0], d = lattice[y1 * NS + x1];
    return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
  };
  K.fbm = function (x, y, oct) {
    let s = 0, amp = 0.5, f = 1, norm = 0;
    for (let i = 0; i < (oct || 3); i++) {
      s += K.noise(x * f + i * 31.7, y * f - i * 17.3) * amp;
      norm += amp; amp *= 0.5; f *= 2.03;
    }
    return s / norm;
  };

  K.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  K.lerp = (a, b, t) => a + (b - a) * t;
  K.smooth = (t) => t * t * (3 - 2 * t);

  // ---- canvas helpers
  K.canvas = function (w, h) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    return [c, ctx];
  };
  K.loadImage = (src) =>
    new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = src;
    });
  // Returns {w,h,data:Uint32Array} for per-pixel sampling (ABGR on little endian).
  K.pixels = function (img) {
    const [c, ctx] = K.canvas(img.width, img.height);
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, img.width, img.height);
    return { w: img.width, h: img.height, data: new Uint32Array(d.data.buffer), canvas: c };
  };
  K.flipped = function (img) {
    const [c, ctx] = K.canvas(img.width, img.height);
    ctx.translate(img.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0);
    return c;
  };
  // Draw a '.'-transparent string pixel map.
  K.pixmap = function (ctx, rows, pal, ox, oy, mirror, width) {
    const W = width || 24;
    for (let y = 0; y < rows.length; y++) {
      let r = rows[y];
      for (let x = 0; x < r.length; x++) {
        const ch = r[x];
        if (ch === "." || ch === " ") continue;
        const p = pal[ch];
        if (!p) continue;
        ctx.fillStyle = `rgb(${p[0]},${p[1]},${p[2]})`;
        ctx.fillRect(ox + (mirror ? W - 1 - x : x), oy + y, 1, 1);
      }
    }
  };
  K.rgb = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r; // little-endian ABGR pack
  K.unpack = (v) => [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, v >>> 24];
  K.css = (c, a) => (a === undefined ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`);

  // One wind for the whole island, blowing from the sea (west) to the east. Every tree and
  // plant reads the same shared state, so they all lean the same way at the same moment:
  // a steady breeze, with gusts that build, peak and die away.
  K.windStrength = function (t) {
    const base = 0.3 + 0.08 * Math.sin(t * 0.23) + 0.04 * Math.sin(t * 0.61 + 1);
    let g1 = Math.sin(t * 0.42 + Math.sin(t * 0.11) * 2);
    g1 = g1 > 0.25 ? ((g1 - 0.25) / 0.75) ** 2 : 0;
    let g2 = Math.sin(t * 0.17 + 2);
    g2 = g2 > 0.55 ? ((g2 - 0.55) / 0.45) ** 2 : 0;
    return K.clamp(base + g1 * 0.5 + g2 * 0.3, 0, 1);
  };
  K.wind = (t) => K.windStrength(t) * 1.4 - 0.3; // signed version for particles
  // shared lean: a gently underdamped spring chasing the wind strength (updated once a frame)
  const W = (K.W = { x: 0.3, v: 0, t: 0, s: 0.3 });
  K.updateWind = function (t, dt) {
    const s = K.windStrength(t);
    W.s = s;
    W.v += (9 * (s - W.x) - 2 * Math.sqrt(9) * 0.45 * W.v) * dt;
    W.x += W.v * dt;
    W.t = t;
  };
  // Frame choice for a swaying object: shared lean level (same for everything), plus its own
  // occasional leaf flicker. Returns {level, flutter, strength}.
  K.sway = function (o, t, x, y, k, levels, flutters) {
    const cont = K.clamp(((W.x + 0.25) / 1.25) * (levels - 1), 0, levels - 1);
    if (o._f === undefined || Math.abs(cont - o._f) > 0.55) o._f = Math.round(cont);
    const dt = o._t === undefined ? 0 : Math.min(0.05, Math.max(0, t - o._t));
    o._t = t;
    if (o._ph === undefined) { o._ph = ((x * 0.137 + y * 0.071) % 1 + 1) % 1; o._fl = 0; }
    o._ph += dt * (0.5 + 2.6 * W.s);
    if (o._ph >= 1) { o._ph -= Math.floor(o._ph); const n = flutters || 1; if (n > 1) o._fl = (o._fl + 1 + ((Math.random() * (n - 1)) | 0)) % n; }
    return { level: o._f, flutter: o._fl, strength: W.s };
  };
})();
