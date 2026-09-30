// zz_lantern63.js — the user (2026-09-29): "the light doesnt appear to come from the lanterns at all, and they should have a
// glow in them, like the hollow mystics should be a ghostly blue ... the lantern light should be more prominent and the
// dark more dark ... the lantern light will also have its own effects, and items can roll small perks to the lantern
// light. maybe brighter, different colors do different effects."
//  - The dark is darker (every land's ambient drops again), and the hero's light is the lantern's: its shadow-casting
//    pool is centred under the lantern, larger, and stronger; a glow sits in the lantern itself and breathes/gutters.
//  - Lantern perks roll on items: Bright (radius), and five wick colours. The strongest colour the hero carries tints
//    the lantern light and gives it an effect on every creature standing in it.
(function () {
  // ------------------------------------------------------------------ perks (affixes)
  const PERKS = [
    { n: 'Bright', p: 1, s: 'lrad', r: [10, 25], l: 1 }, { n: 'Blazing', p: 1, s: 'lrad', r: [26, 45], l: 9, rare: true },
    { n: 'of the Ghostlight', p: 0, s: 'lblue', r: [8, 20], l: 2, w: 0.7 },
    { n: 'of the Hearth-wick', p: 0, s: 'lamber', r: [1, 3], l: 2, w: 0.7 },
    { n: 'of the Pale Flame', p: 0, s: 'lwhite', r: [10, 22], l: 3, w: 0.7 },
    { n: 'of the Green Taper', p: 0, s: 'lgreen', r: [1, 2], l: 4, w: 0.6 },
    { n: 'of the Violet Wick', p: 0, s: 'lviolet', r: [1, 3], l: 5, w: 0.5 },
  ];
  try { if (typeof AFFIX !== 'undefined') for (const a of PERKS) AFFIX.push(a); } catch (e) { }
  try {
    if (typeof STAT_TEXT !== 'undefined') Object.assign(STAT_TEXT, {
      lrad: '+#% Lantern Light Radius',
      lblue: 'Ghostlight wick: creatures fear your lantern light (#% chance a second to shy away)',
      lamber: 'Hearth wick: regenerate # Life a second',
      lwhite: 'Pale wick: creatures in your lantern light are slowed #%',
      lgreen: 'Green taper: regenerate # Essence a second',
      lviolet: 'Violet wick: regain # Essence when a creature dies in your lantern light',
    });
  } catch (e) { }
  const WICK = { lblue: '150,200,255', lamber: '255,176,96', lwhite: '236,236,228', lgreen: '170,230,150', lviolet: '200,160,255' };
  const BASE_RGB = { hemomancer: '242,214,168', animancer: '150,196,255', ossumancer: '240,228,204', miasmancer: '255,210,150' };
  const S = { t: 0, st: {} };
  const stats = () => { if (G.time - S.t > 0.5) { S.t = G.time; try { S.st = itemStatSum() || {}; } catch (e) { S.st = {}; } } return S.st; };
  const wick = () => { const s = stats(); let best = null, bv = 0; for (const k in WICK) if ((s[k] || 0) > bv) { bv = s[k]; best = k; } return best; };
  window.__lampRGB = () => { const w = wick(); return w ? WICK[w] : (BASE_RGB[P.cls] || null); };
  window.__lampK = () => 1.5 + (stats().lrad || 0) / 100 * 0.5;
  // where the light stands: the ground under the lantern (screen offset back to world)
  window.__lampFoot = () => {
    if (!window.__plLamp || !(window.__plHD && window.__plHD[P.cls])) return null;
    const W = window.__lampW && window.__lampW(); if (W) return [W.x, W.y];   // v0.74: the lantern floats on its own
    const L = window.__plLamp(); if (!L) return null; const q = iso(P.x, P.y), dx = L.x - q.sx;
    return [P.x + dx / TW, P.y - dx / TW];
  };
  if (typeof heroLightR === 'function') { const _hl = heroLightR; heroLightR = function () { return _hl() * 0.62 * (1 + (stats().lrad || 0) / 100); }; }
  // ------------------------------------------------------------------ the dark, darker
  if (typeof ambient37 === 'function') {
    const _am = ambient37;
    ambient37 = function (z) { const a = _am.apply(this, arguments); const k = isOutdoor(z) ? 0.95 : 1; return a.map(v => Math.round(v * k)); };   // v0.64: the dark layer (zz_zx_dark64) does the darkening now
  }
  // ------------------------------------------------------------------ the lantern's own light and glow
  if (typeof addLights16 === 'function') {
    const _al = addLights16;
    addLights16 = function (z) {
      _al(z);
      try {
        if (P.dead || !window.__plLamp || !(window.__plHD && window.__plHD[P.cls])) return;
        const L = window.__plLamp(); if (!L) return;
        const rgb = window.__lampRGB() || '240,220,190', fl = window.__flameS ? window.__flameS(3.3) : 1;
        const g = (window.__atmos62 && window.__atmos62.gust) || 0, k = Math.max(0.5, 1 + (fl - 1) * 0.8 - g * 0.06) * window.__lampK() * (window.__lampMood ? window.__lampMood() : 1);
        const jx = Math.sin(G.time * 5.1) * 0.8, jy = Math.cos(G.time * 4.3) * 0.5;
        const LF = window.__lampFoot(), gq = LF ? iso(LF[0], LF[1]) : iso(P.x, P.y), gx = gq.sx, gy = gq.sy + 1, out = isOutdoor(z), nk = out ? 1 - dayK() : 1;
        // the lantern's light: it radiates from the glass (lighting the body beside it) and falls softly onto the ground under it
        const RR = 64 * (window.__lampK ? window.__lampK() / 1.5 : 1);
        addLightRaw(gx + jx * 0.3, gy + jy * 0.3, RR, rgb, (0.17 + 0.15 * nk) * k);   // v0.79: less glow
        addLightRaw(L.x, L.y, 22, rgb, (0.2 + 0.12 * nk) * k);
        addLightRaw(gx, (gy + L.y) / 2, 26, rgb, (0.1 + 0.08 * nk) * k);                      // the light climbing the body beside it
        addLightRaw(L.x, L.y, 16, rgb, 0.5 * k);         // the hot heart at the lantern
      } catch (e) { }
    };
  }
  const GLOW = new Map();
  function glowSprite(rgb, r) {
    const key = rgb + r; let c = GLOW.get(key); if (c) return c;
    const n = r * 2 + 1; c = mkCanvas(n, n); const x = c.getContext('2d'), img = x.createImageData(n, n), D = img.data, C = rgb.split(',').map(Number);
    const B = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const d = Math.hypot(i - r, j - r) / (r + 0.5); if (d >= 1) continue; const v = (1 - d) * (1 - d); if (v * 16 < B[((j & 3) << 2) + (i & 3)] * 0.9) continue; const o = (j * n + i) * 4; D[o] = C[0]; D[o + 1] = C[1]; D[o + 2] = C[2]; D[o + 3] = Math.round(255 * Math.min(1, v * 1.4)); }
    x.putImageData(img, 0, 0); GLOW.set(key, c); return c;
  }
  if (typeof drawClassLamp === 'function') {
    const _dcl = drawClassLamp;
    drawClassLamp = function (list) {
      _dcl(list);
      try {
        if (P.dead || !G.zone || !window.__plLamp || !(window.__plHD && window.__plHD[P.cls])) return;
        const LW = window.__lampW && window.__lampW();
        list.push({ d: LW ? LW.x + LW.y + 0.01 : P.x + P.y + 0.08, f: () => {
          const L = window.__plLamp(); if (!L) return;
          const rgb = window.__lampRGB() || '240,220,190';
          // the flame breathes and gutters: a slow swell, a quicker flutter, now and then a dip
          const t = G.time, br = 0.86 + 0.09 * Math.sin(t * 1.7) + 0.05 * Math.sin(t * 2.9 + Math.sin(t * 0.7));   // v0.79: a slow breath, no flutter (it strobed on phones)
          const x = Math.round(L.x), y = Math.round(L.y);
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          let g;   // the air around it is lit by the light map, not painted over the hero
          ctx.globalAlpha = 0.1 * br; g = glowSprite(rgb, 9); ctx.drawImage(g, x - 9, y - 9);   // the air around the glass
          ctx.globalAlpha = 0.42 * br; g = glowSprite(rgb, 5); ctx.drawImage(g, x - 5, y - 5);           // the halo in the glass
          ctx.globalAlpha = 0.85 * br; g = glowSprite(rgb, 2); ctx.drawImage(g, x - 2, y - 2);          // the flame
          // faint rays through the cage bars, turning slowly
          ctx.globalAlpha = 0.1 * br; ctx.fillStyle = `rgb(${rgb})`;
          if (false) for (let i = 0; i < 6; i++) { const a = i * 1.047 + t * 0.15, L2 = 9 + 3 * Math.sin(t * 1.3 + i); for (let r = 4; r < L2; r += 2) ctx.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 0.8), 1, 1); }
          ctx.restore();
        } });
      } catch (e) { }
    };
  }
  // ------------------------------------------------------------------ wick effects on creatures in the light
  const inLight = m => { const F = window.__lampFoot ? window.__lampFoot() : null, x = F ? F[0] : P.x, y = F ? F[1] : P.y; return Math.hypot(m.x - x, m.y - y) < heroLightR() * 0.7; };
  let tick = 0;
  if (typeof updateMonsters === 'function') {
    const _um = updateMonsters;
    updateMonsters = function (dt) {
      const r = _um.apply(this, arguments);
      try {
        tick += dt; if (tick < 0.25 || P.dead) return r; const T = tick; tick = 0;
        const s = stats(), w = wick(); if (!w) { for (const m of G.zone.monsters) m._inL = false; return r; }
        if (w === 'lamber' && D && P.hp < D.maxHp) P.hp = Math.min(D.maxHp, P.hp + (s.lamber || 0) * T);
        if (w === 'lgreen' && D && D.maxMana) P.mana = Math.min(D.maxMana, P.mana + (s.lgreen || 0) * T);
        for (const m of G.zone.monsters) {
          if (m.dead) continue; m._inL = inLight(m); if (!m._inL) continue;
          if (w === 'lwhite') m.slow = Math.max(m.slow || 0, (s.lwhite || 0) / 100);
          if (w === 'lblue' && m.rank !== 'boss' && !(m.feared > 0) && Math.random() < (s.lblue || 0) / 100 * T) m.feared = 0.8 + Math.random() * 0.6;   // it shies from the light
        }
      } catch (e) { }
      return r;
    };
  }
  if (typeof monDmg22 === 'function') {
    const _md = monDmg22;
    monDmg22 = function (m, d) { return _md.apply(this, arguments); };
  }
  if (typeof killMon === 'function') {
    const _km = killMon;
    killMon = function (m) { const was = m && !m.dead && m._inL; const r = _km.apply(this, arguments); try { if (was && wick() === 'lviolet') P.mana = Math.min(D.maxMana || P.mana + 99, P.mana + (stats().lviolet || 0)); } catch (e) { } return r; };
  }
  try { window.__lantern63 = { PERKS, WICK, wick, stats }; window.__dbgAmb = () => ambient37(G.zone); } catch (e) { }
})();
