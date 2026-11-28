// Creatures of the Archipelago (Zone 2). The tiki spearman and darter carry on from Zone 1; new here:
//
//   crab        - ʻŌhiki, the sand crab (the user's concept sprite): zigzags in, scurries aside from
//                 blows, snips twice. Alone it hunts on its own and burrows to ambush; in a pack the
//                 crabs ring you and strike together from every side
//   spitcrab    - Bubble crab: hangs back with the pack and spits foam; slams its claw when crowded
//   brute       - Tiki brute (concept sprite): a towering carved warrior with stone fists. Paws the
//                 ground and charges to ram you; double-fist ground pounds up close. Darters of his
//                 tribe take cover behind him and lean out to shoot
//   shark       - Reef shark: a silhouette in the water. It circles, lines up (fin up, a wake ahead of
//                 it) and lunges along a straight line, breaking the surface to bite. It leaps narrow
//                 sandbars, and lunges up the beach at heroes near the water, stranding itself
//   bigshark    - Tiger shark: the big one. Slower, longer lines, two-heart bites
//   tshark      - Thermal shark (by the vents): big and hot; its lunges leave the water boiling and it
//                 scalds the water ahead of it in a line of steam
//   ray         - Stingray: a gliding silhouette. Rings of lightning through the water, and an arc of
//                 current at anyone standing on the shore nearby
//   pueo        - Pueo: a great horned cliff owl. Spotting you, it flies over and drops a stone, then
//                 stays close, circling and swooping; a flock bombs and swoops together
//   spidercrab  - Pāpaʻi-Loa, the giant spider crab (boss, the Coral Atolls): stilt legs that stab,
//                 a long claw that sweeps, a sideways trampling scuttle, foam, and a call to the crabs
//   giantray    - Kai-Uila, the Storm Ray (boss, the Thermal Cliffs): one great ray made of many small
//                 ray silhouettes, rimmed with lightning. Storm rings, called bolts, a lightning field,
//                 sweeping glides; it breaks apart to swarm you and gathers itself again
//
// Sea creatures (sharks, rays, the Storm Ray) can be struck only by a hero standing in the water
// (Combat.immune checks e.aquatic). A stranded shark can be struck by anyone.
(function () {
  const E = window.Enemies, L0 = E.lib, AI = E.AI, ST = E.STATS;
  const { Surface, begin, mark, flush, tryMove, telegraph, tinted, glow, rnd, dist, angDiff, TAU, css, R } = L0;
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
  const wetAt = (x, y) => (Level.waterAt && Level.waterAt(x, y)) || 0;
  const img = (k) => L0.assets().img[k];
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
    for (let k = 0; k < 9; k++) { const a = want + (k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.45), fx = e.x + Math.cos(a) * 26, fy = e.y + Math.sin(a) * 26; if (kinds.includes(wetAt(fx, fy))) { want = a; break; } }
    e.va += angDiff(want, e.va) * Math.min(1, dt * (turn || 3));
    const moved = swim(e, Math.cos(e.va) * sp * dt, Math.sin(e.va) * sp * dt, kinds);
    if (!moved) e.va += Math.PI * (0.4 + Math.random() * 0.3);
    return moved;
  }
  // what lies along a line: how much land it crosses, and whether it ends in water
  function lineInfo(x0, y0, x1, y1, kinds) {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 5)); let land = 0, run = 0, maxRun = 0, wall = false;
    for (let k = 1; k <= n; k++) { const x = x0 + ((x1 - x0) * k) / n, y = y0 + ((y1 - y0) * k) / n, w = wetAt(x, y); if (Level.tileAt(x, y) === Level.T_.WALL || Level.solidAt(x, y) && !w) wall = true; if (kinds.includes(w)) { run = 0; } else { land += 5; run += 5; maxRun = Math.max(maxRun, run); } }
    return { land, maxRun, endsWet: kinds.includes(wetAt(x1, y1)), wall };
  }

  // ================================================================== effects (host makes them; everyone draws them)
  E.FX.zap = {   // an electric ring spreading through the water
    hit(r, q, t, key) { r.hits = r.hits || {}; if (r.t < 0) return; const rad = (r.t / r.dur) * r.R; if (!r.hits[key] && Math.abs(Math.hypot(q.x - r.x, (q.y - 4 - r.y) / 0.7) - rad) < 8) { if (q._api.hurt(r.dmg || 1, r.x, r.y, "zap")) r.hits[key] = 1; } },
    draw(ctx, r, ox, oy, t) {
      if (r.t < 0) return;
      const u = r.t / r.dur, rad = u * r.R, n = Math.max(24, rad * 1.4 | 0);
      for (let k = 0; k < n; k++) { const a = (k / n) * TAU, j = (K.hash2(k, (t * 20) | 0, 7) - 0.5) * 5; ctx.fillStyle = k % 3 ? `rgba(160,220,255,${(1 - u) * 0.9})` : `rgba(255,255,255,${1 - u})`; ctx.fillRect(Math.round(r.x - ox + Math.cos(a) * (rad + j)), Math.round(r.y - oy + Math.sin(a) * (rad + j) * 0.7), 2, 1); }
    },
  };
  // an electric discharge: everything in the area is struck at once. Forked lightning crawls out from the
  // centre to the edge and over the water, flickering, and fades.
  E.FX.shock = {
    hit(r, q, t, key) { if (r.t < 0 || r.t > 0.12) return; r.hits = r.hits || {}; if (!r.hits[key] && Math.hypot(q.x - r.x, (q.y - 4 - r.y) / 0.7) < r.R) { if (q._api.hurt(r.dmg || 1, r.x, r.y, "zap")) r.hits[key] = 1; } },
    draw(ctx, r, ox, oy, t) {
      if (r.t < 0) return;
      const u = r.t / r.dur, X = r.x - ox, Y = r.y - oy, fr = (t * 30) | 0, life = 1 - u;
      // the charged water: a pale field, brightest in the first instant
      ctx.fillStyle = `rgba(150,210,255,${0.38 * life + (r.t < 0.08 ? 0.35 : 0)})`; ctx.beginPath(); ctx.ellipse(Math.round(X), Math.round(Y), r.R, r.R * 0.7, 0, 0, TAU); ctx.fill();
      // forks: jagged walks from the centre outward, re-struck every frame
      const n = Math.round(9 * life) + 3;
      for (let k = 0; k < n; k++) {
        let a = K.hash2(k, fr, 3) * TAU, px0 = X, py0 = Y; const len = r.R * (0.55 + K.hash2(k, fr, 4) * 0.5), steps = 9;
        for (let s2 = 1; s2 <= steps; s2++) {
          a += (K.hash2(k, fr * 13 + s2, 5) - 0.5) * 1.3; const d2 = (len / steps), nx = px0 + Math.cos(a) * d2, ny = py0 + Math.sin(a) * d2 * 0.7;
          const m = Math.max(Math.abs(nx - px0), Math.abs(ny - py0)) | 0;
          for (let i = 0; i <= m; i++) { const fx = px0 + (nx - px0) * (i / (m || 1)), fy = py0 + (ny - py0) * (i / (m || 1)); ctx.fillStyle = s2 < 3 || K.hash2(i, k, fr) > 0.7 ? `rgba(255,255,255,${life})` : `rgba(140,210,255,${life})`; ctx.fillRect(Math.round(fx), Math.round(fy), life > 0.5 ? 2 : 1, 1); }
          if (s2 === 5 && K.hash2(k, fr, 6) > 0.5) { let bx = nx, by = ny, ba = a + (K.hash2(k, fr, 7) > 0.5 ? 0.9 : -0.9); for (let b2 = 0; b2 < 6; b2++) { bx += Math.cos(ba) * 2; by += Math.sin(ba) * 1.4; ba += (K.hash2(b2, k, fr) - 0.5); ctx.fillStyle = `rgba(160,220,255,${life * 0.9})`; ctx.fillRect(Math.round(bx), Math.round(by), 1, 1); } }
          px0 = nx; py0 = ny;
        }
      }
      // sparks spitting up off the surface
      for (let k = 0; k < 14 * life; k++) { const a = K.hash2(k, fr, 8) * TAU, rr = r.R * K.hash2(k, fr, 9); ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(X + Math.cos(a) * rr), Math.round(Y + Math.sin(a) * rr * 0.7 - K.hash2(k, fr, 10) * 6), 1, 2); }
    },
  };
  E.FX.bolt = {   // a called bolt: a flickering mark along its line, then the strike
    hit(r, q, t, key) {
      if (r.t < r.dur - 0.18) return; r.hits = r.hits || {}; if (r.hits[key]) return;
      const dx = r.x2 - r.x, dy = r.y2 - r.y, l2 = dx * dx + dy * dy || 1, u = Math.max(0, Math.min(1, ((q.x - r.x) * dx + (q.y - 8 - r.y) * dy) / l2));
      if (Math.hypot(r.x + dx * u - q.x, r.y + dy * u - (q.y - 8)) < 10 && q._api.hurt(r.dmg || 1, r.x2, r.y2, "bolt")) r.hits[key] = 1;
    },
    draw(ctx, r, ox, oy, t) {
      if (r.t < 0) return;
      const live = r.t >= r.dur - 0.18, n = Math.ceil(Math.hypot(r.x2 - r.x, r.y2 - r.y) / 3);
      for (let k = 0; k <= n; k++) {
        const u = k / n, j = live ? (K.hash2(k, (t * 30) | 0, 3) - 0.5) * 8 : 0, x = r.x + (r.x2 - r.x) * u - ox, y = r.y + (r.y2 - r.y) * u - oy;
        if (!live) { if ((k + ((t * 16) | 0)) % 3) continue; ctx.fillStyle = "rgba(170,220,255,0.7)"; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); continue; }
        ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(x + j), Math.round(y), 2, 2); ctx.fillStyle = "rgba(140,200,255,0.8)"; ctx.fillRect(Math.round(x + j + 2), Math.round(y + 1), 1, 1);
      }
    },
  };
  // lightning from the sky onto a marked spot: a ring tightens, then the strike
  E.FX.strike = {
    hit(r, q, t, key) { if (r.t < r.dur - 0.12 || r.t > r.dur) return; r.hits = r.hits || {}; if (!r.hits[key] && Math.hypot(q.x - r.x, (q.y - r.y) / 0.7) < r.R && q._api.hurt(r.dmg || 1, r.x, r.y, "bolt")) r.hits[key] = 1; },
    draw(ctx, r, ox, oy, t) {
      if (r.t < 0) return;
      const x = Math.round(r.x - ox), y = Math.round(r.y - oy), u = Math.min(1, r.t / (r.dur - 0.12));
      if (r.t < r.dur - 0.12) { ctx.strokeStyle = `rgba(170,225,255,${0.4 + 0.5 * Math.sin(t * 30)})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, r.R * (1.4 - u * 0.4), r.R * 0.7 * (1.4 - u * 0.4), 0, 0, TAU); ctx.stroke(); return; }
      let lx = x; for (let yy = y - 120; yy < y; yy += 3) { lx += Math.round((K.hash2(yy, (t * 40) | 0, 5) - 0.5) * 5); ctx.fillStyle = "#ffffff"; ctx.fillRect(lx, yy, 2, 3); ctx.fillStyle = "rgba(140,200,255,0.8)"; ctx.fillRect(lx + 2, yy, 1, 3); }
      for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; ctx.fillStyle = "rgba(220,245,255,0.9)"; ctx.fillRect(Math.round(x + Math.cos(a) * r.R), Math.round(y + Math.sin(a) * r.R * 0.7), 2, 1); }
    },
  };
  E.FX.rock = {   // a falling stone: its shadow grows (and follows its target until the last moment), then it lands
    hit(r, q, t, key) {
      if (r.tk && r.tk === key && r.t < r.dur - 0.38) { const dx = q.x - r.x, dy = q.y - r.y, l = Math.hypot(dx, dy), m = Math.min(l, (r.trk || 90) * (1 / 60)); if (l > 0.5) { r.x += (dx / l) * m; r.y += (dy / l) * m; } }
      if (r.t < r.dur - 0.12 || r.t > r.dur - 0.02) return; r.hits = r.hits || {}; if (!r.hits[key] && Math.hypot(q.x - r.x, (q.y - r.y) / 0.7) < r.R && q._api.hurt(r.dmg || 1, r.x, r.y - 20, "rock")) r.hits[key] = 1;
    },
    draw(ctx, r, ox, oy, t) {
      if (r.t < 0) return;
      const u = Math.min(1, r.t / (r.dur - 0.1)), x = Math.round(r.x - ox), y = Math.round(r.y - oy), hot = r.hot, big = r.R >= 20;
      ctx.fillStyle = `rgba(10,12,16,${0.15 + u * 0.4})`; ctx.beginPath(); ctx.ellipse(x, y, r.R * (0.4 + u * 0.6), r.R * 0.45 * (0.4 + u * 0.6), 0, 0, TAU); ctx.fill();
      if (r.t > r.dur - 0.38) { ctx.strokeStyle = `rgba(255,${120 + 100 * Math.sin(t * 30) | 0},80,0.8)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, r.R, r.R * 0.6, 0, 0, TAU); ctx.stroke(); }
      if (r.t > r.dur - 0.5 && r.t < r.dur) {
        const fall = (r.dur - r.t) / 0.5, ry = y - fall * 90, OB = R().obsidian;
        if (big) { px(ctx, x - 8, ry - 13, 17, 13, rgb(OB[0])); px(ctx, x - 7, ry - 12, 15, 11, rgb(hot ? R().fire[2] : OB[3])); px(ctx, x - 6, ry - 12, 9, 3, rgb(hot ? R().fire[4] : OB[5])); px(ctx, x - 7, ry - 9, 3, 2, rgb(OB[4])); px(ctx, x + 3, ry - 6, 4, 4, rgb(OB[1])); px(ctx, x - 3, ry - 4, 3, 2, rgb(OB[2])); px(ctx, x + 5, ry - 11, 2, 2, rgb(OB[2])); }
        else { px(ctx, x - 3, ry - 6, 7, 6, rgb(hot ? R().fire[2] : OB[3])); px(ctx, x - 2, ry - 6, 3, 2, rgb(hot ? R().fire[4] : OB[5])); px(ctx, x + 2, ry - 2, 2, 2, rgb(OB[1])); }
      }
      if (big && r.t >= r.dur - 0.06) for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; ctx.fillStyle = k % 2 ? "#8a7a6a" : "#d8c8b0"; ctx.fillRect(Math.round(x + Math.cos(a) * r.R * 0.8), Math.round(y + Math.sin(a) * r.R * 0.5), 2, 2); }
    },
  };
  E.FX.quake = {   // a ring of cracking ground
    hit(r, q, t, key) { r.hits = r.hits || {}; const rad = (r.t / r.dur) * r.R; if (!r.hits[key] && Math.abs(Math.hypot(q.x - r.x, (q.y - r.y) / 0.7) - rad) < 9 && q._api.hurt(r.dmg || 2, r.x, r.y, "quake")) r.hits[key] = 1; },
    draw(ctx, r, ox, oy) { const u = r.t / r.dur, rad = u * r.R; for (let k = 0; k < 40; k++) { const a = (k / 40) * TAU; ctx.fillStyle = k % 2 ? `rgba(90,70,60,${1 - u})` : `rgba(230,210,170,${1 - u})`; ctx.fillRect(Math.round(r.x - ox + Math.cos(a) * rad), Math.round(r.y - oy + Math.sin(a) * rad * 0.7), 2, 2); } },
  };
  E.FX.boil = {    // water boiling where a thermal shark has been
    hit(r, q, t, key) { r.hitT = r.hitT || {}; if (r.t > 0.2 && Math.hypot(q.x - r.x, (q.y - r.y) / 0.7) < r.R && t - (r.hitT[key] ?? -9) > 0.8 && q._api.hurt(1, r.x, r.y, "boil")) r.hitT[key] = t; },
    draw(ctx, r, ox, oy, t) { if (r.t < 0) return; const life = Math.min(1, (r.dur - r.t) / 0.5, r.t / 0.2); for (let k = 0; k < 7; k++) { const ph = (t * 1.5 + k * 0.37) % 1, a = k * 2.2 + r.x; ctx.fillStyle = `rgba(255,${200 - ph * 80 | 0},150,${life * (1 - ph)})`; ctx.fillRect(Math.round(r.x + Math.cos(a) * r.R * 0.6 - ox), Math.round(r.y + Math.sin(a) * r.R * 0.4 - ph * 4 - oy), 2, 1); } },
  };
  // a geyser of scalding steam out of the water. Warning (WARN s): the water boils in a ring that tightens,
  // glowing orange beneath; then the column bursts up: a white-hot core in a churning sheath of steam,
  // billows rolling off its crown and drifting downwind, scalding droplets raining back down.
  const WARN = 0.4;
  E.FX.scald = {
    hit(r, q, t, key) { if (r.t < WARN || r.t > WARN + 0.5) return; r.hits = r.hits || {}; if (!r.hits[key] && Math.hypot(q.x - r.x, (q.y - r.y) / 0.7) < r.R && q._api.hurt(r.dmg || 2, r.x, r.y, "steam")) r.hits[key] = 1; },
    draw(ctx, r, ox, oy, t) {
      if (r.t < 0) return;
      const x = Math.round(r.x - ox), y = Math.round(r.y - oy), seed = (r.x * 7 + r.y * 13) % 97;
      if (r.t < WARN) {
        const u = r.t / WARN, rr = r.R * (1.25 - u * 0.35);
        ctx.fillStyle = `rgba(255,120,40,${0.18 + u * 0.32})`; ctx.beginPath(); ctx.ellipse(x, y, rr, rr * 0.6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(255,200,120,${0.25 + u * 0.4})`; ctx.beginPath(); ctx.ellipse(x, y, rr * 0.45, rr * 0.27, 0, 0, TAU); ctx.fill();
        for (let k = 0; k < 14; k++) { const a = k * 2.399 + seed, ph = (t * 3 + k * 0.29) % 1, d2 = rr * (0.3 + 0.7 * ((k * 0.37) % 1)); ctx.fillStyle = ph < 0.7 ? "rgba(255,240,220,0.9)" : "rgba(255,170,90,0.9)"; ctx.fillRect(Math.round(x + Math.cos(a) * d2), Math.round(y + Math.sin(a) * d2 * 0.6 - ph * 4), ph > 0.8 ? 2 : 1, 1); }
        ctx.strokeStyle = `rgba(255,${150 + 90 * Math.sin(t * 34) | 0},80,0.95)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, rr, rr * 0.6, 0, 0, TAU); ctx.stroke();
        return;
      }
      const tt = r.t - WARN, rise = Math.min(1, tt / 0.12), fade = Math.max(0, Math.min(1, 1 - (tt - 0.55) / (r.dur - WARN - 0.55))), H2 = 46 * rise;
      // (drawn with fixed colours under one alpha, two rows at a time: cheap enough for a dozen at once)
      ctx.globalAlpha = fade;
      ctx.fillStyle = "rgba(255,150,70,0.35)"; ctx.fillRect(x - r.R, y - 4, r.R * 2, 8);
      // the column: a churning sheath, wider as it climbs, a hot core while it's at full force
      for (let yy = 0; yy < H2; yy += 2) {
        const f = yy / 46, w = 3 + f * 7 + Math.sin(yy * 0.55 - t * 28 + seed) * 1.6 + Math.sin(yy * 0.21 + t * 11) * 1.2;
        ctx.fillStyle = "#ece8e2"; ctx.fillRect(Math.round(x - w), y - yy - 2, Math.round(w * 2), 2);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(x - w * 0.55 + Math.sin(yy * 0.4 - t * 20)), y - yy - 2, Math.max(1, Math.round(w * 0.7)), 2);
        if (tt < 0.5 && f < 0.75) { ctx.fillStyle = f < 0.4 ? "#ffbe78" : "#ffd8a8"; ctx.fillRect(Math.round(x - 1 - w * 0.15), y - yy - 2, Math.max(2, Math.round(w * 0.3)), 2); }
      }
      // billows rolling off the crown and drifting away
      for (let k = 0; k < 5; k++) {
        const ph = (tt * 1.6 + k / 5) % 1, a = k * 1.7 + seed, bx = Math.round(x + Math.cos(a) * (4 + ph * 16) + ph * 10), by = Math.round(y - H2 + 4 - ph * 16), br = Math.round(3 + ph * 6);
        ctx.globalAlpha = fade * (1 - ph) * 0.75; ctx.fillStyle = "#f0ece8"; ctx.fillRect(bx - br, by - br + 1, br * 2, br * 2 - 2); ctx.fillRect(bx - br + 1, by - br, br * 2 - 2, br * 2);
        ctx.fillStyle = "#ffffff"; ctx.fillRect(bx - br + 1, by - br + 1, br, br - 1);
      }
      ctx.globalAlpha = fade;
      // scalding droplets thrown out and falling back
      for (let k = 0; k < 8; k++) { const ph = (tt * 1.3 + k * 0.125) % 1, a = k * 0.78 + seed, h = H2 * 0.8 * (4 * ph * (1 - ph)); ctx.fillStyle = k % 3 ? "#ffd6aa" : "#ff8c3c"; ctx.fillRect(Math.round(x + Math.cos(a) * 22 * ph), Math.round(y + Math.sin(a) * 6 * ph - h), 1, 2); }
      // the spray ring where it breaks the surface
      if (tt < 0.3) { ctx.fillStyle = "#fff6ec"; for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU, rr = r.R * (0.6 + tt * 3); ctx.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y + Math.sin(a) * rr * 0.6), 2, 1); } }
      ctx.globalAlpha = 1;
    },
  };
  E.FX.mark = {   // where something is about to come down
    draw(ctx, r, ox, oy, t) { if (r.t < 0) return; const u = r.t / r.dur; ctx.strokeStyle = `rgba(255,${120 + 100 * Math.sin(t * 20) | 0},80,0.85)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(Math.round(r.x - ox) + 0.5, Math.round(r.y - oy) + 0.5, r.R * (1.2 - u * 0.2), r.R * 0.7 * (1.2 - u * 0.2), 0, 0, TAU); ctx.stroke(); },
  };
  // the spider crab's leg coming down like a spear
  E.FX.stab = {
    hit(r, q, t, key) { if (r.t < r.dur - 0.1 || r.t > r.dur) return; r.hits = r.hits || {}; if (!r.hits[key] && Math.hypot(q.x - r.x, (q.y - r.y) / 0.7) < r.R && q._api.hurt(r.dmg || 2, r.x, r.y - 10, "stab")) r.hits[key] = 1; },
    draw(ctx, r, ox, oy, t) {
      if (r.t < 0) return;
      const x = Math.round(r.x - ox), y = Math.round(r.y - oy), u = Math.min(1, r.t / (r.dur - 0.1));
      ctx.strokeStyle = `rgba(255,${150 + 90 * Math.sin(t * 25) | 0},90,0.9)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x + 0.5, y + 0.5, r.R * (1.3 - u * 0.3), r.R * 0.7 * (1.3 - u * 0.3), 0, 0, TAU); ctx.stroke();
      if (r.t >= r.dur - 0.1) for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; ctx.fillStyle = k % 2 ? "#e8d0a0" : "#fff4d8"; ctx.fillRect(Math.round(x + Math.cos(a) * r.R * 0.8), Math.round(y + Math.sin(a) * r.R * 0.5), 2, 2); }
    },
  };
  // Foam bubbles that burst into smaller ones. sz 3: a great slow bubble that bursts into three; sz 2: a
  // middling one that bursts into two (or three, from a bubble crab); sz 1: small, quick, the last of them.
  // A bubble bursts when its fuse runs out or when it strikes a wall.
  const BUB = { 3: { r: 11, dr: 7, sp: 52, dmg: 2 }, 2: { r: 8, dr: 4.5, sp: 86, dmg: 1 }, 1: { r: 6, dr: 2.5, sp: 118, dmg: 1 } };
  E.bubble = (L, x, y, a, sz, o) => { const B = BUB[sz], sp = (o && o.sp) || B.sp; const b = { kind: "bubble", sz, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.85, t: 0, life: (o && o.life) || (sz === 1 ? 1.5 : 4), r: B.r, dmg: B.dmg, pop: o && o.pop, kids: o && o.kids, spread: (o && o.spread) || 0.55 }; L.shots.push(b); return b; };
  function burst(s, L, api) {
    if (!(s.sz > 1) || !s.kids) return;
    const a0 = Math.atan2(s.vy, s.vx), n = s.kids, sz = s.sz - 1;
    for (let k = 0; k < n; k++) { const a = a0 + (k - (n - 1) / 2) * s.spread + rnd(-0.08, 0.08); E.bubble(L, s.x, s.y, a, sz, sz > 1 ? { pop: rnd(0.55, 0.75), kids: 2, spread: 0.5 } : null); }
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; Combat.addPart({ x: s.x, y: s.y, vx: Math.cos(a) * 50, vy: Math.sin(a) * 40, drag: 4, life: 0.3, col: k % 2 ? "#e8fbff" : "#9ad8f0", size: 1, kind: "spark" }); }
    if (Math.random() < 0.5) sfx(api, "pop");
  }
  E.SHOT_TICK.bubble = (s, L, dt, api) => {
    if (s.sz === 3) { s.vx *= Math.exp(-dt * 0.3); s.vy *= Math.exp(-dt * 0.3); }
    if (s.pop && s.t > s.pop) { burst(s, L, api); return true; }
    return false;
  };
  E.SHOT_END.bubble = (s, L, api) => { if (s.pop) burst(s, L, api); };
  E.SHOT_DRAW.bubble = (ctx, s, x, y, t) => {
    const B = BUB[s.sz || 2] || BUB[2], ripe = s.pop ? Math.max(0, (s.t - s.pop + 0.25) / 0.25) : 0;
    const r = B.dr * (1 + ripe * 0.18) + Math.sin(t * 8 + s.x * 0.1) * (B.dr > 4 ? 0.7 : 0.3), X = Math.round(x) + 0.5, Y = Math.round(y) + 0.5;
    ctx.fillStyle = `rgba(120,200,235,${0.22 + ripe * 0.2})`; ctx.beginPath(); ctx.ellipse(X, Y, r, r * (1 - Math.sin(t * 9 + s.y) * 0.06), 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = ripe > 0 && Math.sin(t * 40) > 0 ? "rgba(255,255,255,0.95)" : "rgba(215,248,255,0.9)"; ctx.lineWidth = 1; ctx.stroke();
    if (B.dr > 4) { ctx.strokeStyle = "rgba(255,170,220,0.5)"; ctx.beginPath(); ctx.arc(X, Y, r - 1, 0.3, 1.4); ctx.stroke(); ctx.strokeStyle = "rgba(160,255,220,0.45)"; ctx.beginPath(); ctx.arc(X, Y, r - 1, 3.4, 4.3); ctx.stroke(); }
    px(ctx, x - r * 0.45, y - r * 0.5, B.dr > 4 ? 2 : 1, 1, "#ffffff"); if (B.dr > 4) px(ctx, x - r * 0.55, y - r * 0.25, 1, 1, "#ffffff");
  };

  // ================================================================== crabs (the concept's red crab)
  ST.crab = { hp: 34, r: 8, mat: "flesh", kb: 90, barY: 22, colors: ["#e8583a", "#a83020", "#f4c0a0"] };
  ST.spitcrab = { hp: 44, r: 8, mat: "flesh", kb: 70, barY: 24, colors: ["#7a5ad0", "#3a2a80", "#d8d0f4"] };
  // frames from the sprite: legs stepping in turn (left set, right set) and claws snapping shut
  const CRAB = {};
  function crabFrames(kind) {
    if (CRAB[kind]) return CRAB[kind];
    const src = img("e_crab"), W = src.width, H = src.height, [, sx] = K.canvas(W, H); sx.drawImage(src, 0, 0);
    const base = sx.getImageData(0, 0, W, H), d0 = new Uint32Array(base.data.buffer);
    if (kind === "spitcrab") for (let i = 0; i < d0.length; i++) { const v = d0[i]; if (!(v >>> 24)) continue; const r = v & 255, g = (v >>> 8) & 255, b = (v >>> 16) & 255; if (r > g + 20) d0[i] = (255 << 24) | (Math.min(255, r * 0.95 + 20) << 16) | (Math.min(255, g * 0.8 + 30) << 8) | Math.min(255, b * 0.6 + r * 0.45); }
    const mk = (fn) => { const [c, x] = K.canvas(W, H), out = x.createImageData(W, H), d = new Uint32Array(out.data.buffer); for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) { const [sxx, syy] = fn(xx, y); d[y * W + xx] = sxx >= 0 && syy >= 0 && sxx < W && syy < H ? d0[syy * W + sxx] : 0; } x.putImageData(out, 0, 0); return c; };
    const legRow = H * 0.5, clawRow = H * 0.42;
    const f0 = mk((x, y) => [x, y]);
    const fL = mk((x, y) => (y > legRow && x < W * 0.3 ? [x, y + 1] : [x, y]));
    const fR = mk((x, y) => (y > legRow && x > W * 0.7 ? [x, y + 1] : [x, y]));
    const fOpen = mk((x, y) => (y < clawRow ? [x < W / 2 ? x + 1 : x - 1, y + 1] : [x, y]));
    return (CRAB[kind] = { f0, fL, fR, fOpen, W, H });
  }
  // a pack of crabs shares one plan: ring the hero, then all strike at once
  const PACKS = {};
  const packOf = (e, live) => (e.tribe ? live.filter((o) => !o.dead && o.tribe === e.tribe && (o.type === "crab" || o.type === "spitcrab")) : [e]);
  function crabDodge(e, api) {
    // a hero winding up close by: scurry aside, the way a crab does
    if ((e.dodgeCd || 0) > 0) return false;
    for (const q of E.alive || []) {
      const dq = Math.hypot(q.x - e.x, q.y - e.y);
      if (dq < 52 && q.attacking && Math.random() < 0.55) {
        const a = Math.atan2(e.y - q.y, e.x - q.x) + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2;
        e.dash = { a, t: 0.2, sp: 230 }; e.dodgeCd = rnd(1.4, 2.4); sfx(api, "clack"); return true;
      }
    }
    e.dodgeCd = 0.25; return false;
  }
  E.SETUP.crab = E.SETUP.spitcrab = (e) => { e.zig = Math.random() < 0.5 ? 1 : -1; e.zigT = 0; e.cd = rnd(0.6, 1.6); e.dryOnly = true; };   // crabs keep to the sand and the shallows
  AI.crab = function (e, dt, t, P, L, api, d, live) {
    const toP = Math.atan2(P.y - e.y, P.x - e.x), pack = packOf(e, live || []), inPack = pack.length > 1;
    e.untouchable = e.state === "under" || e.state === "rise";
    e.cd -= dt; e.dodgeCd = (e.dodgeCd || 0) - dt; e.dig = (e.dig ?? rnd(3, 5)) - dt;
    if (!e.alerted) { if (e.st > (e.wait || 1)) { e.dash = { a: Math.random() < 0.5 ? 0 : Math.PI, t: rnd(0.15, 0.35), sp: 90 }; e.wait = rnd(0.6, 1.6); e.st = 0; } }
    else if (e.state === "idle" || e.state === "skitter") {
      e.state = "skitter";
      if (e.dash && e.dash.t > 0) { /* finishing a step */ }
      else if (!crabDodge(e, api)) {
        let ring = 0;
        if (inPack) {
          // take a place on a ring round the hero, spread from the others
          const idx = pack.indexOf(e), n = pack.length, P2 = PACKS[e.tribe] || (PACKS[e.tribe] = { next: t + rnd(2, 3), ph: Math.random() * TAU });
          const slotA = P2.ph + (idx / n) * TAU + Math.sin(t * 0.6) * 0.3, R0 = e.type === "spitcrab" ? 90 : 46, gx = P.x + Math.cos(slotA) * R0, gy = P.y + Math.sin(slotA) * R0 * 0.8;
          const ga = Math.atan2(gy - e.y, gx - e.x), gd = Math.hypot(gx - e.x, gy - e.y);
          if (gd > 8) e.dash = { a: ga + e.zig * 0.5, t: rnd(0.16, 0.26), sp: 120 }; else e.dash = { a: toP + Math.PI / 2 * e.zig, t: 0.12, sp: 60 };
          e.zig = -e.zig;
          if (t > P2.next && e.type === "crab") { P2.next = t + rnd(3.2, 4.6); P2.ph = Math.random() * TAU; for (const o of pack) if (o.type === "crab" && (o.state === "skitter" || o.state === "idle") && Math.hypot(o.x - P.x, o.y - P.y) < 90) { o.state = "windPinch"; o.st = -Math.random() * 0.12; o.aim = Math.atan2(P.y - o.y, P.x - o.x); o.dash = null; } sfx(api, "clack"); }
          ring = 1;
        }
        if (!ring) {
          // alone: zigzag in, a diagonal each way in turn
          const lean = d > 40 ? 0.75 : d < 24 ? -0.4 : 0;
          e.dash = { a: toP + e.zig * (Math.PI / 2 - lean), t: rnd(0.22, 0.34), sp: 125 }; e.zig = -e.zig;
          if (d < 32 && e.cd <= 0) { e.state = "windPinch"; e.st = 0; e.dash = null; e.aim = toP; sfx(api, "clack"); }
          else if (e.dig <= 0 && d > 60 && d < 200 && Level.tileAt(e.x, e.y) === Level.T_.SAND) { e.state = "dig"; e.st = 0; e.dash = null; sfx(api, "hop"); }
        }
      }
    } else if (e.state === "windPinch") { e.aim = Math.atan2(P.y - e.y, P.x - e.x); if (e.st > 0.38) { e.state = "pinch"; e.st = 0; e.snips = 2; e.hitSet = {}; } }
    else if (e.state === "pinch") {
      tryMove(e, Math.cos(e.aim) * 190 * dt, Math.sin(e.aim) * 190 * dt);
      hitAny(e, e.x + Math.cos(e.aim) * 7, e.y - 5, 13, 1, e.hitSet, "pinch");
      if (e.st > 0.15) { e.snips--; if (e.snips > 0) { e.st = -0.1; e.hitSet = {}; e.aim = Math.atan2(P.y - e.y, P.x - e.x); sfx(api, "clack"); } else { e.state = "recover"; e.st = 0; e.cd = rnd(1, 1.8); e.dash = { a: e.aim + Math.PI + e.zig * 0.8, t: 0.25, sp: 150 }; } }
    } else if (e.state === "dig") { if (Math.random() < 0.6) Combat.addPart({ x: e.x + rnd(-5, 5), y: e.y, vx: rnd(-40, 40), vy: rnd(-60, -20), g: 220, life: 0.5, col: "#e8d0a0", size: 1, kind: "debris" }); if (e.st > 0.45) { e.state = "under"; e.st = 0; } }
    else if (e.state === "under") {
      const a = Math.atan2(P.y - e.y, P.x - e.x), dd = Math.hypot(P.x - e.x, P.y - e.y);
      if (dd > 6) tryMove(e, Math.cos(a) * 120 * dt, Math.sin(a) * 120 * dt);
      if (dd < 8 || e.st > 1.8) { e.state = "rise"; e.st = 0; }
    } else if (e.state === "rise") { if (e.st > 0.42) { e.state = "pop"; e.st = 0; e.hitSet = {}; hitAny(e, e.x, e.y - 6, 17, 1, e.hitSet, "ambush"); sfx(api, "vineBurst"); for (let k = 0; k < 10; k++) Combat.addPart({ x: e.x, y: e.y, vx: rnd(-70, 70), vy: rnd(-90, -30), g: 240, life: 0.6, col: "#e8d0a0", size: 2, kind: "debris" }); } }
    else if (e.state === "pop") { if (e.st > 0.35) { e.state = "recover"; e.st = 0; e.dig = rnd(5, 8); } }
    else if (e.state === "recover" && e.st > 0.35) { e.state = "skitter"; e.st = 0; }
    if (e.dash && e.dash.t > 0) { e.dash.t -= dt; e.moving = tryMove(e, Math.cos(e.dash.a) * e.dash.sp * dt, Math.sin(e.dash.a) * e.dash.sp * dt); if (!e.moving) { e.dash.t = 0; e.zig = -e.zig; } } else e.moving = e.state === "under";
    if (d > 280) e.alerted = false;
  };
  // ---- bubble crab: hangs back, spits foam, slams when crowded; dodges like its kin
  AI.spitcrab = function (e, dt, t, P, L, api, d, live) {
    const toP = Math.atan2(P.y - e.y, P.x - e.x);
    e.cd -= dt; e.dodgeCd = (e.dodgeCd || 0) - dt;
    if (!e.alerted) { e.moving = false; return; }
    if (e.state === "idle" || e.state === "keep") {
      e.state = "keep";
      if (!(e.dash && e.dash.t > 0) && !crabDodge(e, api)) {
        const want = d < 70 ? toP + Math.PI + e.zig * 0.6 : d > 115 ? toP + e.zig * 0.7 : toP + Math.PI / 2 * e.zig;
        e.dash = { a: want, t: rnd(0.2, 0.32), sp: 80 }; if (Math.random() < 0.4) e.zig = -e.zig;
      }
      if (d < 30 && e.cd <= 0) { e.state = "windSmash"; e.st = 0; e.dash = null; }
      else if (d < 190 && e.cd <= 0) { e.state = "windSpit"; e.st = 0; e.aim = toP; e.dash = null; sfx(api, "inhale"); }
    } else if (e.state === "windSpit") {
      // a spread of foam bubbles that burst, part way to you, into three quick small ones each
      e.aim = toP;
      if (e.st > 0.55) { const n = (Level.cur && Level.cur.def.level) >= 2 ? 3 : 2; for (let k = 0; k < n; k++) { const a = e.aim + (k - (n - 1) / 2) * 0.32; E.bubble(L, e.x, e.y - 10, a, 2, { sp: 92, pop: Math.min(1.1, Math.max(0.45, (d - 30) / 92)) + rnd(-0.08, 0.08), kids: 3, spread: 0.62 }); } sfx(api, "splash"); e.state = "keep"; e.st = 0; e.cd = rnd(1.8, 2.6); }
    }
    else if (e.state === "windSmash") { if (e.st > 0.45) { e.state = "smash"; e.st = 0; L.fx.push({ kind: "quake", x: e.x, y: e.y, t: 0, dur: 0.35, R: 38, dmg: 1 }); sfx(api, "land"); Combat.shake = Math.min(1, Combat.shake + 0.2); } }
    else if (e.state === "smash" && e.st > 0.4) { e.state = "keep"; e.cd = rnd(1.4, 2); }
    if (e.dash && e.dash.t > 0) { e.dash.t -= dt; e.moving = tryMove(e, Math.cos(e.dash.a) * e.dash.sp * dt, Math.sin(e.dash.a) * e.dash.sp * dt); if (!e.moving) { e.dash.t = 0; e.zig = -e.zig; } } else e.moving = false;
  };
  function drawCrabSprite(ctx, e, x, y, t, fl, open, kind, scale) {
    const F = crabFrames(kind), step = e.moving ? Math.sin(t * 28 + e.ph) : 0, fr = open ? F.fOpen : step > 0.3 ? F.fL : step < -0.3 ? F.fR : F.f0, src = fl ? tinted(fr) : fr, s = scale || 1;
    const bob = e.moving ? Math.round(Math.abs(Math.sin(t * 28 + e.ph))) : 0;
    ctx.fillStyle = "rgba(10,12,16,0.3)"; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), F.W * 0.45 * s, 3, 0, 0, TAU); ctx.fill();
    ctx.drawImage(src, Math.round(x - (F.W * s) / 2), Math.round(y - F.H * s + 1 - bob), Math.round(F.W * s), Math.round(F.H * s));
  }
  E.DRAW.crab = function (e, ctx, ox, oy, t, g, introY, fl) {
    const x = e.x - ox, y = e.y - oy + introY;
    if (e.state === "under") { px(ctx, x - 5, y - 2, 10, 2, rgb(R().soil[3])); px(ctx, x - 3, y - 3, 6, 1, rgb(R().glyph[4])); if (Math.random() < 0.5) Combat.addPart({ x: e.x + rnd(-4, 4), y: e.y, vx: rnd(-20, 20), vy: rnd(-30, -10), g: 200, life: 0.3, col: "#e8d0a0", size: 1, kind: "debris" }); return; }
    if (e.state === "rise") { const sh = Math.sin(t * 50) * 1.5; px(ctx, x - 6 + sh, y - 3, 12, 3, rgb(R().glyph[3])); telegraph(ctx, x, y - 14, t); return; }
    drawCrabSprite(ctx, e, x, y, t, fl, e.state === "pinch" || e.state === "pop", "crab");
    if (e.state === "windPinch") telegraph(ctx, x, y - 24, t);
  };
  E.DRAW.spitcrab = function (e, ctx, ox, oy, t, g, introY, fl) {
    const x = e.x - ox, y = e.y - oy + introY;
    drawCrabSprite(ctx, e, x, y, t, fl, e.state === "smash", "spitcrab", 1.1);
    if (e.state === "windSpit") { for (let k = 0; k < 4; k++) { const a = t * 5 + k * 1.6; ctx.strokeStyle = "rgba(230,250,255,0.85)"; ctx.beginPath(); ctx.arc(Math.round(x + Math.cos(a) * 3) + 0.5, Math.round(y - 14 + Math.sin(a) * 1.5) + 0.5, 1.5, 0, TAU); ctx.stroke(); } telegraph(ctx, x, y - 26, t); }
    if (e.state === "windSmash") telegraph(ctx, x, y - 26, t);
  };

  // ================================================================== Tiki brute (the concept's carved giant)
  ST.brute = { hp: 260, r: 14, mat: "wood", kb: 10, noStun: true, big: 10, barY: 66, colors: [css(R().koa[4]), css(R().koa[2]), css(R().palm[3])] };
  E.SETUP.brute = (e) => {
    e.hitSet = {}; e.cd = rnd(1, 2);
    // like the spearmen, he guards: stone fists raised before him turn blows from the front
    e.blocks = function (ang) { return this.state === "guard" && Math.cos(ang - (this.face > 0 ? Math.PI : 0)) > 0.3; };
    e.onBlock = function () { if (this.state === "guard" && this.st > 0.12) { this.state = Math.random() < 0.5 ? "windSlam" : "windHook"; this.st = 0.2; this.aim = this.aim || 0; } };
  };
  AI.brute = function (e, dt, t, P, L, api, d) {
    const toP = Math.atan2(P.y - e.y, P.x - e.x);
    e.cd -= dt; e.moving = false; e.armor = 1;
    if (!e.alerted) return;
    if (e.state !== "charge" && e.state !== "skid" && e.state !== "hook") e.face = Math.cos(e.state === "windCharge" ? e.aim : toP) >= 0 ? 1 : -1;
    if (e.state === "guard") { e.moving = false; if (e.st > 0.75) { e.state = "walk"; e.st = 0; e.cd = Math.min(e.cd, 0.2); } return; }
    if (e.state === "idle" || e.state === "walk") {
      e.state = "walk";
      // a hero swinging at him up close: up go the fists
      if (P.attacking && d < 60 && Math.random() < dt * 4) { e.state = "guard"; e.st = 0; e.moving = false; return; }
      if (d > 40) e.moving = tryMove(e, Math.cos(toP) * 34 * dt, Math.sin(toP) * 34 * dt);
      if (e.cd <= 0) {
        // close: the double-fist slam or a swinging hook; middle distance: a stepping hook or a heaved
        // chunk of ground; far off (and in sight): the charge
        const see = Level.sight(e.x, e.y - 20, P.x, P.y - 10), r = Math.random();
        if (d < 50) { if (r < 0.55) { e.state = "windSlam"; sfx(api, "warcry"); } else { e.state = "windHook"; e.aim = toP; sfx(api, "inhale"); } e.st = 0.2; e.close = 1; }
        else if (d < 105) { e.state = "windHook"; e.st = 0; e.aim = toP; sfx(api, "inhale"); }
        else if (d < 175 && see && r < 0.7) { e.state = "windToss"; e.st = 0; e.aim = toP; sfx(api, "bruteHeave"); }
        else if (d < 260 && see) { e.state = "windCharge"; e.st = 0; e.aim = toP; sfx(api, "bruteRoar"); }
        else e.cd = 0.4;
      }
    } else if (e.state === "windCharge") {
      // head down, pawing the ground, tracking you until the last moment
      if (e.st < 0.65) e.aim += angDiff(toP, e.aim) * Math.min(1, dt * 5);
      if (Math.random() < 0.35) Combat.addPart({ x: e.x - Math.cos(e.aim) * 10 + rnd(-4, 4), y: e.y, vx: -Math.cos(e.aim) * rnd(20, 60), vy: rnd(-30, -10), g: 120, life: 0.5, col: css(R().soil[4]), size: 2, kind: "smoke" });
      if (e.st > 0.9) { e.state = "charge"; e.st = 0; e.hitSet = {}; e.dist0 = d; sfx(api, "bruteCharge"); }
    } else if (e.state === "charge") {
      // the ram: straight through, and anything in the way is thrown aside
      const sp = 250 * Math.min(1, 0.4 + e.st * 3);
      e.moving = tryMove(e, Math.cos(e.aim) * sp * dt, Math.sin(e.aim) * sp * dt);
      if (hitAny(e, e.x + Math.cos(e.aim) * 10, e.y - 14, 20, 2, e.hitSet, "ram")) Combat.shake = Math.min(1, Combat.shake + 0.35);
      if (Math.random() < 0.6) Combat.addPart({ x: e.x + rnd(-8, 8), y: e.y, vx: -Math.cos(e.aim) * 40, vy: rnd(-25, -5), g: 30, life: 0.5, col: css(R().soil[4]), size: 2, kind: "smoke" });
      if (!e.moving) { e.state = "stagger"; e.st = 0; Combat.shake = Math.min(1, Combat.shake + 0.5); sfx(api, "stone"); L.fx.push({ kind: "quake", x: e.x + Math.cos(e.aim) * 14, y: e.y, t: 0, dur: 0.4, R: 40, dmg: 1 }); }
      else if (e.st > 1.5 || (e.st > 0.5 && Math.cos(Math.atan2(P.y - e.y, P.x - e.x) - e.aim) < -0.3 && d > 50)) { e.state = "skid"; e.st = 0; }
    } else if (e.state === "skid") { tryMove(e, Math.cos(e.aim) * 120 * (1 - e.st / 0.45) * dt, Math.sin(e.aim) * 120 * (1 - e.st / 0.45) * dt); if (e.st > 0.45) { e.state = "walk"; e.st = 0; e.cd = rnd(1.2, 2); } }
    else if (e.state === "windHook") {
      // the stone fist drawn back across the body
      e.aim += angDiff(toP, e.aim) * Math.min(1, dt * 4); e.face = Math.cos(e.aim) >= 0 ? 1 : -1;
      if (e.st > 0.5) { e.state = "hook"; e.st = 0; e.hitSet = {}; e.hooks = (e.hooks || 0) + 1; sfx(api, "bruteHook"); }
    } else if (e.state === "hook") {
      // a heavy step in and a wide swing of the fist
      const u = Math.min(1, e.st / 0.22);
      tryMove(e, Math.cos(e.aim) * 240 * (1 - u) * dt, Math.sin(e.aim) * 240 * (1 - u) * dt);
      for (const q of E.alive || []) { const k = keyOf(q); if (e.hitSet[k]) continue; const dq = Math.hypot(q.x - e.x, q.y - e.y); if (dq < 50 && Math.abs(angDiff(Math.atan2(q.y - e.y, q.x - e.x), e.aim)) < 1.1 && q._api.hurt(2, e.x, e.y, "fists")) { e.hitSet[k] = 1; Combat.shake = Math.min(1, Combat.shake + 0.3); } }
      // sometimes the other fist follows straight after
      if (e.st > 0.3) { if (e.hooks < 2 && Math.random() < 0.55 && d < 90) { e.state = "windHook"; e.st = 0.3; } else { e.hooks = 0; e.state = "walk"; e.st = 0; e.cd = d < 60 ? rnd(0.45, 0.8) : rnd(1.1, 1.8); } }
    } else if (e.state === "windToss") {
      // tears a slab out of the ground and lifts it overhead, tracking you
      e.aim = toP;
      if (e.st < 0.3 && Math.random() < 0.5) Combat.addPart({ x: e.x + e.face * 8 + rnd(-4, 4), y: e.y, vx: rnd(-30, 30), vy: rnd(-70, -30), g: 240, life: 0.5, col: css(R().soil[4]), size: 2, kind: "debris" });
      if (e.st > 0.75) {
        e.state = "toss"; e.st = 0;
        const lead = Math.min(0.5, d / 260);
        L.fx.push({ kind: "rock", x: P.x + (P.vx || 0) * lead + rnd(-6, 6), y: P.y + (P.vy || 0) * lead + rnd(-4, 4), t: 0, dur: 0.85, R: 20, dmg: 2 });
        sfx(api, "throw");
      }
    } else if (e.state === "toss") { if (e.st > 0.45) { e.state = "walk"; e.st = 0; e.cd = rnd(1.2, 2); } }
    else if (e.state === "windSlam") {
      // at the last moment he lunges in, so a guard raised too late doesn't save you
      if (e.st > 0.42 && d > 22 && d < 110) { const a = Math.atan2(P.y - e.y, P.x - e.x); tryMove(e, Math.cos(a) * 260 * dt, Math.sin(a) * 260 * dt); e.face = Math.cos(a) >= 0 ? 1 : -1; }
      if (e.st > 0.65) { e.state = "slam"; e.st = 0; e.hitSet = {}; hitAny(e, e.x, e.y - 6, 30, 2, e.hitSet, "fists"); L.fx.push({ kind: "quake", x: e.x, y: e.y + 2, t: 0, dur: 0.5, R: 62, dmg: 1 }); sfx(api, "stone"); Combat.shake = Math.min(1, Combat.shake + 0.5); } }
    else if (e.state === "slam") { if (e.st > 0.5) { e.state = "walk"; e.st = 0; e.cd = d < 60 ? rnd(0.5, 0.9) : rnd(1.4, 2.2); } }
    else if (e.state === "stagger") { e.armor = 1.6; if (e.st > 1.4) { e.state = "walk"; e.st = 0; e.cd = 0.8; } }
  };
  // The brute's sprite is split once into body and arms (each arm a cut-out swung from its shoulder), so
  // as he walks his arms swing back and forth in turn, pumping hard when he charges; for his blows the
  // arms take the pose (both raised for the slam, one drawn back for the hook, the slab held overhead).
  let BRUTE = null;
  function bruteParts() {
    if (BRUTE) return BRUTE;
    const src = img("e_brute"), W = src.width, H = src.height, [, sx] = K.canvas(W, H); sx.drawImage(src, 0, 0);
    const d0 = new Uint32Array(sx.getImageData(0, 0, W, H).data.buffer), k = W / 60;
    const armL = (x, y) => (x <= 19 * k && y >= 11 * k && y < 40 * k) || (x <= 16 * k && y >= 40 * k && y <= 51 * k);
    const armR = (x, y) => (x >= 44 * k && y >= 11 * k && y < 40 * k) || (x >= 46 * k && y >= 40 * k && y <= 51 * k);
    const part = (keep) => { const [c, x] = K.canvas(W, H), im = x.createImageData(W, H), o = new Uint32Array(im.data.buffer); for (let y = 0; y < H; y++) for (let xx = 0; xx < W; xx++) if (keep(xx, y)) o[y * W + xx] = d0[y * W + xx]; x.putImageData(im, 0, 0); return c; };
    return (BRUTE = { W, H, body: part((x, y) => !armL(x, y) && !armR(x, y)), L: part(armL), R: part(armR), pL: [14 * k, 15 * k], pR: [47 * k, 15 * k] });
  }
  // the brute's own animation, from the user's concept sheet (frames 64x69, anchored at the feet):
  //   0-5 the walk, 6 stance, 7 wind-up, 8-9 fists raised, 10 the ground strike, 11 recover,
  //   12 step, 13 fist drawn back, 14 the punch into the ground, 15 fists high, 16 stance
  const BA = { W: 64, H: 69 }, bruteFrame = (i) => { const sh = img("e_brute_anim"); if (!sh) return null; const k = "f" + i; if (!BA[k]) { const [c, x] = K.canvas(BA.W, BA.H); x.drawImage(sh, i * BA.W, 0, BA.W, BA.H, 0, 0, BA.W, BA.H); BA[k] = c; } return BA[k]; };
  function bruteAnimFrame(e, t) {
    const st = e.state;
    if (st === "windSlam") { const u = e.st / 0.65; return u < 0.35 ? 7 : u < 0.75 ? 8 : 9; }
    if (st === "slam") return e.st < 0.16 ? 10 : e.st < 0.34 ? 11 : 6;
    if (st === "windHook") return 13;
    if (st === "hook") return e.st < 0.16 ? 14 : 11;
    if (st === "windToss") return e.st < 0.3 ? 8 : 15;
    if (st === "toss") return 11;
    if (st === "guard") return 7;
    if (st === "windCharge") return 7;
    if (e.moving) return Math.floor((e.walkPh || 0) / (Math.PI / 3)) % 6;
    return Math.sin(t * 1.6 + e.ph) > 0.85 ? 16 : 6;
  }
  E.DRAW.brute = function (e, ctx, ox, oy, t, g, introY, fl) {
    if (img("e_brute_anim")) return drawBruteAnim(e, ctx, ox, oy, t, g, introY, fl);
    const B = bruteParts(), x = Math.round(e.x - ox), y = Math.round(e.y - oy + introY), f = e.face;
    const charge = e.state === "charge";
    e.walkPh = (e.walkPh || 0) + (e.moving ? (charge ? 0.32 : 0.13) : 0);
    const step = e.moving ? Math.sin(e.walkPh) : 0, bob = e.moving ? Math.round(Math.abs(step) * (charge ? 3 : 1.5)) : 0;
    // the arms: [angle, lift] each; a positive angle swings an arm out and up from its shoulder
    const sw = e.moving ? step * (charge ? 0.2 : 0.18) : Math.sin(t * 1.4 + e.ph) * 0.03;
    let aL = sw, aR = -sw, lL = -step * (charge ? 1 : 1.2), lR = step * (charge ? 1 : 1.2), sx = 1, sy = 1, lean = 0;
    if (e.state === "windSlam") { const u = Math.min(1, e.st / 0.65); aL = aR = 2.5 * u; lL = lR = -3 * u; sy = 1 + u * 0.05; }
    else if (e.state === "slam") { const u = Math.max(0, 1 - e.st / 0.2); aL = aR = 2.5 * u - 0.15; lL = lR = 2 * (1 - u); sx = 1 + u * 0.1; sy = 1 - u * 0.1; }
    else if (e.state === "windCharge") { const u = Math.min(1, e.st / 0.4); aL = aR = -0.5 * u; lL = lR = 2 * u; sx = 1.04; sy = 0.95; lean = 0.08 * u; }
    else if (charge) lean = 0.14;
    else if (e.state === "windHook") { const u = Math.min(1, e.st / 0.5); aR = -0.9 * u; lR = 2 * u; aL = 0.2 * u; }
    else if (e.state === "hook") { const u = Math.min(1, e.st / 0.14); aR = -0.9 + u * 2.3; lR = -2 * u; aL = 0.2 - u * 0.3; }
    else if (e.state === "windToss") { const u = Math.min(1, e.st / 0.3); aL = aR = 2.8 * u; lL = lR = -4 * u; }
    else if (e.state === "toss") { const u = Math.max(0, 1 - e.st / 0.2); aL = aR = 2.8 * u; }
    else if (e.state === "stagger") { aL = Math.sin(t * 9) * 0.3; aR = -aL; }
    else if (e.state === "guard") { aL = aR = -0.85; lL = lR = -5; sy = 0.97; }          // fists crossed up before his face
    ctx.fillStyle = "rgba(10,12,16,0.38)"; ctx.beginPath(); ctx.ellipse(x, y, 20, 5, 0, 0, TAU); ctx.fill();
    const tint = (c) => (fl ? tinted(c) : c);
    ctx.save(); ctx.translate(x, y - bob); ctx.transform(f * sx, 0, (charge || e.state === "windCharge" ? lean : 0) * f, sy, 0, 0); ctx.translate(-B.W / 2, -B.H + 2);
    ctx.drawImage(tint(B.body), 0, 0);
    for (const [im, p, a, lift, sg] of [[B.L, B.pL, aL, lL, 1], [B.R, B.pR, aR, lR, -1]]) { ctx.save(); ctx.translate(p[0], p[1] + lift); ctx.rotate(a * sg); ctx.drawImage(tint(im), -p[0], -p[1]); ctx.restore(); }
    ctx.restore();
    // the slab held overhead
    if (e.state === "windToss") {
      const u = Math.min(1, e.st / 0.3), OB = R().obsidian, ry = Math.round(y - B.H * sy - 6 - u * 8), rx = x - 10;
      px(ctx, rx + 1, ry - 1, 18, 1, rgb(OB[0])); px(ctx, rx, ry, 20, 10, rgb(OB[0]));
      px(ctx, rx + 1, ry, 18, 9, rgb(OB[4])); px(ctx, rx + 1, ry, 18, 3, rgb(OB[5])); px(ctx, rx + 1, ry + 6, 18, 3, rgb(OB[3]));
      px(ctx, rx + 4, ry + 3, 4, 2, rgb(OB[2])); px(ctx, rx + 12, ry + 5, 3, 2, rgb(OB[2])); px(ctx, rx + 15, ry + 1, 2, 1, rgb(OB[6] || OB[5]));
      for (let k = 0; k < 6; k++) px(ctx, rx + 1 + k * 3, ry - 2 + (k % 2), 2, 2, rgb(R().fern[2 + (k % 2)]));
    }
    // the fist's swing
    if (e.state === "hook" && e.st < 0.2) { const u = e.st / 0.2, a0 = e.aim - 1.1 * f, a1 = a0 + 2.2 * f * u; ctx.fillStyle = "rgba(255,240,210,0.85)"; for (let k = 0; k <= 12; k++) { const a = a0 + (a1 - a0) * (k / 12); ctx.fillRect(Math.round(x + Math.cos(a) * 40), Math.round(y - 16 + Math.sin(a) * 26), 2, 2); } }
    // eyes burning in the carved face when it means harm
    if (e.state === "windCharge" || charge || e.state === "windToss" || e.state === "windHook") { for (const sg of [-1, 1]) px(ctx, x + sg * 4 + f * 1, y - B.H + 17 - bob, 2, 1, "#ffe070"); if (g) glow(g, x, y - B.H + 18, 18, "255,200,90", 0.4); }
    if (e.state === "windSlam" || e.state === "windCharge" || e.state === "windHook" || e.state === "windToss") telegraph(ctx, x, y - B.H - (e.state === "windToss" ? 26 : 6), t);
    if (e.state === "stagger") for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1; px(ctx, x + Math.cos(a) * 10, y - B.H - 2 + Math.sin(a) * 2, 1, 1, "#fff4b8"); }
  };
  function drawBruteAnim(e, ctx, ox, oy, t, g, introY, fl) {
    const x = Math.round(e.x - ox), y = Math.round(e.y - oy + introY), f = e.face, charge = e.state === "charge";
    e.walkPh = (e.walkPh || 0) + (e.moving ? (charge ? 0.34 : 0.16) : 0);
    const fr = bruteFrame(bruteAnimFrame(e, t)), bob = e.moving ? Math.round(Math.abs(Math.sin(e.walkPh)) * (charge ? 2 : 1)) : 0;
    const lean = charge ? 0.14 : e.state === "windCharge" ? 0.08 * Math.min(1, e.st / 0.4) : e.state === "stagger" ? Math.sin(t * 9) * 0.06 : 0;
    ctx.fillStyle = "rgba(10,12,16,0.38)"; ctx.beginPath(); ctx.ellipse(x, y, 20, 5, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(x, y - bob); ctx.transform(f, 0, lean * f, 1, 0, 0);
    ctx.drawImage(fl ? tinted(fr) : fr, -BA.W / 2, -BA.H + 4);
    ctx.restore();
    const top = y - BA.H + 4;
    if (e.state === "windToss") { const u = Math.min(1, e.st / 0.3), OB = R().obsidian, ry = Math.round(top - 4 - u * 6), rx = x - 10; px(ctx, rx, ry, 20, 10, rgb(OB[0])); px(ctx, rx + 1, ry, 18, 9, rgb(OB[4])); px(ctx, rx + 1, ry, 18, 3, rgb(OB[5])); px(ctx, rx + 4, ry + 4, 4, 2, rgb(OB[2])); for (let k = 0; k < 6; k++) px(ctx, rx + 1 + k * 3, ry - 2 + (k % 2), 2, 2, rgb(R().fern[2 + (k % 2)])); }
    if (e.state === "slam" && e.st < 0.2 || e.state === "hook" && e.st < 0.16) for (let k = 0; k < 2; k++) Combat.addPart({ x: e.x + f * 10 + rnd(-10, 10), y: e.y - 2, vx: rnd(-60, 60), vy: rnd(-90, -30), g: 260, life: 0.5, col: css(R().soil[3 + k]), size: 2, kind: "debris" });
    if (e.state === "windCharge" || charge || e.state === "windToss" || e.state === "windHook") { if (g) glow(g, x, top + 20, 18, "255,200,90", 0.35); }
    if (e.state === "windSlam" || e.state === "windCharge" || e.state === "windHook" || e.state === "windToss") telegraph(ctx, x, top - (e.state === "windToss" ? 18 : 2), t);
    if (e.state === "stagger") for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1; px(ctx, x + Math.cos(a) * 10, top - 4 + Math.sin(a) * 2, 1, 1, "#fff4b8"); }
  }
  // darters of a brute's tribe stand behind him for cover and lean out to shoot
  const dartBase = AI.dart;
  AI.dart = function (e, dt, t, P, L, api, d, live) {
    const brutes = (live || []).filter((o) => o.type === "brute" && !o.dead && (!e.tribe || o.tribe === e.tribe));
    let B = e.cover && !e.cover.dead ? e.cover : null;
    if (!B && brutes.length) { B = brutes.reduce((b, o) => (!b || dist(o, e) < dist(b, e) ? o : b), null); if ((live || []).filter((o) => o.type === "dart" && o.cover === B).length >= 2) B = null; }
    e.cover = B;
    if (!B || !e.alerted || (e.state !== "idle" && e.state !== "range" && e.state !== "cover" && e.state !== "peek")) { if (e.state === "cover" || e.state === "peek") e.state = "range"; return dartBase(e, dt, t, P, L, api, d, live); }
    const away = Math.atan2(B.y - P.y, B.x - P.x), mates = (live || []).filter((o) => o.type === "dart" && o.cover === B), side = mates.indexOf(e) % 2 ? 1 : -1;
    const hide = { x: B.x + Math.cos(away) * 22 + Math.cos(away + Math.PI / 2) * side * 6, y: B.y + Math.sin(away) * 18 + Math.sin(away + Math.PI / 2) * side * 5 };
    const peek = { x: hide.x + Math.cos(away + Math.PI / 2) * side * 20, y: hide.y + Math.sin(away + Math.PI / 2) * side * 16 };
    e.aimA += angDiff(Math.atan2(P.y - 10 - (e.y - 14), P.x - e.x), e.aimA) * Math.min(1, dt * 6);
    e.face = Math.cos(Math.atan2(P.y - e.y, P.x - e.x)) >= 0 ? 1 : -1;
    const go = (q, sp) => { const dx = q.x - e.x, dy = q.y - e.y, l = Math.hypot(dx, dy); if (l > 2) e.moving = tryMove(e, (dx / l) * Math.min(l, sp * dt), (dy / l) * Math.min(l, sp * dt)); else e.moving = false; return l; };
    if (e.state !== "cover" && e.state !== "peek") { e.state = "cover"; e.st = 0; e.next = rnd(1.4, 2.4); }
    if (e.state === "cover") { go(hide, 80); if (e.st > e.next) { e.state = "peek"; e.st = 0; } }
    else if (e.state === "peek") { const l = go(peek, 110); if (l < 4 || e.st > 0.5) { e.state = "aim"; e.st = 0; sfx(api, "inhale"); } }
  };

  // ================================================================== sharks
  const SHARK_WATER = [11, 12, 13];
  ST.shark = { hp: 60, r: 9, mat: "flesh", kb: 0, noStun: true, barY: 18, aquatic: true, colors: ["#6a8aa0", "#dfe6ea", "#3a5468"] };
  ST.bigshark = { hp: 150, r: 13, mat: "flesh", kb: 0, noStun: true, barY: 24, aquatic: true, big: 8, colors: ["#5a7a70", "#dfe6ea", "#2a4038"] };
  ST.tshark = { hp: 120, r: 12, mat: "flesh", kb: 0, noStun: true, barY: 22, aquatic: true, big: 6, colors: ["#a0604a", "#ffb060", "#5a3028"] };
  const SHARK = {
    shark: { sc: 1, L: 34, cruise: 30, stalk: 48, lunge: 230, wind: 0.75, dmg: 1, reach: 14 },
    bigshark: { sc: 1.5, L: 52, cruise: 26, stalk: 42, lunge: 200, wind: 0.95, dmg: 2, reach: 20 },
    tshark: { sc: 1.35, L: 46, cruise: 28, stalk: 46, lunge: 215, wind: 0.85, dmg: 2, reach: 18 },
  };
  const sharkBody = (s) => (s < 0.1 ? 1.6 + s * 26 : s < 0.36 ? 4.2 : Math.max(0.8, 4.2 * Math.pow(Math.max(0, 1 - (s - 0.36) / 0.6), 1.3)));
  const sharkFins = (s) => { let f = 0; if (s > 0.24 && s < 0.37) f = Math.max(f, 7 * (1 - (s - 0.24) / 0.13) * Math.min(1, (s - 0.24) / 0.035)); if (s > 0.58 && s < 0.66) f = Math.max(f, 3 * (1 - (s - 0.58) / 0.08)); if (s > 0.9) f = Math.max(f, 5.5 * Math.pow((s - 0.9) / 0.1, 0.8)); return f; };
  for (const k of ["shark", "bigshark", "tshark"]) E.SETUP[k] = (e) => { const C = SHARK[k]; e.swim = true; e.aquatic = true; e.sc = C.sc; e.L = C.L; e.va = Math.random() * TAU; e.S = Surface(Math.ceil(90 * C.sc), Math.ceil(90 * C.sc)); e.hist = []; e.z = 0; e.next = rnd(2.2, 3.6); };
  // the parts of a shark's life spent out of the water
  const OUT = { lunge: 1, thrash: 1, leap: 1, beach: 1, stranded: 1, flop: 1, landfight: 1, landbite: 1 };
  function sharkAI(e, dt, t, P, L, api, d) {
    const C = SHARK[e.type], thermal = e.type === "tshark";
    e.stranded = e.state === "stranded" || e.state === "beach" || e.state === "flop" || e.state === "landfight" || e.state === "landbite";
    const wetP = wetAt(P.x, P.y);
    // in a frenzy the sharks are after the bait ball; one that notices a hero (close by, or struck by one)
    // forgets the fish and hunts only that hero from then on
    let school = L.school && L.school.active && !e.fixated ? L.school : null;
    if (school && (d < 130 || e.hp < e.max)) { e.fixated = true; school = null; e.alerted = true; if (!OUT[e.state] && e.state !== "line") { e.state = "stalk"; e.st = 0; e.orb = Math.random() < 0.5 ? 1 : -1; e.next = rnd(0.6, 1.4); } sfx(api, "splash"); }
    // somehow on dry land (a spawn, a shove): flop back to the water
    if (!OUT[e.state] && e.state !== "windBeach" && !SHARK_WATER.includes(wetAt(e.x, e.y))) { e.state = "flop"; e.st = 0; e.home = nearestWater(e); }
    // and a shark flopping about on land that finds water under it again slips back under at once
    if ((e.state === "landfight" || e.state === "landbite" || e.state === "stranded") && e.st > 0.2 && SHARK_WATER.includes(wetAt(e.x, e.y)) && SHARK_WATER.includes(wetAt(e.x + Math.cos(e.va) * 8, e.y + Math.sin(e.va) * 8))) { e.state = "stalk"; e.st = 0; e.z = 0; e.next = rnd(1.4, 2.4); sfx(api, "splash"); for (let k = 0; k < 10; k++) Combat.addPart({ x: e.x, y: e.y - 2, vx: rnd(-50, 50), vy: rnd(-80, -30), g: 260, life: 0.5, col: k % 2 ? "#e8f8fc" : "#9ad8e8", size: 1, kind: "drop" }); }
    if (school && (e.state === "idle" || e.state === "cruise" || e.state === "stalk")) {
      // circling the bait ball, then a rush straight through it
      e.state = "cruise"; e.orbA = (e.orbA ?? Math.atan2(e.y - school.y, e.x - school.x)) + dt * 0.7 * (e.ph > 3 ? 1 : -1);
      steer(e, { x: school.x + Math.cos(e.orbA) * 80, y: school.y + Math.sin(e.orbA) * 60 }, SHARK_WATER, dt, C.stalk * 1.15, 2);
      if (Math.random() < dt * 0.4) { e.state = "line"; e.st = C.wind * 0.4; e.aim = Math.atan2(school.y - e.y, school.x - e.x); e.prey = 1; }
    } else if (!e.alerted || e.state === "idle" || e.state === "cruise") {
      e.state = "cruise"; steer(e, null, SHARK_WATER, dt, C.cruise, 1.2);
      if (e.alerted && d < 200) { e.state = "stalk"; e.st = 0; e.orb = Math.random() < 0.5 ? 1 : -1; }
    } else if (e.state === "stalk") {
      // a slow circle round you, fin up, closing in; if you're on land, it patrols the water's edge nearest you
      if (!wetP) { if (!e.shore || t - (e.shoreT || 0) > 1) { e.shoreT = t; e.shore = nearestWater(P); } steer(e, { x: e.shore.x + Math.cos(t * 0.8 + e.ph) * 18, y: e.shore.y + Math.sin(t * 0.8 + e.ph) * 12 }, SHARK_WATER, dt, C.stalk, 2); }
      else { const a0 = Math.atan2(e.y - P.y, e.x - P.x) + e.orb * 0.6, R0 = 72 * C.sc; steer(e, { x: P.x + Math.cos(a0) * R0, y: P.y + Math.sin(a0) * R0 * 0.8 }, SHARK_WATER, dt, C.stalk, 1.6); }
      if (thermal) { e.scaldCd = (e.scaldCd ?? 4) - dt; if (e.scaldCd <= 0 && (wetP ? d < 190 : d < 150)) { e.state = "scald"; e.st = 0; e.scaldCd = rnd(4.5, 6.5); e.aim = Math.atan2(P.y - e.y, P.x - e.x); sfx(api, "inhale"); } }
      if (e.st > e.next && e.state === "stalk") {
        const info = lineInfo(e.x, e.y, P.x, P.y, SHARK_WATER);
        if (wetP && info.land === 0 && d < 150) { e.state = "line"; e.st = 0; e.aim = Math.atan2(P.y - e.y, P.x - e.x); e.prey = 0; }
        else if (wetP && !info.wall && info.maxRun <= 70 && info.maxRun > 0 && d < 170) { e.state = "windLeap"; e.st = 0; e.aim = Math.atan2(P.y - e.y, P.x - e.x); }
        else if (!wetP && d < 70 + 30 * C.sc && !info.wall && info.land < 64) { e.state = "windBeach"; e.st = 0; e.aim = Math.atan2(P.y - e.y, P.x - e.x); e.home = { x: e.x, y: e.y }; }
        else e.st = e.next - 0.6;
      }
      if (d > 320) { e.state = "cruise"; e.alerted = false; }
    } else if (e.state === "line") {
      // it turns, settles, and its wake points the way it is about to go
      if (e.st < C.wind - 0.25) e.aim += angDiff(Math.atan2(P.y - e.y, P.x - e.x), e.aim) * Math.min(1, dt * (e.prey ? 0 : 3));
      e.va += angDiff(e.aim, e.va) * Math.min(1, dt * 6); swim(e, Math.cos(e.va) * 12 * dt, Math.sin(e.va) * 12 * dt, SHARK_WATER);
      if (e.st > C.wind) { e.state = "lunge"; e.st = 0; e.hitSet = {}; sfx(api, "splash"); }
    } else if (e.state === "lunge") {
      const moved = swim(e, Math.cos(e.va) * C.lunge * dt, Math.sin(e.va) * C.lunge * dt, SHARK_WATER);
      if (e.st > 0.12) hitAny(e, e.x + Math.cos(e.va) * 10 * C.sc, e.y + Math.sin(e.va) * 7 * C.sc - 4, C.reach, C.dmg, e.hitSet, "bite");
      if (thermal && Math.random() < dt * 14) L.fx.push({ kind: "boil", x: e.x, y: e.y, t: 0, dur: 2, R: 10 });
      if (school && e.prey && Math.hypot(school.x - e.x, school.y - e.y) < 60) school.scare = { x: e.x, y: e.y, t };
      if (!moved || e.st > 0.55) { e.state = "thrash"; e.st = 0; sfx(api, "bite"); for (let k = 0; k < 12; k++) Combat.addPart({ x: e.x, y: e.y - 2, vx: rnd(-60, 60), vy: rnd(-90, -30), g: 260, life: 0.6, col: k % 2 ? "#e8f8fc" : "#9ad8e8", size: 1, kind: "drop" }); }
    } else if (e.state === "thrash") { if (e.st > 0.55) { e.state = "stalk"; e.st = 0; e.next = e.fixated ? rnd(1.4, 2.4) : rnd(2.4, 3.8); sfx(api, "splash"); } }
    else if (e.state === "windLeap") {
      e.va += angDiff(e.aim, e.va) * Math.min(1, dt * 6);
      if (e.st > C.wind) {
        // pick a landing in the water past the bar, at the hero
        let lx = P.x, ly = P.y; if (!SHARK_WATER.includes(wetAt(lx, ly))) { for (let k = 1; k < 8; k++) { const x2 = P.x + Math.cos(e.aim) * k * 6, y2 = P.y + Math.sin(e.aim) * k * 6; if (SHARK_WATER.includes(wetAt(x2, y2))) { lx = x2; ly = y2; break; } } }
        e.state = "leap"; e.st = 0; e.from = { x: e.x, y: e.y }; e.to = { x: lx, y: ly }; e.hitSet = {}; sfx(api, "splash");
      }
    } else if (e.state === "leap") {
      // a breach clean over the sandbar, landing jaws first where you stand
      const dur = 0.75, u = Math.min(1, e.st / dur);
      e.x = e.from.x + (e.to.x - e.from.x) * u; e.y = e.from.y + (e.to.y - e.from.y) * u; e.z = Math.sin(u * Math.PI) * 30 * C.sc;
      if (u >= 1) { e.z = 0; hitAny(e, e.x, e.y - 4, C.reach + 6, C.dmg, e.hitSet, "bite"); Combat.shake = Math.min(1, Combat.shake + 0.3); for (let k = 0; k < 16; k++) Combat.addPart({ x: e.x, y: e.y - 2, vx: rnd(-80, 80), vy: rnd(-110, -40), g: 260, life: 0.7, col: k % 2 ? "#e8f8fc" : "#9ad8e8", size: 1, kind: "drop" }); sfx(api, "splash"); e.state = "thrash"; e.st = 0; }
    } else if (e.state === "windBeach") { e.va += angDiff(e.aim, e.va) * Math.min(1, dt * 6); if (e.st > C.wind) { e.state = "beach"; e.st = 0; e.hitSet = {}; sfx(api, "splash"); } }
    else if (e.state === "beach") {
      // up out of the surf onto the sand after you, and stuck there
      const sp = C.lunge * 0.9; e.x += Math.cos(e.va) * sp * dt; e.y += Math.sin(e.va) * sp * dt;
      hitAny(e, e.x + Math.cos(e.va) * 10 * C.sc, e.y + Math.sin(e.va) * 7 * C.sc - 4, C.reach, C.dmg, e.hitSet, "bite");
      if (e.st > 0.42 || Level.solidAt(e.x + Math.cos(e.va) * 10, e.y + Math.sin(e.va) * 10)) { e.state = "stranded"; e.st = 0; sfx(api, "bite"); }
    } else if (e.state === "stranded") { if (e.st > 0.45) { e.state = "landfight"; e.st = 0; e.biteT = 0.3; e.landFor = (e.type === "shark" ? 3.4 : 4.6); } }
    else if (e.state === "landfight") {
      // stranded, it is still dangerous: it flops after you across the sand in big writhing hops, snapping,
      // and lashes its tail at anyone close behind it, until it has to make for the water
      const toP = Math.atan2(P.y - e.y, P.x - e.x), hop = Math.abs(Math.sin(e.st * 7.5)), near = d < 150;
      const goA = near ? toP : Math.atan2((e.home || nearestWater(e)).y - e.y, (e.home || nearestWater(e)).x - e.x);
      e.va += angDiff(goA, e.va) * Math.min(1, dt * 5);
      const sp = (e.type === "shark" ? 92 : 78) * hop;
      if (d > C.reach + 6 || !near) tryMove(e, Math.cos(goA) * sp * dt, Math.sin(goA) * sp * dt);
      e.z = hop * 6;
      e.biteT -= dt;
      if (near && d < C.reach + 18 && e.biteT <= 0) { e.state = "landbite"; e.st = 0; e.hitSet = {}; e.aim = toP; sfx(api, "clack"); }
      e.tailT = (e.tailT || 0) - dt;
      if (e.tailT <= 0 && d < 34 && Math.cos(toP - e.va) < -0.2) { e.tailT = 1.2; e.hitSet = {}; hitAny(e, e.x - Math.cos(e.va) * 14 * C.sc, e.y - Math.sin(e.va) * 10 * C.sc - 4, 20, 1, e.hitSet, "tail"); sfx(api, "chop"); Combat.shake = Math.min(1, Combat.shake + 0.15); }
      if (e.st > e.landFor) { e.state = "flop"; e.st = 0; e.home = nearestWater(e); }
    } else if (e.state === "landbite") {
      // a lunging snap along the ground
      e.va += angDiff(e.aim, e.va) * Math.min(1, dt * 10); e.z = 0;
      if (e.st > 0.22 && e.st < 0.4) { tryMove(e, Math.cos(e.aim) * 170 * dt, Math.sin(e.aim) * 170 * dt); hitAny(e, e.x + Math.cos(e.aim) * 10 * C.sc, e.y + Math.sin(e.aim) * 7 * C.sc - 4, C.reach + 2, C.dmg, e.hitSet, "bite"); }
      if (e.st > 0.6) { e.state = "landfight"; e.biteT = rnd(0.55, 0.9); sfx(api, "bite"); }
    }
    else if (e.state === "flop") {
      // flops back into the sea, hop by hop
      const h = e.home || nearestWater(e), a = Math.atan2(h.y - e.y, h.x - e.x), hop = Math.abs(Math.sin(e.st * 9));
      e.va += angDiff(a + Math.PI, e.va) * Math.min(1, dt * 2); e.x += Math.cos(a) * 70 * hop * dt; e.y += Math.sin(a) * 70 * hop * dt; e.z = hop * 5;
      if (SHARK_WATER.includes(wetAt(e.x, e.y)) && SHARK_WATER.includes(wetAt(e.x + Math.cos(a) * 8, e.y + Math.sin(a) * 8)) || e.st > 3) { e.z = 0; e.state = "stalk"; e.st = 0; e.next = rnd(2.4, 3.6); sfx(api, "splash"); if (!SHARK_WATER.includes(wetAt(e.x, e.y))) { e.x = h.x; e.y = h.y; } }
    } else if (e.state === "scald") {
      // a thermal shark heats the water ahead of it: steam bursts up along a line toward you
      // a fan of three rolling lines of geysers racing out toward you, then a ring closing round where
      // you're headed; two hearts each
      e.aim += angDiff(Math.atan2(P.y - e.y, P.x - e.x), e.aim) * Math.min(1, dt * 3);
      if (e.st < 0.55 && Math.random() < 0.7) Combat.addPart({ x: e.x + rnd(-14, 14), y: e.y + rnd(-6, 6), vx: rnd(-10, 10), vy: rnd(-40, -20), g: -5, life: 0.6, col: Math.random() < 0.5 ? "#fff0e0" : "#ffb070", size: 1, kind: "ember", glow: true });
      if (!e.scalded && e.st > 0.55) {
        e.scalded = true;
        for (const da of [-0.38, 0, 0.38]) for (let k = 1; k <= 6; k++) { const a = e.aim + da, x2 = e.x + Math.cos(a) * k * 21, y2 = e.y + Math.sin(a) * k * 16; if (!Level.solidAt(x2, y2)) L.fx.push({ kind: "scald", x: x2, y: y2, t: -k * 0.09 - Math.abs(da) * 0.15, dur: 1.5, R: 14, dmg: 2 }); }
        const lead = 0.6, cx = P.x + (P.vx || 0) * lead, cy = P.y + (P.vy || 0) * lead;
        for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + Math.random(), x2 = cx + Math.cos(a) * 30, y2 = cy + Math.sin(a) * 22; if (!Level.solidAt(x2, y2)) L.fx.push({ kind: "scald", x: x2, y: y2, t: -0.85, dur: 1.5, R: 14, dmg: 2 }); }
        if (!Level.solidAt(cx, cy)) L.fx.push({ kind: "scald", x: cx, y: cy, t: -1.05, dur: 1.5, R: 15, dmg: 2 });
        sfx(api, "geyser");
      }
      if (e.st > 1.5) { e.scalded = false; e.state = "stalk"; e.st = 0; e.next = rnd(1.2, 2); }
    }
    e.hist.unshift([e.x, e.y]); if (e.hist.length > 36) e.hist.length = 36;
  }
  function nearestWater(e) { for (let r = 8; r < 160; r += 8) for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU, x = e.x + Math.cos(a) * r, y = e.y + Math.sin(a) * r; if (SHARK_WATER.includes(wetAt(x, y))) return { x, y }; } return { x: e.x, y: e.y }; }
  AI.shark = AI.bigshark = AI.tshark = sharkAI;
  // the body: the cave sharks' own outline (snout to forked tail), traced along where it has swum. A
  // silhouette under the water; out of it (lunging, leaping, stranded) the real shark
  function drawShark(e, ctx, ox, oy, t, g, fl) {
    const thermal = e.type === "tshark", big = e.type === "bigshark", S = e.S, W = S.w, cx = W / 2, cy = W / 2, sc = e.sc || 1;
    const full = e.state === "leap" || e.state === "beach" || e.state === "stranded" || e.state === "flop" || e.state === "landfight" || e.state === "landbite", out = full || e.state === "lunge" && e.st > 0.15 || e.state === "thrash";
    const pts = [], h = e.hist.length ? e.hist : [[e.x, e.y]], LEN = e.L;
    let acc = 0, hi = 0; pts.push([e.x + Math.cos(e.va) * 6 * sc, e.y + Math.sin(e.va) * 6 * sc, 0]);
    for (let s = 1; s <= 10; s++) {
      const want = (s / 10) * LEN;
      while (hi < h.length - 1 && acc + Math.hypot(h[hi + 1][0] - h[hi][0], h[hi + 1][1] - h[hi][1]) < want) { acc += Math.hypot(h[hi + 1][0] - h[hi][0], h[hi + 1][1] - h[hi][1]); hi++; }
      const b = h[Math.min(hi, h.length - 1)], fall = want - acc, pa = e.va + Math.PI, past = hi >= h.length - 1 || full ? 1 : 0;
      pts.push(full ? [e.x + Math.cos(pa) * want, e.y + Math.sin(pa) * want, s / 10] : [b[0] + Math.cos(pa) * Math.max(0, fall) * past, b[1] + Math.sin(pa) * Math.max(0, fall) * past, s / 10]);
    }
    const flop = e.state === "stranded" || e.state === "flop" || e.state === "landfight" ? Math.sin(t * 16) * 4 : e.state === "landbite" ? Math.sin(t * 30) * 2 : 0;
    for (let k = 1; k < pts.length; k++) { const wave = Math.sin(pts[k][2] * 5 - t * (out ? 9 : 4) + e.ph) * pts[k][2] * pts[k][2] * 3 * sc + flop * pts[k][2], a = e.va + Math.PI / 2; pts[k][0] += Math.cos(a) * wave; pts[k][1] += Math.sin(a) * wave; }
    begin(S);
    const SIL = thermal ? PAL.pk([60, 22, 20]) : big ? PAL.pk([10, 30, 34]) : PAL.pk([8, 34, 52]), EDGE = thermal ? PAL.pk([200, 90, 40]) : PAL.pk([20, 60, 84]);
    const TOP = thermal ? [[150, 92, 80], [190, 120, 96], [110, 60, 52]] : big ? [[96, 120, 110], [130, 156, 140], [64, 84, 76]] : [[104, 132, 152], [140, 168, 186], [70, 96, 116]], BELLY = [226, 232, 234];
    // a shark under the water is re-rasterised every other frame (half of them each frame); in between, last
    // frame's silhouette is drawn where it now is. Its shape barely changes in a 60th of a second.
    const frame = Math.floor(t * 60), redraw = out || fl || !e.S.p || (frame + e.id) % 2 === 0 || e.lastFrame === undefined;
    if (!redraw && e.lastHas) { ctx.globalAlpha = e.state === "line" ? 0.68 : 0.5; ctx.drawImage(S.c, Math.round(e.x - cx - ox), Math.round(e.y - cy - oy - (e.z || 0))); ctx.globalAlpha = 1; drawSharkExtras(e, ctx, ox, oy, t, g, out, full, thermal, big, sc, pts); return; }
    e.lastFrame = frame;
    // only the box round the body is scanned (the whole surface was most of the frame with a dozen sharks)
    let bx0 = 1e9, by0 = 1e9, bx1 = -1e9, by1 = -1e9; for (const q of pts) { if (q[0] < bx0) bx0 = q[0]; if (q[0] > bx1) bx1 = q[0]; if (q[1] < by0) by0 = q[1]; if (q[1] > by1) by1 = q[1]; }
    const pad = 12 * sc + 2, sx0 = Math.max(0, Math.floor(bx0 - pad - e.x + cx)), sx1 = Math.min(W - 1, Math.ceil(bx1 + pad - e.x + cx)), sy0 = Math.max(0, Math.floor(by0 - pad - e.y + cy)), sy1 = Math.min(W - 1, Math.ceil(by1 + pad - e.y + cy));
    const nseg = pts.length - 1, SX = new Float32Array(nseg * 6);
    for (let k = 0; k < nseg; k++) { const ax = pts[k][0], ay = pts[k][1], dx = pts[k + 1][0] - ax, dy = pts[k + 1][1] - ay; SX[k * 6] = ax; SX[k * 6 + 1] = ay; SX[k * 6 + 2] = dx; SX[k * 6 + 3] = dy; SX[k * 6 + 4] = 1 / (dx * dx + dy * dy || 1); SX[k * 6 + 5] = pts[k][2]; }
    for (let y = sy0; y <= sy1; y++) for (let x = sx0; x <= sx1; x++) {
      const wx = e.x + x + 0.5 - cx, wy = e.y + y + 0.5 - cy;
      let best = 1e9, bs = 0, side = 0;
      for (let k = 0, o = 0; k < nseg; k++, o += 6) { const ax = SX[o], ay = SX[o + 1], dx = SX[o + 2], dy = SX[o + 3]; let tt = ((wx - ax) * dx + (wy - ay) * dy) * SX[o + 4]; tt = tt < 0 ? 0 : tt > 1 ? 1 : tt; const ex = ax + dx * tt - wx, ey = ay + dy * tt - wy, dd = ex * ex + ey * ey; if (dd < best) { best = dd; bs = SX[o + 5] + 0.1 * tt; side = (wx - ax) * -dy + (wy - ay) * dx; } }
      if (best > 400 * sc * sc) continue;
      best = Math.sqrt(best);
      const w = (sharkBody(bs) + sharkFins(bs)) * sc;
      if (!(best <= w)) continue;
      const i = y * W + x;
      if (out && (full || bs < 0.42)) {
        const n = best / Math.max(0.1, sharkBody(bs) * sc), up = side < 0;
        let c = PAL.pk(n > 0.8 ? TOP[2] : up ? TOP[1] : n > 0.35 ? TOP[0] : BELLY);
        if (big && bs > 0.15 && bs < 0.8 && Math.sin(bs * 70 + (side > 0 ? 1 : 0)) > 0.55 && n > 0.3) c = PAL.pk(TOP[2]);           // a tiger's stripes
        if (bs > 0.1 && bs < 0.14 && n > 0.45 && n < 0.85) c = PAL.pk([12, 12, 18]);
        if (bs < 0.07 && n < 0.55) c = PAL.pk(e.state === "lunge" || e.state === "beach" || e.state === "leap" ? [170, 40, 50] : [60, 40, 48]);
        if (bs < 0.09 && n > 0.5 && n < 0.75 && ((x + y) & 1)) c = PAL.pk([250, 248, 240]);
        if (thermal && bs > 0.16 && Math.sin(bs * 60) > 0.6) c = PAL.pk([255, 160, 70]);
        S.d[i] = fl ? L0.WHITE : c; mark(S, x, y);
      } else { S.d[i] = best > w - 1 ? EDGE : SIL; mark(S, x, y); }
    }
    const has = flush(S, out); e.lastHas = has;
    const z = e.z || 0;
    if (full) { ctx.fillStyle = "rgba(10,12,16,0.3)"; ctx.beginPath(); ctx.ellipse(Math.round(e.x - ox), Math.round(e.y - oy), 14 * sc, 4 * sc, 0, 0, TAU); ctx.fill(); }
    if (has) { ctx.globalAlpha = out ? 1 : e.state === "line" ? 0.68 : 0.5; ctx.drawImage(S.c, Math.round(e.x - cx - ox), Math.round(e.y - cy - oy - z)); ctx.globalAlpha = 1; }
    drawSharkExtras(e, ctx, ox, oy, t, g, out, full, thermal, big, sc, pts);
  }
  function drawSharkExtras(e, ctx, ox, oy, t, g, out, full, thermal, big, sc, pts) {
    // the fin cutting the surface, and its wake
    if (!out && (e.state === "stalk" || e.state === "line" || e.state === "windLeap" || e.state === "windBeach" || e.state === "scald")) {
      const fx = pts[3][0] - ox, fy = pts[3][1] - oy, hgt = Math.round((e.state === "stalk" ? 4 : 6) * sc);
      for (let k = 0; k < hgt; k++) px(ctx, fx - (hgt - k) * 0.4, fy - k, Math.max(1, (hgt - k) * 0.6), 1, thermal ? "#8a4a3a" : big ? "#3e5a50" : "#4a6478");
      px(ctx, fx, fy - hgt, 1, 1, "#dfe8ee");
      for (let k = 1; k < 4; k++) { const wa = e.va + Math.PI; for (const sg of [-1, 1]) px(ctx, fx + Math.cos(wa + sg * 0.5) * k * 4, fy + 2 + Math.sin(wa + sg * 0.5) * k * 3, 2, 1, `rgba(240,252,252,${0.8 - k * 0.2})`); }
    }
    // lining up: a pale wake arrow on the water where it is about to go
    if (e.state === "line" || e.state === "windLeap" || e.state === "windBeach") {
      const u = Math.min(1, e.st / SHARK[e.type].wind), len = 60 * sc * u;
      for (let s2 = 10; s2 < len; s2 += 4) { const x2 = e.x + Math.cos(e.aim) * s2 - ox, y2 = e.y + Math.sin(e.aim) * s2 * 0.85 - oy; px(ctx, x2, y2, 2, 1, `rgba(240,252,252,${0.65 * (1 - s2 / (len + 10))})`); }
      telegraph(ctx, e.x - ox, e.y - oy - 16 * sc, t);
    }
    if (e.state === "landbite" && e.st < 0.22) telegraph(ctx, e.x - ox, e.y - oy - 22 * sc, t);
    if (thermal && g) glow(g, e.x - ox, e.y - oy, 30 * sc, "255,120,50", out ? 0.45 : 0.25);
    if (e.state === "stranded" || e.state === "flop" || e.state === "landfight" || e.state === "landbite") for (let k = 0; k < 2; k++) if (Math.random() < 0.3) Combat.addPart({ x: e.x + rnd(-10, 10), y: e.y - 4, vx: rnd(-30, 30), vy: rnd(-50, -20), g: 200, life: 0.4, col: "#e8d8b0", size: 1, kind: "debris" });
  }
  E.DRAW.shark = E.DRAW.bigshark = E.DRAW.tshark = (e, ctx, ox, oy, t, g, introY, fl) => drawShark(e, ctx, ox, oy, t, g, fl);

  // ================================================================== stingrays (silhouettes)
  const RAY_WATER = [11, 12];
  ST.ray = { hp: 36, r: 9, mat: "flesh", kb: 0, noStun: true, barY: 14, aquatic: true, colors: ["#3a5468", "#9adcff", "#20384a"] };
  E.SETUP.ray = (e) => { e.swim = true; e.aquatic = true; e.va = Math.random() * TAU; e.cd = rnd(1, 3); e.cur = rnd(2, 4); };
  // a stingray from above: a rounded diamond disc whose wing edges ripple, two eye bumps, and a long
  // whip of a tail with its barb
  function drawRay(ctx, x, y, va, t, ph, scale, alpha, charge, fl) {
    const ca = Math.cos(va), sa = Math.sin(va), span = 11 * scale, len = 9 * scale;
    const col = fl ? "255,255,255" : charge > 0 ? `${20 + 120 * charge | 0},${50 + 160 * charge | 0},${80 + 170 * charge | 0}` : "6,30,46";
    ctx.fillStyle = `rgba(${col},${alpha})`;
    // filled screen pixel by screen pixel (mapped back into the ray's own frame), so it has no holes at any angle
    const X0 = Math.round(x), Y0 = Math.round(y), RR = Math.ceil(Math.max(span, len) + 3);
    for (let dy = -RR; dy <= RR; dy++) for (let dx = -RR; dx <= RR; dx++) {
      const u0 = ca * (dx + X0 - x) + sa * (dy + Y0 - y), v = -sa * (dx + X0 - x) + ca * (dy + Y0 - y), av = Math.abs(v) / span;
      if (av > 1.05) continue;
      const u = u0 - Math.sin(t * 3.4 + ph - av * 2.4) * av * av * 1.1 * scale;
      const front = u > 0 ? Math.pow(u / (len * 0.75), 1.6) : Math.pow(-u / len, 1.15);
      if (av + front > 1.02 || u > len * 0.75 || u < -len) continue;
      ctx.fillRect(X0 + dx, Y0 + dy, 1, 1);
    }
    ctx.fillStyle = `rgba(${col},${Math.min(1, alpha * 1.25)})`;
    for (const sg of [-1, 1]) ctx.fillRect(Math.round(x + ca * len * 0.35 - sa * sg * 2.2 * scale), Math.round(y + sa * len * 0.35 + ca * sg * 2.2 * scale), 1, 1);
    for (let k = 0; k < 15 * scale; k++) { const w = Math.sin(t * 4.5 + ph - k * 0.35) * Math.min(1, k / 6) * 1.6; ctx.fillRect(Math.round(x - ca * (len + k) - sa * w), Math.round(y - sa * (len + k) + ca * w), 1, 1); }
    if (charge > 0) for (let k = 0; k < 6; k++) { const a = K.hash2(k, (t * 20) | 0, 9) * TAU, r = span * (0.6 + K.hash2(k, 3, (t * 20) | 0) * 0.8); ctx.fillStyle = "rgba(220,240,255,0.95)"; ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.7), 1, 1); }
  }
  // It flies through the water rather than steers: velocity eases toward where it wants to be, its heading
  // follows its velocity, it banks into turns and its wingbeat quickens with speed. Once it has found a
  // hero it lingers, wheeling round them at close range in a loose, breathing circle, discharging whenever
  // it can, and a blow sends it skimming off before it wheels back in.
  AI.ray = function (e, dt, t, P, L, api, d) {
    e.cd -= dt; e.cur -= dt; e.vx = e.vx || 0; e.vy = e.vy || 0; e.orbA = e.orbA ?? Math.atan2(e.y - P.y, e.x - P.x); e.dir = e.dir || (Math.random() < 0.5 ? 1 : -1);
    const fly = (gx, gy, sp, acc) => {
      const a = Math.atan2(gy - e.y, gx - e.x), dist2 = Math.hypot(gx - e.x, gy - e.y), want = Math.min(sp, dist2 * 2.2);
      e.vx += (Math.cos(a) * want - e.vx) * Math.min(1, dt * acc); e.vy += (Math.sin(a) * want - e.vy) * Math.min(1, dt * acc);
      if (!swim(e, e.vx * dt, e.vy * dt, RAY_WATER)) { e.vx *= -0.6; e.vy *= -0.6; e.dir = -e.dir; }
      const spd = Math.hypot(e.vx, e.vy);
      if (spd > 4) { const nva = Math.atan2(e.vy, e.vx), turn = angDiff(nva, e.va); e.va += turn * Math.min(1, dt * 5); e.bank = (e.bank || 0) + (K.clamp(turn * 2, -1, 1) - (e.bank || 0)) * Math.min(1, dt * 4); }
      e.flp = (e.flp || 0) + dt * (0.85 + spd / 95);
    };
    if (e.hitT > (e.lastHit || 0)) { e.lastHit = e.hitT; e.skim = 0.55; e.dir = -e.dir; }
    if (e.state === "charge") {
      // it slows, hanging in the water, crackling, then lets go all at once
      fly(e.x + e.vx * 0.2, e.y + e.vy * 0.2, 14, 3);
      if (e.st > 0.9) { L.fx.push({ kind: "shock", x: e.x, y: e.y, t: 0, dur: 0.45, R: 52, dmg: 1 }); sfx(api, "electrocute"); Combat.shake = Math.min(1, Combat.shake + 0.15); e.state = "glide"; e.st = 0; e.cd = rnd(2, 3); e.dir = -e.dir; }
      return;
    }
    if (e.state === "current") {
      // an arc of current thrown up the shore at a hero on land
      fly(e.x, e.y, 10, 3);
      if (e.st > 0.75 && !e.shot) { e.shot = true; const Q = e.tq && !e.tq.dead ? e.tq : P; L.fx.push({ kind: "bolt", x: e.x, y: e.y - 2, x2: Q.x, y2: Q.y - 8, t: 0, dur: 0.45, dmg: 1 }); sfx(api, "electrocute"); }
      if (e.st > 1.2) { e.shot = false; e.state = "glide"; e.st = 0; e.cur = rnd(3, 4.2); }
      return;
    }
    e.state = "glide";
    if (e.alerted && d < 240) {
      // the lingering wheel round its hero, the circle swelling and tightening
      e.skim = (e.skim || 0) - dt;
      const R0 = e.skim > 0 ? 90 : 42 + Math.sin(t * 0.6 + e.ph) * 14;
      e.orbA += dt * (e.skim > 0 ? 1.8 : 1.05) * e.dir;
      fly(P.x + Math.cos(e.orbA) * R0, P.y + Math.sin(e.orbA) * R0 * 0.75, e.skim > 0 ? 110 : 82, 2.2);
      if (Math.random() < dt * 0.12) e.dir = -e.dir;
      if (e.cd <= 0 && d < 56 && wetAt(P.x, P.y)) { e.state = "charge"; e.st = 0; sfx(api, "charge"); }
      else if (e.cur <= 0) { const Q = (E.alive || []).find((q) => !wetAt(q.x, q.y) && Math.hypot(q.x - e.x, q.y - e.y) < 72); if (Q) { e.state = "current"; e.st = 0; e.tq = Q; sfx(api, "charge"); } else e.cur = 0.5; }
    } else {
      // unseen, it wanders slow loops
      e.wan = (e.wan ?? Math.random() * TAU) + Math.sin(t * 0.3 + e.ph) * dt * 0.8;
      fly(e.x + Math.cos(e.wan) * 40, e.y + Math.sin(e.wan) * 40, 26, 1.2);
      const fx = e.x + Math.cos(e.wan) * 30, fy = e.y + Math.sin(e.wan) * 30; if (!RAY_WATER.includes(wetAt(fx, fy))) e.wan += 1.2;
    }
  };
  E.DRAW.ray = (e, ctx, ox, oy, t, g, introY, fl) => {
    const ch = e.state === "charge" ? Math.min(1, e.st / 0.9) : e.state === "current" ? Math.min(1, e.st / 0.75) : 0;
    drawRay(ctx, e.x - ox, e.y - oy, e.va, e.flp !== undefined ? e.flp : t, e.ph, 1.15, 0.66, ch, fl);
    if (ch > 0) { telegraph(ctx, e.x - ox, e.y - oy - 16, t); if (g) glow(g, e.x - ox, e.y - oy, 30 + ch * 34, "140,200,255", 0.3 + ch * 0.45); }
  };

  // ================================================================== Kai-Uila, the Storm Ray (L3 boss)
  ST.giantray = { hp: 2400, r: 30, mat: "flesh", kb: 0, boss: true, big: 34, aquatic: true, name: "KAI-UILA, THE STORM RAY", colors: ["#3a5468", "#9adcff", "#20384a"] };
  ST.rayling = { hp: 9999, r: 7, mat: "flesh", kb: 0, noStun: true, barY: 12, aquatic: true, colors: ["#3a5468", "#9adcff", "#20384a"] };
  // the great ray's outline (u forward, v across), after the concept: cephalic fins, swept wings, a
  // long tail. Small rays fill it, packed along the wings like scales.
  const RAYPOLY = [[30, 0], [30, 7], [40, 12], [34, 17], [20, 20], [8, 44], [-6, 74], [-16, 70], [-22, 44], [-30, 18], [-36, 7], [-40, 0]];
  const inRay = (u, v) => { v = Math.abs(v); let ins = false; const pts = RAYPOLY.concat(RAYPOLY.slice().reverse().map(([a, b]) => [a, -b])); for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [ui, vi] = pts[i], [uj, vj] = pts[j]; if ((vi > v) !== (vj > v) && u < ((uj - ui) * (v - vi)) / (vj - vi || 1e-6) + ui) ins = !ins; } return ins; };
  const SLOTS = (() => { const s = []; for (let u = -34; u <= 30; u += 7) for (let v = -72; v <= 72; v += 8) { const vv = v + ((u / 7) & 1 ? 4 : 0); if (inRay(u, vv)) s.push([u, vv]); } return s; })();
  // the body as a mask in its own frame, built once: 0 outside, 1 body, 2 a small ray's shape, 3 rim
  const MASK = (() => {
    const U0 = -150, U1 = 44, V = 80, w = U1 - U0 + 1, h = V * 2 + 1, m = new Uint8Array(w * h);
    for (let u = U0; u <= U1; u++) for (let v = -V; v <= V; v++) {
      let inside = inRay(u, v);
      if (!inside && u < -36 && u > -150) inside = Math.abs(v) <= Math.max(0.6, 3 * (1 + (u + 36) / 114));            // the tail
      if (inside) m[(v + V) * w + (u - U0)] = 1;
    }
    for (const [su, sv] of SLOTS) for (let du = -4; du <= 3; du++) for (let dv = -4; dv <= 4; dv++) { if (Math.abs(dv) / 4.5 + (du > 0 ? du / 3.5 : -du / 4.5) > 1) continue; const i = (sv + dv + V) * w + (su + du - U0); if (m[i] === 1) m[i] = 2; }
    for (let v = -V + 1; v < V; v++) for (let u = U0 + 1; u < U1; u++) { const i = (v + V) * w + (u - U0); if (m[i] === 1 && (m[i - 1] === 2 || m[i + 1] === 2 || m[i - w] === 2 || m[i + w] === 2)) m[i] = 4; }
    const rim = new Uint8Array(m.length);
    for (let v = -V + 2; v < V - 1; v++) for (let u = U0 + 2; u < U1 - 1; u++) { const i = (v + V) * w + (u - U0); if (!m[i]) continue; if (!m[i - 1] || !m[i + 1] || !m[i - w] || !m[i + w]) rim[i] = 3; else if (!m[i - 2] || !m[i + 2] || !m[i - 2 * w] || !m[i + 2 * w]) rim[i] = 5; }
    for (let i = 0; i < m.length; i++) if (rim[i]) m[i] = rim[i];
    return { m, U0, V, w, h };
  })();
  E.SETUP.giantray = (e) => { e.swim = true; e.aquatic = true; e.va = Math.PI / 2; e.form = 1; e.cd = 2.5; e.kids = []; e.hideBar = true; e.scatter = SLOTS.map(() => [rnd(-110, 110), rnd(-80, 80)]); e.S = Surface(280, 280); e.flap = 0; e.bank = 0; e.zapT = 0; };
  // its whole school shares one life: when it breaks apart, each ray carries an even share of what the Storm
  // Ray has left, so the swarm together has exactly the boss's health; rays cut down are gone for good,
  // and what gathers again is only what survived
  const swarmHp = (e) => (e.kids || []).reduce((a, k) => a + (k.dead ? 0 : Math.max(0, k.hp)), 0);
  function rayDies(e) { if (e.dead) return; e.hp = 0; e.dead = true; E.death(e); if (window.Combat && Combat.onKill) Combat.onKill(e); }
  AI.giantray = function (e, dt, t, P, L, api, d) {
    const fury = e.hp < e.max / 2, heroes = E.alive || [], D2 = fury ? 2 : 1;
    if (!e.announced && e.alerted) { e.announced = true; L.banner = { title: e.name, t0: t }; sfx(api, "electrocute"); }
    if (fury && !e.raged) { e.raged = true; L.banner = { title: "THE STORM BREAKS", sub: "Kai-Uila rages", t0: t }; sfx(api, "thunder"); Combat.shake = 1; e.state = "storm"; e.st = 0; e.rings = 0; }
    e.cd -= dt;
    e.untouchable = e.state === "swarm" || e.state === "break" || e.state === "reform" || e.state === "dive" || e.state === "under";
    const anyWater = [11, 12, 13], va0 = e.va;
    // anyone touching it is shocked
    e.zapT -= dt; if (e.form > 0.8 && e.zapT <= 0 && e.state !== "dive" && e.state !== "under" && hitAny(e, e.x, e.y - 6, 34, 1, null, "zap")) { e.zapT = 0.9; sfx(api, "zap"); }
    if (e.state === "idle" || e.state === "glide") {
      e.state = "glide"; e.form = Math.min(1, e.form + dt);
      steer(e, { x: P.x - Math.cos(t * 0.45) * 100, y: P.y - Math.sin(t * 0.45) * 66 }, anyWater, dt, fury ? 70 : 54, 1.2);
      if (e.cd <= 0) {
        const r = Math.random(); e.st = 0;
        if (r < (fury ? 0.18 : 0.14)) { e.state = "break"; sfx(api, "electrocute"); }
        else if (r < 0.32) { e.state = "storm"; e.rings = 0; sfx(api, "charge"); }
        else if (r < 0.46) { e.state = "call"; sfx(api, "charge"); }
        else if (r < 0.6) { e.state = "chain"; e.n = 0; sfx(api, "charge"); }
        else if (r < 0.74) { e.state = "dive"; sfx(api, "splash"); }
        else if (r < 0.88 || !fury) { e.state = "sweep"; e.aim = Math.atan2(P.y - e.y, P.x - e.x); e.hitSet = {}; e.sweeps = fury ? 2 : 1; sfx(api, "electrocute"); }
        else { e.state = "field"; sfx(api, "charge"); }
      }
    } else if (e.state === "storm") {
      // rings of lightning rolling out through the water one after another; enraged, they come in pairs
      if (e.st > 0.8 + e.rings * 0.34) { L.fx.push({ kind: "zap", x: e.x, y: e.y, t: 0, dur: 0.9, R: 170, dmg: D2 }); if (fury) L.fx.push({ kind: "zap", x: e.x, y: e.y, t: -0.17, dur: 0.9, R: 170, dmg: D2 }); sfx(api, "zap"); Combat.shake = Math.min(1, Combat.shake + 0.15); e.rings++; }
      if (e.rings >= (fury ? 5 : 4)) { e.state = "glide"; e.cd = rnd(1.1, 1.8); }
    } else if (e.state === "call") {
      // every hero is marked; bolts come down along where they're running, a beat apart
      if (!e.called) { e.called = true; for (const q of heroes) for (let k = 0; k < (fury ? 6 : 4); k++) L.fx.push({ kind: "strike", x: q.x + rnd(-8, 8) + (q.vx || 0) * 0.32 * (k + 1), y: q.y + rnd(-6, 6) + (q.vy || 0) * 0.32 * (k + 1), t: -k * 0.32, dur: 0.8, R: 17, dmg: D2 }); }
      if (e.st > 2.4) { e.called = false; e.state = "glide"; e.cd = rnd(1.1, 1.8); }
    } else if (e.state === "chain") {
      // arcs of lightning thrown straight at each hero from its body, three (enraged, five) in a row
      const N = fury ? 5 : 3;
      if (e.st > 0.45 + e.n * 0.38 && e.n < N) { for (const q of heroes) { const lead = 0.25, x2 = q.x + (q.vx || 0) * lead, y2 = q.y - 8 + (q.vy || 0) * lead; L.fx.push({ kind: "bolt", x: e.x, y: e.y - 4, x2, y2, t: 0, dur: 0.42, dmg: D2 }); } e.n++; sfx(api, "zap"); }
      if (e.st > 0.45 + N * 0.38 + 0.4) { e.state = "glide"; e.cd = rnd(1, 1.6); }
    } else if (e.state === "field") {
      // the water lights up in a lattice round each hero; the cells strike in a rolling wave, twice
      if (!e.called) { e.called = true; for (const q of heroes) for (let pass = 0; pass < 2; pass++) for (let i = -3; i <= 3; i++) for (let j = -2; j <= 2; j++) { if (((i + j) & 1) !== pass) continue; L.fx.push({ kind: "strike", x: q.x + i * 28, y: q.y + j * 22, t: -(Math.abs(i) + Math.abs(j)) * 0.14 - pass * 1.1, dur: 0.85, R: 14, dmg: 1 }); } }
      if (e.st > 3.2) { e.called = false; e.state = "glide"; e.cd = rnd(1.2, 1.8); }
    } else if (e.state === "sweep") {
      // a low, fast glide straight through you, crackling, dropping charge in its wake; enraged, it turns
      // and comes back
      e.va += angDiff(e.aim, e.va) * Math.min(1, dt * 5);
      const moved = swim(e, Math.cos(e.va) * 230 * dt, Math.sin(e.va) * 230 * dt, anyWater);
      hitAny(e, e.x, e.y - 6, 44, 2, e.hitSet, "ray");
      e.dropT = (e.dropT || 0) - dt; if (e.dropT <= 0) { e.dropT = 0.22; L.fx.push({ kind: "shock", x: e.x, y: e.y, t: -0.35, dur: 0.4, R: 34, dmg: 1 }); }
      if (!moved || e.st > 1.2) { if (--e.sweeps > 0) { e.state = "sweep"; e.st = -0.25; e.hitSet = {}; e.aim = Math.atan2(P.y - e.y, P.x - e.x); sfx(api, "electrocute"); } else { e.state = "glide"; e.cd = rnd(1, 1.6); } }
    } else if (e.state === "dive") {
      // it sinks out of sight...
      e.form = Math.max(0, 1 - e.st / 0.6);
      if (e.st > 0.6) { e.state = "under"; e.st = 0; e.tq = P; }
    } else if (e.state === "under") {
      // ...its shadow racing under the water toward you, then it bursts up beneath you in a blast of lightning
      const Q = e.tq && !e.tq.dead ? e.tq : P, a = Math.atan2(Q.y - e.y, Q.x - e.x), dq = Math.hypot(Q.x - e.x, Q.y - e.y);
      e.va += angDiff(a, e.va) * Math.min(1, dt * 4);
      if (dq > 8 && e.st < 1.6) swim(e, Math.cos(e.va) * Math.min(dq / dt, 190) * dt, Math.sin(e.va) * Math.min(dq / dt, 190) * dt, anyWater);
      if ((dq < 14 && e.st > 0.5) || e.st > 1.9) { e.state = "erupt"; e.st = 0; L.fx.push({ kind: "shock", x: e.x, y: e.y, t: -0.45, dur: 0.6, R: 76, dmg: 2 }); L.fx.push({ kind: "mark", x: e.x, y: e.y, t: 0, dur: 0.45, R: 70 }); sfx(api, "charge"); }
    } else if (e.state === "erupt") {
      if (e.st > 0.45 && !e.blasted) { e.blasted = true; e.form = 1; sfx(api, "electrocute"); sfx(api, "thunder"); Combat.shake = 1; for (let k = 0; k < 30; k++) { const a = Math.random() * TAU; Combat.addPart({ x: e.x, y: e.y, vx: Math.cos(a) * rnd(60, 200), vy: Math.sin(a) * rnd(40, 140) - 40, g: 200, life: rnd(0.4, 0.9), col: k % 2 ? "#e8f8ff" : "#9adcff", size: k % 3 ? 1 : 2, kind: "spark", glow: true }); } }
      e.form = e.st > 0.45 ? 1 : 0;
      if (e.st > 1.1) { e.blasted = false; e.state = "glide"; e.cd = rnd(0.9, 1.5); }
    } else if (e.state === "break") {
      e.form = Math.max(0, 1 - e.st / 0.6);
      if (e.st > 0.6) {
        e.state = "swarm"; e.st = 0; e.kids = [];
        const n = Math.min(SLOTS.length, 12 + heroes.length * 4), share = Math.max(1, e.hp / n);
        for (let k = 0; k < n; k++) { const [u, v] = SLOTS[(k * 5) % SLOTS.length], ca = Math.cos(e.va), sa = Math.sin(e.va); const r = E.spawn("rayling", e.x + ca * u - sa * v, e.y + sa * u + ca * v, 0, L); r.parent = e; r.va = e.va; r.alerted = true; r.tgt = heroes[k % Math.max(1, heroes.length)]; r.hp = r.max = share; r.slot = k; r.of = n; L.enemies.push(r); e.kids.push(r); }
      }
    } else if (e.state === "swarm") {
      e.hp = swarmHp(e);
      if (e.hp <= 0) { rayDies(e); return; }
      if (e.st > (fury ? 7.5 : 6.5) || e.kids.every((k) => k.dead)) { e.state = "reform"; e.st = 0; sfx(api, "charge"); }
    } else if (e.state === "reform") {
      for (const k of e.kids) if (!k.dead) { const dx = e.x - k.x, dy = e.y - k.y, l = Math.hypot(dx, dy); k.x += (dx / (l || 1)) * Math.min(l, 190 * dt); k.y += (dy / (l || 1)) * Math.min(l, 190 * dt); }
      e.hp = swarmHp(e); if (e.hp <= 0) { rayDies(e); return; }
      e.form = Math.min(1, e.st / 1.2);
      if (e.st > 1.2) { for (const k of e.kids) { k.dead = true; k.gone = true; } e.kids = []; e.state = "glide"; e.cd = rnd(1, 1.6); L.fx.push({ kind: "shock", x: e.x, y: e.y, t: 0, dur: 0.6, R: 100, dmg: 1 }); sfx(api, "electrocute"); }
    }
    // how it moves feeds its look: the wingbeat quickens with speed, it banks into turns
    const turn = angDiff(e.va, va0) / Math.max(dt, 1e-3);
    e.bank += (K.clamp(turn * 0.25, -0.5, 0.5) - e.bank) * Math.min(1, dt * 4);
    e.flap += dt * (e.state === "sweep" ? 5.2 : e.state === "storm" || e.state === "call" || e.state === "field" || e.state === "chain" ? 3.4 : 2.4);
  };
  // a ray of the school: circles its hero in a wheeling ring, and every so often one darts straight through,
  // crackling. Each carries its share of the Storm Ray's life, and blows to it come off the whole.
  E.SETUP.rayling = (e) => { e.swim = true; e.aquatic = true; e.hideBar = true; e.zapT = 0; e.dart = rnd(1.2, 3.2); };
  AI.rayling = function (e, dt, t, P, L, api) {
    const tg = e.tgt && !e.tgt.dead ? e.tgt : P, of = e.of || 12, ring = 46 + (e.slot % 3) * 14, a0 = t * 1.1 * (e.slot % 2 ? 1 : -1) + (e.slot / of) * TAU;
    e.dart -= dt;
    if (e.state === "dart") {
      if (!swim(e, Math.cos(e.va) * 240 * dt, Math.sin(e.va) * 240 * dt, [11, 12, 13])) e.st = 9;
      if (hitAny(e, e.x, e.y - 6, 12, 1, e.hitSet, "zap")) sfx(api, "zap");
      if (e.st > 0.55) { e.state = "idle"; e.st = 0; e.dart = rnd(1.8, 3.4); }
      return;
    }
    if (e.state === "windDart") { e.va += angDiff(Math.atan2(tg.y - e.y, tg.x - e.x), e.va) * Math.min(1, dt * 8); if (e.st > 0.4) { e.state = "dart"; e.st = 0; e.hitSet = {}; } return; }
    const goal = { x: tg.x + Math.cos(a0) * ring, y: tg.y + Math.sin(a0) * ring * 0.75 };
    e.va += angDiff(Math.atan2(goal.y - e.y, goal.x - e.x), e.va) * Math.min(1, dt * 4);
    if (!swim(e, Math.cos(e.va) * 120 * dt, Math.sin(e.va) * 120 * dt, [11, 12, 13])) e.va += 1.5;
    if (e.dart <= 0 && Math.hypot(tg.x - e.x, tg.y - e.y) < 120) { e.state = "windDart"; e.st = 0; }
    e.zapT -= dt; if (e.zapT <= 0 && hitAny(e, e.x, e.y - 6, 11, 1, null, "zap")) { e.zapT = 1.2; sfx(api, "zap"); }
  };
  E.DRAW.rayling = (e, ctx, ox, oy, t, g, introY, fl) => {
    const ch = e.state === "windDart" ? 0.6 + 0.4 * Math.sin(t * 40) : e.state === "dart" ? 0.9 : 0.2 + 0.2 * Math.sin(t * 9 + e.ph);
    drawRay(ctx, e.x - ox, e.y - oy, e.va, t * (e.state === "dart" ? 2 : 1.3), e.ph, 0.85, 0.66, ch, fl);
    if (e.state === "windDart") telegraph(ctx, e.x - ox, e.y - oy - 14, t);
    if (g && (e.state === "dart" || Math.sin(t * 7 + e.ph) > 0.7)) glow(g, e.x - ox, e.y - oy, e.state === "dart" ? 22 : 16, "140,200,255", 0.4);
  };
  E.DRAW.giantray = (e, ctx, ox, oy, t, g, introY, fl) => {
    if (e.state === "swarm") return;
    const hidden = e.state === "dive" || e.state === "under" || (e.state === "erupt" && e.st < 0.45);
    const f = hidden ? 1 : e.form, atk = e.state === "storm" || e.state === "call" || e.state === "field" || e.state === "chain";
    const ch = atk ? 0.5 + 0.5 * Math.sin(t * 20) : e.state === "sweep" ? 0.75 : 0.15 + 0.1 * Math.sin(t * 3);
    const ca = Math.cos(e.va), sa = Math.sin(e.va), S = e.S, W = S.w, cx = W / 2;
    const fp = e.flap !== undefined ? e.flap : t * 2.4, bank = e.bank || 0, fast = e.state === "sweep" ? 1.5 : 1;
    if (f > 0.25) {
      // the one great silhouette: deep navy, the small rays inside it a shade darker, its edge alive with
      // electric blue. It swims: a wave rolls out along each wing from the body to the tip (lifting and
      // foreshortening the wing as it goes), the long tail whips behind, and it banks into its turns.
      begin(S);
      const M = MASK, BODY = PAL.pk([8, 20, 44]), RAYS = PAL.pk([3, 10, 26]), RAYE = PAL.pk([34, 74, 132]), RIMA = PAL.pk([90, 180, 255]), RIMB = PAL.pk([200, 236, 255]), RIMC = PAL.pk([40, 90, 190]), SH = PAL.pk([4, 12, 24]);
      for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
        const dx = x - cx, dy = y - cx, v0 = -sa * dx + ca * dy, u0 = ca * dx + sa * dy;
        const side = v0 >= 0 ? 1 : -1, av = Math.min(1.2, Math.abs(v0) / 74), wave = Math.sin(fp - av * 2.6);
        // wing: the travelling wave lifts the tip forward/back and squeezes the span on the upstroke
        let u = u0 + wave * av * av * 11 * fast, v = v0 / (1 - 0.13 * Math.cos(fp - av * 2.2) * av) / (1 + bank * side * 0.22);
        // tail: a whip that runs down its length
        if (u0 < -36) { const k2 = Math.min(1, (-36 - u0) / 114); v -= Math.sin(t * 3.4 * fast - u0 * 0.07) * Math.pow(k2, 1.4) * 12; }
        u = Math.round(u); v = Math.round(v);
        const mu = u - M.U0, mv = v + M.V; if (mu < 0 || mv < 0 || mu >= M.w || mv >= M.h) continue;
        const k = M.m[mv * M.w + mu]; if (!k) continue;
        let c;
        if (hidden) c = k === 3 && K.hash2(u, v, (t * 10) | 0) > 0.85 ? RIMC : SH;
        else {
          c = k === 2 ? RAYS : k === 4 ? RAYE : BODY;
          if (k === 3) { const fl2 = K.hash2(u, v, (t * 12) | 0); c = fl2 > 0.82 - ch * 0.2 ? RIMB : fl2 > 0.35 ? RIMA : RIMC; }
          else if (k === 5) c = K.hash2(u, v, (t * 8) | 0) > 0.7 - ch * 0.3 ? RIMA : RIMC;
          else if (k === 1 && K.hash2(u >> 1, v >> 1, 7) > 0.985) c = PAL.pk([30, 70, 140]);
          // the wing's lifted crest catches the light
          else if (k === 1 && wave > 0.75 && av > 0.45) c = PAL.pk([16, 36, 74]);
        }
        S.d[y * W + x] = fl && !hidden ? L0.WHITE : c; mark(S, x, y);
      }
      flush(S, false);
      ctx.globalAlpha = hidden ? 0.42 : Math.min(1, f) * 0.88; ctx.drawImage(S.c, Math.round(e.x - cx - ox), Math.round(e.y - cx - oy)); ctx.globalAlpha = 1;
      if (hidden) { if (Math.random() < 0.5) Combat.addPart({ x: e.x + rnd(-30, 30), y: e.y + rnd(-20, 20), vx: 0, vy: -20, life: 0.4, col: "#cfefff", size: 1, kind: "spark" }); }
      // sparks shed from the trailing edges, as in the concept: the storm dissolving off its wings
      else if (Math.random() < 0.6 + ch * 0.4) { const [u, v] = SLOTS[(Math.random() * SLOTS.length) | 0], a2 = e.va + Math.PI + rnd(-0.6, 0.6); Combat.addPart({ x: e.x + ca * u - sa * v, y: e.y + sa * u + ca * v, vx: Math.cos(a2) * rnd(20, 60), vy: Math.sin(a2) * rnd(20, 60), drag: 1.5, life: rnd(0.4, 0.9), col: Math.random() < 0.5 ? "#9adcff" : "#e0f4ff", size: 1, kind: "spark", glow: true }); }
    }
    // the rays of the school, scattered while it breaks apart or gathers
    if (f < 1 && !hidden) { const pos = SLOTS.map(([u, v], k) => { const sx = e.x + e.scatter[k][0], sy = e.y + e.scatter[k][1], fx = e.x + ca * u - sa * v, fy = e.y + sa * u + ca * v; return [sx + (fx - sx) * f, sy + (fy - sy) * f]; }); pos.forEach(([x, y], k) => { if (k % 2) drawRay(ctx, x - ox, y - oy, e.va, t, k, 0.8, 0.6 * (1 - f), 0.3, fl); }); }
    // lightning crawling over its back, more and brighter as it gathers a strike
    if (f > 0.6 && !hidden) for (let k = 0; k < 6 + ch * 12; k++) { const a = SLOTS[(k * 7 + ((t * 9) | 0)) % SLOTS.length], b = SLOTS[(k * 11 + 5 + ((t * 9) | 0)) % SLOTS.length]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 28) continue; ctx.fillStyle = `rgba(200,235,255,${0.35 + ch * 0.6})`; for (let s2 = 0; s2 <= 1; s2 += 0.1) { const u = a[0] + (b[0] - a[0]) * s2, v = a[1] + (b[1] - a[1]) * s2; ctx.fillRect(Math.round(e.x + ca * u - sa * v - ox + (Math.random() - 0.5) * 2), Math.round(e.y + sa * u + ca * v - oy + (Math.random() - 0.5) * 2), 1, 1); } }
    if (g && !hidden) { glow(g, e.x - ox, e.y - oy, 120, "90,170,255", 0.18 + ch * 0.35); if (atk) glow(g, e.x - ox, e.y - oy, 50, "220,240,255", 0.3 * ch); }
    if (atk || e.state === "under") telegraph(ctx, e.x - ox, e.y - oy - (hidden ? 20 : 50), t);
  };
  E.ON_DEATH.giantray = (e) => { for (const k of e.kids || []) { k.dead = true; } Combat.shake = 1; };

  // ================================================================== pueo (great horned cliff owls)
  ST.pueo = { hp: 72, r: 9, mat: "flesh", kb: 80, fly: true, barY: 34, colors: ["#806040", "#e8d8b0", "#3a2818"] };
  const FLOCKS = {};
  E.SETUP.pueo = (e) => { e.perch = { x: e.x, y: e.y }; e.z = 14; e.state = "perch"; e.va = 0; e.untouchable = true; e.hideBar = true; e.cd = rnd(2, 3); e.fly = true; e.rock = 1; e.orbA = Math.random() * TAU; };
  // a pueo on its perch: the concept's sprite, scaled up a little, head turning now and then
  // the pueo in flight, from its own perched sprite: the folded wing is lifted off the sprite and swung out
  // from the shoulder (pre-rotated, nearest pixel, into stepped frames) and lengthened, beating slowly;
  // the body rides up and down with each beat
  let OWLF = null;
  function owlFlight() {
    if (OWLF) return OWLF;
    const S2 = img("e_owl"), W = S2.width, H = S2.height, [, sx] = K.canvas(W, H); sx.drawImage(S2, 0, 0);
    const d0 = new Uint32Array(sx.getImageData(0, 0, W, H).data.buffer), PX = 6, PY = 9;
    const wing = (x, y) => (x >= 0 && x <= 7 && y >= 8 && y < 25 ? d0[y * W + x] : 0);
    const N = 6, frames = [], R2 = 30;
    for (let f = 0; f < N; f++) {
      const ang = 1.05 + (f / (N - 1)) * 0.75, ca = Math.cos(ang), sa = Math.sin(ang), [c, x] = K.canvas(R2 * 2, R2 * 2), im = x.createImageData(R2 * 2, R2 * 2), o = new Uint32Array(im.data.buffer);
      for (let yy = 0; yy < R2 * 2; yy++) for (let xx = 0; xx < R2 * 2; xx++) {
        const dx = xx - R2, dy = yy - R2, ux = dx * ca + dy * sa, uy = (-dx * sa + dy * ca) / 1.45;   // back into the folded wing's frame, stretched along its length
        const v = wing(Math.round(PX + ux), Math.round(PY + uy)); if (v >>> 24) o[yy * R2 * 2 + xx] = v;
      }
      x.putImageData(im, 0, 0); frames.push(c);
    }
    return (OWLF = { frames, W, H, PX, PY, R2 });
  }
  function drawOwlFlight(ctx, x, y, t, flap, fl, carry) {
    const S2 = img("e_owl"), F = owlFlight(), s = 1.25, ph = (Math.sin(flap) + 1) / 2, fi = Math.min(F.frames.length - 1, Math.round(ph * (F.frames.length - 1)));
    const bob = Math.round((1 - ph) * 2), X = Math.round(x), Y = Math.round(y + bob), top = Y - Math.round(F.H * s), left = X - Math.round((F.W * s) / 2);
    const wf = fl ? tinted(F.frames[fi]) : F.frames[fi], R2 = F.R2 * s;
    for (const sg of [-1, 1]) {
      const sxp = sg < 0 ? left + F.PX * s : left + (F.W - F.PX) * s, syp = top + F.PY * s;
      ctx.save(); ctx.translate(Math.round(sxp), Math.round(syp)); ctx.scale(sg < 0 ? 1 : -1, 1); ctx.drawImage(wf, Math.round(-R2), Math.round(-R2), Math.round(R2 * 2), Math.round(R2 * 2)); ctx.restore();
    }
    ctx.drawImage(fl ? tinted(S2) : S2, left, top, Math.round(F.W * s), Math.round(F.H * s));
    if (carry) { const OB = R().obsidian, c = (col) => (fl ? "#ffffff" : rgb(col)); px(ctx, X - 6, Y - 2, 13, 10, c(OB[0])); px(ctx, X - 5, Y - 1, 11, 8, c(OB[3])); px(ctx, X - 4, Y - 1, 6, 2, c(OB[5])); px(ctx, X + 2, Y + 3, 3, 3, c(OB[1])); }
  }
  function drawPerched(ctx, x, y, t, fl, ph) { const S2 = img("e_owl"), s = 1.25, src = fl ? tinted(S2) : S2; ctx.fillStyle = "rgba(10,12,16,0.3)"; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), 8, 2.5, 0, 0, TAU); ctx.fill(); const flip = Math.sin(t * 0.7 + ph) > 0.6 ? -1 : 1; ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(flip, 1); ctx.drawImage(src, Math.round((-S2.width * s) / 2), Math.round(-S2.height * s), Math.round(S2.width * s), Math.round(S2.height * s)); ctx.restore(); }
  AI.pueo = function (e, dt, t, P, L, api, d, live) {
    const low = e.z < 16;
    e.untouchable = !low || e.state === "perch"; e.hideBar = e.untouchable;
    e.cd -= dt;
    const fly = (tx, ty, sp) => { const dx = tx - e.x, dy = ty - e.y, l = Math.hypot(dx, dy); if (l > 1) { const m = Math.min(l, sp * dt); e.x += (dx / l) * m; e.y += (dy / l) * m; e.face = dx >= 0 ? 1 : -1; } return l; };
    const flock = e.tribe ? (live || []).filter((o) => o.type === "pueo" && o.tribe === e.tribe && !o.dead && o.state !== "perch") : [e];
    const F = e.tribe ? FLOCKS[e.tribe] || (FLOCKS[e.tribe] = { next: t + 3, kind: 0 }) : null;
    if (e.state === "perch" || e.state === "idle") {
      e.state = "perch"; e.z = 14;
      if ((e.alerted || d < 210) && d < 230 && Level.sight(e.x, e.y - 20, P.x, P.y - 10) || e.alerted && d < 160) { e.alerted = true; e.state = "launch"; e.st = 0; sfx(api, "screech"); for (const o of live || []) if (o.type === "pueo" && o.tribe && o.tribe === e.tribe && o.state === "perch") { o.alerted = true; o.state = "launch"; o.st = -rnd(0.1, 0.5); } }
    } else if (e.state === "launch") { if (e.st > 0) { e.z = Math.min(44, e.z + dt * 90); if (e.st > 0.4) { e.state = e.rock ? "bomb" : "hunt"; e.st = 0; } } }
    else if (e.state === "bomb") {
      // straight over you with a stone in its talons, and let go
      e.z = Math.min(44, e.z + dt * 60); const Q = e.tq && !e.tq.dead ? e.tq : P; const l = fly(Q.x + (Q.vx || 0) * 0.3, Q.y - 2 + (Q.vy || 0) * 0.3, 150);
      if (l < 10 || e.st > 2.6) { e.rock = 0; L.fx.push({ kind: "rock", x: Q.x + (Q.vx || 0) * 0.3, y: Q.y + (Q.vy || 0) * 0.3, t: 0, dur: 1.05, R: 22, dmg: 2, tk: keyOf(Q), trk: 95 }); Combat.shake = Math.min(1, Combat.shake + 0.1); sfx(api, "throw"); e.state = "hunt"; e.st = 0; e.cd = rnd(1.6, 2.6); e.tq = null; }
    } else if (e.state === "hunt") {
      // it stays near: wheeling round you, just out of reach
      e.z += (34 - e.z) * Math.min(1, dt * 2); e.orbA += dt * 0.9 * (e.ph > 3 ? 1 : -1);
      fly(P.x + Math.cos(e.orbA) * 62, P.y + Math.sin(e.orbA) * 44, 95);
      if (F && flock.length > 1) {
        // the flock attacks together: all bombing at once (those still carrying stones), or swooping in turn
        if (t > F.next) { F.next = t + rnd(4.5, 6.5); F.kind = (F.kind + 1) % 2; flock.forEach((o, k) => { if (o.state !== "hunt") return; const Q = (E.alive || [])[k % Math.max(1, (E.alive || []).length)] || P; if (F.kind === 0 && o.rearm) { o.rock = 1; o.rearm = 0; o.state = "bomb"; o.tq = Q; o.st = 0; } else { o.state = "glare"; o.st = -k * 0.22; o.tq = Q; } }); sfx(api, "screech"); }
        if (Math.random() < dt * 0.08) e.rearm = 1;
      } else if (e.cd <= 0) { e.state = "glare"; e.st = 0; e.tq = P; }
    } else if (e.state === "glare") {
      e.z += (34 - e.z) * Math.min(1, dt * 2);
      if (e.st > 0.5) { const Q = e.tq && !e.tq.dead ? e.tq : P; e.aim = Math.atan2(Q.y - e.y, Q.x - e.x); e.state = "swoop"; e.st = 0; e.hitSet = {}; e.tx = Q.x + Math.cos(e.aim) * 44; e.ty = Q.y + Math.sin(e.aim) * 34; sfx(api, "wispSwoop"); }
    } else if (e.state === "swoop") {
      e.z = Math.max(5, e.z - dt * 100); const l = fly(e.tx, e.ty, 245);
      hitAny(e, e.x, e.y - e.z * 0.3 - 6, 16, 1, e.hitSet, "talons");
      if (l < 6) { e.state = "low"; e.st = 0; }
    } else if (e.state === "low") { e.z = 8 + Math.sin(t * 8) * 2; fly(e.x + Math.cos(t) * 10, e.y, 20); if (e.st > 1.1) { e.state = "hunt"; e.st = 0; e.cd = rnd(2.2, 3.4); } }
    if (e.state !== "perch" && Math.hypot(e.x - P.x, e.y - P.y) > 360) { e.state = "hunt"; }
  };
  E.DRAW.pueo = (e, ctx, ox, oy, t, g, introY, fl) => {
    const x = e.x - ox, y = e.y - oy;
    if (e.state === "perch") { drawPerched(ctx, x, y, t, fl, e.ph); return; }
    ctx.fillStyle = "rgba(10,12,16,0.28)"; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), 12 - Math.min(6, e.z / 8), 3, 0, 0, TAU); ctx.fill();
    drawOwlFlight(ctx, x, y - e.z, t, t * (e.state === "swoop" ? 4 : e.state === "glare" ? 12 : 6.5) + e.ph, fl, e.rock && (e.state === "bomb" || e.state === "launch"));
    if (e.state === "glare") { telegraph(ctx, x, y - e.z - 44, t); if (g) for (const sg of [-1, 1]) glow(g, x + sg * 4, y - e.z - 25, 8, "255,170,40", 0.6); }
  };

  // ================================================================== Pāpaʻi-Loa, the giant spider crab (L2 boss)
  ST.spidercrab = { hp: 1090, r: 26, mat: "wood", kb: 0, boss: true, big: 30, name: "PĀPAʻI-LOA, THE GIANT SPIDER CRAB", colors: ["#d86a3a", "#f4e0c8", "#8a3018"] };
  // eight stilt legs, four a side, and two long claw arms; every foot is planted and steps on its own
  // (right side: from forward-up round to back-down; the left side mirrors it)
  const LEGS = [];
  for (const side of [-1, 1]) [-0.95, -0.35, 0.25, 0.85].forEach((a, k) => LEGS.push({ a: side > 0 ? a : Math.PI - a, side, k, reach: 78 - Math.abs(k - 1.5) * 6 }));
  E.SETUP.spidercrab = (e) => { e.hideBar = true; e.cd = 2.5; e.va = 0; e.feet = null; e.called = 0; e.claw = 0; };
  function crabFeet(e, dt) {
    const ca = Math.cos(e.va), sa = Math.sin(e.va);
    const home = (L2) => ({ x: e.x + Math.cos(L2.a + e.va) * L2.reach, y: e.y + Math.sin(L2.a + e.va) * L2.reach * 0.75 });
    if (!e.feet) e.feet = LEGS.map((L2) => { const h = home(L2); return { x: h.x, y: h.y, fx: h.x, fy: h.y, lift: 0, u: 1 }; });
    let stepping = e.feet.filter((f) => f.u < 1).length;
    e.feet.forEach((f, i) => {
      const h = home(LEGS[i]);
      if (f.stab) { f.u = 1; return; }
      const lag = Math.hypot(h.x - f.x, h.y - f.y);
      if (f.u < 1) {
        // a step: its target follows the body while the foot is in the air, so it never lands behind
        f.tx += (h.x + (h.x - f.fx) * 0.25 - f.tx) * Math.min(1, dt * 10); f.ty += (h.y + (h.y - f.fy) * 0.25 - f.ty) * Math.min(1, dt * 10);
        f.u = Math.min(1, f.u + dt / (f.dur || 0.16)); const ease = f.u * f.u * (3 - 2 * f.u);
        f.x = f.fx + (f.tx - f.fx) * ease; f.y = f.fy + (f.ty - f.fy) * ease; f.lift = Math.sin(f.u * Math.PI) * 10; if (f.u >= 1) f.lift = 0;
      }
      else if (lag > 22 && (stepping < 3 || lag > 40) && ((i % 2) === ((e.t * 4) | 0) % 2 || lag > 34)) { f.fx = f.x; f.fy = f.y; f.tx = h.x + (h.x - f.x) * 0.3; f.ty = h.y + (h.y - f.y) * 0.3; f.u = 0; f.dur = lag > 40 ? 0.08 : lag > 30 ? 0.11 : 0.16; stepping++; }
    });
    void ca; void sa;
  }
  AI.spidercrab = function (e, dt, t, P, L, api, d, live) {
    const fury = e.hp < e.max / 2, toP = Math.atan2(P.y - e.y, P.x - e.x), heroes = E.alive || [];
    if (!e.announced && e.alerted) { e.announced = true; L.banner = { title: e.name, t0: t }; sfx(api, "clack"); }
    e.cd -= dt; e.armor = 1;
    const walk = (a, sp) => { e.moving = tryMove(e, Math.cos(a) * sp * dt, Math.sin(a) * sp * dt); };
    // calls the crabs of the atoll at half health and again at a quarter
    if ((e.hp < e.max * 0.5 && e.called < 1) || (e.hp < e.max * 0.25 && e.called < 2)) { e.called++; for (let k = 0; k < 2 + heroes.length; k++) { const a = (k / (2 + heroes.length)) * TAU, c = E.spawn(k % 3 === 2 ? "spitcrab" : "crab", e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 50, 990 + e.called, L); if (c && !Level.solidAt(c.x, c.y)) { c.alerted = true; c.enter = "burst"; c.introT = 0.9; L.enemies.push(c); } } L.banner = { title: "THE CRABS ANSWER", t0: t }; sfx(api, "warcry"); }
    e.va += angDiff(Math.cos(toP) >= 0 ? 0 : Math.PI, e.va) * 0;  // it always faces the camera, crab-wise; legs fan both ways
    if (e.state === "idle" || e.state === "stalk") {
      e.state = "stalk";
      const want = d > 120 ? toP : d < 70 ? toP + Math.PI : toP + Math.PI / 2 * (Math.sin(t * 0.5) > 0 ? 1 : -1);
      walk(want, fury ? 50 : 40);
      if (e.cd <= 0) {
        const r = Math.random(); e.st = 0;
        if ((r < 0.26 && d < 190) || (d > 80 && d < 190 && r < 0.5)) { e.state = "stabs"; e.n = 0; sfx(api, "clack"); }   // (its reach: the stabs are how it gets at you at a distance)
        else if (r < 0.46 && d < 150) { e.state = "windSweep"; e.aim = toP; e.sweeps = fury ? 2 : 1; sfx(api, "warcry"); }
        else if (r < 0.62) { e.state = "windScuttle"; e.aim = toP + (Math.random() < 0.5 ? 1 : -1) * Math.PI / 2; e.runs = fury ? 2 : 1; sfx(api, "clack"); }
        else if (r < 0.84) { e.state = "windFoam"; e.foam = Math.random() < 0.55 ? "fan" : "ring"; sfx(api, "inhale"); }
        else { e.state = "windPound"; sfx(api, "warcry"); }
      }
    } else if (e.state === "stabs") {
      // one leg after another lifted high and driven down where you stand
      const gap = fury ? 0.4 : 0.5, N = fury ? 5 : 3;
      if (e.st > e.n * gap && e.n < N) { for (const q of heroes) { if (Math.hypot(q.x - e.x, q.y - e.y) > 200) continue; const lead = 0.35 + (e.n % 2) * 0.15; let x2 = q.x + (q.vx || 0) * lead, y2 = q.y + (q.vy || 0) * lead; const dd = Math.hypot(x2 - e.x, y2 - e.y); if (dd > 170) { x2 = e.x + (x2 - e.x) * 170 / dd; y2 = e.y + (y2 - e.y) * 170 / dd; } L.fx.push({ kind: "stab", x: x2, y: y2, t: 0, dur: 0.6, R: 15, dmg: 2 }); const f = e.feet && e.feet.reduce((b, ff) => (!b || Math.hypot(ff.x - x2, ff.y - y2) < Math.hypot(b.x - x2, b.y - y2) ? ff : b), null); if (f) { f.stab = { x: x2, y: y2, t0: t }; } } e.n++; sfx(api, "clack"); }
      if (e.feet) for (const f of e.feet) if (f.stab && t - f.stab.t0 > 0.75) { f.x = f.stab.x; f.y = f.stab.y; f.stab = null; }
      if (e.st > N * gap + 0.8) { e.state = "stalk"; e.cd = rnd(1.3, 2); if (e.feet) for (const f of e.feet) f.stab = null; }
    } else if (e.state === "windSweep") { e.claw = Math.min(1, e.st / 0.65); e.aim += angDiff(toP, e.aim) * Math.min(1, dt * 2.2); if (e.st > 0.65) { e.state = "sweep"; e.st = 0; e.hitSet = {}; sfx(api, "spearSweep"); } }
    else if (e.state === "sweep") {
      // the long claw swung in a wide arc
      // the long claw swung in a wide arc; enraged, it comes straight back the other way
      const dir = e.sweepDir || 1, u = e.st / 0.32, a = e.aim - 1.4 * dir + u * 2.8 * dir; e.clawA = a; e.claw = 1;
      for (const q of heroes) { const k = keyOf(q); if (e.hitSet[k]) continue; const dq = Math.hypot(q.x - e.x, q.y - e.y); if (dq < 118 && dq > 18 && Math.abs(angDiff(Math.atan2(q.y - e.y, q.x - e.x), a)) < 0.38 && q._api.hurt(2, e.x, e.y, "claw")) { e.hitSet[k] = 1; Combat.shake = Math.min(1, Combat.shake + 0.35); } }
      if (e.st > 0.32) { if (--e.sweeps > 0) { e.state = "sweep"; e.st = -0.12; e.hitSet = {}; e.sweepDir = -dir; e.aim = toP; sfx(api, "spearSweep"); } else { e.state = "stalk"; e.claw = 0; e.sweepDir = 1; e.cd = rnd(1.3, 2); } }
    } else if (e.state === "windScuttle") { if (e.st > 0.6) { e.state = "scuttle"; e.st = 0; e.hitSet = {}; } }
    else if (e.state === "scuttle") {
      // sideways at a run, trampling whatever's in the way
      walk(e.aim, 235); hitAny(e, e.x, e.y - 8, 36, 2, e.hitSet, "trample");
      if (Math.random() < 0.5) Combat.addPart({ x: e.x + rnd(-24, 24), y: e.y + rnd(-4, 6), vx: rnd(-30, 30), vy: rnd(-50, -20), g: 200, life: 0.4, col: "#e8d8b0", size: 2, kind: "debris" });
      // enraged, it turns at the end of its run and comes back across
      if (!e.moving || e.st > 0.9) { if (--e.runs > 0) { e.state = "windScuttle"; e.st = 0.3; e.hitSet = {}; e.aim = toP + (Math.random() < 0.5 ? 0.6 : -0.6); sfx(api, "clack"); } else { e.state = "spent"; e.st = 0; Combat.shake = Math.min(1, Combat.shake + 0.3); sfx(api, "stone"); } }
    } else if (e.state === "spent") { e.armor = 1.4; if (e.st > 1) { e.state = "stalk"; e.cd = rnd(1.1, 1.6); } }
    else if (e.state === "windFoam") {
      // great foam bubbles that burst into three, and each of those into two: a fan thrown at you, or a
      // ring blown out all round (enraged, a second volley follows)
      const volley = (kind) => {
        if (kind === "fan") for (const q of heroes) { const a0 = Math.atan2(q.y - e.y, q.x - e.x), n = fury ? 4 : 3; for (let k = 0; k < n; k++) E.bubble(L, e.x, e.y - 16, a0 + (k - (n - 1) / 2) * 0.42, 3, { pop: rnd(0.95, 1.25), kids: 3, spread: 0.6 }); }
        else { const n = fury ? 7 : 5, off = Math.random() * TAU; for (let k = 0; k < n; k++) E.bubble(L, e.x, e.y - 16, off + (k / n) * TAU, 3, { pop: rnd(0.9, 1.15), kids: 3, spread: 0.55 }); }
        sfx(api, "splash");
      };
      if (e.st > 0.6 && !e.blown) { e.blown = 1; volley(e.foam); e.again = fury ? 1 : 0; }
      if (e.again && e.st > 1.5) { e.again = 0; volley(e.foam === "fan" ? "ring" : "fan"); }
      if (e.st > (fury ? 2 : 1.1)) { e.blown = 0; e.state = "stalk"; e.cd = rnd(1.5, 2.2); }
    }
    else if (e.state === "windPound") { e.claw = Math.min(1, e.st / 0.55); if (e.st > 0.6) { e.state = "pound"; e.st = 0; for (const sg of [-1, 1]) L.fx.push({ kind: "quake", x: e.x + sg * 40, y: e.y + 10, t: 0, dur: 0.55, R: 90, dmg: 2 }); if (fury) for (const q of heroes) if (Math.hypot(q.x - e.x, q.y - e.y) < 190) L.fx.push({ kind: "stab", x: q.x, y: q.y, t: -0.25, dur: 0.75, R: 16, dmg: 2 }); sfx(api, "stone"); Combat.shake = 1; } }
    else if (e.state === "pound") { if (e.st > 0.8) { e.state = "stalk"; e.claw = 0; e.cd = rnd(1.2, 2); } }
    crabFeet(e, dt);
  };
  E.NET.spidercrab = { ser: (q, o, r1) => { o.cw = Math.round((q.claw || 0) * 100) / 100; if (q.clawA !== undefined) o.ca = Math.round(q.clawA * 100) / 100; if (q.aim !== undefined) o.am2 = Math.round(q.aim * 100) / 100; }, app: (e, o) => { e.claw = o.cw; e.clawA = o.ca; e.aim = o.am2; }, tick: (e, dt) => crabFeet(e, dt) };
  E.DRAW.spidercrab = (e, ctx, ox, oy, t, g, introY, fl) => {
    const x = e.x - ox, y = e.y - oy + introY, body = 32, bodyY = y - 24 + Math.sin(t * 2) * 1.5;
    if (!e.feet) crabFeet(e, 0);
    const OR = [[120, 36, 20], [176, 66, 34], [216, 106, 58], [240, 150, 96], [250, 206, 170]], c = (col) => (fl ? "#ffffff" : rgb(col));
    // shadow under the body
    ctx.fillStyle = "rgba(10,12,16,0.32)"; ctx.beginPath(); ctx.ellipse(Math.round(x), Math.round(y), 34, 9, 0, 0, TAU); ctx.fill();
    // a leg: thigh up from the body to a high knee, shin down to the foot; orange with pale bands
    const leg = (f, i, front) => {
      const LG = LEGS[i], side = LG.side, sx = x + side * 13, sy = bodyY + Math.sin(LG.a) * 12;
      const fx2 = (f.stab ? f.stab.x : f.x) - ox, fy2 = (f.stab ? f.stab.y : f.y) - oy - f.lift - (f.stab && t - f.stab.t0 < 0.5 ? 26 * Math.sin(Math.min(1, (t - f.stab.t0) / 0.5) * Math.PI) : 0);
      const kx = sx + (fx2 - sx) * 0.42, ky = Math.min(sy, fy2) - 30 - (LG.k === 1 || LG.k === 2 ? 6 : 0);
      // each segment: a dark outline, then the shaded limb (lit along its top), pale bands and spines
      const seg = (ax, ay, bx, by, w0, w1) => {
        const n = Math.ceil(Math.hypot(bx - ax, by - ay)), nx = -(by - ay) / (n || 1), ny = (bx - ax) / (n || 1);
        for (const pass of [0, 1]) for (let k = 0; k <= n; k++) {
          const u = k / n, X = ax + (bx - ax) * u, Y = ay + (by - ay) * u, w = w0 + (w1 - w0) * u, band = ((k / 6) | 0) % 3 === 2;
          if (pass === 0) { ctx.fillStyle = c([60, 18, 12]); ctx.fillRect(Math.round(X - w / 2 - 1), Math.round(Y - w / 2 - 1), Math.round(w) + 2, Math.round(w) + 2); continue; }
          ctx.fillStyle = c(band ? OR[4] : OR[2]); ctx.fillRect(Math.round(X - w / 2), Math.round(Y - w / 2), Math.round(w), Math.round(w));
          ctx.fillStyle = c(band ? OR[4] : OR[3]); ctx.fillRect(Math.round(X - w / 2), Math.round(Y - w / 2), Math.round(w), 1);
          if (k % 5 === 0 && w > 2.5) { ctx.fillStyle = c(OR[4]); ctx.fillRect(Math.round(X + nx * w * 0.8), Math.round(Y + ny * w * 0.8), 1, 1); }
        }
      };
      if (front === Math.sin(LG.a) > 0) { seg(sx, sy, kx, ky, 5, 4); seg(kx, ky, fx2, fy2, 4, 2); ctx.fillStyle = c(OR[4]); ctx.fillRect(Math.round(kx - 2), Math.round(ky - 2), 4, 3); ctx.fillStyle = c(OR[0]); ctx.fillRect(Math.round(fx2 - 1), Math.round(fy2 - 1), 2, 3); }
    };
    e.feet.forEach((f, i) => leg(f, i, false));
    // the carapace: a rough pear, spined and spotted, with two small eyes on the front horn
    for (let yy = -body * 0.62; yy <= body * 0.62; yy++) for (let xx = -body * 0.75; xx <= body * 0.75; xx++) {
      const w = body * 0.75 * (1 - Math.max(0, -yy) / (body * 1.3)), d2 = (xx / w) ** 2 + (yy / (body * 0.62)) ** 2; if (d2 > 1) continue;
      const lit = -xx / w * 0.3 - yy / (body * 0.62) * 0.6, spot = K.hash2((xx + 40) >> 1, (yy + 40) >> 1, 13) > 0.9;
      let col = d2 > 0.85 ? OR[0] : spot ? OR[4] : lit > 0.4 ? OR[3] : lit > 0 ? OR[2] : OR[1];
      if (d2 < 0.85 && K.hash2(xx + 40, yy + 40, 14) > 0.96) col = OR[0];
      ctx.fillStyle = c(col); ctx.fillRect(Math.round(x + xx), Math.round(bodyY + yy), 1, 1);
    }
    for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * 0.32, rr = body * 0.6; ctx.fillStyle = c(OR[4]); ctx.fillRect(Math.round(x + Math.cos(a) * rr * 1.1), Math.round(bodyY + Math.sin(a) * rr - 1), 1, 2); }
    for (const sg of [-1, 1]) { ctx.fillStyle = c(OR[1]); ctx.fillRect(Math.round(x + sg * 3), Math.round(bodyY - body * 0.62 - 3), 1, 3); ctx.fillStyle = "#140c10"; ctx.fillRect(Math.round(x + sg * 3), Math.round(bodyY - body * 0.62 - 4), 1, 1); }
    // the claw arms: long, jointed, reaching forward (down the screen), one swinging on the sweep
    for (const sg of [-1, 1]) {
      const raised = e.claw || 0, swing = e.state === "sweep" && sg === (Math.cos(e.clawA || 0) >= 0 ? 1 : -1);
      const a = swing ? e.clawA : Math.PI / 2 + sg * 0.5 - raised * sg * 0.3, L1 = 30, L2 = swing ? 74 : 40 + raised * 10;
      const ax = x + sg * 10, ay = bodyY + 10, ex2 = ax + Math.cos(a - sg * 0.4) * L1, ey2 = ay + Math.sin(a - sg * 0.4) * L1 * 0.7 - raised * 18, hx = ex2 + Math.cos(a) * L2 * 0.8, hy = ey2 + Math.sin(a) * L2 * 0.6;
      for (const [p0, p1, w] of [[[ax, ay], [ex2, ey2], 6], [[ex2, ey2], [hx, hy], 5]]) { const n = Math.ceil(Math.hypot(p1[0] - p0[0], p1[1] - p0[1])); for (const pass of [0, 1]) for (let k = 0; k <= n; k++) { const u = k / n, X = Math.round(p0[0] + (p1[0] - p0[0]) * u - w / 2), Y = Math.round(p0[1] + (p1[1] - p0[1]) * u - w / 2); if (!pass) { ctx.fillStyle = c([60, 18, 12]); ctx.fillRect(X - 1, Y - 1, w + 2, w + 2); continue; } ctx.fillStyle = c(((k / 6) | 0) % 3 === 2 ? OR[4] : OR[2]); ctx.fillRect(X, Y, w, w); ctx.fillStyle = c(OR[3]); ctx.fillRect(X, Y, w, 1); if (k % 4 === 0) { ctx.fillStyle = c(OR[4]); ctx.fillRect(X + w, Y + 1, 1, 1); } } }
      // the pincer
      const open = e.state === "windSweep" || e.state === "windPound" ? 0.5 : 0.18;
      for (const sg2 of [-1, 1]) { const pa = a + sg2 * open; for (let k = 0; k < 14; k++) { const w = Math.max(2, 5 - k * 0.3); ctx.fillStyle = c([60, 18, 12]); ctx.fillRect(Math.round(hx + Math.cos(pa) * k - w / 2 - 1), Math.round(hy + Math.sin(pa) * k * 0.8 - w / 2 - 1), Math.round(w) + 2, Math.round(w) + 2); } for (let k = 0; k < 14; k++) { const w = Math.max(1, 4 - k * 0.3); ctx.fillStyle = c(k > 10 ? OR[4] : k % 4 === 0 ? OR[3] : OR[1]); ctx.fillRect(Math.round(hx + Math.cos(pa) * k - w / 2), Math.round(hy + Math.sin(pa) * k * 0.8 - w / 2), Math.round(w), Math.round(w)); } }
    }
    e.feet.forEach((f, i) => leg(f, i, true));
    if (e.state === "windSweep" || e.state === "windScuttle" || e.state === "windFoam" || e.state === "windPound") telegraph(ctx, x, bodyY - 30, t);
    if (e.state === "spent") for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1; px(ctx, x + Math.cos(a) * 12, bodyY - 26 + Math.sin(a) * 3, 2, 2, "#fff4b8"); }
  };

  // ================================================================== network: what guests need to draw these
  const net = { ser: (q, o, r1) => { if (q.va !== undefined) o.va = Math.round(q.va * 100) / 100; if (q.bank) o.bk = Math.round(q.bank * 100) / 100; if (q.z !== undefined) o.z = r1(q.z); if (q.untouchable) o.ut = 1; if (q.form !== undefined) o.fm = Math.round(q.form * 100) / 100; if (q.aim !== undefined) o.am2 = Math.round(q.aim * 100) / 100; if (q.rock) o.rk = 1; if (q.stranded) o.sd = 1; },
    app: (e, o) => { if (o.va !== undefined) e.va = o.va; e.bank = o.bk || 0; if (o.z !== undefined) e.nz = o.z; e.untouchable = !!o.ut; if (o.fm !== undefined) e.form = o.fm; if (o.am2 !== undefined) e.aim = o.am2; e.rock = o.rk ? 1 : 0; e.stranded = !!o.sd; },
    tick: (e, dt) => { if (e.nz !== undefined) e.z = (e.z || 0) + (e.nz - (e.z || 0)) * Math.min(1, dt * 12); if (e.hist) { e.hist.unshift([e.x, e.y]); if (e.hist.length > 36) e.hist.length = 36; } } };
  for (const k of ["crab", "spitcrab", "brute", "shark", "bigshark", "tshark", "ray", "giantray", "rayling", "pueo"]) E.NET[k] = net;
})();
