
// =================================================================== v0.34 zy_flesh: the Flesh Golem, reborn as a brood-beast
// A hulking thing sewn together out of corpses and armoured in brood chitin: a hunched back of overlapping carapace
// plates with bone spurs and three twitching insect legs sprouting from the ridge, an insect head sunk low between
// its shoulders (a cluster of burning eyes, two hooked mandibles), one arm ending in a great chitin crusher it
// knuckle-walks on, digitigrade insect hind legs, and in front a vast distended gut sewn shut down the middle. The
// gut is its brood stock: it swells as the golem eats, the larvae squirm against the membrane, and when enemies
// come near the stitches tear, the gut-maw splits open and it pukes up a gout of blood, bile and swarmlings.
// Meat hooks and chains pierce the flesh; catgut sutures run across every seam.
// Tag: fg (every top-level name here starts with FG / fg).

pmat('fgHide', ['#1a0e12', '#4a2a30', '#7e5652', '#b08a7c', '#dcc0ac']);      // corpse skin, bruised and sewn
pmat('fgHideD', ['#100a0c', '#321c22', '#5a3a3c', '#80605a', '#a88a7c']);
pmat('fgChit', ['#07060a', '#1c1420', '#34263a', '#56405a', '#8a6a84']);      // brood carapace, oil-dark and glossy
pmat('fgChitD', ['#050408', '#120e16', '#241a28', '#3a2c40', '#5a4662']);
pmat('fgGut', ['#2a0610', '#6a1426', '#a4303c', '#d6606a', '#ffb4b0']);       // the stretched gut membrane
pmat('fgLeg', ['#100a12', '#34263a', '#5c4664', '#8c6e90', '#c0a4bc']);       // the grafted limbs: lighter chitin, readable at swarmling size
pmat('fgLegD', ['#0a060c', '#221828', '#3e2e44', '#604a66', '#8a7290']);
pmat('fgGutD', ['#1e040c', '#4a0e1c', '#7a2230', '#a8444e', '#d88088']);
const FG_SPEC = '#fff4ea', FG_WET = '#ffd8d0', FG_THREAD = '#d8c89a', FG_SEAM = '#1a080c', FG_EYE = '#ffd040', FG_EYE2 = '#ff6a2a';

// a catgut suture: a dark seam with pale cross-stitches
function fgStitch(K, x0, y0, x1, y1, n) {
  const { N, D } = K, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  N(x0, y0, x1, y1, FG_SEAM);
  n = n || Math.max(2, Math.round(L / 2.5));
  for (let i = 0; i <= n; i++) { const t = (i + 0.5) / (n + 1), x = x0 + dx * t, y = y0 + dy * t; D(x + nx * 1.2, y + ny * 1.2, FG_THREAD); D(x - nx * 1.2, y - ny * 1.2, FG_THREAD); }
}
// a meat hook through the flesh, a short chain hanging from it
function fgHook(K, x, y, dir, chain) {
  const { N, D } = K, i0 = mnHex('mnIron', 3), i1 = mnHex('mnIron', 1);
  N(x, y, x, y - 3, i0); N(x, y - 3, x + dir * 2, y - 4, i0); D(x + dir * 3, y - 3, i0); D(x + dir * 3, y - 2, '#ffffff');
  D(x - 1, y - 2, i1); D(x, y - 4, '#ffffff');
  D(x, y + 1, mnHex('mnGore', 3)); D(x, y + 2, mnHex('mnGore', 2));
  for (let i = 0; i < (chain || 0); i++) D(x - dir * 0.5 + (i % 2) * dir, y + 2 + i, i % 2 ? mnHex('mnRust', 3) : mnHex('mnIron', 2));
}
// a bone spur breaking out of the skin
function fgSpur(K, x, y, ang, len, t) {
  const { L, D } = K, e = mnDir([x, y], ang, len);
  L([[x, y], e], 1.4, 0.3, t < 0 ? 'mnBoneD' : 'mnBone', {});
  D(x - Math.cos(ang), y - Math.sin(ang) + 1, mnHex('mnGore', 3));
}
// a glossy chitin plate: the painter's shading, then a crisp dark rim along its lower edge and a hard specular streak
function fgPlate(K, pts, t, spec) {
  const { Q, D, N } = K; Q(pts, t < 0 ? 'fgChitD' : 'fgChit', { band: 2 });
  const [a, b] = [pts[0], pts[1]];
  if (spec !== false) { const n = 3; for (let i = 0; i < n; i++) { const u = 0.25 + i * 0.12; D(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + 1.2, t < 0 ? mnHex('fgChit', 3) : (i === 1 ? FG_SPEC : mnHex('fgChit', 4))); } }
  const c = pts[pts.length - 1], d = pts[pts.length - 2]; N(c[0] + 0.5, c[1] - 0.5, d[0] - 0.5, d[1] - 0.5, t < 0 ? '#030205' : '#0c0810');
}

function fgPaint(A, K, o) {
  const { E, L, Q, D, N } = K, back = o.view === 'back', pose = o.pose, ph = o.ph;
  const walk = pose === 'walk', idle = pose === 'idle', wind = pose === 'wind', atk = pose === 'atk', puke = pose === 'puke', eat = pose === 'eat';
  const st = Math.max(0, Math.min(3, o.stock | 0));
  const a = walk ? ph / 8 * Math.PI * 2 : 0, sw = walk ? Math.sin(a) : 0;
  const bob = walk ? -Math.abs(Math.cos(a)) * 1.6 + 0.8 : idle ? [0, 0.6, 1.2, 0.6][ph] : 0;
  // lean: forward is +x; the whole upper mass and head shift with it, sink lowers it
  const lean = wind ? -3 : atk ? [-2, 4, 7][ph] : puke ? [-4, 5, 4][ph] : eat ? 7 : walk ? 1 : 0;
  const sink = eat ? 9 : atk && ph === 2 ? 4 : puke && ph > 0 ? 2 : 0;
  const open = puke ? [0.5, 1, 1][ph] : Math.max(0, o.open || 0);
  const U = (x, y, k) => [x + lean * (k == null ? 1 : k), y + bob + sink * (k == null ? 1 : k)];   // upper-body point
  // ---- skeleton
  const hipF = [-13, -19 + bob * 0.5], hipN = [-6, -18 + bob * 0.5];
  const shN = U(12, -42), shF = U(1, -45), hd = eat ? [31, -13] : U(22, -38, 1.25);
  const gut = [7 + lean * 0.45, -17 + bob * 0.6 + sink * 0.35], grx = 10 + st * 1.4 + (puke && ph === 0 ? 1 : 0), gry = 9 + st * 1.15;
  const gutC = [gut[0], Math.min(gut[1], -gry - 3)];
  // the ridge of the back, hip to neck
  const R = [U(-17, -24, 0.3), U(-14, -35, 0.6), U(-7, -44, 0.85), U(2, -49), U(11, -47), U(17, -41, 1.1)];
  // legs: thigh of flesh forward-down to the knee, a chitin shin raking back to the ankle, a spiked foot
  const legPts = (h, side) => {
    const s = side > 0 ? 1 : -1;
    let an = walk ? [h[0] + 3 + s * sw * 6, -Math.max(0, s * Math.cos(a)) * 3] : atk || puke ? [h[0] + (side > 0 ? 5 : -2), 0] : eat ? [h[0] + (side > 0 ? 4 : -3), 0] : [h[0] + 3, 0];
    const kn = [(h[0] + an[0]) / 2 + 5, -11 + bob * 0.3 + (walk ? -Math.max(0, s * Math.cos(a)) * 1.5 : 0)];
    return { kn, an };
  };
  const lF = legPts(hipF, -1), lN = legPts(hipN, 1);
  // the near arm: knuckle-walks on the crusher; rises overhead and crashes down
  const asw = walk ? sw * 5 : 0;
  let haN, elN;
  if (wind) { haN = U(4, -70); elN = U(8, -56); }
  else if (atk) { haN = [U(10, -70), U(34, -44), U(34, -6)][ph]; elN = [U(12, -56), U(26, -46), U(28, -24)][ph]; if (ph === 2) haN = [haN[0], -5]; }
  else if (puke) { haN = [U(0, -66), U(30, -58), U(31, -56)][ph]; elN = [U(6, -54), U(22, -50), U(23, -48)][ph]; }
  else if (eat) { haN = [U(20, 0)[0], -5]; elN = U(22, -24); }
  else { haN = [26 + asw + lean, -5 - (walk ? Math.max(0, -Math.cos(a)) * 3 : 0)]; elN = [U(24, -26)[0] + asw * 0.5, -26 + bob]; }
  const haF = eat ? [36, -4] : wind || (atk && ph < 2) || (puke && ph > 0) ? U(12, -14) : [U(14, 0)[0] - asw * 0.6, -4 - (walk ? Math.max(0, Math.cos(a)) * 2 : 0)];
  const elF = eat ? U(22, -20) : U(9, -26);
  const mandOpen = puke ? (ph > 0 ? 1 : 0.5) : eat ? (ph ? 0.2 : 1) : atk ? 0.6 : wind ? 1 : idle && ph === 2 ? 0.4 : 0;

  // ---- parts
  const spineLeg = (i, t) => {     // an insect leg sprouting from the ridge, jointed up and back
    const r = R[1 + i], tw = [0, 1, 0, -1][(ph + i) % 4] * (walk || idle || eat ? 0.12 : 0) + (wind || (atk && ph === 0) || (puke && ph === 0) ? -0.25 : puke ? 0.2 : 0);
    const a0 = [-2.45, -2.0, -1.45][i] + tw, l0 = [9, 13, 10][i], j = mnDir(r, a0, l0), tip = mnDir(j, a0 + [1.6, 1.9, 2.1][i] - tw * 2, [8, 10, 8][i]);
    L([[r[0] - 1, r[1] + 1], j], 1.3, 1, t < 0 ? 'fgChitD' : 'fgChit', {});
    L([j, tip], 1, 0.35, t < 0 ? 'fgChitD' : 'fgChit', {});
    D(j[0], j[1] - 1, t < 0 ? mnHex('fgChit', 3) : FG_SPEC); D(tip[0], tip[1] + 1, mnHex('mnBone', 3));
  };
  const leg = (h, P2, t) => {
    const { kn, an } = P2, m = t < 0 ? 'fgHideD' : 'fgHide', c = t < 0 ? 'fgChitD' : 'fgChit';
    L([h, kn], 4.2, 3.2, m, { band: 2 });
    fgPlate(K, [[kn[0] - 2.6, kn[1] - 1], [kn[0] + 2.6, kn[1] - 0.5], [an[0] + 2, an[1] - 3], [an[0] - 1.6, an[1] - 3]], t);
    E(kn[0] + 0.5, kn[1], 2.6, 2.3, c, {}); D(kn[0] - 0.5, kn[1] - 1, t < 0 ? mnHex('fgChit', 3) : FG_SPEC);
    // the foot: a forward talon and a back spur
    Q([[an[0] - 3, an[1] - 3], [an[0] + 2, an[1] - 3.5], [an[0] + 7, an[1] + 0.8], [an[0] - 1, an[1] + 0.8]], c, {});
    L([[an[0] - 2, an[1] - 1], [an[0] - 5, an[1] + 0.6]], 1, 0.4, t < 0 ? 'mnBoneD' : 'mnBone', {});
    D(an[0] + 6, an[1], mnHex('mnBone', 4)); D(an[0] + 1, an[1] - 2, t < 0 ? mnHex('fgChit', 3) : FG_SPEC);
  };
  const crusher = (el, ha, t) => {   // a club of fused chitin with bone spikes: the crushing fist
    const ang = Math.atan2(ha[1] - el[1], ha[0] - el[0]), c = t < 0 ? 'fgChitD' : 'fgChit';
    const w = [ha[0] - Math.cos(ang) * 4, ha[1] - Math.sin(ang) * 4];
    E(w[0], w[1], 4, 3.4, t < 0 ? 'fgHideD' : 'fgHide', {});   // the wrist of flesh sewn into it
    for (const da of [-0.95, 0, 0.95]) fgSpur(K, ha[0] + Math.cos(ang + da) * 5, ha[1] + Math.sin(ang + da) * 4.5, ang + da * 1.2, 4.5, t);
    E(ha[0], ha[1], 6.8, 5.6, c, { band: 2 });
    // the shell is ridged: two plates, crisp seams
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    N(ha[0] - Math.cos(ang) * 2 + nx * 5, ha[1] - Math.sin(ang) * 2 + ny * 4, ha[0] + Math.cos(ang) * 1 - nx * 5, ha[1] + Math.sin(ang) * 1 - ny * 4, '#050308');
    for (let i = 0; i < 3; i++) D(w[0] + nx * (i - 1) * 2.5, w[1] + ny * (i - 1) * 2.5, FG_THREAD);
    D(ha[0] - 2, ha[1] - 2, t < 0 ? mnHex('fgChit', 3) : FG_SPEC); D(ha[0] - 1, ha[1] - 3, t < 0 ? mnHex('fgChit', 3) : FG_SPEC); D(ha[0] + 2, ha[1] + 2, '#050308');
    if (!back) { D(ha[0] + 1, ha[1] + 4, mnHex('mnGore', 3)); D(ha[0] + 1, ha[1] + 5, mnHex('mnGore', 2)); }
  };
  const arm = (sh, el, ha, t, big) => {
    const m = t < 0 ? 'fgHideD' : 'fgHide';
    L([sh, el], big ? 5.2 : 3.4, big ? 4.2 : 2.8, m, { band: 2 }); L([el, ha], big ? 4.2 : 2.6, big ? 3.8 : 2.2, m, { band: 2 });
    // chitin bracers over the forearm
    const mid = mnLerp(el, ha, 0.45), ang = Math.atan2(ha[1] - el[1], ha[0] - el[0]), nx = -Math.sin(ang), ny = Math.cos(ang), w = big ? 4.4 : 2.8;
    fgPlate(K, [[el[0] - nx * w + Math.cos(ang), el[1] - ny * w + Math.sin(ang)], [el[0] + nx * w * 0.2, el[1] + ny * w * 0.2 - 1], [mid[0] + nx * w * 0.3, mid[1] + ny * w * 0.3], [mid[0] - nx * w, mid[1] - ny * w]], t);
    E(el[0], el[1], big ? 3.6 : 2.4, big ? 3.2 : 2.2, m, {}); D(el[0] - 1, el[1] - 1, t < 0 ? mnHex('fgHide', 3) : FG_WET);
    if (big) fgSpur(K, el[0] + 1, el[1] - 2, -2.2, 5, t);
    if (big) fgStitch(K, sh[0] - 2, sh[1] + 3, el[0] - 2, el[1] - 1, 2);
    if (!big) { for (let i = 0; i < 3; i++) L([[ha[0] + i - 1, ha[1]], [ha[0] + 2 + i * 1.5, ha[1] + 3]], 0.8, 0.3, t < 0 ? 'mnBoneD' : 'mnBone', {}); E(ha[0], ha[1], 2.4, 2, m, {}); }
  };
  const torso = () => {
    const T = [R[0], [R[0][0] - 1.5, R[0][1] + 5], [hipF[0] - 3, hipF[1] + 3], [hipN[0] + 2, hipN[1] + 3], [gut[0] - 4, gut[1] - 3], U(18, -28, 1), R[5], R[4], R[3], R[2], R[1]];
    Q(T, back ? 'fgHide' : 'fgHide', { band: 3 });
    // folds and sewn seams across the flank
    if (!back) {
      fgStitch(K, R[2][0] + 3, R[2][1] + 7, hipN[0] + 2, hipN[1] - 3, 4);
      for (let i = 0; i < 3; i++) N(R[2][0] + 3 + i * 4, R[2][1] + 10 + i, R[2][0] + 5 + i * 4, R[2][1] + 14 + i, mnHex('fgHide', 1));
      // wet sheen on the upper flank
      for (const [x, y] of [[-6, -36], [-5, -37], [4, -40], [5, -41], [-11, -28]]) { const p = U(x, y, 0.8); D(p[0], p[1], FG_WET); }
    } else {
      fgStitch(K, R[0][0] + 3, R[0][1] + 4, R[4][0] - 2, R[4][1] + 9, 7);
      for (const [x, y] of [[-9, -32], [0, -40], [8, -38]]) { const p = U(x, y, 0.8); D(p[0], p[1], FG_WET); }
    }
  };
  const carapace = (t) => {      // overlapping plates down the ridge, a bone spur between each
    for (let i = 0; i < 5; i++) {
      const p0 = R[i], p1 = R[i + 1], th = back ? 7 : 5, dx = p1[0] - p0[0], dy = p1[1] - p0[1], l = Math.hypot(dx, dy), nx = dy / l, ny = -dx / l;   // normal pointing out of the back
      fgPlate(K, [[p0[0] + nx * 1.5 - dx * 0.1, p0[1] + ny * 1.5 - dy * 0.1], [p1[0] + nx * 1.5 + dx * 0.12, p1[1] + ny * 1.5 + dy * 0.12], [p1[0] - nx * th + dx * 0.05, p1[1] - ny * th], [p0[0] - nx * (th - 1), p0[1] - ny * (th - 1)]], t);
      if (i > 0 && i < 5) fgSpur(K, p0[0] + nx * 1.5, p0[1] + ny * 1.5, Math.atan2(ny, nx) - 0.5, 4 + (i === 2 ? 1 : 0), t);
    }
    if (back) {   // from behind: the plates run in two rows either side of a spine of knuckled bone
      for (let i = 1; i < 5; i++) { const p = R[i]; E(p[0] - 1, p[1] + 5, 1.6, 1.3, 'mnBone', {}); }
    }
  };
  const gutMass = (t) => {
    const g = gutC, m = t < 0 ? 'fgGutD' : 'fgGut';
    E(g[0], g[1], grx, gry, m, { band: 3 });
    // sewn panels of hide over its top, the membrane bare beneath
    Q([[g[0] - grx * 0.75, g[1] - gry * 0.55], [g[0] - grx * 0.1, g[1] - gry * 0.95], [g[0] + grx * 0.2, g[1] - gry * 0.45], [g[0] - grx * 0.45, g[1] - gry * 0.1]], t < 0 ? 'fgHideD' : 'fgHide', { band: 2 });
    fgStitch(K, g[0] - grx * 0.45, g[1] - gry * 0.1, g[0] + grx * 0.2, g[1] - gry * 0.45, 2);
    // veins over the membrane, stretch marks as it fills
    N(g[0] - grx * 0.6, g[1] + gry * 0.4, g[0] - 1, g[1] + gry * 0.1, mnHex('mnVein', 2)); N(g[0] - 1, g[1] + gry * 0.1, g[0] + 1, g[1] + gry * 0.6, mnHex('mnVein', 2));
    N(g[0] - grx * 0.3, g[1] + gry * 0.75, g[0] + grx * 0.2, g[1] + gry * 0.55, mnHex('mnVein', 1));
    // the brood inside: larvae curled against the membrane, one more for every level of stock
    const lv = [[-4, 4], [2, 6.5], [-1, 1]], nL = st;
    if (!back) for (let i = 0; i < nL; i++) {
      const lx = g[0] + lv[i][0] * grx / 12, ly = g[1] + lv[i][1] * gry / 11, wig = (ph + i) % 2 ? 1 : 0;
      E(lx, ly, 3, 2.2, '#4a0c18', { flat: true, contour: false });
      N(lx - 2, ly + wig, lx - 1, ly - 1, mnHex('mnFat', 2)); N(lx - 1, ly - 1, lx + 1, ly - 1, mnHex('mnFat', 3)); N(lx + 1, ly - 1, lx + 2, ly + 1 - wig, mnHex('mnFat', 2));
      D(lx + 2, ly - 1, '#1a0206');
    }
    // the wet highlight on the swell of it
    D(g[0] - grx * 0.55, g[1] + 1, FG_WET); D(g[0] - grx * 0.5, g[1] + 2, '#ffffff'); D(g[0] - grx * 0.45, g[1] + 2, FG_WET);
    D(g[0] + grx * 0.3, g[1] + gry * 0.4, FG_WET);
    for (let i = 0; i < 2; i++) { const x = g[0] - grx * 0.2 + i * 4, y = g[1] + gry - 0.5, len = 1 + (ph + i) % 3; for (let j = 0; j < len; j++) D(x, y + j + 1, mnHex('mnGore', j === len - 1 ? 4 : 2)); }
  };
  // the gut-maw: a vertical slit down the front of the gut, sewn shut; it tears open and spews
  const maw = () => {
    const g = gutC, mx = g[0] + grx * 0.62, top = g[1] - gry * 0.62, bot = g[1] + gry * 0.72, mid = (top + bot) / 2 + 1, w = 0.8 + open * 5;
    if (open < 0.2) {
      Q([[mx, top - 1], [mx + 1.6, (top + bot) / 2], [mx + 0.5, bot + 1], [mx - 1, (top + bot) / 2]], '#1a0206', { flat: true, contour: false });
      for (let i = 0; i < 4; i++) { const y = top + 2 + i * (bot - top - 3) / 3; D(mx - 2, y - 1, FG_THREAD); D(mx - 1, y, FG_THREAD); D(mx + 1, y, FG_THREAD); D(mx + 2, y - 1, FG_THREAD); }
      for (let i = 0; i < 3; i++) { D(mx, top + 3.5 + i * 4, '#f0f0e8'); D(mx + 1, top + 4.5 + i * 4, '#b8bcb4'); }   // fang tips poking through the seam
      D(mx + 1, bot + 2, mnHex('mnGore', 3)); D(mx + 1, bot + 3, mnHex('mnGore', 4));
      return;
    }
    const pts = [[mx, top - 1], [mx + w * 0.8, top + (mid - top) * 0.35], [mx + w, mid], [mx + w * 0.7, bot - (bot - mid) * 0.3], [mx, bot + 1], [mx - w * 0.6, mid + 1], [mx - w * 0.5, top + 3]];
    Q(pts, '#2a0206', { flat: true, contour: false });
    E(mx + w * 0.15, mid, Math.max(1, w * 0.55), (bot - top) * 0.32, 'mnGore', { flat: true, contour: false });
    E(mx + w * 0.1, mid + 1, Math.max(0.6, w * 0.3), (bot - top) * 0.18, '#140206', { flat: true, contour: false });
    // teeth down both lips, hooked inward
    for (let i = 0; i < 6; i++) {
      const u = (i + 0.5) / 6, y = top + (bot - top) * u, bulge = Math.sin(u * Math.PI);
      D(mx - w * 0.55 * bulge + 1, y, '#f0f0e8'); D(mx - w * 0.55 * bulge + 2, y, '#b8bcb4');
      D(mx + w * 0.9 * bulge - 1, y + 0.5, '#f0f0e8'); D(mx + w * 0.9 * bulge - 2, y + 0.5, '#b8bcb4');
    }
    // snapped sutures dangling from the lips
    for (let i = 0; i < 3; i++) { const y = top + 3 + i * 4; D(mx - w * 0.6 - 1, y, FG_THREAD); D(mx - w * 0.6 - 1, y + 1, FG_THREAD); D(mx + w + 1, y + 1, FG_THREAD); }
    D(mx + w * 0.8, top + 2, mnHex('mnGore', 4)); D(mx + w * 0.9, bot - 2, mnHex('mnGore', 4));
  };
  const spew = () => {    // the gout: a thick cone of blood and bile, swarmlings tumbling in it, splashing on the ground ahead
    if (!puke || ph === 0) return;
    const g = gutC, m0 = [g[0] + grx * 0.62 + 4, (g[1] - gry * 0.62 + g[1] + gry * 0.72) / 2 + 1], far = ph === 1 ? 26 : 30;
    const path = u => [m0[0] + far * u, m0[1] - Math.sin(u * Math.PI * 0.8) * 5 + u * u * (-m0[1] - 2)];
    const pts = []; for (let i = 0; i <= 8; i++) pts.push(path(i / 8));
    L(pts.slice(0, 6), 3.2, 2.2, 'mnGore', { band: 2 });                       // the gout leaving the maw
    L(pts.slice(0, 4).map(([x, y]) => [x, y + 0.5]), 1.2, 0.8, 'mnBile', { contour: false });   // bile in its core
    for (let i = 1; i < 6; i++) D(pts[i][0], pts[i][1] - 2, FG_WET);
    // breaking up into gobbets and spray as it falls
    for (let i = 5; i <= 8; i++) { const p = pts[i], k = (i + ph) % 2; E(p[0] + (k ? 2 : -1), p[1] + (k ? -1 : 2), 1.8, 1.5, 'mnGore', {}); E(p[0] + (k ? -2 : 3), p[1] + (k ? 3 : -2), 1.1, 1, i % 2 ? 'mnBile' : 'mnGore', {}); }
    // swarmlings tumbling out in it
    for (const u of ph === 1 ? [0.35, 0.8] : [0.55, 0.95]) {
      const p = path(u), s2 = [p[0], p[1] - 1];
      E(s2[0], s2[1], 2.6, 2, 'mnSkin', {}); D(s2[0] + 1, s2[1] - 1, '#ffd070'); D(s2[0] + 2, s2[1], '#1a0606'); D(s2[0] - 1, s2[1] - 1, mnHex('mnSkin', 4));
      L([[s2[0] - 1, s2[1] + 1], [s2[0] - 4, s2[1] - 2]], 0.5, 0.4, 'fgChit', {}); L([[s2[0] + 1, s2[1] + 1], [s2[0] + 3, s2[1] + 4]], 0.5, 0.4, 'fgChit', {});
    }
    // droplets flung wide, and the splash where it lands
    for (let i = 0; i < 8; i++) { const p = path((i + 0.5) / 8); D(p[0] + (i % 3) - 1, p[1] + (i % 2 ? 5 : -5), i % 3 ? mnHex('mnGore', 3) : mnHex('mnBile', 4)); }
    const e = path(1); E(e[0], -1, 8, 2, 'mnGore', { flat: true, contour: false }); E(e[0] + 2, -1, 3, 0.8, mnHex('mnBile', 3), { flat: true, contour: false });
    D(e[0] - 4, -4, mnHex('mnGore', 4)); D(e[0] + 5, -5, mnHex('mnBile', 4)); D(e[0] + 7, -3, mnHex('mnGore', 3));
  };
  const head = () => {
    // an insect skull worn like a mask: pale bone plates, a horned brow, a cluster of burning eyes, hooked mandibles
    const [x, y] = hd, sp = mandOpen;
    if (!back) {
      L([[x + 3, y + 1], [x + 8 + sp, y - sp * 3], [x + 11 + sp * 2, y + 3 - sp * 2]], 1.3, 0.4, 'fgChitD', {});                  // far mandible
      D(x + 11 + sp * 2, y + 3 - sp * 2, mnHex('mnBone', 3));
    }
    E(x - 2, y + 1, 5, 4.5, 'fgChit', { band: 2 });                                     // the carapace behind the mask
    L([[x - 3, y - 3], [x - 7, y - 8], [x - 11, y - 8]], 1.5, 0.4, back ? 'mnBone' : 'mnBoneD', {});   // swept-back horns
    if (!back) {
      Q([[x - 2, y - 4], [x + 3, y - 6], [x + 7, y - 4], [x + 8, y + 1], [x + 6, y + 5], [x + 1, y + 5], [x - 2, y + 1]], 'mnBone', { band: 2 });
      L([[x + 1, y - 5], [x + 4, y - 10], [x + 8, y - 11]], 1.4, 0.4, 'mnBone', {});
      // eye sockets, four burning eyes
      Q([[x + 1, y - 3], [x + 7, y - 3], [x + 6.5, y], [x + 1.5, y]], '#1a0206', { flat: true, contour: false });
      for (const [dx, dy, c] of [[2, -2, FG_EYE2], [4, -2, FG_EYE], [6, -2, FG_EYE2], [5, -1, FG_EYE], [3, -1, FG_EYE2]]) D(x + dx, y + dy, c);
      D(x + 4, y - 3, '#ffffff');
      // the mouth: human teeth set in the bone
      N(x + 2, y + 2.5, x + 7, y + 2.5, '#1a0206'); for (let i = 0; i < 3; i++) { D(x + 2.5 + i * 1.6, y + 2, '#fffaf0'); D(x + 3 + i * 1.6, y + 3, '#c8c0b0'); }
      D(x - 1, y - 3, mnHex('mnBone', 4)); D(x, y - 4, '#ffffff'); D(x + 7, y + 4, mnHex('mnGore', 3)); D(x + 7, y + 5, mnHex('mnGore', 4));
      L([[x + 4, y + 3], [x + 8, y + 6 + sp * 3], [x + 12 + sp, y + 4 + sp * 2]], 1.4, 0.45, 'fgChit', {});                      // near mandible
      D(x + 12 + sp, y + 4 + sp * 2, mnHex('mnBone', 4)); D(x + 7, y + 5 + sp * 3, FG_SPEC);
    } else {
      E(x - 1, y - 2, 4.5, 3.5, 'mnBone', { band: 2 }); D(x - 3, y - 4, mnHex('mnBone', 4)); N(x - 4, y, x + 2, y - 3, mnHex('mnBone', 1));
    }
  };
  const hooks = () => {
    if (!back) { fgHook(K, U(6, -45)[0], U(6, -45)[1], 1, 3); fgHook(K, R[1][0] + 3, R[1][1] + 6, -1, 4); }
    else { fgHook(K, R[2][0] + 2, R[2][1] + 7, -1, 4); fgHook(K, R[4][0], R[4][1] + 8, 1, 3); }
  };
  const drips = () => {
    const list = back ? [[R[1][0] + 2, R[1][1] + 8], [R[3][0], R[3][1] + 10]] : [[hd[0] + 9, hd[1] + 5], [shN[0] - 2, shN[1] + 5], [elN[0], elN[1] + 3]];
    list.forEach(([x, y], i) => { const len = 1 + ((ph + i) % 3); for (let j = 0; j < len; j++) D(x, y + j, mnHex('mnGore', j === len - 1 ? 4 : 2)); });
  };

  // ---- paint, far to near
  if (!back) {
    spineLeg(2, -1); spineLeg(0, -1);
    arm(shF, elF, haF, -1, false);
    leg(hipF, lF, -1);
    torso();
    carapace(0);
    spineLeg(1, 0);
    leg(hipN, lN, 0);
    gutMass(0); maw();
    head();
    hooks();
    arm(shN, elN, haN, 0, true); crusher(elN, haN, 0);
    spew();
    drips();
  } else {
    arm(shN, elN, haN, -1, true); crusher(elN, haN, -1);
    gutMass(-1);
    head();
    leg(hipN, lN, -1);
    leg(hipF, lF, 0);
    torso();
    carapace(0);
    spineLeg(0, 0); spineLeg(2, 0); spineLeg(1, 0);
    hooks();
    arm(shF, elF, haF, 0, false);
    drips();
  }
  if (eat) {   // gore flying from the chomp
    const x = hd[0] + 10, y = hd[1] + 6;
    for (const [dx, dy] of ph ? [[2, -4], [4, -2], [-1, -6], [5, -6]] : [[1, 2], [3, 3]]) D(x + dx, y + dy, mnHex('mnGore', 3 + (dx & 1)));
  }
}
function fgFrame(o, s) {
  s = Math.round(s * 20) / 20;
  const W = Math.ceil(100 * s), H = Math.ceil(86 * s), ox = Math.round(40 * s), oy = H - 4;
  const op = o.open > 0.6 ? 1 : o.open > 0.25 ? 0.5 : 0;
  const key = 'fg34|' + o.pose + '|' + o.ph + '|' + o.view + '|' + (o.stock | 0) + '|' + op + '|' + s;
  return mnFrame(key, W, H, ox, oy, A => fgPaint(A, mnKit(A, ox, oy, s), Object.assign({}, o, { open: op })));
}

// ------------------------------------------------------------------- drawing it (replaces the zx_minions32 painter)
{
  drawFleshGolem = function (g, x, y, k, sp) {
    const mv = g._px == null ? 0 : Math.hypot(x - g._px, y - g._py); g._px = x; g._py = y; g._wd = (g._wd || 0) + mv; g._mv = (g._mv || 0) * 0.85 + (mv > 0.003 ? 0.15 : 0);
    const q = iso(x, y), f = g.face || 1, t = G.time, shake = g.hurt > 0 ? Math.round((Math.random() - 0.5) * 2.2) : 0;
    let pose = 'idle', ph = Math.floor(t * 2.2 + x) % 4;
    if (g.puke) { const u = g.puke.t; pose = 'puke'; ph = u < FG_PUKE_WIND ? 0 : Math.floor(t * 8) % 2 ? 1 : 2; }
    else if (g.eat) { pose = 'eat'; ph = Math.floor(t * 7) % 2; }
    else if (g.lunge) { if (g.lunge.t > 0.25) { pose = 'wind'; ph = 0; } else { pose = 'atk'; ph = 1; } }
    else if (g.slam > 0) { const u = 1 - g.slam / 0.3; if (u < 0.35) { pose = 'wind'; ph = 0; } else { pose = 'atk'; ph = u < 0.6 ? 1 : 2; } }
    else if (g._mv > 0.3) { pose = 'walk'; ph = Math.floor(g._wd * 5.5 / (Math.PI * 2) * 8) % 8; }
    const view = g === P || !g.isFGolem ? 'front' : mnView(g, mv);
    const smax = g.isFGolem ? HS.golemStockMax() : 1, stock = g.isFGolem ? Math.round(3 * clamp((g.stock || 0) / smax, 0, 1)) : 2;
    const open = Math.max(sp && sp.eng ? 0.5 : 0, g.mawOpen && pose !== 'eat' && !g.lunge ? (g.mawOpen > 0.9 ? 0.5 : 0) : 0);
    if (g.frenzyT > 0) { ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 22, 40, '255,70,90', 0.3 + 0.1 * Math.sin(t * 14)); ctx.globalCompositeOperation = 'source-over'; }
    const s = k / 0.62;
    ctx.fillStyle = 'rgba(30,8,10,0.5)'; ctx.beginPath(); ctx.ellipse(q.sx + f * 4 * s, q.sy + 2, 24 * s, 6 * s, 0, 0, 6.28); ctx.fill();
    const fr = fgFrame({ pose, ph, view, stock, open }, s * 0.95);
    mnBlit(fr, q.sx + shake, q.sy, f, g.hurt > 0.08, 1);
    // a steady body box (for the life bar and hovering) that the raised fist and the gout do not stretch
    const bw = Math.round(34 * s), bh = Math.round(46 * s);
    return { x: Math.round(q.sx - bw / 2 + f * 3 * s), y: Math.round(q.sy - bh), w: bw, h: bh };
  };
}

// =================================================================== the swarmlings, with their grafts painted on
// The spawnling again (the gory upper half of a body hauling itself on its hands) at the golem's level of finish, and
// every graft worn on the body where a player can read it at a glance:
//   Fevered Blood: red mottling over the skin, bloodshot eyes, blood streaming from the mouth (and a fever glow in play)
//   Leapers: a pair of long chitin jumping legs folded under the hips like a cricket's
//   Clingers: hooked bone claws on the hands and a row of barbs down the spine
//   Volatile: a swollen, veined blood sac bulging out of its back, straining as it pulses
//   Spider Legs: four jointed chitin legs to a side
function fgLingPaint(A, ph, gr, view) {
  const K = mnKit(A, 16, 23, 1), { E, L, Q, D, N } = K, back = view === 'back';
  const a = ph / 4 * Math.PI * 2, surge = Math.round(Math.sin(a) * 0.8), up = Math.cos(a), pul = ph % 2;
  const fev = gr.fevered, leap = gr.leapers, cling = gr.clingers, vol = gr.volatile, legs = gr.legs;
  const skin = 'mnSkin';
  // spider legs (far side first)
  const spider = (sd) => { for (let i = 0; i < 4; i++) {
    const lp = Math.sin(a * 2 + i * 1.7 + (sd > 0 ? 0 : 1.5)), bx = -4 + i * 2.8 + surge, hip = [bx, -5], kn = [bx + lp * 1.5 + sd * 3 - 1.5 + i * 0.5, -12 - (i % 2) * 1.5], ft = [bx + lp * 3 + sd * 6 - 2 + i, 0];
    L([hip, kn], 0.8, 0.6, sd < 0 ? 'fgLegD' : 'fgLeg', {}); L([kn, ft], 0.6, 0.3, sd < 0 ? 'fgLegD' : 'fgLeg', {});
    D(kn[0], kn[1] - 1, sd < 0 ? mnHex('fgLeg', 3) : FG_SPEC); D(ft[0], ft[1], mnHex('mnBone', 4)); D(ft[0] + sd, ft[1], mnHex('mnBone', 2)); } };
  if (legs) spider(-1);
  // the leaper's far jump leg, folded
  const jumpLeg = (sd, t) => {   // a cricket's leg: thigh up and back to a high knee, shin down to a spurred foot
    const crouch = ph === 2 ? 2 : 0, hip = [-2 + surge, -4], kn = [-9 + surge - sd * 2, -13 + crouch + sd], ft = [-14 + surge - sd * 3, 0];
    L([hip, kn], 1.5, 1.1, t < 0 ? 'fgLegD' : 'fgLeg', {}); L([kn, ft], 1, 0.4, t < 0 ? 'fgLegD' : 'fgLeg', {});
    D(kn[0], kn[1] - 1, t < 0 ? mnHex('fgLeg', 3) : FG_SPEC); D(kn[0] + 1, kn[1] - 2, mnHex('mnBone', 4)); D(kn[0] + 1, kn[1] - 3, mnHex('mnBone', 3));   // the knee spur
    D(hip[0] - 3, hip[1] - 4, t < 0 ? mnHex('fgLeg', 3) : mnHex('fgLeg', 4)); D(hip[0] - 5, hip[1] - 6, t < 0 ? mnHex('fgLeg', 3) : mnHex('fgLeg', 4));
    L([[ft[0], ft[1]], [ft[0] - 4, ft[1] + 0.5]], 0.7, 0.3, 'mnBone', {}); D(ft[0] - 4, ft[1] + 0.5, mnHex('mnBone', 4)); D(ft[0] + 2, ft[1], mnHex('mnBone', 4));
  };
  if (leap) jumpLeg(-1, -1);
  else {   // entrails trailing behind
    L([[-4 + surge, -2], [-7, -1 + Math.round(Math.sin(a) * 0.6)], [-10, 0], [-12 + Math.round(Math.sin(a + 1)), 0]], 1.2, 0.7, 'mnGore', { tone: -1 });
    L([[-5 + surge, -1], [-8, 0]], 0.7, 0.6, 'mnVein', {}); D(-9, -1, mnHex('mnGore', 4));
  }
  // the far arm
  const shF = [2 + surge, -7], haF = [7 - Math.sin(a) * 3 + surge, -Math.max(0, -up) * 2], elF = [(shF[0] + haF[0]) / 2 + 1, -8.5];
  L([shF, elF, haF], 1, 0.8, skin, { tone: -1 });
  if (cling) { L([[haF[0] + 1, haF[1]], [haF[0] + 4, haF[1] - 3], [haF[0] + 5.5, haF[1] + 0.5]], 0.9, 0.35, 'mnBone', { tone: -1 }); D(haF[0] + 5.5, haF[1] + 0.5, mnHex('mnBone', 4)); }
  // the torso: a torn rib-cage, wet and raw where the legs used to be
  Q([[-5 + surge, -2], [-4 + surge, -7], [0 + surge, -10], [4 + surge, -9], [5 + surge, -5], [3 + surge, -1], [-3 + surge, 0]], skin, { band: 2 });
  E(-4.5 + surge, -2, 2.2, 2, 'mnMeat', {});
  if (!back) { for (let i = 0; i < 3; i++) { D(-1 + i * 1.5 + surge, -7 + i * 0.5, mnHex('mnFat', 3)); D(-1 + i * 1.5 + surge, -6 + i * 0.5, mnHex('mnMeat', 1)); } }
  else { for (let i = 0; i < 4; i++) D(-2 + i * 1.6 + surge, -9 + i * 0.3, mnHex('mnFat', 3)); }        // the spine through the skin
  D(-6 + surge, -1, mnHex('mnGore', 4)); D(-5 + surge, 0, mnHex('mnGore', 3));
  if (fev) { for (const [x, y] of [[-3, -5], [1, -8], [3, -4], [-1, -3], [2, -6], [-4, -7], [4, -7]]) { D(x + surge, y, mnHex('mnGore', 2)); D(x + surge + 1, y, mnHex('mnMeat', 3)); D(x + surge, y + 1, mnHex('mnGore', 3)); } N(-2 + surge, -4, 3 + surge, -8, mnHex('mnGore', 4)); D(0 + surge, -9, mnHex('mnGore', 3)); }
  if (cling) for (let i = 0; i < 4; i++) { L([[-3 + i * 2 + surge, -8.5 + i * 0.3], [-4 + i * 2 + surge, -12 + i * 0.3]], 0.8, 0.25, 'mnBone', {}); D(-4 + i * 2 + surge, -12 + i * 0.3, '#ffffff'); }   // barbs down the spine
  // the volatile sac: a swollen bladder of blood bulging out of the back
  if (vol) {
    const sx = -1 + surge, sy = -10, r = 3.6 + pul * 0.4;
    E(sx, sy, r, r * 0.85, 'fgGut', { band: 2 });
    N(sx - 2, sy + 1, sx, sy - 2, mnHex('mnVein', 2)); N(sx, sy - 2, sx + 2, sy + 1, mnHex('mnVein', 2)); N(sx - 1, sy + 2, sx + 1, sy + 2, mnHex('mnVein', 1));
    D(sx - 1.5, sy - 1.5, FG_WET); D(sx - 2, sy - 1, '#ffffff'); D(sx + 1, sy + r * 0.85 - 0.5, mnHex('mnGore', 4));
    for (let i = 0; i < 3; i++) D(sx - 2 + i * 2, sy + r * 0.85 - 1, FG_THREAD);   // stitched to the back
  }
  // the head: low and thrust forward, the jaw hanging open
  const hx = 7 + surge, hy = -9 + (ph % 2 ? 0 : 1);
  E(hx, hy, 3, 2.8, skin, {});
  if (!back) {
    Q([[hx, hy + 1], [hx + 3.5, hy + 0.5], [hx + 3, hy + 4], [hx + 0.5, hy + 3.5]], skin, { tone: -1 });
    D(hx + 1, hy - 1, fev ? '#4a0808' : '#1a0606'); D(hx + 2, hy - 1, fev ? '#ff5a30' : '#ffd070'); D(hx + 2, hy + 1, '#3a0808'); D(hx + 3, hy + 1, '#3a0808'); D(hx + 2, hy + 2, '#f4efe2'); D(hx + 3, hy + 3, mnHex('mnGore', 3));
    if (fev) { D(hx + 3, hy + 4, mnHex('mnGore', 3)); D(hx + 3, hy + 5, mnHex('mnGore', 4)); D(hx + 1, hy - 2, mnHex('mnGore', 2)); }
    if (cling) { D(hx + 4, hy + 2, mnHex('mnBone', 4)); D(hx + 4, hy, mnHex('mnBone', 3)); }
  } else { D(hx - 1, hy - 2, mnHex(skin, 1)); D(hx, hy - 2, mnHex(skin, 1)); if (fev) D(hx + 1, hy - 1, mnHex('mnGore', 2)); }
  // the near arm, reaching
  const shN = [3 + surge, -6], haN = [9 + Math.sin(a) * 3 + surge, -Math.max(0, up) * 2], elN = [(shN[0] + haN[0]) / 2 + 1, -7.5];
  L([shN, elN, haN], 1.1, 0.9, skin, {});
  if (fev) { D(elN[0], elN[1] - 1, mnHex('mnGore', 2)); D(haN[0] - 1, haN[1] - 1, mnHex('mnMeat', 3)); }
  if (cling) { L([[haN[0] + 1, haN[1]], [haN[0] + 4.5, haN[1] - 3.5], [haN[0] + 6.5, haN[1] + 1]], 1, 0.35, 'mnBone', {}); D(haN[0] + 6.5, haN[1] + 1, '#ffffff'); D(haN[0] + 4, haN[1] - 2, '#ffffff'); D(haN[0] + 2, haN[1] + 1, mnHex('mnGore', 3)); }
  else { D(haN[0] + 1, haN[1], mnHex(skin, 4)); D(haN[0] + 2, haN[1] + 1, '#1a0606'); }
  if (leap) jumpLeg(1, 0);
  if (legs) spider(1);
}
function fgLingFrame(ph, gr, view) {
  const key = 'fgl|' + ph + '|' + GRAFTS.map(g => gr[g] ? 1 : 0).join('') + '|' + view;
  return mnFrame(key, 34, 28, 16, 24, A => fgLingPaint(A, ph, gr, view));
}
{
  drawSpawnling = function (e) {
    const q = iso(e.x, e.y), hk = e.hatch > 0 && !e.fly ? 1 - e.hatch / (e.temp ? 0.15 : 0.35) : 1;
    const K = Math.max(0.2, hk) * (e.rush ? 1 + 0.6 * e.rush.swell : 1), f = e.face || 1;
    let hop = e.leap ? Math.sin(Math.min(1, e.leap.t / 0.25) * Math.PI) * 6 : 0;
    if (e.fly) { const u = clamp(e.fly.t / e.fly.dur, 0, 1); hop += Math.sin(u * Math.PI) * e.fly.h; }
    const mv = e._mlx == null ? 0 : Math.hypot(e.x - e._mlx, e.y - e._mly); e._mlx = e.x; e._mly = e.y;
    const view = mnView(e, mv), ph = Math.floor((e.wob || 0) / 1.5) % 4;
    const X = Math.round(q.sx), Y = Math.round(q.sy - hop - (e.cling ? 6 : 0));
    const gr = {}; for (const g of GRAFTS) gr[g] = !e.puke && graftOn(g);   // the golem's puked swarmlings are plain
    shadow(e.x, e.y, e.r * K);
    if (e.frenzyT > 0 || e.rush) { ctx.globalCompositeOperation = 'lighter'; glow(X, Y - 5 * K, 10 * K, '255,70,90', 0.35 + 0.15 * Math.sin(G.time * 18)); ctx.globalCompositeOperation = 'source-over'; }
    else if (gr.fevered) { ctx.globalCompositeOperation = 'lighter'; glow(X, Y - 5 * K, 8 * K, '255,90,60', 0.18 + 0.1 * Math.sin(G.time * 9 + e.x)); ctx.globalCompositeOperation = 'source-over'; }
    if (gr.volatile && Math.random() < 0.03) parts.push({ x: e.x, y: e.y, z: 9, vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: 2, t: 0.3, col: '#b8404a' });
    const fr = fgLingFrame(ph, gr, view), r = mnBlit(fr, X, Y, f, e.hurt > 0, e.temp ? 0.85 : 1, K === 1 ? 1 : K);
    if (e.temp) { ctx.fillStyle = '#c24050'; ctx.fillRect(X - 1, r.y - 2, 2, 2); }
    if (e.biteT > 0) { e.biteT -= 0.016; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(X + f * 9), Math.round(Y - 8), 1, 1); }
    if (e.hp < e.max && !e.temp) { const bw = 10, by = r.y - 3; ctx.fillStyle = '#0e0d12'; ctx.fillRect(X - 5, by, bw, 1); ctx.fillStyle = '#e89aa0'; ctx.fillRect(X - 5, by, Math.round(bw * e.hp / e.max), 1); }
    return r;
  };
}

// ------------------------------------------------------------------- the leeches, fat and glossy
// a leech: a fat segmented slug, oil-black with a violet sheen, a red sucker at the front, swelling as it drinks (fat 0..3)
pmat('fgLeech', ['#08040a', '#1e1020', '#38203a', '#5a3a5c', '#8a6488']);
function fgLeechFrame(ph, fat, view) {
  return mnFrame('fglee|' + ph + '|' + fat + '|' + view, 20, 12, 10, 10, A => {
    const K = mnKit(A, 10, 10, 1), { E, D, N, L } = K, s = 1 + fat * 0.28, sq = ph ? 1.12 : 0.92, back = view === 'back';
    for (let i = 0; i < 4; i++) { const x = (i - 1.5) * 2.1 * s * sq, w = (2 - Math.abs(i - 1.5) * 0.35) * s; E(x, -1.6 * s, w, 1.7 * s / sq, 'fgLeech', { band: 1 }); }
    E(-0.5, -0.9 * s, 3.6 * s * sq, 0.9 * s, 'fgLeech', { tone: -1 });
    N(-3 * s * sq, -2.4 * s, 3 * s * sq, -2.4 * s, mnHex('fgLeech', 3));
    for (let i = 0; i < 3; i++) D((i - 1) * 2.1 * s * sq, -2.9 * s, i === 1 ? '#ffffff' : mnHex('fgLeech', 4));
    D(3.6 * s * sq, -1.2 * s, back ? mnHex('fgLeech', 2) : '#c42a32'); D(4.2 * s * sq, -1.4 * s, back ? mnHex('fgLeech', 1) : '#ff8a7a');
    if (fat >= 2) { E(-1, -1.5 * s, 1.6 * s, 1.1 * s, 'mnGore', { tone: -1, contour: false }); D(-1.5, -2 * s, mnHex('mnGore', 4)); }
  });
}
{
  drawLeech = function (l) {
    const q = iso(l.x, l.y), latched = l.state === 'latch', z = latched ? 9 : 0, fat = Math.min(3, Math.floor(l.store / Math.max(1, HS.leechFill()) * 3.99)), f = l.face || 1;
    const X = Math.round(q.sx), Y = Math.round(q.sy + 1 - z), ph = Math.floor(l.ph / 2.5) % 2;
    if (!latched) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(X - 3, Math.round(q.sy + 1), 7, 1); }
    const mv = l._lx == null ? 0 : Math.hypot(l.x - l._lx, l.y - l._ly); l._lx = l.x; l._ly = l.y;
    const fr = fgLeechFrame(ph, fat, latched ? 'front' : mnView(l, mv));
    mnBlit(fr, X, Y, f, l.hurt > 0, 1);
    if (fat >= 2) { ctx.globalCompositeOperation = 'lighter'; glow(X, Y - 2, 5 + fat, '200,40,60', 0.22); ctx.globalCompositeOperation = 'source-over'; }
  };
}

// ------------------------------------------------------------------- the skill text
Object.assign(SK.hatch, { desc: 'With no flesh near the cursor, hold it to bleed a brood out of yourself: a swarmling every moment, paid in Vitae and the rest in life (the fuller your Vitae, the less life; never the last of it). Otherwise: split open the corpses and tumors around the cursor: each corpse spills out spawnlings, torn torsos that crawl on their hands, and each tumor a whole clutch. V opens the Flesh panel: grafts, orders and the golem.' });
Object.assign(SK.spool, { name: 'The Suckling Clots', kind: 'passive', mana: 0, desc: 'Fat leeches live in your sleeves. Whenever you wound an enemy one may drop out and crawl to the wound, latch on and drink its fill, then crawl back up your arm and feed you what it drank as life and Vitae. Levels: more leeches out at once, more drink, faster crawling.',
  perks: [{ l: 5, v: 'fatleech', name: 'Fat Leeches', desc: 'Leeches drink half again as fast.' }, { l: 10, v: 'leechmore', name: 'Leech Mother', desc: 'Two more leeches out at once.', stat: ['vit', 55] }] });
{ const i = RIGHT_SKILLS.indexOf('spool'); if (i >= 0) RIGHT_SKILLS.splice(i, 1); }
Object.assign(SK.vwhip, { name: 'Root Veins', desc: 'A burst of red veins erupts from your bandaged forearm like roots and snakes out to several enemies at once. Each vein bites its target and leaves it bleeding; some hold on and squeeze the blood out for a moment. Veins that reach nothing thrash in the air and bleed small pools onto the ground. Levels: more veins, longer reach, harder bites.',
  perks: [{ l: 5, v: 'veinlong', name: 'Strangling Roots', desc: 'Every vein that bites holds and squeezes, half again as long.' }, { l: 10, v: 'veinhook', name: 'Hooked Roots', desc: 'One more vein, and each vein drags what it bites a yard toward you.', stat: ['spi', 50] }] });
if (typeof ARC !== 'undefined' && ARC.h_leech) { ARC.h_leech.up = 'Root Veins drain 2% of your life for every enemy they bite.'; ARC.h_leech.rev = 'Ranged: the veins shoot out as a hooked tendril up to 7 yd and drag the first enemy to you.'; }
if (typeof ARC !== 'undefined' && ARC.l_lash) ARC.l_lash.up = 'Root Veins\' bleeding lasts twice as long.';
Object.assign(SK.fgolem, {
  desc: 'Sew a hulking brood-beast out of corpses and chitin, a vast gut-maw stitched shut down its belly. Its gut holds brood stock: when enemies come near it tears the stitches open and pukes up a gout of blood and bile full of swarmlings that fall on them. It seeks out corpses and eats them to refill its stock and heal, and its gut swells as it fills. It crushes enemies with its chitin fist, hurls its bulk at those a few yards off, and swallows enemies whole to digest them. It can wear one of your mutations (Flesh panel, V). It never dies for good: at zero life it slumps into a heap and regrows (at least 10 s). Cast it on the golem or its heap to feed it your life: that heals it, or quickens the regrowth. Cast elsewhere to send it to the cursor.',
  perks: [{ l: 5, v: 'sacs', name: 'Bottomless Gut', desc: 'Its gut holds far more brood stock, every meal fills it further, and each puke spills two more swarmlings.' }, SK.fgolem.perks[1], SK.fgolem.perks[2]]
});
