// Kuleana: stage 1. Walk around the island outside the temple.
(function () {
  const T = K.TILE;
  const TOUCH = !!(window.TouchPad && TouchPad.enabled);
  const BASE_W = TOUCH ? 400 : 480, BASE_H = TOUCH ? 225 : 270;      // minimum internal resolution (game pixels); a little closer on phones
  const screen = document.getElementById("game");
  const sctx = screen.getContext("2d");
  const HARD_FILTER = typeof sctx.filter === "string" && !!document.getElementById("hardAlpha");
  let layerA, actx, layerB, bctx, hud, hctx, fxL, fctx, hardL, hardCtx, glowL, gctx, VW = BASE_W, VH = BASE_H, SCALE = 3;

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

  // co-op heroes: the same warrior, told apart by headband and kapa vest. Slot 0 (the host) wears the
  // island red, slot 1 sun-gold and red, slot 2 sea-teal and violet.
  const SLOT_COL = ["#e8644c", "#f2c040", "#5ad0c8"];
  const slotFrames = [null, {}, {}];
  const SLOT_PAL = [null, { r: [236, 170, 50], R: [176, 108, 34], v: [150, 40, 44], V: [100, 26, 34], l: [206, 90, 80] }, { r: [80, 206, 196], R: [40, 132, 132], v: [92, 62, 164], V: [58, 36, 112], l: [146, 116, 214] }];
  function buildPartner() {
    for (let s = 1; s < 3; s++) {
      const PP = Object.assign({}, C.PAL, SLOT_PAL[s]), F = slotFrames[s];
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
    }
    slotFrames[0] = heroFrames;
  }
  const framesFor = (slot) => slotFrames[slot] || heroFrames;

  // ------------------------------------------------------------------ input
  const keys = {};
  let pressedE = false;
  addEventListener("keydown", (e) => {
    if (e.target && e.target.tagName === "INPUT") return;          // typing a join code
    if (window.Menu && Menu.open) { if (!e.repeat) Menu.key(e); for (const k in keys) keys[k] = false; return; }
    if (globe.open) { if (!e.repeat) globeKey(e.code); for (const k in keys) keys[k] = false; e.preventDefault(); return; }
    if (e.code === "Escape" && !e.repeat) { window.Menu && Menu.toggle(true); for (const k in keys) keys[k] = false; return; }
    if (e.code === "KeyC" && !e.repeat) { window.Menu && Menu.toggle(true, "coop"); for (const k in keys) keys[k] = false; return; }
    keys[e.code] = true;
    window.Ambience && Ambience.start();
    if (e.code === "KeyM") Ambience.toggleMute();
    if (e.code === "KeyE" || e.code === "Enter") pressedE = true;
    if (e.code === "KeyJ" && !e.repeat && !dialog && fade.dir === 0 && !player.dead) Combat.attack();
    if ((e.code === "Space" || e.code === "KeyK") && !e.repeat && !dialog && fade.dir === 0 && !player.dead) startRoll();
    if (e.code === "KeyQ" && !e.repeat) Combat.cycle(-1);
    if (e.code === "KeyR" && !e.repeat) Combat.cycle(1);
    if (/^Digit[0-9]$/.test(e.code)) { const n = +e.code.slice(5); Combat.select(n === 0 ? 9 : n - 1); }
    if (e.code.startsWith("Arrow") || e.code === "Space" || e.code === "Tab") e.preventDefault();
  });
  addEventListener("keyup", (e) => (keys[e.code] = false));
  addEventListener("pointerdown", (e) => { window.Ambience && Ambience.start(); if (window.Menu && Menu.open) return; if (globe.open) { globeTap(e); return; } if (e.pointerType !== "mouse" || player.dead) return; if (e.button === 0 && !dialog && fade.dir === 0) Combat.attack(); if (e.button === 2 && !dialog && fade.dir === 0) startRoll(); });
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
    player.rolling = true; player.rollT = 0; player.rollCd = 0.55;
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
    player.hp -= dmg; player.inv = 0.9; player.hurtT = time;
    const a = Math.atan2(player.y - sy, player.x - sx); player.kx = Math.cos(a) * 160; player.ky = Math.sin(a) * 130;
    Combat.shake = Math.min(1, Combat.shake + 0.6); Combat.lastStop = -9; Combat.stopFor(0.06); Combat.flash = 0.3; Combat.flashCol = "255,80,80";
    Combat.loseMomentum(0.35);
    Ambience.sfx && Ambience.sfx("hurt");
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
        Object.assign(q, { tx: m.x, ty: m.y, dir: m.d, frame: m.f, moving: !!m.mv, rolling: !!m.ro, rollA: m.ra, rollT: m.rt, hp: m.hp, maxHp: m.mx, dead: !!m.dd, inv: m.iv, w: m.w, busy: !!m.b, attacking: !!m.b, tier: m.tr, sc: m.sc, lv: m.lv, seen: time, rv: m.rv ?? -1, rp: m.rp || 0 });
        if (jump) { q.x = m.x; q.y = m.y; }
        break;
      }
      case "atk": {
        if (id === mySlot()) break;
        if (Net.isHost()) Net.send(m, id);
        const q = mates.get(id); if (q && isHere(q)) Combat.ghost(q, m.w, m.m, m.a, Net.isHost());
        break;
      }
      case "snap": if (Net.isGuest() && scene === "level" && Level.cur && Level.cur.name === m.lv) { Enemies.applySnap(Level.cur, m.en); Level.applySnap(Level.cur, m.lvl, time); for (const k of m.sfx || []) Ambience.sfx && Ambience.sfx(k); } break;
      case "scene": if (Net.isGuest()) { netGo = true; fade.dir = 0; Level.players = m.n || Net.count(); goTo(m.to); netGo = false; } break;
      case "hurt": hurtPlayer(m.d, m.x, m.y, m.s); break;
      case "heal": player.hp = Math.min(player.maxHp, player.hp + m.n); break;
      case "tp": player.x = m.x; player.y = m.y; if (blocked(player.x, player.y)) unstick(); break;
      case "banner": banner = { title: m.title, sub: m.sub || "", t0: time }; break;
      case "revive":   // a partner held you up for long enough: back on your feet with half your hearts
        if (player.dead && player.downed) { player.dead = false; player.downed = false; player.hp = Math.ceil(player.maxHp / 2); player.inv = 2; banner = { title: "REVIVED", sub: (m.by || "A partner") + " got you back up", t0: time }; Ambience.sfx && Ambience.sfx("berry"); }
        break;
      case "sync": if (m.un) for (const n of m.un) Level.unlock(n); if (m.portal) { Level.portalUnlocked = true; if (Level.cur) Level.cur.portalOpen = true; } if (m.heel) { Level.heelTaken = true; Combat.unlocked.add("heel"); if (Level.cur) Level.cur.shrineTaken = true; } break;
      case "act":     // a guest asks the host to do something that changes the shared world
        if (!Net.isHost()) break;
        if (m.k === "go" && (!Level.DEFS[m.to] || m.to === "sanctum" || Level.unlocked.has(m.to) || scene === "level")) goTo(m.to);
        else if (m.k === "talk") { Level.portalUnlocked = true; if (Level.cur) Level.cur.portalOpen = true; Net.send({ t: "sync", portal: 1 }); Ambience.sfx && Ambience.sfx("portal"); }
        else if (m.k === "shrine") takeShrine(false);
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
      Net.send({ t: "p", id: mySlot(), sc: scene, lv: scene === "level" ? Level.cur.name : null, x: Math.round(player.x * 10) / 10, y: Math.round(player.y * 10) / 10, d: player.dir, f: player.frame, mv: player.moving ? 1 : 0, ro: player.rolling ? 1 : 0, ra: player.rollA || 0, rt: player.rollT || 0, hp: player.hp, mx: player.maxHp, dd: player.dead ? 1 : 0, iv: player.inv > 0 ? 1 : 0, w: Combat.cur, b: Combat.busy ? 1 : 0, tr: Combat.momTier(), rv: rev.target, rp: Math.round((rev.t / REVIVE_T) * 100) / 100 });
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
    heal: (n, q) => { if (q && q.isRemote) { Net.sendTo(q.slot, { t: "heal", n }); return; } player.hp = Math.min(player.maxHp, player.hp + n); healT = time; },
    teleport: (q, x, y) => { if (q.isRemote) Net.sendTo(q.slot, { t: "tp", x, y }); },
    // a partner is hit on the host's screen: tell them (their own roll may still save them)
    hurtRemote: (q, d, sx, sy, src) => { if (q.dead || q.hitInv > 0) return false; Net.sendTo(q.slot, { t: "hurt", d, x: sx, y: sy, s: src }); if (q.rolling || q.inv) return false; q.hitInv = 0.9; return true; },
  };
  let healT = -9;
  Level.onUnlock = () => { if (window.Net && Net.isHost()) Net.send({ t: "sync", un: [...Level.unlocked] }); };

  // ------------------------------------------------------------------ Kahu Lā's globe
  // A little world turning in the keeper's hands. Each zone is an island on it; its levels are pins.
  // Pick one and he sends the whole party there.
  const globe = { open: false, zone: 0, sel: 0, rot: 0, pins: [], tex: null, can: null };
  function openGlobe() {
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
    globe.open = false; Level.dest = name; Ambience.sfx && Ambience.sfx("portal"); goTo(name);
  }
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
  Combat.onKill = (d) => { if (scene === "level" && d.type !== "runner" && Math.random() < (d.boss ? 1 : 0.3)) Level.dropBerry(d.type === "vine" ? d.rx : d.x, d.type === "vine" ? d.ry : d.y, time); };
  window.__hurt = hurtPlayer;
  const FOOT = [-5, -4, 5, 1];

  function blocked(x, y, self) {
    const x0 = x + FOOT[0], y0 = y + FOOT[1], x1 = x + FOOT[2], y1 = y + FOOT[3];
    if (scene === "level") {
      for (const [px, py] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [x, y0], [x, y1]]) if (Level.solidAt(px, py)) return true;
      return false;
    }
    if (scene === "cave" || scene === "dojo") {
      const S = scene === "cave" ? Cave : Dojo;
      for (const [px, py] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [x, y0], [x, y1]]) if (S.solidAt(px, py)) return true;
      return false;
    }
    for (const [px, py] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1], [x, y0], [x, y1]]) if (World.solidAt(px, py)) return true;
    for (const b of Props.colliders) if (x1 > b[0] && x0 < b[2] && y1 > b[1] && y0 < b[3]) return true;
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
      const u = player.rollT / 0.34, sp = 260 * (1 - u * u);
      tryMove(Math.cos(player.rollA) * sp * dt, Math.sin(player.rollA) * sp * dt * 0.9);
      Combat.after.push({ x: player.x, y: player.y, dir: player.dir, t0: Combat.clock, ghost: true });
      if (player.rollT >= 0.34) { player.rolling = false; player.perfectUsed = false; }
      player.moving = true;
      return;
    }
    if (dialog || globe.open || fade.dir === 1 || Combat.busy) { player.moving = false; player.frame = Combat.busy ? 2 : 0; return; }
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
      const len = Math.hypot(ix, iy), sp = (run ? 140 : 90) * dt;
      const dx = (ix / len) * sp, dy = (iy / len) * sp;
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
      return v === 9 || v === 10 ? "wood" : v === 3 ? "grass" : v === 4 ? "sand" : v === 2 ? "dirt" : v >= 5 ? "tile" : v === 11 ? "water" : "dirt";
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
      if (c.kind === "crab") {
        c.timer -= dt;
        const near = Math.hypot(player.x - c.x, player.y - c.y) < 40;
        if (c.timer <= 0 || near) {
          c.timer = 1 + Math.random() * 3;
          c.vx = Math.random() < 0.4 && !near ? 0 : (Math.random() < 0.5 ? -1 : 1) * (near ? 46 : 18);
          if (near) c.vx = Math.sign(c.x - player.x || 1) * 46;
        }
        const nx = c.x + c.vx * dt;
        if (World.terrAt(nx, c.y) === World.SAND) c.x = nx; else c.vx = -c.vx;
        if (c.vx) c.frame += dt * 8;
      } else {
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
        Level.prev = fade.to;
        banner = { title: L.def.title, sub: L.def.sub, t0: time + 0.3 };
      } else if (fade.to === "dojo") {
        scene = "dojo"; player.x = Dojo.ENTRY.x; player.y = Dojo.ENTRY.y; player.dir = "up";
        banner = { title: "HALE KOA", sub: "The Warriors' Training Hut", t0: time + 0.3 };
      } else {
        scene = "island";
        const back = fade.from === "dojo" ? World.hutDoor : fade.from === "level" ? { x: World.templeDoor.x, y: World.templeDoor.y + 22 } : World.caveMouth;
        player.x = back.x; player.y = back.y + 14; player.dir = "down";
      }
      Combat.setTargets(scene === "dojo" ? Dojo.dummies : scene === "level" ? Level.cur.enemies : []);
      Combat.allUnlocked = scene === "dojo"; Combat.ensureOpen();
      parts.length = 0;
      Ambience.setScene && Ambience.setScene(scene === "level" ? Level.cur.def.amb || Level.cur.name : scene);
    } else if (fade.dir === -1 && fade.a <= 0) { fade.a = 0; fade.dir = 0; }
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
      rackHover = Dojo.rackIndexAt(player.x, player.y);
      if (rackHover >= 0) prompt = { x: Dojo.rackPos.x + Dojo.rackSlots[rackHover], y: Dojo.rackPos.y + 50 };
      if (pressedE && rackHover >= 0) Combat.select(rackHover);
      pressedE = false;
      return;
    }
    const HD = World.hutDoor;
    if (Math.abs(player.x - HD.x) < 9 && player.y - HD.y < -2 && player.y - HD.y > -16) { goTo("dojo"); pressedE = false; return; }
    const nearHut = Math.hypot(player.x - HD.x, player.y - HD.y) < 30;
    const M = World.caveMouth;
    const mdx = player.x - M.x, mdy = player.y - M.y;
    if (Math.abs(mdx) < 13 && mdy < -6 && mdy > -30) { goTo("cave"); pressedE = false; return; }
    const nearCave = Math.hypot(mdx, mdy) < 34;
    let best = null, bd = 34;
    for (const n of World.npcs) {
      const d = Math.hypot(n.x - player.x, n.y - player.y);
      if (d < bd) { bd = d; best = n; }
    }
    const door = World.templeDoor;
    const nearDoor = Math.hypot(door.x - player.x, door.y - 10 - player.y) < 40;
    if (best) prompt = { x: best.x, y: best.y - 36 };
    else if (nearDoor) prompt = { x: door.x, y: door.y - 52 };
    else if (nearCave) prompt = { x: M.x, y: M.y - 50 };
    else if (nearHut) prompt = { x: HD.x, y: HD.y - 40 };
    if (pressedE) {
      if (dialog) advanceDialog();
      else if (best) dialog = { name: best.name, lines: best.lines, i: 0, start: performance.now() };
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
    for (const ex of L.def.exits || []) if (player.x > ex.x0 * T && player.x < ex.x1 * T && player.y > ex.y0 * T) { goTo(ex.to); return; }
    let near = null, bd = 42;
    for (const n of L.npcs) { const d = Math.hypot(n.x - player.x, n.y - player.y); if (d < bd) { bd = d; near = n; } }
    if (near) { prompt = { x: near.x, y: near.y - 36 }; if (pressedE) {
      if (Level.portalUnlocked) { dialog = { name: near.name, lines: ["Look into the globe, and tell me where the sun should take you."], i: 0, start: performance.now(), onEnd: openGlobe }; }
      else dialog = { name: near.name, lines: near.lines, i: 0, start: performance.now(), onEnd: () => { Level.portalUnlocked = true; L.portalOpen = true; Ambience.sfx && Ambience.sfx("portal"); if (window.Net && Net.isGuest()) Net.send({ t: "act", k: "talk" }); else if (window.Net && Net.isHost()) Net.send({ t: "sync", portal: 1 }); openGlobe(); } };
    } return; }
    const pt = L.def.portal;
    if (pt) { const px = pt.x * T, py = pt.y * T; if (Math.abs(player.x - px) < 18 && player.y < py + 12 && player.y > py - 30) { if (L.portalOpen) { Ambience.sfx && Ambience.sfx("portal"); goTo(Level.dest || pt.to); return; } else { prompt = { x: px, y: py - 70 }; if (pressedE) dialog = { name: "Sun Gate", lines: ["The great sun disc is cold and still.", "Perhaps its keeper can wake it."], i: 0, start: performance.now() }; } } }
    for (const gte of L.def.gates || []) { const gx = gte.x * T, gy = gte.y * T; if (Math.hypot(player.x - gx, player.y - gy) < 26) { prompt = { x: gx, y: gy - 60 }; if (pressedE) { Ambience.sfx && Ambience.sfx("portal"); goTo(gte.to); } } }
    const sh = L.def.shrine;
    if (sh && !L.shrineTaken) { const sx = sh.x * T, sy = sh.y * T; if (Math.hypot(player.x - sx, player.y - sy) < 30) { prompt = { x: sx, y: sy - 52 }; if (pressedE) {
      if (window.Net && Net.isGuest()) Net.send({ t: "act", k: "shrine" });
      takeShrine(true);
    } } }
  }
  // Pele's shrine gives the Ember Heel; in co-op both heroes take it up
  function takeShrine(here) {
    const L = Level.cur, sh = L.def.shrine; if (!sh) return;
    L.shrineTaken = Level.heelTaken = true; Combat.unlocked.add(sh.unlock); Ambience.sfx && Ambience.sfx("pickup");
    if (window.Net && Net.isHost()) Net.send({ t: "sync", heel: 1 });
    const w = Combat.weapons.find((q) => q.id === sh.unlock);
    if (here || !(window.Net && Net.active())) dialog = { name: "Pele's Shrine", lines: [`You take up the ${w.name}.`, "Its heat settles into your stride. (Press Q / R to switch weapons.)"], i: 0, start: performance.now() };
    else banner = { title: "EMBER HEEL", sub: "Your partner woke Pele's shrine", t0: time };
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
      const y = 24 + row * 8, col = SLOT_COL[q.slot] || "#f2c040"; row++;
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
  function drawHearts(ctx) {
    drawMateHUD(ctx);
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
    drawHero(t, heroSil);
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
  function drawHero(t, frames) {
    const hx = Math.round((player.x - cam.fx) * SCALE), hy = Math.round((player.y - cam.fy) * SCALE);
    const col = Combat.weapons[Combat.cur].col;
    for (const a of Combat.after) {
      if (!a.ghost) continue;
      const age = Combat.clock - a.t0;
      sctx.globalAlpha = Math.max(0, 0.5 * (1 - age / 0.3));
      sctx.drawImage(tinted(heroFrames[a.dir][2][0], col), Math.round((a.x - cam.fx) * SCALE) - 12 * SCALE, Math.round((a.y - cam.fy) * SCALE) - 30 * SCALE, 24 * SCALE, 32 * SCALE);
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
    } else sctx.drawImage(img, hx - 12 * SCALE, hy - 30 * SCALE, 24 * SCALE, 32 * SCALE);
    sctx.globalAlpha = 1;
    // momentum aura: embers in the weapon's colour rise off the hero at tier II+
    if (Combat.momTier() >= 2 && Math.random() < 0.35) Combat.addPart({ x: player.x + (Math.random() - 0.5) * 12, y: player.y - Math.random() * 24, vx: 0, vy: -30, g: -10, life: 0.6, col: Combat.weapons[Combat.cur].col, size: 1, kind: "ember", glow: true });
  }
  function drawMate(ox, oy, t) { for (const q of matesHere()) drawOneMate(q, ox, oy, t); }
  function drawOneMate(q, ox, oy, t) {
    const ctx = q.y < player.y ? actx : bctx, x = Math.round(q.x - ox), y = Math.round(q.y - oy), F = framesFor(q.slot);
    const sh = Props.shadow(7, 2); ctx.globalAlpha = 0.32; ctx.drawImage(sh, x - 7, y - 2); ctx.globalAlpha = 1;
    q.tailT += (1 / 60) * (2 + 7 * K.windStrength(t) + (q.moving ? 4 : 0));
    const fr = F[q.dir] || F.down, img = fr[(q.frame || 0) % 4][Math.floor(q.tailT) % 2];
    if (q.dead) { ctx.save(); ctx.globalAlpha = 0.75; ctx.translate(x, y - 4); ctx.rotate(Math.PI / 2); ctx.drawImage(img, -16, -12); ctx.restore(); ctx.globalAlpha = 1; }
    else if (q.rolling) { const spin = ((q.rollT || 0) / 0.34) * Math.PI * 2 * (Math.cos(q.rollA || 0) >= 0 ? 1 : -1); ctx.save(); ctx.translate(x, y - 12); ctx.rotate(spin); ctx.scale(1, 0.8); ctx.drawImage(img, -12, -18); ctx.restore(); }
    else { if (q.inv && Math.floor(t * 14) % 2) ctx.globalAlpha = 0.45; ctx.drawImage(img, x - 12, y - 30); ctx.globalAlpha = 1; }
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
    if (!player.dead && !Combat.behindHero(player)) Combat.drawWeapon(fctx, ox, oy, player, sil);
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
  // weapon panel (bottom centre) + combo counter
  function drawCombatHUD(ctx) {
    if (dialog) return;
    const w = Combat.weapons[Combat.cur], x = Math.round(VW / 2 - 70), y = VH - 36;
    ctx.fillStyle = "#1a1220"; ctx.fillRect(x - 2, y - 2, 144, 32);
    ctx.fillStyle = "#c08a3e"; ctx.fillRect(x - 1, y - 1, 142, 30);
    ctx.fillStyle = "#231a26"; ctx.fillRect(x, y, 140, 28);
    ctx.fillStyle = w.col; ctx.fillRect(x, y, 2, 28);
    ctx.drawImage(w.icon, x + 2, y);
    // pips: one per weapon in the arsenal
    for (let i = 0; i < Combat.weapons.length; i++) { ctx.fillStyle = i === Combat.cur ? w.col : "#4a3e48"; ctx.fillRect(x + 34 + i * 6, y + 23, 4, 2); }
    // surge diamonds for weapons with an ultimate: fill by landing full combos
    if (w.ult) for (let k = 0; k < Combat.SURGE; k++) {
      const full = k < (w.charge || 0), ready = (w.charge || 0) >= Combat.SURGE, dx = x + 120 + k * 7, dy = y + 4;
      const blink = ready && Math.floor(Combat.clock * 6) % 2;
      ctx.fillStyle = "#120c16"; ctx.fillRect(dx - 1, dy + 1, 7, 3); ctx.fillRect(dx + 1, dy - 1, 3, 7);
      ctx.fillStyle = full ? (blink ? "#ffffff" : w.col) : "#3a3040"; ctx.fillRect(dx, dy + 2, 5, 1); ctx.fillRect(dx + 2, dy, 1, 5); ctx.fillRect(dx + 1, dy + 1, 3, 3);
    }
  }
  function drawCombatTexts(u) {
    if (dialog) return;
    const w = Combat.weapons[Combat.cur], x = VW / 2 - 70 + 34, y = VH - 33;
    sctx.textBaseline = "top"; sctx.textAlign = "left";
    sctx.font = `${8 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = "#fff6dc"; sctx.fillText(w.name, x * u, y * u);
    sctx.font = `${6 * u}px 'Pixelify Sans', monospace`; sctx.fillStyle = w.col; sctx.fillText(w.cls, x * u, (y + 10) * u);
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

  function renderDojo(t) {
    const ox = Math.floor(cam.fx), oy = Math.floor(cam.fy);
    const sx = Math.round((cam.fx - ox) * SCALE), sy = Math.round((cam.fy - oy) * SCALE);
    const LW = VW + 1, LH = VH + 1;
    bctx.clearRect(0, 0, LW, LH);
    Dojo.render(actx, bctx, gctx, ox, oy, LW, LH, t, player.y);
    drawPrompt(bctx, ox, oy, t);
    hctx.clearRect(0, 0, VW, VH);
    drawHearts(hctx);
    drawCombatHUD(hctx);
    sctx.imageSmoothingEnabled = false;
    drawMate(ox, oy, t);
    if (!player.dead && Combat.behindHero(player)) Combat.drawWeapon(actx, ox, oy, player, scene === "cave");
    sctx.drawImage(layerA, -sx, -sy, LW * SCALE, LH * SCALE);
    drawHero(t, framesFor(mySlot()));
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
    drawHero(t, framesFor(mySlot()));
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
  function render(t) {
    gctx.clearRect(0, 0, VW + 1, VH + 1);
    if (scene === "cave") renderCave(t);
    else if (scene === "dojo") renderDojo(t);
    else if (scene === "level") renderLevel(t);
    else renderIsland(t);
    if (globe.open) drawGlobe(t);
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
    for (const o of Props.objects) {
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
        if (c.kind === "crab") ctx.drawImage(Props.crabFrames[Math.floor(c.frame) % 2], Math.round(c.x - 4 - ox), Math.round(c.y - 5 - oy));
        else ctx.drawImage(Props.butterflyFrames[c.col][Math.floor(t * 9 + c.sp) % 2], Math.round(c.x - 2 - ox), Math.round(c.y - c.z - oy - Math.abs(Math.sin(t * 3 + c.sp)) * 3));
      } else if (o.kind === "npc") drawNPC(ctx, o, ox, oy, t);
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
    drawHero(t, framesFor(mySlot()));
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
      const msg = TOUCH ? "Left thumb: move (push far to run)   ATK attack   ROLL dodge   USE talk / revive   WPN weapon" : "WASD move  Shift run  J/Click attack  Space dodge  Q/R weapon  E talk/revive  Esc settings  C co-op";
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
    time += dt;
    if (flowT > 0) flowT -= dt;
    // the settings menu pauses solo play (a co-op world keeps going)
    if (window.Menu && Menu.open && !(window.Net && Net.active())) { netTick(dt); render(time); requestAnimationFrame(frame); return; }
    const gdt = flowT > 0 ? dt * 0.35 : dt;           // perfect-dodge slow motion
    if (Combat.hitstop > 0) Combat.hitstop -= dt;     // impact frame: the world holds still for a beat
    else {
      updatePlayer(gdt); Combat.update(gdt, player, tryMove);
      if (scene === "level" && fade.dir !== 1) {
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
    const SW = scene === "level" ? Level.cur.W : scene === "cave" ? Cave.W : scene === "dojo" ? Dojo.W : World.W, SH = scene === "level" ? Level.cur.H : scene === "cave" ? Cave.H : scene === "dojo" ? Dojo.H : World.H;
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
    sctx.fillStyle = "#0c0a12"; sctx.fillRect(0, 0, screen.width, screen.height);
    sctx.fillStyle = "#ffe08a"; sctx.textAlign = "center";
    sctx.font = `${10 * SCALE}px 'Pixelify Sans', monospace`;
    sctx.fillText("Weaving the island…", screen.width / 2, screen.height / 2);
    sctx.textAlign = "left";
    await loadAssets();
    await new Promise((r) => setTimeout(r, 30));
    const t0 = performance.now();
    World.build(A);
    Water.init(A);
    Props.build(A);
    for (const b of World.bridges) makeBridge(b);
    Cave.build(A);
    Combat.init();
    Dojo.build();
    Level.init(A); Enemies.init(A);
    Combat.ensureOpen();
    buildHero(); buildPartner();
    buildClouds();
    buildVignette();
    console.log("world built in", Math.round(performance.now() - t0), "ms");
    player.x = World.START.x; player.y = World.START.y;
    addEventListener("resize", resize);
    requestAnimationFrame((n) => { last = n; frame(n); });
  }
  window.__kuleana = { player, cam, keys, mates, rev, goTo: (s) => goTo(s), get scene() { return scene; } };
  boot().catch((e) => { console.error(e); document.body.insertAdjacentHTML("beforeend", `<pre style="color:#f88;position:fixed;top:0;left:0">${e.stack || e}</pre>`); });
})();
