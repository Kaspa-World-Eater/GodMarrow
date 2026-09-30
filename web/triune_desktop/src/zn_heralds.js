// =================================================================== v0.22: the four god-Heralds and the Carrion Warden, painted at full density
// Each Herald is its god made into a priest of itself: the Marrow Pontiff (bone), the Wet Nurse (flesh), the Long
// Exhale (breath) and a Silent One (the Silence that killed the Triune). The Carrion Warden is the Act I jailer;
// its sprite is reused bone-white for the Ossuary Matron, so its main materials follow pal.tint.
// Painted with the cel painter (zj_px22.js): flat bands, a lit edge top-left, a shadow band bottom-right.
defMat('znGold', '#1a1004', '#553409', '#94641a', '#d09a34', '#ffe594');
defMat('znCope', '#030204', '#09070b', '#131016', '#201a22', '#2e252e');
defMat('znIvory', '#231f19', '#5c5446', '#978b74', '#c9bc9e', '#ece2c6');
defMat('znBone', '#1f1b15', '#5e5544', '#9c8f72', '#d0c3a0', '#f4ecd2');
const ZN = {
  T: (n, pal, k) => tintMat(n, pal && pal.tint, k),
  lerp: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k],
  poses(pose) { return { walk: pose === 'walk', wind: pose === 'wind', atk: pose === 'atk', idle: pose === 'idle' }; }
};

// a path in local coordinates: ['M', x, y], ['L', x, y], ['Q', cx, cy, x, y]; tf maps local to painter coordinates
ZN.path = (A, cmds, mat, o, tf = p => p) => A.shape((c, X, Y) => {
  for (const k of cmds) {
    if (k[0] === 'Q') { const q = tf([k[1], k[2]]), p = tf([k[3], k[4]]); c.quadraticCurveTo(X(q[0]), Y(q[1]), X(p[0]), Y(p[1])); }
    else { const p = tf([k[1], k[2]]); if (k[0] === 'M') c.moveTo(X(p[0]), Y(p[1])); else c.lineTo(X(p[0]), Y(p[1])); }
  }
}, mat, o);
ZN.tf = (ox, oy, s = 1, rot = 0) => { const ca = Math.cos(rot), sa = Math.sin(rot); return p => [ox + (p[0] * ca - p[1] * sa) * s, oy + (p[0] * sa + p[1] * ca) * s]; };

// ------------------------------------------------------------------- THE MARROW PONTIFF (Oss-Vharoth, bone)
// A towering skeleton-pope. A mitre built of stacked vertebrae, a black cope stiff with gold orphreys over an ivory
// alb gone the colour of old teeth, rent at the breast to show the ribs; bare arm-bones out of short black sleeves;
// a crozier that is one long spine curling into its crook. In its far hand a gold monstrance holds a knucklebone
// that burns like a coal: the key light. Wind: the crozier rises off the ground and back over its head and the
// relic flares. Attack: it is driven into the earth and walls of bone split the ground in front of it.
MFRAME.hbone = [70, 64]; MPX_K.hbone = 1.4; MPX_WALK.hbone = 4.2;
MPX.hbone = function (A, pose, ph, pal) {
  const { walk, wind, atk, idle } = ZN.poses(pose), lerp = ZN.lerp;
  const bone = ZN.T('znBone', pal, 0.15), ivory = ZN.T('znIvory', pal, 0.15), cope = 'znCope', gold = ZN.T('znGold', pal, 0.1);
  const B = MAT[bone], I = MAT[ivory], C = MAT[cope], Gd = MAT[gold], GARNET = ['#2a0406', '#5a0a0c', '#9a1a18', '#d8402a', '#ffb090'];
  const G8 = walk ? gait(ph, 8) : null;
  let Y0 = 0, L = 0, trail = 0, glow = 1, nod = 0;
  if (idle) { const b = Math.sin(ph / 4 * 6.2832); Y0 = b * 0.6; trail = b * 0.7; glow = 1 + b * 0.12; nod = b * 0.4; }
  if (walk) { Y0 = G8.bob * 1.2 + 0.6; L = 1 + G8.sway * 0.4; trail = -G8.swing * 1.4 - 1.4; nod = Math.sin(G8.a * 2 - 1) * 0.5; }
  const wk = wind ? [0.3, 0.65, 1][ph] : 0, ak = atk ? [1, 0.75, 0.4][ph] : 0;
  if (wind) { L = -3 * wk; Y0 = -1.2 * wk; trail = 1.8 * wk; glow = 1 + wk * 0.5; nod = -1.2 * wk; }
  if (atk) { L = 5 * ak; Y0 = 2 * ak; trail = -3 * ak; glow = 1.6 - (1 - ak) * 0.5; nod = 1.6 * ak; }
  const sh = [1 + L, -51 + Y0], hc = [5.5 + L * 1.3, -58 + Y0 + nod];
  // ---- the crozier's pose: planted beside it, lifted back over the head, driven down in front
  let nh, ca, below;   // near hand, lean of the crozier (radians, + = top forward), shaft under the hand
  if (wind) { nh = [sh[0] + 13 + wk * 1.5, sh[1] + 19 - wk * 19]; ca = -0.3 * wk; below = 29 - wk * 5; }
  else if (atk) { nh = [sh[0] + 13 + ak * 1, sh[1] + 23 + ak * 2]; ca = 0.2 * ak + 0.04; below = 22; }
  else if (walk) { nh = [sh[0] + 13 + G8.swing * 2.5, sh[1] + 19 + G8.lift * 0.4]; ca = -G8.swing * 0.12; below = 30; }
  else { nh = [sh[0] + 13, sh[1] + 19 + Y0 * 0.3]; ca = 0; below = 30; }
  const cd = [Math.sin(ca), -Math.cos(ca)], perp = [-cd[1], cd[0]];
  let cb = [nh[0] - cd[0] * below, nh[1] - cd[1] * below];
  if (!wind) { const k = -cb[1] / cd[1]; cb = [cb[0] + cd[0] * k, 0]; }                    // planted: the butt on the ground
  const clen = 51, ctop = [cb[0] + cd[0] * clen, cb[1] + cd[1] * clen];
  const far = { tone: -1.6, contour: false };
  // ---- walls of bone splitting the ground in front (the attack): great curved ribs thrust up out of the earth
  if (atk) {
    const grow = [0.5, 0.95, 1][ph];
    A.hair(16, -0.3, 44, 0, '#0c0906'); A.hair(20, 0.3, 30, -0.4, '#0c0906');
    [[23, 12, -0.5], [37, 17, 0.4], [30, 23, -0.1], [42, 9, 0.7]].forEach(([x0, h, bend], i) => {
      const hh = h * Math.min(1, grow * (1.12 - i * 0.1)), w = 2.4 + h * 0.08;
      if (hh < 1) return;
      ZN.path(A, [['M', x0 - w, 1], ['Q', x0 - w * 0.7 + bend * hh * 0.2, -hh * 0.6, x0 + bend * hh * 0.45, -hh], ['Q', x0 + w * 0.4 + bend * hh * 0.25, -hh * 0.5, x0 + w, 1]], bone, { sh: 1, hl: 0.7 });
      for (let j = 1; j < 5; j++) { const yy = -hh * j / 5.5, xx = x0 + bend * hh * 0.45 * (j / 5); A.hair(xx - w * (1 - j / 6), yy + 0.6, xx + w * (1 - j / 6) * 0.8, yy - 0.2, B[1]); }
      A.hair(x0 - w * 0.4, -1, x0 + bend * hh * 0.4 - 0.3, -hh * 0.88, B[4]);
      A.speck(x0 - w, -hh, w * 2, hh, B[0], Math.round(hh), 11 + i);
    });
    for (let i = 0; i < 9; i++) { const a = -2.9 + i * 0.33, r = 3 + ph * 3.5 + (i % 3) * 1.2; A.px(cb[0] + Math.cos(a) * r * 1.3, -0.5 + Math.sin(a) * r * 0.8, i % 2 ? B[3] : B[1]); }
    if (ph < 2) for (let i = 0; i < 5; i++) { const a = -2.7 + i * 0.35, r0 = 2.5 + ph * 2, r1 = r0 + 3 - ph; A.line(cb[0] + Math.cos(a) * r0 * 1.4, -1 + Math.sin(a) * r0, cb[0] + Math.cos(a) * r1 * 1.4, -1 + Math.sin(a) * r1, ph ? B[2] : B[4], 0.6); }
    A.speck(16, -5, 30, 5, '#5a4c38', 26, 7);
  }
  // ---- the lappets (infulae) of the mitre, trailing behind the head
  const lap = (dx, tone) => {
    const r0 = [hc[0] - 3.8 + dx, hc[1] - 4], sw = trail * 1.3;
    A.poly([r0, [r0[0] + 2.2, r0[1] + 0.4], [r0[0] - 1 + sw, r0[1] + 14], [r0[0] - 3.6 + sw, r0[1] + 13.4]], cope, { tone, contour: false, sh: 0.8 });
    A.hair(r0[0] + 0.3, r0[1] + 1, r0[0] - 2.6 + sw, r0[1] + 12.8, Gd[tone ? 1 : 2]);
    A.poly([[r0[0] - 3.6 + sw, r0[1] + 13.2], [r0[0] - 1 + sw, r0[1] + 13.7], [r0[0] - 1.1 + sw, r0[1] + 15.3], [r0[0] - 3.7 + sw, r0[1] + 14.8]], gold, { tone, contour: false, sh: 0.5 });
    for (let i = 0; i < 4; i++) A.hair(r0[0] - 3.4 + i * 0.75 + sw, r0[1] + 15.2, r0[0] - 3.6 + i * 0.75 + sw * 1.25, r0[1] + 16.8, Gd[(tone ? 1 : 2) + (i % 2)]);
  };
  lap(-1.8, -1.5);
  // ---- feet under the hem: long bone toes on the flagstones
  const foot = (x, y, o) => {
    A.poly([[x - 2, y], [x - 1.6, y - 2.2], [x + 2.5, y - 1.8], [x + 6, y - 0.3], [x + 6.3, y + 0.5], [x - 2, y + 0.5]], bone, { ...o, sh: 0.7, hl: 0.5 });
    for (let i = 0; i < 3; i++) A.hair(x + 1.8 + i * 1.3, y - 1.5 + i * 0.35, x + 2.3 + i * 1.3, y + 0.2, B[0]);
    A.fine(x + 6, y, '#0c0906');
  };
  let fN = [5, -0.5], fF = [-3, -0.5];
  if (walk) { fN = [4 + G8.swing * 6, -0.5 - G8.lift * 1.8]; fF = [-2 - G8.swing * 5, -0.5 - G8.liftF * 1.5]; }
  if (atk) { fN = [8 + ak * 2, -0.5]; fF = [-5, -0.5]; }
  foot(fF[0], fF[1], far);
  // ---- the far arm: a black sleeve, a bone forearm, a bone hand lifting the monstrance before the breast
  const fs = [sh[0] - 1, sh[1] + 2], fe = [sh[0] + 1.5 + (atk ? 2 : 0), sh[1] + 11], fh = [sh[0] + 9 + (atk ? 3 * ak : 0) - wk * 1, sh[1] + 10 - wk * 5 + ak * 2];
  A.limb([fs, fe], 2.4, 2.2, cope, { ...far });
  A.limb([fe, fh], 0.9, 0.7, bone, { ...far });
  // ---- the alb: long, ivory gone yellow, lace at the hem
  const hemF = [12 + L * 0.5 + (walk ? Math.max(0, G8.swing) * 2 : 0), -1.5], hemB = [-9 + trail * 0.5, -1];
  A.shape((c, X, Y) => {
    c.moveTo(X(sh[0] - 4), Y(sh[1] + 1)); c.lineTo(X(sh[0] + 6), Y(sh[1] + 1.5));
    c.quadraticCurveTo(X(sh[0] + 8.5), Y(-24), X(hemF[0]), Y(hemF[1]));
    for (let i = 1; i <= 10; i++) { const p = lerp(hemF, hemB, i / 10); c.lineTo(X(p[0]), Y(p[1] + (i % 2) * 0.9)); }
    c.quadraticCurveTo(X(-8 + trail * 0.3), Y(-26), X(sh[0] - 4), Y(sh[1] + 1));
  }, ivory, { sh: 1.8, hl: 1 });
  for (let i = 0; i < 4; i++) { const a = [sh[0] + 7 - i * 0.8, -26 + i], b = lerp(hemF, hemB, 0.06 + i * 0.1); A.hair(a[0], a[1], b[0], b[1] - 0.5, I[1]); A.hair(a[0] + 0.7, a[1] + 2, b[0] + 0.7, b[1] - 0.8, I[4]); }
  for (let i = 0; i < 12; i++) { const p = lerp(hemF, hemB, i / 12); A.fine(p[0], p[1] - 1.5, I[0]); A.fine(p[0] + 0.5, p[1] - 2.1, I[0]); A.fine(p[0] + 0.3, p[1] - 0.8, I[3]); }   // lace holes
  A.speck(-6, -8, 20, 7, '#4a3e2c', 22, 3);   // grave dirt in the hem
  // the rent in the breast: the ribs behind it, the relic's light caught on every one
  const rc = [sh[0] + 5.6, sh[1] + 8];
  ZN.path(A, [['M', rc[0] - 1.6, rc[1] - 5.5], ['Q', rc[0] + 2.4, rc[1] - 5, rc[0] + 2.2, rc[1] + 1], ['Q', rc[0] + 1.6, rc[1] + 5, rc[0] - 0.4, rc[1] + 7], ['Q', rc[0] - 2.6, rc[1] + 1, rc[0] - 1.6, rc[1] - 5.5]], '#070506', { flat: true, contour: false });
  for (let i = 0; i < 5; i++) { const y = rc[1] - 4 + i * 2.2; A.limb([[rc[0] - 2, y + 0.8], [rc[0] + 0.4, y - 0.2], [rc[0] + 2, y + 0.6]], 0.45, 0.4, bone, { contour: false, sh: 0.3, hl: 0.3, tone: -0.5 }); }
  A.hair(rc[0] - 2.2, rc[1] - 4, rc[0] - 2.6, rc[1] + 5, I[0]); A.hair(rc[0] + 2.3, rc[1] - 3.5, rc[0] + 1.6, rc[1] + 4, I[4]);   // the torn edges
  // ---- the cope: black, stiff, dragging its train; gold down its front edge and a gold hood hanging on its back
  const BS = [sh[0] - 6, sh[1] + 1], FS = [sh[0] + 3.4, sh[1] + 1.5], HB = [-17 + trail, -1.2], HF = [6 + L * 0.5, -7];
  const hem = []; for (let i = 1; i <= 12; i++) { const t = i / 12, x = (1 - t) * (1 - t) * HB[0] + 2 * (1 - t) * t * -4 + t * t * HF[0], y = (1 - t) * (1 - t) * HB[1] + 2 * (1 - t) * t * -3 + t * t * HF[1]; hem.push([x + (walk && i > 8 ? G8.swing * 0.6 : 0), y + (i % 3 === 1 ? 0.9 : i % 3 === 2 ? 0.3 : -0.2)]); }
  A.shape((c, X, Y) => {
    c.moveTo(X(FS[0]), Y(FS[1]));
    c.quadraticCurveTo(X(sh[0] - 0.5), Y(sh[1] - 4.5), X(BS[0]), Y(BS[1]));
    c.quadraticCurveTo(X(BS[0] - 9 + trail * 0.4), Y(-27), X(HB[0]), Y(HB[1]));
    hem.forEach(p => c.lineTo(X(p[0]), Y(p[1])));
    c.quadraticCurveTo(X(FS[0] + 2.2), Y(-30), X(FS[0]), Y(FS[1]));
  }, cope, { sh: 2.4, hl: 1.2 });
  const cq = (u, v) => lerp(lerp([BS[0] + 0.5, BS[1] + 3], [FS[0] - 1, FS[1] + 3], u), lerp([HB[0] + 2.5, HB[1] - 2.5], [HF[0] - 1.5, HF[1] - 1.5], u), v);   // a point inside the cope
  // the brocade: a lattice of gold crosses and pomegranates stitched over the black
  for (let r = 0; r < 8; r++) for (let q = 0; q < 4; q++) {
    const p = cq(0.08 + q * 0.24 + (r % 2) * 0.12, 0.1 + r * 0.115); if ((r % 2) && q === 3) continue;
    if ((r + q) % 2) { A.fine(p[0], p[1], Gd[3]); A.fine(p[0] - 0.7, p[1], Gd[2]); A.fine(p[0] + 0.7, p[1], Gd[1]); A.fine(p[0], p[1] - 0.7, Gd[4]); A.fine(p[0], p[1] + 0.7, Gd[1]); A.fine(p[0], p[1] + 1.4, Gd[1]); }
    else { A.fine(p[0], p[1], Gd[2]); A.fine(p[0] + 0.6, p[1] - 0.6, Gd[3]); A.fine(p[0] - 0.6, p[1] + 0.6, Gd[1]); }
  }
  // heavy folds hanging from the shoulder: a deep trough, a dull ridge of light beside it
  for (let i = 0; i < 4; i++) {
    const u = 0.14 + i * 0.22, top = cq(u, 0.08 + (i % 2) * 0.06), bot = cq(u - 0.06 - trail * 0.01, 1.05), bot2 = cq(u + 0.04, 1.05);
    A.poly([top, bot, bot2], cope, { flat: true, tone: -3, contour: false });
    const lt = cq(u + 0.07, 0.2 + (i % 2) * 0.06), lb = cq(u + 0.09, 0.98); A.hair(lt[0], lt[1], lb[0], lb[1], C[4]);
  }
  // the orphrey: a broad gold band down the front edge, its field sewn with bone beads and a red thread
  const orph = [];
  for (let i = 0; i <= 9; i++) { const t = i / 9, x = (1 - t) * (1 - t) * FS[0] + 2 * (1 - t) * t * (FS[0] + 2.2) + t * t * HF[0], y = (1 - t) * (1 - t) * FS[1] + 2 * (1 - t) * t * -30 + t * t * HF[1]; orph.push([x, y]); }
  A.shape((c, X, Y) => { orph.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); for (let i = orph.length - 1; i >= 0; i--) c.lineTo(X(orph[i][0] - 3.4), Y(orph[i][1] + 0.3)); }, gold, { sh: 0.9, hl: 0.6, contour: false });
  for (let i = 1; i < 9; i++) { const p = orph[i]; A.hair(p[0] - 3, p[1] + 0.2, p[0] - 3, p[1] + 3, Gd[0]); if (i % 2) A.ell(p[0] - 1.6, p[1] + 1.4, 0.8, 0.8, bone, { sh: 0.4, hl: 0.4, contour: true }); else { A.fine(p[0] - 1.6, p[1] + 1, '#8a1a18'); A.fine(p[0] - 1.6, p[1] + 1.7, '#5a0a0c'); } }
  // the hem of the cope edged in gold
  A.shape((c, X, Y) => { c.moveTo(X(HB[0]), Y(HB[1])); hem.forEach(p => c.lineTo(X(p[0]), Y(p[1]))); for (let i = hem.length - 1; i >= 0; i--) c.lineTo(X(hem[i][0] + 0.2), Y(hem[i][1] - 1.6)); c.lineTo(X(HB[0] + 0.6), Y(HB[1] - 1.6)); }, gold, { sh: 0.5, hl: 0.4, contour: false });
  for (let i = 0; i < hem.length; i += 2) A.fine(hem[i][0], hem[i][1] - 0.8, Gd[0]);
  // the hood of the cope: a gold shield on the back with a skull worked into it, a tassel swinging under it
  const hdc = [sh[0] - 7.5 + trail * 0.15, sh[1] + 10];
  A.poly([[hdc[0] - 4, hdc[1] - 5.5], [hdc[0] + 3.6, hdc[1] - 5.9], [hdc[0] + 2.8, hdc[1] + 2.2], [hdc[0] - 0.4 + trail * 0.2, hdc[1] + 6.5], [hdc[0] - 3.6, hdc[1] + 2.2]], gold, { sh: 1, hl: 0.7 });
  A.ell(hdc[0] - 0.4, hdc[1] - 1.2, 2, 1.8, bone, { sh: 0.5, hl: 0.5 }); A.rect(hdc[0] - 1.4, hdc[1] - 1.4, 0.8, 0.8, '#140c06'); A.rect(hdc[0] + 0.1, hdc[1] - 1.4, 0.8, 0.8, '#140c06'); A.fine(hdc[0] - 0.4, hdc[1] + 0.4, '#140c06');
  for (let i = 0; i < 4; i++) A.fine(hdc[0] - 1.2 + i * 0.6, hdc[1] + 0.9, i % 2 ? '#140c06' : B[3]);
  A.hair(hdc[0] - 3.2, hdc[1] - 4.6, hdc[0] + 2.8, hdc[1] - 5, Gd[4]);
  A.line(hdc[0] - 0.4 + trail * 0.2, hdc[1] + 6.5, hdc[0] - 0.4 + trail * 0.7, hdc[1] + 10, Gd[2], 0.6);
  A.poly([[hdc[0] - 1.2 + trail * 0.7, hdc[1] + 10], [hdc[0] + 0.6 + trail * 0.7, hdc[1] + 10], [hdc[0] + 0.9 + trail * 0.85, hdc[1] + 13], [hdc[0] - 1.5 + trail * 0.85, hdc[1] + 13]], gold, { sh: 0.4, hl: 0.3 });
  // ---- the near foot, out from under the hem
  foot(fN[0], fN[1], {});
  // ---- the neck: bare vertebrae rising out of the collar
  for (let i = 0; i < 3; i++) { const p = lerp([sh[0] + 1, sh[1] - 0.5], [hc[0] - 2, hc[1] + 4], i / 2); A.ell(p[0], p[1], 1.6, 1.1, bone, { sh: 0.5, hl: 0.4 }); A.fine(p[0] - 1.8, p[1], B[1]); }
  // the morse: a gold clasp at the throat set with a blood-garnet
  A.ell(FS[0] - 0.5, FS[1] + 1, 2.2, 2.2, gold, { sh: 0.7, hl: 0.6 }); A.ell(FS[0] - 0.5, FS[1] + 1, 1, 1, GARNET, { sh: 0.4, hl: 0.4 });
  for (let i = 0; i < 6; i++) { const a = i * 1.047; A.fine(FS[0] - 0.5 + Math.cos(a) * 1.7, FS[1] + 1 + Math.sin(a) * 1.7, Gd[4]); }
  // ---- the skull, larger than a man's
  const hx = hc[0], hy = hc[1], s = 1.25, H = ZN.tf(hx, hy, s);
  lap(1.8, 0);
  ZN.path(A, [['M', -4.4, 0.5], ['Q', -4.6, -5.5, 0.5, -5.6], ['Q', 5, -5, 5.4, -0.5], ['L', 5.8, 2.5], ['L', 4.4, 3.6], ['L', -0.5, 3.4], ['Q', -3.6, 3, -4.4, 0.5]], bone, { sh: 1.1, hl: 0.8 }, H);
  A.limb([H([1.2, -1.9]), H([5.1, -1.7])], 0.8, 0.65, bone, { contour: false, sh: 0.3, hl: 0.5, tone: 1 });            // brow ridge
  const orb = H([3.2, -0.1]);
  A.ell(orb[0], orb[1], 1.6 * s, 1.4 * s, '#050305', { flat: true, contour: false });                                  // the orbit
  A.fine(orb[0] + 0.5, orb[1] - 0.3, '#fff2b0'); A.fine(orb[0], orb[1] - 0.3, '#ffc848'); A.fine(orb[0] + 0.5, orb[1] + 0.3, '#b86a18'); A.fine(orb[0] - 0.5, orb[1] + 0.2, '#5a2a08');   // a gold ember of an eye
  const orb2 = H([-0.3, -0.2]); A.ell(orb2[0], orb2[1], 0.9 * s, 1.2 * s, '#050305', { flat: true, contour: false }); A.fine(orb2[0] + 0.3, orb2[1], '#a06a18');
  ZN.path(A, [['M', 5.4, 0.5], ['L', 4.5, 2.3], ['L', 5.7, 2.3]], '#050305', { flat: true, contour: false }, H);   // the nasal hole
  const chk = H([1.6, 1.9]); A.ell(chk[0], chk[1], 1.4 * s, 0.8 * s, bone, { contour: false, sh: 0.3, hl: 0.5, tone: 0.5 });   // cheekbone
  const su = [H([-2.6, 1]), H([-1.8, -2.6]), H([-0.4, -4.8])]; A.hair(su[0][0], su[0][1], su[1][0], su[1][1], B[1]); A.hair(su[1][0], su[1][1], su[2][0], su[2][1], B[1]);   // a suture
  A.hair(H([-3.6, 1.2])[0], H([-3.6, 1.2])[1], H([-1.2, 3])[0], H([-1.2, 3])[1], B[1]);
  // teeth and the long jaw, hanging open when it speaks its verdict
  const jaw = atk ? 1.8 * ak + 0.4 : wind ? 1.3 * wk : 0.3 + (idle && ph === 1 ? 0.3 : 0);
  const tr = H([1, 3.1]); A.rect(tr[0], tr[1], 4.4 * s, 1 * s + jaw, '#070406');
  for (let i = 0; i < 6; i++) { const t = H([1.1 + i * 0.72, 2.9]); A.rect(t[0], t[1], 0.55 * s, 1.1 * s, i === 4 ? Gd[3] : B[3]); A.fine(t[0], t[1] + 1.3, B[1]); }   // one gold tooth
  ZN.path(A, [['M', -2, 2.4], ['L', 0.4, 3.6 + jaw / s], ['L', 5, 3.8 + jaw / s], ['L', 4.6, 5.8 + jaw / s], ['L', 0.4, 6 + jaw / s], ['L', -1.4, 4.4]], bone, { sh: 0.6, hl: 0.5 }, H);
  for (let i = 0; i < 5; i++) { const t = H([1.3 + i * 0.72, 3.4 + jaw / s]); A.rect(t[0], t[1], 0.55 * s, 0.8 * s, B[2]); }
  // ---- the mitre of vertebrae: each tier a vertebra, its wings and spurs jutting from the silhouette
  const mb = hy - 5.2 * s, mtx = hx + 0.5 + L * 0.2, mty = mb - 17;
  A.poly([[hx - 5.4, mb + 0.6], [hx + 5.8, mb], [hx + 5.2, mb - 8], [mtx + 0.4, mty], [hx - 4.8, mb - 8.6]], bone, { sh: 1, hl: 0.7 });
  for (let r = 1; r <= 5; r++) {
    const y = mb - 1 - r * 2.8, t = r / 5, wl = r > 3 ? (r - 3) * 1.9 : 0, xl = hx - 5.1 + t * 0.3 + wl, xr = hx + 5.5 - t * 0.3 - wl * 1.1;
    if (xr - xl < 1.5) break;
    A.hair(xl + 0.4, y + 0.4, xr - 0.4, y, B[0]); A.hair(xl + 0.6, y + 1, xr - 0.6, y + 0.6, B[4]);
    A.poly([[xl + 0.4, y - 0.3], [xl - 2.2 + r * 0.15, y - 1.2], [xl - 1.6, y + 0.1], [xl + 0.4, y + 1.6]], bone, { sh: 0.4, hl: 0.4, contour: true });
    A.poly([[xr - 0.4, y - 0.4], [xr + 2.2 - r * 0.15, y - 1.6], [xr + 1.7, y - 0.2], [xr - 0.4, y + 1.4]], bone, { sh: 0.4, hl: 0.4, contour: true });
    A.rect((xl + xr) / 2 + 1.3, y + 1.3, 0.8, 0.7, B[0]); A.rect((xl + xr) / 2 - 2.1, y + 1.3, 0.8, 0.7, B[0]);   // foramina
  }
  A.poly([[mtx - 0.8, mty + 1.2], [mtx + 0.4, mty - 2.8], [mtx + 1.4, mty + 1]], bone, { sh: 0.3, hl: 0.3 });   // the spire
  A.poly([[hx - 5.6, mb + 0.9], [hx + 6, mb + 0.3], [hx + 5.9, mb - 1.6], [hx - 5.5, mb - 1]], gold, { sh: 0.5, hl: 0.5 });   // circulus
  A.poly([[hx + 1.3, mb - 1.2], [hx + 2.8, mb - 1.3], [mtx + 1.2, mty + 4], [mtx + 0.3, mty + 4]], gold, { sh: 0.4, hl: 0.4, contour: false });   // titulus
  A.ell(hx + 2.1, mb - 5, 0.9, 1, GARNET, { sh: 0.3, hl: 0.3 });
  for (let i = 0; i < 7; i++) A.fine(hx - 5 + i * 1.7, mb - 0.3, i % 2 ? Gd[1] : Gd[4]);
  // ---- the near arm: a short black sleeve, the bare bones of the arm, a hand of long knuckles on the spine
  const ns = [sh[0] + 2.5, sh[1] + 2];
  const ne = wind ? [ns[0] + 4 - wk * 1, ns[1] + 9 - wk * 9] : [ns[0] + 3 + ak * 3, ns[1] + 10];
  const sl = lerp(ns, ne, 0.55);
  A.limb([ns, sl], 2.6, 3, cope, {});
  A.poly([[sl[0] - 3.2, sl[1] + 1.4], [sl[0] + 2.4, sl[1] - 2.4], [sl[0] + 3, sl[1] + 0.4], [sl[0] - 2, sl[1] + 3.6]], gold, { sh: 0.4, hl: 0.4 });   // the gold cuff
  A.limb([sl, ne], 0.95, 0.8, bone, { sh: 0.4 });                                                                     // humerus
  A.ell(ne[0], ne[1], 1.2, 1.2, bone, { sh: 0.4 });
  const dx = nh[0] - ne[0], dy = nh[1] - ne[1], ll = Math.hypot(dx, dy) || 1, ux = dx / ll, uy = dy / ll;
  A.limb([[ne[0] - uy * 0.5, ne[1] + ux * 0.5], [nh[0] - uy * 0.6 - ux, nh[1] + ux * 0.6 - uy]], 0.6, 0.5, bone, { sh: 0.3, tone: -1 });   // ulna
  A.limb([[ne[0] + uy * 0.5, ne[1] - ux * 0.5], [nh[0] + uy * 0.5 - ux, nh[1] - ux * 0.5 - uy]], 0.6, 0.55, bone, { sh: 0.3 });           // radius
  // ---- the crozier: a spine standing on a gold ferrule, curling into its crook
  A.limb([cb, ctop], 0.7, 0.7, B[1], { flat: true });
  for (let t = 4.4, k = 0; t < clen - 2; t += 3.1, k++) {
    const p = [cb[0] + cd[0] * t, cb[1] + cd[1] * t], w = 1.45 + 0.1 * (k % 2);
    A.poly([[p[0] - perp[0] * 1 - cd[0] * 0.4, p[1] - perp[1] * 1 - cd[1] * 0.4], [p[0] - perp[0] * 2.8 - cd[0] * 1.8, p[1] - perp[1] * 2.8 - cd[1] * 1.8], [p[0] - perp[0] * 1 + cd[0] * 0.9, p[1] - perp[1] * 1 + cd[1] * 0.9]], bone, { sh: 0.3, hl: 0.3, contour: false, tone: -0.8 });   // spinous process
    A.ell(p[0], p[1], w, 1.15, bone, { rot: ca, sh: 0.5, hl: 0.4, contour: true });
    A.fine(p[0] + perp[0] * 0.4, p[1] + perp[1] * 0.4 - 0.2, B[4]);
  }
  A.limb([cb, [cb[0] + cd[0] * 3.6, cb[1] + cd[1] * 3.6]], 0.8, 1.2, gold, { sh: 0.4, hl: 0.4 });           // the ferrule
  const knop = [cb[0] + cd[0] * (clen - 1), cb[1] + cd[1] * (clen - 1)];
  A.ell(knop[0], knop[1], 2.3, 1.7, gold, { rot: ca, sh: 0.6, hl: 0.5 });
  A.hair(knop[0] - perp[0] * 2, knop[1] - 0.2, knop[0] + perp[0] * 2, knop[1] - 0.2, Gd[0]);
  // the crook: vertebrae curling forward and down, each smaller than the last, a gold bead at its heart
  const cc = [knop[0] + cd[0] * 4.4 + perp[0] * 4, knop[1] + cd[1] * 4.4 + perp[1] * 4];
  const a0 = Math.atan2(knop[1] + cd[1] * 1.5 - cc[1], knop[0] + cd[0] * 1.5 - cc[0]);
  for (let i = 0; i <= 12; i++) {
    const a = a0 + i * 0.47, r = 4.5 - i * 0.2, p = [cc[0] + Math.cos(a) * r, cc[1] + Math.sin(a) * r], sz = 1.45 - i * 0.06;
    A.poly([[p[0] + Math.cos(a) * sz * 0.6, p[1] + Math.sin(a) * sz * 0.6], [p[0] + Math.cos(a) * (sz + 1.4) - Math.sin(a) * 0.6, p[1] + Math.sin(a) * (sz + 1.4) + Math.cos(a) * 0.6], [p[0] + Math.cos(a + 0.3) * sz, p[1] + Math.sin(a + 0.3) * sz]], bone, { sh: 0.3, hl: 0.3, contour: false, tone: -0.6 });
    A.ell(p[0], p[1], sz, sz * 0.85, bone, { rot: a, sh: 0.4, hl: 0.4, contour: true });
  }
  A.ell(cc[0], cc[1], 1.2, 1.2, ['#3a2408', '#8a5a14', '#e0a838', '#ffe08a', '#fffbe0'], { sh: 0.3, hl: 0.4 });
  // the near hand closed on the shaft: long knuckled fingers wrapped round it
  A.ell(nh[0] - perp[0] * 1, nh[1] - perp[1] * 1, 1.4, 1.8, bone, { rot: ca, sh: 0.4, hl: 0.4 });                                   // the back of the hand
  for (let i = 0; i < 4; i++) { const p = [nh[0] - cd[0] * (i * 1.3 - 1.6) + perp[0] * 0.4, nh[1] - cd[1] * (i * 1.3 - 1.6) + perp[1] * 0.4]; A.ell(p[0] + perp[0] * 0.8, p[1] + perp[1] * 0.8, 1.2, 0.62, bone, { rot: ca, sh: 0.3, hl: 0.4 }); A.fine(p[0] + perp[0] * 1.8, p[1] + perp[1] * 1.8, B[0]); }
  // ---- the monstrance: a gold sunburst on a stem, a knucklebone burning in its glass
  const mc = [fh[0] + 0.5, fh[1] - 5.2];
  A.limb([fh, [mc[0], mc[1] + 2]], 0.5, 0.5, gold, { sh: 0.3 });
  A.ell(fh[0], fh[1] + 0.8, 1.6, 0.9, gold, { sh: 0.3 });
  A.limb([[fh[0] - 1.6, fh[1] + 0.6], [fh[0] + 1.2, fh[1] + 0.4]], 0.55, 0.5, bone, { sh: 0.3 });                  // bone fingers round the stem
  const rot = (idle ? ph : walk ? ph >> 1 : wind ? ph + 1 : 0) * 0.13;
  for (let i = 0; i < 16; i++) { const a = i / 16 * 6.2832 + rot, r = i % 2 ? 3.5 : 5 + (wind ? wk : 0); A.line(mc[0] + Math.cos(a) * 2, mc[1] + Math.sin(a) * 2, mc[0] + Math.cos(a) * r, mc[1] + Math.sin(a) * r, i % 4 === 0 ? Gd[4] : Gd[3], 0.6); }
  A.ell(mc[0], mc[1], 2.3, 2.3, gold, { sh: 0.5, hl: 0.5 });
  A.ell(mc[0], mc[1], 1.4, 1.4, ['#6a3a0a', '#d88a2a', '#ffcf70', '#fff2c0', '#ffffff'], { sh: 0.4, hl: 0.4, contour: false });
  A.fine(mc[0] - 0.3, mc[1] - 0.3, '#ffffff');
  // tenebrism: the relic is the key light, the eye a second ember, a cold rim from behind
  A.lamp(mc[0], mc[1], [255, 206, 120], 24 * glow, 1.05);
  A.lamp(orb[0] + 0.3, orb[1], [255, 190, 90], 3.5, 0.7);
  A.rim([120, 128, 160], 0.3);
};

// ------------------------------------------------------------------- THE WET NURSE (Nol-Shogthuth, flesh)
// A mountain of flesh that births Husks. The mass sags onto the floor, veined and folded, hung with rows of heavy
// teats that weep bile; a red shawl over its hump is pinned with votive candles burning into the fat. On top of it
// all, tiny and serene in a white wimple, a woman's face with its eyes closed, crowned with the spokes of the Wheel.
// Low on the belly the birth-slit, lit from inside like a furnace door. Walk: a sliding crawl, the base reaching
// and the hump dragging after. Wind: the mass convulses and swells, the slit gapes. Attack: a heave and a spray.
defMat('znNurse', '#10070a', '#2e161c', '#553436', '#8a5c54', '#c09080');
defMat('znBile', '#161804', '#3e440c', '#7a841c', '#b8c040', '#eef09a');
MFRAME.hflesh = [66, 52]; MPX_K.hflesh = 1.4; MPX_WALK.hflesh = 3.4;
MPX.hflesh = function (A, pose, ph, pal) {
  const { walk, wind, atk, idle } = ZN.poses(pose), lerp = ZN.lerp;
  const skin = ZN.T('znNurse', pal, 0.18), shawl = ZN.T('clothRed', pal, 0.12), wimple = 'clothBone', S = MAT[skin], R = MAT[shawl], BL = MAT.znBile;
  const VEIN = '#2a1a30', VEIN2 = '#3e2a44', G8 = walk ? gait(ph, 8) : null;
  let sw = 0, lean = 0, reach = 0, drag = 0, lag = 0, open = 0.2, tilt = 0, quiv = 0;
  if (idle) { const b = Math.sin(ph / 4 * 6.2832); sw = b * 0.018; lag = -b * 0.6; }
  if (walk) { const a = G8.a; reach = Math.sin(a) * 2.2; drag = Math.sin(a - 1.2) * 1.8; lean = Math.sin(a - 0.6) * 1.2; sw = Math.cos(a * 2) * 0.012; lag = -Math.sin(a - 1.5) * 1.4; }
  const wk = wind ? [0.35, 0.7, 1][ph] : 0, ak = atk ? [1, 0.7, 0.35][ph] : 0;
  if (wind) { sw = [0.04, 0.1, 0.14][ph]; lean = -3 * wk; open = 0.2 + 0.8 * wk; tilt = -0.25 * wk; quiv = wk; lag = ph === 1 ? 1 : -1; }
  if (atk) { sw = 0.03 * ak; lean = 7 * ak; reach = 3 * ak; open = 1; tilt = 0.12 * ak; lag = -2.5 * ak; }
  // the mass is bent as a whole: it swells from the floor up and its top leans over the front
  const cv = wind && ph === 1 ? -0.035 : 0, P = (x, y) => { const h = -y / 48; return [x * (0.93 + sw * 1.1 + cv) + lean * h * h * 1.6 + (x > 0 ? reach * (1 - h) : drag * (1 - h)), y * (1.1 + sw * 0.7 - cv * 1.2) + (wind ? Math.sin(x * 0.35 + ph * 2) * wk * 0.8 * h : 0)]; };
  const PT = p => P(p[0], p[1]);
  // ---- the crown of wheel-spokes: a broken wheel behind the small head, its upper spokes thrust up as a crown
  const hd = P(13, -46.5), hx = hd[0] + tilt * 2, hy = hd[1];
  const wc = [hx - 1.2, hy - 1.5], WR = 9.5, rot = walk ? ph * 0.05 : idle ? 0 : wind ? -wk * 0.2 : ak * 0.3;
  for (let i = 0; i < 12; i++) {
    const a = -Math.PI + i / 12 * 6.2832 + rot + 0.13, up = Math.sin(a) < -0.2, r1 = up ? WR + 3 + (i % 2) * 2.2 : WR;
    if (Math.sin(a) > 0.5) continue;
    A.limb([[wc[0] + Math.cos(a) * 2, wc[1] + Math.sin(a) * 2], [wc[0] + Math.cos(a) * r1, wc[1] + Math.sin(a) * r1]], 0.6, up ? 0.35 : 0.45, 'rust', { sh: 0.3, hl: 0.3, contour: false, tone: -0.3 });
    if (up) { A.fine(wc[0] + Math.cos(a) * r1, wc[1] + Math.sin(a) * r1, MAT.rust[4]); A.fine(wc[0] + Math.cos(a) * (r1 - 1), wc[1] + Math.sin(a) * (r1 - 1), MAT.bronze[3]); }
  }
  for (let i = 0; i < 14; i++) {                                                                // the rim, bent and broken in two places
    if (i === 4 || i === 10) continue;
    const a0 = -Math.PI - 0.5 + i / 14 * (Math.PI + 1), a1 = a0 + (Math.PI + 1) / 14, r = WR + (i % 3 === 0 ? 0.3 : 0);
    A.limb([[wc[0] + Math.cos(a0) * r, wc[1] + Math.sin(a0) * r], [wc[0] + Math.cos(a1) * r, wc[1] + Math.sin(a1) * r]], 0.95, 0.95, 'bronze', { sh: 0.4, hl: 0.4, contour: false });
    A.fine(wc[0] + Math.cos(a0) * (r - 0.3), wc[1] + Math.sin(a0) * (r - 0.3) - 0.3, MAT.bronze[4]);
  }
  // ---- a teat: heavy, pendulous, swinging a beat behind the body, weeping bile from the nipple
  const teat = (at, to, sz, o, k) => {
    const a = PT(at), sway = lag * (0.6 + (k % 3) * 0.3) + quiv * ((k % 2) ? 1 : -1) * 0.9, lift = wind ? -wk * 1.5 : 0;
    const b = [to[0] + (a[0] - at[0]) + sway + (atk ? ak * 2.5 : 0), to[1] + (a[1] - at[1]) + lift];
    if (!o.tone) A.ell(b[0] + 1.2, b[1] + sz * 0.9, sz * 0.9, sz * 0.45, skin, { flat: true, tone: -3.4, contour: false });   // its shadow on the belly
    const tt = o.tone || 0.8;
    const w0 = sz * 0.5;
    ZN.path(A, [['M', a[0] - w0, a[1]], ['Q', a[0] - w0 * 0.9, b[1] - sz * 0.5, b[0] - sz, b[1] + 0.2], ['Q', b[0] - sz * 0.95, b[1] + sz * 1.05, b[0] + 0.2, b[1] + sz], ['Q', b[0] + sz * 1.15, b[1] + sz * 0.95, b[0] + sz * 1.02, b[1] - 0.2], ['Q', a[0] + w0 * 1.1, b[1] - sz * 0.8, a[0] + w0, a[1]]], skin, { ...o, tone: tt, sh: sz * 0.5, hl: 0.8 });
    if (!o.tone) { A.hair(a[0] + 0.4, a[1] + 1.4, b[0] - sz * 0.2, b[1] - sz * 0.4, VEIN); A.hair(b[0] - sz * 0.2, b[1] - sz * 0.4, b[0] + sz * 0.4, b[1] - sz * 0.1, VEIN2); A.fine(b[0] - sz * 0.45, b[1] - sz * 0.35, S[4]); A.fine(b[0] - sz * 0.35, b[1] - sz * 0.5, S[4]); }
    if (!o.tone) { A.fine(b[0] - sz * 0.5, b[1] - sz * 0.1, '#e8c4b0'); A.fine(b[0] - sz * 0.3, b[1] - sz * 0.35, '#fff0e0'); }   // wet sheen
    const n = [b[0] + sz * 0.55, b[1] + sz * 0.62];
    A.ell(n[0] - 0.2, n[1], sz * 0.42, sz * 0.36, ['#1a0608', '#3a1216', '#5a2228', '#7a3a3c', '#9a5452'], { sh: 0.3, hl: 0.3, contour: false, tone: o.tone || 0 });   // the areola
    A.px(n[0] + sz * 0.2, n[1] + 0.2, '#2a0a0c');
    const dl = atk ? 0 : 0.8 + ((ph + k * 3) % 4) * 0.8;                                           // a slow drip of bile
    if (dl && !o.tone) { A.line(n[0] + sz * 0.2, n[1] + 1, n[0] + sz * 0.2, n[1] + 1 + dl, BL[3], 0.5); A.fine(n[0] + sz * 0.2, n[1] + 1.6 + dl, BL[4]); }
    return [n[0] + sz * 0.2, n[1] + 0.5];
  };
  const FAR = { tone: -1.6, contour: false };
  // the slime it lies in
  A.ell(-2, 0.2, 36, 2, ['#0c0e04', '#1c200a', '#2e3410', '#4a5418', '#6a7428'], { flat: true, contour: false });
  teat([1, -37], [3, -27], 3.4, FAR, 1); teat([-4, -30], [-4, -21], 3, FAR, 2);
  // ---- the mass: a sagging lobe dragged behind, the torso, a belly hung forward over the floor
  const lob = P(-21, -8.5); A.ell(lob[0] - drag * 0.5, lob[1], 14, 9.5, skin, { sh: 5, hl: 2, tone: -0.6 });
  ZN.path(A, [['M', -30, 0.5], ['Q', -38, -12, -29, -26], ['Q', -22, -41, -7, -45], ['Q', 4, -48, 10, -43], ['Q', 16, -38, 18, -33], ['Q', 27, -30, 27, -18], ['L', 20, 0.5]].map(k => k.length === 3 ? [k[0], ...P(k[1], k[2])] : [k[0], ...P(k[1], k[2]), ...P(k[3], k[4])]), skin, { sh: 7, hl: 3, core: 3 });
    const rl = P(-5, -5); A.ell(rl[0] + (drag + reach) * 0.3, rl[1], 12, 6, skin, { sh: 3.5, hl: 1.4, tone: -0.8 });
  const bel = P(17, -13); A.ell(bel[0] + reach * 0.3, bel[1], 13.5, 12.8, skin, { sh: 6, hl: 2.4, core: 2.5, rot: -0.15 });
  // rolls of fat on the back and flank: a sunk crease under each
  for (let i = 0; i < 3; i++) {
    const y = -20 - i * 8, x0 = -31 + i * 4.5, x1 = 6 - i * 2;
    const a = P(x0, y + 1), m = P((x0 + x1) / 2, y + 3), b = P(x1, y + 1.5);
    ZN.path(A, [['M', a[0], a[1]], ['Q', m[0], m[1] + 1.4, b[0], b[1]], ['Q', m[0], m[1] - 0.1, a[0], a[1]]], skin, { flat: true, tone: -3.2, contour: false });
    ZN.path(A, [['M', a[0] + 1, a[1] + 1], ['Q', m[0], m[1] + 2.4, b[0] - 0.5, b[1] + 1.1], ['Q', m[0], m[1] + 1.7, a[0] + 1, a[1] + 1]], skin, { flat: true, lit: 0.28, contour: false });
  }
  // veins: a blue-black river system under the skin; bruising the colour of old bile
  const vein = (pts, c) => { for (let i = 1; i < pts.length; i++) { const a = PT(pts[i - 1]), b = PT(pts[i]); A.hair(a[0], a[1], b[0], b[1], c); } };
  vein([[-31, -6], [-27, -12], [-28, -18], [-23, -23]], VEIN); vein([[-27, -12], [-21, -13], [-18, -17]], VEIN2); vein([[-25, -31], [-19, -36], [-12, -38]], VEIN);
  vein([[10, -3], [13, -8], [11, -13], [14, -18]], VEIN); vein([[13, -8], [18, -6]], VEIN2);
  A.speck(-34, -44, 60, 44, S[1], 60, 5); A.speck(-32, -30, 40, 26, S[3], 20, 13);
  for (const [x, y, r] of [[-20, -16, 3], [-10, -24, 2.4], [-26, -6, 2.2]]) { const q = P(x, y); A.ell(q[0], q[1], r * 1.4, r, '#3e3a2a', { flat: true, contour: false }); A.ell(q[0] + 0.4, q[1] + 0.2, r * 0.8, r * 0.55, '#4e2a3a', { flat: true, contour: false }); }   // bruises, yellow gone to plum
  // on the crawl, the wet trail smeared behind it
  for (let i = 0; i < 6; i++) { const x = -34 + i * 6 - (walk ? (ph * 1.4) % 6 : 0); A.hair(x, 0.9, x + 2.5, 0.9, i % 2 ? BL[2] : BL[3]); }
  // ---- the red shawl over the hump, tattered, candles pushed through it into the fat
  const sh0 = P(-1, -47.5), sh1 = P(-24, -38), sh2 = P(-37, -20), trail = walk ? -G8.swing * 1.2 : wind ? 1.2 * wk : atk ? -2 * ak : lag * 0.5;
  const tat = [];
  for (let i = 0; i <= 8; i++) { const t = i / 8, p = P(-35 + t * 32 - t * t * 6, -17 - t * 10 - t * t * 4); tat.push([p[0] + trail * (1 - t), p[1] + (i % 2 ? 2.6 : 0) + (i % 3 === 0 ? 1.4 : 0)]); }
  A.shape((c, X, Y) => {
    c.moveTo(X(sh0[0] + 2), Y(sh0[1] + 0.5)); c.quadraticCurveTo(X(sh1[0] - 2), Y(sh1[1] - 6), X(sh2[0] - 1.5 + trail), Y(sh2[1]));
    tat.forEach(p => c.lineTo(X(p[0]), Y(p[1]))); c.quadraticCurveTo(X(sh0[0] + 3), Y(sh0[1] + 6), X(sh0[0] + 2), Y(sh0[1] + 0.5));
  }, shawl, { sh: 1.6, hl: 1 });
  for (let i = 0; i < 5; i++) { const a = lerp(sh0, sh2, 0.15 + i * 0.17), b = tat[Math.min(8, 1 + i * 2)] || tat[8]; A.hair(a[0] + 1, a[1] + 1, b[0] - 0.5, b[1] - 2, R[1]); A.hair(a[0] + 1.6, a[1] + 1.4, b[0] + 0.4, b[1] - 2.5, R[3]); }
  A.speck(sh2[0], sh0[1], sh0[0] - sh2[0], 22, R[0], 30, 17);
  for (let i = 0; i < 9; i++) { const p = tat[i]; A.fine(p[0], p[1] - 0.6, '#c8a44a'); }                                   // a gold thread at the hem
  // candles: fat votive tapers stuck into the hump, weeping wax down the shawl
  const cand = [[-16, -45, 5.5, 0], [-6, -48.5, 6.5, 3], [-25, -38, 4.5, 5]].map(([x, y, h, sd]) => {
    const b = P(x, y), fl = [0, 0.5, -0.4, 0.3, -0.5, 0.2, 0.6, -0.2][(ph + sd + (walk ? 0 : 2)) % 8];
    A.poly([[b[0] - 1.3, b[1] + 1], [b[0] - 1.1, b[1] - h], [b[0] + 1.1, b[1] - h - 0.3], [b[0] + 1.3, b[1] + 1]], ['#3a2a18', '#6a5634', '#a8926a', '#d8c8a0', '#f4ead0'], { sh: 0.6, hl: 0.5 });
    A.limb([[b[0] - 0.9, b[1] - h + 1], [b[0] - 1.5, b[1] + 1.6]], 0.3, 0.5, ['#6a5634', '#a8926a', '#e0d0a8'], { contour: false });
    A.limb([[b[0] + 0.8, b[1] - h + 2], [b[0] + 1.3, b[1] + 2.4]], 0.3, 0.45, ['#6a5634', '#a8926a', '#e0d0a8'], { contour: false });
    A.hair(b[0], b[1] - h - 0.3, b[0], b[1] - h - 1.1, '#141010');
    const t = [b[0] + fl, b[1] - h - 4.5];
    A.shape((c, X, Y) => { c.moveTo(X(b[0] - 0.8), Y(b[1] - h - 1)); c.quadraticCurveTo(X(b[0] - 1 + fl * 0.4), Y(b[1] - h - 2.8), X(t[0]), Y(t[1])); c.quadraticCurveTo(X(b[0] + 1 + fl * 0.3), Y(b[1] - h - 2.8), X(b[0] + 0.8), Y(b[1] - h - 1)); }, ['#a02a08', '#e0601a', '#ffa040', '#ffe090', '#fffbe8'], { contour: false, edge: false });
    A.fine(b[0] + fl * 0.5, b[1] - h - 2.2, '#ffffff');
    return [b[0], b[1] - h - 2.5];
  });
  // ---- the birth-slit, low on the belly: lips of raw flesh, a furnace-red dark inside
  const sl = P(25.5, -8.5), sh = 9 + open * 3, sw2 = 1.2 + open * 2.4;
  for (let i = 0; i < 5; i++) { const a = -1.2 + i * 0.6, r = sh / 2 + 3; A.hair(sl[0] - Math.cos(a) * (sw2 + 2), sl[1] + Math.sin(a) * r * 0.8, sl[0] - Math.cos(a) * (sw2 + 4), sl[1] + Math.sin(a) * r, S[0]); A.hair(sl[0] + Math.cos(a) * (sw2 + 2), sl[1] + Math.sin(a) * r * 0.8, sl[0] + Math.cos(a) * (sw2 + 3.5), sl[1] + Math.sin(a) * r, S[0]); }
  A.ell(sl[0], sl[1], sw2 + 2.4, sh / 2 + 2, 'gut', { sh: 1, hl: 0.7, rot: 0.12 });
  A.ell(sl[0] + 0.2, sl[1], sw2, sh / 2, ['#120204', '#2a0406', '#4a0a0c', '#7a1810', '#a02a14'], { sh: 0.6, hl: 0.4, rot: 0.12, contour: false });
  A.ell(sl[0] + 0.4, sl[1] + 0.5, sw2 * 0.45, sh / 2 * 0.6, ['#6a1406', '#b83a10', '#ff7a2a', '#ffb050', '#ffe0a0'], { sh: 0.3, hl: 0.2, rot: 0.12, contour: false, edge: false });
  for (let i = 0; i < 4; i++) { const y = sl[1] - sh / 2 + 1 + i * sh / 4; A.hair(sl[0] - sw2 - 1.6, y, sl[0] - sw2 - 0.6, y + 0.8, S[0]); A.hair(sl[0] + sw2 + 1.6, y, sl[0] + sw2 + 0.6, y + 0.8, S[0]); }   // puckered stitches of scar round it
  if (open > 0.6) {                                                                                 // something small pushing out: a Husk's hand
    const hx0 = sl[0] + 0.6, hy0 = sl[1] + 0.5, k = (open - 0.6) / 0.4;
    for (let i = 0; i < 3; i++) A.limb([[hx0, hy0], [hx0 + 1.2 + i * 0.3, hy0 - 1.4 + i * 1.2], [hx0 + 1.5 + i * 0.4 + k * 1.2, hy0 - 2.4 + i * 1.6]], 0.35, 0.3, 'huskSkin', { contour: true, sh: 0.2 });
  }
  A.line(sl[0] + 0.2, sl[1] + sh / 2 + 0.4, sl[0] + 0.4, sl[1] + sh / 2 + 2.5 + (ph % 2), '#6a0a0a', 0.6);
  // ---- the near teats: rows of them down the breast and the flank, swinging a beat behind the body
  const nips = [];
  [[-16, -32, -17, -26, 2.8], [-6, -36, -6, -28, 3.4], [2, -31, 3, -20, 4.8], [9, -39, 12, -30, 4], [13, -29, 17, -17, 5.2], [19, -35, 23, -26, 4]].forEach(([x, y, x1, y1, s], k) => nips.push(teat([x, y], [x1, y1], s, {}, k + 3)));
  // ---- the tiny arms folded in prayer under the wimple
  const aF = P(10, -41), hands = [hx + 3.6, hy + 6.2];
  A.limb([aF, [aF[0] + 3, aF[1] + 3], hands], 0.8, 0.6, skin, { contour: false, tone: -1.2 });
  A.limb([P(12.5, -40), [hands[0] - 0.8, hands[1] + 1.5], hands], 0.85, 0.65, skin, { sh: 0.3 });
  A.ell(hands[0] + 0.3, hands[1] - 0.8, 0.8, 1.6, skin, { sh: 0.3, hl: 0.3, rot: 0.3 });
  A.hair(hands[0] + 0.5, hands[1] - 2.2, hands[0] + 0.1, hands[1] + 0.4, S[1]);
  // ---- the black veil and the small serene face, pale as a host
  ZN.path(A, [['M', hx - 4.6, hy + 1], ['Q', hx - 5.2, hy - 6, hx + 0.4, hy - 5.8], ['Q', hx + 4.8, hy - 5.6, hx + 4.8, hy - 1], ['L', hx + 4.4, hy + 3], ['Q', hx + 5.4, hy + 5.4, hx + 3, hy + 7], ['Q', hx - 3, hy + 8, hx - 8, hy + 6.5], ['Q', hx - 5.6, hy + 3, hx - 4.6, hy + 1]], 'znCope', { sh: 1, hl: 0.8 });
  A.hair(hx - 6.5, hy + 6, hx - 2.8, hy + 1.5, '#2a2430'); A.hair(hx - 3, hy + 7, hx + 1.4, hy + 4.5, '#2a2430'); A.hair(hx - 3.8, hy - 4.4, hx + 0.5, hy - 5.2, '#3a3440');
  const fc = [hx + 1.5, hy - 0.2];
  A.ell(fc[0], fc[1], 2.9, 3.6, 'porcelain', { sh: 0.8, hl: 0.7 });
  A.hair(fc[0] - 1.9, fc[1] - 2.9, fc[0] + 2.4, fc[1] - 3.1, '#e8e2d0');                                           // the white band of the coif
  A.hair(fc[0] - 1, fc[1] - 0.6, fc[0] + 0.3, fc[1] - 0.3, '#3a3040'); A.hair(fc[0] + 1.3, fc[1] - 0.3, fc[0] + 2.4, fc[1] - 0.6, '#3a3040');   // closed eyes, downcast
  A.fine(fc[0] - 0.6, fc[1] - 1.2, '#7a7684'); A.fine(fc[0] + 1.8, fc[1] - 1.2, '#7a7684');                        // the lids
  A.fine(fc[0] + 2.8, fc[1] + 0.6, '#7a7684'); A.fine(fc[0] + 2.6, fc[1] + 1.1, '#b4b0bc');                        // the nose
  A.hair(fc[0] + 0.2, fc[1] + 2.1, fc[0] + 1.5, fc[1] + 2.2, '#6a3440'); A.fine(fc[0] + 1.8, fc[1] + 1.9, '#6a3440'); A.fine(fc[0] - 0.1, fc[1] + 1.9, '#6a3440');   // a small closed smile
  A.hair(fc[0] - 0.4, fc[1], fc[0] - 0.5, fc[1] + 1.4 + (idle ? ph * 0.4 : 1), '#9a0a0c');                          // a tear of blood
  A.speck(fc[0] - 2, fc[1] - 2, 4, 4, '#f4eef4', 5, 3);
  // ---- the spray: bile flung from every teat and the slit on the heave
  if (atk) {
    // the slit gushes a fan of bile; the front teats squirt thin jets over it
    const reachK = [1, 1.35, 1.6][ph], src = [sl[0] + 1.5, sl[1]];
    [-0.35, -0.05, 0.25].forEach((ang, j) => {
      for (let i = 0; i < 9; i++) {
        const t = (i + 1) / 9, d = 25 * t * reachK, p = [src[0] + Math.cos(ang) * d, src[1] + Math.sin(ang) * d + 6 * t * t * reachK];
        if (ph === 0 && i < 6) A.line(p[0] - 1.8, p[1] - Math.sin(ang) * 1.8, p[0] + 0.6, p[1], BL[2 + ((i + j) % 3)], 2 - i * 0.15);
        else if (ph === 1 && i > 1 && (i + j) % 2 === 0) { A.ell(p[0], p[1], 1.1, 0.9, 'znBile', { sh: 0.3, hl: 0.3 }); A.fine(p[0] - 0.3, p[1] - 0.3, BL[4]); }
        else if (ph === 2 && i > 4 && (i + j) % 3 === 0) { A.px(p[0], p[1] + 2, BL[3]); A.fine(p[0], p[1] + 2, BL[4]); }
      }
    });
    nips.slice(-3).forEach((n, k) => { if (ph === 2) return; for (let i = 0; i < 7; i++) { const t = (i + 1) / 7, p = [n[0] + 1 + 14 * t * reachK, n[1] - 2 * t + 7 * t * t]; if (ph === 0 ? i < 5 : i % 2 === k % 2) A.line(p[0] - 1, p[1], p[0] + 0.8, p[1] + 0.2, BL[3 + (i % 2)], 0.6); } });
    if (ph > 0) for (let i = 0; i < 12; i++) A.px(28 + hash(i, ph) * 18, -0.5 - hash(ph, i * 3) * 2.5 * ph, BL[1 + (i % 3)]);   // splashing on the floor
  }
  // tenebrism: the candles are the key light, the slit a red furnace, a cold rim behind
  cand.forEach((c, i) => A.lamp(c[0], c[1], [255, 170, 90], 26 - i * 4, 1.1));
  A.lamp(sl[0] + 1, sl[1], [255, 90, 40], 9 + open * 6, 0.8);
  A.rim([120, 128, 160], 0.3);
};

// ------------------------------------------------------------------- THE LONG EXHALE (Yh'Anuul, breath)
// The last breath of everyone who died on the god's body, still going. A tall column of wind wound in grave-shrouds,
// thin as gauze, with the faces of the exhaled pressed out through it, every mouth open on the same long note. At
// the top a hooded face, the widest mouth of all. Gaunt hands reach out of the sleeves of wind. It floats: a
// twisting tail where its feet should be, tatters streaming behind it. Wind: it draws in, the air is pulled into
// the great mouth and the column narrows. Attack: the blast, a cone of breath and a shriek of shrouds.
defMat('znGauze', 'rgba(20,26,40,0.8)', 'rgba(58,74,100,0.6)', 'rgba(108,128,156,0.5)', 'rgba(168,190,214,0.58)', 'rgba(222,236,250,0.72)');
defMat('znGauzeD', 'rgba(10,12,22,0.6)', 'rgba(34,44,64,0.45)', 'rgba(66,82,108,0.4)', 'rgba(110,130,156,0.42)', 'rgba(160,182,206,0.45)');
defMat('znFace', 'rgba(34,42,60,0.92)', 'rgba(96,112,138,0.9)', 'rgba(156,174,198,0.9)', 'rgba(204,218,234,0.92)', 'rgba(242,248,255,0.95)');
MFRAME.hbreath = [58, 72]; MPX_K.hbreath = 1.4; MPX_WALK.hbreath = 4;
MPX.hbreath = function (A, pose, ph, pal) {
  const { walk, wind, atk, idle } = ZN.poses(pose), lerp = ZN.lerp;
  const gz = ZN.T('znGauze', pal, 0.1), gzd = 'znGauzeD', fc = 'znFace', F = MAT[fc], Gz = MAT.znGauze;
  const VOID = 'rgba(4,6,14,0.94)', EYE = '#e8f6ff';
  const T8 = (walk ? ph : idle ? ph * 2 : wind ? ph : ph + 3) / 8 * 6.2832;   // the phase the wind turns on
  let Y0 = -7, lean = 0, pinch = 1, gape = 0.4, stream = 1, draw = 0;
  if (idle) Y0 += Math.sin(ph / 4 * 6.2832) * 1.4;
  if (walk) { Y0 += Math.sin(T8 * 2) * 1; lean = 3; stream = 1.5; }
  const wk = wind ? [0.35, 0.7, 1][ph] : 0, ak = atk ? [1, 0.7, 0.4][ph] : 0;
  if (wind) { lean = -3.5 * wk; pinch = 1 - 0.28 * wk; gape = 0.15; draw = wk; stream = 0.6; Y0 -= wk * 1.5; }
  if (atk) { lean = 5 * ak; pinch = 1 + 0.18 * ak; gape = 1.3 * ak + 0.3; stream = 2.3 * ak + 0.6; }
  const yb = Y0, yt = -85 + Y0 * 0.4, H = yb - yt;
  const cx = t => Math.sin(t * 4.2 + T8) * 1.6 * (1 - t * 0.5) + lean * t * t + Math.sin(t * 2 - 0.5) * 2;
  const wd = t => (t < 0.76 ? 0.8 + 11.4 * Math.pow(t / 0.76, 1.5) : 12.2 - (t - 0.76) / 0.24 * 7) * (t > 0.2 && t < 0.8 ? pinch : 1);
  const at = t => [cx(t), yb - H * t];
  // ---- the shrouds streaming out behind: long ribbons of grave-cloth, waving
  const ribbon = (t0, side, len, w, amp, mat, seed, o = {}) => {
    const o0 = at(t0), n = 12, L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const k = i / n, wave = Math.sin(k * 5 - T8 * 1.0 + seed) * amp * k * (0.6 + stream * 0.4), drop = k * k * (5 - stream * 1.8);
      const x = o0[0] + side * wd(t0) * 0.7 - k * len * (0.55 + stream * 0.25), y = o0[1] + wave + drop * 2 + k * 3;
      const ww = w * (1.15 - k * 0.8);
      L.push([x, y - ww]); R.push([x + (i === n ? -2 : 0), y + ww + (i % 3 === 1 ? 0.8 : 0)]);
    }
    A.shape((c, X, Y) => { L.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); for (let i = R.length - 1; i >= 0; i--) c.lineTo(X(R[i][0]), Y(R[i][1])); }, mat, { sh: 0.9, hl: 0.6, contour: false, ...o });
    for (let i = 2; i < n - 1; i += 3) A.hair(L[i][0], L[i][1] + 0.5, L[i + 1][0], (L[i + 1][1] + R[i + 1][1]) / 2, MAT[mat] ? MAT[mat][1] : Gz[1]);
    return L[n];
  };
  ribbon(0.9, -1, 36, 3.6, 4.5, gz, 0, { tone: -1.6 }); ribbon(0.74, -1, 34, 3.4, 4, gz, 2.1, { tone: -1.2 }); ribbon(0.55, -1, 26, 2.6, 3.4, gzd, 4);
  // ---- the arms: sleeves of wind, gaunt hands. Drawn in on the wind-up, thrown open on the blast
  const arm = (side, o) => {
    const s0 = at(0.7), sh = [s0[0] + side * 2 + 1, s0[1] + 1];
    let hd;
    if (wind) hd = [sh[0] + 6 - wk * 7 + side * 2, sh[1] + 4 + wk * 3];
    else if (atk) hd = [sh[0] + 13 + ak * 3 + side * 1.5, sh[1] - 3 * ak + side * 3];
    else hd = [sh[0] + 9 + side * 1.5 + Math.sin(T8 + side) * 1, sh[1] + 7 + Math.cos(T8 + side) * 1];
    const el = [(sh[0] + hd[0]) / 2 - 1, (sh[1] + hd[1]) / 2 + 3];
    A.limb([sh, el, hd], 3.4, 2.1, gz, { sh: 1.2, hl: 0.7, ...o });
    A.poly([[el[0] - 1, el[1] - 2], [hd[0] - 1, hd[1] - 2.8], [hd[0] + 0.5, hd[1] + 3.2], [hd[0] - 5 - stream, hd[1] + 6.5], [el[0] - 3, el[1] + 4]], gz, { sh: 0.8, hl: 0.5, contour: false, ...o });   // the bell of the sleeve hanging open
    for (let i = 0; i < 4; i++) { const k = 0.3 + i * 0.2, p = [lerp(sh, el, k)[0] - 1, lerp(sh, el, k)[1] + 2.4]; A.limb([p, [p[0] - 5 - stream * 2 - i, p[1] + 3 + Math.sin(T8 + i) * 1.5]], 0.9, 0.2, gz, { sh: 0.4, hl: 0.3, contour: false, ...o }); }   // tatters hanging off the sleeve
    const dx = hd[0] - el[0], dy = hd[1] - el[1], ll = Math.hypot(dx, dy) || 1, ux = dx / ll, uy = dy / ll, sp = atk ? 0.45 : wind ? 0.12 : 0.25;
    A.ell(hd[0] + ux, hd[1] + uy, 1.9, 1.3, fc, { rot: Math.atan2(uy, ux), sh: 0.4, hl: 0.4, ...o });
    for (let i = 0; i < 4; i++) { const a = Math.atan2(uy, ux) + (i - 1.5) * sp, f1 = [hd[0] + ux * 1.8 + Math.cos(a) * 2.2, hd[1] + uy * 1.8 + Math.sin(a) * 2.2], f2 = [f1[0] + Math.cos(a + (wind ? 0.9 : 0.35)) * 3, f1[1] + Math.sin(a + (wind ? 0.9 : 0.35)) * 3];
      A.limb([[hd[0] + ux * 1.3, hd[1] + uy * 1.3], f1, f2], 0.45, 0.3, fc, { sh: 0.2, hl: 0.3, edge: false, ...o }); }
  };
  // ---- the column behind (a wider, fainter body) and the column itself, its edges torn
  const column = (grow, mat, o, jag) => {
    const n = 22, L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n * 0.88, p = at(t), w = wd(t) * grow, j = jag * ((i % 3 === 0) ? 1.4 : (i % 3 === 1) ? 0.2 : 0.8) * (1 - t * 0.6);
      L.push([p[0] - w - j - stream * t * 1.2, p[1] + (i % 2) * 0.8]); R.push([p[0] + w + j * 0.4, p[1]]);
    }
    A.shape((c, X, Y) => { c.moveTo(X(L[0][0] + 0.5), Y(L[0][1] + 2)); L.forEach(p => c.lineTo(X(p[0]), Y(p[1]))); for (let i = R.length - 1; i >= 0; i--) c.lineTo(X(R[i][0]), Y(R[i][1])); }, mat, o);
  };
  arm(-1, { tone: -1.5, contour: false });
  column(1.35, gzd, { sh: 1.5, hl: 0.8, contour: false }, 2.4);
  // the tail: a twist of wind where the feet should be, spinning
  for (let i = 0; i < 3; i++) { const t0 = i * 0.06, a = at(t0), b = at(t0 + 0.14); A.limb([[a[0] + Math.sin(T8 + i * 2) * 2, a[1] + 3 - i], [(a[0] + b[0]) / 2 - 2, (a[1] + b[1]) / 2], b], 0.4 + i * 0.3, 2.4 + i, gzd, { sh: 0.6, hl: 0.4, contour: false }); }
  column(1, gz, { sh: 2.2, hl: 1.2 }, 1.2);
  // spiralling bands of shroud wound round the column, turning with the wind
  for (let b = 0; b < 5; b++) {
    const t0 = 0.08 + b * 0.14, pts = [];
    for (let i = 0; i <= 8; i++) { const t = t0 + i * 0.022, p = at(t), w = wd(t), s = Math.sin(i / 8 * 3.1416 - 1.57 + ((T8 * 0.5 + b) % 1) * 0.4); pts.push([p[0] + w * s * 0.95, p[1] - i * 0.35]); }
    A.limb(pts, 1.2, 1.8, gz, { sh: 0.6, hl: 0.6, lit: 0.06, contour: false });
    pts.forEach((p, i) => { if (i % 2) A.fine(p[0], p[1] - 0.8, Gz[4]); });
  }
  // ---- a wailing face pressed out through the wind
  const face = (t, dx, s, turn, open, o = {}) => {
    const p = at(t), c = [p[0] + dx, p[1]], tf = ZN.tf(c[0], c[1], s, turn);
    const mo = 2.6 + open * 3.2;
    ZN.path(A, [['M', -2.4, -3.6], ['Q', 0, -5.2, 2.6, -3.4], ['Q', 3.2, 0, 2.2, 2 + mo * 0.6], ['Q', 0.2, 4.4 + mo * 0.7, -1.8, 2 + mo * 0.6], ['Q', -3.2, 0, -2.4, -3.6]], fc, { sh: 0.8, hl: 0.6, ...o }, tf);
    ZN.path(A, [['M', -1.9, -1.2], ['L', -0.4, -0.6], ['L', -0.5, 0.6], ['L', -1.8, 0.3]], VOID, { flat: true, contour: false }, tf);   // eyes: sockets slanting up in anguish
    ZN.path(A, [['M', 0.6, -0.6], ['L', 2.1, -1.3], ['L', 2.1, 0.3], ['L', 0.7, 0.6]], VOID, { flat: true, contour: false }, tf);
    const e1 = tf([-1.1, -0.1]), e2 = tf([1.4, -0.2]); A.fine(e1[0], e1[1], o.tone ? '#8aa0b8' : EYE); A.fine(e2[0], e2[1], o.tone ? '#8aa0b8' : EYE);
    ZN.path(A, [['M', -0.9, 1.6], ['Q', 0.2, 1.1, 1.1, 1.6], ['Q', 1.5, 1.6 + mo * 0.6, 0.2, 1.8 + mo], ['Q', -1.3, 1.6 + mo * 0.6, -0.9, 1.6]], VOID, { flat: true, contour: false }, tf);   // the long O of the mouth
    const b1 = tf([-1.9, -2.2]), b2 = tf([-0.3, -1.5]), b3 = tf([0.8, -1.5]), b4 = tf([2.2, -2.3]);
    A.hair(b1[0], b1[1], b2[0], b2[1], F[1]); A.hair(b3[0], b3[1], b4[0], b4[1], F[1]);                            // brows knotted upward
    const c1 = tf([-2, 1]), c2 = tf([-1.3, 3.6]); A.hair(c1[0], c1[1], c2[0], c2[1], F[1]);                          // the hollow of the cheek
  };
  const op = gape, mouthIn = wind ? 0.1 : op;
  face(0.36, -0.5, 1.05, -0.2, mouthIn * 0.8, { tone: -1 });
  face(0.66, -5, 1.4, -0.28, mouthIn * 0.9, { tone: -0.5 });
  face(0.52, 4, 1.35, 0.22, mouthIn, {});
  // ---- the hood at the top, and the great face in it
  const hp = at(0.86), hs = 1.7;
  const htf = ZN.tf(hp[0] + 0.5, hp[1] - 1, 1.45);
  ZN.path(A, [['M', -7, 6], ['Q', -9, -4, -2, -9.5], ['Q', 1, -11.5, 3, -9], ['Q', 8, -3, 7.5, 6], ['Q', 0, 9, -7, 6]], gz, { sh: 1.4, hl: 0.9 }, htf);
  ZN.path(A, [['M', -2, -9.4], ['Q', -4 - stream * 2, -11, -8 - stream * 3, -9 + Math.sin(T8) * 1.2], ['Q', -4, -8.5, -2, -9.4]], gz, { sh: 0.5, hl: 0.4, contour: false }, htf);   // the peak of the hood blown back
  ZN.path(A, [['M', -4.6, 5], ['Q', -5.6, -2.6, -0.6, -6.4], ['Q', 4.8, -4, 5, 5], ['Q', 0, 7, -4.6, 5]], VOID, { flat: true, contour: false }, htf);   // the dark inside
  const face0 = at(0.86);
  const gtf = ZN.tf(face0[0] + 1.4, face0[1] + 0.2, hs, 0.05), mo = 2.6 + gape * 3.4;
  ZN.path(A, [['M', -2.4, -3.8], ['Q', 0, -5.2, 2.5, -3.6], ['Q', 3, 0, 2.1, 2 + mo * 0.5], ['Q', 0.2, 3.8 + mo * 0.7, -1.7, 2 + mo * 0.5], ['Q', -3, 0, -2.4, -3.8]], fc, { sh: 0.6, hl: 0.6, lit: 0.1 }, gtf);
  ZN.path(A, [['M', -1.9, -1.4], ['L', -0.3, -0.7], ['L', -0.4, 0.5], ['L', -1.8, 0.2]], VOID, { flat: true, contour: false }, gtf);
  ZN.path(A, [['M', 0.6, -0.7], ['L', 2.1, -1.5], ['L', 2.1, 0.2], ['L', 0.7, 0.5]], VOID, { flat: true, contour: false }, gtf);
  const g1 = gtf([-1, -0.2]), g2 = gtf([1.4, -0.3]); A.fine(g1[0], g1[1], EYE); A.fine(g2[0], g2[1], EYE); A.fine(g1[0] + 0.7, g1[1], '#9ad0ff'); A.fine(g2[0] + 0.7, g2[1], '#9ad0ff');
  ZN.path(A, [['M', -1, 1.5], ['Q', 0.2, 1, 1.2, 1.5], ['Q', 1.7, 1.5 + mo * 0.6, 0.2, 1.8 + mo], ['Q', -1.5, 1.5 + mo * 0.6, -1, 1.5]], VOID, { flat: true, contour: false }, gtf);
  const q1 = gtf([-1.9, -2.3]), q2 = gtf([-0.3, -1.6]), q3 = gtf([0.8, -1.7]), q4 = gtf([2.2, -2.5]); A.hair(q1[0], q1[1], q2[0], q2[1], F[1]); A.hair(q3[0], q3[1], q4[0], q4[1], F[1]);
  const m1 = gtf([0.2, 2 + mo * 0.55]);
  // ---- the near arm over it all, and the loose tatters in front
  arm(1, {});
  ribbon(0.62, 1, 22, 2.2, 3, gz, 1.3, { lit: 0.1 });
  ribbon(0.2, -1, 18, 1.4, 2.4, gz, 3.3);
  ribbon(0.08, 1, 12, 1, 2, gz, 5);
  // ---- the breath itself: drawn in along converging streaks, or blasted out in a cone
  const WHITE = 'rgba(230,242,255,0.8)', PALE = 'rgba(170,196,226,0.6)';
  if (wind) {
    for (let i = 0; i < 9; i++) {
      const a = -0.9 + i * 0.22, r1 = 30 - wk * 10 + (i % 3) * 3, r0 = r1 - 5 - wk * 5, off = (ph * 4 + i * 3) % 6;
      A.hair(m1[0] + Math.cos(a) * (r1 - off), m1[1] + Math.sin(a) * (r1 - off) * 0.8, m1[0] + Math.cos(a) * (r0 - off), m1[1] + Math.sin(a) * (r0 - off) * 0.8, i % 2 ? WHITE : PALE);
    }
    for (let i = 0; i < 6; i++) A.fine(m1[0] + 6 + hash(i, ph) * 14, m1[1] - 8 + hash(ph, i) * 20, WHITE);
  }
  if (atk) {
    const reach = [18, 30, 38][ph];
    for (let i = 0; i < 11; i++) {
      const a = -0.35 + i * 0.07 + Math.sin(i * 2.3) * 0.03, r0 = 2 + (i % 3) * 3 + ph * 6, r1 = Math.min(reach, r0 + 10 + (i % 4) * 4);
      if (r1 > r0) A.line(m1[0] + Math.cos(a) * r0, m1[1] + Math.sin(a) * r0, m1[0] + Math.cos(a) * r1, m1[1] + Math.sin(a) * r1, i % 2 ? WHITE : PALE, ph === 0 ? 0.8 : 0.5);
    }
    for (let r = 0; r < 2; r++) { const d = 7 + ph * 8 + r * 9, hh = 3 + d * 0.3; if (d > reach) continue; A.shape((c, X, Y) => { c.moveTo(X(m1[0] + d), Y(m1[1] - hh)); c.quadraticCurveTo(X(m1[0] + d + 3), Y(m1[1]), X(m1[0] + d), Y(m1[1] + hh)); c.quadraticCurveTo(X(m1[0] + d + 1.6), Y(m1[1]), X(m1[0] + d), Y(m1[1] - hh)); }, PALE, { flat: true, contour: false }); }   // rings of pressure
  }
  // cold light from the eyes and the throat; a faint rim
  A.lamp(m1[0], m1[1] - 1, [170, 214, 255], 18 + gape * 6 + (wind ? wk * 6 : 0), 0.8);
  A.lamp(g1[0] + 1, g1[1], [200, 230, 255], 5, 0.6);
  A.rim([160, 190, 230], 0.45);
};

// ------------------------------------------------------------------- A SILENT ONE (Ur-Nihl, the Silence)
// Not a body: a place where the world has been cut out in the shape of one. Matte black with no light on it at all,
// no shading, no features; only a thin, faint violet-white rim where the edge of the world frays around it. Too
// tall, too narrow, arms hanging past the knees, fingers far too long. Above the small head a crown that is not
// there, only its outline, the world missing inside it. It floats a hand above the floor and does not breathe; on
// the walk it glides without a step, the head perfectly still. Wind: the fingers spread and the rim flickers and
// frays. Attack: one arm is simply there, far forward, the fingers closed into a single spike.
MFRAME.hhollow = [50, 60]; MPX_K.hhollow = 1.4; MPX_WALK.hhollow = 3;
MPX.hhollow = function (A, pose, ph, pal) {
  const { walk, wind, atk, idle } = ZN.poses(pose), lerp = ZN.lerp;
  const VOID = '#020104', VO = { flat: true, contour: false, edge: false };
  const wk = wind ? [0.35, 0.7, 1][ph] : 0, ak = atk ? [1, 0.55, 0.2][ph] : 0;
  // almost no motion: a float that never changes in idle, a glide with the head locked in place on the walk
  let Y0 = -4, lean = 0, tilt = 0;
  if (idle) { tilt = ph === 3 ? 0.18 : 0; }                           // once in a while the head is simply at another angle
  if (walk) { Y0 += [0, 0, -0.5, -0.5, 0, 0, 0.5, 0.5][ph]; lean = 1.5; }
  if (wind) { Y0 -= wk * 1.5; }
  if (atk) { lean = 4 * ak; }
  const hip = [0 + lean * 0.3, -34 + Y0], sh = [lean, -58 + Y0], hd = [0.6 + lean * 1.1, walk ? -70.5 : -66.5 + Y0];
  const S = 6.2;                                                       // half the width of the shoulders
  // ---- legs pressed together, tapering to points that never touch the floor
  const drift = walk ? -1.4 : 0;
  A.limb([[hip[0] - 2, hip[1]], [hip[0] - 2.2 + drift * 0.4, hip[1] + 16], [hip[0] - 1.6 + drift, Y0 + 0.5]], 3.1, 0.5, VOID, VO);
  A.limb([[hip[0] + 1.8, hip[1]], [hip[0] + 1.6 + drift * 0.3, hip[1] + 16], [hip[0] + 1.2 + drift * 0.8, Y0 - 1]], 3.1, 0.5, VOID, VO);
  // ---- the torso: a long narrow wedge, shoulders squared too high
  const wa = lerp(sh, hip, 0.62);
  A.poly([[sh[0] - S, sh[1]], [sh[0] + S, sh[1] - 0.4], [sh[0] + S - 1.2, sh[1] + 4], [sh[0] + 3.4, sh[1] + 10], [wa[0] + 3, wa[1]], [hip[0] + 3.6, hip[1] - 1], [hip[0] + 3.4, hip[1] + 1.5], [hip[0] - 3.8, hip[1] + 1.5], [hip[0] - 3.6, hip[1] - 1], [wa[0] - 3, wa[1]], [sh[0] - 3.4, sh[1] + 10], [sh[0] - S + 1.2, sh[1] + 4]], VOID, VO);
  // ---- neck and head: too long a neck, too small a head
  A.limb([[sh[0] + 0.3, sh[1] + 1], [hd[0], hd[1] + 3]], 1.6, 1.2, VOID, VO);
  A.ell(hd[0], hd[1], 2.9, 3.7, VOID, { ...VO, rot: tilt });
  // ---- the arms, hanging past the knees; the fingers longer than the forearm
  const arm = (side) => {
    const s0 = [sh[0] + side * (S - 0.4), sh[1] + 1];
    let el, wr, spread = 0.16, flen = 11, fdir = Math.PI / 2;
    if (wind) {
      el = [s0[0] + side * (3 + wk * 5), s0[1] + 11 - wk * 3]; wr = [el[0] + side * (2 + wk * 7), el[1] + 11 - wk * 6];
      spread = 0.12 + wk * 0.3; fdir = Math.PI / 2 - side * wk * 0.9;
    } else if (atk && side > 0) {
      el = [s0[0] + 8 + ak * 3, s0[1] + 4 - ak * 1]; wr = [el[0] + 8 + ak * 5, el[1] + 2 - ak * 1]; spread = 0.03; flen = 13; fdir = 0.12;
    } else {
      const sw = walk ? -0.6 : 0;
      el = [s0[0] + side * 2.6 + sw, s0[1] + 12]; wr = [el[0] + side * 1.2 + sw * 1.5, el[1] + 12];
      fdir = Math.PI / 2 + (walk ? 0.12 : 0); if (atk) { el = [s0[0] - 1, s0[1] + 12]; wr = [el[0] - 1.2, el[1] + 11]; }
    }
    A.limb([s0, el], 1.8, 1.4, VOID, VO); A.limb([el, wr], 1.4, 1, VOID, VO);
    A.ell(wr[0] + Math.cos(fdir) * 1, wr[1] + Math.sin(fdir) * 1, 1.3, 1.6, VOID, { ...VO, rot: fdir - Math.PI / 2 });
    const tips = [];
    for (let i = 0; i < 4; i++) {
      const a = fdir + (i - 1.5) * spread * side, l = flen * (i === 1 || i === 2 ? 1 : 0.86), k0 = [wr[0] + Math.cos(a) * 1.6, wr[1] + Math.sin(a) * 1.6];
      const k1 = [k0[0] + Math.cos(a) * l * 0.5, k0[1] + Math.sin(a) * l * 0.5], bend = wind ? 0.15 * side : idle ? 0.08 : 0, k2 = [k1[0] + Math.cos(a + bend) * l * 0.5, k1[1] + Math.sin(a + bend) * l * 0.5];
      A.limb([k0, k1, k2], 0.55, 0.22, VOID, VO); tips.push(k2);
    }
    return tips;
  };
  const tipsF = arm(-1), tipsN = arm(1);
  // ---- the crown of nothing: a crown cut out of the world a finger's width above the head, tines of pure absence
  const cr = [hd[0] + Math.sin(tilt) * 3, hd[1] - 4.8 - (wind ? wk : 0)], cw = 5.2 + (wind ? wk * 0.8 : 0);
  const tines = [];
  for (let i = 0; i <= 10; i++) { const x = cr[0] - cw + i * cw / 5, y = cr[1] - 1.3 - (i % 2 ? 0 : [3, 5, 7, 5.4, 4, 2.8][i / 2]); tines.push([x, y]); }
  A.poly([[cr[0] - cw + 0.6, cr[1] + 0.6], ...tines, [cr[0] + cw - 0.6, cr[1] + 0.6], [cr[0] + 0.4, cr[1] + 1.4]], VOID, VO);
  // ---- the rim: every pixel on the edge of the hole frays into a faint violet-white light
  const DEN = 2 * A.U / A.K, ox = A.W2 / 2, oy = A.H2 - 2 * DEN, U = A.U;
  const edge = [];
  for (let j = 1; j < A.H2 - 1; j++) for (let i = 1; i < A.W2 - 1; i++) {
    const a = (i - ox) / U, b = (j - oy) / U;
    if (!A.at(a, b)) continue;
    const e = !A.at(a - 1 / U, b) || !A.at(a + 1 / U, b) || !A.at(a, b - 1 / U) || !A.at(a, b + 1 / U);
    if (e) edge.push([a, b, !A.at(a - 1 / U, b) || !A.at(a, b - 1 / U)]);
  }
  const fl = wind ? 0.25 + wk * 0.45 : 0.08, seed = ph + (wind ? 10 : walk ? 20 : atk ? 30 : 0);
  edge.forEach(([a, b, lit], k) => {
    const r = hash(k * 3 + seed * 17, k + seed);
    if (r < fl * 0.5) return;                                                 // gaps where the edge has frayed away
    A.fine(a, b, r > 1 - fl * 0.45 ? '#e8e0ff' : lit ? (r > 0.6 ? '#7a6ca2' : '#584c7e') : (r > 0.7 ? '#3e3460' : '#221c36'));
  });
  // the edge is not quite where it should be: a faint second rim a hair to the side, misregistered
  if (walk || wind) edge.forEach(([a, b], k) => { if (k % 5 === (ph % 5) && !A.at(a - 2 / U, b)) A.fine(a - 2 / U, b + (walk ? 1 / U : 0), 'rgba(150,130,210,0.2)'); });
  if (atk && ph < 2) edge.forEach(([a, b], k) => { if (b > -60 + (ph ? 8 : 0) || k % 2) { if (!A.at(a - 9, b)) A.fine(a - 9, b, ph ? 'rgba(150,130,220,0.14)' : 'rgba(170,150,230,0.32)'); if (!ph && !A.at(a - 17, b) && k % 2) A.fine(a - 17, b, 'rgba(150,130,220,0.16)'); } });   // after-images of where it was a moment ago
  // deep inside, nothing: a few specks of far-off dimness that drift
  for (let i = 0; i < 5; i++) { const x = hip[0] - 3 + hash(i, 7) * 6, y = sh[1] + 4 + hash(7, i) * 30 + (ph % 4) * 0.4 * (i % 2 ? 1 : -1); if (A.at(x, y)) A.fine(x, y, '#150f22'); }
  // static where the fingers end, and around it when the rim flickers
  tipsN.concat(tipsF).forEach((p, i) => { if ((i + ph) % 3 === 0) A.fine(p[0] + 1, p[1] + 1, 'rgba(200,190,255,0.6)'); });
  if (wind) for (let i = 0; i < 3 + ph * 3; i++) { const x = -20 + hash(i, ph + 3) * 40, y = -76 + hash(ph + 5, i) * 74; if (!A.at(x, y)) A.fine(x, y, i % 3 ? 'rgba(180,165,240,0.5)' : '#f0eaff'); }
};
