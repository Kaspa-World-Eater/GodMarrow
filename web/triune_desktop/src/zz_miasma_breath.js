// zz_miasma_breath.js
// User (2026-09-27):
// - miasma aura should thicken visually as skill levels up
// - Inhale is currently an instant-refill cast; too strong. Make it a passive
//   like D2 Warmth: staggered trickle. Standing in a cloud still refills faster.
// - Miasma Nova (pnova) should be renamed "Miasmic Exhalation" (that IS the exhale flavor).
//   The current Exhale skill therefore needs a NEW mechanic — a proposal is on the board;
//   until user picks one, we hide the redundancy by making Exhale share Miasmic Exhalation's
//   feel with a stronger pulse and keeping it as the placeholder finisher.
// - Sister minion needs hp and miasma.
(function () {
  if (typeof SK === 'undefined') return;

  // ---------- (1) aura thickens with mcloud level: start SMALL, grow with skill points
  // Replace the base curve entirely (was 1.1 + 1.9*frac + 0.03*lvl -> big at rank 1).
  // New curve: rank 1 ~0.5 yd at full miasma; each rank adds ~0.15 yd; miasma fill
  // still contributes on top so an empty cloud pulls in, a full one billows.
  if (typeof MS !== 'undefined' && MS.auraR) {
    MS.auraR = () => {
      const lvl = (P.skills && P.skills.mcloud) || 0;
      const base = 0.35 + 0.15 * Math.max(0, lvl - 1);        // 0.35 at 0, 0.5 at 1, 1.85 at 11, 3.35 at 21
      const fillBonus = 0.9 * MS.frac() * (0.4 + 0.05 * lvl);  // frac matters more with rank
      const thick = (typeof aM === 'function' && aM('zm_thick')) ? 1.2 : 1;
      return (base + fillBonus) * thick;
    };
  }
  // updateMias renders particles at ~0.3 + frac*0.5 chance per frame; wrap so higher
  // mcloud thickens the visual (extra passes without changing dps)
  if (typeof updateMias === 'function') {
    const _u = updateMias;
    updateMias = function (dt) {
      _u.call(this, dt);
      if (!isMias() || P.dead) return;
      const lvl = (P.skills && P.skills.mcloud) || 0;
      if (lvl <= 1) return;
      const R = MS.auraR();
      const extra = Math.min(6, Math.floor((lvl - 1) / 2));   // 0 at lvl 1, +1 per 2 lvls, cap 6
      for (let i = 0; i < extra; i++) {
        if (Math.random() > 0.55) continue;
        parts.push({
          x: P.x + rand(-R, R) * 0.85, y: P.y + rand(-R, R) * 0.85,
          z: rand(2, 12),
          vx: rand(-0.25, 0.25), vy: rand(-0.25, 0.25), vz: 1.6,
          t: 0.9 + Math.random() * 0.5,
          col: Math.random() < 0.35 ? '#6a4a8a' : (Math.random() < 0.5 ? '#8a4ab8' : '#b070e0')
        });
      }
    };
  }

  // ---------- (2) Inhale becomes a passive: staggered trickle of miasma, breath-in effect
  //           (like D2 Warmth). Standing in a cloud still gives the fast regen (existing).
  if (SK.inhale) {
    SK.inhale.kind = 'passive';
    SK.inhale.mana = 0;
    SK.inhale.desc = 'A slow, unconscious breathing-in. Every few beats she sips the miasma nearby — from the air, from her clouds, from anything sickened around her — and it trickles back as Miasma. She breathes deeper with rank: more often, and more taken in each breath. She still fills fast when standing inside her own cloud.';
    if (SK.inhale.perks) {
      const P0 = SK.inhale.perks[0];
      if (P0) { P0.name = 'Deep Draw'; P0.desc = 'Passive inhale also drags the sickened toward you a little.'; }
      const P1 = SK.inhale.perks[1];
      if (P1) { P1.name = 'Sick Breath'; P1.desc = 'A passive breath draws more from the sickened, and gives half again as much Miasma.'; }
    }
  }
  // remove Inhale from active-cast mapping: neutralize castInhale when called (in case a keybind fires)
  if (typeof castInhale === 'function') {
    castInhale = function () {
      say('Inhale is passive now', 1); return;
    };
  }
  // per-frame passive inhale (staggered every 2.4 s, rank tightens the interval)
  if (typeof updateMias === 'function') {
    const _u2 = updateMias;
    P.pInhaleT = 0;
    updateMias = function (dt) {
      _u2.call(this, dt);
      if (!isMias() || P.dead) return;
      const lvl = (P.skills && P.skills.inhale) || 0;
      if (lvl <= 0) return;
      P.pInhaleT = (P.pInhaleT || 0) - dt;
      const interval = Math.max(0.9, 2.4 - 0.08 * lvl);       // lvl 1 = 2.32s, lvl 20 = 0.9s
      if (P.pInhaleT > 0) return;
      P.pInhaleT = interval;
      let gain = 0, nearby = 0;
      const R = 5 + 0.1 * lvl;
      // sip from own clouds nearby (each gives a small share; capped)
      for (const c of G.clouds) {
        if (c.kind !== 'poison') continue;
        if (Math.hypot(c.x - P.x, c.y - P.y) > R) continue;
        gain += 0.5 + c.t * 0.15;
        nearby++;
      }
      // sip from sickened enemies (leave their poison alone, unlike the old active tear-out)
      for (const m of G.zone.monsters) {
        if (m.dead || !m.poison) continue;
        if (dist(m, P) > R) continue;
        const share = Math.min(1.5, m.poison.dps * 0.05);
        gain += share;
        nearby++;
        if (P.skills.deepdraw > 0 && m.rank !== 'boss') {
          const d = dist(m, P) || 1;
          moveCircle(m, (P.x - m.x) / d * 0.08, (P.y - m.y) / d * 0.08);
        }
      }
      const k = P.skills.sickbreath > 0 ? 1.5 : 1;
      gain *= k;
      // she always breathes: a small baseline even with nothing around
      gain += 0.6 + 0.08 * lvl;
      if (gain <= 0) return;
      P.mana = Math.min(D.maxMana, P.mana + gain);
      // visual: subtle. one or two thin streams drift IN toward her mouth from
      // the sipped source. baseline draw (no clouds/foes) emits nothing — just
      // a quiet passive.
      if (nearby > 0) {
        const streams = Math.min(3, nearby);
        for (let i = 0; i < streams; i++) {
          // pick a source point on a ring around her within R
          let sx, sy;
          if (Math.random() < 0.6 && G.clouds.length) {
            const c = G.clouds[Math.floor(Math.random() * G.clouds.length)];
            if (c && c.kind === 'poison' && Math.hypot(c.x - P.x, c.y - P.y) <= R) { sx = c.x + rand(-c.R, c.R) * 0.4; sy = c.y + rand(-c.R, c.R) * 0.4; }
          }
          if (sx == null) { const a = Math.random() * 6.28, rr = R * (0.5 + Math.random() * 0.4); sx = P.x + Math.cos(a) * rr; sy = P.y + Math.sin(a) * rr; }
          // mouth position: slightly above and forward of P
          const mx = P.x + P.face * 0.04, my = P.y - 0.02, mz = 7;
          const dx = mx - sx, dy = my - sy, dl = Math.hypot(dx, dy) || 1;
          // gentle inbound drift, low z, short life — reads as a thin thread pulled into her lips
          parts.push({
            x: sx, y: sy, z: 3 + Math.random() * 3,
            vx: (dx / dl) * 2.6, vy: (dy / dl) * 2.6, vz: (mz - 3) * 1.2,
            t: 0.45 + Math.random() * 0.15,
            col: Math.random() < 0.5 ? '#8a4ab8' : '#b070e0'
          });
        }
      }
    };
  }

  // ---------- (3) Miasma Nova → Miasmic Exhalation (rename only; mechanic unchanged for now)
  if (SK.pnova) {
    SK.pnova.name = 'Miasmic Exhalation';
    SK.pnova.desc = 'She lets out a long purple breath: a ring of miasma rolls outward around her, shoving back and sickening hard everything it touches. Not a shout, not a blow — a slow, sickened exhale.';
  }
  // rename any banner text
  if (typeof banner === 'function') {
    const _b = banner;
    banner = function (t, c, d) { if (t === 'MIASMA NOVA') t = 'MIASMIC EXHALATION'; return _b.apply(this, [t, c, d]); };
  }
  // Note: the OLD Exhale skill (spend-all pulse) is now redundant flavor.
  // A proposal for a replacement skill is on the workshop board — leaving the
  // mechanic intact for now; user picks the new flavor there.

  // ---------- (4) Sister minion gets hp and miasma
  if (typeof updateSister === 'function') {
    const _us = updateSister;
    updateSister = function (dt) {
      // spawn/refresh: give the sister real hp/mana proportional to P's
      if (isMias() && P.skills && P.skills.sister > 0 && !P.dead) {
        if (!G.sister) {
          const shp = Math.round(D.maxHp * (0.35 + 0.02 * (P.skills.sister - 1)));
          const smp = Math.round(D.maxMana * (0.4 + 0.02 * (P.skills.sister - 1)));
          G.sister = {
            x: P.x - P.face * 1.2, y: P.y + 0.4, face: -P.face,
            cd: 1.5, t: 0, blink: 0.4,
            hp: shp, max: shp, mana: smp, maxMana: smp,
            hurt: 0, dead: false, reformT: 0
          };
          burst(G.sister.x, G.sister.y, '#a8c0e0', 18, 2);
        }
        const s = G.sister;
        if (s.hurt > 0) s.hurt -= dt;
        // slow miasma regen (she also breathes)
        s.mana = Math.min(s.maxMana, s.mana + D.manaRegen * 0.6 * dt);
        // slow hp regen only out of combat (no recent hurt)
        if (s.hurt <= 0) s.hp = Math.min(s.max, s.hp + s.max * 0.02 * dt);
        // if killed: she disperses, reforms after ~6s
        if (s.hp <= 0 && !s.dead) {
          s.dead = true; s.reformT = 6;
          burst(s.x, s.y, '#a8c0e0', 24, 2.4);
          floatText(s.x, s.y, 'the sister disperses', '#a8c0e0');
        }
        if (s.dead) {
          s.reformT -= dt;
          if (s.reformT <= 0) {
            s.dead = false; s.hp = Math.round(s.max * 0.6); s.mana = Math.round(s.maxMana * 0.5);
            s.x = P.x - P.face * 1.2; s.y = P.y + 0.4; s.blink = 0.4;
            burst(s.x, s.y, '#a8c0e0', 18, 2);
          }
          return;   // don't act while dispersed
        }
      }
      _us.call(this, dt);
    };
  }
  // sister takes damage from monster hits: hook hurtPlayer so blows near the sister hit her too
  if (typeof hurtPlayer === 'function') {
    const _hp = hurtPlayer;
    hurtPlayer = function (dmg, type, fx, fy) {
      const s = G.sister;
      if (isMias() && s && !s.dead && fx !== undefined) {
        const d = Math.hypot(s.x - fx, s.y - fy), dp = Math.hypot(P.x - fx, P.y - fy);
        // if the blow came closer to the sister than to P, redirect a share to her
        if (d < dp && d < 1.4) {
          const share = Math.min(dmg, dmg * 0.6);
          s.hp -= share; s.hurt = 0.18; dmg -= share;
          burst(s.x, s.y, '#a8c0e0', 4, 1.5);
          if (dmg <= 0) return;
        }
      }
      return _hp.call(this, dmg, type, fx, fy);
    };
  }
})();
