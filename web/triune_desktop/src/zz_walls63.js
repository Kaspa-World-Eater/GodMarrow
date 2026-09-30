// zz_walls63.js — the user (2026-09-29): "do the rest of the world" (in the style of the PixelLab heroes).
// The cliffs, ruins and crypt walls are built cell by cell at the world's coarse grain (one art pixel = four screen
// pixels), which is why they read chunky next to the heroes. Their shapes, lighting, ledges and carved features stay,
// but each block now gets a twin at the heroes' grain (three times finer) whose surface comes from PixelLab-painted
// materials (data/wtex.js): the stone, strata, moss and mortar are painted texture, shaded by the block's own light.
// Courses follow the slope of each face; the texture runs on across neighbouring cells so walls read as one mass.
(function () {
  if (typeof ztWallBlock !== 'function' || !window.__WTEX) return;
  const K = 3, TX = {};
  let pending = 0;
  for (const k in window.__WTEX) {
    pending++;
    const im = new Image();
    im.onload = () => {
      const c = mkCanvas(im.naturalWidth, im.naturalHeight), x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data; let L = 0;
      for (let i = 0; i < d.length; i += 4) L += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      TX[k] = { w: c.width, h: c.height, d, L: Math.max(8, L / (d.length / 4)) }; pending--;
    };
    im.src = window.__WTEX[k];
  }
  const MAT = th => th === 'fen' ? ['tx_cliff_fen', 'tx_top_moss'] : th === 'moor' ? ['tx_cliff', 'tx_top_grass'] : th === 'bone' ? ['tx_bone', 'tx_top_stone'] : th === 'barrow' ? ['tx_barrow', 'tx_top_grass'] : ['tx_crypt', 'tx_top_stone'];
  const pp = (u, n) => { u = ((u % (2 * n)) + 2 * n) % (2 * n); return u < n ? u : 2 * n - 1 - u; };   // mirrored tiling: no seams
  const HR = new Map();
  function upgrade(b, x, y, face, top) {
    const Wd = b.Wd, Ht = b.Ht, FC = b.FC, OV = b.OV, src = b.c.getContext('2d').getImageData(0, 0, Wd, Ht).data;
    const hr = mkCanvas(Wd * K, Ht * K), hx = hr.getContext('2d'), img = hx.createImageData(Wd * K, Ht * K), D = img.data, RW = Wd * K;
    const X0 = (x - y) * ZT_HW - b.ox, Y0 = (x + y) * ZT_HH - b.oy;
    for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) {
      const k = j * Wd + i, o = k * 4; if (!src[o + 3]) continue;
      const r = src[o], g = src[o + 1], bl = src[o + 2], f = FC[k], T = f === 3 ? top : f ? face : null;
      const flat = !T || OV.has(k);
      const lum = r * 0.3 + g * 0.59 + bl * 0.11;
      for (let q = 0; q < K; q++) for (let p = 0; p < K; p++) {
        const O = ((j * K + q) * RW + i * K + p) * 4;
        if (flat) { D[O] = r; D[O + 1] = g; D[O + 2] = bl; D[O + 3] = 255; continue; }
        const gx = (X0 + i) * K + p, gy = (Y0 + j) * K + q;
        const u = gx, v = f === 1 ? gy - gx * 0.5 : f === 2 ? gy + gx * 0.5 : gy;
        const t = ((pp(Math.round(v), T.h) * T.w) + pp(u, T.w)) * 4, tr = T.d[t], tg = T.d[t + 1], tb = T.d[t + 2];
        const tl = (tr * 0.3 + tg * 0.59 + tb * 0.11) / T.L, s = 1 + 0.45 * Math.max(-0.6, Math.min(0.6, tl - 1)), m = lum / T.L;
        D[O] = Math.min(255, r * s * 0.7 + tr * m * 0.3); D[O + 1] = Math.min(255, g * s * 0.7 + tg * m * 0.3); D[O + 2] = Math.min(255, bl * s * 0.7 + tb * m * 0.3); D[O + 3] = 255;
      }
    }
    hx.putImageData(img, 0, 0);
    const lo = mkCanvas(Wd, Ht); lo.getContext('2d').drawImage(b.c, 0, 0); lo._hr = hr; lo._world = true;
    return Object.assign({}, b, { c: lo });
  }
  const _wb = ztWallBlock;
  ztWallBlock = function (z, x, y, t, cut) {
    const b = _wb.apply(this, arguments);
    try {
      if (!b || !b.FC || pending > 0) return b;
      const key = z.id + '|' + x + ',' + y + '|' + t + (cut ? 'c' : '');
      let u = HR.get(key); if (u && u.src === b) return u.out;
      const th = t === 15 ? 'ruin' : ztWallTheme(z), m = th === 'ruin' ? ['tx_ruin', 'tx_top_stone'] : MAT(th);
      const face = TX[m[0]], top = TX[m[1]]; if (!face) return b;
      const out = upgrade(b, x, y, face, top || face);
      if (HR.size > 700) HR.delete(HR.keys().next().value);
      HR.set(key, { src: b, out }); return out;
    } catch (e) { if (typeof reportError === 'function') reportError(e); return b; }
  };
  try { window.__walls63 = { TX, HR }; } catch (e) { }
})();
