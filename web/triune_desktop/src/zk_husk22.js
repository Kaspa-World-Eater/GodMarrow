
// =================================================================== the HUSK, painted at full density
// A pilgrim who drank from the god's wound: bent double under a hump of spine, head hung out in front of it,
// arms dangling to the knees, chest split open and smouldering with the god's blood, a rotten mantle on the hump.
// Built as anatomy: a ribcage with every rib standing proud, the knuckles of the spine, a shoulder blade, wasted
// muscle over long bones, a skull with the skin shrunk onto it. It shambles: the near leg steps, the far leg drags
// its toes, the body lurches over each step, the arms swing a beat behind and the head bobs after them.
MFRAME.hollow = [52, 50]; MPX_K.hollow = 1.4; MPX_WALK.hollow = 4.6;
defMat('huskSkin', '#0c0a0c', '#2a2426', '#524c46', '#8a7c66', '#c8b28a');
defMat('huskDeep', '#060506', '#141012', '#221c1c', '#342a26', '#4a3c32');
defMat('huskBruise', '#140e18', '#2e2438', '#4a3e52', '#62566a', '#7a6e82');
MPX.hollow = function (A, pose, ph, pal) {
  const t = pal.tint, skin = tintMat('huskSkin', t, 0.45), deep = tintMat('huskDeep', t, 0.45), cloth = tintMat('clothBrown', t, 0.3), rag = tintMat('clothBone', t, 0.25);
  const S = MAT[skin], C = MAT[cloth], B = MAT.huskBruise, U = A.U;
  const walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk', idle = pose === 'idle';
  const G8 = walk ? gait(ph, 8) : null;
  let lean = 0, rise = 0, nod = 0, sway = 0, Y0 = 0, jawOpen = 2.5, armN = 0, armF = 0, reach = 0;
  if (idle) { const b = Math.sin(ph / 4 * 6.2832); Y0 = b * 0.6; nod = b * 0.8; jawOpen = 2.5 + (b > 0 ? 0.7 : 0); armN = b * 0.5; armF = -b * 0.5; }
  if (walk) { Y0 = G8.bob * 1.4 + 1.2; sway = G8.sway * 0.9; nod = Math.sin(G8.a * 2 - 0.9) * 1.1; armN = Math.sin(G8.a - 0.6) * 3.2; armF = -Math.sin(G8.a - 0.6) * 2.6; }
  if (wind) { const k = [0.25, 0.65, 1][ph]; rise = -8 * k; lean = -4 * k; jawOpen = 2.5 + 3.5 * k; reach = k; Y0 = (1 - k) * 1.5; }
  if (atk) { const k = [1, 0.7, 0.35][ph]; lean = 6 * k; nod = 3 * k; jawOpen = 4 + k; Y0 = 1.5 * k; reach = -k; }
  const hip = [-1 + sway * 0.4, -25 + Y0], sh = [5 + lean + sway, -40 + Y0 + rise], head = [12 + lean * 1.25 + sway, -40 + Y0 + nod + rise * 1.1 + (atk ? 2 : 0)];
  const far = { tone: -2, contour: false, cel: true, sh: 1.1, hl: 0.6 }, near = { contour: true, cel: true, sh: 1.1, hl: 0.6 };
  // joints of the legs
  let nk, na, fk, fa;
  if (walk) { const s = G8.swing; na = [2 + s * 7, -3 - G8.lift * 2.2]; nk = [6 + s * 4 + G8.lift * 1.5, -14 + Y0 * 0.4 - G8.lift * 1.5]; fa = [-2 - s * 6, -2.5]; fk = [3 - s * 3.5, -13.5 + Y0 * 0.4]; }
  else if (atk) { na = [6, -3]; nk = [9, -14]; fa = [-4, -3]; fk = [1, -13]; }
  else { na = [3, -3]; nk = [7, -13.5 + Y0 * 0.4]; fa = [-2, -3]; fk = [4, -13 + Y0 * 0.4]; }
  // a wasted limb: bone showing at the joints, the muscle gone slack, one tendon standing out
  const leg = (h, k, a, o, darker) => {
    A.limb([h, [(h[0] + k[0]) / 2 + 0.6, (h[1] + k[1]) / 2], k, [(k[0] + a[0]) / 2, (k[1] + a[1]) / 2], a], 2.6, 1.05, skin, o);   // one long wasted leg
    A.fine(k[0] + 0.6, k[1] - 1, darker ? S[2] : S[4]); A.fine(k[0] + 1, k[1] - 0.6, darker ? S[2] : S[4]); A.fine(k[0] + 1.2, k[1] + 0.4, S[0]);   // the knee's bone under the skin
    A.hair(k[0] - 0.3, k[1] + 2, a[0] - 0.2, a[1] - 1.5, darker ? S[0] : S[3]);               // the shin's edge
    A.shape((c, X, Y) => { c.moveTo(X(a[0] - 1.8), Y(a[1] + 3)); c.lineTo(X(a[0] - 1), Y(a[1] + 0.3)); c.quadraticCurveTo(X(a[0] + 3), Y(a[1] - 0.2), X(a[0] + 6), Y(a[1] + 3)); }, skin, { ...o, round: 0.9 });
    for (let i = 0; i < 4; i++) { A.hair(a[0] + 1 + i * 0.9, a[1] + 1, a[0] + 2.2 + i * 1, a[1] + 2.7, darker ? S[0] : S[1]); A.fine(a[0] + 2.4 + i, a[1] + 2.8, '#14100c'); }   // toes and black nails
  };
  const arm = (s0, e, w, o, darker, bandage) => {
    A.limb([s0, e, w], 1.8, 1, skin, o);
    A.fine(e[0] + 0.6, e[1] - 0.4, darker ? S[2] : S[4]); A.fine(e[0] + 0.8, e[1] + 0.2, S[0]);                   // the point of the elbow
    A.hair(s0[0] - 0.8, s0[1] + 1, e[0] - 0.6, e[1] - 0.5, darker ? S[1] : S[4]);
    if (bandage) for (let i = 0; i < 4; i++) { const k = 0.25 + i * 0.12, bx = e[0] + (w[0] - e[0]) * k, by = e[1] + (w[1] - e[1]) * k; A.shape((c, X, Y) => { c.moveTo(X(bx - 1.7), Y(by - 0.9)); c.lineTo(X(bx + 1.7), Y(by)); c.lineTo(X(bx + 1.6), Y(by + 0.8)); c.lineTo(X(bx - 1.7), Y(by - 0.1)); }, rag, { bevel: 0.4, contour: true }); }
    const dx = w[0] - e[0], dy = w[1] - e[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
    A.ell(w[0] + ux * 0.9, w[1] + uy * 0.9, 1.5, 1.2, skin, { ...o, round: 1, rot: Math.atan2(uy, ux) });   // the hand
    for (let i = 0; i < 4; i++) { const ang = Math.atan2(uy, ux) + (i - 1.5) * 0.28, f1 = [w[0] + ux * 1.8 + Math.cos(ang) * 1.6, w[1] + uy * 1.8 + Math.sin(ang) * 1.6], f2 = [f1[0] + Math.cos(ang + 0.5) * 1.8, f1[1] + Math.sin(ang + 0.5) * 1.8];
      A.limb([[w[0] + ux * 1.5, w[1] + uy * 1.5], f1, f2], 0.45, 0.35, skin, { ...o, round: 0.4, edge: false }); A.fine(f2[0] + Math.cos(ang + 0.5) * 0.6, f2[1] + Math.sin(ang + 0.5) * 0.6, '#16110e'); A.fine(f1[0], f1[1] - 0.3, darker ? S[2] : S[5] || S[4]); }
  };
  // ---- far leg and far arm
  leg(hip, fk, fa, far, true);
  const fs = [sh[0] - 1, sh[1] + 1];
  const fe = wind ? [fs[0] - 2, fs[1] - 10 * reach] : atk ? [fs[0] + 8 * -reach, fs[1] + 4] : [fs[0] + 2 + armF, fs[1] + 10], fw = wind ? [fe[0] + 1, fe[1] - 9 * reach] : atk ? [fe[0] + 9 * -reach, fe[1] + 3] : [fe[0] + 2 + armF * 1.6, fe[1] + 9.5];
  arm(fs, fe, fw, far, true, false);
  // ---- the torso: the ribcage barrel, the caved belly under it, the hump of the back
  A.shape((c, X, Y) => {
    c.moveTo(X(hip[0] - 2), Y(hip[1] + 1));
    c.quadraticCurveTo(X(hip[0] - 3), Y(hip[1] - 9), X(sh[0] - 6), Y(sh[1] - 2));
    c.quadraticCurveTo(X(sh[0] - 2), Y(sh[1] - 6), X(sh[0] + 4), Y(sh[1] - 1));
    c.quadraticCurveTo(X(sh[0] + 4), Y(sh[1] + 5), X(sh[0] - 0.5), Y(sh[1] + 9));
    c.quadraticCurveTo(X(hip[0] + 1), Y(hip[1] - 4), X(hip[0] + 2.5), Y(hip[1] + 1));
  }, deep, { round: 3, contour: false });
  // the ribcage over it: each rib a curved bone under the skin, the gaps between them sunk in shadow
  const rc = [sh[0] - 1.2, sh[1] + 4];
  A.ell(rc[0], rc[1], 5.4, 5.2, skin, { round: 4, contour: false, rot: -0.3 });
  for (let i = 0; i < 6; i++) {
    const k = i / 5, ry = rc[1] - 4 + i * 1.75, rx0 = rc[0] - 5 + k * 1.2, rx1 = rc[0] + 4.2 - k * 1.5;
    A.limb([[rx0, ry + 1.2], [(rx0 + rx1) / 2, ry - 0.4], [rx1, ry + 0.4 - k]], 0.62, 0.45, skin, { round: 0.6, contour: false, edge: false, lit: 0.08 });
    A.hair(rx0 + 0.6, ry + 2.1, rx1 - 0.4, ry + 1.2 - k, S[0]);
  }
  A.limb([[rc[0] + 3.8, rc[1] - 4], [rc[0] + 2.8, rc[1] + 5]], 0.7, 0.55, skin, { round: 0.6, contour: false });   // the breastbone
  // the belly, sunk under the ribs; the hip bone jutting
  A.shape((c, X, Y) => { c.moveTo(X(hip[0] + 2.5), Y(hip[1] - 1)); c.quadraticCurveTo(X(hip[0] - 0.5), Y(hip[1] - 5), X(rc[0] + 1), Y(rc[1] + 5)); c.lineTo(X(rc[0] + 3), Y(rc[1] + 4.5)); c.quadraticCurveTo(X(hip[0] + 3.5), Y(hip[1] - 4), X(hip[0] + 3.5), Y(hip[1] - 1)); }, deep, { round: 1, contour: false, tone: -1 });
  A.ell(hip[0] + 1.5, hip[1] - 1.5, 1.6, 1.1, skin, { round: 1, contour: false });
  // the spine: a row of knuckles along the hump, a shoulder blade standing off it
  for (let i = 0; i < 8; i++) { const k = i / 7, vx = sh[0] - 5.8 + k * 4.2 - Math.sin(k * 3) * 0.8, vy = sh[1] - 2.6 + k * 11; A.ell(vx, vy, 0.95, 0.75, skin, { round: 0.8, contour: false, lit: 0.05 }); }
  A.ell(sh[0] - 3.4, sh[1] + 1.5, 2.3, 3.4, skin, { round: 1.5, contour: false, rot: 0.3, lit: 0.05 });
  // skin: bruising, grave-stains, a dark vein, fine pores
  A.speck(hip[0] - 3, hip[1] - 12, 6, 8, B[2], 22, 3); A.speck(sh[0] - 5, sh[1] + 3, 4, 5, B[1], 14, 5); A.speck(hip[0], hip[1] - 4, 3, 3, '#34402e', 10, 7);
  A.hair(hip[0] - 0.5, hip[1] - 9, hip[0] + 1, hip[1] - 3, '#3a2c44'); A.hair(hip[0] + 1, hip[1] - 3, hip[0] + 2, hip[1] - 1, '#3a2c44');
  A.speck(rc[0] - 5, rc[1] - 4, 9, 9, S[1], 30, 11);
  // the wound down the breastbone: glistening meat, the god's blood burning in it, failed stitches, a drip
  const wx = rc[0] + 4.2, wy = rc[1] - 3;
  A.shape((c, X, Y) => { c.moveTo(X(wx + 0.5), Y(wy - 3)); c.quadraticCurveTo(X(wx + 3), Y(wy + 3), X(wx - 0.3), Y(wy + 10)); c.quadraticCurveTo(X(wx - 2.4), Y(wy + 3), X(wx + 0.5), Y(wy - 3)); }, 'meat', { round: 1.2 });
  A.shape((c, X, Y) => { c.moveTo(X(wx + 0.3), Y(wy - 1)); c.quadraticCurveTo(X(wx + 1.3), Y(wy + 3), X(wx), Y(wy + 7)); c.quadraticCurveTo(X(wx - 0.9), Y(wy + 3), X(wx + 0.3), Y(wy - 1)); }, ['#3a0604', '#8a1a06', '#e0501a', '#ff9a3a', '#ffe0a0', '#fff6d8'], { round: 0.8, edge: false, dither: 0.3 });
  for (let i = 0; i < 4; i++) { A.hair(wx - 1.8, wy + 1 + i * 2, wx - 0.9, wy + 1.4 + i * 2, '#140606'); A.hair(wx + 1.7 - i * 0.2, wy + 1.2 + i * 2, wx + 0.9 - i * 0.2, wy + 1.6 + i * 2, '#140606'); }
  A.fine(wx - 1, wy + 4, '#ffd0c0'); A.fine(wx + 1.2, wy, '#ffd0c0');
  A.line(wx - 0.3, wy + 10, wx - 0.4, wy + 13 + (walk ? ph % 2 : 0), MAT.meat[3], 0.6); A.fine(wx - 0.4, wy + 13.6 + (walk ? ph % 2 : 0), MAT.meat[4]);
  // ---- the mantle on the hump: rotten wool, holed, its strips trailing the walk
  const trail = walk ? -G8.swing * 1.2 - 0.8 : wind ? 1 : atk ? -1.5 : 0;
  A.shape((c, X, Y) => {
    c.moveTo(X(sh[0] + 2.5), Y(sh[1] - 1.5)); c.quadraticCurveTo(X(sh[0] - 2), Y(sh[1] - 8), X(sh[0] - 9), Y(sh[1] - 3));
    c.lineTo(X(sh[0] - 10 + trail), Y(sh[1] + 6)); c.lineTo(X(sh[0] - 8.5 + trail * 0.8), Y(sh[1] + 2)); c.lineTo(X(sh[0] - 7.5 + trail), Y(sh[1] + 9)); c.lineTo(X(sh[0] - 6 + trail * 0.6), Y(sh[1] + 3)); c.lineTo(X(sh[0] - 4 + trail * 0.7), Y(sh[1] + 7)); c.lineTo(X(sh[0] - 3), Y(sh[1] + 1.5));
    c.quadraticCurveTo(X(sh[0] + 0.5), Y(sh[1] + 0.5), X(sh[0] + 2.5), Y(sh[1] - 1.5));
  }, cloth, { round: 2.5 });
  for (let i = 0; i < 5; i++) A.hair(sh[0] - 7.5 + i * 1.3, sh[1] - 3 + i * 0.2, sh[0] - 8 + i * 1.4 + trail * 0.5, sh[1] + 4 + (i % 2) * 2, C[1]);   // folds
  for (let i = 0; i < 4; i++) A.hair(sh[0] - 7 + i * 1.3, sh[1] - 3.6 + i * 0.1, sh[0] - 7.2 + i * 1.4 + trail * 0.4, sh[1] + 1, C[4]);
  A.speck(sh[0] - 9, sh[1] - 4, 11, 10, C[0], 26, 13); A.speck(sh[0] - 9, sh[1] - 4, 11, 10, C[4], 12, 17);        // the weave
  A.ell(sh[0] - 5, sh[1] + 0.2, 0.9, 0.6, S[1], { flat: true, contour: false }); A.ell(sh[0] - 7.2, sh[1] + 1.8, 0.6, 0.5, deep, { flat: true, contour: false });   // moth holes showing skin
  A.hair(sh[0] - 9, sh[1] - 3, sh[0] - 10.5 + trail, sh[1] + 1, C[0]);
  // ---- a loincloth of grave-rag, a rope belt twisted and knotted
  A.shape((c, X, Y) => { c.moveTo(X(hip[0] - 4), Y(hip[1] - 2)); c.lineTo(X(hip[0] + 5), Y(hip[1] - 3)); c.lineTo(X(hip[0] + 5.5 + trail * 0.3), Y(hip[1] + 3)); c.lineTo(X(hip[0] + 3 + trail * 0.5), Y(hip[1] + 9)); c.lineTo(X(hip[0] + 1.5), Y(hip[1] + 4)); c.lineTo(X(hip[0] - 1 + trail * 0.5), Y(hip[1] + 10)); c.lineTo(X(hip[0] - 2.5), Y(hip[1] + 4)); c.lineTo(X(hip[0] - 4.5 + trail * 0.4), Y(hip[1] + 7)); }, rag, { round: 1.8 });
  for (let i = 0; i < 4; i++) A.hair(hip[0] - 3 + i * 2.3, hip[1] - 1.5, hip[0] - 3.4 + i * 2.5 + trail * 0.3, hip[1] + 5 + (i % 2) * 2, MAT[rag][1]);
  A.speck(hip[0] - 4, hip[1] - 2, 9, 10, '#3a3020', 18, 19);
  A.limb([[hip[0] - 4, hip[1] - 1.6], [hip[0] + 5, hip[1] - 2.6]], 0.75, 0.75, 'leather', { round: 0.6, contour: true });
  for (let i = 0; i < 7; i++) A.hair(hip[0] - 3.6 + i * 1.3, hip[1] - 2.2 - i * 0.12, hip[0] - 3 + i * 1.3, hip[1] - 1.2 - i * 0.12, MAT.leather[4]);   // the twist of the rope
  A.ell(hip[0] + 4.5, hip[1] - 2, 1.1, 1, 'leather', { round: 0.8 }); A.limb([[hip[0] + 4.5, hip[1] - 1], [hip[0] + 5 + trail * 0.4, hip[1] + 4]], 0.5, 0.4, 'leather', { round: 0.4 });
  // ---- near leg
  leg([hip[0] + 2, hip[1] + 1], nk, na, near, false);
  A.speck(nk[0] - 1, nk[1] + 2, 3, 7, '#34402e', 9, 23);                                          // grave-dirt on the shin
  // ---- the head: skin shrunk onto the skull
  const hx = head[0], hy = head[1], jaw = jawOpen;
  A.limb([[sh[0] + 1, sh[1] - 1], [hx - 2, hy + 1]], 1.9, 1.6, skin, near);
  A.hair(sh[0] + 1.5, sh[1] - 1, hx - 2, hy + 2, S[1]); A.hair(sh[0] + 2, sh[1] - 0.2, hx - 1.5, hy + 2.6, S[4]);
  A.shape((c, X, Y) => { c.moveTo(X(hx - 4), Y(hy - 1)); c.quadraticCurveTo(X(hx - 3.5), Y(hy - 6.5), X(hx + 1), Y(hy - 6.5)); c.quadraticCurveTo(X(hx + 5.5), Y(hy - 5.5), X(hx + 5.5), Y(hy - 1)); c.lineTo(X(hx + 6), Y(hy + 1)); c.lineTo(X(hx + 5), Y(hy + 3)); c.lineTo(X(hx - 1), Y(hy + 3.5)); c.quadraticCurveTo(X(hx - 4), Y(hy + 2.5), X(hx - 4), Y(hy - 1)); }, skin, { round: 3.5 });
  A.limb([[hx + 0.8, hy - 3.6], [hx + 3, hy - 3.9], [hx + 5.2, hy - 3.2]], 0.8, 0.7, skin, { round: 0.7, contour: false, lit: 0.06 });   // brow ridge
  A.ell(hx + 2.8, hy - 1.9, 1.35, 1.2, '#070408', { flat: true, contour: false }); A.fine(hx + 3.1, hy - 2, '#ff7a3a'); A.fine(hx + 3.1, hy - 1.6, '#a01a08'); A.fine(hx + 2.7, hy - 2.1, '#5a0a04');   // the socket with its coal
  A.ell(hx - 0.1, hy - 2, 0.7, 1, '#070408', { flat: true, contour: false });
  A.ell(hx + 1.4, hy + 0.2, 1.3, 0.9, skin, { round: 0.8, contour: false, lit: 0.08 });              // the cheekbone
  A.hair(hx + 0.4, hy + 0.9, hx + 1.6, hy + 2.4, S[0]);                                               // the hollow under it
  A.hair(hx + 3, hy - 0.8, hx + 3.4, hy + 2.2, '#3a0e0e');                                            // a dark tear
  A.ell(hx + 5.3, hy - 0.8, 0.6, 0.8, deep, { flat: true, contour: false }); A.fine(hx + 5.6, hy - 1.6, S[5] || S[4]);   // the nose, rotted to its hole
  A.speck(hx - 3.5, hy - 6, 5, 4, B[2], 10, 29); A.fine(hx - 2.2, hy + 0.5, '#6a5a5a');
  // the mouth and the jaw hanging off its hinge
  A.shape((c, X, Y) => { c.moveTo(X(hx + 0.5), Y(hy + 2.5)); c.lineTo(X(hx + 5), Y(hy + 2)); c.lineTo(X(hx + 4.5), Y(hy + 2.5 + jaw)); c.lineTo(X(hx + 1), Y(hy + 2.5 + jaw)); }, '#120306', { flat: true, contour: false });
  A.ell(hx + 2.8, hy + 2.6 + jaw * 0.6, 1.2, 0.6, ['#2a0608', '#5a1418', '#7a2a2e'], { round: 0.5, contour: false });   // the tongue
  for (let i = 0; i < 6; i++) if (i !== 2) { A.rect(hx + 1 + i * 0.66, hy + 2.3, 0.45, 0.9 + (i % 2) * 0.3, MAT.boneOld[3]); A.fine(hx + 1 + i * 0.66, hy + 3.2, MAT.boneOld[1]); }
  A.hair(hx + 1.5, hy + 3, hx + 3.8, hy + 2 + jaw, '#6a2a2e'); A.fine(hx + 3, hy + 2.6 + jaw * 0.6, '#b07070');
  A.shape((c, X, Y) => { c.moveTo(X(hx), Y(hy + 2.5 + jaw)); c.lineTo(X(hx + 4.6), Y(hy + 2 + jaw)); c.lineTo(X(hx + 4), Y(hy + 5 + jaw)); c.lineTo(X(hx + 0.8), Y(hy + 5 + jaw)); }, skin, { round: 1.2 });
  for (let i = 0; i < 5; i++) A.rect(hx + 1.2 + i * 0.66, hy + 1.7 + jaw, 0.45, 0.7, MAT.boneOld[2]);
  for (let i = 0; i < 5; i++) A.hair(hx - 3.6 - i * 0.3, hy - 4.5 + i * 0.9, hx - 5.2 - i * 0.5 + (walk ? -G8.swing * 0.5 : 0), hy + 2 + i * 1.3, MAT.hair[2 + (i % 2)]);   // lank strands
  // ---- near arm, knuckles past the knee, a rag bandage, old blood on the knuckles
  const ns = [sh[0] + 1, sh[1] + 1];
  const ne = wind ? [ns[0] - 1, ns[1] - 11 * reach] : atk ? [ns[0] + 8 * -reach, ns[1] + 2] : [ns[0] + 3 + armN, ns[1] + 10], nw = wind ? [ne[0] + 2, ne[1] - 9 * reach] : atk ? [ne[0] + 10 * -reach, ne[1] + 1] : [ne[0] + 2 + armN * 1.7, ne[1] + 9.5];
  A.ell(ns[0], ns[1], 2.1, 1.9, skin, { round: 1.6, contour: false });
  arm(ns, ne, nw, near, false, true);
  A.speck(nw[0] - 0.5, nw[1] - 0.5, 2, 2, '#6a2a2a', 5, 31);
  // a rosary of finger bones hung round the neck
  for (let i = 0; i < 7; i++) { const k = i / 6, rx = sh[0] + 1 + k * 4 - Math.sin(k * 3) * 1.2, ry = sh[1] - 0.5 + Math.sin(k * 3.1) * 4.5; A.ell(rx, ry, 0.55, 0.75, 'boneOld', { contour: true }); }
  A.limb([[sh[0] + 3.2, sh[1] + 4.2], [sh[0] + 3.4, sh[1] + 6.4]], 0.35, 0.35, 'boneOld', { contour: true }); A.limb([[sh[0] + 2.4, sh[1] + 5.2], [sh[0] + 4.3, sh[1] + 5.1]], 0.3, 0.3, 'boneOld', { contour: true });
  // a pilgrim's candle stuck into the hump with its own wax, still burning: the husk carries its own small light
  const cx = sh[0] - 4.2, cy = sh[1] - 5.5 + (walk ? G8.bob * 0.3 : 0), flick = [0, 0.6, -0.3, 0.4, -0.5, 0.2, 0.5, -0.2][(ph + (walk ? 0 : 3)) % 8];
  A.shape((c, X, Y) => { c.moveTo(X(cx - 2.2), Y(cy + 3)); c.quadraticCurveTo(X(cx - 1.4), Y(cy + 1), X(cx - 0.9), Y(cy - 4)); c.lineTo(X(cx + 0.9), Y(cy - 4.3)); c.quadraticCurveTo(X(cx + 1.3), Y(cy + 1), X(cx + 2.4), Y(cy + 3)); }, ['#3a2a18', '#6a5634', '#a8926a', '#d8c8a0', '#f4ead0'], { contour: true });
  for (let i = 0; i < 3; i++) A.limb([[cx - 1.2 + i * 1.1, cy - 2 + i], [cx - 1.3 + i * 1.2, cy + 1.5 + i * 1.3]], 0.35, 0.45, ['#6a5634', '#a8926a', '#e0d0a8'], { contour: false });   // drips
  A.hair(cx, cy - 4.3, cx, cy - 5.2, '#141010');
  A.shape((c, X, Y) => { c.moveTo(X(cx - 0.9), Y(cy - 5)); c.quadraticCurveTo(X(cx - 1.1 + flick * 0.4), Y(cy - 7), X(cx + flick), Y(cy - 9.5)); c.quadraticCurveTo(X(cx + 1.1 + flick * 0.3), Y(cy - 7), X(cx + 0.9), Y(cy - 5)); }, ['#a02a08', '#e0601a', '#ffa040', '#ffe090', '#fffbe8'], { contour: false, edge: false });
  A.fine(cx + flick * 0.5, cy - 6.6, '#ffffff');
  // tenebrism: the candle is the key light, the wound a second ember; everything else falls toward black
  A.lamp(cx, cy - 6.5, [255, 176, 90], 24, 1.1); A.lamp(wx + 1, wy + 3, [255, 100, 40], 7, 0.6); A.lamp(hx + 3, hy - 1.8, [255, 90, 40], 2.5, 0.5);
  A.rim([110, 120, 150], 0.3);
};
