// zz_zz_music96.js — the user (2026-09-29): "study the music of Diablo 2 and the expansion ... and get our music as
// close as possible to all the soundtracks in that game because they're fucking sweet."
// A new live-synthesised score in the manner of Matt Uelmen's Diablo II / Lord of Destruction work. Every note is
// original and generated here; no melody, sample or recording is copied. What is borrowed is the craft:
//   - Act I towns: a fingerpicked, reverb-drenched twelve-string over a drone, in a slow compound metre.
//   - Wilderness: long silences, wind, detuned drones, reversed-guitar swells, lone harmonics, metallic scrapes.
//   - Dungeons: sub drones, dissonant clusters, distant bells, heartbeat drums, breath.
//   - Act II (the Barrens): an oud-like plucked lute in a hijaz mode over darbuka and frame drum.
//   - Act III (Shog-Mire): log drums in three-against-four, a breathy wooden flute, soft marimba over pads.
//   - Act IV (An-Vhar): the expansion's cold fortress sound: slow strings, a low horn, a men's choir, bells.
//   - Act V (the Descent): the inferno: industrial booms, clangs, a distorted drone, dissonant choir.
//   - Bosses: drums like thunder, a low phrygian ostinato, choir stabs, each act with its own colour.
// Each cue has its own seeded motif, stated, answered and varied, so a place has a tune you come to know.
// Routing: every cue plays into its own bus, and buses cross-fade when the place changes.
(function () {
  if (typeof MUS === 'undefined') return;
  const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
  const SC = {
    aeol: [0, 2, 3, 5, 7, 8, 10], dor: [0, 2, 3, 5, 7, 9, 10], phr: [0, 1, 3, 5, 7, 8, 10],
    hij: [0, 1, 4, 5, 7, 8, 10], hmin: [0, 2, 3, 5, 7, 8, 11], pmin: [0, 3, 5, 7, 10]
  };
  const deg = (sc, d) => { const n = sc.length, o = Math.floor(d / n), i = ((d % n) + n) % n; return sc[i] + 12 * o; };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ------------------------------------------------------------------ the graph
  const M = { master: null, comp: null, rev: null, revIn: null, dly: null, dlyIn: null, noise: null, bus: null, cue: null, old: [], ks: {}, next: 0, step: 0, bar: 0, key: '' };
  function impulse(sec, decay) {
    const rate = actx.sampleRate, n = Math.floor(rate * sec), b = actx.createBuffer(2, n, rate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  function init() {
    if (M.ctx === actx && M.master) return true;
    if (!actx) return false;
    try {
      M.ctx = actx; M.ks = {}; M.old = []; M.cue = null; M.bus = null; M.key = '';
      M.master = actx.createGain(); M.master.gain.value = 0;
      M.comp = actx.createDynamicsCompressor(); M.comp.threshold.value = -18; M.comp.ratio.value = 3; M.comp.attack.value = 0.02; M.comp.release.value = 0.4;
      M.master.connect(M.comp).connect(actx.destination);
      M.rev = actx.createConvolver(); M.rev.buffer = impulse(5.5, 2.6);
      M.revIn = actx.createGain(); M.revIn.gain.value = 1; const rw = actx.createGain(); rw.gain.value = 0.62;
      M.revIn.connect(M.rev).connect(rw).connect(M.master);
      // a soft ping-pong-ish delay for plucked things
      M.dlyIn = actx.createGain(); M.dlyIn.gain.value = 1;
      const d1 = actx.createDelay(2), fb = actx.createGain(), lp = actx.createBiquadFilter();
      d1.delayTime.value = 0.42; fb.gain.value = 0.32; lp.type = 'lowpass'; lp.frequency.value = 2600;
      M.dlyIn.connect(d1); d1.connect(lp).connect(fb).connect(d1); const dw = actx.createGain(); dw.gain.value = 0.3; lp.connect(dw); dw.connect(M.master); dw.connect(M.revIn);
      const n = actx.sampleRate * 2; M.noise = actx.createBuffer(1, n, actx.sampleRate); const nd = M.noise.getChannelData(0); for (let i = 0; i < n; i++) nd[i] = Math.random() * 2 - 1;
      MUS.node = M.master; // the old toggle (musSetOn) keeps working
      return true;
    } catch (e) { M.master = null; return false; }
  }
  // a cue's bus: dry to master, a send to the reverb and one to the delay
  function mkBus() {
    const g = actx.createGain(); g.gain.value = 0.0001;
    const dry = actx.createGain(); dry.gain.value = 0.75; g.connect(dry).connect(M.master);
    const rs = actx.createGain(); rs.gain.value = 0.8; g.connect(rs).connect(M.revIn);
    const ds = actx.createGain(); ds.gain.value = 0; g.connect(ds).connect(M.dlyIn);
    return { g, rs, ds, live: [] };
  }
  const out = (node, pan, send) => {
    let n = node;
    if (pan && actx.createStereoPanner) { const p = actx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); n.connect(p); n = p; }
    n.connect(M.bus.g);
    if (send) { const s = actx.createGain(); s.gain.value = send; n.connect(s).connect(M.dlyIn); }
  };
  function noiseSrc(t, dur) { const s = actx.createBufferSource(); s.buffer = M.noise; s.loop = true; s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.1); return s; }
  function env(g, t, a, peak, dur, rel) {
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + Math.max(a, dur - rel)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  // ------------------------------------------------------------------ instruments
  // Karplus-Strong string, cached by pitch, brightness and sustain
  function ksBuf(freq, bright, sus, rev) {
    const k = Math.round(freq * 4) + '|' + bright + '|' + sus + '|' + (rev ? 1 : 0); if (M.ks[k]) return M.ks[k];
    const rate = 24000, n = Math.floor(rate * (2 + sus * 3)), b = actx.createBuffer(1, n, rate), d = b.getChannelData(0), p = Math.max(2, Math.round(rate / freq));
    const ring = new Float32Array(p); let lp = 0;
    for (let i = 0; i < p; i++) { const w = Math.random() * 2 - 1; lp = lp + bright * (w - lp); ring[i] = lp; }
    const damp = 0.4965 + sus * 0.003; let idx = 0;
    for (let i = 0; i < n; i++) { const a = ring[idx], c = ring[(idx + 1) % p]; ring[idx] = damp * (a + c); d[i] = a; idx = (idx + 1) % p; }
    if (rev) { d.reverse(); }
    return (M.ks[k] = b);
  }
  function pluck(t, midi, vel, pan, o = {}) {
    const s = actx.createBufferSource(); s.buffer = ksBuf(NOTE(midi), o.bright || 0.55, o.sus || 0.5, o.rev);
    if (o.slide) { s.playbackRate.setValueAtTime(Math.pow(2, o.slide / 12), t); s.playbackRate.exponentialRampToValueAtTime(1, t + 0.09); }
    if (o.detune) s.playbackRate.value = 1 + o.detune;
    const g = actx.createGain(); g.gain.value = vel;
    let n = s;
    if (o.nasal) { const f = actx.createBiquadFilter(); f.type = 'peaking'; f.frequency.value = 1300; f.Q.value = 1.2; f.gain.value = 9; n.connect(f); n = f; }
    const f2 = actx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp || 3200; n.connect(f2); n = f2;
    n.connect(g); out(g, pan, o.send == null ? 0.25 : o.send);
    s.start(t); s.stop(t + (o.len || 4.5));
  }
  // a twelve-string: the course and its octave, a hair apart
  function gtr(t, midi, vel, pan) {
    pluck(t, midi, vel, pan, { bright: 0.5, sus: 0.6 });
    if (midi < 64) pluck(t + 0.012, midi + 12, vel * 0.32, -pan, { bright: 0.7, sus: 0.4, detune: 0.004 });
  }
  function harmonic(t, midi, vel, pan) { tone(t, NOTE(midi + 12), 3.5, vel * 0.5, 'sine', 0.004, pan); tone(t, NOTE(midi + 24), 2.2, vel * 0.18, 'sine', 0.004, -pan); }
  function tone(t, f, dur, vol, type, a, pan, detune) {
    const o = actx.createOscillator(), g = actx.createGain(); o.type = type || 'sine'; o.frequency.value = f; if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (a || 0.01)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); out(g, pan); o.start(t); o.stop(t + dur + 0.05);
  }
  function bell(t, midi, vol, pan) {
    const f = NOTE(midi);[[1, 1, 6], [2.0, 0.5, 4], [2.76, 0.4, 3.2], [5.4, 0.2, 1.8], [8.93, 0.12, 1.1]].forEach(([r, v, d]) => tone(t, f * r, d, vol * v, 'sine', 0.003, pan));
  }
  function mallet(t, midi, vol, pan) { const f = NOTE(midi); tone(t, f, 0.9, vol, 'sine', 0.002, pan); tone(t, f * 3.93, 0.18, vol * 0.35, 'sine', 0.001, pan); tone(t, f * 9.2, 0.06, vol * 0.12, 'sine', 0.001, pan); }
  function logdrum(t, midi, vol, pan) {
    const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(NOTE(midi) * 1.5, t); o.frequency.exponentialRampToValueAtTime(NOTE(midi), t + 0.03);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45); o.connect(g); out(g, pan); o.start(t); o.stop(t + 0.5);
  }
  function drum(t, vol, o = {}) { // big drum: pitch-dropping body plus a thud of noise
    const f0 = o.f || 80, len = o.len || 0.9;
    const b = actx.createOscillator(), g = actx.createGain(); b.type = 'sine';
    b.frequency.setValueAtTime(f0 * 1.9, t); b.frequency.exponentialRampToValueAtTime(f0, t + 0.06); b.frequency.exponentialRampToValueAtTime(f0 * 0.7, t + len);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + len); b.connect(g); out(g, o.pan || 0); b.start(t); b.stop(t + len + 0.05);
    const n = noiseSrc(t, 0.25), nf = actx.createBiquadFilter(), ng = actx.createGain(); nf.type = 'lowpass'; nf.frequency.value = o.nlp || 700;
    ng.gain.setValueAtTime(vol * (o.snap || 0.5), t); ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.2); n.connect(nf).connect(ng); out(ng, o.pan || 0);
  }
  function dum(t, vol, pan) { drum(t, vol, { f: 95, len: 0.45, snap: 0.25, pan }); }
  function tek(t, vol, pan) {
    const n = noiseSrc(t, 0.12), f = actx.createBiquadFilter(), g = actx.createGain(); f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 1.4;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07); n.connect(f).connect(g); out(g, pan);
    tone(t, 680, 0.07, vol * 0.4, 'triangle', 0.001, pan);
  }
  function shaker(t, vol, pan) { const n = noiseSrc(t, 0.1), f = actx.createBiquadFilter(), g = actx.createGain(); f.type = 'highpass'; f.frequency.value = 6000; g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09); n.connect(f).connect(g); out(g, pan); }
  function flute(t, midi, dur, vol, pan) {
    const o = actx.createOscillator(), g = actx.createGain(), v = actx.createOscillator(), vg = actx.createGain();
    o.type = 'sine'; o.frequency.value = NOTE(midi); v.frequency.value = 5.2; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(NOTE(midi) * 0.012, t + Math.min(0.5, dur * 0.4));
    v.connect(vg).connect(o.frequency); env(g, t, 0.09, vol, dur, Math.min(0.4, dur * 0.4)); o.connect(g); out(g, pan, 0.2);
    const n = noiseSrc(t, dur), f = actx.createBiquadFilter(), ng = actx.createGain(); f.type = 'bandpass'; f.frequency.value = NOTE(midi) * 2; f.Q.value = 6;
    env(ng, t, 0.05, vol * 0.5, dur, 0.2); n.connect(f).connect(ng); out(ng, pan);
    o.start(t); v.start(t); o.stop(t + dur + 0.05); v.stop(t + dur + 0.05);
  }
  // ensemble voices: strings, a low horn, and a choir sung through vowel formants
  function strings(t, midi, dur, vol, pan, bright) {
    const g = actx.createGain(), f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = bright || 1500; f.Q.value = 0.5;
    env(g, t, Math.min(1.2, dur * 0.35), vol, dur, Math.min(1.5, dur * 0.4)); f.connect(g); out(g, pan);
    [-9, 0, 8].forEach(dt => { const o = actx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(midi); o.detune.value = dt; o.connect(f); o.start(t); o.stop(t + dur + 0.1); });
  }
  function horn(t, midi, dur, vol, pan) {
    const g = actx.createGain(), f = actx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 1.2;
    f.frequency.setValueAtTime(250, t); f.frequency.linearRampToValueAtTime(900, t + 0.25); f.frequency.linearRampToValueAtTime(650, t + dur);
    env(g, t, 0.18, vol, dur, Math.min(0.8, dur * 0.4)); f.connect(g); out(g, pan);
    ['sawtooth', 'square'].forEach((ty, i) => { const o = actx.createOscillator(); o.type = ty; o.frequency.value = NOTE(midi); o.detune.value = i ? -6 : 4; const og = actx.createGain(); og.gain.value = i ? 0.35 : 1; o.connect(og).connect(f); o.start(t); o.stop(t + dur + 0.1); });
  }
  const VOW = { a: [[730, 1], [1090, 0.5], [2440, 0.25]], o: [[570, 1], [840, 0.45], [2410, 0.2]], u: [[300, 1], [870, 0.3], [2240, 0.12]] };
  function choir(t, midi, dur, vol, pan, vowel) {
    const g = actx.createGain(); env(g, t, Math.min(1.8, dur * 0.4), vol, dur, Math.min(2, dur * 0.45)); out(g, pan);
    const src = actx.createGain(); src.gain.value = 0.5;
    [-12, 0, 11].forEach(dt => { const o = actx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = NOTE(midi); o.detune.value = dt; const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = 4.6 + Math.random(); lg.gain.value = 5; lfo.connect(lg).connect(o.detune); o.connect(src); o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1); });
    (VOW[vowel || 'a']).forEach(([fr, a]) => { const bp = actx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = 9; const bg = actx.createGain(); bg.gain.value = a * 3; src.connect(bp).connect(bg).connect(g); });
  }
  // textures
  function swell(t, dur, vol, lo, hi, pan) { // a reversed-sounding rise of air, cut off at its peak
    const n = noiseSrc(t, dur), f = actx.createBiquadFilter(), g = actx.createGain(); f.type = 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(lo, t); f.frequency.exponentialRampToValueAtTime(hi, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.97); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g); out(g, pan);
  }
  function scrape(t, dur, vol, pan) { // metal dragged over stone
    const n = noiseSrc(t, dur), f = actx.createBiquadFilter(), f2 = actx.createBiquadFilter(), g = actx.createGain();
    f.type = 'bandpass'; f.Q.value = 18; const f0 = 900 + Math.random() * 1800; f.frequency.setValueAtTime(f0, t); f.frequency.linearRampToValueAtTime(f0 * (0.6 + Math.random() * 0.9), t + dur);
    f2.type = 'bandpass'; f2.Q.value = 22; f2.frequency.value = f0 * 1.51;
    env(g, t, dur * 0.3, vol, dur, dur * 0.5); n.connect(f).connect(g); n.connect(f2).connect(g); out(g, pan);
  }
  function clang(t, vol, pan) { const f = 180 + Math.random() * 90;[1, 2.41, 3.77, 5.93, 8.1].forEach((r, i) => tone(t, f * r, 2.4 - i * 0.35, vol / (i + 1.2), 'square', 0.001, pan)); }
  function drip(t, vol, pan) {
    const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine'; const f = 1300 + Math.random() * 900;
    o.frequency.setValueAtTime(f * 0.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16); o.connect(g); out(g, pan); o.start(t); o.stop(t + 0.2);
  }
  function breath(t, dur, vol, pan) { const n = noiseSrc(t, dur), f = actx.createBiquadFilter(), g = actx.createGain(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 1.1; env(g, t, dur * 0.45, vol, dur, dur * 0.5); n.connect(f).connect(g); out(g, pan); }

  // continuous beds, per cue: drone voices and wind
  function bed(c) {
    const t = actx.currentTime, live = M.bus.live;
    if (c.drone) {
      const [midi, vol, lpf, kind] = c.drone, lp = actx.createBiquadFilter(), g = actx.createGain();
      lp.type = 'lowpass'; lp.frequency.value = lpf; lp.Q.value = 3; g.gain.value = vol;
      let head = lp;
      if (kind === 'dist') { const ws = actx.createWaveShaper(), cv = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = i / 256 - 1; cv[i] = Math.tanh(x * 4); } ws.curve = cv; ws.connect(lp); head = ws; }
      lp.connect(g); out(g, 0);
      const vs = [[midi, 'sawtooth', 0], [midi, 'sawtooth', 7], [midi - 12, 'sine', 0], [midi + 7, 'triangle', -4]].map(([m, ty, dt]) => { const o = actx.createOscillator(); o.type = ty; o.frequency.value = NOTE(m); o.detune.value = dt; o.connect(head); o.start(t); return o; });
      const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = 0.05 + Math.random() * 0.05; lg.gain.value = lpf * 0.45; lfo.connect(lg).connect(lp.frequency); lfo.start(t);
      live.push(...vs, lfo); M.bus.drone = { vs, g, lp };
    }
    if (c.wind) {
      const n = actx.createBufferSource(); n.buffer = M.noise; n.loop = true;
      const f = actx.createBiquadFilter(), g = actx.createGain(); f.type = 'bandpass'; f.Q.value = 2.2; f.frequency.value = c.windF || 420; g.gain.value = c.wind;
      const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = 0.09; lg.gain.value = (c.windF || 420) * 0.6; lfo.connect(lg).connect(f.frequency);
      const lfo2 = actx.createOscillator(), lg2 = actx.createGain(); lfo2.frequency.value = 0.061; lg2.gain.value = c.wind * 0.8; lfo2.connect(lg2).connect(g.gain);
      n.connect(f).connect(g); out(g, 0); n.start(t); lfo.start(t); lfo2.start(t); live.push(n, lfo, lfo2);
    }
  }
  const setDrone = (t, midi) => { const d = M.bus && M.bus.drone; if (!d) return; d.vs.forEach((o, i) => o.frequency.setTargetAtTime(NOTE([midi, midi, midi - 12, midi + 7][i]), t, 1.2)); };

  // ------------------------------------------------------------------ motifs
  // a motif is a short run of scale degrees and lengths; a phrase states it, answers it a step higher, varies it,
  // and comes home. The seed is the cue's, so each place keeps its own tune.
  function motif(seed, span, count) {
    const r = rng(seed), m = []; let d = Math.floor(r() * 3);
    const lens = [2, 1, 1, 2, 3, 1, 2, 4];
    for (let i = 0; i < count; i++) { m.push({ d, l: lens[Math.floor(r() * lens.length)] }); d += [-2, -1, -1, 1, 1, 2, 3, -3][Math.floor(r() * 8)]; d = Math.max(-2, Math.min(span, d)); }
    m[m.length - 1].l = Math.max(3, m[m.length - 1].l);
    return m;
  }
  function phrase(m, variant) {
    const out2 = []; const shift = [0, 2, 0, -1][variant % 4];
    m.forEach((n, i) => {
      let d = n.d + shift;
      if (variant % 4 === 2 && i === m.length - 1) d = 0; // cadence home
      if (variant % 4 === 3 && i === 1) d += 1;
      out2.push({ d, l: n.l });
    });
    return out2;
  }
  // a melody voice that walks a phrase across the step grid
  function melodyAt(c, s, bar, play) {
    if (!c._mel || c._mel.done) {
      if (s !== 0) return;
      c._mel = { notes: phrase(c.mot, c._var = (c._var || 0) + 1), i: 0, wait: 0, done: false };
    }
    const m = c._mel; if (m.wait > 0) { m.wait--; return; }
    const n = m.notes[m.i]; if (!n) { m.done = true; return; }
    play(n.d, n.l); m.wait = n.l - 1; m.i++; if (m.i >= m.notes.length) m.done = true;
  }

  // ------------------------------------------------------------------ the cues
  const CUE = {};
  // I · the camp on the Moor: fingerpicked twelve-string in 6/8, the tune in the treble on alternate sections
  CUE.a1_town = {
    gain: 0.8, bpm: 132, steps: 6, root: 50, sc: SC.dor, drone: [38, 0.03, 300], wind: 0.007, ds: 0.35,
    prog: [0, 0, 6, 5, 0, 0, 3, 4], seed: 11, mot: null,
    step(t, s, bar, c) {
      const ch = c.prog[bar % c.prog.length], r = c.root + deg(c.sc, ch) - (ch > 3 ? 12 : 0);
      if (s === 0) setDrone(t, r - 12);
      const voice = [deg(c.sc, ch + 4) - 12, deg(c.sc, ch + 7) - 12, deg(c.sc, ch + 9) - 12, deg(c.sc, ch + 11) - 12].map(x => c.root + x);
      const k = [0, 1, 2, 3, 2, 1][s];
      if (s === 0) gtr(t, r - 12, 0.5, -0.2);
      else if (Math.random() > 0.06) gtr(t, voice[k], 0.26 + Math.random() * 0.06, (k - 1.5) * 0.25);
      const sec = Math.floor(bar / 8) % 3;
      if (sec === 1) melodyAt(c, s, bar, (d, l) => gtr(t, c.root + 12 + deg(c.sc, d), 0.3, 0.25));
      if (sec === 2 && s === 0 && bar % 2 === 0) harmonic(t, r + 12, 0.05, 0.3);
    }
  };
  // I · wilderness: silence, wind, a drone, the odd harmonic, reversed guitar
  CUE.a1_wild = {
    gain: 1.3, bpm: 70, steps: 8, root: 50, sc: SC.aeol, drone: [38, 0.028, 240], wind: 0.018, seed: 12,
    step(t, s, bar, c) {
      const sec = Math.floor(bar / 6) % 4; // play, breathe, play, silence
      if (s === 0 && bar % 4 === 0) setDrone(t, c.root - 12 + [0, -2, -4, -5][(bar / 4) % 4 | 0]);
      if (sec === 3) { if (s === 0 && Math.random() < 0.25) swell(t, 3, 0.03, 200, 1800, Math.random() - 0.5); return; }
      if (s === 0 && Math.random() < 0.55) gtr(t, c.root - 12 + deg(c.sc, [0, 4, 5, 3][bar % 4]), 0.34, -0.3);
      if (s === 4 && Math.random() < 0.35) harmonic(t, c.root + deg(c.sc, [4, 2, 6, 0][Math.floor(Math.random() * 4)]), 0.06, 0.35);
      if (sec === 0 || sec === 2) melodyAt(c, s, bar, (d, l) => { if (Math.random() < 0.85) gtr(t, c.root + deg(c.sc, d), 0.22, 0.2); });
      if (s === 6 && bar % 3 === 2) pluck(t, c.root + deg(c.sc, 4), 0.3, 0.4, { rev: true, sus: 0.4, len: 3, send: 0.1 });
      if (s === 0 && bar % 8 === 5) swell(t, 2.6, 0.035, 150, 2400, -0.4);
    }
  };
  // I · crypts and barrows: sub drone, clusters, scrapes, a heartbeat, a far bell
  CUE.a1_deep = {
    bpm: 58, steps: 8, root: 38, sc: SC.phr, drone: [26, 0.05, 180], wind: 0.005, windF: 220, seed: 13,
    step(t, s, bar, c) {
      if (s === 0 && bar % 4 === 0) setDrone(t, c.root - 12 + [0, 1, 0, -2][(bar / 4) % 4 | 0]);
      const beat = Math.floor(bar / 8) % 3 === 1;
      if (beat && (s === 0 || s === 1)) drum(t, s ? 0.18 : 0.26, { f: 52, len: 0.6, snap: 0.2 });
      if (s === 0 && Math.random() < 0.4) pluck(t, c.root + deg(c.sc, Math.random() < 0.5 ? 0 : 1), 0.38, -0.2, { sus: 0.7, bright: 0.35 });
      if (s === 3 && Math.random() < 0.12) bell(t, c.root + 36 + deg(c.sc, Math.floor(Math.random() * 5)), 0.02, Math.random() - 0.5);
      if (s === 5 && Math.random() < 0.1) scrape(t, 2.5 + Math.random() * 2, 0.025, Math.random() * 1.6 - 0.8);
      if (s === 0 && bar % 6 === 3) { strings(t, c.root + 12, 7, 0.018, -0.3, 700); strings(t, c.root + 13, 7, 0.014, 0.3, 700); }
      if (s === 2 && bar % 5 === 1) swell(t, 3.4, 0.03, 100, 900, 0.3);
      if (s === 6 && Math.random() < 0.18) breath(t, 3, 0.03, Math.random() - 0.5);
    }
  };
  // II · the Barrens camp: oud in hijaz over darbuka
  CUE.a2_town = {
    bpm: 208, steps: 8, root: 50, sc: SC.hij, drone: [38, 0.024, 420], wind: 0.006, windF: 900, seed: 21,
    step(t, s, bar, c) {
      if (s === 0 && bar % 8 === 0) setDrone(t, c.root - 12);
      const pat = ['D', '', 't', 't', 'D', '', 't', ''];
      if (pat[s] === 'D') dum(t, 0.3, -0.1); else if (pat[s] === 't' && Math.random() > 0.1) tek(t, 0.12, 0.25);
      if (s % 2 === 1 && Math.random() < 0.2) tek(t, 0.05, 0.4);
      const sec = Math.floor(bar / 4) % 4;
      if (sec === 0) { if (s % 2 === 0) pluck(t, c.root + deg(c.sc, [0, 1, 2, 1][s / 2]), 0.26, 0.2, { nasal: true, bright: 0.8, sus: 0.3, slide: s === 4 ? -1 : 0 }); }
      else melodyAt(c, s, bar, (d, l) => { const m = c.root + 12 + deg(c.sc, d); pluck(t, m, 0.3, 0.15, { nasal: true, bright: 0.85, sus: 0.3, slide: Math.random() < 0.3 ? -1 : 0 }); if (l >= 3) pluck(t + 0.11, m, 0.14, 0.2, { nasal: true, bright: 0.85, sus: 0.2 }); });
      if (s === 0 && bar % 4 === 0) pluck(t, c.root - 12, 0.36, -0.3, { nasal: true, bright: 0.6, sus: 0.7 });
    }
  };
  CUE.a2_wild = {
    gain: 1.2, bpm: 84, steps: 8, root: 50, sc: SC.hij, drone: [38, 0.026, 300], wind: 0.027, windF: 700, seed: 22,
    step(t, s, bar, c) {
      const sec = Math.floor(bar / 6) % 3;
      if (s === 0) dum(t, 0.2, 0); if (s === 5 && sec !== 2) dum(t, 0.1, 0.2);
      if (sec === 2) { if (s === 0 && Math.random() < 0.3) swell(t, 3.5, 0.03, 300, 3000, 0); return; }
      melodyAt(c, s, bar, (d, l) => { if (Math.random() < 0.8) pluck(t, c.root + deg(c.sc, d), 0.3, 0.2, { nasal: true, bright: 0.8, sus: 0.6, slide: Math.random() < 0.4 ? (Math.random() < 0.5 ? -1 : -2) : 0 }); });
      if (s === 4 && bar % 4 === 3) choir(t, c.root + deg(c.sc, 4), 5, 0.012, -0.4, 'o');
    }
  };
  CUE.a2_deep = {
    bpm: 60, steps: 8, root: 38, sc: SC.hij, drone: [26, 0.05, 200], wind: 0.006, windF: 300, seed: 23,
    step(t, s, bar, c) {
      if (s === 0 && bar % 4 === 0) setDrone(t, c.root - 12 + [0, 1, 0, 4][(bar / 4) % 4 | 0]);
      if (s === 0 && bar % 3 === 0) choir(t, c.root + 12 + deg(c.sc, [0, 1, 4][bar % 3]), 7, 0.014, Math.random() - 0.5, 'u');
      if ((s === 0 || s === 3) && Math.random() < 0.3) dum(t, 0.09, -0.4);
      if (s === 6 && Math.random() < 0.25) tek(t, 0.04, 0.5);
      if (s === 2 && bar % 5 === 2) pluck(t, c.root + 12 + deg(c.sc, 1), 0.28, 0.3, { rev: true, nasal: true, sus: 0.6, send: 0.1 });
      if (s === 4 && Math.random() < 0.1) scrape(t, 3, 0.02, Math.random() - 0.5);
      if (s === 1 && Math.random() < 0.08) bell(t, c.root + 36 + deg(c.sc, 2), 0.018, 0.4);
    }
  };
  // III · Shog-Mire: marimba and pads at the stilt-towns; log drums and flute in the mire
  CUE.a3_town = {
    gain: 1.9, bpm: 150, steps: 8, root: 52, sc: SC.pmin, drone: [40, 0.02, 350], wind: 0.004, seed: 31,
    step(t, s, bar, c) {
      if (s === 0 && bar % 2 === 0) { const ch = [0, 3, 1, 4][(bar / 2) % 4 | 0]; strings(t, c.root + deg(c.sc, ch), 3.8, 0.02, -0.3, 1100); strings(t, c.root + deg(c.sc, ch + 2), 3.8, 0.015, 0.3, 1100); setDrone(t, c.root - 12 + deg(c.sc, ch)); }
      if (Math.random() > 0.12) mallet(t, c.root + 12 + deg(c.sc, [0, 2, 1, 3, 2, 4, 3, 1][s]), s % 2 ? 0.05 : 0.08, (s - 3.5) / 5);
      if (Math.floor(bar / 4) % 2 === 1) melodyAt(c, s, bar, (d, l) => flute(t, c.root + 12 + deg(c.sc, d), 0.34 * l + 0.2, 0.03, 0.2));
      if (s % 4 === 2) shaker(t, 0.015, 0.5);
    }
  };
  CUE.a3_wild = {
    gain: 1.3, bpm: 132, steps: 12, root: 45, sc: SC.pmin, drone: [33, 0.03, 260], wind: 0.007, windF: 350, seed: 32,
    step(t, s, bar, c) {
      const on = Math.floor(bar / 4) % 4 !== 3;
      if (on) { if (s % 3 === 0) logdrum(t, c.root + (s % 6 ? 7 : 0), 0.14, -0.3); if (s % 4 === 0) logdrum(t, c.root + 12, 0.1, 0.35); if (s === 0 || s === 7) drum(t, 0.2, { f: 60, len: 0.5, snap: 0.3 }); if (s % 2 === 1 && Math.random() < 0.3) shaker(t, 0.02, Math.random() - 0.5); }
      if (Math.floor(bar / 4) % 4 >= 1) melodyAt(c, s, bar, (d, l) => flute(t, c.root + 24 + deg(c.sc, d), 0.2 * l + 0.25, 0.035, -0.2));
      if (s === 0 && bar % 8 === 6) flute(t, c.root + 31, 2.4, 0.03, 0.5);
    }
  };
  CUE.a3_deep = {
    gain: 1.1, bpm: 66, steps: 8, root: 40, sc: SC.phr, drone: [28, 0.045, 220], seed: 33,
    step(t, s, bar, c) {
      if (Math.random() < 0.09) drip(t + Math.random() * 0.2, 0.03, Math.random() * 1.6 - 0.8);
      if (s === 0 && bar % 2 === 0) logdrum(t, c.root, 0.14, -0.2);
      if (s === 3 && bar % 4 === 1) logdrum(t, c.root + 1, 0.1, 0.3);
      if (s === 0 && bar % 4 === 2) flute(t, c.root + 12 + deg(c.sc, [1, 4, 0][bar % 3]), 3, 0.022, 0.3);
      if (s === 4 && bar % 6 === 0) strings(t, c.root + 12, 6, 0.016, 0, 600);
      if (s === 6 && Math.random() < 0.12) breath(t, 2.5, 0.025, Math.random() - 0.5);
    }
  };
  // IV · An-Vhar: the cold fortress sound. Strings, a low horn, a men's choir, bells
  CUE.a4_town = {
    gain: 1.9, bpm: 76, steps: 8, root: 48, sc: SC.aeol, drone: [36, 0.02, 280], wind: 0.012, windF: 600, seed: 41,
    prog: [0, 5, 2, 6, 0, 3, 4, 4],
    step(t, s, bar, c) {
      const ch = c.prog[bar % c.prog.length];
      if (s === 0) {
        const r = c.root + deg(c.sc, ch); setDrone(t, r - 12);
        strings(t, r - 12, 4.3, 0.028, -0.4, 1300); strings(t, c.root + deg(c.sc, ch + 2), 4.3, 0.022, 0.1, 1300); strings(t, c.root + deg(c.sc, ch + 4), 4.3, 0.018, 0.4, 1500);
        if (bar % 2 === 0) choir(t, r - 12, 8.4, 0.02, -0.2, 'o');
        if (bar % 4 === 0) drum(t, 0.22, { f: 55, len: 1.4, snap: 0.3 });
      }
      if (Math.floor(bar / 8) % 2 === 1) melodyAt(c, s, bar, (d, l) => horn(t, c.root + deg(c.sc, d), 0.8 * l, 0.045, 0.15));
      if (s === 4 && bar % 8 === 7) bell(t, c.root + 24, 0.03, 0.4);
    }
  };
  CUE.a4_wild = {
    gain: 1.3, bpm: 66, steps: 8, root: 48, sc: SC.aeol, drone: [36, 0.03, 260], wind: 0.030, windF: 800, seed: 42,
    step(t, s, bar, c) {
      if (s === 0 && bar % 2 === 0) { const r = c.root + deg(c.sc, [0, 5, 3, 6][(bar / 2) % 4 | 0]); choir(t, r - 12, 8, 0.02, -0.3, 'a'); choir(t, r - 5, 8, 0.012, 0.3, 'o'); setDrone(t, r - 12); }
      if (s === 0 && bar % 4 === 1) drum(t, 0.18, { f: 50, len: 1.6, snap: 0.2 });
      if (Math.floor(bar / 6) % 3 === 1) melodyAt(c, s, bar, (d, l) => horn(t, c.root + deg(c.sc, d), 0.9 * l, 0.04, 0.5));
      if (s === 6 && Math.random() < 0.08) bell(t, c.root + 24 + deg(c.sc, 4), 0.02, -0.5);
    }
  };
  CUE.a4_deep = {
    bpm: 56, steps: 8, root: 45, sc: SC.phr, drone: [33, 0.045, 200], wind: 0.009, windF: 300, seed: 43,
    step(t, s, bar, c) {
      if (s === 0 && bar % 3 === 0) { bell(t, c.root + 24, 0.03, -0.3); bell(t + 0.9, c.root + 25, 0.022, 0.3); }
      if (s === 0 && bar % 2 === 1) { choir(t, c.root, 7, 0.018, -0.2, 'u'); choir(t, c.root + 1, 7, 0.014, 0.2, 'u'); }
      if (s === 4 && Math.random() < 0.2) breath(t, 3, 0.03, Math.random() - 0.5);
      if (s === 0 && bar % 4 === 0) drum(t, 0.14, { f: 45, len: 1.8, snap: 0.15 });
    }
  };
  // V · the Descent: a choir at the gate, then the inferno
  CUE.a5_town = {
    gain: 2.4, bpm: 60, steps: 8, root: 50, sc: SC.dor, drone: [38, 0.02, 260], seed: 51,
    step(t, s, bar, c) {
      if (s === 0 && bar % 2 === 0) { const ch = [0, 3, 5, 4][(bar / 2) % 4 | 0], r = c.root + deg(c.sc, ch); choir(t, r - 12, 8.2, 0.02, -0.3, 'a'); choir(t, c.root + deg(c.sc, ch + 2), 8.2, 0.016, 0.1, 'a'); choir(t, c.root + 12 + deg(c.sc, ch + 4), 8.2, 0.01, 0.4, 'o'); setDrone(t, r - 12); }
      if (s === 3 && Math.random() < 0.15) bell(t, c.root + 36 + deg(c.sc, [0, 4, 2][bar % 3]), 0.014, 0.4);
    }
  };
  CUE.a5_wild = {
    bpm: 92, steps: 8, root: 38, sc: SC.phr, drone: [26, 0.05, 520, 'dist'], seed: 52,
    step(t, s, bar, c) {
      if (s === 0 || s === 3) drum(t, s ? 0.2 : 0.32, { f: 42, len: 0.9, snap: 0.6, nlp: 1200 });
      if (s === 0 && bar % 2 === 0) setDrone(t, c.root - 12 + [0, 1, 0, 6][(bar / 2) % 4 | 0]);
      if (s === 6 && Math.random() < 0.3) clang(t, 0.04, Math.random() * 1.4 - 0.7);
      if (s === 0 && bar % 4 === 2) { choir(t, c.root + 12, 6, 0.018, -0.3, 'a'); choir(t, c.root + 13, 6, 0.016, 0.3, 'a'); choir(t, c.root + 18, 6, 0.012, 0, 'o'); }
      if (s === 4 && bar % 3 === 1) scrape(t, 2.5, 0.035, Math.random() - 0.5);
      if (s === 2 && bar % 4 === 3) swell(t, 2.2, 0.05, 80, 1400, 0);
      if (s === 5 && bar % 2 === 1) pluck(t, c.root + deg(c.sc, 1), 0.32, 0.3, { rev: true, sus: 0.5, bright: 0.4 });
    }
  };
  CUE.a5_deep = Object.assign({}, CUE.a5_wild, { bpm: 72, seed: 53, drone: [24, 0.055, 380, 'dist'] });
  // the bosses: one engine, act colours laid on top
  const BOSS = act => ({
    bpm: 150, steps: 8, root: act === 2 ? 38 : act === 3 ? 40 : act === 4 ? 36 : 38, sc: SC.phr, drone: [26, 0.04, act === 5 ? 700 : 400, act === 5 ? 'dist' : ''], seed: 60 + act,
    step(t, s, bar, c) {
      const pat = [1, 0, 0, 1, 0, 0, 1, 0], alt = [1, 0, 1, 0, 0, 1, 0, 1];
      if ((bar % 4 === 3 ? alt : pat)[s]) drum(t, s === 0 ? 0.42 : 0.28, { f: 58, len: 0.8, snap: 0.55 });
      if (s % 2 === 1 && Math.random() < 0.3) drum(t, 0.1, { f: 110, len: 0.25, snap: 0.4, pan: 0.3 });
      const r = c.root + [0, 0, 1, 0, 0, 0, 1, -2][bar % 8];
      if (s % 2 === 0) strings(t, r + (s === 6 ? 12 : 0), 0.28, 0.03, -0.25, 1100);
      if (s === 0) setDrone(t, r - 12);
      if (s === 0 && bar % 2 === 0) { choir(t, c.root + 12, 1.8, 0.025, -0.3, 'a'); choir(t, c.root + 13, 1.8, 0.02, 0.3, 'a'); }
      if (act === 2 && s % 2 === 1) tek(t, 0.08, 0.35);
      if (act === 3 && s % 3 === 0) logdrum(t, c.root + 12, 0.1, 0.4);
      if (act === 4 && s === 0 && bar % 4 === 0) horn(t, c.root, 2.2, 0.05, 0.1);
      if (act === 5 && s === 4 && Math.random() < 0.5) clang(t, 0.04, Math.random() - 0.5);
      if (s === 7 && bar % 8 === 7) swell(t, 0.9, 0.05, 200, 4000, 0);
    }
  });
  [1, 2, 3, 4, 5].forEach(a => CUE['boss' + a] = BOSS(a));
  // the title: the Moor tune, slower, with more air
  CUE.title = Object.assign({}, CUE.a1_town, { bpm: 110, seed: 11, wind: 0.012 });
  Object.keys(CUE).forEach(k => { const c = CUE[k]; c.mot = motif(c.seed * 7919, c.sc.length + 2, 7); });

  // ------------------------------------------------------------------ choosing the cue
  const DEEP = /crypt|cata|barrow|tomb|cav|gall|sump|hollow|lair|nave|vault|deep|chapter|ziggurat|throat|marrow|cellar|under|pit|mine|egg|breath|bellhol|scar|nihl/i;
  function actOf(id) { try { if (window.__spm && __spm.q && __spm.q.actOf) return __spm.q.actOf(id); } catch (e) { } const m = /^a(\d)_/.exec(id || ''); return m ? +m[1] : 1; }
  const isTown = id => id === 'moor' || /^a\d_town$/.test(id || '');
  function pick() {
    const intro = document.getElementById('intro');
    if (!G.running) return intro && !intro.hidden ? 'title' : '';
    const z = G.zone; if (!z) return 'a1_wild';
    const a = Math.max(1, Math.min(5, actOf(z.id) || 1));
    if (G.bossFight) return 'boss' + a;
    if (isTown(z.id)) return 'a' + a + '_town';
    if (DEEP.test(z.id) || z.indoor || z.dungeon) return 'a' + a + '_deep';
    return 'a' + a + '_wild';
  }
  function swap(key) {
    const t = actx.currentTime;
    if (M.bus) { const b = M.bus; b.g.gain.cancelScheduledValues(t); b.g.gain.setTargetAtTime(0.0001, t, 0.9); setTimeout(() => { b.live.forEach(o => { try { o.stop(); } catch (e) { } }); try { b.g.disconnect(); } catch (e) { } }, 5000); }
    M.key = key; M.cue = key ? CUE[key] : null; M.bus = null;
    if (!M.cue) return;
    M.bus = mkBus(); M.bus.ds.gain.value = M.cue.ds || 0; M.bus.g.gain.setTargetAtTime(M.cue.gain || 1, t + 0.3, key.startsWith('boss') ? 0.3 : 1.6);
    M.cue._mel = null; M.cue._var = 0; bed(M.cue);
    M.step = 0; M.bar = 0; M.next = t + 0.35;
  }

  // ------------------------------------------------------------------ the scheduler
  window.updateMusic = updateMusic = function () {
    if (!actx) return;
    if (!init()) return;
    const want = MUS.on && !muted && (G.running ? !G.paused : true) ? MUS.vol : 0;
    M.master.gain.setTargetAtTime(want, actx.currentTime, 0.5);
    let key = pick(); if (!want) key = key && M.key === key ? key : '';
    if (key !== M.key) swap(key);
    if (!M.cue || !want) { M.next = Math.max(M.next, actx.currentTime + 0.05); return; }
    const c = M.cue, dur = 60 / c.bpm, now = actx.currentTime;
    if (M.next < now - 1) M.next = now + 0.05; // a stalled tab: skip ahead instead of flooding
    while (M.next < now + 0.3) {
      try { c.step(M.next, M.step, M.bar, c); } catch (e) { }
      M.step++; if (M.step >= c.steps) { M.step = 0; M.bar++; }
      M.next += dur * (1 + (Math.random() - 0.5) * 0.03);
    }
  };
  // the title had no sound: the first click or key makes the audio context, so the title can play
  const wake = () => { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) { } };
  addEventListener('pointerdown', wake, { once: true, capture: true }); addEventListener('keydown', wake, { once: true, capture: true });
  // test hook: render a cue into an OfflineAudioContext (used by the level check, never by the game)
  function testRender(ctx, key, sec) {
    const keep = actx; actx = ctx; M.ctx = null; M.master = null; init(); swap(key); M.master.gain.value = MUS.vol; M.bus.g.gain.cancelScheduledValues(0); M.bus.g.gain.value = CUE[key].gain || 1;
    const c = CUE[key], dur = 60 / c.bpm; let t = 0.35, s = 0, bar = 0;
    while (t < sec - 1) { c.step(t, s, bar, c); s++; if (s >= c.steps) { s = 0; bar++; } t += dur; }
    actx = keep; M.ctx = null; M.master = null; M.bus = null; M.key = '';
  }
  try { window.__music96 = { M, CUE, pick, swap, testRender }; } catch (e) { }
})();
