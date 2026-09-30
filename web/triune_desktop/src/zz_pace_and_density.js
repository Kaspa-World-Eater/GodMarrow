// zz_pace_and_density.js
// Three tuning knobs the user asked for on 2026-09-27:
//   1. Cast speed at level 1 is too fast across ALL classes. Slow the baseline; FCR still speeds it up.
//   2. Foliage trees are too dense. Halve the tree count post-gen on every zone.
//   3. Loot: match D2 drop rate (rarer). Increase mod density (more affixes per magic/rare item).
(function () {
  // ------------------------------------------------------------------
  // (1) cast-speed baseline: wrap derive so D.castSpd starts at 0.72 (was 1.0) and still scales with fcr.
  //     Any P.cast = X / D.castSpd computation in skill handlers therefore takes ~40% longer at level 1
  //     with no gear. High FCR gear brings it back up.
  if (typeof derive === 'function') {
    const _d = derive;
    derive = function () {
      const d = _d.apply(this, arguments);
      const fcr = (typeof itemStatSum === 'function' ? (itemStatSum().fcr || 0) : 0);
      d.castSpd = 0.72 * (1 + fcr / 100);
      return d;
    };
  }

  // ------------------------------------------------------------------
  // (2) fewer trees. Walk the zone tile grid once after gen and turn ~50% of TREE tiles into GRASS.
  //     Deterministic on zone seed so it's stable across re-entries.
  const halveTrees = zone => {
    if (!zone || !zone.t || typeof T === 'undefined') return;
    const seed = (zone.seed || 1) >>> 0;
    let s = seed;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 0x100000000; };
    for (let i = 0; i < zone.t.length; i++) {
      if (zone.t[i] === T.TREE && rnd() < 0.5) zone.t[i] = T.GRASS;
    }
  };
  // hook zone-enter: if this zone hasn't been halved yet, halve it once
  if (typeof enterZone === 'function') {
    const _e = enterZone;
    enterZone = function () {
      const r = _e.apply(this, arguments);
      try {
        const z = (typeof G !== 'undefined' && G && G.zone) ? G.zone : null;
        if (z && !z.__treesHalved) { halveTrees(z); z.__treesHalved = true; }
      } catch (e) {}
      return r;
    };
  }
  // also try to halve any zones already present in G.zones on load
  try {
    if (typeof G !== 'undefined' && G && G.zones) {
      for (const k in G.zones) { const z = G.zones[k]; if (z && !z.__treesHalved) { halveTrees(z); z.__treesHalved = true; } }
    }
  } catch (e) {}

  // ------------------------------------------------------------------
  // (3) D2-style loot: rarer drops overall, but each magic/rare that DOES drop carries more affixes.
  //     Wrap dropLoot AGAIN on top of the loot agent's wrapper. Also wrap rollItem so the affix count
  //     per magic/rare rolls higher on average.
  if (typeof dropLoot === 'function') {
    const _drop = dropLoot;
    // D2-ish drop chances by monster rank. Base game plus loot agent had ~28-32% for normals.
    // D2 normal-monster drop rate is closer to 3-6% in Normal difficulty. We aim for that end.
    const RATES = {
      normal:   0.22,  // v0.88: ~7 items, ~10 gold piles, ~4 potions per 100 normal kills (was 0.06, then halved again)
      minion:   0.18,
      champion: 0.7,
      unique:   0.9,
      boss:     1.0,
      chest:    1.0
    };
    dropLoot = function (x, y, ilvl, kind) {
      // roll our own gate before deferring to the loot chain
      const rank = (kind === 'champion' || kind === 'unique' || kind === 'boss' || kind === 'chest' || kind === 'minion') ? kind : 'normal';
      if (Math.random() > RATES[rank]) return;   // nothing drops — dropping this monster is silent
      return _drop.apply(this, arguments);
    };
    try { if (typeof window !== 'undefined' && window.__spm) window.__spm.dropLoot = dropLoot; } catch (e) {}
  }
  // increase affix mod density on magic/rare rolls
  if (typeof rollItem === 'function') {
    const _roll = rollItem;
    rollItem = function (ilvl, mf) {
      const it = _roll.apply(this, arguments);
      if (!it) return it;
      try {
        // Only add mods to already-magic/rare items. Base game's affix pool is respected via affixPool()
        // if available. Add another prefix or suffix (weighted to affix rarity) until the item hits a
        // D2-ish density: magic 1-2 -> 2 (both), rare 3-4 -> 4-6.
        const wantByQ = { magic: 2, rare: 6 };
        const q = it.q; if (!wantByQ[q]) return it;
        const have = Object.keys(it.stats || {}).length;
        const need = wantByQ[q] - have;
        if (need <= 0) return it;
        if (typeof AFFIX === 'undefined' || typeof BASES === 'undefined') return it;
        const base = BASES[it.base]; if (!base) return it;
        const pool = AFFIX.filter(a => (!a.only || a.only.includes(base.slot)) && a.l <= (ilvl || 1) + 1 && (q === 'rare' || !a.rare));
        // avoid dupes on the same stat
        const usedStats = new Set(Object.keys(it.stats || {}));
        for (let i = 0; i < need; i++) {
          const cand = pool.filter(a => !usedStats.has(a.s));
          if (!cand.length) break;
          const a = cand[Math.floor(Math.random() * cand.length)];
          const v = a.r[0] + Math.floor(Math.random() * (a.r[1] - a.r[0] + 1));
          it.stats = it.stats || {};
          it.stats[a.s] = (it.stats[a.s] || 0) + v;
          usedStats.add(a.s);
        }
      } catch (e) { /* fail-open: return the item unchanged */ }
      return it;
    };
    try { if (typeof window !== 'undefined' && window.__spm) window.__spm.rollItem = rollItem; } catch (e) {}
  }
})();
