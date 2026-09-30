// zz_zz_imps67.js — the user (2026-09-29): "make the monsters loiter more like D2 imps."
// Diablo 2's Fallen never come at you in a straight line. They mill about their camp; when they see you they skitter in,
// weaving, stopping short, darting again; they hit and hop back out; when one of them dies close by the rest break and
// scatter for a moment, then creep back; wounded ones run. Big, heavy creatures keep more of their old steadiness: the
// "skittishness" of a kind falls as its strength (its XP worth) rises.
(function () {
  if (typeof updateMon !== 'function') return;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const skit = m => { if (m._sk != null) return m._sk; const xp = (m.b && m.b.xp) || 20; return (m._sk = m.rank === 'boss' ? 0 : Math.max(0.08, Math.min(0.48, 14.4 / xp))   /* v0.79: 20% bolder */ * (m.rank === 'unique' ? 0.5 : 1)); };
  const melee = m => m.b && (m.b.range || 1) < 2.2;
  // v0.88 (user: a big pack of hands circled in fear and never attacked): in a crowd they lose most of their skittishness
  const crowdK = m => { if (!m._crT || G.time > m._crT) { m._crT = G.time + 0.5; let n = 0; for (const o of G.zone.monsters) if (!o.dead && o !== m && o.state !== 'idle' && Math.abs(o.x - m.x) < 5 && Math.abs(o.y - m.y) < 5) n++; m._crK = n >= 5 ? 0.3 : n >= 3 ? 0.6 : 1; } return m._crK; };
  // run from the hero for t seconds, veering so a pack scatters rather than retreating in a line
  function flee(m, dt) {
    const d = Math.hypot(m.x - P.x, m.y - P.y) || 1, a = Math.atan2(m.y - P.y, m.x - P.x) + m._pv;
    const tx = m.x + Math.cos(a) * 2, ty = m.y + Math.sin(a) * 2;
    if (!G.zone.solidAt(tx, ty)) monMove(m, tx, ty, (m.spd || 2) * 1.15, dt); else m._pv += 0.8 * (Math.random() < 0.5 ? -1 : 1);
    const fx = tx - m.x, fy = ty - m.y; if (Math.abs(fx - fy) > 0.05) m.face = fx - fy > 0 ? 1 : -1;
  }
  const _um = updateMon;
  updateMon = function (m, dt, dp) {
    try {
      const k = skit(m) * crowdK(m);   // v0.88: bravery in numbers
      if (!k || m.dead || m.state === 'idle' || m.stun > 0 || m.feared > 0 || !melee(m) || P.dead) return _um.apply(this, arguments);
      m.hurt = Math.max(0, (m.hurt || 0) - dt);
      // panic: after a packmate dies near it, or when badly hurt
      if (m._panic > 0) { m._panic -= dt; m.t += dt; flee(m, dt); return; }
      if (!m._lowFled && m.hp < m.max * 0.18 && Math.random() < k * 0.45) { m._lowFled = true; m._panic = rnd(0.9, 1.5); m._pv = rnd(-0.7, 0.7); return; }
      // hop back out after a blow, then come again
      if (m._back > 0) { m._back -= dt; m.t += dt; const a = Math.atan2(m.y - P.y, m.x - P.x) + m._bv, tx = m.x + Math.cos(a), ty = m.y + Math.sin(a); if (!G.zone.solidAt(tx, ty)) monMove(m, tx, ty, (m.spd || 2) * 0.9, dt); return; }
      const d = Math.hypot(m.x - P.x, m.y - P.y);
      const ringed = window.__mobai && !window.__mobai.TOK.has(m) && d < 4.4;   // waiting its turn in the ring (zz_mobai63)
      if (m.state === 'chase' && !ringed && d > (m.b.range || 1) + 0.6) {
        // the skittish approach: short weaving dashes, with hesitations between them
        m._ap = (m._ap || 0) - dt;
        if (m._ap <= 0) {
          if (m._hes) { m._hes = false; m._ap = rnd(0.5, 1.2); m._wv = rnd(-0.9, 0.9); }
          else if (Math.random() < 0.2 * k && d > 2.8) { m._hes = true; m._ap = rnd(0.2, 0.5) * (0.5 + k); }
          else { m._ap = rnd(0.4, 1.0); m._wv = rnd(-0.9, 0.9) * k; }
        }
        m.t += dt; m.cd -= dt;
        if (m._hes) { const fx = P.x - m.x, fy = P.y - m.y; if (Math.abs(fx - fy) > 0.05) m.face = fx - fy > 0 ? 1 : -1; m.x += Math.sin(G.time * 9 + (m.id || 0)) * 0.004; return; }   // a fidget in place
        const a = Math.atan2(P.y - m.y, P.x - m.x) + (d > 2 ? m._wv : 0), tx = m.x + Math.cos(a) * Math.min(2, d), ty = m.y + Math.sin(a) * Math.min(2, d);
        if (!G.zone.solidAt(tx, ty)) { monMove(m, tx, ty, (m.spd || 2) * (1 + 0.25 * k), dt); const fx = tx - m.x, fy = ty - m.y; if (Math.abs(fx - fy) > 0.05) m.face = fx - fy > 0 ? 1 : -1; return; }
      }
      const st = m.state, r = _um.apply(this, arguments);
      if (st === 'windup' && m.state === 'recover' && Math.random() < 0.45 * k) { m._back = rnd(0.25, 0.45); m._bv = rnd(-0.8, 0.8); }
      return r;
    } catch (e) { if (typeof reportError === 'function') reportError(e); return _um.apply(this, arguments); }
  };
  // a death scatters the skittish ones nearby
  if (typeof killMon === 'function') {
    const _km = killMon;
    killMon = function (m) {
      const was = m && !m.dead, x = m && m.x, y = m && m.y, r = _km.apply(this, arguments);
      try {
        if (was && G.zone) for (const o of G.zone.monsters) {
          if (o === m || o.dead || o.state === 'idle' || !melee(o)) continue;
          const k = skit(o); if (!k || Math.hypot(o.x - x, o.y - y) > 5) continue;
          if (Math.random() < 0.3 * k) { o._panic = rnd(0.5, 1.0) * (0.6 + k); o._pv = rnd(-0.9, 0.9); }
        }
      } catch (e) { }
      return r;
    };
  }
  // idle camps: wider, livelier milling than before (zz_mobai63 gives the base loiter); every so often a pair drifts
  // toward each other as if muttering, then apart
  const _um2 = updateMon;
  updateMon = function (m, dt, dp) {
    try {
      if (m.state === 'idle' && !m.dead && m._hx != null && skit(m) > 0.3 && m._lw && !m._wid) {
        m._wid = true; const a = rnd(0, 6.283), r = rnd(1.5, 4.2);
        if (Math.random() < 0.3 && m.pack != null) { const mate = G.zone.monsters.find(o => o !== m && o.pack === m.pack && !o.dead); if (mate) m._lw = { x: mate.x + rnd(-0.8, 0.8), y: mate.y + rnd(-0.8, 0.8) }; }
        else m._lw = { x: m._hx + Math.cos(a) * r, y: m._hy + Math.sin(a) * r };
      }
      if (!m._lw) m._wid = false;
    } catch (e) { }
    return _um2.apply(this, arguments);
  };
})();
