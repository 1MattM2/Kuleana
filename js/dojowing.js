// Hale Koa's wings: the training hut grows as you progress (Gear dojo phase):
//   1. the hall itself (js/dojo.js): the weapon rack, armour stands, training dummies
//   2. the Duel Hall, west: duel a partner in co-op (the only place heroes can strike each other), or a
//      challenger from among the islanders you've freed, each with their own weapon and way of fighting
//   3. the Arena Wing, east: a hallway to the Creature Hall, where you can call any creature you've met
//      (tikis one at a time, or a war party)
//   4. ...and the Boss Hall at the hallway's end, for any great beast
// Both halls of the Arena Wing have carved tiki fountains down their sides. Calling a sea creature sets
// them pouring: the hall floods (a few seconds), and stays flooded until you call a land creature, when it
// drains again. Nobody dies in Hale Koa: a hero brought down yields, and is back on their feet.
// How the dojo phases are earned is still to come (materials); the test world has the whole of it.
(function () {
  const DW = (window.DojoWing = {});
  const T = 32, D = Level.DEFS;

  // ---------------------------------------------------------------- the maps
  const grid = (w, h) => Array.from({ length: h }, () => Array(w).fill("#"));
  const fill = (g, x0, y0, x1, y1, ch) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y][x] = ch; };
  // the Duel Hall: a koa floor with a ring at its heart, the challenge board on the back wall
  {
    const g = grid(20, 14); fill(g, 2, 3, 17, 10, "w"); fill(g, 18, 6, 19, 8, "w");
    D.dojo_duel = { title: "THE DUEL HALL", sub: "Hale Koa", bg: "abyss", cliff: 40, wallFace: 30, ivy: 0, indoor: 1, dojo: "duel", amb: "dojo", map: g.map((r) => r.join("")),
      spawn: { x: 18.4, y: 7.6 }, exits: [{ x0: 19.3, x1: 20, y0: 5, to: "dojo", side: "west" }], gates: [], enemies: [], arenas: [],
      props: [{ k: "duelring", x: 10, y: 7.2 }, { k: "lectern", x: 10, y: 3.4, hall: "duel" }, { k: "brazier", x: 3, y: 3.6 }, { k: "brazier", x: 17, y: 3.6 }, { k: "brazier", x: 3, y: 10.4 }, { k: "brazier", x: 17, y: 10.4 }] };
  }
  // the Arena Wing: a hallway east from the hall; the Creature Hall opens off it to the north, and the
  // Boss Hall stands at its end
  {
    const g = grid(46, 31);
    fill(g, 0, 15, 26, 18, "w");               // the hallway
    fill(g, 4, 3, 21, 12, "%"); fill(g, 11, 13, 14, 14, "w");     // the Creature Hall and its door
    fill(g, 27, 4, 44, 27, "%");               // the Boss Hall
    const props = [{ k: "lectern", x: 12.5, y: 3.4, hall: "beasts" }, { k: "lectern", x: 36, y: 4.4, hall: "bosses" }, { k: "brazier", x: 1.5, y: 15.4 }, { k: "brazier", x: 25, y: 15.4 }, { k: "brazier", x: 10.2, y: 13.4 }, { k: "brazier", x: 15.8, y: 13.4 }];
    for (const y of [5.6, 9.8]) { props.push({ k: "fountain", x: 4.7, y, face: 1, hall: "beasts" }); props.push({ k: "fountain", x: 21.3, y, face: -1, hall: "beasts" }); }
    for (const y of [8.2, 13.4, 18.6, 23.8]) { props.push({ k: "fountain", x: 27.7, y, face: 1, hall: "bosses" }); props.push({ k: "fountain", x: 44.3, y, face: -1, hall: "bosses" }); }
    D.dojo_wing = { title: "THE ARENA WING", sub: "Hale Koa", bg: "abyss", cliff: 40, wallFace: 30, ivy: 0, indoor: 1, dojo: "wing", amb: "dojo", map: g.map((r) => r.join("")),
      spawn: { x: 2.2, y: 16.9 }, exits: [{ x0: 0, x1: 0.7, y0: 14, to: "dojo", side: "east" }], gates: [], enemies: [], arenas: [], props,
      halls: { beasts: { rect: [4 * T, 3 * T, 22 * T, 13 * T], at: { x: 13 * T, y: 8.5 * T }, phase: 3 }, bosses: { rect: [27 * T, 4 * T, 45 * T, 28 * T], at: { x: 36 * T, y: 17 * T }, phase: 4 } } };
  }
  DW.phase = () => (window.Gear && Gear.state().dojo) || 1;

  // ---------------------------------------------------------------- props
  const H = Level.PROPS;
  // a carved tiki on a stone basin; when the hall floods its mouth pours a stream of water into the room
  let tikiArt = null;
  H.fountain = (p, L, o, x, y) => {
    const face = p.face || 1;
    o.draw = (ctx, ox, oy, t, g) => {
      const ti = tikiArt || (tikiArt = Props.make.tiki()), F = (L.floods || []).find((q) => q.id === p.hall), on = F && F.spout > 0;
      const X = Math.round(x - ox), Y = Math.round(y - oy);
      // the basin: a ring of fitted stone holding water
      ctx.fillStyle = "#1a1416"; ctx.beginPath(); ctx.ellipse(X, Y + 1, 15, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#8a7a6a"; ctx.beginPath(); ctx.ellipse(X, Y, 14, 5.4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#b8a890"; ctx.fillRect(X - 13, Y - 2, 26, 1);
      ctx.fillStyle = on ? "#9ae0f0" : "#3a8aa8"; ctx.beginPath(); ctx.ellipse(X, Y - 0.5, 11, 3.6, 0, 0, Math.PI * 2); ctx.fill();
      if (Math.sin(t * 3 + x) > 0.5) { ctx.fillStyle = "#e8fbff"; ctx.fillRect(X - 4 + ((t * 6) | 0) % 8, Y - 1, 2, 1); }
      // the tiki rising out of it, facing the hall
      ctx.save(); ctx.translate(X, Y - 2); ctx.scale(face, 1); ctx.drawImage(ti, Math.round(-ti.width / 2), -ti.height); ctx.restore();
      // pouring: an arc of water from its mouth into the hall, and spray where it lands
      if (on) {
        const mx = X + face * 4, my = Y - ti.height * 0.55;
        for (let k = 0; k < 28; k++) { const u = k / 28, px = mx + face * u * 30, py = my + u * u * 34 - Math.sin(u * Math.PI) * 8 + Math.sin(t * 20 + k) * 0.6; ctx.fillStyle = k % 3 ? "rgba(170,230,250,0.9)" : "#ffffff"; ctx.fillRect(Math.round(px), Math.round(py), 2, 2); }
        if (Math.random() < 0.6) Combat.addPart({ x: x + face * 30, y: y - 6, vx: face * 20 + (Math.random() - 0.5) * 40, vy: -40 - Math.random() * 40, g: 240, life: 0.5, col: Math.random() < 0.5 ? "#e8f8fc" : "#9ad8e8", size: 1, kind: "drop" });
        if (g) Level.glowAt(g, mx + face * 14, my + 10, 26, "150,220,255", 0.3);
      }
    };
    o.solids = [[x - 13, y - 6, x + 13, y + 4]];
  };
  // the challenge lectern: a carved koa board on a stand, painted with the hall's emblem
  H.lectern = (p, L, o, x, y) => {
    (L.lecterns || (L.lecterns = [])).push({ x, y, hall: p.hall });
    o.draw = (ctx, ox, oy, t, g) => {
      const X = Math.round(x - ox), Y = Math.round(y - oy);
      ctx.fillStyle = "#1e100a"; ctx.fillRect(X - 2, Y - 14, 4, 15); ctx.fillStyle = "#7a4628"; ctx.fillRect(X - 1, Y - 14, 2, 14);
      ctx.fillStyle = "#1e100a"; ctx.fillRect(X - 12, Y - 34, 24, 21); ctx.fillStyle = "#8a5430"; ctx.fillRect(X - 11, Y - 33, 22, 19); ctx.fillStyle = "#a86a3a"; ctx.fillRect(X - 11, Y - 33, 22, 2);
      const col = p.hall === "duel" ? "#e8d8b8" : p.hall === "bosses" ? "#ffcc4a" : "#9ad8e8";
      ctx.fillStyle = col;
      if (p.hall === "duel") { for (let k = 0; k < 7; k++) { ctx.fillRect(X - 7 + k * 2, Y - 29 + k * 2, 2, 2); ctx.fillRect(X + 5 - k * 2, Y - 29 + k * 2, 2, 2); } }
      else if (p.hall === "bosses") { ctx.fillRect(X - 6, Y - 28, 12, 2); ctx.fillRect(X - 6, Y - 24, 2, 6); ctx.fillRect(X + 4, Y - 24, 2, 6); ctx.fillRect(X - 3, Y - 22, 6, 2); }
      else { for (let k = 0; k < 4; k++) ctx.fillRect(X - 6 + k * 4, Y - 26 + (k % 2) * 3, 3, 3); }
      if (g) Level.glowAt(g, X, Y - 24, 22, "255,220,150", 0.25 + 0.1 * Math.sin(t * 2));
    };
    o.solids = [[x - 10, y - 4, x + 10, y + 2]];
  };
  // the duel ring: a circle of woven mat with a red kapa border, laid on the floor
  H.duelring = (p, L, o, x, y) => {
    let art = null;
    o.ground = true;
    o.draw = (ctx, ox, oy) => {
      if (!art) { const R = 74, [c, x2] = K.canvas(R * 2 + 4, R + 4); for (let yy = 0; yy < R + 4; yy++) for (let xx = 0; xx < R * 2 + 4; xx++) { const dx = (xx - R - 2) / R, dy = (yy - R / 2 - 2) / (R / 2), d = Math.hypot(dx, dy); if (d > 1) continue; const cell = ((xx >> 2) + (yy >> 2)) & 1; x2.fillStyle = d > 0.93 ? "#2a1a0e" : d > 0.86 ? "#8a2a20" : d > 0.83 ? "#e8d8b8" : cell ? "#d8b470" : "#c8a060"; x2.fillRect(xx, yy, 1, 1); } art = c; }
      ctx.drawImage(art, Math.round(x - art.width / 2 - ox), Math.round(y - art.height / 2 - oy));
    };
  };

  // ---------------------------------------------------------------- what can be called
  // creatures by the bestiary's names; tikis singly or as a war party; bosses; challengers. In the normal
  // game a creature must have been met (beaten at least once) to be called; the test world has them all.
  const BEASTS = [
    ["gecko"], ["runner"], ["snake"], ["firegecko"], ["wisp"], ["vine"],
    ["spear", "Tiki spearman"], ["dart", "Tiki darter"], ["firedancer", "Tiki fire-dancer"], ["brute", "Tiki brute"], ["party", "A tiki war party", ["spear", "spear", "dart", "dart", "brute", "firedancer"]],
    ["crab"], ["spitcrab"], ["shark"], ["bigshark"], ["tshark"], ["ray"], ["pueo"],
  ];
  const BOSSES = [["hydra"], ["hive"], ["spidercrab"], ["giantray"]];
  const CHALLENGERS = [
    { id: "makani", name: "Makani the merchant", weapon: "pahoa", desc: "Quick as a minnow: flurries of stabs, always slipping aside.", who: "vendor" },
    { id: "kamaka", name: "Kamaka the smith", weapon: "newa", desc: "Slow and strong: a guard you can't go through, and blows that shake the floor.", who: "smith" },
    { id: "kahu", name: "Kahu Lā, keeper of the gate", weapon: "spear", desc: "Long reach: thrusts and sweeping spins, and he keeps his distance.", who: null },
  ];
  DW.CHALLENGERS = CHALLENGERS;
  const nameOf = (k) => (Gear.BEASTS[k] ? Gear.BEASTS[k][0] : k);
  const isSea = (k) => !!(Enemies.STATS[k] && Enemies.STATS[k].aquatic);
  DW.list = (hall, test, mates) => {
    const met = (k) => test || (Gear.state().kills || {})[k] > 0;
    if (hall === "duel") {
      const out = CHALLENGERS.filter((c) => test || !c.who || Gear.rescued(c.who)).map((c) => ({ key: "duel:" + c.id, name: c.name, sub: c.desc }));
      if (mates) out.unshift({ key: "pvp", name: "Duel your partner", sub: "The one place heroes may strike each other. First to fall yields." });
      return out;
    }
    const src = hall === "bosses" ? BOSSES : BEASTS;
    return src.filter(([k, , grp]) => (grp ? grp.every(met) : met(k))).map(([k, name, grp]) => ({ key: k, name: name || nameOf(k), sub: (grp ? "Spearmen, darters, a brute and a fire-dancer, all at once" : Gear.BEASTS[k] ? Gear.BEASTS[k][2] : "") + (isSea(k) ? "  (the fountains will flood the hall)" : ""), grp, sea: isSea(k) }));
  };

  // ---------------------------------------------------------------- floods
  const floodOf = (L, hall) => {
    L.floods = L.floods || [];
    let F = L.floods.find((q) => q.id === hall);
    if (!F) { const hh = L.def.halls[hall]; F = { id: hall, rect: hh.rect, level: 0, target: 0, spout: 0 }; L.floods.push(F); }
    return F;
  };
  // call a creature (or a party, or a boss) into a hall: flood or drain first if the creature needs it
  DW.call = (L, hall, entry, api) => {
    const hh = L.def.halls[hall], F = floodOf(L, hall), wantWater = !!entry.sea;
    // clear whatever is in the hall now
    for (const e of L.enemies) if (!e.dead && inRect(e, hh.rect)) { e.dead = true; e.gone = true; }
    const go = () => spawn(L, hall, entry);
    if (wantWater && F.target !== 1) { F.target = 1; F.spout = 3.2; F.after = go; F.t = 0; api && api.sfx && api.sfx("geyser"); L.banner = { title: "THE FOUNTAINS POUR", sub: "The hall is flooding", t0: Level.time || 0 }; }
    else if (!wantWater && F.target !== 0 && F.level > 0) { F.target = 0; F.spout = 0; F.after = go; F.t = 0; api && api.sfx && api.sfx("splash"); L.banner = { title: "THE HALL DRAINS", t0: Level.time || 0 }; }
    else go();
  };
  const inRect = (e, r) => e.x > r[0] && e.x < r[2] && e.y > r[1] && e.y < r[3];
  function spawn(L, hall, entry) {
    const hh = L.def.halls[hall], kinds = entry.grp || [entry.key], n = kinds.length;
    kinds.forEach((k, i) => {
      const a = (i / Math.max(1, n)) * Math.PI * 2, r = n > 1 ? 50 : 0, e = Enemies.spawn(k, hh.at.x + Math.cos(a) * r, hh.at.y + Math.sin(a) * r * 0.7, entry.grp ? 900 : 0, L);
      if (!e) return; e.enter = isSea(k) ? "scurry" : "leap"; e.introT = 0.9; e.alerted = true; L.enemies.push(e);
    });
  }
  // every frame, in a hall level: floods rise and fall, fountains pour, and a called creature arrives
  // once its water is right
  DW.update = (L, dt) => {
    if (!L.def.dojo) return;
    for (const F of L.floods || []) {
      F.spout = Math.max(0, F.spout - dt);
      const sp = F.target === 1 ? 1 / 3.2 : 1 / 2.6;
      if (F.level < F.target) F.level = Math.min(F.target, F.level + dt * sp); else if (F.level > F.target) F.level = Math.max(F.target, F.level - dt * sp);
      if (F.after && F.level === F.target) { const f = F.after; F.after = null; f(); }
    }
  };
  DW.serialize = (L) => (L.floods || []).map((F) => [F.id, Math.round(F.level * 100) / 100, F.target, F.spout > 0 ? 1 : 0]);
  DW.apply = (L, a) => { for (const [id, lv, tg, sp] of a || []) { const F = floodOf(L, id); F.level = lv; F.target = tg; F.spout = sp ? 0.3 : 0; } };
  // the water itself: it spreads in from the fountain sides toward the middle, rippling, foam at its edge
  DW.drawFlood = (ctx, L, ox, oy, LW, LH, t) => {
    for (const F of L.floods || []) {
      if (F.level <= 0) continue;
      const [x0, y0, x1, y1] = F.rect, half = (x1 - x0) / 2, reach = half * Math.min(1, F.level / 0.85), a = Math.min(1, F.level * 1.6);
      for (const side of [-1, 1]) {
        const ex = side < 0 ? x0 + reach : x1 - reach, rx0 = side < 0 ? x0 : ex, rx1 = side < 0 ? ex : x1;
        const sx = Math.max(rx0, ox), sx1 = Math.min(rx1, ox + LW), sy = Math.max(y0, oy), sy1 = Math.min(y1, oy + LH);
        if (sx1 <= sx || sy1 <= sy) continue;
        ctx.fillStyle = `rgba(40,140,180,${0.72 * a})`; ctx.fillRect(Math.round(sx - ox), Math.round(sy - oy), Math.round(sx1 - sx), Math.round(sy1 - sy));
        // ripples drifting across, and the bright edge of the advancing water
        ctx.fillStyle = `rgba(190,240,250,${0.45 * a})`;
        for (let yy = Math.floor(sy / 6) * 6; yy < sy1; yy += 6) for (let xx = Math.floor(sx / 22) * 22; xx < sx1; xx += 22) { const ph = Math.sin(t * 1.6 + xx * 0.05 + yy * 0.21), w = 6 + ph * 3; if (ph > 0.2) ctx.fillRect(Math.round(xx + ((t * 8 + yy) % 22) - ox), Math.round(yy - oy), Math.round(w), 1); }
        if (F.level < 0.99) { ctx.fillStyle = "rgba(240,252,255,0.9)"; for (let yy = sy; yy < sy1; yy += 2) ctx.fillRect(Math.round(ex - ox + Math.sin(yy * 0.3 + t * 8) * 2), Math.round(yy - oy), 2, 2); }
      }
    }
  };

  // ---------------------------------------------------------------- duelists (the islanders, as fighters)
  const E = window.Enemies, ST = E.STATS, AI = E.AI, L0 = E.lib;
  const DUEL = {
    makani: { hp: 170, sp: 118, reach: 24, wind: 0.22, dmg: 1, hits: 3, gap: 0.16, dodge: 0.55, keep: 30, weapon: "pahoa" },
    kamaka: { hp: 290, sp: 66, reach: 34, wind: 0.6, dmg: 2, hits: 1, gap: 0, dodge: 0.1, keep: 34, guard: 1, slam: 1, weapon: "newa" },
    kahu: { hp: 220, sp: 92, reach: 50, wind: 0.42, dmg: 1, hits: 2, gap: 0.3, dodge: 0.3, keep: 52, spin: 1, weapon: "spear" },
  };
  ST.duelist = { hp: 200, r: 8, mat: "flesh", kb: 60, barY: 40, colors: ["#e8b878", "#a86a3a", "#f4e0c0"] };
  E.SETUP.duelist = (e) => { e.who = "makani"; e.face = 1; e.cd = 1; e.blocks = function (ang) { return DUEL[this.who].guard && this.state === "guard" && Math.cos(ang - (this.face > 0 ? Math.PI : 0)) > 0.3; }; };
  DW.makeDuelist = (L, who, x, y) => { const e = E.spawn("duelist", x, y, 0, L); const C = DUEL[who]; e.who = who; e.hp = e.max = Math.round(C.hp * (E.hpScale || 1)); e.alerted = true; e.enter = "leap"; e.introT = 0.9; L.enemies.push(e); return e; };
  AI.duelist = function (e, dt, t, P, L, api, d) {
    const C = DUEL[e.who], toP = Math.atan2(P.y - e.y, P.x - e.x);
    e.cd -= dt; e.untouchable = e.state === "roll";
    if (e.state !== "roll" && e.state !== "strike") e.face = Math.cos(toP) >= 0 ? 1 : -1;
    const mv = (a, sp) => { e.moving = L0.tryMove(e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt); };
    if (e.state === "idle" || e.state === "stalk" || e.state === "guard") {
      if (e.state === "idle") e.state = "stalk";
      // a hero swinging close: slip aside (or raise the guard)
      if (P.attacking && d < 50 && Math.random() < dt * 6 * C.dodge && e.state !== "guard") { e.state = "roll"; e.st = 0; e.rollA = toP + Math.PI + (Math.random() < 0.5 ? 1 : -1) * 1.2; L0.sfx(api, "hop"); return; }
      if (C.guard && P.attacking && d < 60) { e.state = "guard"; e.st = 0; }
      if (e.state === "guard") { e.moving = false; if (e.st > 0.7) e.state = "stalk"; return; }
      const want = d > C.keep + 14 ? toP : d < C.keep - 10 ? toP + Math.PI : toP + Math.PI / 2 * (Math.sin(t * 0.7 + e.ph) > 0 ? 1 : -1);
      mv(want, d > C.keep + 14 ? C.sp : C.sp * 0.55);
      if (e.cd <= 0 && d < C.reach + 16) { e.state = C.spin && Math.random() < 0.35 ? "windSpin" : C.slam && Math.random() < 0.4 ? "windSlam" : "wind"; e.st = 0; e.aim = toP; e.n = 0; L0.sfx(api, "warcry"); }
    } else if (e.state === "roll") { mv(e.rollA, 210 * (1 - e.st / 0.32)); if (e.st > 0.32) { e.state = "stalk"; e.st = 0; e.cd = Math.min(e.cd, 0.3); } }
    else if (e.state === "wind") { e.aim += L0.angDiff(toP, e.aim) * Math.min(1, dt * 6); if (e.st > C.wind) { e.state = "strike"; e.st = 0; e.hitSet = {}; e.n++; L0.sfx(api, "slash"); } }
    else if (e.state === "strike") {
      mv(e.aim, 150 * Math.max(0, 1 - e.st / 0.14));
      for (const q of E.alive || []) { const k = q.isRemote ? "r" + q.slot : "l"; if (e.hitSet[k]) continue; const dq = Math.hypot(q.x - e.x, q.y - e.y); if (dq < C.reach + 8 && Math.abs(L0.angDiff(Math.atan2(q.y - e.y, q.x - e.x), e.aim)) < 0.9 && q._api.hurt(C.dmg, e.x, e.y, "duel")) e.hitSet[k] = 1; }
      if (e.st > 0.18) { if (e.n < C.hits) { e.state = "wind"; e.st = C.wind - C.gap; } else { e.state = "stalk"; e.st = 0; e.cd = 0.7 + Math.random() * 0.8; } }
    } else if (e.state === "windSpin") { if (e.st > 0.6) { e.state = "spin"; e.st = 0; e.hitSet = {}; L0.sfx(api, "spearSweep"); } }
    else if (e.state === "spin") { for (const q of E.alive || []) { const k = q.isRemote ? "r" + q.slot : "l"; if (!e.hitSet[k] && Math.hypot(q.x - e.x, q.y - e.y) < C.reach && q._api.hurt(1, e.x, e.y, "duel")) e.hitSet[k] = 1; } if (e.st > 0.35) { e.state = "stalk"; e.cd = 1 + Math.random(); } }
    else if (e.state === "windSlam") { if (e.st > 0.7) { e.state = "slam"; e.st = 0; L.fx.push({ kind: "quake", x: e.x + Math.cos(e.aim) * 16, y: e.y + Math.sin(e.aim) * 12, t: 0, dur: 0.45, R: 50, dmg: 1 }); L0.sfx(api, "stone"); Combat.shake = Math.min(1, Combat.shake + 0.4); } }
    else if (e.state === "slam") { if (e.st > 0.5) { e.state = "stalk"; e.cd = 1 + Math.random() * 0.6; } }
  };
  E.NET.duelist = { ser: (q, o) => { o.wh = q.who; o.am2 = Math.round((q.aim || 0) * 100) / 100; }, app: (e, o) => { e.who = o.wh; e.aim = o.am2; } };
  E.DRAW.duelist = (e, ctx, ox, oy, t, g, introY, fl) => { if (DW.drawDuelist) DW.drawDuelist(ctx, e, e.x - ox, e.y - oy + introY, t, fl); };
  DW.DUEL = DUEL;
})();
