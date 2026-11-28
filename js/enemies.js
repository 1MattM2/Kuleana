// Creatures of the Volcanic Highlands.
//
// Built to the sea-cave standard (see STYLE.md): bodies are simulated with continuous values
// (verlet spines, trailing tails, springy capes and feathers) and rasterised per pixel from the
// master palette, so they move smoothly and stay crisp at any angle. Every attack has a pose,
// a flash and a sound before it lands.
//
//   gecko - Sun-Crested Gecko: darts in bursts, flares its crest, lunges, scrambles off
//   vine  - Canopy Vine-Lasher: hides as a bush; a thorned vine with a sun-crested pod head that
//           lashes, sweeps across ledges, spits thorn seeds, and burrows to resurface near you
//   wisp  - Sun-Wisp: a flame spirit with a comet tail; traces its swoop before it flies it,
//           bursts in rings of light, sheds spiralling flare motes, tethers beams to other wisps
//   spear - Tiki Spearman: flanks with its tribe, war-cries, lunges, jabs in threes, sweeps,
//           and guards with its spear against blows from the front
//   dart  - Tiki Darter: keeps its distance, aims (you see the line), volleys with its tribe,
//           lobs spore gourds; alone, it gets bold and fights up close
(function () {
  const TAU = Math.PI * 2;
  const E = (window.Enemies = {});
  let A = null;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const css = (c) => PAL.css(c);
  const R = () => PAL.R;
  const P8 = (n) => PAL.packed[n];
  const WHITE = PAL.pk([255, 255, 255]);

  // ------------------------------------------------------------------ art made once
  let TIKI = null, fernFrames = null, tintCache = new Map(), flipCache = new Map();
  const tinted = (img) => { if (tintCache.has(img)) return tintCache.get(img); const [c, x] = K.canvas(img.width, img.height); x.drawImage(img, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#ffffff"; x.fillRect(0, 0, img.width, img.height); tintCache.set(img, c); return c; };
  const flipped = (img) => { if (flipCache.has(img)) return flipCache.get(img); const c = K.flipped(img); flipCache.set(img, c); return c; };
  E.init = (assets) => {
    A = assets;
    TIKI = buildTikis();
  };
  // ---- the tikis are the user's own sprites (like the gecko). Each is split into its body and its
  // weapon, and the weapon is pre-rotated with RotSprite (Scale2x x3, rotate, sample back) so it can
  // aim and thrust at any angle without smearing the pixels.
  function pixels(img, x0, y0, w, h) { const [, c] = K.canvas(w, h); c.drawImage(img, -x0, -y0); return new Uint32Array(c.getImageData(0, 0, w, h).data.buffer.slice(0)); }
  function scale2x(d, w, h) {
    const W2 = w * 2, o = new Uint32Array(W2 * h * 2), at = (x, y) => d[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const P0 = at(x, y), A2 = at(x, y - 1), B2 = at(x + 1, y), C2 = at(x - 1, y), D2 = at(x, y + 1);
      o[2 * y * W2 + 2 * x] = C2 === A2 && C2 !== D2 && A2 !== B2 ? A2 : P0; o[2 * y * W2 + 2 * x + 1] = A2 === B2 && A2 !== C2 && B2 !== D2 ? B2 : P0;
      o[(2 * y + 1) * W2 + 2 * x] = D2 === C2 && D2 !== B2 && C2 !== A2 ? C2 : P0; o[(2 * y + 1) * W2 + 2 * x + 1] = B2 === D2 && B2 !== A2 && D2 !== C2 ? D2 : P0;
    }
    return o;
  }
  function rotFrames(img, x0, y0, w, h, pvx, pvy, n) {
    let d = pixels(img, x0, y0, w, h), bw = w, bh = h;
    for (let k = 0; k < 3; k++) { d = scale2x(d, bw, bh); bw *= 2; bh *= 2; }
    const R = Math.ceil(Math.max(Math.hypot(pvx, pvy), Math.hypot(w - pvx, pvy), Math.hypot(pvx, h - pvy), Math.hypot(w - pvx, h - pvy))) + 1, S = R * 2;
    const frames = [];
    for (let k = 0; k < n; k++) {
      const th = (k / n) * TAU, cs = Math.cos(th), sn = Math.sin(th), [c, cx] = K.canvas(S, S), im = cx.createImageData(S, S), o = new Uint32Array(im.data.buffer);
      for (let oy = 0; oy < S; oy++) for (let ox = 0; ox < S; ox++) {
        const dx = ox + 0.5 - R, dy = oy + 0.5 - R, ux = pvx + dx * cs + dy * sn, uy = pvy - dx * sn + dy * cs;
        const bx = Math.floor(ux * 8), by = Math.floor(uy * 8);
        if (bx >= 0 && by >= 0 && bx < bw && by < bh) o[oy * S + ox] = d[by * bw + bx];
      }
      cx.putImageData(im, 0, 0); frames.push(c);
    }
    return { frames, R, n };
  }
  function crop(img, x0, y0, w, h) { const [c, x] = K.canvas(w, h); x.drawImage(img, -x0, -y0); return c; }
  function buildTikis() {
    const sp = A.img.e_tikispear, dt = A.img.e_tikidart;
    // spearman: the spear is columns 0-4, gripped at (3.5, 22.5); it points straight up in the sprite
    const spBody = crop(sp, 5, 0, sp.width - 5, sp.height);
    // darter: the blowpipe (and the hand on it) is columns 15-25, rows 13-20, held at its left end
    const dtBody = crop(dt, 0, 0, 15, dt.height);
    return {
      spear: { body: spBody, w: spBody.width, h: spBody.height, legs: 4, top: 4, weapon: rotFrames(sp, 0, 0, 5, sp.height, 3.5, 22.5, 48), grip: { x: 3.5 - 5, y: 22.5 }, base: -Math.PI / 2, faceSprite: -1 },
      dart: { body: dtBody, w: dtBody.width, h: dtBody.height, legs: 4, top: 0, weapon: rotFrames(dt, 15, 13, 11, 8, 0.5, 3.5, 48), grip: { x: 15, y: 16.5 }, base: 0, faceSprite: 1 },
    };
  }

  // per-pixel surfaces for creatures drawn fresh each frame
  // A creature's private pixel buffer. Only the rectangle actually drawn into is cleared, outlined and
  // uploaded each frame, so a big canvas costs only as much as the creature on it.
  function Surface(w, h) { const [c, ctx] = K.canvas(w, h), img = ctx.createImageData(w, h); return { c, ctx, img, d: new Uint32Array(img.data.buffer), w, h, x0: w, y0: h, x1: -1, y1: -1, p: null }; }
  function begin(S) {
    if (S.p) { const [a, b, c2, d2] = S.p; for (let y = b; y <= d2; y++) S.d.fill(0, y * S.w + a, y * S.w + c2 + 1); }
    S.x0 = S.w; S.y0 = S.h; S.x1 = -1; S.y1 = -1;
  }
  const mark = (S, x, y) => { if (x < S.x0) S.x0 = x; if (x > S.x1) S.x1 = x; if (y < S.y0) S.y0 = y; if (y > S.y1) S.y1 = y; };
  function seloutRect(d, W, H, x0, y0, x1, y1) {
    const add = [], lum = (v) => (v & 255) * 0.3 + ((v >>> 8) & 255) * 0.59 + ((v >>> 16) & 255) * 0.11;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * W + x; if (d[i]) continue;
      let best = 0, bl = 1e9, v;
      if (y > 0 && (v = d[i - W]) && v >>> 24 === 255) { const l = lum(v); if (l < bl) { bl = l; best = v; } }
      if (x > 0 && (v = d[i - 1]) && v >>> 24 === 255) { const l = lum(v); if (l < bl) { bl = l; best = v; } }
      if (x < W - 1 && (v = d[i + 1]) && v >>> 24 === 255) { const l = lum(v); if (l < bl) { bl = l; best = v; } }
      if (y < H - 1 && (v = d[i + W]) && v >>> 24 === 255) { const l = lum(v); if (l < bl) { bl = l; best = v; } }
      if (best) add.push(i, best);
    }
    for (let k = 0; k < add.length; k += 2) { const v = add[k + 1], f = 0.38; d[add[k]] = (255 << 24) | ((((v >>> 16) & 255) * f + 12) << 16) | ((((v >>> 8) & 255) * f + 6) << 8) | (((v & 255) * f + 10) | 0); }
  }
  function flush(S, outline) {
    const has = S.x1 >= 0, x0 = Math.max(0, S.x0 - 1), y0 = Math.max(0, S.y0 - 1), x1 = Math.min(S.w - 1, S.x1 + 1), y1 = Math.min(S.h - 1, S.y1 + 1);
    if (has && outline) seloutRect(S.d, S.w, S.h, x0, y0, x1, y1);
    // upload the union of last frame's rectangle (now cleared) and this one
    let a = has ? x0 : S.w, b = has ? y0 : S.h, c2 = has ? x1 : -1, d2 = has ? y1 : -1;
    if (S.p) { a = Math.min(a, S.p[0]); b = Math.min(b, S.p[1]); c2 = Math.max(c2, S.p[2]); d2 = Math.max(d2, S.p[3]); }
    if (c2 >= a) S.ctx.putImageData(S.img, 0, 0, a, b, c2 - a + 1, d2 - b + 1);
    S.p = has ? [x0, y0, x1, y1] : null;
    return has;
  }

  // ------------------------------------------------------------------ spawning
  const STATS = {
    gecko: { hp: 26, r: 8, mat: "flesh", colors: ["#c8a050", "#8a7a62", "#f2c14a"] },
    vine: { hp: 90, r: 10, mat: "plant", colors: [css(R().palm[4]), css(R().palm[2]), css(R().sun[4])] },
    wisp: { hp: 32, r: 7, mat: "fire", fly: true, colors: [css(R().fire[3]), css(R().fire[2]), css(R().fire[4])] },
    spear: { hp: 56, r: 8, mat: "wood", colors: [css(R().koa[4]), css(R().koa[2]), css(R().palm[4])] },
    dart: { hp: 34, r: 8, mat: "wood", colors: [css(R().koa[4]), css(R().koa[2]), css(R().glyph[3])] },
  };
  E.nextId = 1;
  E.hpScale = 1;     // set above 1 for co-op
  E.bossScale = 1;   // = the number of heroes
  E.spawn = function (type, x, y, tribe, L) {
    const s = STATS[type]; if (!s) return null;
    // bosses and mini-bosses get a full health bar per hero (x2 with two, x3 with three)
    const hp = Math.round(s.hp * (s.boss ? E.bossScale || 1 : E.hpScale));
    const e = { id: E.nextId++, type, x, y, hx: x, hy: y, rx: x, ry: y, tribe, hp, max: hp, r: s.r, fly: !!s.fly, mat: s.mat, colors: s.colors,
      enemy: true, dead: false, flash: 0, hitT: -9, ang: 0, angV: 0, face: 1, state: "idle", st: 0, kx: 0, ky: 0, stun: 0, alerted: false,
      ph: Math.random() * 6, t: Math.random() * 2, trail: [], seed: Math.random() * 99, introT: 0, moving: false, armor: 1 };
    e.onHit = function (dmg, ang) {
      const kb = s.kb !== undefined ? s.kb : this.type === "vine" ? 0 : this.type === "spear" ? 70 : this.type === "wisp" ? 160 : 120;
      this.kx = Math.cos(ang) * kb; this.ky = Math.sin(ang) * kb * 0.8;
      if (this.type !== "vine" && this.type !== "spear" && !s.boss && !s.noStun) this.stun = Math.max(this.stun, 0.22);
      if (this.type === "spear" && this.state !== "lunge") this.stun = Math.max(this.stun, 0.12);
      this.alerted = true;
      if (this.state === "wind" && this.type !== "spear" && this.type !== "vine") { this.state = "recover"; this.st = 0; }
      if (this.type === "vine") {
        this.hits = (this.hits || 0) + 1;
        if (this.state === "hidden") { this.state = "rise"; this.st = 0; }
        else if (this.hits % 3 === 0) this.slip = true;      // it will slip away once its current move is done
      }
    };
    // tiki spearmen raise their spear to guard against blows from the front
    if (type === "spear") e.blocks = function (ang) { return this.state === "guard" && Math.cos(ang - (this.face > 0 ? Math.PI : 0)) > 0.35; };
    if (type === "vine") { e.chain = []; for (let k = 0; k <= 10; k++) e.chain.push({ x: x, y: y - 6 - k * 2.2, px: x, py: y - 6 - k * 2.2 }); e.rise = 0; e.S = Surface(220, 200); }
    if (type === "wisp") { e.S = Surface(110, 110); e.y -= 14; e.hy = e.y; e.va = Math.random() * TAU; }
    if (type === "spear" || type === "dart") { e.cape = Array.from({ length: type === "spear" ? 7 : 12 }, (_, k) => ({ a: 0, v: 0, ph: k * 1.7 })); e.walkPh = Math.random() * 6; e.aimA = 0; e.puff = 0; }
    if (s.boss) { e.boss = true; e.big = s.big || 20; e.name = s.name; } else if (s.big) e.big = s.big;
    if (E.SETUP[type]) E.SETUP[type](e, L);
    return e;
  };

  function tryMove(e, dx, dy) {
    const ok = (x, y) => (e.fly ? !Level.flyBlocked(x, y) : !Level.solidAt(x, y) && !Level.solidAt(x - e.r * 0.6, y) && !Level.solidAt(x + e.r * 0.6, y));
    let moved = false;
    if (ok(e.x + dx, e.y)) { e.x += dx; moved = true; }
    if (ok(e.x, e.y + dy)) { e.y += dy; moved = true; }
    return moved;
  }
  function hitPlayer(e, P, api, x, y, reach, dmg) { if (Math.hypot(P.x - x, P.y - 9 - y) < reach) return api.hurt(dmg, e.x, e.y, e.type); return false; }
  const sfx = (api, k) => api.sfx && api.sfx(k);

  // ------------------------------------------------------------------ update
  // P is the local hero; others are co-op partners (each with isRemote and their own hurt route).
  // Every creature fights whoever is nearest, sticking with its target unless another comes much closer.
  E.update = function (dt, t, P, L, api, others) {
    const live = L.enemies.filter((e) => !e.dead), players = [P].concat(others || []);
    for (const q of players) {
      q.vx = (q.x - (q._ex ?? q.x)) / Math.max(dt, 1e-3); q.vy = (q.y - (q._ey ?? q.y)) / Math.max(dt, 1e-3); q._ex = q.x; q._ey = q.y;
      if (!q.isRemote) q.attacking = Combat.busy;
      if (!q._api) q._api = { hurt: q.isRemote ? (d, sx, sy, src) => api.hurtRemote(q, d, sx, sy, src) : api.hurt, sfx: api.sfx };
    }
    const alive = players.filter((q) => !q.dead); E.alive = alive; E.players = players;
    const pick = (e) => {
      if (alive.length < 2) return alive[0] || P;
      let near = alive[0]; for (const q of alive) if (dist(e, q) < dist(e, near)) near = q;
      if (!e.tgt || !alive.includes(e.tgt) || dist(e, near) < dist(e, e.tgt) * 0.6) e.tgt = near;
      return e.tgt;
    };
    for (const e of live) {
      const Q = pick(e), qa = Q._api;
      e.t += dt; e.st += dt; e.flash = Math.max(0, e.flash - dt);
      if (e.introT > 0) { const was = e.introT; e.introT -= dt; if (e.introT <= 0 && was > 0) landed(e, L, qa); continue; }
      if (Math.abs(e.kx) + Math.abs(e.ky) > 1) { tryMove(e, e.kx * dt, e.ky * dt); e.kx *= Math.exp(-dt * 9); e.ky *= Math.exp(-dt * 9); }
      animate(e, dt, t, Q);
      if (e.stun > 0) { e.stun -= dt; continue; }
      const d = dist(e, Q), seen = d < (e.type === "vine" ? 86 : 180) && Level.sight(e.x, e.y - 8, Q.x, Q.y - 8);
      if (seen && !e.alerted) { e.alerted = true; e.alertT = t; for (const o of live) if (o.tribe && o.tribe === e.tribe && !o.alerted) { o.alerted = true; o.alertT = t; } if (e.type === "spear") { e.state = "warcry"; e.st = 0; e.cryT = t; sfx(qa, "warcry"); } }
      AI[e.type](e, dt, t, Q, L, qa, d, live);
    }
    // projectiles: they hit whoever they touch
    for (const s of L.shots) {
      s.t += dt;
      if (s.kind === "mote") { s.a += s.turn * dt; if (s.home && s.t > 0.6) { const Q = alive.reduce((b, q) => (!b || Math.hypot(q.x - s.x, q.y - s.y) < Math.hypot(b.x - s.x, b.y - s.y) ? q : b), null) || P; s.a += angDiff(Math.atan2(Q.y - 10 - s.y, Q.x - s.x), s.a) * Math.min(1, dt * 1.4); } s.vx = Math.cos(s.a) * s.sp; s.vy = Math.sin(s.a) * s.sp; }
      if (s.kind === "gourd") { s.h += s.vh * dt; s.vh -= 300 * dt; if (s.h <= 0) { s.dead = true; L.fx.push({ kind: "spores", x: s.x, y: s.y, t: 0, dur: 3.2, R: 24, hitT: {} }); sfx(api, "spores"); continue; } }
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.t > (s.life || 1.8) || (s.kind !== "gourd" && Level.flyBlocked(s.x, s.y))) { s.dead = true; continue; }
      if (s.kind !== "gourd") for (const q of alive) if (Math.hypot(s.x - q.x, s.y - 10 - q.y) < (s.kind === "mote" ? 7 : 8)) { if (q._api.hurt(1, s.x - s.vx * 0.05, s.y - s.vy * 0.05, s.kind)) { s.dead = true; break; } }
    }
    L.shots = L.shots.filter((s) => !s.dead);
    // ground hazards
    for (const r of L.fx) {
      r.t += dt;
      for (let qi = 0; qi < alive.length; qi++) {
        const q = alive[qi], key = q.isRemote ? "r" + q.slot : "l";
        if (r.kind === "pulse") { const rad = (r.t / r.dur) * r.R; r.hits = r.hits || {}; if (!r.hits[key] && Math.abs(Math.hypot(q.x - r.x, (q.y - 6 - r.y) / 0.7) - rad) < 7) { if (q._api.hurt(1, r.x, r.y, "pulse")) r.hits[key] = 1; } }
        if (r.kind === "flames") { r.hitT = r.hitT || {}; if (r.t > 0.15 && Math.hypot(q.x - r.x, (q.y - r.y) / 0.7) < r.R && t - (r.hitT[key] ?? -9) > 0.8) { if (q._api.hurt(1, r.x, r.y, "flames")) r.hitT[key] = t; } }
        if (r.kind === "spores") { if (typeof r.hitT !== "object") r.hitT = {}; if (Math.hypot(q.x - r.x, (q.y - r.y) / 0.7) < r.R && t - (r.hitT[key] ?? -9) > 0.9) { if (q._api.hurt(1, r.x, r.y, "spores")) r.hitT[key] = t; } }
        if (r.kind === "beam" && r.t > 0.7 && !r.a.dead && !r.b.dead) {
          const ax = r.a.x, ay = r.a.y, bx = r.b.x, by = r.b.y, dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
          const u = K.clamp(((q.x - ax) * dx + (q.y - 12 - ay) * dy) / l2, 0, 1), d = Math.hypot(ax + dx * u - q.x, ay + dy * u - (q.y - 12));
          r.hitT = r.hitT || {};
          if (d < 7 && t - (r.hitT[key] ?? -9) > 0.6) { if (q._api.hurt(2, ax + dx * u, ay + dy * u, "beam")) r.hitT[key] = t; }
        }
      }
    }
    L.fx = L.fx.filter((r) => r.t < r.dur && !(r.kind === "beam" && (r.a.dead || r.b.dead || (r.t > 0.2 && r.a.state !== "pincer" && r.b.state !== "pincer"))));
  };

  // ------------------------------------------------------------------ co-op: the host's world, sent to the guest
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round((v || 0) * 100) / 100;
  E.serialize = function (L) {
    const e = L.enemies.filter((q) => !q.dead).map((q) => {
      const o = { i: q.id, k: q.type, x: r1(q.x), y: r1(q.y), s: q.state, t: r2(q.st), f: q.face, h: q.hp, m: q.max, it: r2(q.introT), mv: q.moving ? 1 : 0, aa: r2(q.aimA), am: r2(q.aim), tr: q.tribe };
      if (q.flash > 0) o.fl = 1; if (q.enter) o.en = q.enter; if (q.puff) o.pf = r2(q.puff); if (q.aimLine) o.al = 1; if (q.jabOut) o.jo = r2(q.jabOut); if (q.hopH) o.hh = r1(q.hopH);
      if (q.type === "vine") { o.ri = r2(q.rise); o.rx = r1(q.rx); o.ry = r1(q.ry); o.ch = q.chain.flatMap((n) => [r1(n.x), r1(n.y)]); }
      if (E.NET[q.type]) E.NET[q.type].ser(q, o, r1, r2);
      if (q.type === "wisp") { o.va = r2(q.va); if (q.state === "trace" && q.arc) o.arc = q.arc.map((p) => [r1(p.x), r1(p.y)]); }
      return o;
    });
    const sh = L.shots.map((q) => ({ kind: q.kind, x: r1(q.x), y: r1(q.y), vx: r1(q.vx), vy: r1(q.vy), h: q.h !== undefined ? r1(q.h) : undefined, vh: q.vh !== undefined ? r1(q.vh) : undefined }));
    const fx = L.fx.map((r) => (r.kind === "beam" ? { kind: "beam", a: r.a.id, b: r.b.id, t: r2(r.t), dur: r.dur } : { kind: r.kind, x: r1(r.x), y: r1(r.y), t: r2(r.t), dur: r.dur, R: r.R }));
    return { e, sh, fx };
  };
  E.applySnap = function (L, S) {
    const byId = L.proxies || (L.proxies = new Map()), seen = new Set();
    for (const o of S.e) {
      let e = byId.get(o.i);
      if (!e) { e = E.spawn(o.k, o.x, o.y, o.tr || 0, L); e.id = o.i; e.net = true; e.x = o.x; e.y = o.y; byId.set(o.i, e); L.enemies.push(e); if (o.ch) for (let k = 0; k < e.chain.length; k++) { e.chain[k].x = o.ch[k * 2]; e.chain[k].y = o.ch[k * 2 + 1]; } if (o.rx !== undefined) { e.rx = o.rx; e.ry = o.ry; } }
      seen.add(o.i);
      e.nx = o.x; e.ny = o.y; e.state = o.s; e.st = o.t; e.face = o.f; e.hp = o.h; e.max = o.m; if (o.fl) e.flash = 0.12;
      e.introT = o.it || 0; e.enter = o.en; e.moving = !!o.mv; e.aimA = o.aa || 0; e.aim = o.am || 0; e.puff = o.pf || 0; e.aimLine = !!o.al; e.jabOut = o.jo || 0; e.hopH = o.hh || 0; e.alerted = true;
      if (o.ch) { e.rise = o.ri; e.nrx = o.rx; e.nry = o.ry; e.nch = o.ch; }
      if (o.va !== undefined) e.va = o.va;
      if (E.NET[e.type]) E.NET[e.type].app(e, o);
      e.arc = o.arc ? o.arc.map(([x, y]) => ({ x, y })) : e.state === "trace" ? e.arc : null;
    }
    for (const e of L.enemies) if (!e.dead && !seen.has(e.id)) { e.dead = true; E.death(e); }
    L.shots = S.sh;
    L.fx = S.fx.map((r) => (r.kind === "beam" ? { ...r, a: byId.get(r.a), b: byId.get(r.b) } : r)).filter((r) => r.kind !== "beam" || (r.a && r.b));
  };
  // between snapshots the guest glides everything along so it never stutters
  E.netUpdate = function (dt, t, L) {
    for (const e of L.enemies) {
      if (e.dead) continue;
      e.t += dt; e.st += dt; e.flash = Math.max(0, e.flash - dt); if (e.introT > 0) e.introT -= dt;
      const k = Math.min(1, dt * 14);
      if (e.nx !== undefined) { e.x += (e.nx - e.x) * k; e.y += (e.ny - e.y) * k; }
      if (e.nch) { e.rx += (e.nrx - e.rx) * k; e.ry += (e.nry - e.ry) * k; for (let i = 0; i < e.chain.length; i++) { e.chain[i].x += (e.nch[i * 2] - e.chain[i].x) * k; e.chain[i].y += (e.nch[i * 2 + 1] - e.chain[i].y) * k; } }
      animate(e, dt, t);
      if (e.moving && e.walkPh !== undefined) e.walkPh += 0;
      if (e.type === "wisp" || e.sc) { e.trail.unshift([e.x, e.y]); if (e.trail.length > 28) e.trail.length = 28; }
      if (E.NET[e.type] && E.NET[e.type].tick) E.NET[e.type].tick(e, dt, t);
    }
    for (const s of L.shots) { s.x += s.vx * dt; s.y += s.vy * dt; if (s.kind === "gourd" && s.h !== undefined) { s.h = Math.max(0, s.h + s.vh * dt); s.vh -= 300 * dt; } }
    for (const r of L.fx) r.t += dt;
  };
  function landed(e, L, api) {
    const n = e.type === "wisp" ? 10 : 14;
    for (let k = 0; k < n; k++) { const a = Math.random() * TAU; Combat.addPart({ x: e.x + Math.cos(a) * 6, y: e.y + Math.sin(a) * 3, vx: Math.cos(a) * rnd(40, 90), vy: Math.sin(a) * 26 - 10, drag: 3, life: 0.6, col: e.type === "wisp" ? css(R().fire[3]) : css(R().soil[4]), size: 2, kind: e.type === "wisp" ? "ember" : "smoke", glow: e.type === "wisp" }); }
    Combat.shake = Math.min(1, Combat.shake + (e.type === "spear" ? 0.3 : 0.15));
    if (e.type === "vine") { e.state = "rise"; e.st = 0; }
    sfx(api, e.type === "wisp" ? "wispSwoop" : e.type === "vine" ? "vineBurst" : "land");
  }
  // springy secondary motion shared by every creature: capes, feathers and skirts trail behind the
  // body's motion and lean on the island's one wind
  function animate(e, dt, t, P) {
    if (!e.cape) return;
    const vx = (e.x - (e.lx || e.x)) / Math.max(dt, 1e-3); e.lx = e.x;
    for (const c of e.cape) { const target = -vx * 0.006 + (K.W ? K.W.x * 0.35 : 0.1) + Math.sin(t * 3 + c.ph) * 0.08 * (1 + (K.W ? K.W.s : 0)); c.v += (40 * (target - c.a) - 6 * c.v) * dt; c.a += c.v * dt; }
    if (e.moving) e.walkPh += dt * 11;
  }

  const AI = {
    // ---------------------------------------------------------------- Sun-Crested Gecko
    gecko(e, dt, t, P, L, api, d) {
      const toP = Math.atan2(P.y - e.y, P.x - e.x);
      if (e.state === "idle") {
        if (e.alerted) { e.state = "circle"; e.st = 0; e.next = rnd(0.9, 1.8); e.dirSign = Math.random() < 0.5 ? -1 : 1; }
        else if (e.st > (e.wait || 0)) { e.dash = { a: Math.random() * TAU, t: rnd(0.15, 0.3), sp: rnd(110, 150) }; e.wait = rnd(0.6, 1.6); e.st = 0; }
      }
      if (e.state === "circle") {
        if (!e.dash || e.dash.t <= 0) {
          const want = 70, rad = d > want + 12 ? 1 : d < want - 12 ? -1 : 0;
          const a = toP + e.dirSign * (Math.PI / 2) * (rad === 0 ? 1 : 0.55) + (rad < 0 ? Math.PI * 0.35 * e.dirSign : 0);
          e.dash = { a: rad > 0 ? toP + e.dirSign * 0.5 : a, t: rnd(0.14, 0.26), sp: rnd(150, 190) }; e.pause = rnd(0.05, 0.25);
          if (Math.random() < 0.2) e.dirSign *= -1;
        }
        if (e.st > e.next && d < 110) { e.state = "wind"; e.st = 0; e.dash = null; e.aimA = toP; e.wind = rnd(0.32, 0.46); sfx(api, "geckoHiss"); }
        if (d > 230) { e.state = "idle"; e.alerted = false; }
      }
      if (e.state === "wind") { e.face = Math.cos(toP) >= 0 ? 1 : -1; e.aimA = toP; if (e.st > e.wind) { e.state = "lunge"; e.st = 0; e.hitDone = false; } }
      if (e.state === "lunge") {
        const sp = 330 * (1 - e.st / 0.22);
        tryMove(e, Math.cos(e.aimA) * sp * dt, Math.sin(e.aimA) * sp * dt);
        if (!e.hitDone && hitPlayer(e, P, api, e.x + Math.cos(e.aimA) * 12, e.y - 6, 14, 1)) e.hitDone = true;
        if (e.st > 0.22) { e.state = "recover"; e.st = 0; }
      }
      if (e.state === "recover" && e.st > 0.35) { e.state = "circle"; e.st = 0; e.next = rnd(1.1, 2.2); e.dash = { a: toP + Math.PI + rnd(-0.6, 0.6), t: 0.25, sp: 170 }; }
      if (e.dash && e.dash.t > 0) {
        if (e.pause > 0) e.pause -= dt;
        else { e.dash.t -= dt; const moved = tryMove(e, Math.cos(e.dash.a) * e.dash.sp * dt, Math.sin(e.dash.a) * e.dash.sp * dt); if (!moved) e.dash.t = 0; e.moving = true; if (Math.abs(Math.cos(e.dash.a)) > 0.2) e.face = Math.cos(e.dash.a) > 0 ? 1 : -1; }
      } else e.moving = false;
    },

    // ---------------------------------------------------------------- Canopy Vine-Lasher
    vine(e, dt, t, P, L, api, d) {
      const head = e.chain[e.chain.length - 1], toP = Math.atan2(P.y - 10 - (e.ry - 16), P.x - e.rx);
      const D = Math.hypot(P.x - e.rx, P.y - e.ry);
      e.armor = e.state === "burrow" && e.rise <= 0 ? 0.1 : e.state === "hidden" || e.state === "burrow" || e.state === "retreat" ? 0.4 : e.state === "lash" || e.state === "hold" || e.state === "sweep" ? 1.6 : 1;
      if (e.state === "idle") e.state = "hidden";
      // where the head wants to be, by state
      let tx = e.rx + Math.sin(t * 1.7 + e.ph) * 7, ty = e.ry - 6 - 46 * e.rise + Math.sin(t * 2.3 + e.ph) * 4, k = 70;
      if (e.state === "hidden") {
        e.rise = Math.max(0, e.rise - dt * 3);
        if (D < 80) { e.state = "rise"; e.st = 0; sfx(api, "vineRustle"); }
        else if (e.alerted && D < 420 && e.st > 1.2) { e.state = "burrow"; e.st = 0; sfx(api, "vineRustle"); }   // it knows you're here: it tunnels after you
      }
      if (e.state === "rise") { e.rise = Math.min(1, e.rise + dt * 3.5); if (e.st > 0.4) { e.state = "sway"; e.st = 0; e.next = rnd(0.6, 1.2); } }
      if (e.state === "sway") {
        // the head drifts to watch you, lagging like a cobra
        tx += Math.cos(toP) * 10; ty += Math.sin(toP) * 6;
        if (D > 130) { e.state = e.alerted || Math.random() < 0.45 ? "burrow" : "hidden"; e.st = 0; if (e.state === "burrow") sfx(api, "vineRustle"); }
        else if (e.st > e.next) {
          const r = Math.random();
          e.st = 0; e.aim = toP;
          if (D < 56 && r < 0.3) { e.state = "windSweep"; e.sweepDir = Math.random() < 0.5 ? -1 : 1; }
          else if (D > 70 && r < 0.45) e.state = "windSpit";
          else { e.state = "wind"; e.reach = Math.min(96, D + 22); }
          sfx(api, "vineHiss");
        }
      }
      if (e.state === "wind" || e.state === "windSweep" || e.state === "windSpit") {
        // coil: the head draws back and down, the crest flares
        e.aim += angDiff(toP, e.aim) * Math.min(1, dt * 3);
        tx = e.rx - Math.cos(e.aim) * 14; ty = e.ry - 30 - Math.sin(e.aim) * 8; k = 120;
        const wt = e.state === "windSpit" ? 0.45 : 0.55;
        if (e.st > wt) {
          if (e.state === "wind") { e.state = "lash"; sfx(api, "vineLash"); }
          else if (e.state === "windSweep") { e.state = "sweep"; e.sweepA = e.aim - e.sweepDir * 1.3; sfx(api, "vineLash"); }
          else { e.state = "spit"; for (const o of [-0.3, 0, 0.3]) L.shots.push({ kind: "seed", x: head.x, y: head.y, vx: Math.cos(e.aim + o) * 170, vy: Math.sin(e.aim + o) * 170, t: 0, life: 1.4 }); sfx(api, "vineSpit"); }
          e.st = 0; e.hitDone = false;
        }
      }
      if (e.state === "lash" || e.state === "hold") {
        tx = e.rx + Math.cos(e.aim) * e.reach; ty = e.ry - 14 + Math.sin(e.aim) * e.reach * 0.85; k = 900;
        if (!e.hitDone) for (let i = 4; i < e.chain.length; i++) { const n = e.chain[i]; if (Math.hypot(P.x - n.x, P.y - 10 - n.y) < (i === e.chain.length - 1 ? 12 : 8)) { if (api.hurt(1, e.rx, e.ry, "vine")) { e.hitDone = true; break; } } }
        if (e.state === "lash" && e.st > 0.12) { e.state = "hold"; e.st = 0; }
        if (e.state === "hold" && e.st > 0.34) { e.state = "recover"; e.st = 0; }
      }
      if (e.state === "sweep") {
        // the vine scythes sideways across the ledge
        e.sweepA += e.sweepDir * dt * 6.5; tx = e.rx + Math.cos(e.sweepA) * 52; ty = e.ry - 12 + Math.sin(e.sweepA) * 40; k = 600;
        if (!e.hitDone && Math.hypot(P.x - head.x, P.y - 10 - head.y) < 13) { if (api.hurt(1, e.rx, e.ry, "vine")) e.hitDone = true; }
        if (e.st > 0.42) { e.state = "recover"; e.st = 0; }
      }
      if (e.state === "spit" && e.st > 0.3) { e.state = "recover"; e.st = 0; }
      if (e.state === "retreat") {          // shrinks into the fern and dives, to come up somewhere else
        e.rise = Math.max(0, e.rise - dt * 5); tx = e.rx; ty = e.ry - 4; k = 200;
        if (e.rise <= 0) { e.state = "burrow"; e.st = 0; e.digFar = true; e.dig = null; sfx(api, "vineRustle"); }
      }
      if (e.state === "recover" && e.st > 0.5) { e.state = "sway"; e.st = 0; e.next = rnd(0.8, 1.6); }
      if (e.slip && (e.state === "sway" || e.state === "rise")) { e.slip = false; e.state = "retreat"; e.st = 0; }
      if (e.state === "burrow") {
        // dives into the earth; a ripple of soil runs underground to a new spot near you
        e.rise = Math.max(0, e.rise - dt * 4);
        if (!e.dig) { let best = null; for (let k2 = 0; k2 < 20; k2++) { const a = Math.random() * TAU, r = e.digFar ? rnd(80, 130) : rnd(40, 70), nx = P.x + Math.cos(a) * r, ny = P.y + Math.sin(a) * r * 0.8; if (!Level.solidAt(nx, ny) && !Level.solidAt(nx - 8, ny) && !Level.solidAt(nx + 8, ny)) { best = { x: nx, y: ny }; break; } } e.dig = best || { x: e.rx, y: e.ry }; }
        if (e.rise <= 0) {
          const dx = e.dig.x - e.rx, dy = e.dig.y - e.ry, l = Math.hypot(dx, dy), sp = (e.digFar ? 230 : 150) * dt;
          if (l > sp) { e.rx += dx / l * sp; e.ry += dy / l * sp; if (Math.random() < 0.6) Combat.addPart({ x: e.rx + rnd(-4, 4), y: e.ry, vx: rnd(-20, 20), vy: rnd(-40, -10), g: 200, life: 0.4, col: css(R().soil[3]), size: 1, kind: "debris" }); }
          else { e.rx = e.dig.x; e.ry = e.dig.y; e.dig = null; e.digFar = false; e.next = rnd(0.3, 0.6); e.state = "rise"; e.st = 0; sfx(api, "vineBurst"); for (let k2 = 0; k2 < 12; k2++) Combat.addPart({ x: e.rx, y: e.ry, vx: rnd(-80, 80), vy: rnd(-90, -30), g: 240, life: 0.6, col: k2 % 2 ? css(R().palm[4]) : css(R().soil[3]), size: 2, kind: "debris" }); }
        }
        for (const n of e.chain) { n.x = e.rx; n.y = e.ry - 4; n.px = n.x; n.py = n.y; }
      } else {
        // verlet spine: the root is planted, the head is pulled toward its target, the rest follows
        const ch = e.chain, striking = e.state === "lash" || e.state === "hold" || e.state === "sweep";
        const segL = e.state === "lash" || e.state === "hold" ? (e.reach + 8) / (ch.length - 1) : e.state === "sweep" ? 6.4 : 2.2 + 3.0 * e.rise;
        ch[0].x = e.rx; ch[0].y = e.ry - 6;
        for (let i = 1; i < ch.length; i++) { const n = ch[i], vx = (n.x - n.px) * 0.86, vy = (n.y - n.py) * 0.86; n.px = n.x; n.py = n.y; n.x += vx; n.y += vy; }
        head.x += (tx - head.x) * Math.min(1, dt * k * 0.12); head.y += (ty - head.y) * Math.min(1, dt * k * 0.12);
        for (let it = 0; it < 6; it++) for (let i = 1; i < ch.length; i++) { const a = ch[i - 1], b = ch[i], dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, f = (l - segL) / l; if (i - 1 === 0) { b.x -= dx * f; b.y -= dy * f; } else if (striking && i === ch.length - 1) { a.x += dx * f; a.y += dy * f; } else { a.x += dx * f * 0.5; a.y += dy * f * 0.5; b.x -= dx * f * 0.5; b.y -= dy * f * 0.5; } }
      }
      // where blows can land: the bush when hidden, along the vine when it's out
      const mid = e.chain[(e.state === "lash" || e.state === "hold" || e.state === "sweep") ? 7 : 3];
      e.x = e.rise > 0.3 ? mid.x : e.rx; e.y = e.rise > 0.3 ? mid.y + 12 : e.ry;
    },

    // ---------------------------------------------------------------- Sun-Wisp
    wisp(e, dt, t, P, L, api, d, live) {
      if (e.merging) return;   // being drawn back into the Bonfire Hive (enemies2.js moves it)
      const toP = Math.atan2(P.y - 14 - e.y, P.x - e.x);
      let turn = 0, sp = 52;
      if (!e.alerted) { const toH = Math.atan2(e.hy - e.y, e.hx - e.x), dh = Math.hypot(e.hy - e.y, e.hx - e.x); turn = 1.4 + (dh > 50 ? Math.sin(toH - e.va) * 2 : 0); }
      else if (e.state === "trace") {
        // a dotted arc of light shows where it will fly, then it flies it
        sp = 10; turn = 1.5;
        if (e.st > 0.42) { e.state = "swoop"; e.st = 0; e.hitDone = false; sfx(api, "wispSwoop"); }
      } else if (e.state === "swoop") {
        const u = Math.min(1, e.st / 0.5), p = bez(e.arc, u), q = bez(e.arc, Math.min(1, u + 0.02));
        e.va = Math.atan2(q.y - p.y, q.x - p.x); e.x = p.x; e.y = p.y; sp = 0;
        if (!e.hitDone && Math.hypot(P.x - e.x, P.y - 12 - e.y) < 12) { if (api.hurt(1, e.x, e.y, "wisp")) e.hitDone = true; }
        if (u >= 1) {
          if (!e.chained && Math.random() < 0.45) {   // and straight into a second swoop, from where it ended
            e.chained = true; const a2 = Math.atan2(P.y - 12 - e.y, P.x - e.x), ex2 = P.x + Math.cos(a2) * 40, ey2 = P.y - 12 + Math.sin(a2) * 30, sd = Math.random() < 0.5 ? 1 : -1;
            e.arc = [{ x: e.x, y: e.y }, { x: (e.x + ex2) / 2 - Math.sin(a2) * 50 * sd, y: (e.y + ey2) / 2 + Math.cos(a2) * 40 * sd }, { x: ex2, y: ey2 }]; e.state = "trace"; e.st = 0.12;
          } else { e.chained = false; e.state = "orbit"; e.st = 0; }
        }
      } else if (e.state === "pincer") {
        const pn = e.pin;
        if (e.pinSide > 0) { pn.t += dt; const fk = Math.min(1, dt * 0.9); pn.ax += (P.x - pn.ax) * fk; pn.ay += (P.y - 12 - pn.ay) * fk; if (pn.t > 0.7) pn.d -= 80 * dt; }
        const nx = Math.cos(pn.phi), ny = Math.sin(pn.phi), tx = pn.ax + nx * pn.d - ny * 72 * e.pinSide, ty = pn.ay + (ny * pn.d + nx * 72 * e.pinSide) * 0.8;
        const k2 = Math.min(1, dt * 6); e.va = Math.atan2(ty - e.y, tx - e.x); e.x += (tx - e.x) * k2; e.y += (ty - e.y) * k2; sp = 0;
        if (pn.d < -100 || e.mate.dead || e.mate.state !== "pincer") { e.state = "orbit"; e.st = 0; e.pin = null; e.next = rnd(2.4, 3.4); }
      } else if (e.state === "charge") {
        turn = 2.2; sp = 14;
        if (e.st > 0.65) { L.fx.push({ kind: "pulse", x: e.x, y: e.y + 10, t: 0, dur: 0.6, R: 86 }); sfx(api, "wispPulse"); e.state = "orbit"; e.st = 0; }
      } else if (e.state === "shed") {
        turn = 3; sp = 20;
        if (e.st > 0.5) { const n = 7, base = Math.random() * TAU, sd = Math.random() < 0.5 ? 1 : -1; for (let k = 0; k < n; k++) { const a = base + (k / n) * TAU; L.shots.push({ kind: "mote", x: e.x, y: e.y, a, turn: 1.6 * sd, sp: 70, vx: 0, vy: 0, t: 0, life: 2.8, home: 1 }); } sfx(api, "wispShed"); e.state = "orbit"; e.st = 0; }
      } else {
        e.state = e.state === "idle" ? "orbit" : e.state;
        const tang = toP + (e.dirS || (e.dirS = Math.random() < 0.5 ? 1 : -1)) * (Math.PI / 2 - (d - 78) * 0.012);
        turn = Math.sin(tang - e.va) * 3.2; sp = 66;
        if (e.st > (e.next || (e.next = rnd(2, 3.2)))) {
          e.st = 0; e.next = rnd(2.2, 3.4);
          const partner = live.find((o) => o !== e && o.type === "wisp" && !o.dead && o.alerted && o.state === "orbit" && dist(o, e) < 260);
          const r = Math.random();
          if (partner && r < 0.55 && !L.fx.some((f) => f.kind === "beam")) {
            // a pincer: the pair take up either side of you, link with a beam of light, and sweep it across the ground
            const mx = (e.x + partner.x) / 2, my = (e.y + partner.y) / 2, pin = { ax: P.x, ay: P.y - 12, phi: Math.atan2(my - (P.y - 12), mx - P.x), d: 95, t: 0 };
            for (const [w, side] of [[e, 1], [partner, -1]]) { w.state = "pincer"; w.st = 0; w.pin = pin; w.pinSide = side; w.mate = side > 0 ? partner : e; }
            L.fx.push({ kind: "beam", a: e, b: partner, t: 0, dur: 3.2 }); sfx(api, "wispBeam");
          }
          else if (r < 0.6 && d < 130) e.state = "charge";
          else if (r < 0.8) e.state = "shed";
          else {
            // plan a curved swoop through the player: a quadratic arc bowed to one side
            const ex = P.x + Math.cos(toP) * 40, ey = P.y - 12 + Math.sin(toP) * 30, side = Math.random() < 0.5 ? 1 : -1;
            const mx = (e.x + ex) / 2 - Math.sin(toP) * 60 * side, my = (e.y + ey) / 2 + Math.cos(toP) * 50 * side;
            e.arc = [{ x: e.x, y: e.y }, { x: mx, y: my }, { x: ex, y: ey }]; e.state = "trace";
          }
        }
        if (d > 280) { e.alerted = false; e.state = "idle"; }
      }
      if (sp > 0) {
        e.va += turn * dt;
        const nx = e.x + Math.cos(e.va) * sp * dt, ny = e.y + Math.sin(e.va) * sp * dt;
        if (Level.flyBlocked(nx, ny + 14)) e.va += Math.PI * 0.6; else { e.x = nx; e.y = ny; }
      }
      e.trail.unshift([e.x, e.y]); if (e.trail.length > 28) e.trail.length = 28;
      if (Math.random() < 0.4) Combat.addPart({ x: e.x + rnd(-4, 4), y: e.y + rnd(-4, 4), vx: rnd(-12, 12), vy: rnd(-30, -10), g: -20, life: rnd(0.3, 0.6), col: css(R().fire[Math.random() < 0.5 ? 3 : 4]), size: 1, kind: "ember", glow: true });
    },

    // ---------------------------------------------------------------- Tiki Spearman
    spear(e, dt, t, P, L, api, d, live) {
      const toP = Math.atan2(P.y - e.y, P.x - e.x);
      e.aimA += angDiff(e.state === "lunge" || e.state === "jab" ? e.aim : toP, e.aimA) * Math.min(1, dt * 8);
      if (!e.alerted) { e.moving = false; return; }
      const hype = live.some((o) => o.tribe === e.tribe && o.cryT && t - o.cryT < 4) ? 1.3 : 1;
      if (e.state === "warcry") { e.moving = false; if (e.st > 0.7) { e.state = "approach"; e.st = 0; } return; }
      if (e.state === "idle" || e.state === "approach") {
        e.state = "approach";
        const mates = live.filter((o) => o.type === "spear" && o.tribe === e.tribe), idx = mates.indexOf(e), n = mates.length;
        const slot = toP + Math.PI + (n > 1 ? (idx - (n - 1) / 2) * 0.95 : 0);
        const tx = P.x + Math.cos(slot) * 44, ty = P.y + Math.sin(slot) * 32, da = Math.atan2(ty - e.y, tx - e.x), dd = Math.hypot(tx - e.x, ty - e.y);
        if (dd > 6) { e.moving = tryMove(e, Math.cos(da) * 64 * hype * dt, Math.sin(da) * 64 * hype * dt); } else e.moving = false;
        e.face = Math.cos(toP) >= 0 ? 1 : -1;
        // raise a guard when the player swings at it head-on
        if (P.attacking && d < 52 && Math.random() < dt * 3 && Math.cos(Math.atan2(P.y - e.y, P.x - e.x) - (e.face > 0 ? 0 : Math.PI)) > 0.4) { e.state = "guard"; e.st = 0; e.moving = false; sfx(api, "guard"); }
        else if (d < 70 && e.st > (e.next || (e.next = rnd(0.7, 1.4)) / hype)) {
          e.st = 0; e.aim = toP; e.moving = false;
          const behind = Math.cos(toP - (e.face > 0 ? 0 : Math.PI)) < -0.2;
          if (d < 34 && (behind || Math.random() < 0.3)) e.state = "windSweep";
          else if (Math.random() < 0.35) e.state = "windJab";
          else e.state = "wind";
        }
      }
      if (e.state === "guard") { e.face = Math.cos(toP) >= 0 ? 1 : -1; if (e.st > 0.9) { e.state = Math.random() < 0.6 ? "windJab" : "approach"; e.st = 0; e.aim = toP; } }
      if (e.state === "wind") { e.aim += angDiff(toP, e.aim) * Math.min(1, dt * 2.5); e.face = Math.cos(e.aim) >= 0 ? 1 : -1; if (e.st > 0.5) { e.state = "lunge"; e.st = 0; e.hitDone = false; sfx(api, "spearLunge"); } }
      if (e.state === "lunge") {
        const sp = 310 * (1 - e.st / 0.2);
        tryMove(e, Math.cos(e.aim) * sp * dt, Math.sin(e.aim) * sp * dt * 0.85);
        if (!e.hitDone && hitPlayer(e, P, api, e.x + Math.cos(e.aim) * 22, e.y - 10 + Math.sin(e.aim) * 16, 13, 2)) e.hitDone = true;
        if (e.st > 0.2) { e.state = "recover"; e.st = 0; }
      }
      if (e.state === "windJab") { e.face = Math.cos(e.aim) >= 0 ? 1 : -1; if (e.st > 0.38) { e.state = "jab"; e.st = 0; e.jabs = 0; } }
      if (e.state === "jab") {
        // three quick jabs in a fan
        const k = Math.floor(e.st / 0.16);
        if (k > e.jabs - 1 && e.jabs < 3) { e.jabs++; e.aim = toP + (e.jabs - 2) * 0.3; e.hitDone = false; sfx(api, "spearLunge"); }
        const u = (e.st % 0.16) / 0.16; e.jabOut = Math.sin(u * Math.PI);
        if (!e.hitDone && e.jabOut > 0.6 && hitPlayer(e, P, api, e.x + Math.cos(e.aim) * 24, e.y - 10 + Math.sin(e.aim) * 18, 11, 1)) e.hitDone = true;
        if (e.st > 0.5) { e.state = "recover"; e.st = 0; e.jabOut = 0; }
      }
      if (e.state === "windSweep" && e.st > 0.42) { e.state = "sweep"; e.st = 0; e.hitDone = false; sfx(api, "spearSweep"); }
      if (e.state === "sweep") {
        e.aim += dt * 16 * e.face;
        if (!e.hitDone && d < 34) { if (api.hurt(1, e.x, e.y, "spear")) e.hitDone = true; }
        if (e.st > 0.4) { e.state = "recover"; e.st = 0; }
      }
      if (e.state === "recover" && e.st > 0.55) { e.state = "approach"; e.st = 0; e.next = rnd(0.8, 1.6); }
    },

    // ---------------------------------------------------------------- Tiki Darter
    dart(e, dt, t, P, L, api, d, live) {
      const toP = Math.atan2(P.y - 10 - (e.y - 14), P.x - e.x);
      e.aimA += angDiff(toP, e.aimA) * Math.min(1, dt * 6);
      e.puff = Math.max(0, e.puff - dt * 3);
      if (!e.alerted) { e.moving = false; return; }
      const spears = live.filter((o) => o !== e && o.tribe && o.tribe === e.tribe && o.type === "spear").length, alone = spears === 0;
      const charging = P.moving && Math.cos(Math.atan2(e.y - P.y, e.x - P.x) - P.moveA) > 0.75 && d < 90;
      e.face = Math.cos(toP) >= 0 ? 1 : -1;
      if (e.state === "idle" || e.state === "range") {
        e.state = "range";
        const want = alone ? 54 : 120;
        let mx = 0, my = 0;
        if (charging && !alone && e.st > 0.4) { e.state = "hop"; e.st = 0; e.hopA = Math.atan2(e.y - P.y, e.x - P.x) + rnd(-0.5, 0.5); sfx(api, "hop"); return; }
        if (d > want + 18) { mx = Math.cos(toP); my = Math.sin(toP); }
        else if (d < want - 18) { mx = -Math.cos(toP); my = -Math.sin(toP); }
        else { e.side = e.side || (Math.random() < 0.5 ? 1 : -1); mx = -Math.sin(toP) * e.side; my = Math.cos(toP) * e.side; if (Math.random() < dt * 0.6) e.side *= -1; }
        e.moving = tryMove(e, mx * 56 * dt, my * 56 * dt);
        if (e.st > (e.next || (e.next = rnd(1.0, 1.7))) && Level.sight(e.x, e.y - 12, P.x, P.y - 12)) {
          e.st = 0; e.moving = false;
          const r = Math.random();
          e.state = !alone && r < 0.25 ? "windGourd" : "aim";
          if (e.state === "aim") sfx(api, "inhale");
        }
        if (alone && d < 28 && e.st > 0.4) { e.state = "windSwing"; e.st = 0; e.aim = toP; }
      }
      if (e.state === "aim") {
        // cheeks puff, the pipe steadies; you see its line of fire
        e.puff = Math.min(1, e.st / 0.45); e.aimLine = true;
        if (e.st > (alone ? 0.4 : 0.55)) {
          e.aimLine = false;
          const volley = live.some((o) => o !== e && o.type === "dart" && o.tribe === e.tribe && o.state === "aim");
          const shots = alone ? [-0.2, 0, 0.2] : volley ? [-0.12, 0.12] : [0];
          for (const o of shots) { const a = e.aimA + o; L.shots.push({ kind: "dart", x: e.x + Math.cos(a) * 18, y: e.y - 15 + Math.sin(a) * 10, vx: Math.cos(a) * 210, vy: Math.sin(a) * 210, t: 0, life: 1.5 }); }
          sfx(api, "dart"); e.state = "range"; e.st = 0; e.next = alone ? rnd(0.7, 1.1) : rnd(1.3, 2.1); e.puff = 0;
        }
      }
      if (e.state === "windGourd" && e.st > 0.45) {
        const tx = P.x + (P.vx || 0) * 0.5, ty = P.y + (P.vy || 0) * 0.5, T2 = 0.92;
        L.shots.push({ kind: "gourd", x: e.x, y: e.y - 4, vx: (tx - e.x) / T2, vy: (ty - e.y) / T2, h: 16, vh: 120, t: 0, life: 2 });
        sfx(api, "throw"); e.state = "range"; e.st = 0; e.next = rnd(1.4, 2.2);
      }
      if (e.state === "hop") {
        const u = e.st / 0.36; tryMove(e, Math.cos(e.hopA) * 150 * dt, Math.sin(e.hopA) * 150 * dt); e.hopH = Math.sin(Math.min(1, u) * Math.PI) * 10;
        if (u >= 1) { e.hopH = 0; e.state = "range"; e.st = 0; e.next = rnd(0.3, 0.6); }
      }
      if (e.state === "windSwing" && e.st > 0.32) { e.state = "swing"; e.st = 0; e.hitDone = false; sfx(api, "swingClub"); }
      if (e.state === "swing") { const sp = 200 * (1 - e.st / 0.2); tryMove(e, Math.cos(e.aim) * sp * dt, Math.sin(e.aim) * sp * dt); if (!e.hitDone && hitPlayer(e, P, api, e.x + Math.cos(e.aim) * 12, e.y - 8, 13, 1)) e.hitDone = true; if (e.st > 0.32) { e.state = "range"; e.st = 0; } }
    },
  };
  const bez = (p, u) => ({ x: (1 - u) * (1 - u) * p[0].x + 2 * (1 - u) * u * p[1].x + u * u * p[2].x, y: (1 - u) * (1 - u) * p[0].y + 2 * (1 - u) * u * p[1].y + u * u * p[2].y });

  // ------------------------------------------------------------------ drawing
  const glow = (g, x, y, r, rgb, a) => { if (g) Level.glowAt(g, x, y, r, rgb, a); };
  // a sun-gold spark above a creature about to strike (the game's one shared "warning")
  function telegraph(ctx, x, y, t) {
    const on = Math.sin(t * 30) > 0, S = R().sun;
    ctx.fillStyle = css(R().obsidian[0]); ctx.fillRect(Math.round(x) - 3, Math.round(y) - 3, 7, 7);
    ctx.fillStyle = css(on ? S[6] : S[4]); ctx.fillRect(Math.round(x) - 2, Math.round(y), 5, 1); ctx.fillRect(Math.round(x), Math.round(y) - 2, 1, 5);
    ctx.fillStyle = css(S[6]); ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  const winding = (e) => e.state === "wind" || e.state === "windJab" || e.state === "windSweep" || e.state === "windSpit" || e.state === "windGourd" || e.state === "windSwing" || e.state === "aim" || e.state === "charge" || e.state === "trace";

  E.draw = function (e, ctx, ox, oy, t, g) {
    let x = e.x - ox, y = e.y - oy;
    const fl = e.flash > 0;
    // entrances
    let introY = 0, alpha = 1;
    if (e.introT > 0) {
      const u = e.introT / 0.9;
      if (e.enter === "leap") introY = -70 * u * u;
      else if (e.enter === "descend") introY = -90 * u;
      else if (e.enter === "burst") e.rise = Math.max(e.rise || 0, 1 - u);
      else if (e.enter === "scurry") alpha = 1 - u;
    }
    if (E.DRAW[e.type]) { ctx.globalAlpha = alpha; E.DRAW[e.type](e, ctx, ox, oy, t, g, introY, fl); ctx.globalAlpha = 1; if (!e.boss && e.hp < e.max && e.introT <= 0 && !e.hideBar) { const w = 18, bx = Math.round(x - w / 2), by = Math.round(y - (STATS[e.type].barY || 30)); ctx.fillStyle = css(R().obsidian[0]); ctx.fillRect(bx - 1, by - 1, w + 2, 4); ctx.fillStyle = css(R().hibiscus[0]); ctx.fillRect(bx, by, w, 2); ctx.fillStyle = css(R().hibiscus[3]); ctx.fillRect(bx, by, Math.round(w * Math.max(0, e.hp / e.max)), 2); } return; }
    if (e.type !== "wisp" && e.type !== "vine") { ctx.fillStyle = "rgba(10,12,16,0.32)"; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), e.r + 3 - Math.min(4, -introY / 18), 3, 0, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = alpha;
    if (e.type === "gecko") drawGecko(e, ctx, x, y + introY, t, fl);
    else if (e.type === "vine") drawVine(e, ctx, ox, oy, t, fl, g);
    else if (e.type === "wisp") drawWisp(e, ctx, ox, oy, t, fl, g, introY);
    else drawTiki(e, ctx, x, y + introY - (e.hopH || 0), t, fl, g);
    ctx.globalAlpha = 1;
    // health after being struck
    if (e.hp < e.max && e.introT <= 0 && !(e.type === "vine" && (e.rise || 0) < 0.3)) {
      const w = 18, bx = Math.round((e.type === "vine" ? e.rx - ox : x) - w / 2), by = Math.round((e.type === "vine" ? e.ry - oy - 74 : e.type === "wisp" ? y - 16 : y - (e.type === "gecko" ? 24 : 42)));
      ctx.fillStyle = css(R().obsidian[0]); ctx.fillRect(bx - 1, by - 1, w + 2, 4); ctx.fillStyle = css(R().hibiscus[0]); ctx.fillRect(bx, by, w, 2); ctx.fillStyle = css(R().hibiscus[3]); ctx.fillRect(bx, by, Math.round(w * Math.max(0, e.hp / e.max)), 2);
    }
  };

  function drawGecko(e, ctx, x, y, t, fl) {
    const img = e.img || A.img.e_gecko;
    let sx = 1, sy = 1, bob = 0;
    if (e.state === "wind") { sx = 1.1; sy = 0.82; } else if (e.state === "lunge") { sx = 1.25; sy = 0.86; } else if (e.moving) bob = Math.abs(Math.sin(e.t * 28)) * 1.5;
    const tail = Math.round(Math.sin(e.t * (e.moving ? 22 : 4)) * (e.moving ? 2 : 1));
    const src = fl ? tinted(img) : img, tw = 16, w = img.width * sx, h = img.height * sy;
    ctx.save(); ctx.translate(Math.round(x), Math.round(y - bob)); ctx.scale(e.face, 1);
    ctx.drawImage(src, 0, 0, tw, img.height, -w / 2, -h + tail, tw * sx, h);
    ctx.drawImage(src, tw, 0, img.width - tw, img.height, -w / 2 + tw * sx, -h, (img.width - tw) * sx, h);
    if (e.state === "wind" && Math.sin(t * 40) > 0) { ctx.fillStyle = css(R().sun[5]); for (let k = 0; k < 6; k++) ctx.fillRect(-w / 2 + 14 + k * 4, -h + 1 + (k % 2), 2, 1); }
    ctx.restore();
    if (e.state === "wind") telegraph(ctx, x, y - 26, t);
  }

  // ---- the vine-lasher: bush of leaves, a thorned tube of a body, a sun-crested pod head
  function drawVine(e, ctx, ox, oy, t, fl, g) {
    const S = e.S, W = S.w, H = S.h, cx = W / 2, cy = 116, rx = e.rx, ry = e.ry, rise = e.rise || 0;
    begin(S);
    const PALM = P8("palm"), FERN = P8("fern"), SUN = P8("sun"), HIB = P8("hibiscus"), KO = P8("koa"), CREAM = PAL.pk(R().kapa[3]);
    const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) { S.d[y * W + x] = fl ? WHITE : c; mark(S, x, y); } };
    const lx = (wx) => wx - rx + cx, ly = (wy) => wy - ry + cy;
    // the disguise: a small island monstera (the same sprite and the same wind as the monstera props).
    // It only gives itself away with a shiver just before it rises.
    const FS = A.img.plant_monstera_a, FB = fernFrames || (fernFrames = Props.bendFrames(FS, 2, 7)), sw = K.sway(e, t, rx, ry, 14, 7, 4);
    const shiver = e.state === "rise" || winding(e) ? Math.round(Math.sin(t * 46)) : 0;
    if (e.state === "burrow" && rise <= 0.3) {            // tunnelling: a ridge of torn earth moves under the ground
      ctx.fillStyle = css(R().soil[1]); ctx.fillRect(Math.round(rx - 6 - ox), Math.round(ry - 3 - oy), 12, 3);
      ctx.fillStyle = css(R().soil[4]); ctx.fillRect(Math.round(rx - 4 - ox), Math.round(ry - 4 - oy), 8, 1);
    } else ctx.drawImage(fl && rise > 0.3 ? tinted(FB.frames[sw.level]) : FB.frames[sw.level], Math.round(rx - FS.width / 2 - FB.pad - ox + shiver), Math.round(ry - FS.height + 3 - oy));
    if (rise > 0.02) {
      const ch = e.chain, n = ch.length - 1, pts = ch.map((p) => [lx(p.x), ly(p.y)]);
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const [px, py] of pts) { x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py); }
      // the body: shaded discs stamped along the spine (a tapering stem lit from the top-left),
      // leaf nodes every few pixels, and small green thorns on its outer side
      let acc = 0;
      for (let i = 0; i < n; i++) {
        const ax = pts[i][0], ay = pts[i][1], dx = pts[i + 1][0] - ax, dy = pts[i + 1][1] - ay, sl = Math.hypot(dx, dy) || 1, nx = -dy / sl, ny = dx / sl;
        for (let u = 0; u < sl; u += 0.8, acc += 0.8) {
          const px = ax + (dx * u) / sl, py = ay + (dy * u) / sl, bs = (i + u / sl) / n, r = 4.8 - bs * 2, R2 = Math.ceil(r), node = acc % 9 < 1.2;
          for (let oy = -R2; oy <= R2; oy++) for (let ox = -R2; ox <= R2; ox++) {
            if (ox * ox + oy * oy > r * r) continue;
            const lit = (ox * -0.7 + oy * -0.7) / r;
            let ci = Math.round(3.2 + lit * 2.2); if (node) ci -= 1; if (Math.abs(lit) < 0.18 && ci >= 3) ci = 5;
            put(px + ox, py + oy, FERN[Math.max(1, Math.min(6, ci))]);
          }
          if (bs > 0.15 && acc % 7 < 0.8) { put(px + nx * (r + 1), py + ny * (r + 1), FERN[2]); put(px + nx * (r + 2), py + ny * (r + 2), FERN[3]); }
        }
      }
      // leaves sprouting from the vine
      for (const [ni, side] of [[2, 1], [4, -1], [6, 1], [8, -1]]) {
        const p = pts[ni], q = pts[ni + 1], a = Math.atan2(q[1] - p[1], q[0] - p[0]) + side * 1.25 + Math.sin(t * 3.4 + ni) * 0.18 + (K.W ? K.W.x * 0.2 : 0), L2 = 12 - ni * 0.6;
        const ca2 = Math.cos(a), sa2 = Math.sin(a);
        for (let s2 = 0; s2 < L2; s2 += 0.5) {
          const mx = p[0] + ca2 * s2, my = p[1] + sa2 * s2 + (s2 * s2) * 0.03;     // the frond droops toward its tip
          put(mx, my, FERN[2]);
          if (s2 > 1 && (s2 * 2) % 3 < 1) { const ll = 3.2 * (1 - s2 / L2) + 1; for (const sg of [-1, 1]) for (let w2 = 1; w2 <= ll; w2 += 0.5) { const lx2 = mx + (-sa2 * sg + ca2 * 0.5) * w2, ly2 = my + (ca2 * sg + sa2 * 0.5) * w2; put(lx2, ly2, sg * side < 0 ? FERN[5] : w2 > ll - 1 ? FERN[3] : FERN[4]); } }
        }
      }
      // the head, drawn in its own frame so it stays crisp at any angle
      const hp = pts[n], hq = pts[n - 1], ha = Math.atan2(hp[1] - hq[1], hp[0] - hq[0]);
      const open = e.state === "lash" || e.state === "hold" || e.state === "sweep" ? 1 : e.state === "spit" ? 0.8 : winding(e) ? 0.45 : 0.12, ca = Math.cos(ha), sa = Math.sin(ha);
      const flare = winding(e) ? 1 : 0.4;
      for (let y = (hp[1] - 18) | 0; y < hp[1] + 18; y++) for (let x = (hp[0] - 18) | 0; x < hp[0] + 18; x++) {
        const dx = x + 0.5 - hp[0], dy = y + 0.5 - hp[1], u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
        // sun crest: petals fanned behind the head
        const pa = Math.atan2(v, -u + 2), pr = Math.hypot(v, -u + 2);
        if (u < 1.5 && pr < 9.5 + flare * 3.5 && pr > 3 && Math.abs(pa) < 1.6) { const pet = Math.abs(((pa / 0.38) % 1 + 1) % 1 - 0.5); if (pet < 0.32) { put(x, y, pr > 8 + flare * 3 ? SUN[2] : pr > 6 ? SUN[4] : SUN[5]); continue; } }
        // jaws
        const gap = open * 4, upper = ((u - 4) / 9) ** 2 + ((v + 2 + gap * 0.5) / 4) ** 2, lower = ((u - 3.4) / 8) ** 2 + ((v - 2 - gap * 0.5) / 3.3) ** 2;
        if (upper < 1 || lower < 1) {
          const isU = upper < 1, edge = isU ? v > -2 - gap * 0.5 + 1.6 : v < 2 + gap * 0.5 - 1.6;
          if (edge && u > 0 && open > 0.3 && Math.floor(u) % 2 === 0) put(x, y, CREAM);            // thorn teeth
          else put(x, y, isU ? (v < -3.8 - gap * 0.5 ? FERN[6] : v < -2.6 - gap * 0.5 ? FERN[5] : FERN[4]) : (v > 3.6 + gap * 0.5 ? FERN[2] : FERN[3]));
          if (isU && Math.abs(u - 3.5) < 1.2 && Math.abs(v + 2.8 + gap * 0.5) < 1) put(x, y, winding(e) && Math.sin(t * 30) > 0 ? PAL.pk([255, 255, 255]) : SUN[5]);   // the eye
          continue;
        }
        if (open > 0.3 && u > 0 && u < 11 && Math.abs(v) < gap * 0.5 + 0.8) put(x, y, HIB[u < 4 ? 0 : 1]);   // maw
      }
      glow(g, hp[0] + rx - cx - ox, hp[1] + ry - cy - oy, 10 + flare * 8, "255,200,90", 0.25 * flare);
    }
    if (flush(S, true)) ctx.drawImage(S.c, Math.round(rx - cx - ox), Math.round(ry - cy - oy));
    if (winding(e)) telegraph(ctx, e.chain[e.chain.length - 1].x - ox, e.chain[e.chain.length - 1].y - oy - 14, t);
  }

  // ---- the sun-wisp: a white-hot core with a sun-mask face, a corona of flame tongues that
  // streams away from its motion, and a curling comet tail along its path
  function drawWisp(e, ctx, ox, oy, t, fl, g, introY) {
    const S = e.S, W = S.w, cx = W / 2, cy = W / 2, FI = P8("fire"), SUN = P8("sun"), OB = P8("obsidian"), sc = e.sc || 1, RR = Math.round(24 * sc);
    begin(S);
    const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < W && y < W && !S.d[y * W + x]) { S.d[y * W + x] = fl ? WHITE : c; mark(S, x, y); } };
    const ex = e.x, ey = e.y + introY, back = e.va + Math.PI;
    const charge = e.state === "charge" ? Math.min(1, e.st / 0.8) : e.state === "shed" ? Math.min(1, e.st / 0.5) : 0;
    const coreR = (5.6 - charge * 1.4 + Math.sin(t * 9 + e.ph) * 0.4) * sc;
    // core, face and corona
    for (let y = cy - RR; y < cy + RR; y++) for (let x = cx - RR; x < cx + RR; x++) {
      const dx = (x + 0.5 - cx), dy = (y + 0.5 - cy), r = Math.hypot(dx, dy);
      if (r > RR) continue;
      const a = Math.atan2(dy, dx), tailward = Math.max(0, Math.cos(a - back));
      const F = (3 + 4.6 * K.noise(a * 2.2 + e.seed, t * 3.6 + r * 0.1 / sc) + tailward * 8 + charge * 3) * sc;
      if (r < coreR) {
        let c = r < coreR * 0.5 ? FI[4] : FI[3];
        // the sun-mask face: two dark slit eyes (squinting when it attacks) and a small mouth
        const squint = charge > 0 || e.state === "swoop" ? 0.4 : 1, blink = (t + e.ph) % 3.4 < 0.12;
        const fx = dx / sc, fy = dy / sc;
        if (!blink && Math.abs(fy + 1) < 0.7 * squint + 0.3 && (Math.abs(fx - 2.1) < 0.9 || Math.abs(fx + 2.1) < 0.9)) c = OB[1];
        if (charge > 0.5 && Math.abs(fx) < 1 && Math.abs(fy - 1.8) < 0.8) c = FI[1];
        put(x, y, c);
      } else if (r < coreR + F) {
        const u = (r - coreR) / F;
        put(x, y, u < 0.3 ? FI[3] : u < 0.65 ? (PAL.bayer(x, y) + 0.5 < 0.6 ? FI[2] : FI[3]) : PAL.bayer(x, y) + 0.5 < (1 - u) * 1.6 ? FI[1] : 0);
      }
    }
    // the comet tail along its trail, thinning and cooling to ash
    const tr = e.trail;
    for (let i = 1; i < tr.length; i++) {
      const [x0, y0] = tr[i - 1], [x1, y1] = tr[i], s = i / tr.length, w = (5 * (1 - s) + 0.5) * sc;
      for (let k = 0; k <= 4; k++) { const px = x0 + (x1 - x0) * k / 4 - ex + cx, py = y0 + (y1 - y0) * k / 4 - ey + cy; for (let oy2 = -w; oy2 <= w; oy2 += 1) for (let ox2 = -w; ox2 <= w; ox2 += 1) { if (ox2 * ox2 + oy2 * oy2 > w * w) continue; const qx = (px + ox2) | 0, qy = (py + oy2) | 0; put(qx, qy, s < 0.25 ? FI[3] : s < 0.55 ? FI[2] : s < 0.8 ? FI[1] : PAL.bayer(qx, qy) > 0 ? OB[2] : 0); } }
    }
    if (flush(S, false)) ctx.drawImage(S.c, Math.round(ex - cx - ox), Math.round(ey - cy - oy));
    glow(g, ex - ox, ey - oy, (40 + charge * 40) * sc, "255,180,80", 0.55 + charge * 0.4);
    // the ground far below catches its light; its shadow is a soft point
    ctx.fillStyle = "rgba(10,12,16,0.22)"; ctx.beginPath(); ctx.ellipse(Math.round(ex - ox), Math.round(e.y - oy + 16), 4, 1.5, 0, 0, TAU); ctx.fill();
    if (charge > 0 && e.state === "charge") { ctx.strokeStyle = css(R().sun[5]); ctx.globalAlpha = charge * 0.8; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(Math.round(ex - ox), Math.round(e.y - oy + 10), 70 * (1 - charge * 0.15), 49 * (1 - charge * 0.15), 0, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; }
    if (e.state === "trace" && e.arc) { for (let k = 0; k <= 16; k++) { const p = bez(e.arc, k / 16); if (((k + Math.floor(t * 12)) & 1) === 0) { ctx.fillStyle = css(R().sun[5]); ctx.fillRect(Math.round(p.x - ox), Math.round(p.y - oy), 2, 2); } } }
    if (winding(e)) telegraph(ctx, ex - ox, ey - oy - 14, t);
  }

  // ---- tiki warriors: the original sprites, animated the way the gecko is (squash and stretch, a
  // waddling bob, stepping feet, a springy crest), with the weapon held and swung separately
  function drawTiki(e, ctx, x, y, t, fl, g) {
    const spear = e.type === "spear", D = TIKI[e.type], f = e.face, mir = f === D.faceSprite ? 1 : -1;
    let sx = 1, sy = 1, bob = e.moving ? Math.abs(Math.sin(e.walkPh)) * 1.5 : Math.sin(e.t * 2.6 + e.ph) * 0.5;
    if (winding(e)) { sx = 1.1; sy = 0.86; } else if (e.state === "lunge" || e.state === "swing") { sx = 0.9; sy = 1.1; } else if (e.state === "warcry") { sy = 1 + Math.abs(Math.sin(e.st * 18)) * 0.08; }
    if (!spear && e.puff) sx += e.puff * 0.08;
    const body = fl ? tinted(D.body) : D.body, W2 = D.w, H2 = D.h, cx = W2 / 2;
    const X = Math.round(x), Y = Math.round(y - bob);
    ctx.save(); ctx.translate(X, Y); ctx.scale(mir * sx, sy);
    const L = D.legs, top = D.top, step = e.moving ? Math.sin(e.walkPh) : 0;
    // feet: each half of the bottom rows lifts in turn
    ctx.drawImage(body, 0, H2 - L, Math.floor(cx), L, -cx, -L - (step > 0.3 ? 1 : 0), Math.floor(cx), L);
    ctx.drawImage(body, Math.floor(cx), H2 - L, W2 - Math.floor(cx), L, -cx + Math.floor(cx), -L - (step < -0.3 ? 1 : 0), W2 - Math.floor(cx), L);
    // body, and the feather crest springing on top
    ctx.drawImage(body, 0, top, W2, H2 - L - top, -cx, -H2 + top, W2, H2 - L - top);
    if (top) ctx.drawImage(body, 0, 0, W2, top, -cx + K.clamp(Math.round(-e.cape[0].a * 3 * mir), -1, 1), -H2, W2, top);
    ctx.restore();
    // the weapon, in world space so it can point anywhere
    const gx = X + mir * (D.grip.x - cx) * sx, gy = Y - (H2 - D.grip.y) * sy;
    let a = D.base + (spear ? Math.sin(e.t * 2 + e.ph) * 0.05 * (1 - (e.moving ? 0 : 1)) : 0), out = 0;
    if (spear) {
      if (e.state === "wind" || e.state === "windJab") { a = e.aim; out = -6; }
      else if (e.state === "lunge") { a = e.aim; out = 9; }
      else if (e.state === "jab") { a = e.aim; out = (e.jabOut || 0) * 11; }
      else if (e.state === "sweep" || e.state === "windSweep") a = e.aim;
      else if (e.state === "guard") a = f > 0 ? -0.2 : Math.PI + 0.2;
      else if (e.state === "warcry") a = -Math.PI / 2 + Math.sin(e.st * 22) * 0.25;
      else if (e.state === "recover") a = e.aim + (-Math.PI / 2 - e.aim) * Math.min(1, e.st / 0.4);
      if (e.state !== "guard" && e.state !== "warcry" && e.state !== "recover" && !winding(e) && e.state !== "lunge" && e.state !== "jab" && e.state !== "sweep") a = -Math.PI / 2 + f * 0.12;
    } else { a = e.aimA; if (Math.cos(a) * f < -0.2) a = f > 0 ? 0 : Math.PI; }
    const W3 = D.weapon, th = a - D.base, k = ((Math.round((th / TAU) * W3.n) % W3.n) + W3.n) % W3.n, img = fl ? tinted(W3.frames[k]) : W3.frames[k];
    ctx.drawImage(img, Math.round(gx + Math.cos(a) * out - W3.R), Math.round(gy + Math.sin(a) * out - W3.R));
    if (spear && (e.state === "wind" || e.state === "windJab") && Math.sin(t * 40) > 0) { const tx = gx + Math.cos(a) * (out + 20), ty = gy + Math.sin(a) * (out + 20); ctx.fillStyle = css(R().sun[6]); ctx.fillRect(Math.round(tx) - 1, Math.round(ty), 3, 1); ctx.fillRect(Math.round(tx), Math.round(ty) - 1, 1, 3); }
    if (spear && e.state === "sweep") glow(g, X, Y - 14, 34, "255,230,170", 0.25);
    if (!spear && e.aimLine) { const ux = Math.cos(a), uy = Math.sin(a); for (let s2 = 16; s2 < 120; s2 += 4) if (((s2 >> 2) + Math.floor(t * 20)) & 1) { ctx.fillStyle = css(R().kapa[2]); ctx.fillRect(Math.round(gx + ux * s2), Math.round(gy + uy * s2), 1, 1); } }
    if (winding(e)) telegraph(ctx, X, Y - H2 - 8, t);
    if (e.state === "warcry" && g) glow(g, X, Y - H2 + 8, 26, "255,110,80", 0.45);
  }

  E.drawShots = function (ctx, ox, oy, L) {
    for (const s of L.shots) {
      const x = s.x - ox, y = s.y - oy;
      if (s.kind === "dart") {
        const a = Math.atan2(s.vy, s.vx), ux = Math.cos(a), uy = Math.sin(a);
        for (let k = -6; k <= 2; k++) { ctx.fillStyle = k < -4 ? css(R().kapa[2]) : k > 0 ? css(R().obsidian[5]) : css(R().glyph[4]); ctx.fillRect(Math.round(x + ux * k), Math.round(y + uy * k), 1, 1); }
      } else if (s.kind === "seed") {
        ctx.fillStyle = css(R().koa[1]); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); ctx.fillStyle = css(R().kapa[3]); ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 1);
      } else if (s.kind === "mote") {
        ctx.fillStyle = css(R().fire[2]); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3); ctx.fillStyle = css(R().fire[4]); ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      } else if (s.kind === "gourd") {
        ctx.fillStyle = "rgba(10,12,16,0.3)"; ctx.fillRect(Math.round(x) - 2, Math.round(y), 5, 2);
        ctx.fillStyle = css(R().glyph[1]); ctx.fillRect(Math.round(x) - 2, Math.round(y - s.h) - 2, 5, 5); ctx.fillStyle = css(R().glyph[3]); ctx.fillRect(Math.round(x) - 1, Math.round(y - s.h) - 2, 2, 2); ctx.fillStyle = css(R().taro[3]); ctx.fillRect(Math.round(x), Math.round(y - s.h) - 4, 1, 2);
      }
    }
    const t = Combat.clock;
    for (const r of L.fx) {
      if (r.kind === "pulse") { const u = r.t / r.dur, rad = u * r.R; for (const [w, c, a] of [[4, R().fire[2], 0.7], [2, R().sun[5], 1]]) { ctx.strokeStyle = PAL.css(c, a * (1 - u)); ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(Math.round(r.x - ox), Math.round(r.y - oy), rad, rad * 0.7, 0, 0, TAU); ctx.stroke(); } }
      else if (r.kind === "flames") {
        const life = Math.min(1, (r.dur - r.t) / 0.5, r.t / 0.15), FI = R().fire;
        for (let k = 0; k < 7; k++) { const a = k * 2.4 + r.x, rr = r.R * 0.7 * ((k * 37) % 10) / 10, fx = r.x + Math.cos(a) * rr, fy = r.y + Math.sin(a) * rr * 0.6, h = (2 + ((k + Math.floor(t * 14)) % 4)) * life; ctx.fillStyle = css(FI[1]); ctx.fillRect(Math.round(fx - ox), Math.round(fy - oy - h), 2, Math.ceil(h)); ctx.fillStyle = css(FI[3]); ctx.fillRect(Math.round(fx - ox), Math.round(fy - oy - h), 1, Math.ceil(h * 0.6)); if (h > 3) { ctx.fillStyle = css(FI[4]); ctx.fillRect(Math.round(fx - ox), Math.round(fy - oy - h), 1, 1); } }
      }
      else if (r.kind === "spores") {
        // a lingering cloud of spores, drawn as drifting dithered motes
        const life = Math.min(1, (r.dur - r.t) / 0.6, r.t / 0.3), n = 46;
        for (let k = 0; k < n; k++) { const a = k * 2.39 + r.t * (0.6 + (k % 3) * 0.3), rr = r.R * Math.sqrt((k + 0.5) / n), sx = r.x + Math.cos(a) * rr, sy = r.y + Math.sin(a) * rr * 0.7 - (k % 4) - Math.sin(r.t * 2 + k) * 2; if (K.hash2(k, (r.t * 6) | 0, 3) < life) { ctx.fillStyle = css(k % 3 === 0 ? R().bio_violet[5] : R().taro[k % 2 ? 4 : 2]); ctx.fillRect(Math.round(sx - ox), Math.round(sy - oy), k % 5 === 0 ? 2 : 1, k % 5 === 0 ? 2 : 1); } }
      } else if (r.kind === "beam" && !r.a.dead && !r.b.dead) {
        const ax = r.a.x - ox, ay = r.a.y - oy, bx = r.b.x - ox, by = r.b.y - oy, L2 = Math.hypot(bx - ax, by - ay) || 1, n = Math.ceil(L2), live = r.t > 0.7, nx = -(by - ay) / L2, ny = (bx - ax) / L2;
        for (let k = 0; k <= n; k++) {
          const u = k / n, wob = live ? Math.sin(u * 11 + t * 18) * 0.8 : 0, qx = ax + (bx - ax) * u + nx * wob, qy = ay + (by - ay) * u + ny * wob;
          if (!live) { if ((k + Math.floor(t * 24)) & 3) continue; ctx.fillStyle = css(R().sun[(Math.floor(t * 8) & 1) ? 5 : 3]); ctx.fillRect(Math.round(qx), Math.round(qy), 1, 1); continue; }
          ctx.fillStyle = css(R().fire[2]); ctx.fillRect(Math.round(qx + nx * 2), Math.round(qy + ny * 2), 1, 1); ctx.fillRect(Math.round(qx - nx * 2), Math.round(qy - ny * 2), 1, 1);
          ctx.fillStyle = css(R().sun[5]); ctx.fillRect(Math.round(qx + nx), Math.round(qy + ny), 1, 1); ctx.fillRect(Math.round(qx - nx), Math.round(qy - ny), 1, 1);
          ctx.fillStyle = css(R().sun[6]); ctx.fillRect(Math.round(qx), Math.round(qy), 1, 1);
          if (K.hash2(k, Math.floor(t * 20), 5) > 0.93) { ctx.fillStyle = css(R().fire[4]); ctx.fillRect(Math.round(qx + nx * 4 * (K.hash2(k, 1, Math.floor(t * 20)) - 0.5) * 2), Math.round(qy - 2), 1, 1); }
        }
      }
    }
  };
  E.drawGlow = function (g, ox, oy, L) {
    for (const s of L.shots) if (s.kind === "mote") glow(g, s.x - ox, s.y - oy, 10, "255,170,70", 0.6);
    for (const r of L.fx) if (r.kind === "beam" && r.t > 0.7 && !r.a.dead && !r.b.dead) { g.strokeStyle = "rgba(255,210,120,0.5)"; g.lineWidth = 12; g.beginPath(); g.moveTo(r.a.x - ox, r.a.y - oy); g.lineTo(r.b.x - ox, r.b.y - oy); g.stroke(); }
  };
  E.death = function (e) {
    if (E.ON_DEATH[e.type]) E.ON_DEATH[e.type](e);
    for (let k = 0; k < 24; k++) { const a = Math.random() * TAU; Combat.addPart({ x: e.x, y: e.y - 10, vx: Math.cos(a) * rnd(40, 140), vy: Math.sin(a) * rnd(30, 100) - 50, g: 240, life: rnd(0.5, 1), col: e.colors[k % 3], size: k % 4 ? 1 : 2, kind: "debris" }); }
    for (let k = 0; k < 8; k++) Combat.addPart({ x: e.x + rnd(-6, 6), y: e.y - 10, vx: rnd(-10, 10), vy: rnd(-50, -20), g: -10, life: rnd(0.8, 1.4), col: css(R().sun[5]), size: 1, kind: "ember", glow: true });
  };

  // ------------------------------------------------------------------ extension points (js/enemies2.js)
  E.STATS = STATS; E.AI = AI;
  E.SETUP = {}; E.DRAW = {}; E.NET = {}; E.ON_DEATH = {};
  E.lib = { Surface, begin, mark, flush, tryMove, hitPlayer, telegraph, tinted, flipped, glow, rnd, dist, angDiff, bez, winding, TAU, css, R, P8, WHITE, sfx, landed,
    tiki: () => TIKI, assets: () => A, drawGecko, drawWisp, drawTiki };
})();
