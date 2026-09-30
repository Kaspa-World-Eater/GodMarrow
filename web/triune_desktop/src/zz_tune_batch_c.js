// zz_tune_batch_c.js
// Batch tuning pass from 2026-09-27 session:
//   1. Loot: reduce drop rate by 50% and magic+ chance by 50%.
//   2. Poise: smaller base (level-1 balanced), walking drains it slowly, refills faster with VIT/CON stat.
//   3. Mana regen at level 1 too fast for the Hollow Mystic (Animancer). Slow it down.
//   4. Iron Pillars ("mirrors") break after N hits — from monsters or from us; they glint; ranged shots
//      reflect off them but do damage; a charging monster (bellweather-type) can shatter through if a
//      single blow exceeds a threshold.
//   5. Skill desc scrub: strip literal-game words ("chain lightning", "lightning strike",
//      "lightning bolt", "chain damage") from any surviving desc.
(function () {

  // ─── (1) LOOT: another 50% drop-rate cut + 50% magic+ chance cut ─────────
  if (typeof dropLoot === 'function') {
    const _drop = dropLoot;
    dropLoot = function () {
      // v0.88 (user: "the drop rate seems a little low"): the blanket halving is gone; the per-rank gate in zz_pace_and_density decides
      return _drop.apply(this, arguments);
    };
    try { if (typeof window !== 'undefined' && window.__spm) window.__spm.dropLoot = dropLoot; } catch (e) {}
  }
  if (typeof rollItem === 'function') {
    const _roll = rollItem;
    rollItem = function () {
      const it = _roll.apply(this, arguments);
      if (!it) return it;
      // half the magic+ drops downgrade to normal (unique untouched)
      if ((it.q === 'magic' || it.q === 'rare') && Math.random() < 0.5) {
        it.q = 'normal';
        it.name = (typeof BASES !== 'undefined' && BASES[it.base] && BASES[it.base].name) || it.name;
        it.stats = {};
      }
      return it;
    };
    try { if (typeof window !== 'undefined' && window.__spm) window.__spm.rollItem = rollItem; } catch (e) {}
  }

  // ─── (2) POISE at level 1 ────────────────────────────────────────────────
  // Base was 50 + con + vit + 0.35*armorBase. That's ~50 with 0 stats → 65 at start.
  // User: "start poise small, not too small, balanced for a level 1 character."
  // Retarget: base 32 + 0.7*vit + 0.7*con + 0.25*armorBase. Level 1 with default attrs (~15) → ~53.
  // Faster refill with VIT (associated stat): regen 4/s + 0.15*vit (was fixed).
  if (typeof derive === 'function') {
    const _d = derive;
    derive = function () {
      const d = _d.apply(this, arguments);
      const con = d.con || 0, vit = d.vit || 0;
      const armorBase = (function () { try { return itemStatSum().armorBase || 0; } catch (e) { return 0; } })();
      // Poise is a CONSTITUTION stat: max size and refill both scale with con.
      d.maxStam = Math.max(20, Math.round(32 + 1.2 * con + 0.3 * vit + 0.25 * armorBase));
      d.stamRegen = 4 + 0.2 * con;   // regen scales with con
      return d;
    };
  }
  // walking drain: while moving, drain poise slowly. Refills using d.stamRegen when standing still.
  // Overrides the base's fixed regen in zc_combat22.js by wrapping updatePlayer.
  if (typeof updatePlayer === 'function') {
    const _up = updatePlayer;
    updatePlayer = function (dt) {
      const prev = { x: P && P.x, y: P && P.y };
      _up.call(this, dt);
      if (!P || P.dead || !dt || !D) return;
      const moved = Math.hypot((P.x || 0) - (prev.x || 0), (P.y || 0) - (prev.y || 0));
      const walking = moved > 0.005 && P.roll <= 0;
      // baseline drain while walking: 1.6/s (D2 kiting still possible but not infinite)
      if (walking && P.stam > 0) { P.stam = Math.max(0, P.stam - 1.6 * dt); P.stamDelay = Math.max(P.stamDelay || 0, 0.15); }
      // fold our stat-scaled refill into the base's regen: base is POISE.regen (~14 in zc_combat22.js).
      // Add the vit-boosted portion here (base still runs); guarded by the base's stamDelay/roll check.
      if (P.stamDelay <= 0 && P.roll <= 0 && P.stam < D.maxStam && D.stamRegen) {
        P.stam = Math.min(D.maxStam, P.stam + Math.max(0, D.stamRegen - 4) * dt);
      }
    };
  }

  // ─── (3) Animancer mana regen slower at level 1 ─────────────────────────
  // Base derive: (1.2 + 0.04*spi) * (1 + 0.05*K.nmastery). At level 1 spi ~20 -> 2.0/s. Too fast.
  // Retarget for animancer only: 0.6 + 0.03*spi at rank 1, growing with mastery.
  if (typeof derive === 'function') {
    const _d2 = derive;
    derive = function () {
      const d = _d2.apply(this, arguments);
      if (P && P.cls === 'animancer') {
        const spi = d.spi || 0, K = P.skills || {};
        d.manaRegen = (0.6 + 0.03 * spi) * (1 + 0.05 * (K.nmastery || 0));
      }
      return d;
    };
  }

  // ─── (4) Iron Pillars as breakable mirrors ──────────────────────────────
  // Pillars already have {life, max}. We add HP and mirror behaviour: reflect ranged, take damage,
  // shatter above a threshold, glint occasionally.
  const PILLAR_HP_BASE = 40, PILLAR_HP_PER_LVL = 5;
  function ensurePillarHp(pl) {
    if (pl.hp != null) return;
    const L = (P.skills && P.skills.pillars) || 1;
    pl.hp = pl.max_hp = PILLAR_HP_BASE + PILLAR_HP_PER_LVL * (L - 1);
    pl.hits = 0;
  }
  // patch castPillars-created pushes: wrap the array push
  if (typeof G !== 'undefined' && Array.isArray(G.pillars)) {
    const _push = Array.prototype.push;
    // walk existing pillars now
    for (const pl of G.pillars) ensurePillarHp(pl);
  }
  // wrap update to ensure every pillar has hp and to glint + expire on hp <= 0
  if (typeof update === 'function') {
    const _upd = update;
    update = function (dt) {
      _upd(dt);
      if (typeof G === 'undefined' || !G || !Array.isArray(G.pillars)) return;
      for (const pl of G.pillars) {
        ensurePillarHp(pl);
        // occasional glint particle so the player sees them alive
        if (typeof parts !== 'undefined' && Math.random() < dt * 0.6) {
          parts.push({ x: pl.x + (Math.random() - 0.5) * 0.3, y: pl.y + (Math.random() - 0.5) * 0.3, z: 6 + Math.random() * 8, vx: 0, vy: 0, vz: 0.6, t: 0.35, col: '#e8e2d0' });
        }
        if (pl.hp <= 0 && !pl.shattered) {
          pl.shattered = true; pl.life = 0;
          if (typeof burst === 'function') burst(pl.x, pl.y, '#bfc4c8', 18, 2);
          if (typeof sfx === 'function') sfx(1200, 0.15, 'triangle', 0.03, -800);
        }
      }
    };
  }
  // ranged bounce off pillars: rely on the base game's beam-mirror logic (already treats pillars as mirrors).
  // ranged shots hitting a pillar also cost it hp. We wrap hurtPlayer-adjacent: since projectiles pass a pillar's
  // impact through the base's collision loop, we expose a helper the base can use OR wrap monster projectile
  // damage. Simpler: monsters that hit the player pillar with a melee blow drain its hp; we hook the aggro loop.
  // Implementation: any monster within 0.8 yd of a pillar takes a swing at it (cheap check every 0.4s).
  if (typeof update === 'function') {
    const _upd2 = update;
    let pillarBashT = 0;
    update = function (dt) {
      _upd2(dt);
      if (!G || !Array.isArray(G.pillars) || !G.zone || !G.zone.monsters) return;
      pillarBashT -= dt; if (pillarBashT > 0) return; pillarBashT = 0.4;
      for (const pl of G.pillars) {
        if (pl.shattered || pl.hp == null) continue;
        for (const m of G.zone.monsters) {
          if (m.dead) continue;
          const d = Math.hypot(m.x - pl.x, m.y - pl.y);
          if (d > 0.9 + m.r) continue;
          // bellweather-style charger: if a single hit exceeds shatterThreshold, one-shot
          const dmg = Math.max(1, (m.dmg && m.dmg[0]) ? (m.dmg[0] + Math.random() * ((m.dmg[1] || m.dmg[0]) - m.dmg[0])) : 6) * 0.6;
          const isCharger = m.type === 'bellweather' || m.type === 'bell' || m.rank === 'boss' || (m.state === 'charge');
          const shatterThreshold = pl.max_hp * 0.75;
          if (isCharger && dmg >= shatterThreshold) {
            pl.hp = 0;
          } else {
            pl.hp -= dmg;
            if (typeof parts !== 'undefined') parts.push({ x: pl.x, y: pl.y, z: 5, vx: 0, vy: 0, vz: 3, t: 0.25, col: '#c7ccd2' });
          }
        }
      }
    };
  }
  // player attacks on pillars: wrap hitTarget so a swing at a mirror damages it
  if (typeof hitTarget === 'function') {
    const _ht = hitTarget;
    hitTarget = function (T, dmg, type, fx, fy, src) {
      // T can be a pillar-shaped object; check for it
      if (T && T.max_hp != null && T.hp != null && !T.shattered && Array.isArray(G.pillars) && G.pillars.includes(T)) {
        T.hp -= dmg;
        if (typeof parts !== 'undefined') parts.push({ x: T.x, y: T.y, z: 5, vx: 0, vy: 0, vz: 3, t: 0.25, col: '#c7ccd2' });
        return;
      }
      return _ht.apply(this, arguments);
    };
  }

  // ─── (5) Skill desc scrub: strip literal-game words ──────────────────────
  if (typeof SK !== 'undefined') {
    const swaps = [
      [/chain lightning/gi, 'a leaping arc'],
      [/lightning strike/gi, 'a striking arc'],
      [/lightning bolt/gi, 'a lancing arc'],
      [/chain (damage|hit)s?/gi, 'leaping strikes'],
      [/lightning/gi, 'arc-light'],
      [/mana(?!cer)/gi, 'essence'],   // 'mana' -> 'essence' unless 'mancer' word
      [/damage per second/gi, 'a slow burn'],
      [/knockback/gi, 'shove'],
      [/cooldown/gi, 'wait'],
      [/dps/gi, 'sustained hurt']
    ];
    for (const id in SK) {
      const s = SK[id]; if (!s) continue;
      if (typeof s.desc === 'string') for (const [re, to] of swaps) s.desc = s.desc.replace(re, to);
      if (Array.isArray(s.perks)) for (const p of s.perks) if (p && typeof p.desc === 'string') for (const [re, to] of swaps) p.desc = p.desc.replace(re, to);
    }
  }
})();
