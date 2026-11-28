// Touch controls, shown only on phones and tablets (a coarse pointer / touch screen).
//
// Left half of the screen: a floating thumbstick (push it far to run). Right side: Attack, Dodge,
// Use (hold it to revive a partner) and Weapon. Top right: Settings and Co-op. The buttons speak the
// keyboard's language (they send the same key codes), so everything the keyboard can do, they can.
(function () {
  const isTouch = (window.matchMedia && matchMedia("(pointer: coarse)").matches) || ("ontouchstart" in window && navigator.maxTouchPoints > 0);
  const Pad = (window.TouchPad = { enabled: isTouch, x: 0, y: 0, mag: 0, active: false });
  if (!isTouch) return;

  const key = (type, code) => dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
  const st = document.createElement("style");
  st.textContent = `
    html,body{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
    #touch{position:fixed;inset:0;z-index:5;pointer-events:none;font-family:'Pixelify Sans',monospace}
    #touch .tb{position:absolute;pointer-events:auto;display:flex;align-items:center;justify-content:center;border-radius:50%;
      background:rgba(26,18,32,.55);border:2px solid rgba(240,200,120,.75);color:#fff2d0;font-size:15px;font-weight:600;text-shadow:0 1px 0 #000;
      -webkit-tap-highlight-color:transparent}
    #touch .tb.down{background:rgba(240,200,120,.45)}
    #touch .sm{width:44px;height:44px;font-size:12px;border-radius:10px}
    #touch .stick{position:absolute;width:110px;height:110px;margin:-55px 0 0 -55px;border-radius:50%;border:2px solid rgba(240,200,120,.5);background:rgba(26,18,32,.3);display:none}
    #touch .knob{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgba(240,200,120,.6)}
    #touch .rot{position:absolute;left:50%;top:40%;transform:translateX(-50%);padding:10px 14px;background:rgba(20,14,24,.85);color:#ffe08a;border:2px solid #c08a3e;border-radius:8px;font-size:14px;text-align:center;display:none}
    @media (orientation:portrait){#touch .rot{display:block}}`;
  document.head.appendChild(st);
  const el = document.createElement("div"); el.id = "touch";
  el.innerHTML = `<div class="stick"><div class="knob"></div></div><div class="rot">Turn your phone sideways<br>for the best view</div>`;
  document.body.appendChild(el);
  const stick = el.querySelector(".stick"), knob = el.querySelector(".knob"), rot = el.querySelector(".rot");
  rot.addEventListener("pointerdown", () => (rot.style.visibility = "hidden"));

  // buttons: [label, key code, right, bottom, size, hold?]
  const B = [
    ["ATK", "KeyJ", 22, 30, 74], ["ROLL", "Space", 106, 18, 58], ["USE", "KeyE", 32, 116, 56, true], ["WPN", "KeyR", 104, 92, 48],
    ["HEAL", "KeyH", 166, 18, 40], ["SPR", "KeyT", 170, 66, 40],
  ];
  for (const [label, code, r, b, size, hold] of B) {
    const d = document.createElement("div"); d.className = "tb"; d.textContent = label;
    Object.assign(d.style, { right: `calc(${r}px + env(safe-area-inset-right))`, bottom: `calc(${b}px + env(safe-area-inset-bottom))`, width: size + "px", height: size + "px" });
    let id = null;
    d.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); id = e.pointerId; d.setPointerCapture(id); d.classList.add("down"); window.Ambience && Ambience.start(); key("keydown", code); if (!hold) setTimeout(() => key("keyup", code), 60); });
    const up = (e) => { if (e.pointerId !== id) return; id = null; d.classList.remove("down"); if (hold) key("keyup", code); };
    d.addEventListener("pointerup", up); d.addEventListener("pointercancel", up);
    el.appendChild(d);
  }
  for (const [label, code, r] of [["MENU", "Escape", 10], ["CO-OP", "KeyC", 60], ["INV", "KeyI", 110]]) {
    const d = document.createElement("div"); d.className = "tb sm"; d.textContent = label;
    Object.assign(d.style, { right: `calc(${r}px + env(safe-area-inset-right))`, top: `calc(8px + env(safe-area-inset-top))`, width: "46px" });
    d.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); key("keydown", code); setTimeout(() => key("keyup", code), 60); });
    el.appendChild(d);
  }

  // the floating thumbstick: wherever a thumb lands on the left part of the screen
  let sid = null, ox = 0, oy = 0;
  const R = 50;
  addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" || sid !== null || e.clientX > innerWidth * 0.5 || (window.Menu && Menu.open)) return;
    sid = e.pointerId; ox = e.clientX; oy = e.clientY;
    stick.style.display = "block"; stick.style.left = ox + "px"; stick.style.top = oy + "px"; knob.style.transform = "";
    Pad.active = true; Pad.x = Pad.y = Pad.mag = 0;
    window.Ambience && Ambience.start();
  });
  addEventListener("pointermove", (e) => {
    if (e.pointerId !== sid) return;
    let dx = e.clientX - ox, dy = e.clientY - oy; const l = Math.hypot(dx, dy);
    if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    const m = Math.min(1, l / R);
    Pad.mag = m < 0.18 ? 0 : m; Pad.x = l ? dx / Math.min(l, R) * (m < 0.18 ? 0 : 1) : 0; Pad.y = l ? dy / Math.min(l, R) * (m < 0.18 ? 0 : 1) : 0;
  });
  const end = (e) => { if (e.pointerId !== sid) return; sid = null; stick.style.display = "none"; Pad.active = false; Pad.x = Pad.y = Pad.mag = 0; };
  addEventListener("pointerup", end); addEventListener("pointercancel", end);

  // hide the controls while the settings menu is open
  (function tick() { el.style.display = (window.Menu && Menu.open) || (window.Title && Title.open) ? "none" : "block"; requestAnimationFrame(tick); })();
})();
