// zz_atmos62.js — the user (2026-09-29): "get the lighting to be more dynamic, more flavorful, more atmosphere to make the
// world feel alive." Five layers that live in the world and take their colour from the light around them (never red):
//  1. mist banks that drift over the ground and glow only where a lantern or a fire reaches them (dark elsewhere);
//  2. dust turning in the hero's lantern light, bright in the light and lost in the dark;
//  3. soul-lights: a few pale wandering lights in the open at dusk and night, each lighting the ground under it;
//  4. leaves shaken loose in the woods and on the moor, tumbling on the wind;
//  5. cloud shadows sliding over the land by day, so the light itself breathes.
// Wind is one shared gust that everything answers to: mist, leaves, dust and the hero's flame.
(function () {
  if (typeof drawAtmos !== 'function' || typeof updateAtmos !== 'function') return;
  const A = { zone: null, mist: [], dust: [], souls: [], leaves: [], clouds: [], gust: 0, gustT: 0, gustV: 0 };
  try { window.__atmos62 = A; } catch (e) { }
  const rnd = (a, b) => a + Math.random() * (b - a);
  const TH = z => z.theme || '';
  const woody = z => /wood|moor|ashoak|grove|root|fern|hollow/.test(TH(z) + ' ' + z.id);
  const fenish = z => /fen|bog|drown|sunken|marsh/.test(TH(z) + ' ' + z.id);
  // ---- dithered sprites (made once)
  const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
  function blob(w, h, soft) {
    const c = mkCanvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), D = img.data;
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const dx = (i - w / 2 + 0.5) / (w / 2), dy = (j - h / 2 + 0.5) / (h / 2), d = Math.hypot(dx, dy); if (d >= 1) continue;
      const n = (Math.sin(i * 0.37 + j * 0.91) + Math.sin(i * 0.13 - j * 0.29 + 2)) * 0.12;
      const v = Math.pow(1 - d, soft) + n; if (v <= BAY[((j & 3) << 2) + (i & 3)] * 0.9) continue;
      const o = (j * w + i) * 4; D[o] = D[o + 1] = D[o + 2] = 255; D[o + 3] = 255;
    }
    x.putImageData(img, 0, 0); return c;
  }
  const MIST = [blob(110, 30, 1.1), blob(84, 24, 1.0), blob(150, 40, 1.3)];
  const CLOUD = blob(220, 110, 0.9);
  const tinted = new Map();
  function tint(src, rgb, key) {
    const k = key + '|' + rgb; let c = tinted.get(k); if (c) return c;
    c = mkCanvas(src.width, src.height); const x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = `rgb(${rgb})`; x.fillRect(0, 0, c.width, c.height);
    if (tinted.size > 400) tinted.clear(); tinted.set(k, c); return c;
  }
  const q8 = v => Math.max(0, Math.min(255, Math.round(v / 8) * 8));
  // screen-space light at a point (0..~2 per channel), from the quantised light map
  const LA = (x, y) => { try { return lightAt37(x, y); } catch (e) { return [0.5, 0.5, 0.55]; } };
  const lum = L => (L[0] + L[1] + L[2]) / 3;
  // world <-> screen
  const W2S = (x, y) => iso(x, y);
  function scrToWorld(sx, sy) { try { return screenToWorld(sx, sy); } catch (e) { return null; } }

  // ---- update
  const _ua = updateAtmos;
  updateAtmos = function (dt) {
    _ua(dt);
    try {
      const z = G.zone; if (!z || !dt) return;
      if (A.zone !== z.id) { A.zone = z.id; A.mist = []; A.dust = []; A.souls = []; A.leaves = []; A.clouds = []; }
      const out = isOutdoor(z), dk = out ? dayK() : 0, night = out ? 1 - dk : 1; A.dbg = [out, dk, G.lowFx];
      // the gust: a slow wind with a stronger breath every 8-20 s
      A.gustT -= dt; if (A.gustT <= 0) { A.gustT = rnd(8, 20); A.gustV = rnd(0.6, 1); }
      A.gustV = Math.max(0, A.gustV - dt * 0.35); A.gust += ((0.25 + A.gustV) - A.gust) * Math.min(1, dt * 1.5);
      const wind = (Math.sin(G.time * 0.21) * 0.5 + 0.8) * A.gust;   // tiles per second, westward drift eastward
      // 1. mist banks, anchored to the ground around the camera
      const want = G.lowFx ? 0 : (fenish(z) ? 18 : out ? Math.round(6 + 8 * night) : 8);
      const c = scrToWorld(VW / 2, VH / 2) || { x: P.x, y: P.y };
      while (A.mist.length < want) A.mist.push({ x: c.x + rnd(-10, 10), y: c.y + rnd(-10, 10), k: (Math.random() * 3) | 0, t: 0, life: rnd(18, 40), d: rnd(0.5, 1), ph: rnd(0, 6) });
      for (const m of A.mist) { m.t += dt; m.x += wind * 0.35 * dt; m.y -= wind * 0.12 * dt; }
      A.mist = A.mist.filter(m => m.t < m.life && Math.hypot(m.x - c.x, m.y - c.y) < 15);
      // 2. dust in the lantern light
      if (!P.dead && !G.lowFx) {
        while (A.dust.length < 10) A.dust.push({ ox: rnd(-26, 26), oy: rnd(-36, 6), vx: rnd(-2, 2), vy: rnd(-3, -0.5), t: 0, life: rnd(3, 7), ph: rnd(0, 6) });
        for (const d of A.dust) { d.t += dt; d.ox += (d.vx + wind * 3 + Math.sin(G.time * 0.9 + d.ph) * 2) * dt; d.oy += (d.vy + Math.cos(G.time * 0.7 + d.ph) * 1.2) * dt; }
        A.dust = A.dust.filter(d => d.t < d.life && Math.abs(d.ox) < 40 && d.oy > -50 && d.oy < 12);
      }
      // 3. soul-lights: out in the open when the light fails
      const sw = out && !G.lowFx ? Math.round(2 * Math.max(0, night - 0.3)) : 0;   // v0.63: rarer
      while (A.souls.length < sw) { const a = rnd(0, 6.28), r = rnd(6, 14); A.souls.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r, h: rnd(8, 16), t: 0, life: rnd(14, 30), ph: rnd(0, 6), vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3) }); }
      for (const s of A.souls) { s.t += dt; s.x += (s.vx + Math.sin(G.time * 0.3 + s.ph) * 0.25 + wind * 0.1) * dt; s.y += (s.vy + Math.cos(G.time * 0.23 + s.ph) * 0.25) * dt; }
      A.souls = A.souls.filter(s => s.t < s.life && Math.hypot(s.x - c.x, s.y - c.y) < 24);
      if (A.souls.length > sw) A.souls.length = sw;
      // 4. leaves, shaken loose from the trees on screen
      if (woody(z) && out && !G.lowFx) {
        const rate = 0.25 + A.gust * 1.2;   // v0.63: rarer
        if (Math.random() < rate * dt && A.leaves.length < 40) A.leaves.push({ x: rnd(-20, VW), y: rnd(-10, VH * 0.6), vx: 0, vy: rnd(5, 9), t: 0, life: rnd(4, 8), ph: rnd(0, 6), col: Math.random() < 0.6 ? 0 : Math.random() < 0.6 ? 1 : 2 });
        for (const l of A.leaves) { l.t += dt; l.vx += ((wind * 24) - l.vx) * Math.min(1, dt); l.x += (l.vx + Math.sin(G.time * 2.3 + l.ph) * 6) * dt; l.y += (l.vy + Math.cos(G.time * 1.7 + l.ph) * 3) * dt; }
      }
      const dx = (A.cx == null ? 0 : cam.x - A.cx), dy = (A.cy == null ? 0 : cam.y - A.cy); A.cx = cam.x; A.cy = cam.y;
      for (const l of A.leaves) { l.x -= dx; l.y -= dy; }
      A.leaves = A.leaves.filter(l => l.t < l.life && l.x > -30 && l.x < VW + 30 && l.y < VH + 20);
      // 5. clouds: only in the open by day
      const cw = out && dk > 0.2 && !G.lowFx ? 2 : 0;
      while (A.clouds.length < cw) A.clouds.push({ x: rnd(-VW * 0.6, VW * 0.9), y: rnd(-40, VH), s: rnd(0.9, 1.6), t: 0, life: rnd(40, 70) });
      for (const k of A.clouds) { k.t += dt; k.x += (4 + wind * 8) * dt - dx; k.y += (1.2) * dt - dy; }
      A.clouds = A.clouds.filter(k => k.t < k.life && k.x < VW + 200 && k.y < VH + 120);
    } catch (e) { if (typeof reportError === 'function') reportError(e); }
  };

  // ---- the soul-lights and the hero's flame answer to the wind in the light map
  if (typeof addLights16 === 'function') {
    const _al = addLights16;
    addLights16 = function (z) {
      _al(z);
      try {
        for (const s of A.souls) {
          const p = W2S(s.x, s.y), f = Math.min(1, s.t / 2, (s.life - s.t) / 3), b = 0.8 + 0.2 * Math.sin(G.time * 2.1 + s.ph);
          addLightRaw(p.sx, p.sy - 2, 30, '170,214,200', 0.3 * f * b);
          addLightRaw(p.sx, p.sy - s.h, 9, '215,236,226', 0.25 * f * b);
        }
      } catch (e) { }
    };
  }

  // ---- draw
  const LEAF = [['#6e3a1c', '#9a5a2a'], ['#5a5a2a', '#7c7a3a'], ['#3e2a1c', '#5e4630']];
  const _da = drawAtmos;
  drawAtmos = function () {
    _da();
    try {
      const z = G.zone; if (!z) return;
      const out = isOutdoor(z), dk = out ? dayK() : 0;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      // 5. clouds first, over the ground: a gentle multiply that drifts
      for (const k of A.clouds) {
        const f = Math.min(1, k.t / 6, (k.life - k.t) / 6) * Math.min(1, (dk - 0.2) * 2);
        ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.18 * f;
        ctx.drawImage(tint(CLOUD, '90,92,110', 'cl'), Math.round(k.x), Math.round(k.y), Math.round(CLOUD.width * k.s), Math.round(CLOUD.height * k.s));
      }
      ctx.globalCompositeOperation = 'source-over';
      // 1. mist: its brightness is the light it sits in, so it glows round lanterns and fires and sinks into the dark
      for (const m of A.mist) {
        const p = W2S(m.x, m.y), S = MIST[m.k], x = Math.round(p.sx - S.width / 2), y = Math.round(p.sy - S.height / 2);
        if (x > VW || y > VH || x + S.width < 0 || y + S.height < 0) continue;
        const L = LA(p.sx, p.sy), l = lum(L), f = Math.min(1, m.t / 5, (m.life - m.t) / 5) * m.d * (0.6 + 0.4 * Math.sin(G.time * 0.4 + m.ph));
        const rgb = `${q8(130 * L[0] + 44)},${q8(136 * L[1] + 50)},${q8(144 * L[2] + 62)}`;   // moonlit grey-blue in the dark, lantern-warm in the light
        ctx.globalAlpha = Math.min(0.26, (0.06 + 0.16 * Math.min(1.3, l)) * f);
        ctx.drawImage(tint(S, rgb, 'm' + m.k), x, y);
      }
      // 2. dust in the lantern light, around the lantern (or the hero)
      if (!P.dead) {
        const L0 = window.__plLamp ? window.__plLamp() : null, q = W2S(P.x, P.y), cx = L0 ? L0.x : q.sx, cy = L0 ? L0.y : q.sy - 16;
        for (const d of A.dust) {
          const x = Math.round(cx + d.ox), y = Math.round(cy + d.oy), L = LA(x, y), l = lum(L);
          if (l < 0.55) continue;
          const f = Math.min(1, d.t / 0.8, (d.life - d.t) / 1.2) * Math.min(1, (l - 0.55) * 2.2), tw = 0.55 + 0.45 * Math.sin(G.time * 3 + d.ph);
          ctx.globalAlpha = 0.55 * f * tw; ctx.fillStyle = `rgb(${q8(200 * L[0])},${q8(196 * L[1])},${q8(186 * L[2])})`; ctx.fillRect(x, y, 1, 1);
        }
      }
      // 3. soul-lights: a pale core and a breath of halo, bobbing slowly
      ctx.globalCompositeOperation = 'lighter';
      for (const s of A.souls) {
        const p = W2S(s.x, s.y), f = Math.min(1, s.t / 2, (s.life - s.t) / 3), b = 0.7 + 0.3 * Math.sin(G.time * 2.1 + s.ph), y = Math.round(p.sy - s.h + Math.sin(G.time * 0.9 + s.ph) * 2), x = Math.round(p.sx);
        ctx.globalAlpha = 0.55 * f * b; try { const gg = ditherGlow(9, '130,190,176'); ctx.drawImage(gg, x - (gg.width >> 1), y - (gg.height >> 1)); } catch (e) { }
        ctx.globalAlpha = 0.95 * f * b; ctx.fillStyle = '#e4f4ec'; ctx.fillRect(x, y, 2, 2); ctx.globalAlpha = 0.5 * f * b; ctx.fillRect(x - 1, y, 1, 2); ctx.fillRect(x + 2, y, 1, 2);
      }
      ctx.globalCompositeOperation = 'source-over';
      // 4. leaves: two-pixel flakes that flip as they tumble, lit by what they pass through
      for (const l of A.leaves) {
        const x = Math.round(l.x), y = Math.round(l.y), L = LA(x, y), f = Math.min(1, l.t / 0.5, (l.life - l.t) / 0.8), fl = Math.sin(G.time * 6 + l.ph) > 0;
        const c = LEAF[l.col][fl ? 1 : 0]; ctx.globalAlpha = f * Math.min(1, 0.35 + lum(L) * 0.7); ctx.fillStyle = c;
        ctx.fillRect(x, y, fl ? 2 : 1, 1); if (!fl) ctx.fillRect(x, y + 1, 1, 1);
      }
      ctx.restore();
    } catch (e) { if (typeof reportError === 'function') reportError(e); }
  };
})();
