// =================================================================== zn_beastsB: PYRE-SAINT, BELLWETHER, GRAVEBLOAT, painted at full density
// Three Act I creatures in the pixel painter (zj_px22). All face right, feet at y=0, units of MPX_K art pixels.
defMat('pyreFlesh', '#070405', '#1a0f0c', '#302019', '#523828', '#7a5a40');
defMat('pyreAsh', '#0a0a0c', '#1e1d20', '#353338', '#545158', '#7a767a');
defMat('pyreRobe', '#0c0306', '#2a080e', '#4a1016', '#701c1e', '#9a3228');
defMat('pyreWet', '#040406', '#0c0b10', '#17141b', '#241f29', '#383040');
defMat('pyrePost', '#050302', '#130b07', '#22150e', '#352216', '#4c3220');
defMat('pyreIron', '#060607', '#141518', '#24262b', '#3a3c42', '#5c5e64');
defMat('bellHide', '#0a0709', '#241b1f', '#433539', '#665454', '#90786e');
defMat('bellBronze', '#120a04', '#3a2410', '#6a4620', '#a07034', '#dcb068');
defMat('bellVerd', '#081410', '#163228', '#2a5446', '#4a806a', '#80b498');
defMat('bellSack', '#0a0806', '#1c1710', '#302819', '#4a3e28', '#66583a');
defMat('bloatSkin', '#0b070e', '#221a28', '#3c3244', '#6a5c6a', '#a2948c');
defMat('bloatBile', '#1a1a04', '#44480e', '#767e1c', '#a8b438', '#dce888');
const ZN_F = ['#4a0e04', '#a82a08', '#e2601a', '#ffa03a', '#ffdc80', '#fff6d8', '#ffffff'];
// one tongue of fire from (x,y) toward angle ang: three nested flat layers, hotter inside; hh 0..3 whitens it
function znTongue(A, x, y, ang, len, w, s, hh) {
  hh = Math.max(0, Math.min(3, Math.round(hh || 0)));
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const wob = Math.sin(s * 2.3) * 0.55 + Math.sin(s * 5.1 + 1) * 0.3, L = len * (0.8 + 0.2 * Math.sin(s * 3.3 + 0.7));
  const lay = (k, kl, col) => {
    const ww = w * k, ll = L * kl, P = (a, b) => [x + dx * a + nx * b, y + dy * a + ny * b];
    const b0 = P(0, ww), b1 = P(0, -ww), c0 = P(ll * 0.42, ww * 1.1 + wob * 0.5 * kl), c1 = P(ll * 0.5, -ww * 0.95 + wob * 0.7 * kl), tip = P(ll, wob * w * 1.1 * kl), bot = P(-ww * 0.7, 0);
    A.shape((c, X, Y) => { c.moveTo(X(b0[0]), Y(b0[1])); c.quadraticCurveTo(X(c0[0]), Y(c0[1]), X(tip[0]), Y(tip[1])); c.quadraticCurveTo(X(c1[0]), Y(c1[1]), X(b1[0]), Y(b1[1])); c.quadraticCurveTo(X(bot[0]), Y(bot[1]), X(b0[0]), Y(b0[1])); }, col, { flat: true, contour: false, edge: false });
  };
  lay(1, 1, ZN_F[1 + hh]); lay(0.62, 0.72, ZN_F[2 + hh]); lay(0.3, 0.42, ZN_F[3 + hh]);
}
// a small fire: n tongues along a base of width w, leaning by 'lean' radians, with a spark or two over it
function znFire(A, x, y, w, h, s, hh, lean, n, sparks) {
  n = n || Math.max(2, Math.round(w * 0.9));
  for (let i = 0; i < n; i++) {
    const u = n === 1 ? 0 : i / (n - 1) - 0.5, k = 0.55 + 0.45 * Math.abs(Math.sin(i * 2.7 + s * 1.3 + 0.4));
    znTongue(A, x + u * w, y, -1.5708 + (lean || 0) + Math.sin(s * 1.1 + i * 1.9) * 0.18 - u * 0.25, h * k * (1 - Math.abs(u) * 0.5), Math.max(0.7, w / n * 0.9), s + i * 1.7, hh);
  }
  if (!sparks) return;
  const sp = hash(Math.round(s * 10) + 3, Math.round(x * 3));
  A.fine(x + (sp - 0.5) * w * 1.4, y - h * (1.15 + sp * 0.4), ZN_F[3 + Math.min(3, hh || 0)]);
  A.fine(x - (sp - 0.3) * w, y - h * (1.4 + sp * 0.3), ZN_F[2 + Math.min(3, hh || 0)]);
}

// =================================================================== PYRE-SAINT
// A martyr whose faith is still burning: bound by the wrists to the charred stake it was burned on, the stake
// strapped to its back, an iron sunburst halo bolted to it. Its flesh has burned black and split open along the
// cracks, and the fire inside shows through them. A crimson robe slips off the burned chest, the hem smouldering.
// It walks straight at you, leaving burning footprints; before it bursts, its fire roars up and turns white.
// Doused (pal._doused), the fire is out: grey char, a few dim embers, a sodden robe, smoke.
MFRAME.pyre = [42, 50]; MPX_K.pyre = 1.2; MPX_WALK.pyre = 5;
MPX.pyre = function (A, pose, ph, pal) {
  const D = !!pal._doused, t = pal.tint;
  const fl = tintMat(D ? 'pyreAsh' : 'pyreFlesh', t, 0.3), robe = tintMat(D ? 'pyreWet' : 'pyreRobe', t, 0.35), post = D ? 'pyreAsh' : 'pyrePost', iron = 'pyreIron';
  const S = MAT[fl], R = MAT[robe], P = MAT[post];
  const walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk', idle = pose === 'idle';
  const G = walk ? gait(ph, 8) : null;
  let Y0 = 0, lean = 0, nod = 0, hh = 0, fk = 1, rear = 0, burst = 0, jaw = 1.2;
  const s = ph * 1.9 + (walk ? 0.5 : 0) + (atk ? 3 : 0);
  if (idle) { const b = Math.sin(ph / 4 * 6.2832); Y0 = b * 0.5; nod = b * 0.6; }
  if (walk) { Y0 = G.bob * 1.1 + 0.7; lean = 1.3; nod = Math.sin(G.a * 2 - 0.8) * 0.5; }
  if (wind) { const k = [0.35, 0.7, 1][ph]; rear = k; lean = -2.2 * k; hh = ph + 1; fk = 1 + 0.6 * k; nod = -2.6 * k; Y0 = -0.6 * k; jaw = 1.2 + 2 * k; }
  if (atk) { const k = [1, 0.6, 0.3][ph]; burst = k; lean = 2.4 * k; hh = [3, 2, 1][ph]; fk = 1 + 0.7 * k; nod = 1.2 * k; Y0 = 0.8 * k; jaw = 1.2 + 2.4 * k; }
  if (D) { hh = 0; fk = 0; }
  const crk = D ? '#2e1410' : hh >= 3 ? '#ffffff' : hh >= 2 ? '#fff0b0' : hh ? '#ffc060' : '#ff8a2a', crk2 = D ? '#160a08' : hh >= 2 ? '#ffa040' : '#b0300c';
  const hip = [-0.5 + lean * 0.3, -24 + Y0], sh = [1.5 + lean, -40 + Y0 - rear * 1.2];
  const head = [sh[0] + 3.6 - rear * 2, sh[1] - 5 + nod * 0.8];
  const trailA = walk ? -0.35 : wind ? -0.1 : atk ? -0.25 : -0.12;   // the fire leans back as it walks
  // legs: the near and far knee and ankle
  let nk, na, fk2, fa;
  if (walk) { const sw = G.swing; na = [1.5 + sw * 6, -2.5 - G.lift * 2.4]; nk = [3 + sw * 3.5 + G.lift * 1.4, -13.5 + Y0 * 0.4 - G.lift * 1.2]; fa = [-0.5 - sw * 6, -2.5 - G.liftF * 2.4]; fk2 = [1 - sw * 3.5 + G.liftF * 1.4, -13.5 + Y0 * 0.4 - G.liftF * 1.2]; }
  else if (atk) { na = [5, -2.5]; nk = [5.5, -13.5 + Y0 * 0.5]; fa = [-4, -2.5]; fk2 = [-1, -13.5 + Y0 * 0.5]; }
  else { na = [3, -2.5]; nk = [3, -13.5 + Y0 * 0.4]; fa = [-2, -2.5]; fk2 = [0, -13.5 + Y0 * 0.4]; }
  // ---- burning footprints left behind on the road
  if (walk && !D) for (let i = 0; i < 2; i++) {
    const age = ((ph + i * 4) % 8) / 8, fx = -5 - age * 16, k = 1 - age;
    A.ell(fx, -0.8, 2.4, 0.7, '#140a06', { flat: true, contour: false }); A.fine(fx - 1, -0.8, '#6a1a06'); A.fine(fx + 1.2, -0.6, '#a82a08');
    if (k > 0.3) znTongue(A, fx, -0.9, -1.5708 - 0.2, 4.5 * k, 1.1 * k + 0.3, s + i * 3.1, 0);
  }
  // ---- the corona of the burst, behind everything
  if (burst && !D) { const cx = sh[0] - 0.5, cy = sh[1] + 7; for (let i = 0; i < 13; i++) { const a = -3.1416 + i / 12 * 3.1416 * 1.15 - 0.1, L = (9 + 13 * burst) * (0.7 + 0.3 * Math.abs(Math.sin(i * 2.3))); znTongue(A, cx + Math.cos(a) * 5, cy + Math.sin(a) * 6, a, L, 2.4 + burst, s + i, hh - (i % 2)); } }
  // ---- the stake strapped to the back, charred and split, with its titulus
  const pb = [-6 + lean * 0.2, -11 + Y0], pt = [-4.2 + lean * 0.9, sh[1] - 15];
  const postX = y => pb[0] + (pt[0] - pb[0]) * (y - pb[1]) / (pt[1] - pb[1]);
  // the stake itself: thin, charred to charcoal, split at the top
  A.limb([pb, [(pb[0] + pt[0]) / 2 - 0.3, (pb[1] + pt[1]) / 2], pt], 1.45, 1.2, post, { sh: 0.8, hl: 0.5 });
  A.poly([[pt[0] - 1.3, pt[1] + 0.5], [pt[0] - 1, pt[1] - 2.2], [pt[0] - 0.3, pt[1] - 0.6], [pt[0] + 0.3, pt[1] - 2.8], [pt[0] + 0.8, pt[1] - 0.8], [pt[0] + 1.3, pt[1] - 1.5], [pt[0] + 1.3, pt[1] + 0.5]], post, { sh: 0.5, hl: 0.4 });
  for (let i = 0; i < 4; i++) { const y0 = pb[1] - 3 - i * 8, y1 = y0 - 5; A.hair(postX(y0) - 0.5 + (i % 2) * 0.8, y0, postX(y1) - 0.4 + (i % 2) * 0.8, y1, P[0]); }
  if (!D) for (let i = 0; i < 5; i++) { const y = pb[1] - 4 - i * 6.5; A.hair(postX(y) - 0.7, y, postX(y) + 0.5, y - 0.7, i % 2 ? crk2 : crk); }
  else { A.fine(postX(-30), -30, '#6a2a14'); }
  // the halo: an iron sunburst bolted to the stake behind the head, burning like a wheel of fire
  const hc = [sh[0] - 0.2, sh[1] - 7.5], hr = 5.4;
  A.limb([[postX(hc[1] + 1) + 0.5, hc[1] + 1], [hc[0] - hr + 0.5, hc[1] + 0.5]], 0.7, 0.6, iron, {});                 // the bracket
  for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832 + 0.13, l = hr + 2 + (i % 2) * 1.4; A.limb([[hc[0] + Math.cos(a) * hr, hc[1] + Math.sin(a) * hr], [hc[0] + Math.cos(a) * l, hc[1] + Math.sin(a) * l]], 0.55, 0.25, iron, { contour: false, flat: !D }); }
  const hoop = (r0, r1, mat, o) => A.shape((c, X, Y, U) => { c.arc(X(hc[0]), Y(hc[1]), r1 * U, 0, 6.2832, false); c.moveTo(X(hc[0] + r0), Y(hc[1])); c.arc(X(hc[0]), Y(hc[1]), r0 * U, 0, 6.2832, true); }, mat, o);
  if (D) hoop(hr - 0.9, hr + 0.9, iron, { sh: 0.6, hl: 0.5 });
  else {
    for (let i = 0; i < 10; i++) { const a = -3.1416 - 0.35 + i / 9 * (3.1416 + 0.7); znTongue(A, hc[0] + Math.cos(a) * hr, hc[1] + Math.sin(a) * hr, -1.5708 + (a + 1.5708) * 0.55 + trailA, (4 + (i % 3) * 1.8) * fk, 1.3, s + i * 1.3, hh - 1); }
    hoop(hr - 1.1, hr + 1.1, ZN_F[1 + Math.min(3, hh)], { flat: true, contour: false, edge: false });
    hoop(hr - 0.45, hr + 0.45, ZN_F[3 + Math.min(3, hh)], { flat: true, contour: false, edge: false });
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.2832 + 0.13; A.fine(hc[0] + Math.cos(a) * hr, hc[1] + Math.sin(a) * hr, ZN_F[5]); }
  }
  // ---- the far arm, bound back to the stake at the wrist
  const wr = [postX(hip[1] - 5) + 0.4, hip[1] - 5];
  const fsh = [sh[0] - 1, sh[1] + 1.5], fel = [sh[0] - 5 - rear, sh[1] + 8.5];
  A.limb([fsh, fel, wr], 1.9, 1.3, fl, { tone: -1.6, contour: false });
  // ---- the far leg, below the hem
  A.limb([fk2, [(fk2[0] + fa[0]) / 2, (fk2[1] + fa[1]) / 2], fa], 1.7, 1.15, fl, { tone: -1.6, contour: false });
  A.shape((c, X, Y) => { c.moveTo(X(fa[0] - 1.6), Y(Math.min(0, fa[1] + 2.5))); c.lineTo(X(fa[0] - 1.2), Y(fa[1] - 0.4)); c.quadraticCurveTo(X(fa[0] + 2.5), Y(fa[1] + 0.6), X(fa[0] + 4.6), Y(Math.min(0, fa[1] + 2.5))); }, fl, { tone: -1.6, contour: false });
  // ---- the robe: from the shoulders to the shins, the hem burned ragged
  const trail = walk ? -G.swing * 1.3 - 0.6 : wind ? 1.4 * rear : atk ? -2 * burst : 0;
  const hemY = -8, xF = Math.max(nk[0], fk2[0]) + 4.2 + trail * 0.2, xB = Math.min(nk[0], fk2[0]) - 6 + trail;
  const hem = []; for (let i = 0; i <= 9; i++) { const u = i / 9; hem.push([xF + (xB - xF) * u, hemY + (i % 2 ? 1.6 : 0) + (i % 3 === 0 ? -0.6 : 0) + u * 0.6]); }
  A.shape((c, X, Y) => {
    c.moveTo(X(sh[0] - 3.8), Y(sh[1] - 0.2));
    c.quadraticCurveTo(X(sh[0] + 0.5), Y(sh[1] - 2.8), X(sh[0] + 3.4), Y(sh[1] + 0.2));
    c.quadraticCurveTo(X(sh[0] + 5.6), Y(sh[1] + 6), X(hip[0] + 4.2), Y(hip[1] - 2.5));
    c.quadraticCurveTo(X(xF + 0.5), Y(hip[1] + 6), X(xF), Y(hemY));
    hem.forEach(p => c.lineTo(X(p[0]), Y(p[1])));
    c.quadraticCurveTo(X(hip[0] - 5.4), Y(hip[1] + 3), X(hip[0] - 4.5), Y(hip[1] - 4));
    c.quadraticCurveTo(X(sh[0] - 5.6), Y(sh[1] + 5), X(sh[0] - 3.8), Y(sh[1] - 0.2));
  }, robe, { sh: 1.2, hl: 0.8 });
  // folds of the skirt: shadowed troughs and a lit ridge, swinging with the stride
  for (let i = 0; i < 4; i++) {
    const u = 0.15 + i * 0.22, top = [hip[0] + 3 - u * 8, hip[1] + 1], bot = hem[Math.round(u * 9)], sw = walk ? G.swing * (i - 1.5) * 0.3 : 0;
    A.poly([top, [bot[0] - 0.9 + sw, bot[1] - 0.3], [bot[0] + 0.9 + sw, bot[1] - 0.3]], robe, { flat: true, tone: -1.4, contour: false, edge: false });
    A.hair(top[0] + 1, top[1] + 1.5, bot[0] + 1.7 + sw, bot[1] - 1, R[3]);
  }
  A.poly([[sh[0] - 2, sh[1] + 2], [hip[0] - 2, hip[1] - 3], [hip[0] - 3.3, hip[1] - 3]], robe, { flat: true, tone: -1.4, contour: false, edge: false });
  // the burning hem, or a sodden one
  hem.forEach((p, i) => { if (D) { if (i % 2) { A.fine(p[0], p[1] - 0.4, '#3a4452'); A.hair(p[0], p[1], p[0], p[1] + 0.8 + (i % 3) * 0.5, '#20242c'); } } else { A.fine(p[0], p[1] - 0.3, i % 2 ? ZN_F[2 + Math.min(2, hh)] : ZN_F[1 + Math.min(2, hh)]); A.fine(p[0] + 0.5, p[1] - 0.8, ZN_F[1]); } });
  if (!D) { znFire(A, hem[7][0], hem[7][1], 2.2, 4 * fk, s + 1, hh - 1, trailA, 2); znFire(A, hem[3][0], hem[3][1] + 0.2, 1.6, 3 * fk, s + 4, hh - 1, trailA, 1); }
  if (D) for (let i = 0; i < 5; i++) A.hair(sh[0] - 3 + i * 1.4, sh[1] + 3 + i, hip[0] - 3 + i * 1.6, hip[1] + 4 + (i % 2) * 3, '#262a34');   // wet streaks
  // the robe slipped off the burned chest: black flesh split open, the fire showing through the cracks
  A.shape((c, X, Y) => { c.moveTo(X(sh[0] + 1.6), Y(sh[1] - 0.2)); c.quadraticCurveTo(X(sh[0] + 5.8), Y(sh[1] + 3), X(sh[0] + 4.8), Y(sh[1] + 7.5)); c.lineTo(X(sh[0] + 1.8), Y(sh[1] + 8.2)); c.quadraticCurveTo(X(sh[0] + 0.3), Y(sh[1] + 3), X(sh[0] + 1.6), Y(sh[1] - 0.2)); }, fl, { sh: 1, hl: 0.7 });
  const chest = [sh[0] + 3.6, sh[1] + 3.5];
  A.hair(chest[0] - 0.6, chest[1] - 2.5, chest[0] + 0.4, chest[1] - 0.5, crk); A.hair(chest[0] + 0.4, chest[1] - 0.5, chest[0] - 0.4, chest[1] + 1.5, crk); A.hair(chest[0] - 0.4, chest[1] + 1.5, chest[0] + 0.6, chest[1] + 3.4, crk2);
  A.hair(chest[0] + 0.4, chest[1] - 0.5, chest[0] + 1.6, chest[1] + 0.2, crk2); A.hair(chest[0] - 0.4, chest[1] + 1.5, chest[0] - 1.8, chest[1] + 2.2, crk2);
  if (!D) A.fine(chest[0] - 0.1, chest[1] + 0.5, hh ? '#ffffff' : '#ffe0a0');
  A.limb([[sh[0] - 0.5, sh[1] - 0.8], [sh[0] + 1.6, sh[1] + 4], [sh[0] + 3.6, sh[1] + 8.4]], 1, 1.1, robe, { sh: 0.6, hl: 0.5 });   // the fallen neckline, rolled
  // the rope cincture and an iron chain wound from the stake round the body
  A.limb([[hip[0] - 4.5, hip[1] - 3.3], [hip[0], hip[1] - 3.9], [hip[0] + 4.3, hip[1] - 3.2]], 0.8, 0.8, 'rope', { sh: 0.5, hl: 0.4 });
  for (let i = 0; i < 7; i++) A.hair(hip[0] - 4 + i * 1.3, hip[1] - 4.1, hip[0] - 3.5 + i * 1.3, hip[1] - 2.8, MAT.rope[1]);
  { const k0 = [hip[0] + 3.4, hip[1] - 3], sw = walk ? -G.swing : 0; A.limb([k0, [k0[0] + 0.4 + sw * 0.4, k0[1] + 4], [k0[0] - 0.2 + sw, k0[1] + 7.5]], 0.45, 0.4, 'rope', { sh: 0.4, hl: 0.3 }); A.ell(k0[0] - 0.2 + sw, k0[1] + 8, 0.7, 0.6, 'rope', {}); }
  // ---- the near leg: a burned shin and a bare foot, the soles cracked with fire
  A.limb([nk, [(nk[0] + na[0]) / 2 + 0.3, (nk[1] + na[1]) / 2], na], 1.8, 1.2, fl, { sh: 0.9, hl: 0.6 });
  A.shape((c, X, Y) => { c.moveTo(X(na[0] - 1.7), Y(Math.min(0, na[1] + 2.5))); c.lineTo(X(na[0] - 1.3), Y(na[1] - 0.5)); c.quadraticCurveTo(X(na[0] + 2.6), Y(na[1] + 0.5), X(na[0] + 4.8), Y(Math.min(0, na[1] + 2.5))); }, fl, { sh: 0.6, hl: 0.5 });
  A.hair(nk[0] + 0.4, nk[1] + 2, na[0] + 0.2, na[1] - 1.5, crk2); A.fine(na[0] + 0.6, na[1] - 3, crk);
  for (let i = 0; i < 3; i++) A.fine(na[0] + 2.8 + i * 0.7, Math.min(0, na[1] + 2.5) - 0.4, S[0]);
  if (!D) A.hair(na[0] - 1, Math.min(0, na[1] + 2.5) - 0.1, na[0] + 3.5, Math.min(0, na[1] + 2.5) - 0.1, walk && G.lift > 0.2 ? crk : crk2);
  // ---- the near arm, pulled back and chained to the stake
  const nsh = [sh[0] + 0.6, sh[1] + 1.8], nel = [sh[0] - 3.6 - rear, sh[1] + 9.5];
  A.limb([nsh, [(nsh[0] + nel[0]) / 2, (nsh[1] + nel[1]) / 2 - 0.3], nel], 2.1, 1.7, fl, { sh: 0.9, hl: 0.7 });
  A.limb([nel, [(nel[0] + wr[0]) / 2 + 0.3, (nel[1] + wr[1]) / 2 + 0.4], [wr[0] + 1, wr[1]]], 1.7, 1.3, fl, { sh: 0.8, hl: 0.6 });
  A.hair(nsh[0] - 1.2, nsh[1] - 0.6, nel[0] - 1.2, nel[1] - 0.8, S[4]); A.fine(nsh[0] - 0.2, nsh[1] + 3, crk2);
  A.fine(nel[0] - 0.9, nel[1] + 0.2, crk2);
  A.ell(wr[0] + 1.4, wr[1] + 0.8, 1.4, 1.2, fl, { sh: 0.5, hl: 0.4 });                      // the fist, clenched on the stake
  for (let i = 0; i < 3; i++) A.fine(wr[0] + 2.2, wr[1] + 0.2 + i * 0.6, S[0]);
  A.poly([[wr[0] - 1.8, wr[1] - 1.8], [wr[0] + 1.2, wr[1] - 1.4], [wr[0] + 1, wr[1] + 0.8], [wr[0] - 1.8, wr[1] + 0.8]], iron, { sh: 0.4, hl: 0.4 });   // the manacle
  A.stud(wr[0] - 0.8, wr[1] - 0.8, iron);
  for (let i = 0; i < 3; i++) A.ell(wr[0] - 0.6 + i * 0.2, wr[1] + 1.8 + i * 1.3, i % 2 ? 0.45 : 0.7, i % 2 ? 0.7 : 0.5, iron, { sh: 0.3, hl: 0.3 });
  // ---- the head, bowed in prayer: the skin burned onto the skull, the eye a white coal, the mouth open on the fire
  const hx = head[0], hy = head[1], hs = 1.35, Hp = (x, y) => [hx + x * hs, hy + y * hs];
  if (!D) znFire(A, hx - 0.8, hy - 3.4 * hs, 6.5, 11 * fk, s, hh, trailA * 0.8 - rear * 0.25, 4, true);   // the wreath of fire, behind the skull
  A.limb([[sh[0] + 1.4, sh[1] + 0.8], Hp(-1, 1.6)], 1.8, 1.6, fl, { sh: 0.8, hl: 0.5 });
  A.shape((c, X, Y) => { const m = (x, y) => { const q = Hp(x, y); return [X(q[0]), Y(q[1])]; }; let q = m(-3.2, 0); c.moveTo(q[0], q[1]); let a = m(-3, -4.2), b = m(0.6, -4.2); c.quadraticCurveTo(a[0], a[1], b[0], b[1]); a = m(3.8, -3.8); b = m(3.7, -0.8); c.quadraticCurveTo(a[0], a[1], b[0], b[1]);
    for (const [x, y] of [[4.3, 0.5], [3.4, 1.1], [3.3, 1.5 + jaw * 0.6], [0.4, 2.5 + jaw * 0.4]]) { q = m(x, y); c.lineTo(q[0], q[1]); } a = m(-3, 2.4); b = m(-3.2, 0); c.quadraticCurveTo(a[0], a[1], b[0], b[1]); }, fl, { sh: 1.1, hl: 0.8 });
  { const a = Hp(0.6, -1.9), b = Hp(3.5, -1.6); A.hair(a[0], a[1], b[0], b[1], S[0]); }                                  // the brow
  { const e = Hp(2.1, -0.8); A.ell(e[0], e[1], 1.3, 0.85, D ? '#050405' : '#1a0602', { flat: true, contour: false });
    if (!D) { A.hair(e[0] - 0.9, e[1], e[0] + 0.8, e[1] + 0.1, hh ? '#ffffff' : ZN_F[4]); A.fine(e[0] + 0.1, e[1], '#ffffff'); A.hair(e[0] + 0.4, e[1] + 0.8, e[0] + 0.6, e[1] + 2.8, crk2); A.fine(e[0] + 0.6, e[1] + 3.2, crk); }
    else A.fine(e[0], e[1], '#4a1a10'); }
  A.shape((c, X, Y) => { const pts = [Hp(1.2, 1.3), Hp(3.1, 1.1), Hp(2.9, 1.2 + jaw), Hp(1.3, 1.6 + jaw * 0.8)]; pts.forEach((q, k) => k ? c.lineTo(X(q[0]), Y(q[1])) : c.moveTo(X(q[0]), Y(q[1]))); }, D ? '#060405' : ZN_F[1 + Math.min(3, hh)], { flat: true, contour: false });
  { const q = Hp(2.2, 1.3); A.fine(q[0], q[1], MAT.boneOld[2]); A.fine(q[0] - 0.6, q[1], MAT.boneOld[1]); if (!D) { const r = Hp(2.2, 1.6 + jaw * 0.6); A.fine(r[0], r[1], ZN_F[4]); } }
  { const a = Hp(-2.4, -2.8), b = Hp(-0.9, -0.6), c = Hp(-1.8, 1.4), d = Hp(0.4, 0); A.hair(a[0], a[1], b[0], b[1], crk2); A.hair(b[0], b[1], c[0], c[1], crk2); A.fine(b[0], b[1], crk); }   // the skull split, the fire inside
  { const a = Hp(-3, 0.3), b = Hp(-1.2, 2); A.hair(a[0], a[1], b[0], b[1], S[3]); }                                       // the ear's lit edge
  for (let i = 0; i < 6; i++) { const a = -2.9 + i * 0.42, p0 = Hp(0.3 + Math.cos(a) * 3.3, -1.4 + Math.sin(a) * 3.2), p1 = Hp(0.3 + Math.cos(a) * 4.4, -1.4 + Math.sin(a) * 4.3); A.hair(p0[0], p0[1], p1[0], p1[1], '#0c0806'); }   // the crown of thorns
  { const a = Hp(-3.1, -2), b = Hp(3.4, -2.4); A.hair(a[0], a[1], b[0], b[1], '#1a100a'); }
  // ---- the fire: a wreath on the head, a torch on the stake, flames licking the shoulders
  if (!D) {
    znFire(A, pt[0] + 0.2, pt[1] - 1, 3, 8 * fk, s + 2, hh, trailA, 3, true);
    znFire(A, sh[0] - 2.8, sh[1] - 0.2, 3, 5 * fk, s + 5, hh - 1, trailA, 2);
    A.lamp(hx - 1, hy - 7, [255, 170, 80], 26 * (0.8 + fk * 0.3), 0.6 + hh * 0.12);
    A.lamp(chest[0], chest[1] + 1, [255, 110, 40], 9, 0.6 + hh * 0.15);
    A.lamp(pt[0], pt[1] - 4, [255, 150, 60], 14, 0.4);
  } else {
    // smoke from the drowned fire, and the last embers
    for (let j = 0; j < 2; j++) { const b0 = j === 0 ? [hx - 0.5, hy - 4.5] : [pt[0], pt[1] - 2]; for (let i = 0; i < 4; i++) { const u = i / 3, dr = ((ph + i + j * 2) % 4) * 0.6, x = b0[0] - u * 3.5 + Math.sin(ph * 1.57 + i * 1.9 + j * 2) * (0.6 + u * 1.2), y = b0[1] - 2.5 - i * 3.6 - dr, r = 1.9 - u * 0.7; A.ell(x, y, r * 1.2, r, i % 2 ? '#34333a' : '#2c2b31', { flat: true, contour: false }); A.ell(x - r * 0.3, y - r * 0.3, r * 0.6, r * 0.45, '#46454d', { flat: true, contour: false }); } }
    A.fine(chest[0], chest[1] + 0.5, ph % 2 ? '#8a2a10' : '#5a1a0c'); A.fine(hx - 0.8, hy - 0.5, '#6a2010'); A.fine(postX(-34), -34, '#7a2a10');
    A.lamp(chest[0], chest[1] + 0.5, [200, 70, 30], 4, 0.5);
  }
  A.rim([110, 120, 150], 0.3);
};

// =================================================================== BELLWETHER
// A brute of the belfry that wears the cathedral bell as its skull: the neck runs up into the bronze and the
// clapper hangs in the dark mouth like a tongue with a skull on its end. It knuckle-walks on huge bound fists,
// hunched under torn penitent sackcloth, the bell-rope and its striped sally hanging off its back. It tolls twice,
// rearing up, then runs at you head-first.
MFRAME.bell = [62, 56]; MPX_K.bell = 1.45; MPX_WALK.bell = 4;
MPX.bell = function (A, pose, ph, pal) {
  const t = pal.tint, hide = tintMat('bellHide', t, 0.45), sack = tintMat('bellSack', t, 0.3), bz = tintMat('bellBronze', t, 0.25), verd = tintMat('bellVerd', t, 0.25);
  const H = MAT[hide], B = MAT[bz], V = MAT[verd], SK = MAT[sack];
  const walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk', idle = pose === 'idle';
  const G = walk ? gait(ph, 8) : null;
  let Y0 = 0, rear = 0, lunge = 0, th = -0.5, clap = 0, tolls = 0, roll = 0;
  if (idle) { const b = Math.sin(ph / 4 * 6.2832); Y0 = b * 0.7; th = -0.5 + b * 0.05; clap = -b * 0.6; }
  if (walk) { Y0 = G.bob * 1.6 + 1; roll = G.swing; th = -0.5 + Math.sin(G.a - 0.8) * 0.1; clap = -Math.sin(G.a - 1.4) * 1.4; }
  if (wind) { rear = [0.35, 0.65, 1][ph]; th = [-1.15, -0.25, -1.95][ph]; clap = [-2.6, 3, -3.4][ph]; tolls = [0, 1, 2][ph]; }
  if (atk) { lunge = [1, 1.1, 0.45][ph]; th = -0.5 - 0.95 * Math.min(1, lunge); clap = [1.5, 3.4, 0.5][ph]; tolls = ph === 1 ? 1 : 0; Y0 = [0.5, 1, 0.5][ph]; }
  // the body's joints
  const hip = [-11 + lunge * 3, -21 + Y0 * 0.5 + lunge * 0.5 - rear * 1];
  const shd = [4 - rear * 4 + lunge * 5 + roll * 0.6, -33 + Y0 - rear * 10 + lunge * 3.5];
  const hump = [(hip[0] + shd[0]) / 2 - 1.5 - rear * 2.5, Math.min(hip[1], shd[1]) - 8 + rear * 3 + lunge * 1.5];
  const N = [shd[0] + 6 - rear * 1.5 + lunge * 1.5, shd[1] - 2 - rear * 1 + lunge * 0.5];
  const bs = 1.15, ct = Math.cos(th), st = Math.sin(th), RB = (u, v) => [N[0] + (u * ct - v * st) * bs, N[1] + (u * st + v * ct) * bs];
  // limbs: fists and feet
  let fN, fF, aN, aF;
  if (walk) { const s = G.swing; fN = [15 + s * 6.5, -2.8 - G.lift * 3.2]; fF = [9 - s * 6.5, -2.8 - G.liftF * 3.2]; aN = [-9 - s * 5, -2.5 - G.liftF * 2.2]; aF = [-13 + s * 5, -2.5 - G.lift * 2.2]; }
  else if (wind) { fN = [shd[0] + 12 - rear * 2, shd[1] + 22 - rear * 20]; fF = [shd[0] + 8 - rear * 1, shd[1] + 24 - rear * 22]; aN = [-8, -2.5]; aF = [-14, -2.5]; }
  else if (atk) { fN = [14 + lunge * 4, -3.5 - (ph === 0 ? 4 : 0)]; fF = [3 - lunge * 3, -2.8]; aN = [-11 - lunge * 6, -2.5]; aF = [-6 + lunge * 1, -4.5]; }
  else { fN = [15, -2.8]; fF = [9, -2.8]; aN = [-9, -2.5]; aF = [-13, -2.5]; }
  const shN = [shd[0] + 0.5, shd[1] + 3], shF = [shd[0] - 2, shd[1] + 2];
  const joint = (a, b, L, back) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, h = Math.sqrt(Math.max(2.5, L * L - l * l / 4)); return [(a[0] + b[0]) / 2 + (-dy / l) * h * back, (a[1] + b[1]) / 2 + (dx / l) * h * back]; };
  const AL = atk ? 13 : 15.5, eN = joint(shN, fN, AL, 1), eF = joint(shF, fF, AL, 1);
  const hipN = [hip[0] + 1.5, hip[1] + 1], hipF = [hip[0] - 1, hip[1]];
  const kN = joint(hipN, aN, 10, -1), kF = joint(hipF, aF, 10, -1);
  const FAR = { tone: -1.6, contour: false };
  const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  // a huge arm: a slab of deltoid, a bicep, a forearm like a gorilla's, a rope-bound fist that walks on its knuckles
  const arm = (s0, e, f, far) => {
    const o = far ? FAR : { sh: 1.5, hl: 0.9 }, [ux, uy] = unit(e, f), [vx, vy] = unit(s0, e);
    A.limb([s0, [(s0[0] + e[0]) / 2, (s0[1] + e[1]) / 2], e], 4.6, 3.2, hide, o);
    A.limb([e, [e[0] + ux * 5, e[1] + uy * 5], [f[0] - ux * 1.5, f[1] - uy * 1.5]], 3.3, 3.7, hide, o);
    A.ell(e[0] + ux * 5 + uy * 0.8, e[1] + uy * 5 - ux * 0.8, 3.6, 2.9, hide, { ...o, contour: false, rot: Math.atan2(uy, ux) });   // the swell of the forearm
    if (!far) {
      A.ell(s0[0] + vx * 7 + vy * 1.2, s0[1] + vy * 7 - vx * 1.2, 3.3, 2.4, hide, { sh: 1, hl: 0.8, rot: Math.atan2(vy, vx), contour: false });   // bicep
      A.hair(s0[0] + vx * 3 + vy * 3.3, s0[1] + vy * 3 - vx * 3.3, e[0] - vx * 2 + vy * 2.6, e[1] - vy * 2 - vx * 2.6, H[4]);
      A.hair(e[0] + ux * 2 - uy * 2.4, e[1] + uy * 2 + ux * 2.4, f[0] - ux * 4 - uy * 2.6, f[1] - uy * 4 + ux * 2.6, H[0]);   // the forearm's underside
      A.fine(e[0] - vx * 0.5 - vy * 1.5, e[1], H[0]);
      const sc = [e[0] + ux * 3, e[1] + uy * 3]; A.hair(sc[0] - 1.6, sc[1] - 1, sc[0] + 1.2, sc[1] + 1.4, '#6a3432'); A.hair(sc[0] - 1.2, sc[1] - 1.6, sc[0] + 1.6, sc[1] + 0.8, '#b0706a');   // an old brand
    }
    // rope wound round the wrist
    for (let i = 0; i < 3; i++) { const k = i * 1.2 + 1.5, p = [f[0] - ux * k, f[1] - uy * k]; A.limb([[p[0] + uy * 3.7, p[1] - ux * 3.7], [p[0] - uy * 3.7 + ux * 0.6, p[1] + ux * 3.7 + uy * 0.6]], 0.55, 0.55, far ? tintMat('rope', t, 0.2) : 'rope', far ? FAR : { sh: 0.4, hl: 0.3 }); }
    A.ell(f[0] + ux * 1.2, f[1] + uy * 1.2, 3.6, 2.8, hide, { ...o, rot: Math.atan2(uy, ux) * 0.3 });
    if (!far) { for (let i = 0; i < 4; i++) A.ell(f[0] + ux * 1.2 + 2.8 - i * 0.3, f[1] + uy * 1.2 - 1.8 + i * 1.2, 0.85, 0.6, 'boneOld', { sh: 0.3, hl: 0.3 }); }
  };
  const leg = (h, k, a, far) => {
    const o = far ? FAR : { sh: 1.2, hl: 0.8 };
    A.limb([h, [(h[0] + k[0]) / 2 + 0.5, (h[1] + k[1]) / 2], k], 4.6, 3.2, hide, o);
    A.limb([k, [(k[0] + a[0]) / 2, (k[1] + a[1]) / 2], a], 3, 2.1, hide, o);
    A.shape((c, X, Y) => { c.moveTo(X(a[0] - 2.5), Y(Math.min(0, a[1] + 2.6))); c.lineTo(X(a[0] - 2), Y(a[1] - 0.6)); c.quadraticCurveTo(X(a[0] + 3), Y(a[1] + 0.2), X(a[0] + 5.5), Y(Math.min(0, a[1] + 2.6))); }, hide, o);
    if (!far) { A.hair(k[0] - 2.2, k[1] - 3, k[0] - 0.4, k[1] - 0.6, H[4]); A.fine(k[0] + 1.8, k[1], H[0]); for (let i = 0; i < 3; i++) A.fine(a[0] + 3.4 + i, Math.min(0, a[1] + 2.6) - 0.4, '#140c0a'); }
  };
  // ---- far limbs
  leg(hipF, kF, aF, true);
  arm(shF, eF, fF, true);
  // ---- the bell-rope with its sally, trailing off the back
  { const r0 = [hump[0] + 3, hump[1] - 0.5], sw = walk ? -G.swing * 1.5 : wind ? rear * 2 : atk ? -lunge * 4 : 0, r1 = [hump[0] - 5, hump[1] + 1], r2 = [hump[0] - 10 + sw, hump[1] + 10], r3 = [hump[0] - 12 + sw * 1.6, hump[1] + 19];
    A.limb([r0, r1, r2, r3], 0.55, 0.5, 'rope', { sh: 0.4, hl: 0.3 });
    for (let i = 0; i < 5; i++) { const y = r3[1] - 1 + i * 1.3, x = r3[0] + (i * 0.2) + sw * 0.1 * i; A.limb([[x - 0.2, y], [x + 0.2, y + 1.2]], 1.25, 1.25, i % 2 ? 'clothBone' : 'clothRed', { sh: 0.4, hl: 0.4 }); }   // the sally: red and white wool
    A.limb([[r3[0] + 1, r3[1] + 6.2], [r3[0] + 1.4 + sw * 0.4, r3[1] + 9]], 0.45, 0.4, 'rope', {}); }
  // ---- the body: a hunched mass of back, the belly slung under it
  A.shape((c, X, Y) => {
    c.moveTo(X(hip[0] - 5), Y(hip[1] + 3));
    c.quadraticCurveTo(X(hip[0] - 7), Y(hump[1] + 3), X(hump[0]), Y(hump[1]));
    c.quadraticCurveTo(X(shd[0] + 2), Y(hump[1] - 1), X(shd[0] + 6), Y(shd[1]));
    c.quadraticCurveTo(X(shd[0] + 6), Y(shd[1] + 9), X(shd[0] + 1), Y(shd[1] + 12));
    c.quadraticCurveTo(X((shd[0] + hip[0]) / 2 + 1), Y(hip[1] + 4), X(hip[0] + 2), Y(hip[1] + 4));
    c.quadraticCurveTo(X(hip[0] - 1), Y(hip[1] + 6), X(hip[0] - 5), Y(hip[1] + 3));
  }, hide, { sh: 1.8, hl: 1 });
  for (let i = 0; i < 7; i++) { const u = i / 6, x = hip[0] - 4.5 + (hump[0] - hip[0] + 4.5) * u * 1.05, y = hip[1] - 1 + (hump[1] - hip[1] + 1) * Math.sin(u * 1.5708); A.ell(x, y + 0.4, 0.9, 0.7, hide, { sh: 0.3, hl: 0.3, lit: 0.08 }); }   // the spine
  A.poly([[shd[0] + 1, shd[1] + 11], [hip[0] + 2, hip[1] + 3.5], [hip[0] + 6, hip[1] + 1]], hide, { flat: true, tone: -1.4, contour: false, edge: false });   // the belly in shadow
  A.hair(hip[0] + 4, hip[1] - 1, shd[0] - 1, shd[1] + 9, H[1]); A.hair(hip[0] + 5, hip[1] + 1, shd[0], shd[1] + 10.5, H[1]);   // ribs over the flank
  A.speck(hip[0] - 5, hump[1], 16, 16, H[1], 30, 41); A.speck(hip[0] - 5, hump[1], 16, 16, '#4a2a2c', 12, 43);
  // ---- the torn penitent sackcloth thrown over the hump, its strips trailing, nails driven through it
  const tr = walk ? -G.swing * 1.4 - 0.8 : wind ? rear * 2.5 : atk ? -2.5 * lunge : 0;
  A.shape((c, X, Y) => {
    c.moveTo(X(shd[0] + 2), Y(shd[1] - 1.5));
    c.quadraticCurveTo(X(hump[0] + 1), Y(hump[1] - 2.6), X(hump[0] - 5), Y(hump[1] + 0.2));
    c.quadraticCurveTo(X(hip[0] - 5), Y(hip[1] - 6), X(hip[0] - 6 + tr), Y(hip[1] + 1));
    c.lineTo(X(hip[0] - 4 + tr * 0.6), Y(hip[1] - 2)); c.lineTo(X(hip[0] - 3.5 + tr), Y(hip[1] + 4)); c.lineTo(X(hip[0] - 1.5 + tr * 0.5), Y(hip[1] - 3));
    c.lineTo(X(hip[0] + 0.5 + tr * 0.8), Y(hip[1] + 2)); c.lineTo(X(hip[0] + 1.5), Y(hip[1] - 5));
    c.quadraticCurveTo(X(hump[0] + 1), Y(hump[1] + 8), X(shd[0] - 1), Y(shd[1] + 5)); c.lineTo(X(shd[0] + 1.5 + tr * 0.2), Y(shd[1] + 8)); c.lineTo(X(shd[0] + 2.5), Y(shd[1] + 3));
  }, sack, { sh: 1.2, hl: 0.9 });
  for (let i = 0; i < 5; i++) { const u = i / 4, a = [hump[0] - 5 + u * 8, hump[1] + 0.5 - Math.sin(u * 3.1) * 1.5]; A.hair(a[0], a[1] + 0.8, a[0] - 2.5 + tr * 0.4 - u, a[1] + 8, SK[1]); A.hair(a[0] + 0.6, a[1] + 0.8, a[0] - 1.8 + tr * 0.4 - u, a[1] + 6, SK[3]); }
  A.speck(hip[0] - 6, hump[1] - 2, 18, 14, SK[0], 34, 47); A.speck(hip[0] - 6, hump[1] - 2, 18, 14, SK[4], 12, 49);
  A.ell(hump[0] - 1, hump[1] + 3.4, 1, 0.7, H[2], { flat: true, contour: false }); A.ell(hump[0] + 3, hump[1] + 2.4, 0.7, 0.6, H[1], { flat: true, contour: false });
  for (let i = 0; i < 3; i++) { const x = hump[0] - 3 + i * 3.2, y = hump[1] + 1.4 + Math.abs(i - 1) * 1.2; A.limb([[x, y], [x - 1 + i * 0.3, y - 2.8]], 0.5, 0.3, 'rust', { sh: 0.3, hl: 0.3 }); A.fine(x + 0.4, y + 0.6, '#6a1414'); A.hair(x + 0.3, y + 1, x + 0.2, y + 2.6, '#4a0a0c'); }
  // ---- the bell-chain wound over the shoulder and round the chest
  for (let i = 0; i < 12; i++) { const u = i / 11, p0 = [shd[0] + 3, shd[1] - 1], p1 = [hip[0] + 3, hip[1] + 2.5], x = p0[0] + (p1[0] - p0[0]) * u - Math.sin(u * 3.1416) * 3, y = p0[1] + (p1[1] - p0[1]) * u + Math.sin(u * 3.1416) * 2.5; A.ell(x, y, i % 2 ? 1 : 0.65, i % 2 ? 0.65 : 1, 'steel', { sh: 0.35, hl: 0.3 }); }
  // ---- the near leg and a loincloth
  A.poly([[hip[0] - 3, hip[1] - 1], [hip[0] + 4, hip[1] - 0.5], [hip[0] + 4.4 + tr * 0.3, hip[1] + 5], [hip[0] + 1.5 + tr * 0.5, hip[1] + 7.5], [hip[0] - 1, hip[1] + 4], [hip[0] - 3.5 + tr * 0.4, hip[1] + 6]], sack, { sh: 0.8, hl: 0.5, tone: -0.5 });
  leg(hipN, kN, aN, false);
  // ---- the bull neck running up into the bell
  A.limb([[shd[0] - 1, shd[1] + 1], [shd[0] + 3, shd[1] - 1], RB(0, 1.5)], 5, 4, hide, { sh: 1.4, hl: 0.9 });
  A.hair(shd[0] + 1, shd[1] - 3, RB(-2, 1)[0], RB(-2, 1)[1], H[4]);
  // ---- the near arm (in front of the bell when it rears)
  if (!wind) arm(shN, eN, fN, false);
  // ---- the bell: bronze gone green
  const wv = v => v < 1 ? 4.3 : v < 5 ? 4.3 + (v - 1) * 0.2 : v < 12 ? 5.1 + (v - 5) * 0.16 : v < 15 ? 6.2 + (v - 12) * 0.6 : 8 + (v - 15) * 0.7;
  const prof = []; for (const v of [2, 5, 8, 11, 13, 14.5, 16, 17.2]) prof.push([wv(v), v]);
  A.shape((c, X, Y) => {
    let p = RB(-4.3, 1.5); c.moveTo(X(p[0]), Y(p[1]));
    const cp = RB(0, -3.2), e = RB(4.3, 1.5); c.quadraticCurveTo(X(cp[0]), Y(cp[1]), X(e[0]), Y(e[1]));
    prof.forEach(([w, v]) => { const q = RB(w, v); c.lineTo(X(q[0]), Y(q[1])); });
    const m = RB(0, 18.4), l = RB(-wv(17.2), 17.2); c.quadraticCurveTo(X(m[0]), Y(m[1]), X(l[0]), Y(l[1]));
    prof.slice().reverse().forEach(([w, v]) => { const q = RB(-w, v); c.lineTo(X(q[0]), Y(q[1])); });
    c.closePath();
  }, bz, { metal: true, sh: 1.8, hl: 1.2 });
  // a broad flat shadow down the far flank of the bell, a lit strip down the near one
  A.shape((c, X, Y) => { const pts = [RB(1.5, 1), RB(4.4, 1.6), ...prof.map(([w, v]) => RB(w - 0.2, v)), RB(wv(17.2) * 0.45, 17.6), RB(2.6, 11), RB(1.6, 5)]; pts.forEach((q, k) => k ? c.lineTo(X(q[0]), Y(q[1])) : c.moveTo(X(q[0]), Y(q[1]))); }, bz, { flat: true, tone: -1.6, contour: false, edge: false });
  A.shape((c, X, Y) => { const pts = [RB(-3.4, 1.4), RB(-2.2, 1.2), RB(-3, 10), RB(-5.4, 15.5), RB(-7, 16), RB(-4.4, 10)]; pts.forEach((q, k) => k ? c.lineTo(X(q[0]), Y(q[1])) : c.moveTo(X(q[0]), Y(q[1]))); }, bz, { flat: true, lit: 0.3, contour: false, edge: false });
  // cast rings, a band of letters, the sound-bow
  const ring = (v, col, col2) => { const a = RB(-wv(v) + 0.3, v), b = RB(wv(v) - 0.3, v); A.hair(a[0], a[1], b[0], b[1], col); if (col2) { const a2 = RB(-wv(v + 0.5) + 0.3, v + 0.5), b2 = RB(wv(v + 0.5) - 0.3, v + 0.5); A.hair(a2[0], a2[1], b2[0], b2[1], col2); } };
  ring(3.2, B[3], B[0]); ring(9.8, B[3], B[0]); ring(12.8, B[3], B[1]); ring(15.6, B[4], B[0]);
  for (let i = 0; i < 8; i++) { const u = -wv(11.3) + 1.2 + i * (wv(11.3) * 2 - 2.4) / 7; if (i === 5) continue; const p = RB(u, 10.7), q = RB(u, 11.9); A.hair(p[0], p[1], q[0], q[1], B[0]); if (i % 2) { const r = RB(u + 0.5, 10.7); A.fine(r[0], r[1], B[0]); } else { const r = RB(u + 0.5, 11.9); A.fine(r[0], r[1], B[0]); } }   // letters in the band
  // verdigris weeping down from every ring
  for (let i = 0; i < 8; i++) { const u = -5 + i * 1.5 + (i % 2) * 0.4, v0 = i % 3 === 0 ? 3.7 : i % 3 === 1 ? 13.3 : 10.2, v1 = v0 + 2 + (i % 3) * 1.4; const a = RB(u * (wv(v0) / 5.8), v0), b = RB(u * (wv(v1) / 5.8), v1); A.hair(a[0], a[1], b[0], b[1], i % 2 ? V[1] : V[2]); A.fine(b[0], b[1], V[3]); }
  { const c0 = RB(-1, 6); A.speck(c0[0] - 6, c0[1] - 6, 12, 14, V[1], 22, 53); A.speck(c0[0] - 6, c0[1] - 6, 12, 14, V[3], 8, 57); }
  // a crack up from the lip, a dull light inside it
  { const cp = [[3.8, 17.2], [3.3, 15], [4.2, 13.4], [3.5, 11.5], [4, 9.6]]; for (let i = 0; i < cp.length - 1; i++) { const a = RB(...cp[i]), b = RB(...cp[i + 1]); A.hair(a[0], a[1], b[0], b[1], B[0]); } const g = RB(3.6, 14.4); A.fine(g[0], g[1], '#ffb040'); }
  // rope wound round the crown where the flesh goes into the bronze, iron straps and rivets
  for (let i = 0; i < 3; i++) { const v = -0.4 + i * 1, a = RB(-4.7, v), b = RB(4.7, v); A.limb([a, b], 0.6, 0.6, 'rope', { sh: 0.3, hl: 0.3 }); }
  for (const u of [-2.6, 2.6]) { const a = RB(u, -0.6), b = RB(u * 1.25, 6); A.limb([a, b], 0.6, 0.6, 'steelDark', { sh: 0.3, hl: 0.3 }); A.stud(b[0] - 0.3, b[1] - 0.3, 'steel'); }
  // the mouth: the dark inside, the clapper hanging out of it with a skull for its ball
  const mc = RB(0, 17.4);
  A.ell(mc[0], mc[1], (wv(17.2) - 0.6) * bs, 2.2, '#070406', { flat: true, contour: false, rot: th });
  { const lp0 = RB(-wv(17.2), 17.2), lp1 = RB(wv(17.2), 17.2); A.hair(lp0[0], lp0[1], lp1[0], lp1[1], B[4]); }
  const k0 = RB(0, 13), k1 = RB(clap, 20.2);
  A.limb([k0, k1], 0.8, 0.6, 'steelDark', { contour: false });
  { const sx = k1[0], sy = k1[1]; A.ell(sx, sy + 1, 2.5, 2.3, 'bone', { sh: 0.7, hl: 0.5 }); A.shape((c, X, Y) => { c.moveTo(X(sx - 0.5), Y(sy + 2)); c.lineTo(X(sx + 3), Y(sy + 2)); c.lineTo(X(sx + 2.6), Y(sy + 4.4)); c.lineTo(X(sx + 0.2), Y(sy + 4.2)); }, 'bone', { sh: 0.5, hl: 0.3 });
    A.ell(sx + 1.1, sy + 1, 0.8, 0.9, '#0a0406', { flat: true, contour: false }); A.fine(sx + 1.2, sy + 1, '#ffb040'); A.fine(sx + 1.4, sy + 0.8, '#fff0c0'); A.fine(sx + 2.6, sy + 2.2, '#0a0406');
    for (let i = 0; i < 3; i++) A.fine(sx + 0.8 + i * 0.6, sy + 3.4, MAT.bone[1]);
    A.lamp(sx + 1, sy + 1, [255, 160, 60], 8, 0.55); }
  if (wind) arm(shN, eN, fN, false);
  // ---- the toll: rings of sound off the bronze
  if (tolls) for (let n = 0; n < tolls; n++) { const r = 13 + n * 6, c = RB(0, 9); for (let i = 0; i < 16; i++) { if (i % 4 === 3) continue; const a = th + 1.5708 + (i / 15 - 0.5) * 2.8, a2 = a + 0.17; A.hair(c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.9, c[0] + Math.cos(a2) * r, c[1] + Math.sin(a2) * r * 0.9, n ? '#9a7c48' : '#f0d898'); } }
  // dust off the ground in the charge
  if (atk && ph < 2) for (let i = 0; i < 4; i++) { const x = aN[0] - 1 - i * 3.2, y = -1.6 - (i % 2) * 1.4 - i * 0.6, r = 2.4 - i * 0.35; A.ell(x, y, r * 1.3, r, '#3e382f', { flat: true, contour: false }); A.ell(x - r * 0.3, y - r * 0.35, r * 0.7, r * 0.5, '#564e40', { flat: true, contour: false }); }
  A.rim([110, 130, 150], 0.3);
};

// =================================================================== GRAVEBLOAT
// A stomach that got up and walked out of the charnel pit: a grey-violet gut-sack stretched to shining, veined,
// cinched by a rope that the flesh bulges over, sewn shut along an old seam. A sphincter mouth set with a few human
// teeth dribbles bile. It shuffles on two stubby legs, swells and gurgles, then spasms and sprays.
MFRAME.bloat = [50, 40]; MPX_K.bloat = 1.3; MPX_WALK.bloat = 6;
MPX.bloat = function (A, pose, ph, pal) {
  const t = pal.tint, skin = tintMat('bloatSkin', t, 0.45), bile = tintMat('bloatBile', t, 0.2);
  const S = MAT[skin], BL = MAT[bile];
  const walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk', idle = pose === 'idle';
  const G = walk ? gait(ph, 8) : null;
  let sx = 1, sy = 1, lean = 0, Y0 = 0, open = 0.5, spray = 0, swell = 0;
  if (idle) { const b = Math.sin(ph / 4 * 6.2832); sx = 1 + b * 0.02; sy = 1 - b * 0.02; open = 0.5 + b * 0.2; }
  if (walk) { const j = Math.cos(G.a * 2); sx = 1 + j * 0.035; sy = 1 - j * 0.035; lean = G.swing * 0.6; Y0 = G.bob * 0.8; }
  if (wind) { swell = [0.35, 0.7, 1][ph]; sx = 1 + 0.16 * swell; sy = 1 + 0.14 * swell; open = 0.3 - swell * 0.3; lean = -1 * swell; }
  if (atk) { spray = [1, 0.6, 0.2][ph]; sx = [1.05, 1, 0.98][ph]; sy = [0.86, 0.92, 0.97][ph]; open = 1 + spray * 1.3; lean = 2.2 * spray; Y0 = spray * 0.5; }
  const bot = -8.5 + Y0, C = [lean - 1, bot - 14.5 * sy];
  const L = (u, v) => [C[0] + u * sx + (v < 0 ? -v * lean * 0.05 : 0), C[1] + v * sy];
  // legs: stubby, bowed under the weight
  let aN, aF;
  if (walk) { aN = [3 + G.swing * 3.2, -2 - G.lift * 1.6]; aF = [-4 - G.swing * 3.2, -2 - G.liftF * 1.6]; } else if (atk) { aN = [4, -2]; aF = [-5, -2]; } else { aN = [3, -2]; aF = [-4, -2]; }
  const leg = (h, a, far) => {
    const o = far ? { tone: -1.6, contour: false } : { sh: 0.9, hl: 0.6 }, k = [(h[0] + a[0]) / 2 + 1.2, (h[1] + a[1]) / 2];
    A.limb([h, k, a], 3.8, 2.4, skin, o);
    A.shape((c, X, Y) => { c.moveTo(X(a[0] - 2.2), Y(Math.min(0, a[1] + 2))); c.lineTo(X(a[0] - 1.8), Y(a[1] - 0.4)); c.quadraticCurveTo(X(a[0] + 2.6), Y(a[1] - 0.2), X(a[0] + 4.4), Y(Math.min(0, a[1] + 2))); }, skin, o);
    if (!far) { for (let i = 0; i < 3; i++) { A.fine(a[0] + 2 + i * 0.9, Math.min(0, a[1] + 2) - 0.5, S[0]); A.fine(a[0] + 2.4 + i * 0.9, Math.min(0, a[1] + 2) - 0.2, MAT.boneOld[1]); } A.hair(k[0] - 1.6, k[1] - 0.6, k[0] - 0.8, k[1] + 1.2, S[3]); A.fine(k[0] + 1.6, k[1], S[0]); }
  };
  leg([C[0] - 5, bot - 2], aF, true);
  // ---- the esophagus, a stump on top tied off with cord
  const e0 = L(-2, -13), e1 = L(-0.5, -18), e2 = L(2.5, -20.5 - swell);
  A.limb([e0, e1, e2], 3.4, 2.5, skin, { sh: 0.9, hl: 0.6 });
  A.ell(e2[0] + 0.3, e2[1] - 0.3, 2.6, 1.3, 'gut', { rot: 0.5, sh: 0.4, hl: 0.4 }); A.ell(e2[0] + 0.4, e2[1] - 0.3, 1.2, 0.5, '#1a0a0e', { rot: 0.5, flat: true, contour: false });
  for (let i = 0; i < 2; i++) A.limb([[e1[0] - 3, e1[1] + 1.5 - i * 1.2], [e1[0] + 3, e1[1] - 0.3 - i * 1.2]], 0.45, 0.45, 'rope', { sh: 0.3, hl: 0.3 });
  A.limb([[e1[0] + 2.8, e1[1] - 0.5], [e1[0] + 4 + (walk ? -G.swing * 0.6 : 0), e1[1] + 2.5]], 0.35, 0.3, 'rope', {});
  // ---- the sack: a stomach's shape, the great curve slung low behind, the pylorus a snout in front
  const pts = [[2, -14], [10, -14.5, 13, -9.5], [15.5, -7.2, 19.5, -6.4], [21, -3.4, 20, -0.2], [16, 0, 14, 3], [13, 11, 4, 13.5], [-6, 16.5, -13, 10.5], [-18.5, 4, -16.5, -5], [-14.5, -14.5, -5, -15], [-1, -15.5, 2, -14]];
  const sackPath = (c, X, Y) => { let p = L(...pts[0]); c.moveTo(X(p[0]), Y(p[1])); for (let i = 1; i < pts.length; i++) { const q = L(pts[i][0], pts[i][1]), r = L(pts[i][2], pts[i][3]); c.quadraticCurveTo(X(q[0]), Y(q[1]), X(r[0]), Y(r[1])); } };
  A.shape(sackPath, skin, { sh: 1.4, hl: 1 });
  const crv = (list, mat, o) => A.shape((c, X, Y) => { let p = L(...list[0]); c.moveTo(X(p[0]), Y(p[1])); for (let i = 1; i < list.length; i++) { if (list[i].length === 2) { const q = L(...list[i]); c.lineTo(X(q[0]), Y(q[1])); } else { const q = L(list[i][0], list[i][1]), r = L(list[i][2], list[i][3]); c.quadraticCurveTo(X(q[0]), Y(q[1]), X(r[0]), Y(r[1])); } } }, mat, o);
  // flat bands laid by hand: the underside sunk in shadow, a deeper core under it, a taut lit dome
  crv([[16, 0.5], [13.5, 11, 4, 13.5], [-6, 16.5, -13, 10.5], [-18.5, 4, -16.8, -2], [-4, 7, 16, 0.5]], skin, { flat: true, tone: -1.3, contour: false, edge: false });
  crv([[8, 11], [0, 15, -9, 13], [-15, 9, -16.8, 3], [-6, 11, 8, 11]], skin, { flat: true, tone: -2.6, contour: false, edge: false });
  crv([[-16, -3], [-14.5, -13.6, -5, -14.2], [3, -14.6, 10, -11.5], [-4, -9, -16, -3]], skin, { flat: true, lit: 0.3, contour: false, edge: false });
  crv([[-13, -8], [-10, -13, -3, -13.4], [-9, -11, -13, -8]], skin, { flat: true, lit: 0.55, contour: false, edge: false });
  { const p = L(-8, -12); A.fine(p[0], p[1], '#ece4e6'); A.fine(p[0] + 0.9, p[1] - 0.2, S[4]); A.fine(p[0] - 1, p[1] + 0.7, S[4]); const q = L(11, -8.5); A.fine(q[0], q[1], S[4]); }   // the wet shine
  // the folds of the gut gathering into the snout
  for (let i = 0; i < 3; i++) { const a = L(7 + i * 0.5, -11 + i * 5.5), m = L(12 + i * 0.3, -8 + i * 3), b = L(15.4, -5 + i * 1.6); A.hair(a[0], a[1], m[0], m[1], S[0]); A.hair(m[0], m[1], b[0], b[1], S[0]); A.hair(a[0] - 0.3, a[1] - 0.9, m[0] - 0.2, m[1] - 0.9, S[3]); }
  // veins: dark and branching, flushed red as it swells
  const vc = swell > 0.6 || spray > 0.8 ? '#8a2436' : swell > 0.3 ? '#62243e' : '#2e1a36', vc2 = swell > 0.3 ? '#aa3a4a' : '#4e2e52';
  const vein = (pp, col) => { for (let i = 0; i < pp.length - 1; i++) { const a = L(...pp[i]), b = L(...pp[i + 1]); A.hair(a[0], a[1], b[0], b[1], col); } };
  vein([[-13, 7], [-10, 3], [-9, -1], [-6, -3], [-5, -8]], vc); if (swell || spray) { vein([[-9, -1], [-12, -3.5], [-14, -6]], vc); vein([[-6, -3], [-3, -2], [-1, 1]], vc2); }
  if (swell || spray) vein([[4, -13], [5.5, -9], [8, -7]], vc); vein([[1, 12], [3, 8], [7, 6.5], [9, 3]], vc); vein([[3, 8], [1, 5]], vc2);
  // stretch marks round the flank, paler as it swells
  for (let i = 0; i < 5; i++) { const a = L(-16 + i * 0.3, -3 + i * 2.2), b = L(-14 + i * 0.5, -3.8 + i * 2.2); A.hair(a[0], a[1], b[0], b[1], swell > 0.5 ? S[4] : S[3]); }
  // bruising and grave-stain
  { const p = L(-3, 4); A.speck(p[0] - 5, p[1] - 3, 10, 7, '#3a2a44', 10, 63); const q = L(-14, 1); A.speck(q[0], q[1], 5, 7, '#5a5a3a', 10, 67); }
  // the autopsy cut, sewn shut with black thread, the lips of it puffed and raw
  { const sp = [[-3, -13.5], [-1, -7], [2, -1], [4, 5], [4.5, 10.5]].map(p => L(...p)); A.limb(sp, 0.95, 0.8, 'gut', { tone: -1.2, sh: 0.4, hl: 0.3, contour: false });
    for (let i = 0; i < sp.length - 1; i++) A.hair(sp[i][0], sp[i][1], sp[i + 1][0], sp[i + 1][1], '#1a080c');
    for (let i = 0; i < 6; i++) { const u = (i + 0.5) / 6 * (sp.length - 1), k = Math.min(sp.length - 2, Math.floor(u)), f = u - k, x = sp[k][0] + (sp[k + 1][0] - sp[k][0]) * f, y = sp[k][1] + (sp[k + 1][1] - sp[k][1]) * f; A.hair(x - 1.3, y - 0.3, x + 1.3, y + 0.4, '#0e0806'); A.fine(x - 1.3, y - 0.3, '#8a7a5a'); A.fine(x + 1.4, y + 0.5, '#3a0c10'); } }
  // a rag of burial shroud stuck to the top, sewn on
  { const a = L(-14, -10), b = L(-6, -15), c2 = L(-7, -9), d = L(-14.5, -5.5); A.poly([a, b, c2, [c2[0] - 2, c2[1] + 2.5], [d[0] + 1, d[1] + 1.5], d], 'clothBone', { sh: 0.6, hl: 0.5, tone: -0.8 }); A.hair(b[0] - 1, b[1] + 1, c2[0] - 0.5, c2[1] + 0.5, MAT.clothBone[1]); A.speck(d[0], b[1], 8, 8, '#4a4030', 10, 71); A.fine(c2[0] - 0.2, c2[1] + 0.2, '#0e0806'); A.fine(a[0] + 0.5, a[1] + 0.3, '#0e0806'); }
  // the gurgle: bubbles rising under the skin as it swells
  if (swell) for (let i = 0; i < 2 + ph; i++) { const p = L(2 + i * 3.2 - ph, -4 - ((i * 3 + ph * 2) % 7)); A.ell(p[0], p[1], 0.9 + (i % 2) * 0.4, 0.8 + (i % 2) * 0.3, S[3], { flat: true, contour: false }); A.fine(p[0] - 0.4, p[1] - 0.4, S[4]); A.fine(p[0] + 0.4, p[1] + 0.5, S[1]); }
  // ---- the mouth: a sphincter puckered in radial folds, a few human teeth set in it, bile running out
  const M = L(20.2, -3.3);
  A.ell(M[0] - 0.3, M[1], 2.4 + open * 0.6, 3.6 + open * 0.9, 'gut', { sh: 0.6, hl: 0.5 });
  for (let i = 0; i < 9; i++) { const a = i / 9 * 6.2832; A.hair(M[0] + Math.cos(a) * 0.6, M[1] + Math.sin(a) * 0.9, M[0] + Math.cos(a) * (1.8 + open * 0.5), M[1] + Math.sin(a) * (2.8 + open * 0.8), '#3a1420'); }
  A.ell(M[0] + 0.2, M[1], 0.5 + open * 0.8, 0.8 + open * 1.3, '#0e0406', { flat: true, contour: false });
  for (const [a, l] of [[-2.2, 1.2], [-0.9, 1], [0.5, 1.3], [1.9, 1]]) { const x = M[0] + Math.cos(a) * (0.9 + open * 0.8), y = M[1] + Math.sin(a) * (1.3 + open * 1.2); A.limb([[x, y], [x + Math.cos(a) * -l, y + Math.sin(a) * -l]], 0.75, 0.5, 'bone', { sh: 0.3, hl: 0.3, contour: false }); }
  // bile
  if (spray) {
    const n = 7, reach = 15 * spray;
    A.limb([[M[0] + 0.5, M[1]], [M[0] + reach * 0.4, M[1] - 2.5 * spray], [M[0] + reach * 0.75, M[1] + 0.5], [M[0] + reach, M[1] + 6]], 2 * spray + 0.5, 0.6, bile, { sh: 0.6, hl: 0.5, contour: false }); A.limb([[M[0] + 1, M[1] - 0.4], [M[0] + reach * 0.4, M[1] - 2.8 * spray]], 0.5 * spray + 0.2, 0.3, BL[4], { flat: true, contour: false });
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, a = -0.7 + u * 1.4, r = reach * (0.5 + hash(i + ph * 7, 5) * 0.6), x = M[0] + Math.cos(a) * r, y = M[1] + Math.sin(a) * r * 0.7 + r * r * 0.012; A.ell(x, y, 0.8, 0.6, bile, { sh: 0.3, hl: 0.3 }); A.fine(x - 0.3, y - 0.3, BL[4]); }
    for (let i = 0; i < 4; i++) { const x = M[0] + 3 + i * 3.5 * spray; A.fine(x, M[1] - 1.5 - i * 0.5, BL[4]); }
  }
  { const dl = spray ? 3 : 2 + (ph % 3) + swell; A.limb([[M[0] - 0.2, M[1] + 2.6], [M[0] + 0.2, M[1] + 2.6 + dl]], 0.6, 0.45, bile, { sh: 0.3, hl: 0.3 }); A.ell(M[0] + 0.2, M[1] + 3.4 + dl, 0.7, 0.8, bile, { sh: 0.3, hl: 0.3 }); A.fine(M[0], M[1] + 3 + dl, BL[4]); }
  A.limb([[M[0] - 1, M[1] + 3], [M[0] - 3, M[1] + 6.5]], 0.5, 0.3, bile, { contour: false });   // a run of it down the belly
  if (swell) for (let i = 0; i < ph + 1; i++) { A.ell(M[0] + 1.4 + i * 0.8, M[1] - 2.8 + i * 1.8, 0.7, 0.7, BL[3], { flat: true, contour: false }); A.fine(M[0] + 1.2 + i * 0.8, M[1] - 3 + i * 1.8, BL[4]); }   // foam
  // ---- the near leg
  leg([C[0] + 3, bot - 2], aN, false);
  A.lamp(M[0] + 2, M[1] + 1, [190, 210, 90], 7 + spray * 8, 0.35 + spray * 0.3);
  A.rim([120, 130, 160], 0.35);
};
