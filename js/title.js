// The title screen: shown from the first frame while the island is built (a progress line under the
// title), then the main menu (Continue, New Game, Load Game, Settings) with three save slots.
//
// The background is a pixel-art sunset sea: layered bands of waves scrolling at different speeds,
// a low sun with its glitter path, drifting clouds and a distant island. It animates with CSS
// transforms (the compositor), so it keeps moving even while the main thread builds the world.
//
// Saves live in this browser (localStorage, "kuleana.slot.1..3"). Game.snapshot()/Game.apply() in
// main.js decide what goes in a save.
(function () {
  const Title = (window.Title = { open: true, ready: false, slot: 0 });
  const SLOTS = 3, KEY = (n) => "kuleana.slot." + n;
  const store = {
    get(n) { try { const v = localStorage.getItem(KEY(n)); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
    set(n, d) { try { localStorage.setItem(KEY(n), JSON.stringify(d)); return true; } catch (e) { return false; } },
    del(n) { try { localStorage.removeItem(KEY(n)); } catch (e) {} },
  };
  Title.store = store;

  // ---------------------------------------------------------------- pixel art for the sea
  const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; };
  const hash = (x, y, s) => { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); };
  // one seamless strip of waves: a body colour, darker troughs and a lit crest with flecks of foam
  function waveStrip(w, h, cols, amp, freq, seed, foam) {
    const [c, x] = cv(w, h), img = x.createImageData(w, h), d = img.data;
    for (let px = 0; px < w; px++) {
      const k = (px / w) * Math.PI * 2, crest = Math.round(h * 0.35 + Math.sin(k * freq + seed) * amp + Math.sin(k * freq * 2 + seed * 3) * amp * 0.4);
      for (let py = 0; py < h; py++) {
        let ci = -1;
        if (py >= crest) ci = py - crest < 1 ? 3 : py - crest < 3 ? 2 : py > h * 0.75 ? 0 : 1;
        if (ci === 1 && hash(px, py, seed) > 0.93) ci = 2;
        if (foam && py === crest - 1 && hash(px, 0, seed) > 0.4) ci = 4;
        if (ci < 0) continue;
        const col = cols[ci], i = (py * w + px) * 4; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; d[i + 3] = 255;
      }
    }
    x.putImageData(img, 0, 0); return c.toDataURL();
  }
  function cloud(w, h, seed) {
    const [c, x] = cv(w, h), img = x.createImageData(w, h), d = img.data;
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      const dx = (px - w / 2) / (w / 2), dy = (py - h * 0.65) / (h * 0.6), v = 1 - dx * dx - dy * dy * 1.8 + (hash(px >> 2, py >> 2, seed) - 0.5) * 0.25;
      if (v <= 0 || py > h * 0.85) continue;
      const lit = py < h * 0.45 ? [255, 196, 150] : py < h * 0.65 ? [226, 132, 120] : [150, 84, 110], i = (py * w + px) * 4;
      d[i] = lit[0]; d[i + 1] = lit[1]; d[i + 2] = lit[2]; d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0); return c.toDataURL();
  }
  function island(w, h) {
    const [c, x] = cv(w, h), img = x.createImageData(w, h), d = img.data;
    for (let px = 0; px < w; px++) {
      const u = px / w, top = h - Math.round(h * (Math.max(0, 1 - Math.abs(u - 0.38) * 3.2) * 0.9 + Math.max(0, 1 - Math.abs(u - 0.7) * 5) * 0.45) + hash(px, 1, 3) * 1.5);
      for (let py = Math.max(0, top); py < h; py++) { const i = (py * w + px) * 4, f = py - top < 1 ? [92, 52, 78] : [52, 30, 58]; d[i] = f[0]; d[i + 1] = f[1]; d[i + 2] = f[2]; d[i + 3] = 255; }
    }
    // a palm on the near point
    const palm = [[47, 0, 1, 9], [44, 0, 7, 1], [42, 1, 3, 1], [50, 1, 3, 1], [41, 2, 2, 1], [52, 2, 2, 1]];
    for (const [a, b, ww, hh] of palm) for (let yy = 0; yy < hh; yy++) for (let xx = 0; xx < ww; xx++) { const px = Math.round(w * 0.38) - 47 + a + xx, py = Math.round(h * 0.08) + b + yy; if (px >= 0 && py >= 0 && px < w && py < h) { const i = (py * w + px) * 4; d[i] = 52; d[i + 1] = 30; d[i + 2] = 58; d[i + 3] = 255; } }
    x.putImageData(img, 0, 0); return c.toDataURL();
  }

  // ---------------------------------------------------------------- the page
  const PX = innerHeight < 560 ? 2 : innerHeight < 820 ? 3 : 4;   // one art pixel on screen (smaller on short screens)
  const st = document.createElement("style");
  st.textContent = `
  #title{position:fixed;inset:0;z-index:20;overflow:hidden;background:#1b1030;font-family:'Josefin Sans',system-ui,sans-serif;color:#f6ead2;user-select:none;-webkit-user-select:none;transition:opacity .9s ease}
  #title.gone{opacity:0;pointer-events:none}
  #title .sky{position:absolute;inset:0 0 54% 0;background:linear-gradient(#140c2c 0%,#3a1a4a 38%,#8a3a58 66%,#e0785a 88%,#ffb56a 100%);image-rendering:pixelated}
  #title .stars{position:absolute;inset:0 0 70% 0;background-image:radial-gradient(1px 1px at 12% 20%,#fff8 50%,transparent 51%),radial-gradient(1px 1px at 38% 12%,#fff6 50%,transparent 51%),radial-gradient(1px 1px at 67% 26%,#fff8 50%,transparent 51%),radial-gradient(1px 1px at 84% 9%,#fff5 50%,transparent 51%),radial-gradient(1px 1px at 55% 33%,#fff4 50%,transparent 51%);animation:tw 5s ease-in-out infinite alternate}
  @keyframes tw{to{opacity:.4}}
  #title .sun{position:absolute;left:50%;top:calc(46% - ${18 * PX}px);width:${36 * PX}px;height:${18 * PX}px;transform:translateX(-50%);overflow:hidden;image-rendering:pixelated}
  #title .sun i{position:absolute;left:0;top:0;width:${36 * PX}px;height:${36 * PX}px;border-radius:50%;background:radial-gradient(circle,#fff2c0 0 38%,#ffd27a 39% 62%,#ff9a4a 63% 100%)}
  #title .glow{position:absolute;left:50%;top:30%;width:70vmax;height:40vmax;transform:translateX(-50%);background:radial-gradient(ellipse at 50% 60%,#ffb06a55,transparent 60%);pointer-events:none}
  #title .cloud{position:absolute;height:${14 * PX}px;width:${56 * PX}px;background-size:100% 100%;image-rendering:pixelated;animation:drift linear infinite;opacity:.9}
  @keyframes drift{from{transform:translateX(-30vw)}to{transform:translateX(130vw)}}
  #title .isle{position:absolute;bottom:54%;height:${18 * PX}px;width:${96 * PX}px;background-size:100% 100%;image-rendering:pixelated}
  #title .sea{position:absolute;inset:46% 0 0 0;background:#1a2a5a;overflow:hidden;z-index:1}
  #title .band{position:absolute;left:0;height:var(--h);width:calc(100% + var(--w));background-repeat:repeat-x;background-size:var(--w) var(--h);image-rendering:pixelated;animation:roll var(--t) linear infinite}
  @keyframes roll{from{transform:translateX(0)}to{transform:translateX(calc(var(--w) * -1))}}
  #title .band.rev{animation-direction:reverse}
  #title .glint{position:absolute;height:${PX}px;background:#ffe6a8;animation:glint var(--t) steps(2) infinite;opacity:0}
  @keyframes glint{0%,40%{opacity:0}50%,90%{opacity:1}100%{opacity:0}}
  #title .vig{position:absolute;inset:0;z-index:2;background:radial-gradient(ellipse at 50% 45%,transparent 45%,#0a061488 100%);pointer-events:none}
  #title .head{position:absolute;left:0;right:0;top:9vh;text-align:center;pointer-events:none;z-index:5}
  #title h1{margin:0;font-family:'Marcellus SC',Georgia,serif;font-weight:400;font-size:clamp(46px,9vw,118px);letter-spacing:.16em;color:#fbecd0;text-shadow:0 2px 0 #6a2a3a,0 0 40px #ff9a5a66;padding-left:.16em}
  #title .tag{margin-top:6px;font-size:clamp(11px,1.5vw,15px);letter-spacing:.42em;text-transform:uppercase;color:#f2cfa0;opacity:.85;padding-left:.42em}
  #title .rule{width:min(320px,50vw);height:1px;margin:18px auto 0;background:linear-gradient(90deg,transparent,#f2cfa0aa,transparent)}
  #title .panel{position:absolute;left:50%;bottom:7vh;transform:translateX(-50%);width:min(440px,88vw);text-align:center;z-index:6;padding:18px 22px 14px;background:linear-gradient(#0a0c2a00,#0a0c2acc 18%,#0a0c2ae6);border-radius:2px}
  #title .load{font-size:12px;letter-spacing:.3em;text-transform:uppercase;color:#f2cfa0}
  #title .bar{margin:12px auto 0;width:min(300px,70vw);height:2px;background:#ffffff22;overflow:hidden}
  #title .bar i{display:block;height:100%;width:0;background:#ffd27a;transition:width .35s ease}
  #title .menu{display:none;flex-direction:column;gap:2px;align-items:center}
  #title.ready .menu{display:flex} #title.ready .loading{display:none}
  #title .item{position:relative;background:none;border:0;color:#f6ead2;font:600 clamp(15px,2.2vw,19px) 'Josefin Sans',system-ui,sans-serif;letter-spacing:.32em;text-transform:uppercase;padding:9px 18px 7px;cursor:pointer;opacity:.78;transition:opacity .15s,letter-spacing .2s}
  #title .item:disabled{opacity:.28;cursor:default}
  #title .item.on{opacity:1;letter-spacing:.38em;color:#ffe3a8}
  #title .item.on::before,#title .item.on::after{content:"";position:absolute;top:50%;width:6px;height:6px;background:#ffd27a;transform:translateY(-60%) rotate(45deg)}
  #title .item.on::before{left:-6px} #title .item.on::after{right:-6px}
  #title .slots{display:none;flex-direction:column;gap:10px;width:100%}
  #title.slotsOpen .slots{display:flex} #title.slotsOpen .menu{display:none}
  #title .slotsHead{font-size:12px;letter-spacing:.34em;text-transform:uppercase;color:#f2cfa0;margin-bottom:2px}
  #title .slot{display:flex;align-items:center;gap:14px;text-align:left;background:#120a1ccc;border:1px solid #f2cfa033;color:#f6ead2;padding:12px 16px;cursor:pointer;font:inherit;transition:border-color .15s,background .15s}
  #title .slot.on{border-color:#ffd27a;background:#24142ee6}
  #title .slot .n{font-family:'Marcellus SC',Georgia,serif;font-size:26px;color:#ffd27a;width:22px;text-align:center}
  #title .slot .t{flex:1} #title .slot .a{font-size:15px;letter-spacing:.08em} #title .slot .b{font-size:12px;opacity:.65;margin-top:3px;letter-spacing:.04em}
  #title .slot .x{background:none;border:1px solid #f2cfa044;color:#f2cfa0;font:11px 'Josefin Sans',sans-serif;letter-spacing:.15em;padding:5px 8px;cursor:pointer;text-transform:uppercase}
  #title .back{margin-top:4px;align-self:center}
  #title .hint{margin-top:16px;font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.5}
  #title .foot{position:absolute;z-index:6;right:16px;bottom:12px;font-size:11px;letter-spacing:.2em;opacity:.45;text-transform:uppercase}
  @media (max-height:560px){
    #title .head{top:4vh} #title h1{font-size:clamp(34px,7vw,64px)} #title .tag{font-size:10px;letter-spacing:.32em} #title .rule{margin-top:8px}
    #title .panel{bottom:3vh;padding:8px 16px 8px;width:min(400px,70vw)} #title .item{font-size:13px;padding:6px 14px 4px}
    #title .hint{margin-top:6px;font-size:9px} #title .slot{padding:7px 12px} #title .slot .n{font-size:20px} #title .slot .a{font-size:13px} #title .slots{gap:6px}
  }
  #title .confirm{display:none;margin-top:8px;font-size:13px;color:#ffb08a;letter-spacing:.06em}`;
  document.head.appendChild(st);

  const el = document.createElement("div"); el.id = "title";
  el.innerHTML = `<div class="sky"></div><div class="stars"></div><div class="glow"></div><div class="sun"><i></i></div><div class="isle"></div><div class="sea"></div><div class="vig"></div>
    <div class="head"><h1>Kuleana</h1><div class="tag">Tales of the Sunward Shore</div><div class="rule"></div></div>
    <div class="panel">
      <div class="loading"><div class="load">Charting the reef</div><div class="bar"><i></i></div></div>
      <div class="menu"></div>
      <div class="slots"><div class="slotsHead">Choose a voyage</div><div class="list"></div><div class="confirm"></div><button class="item back" data-a="back">Back</button></div>
      <div class="hint"></div>
    </div><div class="foot">v0.4 &middot; Zone 1</div>`;
  document.body.appendChild(el);

  // the sea: far bands are small, dark and slow; near bands are big, bright and quick
  const sea = el.querySelector(".sea");
  const BANDS = [
    { top: 0, h: 6, w: 48, cols: [[26, 32, 82], [36, 46, 106], [92, 82, 140], [190, 120, 120]], amp: 1, f: 3, t: 26, rev: 0 },
    { top: 5, h: 8, w: 64, cols: [[24, 40, 96], [32, 58, 122], [86, 104, 160], [224, 150, 120]], amp: 1.5, f: 3, t: 19, rev: 1 },
    { top: 12, h: 11, w: 80, cols: [[20, 48, 110], [28, 70, 140], [70, 126, 180], [246, 186, 130], [255, 240, 210]], amp: 2, f: 2, t: 14, rev: 0, foam: 1 },
    { top: 21, h: 14, w: 104, cols: [[16, 56, 120], [24, 84, 154], [60, 140, 190], [240, 206, 160], [255, 246, 226]], amp: 2.5, f: 2, t: 10, rev: 1, foam: 1 },
    { top: 33, h: 18, w: 128, cols: [[12, 62, 126], [20, 98, 166], [56, 156, 200], [236, 222, 190], [255, 250, 236]], amp: 3, f: 2, t: 7.5, rev: 0, foam: 1 },
    { top: 49, h: 30, w: 160, cols: [[10, 66, 128], [16, 110, 176], [52, 170, 210], [230, 236, 220], [255, 255, 245]], amp: 4, f: 2, t: 5.5, rev: 1, foam: 1 },
  ];
  BANDS.forEach((b, i) => {
    const d = document.createElement("div"); d.className = "band" + (b.rev ? " rev" : "");
    d.style.cssText = `top:${b.top * PX}px;--h:${b.h * PX}px;--w:${b.w * PX}px;--t:${b.t}s;background-image:url(${waveStrip(b.w, b.h, b.cols, b.amp, b.f, i * 1.7 + 1, b.foam)});z-index:${i}`;
    sea.appendChild(d);
  });
  const deep = document.createElement("div"); deep.style.cssText = `position:absolute;left:0;right:0;top:${78 * PX}px;bottom:0;background:linear-gradient(#0a4280,#082a58)`; sea.appendChild(deep);
  // the sun's glitter path: short streaks that wink on and off
  for (let k = 0; k < 46; k++) {
    const g = document.createElement("i"), y = Math.pow(Math.random(), 1.3) * 70, spread = 6 + y * 1.4, w = (2 + Math.random() * (2 + y * 0.12)) | 0;
    g.className = "glint"; g.style.cssText = `top:${Math.round(y) * PX}px;left:calc(50% + ${Math.round((Math.random() - 0.5) * spread) * PX}px);width:${w * PX}px;--t:${(1.2 + Math.random() * 2).toFixed(2)}s;animation-delay:${(-Math.random() * 3).toFixed(2)}s;z-index:9`;
    sea.appendChild(g);
  }
  for (let k = 0; k < 4; k++) {
    const c = document.createElement("div"); c.className = "cloud";
    c.style.cssText = `top:${6 + k * 8 + Math.random() * 6}%;background-image:url(${cloud(56, 14, k + 1)});animation-duration:${80 + k * 30}s;animation-delay:${-k * 35}s;transform:scale(${1 - k * 0.12})`;
    el.insertBefore(c, el.querySelector(".sun"));
  }
  const isle = el.querySelector(".isle"); isle.style.backgroundImage = `url(${island(96, 18)})`; isle.style.left = "12%";

  // ---------------------------------------------------------------- loading
  const LINES = ["Charting the reef", "Raising the island", "Planting the palms", "Waking the sea cave", "Lighting the sun gate", "Calling the tribe"];
  Title.progress = (f, line) => { el.querySelector(".bar i").style.width = Math.round(f * 100) + "%"; el.querySelector(".load").textContent = line || LINES[Math.min(LINES.length - 1, Math.floor(f * LINES.length))]; };

  // ---------------------------------------------------------------- menu
  let items = [], sel = 0, mode = "menu", slotSel = 0, pending = null;
  const fmtTime = (s) => { s = Math.floor(s || 0); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}h ${m}m` : `${m}m`; };
  const fmtDate = (t) => { try { return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch (e) { return ""; } };
  const latest = () => { let best = 0, bt = 0; for (let n = 1; n <= SLOTS; n++) { const d = store.get(n); if (d && d.t > bt) { bt = d.t; best = n; } } return best; };
  function buildMenu() {
    const has = latest();
    items = [
      { k: "continue", label: "Continue", off: !has },
      { k: "new", label: "New Game" },
      { k: "load", label: "Load Game", off: !has },
      { k: "settings", label: "Settings" },
    ];
    const m = el.querySelector(".menu"); m.innerHTML = "";
    items.forEach((it, i) => { const b = document.createElement("button"); b.className = "item"; b.textContent = it.label; b.disabled = !!it.off; b.onmouseenter = () => { if (!it.off) { sel = i; paint(); } }; b.onclick = () => { sel = i; activate(); }; m.appendChild(b); });
    if (items[sel] && items[sel].off) sel = items.findIndex((i) => !i.off);
    paint();
  }
  function buildSlots(purpose) {
    mode = "slots"; Title.purpose = purpose; el.classList.add("slotsOpen"); pending = null; el.querySelector(".confirm").style.display = "none";
    el.querySelector(".slotsHead").textContent = purpose === "new" ? "Begin a new voyage in" : "Continue a voyage";
    const list = el.querySelector(".list"); list.innerHTML = "";
    for (let n = 1; n <= SLOTS; n++) {
      const d = store.get(n), b = document.createElement("div");
      b.className = "slot"; b.dataset.n = n;
      b.innerHTML = `<div class="n">${n}</div><div class="t"><div class="a">${d ? d.place || "The Sunward Shore" : "Empty slot"}</div><div class="b">${d ? `${d.cleared || 0} of 3 lands cleared &middot; ${fmtTime(d.play)} &middot; ${fmtDate(d.t)}` : purpose === "new" ? "Start here" : "&mdash;"}</div></div>${d ? '<button class="x" data-del="1">Erase</button>' : ""}`;
      b.onmouseenter = () => { slotSel = n - 1; paint(); };
      b.onclick = (e) => {
        if (e.target.dataset.del) { if (pending && pending.n === n && pending.what === "erase") { store.del(n); buildSlots(Title.purpose); } else ask(n, "erase"); return; }
        slotSel = n - 1; pickSlot();
      };
      list.appendChild(b);
    }
    slotSel = Math.max(0, purpose === "load" ? latest() - 1 : [1, 2, 3].findIndex((n) => !store.get(n)));
    paint();
  }
  function ask(n, what) {
    pending = { n, what };
    const c = el.querySelector(".confirm"); c.style.display = "block";
    c.textContent = what === "erase" ? `Erase voyage ${n}? Press again to confirm.` : `Slot ${n} holds a voyage. Press again to overwrite it.`;
  }
  function pickSlot() {
    const n = slotSel + 1, d = store.get(n);
    if (Title.purpose === "load") { if (d) start(n, d); return; }
    if (d && !(pending && pending.n === n && pending.what === "over")) { ask(n, "over"); return; }
    store.del(n); start(n, null);
  }
  function activate() {
    if (mode === "slots") return pickSlot();
    const it = items[sel]; if (!it || it.off) return;
    if (it.k === "continue") { const n = latest(); start(n, store.get(n)); }
    else if (it.k === "new") buildSlots("new");
    else if (it.k === "load") buildSlots("load");
    else if (it.k === "settings") window.Menu && Menu.toggle(true, "sound");
  }
  function back() { mode = "menu"; el.classList.remove("slotsOpen"); buildMenu(); }
  function paint() {
    el.querySelectorAll(".menu .item").forEach((b, i) => b.classList.toggle("on", i === sel && mode === "menu"));
    el.querySelectorAll(".slot").forEach((b, i) => b.classList.toggle("on", i === slotSel));
    el.querySelector(".hint").textContent = window.TouchPad && TouchPad.enabled ? "Tap to choose" : mode === "slots" ? "Arrows choose · Enter select · Del erase · Esc back" : "Arrows choose · Enter select";
  }
  function start(n, data) {
    Title.slot = n;
    window.Ambience && Ambience.start && Ambience.start();
    if (window.Game) Game.begin(n, data);
    Title.open = false; el.classList.add("gone");
    setTimeout(() => { el.style.display = "none"; }, 1000);
  }
  // joining a friend's game from the title: start straight into their world (an unsaved guest session)
  Title.quickStart = () => { if (Title.open && Title.isReady) start(0, null); };
  Title.show = () => { Title.open = true; el.style.display = "block"; requestAnimationFrame(() => el.classList.remove("gone")); mode = "menu"; el.classList.remove("slotsOpen"); buildMenu(); };
  Title.ready = () => { Title.isReady = true; Title.progress(1, "Ready"); setTimeout(() => { el.classList.add("ready"); buildMenu(); }, 250); };

  addEventListener("keydown", (e) => {
    if (!Title.open || !Title.isReady || (window.Menu && Menu.open)) return;
    e.preventDefault(); e.stopImmediatePropagation();
    if (mode === "menu") {
      if (e.code === "ArrowDown" || e.code === "KeyS") { do sel = (sel + 1) % items.length; while (items[sel].off); paint(); }
      else if (e.code === "ArrowUp" || e.code === "KeyW") { do sel = (sel + items.length - 1) % items.length; while (items[sel].off); paint(); }
      else if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE") activate();
    } else {
      if (e.code === "ArrowDown" || e.code === "KeyS") { slotSel = (slotSel + 1) % SLOTS; pending = null; el.querySelector(".confirm").style.display = "none"; paint(); }
      else if (e.code === "ArrowUp" || e.code === "KeyW") { slotSel = (slotSel + SLOTS - 1) % SLOTS; pending = null; el.querySelector(".confirm").style.display = "none"; paint(); }
      else if (e.code === "Enter" || e.code === "Space" || e.code === "KeyE") pickSlot();
      else if (e.code === "Delete" || e.code === "Backspace") { const n = slotSel + 1; if (!store.get(n)) return; if (pending && pending.n === n && pending.what === "erase") { store.del(n); buildSlots(Title.purpose); } else ask(n, "erase"); }
      else if (e.code === "Escape") back();
    }
  }, true);
  el.querySelector(".back").onclick = back;
  Title.progress(0.02);
})();
