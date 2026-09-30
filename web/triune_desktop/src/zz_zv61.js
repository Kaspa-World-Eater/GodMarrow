// zz_zv61.js — the Hemomancer and the Hollow Mystic from PixelLab (the user's art, the lantern in hand, 2026-09-29).
// Their lanterns are part of the sprite now, so the older code-drawn lamps step aside, and the hero's light is set where
// the painted lantern hangs (per view, mirrored with the facing): the light comes from the lantern.
(function () {
  const PL = c => !!(window.__plHD && window.__plHD[c] && window.__plHD[c].ok);
  const CLS = { hemomancer: 1, animancer: 1 };
  // where the lantern hangs, in world px from the feet, facing right (measured on the PixelLab rotations)
  const LAMP = {
    hemomancer: { down: [-5.5, -7.5], front: [-5, -8.3], side: [-1, -7.7], back: [2.2, -8.3], up: [5, -7.7] },   // v0.63: at the left hip
    animancer: { down: [-3.6, -8.8], front: [-0.3, -8.8], side: [2.2, -8.8], back: [4.4, -8.8], up: [3.9, -8.8] },   // hand lantern until her waist set is in
  };
  const RGB = { hemomancer: '238,222,198', animancer: '176,214,255' };   // v0.62: a neutral warm white, so his brown skin reads true (no red cast)
  try { if (typeof LAMP_RGB === 'object') LAMP_RGB.hemomancer = RGB.hemomancer; if (typeof CLASS_LIGHT === 'object') CLASS_LIGHT.hemomancer = RGB.hemomancer; } catch (e) { }
  if (typeof drawClassLamp === 'function') {
    const _dcl = drawClassLamp;
    drawClassLamp = function (list) { if (CLS[P.cls] && PL(P.cls)) return; return _dcl(list); };
  }
  const lampAt = () => {
    const t = LAMP[P.cls]; if (!t) return null;
    const v = P._view || 'front', o = t[v] || t.front, f = P.face || 1, q = iso(P.x, P.y);
    // the lantern swings a little as he walks and leans with the wind (zz_atmos62's gust)
    const g = (window.__atmos62 && window.__atmos62.gust) || 0, walk = Math.sin((P._wd || 0) * Math.PI * 1.9) * 0.8;
    return { x: q.sx - f * o[0] + walk + g * 1.2 * Math.sin(G.time * 1.3), y: q.sy + o[1] - (P.leapZ || 0) };
  };
  try { window.__plLamp = lampAt; } catch (e) { }
  if (typeof addLights16 === 'function') {
    const _al = addLights16;
    addLights16 = function (z) {
      _al(z);
      try {
        return;   // v0.63: the lantern light lives in zz_lantern63.js
        const L = lampAt(); if (!L) return;
        const fl = window.__grade.flame ? window.__grade.flame(3.3) : 1, g = (window.__atmos62 && window.__atmos62.gust) || 0;
        const k = Math.max(0.4, 1 + (fl - 1) * 2 - g * 0.18 * (0.5 + 0.5 * Math.sin(G.time * 7.3)));   // the flame gutters in a gust
        const out = isOutdoor(z), dk = out ? dayK() : 0;
        addLightRaw(L.x, L.y, 44, RGB[P.cls], (0.3 + 0.2 * (1 - dk)) * k);
        addLightRaw(L.x, L.y, 12, RGB[P.cls], (0.1 + 0.06 * (1 - dk)) * k);
      } catch (e) { }
    };
  }
})();
// v0.62: the PixelLab heroes flinch when struck (their hit animation) and reel through a poise break
(function () {
  if (typeof heroPose !== 'function') return;
  const PLc = { hemomancer: 1, animancer: 1 };
  const _hp = heroPose;
  heroPose = function () {
    const r = _hp.apply(this, arguments);
    try {
      if (!PLc[P.cls] || !(window.__plHD && window.__plHD[P.cls] && window.__plHD[P.cls].ok)) return r;
      if ((P.hurt || 0) > 0.17 && !(P._hitT > 0)) P._hitT = 0.42;
      if (P.heavyStun > 0) return ['hit', Math.min(5, Math.floor((1 - P.heavyStun / 0.75) * 6))];
      if (P._hitT > 0 && P.swing <= 0 && P.cast <= 0) { P._hitT -= 1 / 60; return ['hit', Math.min(5, Math.floor((1 - P._hitT / 0.42) * 6))]; }
      if (P._hitT > 0) P._hitT -= 1 / 60;
    } catch (e) { }
    return r;
  };
})();
