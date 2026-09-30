// zz_monk_hitdeath.js (v0.54) — the Empty Hand's hit and death frames, which were in the HD sheet but never shown.
//  - Struck (and not striking, casting or rolling), he flinches through the sheet's three hit frames.
//  - Dead, he falls through its six death frames and lies there (the base game stops drawing the hero once he dies).
(function () {
  if (typeof heroPose !== 'function') return;
  const HD = () => window.__monkHD && window.__monkHD.ok ? window.__monkHD : null;
  const _hp = heroPose;
  heroPose = function () {
    const r = _hp.apply(this, arguments);
    try {
      if (typeof isMonk === 'function' && isMonk() && HD() && P.hurt > 0 && P.swing <= 0 && P.cast <= 0 && P.roll <= 0) {
        const k = Math.max(0, 0.18 - P.hurt); return ['hit', Math.min(2, Math.floor(k / 0.06))];
      }
    } catch (e) { }
    return r;
  };
  if (typeof corpsesToList === 'function') {
    const _cl = corpsesToList;
    corpsesToList = function (list) {
      const r = _cl.apply(this, arguments);
      try {
        if (P.dead && typeof isMonk === 'function' && isMonk() && HD()) {
          if (P._mkDeadT == null) P._mkDeadT = G.time;
          const ph = Math.min(5, Math.floor((G.time - P._mkDeadT) / 0.13));
          const fr = HD().frameOf('death', P._fb ? 'back' : 'front', ph);
          if (fr) list.push({ d: P.x + P.y, f: () => { const p = iso(P.x, P.y), face = P.face || 1; ctx.drawImage(face < 0 ? fr.f : fr.c, Math.round(p.sx) - (face < 0 ? fr.w - fr.ox : fr.ox), Math.round(p.sy) + 3 - (fr.oy + 1)); } });
        } else if (!P.dead) P._mkDeadT = null;
      } catch (e) { }
      return r;
    };
  }
})();
