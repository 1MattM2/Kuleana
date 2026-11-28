// The Moʻolelo of Beasts (the bestiary, in the menu's Bestiary tab): the creatures you have met down the left,
// and on the right the one you pick, alive in its own ground: geckos and snakes on the jungle grass, the
// tribe's tikis on temple stone, fire creatures on cracked volcanic rock with embers rising, crabs on the
// sand by the surf, the spider crab on its pink coral, sharks and rays circling in open water (the thermal
// shark over a glowing vent), the pueo on its cliff. Each is the game's own creature, drawn by its own
// renderer and animated the way a co-op partner's screen animates it (no AI: it paces, circles, breathes).
// Bosses get a stage twice the size, drawn at full scale.
(function () {
  const B = (window.Bestiary = {});
  const ENV = {
    gecko: "grass", vine: "grass", snake: "grass", runner: "grass", hydra: "grass",
    wisp: "lava", firegecko: "lava", hive: "lava", firedancer: "stone",
    spear: "stone", dart: "stone", brute: "stone",
    crab: "sand", spitcrab: "sand", spidercrab: "coral",
    shark: "water", bigshark: "water", tshark: "vent", ray: "water", giantray: "water",
    pueo: "cliff",
  };
  // how each one moves on its stage
  const SWIM = { shark: 1, bigshark: 1, tshark: 1, ray: 1, giantray: 1 };
  const STILL = { vine: 1, hydra: 1, hive: 1, wisp: 1, pueo: 1, spidercrab: 1 };
  const SMALL = [160, 110], BIG = [320, 220];

  let cv = null, cx = null, sel = null, e = null, L = null, raf = 0, last = 0, bgC = null, bgKey = "";
  const tex = (n) => { const A = Level.assets(); return A && A.px[n]; };
  const sampler = (n) => { const T = tex(n); if (!T) return () => 0xff3a5a2a; const w = T.w, h = (T.data.length / w) | 0; return (x, y) => T.data[(((y % h) + h) % h) * w + (((x % w) + w) % w)]; };
  const shade = (c, f) => { const r = Math.min(255, (c & 255) * f) | 0, g = Math.min(255, ((c >>> 8) & 255) * f) | 0, b = Math.min(255, ((c >>> 16) & 255) * f) | 0; return (255 << 24) | (b << 16) | (g << 8) | r; };
  const pk = (r, g, b) => (255 << 24) | (b << 16) | (g << 8) | r;

  // the ground, painted once per creature (the water is painted live)
  function background(env, W, H) {
    const [c, x] = K.canvas(W, H), im = x.createImageData(W, H), d = new Uint32Array(im.data.buffer);
    const grass = sampler("tex_grass"), rock = sampler("tex_rock"), glyph = sampler("tex_glyph"), sand = sampler("tex_sand"), shells = sampler("tex_sand_shells"), pink = sampler("tex_pinkcoral");
    const CORAL = [pk(160, 104, 120), pk(184, 126, 140), pk(204, 148, 158), pk(220, 168, 174), pk(234, 190, 190)];
    for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) {
      let v = 0; const n = K.fbm(xx / 40 + 7, y / 40, 2);
      if (env === "grass") { v = shade(grass(xx, y), 0.84); if (n < 0.4) v = shade(v, 0.82); else if (n > 0.64) v = shade(v, 1.08); if (y < 14 + Math.sin(xx * 0.3) * 3 + K.noise(xx * 0.2, 3) * 6) v = shade(grass(xx + 17, y + 9), 0.55); }
      else if (env === "stone") { v = glyph(xx, y); if (n < 0.42) v = shade(v, 0.88); if (K.noise(xx * 0.12, y * 0.12) > 0.8 && K.hash2(xx, y, 3) > 0.7) v = pk(86, 120, 52); }
      else if (env === "lava" || env === "cliff") {
        v = shade(rock(xx, y), env === "lava" ? 0.62 : 0.9);
        if (env === "lava") { const crack = Math.abs(K.noise(xx / 22, y / 22) - 0.5); if (crack < 0.008) v = pk(255, 170, 60); else if (crack < 0.018) v = pk(214, 80, 34); else if (crack < 0.03) v = shade(v, 1.25); }
        else if (y < 22 + K.noise(xx * 0.15, 5) * 8) v = shade(grass(xx, y), y < 18 ? 0.9 : 0.75);
      } else if (env === "sand") {
        v = K.hash2(xx >> 3, y >> 3, 4) > 0.8 ? shells(xx, y) : sand(xx, y); if (n < 0.4) v = shade(v, 0.92);
        // the surf along the top: wet sand darkening toward a line of foam and the shallows beyond
        const sh = 18 + Math.sin(xx * 0.08) * 4 + K.noise(xx * 0.1, 2) * 4;
        if (y < sh - 6) v = (xx + y) & 1 ? pk(64, 196, 196) : pk(90, 212, 204); else if (y < sh - 3) v = pk(236, 250, 246); else if (y < sh + 6) v = shade(v, 0.8 + (y - sh + 3) * 0.02);
      }
      else if (env === "coral") {
        const p = pink(xx, y), tl = ((p & 255) * 0.3 + ((p >>> 8) & 255) * 0.59 + ((p >>> 16) & 255) * 0.11 - 70) / 170;
        const cvv = (K.fbm(xx / 52 + 3, y / 52, 3) * 0.75 + K.noise(xx / 13 + 9, y / 13) * 0.25) * 0.55 + tl * 0.45 + PAL.bayer(xx, y) * 0.06;
        v = CORAL[Math.max(0, Math.min(4, Math.floor((cvv - 0.2) * 7.5)))];
      }
      d[y * W + xx] = v;
    }
    x.putImageData(im, 0, 0);
    if (env === "grass" || env === "cliff") {
      const A = Level.assets(), f = A && A.img.flora_fern, m = A && A.img.flora_monstera;
      if (f) { x.drawImage(f, -f.width * 0.35, H - f.height * 0.8); x.save(); x.translate(W, 0); x.scale(-1, 1); x.drawImage(f, -f.width * 0.3, H - f.height * 0.7); x.restore(); }
      if (m && env === "grass" && W > 200) x.drawImage(m, W * 0.08, H * 0.12);
    }
    return c;
  }
  // open water: the water tile's own pattern drifting two ways over a depth gradient, swells and glints
  let wIm = null, wC = null, wX = null, lvl = null, TW = 32;
  function water(ctx, W, H, t, vent) {
    if (!wC || wC.width !== W || wC.height !== H) { [wC, wX] = K.canvas(W, H); wIm = wX.createImageData(W, H); }
    if (!lvl) { const T = tex("tex_water"); TW = T.w; const lum = Array.from(T.data, (c) => (c & 255) * 0.3 + ((c >>> 8) & 255) * 0.59 + ((c >>> 16) & 255) * 0.11), s = lum.slice().sort((a, b) => a - b), q = [s[(s.length * 0.62) | 0], s[(s.length * 0.86) | 0]]; lvl = lum.map((l) => (l < q[0] ? 0 : l < q[1] ? 1 : 2)); }
    const d = new Uint32Array(wIm.data.buffer), M = TW - 1, RAMP = [[pk(16, 102, 132), pk(22, 120, 148), pk(52, 160, 180)], [pk(20, 132, 158), pk(28, 150, 172), pk(76, 194, 204)]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const la = lvl[((x + (t * 5) | 0) & M) + (((y + (t * 2) | 0) & M) * TW)], lb = lvl[((M - ((x - t * 3) | 0)) & M) + (((y + 7 + t * 2.6) | 0) & M) * TW], lv = la > lb ? la : lb;
      const depth = K.fbm(x / 90 + 2, y / 90 + t * 0.01, 2) + PAL.bayer(x, y) * 0.06;
      let c = RAMP[depth > 0.5 ? 1 : 0][lv];
      const ph = (x * 0.4 + y) * 0.03 - t * 0.25, f = ph - Math.floor(ph); if (f < 0.05 && K.noise(x * 0.06, y * 0.06) > 0.55) c = pk(150, 226, 228);
      if (lv === 2 && K.hash2(x >> 1, y >> 1, (t * 2) | 0) > 0.996) c = pk(236, 252, 255);
      if (vent) { const r = Math.hypot(x - W / 2, (y - H * 0.62) / 0.6); if (r < 26) { const k = 1 - r / 26; c = shade(c, 1 + k * 0.5); if (r < 9 && K.hash2(x, y, (t * 8) | 0) > 0.7) c = pk(255, 190, 110); } }
      d[y * W + x] = c;
    }
    wX.putImageData(wIm, 0, 0); ctx.drawImage(wC, 0, 0);
  }

  function make(k) {
    const big = !!(Enemies.STATS[k] && Enemies.STATS[k].boss), [W, H] = big ? BIG : SMALL;
    cv.width = W; cv.height = H; cv.style.width = (big ? W : W * 2) + "px"; cv.style.height = (big ? H : H * 2) + "px";
    L = { enemies: [], shots: [], fx: [], name: "bestiary", def: {} };
    const baseY = SWIM[k] ? H * 0.56 : H * (big ? 0.72 : 0.74);
    e = Enemies.spawn(k, W / 2, baseY, 0, L); if (!e) return;
    e.introT = 0; e.alerted = false; e.hideBar = true; e.home = { x: W / 2, y: baseY };
    if (k === "giantray") e.form = 1;
    if (k === "pueo") { e.state = "perch"; e.z = 14; }
    if (SWIM[k] && e.hist) for (let i = 0; i < 40; i++) e.hist.push([e.x - i * 1.5, e.y]);
    L.enemies.push(e);
    bgKey = ENV[k] + W; bgC = ENV[k] === "water" || ENV[k] === "vent" ? null : background(ENV[k], W, H);
  }
  function frame(now) {
    raf = 0;
    if (!cv || !cv.isConnected || !(window.Menu && Menu.open && Menu.tab === "book")) return;
    const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0.016); last = t;
    const W = cv.width, H = cv.height, k = sel;
    if (e && k) {
      const h = e.home, big = W > 200;
      if (SWIM[k]) {
        // a slow lap of the stage
        const r = k === "giantray" ? 40 : big ? 90 : 46, a = t * (k === "ray" ? 0.7 : k === "giantray" ? 0.25 : 0.5);
        e.x = h.x + Math.cos(a) * r; e.y = h.y + Math.sin(a) * r * 0.45; e.va = a + Math.PI / 2; e.flp = (e.flp || 0) + dt; e.moving = true; e.state = e.state === "idle" ? "cruise" : e.state;
        if (k === "giantray") { e.state = "glide"; e.flap = (e.flap || 0) + dt * 2.4; }
      } else if (!STILL[k]) {
        // pacing to and fro with pauses, the way a creature idles
        const p = t * 0.45, v = Math.cos(p), go = Math.abs(v) > 0.35;
        e.x = h.x + Math.sin(p) * (big ? 50 : 34); e.face = v >= 0 ? 1 : -1; e.moving = go; e.state = go ? (k === "brute" ? "walk" : e.state === "idle" ? "idle" : e.state) : "idle";
      } else { e.moving = k === "spidercrab" ? Math.sin(t * 0.8) > 0.2 : false; if (k === "spidercrab") e.x = h.x + Math.sin(t * 0.4) * 10; }
      e.nx = e.x; e.ny = e.y;
      Enemies.netUpdate(dt, t, L);
      if (k === "hydra" && e.heads) e.heads.forEach((hd, i) => { const n = e.heads.length, phi = -Math.PI / 2 + (i - (n - 1) / 2) * 0.62; hd.x = e.x + Math.cos(phi) * 34 + Math.sin(t * 1.6 + i * 2) * 5; hd.y = e.y - 50 + Math.sin(t * 2.1 + i) * 4; hd.aim = Math.PI / 2 + Math.sin(t + i) * 0.3; });
    }
    cx.imageSmoothingEnabled = false;
    if (bgC) cx.drawImage(bgC, 0, 0); else water(cx, W, H, t, ENV[k] === "vent");
    // embers rising off the volcanic rock
    if (ENV[k] === "lava") for (let i = 0; i < 14; i++) { const ph = (t * 0.35 + i * 0.137) % 1, x0 = (i * 53.7) % W + Math.sin(t + i) * 4; cx.fillStyle = `rgba(255,${150 + ((i * 37) % 80)},60,${1 - ph})`; cx.fillRect(Math.round(x0), Math.round(H - ph * H), 1, 1); }
    if (e) { try { Enemies.draw(e, cx, 0, 0, t, null); } catch (err) { /* a creature that can't be shown here is left out */ } }
    // a soft vignette frames the scene
    const g = cx.createRadialGradient(W / 2, H * 0.6, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.75);
    g.addColorStop(0, "rgba(10,6,14,0)"); g.addColorStop(1, "rgba(10,6,14,0.55)"); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
    raf = requestAnimationFrame(frame);
  }
  function pick(k, root) {
    sel = k; make(k);
    const S = Gear.state(), [name, elx, desc] = Gear.BEASTS[k], E = Gear.ELEMENTS[elx], n = S.kills[k] || 0, boss = Enemies.STATS[k] && Enemies.STATS[k].boss;
    root.querySelector(".bx-info").innerHTML = `<b>${name}</b>${boss ? ' <span class="bx-boss">BOSS</span>' : ""}<br><span style="color:${E ? E.col : "#ccc"}">${E ? E.name : ""}</span> <span class="mn-dim">· beaten ${n}</span><p class="mn-dim">${desc}</p>`;
    for (const b of root.querySelectorAll(".bx-item")) b.classList.toggle("on", b.dataset.k === k);
    if (!raf) raf = requestAnimationFrame(frame);
  }
  B.render = function (el) {
    const S = Gear.state(), met = Object.keys(Gear.BEASTS).filter((k) => (S.kills[k] || 0) > 0);
    if (!document.getElementById("bx-style")) {
      const st = document.createElement("style"); st.id = "bx-style";
      st.textContent = `.bx{display:flex;gap:12px;align-items:flex-start}.bx-list{width:170px;flex:none;max-height:52vh;overflow:auto}.bx-item{display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid #2e2234;color:#fff6dc;font:13px 'Pixelify Sans',monospace;padding:5px 4px;cursor:pointer}.bx-item:hover{background:#2a1a2e}.bx-item.on{background:#3a2440;color:#ffe08a}.bx-item.off{color:#6a5a6a;cursor:default}.bx-item .bx-b{color:#ffb08a;font-size:10px;margin-left:4px}.bx-stage{flex:1;min-width:0}.bx-stage canvas{display:block;image-rendering:pixelated;border:2px solid #2a1a2e;max-width:100%;background:#000}.bx-info{margin-top:8px;font-size:14px}.bx-info p{margin:4px 0 0}.bx-boss{color:#ffb08a;font-size:11px;letter-spacing:.1em}`;
      document.head.appendChild(st);
    }
    el.innerHTML = `<div class="bx"><div class="bx-list">${Object.keys(Gear.BEASTS).map((k) => { const ok = (S.kills[k] || 0) > 0, boss = Enemies.STATS[k] && Enemies.STATS[k].boss; return ok ? `<button class="bx-item" data-k="${k}">${Gear.BEASTS[k][0]}${boss ? '<span class="bx-b">boss</span>' : ""}</button>` : `<button class="bx-item off" disabled>??? <span class="mn-dim">not yet met</span></button>`; }).join("")}</div><div class="bx-stage"><canvas></canvas><div class="bx-info"></div></div></div>`;
    cv = el.querySelector("canvas"); cx = cv.getContext("2d");
    for (const b of el.querySelectorAll(".bx-item[data-k]")) b.onclick = () => pick(b.dataset.k, el);
    if (!met.length) { el.querySelector(".bx-stage").innerHTML = '<p class="mn-dim">No creature met yet. Those you beat are written in here.</p>'; cv = null; return; }
    pick(met.includes(sel) ? sel : met[0], el);
  };
})();
