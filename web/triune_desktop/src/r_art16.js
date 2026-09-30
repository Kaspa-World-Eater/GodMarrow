
// =================================================================== v0.16 ART: hand-painted, animated monsters
// Every monster is painted pixel by pixel into a small off-screen frame (walk cycle, idle breath, wind-up, strike),
// then given an outline and light from the upper left, and cached. Palettes use hue-shifted ramps: shadows lean
// violet and cold, highlights lean warm. Tints (drowned, marrow, champions...) are palette swaps, not overlays.
const ART16 = { cache: {}, pal: {} };
function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbHex(r, g, b) { return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
function mixHex(a, b, k) { const A = hexRgb(a), B = hexRgb(b); return rgbHex(A[0] + (B[0] - A[0]) * k, A[1] + (B[1] - A[1]) * k, A[2] + (B[2] - A[2]) * k); }
// a tinted copy of a palette: keeps each entry's lightness, pulls its hue toward the tint
function tintPal(pal, tint, k) {
  const out = {}, T = hexRgb(tint), tl = (T[0] + T[1] + T[2]) / 3 || 1;
  for (const key in pal) {
    const v = pal[key]; if (typeof v !== 'string' || v[0] !== '#' || key.startsWith('_')) { out[key] = v; continue; }
    const C = hexRgb(v), l = (C[0] + C[1] + C[2]) / 3, tc = T.map(t => t * l / tl);
    out[key] = rgbHex(C[0] + (tc[0] - C[0]) * k, C[1] + (tc[1] - C[1]) * k, C[2] + (tc[2] - C[2]) * k);
  }
  return out;
}
// the pixel painter: coordinates are relative to the feet (x forward, y up is negative)
function painter(x, ox, oy, pal) {
  const col = c => (pal[c] || c);
  const A = {
    R(a, b, w, h, c) { if (w <= 0 || h <= 0) return; x.fillStyle = col(c); x.fillRect(Math.round(ox + a), Math.round(oy + b), Math.round(w), Math.round(h)); },
    P(a, b, c) { x.fillStyle = col(c); x.fillRect(Math.round(ox + a), Math.round(oy + b), 1, 1); },
    L(a0, b0, a1, b1, c, t = 1) { x.fillStyle = col(c); const n = Math.max(1, Math.ceil(Math.max(Math.abs(a1 - a0), Math.abs(b1 - b0)))); for (let i = 0; i <= n; i++) { const u = i / n; x.fillRect(Math.round(ox + a0 + (a1 - a0) * u - (t - 1) / 2), Math.round(oy + b0 + (b1 - b0) * u - (t - 1) / 2), t, t); } },
    E(cx, cy, rx, ry, c) { x.fillStyle = col(c); for (let yy = -Math.ceil(ry); yy <= Math.ceil(ry); yy++) { const v = (yy + (yy < 0 ? 0.5 : -0.5)) / ry; if (Math.abs(v) > 1) continue; const hw = rx * Math.sqrt(1 - v * v); const l = Math.round(ox + cx - hw), r = Math.round(ox + cx + hw); if (r > l) x.fillRect(l, Math.round(oy + cy + yy), r - l, 1); } },
    // a polyline limb with a darker underside: the classic two-tone pixel limb
    limb(pts, c1, c2, t = 1) { for (let i = 1; i < pts.length; i++) A.L(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c1, t); if (c2) for (let i = 1; i < pts.length; i++) A.L(pts[i - 1][0], pts[i - 1][1] + (t > 1 ? t - 1 : 1), pts[i][0], pts[i][1] + (t > 1 ? t - 1 : 1), c2, 1); },
    col
  };
  return A;
}
// outline and light: dark rim around the silhouette (softer on the lit upper-left), a warm pixel of light along top edges
function finishFrame(cv) {
  const x = cv.getContext('2d'), w = cv.width, h = cv.height, img = x.getImageData(0, 0, w, h), d = img.data, s = new Uint8ClampedArray(d);
  const a = (i, j) => i >= 0 && j >= 0 && i < w && j < h ? s[(j * w + i) * 4 + 3] > 0 : false;
  let minx = w, miny = h, maxx = 0, maxy = 0;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const o = (j * w + i) * 4;
    if (s[o + 3]) {
      minx = Math.min(minx, i); maxx = Math.max(maxx, i); miny = Math.min(miny, j); maxy = Math.max(maxy, j);
      if (!a(i, j - 1)) { d[o] = Math.min(255, s[o] * 1.12 + 16); d[o + 1] = Math.min(255, s[o + 1] * 1.1 + 12); d[o + 2] = Math.min(255, s[o + 2] * 1.02 + 6); }
      else if (!a(i + 1, j) && !a(i, j + 1)) { d[o] = s[o] * 0.8; d[o + 1] = s[o + 1] * 0.76; d[o + 2] = Math.min(255, s[o + 2] * 0.86 + 8); }
      continue;
    }
    // an empty pixel next to the figure becomes outline
    let n = -1, lit = false;
    if (a(i + 1, j)) { n = (j * w + i + 1) * 4; lit = true; } else if (a(i, j + 1)) { n = ((j + 1) * w + i) * 4; lit = true; } else if (a(i - 1, j)) n = (j * w + i - 1) * 4; else if (a(i, j - 1)) n = ((j - 1) * w + i) * 4;
    if (n < 0) continue;
    const k = lit ? 0.3 : 0.14;
    d[o] = s[n] * k + 8; d[o + 1] = s[n + 1] * k + 6; d[o + 2] = s[n + 2] * k + 12; d[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return { x: Math.max(0, minx - 1), y: Math.max(0, miny - 1), w: maxx - minx + 3, h: maxy - miny + 3 };
}
function mkFrame(W16, H16, paintFn) {
  const c = mkCanvas(W16, H16), x = c.getContext('2d'), ox = Math.floor(W16 / 2), oy = H16 - 2;
  paintFn(x, ox, oy); const bb = finishFrame(c);
  const f = mkCanvas(W16, H16), fx = f.getContext('2d'); fx.translate(W16, 0); fx.scale(-1, 1); fx.drawImage(c, 0, 0);
  const wht = src => { const q = mkCanvas(W16, H16), qx = q.getContext('2d'); qx.drawImage(src, 0, 0); qx.globalCompositeOperation = 'source-in'; qx.fillStyle = '#fff'; qx.fillRect(0, 0, W16, H16); return q; };
  return markHR({ c, f, fl: wht(c), flf: wht(f), w: W16, h: H16, ox, oy, bb });
}

// ------------------------------------------------------------------- palettes
const MPAL = {
  hollow: { s0: '#1c2224', s1: '#39433c', s2: '#5f6a54', s3: '#8f9876', s4: '#c4c69c', r0: '#221818', r1: '#3e2c24', r2: '#5e4432', eye: '#ff7a3d', eyeHi: '#ffd8a0', mouth: '#140606', bone: '#d8d0b4', gore: '#7a1c1c', gore2: '#b83a30' },
  hound: { m0: '#240a10', m1: '#521820', m2: '#882a28', m3: '#b8503c', m4: '#e08a64', b0: '#6a6050', b1: '#b0a482', b2: '#e8dec4', eye: '#ffcc40', mouth: '#120404', tooth: '#f2ecd8' },
  archer: { b0: '#3e382e', b1: '#7a725c', b2: '#b8ae90', b3: '#e8e0c8', g0: '#3a0a0e', g1: '#6e1418', g2: '#a42a28', g3: '#d8564a', h0: '#16121c', h1: '#2c2434', h2: '#463c50', w0: '#3a2618', w1: '#6a4a2c', w2: '#9a7444', str: '#d8d0b8', eye: '#ff4a3a', iron: '#9aa0a8' },
  caster: { r0: '#10120e', r1: '#232b1c', r2: '#3c4a2c', r3: '#5e6e40', k0: '#4e5a48', k1: '#7a8a6e', k2: '#a8b494', hair0: '#6a6a60', hair1: '#a8a89a', hair2: '#dcdccc', w0: '#2e2014', w1: '#5a4028', bone: '#e2dac0', fl0: '#2a6a2a', fl1: '#6ad04a', fl2: '#d8ff9a', eye: '#b8ff6a' },
  bloat: { s0: '#1e1c10', s1: '#3e3c20', s2: '#626032', s3: '#8a8a4c', s4: '#b8b87e', br0: '#3a2440', br1: '#6a4a6a', pus: '#c8d25a', pusHi: '#f4f8b0', st: '#1a1208', mouth: '#1a0c08', eye: '#e8e070', gore: '#7a2a1c', rag: '#4a3a2a' },
  knight: { i0: '#121418', i1: '#262b36', i2: '#3e4556', i3: '#646e84', i4: '#a4aec2', ru0: '#4a2616', ru1: '#7a4224', t0: '#300c10', t1: '#561820', t2: '#7e2630', horn0: '#6a6250', horn1: '#b4aa8a', horn2: '#e8e0c4', eye: '#ff5a2a', eyeHi: '#ffd0a0', steel0: '#5a606c', steel1: '#9aa2b0', steel2: '#e0e6ee', grip: '#3a2418' },
  boss: { r0: '#120c16', r1: '#261a2c', r2: '#3e2c44', r3: '#5c4462', b0: '#4a4232', b1: '#8a8064', b2: '#c4b894', b3: '#eee6ca', g0: '#3a080c', g1: '#6e1216', g2: '#a8281e', g3: '#dc5a3e', ch0: '#3a3a42', ch1: '#6e707a', ch2: '#a8aab2', eye: '#ff6a2a', eyeHi: '#fff0b0', iron0: '#2a2c32', iron1: '#50545e', iron2: '#8a909c', iron3: '#c8ced8', w0: '#3a2616', w1: '#62442a' }
};
const MFRAME = { hollow: [32, 28], hound: [36, 22], archer: [34, 28], caster: [34, 38], bloat: [34, 26], knight: [44, 34], boss: [72, 54] };

// ------------------------------------------------------------------- the painters. pose: idle | walk | wind | atk, ph: frame index
const MPAINT = {
  // The Hollow: a starved corpse on its feet, bent double, arms too long, jaw hanging, two coals for eyes
  hollow(A, pose, ph) {
    const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph : 0, lean = pose === 'atk' ? 1 : pose === 'wind' ? -1 : 0;
    // legs: bony, knees bent, one dragging
    A.limb([[-1, -8], [0 - sw, -4], [-1 - sw * 2, 0]], 's1'); A.R(-2 - sw * 2, -1, 3, 1, 's0');
    A.limb([[0, -8], [2 + sw, -4], [1 + sw * 2, 0]], 's2', 's1'); A.R(1 + sw * 2, -1, 3, 1, 's1'); A.P(2 + sw, -4, 's3');
    // the far arm, dangling past the knee
    const u = br * 0.5, sh = [2 + lean, -14 + u];
    const armF = pose === 'wind' ? [sh, [3, -18], [4, -21]] : pose === 'atk' ? [sh, [6, -13], [10, -13]] : [sh, [2 - sw * 0.5, -10 + u], [3 - sw, -6 + u]];
    A.limb(armF, 's1'); A.P(armF[2][0], armF[2][1] + 1, 's0'); A.P(armF[2][0] + 1, armF[2][1] + 1, 's0');
    // torso: a bent spine, skin stretched over it
    A.E(-0.5, -10 + u * 0.4, 2, 2, 's2'); A.E(0.3 + lean * 0.4, -12.3 + u * 0.7, 2.4, 2, 's2'); A.E(1.2 + lean * 0.7, -14.4 + u, 2.6, 1.8, 's2');
    A.P(-2, -11 + u * 0.4, 's3'); A.P(-1.5, -13 + u * 0.7, 's4'); A.P(-0.5, -14.6 + u, 's4'); A.P(0.8 + lean, -16 + u, 's3');
    for (let i = 0; i < 3; i++) { A.P(1.5 + lean * 0.5 + i * 0.3, -14 + i * 1.6 + u, 's1'); A.P(2.5 + lean * 0.5 + i * 0.3, -13.6 + i * 1.6 + u, 's1'); }
    A.P(1, -9, 'gore'); A.P(1, -8, 'gore2');
    // rag at the hips
    A.R(-2, -9, 4, 2, 'r1'); A.R(-2, -9, 4, 1, 'r2'); A.P(-2, -7, 'r0'); A.P(1, -7, 'r1'); A.P(0, -6, 'r0');
    // head: jutting forward on a bare neck, lank hair, eye socket with one coal, jaw hanging loose
    const hx = 4.5 + lean, hy = -16.5 + u + (pose === 'atk' ? 1 : 0);
    A.L(2 + lean, -15 + u, hx - 1, hy + 1, 's2');
    A.E(hx, hy, 2.3, 2.3, 's2'); A.E(hx - 0.6, hy - 0.8, 1.4, 1.2, 's3'); A.P(hx - 1, hy - 2, 's4');
    A.L(hx - 2, hy - 2, hx - 3, hy + 2, 's0'); A.P(hx - 1, hy - 3, 's0'); A.P(hx, hy - 3, 's0'); A.P(hx - 3, hy + 3, 's0');
    A.R(hx + 0.5, hy - 1, 2, 1, 'mouth'); A.P(hx + 1.5, hy - 1, 'eye'); A.P(hx + 2, hy - 2, 's3');
    const jaw = pose === 'wind' || pose === 'atk' ? 2 : 1;
    A.R(hx + 1, hy + 1, 2, jaw, 'mouth'); A.P(hx + 2, hy + 1, 'bone'); A.R(hx, hy + 1 + jaw, 3, 1, 's2'); A.P(hx + 2, hy + 1 + jaw, 's3');
    // the near arm, long, clawed
    const armN = pose === 'wind' ? [[1.5 + lean, -14 + u], [2, -19], [2, -22]] : pose === 'atk' ? [[1.5, -14 + u], [5, -12], [9, -11]] : [[1.5 + lean, -14 + u], [3 + sw * 0.5, -10 + u], [4 + sw, -6 + u]];
    A.limb(armN, 's3', 's1'); A.P(armN[1][0], armN[1][1], 's4');
    const hd = armN[2]; A.P(hd[0] + 1, hd[1], 's3'); A.P(hd[0] + 1, hd[1] + 1, 's2'); A.P(hd[0], hd[1] + 1, 's2'); A.P(hd[0] + 2, hd[1] + 1, 's1');
  },
  // The Carrion Hound: a flayed dog, all red muscle and bared bone, spine spiked, jaws too long
  hound(A, pose, ph) {
    const g = pose === 'walk' ? ph : 0, lunge = pose === 'atk' ? 2 : pose === 'wind' ? -1 : 0, bob = pose === 'walk' ? [0, -1, 0, 1][g] : pose === 'idle' ? ph * 0.5 : 0;
    const legs = [[[-1, 1], [1, -1], [1, 1], [-1, -1]], [[1, -1], [-1, 1], [-1, -1], [1, 1]]][0];
    const sw = pose === 'walk' ? [[2, -2], [0, 0], [-2, 2], [0, 0]][g] : [0, 0];
    const by = -7 + bob, bx = lunge;
    // far legs
    A.limb([[bx - 5, by + 1], [bx - 6 - sw[0], by + 4], [bx - 5 - sw[0] * 1.5, 0]], 'm1'); A.limb([[bx + 4, by + 1], [bx + 5 + sw[1], by + 4], [bx + 5 + sw[1] * 1.5, 0]], 'm1');
    // tail: a stripped bone whip
    A.limb([[bx - 7, by - 1], [bx - 10, by - 3], [bx - 12, by - 2 + (g % 2)]], 'b1');
    // body: haunch, ribcage barrel, chest
    A.E(bx - 5, by, 3, 3, 'm2'); A.E(bx - 5.5, by - 1, 2, 1.8, 'm3');
    A.E(bx, by, 5, 2.6, 'm1'); A.E(bx, by - 0.8, 4.6, 1.6, 'm2');
    for (let i = 0; i < 3; i++) { A.L(bx - 1.5 + i * 2, by - 1.5, bx - 2 + i * 2, by + 1.5, 'b1'); A.P(bx - 1.5 + i * 2, by - 1.5, 'b2'); }
    A.E(bx + 4, by - 0.5, 2.8, 3, 'm2'); A.E(bx + 3.5, by - 1.5, 1.8, 1.6, 'm3');
    // spine: a ridge of bone spurs
    for (let i = 0; i < 6; i++) { A.P(bx - 6 + i * 2, by - 3 - (i % 2), 'b2'); A.P(bx - 6 + i * 2, by - 2, 'b1'); }
    // head: long, low, jaw open when it lunges
    const hx = bx + 7, hy = by - 2 + (pose === 'atk' ? 1 : 0), open = pose === 'wind' || pose === 'atk' ? 2 : 0;
    A.E(hx, hy, 2.6, 2, 'm2'); A.E(hx - 0.5, hy - 0.8, 1.6, 1, 'm3');
    A.R(hx + 1, hy - 1, 4, 2, 'm2'); A.R(hx + 1, hy - 1, 4, 1, 'm3'); A.P(hx + 5, hy, 'm1');
    A.R(hx + 1, hy + 1, 4, open + 1, 'mouth'); A.R(hx + 1, hy + 2 + open, 4, 1, 'm1');
    for (let i = 0; i < 4; i++) { A.P(hx + 1 + i, hy + 1, 'tooth'); if (open) A.P(hx + 1 + i, hy + 1 + open, 'tooth'); }
    A.P(hx, hy - 1, 'eye'); A.P(hx - 2, hy - 3, 'm1'); A.P(hx - 1, hy - 3, 'm2'); A.P(hx - 2, hy - 4, 'm2');
    // near legs
    A.limb([[bx - 4, by + 2], [bx - 4 + sw[1], by + 5], [bx - 3 + sw[1] * 1.5, 0]], 'm3', 'm1'); A.R(bx - 3 + sw[1] * 1.5, -1, 2, 1, 'b2');
    A.limb([[bx + 5, by + 2], [bx + 6 - sw[0], by + 5], [bx + 7 - sw[0] * 1.5, 0]], 'm3', 'm1'); A.R(bx + 7 - sw[0] * 1.5, -1, 2, 1, 'b2');
  },
  // The Bone Archer: a skeleton in a rag of a hood, its ribcage still packed with red meat, drawing a black bow
  archer(A, pose, ph) {
    const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph : 0;
    // legs: bone
    A.limb([[-1, -8], [-2 - sw, -4], [-1 - sw * 2, 0]], 'b1'); A.R(-2 - sw * 2, -1, 3, 1, 'b1');
    A.limb([[1, -8], [2 + sw, -4], [1 + sw * 2, 0]], 'b3', 'b1'); A.R(1 + sw * 2, -1, 3, 1, 'b2'); A.P(2 + sw, -4, 'b3');
    // pelvis and a hanging rag
    A.R(-2, -9, 5, 2, 'b2'); A.R(-3, -9, 2, 4, 'h1'); A.P(-3, -5, 'h0');
    // hood and cloak scrap falling down the back
    A.R(-3, -17 + br * 0.5, 2, 7, 'h1'); A.L(-3, -17, -4, -9, 'h0'); A.P(-4, -10, 'h1');
    // spine and the meat-packed ribcage
    A.L(0, -9, 0, -16, 'b1');
    A.E(1, -12.5 + br * 0.5, 2.8, 3, 'g1'); A.E(1.4, -13 + br * 0.5, 1.8, 1.8, 'g2'); A.P(1, -14 + br * 0.5, 'g3'); A.P(2, -12, 'g0');
    for (let i = 0; i < 3; i++) { A.L(-1, -15 + i * 2 + br * 0.5, 3, -15.5 + i * 2 + br * 0.5, 'b3'); A.P(3, -15 + i * 2 + br * 0.5, 'b2'); }
    // skull, a scrap of hood over its crown
    const hy = -18 + br * 0.5;
    A.E(1.5, hy, 2.8, 2.8, 'b2'); A.E(1, hy - 0.7, 2, 1.8, 'b3');
    A.R(-1.5, hy - 3, 4, 1, 'h2'); A.R(-2, hy - 2, 2, 4, 'h1'); A.P(-1, hy - 2, 'h2');
    A.R(2, hy - 1, 2, 2, 'h0'); A.P(3, hy - 1, 'eye'); A.P(4, hy + 1, 'h0');
    A.R(1, hy + 2, 3, 1, 'b1'); A.P(2, hy + 2, 'b3'); A.P(1, hy + 3, 'b1'); A.P(3, hy + 3, 'b1');
    // the bow, held out in front; the back hand draws the string on a wind-up
    const draw = pose === 'wind' ? 3 : 0, bxw = 6;
    A.limb([[1, -15 + br * 0.5], [3, -14], [bxw, -13]], 'b2', 'b1');
    const top = [bxw, -20], bot = [bxw, -6], mid = [bxw + 2, -13];
    A.L(top[0], top[1], mid[0], mid[1] - 3, 'w1'); A.L(mid[0], mid[1] - 3, mid[0], mid[1] + 3, 'w1'); A.L(mid[0], mid[1] + 3, bot[0], bot[1], 'w1'); A.P(top[0], top[1], 'w2'); A.P(bot[0], bot[1], 'w2'); A.P(mid[0] + 1, mid[1], 'w0');
    const sx = bxw - draw;
    A.L(top[0], top[1], sx, -13, 'str'); A.L(sx, -13, bot[0], bot[1], 'str');
    if (pose === 'wind') { A.L(sx, -13, bxw + 5, -13, 'w2'); A.P(bxw + 5, -13, 'iron'); A.P(bxw + 6, -13, 'iron'); A.P(sx, -14, 'g3'); A.P(sx, -12, 'g3'); }
    A.limb([[0, -15 + br * 0.5], [sx - 2, -14], [sx, -13]], 'b3', 'b1');
    if (pose === 'atk') { A.P(bxw + 8, -13, 'str'); A.P(bxw + 10, -13, 'str'); }
  },
  // The Mire Witch: bent over a staff crowned with a burning skull, hair to her knees, one clawed hand out
  caster(A, pose, ph) {
    const br = pose === 'idle' || pose === 'walk' ? ph % 2 : 0, sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, raise = pose === 'wind' ? 1 : 0;
    // the robe: a ragged bell, hem torn into points that shift as she walks
    for (let y = -15; y <= 0; y++) { const hw = 2 + (y + 15) * 0.38, xs = -hw + 0.5 + (y + 15) * -0.08; A.R(xs, y, hw * 2, 1, y < -9 ? 'r2' : 'r1'); A.R(xs, y, 1.5, 1, 'r0'); A.R(xs + hw * 2 - 2, y, 2, 1, 'r2'); }
    for (let i = 0; i < 5; i++) { const x0 = -6 + i * 2.6 + sw * 0.5; A.R(x0, 0, 1, 1 + ((i + ph) % 2), i % 2 ? 'r0' : 'r1'); }
    A.L(-1, -13, -2, -1, 'r3'); A.L(2, -12, 3, -3, 'r0');
    // hair: long grey ropes down the back
    A.L(-2, -18, -4, -5 + br, 'hair0', 2); A.L(-1, -19, -3, -7 + br, 'hair1'); A.L(0, -19, -1, -9, 'hair2'); A.P(-4, -4 + br, 'hair0');
    // the staff: gnarled wood, a skull on top wreathed in green fire
    const sx = 6, st = -22 - raise * 3, sb = pose === 'wind' ? -4 : 0;
    A.L(sx, st + 3, sx - 1, sb, 'w1'); A.L(sx + 1, st + 4, sx, sb, 'w0'); A.P(sx - 1, st + 9, 'w0'); A.P(sx, st + 14, 'w1');
    A.E(sx, st + 1, 2, 1.8, 'bone'); A.P(sx - 1, st + 1, 'r0'); A.P(sx + 1, st + 1, 'r0'); A.R(sx - 1, st + 3, 3, 1, 'bone'); A.P(sx, st + 3, 'r0');
    const fl = [0, 1, 2, 1][ph % 4] + raise * 2;
    A.E(sx, st - 2 - fl * 0.4, 1.3 + raise * 0.6, 1.8 + fl * 0.5, 'fl0'); A.E(sx, st - 2 - fl * 0.3, 0.9 + raise * 0.4, 1.4 + fl * 0.4, 'fl1'); A.P(sx, st - 1, 'fl2'); A.P(sx, st - 2, 'fl2'); A.P(sx - 1, st - 4 - fl, 'fl0'); A.P(sx + 1, st - 5 - fl, 'fl1');
    // near arm gripping the staff; far hand clawing
    A.limb([[1, -14 + br * 0.5], [3, -11], [sx - 1, st + 8]], 'r2', 'r0'); A.R(sx - 1, st + 7, 2, 2, 'k1');
    const claw = pose === 'atk' ? [[0, -13], [5, -15], [9, -15]] : [[0, -13], [2, -9], [4, -9 + br]];
    A.limb(claw, 'k1', 'k0'); A.P(claw[2][0] + 1, claw[2][1], 'k2'); A.P(claw[2][0] + 1, claw[2][1] + 1, 'k0'); A.P(claw[2][0], claw[2][1] + 1, 'k2');
    // head last, so the face shows: sunken, hook-nosed, a green glint under the hair
    const hx = 3, hy = -17 + br * 0.5;
    A.E(hx, hy, 2.3, 2.4, 'k1'); A.E(hx + 0.4, hy + 0.3, 1.4, 1.4, 'k2');
    A.R(hx - 2, hy - 3, 4, 1, 'hair2'); A.R(hx - 3, hy - 2, 2, 5, 'hair1'); A.P(hx - 1, hy - 2, 'hair1'); A.P(hx - 3, hy + 3, 'hair0');
    A.R(hx, hy - 1, 2, 1, 'r0'); A.P(hx + 1, hy - 1, 'eye'); A.P(hx + 3, hy, 'k2'); A.P(hx + 3, hy + 1, 'k1'); A.P(hx + 4, hy + 1, 'k0'); A.R(hx, hy + 1, 2, 1, 'k0'); A.P(hx + 1, hy + 2, 'bone');
  },
  // The Gravebloat: a drowned corpse swollen to bursting, belly split and stitched, pustules weeping, head a knot on top
  bloat(A, pose, ph) {
    const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, sw2 = pose === 'wind' ? (ph % 2 ? 1.2 : 0.6) : pose === 'idle' ? ph * 0.4 : 0;
    A.R(-4 - sw, -3, 3, 3, 's1'); A.R(-4 - sw, -1, 3, 1, 's0'); A.R(1 + sw, -3, 3, 3, 's2'); A.R(1 + sw, -1, 4, 1, 's1');
    A.R(-4, -8, 8, 3, 'rag');
    const rx = 6.4 + sw2, ry = 6.2 + sw2 * 0.7, cy = -9;
    A.E(0, cy, rx, ry, 's1'); A.E(-0.5, cy - 0.5, rx - 1, ry - 1, 's2'); A.E(-1.5, cy - 2, rx - 3, ry - 3, 's3'); A.E(-2.5, cy - 3.5, 1.8, 1.4, 's4');
    A.E(1.5, cy + 2.5, rx - 3, 2, 'br0'); A.E(1, cy + 2, rx - 4, 1.2, 'br1');
    // the stitched split down the belly
    A.L(1, cy - 4, 2, cy + 4, 'gore'); for (let i = 0; i < 4; i++) A.L(0, cy - 3 + i * 2, 3, cy - 3.5 + i * 2, 'st');
    // pustules
    for (const [a, b, r] of [[-4, cy - 1, 1.2], [4, cy - 3, 1], [-2, cy + 3, 0.9], [5, cy + 1, 0.8]]) { A.E(a, b, r + 0.4, r + 0.4, 's1'); A.E(a, b, r, r, 'pus'); A.P(a - 0.4, b - 0.6, 'pusHi'); }
    // thin arms hanging off the sides
    A.limb([[-5, cy - 3], [-7, cy + 1], [-6, cy + 4]], 's2', 's0'); A.limb([[5, cy - 3], [7 + (pose === 'atk' ? 2 : 0), cy + 1], [7, cy + 4]], 's3', 's1');
    // the head: a small sunken knot on top of it all, dribbling
    const hx = 2, hy = cy - ry - 1;
    A.E(hx, hy, 2.3, 2, 's2'); A.E(hx - 0.5, hy - 0.5, 1.4, 1, 's3'); A.P(hx, hy - 0.5, 'eye'); A.P(hx + 1.6, hy - 0.5, 'eye'); A.R(hx, hy + 1, 2, 1, 'mouth');
    A.L(hx + 1, hy + 2, hx + 1, hy + 3 + (ph % 2), 'pus');
    if (pose === 'wind') { A.P(-3, cy - 5, 'pusHi'); A.P(4, cy - 6, 'pusHi'); }
  },
  // The Crypt Knight: a hollow suit of black plate with a horned helm and a burning slit, dragging a greatsword
  knight(A, pose, ph) {
    const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph : 0;
    // cape, torn, behind everything
    A.R(-5, -19 + br * 0.5, 4, 14, 't0'); for (let i = 0; i < 3; i++) A.R(-5 + i * 1.5 - sw * 0.5, -5, 1, 1 + ((i + ph) % 3), 't0'); A.L(-4, -18, -4, -6, 't1');
    // legs: armored, heavy
    A.limb([[-1, -9], [-2 - sw, -5], [-1 - sw * 2, -1]], 'i1', null, 2); A.R(-3 - sw * 2, -1, 4, 1, 'i1');
    A.limb([[2, -9], [3 + sw, -5], [2 + sw * 2, -1]], 'i3', null, 2); A.L(3 + sw * 2, -5, 2 + sw * 2, -2, 'i2'); A.R(1 + sw * 2, -1, 5, 1, 'i2'); A.P(3 + sw, -5, 'i4');
    // tabard over the plate, crimson and rotten
    A.R(-2, -17 + br * 0.5, 6, 8, 'i2'); A.R(-2, -17 + br * 0.5, 6, 1, 'i3'); A.R(-3, -16, 1, 6, 'i1');
    A.R(0, -14, 3, 9, 't1'); A.R(0, -14, 1, 9, 't2'); A.P(2, -5, 't0'); A.P(0, -6, 't0'); A.P(1, -11, 'ru1');
    // helm: bucket and horns, one slit burning
    const hy = -21 + br * 0.5;
    A.R(-1, hy - 2, 5, 5, 'i2'); A.R(-1, hy - 2, 5, 1, 'i3'); A.R(3, hy - 1, 1, 4, 'i1'); A.R(0, hy, 4, 1, 'i0'); A.P(2, hy, 'eye'); A.P(3, hy, 'eyeHi');
    A.L(-1, hy - 1, -3, hy - 4, 'horn1'); A.P(-3, hy - 5, 'horn2'); A.L(3, hy - 2, 4, hy - 5, 'horn1'); A.P(5, hy - 6, 'horn2'); A.P(-2, hy - 2, 'horn0');
    // a great spiked pauldron
    A.E(3, -16 + br * 0.5, 2.6, 1.8, 'i3'); A.P(2, -17 + br * 0.5, 'i4'); A.P(5, -18, 'horn1'); A.P(4, -18, 'i1');
    // the greatsword: point down at rest, overhead on the wind-up, driven forward on the blow
    let hilt, tip;
    if (pose === 'wind') { hilt = [2, -20]; tip = [-6, -30]; } else if (pose === 'atk') { hilt = [7, -12]; tip = [16, -4]; } else { hilt = [6, -12 + br * 0.5]; tip = [9, 0]; }
    const dx = tip[0] - hilt[0], dy = tip[1] - hilt[1], L0 = Math.hypot(dx, dy), nx = -dy / L0, ny = dx / L0;
    A.L(hilt[0], hilt[1], tip[0], tip[1], 'steel1', 2); A.L(hilt[0] + nx, hilt[1] + ny, tip[0] + nx * 0.5, tip[1] + ny * 0.5, 'steel0'); A.L(hilt[0] - nx * 0.5, hilt[1] - ny * 0.5, tip[0], tip[1], 'steel2');
    A.L(hilt[0] + nx * 3, hilt[1] + ny * 3, hilt[0] - nx * 3, hilt[1] - ny * 3, 'steel0'); A.L(hilt[0] - dx / L0 * 3, hilt[1] - dy / L0 * 3, hilt[0], hilt[1], 'grip', 2); A.P(hilt[0] - dx / L0 * 4, hilt[1] - dy / L0 * 4, 'steel1');
    // gauntleted arm on the hilt
    A.limb([[3, -16 + br * 0.5], [hilt[0] - 1, (hilt[1] - 16) / 2], [hilt[0], hilt[1]]], 'i3', 'i1', 2);
  },
  // The Carrion Warden: a horned skull on a giant's body, ribs hung with meat, a cleaver the size of a door, chains
  boss(A, pose, ph) {
    const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph : 0;
    // robe back, cape of hides
    A.R(-10, -30 + br, 8, 28, 'r1'); for (let i = 0; i < 5; i++) A.R(-11 + i * 2, -3, 2, 2 + ((i + ph) % 3), i % 2 ? 'r0' : 'r1');
    // legs: bound in iron
    A.limb([[-3, -14], [-4 - sw * 2, -7], [-3 - sw * 3, -1]], 'r2', null, 4); A.R(-6 - sw * 3, -2, 7, 2, 'iron1'); A.R(-5 - sw * 2, -8, 4, 2, 'iron2');
    A.limb([[3, -14], [4 + sw * 2, -7], [3 + sw * 3, -1]], 'r3', null, 4); A.R(1 + sw * 3, -2, 8, 2, 'iron2'); A.R(2 + sw * 2, -8, 4, 2, 'iron3');
    // body: a great robe split open over the ribs; the ribs are full
    A.E(0, -22 + br, 9, 10, 'r2'); A.E(-1, -24 + br, 7, 7, 'r3'); A.R(-8, -16, 16, 3, 'r1');
    A.E(1, -22 + br, 5, 6, 'g1'); A.E(1.5, -23 + br, 3.5, 4, 'g2'); A.E(2, -24 + br, 1.8, 2, 'g3');
    for (let i = 0; i < 4; i++) { A.L(-3, -26 + i * 2.6 + br, 5, -27 + i * 2.6 + br, 'b2'); A.P(5, -27 + i * 2.6 + br, 'b3'); }
    A.L(1, -28, 1, -16, 'b1');
    // chains slung across
    for (let i = 0; i < 8; i++) A.R(-8 + i * 2, -18 + Math.abs(i - 3.5) * 0.8, 2, 1, i % 2 ? 'ch1' : 'ch2');
    // the head: a horned beast skull, eyes like furnace doors
    const hx = 3, hy = -35 + br;
    A.E(hx, hy, 4.5, 4.2, 'b2'); A.E(hx - 1, hy - 1, 3, 2.6, 'b3'); A.R(hx + 2, hy + 1, 4, 3, 'b2'); A.R(hx + 2, hy + 3, 4, 1, 'b1');
    A.R(hx, hy - 1, 2, 2, 'r0'); A.R(hx + 3, hy - 1, 2, 2, 'r0'); A.P(hx, hy - 1, 'eye'); A.P(hx + 3, hy - 1, 'eye'); A.P(hx + 1, hy - 1, 'eyeHi'); A.P(hx + 4, hy - 1, 'eyeHi');
    for (let i = 0; i < 4; i++) A.P(hx + 2 + i, hy + 3, i % 2 ? 'b3' : 'r0');
    A.limb([[hx - 3, hy - 2], [hx - 7, hy - 5], [hx - 8, hy - 10], [hx - 6, hy - 12]], 'b1', null, 2); A.P(hx - 6, hy - 13, 'b3');
    A.limb([[hx + 3, hy - 3], [hx + 6, hy - 7], [hx + 5, hy - 12]], 'b2', null, 2); A.P(hx + 5, hy - 13, 'b3');
    // shoulders: iron plates hung with hooks
    A.E(-6, -29 + br, 4, 3, 'iron1'); A.E(-6, -30 + br, 3, 1.5, 'iron2'); A.E(7, -29 + br, 4.5, 3, 'iron2'); A.E(7, -30 + br, 3, 1.5, 'iron3');
    // the cleaver: raised high on the wind-up, buried forward on the blow
    let hand, ang;
    if (pose === 'wind') { hand = [4, -40]; ang = -2.3; } else if (pose === 'atk') { hand = [14, -18]; ang = 0.9; } else { hand = [12, -18 + br]; ang = 1.35; }
    A.limb([[7, -28 + br], [11, -24 + br * 0.5], hand], 'r3', 'r1', 3);
    const ca = Math.cos(ang), sa = Math.sin(ang), bl = 16;
    A.L(hand[0], hand[1], hand[0] - ca * 4, hand[1] - sa * 4, 'w1', 2);
    for (let i = 2; i < bl; i++) { const cx = hand[0] + ca * i, cy = hand[1] + sa * i, w = i < 4 ? 2 : 6; for (let j = 0; j < w; j++) A.P(cx - sa * j, cy + ca * j, j === w - 1 ? 'iron3' : j === 0 ? 'iron0' : j < 2 ? 'iron1' : 'iron2'); }
    A.P(hand[0] + ca * (bl - 2) - sa * 4, hand[1] + sa * (bl - 2) + ca * 4, 'g2'); A.P(hand[0] + ca * 8 - sa * 5, hand[1] + sa * 8 + ca * 5, 'g1');
    A.E(hand[0], hand[1], 2, 2, 'b2');
    // the far arm drags a chain with a hook
    const fh = pose === 'atk' ? [-10, -20] : [-11, -12 + br];
    A.limb([[-6, -28 + br], [-10, -22], fh], 'r2', 'r0', 3);
    for (let i = 0; i < 5; i++) A.P(fh[0] - 1 + (i % 2), fh[1] + 2 + i * 2, i % 2 ? 'ch1' : 'ch2'); A.L(fh[0], fh[1] + 12, fh[0] + 2, fh[1] + 14, 'iron3'); A.P(fh[0] + 2, fh[1] + 13, 'iron3');
  }
};
function monFrame(type, palKey, pal, pose, ph) {
  const key = type + '|' + palKey + '|' + pose + '|' + ph; let fr = ART16.cache[key]; if (fr) return fr;
  const [w, h] = MFRAME[type];
  fr = mkFrame(w, h, (x, ox, oy) => MPAINT[type](painter(x, ox, oy, pal), pose, ph));
  ART16.cache[key] = fr; return fr;
}
function monPal(m, type) {
  const key = m.type + '|' + (m.rank || '') + (m.doused ? '|d' : '');
  let p = ART16.pal[key]; if (p) return [key, p];
  p = MPAL[type]; if (m.b.tint) p = tintPal(p, m.b.tint, 0.55);
  if (m.rank === 'champion') p = tintPal(p, '#6a7cff', 0.35); else if (m.rank === 'unique') p = tintPal(p, '#e0b050', 0.4);
  if (m.doused) p = Object.assign({}, p, { _doused: 1 });
  p = Object.assign({}, p, { tint: m.b.tint || (m.rank === 'champion' ? '#6a7cff' : m.rank === 'unique' ? '#e0b050' : null) });
  ART16.pal[key] = p; return [key, p];
}
// draws a monster with its painted frames; returns null (and the old sprite is used) for anything without a painter
function drawMon16(m, flash, alpha) {
  const type = m.b.spr; if (!MPAINT[type]) return null;
  const mv = m._px == null ? 0 : Math.hypot(m.x - m._px, m.y - m._py); m._px = m.x; m._py = m.y;
  m._wd = (m._wd || 0) + mv;
  let pose = 'idle', ph = Math.floor(G.time * 1.6 + (m.id || m.x * 7)) % 2;
  if (m.state === 'windup' || m.state === 'slamWind' || m.state === 'chargeWind') { pose = 'wind'; ph = Math.floor(G.time * 6) % 2; }
  else if (m.state === 'recover' && (m.t || 0) < 0.35) { pose = 'atk'; ph = 0; }
  else if (m.state === 'parry' || m.state === 'dazed') { pose = m.state === 'parry' ? 'parry' : 'idle'; ph = 0; }
  else if (mv > 0.004 || m.state === 'charge' || m.state === 'under') { pose = 'walk'; ph = Math.floor(m._wd * (type === 'hound' ? 3.2 : 4.2)) % 4; }
  // v0.22: creatures painted with the new painter get more frames: a breathing idle, an eight-step walk, a wind-up
  // that tracks how far along it is, and an attack with a follow-through
  if ((typeof MPX !== 'undefined' && MPX[type]) || (typeof M32 !== 'undefined' && M32[type])) {
    if (pose === 'idle') ph = Math.floor(G.time * 2.2 + ((m.x * 7) % 4)) % 4;
    else if (pose === 'walk') ph = Math.floor(m._wd * ((typeof M32WALK !== 'undefined' && M32WALK[type]) || MPX_WALK[type] || 5.2)) % 8;
    else if (pose === 'wind') ph = Math.min(2, Math.floor(clamp((m.t || 0) / Math.max(0.2, m.b.wind || 0.5), 0, 0.999) * 3));
    else if (pose === 'atk') ph = Math.min(2, Math.floor((m.t || 0) / 0.12));
  }
  // v0.24: which way it is drawn facing (m._rv, kept apart from m.face, which the AI aims with): while it moves, the
  // way it is going (dir8, u_hero17.js), so nothing walks backwards when it backs off, kites or paths round a wall;
  // winding up, striking or parrying, its target; standing, its target once it has stopped a moment. Seen from
  // behind (the 'back' painting) for the three facings up the screen, from the front for the other five.
  const rv = m._rv || (m._rv = { face: m.face || 1, mvT: -9 }), T = m.tgt || P;
  const sdx = m._px2 != null ? m.x - m._px2 : 0, sdy = m._py2 != null ? m.y - m._py2 : 0;
  if (pose === 'wind' || pose === 'atk' || pose === 'parry') dir8(rv, T.x - m.x, T.y - m.y, false);
  else if (mv > 0.004 && mv < 1) { dir8(rv, sdx, sdy, true); rv.mvT = G.time; }
  else if (G.time - rv.mvT > 0.3) { if (m.state !== 'idle' && T) dir8(rv, T.x - m.x, T.y - m.y, true); else if (rv._oct == null) rv.face = m.face || 1; }
  m._fb = !!rv._fb; m._px2 = m.x; m._py2 = m.y;
  const [pk, pal] = monPal(m, type), fr = monFrame(type, pk, pal, pose, ph, m._fb ? 'back' : 'front');
  const p = iso(m.x, m.y), face = rv.face || 1, img = (flash && OPT.flash) ? (face < 0 ? fr.flf : fr.fl) : (face < 0 ? fr.f : fr.c);
  const X = Math.round(p.sx) - (face < 0 ? fr.w - fr.ox : fr.ox), Y = Math.round(p.sy) + 3 - (fr.oy + 1);
  if (alpha !== 1) ctx.globalAlpha = alpha;
  ctx.drawImage(img, X, Y);
  ctx.globalAlpha = 1;
  const bx = face < 0 ? fr.w - fr.bb.x - fr.bb.w : fr.bb.x;
  return { x: X + bx, y: Y + fr.bb.y, w: fr.bb.w, h: fr.bb.h };
}

// =================================================================== v0.17: the Ossurarch's raised dead
// Clean, dry bone and old iron; cold eye-light; each loadout painted into the pose, so every weapon swings with the body.
const SKPAL = { b0: '#4a4436', b1: '#8c8468', b2: '#c8bea0', b3: '#eee8d4', gap: '#16141a', eye: '#9fe8ff', eyeHi: '#e8fbff',
  i0: '#26282e', i1: '#4a4e58', i2: '#7e8492', i3: '#c4cad6', w0: '#2e2014', w1: '#5a4028', w2: '#86643e', cl0: '#241c2c', cl1: '#3e3248', cl2: '#5a4a66', mg: '#b48ad9', mgHi: '#f0e0ff', rope: '#8a7a52' };
MPAINT.skel = function (A, pose, ph, load) {
  const sw = pose === 'walk' ? [1, 0, -1, 0][ph] : 0, br = pose === 'idle' ? ph : 0, u = br * 0.5;
  const swing = pose === 'wind' ? -1 : pose === 'atk' ? [0.2, 1, 0.7][ph] : 0;   // -1 raised back, 1 fully through
  // legs: femur, knee knob, shin, foot
  const leg = (hx, kx, fx, near) => { A.limb([[hx, -8], [kx, -4], [fx, 0]], near ? 'b2' : 'b1', near ? 'b0' : null); A.P(kx, -4, near ? 'b3' : 'b2'); A.R(fx - 1, -1, 3, 1, near ? 'b2' : 'b1'); A.P(fx + 1, -1, near ? 'b3' : 'b1'); };
  leg(-1, -1 - sw, -1 - sw * 2, false);
  // far arm (shield or off hand) behind the body
  if (load === 'shield') {
    const sx = -3, sy = -12 + u;
    A.limb([[-1, -15 + u], [-3, -13 + u], [sx, sy]], 'b1');
    A.E(sx - 1, sy + 1, 3.6, 4.4, 'w0'); A.E(sx - 1, sy + 1, 2.8, 3.6, 'w1'); A.E(sx - 1.6, sy, 1.4, 2, 'w2'); A.L(sx - 1, sy - 3, sx - 1, sy + 5, 'i2'); A.L(sx - 4, sy + 1, sx + 2, sy + 1, 'i2'); A.P(sx - 1, sy + 1, 'i3');
  } else A.limb([[-1, -15 + u], [-2, -12 + u], [-2 - sw * 0.5, -9 + u]], 'b1');
  // pelvis, spine, ribcage (empty, dark between the ribs)
  A.R(-2, -9, 5, 2, 'b2'); A.P(-2, -8, 'b1'); A.P(2, -8, 'b1'); A.P(0, -9, 'b3');
  A.L(0, -10, 0, -16 + u, 'b1'); for (let i = 0; i < 3; i++) A.P(0, -11 + i * -2 + u, 'b2');
  A.E(0.5, -13.5 + u, 2.8, 2.6, 'gap');
  for (let i = 0; i < 3; i++) { const y = -15.5 + i * 1.6 + u; A.L(-2, y, 3, y + 0.5, 'b2'); A.P(-2, y, 'b3'); A.P(3, y + 1, 'b1'); }
  A.R(-2, -16.5 + u, 5, 1, 'b3');
  if (load === 'mage') { A.R(-3, -17 + u, 2, 9, 'cl1'); A.L(-3, -17 + u, -4, -8, 'cl0'); A.R(-2, -9, 5, 3, 'cl1'); A.R(-2, -9, 5, 1, 'cl2'); A.P(-1, -6, 'cl0'); A.P(2, -6, 'cl0'); }
  leg(1, 2 + sw, 1 + sw * 2, true);
  // skull: brow, sockets with cold light, nasal hole, loose jaw
  const hx = 1, hy = -19 + u + (pose === 'atk' ? 0.5 : 0);
  A.E(hx, hy, 2.9, 2.7, 'b2'); A.E(hx - 0.6, hy - 0.9, 2, 1.6, 'b3'); A.P(hx - 2, hy - 2, 'b3');
  A.R(hx, hy - 1, 2, 2, 'gap'); A.R(hx - 2, hy - 1, 1, 2, 'gap'); A.P(hx + 1, hy - 1, 'eye'); A.P(hx, hy, 'eyeHi'); A.P(hx - 2, hy, 'eye');
  A.P(hx + 2, hy + 1, 'gap'); const jaw = pose === 'wind' ? 1 : 0;
  A.R(hx - 1, hy + 2 + jaw, 4, 1, 'b2'); A.P(hx, hy + 2 + jaw, 'b3'); A.P(hx + 2, hy + 2 + jaw, 'b1'); A.P(hx - 1, hy + 1, 'b1');
  if (load === 'mage') { A.R(hx - 3, hy - 3, 5, 2, 'cl2'); A.R(hx - 3, hy - 1, 1, 3, 'cl1'); A.P(hx + 2, hy - 3, 'cl1'); }
  if (load === 'greatsword' || load === 'halberd') { A.R(hx - 2, hy - 3, 5, 2, 'i2'); A.R(hx - 2, hy - 3, 5, 1, 'i3'); A.P(hx - 3, hy - 2, 'i1'); }
  // the near arm and its weapon
  const shx = 1, shy = -15 + u;
  const ang = load === 'bow' ? 0 : -1.9 + (swing + 1) * 1.25;          // weapon angle: raised back (-1.9 + ..) to down-forward
  const hand = load === 'bow' ? [5, -13 + u] : load === 'mage' ? [4, -12 + u - (swing < 0 ? 3 : 0)] : [shx + 3.5 * Math.cos(ang + 0.6), shy + 3.5 * Math.sin(ang + 0.6) + 2];
  const elbow = [(shx + hand[0]) / 2 + 0.5, (shy + hand[1]) / 2 + 1.2];
  const blade = (len, w, c1, c2, c3) => { const ca = Math.cos(ang), sa = Math.sin(ang); for (let i = 1; i <= len; i++) { const px = hand[0] + ca * i, py = hand[1] + sa * i; A.P(px, py, c2); if (w > 1) A.P(px - sa, py + ca, c1); if (i > 1 && i < len) A.P(px + sa * 0.6, py - ca * 0.6, c3); } return [hand[0] + ca * len, hand[1] + sa * len]; };
  if (load === 'shield') { blade(6, 1, 'i1', 'i3', 'i2'); A.L(hand[0] - Math.sin(ang) * 1.5, hand[1] + Math.cos(ang) * 1.5, hand[0] + Math.sin(ang) * 1.5, hand[1] - Math.cos(ang) * 1.5, 'w1'); }
  else if (load === 'greatsword') { const tip = blade(11, 2, 'i1', 'i3', 'i2'); A.L(hand[0] - Math.sin(ang) * 2.5, hand[1] + Math.cos(ang) * 2.5, hand[0] + Math.sin(ang) * 2.5, hand[1] - Math.cos(ang) * 2.5, 'i1'); A.P(hand[0] - Math.cos(ang) * 2, hand[1] - Math.sin(ang) * 2, 'w1'); }
  else if (load === 'halberd') { const ca = Math.cos(ang), sa = Math.sin(ang); A.L(hand[0] - ca * 5, hand[1] - sa * 5, hand[0] + ca * 9, hand[1] + sa * 9, 'w1'); const hx2 = hand[0] + ca * 9, hy2 = hand[1] + sa * 9; A.E(hx2 - sa * 1.5, hy2 + ca * 1.5, 2, 2, 'i2'); A.P(hx2 - sa * 2, hy2 + ca * 2, 'i3'); A.L(hx2, hy2, hx2 + ca * 3, hy2 + sa * 3, 'i3'); }
  else if (load === 'flail') { const ca = Math.cos(ang), sa = Math.sin(ang); A.L(hand[0], hand[1], hand[0] + ca * 4, hand[1] + sa * 4, 'w1'); const hx2 = hand[0] + ca * 4, hy2 = hand[1] + sa * 4, bx = hx2 + ca * 4 + (swing > 0 ? 2 : 0), by = hy2 + sa * 4 + (swing > 0 ? 0 : 3); A.L(hx2, hy2, bx, by, 'rope'); A.E(bx, by, 1.8, 1.8, 'i1'); A.P(bx - 1, by - 1, 'i3'); A.P(bx + 2, by, 'i2'); A.P(bx, by - 2, 'i2'); A.P(bx, by + 2, 'i2'); }
  else if (load === 'mage') { A.L(hand[0], hand[1] - 7, hand[0] - 0.5, hand[1] + 6, 'w1'); A.E(hand[0], hand[1] - 8, 1.6, 1.6, 'mg'); A.P(hand[0], hand[1] - 8, 'mgHi'); if (pose === 'wind' || pose === 'atk') { A.P(hand[0] - 2, hand[1] - 10, 'mg'); A.P(hand[0] + 2, hand[1] - 9, 'mg'); A.P(hand[0], hand[1] - 11, 'mgHi'); } }
  else if (load === 'bow') { const dr = pose === 'wind' ? 3 : 0, bx = 6; A.L(bx, -19 + u, bx + 2, -15 + u, 'w1'); A.L(bx + 2, -15 + u, bx + 2, -11 + u, 'w1'); A.L(bx + 2, -11 + u, bx, -7 + u, 'w1'); A.P(bx + 1, -13 + u, 'w2'); A.L(bx, -19 + u, bx - dr, -13 + u, 'b3'); A.L(bx - dr, -13 + u, bx, -7 + u, 'b3'); if (dr) { A.L(bx - dr, -13 + u, bx + 5, -13 + u, 'w2'); A.P(bx + 5, -13 + u, 'i3'); } }
  A.limb([[shx, shy], elbow, hand], 'b3', 'b1'); A.P(elbow[0], elbow[1], 'b3'); A.P(hand[0], hand[1], 'b2');
};
MFRAME.skel = [36, 36];
const SKEL_FR = {};
function skelFrame(load, pose, ph) {
  const key = load + '|' + pose + '|' + ph; let fr = SKEL_FR[key]; if (fr) return fr;
  const [w, h] = MFRAME.skel;
  fr = mkFrame(w, h, (x, ox, oy) => MPAINT.skel(painter(x, ox, oy, SKPAL), pose, ph, load));
  SKEL_FR[key] = fr; return fr;
}
// a skeleton, with a faint haze of grave-dust around it; returns the old 12-wide rect so bars and hovers stay put
function drawSkel16(e, flash, sink) {
  const mv = e._px == null ? 0 : Math.hypot(e.x - e._px, e.y - e._py); e._px = e.x; e._py = e.y; e._wd = (e._wd || 0) + mv;
  let pose = 'idle', ph = Math.floor(G.time * 1.6 + (e.x * 3 | 0)) % 2;
  if (e.state === 'windup') { pose = 'wind'; ph = 0; }
  else if ((e.swingT || 0) > 0) { pose = 'atk'; ph = e.swingT > 0.14 ? 0 : e.swingT > 0.07 ? 1 : 2; }
  else if (mv > 0.004) { pose = 'walk'; ph = Math.floor(e._wd * 4.5) % 4; }
  const fr = skelFrame(e.load || 'shield', pose, ph), p = iso(e.x, e.y), face = e.face || 1;
  const X = Math.round(p.sx) - (face < 0 ? fr.w - fr.ox : fr.ox), Y = Math.round(p.sy) + 3 - (fr.oy + 1) + (sink || 0);
  // grave dust: a pale haze at the feet and a few motes drifting up
  ctx.globalCompositeOperation = 'lighter'; glow(p.sx, p.sy - 2, 9, '200,190,170', 0.07 + 0.03 * Math.sin(G.time * 2 + e.x)); ctx.globalCompositeOperation = 'source-over';
  if (Math.random() < 0.05) parts.push({ x: e.x + rand(-0.2, 0.2), y: e.y + rand(-0.2, 0.2), z: 1 + Math.random() * 4, vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2), vz: 3 + Math.random() * 3, t: 0.8 + Math.random() * 0.6, col: Math.random() < 0.5 ? '#8f8a7c' : '#6f6a60' });
  if (e.temp) ctx.globalAlpha = 0.8;
  ctx.drawImage((flash && OPT.flash) ? (face < 0 ? fr.flf : fr.fl) : (face < 0 ? fr.f : fr.c), X, Y);
  ctx.globalAlpha = 1;
  return { x: Math.round(p.sx - 6), y: Math.round(p.sy + 3 - 15 + (sink || 0)), w: 12, h: 15 };
}
