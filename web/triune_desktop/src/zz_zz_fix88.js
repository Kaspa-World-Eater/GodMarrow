// zz_zz_fix88.js — the user (2026-09-29): "The mirror skills should be slightly stronger considering their mana cost."
// Standing Mirrors, the Cage (Hall of Mirrors), Mirror Fissure and the Falling Mirror hit 20% harder.
(function () {
  if (typeof WS !== 'object') return;
  for (const k of ['pillarDmg', 'cageDmg', 'fissureDmg', 'anvilDmg']) { const f = WS[k]; if (typeof f === 'function') WS[k] = function () { const v = f.apply(this, arguments); return typeof v === 'number' ? v * 1.2 : v; }; }
})();
