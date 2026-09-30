// =================================================================== v0.22 bestiary C: Vein-Borer, Wick-Saint, Ossuary Warden, Marrow Duelist
// Four Act I creatures repainted in the cel-banded pixel style of the Husk. Each keeps the design idea of its old
// MPAINT_HR painter (zi_beasts22.js) and its tell: the worm's ring of blood-bubbles, the moth's folding wings, the
// warden's lowering shield, the duelist's rising blade tip.
MFRAME.worm = [38, 46]; MPX_K.worm = 1.2; MPX_WALK.worm = 5;
MFRAME.moth = [52, 54]; MPX_K.moth = 1.3; MPX_WALK.moth = 4;
MFRAME.warden = [46, 50]; MPX_K.warden = 1.4; MPX_WALK.warden = 4.2;
MFRAME.duelist = [48, 46]; MPX_K.duelist = 1.4; MPX_WALK.duelist = 6;
const znLerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const znH = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const znNorm = v => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
// two-bone reach: both solutions, the caller picks (knees forward, elbows down)
function znIK(s, e, l1, l2, pick) {
  const dx = e[0] - s[0], dy = e[1] - s[1], d0 = Math.hypot(dx, dy) || 1e-3, d = Math.min(d0, l1 + l2 - 0.05), a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), ux = dx / d0, uy = dy / d0;
  const c1 = [s[0] + ux * a - uy * h, s[1] + uy * a + ux * h], c2 = [s[0] + ux * a + uy * h, s[1] + uy * a - ux * h];
  return pick === 'x' ? (c1[0] > c2[0] ? c1 : c2) : pick === '-x' ? (c1[0] < c2[0] ? c1 : c2) : (c1[1] > c2[1] ? c1 : c2);
}
// a ring (annulus) as one part
function znRing(A, cx, cy, rx, ry, th, rot, mat, o) {
  A.shape((c, X, Y, U) => { c.ellipse(X(cx), Y(cy), rx * U, ry * U, rot, 0, 6.2832, false); const ix = rx - th, iy = ry - th; c.moveTo(X(cx) + ix * U * Math.cos(rot), Y(cy) + ix * U * Math.sin(rot)); c.ellipse(X(cx), Y(cy), ix * U, iy * U, rot, 6.2832, 0, true); }, mat, o);
}

// ------------------------------------------------------------------- VEIN-WORM: a severed artery of the god, still pumping
defMat('znArt', '#12040e', '#3a0c26', '#6c1a38', '#a4304c', '#e0707c');
defMat('znArtDk', '#08020a', '#1c0616', '#340c22', '#4e1630', '#6a2440');
defMat('znSoil', '#090706', '#1a1410', '#2e2419', '#463624', '#5e4a32');
defMat('znLip', '#1a0408', '#4a0e18', '#7a2230', '#a8444a', '#d8807a');
const ZN_BLOOD = ['#1a0206', '#4a0610', '#8a1020', '#c8303a', '#ff9a8a'];
MPX.worm = function (A, pose, ph, pal) {
  const t = pal.tint, art = tintMat('znArt', t, 0.45), artD = tintMat('znArtDk', t, 0.45), lip = tintMat('znLip', t, 0.35), R = MAT[art], RD = MAT[artD], LP = MAT[lip], SO = MAT.znSoil, BN = MAT.boneOld, MT = MAT.meat;
  const idle = pose === 'idle', walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk';
  let H, C1, C2, amp = 0.8, wph = 0, open = 0.5, grow = 0, k = 0, pu = -1;
  if (walk) { const g = ph / 8 * 6.2832; H = [6 + Math.sin(g) * 3, -30 + Math.cos(g) * 1.5]; C1 = [-5 + Math.sin(g + 1) * 2, -9]; C2 = [2 - Math.sin(g) * 3, -23]; amp = 2.2; wph = g; open = 0.35; pu = (ph / 4) % 1; }
  else if (wind) { k = [0.35, 0.7, 1][ph]; H = [3 - 5 * k, -41 - 9 * k]; C1 = [-1, -14]; C2 = [-3 - 3 * k, -29 - 7 * k]; open = 0.5 + 0.6 * k; grow = 0.6 * k; amp = 0.5; wph = ph * 1.5; pu = 0.2 + 0.3 * ph; }
  else if (atk) { H = [[16, -31], [20, -9], [13, -24]][ph]; C1 = [[-3, -15], [-2, -17], [-3, -14]][ph]; C2 = [[3, -45], [13, -41], [5, -39]][ph]; open = [1.1, 1.2, 0.6][ph]; amp = 0.3; }
  else { const b = Math.sin(ph / 4 * 6.2832); H = [5 + b * 0.8, -41 + b * 0.7]; C1 = [-4, -12]; C2 = [-3.5 + b * 0.5, -30]; open = 0.4 + 0.12 * (1 + b); wph = ph / 4 * 6.2832; pu = ph / 4; }
  const B0 = [0, 2.5];
  const bz = u => { const v = 1 - u; return [v * v * v * B0[0] + 3 * v * v * u * C1[0] + 3 * v * u * u * C2[0] + u * u * u * H[0], v * v * v * B0[1] + 3 * v * v * u * C1[1] + 3 * v * u * u * C2[1] + u * u * u * H[1]]; };
  const tg0 = u => { const a = bz(Math.min(1, u + 0.01)), b = bz(Math.max(0, u - 0.01)); return znNorm([a[0] - b[0], a[1] - b[1]]); };
  const sp = u => { const p = bz(u), d = tg0(u), w = amp * Math.sin(u * 7 - wph) * Math.sin(u * Math.PI); return [p[0] + d[1] * w, p[1] - d[0] * w]; };
  const tg = u => { const a = sp(Math.min(1, u + 0.015)), b = sp(Math.max(0, u - 0.015)); return znNorm([a[0] - b[0], a[1] - b[1]]); };
  const rad = u => 5 + grow - 1.6 * u;
  const lft = d => [d[1], -d[0]];   // the normal on the lit (left) side for a body rising upward
  const rimPts = (rx, ry, a0, a1, n, jit, seed, cy = -0.2) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n, j = 1 + (znH(i * 3 + seed) - 0.5) * jit; o.push([Math.cos(a) * rx * j, cy + Math.sin(a) * ry * j]); } return o; };
  // ---- the ground behind: a heaved crater of soil, black inside, a pool of the god's blood around the stump
  A.poly(rimPts(12, 4.4, 3.1416, 6.2832, 12, 0.3, 1, 0).concat([[12, 0.5], [-12, 0.5]]), 'znSoil', { sh: 0.8, hl: 1 });
  A.speck(-12, -4.5, 24, 4, SO[4], 14, 2); A.speck(-12, -4.5, 24, 4, SO[1], 14, 3);
  A.ell(0.2, -0.4, 8, 2.6, '#070304', { flat: true, contour: false, edge: false });
  A.ell(0.4, -0.2, 7, 1.9, ZN_BLOOD[1], { flat: true, contour: false, edge: false });
  A.hair(-5, -0.9, 4, -1, ZN_BLOOD[2]); A.fine(-3, -1, ZN_BLOOD[4]); A.fine(4.5, -0.6, ZN_BLOOD[3]);
  // ---- blood-bubbles (the tell): a ring round the hole, the back half first
  const bubbles = front => { if (!wind) return; for (let i = 0; i < 11; i++) { const a = i / 11 * 6.2832 + 0.2, sy = Math.sin(a); if ((sy > 0) !== front) continue; const s = (0.7 + znH(i + 9) * 0.7) * (0.5 + k * 0.8), bx = Math.cos(a) * (13.5 - k * 1.2), by = -0.4 + sy * 4.2; A.ell(bx, by - s * 0.8, s, s * 0.9, ZN_BLOOD, { sh: 0.5, hl: 0.35 }); A.fine(bx - s * 0.4, by - s * 1.3, '#ffe0d8'); if (k > 0.6 && i % 3 === 0) { A.fine(bx + 0.4, by - s * 2 - 2 * k, ZN_BLOOD[3]); A.fine(bx - 0.3, by - s * 2 - 3.5 * k, ZN_BLOOD[2]); } } };
  bubbles(false);
  if (wind) for (let i = 0; i < 6; i++) { const a = 3.3 + i * 0.55; A.hair(Math.cos(a) * 8.5, -0.4 + Math.sin(a) * 2.8, Math.cos(a) * (11.5 + k * 2), -0.4 + Math.sin(a) * 4.2, SO[0]); }
  // the torn collar of flesh where the artery was ripped from the god: back half
  const collar = front => { for (let i = 0; i < 6; i++) { const a = (front ? 0.25 : 3.4) + i / 5 * 2.6, ca = Math.cos(a), sa = Math.sin(a), x0 = ca * 5.2, y0 = -0.6 + sa * 1.8, len = 2.4 + znH(i + (front ? 40 : 30)) * 2.2, x1 = ca * (5.6 + len * 0.7), y1 = y0 - len * (front ? 0.55 : 0.9); A.poly([[x0 - 1.5, y0 + 0.6], [x1, y1], [x0 + 1.5, y0 + 0.6]], 'meat', front ? { sh: 0.5, hl: 0.5 } : { tone: -1.3, contour: false, sh: 0.4, hl: 0.3 }); if (front && i % 2) A.fine(x1 - 0.3, y1 + 0.6, MT[4]); } };
  collar(false);
  // ---- the artery: chambers of muscle stacked up it, each pinched by a valve, one swelling with the pulse
  const N = 18, pts = []; for (let j = 0; j < N; j++) pts.push(sp(j / (N - 1)));
  A.limb(pts, rad(0) * 0.86, rad(1) * 0.86, artD, { sh: 1, hl: 0.5 });
  const NC = 6, cu = i => 0.03 + (i + 0.5) / NC * 0.9;
  const pulseAt = pu >= 0 ? Math.floor(pu * NC) : -1;
  for (let i = 0; i < NC; i++) {
    const u = cu(i), p = sp(u), d = tg(u), sw = i === pulseAt ? 1.1 : i === pulseAt - 1 ? 0.4 : 0, rr = rad(u) + sw, len = 0.9 / NC * 0.5 * Math.hypot(H[0], H[1] - 2.5) * 1.25 + sw * 0.3;
    A.ell(p[0], p[1], len, rr, art, { rot: Math.atan2(d[1], d[0]), sh: 1.4, hl: 0.7, core: 0 });
    const n = lft(d);
    // the wet shine on each chamber, a vein crossing it
    A.fine(p[0] + n[0] * (rr - 1.3) + d[0] * len * 0.1, p[1] + n[1] * (rr - 1.3) + d[1] * len * 0.1, '#ffd8e0');
    const vs = (i % 3) - 1, va = [p[0] + n[0] * rr * 0.3 * vs - d[0] * len * 0.9, p[1] + n[1] * rr * 0.3 * vs - d[1] * len * 0.9], vb = [p[0] - n[0] * rr * (0.3 * vs + 0.35) + d[0] * len * 0.8, p[1] - n[1] * rr * (0.3 * vs + 0.35) + d[1] * len * 0.8];
    A.hair(va[0], va[1], vb[0], vb[1], '#2c1244'); A.fine((va[0] + vb[0]) / 2 + n[0] * 0.5, (va[1] + vb[1]) / 2 + n[1] * 0.5, '#7a4a90');
    if (i % 2 === 0) { const q = [p[0] - n[0] * rr * 0.1, p[1] - n[1] * rr * 0.1]; A.hair(q[0], q[1], q[0] - n[0] * 1.6 + d[0] * 1.2, q[1] - n[1] * 1.6 + d[1] * 1.2, '#2c1244'); }
    // the valve knuckles standing out of the silhouette at each pinch
    if (i > 0 && i % 2) { const q = sp(u - 0.5 / NC * 0.9), dq = tg(u - 0.5 / NC * 0.9), nq = lft(dq), rq = rad(u) * 0.98; A.ell(q[0] + nq[0] * rq, q[1] + nq[1] * rq, 0.8, 0.7, art, { sh: 0.3, hl: 0.35, lit: 0.1 }); }
  }
  // ---- the head: a flared collar of muscle, then the lamprey disc of teeth, the god's blood burning in the throat
  const Hc = sp(1), d = tg(0.99), n = [-d[1], d[0]], ang = Math.atan2(d[1], d[0]), hr = rad(1) + 1.8 + open * 0.6;
  A.ell(Hc[0] - d[0] * 1.2, Hc[1] - d[1] * 1.2, 2.3, hr, art, { rot: ang, sh: 1.1, hl: 0.8 });
  const O = [Hc[0] + d[0] * 1.2, Hc[1] + d[1] * 1.2], ra = 2 + 1.4 * open, rc = hr + 0.5;
  A.ell(O[0], O[1], ra, rc, lip, { rot: ang, sh: 0.9, hl: 0.7 });
  const at = (a, s) => [O[0] + d[0] * Math.cos(a) * ra * s + n[0] * Math.sin(a) * rc * s, O[1] + d[1] * Math.cos(a) * ra * s + n[1] * Math.sin(a) * rc * s];
  for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832, p = at(a, 0.98), q = at(a, 0.8); A.hair(p[0], p[1], q[0], q[1], LP[1]); }   // the ridged rim of the disc
  A.shape((c, X, Y) => { for (let i = 0; i <= 24; i++) { const p = at(i / 24 * 6.2832, 0.78); i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1])); } }, '#0e0205', { flat: true, contour: false, edge: false });
  A.shape((c, X, Y) => { for (let i = 0; i <= 24; i++) { const p = at(i / 24 * 6.2832, 0.42); i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1])); } }, '#060103', { flat: true, contour: false, edge: false });
  // hooked teeth ringing the throat, pale against the dark
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.2832 + 0.3, b = at(a, 0.74), tp = at(a, 0.5); A.hair(b[0], b[1], tp[0], tp[1], BN[3]); A.fine(tp[0], tp[1], BN[4]); A.fine(b[0], b[1], BN[1]); }
  A.fine(O[0], O[1], '#ff6030'); A.fine(O[0] + n[0] * 0.5, O[1] + n[1] * 0.5, '#c02010'); if (open > 0.7) { A.fine(O[0] + d[0] * 0.4, O[1] + d[1] * 0.4, '#ffc080'); A.fine(O[0] - n[0] * 0.6, O[1] - n[1] * 0.6, '#ff8040'); }
  // a strand of blood hanging off the lower lip
  const lipLow = at(n[1] < 0 ? -1.5708 : 1.5708, 1), drip = walk ? ph % 3 : ph % 2;
  if (!(atk && ph === 1)) { A.hair(lipLow[0], lipLow[1], lipLow[0] + 0.3, lipLow[1] + 2.5 + drip, ZN_BLOOD[2]); A.fine(lipLow[0] + 0.3, lipLow[1] + 3.2 + drip, ZN_BLOOD[3]); }
  if (atk && ph === 1) for (let i = 0; i < 8; i++) { const a = -2.8 + i * 0.4 + znH(i) * 0.2, rr = 4 + znH(i + 4) * 4.5; A.px(O[0] + Math.cos(a) * rr, Math.min(-0.5, O[1] + 3 + Math.sin(a) * rr * 0.6), i % 2 ? ZN_BLOOD[2] : ZN_BLOOD[3]); }
  // ---- the lip of the crater in front, the torn collar over it, clods and roots
  const outer = rimPts(12, 5, 0, 3.1416, 12, 0.18, 7), inner = rimPts(8, 2.6, 3.1416, 0, 10, 0.1, 11).map(p => [p[0] + 0.2, p[1] - 0.2]);
  A.poly([...outer, ...inner], 'znSoil', { sh: 1.1, hl: 0.9 });
  A.speck(-12, -1, 24, 4, SO[1], 26, 5); A.speck(-12, -1, 24, 4, SO[4], 14, 6);
  collar(true);
  for (let i = 0; i < 6; i++) { const a = 0.3 + i * 0.5, rr = 10 + znH(i + 20) * 2.5; A.ell(Math.cos(a) * rr, 0.4 + Math.sin(a) * 2.4, 0.9 + znH(i) * 0.7, 0.75, 'znSoil', { sh: 0.4, hl: 0.5 }); }
  for (let i = 0; i < 3; i++) { const x = -9 + i * 7.5; A.hair(x, 1.2, x + 1.4, 2.8, '#6a5a44'); A.hair(x + 1.4, 2.8, x + 2.2, 2.6, '#6a5a44'); }                    // pale roots torn up with it
  bubbles(true);
  if (walk) for (let i = 0; i < 3; i++) { const x = -10 + ((ph + i * 3) % 8) * 2.6; A.px(x, -1.4 - ((ph + i) % 3), SO[3]); }
  A.lamp(O[0], O[1], [255, 70, 50], 8, 0.9); A.lamp(0, -1.5, [220, 40, 50], 10, wind ? 0.5 + 0.5 * k : 0.3);
  A.rim([120, 110, 160], 0.3);
};

// ------------------------------------------------------------------- MOTH-SAINT: a porcelain saint's face on a moth's body
defMat('znChitin', '#0a0808', '#1e1614', '#3a2c24', '#5a4634', '#7e664a');
defMat('znMothRed', '#12060a', '#34100e', '#5a1e16', '#84342a', '#a85038');
MPX.moth = function (A, pose, ph, pal) {
  const t = pal.tint, fur = tintMat('mothFur', t, 0.45), wingM = tintMat('mothWing', t, 0.45), F = MAT[fur], W = MAT[wingM], P = MAT.porcelain, GD = MAT.gold;
  const idle = pose === 'idle', walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk';
  let phi = 1, fold = 0, r = -0.3, C = [0, -30], eyes = 0, legF = 0, dust = 0, sw = 0;
  if (idle) { const a = ph / 4 * 6.2832; phi = Math.cos(a); C = [0, -31 + phi * 1.3]; r = -0.3 + phi * 0.05; sw = Math.sin(a) * 0.8; }
  else if (walk) { const a = ph / 8 * 6.2832; phi = Math.cos(a); C = [0, -32 + phi * 1.5]; r = -0.12 + phi * 0.05; sw = Math.sin(a) * 1; }
  else if (wind) { const k = [0.4, 0.75, 1][ph]; phi = 0.4; fold = k; C = [-1.5 * k, -32 - 3 * k]; r = -0.3 - 0.3 * k; eyes = k; }
  else if (atk) { fold = [1, 0.4, 0][ph]; phi = [0.4, 0.6, -0.55][ph]; r = [0.75, 0.12, -0.45][ph]; C = [[3, -25], [8, -15], [4, -30]][ph]; eyes = [1, 1, 0.5][ph]; legF = [0.3, 1, 0.2][ph]; dust = ph === 2 ? 1 : 0; sw = [-1, 0, 1][ph]; }
  const cr = Math.cos(r), sr = Math.sin(r);
  const T = (x, y) => [C[0] + x * cr - y * sr, C[1] + x * sr + y * cr], TP = pts => pts.map(p => T(p[0], p[1])), TV = (x, y) => [x * cr - y * sr, x * sr + y * cr];
  // a wing: a flat membrane between a span (root to tip) and a chord (leading to trailing edge). Beating turns
  // the span up and down; seen from the side a level wing shows almost edge-on, which is what makes the flap read.
  const wing = (root, L, Wd, alpha, side, fk) => {
    const sF = [-0.3 * L, -Math.sin(alpha) * 0.95 * L + side * Math.cos(alpha) * 0.55 * L], cF = [-Wd * 0.8, Wd * 0.22];
    const sB = [-0.95 * L, -0.3 * L - (side < 0 ? 0.1 * L : 0)], cB = [0.12 * Wd, 0.8 * Wd];
    const s = znLerp(sF, sB, fk), c = znLerp(cF, cB, fk), R0 = T(root[0], root[1]), sv = TV(s[0], s[1]), cv = TV(c[0], c[1]);
    return (u, v) => [R0[0] + sv[0] * u + cv[0] * v, R0[1] + sv[1] * u + cv[1] * v];
  };
  const FORE = [[0, 0], [0.3, -0.12], [0.7, -0.15], [0.96, -0.1], [1.04, 0.06], [0.96, 0.3], [0.9, 0.42], [0.84, 0.6], [0.74, 0.76], [0.56, 0.9], [0.32, 0.86], [0.12, 0.64], [0, 0.46]];
  const HIND = [[0, 0.05], [0.45, -0.05], [0.85, 0.12], [1, 0.42], [0.9, 0.72], [0.62, 0.95], [0.3, 0.92], [0.06, 0.6]];
  const ocellus = (Pw, u0, v0, s, dark) => { const c = Pw(u0, v0), ex = Pw(u0 + 0.1 * s, v0), ey = Pw(u0, v0 + 0.2 * s), a = [ex[0] - c[0], ex[1] - c[1]], b = [ey[0] - c[0], ey[1] - c[1]];
    const ring = (k, col) => { const pts = []; for (let i = 0; i < 12; i++) { const q = i / 12 * 6.2832; pts.push([c[0] + (a[0] * Math.cos(q) + b[0] * Math.sin(q)) * k, c[1] + (a[1] * Math.cos(q) + b[1] * Math.sin(q)) * k]); } A.poly(pts, col, { flat: true, contour: false, edge: false }); };
    ring(1, '#1a120e'); if (!dark) { ring(0.72, '#a0702e'); ring(0.46, '#5e1410'); A.fine(c[0] - a[0] * 0.2 - b[0] * 0.2, c[1] - a[1] * 0.2 - b[1] * 0.2, '#f4e4c0'); } };
  const drawWing = (Pw, shape, mat, o, detail, hind) => {
    A.poly(shape.map(([u, v]) => Pw(u, v)), mat, o);
    const Wm = MAT[mat] || W;
    if (hind) {
      A.poly([[0.02, 0.1], [0.5, 0.02], [0.58, 0.7], [0.08, 0.6]].map(([u, v]) => Pw(u, v)), detail ? 'znMothRed' : '#1e0c0a', { flat: true, contour: false, edge: false, tone: detail ? 0 : -1 });
      if (detail) { for (let i = 0; i < 6; i++) { const v = 0.1 + i * 0.14, a = Pw(0.66, v), b = Pw(0.74, v + 0.07); A.hair(a[0], a[1], b[0], b[1], '#1a120e'); } ocellus(Pw, 0.7, 0.5, 0.8, false); }
      return;
    }
    A.poly([[0, 0], [0.26, -0.1], [0.3, 0.8], [0, 0.46]].map(([u, v]) => Pw(u, v)), mat, { flat: true, tone: -1.4, contour: false, edge: false });                    // the dark base
    if (!detail) { A.poly([[0.44, -0.12], [0.53, -0.13], [0.6, 0.86], [0.49, 0.88]].map(([u, v]) => Pw(u, v)), mat, { flat: true, tone: -0.4, contour: false, edge: false }); for (const [v0, v1] of [[0.15, 0.3], [0.3, 0.6]]) { const a = Pw(0.06, v0), b = Pw(0.93, v1); A.hair(a[0], a[1], b[0], b[1], Wm[0]); } ocellus(Pw, 0.64, 0.42, 1.1, true); return; }
    A.poly([[0.44, -0.12], [0.53, -0.13], [0.6, 0.86], [0.49, 0.88]].map(([u, v]) => Pw(u, v)), mat, { flat: true, lit: 0.25, contour: false, edge: false });       // the pale band
    for (const [v0, v1] of [[0.02, 0.0], [0.15, 0.3], [0.28, 0.55], [0.38, 0.78]]) { const a = Pw(0.06, v0), b = Pw(0.93, v1); A.hair(a[0], a[1], b[0], b[1], Wm[1]); }   // veins
    for (let i = 0; i < 8; i++) { const v = i * 0.1, a = Pw(0.82 + (i % 2) * 0.04, v), b = Pw(0.82 + ((i + 1) % 2) * 0.04, v + 0.1); A.hair(a[0], a[1], b[0], b[1], '#241c14'); }   // the zigzag line
    ocellus(Pw, 0.64, 0.42, 1.25, false);
    for (let i = 0; i < 7; i++) { const q = Pw(0.95 - i * 0.02, 0.02 + i * 0.1); A.fine(q[0], q[1], i % 2 ? Wm[4] : Wm[0]); }   // chequered fringe
    for (let i = 0; i < 26; i++) { const q = Pw(0.1 + znH(i) * 0.8, 0.05 + znH(i + 50) * 0.75); A.fine(q[0], q[1], i % 3 ? Wm[3] : Wm[1]); }   // dust of scales
  };
  const aF = phi * (phi > 0 ? 1.25 : 0.95), aH = aF - 0.3, Lf = 29, Wf = 13, Lh = 19, Wh = 12;
  // ---- far wings, behind everything
  drawWing(wing([-1, -2.6], Lf * 0.9, Wf * 0.9, aF - 0.12, -1, fold), FORE, wingM, { tone: -1.1, contour: false, sh: 1, hl: 0.5 }, false, false);
  drawWing(wing([-2.6, -1.2], Lh * 0.9, Wh * 0.9, aH - 0.12, -1, fold), HIND, wingM, { tone: -1.6, contour: false, sh: 1, hl: 0.5 }, false, true);
  // ---- the gilt halo behind the head: the moth's own light
  const Hc = [6, -4.6], fs = 1.35, HL = T(Hc[0] - 1.4, Hc[1] - 0.8);
  znRing(A, HL[0], HL[1], 6.4, 7.2, 1, r + 0.2, 'gold', { sh: 0.5, hl: 0.4, metal: true });
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832 + r - 1.5708, ca = Math.cos(a), sa = Math.sin(a); A.hair(HL[0] + ca * 6.9, HL[1] + sa * 7.7, HL[0] + ca * (i % 2 ? 7.4 : 8.2), HL[1] + sa * (i % 2 ? 8.2 : 9.1), GD[i % 2 ? 2 : 4]); }
  // ---- the abdomen, ringed and furred, hanging back
  const ab = TP([[-2, 1.6], [-5.5, 3.6 + sw * 0.3], [-8.5, 6 + sw * 0.8], [-11, 8.6 + sw * 1.5]]);
  A.limb(ab, 3.3, 1, fur, { sh: 1.2, hl: 0.7 });
  for (let i = 1; i < 6; i++) { const k = i / 6, seg = Math.min(2, Math.floor(k * 3)), u = k * 3 - seg, p = znLerp(ab[seg], ab[seg + 1], u), d = znNorm([ab[seg + 1][0] - ab[seg][0], ab[seg + 1][1] - ab[seg][1]]), rr = 3.3 - 2.3 * k; A.hair(p[0] - d[1] * rr, p[1] + d[0] * rr, p[0] + d[1] * rr, p[1] - d[0] * rr, F[1]); A.fine(p[0] + d[1] * (rr - 0.6) - d[0] * 0.8, p[1] - d[0] * (rr - 0.6) - d[1] * 0.8, F[4]); }
  { const e = ab[3], d = znNorm([ab[3][0] - ab[2][0], ab[3][1] - ab[2][1]]); for (let i = -1; i <= 1; i++) A.hair(e[0], e[1], e[0] + d[0] * 2.2 - d[1] * i * 1.2, e[1] + d[1] * 2.2 + d[0] * i * 1.2, F[0]); }
  // ---- legs: thin, jointed, hooked; they reach for the prey on the swoop
  const LEGS = [[1.2, 2.6, 2.6, 2.2, 1.4, 3.8], [-0.2, 3, 0.8, 3, -0.6, 3.6], [-1.6, 2.6, -1.4, 2.6, -3.2, 3.2]];
  const leg = (i, o) => { const [rx, ry, kx, ky, fx, fy] = LEGS[i], r0 = T(rx, ry), kn = T(rx + kx + legF * 3, ry + ky - legF * 0.8), ft = T(rx + kx + fx + legF * 6, ry + ky + fy - legF * 2); A.limb([r0, kn], 0.45, 0.4, 'znChitin', o); A.limb([kn, ft], 0.38, 0.25, 'znChitin', o); A.fine(ft[0] + 0.6, ft[1] + 0.2, '#0a0806'); A.fine(kn[0], kn[1] - 0.4, o.tone ? MAT.znChitin[2] : MAT.znChitin[4]); };
  leg(2, { tone: -1.2, contour: false, sh: 0.3, hl: 0.3 });
  // ---- the thorax: a ball of fur, a death's-head worn on its back
  const th = []; for (let i = 0; i < 20; i++) { const a = i / 20 * 6.2832, rr = 1 + (i % 2 ? 0.12 : -0.04) + znH(i + 30) * 0.06; th.push([Math.cos(a) * 3.9 * rr, Math.sin(a) * 4.1 * rr]); }
  A.poly(TP(th), fur, { sh: 1.4, hl: 0.9 });
  for (let i = 0; i < 16; i++) { const a = znH(i + 60) * 6.2832, rr = znH(i + 70) * 3.4, q = T(Math.cos(a) * rr, Math.sin(a) * rr); A.hair(q[0], q[1], q[0] - 0.4, q[1] + 0.9, i % 2 ? F[1] : F[3]); }
  { const q = T(-1.2, -1.6), U1 = 1 / A.U, pale = '#d6c49a', dk = '#1a120c'; [[1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [3, 2], [1, 2], [2, 2], [1, 3], [2, 3]].forEach(([i, j]) => A.fine(q[0] + i * U1, q[1] + j * U1, pale)); A.fine(q[0] + U1, q[1] + 2 * U1, dk); A.fine(q[0] + 2 * U1 + U1, q[1] + 2 * U1, dk); A.fine(q[0] + U1, q[1] + 4 * U1, pale); A.fine(q[0] + 2 * U1 + U1 * 0.2, q[1] + 4 * U1, pale); }
  leg(0, { sh: 0.3, hl: 0.3 }); leg(1, { sh: 0.3, hl: 0.3, tone: -0.6 });
  // ---- near wings over the body
  drawWing(wing([-2.6, -1.2], Lh, Wh, aH, 1, fold), HIND, wingM, { sh: 1.2, hl: 0.8 }, true, true);
  drawWing(wing([-1, -2.6], Lf, Wf, aF, 1, fold), FORE, wingM, { sh: 1.3, hl: 0.9 }, true, false);
  // ---- a ruff of pale fur at the neck, then the mask
  const ruff = []; for (let i = 0; i < 12; i++) { const a = -1.2 + i / 11 * 3.2, rr = i % 2 ? 3.3 : 2.4; ruff.push([3 + Math.cos(a) * rr, -1 + Math.sin(a) * rr]); }
  A.poly(TP(ruff), fur, { lit: 0.25, sh: 0.8, hl: 0.6 });
  const FT = (x, y) => T(Hc[0] + x * fs, Hc[1] + y * fs);
  A.poly([[-2.6, -3.2], [0, -4.8], [1.5, 0], [-0.8, 3.8], [-2.9, 0.6]].map(p => FT(p[0], p[1])), '#0c0a10', { flat: true, contour: false });   // the hollow inside of the mask
  A.poly([[0.2, -4.6], [1.9, -4.1], [2.9, -2.4], [3.2, -1.2], [4.0, 0.3], [3.3, 0.9], [3.2, 2.2], [2.7, 3.2], [1.6, 4.1], [-0.2, 3.9], [-1.5, 2.8], [-2.2, 0.6], [-2.1, -2.2], [-1.2, -3.8]].map(p => FT(p[0], p[1])), 'porcelain', { sh: 1.1, hl: 0.7 });
  const f = (x, y, c) => { const q = FT(x, y); A.fine(q[0], q[1], c); }, hl = (x0, y0, x1, y1, c) => { const a = FT(x0, y0), b = FT(x1, y1); A.hair(a[0], a[1], b[0], b[1], c); };
  hl(-2.0, -2.2, -2.1, 0.6, GD[3]); hl(-2.1, 0.6, -1.2, 3.0, GD[2]); hl(-1.1, -3.7, 0.3, -4.5, GD[4]);          // gilt rim
  hl(0.5, -3.3, 0.5, -2.3, GD[3]); hl(0, -2.9, 1.0, -2.9, GD[3]);                                                   // a gilt cross on the brow
  hl(0.2, -1.7, 2.8, -1.9, P[1]);                                                                                  // brow shadow
  if (eyes < 0.5) { f(1.0, -0.9, '#5a5262'); f(1.5, -0.6, '#4a4452'); f(2.1, -0.6, '#4a4452'); f(2.6, -0.9, '#5a5262'); f(1.5, -0.2, '#8a8494'); f(2.1, -0.2, '#8a8494'); f(-1.1, -0.8, '#6a6474'); f(-0.6, -0.55, '#5a5262'); f(-0.1, -0.8, '#6a6474'); }
  else { const q = FT(1.8, -0.8), q2 = FT(-0.6, -0.7); A.ell(q[0], q[1], 1.5, 1.1, '#050306', { flat: true, contour: false, rot: r }); A.ell(q2[0], q2[1], 0.8, 0.9, '#050306', { flat: true, contour: false, rot: r }); A.fine(q[0] + 0.2, q[1], '#ffe070'); A.fine(q2[0], q2[1], '#c8a040'); if (eyes >= 1) A.fine(q[0] + 0.6, q[1] + 0.1, '#fff6c0'); }
  hl(3.0, -1.5, 3.6, 0.0, P[4]); f(3.3, 0.6, P[1]);                                                               // the nose
  hl(1.9, 2.1, 2.9, 2.0, '#7a2430'); f(2.4, 2.5, '#b84a52');                                                        // the painted mouth
  hl(2.3, -0.2, 2.4, 1.8, '#7a1018'); f(2.4, 2.1, '#b02028');                                                       // a tear of blood
  for (const [a, b] of [[[0.6, -4.4], [1.2, -3.0]], [[1.2, -3.0], [0.7, -2.0]], [[0.7, -2.0], [1.3, -1.2]], [[1.3, -1.2], [0.9, 0.4]], [[0.9, 0.4], [1.6, 1.4]], [[1.6, 1.4], [1.2, 2.8]], [[0.7, -2.0], [-0.7, -1.5]]]) hl(a[0], a[1], b[0], b[1], '#2a2432');   // the crack
  f(1.6, -2.9, P[4]); f(1.3, 0.5, P[4]);
  A.poly([[0.1, -4.6], [1.1, -4.4], [0.7, -3.5]].map(p => FT(p[0], p[1])), '#0c0a10', { flat: true, contour: false });   // a chip knocked out
  // ---- feathered antennae sweeping back over the halo
  for (const [bx, tx, ty] of [[-0.4, -4.5 - fold * 2, -9.8 + fold * 2], [0.9, -2.6 - fold * 2.5, -10.8 + fold * 2.5]]) {
    const a = FT(bx, -4.4), c = FT((bx + tx) / 2 + 0.8, -8.6), b = FT(tx, ty); let prev = a;
    for (let i = 1; i <= 10; i++) { const s = i / 10, v = 1 - s, p = [v * v * a[0] + 2 * v * s * c[0] + s * s * b[0], v * v * a[1] + 2 * v * s * c[1] + s * s * b[1]]; A.hair(prev[0], prev[1], p[0], p[1], F[1]); if (i > 2 && i < 10 && i % 2) { const d = znNorm([p[0] - prev[0], p[1] - prev[1]]), l = 0.9 * Math.sin(s * 3.1); A.hair(p[0], p[1], p[0] - d[1] * l - d[0] * 0.5, p[1] + d[0] * l - d[1] * 0.5, F[1]); A.hair(p[0], p[1], p[0] + d[1] * l - d[0] * 0.5, p[1] - d[0] * l - d[1] * 0.5, F[2]); } prev = p; }
  }
  if (dust) for (let i = 0; i < 9; i++) A.fine(-8 + znH(i) * 14, C[1] + 8 + znH(i + 5) * 10, i % 2 ? W[3] : W[4]);
  if (atk && ph < 2) for (let i = 0; i < 3; i++) { const q = T(-16 - i * 2, -2 + i * 2.2); A.hair(q[0], q[1], q[0] - 5, q[1] - 5 * Math.tan(r), i ? W[1] : W[3]); }   // the rush of air behind the dive
  A.lamp(HL[0], HL[1], [255, 210, 130], 16, 0.6); if (eyes > 0.5) { const q = FT(1.8, -0.8); A.lamp(q[0], q[1], [255, 220, 110], 4, 0.8); }
  A.rim([130, 140, 170], 0.3);
};

// ------------------------------------------------------------------- OSSUARY WARDEN: a bone knight behind a tower shield of fused skulls
defMat('znIron', '#0c0b0e', '#24222a', '#403c3e', '#645c56', '#9a8c7c');
defMat('znMortar', '#0a0806', '#1a1612', '#2c261e', '#40382a', '#564a36');
defMat('znRust', '#140806', '#34160c', '#5a2a14', '#7e4020', '#9a5a30');
MPX.warden = function (A, pose, ph, pal) {
  const t = pal.tint, bone = tintMat('boneOld', t, 0.4), iron = tintMat('znIron', t, 0.35), cloth = tintMat('clothDark', t, 0.45), mort = tintMat('znMortar', t, 0.3);
  const B = MAT[bone], I = MAT[iron], CL = MAT[cloth], RU = MAT.znRust, EYE = '#8ad8ff', EYE2 = '#e8fbff', GAP = '#070508';
  const idle = pose === 'idle', walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk';
  const G8 = walk ? gait(ph, 8) : null;
  let Y0 = 0, lean = 0, sDrop = 0, sTip = 0, na = [3.5, -2], fa = [-3, -2], trail = 0, k = 0;
  if (idle) { const b = Math.sin(ph / 4 * 6.2832); Y0 = b * 0.4; trail = b * 0.4; }
  if (walk) { Y0 = G8.bob * 1.1 + 0.9; lean = 1.2; na = [1.5 + G8.swing * 5, -2 - G8.lift * 2.4]; fa = [-1.5 - G8.swing * 5, -2 - G8.liftF * 2.4]; trail = -G8.swing * 1.2 - 1; }
  if (wind) { k = [0.35, 0.7, 1][ph]; Y0 = 0.8 * k; lean = -1.2 * k; sDrop = 5.5 * k; sTip = 0.35 * k; na = [4, -2]; fa = [-3.5, -2]; trail = k; }
  if (atk) { Y0 = [0.4, 1.8, 1.4][ph]; lean = [1.5, 4.5, 3.5][ph]; na = [[5, -2], [7, -2], [6.5, -2]][ph]; fa = [[-3.5, -2], [-4.5, -2], [-4, -2]][ph]; sDrop = [5, 3, 1.5][ph]; sTip = [0.25, 0.08, 0][ph]; trail = [1, 2, 1.5][ph]; }
  const hip = [0.3 + lean * 0.3, -20 + Y0], chest = [1 + lean, -30 + Y0], hd = [2.4 + lean * 1.15, -38.5 + Y0 + (atk ? ph * 0.4 : 0)];
  const FAR = { tone: -1.7, contour: false, sh: 1, hl: 0.6 }, NEAR = { sh: 1, hl: 0.6 };
  // ---- the mace, and where the near hand holds it
  let hand, mdir;
  const rest = [chest[0] + 3.5, chest[1] + 1.5 + (walk ? G8.bob * 0.3 : 0)];
  if (idle || walk) { hand = rest; mdir = znNorm([-0.78, -0.63]); }
  else if (wind) { hand = znLerp(rest, [chest[0] - 1, chest[1] - 11], k); mdir = znNorm(znLerp([-0.78, -0.63], [-0.86, -0.5], k)); }
  else { hand = [[chest[0] + 6, chest[1] - 11], [chest[0] + 11, chest[1] + 3], [chest[0] + 9, chest[1] + 12]][ph]; mdir = znNorm([[0.35, -0.94], [0.72, 0.7], [0.3, 0.95]][ph]); }
  const M = [hand[0] + mdir[0] * 13, hand[1] + mdir[1] * 13];
  const mace = () => {
    const nx = -mdir[1], ny = mdir[0], pm = [hand[0] - mdir[0] * 2.5, hand[1] - mdir[1] * 2.5];
    A.limb([pm, [M[0] - mdir[0] * 1.5, M[1] - mdir[1] * 1.5]], 0.6, 0.55, 'wood', { sh: 0.4, hl: 0.4 });
    for (let i = 0; i < 4; i++) { const q = [hand[0] - mdir[0] * (1.8 - i * 0.7), hand[1] - mdir[1] * (1.8 - i * 0.7)]; A.hair(q[0] - nx * 0.6, q[1] - ny * 0.6, q[0] + nx * 0.6 + mdir[0] * 0.4, q[1] + ny * 0.6 + mdir[1] * 0.4, MAT.leather[3]); }
    A.ell(pm[0], pm[1], 0.9, 0.9, iron, { sh: 0.3, hl: 0.3 });
    const at = (a, b) => [M[0] + mdir[0] * a + nx * b, M[1] + mdir[1] * a + ny * b];
    // flanged head: a core with three flanges showing on each side, a spike on top
    const pts = [at(-2, -1.2), at(-1.5, -2.6), at(-0.6, -1.4), at(0.2, -2.8), at(1.0, -1.4), at(1.8, -2.6), at(2.4, -1.2), at(3.8, 0), at(2.4, 1.2), at(1.8, 2.6), at(1.0, 1.4), at(0.2, 2.8), at(-0.6, 1.4), at(-1.5, 2.6), at(-2, 1.2)];
    A.poly(pts, iron, { sh: 0.8, hl: 0.6, metal: true });
    A.hair(...at(-1.6, -0.3), ...at(2.4, -0.3), I[4]); A.hair(...at(-1.9, 1.1), ...at(2.2, 1.1), I[0]);
    A.speck(M[0] - 3, M[1] - 3, 6, 6, RU[2], 5, 41);
    A.limb([at(-2.2, -1.1), at(-2.2, 1.1)], 0.5, 0.5, iron, { sh: 0.3, hl: 0.3 });
  };
  const arm = (s, h, o, far) => {
    const e = znIK(s, h, 7.5, 7, 'y');
    A.limb([s, e], 1, 0.85, bone, o); A.hair(s[0] - 0.4, s[1] + 1, e[0] - 0.5, e[1] - 0.4, far ? B[1] : B[3]);
    A.limb([e, h], 1.35, 1.1, iron, o);
    const dd = znNorm([h[0] - e[0], h[1] - e[1]]); for (let i = 1; i < 3; i++) { const q = znLerp(e, h, i / 3); A.hair(q[0] - dd[1] * 1.3, q[1] + dd[0] * 1.3, q[0] + dd[1] * 1.3, q[1] - dd[0] * 1.3, far ? I[0] : I[1]); }
    A.ell(e[0], e[1], 1.4, 1.3, iron, { ...o, sh: 0.5, hl: 0.4 }); if (!far) A.fine(e[0] - 0.3, e[1] - 0.4, I[4]);
    return e;
  };
  const leg = (hp, a, o, far) => {
    const kn = znIK(hp, a, 9.2, 9.4, 'x');
    A.limb([hp, kn], 1.25, 1, bone, o); if (!far) A.hair(hp[0] - 0.6, hp[1] + 1.2, kn[0] - 0.8, kn[1] - 0.8, B[3]);
    A.limb([kn, a], 1.8, 1.35, iron, o);
    if (!far) { A.hair(kn[0] + 0.3, kn[1] + 1.5, a[0] + 0.5, a[1] - 1.5, I[4]); A.speck(kn[0] - 1.5, kn[1] + 1, 3, 7, RU[2], 3, 51); }
    A.ell(kn[0] + 0.3, kn[1], 1.7, 1.6, iron, { ...o, sh: 0.6, hl: 0.5, metal: !far }); A.stud(kn[0] + 0.4, kn[1] - 0.2, far ? 'steelDark' : 'znRust');
    A.poly([[a[0] - 2, Math.min(0, a[1] + 2.2)], [a[0] - 1.8, a[1] - 0.8], [a[0] + 1.6, a[1] - 0.8], [a[0] + 4.4, a[1] + 1.2], [a[0] + 4.8, Math.min(0, a[1] + 2.2)]], iron, { ...o, sh: 0.6, hl: 0.5 });
    if (!far) { A.hair(a[0] + 0.2, a[1] - 0.3, a[0] + 0.8, a[1] + 1.8, I[0]); A.hair(a[0] + 2, a[1] + 0.4, a[0] + 2.4, a[1] + 1.9, I[0]); }
  };
  // ---- the shield: a pointed arch of skulls set in bone-mortar, banded in iron
  const cs = Math.cos(sTip), sn = Math.sin(sTip), Sb = [7.8 + lean * 0.9, -4.2 + Y0 * 0.8 + sDrop];
  const S = (a, b) => [Sb[0] + a * cs + b * sn, Sb[1] + a * sn - b * cs];
  const shield = () => {
    const face = [[0, 0], [5.5, -0.8], [11, 0], [11.2, 26], [9.6, 30.5], [5.5, 34.5], [1.4, 30.5], [-0.2, 26]];
    A.poly(face.map(([a, b]) => S(a - 1.3, b + 0.3)), iron, { tone: -1.2, sh: 0.5, hl: 0.3 });                     // its thickness
    A.poly(face.map(([a, b]) => S(a, b)), iron, { sh: 0.7, hl: 0.5 });
    const inner = [[1, 1.4], [5.5, 0.7], [10, 1.4], [10.2, 25.6], [8.8, 29.6], [5.5, 32.8], [2.2, 29.6], [0.8, 25.6]];
    A.poly(inner.map(([a, b]) => S(a, b)), mort, { sh: 0.7, hl: 0.5 });
    const skull = (a, b, s, glow) => {
      const c = S(a, b);
      A.ell(c[0], c[1] - 0.2 * s, 2.05 * s, 1.85 * s, bone, { sh: 0.6, hl: 0.5, rot: sTip });
      const j = S(a + 0.1, b - 1.7 * s); A.ell(j[0], j[1], 1.3 * s, 0.8 * s, bone, { sh: 0.4, hl: 0.3, rot: sTip, tone: -0.6 });
      const e1 = S(a - 0.85 * s, b - 0.1 * s), e2 = S(a + 0.85 * s, b - 0.1 * s), no = S(a + 0.05, b - 1 * s);
      A.ell(e1[0], e1[1], 0.62 * s, 0.6 * s, GAP, { flat: true, contour: false }); A.ell(e2[0], e2[1], 0.62 * s, 0.6 * s, GAP, { flat: true, contour: false });
      A.fine(no[0], no[1], GAP); for (let i = -1; i <= 1; i++) { const q = S(a + i * 0.6 * s, b - 1.7 * s); A.fine(q[0], q[1], i ? B[4] : GAP); }
      if (glow) { A.fine(e2[0], e2[1], EYE); }
      const hi = S(a - 0.9 * s, b + 1.2 * s); A.fine(hi[0], hi[1], B[4]);
    };
    const rows = [[4.6, [3, 8]], [11, [3, 8]], [18.4, [3, 8]], [24.6, [5.5]]];
    for (const [b, as] of rows) for (const a of as) skull(a + (b > 15 && as.length > 1 ? (a < 5 ? -0.2 : 0.2) : 0), b, 1.22, false);
    for (const a of [5.5]) for (const b of [7.8, 21.6]) { const q = S(a, b); A.ell(q[0], q[1], 1, 1.1, bone, { sh: 0.4, hl: 0.3, tone: -1 }); A.fine(q[0] - 0.3, q[1], GAP); A.fine(q[0] + 0.4, q[1], GAP); }        // skulls half-sunk in the mortar
    skull(5.5, 29.8, 0.95, wind || atk);
    // iron bands with rivets, rust bleeding down from them
    for (const b of [0.8, 14.8]) { A.poly([S(-0.1, b - 0.9), S(11.1, b - 0.9), S(11.1, b + 0.9), S(-0.1, b + 0.9)], iron, { sh: 0.5, hl: 0.4, metal: true }); for (let i = 0; i < 4; i++) { const q = S(1 + i * 3, b + 0.35); A.stud(q[0], q[1], 'znRust'); } if (b > 1) for (let i = 0; i < 3; i++) { const q = S(2.2 + i * 3.4, b - 0.9), q2 = S(2.3 + i * 3.4, b - 2.4 - (i % 2) * 1.4); A.hair(q[0], q[1], q2[0], q2[1], RU[2]); } }
    const tp = S(5.5, 34.2); A.limb([[tp[0] - 1.6, tp[1] + 0.2], [tp[0] + 1.6, tp[1] - 0.2]], 0.5, 0.5, iron, { sh: 0.3, hl: 0.3 });   // a votive candle spiked on the apex, its wax run down the skulls
    const cx = tp[0] + sn * 0.6, cy = tp[1] - 0.6, fl = [0, 0.5, -0.4, 0.3][ph % 4];
    A.poly([[cx - 1.1, cy + 0.4], [cx - 0.8, cy - 3.6], [cx + 0.8, cy - 3.8], [cx + 1.2, cy + 0.4]], ['#3a2a18', '#6a5634', '#a8926a', '#d8c8a0', '#f4ead0'], { sh: 0.4, hl: 0.4 });
    for (let i = 0; i < 2; i++) A.limb([[cx - 0.8 + i * 1.5, cy], [cx - 0.9 + i * 1.6, cy + 2.2 + i * 1.4]], 0.35, 0.4, ['#6a5634', '#a8926a', '#e0d0a8'], { contour: false, sh: 0.2, hl: 0.2 });
    A.hair(cx, cy - 3.8, cx, cy - 4.5, '#141010');
    A.shape((c, X, Y) => { c.moveTo(X(cx - 1), Y(cy - 4.2)); c.quadraticCurveTo(X(cx - 1.3 + fl * 0.4), Y(cy - 6.5), X(cx + fl), Y(cy - 9.2)); c.quadraticCurveTo(X(cx + 1.3 + fl * 0.3), Y(cy - 6.5), X(cx + 1), Y(cy - 4.2)); }, ['#a02a08', '#e0601a', '#ffa040', '#ffe090', '#fffbe8'], { contour: false, edge: false });
    A.fine(cx + fl * 0.4, cy - 5.8, '#ffffff'); A.fine(cx + fl * 0.4, cy - 6.4, '#fff6d0'); A.lamp(cx, cy - 6, [255, 176, 90], 22, 1.1);
    A.speck(Sb[0] - 1, Sb[1] - 34, 13, 35, B[1], 14, 61);
  };
  // ================================================================ painting order
  // far leg, far arm to the shield's grip
  leg([hip[0] - 1.2, hip[1]], fa, FAR, true);
  arm([chest[0] - 1, chest[1] - 2.5], S(3, 16), FAR, true);
  // the black surcoat hanging behind and between the legs
  A.shape((c, X, Y) => { c.moveTo(X(chest[0] - 3.5), Y(chest[1] + 2)); c.lineTo(X(hip[0] + 3.5), Y(hip[1] - 1)); c.lineTo(X(hip[0] + 3.2), Y(hip[1] + 8)); c.lineTo(X(hip[0] + 1.2), Y(hip[1] + 6.5)); c.lineTo(X(hip[0] - 0.6 + trail * 0.4), Y(hip[1] + 10)); c.lineTo(X(hip[0] - 2.2), Y(hip[1] + 7)); c.lineTo(X(hip[0] - 4 + trail), Y(hip[1] + 10.5)); c.lineTo(X(hip[0] - 5.5 + trail), Y(hip[1] + 6)); c.quadraticCurveTo(X(hip[0] - 5), Y(hip[1] - 4), X(chest[0] - 3.5), Y(chest[1] + 2)); }, cloth, { sh: 1.2, hl: 0.6 });
  for (let i = 0; i < 3; i++) A.hair(hip[0] - 3.5 + i * 2.2, hip[1] - 1, hip[0] - 4 + i * 2.4 + trail * 0.5, hip[1] + 7.5 + (i % 2) * 2, CL[0]);
  // the spine's knuckles showing where the surcoat has rotted from the back
  for (let i = 0; i < 4; i++) A.ell(chest[0] - 3.6 + i * 0.3, chest[1] + 1 + i * 1.9, 0.8, 0.65, bone, { sh: 0.3, hl: 0.3 });
  // the breastplate and the faulds
  A.shape((c, X, Y) => { c.moveTo(X(chest[0] - 1), Y(chest[1] - 4.2)); c.quadraticCurveTo(X(chest[0] + 3), Y(chest[1] - 5), X(chest[0] + 4.6), Y(chest[1] - 1)); c.quadraticCurveTo(X(chest[0] + 5.2), Y(chest[1] + 4), X(chest[0] + 3.4), Y(chest[1] + 6)); c.lineTo(X(chest[0] - 0.6), Y(chest[1] + 6.4)); c.quadraticCurveTo(X(chest[0] - 1.8), Y(chest[1] + 1), X(chest[0] - 1), Y(chest[1] - 4.2)); }, iron, { sh: 1.2, hl: 0.8, metal: true });
  A.hair(chest[0] + 2.2, chest[1] - 4, chest[0] + 2.8, chest[1] + 5.5, I[4]); A.speck(chest[0] - 1, chest[1] - 4, 6, 10, RU[2], 7, 71);
  for (let i = 0; i < 2; i++) { const y = hip[1] - 2.6 + i * 2.2; A.poly([[hip[0] - 3.2, y], [hip[0] + 4.2, y - 0.6], [hip[0] + 4.6, y + 2], [hip[0] - 3, y + 2.4]], iron, { sh: 0.6, hl: 0.5 }); A.stud(hip[0] + 3.2, y + 0.8, 'znRust'); }
  A.limb([[hip[0] - 3.4, hip[1] - 3], [hip[0] + 4.2, hip[1] - 3.6]], 0.6, 0.6, 'leather', { sh: 0.3, hl: 0.3 }); A.rect(hip[0] + 1.6, hip[1] - 4.2, 1.2, 1.2, MAT.bronze[3]);
  // near leg, with a tasset over the thigh
  leg([hip[0] + 1.4, hip[1]], na, NEAR, false);
  A.poly([[hip[0] - 0.4, hip[1] - 0.6], [hip[0] + 4, hip[1] - 1], [hip[0] + 4.4, hip[1] + 4.2], [hip[0] + 0.2, hip[1] + 4.8]], iron, { sh: 0.7, hl: 0.5 }); A.stud(hip[0] + 1.2, hip[1] + 0.4, 'znRust'); A.stud(hip[0] + 3.2, hip[1] + 0.2, 'znRust');
  const behind = idle || walk;
  if (behind) mace();
  // the near arm; its pauldron of three lames
  const shN = [chest[0] + 0.4, chest[1] - 2.6];
  const drawNearArm = () => {
    arm(shN, hand, NEAR, false);
    for (let i = 0; i < 3; i++) A.shape((c, X, Y) => { const y = shN[1] - 2 + i * 1.7, x = shN[0] - 3 + i * 0.3; c.moveTo(X(x), Y(y + 1.6)); c.quadraticCurveTo(X(x + 1), Y(y - 1.6), X(x + 5.8), Y(y)); c.lineTo(X(x + 5.6), Y(y + 1.8)); c.quadraticCurveTo(X(x + 1.6), Y(y + 0.6), X(x), Y(y + 1.6)); }, iron, { sh: 0.5, hl: 0.4, metal: i === 0 });
    A.stud(shN[0] + 1.2, shN[1] - 1.6, 'znRust'); A.speck(shN[0] - 3, shN[1] - 3, 6, 5, RU[2], 3, 81);
    const dd = mdir; for (let i = 0; i < 4; i++) { const q = [hand[0] - dd[0] * (0.9 - i * 0.6) + dd[1] * 0.9, hand[1] - dd[1] * (0.9 - i * 0.6) - dd[0] * 0.9]; A.ell(q[0], q[1], 0.5, 0.5, bone, { sh: 0.2, hl: 0.2 }); }   // bone knuckles round the haft
  };
  if (behind) drawNearArm();
  // ---- the helm: a rusted sugarloaf over the skull, a cross of slits with the cold eye burning in it
  const mantle = () => A.shape((c, X, Y) => { c.moveTo(X(hd[0] - 1), Y(hd[1] - 3.5)); c.quadraticCurveTo(X(hd[0] - 5), Y(hd[1] - 2), X(chest[0] - 5.5 + trail), Y(chest[1] + 3)); c.lineTo(X(chest[0] - 4.5 + trail * 0.6), Y(chest[1] + 1)); c.lineTo(X(chest[0] - 3.6 + trail * 0.8), Y(chest[1] + 4)); c.lineTo(X(chest[0] - 2.4), Y(chest[1] + 0.5)); c.lineTo(X(chest[0] - 1), Y(chest[1] + 1.5)); c.lineTo(X(hd[0] + 0.5), Y(hd[1] + 3)); }, cloth, { sh: 1, hl: 0.5 });
  mantle();
  A.shape((c, X, Y) => { c.moveTo(X(hd[0] + 0.8), Y(hd[1] + 3.2)); c.lineTo(X(hd[0] + 3.6), Y(hd[1] + 3.4)); c.lineTo(X(hd[0] + 3.2), Y(hd[1] + 5.4)); c.lineTo(X(hd[0] + 1), Y(hd[1] + 5.2)); }, bone, { sh: 0.4, hl: 0.4 });   // the jaw beneath
  for (let i = 0; i < 4; i++) A.fine(hd[0] + 1.3 + i * 0.6, hd[1] + 3.6, i % 2 ? B[4] : GAP);
  A.limb([[hd[0] - 1, hd[1] + 2.5], [chest[0] + 0.6, chest[1] - 3.6]], 1.6, 1.8, iron, { sh: 0.5, hl: 0.4 });           // the gorget
  A.poly([[hd[0] - 3.7, hd[1] + 3.2], [hd[0] - 4, hd[1] - 1.4], [hd[0] - 2.6, hd[1] - 4.8], [hd[0] + 0.3, hd[1] - 6], [hd[0] + 2.9, hd[1] - 5], [hd[0] + 4.2, hd[1] - 2.2], [hd[0] + 4.5, hd[1] + 1.2], [hd[0] + 3.9, hd[1] + 3.4]], iron, { sh: 1.2, hl: 0.7, metal: true });
  A.limb([[hd[0] - 3.2, hd[1] - 4.4], [hd[0] - 0.4, hd[1] - 6.4], [hd[0] + 2.6, hd[1] - 5.4]], 0.55, 0.5, iron, { sh: 0.2, hl: 0.3, metal: true });   // the comb along the crown
  A.hair(hd[0] - 3.8, hd[1] - 2.4, hd[0] + 4.3, hd[1] - 2.2, I[1]); for (let i = 0; i < 3; i++) A.stud(hd[0] - 3.2 + i * 2, hd[1] - 3.3, 'znRust');
  // the T of the barbute's face: the skull looks out of it, one cold eye lit, teeth bared
  A.poly([[hd[0] + 0.6, hd[1] - 1.8], [hd[0] + 4.5, hd[1] - 1.9], [hd[0] + 4.5, hd[1] - 0.2], [hd[0] + 3.4, hd[1] - 0.2], [hd[0] + 3.4, hd[1] + 3.3], [hd[0] + 1.8, hd[1] + 3.3], [hd[0] + 1.8, hd[1] - 0.2], [hd[0] + 0.6, hd[1] - 0.2]], GAP, { flat: true, contour: false });
  A.ell(hd[0] + 2.8, hd[1] + 0.6, 1.6, 2.6, bone, { sh: 0.6, hl: 0.4, contour: false });
  A.ell(hd[0] + 2.2, hd[1] - 1, 0.9, 0.7, GAP, { flat: true, contour: false }); A.fine(hd[0] + 4, hd[1] - 1.1, GAP);
  A.px(hd[0] + 2.1, hd[1] - 1.2, EYE); A.fine(hd[0] + 2.4, hd[1] - 1.1, EYE2);
  A.fine(hd[0] + 3, hd[1] + 0.8, GAP); A.fine(hd[0] + 3.4, hd[1] + 0.9, GAP);
  for (let i = 0; i < 3; i++) { A.fine(hd[0] + 2.1 + i * 0.5, hd[1] + 2.1, i % 2 ? GAP : B[4]); A.fine(hd[0] + 2.1 + i * 0.5, hd[1] + 2.7, i % 2 ? B[3] : GAP); }
  A.hair(hd[0] + 3.6, hd[1] + 3.3, hd[0] + 3.7, hd[1] + 5, RU[3]); A.speck(hd[0] - 4, hd[1] - 4, 5, 7, RU[2], 6, 91);
  if (!behind) { shield(); mace(); drawNearArm(); } else shield();
  if (false) { const c = shN, rr = Math.hypot(M[0] - c[0], M[1] - c[1]), a1 = Math.atan2(M[1] - c[1], M[0] - c[0]); for (let j = 0; j < 3; j++) { let pv = null; for (let a = a1 - 0.75 + j * 0.15; a <= a1 - 0.12; a += 0.05) { const p = [c[0] + Math.cos(a) * (rr + 1.8 - j * 1.8), c[1] + Math.sin(a) * (rr + 1.8 - j * 1.8)]; if (pv) A.hair(pv[0], pv[1], p[0], p[1], ['#9aa2b4', '#c4ccd8', '#5a6278'][j]); pv = p; } } }
  if (atk && ph === 2) for (let i = 0; i < 8; i++) { const a = -3 + i * 0.4, rr = 3 + znH(i) * 4; A.px(M[0] + 2 + Math.cos(a) * rr, Math.min(-0.5, M[1] + Math.sin(a) * rr * 0.7), i % 3 ? MAT.znSoil[3] : '#ffd890'); }
  A.lamp(hd[0] + 3.3, hd[1] - 0.9, [140, 210, 255], 9, wind || atk ? 1.1 : 0.8);
  A.rim([120, 140, 180], 0.35);
};

// ------------------------------------------------------------------- MARROW DUELIST: a skeleton fencer with a curved blade
defMat('znFelt', '#060408', '#140c14', '#221620', '#34222e', '#4a3040');
defMat('znSash', '#0c0204', '#2a060c', '#4a0c16', '#721822', '#9a2a2e');
MPX.duelist = function (A, pose, ph, pal) {
  const t = pal.tint, bone = tintMat('bone', t, 0.4), cape = tintMat('clothRed', t, 0.45), felt = tintMat('znFelt', t, 0.3), sash = tintMat('znSash', t, 0.45), boot = tintMat('leather', t, 0.3);
  const B = MAT[bone], CP = MAT[cape], GD = MAT.gold, ST = MAT.steel, GAP = '#0a0608';
  const idle = pose === 'idle', walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk', parry = pose === 'parry';
  const G8 = walk ? gait(ph, 8) : null;
  let hip, chest, na, fa, hand, bang, fhand, trail = 0, k = 0, jaw = 0.3;
  if (walk) { hip = [0.4, -18.8 + G8.bob * 1 + 0.5]; chest = [1.2, hip[1] - 10]; na = [5.5 + G8.swing * 4.2, -1.6 - G8.lift * 2.6]; fa = [-5.5 - G8.swing * 4.2, -1.6 - G8.liftF * 2.6]; hand = [chest[0] + 9, chest[1] + 3.5 + G8.bob * 0.4]; bang = -0.5 + G8.swing * 0.05; fhand = [chest[0] - 5.5, chest[1] - 3 + G8.bob * 0.5]; trail = -G8.swing * 1.3 - 1.2; }
  else if (wind) { k = [0.35, 0.7, 1][ph]; hip = [-0.8 * k, -18.5 + 0.9 * k]; chest = [0.6 - 1.8 * k, hip[1] - 10]; na = [7, -1.6]; fa = [-6.5, -1.6]; hand = [chest[0] + 9.5 - 4 * k, chest[1] + 3.2 - 9 * k]; bang = -0.55 - 1.35 * k; fhand = [chest[0] - 6.5, chest[1] - 4 - 1.5 * k]; trail = 0.5 * k; }
  else if (atk) { hip = [[3.2, -16.4], [4.6, -15.6], [3, -16.8]][ph]; chest = [[6.8, -25.8], [8.6, -24.8], [5.8, -26.5]][ph]; na = [[12.5, -1.6], [14, -1.6], [12.5, -1.6]][ph]; fa = [[-9, -1.6], [-9, -1.6], [-8.5, -1.6]][ph]; hand = [[chest[0] + 10, chest[1] + 0.5], [chest[0] + 9, chest[1] + 6], [chest[0] + 8, chest[1] + 8.5]][ph]; bang = [-0.2, 0.5, 1.0][ph]; fhand = [chest[0] - 8, chest[1] - 2]; trail = [2, 2.6, 1.6][ph]; jaw = 1; }
  else if (parry) { hip = [-1.2, -18]; chest = [-1.4, -28.2]; na = [6.5, -1.6]; fa = [-7, -1.6]; hand = [chest[0] + 4, chest[1] - 12.5]; bang = -0.32; fhand = [chest[0] + 7.5, chest[1] - 14]; trail = 1; jaw = 0.8; }
  else { const b = Math.sin(ph / 4 * 6.2832); hip = [0, -18.5 + b * 0.3]; chest = [0.6, -28.5 + b * 0.45]; na = [7, -1.6]; fa = [-6.5, -1.6]; hand = [chest[0] + 9.5, chest[1] + 3.2 + b * 0.25]; bang = -0.55 + b * 0.05; fhand = [chest[0] - 6, chest[1] - 3.5 + b * 0.4]; trail = b * 0.5; }
  const neck = [chest[0] + 1.1, chest[1] - 4.8], hc = [chest[0] + 2.2, chest[1] - 8.4], shN = [chest[0] + 0.6, chest[1] - 3.6], shF = [chest[0] - 0.8, chest[1] - 3.4];
  const FAR = { tone: -1.7, contour: false, sh: 0.6, hl: 0.4 }, NEAR = { sh: 0.6, hl: 0.45 };
  // ---- a leg: a bare femur, a bone knee, then a tall cuffed boot
  const leg = (hp, a, o, far) => {
    const kn = znIK(hp, a, 9.8, 9.6, 'x');
    A.limb([hp, kn], 0.85, 0.7, bone, o); if (!far) A.hair(hp[0] - 0.4, hp[1] + 1, kn[0] - 0.5, kn[1] - 0.8, B[4]);
    A.ell(kn[0] + 0.2, kn[1], 1.1, 1, bone, o);
    const d = znNorm([a[0] - kn[0], a[1] - kn[1]]), top = [kn[0] + d[0] * 1.6, kn[1] + d[1] * 1.6];
    A.limb([top, a], 1.35, 1.1, boot, o);
    A.poly([[top[0] - 2, top[1] - 1.2], [top[0] + 2.3, top[1] - 1.8], [top[0] + 1.8, top[1] + 1.4], [top[0] - 1.6, top[1] + 1.6]], boot, { ...o, lit: far ? 0 : 0.1, sh: 0.4, hl: 0.4 });   // the cuff
    A.poly([[a[0] - 1.6, Math.min(0, a[1] + 1.6)], [a[0] - 1.4, a[1] - 0.8], [a[0] + 1.3, a[1] - 0.6], [a[0] + 4.6, a[1] + 1.1], [a[0] + 4.4, Math.min(0, a[1] + 1.6)]], boot, { ...o, sh: 0.4, hl: 0.4 });
    A.rect(a[0] - 1.8, Math.min(0, a[1] + 1.6) - 1.2, 1.2, 1.2, far ? '#0a0604' : '#1c120c');                                   // the heel
    if (!far) { A.hair(top[0] - 0.8, top[1] + 1.8, a[0] - 0.8, a[1] - 0.6, MAT.leather[3]); A.fine(a[0] + 2.4, a[1] + 0.3, MAT.leather[4]); }
  };
  const arm = (s, h, o, far, glove) => {
    const e = znIK(s, h, 6.6, 6.2, 'y');
    A.limb([s, e], 0.7, 0.6, bone, o); A.ell(e[0], e[1], 0.8, 0.8, bone, o);
    const dd = znNorm([h[0] - e[0], h[1] - e[1]]), nx = -dd[1] * 0.45, ny = dd[0] * 0.45;
    A.limb([[e[0] + nx, e[1] + ny], [h[0] + nx, h[1] + ny]], 0.4, 0.35, bone, o); A.limb([[e[0] - nx, e[1] - ny], [h[0] - nx * 0.4, h[1] - ny * 0.4]], 0.35, 0.3, bone, o);   // radius and ulna
    if (glove) { const g0 = znLerp(e, h, 0.55); A.poly([[g0[0] - dd[1] * 1.6, g0[1] + dd[0] * 1.6], [g0[0] + dd[1] * 1.6, g0[1] - dd[0] * 1.6], [h[0] + dd[1] * 1.1, h[1] - dd[0] * 1.1], [h[0] - dd[1] * 1.1, h[1] + dd[0] * 1.1]], boot, { sh: 0.4, hl: 0.4 }); }
    else { A.ell(h[0] + dd[0] * 0.6, h[1] + dd[1] * 0.6, 0.9, 0.7, bone, { ...o, rot: Math.atan2(dd[1], dd[0]) }); for (let i = 0; i < 3; i++) { const a = Math.atan2(dd[1], dd[0]) + (i - 1) * 0.4 - 0.5; A.hair(h[0] + dd[0] * 1.1, h[1] + dd[1] * 1.1, h[0] + dd[0] * 1.1 + Math.cos(a) * 1.6, h[1] + dd[1] * 1.1 + Math.sin(a) * 1.6, far ? B[1] : B[3]); } }
    return e;
  };
  // ---- the sabre: a curved blade, edge down, gilt knuckle-bow and pommel
  const d = [Math.cos(bang), Math.sin(bang)], e = [-d[1], d[0]], L = 16;
  const BP = s => [hand[0] + d[0] * L * s - e[0] * 0.16 * L * s * s, hand[1] + d[1] * L * s - e[1] * 0.16 * L * s * s];
  const tip = BP(1);
  const blade = () => {
    const edge = [], spine = [];
    for (let i = 0; i <= 10; i++) { const s = 0.04 + i * 0.096, p = BP(s), w = 0.85 * (1 - Math.pow(s, 2.4)) + 0.08; edge.push([p[0] + e[0] * w * 0.6, p[1] + e[1] * w * 0.6]); spine.push([p[0] - e[0] * w * 0.5, p[1] - e[1] * w * 0.5]); }
    A.poly([...edge, tip, ...spine.reverse()], 'steel', { metal: true, sh: 0.35, hl: 0.35 });
    for (let i = 0; i < 9; i++) { const a = BP(0.06 + i * 0.1), b = BP(0.16 + i * 0.1), w = 0.85 * (1 - Math.pow(0.1 + i * 0.1, 2.4)) * 0.55; A.hair(a[0] + e[0] * w, a[1] + e[1] * w, b[0] + e[0] * w, b[1] + e[1] * w, i % 3 === 1 ? '#ffffff' : ST[4]); }   // the honed edge
    { const a = BP(0.08), b = BP(0.55); A.hair(a[0] - e[0] * 0.1, a[1] - e[1] * 0.1, b[0] - e[0] * 0.1, b[1] - e[1] * 0.1, ST[1]); }                                  // the fuller
    const g = [hand[0] + d[0] * 0.3, hand[1] + d[1] * 0.3];
    A.limb([[g[0] - e[0] * 1.3, g[1] - e[1] * 1.3], [g[0] + e[0] * 1.6, g[1] + e[1] * 1.6]], 0.45, 0.4, 'gold', { sh: 0.2, hl: 0.3, metal: true });   // the quillons
    A.limb([[hand[0] - d[0] * 2.3, hand[1] - d[1] * 2.3], hand], 0.55, 0.5, 'leather', { sh: 0.2, hl: 0.2 });
    const kb = [[g[0] + e[0] * 1.6, g[1] + e[1] * 1.6], [hand[0] - d[0] * 1 + e[0] * 2.3, hand[1] - d[1] * 1 + e[1] * 2.3], [hand[0] - d[0] * 2.6 + e[0] * 0.6, hand[1] - d[1] * 2.6 + e[1] * 0.6]];
    A.hair(kb[0][0], kb[0][1], kb[1][0], kb[1][1], GD[3]); A.hair(kb[1][0], kb[1][1], kb[2][0], kb[2][1], GD[2]);
    A.ell(hand[0] - d[0] * 2.7, hand[1] - d[1] * 2.7, 0.8, 0.8, 'gold', { sh: 0.2, hl: 0.3, metal: true });
  };
  // ================================================================ painting order
  leg([hip[0] - 0.6, hip[1]], fa, FAR, true);
  arm(shF, fhand, FAR, true, false);
  // the half-cape, hung off the shoulders and tattered to points, trailing a beat behind
  A.shape((c, X, Y) => { c.moveTo(X(neck[0] + 0.4), Y(neck[1] + 0.2)); c.quadraticCurveTo(X(shF[0] - 2.5), Y(shF[1] - 1.4), X(chest[0] - 5.2 + trail * 0.6), Y(chest[1] + 1)); c.lineTo(X(chest[0] - 6.5 + trail * 1.2), Y(chest[1] + 8)); c.lineTo(X(chest[0] - 5 + trail), Y(chest[1] + 6)); c.lineTo(X(chest[0] - 4.2 + trail * 1.1), Y(chest[1] + 10)); c.lineTo(X(chest[0] - 3 + trail * 0.8), Y(chest[1] + 6.5)); c.lineTo(X(chest[0] - 1.8 + trail * 0.7), Y(chest[1] + 8.5)); c.lineTo(X(chest[0] - 1), Y(chest[1] + 4)); c.lineTo(X(shN[0] + 0.5), Y(shN[1] + 1.2)); }, cape, { sh: 1.2, hl: 0.7 });
  A.poly([[shF[0] - 1.4, shF[1] + 1], [chest[0] - 4.4 + trail, chest[1] + 7], [chest[0] - 3 + trail * 0.8, chest[1] + 6]], cape, { flat: true, tone: -1.4, contour: false, edge: false });
  A.hair(shF[0] - 2.4, shF[1] + 0.4, chest[0] - 5.8 + trail, chest[1] + 7, CP[3]);
  // the pelvis, the spine and the ribcage, dark inside
  A.ell(hip[0] + 0.2, hip[1] - 0.8, 2.6, 1.6, bone, { rot: 0.25, sh: 0.5, hl: 0.4 }); A.ell(hip[0] + 0.6, hip[1] - 0.6, 0.9, 0.6, GAP, { flat: true, contour: false });
  for (let i = 0; i < 5; i++) { const p = znLerp([hip[0] - 1.2, hip[1] - 2], [chest[0] - 1.6, chest[1] + 3.5], i / 4); A.ell(p[0], p[1], 0.75, 0.6, bone, { sh: 0.3, hl: 0.3 }); }
  A.shape((c, X, Y) => { c.moveTo(X(chest[0] - 2.2), Y(chest[1] - 3.4)); c.quadraticCurveTo(X(chest[0] + 3.8), Y(chest[1] - 3.8), X(chest[0] + 3.2), Y(chest[1] + 1.5)); c.quadraticCurveTo(X(chest[0] + 1.4), Y(chest[1] + 4.2), X(chest[0] - 2), Y(chest[1] + 3.6)); c.quadraticCurveTo(X(chest[0] - 3), Y(chest[1]), X(chest[0] - 2.2), Y(chest[1] - 3.4)); }, '#0c0a0e', { flat: true, contour: false });
  for (let i = 0; i < 5; i++) { const y = chest[1] - 2.6 + i * 1.35; A.limb([[chest[0] - 2.2, y], [chest[0] + 1, y - 0.9 + i * 0.1], [chest[0] + 2.8 - i * 0.3, y + 0.6]], 0.42, 0.36, bone, { sh: 0.25, hl: 0.25, contour: false }); }
  A.limb([[chest[0] + 2.9, chest[1] - 2.8], [chest[0] + 2.3, chest[1] + 1.8]], 0.5, 0.45, bone, { sh: 0.2, hl: 0.3 });
  for (let i = 0; i < 3; i++) A.ell(chest[0] - 2.2 + i * 0.4, chest[1] - 3 + i * 2.2, 0.7, 0.6, bone, { sh: 0.3, hl: 0.3 });
  // the sash round the pelvis, its tails flying
  const knot = [hip[0] - 2.4, hip[1] - 2];
  A.limb([knot, [knot[0] - 2 + trail * 0.6, knot[1] + 3], [knot[0] - 3.6 + trail * 1.3, knot[1] + 6.5]], 0.9, 0.55, sash, { sh: 0.4, hl: 0.3 });
  A.limb([knot, [knot[0] - 0.6 + trail * 0.4, knot[1] + 3.6], [knot[0] - 1.6 + trail * 0.9, knot[1] + 7.5]], 0.8, 0.5, sash, { sh: 0.4, hl: 0.3, tone: -0.8 });
  A.limb([[hip[0] - 2.8, hip[1] - 1.8], [hip[0] + 0.6, hip[1] - 2.6], [hip[0] + 3, hip[1] - 2.2]], 1.2, 1.1, sash, { sh: 0.6, hl: 0.4 });
  A.ell(knot[0], knot[1], 1.2, 1, sash, { sh: 0.4, hl: 0.3 });
  leg([hip[0] + 0.8, hip[1]], na, NEAR, false);
  // ---- the skull, in a cocked hat with a broken plume
  A.ell(hc[0], hc[1], 3.2, 3.1, bone, { sh: 0.9, hl: 0.6 });
  A.poly([[hc[0] + 0.6, hc[1] + 0.2], [hc[0] + 3.4, hc[1] - 0.6], [hc[0] + 3.8, hc[1] + 1.4], [hc[0] + 3.1, hc[1] + 2.7], [hc[0] + 0.6, hc[1] + 2.6]], bone, { sh: 0.6, hl: 0.4, contour: false });
  A.ell(hc[0] + 1.8, hc[1] - 0.1, 1.15, 1.1, GAP, { flat: true, contour: false });
  A.fine(hc[0] + 2.1, hc[1], '#ff6a3a'); A.fine(hc[0] + 1.6, hc[1] + 0.1, '#a02a10'); if (wind || atk || parry) A.fine(hc[0] + 2.4, hc[1] - 0.3, '#ffe0a0');
  A.poly([[hc[0] + 3.3, hc[1] + 0.7], [hc[0] + 3.8, hc[1] + 1.6], [hc[0] + 3.1, hc[1] + 1.7]], GAP, { flat: true, contour: false });
  A.hair(hc[0] + 0.8, hc[1] + 1.4, hc[0] + 2.8, hc[1] + 1.2, B[4]); A.hair(hc[0] - 1.8, hc[1] + 0.6, hc[0] - 0.8, hc[1] - 1.2, B[1]);    // the cheekbone, a crack at the temple
  for (let i = 0; i < 4; i++) A.fine(hc[0] + 1.4 + i * 0.6, hc[1] + 2.5, i % 2 ? B[4] : GAP);
  A.poly([[hc[0] - 0.4, hc[1] + 2.2], [hc[0] + 3.2, hc[1] + 2.7 + jaw], [hc[0] + 3, hc[1] + 4 + jaw], [hc[0] + 0.6, hc[1] + 3.9 + jaw * 0.6], [hc[0] - 0.6, hc[1] + 3]], bone, { sh: 0.4, hl: 0.4 });
  for (let i = 0; i < 3; i++) A.fine(hc[0] + 1.6 + i * 0.6, hc[1] + 2.6 + jaw, i % 2 ? GAP : B[3]);
  // a ruff of rotted lace at the neck
  for (let i = 0; i < 5; i++) A.ell(neck[0] - 1.6 + i * 0.9, neck[1] + 0.8 - Math.sin(i / 4 * 3.14) * 0.4, 0.8, 0.7, 'clothBone', { sh: 0.3, hl: 0.3 });
  // the hat
  const hb = [hc[0] + 0.4, hc[1] - 2.7];
  A.poly([[hb[0] - 3, hb[1] + 0.2], [hb[0] - 2.4, hb[1] - 3.6], [hb[0] + 0.2, hb[1] - 4.6], [hb[0] + 2.4, hb[1] - 3.4], [hb[0] + 3, hb[1] - 0.2]], felt, { sh: 0.8, hl: 0.6 });
  A.hair(hb[0] - 2.8, hb[1] - 1, hb[0] + 2.9, hb[1] - 1.2, '#5a1420'); A.fine(hb[0] + 1.6, hb[1] - 1.1, GD[4]);
  const plumeY = walk ? G8.bob * 0.6 : 0, pt = trail * 0.6;
  A.limb([[hb[0] - 1.6, hb[1] - 3.6], [hb[0] - 5 + pt, hb[1] - 5.4 + plumeY], [hb[0] - 9 + pt * 1.5, hb[1] - 4 + plumeY], [hb[0] - 11 + pt * 2, hb[1] - 0.6 + plumeY * 1.5]], 1.4, 0.45, 'clothBone', { sh: 0.5, hl: 0.4 });
  for (let i = 0; i < 7; i++) { const s = 0.2 + i * 0.12, x = hb[0] - 1.6 - 9.4 * s + pt * s * 2, y = hb[1] - 3.6 - Math.sin(s * 3.1) * 2 + s * 2.8 + plumeY; A.hair(x, y, x - 1, y + 1.6, i % 2 ? '#3a342a' : MAT.clothBone[1]); }
  A.shape((c, X, Y) => { c.moveTo(X(hb[0] - 6.4), Y(hb[1] + 0.2)); c.quadraticCurveTo(X(hb[0]), Y(hb[1] - 1.8), X(hb[0] + 6.6), Y(hb[1] - 0.6)); c.lineTo(X(hb[0] + 6), Y(hb[1] + 0.8)); c.quadraticCurveTo(X(hb[0]), Y(hb[1] + 0.6), X(hb[0] - 6.4), Y(hb[1] + 0.2)); }, felt, { sh: 0.5, hl: 0.4 });
  A.hair(hb[0] + 1, hb[1] + 1.1, hb[0] + 4.2, hb[1] + 0.8, GAP);
  // ---- sword arm and blade over everything
  const smear = (a0, a1) => { const c = shN, rr = Math.hypot(tip[0] - c[0], tip[1] - c[1]); for (let j = 0; j < 3; j++) { let pv = null; for (let a = a0; a <= a1; a += 0.06) { const p = [c[0] + Math.cos(a) * (rr - j * 1.1), c[1] + Math.sin(a) * (rr - j * 1.1)]; if (pv) A.hair(pv[0], pv[1], p[0], p[1], ['#e8eef8', '#9aa4b8', '#5a6478'][j]); pv = p; } } };
  if (atk && ph < 2) { const a1 = Math.atan2(tip[1] - shN[1], tip[0] - shN[0]); smear(a1 - (ph ? 0.9 : 1.4), a1 - 0.15); }
  blade();
  arm(shN, hand, NEAR, false, true);
  for (let i = 0; i < 3; i++) A.fine(hand[0] + e[0] * (i * 0.6 - 0.4) + d[0] * 0.2, hand[1] + e[1] * (i * 0.6 - 0.4) + d[1] * 0.2, B[3 + (i % 2)]);   // bone knuckles on the grip
  if (wind && ph === 2 || idle && ph === 1) { A.fine(tip[0], tip[1], '#ffffff'); A.fine(tip[0] + 0.8, tip[1], '#c4ccd8'); A.fine(tip[0] - 0.8, tip[1], '#c4ccd8'); A.fine(tip[0], tip[1] - 0.8, '#c4ccd8'); A.fine(tip[0], tip[1] + 0.8, '#c4ccd8'); }
  if (parry) { const sp = BP(0.42); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832, l = i % 2 ? 1.6 : 3; A.hair(sp[0], sp[1] - 0.8, sp[0] + Math.cos(a) * l, sp[1] - 0.8 + Math.sin(a) * l, i % 2 ? '#ffb040' : '#fff6c0'); } A.lamp(sp[0], sp[1] - 1, [255, 220, 150], 10, 0.9); }
  A.lamp(hc[0] + 2, hc[1], [255, 110, 50], 5, 0.8);
  A.rim([130, 140, 175], 0.35);
};
