// zz_progression.js  (owner: QA & Balance, "The Tallyman")
// User (2026-09-27): "keep track of how the hero progresses, because we want level
// 36-40 to be the standard by the end of play through 1 but it can vary."
//
// Playthrough 1 = five acts: Act 1 (mlvl 1-17), Act 2 (18-24), Act 3 (24-30), Act 4 (30-34),
// Act 5 (34-40). The base xpNext curve is built for a much longer climb, so the XP a kill pays
// is scaled by monster level here. The curve was tuned against a full-playthrough simulator
// (scratchpad/qa/progsim.js): 75% of main-path kills, 50% of kills in ~60% of side zones, all
// bosses. Targets: end of Act 1 ~16-18, Act 2 ~24-26, Act 3 ~30-31, Act 4 ~33-35, Act 5 ~37-39.
//
// xpNext is a const in c_game.js and must never be reassigned (that threw at load and stopped
// every later zz file). All scaling is applied to the XP GAINED instead.
(function () {
  if (typeof makeMon !== 'function') return;

  // Two knobs, both piecewise-linear:
  //  XP_KNOTS  - kill XP multiplier by effective monster level. It mostly normalises the five builders'
  //              monster XP values and pack densities (Act 4 zones pay ~1.5x what Act 3 zones do per zone).
  //  LVL_KNOTS - XP-gain factor by the hero's level (1 up to 16, then easing to ~0.53 by 40). This is the
  //              same as a steeper xpNext past 16 without touching xpNext, and it self-corrects: a hero who
  //              clears more than the average is slowed a little more, one who clears less a little less.
  const XP_KNOTS = [[1, 0.72], [24, 0.74], [30, 0.78], [34, 0.6], [40, 0.72]];
  const LVL_KNOTS = [[1, 1], [16, 1], [21, 0.92], [27, 0.9], [32, 0.6], [36, 0.58], [40, 0.53]];
  function lerpK(K, v) {
    const l = +v || 1;
    if (l <= K[0][0]) return K[0][1];
    for (let i = 1; i < K.length; i++) if (l <= K[i][0]) { const a = K[i - 1], b = K[i]; return a[1] + (b[1] - a[1]) * (l - a[0]) / (b[0] - a[0]); }
    return K[K.length - 1][1];
  }
  const xpMult = mlvl => lerpK(XP_KNOTS, Math.max(1, +mlvl || 1));
  const lvlK = l => lerpK(LVL_KNOTS, l);

  // Act 1's catacombs. zz_mech_balance.js adds a flat mlvl bump per Act 1 zone (from when Act 1 was
  // the whole game): cata1 +8 (18-21) and cata2 +11 (24-27, Matron 27). With five acts that runs Act 1's
  // last two zones past all of Act 2 (18-24). WANT_BUMP is the bump we want instead; the arriving
  // mlvl is pre-shifted so the inner wrapper's bump lands on it. Runtime spawns in these zones
  // (the Matron, her adds, champions' calls) are also capped near the zone's generated top, so a
  // caller that passes an already-bumped level is not bumped twice.
  const MECH_BUMP = { crypt: 3, barrow: 3, fen: 4, cata1: 8, cata2: 11 };
  const WANT_BUMP = { crypt: 3, barrow: 3, fen: 4, cata1: 3, cata2: 2 };   // cata1 13-16, cata2 15-17, Matron 18
  const genMax = {};
  const _make = makeMon;
  makeMon = function (type, x, y, mlvl, rank, mods) {
    const args = Array.prototype.slice.call(arguments);
    let zid = null, gz = null;
    try { gz = (G && G.__genZone) || null; zid = gz || (G && G.zone && G.zone.id) || null; } catch (e) {}
    const fix = zid && Object.prototype.hasOwnProperty.call(MECH_BUMP, zid);
    if (fix) {
      let want = (mlvl | 0) + WANT_BUMP[zid];
      if (!gz && genMax[zid]) want = Math.min(want, genMax[zid] + 2);
      args[3] = Math.max(1, want - MECH_BUMP[zid]);
    }
    const m = _make.apply(this, args);
    if (!m || m.dead) return m;
    if (fix && gz && rank !== 'boss') genMax[zid] = Math.max(genMax[zid] || 0, m.mlvl | 0);
    m.xpRaw = m.xp || 0;
    m.xp = Math.round(m.xpRaw * xpMult(m.mlvl));
    return m;
  };
  try { if (typeof window !== 'undefined' && window.__spm) window.__spm.makeMon = makeMon; } catch (e) {}

  if (typeof gainXp === 'function') {
    const _gx = gainXp;
    gainXp = function (n) {
      if (typeof n === 'number' && n > 0) n = n * lvlK((P && P.level) || 1);
      const a = Array.prototype.slice.call(arguments); a[0] = n;
      return _gx.apply(this, a);
    };
  }

  // QA hooks (views for the progression / boss / stability harnesses). window.__qaHurt, when a test sets
  // it, sees every blow the hero takes (and may veto it to model a player who dodged); unset in play.
  if (typeof hurtPlayer === 'function') {
    const _hp = hurtPlayer;
    hurtPlayer = function (dmg, type) {
      const f = (typeof window !== 'undefined') && window.__qaHurt;
      if (!f) return _hp.apply(this, arguments);
      const st = String(new Error().stack || '');
      if (f('pre', dmg, type, st) === false) return;
      const h0 = P.hp, r = _hp.apply(this, arguments);
      try { f('post', h0 - P.hp, type, st); } catch (e) {}
      return r;
    };
  }
  try {
    if (typeof window !== 'undefined') window.__qa = {
      XP_KNOTS, LVL_KNOTS, xpMult, lvlK,
      zoneIds: () => Object.keys(ZONE_GEN),
      genZone: (id, seed) => ZONE_GEN[id](seed),
      derive: () => derive(), xpNext: l => xpNext(l),
      hurtPlayer: (...a) => hurtPlayer(...a), hurtMon: (...a) => hurtMon(...a), killMon: (...a) => killMon(...a),
      rollItem: (...a) => rollItem(...a), itemStatSum: () => itemStatSum(),
      BASES: () => BASES, canEquip: (...a) => canEquip(...a), isOutdoor: z => (typeof isOutdoor === 'function' ? !!isOutdoor(z) : null),
      step: (dt, n) => { for (let i = 0; i < n; i++) { if (!G.running) break; G.time += dt; update(dt); } }
    };
  } catch (e) {}
})();
