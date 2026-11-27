// Online co-op with a join code, for up to three heroes.
//
// Players connect browser-to-browser over WebRTC. The PeerJS public broker (0.peerjs.com) only
// introduces them; once connected, game data flows directly. It is a star: each guest talks only to
// the host, and the host passes on whatever one guest says that the other needs (their hero, their
// swings). The host runs the world (enemies, arenas, pickups); each player moves and swings for
// themselves, and the host resolves what the guests' swings hit.
//
// Every hero has a slot: the host is 0, guests are 1 and 2. Messages carry `id` = the sender's slot.
//
// Esc (Settings > Co-op) or C: Host gives you a 5-letter code, Join takes one.
(function () {
  const Net = (window.Net = { role: null, code: null, status: "", conns: [], conn: null, peer: null, slot: 0, MAX: 3 });
  const PREFIX = "kuleana-coop-", LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const LIB = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";

  const open = () => Net.conns.filter((c) => c.open);
  Net.active = () => (Net.role === "host" ? open().length > 0 : !!(Net.conn && Net.conn.open));
  Net.isHost = () => Net.role === "host" && Net.active();
  Net.isGuest = () => Net.role === "guest" && Net.active();
  Net.count = () => (Net.role === "host" ? 1 + open().length : Net.isGuest() ? Net.players || 2 : 1);   // heroes in the game
  const put = (c, m) => { if (c && c.open) try { c.send(m); } catch (e) { /* the channel is closing */ } };
  // host: to every guest (except `but`); guest: to the host
  Net.send = (m, but) => { if (Net.role === "host") { for (const c of open()) if (c.slot !== but) put(c, m); } else put(Net.conn, m); };
  // host only: to one guest by slot
  Net.sendTo = (slot, m) => { const c = open().find((q) => q.slot === slot); put(c, m); };

  let libP = null;
  function loadLib() {
    if (window.Peer) return Promise.resolve();
    if (libP) return libP;
    libP = new Promise((res, rej) => { const s = document.createElement("script"); s.src = LIB; s.onload = res; s.onerror = () => { libP = null; rej(new Error("couldn't load the co-op library (are you online?)")); }; document.head.appendChild(s); });
    return libP;
  }
  const newCode = () => Array.from({ length: 5 }, () => LETTERS[(Math.random() * LETTERS.length) | 0]).join("");
  function setStatus(s) { Net.status = s; ui.update(); }
  function hostStatus() { const n = open().length; setStatus(n === 0 ? `Share this code: ${Net.code}` : n < Net.MAX - 1 ? `${n + 1} heroes. Code ${Net.code} has room for one more.` : `${n + 1} heroes: the party is full.`); }
  // the host tells everyone how many heroes there are
  const roll = () => Net.send({ t: "roster", n: 1 + open().length, slots: [0].concat(open().map((c) => c.slot)) });

  function wireHost(c) {
    const used = new Set(Net.conns.map((q) => q.slot));
    c.slot = [1, 2].find((s) => !used.has(s));
    Net.conns.push(c);
    c.on("open", () => { put(c, { t: "hello", slot: c.slot }); hostStatus(); roll(); Net.onConnect && Net.onConnect(c.slot); });
    c.on("data", (d) => { try { d.id = c.slot; Net.onData && Net.onData(d, c.slot); } catch (e) { console.error(e); } });
    const gone = () => { if (!Net.conns.includes(c)) return; Net.conns = Net.conns.filter((q) => q !== c); hostStatus(); roll(); Net.onDisconnect && Net.onDisconnect("host", c.slot); };
    c.on("close", gone); c.on("error", gone);
  }
  function wireGuest(c) {
    Net.conn = c;
    c.on("open", () => { setStatus("Connected!"); });
    c.on("data", (d) => {
      try {
        if (d.t === "hello") { Net.slot = d.slot; Net.onConnect && Net.onConnect(0); return; }
        if (d.t === "roster") { Net.players = d.n; Net.slots = d.slots; setStatus(`Connected! ${d.n} heroes in the party.`); Net.onRoster && Net.onRoster(d.slots); return; }
        Net.onData && Net.onData(d, 0);
      } catch (e) { console.error(e); }
    });
    const gone = () => { if (Net.conn !== c) return; Net.conn = null; setStatus("Disconnected."); const was = Net.role; Net.role = null; Net.slot = 0; Net.onDisconnect && Net.onDisconnect(was, 0); };
    c.on("close", gone); c.on("error", gone);
  }

  Net.host = async function () {
    Net.leave(true);
    try { await loadLib(); } catch (e) { setStatus(e.message); return; }
    Net.role = "host"; Net.slot = 0;
    const attempt = (tries) => {
      Net.code = newCode(); setStatus("Opening a room...");
      const peer = (Net.peer = new window.Peer(PREFIX + Net.code, { debug: 0 }));
      peer.on("open", () => hostStatus());
      peer.on("connection", (c) => { if (Net.conns.length >= Net.MAX - 1) { c.on("open", () => { put(c, { t: "full" }); setTimeout(() => c.close(), 300); }); return; } wireHost(c); });
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
    peer.on("open", () => {
      const c = peer.connect(PREFIX + code, { reliable: true, serialization: "json" }); wireGuest(c);
      c.on("data", (d) => { if (d && d.t === "full") setStatus("That party is full (3 heroes)."); });
      setTimeout(() => { if (Net.conn === c && !c.open) setStatus("No game found with code " + code + "."); }, 9000);
    });
    peer.on("error", (e) => setStatus(e.type === "peer-unavailable" ? "No game found with code " + code + "." : "Couldn't join: " + (e.type || e.message)));
  };
  Net.leave = function (quiet) {
    const was = Net.role, had = Net.active();
    for (const c of Net.conns) try { c.close(); } catch (e) {}
    if (Net.conn) try { Net.conn.close(); } catch (e) {}
    if (Net.peer) try { Net.peer.destroy(); } catch (e) {}
    Net.conns = []; Net.conn = null; Net.peer = null; Net.role = null; Net.code = null; Net.slot = 0; Net.players = 0;
    if (!quiet) setStatus("Playing solo.");
    if (had && Net.onDisconnect) Net.onDisconnect(was, -1);
  };

  // the co-op controls live in the settings menu (js/menu.js): Esc, or C to jump straight there
  const ui = (Net.ui = {
    toggle: (v) => window.Menu && Menu.toggle(v === undefined ? !(Menu.open && Menu.tab === "coop") : v, "coop"),
    update: () => window.Menu && Menu.refresh(),
  });
})();
