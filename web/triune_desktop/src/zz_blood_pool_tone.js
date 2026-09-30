// zz_blood_pool_tone.js
// User: "tone down the extreme blood puddle, should just pool and grow that pool if more blood is added"
// Wrap addPool so caps are gentler and growth per merge is smaller. The base merges by radius but
// grew fast at +0.05/hit and had big caps (1.2 normal / 2.4 big). Bring both down.
(function () {
  if (typeof addPool !== 'function' || typeof G === 'undefined') return;
  const _add = addPool;
  addPool = function (x, y, r, life) {
    if (G.zone && G.zone.solidAt && G.zone.solidAt(x, y)) return null;
    // apply the same poolScale the base uses
    const scale = (typeof poolScale === 'function') ? poolScale() : 1;
    r *= scale;
    G.pools = G.pools || [];
    // merge with a nearby pool if any (tighter merge distance so pools cluster more)
    for (const p of G.pools) {
      if (Math.hypot(p.x - x, p.y - y) < p.r * 0.75) {
        const cap = p.big ? 1.4 : 0.8;                    // was 2.4 / 1.2 — much more modest
        p.r = Math.min(cap, Math.max(p.r, r) + 0.02);      // was +0.05 — slower growth per merge
        p.life = Math.max(p.life, life);
        p.max = Math.max(p.max, p.life);
        return p;
      }
    }
    // brand-new pool: cap the initial radius at the same modest cap
    const cap0 = 0.8;
    const p = { x, y, r: Math.min(cap0, r), life, max: life, seed: Math.random() * 99 };
    G.pools.push(p);
    while (G.pools.length > 60) G.pools.shift();
    return p;
  };
})();
