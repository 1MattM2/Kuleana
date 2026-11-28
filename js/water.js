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
  function tideAt(t, wx, wy) {
    let ph = t * 0.12 + wx * 0.0032 + wy * 0.0024 + K.noise(wx * 0.012, wy * 0.012) * 0.35;
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
        out[row + x] = c;
      }
    }
    ctx.putImageData(img, 0, 0);
    dst.drawImage(canvas, 0, 0);
    // shadows under the surface: a school of fish wheeling, and a whale shark gliding by
    dst.fillStyle = "rgba(4,22,44,0.42)";
    for (let k = 0; k < 2; k++) {
      const cx = ((k * 300 + t * 14) % (vw + 200)) - 100, cy = vh * (0.3 + k * 0.4) + Math.sin(t * 0.4 + k) * 20;
      for (let f2 = 0; f2 < 14; f2++) { const a = t * 0.9 + f2 * 0.45 + k, r = 10 + (f2 % 5) * 4; dst.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r * 0.6), 3, 1); }
    }
    const sx = ((t * 9) % (vw + 260)) - 130, sy = vh * 0.62 + Math.sin(t * 0.13) * 30;
    dst.fillStyle = "rgba(4,20,40,0.3)";
    for (let i = 0; i < 46; i++) { const u = i / 46, w = Math.sin(Math.min(1, u * 1.3) * Math.PI) * 7 + 1, sw = Math.sin(t * 1.4 - u * 4) * u * 4; dst.fillRect(Math.round(sx - i * 1.6), Math.round(sy + sw - w / 2), 2, Math.round(w)); }
    for (const sg of [-1, 1]) dst.fillRect(Math.round(sx - 14), Math.round(sy + sg * 9), 6, 2);
    dst.fillRect(Math.round(sx - 74 + Math.sin(t * 1.4) * 2), Math.round(sy - 6 + Math.sin(t * 1.4 - 4) * 4), 3, 12);
  };

  // `Wd` is the water map to draw: the island (World) by default, or a sea level's own (js/sea.js)
  Water.render = function (dst, camX, camY, vw, vh, t, Wd) {
    ensure(vw, vh);
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
              const ph = Wd.sea ? (wx * 0.45 + wy) * 0.021 + d * 0.012 + t * 0.1 + K.noise(wx * 0.012, wy * 0.012) * 0.8 : d * 0.034 + t * 0.1 + K.noise(wx * 0.012, wy * 0.012) * 0.7;
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
