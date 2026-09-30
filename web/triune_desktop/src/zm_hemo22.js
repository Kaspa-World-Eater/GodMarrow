
// =================================================================== v0.22c: the HEMOMANCER, redrawn as a penitent of the Wheel
// Seen three-quarters from the front, lit like a Baroque altarpiece: one cold light from above and behind, the warm
// red of the heart-lamp from below and in front, everything else sunk in shadow. A flagellant of Nol-Shogthuth: a
// shaven head anointed with a stripe of blood, arms bound in bandages that never stop seeping, a long robe that
// drags in the dirt. The starting robe is undyed sackcloth and a rope; a found robe dyes it crimson and adds a
// torn shoulder-cape and a bronze wheel; mail adds a cuirass of cured red hide with bones sewn across it and an
// iron pauldron hung with chain. A hood raises the cowl into a peak with only two red eyes in the dark of it.
defMat('hemoFlesh', '#120a0c', '#3a2224', '#6a4842', '#9c7462', '#c49a80');
defMat('sackcloth', '#0b0907', '#1f1a14', '#372e24', '#524434', '#6c5a44');
defMat('penRed', '#090205', '#22070c', '#3e0d14', '#64181e', '#8a2828');
defMat('bandage', '#1e1814', '#463a30', '#726252', '#a08c78', '#c4b098');
defMat('bloodWet', '#160204', '#360408', '#640a10', '#961418', '#d4402e');
defMat('rope', '#140e08', '#34281a', '#5a4a30', '#806a46', '#a48a5c');
HPX.hemomancer = function (A, pose, ph, g, J) {
  const T = g.tier, S = MAT.hemoFlesh, robe = T === 0 ? 'sackcloth' : 'penRed', R = MAT[robe], BW = MAT.bloodWet;
  const FAR = { contour: false, tone: -1.6 }, NEAR = {};
  const h = J.head, n = J.neck, c = J.chest, w = J.waist, hip = J.hip;
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  // ---- a bandaged forearm: strips wound on the diagonal, blood coming through at the wrist
  const bandage = (e, ha, far) => {
    for (let i = 0; i < 5; i++) {
      const k = 0.12 + i * 0.16, p = lerp(e, ha, k), q = lerp(e, ha, k + 0.12), dx = ha[0] - e[0], dy = ha[1] - e[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * 1.9, ny = dx / l * 1.9;
      A.poly([[p[0] - nx, p[1] - ny], [p[0] + nx, p[1] + ny], [q[0] + nx, q[1] + ny + 0.3], [q[0] - nx, q[1] - ny + 0.3]], 'bandage', { bevel: 0.5, contour: true, tone: far ? -1.6 : 0 });
    }
    const b = lerp(e, ha, 0.78); A.fine(b[0], b[1], BW[3]); A.fine(b[0] + 0.5, b[1] + 0.4, BW[2]); A.fine(b[0] - 0.4, b[1] + 0.8, BW[3]);
    const b2 = lerp(e, ha, 0.4); A.fine(b2[0] + 0.3, b2[1], BW[2]);
  };
  const hand = (e, ha, o, far) => {
    const dx = ha[0] - e[0], dy = ha[1] - e[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, ang = Math.atan2(uy, ux);
    A.ell(ha[0] + ux * 0.9, ha[1] + uy * 0.9, 1.6, 1.25, 'hemoFlesh', { ...o, round: 1, rot: ang });
    for (let i = 0; i < 4; i++) { const a = ang + (i - 1.5) * 0.3, f1 = [ha[0] + ux * 1.8 + Math.cos(a) * 1.4, ha[1] + uy * 1.8 + Math.sin(a) * 1.4], f2 = [f1[0] + Math.cos(a + 0.45) * 1.5, f1[1] + Math.sin(a + 0.45) * 1.5];
      A.limb([[ha[0] + ux * 1.4, ha[1] + uy * 1.4], f1, f2], 0.5, 0.38, 'hemoFlesh', { ...o, round: 0.4, edge: false }); A.fine(f2[0], f2[1], far ? S[1] : BW[3]); }   // fingertips red
  };
  const arm = (s, e, ha, far) => {
    const o = far ? FAR : NEAR;
    A.limb([s, lerp(s, e, 0.5), e], 2.5, 1.9, 'hemoFlesh', o);                     // upper arm, one form
    if (!far) { const m = lerp(s, e, 0.4); A.hair(m[0] - 1.6, m[1] - 0.8, m[0] - 1.1, m[1] + 2.2, S[3]); A.fine(e[0] + 0.8, e[1] - 0.2, S[0]); }   // the lit edge of the bicep, the elbow
    A.limb([e, lerp(e, ha, 0.5), ha], 2, 1.4, 'hemoFlesh', o);
    bandage(e, ha, far);
    hand(e, ha, o, far);
  };
  // ---- a lower leg under the hem, bound feet
  const leg = (k, a, far) => {
    const o = far ? FAR : NEAR;
    A.limb([k, lerp(k, a, 0.5), a], 1.9, 1.3, 'hemoFlesh', o);
    if (!far) A.hair(k[0] + 1.2, k[1] + 1.5, a[0] + 0.9, a[1] - 1.5, S[3]);        // the shin's edge catching the lamp
    // the foot: heel, arch, toes; wrapped in bandage across the instep
    A.shape((cx, X, Y) => { cx.moveTo(X(a[0] - 2), Y(Math.min(0, a[1] + 3))); cx.lineTo(X(a[0] - 1.6), Y(a[1] - 0.5)); cx.lineTo(X(a[0] + 1.2), Y(a[1] - 0.5)); cx.quadraticCurveTo(X(a[0] + 2.5), Y(a[1] + 1.5), X(a[0] + 5.2), Y(Math.min(0, a[1] + 2.4))); cx.lineTo(X(a[0] + 5.4), Y(Math.min(0, a[1] + 3))); }, 'hemoFlesh', { ...o, round: 1 });
    A.poly([[a[0] - 1.7, a[1] + 0.4], [a[0] + 1.3, a[1] - 0.2], [a[0] + 2.4, a[1] + 1.6], [a[0] - 1.5, a[1] + 2]], T === 2 ? 'leather' : 'bandage', { ...o, bevel: 0.5, contour: true });
    if (!far) for (let i = 0; i < 3; i++) A.fine(a[0] + 3.4 + i * 0.7, Math.min(0, a[1] + 3) - 0.4, S[0]);   // toes
  };
  // ---------------------------------------------------------------- far arm, behind everything
  arm(J.shF, J.elF, J.haF, true);
  // ---------------------------------------------------------------- legs
  leg(J.kneeF, J.ankF, true);
  leg(J.kneeN, J.ankN, false);
  // ---------------------------------------------------------------- the robe below the belt
  // a quad from the waist to the hem, pushed forward by the near knee and trailing behind; folds hang in it
  const sway = J.walk ? J.sw : 0, hemY = -9 + (T === 0 ? 1.5 : 0);
  const WB = [w[0] - 5.8, w[1] + 0.5], WF = [w[0] + 5.2, w[1] + 0.5];
  const HF = [Math.max(J.kneeN[0] + 4, 8), hemY - 1.5], HB = [Math.min(J.kneeF[0] - 5.5, -9.5) - sway * 1.2 - (J.walk ? 1 : 0), hemY + 0.5];
  const RQ = (u, v) => { const a = lerp(WB, WF, u), b = lerp(HB, HF, u); return lerp(a, b, v); };
  A.shape((cx, X, Y) => {
    cx.moveTo(X(WB[0]), Y(WB[1])); cx.lineTo(X(WF[0]), Y(WF[1]));
    cx.quadraticCurveTo(X(WF[0] + 1.5), Y((WF[1] + HF[1]) / 2), X(HF[0]), Y(HF[1]));
    // the torn hem, front to back
    const N = 9; for (let i = 1; i <= N; i++) { const u = 1 - i / N, p = RQ(u, 1), d = (i % 2) * 1.4 + (i % 3 === 0 ? 1.6 : 0); cx.lineTo(X(p[0]), Y(p[1] + d)); }
    cx.quadraticCurveTo(X(WB[0] - 2.5), Y((WB[1] + HB[1]) / 2), X(WB[0]), Y(WB[1]));
  }, robe, { round: 5 });
  // folds: a shadowed trough and a lit ridge beside it, widening to the hem
  const folds = [0.18, 0.42, 0.63, 0.84];
  folds.forEach((u, i) => {
    const du = 0.035 + i * 0.004, sv = 0.18 + (i % 2) * 0.1, sh = (J.walk ? J.sw * 0.04 * (i - 1.5) : 0);
    const a = RQ(u, sv), b = RQ(u - du + sh, 1), b2 = RQ(u + du + sh, 1);
    A.poly([a, [b[0], b[1] + 0.8], [b2[0], b2[1] + 0.8]], robe, { flat: true, tone: -1.4, contour: false, edge: false });
    const la = RQ(u + 0.05, sv + 0.1), lb = RQ(u + 0.06 + sh, 0.96);
    A.line(la[0], la[1], lb[0], lb[1], R[3]);
  });
  // blood soaked into the hem and splashed up it
  for (let i = 0; i < 7; i++) { const p = RQ(0.1 + i * 0.13, 0.86 + (i % 3) * 0.04); A.fine(p[0], p[1], i % 2 ? BW[1] : BW[2]); }
  if (g.trim) { const N = 9; for (let i = 0; i < N; i++) { const p = RQ(i / (N - 1), 0.93); A.fine(p[0], p[1], MAT.gold[3]); } }
  // ---------------------------------------------------------------- the torso, three-quarters to the viewer
  const torso = (cx, X, Y) => {
    cx.moveTo(X(J.shF[0] - 1.8), Y(J.shF[1] + 0.5));
    cx.quadraticCurveTo(X(J.shF[0]), Y(n[1] + 0.5), X(n[0]), Y(n[1] + 1.5));
    cx.quadraticCurveTo(X(J.shN[0] - 1), Y(n[1] + 1), X(J.shN[0] + 2), Y(J.shN[1] + 0.2));
    cx.quadraticCurveTo(X(c[0] + 6.5), Y(c[1] - 1), X(c[0] + 5), Y(c[1] + 3));
    cx.quadraticCurveTo(X(w[0] + 4.5), Y(w[1] - 2), X(WF[0]), Y(w[1] + 1));
    cx.lineTo(X(WB[0]), Y(w[1] + 1));
    cx.quadraticCurveTo(X(c[0] - 6), Y(c[1] + 1), X(J.shF[0] - 1.8), Y(J.shF[1] + 0.5));
  };
  A.shape(torso, robe, { round: 4 });
  // the V of the neckline, the chest bare in it: a breastbone, and the Wheel cut into the skin over the heart
  A.poly([[n[0] - 1, n[1] + 1.2], [n[0] + 4, n[1] + 1], [c[0] + 2.2, c[1] + 1.5]], 'hemoFlesh', { round: 2 });
  A.hair(n[0] + 1.6, n[1] + 2.5, c[0] + 2, c[1] + 0.5, S[1]);
  { const q = [c[0] + 1.6, c[1] - 1.8]; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.2832; A.fine(q[0] + Math.cos(a) * 1.1, q[1] + Math.sin(a) * 1.1, BW[2]); } A.fine(q[0], q[1], BW[3]); A.hair(q[0], q[1] + 1, q[0] + 0.3, q[1] + 3, BW[1]); }
  // torso folds, pulled toward the belt
  A.poly([[c[0] - 3, c[1] - 2], [w[0] - 1.5, w[1]], [w[0] - 3, w[1]]], robe, { flat: true, tone: -1.4, contour: false, edge: false });
  A.poly([[c[0] + 3.5, c[1] + 1], [w[0] + 2.8, w[1]], [w[0] + 1.6, w[1]]], robe, { flat: true, tone: -1.4, contour: false, edge: false });
  A.line(c[0] - 1.5, c[1] - 1, w[0] - 0.5, w[1] - 0.5, R[3]);
  // ---- tier 2: a cuirass of cured red hide with bones sewn across it, an iron pauldron hung with chain
  if (T === 2) {
    A.shape((cx, X, Y) => { cx.moveTo(X(c[0] - 4.5), Y(c[1] - 3.5)); cx.quadraticCurveTo(X(c[0]), Y(c[1] - 6), X(c[0] + 5.5), Y(c[1] - 2)); cx.quadraticCurveTo(X(c[0] + 5.5), Y(c[1] + 4), X(w[0] + 3.5), Y(w[1] - 0.5)); cx.lineTo(X(w[0] - 4), Y(w[1] - 0.5)); cx.quadraticCurveTo(X(c[0] - 5.5), Y(c[1] + 1), X(c[0] - 4.5), Y(c[1] - 3.5)); }, 'leatherRed', { round: 3 });
    for (let i = 0; i < 3; i++) { const y = c[1] - 1.8 + i * 2.8; A.limb([[c[0] - 3.8 + i * 0.4, y + 0.8], [c[0] + 0.5, y - 0.4], [c[0] + 4.8 - i * 0.5, y + 0.4]], 0.85, 0.6, 'boneOld', { round: 0.8 }); A.fine(c[0] - 1.8, y + 1.5, MAT.leather[0]); A.fine(c[0] + 2.6, y + 1.3, MAT.leather[0]); }
    for (let i = 0; i < 6; i++) A.fine(c[0] + 4.8 - i * 0.2, c[1] - 1 + i * 1.3, MAT.bone[3]);   // the stitching up the side
  }
  // ---- the rope belt (a leather one with mail), its knot and two hanging ends that swing
  if (T === 2) { A.poly([[w[0] - 5.9, w[1] - 0.8], [w[0] + 5.3, w[1] - 1.2], [w[0] + 5.3, w[1] + 1], [w[0] - 5.9, w[1] + 1.4]], 'leather', { bevel: 0.6 }); A.stud(w[0] + 1.2, w[1] - 0.4, g.trim ? 'gold' : 'steel'); A.stud(w[0] - 2.4, w[1] - 0.2, 'steel'); }
  else {
    A.limb([[w[0] - 5.9, w[1] + 0.3], [w[0], w[1] - 0.2], [w[0] + 5.3, w[1] - 0.2]], 0.95, 0.95, 'rope', { round: 0.8 });
    for (let i = 0; i < 9; i++) A.hair(w[0] - 5.6 + i * 1.2, w[1] - 0.6, w[0] - 5.1 + i * 1.2, w[1] + 0.7, MAT.rope[1]);   // the twist of the rope
  }
  { const k = [w[0] + 2.4, w[1] + 0.6], sw = J.walk ? J.sw * 1.2 : 0; A.ell(k[0], k[1] + 0.4, 1.1, 1, 'rope', { round: 0.8 });
    A.limb([k, [k[0] + 0.6 + sw * 0.5, k[1] + 4], [k[0] + 0.2 + sw, k[1] + 8]], 0.5, 0.4, 'rope', { round: 0.4 }); A.limb([k, [k[0] + 1.8 + sw * 0.4, k[1] + 3.5], [k[0] + 2.2 + sw * 0.8, k[1] + 6]], 0.5, 0.4, 'rope', { round: 0.4 });
    A.fine(k[0] + 0.2 + sw, k[1] + 8.6, MAT.rope[3]); }
  // ---- tier 1+: a torn shoulder-cape, a bronze wheel on a cord
  if (T >= 1) {
    A.shape((cx, X, Y) => {
      cx.moveTo(X(J.shF[0] - 3), Y(J.shF[1] + 5)); cx.quadraticCurveTo(X(J.shF[0] - 2.5), Y(n[1] - 1), X(n[0] + 0.5), Y(n[1] + 0.2));
      cx.quadraticCurveTo(X(J.shN[0] + 1), Y(n[1] + 0), X(J.shN[0] + 3.5), Y(J.shN[1] + 2.5));
      const pts = [[J.shN[0] + 2.8, J.shN[1] + 5.5], [J.shN[0] + 0.8, J.shN[1] + 4], [J.shN[0] - 0.5, J.shN[1] + 7], [c[0] - 1.5, c[1] - 1], [c[0] - 3, c[1] + 2.5], [J.shF[0] - 1, J.shF[1] + 6.5]];
      for (const [a, b] of pts) cx.lineTo(X(a), Y(b + (J.walk ? J.sw * 0.3 : 0)));
    }, 'clothBrown', { round: 3 });
    A.line(J.shF[0] - 1.5, J.shF[1] + 1, n[0] + 0.5, n[1] + 1, MAT.clothBrown[3]);
    A.hair(n[0] + 1, n[1] + 1.5, c[0] + 2.4, c[1] - 3.2, MAT.leather[3]);
    const q = [c[0] + 2.6, c[1] - 3.2]; A.ell(q[0], q[1], 1.3, 1.3, g.trim ? 'gold' : 'bronze', { round: 1, metal: true }); A.fine(q[0], q[1], MAT.bronze[0]);
  }
  // ---- tier 0/1: the hood down, a thick roll of cloth around the neck (tier 1 in crimson)
  if (g.head !== 'hood') A.shape((cx, X, Y) => { cx.moveTo(X(J.shF[0] - 1.5), Y(n[1] + 2.5)); cx.quadraticCurveTo(X(J.shF[0] - 1), Y(n[1] - 3.5), X(n[0] + 1), Y(n[1] - 1.8)); cx.quadraticCurveTo(X(n[0] + 3.5), Y(n[1] - 1.5), X(n[0] + 3.2), Y(n[1] + 0.8)); cx.quadraticCurveTo(X(n[0]), Y(n[1] + 1.8), X(J.shF[0] - 1.5), Y(n[1] + 2.5)); }, robe, { round: 1.6 });
  // ---------------------------------------------------------------- the head, turned three-quarters
  A.limb([[n[0] + 0.5, n[1] + 1], [h[0] + 1, h[1] + 3.2]], 1.7, 1.6, 'hemoFlesh', { round: 1.4 });   // neck
  A.shape((cx, X, Y) => {           // the skull: cranium, brow, cheekbone, the long jaw
    cx.moveTo(X(h[0] - 3.6), Y(h[1] + 0.5));
    cx.quadraticCurveTo(X(h[0] - 4), Y(h[1] - 5.2), X(h[0] + 0.5), Y(h[1] - 5.4));
    cx.quadraticCurveTo(X(h[0] + 4), Y(h[1] - 5.2), X(h[0] + 4.3), Y(h[1] - 1.8));
    cx.lineTo(X(h[0] + 4.9), Y(h[1] + 0.4)); cx.lineTo(X(h[0] + 4.2), Y(h[1] + 0.9));        // the nose
    cx.lineTo(X(h[0] + 4.1), Y(h[1] + 2.4)); cx.lineTo(X(h[0] + 3.3), Y(h[1] + 3.9));        // lips, chin
    cx.lineTo(X(h[0] + 1.4), Y(h[1] + 4.3)); cx.quadraticCurveTo(X(h[0] - 1.5), Y(h[1] + 3.6), X(h[0] - 3.6), Y(h[1] + 0.5));
  }, 'hemoFlesh', { round: 3 });
  if (g.head === 'mask') {
    A.shape((cx, X, Y) => { cx.moveTo(X(h[0] + 0.3), Y(h[1] - 4.2)); cx.quadraticCurveTo(X(h[0] + 4.3), Y(h[1] - 4.5), X(h[0] + 5.2), Y(h[1] - 0.5)); cx.lineTo(X(h[0] + 4.6), Y(h[1] + 3)); cx.lineTo(X(h[0] + 2.8), Y(h[1] + 4.6)); cx.lineTo(X(h[0] + 0.6), Y(h[1] + 3.8)); cx.quadraticCurveTo(X(h[0] - 0.4), Y(h[1]), X(h[0] + 0.3), Y(h[1] - 4.2)); }, 'bone', { round: 2 });
    for (const ex of [1.6, 3.8]) { A.ell(h[0] + ex, h[1] - 1, 0.8, 0.6, '#0a0406', { flat: true, contour: false }); A.fine(h[0] + ex, h[1] - 1, '#ff3a2a'); }
    for (let i = 0; i < 5; i++) A.hair(h[0] + 1.3 + i * 0.6, h[1] + 2.2, h[0] + 1.3 + i * 0.6, h[1] + 3.2, '#1a0e0a');   // the stitched mouth
    A.hair(h[0] + 1.2, h[1] + 2.7, h[0] + 4, h[1] + 2.6, '#1a0e0a');
    A.hair(h[0] + 3.8, h[1] - 0.4, h[0] + 3.4, h[1] + 3, BW[2]);
  } else {
    // the face in shadow under the brow; the lamp finds the cheekbone and the bridge of the nose
    A.poly([[h[0] + 0.3, h[1] - 0.4], [h[0] + 4.4, h[1] - 0.4], [h[0] + 4.1, h[1] + 2.4], [h[0] + 3.3, h[1] + 3.9], [h[0] + 1.4, h[1] + 4.3], [h[0] - 0.4, h[1] + 2.6]], 'hemoFlesh', { round: 1.2, tone: -1.3, contour: false, edge: false });
    A.hair(h[0] + 0.6, h[1] - 1.7, h[0] + 4.4, h[1] - 1.9, S[0]);                                     // the brow
    A.ell(h[0] + 1.7, h[1] - 0.8, 1, 0.7, '#140808', { flat: true, contour: false, edge: false }); A.ell(h[0] + 3.8, h[1] - 0.8, 0.55, 0.6, '#140808', { flat: true, contour: false, edge: false });
    A.fine(h[0] + 1.9, h[1] - 0.8, '#ff5238'); A.fine(h[0] + 3.9, h[1] - 0.8, '#b8261e');
    A.fine(h[0] + 4.5, h[1] - 0.2, S[3]); A.fine(h[0] + 4.7, h[1] + 0.3, S[3]);                      // bridge of the nose
    A.fine(h[0] + 1.2, h[1] + 1, S[3]); A.fine(h[0] + 1.6, h[1] + 1.2, S[2]);                         // cheekbone
    A.hair(h[0] + 2.7, h[1] + 2.8, h[0] + 4, h[1] + 2.6, S[0]);                                       // the mouth
    A.line(h[0] + 2.7, h[1] - 4.4, h[0] + 2.9, h[1] - 1.9, BW[2]); A.fine(h[0] + 2.9, h[1] - 3.4, BW[4]);   // anointed: a thumb of blood down the brow
    A.hair(h[0] + 3.1, h[1] - 0.2, h[0] + 3.2, h[1] + 2, BW[2]); A.fine(h[0] + 3.2, h[1] + 2.6, BW[3]);  // and a tear of it

  }
  if (g.head !== 'hood') {
    // long lank black hair, parted, hanging behind the ear to the shoulders
    A.shape((cx, X, Y) => {
      cx.moveTo(X(h[0] + 1.6), Y(h[1] - 5.5)); cx.quadraticCurveTo(X(h[0] - 3.5), Y(h[1] - 6.4), X(h[0] - 4.2), Y(h[1] - 1.5));
      cx.lineTo(X(h[0] - 4.6 - J.sw * 0.3), Y(h[1] + 5.5)); cx.lineTo(X(h[0] - 3.6 - J.sw * 0.3), Y(h[1] + 8)); cx.lineTo(X(h[0] - 2.4), Y(h[1] + 6.5)); cx.lineTo(X(h[0] - 1.6), Y(h[1] + 8.4)); cx.lineTo(X(h[0] - 0.8), Y(h[1] + 5));
      cx.quadraticCurveTo(X(h[0] - 1.4), Y(h[1] + 1), X(h[0] - 0.2), Y(h[1] - 2)); cx.quadraticCurveTo(X(h[0] + 1), Y(h[1] - 3.6), X(h[0] + 3.5), Y(h[1] - 4.2)); cx.lineTo(X(h[0] + 1.6), Y(h[1] - 5.5));
    }, 'hair', { round: 2 });
    for (let i = 0; i < 4; i++) A.hair(h[0] - 0.4 - i * 0.9, h[1] - 5 + i * 0.3, h[0] - 3.2 - i * 0.4, h[1] + 3 + i * 1.2, MAT.hair[i % 2 ? 1 : 3]);
    A.hair(h[0] + 1.4, h[1] - 5.3, h[0] - 2.6, h[1] - 4.8, MAT.hair[4]);
  }
  if (g.head === 'hood') {
    // the cowl raised into a peak: the face lost in it, two red points where the eyes are
    const hm = T === 0 ? 'sackcloth' : 'penRed';
    A.shape((cx, X, Y) => {
      cx.moveTo(X(J.shF[0] - 2), Y(n[1] + 3)); cx.quadraticCurveTo(X(h[0] - 6), Y(h[1] - 2), X(h[0] - 3.2), Y(h[1] - 7.8));
      cx.quadraticCurveTo(X(h[0] + 1.5), Y(h[1] - 6.8), X(h[0] + 5.2), Y(h[1] - 2.5)); cx.lineTo(X(h[0] + 5), Y(h[1] + 4.5));
      cx.quadraticCurveTo(X(n[0] + 3.5), Y(n[1] + 2), X(J.shN[0] + 1), Y(J.shN[1] + 1)); cx.lineTo(X(J.shF[0] - 2), Y(n[1] + 3));
    }, hm, { round: 3 });
    A.shape((cx, X, Y) => { cx.moveTo(X(h[0] + 0.8), Y(h[1] - 3.6)); cx.quadraticCurveTo(X(h[0] + 4.5), Y(h[1] - 3.5), X(h[0] + 5), Y(h[1] + 0)); cx.lineTo(X(h[0] + 4.7), Y(h[1] + 4)); cx.quadraticCurveTo(X(h[0] + 1.5), Y(h[1] + 4), X(h[0] + 0.8), Y(h[1] - 3.6)); }, '#070304', { flat: true, contour: false, edge: false });
    A.fine(h[0] + 2.6, h[1] - 0.6, '#ff3a2a'); A.fine(h[0] + 4.1, h[1] - 0.6, '#b0201c'); A.fine(h[0] + 3.4, h[1] + 2.4, S[1]);
    A.hair(h[0] - 3.2, h[1] - 8, h[0] - 1, h[1] + 2, MAT[hm][1]); A.hair(h[0] - 3, h[1] - 8.3, h[0] + 2.5, h[1] - 6.2, MAT[hm][3]);
  }
  // ---------------------------------------------------------------- the near arm, over everything
  if (T === 2) A.ell(J.shN[0] + 0.3, J.shN[1] + 0.6, 3.3, 2.6, 'steelDark', { round: 2, metal: true, rot: -0.2 });
  arm(J.shN, J.elN, J.haN, false);
  if (T === 2) {
    A.ell(J.shN[0] + 0.3, J.shN[1] + 0.2, 3.4, 2.4, 'steelDark', { round: 2, metal: true, rot: -0.2 }); A.stud(J.shN[0] - 1.5, J.shN[1] + 0.3, 'steel'); A.stud(J.shN[0] + 2, J.shN[1] + 0.8, 'steel');
    for (let i = 0; i < 7; i++) { const p = lerp([J.shN[0] - 0.5, J.shN[1] + 2.4], [w[0] - 3, w[1] - 1], i / 6); A.fine(p[0], p[1] + (i % 2) * 0.4, MAT.steel[3 + (i % 2)]); A.fine(p[0] + 0.4, p[1] + 0.3, MAT.steel[0]); }
  }
  pxWeapon(A, g, J, 'hemomancer');
  // casting: blood drawn up out of the wound in the palm, hanging in a trembling ball that lights the face
  if (J.cast) {
    const q = [J.haN[0] + 2.4, J.haN[1] - 2.2 - ph * 0.6];
    A.ell(q[0], q[1], 1.6 + ph * 0.3, 1.5 + ph * 0.3, 'bloodWet', { round: 1.4 }); A.fine(q[0] - 0.5, q[1] - 0.6, '#ffc0a0');
    for (let i = 0; i < 4; i++) { const a = i * 1.7 + ph; A.fine(q[0] + Math.cos(a) * 2.6, q[1] + Math.sin(a) * 2.4, BW[3]); }
    A.hair(J.haN[0] + 1, J.haN[1], q[0] - 0.6, q[1] + 1.2, BW[2]);
    A.lamp(q[0], q[1], [255, 90, 70], 16, 0.8);
  }
  // the light: the cold sky behind, the heart-lamp's red from in front and below
  A.rim([120, 118, 150], 0.32);
  A.lamp(12, -24, [255, 110, 90], 30, 0.55);
};
