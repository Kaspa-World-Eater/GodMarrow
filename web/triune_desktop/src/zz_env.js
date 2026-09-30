// v0.35 environment beauty overrides (spliced inside the main IIFE before zz_polish)
// Atmosphere in particles, never in full-screen filters: layered ground mist that drifts through the world, embers
// over the moor at night, dawn light through the fen, dust hanging in the vaults. All of it is a few drawImage calls.
{
  // ---- mist puffs: dithered ellipses of pale pixels, three sizes, painted once
  const MISTP = [];
  // v0.37: torn, wispy shapes (noise-cut, two dithered densities), not smooth ellipses
  const mistPuff = (w, h, seed) => {
    const c = mkCanvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), D = img.data;
    const vn = (u, v) => { const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, sm = t => t * t * (3 - 2 * t), a = hash(i + seed, j), b2 = hash(i + 1 + seed, j), c2 = hash(i + seed, j + 1), d2 = hash(i + 1 + seed, j + 1); return (a + (b2 - a) * sm(fu)) * (1 - sm(fv)) + (c2 + (d2 - c2) * sm(fu)) * sm(fv); };
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const dx = (i - w / 2) / (w / 2), dy = (j - h / 2) / (h / 2), d = dx * dx + dy * dy; if (d > 1) continue;
      const n = vn(i / 9, j / 3) * 0.7 + vn(i / 3.5, j / 1.6 + 5) * 0.3;
      const v = ((1 - d) * 1.3 + n - 0.95) * 2.2, lv = Math.min(2, (v | 0) + ((v - (v | 0) - 0.3) * 2.5 > BAY4[((j & 3) << 2) + (i & 3)] ? 1 : 0));
      if (lv <= 0) continue;
      const o = (j * w + i) * 4; D[o] = 196; D[o + 1] = 206; D[o + 2] = 214; D[o + 3] = lv > 1 ? 150 : 80;
    }
    g.putImageData(img, 0, 0); return c;
  };
  for (let k = 0; k < 3; k++) MISTP.push(mistPuff(64 + k * 24, 10 + k * 3, k * 17));
  const MIST = { zone: null, p: [], emb: [], dust: [] };
  const RAYS = {};
  const rayEnv37 = rgb => {
    if (RAYS[rgb]) return RAYS[rgb];
    const w = 170, h = 380, c = mkCanvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), D = img.data, C = rgb.split(',').map(Number);
    for (let j = 0; j < h; j++) { const k = j / h, cx = w - 26 - k * (w - 52), hw = 10 + k * 16; for (let i = 0; i < w; i++) {
      const u = Math.abs(i - cx) / hw; if (u >= 1) continue;
      const v = (1 - u * u) * (0.35 + 0.65 * Math.sin(k * Math.PI)) * (0.8 + 0.2 * Math.sin(i * 0.7 + j * 0.13)) * 3, lv = Math.min(3, (v | 0) + ((v - (v | 0) - 0.3) * 2.5 > BAY4[((j & 3) << 2) + (i & 3)] ? 1 : 0)); if (!lv) continue;
      const o = (j * w + i) * 4; D[o] = C[0]; D[o + 1] = C[1]; D[o + 2] = C[2]; D[o + 3] = lv * 30; } }
    g.putImageData(img, 0, 0); return (RAYS[rgb] = c);
  };
  function ztMist() {
    const z = G.zone; if (!z || G.lowFx) return;
    const out = isOutdoor(z), fen = z.theme === 'fen', deep = !out;
    if (MIST.zone !== z) { MIST.zone = z; MIST.p = []; MIST.emb = []; MIST.dust = []; }
    const dt = Math.min(0.05, G.dtLast || 0.016), t = G.time, dk = out ? dayK() : 0;
    // the view in world cells, with a margin, so puffs are born just off screen and wander across
    const v = visibleRange(4), n = fen ? 16 : out ? 11 : 6;
    while (MIST.p.length < n) MIST.p.push({ x: v.x0 + Math.random() * (v.x1 - v.x0), y: v.y0 + Math.random() * (v.y1 - v.y0), k: (Math.random() * 3) | 0, s: Math.random() * 6.28, a: 0.5 + Math.random() * 0.5, t: 0, life: 14 + Math.random() * 10, z: 1 + Math.random() * 4 });
    // strength: the fen is always misted; the moor mists at dusk, night and dawn; the vaults breathe a little of it
    const base = fen ? 0.2 : out ? 0.08 + 0.12 * (1 - dk) : 0.06;
    for (const q of MIST.p) {
      q.t += dt; q.x += (0.12 + Math.sin(t * 0.2 + q.s) * 0.06) * dt; q.y -= (0.05 + Math.cos(t * 0.17 + q.s) * 0.05) * dt;
      if (q.t > q.life || q.x < v.x0 - 2 || q.y < v.y0 - 2 || q.x > v.x1 + 2 || q.y > v.y1 + 2) { q.x = v.x0 + Math.random() * (v.x1 - v.x0); q.y = v.y1 - Math.random() * 3; q.t = 0; q.life = 14 + Math.random() * 10; continue; }
      const p = iso(q.x, q.y), fade = Math.min(1, q.t / 3, (q.life - q.t) / 3), img = MISTP[q.k];
      if (p.sx < -80 || p.sx > W + 80 || p.sy < -20 || p.sy > H + 20) continue;
      // only over open ground: mist does not hang on walls or water in the moor
      const tt = z.get(Math.floor(q.x), Math.floor(q.y)); if (tt == null || TALL[tt] || (!fen && tt === T.WATER)) continue;
      ctx.globalAlpha = base * q.a * fade; ctx.drawImage(img, Math.round(p.sx - img.width / 2), Math.round(p.sy - q.z - img.height / 2));
      if (q.k === 2) ctx.drawImage(img, Math.round(p.sx - img.width / 2 + 20 + Math.sin(t * 0.3 + q.s) * 6), Math.round(p.sy - q.z - 2 - img.height / 2));
    }
    ctx.globalAlpha = 1;
    // embers over the moor after dark: they rise, wander and gutter out
    if (out && !fen && dk < 0.7) {
      const want = Math.round(8 * (1 - dk));
      while (MIST.emb.length < want) MIST.emb.push({ x: Math.random() * W, y: H * 0.4 + Math.random() * H * 0.6, s: Math.random() * 6.28, t: 0, life: 3 + Math.random() * 4, v: 8 + Math.random() * 10 });
      for (const e of MIST.emb) {
        e.t += dt; e.y -= e.v * dt; e.x += Math.sin(t * 1.7 + e.s) * 9 * dt;
        const f = Math.min(1, e.t / 0.5, (e.life - e.t) / 1.2), fl = 0.6 + 0.4 * Math.sin(t * 9 + e.s);
        if (f <= 0) continue;
        ctx.fillStyle = `rgba(255,${110 + (fl * 80 | 0)},40,${0.85 * f * fl})`; ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
        if (fl > 0.85) { ctx.fillStyle = `rgba(255,200,120,${0.4 * f})`; ctx.fillRect(Math.round(e.x) - 1, Math.round(e.y), 3, 1); ctx.fillRect(Math.round(e.x), Math.round(e.y) - 1, 1, 3); }
      }
      MIST.emb = MIST.emb.filter(e => e.t < e.life && e.y > -4);
    } else MIST.emb.length = 0;
    // dawn (fen and moor) and dusk (moor): long low rays through the trees, dithered bands at the world grain
    const hr = typeof hourOf === 'function' ? hourOf() : 'day';
    if (out && (hr === 'dawn' || (hr === 'dusk' && !fen))) {
      const p = dayPhase(), k = hr === 'dawn' ? Math.sin((p - 0.9) / 0.1 * Math.PI) : Math.sin((p - 0.55) / 0.11 * Math.PI), spr = rayEnv37(hr === 'dawn' ? '236,206,140' : '240,120,70');
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.5 * k * (0.7 + 0.3 * Math.sin(t * 0.4 + i * 2)); ctx.drawImage(spr, Math.round(W * 0.12 + i * W * 0.3 + Math.sin(t * 0.13 + i) * 18 - ((cam.x * 0.3) % 60)), -10); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    // day on the moor: a few bright motes hanging in the light, slower and paler than the falling ash
    if (out && dk > 0.3) {
      while (MIST.dust.length < 14) MIST.dust.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 6.28, t: 0, life: 6 + Math.random() * 6 });
      for (const d of MIST.dust) { d.t += dt; d.x += Math.sin(t * 0.5 + d.s) * 4 * dt; d.y += (2 + Math.cos(t * 0.3 + d.s)) * dt; const f = Math.min(1, d.t / 1.5, (d.life - d.t) / 1.5) * dk * (0.5 + 0.5 * Math.sin(t * 2 + d.s * 3)); ctx.fillStyle = `rgba(232,224,200,${0.45 * f})`; ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1); }
      MIST.dust = MIST.dust.filter(d => d.t < d.life && d.y < H + 4);
    } else MIST.dust.length = 0;
  }
  const _da35 = drawAtmos;
  drawAtmos = function () { _da35(); try { ztMist(); } catch (e) { reportError(e); } };
}

// v0.37 grade: the sky's light over everything. No film noise and no smooth haze: haze is dithered strips, the
// vignette is a dithered frame, the day is pale and drained, the night blue and deep.
{
  let VIG = null;
  const vig37 = () => {
    if (VIG) return VIG;
    const c = mkCanvas(VW, VH), g = c.getContext('2d'), img = g.createImageData(VW, VH), D = img.data;
    for (let j = 0; j < VH; j++) for (let i = 0; i < VW; i++) {
      const dx = (i - VW / 2) / (VW / 2), dy = (j - VH / 2) / (VH / 2), d = Math.sqrt(dx * dx * 0.8 + dy * dy * 1.1);
      const v = Math.max(0, (d - 0.72) / 0.5) * 3, lv = Math.min(3, (v | 0) + ((v - (v | 0) - 0.3) * 2.5 > BAY4[((j & 3) << 2) + (i & 3)] ? 1 : 0)); if (!lv) continue;
      const o = (j * VW + i) * 4; D[o] = 6; D[o + 1] = 5; D[o + 2] = 12; D[o + 3] = lv * 52;
    }
    g.putImageData(img, 0, 0); return (VIG = c);
  };
  postGrade = function (z) {
    const out = isOutdoor(z), dk = out ? dayK() : 0, hr = out && typeof hourOf === 'function' ? hourOf() : null;
    // cool from above, a little umber from below
    ctx.globalCompositeOperation = 'soft-light';
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(70,90,150,0.24)'); g.addColorStop(0.6, 'rgba(120,110,140,0.1)'); g.addColorStop(1, 'rgba(150,100,70,0.16)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const wk = dk * dk;
    if (out && wk > 0) {
      // day: pale and drained, a flat overcast light that lifts the blacks
      ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${0.42 * wk})`; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = `rgba(62,66,76,${0.62 * wk})`; ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'source-over';
    // haze in thin dithered layers: pale by day, red at dusk, blue at night, grey dust underground
    if (out) {
      const fen = z.theme === 'fen';
      if (hr === 'dusk') drawHaze37(0.2, '150,70,50', 60);
      else if (dk > 0.5) drawHaze37((fen ? 0.26 : 0.16) * dk, fen ? '140,156,150' : '150,156,168', 64);
      else drawHaze37(fen ? 0.16 : 0.12, fen ? '50,72,80' : '50,62,105', 64);
    } else drawHaze37(0.1, '76,70,84', 50, 2);
    ctx.drawImage(vig37(), 0, 0);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  };
}
