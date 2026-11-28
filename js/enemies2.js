// Creatures of the Canopy Passes and the Scorched Crown (Zone 1, levels 2 and 3).
//
// Built on the same machinery as js/enemies.js (per-pixel surfaces from the master palette, a gold
// spark before every attack, host-run AI with network hooks so guests see the same thing):
//
//   snake      - Bush Snake: a long, slithering green-and-gold snake. Hunts in S-curves, coils, and
//                strikes for two hearts. More dangerous than anything in the first highlands.
//   runner     - Stampede gecko: charges in a straight line with its herd. Survive the stampede.
//   hydra      - Lau-Poʻo, the Many-Headed (mini-boss): a mound of leaves with three vine heads that
//                lash and spit independently. Wound it and it grows more heads.
//   firedancer - Tiki Fire-Dancer: twirls a staff burning at both ends. Spins into you, sweeps,
//                and throws out rings of fire.
//   firegecko  - Fire Gecko: curls into a fireball and rolls at you, leaving a trail of flame.
//   hive       - Kahu-Ahi, the Bonfire Hive (boss): a burning nest that wisps pour out of. Hurt it
//                enough and it draws every wisp back in and rises as one giant fire spirit.
(function () {
  const E = window.Enemies, L0 = E.lib, AI = E.AI;
  const { Surface, begin, mark, flush, tryMove, telegraph, tinted, glow, rnd, dist, angDiff, TAU, css, R, P8, WHITE, winding } = L0;
  const sfx = (api, k) => api && api.sfx && api.sfx(k);
  const css2 = (c) => PAL.css(c);
  const playersNear = (x, y, r) => (E.alive || []).filter((q) => Math.hypot(q.x - x, q.y - 9 - y) < r);
  // hit every hero within reach of a point, each at most once per `set`
  function hitAny(e, x, y, reach, dmg, set, src) {
    let any = false;
    for (const q of E.alive || []) {
      const key = q.isRemote ? "r" + q.slot : "l";
      if (set && set[key]) continue;
      if (Math.hypot(q.x - x, q.y - 9 - y) < reach && q._api.hurt(dmg, e.x, e.y, src || e.type)) { if (set) set[key] = 1; any = true; }
    }
    return any;
  }
  const nearest = (x, y) => (E.alive || []).reduce((b, q) => (!b || Math.hypot(q.x - x, q.y - y) < Math.hypot(b.x - x, b.y - y) ? q : b), null);
  const addFlames = (L, x, y, dur, R2) => { if (L.fx.filter((f) => f.kind === "flames").length < 40) L.fx.push({ kind: "flames", x, y, t: 0, dur: dur || 1.8, R: R2 || 9 }); };
  const ember = (x, y, n, col) => { for (let k = 0; k < n; k++) Combat.addPart({ x: x + rnd(-4, 4), y: y + rnd(-4, 4), vx: rnd(-30, 30), vy: rnd(-60, -20), g: -10, life: rnd(0.4, 0.8), col: col || css(R().fire[3]), size: 1, kind: "ember", glow: true }); };

  const ST = E.STATS;
  ST.snake = { hp: 80, r: 8, mat: "flesh", kb: 40, barY: 22, colors: [css(R().fern[4]), css(R().fern[2]), css(R().sun[4])] };
  ST.runner = { hp: 14, r: 7, mat: "flesh", kb: 50, barY: 20, colors: ["#c8a050", "#8a7a62", "#f2c14a"] };
  ST.hydra = { hp: 520, r: 22, mat: "plant", kb: 0, boss: true, big: 24, name: "LAU-POʻO, THE MANY-HEADED", colors: [css(R().fern[4]), css(R().palm[2]), css(R().sun[4])] };
  ST.firedancer = { hp: 84, r: 8, mat: "wood", kb: 50, barY: 44, colors: [css(R().koa[4]), css(R().fire[2]), css(R().fire[4])] };
  ST.firegecko = { hp: 34, r: 8, mat: "fire", barY: 24, colors: [css(R().fire[2]), css(R().fire[3]), css(R().fire[4])] };
  ST.hive = { hp: 900, r: 24, mat: "fire", kb: 0, boss: true, big: 26, name: "KAHU-AHI, THE BONFIRE HIVE", colors: [css(R().fire[2]), css(R().fire[3]), css(R().koa[2])] };

  // ================================================================== Bush Snake
  const SNAKE_N = 18, SNAKE_SP = 4.4;
  E.SETUP.snake = (e) => { e.body = []; for (let k = 0; k < SNAKE_N; k++) e.body.push({ x: e.x - k * SNAKE_SP, y: e.y }); e.S = Surface(220, 220); e.wa = Math.random() * TAU; e.hitSet = {}; };
  function followBody(e) {
    const b = e.body; b[0].x = e.x; b[0].y = e.y;
    for (let k = 1; k < b.length; k++) { const p = b[k - 1], q = b[k], dx = q.x - p.x, dy = q.y - p.y, l = Math.hypot(dx, dy) || 1; if (l > SNAKE_SP) { q.x = p.x + (dx / l) * SNAKE_SP; q.y = p.y + (dy / l) * SNAKE_SP; } }
  }
  AI.snake = function (e, dt, t, P, L, api, d) {
    const toP = Math.atan2(P.y - 8 - e.y, P.x - e.x);
    e.armor = e.state === "recover" ? 1.4 : 1;
    let sp = 0, head = e.wa;
    if (!e.alerted) { e.wa += (K.noise(t * 0.5 + e.seed, e.seed) - 0.5) * 4 * dt; if (Math.hypot(e.hx - e.x, e.hy - e.y) > 60) e.wa += angDiff(Math.atan2(e.hy - e.y, e.hx - e.x), e.wa) * dt * 2; sp = 30; head = e.wa; e.state = "idle"; }
    else if (e.state === "idle" || e.state === "hunt") {
      e.state = "hunt";
      // an S-curve toward you: the heading weaves either side of the straight line
      head = toP + Math.sin(t * 5 + e.ph) * 0.75; sp = d > 60 ? 105 : 60;
      if (d < 78 && e.st > (e.next || (e.next = rnd(0.7, 1.4)))) { e.state = "coil"; e.st = 0; e.aimA = toP; sfx(api, "vineHiss"); }
      if (d > 300) { e.alerted = false; }
    } else if (e.state === "coil") {
      e.aimA += angDiff(toP, e.aimA) * Math.min(1, dt * 4); head = e.aimA + Math.PI; sp = 22;   // draws its head back
      if (e.st > 0.5) { e.state = "strike"; e.st = 0; e.hitSet = {}; sfx(api, "vineLash"); }
    } else if (e.state === "strike") {
      head = e.aimA; sp = 330 * (1 - e.st / 0.24);
      hitAny(e, e.x + Math.cos(e.aimA) * 6, e.y - 4, 13, 2, e.hitSet, "snake");
      if (e.st > 0.24) { e.state = "recover"; e.st = 0; }
    } else if (e.state === "recover") {
      sp = 0; if (e.st > 0.6) { e.state = "slide"; e.st = 0; e.side = Math.random() < 0.5 ? 1 : -1; }
    } else if (e.state === "slide") {
      head = toP + e.side * 1.6; sp = 90; if (e.st > 0.7) { e.state = "hunt"; e.st = 0; e.next = rnd(0.8, 1.6); }
    }
    if (sp > 0) {
      e.va = e.va === undefined ? head : e.va + angDiff(head, e.va) * Math.min(1, dt * (e.state === "strike" ? 30 : 7));
      const moved = tryMove(e, Math.cos(e.va) * sp * dt, Math.sin(e.va) * sp * dt);
      if (!moved && e.state !== "strike") e.wa += Math.PI * 0.5;
      e.moving = true; if (Math.abs(Math.cos(e.va)) > 0.2) e.face = Math.cos(e.va) > 0 ? 1 : -1;
    } else e.moving = false;
    followBody(e);
  };
  E.DRAW.snake = function (e, ctx, ox, oy, t, g, introY, fl) {
    const S = e.S, W = S.w, H = S.h, cx = W / 2, cy = H / 2, FE = P8("fern"), SU = P8("sun"), HI = P8("hibiscus"), OB = P8("obsidian");
    begin(S);
    const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) { S.d[y * W + x] = fl ? WHITE : c; mark(S, x, y); } };
    const b = e.body, n = b.length;
    // shadow under the body
    ctx.fillStyle = "rgba(10,12,16,0.25)";
    for (let k = 0; k < n; k += 2) ctx.fillRect(Math.round(b[k].x - ox - 3), Math.round(b[k].y - oy + 1), 6, 2);
    // body from tail to neck: shaded discs, gold diamond bands on green, a pale belly edge
    for (let k = n - 1; k >= 1; k--) {
      const p = b[k], q = b[k - 1], u = k / n, r = 4.6 - u * 3.2, steps = 3;
      for (let s2 = 0; s2 < steps; s2++) {
        const px = p.x + ((q.x - p.x) * s2) / steps - e.x + cx, py = p.y + ((q.y - p.y) * s2) / steps - e.y + cy - 4;
        const band = ((k * 3 + s2) % 7) < 2, R2 = Math.ceil(r);
        for (let oy2 = -R2; oy2 <= R2; oy2++) for (let ox2 = -R2; ox2 <= R2; ox2++) {
          if (ox2 * ox2 + oy2 * oy2 > r * r) continue;
          const lit = (-ox2 * 0.5 - oy2 * 0.85) / r;
          let c = lit > 0.45 ? FE[5] : lit > -0.1 ? FE[4] : lit > -0.55 ? FE[3] : FE[2];
          if (band && Math.abs(ox2) + Math.abs(oy2 + 1) < r * 0.75) c = lit > 0.2 ? SU[5] : SU[3];
          if (oy2 > r * 0.6) c = SU[2];
          put(px + ox2, py + oy2, c);
        }
      }
    }
    // the head: a wedge with gold brows, dark eyes and a forked tongue
    const a = e.state === "coil" || e.state === "strike" ? e.aimA : e.va || 0, ca = Math.cos(a), sa = Math.sin(a), hx = cx, hy = cy - 4;
    for (let y = hy - 9; y < hy + 9; y++) for (let x = hx - 9; x < hx + 9; x++) {
      const dx = x + 0.5 - hx, dy = y + 0.5 - hy, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      const w = 4.2 - Math.max(0, u) * 0.38;
      if (u > -3 && u < 8 && Math.abs(v) < w) {
        let c = Math.abs(v) > w - 1.2 ? FE[2] : v < 0 ? FE[5] : FE[4];
        if (u > 1 && u < 4 && Math.abs(Math.abs(v) - 2) < 0.9) c = winding(e) ? (Math.sin(t * 30) > 0 ? WHITE : SU[6]) : OB[0];
        if (u > 0 && u < 3 && Math.abs(Math.abs(v) - 3) < 0.6) c = SU[4];
        put(x, y, c);
      }
    }
    if (e.state === "hunt" && Math.sin(t * 9 + e.ph) > 0.2) for (let k = 0; k < 5; k++) { const tx = hx + ca * (8 + k), ty = hy + sa * (8 + k); put(tx + (k > 3 ? -sa : 0), ty + (k > 3 ? ca : 0), HI[3]); if (k > 3) put(tx + sa, ty - ca, HI[3]); }
    if (flush(S, true)) ctx.drawImage(S.c, Math.round(e.x - cx - ox), Math.round(e.y + introY - cy - oy));
    if (winding(e) || e.state === "coil") telegraph(ctx, e.x - ox, e.y - oy - 18, t);
  };
  E.NET.snake = {
    ser: (q, o, r1) => { o.b = q.body.flatMap((n) => [r1(n.x), r1(n.y)]); o.va = Math.round((q.va || 0) * 100) / 100; if (q.aimA !== undefined) o.aa = Math.round(q.aimA * 100) / 100; },
    app: (e, o) => { e.nb = o.b; e.va = o.va; },
    tick: (e, dt) => { if (!e.nb) return; const k = Math.min(1, dt * 14); for (let i = 0; i < e.body.length; i++) { e.body[i].x += (e.nb[i * 2] - e.body[i].x) * k; e.body[i].y += (e.nb[i * 2 + 1] - e.body[i].y) * k; } },
  };

  // ================================================================== Stampede runner
  E.SETUP.runner = (e) => { e.state = "run"; e.runA = 0; e.sp = rnd(190, 240); e.life = 5; e.hitSet = {}; e.blockT = 0; e.hideBar = true; };
  AI.runner = function (e, dt, t, P, L) {
    e.moving = true; e.face = Math.cos(e.runA) >= 0 ? 1 : -1;
    const moved = tryMove(e, Math.cos(e.runA) * e.sp * dt, Math.sin(e.runA) * e.sp * dt);
    e.blockT = moved ? 0 : e.blockT + dt;
    hitAny(e, e.x, e.y - 4, 11, 1, e.hitSet, "stampede");
    if (Math.random() < 0.2) Combat.addPart({ x: e.x + rnd(-3, 3), y: e.y, vx: -Math.cos(e.runA) * 20, vy: rnd(-14, -4), g: 30, life: 0.4, col: css(R().soil[4]), size: 1, kind: "smoke" });
    const b = e.bounds;
    if (e.blockT > 0.3 || e.st > e.life || (b && (e.x < b[0] - 20 || e.x > b[2] + 20 || e.y < b[1] - 20 || e.y > b[3] + 20))) { e.dead = true; e.gone = true; }
  };
  E.DRAW.runner = function (e, ctx, ox, oy, t, g, introY, fl) {
    ctx.fillStyle = "rgba(10,12,16,0.3)"; ctx.beginPath(); ctx.ellipse(Math.round(e.x - ox), Math.round(e.y - oy), 9, 3, 0, 0, TAU); ctx.fill();
    L0.drawGecko(e, ctx, e.x - ox, e.y - oy + introY, t, fl);
  };

  // ================================================================== Fire Gecko
  let fireGeckoImg = null;
  E.SETUP.firegecko = (e) => {
    if (!fireGeckoImg) { const src = L0.assets().img.e_gecko, [c, x] = K.canvas(src.width, src.height); x.drawImage(src, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = "rgba(236,86,28,0.5)"; x.fillRect(0, 0, src.width, src.height); fireGeckoImg = c; }
    e.img = fireGeckoImg; e.spin = 0;
  };
  AI.firegecko = function (e, dt, t, P, L, api, d, live) {
    const toP = Math.atan2(P.y - e.y, P.x - e.x);
    if (e.state === "curl") {
      e.spin += dt * (8 + e.st * 30); e.aimA = toP; e.face = Math.cos(toP) >= 0 ? 1 : -1;
      if (e.st > 0.55) { e.state = "roll"; e.st = 0; e.hitSet = {}; e.bounced = false; e.dropT = 0; sfx(api, "fire"); }
      return;
    }
    if (e.state === "roll") {
      e.spin += dt * 30;
      const sp = 250 * (e.st < 0.75 ? 1 : 1 - (e.st - 0.75) / 0.3);
      const moved = tryMove(e, Math.cos(e.aimA) * sp * dt, Math.sin(e.aimA) * sp * dt);
      if (!moved) { if (e.bounced) e.st = 9; else { e.bounced = true; e.aimA += Math.PI + rnd(-0.6, 0.6); Combat.shake = Math.min(1, Combat.shake + 0.15); } }
      hitAny(e, e.x, e.y - 6, 11, 1, e.hitSet, "fireball");
      e.dropT -= dt; if (e.dropT <= 0) { e.dropT = 0.09; addFlames(L, e.x, e.y, 1.7, 8); }
      if (Math.random() < 0.6) ember(e.x, e.y - 6, 1);
      e.moving = true;
      if (e.st > 1.05) { e.state = "recover"; e.st = 0; }
      return;
    }
    AI.gecko(e, dt, t, P, L, api, d, live);
    if (e.state === "wind" || e.state === "lunge") { e.state = "curl"; e.st = 0; sfx(api, "geckoHiss"); }
  };
  E.DRAW.firegecko = function (e, ctx, ox, oy, t, g, introY, fl) {
    const x = e.x - ox, y = e.y - oy + introY;
    ctx.fillStyle = "rgba(10,12,16,0.3)"; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(e.y - oy), 9, 3, 0, 0, TAU); ctx.fill();
    if (e.state === "curl" || e.state === "roll") {
      // a ball of flame with the gecko's banding turning inside it
      const FI = R().fire, r = e.state === "curl" ? 5 + Math.min(1, e.st / 0.4) * 2 : 7;
      for (let yy = -9; yy <= 9; yy++) for (let xx = -9; xx <= 9; xx++) {
        const rr = Math.hypot(xx, yy); if (rr > r + 1.5) continue;
        const ang = Math.atan2(yy, xx) + e.spin, stripe = Math.sin(ang * 3 + rr * 0.6) > 0.3;
        const c = rr > r ? (K.noise(xx * 0.7 + t * 9, yy * 0.7) > 0.5 ? FI[2] : null) : rr > r - 1.5 ? FI[2] : stripe ? FI[4] : FI[3];
        if (c) { ctx.fillStyle = fl ? "#ffffff" : css2(c); ctx.fillRect(Math.round(x + xx), Math.round(y - 7 + yy), 1, 1); }
      }
      glow(g, x, y - 7, 24, "255,140,50", 0.6);
      if (e.state === "curl") telegraph(ctx, x, y - 22, t);
      return;
    }
    L0.drawGecko(e, ctx, x, y, t, fl);
    if (Math.sin(t * 13 + e.ph) > 0) { ctx.fillStyle = css(R().fire[3]); ctx.fillRect(Math.round(x - e.face * 4), Math.round(y - 13), 1, 2); }
    glow(g, x, y - 8, 16, "255,120,40", 0.35);
  };

  // ================================================================== Tiki Fire-Dancer
  let fireTiki = null;
  function fireTikiArt() {
    if (fireTiki) return fireTiki;
    const T0 = L0.tiki().spear, [c, x] = K.canvas(T0.body.width, T0.body.height);
    x.drawImage(T0.body, 0, 0); x.globalCompositeOperation = "source-atop"; x.fillStyle = "rgba(120,30,10,0.32)"; x.fillRect(0, 0, c.width, c.height);
    const [blank] = K.canvas(1, 1);
    fireTiki = Object.assign({}, T0, { body: c, weapon: { frames: [blank], R: 0, n: 1 } });
    L0.tiki().firedancer = fireTiki;
    return fireTiki;
  }
  E.SETUP.firedancer = (e) => { fireTikiArt(); e.cape = Array.from({ length: 7 }, (_, k) => ({ a: 0, v: 0, ph: k * 1.7 })); e.walkPh = Math.random() * 6; e.aimA = 0; e.puff = 0; e.staffA = Math.random() * TAU; e.hitSet = {}; };
  AI.firedancer = function (e, dt, t, P, L, api, d) {
    const toP = Math.atan2(P.y - e.y, P.x - e.x);
    e.face = Math.cos(toP) >= 0 ? 1 : -1;
    const move = (sp, a) => { e.moving = tryMove(e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt); };
    e.moving = false;
    if (!e.alerted) { e.staffA += dt * 3; return; }
    if (e.state === "idle" || e.state === "approach") {
      e.state = "approach"; e.staffA += dt * 5;
      if (d > 44) move(58, toP); else move(30, toP + Math.PI / 2);
      if (e.st > (e.next || (e.next = rnd(0.9, 1.6)))) {
        const r = Math.random(); e.st = 0; e.next = rnd(1.1, 2);
        if (d < 100 && r < 0.45) e.state = "windTwirl"; else if (d < 64 && r < 0.8) e.state = "windSwing"; else if (d < 170) e.state = "windRing";
        if (e.state !== "approach") { e.aim = toP; sfx(api, "fire"); }
      }
      if (d > 320) e.alerted = false;
    } else if (e.state === "windTwirl") { e.staffA += dt * (6 + e.st * 20); if (e.st > 0.55) { e.state = "twirl"; e.st = 0; e.hitSet = {}; e.tick = 0; } }
    else if (e.state === "twirl") {
      // spinning the staff in a blazing wheel, stepping into you
      e.staffA += dt * 18; move(72, toP);
      e.tick -= dt; if (e.tick <= 0) { e.tick = 0.35; e.hitSet = {}; addFlames(L, e.x, e.y, 1.4, 8); sfx(api, "swingClub"); }
      hitAny(e, e.x, e.y - 14, 30, 1, e.hitSet, "firestaff");
      if (Math.random() < 0.7) ember(e.x + Math.cos(e.staffA) * 16, e.y - 16 + Math.sin(e.staffA) * 10, 1);
      if (e.st > 1.4) { e.state = "recover"; e.st = 0; }
    } else if (e.state === "windSwing") { e.aim += angDiff(toP, e.aim) * Math.min(1, dt * 5); e.staffA = e.aim - 1.6 * e.face; if (e.st > 0.45) { e.state = "swing"; e.st = 0; e.hitSet = {}; sfx(api, "spearSweep"); } }
    else if (e.state === "swing") {
      e.staffA = e.aim - 1.6 * e.face + (e.st / 0.25) * 3.2 * e.face;
      for (const q of E.alive || []) { const key = q.isRemote ? "r" + q.slot : "l"; if (e.hitSet[key]) continue; if (Math.abs(angDiff(Math.atan2(q.y - e.y, q.x - e.x), e.aim)) < 1.5 && Math.hypot(q.x - e.x, q.y - e.y) < 44 && q._api.hurt(2, e.x, e.y, "firestaff")) e.hitSet[key] = 1; }
      if (e.st > 0.25) { e.state = "recover"; e.st = 0; }
    } else if (e.state === "windRing") { e.staffA += dt * (4 + e.st * 26); if (e.st > 0.75) { L.fx.push({ kind: "pulse", x: e.x, y: e.y - 4, t: 0, dur: 0.7, R: 92 }); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; addFlames(L, e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 18, 2, 9); } sfx(api, "wispPulse"); e.state = "recover"; e.st = 0; } }
    else if (e.state === "recover") { e.staffA += dt * 4; if (e.st > 0.65) { e.state = "approach"; e.st = 0; } }
  };
  E.DRAW.firedancer = function (e, ctx, ox, oy, t, g, introY, fl) {
    const x = e.x - ox, y = e.y - oy + introY;
    ctx.fillStyle = "rgba(10,12,16,0.32)"; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(e.y - oy), 11, 3, 0, 0, TAU); ctx.fill();
    L0.drawTiki(e, ctx, x, y, t, fl, g);
    // the fire staff: koa wood, burning at both ends, held at the hands
    const hx = x + e.face * 5, hy = y - 17, a = e.staffA, L2 = 15, KO = R().koa, FI = P8("fire");
    for (let s2 = -L2; s2 <= L2; s2 += 0.5) { ctx.fillStyle = css(Math.abs(s2) > L2 - 3 ? KO[0] : (s2 > 0 ? KO[3] : KO[2])); ctx.fillRect(Math.round(hx + Math.cos(a) * s2), Math.round(hy + Math.sin(a) * s2 * 0.75), 1, 1); }
    for (const sg of [-1, 1]) {
      const fx = hx + Math.cos(a) * L2 * sg, fy = hy + Math.sin(a) * L2 * sg * 0.75, big = e.state === "twirl" || e.state === "windRing" ? 1.4 : 1;
      for (let yy = -6; yy <= 3; yy++) for (let xx = -4; xx <= 4; xx++) {
        const v = K.noise(xx * 0.6 + t * 6 + sg * 3, yy * 0.5 + t * 9) + (yy + 3) * 0.06 - Math.abs(xx) * 0.12 / big;
        if (v > 0.55) { ctx.fillStyle = PAL.css(R().fire[v > 0.82 ? 4 : v > 0.68 ? 3 : 2]); ctx.fillRect(Math.round(fx + xx), Math.round(fy + yy * big), 1, 1); }
      }
      glow(g, fx, fy - 2, 18 * big, "255,150,60", 0.55);
    }
    // a wheel of fire while it spins
    if (e.state === "twirl") for (let k = 0; k < 24; k++) { const aa = a - k * 0.12, r = L2 + 1; if (k % 2) continue; ctx.fillStyle = css(R().fire[k < 8 ? 3 : 2]); ctx.fillRect(Math.round(hx + Math.cos(aa) * r), Math.round(hy + Math.sin(aa) * r * 0.75), 1, 1); ctx.fillRect(Math.round(hx - Math.cos(aa) * r), Math.round(hy - Math.sin(aa) * r * 0.75), 1, 1); }
    if (winding(e) || e.state === "windTwirl" || e.state === "windRing") telegraph(ctx, x, y - 48, t);
  };
  E.NET.firedancer = { ser: (q, o) => { o.sa = Math.round(q.staffA * 100) / 100; }, app: (e, o) => { e.nsa = o.sa; }, tick: (e, dt) => { if (e.nsa !== undefined) e.staffA += angDiff(e.nsa, e.staffA) * Math.min(1, dt * 14); } };

  // ================================================================== Lau-Poʻo, the Many-Headed
  function addHead(e, k, n) {
    const phi = -Math.PI / 2 + ((k - (n - 1) / 2) * 0.62), h = { ax: Math.cos(phi) * 15, ay: Math.sin(phi) * 6 - 18, phi, x: e.x + Math.cos(phi) * 30, y: e.y - 44, state: "sway", st: rnd(0, 1), next: rnd(1, 2.4), aim: 0, reach: 0, ph: Math.random() * 6, hitSet: {}, grow: 0 };
    e.heads.push(h); return h;
  }
  function layoutHeads(e) { const n = e.heads.length; e.heads.forEach((h, k) => { h.phi = -Math.PI / 2 + (k - (n - 1) / 2) * (n > 3 ? 0.5 : 0.62); h.ax = Math.cos(h.phi) * 16; h.ay = Math.sin(h.phi) * 6 - 18; }); }
  E.SETUP.hydra = (e) => { e.heads = []; for (let k = 0; k < 3; k++) addHead(e, k, 3); e.S = Surface(300, 240); e.grown = 3; };
  AI.hydra = function (e, dt, t, P, L, api, d) {
    if (!e.announced && e.alerted) { e.announced = true; L.banner = { title: e.name, t0: t }; sfx(api, "vineBurst"); }
    // wounds grow heads: a fourth at two-thirds health, a fifth at one-third
    const want = e.hp < e.max / 3 ? 5 : e.hp < (e.max * 2) / 3 ? 4 : 3;
    if (e.heads.length < want) { const h = addHead(e, e.heads.length, want); h.grow = 0; h.x = e.x; h.y = e.y - 20; layoutHeads(e); L.banner = { title: "IT GROWS ANOTHER HEAD", t0: t }; sfx(api, "vineBurst"); Combat.shake = Math.min(1, Combat.shake + 0.4); }
    // the mound shuffles slowly after whoever is nearest
    if (d > 70) { e.moving = tryMove(e, Math.cos(Math.atan2(P.y - e.y, P.x - e.x)) * 16 * dt, Math.sin(Math.atan2(P.y - e.y, P.x - e.x)) * 12 * dt); } else e.moving = false;
    const striking = e.heads.filter((h) => h.state !== "sway").length, dmg = e.hp < e.max / 3 ? 2 : 1;
    for (const h of e.heads) {
      h.st += dt; h.grow = Math.min(1, h.grow + dt * 1.5);
      const ax = e.x + h.ax, ay = e.y + h.ay, Q = nearest(h.x, h.y) || P, toQ = Math.atan2(Q.y - 10 - h.y, Q.x - h.x), dQ = Math.hypot(Q.x - ax, Q.y - ay);
      let tx = ax + Math.cos(h.phi) * 22 * h.grow + Math.sin(t * 1.6 + h.ph) * 5, ty = ay - 22 * h.grow + Math.sin(t * 2.1 + h.ph) * 4, k = 6;
      if (h.state === "sway") {
        tx += Math.cos(toQ) * 6; ty += Math.sin(toQ) * 4;
        if (e.alerted && h.st > h.next && striking < 2 + (e.heads.length > 3 ? 1 : 0)) {
          h.st = 0; h.aim = toQ; h.hitSet = {};
          if (dQ < 120 && Math.random() < 0.7) { h.state = "wind"; h.reach = Math.min(92, dQ + 18); } else { h.state = "windSpit"; }
          sfx(api, "vineHiss");
        }
      } else if (h.state === "wind" || h.state === "windSpit") {
        h.aim += angDiff(toQ, h.aim) * Math.min(1, dt * 3); tx = ax - Math.cos(h.aim) * 10; ty = ay - 30; k = 10;
        if (h.st > (h.state === "wind" ? 0.6 : 0.5)) {
          if (h.state === "wind") { h.state = "lash"; sfx(api, "vineLash"); }
          else { h.state = "spit"; for (const o of [-0.35, 0, 0.35]) L.shots.push({ kind: "seed", x: h.x, y: h.y, vx: Math.cos(h.aim + o) * 170, vy: Math.sin(h.aim + o) * 170, t: 0, life: 1.5 }); sfx(api, "vineSpit"); }
          h.st = 0;
        }
      } else if (h.state === "lash" || h.state === "hold") {
        tx = ax + Math.cos(h.aim) * h.reach; ty = ay - 4 + Math.sin(h.aim) * h.reach * 0.85; k = 28;
        hitAny(e, h.x, h.y, 13, dmg, h.hitSet, "hydra");
        if (h.state === "lash" && h.st > 0.15) { h.state = "hold"; h.st = 0; }
        if (h.state === "hold" && h.st > 0.32) { h.state = "recover"; h.st = 0; }
      } else if (h.state === "spit" && h.st > 0.3) { h.state = "recover"; h.st = 0; }
      if (h.state === "recover" && h.st > 0.55) { h.state = "sway"; h.st = 0; h.next = rnd(1.2, 2.6) * (e.hp < e.max / 3 ? 0.7 : 1); }
      const f = Math.min(1, dt * k); h.x += (tx - h.x) * f; h.y += (ty - h.y) * f;
    }
  };
  // a vine head, as on the vine-lasher: a fan of sun petals, thorned jaws and a gold eye
  function drawHead(put, hx, hy, ha, open, flare, t, warn, FERN, SUN, HIB, CREAM) {
    const ca = Math.cos(ha), sa = Math.sin(ha);
    for (let y = (hy - 18) | 0; y < hy + 18; y++) for (let x = (hx - 18) | 0; x < hx + 18; x++) {
      const dx = x + 0.5 - hx, dy = y + 0.5 - hy, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      const pa = Math.atan2(v, -u + 2), pr = Math.hypot(v, -u + 2);
      if (u < 1.5 && pr < 9.5 + flare * 3.5 && pr > 3 && Math.abs(pa) < 1.6) { const pet = Math.abs(((pa / 0.38) % 1 + 1) % 1 - 0.5); if (pet < 0.32) { put(x, y, pr > 8 + flare * 3 ? SUN[2] : pr > 6 ? SUN[4] : SUN[5]); continue; } }
      const gap = open * 4, upper = ((u - 4) / 9) ** 2 + ((v + 2 + gap * 0.5) / 4) ** 2, lower = ((u - 3.4) / 8) ** 2 + ((v - 2 - gap * 0.5) / 3.3) ** 2;
      if (upper < 1 || lower < 1) {
        const isU = upper < 1, edge = isU ? v > -2 - gap * 0.5 + 1.6 : v < 2 + gap * 0.5 - 1.6;
        if (edge && u > 0 && open > 0.3 && Math.floor(u) % 2 === 0) put(x, y, CREAM);
        else put(x, y, isU ? (v < -3.8 - gap * 0.5 ? FERN[6] : v < -2.6 - gap * 0.5 ? FERN[5] : FERN[4]) : (v > 3.6 + gap * 0.5 ? FERN[2] : FERN[3]));
        if (isU && Math.abs(u - 3.5) < 1.2 && Math.abs(v + 2.8 + gap * 0.5) < 1) put(x, y, warn && Math.sin(t * 30) > 0 ? WHITE : SUN[5]);
        continue;
      }
      if (open > 0.3 && u > 0 && u < 11 && Math.abs(v) < gap * 0.5 + 0.8) put(x, y, HIB[u < 4 ? 0 : 1]);
    }
  }
  E.DRAW.hydra = function (e, ctx, ox, oy, t, g, introY, fl) {
    const S = e.S, W = S.w, H = S.h, cx = W / 2, cy = 170, FERN = P8("fern"), PALM = P8("palm"), SUN = P8("sun"), HIB = P8("hibiscus"), CREAM = PAL.pk(R().kapa[3]);
    begin(S);
    const put = (x, y, c) => { x |= 0; y |= 0; if (x >= 0 && y >= 0 && x < W && y < H) { S.d[y * W + x] = fl ? WHITE : c; mark(S, x, y); } };
    const lx = (wx) => wx - e.x + cx, ly = (wy) => wy - e.y + cy + introY;
    ctx.fillStyle = "rgba(10,12,16,0.35)"; ctx.beginPath(); ctx.ellipse(Math.round(e.x - ox), Math.round(e.y - oy), 34, 8, 0, 0, TAU); ctx.fill();
    // necks behind the mound first: thick stems arching up from the leaves to each head
    const order = e.heads.slice().sort((a, b) => a.y - b.y);
    for (const h of order) {
      const ax = lx(e.x + h.ax), ay = ly(e.y + h.ay), hx = lx(h.x), hy = ly(h.y), mx = (ax + hx) / 2 + Math.cos(h.phi) * 6, my = Math.min(ay, hy) - 18;
      for (let u = 0; u <= 1; u += 0.025) {
        const px = (1 - u) * (1 - u) * ax + 2 * (1 - u) * u * mx + u * u * hx, py = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my + u * u * hy, r = 5.2 - u * 1.8, R2 = Math.ceil(r);
        for (let oy2 = -R2; oy2 <= R2; oy2++) for (let ox2 = -R2; ox2 <= R2; ox2++) { if (ox2 * ox2 + oy2 * oy2 > r * r) continue; const lit = (-ox2 * 0.7 - oy2 * 0.7) / r; put(px + ox2, py + oy2, FERN[Math.max(1, Math.min(6, Math.round(3.2 + lit * 2.2) - ((u * 40) % 5 < 1 ? 1 : 0)))]); }
      }
      const q = { x: (1 - 0.94) * (1 - 0.94) * ax + 2 * 0.06 * 0.94 * mx + 0.94 * 0.94 * hx, y: (1 - 0.94) * (1 - 0.94) * ay + 2 * 0.06 * 0.94 * my + 0.94 * 0.94 * hy };
      const ha = Math.atan2(hy - q.y, hx - q.x), warn = h.state === "wind" || h.state === "windSpit";
      drawHead(put, hx, hy, h.state === "lash" || h.state === "hold" ? h.aim : ha, h.state === "lash" || h.state === "hold" ? 1 : h.state === "spit" ? 0.8 : warn ? 0.45 : 0.12, warn ? 1 : 0.4, t, warn, FERN, SUN, HIB, CREAM);
    }
    // the mound: a heap of broad leaves radiating from the crown, lit from the top-left, with sun flowers
    const mcx = cx, mcy = cy - 12 + introY;
    for (let y = mcy - 22; y < mcy + 16; y++) for (let x = mcx - 34; x < mcx + 34; x++) {
      const dx = (x + 0.5 - mcx) / 32, dy = (y + 0.5 - mcy) / 18, rr = dx * dx + dy * dy, edge = 1 + (K.noise(Math.atan2(dy, dx) * 3 + 9, 1) - 0.5) * 0.5;
      if (rr > edge) continue;
      const ang = Math.atan2(dy, dx), leaf = Math.abs(((ang * 7 / Math.PI) % 1 + 1) % 1 - 0.5) * 2, rib = leaf < 0.12, lit = -dx * 0.5 - dy * 0.9 + (1 - leaf) * 0.25;
      let c = rib ? PALM[2] : lit > 0.5 ? PALM[5] : lit > 0.1 ? PALM[4] : lit > -0.35 ? PALM[3] : PALM[2];
      if (rr > edge - 0.12) c = PALM[1];
      if (K.hash2((x / 5) | 0, (y / 4) | 0, 9) > 0.93 && rr < 0.6) c = K.hash2(x, y, 3) > 0.5 ? HIB[3] : SUN[5];
      put(x, y, c);
    }
    if (flush(S, true)) ctx.drawImage(S.c, Math.round(e.x - cx - ox), Math.round(e.y - cy - oy));
    for (const h of e.heads) if (h.state === "wind" || h.state === "windSpit") telegraph(ctx, h.x - ox, h.y - oy - 16, t);
    glow(g, e.x - ox, e.y - oy - 20, 50, "200,255,150", 0.12);
  };
  const stateCode = ["sway", "wind", "lash", "hold", "windSpit", "spit", "recover"];
  E.NET.hydra = {
    ser: (q, o, r1) => { o.hd = q.heads.map((h) => [r1(h.x), r1(h.y), stateCode.indexOf(h.state), Math.round(h.aim * 100) / 100]); },
    app: (e, o) => { while (e.heads.length < o.hd.length) addHead(e, e.heads.length, o.hd.length); if (e.heads.length !== e.lastN) { layoutHeads(e); e.lastN = e.heads.length; } o.hd.forEach((v, i) => { const h = e.heads[i]; h.nx = v[0]; h.ny = v[1]; h.state = stateCode[v[2]] || "sway"; h.aim = v[3]; h.grow = 1; }); },
    tick: (e, dt) => { const k = Math.min(1, dt * 14); for (const h of e.heads) if (h.nx !== undefined) { h.x += (h.nx - h.x) * k; h.y += (h.ny - h.y) * k; } },
  };

  // ================================================================== Kahu-Ahi, the Bonfire Hive
  let nestArt = null;
  function buildNest() {
    // a mound of charred koa logs and woven sticks, its face a honeycomb of glowing cells
    const W = 96, H = 70, KO = R().koa, OB = R().obsidian, FI = R().fire, cells = [];
    const c = Ruins.raster(W, H, (x, y) => {
      const dx = (x + 0.5 - W / 2) / 44, dy = (y + 0.5 - H + 6) / 50, rr = dx * dx + dy * dy;
      // logs at the base
      for (const [a, bx, by, len] of [[0.25, 18, 60, 60], [-0.3, 78, 60, 60], [0.05, 48, 64, 80]]) { const u = (x - bx) * Math.cos(a) + (y - by) * Math.sin(a), v = -(x - bx) * Math.sin(a) + (y - by) * Math.cos(a); if (Math.abs(v) < 4 && Math.abs(u) < len / 2) return PAL.pk(Math.abs(v) < 1.2 ? KO[2] : v < 0 ? KO[1] : OB[1]); }
      if (rr > 1 || dy > 0.06) return 0;
      // the woven dome with hexagonal comb cells
      const hx = x / 7, hy = y / 6, row = Math.floor(hy), off = row & 1 ? 0.5 : 0, col = Math.floor(hx + off), fx = hx + off - col - 0.5, fy = hy - row - 0.5;
      const inCell = Math.abs(fx) < 0.32 && Math.abs(fy) < 0.3 && rr < 0.8;
      if (inCell) return PAL.pk(FI[1]);
      const weave = Math.sin(x * 0.9 + y * 0.4) > 0.3;
      return PAL.pk(rr > 0.86 ? OB[1] : weave ? KO[1] : KO[0]);
    });
    for (let y = 3; y < H; y += 6) for (let x = 3; x < W; x += 7) { const row = Math.floor(y / 6), off = row & 1 ? -3.5 : 0, cx = x + off + 3.5, cy = y; const dx = (cx - W / 2) / 44, dy = (cy - H + 6) / 50; if (dx * dx + dy * dy < 0.72 && dy < 0) cells.push([Math.round(cx) - 1, cy - 1]); }
    nestArt = { c, W, H, cells };
    return nestArt;
  }
  E.SETUP.hive = (e) => { e.home = { x: e.x, y: e.y }; e.form = "nest"; e.spawnT = 2.5; e.volT = 4.5; e.heatT = 3; e.owned = []; e.hideBar = true; e.va = -Math.PI / 2; };
  AI.hive = function (e, dt, t, P, L, api, d, live) {
    const np = (E.players || []).length || 1;
    if (!e.announced && e.alerted) { e.announced = true; L.banner = { title: e.name, t0: t }; sfx(api, "warcry"); }
    e.owned = e.owned.filter((w) => !w.dead);
    const spawnWisp = () => { const w = E.spawn("wisp", e.home.x + rnd(-20, 20), e.home.y - 30, 0, L); if (!w) return; w.alerted = true; w.owner = e; w.introT = 0; L.enemies.push(w); e.owned.push(w); ember(w.x, w.y, 10); sfx(api, "wispSwoop"); };
    if (e.form === "nest") {
      e.armor = 1;
      // wisps pour out of the comb
      e.spawnT -= dt; if (e.spawnT <= 0 && e.alerted) { e.spawnT = Math.max(2.8, 6 - np * 0.8); if (e.owned.length < 2 + np) spawnWisp(); }
      // volleys of flare motes from the crown of the hive
      e.volT -= dt; if (e.volT <= 0 && e.alerted) { e.volT = 4.5; const n = 7 + np * 2, base = Math.random() * TAU; for (let k = 0; k < n; k++) L.shots.push({ kind: "mote", x: e.home.x, y: e.home.y - 50, a: base + (k / n) * TAU, turn: 1.2, sp: 75, vx: 0, vy: 0, t: 0, life: 3, home: 1 }); sfx(api, "wispShed"); }
      // too close: the bonfire flares
      if (e.state === "flare") { if (e.st > 0.65) { L.fx.push({ kind: "pulse", x: e.home.x, y: e.home.y - 6, t: 0, dur: 0.7, R: 96 }); sfx(api, "wispPulse"); e.state = "idle"; e.st = 0; } }
      else { e.heatT -= dt; if (e.heatT <= 0 && playersNear(e.home.x, e.home.y, 70).length) { e.heatT = 3; e.state = "flare"; e.st = 0; } }
      if (e.hp <= e.max / 2) { e.form = "merge"; e.st = 0; e.state = "merge"; L.banner = { title: "THE HIVE CALLS ITS FIRE HOME", t0: t }; sfx(api, "wispBeam"); for (const w of e.owned) w.merging = true; }
    } else if (e.form === "merge") {
      e.armor = 0.05;
      // every wisp flies back into the comb and the fire gathers
      for (const w of e.owned) { const dx = e.home.x - w.x, dy = e.home.y - 30 - w.y, l = Math.hypot(dx, dy); w.x += (dx / (l || 1)) * Math.min(l, 220 * dt); w.y += (dy / (l || 1)) * Math.min(l, 220 * dt); w.trail.unshift([w.x, w.y]); if (w.trail.length > 28) w.trail.length = 28; if (l < 8) { w.dead = true; w.gone = true; ember(w.x, w.y, 12); } }
      if (Math.random() < 0.5) ember(e.home.x + rnd(-30, 30), e.home.y - rnd(10, 50), 1);
      Combat.shake = Math.min(1, Combat.shake + dt * 0.4);
      if (e.st > 2.4 && e.owned.every((w) => w.dead)) {
        // it rises: one great fire spirit, a hive mind of every wisp it held
        e.form = "titan"; e.state = "orbit"; e.st = 0; e.sc = 2.3; e.fly = true; e.S = Surface(260, 260); e.x = e.home.x; e.y = e.home.y - 60; e.big = 16; e.r = 14; e.hx = e.x; e.hy = e.y; e.alerted = true; e.next = 2; e.novaT = 5; e.spawnT = 6; e.touch = {}; e.touchT = 0;
        L.banner = { title: "THE HIVE AWAKENS AS ONE", t0: t }; sfx(api, "warcry"); sfx(api, "wispPulse"); Combat.shake = 1;
        L.fx.push({ kind: "pulse", x: e.x, y: e.y + 40, t: 0, dur: 0.9, R: 140 });
      }
    } else {
      e.armor = 1;
      if (e.state === "nova") {
        if (e.st > 1) { const n = 14, base = Math.random() * TAU; for (let k = 0; k < n; k++) L.shots.push({ kind: "mote", x: e.x, y: e.y, a: base + (k / n) * TAU, turn: 0.9, sp: 90, vx: 0, vy: 0, t: 0, life: 3, home: 1 }); L.fx.push({ kind: "pulse", x: e.x, y: e.y + 20, t: 0, dur: 0.8, R: 130 }); sfx(api, "wispPulse"); sfx(api, "wispShed"); e.state = "orbit"; e.st = 0; }
      } else {
        AI.wisp(e, dt, t, P, L, api, d, live);
        e.novaT -= dt; if (e.novaT <= 0 && e.state === "orbit") { e.novaT = 7; e.state = "nova"; e.st = 0; }
      }
      // the nest keeps a few wisps burning
      e.spawnT -= dt; if (e.spawnT <= 0) { e.spawnT = 8; if (e.owned.length < np) spawnWisp(); }
      // its body burns whoever it passes through
      e.touchT -= dt; if (e.touchT <= 0) { e.touch = {}; e.touchT = 0.8; }
      hitAny(e, e.x, e.y + 6, 20, 1, e.touch, "hive");
      if (Math.random() < 0.4) ember(e.x + rnd(-10, 10), e.y + rnd(-10, 10), 1);
    }
  };
  E.ON_DEATH.hive = (e) => { for (const w of e.owned || []) if (!w.dead) { w.dead = true; E.death(w); } for (let k = 0; k < 60; k++) ember(e.home.x + rnd(-40, 40), e.home.y - rnd(0, 60), 1); Combat.shake = 1; };
  function drawNest(e, ctx, ox, oy, t, g, fl) {
    const N = nestArt || buildNest(), X = Math.round(e.home.x - N.W / 2 - ox), Y = Math.round(e.home.y - N.H - oy + 6), dead = e.form !== "nest";
    ctx.fillStyle = "rgba(10,12,16,0.35)"; ctx.beginPath(); ctx.ellipse(Math.round(e.home.x - ox), Math.round(e.home.y - oy), 48, 9, 0, 0, TAU); ctx.fill();
    ctx.drawImage(fl && e.form === "nest" ? tinted(N.c) : N.c, X, Y);
    // the comb cells glow and flicker, brighter as the fire gathers
    const FI = R().fire, hot = e.form === "merge" ? 1 : e.form === "nest" ? 0.6 : 0.25;
    for (const [cx, cy] of N.cells) { const f = K.noise(cx * 0.3 + t * 3, cy * 0.3); if (f < 1 - hot) continue; ctx.fillStyle = css2(FI[f > 0.8 ? 4 : f > 0.6 ? 3 : 2]); ctx.fillRect(X + cx, Y + cy, 2, 2); }
    // flames licking up from the crown
    const fh = e.form === "merge" ? 34 : e.form === "nest" ? 24 : 12;
    for (let yy = -fh; yy < 4; yy++) for (let xx = -16; xx <= 16; xx++) {
      const v = K.noise(xx * 0.25 + 5, (yy + t * 26) * 0.18) + (yy / fh) * 0.6 - Math.abs(xx) / 22;
      if (v > 0.45) { ctx.fillStyle = css2(FI[v > 0.85 ? 4 : v > 0.65 ? 3 : 2]); ctx.fillRect(Math.round(e.home.x + xx - ox), Math.round(Y + 8 + yy), 1, 1); }
    }
    glow(g, e.home.x - ox, Y + 6, 70 + hot * 50, "255,150,60", 0.4 + hot * 0.4);
    if (e.state === "flare") telegraph(ctx, e.home.x - ox, Y - fh - 10, t);
  }
  E.DRAW.hive = function (e, ctx, ox, oy, t, g, introY, fl) {
    drawNest(e, ctx, ox, oy, t, g, fl);
    if (e.form === "titan") { L0.drawWisp(e, ctx, ox, oy, t, fl, g, 0); if (e.state === "nova") telegraph(ctx, e.x - ox, e.y - oy - 50, t); }
  };
  E.NET.hive = {
    ser: (q, o, r1) => { o.fm = q.form; o.hx = r1(q.home.x); o.hy = r1(q.home.y); if (q.form === "titan") o.va = Math.round((q.va || 0) * 100) / 100; },
    app: (e, o) => { e.home = { x: o.hx, y: o.hy }; if (o.fm === "titan" && e.form !== "titan") { e.sc = 2.3; e.S = Surface(260, 260); e.big = 16; } e.form = o.fm; },
  };
})();
