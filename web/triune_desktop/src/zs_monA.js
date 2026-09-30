
// =================================================================== v0.34: shared finishing kit for the creature painters (zs_mon*, zs_heralds)
// The Iron Golem's finish, as hand tools: dark seams with a lit bevel, rivets and knuckles, specular speckle scattered
// over the lit side of a part, and hard rim lights. Every call places single pixels (A.px), so paint them after the
// part they sit on and before anything that covers it. Deterministic: the same frame always gets the same speckle.
const ZS32 = {
  h(i) { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); },
  // a dark seam from a to b with a lit bevel one pixel below (a plate edge catching the light under the groove)
  seam(A, a, b, dark, lite, off) { const o = off || [0, 1]; if (lite) A.line(a[0] + o[0], a[1] + o[1], b[0] + o[0], b[1] + o[1], lite); A.line(a[0], a[1], b[0], b[1], dark); },
  // rivets / knuckles: a bright pixel with its shadow down-right
  rivet(A, x, y, hi, lo) { A.px(x, y, hi); if (lo) A.px(x + 1, y + 1, lo); },
  // specular speckle over an ellipse, weighted to its upper-left (lit) side; cols is a list picked at random
  speck(A, cx, cy, rx, ry, cols, n, seed) {
    for (let i = 0, k = 0; i < n && k < n * 6; k++) {
      const u = ZS32.h(seed + k * 3.1) * 2 - 1, v = ZS32.h(seed + k * 7.7 + 1.3) * 2 - 1;
      if (u * u + v * v > 1 || u + v > 0.5 + ZS32.h(seed + k) * 0.6) continue;
      A.px(cx + u * rx, cy + v * ry, cols[(ZS32.h(seed + k * 1.9) * cols.length) | 0]); i++;
    }
  },
  // grime / pits: dark flecks spread through an ellipse, weighted to the lower-right (shadow) side
  grime(A, cx, cy, rx, ry, cols, n, seed) {
    for (let i = 0, k = 0; i < n && k < n * 6; k++) {
      const u = ZS32.h(seed + k * 5.3) * 2 - 1, v = ZS32.h(seed + k * 2.9 + 4.1) * 2 - 1;
      if (u * u + v * v > 1 || u + v < -0.6 + ZS32.h(seed + k + 9) * 0.5) continue;
      A.px(cx + u * rx, cy + v * ry, cols[(ZS32.h(seed + k * 4.3) * cols.length) | 0]); i++;
    }
  },
  // a stitched line: the cut in dark and cross-stitches either side
  stitch(A, a, b, dark, thread, step) {
    A.line(a[0], a[1], b[0], b[1], dark); const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, n = Math.max(1, Math.round(l / (step || 2)));
    for (let i = 1; i < n; i++) { const x = a[0] + dx * i / n, y = a[1] + dy * i / n; A.px(x + nx * 1.2, y + ny * 1.2, thread); A.px(x - nx * 1.2, y - ny * 1.2, thread); }
  },
  hex(m, i) { const c = PMAT[m] ? PMAT[m][Math.max(0, Math.min(4, i))] : [255, 0, 255]; return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); },
};

(function () {  // file scope: each art file keeps its own helpers
// =================================================================== v0.23: Act I creatures in 32-bit pixel art (A)
// The Husk (hollow), the Gravebloat (bloat) and the Vein-Borer (worm), painted with the native pixel painter
// (zo_pix.js) and registered as M32 painters (zr_mon32.js). All face right. Every top-level name carries 'zsa'.
pmat('zsaSkin', ['#0b090e', '#27222c', '#4c454c', '#7a7064', '#a89a7e']);      // grey-dead skin
pmat('zsaRot', ['#0a0706', '#241a12', '#46321f', '#6e5334', '#a08458']);        // a rotten mantle
pmat('zsaWax', ['#3a2a18', '#6a5634', '#a8926a', '#d8c8a0', '#f4ead0']);
pmat('zsaBone', ['#1e1a14', '#5a5040', '#9c8e70', '#d4c6a0', '#fffae6']);
pmat('zsaGut', ['#120c18', '#352a3e', '#5e5068', '#958698', '#d8ccd8']);       // grey-violet gut-sack
pmat('zsaLip', ['#16040c', '#3e1220', '#6a2438', '#9a4450', '#d07a72']);       // sphincter / raw flesh
pmat('zsaArt', ['#12030c', '#3c0c24', '#6c1838', '#a42e4c', '#e2708a']);       // the artery
pmat('zsaArtDk', ['#08020a', '#1a0614', '#300c20', '#48142c', '#62203c']);
pmat('zsaSoil', ['#090706', '#1a1410', '#2e2419', '#463624', '#5e4a32']);
pmat('zsaCord', ['#140e08', '#2e2214', '#524028', '#7a6240', '#9a8258']);
const ZSA_BL = ['#1a0206', '#5a0a12', '#8e141a', '#c42a22', '#ff6a30', '#ffb070'];   // the god's blood, dark to glowing
const ZSA_BILE = ['#1c200a', '#3e4a12', '#76861e', '#b4c438', '#e6f07a'];
const zsaHex = (m, i) => { const c = PMAT[m][Math.max(0, Math.min(4, i))]; return `rgb(${c[0]},${c[1]},${c[2]})`; };
const zsaL = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const zsaH = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
// a rotated ellipse as a polygon (Pix ellipses are axis-aligned)
function zsaEllR(A, cx, cy, rx, ry, rot, mat, o, n = 20) {
  const c = Math.cos(rot), s = Math.sin(rot), p = [];
  for (let i = 0; i < n; i++) { const a = i / n * 6.2832, x = Math.cos(a) * rx, y = Math.sin(a) * ry; p.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return A.poly(p, mat, o);
}

// ------------------------------------------------------------------- THE HUSK
M32F.hollow = [50, 46, 18, 43]; M32WALK.hollow = 4.6; M32BACK.hollow = true;
M32.hollow = function (A, pose, ph, pal, view) {
  const t = pal.tint, sk = tint32('zsaSkin', t), rot = tint32('zsaRot', t, 0.3), bn = tint32('zsaBone', t, 0.25), SK = i => zsaHex(sk, i), RT = i => zsaHex(rot, i), BN = i => zsaHex(bn, i);
  const idle = pose === 'idle', walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk', back = view === 'back';
  const a = walk ? ph / 8 * 6.2832 : 0;
  let bx = 0, by = 0, sw = 0, nod = 0;
  if (idle) { by = ph === 1 || ph === 2 ? 1 : 0; nod = ph === 2 ? 1 : 0; }
  if (walk) { by = Math.round(Math.abs(Math.sin(a)) * 1.4); bx = Math.round(Math.sin(a) * 0.7); sw = Math.sin(a - 0.6); nod = Math.round(Math.sin(a * 2 - 1.2)); }
  const kw = wind ? [0.35, 0.7, 1][ph] : 0, ka = atk ? [1, 0.8, 0.4][ph] : 0;
  if (atk) { bx = [5, 6, 3][ph]; by = [2, 3, 1][ph]; }
  // the spine: pelvis, the bent back, the hump, the shoulders, the neck; the tell rears it up, the lunge throws it forward
  const hip = [12 + bx * 0.4, 28 + by];
  const Hu = [20 + bx - kw * 1, 15 + by - kw * 3 + ka];
  const S = [28 + bx - kw * 1.5 + ka * 2, 18 + by - kw * 6 + ka * 2];
  const N = [S[0] + 3 + ka, S[1] + 3 - kw * 3];
  const head = [Math.round(N[0] + 5 + kw * 1 + ka), Math.round(N[1] + 2.5 + nod - kw * 5 - ka)];
  const EMB = ZSA_BL;
  // ---- legs: the near leg steps, the far one drags its toes
  let kN, aN, kF, aF;
  if (walk) {
    const lift = Math.max(0, Math.cos(a)) * 2.2;
    aN = [18 + Math.sin(a) * 5, 42 - lift]; kN = [21 + Math.sin(a) * 3 + lift * 0.6, 35 + by * 0.4 - lift * 0.6];
    aF = [10 - Math.sin(a) * 3, 42]; kF = [15 - Math.sin(a) * 2, 35 + by * 0.4];
  } else if (atk) { aN = [25, 42]; kN = [25, 34]; aF = [10, 42]; kF = [14, 35]; }
  else { aN = [18, 42]; kN = [21, 35 + by * 0.4]; aF = [10, 42]; kF = [15, 35 + by * 0.4]; }
  // a leg of three parts: the wasted thigh, the knee-cap standing out of it, the shin with the bone showing down its front
  const leg = (h, k, an, far, fromBack) => {
    const o = far ? { tone: -1 } : {};
    A.limb([h, k], 2.8, 1.8, sk, Object.assign({ band: 2 }, o));
    A.limb([k, an], 1.7, 1.1, sk, o);
    if (fromBack) A.poly([[an[0] - 2, an[1] - 1.5], [an[0] + 1, an[1] - 1], [an[0] + 3.5, an[1] + 0.5], [an[0] + 3, an[1] + 1.5], [an[0] - 2.2, an[1] + 1.5]], sk, o);
    else if (far) A.poly([[an[0] - 1, an[1] - 1], [an[0] + 1.2, an[1] - 1], [an[0] - 0.5, an[1] + 1.5], [an[0] - 4.5, an[1] + 1.5]], sk, o);
    else A.poly([[an[0] - 1.5, an[1] - 1.2], [an[0] + 1, an[1] - 1.2], [an[0] + 4.5, an[1] + 0.6], [an[0] + 4.5, an[1] + 1.5], [an[0] - 1.5, an[1] + 1.5]], sk, o);
    A.ell(k[0] + (fromBack ? -0.5 : 0.8), k[1] - 0.3, 1.5, 1.4, bn, Object.assign({ contourAll: !far }, o));        // the knee-cap
    const d = far ? 1 : 0;
    A.px(k[0] + (fromBack ? -1 : 0), k[1] - 1, BN(far ? 2 : 4));
    if (!fromBack) {
      A.line(k[0] + 1.2, k[1] + 1.5, an[0] + 0.8, an[1] - 1.5, far ? BN(1) : BN(3));                                  // the shin bone
      A.line(k[0] - 0.4, k[1] + 2, an[0] - 0.6, an[1] - 1.5, SK(0));                                                      // the groove behind it
      if (!far) { A.px(an[0] + 4, an[1] + 1, '#0a0806'); A.px(an[0] + 2, an[1] + 1, '#0a0806'); A.px(an[0] + 3, an[1], SK(3)); A.px(an[0] + 1, an[1] - 1, BN(3)); }   // toes, a knuckle of the ankle
      else { A.px(an[0] - 5, an[1] + 1, SK(0)); if (walk && Math.cos(a) < 0) { A.px(an[0] + 2, 43, '#2a2622'); A.px(an[0] + 4, 43, '#2a2622'); } }
      A.line(h[0] - 1, h[1] + 1 + d, k[0] - 1.5, k[1] - 1, far ? SK(1) : SK(3));                                           // the lit front of the thigh
      A.px((h[0] + k[0]) / 2 + 1, (h[1] + k[1]) / 2 + 1, SK(0));
    } else {
      A.px(an[0] - 2, an[1], SK(4)); A.px(an[0] - 1, an[1] - 1, SK(3)); A.line(an[0] - 1, an[1] + 1, an[0] + 2, an[1] + 1, SK(0));
      A.line(k[0] - 1, k[1] + 2, an[0] - 1, an[1] - 2, far ? SK(1) : SK(3));                                               // the heel-cord
      A.px(k[0] + 0.5, k[1] + 1.5, SK(0));
    }
  };
  // ---- arms (joints): they hang to the knees
  let eN, wN, eF, wF;
  if (wind) { eN = zsaL([S[0] + 2, S[1] + 8], [S[0] + 7, S[1] - 2], kw); wN = zsaL([S[0] + 3, S[1] + 15], [S[0] + 13, S[1] - 6], kw); eF = zsaL([S[0] - 1, S[1] + 8], [S[0] - 6, S[1] - 3], kw); wF = zsaL([S[0], S[1] + 15], [S[0] - 9, S[1] - 9], kw); }
  else if (atk) { const K = [[[7, -2], [14, 0]], [[7, 3], [12, 10]], [[4, 7], [7, 13]]][ph]; eN = [S[0] + K[0][0], S[1] + K[0][1]]; wN = [S[0] + K[1][0], S[1] + K[1][1]]; eF = [S[0] + 4, S[1] + 6]; wF = [S[0] + 9, S[1] + 9]; }
  else { const b = idle ? (ph % 2) * 0.5 : 0; eN = [S[0] + 1 + sw * 2, S[1] + 8]; wN = [S[0] + 2.5 + sw * 3.5, S[1] + 15 - b]; eF = [S[0] - 1 - sw * 2, S[1] + 8]; wF = [S[0] - 1 - sw * 3, S[1] + 14 + b]; }
  // a claw: a knot of knuckles and three long fingers ending in pale hooked nails
  const hand = (e, w, far, spread) => {
    const dx = w[0] - e[0], dy = w[1] - e[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
    A.ell(w[0] + ux * 0.5, w[1] + uy * 0.5, 1.6, 1.5, sk, far ? { tone: -1 } : { contourAll: true });
    if (!far) { A.px(w[0] - 0.5, w[1] - 0.5, SK(4)); A.px(w[0] + 0.5, w[1] - 0.5, BN(3)); }
    for (let i = 0; i < 3; i++) {
      const ang = Math.atan2(uy, ux) + (i - 1) * (0.42 + spread * 0.35), f1 = [w[0] + ux + Math.cos(ang) * 3.2, w[1] + uy + Math.sin(ang) * 3.2], f2 = [f1[0] + Math.cos(ang + 0.7) * 1.7, f1[1] + Math.sin(ang + 0.7) * 1.7];
      A.line(w[0] + ux, w[1] + uy, f1[0], f1[1], far ? SK(1) : i === 0 ? SK(4) : SK(3)); A.px(f1[0], f1[1], far ? SK(0) : SK(1));
      A.line(f1[0], f1[1], f2[0], f2[1], far ? BN(1) : BN(3)); A.px(f2[0], f2[1], far ? '#0a0808' : BN(4));
    }
  };
  // an arm of separate parts: the shoulder knob, the upper arm, the elbow's point of bone, the forearm's two bones
  const arm = (s, e, w, far, spread, fromBack) => {
    const o = far ? { tone: -1 } : {};
    A.limb([s, e], 1.8, 1.3, sk, Object.assign({ contourAll: !far }, o));
    A.limb([e, w], 1.4, 1.0, sk, o);
    A.ell(e[0] + (fromBack ? -0.5 : 0.5), e[1], 1.2, 1.1, bn, o);
    if (!far) {
      A.px(e[0] + (fromBack ? -1 : 0), e[1] - 1, BN(4));
      const dx = w[0] - e[0], dy = w[1] - e[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      A.line(e[0] - nx * 0.6 + dx / l, e[1] - ny * 0.6 + dy / l, w[0] - nx * 0.6 - dx / l, w[1] - ny * 0.6 - dy / l, SK(3));   // the ulna catching the light
      A.px((e[0] + w[0]) / 2 + nx * 0.7, (e[1] + w[1]) / 2 + ny * 0.7, SK(0));
      const sx = s[0] - e[0], sy = s[1] - e[1], sl = Math.hypot(sx, sy) || 1;
      A.line(s[0] - sy / sl * 0.8, s[1] + sx / sl * 0.8 + 0.5, e[0] - sy / sl * 0.8, e[1] + sx / sl * 0.8 - 1, SK(3));
    }
    hand(e, w, far, spread);
  };
  // the pilgrim's candle stuck in the hump with its own wax: a tall stub, runs of wax down its side, a clean flame
  const candle = () => {
    const qx = Math.round(Hu[0] + 1), qy = Math.round(Hu[1] - 5), fl = [0, 1, 0, -1, 0, 1, -1, 0][(ph + (walk ? 0 : 3)) % 8] - (wind && kw > 0.5 ? 1 : 0);
    A.poly([[qx - 3, qy + 1.5], [qx - 1.4, qy - 4], [qx + 1.4, qy - 4], [qx + 3, qy + 1.5]], 'zsaWax', {});
    A.poly([[qx - 3.5, qy + 1], [qx + 3.5, qy + 1], [qx + 4, qy + 2.5], [qx - 4, qy + 2.5]], 'zsaWax', { tone: -1 });   // the pool of old wax
    A.px(qx - 1, qy - 3, zsaHex('zsaWax', 4)); A.px(qx - 2, qy - 1, zsaHex('zsaWax', 4)); A.px(qx - 1, qy, zsaHex('zsaWax', 3)); A.px(qx + 1, qy - 2, zsaHex('zsaWax', 1)); A.px(qx + 2, qy, zsaHex('zsaWax', 1));
    A.px(qx + 3, qy + 2, zsaHex('zsaWax', 2)); A.px(qx + 3, qy + 3, zsaHex('zsaWax', 1)); A.px(qx - 3, qy + 3, zsaHex('zsaWax', 3));   // wax runs
    A.px(qx, qy - 4, '#141010'); A.px(qx, qy - 5, '#2a1a10');
    A.px(qx + fl, qy - 9, '#a02a08'); A.px(qx + fl, qy - 8, '#e0601a'); A.px(qx + fl * 0.5, qy - 7, '#ffa040'); A.px(qx, qy - 6, '#ffe090'); A.px(qx, qy - 5, '#fff8e0');
    A.px(qx - 1, qy - 6, '#a02a08'); A.px(qx + 1, qy - 6, '#e0601a'); A.px(qx - 1, qy - 5, '#e0601a'); A.px(qx + 1, qy - 5, '#a02a08');
    A.px(qx - 2, qy - 4, '#ffd890'); A.px(qx + 2, qy - 4, '#c07030');                      // candlelight on the wax rim
    A.px(qx - 5, qy + 2, SK(4)); A.px(qx + 5, qy + 2, SK(4)); A.px(qx - 4, qy + 3, SK(3)); A.px(qx + 4, qy + 3, SK(3));   // and on the skin round it
  };
  // the spine: knuckles of bone standing proud of the hump, each its own part with a lit cap and a dark underside
  const spine = (pts) => {
    for (const [x, y] of pts) A.ell(x, y, 1.3, 1.2, bn, { contourAll: true });
    for (const [x, y] of pts) { A.px(x - 1, y - 1, BN(4)); A.px(x, y - 1, BN(3)); A.px(x + 1, y + 1, BN(0)); }
  };
  const hem = []; for (let i = 0; i <= 6; i++) { const x = hip[0] - 7 + i * 1.6 - (walk ? sw * 1.3 : 0) * (1 - i / 6) - kw * 2 * (1 - i / 6), y = hip[1] - 1 + (i % 2 ? -2.5 : 0.5) + zsaH(i + 3) * 1.5 - i * 0.6; hem.push([x, y]); }
  const mt = walk ? -Math.round(sw) : 0;
  // the rag over the hump in three torn panels, each its own part so the tears read as dark cuts
  const mantle = (backSide) => {
    const f = backSide ? -1.5 : -2.5;
    A.poly([[Hu[0] - 1, Hu[1] - 5], [Hu[0] - 5, Hu[1] - 3.5], [Hu[0] - 8.5, Hu[1] + 1], [hip[0] - 6, hip[1] - 6]].concat(hem, [[Hu[0], Hu[1] + 5]]), rot, { band: 2 });
    A.poly([[Hu[0] - 4, Hu[1] - 1], [Hu[0] - 7.5, Hu[1] + 2], [hip[0] - 5.5 - mt * 0.5, hip[1] - 1.5], [hip[0] - 3.5 - mt * 0.5, hip[1] - 3.5], [hip[0] - 2.5 - mt * 0.5, hip[1] - 0.5], [Hu[0] - 3, Hu[1] + 4]], rot, { tone: -1 });
    for (let i = 0; i < 3; i++) A.line(Hu[0] - 6 + i * 2, Hu[1] + 1, hip[0] - 5 + i * 2 - (walk ? sw : 0), hip[1] - 3 - i, RT(i === 1 ? 3 : 0));
    A.poly([[Hu[0] - 6 + f, Hu[1] - 1], [Hu[0] - 3 + f, Hu[1] - 5], [Hu[0] + 0.5 + f, Hu[1] - 5.4], [Hu[0] + 1 + f, Hu[1] - 1], [Hu[0] + f, Hu[1] + 3], [Hu[0] + mt + f, Hu[1] + 9], [Hu[0] - 1.5 + mt + f, Hu[1] + 6], [Hu[0] - 3 + mt + f, Hu[1] + 9.5], [Hu[0] - 4.5 + f, Hu[1] + 4]], rot, { band: 2, contourAll: true });
    A.line(Hu[0] - 1 + f, Hu[1] - 3, Hu[0] - 1 + mt + f, Hu[1] + 5, RT(0)); A.line(Hu[0] + f, Hu[1] - 3, Hu[0] + mt + f, Hu[1] + 4, RT(3));
    A.line(Hu[0] - 4 + f, Hu[1] - 2, Hu[0] - 3.5 + mt + f, Hu[1] + 6, RT(1));
    A.px(Hu[0] + f, Hu[1] - 4, RT(4)); A.px(Hu[0] - 2 + f, Hu[1] - 4, RT(4)); A.px(Hu[0] - 3 + f, Hu[1] - 3, RT(3)); A.px(Hu[0] - 5 + f, Hu[1] - 1, RT(3));
    A.px(Hu[0] - 2 + f, Hu[1] + 1, SK(2)); A.px(Hu[0] - 2 + f, Hu[1] + 2, SK(1)); A.px(Hu[0] - 3 + f, Hu[1] + 1, '#0a0706');   // a hole rotted through
    ZS32.speck(A, Hu[0] - 6, Hu[1] + 5, 3, 5, [RT(3), RT(4)], 4, 11 + (backSide ? 7 : 0));      // threads catching the candle
    ZS32.grime(A, hip[0] - 3, hip[1] - 5, 3, 3, [RT(0)], 3, 5);
  };
  if (back) {
    // ================= BACK VIEW: from behind, walking away up the screen. The near side (the far limbs of the front
    // painting) now faces us; the old near arm and leg are hidden behind the body. We see the hump, the spine, the
    // shoulder blades, the back of the skull; the open ribs and the face are turned away.
    arm([S[0] + 1, S[1] + 1], eN, wN, true, wind ? kw : atk ? 0.4 : 0, true);
    leg([hip[0] + 2, hip[1] + 1], kN, aN, true, true);
    const [hx, hy] = head;
    A.limb([S, N, [hx - 1, hy - 1]], 2.2, 1.6, sk, { tone: -1 });
    A.poly([[hx - 3.5, hy - 2.5], [hx - 1.5, hy - 4.8], [hx + 2, hy - 5], [hx + 4, hy - 3.5], [hx + 4.5, hy - 1], [hx + 4, hy + 1.5], [hx + 1, hy + 2.5], [hx - 3, hy + 2]], sk, { band: 2 });
    A.line(hx - 1, hy - 4, hx + 2, hy - 4, SK(4)); A.px(hx - 2, hy - 3, SK(4)); A.px(hx + 3, hy - 3, SK(3));
    A.px(hx + 1, hy - 2, SK(1)); A.px(hx + 2, hy - 1, SK(0)); A.px(hx, hy - 3, SK(3));
    A.px(hx + 5, hy - 1, EMB[3]); A.px(hx + 5, hy, EMB[2]); if (wind && kw > 0.6) A.px(hx + 5, hy - 2, EMB[4]);   // coal-light round the far cheek
    A.poly([[hx - 3.5, hy - 1.5], [hx - 1, hy - 2.5], [hx + 2.5, hy - 2], [hx + 3.5, hy + 0.5], [hx + 1, hy + 2], [hx - 3, hy + 1.5]], '#1e1a1c', { flat: true, contour: false });
    A.px(hx, hy - 1, '#4a4042'); A.px(hx + 2, hy, '#3a3234'); A.px(hx - 2, hy, '#3a3234');
    for (let i = 0; i < 3; i++) A.line(hx - 2 + i * 2, hy + 1, hx - 3 + i * 1.8 - (walk ? sw * 0.6 : 0) - kw * 2, hy + 3 + (i % 2) * 2 - kw * 2, i % 2 ? '#141012' : '#2a2426');
    mantle(true);
    A.limb([[hip[0], hip[1] - 1], [hip[0] + 1, Hu[1] + 5], [Hu[0], Hu[1] + 1], [S[0], S[1] + 1]], 3.3, 3.6, sk, { band: 2 });
    A.ell(Hu[0], Hu[1], 6, 5.4, sk, { band: 2 });
    A.ell(S[0] - 1, S[1] + 2, 4, 3.6, sk, { band: 2 });
    // the shoulder blades: two plates of bone winged out under the skin, each with a lit ridge and a dark fold beneath
    A.poly([[Hu[0] + 1, Hu[1] + 0.5], [Hu[0] + 5.5, Hu[1] - 1.5], [Hu[0] + 6, Hu[1] + 2.5], [Hu[0] + 2.5, Hu[1] + 4]], sk, { contourAll: true, tone: 0 });
    A.line(Hu[0] + 1.5, Hu[1] + 0.5, Hu[0] + 5, Hu[1] - 1, SK(4)); A.line(Hu[0] + 3, Hu[1] + 4.5, Hu[0] + 6, Hu[1] + 3, SK(0));
    A.poly([[Hu[0] - 1.5, Hu[1] - 1.5], [Hu[0] - 5.5, Hu[1] - 1], [Hu[0] - 5, Hu[1] + 2.5], [Hu[0] - 1.5, Hu[1] + 2]], sk, { contourAll: true, tone: -1 });
    A.line(Hu[0] - 5, Hu[1] - 1.5, Hu[0] - 2, Hu[1] - 2, SK(3));
    // the ribs showing through the skin of the flank
    for (let i = 0; i < 3; i++) { const x0 = Hu[0] - 1 + i * 2, y0 = Hu[1] + 5 + i * 0.4; A.line(x0, y0, x0 - 1, y0 + 2, SK(0)); A.px(x0 + 1, y0, SK(4)); A.px(x0 + 1, y0 + 1, SK(3)); }
    const kn = []; for (let i = 0; i < 6; i++) { const q = -2.6 + i * 0.42; kn.push([Hu[0] + 1 + Math.cos(q) * 4.4, Hu[1] + 0.5 + Math.sin(q) * 4]); }
    kn.push([S[0] - 0.5, S[1] + 0.5]); kn.unshift([hip[0] + 1, hip[1] - 5], [hip[0] + 0.5, hip[1] - 8]);
    spine(kn);
    ZS32.speck(A, Hu[0] + 2, Hu[1] + 1, 4, 3, [SK(4), SK(3)], 4, 3);
    ZS32.grime(A, Hu[0], Hu[1] + 4, 4, 3, [SK(0), SK(1)], 5, 8);
    leg(hip, kF, aF, false, true);
    arm([S[0] - 2, S[1] + 1], eF, wF, false, wind ? kw : 0, true);
    candle();
    if (atk && ph < 2) for (let i = 0; i < 3; i++) A.line(wN[0] + 4 + i, wN[1] - 3 + i * 3, wN[0] + 7 + i, wN[1] - 1 + i * 3, i === 1 ? '#e8e0d0' : '#6a645a');
    return;
  }
  // ================= FRONT (facing right)
  arm([S[0] - 2, S[1] + 1], eF, wF, true, wind ? kw : 0);
  leg(hip, kF, aF, true);
  mantle(false);
  // ---- the body: the back bent double over the hips, the hump above the shoulders
  A.limb([[hip[0], hip[1] - 1], [hip[0] + 1, Hu[1] + 5], [Hu[0], Hu[1] + 1], [S[0], S[1] + 1]], 3.1, 3.6, sk, { band: 2 });
  A.ell(Hu[0], Hu[1], 6, 5.2, sk, { band: 2 });
  A.ell(hip[0] + 1, hip[1] - 1, 3.2, 2.6, sk, { band: 2 });                                                   // the pelvis
  A.px(hip[0] + 2, hip[1] - 3, BN(3)); A.px(hip[0] + 3, hip[1] - 2, BN(2));                                  // the hip bone pushing through
  // ---- the chest, split open: a black cavity under the shoulders with the god's blood smouldering inside it,
  // barred by broken ribs (this is what makes a Husk a Husk: the ember in the cage)
  const cx = Math.round(S[0] - 2), cy = Math.round(S[1] + 3);
  A.poly([[cx - 4, cy - 2], [cx + 2.5, cy - 2.5], [cx + 3, cy + 3], [cx + 1, cy + 7], [cx - 3, cy + 7.5], [cx - 5, cy + 3]], '#120306', { flat: true, contourAll: true });
  const gl = wind ? 4 : atk ? 5 : 3 + (ph % 2);
  A.px(cx - 1, cy + 2, EMB[gl]); A.px(cx, cy + 3, EMB[Math.min(5, gl + 1)]); A.px(cx - 1, cy + 3, EMB[gl]); A.px(cx, cy + 2, EMB[gl - 1]); A.px(cx - 2, cy + 4, EMB[2]); A.px(cx + 1, cy + 4, EMB[2]); A.px(cx - 1, cy + 5, EMB[3]); A.px(cx, cy + 1, EMB[1]); A.px(cx - 2, cy + 1, EMB[1]);
  for (let i = 0; i < 4; i++) {           // the ribs: curved bars of bone sprung from the spine, each with a lit top edge
    const y0 = cy - 2 + i * 2.2, p0 = [cx - 4.5 + i * 0.3, y0], p1 = [cx - 0.5, y0 + 0.4 + i * 0.3], p2 = [cx + 2.5 - i * 0.6 + (i === 2 ? -1.5 : 0), y0 + 1.6];
    A.limb([p0, p1, p2], 0.75, 0.55, bn, { contourAll: true });
  }
  for (let i = 0; i < 4; i += 2) { const y0 = cy - 2 + i * 2.2; A.px(cx - 2 + i * 0.3, y0 - 0.4, BN(4)); }
  A.px(cx + 2, cy + 7, EMB[2]); A.px(cx + 2, cy + 8 + (ph % 2), EMB[1]);                                     // a drip from the cavity
  // ---- the spine's knuckles along the top of the hump and down the neck, and the shoulder blade
  A.poly([[Hu[0] + 0.5, Hu[1] - 1], [Hu[0] + 5, Hu[1] - 2], [Hu[0] + 5.5, Hu[1] + 2], [Hu[0] + 1.5, Hu[1] + 3]], sk, { contourAll: true });
  A.line(Hu[0] + 1, Hu[1] - 1, Hu[0] + 4.5, Hu[1] - 2, SK(4)); A.line(Hu[0] + 2, Hu[1] + 3.5, Hu[0] + 5, Hu[1] + 2.5, SK(0));
  const kn = []; for (let i = 0; i < 5; i++) { const q = -2.3 + i * 0.4; kn.push([Hu[0] + Math.cos(q) * 5.8, Hu[1] + Math.sin(q) * 5.2]); }
  kn.push(zsaL([Hu[0] + 5, Hu[1] - 1], N, 0.4)); kn.unshift([Hu[0] - 6.2, Hu[1] + 1.8]);
  spine(kn);
  ZS32.speck(A, Hu[0] + 2, Hu[1] + 1, 3, 2, [SK(3)], 3, 2 + (walk ? 0 : 1));
  ZS32.grime(A, hip[0] + 3, Hu[1] + 8, 3, 3, [SK(0), SK(1)], 4, 6);
  // ---- near leg
  leg([hip[0] + 2, hip[1] + 1], kN, aN, false);
  candle();
  // ---- near arm, knuckles at the knee
  A.ell(S[0], S[1] + 1, 2.3, 2.1, sk, { contourAll: true }); A.px(S[0] - 1, S[1], SK(4)); A.px(S[0], S[1] - 0.5, SK(3));
  arm([S[0], S[1] + 1], eN, wN, false, wind ? kw : atk ? 0.4 : 0);
  // ---- the neck and hanging head: the skin has shrunk off the face and the skull shows through, pale against the
  // grey; a coal in the socket, the jaw hanging off its hinge
  const [hx, hy] = head, jaw = wind ? 1 + Math.round(kw * 2) : atk ? 2 : 1;
  A.limb([S, N, [hx - 2, hy - 1]], 2.2, 1.5, sk, {});
  A.px(N[0] - 0.5, N[1] - 2, BN(3)); A.px(N[0] + 1.5, N[1], BN(2));                                          // neck vertebrae
  A.poly([[hx - 3.5, hy - 2.5], [hx - 1.5, hy - 5], [hx + 2, hy - 5], [hx + 4.5, hy - 3.2], [hx + 5, hy - 1], [hx + 6, hy + 0.5], [hx + 4.5, hy + 1.5], [hx + 1, hy + 2.5], [hx - 3, hy + 2]], bn, { tone: -1, band: 2 });
  A.poly([[hx + 1, hy - 3.5], [hx + 4.2, hy - 3.2], [hx + 5.2, hy - 1], [hx + 6.2, hy + 0.5], [hx + 4.5, hy + 1.6], [hx + 1.5, hy + 1.2]], bn, { tone: 1, contour: false });   // the bared face-bone
  A.poly([[hx - 1, hy + 1], [hx + 4.2, hy + 1.5], [hx + 3.7, hy + 2.5 + jaw], [hx, hy + 2.5 + jaw]], bn, { tone: -1 });                            // the jaw hanging open
  A.line(hx + 1, hy + 2, hx + 3, hy + 2, '#120404');
  for (let i = 0; i < 3; i++) A.px(hx + 2 + i, hy + 1 + (i % 2), BN(4));
  if (jaw > 1) { A.line(hx + 1, hy + 2, hx + 3, hy + 1 + jaw, '#1a0406'); A.px(hx + 2, hy + 2, EMB[2]); A.px(hx + 3, hy + 1 + jaw, BN(4)); A.px(hx + 1, hy + 1 + jaw, BN(3)); }
  A.line(hx - 1, hy - 4, hx + 1, hy - 4, SK(4)); A.px(hx - 2, hy - 3, SK(3)); A.px(hx + 2, hy - 4, BN(4));   // the bald crown in the light
  A.line(hx + 2, hy - 3, hx + 4, hy - 3, BN(4));                                                                // the brow ridge
  A.px(hx + 2, hy - 2, '#0a0406'); A.px(hx + 3, hy - 2, EMB[4]); A.px(hx + 2, hy - 1, '#0a0406'); A.px(hx + 3, hy - 1, EMB[2]); A.px(hx + 4, hy - 2, '#0a0406');   // the socket with its coal
  if (wind || atk) A.px(hx + 3, hy - 2, EMB[5]);
  A.px(hx + 5, hy, '#0a0406'); A.px(hx + 5, hy - 1, BN(3)); A.px(hx + 4, hy, BN(2));                          // the nose-hole
  A.line(hx + 1, hy - 3, hx + 1, hy + 1, BN(1)); A.px(hx - 1, hy - 1, SK(2)); A.px(hx - 2, hy, SK(1)); A.px(hx, hy + 1, SK(1));   // where the skin ends
  A.px(hx, hy - 1, SK(1)); A.px(hx - 1, hy, SK(1));
  for (let i = 0; i < 3; i++) A.line(hx - 2 + i, hy - 3, hx - 3 + i * 0.6 - (walk ? sw * 0.6 : 0) - kw * 2, hy + 3 + (i % 2) * 2 - kw * 3, i % 2 ? '#141012' : '#2a2426');   // lank hair
  if (atk && ph < 2) for (let i = 0; i < 3; i++) A.line(wN[0] + 4 + i, wN[1] - 3 + i * 3, wN[0] + 7 + i, wN[1] - 1 + i * 3, i === 1 ? '#e8e0d0' : '#6a645a');   // the rake of the claws
};

// ------------------------------------------------------------------- THE GRAVEBLOAT
// v0.35: a corpse that is nothing but its stomach now: a distended sack of stretched grey-violet skin, shining where
// it is tightest, sewn shut with an autopsy seam and a square of sewn-on hide, bloat-veins spreading under the skin.
// The body's small head still hangs off the front of it on a slack neck, lolling, eyes rolled up, and it is that
// mouth the bile comes out of. Two bent human legs under the weight, the feet dragging. Walk: it waddles, the head
// swinging. Wind: it swells and the veins flush, bile bubbling at the lips. Attack: it vomits a jet of bile.
pmat('zsaGutP', ['#1a1420', '#4a4258', '#7a7088', '#b0a4b8', '#e8e0ec']);      // the stretched plateau, thinnest skin
pmat('zsaHead', ['#0e0a10', '#2c2430', '#4e4650', '#7a6e6a', '#a89a88']);      // the small head's grey skin
pmat('zsaHide', ['#100c0a', '#2a221a', '#463828', '#665238', '#8a7250']);      // the patch of sewn-on hide
M32F.bloat = [48, 38, 20, 35]; M32WALK.bloat = 6; M32BACK.bloat = true;
M32.bloat = function (A, pose, ph, pal, view) {
  const t = pal.tint, leg = tint32('zsaSkin', t), gut = tint32('zsaGut', t), gutP = tint32('zsaGutP', t), lip = tint32('zsaLip', t, 0.35), hd = tint32('zsaHead', t);
  const G = i => zsaHex(gut, i), GP = i => zsaHex(gutP, i), LP = i => zsaHex(lip, i), HD = i => zsaHex(hd, i), LG = i => zsaHex(leg, i), BL = ZSA_BILE, BN = i => zsaHex('zsaBone', i);
  const idle = pose === 'idle', walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk', bk = view === 'back';
  const a = walk ? ph / 8 * 6.2832 : 0;
  let by = 0, bx = 0, sx = 0, sy = 0, mo = 0.5, roll = 0, loll = 0;
  if (idle) { sy = ph === 1 || ph === 2 ? 0.6 : 0; sx = sy * 0.5; loll = ph === 2 ? 1 : ph === 1 ? 0.5 : 0; }
  if (walk) { by = -Math.round(Math.abs(Math.sin(a))); bx = Math.sin(a) * 0.8; roll = Math.sin(a); loll = Math.sin(a - 0.8) * 1.5; }
  const kw = wind ? [0.4, 0.75, 1][ph] : 0;
  if (wind) { sx = 1.8 * kw; sy = 1.8 * kw; mo = 0.5 + kw * 1.2; loll = -2 * kw; }
  if (atk) { sx = [2.5, 1.2, 0.3][ph]; sy = [-1.8, -0.6, 0][ph]; mo = [2.2, 2.4, 1][ph]; bx = [1, 2, 0][ph]; loll = [2.5, 3, 1.5][ph]; }
  const C = [19 + bx, 20 + by - sy * 0.5], rx = 11.5 + sx, ry = 9.5 + sy, bot = C[1] + ry;
  const hot = wind || atk, vc = hot ? '#6a1428' : '#221430', vh = hot ? '#c43a4a' : '#6e4e86';
  const vein = (x0, y0, seg) => { let x = C[0] + x0, y = C[1] + y0; A.px(x, y - 1, vh); for (const [dx, dy] of seg) { A.line(x, y, x + dx, y + dy, vc); x += dx; y += dy; } A.px(x + 1, y + 1, vc); A.px(x + 1, y, vh); };
  // ---- the legs: bent human legs, knees forward, the feet flat and dragging (toes trailing when it steps)
  const legs = (far, dim = far) => {
    for (const [lx, pp, kd] of [[-7, 0, -2], [6, Math.PI, 2]]) {
      const q = a + pp + (far ? Math.PI : 0), s = walk ? Math.sin(q) : 0, lift = walk ? Math.max(0, Math.cos(q)) * 1.2 : 0, drag = walk ? Math.max(0, -Math.cos(q)) : 0;
      const top = [C[0] + lx + (far ? -2 : 0), bot - 5], ft = [top[0] + s * 2.2 + kd * 0.5 + (atk ? -1 : 0), 34 - lift], kn = [top[0] + kd + s, 30 - lift * 0.5], o = dim ? { tone: -1, contour: false } : { contourAll: true };
      A.limb([top, kn], 2.3, 1.8, leg, o); A.limb([kn, ft], 1.7, 1.3, leg, dim ? o : {});
      A.poly([[ft[0] - 3 - drag * 2, ft[1] - 0.6], [ft[0] - 1, ft[1] - 1.4], [ft[0] + 2, ft[1] - 1.2], [ft[0] + 3.5, ft[1] + 0.8], [ft[0] + 3.5, ft[1] + 1.5], [ft[0] - 3 - drag * 2, ft[1] + 1.5]], leg, dim ? o : { contourAll: true });
      if (!dim && far !== dim) { A.px(ft[0] - 2, ft[1], LG(4)); A.px(ft[0] - 1, ft[1] + 1, LG(1)); A.px(kn[0], kn[1] + 1, LG(0)); A.line(kn[0] - 1, kn[1] + 2, ft[0] - 1, ft[1] - 2, LG(3)); }   // from behind: the heel, the hollow of the knee, the heel-cord
      else if (!dim) { A.px(ft[0] + 3, ft[1] + 1, '#140c08'); A.px(ft[0] + 1, ft[1] + 1, '#140c08'); A.px(ft[0] + 2, ft[1], LG(3)); A.px(kn[0] + 1, kn[1] - 1, LG(4)); A.px(kn[0] + 1, kn[1], LG(1)); A.px(kn[0] - 1, kn[1] + 1, LG(0)); A.line(top[0] - 1, top[1] + 1, kn[0] - 1, kn[1] - 1, LG(3)); }
      if (walk && drag > 0.3) { A.px(ft[0] - 4 - drag * 2, 35, '#2a2622'); A.px(ft[0] - 6 - drag * 2, 35, '#2a2622'); }   // the scrape of the dragging toes
    }
  };
  // ---- the sack: a sagging bag, its crown taut and shining, the underside pooled forward
  const sack = () => {
    const pts = []; for (let i = 0; i < 32; i++) { const q = i / 32 * 6.2832, c = Math.cos(q), s = Math.sin(q); pts.push([C[0] + c * rx + (s > 0 ? (bk ? -s * c * 1.2 + s * 0.5 : s * c * 1.5 + s * 1.5) : 0), C[1] + s * ry * (s > 0 ? 1.03 : 1)]); }
    A.poly(pts, gut, { band: 2, contourAll: true });
    const px0 = bk ? -0.1 : -0.42;
    A.ell(C[0] + rx * px0, C[1] - ry * 0.32, rx * 0.5, ry * 0.36, gutP, { flat: true, contour: false });                  // the taut plateau of the dome
    A.ell(C[0] + rx * px0 - 1, C[1] - ry * 0.45, rx * 0.22, ry * 0.15, gutP, { flat: true, contour: false, tone: 1 });
    A.px(C[0] + rx * px0 - 2, C[1] - ry + 2, '#ffffff'); A.px(C[0] + rx * px0 - 1, C[1] - ry + 2, '#f4eef4'); A.px(C[0] + rx * px0 - 3, C[1] - ry + 3, GP(4));   // the wet glint
    ZS32.speck(A, C[0] + rx * px0, C[1] - 3, rx * 0.5, ry * 0.45, [GP(3), G(4)], 4, 17 + ph);
    ZS32.grime(A, C[0] + 3, C[1] + 5, rx * 0.5, ry * 0.3, [G(0), G(1)], 6, 3);
    // stretch marks fanning over the swell, the fold where the belly sags to the ground
    for (let i = 0; i < 4; i++) { const x = C[0] + rx * px0 - 4 + i * 2.4, y = C[1] - 1 + i * 0.4; A.line(x, y, x + 1, y + 2.5, GP(1)); A.px(x - 1, y, GP(3)); }
    for (let x = -7; x <= 6; x++) { const y = C[1] + ry - 4 + Math.round(Math.abs(x + 0.5) * 0.25) - (!bk && x > 3 ? 1 : 0); A.px(C[0] + x, y, G(0)); if (x % 2 === 0) A.px(C[0] + x, y - 1, G(3)); }
    // bloat veins: branching under the skin, flushing red as it swells
    if (bk) { vein(3, -6, [[2, 2], [1, 3], [2, 1]]); vein(-9, 2, [[3, 1], [2, 3]]); vein(2, 3, [[2, 1], [2, -2]]); vein(-6, 4, [[2, 2], [3, 0]]); vein(-4, -6, [[-2, 3], [1, 3]]); }
    else { vein(-9, -1, [[3, -2], [2, -3], [2, -1]]); vein(-6, -2, [[1, 3], [3, 2]]); vein(-3, 5, [[3, 1], [2, -2]]); vein(-10, 4, [[3, 1], [1, 3]]); vein(0, -ry + 4, [[-2, 3], [0, 3]]); vein(6, -2, [[2, 3], [-1, 3]]); }
    if (hot) { vein(bk ? 6 : -7, bk ? -2 : -6, [[2, 2], [3, 0]]); A.px(C[0] - 5, C[1] + 1, '#ff6a50'); A.px(C[0] + (bk ? 6 : -7), C[1] - 3, '#ff6a50'); }
  };
  // a suture: the cut in black, the skin puckered along it, cross-stitches of coarse thread
  const suture = (p, q, step) => {
    const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, n = Math.max(1, Math.round(l / step));
    A.line(p[0] + nx, p[1] + ny, q[0] + nx, q[1] + ny, G(3)); A.line(p[0] - nx, p[1] - ny, q[0] - nx, q[1] - ny, G(0));
    A.line(p[0], p[1], q[0], q[1], '#0a060c');
    for (let i = 0; i < n; i++) { const m = zsaL(p, q, (i + 0.5) / n); A.px(m[0] + nx * 1.2 - dx / l * 0.5, m[1] + ny * 1.2 - dy / l * 0.5, i & 1 ? '#a89870' : '#e8dcb4'); A.px(m[0] - nx * 1.2 + dx / l * 0.5, m[1] - ny * 1.2 + dy / l * 0.5, '#6a5a3a'); A.px(m[0], m[1], i & 1 ? '#0a060c' : '#8a7a58'); }
    if (wind && kw > 0.5) for (let i = 1; i < n; i++) { const m = zsaL(p, q, i / n); A.px(m[0], m[1], kw > 0.9 ? ZSA_BL[4] : ZSA_BL[3]); }   // the seam straining, light in the cut
  };
  // the small head, lolling on a slack neck off the front of the sack: bald, sunken, the jaw slack; the eyes rolled up
  const head = () => {
    const nb = [C[0] + rx - 3, C[1] - ry + 5], nk = [nb[0] + 4 + loll * 0.4, nb[1] + 1 + loll * 0.6], hx = Math.round(nk[0] + 2 + loll * 0.3), hy = Math.round(nk[1] + 3 + loll * 0.5);
    A.limb([nb, nk], 2, 1.6, hd, { band: 1 }); A.px(nb[0] + 1, nb[1] - 1, HD(4)); A.line(nb[0] + 1, nb[1] + 1, nk[0], nk[1] + 1, HD(0));   // the neck, its cords
    A.poly([[hx - 3, hy - 2.5], [hx - 1.5, hy - 4.5], [hx + 1.5, hy - 4.5], [hx + 3.5, hy - 2.5], [hx + 3.8, hy], [hx + 2.5, hy + 2], [hx, hy + 3], [hx - 2.5, hy + 2.2], [hx - 3.5, hy]], hd, { band: 1, contourAll: true });
    A.px(hx - 1, hy - 4, HD(4)); A.px(hx, hy - 4, HD(4)); A.px(hx - 2, hy - 3, HD(3)); A.px(hx + 2, hy - 3, HD(3));                     // the bald crown
    A.px(hx + 3, hy - 2, HD(1)); A.px(hx + 3, hy - 1, HD(0));                                                                         // the brow
    A.px(hx + 1, hy - 1, '#e8e4e0'); A.px(hx + 2, hy - 1, '#e8e4e0'); A.px(hx + 1, hy, '#0a0608'); A.px(hx + 2, hy, '#4a4448');          // eyes rolled white
    A.px(hx - 1, hy - 1, '#0a0608'); A.px(hx - 2, hy - 1, HD(1));
    A.px(hx + 3, hy + 0.5, HD(1)); A.px(hx + 4, hy + 0.5, '#0a0608');                                                                 // the nose
    const jaw = [[hx - 1, hy + 2], [hx + 3.5, hy + 1.5], [hx + 3 + mo * 0.3, hy + 3.5 + mo], [hx - 0.5, hy + 4 + mo]];
    A.poly(jaw, hd, { tone: -1, contourAll: true });
    A.poly([[hx, hy + 1.8], [hx + 3.2, hy + 1.6], [hx + 2.6, hy + 2.5 + mo * 0.8], [hx + 0.2, hy + 2.8 + mo * 0.8]], '#0a0204', { flat: true, contour: false });   // the open mouth
    for (let i = 0; i < 3; i++) A.px(hx + 0.5 + i, hy + 2, i === 1 ? '#c8bc9c' : '#e2d8bc');                                          // the upper teeth
    if (mo > 1) { A.px(hx + 1, hy + 2 + mo * 0.8, '#e2d8bc'); A.px(hx + 2, hy + 3 + mo * 0.7, BL[2]); }
    A.px(hx + 0.5, hy + 4 + mo, HD(0)); A.px(hx + 2.5, hy + 3.5 + mo, HD(3));
    return [hx + 3, hy + 2 + mo * 0.5];   // where the bile comes out
  };
  if (bk) {
    // ================= BACK VIEW: the rump of the sack toward us, the head lolling beyond it; the drain-hole sewn
    // shut on the back, the tumours near the crown; the old near legs step behind, the far pair in front
    legs(false, true);
    // the spray and the bubbles come out past the far edge
    const M = [Math.round(C[0] + rx + 2), Math.round(C[1] - ry + 9)];
    if (wind) for (let i = 0; i <= ph; i++) { const r = 0.7 + i * 0.35, x = M[0] + 2 + i * 1.2, y = M[1] - 3 - i * 1.8; A.ell(x, y, r, r, 'zsaBileM', {}); A.px(x - 0.3, y - r * 0.6, BL[4]); }
    if (atk && ph < 2) {
      const o = [M[0], M[1]], P = ph === 0 ? [o, [o[0] + 5, o[1] - 3], [o[0] + 8, o[1] - 2]] : [o, [o[0] + 6, o[1] - 4], [o[0] + 11, o[1] - 3], [o[0] + 15, o[1] + 1], [o[0] + 17, 31]];
      A.limb(P, ph ? 2 : 1.8, ph ? 1.1 : 1.3, 'zsaBileM', {});
      for (let i = 0; i < P.length - 1; i++) A.line(P[i][0], P[i][1] - 1, P[i + 1][0], P[i + 1][1] - 1, BL[4]);
      for (let i = 0; i < 9; i++) { const k = zsaH(i + ph * 11), p = zsaL(P[1], P[P.length - 1], k), off = (zsaH(i + 40) - 0.5) * 6; A.px(p[0] + 1, p[1] + off, i % 2 ? BL[4] : BL[2]); }
      if (ph) { A.line(o[0] + 14, 31, o[0] + 20, 31, BL[2]); A.px(o[0] + 18, 30, BL[3]); A.px(o[0] + 21, 30, BL[4]); }
    }
    // the head beyond: the back of the skull and an ear past the sack's edge
    { const hx = Math.round(C[0] + rx + 1 + loll * 0.3), hy = Math.round(C[1] - ry + 9 + loll * 0.6); A.ell(hx, hy, 3.4, 3.6, hd, { tone: -1 }); A.px(hx - 1, hy - 3, HD(3)); A.px(hx - 2, hy - 2, HD(2)); A.px(hx - 3, hy + 1, HD(0)); }
    sack();
    // the tumours clustered over the back, the biggest one near the crown
    for (const [dx, dy, r1, r2] of [[-6, -ry + 6, 4.2, 3.4], [-9, 2, 2.6, 2.4], [5, -ry + 7, 2.2, 2]]) { A.ell(C[0] + dx, C[1] + dy, r1, r2, gut, { band: 2, contourAll: true }); A.px(C[0] + dx - r1 * 0.4, C[1] + dy - r2 * 0.5, G(4)); A.px(C[0] + dx - r1 * 0.4 + 1, C[1] + dy - r2 * 0.5, GP(3)); A.px(C[0] + dx + r1 * 0.5, C[1] + dy + r2 * 0.6, G(0)); }
    // the drain-hole in the rump, sewn shut crooked; the square of hide sewn over a split
    suture([C[0] + 3, C[1] + 1], [C[0] + 6, C[1] + 5], 2);
    A.poly([[C[0] - 4, C[1] + 4], [C[0] + 1, C[1] + 3.5], [C[0] + 1.5, C[1] + 8], [C[0] - 3.5, C[1] + 8.5]], 'zsaHide', { contourAll: true });
    for (let i = 0; i < 3; i++) { A.px(C[0] - 4 + i * 2, C[1] + 3.6, i & 1 ? '#a89870' : '#e8dcb4'); A.px(C[0] - 3 + i * 2, C[1] + 8.4, '#a89870'); } A.px(C[0] - 3, C[1] + 5, zsaHex('zsaHide', 4));
    // pustules weeping bile
    for (const [dx, dy] of [[-6, 6], [7, -4]]) { const x = C[0] + dx, y = C[1] + dy; A.px(x, y, BL[2]); A.px(x - 1, y - 1, BL[3]); A.px(x + 1, y, G(0)); A.px(x, y + 1, G(0)); A.px(x - 1, y, BL[1]); }
    // the gut loop hanging from the underside
    { const sw2 = walk ? Math.sin(a - 1) * 1.5 : 0, g0 = [C[0] - 3, bot - 1], g1 = [C[0] - 2 + sw2, bot + 3.5], g2 = [C[0] + 1 + sw2 * 0.6, bot + 1];
      A.limb([g0, g1, g2], 1.2, 1, lip, { contourAll: true }); A.px(g1[0] - 0.5, g1[1] - 0.5, LP(4)); A.px(g1[0], g1[1] + 2, BL[2]); }
    legs(true, false);
    return;
  }
  // ================= FRONT
  legs(true);
  // tumour-lumps bulging out of the back of the sack, then the sack itself
  A.ell(C[0] - 7, C[1] - ry + 5, 4, 3.5, gut, { band: 2 }); A.px(C[0] - 9, C[1] - ry + 3, G(4)); A.px(C[0] - 8, C[1] - ry + 2.5, GP(3));
  A.ell(C[0] - 11, C[1] - 1, 2.4, 2.2, gut, { band: 1 }); A.px(C[0] - 12, C[1] - 2.5, G(4));
  sack();
  // the autopsy seam: a Y cut, the arms from the crown meeting at the breastbone, stitched shut with coarse thread;
  // a square of hide sewn over the flank where it split
  const Y0 = [C[0] + 3, C[1] - 3];
  suture([C[0] - 1, C[1] - ry + 3], Y0, 2); suture([C[0] + 7, C[1] - ry + 3], Y0, 2); suture(Y0, [C[0] + 4, C[1] + 3], 2); suture([C[0] + 4, C[1] + 3], [C[0] + 2, bot - 3], 2);
  A.poly([[C[0] - 8, C[1] + 2], [C[0] - 3, C[1] + 1.5], [C[0] - 2.5, C[1] + 6.5], [C[0] - 7.5, C[1] + 7]], 'zsaHide', { contourAll: true });
  for (let i = 0; i < 3; i++) { A.px(C[0] - 7.5 + i * 2, C[1] + 1.6, i & 1 ? '#a89870' : '#e8dcb4'); A.px(C[0] - 7 + i * 2, C[1] + 6.9, '#a89870'); A.px(C[0] - 8.3, C[1] + 3 + i * 1.5, i & 1 ? '#e8dcb4' : '#a89870'); } A.px(C[0] - 7, C[1] + 3, zsaHex('zsaHide', 4)); A.px(C[0] - 4, C[1] + 5.5, zsaHex('zsaHide', 0));
  // pustules weeping bile
  for (const [dx, dy] of [[-9, -3], [0, 6]]) { const x = C[0] + dx, y = C[1] + dy; A.px(x, y, BL[2]); A.px(x - 1, y - 1, BL[3]); A.px(x + 1, y, G(0)); A.px(x, y + 1, G(0)); A.px(x - 1, y, BL[1]); }
  // a loop of gut hanging out of the underside, swinging
  { const sw2 = walk ? Math.sin(a - 1) * 1.5 : 0, g0 = [C[0] - 2, bot - 1], g1 = [C[0] - 1 + sw2, bot + 3.5], g2 = [C[0] + 2 + sw2 * 0.6, bot + 1];
    A.limb([g0, g1, g2], 1.2, 1, lip, { contourAll: true }); A.px(g1[0] - 0.5, g1[1] - 0.5, LP(4)); A.px(g1[0], g1[1] + 2, BL[2]); }
  // ---- the head, lolling off the front
  const M = head();
  // bile leaking from the slack mouth
  if (!atk) { const d = ph % 4; A.line(M[0], M[1] + 1, M[0], M[1] + 2 + d * 0.6, BL[2]); A.px(M[0], M[1] + 3 + d, BL[3]); if (d > 1) A.px(M[0] + 1, M[1] + 5 + d, BL[1]); }
  // the gurgle: bile bubbles pushed up through the throat as it swells
  if (wind) for (let i = 0; i <= ph; i++) { const r = 0.7 + i * 0.35, x = M[0] + 2 + i * 1.2, y = M[1] - 2 - i * 1.8; A.ell(x, y, r, r, 'zsaBileM', {}); A.px(x - 0.3, y - r * 0.6, BL[4]); }
  // ---- the jet: bile vomited forward, falling, spattering
  if (atk && ph < 2) {
    const o = [M[0] + 1, M[1]], P = ph === 0 ? [o, [o[0] + 4, o[1] - 1], [o[0] + 7, o[1] + 1]] : [o, [o[0] + 5, o[1] - 1.5], [o[0] + 10, o[1] + 0.5], [o[0] + 14, o[1] + 5], [o[0] + 16, 33]];
    A.limb(P, ph ? 2 : 1.8, ph ? 1.1 : 1.3, 'zsaBileM', {});
    for (let i = 0; i < P.length - 1; i++) A.line(P[i][0], P[i][1] - 1, P[i + 1][0], P[i + 1][1] - 1, BL[4]);
    for (let i = 0; i < 9; i++) { const k = zsaH(i + ph * 11), p = zsaL(P[0], P[P.length - 1], k), off = (zsaH(i + 40) - 0.5) * 6; A.px(p[0] + 1, p[1] + off, i % 2 ? BL[4] : BL[2]); }
    if (ph) { A.line(o[0] + 13, 35, o[0] + 20, 35, BL[2]); A.px(o[0] + 18, 34, BL[3]); A.px(o[0] + 20, 33, BL[2]); A.px(o[0] + 13, 33, BL[3]); A.px(o[0] + 21, 34, BL[4]); }
  }
  if (atk && ph === 2) { A.line(M[0], M[1] + 1, M[0] + 1, 34, BL[2]); A.line(M[0] + 1, 35, M[0] + 12, 35, BL[1]); A.px(M[0] + 7, 34, BL[3]); A.px(M[0] + 10, 35, BL[3]); }
  legs(false);
};
pmat('zsaBileM', ZSA_BILE);

// ------------------------------------------------------------------- THE VEIN-WORM
M32F.worm = [46, 48, 16, 44]; M32WALK.worm = 5; M32BACK.worm = true;
M32.worm = function (A, pose, ph, pal, view) {
  const t = pal.tint, art = tint32('zsaArt', t, 0.65), artD = tint32('zsaArtDk', t, 0.65), lip = tint32('zsaLip', t, 0.5), R = i => zsaHex(art, i), LP = i => zsaHex(lip, i), BN = i => zsaHex('zsaBone', i);
  const idle = pose === 'idle', walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk';
  const B = [16, 43];
  let H, C1, C2, amp = 0.5, wph = 0, open = 0.45, pu = -1, kw = 0;
  if (walk) { const g = ph / 8 * 6.2832; H = [26 + Math.sin(g) * 3, 12 + Math.cos(g) * 1.2]; C1 = [10 + Math.sin(g + 1) * 2.5, 31]; C2 = [15 - Math.sin(g) * 2.5, 3]; amp = 1.3; wph = g; pu = ph / 8; }
  else if (wind) { kw = [0.35, 0.7, 1][ph]; H = [25 - 8 * kw, 12 - 4.5 * kw]; C1 = [11 - kw, 31]; C2 = [14 - 6 * kw, 3 - 2 * kw]; open = 0.5 + 0.9 * kw; pu = [0.1, 0.45, 0.8][ph]; }
  else if (atk) { H = [[32, 14], [35, 36], [28, 23]][ph]; C1 = [[15, 29], [14, 28], [15, 30]][ph]; C2 = [[20, 1], [30, 4], [22, 5]][ph]; open = [1.4, 1.5, 0.7][ph]; amp = 0.2; }
  else { const b = Math.sin(ph / 4 * 6.2832); H = [26 + b * 0.7, 12 + b * 0.6]; C1 = [10, 31]; C2 = [15 + b * 0.6, 3]; open = 0.4 + 0.12 * (1 + b); wph = ph / 4 * 6.2832; pu = ph / 4; }
  const bz = u => { const v = 1 - u; return [v * v * v * B[0] + 3 * v * v * u * C1[0] + 3 * v * u * u * C2[0] + u * u * u * H[0], v * v * v * B[1] + 3 * v * v * u * C1[1] + 3 * v * u * u * C2[1] + u * u * u * H[1]]; };
  const tg0 = u => { const p = bz(Math.min(1, u + 0.01)), q = bz(Math.max(0, u - 0.01)), l = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1; return [(p[0] - q[0]) / l, (p[1] - q[1]) / l]; };
  const sp = u => { const p = bz(u), d = tg0(u), w = amp * Math.sin(u * 7 - wph) * Math.sin(u * Math.PI); return [p[0] + d[1] * w, p[1] - d[0] * w]; };
  const tg = u => { const p = sp(Math.min(1, u + 0.015)), q = sp(Math.max(0, u - 0.015)), l = Math.hypot(p[0] - q[0], p[1] - q[1]) || 1; return [(p[0] - q[0]) / l, (p[1] - q[1]) / l]; };
  const rad = u => 4.8 - 1.5 * u;
  // lit side of the tube: the normal that points up or left
  const lit = d => { let n = [d[1], -d[0]]; if (n[1] > 0.2 || (Math.abs(n[1]) <= 0.2 && n[0] > 0)) n = [-n[0], -n[1]]; return n; };
  // ---- the torn ring of earth, black inside, the god's blood pooled in it
  A.poly([[B[0] - 11, B[1] + 0.5], [B[0] - 9, B[1] - 2.5], [B[0] - 6, B[1] - 3.5], [B[0] - 2, B[1] - 4], [B[0] + 3, B[1] - 4], [B[0] + 7, B[1] - 3.5], [B[0] + 10, B[1] - 2], [B[0] + 11.5, B[1] + 0.5]], 'zsaSoil', { band: 2 });
  A.ell(B[0], B[1] - 1, 7, 2.2, '#060203', { flat: true, contour: false });
  A.ell(B[0] + 1, B[1] - 0.6, 5, 1.2, ZSA_BL[1], { flat: true, contour: false }); A.px(B[0] - 2, B[1] - 1, ZSA_BL[3]); A.px(B[0] + 4, B[1] - 1, ZSA_BL[2]);
  const bub = front => { if (!wind) return; for (let i = 0; i < 12; i++) { const q = i / 12 * 6.2832 + 0.2, s = Math.sin(q); if ((s > 0) !== front) continue; const r = (0.6 + zsaH(i + 9) * 0.7) * (0.6 + kw * 0.9), x = B[0] + Math.cos(q) * (10.5 - kw), y = B[1] + s * 3.4 - r; A.ell(x, y, r, r, 'zsaBlood', {}); A.px(x - r * 0.5, y - r * 0.6, '#ffd0c0'); if (kw > 0.6 && i % 3 === 0) { A.px(x, y - r - 2, ZSA_BL[3]); A.px(x + 1, y - r - 4, ZSA_BL[2]); } } };
  // the blood ripples out from where it moves through the earth: rings in the pool, more as it rears to strike
  { const nr = wind ? 1 + ph : walk ? 1 + (ph >> 2) : idle && ph === 2 ? 1 : 0, k0 = walk ? (ph % 4) * 0.6 : wind ? kw * 2 : 0.5;
    for (let i = 0; i < nr; i++) { const rx = 3 + k0 + i * 2.6, ry = rx * 0.32; for (let j = 0; j < 20; j++) { const q = j / 20 * 6.2832; if (Math.sin(q) < -0.15 || (j + i) % 3 === 0) continue; A.px(B[0] + 1 + Math.cos(q) * rx, B[1] - 0.6 + Math.sin(q) * ry, Math.sin(q) > 0.6 ? ZSA_BL[3] : ZSA_BL[2]); } } }
  bub(false);
  // back flaps of the torn vessel wall where it was ripped from the god
  for (let i = 0; i < 4; i++) { const q = 3.5 + i * 0.75, x = B[0] + Math.cos(q) * 5.5, y = B[1] - 1 + Math.sin(q) * 1.6; A.poly([[x - 1.4, y + 0.5], [x + Math.cos(q) * 2, y - 3 - zsaH(i) * 2.5], [x + 1.4, y + 0.5]], lip, { tone: -1, contour: false }); }
  // ---- the artery: chambers stacked up it, each pinched by a valve ring; the swollen bright one is the pulse
  const N = 18, pts = []; for (let j = 0; j < N; j++) pts.push(sp(j / (N - 1)));
  A.limb(pts, rad(0) - 0.7, rad(1) - 0.5, artD, {});
  const NC = 7, pulse = pu >= 0 ? Math.floor(pu * NC) % NC : -1, ch = [];
  // the valve rings: bands of pale cartilage pinching the tube between the chambers
  for (let i = 1; i < NC; i++) { const u0 = i / NC * 0.93, r = rad(u0) - 0.1; A.limb([sp(u0 - 0.012), sp(u0 + 0.03)], r, r, 'zsaBone', { tone: -1, band: 1 }); }
  for (let i = 0; i < NC; i++) {
    const u0 = i / NC * 0.93, u1 = (i + 1) / NC * 0.93, um = (u0 + u1) / 2, sw = i === pulse ? 1 : i === pulse - 1 ? 0.4 : 0, r = rad(um) + sw;
    A.limb([sp(u0 + 0.035), sp(um), sp(u1 - 0.02)], r, r - 0.4, art, { band: r > 4 ? 2 : 1, tone: sw >= 1 ? 1 : 0, contourAll: true });
    ch.push([u0, um, r, sw]);
  }
  for (const [u0, um, r, sw] of ch) {
    const p = sp(um), d = tg(um), n = lit(d);
    // the valve ring at the chamber's root: a band of pale cartilage with knuckles standing out of the silhouette
    if (u0 > 0) { const q = sp(u0 + 0.01), dq = tg(u0), rq = rad(u0) - 0.1, lq = lit(dq);
      A.px(q[0] + lq[0] * (rq - 0.4), q[1] + lq[1] * (rq - 0.4), BN(4)); A.px(q[0] + lq[0] * (rq - 0.4) + dq[0], q[1] + lq[1] * (rq - 0.4) + dq[1], BN(3));   // the knuckle of cartilage catching the light
      A.px(q[0] - lq[0] * (rq - 0.5), q[1] - lq[1] * (rq - 0.5), BN(0)); }
    // the wet shine along the lit side (a run of light with a white bead in it), a vein crossing the chamber, the
    // shadow side flecked dark
    for (let k = -1.5; k <= 1.5; k++) A.px(p[0] + n[0] * (r - 1.3) + d[0] * k, p[1] + n[1] * (r - 1.3) + d[1] * k, R(4));
    A.px(p[0] + n[0] * (r - 1.3), p[1] + n[1] * (r - 1.3), sw ? '#ffffff' : '#ffe0e4');
    A.px(p[0] + n[0] * (r - 2.3) - d[0], p[1] + n[1] * (r - 2.3) - d[1], R(3));
    A.px(p[0] - n[0] * (r - 1.6) + d[0], p[1] - n[1] * (r - 1.6) + d[1], R(0)); A.px(p[0] - n[0] * (r - 2.4) - d[0] * 1.5, p[1] - n[1] * (r - 2.4) - d[1] * 1.5, R(1));
    if (ch.indexOf(ch.find(c => c[1] === um)) % 2 === 0) A.line(p[0] + n[0] * 0.5 - d[0] * 2.5, p[1] + n[1] * 0.5 - d[1] * 2.5, p[0] - n[0] * (r - 1.5) + d[0] * 2, p[1] - n[1] * (r - 1.5) + d[1] * 2, '#2a0c34');
    if (sw >= 1) { A.px(p[0], p[1], ZSA_BL[4]); A.px(p[0] + d[0], p[1] + d[1], ZSA_BL[5]); A.px(p[0] - d[0], p[1] - d[1], ZSA_BL[3]); }
  }
  const bk = view === 'back';
  if (bk) {
    // BACK VIEW: the dorsal side toward us: a dark vessel running up the spine of it and a row of cartilage knuckles
    // along the crest, standing out of the silhouette
    for (let j = 1; j < 30; j++) { const u = j / 30 * 0.93, p = sp(u), d = tg(u), n = lit(d), r = rad(u); A.px(p[0] + n[0] * r * 0.25, p[1] + n[1] * r * 0.25, j % 5 === 0 ? '#4a1030' : '#240818'); }
    for (let j = 0; j < 9; j++) { const u = 0.06 + j / 9 * 0.86, p = sp(u), d = tg(u), n = lit(d), r = rad(u) + 0.2;
      const q = [p[0] + n[0] * r, p[1] + n[1] * r]; A.px(q[0], q[1], BN(j % 2 ? 2 : 3)); A.px(q[0] + n[0], q[1] + n[1], BN(1)); A.px(q[0] - d[0], q[1] - d[1], BN(4)); }
  }
  // ---- the head: a flared collar of muscle, then the round lamprey mouth ringed with rows of teeth
  const Hc = sp(1), d = tg(0.985), n = [d[1], -d[0]], ang = Math.atan2(d[1], d[0]), hr = 4.6 + open * 0.9;
  const O = [Hc[0] + d[0] * 1.2, Hc[1] + d[1] * 1.2], ra = 2.3 + 1.2 * open, rc = hr + 0.6;
  if (bk) {
    // from behind the mouth is turned away: the rim of the lip ring and the tips of the outer teeth show past the
    // flared collar, which we see from the back as a hood of ribbed muscle
    zsaEllR(A, O[0] + d[0] * 0.6, O[1] + d[1] * 0.6, ra * 0.8, rc, ang, lip, { tone: -1 });
    const at2 = (q, s2) => [O[0] + d[0] * 0.6 + d[0] * Math.cos(q) * ra * 0.8 * s2 + n[0] * Math.sin(q) * rc * s2, O[1] + d[1] * 0.6 + d[1] * Math.cos(q) * ra * 0.8 * s2 + n[1] * Math.sin(q) * rc * s2];
    for (let i = 0; i < 12; i++) { const q = i / 12 * 6.2832; if (Math.cos(q) < 0.55) continue; const p0 = at2(q, 1.08); A.px(p0[0], p0[1], BN(i % 2 ? 3 : 4)); }
    zsaEllR(A, Hc[0] - d[0] * 0.2, Hc[1] - d[1] * 0.2, 3.2, hr + 0.2, ang, art, { band: 2 });
    { const c0 = [Hc[0] - d[0] * 2.2 + n[0] * (hr - 0.6), Hc[1] - d[1] * 2.2 + n[1] * (hr - 0.6)], c1 = [Hc[0] - d[0] * 2.2 - n[0] * (hr - 0.6), Hc[1] - d[1] * 2.2 - n[1] * (hr - 0.6)]; A.line(c0[0], c0[1], c1[0], c1[1], R(0)); A.line(c0[0] + d[0], c0[1] + d[1], c1[0] + d[0], c1[1] + d[1], BN(2)); }   // the cartilage ring round the back of the collar
    for (let i = -2; i <= 2; i++) { const b0 = [Hc[0] - d[0] * 1.5 + n[0] * i * 1.6, Hc[1] - d[1] * 1.5 + n[1] * i * 1.6], b1 = [b0[0] + d[0] * 2.4 + n[0] * i * 0.35, b0[1] + d[1] * 2.4 + n[1] * i * 0.35]; A.line(b0[0], b0[1], b1[0], b1[1], i % 2 ? R(1) : R(0)); }
    const ln = lit(d), sh = [Hc[0] + ln[0] * (hr - 1.5) - d[0] * 0.5, Hc[1] + ln[1] * (hr - 1.5) - d[1] * 0.5]; A.px(sh[0], sh[1], '#f0a0a8'); A.px(sh[0] + d[0], sh[1] + d[1], R(4));
    if (open > 1) { const g = at2(0.3, 1.3); A.px(g[0], g[1], ZSA_BL[3]); A.px(g[0] + d[0], g[1] + d[1] + 1, ZSA_BL[2]); }
    if (atk && ph === 1) for (let i = 0; i < 6; i++) A.px(H[0] - 5 + i * 2, 43 + (i % 2), ZSA_BL[2 + (i % 3)]);
    if (!atk) { const dr = at2(1.2, 1); A.px(dr[0], dr[1] + 2 + (ph % 2), ZSA_BL[2]); }
  } else {
  zsaEllR(A, Hc[0] - d[0] * 1.2, Hc[1] - d[1] * 1.2, 2.6, hr - 0.4, ang, art, { band: 2 });
  zsaEllR(A, O[0], O[1], ra, rc, ang, lip, {});
  zsaEllR(A, O[0] + d[0] * 0.3, O[1] + d[1] * 0.3, ra * 0.68, rc * 0.68, ang, '#0a0204', { flat: true, contour: false });
  const at = (q, s) => [O[0] + d[0] * Math.cos(q) * ra * s + n[0] * Math.sin(q) * rc * s, O[1] + d[1] * Math.cos(q) * ra * s + n[1] * Math.sin(q) * rc * s];
  for (let i = 0; i < 12; i++) { const q = i / 12 * 6.2832, p0 = at(q, 0.9), p1 = at(q, 0.66); A.line(p0[0], p0[1], p1[0], p1[1], BN(3)); A.px(p0[0], p0[1], BN(4)); }
  for (let i = 0; i < 6; i++) { const q = i / 6 * 6.2832 + 0.5, p2 = at(q, 0.45); A.px(p2[0], p2[1], BN(1)); }
  const th = at(0, 0.05); A.px(th[0], th[1], ZSA_BL[3]); A.px(th[0] + d[0] * 0.8, th[1] + d[1] * 0.8, ZSA_BL[4]);
  const lr = at(-1.9, 1.05); A.px(lr[0], lr[1], LP(4));   // wet light on the lip
  if (atk && ph === 1) for (let i = 0; i < 6; i++) A.px(H[0] - 5 + i * 2, 43 + (i % 2), ZSA_BL[2 + (i % 3)]);   // blood thrown up where it strikes
  if (!atk) { const dr = at(1.4, 1); A.px(dr[0], dr[1] + 1 + (ph % 2), ZSA_BL[2]); }                          // drool
  }
  // ---- the front lip of the torn earth over the stump, and the torn wall in front
  for (let i = 0; i < 4; i++) { const q = 0.35 + i * 0.8, x = B[0] + Math.cos(q) * 5.5, y = B[1] - 1 + Math.sin(q) * 1.6; A.poly([[x - 1.4, y + 0.5], [x + Math.cos(q) * 2.5, y - 2.5 - zsaH(i + 5) * 2.5], [x + 1.4, y + 0.5]], lip, {}); A.px(x + Math.cos(q) * 2.5, y - 1.5 - zsaH(i + 5) * 2.5, LP(4)); }
  A.poly([[B[0] - 11, B[1] + 0.5], [B[0] - 6, B[1] + 1.8], [B[0], B[1] + 2.2], [B[0] + 6, B[1] + 1.6], [B[0] + 11.5, B[1] + 0.5], [B[0] + 10, B[1] + 3], [B[0] + 5, B[1] + 3.5], [B[0] - 2, B[1] + 4], [B[0] - 9, B[1] + 3]], 'zsaSoil', {});
  for (const [dx, dy] of [[-9, 1], [-4, 2], [3, 2], [8, 1]]) { A.ell(B[0] + dx, B[1] + dy, 1.4, 1, 'zsaSoil', {}); }
  for (let i = 0; i < 5; i++) A.px(B[0] - 8 + i * 4, B[1] + 2 + (i % 2), zsaHex('zsaSoil', 4));
  bub(true);
};

pmat('zsaBlood', ZSA_BL.slice(0, 5));

})();

// =================================================================== v0.38: the Act I creatures, SCULPTED (Husk, Gravebloat, Vein-Borer)
// The three creatures of this file are rebuilt as small sculpts, like the v0.37 heroes: every part is a 3D form
// (tubes, ellipsoids, bevelled plates and hanging cloth surfaces) laid into a depth buffer, lit per pixel by one warm
// key from the upper left, a cool rim from behind, bounce from below, screen-space cast shadows, contact occlusion and
// local point lights (the Husk's candle, the ember in its chest, the worm's blood), then quantized into hand-picked
// hue-shifted ramps (violet shadows, ochre lights), cleaned of orphan pixels and given a coloured, broken outline.
// Each frame is painted as an `_hr` twin at 1.5x the world grain (every creature pixel is 2 screen pixels) and its
// world-grain canvas carries it, so drawMon16, flashes, tints and the class agents' hit reactions work unchanged.
// New poses: 'hit' (0-1, a recoil shown for a moment when struck) and 'death' (0-3, the collapse; the corpse lies in
// the last one). The old world-grain painters above stay registered (M32.hollow etc.) as a fallback.
// Shared: ZS32.sculpt / ZS32.sculptMats / ZS32.hrFrame / ZS32.smear are the engine, for any creature painter.
(function () {
const zV = {
  a: (p, q) => [p[0] + q[0], p[1] + q[1], p[2] + q[2]], s: (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]], m: (p, k) => [p[0] * k, p[1] * k, p[2] * k],
  d: (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2], l: p => Math.hypot(p[0], p[1], p[2]), lp: (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t],
  x: (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]],
};
zV.n = p => zV.m(p, 1 / (zV.l(p) || 1));
zV.sum = (...ps) => ps.reduce((a, b) => zV.a(a, b), [0, 0, 0]);
const zH = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const zVN = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), h = (a, b) => zH(a * 7 + s * 131, b * 13 + s * 17); return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
const zHx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// two-bone reach: the middle joint bent toward `hint`, the end clamped to the reach
function zIK(a, b, L1, L2, hint) {
  const d = zV.s(b, a), D0 = zV.l(d) || 1e-6, dir = zV.m(d, 1 / D0), D = Math.min(D0, L1 + L2 - 0.05);
  const x = (L1 * L1 - L2 * L2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, L1 * L1 - x * x));
  const pp = zV.n(zV.s(hint, zV.m(dir, zV.d(hint, dir))));
  return [zV.a(a, zV.a(zV.m(dir, x), zV.m(pp, h))), zV.a(a, zV.m(dir, D))];
}

// ------------------------------------------------------------------- materials
// defs: { name: { r: [hex dark..light], tex, ts, an, crack, spec, wrap, emis, gain, rim, tk, glow } }. A tint (a
// champion's or a variant's colour) shifts every non-emissive ramp toward it, keeping its value; cached per tint.
const ZSM_CACHE = {};
function zsMats(key, defs, tint, tk0) {
  const ck = key + '|' + (tint || ''); if (ZSM_CACHE[ck]) return ZSM_CACHE[ck];
  const T = tint ? zHx(tint) : null, tl = T ? (T[0] + T[1] + T[2]) / 3 || 1 : 1, L = [], I = {};
  for (const name in defs) {
    const d = defs[name], k = d.emis ? 0 : (d.tk != null ? d.tk : tk0 != null ? tk0 : 0.45);
    const ramp = d.r.map(h => { const c = zHx(h); if (!T || !k) return c; const l = (c[0] + c[1] + c[2]) / 3; return c.map((v, i) => Math.round(Math.max(0, Math.min(255, v + (T[i] * l / tl - v) * k)))); });
    I[name] = L.length;
    L.push(Object.assign({ name, tex: 0.06, ts: 0.5, an: 1, crack: 0, spec: 0, wrap: 0, emis: false, gain: 1, rim: 0.45, glow: null }, d, { ramp }));
  }
  return (ZSM_CACHE[ck] = { L, I });
}

// ------------------------------------------------------------------- the sculpt: forms into a depth buffer, lit per pixel
function zsSculpt(W, H, MT) {
  const N = W * H, Z = new Float32Array(N).fill(-1e9), NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N);
  const M = new Int16Array(N).fill(-1), TU = new Float32Array(N), TV = new Float32Array(N), ID = new Int16Array(N).fill(-1), DK = new Float32Array(N), EM = new Float32Array(N);
  const FIN = new Map(), LIGHTS = [];
  let nid = 0;
  const mi = m => { const v = MT.I[m]; if (v == null) throw new Error('zs mat ' + m); return v; };
  const put = (x, y, z, nx, ny, nz, m, tu, tv, id, dk, em) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (z <= Z[i]) return; Z[i] = z; NX[i] = nx; NY[i] = ny; NZ[i] = nz; M[i] = m; TU[i] = tu; TV[i] = tv; ID[i] = id; DK[i] = dk || 0; EM[i] = em || 0; };
  const tri = (a, b, c, n, m, id, dk, tu, tv, em) => {
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0]))), y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(d) < 1e-6) return;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5, l1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / d, l2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / d, l3 = 1 - l1 - l2;
      if (l1 < -0.02 || l2 < -0.02 || l3 < -0.02) continue;
      put(x, y, l1 * a[2] + l2 * b[2] + l3 * c[2], n[0], n[1], n[2], m, tu, tv, id, dk, em);
    }
  };
  const S = {
    W, H, Z, M, ID,
    // a tube along a polyline (camera space: x right, y down, z toward us), radius r0 -> r1
    cap(pts, r0, r1, mn, o) {
      o = o || {}; const m = mi(mn), id = nid++, n = pts.length; let acc = 0;
      for (let s = 0; s < n - 1; s++) {
        const a = pts[s], b = pts[s + 1], ra = Array.isArray(r0) ? r0[s] : r0 + (r1 - r0) * s / Math.max(1, n - 1), rb = Array.isArray(r0) ? r0[s + 1] : r0 + (r1 - r0) * (s + 1) / Math.max(1, n - 1);
        const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-6, L = Math.sqrt(L2), R = Math.max(ra, rb) + 0.5;
        const x0 = Math.floor(Math.min(a[0], b[0]) - R), x1 = Math.ceil(Math.max(a[0], b[0]) + R), y0 = Math.floor(Math.min(a[1], b[1]) - R), y1 = Math.ceil(Math.max(a[1], b[1]) + R);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5; let t = ((px - a[0]) * dx + (py - a[1]) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const cx = a[0] + dx * t, cy = a[1] + dy * t, ex = px - cx, ey = py - cy, d2 = ex * ex + ey * ey, r = Math.max(0.45, ra + (rb - ra) * t); if (d2 > r * r) continue;
          const h = Math.sqrt(r * r - d2);
          put(x, y, a[2] + (b[2] - a[2]) * t + h * (o.flat || 1), ex / r, ey / r, h / r, m, acc + t * L, Math.atan2(ex, h) * r * 2, id, o.dk, o.em);
        }
        acc += L;
      }
      return id;
    },
    ell(c, rx, ry, rz, mn, o) {
      o = o || {}; const m = mi(mn), id = nid++;
      for (let y = Math.floor(c[1] - ry - 1); y <= Math.ceil(c[1] + ry); y++) for (let x = Math.floor(c[0] - rx - 1); x <= Math.ceil(c[0] + rx); x++) {
        const qx = (x + 0.5 - c[0]) / Math.max(0.45, rx), qy = (y + 0.5 - c[1]) / Math.max(0.45, ry), q = qx * qx + qy * qy; if (q > 1) continue;
        const h = Math.sqrt(1 - q), nx = qx / rx, ny = qy / ry, nz = h / Math.max(0.3, rz), l = Math.hypot(nx, ny, nz) || 1;
        put(x, y, c[2] + rz * h, nx / l, ny / l, nz / l, m, x - c[0] + (o.tu || 0), y - c[1] + (o.tv || 0), id, o.dk, o.em);
      }
      return id;
    },
    // a flat plate with bevelled edges and a little dome
    plate(pts, mn, o) {
      o = o || {}; const m = mi(mn), id = nid++, n = pts.length;
      let nx = 0, ny = 0, nz = 0, cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); cx += a[0] / n; cy += a[1] / n; cz += a[2] / n; }
      let l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const nzc = Math.max(0.3, nz), bev = o.bevel == null ? 1.3 : o.bevel, bul = o.bulge == null ? 0.35 : o.bulge;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      const sz = Math.max(1, Math.max(x1 - x0, y1 - y0) / 2);
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        const px = x + 0.5, py = y + 0.5; let inside = false, dE = 1e9, ex = 0, ey = 0;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
          const dx = xi - xj, dy = yi - yj, L2 = dx * dx + dy * dy || 1e-6; let t = ((px - xj) * dx + (py - yj) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = xj + dx * t, qy = yj + dy * t, d = Math.hypot(px - qx, py - qy); if (d < dE) { dE = d; const L = Math.sqrt(L2); ex = dy / L; ey = -dx / L; if (ex * (cx - qx) + ey * (cy - qy) > 0) { ex = -ex; ey = -ey; } }
        }
        if (!inside) continue;
        const b = dE < bev ? (1 - dE / bev) * 1.1 : 0, rx = (px - cx) / sz, ry = (py - cy) / sz;
        let mx = nx + ex * b + rx * bul, my = ny + ey * b + ry * bul, mz = nz; const ll = Math.hypot(mx, my, mz) || 1;
        const z = cz - (nx * (px - cx) + ny * (py - cy)) / nzc + (1 - Math.min(1, rx * rx + ry * ry)) * bul * sz * 0.35 - b * 0.4 + (o.z || 0);
        put(x, y, z, mx / ll, my / ll, mz / ll, m, (px - pts[0][0]) * (o.tus || 1), py - pts[0][1], id, o.dk, o.em);
      }
      return id;
    },
    // a cloth or skin surface: fn(s, t) -> camera point or null (a tear); the grid is filled as small triangles
    surf(fn, ns, nt, mn, o) {
      o = o || {}; const m = mi(mn), id = nid++, G = [];
      for (let i = 0; i <= ns; i++) { const row = []; for (let j = 0; j <= nt; j++) row.push(fn(i / ns, j / nt)); G.push(row); }
      for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) {
        const a = G[i][j], b = G[i + 1][j], c = G[i + 1][j + 1], d = G[i][j + 1]; if (!a || !b || !c || !d) continue;
        const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2], vx = d[0] - b[0], vy = d[1] - b[1], vz = d[2] - b[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        let dk = o.dk || 0; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; dk += o.inside == null ? 0.35 : o.inside; }
        const tu = i / ns * (o.su || 40), tv = j / nt * (o.sv || 20);
        tri(a, b, c, [nx, ny, nz], m, id, dk, tu, tv, o.em); tri(a, c, d, [nx, ny, nz], m, id, dk, tu, tv, o.em);
      }
      return id;
    },
    // repaint what is already there (in front) with another material, keeping its form: cuts, stains, cavities
    mark(x, y, mn, o) {
      o = o || {}; x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return false; const i = y * W + x;
      if (M[i] < 0 || (o.ids && !o.ids.has(ID[i])) || (o.z != null && o.z < Z[i] - (o.eps || 1.5))) return false;
      M[i] = mi(mn); DK[i] = o.dk || 0; EM[i] = o.em || 0; if (o.nz) { NX[i] *= 0.5; NY[i] *= 0.5; NZ[i] = Math.sqrt(Math.max(0, 1 - NX[i] * NX[i] - NY[i] * NY[i])); } return true;
    },
    markEll(cx, cy, rx, ry, mn, o) { let n = 0; for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const qx = (x + 0.5 - cx) / rx, qy = (y + 0.5 - cy) / ry; if (qx * qx + qy * qy <= 1 && S.mark(x, y, mn, Object.assign({}, o, o && o.emf ? { em: o.emf(Math.hypot(qx, qy)) } : null))) n++; } return n; },
    markLine(a, b, mn, o) { const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])))); for (let i = 0; i <= n; i++) S.mark(a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n, mn, Object.assign({ z: a[2] + (b[2] - a[2]) * i / n }, o)); },
    // a final colour, placed over whatever is there after shading (only where the surface is not in front of it)
    dot(x, y, col, z) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (z != null && M[i] >= 0 && z < Z[i] - 1.5) return; FIN.set(i, typeof col === 'string' ? zHx(col) : col); },
    // a local point light (camera space) of a colour: candles, embers
    light(p, r, k, col) { LIGHTS.push({ p, r, k, col: typeof col === 'string' ? zHx(col) : col }); },
    id() { return nid; },
    render(o) {
      o = o || {};
      const c = mkCanvas(W, H), cx = c.getContext('2d'), img = cx.createImageData(W, H), D = img.data, IX = new Int8Array(N).fill(-1), WA = new Float32Array(N), WL = new Int8Array(N).fill(-1), RM = new Uint8Array(N);
      const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
      const L = nrm([-0.64, -0.62, 0.45]), LR = nrm([0.78, -0.3, -0.55]), BN = nrm([0.25, 0.9, 0.3]), HV = nrm([L[0], L[1], L[2] + 1]);
      const lxy = Math.hypot(L[0], L[1]), sdx = L[0] / lxy, sdy = L[1] / lxy, sdz = L[2] / lxy;
      const ML = MT.L, amb = o.amb == null ? 0.1 : o.amb;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, mm = M[i]; if (mm < 0) continue;
        const mat = ML[mm], R = mat.ramp, nr = R.length;
        if (mat.emis) { IX[i] = Math.max(0, Math.min(nr - 1, Math.round((EM[i] || 0.5) * (nr - 1)))); continue; }
        const nx = NX[i], ny = NY[i], nz = NZ[i];
        let key = nx * L[0] + ny * L[1] + nz * L[2]; if (mat.wrap) key = (key + mat.wrap) / (1 + mat.wrap);
        const lam = Math.max(0, key);
        let sh = 1;
        if (lam > 0.02) for (let k = 2; k <= 16; k++) { const xx = Math.round(x + sdx * k), yy = Math.round(y + sdy * k); if (xx < 0 || yy < 0 || xx >= W || yy >= H) break; const j = yy * W + xx; if (M[j] >= 0 && ID[j] !== ID[i] && Z[j] > Z[i] + sdz * k + 1.8) { sh = 0.32; break; } }
        let occ = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (M[j] >= 0 && Z[j] > Z[i] + 1.8) occ++; }
        const rim = Math.pow(Math.max(0, nx * LR[0] + ny * LR[1] + nz * LR[2]), 1.3) * (1.15 - nz);
        const bo = Math.max(0, nx * BN[0] + ny * BN[1] + nz * BN[2]);
        let I = (amb + 0.84 * lam * sh) * (1 - occ * 0.065) + bo * 0.13 * (1 - lam) + rim * mat.rim - DK[i] * 0.3;
        // local lights: warm pools round a candle, red round an ember
        let wa = 0, wl = -1;
        for (let li = 0; li < LIGHTS.length; li++) {
          const Lt = LIGHTS[li], vx = Lt.p[0] - x - 0.5, vy = Lt.p[1] - y - 0.5, vz = Lt.p[2] - Z[i], d = Math.hypot(vx, vy, vz); if (d >= Lt.r) continue;
          const f = Math.pow(1 - d / Lt.r, 1.6) * Math.max(0, (nx * vx + ny * vy + nz * vz) / (d || 1) * 0.8 + 0.2);
          I += f * Lt.k; if (f > wa) { wa = f; wl = li; }
        }
        WA[i] = wa; WL[i] = wl;
        I *= mat.gain;
        if (mat.tex) { const g = zVN(TU[i] * mat.ts, TV[i] * mat.ts * mat.an, mm * 7 + (ID[i] % 5) * 3); I += (g - 0.5) * mat.tex * 1.4; }
        let k = Math.round(Math.pow(Math.max(0, I), 1.28) * (nr - 1.2) + 0.12);
        if (mat.tex) { const g2 = zVN(TU[i] * mat.ts * 1.7 + 11, TV[i] * mat.ts * 1.7 * mat.an, mm + 5); if (g2 > 0.74) k -= 1; else if (g2 < 0.2 && lam > 0.35) k += 1; }   // clusters: pits and raised grain
        if (mat.crack) { const cr = zVN(TU[i] * 0.34 + ID[i] * 5.3, TV[i] * 0.34, 91); if (Math.abs(cr - 0.5) < mat.crack) k -= 2; else if (Math.abs(cr - 0.5) < mat.crack * 2 && lam > 0.4) k += 1; }
        if (mat.spec && sh > 0.5) { const hs = nx * HV[0] + ny * HV[1] + nz * HV[2]; if (hs > 1 - mat.spec) k = mat.specC ? 100 : nr - 1; else if (hs > 1 - mat.spec * 2.5) k = Math.max(k, nr - 2); }
        if (rim > 0.42 && mat.rimC) RM[i] = 1;
        IX[i] = k === 100 ? 100 : k < 0 ? 0 : k >= nr ? nr - 1 : k;
      }
      // orphans: a lone pixel whose four neighbours of its material agree takes their tone
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x; if (IX[i] < 0 || IX[i] === 100 || ML[M[i]].emis) continue; let t = -2, ok = true;
        for (const j of [i - 1, i + 1, i - W, i + W]) { if (M[j] !== M[i]) { ok = false; break; } if (t === -2) t = IX[j]; else if (IX[j] !== t) { ok = false; break; } }
        if (ok && t !== IX[i] && Math.abs(t - IX[i]) === 1) IX[i] = t;
      }
      // a crease where one form passes in front of another: the one behind darkens along the edge
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (IX[i] < 0 || IX[i] === 100 || ML[M[i]].emis) continue;
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (M[j] >= 0 && ID[j] !== ID[i] && Z[j] > Z[i] + 2.2) { IX[i] = Math.max(0, IX[i] - (dx < 0 || dy < 0 ? 1 : 2)); break; } }
      }
      for (let i = 0; i < N; i++) if (M[i] >= 0) {
        const mat = ML[M[i]]; let col = IX[i] === 100 ? mat.specC : mat.ramp[IX[i]]; const q = i * 4;
        if (WL[i] >= 0 && WA[i] > 0.12 && !mat.emis) { const lc = LIGHTS[WL[i]].col, w = WA[i] > 0.5 ? 0.42 : WA[i] > 0.28 ? 0.28 : 0.15; col = [col[0] + (lc[0] - col[0]) * w, col[1] + (lc[1] - col[1]) * w, col[2] + (lc[2] - col[2]) * w]; }
        if (RM[i]) { const rc = mat.rimC; col = [col[0] + (rc[0] - col[0]) * 0.35, col[1] + (rc[1] - col[1]) * 0.35, col[2] + (rc[2] - col[2]) * 0.35]; }
        D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255;
      }
      // emissive bleed: what sits round a glow picks up its colour
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (M[i] < 0 || !ML[M[i]].emis || EM[i] < 0.45) continue; const gc = ML[M[i]].glow || ML[M[i]].ramp[Math.floor(ML[M[i]].ramp.length / 2)];
        for (const [dx, dy, w] of [[1, 0, 0.4], [-1, 0, 0.4], [0, 1, 0.4], [0, -1, 0.4], [2, 0, 0.18], [-2, 0, 0.18], [0, -2, 0.18], [0, 2, 0.18]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (M[j] < 0 || ML[M[j]].emis) continue; const q = j * 4; D[q] += (gc[0] - D[q]) * w; D[q + 1] += (gc[1] - D[q + 1]) * w; D[q + 2] += (gc[2] - D[q + 2]) * w; }
      }
      for (const [i, col] of FIN) { const q = i * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255; }
      // the outline: the darkest tone of what it borders, left open where that edge is in full light (upper left)
      const S0 = new Uint8ClampedArray(D);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (S0[i * 4 + 3]) continue;
        let best = -1, lit = true, n = 0;
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (!S0[j * 4 + 3]) continue; n++; if (best < 0 || (M[j] >= 0 && M[best] < 0)) best = j; const m2 = M[j] >= 0 ? ML[M[j]] : null; const hl = m2 && (m2.emis || IX[j] >= m2.ramp.length - 2); if (!(hl && (dx > 0 || dy > 0))) lit = false; }
        if (best < 0 || lit) continue;
        const m2 = M[best] >= 0 ? ML[M[best]] : null, col = m2 ? (m2.out ? zHx(m2.out) : m2.ramp[0]) : [10, 6, 10], q = i * 4;
        D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255;
      }
      cx.putImageData(img, 0, 0); return c;
    }
  };
  return S;
}
// a smear of a fast stroke on an hr canvas: polylines of points [x, y] from tail to head, drawn only into empty pixels
function zsSmear(c, lines, cols, w) {
  const x = c.getContext('2d'), img = x.getImageData(0, 0, c.width, c.height), D = img.data, Wc = c.width, Hc = c.height, cc = cols.map(zHx);
  for (const pts of lines) {
    let L = 0; const seg = []; for (let i = 0; i < pts.length - 1; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); seg.push(l); L += l; }
    let acc = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const n = Math.max(1, Math.ceil(seg[i] * 2));
      for (let k = 0; k <= n; k++) {
        const t = (acc + seg[i] * k / n) / (L || 1), px = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k / n, py = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k / n, ww = (w || 1) * (0.4 + 0.8 * t);
        for (let dy = -Math.ceil(ww); dy <= Math.ceil(ww); dy++) for (let dx = -Math.ceil(ww); dx <= Math.ceil(ww); dx++) {
          if (dx * dx + dy * dy > ww * ww + 0.3) continue; const X = Math.round(px + dx), Y = Math.round(py + dy); if (X < 0 || Y < 0 || X >= Wc || Y >= Hc) continue;
          const q = (Y * Wc + X) * 4; if (D[q + 3] === 255) continue; const ci = Math.min(cc.length - 1, Math.floor(t * cc.length)), a = Math.round(255 * Math.min(0.9, 0.15 + 0.8 * t));
          if (D[q + 3] >= a) continue; D[q] = cc[ci][0]; D[q + 1] = cc[ci][1]; D[q + 2] = cc[ci][2]; D[q + 3] = a;
        }
      }
      acc += seg[i];
    }
  }
  x.putImageData(img, 0, 0);
}
// a monster frame from an hr painting: world-grain canvases that carry their 1.5x twins, flipped and white copies,
// the painted bounds (world px) for hit boxes and name plates
function zsHrFrame(hr, W, H, ox, oy) {
  const lo = src => { const c = mkCanvas(W, H), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, W, H); c._hr = src; return c; };
  const flip = src => { const f = mkCanvas(src.width, src.height), x = f.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return f; };
  const tintH = (src, col) => { const q = mkCanvas(src.width, src.height), x = q.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, q.width, q.height); return q; };
  const hf = flip(hr), K = hr.width / W;
  const d = hr.getContext('2d').getImageData(0, 0, hr.width, hr.height).data; let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let j = 0; j < hr.height; j++) for (let i = 0; i < hr.width; i++) if (d[(j * hr.width + i) * 4 + 3] > 128) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  const bb = x1 < 0 ? { x: ox - 4, y: oy - 8, w: 8, h: 8 } : { x: Math.floor(x0 / K), y: Math.floor(y0 / K), w: Math.max(1, Math.ceil((x1 + 1) / K) - Math.floor(x0 / K)), h: Math.max(1, Math.ceil((y1 + 1) / K) - Math.floor(y0 / K)) };
  return { c: lo(hr), f: lo(hf), fl: lo(tintH(hr, '#fff')), flf: lo(tintH(hf, '#fff')), w: W, h: H, ox, oy, bb, tint: (src, col) => lo(tintH(src._hr || src, col)) };
}
ZS32.sculpt = zsSculpt; ZS32.sculptMats = zsMats; ZS32.smear = zsSmear; ZS32.hrFrame = zsHrFrame; ZS32.ik = zIK; ZS32.v3 = zV; ZS32.vn = zVN;

// a view of a creature: model space [f forward, r right-hand side toward us, u up] in world px -> hr camera space
function zsView(S, def, view) {
  const phi = view === 'back' ? -0.62 : 0.5, cp = Math.cos(phi), sp = Math.sin(phi), K = 1.5, HX = def.ox * K, HY = def.oy * K;
  const C = p => { const dep = p[0] * sp + p[1] * cp; return [HX + (p[0] * cp - p[1] * sp) * K, HY + (-p[2] + dep * 0.4) * K, dep * K]; };
  const V = {
    S, C, K, phi, back: view === 'back',
    cap: (pts, r0, r1, m, o) => S.cap(pts.map(C), Array.isArray(r0) ? r0.map(r => r * K) : r0 * K, (r1 == null ? r0 : r1) * K, m, o),
    ell: (p, rx, ry, rz, m, o) => S.ell(C(p), rx * K, ry * K, (rz == null ? Math.min(rx, ry) : rz) * K, m, o),
    plate: (pts, m, o) => S.plate(pts.map(C), m, o),
    surf: (fn, ns, nt, m, o) => S.surf((s, t) => { const p = fn(s, t); return p && C(p); }, ns, nt, m, o),
    mark: (p, m, o) => { const q = C(p); return S.mark(q[0], q[1], m, Object.assign({ z: q[2] }, o)); },
    markEll: (p, rx, ry, m, o) => { const q = C(p); return S.markEll(q[0], q[1], rx * K, ry * K, m, Object.assign({ z: q[2] }, o)); },
    markLine: (a, b, m, o) => S.markLine(C(a), C(b), m, o),
    dot: (p, col, dx, dy) => { const q = C(p); S.dot(q[0] + (dx || 0), q[1] + (dy || 0), col, q[2]); },
    light: (p, r, k, col) => S.light(C(p), r * K, k, col),
    // a ring of points round an axis point, in the plane normal to `t`
    ring: (c, t, rad, n, a0, a1, ref) => { const T = zV.n(t), R0 = zV.n(zV.s(ref || [0, 0, 1], zV.m(T, zV.d(ref || [0, 0, 1], T)))), R1 = zV.x(T, R0), out = []; for (let i = 0; i <= n; i++) { const a = (a0 || 0) + ((a1 == null ? Math.PI * 2 : a1) - (a0 || 0)) * i / n; out.push(zV.a(c, zV.a(zV.m(R0, Math.cos(a) * rad), zV.m(R1, Math.sin(a) * rad)))); } return out; },
  };
  return V;
}

// ------------------------------------------------------------------- THE HUSK (hollow; also the Drowned Husk)
// A pilgrim the god's death hollowed out: bent double, the hump of the back bare to the spine's knuckles, a rotten
// mantle over the rump, a pilgrim's candle stuck into the hump with its own wax (the only warm light it carries), the
// chest split open on the near side with the god's blood smouldering in the cage of broken ribs, the face's skin
// shrunk off the skull, a coal in the socket, the jaw hanging off its hinge. Arms hang to the knees on hooked claws.
// The Drowned Husk: the same, waterlogged: weed hanging off it, its candle long drowned out, the skin wet.
const HUSK = { W: 58, H: 58, ox: 22, oy: 51 };
const HUSK_M = {
  skin: { r: ['#100d14', '#1f1a21', '#302a2e', '#433b3b', '#595046', '#716752', '#8b815f', '#a59b72', '#bdb389', '#d4caa2'], tex: 0.12, ts: 0.55, rim: 0.5, gain: 1.06, rimC: zHx('#8a98a8') },
  skinW: { r: ['#100d14', '#1f1a21', '#302a2e', '#433b3b', '#595046', '#716752', '#8b815f', '#a59b72', '#bdb389', '#d4caa2'], tex: 0.12, ts: 0.55, rim: 0.5, gain: 1.06, spec: 0.03, rimC: zHx('#8aa8a8') },
  rag: { r: ['#0a0507', '#150b0b', '#22120e', '#311a12', '#422415', '#552f19', '#6a3d20', '#7f4e2a'], tex: 0.2, ts: 0.7, an: 3.5, wrap: 0.25, rim: 0.35, tk: 0.3, rimC: zHx('#7a8494') },
  rope: { r: ['#0e0906', '#1f160e', '#342616', '#4c3a22', '#66512f', '#80693f'], tex: 0.3, ts: 1.1, an: 4, tk: 0.3 },
  bone: { r: ['#120e14', '#241e22', '#3a322e', '#554939', '#72634a', '#918060', '#b09d76', '#cbb88c', '#e2d2a6'], tex: 0.08, crack: 0.03, tk: 0.2 },
  wax: { r: ['#1e130d', '#3a2515', '#5a3f20', '#7f5f35', '#a4814f', '#c5a36b', '#dfc28c', '#f2dfb2'], tex: 0.05, tk: 0.15, spec: 0.02 },
  ink: { r: ['#050304', '#0a0607', '#110a0b'], tex: 0, tk: 0 },
  hair: { r: ['#050407', '#0b090c', '#131014', '#1c171b', '#262024'], tex: 0.2, ts: 1.2, an: 6, tk: 0.2 },
  weed: { r: ['#040806', '#09120c', '#0f1d13', '#172a1b', '#213824', '#2d4a2e'], tex: 0.2, ts: 1, an: 5, tk: 0 },
  emb: { r: ['#2a0404', '#5a0906', '#961808', '#d0360f', '#f27025', '#ffae55', '#ffe4a0'], emis: true, glow: zHx('#b0301a') },
  flame: { r: ['#4a1004', '#962e08', '#dc6a16', '#fca23e', '#ffd47e', '#fff4d4'], emis: true, glow: zHx('#e89040') },
};
const HUSK_DROWNED = '#2f6a5a';
const HUSK_PH = { idle: 4, walk: 8, wind: 3, atk: 3, hit: 2, death: 4 };
function huskRig(pose, ph) {
  const B0 = { Pv: [0, 0, 17], Hm: [3.2, 0, 26.6], S: [8.8, 0, 26], Hd: [14.4, 0, 23.1], hdir: [1, 0, -0.35], fN: [3, 2.7, 0], fF: [-2, -2.5, 0], lN: 0, lF: 0,
    hN: [10.6, 4.4, 9.6], hF: [7.6, -4.4, 10.2], spread: 0, jaw: 0.6, emb: 0.55, cloth: 0, fl: 0, candle: 1, loll: 0 };
  const J = JSON.parse(JSON.stringify(B0)), L3 = zV.lp;
  const mix = (A, Bp, t) => { const o = {}; for (const k in A) o[k] = Array.isArray(A[k]) ? L3(A[k], Bp[k] != null ? Bp[k] : A[k], t) : A[k] + ((Bp[k] != null ? Bp[k] : A[k]) - A[k]) * t; return o; };
  let R = J, smear = null;
  if (pose === 'idle') {
    const k = ph % 4, br = [0, 0.5, 1, 0.5][k];
    J.Hm[2] += br * 0.55; J.S[2] += br * 0.35; J.Hd[2] -= br * 0.45; J.Hd[0] += br * 0.2; J.hN[0] += br * 0.5; J.hF[0] -= br * 0.3; J.jaw += br * 0.4; J.fl = [0, 1, 0, -1][k]; J.cloth = br * 0.3; J.emb = 0.5 + br * 0.15;
  } else if (pose === 'walk') {
    const t = ph / 8 * Math.PI * 2, s = Math.sin(t), c = Math.cos(t);
    J.Pv = [0.4, 0.45 * c, 17.3 - 1.0 * Math.abs(s)]; J.Hm = [3.9 + 0.5 * Math.sin(2 * t), 0.3 * c, 27 - 0.8 * Math.abs(s)]; J.S = [9 + 0.4 * Math.sin(2 * t), 0.2 * c, 26.1 - 0.7 * Math.abs(s)];
    J.Hd = [14 + 0.3 * Math.sin(2 * t - 1), 0.25 * c, 22.9 + 0.6 * Math.sin(2 * t - 1.2) - 0.6 * Math.abs(s)];
    J.fN = [1.6 + 4.8 * s, 2.7, 0]; J.lN = Math.max(0, c) * 2.4; J.fF = [0.6 - 4.8 * s, -2.5, 0]; J.lF = Math.max(0, -c) * 1.3;
    J.hN = [10.2 - 3 * Math.sin(t - 0.7), 4.4, 9.8 + Math.max(0, -Math.sin(t - 0.7)) * 1.4]; J.hF = [8 + 3 * Math.sin(t - 0.7), -4.4, 10.2 + Math.max(0, Math.sin(t - 0.7)) * 1.2];
    J.cloth = -1.1 - 0.6 * Math.abs(c) + 0.5 * Math.sin(2 * t); J.fl = [0, 1, 1, 0, -1, -1, 0, 1][ph % 8] - 1; J.loll = 0.4 * Math.sin(2 * t - 1.2);
  } else if (pose === 'wind') {
    const kw = [0.4, 0.75, 1][ph % 3];
    R = mix(J, { Pv: [-0.8, 0, 15.6], Hm: [1.3, 0, 31], S: [5, 0, 32.6], Hd: [9.6, 0, 33.6], hdir: [1, 0, 0.45], hN: [8.5, 6.4, 40.5], hF: [5.5, -6.2, 39], fN: [4.8, 2.8, 0], fF: [-3, -2.5, 0], spread: 1, jaw: 2.3, emb: 1, cloth: 1.2 }, kw);
    R.fl = -1;
  } else if (pose === 'atk') {
    const A0 = { Pv: [3.6, 0, 15.4], Hm: [8.6, 0, 24.2], S: [13.6, 0, 22.1], Hd: [18.2, 0, 20.1], hdir: [1, 0, -0.1], hN: [21.5, 3.8, 12.8], hF: [9.5, -5.2, 22.5], fN: [9.6, 2.8, 0], fF: [-4.6, -2.5, 0], spread: 0.85, jaw: 2.1, emb: 1, cloth: -2.2, fl: 1 };
    const A1 = Object.assign({}, A0, { Pv: [4.1, 0, 15], Hm: [9.1, 0, 22.8], S: [14.1, 0, 20.2], Hd: [18.6, 0, 18.2], hN: [16.5, 3.4, 4.8], hF: [21, -3.6, 14.6], spread: 0.55, jaw: 1.6, cloth: -1.6 });
    R = ph === 0 ? A0 : ph === 1 ? A1 : mix(A1, J, 0.55);
    R.lN = 0; R.lF = 0; R.candle = 1; R.loll = 0;
    if (ph === 0) smear = { hand: 'N', from: [5, 5.6, 36], via: [19, 5.4, 26] };
    if (ph === 1) smear = { hand: 'F', from: [9.5, -5.2, 22.5], via: [18, -4.8, 21] };
  } else if (pose === 'hit') {
    const H0 = { Pv: [-1.3, 0, 17.6], Hm: [1, 0, 28.6], S: [5, 0, 29.6], Hd: [8, 0, 31.6], hdir: [0.6, 0, 0.8], hN: [5.5, 5.8, 18.5], hF: [2.5, -5.6, 19.5], fN: [4.2, 2.8, 0], spread: 1, jaw: 2.4, emb: 0.95, cloth: 1.6, fl: -1 };
    R = ph === 0 ? mix(J, H0, 1) : mix(J, H0, 0.45);
  } else if (pose === 'death') {
    const DS = [
      { Pv: [1, 0, 12], Hm: [4.2, 0, 21.4], S: [9.2, 0, 19], Hd: [13.6, 0, 16], hdir: [0.8, 0, -0.6], hN: [11.5, 4.4, 3], hF: [9, -4.4, 3.5], fN: [2.5, 2.7, 0], fF: [-2.5, -2.5, 0], jaw: 1.8, emb: 0.55, cloth: 0.8, candle: 1, fl: -1 },
      { Pv: [3, 0, 7.4], Hm: [8, 0, 13.2], S: [13, 0, 10.2], Hd: [17, 0, 6.8], hdir: [0.8, 0, -0.6], hN: [18.5, 4.4, 1], hF: [16.5, -4.6, 1.2], fN: [-3.5, 2.6, 0], fF: [-4.5, -2.4, 0], jaw: 2, emb: 0.4, cloth: 1.4, candle: 0.5, fl: -1 },
      { Pv: [4, 0, 4], Hm: [10, 0, 6.6], S: [16, 0, 4.6], Hd: [20.5, 0, 3.4], hdir: [1, 0, -0.2], hN: [21, 6, 0.8], hF: [20.5, -6.2, 1], fN: [-5.5, 2.6, 0], fF: [-6, -2.4, 0], jaw: 2.2, emb: 0.28, cloth: 0.6, candle: 0, fl: 0 },
      { Pv: [4, 0, 3.3], Hm: [10, 0, 5.4], S: [16, 0, 3.9], Hd: [20.8, 0.4, 2.7], hdir: [0.8, 0.5, -0.2], hN: [22.5, 6.8, 0.8], hF: [19.5, -7, 0.9], fN: [-6, 2.8, 0], fF: [-5.6, -2.4, 0], jaw: 2.4, emb: 0.16, cloth: 0.2, candle: 0, fl: 0 },
    ];
    R = Object.assign({}, J, DS[ph % 4]); R.lN = 0; R.lF = 0; R.spread = 0.6; R.dead = ph % 4;
  }
  R.hdir = zV.n(R.hdir); R.pose = pose; R.ph = ph; R.smear = smear;
  return R;
}
function huskPaint(V, J, drown) {
  const up = [0, 0, 1], lat = [0, 1, 0], A = zV.a, Mv = zV.m, S3 = zV.s, n3 = zV.n, L3 = zV.lp;
  const skin = drown ? 'skinW' : 'skin';
  // ---- the spine: a curve from the pelvis over the hump to the shoulder girdle, and the body's girth along it
  const Cc = S3(Mv(J.Hm, 2), Mv(A(J.Pv, J.S), 0.5));
  const B = v => A(A(Mv(J.Pv, (1 - v) * (1 - v)), Mv(Cc, 2 * v * (1 - v))), Mv(J.S, v * v));
  const T = v => n3(A(Mv(S3(Cc, J.Pv), 2 * (1 - v)), Mv(S3(J.S, Cc), 2 * v)));
  const Dv = v => { const t = T(v); let d = n3([-t[2], 0, t[0]]); if (d[2] < 0) d = Mv(d, -1); return d; };
  const rr = v => 3.3 + 0.3 * v + 0.75 * Math.sin(Math.PI * Math.max(0, Math.min(1, v)));
  const onS = (v, ang, dr) => { const R = rr(v) + (dr || 0); return A(B(v), A(Mv(Dv(v), Math.cos(ang) * R), Mv(lat, Math.sin(ang) * R))); };   // ang 0 = the ridge of the back, +pi/2 = the near flank
  const dim = { dk: 0.07 };
  const shN = A(J.S, [-0.4, 3.7, 0.3]), shF = A(J.S, [-0.4, -3.7, 0.3]);
  const hipN = A(J.Pv, [0.3, 2.3, -0.9]), hipF = A(J.Pv, [0.3, -2.3, -0.9]);
  // ---- limbs
  const leg = (hip, ft, lift, far) => {
    const an = A(ft, [0, 0, 1.3 + lift]), [kn, an2] = zIK(hip, an, 9.4, 9.1, [1, 0, 0.15]), o = far ? dim : {};
    const fw = n3([1, 0, J.dead != null ? -0.2 : -0.05 - lift * 0.08]), toe = A(an2, A(Mv(fw, 3.3), [0, 0, -1 - lift * 0.15]));
    V.cap([hip, L3(hip, kn, 0.5), kn], [1.95, 1.6, 1.25], null, skin, o);
    V.cap([kn, an2], 1.15, 0.8, skin, o);
    V.cap([A(an2, [-0.7, 0, -0.4]), L3(an2, toe, 0.55), toe], [0.85, 0.8, 0.55], null, skin, o);
    for (const dl of [-0.5, 0.5]) V.cap([L3(an2, toe, 0.75), A(toe, [0.8, dl, -0.5])], 0.36, 0.3, skin, o);
    const kf = n3(S3(kn, L3(hip, an2, 0.5)));
    V.ell(A(kn, Mv(kf, 0.8)), 1.05, 1.05, 1, 'bone', o);
    V.cap([A(L3(kn, an2, 0.15), Mv(kf, 0.8)), A(L3(kn, an2, 0.85), Mv(kf, 0.55))], 0.38, 0.32, 'bone', o);
  };
  const arm = (sh, hand, side, far) => {
    const [el, wr] = zIK(sh, hand, 8.2, 8.1, [-1, side * 0.35, 0.1]), o = far ? dim : {};
    V.cap([sh, L3(sh, el, 0.5), el], [1.35, 1.15, 0.95], null, skin, o);
    V.cap([el, L3(el, wr, 0.5), wr], [0.95, 0.85, 0.72], null, skin, o);
    V.ell(A(el, n3(S3(el, L3(sh, wr, 0.5)))), 0.85, 0.85, 0.8, 'bone', o);
    const ad = n3(S3(wr, el)); let fw = n3(zV.x(ad, lat)); if (fw[0] < 0) fw = Mv(fw, -1);
    const palm = A(wr, Mv(ad, 1.4));
    V.cap([wr, palm], 0.85, 0.95, skin, o);
    for (let i = 0; i < 3; i++) {
      const sd = (i - 1), base = A(palm, A(Mv(lat, sd * 0.55), Mv(ad, 0.3)));
      const d1 = n3(A(A(ad, Mv(lat, sd * (0.18 + J.spread * 0.45))), Mv(fw, 0.15 + J.spread * 0.4))), f1 = A(base, Mv(d1, 2.3));
      const d2 = n3(A(Mv(d1, 0.5), Mv(fw, 0.9 - J.spread * 0.3))), f2 = A(f1, Mv(d2, 1.9));
      V.cap([base, f1], 0.42, 0.34, skin, o); V.cap([f1, f2], 0.3, 0.14, 'bone', o);
    }
    V.cap([A(palm, Mv(lat, -side * 0.8)), A(palm, A(Mv(lat, -side * 1.2), Mv(fw, 1.4)))], 0.34, 0.2, 'bone', o);   // the thumb's hook
    return { el, wr, palm, ad };
  };
  // ---- far limbs first
  arm(shF, J.hF, -1, true);
  leg(hipF, J.fF, J.lF, true);
  // ---- the body
  const tids = new Set(), vs = []; for (let i = 0; i <= 12; i++) vs.push(i / 12);
  tids.add(V.cap(vs.map(B), vs.map(v => rr(v)), null, skin));
  tids.add(V.ell(A(J.Pv, [-0.6, 0, -0.4]), 3.9, 3.9, 3.6, skin));                                            // the pelvis and rump
  tids.add(V.cap([shF, J.S, shN], [2.3, 2.9, 2.3], null, skin));                                              // the shoulder girdle
  tids.add(V.ell(shN, 2.1, 2.1, 2, skin));
  // ribs showing through the skin of the flank
  for (const v of [0.46, 0.56, 0.66]) for (let a = 0.7; a < 1.9; a += 0.06) V.mark(onS(v, a, 0.05), skin, { dk: 0.55, ids: tids });
  // the shoulder blades winging out, a groove under each
  for (const side of [1, -1]) {
    const c0 = onS(0.9, side * 0.55, 0.15);
    V.plate([A(c0, Mv(T(0.9), 1.2)), A(onS(0.92, side * 1.05, 0.2), Mv(T(0.9), 0.4)), A(onS(0.74, side * 1.0, 0.25), [0, 0, 0]), A(onS(0.72, side * 0.45, 0.3), [0, 0, 0])], skin, { bevel: 1.4, bulge: 0.55, dk: side < 0 ? 0.12 : 0 });
  }
  // the spine's knuckles standing proud along the ridge
  for (let v = 0.08; v < 1.02; v += 0.085) if (Math.abs(v - 0.5) > 0.06) V.ell(onS(v, 0, 0.05), 0.8, 0.8, 0.75, 'bone');
  // ---- the mantle over the rump: a rotten rag laid over the back behind the hump, hanging down both sides in tatters
  {
    const vA = 0.36, vB = -0.4;
    const ax = v => v >= 0 ? B(v) : A(B(0), A(Mv(n3(S3(B(0), B(0.12))), -v * 8.5), [0, 0, v * 3.5]));
    const Dm = v => v >= 0 ? Dv(v) : n3(L3(Dv(0), [-0.5, 0, 1], Math.min(1, -v * 1.5)));
    const Rm = v => (v >= 0 ? rr(v) : rr(0) * (1 + v * 0.35)) + 0.75;
    V.surf((s, t) => {
      const v = vA + (vB - vA) * s, a = t * 2 - 1, R = Rm(v), wrap = Math.PI / 2 * R;
      const jag = 2.6 * Math.pow(Math.max(0, Math.sin(s * 31 + a * 4 + 1)), 3) + 2.2 * zH(Math.floor(s * 14), a > 0 ? 3 : 5) + (s < 0.12 ? (0.12 - s) * 30 : 0);
      const hang = Math.max(0.5, (2.2 + (vA - v) * 6.5 - jag) * (a > 0 ? 0.75 : 1)), q = Math.abs(a) * (wrap + hang), sg = a < 0 ? -1 : 1;
      if (q > wrap + 1.2 && zH(Math.floor(s * 19), Math.floor(t * 12) + 40) > 0.94) return null;          // a hole rotted through
      const fo = 0.32 * Math.sin(v * 26 + a * 3.1) * Math.min(1, q / 3), R2 = R + fo;
      if (q <= wrap) { const ph2 = q / R2; return A(ax(v), A(Mv(Dm(v), Math.cos(ph2) * R2), Mv(lat, sg * Math.sin(ph2) * R2))); }
      const h = q - wrap;
      return A(ax(v), A(Mv(lat, sg * (R2 + h * 0.14)), [J.cloth * 0.22 * h - Math.sin(v * 9) * 0.3 * h * 0.2, 0, -h]));
    }, 44, 36, 'rag', { inside: 0.5, su: 36, sv: 24 });
    // the rope belt knotted over it, its ends hanging
    const bv = 0.14, bc = B(bv), bt = T(bv);
    V.cap(V.ring(bc, bt, rr(bv) + 1.05, 18, 0, Math.PI * 2, Dv(bv)), 0.48, 0.48, 'rope');
    const kn = A(bc, A(Mv(lat, rr(bv) + 1.1), Mv(Dv(bv), -0.8)));
    V.ell(kn, 0.8, 0.8, 0.7, 'rope');
    V.cap([kn, A(kn, [0.3 + J.cloth * 0.15, 0.4, -2.2]), A(kn, [0.1 + J.cloth * 0.3, 0.5, -4.2])], 0.36, 0.3, 'rope');
    V.cap([kn, A(kn, [-0.6 + J.cloth * 0.2, 0.3, -1.6]), A(kn, [-0.9 + J.cloth * 0.35, 0.4, -3])], 0.34, 0.28, 'rope');
    if (drown) for (let i = 0; i < 4; i++) { const p0 = A(ax(0.3 - i * 0.18), A(Mv(lat, (i % 2 ? -1 : 1) * (Rm(0.3 - i * 0.18) + 0.2)), [0, 0, -3])); V.cap([p0, A(p0, [0.4 + J.cloth * 0.2, 0.2, -2.5]), A(p0, [0.1 + J.cloth * 0.4, 0.3, -5 - (i % 2) * 1.5])], 0.35, 0.22, 'weed'); }
  }
  // ---- the rag round the neck: the fallen hood, a thick twist of cloth, one end down the back
  {
    const nd = n3(S3(J.Hd, J.S)), nc = A(J.S, Mv(nd, 1.8));
    V.cap(V.ring(nc, nd, 2.05, 14, 0, Math.PI * 2, up), 1.05, 1.05, 'rag');
    const bk = A(nc, Mv(Dv(1), 2.2));
    V.plate([A(bk, Mv(lat, 1.4)), A(bk, Mv(lat, -1.4)), A(bk, [-2 + J.cloth * 0.3, -1.1, -3.6]), A(bk, [-1.6 + J.cloth * 0.4, 0.2, -4.6]), A(bk, [-1.8 + J.cloth * 0.3, 1.2, -3.4])], 'rag', { bevel: 0.8, bulge: 0.4 });
  }
  // ---- the chest split open on the near flank: black inside, the god's blood smouldering in a cage of broken ribs
  {
    const vc = 0.8, dirC = n3(A(A(Mv(Dv(vc), -0.3), Mv(lat, 0.9)), Mv(T(vc), 0.1))), P = A(B(vc), Mv(dirC, rr(vc)));
    V.markEll(P, 2.1, 2.5, 'ink', { ids: tids, eps: 3 });
    const em = J.emb;
    V.markEll(A(P, [0, 0, -0.3]), 1.25, 1.5, 'emb', { ids: tids, eps: 3, emf: q => Math.max(0.2, em * (1.05 - q * 0.75)) });
    for (let j = 0; j < 4; j++) {
      const v = 0.68 + j * 0.068, a1 = [2.55, 2.05, 2.45, 1.85][j], pts = []; for (let a = 0.55; a <= a1; a += 0.14) pts.push(onS(v - (a - 0.5) * 0.03, a, 0.3));
      V.cap(pts, 0.44, 0.34, 'bone');
      if (j === 1) V.cap([pts[pts.length - 1], A(pts[pts.length - 1], [0.4, 0.4, -1.2])], 0.3, 0.22, 'bone');   // a snapped rib hanging
    }
    V.light(A(P, Mv(dirC, 1.2)), 8.5, 0.5 * em, '#ff4a26');
    if (J.dead == null || J.dead < 2) V.cap([A(P, [0.3, 0.6, -2.2]), A(P, [0.3, 0.7, -3.4 - (J.ph % 2) * 0.6])], 0.3, 0.2, 'emb', { em: 0.3 });   // a drip
  }
  // ---- the candle stuck in the hump with its own wax
  {
    const cv = 0.5, dir = n3(L3(up, Dv(cv), 0.35));
    let base = A(B(cv), Mv(Dv(cv), rr(cv) - 0.2)), cd = dir;
    const onGround = J.candle === 0;
    if (onGround) { base = A(J.Pv, [-5, 4.2, 1.2]); cd = n3([-0.35, 0.25, 0.05]); }
    else if (J.candle < 1) cd = n3(L3(dir, [-0.8, 0.4, 0.3], 0.5));
    const top = A(base, Mv(cd, 5.1));
    if (!onGround) {
      V.ell(A(base, Mv(Dv(cv), 0.2)), 2.4, 2.2, 0.9, 'wax');
      for (const [dl, dv] of [[1.5, 0.07], [-1.3, 0.1], [0.4, -0.08]]) V.cap([A(base, Mv(lat, dl * 0.8)), onS(cv - dv, dl * 0.28, 0.25), onS(cv - dv * 1.7, dl * 0.3, 0.2)], 0.5, 0.3, 'wax');
    }
    V.cap([base, top], 1.3, 1.05, 'wax');
    V.cap([A(top, A(Mv(cd, -0.4), Mv(lat, 0.95))), A(top, A(Mv(cd, -2.8), Mv(lat, 1.05)))], 0.42, 0.34, 'wax');
    V.cap([A(top, A(Mv(cd, -0.3), Mv(lat, -0.8))), A(top, A(Mv(cd, -1.6), Mv(lat, -0.95)))], 0.36, 0.3, 'wax');
    V.cap([top, A(top, Mv(cd, 0.75))], 0.26, 0.22, 'ink');
    if (!drown && !onGround && J.candle > 0) {
      const f = J.fl * 0.35, sm = J.candle < 1 ? 0.6 : 1, fc = A(top, Mv(cd, 1.9 * sm));
      V.cap([A(top, Mv(cd, 0.7)), A(top, A(Mv(cd, 1.8 * sm), [f * 0.5, 0, 0])), A(top, A(Mv(cd, 3.4 * sm), [f - 0.3 * J.cloth, 0, 0]))], [0.95 * sm, 0.75 * sm, 0.2], null, 'flame', { em: 0.5 });
      V.markEll(A(top, Mv(cd, 1.35 * sm)), 0.45, 0.8 * sm, 'flame', { eps: 4, emf: q => 1 - q * 0.25 });
      V.light(fc, 15, 0.5 * sm, '#ffa850');
    }
  }
  // ---- the neck and the head: skin shrunk back off the face, the skull bared, the jaw hanging off its hinge
  {
    const hd = J.hdir, H = J.Hd, side = n3(zV.x(up, hd)), hu = n3(zV.x(hd, side)), latH = Mv(side, -1);   // latH: the near side of the head
    const nk0 = A(J.S, Mv(n3(S3(H, J.S)), 0.8)), nk1 = S3(H, Mv(hd, 1.6));
    V.cap([nk0, L3(nk0, nk1, 0.5), nk1], [1.55, 1.3, 1.15], null, skin);
    V.ell(A(L3(nk0, nk1, 0.45), Mv(hu, 1.2)), 0.6, 0.6, 0.55, 'bone'); V.ell(A(L3(nk0, nk1, 0.8), Mv(hu, 1)), 0.55, 0.55, 0.5, 'bone');
    const cran = A(H, A(Mv(hd, -0.5), Mv(hu, 0.35)));
    V.ell(cran, 2.75, 2.7, 2.6, skin);
    const face = A(H, A(Mv(hd, 1.05), Mv(hu, -0.15)));
    V.ell(face, 1.95, 2.0, 1.9, 'bone');
    V.cap([A(face, A(Mv(hu, 0.95), Mv(latH, 1.3))), A(face, A(Mv(hu, 1.15), Mv(hd, 0.7))), A(face, A(Mv(hu, 0.95), Mv(latH, -1.3)))], 0.55, 0.55, 'bone');   // the brow ridge
    // where the skin ends: a ragged edge across the cheek
    for (let a = -1; a <= 1; a += 0.12) V.mark(A(cran, A(Mv(hd, 1.1 + 0.3 * Math.sin(a * 7)), A(Mv(hu, a * 1.9), Mv(latH, 1.6)))), skin, { dk: 0.5 });
    const eye = A(face, A(A(Mv(hd, 1.25), Mv(hu, 0.25)), Mv(latH, 0.85)));
    V.markEll(eye, 0.75, 0.7, 'ink', { eps: 3 }); V.markEll(eye, 0.4, 0.4, 'emb', { eps: 3, emf: () => Math.min(1, 0.55 + J.emb * 0.45) });
    V.markEll(A(face, A(A(Mv(hd, 1.35), Mv(hu, 0.25)), Mv(latH, -0.85))), 0.6, 0.6, 'ink', { eps: 3 });
    V.markEll(A(face, A(Mv(hd, 1.85), Mv(hu, -0.55))), 0.45, 0.4, 'ink', { eps: 3 });                          // the nose-hole
    const jw = J.jaw, hN2 = A(H, A(A(Mv(hd, 0.1), Mv(hu, -1.1)), Mv(latH, 1.5))), hF2 = A(H, A(A(Mv(hd, 0.1), Mv(hu, -1.1)), Mv(latH, -1.5))), chin = A(H, A(Mv(hd, 2.1 - jw * 0.2), Mv(hu, -1.7 - jw * 0.85)));
    V.ell(A(H, A(Mv(hd, 1.5), Mv(hu, -1.3 - jw * 0.35))), 1.1, 0.4 + jw * 0.35, 0.8, 'ink');                     // the open mouth
    V.cap([hN2, chin, hF2], 0.55, 0.55, 'bone');
    for (let i = -1; i <= 1; i++) V.dot(A(H, A(A(Mv(hd, 2.2), Mv(hu, -1.2)), Mv(latH, i * 0.5))), i ? '#bcae88' : '#e4d6b0');   // the upper teeth
    for (let i = 0; i < 4; i++) {                                                                              // lank hair from the crown
      const b0 = A(cran, A(A(Mv(hd, -0.9 + i * 0.25), Mv(hu, 2)), Mv(latH, (i - 1.5) * 0.9))), dr = [-0.9 - J.cloth * 0.15 + J.loll * 0.3, 0, -1];
      V.cap([b0, A(b0, A(Mv(dr, 2.5), [-0.4, 0, 0])), A(b0, A(Mv(dr, 5 + (i % 2) * 1.8), [-0.2, 0, 0]))], 0.45, 0.28, 'hair');
    }
  }
  // ---- near leg, near arm (knuckles at the knee)
  leg(hipN, J.fN, J.lN, false);
  const aN = arm(shN, J.hN, 1, false);
  if (drown) for (const t of [0.35, 0.7]) { const p0 = L3(shN, aN.el, t); V.cap([p0, A(p0, [0.3, 0.3, -2]), A(p0, [0.1, 0.4, -3.8])], 0.3, 0.2, 'weed'); }
}
function huskFrame(pose, ph, view, tint) {
  const drown = tint === HUSK_DROWNED, MT = zsMats('husk', HUSK_M, tint, 0.45);
  const S = zsSculpt(HUSK.W * 1.5, HUSK.H * 1.5, MT), V = zsView(S, HUSK, view), J = huskRig(pose, ph);
  huskPaint(V, J, drown);
  const hr = S.render({ amb: 0.09 });
  if (J.smear) {
    // the rake of the claws: three streaks from where the hand came from
    const hand = J.smear.hand === 'N' ? J.hN : J.hF, lines = [];
    for (let i = -1; i <= 1; i++) { const o = [0, i * 0.7, i * 0.9]; lines.push([zV.a(J.smear.from, o), zV.a(J.smear.via, o), zV.a(hand, zV.a(o, [1.5, 0, -1.5]))].map(p => V.C(p))); }
    zsSmear(hr, lines, ['#3a3430', '#8a7e68', '#d8ccb0'], 1);
  }
  return hr;
}

// ------------------------------------------------------------------- THE GRAVEBLOAT (bloat)
// A corpse that is nothing but its stomach: a distended sack of stretched grey-violet skin, shining wet where it is
// tightest, sewn shut with a Y autopsy seam and a square of sewn-on hide, bloat-veins under the skin, tumours on its
// back. It walks on what is left of its body: two bent human legs behind and its two arms in front, knuckles down.
// The small head lolls off the front on a slack neck, eyes rolled up; it is that mouth the bile comes out of.
// Wind: it swells and the veins flush red, bile bubbling at the lips. Attack: a jet of bile. Death: it sags open.
const BLOAT = { W: 72, H: 66, ox: 31, oy: 55 };
const BLOAT_M = {
  gut: { r: ['#0b0812', '#15101e', '#201a2b', '#2c2438', '#3a3045', '#4a3e52', '#5c4f60', '#6f6070', '#83727c', '#9a8a8c'], tex: 0.12, ts: 0.45, spec: 0.018, specC: zHx('#e8e2da'), rim: 0.5, gain: 0.9, rimC: zHx('#8c9cb0') },
  skin: { r: ['#0d0b12', '#1a161e', '#29232a', '#3a3234', '#4e4540', '#655a4c', '#7e7258', '#9a8c66'], tex: 0.1, ts: 0.55, rim: 0.45 },
  head: { r: ['#100b10', '#211a1f', '#342b2e', '#4a3f3d', '#62564c', '#7c6f5c', '#998a70', '#b8a888'], tex: 0.08, ts: 0.6, rim: 0.45, gain: 1.1 },
  hide: { r: ['#0e0a08', '#1e1510', '#312217', '#46321f', '#5c4329', '#745634', '#8e6c44'], tex: 0.25, ts: 0.9, tk: 0.25 },
  lip: { r: ['#140308', '#2c0a14', '#48121f', '#66202c', '#86323a', '#a84c4c', '#cc7466'], tex: 0.06, spec: 0.04, tk: 0.25 },
  vein: { r: ['#080310', '#12061e', '#1e0c2c', '#2a1238', '#3a1a48'], tex: 0, tk: 0.2 },
  veinH: { r: ['#2a040c', '#520a18', '#7e1424', '#aa2432', '#d84848'], tex: 0, tk: 0 },
  thread: { r: ['#2a2014', '#5a4a30', '#8c7a54', '#c0ae84', '#e8dcb4'], tex: 0, tk: 0.1 },
  ink: { r: ['#050306', '#0a060a', '#110a10'], tex: 0, tk: 0 },
  bone: { r: ['#120e14', '#241e22', '#3a322e', '#554939', '#72634a', '#918060', '#b09d76', '#cbb88c', '#e2d2a6'], tex: 0.06, tk: 0.15 },
  bile: { r: ['#121406', '#262c0a', '#3e4a10', '#5c6c18', '#7e9024', '#a2b236', '#c8d25a', '#eef09a'], tex: 0.05, spec: 0.06, tk: 0, rim: 0.3 },
  eye: { r: ['#6a6468', '#a09a98', '#d4cec8', '#f0ece4'], tex: 0, tk: 0 },
};
const BLOAT_PH = { idle: 4, walk: 8, wind: 3, atk: 3, hit: 2, death: 4 };
function bloatRig(pose, ph) {
  const J = { C: [1, 0, 16], rf: 14, rl: 12, ru: 9.4, sag: 1.8, loll: 0, mo: 0.5, hot: 0, vomit: -1, bub: 0,
    legs: [[-7, 4, 0, 0], [-7, -4, 0, 0], [10, 6, 0, 0], [10, -6, 0, 0]], head: [16.5, 2.2, 13.5], dead: null, sq: 0 };
  if (pose === 'idle') { const k = ph % 4, br = [0, 0.5, 1, 0.5][k]; J.rl += br * 0.4; J.rf += br * 0.3; J.ru += br * 0.25; J.loll = br; J.C[2] += br * 0.2; }
  else if (pose === 'walk') {
    const t = ph / 8 * Math.PI * 2, s = Math.sin(t), c = Math.cos(t);
    J.C = [1 + 0.4 * s, 0.6 * c, 16 - 0.8 * Math.abs(c)]; J.loll = 1.5 * Math.sin(t - 0.8); J.head = [16.5 + 0.4 * s, 2.2 + 0.8 * c, 13.3 - 0.5 * Math.abs(s)];
    // a diagonal gait: rear near with front far
    const st = (q, len) => [len * Math.sin(q), Math.max(0, Math.cos(q)) * 1.8];
    const a = st(t, 3.2), b = st(t + Math.PI, 3.2);
    J.legs = [[-7 + a[0], 4, a[1]], [-7 + b[0], -4, b[1]], [10 + b[0], 6, b[1]], [10 + a[0], -6, a[1]]];
    J.sq = 0.3 * Math.cos(2 * t);
  } else if (pose === 'wind') {
    const kw = [0.4, 0.75, 1][ph % 3];
    J.rf += 1.6 * kw; J.rl += 1.6 * kw; J.ru += 1.8 * kw; J.C[2] += 0.8 * kw; J.hot = kw; J.mo = 0.5 + kw * 1.1; J.loll = -2 * kw; J.bub = ph % 3 + 1; J.head = [17 + kw, 2.2, 14.5 + kw * 1.5];
  } else if (pose === 'atk') {
    const k = ph % 3;
    J.rf += [2.2, 1, 0.2][k]; J.ru += [-1.6, -0.6, 0][k]; J.rl += [0.8, 0.3, 0][k]; J.C = [1 + [1.2, 2, 0.5][k], 0, 16 - [1.4, 0.8, 0][k]]; J.mo = [2.2, 2.4, 1.1][k]; J.hot = [0.8, 0.5, 0.2][k];
    J.head = [[18.5, 2.2, 13], [19.5, 2.2, 12], [17.5, 2.2, 13]][k]; J.loll = [2, 3, 1.5][k]; J.vomit = k;
    J.legs[2][0] += 1.5; J.legs[3][0] += 1.5;
  } else if (pose === 'hit') {
    const k = ph % 2; J.rf += [-1.4, 0.8][k]; J.ru += [1.4, -0.6][k]; J.rl += [0.8, -0.3][k]; J.C = [[-0.8, 0, 17], [0.4, 0, 16.2]][k]; J.head = [[15, 2.2, 17.5], [16.3, 2.2, 14.5]][k]; J.loll = [-3, 1][k]; J.mo = 1.8; J.hot = 0.4;
  } else if (pose === 'death') {
    const k = ph % 4, K = [0.25, 0.55, 0.85, 1][k];
    J.C = [1 + K * 1.5, 0, 16 - K * 9.5]; J.ru = 9.4 - K * 4; J.rf = 14 + K * 3; J.rl = 12 + K * 3; J.sag = 1 + K * 1.5;
    J.head = [16.5 + K * 4, 2.2 + K * 2, Math.max(3.8, 13.5 - K * 11)]; J.loll = 2 + K * 2; J.mo = 1.5 + K;
    J.legs = [[-7 - K * 5, 4 + K * 3, 0], [-7 - K * 5, -4 - K * 2, 0], [10 + K * 3, 6 + K * 4, 0], [10 + K * 3, -6 - K * 3, 0]]; J.dead = k;
  }
  J.pose = pose; J.ph = ph; return J;
}
function bloatPaint(V, J) {
  const A = zV.a, Mv = zV.m, S3 = zV.s, n3 = zV.n, L3 = zV.lp, lat = [0, 1, 0], up = [0, 0, 1];
  const C = J.C, dim = { dk: 0.2 };
  // the sack as a function of longitude (around the vertical, 0 = forward) and latitude: it sags, the belly pooled forward
  const sackP = (lo, la, dr) => {
    const cl = Math.cos(la), sl = Math.sin(la), low = Math.max(0, -sl), bulge = 1 + 0.13 * low * J.sag;
    const rf = J.rf * bulge + (dr || 0), rl = J.rl * bulge * (1 + J.sq * 0.05) + (dr || 0), ru = J.ru * (sl < 0 ? 1.05 : 1 - J.sq * 0.05) + (dr || 0);
    return [C[0] + Math.cos(lo) * cl * rf + low * low * 2.2 * J.sag + (J.dead != null ? low * 2 : 0), C[1] + Math.sin(lo) * cl * rl, C[2] + sl * ru - low * low * 0.8 * (J.sag - 1)];
  };
  // ---- limbs under it: far pair first
  const leg = (hip, ft, lift, far) => {
    const an = A(ft, [0, 0, 1.2 + lift]), [kn, a2] = zIK(hip, an, 8.2, 8, [1, 0, 0.1]), o = far ? dim : {};
    V.cap([hip, kn], 2.7, 1.9, 'skin', o); V.cap([kn, a2], 1.6, 1.1, 'skin', o);
    V.cap([A(a2, [-0.6, 0, -0.3]), A(a2, [2.4, 0, -1 - lift * 0.2])], 0.95, 0.65, 'skin', o);
    V.ell(A(kn, [0.8, 0, 0.2]), 1.1, 1.1, 1, 'bone', o);
  };
  const arm = (sh, ft, lift, far) => {
    const hd = A(ft, [0, 0, 1.3 + lift]), [el, wr] = zIK(sh, hd, 7.4, 7.2, [-1, 0, 0.2]), o = far ? dim : {};
    V.cap([sh, el], 1.8, 1.35, 'skin', o); V.cap([el, wr], 1.3, 0.95, 'skin', o);
    V.ell(A(el, [-0.7, 0, 0]), 0.85, 0.85, 0.8, 'bone', o);
    for (let i = -1; i <= 1; i++) V.cap([wr, A(wr, [1.1, i * 0.55, -0.9]), A(wr, [2.3, i * 0.7, -1.2 - lift * 0.3])], 0.5, 0.36, 'skin', o);   // the knuckles, the fingers curled under
  };
  const legPts = J.legs.map(l => [[l[0], l[1], 0], l[2] || 0]);
  const hipOf = i => { const l = J.legs[i]; return i < 2 ? A(C, [-7.5, l[1] * 0.9, -J.ru * 0.6]) : A(C, [8.8, l[1] * 0.95, -J.ru * 0.35]); };
  if (!V.back) { leg(hipOf(1), ...legPts[1], true); arm(hipOf(3), ...legPts[3], true); }
  else { leg(hipOf(1), ...legPts[1], true); arm(hipOf(3), ...legPts[3], true); }
  // ---- tumours on the back, then the sack
  const tum = [[2.7, 0.9, 2.2, 3.8], [3.2, 0.3, 1.4, 2.4], [2.4, -0.2, 1.8, 2.8], [3.7, 0.7, 2.6, 2]];
  const sid = V.surf((s, t) => sackP(s * Math.PI * 2, -Math.PI / 2 + t * Math.PI), 56, 30, 'gut', { su: 60, sv: 30 });
  for (const [lo, la, r, h] of tum) { const p = sackP(lo, la, -0.6); V.ell(p, r, r, r * 0.9, 'gut'); }
  const ids = new Set([sid]);
  // bloat-veins branching under the skin, flushing red as it swells
  const vm = J.hot > 0.5 ? 'veinH' : 'vein';
  const vein = (lo, la, steps, seed) => { let a = lo, b = la; for (let i = 0; i < steps; i++) { const a2 = a + (zH(seed, i) - 0.5) * 0.35, b2 = b + (zH(seed + 7, i) - 0.45) * 0.28; V.markLine(sackP(a, b, 0.1), sackP(a2, b2, 0.1), vm, { ids, eps: 2.5 }); if (i === 2) { const a3 = a2 + 0.3, b3 = b2 - 0.2; V.markLine(sackP(a2, b2, 0.1), sackP(a3, b3, 0.1), vm, { ids, eps: 2.5 }); } a = a2; b = b2; } };
  for (let i = 0; i < 11; i++) vein(zH(i, 3) * 6.28, -0.2 + zH(i, 9) * 1.1, 6, i * 13 + 1);
  // stretch marks fanning over the swell, the fold where the belly sags
  for (let i = 0; i < 6; i++) { const lo = 0.6 + i * 0.22; V.markLine(sackP(lo, 0.25), sackP(lo + 0.05, -0.12), 'gut', { ids, dk: 0.35, eps: 2.5 }); }
  for (let lo = -1.2; lo <= 1.6; lo += 0.05) V.mark(sackP(lo, -0.72), 'gut', { ids, dk: 0.7, eps: 2.5 });
  // the autopsy seam: a Y cut from the shoulders to the breastbone and down the belly, stitched shut with coarse thread
  const suture = (p0, p1) => {
    const n = 7, L2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; for (let i = 0; i < n; i++) { const a = [L2(p0, p1, i / n), L2(p0, p1, (i + 1) / n)]; V.markLine(sackP(a[0][0], a[0][1], 0.15), sackP(a[1][0], a[1][1], 0.15), 'ink', { ids, eps: 3 }); }
    for (let i = 0.5; i < n; i++) { const q = L3(p0, p1, i / n), dl = [-(p1[1] - p0[1]), p1[0] - p0[0]], dn = Math.hypot(dl[0], dl[1]) || 1, e = 0.07; V.mark(sackP(q[0] - dl[0] / dn * e, q[1] - dl[1] / dn * e, 0.3), 'thread', { ids, eps: 3 }); V.mark(sackP(q[0] + dl[0] / dn * e, q[1] + dl[1] / dn * e, 0.3), 'thread', { ids, eps: 3, dk: 0.4 }); }
    if (J.hot > 0.7) for (let i = 1; i < n; i += 2) { const q = L3(p0, p1, i / n); V.mark(sackP(q[0], q[1], 0.2), 'veinH', { ids, eps: 3 }); }
  };
  const Y0 = [0.75, 0.3];
  suture([0.45, 0.95], Y0); suture([1.3, 0.85], Y0); suture(Y0, [0.8, -0.45]); suture([0.8, -0.45], [0.7, -0.95]);
  // the square of hide sewn over a split in the flank
  { const c0 = [1.75, 0.05], pts = [[-0.22, 0.2], [0.24, 0.24], [0.26, -0.24], [-0.2, -0.26]].map(d => sackP(c0[0] + d[0], c0[1] + d[1], 0.35));
    V.plate(pts, 'hide', { bevel: 1, bulge: 0.35 }); for (let i = 0; i < 4; i++) { const a = pts[i], b = pts[(i + 1) % 4]; for (let k = 0.2; k < 1; k += 0.3) V.dot(L3(a, b, k), k > 0.5 ? '#c8b88c' : '#8c7a56'); } }
  // pustules weeping bile
  for (const [lo, la] of [[1.9, 0.2], [0.9, -0.35], [2.7, 0.5], [4.2, 0.3]]) { const p = sackP(lo, la, 0.2); V.ell(p, 0.9, 0.9, 0.6, 'bile'); V.cap([p, A(p, [0.1, 0.1, -1.4 - (J.ph % 2) * 0.5])], 0.35, 0.25, 'bile'); }
  // a loop of gut hanging from the underside, swinging
  { const sw = J.pose === 'walk' ? Math.sin(J.ph / 8 * 6.28 - 1) * 1.5 : 0, g0 = sackP(0.6, -1.05), g2 = sackP(1.25, -1.0); V.cap([g0, A(L3(g0, g2, 0.5), [sw, 0.3, -3]), g2], 0.85, 0.7, 'lip', { dk: 0.25 }); }
  // ---- the head lolling off the front on a slack neck
  let M;
  {
    const nb = sackP(0.3, 0.35, -1.5), H = A(A(J.head, [-1.3, 0, -1.7]), [0, 0, J.loll * 0.5]), hd = n3([1, 0.55, -0.25 - J.loll * 0.12]), hu = n3(zV.x(hd, zV.n(zV.x(up, hd)))), side = n3(zV.x(up, hd)), lt = Mv(side, -1);
    V.cap([nb, L3(nb, H, 0.5), S3(H, Mv(hd, 1.5))], [2.1, 1.6, 1.3], null, 'head');
    V.cap([A(nb, [0, 1.1, -0.4]), A(S3(H, Mv(hd, 1.6)), [0, 0.8, -0.6])], 0.45, 0.4, 'head', { dk: 0.35 });          // the cords of the neck
    V.ell(A(H, Mv(hu, 0.3)), 3, 2.9, 2.8, 'head');
    V.cap([A(H, A(Mv(hu, 1.1), Mv(lt, 1.2))), A(H, A(Mv(hu, 1.3), Mv(hd, 1.9))), A(H, A(Mv(hu, 1.1), Mv(lt, -1.2)))], 0.5, 0.5, 'head');   // the brow
    for (const s of [1, -1]) { const e = A(H, A(A(Mv(hd, 2.7), Mv(hu, 0.5)), Mv(lt, s * 1.0))), q = V.C(e); V.S.dot(q[0], q[1], s > 0 ? '#e6e0d6' : '#a8a098'); V.S.dot(q[0] + 1, q[1], s > 0 ? '#c8c0b4' : '#7a726c'); V.S.dot(q[0], q[1] - 1, '#1a1216'); V.S.dot(q[0] + 1, q[1] - 1, '#1a1216'); }   // eyes rolled white
    V.ell(A(H, A(Mv(hd, 2.5), Mv(hu, -0.4))), 0.55, 0.5, 0.5, 'head');                                            // the nose
    const mo = J.mo, jaw = A(H, A(Mv(hd, 1.6), Mv(hu, -1.5 - mo * 0.7)));
    { const q = V.C(A(H, A(Mv(hd, 2.7), Mv(hu, -1.1)))); for (let yy = 0; yy <= Math.round(mo * 1.2); yy++) for (let xx = -1; xx <= 1; xx++) V.S.dot(q[0] + xx, q[1] + yy, yy === 0 && xx ? '#2a0a0e' : '#0a0406'); }
    V.cap([A(H, A(Mv(hu, -0.9), Mv(lt, 1.6))), jaw, A(H, A(Mv(hu, -0.9), Mv(lt, -1.6)))], 0.7, 0.7, 'head');
    for (let i = -1; i <= 1; i++) V.dot(A(H, A(A(Mv(hd, 2.45), Mv(hu, -0.95)), Mv(lt, i * 0.5))), i ? '#b8ac8c' : '#e2d8bc');
    M = A(H, A(Mv(hd, 2.4), Mv(hu, -1.3 - mo * 0.4)));
  }
  // bile leaking from the slack mouth, bubbling as it swells
  if (J.vomit < 0 && J.dead == null) { const d = J.ph % 4; V.cap([M, A(M, [0.2, 0, -1.2 - d * 0.5])], 0.45, 0.3, 'bile'); if (d > 1) V.ell(A(M, [0.3, 0, -3 - d * 0.6]), 0.4, 0.5, 0.4, 'bile'); }
  if (J.bub) for (let i = 0; i < J.bub; i++) { const r = 0.6 + i * 0.35, p = A(M, [1.3 + i * 1.2, 0.2, 1 + i * 1.6]); V.ell(p, r, r, r, 'bile'); }
  // the jet: bile vomited forward, falling, spattering
  if (J.vomit >= 0 && J.vomit < 2) {
    const o = M, P = J.vomit === 0 ? [o, A(o, [3.5, 0, 0.8]), A(o, [6.5, 0, -0.6])] : [o, A(o, [5, 0, 1]), A(o, [10, 0, -1]), A(o, [14, 0, -6]), [o[0] + 16, o[1], 0.5]];
    V.cap(P, J.vomit ? [1.3, 1.9, 1.7, 1.3, 1] : [1.2, 1.5, 1.1], null, 'bile');
    for (let i = 0; i < 9; i++) { const k = zH(i, J.vomit + 3), p = L3(P[1], P[P.length - 1], k); V.ell(A(p, [(zH(i, 8) - 0.5) * 3, (zH(i, 9) - 0.5) * 3, (zH(i, 5) - 0.5) * 4]), 0.45, 0.45, 0.4, 'bile'); }
    if (J.vomit === 1) for (let i = 0; i < 5; i++) V.ell([o[0] + 13 + i * 1.6, o[1] + (zH(i, 2) - 0.5) * 4, 0.3], 1.4, 0.7, 0.3, 'bile');
  }
  if (J.vomit === 2) { V.cap([M, A(M, [0.8, 0, -4]), [M[0] + 1, M[1], 0.4]], 0.6, 0.4, 'bile'); for (let i = 0; i < 4; i++) V.ell([M[0] + 4 + i * 2.5, M[1] + (i % 2) * 1.5, 0.2], 1.5, 0.7, 0.3, 'bile'); }
  if (J.dead != null) V.ell([C[0] + 3, C[1], 0.1], 6 + J.dead * 2.5, 3 + J.dead, 0.3, 'bile');   // the bile pooling out
  // ---- near limbs
  leg(hipOf(0), ...legPts[0], false); arm(hipOf(2), ...legPts[2], false);
}
function bloatFrame(pose, ph, view, tint) {
  const MT = zsMats('bloat', BLOAT_M, tint, 0.45), S = zsSculpt(BLOAT.W * 1.5, BLOAT.H * 1.5, MT), V = zsView(S, BLOAT, view), J = bloatRig(pose, ph);
  bloatPaint(V, J);
  return S.render({ amb: 0.1 });
}

// ------------------------------------------------------------------- THE VEIN-WORM (worm; also the Mire Vein-Borer)
// An artery torn out of the dead god that goes on living: it rises out of a torn ring of earth with the god's blood
// pooled in it, a wet crimson tube of chambers pinched by rings of pale cartilage, the pulse travelling up it as a
// swelling, dark veins across it, and it ends in a round lamprey mouth ringed with hooked teeth and a collar of lip.
// Wind: it rears back and opens, the blood boiling in the pool. Attack: it strikes down and bites. Death: it goes
// limp and falls across the ground.
const WORM = { W: 54, H: 64, ox: 20, oy: 57 };
const WORM_M = {
  art: { r: ['#0c0308', '#1a0710', '#2b0d17', '#3e1520', '#521d27', '#682a30', '#7f3a3a', '#985048', '#b46c5c', '#cc8e78'], tex: 0.14, ts: 0.55, spec: 0.016, specC: zHx('#ffd8d0'), rim: 0.5, gain: 0.92, rimC: zHx('#8a90b0'), tk: 0.6 },
  artD: { r: ['#0a0208', '#16040e', '#240816', '#340c1e', '#461428', '#5a1c32'], tex: 0.1, ts: 0.6, tk: 0.6 },
  carti: { r: ['#16101a', '#2c2228', '#463a38', '#645448', '#86725c', '#a69072', '#c4ae8c', '#dccaa6'], tex: 0.1, ts: 0.9, crack: 0.02, tk: 0.3 },
  lip: { r: ['#10040a', '#220a12', '#36101a', '#4c1a22', '#64262c', '#7e3838', '#9a4e48', '#b86a5c'], tex: 0.06, spec: 0.04, specC: zHx('#ffd8cc'), tk: 0.5 },
  bone: { r: ['#120e14', '#2a2224', '#463c36', '#66584a', '#887860', '#aa987a', '#cab896', '#e6d8b8'], tex: 0.04, tk: 0.15 },
  ink: { r: ['#060204', '#0c0406', '#14080a'], tex: 0, tk: 0 },
  vein: { r: ['#0a0414', '#140a22', '#1e1030', '#2a163e'], tex: 0, tk: 0.3 },
  soil: { r: ['#070506', '#110c0b', '#1c1511', '#281e17', '#35291e', '#443426', '#554230'], tex: 0.25, ts: 0.9, tk: 0.35 },
  pool: { r: ['#120204', '#2a0408', '#44080e', '#620e14', '#84181c', '#a82a26'], tex: 0.03, spec: 0.06, specC: zHx('#ff9a80'), wrap: 0.2, tk: 0.5, rim: 0.2 },
  glow: { r: ['#2a0404', '#5a0906', '#961808', '#d0360f', '#f27025', '#ffae55', '#ffe4a0'], emis: true, glow: zHx('#a02418') },
};
const WORM_PH = { idle: 4, walk: 8, wind: 3, atk: 3, hit: 2, death: 4 };
function wormRig(pose, ph) {
  // the curve (model f, r, u): root in the earth, two controls, the head
  const J = { B: [0, 0, 0.5], C1: [-6.5, 0, 14], C2: [-1, 0, 44], H: [10, 5, 34], amp: 0.6, wph: 0, open: 0.45, pu: -1, boil: 0, dead: null, sway: 0 };
  if (pose === 'idle') { const k = ph % 4, b = Math.sin(k / 4 * 6.2832); J.H = [10 + b * 0.8, 5 + 0.3 * b, 34 + b * 0.7]; J.C2 = [-1 + b * 0.7, 0, 44]; J.open = 0.4 + 0.15 * (1 + b); J.wph = k / 4 * 6.2832; J.pu = k / 4; }
  else if (pose === 'walk') { const g = ph / 8 * 6.2832; J.H = [10 + Math.sin(g) * 3.5, 5 + Math.cos(g) * 1.5, 34 + Math.cos(g) * 1.4]; J.C1 = [-6.5 + Math.sin(g + 1) * 2.8, Math.sin(g) * 1.5, 14]; J.C2 = [-1 - Math.sin(g) * 2.8, -Math.cos(g) * 1.5, 44]; J.amp = 1.5; J.wph = g; J.pu = ph / 8; }
  else if (pose === 'wind') { const kw = [0.35, 0.7, 1][ph % 3]; J.H = [10 - 9 * kw, 4 + kw, 34 + 5.5 * kw]; J.C1 = [-5.5 - kw, 0, 14]; J.C2 = [-1 - 7 * kw, 0, 44 + 2.5 * kw]; J.open = 0.5 + 1 * kw; J.pu = [0.1, 0.45, 0.8][ph % 3]; J.boil = kw; }
  else if (pose === 'atk') { const k = ph % 3; J.H = [[18, 3, 33], [21, 2, 8.5], [13, 4, 23]][k]; J.C1 = [[-1, 0, 16], [-2, 0, 17], [-1, 0, 15]][k]; J.C2 = [[5, 0, 48], [17, 0, 45], [7, 0, 43]][k]; J.open = [1.6, 1.7, 0.8][k]; J.amp = 0.2; J.strike = k === 1; J.smear = k === 0 || k === 1 ? k : -1; }
  else if (pose === 'hit') { const k = ph % 2; J.H = [[3.5, 3, 39], [7.5, 4, 37]][k]; J.C2 = [[-7, 0, 46], [-4, 0, 45]][k]; J.C1 = [-8, 0, 15]; J.open = [1.4, 0.9][k]; J.boil = 0.3; }
  else if (pose === 'death') {
    const k = ph % 4, K = [0.3, 0.6, 0.88, 1][k];
    J.H = zV.lp([10, 5, 34], [19, 3, 5.5], K); J.C2 = zV.lp([-1, 0, 44], [18, 1, 14], K); J.C1 = zV.lp([-6.5, 0, 14], [4, 0, 6], K); J.open = 0.6 + K * 0.7; J.amp = 0.2 + K * 0.5; J.dead = k;
  }
  J.pose = pose; J.ph = ph; return J;
}
function wormPaint(V, J) {
  const A = zV.a, Mv = zV.m, S3 = zV.s, n3 = zV.n, L3 = zV.lp, lat = [0, 1, 0];
  const bz = u => { const v = 1 - u, a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u; return [0, 1, 2].map(i => a * J.B[i] + b * J.C1[i] + c * J.C2[i] + d * J.H[i]); };
  const tg0 = u => n3(S3(bz(Math.min(1, u + 0.01)), bz(Math.max(0, u - 0.01))));
  const sp = u => { const p = bz(u), d = tg0(u), w = J.amp * Math.sin(u * 7 - J.wph) * Math.sin(u * Math.PI); const side = n3(zV.x(d, lat)); return A(p, A(Mv(side, w), Mv(lat, w * 0.6))); };
  const tg = u => n3(S3(sp(Math.min(1, u + 0.012)), sp(Math.max(0, u - 0.012))));
  const NC = 7, U1 = 0.93, pulse = J.pu >= 0 ? Math.floor(J.pu * NC) % NC : -1;
  // girth: tapering, bulging in each chamber, pinched at each valve, swollen where the pulse is
  const rad = u => { const base = 4.4 - 1.5 * u, q = Math.min(U1, u) / U1 * NC, ci = Math.floor(q), f = q - ci, bul = Math.sin(Math.PI * f); return base * (0.8 + 0.2 * bul) + (ci === pulse ? 0.9 * bul : ci === pulse - 1 ? 0.3 * bul : 0); };
  const B = J.B;
  // ---- the torn ring of earth behind; the pool of the god's blood in it
  const ring = (a0, a1, front) => { for (let i = 0; i < 9; i++) { const a = a0 + (a1 - a0) * (i + 0.2 + zH(i, 17) * 0.6) / 9, r = 7 + zH(i, front ? 3 : 7) * 3, p = [B[0] + Math.cos(a) * r, B[1] + Math.sin(a) * r * 0.95, 0.6 + zH(i, 19) * 1.2]; V.ell(p, 1.2 + zH(i + (front ? 20 : 0), 11) * 1.8, 1 + zH(i, 13) * 1.3, 1.2 + zH(i, 23), 'soil'); if (zH(i, 29) > 0.5) V.ell(A(p, [0.8, 0.5, 1.2]), 0.7, 0.6, 0.6, 'soil'); } };
  ring(Math.PI * 0.55, Math.PI * 1.95, false);
  { const pts = []; for (let i = 0; i < 16; i++) { const a = i / 16 * 6.2832, r = 7 + zH(i, 5) * 1.6; pts.push([B[0] + Math.cos(a) * r, B[1] + Math.sin(a) * r, 0.25]); } V.plate(pts, 'pool', { bevel: 2, bulge: 0.15 }); }
  if (J.boil) for (let i = 0; i < 10; i++) { const a = i / 10 * 6.2832 + 0.3, r = 3.5 + zH(i, 9) * 3.5, s = (0.5 + zH(i, 4) * 0.6) * (0.5 + J.boil); V.ell([B[0] + Math.cos(a) * r, B[1] + Math.sin(a) * r, 0.5 + s * 0.6], s, s, s, 'pool'); }
  // torn flaps of the vessel wall round the stump
  for (let i = 0; i < 7; i++) { const a = i / 7 * 6.2832 + 0.4, r0 = 4.2, p0 = [B[0] + Math.cos(a) * r0, B[1] + Math.sin(a) * r0, 0.4], tip = [B[0] + Math.cos(a) * (r0 + 2.2), B[1] + Math.sin(a) * (r0 + 2.2), 2.5 + zH(i, 21) * 2.5], sd = [-Math.sin(a) * 1.3, Math.cos(a) * 1.3, 0]; V.plate([A(p0, sd), tip, S3(p0, sd)], 'lip', { bevel: 0.6, bulge: 0.3 }); }
  // ---- the artery
  const N = 44, pts = [], rs = []; for (let j = 0; j <= N; j++) { const u = j / N; pts.push(sp(u)); rs.push(rad(u)); }
  const tid = V.cap(pts, rs, null, 'art');
  const tids = new Set([tid]);
  // valve rings of pale cartilage between the chambers, knuckled
  for (let i = 1; i < NC; i++) { const u = i / NC * U1, c = sp(u), d = tg(u), r = rad(u) + 0.25; V.cap(V.ring(c, d, r, 16, 0, Math.PI * 2, lat), 0.55, 0.55, 'carti'); for (let k = 0; k < 4; k++) V.ell(V.ring(c, d, r + 0.35, 4, k * 1.57 + 0.4, k * 1.57 + 0.4, lat)[0], 0.55, 0.55, 0.5, 'carti'); }
  // veins across it, the pulse's glow inside the swollen chamber
  for (let i = 0; i < 9; i++) { const u0 = 0.06 + i * 0.1, c0 = sp(u0), d0 = tg(u0), a = zH(i, 3) * 6.28; let q = V.ring(c0, d0, rad(u0) + 0.05, 1, a, a, lat)[0]; for (let s = 1; s <= 5; s++) { const u = Math.min(1, u0 + s * 0.012), c = sp(u), d = tg(u), aa = a + s * (zH(i, s) - 0.3) * 0.5, q2 = V.ring(c, d, rad(u) + 0.05, 1, aa, aa, lat)[0]; V.markLine(q, q2, 'vein', { ids: tids, eps: 2.5 }); q = q2; } }
  if (pulse >= 0) { const u = (pulse + 0.5) / NC * U1, c = sp(u); V.markEll(A(c, Mv(n3(zV.a(lat, [0.3, 0, 0.2])), rad(u) * 0.9)), 1.2, 1.6, 'glow', { ids: tids, eps: 3, emf: q => 0.55 - q * 0.3 }); }
  // the back of it: a dark vessel down the dorsal crest
  if (V.back) for (let j = 1; j < 30; j++) { const u = j / 30 * U1, c = sp(u), d = tg(u); V.mark(V.ring(c, d, rad(u) + 0.05, 1, Math.PI, Math.PI, lat)[0], 'artD', { ids: tids, eps: 3 }); }
  // ---- the head: a flared collar of muscle, the lip ring, the round mouth ringed with hooked teeth
  {
    const d = n3(L3(tg(0.985), n3([0.55, 0.85, -0.25]), J.dead != null ? 0.1 : 0.45)), Hc = sp(1), o = J.open, rc = 3.9 + o * 1.0, O = A(Hc, Mv(d, 3.3));
    V.cap([S3(Hc, Mv(tg(0.97), 1.5)), S3(O, Mv(d, rc - 0.6))], 3.2, rc - 0.4, 'art', { flat: 0.6 });                       // the collar
    const lip = V.ring(O, d, rc - 0.2, 20, 0, Math.PI * 2, lat);
    V.cap(lip, 1.05, 1.05, 'lip');
    const mouth = V.ring(A(O, Mv(d, 0.2)), d, rc - 0.9, 18, 0, Math.PI * 2, lat); V.plate(mouth.slice(0, 18), 'ink', { bevel: 0.4, bulge: 0 });
    // teeth: an outer ring of hooks and an inner ring, all pointing into the throat
    for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832, p0 = V.ring(A(O, Mv(d, 0.4)), d, rc - 0.9, 1, a, a, lat)[0], p1 = V.ring(A(O, Mv(d, -0.3)), d, (rc - 0.9) * 0.5, 1, a + 0.15, a + 0.15, lat)[0]; V.cap([p0, p1], 0.5, 0.16, 'bone'); }
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832 + 0.4, p0 = V.ring(O, d, (rc - 0.9) * 0.55, 1, a, a, lat)[0], p1 = V.ring(A(O, Mv(d, -0.6)), d, (rc - 0.9) * 0.22, 1, a, a, lat)[0]; V.cap([p0, p1], 0.3, 0.1, 'bone'); }
    V.markEll(A(O, Mv(d, -0.4)), 0.8, 0.8, 'glow', { eps: 6, emf: () => 0.45 + o * 0.2 });   // the throat, blood-lit
    if (J.dead == null && !J.strike) V.cap([L3(lip[14], lip[15], 0.5), A(L3(lip[14], lip[15], 0.5), [0.2, 0, -1.6 - (J.ph % 2)])], 0.4, 0.25, 'pool');   // drool
  }
  if (J.strike) for (let i = 0; i < 8; i++) V.ell([J.H[0] - 5 + i * 1.6, (zH(i, 3) - 0.5) * 4, 1 + zH(i, 7) * 4], 0.5, 0.5, 0.5, 'pool');   // blood thrown up where it strikes
  // ---- the front lip of the torn earth
  ring(-Math.PI * 0.45, Math.PI * 0.55, true);
  V.light(A(B, [0, 0, 2]), 12, 0.25, '#c02818');
}
function wormFrame(pose, ph, view, tint) {
  const MT = zsMats('worm', WORM_M, tint, 0.55), S = zsSculpt(WORM.W * 1.5, WORM.H * 1.5, MT), V = zsView(S, WORM, view), J = wormRig(pose, ph);
  wormPaint(V, J);
  const hr = S.render({ amb: 0.1 });
  if (J.smear >= 0) {
    const from = J.smear === 0 ? [2, 0, 42] : [18.5, 0, 33], lines = [];
    for (let i = -1; i <= 1; i++) lines.push([zV.a(from, [0, i, i]), zV.a(zV.lp(from, J.H, 0.6), [2, i, 2 + i]), zV.a(J.H, [-1.5, i * 1.5, 2])].map(p => V.C(p)));
    zsSmear(hr, lines, ['#300810', '#7a1c24', '#c85a50'], 1.2);
  }
  return hr;
}

// ------------------------------------------------------------------- wiring: frames, the struck recoil, the collapse
const ZSC_T = { hollow: { d: HUSK, ph: HUSK_PH, fn: huskFrame } };
if (typeof BLOAT !== 'undefined') ZSC_T.bloat = { d: BLOAT, ph: BLOAT_PH, fn: bloatFrame };
if (typeof WORM !== 'undefined') ZSC_T.worm = { d: WORM, ph: WORM_PH, fn: wormFrame };
let ZSC_HIT = -1;
{
  const _mf = monFrame;
  monFrame = function (type, palKey, pal, pose, ph, view) {
    const T = ZSC_T[type]; if (!T) return _mf.apply(this, arguments);
    if (ZSC_HIT >= 0 && (pose === 'idle' || pose === 'walk')) { pose = 'hit'; ph = ZSC_HIT; }
    if (!T.ph[pose]) pose = 'idle';
    const n = T.ph[pose]; ph = (((ph | 0) % n) + n) % n; view = view === 'back' ? 'back' : 'front';
    const tint = (pal && pal.tint) || '', key = '38|' + type + '|' + tint + '|' + pose + '|' + ph + '|' + view;
    let fr = ART16.cache[key]; if (fr) return fr;
    try { fr = zsHrFrame(T.fn(pose, ph, view, tint || null), T.d.W, T.d.H, T.d.ox, T.d.oy); }
    catch (er) { try { window.__zsErr = (window.__zsErr || '') + type + ':' + er.message + ' '; } catch (e2) { } fr = _mf(type, palKey, pal, pose === 'hit' || pose === 'death' ? 'idle' : pose, pose === 'hit' || pose === 'death' ? 0 : ph, view); }
    ART16.cache[key] = fr; return fr;
  };
  // struck: the recoil pose for a moment (not while it winds up or strikes: its tells stay readable)
  const _dm = drawMon16;
  drawMon16 = function (m, flash, alpha) {
    if (!m || !m.b || !ZSC_T[m.b.spr] || m.dead) return _dm(m, flash, alpha);
    const h = m.hurt > 0;
    if (h && !m._zsH && G.time - (m._zsHT == null ? -9 : m._zsHT) > 0.5) m._zsHT = G.time;
    m._zsH = h;
    const age = G.time - (m._zsHT == null ? -9 : m._zsHT), prev = ZSC_HIT;
    ZSC_HIT = age >= 0 && age < 0.24 ? (age < 0.1 ? 0 : 1) : -1;
    try { return _dm(m, flash, alpha); } finally { ZSC_HIT = prev; }
  };
  // killed: these three fall through their own collapse, then lie in its last pose, darkening, sinking and fading
  const _cl = corpsesToList;
  corpsesToList = function (list) {
    const z = G.zone; if (!z || !z.monsters) return _cl(list);
    const mine = m => m.dead && m.b && ZSC_T[m.b.spr], all = z.monsters;
    if (!all.some(mine)) return _cl(list);
    z.monsters = all.filter(m => !mine(m));
    try { _cl(list); } finally { z.monsters = all; }
    for (const m of all) {
      if (!mine(m) || m.hatched || m.eaten || m.burst || m.erased || m.engulfed) continue;
      const age = G.time - (m.deadAt || 0); if (age > CORPSE_LIFE || !onScreen(m.x, m.y, 40)) continue;
      list.push({ d: m.x + m.y - 0.4, f: () => {
        const type = m.b.spr, [pk, pal] = monPal(m, type), ph = Math.min(3, Math.floor(age / 0.11)), fr = monFrame(type, pk, pal, 'death', ph, 'front'), p = iso(m.x, m.y), face = (m._rv && m._rv.face) || m.face || 1;
        const rot = clamp((age - 4) / (CORPSE_LIFE - 10), 0, 1), fade = age > CORPSE_LIFE - 6 ? Math.max(0, (CORPSE_LIFE - age) / 6) : 1, k = clamp((age - 0.45) / 0.8, 0, 1);
        ctx.save(); ctx.globalAlpha = fade;
        ctx.translate(Math.round(p.sx), Math.round(p.sy) + 2); ctx.scale(1, 1 - 0.4 * rot);
        if (k > 0) ctx.filter = `brightness(${(1 - 0.3 * k - 0.34 * rot).toFixed(2)}) saturate(${(1 - 0.25 * k - 0.45 * rot).toFixed(2)}) sepia(${(0.4 * rot).toFixed(2)})`;
        ctx.drawImage(face < 0 ? fr.f : fr.c, -(face < 0 ? fr.w - fr.ox : fr.ox), -(fr.oy + 1) + 1);
        ctx.filter = 'none'; ctx.restore(); ctx.globalAlpha = 1;
      } });
    }
  };
}
})();
