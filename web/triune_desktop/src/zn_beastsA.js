// =================================================================== v0.22: Act I beasts A, painted at full density
// The TITHE-HAND, the WEEPER and the GASP, repainted in flat cel bands like the Husk.
// helpers (prefixed zn): a two-bone reach that bends toward a side, a unit vector, a lerp
const znNorm = (x, y) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
const znLerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
function znIK(a, b, l1, l2, side) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.max(0.01, Math.min(Math.hypot(dx, dy), l1 + l2 - 0.05));
  const base = Math.atan2(dy, dx), k = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const c1 = [a[0] + Math.cos(base + k) * l1, a[1] + Math.sin(base + k) * l1], c2 = [a[0] + Math.cos(base - k) * l1, a[1] + Math.sin(base - k) * l1];
  return ((c1[0] - a[0]) * side[0] + (c1[1] - a[1]) * side[1]) > ((c2[0] - a[0]) * side[0] + (c2[1] - a[1]) * side[1]) ? c1 : c2;
}

// ------------------------------------------------------------------- TITHE-HAND
// A hand of the god, cut off at the wrist when the faithful divided him, grown to the size of a dog. It runs on its
// fingertips like a spider, the torn wrist carried high behind it: two white bone ends, strings of sinew, the iron
// tithe-band that was clapped on it with a coin still hanging. An iron nail is driven through the back of it and
// still weeps. Under the palm a mouth, lipped and ringed with needle teeth, opens when it lunges.
MFRAME.hand = [56, 36]; MPX_K.hand = 1.5; MPX_WALK.hand = 8;
defMat('znHandSkin', '#0e0c10', '#2e2a32', '#57514f', '#8a8176', '#bdb09c');
defMat('znNail', '#040305', '#0b090c', '#17141a', '#2c282c', '#56504e');
defMat('znMaw', '#080104', '#1c050a', '#3a0c14', '#62202a', '#8e3a40');
defMat('znLip', '#1a0a0e', '#3e1c24', '#6a3a42', '#946068', '#b88a8a');
MPX.hand = function (A, pose, ph, pal) {
  const t = pal.tint, skin = tintMat('znHandSkin', t, 0.45), S = MAT[skin], NL = MAT.znNail, ME = MAT.meat, BN = MAT.bone;
  const walk = pose === 'walk', idle = pose === 'idle', wind = pose === 'wind', atk = pose === 'atk';
  let P = [-5, -13.5], a = 0.36, rear = 0.1, tense = 0, trail = 0.3;
  const wt = walk ? ph / 8 : 0;
  // the fingers: knuckle (hand space), bone lengths, radius, depth tone, resting tip x (from the palm), gait offset
  const F = {
    pinky: { k: [6.4, -5.6], l1: 8, l2: 7, d: 4.5, r: 1.2, tone: -2.2, tx: -3, gy: -3.6, off: 0.5, up: -2.25 },
    ring: { k: [8.2, -3.8], l1: 8.5, l2: 8, d: 5, r: 1.35, tone: -1.4, tx: 13, gy: -2.4, off: 0, up: -1.25 },
    middle: { k: [9.2, -1.6], l1: 7, l2: 9, d: 5.5, r: 1.45, tone: -0.7, tx: 21, gy: -1.2, off: 0.5, up: -0.85 },
    index: { k: [9, 0.8], l1: 7, l2: 8.5, d: 5.5, r: 1.5, tone: 0.2, tx: 15, gy: 0, off: 0, up: -0.75 },
    thumb: { k: [-1, 3.4], l1: 5, l2: 6.5, d: 4.5, r: 1.5, tone: 0.1, tx: -8, gy: 0, off: 0.25, up: -2.3 }
  };
  const tip = {}, dd = {};
  const GY = -2.4;   // fingertip height when planted (the nail reaches the ground)
  for (const n in F) { tip[n] = [P[0] + F[n].tx, GY + F[n].gy]; }
  if (walk) {
    const b2 = Math.sin(wt * 12.566);
    P = [P[0] + b2 * 0.4, P[1] + b2 * 0.7]; a += Math.sin(wt * 12.566 + 1) * 0.05; trail = 1.1 + 0.5 * Math.sin(wt * 12.566 - 1);
    for (const n in F) {
      const tt = (wt + F[n].off) % 1; let s, lift = 0;
      if (tt < 0.5) s = 1 - 4 * tt; else { s = -1 + 4 * (tt - 0.5); lift = Math.sin((tt - 0.5) * 6.2832) * 3.2; }
      tip[n] = [-5 + F[n].tx + s * 3, GY + F[n].gy - lift];
    }
  }
  if (idle) {
    const b = Math.sin(ph / 4 * 6.2832); P = [P[0], P[1] + b * 0.5]; a += b * 0.03;
    const drum = ['index', 'middle', 'ring', null][ph]; if (drum) { tip[drum][1] -= 2.4; tip[drum][0] -= 1; }
  }
  if (wind) {
    const k = [0.35, 0.7, 1][ph]; tense = k;
    P = [P[0] - 1.6 * k + (ph === 1 ? 0.3 : 0), P[1] + 2.4 * k]; a = 0.36 - 0.46 * k; rear = 0.1 + 0.3 * k; trail = -0.4 * k;
    for (const n in F) tip[n] = [P[0] + F[n].tx * (1 + 0.28 * k) + (n === 'thumb' ? -1.5 * k : 0), GY + F[n].gy];
    tip.index = [tip.index[0] + 2 * k, GY - 6.5 * k]; tip.middle = [tip.middle[0] + 1 * k, GY + F.middle.gy - 3.2 * k];
  }
  if (atk) {
    // the lunge: reared, palm to the prey, fingers flung open round the mouth; then the bite; then landing
    const L = [
      { P: [5, -17.5], a: -0.95, rear: 1, trail: -1.6, t: { index: [16, -12], middle: [19, -4], ring: [16, 3.5], pinky: [10, 8], thumb: [-9, 9] } },
      { P: [9, -15], a: -0.62, rear: 0.7, trail: -1.2, t: { index: [13, -6], middle: [15, -1.5], ring: [12.5, 3], pinky: [8, 7], thumb: [-8, 9] } },
      { P: [4, -12.8], a: 0.1, rear: 0.3, trail: 1.2, t: null }][ph];
    P = L.P; a = L.a; rear = L.rear; trail = L.trail;
    if (L.t) for (const n in F) tip[n] = [P[0] + L.t[n][0], Math.min(GY, P[1] + L.t[n][1])];
    else for (const n in F) tip[n] = [P[0] + F[n].tx * 0.92, GY + F[n].gy];
  }
  const ca = Math.cos(a), sa = Math.sin(a);
  const W = (u, v) => [P[0] + u * ca - v * sa, P[1] + u * sa + v * ca];   // hand space to painter space
  const Nd = [sa, -ca];                                                      // the back of the hand faces this way
  const shapeL = (pts, mat, o) => A.shape((c, X, Y) => { const q = pts.map(p => W(p[0], p[1])), n = q.length; const m = i => [(q[i][0] + q[(i + 1) % n][0]) / 2, (q[i][1] + q[(i + 1) % n][1]) / 2]; let s = m(n - 1); c.moveTo(X(s[0]), Y(s[1])); for (let i = 0; i < n; i++) { const e = m(i); c.quadraticCurveTo(X(q[i][0]), Y(q[i][1]), X(e[0]), Y(e[1])); } c.closePath(); }, mat, o);
  const polyL = (pts, mat, o) => A.poly(pts.map(p => W(p[0], p[1])), mat, o);
  // ---- a finger: three bones, knuckles standing proud, a black split nail
  const finger = (n) => {
    const f = F[n], K = W(f.k[0], f.k[1]), T = tip[n];
    const planted = T[1] >= GY + f.gy - 0.2, air = atk && rear > 0.5;
    let dDir = air ? znNorm(T[0] - P[0] + (n === 'thumb' ? 0 : 3), T[1] - P[1] + 4) : znNorm((T[0] > K[0] ? 0.3 : -0.3) + (planted ? 0 : (T[0] > K[0] ? 0.5 : -0.5)), 1);
    if (!air && !planted && idle) dDir = znNorm(0.9, 0.6);
    if (wind && (n === 'index' || n === 'middle')) dDir = znNorm(0.6, 1 - tense * 0.9);
    let J1, J2;
    if (air) { J2 = [T[0] - dDir[0] * f.d, T[1] - dDir[1] * f.d]; J1 = znIK(K, J2, f.l1, f.l2, Nd); }
    else {   // a spider's leg: the first bone climbs, the second reaches out and down, the last stabs the ground
      const th = f.up + a * 0.5 - (planted ? 0 : 0.35) - tense * 0.3; J1 = [K[0] + Math.cos(th) * f.l1, K[1] + Math.sin(th) * f.l1];
      J2 = znIK(J1, T, f.l2, f.d, [T[0] > K[0] ? 1 : -1, -0.4]);
      dDir = znNorm(T[0] - J2[0], T[1] - J2[1]);
    }
    const o = { tone: f.tone, sh: 0.8, hl: 0.55 }, far = f.tone < -0.3;
    A.limb([K, znLerp(K, J1, 0.5), J1, znLerp(J1, J2, 0.5), J2, T], f.r * 1.05, f.r * 0.6, skin, o);
    // the nail: a black plate on the back of the last joint, grown long and hooked past the fingertip, split down its length
    let ns = [-dDir[1], dDir[0]]; const out = air ? znNorm(T[0] - P[0], T[1] - P[1]) : [T[0] > K[0] ? 1 : -1, 0]; if (ns[0] * out[0] + ns[1] * out[1] < 0) ns = [-ns[0], -ns[1]];
    const rr = f.r * 0.7, nA = znLerp(J2, T, 0.35), nE = znLerp(J2, T, 0.45), q = (p, a, b) => [p[0] + ns[0] * a + dDir[0] * b, p[1] + ns[1] * a + dDir[1] * b];
    const E = q(T, -0.3, 2.2);
    A.poly([q(nA, rr * 0.85, 0), q(T, rr * 0.95, 0.2), q(T, 0.4, 1.5), E, q(T, -rr * 0.2, 0.5), q(nE, rr * 0.05, 0)], 'znNail', { tone: far ? -1 : 0, sh: 0.4, hl: 0.4 });
    { const m0 = q(nA, rr * 0.45, 0.3); A.hair(m0[0], m0[1], E[0] - dDir[0] * 0.8, E[1] - dDir[1] * 0.8, far ? NL[2] : NL[4]); const h0 = q(nA, rr * 0.8, 0.1); A.fine(h0[0], h0[1], far ? NL[3] : '#8a8480'); }
    // the knuckles: bone under stretched skin, creases across them
    const bj = (J, a0) => { const nx = J[0] + a0[0] * f.r * 0.7, ny = J[1] + a0[1] * f.r * 0.7; A.fine(nx, ny, far ? S[2] : S[4]); A.fine(nx + 0.4, ny + 0.2, far ? S[1] : S[3]); };
    const n1 = znNorm(J1[0] - (K[0] + J2[0]) / 2, J1[1] - (K[1] + J2[1]) / 2), n2 = znNorm(J2[0] - (J1[0] + T[0]) / 2, J2[1] - (J1[1] + T[1]) / 2);
    bj(J1, n1); bj(J2, n2);
    if (!far) for (const [J, nn] of [[J1, n1], [J2, n2]]) for (let i = -1; i <= 1; i += 2) { const d2 = znNorm(J1 === J ? J2[0] - K[0] : T[0] - J1[0], J1 === J ? J2[1] - K[1] : T[1] - J1[1]); const cx = J[0] + d2[0] * i * 0.9, cy = J[1] + d2[1] * i * 0.9; A.hair(cx + nn[0] * 0.2, cy + nn[1] * 0.2, cx - nn[0] * 0.7, cy - nn[1] * 0.7, S[1]); }
    return { K, J1, J2, T };
  };
  // ---- far fingers first
  finger('pinky'); finger('ring'); finger('middle');
  // ---- the forearm stump, carried high behind: torn skin, two bone ends, sinew hanging, a drip
  A.limb([W(-6, -1.2), W(-11, -1.4), W(-15, -1.8)], 3.5, 4.1, skin, { tone: -0.3, sh: 1.3, hl: 0.8 });
  const st = W(-15.5, -1.8);
  const b1a = W(-15, -3.4), b1b = W(-19.4, -5.8), b2a = W(-15, 0.2), b2b = W(-18.6, 0.2);
  A.ell(st[0], st[1], 2, 4.4, 'meat', { rot: a, sh: 0.6, hl: 0.9, lit: 0.15 });
  A.ell(st[0] - 0.3, st[1] - 0.2, 0.8, 2.6, 'gut', { rot: a, flat: true, tone: -0.6, contour: false });   // the torn muscle inside
  A.limb([b2a, b2b], 0.9, 0.8, 'bone', { sh: 0.5, hl: 0.4 }); A.ell(b2b[0], b2b[1], 0.45, 0.45, '#3a1010', { flat: true, contour: false });
  A.limb([b1a, b1b], 1.15, 1.05, 'bone', { sh: 0.5, hl: 0.4 }); A.ell(b1b[0] - 0.1, b1b[1], 0.6, 0.6, '#4a1414', { flat: true, contour: false }); A.fine(b1b[0] + 0.4, b1b[1] + 0.5, '#8a2a20');
  for (let i = 0; i < 5; i++) { const e1 = W(-16.8 - (i % 2) * 1.1, -5.2 + i * 1.9); A.poly([W(-14.4, -5.6 + i * 1.9), e1, W(-14.4, -4.4 + i * 1.9)], skin, { tone: -0.2, sh: 0.4, hl: 0.3 }); }   // the ragged edge of the skin
  A.fine(st[0] - 0.3, st[1] - 1.6, ME[4]); A.fine(st[0] + 0.2, st[1] + 2, ME[4]); A.speck(st[0] - 1.6, st[1] - 3, 3, 6, ME[1], 8, 41);
  for (let i = 0; i < 3; i++) {                                                      // sinew, hanging by gravity, swinging behind
    const s0 = W(-15.8, -1.6 + i * 1.5), len = 3.4 + i * 1.4 + (i === 1 ? 1.2 : 0), sw = trail * (0.8 + i * 0.3);
    const s1 = [s0[0] - sw * 0.5 - 0.5, s0[1] + len * 0.55], s2 = [s0[0] - sw - 0.4 + (i - 1) * 0.4, s0[1] + len];
    A.limb([s0, s1, s2], 0.45, 0.3, 'gut', { tone: i === 1 ? 0.3 : -0.6, sh: 0.3, hl: 0.3 }); if (i !== 2) A.fine(s2[0], s2[1] + 0.6, ME[3]);
  }
  // ---- the back of the hand, seen from above as the camera sees it: a broad plate, tendons fanning to the knuckles
  shapeL([[-9, -4.6], [-4, -7.6], [2, -9.6], [7.5, -8.4], [10.6, -4], [10.8, 0.6], [9.4, 3.4], [2, 4.2], [-6, 3.2], [-9, 2.2]], skin, { sh: 2, hl: 1.3 });
  shapeL([[-5, -6], [1, -8.4], [6, -8], [8.6, -5.6], [4, -6], [-1, -5.6]], skin, { flat: true, lit: 0.3, contour: false });   // the lit plane of the back
  const KN = ['pinky', 'ring', 'middle', 'index'];
  KN.forEach((n, i) => { const k = F[n].k, a0 = W(-6, -3.4 + i * 0.9), a1 = W(k[0] - 1.6, k[1] - 0.6); A.hair(a0[0], a0[1], a1[0], a1[1], S[3]); const b0 = W(-5, -2.7 + i * 0.9), b1 = W(k[0] - 1.8, k[1] + 0.2); if (i < 3) A.hair(b0[0], b0[1], b1[0], b1[1], S[1]); });
  const vv = [W(-9.6, 0.6), W(-5, -1.2), W(-1.6, 0.2), W(2.5, -1.4), W(5, 0.2)]; for (let i = 0; i < 4; i++) A.hair(vv[i][0], vv[i][1], vv[i + 1][0], vv[i + 1][1], '#463a52');
  if (tense) KN.forEach((n, i) => { if (i < 2) return; const k = F[n].k, a0 = W(-5, -2.6 + i * 1.2), a1 = W(k[0] - 2.2, k[1] - 0.6); A.hair(a0[0], a0[1], a1[0], a1[1], S[4]); });
  // knuckles: a row of bone bumps from the far side to the near
  KN.forEach((n, i) => { const k = W(F[n].k[0] - 0.6, F[n].k[1] - 0.4); A.ell(k[0], k[1], 1.5, 1.2, skin, { round: 1, contour: i > 0, tone: -0.6 + i * 0.35, sh: 0.5, hl: 0.6 }); A.fine(k[0] - 0.5, k[1] - 0.7, i > 1 ? S[4] : S[3]); A.fine(k[0] + 0.6, k[1] + 0.5, S[0]); });
  A.speck(P[0] - 9, P[1] - 5, 16, 9, '#3a3438', 20, 5); A.speck(P[0] - 8, P[1] - 5, 10, 5, '#5a4a3e', 8, 9); A.speck(P[0] - 6, P[1] - 5, 12, 3, S[0], 10, 13);   // liver spots, grave stains, bristles
  // the iron tithe-band clapped round the wrist, riveted, a coin hanging from its ring
  polyL([[-12.4, -5.6], [-10.2, -5.5], [-10.2, 2.5], [-12.4, 2.8]], 'char', { sh: 0.6, hl: 0.5 });
  { const rr = W(-12.4, -5.6); A.speck(rr[0] - 1, rr[1], 4, 10, MAT.rust[2], 8, 17); A.speck(rr[0] - 1, rr[1], 4, 10, MAT.rust[1], 8, 19); }
  { const r1 = W(-11.4, -4), r2 = W(-11.3, -0.8); A.stud(r1[0], r1[1], 'steel'); A.stud(r2[0], r2[1], 'steel'); }
  const loop = W(-11.3, 2.9), th = Math.max(-0.9, Math.min(0.9, trail * 0.45)), l1p = [loop[0] - Math.sin(th) * 1.6, loop[1] + Math.cos(th) * 1.6], coin = [loop[0] - Math.sin(th) * 3.6, loop[1] + Math.cos(th) * 3.6];
  A.ell(loop[0], loop[1] + 0.3, 0.7, 0.6, 'rust', { flat: true, tone: -1 }); A.hair(loop[0], loop[1] + 0.6, l1p[0], l1p[1], MAT.rust[2]); A.ell(l1p[0], l1p[1], 0.5, 0.7, 'rust', { contour: true });
  A.ell(coin[0], coin[1], 1.45, 1.45, 'bronze', { metal: true, sh: 0.5, hl: 0.5 }); A.fine(coin[0], coin[1] - 0.3, MAT.bronze[0]); A.fine(coin[0], coin[1] + 0.4, MAT.bronze[0]); A.fine(coin[0] - 0.4, coin[1], MAT.bronze[0]); A.fine(coin[0] + 0.4, coin[1], MAT.bronze[0]);
  // the nail through the back of the hand, still weeping
  const nh = W(-1.3, -6.6);
  polyL([[-2.6, -7.6], [-0.2, -7.8], [0, -5.4], [-2.4, -5.2]], 'rust', { metal: true, sh: 0.4, hl: 0.4 }); A.fine(nh[0] - 0.3, nh[1] - 0.5, MAT.rust[4]);
  { const d0 = W(-0.6, -5.2), d1 = W(0.2, -2.6), d2 = W(0, -0.4); A.hair(d0[0], d0[1], d1[0], d1[1], '#6a0c10'); A.hair(d1[0], d1[1], d2[0], d2[1], '#3a0608'); A.fine(d0[0] + 0.3, d0[1] + 0.4, '#b02a22'); A.fine(d1[0], d1[1], '#8a1a18'); }
  // ---- the palm and its mouth: a lipped ring of needle teeth, gaping as it rears
  const op = rear, mc = W(1.5, 3.4 + 1.2 * op);
  if (op > 0.25) shapeL([[-6, 2.4], [0, 2.6], [7.5, 2.2], [6.5, 3.2 + 3.6 * op], [0, 4 + 4.2 * op], [-5.5, 3.2 + 2.8 * op]], skin, { tone: -0.4, sh: 0.9, hl: 0.5 });
  A.ell(mc[0], mc[1], 3.4 + 1.6 * op, 0.9 + 2.9 * op, 'znLip', { rot: a, sh: 0.6, hl: 0.5 });
  A.ell(mc[0], mc[1], 2.6 + 1.4 * op, 0.35 + 2.4 * op, 'znMaw', { rot: a, sh: 0.6, hl: 0.3, tone: -3, contour: false });
  if (op > 0.5) { A.ell(mc[0] + sa * 0.6, mc[1] + ca * 0.4, 1.6 + op, 0.9 * op, 'znMaw', { rot: a, flat: true, tone: 1.5, contour: false }); const gl = W(1.5, 3.4 + 2 * op); A.fine(gl[0] + 0.4, gl[1] - 0.4, '#d88a8a'); }   // the gullet, the tongue's wet shine
  const nT = 9; for (let i = 0; i < nT; i++) {                                           // teeth all round the ring, pointing in
    const ang = i / nT * 6.2832 + 0.3, ex = Math.cos(ang) * (2.6 + 1.4 * op), ey = Math.sin(ang) * (0.35 + 2.4 * op);
    const p0 = W(1.5 + ex, 3.4 + 1.2 * op + ey), p1 = W(1.5 + ex * 0.6, 3.4 + 1.2 * op + ey * 0.45);
    if (op < 0.3 && Math.sin(ang) < 0) continue;
    A.hair(p0[0], p0[1], p1[0], p1[1], MAT.bone[3]); A.fine(p1[0], p1[1], MAT.bone[4]); A.fine(p0[0], p0[1], MAT.boneOld[1]);
  }
  if (op < 0.4) { const d0 = W(0.5, 4.2); A.hair(d0[0], d0[1], d0[0] - 0.2, d0[1] + 1.4 + (idle ? ph % 2 : 0), '#6a4a50'); }   // drool
  // ---- near fingers, then the thumb braced behind
  const ix = finger('index');
  { const rp = znLerp(ix.K, ix.J1, 0.42), d = znNorm(ix.J1[0] - ix.K[0], ix.J1[1] - ix.K[1]), pp = [-d[1], d[0]];   // the tithe ring: tarnished gold, a blood-red stone
    A.poly([[rp[0] + pp[0] * 1.5 - d[0] * 0.5, rp[1] + pp[1] * 1.5 - d[1] * 0.5], [rp[0] + pp[0] * 1.5 + d[0] * 0.6, rp[1] + pp[1] * 1.5 + d[1] * 0.6], [rp[0] - pp[0] * 1.5 + d[0] * 0.6, rp[1] - pp[1] * 1.5 + d[1] * 0.6], [rp[0] - pp[0] * 1.5 - d[0] * 0.5, rp[1] - pp[1] * 1.5 - d[1] * 0.5]], 'gold', { metal: true, sh: 0.4, hl: 0.4 });
    const g0 = [rp[0] + pp[0] * 1.3, rp[1] + pp[1] * 1.3]; A.fine(g0[0], g0[1], '#a01818'); A.fine(g0[0] + 0.4, g0[1], '#e04030'); }
  finger('thumb');
  // the god's blood still glows in the throat of the palm; it lights the underside red
  { const g = W(1.5, 4.2 + op); A.lamp(g[0], g[1] + 1, [220, 60, 30], 9 + 8 * op, 0.45 + 0.6 * op); }
  A.rim([110, 122, 150], 0.35);
};

// a closed path through points: plain points round off into curves, points marked sharp (third value truthy) stay corners
function znPath(c, X, Y, pts) {
  const n = pts.length, mid = (i, j) => [(pts[i][0] + pts[j][0]) / 2, (pts[i][1] + pts[j][1]) / 2];
  const s0 = pts[0][2] ? pts[0] : mid(n - 1, 0); c.moveTo(X(s0[0]), Y(s0[1]));
  for (let i = 0; i < n; i++) { const p = pts[i]; if (p[2]) { if (i) c.lineTo(X(p[0]), Y(p[1])); } else { const m = mid(i, (i + 1) % n); c.quadraticCurveTo(X(p[0]), Y(p[1]), X(m[0]), Y(m[1])); } }
  c.closePath();
}

// ------------------------------------------------------------------- WEEPER
// A mourner with no face. Under a long black veil, crowned with thorns and edged with tarnished lace, there is only a
// smooth pale oval where a face should be; from the two dents where the eyes were, tears run and harden into bone
// needles. It keeps its distance, gliding with its hem dragging, and when it means to throw it tips its blank face to
// the sky and the tears begin to shine with a cold light; then it flings them.
MFRAME.weeper = [36, 48]; MPX_K.weeper = 1.3; MPX_WALK.weeper = 3.4;
defMat('znVeil', '#040306', '#0b0910', '#17131e', '#282134', '#3e344c');
defMat('znShroud', '#050405', '#110d10', '#211a1e', '#342a2e', '#4c3e42');
defMat('znFace', '#2a2630', '#5c5662', '#908890', '#bdb3b0', '#e4dace');
MPX.weeper = function (A, pose, ph, pal) {
  const t = pal.tint, veil = tintMat('znVeil', t, 0.5), shroud = tintMat('znShroud', t, 0.5), face = tintMat('znFace', t, 0.25), hand = tintMat('skinDead', t, 0.3);
  const V = MAT[veil], SH = MAT[shroud], FC = MAT[face], HD = MAT[hand];
  const walk = pose === 'walk', idle = pose === 'idle', wind = pose === 'wind', atk = pose === 'atk';
  let bob = 0, lean = 0, tilt = 0, trail = 0.4, glow = 0.2, sob = 0, wk = 0, wv = 0, drip = 0;
  if (idle) { const b = Math.sin(ph / 4 * 6.2832); bob = b * 0.5; sob = ph === 1 ? 0.5 : 0; drip = ph; wv = ph * 0.8; }
  if (walk) { const g = ph / 8 * 6.2832; bob = Math.sin(g * 2) * 0.5 - 0.3; lean = 1.2; trail = 1.7 + 0.8 * Math.sin(g - 1.2); wv = g; drip = ph % 4; }
  if (wind) { wk = [0.35, 0.7, 1][ph]; tilt = wk; glow = 0.25 + 0.75 * wk; lean = -1.4 * wk; bob = -0.8 * wk; trail = 0.2 + 0.3 * wk; wv = ph * 0.6; }
  if (atk) { lean = [3, 2.2, 0.8][ph]; tilt = [-0.15, -0.3, -0.1][ph]; glow = [0.8, 0.35, 0.2][ph]; trail = [-0.9, -0.5, 0.3][ph]; wv = ph; }
  const S = [0.5 + lean * 0.7, -37 + bob], H = [S[0] + 2.4 + lean * 0.35 - tilt * 2.6, S[1] - 6.2 - tilt * 0.3 + sob * 0.4];
  const fr = 0.35 - tilt * 1.25, cr = Math.cos(fr), sr = Math.sin(fr);
  const FR = (u, v) => [F[0] + u * cr - v * sr, F[1] + u * sr + v * cr];   // face space, tipped with the head
  const F = [H[0] + 1.9, H[1] + 0.8];
  const BL = (pts, mat, o) => A.shape((c, X, Y) => znPath(c, X, Y, pts), mat, o);
  // ---- the veil's long tail down the back, trailing the glide
  const tw = k => Math.sin(wv - k) * 0.7;
  BL([[H[0] - 1, H[1] - 6], [H[0] - 6.4, H[1] - 2], [S[0] - 8.4 - trail * 0.6, S[1] + 8], [S[0] - 10.5 - trail * 1.5 + tw(1), S[1] + 21, 1], [S[0] - 7.6 - trail * 1.1 + tw(1.5), S[1] + 18.4, 1], [S[0] - 6.8 - trail * 1.2 + tw(2), S[1] + 22.5, 1], [S[0] - 4 - trail * 0.6, S[1] + 14], [S[0] - 1, S[1] + 4]], veil, { tone: -0.6, sh: 1.2, hl: 0.6 });
  // ---- the far arm, in its sleeve
  const armPose = (far) => {
    const sx = S[0] + (far ? -1.2 : 1.6), sy = S[1] + (far ? 1.5 : 2.2);
    if (wind) return far ? { s: [sx, sy], e: [sx - 2.5 * wk, sy + 7 - 2 * wk], h: [sx - 5.5 * wk, sy + 8 - 5 * wk] } : { s: [sx, sy], e: [sx + 3 + wk, sy + 7.5 - 1.5 * wk], h: [sx + 6.5 + 2.5 * wk, sy + 7 - 3.5 * wk] };
    if (atk && !far) return [{ s: [sx, sy], e: [sx + 5.5, sy + 1], h: [sx + 11.5, sy - 1.5] }, { s: [sx, sy], e: [sx + 5.8, sy + 5], h: [sx + 11, sy + 10] }, { s: [sx, sy], e: [sx + 3.6, sy + 8], h: [sx + 6.5, sy + 8.5] }][ph];
    return { s: [sx, sy], e: [sx + 2.4 - (far ? 1 : 0), sy + 9 + sob * 0.4], h: [sx + 5.2 + (far ? 1.4 : 0), sy + 6.4 - sob * 0.6] };
  };
  const sleeve = (P, far) => {
    const o = { tone: far ? -1.6 : 0, sh: 1, hl: 0.6 };
    A.limb([P.s, P.e], 2.1, 2, shroud, o);
    const d = znNorm(P.h[0] - P.e[0], P.h[1] - P.e[1]), pp = [-d[1], d[0]], w0 = znLerp(P.e, P.h, 0.72);
    A.poly([[P.e[0] + pp[0] * 1.9, P.e[1] + pp[1] * 1.9], [w0[0] + pp[0] * 2.6 + d[0] * 0.6, w0[1] + pp[1] * 2.6 + d[1] * 0.6], [w0[0] - pp[0] * 2.8 + d[0] * 0.2, w0[1] - pp[1] * 2.8 + d[1] * 0.2], [P.e[0] - pp[0] * 2.1, P.e[1] - pp[1] * 2.1]], shroud, o);   // the bell of the sleeve
    A.ell(w0[0] + d[0] * 0.3, w0[1] + d[1] * 0.3, 0.9, 2.3, '#050306', { rot: Math.atan2(d[1], d[0]), flat: true, contour: false });
    for (let i = 0; i < 3; i++) { const a0 = znLerp(P.e, w0, 0.2 + i * 0.25); A.fine(a0[0] + pp[0] * (1.4 + i * 0.4), a0[1] + pp[1] * (1.4 + i * 0.4), far ? SH[1] : SH[4]); }
    return { w0, d, pp };
  };
  const fingers = (P, W0, far, spread, open) => {
    const o = { tone: far ? -1.6 : 0.2, sh: 0.5, hl: 0.4 }, d = W0.d, ang = Math.atan2(d[1], d[0]);
    const hc = [W0.w0[0] + d[0] * 1.4, W0.w0[1] + d[1] * 1.4];
    A.ell(hc[0], hc[1], 1.7, 1.25, hand, { ...o, rot: ang });
    for (let i = 0; i < 4; i++) { const a2 = ang + (i - 1.5) * (0.22 + spread * 0.25) - (open ? 0 : 0.5), L = 3 + (i === 1 || i === 2 ? 0.8 : 0), b = [hc[0] + Math.cos(a2) * 1.1, hc[1] + Math.sin(a2) * 1.1], m = [b[0] + Math.cos(a2) * L * 0.5, b[1] + Math.sin(a2) * L * 0.5], e = [m[0] + Math.cos(a2 + (open ? -0.15 : 0.9)) * L * 0.55, m[1] + Math.sin(a2 + (open ? -0.15 : 0.9)) * L * 0.55];
      A.limb([b, m, e], 0.5, 0.36, hand, { ...o, edge: false }); A.fine(m[0], m[1] - 0.3, far ? HD[1] : HD[4]); A.fine(e[0], e[1], '#141014'); }
    return hc;
  };
  const PF = armPose(true), WF = sleeve(PF, true); fingers(PF, WF, true, wk, wind);
  // ---- the shroud, long and narrow, pooling and dragging at the hem
  const hem = []; for (let i = 0; i <= 8; i++) { const k = i / 8, x = 9.4 - trail * 0.5 - k * (19.6 + trail * 1.2) + Math.sin(wv * 1 - k * 4) * 0.5 * (walk ? 1 : 0.4), y = (i % 2 ? -1.6 - (i % 4 === 1 ? 0.6 : 0) : 0); hem.push([x, y, 1]); }
  BL([[S[0] + 1.6, S[1] - 1], [S[0] + 4.4, S[1] + 1.4], [S[0] + 5.2, S[1] + 9], [S[0] + 5.8, S[1] + 18], [8.2 - trail * 0.4, -6], ...hem, [-9.2 - trail * 1.1, -7], [-6.4 - trail * 0.5, -19], [S[0] - 5.4, S[1] + 7], [S[0] - 3.8, S[1] + 0.2]], shroud, { sh: 1.6, hl: 0.8 });
  // folds hanging from the shoulders to the hem, swinging a beat behind
  for (let i = 0; i < 5; i++) {
    const x0 = S[0] - 3.4 + i * 1.9, y0 = S[1] + 12 + (i % 2) * 2, x1 = x0 - 1.6 - trail * (0.5 + i * 0.1) + Math.sin(wv - i) * 0.4 * (walk ? 1 : 0.3), y1 = -1.6;
    A.poly([[x0, y0], [x0 + 0.6, y0 + 1], [x1 + 1.2, y1], [x1 - 0.2, y1]], shroud, { flat: true, tone: -1.5, contour: false });
    A.hair(x0 + 0.9, y0 + 2, x1 + 1.6, y1 - 0.4, i === 4 ? SH[4] : SH[3]);
  }
  A.speck(-10, -4, 20, 4, '#2a2420', 20, 7); A.speck(-10, -3, 20, 3, SH[0], 14, 9);   // grave-dirt in the hem
  // the cincture: a cord with a rosary of finger-bones and a small bone cross, swinging
  const cw = [S[0] - 4.8, S[1] + 13.2], ce = [S[0] + 5.6, S[1] + 14.2];
  A.limb([cw, [S[0], S[1] + 14], ce], 0.55, 0.55, 'rope', { sh: 0.3, hl: 0.3 });
  const sw = -trail * 0.35, cx0 = S[0] + 4.2, cy0 = S[1] + 14.2;
  for (let i = 1; i <= 9; i++) { const bx = cx0 + Math.sin(sw) * i * 0.75, by = cy0 + Math.cos(sw) * i * 0.75; A.fine(bx, by, i % 2 ? MAT.bone[3] : MAT.boneOld[1]); }
  { const cx = cx0 + Math.sin(sw) * 7.8, cy = cy0 + Math.cos(sw) * 7.8; A.rect(cx - 0.4, cy - 0.6, 0.8, 3.4, MAT.bone[3]); A.rect(cx - 1.3, cy + 0.3, 2.6, 0.7, MAT.bone[3]); A.fine(cx - 0.3, cy - 0.5, MAT.bone[4]); A.fine(cx + 0.3, cy + 2.6, MAT.bone[1]); }
  // ---- the head under the veil: the hood of it, a blank pale oval, lace at the edge, a crown of thorns
  BL([[H[0] + 3.4, H[1] - 4.2], [H[0] + 0.4, H[1] - 7.2], [H[0] - 4.2, H[1] - 5], [H[0] - 5.8, H[1] + 1.4], [S[0] - 5.4, S[1] + 6], [S[0] - 1, S[1] + 9], [S[0] + 5.2, S[1] + 6], [H[0] + 4.6, H[1] + 6.4], [H[0] + 5.2, H[1] + 1]], veil, { sh: 1.3, hl: 0.9 });
  for (let i = 0; i < 4; i++) A.hair(H[0] - 3 + i * 1.6, H[1] - 1 + i * 0.4, S[0] - 3 + i * 2.2 - trail * 0.3, S[1] + 6.5 + (i % 2) * 1.4, V[1]);   // folds of the veil
  for (let i = 0; i < 3; i++) A.hair(H[0] - 2.6 + i * 1.6, H[1] - 3.6 + i * 0.2, H[0] - 3.6 + i * 1.8, H[1] + 1.5, V[3]);
  // the face that is not a face
  A.ell(F[0], F[1], 2.3, 3.3, face, { rot: fr * 0.6, sh: 0.8, hl: 0.8 });
  A.ell(F[0] - 0.6, F[1] - 0.3, 1.2, 2.4, face, { rot: fr * 0.6, flat: true, tone: -1.3, contour: false });   // the shadow side of it, turned from the light
  const eyes = [FR(0.1, -1), FR(1.9, -1.1)];
  for (const e of eyes) { A.ell(e[0], e[1], 0.55, 0.35, FC[1], { flat: true, contour: false }); A.fine(e[0] - 0.3, e[1] - 0.5, FC[4]); }
  { const m = FR(1.2, 1.7); A.hair(m[0] - 0.6, m[1], m[0] + 0.5, m[1] + 0.1, FC[1]); }                                  // skin grown over the mouth
  // the lace edge of the veil round the face, the veil's lip over the brow
  A.limb([[H[0] + 3.8, H[1] - 2.8], FR(-1.8, -2.6), FR(-2.6, 0), FR(-1.8, 3.2)], 0.8, 0.6, veil, { sh: 0.4, hl: 0.4 });
  for (let i = 0; i < 7; i++) { const k = i / 6, p = k < 0.5 ? znLerp(FR(0.6, -4.8), FR(-2.9, -2.6), k * 2) : znLerp(FR(-2.9, -2.6), FR(-3.1, 3.6), (k - 0.5) * 2); A.fine(p[0], p[1], i % 2 ? '#5e5868' : '#8e8698'); }
  for (let i = 0; i < 6; i++) { const p = [S[0] + 4.6 - i * 1.6 + (i > 3 ? 0.4 : 0), S[1] + 5.8 + i * 0.5]; A.fine(p[0], p[1], i % 2 ? '#5e5868' : '#8e8698'); }
  // the crown of thorns
  const cc = [H[0] - 0.4, H[1] - 5.2];
  for (let i = 0; i < 9; i++) { const a0 = i / 9 * 6.2832, a1 = (i + 1) / 9 * 6.2832, p0 = [cc[0] + Math.cos(a0) * 4, cc[1] + Math.sin(a0) * 1.1 - Math.cos(a0) * tilt * 0.8], p1 = [cc[0] + Math.cos(a1) * 4, cc[1] + Math.sin(a1) * 1.1 - Math.cos(a1) * tilt * 0.8];
    const front = Math.sin(a0) > -0.2; A.hair(p0[0], p0[1], p1[0], p1[1], front ? '#4a3a2c' : '#1a1410'); if (front || i % 2) { A.hair(p0[0], p0[1], p0[0] + Math.cos(a0 + 0.5) * 0.9, p0[1] - 1.1, front ? '#6a5642' : '#241c16'); A.fine(p0[0] + Math.cos(a0 + 0.5) * 0.9, p0[1] - 1.1, front ? '#9a8466' : '#2a2018'); } }
  // the tears: from each dent, needles of bone hanging, shining cold when it means to throw
  const tc = glow > 0.5 ? ['#7aa8d0', '#d8f4ff', '#ffffff'] : ['#8a8272', '#d8ceb0', '#f6f0dc'];
  eyes.forEach((e, j) => { for (let i = 0; i < 3; i++) { const x = e[0] - 0.4 + i * 0.45 + j * 0.1, L = 2.8 + ((i + j * 2) % 3) * 1.4 - tilt * 0.8, y0 = e[1] + 0.4; A.hair(x, y0, x + tilt * 0.3, y0 + L, tc[1]); A.fine(x, y0 + L, tc[2]); A.fine(x, y0, tc[0]); } A.fine(e[0] + 0.5, e[1] + 0.6, '#5a1418'); });
  if (idle || walk) { const e = eyes[1], dy = 3 + drip * 1.6; A.fine(e[0] + 0.2, e[1] + dy, drip === 3 ? tc[2] : tc[1]); }   // a tear falling
  // ---- the near arm
  const PN = armPose(false), WN = sleeve(PN, false), hc = fingers(PN, WN, false, wk + (atk && ph === 0 ? 1 : 0), wind || (atk && ph < 2));
  if (!atk) { A.fine(hc[0] + 0.4, hc[1] - 0.6, HD[4]); }
  // the thrown needles: a fan of bone, streaking, cold
  if (atk && ph < 2) {
    const d0 = ph === 0 ? 4.5 : 4;
    for (let i = 0; i < 4; i++) { const a2 = -0.32 + i * 0.2 + (ph ? 0.1 : 0), x0 = hc[0] + d0 + (ph ? 4 - hc[0] + S[0] + 7 : 0) + (i % 2) * 1.2, y0 = (ph ? S[1] + 1 : hc[1] - 0.5) + (i - 1.5) * 1.5, L = 4.2;
      const x1 = x0 + Math.cos(a2) * L, y1 = y0 + Math.sin(a2) * L;
      A.hair(x0 - Math.cos(a2) * 4, y0 - Math.sin(a2) * 4, x0, y0, 'rgba(170,215,255,0.35)');
      A.line(x0, y0, x1, y1, '#e8e2cc', 0.5); A.fine(x1, y1, '#ffffff'); A.fine(x0, y0, '#8a8272'); }
  }
  // the cold light of the tears; the dark swallows the rest
  const fl = FR(1, 0.6);
  A.lamp(fl[0], fl[1] + 1.5, [160, 214, 255], 5 + 10 * glow, 0.3 + 0.7 * glow);
  if (atk && ph < 2) A.lamp(hc[0] + (ph ? 12 : 6), hc[1], [170, 220, 255], 10, 0.8);
  A.rim([120, 130, 170], 0.45);
};

// tintMat for materials made of rgba() tones (tintMat leaves those alone): the Mire Gasp and champions still tint
function znTintA(name, tint, k) { const R = MAT[name]; if (!R || !tint) return name; const key = name + '|a|' + tint + '|' + k; if (MAT[key]) return key; const T = hexRgb(tint), tl = (T[0] + T[1] + T[2]) / 3 || 1;
  MAT[key] = R.map(h => { const m = h.match(/[\d.]+/g).map(Number), l = (m[0] + m[1] + m[2]) / 3, c = [0, 1, 2].map(i => Math.round(Math.max(0, Math.min(255, m[i] + (T[i] * l / tl - m[i]) * k)))); return 'rgba(' + c.join(',') + ',' + (m[3] != null ? m[3] : 1) + ')'; }); return key; }

// ------------------------------------------------------------------- GASP
// A stray scrap of Yh'Anuul's last breath, still trying to finish it. A hooded veil of cold vapour, torn into
// streamers below, with mouths opening all over it; where a face would be, the biggest mouth of all. It never
// touches the ground. It drifts, bobbing, its tatters streaming behind; before it strikes it drags the air into
// every mouth at once and swells wide, then it lunges and breathes out.
MFRAME.gasp = [38, 50]; MPX_K.gasp = 1.3; MPX_WALK.gasp = 3;
defMat('znBreath', 'rgba(34,36,66,0.8)', 'rgba(80,92,134,0.55)', 'rgba(136,152,192,0.5)', 'rgba(188,204,236,0.66)', 'rgba(236,242,255,0.86)');
defMat('znBreathBk', 'rgba(24,26,50,0.5)', 'rgba(60,70,108,0.32)', 'rgba(100,114,152,0.24)', 'rgba(140,156,196,0.34)', 'rgba(180,196,230,0.45)');
defMat('znGLip', 'rgba(46,14,26,0.95)', 'rgba(96,36,56,0.92)', 'rgba(140,66,84,0.9)', 'rgba(182,108,118,0.9)', 'rgba(220,160,160,0.9)');
MPX.gasp = function (A, pose, ph, pal) {
  const t = pal.tint, G = znTintA('znBreath', t, 0.5), GB = znTintA('znBreathBk', t, 0.5), GM = MAT[G];
  const walk = pose === 'walk', idle = pose === 'idle', wind = pose === 'wind', atk = pose === 'atk';
  let bob = 0, lean = 0, bill = 1, trail = 0.6, wv = ph * 1.3, inh = 0, exh = 0, stretch = 1, lift = 0;
  if (idle) { bob = Math.sin(ph / 4 * 6.2832) * 1.2; wv = ph / 4 * 6.2832; }
  if (walk) { const g = ph / 8 * 6.2832; bob = Math.sin(g) * 1.5; lean = 1.6 + Math.sin(g - 0.8) * 0.4; trail = 2.2 + Math.sin(g - 1.4) * 0.8; wv = g; }
  if (wind) { inh = [0.35, 0.7, 1][ph]; bill = 1 + 0.5 * inh; lean = -1.8 * inh; lift = 1.6 * inh; trail = 0.3; wv = ph * 0.9; }
  if (atk) { exh = [1, 0.85, 0.3][ph]; lean = [6, 7.5, 2][ph]; bill = [0.85, 0.8, 0.95][ph]; stretch = [1.1, 1.14, 1][ph]; trail = [3.2, 4, 1.5][ph]; wv = 2 + ph; lift = [0.5, 0.2, 0][ph]; }
  const yB = -10.5 + bob - lift, Hh = 42 * (atk ? 0.96 : 1), yT = yB - Hh;
  const cx = k => lean * Math.pow(k, 1.3) + Math.sin(wv - k * 3) * 0.5 * (1 - k);                 // the spine of it, lagging down its length
  const wd = k => (3.6 + 6.2 * Math.pow(1 - k, 0.85)) * bill * (k > 0.5 ? 1 : 1 + (bill - 1) * 0.6) * (atk ? 1 / stretch : 1);
  const at = (k, s) => [cx(k) + wd(k) * s, yB - Hh * k];                                              // s: -1 back edge, +1 front edge
  // the outline of a veil: up the back, over the hood, down the front, then the streamers
  const veilPts = (scale, back) => {
    const P = [];
    for (const k of [0.1, 0.35, 0.6, 0.8]) { const p = at(k, -scale); P.push([p[0] - back, p[1]]); }
    P.push([cx(0.94) - wd(0.94) * 0.8 * scale - back, yB - Hh * 0.96]); P.push([cx(1) + 0.5, yT - 0.6]); P.push([cx(1) + 3.4 + lean * 0.2, yT + 1.2]); P.push([cx(0.9) + wd(0.9) * 1.25 * scale + 0.8, yB - Hh * 0.88, 1]); P.push([cx(0.86) + wd(0.86) * 1.0 * scale, yB - Hh * 0.84]);
    for (const k of [0.78, 0.55, 0.3, 0.1]) P.push(at(k, scale * (k > 0.7 ? 1.05 : 1)));
    const n = 6; for (let i = 0; i <= n; i++) { const u = i / n, x0 = cx(0) + wd(0) * scale * (1 - 2 * u) - back * u, len = (i % 2 ? 2 : 5 + (i % 3) * 1.6) * (0.8 + 0.3 * scale), tr = trail * (0.4 + u * 0.9) + Math.sin(wv - u * 4 + i) * 0.8;
      P.push([x0 - tr * (i % 2 ? 0.3 : 1), yB + (i % 2 ? 0.5 : len), 1]); }
    return P;
  };
  const BL = (pts, mat, o) => A.shape((c, X, Y) => znPath(c, X, Y, pts), mat, o);
  // ---- the back of the veil, wider and fainter, and the far arm
  BL(veilPts(1.22, 1.6), GB, { sh: 1.4, hl: 0.6, contour: false });
  const arm = (far) => {
    const sh = at(0.72, far ? -0.2 : 0.7), o = { tone: far ? -1.5 : 0, sh: 0.8, hl: 0.5, contour: !far };
    let el, hd;
    if (wind) { el = [sh[0] + (far ? -5 : 5) * inh - 1, sh[1] + 3 - 4 * inh]; hd = [el[0] + (far ? -5 : 5) * inh, el[1] - 4 * inh]; }
    else if (atk) { el = [sh[0] + 5, sh[1] + 1.5 - exh]; hd = [el[0] + 5 + 2 * exh, el[1] - 0.5 + (far ? 1.5 : 0)]; }
    else { const sw = Math.sin(wv - 1.2) * 0.8; el = [sh[0] + 3.6 + sw * 0.4, sh[1] + 5]; hd = [el[0] + 3.6 + sw, el[1] + 3]; }
    A.limb([sh, el, hd], 1.9, 0.9, far ? GB : G, o);
    const d = znNorm(hd[0] - el[0], hd[1] - el[1]);
    for (let i = 0; i < 4; i++) { const a2 = Math.atan2(d[1], d[0]) + (i - 1.5) * (0.28 + inh * 0.3) + (atk ? 0 : 0.35), L = 3 + (i % 2) * 1.2 + inh, m = [hd[0] + Math.cos(a2) * L * 0.5, hd[1] + Math.sin(a2) * L * 0.5], e = [hd[0] + Math.cos(a2 + 0.3) * L, hd[1] + Math.sin(a2 + 0.3) * L + (atk ? 0 : 0.6)];
      A.limb([hd, m, e], 0.45, 0.15, far ? GB : G, { ...o, edge: false }); }
    return { sh, el, hd };
  };
  arm(true);
  // ---- the front of the veil with its folds
  BL(veilPts(1, 0), G, { sh: 1.5, hl: 0.9 });
  for (let i = 0; i < 4; i++) {                                           // folds running down into the streamers
    const s = -0.75 + i * 0.5, p0 = at(0.82 - (i % 2) * 0.06, s * 0.7), p1 = at(0.3, s), p2 = [cx(0) + wd(0) * s - trail * (0.4 + (1 - (s + 1) / 2) * 0.9) + Math.sin(wv + i) * 0.6, yB + 2 + (i % 2) * 2];
    const q = [(p0[0] + p1[0]) / 2 + Math.sin(wv + i * 2) * 0.8, (p0[1] + p1[1]) / 2]; A.hair(p0[0], p0[1], q[0], q[1], GM[1]); A.hair(q[0], q[1], p1[0], p1[1], GM[1]); A.hair(p1[0], p1[1], p2[0], p2[1], GM[1]); A.hair(p0[0] - 0.8, p0[1] + 1, q[0] - 0.8, q[1], GM[3]);
  }
  // ---- tatters thinning into mist below it, and smoke curling off the hood
  for (let i = 0; i < 5; i++) { const u = i / 4, x0 = cx(0) + wd(0) * (0.8 - 1.6 * u), tr = trail * (0.6 + u) + Math.sin(wv - u * 3 + i) * 1.2, L = 6 + (i % 2) * 2.5;
    A.limb([[x0, yB], [x0 - tr * 0.5, yB + L * 0.55], [x0 - tr - 0.8, yB + L]], 0.9, 0.2, GB, { contour: false, sh: 0.5, hl: 0.5 }); }
  for (let i = 0; i < 3; i++) { const b0 = [cx(1) - 1 - i * 1.6, yT + 1 + i * 1.2]; let pr = b0; for (let j = 1; j <= 4; j++) { const q = [b0[0] - j * (1.6 + trail * 0.5) - i * 0.4, b0[1] - j * 0.35 + Math.sin(wv * 1.4 + j + i * 2) * 0.7]; A.hair(pr[0], pr[1], q[0], q[1], 'rgba(200,214,240,' + (0.36 - j * 0.07) + ')'); pr = q; } }
  A.speck(cx(0.5) - 8, yB - Hh * 0.9, 16, Hh * 0.9, 'rgba(210,222,245,0.35)', 26, 5);
  // ---- the mouths, breathing each on its own; the hood's mouth is the god's own gasp
  const M = [[0.85, 0.4, 2.1, 0], [0.7, -0.35, 1.3, 1.3], [0.62, 0.5, 1.15, 2.1], [0.5, 0.05, 1.5, 3.3], [0.41, -0.62, 1, 5.7], [0.33, 0.55, 1.2, 4.2], [0.22, -0.2, 1.3, 5.1], [0.12, 0.45, 0.9, 0.9], [0.1, -0.7, 0.8, 2.6]];
  const mouth = (x, y, s, open, rot) => {
    A.ell(x, y, 1.75 * s, 0.4 * s + open * 0.9 + 0.35, 'znGLip', { rot, sh: 0.5, hl: 0.4 });
    A.ell(x, y, 1.4 * s, Math.max(0.3, 0.12 * s + open * 0.8), 'rgba(6,2,10,0.96)', { rot, flat: true, contour: false });
    { const ly = 0.4 * s + open * 0.9 + 0.35; A.hair(x - 1.2 * s, y + ly + 0.3, x + 1.2 * s, y + ly + 0.5, 'rgba(20,20,44,0.5)'); A.fine(x - 0.5 * s, y - ly + 0.1, 'rgba(236,196,196,0.9)'); if (open > 0.5) A.hair(x + 0.3 * s, y + ly, x + 0.4 * s, y + ly + 1.2 + open, 'rgba(210,220,240,0.4)'); }
    const n = Math.max(4, Math.round(5 * s)), ca = Math.cos(rot), sa = Math.sin(rot), oy = Math.max(0.3, 0.12 * s + open * 0.8);
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n * 2 - 1, lx = u * 1.2 * s * Math.sqrt(1 - u * u * 0.4);
      const ty = -oy * Math.sqrt(Math.max(0, 1 - u * u)) + 0.2, by = oy * Math.sqrt(Math.max(0, 1 - u * u)) - 0.2;
      if (i % 2 === 0 || open > 0.6) A.fine(x + lx * ca - ty * sa, y + lx * sa + ty * ca, open > 0.6 ? '#e8e2cc' : '#a89e88'); if (open > 0.9) A.fine(x + lx * ca - by * sa, y + lx * sa + by * ca, '#bcb296'); }
    if (open > 1.2) A.ell(x + 0.2, y + open * 0.35, 0.6 * s, 0.35 * s, 'rgba(120,50,70,0.8)', { flat: true, contour: false });   // a tongue
  };
  { const p = at(0.85, 0.4); A.ell(p[0] - 0.4, p[1] - 0.4, 3.4 + inh, 4.2 + inh, 'rgba(4,2,12,0.7)', { flat: true, contour: false, rot: -0.2 }); }   // the hollow of the hood
  M.forEach(([k, s, sz, off], i) => {
    const p = at(k, s), base = 0.1 + 0.6 * Math.max(0, Math.sin(wv * 0.9 + off));
    let open = base * sz; if (i === 0) open = Math.max(open, 0.9 + 0.4 * Math.sin(wv)); if (inh) open = sz * (0.6 + 1.5 * inh) * (i === 0 ? 1.2 : 1); if (exh) open = sz * (i === 0 ? 2.4 * exh : 0.6 + exh);
    mouth(p[0], p[1], sz * (i === 0 ? 1 + inh * 0.2 + exh * 0.3 : 1), open, (s - 0.2) * 0.25 - lean * 0.03);
  });
  // ---- the near arm
  const NA = arm(false);
  // ---- the in-breath: the air dragged in threads to every mouth
  if (wind) for (let i = 0; i < 7; i++) {
    const m = M[i % M.length], p = at(m[0], m[1]), ang = i * 0.9 + 0.4, r0 = 6 + inh * 5 + (i % 3), r1 = 2.2;
    for (let j = 0; j < 3; j++) { const u0 = r0 - j * (r0 - r1) / 3, u1 = u0 - (r0 - r1) / 5; A.hair(p[0] + Math.cos(ang) * u0, p[1] + Math.sin(ang) * u0 * 0.7, p[0] + Math.cos(ang) * u1, p[1] + Math.sin(ang) * u1 * 0.7, 'rgba(200,214,240,' + (0.25 + j * 0.15) + ')'); }
  }
  // ---- the out-breath: a cone of cold vapour from the hood's mouth
  if (exh > 0.2) {
    const m = at(M[0][0], M[0][1]), reach = [12, 16, 6][ph];
    for (let i = 0; i < 6; i++) { const a2 = (i - 2.5) * 0.16 + 0.1, L = reach * (0.6 + 0.4 * ((i * 7) % 5) / 4), x0 = m[0] + 2, y0 = m[1];
      for (let j = 0; j < 4; j++) { const u0 = L * j / 4, u1 = u0 + L / 5; A.hair(x0 + Math.cos(a2) * u0, y0 + Math.sin(a2) * u0 + Math.sin(j + i) * 0.4, x0 + Math.cos(a2) * u1, y0 + Math.sin(a2) * u1, 'rgba(206,222,246,' + (0.55 - j * 0.1) + ')'); } }
    A.speck(m[0] + 2, m[1] - 3, reach, 6, '#ffffff', 0, 1); for (let i = 0; i < 7; i++) A.fine(m[0] + 3 + ((i * 5) % 7) * reach / 7, m[1] + ((i * 3) % 5 - 2) * 0.9, 'rgba(230,240,255,0.7)');
  }
  // the cold that it is made of
  const core = at(0.55, 0.1);
  A.lamp(core[0], core[1], [150, 186, 255], 12 + 8 * inh + 6 * exh, 0.35 + 0.4 * inh + 0.3 * exh);
  A.rim([150, 170, 220], 0.4);
};
