// zz_zz_shadow70.js — the user (2026-09-29): "The hero should cast a shadow. Shadows bring life to a world just like
// light does. Cinematography is key."
// The hero throws a true shadow: their own silhouette, this frame of the walk, laid flat on the ground and stretched away
// from whatever lights them.
//  * The lantern at the hip is low and close, so its shadow is long and sways as the lantern swings. When the hero faces
//    us the shadow falls behind them, up the screen; when they turn away it stretches toward us.
//  * Braziers, lamp posts and campfires within reach throw their own silhouettes; stand between two flames and you have
//    two shadows, the nearer one darker.
//  * By day the sun throws one soft shadow that turns and lengthens with the hour: long at morning and evening, short
//    at noon.
// The shadow is pixel-grain and dithered like the world's other shadows, darkest at the feet (the contact) and fading
// toward the tip (the penumbra widens with distance).
(function () {
  if (typeof drawHero !== 'function' || typeof drawScars !== 'function') return;
  const REC = { fr: null, face: 1, on: false, t: -1 };
  const _hf = heroFrame;
  heroFrame = function (cls, pose, ph, view) {
    const fr = _hf.apply(this, arguments);
    if (REC.on && fr && cls === P.cls) { REC.fr = fr; REC.t = G.time; }
    return fr;
  };
  const _dh = drawHero;
  drawHero = function (s, x, y, face) { REC.on = true; REC.face = face; try { return _dh.apply(this, arguments); } finally { REC.on = false; } };
  // the hero's own wedge from y_light21 is replaced by the silhouette (monsters keep theirs)
  if (typeof figureShadows37 === 'function') {
    const _fs = figureShadows37;
    figureShadows37 = function () { const d = P.dead; P.dead = true; try { return _fs.apply(this, arguments); } finally { P.dead = d; } };
  }
  // silhouettes, cached per frame
  const SIL = new WeakMap();
  function sil(fr, flip) {
    let s = SIL.get(fr); if (!s) { s = {}; SIL.set(fr, s); }
    const k = flip ? 'f' : 'c'; if (s[k]) return s[k];
    const src = flip ? fr.f : fr.c; if (!src) return null;
    const q = mkCanvas(src.width, src.height), x = q.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#000'; x.fillRect(0, 0, q.width, q.height);
    return (s[k] = q);
  }
  const A = TW / 2, B = TH / 2, PPW = Math.SQRT2 * A;
  const scr = (wx, wy) => ({ x: (wx - wy) * A, y: (wx + wy) * B });          // a world vector on screen
  const wld = (sx, sy) => { const u = sx / A, v = sy / B; return { x: (u + v) / 2, y: (v - u) / 2 }; };
  let SC = null, sx2 = null, ACC = null, last = { w: 0, h: 0 };
  // cast one silhouette from the feet along the world direction (dx, dy), `len` times the figure's height, at strength al
  function cast(fr, flip, fx, fy, dx, dy, len, al, box) {
    const n = Math.hypot(dx, dy) || 1; dx /= n; dy /= n;
    const Av = scr(dx, dy), Bv = scr(-dy, dx);
    const as = { x: Av.x / PPW * len, y: Av.y / PPW * len }, bs = { x: Bv.x / PPW, y: Bv.y / PPW };
    if (bs.x < 0) { bs.x = -bs.x; bs.y = -bs.y; }
    const im = sil(fr, flip); if (!im) return;
    const ox = flip ? fr.w - fr.ox : fr.ox, oy = fr.oy;
    sx2.setTransform(bs.x, bs.y, -as.x, -as.y, fx - ox * bs.x + oy * as.x, fy - ox * bs.y + oy * as.y);
    sx2.globalCompositeOperation = 'source-over'; sx2.drawImage(im, 0, 0);
    sx2.setTransform(1, 0, 0, 1, 0, 0);
    // the reach of this shadow on screen, for the fade and the dirty box
    const H = fr.oy, tx = fx + as.x * H, ty = fy + as.y * H, w = fr.w * 0.6 + 4;
    const x0 = Math.max(0, Math.floor(Math.min(fx, tx) - w)), x1 = Math.min(SC.width, Math.ceil(Math.max(fx, tx) + w)), y0 = Math.max(0, Math.floor(Math.min(fy, ty) - w)), y1 = Math.min(SC.height, Math.ceil(Math.max(fy, ty) + w));
    if (x1 <= x0 || y1 <= y0) return;
    if (window.__perf74 && window.__perf74.slow) {   // v0.75: no pixel readback on a slow device: fade it with a gradient mask
      const bw = x1 - x0, bh = y1 - y0, gr = sx2.createLinearGradient(fx, fy, tx, ty);
      gr.addColorStop(0, `rgba(0,0,0,${Math.min(1, al * 0.75)})`); gr.addColorStop(0.6, `rgba(0,0,0,${al * 0.4})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      sx2.globalCompositeOperation = 'destination-in'; sx2.fillStyle = gr; sx2.fillRect(x0, y0, bw, bh); sx2.globalCompositeOperation = 'source-over';
      ctx.drawImage(SC, x0, y0, bw, bh, x0, y0, bw, bh); sx2.clearRect(x0, y0, bw, bh); return;
    }
    const bw = x1 - x0, bh = y1 - y0, D = sx2.getImageData(x0, y0, bw, bh).data, L2 = (tx - fx) ** 2 + (ty - fy) ** 2 || 1, W = SC.width;
    for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
      const a = D[(j * bw + i) * 4 + 3]; if (!a) continue;
      const px = x0 + i - fx, py = y0 + j - fy, t = Math.max(0, Math.min(1, (px * (tx - fx) + py * (ty - fy)) / L2));
      const v = al * (a / 255) * (1 - 0.85 * Math.pow(t, 1.4)), k = (y0 + j) * W + x0 + i;
      if (v > ACC[k]) ACC[k] = v;
    }
    sx2.clearRect(x0, y0, bw, bh);
    box.x0 = Math.min(box.x0, x0); box.y0 = Math.min(box.y0, y0); box.x1 = Math.max(box.x1, x1); box.y1 = Math.max(box.y1, y1);
  }
  function heroShadow() {
    const z = G.zone; if (!z || P.dead || G.lowFx2 || !REC.fr || G.time - REC.t > 0.5) return;
    const W = VW, H = VH;
    if (!SC || last.w !== W || last.h !== H) { SC = mkCanvas(W, H); sx2 = SC.getContext('2d', { willReadFrequently: true }); sx2.imageSmoothingEnabled = false; ACC = new Float32Array(W * H); last = { w: W, h: H }; }
    const fr = REC.fr, flip = REC.face < 0, q = iso(P.x, P.y), fx = Math.round(q.sx), fy = Math.round(q.sy + 2);
    const out = isOutdoor(z), dk = out ? dayK() : 0, box = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 };
    // 1. the lantern at the hip: a low light close by, so a long shadow thrown off the far side
    const L = window.__plLamp ? window.__plLamp() : null;
    if (L) {
      const Wl = window.__lampW && window.__lampW(); let d;
      if (Wl && Math.hypot(P.x - Wl.x, P.y - Wl.y) > 0.08) d = { x: P.x - Wl.x, y: P.y - Wl.y };   // v0.74: away from the floating lantern
      else { const behind = !!window.__lanBehind; d = wld((fx - L.x) * 1.6, behind ? 5 : -5); }
      const lk = window.__lampK ? window.__lampK() / 1.5 : 1;
      cast(fr, flip, fx, fy, d.x, d.y, 1.1 + 0.15 * (1 - dk), (out ? 0.04 + 0.4 * (1 - dk) : 0.45) * Math.min(1.2, lk), box);   // v0.79: softer, shorter (read as a bar)   // v0.76: long, never a squat blob; faint by day
    }
    // 2. flames in the world within reach (the two strongest)
    const fl = [];
    for (const s of (L37.src || [])) {
      if (s.kind === 'wallc' || (s.kind === 'fire' && s.a < 0.5)) continue;
      const d = Math.hypot(P.x - s.x, P.y - s.y); if (d < 0.4 || d > s.R * 0.95) continue;
      fl.push([Math.min(1, 1.05 * Math.pow(1 - d / (s.R * 0.95), 0.5) * Math.min(1, s.a)), s, d]);
    }
    fl.sort((a, b) => b[0] - a[0]);
    if (!(window.__perf74 && window.__perf74.slow)) for (const [al, s, d] of fl.slice(0, 2)) cast(fr, flip, fx, fy, P.x - s.x, P.y - s.y, Math.min(1.7, 0.55 + d / s.R * 1.3), al * 0.8, box);
    // 3. the sun, outdoors by day: its shadow turns with the hour and is long at either end of the day
    if (out && dk > 0.05) {
      const p = typeof dayPhase === 'function' ? dayPhase() : 0.25, h = Math.max(0, Math.min(1, p / 0.55)), ang = -2.4 + h * 2.2;
      cast(fr, flip, fx, fy, Math.cos(ang), Math.sin(ang), 0.85 + 0.9 * Math.abs(h - 0.5), 0.34 * dk, box);   // v0.76: even at noon it reads as a figure, not a disc
    }
    if (box.x1 <= box.x0) return;
    // dither into two steps, in the world's shadow colour
    const x0 = box.x0, y0 = box.y0, bw = box.x1 - x0, bh = box.y1 - y0, im = sx2.createImageData(bw, bh), D = im.data;
    for (let j = 0; j < bh; j++) for (let i = 0; i < bw; i++) {
      const k = (y0 + j) * W + x0 + i, v = ACC[k] * 2.6; if (!v) continue; ACC[k] = 0;
      const lv = Math.min(2, (v | 0) + ((v - (v | 0)) > BAY4[(((j + y0) & 3) << 2) + ((i + x0) & 3)] ? 1 : 0)), o = (j * bw + i) * 4;
      D[o] = 8; D[o + 1] = 6; D[o + 2] = 14; D[o + 3] = lv === 0 ? 0 : lv === 1 ? 105 : 180;
    }
    sx2.putImageData(im, x0, y0);
    ctx.drawImage(SC, x0, y0, bw, bh, x0, y0, bw, bh);
    sx2.clearRect(x0, y0, bw, bh);
  }
  const _ds = drawScars;
  drawScars = function () { _ds.apply(this, arguments); try { heroShadow(); } catch (e) { if (typeof reportError === 'function') reportError(e); } };
  try { window.__shadow70 = { REC }; } catch (e) { }
})();
