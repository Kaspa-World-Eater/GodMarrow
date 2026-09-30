(() => {
'use strict';
// =================================================================== canvas
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
let W = 480, H = 270;   // the UI's logical screen
// v0.23: the world is drawn zoomed out (ZK): it sees a VW x VH view, three screen pixels to an art pixel on desktop
const ZK = 1.0, VW = Math.round(480 / ZK), VH = Math.round(270 / ZK);
// v0.22: the game still thinks in a 480x270 world, but the canvas has twice the pixels. Everything is drawn through
// a 2x transform, and any sprite that carries a high-resolution twin (img._hr) is drawn from the twin, so art made
// at the finer grain keeps every pixel. Older sprites get a twin made for them (a pixel-art upscale plus fine
// texture and rim light) the first time they are drawn.
// 4 pixels to a world pixel on a desktop screen; 2 on a phone, where the screen is small and the GPU is weaker
// v0.22b: four screen pixels per world pixel on a desktop (a 1920x1080 canvas), two on a phone
const RS = (() => { try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches ? 2 : 4; } catch (e) { return 4; } })();
cv.width = W * RS; cv.height = H * RS;
ctx.setTransform(RS, 0, 0, RS, 0, 0);
ctx.imageSmoothingEnabled = false;
const _drawImage = CanvasRenderingContext2D.prototype.drawImage;
const NATIVE32 = true;   // v0.23: 32-bit pixel art — sprites are drawn at their own pixels, never smoothed or upscaled by EPX
ctx.drawImage = function (img, a, b, c, d, e, f, g, h) {
  let hr = img && img._hr;
  if (!hr && img && img._autoHR && !NATIVE32) { try { hr = upHR(img, img._autoHR); if (RS >= 4) hr = upHR(hr, img._autoHR === 'tile' ? 'tile' : 'soft'); img._hr = hr; } catch (er) { img._autoHR = 0; } }
  if (!hr) return _drawImage.apply(this, arguments);
  const s = hr.width / img.width;
  if (arguments.length === 3) return _drawImage.call(this, hr, a, b, img.width, img.height);
  if (arguments.length === 5) return _drawImage.call(this, hr, a, b, c, d);
  return _drawImage.call(this, hr, a * s, b * s, c * s, d * s, e, f, g, h);
};
// Scale2x (EPX) doubles pixel art without blurring and rounds its stair-steps; then a fine-grain pass adds texture
// inside flat colour, a lit rim on upper-left edges and a shaded one on lower-right edges.
function upHR(src, mode) {
  const w = src.width, h = src.height, sx = src.getContext('2d'), sd = sx.getImageData(0, 0, w, h).data;
  const out = document.createElement('canvas'); out.width = w * 2; out.height = h * 2;
  const ox = out.getContext('2d'), img = ox.createImageData(w * 2, h * 2), d = img.data, W2 = w * 2;
  const px = (i, j) => (i < 0 || j < 0 || i >= w || j >= h) ? -1 : (j * w + i);
  const same = (p, q) => { if (p < 0 || q < 0) return p === q || (p < 0 && sd[q * 4 + 3] === 0) || (q < 0 && sd[p * 4 + 3] === 0); const a = p * 4, b = q * 4; return sd[a + 3] === 0 && sd[b + 3] === 0 || (sd[a] === sd[b] && sd[a + 1] === sd[b + 1] && sd[a + 2] === sd[b + 2] && sd[a + 3] === sd[b + 3]); };
  const put = (i, j, p) => { const o = (j * W2 + i) * 4; if (p < 0) { d[o + 3] = 0; return; } const q = p * 4; d[o] = sd[q]; d[o + 1] = sd[q + 1]; d[o + 2] = sd[q + 2]; d[o + 3] = sd[q + 3]; };
  const epx = mode !== 'tile';
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const P0 = px(i, j), A = px(i, j - 1), B = px(i + 1, j), C = px(i - 1, j), D = px(i, j + 1);
    let p1 = P0, p2 = P0, p3 = P0, p4 = P0;
    if (epx) {
      if (same(C, A) && !same(C, D) && !same(A, B)) p1 = A;
      if (same(A, B) && !same(A, C) && !same(B, D)) p2 = B;
      if (same(D, C) && !same(D, B) && !same(C, A)) p3 = C;
      if (same(B, D) && !same(B, A) && !same(D, C)) p4 = D;
    }
    put(i * 2, j * 2, p1); put(i * 2 + 1, j * 2, p2); put(i * 2, j * 2 + 1, p3); put(i * 2 + 1, j * 2 + 1, p4);
  }
  // fine grain and rims
  const src2 = new Uint8ClampedArray(d), al = (i, j) => i >= 0 && j >= 0 && i < W2 && j < h * 2 && src2[(j * W2 + i) * 4 + 3] > 0;
  for (let j = 0; j < h * 2; j++) for (let i = 0; i < W2; i++) {
    const o = (j * W2 + i) * 4; if (!src2[o + 3]) continue;
    const r = src2[o], g = src2[o + 1], b = src2[o + 2], ink = r + g + b < 70;
    let k = 1 + (hash(i * 7 + 3, j * 13 + 1) - 0.5) * (mode === 'tile' ? 0.14 : mode === 'soft' ? 0.03 : 0.07);
    if (!ink && mode === 'spr') { if (!al(i - 1, j) || !al(i, j - 1)) k *= 1.1; else if (!al(i + 1, j) || !al(i, j + 1)) k *= 0.86; }
    d[o] = r * k; d[o + 1] = g * k; d[o + 2] = b * k;
  }
  ox.putImageData(img, 0, 0);
  return out;
}
function markHR(o, mode = 'spr') { for (const k of ['c', 'f', 'fl', 'flf']) if (o[k] && !o[k]._hr) o[k]._autoHR = mode; return o; }
let viewScale = 1;
function fit() {
  const s = Math.min(innerWidth / W, innerHeight / H);
  viewScale = s >= 2 ? Math.floor(s) : s;
  cv.style.width = (W * viewScale) + 'px';
  cv.style.height = (H * viewScale) + 'px';
}
addEventListener('resize', fit); fit();

// =================================================================== helpers
const rand = (a, b) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function makeNoise(rng) {
  const P = new Float32Array(256 * 256);
  for (let i = 0; i < P.length; i++) P[i] = rng();
  const g = (i, j) => P[((j & 255) << 8) | (i & 255)];
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = g(xi, yi), b = g(xi + 1, yi), c = g(xi, yi + 1), d = g(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}
const fbm = (n, x, y) => n(x, y) * .5 + n(x * 2, y * 2) * .25 + n(x * 4, y * 4) * .125 + n(x * 8, y * 8) * .0625;
// v0.22: player options (pause menu > Options). Damage numbers and hit flashes are off unless you want them.
const OPT = { dmgNums: false, flash: false, shake: true, auto: null };
try { Object.assign(OPT, JSON.parse(localStorage.getItem('triune.opts') || '{}')); } catch (e) { }
function saveOpts() { try { localStorage.setItem('triune.opts', JSON.stringify(OPT)); } catch (e) { } }
function hash(x, y) { let h = (x * 374761393 + y * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

// =================================================================== palette & sprites
const PAL = {
  K: '#0e0d12', M: '#3a3446', W: '#e8e2d0', B: '#d8f3ff', R: '#2a2536', S: '#c9c3b0',
  g: '#7a7466', r: '#4a3f35', e: '#ff6a3d', b: '#cfc6ae', w: '#5a4330',
  i: '#3b3f47', t: '#7a3b2a', d: '#1c1b22', y: '#d9a441', h: '#8f8a7c', n: '#3d4a3a', p: '#8a9a4a'
};
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
// v0.16: every sprite gets light from the upper left. Edge pixels facing the light brighten and warm, edge pixels
// facing away darken and cool toward violet, and the black outline softens into a dark shade of what it borders on
// the lit side (a "selective outline"), so the flat old sprites read with volume.
function shadeSprite(x, w, h) {
  const img = x.getImageData(0, 0, w, h), d = img.data, src = new Uint8ClampedArray(d);
  const A = (i, j) => i >= 0 && j >= 0 && i < w && j < h ? src[(j * w + i) * 4 + 3] : 0;
  const isInk = (i, j) => { const o = (j * w + i) * 4; return src[o] + src[o + 1] + src[o + 2] < 90; };
  const open = (i, j) => !A(i, j) || isInk(i, j);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const o = (j * w + i) * 4; if (!src[o + 3]) continue;
    const r = src[o], g = src[o + 1], b = src[o + 2];
    if (isInk(i, j)) {
      // outline: soften only where it borders the lit side of a coloured pixel
      if (!(A(i - 1, j) === 0 || A(i + 1, j) === 0 || A(i, j - 1) === 0 || A(i, j + 1) === 0)) continue;
      let n = null; for (const [di, dj] of [[1, 0], [0, 1], [1, 1]]) if (A(i + di, j + dj) && !isInk(i + di, j + dj)) { n = (((j + dj) * w) + i + di) * 4; break; }
      if (n != null) { d[o] = src[n] * 0.32 + 6; d[o + 1] = src[n + 1] * 0.26 + 4; d[o + 2] = src[n + 2] * 0.34 + 10; }
      continue;
    }
    const lit = open(i, j - 1) || open(i - 1, j), dark = open(i, j + 1) || open(i + 1, j);
    if (lit && !dark) { d[o] = Math.min(255, r * 1.16 + 14); d[o + 1] = Math.min(255, g * 1.12 + 10); d[o + 2] = Math.min(255, b * 1.04 + 4); }
    else if (dark && !lit) { d[o] = r * 0.74; d[o + 1] = g * 0.70; d[o + 2] = Math.min(255, b * 0.82 + 10); }
    else if (!lit && !dark && ((i + j) & 1) && open(i + 1, j + 2)) { d[o] = r * 0.88; d[o + 1] = g * 0.85; d[o + 2] = b * 0.92 + 4; }
  }
  x.putImageData(img, 0, 0);
}
function sprite(rows) {
  const h = rows.length, w = Math.max(...rows.map(r => r.length));
  const c = mkCanvas(w, h), x = c.getContext('2d');
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.' && PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1); } }));
  shadeSprite(x, w, h);
  const f = mkCanvas(w, h), fx = f.getContext('2d'); fx.translate(w, 0); fx.scale(-1, 1); fx.drawImage(c, 0, 0);
  const fl = mkCanvas(w, h), flx = fl.getContext('2d'); flx.drawImage(c, 0, 0); flx.globalCompositeOperation = 'source-in'; flx.fillStyle = '#fff'; flx.fillRect(0, 0, w, h);
  const flf = mkCanvas(w, h), flfx = flf.getContext('2d'); flfx.drawImage(f, 0, 0); flfx.globalCompositeOperation = 'source-in'; flfx.fillStyle = '#fff'; flfx.fillRect(0, 0, w, h);
  return markHR({ c, f, fl, flf, w, h });
}
function tint(s, color, alpha) {
  const mk = src => { const c = mkCanvas(s.w, s.h), x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = alpha; x.fillStyle = color; x.fillRect(0, 0, s.w, s.h); return c; };
  return markHR({ c: mk(s.c), f: mk(s.f), fl: s.fl, flf: s.flf, w: s.w, h: s.h });
}
const SPR = {
  player: sprite(['....KK....', '...KMMK...', '..KMWWMK..', '..KWBWBK..', '..KMWWMK..', '...KMMK...', '..KRRRRK..', '.KRRRRRRK.', '.KRRSRRRK.', 'KRRRSRRRRK', 'KRRRSRRRRK', '.KRRSRRRK.', '.KRRRRRRK.', '.KRRRRRRK.', '..KRRRRK..', '..KK..KK..']),
  hollow: sprite(['...KKK....', '..KgggK...', '..KgeegK..', '..KgggK...', '...KgK....', '..KrrrK...', '.KrrgrrK..', 'KgKrrrKgK.', 'KgKrrrKgK.', '.K.rrr.K..', '..KrrrK...', '..KrKrK...', '..Kg.gK...', '..Kg.gK...', '..KK.KK...']),
  archer: sprite(['...KKK...w', '..KbbbK.w.', '..KbKbK.w.', '..KbbbK.w.', '...KbK..w.', '..KhhhKKw.', '.KbhbhbbwK', '.Kb.h..Kw.', '....h...w.', '...KhK..w.', '..KbKbK..w', '..Kb.bK...', '..Kb.bK...', '..KK.KK...']),
  hound: sprite(['..........KK..', '.........KggK.', 'KK......KggegK', 'KgKKKKKKggggK.', '.KggggggggKK..', '.KgrgggrgK....', '.KgKKKKKgK....', '.Kg.....Kg....', '.KK.....KK....']),
  caster: sprite(['...KKKK...', '..KttttK..', '.KttKKttK.', '.KtKeeKtK.', '..KggggK..', '..KnnnnK..', '.KnnnnnnK.', 'KgKnnnnKgK', 'KgKnnnnKgK', '.KnnnnnnK.', '.KnnnnnnK.', 'KnnnnnnnnK', 'KnnnnnnnnK', '.KKKKKKKK.']),
  bloat: sprite(['....KKKK....', '...KggggK...', '..KgeggegK..', '..KggKKggK..', '.KKggggggKK.', 'KggpgggpgggK', 'KgggggpggggK', 'KgpgggggggpK', 'KggggpgggggK', '.KgggggggggK', '..KgggggggK.', '..KgK..KgK..', '..KK....KK..']),
  knight: sprite(['....KKKK....', '...KiiiiK...', '...KiKKiK...', '...KieeiK...', '....KiiK....', '..KKiiiiKK..', '.KiiiiiiiiK.', 'KiKiitiiiKiK', 'KiKiiiiiiKiK', 'KbKiitiiiKbK', '.K.KiiiiK.K.', '...KiiiiK...', '...KiKKiK...', '...KiK.KiK..', '...KiK.KiK..', '..KKK..KKK..']),
  boss: sprite(['........KKKK........', '.......KbbbbK.......', '......KbKbbKbK......', '......KbeKKebK......', '......KbbKKbbK......', '.......KbbbbK.......', '....KKKKiiiiKKKK....', '...KiiiiiiiiiiiiK...', '..KitiiiiiiiiiitiK..', '..KiiiiiiddiiiiiiK..', '.KiiKiiiiddiiiiKiiK.', '.KiiKiiitddtiiiKiiK.', '.KiiKiiiiddiiiiKiiK.', 'KiiK.KiiiiiiiiK.KiiK', 'KbbK.KiittttiiK.KbbK', 'KbbK.KiiiiiiiiK.KbbK', '.KK..KiiiKKiiiK..KK.', '.....KiiiK.KiiK.....', '.....KiitK.KtiK.....', '.....KiiiK.KiiK.....', '.....KiiiK.KiiK.....', '....KiiiiK.KiiiK....', '....KKKKK...KKKK....']),
  vendor: sprite(['...KKKK...', '..KhhhhK..', '.KhKbbKhK.', '.KhbbbbhK.', '..KhbbhK..', '..KrrrrK..', '.KrrrrrrKy', '.KrryrrrKy', 'KrrrrrrrrK', 'KrrrrrrrrK', '.KrrrrrrK.', '.KrrrrrrK.', '..KrrrrK..', '..KK..KK..']),
  lantern: sprite(['...KK...', '..KyyK..', '.KyBByK.', '.KyBByK.', '.KyBByK.', '..KyyK..', '...KK...', '...hh...', '...hh...', '...hh...', '..hhhh..', '.hhhhhh.']),
  tree: sprite(['......K.....K..', '..K...Kw...Kw..', '..Kw..Kw..Kw...', '...Kw.Kw.Kw..K.', 'K...KwKwKw..Kw.', 'Kw...KwwwK.Kw..', '.Kw...KwwKKw...', '..KwwwKwwwK....', '....KKwwwwK....', '......KwwK.....', '......KwwK.....', '.....KwwwK.....', '......KwwK.....', '......KwwK.....', '......KwwwK....', '.....KwwwwK....', '....KwwwwwwK...', '...KKKKKKKKK...']),
  chest: sprite(['.KKKKKKKK.', 'KwwwwwwwwK', 'KyyyyyyyyK', 'KwwwKKwwwK', 'KwwwKyKwwK', 'KwwwwwwwwK', 'KwwwwwwwwK', '.KKKKKKKK.']),
  chestOpen: sprite(['.KKKKKKKK.', 'KKKKKKKKKK', 'KddddddddK', 'KwwwwwwwwK', 'KwwwwwwwwK', 'KwwwwwwwwK', 'KwwwwwwwwK', '.KKKKKKKK.']),
  shrine: sprite(['....KK....', '...KhhK...', '..KhhhhK..', '..KhBBhK..', '..KhBhhK..', '..KhBBhK..', '..KhhBhK..', '..KhBBhK..', '..KhhhhK..', '..KhhhhK..', '.KhhhhhhK.', '.KhhhhhhK.', 'KhhhhhhhhK', 'KKKKKKKKKK']),
  shrineUsed: sprite(['....KK....', '...KhhK...', '..KhhhhK..', '..KhddhK..', '..KhdhhK..', '..KhddhK..', '..KhhdhK..', '..KhddhK..', '..KhhhhK..', '..KhhhhK..', '.KhhhhhhK.', '.KhhhhhhK.', 'KhhhhhhhhK', 'KKKKKKKKKK']),
  cave: sprite(['.......KKKKKK.......', '.....KKhhhhhhKK.....', '...KKhhhKKKKhhhKK...', '..KhhhKKddddKKhhhK..', '.KhhhKddddddddKhhhK.', '.KhhKddddddddddKhhK.', 'KhhhKddddddddddKhhhK', 'KhhKddddddddddddKhhK', 'KhhKddddddddddddKhhK', 'KhhKddddddddddddKhhK', 'KhhKddddddddddddKhhK', 'KKKKKKKKKKKKKKKKKKKK']),
  gate: sprite(['...KKKKKKKK...', '..KhhhhhhhhK..', '.KhhKKKKKKhhK.', '.KhK......KhK.', 'KhhK......KhhK', 'KhK........KhK', 'KhK........KhK', 'KhK........KhK', 'KhK........KhK', 'KhK........KhK', 'KhK........KhK', 'KhK........KhK', 'KKK........KKK']),
  stairs: sprite(['....KKKKKK....', '...KyyyyyyK...', '..KhhhhhhhhK..', '..KhKKKKKKhK..', '.KhhhhhhhhhhK.', '.KhKKKKKKKKhK.', 'KhhhhhhhhhhhhK', 'KhKKKKKKKKKKhK', 'KhhhhhhhhhhhhK', 'KKKKKKKKKKKKKK'])
};
SPR.treeB = tint(SPR.tree, '#1f2a1d', 0.35);
SPR.treeC = tint(SPR.tree, '#2b2320', 0.3);
SPR.champTint = null;

// =================================================================== item icons
const CELL = 12;
function icon(id, w, h) {
  const c = mkCanvas(w * CELL, h * CELL), x = c.getContext('2d');
  const R = (col, a, b, cw, ch) => { x.fillStyle = col; x.fillRect(a, b, cw, ch); };
  const cx = w * CELL / 2 | 0;
  switch (id) {
    case 'wand': R('#cfc6ae', cx - 1, 7, 2, 15); R('#e8e2d0', cx - 3, 2, 6, 5); R('#0e0d12', cx - 2, 4, 1, 1); R('#0e0d12', cx + 1, 4, 1, 1); R('#8f8a7c', cx - 1, 20, 2, 2); break;
    case 'dagger': R('#b9bec6', cx - 1, 2, 3, 13); R('#e6e9ee', cx, 3, 1, 10); R('#d9a441', cx - 4, 15, 9, 2); R('#5a4330', cx - 1, 17, 3, 6); break;
    case 'claw': for (let i = 0; i < 3; i++) { R('#b9bec6', cx - 3 + i * 2, 2 + i, 1, 11); R('#e6e9ee', cx - 3 + i * 2, 2 + i, 1, 4); } R('#3a2248', cx - 4, 13, 7, 3); R('#5a4436', cx - 3, 16, 5, 7); R('#b070e0', cx - 1, 14, 1, 1); break;
    case 'talons': for (let i = 0; i < 3; i++) { R('#cfc6ae', cx - 4 + i * 3, 1 + i, 1, 20); R('#f4efe2', cx - 4 + i * 3, 1 + i, 1, 6); R('#8f8a7c', cx - 3 + i * 3, 6 + i, 1, 12); } R('#3a2248', cx - 5, 21, 10, 3); R('#5a4436', cx - 3, 24, 6, 10); R('#e8e2d0', cx - 1, 22, 2, 1); break;
    case 'staff': R('#5a4330', cx - 1, 8, 3, 27); R('#6b4a2e', cx, 8, 1, 27); R('#9fd8ff', cx - 3, 1, 7, 7); R('#e8f7ff', cx - 1, 3, 3, 3); break;
    case 'relic': R('#e8e2d0', 5, 3, 14, 12); R('#cfc6ae', 7, 15, 10, 5); R('#0e0d12', 8, 7, 3, 3); R('#0e0d12', 13, 7, 3, 3); R('#0e0d12', 9, 16, 1, 3); R('#0e0d12', 12, 16, 1, 3); R('#0e0d12', 15, 16, 1, 3); break;
    case 'hood': R('#3a3446', 5, 3, 14, 17); R('#2a2536', 7, 7, 10, 13); R('#0e0d12', 9, 10, 6, 8); break;
    case 'mask': R('#e8e2d0', 5, 4, 14, 16); R('#cfc6ae', 5, 16, 14, 4); R('#0e0d12', 7, 9, 4, 3); R('#0e0d12', 13, 9, 4, 3); R('#8f8a7c', 11, 13, 2, 4); break;
    case 'robe': R('#2a2536', 4, 3, 16, 31); R('#3a3446', 6, 3, 12, 6); R('#c9c3b0', 11, 9, 2, 25); R('#1c1b22', 4, 30, 16, 4); break;
    case 'mail': R('#3b3f47', 3, 3, 18, 28); R('#5a606b', 5, 5, 14, 3); R('#7a3b2a', 5, 18, 14, 2); for (let i = 0; i < 6; i++) R('#2a2d33', 5, 9 + i * 3, 14, 1); break;
    case 'gloves': R('#4a3f35', 4, 6, 7, 12); R('#4a3f35', 13, 6, 7, 12); R('#6b5a48', 4, 6, 7, 3); R('#6b5a48', 13, 6, 7, 3); break;
    case 'boots': R('#3d3226', 4, 4, 6, 14); R('#3d3226', 4, 14, 10, 5); R('#3d3226', 14, 4, 6, 14); R('#5a4330', 4, 4, 6, 2); R('#5a4330', 14, 4, 6, 2); break;
    case 'belt': R('#5a4330', 1, 4, 22, 5); R('#d9a441', 10, 3, 5, 7); R('#0e0d12', 12, 5, 1, 3); break;
    case 'amulet': R('#8f8a7c', 3, 1, 1, 5); R('#8f8a7c', 8, 1, 1, 5); R('#8f8a7c', 4, 5, 4, 1); R('#9fd8ff', 4, 6, 4, 4); R('#e8f7ff', 5, 7, 1, 1); break;
    case 'ring': R('#d9a441', 3, 3, 6, 1); R('#d9a441', 3, 8, 6, 1); R('#d9a441', 2, 4, 1, 4); R('#d9a441', 9, 4, 1, 4); R('#c8553d', 5, 2, 2, 2); break;
    case 'hp': case 'mp': { const col = id === 'hp' ? '#b3202e' : '#3a6fd8'; R('#8f8a7c', 5, 1, 2, 2); R('#cfc6ae', 4, 3, 4, 1); R(col, 3, 4, 6, 6); R('#ffffff', 4, 5, 1, 1); break; }
    default: R('#8f8a7c', 3, 3, w * CELL - 6, h * CELL - 6);
  }
  return c;
}
const ICONS = {};
function getIcon(id, w, h) { const k = id + w + 'x' + h; if (!ICONS[k]) { ICONS[k] = icon(id, w, h); ICONS[k]._autoHR = 'spr'; } return ICONS[k]; }

// =================================================================== tiles
const T = { GRASS: 0, ROAD: 1, TREE: 2, ROCK: 3, WATER: 4, CLIFF: 5, FLOOR: 6, WALL: 7, FOG: 8, PILLAR: 9, PALISADE: 10, DIRT: 11, SHALLOW: 12, MUD: 13, FLAGS: 14 };
const SOLID = new Uint8Array(16);
[T.TREE, T.ROCK, T.WATER, T.CLIFF, T.WALL, T.FOG, T.PILLAR, T.PALISADE].forEach(t => SOLID[t] = 1);
const TALL = new Uint8Array(16);
[T.TREE, T.ROCK, T.CLIFF, T.WALL, T.FOG, T.PILLAR, T.PALISADE].forEach(t => TALL[t] = 1);
const GRAIN = 1.5, TW = 36, TH = 18;   // v0.36: realistic scale and a finer grain: a yard is 36 x 18 art pixels (was 24 x 12); GRAIN is the ratio to the old grain
const ISO_R = TW * 0.7071, ISO_RY = TH * 0.7071;   // one yard on screen, across and down
function makeTile(fill, specks, seed) {
  const c = mkCanvas(TW, TH + 1), x = c.getContext('2d');
  x.fillStyle = fill;
  for (let r = 0; r < 8; r++) { const hw = r < 4 ? (r + 1) * 2 : (8 - r) * 2; x.fillRect(8 - hw, r, hw * 2, 1); }
  const rng = mulberry32(seed);
  specks.forEach(([col, n]) => {
    x.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const r = 1 + Math.floor(rng() * 6), hw = r < 4 ? (r + 1) * 2 : (8 - r) * 2;
      x.fillRect(8 - hw + 1 + Math.floor(rng() * Math.max(1, hw * 2 - 2)), r, 1, 1);
    }
  });
  return c;
}
const TILES = {
  grass: [0, 1, 2, 3, 4, 5].map(s => makeTile(['#2b2d27', '#2a2b26', '#2d3028', '#282924', '#2e2f29', '#2a2c25'][s], [['#3a4231', 5], ['#20211d', 4], ['#4a5238', s % 2]], s + 1)),
  road: [0, 1, 2].map(s => makeTile('#39322a', [['#463d33', 6], ['#2c2621', 5]], s + 20)),
  dirt: [0, 1].map(s => makeTile('#33302b', [['#3f3a33', 5], ['#26241f', 4]], s + 30)),
  water: [0, 1].map(s => makeTile('#131b26', [['#1a2533', 4]], s + 40)),
  floor: [0, 1, 2, 3].map(s => makeTile(['#26232b', '#24212a', '#27252b', '#221f27'][s], [['#302c37', 4], ['#1a181e', 4], ['#35402c', s === 2 ? 3 : 0]], s + 50)),
  arena: [0, 1].map(s => makeTile('#2a2322', [['#3a2a26', 4], ['#1b1716', 4]], s + 60)),
  fen: [0, 1, 2, 3].map(s => makeTile(['#232a22', '#222821', '#252c23', '#20261f'][s], [['#2f3a2a', 5], ['#1a1f18', 4], ['#3a4a30', s % 2]], s + 70)),
  bog: [0, 1].map(s => makeTile('#15201b', [['#1d2c24', 4], ['#26382a', 2]], s + 80)),
  bone: [0, 1, 2, 3].map(s => makeTile(['#2e2b27', '#2c2925', '#302d28', '#2a2723'][s], [['#3d3a33', 4], ['#201e1b', 4], ['#4a463d', s === 1 ? 2 : 0]], s + 90)),
  barrow: [0, 1, 2].map(s => makeTile(['#2b251f', '#29231d', '#2d2720'][s], [['#382f26', 4], ['#1d1915', 4]], s + 100))
};
function floorTileFor(z, x, y, t) {
  const hv = hash(x, y);
  switch (t) {
    case T.GRASS: case T.TREE: case T.ROCK: return z.theme === 'fen' ? TILES.fen[Math.floor(hv * 4)] : TILES.grass[Math.floor(hv * 6)];
    case T.ROAD: return TILES.road[Math.floor(hv * 3)];
    case T.DIRT: case T.PALISADE: return TILES.dirt[Math.floor(hv * 2)];
    case T.WATER: return z.theme === 'fen' ? TILES.bog[Math.floor(hv * 2)] : TILES.water[Math.floor(hv * 2)];
    case T.FLOOR: case T.FOG: case T.PILLAR: return z.inBoss && z.inBoss(x, y) ? TILES.arena[Math.floor(hv * 2)] : z.theme === 'bone' ? TILES.bone[Math.floor(hv * 4)] : z.theme === 'barrow' ? TILES.barrow[Math.floor(hv * 3)] : TILES.floor[Math.floor(hv * 4)];
    default: return null;
  }
}

// =================================================================== zones
class Zone {
  constructor(id, name, w, h, dark) {
    Object.assign(this, { id, name, w, h, dark });
    this.t = new Uint8Array(w * h);
    this.explored = new Uint8Array(w * h);
    this.objects = []; this.monsters = []; this.items = []; this.lanterns = [];
    this.stamp = new Int32Array(w * h); this.g = new Float32Array(w * h); this.came = new Int32Array(w * h); this.closed = new Int32Array(w * h);
    this.gen = 0;
  }
  get(x, y) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return T.CLIFF; return this.t[y * this.w + x]; }
  set(x, y, v) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.t[y * this.w + x] = v; }
  solidAt(x, y) { return SOLID[this.get(Math.floor(x), Math.floor(y))] === 1; }
  walkTile(x, y) { return SOLID[this.get(x, y)] === 0; }
}

function floodFrom(z, sx, sy) {
  const seen = new Uint8Array(z.w * z.h), q = new Int32Array(z.w * z.h);
  let h = 0, tl = 0; q[tl++] = sy * z.w + sx; seen[sy * z.w + sx] = 1;
  while (h < tl) {
    const i = q[h++], x = i % z.w, y = (i / z.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= z.w || ny >= z.h) continue;
      const j = ny * z.w + nx;
      if (!seen[j] && z.walkTile(nx, ny)) { seen[j] = 1; q[tl++] = j; }
    }
  }
  return seen;
}
function bfsDist(z, sx, sy) {
  const d = new Int32Array(z.w * z.h).fill(-1), q = new Int32Array(z.w * z.h);
  let h = 0, tl = 0; q[tl++] = sy * z.w + sx; d[sy * z.w + sx] = 0;
  while (h < tl) {
    const i = q[h++], x = i % z.w, y = (i / z.w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, j = ny * z.w + nx;
      if (nx < 0 || ny < 0 || nx >= z.w || ny >= z.h || d[j] >= 0 || !z.walkTile(nx, ny)) continue;
      d[j] = d[i] + 1; q[tl++] = j;
    }
  }
  return d;
}
function carveRoad(z, ax, ay, bx, by, rng) {
  let x = ax, y = ay, guard = 0;
  while ((Math.abs(x - bx) > 1 || Math.abs(y - by) > 1) && guard++ < 6000) {
    const dx = Math.sign(bx - x), dy = Math.sign(by - y);
    if (rng() < 0.62) { if ((rng() < 0.5 && dx) || !dy) x += dx; else y += dy; }
    else { const r = rng(); if (r < .25) x++; else if (r < .5) x--; else if (r < .75) y++; else y--; }
    x = clamp(x, 4, z.w - 6); y = clamp(y, 4, z.h - 6);
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const t = z.get(x + i, y + j);
      if (t !== T.CLIFF && t !== T.PALISADE && t !== T.DIRT) z.set(x + i, y + j, T.ROAD);
    }
  }
}
function clearArea(z, cx, cy, r, v) { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) { const t = z.get(x, y); if (t !== T.CLIFF) z.set(x, y, v); } }

const PACKS_LOW = [['hollow', 3, 5], ['hound', 3, 5], ['hollow', 2, 3, 'archer', 1, 2], ['worm', 1, 2], ['moth', 2, 2]];
const PACKS_MID = [['hollow', 2, 4, 'archer', 1, 2], ['hound', 4, 6], ['caster', 2, 3, 'hollow', 1, 3], ['archer', 3, 4], ['pyre', 1, 2, 'hollow', 2, 3], ['moth', 2, 3], ['worm', 2, 2]];
const PACKS_HIGH = [['bloat', 2, 3, 'hollow', 2, 3], ['caster', 2, 4], ['hound', 5, 7], ['archer', 2, 3, 'bloat', 1, 2], ['bell', 1, 1, 'hollow', 2, 3], ['pyre', 2, 3], ['moth', 3, 3, 'archer', 1, 1]];
const PACKS_CRYPT = [['knight', 2, 3], ['knight', 1, 2, 'archer', 2, 3], ['caster', 2, 3, 'knight', 1, 1], ['bloat', 2, 4], ['hollow', 4, 6], ['pyre', 1, 2, 'hollow', 2, 2]];
function placePack(z, x, y, mlvl, table, packId, rng) {
  const def = table[Math.floor(rng() * table.length)];
  const roll = rng();
  const early = mlvl <= 3, rank = roll < (early ? 0.04 : 0.08) ? 'unique' : roll < (early ? 0.1 : 0.2) ? 'champion' : 'normal';
  const mods = [];
  if (rank !== 'normal') { const pool = ['Extra Fast', 'Extra Strong', 'Stone Skin']; mods.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]); if (rank === 'unique' && rng() < .5) mods.push(pool[Math.floor(rng() * pool.length)]); }
  let first = true;
  for (let k = 0; k < def.length; k += 3) {
    let n = def[k + 1] + Math.floor(rng() * (def[k + 2] - def[k + 1] + 1));
    if (early) n = Math.max(1, Math.round(n * 0.65));   // v0.20: smaller packs in the opening areas, so they don't swarm
    for (let i = 0; i < n; i++) {
      let px = x + (rng() - .5) * 3, py = y + (rng() - .5) * 3, tries = 0;
      while (z.solidAt(px, py) && tries++ < 12) { px = x + (rng() - .5) * 4; py = y + (rng() - .5) * 4; }
      if (z.solidAt(px, py)) continue;
      const r = rank === 'unique' ? (first ? 'unique' : 'minion') : rank;
      const m = makeMon(def[k], px, py, mlvl, r, mods);
      m.pack = packId; z.monsters.push(m); first = false;
    }
  }
}

function genMoor(seed) {
  const rng = mulberry32(seed), R = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const z = new Zone('moor', 'Ashen Moor', 150, 150, 0.3); z.theme = 'moor';
  const n1 = makeNoise(rng), n2 = makeNoise(rng), n3 = makeNoise(rng);
  for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++) {
    const edge = Math.min(x, y, z.w - 1 - x, z.h - 1 - y);
    const f = fbm(n1, x / 12, y / 12), wv = fbm(n2, x / 20 + 50, y / 20 + 50), r = n3(x / 2.3, y / 2.3);
    let t = T.GRASS;
    if (edge < 3 || (edge < 6 && f > 0.44)) t = T.CLIFF;
    else if (wv < 0.3) t = T.WATER;
    else if (f > 0.57) t = T.TREE;
    else if (f > 0.5 && r > 0.6) t = T.TREE;
    else if (r > 0.95) t = T.ROCK;
    z.set(x, y, t);
  }
  // camp
  const C = { x0: 5, y0: 5, x1: 25, y1: 25 };
  for (let y = C.y0; y <= C.y1; y++) for (let x = C.x0; x <= C.x1; x++) {
    const ring = x === C.x0 || y === C.y0 || x === C.x1 || y === C.y1;
    z.set(x, y, ring ? T.PALISADE : T.DIRT);
  }
  for (let k = 13; k <= 16; k++) { z.set(C.x1, k, T.ROAD); z.set(k, C.y1, T.ROAD); }
  for (let k = C.x0 + 1; k < C.x1; k++) { z.set(k, 14, T.ROAD); z.set(k, 15, T.ROAD); z.set(14, k, T.ROAD); z.set(15, k, T.ROAD); }
  for (let y = C.y1 + 1; y <= C.y1 + 3; y++) for (let x = C.x0; x <= C.x1 + 3; x++) if (z.get(x, y) !== T.CLIFF) z.set(x, y, T.GRASS);
  for (let x = C.x1 + 1; x <= C.x1 + 3; x++) for (let y = C.y0; y <= C.y1 + 3; y++) if (z.get(x, y) !== T.CLIFF) z.set(x, y, T.GRASS);
  // key sites
  const mid = { x: R(66, 84), y: R(66, 84) };
  const cave = { x: R(122, 138), y: R(122, 138) };
  const east = { x: R(115, 135), y: R(20, 40) };
  const south = { x: R(20, 40), y: R(115, 135) };
  clearArea(z, mid.x, mid.y, 3, T.DIRT); clearArea(z, cave.x, cave.y, 4, T.GRASS); clearArea(z, east.x, east.y, 3, T.GRASS); clearArea(z, south.x, south.y, 3, T.GRASS);
  carveRoad(z, C.x1 + 1, 14, mid.x, mid.y, rng);
  carveRoad(z, 14, C.y1 + 1, mid.x, mid.y, rng);
  carveRoad(z, mid.x, mid.y, cave.x, cave.y, rng);
  carveRoad(z, mid.x, mid.y, east.x, east.y, rng);
  carveRoad(z, mid.x, mid.y, south.x, south.y, rng);
  // connectivity
  const seen = floodFrom(z, 15, 15);
  for (let i = 0; i < z.t.length; i++) if (!seen[i] && SOLID[z.t[i]] === 0) z.t[i] = T.TREE;
  // objects
  z.start = { x: 15.5, y: 18.5 };
  z.lanterns.push({ x: 15.5, y: 12.5, name: 'Lantern Camp' });
  z.lanterns.push({ x: mid.x + 0.5, y: mid.y + 0.5, name: 'Crossroads' });
  z.lanterns.forEach((l, i) => z.objects.push({ type: 'lantern', x: l.x, y: l.y, idx: i, name: l.name }));
  z.objects.push({ type: 'vendor', x: 10.5, y: 10.5, name: 'Maren the Gravekeeper' });
  z.objects.push({ type: 'portal', x: cave.x + 0.5, y: cave.y + 0.5, to: 'crypt', name: 'Hollow Crypt', spr: 'cave' });
  z.caveOut = { x: cave.x + 0.5, y: cave.y + 2.5 };
  z.objects.push({ type: 'portal', x: east.x + 0.5, y: east.y + 0.5, to: 'fen', name: 'Road to the Drowned Fen', spr: 'gate' });
  z.objects.push({ type: 'portal', x: south.x + 0.5, y: south.y + 0.5, to: 'barrow', name: 'Old Barrow', spr: 'cave' });
  z.arrive = { crypt: z.caveOut, fen: { x: east.x + 0.5, y: east.y + 2.5 }, barrow: { x: south.x + 0.5, y: south.y + 2.5 } };
  const d0 = bfsDist(z, 15, 15);
  const spots = [];
  for (let y = 4; y < z.h - 4; y++) for (let x = 4; x < z.w - 4; x++) { const i = y * z.w + x; if (d0[i] > 30 && (z.t[i] === T.GRASS || z.t[i] === T.ROAD)) spots.push([x, y, d0[i]]); }
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  const used = [];
  const farEnough = (x, y, r) => used.every(([ux, uy]) => Math.hypot(ux - x, uy - y) > r);
  let chests = 0, shrines = 0, packs = 0;
  for (const [x, y, d] of spots) {
    if (packs < 80 && farEnough(x, y, 8)) {
      const mlvl = clamp(1 + Math.floor(d / 28), 1, 6);
      placePack(z, x + .5, y + .5, mlvl, mlvl <= 2 ? PACKS_LOW : mlvl <= 4 ? PACKS_MID : PACKS_HIGH, 'm' + packs, rng);
      used.push([x, y]); packs++; continue;
    }
    if (chests < 26 && z.t[y * z.w + x] === T.GRASS && farEnough(x, y, 4)) { z.objects.push({ type: 'chest', x: x + .5, y: y + .5, open: false, ilvl: clamp(1 + Math.floor(d / 28), 1, 6) }); used.push([x, y]); chests++; continue; }
    if (shrines < 9 && z.t[y * z.w + x] === T.GRASS && farEnough(x, y, 5)) { z.objects.push({ type: 'shrine', x: x + .5, y: y + .5, used: false, kind: pick(['echo', 'wisp', 'stone', 'refill']) }); used.push([x, y]); shrines++; }
  }
  return z;
}

// =================================================================== more zones (v0.5)
const PACKS_FEN = [['drowned', 3, 5], ['leech', 2, 3], ['bogwitch', 2, 3, 'drowned', 1, 3], ['drowned', 2, 3, 'archer', 1, 2], ['bloat', 2, 3, 'drowned', 1, 2], ['moth', 3, 4], ['pyre', 2, 3], ['bell', 1, 1, 'drowned', 2, 2]];
const PACKS_BONE = [['marrow', 2, 3], ['marrow', 1, 2, 'ossarcher', 2, 3], ['ossarcher', 3, 4], ['bogwitch', 2, 3, 'marrow', 1, 1], ['bloat', 2, 4, 'marrow', 1, 1], ['hollow', 5, 7], ['knight', 2, 2, 'marrow', 1, 1]];
function genFen(seed) {
  const rng = mulberry32(seed), R = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const z = new Zone('fen', 'Drowned Fen', 130, 130, 0.45); z.theme = 'fen';
  const n1 = makeNoise(rng), n2 = makeNoise(rng), n3 = makeNoise(rng);
  for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++) {
    const edge = Math.min(x, y, z.w - 1 - x, z.h - 1 - y);
    const f = fbm(n1, x / 10, y / 10), wv = fbm(n2, x / 14 + 20, y / 14 + 20), r = n3(x / 2.1, y / 2.1);
    let t = T.GRASS;
    if (edge < 3 || (edge < 5 && f > 0.46)) t = T.CLIFF;
    else if (wv < 0.4) t = T.WATER;
    else if (f > 0.6) t = T.TREE;
    else if (f > 0.52 && r > 0.55) t = T.TREE;
    else if (r > 0.96) t = T.ROCK;
    z.set(x, y, t);
  }
  const entry = { x: 7, y: R(55, 75) };
  const chapel = { x: R(55, 72), y: R(55, 72) };
  const cata = { x: R(105, 118), y: R(105, 118) };
  const ne = { x: R(98, 115), y: R(12, 28) };
  const sw = { x: R(18, 34), y: R(100, 116) };
  clearArea(z, entry.x + 2, entry.y, 3, T.GRASS); clearArea(z, chapel.x, chapel.y, 4, T.DIRT); clearArea(z, cata.x, cata.y, 4, T.GRASS);
  clearArea(z, ne.x, ne.y, 3, T.DIRT); clearArea(z, sw.x, sw.y, 3, T.DIRT);
  // a drowned chapel ruin: broken pillars around the lantern
  [[-3, -3], [3, -3], [-3, 3], [3, 3], [0, -4]].forEach(([i, j]) => { if (rng() < 0.8) z.set(chapel.x + i, chapel.y + j, T.PILLAR); });
  carveRoad(z, entry.x + 2, entry.y, chapel.x, chapel.y, rng);
  carveRoad(z, chapel.x, chapel.y, cata.x, cata.y, rng);
  carveRoad(z, chapel.x, chapel.y, ne.x, ne.y, rng);
  carveRoad(z, chapel.x, chapel.y, sw.x, sw.y, rng);
  const seen = floodFrom(z, entry.x + 2, entry.y);
  for (let i = 0; i < z.t.length; i++) if (!seen[i] && SOLID[z.t[i]] === 0) z.t[i] = T.WATER;
  z.start = { x: entry.x + 2.5, y: entry.y + 0.5 };
  z.lanterns.push({ x: entry.x + 3.5, y: entry.y - 1.5, name: "Fen's Edge" });
  z.lanterns.push({ x: chapel.x + 0.5, y: chapel.y + 0.5, name: 'Sunken Chapel' });
  z.lanterns.forEach((l, i) => z.objects.push({ type: 'lantern', x: l.x, y: l.y, idx: i, name: l.name }));
  z.objects.push({ type: 'portal', x: entry.x + 0.5, y: entry.y + 0.5, to: 'moor', name: 'Road to the Ashen Moor', spr: 'gate' });
  z.objects.push({ type: 'portal', x: cata.x + 0.5, y: cata.y + 0.5, to: 'cata1', name: 'Bone Catacombs', spr: 'stairs' });
  z.arrive = { moor: z.start, cata1: { x: cata.x + 0.5, y: cata.y + 2.5 } };
  // treasure at the far sites
  [ne, sw].forEach(s => { z.objects.push({ type: 'chest', x: s.x + 1.5, y: s.y + 0.5, open: false, ilvl: 10 }); z.objects.push({ type: 'chest', x: s.x - 0.5, y: s.y + 1.5, open: false, ilvl: 10 }); });
  const d0 = bfsDist(z, entry.x + 2, entry.y);
  const spots = [];
  for (let y = 4; y < z.h - 4; y++) for (let x = 4; x < z.w - 4; x++) { const i = y * z.w + x; if (d0[i] > 18 && (z.t[i] === T.GRASS || z.t[i] === T.ROAD || z.t[i] === T.DIRT)) spots.push([x, y, d0[i]]); }
  for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
  const used = [[ne.x, ne.y], [sw.x, sw.y]];
  const farEnough = (x, y, r) => used.every(([ux, uy]) => Math.hypot(ux - x, uy - y) > r);
  // guardians at the treasure sites
  placePack(z, ne.x + .5, ne.y + .5, 11, PACKS_FEN, 'fne', rng); placePack(z, sw.x + .5, sw.y + .5, 11, PACKS_FEN, 'fsw', rng);
  let chests = 0, shrines = 0, packs = 0;
  for (const [x, y, d] of spots) {
    if (packs < 70 && farEnough(x, y, 8)) { placePack(z, x + .5, y + .5, clamp(6 + Math.floor(d / 24), 6, 11), PACKS_FEN, 'f' + packs, rng); used.push([x, y]); packs++; continue; }
    if (chests < 16 && z.t[y * z.w + x] === T.GRASS && farEnough(x, y, 4)) { z.objects.push({ type: 'chest', x: x + .5, y: y + .5, open: false, ilvl: clamp(6 + Math.floor(d / 24), 6, 11) }); used.push([x, y]); chests++; continue; }
    if (shrines < 7 && z.t[y * z.w + x] === T.GRASS && farEnough(x, y, 5)) { z.objects.push({ type: 'shrine', x: x + .5, y: y + .5, used: false, kind: pick(['echo', 'wisp', 'stone', 'refill']) }); used.push([x, y]); shrines++; }
  }
  return z;
}
// rooms-and-corridors dungeons: the Crypt, the Barrow and both Catacomb levels
function genDungeon(o) {
  const rng = mulberry32(o.seed), R = (a, b) => a + Math.floor(rng() * (b - a + 1));
  const z = new Zone(o.id, o.name, o.size, o.size, o.dark); z.theme = o.theme;
  z.t.fill(T.WALL);
  const rooms = [];
  for (let i = 0; i < 500 && rooms.length < o.rooms; i++) {
    const w = R(7, 13), h = R(7, 13), x = R(2, z.w - w - 3), y = R(2, z.h - h - 3);
    if (rooms.some(r => x < r.x + r.w + 3 && x + w + 3 > r.x && y < r.y + r.h + 3 && y + h + 3 > r.y)) continue;
    rooms.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
  }
  rooms.sort((a, b) => (a.cx + a.cy) - (b.cx + b.cy));
  const carveRect = (x0, y0, x1, y1) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (x > 0 && y > 0 && x < z.w - 1 && y < z.h - 1) z.set(x, y, T.FLOOR); };
  rooms.forEach(r => carveRect(r.x, r.y, r.x + r.w - 1, r.y + r.h - 1));
  const corridor = (a, b) => {
    const ax = Math.floor(a.cx), ay = Math.floor(a.cy), bx = Math.floor(b.cx), by = Math.floor(b.cy);
    if (rng() < .5) { carveRect(ax, ay, bx, ay + 1); carveRect(bx, ay, bx + 1, by); }
    else { carveRect(ax, ay, ax + 1, by); carveRect(ax, by, bx, by + 1); }
  };
  for (let i = 1; i < rooms.length; i++) {
    let best = 0, bd = 1e9;
    for (let j = 0; j < i; j++) { const d = Math.hypot(rooms[i].cx - rooms[j].cx, rooms[i].cy - rooms[j].cy); if (d < bd) { bd = d; best = j; } }
    corridor(rooms[i], rooms[best]);
  }
  for (let k = 0; k < 3; k++) corridor(rooms[R(0, rooms.length - 1)], rooms[R(0, rooms.length - 1)]);
  const start = rooms[0];
  const d0 = bfsDist(z, Math.floor(start.cx), Math.floor(start.cy));
  const rd = r => d0[Math.floor(r.cy) * z.w + Math.floor(r.cx)];
  const byFar = rooms.filter(r => r !== start).sort((a, b) => rd(b) - rd(a));
  let boss = null, down = null;
  if (o.boss) {
    boss = byFar.find(r => r.w >= 9 && r.h >= 9) || byFar[0];
    z.bossRoom = boss;
    z.inBoss = (x, y) => x >= boss.x && y >= boss.y && x < boss.x + boss.w && y < boss.y + boss.h;
  }
  if (o.down) down = byFar.find(r => r !== boss) || byFar[0];
  rooms.forEach(r => { if (r.w >= 10 && r.h >= 10) [[3, 3], [r.w - 4, 3], [3, r.h - 4], [r.w - 4, r.h - 4]].forEach(([i, j]) => z.set(r.x + i, r.y + j, T.PILLAR)); });
  z.start = { x: start.cx, y: start.cy + 1.5 };
  z.arrive = { [o.up.to]: z.start };
  z.objects.push({ type: 'portal', x: start.cx - 1.5, y: start.cy - 1.5, to: o.up.to, name: o.up.name, spr: 'stairs' });
  z.lanterns.push({ x: start.cx + 1.5, y: start.cy - 1.5, name: o.lantern });
  z.objects.push({ type: 'lantern', x: start.cx + 1.5, y: start.cy - 1.5, idx: 0, name: o.lantern });
  if (down) {
    z.objects.push({ type: 'portal', x: down.cx, y: down.cy - 1, to: o.down.to, name: o.down.name, spr: 'stairs' });
    z.arrive[o.down.to] = { x: down.cx, y: down.cy + 1.2 };
  }
  let packId = 0; const far = Math.max(1, rd(byFar[0]));
  rooms.forEach(r => {
    if (r === start || r === boss) return;
    const mlvl = clamp(o.lo + Math.round((o.hi - o.lo) * rd(r) / far), o.lo, o.hi);
    const n = r.w * r.h > 90 ? 2 : 1;
    for (let k = 0; k < n; k++) placePack(z, r.x + 2 + rng() * (r.w - 4), r.y + 2 + rng() * (r.h - 4), mlvl, o.packs, o.id + (packId++), rng);
    if (rng() < (o.chests || 0.4)) z.objects.push({ type: 'chest', x: r.x + 1.5, y: r.y + 1.5, open: false, ilvl: mlvl + 1 });
  });
  if (!o.boss && !o.down) { const f = byFar[0]; z.objects.push({ type: 'chest', x: f.cx + 1, y: f.cy, open: false, ilvl: o.hi + 1 }); z.objects.push({ type: 'chest', x: f.cx - 1, y: f.cy, open: false, ilvl: o.hi + 1 }); placePack(z, f.cx, f.cy + 1, o.hi + 1, o.packs, 'lord', rng); }
  if (o.boss) { const b = makeMon(o.boss.type, boss.cx, boss.cy, o.boss.lvl, 'boss', []); b.pack = 'boss'; z.monsters.push(b); z.boss = b; }
  return z;
}
function genCrypt(seed) { return genDungeon({ id: 'crypt', name: 'Hollow Crypt', seed, size: 84, rooms: 16, dark: 0.8, theme: 'crypt', lo: 6, hi: 8, packs: PACKS_CRYPT, up: { to: 'moor', name: 'Ashen Moor' }, lantern: 'Crypt Threshold', boss: { type: 'boss', lvl: 9 } }); }
const ZONE_NAMES = { moor: 'Ashen Moor', crypt: 'Hollow Crypt', fen: 'Drowned Fen', barrow: 'Old Barrow', cata1: 'Bone Catacombs I', cata2: 'Bone Catacombs II' };
const ZONE_GEN = {
  moor: s => genMoor(s),
  crypt: s => genCrypt(s * 7 + 3),
  fen: s => genFen(s * 13 + 5),
  barrow: s => genDungeon({ id: 'barrow', name: 'Old Barrow', seed: s * 17 + 1, size: 60, rooms: 10, dark: 0.75, theme: 'barrow', lo: 3, hi: 6, packs: PACKS_MID, chests: 0.55, up: { to: 'moor', name: 'Ashen Moor' }, lantern: 'Barrow Mouth' }),
  cata1: s => genDungeon({ id: 'cata1', name: 'Bone Catacombs I', seed: s * 19 + 7, size: 90, rooms: 18, dark: 0.82, theme: 'bone', lo: 10, hi: 13, packs: PACKS_BONE, up: { to: 'fen', name: 'Drowned Fen' }, down: { to: 'cata2', name: 'Bone Catacombs II' }, lantern: 'Ossuary Stair' }),
  cata2: s => genDungeon({ id: 'cata2', name: 'Bone Catacombs II', seed: s * 23 + 11, size: 84, rooms: 16, dark: 0.85, theme: 'bone', lo: 13, hi: 15, packs: PACKS_BONE, up: { to: 'cata1', name: 'Bone Catacombs I' }, lantern: 'Marrow Deep', boss: { type: 'matron', lvl: 16 } })
};

// =================================================================== pathfinding
class Heap {
  constructor() { this.a = []; }
  push(n, f) { const a = this.a; a.push([f, n]); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p][0] <= a[i][0]) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < a.length && a[l][0] < a[m][0]) m = l; if (r < a.length && a[r][0] < a[m][0]) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top[1]; }
  get size() { return this.a.length; }
}
let pathBudget = 0;
function nearestWalk(z, tx, ty) {
  if (z.walkTile(tx, ty)) return [tx, ty];
  for (let r = 1; r <= 3; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (z.walkTile(tx + i, ty + j)) return [tx + i, ty + j];
  return null;
}
function findPath(z, sx, sy, tx, ty, maxNodes = 4000) {
  const s = [Math.floor(sx), Math.floor(sy)], t0 = nearestWalk(z, Math.floor(tx), Math.floor(ty));
  if (!t0) return null;
  const [gx, gy] = t0, W0 = z.w;
  const gen = ++z.gen, si = s[1] * W0 + s[0], gi = gy * W0 + gx;
  const open = new Heap();
  z.stamp[si] = gen; z.g[si] = 0; z.came[si] = -1; z.closed[si] = 0;
  open.push(si, 0);
  let n = 0, found = false;
  const hfn = (x, y) => { const dx = Math.abs(x - gx), dy = Math.abs(y - gy); return (dx + dy) + (1.414 - 2) * Math.min(dx, dy); };
  while (open.size && n++ < maxNodes) {
    const i = open.pop();
    if (z.closed[i] === gen) continue;
    z.closed[i] = gen;
    if (i === gi) { found = true; break; }
    const x = i % W0, y = (i / W0) | 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (!z.walkTile(nx, ny)) continue;
      if (dx && dy && (!z.walkTile(x + dx, y) || !z.walkTile(x, y + dy))) continue;
      const j = ny * W0 + nx, cost = z.g[i] + (dx && dy ? 1.414 : 1);
      if (z.stamp[j] !== gen) { z.stamp[j] = gen; z.closed[j] = 0; z.g[j] = Infinity; }
      if (z.closed[j] === gen || cost >= z.g[j]) continue;
      z.g[j] = cost; z.came[j] = i;
      open.push(j, cost + hfn(nx, ny));
    }
  }
  if (!found) return null;
  const pts = [];
  for (let i = gi; i !== si && i >= 0; i = z.came[i]) pts.push({ x: (i % W0) + .5, y: ((i / W0) | 0) + .5 });
  pts.reverse();
  if (pts.length) { pts[pts.length - 1] = { x: clamp(tx, gx + .1, gx + .9), y: clamp(ty, gy + .1, gy + .9) }; }
  // smooth
  const out = []; let cur = { x: sx, y: sy }, k = 0;
  while (k < pts.length) {
    let far = k;
    for (let m = Math.min(pts.length - 1, k + 12); m > k; m--) if (lineWalk(z, cur.x, cur.y, pts[m].x, pts[m].y, 0.25)) { far = m; break; }
    out.push(pts[far]); cur = pts[far]; k = far + 1;
  }
  return out;
}
function lineWalk(z, ax, ay, bx, by, r) {
  const n = Math.ceil(Math.hypot(bx - ax, by - ay) * 4);
  for (let i = 1; i <= n; i++) {
    const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
    if (z.solidAt(x, y) || z.solidAt(x + r, y) || z.solidAt(x - r, y) || z.solidAt(x, y + r) || z.solidAt(x, y - r)) return false;
  }
  return true;
}
function lineClear(z, a, b) {
  const n = Math.ceil(dist(a, b) * 3);
  for (let i = 1; i < n; i++) { const t = z.get(Math.floor(a.x + (b.x - a.x) * i / n), Math.floor(a.y + (b.y - a.y) * i / n)); if (TALL[t] && t !== T.ROCK) return false; }
  return true;
}
function moveCircle(o, dx, dy) {
  const z = G.zone, r = o.r;
  if (dx) { const nx = o.x + dx, ex = nx + Math.sign(dx) * r; if (!z.solidAt(ex, o.y) && !z.solidAt(ex, o.y + r * .7) && !z.solidAt(ex, o.y - r * .7)) o.x = nx; }
  if (dy) { const ny = o.y + dy, ey = ny + Math.sign(dy) * r; if (!z.solidAt(o.x, ey) && !z.solidAt(o.x + r * .7, ey) && !z.solidAt(o.x - r * .7, ey)) o.y = ny; }
}
function stepToward(o, tx, ty, s) {
  const dx = tx - o.x, dy = ty - o.y, l = Math.hypot(dx, dy);
  if (l < 1e-4) return;
  // v0.22: minions move 15% faster (the hero's speed rose by the same)
  if (o.isSkel || o.isBrood || o.isFGolem || o.isColossus || o.isEcho || o.isThrall || o === G.golem) s *= 1.15;
  s *= terrainSpd(o);
  const k = Math.min(s, l) / l;
  moveCircle(o, dx * k, dy * k);
}
