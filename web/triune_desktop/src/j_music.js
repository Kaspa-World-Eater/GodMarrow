
// =================================================================== music: original, generated live in the spirit of Diablo 2's score
// Wilderness: slow minor-key picked guitar over a drone. Dungeons: low drones, distant bells, breathing pads.
// Boss fights: a pounding low drum under the drone. Nothing here is sampled or copied; every note is synthesized.
const MUS = { on: true, vol: 0.55, node: null, rev: null, drone: null, next: 0, step: 0, chord: 0, mood: '', bar: 0, cache: {} };
try { const v = localStorage.getItem('triune.music'); if (v === 'off') MUS.on = false; } catch (e) { /* optional */ }
const NOTE = n => 440 * Math.pow(2, (n - 69) / 12);
// D minor world: i – VI – VII – i, i – iv – VI – V, and a darker Phrygian turn for the depths
const PROG = {
  wild: [[50, [0, 7, 12, 15, 19]], [46, [0, 7, 12, 16, 19]], [48, [0, 7, 12, 16, 19]], [50, [0, 7, 12, 15, 19]], [50, [0, 7, 12, 15, 19]], [43, [0, 7, 12, 15, 19]], [46, [0, 7, 12, 16, 19]], [45, [0, 7, 12, 16, 19]]],
  deep: [[38, [0, 7, 12, 15]], [39, [0, 7, 12, 16]], [38, [0, 7, 12, 15]], [36, [0, 7, 12, 15]]]
};
function musMood() {
  const z = G.zone; if (!z) return 'wild';
  if (G.bossFight) return 'boss';
  return z.id === 'moor' || z.id === 'fen' ? 'wild' : 'deep';
}
function reverbImpulse(sec) {
  const rate = actx.sampleRate, n = Math.floor(rate * sec), buf = actx.createBuffer(2, n, rate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
  return buf;
}
// a plucked string (Karplus-Strong), cached per pitch
function pluckBuf(freq) {
  const k = Math.round(freq); if (MUS.cache[k]) return MUS.cache[k];
  const rate = 22050, n = Math.floor(rate * 3), buf = actx.createBuffer(1, n, rate), d = buf.getChannelData(0), p = Math.max(2, Math.round(rate / freq));
  const ring = new Float32Array(p); for (let i = 0; i < p; i++) ring[i] = Math.random() * 2 - 1;
  let idx = 0, last = 0;
  for (let i = 0; i < n; i++) { const a = ring[idx], b = ring[(idx + 1) % p]; const v = 0.4985 * (a + b); ring[idx] = v; d[i] = a * 0.8 + last * 0.2; last = a; idx = (idx + 1) % p; }
  return (MUS.cache[k] = buf);
}
function musInit() {
  if (MUS.ctx !== actx) { MUS.node = null; MUS.cache = {}; MUS.mood = ''; }
  if (!actx || MUS.node) return;
  MUS.ctx = actx;
  try {
    MUS.node = actx.createGain(); MUS.node.gain.value = MUS.on ? MUS.vol : 0; MUS.node.connect(actx.destination);
    MUS.rev = actx.createConvolver(); MUS.rev.buffer = reverbImpulse(3.5);
    const wet = actx.createGain(); wet.gain.value = 0.55; MUS.rev.connect(wet).connect(MUS.node);
    MUS.dry = actx.createGain(); MUS.dry.gain.value = 0.7; MUS.dry.connect(MUS.node); MUS.dry.connect(MUS.rev);
    // the drone: two detuned low voices through a slowly breathing lowpass
    const lp = actx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 2;
    const dg = actx.createGain(); dg.gain.value = 0; lp.connect(dg).connect(MUS.dry);
    const o1 = actx.createOscillator(), o2 = actx.createOscillator(), o3 = actx.createOscillator(); o1.type = 'sawtooth'; o2.type = 'sawtooth'; o3.type = 'sine';
    [o1, o2, o3].forEach(o => { o.connect(lp); o.start(); });
    const lfo = actx.createOscillator(), lg = actx.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 120; lfo.connect(lg).connect(lp.frequency); lfo.start();
    MUS.drone = { o1, o2, o3, dg, lp };
    MUS.next = actx.currentTime + 0.3;
  } catch (e) { MUS.node = null; }
}
function musSetOn(on) {
  MUS.on = on; try { localStorage.setItem('triune.music', on ? 'on' : 'off'); } catch (e) { /* optional */ }
  if (MUS.node) MUS.node.gain.setTargetAtTime(on && !muted ? MUS.vol : 0, actx.currentTime, 0.4);
}
function pluck(t, midi, vel, pan) {
  const src = actx.createBufferSource(); src.buffer = pluckBuf(NOTE(midi));
  const g = actx.createGain(); g.gain.value = vel;
  const f = actx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200;
  let out = g;
  if (actx.createStereoPanner) { const p = actx.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
  src.connect(f).connect(g); out.connect(MUS.dry); src.start(t); src.stop(t + 3);
}
function tone(t, freq, dur, vol, type, attack) {
  const o = actx.createOscillator(), g = actx.createGain(); o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(MUS.dry); o.start(t); o.stop(t + dur + 0.05);
}
function drum(t, vol) {
  const o = actx.createOscillator(), g = actx.createGain(); o.type = 'sine';
  o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.35);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
  o.connect(g).connect(MUS.dry); o.start(t); o.stop(t + 0.7);
}
// the scheduler: called every frame, schedules notes a little ahead
function updateMusic() {
  if (!actx) return;
  if (!MUS.node || MUS.ctx !== actx) musInit(); if (!MUS.node) return;
  const want = MUS.on && !muted && G.running && !G.paused ? MUS.vol : 0;
  MUS.node.gain.setTargetAtTime(want, actx.currentTime, 0.5);
  if (!want) { MUS.next = Math.max(MUS.next, actx.currentTime + 0.1); return; }
  const mood = musMood();
  if (mood !== MUS.mood) { MUS.mood = mood; MUS.step = 0; MUS.chord = 0; MUS.bar = 0; }
  const prog = PROG[mood === 'wild' ? 'wild' : 'deep'], beat = mood === 'wild' ? 0.46 : mood === 'boss' ? 0.4 : 0.62;
  const now = actx.currentTime;
  while (MUS.next < now + 0.25) {
    const t = MUS.next, [root, iv] = prog[MUS.chord % prog.length], s = MUS.step;
    // the drone follows the chord root
    if (s === 0) {
      const d = MUS.drone, f = NOTE(root - 12);
      d.o1.frequency.setTargetAtTime(f, t, 0.8); d.o2.frequency.setTargetAtTime(f * 1.004, t, 0.8); d.o3.frequency.setTargetAtTime(f / 2, t, 0.8);
      d.dg.gain.setTargetAtTime(mood === 'wild' ? 0.035 : 0.055, t, 1.2);
      d.lp.frequency.setTargetAtTime(mood === 'boss' ? 420 : mood === 'deep' ? 200 : 300, t, 1);
    }
    if (mood === 'wild') {
      // picked guitar: a rolling arpeggio with rests and small variations
      const pat = MUS.bar % 4 === 3 ? [0, 2, 1, 3, 4, 3, 2, -1] : [0, 2, 3, 1, 4, 2, 3, 1];
      const k = pat[s];
      if (k >= 0 && Math.random() > 0.08) pluck(t, root + iv[k] + (k === 0 ? -12 : 0), k === 0 ? 0.55 : 0.32 + Math.random() * 0.1, (k - 2) * 0.2);
      if (s === 0 && Math.random() < 0.35) tone(t, NOTE(root + 24 + iv[2 + (MUS.bar % 2)]), 3.5, 0.012, 'sine', 1.2);
    } else if (mood === 'deep') {
      // sparse and cold: a low pluck, a distant bell, breath
      if (s === 0) pluck(t, root, 0.5, -0.2);
      if (s === 4 && Math.random() < 0.6) pluck(t, root + iv[1 + Math.floor(Math.random() * 3)], 0.22, 0.3);
      if (s === 2 && Math.random() < 0.3) { const f = NOTE(root + 36 + iv[Math.floor(Math.random() * iv.length)]); tone(t, f, 5, 0.018, 'sine', 0.01); tone(t, f * 2.76, 3, 0.006, 'sine', 0.01); }
      if (s === 0 && MUS.bar % 2 === 0) tone(t, NOTE(root + 12 + iv[2]), 6, 0.014, 'triangle', 2.5);
    } else {
      // boss: the drum drives it
      if (s % 2 === 0) drum(t, s === 0 ? 0.35 : 0.2);
      if (s === 3 || s === 7) drum(t, 0.12);
      if (s === 0) pluck(t, root, 0.6, 0); if (s === 5) pluck(t, root + 1, 0.4, 0.2);
    }
    MUS.step = (s + 1) % 8;
    if (MUS.step === 0) { MUS.bar++; if (mood !== 'wild' || MUS.bar % 1 === 0) MUS.chord++; }
    MUS.next += beat * (mood === 'wild' && (s === 3 || s === 7) ? 1.08 : 1);
  }
}
