// zz_passive_tag.js
// User: "all skills should say if they are passive"
// Prefix every passive skill's desc with "[Passive] " so it reads that way
// in every place the description shows, not just the expanded tooltip.
(function () {
  if (typeof SK === 'undefined') return;
  for (const id in SK) {
    const s = SK[id]; if (!s) continue;
    if (s.kind !== 'passive') continue;
    if (!s.desc) s.desc = '';
    if (!/^\[Passive\]/.test(s.desc)) s.desc = '[Passive] ' + s.desc;
    // perks that are effectively passive (attached to a passive parent) get tagged too
    if (Array.isArray(s.perks)) for (const p of s.perks) {
      if (!p || !p.desc) continue;
      if (!/^\[Passive\]/.test(p.desc)) p.desc = '[Passive] ' + p.desc;
    }
  }
})();
