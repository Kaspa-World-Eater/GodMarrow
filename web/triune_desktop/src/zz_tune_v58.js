// zz_tune_v58.js — the user (2026-09-28):
//  "Monster pack density needs to drop depending on the strength... weaker mobs can have larger packs, stronger mobs
//   should have less. But this can fluctuate. We need more creatures on the map too, feels kinda empty."
//  "Increase mana cost on hollow mystic skills by 20%."
//  "When poise breaks and a mob surrounds you, you get micro stun locked, we need to reduce that by 40% so we can
//   actually break free and escape rather than just get swarmed to death."
(function () {
  // ---------------------------------------------------------------- (1) pack size by strength, with fluctuation
  // Strength = the kind's XP worth (a Tithe-Hand ~11, a Husk 12, a Warden 30, a Bellwether 45). A pack of weak things
  // runs up to ~1.6x its table size, a pack of strong ones down to ~0.5x; each pack then swings -25%..+30%.
  const REF = 20;
  const sizeK = (type, rng) => {
    const b = (typeof MON === 'object' && MON[type]) || null, xp = b && b.xp ? b.xp : REF;
    const base = Math.max(0.5, Math.min(1.6, Math.pow(REF / xp, 0.75)));
    return base * (0.75 + 0.55 * rng());
  };
  if (typeof placePack === 'function') {
    const _pp = placePack;
    placePack = function (z, x, y, mlvl, table, packId, rng) {
      rng = rng || Math.random;
      if (!Array.isArray(table) || !table.length) return _pp.apply(this, arguments);
      // scale each [type, min, max] of every row of the table for this one call
      const scaled = table.map(def => {
        const out = def.slice();
        for (let k = 0; k < out.length; k += 3) {
          const f = sizeK(out[k], rng);
          out[k + 1] = Math.max(1, Math.round(out[k + 1] * f));
          out[k + 2] = Math.max(out[k + 1], Math.round(out[k + 2] * f));
        }
        return out;
      });
      return _pp.call(this, z, x, y, mlvl, scaled, packId, rng);
    };
  }

  // ---------------------------------------------------------------- (2) more creatures: ~40% more packs per zone
  // Each fresh zone gets copies of its own packs (same kinds and levels, so the zone keeps its character), stood on
  // open ground the start can reach, away from the start and from the packs already there.
  const MORE = 0.4;
  function morePacks(z) {
    if (!z || z.town || !Array.isArray(z.monsters) || !z.monsters.length || z.__more58) return z;
    z.__more58 = true;
    const packs = {};
    for (const m of z.monsters) if (m && !m.dead && m.pack != null && m.pack !== 'boss' && m.rank === 'normal') (packs[m.pack] = packs[m.pack] || []).push(m);
    const ids = Object.keys(packs); if (!ids.length) return z;
    let reach = null;
    try { if (typeof floodFrom === 'function' && z.start) reach = floodFrom(z, Math.floor(z.start.x), Math.floor(z.start.y)); } catch (e) { reach = null; }
    const sx = z.start ? z.start.x : 0, sy = z.start ? z.start.y : 0;
    const taken = z.monsters.map(m => [m.x, m.y]);
    const want = Math.round(ids.length * MORE); let made = 0, n = 0;
    for (let tries = 0; tries < want * 60 && made < want; tries++) {
      const x = 3 + Math.random() * (z.w - 6), y = 3 + Math.random() * (z.h - 6);
      if (z.solidAt && z.solidAt(x, y)) continue;
      if (reach && !reach[Math.floor(y) * z.w + Math.floor(x)]) continue;
      if (Math.hypot(x - sx, y - sy) < 14) continue;
      let near = false; for (const [a, b] of taken) if ((a - x) * (a - x) + (b - y) * (b - y) < 64) { near = true; break; }
      if (near) continue;
      const src = packs[ids[Math.floor(Math.random() * ids.length)]], cx = src.reduce((s, m) => s + m.x, 0) / src.length, cy = src.reduce((s, m) => s + m.y, 0) / src.length;
      const pid = 'x58_' + (n++);
      for (const m of src) {
        let px = x + (m.x - cx), py = y + (m.y - cy);
        if (z.solidAt && z.solidAt(px, py)) { px = x + (Math.random() - 0.5) * 2; py = y + (Math.random() - 0.5) * 2; if (z.solidAt(px, py)) continue; }
        const c = Object.assign({}, m);
        c.x = c.hx = px; c.y = c.hy = py; c.pack = pid;
        c.dmg = m.dmg ? m.dmg.slice() : m.dmg; c.mods = m.mods ? m.mods.slice() : []; c.aim = { x: 1, y: 0 }; c.target = { x: px, y: py };
        c.path = null; c.cd = Math.random(); c.t = 0; c.hp = c.max; c.state = 'idle'; c.face = Math.random() < 0.5 ? 1 : -1;
        for (const k in c) if (c[k] instanceof Set) c[k] = new Set(); else if (c[k] instanceof Map) c[k] = new Map();
        z.monsters.push(c); taken.push([px, py]);
      }
      made++;
    }
    return z;
  }
  setTimeout(() => {
    if (typeof ZONE_GEN === 'undefined') return;
    for (const id in ZONE_GEN) {
      const f = ZONE_GEN[id]; if (f.__more58) continue;
      const g = function () { return morePacks(f.apply(this, arguments)); }; g.__more58 = true; ZONE_GEN[id] = g;
    }
  }, 0);

  // ---------------------------------------------------------------- (3) Hollow Mystic skills cost 20% more
  const dearer = () => {
    if (typeof SK !== 'object') return;
    for (const id in SK) { const s = SK[id]; if (s && s.cls === 'animancer' && s.mana && !s.__m58) { s.mana = Math.round(s.mana * 1.2 * 10) / 10; s.__m58 = true; } }
  };
  dearer(); setTimeout(dearer, 0);

  // ---------------------------------------------------------------- (4) poise break: 40% less stun-lock
  //  - the stagger itself is 40% shorter (0.55 s -> 0.33 s);
  //  - the shaken state after it slows you 40% less (to 73% speed instead of 55%), hurts your blows 40% less and your
  //    casting 40% less, and ends sooner (poise back to 12% instead of 20%);
  //  - once the stagger itself is over you CAN roll out of the crowd while shaken (it costs the roll's poise as usual).
  if (typeof POISE === 'object') POISE.reel = +(POISE.reel * 0.6).toFixed(3);
  if (typeof derive === 'function') {
    const _d = derive;
    derive = function () {
      const d = _d.apply(this, arguments);
      try {
        if (typeof P !== 'undefined' && P && P.recovering) {
          if (d.moveSpd != null) d.moveSpd *= 0.73 / 0.55;
          if (d.dmgMult != null) d.dmgMult *= 0.76 / 0.6;
          if (d.meleeMult != null) d.meleeMult *= 0.76 / 0.6;
          if (d.castSpd != null) d.castSpd *= 0.82 / 0.7;
        }
      } catch (e) { }
      return d;
    };
  }
  if (typeof tryRoll === 'function') {
    const _tr = tryRoll;
    tryRoll = function () {
      if (typeof P !== 'undefined' && P && P.recovering && !(P.stagger > 0)) {
        P.recovering = false;
        try { return _tr.apply(this, arguments); } finally { if (P.stam < (P.recovCap || 0)) P.recovering = true; }
      }
      return _tr.apply(this, arguments);
    };
  }
  if (typeof updatePlayer === 'function') {
    const _up = updatePlayer;
    updatePlayer = function (dt) {
      const r = _up.apply(this, arguments);
      try { if (P && P.recovering && typeof D === 'object' && D.maxStam) { P.recovCap = Math.min(P.recovCap || 0, Math.max(1, Math.round(D.maxStam * 0.12))); if (P.stam >= P.recovCap) { P.recovering = false; P.recovCap = 0; } } } catch (e) { }
      return r;
    };
  }
  try { window.__tune58 = { sizeK, morePacks }; } catch (e) { }
})();
