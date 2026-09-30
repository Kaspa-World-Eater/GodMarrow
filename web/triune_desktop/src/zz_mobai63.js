// zz_mobai63.js — the user (2026-09-29): "add more behavior to the monster mobs. i got zerged instantly when i left town
// at level 1." Earlier: "in diablo 2, mobs would linger and loiter a little, like the imp guys in act 1... ours are just
// heat seeking missiles."
//  1. Loitering: a sleeping pack is not frozen in place. Each creature drifts about its spot, stops, turns, shuffles on.
//  2. Waking: a creature has to see you from closer at low level (the first hours are gentler), and when one wakes its
//     packmates do not all snap on at once: each looks up after its own short delay, and only those near enough to hear.
//  3. Attack tokens: only a few melee creatures may press the attack at once (2 at level 1, more as you rise). The rest
//     hang back in a loose ring, circling, shifting, feinting in, waiting for an opening, like jackals round a fire.
(function () {
  if (typeof updateMon !== 'function' || typeof updateMonsters !== 'function') return;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const tokensFor = () => Math.min(7, Math.round((3 + Math.floor(((P && P.level) || 1) / 5)) * 1.2));   // v0.79: 20% bolder   // v0.76: bolder (user: 'a little too cowardly')
  const melee = m => m && m.b && (m.b.range || 1) < 2.2 && m.rank !== 'boss' && !m.b.boss;
  // ---- 2. waking
  if (typeof wakeRange === 'function') {
    const _wr = wakeRange;
    wakeRange = function () { const lv = (P && P.level) || 1; return _wr() * (lv <= 3 ? 0.7 : lv <= 8 ? 0.85 : 1); };
  }
  if (typeof aggro === 'function') {
    const _ag = aggro;
    aggro = function (m) {
      if (!m || m.state !== 'idle' || m.pack == null || m.rank === 'boss') return _ag.apply(this, arguments);
      // wake this one, then the pack one by one, and only those within earshot
      const pack = m.pack; m.pack = null; try { _ag.call(this, m); } finally { m.pack = pack; }
      if (m.state === 'idle') return;
      for (const o of G.zone.monsters) if (o !== m && !o.dead && o.pack === pack && o.state === 'idle' && o.rank !== 'boss' && Math.hypot(o.x - m.x, o.y - m.y) < 10 && !o._wakeAt)
        o._wakeAt = G.time + rnd(0.35, 1.6) + Math.hypot(o.x - m.x, o.y - m.y) * 0.08;
    };
  }
  // ---- 3. attack tokens (assigned once a frame, sticky)
  const TOK = new Set();
  const _ums = updateMonsters;
  updateMonsters = function (dt) {
    try {
      const z = G.zone;
      if (z && !P.dead) {
        const cands = [];
        for (const m of z.monsters) if (!m.dead && m.state !== 'idle' && melee(m) && !(m.feared > 0) && !(m.confused > 0) && !(m._panic > 0) && !(m._back > 0)) { const d = Math.hypot(m.x - P.x, m.y - P.y); if (d < 9) cands.push([m, d]); }
        for (const m of [...TOK]) if (m.dead || m.state === 'idle' || m._panic > 0 || m.feared > 0 || Math.hypot(m.x - P.x, m.y - P.y) > 5) TOK.delete(m);   // v0.88: a fleeing one gives its turn away
        cands.sort((a, b) => a[1] - b[1]);
        const n = Math.max(tokensFor(), Math.ceil(cands.filter(c => c[1] < 5).length * 0.5));   // v0.88 (user): a big pack presses the attack; half of those close get a turn
        for (const [m] of cands) { if (TOK.size >= n) break; if (!TOK.has(m) && (m._tokCd || 0) < G.time) TOK.add(m); }
        // a creature that has just struck gives up its turn now and then, so the pressure rotates round the ring
        for (const m of [...TOK]) if (m._struck && Math.random() < 0.5) { TOK.delete(m); m._struck = false; m._tokCd = G.time + rnd(0.8, 1.8); }
      }
    } catch (e) { }
    return _ums.apply(this, arguments);
  };
  // ---- 1 + 3. per creature
  const _um = updateMon;
  updateMon = function (m, dt, dp) {
    try {
      if (m.state === 'idle' && !m.dead) {
        if (m._wakeAt && G.time >= m._wakeAt) { m._wakeAt = 0; m.state = 'chase'; m.t = 0; m.cd = Math.max(m.cd || 0, rnd(0.2, 0.8)); }
        else if (!(m.stun > 0) && !m.fly && m.rank !== 'boss') {
          if (m._hx == null) { m._hx = m.x; m._hy = m.y; m._lt = rnd(0, 3); }
          m._lt -= dt;
          if (m._lt <= 0) {
            if (m._lw) { m._lw = null; m._lt = rnd(1.5, 4.5); }                          // stop a while
            else { const a = rnd(0, 6.283), r = rnd(0.5, 2.6); m._lw = { x: m._hx + Math.cos(a) * r, y: m._hy + Math.sin(a) * r }; m._lt = rnd(1.2, 3); }
          }
          if (m._lw) {
            const dx = m._lw.x - m.x, dy = m._lw.y - m.y, d = Math.hypot(dx, dy);
            if (d > 0.15 && !G.zone.solidAt(m.x + dx / d * 0.3, m.y + dy / d * 0.3)) { stepToward(m, m._lw.x, m._lw.y, (m.spd || 2) * 0.28 * dt); if (Math.abs(dx - dy) > 0.05) m.face = dx - dy > 0 ? 1 : -1; m._loiter = true; }
            else { m._lw = null; m._lt = rnd(1.5, 4); m._loiter = false; }
          } else m._loiter = false;
        }
        return _um.apply(this, arguments);
      }
      m._loiter = false;
      // no token: hang back in the ring round the hero, circling and feinting, never close enough to swing
      if (melee(m) && !TOK.has(m) && !P.dead && m.state === 'chase' && !(m.stun > 0)) {
        const d = Math.hypot(m.x - P.x, m.y - P.y);
        if (d < 4.2) {
          if (m._ring == null) { m._ring = rnd(2.4, 3.4); m._rdir = Math.random() < 0.5 ? -1 : 1; m._rt = 0; }
          m._rt -= dt; if (m._rt <= 0) { m._rt = rnd(0.8, 2.2); if (Math.random() < 0.35) m._rdir *= -1; m._feint = Math.random() < 0.25 ? 0.45 : 0; }
          if (m._feint > 0) m._feint -= dt;
          const a = Math.atan2(m.y - P.y, m.x - P.x) + m._rdir * 0.55, R = m._feint > 0 ? m._ring - 1.1 : m._ring;
          const tx = P.x + Math.cos(a) * R, ty = P.y + Math.sin(a) * R;
          if (!G.zone.solidAt(tx, ty)) monMove(m, tx, ty, (m.spd || 2) * 0.6, dt);
          const fx = P.x - m.x, fy = P.y - m.y; if (Math.abs(fx - fy) > 0.05) m.face = fx - fy > 0 ? 1 : -1;
          m.cd = Math.max(m.cd || 0, 0.25); m.t += dt; if (m.hurt > 0) m.hurt = Math.max(0, m.hurt - dt);
          if (typeof updatePoise22 === 'function') updatePoise22(m, dt);
          return;
        }
      }
      const st = m.state, r = _um.apply(this, arguments);
      if (st === 'windup' && m.state === 'recover') m._struck = true;
      return r;
    } catch (e) { if (typeof reportError === 'function') reportError(e); return _um.apply(this, arguments); }
  };
  try { window.__mobai = { TOK, tokensFor }; } catch (e) { }
})();
