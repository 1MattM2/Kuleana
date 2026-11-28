// Shards and consumables painted per pixel at any size, in the same way as the shells (js/shellart.js):
// supersampled shapes, form shading lit from the upper left, glints, and a shaded outline of their own colour.
//   shards   a faceted crystal of the element's colour, with an inner glow and a little of its nature in it
//   tonic    a gourd flask of red ʻōhelo-berry tonic, a koa stopper and a cord
//   salve    a coconut-shell bowl of golden salve, a leaf tied over half of it
//   talisman a carved bone pendant on a cord, inlaid with its element's colour
(function () {
  const IA = (window.ItemArt = {});
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
  const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const fract = (v) => v - Math.floor(v);

  function shard(col) {
    const C = hex(col), dark = mul(C, 0.38), light = lerp(C, [255, 255, 255], 0.55);
    // a tall crystal: a point at the top, facets meeting on a central ridge, a broken base, and a small
    // second crystal leaning against it
    return (x, y) => {
      const body = (cx, top, bot, hw, x0, y0) => { if (y0 < top || y0 > bot) return null; const u = (y0 - top) / (bot - top), w = hw * (u < 0.28 ? u / 0.28 : 1 - (u - 0.28) * 0.25); const a = (x0 - cx) / w; return Math.abs(a) <= 1 ? { a, u } : null; };
      let f = body(0.55, 0.06, 0.94, 0.2, x, y), small = false;
      if (!f) { const g = body(0.27, 0.42, 0.94, 0.12, x + (y - 0.6) * 0.25, y); if (g) { f = g; small = true; } }
      if (!f) return null;
      // facets: left lit, right shaded, the ridge bright; bands of inner light
      let c = f.a < -0.15 ? lerp(C, light, 0.35) : f.a > 0.35 ? lerp(C, dark, 0.45) : C;
      if (Math.abs(f.a + 0.05) < 0.14) c = light;
      if (f.u < 0.28 && f.a < 0) c = lerp(c, [255, 255, 255], 0.3);
      if (!small && Math.abs(fract(f.u * 3.2 + f.a * 0.6) - 0.5) < 0.06) c = lerp(c, light, 0.5);
      if (small) c = mul(c, 0.82);
      if (f.u > 0.9) c = mul(c, 0.7);
      return c;
    };
  }
  const SHAPES = {
    tonic(x, y) {
      // the gourd: a round body and a smaller neck bulb, cord round the waist
      const b1 = ((x - 0.5) / 0.32) ** 2 + ((y - 0.66) / 0.28) ** 2, b2 = ((x - 0.5) / 0.17) ** 2 + ((y - 0.32) / 0.14) ** 2;
      if (y > 0.06 && y < 0.2 && Math.abs(x - 0.5) < 0.08) return y < 0.1 ? [150, 98, 56] : [118, 72, 40];   // the koa stopper
      if (b1 > 1 && b2 > 1) return null;
      const inner = b1 <= 1 ? Math.sqrt(1 - b1) : Math.sqrt(1 - b2), lx = (x - 0.5) / 0.32, ly = (y - 0.6) / 0.3;
      let c = lerp([120, 22, 40], [226, 70, 84], 0.3 + inner * 0.5 - lx * 0.25 - ly * 0.2);
      if (y > 0.43 && y < 0.48) c = [70, 46, 34];                                               // cord
      if (lx < -0.35 && ly < -0.1 && ly > -0.6 && inner > 0.55) c = [255, 210, 214];          // glint
      return c;
    },
    salve(x, y) {
      // a half coconut shell bowl, golden salve heaped in it, a green leaf folded over one side
      const rim = 0.48, bowl = ((x - 0.5) / 0.4) ** 2 + ((y - rim) / 0.36) ** 2;
      const top = ((x - 0.5) / 0.38) ** 2 + ((y - rim) / 0.12) ** 2;
      const leaf = ((x - 0.38) / 0.2) ** 2 + ((y - 0.42 + (x - 0.38) * 0.4) / 0.08) ** 2;
      if (leaf < 1 && y < rim + 0.04) { const vein = Math.abs(y - 0.42 + (x - 0.38) * 0.4) < 0.012; return vein ? [180, 224, 120] : x < 0.38 ? [96, 170, 70] : [62, 128, 50]; }
      if (top < 1 && y < rim + 0.02) { const h = 1 - top; return lerp([206, 150, 52], [255, 232, 150], h * 0.8 - (x - 0.5) * 0.6); }
      if (bowl > 1 || y < rim) return null;
      const lx = (x - 0.5) / 0.4, hair = fract(x * 22 + y * 6) < 0.18;
      let c = lerp([70, 42, 26], [150, 98, 58], 0.55 - lx * 0.45 - (y - rim) * 0.6);
      if (hair) c = mul(c, 0.82);
      return c;
    },
    talisman(x, y, col) {
      const C = hex(col);
      // the cord over the top
      if (y < 0.3 && Math.abs(Math.hypot(x - 0.5, (y - 0.32) * 1.2) - 0.24) < 0.03) return [92, 60, 40];
      // a carved bone hook (makau), its shank inlaid with the element
      const ring = Math.hypot((x - 0.5) / 0.3, (y - 0.62) / 0.3), body = ring < 1 && ring > 0.5 && !(x > 0.6 && y < 0.62);
      const bail = ((x - 0.5) / 0.1) ** 2 + ((y - 0.3) / 0.08) ** 2 < 1;
      if (!body && !bail) return null;
      let c = lerp([206, 190, 158], [248, 240, 218], 0.6 - (x - 0.5) * 1.2 - (y - 0.5) * 0.6);
      if (body && Math.abs(ring - 0.75) < 0.1) c = lerp(C, [255, 255, 255], (x < 0.5 && y < 0.7) ? 0.35 : 0);
      if (x > 0.7 && y < 0.72 && y > 0.62) c = mul(c, 0.8);
      return c;
    },
  };
  function paint(fn, N) {
    const c = document.createElement("canvas"); c.width = c.height = N;
    const x = c.getContext("2d"), im = x.createImageData(N, N), d = im.data, cols = new Array(N * N).fill(null);
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      let hits = 0, acc = [0, 0, 0];
      for (let sy = 0; sy < 3; sy++) for (let sx = 0; sx < 3; sx++) { const v = fn((px + (sx + 0.5) / 3) / N, (py + (sy + 0.5) / 3) / N); if (v) { hits++; acc[0] += v[0]; acc[1] += v[1]; acc[2] += v[2]; } }
      if (hits >= 5) cols[py * N + px] = fn((px + 0.5) / N, (py + 0.5) / N) || [acc[0] / hits, acc[1] / hits, acc[2] / hits];
    }
    const out = cols.slice();
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      if (cols[py * N + px]) continue;
      let nb = null, sh = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= N || qy >= N) continue; const q = cols[qy * N + qx]; if (q) { nb = q; if (dx < 0 || dy < 0) sh = true; } }
      if (nb) out[py * N + px] = lerp(mul(nb, sh ? 0.3 : 0.45), [30, 18, 22], 0.4);
    }
    for (let i = 0; i < N * N; i++) { const v = out[i]; if (!v) continue; d[i * 4] = Math.min(255, Math.max(0, v[0])); d[i * 4 + 1] = Math.min(255, Math.max(0, v[1])); d[i * 4 + 2] = Math.min(255, Math.max(0, v[2])); d[i * 4 + 3] = 255; }
    x.putImageData(im, 0, 0); return c;
  }
  const cache = {};
  IA.shard = (el, N) => { const k = "s" + el + N; return cache[k] || (cache[k] = paint(shard(Gear.ELEMENTS[el].col), N)); };
  IA.item = (id, N) => {
    const k = "i" + id + N; if (cache[k]) return cache[k];
    if (id === "tonic" || id === "salve") return (cache[k] = paint(SHAPES[id], N));
    const T = Gear.TALISMANS[id]; return (cache[k] = paint((x, y) => SHAPES.talisman(x, y, Gear.ELEMENTS[T.el].col), N));
  };
})();
