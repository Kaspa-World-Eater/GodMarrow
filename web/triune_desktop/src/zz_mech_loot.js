// zz_mech_loot.js — D2-style loot, Milestone 1
// Owner: Fenris the Ratcatcher (loot agent). Only file this agent touches.
//
// Scope (M1 only): normal / magic / rare drops with prefix+suffix rolling,
// ilvl gating, magic-find scaling, rank-appropriate gold. Uniques already
// exist in c_game.js and still roll organically through rollItem(); they
// are neither added to nor removed here. No sockets/gems/runes/charms/sets.
//
// Approach: wrap dropLoot() from c_game.js. The base function already
// dispatches to rollItem() (which does the tier + affix work) and to
// newPotion(); the base's rates were choked (a *0.3 multiplier on every
// chance) so kills felt drop-dry compared to D2. We keep the base's item
// pipeline (so tiers, ilvl gating, and MF via rollItem still apply) and
// only rewrite the per-rank rolls/chances/floors.
(function () {
  if (typeof dropLoot !== 'function' || typeof rollItem !== 'function') return;

  const QORDER = { normal: 0, magic: 1, rare: 2, unique: 3 };

  // Roll an item, retrying up to `tries` times to meet or beat `minQ`.
  // Returns the best-quality roll seen if the floor is never hit.
  function rollItemMin(ilvl, mf, minQ, tries) {
    const floor = QORDER[minQ] || 0;
    let best = null, bestQ = -1;
    const n = tries || 40;
    for (let i = 0; i < n; i++) {
      const it = rollItem(ilvl, mf);
      const q = QORDER[it && it.q] || 0;
      if (q > bestQ) { best = it; bestQ = q; }
      if (q >= floor) return it;
    }
    return best;
  }

  // Per-rank drop tuning. Numbers were picked to feel like D2 while
  // respecting the base game's power curve (see reasoning in final report).
  //   rolls    : independent item-lottery rolls
  //   chance   : per-roll chance the roll produces any item
  //   guar     : how many of those rolls are forced to hit minQ (rerolled)
  //   minQ     : floor quality for guaranteed rolls
  //   mfBonus  : bonus magic-find added to rolls from this rank
  //   gold     : [chance, [minPerIlvl, maxPerIlvl], rankMultiplier]
  //   potChance: chance to also drop one potion
  const CFG = {
    normal:   { rolls: 1, chance: 0.32, guar: 0, minQ: null,    mfBonus: 0,   gold: [0.45, [2, 6],   1.0], potChance: 0.2 },
    minion:   { rolls: 1, chance: 0.28, guar: 0, minQ: null,    mfBonus: 0,   gold: [0.40, [2, 5],   1.0], potChance: 0.08 },
    champion: { rolls: 3, chance: 0.85, guar: 1, minQ: 'magic', mfBonus: 40,  gold: [0.95, [4, 10],  2.5], potChance: 0.30 },
    unique:   { rolls: 5, chance: 1.00, guar: 1, minQ: 'rare',  mfBonus: 90,  gold: [1.00, [6, 14],  5.0], potChance: 0.45 },
    boss:     { rolls: 8, chance: 1.00, guar: 2, minQ: 'rare',  mfBonus: 200, gold: [1.00, [10, 20], 14.0], potChance: 0.60 },
    chest:    { rolls: 2, chance: 0.60, guar: 0, minQ: null,    mfBonus: 0,   gold: [0.85, [3, 8],   1.5], potChance: 0.25 }
  };

  const _origDrop = dropLoot;
  dropLoot = function (x, y, ilvl, kind) {
    // Fall back to the original if anything unexpected happens.
    try {
      const cfg = CFG[kind] || CFG.normal;
      const mfBase = (typeof D !== 'undefined' && D && D.mf) || 0;
      const mf = mfBase + cfg.mfBonus;
      const il = Math.max(1, ilvl | 0);
      const drops = [];

      // Item rolls.
      let guaranteed = cfg.guar;
      for (let i = 0; i < cfg.rolls; i++) {
        if (guaranteed > 0) {
          const it = rollItemMin(il, mf, cfg.minQ, 40);
          if (it) { drops.push(it); guaranteed--; continue; }
        }
        if (Math.random() < cfg.chance) {
          const it = rollItem(il, mf);
          if (it) drops.push(it);
        }
      }

      // Gold pile.
      const gc = cfg.gold;
      if (Math.random() < gc[0]) {
        const g = Math.max(1, Math.round(rand(gc[1][0], gc[1][1]) * il * gc[2]));
        drops.push({ gold: g });
      }

      // Potion.
      if (Math.random() < cfg.potChance) {
        drops.push(newPotion(Math.random() < 0.55 ? 'hp' : 'mp'));
      }

      // Scatter drops on ground (same logic as base).
      drops.forEach(d => {
        const a = Math.random() * Math.PI * 2;
        const r = 0.3 + Math.random() * (drops.length > 3 ? 1.3 : 0.7);
        let px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
        if (G.zone.solidAt(px, py)) { px = x; py = y; }
        if (d.gold) G.zone.items.push({ gold: d.gold, x: px, y: py, t: 0.4 });
        else G.zone.items.push({ item: d, x: px, y: py, t: 0.4 });
      });
      if (drops.some(d => d.q === 'unique')) sfx(880, 0.4, 'sine', 0.05, 440);
    } catch (e) {
      // Defensive: never break monster death because loot rolled wrong.
      try { _origDrop(x, y, ilvl, kind); } catch (_e) { /* noop */ }
    }
  };
})();
