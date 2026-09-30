// zz_monk_sand.js (v0.54): the Empty Hand's orb becomes an hourglass, and his power fills it.
// The user (2026-09-29): "The monks mana should fill as he uses skills, getting weaker the more he uses it... At full, it's
// 90% reduced damage"; the curve "gentle, then steep"; "Make the mana orb of the monk actually a time. Hourglass. The
// sands fill in either direction."; "Radiance and absence will be a single bar. The gauge will just move in either
// direction starting in the center". Replaces zz_monk_yinyang.js.
//  - Two sands in one glass. Radiance pours amber sand DOWN into the lower bulb; Absence pours black sand UP into the upper
//    bulb (it falls the wrong way). Destroyer costs poise, as before.
//  - The fuller a bulb, the weaker that tree: strength = 1 - 0.9 * f^2.5 (full: 10%). Half full is still 84%.
//  - v0.55 (the user: "Make the sand run back faster, not everyone will play radiance and absence together so that can't
//    depend on that dual use... it seemed like the glass filled instantly and was really hard to drain"):
//    a cast pours a share of the bulb, not its Essence cost (a low-level glass is small, so costs filled it in two
//    casts): 5% for a skill of the common cost, more for dear ones, never more than 25% at once. The sand runs back
//    all the time: 10% a second while fighting, 35% a second once he has not cast for 0.4 s (a full bulb is empty
//    in under 3 s). Every hit runs both bulbs back 1.5%, every kill 12%, whichever tree struck.
//  - He is never locked out: a full bulb still casts, at a tenth of the force.
// P.mana is kept as the room left in the glass (2h minus both sands), so code that watches it still works.
(function () {
  if (typeof KS === 'undefined' || typeof isMonk !== 'function') return;
  const H = () => Math.max(1, (D && D.maxMana || 20) / 2);
  const cl = (v, a, b) => Math.max(a, Math.min(b, v));
  function ensure() { if (P.kR == null || isNaN(P.kR)) P.kR = 0; if (P.kA == null || isNaN(P.kA)) P.kA = 0; }
  const fracOf = tab => { ensure(); return cl((tab === 1 ? P.kA : P.kR) / H(), 0, 1); };
  const weak = f => 1 - 0.9 * Math.pow(cl(f, 0, 1), 2.5);
  KS.sand = tab => tab === 0 || tab === 1 ? weak(fracOf(tab)) : 1;
  KS.yy = KS.sand;                      // older readers (tooltips) ask for it by this name
  KS.fill = () => { ensure(); return { R: P.kR, A: P.kA, h: H(), fR: fracOf(0), fA: fracOf(1) }; };
  KS.halves = () => { const q = KS.fill(); return { yang: q.R, yin: q.A, h: q.h }; };
  const sync = () => { P.mana = Math.max(0, 2 * H() - P.kR - P.kA); };

  // ---- Weight stays gone
  wtAdd = function () { };
  wtText = function () { return ''; };
  Object.assign(KS, { wK: () => 0.5, wS: () => 0, wH: () => 0, wL: () => 0, wDmg: () => 1, stance: () => '' });
  P.weight = 50; P.kpoise = false;
  KS.pow = id => { const s = SK[id], tab = s ? s.tab : null; return D.dmgMult * KS.sky(tab) * KS.sand(tab) * (s ? syn(id) : 1); };
  const DESC = {
    kamber: 'Toggle: an aura of amber-white fire sears everything near you. While it burns it sets you on fire: it eats a little of your life every second.',
    khands: 'A quick melee flurry: one hundred open palms in 1.5 s into the enemy nearest the cursor, each burning it, ending with a shove that throws it back.',
    kbell: 'Chant one deafening syllable: a bell of bronze light drops over you. It stops missiles, and every blow struck on it from outside rings a blinding wave that burns and dazzles.',
    kbowl: 'You carry a wooden alms bowl. Missiles and spells that strike you from the front can fall into it instead (the chance grows with level). When it is full you drink: life, and a quarter of the sand in both bulbs of your glass runs back. Cast to drink what is in it now.',
    kbar: 'Your body is a fortress: blows lose much of their force on you and no longer push you. Standing in a doorway or a narrow pass, you close it: nothing smaller than a Bellwether can press past you.',
    kobsid: 'A guttural chant turns your skin to polished obsidian for a while. You move slower, but your fists hit far harder, and every punch leaves a fault in the enemy: at five faults it shatters.',
    kmount: 'Leap with shocking agility and land belly-first at the cursor, flattening everything beneath you; an earthquake of jagged stone rolls out from the impact.'
  };
  for (const id in DESC) if (SK[id]) SK[id].desc = DESC[id];
  const skyText = () => { for (const id of ['kdawn', 'keclipse']) if (SK[id] && SK[id].desc) SK[id].desc = SK[id].desc.replace(/\(shares its wait with [^)]*\)/, '(turning the sky is dear: it pours three times the sand)'); };
  skyText(); setTimeout(skyText, 0);
  for (const id in SK) { const s = SK[id]; if (s.cls !== 'monk') continue; if (s.desc) s.desc = s.desc.replace(/\s*Each laugh settles \d+ Weight into your belly\./, '').replace(/\s*\([^()]*Weight[^()]*\)/g, ''); for (const p of s.perks || []) if (p.desc) p.desc = p.desc.replace(/\s*\([^()]*Weight[^()]*\)/g, ''); }
  if (typeof drawMonkRow === 'function') drawMonkRow = function () { };
  const _dv = derive;
  derive = function () { const d = _dv.apply(this, arguments); try { if (P.cls === 'monk') d.manaRegen = 0; } catch (e) { } return d; };

  // ---- no cooldowns anywhere (the user's rule): the old waits on the sun, One-With-Nothing, the Thousand Arms and the
  // shared wait on the two sky skills are gone; those skills cost more instead (above: the pour caps at a quarter of a
  // bulb for the dearest; the Thousand Arms costs twice the poise)
  if (typeof MONK_CD === 'object') for (const k in MONK_CD) delete MONK_CD[k];

  // ---- casting pours sand
  // a cast pours a share of the bulb, scaled by how dear the skill is (12.8 is the common cost): about 5% a cast
  const POUR = 0.05, NORM = 12.8, CAP = 0.25;
  const pour = (tab, amt) => { ensure(); const h = H(); amt = Math.min(CAP, POUR * amt / NORM) * h; if (tab === 1) P.kA = Math.min(h, P.kA + amt); else P.kR = Math.min(h, P.kR + amt); P._ksPour = { tab, t: G.time }; sync(); };
  const _sp = spendMana;
  spendMana = function (id, amt) {
    if (!isMonk()) return _sp.apply(this, arguments);
    ensure(); const s = SK[id], tab = s ? s.tab : 0, need = amt != null ? amt : skillCost(id);
    if (tab === 2) { P.stam = Math.max(0, (P.stam || 0) - Math.max(1, Math.round(need * (id === 'kthousand' ? 1.2 : 0.6)))); P._kyTab = 2; P._kyCastT = G.time; return true; }
    // no waits (the user's rule): the dear skills cost more sand instead. Turning the sky pours three times over.
    pour(tab, (id === 'kdawn' || id === 'keclipse') ? need * 3 : need); P._kyTab = tab; P._kyCastT = G.time;
    try { arcOnSpend(id, amt); } catch (e) { }
    return true;
  };

  // ---- the sand running back
  function runBack(k, tab) {
    const h = H(), a = k * h; ensure();
    if (tab === 0) P.kA = Math.max(0, P.kA - a);
    else if (tab === 1) P.kR = Math.max(0, P.kR - a);
    else { P.kR = Math.max(0, P.kR - a * 0.6); P.kA = Math.max(0, P.kA - a * 0.6); }
    sync();
  }
  const srcTab = () => (P.swing > 0 ? 2 : P._kyTab != null ? P._kyTab : 2);
  const _hm = hurtMon;
  hurtMon = function (m, dmg, col) {
    const dead0 = m && m.dead, hp0 = m && m.hp;
    const r = _hm.apply(this, arguments);
    try {
      if (isMonk() && m && !dead0 && m.hp < hp0) {
        // any blow from any tree runs both bulbs back: no need to play both trees
        if (m.dead) runBack(0.12 / 0.6, 2);
        else if (G.time - (P._kyHitT || -9) > 0.08) { P._kyHitT = G.time; runBack(0.015 / 0.6, 2); }
      }
    } catch (e) { }
    return r;
  };
  if (typeof drinkBowl === 'function') { const _db = drinkBowl; drinkBowl = function () { const f = P.kbowl || 0, r = _db.apply(this, arguments); try { if (isMonk()) { ensure(); P.kR *= 0.75; P.kA *= 0.75; sync(); if (f > 0 && typeof aM === 'function' && aM('ka_bowl')) runBack(0.03 * f / 0.6, 2); } } catch (e) { } return r; }; }
  // the two Minor Arcana that fed the old orb now work on the glass
  if (typeof ARC === 'object') {
    if (ARC.ka_bowl) ARC.ka_bowl.up = 'Drinking from the Bowl-That-Holds-Nothing also runs 3% of the sand out of both bulbs for each thing it held.';
    if (ARC.ka_pitch) ARC.ka_pitch.up = 'Walks-Without-Feet pours a third less sand into the glass.';
  }

  // ---- every frame. The base monk code spends P.mana directly for held skills and stops them when it runs short:
  // give it a full glass to spend from, then pour whatever it spent into the right bulb.
  const _um = updateMonk;
  updateMonk = function (dt) {
    if (!isMonk()) return _um.apply(this, arguments);
    ensure(); const h = H(), BUF = 2 * h + 1000;
    P.mana = BUF;
    let r;
    try { r = _um.apply(this, arguments); }
    finally {
      try {
        const d = P.mana - BUF;
        if (d < -1e-6) pour(P.kwalk ? 1 : 0, -d * (P.kwalk && typeof aM === 'function' && aM('ka_pitch') ? 2 / 3 : 1));
        // the sand always runs back: slowly while he fights, fast once he stops casting
        const casting = P.cast > 0 || P.keye || P.klotus || P.kwalk || G.time - (P._kyCastT || -9) < 0.4;
        if (!P.dead) {
          const rate = h * (casting ? 0.10 : 0.35);
          P.kR = Math.max(0, P.kR - rate * dt); P.kA = Math.max(0, P.kA - rate * dt);
        }
        P.kR = cl(P.kR, 0, h); P.kA = cl(P.kA, 0, h); sync();
        P.weight = 50; P.kpoise = false; P.kskyCd = 0; if (P.kcd) for (const k in P.kcd) P.kcd[k] = 0;
      } catch (e) { }
    }
    return r;
  };

  // ---- the orb: an hourglass in the glass, held in a small bone frame. Amber sand heaps in the lower bulb, black sand
  // hangs in the upper one. Flat stepped values, one screen pixel per art pixel, a hard window highlight.
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const AMB = ['#3a1c06', '#6a3610', '#9c5a1a', '#cc862c', '#f0b448', '#ffe08a'].map(rgb);
  const INK = ['#040208', '#0e0a18', '#1a1330', '#2a2048', '#54408a', '#a890e0'].map(rgb);
  const BG = ['#050408', '#09080d', '#0e0d14', '#15131c'].map(rgb);
  const GLS = ['#1c2026', '#3e4450', '#7a8290', '#d8d8e0'].map(rgb);
  const BONE = ['#0e0c0a', '#2c2620', '#5a5044', '#8e8272', '#c2b8a4', '#ece4d0'].map(rgb);
  const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
  const HG = { R: 0 };
  // the bulb's half-width at height |v| (v: -1 top .. 1 bottom, the neck at 0)
  const NECK = 0.06, V0 = 0.09, V1 = 0.72, MAXW = 0.42;
  const bw = av => av < V0 ? NECK : av > V1 ? -1 : NECK + (MAXW - NECK) * Math.sqrt(Math.max(0, 1 - Math.pow((av - (V0 + V1) / 2) / ((V1 - V0) / 2) * 0.96 - 0.1, 2)));
  // fill level from the fraction of the bulb's volume, computed once
  let LVL = null;
  function levels() {
    if (LVL) return LVL;
    const n = 200, area = []; let tot = 0;
    for (let i = 0; i < n; i++) { const av = V1 - (V1 - V0) * (i + 0.5) / n, w = Math.max(0, bw(av)); tot += w; area.push(tot); }
    LVL = f => { const want = f * tot; let i = 0; while (i < n - 1 && area[i] < want) i++; return V1 - (V1 - V0) * (i + 1) / n; };
    return LVL;
  }
  // v0.55: zz_hud55.js paints the hourglass in its own niche; this painter stays as its fallback
  const hgOld = function (cx, cy, r) {
    ensure();
    const K = 4, n = Math.round(2 * r), N = n * K;
    if (!HG.c || HG.R !== r) { HG.R = r; HG.c = mkCanvas(n, n); HG.hr = mkCanvas(N, N); HG.c._hr = HG.hr; HG.x = HG.hr.getContext('2d'); HG.img = HG.x.createImageData(N, N); }
    const d = HG.img.data, h = H(), fR = cl(P.kR / h, 0, 1), fA = cl(P.kA / h, 0, 1), t = G.time || 0, lv = levels();
    // the heaps: amber rises from the bottom (a mound, higher in the middle); black hangs from the top (lower in the middle)
    const lvR = fR > 0.004 ? lv(fR) : 9, lvA = fR >= 0 && fA > 0.004 ? lv(fA) : 9;
    const pour = P._ksPour && t - P._ksPour.t < 0.45 ? P._ksPour.tab : -1;
    const run = !(P.cast > 0) && t - (P._kyCastT || -9) >= 0.6;
    const px = 1 / N * 2;
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const o = (j * N + i) * 4, u = (i + 0.5) / N * 2 - 1, v = (j + 0.5) / N * 2 - 1, rr = u * u + v * v;
      if (rr > 1) { d[o + 3] = 0; continue; }
      const au = Math.abs(u), av = Math.abs(v), g = hash2(i >> 1, j >> 1), g1 = hash2(i, j);
      // the ground: dark glass, a faint ring of stars turning very slowly
      let c = BG[rr > 0.86 ? 0 : rr > 0.55 ? 1 : 2];
      const ang = Math.atan2(v, u) + t * 0.05, rad = Math.sqrt(rr);
      if (rad > 0.74 && rad < 0.9 && hash2(Math.floor(ang * 40), 7) > 0.86 && Math.abs(rad - 0.82) < 0.012) c = BG[3];
      const w = bw(av);
      // the frame: two bone plates and two turned pillars
      if (av > 0.72 && av < 0.84 && au < 0.56) {
        const e = av > 0.82 || au > 0.54 ? 1 : av < 0.735 ? (v < 0 ? 2 : 4) : 3;
        c = BONE[(u < -0.3 && e >= 3) ? e + 1 : e];
        if (Math.abs(au - 0.28) < 0.02 && av > 0.745 && av < 0.8) c = BONE[1];         // a cut mark in the plate
      } else if (au > 0.47 && au < 0.53 && av <= 0.72) {
        const turn = Math.sin(av * 34) > 0.5;
        c = BONE[au < 0.49 ? (u < 0 ? 4 : 2) : au > 0.515 ? 1 : turn ? 3 : 2];
      } else if (w > 0 && au < w) {
        // inside the glass
        const top = v < 0;
        let sand = -1;
        if (!top && lvR < 9) { const mound = 0.05 * fR * (1 - Math.min(1, au / MAXW) ** 2); if (v > lvR - mound) sand = 0; }
        if (top && lvA < 9) { const mound = 0.05 * fA * (1 - Math.min(1, au / MAXW) ** 2); if (-v > lvA - mound) sand = 1; }
        if (sand === 0) {
          let k = 3 - (au > w - 0.05 ? 1 : 0) + (g > 0.9 ? 1 : 0) - (g < 0.08 ? 1 : 0);
          if (v > 0.55) k -= 1;
          if (v < lvR - 0.05 * fR * (1 - Math.min(1, au / MAXW) ** 2) + 0.03) k = 4;   // the lit crest of the heap
          if (run && g1 > 0.992) k = 5;                                                 // grains lifting as it runs back
          c = AMB[cl(k, 0, 5)];
        } else if (sand === 1) {
          let k = 2 + (g > 0.9 ? 1 : 0) - (g < 0.06 ? 1 : 0) + (au > w - 0.05 ? -1 : 0);
          if (v < -0.55) k -= 1;
          const edge = -v - (lvA - 0.05 * fA * (1 - Math.min(1, au / MAXW) ** 2));
          if (edge < 0.035) k = 4; if (edge < 0.012) k = 5;               // the underside of the hanging heap, lit violet
          if (g1 > 0.994) k = 5;
          c = INK[cl(k, 0, 5)];
        } else {
          c = GLS[0];
          if (au > w - px * 1.5) c = GLS[1];                                           // the glass wall
          if (u < 0 && au > w - 0.1 && au < w - 0.05 && av > 0.2 && av < 0.6) c = GLS[2]; // the window streak
        }
        // the streams through the neck while he casts: amber falls down, black rises up
        if (au < 0.018) {
          if (pour === 0 && v > -0.02 && v < lvR) c = AMB[(j + Math.floor(t * 60)) % 3 ? 4 : 5];
          if (pour === 1 && v < 0.02 && -v < lvA) c = INK[(j + Math.floor(t * 60)) % 3 ? 3 : 5];
        }
        if (au > w - px * 0.9) c = GLS[1];
      }
      // a glass shade toward the rim and one glint up and left, as on the other orbs
      const k = rr > 0.9 ? 0.7 : 1;
      d[o] = c[0] * k; d[o + 1] = c[1] * k; d[o + 2] = c[2] * k; d[o + 3] = 255;
      if ((u + 0.52) * (u + 0.52) + (v + 0.5) * (v + 0.5) < 0.004) { d[o] = 250; d[o + 1] = 246; d[o + 2] = 232; }
    }
    HG.x.putImageData(HG.img, 0, 0);
    ctx.drawImage(HG.c, Math.round(cx - r), Math.round(cy - r));
    if (typeof HUD54 !== 'undefined' && HUD54.on && HUD54.serpent) HUD54.serpent(cx, cy, r);
  };
  window.__hgOld = hgOld;
  if (typeof window.drawHourglassOrb !== 'function') window.drawHourglassOrb = hgOld;
  window.drawYinYangOrb = window.drawHourglassOrb;
  // v0.58: a cast that whiffs (no target: the base code refunds its Essence) pours no sand. The old refund went into
  // P.mana, which the glass ignores, so a missed palm still filled the bulb.
  if (typeof castSkill === 'function') {
    const _cs = castSkill;
    castSkill = function (id, a) {
      if (!isMonk()) return _cs.apply(this, arguments);
      ensure(); const r0 = P.kR, a0 = P.kA;
      const r = _cs.apply(this, arguments);
      try { const room = 2 * H() - P.kR - P.kA; if (P.mana > room + 0.01) { P.kR = r0; P.kA = a0; sync(); } } catch (e) { }
      return r;
    };
    try { window.__spm.castSkill = castSkill; } catch (e) { }
  }
  try { window.__yy = { ensure, H, runBack, weak }; window.__sand = { ensure, H, runBack, weak, pour }; window.__spm.spendMana = (...a) => spendMana(...a); window.__spm.KS = KS; } catch (e) { }
})();
