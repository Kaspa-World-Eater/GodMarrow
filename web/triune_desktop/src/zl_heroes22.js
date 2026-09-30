
// =================================================================== v0.22: the heroes, painted part by part
// One skeleton rig drives every class (idle breath, a four-step walk, a two-frame cast and a two-frame strike);
// each class paints its own body and clothes over it. What you wear shows: a starting outfit that is plain and
// poor, a better one when you find a robe, armour when you find mail, a hood or a mask on your head, the weapon in
// your hand, gold trim on rare and unique pieces.
function heroRig(pose, ph) {
  // walk: eight frames of a real stride (contact, down, pass, up for each leg); idle: four frames of breath
  const walk = pose === 'walk', cast = pose === 'cast', atk = pose === 'atk';
  const Gw = walk ? gait(ph, 8) : null, sw = walk ? Gw.swing : 0, bob = walk ? Gw.bob * 1.2 + 0.6 : 0, br = pose === 'idle' ? Math.sin(ph / 4 * 6.2832) * 0.5 : 0;
  const y = v => v + bob + br;
  const J = { sw, bob, br, walk, cast, atk, ph, G: Gw };
  const twist = walk ? Gw.sway * 0.6 : 0;
  J.hip = [0, y(-31)]; J.waist = [0.5, y(-36)]; J.chest = [1 + twist * 0.5, y(-43)]; J.neck = [1.5 + twist * 0.5, y(-50)]; J.head = [2 + twist * 0.4, y(-56) + (walk ? Math.sin(Gw.a * 2 - 0.6) * 0.4 : 0)];
  J.shF = [-5.2 - twist, y(-47.2)]; J.shN = [5.6 + twist, y(-47.4)];
  if (walk) {
    J.ankN = [2.5 + sw * 7, -3 - Gw.lift * 2.5]; J.kneeN = [3.5 + sw * 4 + Gw.lift * 2, -17 + bob * 0.4 - Gw.lift * 1.5];
    J.ankF = [-3 - sw * 7, -3 - Gw.liftF * 2.5]; J.kneeF = [-2.5 - sw * 4 + Gw.liftF * 2, -17 + bob * 0.4 - Gw.liftF * 1.5];
  } else { J.kneeN = [3.2, -17]; J.ankN = [3.2, -3]; J.kneeF = [-2.6, -17]; J.ankF = [-3.2, -3]; }
  // arms swing against the legs, a little behind them
  const as = walk ? -Math.sin(Gw.a - 0.4) * 3 : br * 0.4;
  J.elN = [7.4 + as, y(-39.5)]; J.haN = [8.4 + as * 1.7, y(-31.5) - Math.abs(as) * 0.3]; J.elF = [-6.8 - as, y(-39.5)]; J.haF = [-7 - as * 1.7, y(-31.5) - Math.abs(as) * 0.3];
  // v0.22d: four-frame casts and strikes. cast: gather to the chest, lift, thrust out, hold. strike: draw back,
  // raise high, cut through, follow through with the weight forward.
  if (cast) {
    const C = [[[6, -41], [8, -44], [-2, -41], [3, -43], 0], [[8, -44], [12, -49], [4, -43], [8, -47], 0.5], [[10, -45], [16, -47], [6, -43], [12, -45], 1.5], [[9, -44], [15, -45], [5, -42], [11, -43], 1]][ph % 4];
    J.elN = [C[0][0], y(C[0][1])]; J.haN = [C[1][0], y(C[1][1])]; J.elF = [C[2][0], y(C[2][1])]; J.haF = [C[3][0], y(C[3][1])]; J.chest[0] += C[4]; J.head[0] += C[4];
  }
  if (atk) {
    const K = [[[2, -44], [-1, -49], -1, 0], [[1, -52], [-2, -58], -1.5, 0], [[10, -42], [17, -38], 2, 1], [[9, -37], [13, -30], 1.5, 1]][ph % 4];
    J.elN = [K[0][0], y(K[0][1])]; J.haN = [K[1][0], y(K[1][1])]; J.elF = [-6, y(-40)]; J.haF = [-8 + K[2], y(-34)]; J.chest[0] += K[2]; J.head[0] += K[2];
    if (K[3]) { J.hip[0] += 1; J.kneeN = [7, -17]; J.ankN = [8, -3]; J.kneeF = [-4, -16.5]; J.ankF = [-5.5, -3]; }
  }
  return J;
}
// what the hero wears, as a small key: body tier, head, weapon, trim
function heroGear() {
  const e = P.eq || {}, body = e.body, head = e.head, wpn = e.weapon, off = e.offhand;
  const tier = !body ? 0 : body.base === 'mail' ? 2 : 1, trim = [body, head, wpn].some(it => it && (it.q === 'rare' || it.q === 'unique'));
  return { tier, head: head ? head.base : null, wpn: wpn ? wpn.base : null, off: off ? off.base : null, trim, key: `${tier}|${head ? head.base : '-'}|${wpn ? wpn.base : '-'}|${off ? 'o' : '-'}|${trim ? 't' : ''}` };
}
const HPX = {};
{
  const _hp = heroPose;
  heroPose = function () {
    const r = _hp();
    if (!HPX[P.cls]) return r;
    // progress through a strike or a cast, whatever its length
    if (P.swing > (P._swL || 0) + 1e-6) P._sw0 = P.swing; P._swL = P.swing;
    if (P.cast > (P._caL || 0) + 1e-6) P._ca0 = P.cast; P._caL = P.cast;
    if (r[0] === 'atk') return ['atk', Math.min(3, Math.floor((1 - P.swing / Math.max(0.05, P._sw0 || 0.22)) * 4))];
    if (r[0] === 'cast') return ['cast', P.cast > 0 ? Math.min(3, Math.floor((1 - P.cast / Math.max(0.05, P._ca0 || 0.5)) * 4)) : 2 + Math.floor(G.time * 5) % 2];
    if (r[0] === 'walk') return ['walk', Math.floor(P._wd * 4.4) % 8];
    if (r[0] === 'idle') return ['idle', Math.floor(G.time * 2.2) % 4];
    return r;
  };
}
{
  const _hf = heroFrame;
  heroFrame = function (cls, pose, ph) {
    if (!HPX[cls]) return _hf(cls, pose, ph);
    const g = heroGear(), key = 'PX|' + cls + '|' + pose + '|' + ph + '|' + g.key; let fr = HERO_FR[key]; if (fr) return fr;
    fr = pxFrame(44, 46, A => HPX[cls](A, pose, ph, g, heroRig(pose, ph)), 1.2);
    HERO_FR[key] = fr; return fr;
  };
}
// shared pieces
function pxHand(A, h, e, mat, claw) {
  const dx = h[0] - e[0], dy = h[1] - e[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  A.ell(h[0] + ux * 0.8, h[1] + uy * 0.8, 1.7, 1.5, mat, { sh: 1, soft: true, hi: false, contour: false });
  const R = MAT[mat]; for (let i = 0; i < 3; i++) { const a = Math.atan2(uy, ux) + (i - 1) * 0.35; A.line(h[0] + ux * 1.6, h[1] + uy * 1.6, h[0] + ux * 1.6 + Math.cos(a) * 1.8, h[1] + uy * 1.6 + Math.sin(a) * 1.8, R[1]); if (claw) A.px(h[0] + ux * 1.6 + Math.cos(a) * 2.4, h[1] + uy * 1.6 + Math.sin(a) * 2.4, MAT.bone[4]); }
}
function pxBoot(A, a, mat, sole) {
  A.shape((c, X, Y) => { c.moveTo(X(a[0] - 2.2), Y(0)); c.lineTo(X(a[0] - 2), Y(a[1] - 3)); c.lineTo(X(a[0] + 1.6), Y(a[1] - 3)); c.lineTo(X(a[0] + 2), Y(a[1] - 0.5)); c.quadraticCurveTo(X(a[0] + 5), Y(-1.5), X(a[0] + 5.2), Y(0)); }, mat, { sh: 1, soft: true });
  A.line(a[0] - 2.2, 0, a[0] + 5.2, 0, sole || MAT.leather[0]);
}
// weapons held in the near hand
function pxWeapon(A, g, J, cls) {
  const h = J.haN, e = J.elN, ang = Math.atan2(h[1] - e[1], h[0] - e[0]), up = J.atk && J.ph === 0;
  const dir = J.atk ? ang : J.cast ? -1.2 : -1.35 - J.sw * 0.1;
  const along = (d, s = 0) => [h[0] + Math.cos(dir) * d - Math.sin(dir) * s, h[1] + Math.sin(dir) * d + Math.cos(dir) * s];
  const blade = (d0, d1, wd, mat) => { const a = along(d0, -wd), b = along(d0, wd), t = along(d1, 0), m = along((d0 + d1) * 0.55, wd * 0.9), m2 = along((d0 + d1) * 0.55, -wd * 0.9); A.poly([a, m2, t, m, b], mat, { round: wd * 0.8, metal: true }); A.hair(along(d0, 0)[0], along(d0, 0)[1], t[0], t[1], MAT[mat][4]); };
  if (g.wpn === 'staff') {
    // a staff of black wood, bound in cord, a jawbone and a skull at the head
    const a = along(-11, 0), b = along(26, 0);
    A.limb([a, along(8, 0.3), b], 0.8, 0.7, 'wood', { round: 0.7 });
    for (let i = 0; i < 3; i++) { const p = along(3 + i * 1.2, 0); A.fine(p[0], p[1], MAT.rope[3]); }
    A.ell(b[0], b[1] - 1.2, 2.3, 2.1, 'bone', { round: 2 }); const e = [b[0] + 0.8, b[1] - 1.4]; A.fine(e[0], e[1], '#1a0c08'); A.fine(e[0] + 1.1, e[1], '#1a0c08'); A.fine(e[0] + 0.3, e[1], '#ff6040');
    A.hair(b[0] - 1.5, b[1] + 0.8, b[0] + 1.8, b[1] + 1, MAT.bone[1]);
  } else if (g.wpn === 'wand') {
    // a long finger bone, capped in iron, a drop of blood at its point
    const b = along(11, 0); A.limb([along(-1.5, 0), along(5, 0.2), b], 0.65, 0.45, 'bone', { round: 0.6 });
    A.fine(along(4, 0)[0], along(4, 0)[1], MAT.bone[1]); A.fine(b[0], b[1], MAT.bloodWet ? MAT.bloodWet[3] : '#a01010');
  } else if (g.wpn === 'dagger') {
    // a curved bleeding-knife: a grooved blade, a bone grip, an iron guard
    blade(1.6, 12, 1.05, 'steel');
    A.limb([along(-2.6, 0), along(1, 0)], 0.65, 0.6, 'boneOld', { round: 0.6 });
    A.limb([along(1.4, -1.8), along(1.4, 1.8)], 0.45, 0.45, 'steelDark', { round: 0.4, metal: true });
    const gr = along(5, 0.2), gr2 = along(10, 0.1); A.hair(gr[0], gr[1], gr2[0], gr2[1], MAT.steel[1]);
  } else if (g.wpn === 'claw' || g.wpn === 'talons') {
    const n = g.wpn === 'talons' ? 3 : 2; for (let i = 0; i < n; i++) { const s = (i - (n - 1) / 2) * 1.2, a = along(1, s), b = along(g.wpn === 'talons' ? 8 : 6, s * 1.4); A.line(a[0], a[1], b[0], b[1], MAT.steel[3 + (i % 2)], 1); }
  }
}

// ------------------------------------------------------------------- the HEMOMANCER: lean, scarred, half naked, a long battle skirt
defMat('hemoSkin', '#1e0e0c', '#4e2a22', '#8a5440', '#b8805e', '#dcac84');
defMat('warPaint', '#2a0404', '#5a0a0a', '#8e1414', '#b82420', '#d84a3a');
HPX.hemomancer = function (A, pose, ph, g, J) {
  const skin = 'hemoSkin', S = MAT[skin], L = { sh: 1, soft: true, hi: false, contour: false };
  const skirtMat = g.tier === 0 ? 'clothBrown' : 'clothRed', trim = g.trim ? 'gold' : 'leather';
  // far leg and far arm
  A.limb([J.hip, J.kneeF, J.ankF], 2.6, 1.8, skin, { ...L, tone: -1 }); pxBoot(A, J.ankF, g.tier === 2 ? 'leatherRed' : 'leather');
  A.ell(J.shF[0], J.shF[1] + 1, 2.8, 2.6, skin, { ...L, tone: -1 }); A.limb([J.shF, J.elF], 2.8, 2.2, skin, { ...L, tone: -1 }); A.limb([J.elF, J.haF], 2.3, 1.7, skin, { ...L, tone: -1 }); pxHand(A, J.haF, J.elF, skin);
  // torso: a lean, hard V; ribs and abdominals cut in shadow
  const c = J.chest, w = J.waist;
  A.shape((cx, X, Y) => { cx.moveTo(X(J.shF[0] - 1), Y(J.shF[1])); cx.quadraticCurveTo(X(c[0]), Y(J.neck[1] + 1), X(J.shN[0] + 2), Y(J.shN[1])); cx.quadraticCurveTo(X(c[0] + 5), Y(c[1]), X(w[0] + 3), Y(w[1] + 1)); cx.lineTo(X(w[0] - 3.5), Y(w[1] + 1)); cx.quadraticCurveTo(X(c[0] - 5), Y(c[1]), X(J.shF[0] - 1), Y(J.shF[1])); }, skin, { sh: 2, core: 1 });
  A.line(c[0] - 1, c[1] - 3, c[0] + 3.5, c[1] - 3.5, S[1]); A.line(c[0] - 0.5, c[1] - 2.5, c[0] + 3.5, c[1] - 2.8, S[3]);             // pectoral
  for (let i = 0; i < 3; i++) { A.px(c[0] + 1.5, c[1] + 1 + i * 2, S[1]); A.px(c[0] + 2.5, c[1] + 1.5 + i * 2, S[3]); }            // the abdomen
  A.line(c[0] + 1, c[1] - 1, c[0] + 1, w[1] - 1, S[1]);
  // war paint: a hand of blood across the chest, stripes down the flank
  A.line(c[0] - 2, c[1] - 5, c[0] + 3, c[1] - 1, 'warPaint'); A.line(c[0] - 1, c[1] - 5, c[0] + 4, c[1] - 1, MAT.warPaint[2]);
  for (let i = 0; i < 3; i++) A.line(c[0] - 3 + i * 0.8, c[1] + 1, c[0] - 3.5 + i * 0.8, c[1] + 5, MAT.warPaint[1]);
  // tier 1+: a hide mantle over the far shoulder; tier 2: straps and bone plates
  if (g.tier >= 1) A.shape((cx, X, Y) => { cx.moveTo(X(J.shF[0] - 3), Y(J.shF[1] + 3)); cx.quadraticCurveTo(X(J.shF[0] - 1), Y(J.shF[1] - 3), X(J.neck[0] + 1), Y(J.neck[1] + 1)); cx.lineTo(X(J.neck[0] - 1), Y(J.neck[1] + 5)); cx.lineTo(X(J.shF[0] - 2), Y(J.shF[1] + 6)); }, 'clothBrown', { sh: 2 });
  if (g.tier === 2) {
    A.line(J.shN[0], J.shN[1], w[0] - 3, w[1], MAT.leather[2], 1); A.line(J.shN[0] + 0.6, J.shN[1] + 0.4, w[0] - 2.4, w[1] + 0.4, MAT.leather[4]);
    A.ell(J.shN[0] + 0.5, J.shN[1] - 0.5, 3, 2.2, 'bone', { sh: 1 }); A.stud(J.shN[0] + 0.5, J.shN[1] - 0.8, 'gold');
  }
  // the long battle skirt: layered, slit up the front, a heavy belt
  const sway = J.sw * 1.5, hem = -3 + (g.tier ? 0 : 5);
  A.shape((cx, X, Y) => { cx.moveTo(X(w[0] - 4), Y(w[1] + 0.5)); cx.lineTo(X(w[0] + 3.5), Y(w[1] + 0.5)); cx.lineTo(X(J.hip[0] + 6 + sway), Y(hem)); for (let i = 0; i < 6; i++) cx.lineTo(X(J.hip[0] + 6 + sway - i * 2.3), Y(hem - (i % 2) * 2)); cx.lineTo(X(J.hip[0] - 7 + sway), Y(hem)); }, skirtMat, { sh: 3, core: 1 });
  for (let i = 0; i < 3; i++) A.line(w[0] - 2 + i * 2, w[1] + 3, J.hip[0] - 3 + i * 3 + sway, hem + 2, MAT[skirtMat][1]);
  if (g.tier >= 1) A.shape((cx, X, Y) => { cx.moveTo(X(w[0] - 4.5), Y(w[1] + 1)); cx.lineTo(X(w[0] + 4), Y(w[1] + 1)); cx.lineTo(X(w[0] + 5 + sway * 0.5), Y(w[1] + 9)); cx.lineTo(X(w[0] + 1), Y(w[1] + 6)); cx.lineTo(X(w[0] - 2), Y(w[1] + 10)); cx.lineTo(X(w[0] - 5 + sway * 0.5), Y(w[1] + 7)); }, 'clothBrown', { sh: 2 });
  A.rect(w[0] - 4.5, w[1] - 0.5, 9, 2, MAT.leather[2]); A.line(w[0] - 4.5, w[1] - 0.5, w[0] + 4.5, w[1] - 0.5, MAT.leather[4]); A.stud(w[0] + 1, w[1], trim);
  // near leg, bare above the boot
  A.limb([[J.hip[0] + 1.5, J.hip[1]], J.kneeN, J.ankN], 2.8, 1.9, skin, L); A.px(J.kneeN[0] + 0.5, J.kneeN[1] - 1, S[4]);
  pxBoot(A, J.ankN, g.tier === 2 ? 'leatherRed' : 'leather');
  // head: a hard face, deep-set eyes that catch red, a white bar of paint across the brow, a black topknot
  const h = J.head;
  A.limb([[J.neck[0], J.neck[1] + 2], [h[0] + 0.5, h[1] + 3]], 2.2, 2, skin, L);
  A.shape((cx, X, Y) => { cx.moveTo(X(h[0] - 3.5), Y(h[1] - 1)); cx.quadraticCurveTo(X(h[0] - 3), Y(h[1] - 5.5), X(h[0] + 1), Y(h[1] - 5.5)); cx.quadraticCurveTo(X(h[0] + 4.5), Y(h[1] - 5), X(h[0] + 4.5), Y(h[1] - 1)); cx.lineTo(X(h[0] + 5), Y(h[1] + 0.5)); cx.lineTo(X(h[0] + 4), Y(h[1] + 2)); cx.lineTo(X(h[0] + 3.5), Y(h[1] + 4)); cx.lineTo(X(h[0]), Y(h[1] + 4.5)); cx.quadraticCurveTo(X(h[0] - 3.5), Y(h[1] + 3), X(h[0] - 3.5), Y(h[1] - 1)); }, skin, { sh: 2 });
  if (g.head === 'mask') { A.shape((cx, X, Y) => { cx.moveTo(X(h[0] - 0.5), Y(h[1] - 4)); cx.lineTo(X(h[0] + 5), Y(h[1] - 3.5)); cx.lineTo(X(h[0] + 5), Y(h[1] + 2)); cx.lineTo(X(h[0] + 3), Y(h[1] + 4)); cx.lineTo(X(h[0] - 0.5), Y(h[1] + 1)); }, 'bone', { sh: 1 }); A.rect(h[0] + 2.5, h[1] - 2, 1.4, 1, '#120404'); A.px(h[0] + 3, h[1] - 1.8, '#ff4a3a'); }
  else {
    A.rect(h[0] + 0.5, h[1] - 3.5, 4.5, 1, MAT.bone[3]);                                             // the white bar of paint
    A.px(h[0] + 3, h[1] - 2, '#140606'); A.px(h[0] + 3.6, h[1] - 2, '#ff4a3a'); A.px(h[0] + 0.8, h[1] - 2, '#140606');   // eyes, one catching red
    A.line(h[0] + 3.3, h[1] - 1.2, h[0] + 3.3, h[1] + 1, MAT.warPaint[2]);                             // a blood tear
    A.px(h[0] + 4.8, h[1] - 0.5, S[1]); A.line(h[0] + 2, h[1] + 2.4, h[0] + 3.8, h[1] + 2.2, S[0]);   // nose, mouth
    A.rect(h[0] + 1.5, h[1] + 3.2, 2.5, 0.6, MAT.bone[2]);                                          // paint on the chin
  }
  if (g.head === 'hood') A.shape((cx, X, Y) => { cx.moveTo(X(h[0] - 5), Y(h[1] + 5)); cx.quadraticCurveTo(X(h[0] - 5), Y(h[1] - 7), X(h[0] + 2), Y(h[1] - 7)); cx.quadraticCurveTo(X(h[0] + 6), Y(h[1] - 6), X(h[0] + 5.5), Y(h[1] - 3)); cx.lineTo(X(h[0] + 0.5), Y(h[1] - 4)); cx.lineTo(X(h[0] - 1), Y(h[1] + 5)); }, 'clothRed', { sh: 2 });
  else {
    A.shape((cx, X, Y) => { cx.moveTo(X(h[0] - 3.8), Y(h[1] + 1)); cx.quadraticCurveTo(X(h[0] - 4), Y(h[1] - 6), X(h[0] + 1), Y(h[1] - 6)); cx.quadraticCurveTo(X(h[0] + 3.5), Y(h[1] - 6), X(h[0] + 3.8), Y(h[1] - 4.5)); cx.lineTo(X(h[0] - 1), Y(h[1] - 4.2)); cx.lineTo(X(h[0] - 2), Y(h[1] + 1.5)); }, 'hair', { sh: 1 });
    A.ell(h[0] - 1.5, h[1] - 7, 1.6, 1.6, 'hair', { sh: 1 }); A.line(h[0] - 2.5, h[1] - 7, h[0] - 5, h[1] - 3 + J.sw, MAT.hair[2]);   // the topknot and its tail
    A.line(h[0] - 1, h[1] + 0.5, h[0] - 1, h[1] + 2.5, MAT.bone[4]);                                  // a bone through the ear
  }
  // near arm, a leather bracer, fingers red to the knuckle
  A.ell(J.shN[0], J.shN[1] + 0.8, 3.2, 3, skin, { sh: 2, soft: true });
  A.limb([J.shN, J.elN], 2.9, 2.3, skin, L); A.limb([J.elN, J.haN], 2.4, 1.8, skin, L);
  { const mx = (J.shN[0] + J.elN[0]) / 2, my = (J.shN[1] + J.elN[1]) / 2; A.px(mx - 1, my - 0.5, S[4]); A.px(mx - 1.5, my + 0.5, S[3]); A.px(mx + 1.5, my, S[1]); }   // the swell of the bicep A.line(J.shN[0] - 1, J.shN[1] + 1, J.elN[0] - 1, J.elN[1], S[3]);
  const bx = J.elN[0] + (J.haN[0] - J.elN[0]) * 0.55, by = J.elN[1] + (J.haN[1] - J.elN[1]) * 0.55;
  A.limb([[J.elN[0] + (J.haN[0] - J.elN[0]) * 0.3, J.elN[1] + (J.haN[1] - J.elN[1]) * 0.3], [bx, by]], 2.2, 2.1, g.tier ? 'leatherRed' : 'leather', { sh: 1, soft: true });
  pxWeapon(A, g, J, 'hemomancer');
  pxHand(A, J.haN, J.elN, skin); A.px(J.haN[0] + 1, J.haN[1] + 0.5, MAT.warPaint[2]);
  if (J.cast) { A.glow(J.haN[0] + 2.5, J.haN[1] - 1, '#ff5a4a', '#ffd0b0'); A.px(J.haN[0] + 3, J.haN[1] - 2.5, '#c02020'); A.px(J.haN[0] + 1.5, J.haN[1] - 3, '#e04030'); }
};
