// zz_tune_batch_d.js
// Session 2026-09-27 late-pass tuning:
//   1. Poise: slower regen and it comes in CHUNKS (not smooth), only real investment (con) makes it plentiful.
//   2. Vitality → health only, tiny sliver of poise.
//   3. Miasma essence regen 50% slower baseline.
//   4. Miasma cloud-standing regen bug: multiple overlapping clouds should NOT stack. Only one bonus per frame.
//   5. Monster stun-lock fix: after a reel ends, the monster has a poise-grace window so it can't be chained back into reel.
(function () {

  // ─── (1)+(2) Poise: slower, chunky, con-driven ───────────────────────────
  if (typeof derive === 'function') {
    const _d = derive;
    derive = function () {
      const d = _d.apply(this, arguments);
      const con = d.con || 0, vit = d.vit || 0;
      const armorBase = (function () { try { return itemStatSum().armorBase || 0; } catch (e) { return 0; } })();
      // MAX poise: mostly constitution. Vit gives only a whisper.
      d.maxStam = Math.max(20, Math.round(28 + 1.4 * con + 0.08 * vit + 0.25 * armorBase));
      // v0.51: gradual return, not chunky pops. Slow trickle, con speeds it up.
      d.stamRegen = 4 + 0.35 * con;   // 4/s baseline at 0 con -> ~9/s at 15 con -> ~14/s at 30 con
      return d;
    };
  }
  // v0.51 change: base's smooth regen uses POISE.regen (~30/s) which was too fast; replace it with
  // a tempered gradual regen and add the post-break "recovery" state described below.
  // Also implement: walk speed at level 1 is too fast — cut 25% (players earn speed via items).
  // Also implement: after a hero poise break, the character is "reeling" — recovers up to 20% before
  // taking another poise hit, but during that window: slower & weaker melee/ranged, reduced move speed,
  // no dodging.
  if (typeof updatePlayer === 'function') {
    const _up = updatePlayer;
    updatePlayer = function (dt) {
      const stam0 = P ? P.stam : 0;
      _up.apply(this, arguments);
      if (!P || P.dead || !D) return;
      // roll back base smooth regen (POISE.regen) — we'll apply our own trickle instead
      if (P.stam > stam0 && P.stamDelay <= 0 && P.roll <= 0) P.stam = stam0;
      // our gradual regen: only when not in delay, not rolling, not dead
      if (P.stamDelay <= 0 && P.roll <= 0 && P.stam < D.maxStam && D.stamRegen) {
        P.stam = Math.min(D.maxStam, P.stam + D.stamRegen * dt);
      }
      // POST-BREAK RECOVERY STATE
      // Enter when stam hits 0 via a hit (playerPoiseHit already sets P.stagger); we then set
      // P.recovering + P.recovCap = 20% and hold poise-immune until stam >= 20% again.
      if (P.stam <= 0.001 && !P.recovering) {
        P.recovering = true;
        P.recovCap = Math.max(1, Math.round(D.maxStam * 0.20));
        P.poiseGrace = Math.max(P.poiseGrace || 0, 6);   // long grace so hits can't restart the break
      }
      if (P.recovering) {
        // regen still ticks (we already applied it above); once we hit 20%, exit the state
        if (P.stam >= P.recovCap) { P.recovering = false; P.recovCap = 0; }
      }
    };
  }

  // ─── (0) LEVEL-1 WALK SPEED: cut 25% ─────────────────────────────────────
  // Runs on every derive. My earlier zz_movespd_curve.js already brought base to 4.15 and capped frw.
  // Apply another *0.75 on top of the whole moveSpd so the level-1 baseline feels earned.
  if (typeof derive === 'function') {
    const _d3 = derive;
    derive = function () {
      const d = _d3.apply(this, arguments);
      if (d.moveSpd != null) d.moveSpd *= 0.75;
      return d;
    };
  }

  // ─── While P.recovering: weaker/slower melee & ranged, reduced move speed, no dodging ────────
  // Move speed cut: applied via a small additional multiplier in derive.
  if (typeof derive === 'function') {
    const _d4 = derive;
    derive = function () {
      const d = _d4.apply(this, arguments);
      if (P && P.recovering) {
        if (d.moveSpd != null) d.moveSpd *= 0.55;
        if (d.dmgMult != null) d.dmgMult *= 0.6;   // spells / skills weaker
        if (d.meleeMult != null) d.meleeMult *= 0.6; // melee weaker
        if (d.castSpd != null) d.castSpd *= 0.7;   // cast slower
      }
      return d;
    };
  }
  // No dodging while recovering — wrap tryRoll to bail out.
  if (typeof tryRoll === 'function') {
    const _tr = tryRoll;
    tryRoll = function () {
      if (P && P.recovering) { if (typeof say === 'function') say('too shaken to roll', 0.6); return; }
      return _tr.apply(this, arguments);
    };
  }
  // Ranged basic-attack fired via a wand: cut damage via a marker the shooter reads (dmgMult already halved).
  // The basic swing() and fireMissile() functions read D.meleeMult / D.dmgMult, so the above already handles it.

  // ─── (3)+(4) Miasma essence regen: slower + no cloud stacking ────────────
  // Base derive: d.manaRegen for miasmancer is (1.2 + 0.04*spi) via base derive; my earlier animancer override
  // does not affect miasmancer. Cut the miasmancer baseline in half.
  if (typeof derive === 'function') {
    const _d2 = derive;
    derive = function () {
      const d = _d2.apply(this, arguments);
      if (P && P.cls === 'miasmancer') {
        // half base
        d.manaRegen = (d.manaRegen || 0) * 0.5;
      }
      return d;
    };
  }
  // Cloud-stacking bug: base updateMias adds `manaRegen * 1.5 * ... * dt` if P.inMiasma. That's already a
  // per-frame boolean, so it shouldn't stack. But the passive inhale (in zz_miasma_breath.js) also sips from
  // EACH cloud in range, summing up. That IS stacking. Cap the cloud contribution to a SINGLE cloud's worth
  // per tick.
  if (typeof updateMias === 'function') {
    const _u = updateMias;
    let bestCloudT = 0;
    updateMias = function (dt) {
      // Before the base runs, snapshot P.mana to detect additive gains and cap them.
      const beforeMana = P.mana;
      _u.apply(this, arguments);
      if (!isMias() || P.dead || !dt) return;
      // If a per-frame cloud stack awarded more than what a single-cloud tick should have,
      // clamp it. Single-cloud tick is manaRegen * 1.5 * dt (from m_mias.js line 583).
      const singleTick = (D.manaRegen || 0) * 1.5 * dt * (P.skills && P.skills.toxfeed > 0 ? 2 : 1);
      // We don't strictly know how many clouds contributed; but if the gain since we snapshotted exceeds
      // the single-tick amount PLUS the baseline regen, trim it back.
      const baseline = (D.manaRegen || 0) * dt;   // baseline out-of-cloud
      const legalGain = baseline + singleTick + 0.05;   // 0.05 slack for inhale passive
      const gained = P.mana - beforeMana;
      if (gained > legalGain && gained > 0) {
        P.mana = beforeMana + legalGain;
      }
    };
  }

  // ─── (5) Monster poise — PoE 2 style ────────────────────────────────────
  // Symptoms fixed: (a) stun-lock during reel, (b) monsters were made of paper poise.
  // Rules (PoE 2 heavy-stun feel):
  //   • Poise MAX is much higher — 3× the base game's monPoiseK, so regular hits fill it slowly.
  //   • Reel recovery is FAST — 0.35s normal, 0.25s elite, 0.2s boss (was ~1.0 / 0.7 / 0.5).
  //   • After reel ends, grace window (2s / 1.4s / 0.9s) blocks new poise damage so the stagger
  //     is an event, not a chain.
  //   • Hits landing during reel deepen it only very slightly (+0.05s), never re-lock the monster.
  if (typeof monPoiseMax === 'function') {
    const _mpm = monPoiseMax;
    monPoiseMax = function (m) { return _mpm(m) * 3.0; };
  }
  if (typeof poiseHit !== 'function') return;
  const _poise = poiseHit;
  poiseHit = function (m, amt) {
    if (!m || m.dead) return;
    if ((m.poiseGrace || 0) > 0) return;    // hits during grace do not touch poise at all
    return _poise.apply(this, arguments);
  };
  // Override the reel duration to a PoE-2-fast recovery.
  if (typeof updatePoise22 === 'function') {
    const _up22 = updatePoise22;
    updatePoise22 = function (m, dt) {
      // If a fresh reel was just set to the base's ~1.0s value, clamp it down before it starts ticking.
      if (m.reel > 0 && !m.reelFastened) {
        const fast = m.rank === 'boss' ? 0.20 : m.rank === 'unique' ? 0.25 : 0.35;
        if (m.reel > fast) m.reel = fast;
        m.reelFastened = true;
      }
      const wasReeling = (m.reel || 0) > 0;
      _up22.apply(this, arguments);
      if (wasReeling && (m.reel || 0) <= 0) {
        m.reelFastened = false;
        // start grace so a new reel can't fire immediately
        if (!m.poiseGrace) m.poiseGrace = m.rank === 'boss' ? 0.9 : m.rank === 'unique' ? 1.4 : 2.0;
      }
      if (m.poiseGrace > 0) m.poiseGrace -= dt;
    };
  }
})();
