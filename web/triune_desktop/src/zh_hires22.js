
// =================================================================== v0.22: painting at twice the grain
// New art is painted straight into a 2x frame. The painter speaks the same language as before (coordinates in
// world pixels from the feet, x forward, y up negative) but takes half-pixel steps, and it can shade forms:
// ball() lights an ellipsoid from the upper left, tube() a tapering limb, slab() a flat plane, each through a
// colour ramp with an ordered dither between the steps. That is where the volume and the "lifelike" read comes from.
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const LIGHT3 = (() => { const v = [-0.5, -0.62, 0.6], l = Math.hypot(...v); return v.map(q => q / l); })();
const MPAINT_HR = {};
function painter2(x, ox, oy, pal) {
  const col = c => (typeof c === 'string' && pal[c] !== undefined ? pal[c] : c);
  const hx = a => Math.round((ox + a) * 2), hy = b => Math.round((oy + b) * 2);
  const fill = (X, Y, w, h, c) => { x.fillStyle = c; x.fillRect(X, Y, w, h); };
  const rampAt = (R, t, X, Y) => { const n = R.length; let i = Math.floor(clamp(t, 0, 1) * (n - 1) + 0.5 + (BAYER4[(Y & 3) * 4 + (X & 3)] - 0.5) * 0.45); return R[clamp(i, 0, n - 1)]; };
  const A = {
    col,
    // flat primitives
    R(a, b, w, h, c) { if (w <= 0 || h <= 0) return; fill(hx(a), hy(b), Math.max(1, Math.round(w * 2)), Math.max(1, Math.round(h * 2)), col(c)); },
    P(a, b, c) { fill(hx(a), hy(b), 1, 1, col(c)); },           // one fine pixel
    Q(a, b, c) { fill(hx(a), hy(b), 2, 2, col(c)); },           // one world pixel
    L(a0, b0, a1, b1, c, t = 0.5) { const cc = col(c), n = Math.max(1, Math.ceil(Math.max(Math.abs(a1 - a0), Math.abs(b1 - b0)) * 2)), s = Math.max(1, Math.round(t * 2)); for (let i = 0; i <= n; i++) { const u = i / n; fill(Math.round((ox + a0 + (a1 - a0) * u) * 2 - (s - 1) / 2), Math.round((oy + b0 + (b1 - b0) * u) * 2 - (s - 1) / 2), s, s, cc); } },
    E(cx, cy, rx, ry, c) { const cc = col(c), RX = rx * 2, RY = ry * 2, CX = (ox + cx) * 2, CY = (oy + cy) * 2; for (let yy = -Math.ceil(RY); yy <= Math.ceil(RY); yy++) { const v = (yy + 0.5) / RY; if (Math.abs(v) > 1) continue; const hw = RX * Math.sqrt(1 - v * v), l = Math.round(CX - hw), r = Math.round(CX + hw); if (r > l) fill(l, Math.round(CY + yy), r - l, 1, cc); } },
    // shaded ellipsoid. o: { lit: extra light, ao: darken the bottom, spec: highlight colour, rot: tilt }
    ball(cx, cy, rx, ry, ramp, o = {}) {
      const R = col(ramp), RX = rx * 2, RY = ry * 2, CX = (ox + cx) * 2, CY = (oy + cy) * 2, ca = Math.cos(o.rot || 0), sa = Math.sin(o.rot || 0);
      const ext = Math.ceil(Math.max(RX, RY));
      for (let Y = Math.floor(CY - ext); Y <= Math.ceil(CY + ext); Y++) for (let X = Math.floor(CX - ext); X <= Math.ceil(CX + ext); X++) {
        const dx = X + 0.5 - CX, dy = Y + 0.5 - CY, u = (dx * ca + dy * sa) / RX, v = (-dx * sa + dy * ca) / RY, q = u * u + v * v;
        if (q > 1) continue;
        const nz = Math.sqrt(1 - q), nx = u * ca - v * sa, ny = u * sa + v * ca;
        let t = 0.5 + 0.5 * (nx * LIGHT3[0] + ny * LIGHT3[1] + nz * LIGHT3[2]) + (o.lit || 0);
        if (o.ao) t -= o.ao * Math.max(0, v) * Math.max(0, v);
        if (o.rim && q > 0.8 && nx > 0.3) t += o.rim;
        fill(X, Y, 1, 1, rampAt(R, t, X, Y));
        if (o.spec && t > 0.93 && ((X + Y) & 1)) fill(X, Y, 1, 1, col(o.spec));
      }
    },
    // a tapering limb or body along a polyline, shaded as a cylinder
    tube(pts, r0, r1, ramp, o = {}) {
      let total = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
      const steps = Math.max(2, Math.ceil(total * 3)); let acc = 0, si = 0, sl = 0;
      for (let k = 0; k <= steps; k++) {
        const d = total * k / steps; while (si < seg.length - 1 && d > acc + seg[si]) { acc += seg[si]; si++; }
        const u = seg[si] ? (d - acc) / seg[si] : 0, a = pts[si], b = pts[si + 1] || a;
        const px = a[0] + (b[0] - a[0]) * u, py = a[1] + (b[1] - a[1]) * u, r = r0 + (r1 - r0) * (k / steps);
        A.ball(px, py, r, r, ramp, { lit: o.lit || 0, ao: o.ao || 0 });
      }
    },
    // a flat plane with a gradient from its lit corner: robes, blades, shields
    slab(points, ramp, o = {}) {
      const R = col(ramp), P2 = points.map(([a, b]) => [(ox + a) * 2, (oy + b) * 2]);
      let y0 = 1e9, y1 = -1e9, xa = 1e9, xb = -1e9; for (const [X, Y] of P2) { y0 = Math.min(y0, Y); y1 = Math.max(y1, Y); xa = Math.min(xa, X); xb = Math.max(xb, X); }
      for (let Y = Math.floor(y0); Y <= Math.ceil(y1); Y++) {
        const xs = []; for (let i = 0; i < P2.length; i++) { const [ax, ay] = P2[i], [bx, by] = P2[(i + 1) % P2.length]; if ((ay <= Y + 0.5 && by > Y + 0.5) || (by <= Y + 0.5 && ay > Y + 0.5)) xs.push(ax + (Y + 0.5 - ay) / (by - ay) * (bx - ax)); }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) for (let X = Math.round(xs[k]); X < Math.round(xs[k + 1]); X++) {
          const gx = (X - xa) / Math.max(1, xb - xa), gy = (Y - y0) / Math.max(1, y1 - y0);
          let t = (o.base != null ? o.base : 0.75) - gx * (o.gx != null ? o.gx : 0.35) - gy * (o.gy != null ? o.gy : 0.3);
          if (o.folds) t += Math.sin(gx * o.folds * 6.28 + (o.fph || 0)) * 0.12;
          fill(X, Y, 1, 1, rampAt(R, t, X, Y));
        }
      }
    },
    // scattered fine texture over what is already painted inside a box (skin pores, rust, lichen)
    grain(a, b, w, h, c, n, seed = 1) { const cc = col(c); for (let i = 0; i < n; i++) { const X = hx(a) + Math.floor(hash(i * 7 + seed, seed * 3) * w * 2), Y = hy(b) + Math.floor(hash(seed * 11, i * 5 + seed) * h * 2); const d = x.getImageData(X, Y, 1, 1).data; if (d[3]) fill(X, Y, 1, 1, cc); } },
    // an emissive point that the outline pass leaves alone (eyes, embers): two fine pixels with a hot core
    glowPx(a, b, c, core) { fill(hx(a), hy(b), 2, 2, col(c)); if (core) fill(hx(a), hy(b), 1, 1, col(core)); }
  };
  return A;
}
// hi-res outline and light: a fine dark rim (cooler on the shadow side), a warm lit edge on top
function finishFrameHR(cv) {
  const x = cv.getContext('2d'), w = cv.width, h = cv.height, img = x.getImageData(0, 0, w, h), d = img.data, s = new Uint8ClampedArray(d);
  const a = (i, j) => i >= 0 && j >= 0 && i < w && j < h && s[(j * w + i) * 4 + 3] > 0;
  let minx = w, miny = h, maxx = 0, maxy = 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const o = (j * w + i) * 4;
    if (s[o + 3]) {
      minx = Math.min(minx, i); maxx = Math.max(maxx, i); miny = Math.min(miny, j); maxy = Math.max(maxy, j);
      if (!a(i, j - 1) || !a(i - 1, j)) { d[o] = Math.min(255, s[o] * 1.14 + 12); d[o + 1] = Math.min(255, s[o + 1] * 1.1 + 9); d[o + 2] = Math.min(255, s[o + 2] * 1.02 + 4); }
      else if (!a(i + 1, j) || !a(i, j + 1)) { d[o] = s[o] * 0.82; d[o + 1] = s[o + 1] * 0.78; d[o + 2] = Math.min(255, s[o + 2] * 0.88 + 6); }
      continue;
    }
    let n = -1, lit = false;
    if (a(i + 1, j)) { n = (j * w + i + 1) * 4; lit = true; } else if (a(i, j + 1)) { n = ((j + 1) * w + i) * 4; lit = true; } else if (a(i - 1, j)) n = (j * w + i - 1) * 4; else if (a(i, j - 1)) n = ((j - 1) * w + i) * 4;
    else if (a(i + 1, j + 1)) n = ((j + 1) * w + i + 1) * 4; else if (a(i - 1, j - 1)) n = ((j - 1) * w + i - 1) * 4;
    if (n < 0) continue;
    const k = lit ? 0.26 : 0.12;
    d[o] = s[n] * k + 7; d[o + 1] = s[n + 1] * k + 5; d[o + 2] = s[n + 2] * k + 11; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return { x: Math.max(0, minx - 1) / 2, y: Math.max(0, miny - 1) / 2, w: (maxx - minx + 3) / 2, h: (maxy - miny + 3) / 2 };
}
// a frame painted at 2x; the low-res canvases are real (downsampled) copies so any old code that reads them still
// sees the picture, and each carries its twin in _hr
function mkFrameHR(W16, H16, paintFn) {
  const W2 = W16 * 2, H2 = H16 * 2, c2 = mkCanvas(W2, H2), x = c2.getContext('2d'), ox = Math.floor(W16 / 2), oy = H16 - 2;
  paintFn(x, ox, oy); const bb0 = finishFrameHR(c2);
  const f2 = mkCanvas(W2, H2), fx = f2.getContext('2d'); fx.translate(W2, 0); fx.scale(-1, 1); fx.drawImage(c2, 0, 0);
  const wht = src => { const q = mkCanvas(W2, H2), qx = q.getContext('2d'); qx.drawImage(src, 0, 0); qx.globalCompositeOperation = 'source-in'; qx.fillStyle = '#fff'; qx.fillRect(0, 0, W2, H2); return q; };
  const lo = hi => { const c = mkCanvas(W16, H16), cx = c.getContext('2d'); cx.imageSmoothingEnabled = false; cx.drawImage(hi, 0, 0, W16, H16); c._hr = hi; return c; };
  const bb = { x: Math.floor(bb0.x), y: Math.floor(bb0.y), w: Math.ceil(bb0.w), h: Math.ceil(bb0.h) };
  return { c: lo(c2), f: lo(f2), fl: lo(wht(c2)), flf: lo(wht(f2)), w: W16, h: H16, ox, oy, bb, hr: true };
}
// palettes may hold ramps (arrays of colours); tinting walks them too
{
  const _tintPal = tintPal;
  tintPal = function (pal, tint, k) {
    const out = _tintPal(pal, tint, k), T = hexRgb(tint), tl = (T[0] + T[1] + T[2]) / 3 || 1;
    for (const key in pal) { const v = pal[key]; if (!Array.isArray(v)) continue; out[key] = v.map(h => { const C = hexRgb(h), l = (C[0] + C[1] + C[2]) / 3, tc = T.map(t => t * l / tl); return rgbHex(C[0] + (tc[0] - C[0]) * k, C[1] + (tc[1] - C[1]) * k, C[2] + (tc[2] - C[2]) * k); }); }
    return out;
  };
}
// the monster frame cache now prefers a hi-res painter when one exists
{
  const _monFrame = monFrame;
  monFrame = function (type, palKey, pal, pose, ph) {
    if (!MPAINT_HR[type]) return _monFrame(type, palKey, pal, pose, ph);
    const key = 'HR|' + type + '|' + palKey + '|' + pose + '|' + ph; let fr = ART16.cache[key]; if (fr) return fr;
    const [w, h] = MFRAME[type];
    fr = mkFrameHR(w, h, (x, ox, oy) => MPAINT_HR[type](painter2(x, ox, oy, pal), pose, ph));
    ART16.cache[key] = fr; return fr;
  };
}
// a ramp from dark to light, bent cold in the shadows and warm in the lights (hue-shifted, as painters do)
function mkRamp(dark, mid, light, n = 6) {
  const out = []; for (let i = 0; i < n; i++) { const t = i / (n - 1); out.push(t < 0.5 ? mixHex(dark, mid, t * 2) : mixHex(mid, light, (t - 0.5) * 2)); } return out;
}
