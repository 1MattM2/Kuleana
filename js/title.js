// The title screen: shown from the first frame while the island is built (a progress line under the
// title), then the main menu (Continue, New Game, Load Game, Test World, Settings) with three save
// slots. The test world is a sandbox with everything unlocked; it is never saved.
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

  // ---------------------------------------------------------------- the page
  const PX = innerHeight < 560 ? 2 : innerHeight < 820 ? 3 : 4;   // one art pixel on screen (smaller on short screens)
  const st = document.createElement("style");
  st.textContent = `
  #title{position:fixed;inset:0;z-index:20;overflow:hidden;background:transparent;font-family:'Josefin Sans',system-ui,sans-serif;color:#f6ead2;user-select:none;-webkit-user-select:none;transition:opacity .9s ease}
  #title.gone{opacity:0;pointer-events:none}
  /* while the world is built: plain black; it fades out to reveal the live sea */
  #title .deep{position:absolute;inset:0;background:#000;transition:opacity 1.6s ease}
  @keyframes swell{from{transform:translateY(0)}to{transform:translateY(90px)}}
  #title.live .deep{opacity:0}
  #title .vig{position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(ellipse at 50% 42%,#02101e00 30%,#02101e99 100%),linear-gradient(#02101e66,#02101e00 35%,#02101e00 60%,#02101e88)}
  #title .head{position:absolute;left:0;right:0;top:9vh;text-align:center;pointer-events:none;z-index:5}
  #title h1{margin:0;font-family:'Marcellus SC',Georgia,serif;font-weight:400;font-size:clamp(46px,9vw,118px);letter-spacing:.16em;color:#fbecd0;text-shadow:0 3px 0 #06243c,0 0 36px #02101ecc,0 0 2px #02101e;padding-left:.16em}
  #title .tag{margin-top:6px;font-size:clamp(11px,1.5vw,15px);letter-spacing:.42em;text-transform:uppercase;color:#cfe9ee;opacity:.9;padding-left:.42em;text-shadow:0 1px 8px #02101e}
  #title .rule{width:min(320px,50vw);height:1px;margin:18px auto 0;background:linear-gradient(90deg,transparent,#cfe9eeaa,transparent)}
  #title .panel{position:absolute;left:50%;bottom:7vh;transform:translateX(-50%);width:min(440px,88vw);text-align:center;z-index:6;padding:18px 22px 14px;background:linear-gradient(#03142400,#031424b8 18%,#031424d9);border-radius:2px}
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
  #title .slot{display:flex;align-items:center;gap:14px;text-align:left;background:#04182acc;border:1px solid #f2cfa033;color:#f6ead2;padding:12px 16px;cursor:pointer;font:inherit;transition:border-color .15s,background .15s}
  #title .slot.on{border-color:#ffd27a;background:#0a2a40e6}
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
  el.innerHTML = `<div class="deep"></div><div class="vig"></div>
    <div class="head"><h1>Kuleana</h1><div class="tag">Tales of the Sunward Shore</div><div class="rule"></div></div>
    <div class="panel">
      <div class="loading"><div class="load">Charting the reef</div><div class="bar"><i></i></div></div>
      <div class="menu"></div>
      <div class="slots"><div class="slotsHead">Choose a voyage</div><div class="list"></div><div class="confirm"></div><button class="item back" data-a="back">Back</button></div>
      <div class="hint"></div>
    </div><div class="foot">v0.5 &middot; Zone 1</div>`;
  document.body.appendChild(el);

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
      { k: "test", label: "Test World" },
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
    else if (it.k === "test") start(0, null, { test: true });
    else if (it.k === "settings") window.Menu && Menu.toggle(true, "controls");
  }
  function back() { mode = "menu"; el.classList.remove("slotsOpen"); buildMenu(); }
  function paint() {
    el.querySelectorAll(".menu .item").forEach((b, i) => b.classList.toggle("on", i === sel && mode === "menu"));
    el.querySelectorAll(".slot").forEach((b, i) => b.classList.toggle("on", i === slotSel));
    el.querySelector(".hint").textContent = window.TouchPad && TouchPad.enabled ? "Tap to choose" : mode === "slots" ? "Arrows choose · Enter select · Del erase · Esc back" : "Arrows choose · Enter select";
  }
  function start(n, data, opts) {
    Title.slot = n;
    window.Ambience && Ambience.start && Ambience.start();
    if (window.Game) Game.begin(n, data, opts);
    Title.open = false; el.classList.add("gone");
    setTimeout(() => { el.style.display = "none"; }, 1000);
  }
  // joining a friend's game from the title: start straight into their world (an unsaved guest session)
  Title.quickStart = () => { if (Title.open && Title.isReady) start(0, null); };
  Title.show = () => { Title.open = true; el.style.display = "block"; requestAnimationFrame(() => el.classList.remove("gone")); mode = "menu"; el.classList.remove("slotsOpen"); buildMenu(); };
  Title.live = () => el.classList.add("live");
  Title.ready = () => { Title.isReady = true; Title.progress(1, "Ready"); setTimeout(() => { el.classList.add("ready"); buildMenu(); }, 250); };

  addEventListener("keydown", (e) => {
    if (!Title.open || !Title.isReady) return;
    // the settings panel, opened from the title, takes the keys while it's up (Esc closes it)
    if (window.Menu && Menu.open) { if (e.target && e.target.tagName === "INPUT") return; e.preventDefault(); e.stopImmediatePropagation(); if (!e.repeat) Menu.key(e); return; }
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
