// zz_miasma_flavor.js
// User: "bloat mine name needs a flavor change and no spore references.
// miasma hurricane should be miasma vortex and vortex in and out like a breathing cycle,
// pushing and pulling"
(function () {
  if (typeof SK === 'undefined') return;

  // ---- Bloat Mine -> Sighing Bladder. No spores.
  if (SK.bmine) {
    SK.bmine.name = 'Sighing Bladder';
    SK.bmine.desc = 'Throw a swollen bladder of breath caught and gone wrong. When anything comes near it splits open with a wet sigh, and a great purple miasma cloud unfurls.';
    if (SK.bmine.perks) {
      const P0 = SK.bmine.perks[0];
      if (P0) { P0.name = 'Wider Sigh'; P0.desc = 'The sigh unfurls half again as wide.'; }
      const P1 = SK.bmine.perks[1];
      if (P1) { P1.name = 'Wailing Rot';  P1.desc = 'The bladder wails as it splits: what the sigh touches is terrified for 1.5 s.'; }
    }
  }

  // ---- Miasma Hurricane -> Miasma Vortex, breathing in/out.
  if (SK.mstorm) {
    SK.mstorm.name = 'Miasma Vortex';
    SK.mstorm.desc = 'Draw your cloud into a slow purple vortex that turns around you and breathes: it inhales for a beat and drags every enemy toward you, then exhales and shoves them back, over and over. It tears at and sickens whatever cannot leave.';
  }

  // wrap updateHurricane so the vortex has a breath cycle: inhale (pull) and
  // exhale (push) sinusoidally, replacing the old constant tangential + optional inward pull.
  if (typeof updateHurricane === 'function') {
    const _orig = updateHurricane;
    updateHurricane = function (dt) {
      if (!(P.mstormT > 0)) return;
      P.mstormT -= dt; P.mstormTick -= dt;
      const R = MS.stormR();
      // breath phase: full inhale/exhale takes ~2.4s; sin -> pull when +, push when -
      const phase = Math.sin((MS.stormLife() - P.mstormT) * 2.6);   // 2.6 rad/s ~ 2.4s cycle
      const breath = phase * 0.55;                                  // magnitude of radial force
      // ghostly drift particles: rise and hang, tinted purple, longer lifetime, sway
      if (Math.random() < 0.9) for (let i = 0; i < 2; i++) {
        const a = Math.random() * 6.28, rr = R * (0.3 + Math.random() * 0.7);
        const sway = Math.sin(G.time * 1.8 + a * 3) * 0.6;
        parts.push({
          x: P.x + Math.cos(a) * rr, y: P.y + Math.sin(a) * rr,
          z: 3 + Math.random() * 18,
          vx: -Math.sin(a) * (2.4 + sway) + Math.cos(a) * breath * 1.2,
          vy:  Math.cos(a) * (2.4 + sway) + Math.sin(a) * breath * 1.2,
          vz: 1.4 + Math.random() * 1.2,
          t: 1.1 + Math.random() * 0.6,
          col: Math.random() < 0.5 ? '#8a4ab8' : '#b070e0'
        });
      }
      if (P.mstormTick > 0) return; P.mstormTick = 0.35;
      for (const m of G.zone.monsters) {
        if (m.dead) continue; const d = dist(m, P); if (d > R + m.r) continue;
        hurtMon(m, MS.stormDmg() * 0.35, '#b070e0');
        poisonMon(m, MS.stormDmg() * 0.25, 2);
        m.slow = Math.max(m.slow || 0, 0.35);
        if (m.rank !== 'boss' && d > 0.1) {
          // constant swirl (tangential)
          const tx = -(m.y - P.y) / d, ty = (m.x - P.x) / d;
          moveCircle(m, tx * 0.22, ty * 0.22);
          // radial breath: negative phase pushes out, positive pulls in
          const rx = (P.x - m.x) / d, ry = (P.y - m.y) / d;
          const pull = breath + (P.skills.stormpull > 0 ? 0.12 : 0);   // stormpull perk biases toward inhale
          moveCircle(m, rx * pull, ry * pull);
        }
      }
    };
  }
})();
