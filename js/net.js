// Online co-op with a join code.
//
// Two players connect browser-to-browser over WebRTC. The PeerJS public broker (0.peerjs.com) only
// introduces the two peers; once connected, game data flows directly between them. The host runs
// the world (enemies, arenas, pickups); each player moves and swings for themselves, and the host
// resolves what the guest's swings hit.
//
// Esc (Settings > Co-op) or C: Host gives you a 5-letter code, Join takes one.
(function () {
  const Net = (window.Net = { role: null, code: null, status: "", conn: null, peer: null });
  const PREFIX = "kuleana-coop-", LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const LIB = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";

  Net.active = () => !!(Net.conn && Net.conn.open);
  Net.isHost = () => Net.role === "host" && Net.active();
  Net.isGuest = () => Net.role === "guest" && Net.active();
  Net.send = (m) => { if (Net.active()) try { Net.conn.send(m); } catch (e) { /* the channel is closing */ } };

  let libP = null;
  function loadLib() {
    if (window.Peer) return Promise.resolve();
    if (libP) return libP;
    libP = new Promise((res, rej) => { const s = document.createElement("script"); s.src = LIB; s.onload = res; s.onerror = () => { libP = null; rej(new Error("couldn't load the co-op library (are you online?)")); }; document.head.appendChild(s); });
    return libP;
  }
  const newCode = () => Array.from({ length: 5 }, () => LETTERS[(Math.random() * LETTERS.length) | 0]).join("");
  function setStatus(s) { Net.status = s; ui.update(); }

  function wire(c) {
    Net.conn = c;
    c.on("open", () => { setStatus(Net.role === "host" ? "Your partner joined." : "Connected!"); Net.onConnect && Net.onConnect(); });
    c.on("data", (d) => { try { Net.onData && Net.onData(d); } catch (e) { console.error(e); } });
    const gone = () => { if (Net.conn !== c) return; Net.conn = null; setStatus(Net.role === "host" ? `Partner left. Code ${Net.code} is still open.` : "Disconnected."); const was = Net.role; if (Net.role === "guest") Net.role = null; Net.onDisconnect && Net.onDisconnect(was); };
    c.on("close", gone); c.on("error", gone);
  }

  Net.host = async function () {
    Net.leave(true);
    try { await loadLib(); } catch (e) { setStatus(e.message); return; }
    Net.role = "host";
    const attempt = (tries) => {
      Net.code = newCode(); setStatus("Opening a room...");
      const peer = (Net.peer = new window.Peer(PREFIX + Net.code, { debug: 0 }));
      peer.on("open", () => setStatus(`Share this code: ${Net.code}`));
      peer.on("connection", (c) => { if (Net.active()) { c.on("open", () => c.close()); return; } wire(c); });
      peer.on("error", (e) => { if (e.type === "unavailable-id" && tries < 4) { peer.destroy(); attempt(tries + 1); } else setStatus("Couldn't open a room: " + (e.type || e.message)); });
      peer.on("disconnected", () => { if (Net.peer === peer && !peer.destroyed) peer.reconnect(); });
    };
    attempt(0);
  };
  Net.join = async function (code) {
    code = (code || "").toUpperCase().replace(/[^A-Z]/g, "");
    if (code.length !== 5) { setStatus("A code is 5 letters."); return; }
    Net.leave(true);
    try { await loadLib(); } catch (e) { setStatus(e.message); return; }
    Net.role = "guest"; Net.code = code; setStatus("Joining " + code + "...");
    const peer = (Net.peer = new window.Peer({ debug: 0 }));
    peer.on("open", () => { const c = peer.connect(PREFIX + code, { reliable: true, serialization: "json" }); wire(c); setTimeout(() => { if (Net.conn === c && !c.open) setStatus("No game found with code " + code + "."); }, 9000); });
    peer.on("error", (e) => setStatus(e.type === "peer-unavailable" ? "No game found with code " + code + "." : "Couldn't join: " + (e.type || e.message)));
  };
  Net.leave = function (quiet) {
    const was = Net.role, had = Net.active();
    if (Net.conn) try { Net.conn.close(); } catch (e) {}
    if (Net.peer) try { Net.peer.destroy(); } catch (e) {}
    Net.conn = null; Net.peer = null; Net.role = null; Net.code = null;
    if (!quiet) setStatus("Playing solo.");
    if (had && Net.onDisconnect) Net.onDisconnect(was);
  };

  // the co-op controls live in the settings menu (js/menu.js): Esc, or C to jump straight there
  const ui = (Net.ui = {
    toggle: (v) => window.Menu && Menu.toggle(v === undefined ? !(Menu.open && Menu.tab === "coop") : v, "coop"),
    update: () => window.Menu && Menu.refresh(),
  });
})();
