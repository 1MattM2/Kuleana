// Kuleana: stage 1. Walk around the island outside the temple.
(function () {
  const T = K.TILE;
  const TOUCH = !!(window.TouchPad && TouchPad.enabled);
  const BASE_W = TOUCH ? 400 : 480, BASE_H = TOUCH ? 225 : 270;      // minimum internal resolution (game pixels); a little closer on phones
  const screen = document.getElementById("game");
  const sctx = screen.getContext("2d");
  const HARD_FILTER = typeof sctx.filter === "string" && !!document.getElementById("hardAlpha");
  let weapL, wctx, layerA, actx, layerB, bctx, hud, hctx, fxL, fctx, hardL, hardCtx, glowL, gctx, VW = BASE_W, VH = BASE_H, SCALE = 3;

  // ------------------------------------------------------------------ assets
  const A = { img: {}, px: {}, flip: {}, meta: window.ASSET_META || {} };
  async function loadAssets() {
    const names = Object.keys(window.ASSET_DATA);
    await Promise.all(names.map(async (n) => { A.img[n] = await K.loadImage(window.ASSET_DATA[n]); }));
    for (const n of names) {
      if (n.startsWith("tex_") || n.startsWith("t_")) A.px[n] = K.pixels(A.img[n]);
      else if (!A.meta[n]) A.flip[n] = K.flipped(A.img[n]);
    }
  }

  // ------------------------------------------------------------------ hero sprites
  const C = window.CHARART;
  const heroFrames = {}; // dir -> [frame][tail variant] canvases
  const heroSil = {};
  function buildHero() {
    for (const dir of ["down", "up", "side"]) {
      heroFrames[dir] = [];
      for (let f = 0; f < 4; f++) {
        const pair = [];
        for (let tv = 0; tv < 2; tv++) {
          const [c, ctx] = K.canvas(24, 32);
          const bob = f === 1 || f === 3 ? 1 : 0;
          const swing = f === 1 ? 1 : f === 3 ? -1 : 0;
          K.pixmap(ctx, C.LEGS[dir][f], C.PAL, 0, 25);
          K.pixmap(ctx, C.HERO[dir], C.PAL, 0, bob);
          for (const [x, y, ch] of C.TAILS[dir][tv]) { ctx.fillStyle = K.css(C.PAL[ch]); ctx.fillRect(x, y + bob, 1, 1); }
          if (dir === "side") K.pixmap(ctx, C.ARM_SIDE, C.PAL, 11 + swing, 17 + bob, false, 4);
          else {
            K.pixmap(ctx, C.ARM_L, C.PAL, 2, 17 + bob + swing, false, 4);
            K.pixmap(ctx, C.ARM_R, C.PAL, 18, 17 + bob - swing, false, 4);
          }
          pair.push(c);
        }
        heroFrames[dir].push(pair);
      }
    }
    heroFrames.left = heroFrames.side.map((p) => p.map((c) => K.flipped(c)));
    const [m, mctx] = K.canvas(24, 32);
    K.pixmap(mctx, C.MERCHANT, C.MERCHANT_PAL, 0, 0);
    heroFrames.merchant = m;
    // silhouettes for the sea cave: solid night-dark body, cyan rim where the glow catches the edge
    const sil = (src) => {
      const [c, ctx] = K.canvas(24, 32);
      ctx.drawImage(src, 0, 0);
      const d = ctx.getImageData(0, 0, 24, 32), p = d.data, o = new Uint8ClampedArray(p.length);
      const op = (x, y) => x >= 0 && y >= 0 && x < 24 && y < 32 && p[(y * 24 + x) * 4 + 3] > 0;
      for (let y = 0; y < 32; y++) for (let x = 0; x < 24; x++) {
        if (!op(x, y)) continue;
        const i = (y * 24 + x) * 4;
        const rimR = !op(x + 1, y), rimL = !op(x - 1, y), rimD = !op(x, y + 1), rimU = !op(x, y - 1);
        let c2 = [8, 12, 26];
        if (rimR || rimD) c2 = [86, 206, 238]; else if (rimL) c2 = [40, 120, 170]; else if (rimU) c2 = [22, 40, 70];
        o[i] = c2[0]; o[i + 1] = c2[1]; o[i + 2] = c2[2]; o[i + 3] = 255;
      }
      ctx.putImageData(new ImageData(o, 24, 32), 0, 0);
      return c;
    };
    for (const k of ["down", "up", "side", "left"]) heroSil[k] = heroFrames[k].map((pair) => pair.map(sil));
  }

  // co-op heroes: the same warrior, told apart by headband (and a pip over the head). Slot 0 (the
  // host) wears the island red, slot 1 sun-gold, slot 2 sea-teal. The vest is the armour you wear.
  const SLOT_COL = ["#e8644c", "#f2c040", "#5ad0c8"];
  const SLOT_PAL = [{}, { r: [236, 170, 50], R: [176, 108, 34] }, { r: [80, 206, 196], R: [40, 132, 132] }];
  const outfitFrames = new Map();
  function buildFrames(PP) {
    const F = {};
    for (const dir of ["down", "up", "side"]) {
      F[dir] = [];
      for (let f = 0; f < 4; f++) {
        const pair = [];
        for (let tv = 0; tv < 2; tv++) {
          const [c, ctx] = K.canvas(24, 32), bob = f === 1 || f === 3 ? 1 : 0, swing = f === 1 ? 1 : f === 3 ? -1 : 0;
          K.pixmap(ctx, C.LEGS[dir][f], PP, 0, 25); K.pixmap(ctx, C.HERO[dir], PP, 0, bob);
          for (const [x, y, ch] of C.TAILS[dir][tv]) { ctx.fillStyle = K.css(PP[ch]); ctx.fillRect(x, y + bob, 1, 1); }
          if (dir === "side") K.pixmap(ctx, C.ARM_SIDE, PP, 11 + swing, 17 + bob, false, 4);
          else { K.pixmap(ctx, C.ARM_L, PP, 2, 17 + bob + swing, false, 4); K.pixmap(ctx, C.ARM_R, PP, 18, 17 + bob - swing, false, 4); }
          pair.push(c);
        }
        F[dir].push(pair);
      }
    }
    F.left = F.side.map((p) => p.map((c) => K.flipped(c)));
    return F;
  }
  function buildPartner() {}
  const framesFor = (slot, outfit) => {
    const key = (slot || 0) + ":" + (outfit || "");
    if (key === "0:") return heroFrames;
    let F = outfitFrames.get(key);
    if (!F) { const A2 = outfit && window.Gear && Gear.ARMOR[outfit]; F = buildFrames(Object.assign({}, C.PAL, SLOT_PAL[slot] || {}, A2 ? A2.pal : {})); outfitFrames.set(key, F); }
    return F;
  };

  // ------------------------------------------------------------------ input
  const keys = {};
  let pressedE = false;
  addEventListener("keydown", (e) => {
    if (window.Title && Title.open) return;
    if (e.target && e.target.tagName === "INPUT") return;          // typing a join code
    if (window.Menu && Menu.open) { if (!e.repeat) Menu.key(e); for (const k in keys) keys[k] = false; return; }
    if (pick.open) { if (!e.repeat) pickKey(e.code); for (const k in keys) keys[k] = false; e.preventDefault(); return; }
    if (invUI.open) { if (!e.repeat && (e.code === "Escape" || e.code === "KeyI")) invUI.open = false; for (const k in keys) keys[k] = false; e.preventDefault(); return; }
    if (e.code === "KeyI" && !e.repeat && !dialog && !globe.open && !loadoutUI.open && !shopUI.open && !forgeUI.open) { invUI.open = true; return; }
    if (shopUI.open) { if (!e.repeat) shopKey(e.code); for (const k in keys) keys[k] = false; e.preventDefault(); return; }
    if (forgeUI.open) { if (!e.repeat) forgeKey(e.code); for (const k in keys) keys[k] = false; e.preventDefault(); return; }
    if (loadoutUI.open) { if (!e.repeat) loadoutKey(e.code); for (const k in keys) keys[k] = false; e.preventDefault(); return; }
    if (globe.open) { if (!e.repeat) globeKey(e.code); for (const k in keys) keys[k] = false; e.preventDefault(); return; }
    if (e.code === "Escape" && !e.repeat) { window.Menu && Menu.toggle(true); for (const k in keys) keys[k] = false; return; }
    if (e.code === "KeyC" && !e.repeat) { window.Menu && Menu.toggle(true, "coop"); for (const k in keys) keys[k] = false; return; }
    keys[e.code] = true;
    window.Ambience && Ambience.start();
    if (e.code === "KeyM") Ambience.toggleMute();
    if (e.code === "KeyE" || e.code === "Enter") pressedE = true;
    if (e.code === "KeyJ" && !e.repeat && !dialog && fade.dir === 0 && !player.dead) Combat.attack();
    if ((e.code === "Space" || e.code === "KeyK") && !e.repeat && !dialog && fade.dir === 0 && !player.dead) startRoll();
    if (e.code === "KeyH" && !e.repeat && !player.dead) useHeal();
    if (e.code === "KeyT" && !e.repeat && !player.dead && !dialog && fade.dir === 0) useTalisman();
    if (e.code === "KeyY" && !e.repeat) { const k = Gear.nextPick(); if (k) Combat.nums.push({ x: player.x, y: player.y - 44, v: Gear.TALISMANS[k].name, crit: false, t0: Combat.clock, col: Gear.ELEMENTS[Gear.TALISMANS[k].el].col }); }
    if (e.code === "KeyQ" && !e.repeat) Combat.cycle(-1);
    if (e.code === "KeyR" && !e.repeat) Combat.cycle(1);
    if (/^Digit[1-5]$/.test(e.code)) Combat.selectSlot(+e.code.slice(5) - 1);
    if (e.code.startsWith("Arrow") || e.code === "Space" || e.code === "Tab") e.preventDefault();
  });
  addEventListener("keyup", (e) => (keys[e.code] = false));
  addEventListener("pointerdown", (e) => { if (window.Title && Title.open) return; window.Ambience && Ambience.start(); if (window.Menu && Menu.open) return; if (pick.open) { pickTap(e); return; } if (invUI.open) { invUI.open = false; return; } if (shopUI.open) { shopTap(e); return; } if (forgeUI.open) { forgeTap(e); return; } if (loadoutUI.open) { loadoutTap(e); return; } if (globe.open) { globeTap(e); return; } if (e.pointerType !== "mouse" || player.dead) return; if (e.button === 0 && !dialog && fade.dir === 0) Combat.attack(); if (e.button === 2 && !dialog && fade.dir === 0) startRoll(); });
  addEventListener("contextmenu", (e) => e.preventDefault());
  addEventListener("wheel", (e) => Combat.cycle(e.deltaY > 0 ? 1 : -1), { passive: true });
  addEventListener("blur", () => { for (const k in keys) keys[k] = false; });

  // ------------------------------------------------------------------ player
  const player = { x: 0, y: 0, dir: "down", frame: 0, anim: 0, moving: false, stepT: 0, hp: 10, maxHp: 10, inv: 0, rolling: false, rollT: 0, rollCd: 0, moveA: 0, kx: 0, ky: 0, hurtT: -9 };
  let flowT = 0;   // slow-motion after a perfect dodge
  function startRoll() {
    if (player.rolling || player.rollCd > 0 || Combat.busy || scene === "island" && false) return;
    let ix = 0, iy = 0;
    if (keys.KeyA || keys.ArrowLeft) ix -= 1; if (keys.KeyD || keys.ArrowRight) ix += 1; if (keys.KeyW || keys.ArrowUp) iy -= 1; if (keys.KeyS || keys.ArrowDown) iy += 1;
    if (TOUCH && TouchPad.mag > 0) { ix = TouchPad.x; iy = TouchPad.y; }
    if (!ix && !iy) { const a = player.dir === "down" ? Math.PI / 2 : player.dir === "up" ? -Math.PI / 2 : player.dir === "left" ? Math.PI : 0; ix = Math.cos(a); iy = Math.sin(a); }
    const l = Math.hypot(ix, iy); player.rollA = Math.atan2(iy / l, ix / l);
    player.rolling = true; player.rollT = 0; player.rollCd = 0.55 * Gear.stats().rollCd;
    Ambience.sfx && Ambience.sfx("roll");
  }
  // damage from enemies. Returns false if avoided (rolling / invulnerable). A hit that lands
  // during the first instant of a roll is a perfect dodge: time slows and momentum surges.
  function hurtPlayer(dmg, sx, sy, src) {
    if (player.dead) return false;
    if (player.rolling) {
      if (player.rollT < 0.2 && !player.perfectUsed) { player.perfectUsed = true; flowT = 0.55; Combat.momentum = Math.min(100, Combat.momentum + 25); Combat.momT = Combat.clock; perfectT = time; Ambience.sfx && Ambience.sfx("perfect"); }
      return false;
    }
    if (player.inv > 0) return false;
    const g = Gear.incoming(dmg, src);
    if (g.blocked) { player.inv = 0.35; Combat.nums.push({ x: player.x, y: player.y - 40, v: "BLOCK", crit: false, t0: Combat.clock, col: "#d8e0f0" }); Ambience.sfx && Ambience.sfx("guardHit"); return false; }
    if (g.dmg <= 0) return false;
    dmg = g.dmg;
    player.hp -= dmg; player.inv = 0.9; player.hurtT = time;
    const kb = Gear.stats().kb, a = Math.atan2(player.y - sy, player.x - sx); player.kx = Math.cos(a) * 160 * kb; player.ky = Math.sin(a) * 130 * kb;
    Combat.shake = Math.min(1, Combat.shake + 0.6); Combat.lastStop = -9; Combat.stopFor(0.06); Combat.flash = 0.3; Combat.flashCol = "255,80,80";
    Combat.loseMomentum(0.35);
    Ambience.sfx && Ambience.sfx("hurt");
    if (player.hp <= 0 && scene === "level" && Level.cur && Level.cur.def.dojo) { dojoYield(); return true; }
    if (player.hp <= 0) { player.hp = 0; player.dead = true; deathT = time; player.downed = scene === "level" && mateHere(); }
    return true;
  }
  let perfectT = -9, deathT = -9;
  // ------------------------------------------------------------------ co-op
  // Partners as this machine knows them (up to two), keyed by slot: their latest reported state,
  // smoothed between packets. The host is slot 0; guests are 1 and 2.
  const mates = new Map();
  const newMate = (slot) => ({ slot, x: 0, y: 0, tx: 0, ty: 0, dir: "down", frame: 0, moving: false, rolling: false, rollA: 0, rollT: 0, hp: 10, maxHp: 10, dead: false, inv: 0, hitInv: 0, isRemote: true, sc: null, lv: null, w: 0, busy: false, tier: 0, tailT: 0, seen: -9, rv: -1, rp: 0 });
  const mateOf = (slot) => { let m = mates.get(slot); if (!m) mates.set(slot, (m = newMate(slot))); return m; };
  const isHere = (q) => window.Net && Net.active() && time - q.seen < 3 && q.sc === scene && (scene !== "level" || (Level.cur && q.lv === Level.cur.name));
  const matesHere = () => [...mates.values()].filter(isHere);
  const mateHere = () => matesHere().length > 0;
  const mySlot = () => (window.Net && Net.active() ? Net.slot || 0 : 0);
  let netSendT = 0, netSnapT = 0, netGo = false, guestAsked = -9;
  const sfxQ = [];
  function sceneName() { return scene === "level" ? Level.cur.name : scene; }
  // a message for one hero, wherever they are: the host delivers it; a guest asks the host to
  function deliver(slot, m) {
    if (slot === mySlot()) { onNet(m, mySlot()); return; }
    if (Net.isHost()) Net.sendTo(slot, m); else Net.send({ ...m, fw: slot });
  }
  function onNet(m, from) {
    // the host passes on what one guest says for another
    if (window.Net && Net.isHost() && m.fw !== undefined) { const to = m.fw; delete m.fw; if (to === 0) onNet(m, from); else Net.sendTo(to, m); return; }
    const id = m.id !== undefined ? m.id : from;
    switch (m.t) {
      case "p": {     // a partner's hero
        if (id === mySlot()) break;
        if (Net.isHost()) Net.send(m, id);                // let the other guest see them too
        const q = mateOf(id), jump = Math.hypot(m.x - q.tx, m.y - q.ty) > 90 || q.sc !== m.sc || time - q.seen > 1;
        Object.assign(q, { tx: m.x, ty: m.y, dir: m.d, frame: m.f, moving: !!m.mv, rolling: !!m.ro, rollA: m.ra, rollT: m.rt, hp: m.hp, maxHp: m.mx, dead: !!m.dd, inv: m.iv, w: m.w, busy: !!m.b, attacking: !!m.b, tier: m.tr, sc: m.sc, lv: m.lv, seen: time, rv: m.rv ?? -1, rp: m.rp || 0, outfit: m.o || null });
        if (jump) { q.x = m.x; q.y = m.y; }
        break;
      }
      case "atk": {
        if (id === mySlot()) break;
        if (Net.isHost()) Net.send(m, id);
        const q = mates.get(id); if (q && isHere(q)) { if (m.b) Combat.unleash(q, m.w, m.a, m.b[0], m.b[1], Net.isHost()); else Combat.ghost(q, m.w, m.m, m.a, Net.isHost()); }
        break;
      }
      case "snap": if (Net.isGuest() && scene === "level" && Level.cur && Level.cur.name === m.lv) { Enemies.applySnap(Level.cur, m.en); Level.applySnap(Level.cur, m.lvl, time); for (const k of m.sfx || []) Ambience.sfx && Ambience.sfx(k); } break;
      case "scene": if (Net.isGuest()) { netGo = true; fade.dir = 0; Level.players = m.n || Net.count(); goTo(m.to); netGo = false; } break;
      case "hurt": hurtPlayer(m.d, m.x, m.y, m.s); break;
      case "heal": player.hp = Math.min(player.maxHp, player.hp + m.n * Gear.stats().healMul); break;
      case "shard": gotShard(m.el); break;
      case "shell": gotShell(m.k); break;
      case "blast": if (Net.isHost()) { const q = mates.get(m.id !== undefined ? m.id : from); if (q) Combat.blast(q, m.x, m.y, m.r, m.o, true); } break;
      case "tp": player.x = m.x; player.y = m.y; if (blocked(player.x, player.y)) unstick(); break;
      case "banner": banner = { title: m.title, sub: m.sub || "", t0: time }; break;
      case "revive":   // a partner held you up for long enough: back on your feet with half your hearts
        if (player.dead && player.downed) { player.dead = false; player.downed = false; player.hp = Math.ceil(player.maxHp / 2); player.inv = 2; banner = { title: "REVIVED", sub: (m.by || "A partner") + " got you back up", t0: time }; Ambience.sfx && Ambience.sfx("berry"); }
        break;
      case "sync": if (m.un) for (const n of m.un) Level.unlock(n); if (m.portal) { Level.portalUnlocked = true; if (Level.cur) Level.cur.portalOpen = true; } if (m.gift) grant(m.gift); if (m.heel) { Level.heelTaken = true; Combat.gain(Level.DEFS.highlands.shrine.unlock); if (Level.cur) Level.cur.shrineTaken = true; } break;
      case "pvp": if (scene === "level" && Level.cur && Level.cur.duelPvp) hurtPlayer(m.n, m.x, m.y, "duel"); break;
      case "duel": if (scene === "level" && Level.cur && Level.cur.def.dojo === "duel") { Level.cur.duelPvp = true; player.hp = player.maxHp; banner = { title: "DUEL!", sub: "First to fall yields", t0: time }; Ambience.sfx && Ambience.sfx("warcry"); } break;
      case "duelEnd": if (scene === "level" && Level.cur) { Level.cur.duelPvp = false; player.hp = player.maxHp; banner = { title: m.loser === mySlot() ? "YOU YIELD" : "YOUR PARTNER YIELDS", sub: m.loser === mySlot() ? "Well fought" : "The duel is yours", t0: time }; } break;
      case "act":     // a guest asks the host to do something that changes the shared world
        if (!Net.isHost()) break;
        if (m.k === "go" && (!Level.DEFS[m.to] || m.to === "sanctum" || Level.unlocked.has(m.to) || scene === "level")) goTo(m.to);
        else if (m.k === "talk") { Level.portalUnlocked = true; if (Level.cur) Level.cur.portalOpen = true; Net.send({ t: "sync", portal: 1 }); Ambience.sfx && Ambience.sfx("portal"); }
        else if (m.k === "shrine") takeShrine(false);
        else if (m.k === "dojo") dojoCall(m.hall, m.key);
        break;
    }
  }
  function unstick() { const sx = player.x, sy = player.y; for (let r = 4; r < 160; r += 4) for (let a = 0; a < Math.PI * 2; a += 0.3) { const x = sx + Math.cos(a) * r, y = sy + Math.sin(a) * r; if (!blocked(x, y)) { player.x = x; player.y = y; return; } } }
  // ---- knocked down, and reviving: in co-op a fallen hero stays down until a partner stands over
  // them holding E (or the touch Use button) for three seconds.
  const REVIVE_T = 3, REVIVE_R = 38;
  const rev = { target: -1, t: 0 };
  function updateRevive(dt) {
    const holding = (keys.KeyE || keys.Enter) && !player.dead && !dialog && fade.dir === 0;
    let tgt = null, bd = REVIVE_R;
    if (!player.dead) for (const q of matesHere()) if (q.dead) { const d = Math.hypot(q.x - player.x, q.y - player.y); if (d < bd) { bd = d; tgt = q; } }
    if (tgt && tgt.slot !== rev.target) { rev.target = tgt.slot; rev.t = 0; }
    if (!tgt) { rev.target = -1; rev.t = 0; return; }
    if (!holding) { rev.t = Math.max(0, rev.t - dt * 2); return; }
    rev.t += dt;
    if (rev.t >= REVIVE_T) { deliver(tgt.slot, { t: "revive", by: "Your partner" }); tgt.dead = false; rev.t = 0; rev.target = -1; Ambience.sfx && Ambience.sfx("berry"); }
  }
  function netTick(dt) {
    if (!window.Net || !Net.active()) return;
    for (const q of mates.values()) { q.hitInv = Math.max(0, q.hitInv - dt); const k = Math.min(1, dt * 12); q.x += (q.tx - q.x) * k; q.y += (q.ty - q.y) * k; }
    if (time > netSendT) {
      netSendT = time + 0.05;
      Net.send({ t: "p", id: mySlot(), sc: scene, lv: scene === "level" ? Level.cur.name : null, x: Math.round(player.x * 10) / 10, y: Math.round(player.y * 10) / 10, d: player.dir, f: player.frame, mv: player.moving ? 1 : 0, ro: player.rolling ? 1 : 0, ra: player.rollA || 0, rt: player.rollT || 0, hp: player.hp, mx: player.maxHp, dd: player.dead ? 1 : 0, iv: player.inv > 0 ? 1 : 0, w: Combat.cur, b: Combat.busy ? 1 : 0, tr: Combat.momTier(), o: Gear.wornId(), rv: rev.target, rp: Math.round((rev.t / REVIVE_T) * 100) / 100 });
    }
    if (Net.isHost() && scene === "level" && time > netSnapT && fade.dir === 0) {
      netSnapT = time + 1 / 15;
      Net.send({ t: "snap", lv: Level.cur.name, en: Enemies.serialize(Level.cur), lvl: Level.serialize(Level.cur), sfx: sfxQ.splice(0, 8) });
    }
    sfxQ.length = Math.min(sfxQ.length, 16);
  }
  if (window.Net) {
    Net.onData = onNet;
    Net.onConnect = (slot) => {
      if (window.Title && Title.open) Title.quickStart();
      if (Net.isHost()) {
        banner = { title: "CO-OP", sub: `A partner has joined (${Net.count()} heroes)`, t0: time };
        Net.sendTo(slot, { t: "scene", to: sceneName(), n: Net.count() }); Net.sendTo(slot, { t: "sync", portal: Level.portalUnlocked ? 1 : 0, heel: Level.heelTaken ? 1 : 0, un: [...Level.unlocked] });
      } else banner = { title: "CO-OP", sub: "You joined the party", t0: time };
    };
    Net.onRoster = (slots) => { for (const s of [...mates.keys()]) if (!slots.includes(s)) mates.delete(s); };
    Net.onDisconnect = (was, slot) => {
      banner = { title: "CO-OP", sub: was === "host" && slot >= 0 ? "A partner has left" : "Co-op has ended", t0: time };
      if (was === "host" && slot >= 0) { mates.delete(slot); return; }
      mates.clear();
      if (player.dead && player.downed) { player.dead = false; player.downed = false; player.hp = Math.ceil(player.maxHp / 2); }
      if (was === "guest" && scene === "level") { fade.dir = 0; goTo(Level.cur.name); }   // the creatures here were the host's: bring the area back to life solo
    };
    Combat.onMoveStart = (w, m, a) => Net.send({ t: "atk", id: mySlot(), w, m, a: Math.round(a * 1000) / 1000 });
  }
  const levelApi = {
    hurt: hurtPlayer,
    sfx: (k) => { Ambience.sfx && Ambience.sfx(k); if (window.Net && Net.isHost()) sfxQ.push(k); },
    shell: (k, q) => { if (q && q.isRemote) { Net.sendTo(q.slot, { t: "shell", k }); return; } gotShell(k); },
    shard: (el, q) => { if (q && q.isRemote) { Net.sendTo(q.slot, { t: "shard", el }); return; } gotShard(el); },
    heal: (n, q) => { if (q && q.isRemote) { Net.sendTo(q.slot, { t: "heal", n }); return; } player.hp = Math.min(player.maxHp, player.hp + n * Gear.stats().healMul); healT = time; },
    teleport: (q, x, y) => { if (q.isRemote) Net.sendTo(q.slot, { t: "tp", x, y }); },
    // a partner is hit on the host's screen: tell them (their own roll may still save them)
    hurtRemote: (q, d, sx, sy, src) => { if (q.dead || q.hitInv > 0) return false; Net.sendTo(q.slot, { t: "hurt", d, x: sx, y: sy, s: src }); if (q.rolling || q.inv) return false; q.hitInv = 0.9; return true; },
  };
  let healT = -9, regenT = 0, metMakani = false;
  // shells washed up on the island's beaches. The tide brings a new lot only after a real expedition
  // (at least halfway through a level): a third of the time the beach is bare; otherwise 1-5 shells,
  // mostly one or two. Each is common 70% of the time, uncommon 25%, rare 5% (kinds split evenly).
  // Uncollected shells stay where they are, and are saved with the game.
  const beach = [];
  const BEACH = { bare: 0.35, counts: [30, 28, 22, 13, 7] };
  function rollBeach() {
    beach.length = 0;
    if (!World.terr || !World.landDist || Math.random() < BEACH.bare) { Gear.state().beach = []; return; }
    let w = Math.random() * BEACH.counts.reduce((a, b) => a + b, 0), n = 1; for (const c of BEACH.counts) { if (w < c) break; w -= c; n++; }
    for (let tries = 0; tries < 600 && beach.length < n; tries++) {
      const x = 40 + Math.random() * (World.W - 80), y = 40 + Math.random() * (World.H - 80), i = (y | 0) * World.W + (x | 0);
      if (World.terr[i] !== World.SAND || World.landDist[i] > 14 || World.landDist[i] < 4 || blockedIsland(x, y)) continue;
      const r = Math.random(); beach.push({ x: Math.round(x), y: Math.round(y), k: Gear.randomShell(r < 0.7 ? 0 : r < 0.95 ? 1 : 2) });
    }
    Gear.state().beach = beach.map((b) => ({ x: b.x, y: b.y, k: b.k }));
  }
  function washShells() {
    const S = Gear.state();
    if (S.beachDue) { S.beachDue = false; rollBeach(); return; }
    beach.length = 0; for (const b of S.beach || []) beach.push({ x: b.x, y: b.y, k: b.k });
  }
  // a level counts as an expedition once at least half its arenas are cleared
  Level.onProgress = (L) => {
    const n = L.arenas.length, done = L.arenas.filter((a) => a.state === "done").length;
    if (n && done >= Math.ceil(n / 2)) Gear.state().beachDue = true;
    // the land is won: a handful of shells (more and rarer in harder lands; repeat clears pay about half)
    if (n && done === n && !L.paid && !testWorld && !L.def.dojo) {
      L.paid = true; const r = Gear.payout(L.name); if (!r) return;
      const parts = [`${r.nc} common`].concat(r.nu ? [`${r.nu} uncommon`] : []).concat(r.rare ? [r.rare > 1 ? `${r.rare} rare!` : "a rare one!"] : []);
      setTimeout(() => { banner = { title: "SHELLS", sub: parts.join(", ") + (r.first ? "" : "  (a repeat clear)"), t0: time }; Ambience.sfx && Ambience.sfx("pickup"); }, 5500);
      Game.save();
    }
  };
  const blockedIsland = (x, y) => { for (const b of Props.colliders) if (x > b[0] - 6 && x < b[2] + 6 && y > b[1] - 6 && y < b[3] + 6) return true; return false; };
  function useHeal() {
    if (player.hp >= player.maxHp) return;
    const n = Gear.takeHeal(player.hp, player.maxHp); if (!n) return;
    player.hp = Math.min(player.maxHp, player.hp + n * Gear.stats().healMul); healT = time; Ambience.sfx && Ambience.sfx("berry");
    for (let k = 0; k < 14; k++) Combat.addPart({ x: player.x + (Math.random() - 0.5) * 14, y: player.y - Math.random() * 24, vx: 0, vy: -30, g: -10, life: 0.8, col: k % 2 ? "#ff8a8a" : "#ffffff", size: 1, kind: "ember", glow: true });
  }
  // a talisman: a one-use super attack: its element's weapon special, grander
  function useTalisman() {
    const k = Gear.pick(); if (!k) return;
    const Tm = Gear.TALISMANS[k], E = Gear.ELEMENTS[Tm.el], wi = Combat.indexOf(Tm.weapon); if (wi < 0 || !Gear.spend(k)) return;
    const a = player.dir === "left" ? Math.PI : player.dir === "up" ? -Math.PI / 2 : player.dir === "down" ? Math.PI / 2 : 0;
    Combat.unleash(player, wi, a, Tm.r, 1.6, true);
    if (window.Net && Net.active()) Net.send({ t: "atk", id: mySlot(), w: wi, m: -1, a: Math.round(a * 1000) / 1000, b: [Tm.r, 1.6] });
    banner = { title: Tm.name.toUpperCase(), sub: Combat.weapons[wi].ult.name, t0: time };
    Combat.flash = 0.6; Combat.flashCol = E.glow; Combat.shake = 1;
  }
  function gotShell(k) {
    Gear.addShell(k); const sh = Gear.SHELLS[k];
    Combat.nums.push({ x: player.x, y: player.y - 44, v: "+" + sh.name, crit: sh.tier === 2, t0: Combat.clock, col: ["#f4e6c8", "#9ae0ff", "#ffd27a"][sh.tier] });
    Ambience.sfx && Ambience.sfx(sh.tier ? "pickup" : "berry");
  }
  function gotShard(el) {
    Gear.addShard(el); const E = Gear.ELEMENTS[el], n = Gear.state().shards[el];
    banner = { title: E.name.toUpperCase() + " SHARD", sub: n >= Gear.COST ? `${n} shards: enough for the forge` : `${n} of ${Gear.COST}`, t0: time };
    Ambience.sfx && Ambience.sfx("pickup");
  }
  // rewards for clearing a level: a weapon, a suit of armour ("armor:id"), or someone rescued ("rescue:who")
  function grant(id) {
    if (id.startsWith("armor:")) { const k = id.slice(6), A2 = Gear.ARMOR[k]; if (Gear.gainArmor(k)) banner = { title: A2.name.toUpperCase(), sub: "New armour, worn. Change it in Settings > Gear", t0: time + 2.5 }; }
    else if (id.startsWith("rescue:")) { const who = id.slice(7); if (Gear.rescue(who)) banner = who === "vendor" ? { title: "MAKANI THE TRADER IS FREE", sub: "He is reopening his stall on your island", t0: time + 5 } : { title: "KAMAKA THE SMITH IS FREE", sub: "He is building his forge on your island", t0: time + 5 }; }
    else { const w = Combat.weapons.find((q) => q.id === id); if (Combat.gain(id) && w) banner = { title: w.name.toUpperCase(), sub: "A new weapon is yours", t0: time + 2.5 }; }
  }
  Level.onUnlock = () => { if (window.Net && Net.isHost()) Net.send({ t: "sync", un: [...Level.unlocked] }); };

  // ------------------------------------------------------------------ Kahu Lā's globe
  // A little world turning in the keeper's hands. Each zone is an island on it; its levels are pins.
  // Pick one and he sends the whole party there.
  const globe = { open: false, zone: 0, sel: 0, rot: 0, pins: [], tex: null, can: null };
  function openGlobe() {
    // open on the furthest zone you've reached
    globe.zone = Math.max(0, Level.ZONES.reduce((b, z, i) => (z.levels.some((n) => Level.unlocked.has(n)) ? i : b), 0));
    globe.open = true; const z = Level.ZONES[globe.zone], un = z.levels.filter((n) => Level.unlocked.has(n));
    globe.sel = Math.max(0, z.levels.indexOf(un[un.length - 1] || z.levels[0])); globe.t0 = time;
    Ambience.sfx && Ambience.sfx("portal");
  }
  function globeKey(code) {
    const z = Level.ZONES[globe.zone], n = Math.max(1, z.levels.length);
    if (code === "Escape" || code === "KeyQ") globe.open = false;
    else if (code === "ArrowLeft" || code === "KeyA" || code === "ArrowUp" || code === "KeyW") globe.sel = (globe.sel + n - 1) % n;
    else if (code === "ArrowRight" || code === "KeyD" || code === "ArrowDown" || code === "KeyS" || code === "KeyR") globe.sel = (globe.sel + 1) % n;
    else if (code === "KeyE" || code === "Enter" || code === "KeyJ" || code === "Space") travel();
    else if (code === "Tab") { globe.zone = (globe.zone + 1) % Level.ZONES.length; globe.sel = 0; }
  }
  function travel() {
    const z = Level.ZONES[globe.zone], name = z.levels[globe.sel];
    if (!name || !Level.unlocked.has(name)) { Ambience.sfx && Ambience.sfx("guard"); return; }
    globe.open = false; Level.dest = name;
    // a real choice to make (more than five weapons, more than one suit, or items to pack)? prepare first
    if (Combat.unlocked.size > Combat.LOADOUT_MAX || Gear.state().armors.length >= 2 || Gear.units() >= 2) { openLoadout(name); return; }
    Gear.packTidy(true);
    Ambience.sfx && Ambience.sfx("portal"); goTo(name);
  }
  // ------------------------------------------------------------------ the test world
  // A sandbox from the main menu: every weapon, suit, cloth and creature, unending heals and talismans,
  // a free market, everyone rescued and every building up, the whole of Hale Koa (every wing), and a
  // beach strewn with every kind of shell. Nothing in it is ever saved.
  let testWorld = false;
  function beginTestWorld() {
    testWorld = true; Gear.infinite = true;
    const S = Gear.state();
    for (const k of Object.keys(Gear.ARMOR)) if (!S.armors.includes(k)) S.armors.push(k);
    S.worn = "obsidian";
    S.items = { tonic: 5, salve: 3 }; for (const k of Object.keys(Gear.TALISMANS)) S.items[k] = 3;
    S.pack = ["salve", "t_plasma"]; S.pick = "t_plasma";
    for (const k of Gear.ORDER) S.shards[k] = 99;
    for (const k of Object.keys(Gear.SHELLS)) S.shells[k] = 99;
    S.book = true; for (const k of Object.keys(Gear.BEASTS)) S.kills[k] = Math.max(1, S.kills[k] || 0);
    for (const w of ["vendor", "smith"]) Gear.rescue(w); for (const pl of Gear.PLOTS) Gear.build(pl.id);
    S.dojo = 4;
    for (const z of Level.ZONES) for (const n of z.levels) { Level.unlocked.add(n); Level.cleared.add(n); }
    Level.portalUnlocked = true; Level.heelTaken = true;
    for (const w of Combat.weapons) Combat.unlocked.add(w.id);
    Combat.loadout = ["lua", "spear", "maul", "storm", "starfall"]; Combat.cur = Combat.indexOf("lua"); Combat.ensureOpen();
    // the beach: fifteen shells, at least one of every kind
    const kinds = Object.keys(Gear.SHELLS), want = kinds.concat(Array.from({ length: 15 - kinds.length }, () => kinds[(Math.random() * kinds.length) | 0]));
    beach.length = 0;
    for (let tries = 0; tries < 6000 && beach.length < 15; tries++) { const x = 40 + Math.random() * (World.W - 80), y = 40 + Math.random() * (World.H - 80), i = (y | 0) * World.W + (x | 0); if (World.terr[i] !== World.SAND || World.landDist[i] > 14 || World.landDist[i] < 4 || blockedIsland(x, y)) continue; beach.push({ x: Math.round(x), y: Math.round(y), k: want[beach.length] }); }
    S.beach = beach.map((b) => ({ x: b.x, y: b.y, k: b.k }));
    Gear.changed(); applyGear(); player.hp = player.maxHp;
    banner = { title: "THE TEST WORLD", sub: "Everything is yours. Nothing here is kept.", t0: time + 0.6 };
  }
  // ------------------------------------------------------------------ a list to choose from (Hale Koa's lecterns)
  const pick = { open: false, sel: 0, hit: [], list: [], title: "", sub: "", onPick: null, top: 0 };
  function openPicker(title, sub, list, onPick) { if (!list.length) { banner = { title, sub: "Nothing to call here yet: meet some creatures out in the world first.", t0: time }; return; } Object.assign(pick, { open: true, sel: 0, top: 0, title, sub, list, onPick }); }
  function pickChoose(i) { const it = pick.list[i]; pick.open = false; if (it && pick.onPick) pick.onPick(it); }
  function pickKey(code) {
    const n = pick.list.length;
    if (code === "Escape" || code === "KeyQ") pick.open = false;
    else if (code === "ArrowDown" || code === "KeyS") pick.sel = (pick.sel + 1) % n;
    else if (code === "ArrowUp" || code === "KeyW") pick.sel = (pick.sel + n - 1) % n;
    else if (code === "KeyE" || code === "Enter" || code === "KeyJ" || code === "Space") pickChoose(pick.sel);
  }
  function pickTap(e) {
    const gx = (e.clientX * (screen.width / innerWidth)) / SCALE, gy = (e.clientY * (screen.height / innerHeight)) / SCALE;
    for (const h of pick.hit) if (gx > h.x && gx < h.x + h.w && gy > h.y && gy < h.y + h.h) { if (h.close) pick.open = false; else if (h.up) pick.sel = Math.max(0, pick.sel - 1); else if (h.down) pick.sel = Math.min(pick.list.length - 1, pick.sel + 1); else if (h.i === pick.sel) pickChoose(h.i); else pick.sel = h.i; return; }
  }
  function drawPicker(t) {
    const u = SCALE, RH = 19, rows = Math.max(3, Math.min(pick.list.length, Math.floor((VH - 70) / RH))), pw = Math.min(VW - 16, 320), ph = 46 + rows * RH, px0 = Math.round((VW - pw) / 2), py0 = Math.round((VH - ph) / 2);
    if (pick.sel < pick.top) pick.top = pick.sel; if (pick.sel >= pick.top + rows) pick.top = pick.sel - rows + 1;
    const R = (c, x, y, w, h) => { sctx.fillStyle = c; sctx.fillRect(x * u, y * u, w * u, h * u); };
    sctx.fillStyle = "rgba(6,8,14,0.55)"; sctx.fillRect(0, 0, screen.width, screen.height);
    R("#1e100a", px0, py0, pw, ph); R("#c8a060", px0 + 1, py0 + 1, pw - 2, ph - 2); R("#2a1a12", px0 + 2, py0 + 2, pw - 4, ph - 4);
    sctx.textBaseline = "top"; sctx.textAlign = "center";
    sctx.font = `${10 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#ffe08a"; sctx.fillText(pick.title, (VW / 2) * u, (py0 + 6) * u);
    sctx.font = `${6 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#d8c8a8"; sctx.fillText(pick.sub, (VW / 2) * u, (py0 + 19) * u);
    pick.hit = [{ x: px0 + pw - 14, y: py0 + 4, w: 10, h: 10, close: 1 }];
    for (let r = 0; r < rows; r++) {
      const i = pick.top + r, it = pick.list[i]; if (!it) break;
      const y = py0 + 32 + r * RH, sel = i === pick.sel;
      if (sel) R("rgba(255,224,138,0.16)", px0 + 4, y - 2, pw - 8, RH - 2);
      sctx.textAlign = "left"; sctx.font = `${7 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = sel ? "#ffffff" : "#f0e2c8"; sctx.fillText(it.name, (px0 + 10) * u, y * u);
      sctx.font = `${5 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#a8987c"; const sub = it.sub.length > 78 ? it.sub.slice(0, 76) + "…" : it.sub; sctx.fillText(sub, (px0 + 14) * u, (y + 9) * u);
      pick.hit.push({ x: px0 + 4, y: y - 2, w: pw - 8, h: RH - 2, i });
    }
    if (pick.top > 0) { R("#c8a060", VW / 2 - 6, py0 + 26, 12, 3); pick.hit.push({ x: VW / 2 - 10, y: py0 + 24, w: 20, h: 8, up: 1 }); }
    if (pick.top + rows < pick.list.length) { R("#c8a060", VW / 2 - 6, py0 + ph - 6, 12, 3); pick.hit.push({ x: VW / 2 - 10, y: py0 + ph - 10, w: 20, h: 8, down: 1 }); }
    R("#c8a060", px0 + pw - 14, py0 + 4, 10, 10); sctx.textAlign = "center"; sctx.font = `${8 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#2a1a12"; sctx.fillText("x", (px0 + pw - 9) * u, (py0 + 4) * u);
    sctx.textAlign = "left";
  }
  // ------------------------------------------------------------------ the inventory (I)
  // What you carry: weapons in hand and all you own, the armour you wear, your purse (every kind of
  // shell), your shards, and your items with the two packed for battle.
  const invUI = { open: false };
  function drawInventory(t) {
    const u = SCALE, pw = Math.min(VW - 12, 440), ph = Math.min(VH - 12, 250), px0 = Math.round((VW - pw) / 2), py0 = Math.round((VH - ph) / 2);
    const R = (c, x, y, w, h) => { sctx.fillStyle = c; sctx.fillRect(x * u, y * u, w * u, h * u); };
    const T2 = (txt, x, y, size, col, al) => { sctx.font = `${size * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = col; sctx.textAlign = al || "left"; sctx.fillText(txt, x * u, y * u); };
    sctx.fillStyle = "rgba(8,6,14,0.6)"; sctx.fillRect(0, 0, screen.width, screen.height);
    R("#1a1220", px0, py0, pw, ph); R("#c08a3e", px0 + 1, py0 + 1, pw - 2, ph - 2); R("#221828", px0 + 2, py0 + 2, pw - 4, ph - 4);
    sctx.textBaseline = "top"; sctx.imageSmoothingEnabled = false;
    T2("INVENTORY", VW / 2, py0 + 6, 10, "#ffe08a", "center");
    const colW = Math.floor((pw - 24) / 2), lx = px0 + 10, rx = lx + colW + 8;
    // weapons in hand
    let y = py0 + 22; T2("IN HAND", lx, y, 6, "#a89880"); y += 9;
    Combat.loadout.forEach((id, k) => { const w = Combat.weapons[Combat.indexOf(id)], x = lx + k * 32; R(w.col, x, y, 30, 30); R("#2c2030", x + 1, y + 1, 28, 28); sctx.drawImage(w.icon, (x + 1) * u, (y + 1) * u, 28 * u, 28 * u); T2(String(k + 1), x + 3, y + 2, 6, w.col); });
    y += 34; const cw = Combat.weapons[Combat.cur]; T2(cw.name, lx, y, 7, "#fff6dc"); T2(cw.cls + (cw.ult ? "  ·  special: " + cw.ult.name : ""), lx, y + 9, 5, cw.col);
    // every weapon you own
    y += 20; T2(`ALL WEAPONS  (${Combat.unlocked.size})`, lx, y, 6, "#a89880"); y += 9;
    Combat.weapons.forEach((w, i) => { if (!Combat.unlocked.has(w.id)) return; const k = [...Combat.unlocked].indexOf(w.id), x = lx + (k % 9) * 21, yy = y + Math.floor(k / 9) * 21; R("#3a2e3c", x, yy, 20, 20); sctx.drawImage(w.icon, (x + 1) * u, (yy + 1) * u, 18 * u, 18 * u); });
    // armour
    y = py0 + 154; T2("ARMOUR", lx, y, 6, "#a89880"); y += 9;
    const A2 = Gear.worn();
    if (A2) { R(PAL.css(A2.pal.V), lx, y, 14, 18); R(PAL.css(A2.pal.v), lx + 1, y + 1, 12, 16); R(PAL.css(A2.pal.l), lx + 1, y + 1, 4, 16); T2(A2.name, lx + 20, y + 1, 7, "#fff6dc"); }
    else T2("Island clothes", lx + 2, y + 1, 7, "#a89880");
    const st = Gear.stats(); T2(`${player.maxHp / 2} hearts${st.block ? `  ·  ${Math.round(st.block * 100)}% block` : ""}${st.speed !== 1 ? `  ·  +${Math.round((st.speed - 1) * 100)}% speed` : ""}${st.el ? `  ·  ${Gear.ELEMENTS[st.el].name} weapons +${Math.round((st.elMul - 1) * 100)}%` : ""}`, lx + 20, y + 11, 5, "#c8b890");
    if (A2) T2(A2.desc, lx, y + 22, 5, "#a89880");
    // the purse: every shell you have
    y = py0 + 22; T2("PURSE", rx, y, 6, "#a89880"); y += 10;
    T2(`${Gear.shellTotal()} shells`, rx, y + 1, 7, "#ffe08a");
    y += 14;
    Object.entries(Gear.SHELLS).forEach(([k, sh], i) => { const x = rx + (i % 2) * (colW / 2), yy = y + Math.floor(i / 2) * 17; sctx.imageSmoothingEnabled = false; sctx.drawImage(Gear.shellIcon(k), x * u, yy * u, 16 * u, 16 * u); T2(`${Gear.state().shells[k]}  ${sh.name}`, x + 18, yy + 5, 5, ["#f4e6c8", "#9ae0ff", "#ffd27a"][sh.tier]); });
    y += 70;
    // shards
    T2("SHARDS", rx, y, 6, "#a89880"); y += 9;
    Gear.ORDER.forEach((el, i) => { const E = Gear.ELEMENTS[el], x = rx + (i % 5) * (colW / 5), yy = y + Math.floor(i / 5) * 11; R(E.col, x, yy + 1, 4, 6); T2(String(Gear.state().shards[el]), x + 7, yy, 6, Gear.state().shards[el] ? "#fff6dc" : "#5a4a58"); });
    y += 26;
    // items, and the pack
    T2("ITEMS", rx, y, 6, "#a89880"); y += 9;
    let ix = rx; for (const id of Gear.PERISH()) { const n = Gear.count(id); if (!n) continue; itemIcon(hudTmp(), id, 0, 0); sctx.drawImage(hudTmpC, 0, 0, 16, 16, ix * u, y * u, 16 * u, 16 * u); T2(String(n), ix + 17, y + 6, 6, "#fff6dc"); ix += 28; }
    if (ix === rx) T2("none", rx, y + 4, 6, "#5a4a58");
    T2(`packed for battle: ${Gear.pack().map(itemName).join(", ") || "nothing"}`, rx, y + 20, 5, "#c8b890");
    T2(TOUCH ? "Tap to close" : "I or Esc to close", VW / 2, py0 + ph - 10, 5, "#a89880", "center");
    sctx.textAlign = "left";
  }
  // ------------------------------------------------------------------ Makani's shop
  const shopUI = { open: false, sel: 0, hit: [], msg: "", msgT: -9, top: 0 };
  function openShop() { shopUI.open = true; shopUI.msg = ""; Ambience.sfx && Ambience.sfx("equip"); }
  function shopBuy(i) { const it = Gear.shopList()[i]; if (Gear.buy(it)) { shopUI.msg = `Mahalo! The ${it.name} is yours.`; Ambience.sfx && Ambience.sfx("pickup"); Game.save(); } else { shopUI.msg = Gear.soldOut(it) ? "You can't carry any more of that." : "Not enough shells for that."; Ambience.sfx && Ambience.sfx("guard"); } shopUI.msgT = time; }
  function shopKey(code) {
    const n = Gear.shopList().length;
    if (code === "Escape" || code === "KeyQ") shopUI.open = false;
    else if (code === "ArrowDown" || code === "KeyS") shopUI.sel = (shopUI.sel + 1) % n;
    else if (code === "ArrowUp" || code === "KeyW") shopUI.sel = (shopUI.sel + n - 1) % n;
    else if (code === "KeyE" || code === "Enter" || code === "KeyJ" || code === "Space") shopBuy(shopUI.sel);
  }
  function shopTap(e) {
    const gx = (e.clientX * (screen.width / innerWidth)) / SCALE, gy = (e.clientY * (screen.height / innerHeight)) / SCALE;
    for (const h of shopUI.hit) if (gx > h.x && gx < h.x + h.w && gy > h.y && gy < h.y + h.h) { if (h.close) shopUI.open = false; else if (h.i === shopUI.sel) shopBuy(h.i); else shopUI.sel = h.i; return; }
  }
  function drawShop(t) {
    const u = SCALE, items = Gear.shopList(), RH = 15, rows = Math.max(4, Math.min(items.length, Math.floor((VH - 92) / RH))), pw = Math.min(VW - 16, 360), ph = 74 + rows * RH, px0 = Math.round((VW - pw) / 2), py0 = Math.round((VH - ph) / 2);
    if (shopUI.sel < shopUI.top) shopUI.top = shopUI.sel; if (shopUI.sel >= shopUI.top + rows) shopUI.top = shopUI.sel - rows + 1;
    const R = (c, x, y, w, h) => { sctx.fillStyle = c; sctx.fillRect(x * u, y * u, w * u, h * u); };
    sctx.fillStyle = "rgba(6,8,12,0.5)"; sctx.fillRect(0, 0, screen.width, screen.height);
    R("#1a1220", px0, py0, pw, ph); R("#c08a3e", px0 + 1, py0 + 1, pw - 2, ph - 2); R("#231a26", px0 + 2, py0 + 2, pw - 4, ph - 4);
    sctx.textBaseline = "top"; sctx.textAlign = "center";
    sctx.font = `${10 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#ffe08a"; sctx.fillText("MAKANI'S TRADES", (VW / 2) * u, (py0 + 6) * u);
    // your shells along the top
    const ks = Object.keys(Gear.SHELLS); let sx = px0 + 10;
    sctx.font = `${6 * u}px 'Pixelify Sans', monospace`; sctx.textAlign = "left";
    for (const k of ks) { sctx.imageSmoothingEnabled = false; sctx.drawImage(Gear.shellIcon(k), sx * u, (py0 + 18) * u, 16 * u, 16 * u); tip(sx, py0 + 18, 16, 16, Gear.SHELLS[k].name); sctx.fillStyle = "#fff6dc"; sctx.fillText(String(Gear.state().shells[k]), (sx + 17) * u, (py0 + 23) * u); sx += Math.floor((pw - 20) / ks.length); }
    shopUI.hit = [{ x: px0 + pw - 14, y: py0 + 4, w: 10, h: 10, close: 1 }];
    for (let r = 0; r < rows && shopUI.top + r < items.length; r++) {
      const i = shopUI.top + r, it = items[i], y = py0 + 40 + r * RH, sel = i === shopUI.sel, can = Gear.canBuy(it), out = Gear.soldOut(it);
      if (sel) R("rgba(255,210,122,0.16)", px0 + 4, y - 1, pw - 8, RH - 1);
      const col = it.kind === "shard" ? Gear.ELEMENTS[it.el].col : it.kind === "talisman" ? Gear.ELEMENTS[Gear.TALISMANS[it.id].el].col : it.kind === "heal" ? "#ff8a8a" : "#e8d8b0";
      if (it.kind === "shard") { sctx.imageSmoothingEnabled = false; sctx.drawImage(ItemArt.shard(it.el, 16), (px0 + 3) * u, (y - 1) * u, 12 * u, 12 * u); tip(px0 + 3, y - 1, 12, 12, Gear.ELEMENTS[it.el].name + " shard"); }
      else if (it.kind === "heal" || it.kind === "talisman") { sctx.imageSmoothingEnabled = false; sctx.drawImage(ItemArt.item(it.id, 16), (px0 + 3) * u, (y - 1) * u, 12 * u, 12 * u); }
      else R(col, px0 + 8, y + 3, 3, 7);
      sctx.font = `${7 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = out ? "#7a6a6a" : can ? "#fff6dc" : "#b8a8a0"; sctx.fillText(it.name + (it.cap ? `  (${Gear.count(it.id)}/${it.cap})` : out ? "  (owned)" : ""), (px0 + 15) * u, (y + 2) * u);
      // the price, in shells
      let cx = px0 + pw - 10;
      for (const [k, n] of Object.entries(it.cost).reverse()) { cx -= 26; sctx.imageSmoothingEnabled = false; sctx.drawImage(Gear.shellIcon(k), cx * u, (y - 2) * u, 16 * u, 16 * u); tip(cx, y - 2, 16, 16, Gear.SHELLS[k].name); sctx.fillStyle = Gear.state().shells[k] >= n ? "#9ae69a" : "#e88a7a"; sctx.fillText("x" + n, (cx + 15) * u, (y + 3) * u); }
      shopUI.hit.push({ x: px0 + 4, y: y - 1, w: pw - 8, h: RH, i });
    }
    const it = items[shopUI.sel];
    sctx.textAlign = "center"; sctx.font = `${6 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#c8b890"; sctx.fillText(it.desc, (VW / 2) * u, (py0 + ph - 26) * u);
    const msg = time - shopUI.msgT < 2.5 && shopUI.msg ? shopUI.msg : TOUCH ? "Tap to choose, tap again to trade" : "W/S choose   E trade   Esc close";
    sctx.fillStyle = time - shopUI.msgT < 2.5 ? "#ffd27a" : "#a89880"; sctx.fillText(msg, (VW / 2) * u, (py0 + ph - 13) * u);
    R("#c08a3e", px0 + pw - 14, py0 + 4, 10, 10); sctx.fillStyle = "#1a1220"; sctx.fillText("x", (px0 + pw - 9) * u, (py0 + 4) * u);
    sctx.textAlign = "left";
  }
  // ------------------------------------------------------------------ the forge's crafting screen
  // One row per element: its shards, then forge its weapon or weave its cloth (three shards each).
  const forgeUI = { open: false, row: 0, col: 0, hit: [], msg: "", msgT: -9, tab: 0, urow: 0, utop: 0 };
  // the Temper tab: everything you own that the smith can work on
  const upList = () => Combat.weapons.filter((w) => Combat.unlocked.has(w.id)).map((w) => ({ kind: "weapon", id: w.id, name: w.name, col: w.col })).concat(Gear.state().armors.map((id) => ({ kind: "armor", id, name: Gear.ARMOR[id].name, col: Gear.ARMOR[id].el ? Gear.ELEMENTS[Gear.ARMOR[id].el].col : "#d8c8a8" })));
  const costText = (c) => Object.entries(c.shells).map(([k, n]) => `${n} ${k}`).join(", ") + ` + ${c.shards[1]} ${Gear.ELEMENTS[c.shards[0]].name.toLowerCase()} shard${c.shards[1] > 1 ? "s" : ""}`;
  function temperDo(i) {
    const it = upList()[i]; if (!it) return;
    if (Gear.upgrade(it.kind, it.id)) { forgeUI.msg = `Kamaka works the ${it.name}: +${Gear.upLevel(it.kind, it.id)}.`; forgeUI.msgT = time; Forge.forgeWork && Forge.forgeWork(it.col); Ambience.sfx && Ambience.sfx("stone"); for (let k = 0; k < 24; k++) Forge.sparks.push({ x: Forge.ANVIL.x, y: Forge.ANVIL.y - 15, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 120, t: 0 }); }
    else { const c = Gear.upCost(it.kind, it.id); forgeUI.msg = c ? `That needs ${costText(c)}.` : "It can't be bettered now."; forgeUI.msgT = time; Ambience.sfx && Ambience.sfx("guard"); }
  }
  function openForgeUI() { forgeUI.open = true; forgeUI.msg = ""; Ambience.sfx && Ambience.sfx("equip"); }
  function forgeDo(row, col) {
    const el = Gear.ORDER[row], E = Gear.ELEMENTS[el], kind = col ? "cloth" : "weapon";
    if (Gear.craft(el, kind)) { const name = kind === "weapon" ? Combat.weapons.find((w) => w.id === E.weapon).name : Gear.ARMOR[E.cloth].name; forgeUI.msg = `Kamaka hands you the ${name}.`; forgeUI.msgT = time; Forge.forgeWork && Forge.forgeWork(E.col); Ambience.sfx && Ambience.sfx("pickup"); for (let k = 0; k < 20; k++) Forge.sparks.push({ x: Forge.ANVIL.x, y: Forge.ANVIL.y - 15, vx: (Math.random() - 0.5) * 160, vy: -60 - Math.random() * 100, life: 0.7 }); Game.save(); }
    else { const have = Gear.state().shards[el]; forgeUI.msg = (kind === "weapon" ? Combat.unlocked.has(E.weapon) : Gear.hasArmor(E.cloth)) ? "You already have that." : `You need ${Gear.COST} ${E.name.toLowerCase()} shards (you have ${have}).`; forgeUI.msgT = time; Ambience.sfx && Ambience.sfx("guard"); }
  }
  function forgeKey(code) {
    const n = Gear.ORDER.length;
    if (code === "Tab") { forgeUI.tab = 1 - forgeUI.tab; return; }
    if (forgeUI.tab === 1) {
      const m = upList().length;
      if (code === "Escape" || code === "KeyQ") forgeUI.open = false;
      else if (code === "ArrowDown" || code === "KeyS") forgeUI.urow = (forgeUI.urow + 1) % m;
      else if (code === "ArrowUp" || code === "KeyW") forgeUI.urow = (forgeUI.urow + m - 1) % m;
      else if (code === "KeyE" || code === "Enter" || code === "KeyJ" || code === "Space") temperDo(forgeUI.urow);
      return;
    }
    if (code === "Escape" || code === "KeyQ") forgeUI.open = false;
    else if (code === "ArrowDown" || code === "KeyS") forgeUI.row = (forgeUI.row + 1) % n;
    else if (code === "ArrowUp" || code === "KeyW") forgeUI.row = (forgeUI.row + n - 1) % n;
    else if (code === "ArrowLeft" || code === "KeyA" || code === "ArrowRight" || code === "KeyD") forgeUI.col = 1 - forgeUI.col;
    else if (code === "KeyE" || code === "Enter" || code === "KeyJ" || code === "Space") forgeDo(forgeUI.row, forgeUI.col);
  }
  function forgeTap(e) {
    const gx = (e.clientX * (screen.width / innerWidth)) / SCALE, gy = (e.clientY * (screen.height / innerHeight)) / SCALE;
    for (const h of forgeUI.hit) if (gx > h.x && gx < h.x + h.w && gy > h.y && gy < h.y + h.h) { if (h.close) forgeUI.open = false; else if (h.tab !== undefined) forgeUI.tab = h.tab; else if (h.urow !== undefined) { if (forgeUI.urow === h.urow) temperDo(h.urow); else forgeUI.urow = h.urow; } else { forgeUI.row = h.row; forgeUI.col = h.col; forgeDo(h.row, h.col); } return; }
  }
  function drawForgeTabs(px0, py0, pw) {
    const u = SCALE;
    ["FORGE", "TEMPER"].forEach((lab, k) => { const bx = px0 + 8 + k * 52, on = forgeUI.tab === k; sctx.fillStyle = on ? "#ffb06a" : "#3a2c2c"; sctx.fillRect(bx * u, (py0 + 5) * u, 48 * u, 11 * u); sctx.font = `${7 * u}px 'Pixelify Sans', monospace`; sctx.textAlign = "center"; sctx.fillStyle = on ? "#1e1416" : "#c8a890"; sctx.fillText(lab, (bx + 24) * u, (py0 + 7) * u); forgeUI.hit.push({ x: bx, y: py0 + 5, w: 48, h: 11, tab: k }); });
  }
  function drawTemperUI(t) {
    const u = SCALE, L = upList(), RH = 15, rows = Math.max(4, Math.min(L.length, Math.floor((VH - 80) / RH))), pw = Math.min(VW - 16, 360), ph = 56 + rows * RH, px0 = Math.round((VW - pw) / 2), py0 = FORGE_TOP(ph);
    if (forgeUI.urow < forgeUI.utop) forgeUI.utop = forgeUI.urow; if (forgeUI.urow >= forgeUI.utop + rows) forgeUI.utop = forgeUI.urow - rows + 1;
    const R = (c, x, y, w, h) => { sctx.fillStyle = c; sctx.fillRect(x * u, y * u, w * u, h * u); };
    sctx.fillStyle = "rgba(8,4,4,0.55)"; sctx.fillRect(0, 0, screen.width, screen.height);
    R("#140c0c", px0, py0, pw, ph); R("#8a4a2a", px0 + 1, py0 + 1, pw - 2, ph - 2); R("#1e1416", px0 + 2, py0 + 2, pw - 4, ph - 4);
    forgeUI.hit = [{ x: px0 + pw - 14, y: py0 + 4, w: 10, h: 10, close: 1 }];
    drawForgeTabs(px0, py0, pw);
    sctx.textBaseline = "top"; sctx.textAlign = "left"; sctx.font = `${6 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#c8a890";
    sctx.fillText("Weapons: +12% damage a level (ordinary 5, elemental 2). Suits: +1 heart (3). Cloth: +1 heart (1).", (px0 + 8) * u, (py0 + 21) * u);
    for (let r = 0; r < rows; r++) {
      const i = forgeUI.utop + r, it = L[i]; if (!it) break;
      const y = py0 + 34 + r * RH, sel = i === forgeUI.urow, lv = Gear.upLevel(it.kind, it.id), mx = Gear.upMax(it.kind, it.id), c = Gear.upCost(it.kind, it.id), can = Gear.canUpgrade(it.kind, it.id);
      if (sel) R("rgba(255,170,100,0.12)", px0 + 4, y - 1, pw - 8, RH - 1);
      R(it.col, px0 + 8, y + 2, 3, 6);
      sctx.font = `${7 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#fff6dc"; sctx.fillText(it.name, (px0 + 15) * u, (y + 1) * u);
      for (let k = 0; k < mx; k++) R(k < lv ? "#ffd27a" : "#3a2c2c", px0 + 108 + k * 6, y + 3, 4, 4);
      sctx.font = `${5 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = !c ? "#9ae69a" : can ? "#ffe0b0" : "#8a7a7a"; if (!c) sctx.fillText("fully tempered", (px0 + 146) * u, (y + 3) * u);
      else { let cx2 = px0 + 146; for (const [k, n] of Object.entries(c.shells)) { sctx.imageSmoothingEnabled = false; sctx.drawImage(Gear.shellIcon(k), cx2 * u, (y - 1) * u, 12 * u, 12 * u); tip(cx2, y - 1, 12, 12, Gear.SHELLS[k].name); sctx.fillStyle = Gear.state().shells[k] >= n ? "#9ae69a" : "#e88a7a"; sctx.fillText("x" + n, (cx2 + 12) * u, (y + 3) * u); cx2 += 26; }
        const [el, n] = c.shards; sctx.drawImage(ItemArt.shard(el, 16), cx2 * u, (y - 1) * u, 12 * u, 12 * u); tip(cx2, y - 1, 12, 12, Gear.ELEMENTS[el].name + " shard"); sctx.fillStyle = (Gear.state().shards[el] || 0) >= n ? "#9ae69a" : "#e88a7a"; sctx.fillText("x" + n, (cx2 + 12) * u, (y + 3) * u); }
      forgeUI.hit.push({ x: px0 + 4, y: y - 1, w: pw - 8, h: RH - 1, urow: i });
    }
    sctx.textAlign = "center"; sctx.font = `${6 * u}px 'Pixelify Sans', monospace`;
    const msg = time - forgeUI.msgT < 2.5 && forgeUI.msg ? forgeUI.msg : TOUCH ? "Tap twice to temper" : "W/S choose   E temper   Tab forge   Esc close";
    sctx.fillStyle = time - forgeUI.msgT < 2.5 ? "#ffd27a" : "#a89880"; sctx.fillText(msg, (VW / 2) * u, (py0 + ph - 12) * u);
    R("#8a4a2a", px0 + pw - 14, py0 + 4, 10, 10); sctx.fillStyle = "#1e1416"; sctx.fillText("x", (px0 + pw - 9) * u, (py0 + 4) * u);
    sctx.textAlign = "left";
  }
  // both forge tabs share one panel width and top edge, so the Forge/Temper buttons never move between them
  const FORGE_TOP = () => Math.max(6, Math.round((VH - (56 + Math.max(4, Math.min(upList().length, Math.floor((VH - 80) / 15))) * 15)) / 2));
  function drawForgeUI(t) {
    if (forgeUI.tab === 1) return drawTemperUI(t);
    const u = SCALE, n = Gear.ORDER.length, RH = Math.min(17, Math.floor((VH - 70) / n)), pw = Math.min(VW - 16, 360), ph = 48 + n * RH, px0 = Math.round((VW - pw) / 2), py0 = FORGE_TOP(ph);
    const R = (c, x, y, w, h) => { sctx.fillStyle = c; sctx.fillRect(x * u, y * u, w * u, h * u); };
    sctx.fillStyle = "rgba(8,4,4,0.55)"; sctx.fillRect(0, 0, screen.width, screen.height);
    R("#140c0c", px0, py0, pw, ph); R("#8a4a2a", px0 + 1, py0 + 1, pw - 2, ph - 2); R("#1e1416", px0 + 2, py0 + 2, pw - 4, ph - 4);
    sctx.textBaseline = "top"; sctx.textAlign = "center";
    forgeUI.hit = [{ x: px0 + pw - 14, y: py0 + 4, w: 10, h: 10, close: 1 }];
    drawForgeTabs(px0, py0, pw);
    sctx.font = `${6 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#c8a890"; sctx.textAlign = "center"; sctx.fillText(`${Gear.COST} shards forge a weapon, or weave a cloth set`, (VW / 2) * u, (py0 + 19) * u);
    const cw = Math.round((pw - 110) / 2);
    Gear.ORDER.forEach((el, r) => {
      const E = Gear.ELEMENTS[el], y = py0 + 32 + r * RH, have = Gear.state().shards[el], sel = r === forgeUI.row;
      if (sel) R("rgba(255,170,100,0.12)", px0 + 4, y - 1, pw - 8, RH - 1);
      sctx.imageSmoothingEnabled = false; sctx.drawImage(ItemArt.shard(el, 16), (px0 + 4) * u, (y - 2) * u, 12 * u, 12 * u); tip(px0 + 4, y - 2, 12, 12, E.name + " shard");
      sctx.textAlign = "left"; sctx.font = `${7 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = have ? "#fff6dc" : "#7a6a6a"; sctx.fillText(E.name, (px0 + 18) * u, (y + 2) * u);
      sctx.fillStyle = have >= Gear.COST ? "#7cf08a" : "#a89880"; sctx.fillText(`${have}/${Gear.COST}`, (px0 + 78) * u, (y + 2) * u);
      const wName = (Combat.weapons.find((w) => w.id === E.weapon) || { name: "?" }).name, cName = Gear.ARMOR[E.cloth].name;
      [[wName, Combat.unlocked.has(E.weapon)], [cName, Gear.hasArmor(E.cloth)]].forEach(([name, owned], c) => {
        const bx = px0 + 104 + c * (cw + 4), on = sel && forgeUI.col === c, can = !owned && have >= Gear.COST;
        R(on ? "#ffb06a" : owned ? "#3a5a3a" : can ? "#8a5a3a" : "#3a2c2c", bx, y, cw, RH - 3); R(owned ? "#1e2c1e" : "#24181a", bx + 1, y + 1, cw - 2, RH - 5);
        sctx.font = `${6 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = owned ? "#9ae69a" : can ? "#ffe0b0" : "#8a7a7a"; sctx.fillText((owned ? "✓ " : "") + name, (bx + 3) * u, (y + 3) * u);
        forgeUI.hit.push({ x: bx, y, w: cw, h: RH - 3, row: r, col: c });
      });
    });
    sctx.textAlign = "center"; sctx.font = `${6 * u}px 'Pixelify Sans', monospace`;
    const msg = time - forgeUI.msgT < 2.5 && forgeUI.msg ? forgeUI.msg : TOUCH ? "Tap a weapon or cloth to make it" : "W/S element   A/D weapon or cloth   E make   Tab temper   Esc close";
    sctx.fillStyle = time - forgeUI.msgT < 2.5 ? "#ffd27a" : "#a89880"; sctx.fillText(msg, (VW / 2) * u, (py0 + ph - 12) * u);
    R("#8a4a2a", px0 + pw - 14, py0 + 4, 10, 10); sctx.fillStyle = "#1e1416"; sctx.fillText("x", (px0 + pw - 9) * u, (py0 + 4) * u);
    sctx.textAlign = "left";
  }
  // ------------------------------------------------------------------ choosing your five
  // Before Kahu Lā sends you, if you own more than five weapons: pick which five to carry.
  // Before Kahu Lā sends you: choose your five weapons, the armour to wear, and the two items to pack.
  const loadoutUI = { open: false, sec: 0, sel: [0, 0, 0, 0], dest: null, hit: [], msgT: -9, msg: "" };
  const prepLists = () => {
    const weapons = Combat.weapons.map((w, i) => i).filter((i) => Combat.unlocked.has(Combat.weapons[i].id));
    const armors = [null].concat(Gear.NORMAL.concat(Gear.ORDER.map((k) => Gear.ELEMENTS[k].cloth)).filter((k) => Gear.hasArmor(k)));
    const items = Gear.PERISH().filter((id) => Gear.count(id) > 0);
    return [weapons, armors, items, Gear.pack()];
  };
  function openLoadout(dest) { loadoutUI.open = true; loadoutUI.dest = dest; loadoutUI.sec = 0; loadoutUI.sel = [0, 0, 0, 0]; loadoutUI.msg = ""; Gear.packTidy(true); Ambience.sfx && Ambience.sfx("equip"); }
  const itemName = (id) => (id === "tonic" ? "ʻŌhelo tonic" : id === "salve" ? "Noni salve" : Gear.TALISMANS[id].name);
  function prepAct(sec, i) {
    const L = prepLists();
    if (sec === 0) toggleEquip(L[0][i]);
    else if (sec === 1) { Gear.wear(L[1][i]); Ambience.sfx && Ambience.sfx("equip"); }
    else if (sec === 2) { if (!Gear.packAdd(L[2][i])) { loadoutUI.msg = Gear.pack().length >= Gear.PACK ? "Both slots are full: take something out first" : "None left to pack"; loadoutUI.msgT = time; } else Ambience.sfx && Ambience.sfx("equip"); }
    else if (sec === 3 && L[3][i]) { Gear.packRemove(i); Ambience.sfx && Ambience.sfx("equip"); }
  }
  function toggleEquip(i) {
    const id = Combat.weapons[i].id, L = Combat.loadout, k = L.indexOf(id);
    if (k >= 0) { if (L.length <= 1) { loadoutUI.msg = "Carry at least one weapon"; loadoutUI.msgT = time; return; } L.splice(k, 1); }
    else { if (L.length >= Combat.LOADOUT_MAX) { loadoutUI.msg = "Five at most: put one down first"; loadoutUI.msgT = time; return; } L.push(id); }
    Combat.ensureOpen(); Ambience.sfx && Ambience.sfx("equip");
  }
  function setOut() { loadoutUI.open = false; Combat.ensureOpen(); Gear.packTidy(false); Ambience.sfx && Ambience.sfx("portal"); if (loadoutUI.dest) goTo(loadoutUI.dest); }
  function loadoutKey(code) {
    const L = prepLists(), sec = loadoutUI.sec, n = Math.max(1, sec === 3 ? Gear.PACK : L[sec].length);
    if (code === "Escape" || code === "KeyQ") { loadoutUI.open = false; openGlobe(); }
    else if (code === "ArrowRight" || code === "KeyD") loadoutUI.sel[sec] = (loadoutUI.sel[sec] + 1) % n;
    else if (code === "ArrowLeft" || code === "KeyA") loadoutUI.sel[sec] = (loadoutUI.sel[sec] + n - 1) % n;
    else if (code === "ArrowDown" || code === "KeyS") loadoutUI.sec = (sec + 1) % 4;
    else if (code === "ArrowUp" || code === "KeyW") loadoutUI.sec = (sec + 3) % 4;
    else if (code === "KeyE" || code === "KeyJ") prepAct(sec, Math.min(loadoutUI.sel[sec], n - 1));
    else if (code === "Enter" || code === "Space") setOut();
  }
  function loadoutTap(e) {
    const gx = (e.clientX * (screen.width / innerWidth)) / SCALE, gy = (e.clientY * (screen.height / innerHeight)) / SCALE;
    for (const h of loadoutUI.hit) if (gx > h.x && gx < h.x + h.w && gy > h.y && gy < h.y + h.h) { if (h.go) setOut(); else if (h.back) { loadoutUI.open = false; openGlobe(); } else { loadoutUI.sec = h.sec; loadoutUI.sel[h.sec] = h.i; prepAct(h.sec, h.i); } return; }
  }
  function drawLoadout(t) {
    const u = SCALE, L = prepLists(), C2 = 31, perRow = Math.min(12, Math.max(6, L[0].length)), wRows = Math.ceil(L[0].length / perRow);
    const pw = Math.min(VW - 12, Math.max(300, perRow * C2 + 24));
    // armour chips wrap onto as many rows as they need
    const chipW = (k) => Math.min(90, 16 + (k ? Gear.ARMOR[k].name : "None").length * 4.2), chips = []; { let cx = 0, row = 0; for (let i = 0; i < L[1].length; i++) { const w = chipW(L[1][i]); if (cx + w > pw - 14) { cx = 0; row++; } chips.push({ i, x: cx, row, w }); cx += w + 3; } }
    const aRows = chips.length ? chips[chips.length - 1].row + 1 : 1;
    const ph = 70 + wRows * C2 + 14 + aRows * 17 + 34 + 34, px0 = Math.round((VW - pw) / 2), py0 = Math.max(4, Math.round((VH - ph) / 2));
    const R = (c, x, y, w, h) => { sctx.fillStyle = c; sctx.fillRect(x * u, y * u, w * u, h * u); };
    const T2 = (txt, x, y, size, col, al) => { sctx.font = `${size * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = col; sctx.textAlign = al || "left"; sctx.fillText(txt, x * u, y * u); };
    sctx.fillStyle = "rgba(8,6,14,0.55)"; sctx.fillRect(0, 0, screen.width, screen.height);
    R("#1a1220", px0, py0, pw, ph); R("#c08a3e", px0 + 1, py0 + 1, pw - 2, ph - 2); R("#221828", px0 + 2, py0 + 2, pw - 4, ph - 4);
    sctx.textBaseline = "top";
    T2("PREPARE", VW / 2, py0 + 5, 10, "#ffe08a", "center");
    T2(`bound for ${Level.DEFS[loadoutUI.dest] ? Level.DEFS[loadoutUI.dest].title : ""}`, VW / 2, py0 + 17, 6, "#c8b890", "center");
    loadoutUI.hit = [];
    const head = (sec, txt, y) => { if (loadoutUI.sec === sec) R("rgba(255,210,122,0.12)", px0 + 4, y - 2, pw - 8, 11); T2(txt, px0 + 8, y, 6, loadoutUI.sec === sec ? "#ffe08a" : "#a89880"); };
    // weapons
    let y = py0 + 30; head(0, `WEAPONS  ${Combat.loadout.length}/${Combat.LOADOUT_MAX} carried`, y); y += 10;
    const gx0 = Math.round(VW / 2 - (Math.min(perRow, L[0].length) * C2) / 2);
    L[0].forEach((i, k) => {
      const w = Combat.weapons[i], x = gx0 + (k % perRow) * C2, yy = y + Math.floor(k / perRow) * C2, eq = Combat.loadout.indexOf(w.id), sel = loadoutUI.sec === 0 && k === loadoutUI.sel[0];
      R(sel ? "#ffffff" : eq >= 0 ? w.col : "#3a2e3c", x, yy, 30, 30); R(eq >= 0 ? "#2c2030" : "#161018", x + 1, yy + 1, 28, 28);
      sctx.globalAlpha = eq >= 0 ? 1 : 0.45; sctx.imageSmoothingEnabled = false; sctx.drawImage(w.icon, (x + 1) * u, (yy + 1) * u, 28 * u, 28 * u); sctx.globalAlpha = 1;
      if (eq >= 0) T2(String(eq + 1), x + 3, yy + 2, 6, w.col);
      loadoutUI.hit.push({ x, y: yy, w: 30, h: 30, sec: 0, i: k });
    });
    y += wRows * C2 + 4;
    // armour
    head(1, "ARMOUR", y); y += 11;
    for (const ch of chips) {
      const k = L[1][ch.i], A2 = k ? Gear.ARMOR[k] : null, name = A2 ? A2.name : "None", ax = px0 + 8 + ch.x, ay = y + ch.row * 17, wd = ch.w, on = Gear.wornId() === k, sel = loadoutUI.sec === 1 && ch.i === loadoutUI.sel[1];
      R(sel ? "#ffffff" : on ? "#ffd27a" : "#4a3a50", ax, ay, wd, 14); R(on ? "#3a2a1e" : "#1a1220", ax + 1, ay + 1, wd - 2, 12);
      if (A2) { R(PAL.css(A2.pal.v), ax + 3, ay + 3, 5, 8); R(PAL.css(A2.pal.l), ax + 3, ay + 3, 2, 8); }
      T2(name, ax + (A2 ? 10 : 4), ay + 3, 6, on ? "#ffe08a" : "#e8dcc8");
      loadoutUI.hit.push({ x: ax, y: ay, w: wd, h: 14, sec: 1, i: ch.i });
    }
    y += aRows * 17 + 3;
    // items to pack, and the pack
    head(2, "ITEMS  (each unit you take fills a slot)", y); y += 11;
    let ix = px0 + 8;
    L[2].forEach((id, i) => { const sel = loadoutUI.sec === 2 && i === loadoutUI.sel[2]; if (sel) R("#ffffff", ix - 1, y - 1, 18, 18); itemIcon(sctx === hctx ? hctx : hudTmp(), id, 0, 0); sctx.drawImage(hudTmpC, 0, 0, 16, 16, ix * u, y * u, 16 * u, 16 * u); T2(`${Gear.packFree(id)}`, ix + 17, y + 6, 6, "#fff6dc"); loadoutUI.hit.push({ x: ix, y, w: 16, h: 16, sec: 2, i }); ix += 30; });
    if (!L[2].length) T2("Nothing to pack: Makani sells heals and talismans", ix, y + 4, 6, "#7a6a78");
    y += 20;
    head(3, `PACK  ${Gear.pack().length}/${Gear.PACK}`, y); y += 11;
    for (let i = 0; i < Gear.PACK; i++) { const id = Gear.pack()[i], x = px0 + 8 + i * 70, sel = loadoutUI.sec === 3 && i === loadoutUI.sel[3]; R(sel ? "#ffffff" : "#4a3a50", x - 1, y - 1, 66, 18); R("#1a1220", x, y, 64, 16); if (id) { itemIcon(hudTmp(), id, 0, 0); sctx.drawImage(hudTmpC, 0, 0, 16, 16, x * u, y * u, 16 * u, 16 * u); T2(itemName(id), x + 18, y + 5, 5, "#e8dcc8"); } else T2("empty", x + 18, y + 5, 5, "#5a4a58"); loadoutUI.hit.push({ x, y, w: 64, h: 16, sec: 3, i }); }
    const msg = time - loadoutUI.msgT < 2 ? loadoutUI.msg : TOUCH ? "Tap to choose" : "W/S section   A/D choose   E pick / drop   Enter set out";
    T2(msg, VW / 2, py0 + ph - 11, 6, time - loadoutUI.msgT < 2 ? "#ffb08a" : "#a89880", "center");
    const bw = 50, bx = px0 + pw - bw - 6, byy = py0 + 4;
    R("#c08a3e", bx, byy, bw, 12); R("#2e1e24", bx + 1, byy + 1, bw - 2, 10); T2("SET OUT", bx + bw / 2, byy + 2, 6, "#ffe08a", "center");
    R("#6a5a6a", px0 + 6, byy, 34, 12); R("#1e161e", px0 + 7, byy + 1, 32, 10); T2("BACK", px0 + 23, byy + 2, 6, "#c8b890", "center");
    loadoutUI.hit.push({ x: bx, y: byy, w: bw, h: 12, go: 1 }, { x: px0 + 6, y: byy, w: 34, h: 12, back: 1 });
    sctx.textAlign = "left";
  }
  let hudTmpC = null, hudTmpX = null;
  const hudTmp = () => { if (!hudTmpC) [hudTmpC, hudTmpX] = K.canvas(16, 16); hudTmpX.clearRect(0, 0, 16, 16); return hudTmpX; };
  function globeTap(e) {
    const gx = (e.clientX * (screen.width / innerWidth)) / SCALE, gy = (e.clientY * (screen.height / innerHeight)) / SCALE;
    for (const p of globe.pins) if (Math.abs(gx - p.x) < p.w && Math.abs(gy - p.y) < p.h) { if (p.close) { globe.open = false; return; } if (globe.sel === p.i) travel(); else globe.sel = p.i; return; }
  }
  function globeTexture() {
    if (globe.tex) return globe.tex;
    const TW = 256, TH = 128, d = new Uint8ClampedArray(TW * TH * 3), Z = Level.ZONES;
    for (let v = 0; v < TH; v++) for (let u = 0; u < TW; u++) {
      const lon = (u / TW) * Math.PI * 2, lat = (0.5 - v / TH) * Math.PI, px = Math.cos(lat) * Math.sin(lon), py = Math.sin(lat), pz = Math.cos(lat) * Math.cos(lon);
      let h = K.fbm(px * 1.6 + 5, py * 1.6 + pz * 0.7, 4) * 0.55 + K.fbm(pz * 1.6 + 9, py * 1.6 - px * 0.7, 4) * 0.45 - 0.08;
      let col, volc = 0;
      for (const [zi, z] of Z.entries()) { const zx = Math.cos(z.lat) * Math.sin(z.lon), zy = Math.sin(z.lat), zz = Math.cos(z.lat) * Math.cos(z.lon), dd = Math.acos(Math.max(-1, Math.min(1, px * zx + py * zy + pz * zz))); if (dd < 0.32) h = Math.max(h, 0.62 - dd * 0.4 + (K.noise(u * 0.2, v * 0.2) - 0.5) * 0.1); if (zi === 0 && dd < 0.12) volc = 1 - dd / 0.12; }
      if (h < 0.5) { const sh = Math.max(0, (h - 0.38) / 0.12); col = [18 + sh * 30, 52 + sh * 80, 102 + sh * 60]; }
      else if (h < 0.53) col = [226, 198, 136];
      else if (h < 0.62) col = [72, 150, 70];
      else if (h < 0.7) col = [42, 104, 52];
      else col = [104, 96, 92];
      if (volc > 0.45) col = volc > 0.85 ? [255, 150, 60] : volc > 0.7 ? [70, 40, 46] : [48, 36, 44];
      if (Math.abs(lat) > 1.25) col = [230, 236, 244];
      d.set(col, (v * TW + u) * 3);
    }
    globe.tex = { d, TW, TH }; return globe.tex;
  }
  function drawGlobe(t) {
    const u = SCALE, TX = globeTexture(), Z = Level.ZONES, z = Z[globe.zone];
    const pw = Math.min(VW - 16, 380), ph = Math.min(VH - 16, 210), px0 = Math.round((VW - pw) / 2), py0 = Math.round((VH - ph) / 2);
    const R0 = Math.min(70, Math.floor(ph / 2) - 18), gcx = px0 + 18 + R0, gcy = py0 + ph / 2 + 4;
    if (!globe.can || globe.can.width !== pw) [globe.can, globe.cx] = K.canvas(pw, ph);
    const gx = globe.cx, img = gx.createImageData(pw, ph), o = img.data;
    // panel: dark koa with a gold rim
    for (let y = 0; y < ph; y++) for (let x = 0; x < pw; x++) { const i = (y * pw + x) * 4, edge = x < 2 || y < 2 || x >= pw - 2 || y >= ph - 2, rim = x < 3 || y < 3 || x >= pw - 3 || y >= ph - 3; const c = edge ? [26, 18, 32] : rim ? [192, 138, 62] : [34, 24, 38]; o[i] = c[0]; o[i + 1] = c[1]; o[i + 2] = c[2]; o[i + 3] = 240; }
    // the globe turns toward the chosen land
    const pinsAt = (k, n) => ({ lon: z.lon + (k - (n - 1) / 2) * 0.14, lat: z.lat + (k % 2 ? 0.07 : -0.05) });
    const target = z.levels.length ? pinsAt(globe.sel, z.levels.length).lon : z.lon;
    globe.rot += Math.atan2(Math.sin(target - globe.rot), Math.cos(target - globe.rot)) * 0.08 + 0.0006;
    const lx = -0.5, ly = -0.55, lz = 0.67, lc = gcx - px0, lcy = gcy - py0;
    for (let y = -R0 - 3; y <= R0 + 3; y++) for (let x = -R0 - 3; x <= R0 + 3; x++) {
      const r = Math.hypot(x + 0.5, y + 0.5) / R0, i = ((lcy + y) * pw + lc + x) * 4;
      if (r > 1) { if (r < 1.06) { const a = (1.06 - r) / 0.06; o[i] = o[i] * (1 - a) + 90 * a; o[i + 1] = o[i + 1] * (1 - a) + 200 * a; o[i + 2] = o[i + 2] * (1 - a) + 230 * a; } continue; }
      const nx = (x + 0.5) / R0, ny = (y + 0.5) / R0, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const lat = Math.asin(-ny), lon = Math.atan2(nx, nz) + globe.rot, tu = ((((lon / (Math.PI * 2)) % 1) + 1) % 1) * TX.TW | 0, tv = Math.min(TX.TH - 1, ((0.5 - lat / Math.PI) * TX.TH) | 0), j = (tv * TX.TW + tu) * 3;
      const lit = Math.max(0, nx * lx + ny * ly + nz * lz), band = lit + PAL.bayer(x, y) * 0.12, sh = band > 0.55 ? 1.05 : band > 0.3 ? 0.85 : band > 0.1 ? 0.6 : 0.38;
      let c0 = TX.d[j] * sh, c1 = TX.d[j + 1] * sh, c2 = TX.d[j + 2] * sh;
      if (TX.d[j] === 255 && Math.sin(t * 4) > 0) { c0 = 255; c1 = 200; c2 = 120; }       // the volcano's glow
      if (r > 0.9) { const a = (r - 0.9) / 0.1 * 0.5; c0 += (90 - c0) * a; c1 += (200 - c1) * a; c2 += (230 - c2) * a; }
      o[i] = c0; o[i + 1] = c1; o[i + 2] = c2; o[i + 3] = 255;
    }
    gx.putImageData(img, 0, 0);
    // pins for the levels of this zone (on the side facing you)
    globe.pins = [];
    z.levels.forEach((name, k) => {
      const p = pinsAt(k, z.levels.length), rel = p.lon - globe.rot;
      if (Math.cos(rel) * Math.cos(p.lat) < 0.05) return;
      const x = Math.round(lc + R0 * Math.cos(p.lat) * Math.sin(rel)), y = Math.round(lcy - R0 * Math.sin(p.lat)), on = Level.unlocked.has(name), sel = k === globe.sel;
      gx.fillStyle = "#140c16"; gx.fillRect(x - 3, y - 9, 7, 9); gx.fillStyle = on ? (sel && Math.sin(t * 8) > 0 ? "#ffffff" : "#ffd27a") : "#6a5a6a"; gx.fillRect(x - 2, y - 8, 5, 5); gx.fillRect(x, y - 3, 1, 3);
      globe.pins.push({ x: px0 + x, y: py0 + y - 5, w: 8, h: 8, i: k });
    });
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(globe.can, px0 * u, py0 * u, pw * u, ph * u);
    // the list of lands
    const lx0 = gcx + R0 + 16, tw = px0 + pw - lx0 - 8;
    sctx.textAlign = "left"; sctx.textBaseline = "top";
    sctx.font = `${10 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#ffe08a"; sctx.fillText(`ZONE ${globe.zone + 1}`, lx0 * u, (py0 + 10) * u);
    sctx.font = `${7 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#fff6dc"; sctx.fillText(z.name, lx0 * u, (py0 + 24) * u);
    z.levels.forEach((name, k) => {
      const y = py0 + 42 + k * 30, on = Level.unlocked.has(name), sel = k === globe.sel, D = Level.DEFS[name];
      sctx.fillStyle = sel ? "rgba(255,210,122,0.18)" : "rgba(0,0,0,0.2)"; sctx.fillRect((lx0 - 4) * u, (y - 3) * u, tw * u, 26 * u);
      if (sel) { sctx.fillStyle = "#ffd27a"; sctx.fillRect((lx0 - 4) * u, (y - 3) * u, 2 * u, 26 * u); }
      sctx.font = `${8 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = on ? (sel ? "#ffffff" : "#fff6dc") : "#7a6a78";
      sctx.fillText(`${k + 1}  ${on ? D.title : "? ? ?"}`, lx0 * u, y * u);
      sctx.font = `${6 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = on ? "#c8b890" : "#5a4a58";
      sctx.fillText(on ? D.sub : "Clear the land before it to reveal it", (lx0 + 9) * u, (y + 11) * u);
      globe.pins.push({ x: lx0 - 4 + tw / 2, y: y + 10, w: tw / 2, h: 13, i: k });
    });
    if (!z.levels.length) { sctx.font = `${7 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#7a6a78"; sctx.fillText("Not yet... the sun has not reached it.", lx0 * u, (py0 + 44) * u); }
    sctx.font = `${6 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#c8b890";
    sctx.fillText(TOUCH ? "Tap a land to choose, tap again to travel" : "W/S choose   E travel   Tab other zones   Esc close", (px0 + 10) * u, (py0 + ph - 12) * u);
    // a close box for touch
    sctx.fillStyle = "#c08a3e"; sctx.fillRect((px0 + pw - 16) * u, (py0 + 5) * u, 11 * u, 11 * u); sctx.fillStyle = "#1a1220"; sctx.font = `${8 * u}px 'Pixelify Sans', monospace`; sctx.fillText("x", (px0 + pw - 13) * u, (py0 + 5) * u);
    globe.pins.push({ x: px0 + pw - 10, y: py0 + 10, w: 8, h: 8, close: true });
  }

  // fallen enemies sometimes leave an ʻōhelo berry behind
  Combat.onKill = (d) => {
    if (scene !== "level") return;
    const x = d.type === "vine" ? d.rx : d.x, y = d.type === "vine" ? d.ry : d.y;
    if (d.type !== "runner" && d.type !== "rayling" && Math.random() < (d.boss ? 1 : 0.3)) Level.dropBerry(x, y, time);
    // creatures of an element sometimes leave a shard of it
    const el = Gear.ELEMENT_OF[d.type]; if (el && Math.random() < Gear.dropChance()) Level.dropShard(x + 8, y, el, time);
    Gear.noteKill(d.type);
  };
  Combat.onHeal = (n) => { player.hp = Math.min(player.maxHp, player.hp + n); healT = time; };
  window.__hurt = hurtPlayer;
  const FOOT = [-5, -4, 5, 1];

  function blocked(x, y, self) {
    const x0 = x + FOOT[0], y0 = y + FOOT[1], x1 = x + FOOT[2], y1 = y + FOOT[3];
    if (scene === "level") {
      for (const [px, py] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [x, y0], [x, y1]]) if (Level.solidAt(px, py)) return true;
      return false;
    }
    if (scene === "cave" || scene === "dojo" || scene === "forge") {
      const S = scene === "cave" ? Cave : scene === "forge" ? Forge : Dojo;
      for (const [px, py] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [x, y0], [x, y1]]) if (S.solidAt(px, py)) return true;
      return false;
    }
    for (const [px, py] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [x, y0], [x, y1]]) if (World.solidAt(px, py)) return true;
    for (const b of Props.colliders) if (x1 > b[0] && x0 < b[2] && y1 > b[1] && y0 < b[3]) return true;
    for (const b of Forge.islandColliders()) if (x1 > b[0] && x0 < b[2] && y1 > b[1] && y0 < b[3]) return true;
    return false;
  }

  function tryMove(dx, dy) {
    if (!blocked(player.x + dx, player.y)) player.x += dx;
    if (!blocked(player.x, player.y + dy)) player.y += dy;
  }
  function updatePlayer(dt) {
    player.inv = Math.max(0, player.inv - dt); player.rollCd = Math.max(0, player.rollCd - dt);
    if (Math.abs(player.kx) + Math.abs(player.ky) > 2) { tryMove(player.kx * dt, player.ky * dt); player.kx *= Math.exp(-dt * 10); player.ky *= Math.exp(-dt * 10); }
    if (player.dead) { player.moving = false; return; }
    if (player.rolling) {
      // dodge roll: a quick burst that eases out, invulnerable throughout
      player.rollT += dt;
      const u = player.rollT / 0.34, sp = 260 * (1 - u * u) * (scene === "level" ? 0.4 + 0.6 * Level.slowAt(player.x, player.y) : 1);
      tryMove(Math.cos(player.rollA) * sp * dt, Math.sin(player.rollA) * sp * dt * 0.9);
      Combat.after.push({ x: player.x, y: player.y, dir: player.dir, t0: Combat.clock, ghost: true });
      if (player.rollT >= 0.34) { player.rolling = false; player.perfectUsed = false; }
      player.moving = true;
      return;
    }
    if (dialog || globe.open || loadoutUI.open || forgeUI.open || shopUI.open || invUI.open || pick.open || fade.dir === 1 || Combat.busy) { player.moving = false; player.frame = Combat.busy ? 2 : 0; return; }
    let ix = 0, iy = 0;
    if (keys.KeyA || keys.ArrowLeft) ix -= 1;
    if (keys.KeyD || keys.ArrowRight) ix += 1;
    if (keys.KeyW || keys.ArrowUp) iy -= 1;
    if (keys.KeyS || keys.ArrowDown) iy += 1;
    let run = keys.ShiftLeft || keys.ShiftRight;
    if (TOUCH && TouchPad.mag > 0) { ix = TouchPad.x; iy = TouchPad.y; run = TouchPad.mag > 0.85; }
    player.moving = ix !== 0 || iy !== 0;
    if (player.moving) player.moveA = Math.atan2(iy, ix);
    if (player.moving) {
      hintTimer = Math.min(hintTimer, 4);
      const gs = Gear.stats(), len = Math.hypot(ix, iy), sp = (run ? 140 : 90) * dt * gs.speed * (scene === "level" && !gs.waterWalk ? Level.slowAt(player.x, player.y) : 1);
      const dx = (ix / len) * sp, dy = (iy / len) * sp;
      // the Kea (plasma) cloth: a trail of white light behind you, flecked with every element's colour
      if (gs.trail && Combat.clock - (player.trailT || 0) > (run ? 0.05 : 0.08)) { player.trailT = Combat.clock; Combat.after.push({ x: player.x, y: player.y, dir: player.dir, t0: Combat.clock, ghost: true, col: "#ffffff", long: 1 }); Combat.addPart({ x: player.x + (Math.random() - 0.5) * 10, y: player.y - 4 - Math.random() * 20, vx: (Math.random() - 0.5) * 10, vy: -12, drag: 1, life: 0.6, col: ["#ffffff", "#f2b45e", "#7ad860", "#5ab8ff", "#c8b4ff", "#ff5a6a"][(Math.random() * 6) | 0], size: 1, kind: "spark", glow: true }); }
      if (!blocked(player.x + dx, player.y)) player.x += dx;
      else if (!blocked(player.x + dx, player.y - Math.abs(dx))) { player.x += dx; player.y -= Math.abs(dx); } // slide round corners
      else if (!blocked(player.x + dx, player.y + Math.abs(dx))) { player.x += dx; player.y += Math.abs(dx); }
      if (!blocked(player.x, player.y + dy)) player.y += dy;
      if (Math.abs(ix) > 0 && Math.abs(ix) >= Math.abs(iy)) player.dir = ix > 0 ? "side" : "left";
      else player.dir = iy > 0 ? "down" : "up";
      const prev = player.frame;
      player.anim += dt * (run ? 10 : 7);
      player.frame = Math.floor(player.anim) % 4;
      if (player.frame !== prev && (player.frame === 1 || player.frame === 3)) footstep(run);
    } else { player.frame = 0; player.anim = 0; }
  }

  // ------------------------------------------------------------------ particles
  const parts = [];
  // what the hero is standing on, for the sound of their steps (and the dust they kick up)
  function surfaceAt(x, y) {
    if (scene === "dojo") return "wood";
    if (scene === "cave") return "tile";
    if (scene === "level") {
      const v = Level.tileAt(x, y);
      return v === 9 || v === 10 ? "wood" : v === 3 ? "grass" : v === 4 ? "sand" : v === 2 ? "dirt" : v >= 11 && v <= 13 ? "water" : v >= 5 ? "tile" : "dirt";
    }
    if (World.bridges.some((b) => x > b.x0 && x < b.x1 && Math.abs(y - b.y) < 18)) return "wood";
    const t = World.terrAt(x, y);
    return t === World.SAND ? "sand" : t === World.PATH || t === World.PLAZA ? "tile" : t === World.WATER ? "water" : "grass";
  }
  function footstep(run) {
    const s = surfaceAt(player.x, player.y);
    Ambience.step(s, run);
    const col = s === "sand" ? [232, 196, 120] : s === "tile" && scene !== "cave" ? [214, 190, 150] : s === "dirt" ? [120, 96, 84] : s === "water" ? [200, 236, 250] : null;
    if (!col || scene === "dojo") return;
    for (let k = 0; k < (run ? 4 : 2) + (s === "water" ? 3 : 0); k++)
      parts.push({ x: player.x + (Math.random() * 8 - 4), y: player.y, vx: (Math.random() - 0.5) * 14, vy: -6 - Math.random() * (s === "water" ? 22 : 8), life: 0.45, max: 0.45, col, size: 1, ground: true });
  }
  function spawnLeaf(camX, camY, t) {
    const petal = Math.random() < 0.3;
    parts.push({
      x: camX - 10 + Math.random() * (VW * 0.6), y: camY - 6 + Math.random() * VH * 0.5, vx: 0, vy: 0,
      life: 7, max: 7, ph: Math.random() * 6, leaf: true,
      col: petal ? [244, 110, 100] : Math.random() < 0.5 ? [86, 176, 70] : [60, 140, 56], size: petal ? 1 : 2,
    });
  }
  // pale curling wind lines that ride the gusts across the screen
  function spawnStreak(camX, camY, t) {
    const x = camX - 20 + Math.random() * VW * 0.7, y = camY + 10 + Math.random() * (VH - 20);
    const s = K.windStrength(t, x, y);
    if (s < 0.55) return;
    parts.push({ x, y, vx: 70 + s * 70, vy: 0, life: 1.3, max: 1.3, ph: Math.random() * 6, streak: true, len: 10 + ((Math.random() * 10) | 0) });
  }
  function updateParticles(dt, t) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      if (p.leaf) {
        const w = K.windStrength(t, p.x, p.y);
        p.vx = 10 + w * 60;
        p.vy = 6 + Math.sin(t * 2.4 + p.ph) * 10 - w * 4;
      } else if (p.streak) { p.vy = Math.sin(t * 3 + p.ph) * 6; }
      else { p.vy += 30 * dt; }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
  }

  // ------------------------------------------------------------------ critters
  function updateCritters(dt, t) {
    for (const c of Props.critters) {
      if (c.kind === "crab") Props.crabStep(c, dt, player, (x, y) => World.terrAt(x, y) === World.SAND);
      else {
        // smooth wandering: steer by slow noise, drift home if too far
        c.a += (K.noise(t * 0.6 + c.seed, c.seed) - 0.5) * 5 * dt;
        const pull = Math.atan2(c.hy - c.y, c.hx - c.x);
        if (Math.hypot(c.hy - c.y, c.hx - c.x) > 50) c.a += Math.sin(pull - c.a) * 1.5 * dt;
        c.x += Math.cos(c.a) * c.sp * dt + K.wind(t, c.x, c.y) * 3 * dt;
        c.y += Math.sin(c.a) * c.sp * dt * 0.7;
      }
    }
  }

  // ------------------------------------------------------------------ dialog & prompts
  // ------------------------------------------------------------------ scenes (island / sea cave)
  let scene = "island";
  const fade = { a: 0, dir: 0, to: null };
  let banner = { title: "KULEANA", sub: "The Sunward Shore", t0: 0 };
  function goTo(to) {
    if (window.Net && Net.isGuest() && !netGo) { if (time - guestAsked > 1) { guestAsked = time; Net.send({ t: "act", k: "go", to }); } return; }
    if (fade.dir === 0) { fade.dir = 1; fade.to = to; fade.from = scene; if (window.Net && Net.isHost()) Net.send({ t: "scene", to, n: Net.count() }); }
  }
  function updateFade(dt) {
    if (fade.dir === 0) return;
    fade.a += fade.dir * dt * 1.6;
    if (fade.dir === 1 && fade.a >= 1) {
      fade.a = 1; fade.dir = -1;
      if (fade.to === "cave") {
        scene = "cave"; player.x = Cave.ENTRY.x; player.y = Cave.ENTRY.y + 18; player.dir = "down";
        banner = { title: "ANA ʻŌLINO", sub: "The Glowing Sea Cave", t0: time + 0.3 };
      } else if (Level.DEFS[fade.to]) {
        scene = "level"; Level.players = window.Net && Net.active() ? (Net.isHost() ? Net.count() : Level.players || Net.count()) : 1; Level.coop = Level.players > 1; Level.netGuest = !!(window.Net && Net.isGuest()); const L = Level.load(fade.to);
        const from = fade.from === "level" ? Level.prev : null;
        let sp = L.spawn;
        const fromLevel = from && from !== "sanctum" && Level.DEFS[from];
        if (fade.to === "sanctum" && fromLevel) sp = { x: L.def.returnAt.x * 32, y: L.def.returnAt.y * 32 };
        player.x = sp.x; player.y = sp.y; player.dir = fade.to === "sanctum" && !fromLevel ? "up" : "down";
        if (window.Net && Net.isGuest()) player.x += 20 * (Net.slot === 2 ? -1 : 1);                     // arrive beside the host, not on top of them
        // never arrive inside rock or a prop: spiral out to the nearest free footing
        if (blocked(player.x, player.y)) { search: for (let r = 4; r < 160; r += 4) for (let a = 0; a < Math.PI * 2; a += 0.3) { const x = sp.x + Math.cos(a) * r, y = sp.y + Math.sin(a) * r; if (!blocked(x, y)) { player.x = x; player.y = y; break search; } } }
        player.hp = player.maxHp; player.dead = false; player.downed = false;
        Combat.momentum = Math.max(Combat.momentum, Gear.stats().startMom);
        Level.prev = fade.to;
        banner = { title: L.def.title, sub: L.def.sub, t0: time + 0.3 };
      } else if (fade.to === "forge") {
        scene = "forge"; player.x = Forge.ENTRY.x; player.y = Forge.ENTRY.y; player.dir = "up";
        banner = { title: "KAMAKA'S FORGE", sub: "Shards become weapons and cloth here", t0: time + 0.3 };
      } else if (fade.to === "dojo") {
        scene = "dojo"; refreshDojo();
        const side = Dojo.arrive; Dojo.arrive = null;
        if (side === "west") { player.x = Dojo.WEST.x + 10; player.y = Dojo.WEST.y; player.dir = "side"; }
        else if (side === "east") { player.x = Dojo.EAST.x - 10; player.y = Dojo.EAST.y; player.dir = "left"; }
        else { player.x = Dojo.ENTRY.x; player.y = Dojo.ENTRY.y; player.dir = "up"; banner = { title: "HALE KOA", sub: "The Warriors' Training Hut", t0: time + 0.3 }; }
      } else {
        scene = "island"; washShells(); if (fade.from === "level") Gear.rerollStock();   // Makani has new stock each time you come home
        const back = fade.from === "dojo" ? World.hutDoor : fade.from === "forge" ? Forge.door() : fade.from === "level" ? { x: World.templeDoor.x, y: World.templeDoor.y + 22 } : World.caveMouth;
        player.x = back.x; player.y = back.y + 14; player.dir = "down";
      }
      Combat.setTargets(scene === "dojo" ? Dojo.dummies : scene === "level" ? Level.cur.enemies : []);
      Combat.allUnlocked = scene === "dojo"; Combat.openList = scene === "dojo" ? Dojo.rackList : null; Combat.ensureOpen();
      parts.length = 0;
      Ambience.setScene && Ambience.setScene(scene === "level" ? Level.cur.def.amb || Level.cur.name : scene);
    } else if (fade.dir === -1 && fade.a <= 0) { fade.a = 0; fade.dir = 0; Game.save(); }
  }

  let rackHover = -1;
  let dialog = null; // {name, text}
  let prompt = null; // {x, y, label}
  function updateInteraction() {
    prompt = null;
    if (scene === "cave") {
      if (player.y < Cave.EXIT_Y) goTo("island");
      pressedE = false;
      return;
    }
    if (scene === "level") { levelInteract(); pressedE = false; return; }
    if (scene === "dojo") {
      if (player.y > Dojo.H - 8) goTo("island");
      const side = Dojo.sideAt(player.x, player.y);
      if (side) { Dojo.leaving = side; goTo(side === "west" ? "dojo_duel" : "dojo_wing"); pressedE = false; return; }
      rackHover = Dojo.rackIndexAt(player.x, player.y);
      const stand = rackHover < 0 ? Dojo.standAt(player.x, player.y) : null;
      if (rackHover >= 0) prompt = { x: Dojo.rackPos.x + Dojo.rackSlots[rackHover], y: Dojo.rackPos.y + 50 };
      else if (stand) prompt = { x: stand.x, y: stand.y - 6 };
      if (pressedE && rackHover >= 0) {
        // the rack holds what you've earned (all of it in the test world): take any down to practise with
        const w = Combat.weapons[rackHover];
        Combat.select(rackHover);
        if (!Combat.loadout.includes(w.id)) banner = { title: w.name.toUpperCase(), sub: "From the rack: yours to practise with here", t0: time };
      } else if (pressedE && stand) {
        // an armour stand: put on a suit you own (a bare stand is one you haven't won yet)
        const A = Gear.ARMOR[stand.id];
        if (stand.owned) { Gear.state().worn = stand.id; Gear.changed(); refreshDojo(); banner = { title: A.name.toUpperCase(), sub: A.desc, t0: time }; Ambience.sfx && Ambience.sfx("equip"); }
        else banner = { title: A.name.toUpperCase(), sub: "Not yours yet. " + (A.src ? "Won in " + A.src + "." : "Woven at the forge from three " + Gear.ELEMENTS[A.el].name.toLowerCase() + " shards."), t0: time };
      }
      pressedE = false;
      return;
    }
    if (scene === "forge") {
      if (dialog) { if (pressedE) advanceDialog(); pressedE = false; return; }
      if (player.y > Forge.H - 8) goTo("island");
      const nf = Forge.near(player.x, player.y);
      if (nf === "smith") { prompt = { x: Forge.SMITH.x, y: Forge.SMITH.y - 40 }; if (pressedE) openForgeUI(); }
      else if (nf === "stand") { prompt = { x: Forge.STAND.x, y: Forge.STAND.y - 40 }; if (pressedE && window.Menu) Menu.toggle(true, "gear"); }
      pressedE = false; return;
    }
    const HD = World.hutDoor;
    if (Math.abs(player.x - HD.x) < 9 && player.y - HD.y < -2 && player.y - HD.y > -16) { goTo("dojo"); pressedE = false; return; }
    const FD = Forge.door();
    if (FD && ((Math.abs(player.x - FD.x) < 10 && player.y - FD.y < -2 && player.y - FD.y > -16) || (pressedE && Math.hypot(player.x - FD.x, player.y - FD.y) < 36))) { goTo("forge"); pressedE = false; return; }
    const plot = Forge.plotAt(player.x, player.y);
    if (plot && !dialog) { prompt = { x: plot.x, y: plot.y - 44 }; if (pressedE) { dialog = { name: plot.name, lines: plot.who === "smith" ? ["Stakes and rope mark out a building site.", "\"Forge, when the smith comes home,\" says the sign."] : ["Stakes and rope mark out a building site.", "One day, someone will build here."], i: 0, start: performance.now() }; pressedE = false; return; } }
    const nearHut = Math.hypot(player.x - HD.x, player.y - HD.y) < 30;
    const M = World.caveMouth;
    const mdx = player.x - M.x, mdy = player.y - M.y;
    if (Math.abs(mdx) < 13 && mdy < -6 && mdy > -30) { goTo("cave"); pressedE = false; return; }
    const nearCave = Math.hypot(mdx, mdy) < 34;
    let best = null, bd = 34;
    for (const n of World.npcs) {
      if (n.vendor && !Gear.rescued("vendor")) continue;
      const d = Math.hypot(n.x - player.x, n.y - player.y);
      if (d < bd) { bd = d; best = n; }
    }
    const stallNear = !Gear.rescued("vendor") && World.stall && Math.hypot(World.stall.x - player.x, World.stall.y + 10 - player.y) < 48;
    for (const sh of beach) if (!sh.got && Math.hypot(sh.x - player.x, sh.y - player.y) < 16) { sh.got = true; gotShell(sh.k); Gear.state().beach = beach.filter((b) => !b.got).map((b) => ({ x: b.x, y: b.y, k: b.k })); }
    const door = World.templeDoor;
    const nearDoor = Math.hypot(door.x - player.x, door.y - 10 - player.y) < 40;
    if (best) prompt = { x: best.x, y: best.y - 36 };
    else if (stallNear) prompt = { x: World.stall.x, y: World.stall.y - 70 };
    else if (nearDoor) prompt = { x: door.x, y: door.y - 52 };
    else if (nearCave) prompt = { x: M.x, y: M.y - 50 };
    else if (nearHut) prompt = { x: HD.x, y: HD.y - 40 };
    else if (FD && Math.hypot(player.x - FD.x, player.y - FD.y) < 32) prompt = { x: FD.x, y: FD.y - 44 };
    if (pressedE) {
      if (dialog) advanceDialog();
      else if (best) dialog = { name: best.name, lines: best.vendor && metMakani ? ["What'll it be? Shells are good here."] : best.lines, i: 0, start: performance.now(), onEnd: best.vendor ? () => { metMakani = true; openShop(); } : null };
      else if (stallNear) dialog = { name: "An empty stall", lines: ["Dust on the counter, the awning torn.", "Its keeper, Makani, was carried off toward the burning crown of the highlands."], i: 0, start: performance.now() };
      else if (nearCave) goTo("cave");
      else if (nearHut) goTo("dojo");
      else if (nearDoor) goTo("sanctum");
    }
    pressedE = false;
  }

  // Pressing on while a line is still being written finishes it at once; the next press moves on.
  const TYPE_MS = 28;
  function advanceDialog() {
    const full = dialog.lines[dialog.i], shown = Math.floor((performance.now() - dialog.start) / TYPE_MS);
    if (shown < full.length) { dialog.start = performance.now() - full.length * TYPE_MS - 1; return; }
    dialog.i++;
    if (dialog.i >= dialog.lines.length) { const end = dialog.onEnd; dialog = null; if (end) end(); }
    else dialog.start = performance.now();
  }

  // ------------------------------------------------------------------ level interactions (sanctum + highlands)
  function levelInteract() {
    const L = Level.cur, T = 32;
    if (dialog) { if (pressedE) advanceDialog(); return; }
    for (const ex of L.def.exits || []) if (player.x > ex.x0 * T && player.x < ex.x1 * T && player.y > ex.y0 * T) { if (ex.side) Dojo.arrive = ex.side; goTo(ex.to); return; }
    // Hale Koa's lecterns: call a creature, a boss, or a challenger
    for (const lc of L.lecterns || []) if (Math.hypot(player.x - lc.x, player.y - lc.y - 10) < 30) { prompt = { x: lc.x, y: lc.y - 44 }; if (pressedE) openLectern(lc.hall); return; }
    let near = null, bd = 42;
    for (const n of L.npcs) { const d = Math.hypot(n.x - player.x, n.y - player.y); if (d < bd) { bd = d; near = n; } }
    if (near) { prompt = { x: near.x, y: near.y - 36 }; if (pressedE) {
      if (Level.portalUnlocked) { dialog = { name: near.name, lines: ["Look into the globe, and tell me where the sun should take you."], i: 0, start: performance.now(), onEnd: openGlobe }; }
      else dialog = { name: near.name, lines: near.lines, i: 0, start: performance.now(), onEnd: () => { Level.portalUnlocked = true; L.portalOpen = true; Ambience.sfx && Ambience.sfx("portal"); if (window.Net && Net.isGuest()) Net.send({ t: "act", k: "talk" }); else if (window.Net && Net.isHost()) Net.send({ t: "sync", portal: 1 }); openGlobe(); } };
    } return; }
    const pt = L.def.portal;
    if (pt) { const px = pt.x * T, py = pt.y * T; if (Math.abs(player.x - px) < 18 && player.y < py + 12 && player.y > py - 30) { if (L.portalOpen) { Ambience.sfx && Ambience.sfx("portal"); goTo(Level.dest || pt.to); return; } else { prompt = { x: px, y: py - 70 }; if (pressedE) dialog = { name: "Sun Gate", lines: ["The great sun disc is cold and still.", "Perhaps its keeper can wake it."], i: 0, start: performance.now() }; } } }
    for (const gte of L.def.gates || []) {
      const gx = gte.x * T, gy = gte.y * T; if (Math.hypot(player.x - gx, player.y - gy) >= 26) continue;
      // a gate that only opens once the land's guardian has fallen
      const shut = gte.needs === "final" && !(L.arenas || []).some((a) => a.final && a.state === "done");
      if (shut) { if (!L.gateWarnT || time - L.gateWarnT > 4) { L.gateWarnT = time; L.banner = { title: "THE WAY IS SEALED", sub: "Kai-Uila still rules these waters", t0: time }; } continue; }
      prompt = { x: gx, y: gy - 60 }; if (pressedE) { Ambience.sfx && Ambience.sfx("portal"); goTo(gte.to); }
    }
    const sh = L.def.shrine;
    if (sh && !L.shrineTaken) { const sx = sh.x * T, sy = sh.y * T; if (Math.hypot(player.x - sx, player.y - sy) < 30) { prompt = { x: sx, y: sy - 52 }; if (pressedE) {
      if (window.Net && Net.isGuest()) Net.send({ t: "act", k: "shrine" });
      takeShrine(true);
    } } }
  }
  // ------------------------------------------------------------------ Hale Koa: the hall and its wings
  // the rack holds the weapons you've earned (everything in the test world); the stands every suit,
  // dressed if it's yours; the side doorways open as the hut grows (Gear dojo phase, 4 in the test world)
  function refreshDojo() {
    const list = Combat.weapons.map((w, i) => i).filter((i) => testWorld || Combat.unlocked.has(Combat.weapons[i].id));
    Dojo.refresh(list, Gear.state().dojo || 1, Gear.state().armors);
  }
  function openLectern(hall) {
    const L = Level.cur, test = testWorld, mates = matesHere().length > 0;
    if (hall !== "duel" && (Gear.state().dojo || 1) < L.def.halls[hall].phase) { banner = { title: "NOT YET", sub: "This hall of Hale Koa isn't finished", t0: time }; return; }
    const title = hall === "duel" ? "THE DUEL HALL" : hall === "bosses" ? "THE BOSS HALL" : "THE CREATURE HALL";
    const sub = hall === "duel" ? "Who will you face?" : hall === "bosses" ? "Call a great beast" : "Call a creature you have met";
    openPicker(title, sub, DojoWing.list(hall, test, mates), (it) => dojoCall(hall, it.key));
  }
  // calling is the host's to do (it changes the shared world); a guest asks
  function dojoCall(hall, key) {
    if (window.Net && Net.isGuest()) { Net.send({ t: "act", k: "dojo", hall, key }); return; }
    const L = Level.cur; if (!L || !L.def.dojo) return;
    if (hall === "duel") {
      if (key === "pvp") { startPvp(); return; }
      for (const e of L.enemies) if (!e.dead) { e.dead = true; e.gone = true; }
      const who = key.slice(5), c = DojoWing.CHALLENGERS.find((q) => q.id === who);
      DojoWing.makeDuelist(L, who, 5 * 32, 7.4 * 32);
      L.banner = { title: c.name.toUpperCase(), sub: "steps into the ring", t0: time };
      return;
    }
    const entry = DojoWing.list(hall, true, false).find((q) => q.key === key); if (!entry) return;
    DojoWing.call(L, hall, entry, { sfx: (k) => Ambience.sfx && Ambience.sfx(k) });
    if (!L.banner || L.banner.t0 < time - 0.1) L.banner = { title: entry.name.toUpperCase(), sub: hall === "bosses" ? "The great beast is called" : "The creature is called", t0: time };
  }
  // duels between heroes: only ever here, in the Duel Hall. A hit from a partner lands on you as a
  // blow scaled down to hearts; the first to fall yields, and both are made whole again.
  const pvp = { proxies: new Map(), hitT: {} };
  const toAll = (m) => { onNet(m, mySlot()); if (window.Net && Net.active()) for (const q of matesHere()) deliver(q.slot, m); };
  function startPvp() { if (!matesHere().length) { banner = { title: "NO ONE TO DUEL", sub: "Bring a partner into the Duel Hall", t0: time }; return; } toAll({ t: "duel", on: 1 }); }
  function pvpTargets() {
    const L = Level.cur; if (!L || !L.duelPvp) { pvp.proxies.clear(); return null; }
    const out = [];
    for (const q of matesHere()) { let d = pvp.proxies.get(q.slot); if (!d) { d = { pvp: true, slot: q.slot, hp: 1e9, max: 1e9, r: 8, dead: false, ang: 0, angV: 0 }; pvp.proxies.set(q.slot, d); } d.x = q.x; d.y = q.y; d.dead = !!q.dead; out.push(d); }
    return out;
  }
  Combat.onPvp = (d, dmg) => { if (time - (pvp.hitT[d.slot] || -9) < 0.25) return; pvp.hitT[d.slot] = time; deliver(d.slot, { t: "pvp", n: Math.max(1, Math.round(dmg / 12)), x: player.x, y: player.y, from: mySlot() }); };
  // brought down in Hale Koa: you yield. Nobody dies here.
  function dojoYield() {
    player.hp = player.maxHp; player.inv = 1.6; player.dead = false; player.downed = false;
    const L = Level.cur;
    if (L && L.duelPvp) { toAll({ t: "duelEnd", loser: mySlot() }); return; }
    if (L && !(window.Net && Net.isGuest())) for (const e of L.enemies) if (!e.dead) { e.dead = true; e.gone = true; }
    banner = { title: "YOU YIELD", sub: "Back on your feet. Call again when you're ready.", t0: time };
  }
  DojoWing.drawDuelist = (ctx, e, x, y, t, fl) => {
    const C = DojoWing.DUEL[e.who] || DojoWing.DUEL.makani;
    const art = e.who === "kamaka" ? Forge.smith : e.who === "kahu" ? (duelKeeper || (duelKeeper = Ruins.keeper()))[0] : heroFrames.merchant;
    const f = e.face || 1, bob = e.moving ? Math.abs(Math.sin(t * 12)) : 0, X = Math.round(x), Y = Math.round(y - bob);
    ctx.fillStyle = "rgba(10,12,16,0.3)"; ctx.beginPath(); ctx.ellipse(X, Math.round(y), 8, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    const wi = Combat.indexOf(C.weapon), spr = Combat.weapons[wi] && Combat.weapons[wi].spr;
    // the weapon: raised back on the wind-up, swept on the strike, whirled on a spin, crossed on guard
    let a = -Math.PI / 2 + 0.5 * f;
    if (e.state === "wind" || e.state === "windSlam" || e.state === "windSpin" || e.state === "windLunge") a = (e.aim || 0) + Math.PI * 0.85 * f;
    else if (e.state === "lunge") a = (e.aim || 0);
    else if (e.state === "strike" || e.state === "slam") a = (e.aim || 0) - 1 * f + Math.min(1, e.st / 0.12) * 2 * f;
    else if (e.state === "spin") a = t * 30;
    else if (e.state === "guard") a = f > 0 ? -0.2 : Math.PI + 0.2;
    const hx = X + f * 6, hy = Y - 13, back = Math.sin(a) < -0.3;
    const drawW = () => { if (!spr) return; ctx.save(); ctx.translate(hx, hy); ctx.rotate(a); ctx.drawImage(fl ? Combat.whiteOf(spr.c) : spr.c, -spr.gx, -spr.gy); ctx.restore(); };
    if (back) drawW();
    ctx.save(); ctx.translate(X, Y); if (e.state === "roll") ctx.rotate((e.st / 0.32) * Math.PI * 2 * f); ctx.scale(f, 1);
    ctx.drawImage(fl ? Combat.whiteOf(art) : art, -Math.round(art.width / 2), -art.height + 1); ctx.restore();
    if (!back) drawW();
    if (e.state === "strike" || e.state === "spin") { ctx.strokeStyle = "rgba(255,248,220,0.85)"; ctx.lineWidth = 2; ctx.beginPath(); if (e.state === "spin") ctx.ellipse(X, Y - 10, C.reach, C.reach * 0.55, 0, 0, Math.PI * 2); else ctx.arc(X, Y - 10, C.reach * 0.9, (e.aim || 0) - 0.9, (e.aim || 0) + 0.9); ctx.stroke(); }
    if (e.state === "wind" || e.state === "windSlam" || e.state === "windSpin" || e.state === "windLunge") { ctx.fillStyle = e.state === "windLunge" ? "#ff8a5a" : "#ffe08a"; ctx.fillRect(X - 1, Y - 40, 3, 3); }
    if (e.state === "lunge") { ctx.fillStyle = "rgba(255,248,220,0.7)"; for (let k = 1; k < 6; k++) ctx.fillRect(Math.round(X - Math.cos(e.aim || 0) * k * 5), Math.round(Y - 10 - Math.sin(e.aim || 0) * k * 4), 2, 1); }
    if (e.second && Math.random() < 0.3) Combat.addPart({ x: e.x + (Math.random() - 0.5) * 12, y: e.y - 4, vx: 0, vy: -30, life: 0.5, col: "#ffd27a", size: 1, kind: "ember", glow: true });
    if (e.state === "guard") { ctx.fillStyle = "#e8f0ff"; ctx.fillRect(X + f * 10, Y - 20, 1, 10); }
  };
  let duelKeeper = null;
  Enemies.ON_DEATH.duelist = (e) => { const c = DojoWing.CHALLENGERS.find((q) => q.id === e.who); if (Level.cur) Level.cur.banner = { title: (c ? c.name.split(" ")[0] : "THE CHALLENGER").toUpperCase() + " YIELDS", sub: "Well fought", t0: time }; };
  // the Shrine of Kū gives the Newa (the war club); in co-op both heroes take it up
  function takeShrine(here) {
    const L = Level.cur, sh = L.def.shrine; if (!sh) return;
    L.shrineTaken = Level.heelTaken = true; Combat.gain(sh.unlock); Ambience.sfx && Ambience.sfx("pickup");
    if (window.Net && Net.isHost()) Net.send({ t: "sync", heel: 1 });
    const w = Combat.weapons.find((q) => q.id === sh.unlock);
    if (here || !(window.Net && Net.active())) dialog = { name: "Shrine of Kū", lines: [`You take up the ${w.name}.`, "The war club of Kū settles into your grip. (Press Q / R to switch weapons.)"], i: 0, start: performance.now() };
    else banner = { title: w.name.toUpperCase(), sub: "Your partner woke the Shrine of Kū", t0: time };
  }

  // ------------------------------------------------------------------ ambient overlays
  let clouds = [];
  function buildClouds() {
    const r = K.rng(42);
    for (let k = 0; k < 5; k++) {
      const w = 140 + ((r() * 120) | 0), h = 70 + ((r() * 50) | 0);
      const [c, ctx] = K.canvas(w, h);
      ctx.fillStyle = "#0a1820";
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = (x - w / 2) / (w / 2), dy = (y - h / 2) / (h / 2);
        const n = K.fbm(x / 22 + k * 10, y / 22, 3);
        if (dx * dx + dy * dy < 0.55 + (n - 0.5) * 0.9) ctx.fillRect(x, y, 1, 1);
      }
      clouds.push({ c, x: r() * World.W, y: r() * World.H, sp: 7 + r() * 4 });
    }
  }
  let vignette, caveVignette;
  function buildVignette() {
    {
      const [c, ctx] = K.canvas(VW, VH);
      const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.18, VW / 2, VH / 2, VW * 0.62);
      g.addColorStop(0, "rgba(2,4,12,0)");
      g.addColorStop(0.6, "rgba(2,4,12,0.35)");
      g.addColorStop(1, "rgba(1,2,6,0.88)");
      ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
      caveVignette = c;
    }
    const [c, ctx] = K.canvas(VW, VH);
    const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.35, VW / 2, VH / 2, VW * 0.72);
    g.addColorStop(0, "rgba(10,20,30,0)");
    g.addColorStop(1, "rgba(10,18,32,0.38)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
    vignette = c;
  }

  // ------------------------------------------------------------------ resize
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);   // past 2x the extra pixels cost frames, not sharpness (the art is pixel art)
    const w = Math.floor(innerWidth * dpr), h = Math.floor(innerHeight * dpr);
    screen.width = w; screen.height = h;
    screen.style.width = innerWidth + "px"; screen.style.height = innerHeight + "px";
    SCALE = Math.max(1, Math.floor(Math.min(w / BASE_W, h / BASE_H)));
    VW = Math.ceil(w / SCALE); VH = Math.ceil(h / SCALE);
    // world layers are one pixel larger so they can be shifted by a sub-pixel amount
    [layerA, actx] = K.canvas(VW + 1, VH + 1);
    [layerB, bctx] = K.canvas(VW + 1, VH + 1);
    [hud, hctx] = K.canvas(VW, VH);
    [fxL, fctx] = K.canvas(VW + 1, VH + 1);
    [hardL, hardCtx] = K.canvas(VW + 1, VH + 1);
    [glowL, gctx] = K.canvas(VW + 1, VH + 1);
    [weapL, wctx] = K.canvas(VW + 1, VH + 1);
    sctx.imageSmoothingEnabled = false;
    if (World.W) buildVignette();
  }

  // ------------------------------------------------------------------ render
  const cam = { x: 0, y: 0, fx: 0, fy: 0 };
  let hintTimer = 12, bannerT = 0;

  function drawNPC(ctx, n, ox, oy, t) {
    const img = heroFrames.merchant;
    const x = Math.round(n.x) - 12 - ox, y = Math.round(n.y) - 31 - oy;
    const breath = Math.sin(t * 2.2 + n.phase) > 0.2 ? 1 : 0;
    ctx.drawImage(img, 0, 22, 24, 10, x, y + 22, 24, 10);
    ctx.drawImage(img, 0, 0, 24, 22, x, y + breath, 24, 22);
    if ((t + n.phase) % 3.7 < 0.14) {
      ctx.fillStyle = K.css(C.MERCHANT_PAL.k);
      ctx.fillRect(x + 8, y + 11 + breath, 2, 2); ctx.fillRect(x + 14, y + 11 + breath, 2, 2);
      ctx.fillStyle = K.css(C.MERCHANT_PAL.e);
      ctx.fillRect(x + 8, y + 12 + breath, 2, 1); ctx.fillRect(x + 14, y + 12 + breath, 2, 1);
    }
  }

  // Wooden plank bridge: deck + back rope rail (behind the hero) and a front rail object.
  const WOOD = { hi: "#d8a462", light: "#cc965c", mid: "#a87042", dark: "#7e502e", out: "#3c2418", gap: "#342016", rope: "#e0c890", ropeD: "#b09060", nail: "#4a3428" };
  function makeBridge(b) {
    const L = b.x1 - b.x0, H = 34, r = K.rng(b.x0 + b.y);
    const [deck, d] = K.canvas(L, H);
    const px = (c, x, y, w, h) => { d.fillStyle = c; d.fillRect(x, y, w || 1, h || 1); };
    // planks (run north-south), each with its own length, grain and nails
    for (let x = 0; x < L; x += 6) {
      const t0 = 6 + ((r() * 2) | 0), t1 = 30 - ((r() * 2) | 0);
      px(WOOD.out, x, t0 - 1, 6, t1 - t0 + 3);
      px(WOOD.light, x, t0, 1, t1 - t0 + 1); px(WOOD.mid, x + 1, t0, 3, t1 - t0 + 1); px(WOOD.dark, x + 4, t0, 1, t1 - t0 + 1);
      px(WOOD.hi, x, t0, 5, 1);
      px(WOOD.gap, x + 5, t0, 1, t1 - t0 + 1);
      for (let g = 0; g < 2; g++) px(WOOD.dark, x + 1 + ((r() * 3) | 0), t0 + 3 + ((r() * (t1 - t0 - 8)) | 0), 1, 3 + ((r() * 3) | 0));
      px(WOOD.nail, x + 2, t0 + 2); px(WOOD.nail, x + 2, t1 - 2);
    }
    const rail = (ctx, y0) => {
      const posts = [];
      for (let x = 1; x < L - 4; x += 30) posts.push(x);
      posts.push(L - 5);
      for (let i = 0; i < posts.length - 1; i++) {
        const a = posts[i] + 4, z = posts[i + 1];
        for (let x = a; x < z; x++) {
          const sag = Math.round(Math.sin(((x - a) / Math.max(1, z - a)) * Math.PI) * 2);
          ctx.fillStyle = (x >> 1) & 1 ? WOOD.rope : WOOD.ropeD; ctx.fillRect(x, y0 + 2 + sag, 1, 1);
          ctx.fillStyle = WOOD.ropeD; ctx.fillRect(x, y0 + 3 + sag, 1, 1);
          ctx.fillStyle = WOOD.out; ctx.fillRect(x, y0 + 4 + sag, 1, 1);
        }
      }
      for (const x of posts) {
        ctx.fillStyle = WOOD.out; ctx.fillRect(x - 1, y0 - 1, 6, 11);
        ctx.fillStyle = WOOD.mid; ctx.fillRect(x, y0, 4, 9);
        ctx.fillStyle = WOOD.light; ctx.fillRect(x, y0, 1, 9);
        ctx.fillStyle = WOOD.dark; ctx.fillRect(x + 3, y0, 1, 9);
        ctx.fillStyle = WOOD.hi; ctx.fillRect(x, y0, 4, 1);
      }
    };
    rail(d, 0);
    const [front, f] = K.canvas(L, 12);
    rail(f, 1);
    b.deck = deck; b.H = H;
    Props.objects.push({ x: (b.x0 + b.x1) / 2, y: b.y + 17, draw(ctx, ox, oy) { ctx.drawImage(front, Math.round(b.x0 - ox), Math.round(b.y + 7 - oy)); } });
  }
  function drawBridges(ctx, ox, oy) {
    for (const b of World.bridges) {
      const y = Math.round(b.y - 17 - oy);
      ctx.fillStyle = "rgba(0,40,50,0.32)";
      ctx.fillRect(Math.round(b.x0 - ox) + 2, y + 31, b.x1 - b.x0 - 2, 5);
      ctx.drawImage(b.deck, Math.round(b.x0 - ox), y);
    }
  }

  const E_KEY = ["oooooo", "owwwwo", "owoooo", "owwwoo", "owoooo", "owwwwo", "oooooo"];
  function drawPrompt(ctx, ox, oy, t) {
    if (!prompt || dialog) return;
    const x = Math.round(prompt.x - ox) - 5, y = Math.round(prompt.y - oy + Math.sin(t * 4) * 1.5);
    ctx.fillStyle = "#1c1420"; ctx.fillRect(x - 2, y - 2, 14, 13);
    ctx.fillStyle = "#f4e4c0"; ctx.fillRect(x - 1, y - 1, 12, 11);
    ctx.fillStyle = "#c9a870"; ctx.fillRect(x - 1, y + 9, 12, 1);
    K.pixmap(ctx, E_KEY, { o: [244, 228, 192], w: [40, 28, 36] }, x + 2, y + 1, false, 6);
    ctx.fillStyle = "#1c1420"; ctx.fillRect(x + 4, y + 11, 2, 1); ctx.fillRect(x + 5, y + 12, 1, 1);
  }

  const HEART = [".oo.oo.", "orrorro", "orRrrro", "orrrrro", ".orrro.", "..oro..", "...o..."];
  // hearts (each = 2 HP) + the Momentum bar with its tier pips
  const HEART_E = [".oo.oo.", "oaaoaao", "oaaaaao", "oaaaaao", ".oaaao.", "..oao..", "...o..."];
  function drawMateHUD(ctx) {
    if (!(window.Net && Net.active())) return;
    let row = 0;
    for (const q of mates.values()) {
      if (time - q.seen > 3) continue;
      const y = 34 + row * 8, col = SLOT_COL[q.slot] || "#f2c040"; row++;
      ctx.fillStyle = col; ctx.fillRect(6, y + 2, 2, 3); ctx.fillRect(8, y + 1, 1, 1);
      for (let k = 0; k < q.maxHp / 2; k++) {
        const v = q.hp - k * 2, x = 12 + k * 7;
        ctx.fillStyle = "#281018"; ctx.fillRect(x, y, 6, 5);
        ctx.fillStyle = q.dead ? (Math.floor(time * 4) % 2 ? "#ff5a4a" : "#4a2a34") : v >= 2 ? col : v === 1 ? "#8a7050" : "#4a2a34"; ctx.fillRect(x + 1, y + 1, 4, 3);
      }
      if (!isHere(q)) continue;
      // an arrow at the screen edge for a partner who is off screen
      const sx = q.x - cam.fx, sy = q.y - 14 - cam.fy;
      if (sx > 4 && sx < VW - 4 && sy > 4 && sy < VH - 4) continue;
      const cx = VW / 2, cy = VH / 2, a = Math.atan2(sy - cy, sx - cx), m = 10;
      const tx = K.clamp(sx, m, VW - m), ty = K.clamp(sy, m, VH - m);
      ctx.save(); ctx.translate(Math.round(tx), Math.round(ty)); ctx.rotate(a);
      ctx.fillStyle = "#140c16"; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -5); ctx.lineTo(-4, 5); ctx.fill();
      ctx.fillStyle = q.dead && Math.floor(time * 4) % 2 ? "#ff5a4a" : col; ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-3, -3); ctx.lineTo(-3, 3); ctx.fill(); ctx.restore();
    }
  }
  // an item's little icon: a red gourd for heals, the talisman's glyph in its element's colour
  // hover labels: anything drawn with tip() names itself when the mouse is over it
  let tips = [], mouseG = null;
  addEventListener("pointermove", (e) => { mouseG = { x: (e.clientX * (screen.width / innerWidth)) / SCALE, y: (e.clientY * (screen.height / innerHeight)) / SCALE }; });
  function tip(x, y, w, h, label) { tips.push({ x, y, w, h, label }); }
  function drawTips() {
    const m = mouseG, hit = m && tips.find((q) => m.x >= q.x && m.x < q.x + q.w && m.y >= q.y && m.y < q.y + q.h); tips = [];
    if (!hit) return;
    const u = SCALE; sctx.font = `${6 * u}px 'Pixelify Sans', monospace`; sctx.textAlign = "left"; sctx.textBaseline = "top";
    const w = Math.ceil(sctx.measureText(hit.label).width / u) + 8, x = Math.min(VW - w - 2, m.x + 8), y = Math.max(2, m.y - 14);
    sctx.fillStyle = "#140c16"; sctx.fillRect(x * u, y * u, w * u, 11 * u); sctx.fillStyle = "#ffd27a"; sctx.fillRect(x * u, y * u, w * u, u); sctx.fillStyle = "#fff6dc"; sctx.fillText(hit.label, (x + 4) * u, (y + 2) * u);
  }
  function itemIcon(ctx, id, x, y) {
    ctx.fillStyle = "#140c16"; ctx.fillRect(x, y, 16, 16); ctx.fillStyle = "#3a2a3e"; ctx.fillRect(x + 1, y + 1, 14, 14);
    if (id === "tonic" || id === "salve" || Gear.TALISMANS[id]) { ctx.drawImage(ItemArt.item(id, 16), x, y); if (Gear.TALISMANS[id]) { ctx.fillStyle = Gear.ELEMENTS[Gear.TALISMANS[id].el].col; ctx.fillRect(x + 1, y + 14, 14, 1); } }
  }
  function drawItems(ctx) {
    if (Gear.battle) { const pk2 = Gear.pack(); itemsHud = null; for (let i = 0; i < Gear.PACK; i++) { const x = VW - 8 - (Gear.PACK - i) * 18; if (pk2[i]) itemIcon(ctx, pk2[i], x, 6); else { ctx.fillStyle = "#140c16"; ctx.fillRect(x, 6, 16, 16); ctx.fillStyle = "#241a26"; ctx.fillRect(x + 1, 7, 14, 14); } } return; }
    const nt = Gear.count("tonic"), ns = Gear.count("salve"), pk = Gear.pick();
    let x = VW - 8, y = 6;
    if (pk) { const E = Gear.ELEMENTS[Gear.TALISMANS[pk].el]; x -= 18; ctx.fillStyle = "#140c16"; ctx.fillRect(x, y, 16, 16); ctx.fillStyle = E.col; ctx.fillRect(x + 1, y + 1, 14, 14); ctx.fillStyle = "#140c16"; ctx.fillRect(x + 3, y + 3, 10, 10); ctx.fillStyle = E.col; ctx.fillRect(x + 6, y + 4, 4, 8); ctx.fillRect(x + 4, y + 6, 8, 4); ctx.fillStyle = "#ffffff"; ctx.fillRect(x + 7, y + 7, 2, 2); }
    if (nt || ns) { x -= 18; ctx.fillStyle = "#140c16"; ctx.fillRect(x, y, 16, 16); ctx.fillStyle = "#3a2a3e"; ctx.fillRect(x + 1, y + 1, 14, 14); ctx.fillStyle = "#8a5a30"; ctx.fillRect(x + 6, y + 3, 4, 2); ctx.fillStyle = "#c84a5a"; ctx.fillRect(x + 4, y + 5, 8, 8); ctx.fillStyle = "#ff9aa8"; ctx.fillRect(x + 5, y + 6, 2, 3); }
    itemsHud = { x, y, nt, ns, pk };
  }
  let itemsHud = null;
  // your shells, under the hearts
  function drawPurse(ctx) {
    const y = scene === "level" || Combat.momentum > 0 ? 22 : 16, x = 6;
    ctx.drawImage(Gear.shellArt("clam"), x - 4, y - 5);
    purseHud = { x, y };
  }
  let purseHud = null;
  function drawHearts(ctx) {
    drawMateHUD(ctx); drawItems(ctx); drawPurse(ctx);
    const blink = player.inv > 0 && Math.floor(time * 12) % 2;
    for (let k = 0; k < player.maxHp / 2; k++) {
      const v = player.hp - k * 2, x = 6 + k * 9;
      K.pixmap(ctx, HEART_E, { o: [40, 16, 24], a: [70, 40, 50] }, x, 6, false, 7);
      if (v >= 2) K.pixmap(ctx, HEART, { o: [40, 16, 24], r: blink ? [255, 220, 220] : [230, 60, 60], R: [255, 170, 160] }, x, 6, false, 7);
      else if (v === 1) { ctx.save(); ctx.beginPath(); ctx.rect(x, 6, 4, 7); ctx.clip(); K.pixmap(ctx, HEART, { o: [40, 16, 24], r: [230, 60, 60], R: [255, 170, 160] }, x, 6, false, 7); ctx.restore(); }
    }
    if (scene === "level" || Combat.momentum > 0) {
      const m = Combat.momentum, tier = Combat.momTier(), x = 6, y = 16, w = 44;
      ctx.fillStyle = "#140c16"; ctx.fillRect(x - 1, y - 1, w + 2, 5);
      ctx.fillStyle = "#3a2a3e"; ctx.fillRect(x, y, w, 3);
      const col = tier >= 3 ? (Math.floor(time * 10) % 2 ? "#ffffff" : "#ffd27a") : tier === 2 ? "#ffb04a" : tier === 1 ? "#f2d070" : "#c8b890";
      ctx.fillStyle = col; ctx.fillRect(x, y, Math.round(w * m / 100), 3);
      for (const q of [33, 66]) { ctx.fillStyle = "#140c16"; ctx.fillRect(x + Math.round(w * q / 100), y, 1, 3); }
      for (let k = 0; k < tier; k++) { ctx.fillStyle = col; ctx.fillRect(x + w + 3 + k * 4, y, 2, 3); }
    }
  }
  function drawHUD(ctx, t) {
    drawHearts(ctx);
    // minimap
    const mm = World.minimap, mw = Math.round(mm.width / 2), mh = Math.round(mm.height / 2);
    const mx = VW - mw - 8, my = TOUCH ? 46 : VH - mh - 8;
    ctx.fillStyle = "#1a1220"; ctx.fillRect(mx - 3, my - 3, mw + 6, mh + 6);
    ctx.fillStyle = "#c08a3e"; ctx.fillRect(mx - 2, my - 2, mw + 4, mh + 4);
    ctx.fillStyle = "#1a1220"; ctx.fillRect(mx - 1, my - 1, mw + 2, mh + 2);
    ctx.drawImage(mm, mx, my, mw, mh);
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.strokeRect(mx + Math.round((cam.fx / World.MS) / 2) + 0.5, my + Math.round((cam.fy / World.MS) / 2) + 0.5, Math.round(VW / World.MS / 2), Math.round(VH / World.MS / 2));
    if (Math.floor(t * 3) % 2 === 0) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(mx + Math.round(player.x / World.MS / 2) - 1, my + Math.round(player.y / World.MS / 2) - 1, 3, 3);
      ctx.fillStyle = "#e04040";
      ctx.fillRect(mx + Math.round(player.x / World.MS / 2), my + Math.round(player.y / World.MS / 2), 1, 1);
    }
    // corner rivets
    ctx.fillStyle = "#ffd27a";
    for (const [cx, cy] of [[mx - 2, my - 2], [mx + mw + 1, my - 2], [mx - 2, my + mh + 1], [mx + mw + 1, my + mh + 1]]) ctx.fillRect(cx, cy, 1, 1);
  }

  function drawDialogBox(ctx) {
    if (!dialog) return null;
    const w = Math.min(320, VW - 24), h = 50, x = Math.round((VW - w) / 2), y = VH - h - 10;
    ctx.fillStyle = "#1a1220"; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = "#b07a3a"; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = "#f6e8c6"; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#e6d2a6"; ctx.fillRect(x, y + h - 3, w, 3);
    // name tab
    ctx.fillStyle = "#1a1220"; ctx.fillRect(x + 6, y - 11, 64, 12);
    ctx.fillStyle = "#2e8c5a"; ctx.fillRect(x + 7, y - 10, 62, 10);
    return { x, y, w, h };
  }

  // Smooth scrolling: the camera moves in fractions of an art pixel. The world is drawn at
  // the whole-pixel part (two layers: behind / in front of the hero) and the layers are shifted
  // on screen by the leftover fraction, while the hero is drawn at an exact screen position.
  // Result: steady, judder-free scrolling with crisp pixels.
  function renderCave(t) {
    const ox = Math.floor(cam.fx), oy = Math.floor(cam.fy);
    const sx = Math.round((cam.fx - ox) * SCALE), sy = Math.round((cam.fy - oy) * SCALE);
    const LW = VW + 1, LH = VH + 1;
    actx.fillStyle = "#04060e"; actx.fillRect(0, 0, LW, LH);
    actx.drawImage(Cave.ground, ox, oy, LW, LH, 0, 0, LW, LH);
    Cave.renderWater(actx, ox, oy, LW, LH, t, player);
    Combat.drawGround(actx, ox, oy);
    bctx.clearRect(0, 0, LW, LH);
    Cave.renderOverlay(bctx, ox, oy, LW, LH, t);
    hctx.clearRect(0, 0, VW, VH);
    hctx.drawImage(caveVignette, 0, 0);
    drawHearts(hctx);
    drawCombatHUD(hctx);
    sctx.imageSmoothingEnabled = false;
    drawMate(ox, oy, t);
    if (!player.dead && Combat.behindHero(player)) Combat.drawWeapon(actx, ox, oy, player, scene === "cave");
    sctx.drawImage(layerA, -sx, -sy, LW * SCALE, LH * SCALE);
    // the hero is a dark silhouette, rimmed by the pool's light
    drawHero(t, heroSil); drawHeldWeapon(true);
    sctx.drawImage(layerB, -sx, -sy, LW * SCALE, LH * SCALE);
    composeFx(ox, oy, sx, sy, true);
    sctx.drawImage(hud, 0, 0, VW * SCALE, VH * SCALE);
    drawTexts(t, null);
    drawCombatTexts(SCALE);
  }

  // hero (with dash afterimages tinted in the weapon's colour)
  const tintCache = new Map();
  function tinted(img, col) {
    const key = col; let m = tintCache.get(img); if (!m) tintCache.set(img, (m = {}));
    if (m[key]) return m[key];
    const [c, x] = K.canvas(img.width, img.height); x.drawImage(img, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = col; x.fillRect(0, 0, img.width, img.height);
    return (m[key] = c);
  }
  function drawHeldWeapon(sil) {
    if (player.dead || Combat.behindHero(player)) return;
    const ox = Math.floor(cam.fx), oy = Math.floor(cam.fy), sx = Math.round((cam.fx - ox) * SCALE), sy = Math.round((cam.fy - oy) * SCALE);
    wctx.clearRect(0, 0, VW + 1, VH + 1);
    Combat.drawWeapon(wctx, ox, oy, player, sil);
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(weapL, -sx, -sy, (VW + 1) * SCALE, (VH + 1) * SCALE);
  }
  function drawHero(t, frames) {
    const hx = Math.round((player.x - cam.fx) * SCALE), hy = Math.round((player.y - cam.fy) * SCALE);
    const col = Combat.weapons[Combat.cur].col;
    for (const a of Combat.after) {
      if (!a.ghost) continue;
      const age = Combat.clock - a.t0;
      sctx.globalAlpha = Math.max(0, (a.long ? 0.32 : 0.5) * (1 - age / (a.long ? 0.42 : 0.3)));
      sctx.drawImage(tinted(heroFrames[a.dir][2][0], a.col || col), Math.round((a.x - cam.fx) * SCALE) - 12 * SCALE, Math.round((a.y - cam.fy) * SCALE) - 30 * SCALE, 24 * SCALE, 32 * SCALE);
    }
    sctx.globalAlpha = 1;
    if (frames !== heroSil) {
      const sh = Props.shadow(7, 2);
      sctx.globalAlpha = 0.32; sctx.drawImage(sh, hx - 7 * SCALE, hy - 2 * SCALE, sh.width * SCALE, sh.height * SCALE); sctx.globalAlpha = 1;
    }
    player.tailT = (player.tailT || 0) + (1 / 60) * (2 + 7 * K.windStrength(t) + (player.moving || Combat.busy ? 4 : 0));
    const tv = Math.floor(player.tailT) % 2;
    let img = frames[player.dir][player.frame][tv];
    if (Combat.busy && Combat.moveT < 0.08) img = tinted(img, "#ffffff");   // a white flash on the wind-up
    if (player.inv > 0 && Math.floor(time * 14) % 2) sctx.globalAlpha = 0.45;
    if (player.rolling) {   // tuck and tumble through the roll
      const spin = (player.rollT / 0.34) * Math.PI * 2 * (Math.cos(player.rollA) >= 0 ? 1 : -1);
      sctx.save(); sctx.translate(hx, hy - 12 * SCALE); sctx.rotate(spin); sctx.scale(1, 0.8);
      sctx.drawImage(img, -12 * SCALE, -18 * SCALE, 24 * SCALE, 32 * SCALE); sctx.restore();
    } else { const cut = wadeCut(player); sctx.drawImage(img, 0, 0, 24, 32 - cut, hx - 12 * SCALE, hy - 30 * SCALE, 24 * SCALE, (32 - cut) * SCALE); if (cut) ripples(sctx, hx, hy - (cut > 4 ? 6 : 1) * SCALE, SCALE, time, cut); }
    sctx.globalAlpha = 1;
    // momentum aura: embers in the weapon's colour rise off the hero at tier II+
    if (Combat.momTier() >= 2 && Math.random() < 0.35) Combat.addPart({ x: player.x + (Math.random() - 0.5) * 12, y: player.y - Math.random() * 24, vx: 0, vy: -30, g: -10, life: 0.6, col: Combat.weapons[Combat.cur].col, size: 1, kind: "ember", glow: true });
  }
  // how much of a hero is under water (pixels cut from the bottom of the sprite)
  const wadeCut = (q) => { if (scene !== "level" || !Level.waterAt) return 0; const w = Level.waterAt(q.x, q.y); return w === 12 ? 8 : w === 11 ? 3 : 0; };
  function ripples(c, x, y, u, t, cut) {
    const rr = 9 + (cut > 4 ? 2 : 0);
    for (let k = 0; k < 2; k++) {
      const ph = (t * 0.9 + k * 0.5) % 1, r2 = rr * (0.7 + ph * 0.6);
      c.fillStyle = `rgba(230,250,252,${(0.75 * (1 - ph)).toFixed(2)})`;
      for (let a = 0; a < 6.28; a += 0.4) c.fillRect(Math.round(x + Math.cos(a) * r2 * u), Math.round(y + Math.sin(a) * r2 * 0.35 * u), u, u);
    }
  }
  function drawMate(ox, oy, t) { for (const q of matesHere()) drawOneMate(q, ox, oy, t); }
  function drawOneMate(q, ox, oy, t) {
    const ctx = q.y < player.y ? actx : bctx, x = Math.round(q.x - ox), y = Math.round(q.y - oy), F = framesFor(q.slot, q.outfit);
    const sh = Props.shadow(7, 2); ctx.globalAlpha = 0.32; ctx.drawImage(sh, x - 7, y - 2); ctx.globalAlpha = 1;
    q.tailT += (1 / 60) * (2 + 7 * K.windStrength(t) + (q.moving ? 4 : 0));
    const fr = F[q.dir] || F.down, img = fr[(q.frame || 0) % 4][Math.floor(q.tailT) % 2];
    if (q.dead) { ctx.save(); ctx.globalAlpha = 0.75; ctx.translate(x, y - 4); ctx.rotate(Math.PI / 2); ctx.drawImage(img, -16, -12); ctx.restore(); ctx.globalAlpha = 1; }
    else if (q.rolling) { const spin = ((q.rollT || 0) / 0.34) * Math.PI * 2 * (Math.cos(q.rollA || 0) >= 0 ? 1 : -1); ctx.save(); ctx.translate(x, y - 12); ctx.rotate(spin); ctx.scale(1, 0.8); ctx.drawImage(img, -12, -18); ctx.restore(); }
    else { if (q.inv && Math.floor(t * 14) % 2) ctx.globalAlpha = 0.45; const cut = wadeCut(q); ctx.drawImage(img, 0, 0, 24, 32 - cut, x - 12, y - 30, 24, 32 - cut); ctx.globalAlpha = 1; if (cut) ripples(ctx, x, y - (cut > 4 ? 6 : 1), 1, t, cut); }
    // a small pip in their colour over their head, so you can always pick them out
    ctx.fillStyle = "#140c16"; ctx.fillRect(x - 3, y - 38, 7, 4); ctx.fillStyle = SLOT_COL[q.slot] || "#f2c040"; ctx.fillRect(x - 2, y - 37, 5, 1); ctx.fillRect(x - 1, y - 36, 3, 1); ctx.fillRect(x, y - 35, 1, 1);
    if (q.dead) drawReviveRing(ctx, x, y, q.slot === rev.target ? rev.t / REVIVE_T : Math.max(0, ...matesHere().filter((o) => o.rv === q.slot).map((o) => o.rp)), t, true);
  }
  // a ring over a downed hero that fills as someone holds them up
  function drawReviveRing(ctx, x, y, u, t, prompt) {
    const cy = y - 46;
    ctx.fillStyle = "#140c16"; ctx.fillRect(x - 13, cy - 1, 26, 5);
    ctx.fillStyle = "#4a2a34"; ctx.fillRect(x - 12, cy, 24, 3);
    ctx.fillStyle = u > 0 ? "#7cf08a" : Math.floor(t * 3) % 2 ? "#ff8a6a" : "#ffd27a"; ctx.fillRect(x - 12, cy, Math.round(24 * Math.min(1, u)), 3);
    if (u <= 0 && prompt) { ctx.fillStyle = "#ffd27a"; ctx.fillRect(x - 1, cy - 6, 2, 3); ctx.fillRect(x - 1, cy - 2, 2, 1); }
  }
  // weapon + slash effects: crisp pixel layer, then additive glow, then the impact flash
  function composeFx(ox, oy, sx, sy, sil) {
    const LW = VW + 1, LH = VH + 1;
    fctx.clearRect(0, 0, LW, LH);
    const any = Combat.drawAir(fctx, gctx, ox, oy);
    const [dk, tint] = Combat.darkness();
    if (dk > 0.01) { sctx.fillStyle = `rgba(${tint},${dk * 0.62})`; sctx.fillRect(0, 0, screen.width, screen.height); }
    let src = fxL;
    if (any) {   // snap anti-aliased effect edges to hard pixels (only when effects are on screen)
      if (HARD_FILTER) {
        hardCtx.clearRect(0, 0, LW, LH); hardCtx.filter = "url(#hardAlpha)"; hardCtx.drawImage(fxL, 0, 0); hardCtx.filter = "none"; src = hardL;
      } else {
        const d = fctx.getImageData(0, 0, LW, LH), p = d.data;
        for (let i = 3; i < p.length; i += 4) p[i] = p[i] > 96 ? 255 : 0;
        fctx.putImageData(d, 0, 0);
      }
    }
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(src, -sx, -sy, LW * SCALE, LH * SCALE);
    sctx.save();
    sctx.globalCompositeOperation = "lighter";
    sctx.imageSmoothingEnabled = true;
    sctx.drawImage(glowL, -sx, -sy, LW * SCALE, LH * SCALE);
    if (Combat.flash > 0) { sctx.fillStyle = `rgba(${Combat.flashCol},${Combat.flash * 0.45})`; sctx.fillRect(0, 0, screen.width, screen.height); }
    sctx.restore();
    sctx.imageSmoothingEnabled = false;
    return any;
  }
  // weapon toolbar (bottom centre): one slot per equipped weapon, numbered 1-5, the one in hand lit in
  // its colour, with the surge diamonds over it. It is only as wide as what you carry.
  const SLOT = 30;
  function barSlots() { return Combat.allUnlocked && !Combat.loadout.includes(Combat.weapons[Combat.cur].id) ? Combat.loadout.concat([Combat.weapons[Combat.cur].id]) : Combat.loadout; }
  function barRect() { const n = barSlots().length, w = n * SLOT + 4; return { n, w, x: Math.round(VW / 2 - w / 2), y: VH - 36 }; }
  function drawCombatHUD(ctx) {
    if (dialog || globe.open || loadoutUI.open || forgeUI.open || shopUI.open || invUI.open) return;
    const w = Combat.weapons[Combat.cur], B = barRect(), ids = barSlots();
    ctx.fillStyle = "#1a1220"; ctx.fillRect(B.x - 2, B.y - 2, B.w + 4, SLOT + 6);
    ctx.fillStyle = "#c08a3e"; ctx.fillRect(B.x - 1, B.y - 1, B.w + 2, SLOT + 4);
    ctx.fillStyle = "#231a26"; ctx.fillRect(B.x, B.y, B.w, SLOT + 2);
    ids.forEach((id, k) => {
      const wi = Combat.indexOf(id), ww = Combat.weapons[wi], sx = B.x + 2 + k * SLOT, on = wi === Combat.cur;
      ctx.fillStyle = on ? ww.col : "#3a2e3c"; ctx.fillRect(sx, B.y + 1, SLOT - 2, SLOT);
      ctx.fillStyle = on ? "#2c2030" : "#1c1420"; ctx.fillRect(sx + 1, B.y + 2, SLOT - 4, SLOT - 2);
      ctx.globalAlpha = on ? 1 : 0.62; ctx.drawImage(ww.icon, sx, B.y + 2); ctx.globalAlpha = 1;
      if (k < 5) { ctx.fillStyle = on ? ww.col : "#8a7a88"; K.pixmap(ctx, DIGITS[k], { o: on ? hexRGB(ww.col) : [138, 122, 136] }, sx + 2, B.y + 3, false, 3); }
    });
    // surge diamonds above the weapon in hand
    const k = ids.indexOf(w.id);
    if (w.ult && k >= 0) for (let q = 0; q < Combat.SURGE; q++) {
      const full = q + 1 <= (w.charge || 0) + 1e-6, part = !full && q < (w.charge || 0), ready = (w.charge || 0) >= Combat.SURGE - 1e-6, dx = B.x + 2 + k * SLOT + SLOT / 2 - 11 + q * 7, dy = B.y - 9;
      const blink = ready && Math.floor(Combat.clock * 6) % 2;
      ctx.fillStyle = "#120c16"; ctx.fillRect(dx - 1, dy + 1, 7, 3); ctx.fillRect(dx + 1, dy - 1, 3, 7);
      ctx.fillStyle = full ? (blink ? "#ffffff" : w.col) : "#3a3040"; ctx.fillRect(dx, dy + 2, 5, 1); ctx.fillRect(dx + 2, dy, 1, 5); ctx.fillRect(dx + 1, dy + 1, 3, 3);
      if (part) { const fr = (w.charge || 0) - q, h = Math.max(1, Math.round(fr * 5)); ctx.fillStyle = w.col; ctx.globalAlpha = 0.75; ctx.fillRect(dx + 2, dy + 5 - h, 1, h); if (h >= 2) ctx.fillRect(dx + 1, dy + Math.max(1, 5 - h), 3, Math.min(3, h - 1)); ctx.globalAlpha = 1; }
    }
  }
  const DIGITS = [[".o.", "oo.", ".o.", ".o.", "ooo"], ["oo.", "..o", ".o.", "o..", "ooo"], ["oo.", "..o", ".o.", "..o", "oo."], ["o.o", "o.o", "ooo", "..o", "..o"], ["ooo", "o..", "oo.", "..o", "oo."]];
  const hexRGB = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  function drawCombatTexts(u) {
    if (dialog) return;
    if (purseHud && !globe.open && !loadoutUI.open) { sctx.font = `${6 * u}px 'Pixelify Sans', monospace`; sctx.textAlign = "left"; sctx.fillStyle = "#f4e6c8"; sctx.fillText(String(Gear.shellTotal()), (purseHud.x + 13) * u, (purseHud.y) * u); }
    if (itemsHud && !globe.open && !loadoutUI.open) {
      const I = itemsHud; sctx.font = `${6 * u}px 'Pixelify Sans', monospace`; sctx.textAlign = "right"; sctx.fillStyle = "#fff6dc";
      if (I.pk) sctx.fillText(String(Gear.count(I.pk)), (VW - 9) * u, (I.y + 10) * u);
      if (I.nt || I.ns) sctx.fillText(I.nt + (I.ns ? "+" + I.ns : ""), (I.x + 15) * u, (I.y + 10) * u);
      sctx.textAlign = "left";
    }
    if (globe.open || loadoutUI.open) return;
    // the name of the weapon in hand, over the toolbar
    const w = Combat.weapons[Combat.cur], B = barRect(), nx = VW / 2, ny = B.y - (w.ult ? 22 : 13);
    sctx.textBaseline = "top"; sctx.textAlign = "center";
    sctx.font = `${7 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#120c16"; sctx.fillText(w.name, nx * u + u, ny * u + u); sctx.fillStyle = "#fff6dc"; sctx.fillText(w.name, nx * u, ny * u);
    sctx.textAlign = "left";
    if (scene === "dojo" && rackHover >= 0) {
      const hw = Combat.weapons[rackHover], hx = (Dojo.rackPos.x + Dojo.rackSlots[rackHover] - cam.fx) * u, hy = (Dojo.rackPos.y + 64 - cam.fy) * u;
      sctx.textAlign = "center"; sctx.font = `${7 * u}px 'Pixelify Sans', monospace`;
      sctx.fillStyle = "#1a1220"; sctx.fillText(hw.name, hx + u, hy + u); sctx.fillStyle = hw.col; sctx.fillText(hw.name, hx, hy);
      sctx.textAlign = "left";
    }
    // ultimate banner
    const ua = Combat.clock - (Combat.ultT || -9), ra = Combat.clock - (Combat.readyT || -9);
    if (ua < 1.6 || ra < 1.4) {
      const txt = ua < 1.6 ? Combat.ultName.toUpperCase() : "SURGE READY", age = ua < 1.6 ? ua : ra, a = age < 0.15 ? age / 0.15 : age > 1.1 ? Math.max(0, 1 - (age - 1.1) / 0.4) : 1;
      sctx.globalAlpha = a; sctx.textAlign = "center"; sctx.font = `${Math.round((ua < 1.6 ? 18 : 10) * (age < 0.12 ? 1.4 - age * 3.3 : 1) * u)}px 'Pixelify Sans', monospace`;
      sctx.fillStyle = "#120c16"; sctx.fillText(txt, (VW / 2) * u + 2 * u, 84 * u + 2 * u); sctx.fillStyle = w.col; sctx.fillText(txt, (VW / 2) * u, 84 * u);
      sctx.globalAlpha = 1; sctx.textAlign = "left";
    }
    if (scene === "dojo" && Combat.clock - (Combat.switchT || -9) < 2.5) {
      sctx.font = `${6 * u}px 'Pixelify Sans', monospace`;
      sctx.fillStyle = "rgba(255,246,220,0.85)"; sctx.textAlign = "center";
      sctx.fillText("Unlocked: " + w.unlock, (VW / 2) * u, (VH - 46) * u); sctx.textAlign = "left";
    }
    for (const n of Combat.nums) {
      const age = Combat.clock - n.t0, nx = (n.x - cam.fx) * u, ny = (n.y - cam.fy - age * 26 - (age < 0.12 ? (0.12 - age) * 40 : 0)) * u;
      const sz = (n.crit ? 11 : 8) * (age < 0.1 ? 1.4 - age * 4 : 1);
      sctx.globalAlpha = age > 0.6 ? (0.9 - age) / 0.3 : 1;
      sctx.font = `${Math.round(sz * u)}px 'Pixelify Sans', monospace`; sctx.textAlign = "center";
      sctx.fillStyle = "#1a1220"; sctx.fillText(String(n.v), nx + u, ny + u);
      sctx.fillStyle = n.col; sctx.fillText(String(n.v), nx, ny);
      sctx.globalAlpha = 1; sctx.textAlign = "left";
    }
    if (Combat.combo >= 2) {
      const age = Combat.clock - Combat.comboT, pop = age < 0.1 ? 1.3 - age * 3 : 1;
      sctx.textAlign = "right"; sctx.font = `${Math.round(14 * pop * u)}px 'Pixelify Sans', monospace`;
      sctx.fillStyle = "#1a1220"; sctx.fillText(Combat.combo + " HITS", (VW - 10) * u + u, 40 * u + u);
      sctx.fillStyle = w.col; sctx.fillText(Combat.combo + " HITS", (VW - 10) * u, 40 * u);
      sctx.textAlign = "left";
    }
  }

  function renderDojo(t, forge) {
    const ox = Math.floor(cam.fx), oy = Math.floor(cam.fy);
    const sx = Math.round((cam.fx - ox) * SCALE), sy = Math.round((cam.fy - oy) * SCALE);
    const LW = VW + 1, LH = VH + 1;
    bctx.clearRect(0, 0, LW, LH);
    (forge ? Forge : Dojo).render(actx, bctx, gctx, ox, oy, LW, LH, t, player.y, player.x);
    drawPrompt(bctx, ox, oy, t);
    hctx.clearRect(0, 0, VW, VH);
    drawHearts(hctx);
    drawCombatHUD(hctx);
    sctx.imageSmoothingEnabled = false;
    drawMate(ox, oy, t);
    if (!player.dead && Combat.behindHero(player)) Combat.drawWeapon(actx, ox, oy, player, scene === "cave");
    sctx.drawImage(layerA, -sx, -sy, LW * SCALE, LH * SCALE);
    drawHero(t, framesFor(mySlot(), Gear.wornId())); drawHeldWeapon(false);
    sctx.drawImage(layerB, -sx, -sy, LW * SCALE, LH * SCALE);
    composeFx(ox, oy, sx, sy);
    sctx.drawImage(hud, 0, 0, VW * SCALE, VH * SCALE);
    drawTexts(t, null);
    drawCombatTexts(SCALE);
  }

  function renderLevel(t) {
    const ox = Math.floor(cam.fx), oy = Math.floor(cam.fy);
    const sx = Math.round((cam.fx - ox) * SCALE), sy = Math.round((cam.fy - oy) * SCALE);
    const LW = VW + 1, LH = VH + 1, L = Level.cur;
    Level.drawBack(actx, ox, oy, LW, LH, t);
    Combat.drawGround(actx, ox, oy);
    Level.drawSeals(actx, gctx, ox, oy, t);
    bctx.clearRect(0, 0, LW, LH);
    const vis = [];
    for (const o of Level.drawables()) if (o.x > ox - 120 && o.x < ox + LW + 120 && o.y > oy - 20 && o.y < oy + LH + 140) vis.push(o);
    for (const e of L.enemies) if (!e.dead && e.x > ox - (e.big ? 220 : 60) && e.x < ox + LW + (e.big ? 220 : 60) && e.y > oy - (e.big ? 160 : 40) && e.y < oy + LH + (e.big ? 200 : 60)) vis.push({ y: e.y + (e.fly ? 14 : 0), enemy: e });
    vis.sort((a, b) => a.y - b.y);
    for (const o of vis) {
      const ctx = o.y < player.y ? actx : bctx;
      if (o.enemy) Enemies.draw(o.enemy, ctx, ox, oy, t, gctx);
      else o.draw(ctx, ox, oy, t, gctx);
    }
    Enemies.drawShots(bctx, ox, oy, L);
    Enemies.drawGlow(gctx, ox, oy, L);
    Level.drawAir(bctx, ox, oy, t, LW, LH);
    drawPrompt(bctx, ox, oy, t);
    Level.drawLight(gctx, ox, oy, t);
    hctx.clearRect(0, 0, VW, VH);
    if (L.def.bg === "abyss") hctx.drawImage(caveVignette, 0, 0); else hctx.drawImage(vignette, 0, 0);
    drawHearts(hctx);
    drawCombatHUD(hctx);
    const box = drawDialogBox(hctx);
    sctx.imageSmoothingEnabled = false;
    drawMate(ox, oy, t);
    if (!player.dead && Combat.behindHero(player)) Combat.drawWeapon(actx, ox, oy, player, scene === "cave");
    sctx.drawImage(layerA, -sx, -sy, LW * SCALE, LH * SCALE);
    drawHero(t, framesFor(mySlot(), Gear.wornId())); drawHeldWeapon(false);
    sctx.drawImage(layerB, -sx, -sy, LW * SCALE, LH * SCALE);
    composeFx(ox, oy, sx, sy);
    if (flowT > 0) { sctx.fillStyle = `rgba(120,200,255,${0.12 * Math.min(1, flowT * 4)})`; sctx.fillRect(0, 0, screen.width, screen.height); }
    if (player.dead) { sctx.fillStyle = `rgba(20,0,0,${Math.min(0.7, (t - deathT) * 0.6)})`; sctx.fillRect(0, 0, screen.width, screen.height); }
    sctx.drawImage(hud, 0, 0, VW * SCALE, VH * SCALE);
    drawTexts(t, box);
    drawCombatTexts(SCALE);
    const u = SCALE;
    if (t - perfectT < 0.9) { sctx.globalAlpha = 1 - (t - perfectT) / 0.9; sctx.textAlign = "center"; sctx.font = `${10 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#120c16"; sctx.fillText("PERFECT DODGE", (VW / 2) * u + u, 100 * u + u); sctx.fillStyle = "#9ee6ff"; sctx.fillText("PERFECT DODGE", (VW / 2) * u, 100 * u); sctx.textAlign = "left"; sctx.globalAlpha = 1; }
    if (player.dead) {
      sctx.textAlign = "center"; sctx.font = `${16 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#ffd0c0";
      const waiting = player.downed && matesHere().some((q) => !q.dead);
      sctx.fillText(waiting ? "KNOCKED DOWN" : "YOU FALL...", (VW / 2) * u, (VH / 2 - 10) * u);
      if (waiting) {
        const helping = matesHere().filter((q) => q.rv === mySlot()).reduce((m, q) => Math.max(m, q.rp), 0);
        sctx.font = `${8 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#fff6dc";
        sctx.fillText(helping > 0 ? `Being revived... ${Math.round(helping * 100)}%` : "Hold on! A partner can revive you.", (VW / 2) * u, (VH / 2 + 10) * u);
      }
      sctx.textAlign = "left";
    }
    const boss = L.enemies.find((e) => e.boss && !e.dead && e.alerted && e.introT <= 0);
    if (boss) {
      const w = Math.min(220, VW - 60), bx = Math.round((VW - w) / 2), by = 18;
      sctx.fillStyle = "#140c16"; sctx.fillRect((bx - 2) * u, (by - 2) * u, (w + 4) * u, 8 * u);
      sctx.fillStyle = "#4a2030"; sctx.fillRect(bx * u, by * u, w * u, 4 * u);
      sctx.fillStyle = boss.armor < 0.2 ? "#c8c0b0" : "#e8503c"; sctx.fillRect(bx * u, by * u, Math.round(w * Math.max(0, boss.hp / boss.max)) * u, 4 * u);
      sctx.fillStyle = "#ffb08a"; sctx.fillRect(bx * u, by * u, Math.round(w * Math.max(0, boss.hp / boss.max)) * u, u);
      sctx.textAlign = "center"; sctx.font = `${7 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#120c16"; sctx.fillText(boss.name || "", (VW / 2) * u + u, (by - 11) * u + u); sctx.fillStyle = "#ffe08a"; sctx.fillText(boss.name || "", (VW / 2) * u, (by - 11) * u); sctx.textAlign = "left";
    }
    if (L.timer > 0) {
      const sec = Math.ceil(L.timer), msg = `SURVIVE  ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
      sctx.textAlign = "center"; sctx.font = `${12 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#120c16"; sctx.fillText(msg, (VW / 2) * u + u, 14 * u + u); sctx.fillStyle = sec <= 5 ? "#7cf08a" : "#ffd27a"; sctx.fillText(msg, (VW / 2) * u, 14 * u); sctx.textAlign = "left";
    }
    if (rev.target >= 0 && !player.dead) {
      sctx.textAlign = "center"; sctx.font = `${8 * u}px 'Pixelify Sans', monospace`;
      const msg = rev.t > 0 ? `Reviving... ${Math.round((rev.t / REVIVE_T) * 100)}%` : TOUCH ? "Hold USE to revive" : "Hold E to revive";
      sctx.fillStyle = "#120c16"; sctx.fillText(msg, (VW / 2) * u + u, (VH - 74) * u + u); sctx.fillStyle = "#7cf08a"; sctx.fillText(msg, (VW / 2) * u, (VH - 74) * u);
      sctx.textAlign = "left";
    }
  }
  // the title screen's backdrop: open deep sea, top down, drifting slowly
  function renderTitleSea(t) {
    if (!worldReady) return;
    const fx = 6000 + t * 7, fy = 3000 + t * 3.2, ox = Math.floor(fx), oy = Math.floor(fy), sx = Math.round((fx - ox) * SCALE), sy = Math.round((fy - oy) * SCALE);
    Water.renderDeep(actx, ox, oy, VW + 1, VH + 1, t);
    sctx.imageSmoothingEnabled = false;
    sctx.drawImage(layerA, -sx, -sy, (VW + 1) * SCALE, (VH + 1) * SCALE);
  }
  let worldReady = false;
  function render(t) {
    gctx.clearRect(0, 0, VW + 1, VH + 1);
    if (scene === "cave") renderCave(t);
    else if (scene === "dojo") renderDojo(t);
    else if (scene === "forge") renderDojo(t, true);
    else if (scene === "level") renderLevel(t);
    else renderIsland(t);
    if (globe.open) drawGlobe(t);
    if (loadoutUI.open) drawLoadout(t);
    if (forgeUI.open) drawForgeUI(t);
    if (shopUI.open) drawShop(t);
    drawTips();
    if (invUI.open) drawInventory(t);
    if (pick.open) drawPicker(t);
    if (fade.a > 0) { sctx.fillStyle = `rgba(2,3,8,${Math.min(1, fade.a)})`; sctx.fillRect(0, 0, screen.width, screen.height); }
  }

  function renderIsland(t) {
    const ox = Math.floor(cam.fx), oy = Math.floor(cam.fy);
    const sx = Math.round((cam.fx - ox) * SCALE), sy = Math.round((cam.fy - oy) * SCALE);
    const LW = VW + 1, LH = VH + 1;
    let ctx = actx;
    ctx.drawImage(World.ground, ox, oy, LW, LH, 0, 0, LW, LH);
    Water.render(ctx, ox, oy, LW, LH, t);
    drawBridges(ctx, ox, oy);
    Combat.drawGround(ctx, ox, oy);

    const vis = [];
    const pad = 140;
    for (const o of Props.objects.concat(Forge.islandObjects(), beach.filter((b) => !b.got).map((b) => ({ x: b.x, y: b.y, shell: b })))) {
      if (o.x < ox - pad || o.x > ox + LW + pad || o.y < oy - 20 || o.y > oy + LH + 160) continue;
      vis.push(o);
    }
    for (const o of vis) if (o.shadow) o.shadow(ctx, ox, oy, t);
    for (const n of World.npcs) Props.drawShadow(ctx, n.x - ox, n.y - oy, 7, 2, 0.32);
    for (const c of Props.critters) if (c.kind === "fly") Props.drawShadow(ctx, c.x - ox, c.y - oy + c.z, 1, 1, 0.2);
    for (const c of Props.critters) if (c.x > ox - 10 && c.x < ox + LW + 10 && c.y > oy - 10 && c.y < oy + LH + 20) vis.push({ y: c.y, critter: c });
    vis.sort((a, b) => a.y - b.y);

    bctx.clearRect(0, 0, LW, LH);
    for (const o of vis) {
      ctx = o.y < player.y ? actx : bctx;
      if (o.critter) {
        const c = o.critter;
        if (c.kind === "crab") ctx.drawImage((c.ghost ? Props.ghostCrabFrames() : Props.crabFrames)[Math.floor(c.frame) % 2], Math.round(c.x - 4 - ox), Math.round(c.y - 5 - oy));
        else ctx.drawImage(Props.butterflyFrames[c.col][Math.floor(t * 9 + c.sp) % 2], Math.round(c.x - 2 - ox), Math.round(c.y - c.z - oy - Math.abs(Math.sin(t * 3 + c.sp)) * 3));
      } else if (o.kind === "npc") { if (!o.vendor || Gear.rescued("vendor")) drawNPC(ctx, o, ox, oy, t); }
      else if (o.shell) { const img = Gear.shellArt(o.shell.k); ctx.drawImage(img, Math.round(o.shell.x - 8 - ox), Math.round(o.shell.y - 12 - oy)); if (Math.sin(t * 3 + o.shell.x) > 0.85) { ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round(o.shell.x + 3 - ox), Math.round(o.shell.y - 11 - oy), 1, 1); } }
      else o.draw(ctx, ox, oy, t);
    }
    ctx = bctx;
    // particles: leaves, petals, dust and wind streaks
    for (const p of parts) {
      const a = Math.min(1, p.life / (p.max * 0.4));
      if (p.streak) {
        const fade = Math.min(1, (p.max - p.life) * 3) * a * 0.55;
        ctx.fillStyle = `rgba(240,250,240,${fade})`;
        for (let k = 0; k < p.len; k++) ctx.fillRect(Math.round(p.x - ox - k), Math.round(p.y - oy + Math.sin(k * 0.35 + p.ph + t * 2) * 1.5), 1, 1);
        continue;
      }
      ctx.fillStyle = K.css(p.col, p.ground ? a * 0.9 : a);
      ctx.fillRect(Math.round(p.x - ox), Math.round(p.y - oy), p.size, p.leaf && p.size > 1 ? 1 : p.size);
      if (p.leaf && p.size > 1) ctx.fillRect(Math.round(p.x - ox) + (Math.sin(t * 5 + p.ph) > 0 ? 1 : 0), Math.round(p.y - oy) + 1, 1, 1);
    }
    // drifting cloud shadows
    ctx.globalAlpha = 0.1;
    for (const c of clouds) {
      const x = (((c.x + t * c.sp) % (World.W + 400)) + World.W + 400) % (World.W + 400) - 200;
      const y = c.y + Math.sin(t * 0.05 + c.x) * 20;
      if (x + c.c.width < ox || x > ox + LW || y + c.c.height < oy || y > oy + LH) continue;
      ctx.drawImage(c.c, Math.round(x - ox), Math.round(y - oy));
    }
    ctx.globalAlpha = 1;
    drawPrompt(ctx, ox, oy, t);

    // HUD layer (does not scroll)
    hctx.clearRect(0, 0, VW, VH);
    hctx.drawImage(vignette, 0, 0);
    drawHUD(hctx, t);
    drawCombatHUD(hctx);
    const box = drawDialogBox(hctx);

    // compose on screen
    sctx.imageSmoothingEnabled = false;
    drawMate(ox, oy, t);
    if (!player.dead && Combat.behindHero(player)) Combat.drawWeapon(actx, ox, oy, player, scene === "cave");
    sctx.drawImage(layerA, -sx, -sy, LW * SCALE, LH * SCALE);
    drawHero(t, framesFor(mySlot(), Gear.wornId())); drawHeldWeapon(false);
    sctx.drawImage(layerB, -sx, -sy, LW * SCALE, LH * SCALE);
    composeFx(ox, oy, sx, sy);
    sctx.drawImage(hud, 0, 0, VW * SCALE, VH * SCALE);

    drawTexts(t, box);
    drawCombatTexts(SCALE);
  }

  function drawTexts(t, box) {
    const u = SCALE;
    sctx.textBaseline = "top";
    if (box) {
      sctx.font = `${7 * u}px 'Pixelify Sans', monospace`;
      sctx.fillStyle = "#fff6dc";
      sctx.fillText(dialog.name, (box.x + 11) * u, (box.y - 10) * u);
      const full = dialog.lines[dialog.i];
      const shown = full.slice(0, Math.floor((performance.now() - dialog.start) / TYPE_MS));
      sctx.fillStyle = "#3a2630";
      sctx.font = `${8 * u}px 'Pixelify Sans', monospace`;
      wrapText(shown, (box.x + 8) * u, (box.y + 7) * u, (box.w - 16) * u, 11 * u);
      if (shown.length === full.length && Math.floor(t * 2.5) % 2 === 0) {
        sctx.fillStyle = "#b07a3a";
        sctx.fillText("▼", (box.x + box.w - 12) * u, (box.y + box.h - 13) * u);
      }
    }
    // title banner
    bannerT = t - banner.t0;
    if (bannerT > 0 && bannerT < 6) {
      const a = bannerT < 1 ? bannerT : bannerT > 4.5 ? Math.max(0, (6 - bannerT) / 1.5) : 1;
      sctx.globalAlpha = a;
      sctx.textAlign = "center";
      sctx.font = `${22 * u}px 'Pixelify Sans', monospace`;
      sctx.fillStyle = "#1a1220";
      sctx.fillText(banner.title, (VW / 2) * u + u * 2, 34 * u + u * 2);
      sctx.fillStyle = "#ffe08a";
      sctx.fillText(banner.title, (VW / 2) * u, 34 * u);
      sctx.font = `${8 * u}px 'Pixelify Sans', monospace`;
      sctx.fillStyle = "#1a1220";
      sctx.fillText(banner.sub, (VW / 2) * u + u, 62 * u + u);
      sctx.fillStyle = "#fff6dc";
      sctx.fillText(banner.sub, (VW / 2) * u, 62 * u);
      sctx.textAlign = "left";
      sctx.globalAlpha = 1;
    }
    if (hintTimer > 0 && !dialog) {
      sctx.globalAlpha = Math.min(1, hintTimer);
      sctx.font = `${7 * u}px 'Pixelify Sans', monospace`;
      const msg = TOUCH ? "Left thumb: move   ATK attack   ROLL dodge   USE talk / revive   WPN weapon   HEAL / SPR items   INV inventory" : "WASD move  Shift run  J attack  Space dodge  Q/R weapon  E talk  H heal  T talisman  I inventory  Esc settings  C co-op";
      const w = sctx.measureText(msg).width;
      sctx.fillStyle = "rgba(20,14,24,0.7)";
      sctx.fillRect(6 * u, (VH - 58) * u, w + 10 * u, 14 * u);
      sctx.fillStyle = "#fff6dc";
      sctx.fillText(msg, 11 * u, (VH - 55) * u);
      sctx.globalAlpha = 1;
    }
  
  }
  function wrapText(text, x, y, maxW, lh) {
    const words = text.split(" ");
    let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (sctx.measureText(test).width > maxW && line) { sctx.fillText(line, x, y); line = w; y += lh; }
      else line = test;
    }
    sctx.fillText(line, x, y);
  }

  // ------------------------------------------------------------------ loop
  let last = 0, time = 0, leafT = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    if (window.Title && Title.open) { renderTitleSea(now / 1000); requestAnimationFrame(frame); return; }   // the title screen is up: the world waits
    time += dt; playT += dt;
    Gear.battle = scene === "level" && !!Level.cur && Level.cur.name !== "sanctum";
    const gst = Gear.stats();
    if (gst.regen && scene === "level" && !player.dead && player.hp < player.maxHp) { regenT += dt; if (regenT > gst.regen) { regenT = 0; player.hp = Math.min(player.maxHp, player.hp + 1); healT = time; } } else regenT = 0;
    if (time - saveT > 60) Game.save();
    if (flowT > 0) flowT -= dt;
    // the settings menu pauses solo play (a co-op world keeps going)
    if (window.Menu && Menu.open && !(window.Net && Net.active())) { netTick(dt); render(time); requestAnimationFrame(frame); return; }
    const gdt = flowT > 0 ? dt * 0.35 : dt;           // perfect-dodge slow motion
    if (Combat.hitstop > 0) Combat.hitstop -= dt;     // impact frame: the world holds still for a beat
    else {
      updatePlayer(gdt); Combat.update(gdt, player, tryMove);
      if (scene === "level" && fade.dir !== 1) {
        if (Level.cur.def.dojo) { const pt = pvpTargets(); Combat.setTargets(pt ? Level.cur.enemies.concat(pt) : Level.cur.enemies); }
        if (Level.netGuest && window.Net && Net.isGuest()) { Enemies.netUpdate(gdt, time, Level.cur); Level.update(gdt, time, player, levelApi, []); }
        else { const others = matesHere(); Enemies.update(gdt, time, player, Level.cur, levelApi, others); Level.update(gdt, time, player, levelApi, others); }
        if (Level.cur.banner) { banner = { title: Level.cur.banner.title, sub: Level.cur.banner.sub || "", t0: time }; if (window.Net && Net.isHost()) Net.send({ t: "banner", title: banner.title, sub: banner.sub }); Level.cur.banner = null; }
      }
    }
    updateRevive(dt);
    if (player.dead && time - deathT > 1.6) {
      const up = matesHere().filter((q) => !q.dead);
      if (player.downed && up.length) { /* knocked down: wait for a partner to revive you */ }
      else if (!(window.Net && Net.isGuest() && mateHere())) {      // everyone is down (or solo): wake at the start of the area
        player.dead = false; player.downed = false; player.hp = player.maxHp; player.inv = 1.5;
        if (scene === "level") { const n = Level.cur.name; scene = "level"; fade.dir = 1; fade.to = n; fade.from = "dead"; if (window.Net && Net.isHost()) Net.send({ t: "scene", to: n, n: Net.count() }); }
        else { player.x = World.START.x; player.y = World.START.y; }
      }
    }
    updateInteraction();
    updateFade(dt);
    netTick(dt);
    if (scene === "island") {
      updateCritters(dt, time);
      leafT -= dt;
      if (leafT <= 0) { spawnLeaf(cam.x, cam.y, time); spawnStreak(cam.x, cam.y, time); leafT = 0.25 + Math.random() * 0.4; }
    } else if (scene === "cave") Cave.update(dt, time, player);
    updateParticles(dt, time);
    hintTimer -= dt * (hintTimer > 4 ? 0.5 : 1);
    // camera follows the hero exactly (sub-pixel); see render() for how it stays crisp
    const SW = scene === "level" ? Level.cur.W : scene === "cave" ? Cave.W : scene === "dojo" ? Dojo.W : scene === "forge" ? Forge.W : World.W, SH = scene === "level" ? Level.cur.H : scene === "cave" ? Cave.H : scene === "dojo" ? Dojo.H : scene === "forge" ? Forge.H : World.H;
    cam.fx = K.clamp(player.x - VW / 2, 0, Math.max(0, SW - VW - 1));
    cam.fy = K.clamp(player.y - 12 - VH / 2, 0, Math.max(0, SH - VH - 1));
    const shk = Combat.shake * Combat.shake * 5;
    if (shk > 0.05) { cam.fx += (K.noise(time * 37, 1) - 0.5) * 2 * shk; cam.fy += (K.noise(time * 37, 9) - 0.5) * 2 * shk; cam.fx = Math.max(0, cam.fx); cam.fy = Math.max(0, cam.fy); }
    cam.x = Math.floor(cam.fx); cam.y = Math.floor(cam.fy);
    K.updateWind(time, dt);
    if (scene === "level" && fade.dir === 0) Level.idle(3, player.x, player.y);   // paint the rest of the area's ground in spare time
    Ambience.update(time, player.x, player.y);
    render(time);
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------------------------ boot
  async function boot() {
    resize();
    sctx.fillStyle = "#000"; sctx.fillRect(0, 0, screen.width, screen.height);
    // the title screen (js/title.js) shows progress while the world is built; each step yields so it can update
    const step = (f, line) => { window.Title && Title.progress(f, line); return new Promise((r) => setTimeout(r, 16)); };
    await step(0.08, "Gathering the art");
    await loadAssets();
    await step(0.2, "Raising the island");
    const t0 = performance.now();
    World.build(A);
    await step(0.48, "Filling the sea");
    Water.init(A); worldReady = true; window.Title && Title.live && setTimeout(Title.live, 50);
    await step(0.56, "Planting the palms");
    Props.build(A);
    for (const b of World.bridges) makeBridge(b);
    await step(0.7, "Waking the sea cave");
    Cave.build(A);
    await step(0.82, "Hanging the weapons");
    Combat.init();
    Dojo.build(); Forge.build();
    await step(0.9, "Lighting the sun gate");
    Level.init(A); Enemies.init(A);
    Combat.ensureOpen();
    buildHero(); buildPartner();
    buildClouds();
    buildVignette();
    DEFAULT_WEAPONS = [...Combat.unlocked];
    console.log("world built in", Math.round(performance.now() - t0), "ms");
    player.x = World.START.x; player.y = World.START.y;
    addEventListener("resize", resize);
    requestAnimationFrame((n) => { last = n; frame(n); });
    if (window.Title) Title.ready(); else Game.begin(0, null);
  }
  // ------------------------------------------------------------------ saves (three slots, see js/title.js)
  let DEFAULT_WEAPONS = [], playT = 0, saveT = 0, slot = 0;
  const placeName = () => scene === "level" ? (Level.cur.name === "sanctum" ? "Sun Gate Sanctum" : Level.cur.def.title.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase())) : scene === "cave" ? "Ana ʻŌlino, the Sea Cave" : scene === "dojo" ? "Hale Koa" : "The Sunward Shore";
  const Game = (window.Game = {
    snapshot() {
      return { v: 1, t: Date.now(), play: playT, where: scene === "level" && !Level.cur.def.dojo ? Level.cur.name : "island", x: Math.round(scene === "island" ? player.x : World.START.x), y: Math.round(scene === "island" ? player.y : World.START.y),
        unlocked: [...Level.unlocked], cleared: Level.cleared.size, clearedList: [...Level.cleared], heel: !!Level.heelTaken, portal: !!Level.portalUnlocked, weapons: [...Combat.unlocked], loadout: [...Combat.loadout], cur: Combat.cur, gear: Gear.snapshot(), place: placeName() };
    },
    save() { if (!slot || !window.Title || fade.dir !== 0 || testWorld) return; Title.store.set(slot, Game.snapshot()); saveT = time; },
    begin(n, d, opts) {
      slot = n; playT = d ? d.play || 0 : 0; saveT = time;
      Level.unlocked = new Set(d ? d.unlocked : ["highlands"]); Level.cleared = new Set(d ? d.clearedList || [] : []);
      Level.heelTaken = d ? !!d.heel : false; Level.portalUnlocked = d ? !!d.portal : false; Level.dest = null;
      Combat.unlocked = new Set(d ? d.weapons : DEFAULT_WEAPONS); Combat.loadout = (d && d.loadout ? d.loadout : [...Combat.unlocked]).slice(0, Combat.LOADOUT_MAX); Combat.cur = d ? d.cur || 0 : 0; Combat.ensureOpen();
      testWorld = false; Gear.infinite = false; Gear.load(d && d.gear); applyGear(); metMakani = false;
      if (!d || !d.gear || !d.gear.beach) rollBeach(); else washShells();
      player.hp = player.maxHp; player.dead = false; player.downed = false;
      scene = "island"; player.x = d ? d.x : World.START.x; player.y = d ? d.y : World.START.y; player.dir = "down";
      if (blocked(player.x, player.y)) unstick();
      Ambience.setScene && Ambience.setScene("island");
      if (d && d.where !== "island" && Level.DEFS[d.where]) { fade.a = 1; fade.dir = 1; fade.to = d.where; fade.from = "load"; }
      else { fade.a = 1; fade.dir = -1; banner = { title: "KULEANA", sub: d ? "Welcome back" : "The Sunward Shore", t0: time + 0.6 }; hintTimer = 12; }
      if (opts && opts.test) { beginTestWorld(); return; }
      if (!d) setTimeout(() => Game.save(), 500);
    },
    quit() { Game.save(); testWorld = false; Gear.infinite = false; if (window.Net && Net.active()) Net.leave(); window.Title && Title.show(); },
  });
  // the armour you wear sets your hearts and the combat bonuses
  function applyGear() { const st = Gear.stats(); player.maxHp = 10 + st.hp; player.hp = Math.min(player.hp, player.maxHp); Gear.applyCombat(); }
  Gear.onChange = () => { applyGear(); };
  Level.onUnlock = ((prev) => (n) => { prev && prev(n); setTimeout(() => Game.save(), 50); })(Level.onUnlock);
  // a weapon won by clearing a zone: every hero gets it
  Level.onReward = (r) => { for (const id of [].concat(r)) { grant(id); if (window.Net && Net.isHost()) Net.send({ t: "sync", gift: id }); } setTimeout(() => Game.save(), 50); };
  window.__kuleana = { player, cam, keys, mates, rev, ui: () => ({ globe: globe.open, prep: loadoutUI.open, shop: shopUI.open, inv: invUI.open, dialog: !!dialog }), goTo: (s) => goTo(s), dojoCall: (h, k) => dojoCall(h, k), get scene() { return scene; } };
  boot().catch((e) => { console.error(e); document.body.insertAdjacentHTML("beforeend", `<pre style="color:#f88;position:fixed;top:0;left:0">${e.stack || e}</pre>`); });
})();
