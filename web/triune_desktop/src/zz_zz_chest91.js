// zz_zz_chest91.js — the user (2026-09-29): "the chests almost never drop anything, which is fine for them to drop nothing,
// but I feel like I should have slightly higher chances to drop at least something."
// Measured: chests did drop (40 of 40 opened gave something; ~1.5 items and most gave gold), but the loot landed in a tight
// clump right against the chest, much of it on the far side where the chest's big sprite (and the hero) cover it.
//  * The loot now spills out in FRONT of the chest (the side facing the camera), 1-1.8 tiles out, fanned so pieces don't stack.
//  * Slightly better odds: one more 25% item roll, and a chest that rolled nothing at all still gives up a few coins
//    about half the time (so a truly empty chest is rare, but possible).
(function () {
  if (typeof dropLoot !== 'function') return;
  const _dl = dropLoot;
  dropLoot = function (x, y, ilvl, kind) {
    if (kind !== 'chest') return _dl.apply(this, arguments);
    const z = G.zone, n0 = z.items.length;
    const r = _dl.apply(this, arguments);
    try {
      if (Math.random() < 0.25 && typeof rollItem === 'function') { const it = rollItem(Math.max(1, ilvl | 0), (D && D.mf) || 0); if (it) z.items.push({ item: it, x, y, t: 0.4 }); }
      if (z.items.length === n0 && Math.random() < 0.5) z.items.push({ gold: Math.max(1, Math.round((2 + Math.random() * 4) * Math.max(1, ilvl | 0))), x, y, t: 0.4 });
      // spill in front: +x+y is toward the camera in this isometric view
      const got = z.items.slice(n0), cx = x, cy = y - 0.5, n = got.length;
      got.forEach((g, i) => {
        const a = Math.PI / 4 + (n > 1 ? (i / (n - 1) - 0.5) * 1.9 : 0) + (Math.random() - 0.5) * 0.25, d = 1.05 + Math.random() * 0.7;
        let px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d;
        if (z.solidAt(px, py)) { px = cx + Math.cos(a) * 0.9; py = cy + Math.sin(a) * 0.9; }
        if (!z.solidAt(px, py)) { g.x = px; g.y = py; }
      });
    } catch (e) { if (typeof reportError === 'function') reportError(e); }
    return r;
  };
  try { if (window.__spm) window.__spm.dropLoot = dropLoot; } catch (e) { }
})();
