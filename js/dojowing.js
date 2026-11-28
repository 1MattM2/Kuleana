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
      props: [{ k: "duelring", x: 10, y: 7.2 }, { k: "kapabanner", x: 4.5, y: 3 }, { k: "kapabanner", x: 16.5, y: 3 }, { k: "lectern", x: 10, y: 3.4, hall: "duel" }, { k: "brazier", x: 3, y: 3.6 }, { k: "brazier", x: 17, y: 3.6 }, { k: "brazier", x: 3, y: 10.4 }, { k: "brazier", x: 17, y: 10.4 }] };
  }
  // the Arena Wing: a hallway east from the hall; the Creature Hall opens off it to the north, and the
  // Boss Hall stands at its end
  {
    const g = grid(46, 31);
    fill(g, 0, 15, 26, 18, "w");               // the hallway
    fill(g, 4, 3, 21, 12, "%"); fill(g, 11, 13, 14, 14, "w");     // the Creature Hall and its door
    fill(g, 27, 4, 44, 27, "%");               // the Boss Hall
    const props = [{ k: "lectern", x: 12.5, y: 3.4, hall: "beasts" }, { k: "lectern", x: 36, y: 4.4, hall: "bosses" }, { k: "brazier", x: 1.5, y: 15.4 }, { k: "brazier", x: 25, y: 15.4 }, { k: "brazier", x: 10.2, y: 13.4 }, { k: "brazier", x: 15.8, y: 13.4 }];
    // kapa banners here and there along the walls: the hallway, and either side of each hall's lectern
    for (const [bx, by] of [[4.5, 15], [9.5, 15], [19.5, 15], [7.5, 3], [17.5, 3], [31.5, 4], [40.5, 4]]) props.push({ k: "kapabanner", x: bx, y: by });
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
  // a kapa banner hung on the wall face, as in the main hall: cream bark cloth on a koa rod, rows of
  // triangles (niho) in black and red, a dark line under each, a fringe that stirs now and then.
  // p.y is the foot of the wall it hangs on.
  let bannerArt = null;
  function makeBanner() {
    const w = 17, h = 24, [c, x] = K.canvas(w + 4, h + 6), put = (a, b, ww, hh, col) => { x.fillStyle = col; x.fillRect(a, b, ww, hh); };
    put(0, 0, w + 4, 3, "#1e100a"); put(1, 1, w + 2, 1, "#8a5430");                           // the rod
    put(1, 3, w + 2, h, "#1e100a"); put(2, 3, w, h - 1, "#e8d8b8"); put(2, 3, w, 1, "#c8b494");   // the cloth, shaded under the rod
    for (let band = 0; band < 3; band++) {
      const by = 5 + band * 7, col = band % 2 ? "#8a2a1a" : "#2a1a14";
      for (let k = 0; k < 3; k++) { const tx = 3 + k * 5; put(tx + 2, by, 1, 1, col); put(tx + 1, by + 1, 3, 1, col); put(tx, by + 2, 5, 1, col); }
      put(3, by + 4, w - 2, 1, "#2a1a14");
    }
    put(w + 1, 4, 1, h - 2, "#c8b494");                                                       // the shaded right edge
    return (bannerArt = { c, w, h });
  }
  H.kapabanner = (p, L, o, x, y) => {
    const FACE = L.def.wallFace || 30;
    o.ground = true;
    o.draw = (ctx, ox, oy, t) => {
      const B = bannerArt || makeBanner(), X = Math.round(x - ox - (B.w + 4) / 2), Y = Math.round(y - oy - FACE + 2);
      ctx.drawImage(B.c, X, Y);
      for (let k = 0; k < B.w; k += 3) { const stir = Math.sin(t * 1.3 + k * 0.7 + x) > 0.85 ? 1 : 0; ctx.fillStyle = "#2a1a14"; ctx.fillRect(X + 2 + k + stir, Y + 3 + B.h, 2, 2); }
    };
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
  // Each challenger is a real fight: plenty of health, blows that cost hearts, poise (only a flurry of hits
  // staggers them), a counter after every dodge or guard, a lunge to close the distance, and a second wind
  // at half health (faster, quicker to strike).
  const DUEL = {
    makani: { hp: 560, sp: 132, reach: 24, wind: 0.17, dmg: 1, hits: 4, gap: 0.12, dodge: 0.7, keep: 30, lunge: 1, weapon: "pahoa" },
    kamaka: { hp: 900, sp: 78, reach: 36, wind: 0.46, dmg: 3, hits: 2, gap: 0.22, dodge: 0.12, keep: 34, guard: 1, slam: 1, weapon: "newa" },
    kahu: { hp: 720, sp: 104, reach: 52, wind: 0.32, dmg: 2, hits: 3, gap: 0.2, dodge: 0.4, keep: 54, spin: 1, lunge: 1, weapon: "spear" },
  };
  ST.duelist = { hp: 200, r: 8, mat: "flesh", kb: 30, noStun: true, barY: 40, colors: ["#e8b878", "#a86a3a", "#f4e0c0"] };
  E.SETUP.duelist = (e) => {
    e.who = "makani"; e.face = 1; e.cd = 1; e.poise = 0;
    e.blocks = function (ang) { return DUEL[this.who].guard && this.state === "guard" && Math.cos(ang - (this.face > 0 ? Math.PI : 0)) > 0.3; };
    // a blocked blow is answered at once
    e.onBlock = function () { if (this.state === "guard" && this.st > 0.08) { this.state = "wind"; this.st = DUEL[this.who].wind * 0.45; this.n = 0; this.riposte = 1; } };
    // poise: blows don't interrupt them; three in quick succession stagger them, briefly
    const base = e.onHit;
    e.onHit = function (dmg, ang) {
      const s0 = this.state, st0 = this.st; base.call(this, dmg, ang);
      if (this.state !== s0) { this.state = s0; this.st = st0; }
      this.poise = (this.poise || 0) + 1; this.poiseT = 1.4;
      if (this.poise >= 3 && !(this.poiseCd > 0)) { this.stun = 0.35; this.poise = 0; this.poiseCd = 2.2; if (this.state !== "roll") { this.state = "stalk"; this.st = 0; } this.cd = Math.min(this.cd, 0.25); }
    };
  };
  DW.makeDuelist = (L, who, x, y) => { const e = E.spawn("duelist", x, y, 0, L); const C = DUEL[who]; e.who = who; e.hp = e.max = Math.round(C.hp * (E.hpScale || 1)); e.alerted = true; e.enter = "leap"; e.introT = 0.9; L.enemies.push(e); return e; };
  AI.duelist = function (e, dt, t, P, L, api, d) {
    const C0 = DUEL[e.who], toP = Math.atan2(P.y - e.y, P.x - e.x);
    // the second wind: below half health they fight faster
    if (!e.second && e.hp < e.max / 2) { e.second = true; L.banner = { title: "SECOND WIND", sub: "Your challenger fights harder", t0: t }; L0.sfx(api, "warcry"); e.state = "stalk"; e.cd = 0; }
    const C = e.second ? { ...C0, sp: C0.sp * 1.2, wind: C0.wind * 0.78, dodge: C0.dodge * 1.25, hits: C0.hits + 1 } : C0;
    e.cd -= dt; e.untouchable = e.state === "roll";
    e.poiseT = (e.poiseT || 0) - dt; if (e.poiseT <= 0) e.poise = 0; e.poiseCd = (e.poiseCd || 0) - dt;
    if (e.state !== "roll" && e.state !== "strike" && e.state !== "lunge") e.face = Math.cos(toP) >= 0 ? 1 : -1;
    const mv = (a, sp) => { e.moving = L0.tryMove(e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt); };
    const hitArc = (reach, dmg, cone) => { for (const q of E.alive || []) { const k = q.isRemote ? "r" + q.slot : "l"; if (e.hitSet[k]) continue; const dq = Math.hypot(q.x - e.x, q.y - e.y); if (dq < reach && Math.abs(L0.angDiff(Math.atan2(q.y - e.y, q.x - e.x), e.aim)) < cone && q._api.hurt(dmg, e.x, e.y, "duel")) e.hitSet[k] = 1; } };
    if (e.state === "idle" || e.state === "stalk" || e.state === "guard") {
      if (e.state === "idle") e.state = "stalk";
      // a hero swinging close: slip aside (or raise the guard)
      if (P.attacking && d < 56 && Math.random() < dt * 7 * C.dodge && e.state !== "guard") { e.state = "roll"; e.st = 0; e.rollA = toP + Math.PI + (Math.random() < 0.5 ? 1 : -1) * 1.1; L0.sfx(api, "hop"); return; }
      if (C.guard && P.attacking && d < 64) { if (e.state !== "guard") { e.state = "guard"; e.st = 0; } }
      if (e.state === "guard") { e.moving = false; if (e.st > 0.6) { e.state = "stalk"; e.cd = Math.min(e.cd, 0.15); } return; }
      const want = d > C.keep + 14 ? toP : d < C.keep - 10 ? toP + Math.PI : toP + Math.PI / 2 * (Math.sin(t * 0.9 + e.ph) > 0 ? 1 : -1);
      mv(want, d > C.keep + 14 ? C.sp : C.sp * 0.6);
      if (e.cd <= 0 && d < C.reach + 16) { e.state = C.spin && Math.random() < 0.35 ? "windSpin" : C.slam && Math.random() < 0.4 ? "windSlam" : "wind"; e.st = 0; e.aim = toP; e.n = 0; L0.sfx(api, "warcry"); }
      else if (C.lunge && e.cd <= 0 && d > C.reach + 30 && d < C.reach + 120 && Math.random() < dt * 3) { e.state = "windLunge"; e.st = 0; e.aim = toP; L0.sfx(api, "inhale"); }
    } else if (e.state === "roll") {
      mv(e.rollA, 230 * (1 - e.st / 0.3));
      // out of the roll straight into a counter
      if (e.st > 0.3) { if (d < C.reach + 40) { e.state = "wind"; e.st = C.wind * 0.4; e.aim = toP; e.n = 0; } else { e.state = "stalk"; e.st = 0; e.cd = Math.min(e.cd, 0.2); } }
    }
    else if (e.state === "wind") { e.aim += L0.angDiff(toP, e.aim) * Math.min(1, dt * 7); if (e.st > C.wind) { e.state = "strike"; e.st = 0; e.hitSet = {}; e.n++; L0.sfx(api, "slash"); } }
    else if (e.state === "strike") {
      mv(e.aim, 170 * Math.max(0, 1 - e.st / 0.14));
      hitArc(C.reach + 9, C.dmg + (e.riposte ? 1 : 0), 0.95);
      if (e.st > 0.17) { e.riposte = 0; if (e.n < C.hits) { e.state = "wind"; e.st = C.wind - C.gap; } else { e.state = "stalk"; e.st = 0; e.cd = (0.45 + Math.random() * 0.55) * (e.second ? 0.7 : 1); } }
    } else if (e.state === "windLunge") { e.aim += L0.angDiff(toP, e.aim) * Math.min(1, dt * 5); if (e.st > 0.34 * (e.second ? 0.8 : 1)) { e.state = "lunge"; e.st = 0; e.hitSet = {}; L0.sfx(api, "spearSweep"); } }
    else if (e.state === "lunge") {
      // a long dash with the blade out in front
      mv(e.aim, 330 * Math.max(0.2, 1 - e.st / 0.3)); hitArc(C.reach + 6, C.dmg + 1, 0.7);
      if (e.st > 0.3) { if (d < C.reach + 16) { e.state = "wind"; e.st = C.wind * 0.5; e.aim = toP; e.n = Math.max(0, C.hits - 2); } else { e.state = "stalk"; e.cd = 0.5; } }
    } else if (e.state === "windSpin") { if (e.st > 0.5 * (e.second ? 0.8 : 1)) { e.state = "spin"; e.st = 0; e.hitSet = {}; e.spins = e.second ? 2 : 1; L0.sfx(api, "spearSweep"); } }
    else if (e.state === "spin") {
      mv(toP, 60);
      for (const q of E.alive || []) { const k = q.isRemote ? "r" + q.slot : "l"; if (!e.hitSet[k] && Math.hypot(q.x - e.x, q.y - e.y) < C.reach + 4 && q._api.hurt(2, e.x, e.y, "duel")) e.hitSet[k] = 1; }
      if (e.st > 0.35) { if (--e.spins > 0) { e.st = 0; e.hitSet = {}; L0.sfx(api, "spearSweep"); } else { e.state = "stalk"; e.cd = 0.6 + Math.random() * 0.6; } }
    }
    else if (e.state === "windSlam") { e.aim = toP; if (e.st > 0.6 * (e.second ? 0.8 : 1)) { e.state = "slam"; e.st = 0; L.fx.push({ kind: "quake", x: e.x + Math.cos(e.aim) * 16, y: e.y + Math.sin(e.aim) * 12, t: 0, dur: 0.5, R: 64, dmg: 2 }); e.after = e.second ? 1 : 0; L0.sfx(api, "stone"); Combat.shake = Math.min(1, Combat.shake + 0.45); } }
    else if (e.state === "slam") { if (e.after && e.st > 0.3) { e.after = 0; L.fx.push({ kind: "quake", x: e.x, y: e.y, t: 0, dur: 0.6, R: 100, dmg: 2 }); L0.sfx(api, "stone"); Combat.shake = Math.min(1, Combat.shake + 0.4); } if (e.st > 0.55) { e.state = "stalk"; e.cd = 0.6 + Math.random() * 0.5; } }
    else { e.state = "stalk"; e.st = 0; }
  };
  E.NET.duelist = { ser: (q, o) => { o.wh = q.who; o.am2 = Math.round((q.aim || 0) * 100) / 100; if (q.second) o.sw = 1; }, app: (e, o) => { e.who = o.wh; e.aim = o.am2; e.second = !!o.sw; } };
  E.DRAW.duelist = (e, ctx, ox, oy, t, g, introY, fl) => { if (DW.drawDuelist) DW.drawDuelist(ctx, e, e.x - ox, e.y - oy + introY, t, fl); };
  DW.DUEL = DUEL;
})();
