// zz_melee_chain.js (v0.54) — every order's melee gets the Empty Hand's moveset. The user: "the monks move set attacks
// is the goal for all melee attacks and skills and for every weapon set and every class. It brings more of the dark
// souls feel of combat into the game while retaining the Poe and d2 style".
// The Empty Hand's weapon attack is a string of three blows (light1, light2, light3), a held heavy (zz_mech_heavy.js)
// and the roll. Now every melee swing, for every order and weapon, is that string:
//  1. a quick cut: fast, a short step in                        (x1.00 damage, 0.85 of the swing time)
//  2. the return cut, the other way: a longer step              (x1.10, 0.95 of the time)
//  3. the finisher, overhead: slow, a real lunge, reaches further, lands with a thump, a ring of dust and a
//     heartbeat of hit-stop; it staggers what it hits           (x1.60, 1.35 of the time, +0.35 yd reach)
// The string holds while you keep swinging: stop for more than 0.8 s after a blow and it starts again at 1. A roll
// resets it; so does a heavy. The finisher costs a little poise (it never locks you out).
// Each blow draws its own arc: a flat cut, the reverse cut, and the overhead with a crack in the ground.
(function () {
  if (typeof swing !== 'function') return;
  const STEP = [
    { dmg: 1.00, time: 0.85, step: 0.12, reach: 0.0, arc: 'cut' },
    { dmg: 1.10, time: 0.95, step: 0.20, reach: 0.1, arc: 'back' },
    { dmg: 1.60, time: 1.35, step: 0.42, reach: 0.35, arc: 'over', poise: 4, stop: 0.07, stagger: 0.35 }
  ];
  const CH = { n: -1, lastEnd: -9, fx: [] };
  const melee = () => { try { return !hasWand() && !(typeof miasThrows === 'function' && miasThrows()); } catch (e) { return true; } };
  let extraReach = 0;
  const _mr = meleeReach;
  meleeReach = function () { return _mr.apply(this, arguments) + extraReach; };

  const _sw = swing;
  swing = function (m) {
    if (!melee() || P.roll > 0) return _sw.apply(this, arguments);
    const HV = window.__spm && window.__spm.HV;
    if (HV && HV.mul > 0) { CH.n = -1; return _sw.apply(this, arguments); }       // a heavy blow stands apart and resets the string
    const cont = G.time - CH.lastEnd < 0.8 && CH.n >= 0 && CH.n < 2;
    const n = cont ? CH.n + 1 : 0, S = STEP[n], c0 = P.cast, sw0 = P.swing;
    const mm = D.meleeMult; D.meleeMult = mm * S.dmg; extraReach = S.reach;
    const hp0 = m && m.hp;
    let r;
    try { r = _sw.apply(this, arguments); } finally { D.meleeMult = mm; extraReach = 0; }
    const swung = P.cast > c0 + 1e-6 || P.swing > sw0 + 1e-6;
    if (!swung) return r;                                                            // held for a heavy: nothing swung yet
    CH.n = n;
    // the rhythm of this blow
    { const dc = P.cast - c0; P.cast = c0 + dc * S.time; }
    CH.lastEnd = G.time + Math.max(0, P.cast);
    // the step in, toward the one struck (or the way you face); never into it
    try {
      const tx = m && !m.dead ? m.x - P.x : (P.lastDir ? P.lastDir.x : P.face || 1), ty = m && !m.dead ? m.y - P.y : (P.lastDir ? P.lastDir.y : 0);
      const l = Math.hypot(tx, ty) || 1, gap = m && !m.dead ? Math.max(0, l - (m.r || 0.4) - (P.r || 0.35) - 0.15) : S.step;
      const d = Math.min(S.step, gap); if (d > 0.01) moveCircle(P, tx / l * d, ty / l * d);
    } catch (e) { }
    if (typeof isMonk === 'function' && isMonk()) P._mkChain = n - 1;               // the Empty Hand's painted chain keeps the count
    const landed = m && hp0 != null && (m.hp < hp0 || m.dead);
    if (S.poise) P.stam = Math.max(0, (P.stam || 0) - S.poise);
    if (n === 2) {
      if (landed) {
        try { hitStop(S.stop); } catch (e) { }
        G.shake = Math.max(G.shake || 0, 2.2);
        if (!m.dead && m.rank !== 'boss') m.stun = Math.max(m.stun || 0, S.stagger);
      }
      sfx(90, 0.18, 'square', 0.05, -50);
    }
    const tgt = m && !m.dead ? m : null;
    CH.fx.push({ kind: S.arc, x: P.x, y: P.y, ang: tgt ? Math.atan2(tgt.y - P.y, tgt.x - P.x) : Math.atan2(P.lastDir ? P.lastDir.y : 0, P.lastDir ? P.lastDir.x : (P.face || 1)), t: 0, max: n === 2 ? 0.42 : 0.24, hit: landed });
    return r;
  };
  // a roll breaks the string
  if (typeof tryRoll === 'function') { const _tr = tryRoll; tryRoll = function () { const r = _tr.apply(this, arguments); if (P.roll > 0) CH.n = -1; return r; }; }

  // ---- the arcs, over the creatures (drawn with the floating numbers)
  const _dt = drawTexts;
  drawTexts = function () {
    try {
      const dt = G._ftDt || 1 / 60;
      for (const f of CH.fx) {
        f.t += 1 / 60; const k = f.t / f.max; if (k >= 1) continue;
        const p = iso(f.x, f.y), a = 1 - k;
        // the direction on screen: iso of a unit step along the attack
        const q = iso(f.x + Math.cos(f.ang), f.y + Math.sin(f.ang)), dx = q.sx - p.sx, dy = q.sy - p.sy, sa = Math.atan2(dy, dx);
        ctx.save(); ctx.translate(Math.round(p.sx), Math.round(p.sy - 10)); ctx.lineCap = 'butt';
        // v93: the user ("the white line is coming from the normal attack"): no light on attacks. The cuts draw nothing;
        // the overhead leaves only a few dark flecks of kicked-up grit where it lands.
        if (f.kind !== 'cut' && f.kind !== 'back' && k >= 0.35) {
          const fx = dx * 11, fy = dy * 11 + 10, kk = (k - 0.35) / 0.65;
          ctx.fillStyle = `rgba(20,14,12,${(0.8 * (1 - kk)).toFixed(3)})`;
          for (let i = 0; i < 5; i++) { const aa = i * 1.26 + 0.3, l = 3 + kk * 7; ctx.fillRect(Math.round(fx + Math.cos(aa) * l), Math.round(fy + Math.sin(aa) * l * 0.5), 2, 1); }
        }
        ctx.restore();
      }
      CH.fx = CH.fx.filter(f => f.t < f.max);
    } catch (e) { }
    return _dt.apply(this, arguments);
  };
  try { window.__chain = { CH, STEP }; } catch (e) { }
})();
// ---- the Ossuarch's bone strikes get strings of their own (v0.55; the user: "Take care of the tasks you mentioned").
// Bone Blade is a swing, so it already rides the string above. Scythe Sweep, Marrow Crush, Spine Lash, Grave Leap and
// Grinding Charge each keep their own count: the same strike again within 0.9 s is the next blow of its string;
// the third is the finisher (x1.5, slower, it staggers what it hits). Switching strikes starts a new string.
(function () {
  if (typeof boneCast !== 'function' || typeof O6_MELEE === 'undefined') return;
  const MULT = [1.0, 1.1, 1.5], TIME = [0.9, 1.0, 1.3];
  const S = { id: null, n: -1, lastEnd: -9 };
  let mult = 1, fin = false;
  const _hm = hurtMon;
  hurtMon = function (m, dmg) {
    if (mult !== 1 && typeof dmg === 'number') { arguments[1] = dmg * mult; }
    const r = _hm.apply(this, arguments);
    try { if (fin && m && !m.dead && m.rank !== 'boss') m.stun = Math.max(m.stun || 0, 0.35); } catch (e) { }
    return r;
  };
  const _bc = boneCast;
  boneCast = function (id, pt) {
    if (!O6_MELEE[id] || id === 'blade' || typeof isBone !== 'function' || !isBone() || P.cast > 0 || P.roll > 0) return _bc.apply(this, arguments);
    const cont = S.id === id && G.time - S.lastEnd < 0.9 && S.n >= 0 && S.n < 2, n = cont ? S.n + 1 : 0, c0 = P.cast;
    mult = MULT[n]; fin = n === 2;
    let r; try { r = _bc.apply(this, arguments); } finally { mult = 1; fin = false; }
    if (P.cast > c0 + 1e-6) {
      S.id = id; S.n = n; P.cast = c0 + (P.cast - c0) * TIME[n]; S.lastEnd = G.time + P.cast;
      if (n === 2) { G.shake = Math.max(G.shake || 0, 2); try { hitStop(0.06); } catch (e) { } sfx(85, 0.16, 'square', 0.05, -40);
        try { const CH = window.__chain && window.__chain.CH, a = pt || aimPoint(); if (CH) CH.fx.push({ kind: 'over', x: P.x, y: P.y, ang: Math.atan2(a.y - P.y, a.x - P.x), t: 0, max: 0.42 }); } catch (e) { } }
    }
    return r;
  };
  try { if (window.__spm) window.__spm.boneCast = boneCast; window.__boneChain = S; } catch (e) { }
})();
