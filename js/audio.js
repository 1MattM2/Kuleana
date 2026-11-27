// Ambient soundscape, synthesised with Web Audio (no files needed):
//  - wind that follows the same gusts that bend the plants, with a leafy rustle on top
//  - surf: a low rumble plus the hiss of each wave washing up, timed to the tide on screen
//  - river babble near the water, tropical birds calling from the trees, soft insects
//  - footsteps that change with the ground (sand, grass, stone, wooden bridge)
// Starts on the first key press or click (browsers block audio before that). M mutes.
(function () {
  const Amb = (window.Ambience = { started: false, muted: false, scene: "island" });
  Amb._ac = () => ac; Amb._master = () => master;
  let ac, master, wet, windG, windF, rustleG, surfG, washG, riverG, bugG, bugLfoG, droneG, lapG, cicG, cicF, rumbleG, humG;
  let nextAtmo = 0;
  let nextBird = 0, proxT = 0, oceanProx = 0, riverProx = 0, nearTrees = 1;

  function noiseBuffer(type, secs) {
    const n = ac.sampleRate * secs, buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
    let last = 0, b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (type === "brown") { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
      else if (type === "pink") { b0 = 0.997 * b0 + w * 0.029; b1 = 0.985 * b1 + w * 0.032; b2 = 0.95 * b2 + w * 0.048; d[i] = (b0 + b1 + b2 + w * 0.02) * 1.6; }
      else d[i] = w;
    }
    return buf;
  }
  function loop(buf) { const s = ac.createBufferSource(); s.buffer = buf; s.loop = true; s.start(0, Math.random() * buf.duration); return s; }
  function gain(v) { const g = ac.createGain(); g.gain.value = v; return g; }
  function filt(type, f, q) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 0.7; return b; }
  const set = (p, v, tc) => p.setTargetAtTime(v, ac.currentTime, tc || 0.25);

  Amb.start = function () {
    if (Amb.started) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    Amb.started = true;
    master = gain(0); master.connect(ac.destination);
    set(master.gain, Amb.muted ? 0 : 0.7 * Amb.volume, 0.08);
    // small outdoor "space" for the birds
    const conv = ac.createConvolver(), ir = ac.createBuffer(2, ac.sampleRate * 1.4, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); }
    conv.buffer = ir; wet = gain(0.25); wet.connect(conv); conv.connect(master);

    const white = noiseBuffer("white", 3), pink = noiseBuffer("pink", 4), brown = noiseBuffer("brown", 5);
    // wind
    windF = filt("bandpass", 420, 0.5); windG = gain(0);
    loop(pink).connect(windF); windF.connect(windG); windG.connect(master);
    rustleG = gain(0); const rf = filt("highpass", 2600, 0.6);
    loop(white).connect(rf); rf.connect(rustleG); rustleG.connect(master);
    // surf
    surfG = gain(0); const sf = filt("lowpass", 520, 0.6);
    loop(brown).connect(sf); sf.connect(surfG); surfG.connect(master);
    washG = gain(0); const wf = filt("bandpass", 1500, 0.4);
    loop(white).connect(wf); wf.connect(washG); washG.connect(master);
    // river
    riverG = gain(0); const rvf = filt("bandpass", 900, 1.4), rvm = gain(0.6), rvl = ac.createOscillator();
    rvl.frequency.value = 5.3; const rvlg = gain(0.35); rvl.connect(rvlg); rvlg.connect(rvm.gain); rvl.start();
    loop(pink).connect(rvf); rvf.connect(rvm); rvm.connect(riverG); riverG.connect(master);
    // insects: a soft high buzz that pulses
    bugG = gain(0); const bf = filt("bandpass", 5400, 9), bm = gain(0.5), bl = ac.createOscillator();
    bl.type = "square"; bl.frequency.value = 24; bugLfoG = gain(0.5); bl.connect(bugLfoG); bugLfoG.connect(bm.gain); bl.start();
    loop(white).connect(bf); bf.connect(bm); bm.connect(bugG); bugG.connect(master);
    // sea cave: a deep hum and water lapping in the dark
    droneG = gain(0); const df = filt("lowpass", 150, 0.8), dosc = ac.createOscillator(), dog = gain(0.05);
    dosc.frequency.value = 55; dosc.connect(dog); dog.connect(droneG); dosc.start();
    loop(brown).connect(df); df.connect(droneG); droneG.connect(master); droneG.connect(wet);
    lapG = gain(0); const lf = filt("bandpass", 520, 0.9), lm = gain(0.5), ll = ac.createOscillator(), llg = gain(0.45);
    ll.frequency.value = 0.35; ll.connect(llg); llg.connect(lm.gain); ll.start();
    loop(pink).connect(lf); lf.connect(lm); lm.connect(lapG); lapG.connect(master); lapG.connect(wet);
    // jungle cicadas: band-passed noise pulsed fast, swelling in long waves
    cicG = gain(0); cicF = filt("bandpass", 4300, 5); const cm = gain(0.5), cl = ac.createOscillator(), clg = gain(0.5);
    cl.type = "square"; cl.frequency.value = 47; cl.connect(clg); clg.connect(cm.gain); cl.start();
    loop(white).connect(cicF); cicF.connect(cm); cm.connect(cicG); cicG.connect(master);
    // the volcano: a deep rumble that swells and settles, and the sleeping gate's low hum (two slow-beating tones)
    rumbleG = gain(0); const rbf = filt("lowpass", 85, 1.2); loop(brown).connect(rbf); rbf.connect(rumbleG); rumbleG.connect(master); rumbleG.connect(wet);
    humG = gain(0); for (const [f, v] of [[55, 0.5], [55.6, 0.4], [82.4, 0.25], [110.3, 0.12]]) { const o = ac.createOscillator(), og = gain(v); o.frequency.value = f; o.connect(og); og.connect(humG); o.start(); }
    const hf = filt("lowpass", 240, 0.7); humG.connect(hf); hf.connect(master); hf.connect(wet);
    nextBird = ac.currentTime + 1.5;
  };
  Amb.setScene = function (sc) { Amb.scene = sc; if (wet) set(wet.gain, sc === "cave" || sc === "sanctum" ? 0.7 : 0.25, 0.8); };
  // a water drop falling into the pool, echoing round the cave
  Amb.drip = function () {
    if (!ac || Amb.muted || Amb.scene !== "cave" || Math.random() < 0.5) return;
    const t = ac.currentTime, f = 900 + Math.random() * 1400;
    tone(t, f * 1.6, f, 0.09, 0.05 + Math.random() * 0.04, Math.random() * 1.4 - 0.7, "sine");
  };

  Amb.volume = 1;
  Amb.toggleMute = function () {
    Amb.muted = !Amb.muted;
    if (ac) set(master.gain, Amb.muted ? 0 : 0.7 * Amb.volume, 0.2);
  };
  Amb.setVolume = function (v) { Amb.volume = Math.max(0, Math.min(1, v)); if (ac && !Amb.muted) set(master.gain, 0.7 * Amb.volume, 0.1); };

  // ---------------------------------------------------------------- birds
  function tone(t0, f0, f1, dur, vol, pan, type, vib) {
    const o = ac.createOscillator(), g = ac.createGain(), p = ac.createStereoPanner ? ac.createStereoPanner() : null;
    o.type = type || "sine";
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
    if (vib) { const l = ac.createOscillator(), lg = gain(vib[1]); l.frequency.value = vib[0]; l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0 + dur + 0.05); }
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g);
    if (p) { p.pan.value = pan; g.connect(p); p.connect(master); p.connect(wet); } else { g.connect(master); g.connect(wet); }
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  const CALLS = {
    whistle(t, v, p) { // sweet two-note whistle
      const f = 2100 + Math.random() * 700;
      tone(t, f, f * 1.25, 0.14, v, p, "sine", [28, 40]);
      tone(t + 0.2, f * 1.3, f * 0.9, 0.22, v, p, "sine", [22, 50]);
    },
    trill(t, v, p) {
      const f = 3000 + Math.random() * 900, n = 6 + ((Math.random() * 6) | 0);
      for (let i = 0; i < n; i++) tone(t + i * 0.055, f, f * 1.12, 0.045, v * 0.8, p);
    },
    dove(t, v, p) { // zebra-dove style soft coo
      const f = 560 + Math.random() * 80;
      for (let i = 0; i < 3; i++) tone(t + i * 0.42, f, f * 0.9, 0.3, v * 0.9, p, "triangle", [6, 8]);
    },
    chatter(t, v, p) { // myna chatter
      let tt = t;
      for (let i = 0; i < 5 + ((Math.random() * 4) | 0); i++) {
        const f = 1400 + Math.random() * 2600;
        tone(tt, f, f * (0.7 + Math.random() * 0.7), 0.05 + Math.random() * 0.06, v * 0.7, p, Math.random() < 0.3 ? "triangle" : "sine");
        tt += 0.08 + Math.random() * 0.07;
      }
    },
    gull(t, v, p) { // distant seabird over the surf
      tone(t, 1150, 1650, 0.16, v * 0.5, p, "sawtooth");
      tone(t + 0.18, 1600, 900, 0.3, v * 0.45, p, "sawtooth");
    },
  };

  // ---------------------------------------------------------------- combat sound effects
  // Built like a sound designer layers SFX: every swing is a smooth, Doppler-swept whoosh (no
  // hard starts, so no clicks), blades add a scrape and a short metallic ring, hits are a
  // transient + body + sub, and each element has its own texture (fire roar/crackle, electric
  // buzz/thunder, water rush/splash, stone grind, celestial air + choir, real drums for Kākau).
  let sfxBus, comp, sfxWet, skySend, white = null, pinkB = null, brownB = null, crunchCurve = null;
  function bus() {
    if (sfxBus) return sfxBus;
    comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.18;
    const makeup = ac.createGain(); makeup.gain.value = 1.3;
    sfxBus = ac.createGain(); sfxBus.connect(comp); comp.connect(makeup); makeup.connect(master);
    const ir = (secs, decay) => { const b = ac.createBuffer(2, ac.sampleRate * secs, ac.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = 0; i < d.length; i++) { lp = lp * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = lp * Math.pow(1 - i / d.length, decay); } } return b; };
    const rv = ac.createConvolver(); rv.buffer = ir(1.8, 3);
    sfxWet = ac.createGain(); sfxWet.gain.value = 0.22; sfxBus.connect(sfxWet); sfxWet.connect(rv); rv.connect(comp);
    const rv2 = ac.createConvolver(); rv2.buffer = ir(4.5, 1.6);
    skySend = ac.createGain(); skySend.gain.value = 0.9; skySend.connect(rv2); rv2.connect(comp);
    const n = ac.sampleRate * 3;
    white = ac.createBuffer(1, n, ac.sampleRate); pinkB = ac.createBuffer(1, n, ac.sampleRate); brownB = ac.createBuffer(1, n, ac.sampleRate);
    const w = white.getChannelData(0), pk = pinkB.getChannelData(0), br = brownB.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, l = 0;
    for (let i = 0; i < n; i++) { const x = Math.random() * 2 - 1; w[i] = x; b0 = 0.997 * b0 + x * 0.029; b1 = 0.985 * b1 + x * 0.032; b2 = 0.95 * b2 + x * 0.048; pk[i] = (b0 + b1 + b2 + x * 0.02) * 2.2; l = (l + 0.02 * x) / 1.02; br[i] = l * 3.5; }
    crunchCurve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; crunchCurve[i] = Math.tanh(x * 6); }
    return sfxBus;
  }
  // --- primitives
  function src(buf, t, dur) { const s = ac.createBufferSource(); s.buffer = buf; s.start(t, Math.random() * 1.5, dur + 0.1); return s; }
  function out(node, pan, sky) {
    let n = node;
    if (pan !== undefined && ac.createStereoPanner) { const p = ac.createStereoPanner(); if (Array.isArray(pan)) { p.pan.setValueAtTime(pan[0], pan[2]); p.pan.linearRampToValueAtTime(pan[1], pan[3]); } else p.pan.value = pan; n.connect(p); n = p; }
    n.connect(bus()); if (sky) n.connect(skySend);
  }
  // amplitude envelope: rises over `att`, holds, decays exponentially to the end (never instant on swings)
  function amp(t, att, dur, peak) { const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); return g; }
  function filt2(type, t, f0, f1, dur, q) { const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q || 0.8; f.frequency.setValueAtTime(f0, t); if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur); return f; }
  function noiseLayer(buf, type, t, dur, f0, f1, q, att, peak, pan, sky) { const s = src(buf, t, dur), f = filt2(type, t, f0, f1, dur, q), g = amp(t, att, dur, peak); s.connect(f); f.connect(g); out(g, pan, sky); return f; }
  function oscLayer(type, t, f0, f1, dur, att, peak, pan, sky) { const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); const g = amp(t, att, dur, peak); o.connect(g); out(g, pan, sky); o.start(t); o.stop(t + dur + 0.05); return o; }
  const rnd = (a, b) => a + Math.random() * (b - a);

  // swish of air: band-passed pink noise, filter sweeps up then down (Doppler), pans across
  function whoosh(t, dur, lo, hi, peak) {
    bus();
    const dir = Math.random() < 0.5 ? -1 : 1, pan = [-0.55 * dir, 0.55 * dir, t, t + dur];
    const s = src(pinkB, t, dur), f = ac.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 1.1;
    f.frequency.setValueAtTime(lo, t); f.frequency.exponentialRampToValueAtTime(hi, t + dur * 0.42); f.frequency.exponentialRampToValueAtTime(lo * 0.7, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + dur * 0.42); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); out(g, pan);
    // the low "body" of a heavy object moving
    const s2 = src(brownB, t, dur), f2 = filt2("lowpass", t, lo * 0.8, hi * 0.35, dur * 0.42, 0.7), g2 = ac.createGain();
    g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(peak * 0.7, t + dur * 0.45); g2.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s2.connect(f2); f2.connect(g2); out(g2, pan);
  }
  // sharpened steel: an airy scrape along the edge and a short inharmonic ring
  function steel(t, f, peak, len) {
    noiseLayer(white, "bandpass", t, 0.22, f * 1.8, f * 3.2, 3, 0.05, peak * 2.2, rnd(-0.3, 0.3));
    for (const [m, v, d] of [[1, 1, 1], [2.32, 0.5, 0.7], [4.25, 0.28, 0.5], [6.63, 0.16, 0.35]]) oscLayer("sine", t + 0.01, f * m * rnd(0.995, 1.005), f * m * 0.97, Math.min(0.22, len || 0.22) * d, 0.006, peak * v * 0.3, rnd(-0.2, 0.2));
  }
  // contact: a fast transient + a weighty body + sub (hits are meant to be sharp)
  function impact(t, weight, pan) {
    noiseLayer(white, "lowpass", t, 0.05, 3500, 1500, 0.7, 0.001, 0.9 * weight, pan);
    noiseLayer(brownB, "bandpass", t, 0.18 + 0.1 * weight, 380, 160, 1.2, 0.002, 1.1 * weight, pan);
    oscLayer("sine", t, 120 + 30 * weight, 42, 0.22 + 0.15 * weight, 0.002, 0.9 * weight, pan);
  }
  function straw(t, peak) { for (let k = 0; k < 4; k++) noiseLayer(white, "bandpass", t + k * 0.012, 0.06, rnd(1800, 3500), 1200, 1.5, 0.002, peak * rnd(0.5, 1)); }
  // fire
  function roar(t, dur, peak) { noiseLayer(brownB, "lowpass", t, dur, 300, 900, 0.8, dur * 0.25, peak * 1.6); noiseLayer(pinkB, "bandpass", t, dur, 600, 1400, 0.9, dur * 0.3, peak * 0.9, rnd(-0.3, 0.3)); }
  function crackle(t, dur, count, peak) { for (let k = 0; k < count; k++) noiseLayer(white, "bandpass", t + Math.random() * dur, rnd(0.008, 0.022), rnd(1800, 6000), 0, 3, 0.001, peak * rnd(0.3, 1), rnd(-0.6, 0.6)); }
  // electricity: distorted saw buzz, chopped by a jittering gate, plus hiss
  function buzz(t, dur, peak) {
    bus();
    const g = amp(t, 0.01, dur, peak), gate = ac.createGain(), sh = ac.createWaveShaper(); sh.curve = crunchCurve;
    const bp = filt2("bandpass", t, 1600, 2600, dur, 0.6);
    for (const f of [rnd(70, 95), rnd(110, 140)]) { const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = f; o.connect(sh); o.start(t); o.stop(t + dur + 0.05); }
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.type = "square"; lfo.frequency.setValueAtTime(rnd(28, 45), t); lfo.frequency.linearRampToValueAtTime(rnd(60, 90), t + dur); lg.gain.value = 0.5;
    gate.gain.value = 0.5; lfo.connect(lg); lg.connect(gate.gain); lfo.start(t); lfo.stop(t + dur + 0.05);
    sh.connect(bp); bp.connect(gate); gate.connect(g); out(g, rnd(-0.4, 0.4));
    noiseLayer(white, "highpass", t, dur, 4500, 7000, 0.7, 0.01, peak * 0.6);
  }
  // electricity, baked once: clustered discharge snaps riding a hard-clipped 120Hz buzz (an arc tearing the air)
  let arcB = null;
  function arcBuf() {
    if (arcB) return arcB;
    const sr = ac.sampleRate, n = Math.floor(sr * 3); arcB = ac.createBuffer(1, n, sr); const d = arcB.getChannelData(0);
    let env = 0, rate = 0, nextRate = 0, ph = 0;
    for (let i = 0; i < n; i++) {
      if (i >= nextRate) { rate = Math.random() < 0.35 ? rnd(500, 1400) : rnd(40, 220); nextRate = i + sr * rnd(0.008, 0.05); }
      if (Math.random() < rate / sr) env = Math.min(1.6, env + rnd(0.5, 1.3));
      env *= 0.9966; ph += 120 / sr;
      const v = (Math.random() * 2 - 1) * env + ((ph % 1) * 2 - 1) * 0.28 * (0.25 + env);
      d[i] = Math.tanh(v * 2.6) * 0.8;
    }
    return arcB;
  }
  function arc(t, dur, peak, f0, f1, sky) { const s = src(arcBuf(), t, dur), f = filt2("highpass", t, f0 || 1200, f1 || f0 || 1200, dur, 0.7), g = amp(t, 0.003, dur, peak); s.connect(f); f.connect(g); out(g, rnd(-0.5, 0.5), sky); }
  // a distorted sawtooth sweeping down: the "zzap" of a bolt
  function zapChirp(t, dur, f0, f1, peak) {
    const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const pre = gain(3), sh = ac.createWaveShaper(); sh.curve = crunchCurve; const hp = filt2("highpass", t, 300, 300, dur, 0.7), g = amp(t, 0.002, dur, peak);
    o.connect(pre); pre.connect(sh); sh.connect(hp); hp.connect(g); out(g, rnd(-0.3, 0.3)); o.start(t); o.stop(t + dur + 0.05);
  }
  // a hard distorted burst: the crack of the strike and the blast of air behind it
  function blast(t, buf, dur, f0, f1, peak, type, sky) {
    const s = src(buf, t, dur), pre = gain(6), sh = ac.createWaveShaper(); sh.curve = crunchCurve;
    const f = filt2(type, t, f0, f1, dur, 0.9), g = amp(t, 0.0008, dur, peak); s.connect(pre); pre.connect(sh); sh.connect(f); f.connect(g); out(g, 0, sky);
  }
  function thunder(t, peak, short) {
    blast(t, white, 0.09, 700, 2200, 1.3 * peak, "highpass", true);                 // the crack
    arc(t, 0.38, 0.9 * peak, 2600, 800);                                              // the bolt tearing down
    zapChirp(t, 0.2, 2400, 70, 0.35 * peak);
    blast(t + 0.01, brownB, 0.9, 1100, 110, 1.5 * peak, "lowpass", true);            // the blast of air
    oscLayer("sine", t, 95, 24, 1.5, 0.004, 1.1 * peak);                              // sub drop
    const rolls = short ? 2 : 6;
    for (let k = 0; k < rolls; k++) noiseLayer(brownB, "lowpass", t + 0.15 + k * rnd(0.16, 0.34), rnd(1.0, 2.1), rnd(420, 820), 55, 0.8, rnd(0.05, 0.2), rnd(0.8, 1.25) * peak, rnd(-0.6, 0.6), true);   // rolling away
    crackle(t + 0.05, short ? 0.3 : 0.7, short ? 8 : 20, 0.8 * peak);                // aftershocks
  }
  // water
  function splash(t, peak) { noiseLayer(white, "bandpass", t, 0.45, 2600, 700, 1.1, 0.008, peak * 1.6, rnd(-0.3, 0.3)); noiseLayer(brownB, "lowpass", t + 0.03, 0.5, 900, 250, 0.7, 0.05, peak * 1.2); }
  function rush(t, dur, peak) { const f = noiseLayer(pinkB, "bandpass", t, dur, 500, 1500, 1.4, dur * 0.4, peak * 1.6); const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = rnd(3, 6); lg.gain.value = 250; l.connect(lg); lg.connect(f.frequency); l.start(t); l.stop(t + dur); }
  function air(t, dur, peak) { noiseLayer(pinkB, "highpass", t, dur, 3500, 7000, 0.5, dur * 0.5, peak, rnd(-0.4, 0.4), true); }   // bright breathy shimmer (not tonal)
  // stone
  function grind(t, dur, peak) { const f = noiseLayer(brownB, "bandpass", t, dur, 260, 180, 2, 0.02, peak * 2.4); for (let k = 0; k < 6; k++) noiseLayer(white, "bandpass", t + Math.random() * dur, 0.05, rnd(500, 1400), 300, 2, 0.002, peak * rnd(0.4, 0.9)); }
  // choir: two detuned saws per note through "ah" vowel formants, slow swell
  function choir(t, dur, notes, peak) {
    bus();
    const g = amp(t, dur * 0.45, dur, peak), f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(), mix = ac.createGain();
    f1.type = "bandpass"; f1.frequency.value = 760; f1.Q.value = 5; f2.type = "bandpass"; f2.frequency.value = 1150; f2.Q.value = 6; mix.gain.value = 1;
    for (const n of notes) for (const d of [-9, 0, 8]) { const o = ac.createOscillator(); o.type = "sawtooth"; o.frequency.value = n; o.detune.value = d; const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = rnd(4.5, 5.5); vg.gain.value = 4; vib.connect(vg); vg.connect(o.detune); o.connect(f1); o.connect(f2); o.start(t); o.stop(t + dur + 0.05); vib.start(t); vib.stop(t + dur + 0.05); }
    f1.connect(mix); f2.connect(mix); mix.connect(g); out(g, 0, true);
  }
  // drums: pahu (deep shark-skin drum) and ipu (gourd drum: a hollow boom and a slap)
  function pahu(t, peak) { oscLayer("sine", t, 120, 52, 0.55, 0.002, peak); noiseLayer(brownB, "lowpass", t, 0.2, 600, 200, 0.8, 0.001, peak * 1.2); noiseLayer(white, "bandpass", t, 0.03, 1500, 900, 1, 0.001, peak * 0.35); }
  function ipu(t, peak, slap) { oscLayer("sine", t, 190, 115, 0.24, 0.002, peak * 0.9); noiseLayer(brownB, "bandpass", t, 0.25, 210, 160, 5, 0.002, peak * 1.6); if (slap) noiseLayer(white, "bandpass", t + slap, 0.05, 900, 600, 2, 0.001, peak * 0.9); }
  function chainRattle(t, dur, count, peak) { for (let k = 0; k < count; k++) { const tt = t + (k / count) * dur + rnd(-0.004, 0.004); noiseLayer(white, "bandpass", tt, 0.03, rnd(3500, 6500), 0, 9, 0.001, peak * rnd(0.4, 1)); oscLayer("triangle", tt, rnd(2600, 4200), rnd(2400, 4000), 0.04, 0.001, peak * 0.08); } }

  // ---- the elemental layer -------------------------------------------------------------
  // a harp, plucked: Karplus-Strong strings baked once per note (a soft finger pluck, warm body,
  // lower notes ring longer). Tuned to D major pentatonic so any run of notes sounds right.
  const HARP = [146.8, 164.8, 185, 220, 246.9, 293.7, 329.6, 370, 440, 493.9, 587.3, 659.3, 740];
  const ksCache = new Map();
  function ks(f) {
    if (ksCache.has(f)) return ksCache.get(f);
    const sr = ac.sampleRate, dur = 0.7, n = Math.floor(sr * dur), b = ac.createBuffer(1, n, sr), d = b.getChannelData(0);
    const N = Math.max(2, Math.round(sr / f)), line = new Float32Array(N);
    let lp = 0, mean = 0;
    for (let i = 0; i < N; i++) { lp += (Math.random() * 2 - 1 - lp) * 0.45; line[i] = lp; mean += lp; }
    mean /= N; for (let i = 0; i < N; i++) line[i] -= mean;
    const pos = Math.round(N * 0.18); for (let i = N - 1; i >= pos; i--) line[i] -= line[i - pos] * 0.6;   // plucked near the end: a rounder tone
    const loss = 0.995 - f / 160000;
    let idx = 0, prev = 0, peak = 1e-6;
    for (let i = 0; i < n; i++) { const c = line[idx]; line[idx] = loss * 0.5 * (c + prev); prev = c; d[i] = c; idx = idx + 1 === N ? 0 : idx + 1; if (Math.abs(c) > peak) peak = Math.abs(c); }
    for (let i = 0; i < n; i++) d[i] = (d[i] / peak) * Math.exp(-i / (sr * 0.16)) * Math.min(1, (n - i) / (sr * 0.05));   // damped: a short pluck
    ksCache.set(f, b); return b;
  }
  function harp(t, f, peak, pan) {
    const s = ac.createBufferSource(); s.buffer = ks(f);
    const lp = filt2("lowpass", t, 3600, 1600, 0.5, 0.5), g = ac.createGain(); g.gain.setValueAtTime(peak, t);
    s.connect(lp); lp.connect(g); out(g, pan); s.start(t);                         // dry: no long sky reverb
    noiseLayer(white, "bandpass", t, 0.012, f * 6, f * 6, 2, 0.0005, peak * 0.25, pan);   // the finger's pick
  }
  // a tiny blade slash: a quick bright cut of air
  function slashlet(t, peak, pan) { noiseLayer(white, "bandpass", t, 0.08, 1800, 6500, 1.6, 0.012, peak, pan); }
  // a flurry: harp notes in quick succession with small slashes between them
  function flurry(t, from, count, step, peak, dir) {
    for (let k = 0; k < count; k++) {
      const i = Math.max(0, Math.min(HARP.length - 1, from + k * (dir || 1))), pan = -0.6 + 1.2 * (k / Math.max(1, count - 1));
      harp(t + k * step, HARP[i], peak * (0.8 + 0.2 * Math.random()), pan);
      if (k % 2 === 0) slashlet(t + k * step + step * 0.5, peak * 0.9, -pan);
    }
  }
  // a glissando across the strings (up, down, or both)
  function gliss(t, from, count, step, peak, dir) { for (let k = 0; k < count; k++) { const i = Math.max(0, Math.min(HARP.length - 1, from + k * (dir || 1))); harp(t + k * step, HARP[i], peak * (0.7 + 0.3 * k / count), -0.6 + 1.2 * (k / Math.max(1, count - 1))); } }

  // water: bubbles are tiny rising chirps (a bubble's pitch rises as it forms); a gush is a surge of
  // churning low water with foam hiss on top and a crowd of bubbles inside it
  function bubbles(t, dur, count, f0, f1, peak) { for (let k = 0; k < count; k++) { const tt = t + Math.pow(Math.random(), 1.4) * dur, f = rnd(f0, f1); oscLayer("sine", tt, f, f * rnd(1.6, 2.6), rnd(0.025, 0.07), 0.002, peak * rnd(0.3, 1), rnd(-0.6, 0.6)); } }
  function gush(t, dur, peak) {
    const s = src(brownB, t, dur), f = ac.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 2.5;
    f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(1400, t + dur * 0.3); f.frequency.exponentialRampToValueAtTime(380, t + dur);
    const l = ac.createOscillator(), lg = ac.createGain(); l.type = "triangle"; l.frequency.value = rnd(7, 11); lg.gain.value = 220; l.connect(lg); lg.connect(f.frequency); l.start(t); l.stop(t + dur + 0.05);
    const g = amp(t, dur * 0.18, dur, peak * 2.6); s.connect(f); f.connect(g); out(g, rnd(-0.3, 0.3));
    rush(t, dur, peak * 0.9);
    noiseLayer(white, "highpass", t + dur * 0.1, dur * 0.8, 2500, 5000, 0.6, dur * 0.3, peak * 0.35, rnd(-0.5, 0.5));
    bubbles(t, dur, Math.round(dur * 70), 260, 900, peak * 0.3);
  }

  // fire: a baked flame texture (rumbling noise that flutters like a real flame); the ignition
  // "fwoomp" is a fast low sweep with a falling sub; crackle is sparse sharp pops
  let flameB = null;
  function flameBuf() {
    if (flameB) return flameB;
    const sr = ac.sampleRate, n = sr * 3; flameB = ac.createBuffer(1, n, sr); const d = flameB.getChannelData(0), br = brownB.getChannelData(0), pk = pinkB.getChannelData(0);
    let env = 0.7, tgt = 0.7, nxt = 0;
    for (let i = 0; i < n; i++) { if (i >= nxt) { tgt = 0.35 + Math.random() * 0.65; nxt = i + sr * rnd(0.03, 0.09); } env += (tgt - env) * 0.0016; d[i] = (br[i % br.length] * 0.75 + pk[i % pk.length] * 0.35) * env; }
    return flameB;
  }
  function flame(t, dur, peak, f0, f1) {
    const s = ac.createBufferSource(); s.buffer = flameBuf(); s.start(t, Math.random() * 2, dur + 0.1);
    const f = filt2("lowpass", t, f0 || 500, f1 || 1500, dur, 0.9), g = amp(t, dur * 0.2, dur, peak * 2.4); s.connect(f); f.connect(g); out(g, rnd(-0.3, 0.3));
    const s2 = ac.createBufferSource(); s2.buffer = flameB; s2.start(t, Math.random() * 2, dur + 0.1);
    const f2 = filt2("bandpass", t, 900, 2200, dur, 0.7), g2 = amp(t, dur * 0.3, dur, peak * 0.9); s2.connect(f2); f2.connect(g2); out(g2, rnd(-0.4, 0.4));
  }
  function ignite(t, peak) {
    const s = src(brownB, t, 0.6), f = ac.createBiquadFilter(); f.type = "lowpass"; f.Q.value = 1.4;
    f.frequency.setValueAtTime(110, t); f.frequency.exponentialRampToValueAtTime(2400, t + 0.07); f.frequency.exponentialRampToValueAtTime(260, t + 0.6);
    const g = amp(t, 0.03, 0.6, peak * 3); s.connect(f); f.connect(g); out(g);
    oscLayer("sine", t, 110, 36, 0.45, 0.01, peak * 0.9);
    flame(t + 0.04, 0.75, peak * 0.8);
    crackle(t + 0.06, 0.8, 18, peak * 0.9);
  }

  // weight and menace: a distorted crunch for contact, a sub "thoom" at the peak of heavy swings
  function crunch(t, weight, pan) {
    const s = src(brownB, t, 0.12), sh = ac.createWaveShaper(); sh.curve = crunchCurve;
    const pre = ac.createGain(); pre.gain.value = 3; const f = filt2("bandpass", t, 900, 420, 0.12, 0.9), g = amp(t, 0.002, 0.12 + weight * 0.05, 0.5 * weight);
    s.connect(pre); pre.connect(sh); sh.connect(f); f.connect(g); out(g, pan);
  }
  function thoom(t, peak) { oscLayer("sine", t, 62, 30, 0.55, 0.03, peak); noiseLayer(brownB, "lowpass", t, 0.5, 180, 70, 1.2, 0.04, peak * 1.2); }
  // a war cry: several raspy voices shouting "hoo-AH" through vowel formants, under drums
  function shout(t, dur, f0, peak, pan) {
    const o = ac.createOscillator(); o.type = "sawtooth";
    o.frequency.setValueAtTime(f0 * 0.82, t); o.frequency.linearRampToValueAtTime(f0 * 1.15, t + dur * 0.35); o.frequency.linearRampToValueAtTime(f0 * 0.78, t + dur);
    const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = rnd(5, 7); vg.gain.value = 18; vib.connect(vg); vg.connect(o.detune);
    const sh = ac.createWaveShaper(); sh.curve = crunchCurve; const pre = ac.createGain(); pre.gain.value = 0.6;
    const mix = ac.createGain(), g = amp(t, 0.05, dur, peak);
    for (const [a, b, q, v] of [[430, 760, 7, 1], [780, 1180, 8, 0.7], [2400, 2600, 10, 0.25]]) { const f = ac.createBiquadFilter(); f.type = "bandpass"; f.Q.value = q; f.frequency.setValueAtTime(a, t); f.frequency.linearRampToValueAtTime(b, t + dur * 0.45); const fg = ac.createGain(); fg.gain.value = v; sh.connect(f); f.connect(fg); fg.connect(mix); }
    o.connect(pre); pre.connect(sh); mix.connect(g); out(g, pan, true);
    o.start(t); o.stop(t + dur + 0.05); vib.start(t); vib.stop(t + dur + 0.05);
    noiseLayer(pinkB, "bandpass", t, dur * 0.8, 1400, 900, 1.2, 0.03, peak * 0.5, pan);   // breath
  }
  // materials the blows land on
  function knock(t, peak) { for (const [f, q, v] of [[340, 14, 1.6], [760, 10, 0.9], [1500, 8, 0.4]]) noiseLayer(white, "bandpass", t, 0.14, f, f * 0.94, q, 0.001, peak * v); noiseLayer(white, "highpass", t, 0.02, 3000, 3000, 0.7, 0.001, peak * 0.6); }
  function squelch(t, peak) { noiseLayer(white, "bandpass", t, 0.18, 2800, 600, 2.2, 0.002, peak * 1.3); noiseLayer(brownB, "lowpass", t, 0.16, 700, 220, 1.5, 0.004, peak * 1.2); for (let k = 0; k < 4; k++) noiseLayer(white, "highpass", t + k * 0.02 + rnd(0, 0.02), 0.04, 4200, 4200, 0.7, 0.002, peak * 0.4); }
  function sizzle(t, dur, peak) { noiseLayer(white, "highpass", t, dur, 6000, 3500, 0.7, 0.005, peak); crackle(t, dur, 8, peak * 0.8); }
  const ELEM = { heel: "fire", maul: "fire", tide: "water", glowtide: "water", storm: "storm", starfall: "sky", stone: "stone", koi: "stone", kakau: "drum" };
  const elem = () => { const C = window.Combat; const w = C && C.weapons && C.weapons[C.cur]; return (w && ELEM[w.id]) || "steel"; };

  Amb.sfx = function (kind) {
    if (!ac || Amb.muted) return;
    if (ac.state === "suspended") ac.resume();
    bus();
    const t = ac.currentTime + 0.01, r = rnd(0.92, 1.08), el = elem();
    switch (kind) {
      // ---- physical swings: air with weight. Elemental weapons carry their element through every swing.
      case "swing":     whoosh(t, 0.3 * r, 300, 2000 * r, 1.0); steel(t + 0.05, 1500 * r, 0.05, 0.22); elementSwing(t, 0.3); break;
      case "slash":     whoosh(t, 0.2 * r, 600, 3800 * r, 0.95); steel(t + 0.03, 2200 * r, 0.05, 0.16); elementSwing(t, 0.2); break;
      case "heavy":     whoosh(t, 0.46 * r, 150, 900 * r, 1.3); thoom(t + 0.16, 0.5); elementSwing(t, 0.46); break;
      case "hit":       impact(t, 0.9); crunch(t, 0.7); straw(t, 0.35); break;
      case "crit":      impact(t, 1.3); crunch(t, 1.2); steel(t, 1300, 0.07, 0.25); noiseLayer(brownB, "lowpass", t, 0.7, 500, 60, 0.7, 0.01, 0.8, 0, true); break;
      case "boom":      impact(t, 1.6); crunch(t, 1.4); thoom(t, 0.9); noiseLayer(brownB, "lowpass", t + 0.02, 1.6, 700, 50, 0.7, 0.02, 1.4, 0, true); crackle(t + 0.05, 0.5, 10, 0.4);
                        if (el === "fire") ignite(t, 0.8); else if (el === "water") { gush(t, 0.9, 0.8); splash(t, 1.1); } else if (el === "sky") flurry(t, 8, 4, 0.04, 0.4, -1); else if (el === "stone") grind(t, 0.6, 0.8); break;
      case "bite":      whoosh(t, 0.18, 500, 2400, 0.8); impact(t + 0.12, 1.1); crunch(t + 0.12, 1.1); noiseLayer(white, "bandpass", t + 0.12, 0.08, 2600, 1800, 1.4, 0.002, 0.9); break;
      case "chop":      impact(t, 1.0); crunch(t, 0.9); knock(t, 0.6); break;
      case "stone":     impact(t, 1.3); crunch(t, 1.2); grind(t, 0.55, 0.8); break;
      case "guardHit":  knock(t, 1.0); steel(t, 1700, 0.06, 0.12); noiseLayer(white, "bandpass", t, 0.12, 3200, 1800, 2, 0.001, 0.7); break;   // a blow glancing off a guard
      // ---- fire: ignition, a fluttering roar, sharp crackle
      case "fire":      whoosh(t, 0.42, 250, 1400, 0.9); ignite(t + 0.02, 0.85); break;
      case "hitFire":   flame(t, 0.45, 0.7, 800, 2400); sizzle(t, 0.35, 0.5); crackle(t, 0.4, 12, 0.9); break;
      // ---- storm
      case "stormSwing": whoosh(t, 0.3, 450, 2800, 0.9); arc(t + 0.03, 0.3, 0.7, 1500, 3000); zapChirp(t + 0.05, 0.14, 1800, 160, 0.22); break;
      case "zap":       arc(t, 0.34, 0.95, 1200, 2600); zapChirp(t, 0.18, 2600, 90, 0.3); buzz(t, 0.3, 0.5); break;
      case "strike":    thunder(t, 0.9, true); break;
      case "thunder":   thunder(t, 1.0); break;
      case "stormCast": noiseLayer(brownB, "lowpass", t, 2.6, 110, 520, 0.8, 1.0, 1.8, 0, true); noiseLayer(pinkB, "bandpass", t, 2.4, 300, 1200, 0.8, 1.0, 1.1);   // the storm drawing in
                        for (let k = 0; k < 5; k++) arc(t + 0.1 + k * 0.1, 0.12, 0.25 + k * 0.08, 2000, 3500);   // static building
                        thunder(t + 0.6, 1.05); break;
      case "hitStorm":  blast(t, white, 0.05, 900, 2400, 0.6, "highpass"); arc(t, 0.2, 0.8, 1500, 3000); break;
      // ---- water: gushing surges and bubbling foam
      case "water":     whoosh(t, 0.36, 250, 1500, 0.7); gush(t, 0.6, 0.85); splash(t + 0.12, 0.5); break;
      case "glowSwing": whoosh(t, 0.38, 250, 1400, 0.6); gush(t, 0.65, 0.75); air(t + 0.05, 0.6, 0.3); break;
      case "glowBurst": gush(t, 1.3, 1.1); noiseLayer(brownB, "lowpass", t, 1.2, 100, 600, 0.7, 0.6, 1.4); bubbles(t + 0.2, 1.0, 50, 200, 700, 0.35); choir(t + 0.1, 1.4, [147, 220], 0.06);
                        splash(t + 1.0, 1.4); impact(t + 1.0, 1.3); crunch(t + 1.0, 1.0); thoom(t + 1.0, 0.8); break;
      case "hitWater":  splash(t, 0.8); bubbles(t + 0.03, 0.3, 16, 300, 1000, 0.3); break;
      // ---- celestial: a harp, played hard
      case "celSwing":  whoosh(t, 0.24, 450, 3200, 0.8); flurry(t + 0.02, 4 + ((Math.random() * 4) | 0), 4, 0.042, 0.34, Math.random() < 0.7 ? 1 : -1); thoom(t + 0.08, 0.22); break;
      case "celHit":    impact(t, 1.4); crunch(t, 1.0); flurry(t, 9 + ((Math.random() * 3) | 0), 3, 0.035, 0.38, -1); noiseLayer(brownB, "lowpass", t, 0.5, 900, 80, 0.7, 0.01, 0.9); break;
      case "celFinale": flurry(t, 0, 13, 0.05, 0.4, 1); flurry(t + 0.68, 12, 13, 0.04, 0.36, -1); for (const k of [0, 3, 5, 8]) harp(t + 1.25, HARP[k], 0.45);
                        impact(t + 1.25, 1.4); crunch(t + 1.25, 1.1); thoom(t + 1.25, 0.9); break;
      case "hitStar":   harp(t, HARP[8 + ((Math.random() * 4) | 0)], 0.3); slashlet(t + 0.02, 0.35); break;
      case "chime":     if (el === "sky") { harp(t, HARP[5 + ((Math.random() * 6) | 0)], 0.28); slashlet(t + 0.03, 0.25); } else if (el === "water") bubbles(t, 0.25, 10, 400, 1200, 0.3); else air(t, 0.5, 0.3); break;
      // ---- Kākau: drums
      case "drum":      pahu(t, 1.1); break;
      case "chant":     ipu(t, 1.0, 0.11); break;
      case "tribalHit": ipu(t, 1.1, 0.1); impact(t + 0.1, 0.7); crunch(t + 0.1, 0.6); break;
      case "tribalSwing": whoosh(t, 0.3, 300, 1600, 0.7); ipu(t + 0.06, 1.0, 0.13); break;
      case "tribalFinale": for (let k = 0; k < 10; k++) pahu(t + k * (0.16 - k * 0.008), 0.6 + k * 0.05); shout(t + 0.2, 0.7, 120, 0.25, -0.3); shout(t + 0.25, 0.7, 142, 0.22, 0.3);
                        pahu(t + 1.05, 1.5); impact(t + 1.05, 1.5); crunch(t + 1.05, 1.2); noiseLayer(brownB, "lowpass", t + 1.05, 1.3, 800, 60, 0.7, 0.01, 1.3, 0, true); break;
      case "hitTribal": ipu(t, 0.7); break;
      // ---- chain sickle
      case "chainWhip": whoosh(t, 0.24, 700, 3800, 0.9); chainRattle(t, 0.16, 7, 0.5); steel(t + 0.14, 2200, 0.05, 0.2); break;
      case "chainSpin": for (let k = 0; k < 3; k++) whoosh(t + k * 0.16, 0.24, 400, 2400, 0.8); chainRattle(t, 0.45, 12, 0.45); break;
      case "chainThrow": whoosh(t, 0.42, 400, 4000, 1.0); chainRattle(t, 0.35, 16, 0.5); steel(t + 0.3, 1600, 0.06, 0.25); impact(t + 0.32, 0.5); break;
      // ---- player
      case "roll":      whoosh(t, 0.3, 300, 1500, 0.6); noiseLayer(brownB, "lowpass", t + 0.05, 0.25, 500, 200, 0.7, 0.03, 0.5); break;
      case "hurt":      impact(t, 1.1); crunch(t, 0.9); noiseLayer(white, "bandpass", t, 0.12, 900, 500, 1, 0.002, 0.6); oscLayer("sawtooth", t, 200, 110, 0.18, 0.005, 0.12); break;
      case "perfect":   noiseLayer(pinkB, "highpass", t, 0.6, 6000, 2000, 0.6, 0.004, 0.6, 0, true); oscLayer("sine", t, 50, 40, 0.6, 0.01, 0.6); whoosh(t, 0.4, 2000, 600, 0.7); break;
      case "portal":    noiseLayer(pinkB, "bandpass", t, 1.4, 200, 2400, 1.2, 0.8, 0.9, 0, true); oscLayer("sine", t, 60, 120, 1.2, 0.5, 0.5, 0, true); gliss(t + 0.3, 0, 6, 0.09, 0.18, 1); break;
      case "pickup":    noiseLayer(pinkB, "bandpass", t, 0.9, 400, 3000, 1.2, 0.4, 0.8, 0, true); impact(t + 0.5, 0.8); ignite(t + 0.5, 0.5); break;
      case "berry":     oscLayer("sine", t, 320, 620, 0.06, 0.002, 0.35); noiseLayer(white, "bandpass", t, 0.06, 2400, 1600, 2, 0.002, 0.4); harp(t + 0.04, HARP[3], 0.18); harp(t + 0.1, HARP[5], 0.14); break;
      // ---- arenas
      case "sealUp":    grind(t, 0.9, 1.0); ignite(t + 0.1, 0.6); thoom(t, 0.7); break;
      case "sealDown":  grind(t, 0.6, 0.7); noiseLayer(pinkB, "bandpass", t + 0.2, 1.0, 2400, 300, 0.9, 0.05, 0.6, 0, true); thoom(t, 0.4); break;
      case "warcry":    shout(t, 0.75, 118, 0.3, -0.4); shout(t + 0.04, 0.72, 134, 0.26, 0.4); shout(t + 0.08, 0.7, 152, 0.2, 0); pahu(t, 0.9); pahu(t + 0.28, 0.8); break;
      case "land":      impact(t, 0.6); noiseLayer(brownB, "lowpass", t, 0.3, 600, 150, 0.7, 0.005, 0.7); break;
      // ---- creatures
      case "mat_wood":  knock(t, 0.9); crackle(t, 0.12, 4, 0.5); break;                          // a blade biting carved koa
      case "mat_plant": squelch(t, 0.9); break;                                                  // a wet green stalk
      case "mat_fire":  sizzle(t, 0.3, 0.6); flame(t, 0.25, 0.4, 700, 1800); break;              // striking living flame
      case "mat_flesh": noiseLayer(brownB, "lowpass", t, 0.14, 420, 160, 1, 0.002, 1.0); noiseLayer(white, "bandpass", t, 0.08, 1100, 500, 1.4, 0.002, 0.4); break;
      case "geckoHiss": noiseLayer(white, "bandpass", t, 0.3, 4200, 3000, 1.5, 0.02, 0.5); break;
      case "vineRustle": for (let k = 0; k < 6; k++) noiseLayer(white, "bandpass", t + k * rnd(0.03, 0.07), 0.08, rnd(2500, 4500), 1800, 1.2, 0.01, 0.35); break;
      case "vineHiss":  noiseLayer(white, "bandpass", t, 0.5, 3200, 2200, 2, 0.1, 0.45); noiseLayer(brownB, "lowpass", t, 0.5, 300, 200, 0.8, 0.2, 0.4); break;
      case "vineLash":  whoosh(t, 0.16, 500, 4200, 1.0); noiseLayer(white, "highpass", t + 0.12, 0.03, 2500, 2500, 0.7, 0.001, 0.8); squelch(t + 0.1, 0.4); break;   // a whip crack
      case "vineSpit":  for (let k = 0; k < 3; k++) { noiseLayer(white, "bandpass", t + k * 0.05, 0.05, 1200, 700, 2, 0.002, 0.7); oscLayer("sine", t + k * 0.05, 300, 120, 0.06, 0.002, 0.3); } break;
      case "vineBurst": impact(t, 0.9); crunch(t, 0.8); grind(t, 0.3, 0.5); crackle(t, 0.3, 10, 0.6); break;   // earth breaking open
      case "wispSwoop": whoosh(t, 0.55, 300, 2400, 0.7); flame(t, 0.55, 0.6, 600, 2200); crackle(t, 0.4, 10, 0.5); break;
      case "wispPulse": ignite(t, 0.6); noiseLayer(pinkB, "bandpass", t, 0.6, 2200, 300, 1.4, 0.01, 0.7); break;
      case "wispShed":  for (let k = 0; k < 5; k++) { flame(t + k * 0.02, 0.18, 0.2, 1200, 3000); } crackle(t, 0.3, 14, 0.8); break;
      case "wispBeam":  flame(t, 2.2, 0.35, 300, 600); oscLayer("sawtooth", t + 0.5, 82, 78, 1.7, 0.08, 0.05); buzz(t + 0.55, 1.6, 0.12); break;
      case "spores":    noiseLayer(brownB, "lowpass", t, 0.25, 500, 200, 0.8, 0.005, 0.7); noiseLayer(white, "highpass", t + 0.05, 1.2, 5000, 3000, 0.6, 0.3, 0.18); break;
      case "guard":     knock(t, 0.6); break;
      case "spearLunge": whoosh(t, 0.24, 250, 2200, 1.1); noiseLayer(pinkB, "bandpass", t, 0.16, 700, 500, 2, 0.01, 0.4); break;
      case "spearSweep": whoosh(t, 0.42, 200, 1600, 1.2); thoom(t + 0.1, 0.3); break;
      case "inhale":    noiseLayer(pinkB, "bandpass", t, 0.45, 600, 1600, 1.6, 0.35, 0.35); break;
      case "dart":      noiseLayer(white, "bandpass", t, 0.07, 1300, 2600, 2, 0.003, 1.0); whoosh(t + 0.03, 0.18, 1500, 5000, 0.55); break;   // a sharp puff, then the dart's hiss
      case "throw":     whoosh(t, 0.3, 300, 1400, 0.6); break;
      case "hop":       noiseLayer(brownB, "lowpass", t, 0.15, 500, 200, 0.7, 0.005, 0.4); break;
      case "swingClub": whoosh(t, 0.24, 250, 1600, 0.9); break;
      // ---- UI
      case "ultReady":  noiseLayer(pinkB, "bandpass", t, 0.7, 200, 3200, 1.4, 0.6, 1.0); oscLayer("sine", t + 0.6, 70, 45, 0.5, 0.003, 0.9); break;
      case "equip":     noiseLayer(white, "bandpass", t, 0.28, 1500, 5000, 5, 0.12, 1.0); steel(t + 0.22, 2000, 0.04, 0.2); break;
    }
    // the element rides along with the swing: flame follows the blade, water gushes, the harp sweeps
    function elementSwing(t0, dur) {
      if (el === "fire") { flame(t0 + 0.02, dur + 0.25, 0.7, 300, 1600); crackle(t0 + 0.05, dur + 0.2, 10, 0.7); }
      else if (el === "water") { gush(t0, dur + 0.25, 0.65); }
      else if (el === "sky") flurry(t0, 3 + ((Math.random() * 5) | 0), 3, 0.04, 0.28, 1);
      else if (el === "storm") arc(t0 + 0.03, dur, 0.55, 1500, 3200);
      else if (el === "stone") grind(t0 + dur * 0.4, 0.3, 0.4);
    }
  };

  // ---------------------------------------------------------------- footsteps
  Amb.step = function (surface, run) {
    if (!ac || Amb.muted) return;
    const t = ac.currentTime, src = ac.createBufferSource(), g = ac.createGain();
    const len = surface === "wood" ? 0.09 : 0.07;
    const buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.5);
    src.buffer = buf;
    const f = surface === "wood" ? filt("bandpass", 380, 2.5) : surface === "stone" ? filt("bandpass", 1800, 1.2) : surface === "sand" ? filt("lowpass", 1300, 0.6) : filt("highpass", 2200, 0.5);
    const v = (surface === "wood" ? 0.5 : surface === "grass" ? 0.06 : 0.16) * (run ? 1.3 : 1);
    g.gain.value = v;
    src.connect(f); f.connect(g); g.connect(master);
    if (surface === "wood") { // hollow knock
      const o = ac.createOscillator(), og = gain(0.12);
      o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.08);
      og.gain.setValueAtTime(0.12, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(og); og.connect(master); o.start(t); o.stop(t + 0.12);
    }
    src.start(t);
  };

  // ---------------------------------------------------------------- per-frame mix
  Amb.update = function (t, px, py) {
    if (!ac) return;
    if (ac.state === "suspended") ac.resume();
    // how much ocean / river / jungle is around the player (sampled a few times a second)
    if (t > proxT) {
      proxT = t + 0.3;
      let oc = 0, rv = 0, tot = 0;
      const W = World.W, H = World.H;
      for (let dy = -260; dy <= 260; dy += 40) for (let dx = -300; dx <= 300; dx += 40) {
        const x = (px + dx) | 0, y = (py + dy) | 0, w = 1 / (1 + (dx * dx + dy * dy) / 20000);
        tot += w;
        if (x < 0 || y < 0 || x >= W || y >= H) { oc += w; continue; }
        const i = y * W + x;
        if (World.terr[i] === World.WATER) { if (World.oceanMask[i]) oc += w; else rv += w; }
      }
      oceanProx = Math.min(1, (oc / tot) * 2.2);
      riverProx = Math.min(1, (rv / tot) * 4);
      nearTrees = K.clamp(1 - oceanProx * 0.8, 0.2, 1);
    }
    if (Amb.scene !== "sanctum") { set(rumbleG.gain, 0, 0.8); set(humG.gain, 0, 0.8); }
    if (Amb.scene !== "highlands") set(cicG.gain, 0, 0.8);
    if (Amb.scene === "sanctum") {      // inside the sleeping volcano: it breathes, bubbles, groans and drips
      for (const g of [rustleG, surfG, washG, riverG, bugG, lapG]) set(g.gain, 0, 0.6);
      const breath = 0.5 + 0.5 * Math.sin(t * 0.11) * Math.sin(t * 0.037 + 1);
      set(rumbleG.gain, 0.16 + 0.22 * breath, 1.5); set(droneG.gain, 0.06, 1.2); set(humG.gain, 0.05 + 0.02 * Math.sin(t * 0.5), 1);
      set(windG.gain, 0.03 + 0.05 * breath, 1); set(windF.frequency, 180 + 120 * breath, 1);   // the draught up the crater
      volcanoEvents();
      return;
    }
    if (Amb.scene === "cave") {
      for (const g of [windG, rustleG, surfG, washG, riverG, bugG]) set(g.gain, 0, 0.6);
      set(surfG.gain, 0.04, 0.8);
      set(droneG.gain, 0.16, 1.2);
      set(lapG.gain, 0.07, 1.2);
      return;
    }
    set(droneG.gain, 0, 0.8); set(lapG.gain, 0, 0.8);
    if (Amb.scene === "highlands") { oceanProx = 0; riverProx = 0; nearTrees = 0.6; proxT = t + 1e9; }
    else if (proxT > t + 1e8) proxT = 0;
    const s = K.windStrength(t, px, py);
    const hi = Amb.scene === "highlands";     // up high the wind is stronger, lower and more hollow
    set(windG.gain, (hi ? 0.1 : 0.05) + (hi ? 0.34 : 0.26) * Math.pow(s, 1.4), 0.4);
    set(windF.frequency, (hi ? 220 : 300) + (hi ? 380 : 520) * s, 0.5);
    set(rustleG.gain, (0.006 + 0.05 * s * s) * nearTrees, 0.3);
    // surf follows the on-screen tide: hiss as the wave rushes up, fading as it drains
    let ph = t * 0.12 + px * 0.0032 + py * 0.0024 + K.noise(px * 0.012, py * 0.012) * 0.35;
    ph -= Math.floor(ph);
    const reach = ph < 0.33 ? Math.sin((ph / 0.33) * Math.PI * 0.5) : Math.cos(((ph - 0.33) / 0.67) * Math.PI * 0.5);
    set(surfG.gain, oceanProx * (0.22 + 0.18 * reach), 0.3);
    set(washG.gain, oceanProx * (ph < 0.33 ? 0.03 + 0.12 * reach : 0.02 + 0.05 * reach), 0.15);
    set(riverG.gain, riverProx * 0.16, 0.4);
    set(bugG.gain, hi ? 0.03 + 0.02 * Math.sin(t * 0.17) : 0.006 + 0.01 * (0.5 + 0.5 * Math.sin(t * 0.13)) * nearTrees, 1);
    if (hi) {    // the jungle: cicadas in long swells, everything else calling over them
      const sw2 = Math.max(0, Math.sin(t * 0.085)) * Math.max(0, Math.sin(t * 0.21 + 2));
      set(cicG.gain, 0.012 + 0.07 * sw2, 1.2); set(cicF.frequency, 3900 + 900 * sw2, 1.5);
      jungleEvents();
    }
    // birds
    if (ac.currentTime > nextBird) {
      const r = Math.random(), v = 0.05 + Math.random() * 0.05, pan = Math.random() * 1.6 - 0.8, t0 = ac.currentTime + 0.02;
      if (oceanProx > 0.35 && r < 0.3) CALLS.gull(t0, v, pan);
      else if (r < 0.45) CALLS.whistle(t0, v * nearTrees, pan);
      else if (r < 0.62) CALLS.trill(t0, v * nearTrees, pan);
      else if (r < 0.8) CALLS.dove(t0, v * 0.9, pan);
      else CALLS.chatter(t0, v * nearTrees, pan);
      nextBird = ac.currentTime + (hi ? 0.6 + Math.random() * 2.2 : 1.8 + Math.random() * 5);
    }
  };
  // ---- the highlands jungle: crickets, coquí frogs, a hooting bird, and the tribe's drums far off
  function jungleEvents() {
    const now = ac.currentTime; if (now < nextAtmo || Amb.muted) return;
    bus(); const r = Math.random(), t0 = now + 0.02, pan = rnd(-0.9, 0.9);
    if (r < 0.3) { const f = rnd(4200, 5200), n = 3 + ((Math.random() * 4) | 0); for (let rep2 = 0; rep2 < 2 + ((Math.random() * 3) | 0); rep2++) for (let k = 0; k < n; k++) tone(t0 + rep2 * 0.45 + k * 0.05, f, f * 0.98, 0.03, 0.018, pan); }   // a cricket
    else if (r < 0.52) { for (let k = 0; k < 2 + ((Math.random() * 2) | 0); k++) { const tt = t0 + k * rnd(0.7, 1.1); tone(tt, 1050, 1150, 0.07, 0.035, pan); tone(tt + 0.09, 1800, 2250, 0.16, 0.03, pan); } }   // a coquí: "ko-KEE"
    else if (r < 0.68) { const f = rnd(420, 520); for (let k = 0; k < 3; k++) tone(t0 + k * 0.32, f, f * 0.86, 0.22, 0.03, pan, "sine", [5, 6]); }   // a hooting bird deep in the trees
    else if (r < 0.8) { for (let k = 0; k < 4; k++) pahu(t0 + k * rnd(0.32, 0.4), 0.06 + Math.random() * 0.03); }   // war drums, far away
    else { const f = rnd(6000, 7200); for (let k = 0; k < 14; k++) tone(t0 + k * 0.03, f, f * 1.03, 0.02, 0.008, pan); }   // a katydid's rasp
    nextAtmo = now + 0.8 + Math.random() * 2.6;
  }
  // ---- the sanctum: lava bubbling below, steam venting, the mountain's stone groaning, drips echoing
  function volcanoEvents() {
    const now = ac.currentTime; if (now < nextAtmo || Amb.muted) return;
    bus(); const r = Math.random(), t0 = now + 0.02, pan = rnd(-0.8, 0.8);
    if (r < 0.34) { for (let k = 0; k < 2 + ((Math.random() * 4) | 0); k++) { const f = rnd(70, 150), tt = t0 + k * rnd(0.08, 0.3); tone(tt, f, f * rnd(1.6, 2.4), rnd(0.08, 0.16), 0.08, pan); } }   // lava blooping far below
    else if (r < 0.52) { noiseLayer(white, "highpass", t0, rnd(1.2, 2.4), 3000, 5200, 0.6, 0.4, 0.12, pan, true); }   // a steam vent hissing
    else if (r < 0.66) { noiseLayer(brownB, "bandpass", t0, rnd(1.4, 2.2), 140, 70, 4, 0.5, 0.5, pan, true); }   // the stone groaning
    else if (r < 0.86) { const f = 900 + Math.random() * 1300; tone(t0, f * 1.6, f, 0.09, 0.05, pan, "sine"); }   // a drip, echoing
    else { noiseLayer(brownB, "lowpass", t0, 2.6, 60, 160, 0.9, 1.0, 0.9, 0, true); crackle(t0 + 0.6, 1.2, 10, 0.12); }   // the mountain shifts in its sleep
    nextAtmo = now + 1.2 + Math.random() * 3.2;
  }
})();
