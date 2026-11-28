// Melee combat: every weapon in the game, combo strings, and the anime-style slash effects.
// Effects are drawn with vector paths into an art-resolution layer that is then snapped to hard
// pixels (so they match the pixel art), plus a soft additive "glow" layer for light.
(function () {
  const TAU = Math.PI * 2;
  const easeOut = (x) => 1 - Math.pow(1 - K.clamp(x, 0, 1), 3);
  const easeIn = (x) => Math.pow(K.clamp(x, 0, 1), 2);

  // ---------------------------------------------------------------- palettes  [outline, dark, mid, light, core]
  const P = {
    steel: ["#141c2a", "#2e5f80", "#86cbe6", "#d6f6ff", "#ffffff"],
    gold: ["#2a1608", "#8a5a1c", "#dca444", "#ffe592", "#fffbea"],
    ivory: ["#0c2a30", "#2b7880", "#d6cfb6", "#f4eedc", "#ffffff"],
    crimson: ["#1e0610", "#8c1022", "#e43444", "#ffb4b0", "#ffffff"],
    magma: ["#160604", "#6c1608", "#e2521a", "#ffb432", "#fff2a6"],
    life: ["#0c1a08", "#2e5a1c", "#5aa83a", "#a8e070", "#f0ffd0"],
    plasma: ["#1c1838", "#6a6ad8", "#c8d4ff", "#ffffff", "#ffffff"],
    fire: ["#2a0408", "#a01a10", "#ec561c", "#ffb63c", "#fff4b8"],
    storm: ["#12122a", "#3a4a8c", "#9cbaff", "#fff4a4", "#ffffff"],
    water: ["#06183a", "#1450a8", "#36a0ea", "#a8e8ff", "#ffffff"],
    glow: ["#0a0a2c", "#3c2a9c", "#22cce2", "#baffef", "#ffffff"],
    star: ["#120a2a", "#4c2c8c", "#aa92f2", "#ffe8a2", "#ffffff"],
    stone: ["#18131a", "#4a3e3a", "#8a7a68", "#c8b890", "#f0e6c8"],
    koa: ["#1a0c06", "#6a3a1a", "#b8783a", "#e8b878", "#fff0d0"],
    kakau: ["#0c0808", "#3a1610", "#c4422a", "#f2b45e", "#fff2cc"],
  };

  // ---------------------------------------------------------------- power, by when you get a weapon
  // Measured single-target damage per second (tools: the DPS sim against a dummy, no crits or momentum)
  // was brought into line with the journey: the two first weapons set the scale (~48 DPS), and each later
  // weapon is set for the zone where it's earned, rising about as fast as the creatures' health
  // (Level defs' hpMul). Weapons whose strength is reach or crowds (the chain sickle, Stormcaller) are set
  // a little under the line, since one dummy at arm's length undersells them.
  //   start ʻIhe, Pāhoa 48 | Z1 Newa 54; Kākau, Ahi Staff 64; Ola Maul, Ember Heel 67 | Z2 Leiomano 64;
  //   Tidecutter, Stormcaller 74 | Z3 Koa Blade 77; Glowtide 86 | Z4 Makau Kaula 90; Mako Fangs 99 |
  //   Z5 Pololū 102; Starfall 115 | Z6 Koʻi 115; Pele's Grip 128 | the end: Koʻi-Lua 168
  const POW = { spear: 1.07, pahoa: 0.94, newa: 1.04, kakau: 1.73, firestaff: 1.36, maul: 1.18, heel: 1.34, leiomano: 1.05, tide: 1.68, storm: 2.0, koa: 1.54, glowtide: 2.32, chain: 2.2, fangs: 2.2, pololu: 2.08, starfall: 3.1, koi: 2.3, stone: 3.46, lua: 1.4 };   // lua: Koʻi-Lua cut by 30% (was 2.0)
  // every element's colour, for plasma's prismatic fringes (plasma is all of them at once)
  const PRISM = ["#f2b45e", "#ff8a3a", "#7ad860", "#5ab8ff", "#a8c4ff", "#5af2e8", "#ff5a6a", "#c8b4ff", "#d8c49a"];
  const LEAF = ["#3e8a2a", "#5aa83a", "#8ad050", "#c8f080", "#2a6a1e"];

  // ---------------------------------------------------------------- state
  const C = (window.Combat = {
    cur: 0, clock: 0, hitstop: 0, shake: 0, flash: 0, flashCol: "255,255,255",
    fx: [], parts: [], events: [], targets: [], nums: [], after: [],
    move: null, moveIdx: 0, moveT: 0, queued: 0, comboGap: 0, combo: 0, comboT: 0, busy: false,
    pose: null,
  });

  // ---------------------------------------------------------------- weapon sprites (pointing right, grip at gx, gy)
  function px(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(x, y, w || 1, h || 1); }
  function mkSprite(id) {
    const [c, x] = K.canvas(30, 14);
    const gy = 7;
    switch (id) {
      case "koa": // katana-like koa blade
        px(x, "#1a1018", 1, gy - 1, 7, 3); for (let i = 1; i < 7; i += 2) px(x, "#c8a060", i, gy - 1, 1, 3); px(x, "#7a4a2a", 2, gy, 4, 1);
        px(x, "#2a1a10", 8, gy - 3, 2, 7); px(x, "#e8c060", 8, gy - 2, 1, 5);
        px(x, "#1c2a38", 10, gy - 1, 17, 3); px(x, "#9fd8ee", 10, gy - 1, 16, 1); px(x, "#e8faff", 10, gy, 16, 1); px(x, "#5a90aa", 10, gy + 1, 15, 1);
        px(x, "#ffffff", 26, gy - 1, 2, 1); px(x, "#9fd8ee", 27, gy, 1, 1);
        return { c, gx: 3, gy };
      case "spear":
        px(x, "#2a1608", 0, gy - 1, 22, 3); px(x, "#a87038", 0, gy - 1, 22, 1); px(x, "#7a4a24", 0, gy, 22, 1);
        px(x, "#c82a2a", 18, gy + 1, 2, 3); px(x, "#ff5a4a", 19, gy + 2, 1, 2);
        px(x, "#141418", 22, gy - 2, 6, 5); px(x, "#141418", 28, gy - 1, 2, 3); px(x, "#5a5a6a", 23, gy - 1, 5, 1); px(x, "#cfd8e8", 23, gy, 6, 1);
        return { c, gx: 6, gy };
      case "leiomano":
        px(x, "#2a1608", 1, gy - 1, 8, 3); px(x, "#8a5a30", 1, gy, 8, 1);
        for (let i = 0; i < 16; i++) { const h = Math.round(3.2 * Math.sin((i / 15) * Math.PI) + 1); px(x, "#2a1608", 9 + i, gy - h - 1, 1, h * 2 + 3); px(x, "#b8783a", 9 + i, gy - h, 1, h * 2 + 1); px(x, "#d8a060", 9 + i, gy - h, 1, 1); }
        for (let i = 1; i < 15; i += 2) { const h = Math.round(3.2 * Math.sin((i / 15) * Math.PI) + 1); px(x, "#f6f0dc", 9 + i, gy - h - 2, 1, 1); px(x, "#f6f0dc", 9 + i, gy + h + 2, 1, 1); }
        return { c, gx: 4, gy };
      case "fangs":
        px(x, "#1a0a0a", 1, gy - 1, 5, 3); px(x, "#a01a24", 1, gy, 5, 1); px(x, "#2a1a10", 6, gy - 2, 1, 5);
        px(x, "#202430", 7, gy - 1, 9, 2); px(x, "#e8f0ff", 7, gy - 1, 8, 1); px(x, "#ffffff", 15, gy - 2, 2, 1); px(x, "#e8f0ff", 16, gy - 3, 1, 1);
        return { c, gx: 3, gy };
      case "maul": // Ola Maul: a koa mallet head bound in living vine, moss on its crown, a seed of green light
        px(x, "#2a1608", 0, gy - 1, 17, 3); px(x, "#8a5a30", 0, gy, 17, 1);
        px(x, "#1a0e06", 16, gy - 6, 11, 13); px(x, "#5a3a1e", 17, gy - 5, 9, 11); px(x, "#8a6234", 17, gy - 5, 9, 2); px(x, "#3a2412", 17, gy + 4, 9, 1);
        for (let i = 0; i < 9; i++) px(x, i % 3 ? "#3e8a2a" : "#8ad050", 17 + i, gy - 3 + ((i * 5) % 7), 1, 1);
        px(x, "#5aa83a", 16, gy - 7, 4, 2); px(x, "#8ad050", 22, gy - 7, 3, 1); px(x, "#c8f080", 21, gy - 1, 2, 2); px(x, "#f0ffd0", 21, gy - 1, 1, 1);
        for (let i = 0; i < 4; i++) px(x, "#3e8a2a", 12 + i, gy - 2 + (i % 2) * 4, 1, 1);
        return { c, gx: 4, gy };
      case "lua": { // Koʻi-Lua: a long koa haft, sennit wraps, and two crescent heads of moonstone that hold plasma
        const [c2, x2] = K.canvas(32, 20), g2 = 10;
        px(x2, "#120a10", 0, g2 - 1, 27, 3); px(x2, "#6a3a1e", 0, g2 - 1, 27, 1); px(x2, "#3a2010", 0, g2, 27, 1);
        for (let i = 0; i < 4; i++) { px(x2, "#f2ecda", 4 + i * 2, g2 - 1, 1, 3); px(x2, "#f2ecda", 16 + i * 2, g2 - 1, 1, 3); }
        for (const sg of [-1, 1]) for (let k = 0; k < 9; k++) { const w = Math.round(3 + Math.sin((k / 8) * Math.PI) * 4), yy = g2 + sg * (2 + k); px(x2, "#1c1838", 22 - w / 2 + (k > 6 ? 2 : 0), yy, w + 2, 1); px(x2, k % 3 ? "#c8d4ff" : "#ffffff", 23 - w / 2 + (k > 6 ? 2 : 0), yy, w, 1); if (k > 2) px(x2, "#6a6ad8", 22 + w / 2 + (k > 6 ? 2 : 0), yy, 1, 1); }
        px(x2, "#1c1838", 26, g2 - 2, 5, 5); px(x2, "#ffffff", 27, g2 - 1, 3, 3); px(x2, "#ff8a3a", 27, g2 - 1, 1, 1); px(x2, "#5ab8ff", 29, g2 + 1, 1, 1); px(x2, "#7ad860", 29, g2 - 1, 1, 1); px(x2, "#c8b4ff", 27, g2 + 1, 1, 1);
        return { c: c2, gx: 5, gy: g2 };
      }
      case "firestaff":
        px(x, "#1a0c06", 0, gy - 1, 26, 3); px(x, "#8a5228", 0, gy, 26, 1); px(x, "#c88a48", 2, gy - 1, 22, 1);
        for (let i = 4; i < 24; i += 6) px(x, "#3a1a0c", i, gy - 1, 1, 3);
        for (const ex of [0, 25]) { px(x, "#ec561c", ex - 1, gy - 3, 3, 4); px(x, "#ffb63c", ex, gy - 4, 1, 4); px(x, "#fff4b8", ex, gy - 2, 1, 1); }
        return { c, gx: 13, gy };
      case "heel":
        px(x, "#2a0408", 10, gy - 2, 8, 5); px(x, "#ec561c", 11, gy - 1, 6, 3); px(x, "#ffb63c", 12, gy - 1, 4, 2); px(x, "#fff4b8", 13, gy - 1, 2, 1);
        return { c, gx: 14, gy, none: true };
      case "storm":
        px(x, "#14101a", 0, gy - 1, 21, 3); px(x, "#4a3a5a", 0, gy, 21, 1);
        px(x, "#2a2a40", 21, gy - 3, 2, 7); px(x, "#9aa8c8", 23, gy - 3, 4, 1); px(x, "#9aa8c8", 23, gy + 3, 4, 1);
        px(x, "#2a4a9a", 23, gy - 1, 4, 3); px(x, "#9cc8ff", 24, gy - 1, 2, 2); px(x, "#ffffff", 24, gy - 1, 1, 1); px(x, "#fff4a4", 28, gy - 2, 1, 1); px(x, "#fff4a4", 27, gy + 2, 1, 1);
        return { c, gx: 6, gy };
      case "tide": case "glowtide": {
        const g = id === "glowtide";
        px(x, "#0c1430", 1, gy - 1, 7, 3); px(x, g ? "#6a3ac8" : "#2a6ac8", 2, gy, 5, 1);
        px(x, "#1a1a28", 8, gy - 3, 2, 7); px(x, g ? "#22cce2" : "#e8c060", 8, gy - 2, 1, 5);
        px(x, "#0a1a3a", 10, gy - 1, 17, 3); px(x, g ? "#22cce2" : "#8cd6ff", 10, gy - 1, 16, 1); px(x, g ? "#baffef" : "#eafaff", 10, gy, 16, 1); px(x, g ? "#3c2a9c" : "#1a60b8", 10, gy + 1, 15, 1);
        for (let i = 11; i < 26; i += 4) px(x, g ? "#ffffff" : "#ffffff", i, gy + 1, 1, 1);
        px(x, "#ffffff", 26, gy - 1, 2, 1);
        return { c, gx: 3, gy };
      }
      case "starfall":
        px(x, "#120a2a", 0, gy - 1, 16, 3); px(x, "#6a4aa8", 0, gy, 16, 1);
        for (let i = 0; i < 10; i++) { const a = -1.2 + (i / 9) * 2.4, r = 6; const cx = 16 + Math.cos(a) * r * 0.6, cy = gy + Math.sin(a) * r; px(x, "#120a2a", cx, cy - 1, 3, 3); px(x, "#ffe8a2", cx + 1, cy, 1, 1); px(x, "#fff8d8", cx, cy, 1, 1); }
        px(x, "#aa92f2", 15, gy - 1, 3, 3); px(x, "#ffffff", 16, gy, 1, 1);
        return { c, gx: 4, gy };
      case "pahoa": // hardwood / shark-tooth edged dagger
        px(x, "#1a0c06", 2, gy - 1, 6, 3); px(x, "#6a3a1a", 3, gy, 4, 1); px(x, "#2a1608", 8, gy - 2, 1, 5);
        px(x, "#1a0c06", 9, gy - 2, 9, 4); px(x, "#a86a30", 9, gy - 1, 8, 2); px(x, "#e0a868", 9, gy - 1, 7, 1); px(x, "#1a0c06", 18, gy - 1, 2, 2); px(x, "#a86a30", 18, gy, 1, 1);
        for (let i = 10; i < 17; i += 2) px(x, "#f6f0dc", i, gy + 2, 1, 1);
        return { c, gx: 4, gy };
      case "newa": // short knobbed war club
        px(x, "#1a0c06", 1, gy - 1, 10, 3); px(x, "#8a5228", 1, gy, 10, 1); px(x, "#c8c0a8", 2, gy - 1, 1, 3); px(x, "#c8c0a8", 4, gy - 1, 1, 3);
        px(x, "#1a0c06", 11, gy - 4, 9, 9); px(x, "#7a4420", 12, gy - 3, 7, 7); px(x, "#b8783a", 12, gy - 3, 5, 2); px(x, "#e0a868", 13, gy - 3, 2, 1); px(x, "#4a2410", 16, gy + 1, 3, 2);
        return { c, gx: 4, gy };
      case "pololu": // long hardwood spear
        px(x, "#1a0c06", 0, gy - 1, 24, 2); px(x, "#a06a34", 0, gy - 1, 24, 1);
        px(x, "#1a0c06", 24, gy - 2, 5, 4); px(x, "#c88a48", 24, gy - 1, 4, 2); px(x, "#f0c088", 24, gy - 1, 3, 1); px(x, "#1a0c06", 29, gy - 1, 1, 2);
        for (let i = 3; i < 20; i += 5) px(x, "#3a1a0c", i, gy - 1, 1, 2);
        return { c, gx: 8, gy };
      case "kakau": // tattooed hand-wrap: a glowing niho band
        px(x, "#0c0808", 9, gy - 3, 10, 7); px(x, "#c08a5e", 10, gy - 2, 8, 5);
        for (let i = 10; i < 18; i += 2) { px(x, "#0c0808", i, gy - 2, 1, 2); px(x, "#f2b45e", i + 1, gy + 1, 1, 1); }
        px(x, "#c4422a", 10, gy, 8, 1);
        return { c, gx: 14, gy, none: true };
      case "chain": // sickle blade on a coil of chain (icon); in hand the chain is drawn live
        for (let i = 0; i < 12; i += 2) { px(x, "#2a2e38", i, gy - 1 + (i % 4 ? 0 : 1), 2, 2); px(x, "#aab4c4", i, gy - 1 + (i % 4 ? 0 : 1), 1, 1); }
        px(x, "#1a0c06", 12, gy - 1, 4, 3); px(x, "#8a5228", 13, gy, 2, 1);
        for (let i = 0; i < 11; i++) { const yy = gy - 1 - Math.round(4 * Math.sin((i / 10) * Math.PI)); px(x, "#141c2a", 16 + i, yy - 1, 1, 3); px(x, "#d6f6ff", 16 + i, yy, 1, 1); px(x, "#86cbe6", 16 + i, yy + 1, 1, 1); }
        return { c, gx: 3, gy, none: true };
      case "koi": // koa handle, sennit lashing, a polished basalt adze blade
        px(x, "#1a0c06", 0, gy - 1, 22, 3); px(x, "#a06a34", 0, gy - 1, 22, 1); px(x, "#7a4a24", 0, gy, 22, 1);
        px(x, "#18131a", 17, gy - 7, 7, 11); px(x, "#4a4248", 18, gy - 6, 5, 9); px(x, "#7a7076", 18, gy - 6, 2, 9); px(x, "#a8a0a4", 18, gy - 6, 1, 4);
        px(x, "#18131a", 23, gy - 6, 4, 9); px(x, "#5a5258", 23, gy - 5, 3, 7); px(x, "#d8d0d4", 26, gy - 5, 1, 7);
        for (let i = 0; i < 4; i++) px(x, i % 2 ? "#c8a870" : "#8a6a3a", 16 + i, gy - 2, 1, 5);
        return { c, gx: 4, gy };
      case "stone":
        px(x, "#18131a", 9, gy - 5, 12, 11); px(x, "#6a5e56", 10, gy - 4, 10, 9); px(x, "#9a8a76", 10, gy - 4, 10, 2);
        for (let i = 0; i < 4; i++) { px(x, "#18131a", 20, gy - 4 + i * 2, 3, 2); px(x, "#8a7a68", 20, gy - 4 + i * 2, 2, 1); }
        px(x, "#ff8a2a", 13, gy, 4, 1); px(x, "#ffcc4a", 14, gy + 1, 2, 1); px(x, "#ff8a2a", 12, gy - 2, 1, 2);
        return { c, gx: 13, gy, gauntlet: true };
    }
  }

  // ---------------------------------------------------------------- the arsenal
  // cls = class shown in the HUD; every move: { dur, lunge, start(s) } where s = swing context
  const WEAPONS = [
    { id: "koa", name: "Koa Blade", cls: "Blade", col: "#9fe2ff", unlock: "Zone 3, first land", moves: [
      { dur: 0.3, lunge: 7, start: (s) => { arc(s, { span: 2.7, r: 24, W: 8, pal: P.steel, dir: 1, dur: 0.3 }); hitArc(s, 0.07, { range: 42, span: 2.9, dmg: 9 }); sfx("swing"); } },
      { dur: 0.3, lunge: 7, start: (s) => { arc(s, { span: 2.7, r: 24, W: 8, pal: P.steel, dir: -1, dur: 0.3 }); hitArc(s, 0.07, { range: 42, span: 2.9, dmg: 10 }); sfx("swing"); } },
      { dur: 0.6, lunge: 46, dash: true, start: (s) => { iai(s, 84, P.steel); hitLine(s, 0.16, { len: 84, w: 18, dmg: 26, stop: 0.11, shake: 0.6, flash: 0.35 }); sfx("slash"); } },
    ] },
    { id: "spear", name: "ʻIhe", cls: "Hawaiian · Spear", col: "#ffd36a", unlock: "Your first weapon", moves: [
      { dur: 0.28, lunge: 10, start: (s) => { thrust(s, 46, P.gold); hitLine(s, 0.06, { len: 50, w: 12, dmg: 9 }); sfx("swing"); } },
      { dur: 0.36, lunge: 6, start: (s) => { thrust(s, 44, P.gold, 0); thrust(s, 50, P.gold, 0.12); hitLine(s, 0.06, { len: 48, w: 12, dmg: 7 }); hitLine(s, 0.18, { len: 54, w: 12, dmg: 8 }); sfx("swing"); sfx("swing", 0.12); } },
      { dur: 0.55, lunge: 0, start: (s) => { arc(s, { span: TAU * 1.05, r: 30, W: 9, pal: P.gold, dir: 1, dur: 0.5, sq: 0.7, from: s.a + Math.PI }); dust(s.x, s.y + 10, 16); hitCircle(s, 0.18, { x: 0, y: 0, r: 46, dmg: 18, shake: 0.4, stop: 0.07 }); sfx("heavy"); } },
    ] },
    { id: "leiomano", name: "Leiomano", cls: "Hawaiian · Shark-tooth club", col: "#e8e2cc", unlock: "Clear the Outer Isles (Zone 2)", moves: [
      { dur: 0.32, lunge: 6, start: (s) => { arc(s, { span: 2.5, r: 22, W: 9, pal: P.ivory, dir: 1, dur: 0.32, style: "jag" }); hitArc(s, 0.08, { range: 40, span: 2.7, dmg: 11 }); sfx("swing"); } },
      { dur: 0.32, lunge: 6, start: (s) => { arc(s, { span: 2.5, r: 22, W: 9, pal: P.ivory, dir: -1, dur: 0.32, style: "jag" }); hitArc(s, 0.08, { range: 40, span: 2.7, dmg: 12 }); sfx("swing"); } },
      { dur: 0.58, lunge: 18, start: (s) => { jaw(s, 34); hitCircle(s, 0.26, { fwd: 34, r: 22, dmg: 28, stop: 0.12, shake: 0.6 }); sfx("bite", 0.24); } },
    ] },
    { id: "pahoa", name: "Pāhoa", cls: "Hawaiian · Dagger", col: "#e8b878", unlock: "Your first weapon", moves: [
      { dur: 0.16, lunge: 8, start: (s) => { thrust(s, 26, P.koa); hitLine(s, 0.04, { len: 30, w: 10, dmg: 6 }); sfx("slash"); } },
      { dur: 0.16, lunge: 8, start: (s) => { arc(s, { span: 1.7, r: 16, W: 5, pal: P.koa, dir: 1, dur: 0.18, style: "thin" }); hitArc(s, 0.04, { range: 30, span: 2, dmg: 6 }); sfx("slash"); } },
      { dur: 0.16, lunge: 8, start: (s) => { thrust(s, 28, P.koa); hitLine(s, 0.04, { len: 32, w: 10, dmg: 7 }); sfx("slash"); } },
      { dur: 0.5, lunge: 30, dash: true, start: (s) => { arc(s, { span: 3.4, r: 20, W: 7, pal: P.koa, dir: -1, dur: 0.3, style: "jag" }); iai(s, 50, P.koa); hitLine(s, 0.14, { len: 52, w: 14, dmg: 19, stop: 0.08, shake: 0.45 }); sfx("slash", 0.12); } },
    ] },
    { id: "newa", name: "Newa", cls: "Hawaiian · War club", col: "#c8883a", unlock: "Clear the Volcanic Highlands (Zone 1)", moves: [
      { dur: 0.4, lunge: 6, start: (s) => { arc(s, { span: 2.2, r: 20, W: 11, pal: P.koa, dir: 1, dur: 0.36 }); hitArc(s, 0.12, { range: 38, span: 2.4, dmg: 14, stop: 0.07, shake: 0.35 }); sfx("heavy"); } },
      { dur: 0.4, lunge: 6, start: (s) => { arc(s, { span: 2.2, r: 20, W: 11, pal: P.koa, dir: -1, dur: 0.36 }); hitArc(s, 0.12, { range: 38, span: 2.4, dmg: 15, stop: 0.07, shake: 0.35 }); sfx("heavy"); } },
      { dur: 0.7, lunge: 12, start: (s) => { arc(s, { span: 1.6, r: 18, W: 12, pal: P.koa, dir: 1, dur: 0.3, sq: 0.4, from: s.a - Math.PI * 0.85 }); smash(s, 24, P.koa, 0.22); hitCircle(s, 0.24, { fwd: 24, r: 32, dmg: 30, stop: 0.13, shake: 0.85, flash: 0.15 }); sfx("boom", 0.22); } },
    ] },
    { id: "pololu", name: "Pololū", cls: "Hawaiian · Long spear", col: "#f0c088", unlock: "Zone 5, first land", moves: [
      { dur: 0.32, lunge: 6, start: (s) => { thrust(s, 64, P.koa); hitLine(s, 0.07, { len: 68, w: 10, dmg: 11 }); sfx("swing"); } },
      { dur: 0.46, lunge: 0, start: (s) => { arc(s, { span: 3.0, r: 40, W: 8, pal: P.koa, dir: 1, dur: 0.42, sq: 0.7 }); hitArc(s, 0.12, { range: 60, span: 3.1, dmg: 13 }); sfx("swing"); } },
      { dur: 0.6, lunge: 24, dash: true, start: (s) => { thrust(s, 58, P.koa, 0); thrust(s, 70, P.koa, 0.14); thrust(s, 80, P.koa, 0.28); for (let k = 0; k < 3; k++) hitLine(s, 0.07 + k * 0.14, { len: 60 + k * 10, w: 12, dmg: 9, stop: 0.05, shake: 0.3 }); sfx("swing"); sfx("swing", 0.14); sfx("swing", 0.28); } },
    ] },
    { id: "kakau", name: "Kākau Bands", cls: "Tribal Symbol", col: "#f2b45e", unlock: "The forge: 3 tribal shards", moves: [
      { dur: 0.4, lunge: 10, start: (s) => { const c = aimPoint(s, 26); arc(s, { span: 2.6, r: 24, W: 10, pal: P.kakau, dir: 1, dur: 0.42, style: "niho" }); C.events.push({ t: at(0.08), fn: () => { sigil(c.x, c.y + 10, 24, 0.7, 0); embers(c.x, c.y, 14); } }); glyphs(s, 5, 0.06); hitCircle(s, 0.1, { fwd: 26, r: 26, dmg: 11, stop: 0.06, shake: 0.35 }); sfx("tribalSwing"); } },
      { dur: 0.5, lunge: 8, start: (s) => { arc(s, { span: 2.8, r: 26, W: 10, pal: P.kakau, dir: -1, dur: 0.45, style: "niho" }); arc(s, { span: 2.4, r: 20, W: 8, pal: P.kakau, dir: 1, dur: 0.45, style: "niho", tilt: 0.5 }); band(s.x, s.y, 0.8); glyphs(s, 6, 0.1); hitArc(s, 0.1, { range: 50, span: 3, dmg: 13, stop: 0.06, shake: 0.35 }); sfx("tribalSwing"); sfx("drum", 0.12); } },
      { dur: 0.8, lunge: 6, start: (s) => { const c = aimPoint(s, 30); C.events.push({ t: at(0.12), fn: () => { sigil(c.x, c.y + 8, 40, 0.9, 1); embers(c.x, c.y, 26); ring(c.x, c.y + 8, 50, P.kakau, 0.45); } }); glyphs(s, 8, 0.1); hitCircle(s, 0.16, { fwd: 30, r: 40, dmg: 22, stop: 0.11, shake: 0.7, flash: 0.15 }); sfx("drum"); sfx("tribalHit", 0.12); } },
    ], ult: { name: "The Awakening", dur: 1.6, lunge: 0, start: (s) => { awaken(s); sfx("tribalFinale"); } } },
    { id: "chain", name: "Makau Kaula", cls: "Chain-sickle", col: "#c8d6e8", unlock: "Zone 4, first land", moves: [
      // short in-close slash: the sickle whips out and back across the front
      { dur: 0.34, lunge: 6, start: (s) => { chainSwing(s, 0.34, (u) => [-1.1 + 2.2 * easeOut(u), 22 + 14 * Math.sin(Math.PI * u)], 1); sfx("chainWhip"); } },
      // a full orbit around the body at medium length
      { dur: 0.6, lunge: 0, start: (s) => { chainSwing(s, 0.6, (u) => [-Math.PI + TAU * 1.15 * easeOut(u), 34 + 6 * Math.sin(u * Math.PI)], -1); sfx("chainSpin"); } },
      // the long throw: the hook flies out to full length and is ripped back
      { dur: 0.62, lunge: -4, start: (s) => { chainSwing(s, 0.62, (u) => [Math.sin(u * 9) * 0.06, u < 0.45 ? 120 * easeOut(u / 0.45) : 120 * (1 - easeIn((u - 0.45) / 0.55)) + 10], 1, true); sfx("chainThrow"); sfx("chainWhip", 0.35); } },
      // spiral finisher: the chain plays out while it spins, carving a widening spiral round you
      { dur: 1.35, lunge: 0, start: (s) => { chainSwing(s, 1.35, (u) => [TAU * 3.2 * u, 16 + 100 * Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.5) * (u > 0.85 ? 1 - (u - 0.85) / 0.15 * 0.85 : 1)], 1, false, true); sfx("chainSpin"); sfx("chainSpin", 0.35); sfx("chainSpin", 0.7); sfx("heavy", 1.1); } },
    ] },
    { id: "fangs", name: "Mako Fangs", cls: "Slasher", col: "#ff5a6a", unlock: "The forge: 3 blood shards", moves: [
      { dur: 0.13, lunge: 4, start: (s) => { arc(s, { span: 1.9, r: 17, W: 4, pal: P.crimson, dir: 1, dur: 0.16, style: "thin" }); hitArc(s, 0.04, { range: 32, span: 2.2, dmg: 4 }); sfx("slash"); } },
      { dur: 0.13, lunge: 4, start: (s) => { arc(s, { span: 1.9, r: 17, W: 4, pal: P.crimson, dir: -1, dur: 0.16, style: "thin" }); hitArc(s, 0.04, { range: 32, span: 2.2, dmg: 4 }); sfx("slash"); } },
      { dur: 0.13, lunge: 4, start: (s) => { arc(s, { span: 1.6, r: 19, W: 4, pal: P.crimson, dir: 1, dur: 0.16, style: "thin", tilt: 0.6 }); hitArc(s, 0.04, { range: 32, span: 2.2, dmg: 4 }); sfx("slash"); } },
      { dur: 0.13, lunge: 4, start: (s) => { arc(s, { span: 1.6, r: 19, W: 4, pal: P.crimson, dir: -1, dur: 0.16, style: "thin", tilt: -0.6 }); hitArc(s, 0.04, { range: 32, span: 2.2, dmg: 5 }); sfx("slash"); } },
      { dur: 0.62, lunge: 14, dash: true, start: (s) => { cuts(s, 26, 18, 0.5); for (let k = 0; k < 7; k++) hitCircle(s, 0.06 + k * 0.06, { fwd: 26, r: 22, dmg: 3, stop: 0.02, shake: 0.12, quiet: k % 2 }); sfx("slash"); for (let k = 1; k < 6; k++) sfx("slash", k * 0.07); } },
    ], ult: { name: "Blood Frenzy", dur: 1.4, lunge: 0, start: (s) => { addFx({ type: "darken", dur: 1.4, tint: "50,4,10" }); for (let k = 0; k < 6; k++) { const a = s.a + (k / 6) * TAU; C.events.push({ t: at(k * 0.12), fn: () => cuts(Object.assign({}, s, { x: C.p.x, y: C.p.y, a }), 26, 20, 0.35) }); for (let j = 0; j < 3; j++) hitCircle(s, k * 0.12 + j * 0.05, { at: { x: s.x + Math.cos(a) * 26, y: s.y - 10 + Math.sin(a) * 20 }, r: 26, dmg: 5, stop: 0.02, shake: 0.12, quiet: j % 2 }); sfx("slash", k * 0.12); } C.events.push({ t: at(0.9), fn: () => jaw(Object.assign({}, s, { x: C.p.x, y: C.p.y }), 30) }); hitCircle(s, 1.0, { fwd: 30, r: 40, dmg: 34, stop: 0.14, shake: 1, flash: 0.4 }); sfx("bite", 0.95); } } },
    { id: "koi", name: "Koʻi", cls: "Hawaiian · Stone axe", col: "#c8b8a0", unlock: "Zone 6, first land", moves: [
      { dur: 0.46, lunge: 8, start: (s) => { arc(s, { span: 2.0, r: 22, W: 13, pal: P.stone, dir: 1, dur: 0.38, sq: 0.45, from: s.a - Math.PI * 0.75 }); hitCircle(s, 0.14, { fwd: 26, r: 24, dmg: 15, stop: 0.08, shake: 0.45 }); C.events.push({ t: at(0.14), fn: () => { const c = aimPoint(s, 26); splinters(c.x, c.y); } }); sfx("heavy"); sfx("chop", 0.13); } },
      { dur: 0.46, lunge: 6, start: (s) => { arc(s, { span: 3.2, r: 26, W: 12, pal: P.stone, dir: -1, dur: 0.4 }); hitArc(s, 0.12, { range: 48, span: 3.2, dmg: 14, stop: 0.07, shake: 0.4 }); sfx("heavy"); sfx("chop", 0.12); } },
      { dur: 0.85, lunge: 20, dash: true, start: (s) => { arc(s, { span: TAU * 1.1, r: 28, W: 14, pal: P.stone, dir: 1, dur: 0.5, sq: 0.7, from: s.a }); smash(s, 30, P.stone, 0.42); hitCircle(s, 0.2, { x: 0, y: 0, r: 46, dmg: 12, stop: 0.06, shake: 0.4 }); hitCircle(s, 0.44, { fwd: 30, r: 36, dmg: 30, stop: 0.14, shake: 0.9 }); C.events.push({ t: at(0.44), fn: () => { const c = aimPoint(s, 30); splinters(c.x, c.y); splinters(c.x, c.y); } }); sfx("heavy"); sfx("boom", 0.42); } },
    ] },
    { id: "maul", name: "Ola Maul", cls: "Life · Maul", col: "#7ad860", unlock: "The forge: 3 life shards", ultCost: 170, moves: [
      { dur: 0.48, lunge: 6, start: (s) => { arc(s, { span: 2.6, r: 26, W: 12, pal: P.life, dir: 1, dur: 0.44, style: "life" }); hitArc(s, 0.16, { range: 46, span: 2.8, dmg: 16, stop: 0.07, shake: 0.4 }); sfx("heavy"); } },
      { dur: 0.75, lunge: 10, start: (s) => { arc(s, { span: 1.4, r: 20, W: 12, pal: P.life, dir: 1, dur: 0.3, style: "life", sq: 0.45, from: s.a - Math.PI * 0.8 }); roots(s, 30, 0.24, 7, 1); hitCircle(s, 0.26, { fwd: 30, r: 40, dmg: 34, stop: 0.14, shake: 1, flash: 0.2 }); sfx("boom", 0.24); sfx("roots", 0.24); } },
    ], ult: { name: "Wildwood", dur: 1.5, lunge: 0, start: (s) => {
      addFx({ type: "darken", dur: 1.5, tint: "8,34,6" }); roots(s, 0, 0.18, 10, 1.2);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU, d = 50 + (k % 2) * 22, c = { x: s.x + Math.cos(a) * d, y: s.y - 6 + Math.sin(a) * d * 0.7 }; C.events.push({ t: at(0.4 + k * 0.07), fn: () => { rootsAt(c.x, c.y + 6, 5, 0.9, a); leaves(c.x, c.y, 14); if (k % 2 === 0 && window.Ambience && Ambience.sfx) Ambience.sfx("roots"); } }); hitCircle(s, 0.4 + k * 0.07, { at: c, r: 28, dmg: 16, stop: 0.04, shake: 0.4, quiet: k % 2 }); }
      hitCircle(s, 0.2, { x: 0, y: 0, r: 56, dmg: 22, stop: 0.1, shake: 0.9 });
      C.events.push({ t: at(1.1), fn: () => { addFx({ type: "grove", x: C.p.x, y: C.p.y, dur: 1.1, seed: Math.random() * 99 }); ring(C.p.x, C.p.y + 4, 100, P.life, 0.6); leaves(C.p.x, C.p.y - 20, 50); C.flash = 0.5; C.flashCol = "200,255,170"; } });
      hitCircle(s, 1.1, { x: 0, y: 0, r: 100, dmg: 30, stop: 0.12, shake: 1, flash: 0.4 }); sfx("lifeFinale"); sfx("boom", 1.1); } } },
    { id: "firestaff", name: "Ahi Staff", cls: "Fire · Twirling staff", col: "#ff9a3a", unlock: "The forge: 3 fire shards", moves: [
      { dur: 0.34, lunge: 7, start: (s) => { fire(s, { span: 2.6, r: 22, W: 9, dir: 1, dur: 0.34 }); hitArc(s, 0.08, { range: 42, span: 2.8, dmg: 11, burn: 1 }); sfx("fire"); } },
      { dur: 0.34, lunge: 7, start: (s) => { fire(s, { span: 2.6, r: 22, W: 9, dir: -1, dur: 0.34 }); hitArc(s, 0.08, { range: 42, span: 2.8, dmg: 12, burn: 1 }); sfx("fire"); } },
      { dur: 0.55, lunge: 4, start: (s) => { fire(s, { span: TAU * 1.1, r: 26, W: 10, dir: 1, dur: 0.5, sq: 0.7, from: s.a + Math.PI }); hitCircle(s, 0.2, { x: 0, y: 0, r: 46, dmg: 16, burn: 1, shake: 0.35, stop: 0.06 }); sfx("fire"); sfx("fire", 0.2); } },
      { dur: 0.85, lunge: 0, start: (s) => { fire(s, { span: TAU * 2.1, r: 30, W: 12, dir: -1, dur: 0.7, sq: 0.75, from: s.a }); bloom(s, 0, 0.42); hitCircle(s, 0.45, { x: 0, y: 0, r: 60, dmg: 30, burn: 1, stop: 0.12, shake: 0.9, flash: 0.3 }); sfx("fire"); sfx("boom", 0.45); } },
    ], ult: { name: "Wheel of Pele", dur: 1.4, lunge: 0, start: (s) => { addFx({ type: "darken", dur: 1.4, tint: "60,14,4" }); for (let k = 0; k < 4; k++) fire(Object.assign({}, s, { a: s.a + k * 1.6 }), { span: TAU * 1.05, r: 24 + k * 12, W: 12, dir: k % 2 ? -1 : 1, dur: 0.5, sq: 0.72, from: s.a + k }); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU, c = { x: s.x + Math.cos(a) * 64, y: s.y - 10 + Math.sin(a) * 44 }; C.events.push({ t: at(0.4 + k * 0.08), fn: () => { addFx({ type: "bloom", x: c.x, y: c.y + 4, dur: 0.9, seed: Math.random() * 99 }); embers(c.x, c.y, 14); } }); hitCircle(s, 0.4 + k * 0.08, { at: c, r: 26, dmg: 14, burn: 1, quiet: k % 2 }); } for (let k = 0; k < 3; k++) hitCircle(s, 0.2 + k * 0.2, { x: 0, y: 0, r: 60, dmg: 10, burn: 1, stop: 0.03, quiet: 1 }); hitCircle(s, 1.05, { x: 0, y: 0, r: 96, dmg: 30, burn: 1, stop: 0.12, shake: 1, flash: 0.5 }); sfx("fire"); sfx("boom", 1.05); } } },
    { id: "heel", name: "Ember Heel", cls: "Fire", col: "#ff8a3a", unlock: "A gift of Pele, in lands to come", moves: [
      { dur: 0.42, lunge: 8, start: (s) => { fire(s, { span: 3.6, r: 20, W: 11, dir: 1, dur: 0.5 }); hitArc(s, 0.12, { range: 40, span: 3.6, dmg: 12, burn: 1 }); sfx("fire"); } },
      { dur: 0.48, lunge: 10, start: (s) => { fire(s, { span: 5.2, r: 24, W: 12, dir: -1, dur: 0.55, sq: 0.6 }); hitArc(s, 0.16, { range: 44, span: 5.2, dmg: 14, burn: 1 }); sfx("fire"); } },
      { dur: 0.8, lunge: 16, start: (s) => { fire(s, { span: 2.2, r: 18, W: 13, dir: 1, dur: 0.4, sq: 0.35, from: s.a - Math.PI * 0.9 }); bloom(s, 30, 0.26); hitCircle(s, 0.3, { fwd: 30, r: 36, dmg: 34, stop: 0.14, shake: 0.9, flash: 0.3, burn: 1 }); sfx("boom", 0.28); sfx("fire", 0.3); } },
    ], ult: { name: "Pele's Stride", dur: 1.2, lunge: 70, dash: true, start: (s) => { addFx({ type: "darken", dur: 1.2, tint: "60,14,4" }); for (let k = 0; k < 5; k++) { fire(Object.assign({}, s), { span: 3.4, r: 20, W: 12, dir: k % 2 ? -1 : 1, dur: 0.3, sq: 0.6 }); bloom(s, 20 + k * 22, 0.12 + k * 0.17); hitCircle(s, 0.14 + k * 0.17, { fwd: 20 + k * 22, r: 30, dmg: 16, burn: 1, stop: 0.05, shake: 0.4, quiet: k % 2 }); } sfx("fire"); sfx("fire", 0.4); sfx("boom", 0.85); } } },
    { id: "storm", name: "Stormcaller", cls: "Storm", col: "#a8c4ff", unlock: "The forge: 3 storm shards", moves: [
      { dur: 0.4, lunge: 6, start: (s) => { arc(s, { span: 2.8, r: 26, W: 8, pal: P.storm, dir: 1, dur: 0.38, style: "elec" }); forks(s, 3, 70, 0.08); hitArc(s, 0.08, { range: 48, span: 3, dmg: 10, shock: 1 }); sfx("stormSwing"); } },
      { dur: 0.55, lunge: 4, start: (s) => { thrust(s, 44, P.storm); const c = aimPoint(s, 60); cloud(c.x, c.y - 46, 0.7, 1.3); cloud(c.x - 34, c.y - 40, 0.7, 0.9); cloud(c.x + 32, c.y - 42, 0.7, 1.0); chain(s, 0.12, 6, 190); bolt(c.x, c.y, 0.22, 1); hitLine(s, 0.08, { len: 50, w: 14, dmg: 8, shock: 1 }); sfx("zap", 0.1); sfx("thunder", 0.22); } },
      { dur: 0.9, lunge: 0, start: (s) => { const t = aimPoint(s, 46); cloud(t.x, t.y - 40, 0.85, 1.2); for (let k = 0; k < 3; k++) { bolt(t.x + (k - 1) * 14, t.y, 0.3 + k * 0.12); hitCircle(s, 0.32 + k * 0.12, { at: { x: t.x + (k - 1) * 14, y: t.y }, r: 20, dmg: 12, stop: 0.08, shake: 0.6, flash: 0.4, shock: 1 }); } sfx("thunder", 0.3); } },
    ], ult: { name: "Tempest", dur: 1.5, lunge: 0, start: (s) => { tempest(s); sfx("stormCast"); } } },
    { id: "tide", name: "Tidecutter", cls: "Water", col: "#5ab8ff", unlock: "The forge: 3 water shards", moves: [
      { dur: 0.36, lunge: 8, start: (s) => { arc(s, { span: 2.8, r: 24, W: 10, pal: P.water, dir: 1, dur: 0.42, style: "water" }); hitArc(s, 0.08, { range: 44, span: 3, dmg: 10 }); sfx("water"); } },
      { dur: 0.36, lunge: 8, start: (s) => { arc(s, { span: 2.8, r: 26, W: 10, pal: P.water, dir: -1, dur: 0.42, style: "water" }); hitArc(s, 0.08, { range: 44, span: 3, dmg: 11 }); sfx("water"); } },
      { dur: 0.8, lunge: 20, start: (s) => { arc(s, { span: TAU * 1.6, r: 14, grow: 22, W: 11, pal: P.water, dir: 1, dur: 0.75, style: "water", sq: 0.72, from: s.a }); splash(s.x, s.y - 4, 26, P.water); for (let k = 0; k < 3; k++) hitCircle(s, 0.18 + k * 0.16, { x: 0, y: 0, r: 46, dmg: 10, stop: 0.06, shake: 0.35 }); sfx("water"); sfx("water", 0.3); } },
    ], ult: { name: "Riptide", dur: 1.5, lunge: 8, start: (s) => { addFx({ type: "darken", dur: 1.4, tint: "4,20,50" }); for (let k = 0; k < 3; k++) C.events.push({ t: at(k * 0.22), fn: () => { wave(Object.assign({}, s, { x: C.p.x, y: C.p.y }), P.water, 0.6); splash(C.p.x + Math.cos(s.a) * 40, C.p.y - 4 + Math.sin(s.a) * 30, 24, P.water); } }); for (let k = 0; k < 3; k++) hitArc(s, 0.1 + k * 0.22, { range: 86, span: 2.0, dmg: 18, stop: 0.05, shake: 0.4 }); arc(s, { span: TAU * 2, r: 16, grow: 50, W: 12, pal: P.water, dir: 1, dur: 0.8, style: "water", sq: 0.72, from: s.a }); for (let k = 0; k < 4; k++) hitCircle(s, 0.8 + k * 0.12, { x: 0, y: 0, r: 70, dmg: 9, stop: 0.03, quiet: 1 }); hitCircle(s, 1.3, { x: 0, y: 0, r: 90, dmg: 26, stop: 0.12, shake: 0.9, flash: 0.4 }); sfx("water"); sfx("water", 0.3); sfx("glowBurst", 0.8); } } },
    { id: "glowtide", name: "Glowtide", cls: "Water · Bioluminescent", col: "#5af2e8", unlock: "The forge: 3 glowing-water shards", moves: [
      { dur: 0.42, lunge: 9, start: (s) => { biolum(s, { span: 3.0, r: 26, W: 15, dir: 1, dur: 0.6 }); hitArc(s, 0.09, { range: 50, span: 3.1, dmg: 11 }); sfx("glowSwing"); } },
      { dur: 0.42, lunge: 9, start: (s) => { biolum(s, { span: 3.0, r: 28, W: 15, dir: -1, dur: 0.6 }); hitArc(s, 0.09, { range: 52, span: 3.1, dmg: 12 }); sfx("glowSwing"); } },
      { dur: 0.5, lunge: 12, start: (s) => { biolum(s, { span: 5.8, r: 22, W: 17, dir: 1, dur: 0.7, sq: 0.6 }); hitCircle(s, 0.14, { x: 0, y: 0, r: 50, dmg: 13, stop: 0.05 }); sfx("glowSwing"); sfx("glowSwing", 0.12); } },
      { dur: 0.85, lunge: 6, start: (s) => { wave(s, P.glow, 0.85); for (let k = 0; k < 3; k++) hitCircle(s, 0.15 + k * 0.17, { fwd: 22 + k * 18, r: 26, dmg: 11, stop: 0.06, shake: 0.35 }); sfx("glowSwing"); sfx("chime", 0.2); } },
    ], ult: { name: "Glowing Maelstrom", dur: 1.3, lunge: 0, start: (s) => { vortex(s); sfx("glowBurst"); } } },
    { id: "starfall", name: "Starfall", cls: "Celestial", col: "#c8b4ff", unlock: "The forge: 3 celestial shards", moves: [
      { dur: 0.4, lunge: 8, start: (s) => { arc(s, { span: 3.0, r: 27, W: 11, pal: P.star, dir: 1, dur: 0.5, style: "star" }); constellation(s, 1, 0.08); hitArc(s, 0.08, { range: 50, span: 3.1, dmg: 12 }); sfx("celSwing"); } },
      { dur: 0.4, lunge: 8, start: (s) => { arc(s, { span: 3.0, r: 30, W: 11, pal: P.star, dir: -1, dur: 0.5, style: "star" }); constellation(s, -1, 0.08); hitArc(s, 0.08, { range: 52, span: 3.1, dmg: 13 }); sfx("celSwing"); } },
      { dur: 0.6, lunge: 18, dash: true, start: (s) => { arc(s, { span: 3.8, r: 34, W: 16, pal: P.star, dir: 1, dur: 0.6, style: "star", sq: 0.55 }); iai(s, 90, P.star); hitLine(s, 0.16, { len: 90, w: 20, dmg: 20, stop: 0.09, shake: 0.5, flash: 0.25 }); sfx("celSwing"); sfx("celHit", 0.16); } },
      { dur: 0.95, lunge: 0, start: (s) => { const c = aimPoint(s, 42); for (let k = 0; k < 5; k++) { const a = k * 1.3, d = k ? 15 : 0; star(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d * 0.7, 0.3 + k * 0.08); hitCircle(s, 0.4 + k * 0.08, { at: { x: c.x + Math.cos(a) * d, y: c.y + Math.sin(a) * d * 0.7 }, r: 16, dmg: 9, stop: 0.05, shake: 0.35 }); sfx("chime", 0.36 + k * 0.08); } sfx("celSwing"); } },
    ], ult: { name: "The Heavens", dur: 1.7, lunge: 0, start: (s) => { heavens(s); sfx("celFinale"); } } },
    { id: "lua", name: "Koʻi-Lua", cls: "Plasma · Twin-headed axe", col: "#f4f6ff", unlock: "The last road (in lands to come)", ultCost: 340, moves: [
      // the forward head cuts, and the haft carries round so the back head cuts again; you step through it
      { dur: 0.52, lunge: 0, path: (u) => [easeOut(u / 0.7) * 16, Math.sin(Math.min(1, u / 0.7) * Math.PI) * 5], start: (s) => { arc(s, { span: 2.7, r: 26, W: 13, pal: P.plasma, dir: 1, dur: 0.26, style: "plasma" }); C.events.push({ t: at(0.16), fn: () => arc(Object.assign({}, s, { x: C.p.x, y: C.p.y }), { span: 2.9, r: 31, W: 13, pal: P.plasma, dir: 1, dur: 0.3, style: "plasma", from: s.a + 1.2 }) }); hitArc(s, 0.08, { range: 50, span: 2.9, dmg: 22, stop: 0.06, shake: 0.4 }); hitArc(s, 0.26, { range: 56, span: 3.1, dmg: 20, stop: 0.06, shake: 0.4 }); sfx("plasmaSwing"); sfx("plasmaSwing", 0.16); } },
      // a backhand cleave, then the axe whirls once round you as you drive forward
      { dur: 0.62, lunge: 0, path: (u) => [u < 0.3 ? -easeOut(u / 0.3) * 6 : -6 + easeOut((u - 0.3) / 0.6) * 28, 0], start: (s) => { arc(s, { span: 2.4, r: 28, W: 14, pal: P.plasma, dir: -1, dur: 0.24, style: "plasma", sq: 0.5 }); C.events.push({ t: at(0.22), fn: () => arc(Object.assign({}, s, { x: C.p.x, y: C.p.y }), { span: TAU * 1.05, r: 32, W: 13, pal: P.plasma, dir: 1, dur: 0.36, style: "plasma", sq: 0.72, from: s.a + Math.PI }) }); hitArc(s, 0.1, { range: 52, span: 2.6, dmg: 24, stop: 0.07, shake: 0.5 }); hitCircle(s, 0.36, { x: 0, y: 0, r: 54, dmg: 18, stop: 0.05, shake: 0.4 }); sfx("plasmaSwing"); sfx("plasmaSwing", 0.22); } },
      // up and over with both heads: a leaping split that cracks the ground open in a line of white fire
      { dur: 0.95, lunge: 0, dash: true, path: (u) => [easeOut(u / 0.5) * 34, 0], start: (s) => { arc(s, { span: 2.2, r: 24, W: 15, pal: P.plasma, dir: 1, dur: 0.4, style: "plasma", sq: 0.38, from: s.a - Math.PI * 0.9 }); C.events.push({ t: at(0.4), fn: () => { const c = aimPoint(Object.assign({}, s, { x: C.p.x, y: C.p.y }), 22); addFx({ type: "fissure", x: c.x, y: c.y + 10, a: s.a, len: 100, dur: 1.0, seed: Math.random() * 99, ground: true }); addFx({ type: "fissureGlow", x: c.x, y: c.y + 10, a: s.a, len: 100, dur: 1.0 }); prismBurst(c.x, c.y, 26); C.shake = 1; } }); hitLine(s, 0.42, { len: 120, w: 22, dmg: 46, stop: 0.14, shake: 1, flash: 0.35, from: 18 }); sfx("plasmaSwing"); sfx("plasmaSplit", 0.4); } },
    ], ult: { name: "Nā Lā Māhoe", dur: 2.0, lunge: 0, path: (u) => [easeOut(u / 0.6) * 46, 0], start: (s) => {
      // the Twin Suns: you spin forward with two suns wheeling round you, every element rolls out in rings,
      // and it all ends in one white nova
      addFx({ type: "darken", dur: 2.0, tint: "10,6,30" });
      addFx({ type: "suns", follow: true, dur: 1.7, seed: Math.random() * 99 });
      for (let k = 0; k < 5; k++) C.events.push({ t: at(k * 0.22), fn: () => arc(Object.assign({}, s, { x: C.p.x, y: C.p.y }), { span: TAU * 1.05, r: 30 + k * 4, W: 14, pal: P.plasma, dir: k % 2 ? -1 : 1, dur: 0.34, style: "plasma", sq: 0.72, from: s.a + k * 1.3 }) });
      for (let k = 0; k < 6; k++) hitCircle(s, 0.12 + k * 0.18, { x: 0, y: 0, r: 60, dmg: 12, stop: 0.03, shake: 0.35, quiet: k % 2 });
      PRISM.forEach((col, k) => C.events.push({ t: at(0.35 + k * 0.09), fn: () => { addFx({ type: "pring", x: C.p.x, y: C.p.y + 4, r: 40 + k * 12, col, dur: 0.7, ground: true }); } }));
      for (let k = 0; k < 3; k++) hitCircle(s, 0.6 + k * 0.25, { x: 0, y: 0, r: 120, dmg: 10, stop: 0.03, shake: 0.3, quiet: 1 });
      C.events.push({ t: at(1.45), fn: () => { addFx({ type: "nova", x: C.p.x, y: C.p.y, dur: 1.0 }); addFx({ type: "psigil", x: C.p.x, y: C.p.y + 4, dur: 1.4, ground: true, rot: Math.random() * TAU }); prismBurst(C.p.x, C.p.y - 10, 70); C.flash = 1; C.flashCol = "255,255,255"; C.shake = 1; } });
      hitCircle(s, 1.45, { x: 0, y: 0, r: 150, dmg: 64, stop: 0.2, shake: 1, flash: 1 });
      sfx("plasmaNova"); } } },
    { id: "stone", name: "Pele's Grip", cls: "Stone · Gauntlet", col: "#d8c49a", unlock: "The forge: 3 stone shards", moves: [
      { dur: 0.36, lunge: 8, start: (s) => { punch(s); spikes(s, 1, 24, 0.08); hitCircle(s, 0.1, { fwd: 22, r: 18, dmg: 12, stop: 0.06, shake: 0.4 }); sfx("stone", 0.06); } },
      { dur: 0.7, lunge: 0, start: (s) => { stomp(s); spikes(s, 6, 20, 0.12, 13); for (let k = 0; k < 6; k++) hitCircle(s, 0.14 + k * 0.06, { fwd: 20 + k * 13, r: 14, dmg: 6, stop: 0.03, shake: 0.25, quiet: k % 2 }); sfx("stone", 0.12); sfx("stone", 0.3); } },
      { dur: 0.95, lunge: 0, start: (s) => { stomp(s); ring(s.x, s.y, 50, P.stone, 0.5); for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; spikeAt(s.x + Math.cos(a) * 34, s.y + Math.sin(a) * 24, 0.16 + (k % 2) * 0.05, 16 + (k % 3) * 3); } hitCircle(s, 0.2, { x: 0, y: 0, r: 52, dmg: 30, stop: 0.13, shake: 0.9, flash: 0.2 }); sfx("boom", 0.18); sfx("stone", 0.2); } },
    ], ult: { name: "Earthshaker", dur: 1.5, lunge: 0, start: (s) => { addFx({ type: "darken", dur: 1.4, tint: "30,20,10" }); stomp(s); for (let r = 0; r < 8; r++) { const a = (r / 8) * TAU; for (let k = 0; k < 5; k++) { const d = 22 + k * 16, c = { x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d * 0.75 }; spikeAt(c.x, c.y, 0.15 + k * 0.08, 16 + k * 2); if (k % 2 === 0) hitCircle(s, 0.15 + k * 0.08, { at: { x: c.x, y: c.y - 10 }, r: 18, dmg: 10, stop: 0.03, shake: 0.3, quiet: 1 }); } } hitCircle(s, 0.1, { x: 0, y: 0, r: 46, dmg: 20, stop: 0.08, shake: 0.8 }); C.events.push({ t: at(0.9), fn: () => { stomp(s); ring(C.p.x, C.p.y, 100, P.stone, 0.6); } }); hitCircle(s, 0.95, { x: 0, y: 0, r: 100, dmg: 28, stop: 0.12, shake: 1, flash: 0.35 }); sfx("stone"); sfx("stone", 0.4); sfx("boom", 0.9); } } },
  ];
  C.weapons = WEAPONS;
  C.P = P;

  // ---------------------------------------------------------------- helpers: swing context, hits, effects
  function aimPoint(s, d) { return { x: s.x + Math.cos(s.a) * d, y: s.y - 10 + Math.sin(s.a) * d * 0.8 }; }
  function at(t) { return C.clock + t; }
  function sfx(kind, delay) { if (!window.Ambience || !Ambience.sfx) return; if (delay) C.events.push({ t: at(delay), fn: () => Ambience.sfx(kind) }); else Ambience.sfx(kind); }

  const powOf = (w, local) => (POW[w.id] || 1) * (local !== false ? 1 + 0.12 * ((C.upgrades && C.upgrades[w.id]) || 0) : 1);
  C.POW = POW; C.powOf = powOf;
  const withPow = (o) => (o.pw ? o : Object.assign({}, o, { pw: C.powNow || 1 }));
  function hitArc(s, t, o) { o = withPow(o); if (C.boostR || C.boostD) o = Object.assign({}, o, { dmg: o.dmg * (C.boostD || 1), range: o.range && o.range * (C.boostR || 1), r: o.r && o.r * (C.boostR || 1), len: o.len && o.len * (C.boostR || 1), w: o.w && o.w * (C.boostR || 1) }); C.events.push({ t: at(t), fn: () => { const hx = C.p.x, hy = C.p.y - 10; for (const d of C.targets) { if (C.immune(d)) continue; const dx = d.x - hx, dy = (d.y - 12 - hy) / 0.8, dist = Math.hypot(dx, dy); let da = Math.atan2(dy, dx) - s.a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (dist < o.range * 1.25 + 8 + (d.big || 0) && Math.abs(da) < o.span / 2 + 0.3 + (d.big ? Math.min(0.8, d.big / Math.max(dist, 1)) : 0)) damage(d, o, Math.atan2(dy, dx)); } } }); }
  function hitLine(s, t, o) { o = withPow(o); if (C.boostR || C.boostD) o = Object.assign({}, o, { dmg: o.dmg * (C.boostD || 1), range: o.range && o.range * (C.boostR || 1), r: o.r && o.r * (C.boostR || 1), len: o.len && o.len * (C.boostR || 1), w: o.w && o.w * (C.boostR || 1) }); C.events.push({ t: at(t), fn: () => { const hx = C.p.x, hy = C.p.y - 10, ux = Math.cos(s.a), uy = Math.sin(s.a); for (const d of C.targets) { if (C.immune(d)) continue; const dx = d.x - hx, dy = d.y - 12 - hy, along = dx * ux + dy * uy, perp = Math.abs(-dx * uy + dy * ux); if (along > -8 - (d.big || 0) && along < o.len + 8 + (d.big || 0) && perp < o.w + 6 + (d.big || 0)) damage(d, o, s.a); } } }); }
  function hitCircle(s, t, o) { o = withPow(o); if (C.boostR || C.boostD) o = Object.assign({}, o, { dmg: o.dmg * (C.boostD || 1), range: o.range && o.range * (C.boostR || 1), r: o.r && o.r * (C.boostR || 1), len: o.len && o.len * (C.boostR || 1), w: o.w && o.w * (C.boostR || 1) }); C.events.push({ t: at(t), fn: () => { let cx = C.p.x, cy = C.p.y - 10; if (o.at) { cx = o.at.x; cy = o.at.y; } else if (o.fwd) { cx += Math.cos(s.a) * o.fwd; cy += Math.sin(s.a) * o.fwd * 0.8; } for (const d of C.targets) { if (C.immune(d)) continue; if (Math.hypot(d.x - cx, (d.y - 12 - cy) / 0.85) < o.r + 8 + (d.big || 0)) damage(d, o, Math.atan2(d.y - cy, d.x - cx)); } } }); }

  // what a blow can't touch: the dead, the hidden (burrowed, high in the air), and sea creatures unless
  // the hero striking stands in the water (C.p is whoever is swinging, a partner's ghost included).
  // A shark stranded on the beach can be struck by anyone.
  C.immune = (d) => d.dead || d.untouchable || (d.aquatic && !d.stranded && !(window.Level && Level.waterAt && C.p && Level.waterAt(C.p.x, C.p.y)));
  // Co-op: a move can be played for a partner's hero (a "ghost" replay). Everything it schedules or
  // spawns is bound to that hero, so its effects follow them and its hits come from where they stand.
  let REAL = true;
  function withActor(actor, real, fn) {
    const prevP = C.p, prevR = REAL, e0 = C.events.length, f0 = C.fx.length;
    C.p = actor; REAL = real;
    try { fn(); } finally { C.p = prevP; REAL = prevR; }
    for (let i = f0; i < C.fx.length; i++) if (!C.fx[i].p) C.fx[i].p = actor;
    for (let i = e0; i < C.events.length; i++) { const ev = C.events[i], f = ev.fn; if (ev.bound) continue; ev.bound = true; ev.fn = () => withActor(actor, real, f); }
  }
  // a talisman's blast: every foe within r of (x, y) takes the hit (actor = whose blast it is)
  C.blast = function (actor, x, y, r, o, real) {
    withActor(actor, real === undefined ? true : real, () => { for (const d of C.targets) { if (C.immune(d)) continue; const dd = Math.hypot(d.x - x, (d.y - 10 - y) / 0.85); if (dd < r + (d.big || 0)) damage(d, Object.assign({ stop: 0.05, shake: 0.3 }, o), Math.atan2(d.y - y, d.x - x)); } });
  };
  C.unleash = function (actor, wi, a, boostR, boostD, real) {
    const pr = C.boostR, pd = C.boostD; C.boostR = boostR; C.boostD = boostD;
    try { C.ghost(actor, wi, -1, a, real); } finally { C.boostR = pr; C.boostD = pd; }
  };
  C.ghost = function (actor, wi, mi, a, real) {
    const w = WEAPONS[wi]; if (!w) return;
    const m = mi < 0 ? w.ult : w.moves[mi]; if (!m) return;
    const prev = C.powNow; C.powNow = powOf(w, actor === C.local);
    try { withActor(actor, real, () => m.start({ x: actor.x, y: actor.y, a, p: actor })); } finally { C.powNow = prev; }
  };
  // hit-stop: a short held beat on impact. Capped, and never again within 0.22s of play, so combos
  // through a crowd flow instead of stuttering; off entirely in co-op (the world is shared).
  C.lastStop = -9;
  function stopFor(t) { if (window.Net && Net.active()) return; if (C.clock - C.lastStop < 0.22) return; C.hitstop = Math.max(C.hitstop, Math.min(0.06, t)); C.lastStop = C.clock; }
  C.stopFor = stopFor;
  function damage(d, o, ang) {
    const local = C.p === C.local;
    // a partner in a Duel Hall bout: the hit is theirs to take (they're told over the network)
    if (d.pvp) { if (local && REAL && !d.dead) { if (C.onPvp) C.onPvp(d, o.dmg * (0.9 + Math.random() * 0.2), ang); impact(d.x, d.y - 20, WEAPONS[C.cur], false); sfx("hit"); } return; }
    if (!local && !REAL) return;                       // a partner's swing seen on the guest: the host decides what it hits
    if (!local || d.net) return softDamage(d, o, ang, local);
    // a guarded blow (a tiki spearman's raised spear): no damage, a ring of sparks, the hit glances off
    if (d.blocks && d.blocks(ang)) {
      if (C.clock - (d.blockT || -9) < 0.05) return;
      d.blockT = C.clock; d.angV -= Math.cos(ang) * 0.4;
      stopFor(0.05); C.shake = Math.min(1, C.shake + 0.25);
      for (let k = 0; k < 10; k++) { const a2 = ang + Math.PI + (Math.random() - 0.5) * 2; part({ x: d.x - Math.cos(ang) * 8, y: d.y - 16, vx: Math.cos(a2) * (60 + Math.random() * 90), vy: Math.sin(a2) * (60 + Math.random() * 90), life: 0.25, col: k % 2 ? "#fff4b8" : "#ffd26a", size: 1, kind: "spark" }); }
      C.nums.push({ x: d.x, y: d.y - 40, v: "GUARD", crit: false, t0: C.clock, col: "#d8d0c0" });
      if (d.onBlock) d.onBlock(ang);
      sfx("guardHit"); return;
    }
    const crit = Math.random() < 0.14 + (C.critBonus || 0);
    const mom = (1 + 0.15 * C.momTier()) * (C.dmgMul ? C.dmgMul(WEAPONS[C.cur].id) : 1);                      // momentum makes every hit heavier
    const dmg = Math.max(1, Math.round(o.dmg * (o.pw || C.powNow || 1) * (0.9 + Math.random() * 0.2) * (crit ? 1.7 : 1) * mom * (d.armor || 1)));   // armor <1 = guarded, >1 = exposed
    d.hp -= dmg; d.flash = 0.12; d.angV += Math.cos(ang) * (0.9 + dmg * 0.05); d.hitT = C.clock;
    if (d.onHit) d.onHit(dmg, ang, crit);
    if (d.enemy) { C.momentum = Math.min(100, C.momentum + (crit ? 9 : 5) * (C.momMul || 1)); C.momT = C.clock; }
    const w = WEAPONS[C.cur];
    C.nums.push({ x: d.x + (Math.random() - 0.5) * 10, y: d.y - 40, v: dmg, crit, t0: C.clock, col: crit ? "#fff1a0" : w.col });
    stopFor((o.stop || 0.045) * (crit ? 1.3 : 1));
    C.shake = Math.min(1, C.shake + (o.shake || 0.22) * (crit ? 1.3 : 1));
    if (o.flash) { C.flash = Math.max(C.flash, o.flash); C.flashCol = o.shock ? "220,230,255" : o.burn ? "255,200,140" : "255,255,255"; }
    impact(d.x, d.y - 20, w, crit);
    if (d.enemy) landed(d, dmg, o, ang);
    if (o.burn) for (let k = 0; k < 8; k++) part({ x: d.x + (Math.random() - 0.5) * 14, y: d.y - 10 - Math.random() * 24, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 30, life: 0.6, col: ["#ffb63c", "#ec561c", "#fff4b8"][k % 3], size: 1, kind: "ember" });
    if (o.shock) for (let k = 0; k < 6; k++) part({ x: d.x, y: d.y - 20, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, life: 0.25, col: "#fff4a4", size: 1, kind: "spark" });
    C.combo++; C.comboT = C.clock;
    chargeUp(dmg);
    if (!o.quiet) { sfx(crit ? "crit" : "hit"); const el = HIT_EL[w.id]; if (el) sfx(el); if (d.mat) sfx("mat_" + d.mat); }
    if (d.hp <= 0 && !d.dead) {
      d.dead = true; d.respawn = C.clock + 1.6; C.shake = Math.min(1, C.shake + 0.5); C.lastStop = -9; stopFor(0.06);
      if (d.enemy) { C.momentum = Math.min(100, C.momentum + 12); window.Enemies && Enemies.death(d); C.kills = (C.kills || 0) + 1; if (C.onKill) C.onKill(d); sfx("boom"); return; }
      for (let k = 0; k < 26; k++) part({ x: d.x, y: d.y - 22, vx: (Math.random() - 0.5) * 160, vy: -40 - Math.random() * 120, g: 260, life: 1 + Math.random() * 0.6, col: ["#e8c878", "#c8a050", "#8a6030", "#f4e0a0"][k % 4], size: k % 3 ? 1 : 2, kind: "debris", spin: 1 });
      sfx("boom");
    }
  }

  // gear effects on a blow you land: blood cloth heals every so many hits; storm cloth arcs lightning on
  function landed(d, dmg, o, ang) {
    if (C.lifesteal) { C.lsCount = (C.lsCount || 0) + 1; if (C.lsCount >= C.lifesteal) { C.lsCount = 0; C.onHeal && C.onHeal(1); } }
    if (C.chainChance && !o.chained && Math.random() < C.chainChance) {
      let best = null, bd = 70;
      for (const q of C.targets) if (q !== d && !C.immune(q)) { const dd = Math.hypot(q.x - d.x, q.y - d.y); if (dd < bd) { bd = dd; best = q; } }
      if (best) {
        for (let k = 0; k <= 8; k++) part({ x: d.x + (best.x - d.x) * k / 8 + (Math.random() - 0.5) * 6, y: d.y - 14 + (best.y - d.y) * k / 8, vx: 0, vy: 0, life: 0.2, col: "#e8f0ff", size: 1, kind: "spark" });
        damage(best, { dmg: Math.max(1, Math.round(dmg * 0.45)), shock: 1, chained: true, stop: 0, shake: 0.08, quiet: false }, ang);
        sfx("zap");
      }
    }
  }
  // a hit that is only partly ours to resolve. d.net: our swing on an enemy the host simulates (show
  // the hit and earn momentum; the host applies the damage). !local: the partner's swing on the host
  // (apply the damage, but the partner's momentum and hit-stop are theirs, not ours).
  function softDamage(d, o, ang, local) {
    const crit = Math.random() < 0.14, w = local ? WEAPONS[C.cur] : WEAPONS[C.p.w || 0] || WEAPONS[0];
    const dmg = Math.max(1, Math.round(o.dmg * (o.pw || C.powNow || 1) * (0.9 + Math.random() * 0.2) * (crit ? 1.7 : 1) * (local ? 1 + 0.15 * C.momTier() : 1 + 0.15 * (C.p.tier || 0)) * (d.armor || 1)));
    d.flash = 0.12; d.angV += Math.cos(ang) * 0.6;
    if (local) {
      C.nums.push({ x: d.x + (Math.random() - 0.5) * 10, y: d.y - 40, v: dmg, crit, t0: C.clock, col: crit ? "#fff1a0" : w.col });
      C.momentum = Math.min(100, C.momentum + (crit ? 9 : 5) * (C.momMul || 1)); C.momT = C.clock; C.combo++; C.comboT = C.clock;
      stopFor((o.stop || 0.045) * (crit ? 1.3 : 1)); C.shake = Math.min(1, C.shake + (o.shake || 0.22) * (crit ? 1.3 : 1));
      impact(d.x, d.y - 20, w, crit);
      chargeUp(dmg);
      if (!o.quiet) { sfx(crit ? "crit" : "hit"); const el = HIT_EL[w.id]; if (el) sfx(el); if (d.mat) sfx("mat_" + d.mat); }
      return;
    }
    if (d.blocks && d.blocks(ang)) { d.blockT = C.clock; sfx("guardHit"); return; }
    d.hp -= dmg; d.hitT = C.clock; if (d.onHit) d.onHit(dmg, ang, crit);
    C.nums.push({ x: d.x + (Math.random() - 0.5) * 10, y: d.y - 40, v: dmg, crit, t0: C.clock, col: "#ffd27a" });
    impact(d.x, d.y - 20, w, crit);
    if (!o.quiet) { sfx("hit"); if (d.mat) sfx("mat_" + d.mat); }
    if (d.hp <= 0 && !d.dead) { d.dead = true; d.respawn = C.clock + 1.6; if (d.enemy) { window.Enemies && Enemies.death(d); C.kills = (C.kills || 0) + 1; if (C.onKill) C.onKill(d); sfx("boom"); } }
  }
  const HIT_EL = { lua: "plasmaHit", heel: "hitFire", maul: "hitLife", storm: "hitStorm", tide: "hitWater", glowtide: "hitWater", stone: "stone", starfall: "hitStar", kakau: "hitTribal" };
  C.addPart = (p) => part(p);
  const whiteCache = new Map();
  C.whiteOf = (img) => { let c = whiteCache.get(img); if (c) return c; const [cv, x] = K.canvas(img.width, img.height); x.drawImage(img, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = "#ffffff"; x.fillRect(0, 0, img.width, img.height); whiteCache.set(img, cv); return cv; };
  function part(p) { p.age = 0; p.max = p.life; p.g = p.g || 0; C.parts.push(p); }
  function addFx(f) { f.t0 = f.t0 === undefined ? C.clock : f.t0; C.fx.push(f); return f; }

  const FXS = 1.35; // global effect scale: big, bold slashes
  function arc(s, o) {
    o = Object.assign({}, o, { r: o.r * FXS, W: o.W * FXS, grow: (o.grow || 0) * FXS, rTo: o.rTo ? o.rTo * FXS : undefined });
    const from = o.from !== undefined ? o.from : s.a - (o.dir * o.span) / 2;
    addFx(Object.assign({ type: "arc", follow: true, a0: from, a1: from + o.dir * o.span, sq: 0.74, style: "plain", grow: 0 }, o));
    if (o.style === "water" || o.style === "glow") for (let k = 0; k < 10; k++) C.events.push({ t: at(0.04 + k * 0.025), fn: () => { const a = from + o.dir * o.span * Math.min(1, (k + 1) / 9); part({ x: C.p.x + Math.cos(a) * (o.r + 6), y: C.p.y - 10 + Math.sin(a) * (o.r + 6) * 0.74, vx: Math.cos(a) * 40, vy: Math.sin(a) * 30 - 30, g: 220, life: 0.5, col: o.style === "glow" ? (k % 2 ? "#baffef" : "#c8a8ff") : (k % 2 ? "#a8e8ff" : "#ffffff"), size: 1, kind: "drop", glow: o.style === "glow" }); } });
    if (o.style === "star") for (let k = 0; k < 8; k++) C.events.push({ t: at(0.04 + k * 0.03), fn: () => { const a = from + o.dir * o.span * Math.min(1, (k + 1) / 8); part({ x: C.p.x + Math.cos(a) * (o.r + 3), y: C.p.y - 10 + Math.sin(a) * (o.r + 3) * 0.74, vx: Math.cos(a) * 10, vy: -8, life: 0.7, col: k % 2 ? "#ffe8a2" : "#ffffff", size: 1, kind: "star4", glow: true }); } });
    if (o.style === "life") for (let k = 0; k < 10; k++) C.events.push({ t: at(0.05 + k * 0.028), fn: () => { const a = from + o.dir * o.span * ((k + 1) / 10); part({ x: C.p.x + Math.cos(a) * (o.r + 4), y: C.p.y - 10 + Math.sin(a) * (o.r + 4) * 0.74, vx: Math.cos(a) * 40 + (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 30, g: 40, drag: 1.6, life: 0.9 + Math.random() * 0.5, col: LEAF[k % 5], size: 2, kind: "leaf" }); } });
    if (o.style === "plasma") for (let k = 0; k < 12; k++) C.events.push({ t: at(0.03 + k * 0.022), fn: () => { const a = from + o.dir * o.span * Math.min(1, (k + 1) / 11); part({ x: C.p.x + Math.cos(a) * (o.r + 5), y: C.p.y - 10 + Math.sin(a) * (o.r + 5) * 0.74, vx: Math.cos(a) * 60 + (Math.random() - 0.5) * 30, vy: Math.sin(a) * 40 - 20, drag: 3, life: 0.45, col: k % 3 ? "#ffffff" : PRISM[(k * 4) % 9], size: 1, kind: "spark", glow: true }); } });
    if (o.style === "magma") for (let k = 0; k < 8; k++) C.events.push({ t: at(0.06 + k * 0.03), fn: () => { const a = from + o.dir * o.span * ((k + 1) / 8); part({ x: C.p.x + Math.cos(a) * (o.r + 6), y: C.p.y - 10 + Math.sin(a) * (o.r + 6) * 0.74, vx: Math.cos(a) * 50, vy: -20 - Math.random() * 30, g: 200, life: 0.6, col: k % 2 ? "#ffb432" : "#ff6a1a", size: 1, kind: "ember", glow: true }); } });
  }
  function fire(s, o) {
    o = Object.assign({}, o, { r: o.r * FXS, W: o.W * FXS });
    const from = o.from !== undefined ? o.from : s.a - (o.dir * o.span) / 2;
    addFx(Object.assign({ type: "fire", follow: true, a0: from, a1: from + o.dir * o.span, sq: 0.7, seed: Math.random() * 99 }, o));
    for (let k = 0; k < 16; k++) C.events.push({ t: at(0.03 + k * 0.025), fn: () => { const a = from + o.dir * o.span * Math.min(1, (k + 1) / 14); part({ x: C.p.x + Math.cos(a) * (o.r + 8), y: C.p.y - 10 + Math.sin(a) * (o.r + 8) * 0.7, vx: Math.cos(a) * 30 + (Math.random() - 0.5) * 30, vy: -30 - Math.random() * 40, g: -20, life: 0.6 + Math.random() * 0.5, col: ["#ffb63c", "#fff4b8", "#ec561c"][k % 3], size: 1, kind: "ember", glow: true }); if (k % 3 === 0) part({ x: C.p.x + Math.cos(a) * (o.r + 10), y: C.p.y - 14 + Math.sin(a) * (o.r + 10) * 0.7, vx: Math.cos(a) * 10, vy: -16, g: -6, life: 1.1, col: "#3a2a2e", size: 4, kind: "smoke" }); } });
  }
  function thrust(s, len, pal, delay) { addFx({ type: "thrust", follow: true, len: len * 1.15, pal, dur: 0.28, t0: C.clock + (delay || 0), a: s.a }); }
  function iai(s, len, pal) { addFx({ type: "iai", x: s.x, y: s.y - 10, a: s.a, len, pal, dur: 0.7 }); }
  function jaw(s, d) { const c = aimPoint(s, d); addFx({ type: "jaw", x: c.x, y: c.y, a: s.a, dur: 0.55, pal: P.ivory }); }
  function cuts(s, d, R, dur) { const c = aimPoint(s, d); const list = []; for (let k = 0; k < 14; k++) list.push({ t: k * (dur / 14), a: Math.random() * Math.PI, ox: (Math.random() - 0.5) * R * 2, oy: (Math.random() - 0.5) * R * 1.4, len: 12 + Math.random() * 12 }); addFx({ type: "cuts", x: c.x, y: c.y, list, dur: dur + 0.25, pal: P.crimson }); }
  function smash(s, d, pal, t) { const c = aimPoint(s, d); C.events.push({ t: at(t), fn: () => { ring(c.x, c.y + 8, 56, pal, 0.55); addFx({ type: "crack", x: c.x, y: c.y + 8, dur: 1.4, ground: true, rays: Array.from({ length: 7 }, (_, k) => ({ a: (k / 7) * TAU + Math.random() * 0.5, len: 18 + Math.random() * 22, seed: Math.random() * 99 })), hot: pal === P.magma }); dust(c.x, c.y + 8, 22); for (let k = 0; k < 14; k++) part({ x: c.x, y: c.y + 4, vx: (Math.random() - 0.5) * 140, vy: -60 - Math.random() * 80, g: 280, life: 0.8, col: k % 2 ? "#ffb432" : "#3a3036", size: k % 3 ? 1 : 2, kind: "debris", glow: k % 2 === 1 }); } }); }
  function ring(x, y, r, pal, dur) { addFx({ type: "ring", x, y, r, pal, dur, ground: true }); }
  // life: roots split up out of the ground from where the blow lands, leaves fly
  function rootsAt(x, y, n, dur, a0) { addFx({ type: "roots", x, y, dur: dur || 1.2, ground: true, list: Array.from({ length: n }, (_, k) => ({ a: (a0 !== undefined ? a0 : 0) + (k / n) * TAU + (Math.random() - 0.5) * 0.6, len: 18 + Math.random() * 26, seed: Math.random() * 99, w: 3 + Math.random() * 2 })) }); dust(x, y, 6); for (let k = 0; k < 8; k++) part({ x, y, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 70, g: 260, life: 0.6, col: ["#5a3a1e", "#8a6234", "#3a2412"][k % 3], size: k % 2 + 1, kind: "debris" }); }
  function roots(s, d, t, n, sc) { const c = aimPoint(s, d); C.events.push({ t: at(t), fn: () => { const c2 = d ? aimPoint(Object.assign({}, s, { x: C.p.x, y: C.p.y }), d) : { x: C.p.x, y: C.p.y - 10 }; ring(c2.x, c2.y + 8, 50 * (sc || 1), P.life, 0.5); addFx({ type: "roots", x: c2.x, y: c2.y + 8, dur: 1.4, ground: true, list: Array.from({ length: n }, (_, k) => ({ a: (k / n) * TAU + Math.random() * 0.5, len: (26 + Math.random() * 26) * (sc || 1), seed: Math.random() * 99, w: 4 + Math.random() * 2 })) }); leaves(c2.x, c2.y, 18); dust(c2.x, c2.y + 8, 10); } }); void c; }
  function leaves(x, y, n) { for (let k = 0; k < n; k++) { const a = Math.random() * TAU; part({ x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 4, vx: Math.cos(a) * (30 + Math.random() * 70), vy: Math.sin(a) * 30 - 50 - Math.random() * 40, g: 50, drag: 1.4, life: 1 + Math.random() * 0.8, col: LEAF[k % 5], size: 2, kind: "leaf" }); } }
  C.leaves = leaves;
  // plasma: a spray of sparks in every element's colour around a white core
  function prismBurst(x, y, n) { for (let k = 0; k < n; k++) { const a = Math.random() * TAU, sp = 60 + Math.random() * 140; part({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 30, drag: 2.2, life: 0.6 + Math.random() * 0.6, col: k % 3 ? PRISM[k % 9] : "#ffffff", size: k % 4 ? 1 : 2, kind: "spark", glow: true }); } }
  function dust(x, y, n) { for (let k = 0; k < n; k++) { const a = Math.random() * TAU; part({ x: x + Math.cos(a) * 6, y: y + Math.sin(a) * 3, vx: Math.cos(a) * (40 + Math.random() * 50), vy: Math.sin(a) * 20 - 8, drag: 3, life: 0.7, col: ["#d8c8a0", "#b8a880", "#efe2c0"][k % 3], size: 2, kind: "smoke" }); } }
  function splash(x, y, n, pal) { for (let k = 0; k < n; k++) { const a = Math.random() * TAU; part({ x: x + Math.cos(a) * 14, y: y + Math.sin(a) * 10, vx: Math.cos(a) * 70, vy: Math.sin(a) * 40 - 60, g: 240, life: 0.7, col: k % 3 ? pal[3] : "#ffffff", size: 1, kind: "drop" }); } }
  function cloud(x, y, dur, sc) { addFx({ type: "cloud", x, y, dur, sc: sc || 1, seed: Math.random() * 99 }); }
  function bolt(x, y, t, big) { C.events.push({ t: at(t), fn: () => { if (window.Ambience && Ambience.sfx) Ambience.sfx("strike"); addFx({ type: "bolt", big: big ? 1 : 0, x0: x + (Math.random() - 0.5) * 16, y0: y - (big ? 70 : 46), x1: x, y1: y, dur: 0.32, seed: Math.random() * 999 }); ring(x, y + 4, 22, P.storm, 0.35); for (let k = 0; k < 10; k++) part({ x, y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 100, g: 200, life: 0.35, col: k % 2 ? "#fff4a4" : "#ffffff", size: 1, kind: "spark", glow: true }); } }); }
  function chain(s, t, n, range) { C.events.push({ t: at(t), fn: () => { let px0 = C.p.x + Math.cos(s.a) * 34, py0 = C.p.y - 10 + Math.sin(s.a) * 28; const live = C.targets.filter((d) => !d.dead).sort((a, b) => Math.hypot(a.x - px0, a.y - py0) - Math.hypot(b.x - px0, b.y - py0)).slice(0, n || 3); for (const d of live) { if (Math.hypot(d.x - px0, d.y - py0) > (range || 120)) break; addFx({ type: "bolt", x0: px0, y0: py0, x1: d.x, y1: d.y - 20, dur: 0.3, seed: Math.random() * 999, flat: true }); damage(d, { dmg: 7, stop: 0.04, shake: 0.25, shock: 1 }, 0); px0 = d.x; py0 = d.y - 20; } } }); }
  function wave(s, pal, dur) { addFx({ type: "arc", follow: false, cx: s.x - Math.cos(s.a) * 10, cy: s.y - 10 - Math.sin(s.a) * 8, a0: s.a - 0.85, a1: s.a + 0.85, r: 12, rTo: 72, W: 13, pal, dur, sq: 0.8, style: "glow", sweep: false }); for (let k = 0; k < 18; k++) C.events.push({ t: at(0.05 + k * 0.035), fn: () => { const d = 14 + k * 3.4, a = s.a + (Math.random() - 0.5) * 1.6; part({ x: s.x + Math.cos(a) * d, y: s.y - 10 + Math.sin(a) * d * 0.8, vx: Math.cos(a) * 30, vy: -30 - Math.random() * 30, g: 120, life: 0.8, col: k % 2 ? "#baffef" : "#c8a8ff", size: 1, kind: "mote", glow: true }); } }); }
  function star(x, y, t) { C.events.push({ t: at(t - 0.16), fn: () => addFx({ type: "star", x, y, dur: 0.6 }) }); C.events.push({ t: at(t), fn: () => { ring(x, y + 3, 18, P.star, 0.4); for (let k = 0; k < 8; k++) part({ x, y, vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 70, g: 120, life: 0.6, col: k % 2 ? "#ffe8a2" : "#c8b4ff", size: 1, kind: "star4", glow: true }); } }); }
  function bloom(s, d, t) { const c = aimPoint(s, d); C.events.push({ t: at(t), fn: () => { addFx({ type: "bloom", x: c.x, y: c.y + 4, dur: 0.9, seed: Math.random() * 99 }); for (let k = 0; k < 30; k++) { const a = Math.random() * TAU; part({ x: c.x, y: c.y, vx: Math.cos(a) * (40 + Math.random() * 70), vy: Math.sin(a) * 40 - 60, g: -30, drag: 1.5, life: 0.9 + Math.random() * 0.5, col: ["#ffb63c", "#fff4b8", "#ec561c", "#ffd27a"][k % 4], size: 1, kind: "ember", glow: true }); } for (let k = 0; k < 24; k++) part({ x: c.x + (Math.random() - 0.5) * 30, y: c.y - Math.random() * 10, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 60, g: -30, drag: 0.8, life: 1 + Math.random() * 0.8, col: ["#ffb63c", "#ec561c", "#fff4b8"][k % 3], size: 1, kind: "ember", glow: true }); } }); }
  function punch(s) { const c = aimPoint(s, 16); for (let k = 0; k < 10; k++) part({ x: c.x, y: c.y, vx: Math.cos(s.a) * 80 + (Math.random() - 0.5) * 60, vy: Math.sin(s.a) * 60 - 40, g: 260, life: 0.5, col: ["#8a7a68", "#c8b890", "#4a3e3a"][k % 3], size: k % 2 + 1, kind: "debris" }); }
  function stomp(s) { ring(s.x, s.y, 30, P.stone, 0.4); dust(s.x, s.y, 14); C.shake = Math.min(1, C.shake + 0.4); }
  function spikes(s, n, d0, t0, step) { for (let k = 0; k < n; k++) { const d = d0 + k * (step || 0); const c = { x: s.x + Math.cos(s.a) * d, y: s.y + Math.sin(s.a) * d * 0.8 }; spikeAt(c.x, c.y, t0 + k * 0.06, 14 + (k % 2) * 4); } }
  function spikeAt(x, y, t, h) { C.events.push({ t: at(t), fn: () => { addFx({ type: "spike", x, y, h, w: 5 + h * 0.25, dur: 0.85, seed: Math.random() * 99 }); for (let k = 0; k < 5; k++) part({ x, y, vx: (Math.random() - 0.5) * 70, vy: -40 - Math.random() * 60, g: 260, life: 0.5, col: ["#8a7a68", "#c8b890", "#4a3e3a"][k % 3], size: 1, kind: "debris" }); } }); }
  // Kākau: a stamped ground sigil — rings of niho manō (shark-tooth) triangles, a spiral and
  // petroglyph figures — that ignites, spins and fades
  function sigil(x, y, r, dur, big) { addFx({ type: "sigil", x, y, r, dur, big, ground: true, rot: Math.random() * TAU }); }
  function glyphs(s, n, t) { for (let k = 0; k < n; k++) C.events.push({ t: at(t + k * 0.04), fn: () => { const a = s.a + (k - (n - 1) / 2) * 0.35; addFx({ type: "glyph", x: C.p.x + Math.cos(a + Math.PI) * 6, y: C.p.y - 22, vx: Math.cos(a) * 140, vy: Math.sin(a) * 110 - 10, dur: 0.5, kind: k % 4 }); } }); }
  // ---- storm: forked branches off a slash, and the Tempest — a wide storm front that rains lightning
  function forks(s, n, len, t) { C.events.push({ t: at(t), fn: () => { for (let k = 0; k < n; k++) { const a = s.a + (k - (n - 1) / 2) * 0.55, x0 = C.p.x + Math.cos(a) * 24, y0 = C.p.y - 10 + Math.sin(a) * 20; addFx({ type: "bolt", flat: true, x0, y0, x1: x0 + Math.cos(a) * len, y1: y0 + Math.sin(a) * len * 0.8, dur: 0.26, seed: Math.random() * 999 }); hitCircle(s, 0, { at: { x: x0 + Math.cos(a) * len, y: y0 + Math.sin(a) * len * 0.8 }, r: 16, dmg: 5, stop: 0.02, shake: 0.15, shock: 1, quiet: 1 }); } } }); }
  function tempest(s) {
    const c = aimPoint(s, 70), Wd = 220, Hd = 130;
    addFx({ type: "darken", x: c.x, y: c.y, dur: 1.6, ground: false });
    for (let k = 0; k < 9; k++) cloud(c.x + (k % 3 - 1) * 70 + (Math.random() - 0.5) * 30, c.y - 60 + Math.floor(k / 3) * 34 - 30 + (Math.random() - 0.5) * 12, 1.55, 1.3 + Math.random() * 0.6);
    for (let k = 0; k < 60; k++) C.events.push({ t: at(0.25 + Math.random() * 1.0), fn: () => part({ x: c.x + (Math.random() - 0.5) * Wd * 1.2, y: c.y - 70 + Math.random() * 40, vx: 60, vy: 260, life: 0.45, col: "#9cbaff", size: 1, kind: "rain" }) });
    const strikes = 14;
    for (let k = 0; k < strikes; k++) {
      const t = 0.3 + k * 0.07 + Math.random() * 0.05;
      // aim most strikes at targets in the storm, the rest scatter across it
      let x = c.x + (Math.random() - 0.5) * Wd, y = c.y + (Math.random() - 0.5) * Hd;
      const live = C.targets.filter((d) => !d.dead && Math.abs(d.x - c.x) < Wd * 0.7 && Math.abs(d.y - c.y) < Hd);
      if (live.length && k % 2 === 0) { const d = live[(k / 2) % live.length | 0]; x = d.x + (Math.random() - 0.5) * 8; y = d.y - 12; }
      bolt(x, y, t, k % 3 === 0);
      hitCircle(s, t, { at: { x, y }, r: 22, dmg: 9, stop: 0.05, shake: 0.5, flash: 0.35, shock: 1, quiet: 1 });
    }
    C.events.push({ t: at(1.25), fn: () => { bolt(c.x, c.y, 0, true); ring(c.x, c.y + 4, 90, P.storm, 0.6); hitCircle(s, 0, { at: c, r: 80, dmg: 22, stop: 0.14, shake: 1, flash: 0.7, shock: 1 }); } });
  }
  // ---- bioluminescence: brush-stroke ribbons in the sea cave's palette, and the vortex finisher
  function biolum(s, o) {
    o = Object.assign({ sq: 0.74 }, o, { r: o.r * FXS, W: o.W * FXS });
    const from = s.a - (o.dir * o.span) / 2;
    addFx(Object.assign({ type: "biolum", follow: true, a0: from, a1: from + o.dir * o.span, seed: Math.random() * 99 }, o));
    for (let k = 0; k < 18; k++) C.events.push({ t: at(0.04 + k * 0.022), fn: () => { const a = from + o.dir * o.span * Math.min(1, (k + 1) / 16), rr = o.r + (Math.random() - 0.3) * o.W; part({ x: C.p.x + Math.cos(a) * rr, y: C.p.y - 10 + Math.sin(a) * rr * o.sq, vx: Math.cos(a) * 20 + (Math.random() - 0.5) * 20, vy: -14 - Math.random() * 24, g: -10, drag: 1.2, life: 0.9 + Math.random() * 0.6, col: GLOWC[(Math.random() * GLOWC.length) | 0], size: 1, kind: "mote", glow: true }); } });
  }
  const GLOWC = ["#baffef", "#8ce6ff", "#d6b4ff", "#ffffff", "#5af2e8"];
  function vortex(s) {
    const c = aimPoint(s, 44);
    addFx({ type: "vortex", x: c.x, y: c.y, dur: 1.3, seed: Math.random() * 99, ground: false });
    addFx({ type: "vglow", x: c.x, y: c.y, dur: 1.3, ground: true });
    for (let k = 0; k < 70; k++) C.events.push({ t: at(0.1 + Math.random() * 1.0), fn: () => { const a = Math.random() * TAU, r = 10 + Math.random() * 60; part({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r * 0.6, vx: -Math.sin(a) * 40, vy: Math.cos(a) * 24 - 30, g: -20, drag: 0.8, life: 1 + Math.random() * 0.8, col: GLOWC[k % GLOWC.length], size: k % 6 ? 1 : 2, kind: "mote", glow: true }); } });
    for (let k = 0; k < 5; k++) hitCircle(s, 0.18 + k * 0.16, { at: c, r: 62, dmg: 9, stop: 0.05, shake: 0.35, quiet: k % 2 });
    C.events.push({ t: at(1.0), fn: () => { ring(c.x, c.y + 2, 100, P.glow, 0.6); C.flash = 0.5; C.flashCol = "150,240,255"; splash(c.x, c.y, 40, P.glow); hitCircle(s, 0, { at: c, r: 80, dmg: 24, stop: 0.13, shake: 0.9 }); } });
  }
  // ---- celestial: constellation lines behind slashes; the Heavens finisher
  function constellation(s, dir, t) { C.events.push({ t: at(t), fn: () => { const pts = []; for (let k = 0; k < 6; k++) { const a = s.a - dir * 1.3 + dir * k * 0.52, r = 40 + (K.hash2(k, 3, C.clock * 9) - 0.5) * 22; pts.push([C.p.x + Math.cos(a) * r, C.p.y - 10 + Math.sin(a) * r * 0.75]); } addFx({ type: "const", pts, dur: 0.9 }); } }); }
  function heavens(s) {
    const c = aimPoint(s, 58);
    addFx({ type: "darken", x: c.x, y: c.y, dur: 1.7, tint: "20,8,48" });
    addFx({ type: "celsigil", x: c.x, y: c.y + 4, dur: 1.65, ground: true, rot: Math.random() * TAU });
    const ring8 = []; for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; ring8.push([c.x + Math.cos(a) * 62, c.y + 4 + Math.sin(a) * 34]); }
    C.events.push({ t: at(0.1), fn: () => addFx({ type: "const", pts: ring8.concat([ring8[0]]), dur: 1.4, big: 1 }) });
    for (let k = 0; k < 14; k++) { const a = Math.random() * TAU, d = 14 + Math.random() * 58, x = c.x + Math.cos(a) * d, y = c.y + Math.sin(a) * d * 0.55; meteor(x, y, 0.35 + k * 0.045); hitCircle(s, 0.35 + k * 0.045 + 0.2, { at: { x, y }, r: 18, dmg: 6, stop: 0.03, shake: 0.3, quiet: 1 }); }
    C.events.push({ t: at(0.95), fn: () => { addFx({ type: "pillar", x: c.x, y: c.y, dur: 0.75 }); ring(c.x, c.y + 4, 110, P.star, 0.7); ring(c.x, c.y + 4, 70, P.star, 0.5); C.flash = 0.8; C.flashCol = "240,230,255"; hitCircle(s, 0, { at: c, r: 86, dmg: 34, stop: 0.18, shake: 1, flash: 0.6 }); for (let k = 0; k < 40; k++) { const a = Math.random() * TAU; part({ x: c.x, y: c.y - 10, vx: Math.cos(a) * (60 + Math.random() * 120), vy: Math.sin(a) * 70 - 40, g: 60, drag: 1.4, life: 1 + Math.random() * 0.6, col: k % 3 ? "#ffe8a2" : "#c8b4ff", size: 1, kind: "star4", glow: true }); } if (window.Ambience && Ambience.sfx) Ambience.sfx("celHit"); } });
  }
  function meteor(x, y, t) { C.events.push({ t: at(t), fn: () => addFx({ type: "meteor", x, y, dur: 0.5, dx: -40 - Math.random() * 30 }) }); C.events.push({ t: at(t + 0.2), fn: () => { ring(x, y + 2, 16, P.star, 0.35); for (let k = 0; k < 6; k++) part({ x, y, vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 60, g: 120, life: 0.5, col: k % 2 ? "#ffe8a2" : "#ffffff", size: 1, kind: "star4", glow: true }); if (window.Ambience && Ambience.sfx && Math.random() < 0.5) Ambience.sfx("chime"); } }); }
  // ---- Kākau: ember bursts, a niho band spiralling round the body, and the Awakening finisher
  function embers(x, y, n) { for (let k = 0; k < n; k++) { const a = Math.random() * TAU; part({ x, y, vx: Math.cos(a) * (30 + Math.random() * 60), vy: Math.sin(a) * 30 - 50, g: -20, drag: 1.5, life: 0.7 + Math.random() * 0.5, col: ["#f2b45e", "#c4422a", "#fff2cc"][k % 3], size: 1, kind: "ember", glow: true }); } }
  function band(x, y, dur) { addFx({ type: "band", follow: true, dur, seed: Math.random() * 99 }); }
  function awaken(s) {
    addFx({ type: "darken", dur: 1.6, tint: "40,10,4" });
    sigil(s.x, s.y, 74, 1.55, 1);
    band(s.x, s.y, 1.5);
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; C.events.push({ t: at(0.25 + k * 0.06), fn: () => { addFx({ type: "kpillar", x: C.p.x + Math.cos(a) * 62, y: C.p.y + Math.sin(a) * 34, dur: 1.1, h: 46 + (k % 2) * 16 }); if (window.Ambience && Ambience.sfx) Ambience.sfx("drum"); } }); }
    addFx({ type: "orbit", follow: true, dur: 1.5, seed: Math.random() * 99 });
    for (let k = 0; k < 4; k++) hitCircle(s, 0.3 + k * 0.15, { x: 0, y: 0, r: 74, dmg: 8, stop: 0.04, shake: 0.35, quiet: 1 });
    C.events.push({ t: at(1.05), fn: () => { ring(C.p.x, C.p.y, 120, P.kakau, 0.6); ring(C.p.x, C.p.y, 80, P.kakau, 0.45); C.flash = 0.6; C.flashCol = "255,170,90"; embers(C.p.x, C.p.y - 10, 50); addFx({ type: "crack", x: C.p.x, y: C.p.y, dur: 1.4, ground: true, rays: Array.from({ length: 10 }, (_, k) => ({ a: (k / 10) * TAU, len: 50 + Math.random() * 30, seed: Math.random() * 99 })), hot: true }); hitCircle(s, 0, { x: 0, y: 0, r: 96, dmg: 30, stop: 0.16, shake: 1, flash: 0.4 }); } });
  }
  // ---- chain sickle: path(u) -> [angle offset from aim, radius]; hits follow the hook
  function chainSwing(s, dur, path, spin, long, spiral) {
    C.fx = C.fx.filter((q) => q.type !== "chain");          // only one sickle on the chain
    const f = addFx({ type: "chain", follow: true, dur, path, a: s.a, spin, long, spiral });
    const step = spiral ? 0.04 : 0.035;
    for (let t = 0.03; t < dur; t += step) C.events.push({ t: at(t), fn: () => {
      const [da, r] = path(t / dur), a = s.a + da * spin, hx = C.p.x + Math.cos(a) * r, hy = C.p.y - 10 + Math.sin(a) * r * 0.8;
      for (const d of C.targets) { if (d.dead || (d._chainT && C.clock - d._chainT < (spiral ? 0.16 : 0.22))) continue; if (Math.hypot(d.x - hx, (d.y - 12 - hy) / 0.85) < 18) { d._chainT = C.clock; damage(d, { dmg: spiral ? 7 : long ? 12 : 9, stop: 0.04, shake: 0.25, quiet: 0 }, a); } }
      if (spiral && Math.random() < 0.4) part({ x: hx, y: hy, vx: -Math.sin(a) * 40, vy: Math.cos(a) * 30, life: 0.3, col: "#d6f6ff", size: 1, kind: "spark", glow: true });
    } });
  }
  function splinters(x, y) { for (let k = 0; k < 10; k++) part({ x, y, vx: (Math.random() - 0.5) * 140, vy: -50 - Math.random() * 80, g: 280, life: 0.7, col: ["#c8a060", "#8a6030", "#e8d0a0", "#6a5e56"][k % 4], size: k % 3 ? 1 : 2, kind: "debris" }); }
  function impact(x, y, w, crit) { addFx({ type: "impact", x, y, dur: crit ? 0.26 : 0.18, col: w.col, crit, rot: Math.random() * 3 }); }

  // ---------------------------------------------------------------- API
  C.init = function () {
    for (const w of WEAPONS) {
      w.spr = mkSprite(w.id);
      const [ic, ix] = K.canvas(28, 28);
      ix.imageSmoothingEnabled = false;
      ix.translate(14, 14); ix.rotate(-Math.PI / 4);
      ix.drawImage(w.spr.c, -15, -7);
      w.icon = ic;
    }
  };
  C.setTargets = (list) => { C.targets = list || []; };
  // The super charges from the damage you deal with the weapon in hand (training dummies count): three
  // diamonds fill as you hit, and a full charge turns your next combo finisher into the super. Each weapon
  // sets how much damage a full charge takes (ultCost), so heavy hitters don't charge faster than they should.
  C.SURGE = 3;
  C.ULT_COST = 150;
  function chargeUp(dmg) {
    const ww = C.swing ? C.swing.w : WEAPONS[C.cur]; if (!ww || !ww.ult || C.ultT > C.clock - (ww.ult.dur || 1.5)) return;
    const was = ww.charge || 0; ww.charge = Math.min(C.SURGE, was + (dmg * C.SURGE) / (ww.ultCost || C.ULT_COST));
    if (was < C.SURGE && ww.charge >= C.SURGE) { C.readyT = C.clock; sfx("ultReady"); }
  }
  // ---- Momentum: chaining hits on enemies without getting hurt builds it (tiers I-III: harder,
  // faster hits). It drains if you stop fighting and is knocked down when you take a hit.
  C.momentum = 0; C.momT = -9;
  C.momTier = () => (C.momentum >= 100 ? 3 : C.momentum >= 66 ? 2 : C.momentum >= 33 ? 1 : 0);
  C.loseMomentum = (f) => { C.momentum *= f; };
  // ---- weapon locks: only a few basic Hawaiian weapons until you find the rest (all free in the dojo)
  // Inventory and loadout: every weapon you own is in C.unlocked; up to five of them are equipped in
  // C.loadout, and only those are switched between (Q/R, wheel, 1-5). In the dojo every rack weapon is
  // free to try.
  C.LOADOUT_MAX = 5;
  C.unlocked = new Set(["spear", "pahoa"]);
  C.loadout = ["spear", "pahoa"];
  C.allUnlocked = false;
  const idOf = (i) => WEAPONS[i] && WEAPONS[i].id, indexOf = (id) => WEAPONS.findIndex((w) => w.id === id);
  C.indexOf = indexOf;
  // in Hale Koa every weapon on the rack (C.openList) can be taken down and swung; elsewhere, your five
  C.isOpen = (i) => (C.allUnlocked && (!C.openList || C.openList.includes(i))) || C.loadout.includes(idOf(i));
  C.ensureOpen = () => { C.loadout = C.loadout.filter((id) => C.unlocked.has(id)); if (!C.loadout.length) C.loadout = [...C.unlocked].slice(0, C.LOADOUT_MAX); if (!C.isOpen(C.cur)) C.cur = Math.max(0, indexOf(C.loadout[0])); };
  // a new weapon goes into the inventory, and straight into the loadout while there's room
  C.gain = (id) => { if (indexOf(id) < 0) return false; const isNew = !C.unlocked.has(id); C.unlocked.add(id); if (!C.loadout.includes(id) && C.loadout.length < C.LOADOUT_MAX) C.loadout.push(id); return isNew; };
  C.attack = () => { C.queued = 0.3; };
  const switched = () => { C.switchT = C.clock; window.Ambience && Ambience.sfx && Ambience.sfx("equip"); };
  C.cycle = (d) => {
    if (C.move) return;
    if (C.allUnlocked) { let i = C.cur; for (let k = 0; k < WEAPONS.length; k++) { i = (i + d + WEAPONS.length) % WEAPONS.length; if (C.isOpen(i)) break; } C.cur = i; return switched(); }
    const L = C.loadout; if (L.length < 2) return;
    const k = L.indexOf(idOf(C.cur)); C.cur = indexOf(L[((k < 0 ? 0 : k) + d + L.length) % L.length]); switched();
  };
  C.select = (i) => { if (C.move || i < 0 || i >= WEAPONS.length || !C.isOpen(i)) return; C.cur = i; switched(); };
  C.selectSlot = (k) => { const id = C.loadout[k]; if (id) C.select(indexOf(id)); };

  function facingAngle(p) { return p.dir === "down" ? Math.PI / 2 : p.dir === "up" ? -Math.PI / 2 : p.dir === "left" ? Math.PI : 0; }
  function dirFromAngle(a) { const c = Math.cos(a), s = Math.sin(a); return Math.abs(c) > Math.abs(s) * 0.9 ? (c > 0 ? "side" : "left") : s > 0 ? "down" : "up"; }

  C.update = function (dt, p, tryMove) {
    C.p = p; C.local = p;
    C.clock += dt;
    C.shake = Math.max(0, C.shake - dt * 2.2);
    C.flash = Math.max(0, C.flash - dt * 4);
    if (C.queued > 0) C.queued -= dt;
    const w = WEAPONS[C.cur];
    // start or chain a move
    if (C.queued > 0 && (!C.move || C.moveT > C.move.dur * 0.62)) {
      const idx = C.move ? (C.moveIdx + 1) % w.moves.length : C.comboGap > 0 ? (C.moveIdx + 1) % w.moves.length : 0;
      C.queued = 0;
      let m = w.moves[idx];
      const finale = idx === w.moves.length - 1;
      if (finale && w.ult && (w.charge || 0) >= C.SURGE) { m = w.ult; w.charge = 0; C.ultT = C.clock; C.ultName = w.ult.name; }
      C.swing = { final: finale && m !== w.ult, counted: false, w };
      let a = facingAngle(p);
      let best = null, bd = 120;
      for (const d of C.targets) { if (C.immune(d)) continue; const dx = d.x - p.x, dy = d.y - p.y, dist = Math.hypot(dx, dy); let da = Math.atan2(dy, dx) - a; da = Math.atan2(Math.sin(da), Math.cos(da)); if (dist < bd && Math.abs(da) < 1.4) { bd = dist; best = Math.atan2(dy, dx); } }
      if (best !== null) a = best;
      p.dir = dirFromAngle(a);
      C.move = m; C.moveIdx = idx; C.moveT = 0; C.aim = a;
      C.powNow = powOf(w); m.start({ x: p.x, y: p.y, a, p });
      if (C.onMoveStart) C.onMoveStart(C.cur, m === w.ult ? -1 : idx, a);
    }
    if (C.move) {
      const m = C.move, t0 = C.moveT;
      C.moveT += dt * (1 + 0.1 * C.momTier());          // momentum quickens your swings
      // lunge: ease-out over the first 40% of the move
      const l0 = easeOut(t0 / (m.dur * 0.4)), l1 = easeOut(C.moveT / (m.dur * 0.4));
      const step = (l1 - l0) * (m.lunge || 0);
      if (step !== 0) tryMove(Math.cos(C.aim) * step, Math.sin(C.aim) * step * 0.85);
      if (m.path) { const [f0, s0] = m.path(Math.min(1, t0 / m.dur)), [f1, s1] = m.path(Math.min(1, C.moveT / m.dur)), df = f1 - f0, ds = s1 - s0, ca = Math.cos(C.aim), sa = Math.sin(C.aim); tryMove(ca * df - sa * ds, (sa * df + ca * ds) * 0.85); }
      if (m.dash && C.moveT < m.dur * 0.4) C.after.push({ x: p.x, y: p.y, dir: p.dir, t0: C.clock, ghost: true });
      if (C.moveT >= m.dur) { C.move = null; C.comboGap = 0.45; }
    } else if (C.comboGap > 0) { C.comboGap -= dt; if (C.comboGap <= 0) C.moveIdx = -1; }
    C.busy = !!C.move;
    // scheduled hits / spawns
    for (let i = C.events.length - 1; i >= 0; i--) if (C.clock >= C.events[i].t) { const e = C.events[i]; C.events.splice(i, 1); e.fn(); }
    C.fx = C.fx.filter((f) => C.clock - f.t0 < f.dur);
    for (let i = C.parts.length - 1; i >= 0; i--) {
      const q = C.parts[i];
      q.age += dt;
      if (q.age >= q.max) { C.parts.splice(i, 1); continue; }
      if (q.drag) { q.vx *= Math.exp(-q.drag * dt); q.vy *= Math.exp(-q.drag * dt); }
      q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt;
    }
    C.after = C.after.filter((a) => C.clock - a.t0 < (a.long ? 0.42 : 0.3));
    C.nums = C.nums.filter((n) => C.clock - n.t0 < 0.9);
    if (C.clock - C.comboT > 1.6) C.combo = 0;
    if (C.clock - C.momT > 2.4) C.momentum = Math.max(0, C.momentum - dt * 14);
    // dummies: springy wobble, flash, respawn
    for (const d of C.targets) {
      d.angV += (-d.ang * 60 - d.angV * 7) * dt; d.ang += d.angV * dt;
      d.flash = Math.max(0, d.flash - dt);
      if (d.dead && !d.enemy && C.clock > d.respawn) { d.dead = false; d.hp = d.max; d.pop = C.clock; }
    }
  };

  // ---------------------------------------------------------------- drawing
  function pathPoly(ctx, pts) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fill(); }
  function pathLine(ctx, pts, w, col) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke(); }
  function prof(u) { return 1.98 * Math.pow(u, 1.25) * Math.pow(1 - u, 0.28); }
  function star4(ctx, x, y, r, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x - r), Math.round(y), r * 2 + 1, 1); ctx.fillRect(Math.round(x), Math.round(y - r), 1, r * 2 + 1); if (r > 1) ctx.fillRect(Math.round(x - 1), Math.round(y - 1), 3, 3); }
  function glowDot(g, x, y, r, col, a) { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  const hexRGB = (h) => `${parseInt(h.slice(1, 3), 16)},${parseInt(h.slice(3, 5), 16)},${parseInt(h.slice(5, 7), 16)}`;

  // crescent ribbon around (cx, cy): returns polygon for width factor f and outward offset
  function ribbon(cx, cy, r, aT, aH, W, sq, f, off, opts) {
    const N = Math.max(8, Math.ceil((Math.abs(aH - aT) * (r + 10)) / 2.2));
    const outer = [], inner = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = aT + (aH - aT) * u;
      let w = W * prof(u) * f;
      const rr = r + (opts.grow || 0) * u;
      let ro = rr + w * 0.78 + off * W, ri = rr - w * 0.34 + off * W;
      if (opts.jag && f > 0.9 && i % 2 === 1) ro += Math.min(3, w * 0.4);
      if (opts.noise) { const n = K.noise(u * 7 + opts.seed + f * 3, opts.t * 3 + f); ro += (n - 0.5) * w * 0.7; ri += (n - 0.5) * w * 0.3; }
      outer.push([cx + Math.cos(a) * ro, cy + Math.sin(a) * ro * sq]);
      inner.push([cx + Math.cos(a) * ri, cy + Math.sin(a) * ri * sq]);
    }
    return outer.concat(inner.reverse());
  }
  function edgePts(cx, cy, r, aT, aH, W, sq, k, u0, opts) {
    const N = Math.max(6, Math.ceil((Math.abs(aH - aT) * (r + 10)) / 2.5)), pts = [];
    for (let i = Math.floor(N * u0); i <= N; i++) { const u = i / N, a = aT + (aH - aT) * u, rr = r + (opts.grow || 0) * u + W * prof(u) * k; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sq]); }
    return pts;
  }

  function drawArc(f, ctx, g, ox, oy, age) {
    const p = age / f.dur;
    let cx, cy;
    if (f.follow) { cx = (f.p || C.p).x - ox; cy = (f.p || C.p).y - 10 - oy; } else { cx = f.cx - ox; cy = f.cy - oy; }
    let aH, aT, W = f.W, r = f.r;
    if (f.sweep === false) { aT = f.a0; aH = f.a1; r = f.r + (f.rTo - f.r) * easeOut(p); W = f.W * (1 - easeIn(p)); }
    else { aH = f.a0 + (f.a1 - f.a0) * easeOut(p / 0.5); aT = f.a0 + (f.a1 - f.a0) * easeIn((p - 0.1) / 0.9); W *= 1 - Math.max(0, p - 0.55) * 1.4; }
    if (W <= 0.6 || Math.abs(aH - aT) < 0.02) return;
    const pal = f.pal, sq = f.sq, opts = { grow: f.grow, jag: f.style === "jag", noise: f.style === "water" || f.style === "glow", seed: f.t0 * 7, t: age };
    if (f.tilt) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(f.tilt); ctx.translate(-cx, -cy); }
    const L = [[1.3, 0, pal[0]], [1.0, 0, pal[1]], [0.74, 0.12, pal[2]], [0.44, 0.26, pal[3]]];
    if (f.style === "thin") L.splice(1, 1);
    for (const [k, off, col] of L) { ctx.fillStyle = col; pathPoly(ctx, ribbon(cx, cy, r, aT, aH, W, sq, k, off, opts)); }
    pathLine(ctx, edgePts(cx, cy, r, aT, aH, W, sq, 0.62, 0.4, opts), f.style === "thin" ? 0.9 : 1.3, pal[4]);
    // style flourishes
    const headA = aH, hx = cx + Math.cos(headA) * (r + (f.grow || 0)), hy = cy + Math.sin(headA) * (r + (f.grow || 0)) * sq;
    if (f.style === "water" || f.style === "glow") {
      // ukiyo-e wave curls riding the outer edge
      for (const u of [0.32, 0.56, 0.8]) {
        const a = aT + (aH - aT) * u, w = W * prof(u), rr = r + (f.grow || 0) * u + w * 0.9;
        const bx = cx + Math.cos(a) * rr, by = cy + Math.sin(a) * rr * sq;
        const sp = [];
        for (let k = 0; k <= 14; k++) { const t = k / 14, ang = a + Math.sign(f.a1 - f.a0) * (t * 5.2 - 1.2), rad = (1 - t) * Math.max(2.2, w * 0.55); sp.push([bx + Math.cos(ang) * rad, by + Math.sin(ang) * rad * 0.9]); }
        pathLine(ctx, sp, 2.6, pal[1]); pathLine(ctx, sp, 1.2, pal[4]);
      }
    }
    if (f.style === "elec") {
      const pts = [], N = 16, seed = Math.floor(age * 30);
      for (let k = 0; k <= N; k++) { const u = k / N, a = aT + (aH - aT) * u, rr = r + W * prof(u) * 0.3 + (K.hash2(k, seed, 3) - 0.5) * 8; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sq]); }
      pathLine(ctx, pts, 1.6, pal[3]); pathLine(ctx, pts, 0.8, "#ffffff");
      glowDot(g, hx, hy, 18, "200,220,255", 0.5);
    }
    if (f.style === "star") {
      for (let k = 0; k < 6; k++) { const u = 0.15 + k * 0.15, a = aT + (aH - aT) * u, rr = r + W * prof(u) * (0.2 + 0.7 * K.hash2(k, 7, f.t0 * 9)); const sx = cx + Math.cos(a) * rr, sy = cy + Math.sin(a) * rr * sq; const tw = Math.sin(age * 30 + k) > 0 ? 2 : 1; star4(ctx, sx, sy, tw, k % 2 ? "#ffe8a2" : "#ffffff"); glowDot(g, sx, sy, 6, "255,232,162", 0.35); }
      glowDot(g, hx, hy, 22, "170,146,242", 0.45);
    }
    if (f.style === "glow") { for (let k = 0; k < 4; k++) { const u = 0.3 + k * 0.2, a = aT + (aH - aT) * u; glowDot(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r * sq, 20, k % 2 ? "34,204,226" : "160,120,255", 0.4); } }
    if (f.style === "magma") glowDot(g, hx, hy, 24, "255,140,40", 0.5);
    if (f.style === "life") glowDot(g, hx, hy, 22, "150,230,100", 0.45);
    if (f.style === "plasma") {
      // a prismatic fringe outside the white blade: every element's colour in turn, flickering
      for (let band = 0; band < 3; band++) { const pts = [], N = 18; for (let k = 0; k <= N; k++) { const u = k / N, a = aT + (aH - aT) * u, rr = r + W * prof(u) * (0.55 + band * 0.18) + (K.hash2(k, band, Math.floor(age * 24)) - 0.5) * 2; pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sq]); } pathLine(ctx, pts, 1, PRISM[(band * 3 + Math.floor(age * 18)) % 9]); }
      glowDot(g, hx, hy, 30, "255,255,255", 0.6); glowDot(g, cx + Math.cos((aH + aT) / 2) * r, cy + Math.sin((aH + aT) / 2) * r * sq, 40, "200,210,255", 0.3);
    }
    if (f.style === "niho") {
      const N = 9;
      for (let k = 1; k < N; k++) {
        const u = k / N, a = aT + (aH - aT) * u, w = W * prof(u); if (w < 2) continue;
        const rr = r + w * 0.2, bx = cx + Math.cos(a) * rr, by = cy + Math.sin(a) * rr * sq, s2 = Math.min(3.5, w * 0.45);
        ctx.fillStyle = k % 2 ? pal[0] : pal[4];
        pathPoly(ctx, [[bx - Math.sin(a) * s2, by + Math.cos(a) * s2 * sq], [bx + Math.cos(a) * s2 * 1.6, by + Math.sin(a) * s2 * 1.6 * sq], [bx + Math.sin(a) * s2, by - Math.cos(a) * s2 * sq]]);
      }
      glowDot(g, hx, hy, 18, "242,150,80", 0.45);
    }
    if (f.style === "plain" || f.style === "jag") glowDot(g, hx, hy, 12, hexRGB(pal[3]), 0.35);
    if (f.tilt) ctx.restore();
  }

  // painterly flame ribbon: bristly layered strokes, licks peeling off the outer edge, hot core
  function drawFire(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, cx = (f.p || C.p).x - ox, cy = (f.p || C.p).y - 10 - oy, sq = f.sq;
    const aH = f.a0 + (f.a1 - f.a0) * easeOut(p / 0.45), aT = f.a0 + (f.a1 - f.a0) * easeIn((p - 0.08) / 0.92);
    const W = f.W * (1 - Math.max(0, p - 0.5) * 1.6);
    if (W <= 0.6) return;
    const pal = P.fire, opts = { noise: true, seed: f.seed, t: age };
    const layers = [[1.45, -0.02, pal[0]], [1.15, 0, pal[1]], [0.9, 0.1, pal[2]], [0.62, 0.22, pal[3]], [0.3, 0.36, pal[4]]];
    for (let li = 0; li < layers.length; li++) { const [k, off, col] = layers[li]; opts.seed = f.seed + li * 3.3; ctx.fillStyle = col; pathPoly(ctx, ribbon(cx, cy, f.r, aT, aH, W, sq, k, off, opts)); }
    // bristle streaks: broken lines along the stroke, like a dry brush
    for (let b = 0; b < 5; b++) {
      const kk = -0.1 + b * 0.22, seg = edgePts(cx, cy, f.r, aT, aH, W, sq, kk, 0.2, {});
      for (let i = 0; i + 2 < seg.length; i += 4) if (K.hash2(i, b, Math.floor(f.seed)) > 0.35) pathLine(ctx, seg.slice(i, i + 3), 0.8, b % 2 ? pal[4] : pal[3]);
    }
    // flame licks peeling backward off the outer edge
    const dirS = Math.sign(f.a1 - f.a0);
    for (let k = 0; k < 7; k++) {
      const u = 0.18 + k * 0.11; if (u > 0.95) break;
      const a = aT + (aH - aT) * u, w = W * prof(u), rr = f.r + w * 0.75;
      const bx = cx + Math.cos(a) * rr, by = cy + Math.sin(a) * rr * sq;
      const flick = Math.sin(age * 24 + k * 1.7);
      const L = (3 + w * 0.9) * (0.7 + 0.3 * flick);
      const ta = a - dirS * 0.9 + flick * 0.2;
      const tip = [bx + Math.cos(a) * L * 0.6 + Math.cos(ta) * L * 0.6, by + (Math.sin(a) * L * 0.6 + Math.sin(ta) * L * 0.6) * sq - L * 0.25];
      const nx = -Math.sin(a), ny = Math.cos(a) * sq, bw = Math.max(1.2, w * 0.22);
      ctx.fillStyle = pal[0]; pathPoly(ctx, [[bx - nx * (bw + 1), by - ny * (bw + 1)], [tip[0], tip[1] - 1], [bx + nx * (bw + 1), by + ny * (bw + 1)]]);
      ctx.fillStyle = k % 2 ? pal[2] : pal[3]; pathPoly(ctx, [[bx - nx * bw, by - ny * bw], tip, [bx + nx * bw, by + ny * bw]]);
    }
    const hx = cx + Math.cos(aH) * f.r, hy = cy + Math.sin(aH) * f.r * sq;
    glowDot(g, hx, hy, 30, "255,150,50", 0.55); glowDot(g, cx, cy, 36, "255,110,40", 0.25 * (1 - p));
  }

  // Axe-kick eruption: a scorch mark, a molten pool, and a crown of flame tongues. Each tongue is
  // a curling brush stroke that tapers to a point (dark red rim -> orange -> yellow -> white-hot
  // core), swaying with its own flicker and licking upward before it dies down.
  function drawBloom(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x - ox, y = f.y - oy, pal = P.fire;
    const rise = easeOut(p / 0.22), fall = 1 - easeIn((p - 0.45) / 0.55), life = rise * fall;
    // scorched ground + molten pool
    ctx.fillStyle = "#1a0a08"; ctx.beginPath(); ctx.ellipse(x, y + 2, 30 * rise, 11 * rise, 0, 0, TAU); ctx.fill();
    if (life > 0.05) for (const [k, col] of [[1, pal[1]], [0.72, pal[2]], [0.45, pal[3]], [0.2, pal[4]]]) { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x, y + 1, 22 * k * life, 7 * k * life, 0, 0, TAU); ctx.fill(); }
    if (life <= 0.02) return;
    const N = 13, tongues = [];
    for (let k = 0; k < N; k++) {
      const h1 = K.hash2(k, 1, f.seed), h2 = K.hash2(k, 2, f.seed), h3 = K.hash2(k, 3, f.seed);
      const ang = (k / N) * TAU + h1 * 0.4, rr = 4 + h2 * 15;
      tongues.push({ bx: x + Math.cos(ang) * rr, by: y + Math.sin(ang) * rr * 0.4, depth: Math.sin(ang), H: (22 + h3 * 30) * (1 - rr / 40), W: 3 + h1 * 3, ph: h2 * 9, lean: (Math.cos(ang) * 0.35) });
    }
    tongues.sort((a, b) => a.depth - b.depth);
    for (const tg of tongues) {
      const flick = 0.85 + 0.15 * Math.sin(age * 22 + tg.ph), H = tg.H * life * flick;
      if (H < 2) continue;
      const pts = [];
      for (let i = 0; i <= 9; i++) {
        const u = i / 9;
        const sway = Math.sin(age * 9 + tg.ph + u * 3.4) * 4 * u + tg.lean * H * u;
        pts.push([tg.bx + sway + Math.sin(u * Math.PI) * 1.5, tg.by - H * u]);
      }
      // layered tapered stroke: each layer narrower, hotter, and shorter
      const layers = [[1.0, 1.0, pal[0]], [0.8, 0.94, pal[1]], [0.6, 0.82, pal[2]], [0.38, 0.62, pal[3]], [0.18, 0.4, pal[4]]];
      for (const [ws, hs, col] of layers) {
        const n = Math.max(2, Math.round(9 * hs));
        for (let i = 0; i < n; i++) {
          const u = i / 9, w = Math.max(0.8, tg.W * 2 * ws * (1 - u * 0.95) * (0.6 + 0.4 * life));
          pathLine(ctx, [pts[i], pts[i + 1]], w, col);
        }
      }
    }
    // heat haze highlight + glow
    glowDot(g, x, y - 14, 70, "255,130,40", 0.65 * life);
    glowDot(g, x, y - 4, 34, "255,220,140", 0.5 * life);
  }

  function drawThrust(f, ctx, g, ox, oy, age) {
    if (age < 0) return;
    const p = age / f.dur, cx = (f.p || C.p).x - ox, cy = (f.p || C.p).y - 10 - oy, a = f.a, ux = Math.cos(a), uy = Math.sin(a) * 0.85, nx = -uy, ny = ux;
    const ext = f.len * easeOut(p / 0.35) * (1 - easeIn((p - 0.6) / 0.4) * 0.4), w = 7 * (1 - easeIn((p - 0.4) / 0.6));
    if (w <= 0.3) return;
    const s0 = 8, tipx = cx + ux * ext, tipy = cy + uy * ext;
    for (const [k, col] of [[1.4, f.pal[0]], [1.0, f.pal[1]], [0.62, f.pal[2]], [0.3, f.pal[3]]]) { ctx.fillStyle = col; pathPoly(ctx, [[cx + ux * s0 + nx * w * k * 0.3, cy + uy * s0 + ny * w * k * 0.3], [tipx - ux * 10 + nx * w * k, tipy - uy * 10 + ny * w * k], [tipx + ux * 3 * k, tipy + uy * 3 * k], [tipx - ux * 10 - nx * w * k, tipy - uy * 10 - ny * w * k], [cx + ux * s0 - nx * w * k * 0.3, cy + uy * s0 - ny * w * k * 0.3]]); }
    pathLine(ctx, [[cx + ux * 12, cy + uy * 12], [tipx, tipy]], 0.9, f.pal[4]);
    for (let k = -2; k <= 2; k++) { if (!k) continue; const o = k * 6, L0 = ext * (0.3 + 0.15 * Math.abs(k)); pathLine(ctx, [[cx + ux * L0 + nx * o, cy + uy * L0 + ny * o], [cx + ux * (L0 + 14) + nx * o, cy + uy * (L0 + 14) + ny * o]], 0.8, f.pal[3]); }
    if (p > 0.25 && p < 0.6) { ctx.strokeStyle = f.pal[4]; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(tipx, tipy, 4 + p * 14, (4 + p * 14) * 0.6, a, 0, TAU); ctx.stroke(); }
    glowDot(g, tipx, tipy, 16, hexRGB(f.pal[3]), 0.5);
  }

  function drawIai(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x0 = f.x - ox, y0 = f.y - oy, ux = Math.cos(f.a), uy = Math.sin(f.a) * 0.85, nx = -uy, ny = ux;
    const x1 = x0 + ux * f.len, y1 = y0 + uy * f.len;
    if (p < 0.22) { const e = easeOut(p / 0.22); pathLine(ctx, [[x0, y0], [x0 + (x1 - x0) * e, y0 + (y1 - y0) * e]], 1, "#ffffff"); }
    else if (p < 0.42) {
      const q = (p - 0.22) / 0.2, w = 6 * Math.sin(q * Math.PI);
      ctx.fillStyle = f.pal[1]; pathPoly(ctx, [[x0, y0], [(x0 + x1) / 2 + nx * (w + 2), (y0 + y1) / 2 + ny * (w + 2)], [x1, y1], [(x0 + x1) / 2 - nx * (w + 2), (y0 + y1) / 2 - ny * (w + 2)]]);
      ctx.fillStyle = f.pal[3]; pathPoly(ctx, [[x0, y0], [(x0 + x1) / 2 + nx * w, (y0 + y1) / 2 + ny * w], [x1, y1], [(x0 + x1) / 2 - nx * w, (y0 + y1) / 2 - ny * w]]);
      pathLine(ctx, [[x0, y0], [x1, y1]], 1.4, "#ffffff");
      glowDot(g, (x0 + x1) / 2, (y0 + y1) / 2, f.len * 0.7, "200,240,255", 0.6 * Math.sin(q * Math.PI));
    } else {
      const q = (p - 0.42) / 0.58, sp = 2 + q * 10, sh = (1 - q);
      for (const sgn of [1, -1]) { const ex = nx * sp * sgn, ey = ny * sp * sgn; pathLine(ctx, [[x0 + ux * f.len * q * 0.3 + ex, y0 + uy * f.len * q * 0.3 + ey], [x1 + ex, y1 + ey]], Math.max(0.6, 1.4 * sh), sgn > 0 ? f.pal[3] : f.pal[2]); }
      for (let k = 0; k < 4; k++) { const t = 0.2 + k * 0.2; star4(ctx, x0 + (x1 - x0) * t + nx * (K.hash2(k, 3, f.x) - 0.5) * 16, y0 + (y1 - y0) * t + ny * (K.hash2(k, 4, f.x) - 0.5) * 16, sh > 0.5 ? 2 : 1, "#ffffff"); }
    }
  }

  function drawJaw(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x - ox, y = f.y - oy, pal = f.pal;
    const open = p < 0.45 ? 1 - easeIn(p / 0.45) * 0.85 : 0.15, fade = p > 0.6 ? 1 - (p - 0.6) / 0.4 : 1;
    if (fade <= 0) return;
    const R = 18, ang = f.a;
    for (const sgn of [-1, 1]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(ang + Math.PI / 2); ctx.translate(0, sgn * (4 + open * 14));
      const pts = []; for (let k = 0; k <= 16; k++) { const t = k / 16, a = Math.PI * (0.15 + 0.7 * t); pts.push([Math.cos(a) * R * -sgn * 0 + (t - 0.5) * R * 2, -sgn * Math.sin(a) * 8 * fade]); }
      const inner = pts.map(([px0, py0], k) => [px0, py0 + sgn * (k % 2 ? 4 : 1.5) * fade]);
      ctx.fillStyle = pal[0]; pathPoly(ctx, pts.map(([a, b]) => [a, b - sgn * 1.5]).concat(inner.slice().reverse().map(([a, b]) => [a, b + sgn * 1.5])));
      ctx.fillStyle = pal[2]; pathPoly(ctx, pts.concat(inner.slice().reverse()));
      ctx.fillStyle = pal[4]; for (let k = 1; k < 16; k += 2) { const [a, b] = inner[k]; pathPoly(ctx, [[a - 1.4, b - sgn * 3], [a + 1.4, b - sgn * 3], [a, b + sgn * 1]]); }
      ctx.restore();
    }
    if (p > 0.4 && p < 0.6) glowDot(g, x, y, 30, "240,240,220", 0.6);
  }

  function drawCuts(f, ctx, g, ox, oy, age) {
    const x = f.x - ox, y = f.y - oy;
    for (const c of f.list) {
      const a = age - c.t; if (a < 0 || a > 0.25) continue;
      const q = a / 0.25, L = c.len * (q < 0.3 ? q / 0.3 : 1), w = q < 0.3 ? 2 : 1;
      const ux = Math.cos(c.a), uy = Math.sin(c.a);
      const cx = x + c.ox, cy = y + c.oy;
      pathLine(ctx, [[cx - ux * L / 2, cy - uy * L / 2], [cx + ux * L / 2, cy + uy * L / 2]], w + 1, f.pal[0]);
      pathLine(ctx, [[cx - ux * L / 2, cy - uy * L / 2], [cx + ux * L / 2, cy + uy * L / 2]], w, q < 0.35 ? "#ffffff" : q < 0.7 ? f.pal[3] : f.pal[2]);
      if (q < 0.2) glowDot(g, cx, cy, 10, "255,120,130", 0.5);
    }
  }

  function drawRing(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, r = f.r * easeOut(p), th = Math.max(0.6, 4 * (1 - p));
    ctx.strokeStyle = f.pal[0]; ctx.lineWidth = th + 1.5; ctx.beginPath(); ctx.ellipse(f.x - ox, f.y - oy, r, r * 0.5, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = f.pal[3]; ctx.lineWidth = th; ctx.beginPath(); ctx.ellipse(f.x - ox, f.y - oy, r, r * 0.5, 0, 0, TAU); ctx.stroke();
  }
  function drawCrack(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, fade = 1 - easeIn((p - 0.5) / 0.5);
    for (const ray of f.rays) {
      const pts = [[f.x - ox, f.y - oy]]; let x = f.x - ox, y = f.y - oy, a = ray.a;
      const L = ray.len * easeOut(p / 0.15);
      for (let k = 1; k <= 6; k++) { a += (K.hash2(k, 1, ray.seed) - 0.5) * 0.9; x += Math.cos(a) * L / 6; y += Math.sin(a) * L / 6 * 0.5; pts.push([x, y]); }
      pathLine(ctx, pts, 2.2 * fade + 0.4, "#120a0a");
      if (f.hot && fade > 0.2) pathLine(ctx, pts.slice(0, 5), 0.9, p < 0.4 ? "#ffcc4a" : "#e2521a");
    }
    if (f.hot) glowDot(g, f.x - ox, f.y - oy, 30, "255,120,40", 0.45 * fade);
  }
  // roots: knotted tendrils of bark bursting up and out along the ground, sprouting leaves, then sinking
  function drawRoots(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, grow = easeOut(p / 0.18), sink = p > 0.7 ? 1 - easeIn((p - 0.7) / 0.3) : 1;
    for (const rt of f.list) {
      const pts = []; let x = f.x - ox, y = f.y - oy, a = rt.a; const L = rt.len * grow;
      for (let k = 0; k <= 7; k++) { if (k) { a += (K.hash2(k, 2, rt.seed) - 0.5) * 0.8; x += Math.cos(a) * L / 7; y += Math.sin(a) * L / 7 * 0.5; } pts.push([x, y - Math.sin((k / 7) * Math.PI) * 7 * sink * grow]); }
      for (let k = 0; k < 7; k++) { const w = Math.max(0.6, rt.w * (1 - k / 8) * sink); pathLine(ctx, [pts[k], pts[k + 1]], w + 1.6, "#1e120a"); pathLine(ctx, [pts[k], pts[k + 1]], w, "#5a3a1e"); pathLine(ctx, [[pts[k][0], pts[k][1] - w * 0.3], [pts[k + 1][0], pts[k + 1][1] - w * 0.3]], Math.max(0.5, w * 0.35), "#8a6234"); }
      if (sink > 0.4) for (let k = 2; k < 7; k += 2) { const q = pts[k], s2 = K.hash2(k, 5, rt.seed) > 0.5 ? 1 : -1; ctx.fillStyle = LEAF[(k + (rt.seed | 0)) % 5]; ctx.fillRect(Math.round(q[0] + s2 * 2), Math.round(q[1] - 2), 2, 1); ctx.fillRect(Math.round(q[0] + s2 * 3), Math.round(q[1] - 3), 1, 1); }
    }
    glowDot(g, f.x - ox, f.y - oy, 34, "150,230,100", 0.3 * (1 - p));
  }
  // Wildwood's crown: a great tangle of roots heaving up in the middle, throwing off leaves
  function drawGrove(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x - ox, y = f.y - oy, h = 44 * easeOut(p / 0.25) * (p > 0.6 ? 1 - easeIn((p - 0.6) / 0.4) : 1);
    if (h < 1) return;
    for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + f.seed, bx = x + Math.cos(a) * 10, by = y + Math.sin(a) * 5, pts = []; for (let j = 0; j <= 6; j++) { const u = j / 6; pts.push([bx + Math.cos(a) * u * 12 + Math.sin(u * 5 + k) * 3, by - u * h]); } pathLine(ctx, pts, 6 - k % 3, "#1e120a"); pathLine(ctx, pts, 4 - k % 3, "#5a3a1e"); pathLine(ctx, pts.map(([a2, b2]) => [a2 - 1, b2]), 1, "#8a6234"); }
    for (let k = 0; k < 26; k++) { const a = K.hash2(k, 1, f.seed) * TAU, rr = 6 + K.hash2(k, 2, f.seed) * 18; ctx.fillStyle = LEAF[k % 5]; ctx.fillRect(Math.round(x + Math.cos(a) * rr), Math.round(y - h + Math.sin(a) * rr * 0.6), 2, 2); }
    glowDot(g, x, y - h * 0.6, 60, "170,240,120", 0.5 * (1 - p));
  }
  // plasma: the fissure a split leaves in the ground, white-hot with every colour at its edges
  function drawFissure(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, L = f.len * easeOut(p / 0.12), fade = 1 - easeIn((p - 0.45) / 0.55), ux = Math.cos(f.a), uy = Math.sin(f.a) * 0.8;
    const pts = []; for (let k = 0; k <= 14; k++) { const u = k / 14, j = (K.hash2(k, 3, f.seed) - 0.5) * 7; pts.push([f.x - ox + ux * L * u - uy * j, f.y - oy + uy * L * u + ux * j]); }
    pathLine(ctx, pts, 4 * fade + 1, "#120a1e");
    pathLine(ctx, pts, 2.6 * fade + 0.4, PRISM[Math.floor(age * 20) % 9]);
    pathLine(ctx, pts, 1.2 * fade + 0.2, "#ffffff");
  }
  function drawFissureGlow(f, ctx, g, ox, oy, age) { const p = age / f.dur, L = f.len * easeOut(p / 0.12); for (let k = 0; k <= 5; k++) glowDot(g, f.x - ox + Math.cos(f.a) * L * k / 5, f.y - oy + Math.sin(f.a) * L * 0.8 * k / 5, 26, k % 2 ? "220,230,255" : "255,255,255", 0.55 * (1 - p)); if (p < 0.5 && Math.random() < 0.7) part({ x: f.x + Math.cos(f.a) * L * Math.random(), y: f.y + Math.sin(f.a) * L * 0.8 * Math.random(), vx: (Math.random() - 0.5) * 20, vy: -50 - Math.random() * 50, life: 0.6, col: Math.random() < 0.5 ? "#ffffff" : PRISM[(Math.random() * 9) | 0], size: 1, kind: "spark", glow: true }); }
  // the Twin Suns: two white suns wheeling round you, each trailing a ribbon of light
  function drawSuns(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, cx = (f.p || C.p).x - ox, cy = (f.p || C.p).y - 12 - oy, R0 = 26 + 10 * Math.sin(p * Math.PI);
    for (const sg of [0, Math.PI]) {
      const pts = []; for (let k = 0; k < 14; k++) { const a = age * 11 + sg - k * 0.16; pts.push([cx + Math.cos(a) * R0, cy + Math.sin(a) * R0 * 0.6]); }
      for (let k = 0; k < pts.length - 1; k++) pathLine(ctx, [pts[k], pts[k + 1]], 5 * (1 - k / 14) + 0.5, k < 3 ? "#ffffff" : PRISM[(k + Math.floor(age * 12)) % 9]);
      const [sx, sy] = pts[0]; ctx.fillStyle = "#1c1838"; ctx.beginPath(); ctx.arc(sx, sy, 5, 0, TAU); ctx.fill(); ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(sx, sy, 3.6, 0, TAU); ctx.fill();
      glowDot(g, sx, sy, 34, "255,255,255", 0.8); glowDot(g, sx, sy, 60, "200,200,255", 0.3);
    }
  }
  function drawPring(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, r = f.r * easeOut(p), th = Math.max(0.6, 5 * (1 - p));
    ctx.strokeStyle = "#120a1e"; ctx.lineWidth = th + 1.5; ctx.beginPath(); ctx.ellipse(f.x - ox, f.y - oy, r, r * 0.5, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = f.col; ctx.lineWidth = th; ctx.beginPath(); ctx.ellipse(f.x - ox, f.y - oy, r, r * 0.5, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(0.5, th * 0.3); ctx.beginPath(); ctx.ellipse(f.x - ox, f.y - oy, r, r * 0.5, 0, 0, TAU); ctx.stroke();
  }
  // the nova: a white star that swallows the screen's centre, with spokes of every colour
  function drawNova(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x - ox, y = f.y - 14 - oy, R = 30 + 140 * easeOut(p), fade = 1 - easeIn(p);
    for (let k = 0; k < 18; k++) { const a = (k / 18) * TAU + age * 0.8, L = R * (0.6 + 0.4 * K.hash2(k, 1, 7)); pathLine(ctx, [[x + Math.cos(a) * 10, y + Math.sin(a) * 6], [x + Math.cos(a) * L, y + Math.sin(a) * L * 0.6]], 2.4 * fade + 0.3, PRISM[k % 9]); pathLine(ctx, [[x + Math.cos(a) * 10, y + Math.sin(a) * 6], [x + Math.cos(a) * L * 0.7, y + Math.sin(a) * L * 0.42]], 1 * fade + 0.2, "#ffffff"); }
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.ellipse(x, y, 26 * fade + 4, 16 * fade + 3, 0, 0, TAU); ctx.fill();
    glowDot(g, x, y, R * 1.2, "255,255,255", 0.9 * fade); glowDot(g, x, y, R * 0.6, "220,220,255", 0.8 * fade);
  }
  // the ground sigil under the nova: rings of every element, turning, with lua (twin) crescents
  function drawPsigil(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x - ox, y = f.y - oy, s = easeOut(p / 0.2), fade = 1 - easeIn((p - 0.5) / 0.5), rot = f.rot + age * 0.9;
    PRISM.forEach((col, k) => { const r = (30 + k * 10) * s; ctx.strokeStyle = col; ctx.globalAlpha = fade; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, TAU); ctx.stroke(); });
    for (let k = 0; k < 8; k++) { const a = rot + (k / 8) * TAU, r0 = 30 * s, r1 = 116 * s; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.5); ctx.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.5); ctx.stroke(); const cxx = x + Math.cos(a) * r1 * 0.8, cyy = y + Math.sin(a) * r1 * 0.4; ctx.beginPath(); ctx.arc(cxx, cyy, 4, a, a + Math.PI); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  function drawSpike(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x - ox, y = f.y - oy;
    const rise = p < 0.18 ? easeOut(p / 0.18) * 1.12 : p < 0.26 ? 1.12 - (p - 0.18) / 0.08 * 0.12 : p < 0.72 ? 1 : 1 - easeIn((p - 0.72) / 0.28);
    if (rise <= 0) return;
    const h = f.h * rise, w = f.w, lean = (K.hash2(1, 2, f.seed) - 0.5) * 4;
    const tip = [x + lean, y - h];
    ctx.fillStyle = P.stone[0]; pathPoly(ctx, [[x - w - 1, y + 1], [tip[0], tip[1] - 1], [x + w + 1, y + 1]]);
    ctx.fillStyle = P.stone[3]; pathPoly(ctx, [[x - w, y], tip, [x + w * 0.1, y]]);
    ctx.fillStyle = P.stone[1]; pathPoly(ctx, [[x + w * 0.1, y], tip, [x + w, y]]);
    ctx.fillStyle = P.stone[2]; pathPoly(ctx, [[x - w * 0.55, y - h * 0.15], [tip[0] - 0.5, tip[1] + h * 0.25], [x - w * 0.05, y - h * 0.1]]);
    ctx.fillStyle = P.stone[4]; ctx.fillRect(Math.round(tip[0] - 1), Math.round(tip[1] + 1), 1, 2);
    ctx.fillStyle = P.stone[0]; ctx.fillRect(Math.round(x - w * 0.4), Math.round(y - h * 0.5), 2, 1);
  }
  function drawCloud(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, s = easeOut(p / 0.25) * (1 - easeIn((p - 0.75) / 0.25)) * (f.sc || 1), x = f.x - ox + Math.sin(age * 1.3 + f.seed) * 3, y = f.y - oy;
    if (s <= 0) return;
    const puffs = [[-14, 2, 8], [-6, -3, 10], [5, -4, 11], [15, 1, 8], [0, 4, 9], [-20, 5, 5], [21, 5, 5]];
    const lit = C.fx.some((b) => b.type === "bolt" && !b.flat && C.clock - b.t0 < 0.07 && Math.abs(b.x1 - f.x) < 90);
    for (const [k, col] of [[1.15, "#0c0c1c"], [1, lit ? "#3a3a6c" : "#2a2a48"], [0.7, lit ? "#585e94" : "#3e3e66"], [0.38, lit ? "#7a82bc" : "#4e4e7a"]]) { ctx.fillStyle = col; for (const [dx, dy, r] of puffs) { ctx.beginPath(); ctx.ellipse(x + dx * s, y + dy * s - (k < 0.9 ? 2 : 0), r * s * k, r * s * k * 0.7, 0, 0, TAU); ctx.fill(); } }
    if (lit) glowDot(g, x, y, 40, "200,210,255", 0.6);
  }
  function drawBolt(f, ctx, g, ox, oy, age) {
    const p = age / f.dur; if (p > 1) return;
    const seed = f.seed + Math.floor(age * 40), x0 = f.x0 - ox, y0 = f.y0 - oy, x1 = f.x1 - ox, y1 = f.y1 - oy;
    const N = f.big ? 14 : 9, pts = [];
    const nx = -(y1 - y0), ny = x1 - x0, nl = Math.hypot(nx, ny) || 1;
    for (let k = 0; k <= N; k++) { const t = k / N, j = k === 0 || k === N ? 0 : (K.hash2(k, 1, seed) - 0.5) * (f.big ? 18 : 12); pts.push([x0 + (x1 - x0) * t + (nx / nl) * j, y0 + (y1 - y0) * t + (ny / nl) * j]); }
    const w = p < 0.3 ? 1 : 1 - (p - 0.3) / 0.7;
    const bw = f.big ? 1.8 : 1;
    pathLine(ctx, pts, (3.4 * w + 0.6) * bw, "#2a2a6a"); pathLine(ctx, pts, (2.2 * w + 0.4) * bw, "#9cbaff"); pathLine(ctx, pts, f.big ? 2 : 1, "#ffffff");
    if (!f.flat && p < 0.25) { ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.ellipse(x1, y1 + 2, 10 * bw, 4 * bw, 0, 0, TAU); ctx.fill(); }
    for (let b = 2; b < N - 1; b += 3) { const [bx, by] = pts[b], a = Math.atan2(y1 - y0, x1 - x0) + (K.hash2(b, 2, seed) > 0.5 ? 0.8 : -0.8); pathLine(ctx, [[bx, by], [bx + Math.cos(a) * 7, by + Math.sin(a) * 7], [bx + Math.cos(a + 0.4) * 11, by + Math.sin(a + 0.4) * 11]], 1, "#fff4a4"); }
    glowDot(g, x1, y1, 36, "200,220,255", 0.8 * w); glowDot(g, (x0 + x1) / 2, (y0 + y1) / 2, 30, "160,190,255", 0.5 * w);
  }
  function drawStar(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x - ox, y = f.y - oy;
    if (p < 0.27) { const q = p / 0.27, sy = y - 70 * (1 - q), sx = x - 24 * (1 - q); pathLine(ctx, [[sx - 16 * (1 - q * 0.5), sy - 46 * (1 - q * 0.5)], [sx, sy]], 1.6, "#aa92f2"); pathLine(ctx, [[sx - 8, sy - 22], [sx, sy]], 1, "#ffffff"); star4(ctx, sx, sy, 2, "#fff8d8"); glowDot(g, sx, sy, 14, "255,232,162", 0.7); }
    else { const q = (p - 0.27) / 0.73, r = 2 + q * 8; star4(ctx, x, y, Math.max(1, Math.round(4 * (1 - q))), q < 0.5 ? "#ffffff" : "#ffe8a2"); ctx.strokeStyle = "#aa92f2"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, r * 1.6, r, 0, 0, TAU); ctx.stroke(); glowDot(g, x, y, 26 * (1 - q) + 6, "220,200,255", 0.7 * (1 - q)); }
  }
  function drawImpact(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x - ox, y = f.y - oy, n = f.crit ? 10 : 7;
    for (let k = 0; k < n; k++) { const a = f.rot + (k / n) * TAU, r0 = 3 + p * 8, r1 = r0 + (f.crit ? 12 : 8) * (1 - p); pathLine(ctx, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0], [x + Math.cos(a) * r1, y + Math.sin(a) * r1]], k % 2 ? 1 : 1.6, k % 2 ? f.col : "#ffffff"); }
    if (p < 0.4) star4(ctx, x, y, f.crit ? 4 : 3, "#ffffff");
    glowDot(g, x, y, f.crit ? 30 : 18, hexRGB(f.col), 0.6 * (1 - p));
  }

  function niho(ctx, cx, cy, r, n, rot, sq, size, colA, colB, out) {
    for (let k = 0; k < n; k++) {
      const a = rot + (k / n) * TAU, a2 = rot + ((k + 1) / n) * TAU;
      const p1 = [cx + Math.cos(a) * r, cy + Math.sin(a) * r * sq], p2 = [cx + Math.cos(a2) * r, cy + Math.sin(a2) * r * sq];
      const am = (a + a2) / 2, tip = [cx + Math.cos(am) * (r + size * (out ? 1 : -1)), cy + Math.sin(am) * (r + size * (out ? 1 : -1)) * sq];
      ctx.fillStyle = k % 2 ? colA : colB; pathPoly(ctx, [p1, tip, p2]);
    }
  }
  // tiny petroglyph figure (kiʻi pōhaku): a stick person with arms raised
  function kii(ctx, x, y, s, col) {
    pathLine(ctx, [[x, y - 3 * s], [x, y + 2 * s]], 1, col);
    pathLine(ctx, [[x - 3 * s, y - 3 * s], [x - 2 * s, y - 1 * s], [x + 2 * s, y - 1 * s], [x + 3 * s, y - 3 * s]], 1, col);
    pathLine(ctx, [[x - 2 * s, y + 4 * s], [x, y + 2 * s], [x + 2 * s, y + 4 * s]], 1, col);
    ctx.fillStyle = col; ctx.fillRect(Math.round(x - 1), Math.round(y - 5 * s), 2, 2);
  }
  function drawSigil(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x - ox, y = f.y - oy, R = f.r * easeOut(p / 0.25), fade = 1 - easeIn((p - 0.6) / 0.4);
    if (fade <= 0) return;
    const rot = f.rot + age * (f.big ? 1.6 : 2.4), pal = P.kakau, hot = fade > 0.5;
    const sq = 0.55;
    ctx.strokeStyle = pal[0]; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.ellipse(x, y, R, R * sq, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = hot ? pal[3] : pal[2]; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, R, R * sq, 0, 0, TAU); ctx.stroke();
    niho(ctx, x, y, R - 1, f.big ? 24 : 12, rot, sq, f.big ? 6 : 4, hot ? pal[3] : pal[2], pal[0], false);
    if (f.big) {
      niho(ctx, x, y, R * 0.62, 16, -rot * 1.3, sq, 4, pal[0], hot ? pal[2] : pal[1], true);
      ctx.strokeStyle = hot ? pal[3] : pal[2]; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x, y, R * 0.62, R * 0.62 * sq, 0, 0, TAU); ctx.stroke();
      // spiral at the heart and kiʻi figures dancing around the band
      const sp = []; for (let k = 0; k <= 30; k++) { const t = k / 30, a = rot * 2 + t * TAU * 2, rr = t * R * 0.4; sp.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * sq]); }
      pathLine(ctx, sp, 1.4, hot ? pal[4] : pal[3]);
      for (let k = 0; k < 6; k++) { const a = -rot * 0.8 + (k / 6) * TAU; kii(ctx, x + Math.cos(a) * R * 0.8, y + Math.sin(a) * R * 0.8 * sq - 2, 1, hot ? pal[4] : pal[3]); }
    } else {
      pathLine(ctx, [[x - R * 0.45, y], [x + R * 0.45, y]], 1, pal[3]);
      pathLine(ctx, [[x, y - R * 0.45 * sq], [x, y + R * 0.45 * sq]], 1, pal[3]);
    }
    glowDot(g, x, y, R * 1.3, "242,150,80", 0.5 * fade);
  }
  function drawGlyph(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x + f.vx * age - ox, y = f.y + f.vy * age - oy, pal = P.kakau;
    const col = p < 0.6 ? pal[4] : pal[3];
    ctx.fillStyle = pal[0]; ctx.fillRect(Math.round(x - 4), Math.round(y - 4), 9, 9);
    ctx.fillStyle = pal[2]; ctx.fillRect(Math.round(x - 3), Math.round(y - 3), 7, 7);
    if (f.kind === 0) kii(ctx, x, y + 0.5, 0.7, col);
    else if (f.kind === 1) { ctx.fillStyle = col; pathPoly(ctx, [[x - 3, y + 2], [x, y - 3], [x + 3, y + 2]]); }
    else if (f.kind === 2) { pathLine(ctx, [[x - 3, y - 2], [x - 1, y + 2], [x + 1, y - 2], [x + 3, y + 2]], 1, col); }
    else { ctx.strokeStyle = col; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, TAU); ctx.stroke(); ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
    glowDot(g, x, y, 10, "242,180,94", 0.5 * (1 - p));
  }

  // cave palette: night blue / teal / violet, 8 levels each (same as the sea cave pool)
  const BIO = [
    ["#04081a", "#081230", "#0e2256", "#163a88", "#2460ba", "#4696de", "#8ccef4", "#def6ff"],
    ["#040c14", "#081c2c", "#0e3448", "#165a6c", "#26888c", "#4ebaac", "#96e2ce", "#e2faec"],
    ["#0a0618", "#180e36", "#2e1a60", "#4c2c92", "#7448c4", "#a674e6", "#d6aaf6", "#f6e2ff"],
  ];
  // brush-stroke ribbon: rows of short strokes following the arc, light running along them
  function strokeRibbon(ctx, g, cx, cy, r, aT, aH, W, sq, age, seed, bright) {
    const span = aH - aT, len = Math.abs(span) * (r + W * 0.4);
    if (len < 2) return;
    const rows = Math.max(3, Math.round(W / 2.2));
    for (let b = 0; b < rows; b++) {
      const v = b / (rows - 1) - 0.4;                     // across the ribbon (outer edge brighter)
      const N = Math.max(4, Math.ceil(len / 5));
      for (let k = 0; k < N; k++) {
        const u0 = k / N, u1 = Math.min(1, u0 + (0.6 + 0.5 * K.hash2(k, b, seed)) / N);
        const w0 = W * prof(u0), w1 = W * prof(u1);
        if (w0 < 1.2 && w1 < 1.2) continue;
        if (Math.abs(v) * 2 > (w0 / W) * 2.1 + 0.15) continue;
        const a0 = aT + span * u0, a1 = aT + span * u1, r0 = r + v * w0, r1 = r + v * w1;
        const x0 = cx + Math.cos(a0) * r0, y0 = cy + Math.sin(a0) * r0 * sq, x1 = cx + Math.cos(a1) * r1, y1 = cy + Math.sin(a1) * r1 * sq;
        const fam = K.hash2(k >> 1, b, seed) < 0.5 ? 0 : K.hash2(k, b + 7, seed) < 0.55 ? 1 : 2;
        let lv = 3 + Math.round((0.4 - Math.abs(v)) * 4) + (K.hash2(k, b, seed + 3) > 0.7 ? 1 : 0);
        const pulse = ((u0 * 3 - age * 4 + b * 0.13) % 1 + 1) % 1;     // light flowing along the strokes
        if (pulse < 0.18) lv += 2; else if (pulse < 0.34) lv += 1;
        lv = Math.min(7, lv + (bright || 0));
        pathLine(ctx, [[x0, y0], [x1, y1]], 2.6, BIO[fam][Math.max(0, lv - 4)]);
        pathLine(ctx, [[x0, y0], [x1, y1]], 1.4, BIO[fam][lv]);
        if (lv >= 6 && K.hash2(k, b, seed + 11) > 0.6) glowDot(g, (x0 + x1) / 2, (y0 + y1) / 2, 9, fam === 2 ? "200,150,255" : "120,230,255", 0.35);
      }
    }
  }
  function drawBiolum(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, cx = (f.p || C.p).x - ox, cy = (f.p || C.p).y - 10 - oy;
    const aH = f.a0 + (f.a1 - f.a0) * easeOut(p / 0.45), aT = f.a0 + (f.a1 - f.a0) * easeIn((p - 0.12) / 0.88);
    const W = f.W * (1 - Math.max(0, p - 0.55) * 1.5);
    if (W <= 1) return;
    strokeRibbon(ctx, g, cx, cy, f.r, aT, aH, W, f.sq, age, f.seed, p < 0.3 ? 1 : 0);
    const hx = cx + Math.cos(aH) * f.r, hy = cy + Math.sin(aH) * f.r * f.sq;
    glowDot(g, hx, hy, 34, "90,230,240", 0.55); glowDot(g, cx, cy, 50, "120,90,255", 0.18 * (1 - p));
    star4(ctx, hx, hy, 2, "#ffffff");
  }
  function drawVglow(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x - ox, y = f.y - oy, fade = Math.sin(Math.PI * Math.min(1, p));
    // the ground floods with the cave's glowing water: ellipse rings of light
    for (let k = 0; k < 4; k++) { const r = (20 + k * 18) * easeOut(p / 0.3); ctx.strokeStyle = BIO[k % 3][3 + (k === 0 ? 2 : 0)]; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, TAU); ctx.stroke(); }
    glowDot(g, x, y, 110, "60,180,230", 0.45 * fade);
  }
  function drawVortex(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x - ox, y = f.y - oy;
    const R = 72 * easeOut(p / 0.35) * (p > 0.78 ? 1 + (p - 0.78) * 1.5 : 1), fade = p > 0.8 ? 1 - (p - 0.8) / 0.2 : 1;
    if (fade <= 0) return;
    const rot = age * 5.5 + f.seed;
    // spiral arms made of brush strokes, like the great swirl in the cave pool
    for (let arm = 0; arm < 4; arm++) {
      const base = rot + (arm / 4) * TAU;
      for (let ring_ = 0; ring_ < 3; ring_++) {
        const r0 = R * (0.18 + ring_ * 0.27), sp = 2.2 - ring_ * 0.4;
        strokeRibbon(ctx, g, x, y, r0, base + ring_ * 0.6, base + ring_ * 0.6 + sp * (0.6 + 0.4 * fade), 9 + ring_ * 4, 0.55, age, f.seed + arm * 13 + ring_, 0);
      }
    }
    // a bright eye in the centre and an upward fountain
    for (let k = 0; k < 3; k++) { ctx.strokeStyle = BIO[k][6 - k]; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(x, y, 4 + k * 4 + Math.sin(age * 9) * 1.5, (4 + k * 4) * 0.55, 0, 0, TAU); ctx.stroke(); }
    glowDot(g, x, y, R * 1.4, "70,200,240", 0.55 * fade); glowDot(g, x, y - 10, R * 0.8, "170,120,255", 0.35 * fade);
  }
  function drawDarken(f, ctx, g, ox, oy, age) {
    // handled as a screen tint (see C.darken), nothing to draw here
  }
  function drawConst(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, n = f.pts.length, shown = Math.min(n, 1 + Math.floor(easeOut(p / 0.4) * (n - 1) + 0.0001)), fade = 1 - easeIn((p - 0.6) / 0.4);
    if (fade <= 0) return;
    for (let k = 0; k < shown - 1; k++) { const [x0, y0] = f.pts[k], [x1, y1] = f.pts[k + 1]; pathLine(ctx, [[x0 - ox, y0 - oy], [x1 - ox, y1 - oy]], f.big ? 1.4 : 1, fade > 0.5 ? "#d6c8ff" : "#8a72d2"); }
    for (let k = 0; k < shown; k++) { const [x, y] = f.pts[k]; const tw = Math.sin(age * 14 + k * 2) > 0; star4(ctx, x - ox, y - oy, f.big ? (tw ? 3 : 2) : (tw ? 2 : 1), k % 2 ? "#ffe8a2" : "#ffffff"); glowDot(g, x - ox, y - oy, f.big ? 18 : 10, "230,220,255", 0.5 * fade); }
  }
  function drawCelsigil(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x - ox, y = f.y - oy, R = 70 * easeOut(p / 0.25), fade = 1 - easeIn((p - 0.75) / 0.25), rot = f.rot + age * 1.2, sq = 0.55;
    if (fade <= 0) return;
    const pal = P.star;
    for (const [rr, w, col] of [[R, 2.4, pal[1]], [R, 1, pal[3]], [R * 0.82, 1, pal[2]], [R * 0.5, 1, pal[3]]]) { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(x, y, rr, rr * sq, 0, 0, TAU); ctx.stroke(); }
    // runic ticks between the rings, rotating
    for (let k = 0; k < 24; k++) { const a = rot + (k / 24) * TAU, r0 = R * 0.84, r1 = R * (k % 3 ? 0.92 : 0.98); pathLine(ctx, [[x + Math.cos(a) * r0, y + Math.sin(a) * r0 * sq], [x + Math.cos(a) * r1, y + Math.sin(a) * r1 * sq]], 1, k % 3 ? pal[2] : pal[3]); }
    // eight-pointed compass star
    for (let k = 0; k < 8; k++) { const a = -rot * 1.5 + (k / 8) * TAU, L = R * (k % 2 ? 0.42 : 0.7); ctx.fillStyle = k % 2 ? pal[2] : pal[3]; pathPoly(ctx, [[x + Math.cos(a - 0.14) * R * 0.12, y + Math.sin(a - 0.14) * R * 0.12 * sq], [x + Math.cos(a) * L, y + Math.sin(a) * L * sq], [x + Math.cos(a + 0.14) * R * 0.12, y + Math.sin(a + 0.14) * R * 0.12 * sq]]); }
    star4(ctx, x, y, 3, "#ffffff");
    glowDot(g, x, y, R * 1.2, "170,140,255", 0.45 * fade);
  }
  function drawPillar(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x - ox, y = f.y - oy, top = -20, w = 26 * (p < 0.15 ? p / 0.15 : 1 - easeIn((p - 0.35) / 0.65));
    if (w <= 0.5) return;
    for (const [k, col] of [[1, "#4c2c8c"], [0.75, "#aa92f2"], [0.45, "#ffe8a2"], [0.2, "#ffffff"]]) { ctx.fillStyle = col; ctx.fillRect(Math.round(x - w * k), top, Math.round(w * k * 2), y - top + 4); }
    for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU + age * 2, L = 30 + 50 * (1 - p); pathLine(ctx, [[x + Math.cos(a) * 8, y + Math.sin(a) * 4], [x + Math.cos(a) * L, y + Math.sin(a) * L * 0.5]], 1, k % 2 ? "#ffe8a2" : "#d6c8ff"); }
    glowDot(g, x, y - 40, 140, "220,200,255", 0.9 * (1 - p)); glowDot(g, x, y, 90, "255,240,200", 0.8 * (1 - p));
  }
  function drawMeteor(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x - ox, y = f.y - oy;
    if (p < 0.4) { const q = p / 0.4, sx = x - f.dx * (1 - q), sy = y - 110 * (1 - q); pathLine(ctx, [[sx - f.dx * 0.35, sy - 40], [sx, sy]], 2.6, "#4c2c8c"); pathLine(ctx, [[sx - f.dx * 0.25, sy - 28], [sx, sy]], 1.4, "#c8b4ff"); pathLine(ctx, [[sx - f.dx * 0.1, sy - 12], [sx, sy]], 1, "#ffffff"); star4(ctx, sx, sy, 2, "#fff8d8"); glowDot(g, sx, sy, 16, "255,232,162", 0.8); }
    else { const q = (p - 0.4) / 0.6; star4(ctx, x, y, Math.max(1, Math.round(4 * (1 - q))), "#ffe8a2"); glowDot(g, x, y, 24 * (1 - q) + 4, "230,210,255", 0.8 * (1 - q)); }
  }

  function drawBand(f, ctx, g, ox, oy, age) {
    // a ribbon of niho (shark-tooth) triangles spiralling up round the hero, like a living tattoo
    const p = age / f.dur, cx = (f.p || C.p).x - ox, cy = (f.p || C.p).y - oy, fade = p > 0.7 ? 1 - (p - 0.7) / 0.3 : 1, pal = P.kakau;
    const n = 26;
    for (let k = 0; k < n; k++) {
      const u = k / n, a = u * TAU * 1.6 + age * 7 + f.seed, r = 16 + u * 6, y = cy - 4 - u * 30 * Math.min(1, p * 3);
      const x0 = cx + Math.cos(a) * r, y0 = y + Math.sin(a) * r * 0.4, front = Math.sin(a) > 0;
      if (fade * (1 - u * 0.3) < 0.2) continue;
      const s2 = 3.2, dx = -Math.sin(a), dy = Math.cos(a) * 0.4;
      ctx.fillStyle = front ? (k % 2 ? pal[3] : pal[4]) : pal[1];
      pathPoly(ctx, [[x0 - dx * s2, y0 - dy * s2], [x0, y0 - s2 * 1.6], [x0 + dx * s2, y0 + dy * s2]]);
      if (front) glowDot(g, x0, y0, 7, "242,150,80", 0.35 * fade);
    }
  }
  function drawKpillar(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, x = f.x - ox, y = f.y - oy, pal = P.kakau;
    const h = f.h * (p < 0.2 ? easeOut(p / 0.2) * 1.15 : p < 0.3 ? 1.15 - (p - 0.2) * 1.5 : 1) * (p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1);
    if (h <= 1) return;
    const w = 7;
    ctx.fillStyle = pal[0]; ctx.fillRect(Math.round(x - w - 1), Math.round(y - h - 1), w * 2 + 2, Math.round(h) + 2);
    ctx.fillStyle = pal[1]; ctx.fillRect(Math.round(x - w), Math.round(y - h), w * 2, Math.round(h));
    // stacked niho rows, alternating up / down, glowing from inside
    for (let r = 0, yy = y - 3; yy > y - h + 2; r++, yy -= 5) for (let k = -1; k <= 1; k++) {
      const tx = x + k * 4.6, up = r % 2 === 0;
      ctx.fillStyle = r % 3 === 0 ? pal[4] : pal[3];
      pathPoly(ctx, up ? [[tx - 2.2, yy], [tx, yy - 4], [tx + 2.2, yy]] : [[tx - 2.2, yy - 4], [tx, yy], [tx + 2.2, yy - 4]]);
    }
    ctx.fillStyle = pal[4]; ctx.fillRect(Math.round(x - w), Math.round(y - h), w * 2, 1);
    glowDot(g, x, y - h * 0.5, 26 + h * 0.4, "255,150,70", 0.55 * (1 - p * 0.6));
  }
  function drawOrbit(f, ctx, g, ox, oy, age) {
    const p = age / f.dur, cx = (f.p || C.p).x - ox, cy = (f.p || C.p).y - 12 - oy, R = 46 * easeOut(p / 0.3), fade = p > 0.75 ? 1 - (p - 0.75) / 0.25 : 1;
    if (fade <= 0) return;
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * TAU + age * 3.2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R * 0.5 - 8 * Math.sin(age * 4 + k);
      drawGlyph({ x: x + ox, y: y + oy, vx: 0, vy: 0, dur: 1, kind: k % 4 }, ctx, g, ox, oy, 0.1);
    }
  }
  function drawChain(f, ctx, g, ox, oy, age) {
    const u = Math.min(1, age / f.dur), hx0 = (f.p || C.p).x - ox, hy0 = (f.p || C.p).y - 12 - oy;
    const at_ = (uu) => { const [da, r] = f.path(K.clamp(uu, 0, 1)); const a = f.a + da * f.spin; return [hx0 + Math.cos(a) * r, hy0 + 2 + Math.sin(a) * r * 0.8, a, r]; };
    const [hx, hy, ha, hr] = at_(u);
    // motion smear of the blade: crescent through the last few positions
    const TN = f.spiral ? 34 : 12, trail = []; for (let k = 0; k <= TN; k++) trail.push(at_(u - k * (f.spiral ? 0.008 : 0.011)));
    for (let k = 0; k < trail.length - 1; k++) { const w = (f.spiral ? 6 : 4) * (1 - k / trail.length) + 0.5; pathLine(ctx, [[trail[k][0], trail[k][1]], [trail[k + 1][0], trail[k + 1][1]]], w + 1.5, P.steel[1]); pathLine(ctx, [[trail[k][0], trail[k][1]], [trail[k + 1][0], trail[k + 1][1]]], w, k < 3 ? P.steel[4] : P.steel[3]); }
    // chain: links along a curve that lags behind the swing
    const lag = at_(u - 0.04), mx = hx0 + (lag[0] - hx0) * 0.55, my = hy0 + (lag[1] - hy0) * 0.55 + Math.min(8, hr * 0.05);
    const links = Math.max(4, Math.round(hr / 3.2));
    for (let k = 0; k <= links; k++) {
      const t = k / links, x = (1 - t) * (1 - t) * hx0 + 2 * (1 - t) * t * mx + t * t * hx, y = (1 - t) * (1 - t) * hy0 + 2 * (1 - t) * t * my + t * t * hy;
      ctx.fillStyle = "#1a1e28"; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      ctx.fillStyle = k % 2 ? "#8a94a8" : "#cfd8e8"; ctx.fillRect(Math.round(x) - (k % 2 ? 1 : 0), Math.round(y), k % 2 ? 2 : 1, k % 2 ? 1 : 2);
    }
    // sickle head: a hooked crescent blade facing along the swing
    const tang = ha + (f.spin > 0 ? Math.PI / 2 : -Math.PI / 2);
    ctx.save(); ctx.translate(Math.round(hx), Math.round(hy)); ctx.rotate(tang);
    const pts = []; for (let k = 0; k <= 10; k++) { const a = -0.3 + k * 0.28; pts.push([Math.cos(a) * 8 - 4, Math.sin(a) * 8]); }
    const inner = pts.map(([x, y], k) => [x * 0.6 - 1, y * 0.62 + (k > 7 ? 1 : 0)]).reverse();
    ctx.fillStyle = "#141c2a"; pathPoly(ctx, pts.map(([x, y]) => [x * 1.12, y * 1.12]).concat(inner));
    ctx.fillStyle = "#86cbe6"; pathPoly(ctx, pts.concat(inner));
    pathLine(ctx, pts.slice(1, 9), 1, "#ffffff");
    ctx.fillStyle = "#1a0c06"; ctx.fillRect(-6, -2, 4, 4); ctx.fillStyle = "#8a5228"; ctx.fillRect(-5, -1, 2, 2);
    ctx.restore();
    glowDot(g, hx, hy, f.spiral ? 22 : 14, "190,230,255", 0.5);
    if (f.spiral) glowDot(g, hx0, hy0, hr * 1.1, "170,210,255", 0.12);
  }

  const DRAW = { roots: drawRoots, grove: drawGrove, fissure: drawFissure, fissureGlow: drawFissureGlow, suns: drawSuns, pring: drawPring, nova: drawNova, psigil: drawPsigil, band: drawBand, kpillar: drawKpillar, orbit: drawOrbit, chain: drawChain, biolum: drawBiolum, vortex: drawVortex, vglow: drawVglow, darken: drawDarken, const: drawConst, celsigil: drawCelsigil, pillar: drawPillar, meteor: drawMeteor, sigil: drawSigil, glyph: drawGlyph, arc: drawArc, fire: drawFire, bloom: drawBloom, thrust: drawThrust, iai: drawIai, jaw: drawJaw, cuts: drawCuts, ring: drawRing, crack: drawCrack, spike: drawSpike, cloud: drawCloud, bolt: drawBolt, star: drawStar, impact: drawImpact };

  C.drawGround = function (ctx, ox, oy) {
    for (const f of C.fx) if (f.ground) DRAW[f.type](f, ctx, ctx, ox, oy, C.clock - f.t0);
  };
  // air effects into the crisp fx layer, glows into the soft glow layer. Returns true if anything drawn.
  C.drawAir = function (ctx, g, ox, oy) {
    let any = false;
    for (const f of C.fx) { if (f.ground) continue; const age = C.clock - f.t0; if (age < 0) continue; DRAW[f.type](f, ctx, g, ox, oy, age); any = true; }
    for (const q of C.parts) {
      const x = Math.round(q.x - ox), y = Math.round(q.y - oy), f = 1 - q.age / q.max;
      if (q.kind === "smoke") { const r = q.size * (1 + q.age * 1.5); ctx.fillStyle = q.col; ctx.globalAlpha = 1; if (f > 0.35) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, TAU); ctx.fill(); } }
      else if (q.kind === "star4") star4(ctx, x, y, f > 0.5 ? 1 : 0, q.col);
      else if (q.kind === "rain") { ctx.fillStyle = q.col; ctx.fillRect(x, y, 1, 4); }
      else if (q.kind === "leaf") { if (f < 0.1) continue; const fl = Math.sin(q.age * 14 + q.x * 0.3); ctx.fillStyle = q.col; ctx.fillRect(Math.round(x + fl * 2), y, fl > 0 ? 2 : 1, fl > 0 ? 1 : 2); }
      else { if (f < 0.15 && q.kind !== "debris") continue; ctx.fillStyle = q.col; ctx.fillRect(x, y, q.size, q.size); }
      if (q.glow) glowDot(g, x, y, 5, hexRGB(q.col.length === 7 ? q.col : "#ffffff"), 0.4 * f);
      any = true;
    }
    return any;
  };
  // the equipped weapon in hand, swinging with the move
  // The weapon in the hero's hand. At rest it is held upright in the hand the art actually shows
  // (beside the body, never through it), with the fist drawn closed over the grip; facing away it is
  // drawn behind the hero. In the sea cave it becomes a silhouette like the hero (sil = true).
  const silCache = new Map();
  function silOf(img) {
    if (silCache.has(img)) return silCache.get(img);
    const w = img.width, h = img.height, [c, x] = K.canvas(w, h); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, w, h), p = d.data, o = new Uint8ClampedArray(p.length), op = (a, b) => a >= 0 && b >= 0 && a < w && b < h && p[(b * w + a) * 4 + 3] > 0;
    for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
      if (!op(xx, y)) continue;
      const i = (y * w + xx) * 4; let c2 = [8, 12, 26];
      if (!op(xx + 1, y) || !op(xx, y + 1)) c2 = [86, 206, 238]; else if (!op(xx - 1, y)) c2 = [40, 120, 170]; else if (!op(xx, y - 1)) c2 = [22, 40, 70];
      o[i] = c2[0]; o[i + 1] = c2[1]; o[i + 2] = c2[2]; o[i + 3] = 255;
    }
    x.putImageData(new ImageData(o, w, h), 0, 0); silCache.set(img, c); return c;
  }
  const REST = { down: [7, -8, -Math.PI / 2 + 0.3], up: [7, -9, -Math.PI / 2 + 0.2], side: [1, -8, -Math.PI / 2 + 0.45], left: [-1, -8, -Math.PI / 2 - 0.45] };
  function fist(ctx, x, y, sil) {
    x = Math.round(x); y = Math.round(y);
    ctx.fillStyle = sil ? "#081022" : "#24181e"; ctx.fillRect(x - 2, y - 2, 4, 4);
    ctx.fillStyle = sil ? "#28507a" : "#b2724a"; ctx.fillRect(x - 1, y - 1, 2, 2);
    ctx.fillStyle = sil ? "#56cdee" : "#ce8e62"; ctx.fillRect(x - 1, y - 1, 1, 1);
  }
  C.drawWeapon = function (ctx, ox, oy, p, sil) {
    const w = WEAPONS[C.cur]; if (!w.spr) return;
    const art = (c) => (sil ? silOf(c) : c);
    if (w.id === "chain" && !C.move) { ctx.save(); ctx.translate(Math.round(p.x - ox + (p.dir === "left" ? -6 : 6)), Math.round(p.y - 8 - oy)); ctx.drawImage(art(w.spr.c), -15, -7); ctx.restore(); return; }
    if (w.spr.none) return;
    if (w.spr.gauntlet) { const fx_ = p.dir === "left" ? -7 : 7, lift = C.move ? -3 : 0; ctx.drawImage(art(w.spr.c), 9, 2, 14, 11, Math.round(p.x - ox + fx_ - 7), Math.round(p.y - 14 - oy + lift), 14, 11); return; }
    let ang, ext = 0, hx, hy;
    if (C.move) {
      const main = C.fx.find((f) => (f.type === "arc" || f.type === "thrust") && f.follow && C.clock - f.t0 >= 0);
      if (main && main.type === "arc") { const pr = (C.clock - main.t0) / main.dur; ang = main.a0 + (main.a1 - main.a0) * easeOut(pr / 0.5); }
      else { ang = C.aim; ext = 6 * Math.sin(Math.min(1, C.moveT / (C.move.dur * 0.5)) * Math.PI); }
      // mid-swing the hand travels round the shoulder, out at arm's length
      hx = p.x - ox + Math.cos(ang) * (8 + ext); hy = p.y - 12 - oy + Math.sin(ang) * (7 + ext) * 0.8;
    } else {
      const r = REST[p.dir] || REST.down, bob = p.moving && p.frame % 2 ? 1 : 0;
      ang = r[2]; hx = p.x - ox + r[0]; hy = p.y - oy + r[1] + bob;
    }
    ctx.save(); ctx.translate(Math.round(hx), Math.round(hy)); ctx.rotate(ang); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(art(w.spr.c), -w.spr.gx, -w.spr.gy);
    if (w.id === "fangs" && C.move) { ctx.rotate(0.5); ctx.drawImage(art(w.spr.c), -w.spr.gx, -w.spr.gy + 3); }
    ctx.restore();
    fist(ctx, hx, hy, sil);
  };
  // facing away, the weapon is held in front of the body: draw it behind the hero
  C.behindHero = (p) => !C.move && p.dir === "up";
  // how much the sky darkens for storm / celestial finishers (0..1) and its tint
  C.darkness = function () {
    let d = 0, tint = "8,10,30";
    for (const f of C.fx) if (f.type === "darken") { const p = (C.clock - f.t0) / f.dur; const v = Math.min(1, p / 0.15) * (1 - easeIn((p - 0.75) / 0.25)); if (v > d) { d = v; tint = f.tint || tint; } }
    return [d, tint];
  };
})();
