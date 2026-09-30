// zz_zv60.js — the user (2026-09-29): "reduce the size of monster mobs by 15%. the micro stagger still feels too good,
// maybe we get staggered briefly, like how poe 2 does it, then we recover and poise comes back."
(function () {
  // ---------------------------------------------------------------- (1) packs 15% smaller (v0.62: the user meant the size of
  // the mobs, not of the creatures, so the creatures are back to full size and each pack holds 15% fewer)
  const MK = 0.85;
  if (typeof placePack === 'function') {
    const _pp = placePack;
    placePack = function (z, x, y, mlvl, table, packId, rng) {
      if (!Array.isArray(table) || !table.length) return _pp.apply(this, arguments);
      const r = rng || Math.random;
      const t2 = table.map(def => { const o = def.slice(); for (let k = 0; k < o.length; k += 3) { const lo = o[k + 1] * MK, hi = o[k + 2] * MK; o[k + 1] = Math.max(1, Math.floor(lo + r())); o[k + 2] = Math.max(o[k + 1], Math.floor(hi + r())); } return o; });
      return _pp.call(this, z, x, y, mlvl, t2, packId, rng);
    };
  }

  // ---------------------------------------------------------------- (2) poise break, PoE 2 style
  // Before: a 0.33 s blip, then a long "shaken" state (slow, weak, no roll) until poise crawled back to 12%, and every
  // blow shoved you a little. Now: a real stun you can see (0.75 s, he reels, cannot move or act), then it is over:
  // poise refills to full in a moment and a short grace keeps the crowd from breaking you again straight away.
  // Light blows no longer shove you around; only heavy ones (a big share of your life) knock you back.
  const STUN = 0.75, GRACE = 1.6, REFILL = 0.35, BURST = 0.5;   // v0.62: a burst back to half, then the ordinary trickle
  if (typeof POISE === 'object') POISE.reel = STUN;
  if (typeof playerPoiseHit === 'function') {
    const _pph = playerPoiseHit;
    playerPoiseHit = function (d) {
      const was = P.stagger || 0;
      _pph.apply(this, arguments);
      if ((P.stagger || 0) > was + 0.01) {           // this blow broke him
        P.heavyStun = STUN; P.stagger = STUN; P.cast = Math.max(P.cast || 0, STUN);
        P.poiseGrace = STUN + GRACE; P._stunX = P.x; P._stunY = P.y; P._refill = 0; P._noRoll = true;
        G.shake = Math.max(G.shake || 0, 4);
      }
    };
  }
  if (typeof hurtPlayer === 'function') {
    const _hp = hurtPlayer;
    hurtPlayer = function (dmg, type, fx, fy) {
      const x0 = P.x, y0 = P.y;
      const r = _hp.apply(this, arguments);
      try {
        const heavy = (P.lastBlow || 0) > (D.maxHp || 100) * 0.12;
        if (!heavy && !(P.heavyStun > 0)) { P.x = x0; P.y = y0; }   // light blows: no shove
      } catch (e) { }
      return r;
    };
  }
  if (typeof updatePlayer === 'function') {
    const _up = updatePlayer;
    updatePlayer = function (dt) {
      const r = _up.apply(this, arguments);
      try {
        if (!P || P.dead) return r;
        if (P.heavyStun > 0) {
          P.heavyStun -= dt; P.stam = 0; P.poiseGrace = Math.min(P.poiseGrace || 0, Math.max(0, P.heavyStun) + GRACE); P.path = null; P.target = null; P.approach = null;
          if (P._stunX != null) { P.x = P._stunX; P.y = P._stunY; }        // rooted while reeling
          if (P.heavyStun <= 0) { P.heavyStun = 0; P._refill = REFILL; P._stunX = null; P.stagger = 0; }
        } else if (P._refill > 0) {                                   // recovered: a burst back to half poise, fast
          P._refill -= dt; P.recovering = false; P.recovCap = 0;
          P.stam = Math.min(D.maxStam * BURST, P.stam + D.maxStam * BURST * dt / REFILL);
          if (P._refill <= 0) { P.stam = Math.max(P.stam, D.maxStam * BURST); P._refill = 0; }
          P.poiseGrace = Math.min(P.poiseGrace || 0, GRACE);
        }
        // no rolling from the break until the poise bar is full again (the rest refills at the ordinary rate)
        if (P._noRoll && P.stam >= D.maxStam - 0.5) P._noRoll = false;
        if (P.recovering && !(P.heavyStun > 0)) { P.recovering = false; P.recovCap = 0; }   // no lingering "shaken" state
      } catch (e) { }
      return r;
    };
  }
  if (typeof tryRoll === 'function') {
    const _tr = tryRoll;
    tryRoll = function () {
      if (P && (P.heavyStun > 0 || P._noRoll)) { if (typeof say === 'function' && !(P._nrSay > G.time)) { say('too shaken to roll', 0.6); P._nrSay = G.time + 1; } return; }
      return _tr.apply(this, arguments);
    };
  }
  // he visibly reels: the hit animation plays through the stun (heroes that have one)
  if (typeof heroPose === 'function') {
    const _hpz = heroPose;
    heroPose = function () {
      const r = _hpz.apply(this, arguments);
      if (P.heavyStun > 0 && P.cls === 'ossumancer') return ['hit', Math.min(5, Math.floor((1 - P.heavyStun / STUN) * 6))];
      return r;
    };
  }
  try { window.__v60 = { MK, STUN, GRACE, REFILL }; } catch (e) { }
})();
