// zz_fate_zcap.js (v0.53) — the Reading's numbers, reined in (user, 2026-09-28): "some of the values are pretty
// extreme ... Percentile based anything ... at most it should be 1%." Every percent bonus or cost from any choice is
// now +1% or -1%. Flat values are held to small steps too: attributes 2, armor and poise 4, life per kill 1.
// Runs after zz_fate_tune.js (and the softening in qa_fate22.js) so it is the last word; text is rebuilt to match.
(function () {
  if (typeof FATE === 'undefined') return;
  const PCT = ['dmg', 'frw', 'fcr', 'res', 'mf', 'regen', 'hpPct', 'xp', 'gold'];
  const FLAT = { vit: 2, spi: 2, con: 2, armor: 4, stam: 4, lok: 1 };
  const clamp = fx => { if (!fx) return fx; for (const k in fx) { const v = fx[k]; if (!v || /^skt/.test(k)) continue; const c = PCT.includes(k) ? 1 : FLAT[k]; if (c) fx[k] = Math.sign(v) * Math.min(Math.abs(v), c); } return fx; };
  const fix = e => {
    if (!e || !e.fx) return; clamp(e.fx); if (typeof fateTxtOf === 'function') e.txt = fateTxtOf(e.fx, e.txt);
    if (e.rev && e.rev.fx) { clamp(e.rev.fx); if (typeof fateTxtOf === 'function') e.rev.txt = fateTxtOf(e.rev.fx, e.rev.txt); }
  };
  for (const L of [FATE.cards, FATE.bones, FATE.stars, FATE.sacrifices, FATE.fears, FATE.seeks, FATE.roads]) (L || []).forEach(fix);
  for (const g in (FATE.faces || {})) FATE.faces[g].forEach(fix);
  for (const q of (FATE.questions || [])) q.a.forEach(fix);
  // the Kusho's god is added later (zw_monk.js); catch any list entry that arrives after this file
  if (typeof fateLore36 === 'function') { const _l = fateLore36; fateLore36 = function () { const r = _l.apply(this, arguments); try { FATE.stars.forEach(fix); for (const g in FATE.faces) FATE.faces[g].forEach(fix); } catch (e) { } return r; }; }
})();
