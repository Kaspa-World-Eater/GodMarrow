// zz_tune_batch_e.js — user (2026-09-27): "increase normal mob density and lower rare+ drop rate by 35%"
(function () {
  // ---- (1) denser ordinary packs: each freshly generated zone gains ~45% more normal-rank monsters, each one a
  // kin standing beside an existing pack member (same kind, level and pack, so they wake together). Bosses,
  // champions, uniques and their minions are left as they are. Towns have no monsters, so they stay empty.
  const EXTRA = 0.45;
  function thicken(z) {
    if (!z || !Array.isArray(z.monsters) || z.__thick) return z;
    z.__thick = true;
    const add = [];
    for (const m of z.monsters) {
      if (!m || m.dead || m.rank !== 'normal' || m.hidden) continue;
      if (Math.random() >= EXTRA) continue;
      let spot = null;
      for (let k = 0; k < 8 && !spot; k++) {
        const a = Math.random() * 6.2832, r = 0.9 + Math.random() * 1.1, x = m.x + Math.cos(a) * r, y = m.y + Math.sin(a) * r;
        if (x > 1 && y > 1 && x < z.w - 1 && y < z.h - 1 && !(z.solidAt && z.solidAt(x, y))) spot = { x, y };
      }
      if (!spot) continue;
      const c = Object.assign({}, m);
      c.x = c.hx = spot.x; c.y = c.hy = spot.y;
      c.dmg = m.dmg ? m.dmg.slice() : m.dmg; c.mods = m.mods ? m.mods.slice() : []; c.aim = { x: 1, y: 0 }; c.target = { x: spot.x, y: spot.y };
      c.path = null; c.cd = Math.random(); c.t = 0; c.hp = c.max; c.state = 'idle'; c.face = Math.random() < 0.5 ? 1 : -1;
      for (const k in c) if (c[k] instanceof Set) c[k] = new Set(); else if (c[k] instanceof Map) c[k] = new Map();
      add.push(c);
    }
    z.monsters.push(...add);
    return z;
  }
  // wrap every zone generator once all files have added theirs
  setTimeout(() => {
    if (typeof ZONE_GEN === 'undefined') return;
    for (const id in ZONE_GEN) {
      const f = ZONE_GEN[id]; if (f.__thick) continue;
      const g = function (s) { return thicken(f.apply(this, arguments)); }; g.__thick = true; ZONE_GEN[id] = g;
    }
  }, 0);

  // ---- (2) rare and unique finds 35% scarcer: a rare-or-better roll is re-rolled into a lesser item 35% of the
  // time (the guaranteed floors for champions, uniques and bosses still re-roll until they are met)
  if (typeof rollItem === 'function') {
    const _roll = rollItem;
    rollItem = function () {
      let it = _roll.apply(this, arguments);
      if (it && (it.q === 'rare' || it.q === 'unique') && Math.random() < 0.30) {
        for (let k = 0; k < 10; k++) { const r = _roll.apply(this, arguments); if (r && r.q !== 'rare' && r.q !== 'unique') { it = r; break; } }
      }
      return it;
    };
    try { if (typeof window !== 'undefined' && window.__spm) window.__spm.rollItem = rollItem; } catch (e) { }
  }
})();
