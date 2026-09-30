// =================================================================== v0.37: the light engine
// A light map one texel per world pixel (VW x VH). It starts as the zone's ambient (cool and low), every source pours
// its colour into it (fires and lamps only through the shape they can see, so walls, pillars and trees throw
// shadows), and then it is QUANTISED: the light above the ambient is cut into bands, and the edge of every band is
// ordered-dithered (Bayer 4x4) at the world grain. So falloff reads as stepped, dithered rings of pixel art, never a
// smooth blur. The map holds half the light (LK): 255 is twice the painted colour, so fire can rake a surface
// brighter than its paint. It is laid on the scene with multiply and the scene is then doubled.
// Figures standing in firelight throw pixel shadows away from the flame; the hero is rimmed by the nearest flame;
// flames carry dithered halos, embers and smoke.
const LMAP = mkCanvas(VW, VH), lctx = LMAP.getContext('2d', { willReadFrequently: true }), EXC = mkCanvas(VW, VH), ectx = EXC.getContext('2d');
let LCOL = '255,230,200';
const LK = 0.5;
const BAY4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const L37 = { xs: 1, xa: 0.2, cap: 160, amb: [60, 60, 70], src: [], prev: [], halos: [], rec: null, heroRec: [], vis: new Map(), visZone: null, step: 12, lo: 0.28, sc: 2.2, t: { q: 0, n: 0 } };
const AMBIENT = { moor: [206, 204, 212], fen: [192, 204, 200], crypt: [68, 68, 86], barrow: [76, 70, 66], bone: [74, 72, 76], wild: [206, 204, 212] };
// the sky: a pale, washed-out day; a dim, reddened dusk; a deep blue night; underground a low cold dark
function ambient37(z) {
  if (!isOutdoor(z)) return AMBIENT[z.theme] || [56, 54, 70];
  const fen = z.theme === 'fen', k = dayK(), p = dayPhase();
  const day = fen ? AMBIENT.fen : AMBIENT.moor, night = fen ? [50, 64, 74] : [56, 62, 98];
  const e = k * k * (3 - 2 * k);
  let c = day.map((v, i) => night[i] + (v - night[i]) * e);
  const dusk = p > 0.5 && p < 0.72 ? Math.sin((p - 0.5) / 0.22 * Math.PI) : 0, dawn = p > 0.9 ? Math.sin((p - 0.9) / 0.1 * Math.PI) : 0;
  if (dusk > 0) c = c.map((v, i) => v + ([96, 92, 118][i] - v) * 0.5 * dusk);   // v0.64: no red dusk (the user hates red light)
  if (dawn > 0) c = c.map((v, i) => v + ([176, 150, 150][i] - v) * 0.4 * dawn);
  return c.map(v => Math.round(v));
}
function beginLights(z) {
  const a = ambient37(z); L37.amb = a; L37.ambS = [a[0] * LK, a[1] * LK, a[2] * LK];
  lctx.globalCompositeOperation = 'source-over'; lctx.globalAlpha = 1;
  lctx.fillStyle = `rgb(${a[0] * LK | 0},${a[1] * LK | 0},${a[2] * LK | 0})`; lctx.fillRect(0, 0, VW, VH);
  lctx.globalCompositeOperation = 'lighter';
  L37.prev = L37.src; L37.src = []; L37.halos.length = 0; L37.bb = [1e9, 1e9, -1e9, -1e9];
  if (L37.visZone !== z) { L37.visZone = z; L37.vis.clear(); }
  hookHero37();
}
// a round pool of light in screen space (skills, motes, projectiles). `a` is in units of the painted colour.
function addLightRaw(sx, sy, r, rgb, a) {
  if (r < 1 || a <= 0 || sx < -r || sx > VW + r || sy < -r || sy > VH + r) return;
  const A = Math.min(1, a * LK); bb37(sx - r, sy - r, sx + r, sy + r);
  const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, r);
  g.addColorStop(0, `rgba(${rgb},${A})`); g.addColorStop(0.2, `rgba(${rgb},${A * 0.66})`); g.addColorStop(0.45, `rgba(${rgb},${A * 0.32})`); g.addColorStop(0.75, `rgba(${rgb},${A * 0.1})`); g.addColorStop(1, `rgba(${rgb},0)`);
  lctx.fillStyle = g; lctx.fillRect(sx - r, sy - r, r * 2, r * 2);
}
function addLight(sx, sy, r, rgb, a, noBloom) {
  r *= GRAIN;   // v0.36: light radii were written for the coarser grain; keep their size on screen
  addLightRaw(sx, sy, r, rgb, a * 1.25);
  if (!noBloom && a > 0.2 && L37.halos.length < 40) L37.halos.push([sx, sy, r * 0.32, rgb, a * 0.5]);
}
function lineLight(ax, ay, bx, by, w, rgb, a) {
  const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / (w * 0.8)));
  for (let i = 0; i <= n; i++) addLight(ax + (bx - ax) * i / n, ay + (by - ay) * i / n, w, rgb, a / Math.sqrt(n + 1) * 1.6);
}
const CLASS_LIGHT = { animancer: '170,215,255', ossumancer: '255,236,205', hemomancer: '255,120,120', miasmancer: '200,150,255' };
// fire does not glow evenly: it gutters in steps, each flame on its own beat
function flick37(seed) {
  const t = Math.floor(G.time * 10 + seed * 0.37), a = hash(t * 7 + (seed * 13 | 0), (seed * 3 | 0) + 1), b = hash(t * 3 + 1, (seed * 11 | 0) + 5);
  return 0.9 + 0.07 * a + 0.05 * b * Math.sin(G.time * 17 + seed);
}
// v0.39: overlapping flames keep the hottest, they do not sum. These lights are drawn with 'lighten' in opaque colours
// (ambient + light x falloff), so the map takes the per-channel maximum where pools meet.
const RGBA37 = new Map();
function rgbArr37(rgb) { let v = RGBA37.get(rgb); if (!v) { v = rgb.split(',').map(Number); RGBA37.set(rgb, v); } return v; }
function col37(C, A) { const m = L37.ambS; return `rgb(${Math.min(255, m[0] + C[0] * A) | 0},${Math.min(255, m[1] + C[1] * A) | 0},${Math.min(255, m[2] + C[2] * A) | 0})`; }
const FALL37 = [[0, 1], [0.2, 0.9], [0.45, 0.66], [0.7, 0.33], [0.88, 0.1], [1, 0]];
const WGLOW = new Map();
function wallGlow37(r, k) {
  const m = L37.ambS, key = r + '|' + k + '|' + (m[0] | 0) + ',' + (m[1] | 0) + ',' + (m[2] | 0); let c = WGLOW.get(key); if (c) return c;
  c = mkCanvas(r * 2, r * 2); const x = c.getContext('2d'), C = rgbArr37('255,172,92'), A = Math.min(1, 0.85 * LK) * k;
  const g = x.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, col37(C, A)); g.addColorStop(0.2, col37(C, A * 0.66)); g.addColorStop(0.45, col37(C, A * 0.32)); g.addColorStop(0.75, col37(C, A * 0.1)); g.addColorStop(1, col37(C, 0));
  x.fillStyle = g; x.beginPath(); x.arc(r, r, r, 0, Math.PI * 2); x.fill();
  if (WGLOW.size > 40) WGLOW.clear(); WGLOW.set(key, c); return c;
}
function lightenRaw(sx, sy, r, rgb, a) {
  if (r < 1 || a <= 0 || sx < -r || sx > VW + r || sy < -r || sy > VH + r) return;
  const A = Math.min(1, a * LK), C = rgbArr37(rgb); bb37(sx - r, sy - r, sx + r, sy + r);
  const g = lctx.createRadialGradient(sx, sy, 0, sx, sy, r);
  g.addColorStop(0, col37(C, A)); g.addColorStop(0.2, col37(C, A * 0.66)); g.addColorStop(0.45, col37(C, A * 0.32)); g.addColorStop(0.75, col37(C, A * 0.1)); g.addColorStop(1, col37(C, 0));
  lctx.save(); lctx.globalCompositeOperation = 'lighten'; lctx.fillStyle = g; lctx.fillRect(sx - r, sy - r, r * 2, r * 2); lctx.restore();
}
// penumbra: the lit shape widened sideways (each ray takes the farthest hit of its k neighbours) and pushed a little
// past what it hit, so a wall's edge falls off over one or two dithered bands instead of one hard line
function penumbra37(poly, x0, y0, R, k, push) {
  const n = poly.length, d = poly.map(([x, y]) => Math.hypot(x - x0, y - y0)), out = [];
  for (let i = 0; i < n; i++) {
    let m = 0; for (let j = -k; j <= k; j++) { const v = d[(i + j + n) % n]; if (v > m) m = v; }
    if (m < R - 0.05) m += push; const a = i / n * Math.PI * 2;
    out.push([x0 + Math.cos(a) * m, y0 + Math.sin(a) * m]);
  }
  return out;
}
function visCached(z, x, y, R) {
  const k = ((x * 8) | 0) + ',' + ((y * 8) | 0) + ',' + ((R * 4) | 0); let v = L37.vis.get(k);
  if (!v) { v = visPoly(z, x, y, R, 128); if (R >= 3) v.pen = penumbra37(v, x, y, R, 2, 0.26); if (L37.vis.size > 400) L37.vis.clear(); L37.vis.set(k, v); }
  return v;
}
// a flame: a pool on the ground cut by what the flame can see, a smaller round light at the flame's own height
// (it catches the faces of walls and figures), a dithered halo, and a record for shadows, rims, embers and smoke
function fireLight37(z, x, y, R, rgb, a, fh, dx, kind, seed) {
  if (!onScreen(x, y, R * ISO_R + 40)) return;
  const f = flick37(seed), p = iso(x, y);
  shadowLight(visCached(z, x, y, R), x, y, R * (0.96 + 0.04 * f), rgb, a * f);
  lightenRaw(p.sx + dx, p.sy - fh, R * ISO_R * 0.42, rgb, a * 0.7 * f);
  L37.halos.push([p.sx + dx, p.sy - fh, kind === 'candles' ? 8 : kind === 'lantern' ? 12 : kind === 'sconce' ? 10 : 16, kind === 'lantern' ? '255,170,90' : '255,130,60', (kind === 'candles' ? 0.3 : kind === 'sconce' ? 0.38 : 0.5) * f]);
  L37.src.push({ x, y, sx: p.sx + dx, sy: p.sy - fh, gx: p.sx, gy: p.sy, R, rgb, a, kind, seed, f });
}
function addLights16(z) {
  const fl = flick37(3.3), out = isOutdoor(z), dk = out ? dayK() : 0;
  // the hero carries a little light of their own; it fills only what it can see
  if (!P.dead) {
    const nk = out ? 1 - dk : 1, Ry = heroLightR(), LF = window.__lampFoot ? window.__lampFoot() : null, lx = LF ? LF[0] : P.x + (P.face || 1) * 0.25, ly = LF ? LF[1] : P.y - (P.face || 1) * 0.25;   // v0.63: the light is the lantern's
    const RyP = (window.__poolTiles ? Math.min(Ry, window.__poolTiles() * 1.35) : Ry);   // v0.79: sized to the lantern's pool, not a wide wash
    const poly = visPoly(z, lx, ly, RyP * 1.05, 80);
    shadowLight(poly, lx, ly, RyP * 0.85, (window.__lampRGB && window.__lampRGB()) || LAMP_RGB[P.cls] || '255,230,200', (0.06 + 0.36 * nk) * (out ? 1 : 0.9) * (window.__lampK ? window.__lampK() : 1), fl);
    if (!LF) { const p = iso(P.x, P.y); addLightRaw(p.sx, p.sy - 14, 26, '255,236,210', 0.1 + 0.16 * nk); }
  }
  // lanterns: a caged candle high on an iron crook
  for (let i = 0; i < z.lanterns.length; i++) { const l = z.lanterns[i]; fireLight37(z, l.x, l.y + 0.3, 8.5, '255,150,72', 2.3 - 0.9 * dk, 44, 13, 'lantern', i * 5.1 + 1); }
  // props: braziers, sconces and candles are flames with shadows; fungus is a cold glow
  if (G.props16) for (const o of G.props16) if (o.light && onScreen(o.x, o.y, 150)) {
    const fire = o.lrgb[0] === '2' && o.kind !== 'fungus', p = iso(o.x, o.y);
    if (fire) {
      const R = o.light * GRAIN / ISO_R * (o.kind === 'candles' ? 1.6 : o.kind === 'brazier' ? 1.35 : 1.25), a = o.kind === 'brazier' ? 2.6 : o.kind === 'sconce' ? 2.0 : 1.7;
      fireLight37(z, o.x, o.y, R, o.lrgb, a * (out ? 1 - 0.5 * dk : 1), o.lz * ZT_PROP_S, 0, o.kind, o.x * 3.1 + o.y * 7.7);
    } else addLightRaw(p.sx, p.sy - o.lz * ZT_PROP_S, o.light * GRAIN, o.lrgb, 0.45 * (0.85 + 0.15 * Math.sin(G.time * 2 + o.x)));
  }
  // v0.39: candles in wall niches and on wall tops (the world painter lists the flames it drew this frame)
  if (typeof ZT_WALL_LIGHTS !== 'undefined' && !L37.noWall) { let n = 0;
    for (const e of ZT_WALL_LIGHTS.values()) {
      if (e.t !== G.time || !e.pts) continue; const p = iso(e.x, e.y);
      // the flames of one wall block share one light (they stand a few pixels apart), drawn from a cached sprite
      let mx = 0, my = 0; for (const [dx, dy] of e.pts) { mx += dx; my += dy; } mx /= e.pts.length; my /= e.pts.length;
      const sx = p.sx + mx, sy = p.sy + my, sd = e.x * 7 + e.y * 13, f = flick37(sd), r = e.pts.length > 1 ? 40 : 34;
      if (sx < -r || sx > VW + r || sy < -r || sy > VH + r) continue; if (++n > 40) break;
      const spr = wallGlow37(r, f > 0.95 ? 1 : 0.86); lctx.save(); lctx.globalCompositeOperation = 'lighten'; lctx.drawImage(spr, Math.round(sx - r), Math.round(sy + 4 - r)); lctx.restore(); bb37(sx - r, sy + 4 - r, sx + r, sy + 4 + r);
      for (const [dx, dy] of e.pts) L37.halos.push([p.sx + dx, p.sy + dy, 4, '255,190,110', 0.14 * f]);
      L37.src.push({ x: e.x + 0.5, y: e.y + 0.5, sx, sy, gx: sx, gy: sy + 20, R: 2.2, rgb: '255,172,92', a: 0.6, kind: 'wallc', seed: sd, f });
    } }
  // ground fires, pale phosphorus fire, scorches
  for (const f of G.fires) { if (!onScreen(f.x, f.y, 60)) continue; const p = iso(f.x, f.y), k = Math.min(1, f.t / 0.6), ff = flick37(f.x * 5 + f.y); addLightRaw(p.sx, p.sy - 4, (26 + f.R * 20) * GRAIN, f.pale ? '170,255,170' : '255,130,60', 1.1 * k * ff); if (k > 0.3) L37.src.push({ x: f.x, y: f.y, sx: p.sx, sy: p.sy - 6, gx: p.sx, gy: p.sy, R: 1.5 + f.R, rgb: f.pale ? '170,255,170' : '255,130,60', a: 0.8 * k, kind: 'fire', seed: f.x * 5 + f.y, f: ff }); }
  for (const f of G.efires || []) { if (!onScreen(f.x, f.y, 60)) continue; const p = iso(f.x, f.y), k = Math.min(1, f.t / 0.6); addLightRaw(p.sx, p.sy - 4, (22 + f.R * 18) * GRAIN, '255,120,50', 0.9 * k * flick37(f.y * 5 + f.x)); }
  for (const s of G.scars || []) { if (!onScreen(s.x, s.y, 30)) continue; const p = iso(s.x, s.y); addLight(p.sx, p.sy, 14 + s.R * 16, s.rgb, 0.4 * s.t / s.max, true); }
  // projectiles glow in their own colours
  for (const f of TRAILS) { const [arr, rgb, z0] = f(); if (!arr) continue; for (const s of arr) { if (!s || s.x == null || !onScreen(s.x, s.y, 20)) continue; const p = iso(s.x, s.y); addLight(p.sx, p.sy - (s.z != null ? s.z : z0), 20, rgb, 0.4); } }
  // floating motes of light: every third, faint
  if (!G.lowFx) for (let i = 0; i < parts.length; i += 3) { const q = parts[i]; if (!q.g) continue; const p = iso(q.x, q.y); addLight(p.sx, p.sy - q.z, 9, q.g, 0.22 * Math.min(1, q.t / (q.t0 || 0.4)), true); }
  for (const w of P.wisps) { const p = iso(w.x, w.y); addLight(p.sx, p.sy - w.z, 20, w.kind === 'beam' ? '255,226,160' : w.kind === 'prism' ? '225,200,255' : '160,215,255', 0.42, true); }
  const g = G.golem; if (g && g.ramp > 0) { const p = iso(g.x, g.y); addLight(p.sx, p.sy - 12, 70, '235,240,255', 0.55); }
  for (const [src, ph, h] of [[G.golem, G.golem && G.golem.phos, 16], [P, P.shell && P.shell.phos, 12]]) if (src && ph && ph.end) { const a = iso(src.x, src.y), b = iso(ph.end.x, ph.end.y); lineLight(a.sx, a.sy - h, b.sx, b.sy - 5, 26, '150,255,150', 0.8); addLight(b.sx, b.sy - 5, 40, '210,255,200', 0.7); }
  for (const pl of G.pools || []) { if (!onScreen(pl.x, pl.y, 30)) continue; const p = iso(pl.x, pl.y); addLight(p.sx, p.sy, 10 + (pl.r || 0.4) * 22, '200,40,50', 0.2, true); }
  for (const c of G.clouds || []) { if (!onScreen(c.x, c.y, 40)) continue; const p = iso(c.x, c.y); addLight(p.sx, p.sy - 4, (c.R || 1) * 22, c.kind === 'frost' ? '150,200,255' : c.kind === 'haze' ? '220,200,255' : '170,110,230', 0.28, true); }
  for (const s of G.mmiss || []) { const p = iso(s.x, s.y); addLight(p.sx, p.sy - s.z, 30, '170,215,255', 0.65); }
  // deep places: pale cold light falling through cracks in the vault pools on the floor
  if (!out) for (const s of shaftTiles37(z)) { const p = iso(s.x + 0.5, s.y + 0.5); addLightRaw(p.sx, p.sy, 34, '170,185,215', 0.55 * s.pul); }
}
// ------------------------------------------------------------------- quantise and lay the light
function bb37(x0, y0, x1, y1) { const b = L37.bb; if (x0 < b[0]) b[0] = x0; if (y0 < b[1]) b[1] = y0; if (x1 > b[2]) b[2] = x1; if (y1 > b[3]) b[3] = y1; }
function quantLight37() {
  const t0 = performance.now();
  const A = L37.amb, Ai = Math.max(A[0], A[1], A[2]) * LK, step = L37.step, inv = 1 / step, lo = L37.lo, sc = L37.sc, cap = L37.cap;
  // only the part of the map a light touched needs cutting into bands; the rest is the flat ambient
  const bb = L37.bb, X0 = Math.max(0, Math.floor(bb[0])), Y0 = Math.max(0, Math.floor(bb[1])), X1 = Math.min(VW, Math.ceil(bb[2])), Y1 = Math.min(VH, Math.ceil(bb[3]));
  if (X1 <= X0 || Y1 <= Y0) { L37.img = null; return; }
  const bw = X1 - X0, im = lctx.getImageData(X0, Y0, bw, Y1 - Y0), d = im.data, B = BAY4;
  L37.ox = X0; L37.oy = Y0; L37.bw = bw; L37.bh = Y1 - Y0;
  // a table per (intensity, dither cell): the factor that moves a texel onto its band
  const key = (Ai | 0) + '|' + step + '|' + lo + '|' + sc + '|' + cap;
  if (L37.ktKey !== key) {
    const KT = L37.kt || (L37.kt = new Float32Array(256 * 16)); L37.ktKey = key;
    for (let I = 0; I < 256; I++) for (let c = 0; c < 16; c++) {
      const e = I - Ai; if (e <= 0.5 || I === 0) { KT[I * 16 + c] = 1; continue; }
      const q = e * inv; let lv = q | 0; if ((q - lv - lo) * sc > B[c]) lv++;
      let I2 = Ai + lv * step; if (I2 > cap) I2 = cap; KT[I * 16 + c] = I2 / I;
    }
  }
  const KT = L37.kt, bh = Y1 - Y0, AiP = Ai + 0.5, a0 = A[0] * LK, a1 = A[1] * LK, a2 = A[2] * LK, XS = L37.xs;
  // the excess over the ambient goes to a second map: laid on additively, it lets a flame warm even black stone
  if (!L37.eim || L37.eim.width !== bw || L37.eim.height !== bh) L37.eim = ectx.createImageData(bw, bh); else L37.eim.data.fill(0);
  const ed = L37.eim.data;
  let o = 0;
  for (let y = Y0; y < Y1; y++) {
    const row = (y & 3) << 2;
    for (let x = X0; x < X1; x++, o += 4) {
      const r = d[o], g = d[o + 1], b = d[o + 2];
      let I = r > g ? r : g; if (b > I) I = b;
      if (I <= AiP) continue;
      const k = KT[(I << 4) + row + (x & 3)], r2 = r * k, g2 = g * k, b2 = b * k;
      d[o] = r2; d[o + 1] = g2; d[o + 2] = b2;
      ed[o] = (r2 - a0) * XS; ed[o + 1] = (g2 - a1) * XS; ed[o + 2] = (b2 - a2) * XS; ed[o + 3] = 255;
    }
  }
  lctx.putImageData(im, X0, Y0); L37.img = im;
  ectx.clearRect(0, 0, VW, VH); ectx.putImageData(L37.eim, X0, Y0);
  L37.t.q += performance.now() - t0; L37.t.n++;
}
function applyLights() {
  quantLight37();
  ctx.save();
  ctx.imageSmoothingEnabled = false; ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(LMAP, 0, 0, VW, VH, 0, 0, W, H);
  // the map holds half the light: double the lit scene, so a flame can rake a surface brighter than its paint
  ctx.globalCompositeOperation = 'lighter'; ctx.setTransform(1, 0, 0, 1, 0, 0); _drawImage.call(ctx, cv, 0, 0);
  ctx.restore();
  if (L37.img) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = L37.xa; ctx.drawImage(EXC, 0, 0, VW, VH, 0, 0, W, H); ctx.restore(); }
  ctx.imageSmoothingEnabled = false;
  if (!G.lowFx) { drawHalos37(); try { heroRim37(); } catch (e) { reportError(e); } }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
// ------------------------------------------------------------------- dithered sprites: halos, puffs, shafts
const DGLOW = new Map();
// a round glow, its alpha stepped into four levels, the steps dithered: flames glow in pixel rings
function ditherGlow(r, rgb) {
  r = Math.max(2, Math.round(r / 2) * 2); const key = r + '|' + rgb; let c = DGLOW.get(key); if (c) return c;
  const n = r * 2 + 1; c = mkCanvas(n, n); const x = c.getContext('2d'), img = x.createImageData(n, n), D = img.data, C = rgb.split(',').map(Number);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const dd = Math.hypot(i - r, j - r) / r; if (dd >= 1) continue;
    const v = (1 - dd) * (1 - dd) * 4, lv = (v | 0) + ((v - (v | 0) - 0.25) * 2 > BAY4[((j & 3) << 2) + (i & 3)] ? 1 : 0); if (!lv) continue;
    const o = (j * n + i) * 4; D[o] = C[0]; D[o + 1] = C[1]; D[o + 2] = C[2]; D[o + 3] = Math.min(255, lv * 60);
  }
  x.putImageData(img, 0, 0); if (DGLOW.size > 200) DGLOW.clear(); DGLOW.set(key, c); return c;
}
function drawHalos37() {
  ctx.globalCompositeOperation = 'lighter';
  for (const [sx, sy, r, rgb, a] of L37.halos) { if (r < 2) continue; const g = ditherGlow(Math.min(r, 40), rgb); ctx.globalAlpha = Math.min(1, a); ctx.drawImage(g, Math.round(sx) - (g.width >> 1), Math.round(sy) - (g.height >> 1)); }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
// ------------------------------------------------------------------- the hero: record how it is drawn, rim it by the nearest flame
let RIMC = null, rimx = null;
function hookHero37() {
  if (drawSpr._l37) return;
  const f = drawSpr;
  drawSpr = function (s, x, y) {
    if (!(x === P.x && y === P.y)) return f.apply(this, arguments);
    const rec = [], od = ctx.drawImage;
    ctx.drawImage = function () { if (ctx.globalCompositeOperation === 'source-over' && ctx.globalAlpha > 0.8 && arguments[0] && arguments[0].width > 8) rec.push({ a: Array.prototype.slice.call(arguments), m: ctx.getTransform() }); return od.apply(this, arguments); };
    try { return f.apply(this, arguments); } finally { ctx.drawImage = od; L37.heroRec = rec; }
  };
  drawSpr._l37 = true;
}
function heroRim37() {
  const rec = L37.heroRec; L37.heroRec = []; if (!rec.length || P.dead) return;
  // the nearest flame that reaches the hero; failing that, the cold of the sky or the vault from the upper left
  const hp = iso(P.x, P.y); let best = null, bd = 1e9;
  for (const s of L37.src) { const d = Math.hypot(s.x - P.x, s.y - P.y); if (d < s.R * 1.05 && d / s.R < bd) { bd = d / s.R; best = s; } }
  let dx, dy, rgb, a;
  if (best) { dx = best.sx - hp.sx; dy = (best.sy - (hp.sy - 20)); rgb = best.rgb; a = Math.min(0.85, 0.95 * (1 - bd * 0.8) * best.f); }
  else { const out = isOutdoor(G.zone), k = out ? dayK() : 0; if (k > 0.6) return; dx = -1; dy = -0.8; rgb = out ? '150,170,225' : '140,150,190'; a = 0.32 * (1 - k); }
  const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
  const rs = RS / 2, ox = Math.round(dx * rs), oy = Math.round(dy * rs); if (!ox && !oy) return;
  // bounding box of the recorded draws, in device pixels
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const r of rec) {
    const a2 = r.a, n = a2.length, img = a2[0]; let X, Y, Wd, Ht;
    if (n === 3) { X = a2[1]; Y = a2[2]; Wd = img.width; Ht = img.height; } else if (n === 5) { X = a2[1]; Y = a2[2]; Wd = a2[3]; Ht = a2[4]; } else { X = a2[5]; Y = a2[6]; Wd = a2[7]; Ht = a2[8]; }
    for (const [u, v] of [[X, Y], [X + Wd, Y], [X, Y + Ht], [X + Wd, Y + Ht]]) { const m = r.m, px = m.a * u + m.c * v + m.e, py = m.b * u + m.d * v + m.f; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py; }
  }
  x0 = Math.floor(x0) - 4; y0 = Math.floor(y0) - 4; x1 = Math.ceil(x1) + 4; y1 = Math.ceil(y1) + 4;
  const bw = x1 - x0, bh = y1 - y0; if (bw <= 0 || bh <= 0 || bw > 1200 || bh > 1200) return;
  if (!RIMC || RIMC.width < bw || RIMC.height < bh) { RIMC = mkCanvas(Math.max(bw, RIMC ? RIMC.width : 0), Math.max(bh, RIMC ? RIMC.height : 0)); rimx = RIMC.getContext('2d'); }
  const g = rimx; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, bw, bh); g.imageSmoothingEnabled = false;
  const draw = (sx, sy) => { for (const r of rec) { const m = r.m; g.setTransform(m.a, m.b, m.c, m.d, m.e - x0 + sx, m.f - y0 + sy); ctx.drawImage.apply(g, r.a); } };
  draw(0, 0);
  g.globalCompositeOperation = 'destination-out'; draw(-ox, -oy);
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = `rgb(${rgb})`; g.fillRect(0, 0, bw, bh);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a;
  _drawImage.call(ctx, RIMC, 0, 0, bw, bh, x0, y0, bw, bh);
  ctx.restore();
}
// ------------------------------------------------------------------- figures throw shadows away from the flames
// Painted on the ground (before walls and figures are drawn), into a world-grain canvas, and dithered in two steps.
const SHC = mkCanvas(VW, VH), shx = SHC.getContext('2d', { willReadFrequently: true });
function figureShadows37() {
  const z = G.zone; if (!z || G.lowFx || !L37.src.length) return;
  const figs = [];
  if (!P.dead) figs.push([P.x, P.y, 1]);
  for (const m of z.monsters) if (!m.dead && !m.hidden && onScreen(m.x, m.y, 60)) { const fr = typeof M32F !== 'undefined' && M32F[m.type]; figs.push([m.x, m.y, fr ? Math.max(1, Math.min(3.6, fr[1] / 46)) : m.rank === 'boss' ? 1.9 : 1, fr ? Math.max(1, Math.min(3, fr[0] / 50)) : 1]); }
  if (G.golem && !G.golem.dead) figs.push([G.golem.x, G.golem.y, 1.6]);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, any = false;
  for (const s of L37.src) {
    if ((s.kind === 'fire' && s.a < 0.5) || s.kind === 'wallc') continue;
    for (const [fx, fy, sc, wk = sc] of figs) {
      const d = Math.hypot(fx - s.x, fy - s.y); if (d < 0.35 || d > s.R * 0.95) continue;
      const fp = iso(fx, fy), lp = iso(s.x, s.y); let vx = fp.sx - lp.sx, vy = fp.sy - lp.sy; const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
      const len = Math.min(150, Math.min(72, Math.max(20, vl * (s.kind === 'candles' || s.kind === 'fire' ? 1.6 : 1.25))) * sc), w0 = 7 * Math.min(wk, 2.4), nx = -vy, ny = vx;
      const al = Math.min(1, 1.1 * Math.pow(1 - d / (s.R * 0.95), 0.5) * Math.min(1, s.a));
      if (!any) { shx.setTransform(1, 0, 0, 1, 0, 0); shx.globalCompositeOperation = 'source-over'; any = true; }
      const bx = fp.sx, by = fp.sy, ex = bx + vx * len, ey = by + vy * len * 0.9;
      const gr = shx.createLinearGradient(bx, by, ex, ey); gr.addColorStop(0, `rgba(0,0,0,${al})`); gr.addColorStop(0.7, `rgba(0,0,0,${al * 0.7})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      shx.fillStyle = gr; shx.beginPath();
      shx.moveTo(bx + nx * w0 * 0.8 - vx * 1.5, by + ny * w0 * 0.5 - vy * 1.5); shx.lineTo(ex + nx * w0 * 1.25, ey + ny * w0 * 0.8); shx.lineTo(ex - nx * w0 * 1.25, ey - ny * w0 * 0.8); shx.lineTo(bx - nx * w0 * 0.8 - vx * 1.5, by - ny * w0 * 0.5 - vy * 1.5);
      shx.closePath(); shx.fill();
      x0 = Math.min(x0, bx - w0 * 1.3 - 3, ex - w0 * 1.3 - 3); x1 = Math.max(x1, bx + w0 * 1.3 + 3, ex + w0 * 1.3 + 3); y0 = Math.min(y0, by - w0 - 3, ey - w0 - 3); y1 = Math.max(y1, by + w0 + 3, ey + w0 + 3);
    }
  }
  if (!any) return;
  x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(VW, Math.ceil(x1)); y1 = Math.min(VH, Math.ceil(y1));
  const bw = x1 - x0, bh = y1 - y0; if (bw <= 0 || bh <= 0) { shx.clearRect(0, 0, VW, VH); return; }
  const im = shx.getImageData(x0, y0, bw, bh), D = im.data;
  for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
    const o = (j * bw + i) * 4, v = D[o + 3] / 255 * 2.4; if (!v) continue;
    const lv = Math.min(2, (v | 0) + ((v - (v | 0) - 0.3) * 2.5 > BAY4[(((j + y0) & 3) << 2) + ((i + x0) & 3)] ? 1 : 0));
    D[o] = 8; D[o + 1] = 6; D[o + 2] = 14; D[o + 3] = lv === 0 ? 0 : lv === 1 ? 120 : 200;
  }
  shx.putImageData(im, x0, y0);
  ctx.drawImage(SHC, x0, y0, bw, bh, x0, y0, bw, bh);
  shx.clearRect(x0, y0, bw, bh);
}
{ const _ds37 = drawScars; drawScars = function () { _ds37(); try { figureShadows37(); } catch (e) { reportError(e); } }; }

// =================================================================== atmosphere: what hangs in the air of each place
// The moor sheds ash on the wind, the fen drizzles and its fireflies drift over the water, the underground is full
// of slow dust, and shafts of pale light fall through cracks in the vaults. Every flame breathes embers and smoke.
const ATM = { motes: [], t: 0, zone: null, emb: [], smk: [] };
function atmosKind(z) { return z.theme === 'fen' ? 'fen' : (z.theme === 'moor' || !z.theme) ? 'moor' : 'deep'; }
function updateAtmos(dt) {
  const z = G.zone; if (!z) return;
  if (ATM.zone !== z.id) { ATM.zone = z.id; ATM.motes = []; ATM.emb = []; ATM.smk = []; }
  const kind = atmosKind(z), want = kind === 'fen' ? 60 : kind === 'moor' ? 22 : 18;   // v0.63 (user): fewer, subtler
  while (ATM.motes.length < want) ATM.motes.push(newMote(kind, true));
  const wind = Math.sin(G.time * 0.3) * 6;
  for (const m of ATM.motes) {
    m.t += dt; m.x += (m.vx + (m.kind === 'ash' ? wind : 0)) * dt; m.y += m.vy * dt;
    if (m.kind === 'ash') { m.x += Math.sin(G.time * 1.1 + m.s) * 5 * dt; }
    if (m.kind === 'fly') { m.x += Math.sin(G.time * 1.3 + m.s) * 6 * dt; m.y += Math.cos(G.time * 1.1 + m.s * 2) * 4 * dt; }
    if (m.kind === 'dust') { m.x += Math.sin(G.time * 0.4 + m.s) * 2 * dt; }
  }
  // motes live in screen space but are carried by the camera, so the world seems to move through them
  const dx = (ATM.cx == null ? 0 : cam.x - ATM.cx), dy = (ATM.cy == null ? 0 : cam.y - ATM.cy); ATM.cx = cam.x; ATM.cy = cam.y;
  for (const m of ATM.motes) { m.x -= dx * m.par; m.y -= dy * m.par; }
  for (const e of ATM.emb) { e.x -= dx; e.y -= dy; }
  for (const s of ATM.smk) { s.x -= dx; s.y -= dy; }
  ATM.motes = ATM.motes.filter(m => m.x > -20 && m.x < VW + 20 && m.y > -20 && m.y < VH + 10 && m.t < m.life);
  // embers and smoke from every flame on screen
  if (!G.lowFx) {
    const w2 = Math.sin(G.time * 0.37) * 4 + 3;
    for (const s of L37.src) {
      const er = s.kind === 'brazier' ? 7 : s.kind === 'fire' ? 5 : s.kind === 'sconce' ? 3 : s.kind === 'lantern' ? 0.8 : 0.5;
      if (Math.random() < er * dt && ATM.emb.length < 160) ATM.emb.push({ x: s.sx + (Math.random() - 0.5) * (s.kind === 'brazier' ? 8 : 3), y: s.sy - 2, vx: (Math.random() - 0.5) * 8, vy: -(14 + Math.random() * 22), t: 0, life: 0.9 + Math.random() * (s.kind === 'brazier' || s.kind === 'fire' ? 2.6 : 1.2), s: Math.random() * 6.28 });
      const sr = s.kind === 'brazier' ? 7 : s.kind === 'fire' ? 3.5 : s.kind === 'sconce' ? 2.4 : s.kind === 'candles' ? 0.8 : 0;
      if (Math.random() < sr * dt && ATM.smk.length < 110) ATM.smk.push({ x: s.sx + (Math.random() - 0.5) * 3, y: s.sy - 5, vx: w2 * 0.5 + (Math.random() - 0.5) * 3, vy: -(7 + Math.random() * 6), t: 0, life: (s.kind === 'brazier' ? 4.5 : 3) + Math.random() * 3, r0: s.kind === 'candles' ? 1.5 : s.kind === 'brazier' ? 3.5 : 2.5, s: Math.random() * 6.28, src: s.kind });
    }
    for (const e of ATM.emb) { e.t += dt; e.vy *= 1 - 0.35 * dt; e.x += (e.vx + Math.sin(G.time * 3 + e.s) * 10) * dt; e.y += e.vy * dt; }
    for (const s of ATM.smk) { s.t += dt; s.x += (s.vx + Math.sin(G.time * 0.8 + s.s) * 3) * dt; s.y += s.vy * dt; s.vx += w2 * 0.15 * dt; }
    ATM.emb = ATM.emb.filter(e => e.t < e.life); ATM.smk = ATM.smk.filter(s => s.t < s.life);
  }
}
function newMote(kind, anywhere) {
  const s = Math.random() * 100;
  if (kind === 'moor') return { kind: 'ash', x: Math.random() * VW, y: anywhere ? Math.random() * VH : -5, vx: 4 + Math.random() * 6, vy: 6 + Math.random() * 9, t: 0, life: 20, s, par: 0.7 + (s % 10) / 12, big: s > 78 };
  if (kind === 'fen') return Math.random() < 0.75
    ? { kind: 'rain', x: Math.random() * (VW + 60) - 30, y: anywhere ? Math.random() * VH : -8, vx: -18, vy: 150 + Math.random() * 40, t: 0, life: 3, s, par: 1.2 }
    : { kind: 'fly', x: Math.random() * VW, y: 40 + Math.random() * (VH - 60), vx: 0, vy: 0, t: 0, life: 6 + Math.random() * 8, s, par: 1 };
  return { kind: 'dust', x: Math.random() * VW, y: anywhere ? Math.random() * VH : -3, vx: 0, vy: 1.5 + Math.random() * 2.5, t: 0, life: 40, s, par: 1 };
}
// the light at a point of the screen, 0..2, read back from the quantised map (for tinting what drifts in the air)
function lightAt37(x, y) {
  x |= 0; y |= 0; if (x < 0 || y < 0 || x >= VW || y >= VH) return [L37.amb[0] / 255, L37.amb[1] / 255, L37.amb[2] / 255];
  const A = L37.amb; if (!L37.img || x < L37.ox || y < L37.oy || x >= L37.ox + L37.bw || y >= L37.oy + L37.bh) return [A[0] / 255, A[1] / 255, A[2] / 255]; const d = L37.img.data, o = ((y - L37.oy) * L37.bw + x - L37.ox) * 4; return [d[o] / 255 / LK, d[o + 1] / 255 / LK, d[o + 2] / 255 / LK];
}
const EMB_COL = ['#fff0b8', '#ffc860', '#ff9038', '#e0501c', '#8a2a14'];
function drawAtmos() {
  const z = G.zone; if (!z) return;
  const kind = atmosKind(z), out = isOutdoor(z), dk = out ? dayK() : 0;
  if (kind === 'deep' && !G.lowFx) drawShafts(z);
  // ambient light level, to dim what drifts in the dark
  const A = L37.amb, amb = Math.max(A[0], A[1], A[2]) / 255;
  for (const m of ATM.motes) {
    const x = Math.round(m.x), y = Math.round(m.y), fade = Math.min(1, m.t / 0.6, (m.life - m.t) / 0.8);
    if (m.kind === 'ash') {
      // v0.63 (user: 'a cheap screen overlay'): no orange flecks; ash is only seen where light falls on it
      const Lm = lightAt37(x, y), lm = (Lm[0] + Lm[1] + Lm[2]) / 3; if (lm < 0.5) continue;
      ctx.globalAlpha = fade * Math.min(0.45, (lm - 0.5) * 0.7);
      ctx.fillStyle = m.s < 40 ? '#8a8690' : '#b4b0b8'; ctx.fillRect(x, y, 1, 1);
      if (m.big) { ctx.fillStyle = '#6e6a74'; ctx.fillRect(x + 1, y, 1, 1); if (Math.sin(G.time * 4 + m.s) > 0.3) ctx.fillRect(x, y + 1, 1, 1); }
    }
    else if (m.kind === 'rain') { ctx.fillStyle = `rgba(170,190,210,${0.18 + 0.12 * amb})`; ctx.fillRect(x, y, 1, 2); ctx.fillRect(x - 1, y + 2, 1, 2); if (m.y > HUD_Y - 40 && Math.random() < 0.02) parts.push({ ring: true, x: screenToWorld(x, y).x, y: screenToWorld(x, y).y, r: 0.02, max: 0.12, t: 0.25, col: 'rgba(170,190,210,0.4)' }); }
    else if (m.kind === 'fly') { const b = 0.5 + 0.5 * Math.sin(G.time * 3 + m.s); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * b * fade * (1.2 - dk * 0.6); const g = ditherGlow(4, '150,255,110'); ctx.drawImage(g, x - 4, y - 4); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(220,255,180,${b * fade})`; ctx.fillRect(x, y, 1, 1); }
    else { ctx.globalAlpha = 0.3 * fade * (0.6 + 0.4 * Math.sin(G.time * 2 + m.s)); ctx.fillStyle = '#d8d0c0'; ctx.fillRect(x, y, 1, 1); }
    ctx.globalAlpha = 1;
  }
  if (!G.lowFx) {
    // smoke: dithered grey puffs that swell and thin as they rise, warmed where the flame still lights them
    for (const s of ATM.smk) {
      const k = s.t / s.life, r = s.r0 + k * (s.src === 'brazier' ? 13 : 9), a = (s.src === 'candles' ? 0.2 : s.src === 'brazier' ? 0.5 : 0.36) * Math.min(1, s.t / 0.7) * (1 - k * k);
      const L = lightAt37(s.x, s.y), lr = Math.min(1.05, L[0]), lg = Math.min(1.0, L[1]), lb = Math.min(1.0, L[2]);
      const rgb = `${Math.min(255, 96 * lr + 22) | 0},${Math.min(255, 90 * lg + 20) | 0},${Math.min(255, 92 * lb + 24) | 0}`;
      ctx.globalAlpha = a; const g = ditherPuff37(Math.round(r), rgb); ctx.drawImage(g, Math.round(s.x - g.width / 2), Math.round(s.y - g.height / 2));
    }
    ctx.globalAlpha = 1;
    // embers: bright sparks cooling from white-gold to red as they climb
    for (const e of ATM.emb) {
      const k = e.t / e.life, ci = Math.min(4, (k * 5) | 0), bl = Math.sin(G.time * 23 + e.s * 9) > -0.6;
      if (!bl) continue;
      ctx.fillStyle = EMB_COL[ci]; ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
      if (ci < 2) { ctx.globalAlpha = 0.5; ctx.fillRect(Math.round(e.x), Math.round(e.y) + 1, 1, 1); ctx.globalAlpha = 1; }
    }
  }
}
const DPUFF = new Map();
function ditherPuff37(r, rgb) {
  r = Math.max(1, Math.min(14, r)); const key = r + '|' + rgb; let c = DPUFF.get(key); if (c) return c;
  const n = r * 2 + 1; c = mkCanvas(n, n); const x = c.getContext('2d'), img = x.createImageData(n, n), D = img.data, C = rgb.split(',').map(Number);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const dd = Math.hypot(i - r, (j - r) * 1.15) / (r + 0.5); if (dd >= 1) continue;
    const v = (1 - dd * dd) * 2 + (hash(i * 3 + r, j * 5) - 0.5) * 0.5, lv = Math.max(0, Math.min(2, (v | 0) + ((v - (v | 0) - 0.3) * 2.5 > BAY4[((j & 3) << 2) + (i & 3)] ? 1 : 0))); if (!lv) continue;
    const o = (j * n + i) * 4, sh = j < r ? 1.08 : 0.92; D[o] = C[0] * sh; D[o + 1] = C[1] * sh; D[o + 2] = C[2] * sh; D[o + 3] = lv === 1 ? 130 : 255;
  }
  x.putImageData(img, 0, 0); if (DPUFF.size > 300) DPUFF.clear(); DPUFF.set(key, c); return c;
}
// haze: a long strip of dithered density, tiled across the view and drifting with the camera (parallax)
const DHAZE = new Map();
function hazeStrip37(rgb, h) {
  const key = rgb + '|' + h; let c = DHAZE.get(key); if (c) return c;
  const w = 256; c = mkCanvas(w, h); const x = c.getContext('2d'), img = x.createImageData(w, h), D = img.data, C = rgb.split(',').map(Number);
  const vn = (u, v) => { const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, s = t => t * t * (3 - 2 * t), h00 = hash((i % 16 + 16) % 16, j), h10 = hash(((i + 1) % 16 + 16) % 16, j), h01 = hash((i % 16 + 16) % 16, j + 1), h11 = hash(((i + 1) % 16 + 16) % 16, j + 1); return (h00 + (h10 - h00) * s(fu)) * (1 - s(fv)) + (h01 + (h11 - h01) * s(fu)) * s(fv); };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const env = Math.sin(j / h * Math.PI), n = vn(i / 16, j / 10) * 0.65 + vn(i / 6, j / 4 + 7) * 0.35;
    const v = Math.max(0, env * (n * 2.4 - 1.05)) * 3.2; const lv = Math.min(3, (v | 0) + ((v - (v | 0) - 0.3) * 2.5 > BAY4[((j & 3) << 2) + (i & 3)] ? 1 : 0)); if (!lv) continue;
    const o = (j * w + i) * 4; D[o] = C[0]; D[o + 1] = C[1]; D[o + 2] = C[2]; D[o + 3] = lv * 70;
  }
  x.putImageData(img, 0, 0); DHAZE.set(key, c); return c;
}
function drawHaze37(a, rgb, h, n = 3, mode = 'screen') {
  if (G.lowFx || a <= 0.01) return;
  const strip = hazeStrip37(rgb, h); ctx.globalCompositeOperation = mode;
  for (let i = 0; i < n; i++) {
    const par = 0.35 + i * 0.25, y = Math.round(VH * (0.28 + i * 0.26) - (cam.y * par) % 40 + Math.sin(G.time * 0.1 + i) * 6), x0 = -Math.round(((cam.x * par + G.time * (3 + i * 2)) % 256 + 256) % 256);
    ctx.globalAlpha = a * (0.7 + 0.3 * Math.sin(G.time * 0.13 + i * 2));
    for (let x = x0; x < VW; x += 256) ctx.drawImage(strip, x, y - (h >> 1));
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
// pale shafts of light through cracks in the vault, anchored to certain floor tiles: dithered, never smooth
function shaftTiles37(z) {
  const v = visibleRange(3), out = [];
  for (let y = v.y0; y <= v.y1; y++) for (let x = v.x0; x <= v.x1; x++) {
    if (hash(x * 13 + 7, y * 17 + 3) < 0.9955 || z.get(x, y) !== T.FLOOR) continue;
    out.push({ x, y, pul: 0.75 + 0.25 * Math.sin(G.time * 0.5 + x) });
  }
  return out;
}
let SHAFT37 = null;
function shaftSprite37() {
  if (SHAFT37) return SHAFT37;
  const w = 64, h = 150, c = mkCanvas(w, h), x = c.getContext('2d'), img = x.createImageData(w, h), D = img.data;
  for (let j = 0; j < h; j++) {
    const k = j / h, cx = 12 + (1 - k) * 36, hw = 5 + k * 9 + (1 - k) * 4;
    for (let i = 0; i < w; i++) {
      const u = Math.abs(i - cx) / hw; if (u >= 1) continue;
      const streak = 0.75 + 0.25 * Math.sin(i * 0.9 + j * 0.25);
      const v = (1 - u * u) * Math.pow(k, 1.3) * streak * 3; const lv = Math.min(3, (v | 0) + ((v - (v | 0) - 0.3) * 2.5 > BAY4[((j & 3) << 2) + (i & 3)] ? 1 : 0)); if (!lv) continue;
      const o = (j * w + i) * 4; D[o] = 150; D[o + 1] = 164; D[o + 2] = 196; D[o + 3] = lv * 34;
    }
  }
  x.putImageData(img, 0, 0); SHAFT37 = c; return c;
}
function drawShafts(z) {
  const spr = shaftSprite37();
  ctx.globalCompositeOperation = 'screen';
  for (const s of shaftTiles37(z)) {
    const p = iso(s.x + 0.5, s.y + 0.5);
    ctx.globalAlpha = 0.6 * s.pul; ctx.drawImage(spr, Math.round(p.sx - 12), Math.round(p.sy - spr.height + 4));
    for (let i = 0; i < 4; i++) { const k = (G.time * 0.08 + i * 0.27 + s.x * 0.1) % 1; ctx.globalAlpha = 0.6 * Math.sin(k * Math.PI); ctx.fillStyle = '#eef0ff'; ctx.fillRect(Math.round(p.sx + 36 - k * 34 + Math.sin(i * 5) * 4), Math.round(p.sy - 146 + k * 140), 1, 1); }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

// ------------------------------------------------------------------- v0.23: shadows
// Rays march out over the tile grid from a light until they hit something tall; the ring of hit points is the lit
// region. The light is poured into the light map through that shape, so what stands behind a wall, a tree or a
// tomb stays in shadow, and shadows swing as the light moves.
function visPoly(z, x0, y0, R, n = 96) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a); let d = 0.3, hit = R;
    for (; d < R; d += 0.2) { const tx = Math.floor(x0 + dx * d), ty = Math.floor(y0 + dy * d), t = z.get(tx, ty); if (t == null || TALL[t]) { hit = d + 0.35; break; } }
    pts.push([x0 + dx * hit, y0 + dy * hit]);
  }
  return pts;
}
// the pool itself: a squashed falloff with a hot core and a long tail (the bands and dither come later)
function shadowLight(poly, x0, y0, R, rgb, a, fl = 1) {
  const c = iso(x0, y0), rr = R * ISO_R * fl;
  if (c.sx < -rr || c.sx > VW + rr || c.sy < -rr || c.sy > VH + rr) return;
  const A = a * LK, C = rgbArr37(rgb); bb37(c.sx - rr, c.sy - rr * 0.5, c.sx + rr, c.sy + rr * 0.5);
  const passes = poly.pen && !L37.noPen ? [[poly.pen, 0.5], [poly, 1]] : [[poly, 1]];
  for (const [pl, k] of passes) {
    lctx.save(); lctx.globalCompositeOperation = 'lighten'; lctx.beginPath();
    pl.forEach(([x, y], i) => { const q = iso(x, y); if (i) lctx.lineTo(q.sx, q.sy); else lctx.moveTo(q.sx, q.sy); });
    lctx.closePath(); lctx.clip();
    lctx.translate(c.sx, c.sy); lctx.scale(1, 0.5);
    const g = lctx.createRadialGradient(0, 0, 0, 0, 0, rr);
    for (const [t, v] of FALL37) g.addColorStop(t, col37(C, A * v * k));
    lctx.fillStyle = g; lctx.fillRect(-rr, -rr, rr * 2, rr * 2);
    lctx.restore();
  }
}
try { window.__l37 = { LMAP, L37, SHC, fs: () => figureShadows37() }; } catch (e) { }
