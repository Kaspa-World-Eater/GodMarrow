// zz_rename_mystic.js — display names (2026-09-27): the Weaver of Mirrors is now the Hollow Mystic, and the god of
// flesh is the Bleeding Maiden (never the Weeping Maiden). Display strings only; ids and code are unchanged.
(function () {
  try { if (typeof CLASS_NAME !== 'undefined') CLASS_NAME.animancer = 'Hollow Mystic'; } catch (e) { }
  const fix = s => typeof s === 'string' ? s.replace(/Weaver of Mirrors/g, 'Hollow Mystic').replace(/Weeping Maiden/g, 'Bleeding Maiden').replace(/Hollow Seer/g, 'Mysterious Stranger') : s;
  try {
    if (typeof FATE_LORE36 !== 'undefined') for (const k in FATE_LORE36) { const e = FATE_LORE36[k]; for (const f of ['name', 'sub', 'clsName', 'blurb', 'say']) if (e[f]) e[f] = fix(e[f]); }
    if (typeof FATE !== 'undefined') for (const s of FATE.stars) for (const f of ['name', 'clsName', 'say', 'blurb']) if (s[f]) s[f] = fix(s[f]);
  } catch (e) { }
  if (typeof divineSay === 'function') { const _ds = divineSay; divineSay = function (scene, lines) { return _ds.call(this, scene, (lines || []).map(fix)); }; }
  if (typeof say === 'function') { const _say = say; say = function (s) { const a = Array.prototype.slice.call(arguments); a[0] = fix(s); return _say.apply(this, a); }; }
})();
