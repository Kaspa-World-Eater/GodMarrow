// =================================================================== v0.22: the ASSASSIN (miasmancer), a purifier of the Myriad
// A shrine-purifier who draws the world's rot out of the small spirits in all things, holds it in a gourd at the
// hip and turns it on its makers. Lighter and quicker than the Hemomancer: a slim figure in white and faded
// vermilion, hakama tied at the shin, bandaged shins and straw sandals, a shimenawa rope at the waist hung with
// zig-zag shide papers that flutter behind. Starting robe: plain undyed white, a straw rope. A found robe: a
// vermilion over-robe with wide trailing sleeves lined in white. Mail: black lacquered lamellar over it, shoulder
// guards, tassets, lacquered gauntlets. Hood: a cloth zukin (start), a straw kasa (robe), a lacquered jingasa
// (mail). Mask: a white kitsune half-mask, or a red oni menpo over the jaw with mail. The miasma is green-violet.
// Also: claw and talons redrawn for everyone as curved blades on a bracer over the knuckles.
defMat('zoWhite', '#16161c', '#46464f', '#7c7870', '#aca493', '#d2c8b2');
defMat('zoUndyed', '#0e0d10', '#24211f', '#3a3530', '#554c42', '#6e6252');
defMat('zoPaper', '#24242c', '#56545c', '#9a968e', '#cfc8b8', '#ece4d0');
defMat('zoVerm', '#12050a', '#3a0f10', '#652018', '#8e3620', '#b4502c');
defMat('zoLacq', '#040305', '#0c0a0f', '#17141b', '#2a2530', '#5a5068');
defMat('zoLacqRed', '#140406', '#3c0a0c', '#681412', '#962418', '#c44428');
defMat('zoStraw', '#130e08', '#352814', '#5a4526', '#806538', '#a4884c');
defMat('zoSkin', '#1a1418', '#4e3c44', '#86706c', '#b49c8a', '#dcc4ac');
defMat('zoWrap', '#18161a', '#3e3a3c', '#6a6460', '#948a7e', '#b8ac98');
defMat('zoMiasma', '#10081a', '#2c1840', '#4e3a5a', '#7a9a44', '#c0e070');
defMat('zoHakDark', '#060608', '#121218', '#1e1e28', '#30303e', '#464656');
const ZO_GLINT = '#b8f070', ZO_VIO = '#8a5ab0';
// the assassin's own stance for strikes: a low, quick lunge instead of an overhead chop
function zoStance(J, pose, ph, g) {
  if (pose !== 'atk' || g.wpn === 'staff' || g.wpn === 'wand') return J;   // staves and wands keep the overhead swing
  const S = [
    { d: 1, lean: -1, hip: 0.5, elN: [1.5, -40], haN: [-4, -35], elF: [-3, -40], haF: [7, -44], L: [[5, -16], [6.5, -3], [-4.5, -16], [-5.5, -3]] },
    { d: 1.5, lean: -1.5, hip: 0, elN: [2, -52], haN: [-4, -56], elF: [-9, -42], haF: [-13, -37], L: [[5, -16], [6.5, -3], [-4.5, -16], [-6, -3]] },
    { d: 3, lean: 2.5, hip: 2, elN: [15, -43.5], haN: [22.5, -42.5], elF: [-9, -40], haF: [-15, -38], L: [[9, -15], [11, -3], [-4, -15], [-8.5, -3]] },
    { d: 2.5, lean: 2, hip: 1.5, elN: [13, -39.5], haN: [17, -32.5], elF: [-9, -41], haF: [-14, -37], L: [[8.5, -15], [10.5, -3], [-4, -15], [-8, -3]] }][ph % 4];
  const d = S.d, ln = S.lean;
  J.hip = [S.hip, -31 + d]; J.waist = [0.5 + S.hip * 0.6 + ln * 0.3, -36 + d]; J.chest = [1 + ln * 0.6, -43 + d]; J.neck = [1.5 + ln * 0.8, -50 + d]; J.head = [2 + ln, -56 + d];
  J.shF = [-5.2 + ln * 0.8, -47.2 + d]; J.shN = [5.6 + ln * 0.8, -47.4 + d];
  J.elN = S.elN.slice(); J.haN = S.haN.slice(); J.elF = S.elF.slice(); J.haF = S.haF.slice();
  J.kneeN = S.L[0]; J.ankN = S.L[1]; J.kneeF = S.L[2]; J.ankF = S.L[3];
  return J;
}
// a shide: a strip of white paper cut in a zig-zag, hung from a rope; it trails and flutters
function zoShide(A, x, y, len, tr, fl, tone) {
  // one ribbon folded down in a zig-zag: every piece slants the other way, the whole blown back by the motion
  const n = 4, hh = len / n, wd = 1.3, P = [];
  for (let k = 0; k <= n; k++) { const u = k / n; P.push([x + (k % 2 ? 1.1 : 0) - tr * u * u * 1.1 - fl * Math.sin(k * 1.7 + 0.5) * u, y + k * hh - tr * u * u * 0.3]); }
  for (let k = 0; k < n; k++) { const a = P[k], b = P[k + 1]; A.poly([[a[0] - wd / 2 - 0.5, a[1] - 0.3], [a[0] + wd / 2 + 0.5, a[1] - 0.3], [b[0] + wd / 2 + 0.5, b[1] + 0.7], [b[0] - wd / 2 - 0.5, b[1] + 0.7]], '#0d0b10', { flat: true, contour: false, edge: false }); }
  for (let k = 0; k < n; k++) {
    const a = P[k], b = P[k + 1];
    A.poly([[a[0] - wd / 2, a[1]], [a[0] + wd / 2, a[1]], [b[0] + wd / 2, b[1] + 0.2], [b[0] - wd / 2, b[1] + 0.2]], 'zoPaper', { sh: 0.4, hl: 0.5, tone: (tone || 0) + (k % 2 ? -0.6 : 0.4), hi: false, contour: false });
  }
}
// ------------------------------------------------------------------- claw and talons, drawn properly for every class
function zoClaw(A, g, J, cls) {
  const h = J.haN, e = J.elN, dx = h[0] - e[0], dy = h[1] - e[1], l = Math.hypot(dx, dy) || 1;
  let dir = Math.atan2(dy / l, dx / l); if (!J.atk && !J.cast) dir -= 0.4;             // hanging: the blades cant forward
  const cs = Math.cos(dir), sn = Math.sin(dir), along = (d, s) => [h[0] + cs * d - sn * s, h[1] + sn * d + cs * s];
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const lac = cls === 'miasmancer', bm = lac ? 'zoLacq' : 'steelDark', strap = lac ? MAT.zoVerm[2] : MAT.leather[3], trim = g.trim ? 'gold' : lac ? 'bronze' : 'steel';
  const tal = g.wpn === 'talons', n = tal ? 3 : 2, L = tal ? 11.5 : 9.5, curl = (tal ? 3.4 : 2.8) * (J.atk || J.cast ? 1 : -1.2);   // hanging, the hooks sweep forward
  // the bracer over the forearm, laced, and a hinged plate over the knuckles
  const b0 = lerp(e, h, 0.32);
  A.limb([b0, lerp(e, h, 0.7), h], 1.9, 1.7, bm, { sh: 1, hl: 0.6 });
  for (const k of [0.5, 0.78]) { const p = lerp(e, h, k), px = -dy / l * 1.6, py = dx / l * 1.6; A.hair(p[0] - px, p[1] - py, p[0] + px, p[1] + py, strap); }
  if (g.trim) { const p = lerp(e, h, 0.36), px = -dy / l * 1.8, py = dx / l * 1.8; A.hair(p[0] - px, p[1] - py, p[0] + px, p[1] + py, MAT.gold[2]); }
  // the blades, far to near: each a hooked crescent, the spine lit, the edge cold
  for (let i = n - 1; i >= 0; i--) {
    const s0 = (i - (n - 1) / 2) * (tal ? 1.7 : 1.9), Lk = L - Math.abs(s0) * 0.6;
    const a = along(1.6, s0 * 0.7 - 0.6), b = along(1.6, s0 * 0.7 + 0.6), tip = along(Lk, s0 * 1.25 + curl), c1 = along(Lk * 0.65, s0 * 1.1 - Math.sign(curl) * 1), c2 = along(Lk * 0.62, s0 * 1.1 + Math.sign(curl) * 0.2);
    A.shape((cx, X, Y) => { cx.moveTo(X(a[0]), Y(a[1])); cx.quadraticCurveTo(X(c1[0]), Y(c1[1]), X(tip[0]), Y(tip[1])); cx.quadraticCurveTo(X(c2[0]), Y(c2[1]), X(b[0]), Y(b[1])); cx.closePath(); }, 'steel', { sh: 0.5, hl: 0.3, hi: false, tone: i === n - 1 && n > 2 ? -2.4 : -1.2 });
    let pq = null; for (let t = 0.3; t <= 0.75; t += 0.15) { const q = [(1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * c1[0] + t * t * tip[0], (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * c1[1] + t * t * tip[1]]; if (pq) A.hair(pq[0], pq[1], q[0], q[1], MAT.steel[3]); pq = q; }
    A.fine(tip[0], tip[1], '#e8f0ff');
  }
  // the knuckle plate the blades are riveted to
  A.poly([along(-0.6, -2), along(2.3, -2.2), along(2.5, 2.2), along(-0.6, 2)], bm, { sh: 0.6, hl: 0.5, metal: true });
  const r1 = along(1, -0.9), r2 = along(1, 0.9); A.fine(r1[0], r1[1], MAT[trim][3]); A.fine(r2[0], r2[1], MAT[trim][3]);
}
const _zoPxw = pxWeapon;
pxWeapon = function (A, g, J, cls) { if (g.wpn === 'claw' || g.wpn === 'talons') { zoClaw(A, g, J, cls); return; } return _zoPxw(A, g, J, cls); };

// ------------------------------------------------------------------- the painter
HPX.miasmancer = function (A, pose, ph, g, J) {
  J = zoStance(J, pose, ph, g);
  J.shF = [J.shF[0] + 0.3, J.shF[1] + 0.9]; J.shN = [J.shN[0] - 0.3, J.shN[1] + 0.9];   // a slighter build, the shoulders sloped
  const T = g.tier, S = MAT.zoSkin, M = MAT.zoMiasma, V = MAT.zoVerm;
  const FAR = { contour: false, tone: -1.6 }, NEAR = {};
  const h = J.head, n = J.neck, c = J.chest, w = J.waist, hip = J.hip;
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const robe = T === 0 ? 'zoWhite' : 'zoVerm', R = MAT[robe], hak = T === 0 ? 'zoUndyed' : T === 1 ? 'zoWhite' : 'zoHakDark', HK = MAT[hak];
  const claw = g.wpn === 'claw' || g.wpn === 'talons';
  // how far cloth trails behind, and how it flutters
  const tr = J.walk ? 1.7 + 0.5 * Math.sin(J.G.a * 2) : J.atk ? [0.4, 0.9, 3.2, 2.4][ph] : J.cast ? [0.3, 0.7, 1.6, 1.1][ph] : 0.35 + 0.2 * Math.sin(ph * 1.571);
  const fl = J.walk || (J.atk && ph >= 2) ? 0.8 : 0.3, flut = i => Math.sin(ph * 1.571 + i * 1.3) * fl;
  // ---- hands: a slim hand, fingers drawn in; a fist when a claw is strapped over it
  const hand = (e, ha, o, far, fist) => {
    const dx = ha[0] - e[0], dy = ha[1] - e[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, ang = Math.atan2(uy, ux);
    A.ell(ha[0] + ux * 0.8, ha[1] + uy * 0.8, 1.5, 1.15, 'zoSkin', { ...o, rot: ang, sh: 0.8 });
    if (fist) return;
    for (let i = 0; i < 3; i++) { const a = ang + (i - 1) * 0.32, f1 = [ha[0] + ux * 1.6 + Math.cos(a) * 1.3, ha[1] + uy * 1.6 + Math.sin(a) * 1.3], f2 = [f1[0] + Math.cos(a + 0.4) * 1.3, f1[1] + Math.sin(a + 0.4) * 1.3];
      A.limb([[ha[0] + ux * 1.3, ha[1] + uy * 1.3], f1, f2], 0.45, 0.35, 'zoSkin', { ...o, edge: false }); }
  };
  // ---- an arm in its sleeve; with a robe the sleeve is wide, lined in white, and hangs and trails
  const arm = (s, e, ha, far, mid) => {
    const o = far ? FAR : NEAR, cufK = T === 0 ? 0.4 : 0.55, cuf = lerp(e, ha, cufK), smat = robe;
    if (T >= 1) {
      // the sleeve is a long bag of cloth hanging under the arm: its mouth at the wrist, its bottom swinging back
      const D = T === 1 ? 6.5 : 4.2, W = T === 1 ? 5 : 3.6, trr = tr * (far ? 0.8 : 1), top = lerp(s, e, 0.35);
      const P3 = [cuf[0] - trr * 0.7, cuf[1] + D], P4 = [P3[0] - W - trr * 1.1, P3[1] - 0.2 - trr * 0.3 + flut(far ? 11 : 12) * 0.4], P5 = [Math.min(e[0], top[0]) - W * 0.7 - trr * 0.6, e[1] + 1.2];
      const bag = (dd, mat, tone) => A.shape((cx, X, Y) => { cx.moveTo(X(top[0]), Y(top[1])); cx.lineTo(X(cuf[0]), Y(cuf[1])); cx.lineTo(X(cuf[0] + 0.8), Y(cuf[1] + 1)); cx.quadraticCurveTo(X(cuf[0] + 0.9 - trr * 0.3), Y((cuf[1] + P3[1]) / 2), X(P3[0] + 0.3), Y(P3[1] + dd)); cx.quadraticCurveTo(X((P3[0] + P4[0]) / 2), Y(P3[1] + 1 + dd), X(P4[0]), Y(P4[1] + dd)); cx.quadraticCurveTo(X(P5[0] - 0.8), Y((P4[1] + P5[1]) / 2), X(P5[0]), Y(P5[1])); cx.closePath(); }, mat, { ...o, sh: 1.4, core: 1, tone: (o.tone || 0) + (tone || 0) });
      bag(1.2, 'zoWhite', -0.3);        // the white under-sleeve showing below the vermilion
      bag(0, smat);
      // folds hanging down the sleeve, the dark of its mouth, the threaded cord along its hem
      for (const k of [0.3, 0.62]) { const a = lerp(P5, cuf, k), b = lerp(P4, P3, k + 0.05); A.hair(a[0], a[1] + 1, b[0], b[1] - 0.6, R[far ? 0 : 1]); if (!far) A.hair(a[0] + 0.6, a[1] + 1.4, b[0] + 0.6, b[1] - 1, R[3]); }
      if (!far) A.hair(cuf[0] + 0.6, cuf[1] + 1.2, P3[0] + 0.2, P3[1] - 0.6, R[0]);
      if (!far) for (let i = 1; i < 6; i++) { const p = lerp(P4, P3, i / 6); A.fine(p[0], p[1] + 0.6, i % 2 ? MAT.zoPaper[3] : V[4]); }
      if (!far) { A.hair(P3[0], P3[1] + 1, P3[0] - 0.2 - trr * 0.3, P3[1] + 2.6, MAT.zoPaper[3]); A.fine(P3[0] - 0.3 - trr * 0.3, P3[1] + 3, V[4]); }   // the cord's tassel
    }
    A.limb([s, lerp(s, e, 0.5), e, cuf], 2.3, T === 0 ? 1.9 : 2.3, smat, { ...o, sh: 1.2 });
    if (!far) { const m = lerp(s, e, 0.5); A.hair(m[0] - 1.6, m[1] - 0.5, e[0] - 1.4, e[1] + 0.2, R[3]); A.hair(e[0] + 0.4, e[1] - 0.6, cuf[0] + 1.2, cuf[1] - 0.2, R[1]); }
    if (mid) mid();
    A.limb([cuf, lerp(cuf, ha, 0.5), ha], 1.5, 1.25, 'zoSkin', o);
    if (T === 2) A.limb([lerp(e, ha, 0.62), ha], 1.75, 1.6, 'zoLacq', { ...o, sh: 0.8 });
    else for (let i = 0; i < 4; i++) {                 // bandage wound to the wrist
      const k = 0.62 + i * 0.1 - (T === 0 ? 0.12 : 0), p = lerp(e, ha, k), q = lerp(e, ha, k + 0.08), dx = ha[0] - e[0], dy = ha[1] - e[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * 1.5, ny = dx / l * 1.5;
      A.poly([[p[0] - nx, p[1] - ny], [p[0] + nx, p[1] + ny], [q[0] + nx, q[1] + ny + 0.3], [q[0] - nx, q[1] - ny + 0.3]], 'zoWrap', { sh: 0.5, hl: 0.4, tone: far ? -1.6 : 0, contour: false }); A.hair(q[0] - nx, q[1] - ny + 0.3, q[0] + nx, q[1] + ny + 0.3, MAT.zoWrap[1]);
    }
    hand(e, ha, o, far, !far && claw);
  };
  // ---- a leg: the hakama tied at the shin, the shin bandaged, a straw sandal on a white tabi
  const shin = (k, a, far) => {
    const o = far ? FAR : NEAR, g0 = lerp(k, a, 0.42);
    A.limb([g0, a], 1.35, 1.2, 'zoSkin', o);
    for (let i = 0; i < 4; i++) { const p = lerp(g0, a, 0.08 + i * 0.24), q = lerp(g0, a, 0.26 + i * 0.24); A.poly([[p[0] - 1.6, p[1] + 0.3], [p[0] + 1.6, p[1] - 0.4], [q[0] + 1.6, q[1] - 0.1], [q[0] - 1.6, q[1] + 0.5]], 'zoWrap', { sh: 0.5, hl: 0.4, tone: far ? -1.6 : 0, contour: false }); A.hair(q[0] - 1.6, q[1] + 0.5, q[0] + 1.6, q[1] - 0.1, MAT.zoWrap[far ? 0 : 1]); }
    // the foot in a split-toed tabi, a straw sole under it, straps over the instep
    const fy = Math.min(0, a[1] + 3);
    A.shape((cx, X, Y) => { cx.moveTo(X(a[0] - 1.7), Y(fy)); cx.lineTo(X(a[0] - 1.4), Y(a[1] - 0.2)); cx.lineTo(X(a[0] + 1.1), Y(a[1] - 0.2)); cx.quadraticCurveTo(X(a[0] + 2.4), Y(a[1] + 1.4), X(a[0] + 4.6), Y(fy - 0.7)); cx.lineTo(X(a[0] + 4.8), Y(fy)); }, 'zoWhite', { ...o, sh: 0.8, hl: 0.6, tone: (o.tone || 0) - 0.6 });
    A.line(a[0] - 1.9, fy, a[0] + 4.9, fy, far ? MAT.zoStraw[1] : MAT.zoStraw[3]); A.fine(a[0] + 3.2, fy - 1.2, MAT.zoWhite[0]);
    A.hair(a[0] - 1.2, a[1] + 0.8, a[0] + 2.6, fy - 0.3, far ? MAT.zoStraw[0] : MAT.zoStraw[2]); A.hair(a[0] + 1.6, a[1] + 0.2, a[0] + 3.6, fy - 0.3, far ? MAT.zoStraw[0] : MAT.zoStraw[1]);
  };
  const hakLeg = (k, a, far, top) => {
    const o = far ? FAR : NEAR, g0 = lerp(k, a, 0.42), kk = lerp(k, g0, 0.55);
    A.limb([top, lerp(top, k, 0.5), k], 3.3, 4.2, hak, { ...o, sh: 1.6, core: 1 });
    A.limb([k, kk, g0], 4.2, 2.6, hak, { ...o, sh: 1.6, contour: false });
    // the billow hanging over the tie, blown back a little
    A.shape((cx, X, Y) => { cx.moveTo(X(k[0] - 4.2), Y(k[1])); cx.lineTo(X(k[0] + 4.2), Y(k[1])); cx.quadraticCurveTo(X(g0[0] + 4.6), Y(g0[1] - 2), X(g0[0] + 2.6 - tr * 0.3), Y(g0[1] + 0.8)); cx.lineTo(X(g0[0] - 3.2 - tr * 0.6), Y(g0[1] + 1.2)); cx.quadraticCurveTo(X(k[0] - 5 - tr * 0.4), Y(g0[1] - 3), X(k[0] - 4.2), Y(k[1])); }, hak, { ...o, sh: 1.4, contour: false });
    // pleats: two troughs and a lit ridge down the leg, and the tie at the shin
    for (const s of [-1.2, 1.1]) A.hair(top[0] + s, top[1] + 1.5, g0[0] + s * 1.1 - 0.3, g0[1] - 0.6, HK[far ? 0 : 1]);
    if (!far) A.hair(top[0] - 0.2, top[1] + 2, g0[0] - 0.4, g0[1] - 1, HK[3]);
    A.line(g0[0] - 2, g0[1] - 0.2, g0[0] + 2, g0[1] - 0.6, far ? HK[0] : (T === 1 ? V[3] : HK[1]));
  };
  // ---------------------------------------------------------------- far arm
  arm(J.shF, J.elF, J.haF, true, T === 2 ? () => {
    A.poly([[J.shF[0] - 2.2, J.shF[1] - 0.6], [J.shF[0] + 2.4, J.shF[1] - 1.2], [J.shF[0] + 1.6, J.shF[1] + 5], [J.shF[0] - 3.2, J.shF[1] + 5.2]], 'zoLacq', { ...FAR, sh: 0.8 });
  } : null);
  // ---------------------------------------------------------------- the over-robe's tail behind the legs (robe and mail)
  if (T >= 1) {
    const t0 = [w[0] - 5, w[1] + 1], t1 = [w[0] - 1, w[1] + 1];
    A.shape((cx, X, Y) => { cx.moveTo(X(t0[0]), Y(t0[1])); cx.lineTo(X(t1[0]), Y(t1[1])); cx.lineTo(X(t1[0] - 1.5 - tr * 1.2), Y(-15 - tr * 0.8)); cx.lineTo(X(t1[0] - 3.2 - tr * 1.4), Y(-13.5 - tr * 0.7 + flut(1))); cx.lineTo(X(t0[0] - 3 - tr * 1.8), Y(-15.5 - tr * 0.9 + flut(2))); cx.quadraticCurveTo(X(t0[0] - 1.8 - tr * 0.4), Y(-24), X(t0[0]), Y(t0[1])); }, robe, { tone: -1, contour: false, sh: 1.4 });
    A.hair(t0[0] - 0.5, t0[1] + 3, t0[0] - 3 - tr * 1.6, -16 - tr * 0.8, R[0]);
  }
  // ---------------------------------------------------------------- legs and the hakama
  hakLeg(J.kneeF, J.ankF, true, [hip[0] - 2.2, hip[1] + 1]);
  shin(J.kneeF, J.ankF, true);
  shin(J.kneeN, J.ankN, false);
  // the seat of the hakama, pleated, from the waist to the fork of the legs; the board at the back
  {
    const WB = [w[0] - 5.4, w[1] + 0.5], WF = [w[0] + 4.9, w[1] + 0.5], fy = hip[1] + 7;
    A.shape((cx, X, Y) => { cx.moveTo(X(WB[0]), Y(WB[1])); cx.lineTo(X(WF[0]), Y(WF[1])); cx.quadraticCurveTo(X(WF[0] + 1.6), Y(fy - 3), X(Math.max(WF[0] + 1.5, J.kneeN[0] + 2.5)), Y(fy)); cx.lineTo(X(Math.min(WB[0] - 1.5, J.kneeF[0] - 2.5)), Y(fy)); cx.quadraticCurveTo(X(WB[0] - 1.2), Y(fy - 4), X(WB[0]), Y(WB[1])); }, hak, { sh: 1.8, core: 1 });
    for (let i = 0; i < 4; i++) { const x0 = w[0] - 3.2 + i * 2.2; A.hair(x0, w[1] + 2, x0 + (i - 1.5) * 0.5 + J.sw * 0.4, fy - 0.5, HK[1]); A.hair(x0 + 0.6, w[1] + 2.2, x0 + 0.6 + (i - 1.5) * 0.5 + J.sw * 0.4, fy - 1, HK[3]); }
  }
  hakLeg(J.kneeN, J.ankN, false, [hip[0] + 2, hip[1] + 1]);
  // mail: lacquered tassets over the hakama, three hanging panels that swing
  if (T === 2) {
    const sw = J.walk ? J.sw * 0.8 : J.atk && ph >= 2 ? -1 : 0;
    [[-5.4, -1.8, -1.2], [-2.1, 1.4, 0], [1.4, 5, 0.4]].forEach(([x0, x1, dy], i) => {
      const y0 = w[1] + 1.2, y1 = w[1] + 9 + dy, s = sw * (0.4 + i * 0.3);
      A.poly([[w[0] + x0, y0], [w[0] + x1, y0], [w[0] + x1 + 0.4 + s, y1], [w[0] + x0 - 0.2 + s, y1 + 0.3]], 'zoLacq', { sh: 1, hl: 0.6, tone: i === 0 ? -1 : 0 });
      for (let r = 1; r < 4; r++) { const yy = y0 + (y1 - y0) * r / 4; A.hair(w[0] + x0 + s * r / 4, yy, w[0] + x1 + s * r / 4, yy, MAT.zoLacq[0]); A.hair(w[0] + x0 + s * r / 4, yy + 0.5, w[0] + (x0 + x1) / 2 + s * r / 4, yy + 0.5, MAT.zoLacq[3]); }
      for (let q = 0; q < 2; q++) { const xx = w[0] + x0 + (x1 - x0) * (q + 0.5) / 2; for (let r = 0; r < 4; r++) A.fine(xx + s * r / 4, y0 + 0.8 + (y1 - y0) * r / 4, V[1]); }
      A.hair(w[0] + x0 - 0.2 + s, y1 + 0.3, w[0] + x1 + 0.4 + s, y1, g.trim ? MAT.gold[2] : V[2]);
    });
  }
  // ---------------------------------------------------------------- the torso, three-quarters to the viewer
  const torso = (cx, X, Y) => {
    cx.moveTo(X(J.shF[0] - 1.6), Y(J.shF[1] + 0.5));
    cx.quadraticCurveTo(X(J.shF[0]), Y(n[1] + 0.5), X(n[0]), Y(n[1] + 1.5));
    cx.quadraticCurveTo(X(J.shN[0] - 1), Y(n[1] + 1), X(J.shN[0] + 1.8), Y(J.shN[1] + 0.2));
    cx.quadraticCurveTo(X(c[0] + 6), Y(c[1] - 1), X(c[0] + 4.6), Y(c[1] + 3));
    cx.quadraticCurveTo(X(w[0] + 4.3), Y(w[1] - 2), X(w[0] + 4.9), Y(w[1] + 1));
    cx.lineTo(X(w[0] - 5.4), Y(w[1] + 1));
    cx.quadraticCurveTo(X(c[0] - 5.6), Y(c[1] + 1), X(J.shF[0] - 1.6), Y(J.shF[1] + 0.5));
  };
  A.shape(torso, robe, { sh: 1.8, core: 1 });
  // the crossed collar: white inner collar under the outer, crossing to the belt; folds pulled to the waist
  { const m = [c[0] + 1.2, c[1] + 2.5];
    A.poly([[n[0] - 1.2, n[1] + 1.2], [n[0] + 0.4, n[1] + 1.2], [m[0] + 0.6, m[1]], [m[0] - 0.8, m[1] + 0.4]], T === 0 ? 'zoPaper' : 'zoWhite', { sh: 0.6, hl: 0.5, contour: false });
    A.poly([[n[0] + 3.4, n[1] + 1.2], [n[0] + 4.8, n[1] + 1.6], [w[0] - 1.6, w[1] + 0.2], [w[0] - 3.2, w[1] + 0.2]], T === 0 ? 'zoPaper' : 'zoWhite', { sh: 0.6, hl: 0.5, contour: false });
    A.hair(n[0] + 3.2, n[1] + 1.5, w[0] - 3.4, w[1], R[0]); }
  A.poly([[c[0] - 3.4, c[1] - 1.5], [w[0] - 2, w[1]], [w[0] - 3.4, w[1]]], robe, { flat: true, tone: -1.4, contour: false, edge: false });
  A.poly([[c[0] + 3.6, c[1] + 0.5], [w[0] + 3, w[1]], [w[0] + 1.9, w[1]]], robe, { flat: true, tone: -1.4, contour: false, edge: false });
  A.hair(c[0] - 2, c[1] - 0.5, w[0] - 1.2, w[1] - 0.5, R[3]);
  // the gourd's cord worn across the body, far shoulder to near hip
  if (T < 2) { A.line(J.shF[0] + 1.2, J.shF[1] - 0.2, w[0] + 3.2, w[1] - 0.2, MAT.zoStraw[2]); A.hair(J.shF[0] + 1.4, J.shF[1] - 0.6, w[0] + 3.4, w[1] - 0.6, MAT.zoStraw[4]); for (let i = 1; i < 6; i++) { const p = lerp([J.shF[0] + 1.2, J.shF[1]], [w[0] + 3.2, w[1]], i / 6); A.fine(p[0], p[1] + 0.3, MAT.zoStraw[0]); } }
  // ---- mail: a lacquered lamellar cuirass laced in vermilion over the robe
  if (T === 2) {
    A.shape((cx, X, Y) => { cx.moveTo(X(c[0] - 4.6), Y(c[1] - 3)); cx.quadraticCurveTo(X(c[0]), Y(c[1] - 5.2), X(c[0] + 5.3), Y(c[1] - 2.2)); cx.quadraticCurveTo(X(c[0] + 5.4), Y(c[1] + 3.5), X(w[0] + 4.2), Y(w[1] - 0.2)); cx.lineTo(X(w[0] - 5), Y(w[1] - 0.2)); cx.quadraticCurveTo(X(c[0] - 5.6), Y(c[1] + 1), X(c[0] - 4.6), Y(c[1] - 3)); }, 'zoLacq', { sh: 1.6, hl: 0.8 });
    for (let r = 0; r < 4; r++) {
      const y = c[1] - 1.4 + r * 2.4, x0 = c[0] - 4.8 + r * 0.1, x1 = c[0] + 5.2 - r * 0.05;
      A.hair(x0, y, x1, y + 0.3, MAT.zoLacq[0]); A.hair(x0 + 0.3, y + 0.6, x0 + (x1 - x0) * 0.5, y + 0.8, MAT.zoLacq[3]);
      for (let q = 0; q < 3; q++) A.fine(x0 + 1.6 + q * 3.2 + (r % 2) * 0.6, y + 1.4, V[1]);
    }
    A.hair(c[0] - 4.2, c[1] - 3.2, c[0] + 5, c[1] - 2.4, g.trim ? MAT.gold[2] : MAT.zoLacq[4]);
    A.fine(c[0] + 1.4, c[1] - 0.8, g.trim ? MAT.gold[3] : V[3]); A.fine(c[0] + 1.9, c[1] - 0.8, g.trim ? MAT.gold[2] : V[2]);     // a lacquered mon on the breast
  }
  // ---- the belt: a straw rope, twisted (a white obi under it with a robe, a vermilion one with mail)
  if (T >= 1) A.poly([[w[0] - 5.6, w[1] - 1.4], [w[0] + 5, w[1] - 1.8], [w[0] + 5.1, w[1] + 1.2], [w[0] - 5.6, w[1] + 1.6]], T === 1 ? 'zoWhite' : 'zoVerm', { sh: 0.8, hl: 0.5 });
  A.limb([[w[0] - 5.8, w[1] + 0.4], [w[0], w[1] - 0.1], [w[0] + 5.2, w[1] - 0.2]], 0.95, 0.95, 'zoStraw', { sh: 0.6, hl: 0.4 });
  for (let i = 0; i < 9; i++) A.hair(w[0] - 5.5 + i * 1.2, w[1] - 0.7, w[0] - 4.9 + i * 1.2, w[1] + 0.8, MAT.zoStraw[1]);
  if (g.trim) for (let i = 0; i < 5; i++) A.fine(w[0] - 4.6 + i * 2.3, w[1] + 1.8, MAT.gold[3]);
  // the gourd of held rot at the near hip, lacquered once it is earned; the miasma seeps out of its stopper
  { const gp = [w[0] + 3.4, w[1] + 4.2 + (J.walk ? Math.abs(J.sw) * 0.4 : 0)], gm = T === 0 ? 'zoStraw' : 'zoLacqRed';
    A.hair(w[0] + 2.8, w[1] + 0.6, gp[0], gp[1] - 3, MAT.zoStraw[3]);
    A.ell(gp[0], gp[1] + 1.4, 1.7, 1.8, gm, { sh: 0.8, hl: 0.6 }); A.ell(gp[0] + 0.1, gp[1] - 1.2, 1.1, 1.1, gm, { sh: 0.6, hl: 0.5 });
    A.hair(gp[0] - 1, gp[1] - 0.2, gp[0] + 1.1, gp[1] - 0.3, MAT.zoPaper[3]);
    A.fine(gp[0], gp[1] - 2.6, MAT.wood[3]);
    for (let i = 0; i < 3; i++) { const t = ((ph + i * 1.4) % 4) / 4; A.fine(gp[0] + Math.sin(t * 6 + i) * 0.8 - tr * t, gp[1] - 3 - t * 4.5, i === 1 ? M[4] : t > 0.5 ? ZO_VIO : M[3]); }
    A.lamp(gp[0], gp[1] - 2.5, [150, 220, 100], 5, 0.35); }
  // shide on the rope: one at the front, one at the side, one at the back, all trailing
  zoShide(A, w[0] - 5, w[1] + 1.2, 8, tr * 1.3, flut(2), -1.4);
  zoShide(A, w[0] + 0.6, w[1] + 1, 9, tr * 1, flut(0), 0.6);
  // the near arm is drawn last, except when it is cocked back behind the head
  const armFirst = J.atk && ph === 1 && g.wpn !== 'staff' && g.wpn !== 'wand';
  const drawNear = () => {
  // ---------------------------------------------------------------- the near arm, over everything
  const sode = () => {
    const s = J.shN;
    A.poly([[s[0] - 2.4, s[1] - 1], [s[0] + 3, s[1] - 1.6], [s[0] + 4, s[1] + 5], [s[0] - 1, s[1] + 5.8]], 'zoLacq', { sh: 1, hl: 0.6 });
    for (let r = 1; r < 4; r++) { const k = r / 4; A.hair(s[0] - 2.4 + 1.4 * k, s[1] - 1 + 6.8 * k, s[0] + 3 + 1 * k, s[1] - 1.6 + 6.6 * k, MAT.zoLacq[0]); A.hair(s[0] - 2.3 + 1.4 * k, s[1] - 0.4 + 6.8 * k, s[0] + 0.4 + 1 * k, s[1] - 0.7 + 6.6 * k, MAT.zoLacq[3]); }
    for (let q = 0; q < 2; q++) for (let r = 0; r < 4; r++) A.fine(s[0] - 0.6 + q * 2.4 + r * 0.35, s[1] - 0.3 + r * 1.7, V[1]);
    A.hair(s[0] - 1, s[1] + 5.8, s[0] + 4, s[1] + 5, g.trim ? MAT.gold[2] : V[2]);
  };
  arm(J.shN, J.elN, J.haN, false, T === 2 ? sode : null);
  // the claw smear: the air cut in thin pale arcs behind a strike
  if (J.atk && claw && ph >= 2) {
    const n2 = g.wpn === 'talons' ? 3 : 2, a0 = ph === 2 ? [-2, -56] : [16, -44], a1 = ph === 2 ? [27, -44] : [22, -30], cc = ph === 2 ? [10, -64] : [26, -40];
    for (let k = 0; k < n2; k++) { const o = (k - (n2 - 1) / 2) * 1.3; let pq = null;
      for (let t = ph === 2 ? 0.25 : 0.1; t <= 0.96; t += 0.06) { const q = [(1 - t) * (1 - t) * a0[0] + 2 * t * (1 - t) * cc[0] + t * t * a1[0] + o * 0.3, (1 - t) * (1 - t) * a0[1] + 2 * t * (1 - t) * cc[1] + t * t * a1[1] + o]; if (pq) A.hair(pq[0], pq[1], q[0], q[1], t > 0.7 ? 'rgba(236,244,220,0.8)' : t > 0.45 ? 'rgba(190,220,170,0.55)' : 'rgba(150,170,190,0.35)'); pq = q; } }
  }
  pxWeapon(A, g, J, 'miasmancer');
  };
  if (armFirst) drawNear();
  // ---------------------------------------------------------------- the head, turned three-quarters
  const wide = g.head === 'hood' && T >= 1;          // a hat instead of a hood
  A.limb([[n[0] + 0.5, n[1] + 1], [h[0] + 0.8, h[1] + 3]], 1.45, 1.35, 'zoSkin', {});
  // the collar standing around the neck
  A.shape((cx, X, Y) => { cx.moveTo(X(J.shF[0] - 1), Y(n[1] + 2.2)); cx.quadraticCurveTo(X(n[0] - 2), Y(n[1] - 1.2), X(n[0] + 1), Y(n[1] - 0.4)); cx.lineTo(X(n[0] + 2), Y(n[1] + 1.6)); cx.quadraticCurveTo(X(n[0] - 1.5), Y(n[1] + 1.6), X(J.shF[0] - 1), Y(n[1] + 2.2)); }, T === 0 ? 'zoWhite' : 'zoVerm', { sh: 0.8, hl: 0.5 });
  // the ponytail, tied high with white paper cord, streaming back
  const tie = [h[0] - 2.6, h[1] - 4.4];
  if (g.head !== 'hood' || wide) {
    const pt = [tie, [tie[0] - 1.6 - tr * 0.5, tie[1] + 1.4 + flut(3) * 0.2], [tie[0] - 2.6 - tr * 1.1, tie[1] + 4.6 - tr * 0.3 + flut(4) * 0.4], [tie[0] - 3 - tr * 1.8, tie[1] + 8.5 - tr * 0.8 + flut(5) * 0.6]];
    A.limb(pt, 1.15, 0.4, 'hair', { sh: 0.6, hl: 0.4 });
    A.hair(pt[0][0] - 0.5, pt[0][1] - 0.3, pt[2][0], pt[2][1] - 0.6, MAT.hair[4]);
  }
  A.shape((cx, X, Y) => {           // the face: a narrow skull, fine jaw
    cx.moveTo(X(h[0] - 3.3), Y(h[1] + 0.4));
    cx.quadraticCurveTo(X(h[0] - 3.6), Y(h[1] - 5), X(h[0] + 0.5), Y(h[1] - 5.1));
    cx.quadraticCurveTo(X(h[0] + 3.8), Y(h[1] - 4.9), X(h[0] + 4), Y(h[1] - 1.6));
    cx.lineTo(X(h[0] + 4.6), Y(h[1] + 0.4)); cx.lineTo(X(h[0] + 3.9), Y(h[1] + 0.9));
    cx.lineTo(X(h[0] + 3.8), Y(h[1] + 2.2)); cx.lineTo(X(h[0] + 2.8), Y(h[1] + 3.7));
    cx.lineTo(X(h[0] + 1.2), Y(h[1] + 3.9)); cx.quadraticCurveTo(X(h[0] - 1.4), Y(h[1] + 3.2), X(h[0] - 3.3), Y(h[1] + 0.4));
  }, 'zoSkin', { sh: 1.4 });
  const face = () => {
    A.poly([[h[0] + 0.3, h[1] - 0.4], [h[0] + 4.1, h[1] - 0.4], [h[0] + 3.8, h[1] + 2.2], [h[0] + 2.8, h[1] + 3.7], [h[0] + 1.2, h[1] + 3.9], [h[0] - 0.3, h[1] + 2.4]], 'zoSkin', { flat: true, tone: -1.2, contour: false, edge: false });
    A.hair(h[0] + 0.7, h[1] - 1.8, h[0] + 4, h[1] - 2.1, S[0]);                                        // the brow
    A.hair(h[0] + 1, h[1] - 0.7, h[0] + 2.4, h[1] - 0.9, '#0c0808'); A.hair(h[0] + 3.3, h[1] - 0.8, h[0] + 3.9, h[1] - 0.9, '#0c0808');   // narrow eyes
    A.fine(h[0] + 2, h[1] - 0.8, ZO_GLINT); A.fine(h[0] + 3.6, h[1] - 0.8, M[3]);
    A.fine(h[0] + 3.9, h[1] - 0.2, V[4]); A.fine(h[0] + 1, h[1] - 0.1, V[3]);   // a stroke of vermilion under each eye
    A.fine(h[0] + 4.3, h[1] - 0.1, S[3]); A.fine(h[0] + 1.3, h[1] + 1, S[3]);
    A.hair(h[0] + 2.6, h[1] + 2.6, h[0] + 3.6, h[1] + 2.5, S[0]); A.fine(h[0] + 3.1, h[1] + 3, V[2]);   // a small mouth, lip-red
  };
  face();
  if (g.head !== 'hood') {
    // black hair drawn back hard from the brow, a few strands loose at the temple
    A.shape((cx, X, Y) => { cx.moveTo(X(h[0] + 3), Y(h[1] - 4.7)); cx.quadraticCurveTo(X(h[0] - 3.4), Y(h[1] - 6.2), X(h[0] - 3.9), Y(h[1] - 1)); cx.lineTo(X(h[0] - 3.3), Y(h[1] + 2.4)); cx.lineTo(X(h[0] - 1.6), Y(h[1] + 1.2)); cx.quadraticCurveTo(X(h[0] - 1.2), Y(h[1] - 2.2), X(h[0] + 0.4), Y(h[1] - 3)); cx.quadraticCurveTo(X(h[0] + 2), Y(h[1] - 3.6), X(h[0] + 3.6), Y(h[1] - 3.6)); }, 'hair', { sh: 1, hl: 0.5 });
    for (let i = 0; i < 3; i++) A.hair(h[0] + 1.5 - i * 1.2, h[1] - 4.6 + i * 0.1, tie[0] + 0.2, tie[1] + 0.3, MAT.hair[i % 2 ? 1 : 3]);
    A.hair(h[0] - 0.3, h[1] - 3, h[0] - 0.6 + J.sw * 0.2, h[1] + 1, MAT.hair[3]);
    A.ell(tie[0], tie[1], 1, 0.9, 'hair', { sh: 0.5 }); A.hair(tie[0] - 0.3, tie[1] - 0.8, tie[0] - 0.3, tie[1] + 0.8, MAT.zoPaper[4]);
    // a headband across the brow, tails trailing (a lacquered plate on it with mail)
    if (g.head !== 'mask') {
      const hb0 = [h[0] - 3.6, h[1] - 2.6], hb1 = [h[0] + 3.7, h[1] - 3.5];
      A.line(hb0[0], hb0[1], hb1[0], hb1[1], T === 1 ? MAT.zoVerm[3] : MAT.zoPaper[3]); A.hair(hb0[0], hb0[1] + 0.9, hb1[0], hb1[1] + 0.9, T === 1 ? V[1] : MAT.zoPaper[1]);
      A.line(hb0[0], hb0[1] + 0.3, hb0[0] - 2 - tr, hb0[1] + 2 + flut(6) * 0.5, T === 1 ? V[2] : MAT.zoPaper[2]); A.line(hb0[0], hb0[1] + 0.5, hb0[0] - 1.2 - tr * 0.8, hb0[1] + 3.4 + flut(7) * 0.5, T === 1 ? V[1] : MAT.zoPaper[1]);
      if (T === 2) { A.poly([[h[0] + 0.6, h[1] - 4.6], [h[0] + 3.8, h[1] - 5], [h[0] + 3.9, h[1] - 2.9], [h[0] + 0.7, h[1] - 2.6]], 'zoLacq', { sh: 0.5, hl: 0.5, metal: true }); A.fine(h[0] + 2.3, h[1] - 3.8, g.trim ? MAT.gold[4] : V[4]); }
    }
  }
  // ---- the mask: a white kitsune half-mask; with mail, a red lacquered oni menpo over the jaw
  if (g.head === 'mask') {
    if (T < 2) {
      for (const [ex, tn] of [[-1.4, -1.4], [1.6, 0]]) A.poly([[h[0] + ex - 0.2, h[1] - 3.8], [h[0] + ex + 0.6, h[1] - 8.4], [h[0] + ex + 2.4, h[1] - 3.8]], 'zoPaper', { sh: 0.6, hl: 0.5, tone: tn });
      A.poly([[h[0] + 1.9, h[1] - 4.2], [h[0] + 2.2, h[1] - 7], [h[0] + 3.1, h[1] - 4.2]], V[3], { flat: true, contour: false, edge: false });
      A.shape((cx, X, Y) => { cx.moveTo(X(h[0] - 0.4), Y(h[1] - 4.8)); cx.quadraticCurveTo(X(h[0] + 3), Y(h[1] - 5.4), X(h[0] + 4.3), Y(h[1] - 2)); cx.lineTo(X(h[0] + 6.8), Y(h[1] + 0.6)); cx.lineTo(X(h[0] + 6.2), Y(h[1] + 1.5)); cx.lineTo(X(h[0] + 3.8), Y(h[1] + 1.7)); cx.lineTo(X(h[0] + 1), Y(h[1] + 1.6)); cx.quadraticCurveTo(X(h[0] - 0.8), Y(h[1] - 1), X(h[0] - 0.4), Y(h[1] - 4.8)); }, 'zoPaper', { sh: 0.5, hl: 0.6, tone: 0.8 });
      A.hair(h[0] + 1, h[1] - 1.2, h[0] + 2.5, h[1] - 0.8, '#0a0608'); A.hair(h[0] + 3.3, h[1] - 1, h[0] + 3.9, h[1] - 0.7, '#0a0608'); A.fine(h[0] + 1.9, h[1] - 1, ZO_GLINT);
      A.hair(h[0] + 0.8, h[1] - 1.9, h[0] + 2.8, h[1] - 2.3, V[4]); A.hair(h[0] + 1.2, h[1] - 2.6, h[0] + 1.8, h[1] - 3.8, V[3]); A.hair(h[0] + 2.4, h[1] - 2.8, h[0] + 3.2, h[1] - 4, V[3]);   // flame marks at the brow
      A.hair(h[0] + 4.6, h[1] - 0.2, h[0] + 6.2, h[1] + 0.9, V[3]); A.fine(h[0] + 6.6, h[1] + 0.8, '#0a0608');   // the snout's red line and the black nose
      A.hair(h[0] - 0.8, h[1] - 3, h[0] - 3.5, h[1] - 2.2, MAT.zoVerm[2]);   // its cord
    } else {
      A.shape((cx, X, Y) => { cx.moveTo(X(h[0] - 0.2), Y(h[1] + 0.4)); cx.lineTo(X(h[0] + 4.8), Y(h[1] - 0.2)); cx.lineTo(X(h[0] + 5.2), Y(h[1] + 1.6)); cx.lineTo(X(h[0] + 4.2), Y(h[1] + 4.2)); cx.lineTo(X(h[0] + 1.4), Y(h[1] + 4.7)); cx.quadraticCurveTo(X(h[0] - 0.8), Y(h[1] + 3), X(h[0] - 0.2), Y(h[1] + 0.4)); }, 'zoLacqRed', { sh: 0.9, hl: 0.5 });
      A.hair(h[0] + 1.6, h[1] + 2.6, h[0] + 4.6, h[1] + 2.3, '#0a0306');
      for (let i = 0; i < 4; i++) A.fine(h[0] + 1.9 + i * 0.75, h[1] + 2.1 + (i % 2) * 0.1, MAT.bone[4]);
      A.hair(h[0] + 2, h[1] + 2.9, h[0] + 2.1, h[1] + 3.6, MAT.bone[3]); A.hair(h[0] + 4, h[1] + 2.6, h[0] + 4, h[1] + 3.4, MAT.bone[3]);   // fangs
      A.hair(h[0] + 1.2, h[1] + 1, h[0] + 3.2, h[1] + 1.6, MAT.zoLacqRed[0]); A.hair(h[0] + 3, h[1] + 0.2, h[0] + 5, h[1] + 0.6, MAT.zoLacqRed[4]);
      A.hair(h[0] + 2.2, h[1] - 0.8, h[0] + 3.2, h[1] - 0.9, '#0a0608'); A.fine(h[0] + 2.4, h[1] - 0.9, ZO_GLINT);  // eyes above it burn green
      if (!wide) for (const ex of [-0.6, 2.2]) A.limb([[h[0] + ex, h[1] - 4.6], [h[0] + ex - 0.3, h[1] - 6.4], [h[0] + ex - 1.2, h[1] - 7.6]], 0.7, 0.25, 'bone', { sh: 0.4, hl: 0.4, tone: ex < 0 ? -1.2 : 0 });
    }
  }
  // ---- the hood: a white zukin wrapped over the head and mouth (start); a straw kasa (robe); a lacquered jingasa (mail)
  if (g.head === 'hood') {
    if (!wide) {
      // the tails of the wrap first, streaming back from the knot at the nape
      const kn = [h[0] - 3.6, h[1] - 0.6];
      A.limb([kn, [kn[0] - 2 - tr * 0.8, kn[1] + 1.6 + flut(8) * 0.3], [kn[0] - 3.4 - tr * 1.6, kn[1] + 4.6 - tr * 0.4 + flut(9) * 0.5]], 0.9, 0.5, 'zoWhite', { sh: 0.5, hl: 0.4, tone: -0.2 });
      A.limb([kn, [kn[0] - 1.2 - tr * 0.6, kn[1] + 2.4], [kn[0] - 1.8 - tr * 1.1, kn[1] + 6 - tr * 0.3 + flut(10) * 0.4]], 0.9, 0.5, 'zoWhite', { sh: 0.5, hl: 0.4, tone: -0.9 });
      // the cloth wound close round the skull and over the mouth, only the eyes left bare
      A.shape((cx, X, Y) => { cx.moveTo(X(n[0] - 2.2), Y(n[1] + 1.8)); cx.lineTo(X(h[0] - 3.2), Y(h[1] + 3)); cx.quadraticCurveTo(X(h[0] - 4.8), Y(h[1] - 1.5), X(h[0] - 3), Y(h[1] - 4.8)); cx.quadraticCurveTo(X(h[0] + 0.5), Y(h[1] - 7.4), X(h[0] + 3.6), Y(h[1] - 4.6)); cx.lineTo(X(h[0] + 4.6), Y(h[1] - 2.4)); cx.lineTo(X(h[0] + 4.9), Y(h[1] + 0.8)); cx.lineTo(X(h[0] + 4.6), Y(h[1] + 2.6)); cx.quadraticCurveTo(X(h[0] + 3.6), Y(h[1] + 4.4), X(n[0] + 2.6), Y(n[1] + 1.8)); cx.closePath(); }, 'zoWhite', { sh: 1.2, hl: 0.7 });
      A.poly([[h[0] + 0.7, h[1] - 2.4], [h[0] + 4.7, h[1] - 2.5], [h[0] + 4.9, h[1] + 0.2], [h[0] + 0.7, h[1] + 0.3]], 'zoSkin', { flat: true, tone: -1, contour: false, edge: false });
      A.hair(h[0] + 1, h[1] - 1.1, h[0] + 2.4, h[1] - 1.2, '#0c0808'); A.hair(h[0] + 3.4, h[1] - 1.1, h[0] + 4.1, h[1] - 1.2, '#0c0808'); A.fine(h[0] + 2, h[1] - 1.1, ZO_GLINT); A.fine(h[0] + 3.8, h[1] - 1.1, M[3]);
      A.hair(h[0] + 0.6, h[1] - 2.6, h[0] + 4.7, h[1] - 2.7, MAT.zoWhite[0]); A.hair(h[0] + 0.6, h[1] + 0.5, h[0] + 5, h[1] + 0.3, MAT.zoWhite[4]);
      // the turns of the wrap
      A.hair(h[0] - 3.4, h[1] - 3.4, h[0] + 0.4, h[1] - 5.6, MAT.zoWhite[1]); A.hair(h[0] - 3.8, h[1] - 0.6, h[0] + 0.4, h[1] - 3, MAT.zoWhite[1]); A.hair(h[0] - 3, h[1] + 2, h[0] + 0.6, h[1] + 1.6, MAT.zoWhite[1]);
      A.hair(h[0] + 1.2, h[1] + 2, h[0] + 4.2, h[1] + 1.6, MAT.zoWhite[3]);
      A.ell(kn[0] + 0.3, kn[1], 1, 0.9, 'zoWhite', { sh: 0.5, hl: 0.4, tone: -0.6 });
    } else {
      // the brim first, the crown over it, the face sunk in its shadow
      const hm = T === 1 ? 'zoStraw' : 'zoLacq', H = MAT[hm], bc = [h[0] + 0.6, h[1] - 4], rx = T === 1 ? 8.6 : 7.6, ry = T === 1 ? 2.4 : 2;
      A.poly([[h[0] + 0.3, h[1] - 0.6], [h[0] + 4.1, h[1] - 0.6], [h[0] + 3.9, h[1] + 1.8], [h[0] + 0.2, h[1] + 1.4]], 'zoSkin', { flat: true, tone: -2, contour: false, edge: false });
      if (g.head === 'hood' && g.head !== 'mask') { A.fine(h[0] + 2, h[1] - 0.8, ZO_GLINT); A.fine(h[0] + 3.6, h[1] - 0.8, M[3]); }
      // seen from a little above: the underside of the brim is a thin dark lip, the cone fills the rest
      const ap = [bc[0] + 0.2, bc[1] - (T === 1 ? 6.2 : 3.8)];
      A.ell(bc[0], bc[1] + 0.3, rx, ry, hm, { sh: 0.8, hl: 0.4, tone: -1.6 });
      A.shape((cx, X, Y) => { cx.moveTo(X(bc[0] - rx), Y(bc[1] + 0.2)); cx.quadraticCurveTo(X(bc[0] - rx * 0.45), Y(bc[1] - 1.2), X(ap[0]), Y(ap[1])); cx.quadraticCurveTo(X(bc[0] + rx * 0.45), Y(bc[1] - 1.4), X(bc[0] + rx), Y(bc[1] - 0.2)); cx.quadraticCurveTo(X(bc[0]), Y(bc[1] + ry * 0.75), X(bc[0] - rx), Y(bc[1] + 0.2)); }, hm, { sh: 1.2, hl: 0.8 });
      if (T === 1) for (let i = 1; i < 8; i++) { const u = i / 8, bx = bc[0] - rx + 2 * rx * u, by = bc[1] + 0.2 + Math.sin(u * 3.1416) * ry * 0.7 - 0.4; A.hair(ap[0], ap[1] + 0.6, bx, by, H[i % 2 ? 1 : 3]); }
      else { A.hair(bc[0] - rx * 0.7, bc[1] - 0.4, ap[0] - 0.3, ap[1] + 0.3, H[4]); A.ell(bc[0] + 2.2, bc[1] - 1.8, 0.9, 0.8, g.trim ? 'gold' : 'zoLacqRed', { sh: 0.3, hl: 0.3 }); }
      A.hair(bc[0] - rx, bc[1] + 0.2, bc[0] + rx, bc[1] - 0.2, H[0]);
      if (g.trim) A.hair(bc[0] - rx + 0.5, bc[1] + 0.9, bc[0] + rx - 0.5, bc[1] + 0.8, MAT.gold[3]);
      A.hair(h[0] - 0.8, bc[1] + 1.6, h[0] + 0.9, h[1] + 3.9, T === 1 ? MAT.zoPaper[2] : V[2]);   // the chin cord
      zoShide(A, bc[0] - rx + 0.8, bc[1] + 0.6, 5, tr * 1.1, flut(8), -0.5);
      zoShide(A, bc[0] - rx * 0.4, bc[1] + 1.4, 4.5, tr * 0.9, flut(9), -1);
    }
  }
  if (!armFirst) drawNear();
  // seeping from the fingers of a robed purifier: a thread of the held rot
  if (!J.cast && T >= 1) { const f = [J.haN[0] + 0.6, J.haN[1] + 1.6]; for (let i = 0; i < 2; i++) { const t = ((ph + i * 2) % 4) / 4; A.fine(f[0] - tr * t, f[1] + 0.8 - t * 3, i ? ZO_VIO : M[3]); } }
  // ---- casting: the rot drawn out of the gourd, up the arm, gathered in the palm; the far hand holds an ofuda
  if (J.cast) {
    const q = [J.haN[0] + 2.2 + (ph === 2 ? 1.5 : 0), J.haN[1] - 1.8 - ph * 0.4], r = [0.9, 1.4, 2, 1.8][ph];
    const gp = [w[0] + 3.4, w[1] + 1.2];
    for (let i = 0; i < 6; i++) { const t = (i / 6 + ph * 0.09) % 1, cx0 = gp[0] + (q[0] - gp[0]) * t + Math.sin(t * 9 + ph) * 1.4, cy0 = gp[1] + (q[1] - gp[1]) * t; A.fine(cx0, cy0, i % 2 ? ZO_VIO : M[3]); }
    A.ell(q[0], q[1], r + 0.9, r + 0.7, 'rgba(90,50,120,0.45)', { flat: true, contour: false, edge: false });
    A.ell(q[0], q[1], r, r * 0.9, 'zoMiasma', { sh: 0.6, hl: 0.6 }); A.fine(q[0] - 0.4, q[1] - 0.4, '#f0ffc0');
    for (let i = 0; i < 5; i++) { const a = i * 1.26 + ph * 0.9; A.fine(q[0] + Math.cos(a) * (r + 1.6), q[1] + Math.sin(a) * (r + 1.3), i % 2 ? M[4] : ZO_VIO); }
    if (ph === 2) for (let i = 0; i < 4; i++) A.hair(q[0] + 1.5 + i * 1.2, q[1] - 0.8 + i * 0.4, q[0] + 3 + i * 1.6, q[1] - 0.6 + i * 0.5, i % 2 ? 'rgba(150,110,190,0.6)' : 'rgba(180,230,120,0.7)');
    // the far hand: two fingers raised, a paper ofuda between them
    const o = [J.haF[0] + 1.2, J.haF[1] - 2.4];
    A.poly([[o[0] - 0.6, o[1] - 2.2], [o[0] + 0.8, o[1] - 2.4], [o[0] + 1, o[1] + 1.4], [o[0] - 0.4, o[1] + 1.6]], 'zoPaper', { sh: 0.4, hl: 0.4, tone: -0.4 });
    A.hair(o[0] + 0.2, o[1] - 1.6, o[0] + 0.3, o[1] + 0.8, V[3]); A.fine(o[0] + 0.1, o[1] - 0.8, V[2]);
    A.lamp(q[0], q[1], [150, 230, 110], 14 + ph * 2, 0.8);
  }
  // the light: the cold sky behind, the red paper lantern's warmth from in front and below
  A.rim([120, 128, 160], 0.32);
  A.lamp(12, -24, [255, 200, 140], 30, 0.5);
};
