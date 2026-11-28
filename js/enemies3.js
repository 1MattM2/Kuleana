// Creatures of the Archipelago (Zone 2). The tiki spearman and darter carry on from Zone 1; new here:
//
//   crab       - ʻŌhiki, the sand crab: skitters sideways round you, snips twice, and burrows to
//                travel under the sand and burst up beneath your feet
//   hermit     - Hermit crab: plods along in its spiral shell, pulls in to shrug off blows, then
//                tucks up and bowls the shell at you, left dizzy where it stops
//   spitcrab   - Kona bubble crab: keeps its distance, froths, and spits volleys of foam bubbles;
//                too close and it slams the ground with its great claw
//   brute      - Tiki brute: a towering carved warrior with a stone club. Overhead slams that crack
//                the ground, wide sweeps, and a bull rush
//   shark      - Reef shark: a shadow in the water, then a fin, then it rises and bursts out to bite.
//                Only while it is out of the water can it be struck
//   tshark     - Thermal shark (by the vents): hotter, harder bites, and dashes that leave water boiling
//   ray        - Stingray: a silhouette gliding over the reef that gathers a charge and lets it go in
//                a ring of lightning through the water
//   giantray   - Kai-Uila, the Storm Ray (mini-boss): a great ray made of many small rays swimming as
//                one. Storm rings, called lightning, sweeping glides; it breaks apart to swarm you,
//                then gathers itself again
//   pueo       - Pueo: a great owl that lives on the cliffs. Drops stones from above and swoops; only
//                low, after a swoop, can it be reached
//   pueoboss   - Pueo-Ahi, Lord of the Thermals (boss): rides the vents' heat; burning feather
//                volleys, updrafts that set the vents off in waves, talon dives that crack the ground,
//                a gale of wings, and in its fury a storm of molten stones
(function () {
  const E = window.Enemies, L0 = E.lib, AI = E.AI, ST = E.STATS;
  const { Surface, begin, mark, flush, tryMove, telegraph, tinted, glow, rnd, dist, angDiff, TAU, css, R, P8, WHITE, winding } = L0;
  const sfx = (api, k) => api && api.sfx && api.sfx(k);
  const keyOf = (q) => (q.isRemote ? "r" + q.slot : "l");
  function hitAny(e, x, y, reach, dmg, set, src) {
    let any = false;
    for (const q of E.alive || []) { const k = keyOf(q); if (set && set[k]) continue; if (Math.hypot(q.x - x, q.y - 9 - y) < reach && q._api.hurt(dmg, e.x, e.y, src || e.type)) { if (set) set[k] = 1; any = true; } }
    return any;
  }
  const nearest = (x, y) => (E.alive || []).reduce((b, q) => (!b || Math.hypot(q.x - x, q.y - y) < Math.hypot(b.x - x, b.y - y) ? q : b), null);
  const px = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const rgb = (c) => PAL.css(c);
  const zone = () => (Level.cur && Level.cur.def.level) || 1;
  const wetAt = (x, y) => Level.waterAt && Level.waterAt(x, y);
  // swimmers move only through the water kinds they allow
  function swim(e, dx, dy, kinds) {
    const ok = (x, y) => kinds.includes(wetAt(x, y)) && kinds.includes(wetAt(x + Math.cos(e.va || 0) * 8, y + Math.sin(e.va || 0) * 8));
    let moved = false;
    if (ok(e.x + dx, e.y)) { e.x += dx; moved = true; }
    if (ok(e.x, e.y + dy)) { e.y += dy; moved = true; }
    return moved;
  }
  // a fresh direction through open water, toward a goal if there is one
  function steer(e, goal, kinds, dt, sp, turn) {
    let want = goal ? Math.atan2(goal.y - e.y, goal.x - e.x) : e.va;
    for (let k = 0; k < 7; k++) { const a = want + (k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5), fx = e.x + Math.cos(a) * 22, fy = e.y + Math.sin(a) * 22; if (kinds.includes(wetAt(fx, fy))) { want = a; break; } }
    e.va += angDiff(want, e.va) * Math.min(1, dt * (turn || 3));
    const moved = swim(e, Math.cos(e.va) * sp * dt, Math.sin(e.va) * sp * dt, kinds);
    if (!moved) e.va += Math.PI * (0.5 + Math.random() * 0.5);
    return moved;
  }

  // ================================================================== effects (host makes them; everyone draws them)
  E.FX.zap = {   // an electric ring spreading through the water
    hit(r, q, t, key) { r.hits = r.hits || {}; const rad = (r.t / r.dur) * r.R; if (!r.hits[key] && Math.abs(Math.hypot(q.x - r.x, (q.y - 4 - r.y) / 0.7) - rad) < 8) { if (q._api.hurt(r.dmg || 1, r.x, r.y, "zap")) r.hits[key] = 1; } },
    draw(ctx, r, ox, oy, t) {
      const u = r.t / r.dur, rad = u * r.R, n = Math.max(24, rad * 1.4 | 0);
      for (let k = 0; k < n; k++) { const a = (k / n) * TAU, j = (K.hash2(k, (t * 20) | 0, 7) - 0.5) * 5; ctx.fillStyle = k % 3 ? `rgba(160,220,255,${(1 - u) * 0.9})` : `rgba(255,255,255,${1 - u})`; ctx.fillRect(Math.round(r.x - ox + Math.cos(a) * (rad + j)), Math.round(r.y - oy + Math.sin(a) * (rad + j) * 0.7), 2, 1); }
    },
  };
  E.FX.bolt = {   // a called bolt: a flickering mark along its line, then the strike
    hit(r, q, t, key) {
      if (r.t < r.dur - 0.18) return; r.hits = r.hits || {}; if (r.hits[key]) return;
      const dx = r.x2 - r.x, dy = r.y2 - r.y, l2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((q.x - r.x) * dx + (q.y - 8 - r.y) * dy) / l2));
      if (Math.hypot(r.x + dx * u - q.x, r.y + dy * u - (q.y - 8)) < 10 && q._api.hurt(r.dmg || 1, r.x2, r.y2, "bolt")) r.hits[key] = 1;
    },
    draw(ctx, r, ox, oy, t) {
      const live = r.t >= r.dur - 0.18, n = Math.ceil(Math.hypot(r.x2 - r.x, r.y2 - r.y) / 3);
      for (let k = 0; k <= n; k++) {
        const u = k / n, j = live ? (K.hash2(k, (t * 30) | 0, 3) - 0.5) * 8 : 0, x = r.x + (r.x2 - r.x) * u - ox, y = r.y + (r.y2 - r.y) * u - oy;
        if (!live) { if ((k + ((t * 16) | 0)) % 3) continue; ctx.fillStyle = "rgba(170,220,255,0.7)"; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); continue; }
        ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(x + j), Math.round(y), 2, 2); ctx.fillStyle = "rgba(140,200,255,0.8)"; ctx.fillRect(Math.round(x + j + 2), Math.round(y + 1), 1, 1);
      }
    },
  };
  E.FX.rock = {   // a falling stone: its shadow grows, then it lands
    hit(r, q, t, key) { if (r.t < r.dur - 0.12 || r.t > r.dur - 0.02) return; r.hits = r.hits || {}; if (!r.hits[key] && Math.hypot(q.x - r.x, (q.y - r.y) / 0.7) < r.R && q._api.hurt(r.dmg || 1, r.x, r.y - 20, "rock")) r.hits[key] = 1; },
    draw(ctx, r, ox, oy, t) {
      const u = Math.min(1, r.t / (r.dur - 0.1)), x = Math.round(r.x - ox), y = Math.round(r.y - oy), hot = r.hot;
      ctx.fillStyle = `rgba(10,12,16,${0.15 + u * 0.35})`; ctx.beginPath(); ctx.ellipse(x, y, r.R * (0.4 + u * 0.6), r.R * 0.45 * (0.4 + u * 0.6), 0, 0, TAU); ctx.fill();
      if (r.t > r.dur - 0.5 && r.t < r.dur) { const fall = (r.dur - r.t) / 0.5, ry = y - fall * 90; const OB = R().obsidian; px(ctx, x - 3, ry - 6, 7, 6, rgb(hot ? R().fire[2] : OB[3])); px(ctx, x - 2, ry - 6, 3, 2, rgb(hot ? R().fire[4] : OB[5])); }
    },
  };
  E.FX.quake = {   // a ring of cracking ground
    hit(r, q, t, key) { r.hits = r.hits || {}; const rad = (r.t / r.dur) * r.R; if (!r.hits[key] && Math.abs(Math.hypot(q.x - r.x, (q.y - r.y) / 0.7) - rad) < 9 && q._api.hurt(r.dmg || 2, r.x, r.y, "quake")) r.hits[key] = 1; },
    draw(ctx, r, ox, oy) { const u = r.t / r.dur, rad = u * r.R; for (let k = 0; k < 40; k++) { const a = (k / 40) * TAU; ctx.fillStyle = k % 2 ? `rgba(90,70,60,${1 - u})` : `rgba(230,210,170,${1 - u})`; ctx.fillRect(Math.round(r.x - ox + Math.cos(a) * rad), Math.round(r.y - oy + Math.sin(a) * rad * 0.7), 2, 2); } },
  };
  E.FX.boil = {    // water boiling where a thermal shark has been
    hit(r, q, t, key) { r.hitT = r.hitT || {}; if (r.t > 0.2 && Math.hypot(q.x - r.x, (q.y - r.y) / 0.7) < r.R && t - (r.hitT[key] ?? -9) > 0.8 && q._api.hurt(1, r.x, r.y, "boil")) r.hitT[key] = t; },
    draw(ctx, r, ox, oy, t) { const life = Math.min(1, (r.dur - r.t) / 0.5, r.t / 0.2); for (let k = 0; k < 6; k++) { const ph = (t * 1.5 + k * 0.37) % 1, a = k * 2.2 + r.x; ctx.fillStyle = `rgba(255,${200 - ph * 80 | 0},150,${life * (1 - ph)})`; ctx.fillRect(Math.round(r.x + Math.cos(a) * r.R * 0.6 - ox), Math.round(r.y + Math.sin(a) * r.R * 0.4 - ph * 4 - oy), 2, 1); } },
  };
  E.FX.mark = {   // where something is about to come down
    draw(ctx, r, ox, oy, t) { const u = r.t / r.dur; ctx.strokeStyle = `rgba(255,${120 + 100 * Math.sin(t * 20) | 0},80,0.85)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(Math.round(r.x - ox) + 0.5, Math.round(r.y - oy) + 0.5, r.R * (1.2 - u * 0.2), r.R * 0.7 * (1.2 - u * 0.2), 0, 0, TAU); ctx.stroke(); },
  };
  E.SHOT_DRAW.bubble = (ctx, s, x, y, t) => { const r = 3 + Math.sin(t * 8 + s.x) * 0.5; ctx.strokeStyle = "rgba(220,250,255,0.9)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(Math.round(x) + 0.5, Math.round(y) + 0.5, r, 0, TAU); ctx.stroke(); ctx.fillStyle = "rgba(150,210,240,0.35)"; ctx.fill(); px(ctx, x - 1, y - 2, 1, 1, "#ffffff"); };
  E.SHOT_DRAW.feather = (ctx, s, x, y, t) => { const a = Math.atan2(s.vy, s.vx), ux = Math.cos(a), uy = Math.sin(a); const FI = R().fire; for (let k = -5; k <= 3; k++) { ctx.fillStyle = rgb(k > 1 ? FI[4] : k > -2 ? FI[3] : R().koa[3]); ctx.fillRect(Math.round(x + ux * k), Math.round(y + uy * k), 1, 1); if (k < 0 && k > -5) { ctx.fillStyle = rgb(FI[2]); ctx.fillRect(Math.round(x + ux * k - uy), Math.round(y + uy * k + ux), 1, 1); } } };

  // ================================================================== crabs
  ST.crab = { hp: 34, r: 7, mat: "flesh", kb: 90, barY: 18, colors: ["#e8c898", "#c88a58", "#f4e0c0"] };
  ST.hermit = { hp: 66, r: 8, mat: "wood", kb: 40, barY: 24, colors: ["#d8b080", "#a85a3a", "#f2dcc0"] };
  ST.spitcrab = { hp: 44, r: 8, mat: "flesh", kb: 70, barY: 22, colors: ["#d0503a", "#5a8ad8", "#f0e8e0"] };
  const CRAB_PAL = {
    crab: { shell: [[150, 110, 80], [204, 164, 120], [236, 206, 160], [250, 232, 196]], leg: [190, 140, 100], claw: [222, 180, 130] },
    hermit: { shell: [[120, 40, 30], [180, 70, 50], [222, 110, 80], [246, 160, 120]], leg: [196, 70, 50], claw: [222, 90, 64] },
    spitcrab: { shell: [[120, 30, 30], [190, 60, 48], [228, 96, 70], [250, 150, 120]], leg: [180, 60, 50], claw: [80, 130, 210] },
  };
  // a crab seen from above: legs that step in turn, eyes on stalks, and claws that open to pinch
  function drawCrab(ctx, e, x, y, t, fl, open) {
    const P = CRAB_PAL[e.type], big = e.type === "spitcrab" ? 1.15 : 1, W2 = 7 * big, H2 = 4.5 * big, by = y - 6;
    const c = (col) => (fl ? "#ffffff" : rgb(col));
    ctx.fillStyle = "rgba(10,12,16,0.3)"; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), W2 + 3, 3, 0, 0, TAU); ctx.fill();
    // legs: three a side, stepping in turn
    for (const sg of [-1, 1]) for (let k = 0; k < 3; k++) { const step = e.moving ? Math.sin(t * 26 + k * 2 + (sg > 0 ? 1.5 : 0)) : 0, lx = x + sg * (W2 - 1), ly = by - 1 + k * 2; px(ctx, lx, ly, sg * 3, 1, c(P.leg)); px(ctx, lx + sg * 3, ly + 1 + (step > 0 ? -1 : 0), sg * 2, 1, c(P.leg)); px(ctx, lx + sg * 4, ly + 2 + (step > 0 ? -1 : 0), 1, 2, c(P.shell[0])); }
    // the shell
    for (let yy = -Math.ceil(H2); yy <= H2; yy++) for (let xx = -Math.ceil(W2); xx <= W2; xx++) { const d = (xx / W2) ** 2 + (yy / H2) ** 2; if (d > 1) continue; const lit = -xx / W2 * 0.4 - yy / H2 * 0.7; ctx.fillStyle = c(d > 0.8 ? P.shell[0] : lit > 0.45 ? P.shell[3] : lit > 0 ? P.shell[2] : P.shell[1]); ctx.fillRect(Math.round(x + xx), Math.round(by + yy), 1, 1); }
    if (e.type === "crab") { px(ctx, x - 2, by - 1, 1, 1, c(P.shell[1])); px(ctx, x + 2, by, 1, 1, c(P.shell[1])); }
    // claws, opening on the strike
    for (const sg of [-1, 1]) { const cx2 = x + sg * (W2 - 1), cy2 = by + H2 + 1, o2 = open ? 2 : 0, cs = e.type === "spitcrab" && sg > 0 ? 1.6 : 1; px(ctx, cx2 - 1, cy2, 3 * cs, 3 * cs, c(P.shell[0])); px(ctx, cx2, cy2, 2 * cs, 2 * cs, c(P.claw)); px(ctx, cx2 - 1 + sg * o2, cy2 + 2 * cs, 1, 2, c(P.claw)); px(ctx, cx2 + 1 * cs + sg * o2, cy2 + 2 * cs, 1, 2, c(P.claw)); }
    // eyes on stalks
    for (const sg of [-1, 1]) { px(ctx, x + sg * 2, by - H2 - 2, 1, 2, c(P.shell[1])); px(ctx, x + sg * 2, by - H2 - 3, 1, 1, "#140c10"); }
  }
  function drawShell(ctx, e, x, y, t, fl, spin) {
    // the hermit's spiral shell, rolling or sitting
    const GL = R().glyph, KA = R().kapa, rr = 7;
    ctx.fillStyle = "rgba(10,12,16,0.3)"; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), rr + 2, 3, 0, 0, TAU); ctx.fill();
    for (let yy = -rr; yy <= rr; yy++) for (let xx = -rr; xx <= rr; xx++) { const d = Math.hypot(xx, yy); if (d > rr) continue; const a = Math.atan2(yy, xx) + spin, sp = ((d / rr) * 2.6 - a / TAU) % 1; let c = ((sp + 1) % 1) < 0.3 ? GL[1] : yy + xx < -3 ? KA[3] : GL[3]; if (d > rr - 1) c = GL[0]; ctx.fillStyle = fl ? "#ffffff" : rgb(c); ctx.fillRect(Math.round(x + xx), Math.round(y - 8 + yy), 1, 1); }
  }
  E.DRAW.crab = function (e, ctx, ox, oy, t, g, introY, fl) {
    const x = e.x - ox, y = e.y - oy + introY;
    if (e.state === "under") { const OB = R().sand || R().glyph; px(ctx, x - 5, y - 2, 10, 2, rgb(R().soil[3])); px(ctx, x - 3, y - 3, 6, 1, rgb(R().glyph[4])); if (Math.random() < 0.5) Combat.addPart({ x: e.x + rnd(-4, 4), y: e.y, vx: rnd(-20, 20), vy: rnd(-30, -10), g: 200, life: 0.3, col: "#e8d0a0", size: 1, kind: "debris" }); return; }
    if (e.state === "rise") { const sh = Math.sin(t * 50) * 1.5; px(ctx, x - 6 + sh, y - 3, 12, 3, rgb(R().glyph[3])); telegraph(ctx, x, y - 14, t); return; }
    drawCrab(ctx, e, x, y, t, fl, e.state === "pinch" || e.state === "windPinch" || e.state === "pop");
    if (e.state === "windPinch") telegraph(ctx, x, y - 18, t);
  };
  E.DRAW.hermit = function (e, ctx, ox, oy, t, g, introY, fl) {
    const x = e.x - ox, y = e.y - oy + introY;
    if (e.state === "shell" || e.state === "roll" || e.state === "windRoll") { drawShell(ctx, e, x, y, t, fl, e.spin || 0); if (e.state === "windRoll") telegraph(ctx, x, y - 20, t); return; }
    drawCrab(ctx, e, x, y + 2, t, fl, e.state === "snap");
    drawShell(ctx, e, x - e.face * 2, y - 3, t, fl, 0);
    if (e.state === "dizzy") for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1; px(ctx, x + Math.cos(a) * 6, y - 22 + Math.sin(a) * 2, 1, 1, "#fff4b8"); }
    if (e.state === "windSnap") telegraph(ctx, x, y - 22, t);
  };
  E.DRAW.spitcrab = function (e, ctx, ox, oy, t, g, introY, fl) {
    const x = e.x - ox, y = e.y - oy + introY;
    drawCrab(ctx, e, x, y, t, fl, e.state === "windSmash" || e.state === "smash");
    if (e.state === "windSpit") { for (let k = 0; k < 4; k++) { const a = t * 5 + k * 1.6; ctx.strokeStyle = "rgba(230,250,255,0.85)"; ctx.beginPath(); ctx.arc(Math.round(x + Math.cos(a) * 3) + 0.5, Math.round(y - 12 + Math.sin(a) * 1.5) + 0.5, 1.5, 0, TAU); ctx.stroke(); } telegraph(ctx, x, y - 20, t); }
    if (e.state === "windSmash") telegraph(ctx, x, y - 20, t);
  };
  // ---- ʻōhiki: skitter, double snip, and the burrow ambush
  AI.crab = function (e, dt, t, P, L, api, d) {
    const toP = Math.atan2(P.y - e.y, P.x - e.x);
    e.untouchable = e.state === "under" || e.state === "rise";
    e.cd = (e.cd || 0) - dt; e.dig = (e.dig ?? rnd(2, 4)) - dt;
    if (!e.alerted) { if (e.st > (e.wait || 1)) { e.dash = { a: Math.random() < 0.5 ? 0 : Math.PI, t: rnd(0.15, 0.35) }; e.wait = rnd(0.5, 1.4); e.st = 0; } }
    else if (e.state === "idle" || e.state === "skitter") {
      e.state = "skitter";
      // sideways round you, the way crabs go, closing in now and then
      if (!e.dash || e.dash.t <= 0) { const side = (e.side = e.side || (Math.random() < 0.5 ? 1 : -1)); e.dash = { a: toP + side * (Math.PI / 2) + (d > 46 ? side * -0.6 : d < 26 ? side * 0.5 : 0), t: rnd(0.15, 0.3) }; if (Math.random() < 0.25) e.side = -side; }
      if (d < 34 && e.cd <= 0) { e.state = "windPinch"; e.st = 0; e.dash = null; e.aim = toP; sfx(api, "clack"); }
      else if (e.dig <= 0 && d > 50 && d < 200 && Level.tileAt(e.x, e.y) === Level.T_.SAND) { e.state = "dig"; e.st = 0; e.dash = null; sfx(api, "hop"); }
    } else if (e.state === "windPinch") { e.aim = toP; if (e.st > 0.32) { e.state = "pinch"; e.st = 0; e.snips = 2; e.hitSet = {}; } }
    else if (e.state === "pinch") {
      tryMove(e, Math.cos(e.aim) * 170 * dt, Math.sin(e.aim) * 170 * dt);
      hitAny(e, e.x + Math.cos(e.aim) * 6, e.y - 4, 13, 1, e.hitSet, "pinch");
      if (e.st > 0.14) { e.snips--; if (e.snips > 0) { e.st = -0.12; e.hitSet = {}; e.aim = toP; sfx(api, "clack"); } else { e.state = "recover"; e.st = 0; e.cd = rnd(1, 1.8); } }
    } else if (e.state === "dig") { if (Math.random() < 0.6) Combat.addPart({ x: e.x + rnd(-5, 5), y: e.y, vx: rnd(-40, 40), vy: rnd(-60, -20), g: 220, life: 0.5, col: "#e8d0a0", size: 1, kind: "debris" }); if (e.st > 0.45) { e.state = "under"; e.st = 0; } }
    else if (e.state === "under") {
      // a ridge of sand runs at your feet
      const tgt = { x: P.x, y: P.y }, a = Math.atan2(tgt.y - e.y, tgt.x - e.x), dd = Math.hypot(tgt.x - e.x, tgt.y - e.y);
      if (dd > 6) tryMove(e, Math.cos(a) * 125 * dt, Math.sin(a) * 125 * dt);
      if (dd < 8 || e.st > 1.8) { e.state = "rise"; e.st = 0; }
    } else if (e.state === "rise") { if (e.st > 0.4) { e.state = "pop"; e.st = 0; e.hitSet = {}; hitAny(e, e.x, e.y - 6, 17, 1, e.hitSet, "ambush"); sfx(api, "vineBurst"); for (let k = 0; k < 10; k++) Combat.addPart({ x: e.x, y: e.y, vx: rnd(-70, 70), vy: rnd(-90, -30), g: 240, life: 0.6, col: "#e8d0a0", size: 2, kind: "debris" }); } }
    else if (e.state === "pop") { if (e.st > 0.35) { e.state = "recover"; e.st = 0; e.dig = rnd(4.5, 7); } }
    else if (e.state === "recover" && e.st > 0.4) { e.state = "skitter"; e.st = 0; }
    if (e.dash && e.dash.t > 0) { e.dash.t -= dt; e.moving = tryMove(e, Math.cos(e.dash.a) * 120 * dt, Math.sin(e.dash.a) * 120 * dt); if (!e.moving) e.dash.t = 0; } else e.moving = e.state === "under";
    if (d > 260) e.alerted = false;
  };
  // ---- hermit: plod, hide, bowl the shell
  ST.hermit.noStun = true;
  E.SETUP.hermit = (e) => { e.spin = 0; e.onHitBase = e.onHit; e.onHit = function (dmg, ang) { e.onHitBase.call(this, dmg, ang); if ((this.state === "walk" || this.state === "idle") && Math.random() < 0.6) { this.state = "shell"; this.st = 0; } }; };
  AI.hermit = function (e, dt, t, P, L, api, d) {
    const toP = Math.atan2(P.y - e.y, P.x - e.x);
    e.armor = e.state === "shell" ? 0.15 : e.state === "dizzy" ? 1.5 : 1; e.cd = (e.cd ?? 2) - dt;
    e.face = Math.cos(toP) >= 0 ? 1 : -1;
    if (!e.alerted) { e.moving = false; return; }
    if (e.state === "idle" || e.state === "walk") {
      e.state = "walk"; e.moving = d > 20 && tryMove(e, Math.cos(toP) * 34 * dt, Math.sin(toP) * 34 * dt);
      if (d < 22 && e.cd <= 0) { e.state = "windSnap"; e.st = 0; e.aim = toP; }
      else if (d > 50 && d < 170 && e.cd <= 0) { e.state = "windRoll"; e.st = 0; e.aim = toP; sfx(api, "clack"); }
    } else if (e.state === "windSnap") { if (e.st > 0.38) { e.state = "snap"; e.st = 0; e.hitSet = {}; hitAny(e, e.x + Math.cos(e.aim) * 10, e.y - 4, 14, 1, e.hitSet, "snap"); sfx(api, "clack"); } }
    else if (e.state === "snap") { if (e.st > 0.3) { e.state = "walk"; e.cd = rnd(1.2, 2); } }
    else if (e.state === "shell") { e.spin += dt * 0.5; if (e.st > 1.3) { e.state = d > 50 && d < 180 ? "windRoll" : "walk"; e.st = 0; e.aim = toP; } }
    else if (e.state === "windRoll") { e.spin += dt * (4 + e.st * 20); e.aim = toP; if (e.st > 0.6) { e.state = "roll"; e.st = 0; e.hitSet = {}; e.bounced = false; sfx(api, "roll"); } }
    else if (e.state === "roll") {
      e.spin += dt * 24;
      const moved = tryMove(e, Math.cos(e.aim) * 230 * dt, Math.sin(e.aim) * 230 * dt);
      if (!moved) { if (e.bounced) e.st = 9; else { e.bounced = true; e.aim += Math.PI + rnd(-0.5, 0.5); Combat.shake = Math.min(1, Combat.shake + 0.15); } }
      hitAny(e, e.x, e.y - 8, 12, zone() >= 2 ? 2 : 1, e.hitSet, "shell");
      if (e.st > 1.0) { e.state = "dizzy"; e.st = 0; }
    } else if (e.state === "dizzy") { if (e.st > 0.9) { e.state = "walk"; e.st = 0; e.cd = rnd(1.5, 2.5); } }
  };
  // ---- bubble crab: keep away, spit foam, slam when crowded
  AI.spitcrab = function (e, dt, t, P, L, api, d) {
    const toP = Math.atan2(P.y - e.y, P.x - e.x);
    e.cd = (e.cd ?? 1.5) - dt;
    if (!e.alerted) { e.moving = false; return; }
    if (e.state === "idle" || e.state === "keep") {
      e.state = "keep";
      const want = d < 70 ? toP + Math.PI : d > 115 ? toP : toP + Math.PI / 2 * (e.side || (e.side = 1));
      e.moving = tryMove(e, Math.cos(want) * 60 * dt, Math.sin(want) * 60 * dt); if (!e.moving) e.side = -(e.side || 1);
      if (d < 32 && e.cd <= 0) { e.state = "windSmash"; e.st = 0; }
      else if (d < 190 && e.cd <= 0) { e.state = "windSpit"; e.st = 0; e.aim = toP; sfx(api, "inhale"); }
    } else if (e.state === "windSpit") { e.aim = toP; if (e.st > 0.55) { const n = zone() >= 3 ? 5 : 3; for (let k = 0; k < n; k++) { const a = e.aim + (k - (n - 1) / 2) * 0.28; L.shots.push({ kind: "bubble", x: e.x, y: e.y - 10, vx: Math.cos(a) * 75, vy: Math.sin(a) * 75, t: 0, life: 3, r: 7 }); } sfx(api, "splash"); e.state = "keep"; e.st = 0; e.cd = rnd(1.6, 2.4); } }
    else if (e.state === "windSmash") { if (e.st > 0.45) { e.state = "smash"; e.st = 0; L.fx.push({ kind: "quake", x: e.x, y: e.y, t: 0, dur: 0.35, R: 38, dmg: 1 }); sfx(api, "land"); Combat.shake = Math.min(1, Combat.shake + 0.2); } }
    else if (e.state === "smash" && e.st > 0.4) { e.state = "keep"; e.cd = rnd(1.4, 2); }
  };

  // ================================================================== Tiki brute
  ST.brute = { hp: 180, r: 11, mat: "wood", kb: 18, noStun: true, big: 6, barY: 50, colors: [css(R().koa[4]), css(R().koa[2]), css(R().stone[3])] };
  let BRUTE = null;
  function bruteArt() {
    if (BRUTE) return BRUTE;
    const src = Props.make.tiki(), W2 = src.width, H2 = src.height - 2, [c, x] = K.canvas(W2, H2);
    x.drawImage(src, 0, 0, W2, H2, 0, 0, W2, H2);
    // warpaint across the brute's chest and brow
    x.fillStyle = PAL.css(R().kapa[2]); x.fillRect(3, 31, W2 - 6, 1); x.fillRect(3, 12, 3, 1); x.fillRect(W2 - 6, 12, 3, 1);
    BRUTE = { c, w: W2, h: H2 }; return BRUTE;
  }
  E.SETUP.brute = (e) => { e.club = -2.2; e.hitSet = {}; };
  AI.brute = function (e, dt, t, P, L, api, d) {
    const toP = Math.atan2(P.y - e.y, P.x - e.x), lvl = zone();
    e.cd = (e.cd ?? 1.5) - dt; e.moving = false;
    if (!e.alerted) { e.club = -2.2; return; }
    if (e.state !== "charge" && e.state !== "windCharge") e.face = Math.cos(toP) >= 0 ? 1 : -1;
    const rest = e.face > 0 ? -2.3 : -0.84;
    if (e.state === "idle" || e.state === "walk") {
      e.state = "walk"; e.club += angDiff(rest, e.club) * Math.min(1, dt * 6);
      if (d > 34) e.moving = tryMove(e, Math.cos(toP) * 40 * dt, Math.sin(toP) * 40 * dt);
      if (e.cd <= 0) {
        const r = Math.random();
        if (d < 50) { e.state = r < 0.55 ? "windSlam" : "windSweep"; e.st = 0; e.aim = toP; sfx(api, "warcry"); }
        else if (d > 70 && d < 190 && r < 0.5) { e.state = "windCharge"; e.st = 0; e.aim = toP; sfx(api, "warcry"); }
      }
    } else if (e.state === "windSlam") { e.club += angDiff(-Math.PI / 2 - e.face * 0.6, e.club) * Math.min(1, dt * 8); if (e.st > 0.7) { e.state = "slam"; e.st = 0; e.hitSet = {}; } }
    else if (e.state === "slam") {
      e.club += angDiff(e.aim, e.club) * Math.min(1, dt * 30);
      if (e.st > 0.08 && !e.landed) { e.landed = true; const ix = e.x + Math.cos(e.aim) * 22, iy = e.y + Math.sin(e.aim) * 16; hitAny(e, ix, iy - 4, 20, 2, e.hitSet, "club"); L.fx.push({ kind: "quake", x: ix, y: iy, t: 0, dur: 0.45, R: 60, dmg: lvl >= 3 ? 2 : 1 }); sfx(api, "stone"); Combat.shake = Math.min(1, Combat.shake + 0.45); }
      if (e.st > 0.6) { e.state = "walk"; e.st = 0; e.landed = false; e.cd = rnd(1.2, 2); }
    } else if (e.state === "windSweep") { e.club += angDiff(e.aim - e.face * 1.5, e.club) * Math.min(1, dt * 8); if (e.st > 0.55) { e.state = "sweep"; e.st = 0; e.hitSet = {}; sfx(api, "spearSweep"); } }
    else if (e.state === "sweep") {
      e.club = e.aim - e.face * 1.5 + (e.st / 0.3) * 3 * e.face;
      for (const q of E.alive || []) { const k = keyOf(q); if (e.hitSet[k]) continue; const dq = Math.hypot(q.x - e.x, q.y - e.y); if (dq < 46 && Math.abs(angDiff(Math.atan2(q.y - e.y, q.x - e.x), e.club)) < 0.5 && q._api.hurt(2, e.x, e.y, "club")) e.hitSet[k] = 1; }
      if (e.st > 0.3) { e.state = "walk"; e.st = 0; e.cd = rnd(1, 1.8); }
    } else if (e.state === "windCharge") { e.club += angDiff(e.aim, e.club) * Math.min(1, dt * 6); e.aim += angDiff(toP, e.aim) * Math.min(1, dt * 3); e.face = Math.cos(e.aim) >= 0 ? 1 : -1; if (e.st > 0.65) { e.state = "charge"; e.st = 0; e.hitSet = {}; } }
    else if (e.state === "charge") {
      e.moving = tryMove(e, Math.cos(e.aim) * 215 * dt, Math.sin(e.aim) * 215 * dt);
      hitAny(e, e.x + Math.cos(e.aim) * 8, e.y - 10, 17, 2, e.hitSet, "charge");
      if (Math.random() < 0.5) Combat.addPart({ x: e.x + rnd(-6, 6), y: e.y, vx: -Math.cos(e.aim) * 30, vy: rnd(-20, -5), g: 30, life: 0.5, col: css(R().soil[4]), size: 2, kind: "smoke" });
      if (!e.moving) { e.state = "stagger"; e.st = 0; Combat.shake = Math.min(1, Combat.shake + 0.4); sfx(api, "stone"); }
      else if (e.st > 0.9) { e.state = "walk"; e.st = 0; e.cd = rnd(1, 1.6); }
    } else if (e.state === "stagger") { e.armor = 1.5; if (e.st > 1) { e.armor = 1; e.state = "walk"; e.st = 0; e.cd = 1; } }
  };
  E.DRAW.brute = function (e, ctx, ox, oy, t, g, introY, fl) {
    const B = bruteArt(), x = Math.round(e.x - ox), y = Math.round(e.y - oy + introY), f = e.face;
    let sx = 1, sy = 1; if (e.state === "windSlam" || e.state === "windCharge") { sx = 1.08; sy = 0.92; } else if (e.state === "slam") { sx = 0.95; sy = 1.06; }
    const bob = e.moving ? Math.abs(Math.sin(t * 9)) * 1.5 : 0, step = e.moving ? Math.sin(t * 9) : 0, img = fl ? tinted(B.c) : B.c;
    ctx.fillStyle = "rgba(10,12,16,0.35)"; ctx.beginPath(); ctx.ellipse(x, y, 14, 4, 0, 0, TAU); ctx.fill();
    // the club behind the body when raised behind the shoulder
    const back = Math.sin(e.club) < -0.2;
    const club = () => {
      const hx = x + f * 8, hy = y - 22 - bob, a = e.club, KO = R().koa, ST2 = R().stone;
      for (let s2 = 0; s2 < 24; s2 += 0.5) { const cx2 = hx + Math.cos(a) * s2, cy2 = hy + Math.sin(a) * s2; const head = s2 > 15; const w = head ? 3.2 : 1; for (let o = -w; o <= w; o += 1) { ctx.fillStyle = fl ? "#ffffff" : rgb(head ? (o < -1 ? ST2[4] : o > 1 ? ST2[1] : ST2[3]) : (o < 0 ? KO[4] : KO[2])); ctx.fillRect(Math.round(cx2 - Math.sin(a) * o), Math.round(cy2 + Math.cos(a) * o), 1, 1); } if (head && ((s2 * 2) | 0) % 3 === 0) { ctx.fillStyle = "#f2ead8"; ctx.fillRect(Math.round(cx2 - Math.sin(a) * 4.2), Math.round(cy2 + Math.cos(a) * 4.2), 1, 1); ctx.fillRect(Math.round(cx2 + Math.sin(a) * 4.2), Math.round(cy2 - Math.cos(a) * 4.2), 1, 1); } }
      px(ctx, hx - 2, hy - 2, 4, 4, fl ? "#ffffff" : rgb(KO[1]));
    };
    if (back) club();
    ctx.save(); ctx.translate(x, y - bob); ctx.scale((f > 0 ? 1 : -1) * sx, sy);
    ctx.drawImage(img, 0, B.h - 3, B.w / 2, 3, -B.w / 2, -3 - (step > 0.3 ? 1 : 0), B.w / 2, 3);
    ctx.drawImage(img, B.w / 2, B.h - 3, B.w / 2, 3, 0, -3 - (step < -0.3 ? 1 : 0), B.w / 2, 3);
    ctx.drawImage(img, 0, 0, B.w, B.h - 3, -B.w / 2, -B.h, B.w, B.h - 3);
    ctx.restore();
    if (!back) club();
    if (e.state === "windSlam" || e.state === "windSweep" || e.state === "windCharge") telegraph(ctx, x, y - B.h - 10, t);
    if (e.state === "stagger") for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1; px(ctx, x + Math.cos(a) * 8, y - B.h - 4 + Math.sin(a) * 2, 1, 1, "#fff4b8"); }
  };

  // ================================================================== sharks (silhouettes that surface to bite)
  const SHARK_WATER = [11, 12, 13];
  ST.shark = { hp: 52, r: 9, mat: "flesh", kb: 0, noStun: true, barY: 18, colors: ["#6a8aa0", "#dfe6ea", "#3a5468"] };
  ST.tshark = { hp: 64, r: 9, mat: "flesh", kb: 0, noStun: true, barY: 18, colors: ["#a0604a", "#ffb060", "#5a3028"] };
  const sharkBody = (s) => (s < 0.1 ? 1.6 + s * 26 : s < 0.36 ? 4.2 : Math.max(0.8, 4.2 * Math.pow(Math.max(0, 1 - (s - 0.36) / 0.6), 1.3)));
  const sharkFins = (s) => { let f = 0; if (s > 0.24 && s < 0.37) f = Math.max(f, 7 * (1 - (s - 0.24) / 0.13) * Math.min(1, (s - 0.24) / 0.035)); if (s > 0.58 && s < 0.66) f = Math.max(f, 3 * (1 - (s - 0.58) / 0.08)); if (s > 0.9) f = Math.max(f, 5.5 * Math.pow((s - 0.9) / 0.1, 0.8)); return f; };
  for (const k of ["shark", "tshark"]) E.SETUP[k] = (e) => { e.swim = true; e.va = Math.random() * TAU; e.S = Surface(90, 90); e.hist = []; e.untouchable = true; e.hideBar = true; e.L = 34; };
  function sharkAI(e, dt, t, P, L, api, d) {
    const thermal = e.type === "tshark";
    e.untouchable = !(e.state === "bite" || e.state === "surfaced");
    e.hideBar = e.untouchable;
    const inReach = () => Math.hypot(P.x - e.x, P.y - e.y) < 70;
    if (!e.alerted || e.state === "idle" || e.state === "cruise") {
      e.state = "cruise"; steer(e, null, SHARK_WATER, dt, 40, 1.5);
      if (e.alerted && d < 180) { e.state = "stalk"; e.st = 0; e.next = rnd(1.6, 3); e.orb = Math.random() < 0.5 ? 1 : -1; }
    } else if (e.state === "stalk") {
      // circling, fin up, closing in
      const want = { x: P.x - Math.cos(Math.atan2(P.y - e.y, P.x - e.x) + e.orb * 0.9) * 54, y: P.y - Math.sin(Math.atan2(P.y - e.y, P.x - e.x) + e.orb * 0.9) * 54 };
      steer(e, want, SHARK_WATER, dt, 75, 3);
      if (thermal) { e.dashCd = (e.dashCd ?? 3) - dt; if (e.dashCd <= 0 && d < 160) { e.state = "boildash"; e.st = 0; e.dashCd = rnd(5, 7); e.aim = Math.atan2(P.y - e.y, P.x - e.x); e.dropT = 0; } }
      if (e.st > e.next && inReach()) { e.state = "rise"; e.st = 0; e.aim = Math.atan2(P.y - e.y, P.x - e.x); sfx(api, "splash"); }
      if (d > 300) { e.state = "cruise"; e.alerted = false; }
    } else if (e.state === "boildash") {
      e.va += angDiff(e.aim, e.va) * Math.min(1, dt * 8); const moved = swim(e, Math.cos(e.va) * 200 * dt, Math.sin(e.va) * 200 * dt, SHARK_WATER);
      e.dropT -= dt; if (e.dropT <= 0) { e.dropT = 0.08; L.fx.push({ kind: "boil", x: e.x, y: e.y, t: 0, dur: 2.2, R: 10 }); }
      if (!moved || e.st > 0.8) { e.state = "stalk"; e.st = 0; e.next = rnd(1, 2); }
    } else if (e.state === "rise") {
      // the water swells as it turns to come up at you
      e.aim += angDiff(Math.atan2(P.y - e.y, P.x - e.x), e.aim) * Math.min(1, dt * 5); e.va += angDiff(e.aim, e.va) * Math.min(1, dt * 8);
      if (e.st > 0.55) { e.state = "bite"; e.st = 0; e.hitSet = {}; sfx(api, "splash"); for (let k = 0; k < 12; k++) Combat.addPart({ x: e.x, y: e.y - 2, vx: rnd(-60, 60), vy: rnd(-90, -30), g: 260, life: 0.6, col: k % 2 ? "#e8f8fc" : "#9ad8e8", size: 1, kind: "drop" }); }
    } else if (e.state === "bite") {
      // out of the water, jaws first
      const moved = swim(e, Math.cos(e.va) * 240 * dt, Math.sin(e.va) * 240 * dt, SHARK_WATER);
      hitAny(e, e.x + Math.cos(e.va) * 10, e.y + Math.sin(e.va) * 7 - 4, 15, thermal ? 2 : 1, e.hitSet, "bite");
      if (e.st > 0.3 || !moved) { e.state = "surfaced"; e.st = 0; sfx(api, "bite"); }
    } else if (e.state === "surfaced") { if (e.st > 0.8) { e.state = "stalk"; e.st = 0; e.next = rnd(1.4, 2.8); sfx(api, "splash"); } }
    e.hist.unshift([e.x, e.y]); if (e.hist.length > 30) e.hist.length = 30;
  }
  AI.shark = sharkAI; AI.tshark = sharkAI;
  // the body: the cave sharks' own outline (snout to forked tail), traced along where it has swum
  function drawShark(e, ctx, ox, oy, t, g, fl) {
    const thermal = e.type === "tshark", S = e.S, W = S.w, cx = W / 2, cy = W / 2, out = e.state === "bite" || e.state === "surfaced", rising = e.state === "rise";
    const pts = [], h = e.hist.length ? e.hist : [[e.x, e.y]], LEN = e.L;
    // spine points from the snout back, following the path (so the body bends as it turns)
    let acc = 0, hi = 0; pts.push([e.x + Math.cos(e.va) * 6, e.y + Math.sin(e.va) * 6, 0]);
    for (let s = 1; s <= 10; s++) { const want = (s / 10) * LEN; while (hi < h.length - 1 && acc + Math.hypot(h[hi + 1][0] - h[hi][0], h[hi + 1][1] - h[hi][1]) < want) { acc += Math.hypot(h[hi + 1][0] - h[hi][0], h[hi + 1][1] - h[hi][1]); hi++; } const b = h[Math.min(hi, h.length - 1)], fall = want - acc; const pa = e.va + Math.PI; pts.push([b[0] + Math.cos(pa) * Math.max(0, fall) * (hi >= h.length - 1 ? 1 : 0), b[1] + Math.sin(pa) * Math.max(0, fall) * (hi >= h.length - 1 ? 1 : 0), s / 10]); }
    for (let k = 1; k < pts.length; k++) { const wave = Math.sin(pts[k][2] * 5 - t * 5 + e.ph) * pts[k][2] * pts[k][2] * 3, a = e.va + Math.PI / 2; pts[k][0] += Math.cos(a) * wave; pts[k][1] += Math.sin(a) * wave; }
    begin(S);
    const SIL = thermal ? PAL.pk([60, 22, 20]) : PAL.pk([8, 34, 52]), EDGE = thermal ? PAL.pk([200, 90, 40]) : PAL.pk([20, 60, 84]);
    const TOP = thermal ? [[150, 92, 80], [190, 120, 96], [110, 60, 52]] : [[104, 132, 152], [140, 168, 186], [70, 96, 116]], BELLY = [226, 232, 234];
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const wx = e.x + x + 0.5 - cx, wy = e.y + y + 0.5 - cy;
      let best = 1e9, bs = 0, side = 0;
      for (let k = 0; k < pts.length - 1; k++) { const ax = pts[k][0], ay = pts[k][1], dx = pts[k + 1][0] - ax, dy = pts[k + 1][1] - ay, ll = dx * dx + dy * dy || 1, tt = Math.max(0, Math.min(1, ((wx - ax) * dx + (wy - ay) * dy) / ll)), dd = Math.hypot(ax + dx * tt - wx, ay + dy * tt - wy); if (dd < best) { best = dd; bs = pts[k][2] + (pts[k + 1][2] - pts[k][2]) * tt; side = (wx - ax) * -dy + (wy - ay) * dx; } }
      const w = sharkBody(bs) + sharkFins(bs);
      if (!(best <= w)) continue;
      const i = y * W + x;
      if (out && bs < 0.42) {
        // the part out of the water: grey-blue back, white belly, a black eye, open jaws and teeth
        const n = best / Math.max(0.1, sharkBody(bs)), up = side < 0;
        let c = PAL.pk(n > 0.8 ? TOP[2] : up ? TOP[1] : n > 0.35 ? TOP[0] : BELLY);
        if (bs > 0.1 && bs < 0.14 && n > 0.45 && n < 0.85) c = PAL.pk([12, 12, 18]);
        if (bs < 0.07 && n < 0.55) c = PAL.pk(e.state === "bite" ? [170, 40, 50] : [60, 40, 48]);
        if (bs < 0.09 && n > 0.5 && n < 0.75 && ((x + y) & 1)) c = PAL.pk([250, 248, 240]);
        if (thermal && bs > 0.16 && Math.sin(bs * 60) > 0.6) c = PAL.pk([255, 160, 70]);
        S.d[i] = fl ? WHITE : c; mark(S, x, y);
      } else { S.d[i] = best > w - 1 ? EDGE : SIL; mark(S, x, y); }
    }
    const has = flush(S, out);
    if (has) { ctx.globalAlpha = out ? 1 : rising ? 0.7 : 0.5; ctx.drawImage(S.c, Math.round(e.x - cx - ox), Math.round(e.y - cy - oy)); ctx.globalAlpha = 1; }
    // the fin cutting the surface, and its wake
    if (!out && (e.state === "stalk" || rising || e.state === "boildash")) {
      const fx = pts[3][0] - ox, fy = pts[3][1] - oy, hgt = rising ? 6 : 4;
      for (let k = 0; k < hgt; k++) px(ctx, fx - (hgt - k) * 0.4, fy - k, Math.max(1, (hgt - k) * 0.6), 1, thermal ? "#8a4a3a" : "#4a6478");
      px(ctx, fx, fy - hgt, 1, 1, "#dfe8ee");
      for (let k = 1; k < 4; k++) { const wa = e.va + Math.PI; for (const sg of [-1, 1]) px(ctx, fx + Math.cos(wa + sg * 0.5) * k * 4, fy + 2 + Math.sin(wa + sg * 0.5) * k * 3, 2, 1, `rgba(240,252,252,${0.8 - k * 0.2})`); }
    }
    if (rising) { ctx.strokeStyle = `rgba(240,252,252,${0.5 + 0.4 * Math.sin(t * 30)})`; ctx.beginPath(); ctx.ellipse(Math.round(e.x - ox) + 0.5, Math.round(e.y - oy) + 0.5, 14 + e.st * 10, 8 + e.st * 5, 0, 0, TAU); ctx.stroke(); telegraph(ctx, e.x - ox, e.y - oy - 16, t); }
    if (thermal && g) glow(g, e.x - ox, e.y - oy, 30, "255,120,50", out ? 0.45 : 0.25);
  }
  E.DRAW.shark = (e, ctx, ox, oy, t, g, introY, fl) => drawShark(e, ctx, ox, oy, t, g, fl);
  E.DRAW.tshark = E.DRAW.shark;

  // ================================================================== stingrays
  const RAY_WATER = [11, 12];
  ST.ray = { hp: 38, r: 9, mat: "flesh", kb: 0, noStun: true, barY: 14, colors: ["#3a5468", "#9adcff", "#20384a"] };
  E.SETUP.ray = (e) => { e.swim = true; e.va = Math.random() * TAU; e.cd = rnd(1, 3); };
  // a ray from above: a soft diamond whose wingtips ripple, a long whip of a tail
  function drawRay(ctx, x, y, va, t, ph, scale, alpha, charge, fl) {
    const ca = Math.cos(va), sa = Math.sin(va), span = 11 * scale, len = 8 * scale;
    const col = fl ? "255,255,255" : charge > 0 ? `${40 + 120 * charge | 0},${80 + 140 * charge | 0},${110 + 140 * charge | 0}` : "8,34,52";
    ctx.fillStyle = `rgba(${col},${alpha})`;
    for (let u = -len; u <= len * 0.6; u += 1) for (let v = -span; v <= span; v += 1) {
      const flap = Math.sin(t * 4 + ph + Math.abs(v) * 0.25) * Math.abs(v) / span * 1.6;
      if (Math.abs(v) / span + Math.abs(u + flap * 0.3) / (u < 0 ? len : len * 0.6) > 1) continue;
      ctx.fillRect(Math.round(x + ca * u - sa * v), Math.round(y + sa * u + ca * v + flap), 1, 1);
    }
    for (let k = 0; k < 12 * scale; k++) ctx.fillRect(Math.round(x - ca * (len + k) + Math.sin(t * 5 + k * 0.4) * sa * 1.5), Math.round(y - sa * (len + k)), 1, 1);
    if (charge > 0) for (let k = 0; k < 6; k++) { const a = K.hash2(k, (t * 20) | 0, 9) * TAU, r = span * (0.6 + K.hash2(k, 3, (t * 20) | 0) * 0.8); ctx.fillStyle = "rgba(220,240,255,0.95)"; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.7), 1, 1); }
  }
  AI.ray = function (e, dt, t, P, L, api, d) {
    e.cd -= dt;
    if (e.state === "charge") { if (e.st > 0.85) { const inW = wetAt(P.x, P.y); L.fx.push({ kind: "zap", x: e.x, y: e.y, t: 0, dur: 0.55, R: 62 * (inW ? 1.25 : 1), dmg: 1 }); sfx(api, "zap"); e.state = "glide"; e.st = 0; e.cd = rnd(2.2, 3.6); } return; }
    e.state = "glide";
    const goal = e.alerted && d < 200 ? { x: P.x + Math.cos(t * 0.7 + e.ph) * 36, y: P.y + Math.sin(t * 0.7 + e.ph) * 26 } : null;
    steer(e, goal, RAY_WATER, dt, e.alerted ? 62 : 30, 2);
    if (e.alerted && e.cd <= 0 && d < 80) { e.state = "charge"; e.st = 0; sfx(api, "inhale"); }
  };
  E.DRAW.ray = (e, ctx, ox, oy, t, g, introY, fl) => { const ch = e.state === "charge" ? Math.min(1, e.st / 0.85) : 0; drawRay(ctx, e.x - ox, e.y - oy, e.va, t, e.ph, 1, 0.55, ch, fl); if (ch > 0) { telegraph(ctx, e.x - ox, e.y - oy - 16, t); if (g) glow(g, e.x - ox, e.y - oy, 30 + ch * 30, "140,200,255", 0.3 + ch * 0.4); } };

  // ================================================================== Kai-Uila, the Storm Ray
  ST.giantray = { hp: 760, r: 24, mat: "flesh", kb: 0, boss: true, big: 26, name: "KAI-UILA, THE STORM RAY", colors: ["#3a5468", "#9adcff", "#20384a"] };
  ST.rayling = { hp: 9999, r: 7, mat: "flesh", kb: 0, noStun: true, barY: 12, colors: ["#3a5468", "#9adcff", "#20384a"] };
  // the shape the school holds: a great ray's outline filled with small rays
  const SLOTS = (() => { const s = []; for (let u = -26; u <= 18; u += 7) for (let v = -46; v <= 46; v += 8) { if (Math.abs(v) / 50 + Math.abs(u + 2) / (u < 0 ? 30 : 22) <= 1) s.push([u, v]); } return s; })();
  E.SETUP.giantray = (e) => { e.swim = true; e.va = Math.PI / 2; e.form = 1; e.cd = 2; e.kids = []; e.hideBar = true; e.rayPh = SLOTS.map(() => Math.random() * 6); e.scatter = SLOTS.map(() => [rnd(-80, 80), rnd(-60, 60)]); };
  AI.giantray = function (e, dt, t, P, L, api, d) {
    const fury = e.hp < e.max / 2, lvlD = fury ? 2 : 1;
    if (!e.announced && e.alerted) { e.announced = true; L.banner = { title: e.name, t0: t }; sfx(api, "zap"); }
    if (e.hp <= 0 && !e.dead) { e.dead = true; for (const k of e.kids) { k.dead = true; k.gone = true; } E.death(e); return; }
    e.cd -= dt;
    e.untouchable = e.state === "swarm" || e.state === "break";
    if (e.state === "idle" || e.state === "glide") {
      e.state = "glide"; e.form = Math.min(1, e.form + dt);
      const goal = { x: P.x - Math.cos(t * 0.4) * 80, y: P.y - Math.sin(t * 0.4) * 50 };
      steer(e, goal, RAY_WATER, dt, fury ? 60 : 44, 1.2);
      if (e.cd <= 0) {
        const r = Math.random(); e.st = 0;
        if (r < (fury ? 0.3 : 0.22)) { e.state = "break"; sfx(api, "zap"); }
        else if (r < 0.5) { e.state = "storm"; e.rings = 0; sfx(api, "inhale"); }
        else if (r < 0.78) { e.state = "call"; sfx(api, "zap"); }
        else { e.state = "sweep"; e.aim = Math.atan2(P.y - e.y, P.x - e.x); e.hitSet = {}; }
      }
    } else if (e.state === "storm") {
      // rings of lightning rolling out through the lagoon
      if (e.st > 0.9 + e.rings * 0.45) { L.fx.push({ kind: "zap", x: e.x, y: e.y, t: 0, dur: 0.8, R: 110, dmg: lvlD }); sfx(api, "zap"); e.rings++; }
      if (e.rings >= (fury ? 4 : 3)) { e.state = "glide"; e.cd = rnd(1.6, 2.6); }
    } else if (e.state === "call") {
      // it marks every hero, then lightning comes down along the marks
      if (!e.called) { e.called = true; for (const q of E.alive || []) for (let k = 0; k < (fury ? 2 : 1); k++) { const ox2 = rnd(-14, 14), oy2 = rnd(-10, 10); L.fx.push({ kind: "bolt", x: e.x, y: e.y - 10, x2: q.x + ox2 + k * 20, y2: q.y - 8 + oy2, t: -k * 0.35, dur: 0.85, dmg: lvlD }); } }
      if (e.st > 1.5) { e.called = false; e.state = "glide"; e.cd = rnd(1.6, 2.6); }
    } else if (e.state === "sweep") {
      // a low, fast glide straight through you, crackling
      e.va += angDiff(e.aim, e.va) * Math.min(1, dt * 6); const moved = swim(e, Math.cos(e.va) * 170 * dt, Math.sin(e.va) * 170 * dt, RAY_WATER);
      hitAny(e, e.x, e.y - 6, 34, 1, e.hitSet, "ray");
      if (!moved || e.st > 1.2) { e.state = "glide"; e.cd = rnd(1.2, 2); }
    } else if (e.state === "break") {
      // the school comes apart
      e.form = Math.max(0, 1 - e.st / 0.6);
      if (e.st > 0.6) {
        e.state = "swarm"; e.st = 0; e.kids = [];
        const n = Math.min(SLOTS.length, 8 + (E.players || []).length * 3);
        for (let k = 0; k < n; k++) { const [u, v] = SLOTS[(k * 3) % SLOTS.length], ca = Math.cos(e.va), sa = Math.sin(e.va); const r = E.spawn("rayling", e.x + ca * u - sa * v, e.y + sa * u + ca * v, 0, L); r.parent = e; r.va = e.va; r.alerted = true; r.tgt = (E.alive || [])[k % Math.max(1, (E.alive || []).length)]; L.enemies.push(r); e.kids.push(r); }
      }
    } else if (e.state === "swarm") {
      // the heart of the school drifts while the rays hunt; when time's up they gather again
      if (e.st > (fury ? 6 : 5) || e.kids.every((k) => k.dead)) { e.state = "reform"; e.st = 0; }
    } else if (e.state === "reform") {
      for (const k of e.kids) if (!k.dead) { const dx = e.x - k.x, dy = e.y - k.y, l = Math.hypot(dx, dy); k.x += (dx / (l || 1)) * Math.min(l, 160 * dt); k.y += (dy / (l || 1)) * Math.min(l, 160 * dt); if (l < 10) { k.dead = true; k.gone = true; } }
      e.form = Math.min(1, e.st / 1.2);
      if (e.st > 1.2) { for (const k of e.kids) { k.dead = true; k.gone = true; } e.kids = []; e.state = "glide"; e.cd = rnd(1.6, 2.4); }
    }
  };
  // a ray of the school: hunts its hero, zaps on contact; blows to it land on the Storm Ray itself
  E.SETUP.rayling = (e) => { e.swim = true; e.hideBar = true; e.zapT = 0; e.onHitBase = e.onHit; e.onHit = function (dmg, ang) { this.hp = this.max; const p = this.parent; if (p && !p.dead) { p.hp -= dmg; p.flash = 0.12; } }; };
  AI.rayling = function (e, dt, t, P, L, api) {
    const tg = e.tgt && !e.tgt.dead ? e.tgt : P, goal = { x: tg.x + Math.cos(t * 2 + e.ph) * 14, y: tg.y + Math.sin(t * 2 + e.ph) * 10 };
    e.va += angDiff(Math.atan2(goal.y - e.y, goal.x - e.x), e.va) * Math.min(1, dt * 4);
    if (!swim(e, Math.cos(e.va) * 95 * dt, Math.sin(e.va) * 95 * dt, RAY_WATER)) e.va += 1.5;
    e.zapT -= dt; if (e.zapT <= 0 && hitAny(e, e.x, e.y - 6, 11, 1, null, "zap")) { e.zapT = 1.2; sfx(api, "zap"); }
  };
  E.DRAW.rayling = (e, ctx, ox, oy, t, g, introY, fl) => drawRay(ctx, e.x - ox, e.y - oy, e.va, t, e.ph, 0.75, 0.62, 0.15 + 0.15 * Math.sin(t * 9 + e.ph), fl);
  E.DRAW.giantray = (e, ctx, ox, oy, t, g, introY, fl) => {
    if (e.state === "swarm") return;
    const ca = Math.cos(e.va), sa = Math.sin(e.va), f = e.form, ch = e.state === "storm" || e.state === "call" ? 0.5 + 0.5 * Math.sin(t * 20) : 0.1;
    const pos = SLOTS.map(([u, v], k) => { const sx = e.x + e.scatter[k][0], sy = e.y + e.scatter[k][1], fx = e.x + ca * u - sa * v + Math.sin(t * 1.5 + e.rayPh[k]) * 1.5, fy = e.y + sa * u + ca * v; return [sx + (fx - sx) * f, sy + (fy - sy) * f]; });
    // lightning flickering between the rays of the school
    if (f > 0.6) for (let k = 0; k < 8; k++) { const a = pos[(k * 7 + ((t * 10) | 0)) % pos.length], b = pos[(k * 11 + 5 + ((t * 10) | 0)) % pos.length]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 22) continue; ctx.fillStyle = `rgba(200,235,255,${0.4 + ch * 0.5})`; for (let s2 = 0; s2 <= 1; s2 += 0.15) ctx.fillRect(Math.round(a[0] + (b[0] - a[0]) * s2 - ox + (Math.random() - 0.5) * 2), Math.round(a[1] + (b[1] - a[1]) * s2 - oy), 1, 1); }
    // the shadow of one great ray under the school, so it reads as a single creature
    if (f > 0.3) { ctx.fillStyle = `rgba(4,22,40,${0.28 * f})`; for (let u = -34; u <= 26; u += 2) for (let v = -56; v <= 56; v += 2) { const flap = Math.sin(t * 2.2 + Math.abs(v) * 0.05) * Math.abs(v) / 56 * 4; if (Math.abs(v) / 56 + Math.abs(u + 4) / (u < -4 ? 30 : 30) > 1) continue; ctx.fillRect(Math.round(e.x - ox + ca * u - sa * v), Math.round(e.y - oy + sa * u + ca * v + flap), 2, 2); } for (let k = 0; k < 40; k++) ctx.fillRect(Math.round(e.x - ox - ca * (34 + k) + Math.sin(t * 3 + k * 0.2) * sa * 3), Math.round(e.y - oy - sa * (34 + k)), 2, 1); }
    pos.forEach(([x, y], k) => drawRay(ctx, x - ox, y - oy, e.va, t, e.rayPh[k], 0.9, 0.78, ch * 0.6, fl));
    if (g) glow(g, e.x - ox, e.y - oy, 70, "140,200,255", 0.18 + ch * 0.3);
    if (e.state === "storm" || e.state === "call") telegraph(ctx, e.x - ox, e.y - oy - 40, t);
  };
  E.ON_DEATH.giantray = (e) => { for (const k of e.kids || []) { k.dead = true; } Combat.shake = 1; };

  // ================================================================== pueo (cliff owls)
  ST.pueo = { hp: 64, r: 8, mat: "flesh", kb: 80, fly: true, barY: 26, colors: ["#a07a4a", "#e8d8b0", "#5a4028"] };
  E.SETUP.pueo = (e) => { e.alerted = true; e.perch = { x: e.x, y: e.y }; e.z = 0; e.state = "perch"; e.va = 0; e.untouchable = true; e.hideBar = true; e.cd = rnd(1.5, 3); e.y += 14; e.fly = true; };
  // the owl drawn at any size: mottled brown wings, a pale facial disk with a dark rim, yellow eyes
  function drawOwl(ctx, x, y, t, sc, flying, flap, fl, face, hot) {
    const BR = hot ? [[96, 40, 26], [160, 74, 40], [214, 118, 54], [246, 176, 92]] : [[64, 46, 34], [114, 84, 56], [160, 124, 82], [214, 186, 136]], DISK = hot ? [255, 222, 176] : [238, 226, 196], RIM = hot ? [120, 36, 20] : [70, 46, 32];
    const c = (col) => (fl ? "#ffffff" : rgb(col));
    const P = (xx, yy, col) => { ctx.fillStyle = c(col); ctx.fillRect(Math.round(xx), Math.round(yy), 1, 1); };
    if (flying) {
      // broad wings: a pale covert band along the leading edge, barred flight feathers, and the
      // primaries spread like fingers at the tips; the wingbeat lifts the tips
      const span = 16 * sc, lift0 = Math.sin(flap);
      for (const sg of [-1, 1]) for (let u = 0; u < span; u += 0.5) {
        const f = u / span, lift = lift0 * f * f * 6 * sc, lead = -6.5 * sc - Math.sin(f * Math.PI) * 1.5 * sc, depth = (6.5 - f * 3) * sc;
        const fingers = f > 0.72 ? Math.max(0, Math.sin((f - 0.72) / 0.28 * Math.PI * 4)) : 1;
        for (let v = 0; v < depth * (f > 0.72 ? 0.45 + 0.55 * fingers : 1); v += 1) {
          const wx = x + sg * (3.5 * sc + u), wy = y + lead + v - lift, band = v < depth * 0.3, bar = ((u * 0.5 + v) | 0) % (sc > 2 ? 5 : 3) === 0;
          P(wx, wy, v < 1 ? BR[3] : band ? (bar ? BR[1] : BR[2]) : bar ? BR[0] : f > 0.8 ? BR[0] : BR[1]);
        }
      }
    }
    // body: a streaked chest, darker back and shoulders
    for (let yy = -9 * sc; yy <= 4 * sc; yy++) for (let xx = -5.2 * sc; xx <= 5.2 * sc; xx++) {
      const d = (xx / (5.2 * sc)) ** 2 + ((yy + 2.5 * sc) / (6.6 * sc)) ** 2; if (d > 1) continue;
      const chest = Math.abs(xx) < 3.4 * sc && yy > -5 * sc, streak = chest && ((xx * 1.3 + yy * 0.2) | 0) % 3 === 0 && ((yy | 0) % 2 === 0);
      P(x + xx, y + yy - 4 * sc, d > 0.85 ? BR[0] : chest ? (streak ? BR[1] : BR[3]) : xx < 0 ? BR[2] : BR[1]);
    }
    // talons when the wings are open
    if (flying) for (const sg of [-1, 1]) for (let k = 0; k < 3; k++) P(x + sg * (1.5 * sc + k), y + 1.5 * sc + (k === 1 ? 1 : 0), [40, 30, 26]);
    // the facial disk: pale, ringed dark, with the beak between deep eyes
    const fy = y - 11 * sc;
    for (let yy = -4.4 * sc; yy <= 3.4 * sc; yy++) for (let xx = -5.4 * sc; xx <= 5.4 * sc; xx++) {
      const d = (xx / (5.4 * sc)) ** 2 + (yy / (4.4 * sc)) ** 2; if (d > 1) continue;
      const lobe = Math.min(((xx - 2.4 * sc) / (2.8 * sc)) ** 2 + (yy / (3 * sc)) ** 2, ((xx + 2.4 * sc) / (2.8 * sc)) ** 2 + (yy / (3 * sc)) ** 2);
      P(x + xx, fy + yy, d > 0.78 ? RIM : lobe > 0.85 && Math.abs(xx) < 0.6 * sc ? BR[2] : DISK);
    }
    for (const sg of [-1, 1]) {
      const ex = x + sg * 2.3 * sc, ey = fy - 0.6 * sc, er = Math.max(1.2, 1.25 * sc);
      for (let yy = -er; yy <= er; yy++) for (let xx = -er; xx <= er; xx++) if (xx * xx + yy * yy <= er * er) P(ex + xx, ey + yy, (xx * xx + yy * yy) < er * er * 0.3 ? [16, 10, 12] : hot ? [255, 150, 40] : [242, 196, 32]);
      if (sc > 1.5) P(ex - er * 0.4, ey - er * 0.4, [255, 255, 255]);
    }
    for (let k = 0; k < Math.max(2, 2 * sc); k++) P(x - 0.5, fy + 1.4 * sc + k * 0.6, [60, 44, 36]);
    for (const sg of [-1, 1]) for (let k = 0; k < Math.max(2, sc * 1.6); k++) P(x + sg * (3.2 * sc + k * 0.4), fy - 4 * sc - k, BR[0]);
  }
  AI.pueo = function (e, dt, t, P, L, api, d) {
    const lowNow = e.state === "low" || (e.state === "swoop" && e.z < 14);
    e.untouchable = !lowNow; e.hideBar = e.untouchable;
    e.cd -= dt;
    const fly = (tx, ty, sp) => { const dx = tx - e.x, dy = ty - e.y, l = Math.hypot(dx, dy); if (l > 1) { const m = Math.min(l, sp * dt); e.x += (dx / l) * m; e.y += (dy / l) * m; e.face = dx >= 0 ? 1 : -1; } return l; };
    if (e.state === "perch" || e.state === "idle") {
      e.state = "perch"; e.z = Math.max(0, e.z - dt * 60);
      if (e.alerted && e.cd <= 0 && d < 210) { e.st = 0; if (Math.random() < 0.55) { e.state = "drop"; e.z = 0; } else { e.state = "glare"; sfx(api, "screech"); } }
    } else if (e.state === "drop") {
      // up over you, and a stone falls
      e.z = Math.min(44, e.z + dt * 80); const l = fly(P.x, P.y - 4, 130);
      if (l < 12 || e.st > 2.2) { L.fx.push({ kind: "rock", x: P.x + rnd(-6, 6), y: P.y + rnd(-4, 4), t: 0, dur: 0.95, R: 15, dmg: 1 }); sfx(api, "throw"); e.state = "return"; e.st = 0; }
    } else if (e.state === "glare") { e.aim = Math.atan2(P.y - e.y, P.x - e.x); if (e.st > 0.55) { e.state = "swoop"; e.st = 0; e.hitSet = {}; e.z = 30; e.tx = P.x + Math.cos(e.aim) * 40; e.ty = P.y + Math.sin(e.aim) * 30; } }
    else if (e.state === "swoop") {
      e.z = Math.max(6, e.z - dt * 90); const l = fly(e.tx, e.ty, 250);
      hitAny(e, e.x, e.y - e.z * 0.3 - 6, 15, 1, e.hitSet, "talons");
      if (l < 6) { e.state = "low"; e.st = 0; }
    } else if (e.state === "low") { e.z = 8 + Math.sin(t * 8) * 2; fly(e.x + Math.cos(t) * 10, e.y, 20); if (e.st > 1.2) { e.state = "return"; e.st = 0; } }
    else if (e.state === "return") { e.z = Math.min(44, e.z + dt * 70); const l = fly(e.perch.x, e.perch.y + 14, 140); if (l < 4) { e.state = "perch"; e.cd = rnd(2, 3.5); } }
  };
  E.DRAW.pueo = (e, ctx, ox, oy, t, g, introY, fl) => {
    const x = e.x - ox, y = e.y - oy, flying = e.state !== "perch";
    if (flying) { ctx.fillStyle = "rgba(10,12,16,0.28)"; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), 10 - Math.min(6, e.z / 8), 3, 0, 0, TAU); ctx.fill(); }
    drawOwl(ctx, x, y - (flying ? e.z : 14), t, 1, flying, t * (e.state === "swoop" ? 6 : 12), fl, e.face, false);
    if (e.state === "glare") telegraph(ctx, x, y - 40, t);
  };

  // ================================================================== Pueo-Ahi, Lord of the Thermals
  ST.pueoboss = { hp: 1150, r: 16, mat: "flesh", kb: 0, boss: true, big: 20, fly: true, name: "PUEO-AHI, LORD OF THE THERMALS", colors: ["#c8642a", "#ffd080", "#6a3018"] };
  E.SETUP.pueoboss = (e) => { e.z = 14; e.home = { x: e.x, y: e.y }; e.cd = 2; e.va = 0; e.hideBar = true; e.fly = true; e.summoned = false; };
  AI.pueoboss = function (e, dt, t, P, L, api, d) {
    const fury = e.hp < e.max / 2;
    if (!e.announced && e.alerted) { e.announced = true; L.banner = { title: e.name, t0: t }; sfx(api, "screech"); }
    const high = e.z > 30;
    e.untouchable = high; e.armor = e.state === "grounded" ? 1.4 : 1;
    const fly = (tx, ty, sp) => { const dx = tx - e.x, dy = ty - e.y, l = Math.hypot(dx, dy); if (l > 1) { const m = Math.min(l, sp * dt); e.x += (dx / l) * m; e.y += (dy / l) * m; e.face = dx >= 0 ? 1 : -1; } return l; };
    const ventsNear = () => (L.vents || []).slice().sort((a, b) => Math.hypot(a.x - e.x, a.y - e.y) - Math.hypot(b.x - e.x, b.y - e.y));
    e.cd -= dt;
    if (fury && !e.summoned) { e.summoned = true; for (let k = 0; k < 2; k++) { const o = E.spawn("pueo", e.home.x + (k ? 120 : -120), e.home.y - 90, 0, L); if (o) { o.alerted = true; L.enemies.push(o); } } L.banner = { title: "THE PUEO ANSWER HIS CALL", t0: t }; }
    if (e.state === "idle" || e.state === "hover") {
      e.state = "hover"; e.z += (14 - e.z) * Math.min(1, dt * 3);
      fly(P.x + Math.cos(t * 0.6) * 70, P.y + 26 + Math.sin(t * 0.8) * 16, fury ? 70 : 50);
      if (e.cd <= 0) {
        const r = Math.random(); e.st = 0;
        if (fury && r < 0.2) { e.state = "firestorm"; e.dropT = 0; sfx(api, "screech"); }
        else if (r < 0.38) { e.state = "windFeathers"; e.volleys = 0; }
        else if (r < 0.58) { e.state = "updraft"; e.queued = false; sfx(api, "screech"); }
        else if (r < 0.8) { e.state = "rise"; sfx(api, "screech"); }
        else { e.state = "windGale"; }
      }
    } else if (e.state === "windFeathers") {
      // wings drawn back, then burning feathers fanned at the nearest hero
      if (e.st > 0.55 + e.volleys * 0.4) { const Q = nearest(e.x, e.y) || P, a0 = Math.atan2(Q.y - (e.y - e.z), Q.x - e.x), n = fury ? 11 : 9; for (let k = 0; k < n; k++) { const a = a0 + (k - (n - 1) / 2) * 0.14 + (e.volleys % 2 ? 0.07 : 0); L.shots.push({ kind: "feather", x: e.x, y: e.y - e.z, vx: Math.cos(a) * 170, vy: Math.sin(a) * 170, t: 0, life: 2.2, r: 7 }); } sfx(api, "wispShed"); e.volleys++; }
      if (e.volleys >= (fury ? 3 : 2)) { e.state = "hover"; e.cd = rnd(1.4, 2.2); }
    } else if (e.state === "updraft") {
      // up on the vents' heat, out of reach, and the vents go off in a wave from beneath it
      e.z = Math.min(70, e.z + dt * 60);
      if (!e.queued && e.z > 40) { e.queued = true; ventsNear().forEach((v, i) => window.Sea && Sea.erupt(v, 0.6 + i * (fury ? 0.22 : 0.32))); }
      if (e.st > 3.4) { e.state = "hover"; e.cd = rnd(1.2, 2); }
    } else if (e.state === "rise") {
      e.z = Math.min(64, e.z + dt * 90); fly(P.x, P.y, 90);
      if (e.st > 0.7) { e.state = "mark"; e.st = 0; const Q = nearest(e.x, e.y) || P; e.tx = Q.x; e.ty = Q.y; L.fx.push({ kind: "mark", x: e.tx, y: e.ty, t: 0, dur: 0.85, R: 26 }); }
    } else if (e.state === "mark") { fly(e.tx, e.ty, 60); if (e.st > 0.85) { e.state = "dive"; e.st = 0; e.hitSet = {}; } }
    else if (e.state === "dive") {
      e.z = Math.max(0, e.z - dt * 260); fly(e.tx, e.ty, 220);
      if (e.z <= 0) { hitAny(e, e.x, e.y - 6, 24, 2, e.hitSet, "talons"); L.fx.push({ kind: "quake", x: e.x, y: e.y, t: 0, dur: 0.5, R: 64, dmg: fury ? 2 : 1 }); sfx(api, "stone"); Combat.shake = 1; e.state = "grounded"; e.st = 0; }
    } else if (e.state === "grounded") { e.z = 0; if (e.st > (fury ? 1.2 : 1.7)) { e.state = "hover"; e.cd = rnd(1, 1.8); } }
    else if (e.state === "windGale") { if (e.st > 0.6) { for (const q of E.alive || []) { const dq = Math.hypot(q.x - e.x, q.y - e.y); if (dq < 130) q._api.hurt(1, e.x, e.y, "gale"); } for (let k = 0; k < 30; k++) Combat.addPart({ x: e.x + rnd(-20, 20), y: e.y - e.z + rnd(-6, 6), vx: rnd(-160, 160), vy: rnd(-40, 80), drag: 2, life: 0.8, col: k % 2 ? "#ffd080" : "#ff8a3a", size: 1, kind: "ember", glow: true }); sfx(api, "wispPulse"); e.state = "hover"; e.cd = rnd(1.4, 2.2); } }
    else if (e.state === "firestorm") {
      // circling out of reach, raining molten stones on everyone
      e.z = Math.min(60, e.z + dt * 70); fly(e.home.x + Math.cos(t * 1.2) * 110, e.home.y + Math.sin(t * 1.2) * 60, 140);
      e.dropT -= dt; if (e.dropT <= 0) { e.dropT = 0.45; for (const q of E.alive || []) L.fx.push({ kind: "rock", x: q.x + rnd(-12, 12), y: q.y + rnd(-8, 8), t: 0, dur: 1.0, R: 18, dmg: 1, hot: 1 }); }
      if (e.st > 3.6) { e.state = "hover"; e.cd = rnd(1.2, 2); }
    }
  };
  E.DRAW.pueoboss = (e, ctx, ox, oy, t, g, introY, fl) => {
    const x = e.x - ox, y = e.y - oy, flying = e.state !== "grounded";
    ctx.fillStyle = "rgba(10,12,16,0.32)"; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), 30 - Math.min(16, e.z / 4), 7, 0, 0, TAU); ctx.fill();
    const fs = e.state === "windGale" ? t * 30 : e.state === "windFeathers" ? -0.8 : t * (e.z > 30 ? 5 : 8);
    drawOwl(ctx, x, y - e.z - 4, t, 2.6, flying, fs, fl, e.face, true);
    if (g) glow(g, x, y - e.z - 30, 90, "255,140,60", 0.45);
    // heat shimmer streaming off its wings
    for (let k = 0; k < 8; k++) { const ph = (t * 1.6 + k * 0.13) % 1; px(ctx, x + Math.sin(k * 2.4) * 34 * (1 - ph * 0.3), y - e.z - 20 - ph * 40, 1, 2, `rgba(255,200,120,${(1 - ph) * 0.6})`); }
    if (e.state === "windFeathers" || e.state === "windGale") telegraph(ctx, x, y - e.z - 70, t);
    if (e.state === "grounded") for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1; px(ctx, x + Math.cos(a) * 14, y - 70 + Math.sin(a) * 3, 2, 2, "#fff4b8"); }
  };

  // ================================================================== network: what guests need to draw these
  const net = { ser: (q, o, r1) => { if (q.va !== undefined) o.va = Math.round(q.va * 100) / 100; if (q.z !== undefined) o.z = r1(q.z); if (q.untouchable) o.ut = 1; if (q.club !== undefined) o.cl = Math.round(q.club * 100) / 100; if (q.form !== undefined) o.fm = Math.round(q.form * 100) / 100; if (q.spin !== undefined) o.sp = Math.round(q.spin * 10) / 10; },
    app: (e, o) => { if (o.va !== undefined) e.va = o.va; if (o.z !== undefined) e.nz = o.z; e.untouchable = !!o.ut; if (o.cl !== undefined) e.club = o.cl; if (o.fm !== undefined) e.form = o.fm; if (o.sp !== undefined) e.spin = o.sp; },
    tick: (e, dt) => { if (e.nz !== undefined) e.z = (e.z || 0) + (e.nz - (e.z || 0)) * Math.min(1, dt * 12); if (e.hist) { e.hist.unshift([e.x, e.y]); if (e.hist.length > 30) e.hist.length = 30; } } };
  for (const k of ["crab", "hermit", "spitcrab", "brute", "shark", "tshark", "ray", "giantray", "rayling", "pueo", "pueoboss"]) E.NET[k] = net;
})();
