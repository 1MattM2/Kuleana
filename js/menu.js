// Settings: Esc opens it (C jumps straight to Co-op). Tabs for co-op, gameplay controls, sound and
// how to work the menu itself. Solo play pauses while it is open; co-op keeps running.
(function () {
  const M = (window.Menu = { open: false, tab: "coop", el: null });
  const TABS = [["gear", "Gear"], ["book", "Bestiary"], ["coop", "Co-op"], ["controls", "Controls"], ["sound", "Sound"], ["menu", "Menu"]];
  const CONTROLS = [
    ["Move", "W A S D  /  Arrow keys"], ["Run", "Shift (hold)"], ["Attack", "J  /  Left click. Press again mid-swing to chain a combo"],
    ["Dodge roll", "Space  /  K  /  Right click. Roll just as a blow lands for a perfect dodge"],
    ["Switch weapon", "Q  /  R  /  Mouse wheel"], ["Pick a weapon", "1 – 9, 0"], ["Talk / use", "E  /  Enter"],
    ["Ultimate", "Land 3 combo finishers, then finish again"], ["Mute", "M"], ["Settings", "Esc"], ["Co-op", "C"],
  ];
  const MENU_KEYS = [["Open / close", "Esc"], ["Next / previous tab", "Tab  /  Shift+Tab  (or ← →)"], ["Co-op tab", "C"], ["Join with a code", "Type it, then Enter"], ["Buttons", "Click"]];

  M.build = function () {
    const el = (M.el = document.createElement("div"));
    el.id = "menu";
    el.innerHTML = `<div class="mn-box">
      <div class="mn-head"><span class="mn-title">SETTINGS</span><span class="mn-x" data-a="close">Esc ✕</span></div>
      <div class="mn-tabs">${TABS.map(([k, n]) => `<button class="mn-tab" data-tab="${k}">${n}</button>`).join("")}</div>
      <div class="mn-page" data-page="gear"><div class="mn-gearwrap"></div></div>
      <div class="mn-page" data-page="book"><div class="mn-bookwrap"></div></div>
      <div class="mn-page" data-page="coop">
        <p class="mn-note">Play with up to two friends over the internet. One of you hosts and shares the 5-letter code; the others join with it.</p>
        <div class="mn-row"><button data-a="host">Host a game</button><button data-a="leave">Leave co-op</button></div>
        <div class="mn-row"><input class="mn-code" maxlength="5" placeholder="CODE" spellcheck="false" autocomplete="off"><button data-a="join">Join</button></div>
        <div class="mn-status"></div>
        <ul class="mn-list">
          <li>The host leads: when anyone uses a door, gate or exit, the whole party goes.</li>
          <li>Creatures fight whoever is closest. Each extra hero brings about half as many creatures again, spread wider and a little tougher. With three heroes, arenas gain an extra wave, and bosses get one health bar per hero.</li>
          <li>Fall in battle and you are knocked down. A partner revives you by standing over you and holding E (USE on a phone) for 3 seconds; you get up with half your hearts. If everyone falls, the area starts over.</li>
          <li>Berries heal whoever grabs them. Pele's shrine gives the Ember Heel to you both.</li>
          <li>The host wears red, the second hero gold and the third teal; arrows in their colour at the screen edge point to partners off screen.</li>
        </ul>
      </div>
      <div class="mn-page" data-page="controls"><table class="mn-table">${CONTROLS.map(([a, k]) => `<tr><td>${a}</td><td>${k}</td></tr>`).join("")}</table></div>
      <div class="mn-page" data-page="sound">
        <div class="mn-row mn-vol"><span>Volume</span><input type="range" min="0" max="100" value="100" data-a="vol"><span class="mn-volv">100%</span></div>
        <div class="mn-row"><button data-a="mute">Mute</button></div>
      </div>
      <div class="mn-page" data-page="menu"><div class="mn-row"><button data-a="save">Save game</button><button data-a="quit">Quit to title</button></div><table class="mn-table">${MENU_KEYS.map(([a, k]) => `<tr><td>${a}</td><td>${k}</td></tr>`).join("")}</table></div>
    </div>`;
    const st = document.createElement("style");
    st.textContent = `#menu{position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(8,6,12,.55);z-index:6;font:16px 'Pixelify Sans',monospace;color:#fff6dc}
      #menu .mn-box{width:min(560px,calc(100vw - 32px));max-height:calc(100vh - 32px);overflow:auto;background:#140c16;border:3px solid #f2d070;box-shadow:0 0 0 3px #2a1a2e;padding:16px 18px}
      #menu .mn-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px}
      #menu .mn-title{color:#f2d070;font-size:24px;letter-spacing:3px}
      #menu .mn-x{cursor:pointer;color:#c8b890}
      #menu .mn-tabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}
      #menu button{font:inherit;background:#3a2a3e;color:#fff6dc;border:2px solid #6a5070;padding:5px 10px;cursor:pointer}
      #menu button:hover,#menu .mn-tab.on{border-color:#f2d070;color:#f2d070}
      #menu .mn-page{display:none}#menu .mn-page.on{display:block}
      #menu .mn-row{display:flex;gap:8px;margin:10px 0;align-items:center}
      #menu .mn-row button{flex:1}
      #menu .mn-code{width:110px;font:inherit;font-size:20px;text-transform:uppercase;letter-spacing:4px;background:#0c0810;color:#f2d070;border:2px solid #6a5070;padding:4px 8px}
      #menu .mn-status{min-height:22px;color:#a8e8d8}
      #menu .mn-big{color:#f2d070;font-size:30px;letter-spacing:6px}
      #menu .mn-note{margin:0 0 6px;color:#e8dcc0}
      #menu .mn-list{margin:10px 0 0;padding-left:18px;color:#c8bca0;font-size:14px;line-height:1.45}
      #menu .mn-table{width:100%;border-collapse:collapse}
      #menu .mn-dim{color:#a89880;font-size:13px}
      #menu .mn-beast{padding:5px 0;border-bottom:1px solid #2e2234;font-size:14px}
      #menu .mn-bookwrap{max-height:52vh;overflow:auto}
      #menu .mn-gear{display:flex;flex-direction:column;gap:5px;margin-top:6px}
      #menu .mn-armor{display:flex;align-items:center;gap:8px;text-align:left;background:#1a1220;border:1px solid #4a3a50;color:#f4e6c8;padding:6px 8px;font:inherit;cursor:pointer}
      #menu .mn-armor.on{border-color:#f2d070;background:#2a1e30}
      #menu .mn-armor i{width:10px;height:14px;display:inline-block;border:1px solid #0c0810}
      #menu .mn-armor span{flex:0 0 auto;min-width:120px} #menu .mn-armor small{color:#a89880;font-size:12px}
      #menu .mn-shards{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:4px;font-size:13px}
      #menu .mn-shard i{display:inline-block;width:6px;height:9px;margin-right:5px;transform:rotate(45deg) scale(0.8)}
      #menu .mn-table td{padding:5px 6px;border-bottom:1px solid #2e2234;vertical-align:top}
      #menu .mn-table td:first-child{color:#f2d070;white-space:nowrap;width:34%}
      #menu .mn-vol input{flex:1}`;
    document.head.appendChild(st); document.body.appendChild(el);
    el.addEventListener("click", (e) => {
      const t = e.target, a = t.dataset && t.dataset.a, tab = t.dataset && t.dataset.tab;
      if (e.target === el) return M.toggle(false);
      if (tab) return M.show(tab);
      if (a === "close") M.toggle(false);
      else if (a === "host") Net.host();
      else if (a === "join") Net.join(el.querySelector(".mn-code").value);
      else if (a === "leave") Net.leave();
      else if (a === "save") { window.Game && Game.save(); t.textContent = "Saved"; setTimeout(() => (t.textContent = "Save game"), 1200); }
      else if (a === "quit") { M.toggle(false); window.Game && Game.quit(); }
      else if (a === "mute") { window.Ambience && Ambience.toggleMute(); M.refresh(); }
    });
    el.querySelector('[data-a="vol"]').addEventListener("input", (e) => { const v = +e.target.value; window.Ambience && Ambience.setVolume(v / 100); el.querySelector(".mn-volv").textContent = v + "%"; });
    el.querySelector(".mn-code").addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") Net.join(e.target.value); if (e.key === "Escape") M.toggle(false); });
    M.show(M.tab);
  };
  M.show = function (tab) {
    M.tab = tab;
    for (const b of M.el.querySelectorAll(".mn-tab")) b.classList.toggle("on", b.dataset.tab === tab);
    for (const p of M.el.querySelectorAll(".mn-page")) p.classList.toggle("on", p.dataset.page === tab);
    M.refresh();
  };
  M.toggle = function (v, tab) {
    if (!M.el) M.build();
    M.open = v === undefined ? !M.open : v;
    M.el.style.display = M.open ? "flex" : "none";
    if (M.open) M.show(tab || M.tab); else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  };
  // keys while the menu is open (returns true if the menu used the key)
  M.key = function (e) {
    if (e.code === "Escape") { M.toggle(false); return true; }
    const i = TABS.findIndex(([k]) => k === M.tab);
    if (e.code === "Tab" || e.code === "ArrowRight" || e.code === "ArrowLeft") { e.preventDefault(); const d = e.code === "ArrowLeft" || (e.code === "Tab" && e.shiftKey) ? -1 : 1; M.show(TABS[(i + d + TABS.length) % TABS.length][0]); return true; }
    if (e.code === "KeyC") { M.show("coop"); return true; }
    return true;   // nothing reaches the game while the menu is open
  };
  M.refresh = function () {
    if (!M.el) return;
    const gw = M.el.querySelector(".mn-gearwrap"); if (gw && window.Gear && M.tab === "gear") Gear.renderTab(gw);
    const bw = M.el.querySelector(".mn-bookwrap"); if (bw && window.Gear && M.tab === "book") Gear.renderBook(bw);
    const s = M.el.querySelector(".mn-status"), N = window.Net;
    const code = N && N.role === "host" && N.code && N.count() < N.MAX ? `<div class="mn-big">${N.code}</div>` : "";
    s.innerHTML = code + ((N && N.status) || "Playing solo.");
    const mb = M.el.querySelector('[data-a="mute"]'); if (mb) mb.textContent = window.Ambience && Ambience.muted ? "Unmute" : "Mute";
  };
})();
