// zz_stagger_deep.js
// User: "when poise break they should be staggered and have to recover, getting hit
// while staggered makes it worse, and they lows walking speed too"
//
// The base game already sets m.reel + m.stun on poise-break and adds 1.25x damage taken.
// This override:
//   - Extends `reel` on every hit landed WHILE the monster is already reeling
//   - Adds a `staggerT` timer distinct from reel — the "recover" state that lingers past the initial reel,
//     during which the monster's walk speed is cut
//   - While staggered: monster can still act, but slowly. Getting hit deepens the stagger up to a cap.
//   - Applies to bosses too but with a smaller multiplier so a boss doesn't chain-stagger to nothing.
(function () {
  // v0.51 (PoE-2 style, per user): no more deepening on stagger; monsters recover fast.
  // Just tag a lingering staggerT for the slow-walk & tenderness window after the (now-fast) reel.
  if (typeof poiseHit !== 'function') return;
  const _poise = poiseHit;
  poiseHit = function (m, amt) {
    if (!m || m.dead || amt <= 0) return;
    _poise.apply(this, arguments);
    if (m.reel > 0 && !m.staggerT) {
      m.staggerT = 0.8;   // short walk-slow window after the fast reel (was reel + 1.2s)
    }
  };

  // While staggered (post-reel), cut monster walk speed and boost damage taken a bit longer.
  if (typeof monDmg22 === 'function') {
    const _dmg = monDmg22;
    monDmg22 = function (m, d) {
      const out = _dmg.apply(this, arguments);
      // during the lingering stagger (after reel expires) keep an extra tenderness
      if (m && (m.staggerT || 0) > 0 && m.reel <= 0) return out * 1.12;
      return out;
    };
  }

  // Speed cut on staggered monsters: wrap monMove to check.
  if (typeof monMove === 'function') {
    const _mv = monMove;
    monMove = function (m, tx, ty, spd, dt) {
      let s = spd;
      if (m && (m.staggerT || 0) > 0) s *= 0.55;
      return _mv.call(this, m, tx, ty, s, dt);
    };
  }

  // Tick down staggerT per monster each frame. Wrap updatePoise22 which already runs per monster.
  if (typeof updatePoise22 === 'function') {
    const _u = updatePoise22;
    updatePoise22 = function (m, dt) {
      _u.call(this, m, dt);
      if (m && m.staggerT > 0) m.staggerT -= dt;
    };
  }

  // While staggered, the walker also loses their intent — prevent windup transitions during the reel/stagger.
  // The base already blocks acting during `m.reel > 0` via ai state checks (m.state = 'chase' after reel expires).
  // We just make the follow-up stagger visible: draw a faint amber wisp above staggered monsters occasionally.
  if (typeof update === 'function') {
    const _upd = update;
    let visTick = 0;
    update = function (dt) {
      _upd(dt);
      visTick -= dt; if (visTick > 0) return; visTick = 0.15;
      if (!G || !G.zone || !G.zone.monsters || typeof parts === 'undefined') return;
      for (const m of G.zone.monsters) {
        if (m.dead) continue;
        if (m.staggerT > 0) {
          parts.push({ x: m.x + (Math.random() - 0.5) * 0.4, y: m.y + (Math.random() - 0.5) * 0.4, z: 12 + Math.random() * 4, vx: 0, vy: 0, vz: 0.6, t: 0.5, col: '#e8d270' });
        }
      }
    };
  }
})();
