
// =================================================================== v0.23: heroes in 32-bit pixel art
// Each hero is painted at one pixel to one game pixel on a 36x50 frame, feet at (16, 47), facing right. A shared
// rig gives the joints for every pose: idle (4 frames of breath), walk (8), cast (4: gather, lift, thrust, hold) and
// strike (4: draw back, raise, cut, follow through). Gear changes the painting: the plain starting clothes, a robe,
// mail, a hood or mask, the weapon in hand, gold trim on rare and unique pieces.
const H32 = {};
pmat('hSkin', ['#2a1416', '#5a3228', '#8a5642', '#b87c5c', '#dca27a']);
pmat('hSkinPale', ['#1e1a1e', '#4a4248', '#7a6e70', '#a89a96', '#d0c4bc']);
pmat('hHair', ['#0c080a', '#1a1216', '#2a2026', '#443640', '#5c4a56']);
pmat('hRobe', ['#1a050a', '#3a0b15', '#5e1422', '#86222e', '#ae3a38']);
pmat('hSack', ['#120e0a', '#2a2218', '#44382a', '#62523c', '#7e6c50']);
pmat('hBand', ['#2a241e', '#5a5044', '#8a7e6a', '#b0a488', '#d4c8aa']);
pmat('hRope', ['#1e160c', '#3a2a16', '#6a5030', '#9a7a4a', '#b8986a']);
pmat('hLea', ['#120a06', '#2a1a10', '#46301e', '#644630', '#80603e']);
pmat('hLeaRed', ['#16080a', '#3a1414', '#5e2220', '#86362c', '#a8503c']);
pmat('hIron', ['#0e0e12', '#262830', '#464a56', '#7a808e', '#c4c8d2']);
pmat('hBone', ['#2a261e', '#6a6250', '#a89c80', '#d8ceb0', '#f4eedc']);
pmat('hWood', ['#120a06', '#2e1c10', '#4a3020', '#6a4a30', '#8a6844']);
pmat('hGold', ['#2a1a06', '#6a4410', '#a8741e', '#d8a83a', '#fff0a0']);
pmat('hSteel', ['#101218', '#2a3040', '#4a5468', '#8a96aa', '#dde4ee']);
const H32B = '#8e141a', H32B2 = '#c42a22', H32EYE = '#ff6a40';
// view (v0.24): 'front' and 'back' are the 3/4 views (toward us / away, facing right), 'side' the profile, 'down' and
// 'up' walking straight toward us / straight away. The painters draw 'front', 'side' and 'down' with the front
// painting and 'back' and 'up' with the back one (J.back); the rig moves the joints to suit the view.
function rig32(pose, ph, view) {
  const walk = pose === 'walk', a = (walk ? ph / 8 : ph / 4) * Math.PI * 2;
  const sw = walk ? Math.sin(a) : 0, bob = walk ? Math.round(-Math.abs(Math.cos(a)) * 1.2 + 0.6) : 0, br = pose === 'idle' && (ph === 1 || ph === 2) ? 1 : 0;
  const Y = v => v + bob + (v < 30 ? br : 0);
  let lean = 0;
  if (pose === 'atk') lean = [-1, -1, 2, 1][ph % 4]; else if (pose === 'cast') lean = [0, 0, 1, 1][ph % 4];
  const J = { sw, bob, br, pose, ph, walk, cast: pose === 'cast', atk: pose === 'atk', lean };
  J.head = [18 + lean, Y(8)]; J.neck = [17 + lean, Y(13)]; J.chest = [17 + lean, Y(18)]; J.waist = [16, Y(25)]; J.hip = [16, Y(28)];
  J.shN = [22 + lean, Y(15)]; J.shF = [11 + lean, Y(15)];
  if (walk) {
    const lift = Math.max(0, Math.sin(a + Math.PI / 2)), liftF = Math.max(0, -Math.sin(a + Math.PI / 2));
    J.ankN = [18 + sw * 5, 45 - lift * 2]; J.kneeN = [18 + sw * 3 + lift, 37 - lift]; J.ankF = [14 - sw * 5, 45 - liftF * 2]; J.kneeF = [14 - sw * 3 + liftF, 37 - liftF];
  } else if (J.atk && ph >= 2) { J.ankN = [22, 45]; J.kneeN = [21, 37]; J.ankF = [12, 45]; J.kneeF = [13, 37]; }
  else { J.ankN = [19, 45]; J.kneeN = [19, 37]; J.ankF = [14, 45]; J.kneeF = [14, 37]; }
  const asw = walk ? -Math.sin(a - 0.4) * 2.5 : 0;
  J.elN = [22 + asw, Y(21)]; J.haN = [23 + asw * 1.6, Y(27)]; J.elF = [11 - asw, Y(21)]; J.haF = [11 - asw * 1.6, Y(27)];
  if (J.cast) {
    const C = [[[21, 22], [21, 20], [15, 21], [18, 21]], [[24, 18], [26, 15], [13, 20], [15, 23]], [[26, 18], [31, 18], [13, 21], [12, 26]], [[25, 19], [30, 19], [12, 22], [12, 27]]][ph % 4];
    J.elN = [C[0][0], Y(C[0][1])]; J.haN = [C[1][0], Y(C[1][1])]; J.elF = [C[2][0] + lean, Y(C[2][1])]; J.haF = [C[3][0] + lean, Y(C[3][1])];
  }
  if (J.atk) {
    const K = [[[16, 18], [12, 20]], [[19, 11], [16, 5]], [[26, 20], [30, 25]], [[24, 24], [27, 31]]][ph % 4];
    J.elN = [K[0][0], Y(K[0][1])]; J.haN = [K[1][0], Y(K[1][1])]; J.elF = [10 + lean, Y(21)]; J.haF = [9 + lean, Y(26)];
  }
  const V = view || 'front', lift = walk ? Math.max(0, Math.sin(a + Math.PI / 2)) : 0, liftF = walk ? Math.max(0, -Math.sin(a + Math.PI / 2)) : 0;
  if (V === 'front' || V === 'back') {
    // 3/4: the stride runs a little into the depth too; the leading foot lower toward us, higher going away
    if (walk) { const d = V === 'front' ? 0.9 : -0.9; J.ankN[1] += sw * d; J.ankF[1] -= sw * d; J.kneeN[1] += sw * d * 0.5; J.kneeF[1] -= sw * d * 0.5; }
  } else if (V === 'side') {
    // profile: the shoulders turn edge-on and the arms hang at the body's sides; a longer stride from under the hips
    const dS = 3;
    J.shN = [J.shN[0] - dS, J.shN[1]]; J.shF = [J.shF[0] + dS, J.shF[1]];
    J.elF = [J.elF[0] + dS, J.elF[1]]; J.haF = [J.haF[0] + dS, J.haF[1]];
    if (!J.cast && !J.atk) { J.elN = [J.elN[0] - dS + asw * 0.3, J.elN[1]]; J.haN = [J.haN[0] - dS + asw * 0.5, J.haN[1]]; J.elF[0] -= asw * 0.3; J.haF[0] -= asw * 0.5; }
    if (walk) {
      J.ankN = [17 + sw * 6, 45 - lift * 2.2]; J.kneeN = [17 + sw * 3.6 + lift * 1.2, 37 - lift * 1.2];
      J.ankF = [15 - sw * 6, 45 - liftF * 2.2]; J.kneeF = [15 - sw * 3.6 + liftF * 1.2, 37 - liftF * 1.2];
    } else if (!(J.atk && ph >= 2)) { J.ankN = [18, 45]; J.kneeN = [18, 37]; J.ankF = [15, 45]; J.kneeF = [15, 37]; }
  } else if ((V === 'down' || V === 'up') && !J.atk) {
    // straight toward us or away. frame32 builds these from the right half of the body (the near side, at x >= AX32)
    // and the same half painted half a stride later and mirrored for the left, so the rig squares the body to the
    // axis: the spine on it, the head set so its near eye falls just past it, the near shoulder, arm and leg to the
    // right. The stride runs up and down the screen: the leading foot lower toward us (down) or higher going away
    // (up), the lifted knee drawn up, the arms swinging in depth.
    const s2 = V === 'down' ? 1 : -1, c = AX32;
    J.head = [c - (V === 'down' ? 3 : 2), J.head[1]]; J.neck = [c, J.neck[1]]; J.chest = [c, J.chest[1]]; J.waist = [c, J.waist[1]]; J.hip = [c, J.hip[1]];
    J.shN = [c + 5.5, J.shN[1]]; J.shF = [c - 5.5, J.shF[1]];
    if (!J.cast) {
      const ay = walk ? asw * 0.6 * s2 : 0;
      J.elN = [c + 6.5, Y(21) + ay * 0.5]; J.haN = [c + 7, Y(27) + ay]; J.elF = [c - 6.5, Y(21) - ay * 0.5]; J.haF = [c - 7, Y(27) - ay];
    } else { J.elF = [c - 6.5, J.elF[1]]; J.haF = [c - 7, J.haF[1]]; }
    if (walk) {
      J.ankN = [c + 2.5, 45 + s2 * sw * 1.8 - lift * 1.6]; J.kneeN = [c + 2.5 + lift * 0.3, 37 + s2 * sw * 0.9 - lift * 1.8];
      J.ankF = [c - 2.5, 45 - s2 * sw * 1.8 - liftF * 1.6]; J.kneeF = [c - 2.5 + liftF * 0.3, 37 - s2 * sw * 0.9 - liftF * 1.8];
    } else { J.ankN = [c + 2.5, 45]; J.kneeN = [c + 2.5, 37]; J.ankF = [c - 2.5, 45]; J.kneeF = [c - 2.5, 37]; }
  }
  return J;
}
// the weapon in the near hand (v0.34: worked to the golem's finish - lit edges, a hard glint, fittings)
function weapon32(A, g, J) {
  const [hx, hy] = J.haN, [ex, ey] = J.elN;
  let ang = J.atk ? Math.atan2(hy - ey, hx - ex) : J.cast ? -0.6 : 1.1;      // idle: pointing down and forward
  if (J.atk && J.ph === 1) ang = -1.9;
  const at = (d, s = 0) => [hx + Math.cos(ang) * d - Math.sin(ang) * s, hy + Math.sin(ang) * d + Math.cos(ang) * s];
  if (g.wpn === 'dagger') {
    // a leaf blade: a lit edge and a dark one, a fuller, a hard glint; a brass guard with a boss, a cord-bound grip
    const b1 = at(10.5);
    A.poly([at(2, -1.2), at(7, -1.3), b1, at(7, 1.1), at(2, 1.2)], 'hSteel', { hi: true, band: 1 });
    for (let d = 3; d < 8; d++) { const p = at(d, -0.5), q = at(d, 0.6); A.px(p[0], p[1], '#dde4ee'); A.px(q[0], q[1], '#2a3040'); }
    const gl = at(5, -0.4); A.px(gl[0], gl[1], '#ffffff'); A.px(b1[0], b1[1], '#ffffff');
    const g0 = at(1.5, -2.2), g1 = at(1.5, 2.2); A.line(g0[0], g0[1], g1[0], g1[1], '#a8741e'); A.px(g0[0], g0[1], '#fff0a0'); A.px(g1[0], g1[1], '#6a4410');
    const bs = at(1.5); A.px(bs[0], bs[1], '#fff0a0');
    for (let d = 0; d > -2.5; d -= 0.8) { const p = at(d); A.px(p[0], p[1], d > -1 ? '#6a4a30' : '#2e1c10'); }
    const pm = at(-2.6); A.px(pm[0], pm[1], '#d8a83a');
  } else if (g.wpn === 'wand') {
    const b = at(9); A.limb([at(-1), b], 0.9, 0.6, 'hBone', {});
    for (let d = 1; d < 8; d += 2.5) { const p = at(d, 0.4); A.px(p[0], p[1], '#6a6250'); }
    const k = at(2.5); A.px(k[0], k[1], '#a8741e');
    A.px(b[0], b[1], '#ffb080'); const c = at(8); A.px(c[0], c[1], '#ff6040');
  } else if (g.wpn === 'staff') {
    // held upright: a black wood staff bound in cord, brass ferrules, a skull at the head
    const top = [hx + 1, hy - 26], bot = [hx - 1, Math.min(47, hy + 12)];
    if (J.atk && J.ph >= 2) { top[0] = hx + 16; top[1] = hy - 6; bot[0] = hx - 8; bot[1] = hy + 4; }
    A.limb([bot, top], 0.9, 0.8, 'hWood', {});
    for (const u of [0.18, 0.62, 0.97]) { const p = zlerp32(top, bot, u); A.px(p[0], p[1], '#d8a83a'); A.px(p[0] + 1, p[1], '#6a4410'); }
    A.ell(top[0], top[1] - 2, 2.6, 2.4, 'hBone', {}); A.px(top[0] + 1, top[1] - 2, '#1a0c08'); A.px(top[0] - 1, top[1] - 2, '#1a0c08'); A.px(top[0] + 1, top[1] - 2, '#ff6040');
    A.px(top[0] - 1, top[1] - 4, '#f4eedc'); A.px(top[0], top[1], '#1a0c08');
    for (let i = 0; i < 3; i++) A.px(top[0] - 0.2 * i, top[1] + 4 + i, i % 2 ? '#6a5030' : '#b8986a');
  } else if (g.wpn === 'claw' || g.wpn === 'talons') {
    const n = g.wpn === 'talons' ? 3 : 2;
    for (let i = 0; i < n; i++) { const s = (i - (n - 1) / 2) * 1.3, a0 = at(1, s), a1 = at(7, s * 1.3 + 1), a2 = at(9, s * 1.3 + 2.5); A.line(a0[0], a0[1], a1[0], a1[1], '#8a96aa'); A.line(a1[0], a1[1], a2[0], a2[1], '#dde4ee'); A.px(a2[0], a2[1], '#ffffff'); }
    const w = at(0.5); A.px(w[0], w[1], '#a8741e');
  }
}
const zlerp32 = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
const h32hex = (m, i) => { const c = PMAT[m][Math.max(0, Math.min(4, i))]; return `rgb(${c[0]},${c[1]},${c[2]})`; };
// ---- v0.34 finishing kit for the Pix32 heroes (see Pix32 below)
// cloth folds clipped to one part: each fold runs from (x0, y0) to (x1, y1) as a dark seam with a lit ridge beside it
// (on its upper-left, where the light comes from); the silhouette's own edge shading is left alone
function h32Folds(A, id, folds) {
  A.fx(id, (x, y, e) => {
    if (e.l === 1 || e.r === 1 || e.b === 1) return null;
    for (const f of folds) {
      const [x0, y0, x1, y1] = f; if (y < y0 || y > y1) continue;
      const fx = Math.round(x0 + (x1 - x0) * (y - y0) / Math.max(1, y1 - y0) - 0.5);
      if (x === fx) return f[4] != null ? f[4] : (y - y0 < (y1 - y0) * 0.25 ? 1 : 0);
      if (x === fx - 1 && e.k >= 2 && y - y0 > 1 && y - y0 < (y1 - y0) * 0.6) return 3;
    }
    return null;
  });
}
// a band along a part's lower edge (a hem, a cuff), following its ragged line: fn(x, row, y) with row 1 on the edge
function h32Hem(A, id, rows, fn) { A.fx(id, (x, y, e) => e.b <= rows ? fn(x, e.b, y, e) : null); }
// a skirt hung from the waist, pushed by the near knee and trailing behind; returns { id, front, back }
function h32Skirt(A, J, mat, hem, o) {
  o = o || {};
  const [wx, wy] = J.waist, ww = o.ww || 5, front = Math.max(J.kneeN[0] + (o.fw || 3), o.fmin || 21), back = Math.min(J.kneeF[0] - (o.bw || 4), o.bmax || 10) - (J.walk ? 1 : 0);
  const pts = [[wx - ww, wy], [wx + ww, wy], [front, hem - 1]], n = o.teeth || 7, rag = o.rag || [0, 1];
  for (let i = 0; i < n; i++) { const u = i / (n - 1); pts.push([front - (front - back) * u, hem + rag[i % rag.length]]); }
  pts.push([back, hem], [wx - ww - 1, wy + 6]);
  const id = A.poly(pts, mat, { band: 2, tone: o.tone || 0, grain: o.grain });
  A.fx(id, (x, y, e) => e.k === 4 && e.b <= 3 ? 2 : null);
  return { id, front, back };
}

// =================================================================== the Hemomancer (v0.34)
// A penitent of the red houses: barefoot in sackcloth, a knotted scourge at the rope belt, strands of trade beads, a
// paket - a satin charm-bundle tied with ribbon, sewn with sequins and crowned with a feather - at the hip, white
// chalk marks on the face and a madras wrap over the locs. When the blood rises the eyes roll back to the whites.
// With a robe the sackcloth turns to red, its hem embroidered with white veve crosses over a row of gold sequins;
// in mail a cuirass of red hide, bone laid across it, iron studs.
pmat('hmSkin', ['#1c0c0a', '#46241c', '#74402e', '#a0664a', '#c88e66']);
pmat('hmSack', ['#120c0a', '#2e2418', '#4e3f2a', '#70603f', '#968058']);
pmat('hmRed', ['#1a0408', '#420e18', '#6c1824', '#962a30', '#c04c3c']);
pmat('hmMad', ['#2a0808', '#681414', '#a42424', '#d0463a', '#ee8468']);
pmat('hmSatin', ['#0e0818', '#281a48', '#44307c', '#6a56ae', '#a690de']);
pmat('hmLinen', ['#2e2a26', '#6a6258', '#a89e8a', '#d4ccb6', '#f4eedc']);
const h32Madras = (x, y, e) => e.l === 1 || e.t === 1 ? null : ((x + y) % 4 === 0 && (x - y) % 4 === 0 && e.k >= 2 ? '#f0cc9c' : ((x - y) % 4 === 0 ? 1 : ((x + y) % 4 === 0 ? (e.k >= 3 ? '#e07a4a' : 1) : null)));
const HM_WHITE = '#efe8d6', HM_EYE = '#f6f2e6', HM_BEADS = ['#efe8d6', '#3a6ab8', '#c42a22', '#efe8d6', '#d8a83a', '#1a1418'];
function h32HemoKit(A, J, g) {
  const X = h32hex, T = g.tier, sw = J.walk ? J.sw : 0;
  const K = {
    // bare feet (penitent), sandals on a robe, iron-shod boots in mail
    foot(ax, ay, t, back) {
      if (back) {
        if (T === 2) A.poly([[ax - 2, ay - 4], [ax + 1.2, ay - 4], [ax + 1.5, ay - 1.5], [ax + 2.8, ay + 0.5], [ax + 2.3, ay + 2], [ax - 2, ay + 2]], 'hLea', { tone: t });
        else A.poly([[ax - 2, ay - 1.5], [ax + 1, ay - 1.5], [ax + 2.5, ay + 0.5], [ax + 2, ay + 2], [ax - 2, ay + 2]], 'hmSkin', { tone: t });
        A.px(ax - 1, ay, X(T === 2 ? 'hLea' : 'hmSkin', t ? 2 : 4));
        if (T === 2) { A.px(ax - 1, ay - 3, '#c4c8d2'); A.px(ax, ay - 3, '#464a56'); }
        return;
      }
      if (T === 2) {
        A.poly([[ax - 1.8, ay - 4], [ax + 1.2, ay - 4], [ax + 1.5, ay - 1.5], [ax + 3.8, ay + 0.5], [ax + 3.8, ay + 2], [ax - 1.8, ay + 2]], 'hLea', { tone: t });
        A.line(ax - 1.5, ay - 1.5, ax + 1, ay - 1.5, '#464a56'); A.px(ax + 2.5, ay, t ? '#7a808e' : '#dde4ee'); A.px(ax, ay - 3, t ? '#7a808e' : '#c4c8d2');
      } else {
        A.poly([[ax - 1.5, ay - 1.5], [ax + 1, ay - 1.5], [ax + 3.5, ay + 0.5], [ax + 3.8, ay + 2], [ax - 1.5, ay + 2]], 'hmSkin', { tone: t });
        A.px(ax + 3, ay + 1, X('hmSkin', t ? 2 : 4)); A.px(ax + 2, ay + 2, X('hmSkin', 0)); A.px(ax + 1, ay + 2, X('hmSkin', 0));   // toes
        if (T === 1) { A.line(ax - 1.5, ay + 2, ax + 3.5, ay + 2, X('hLea', 1)); A.px(ax + 1, ay, X('hLea', 3)); A.px(ax, ay - 1, X('hLea', 2)); }
        else { A.px(ax - 1, ay - 2, X('hRope', 3)); A.px(ax, ay - 2, X('hRope', 1)); A.px(ax + 1, ay + 1, '#5a0a10'); }   // an ankle cord, a raw toe
      }
    },
    // strands of trade beads, sagging from (x0, y) to (x1, y)
    beads(x0, x1, y, sag, off) {
      const n = Math.round(x1 - x0);
      for (let i = 0; i <= n; i++) { const u = i / n, yy = y + Math.sin(u * Math.PI) * sag; A.px(x0 + i, yy, HM_BEADS[(i + off) % 5]); }
    },
    // the paket: a satin bulb tied off with ribbon, sequins, a feather standing out of its neck
    paket(px, py, t) {
      A.ell(px, py + 2.2, 2.1, 2.3, 'hmSatin', { tone: t, band: 1 });
      A.px(px - 1, py + 1, t ? '#a690de' : '#d8ccff'); A.px(px + 1, py + 3, '#ffffff'); A.px(px - 1, py + 3.5, '#d8a83a'); A.px(px + 0.5, py + 1.5, '#fff0a0');
      A.line(px - 1, py, px + 1, py, '#c42a22'); A.px(px + 1.5, py + 0.5, '#8e141a'); A.px(px + 2, py + 1.5, '#c42a22');   // the ribbon, its tail
      A.px(px, py - 1, '#1a1418'); A.px(px - 0.5, py - 2, '#3a3440'); A.px(px - 1, py - 3, HM_WHITE);                        // the feather
    },
    // the scourge: three knotted cords from a wrapped grip hanging off the belt
    scourge(x, y, sway) {
      A.px(x, y, X('hRope', 1)); A.px(x, y + 1, X('hRope', 3)); A.px(x, y + 2, X('hRope', 1));
      for (let k = 0; k < 2; k++) {
        const ex = x - 1 + k * 2 + sway, ey = y + 8 - (k === 1 ? 0 : 1);
        for (let i = 1; i <= 5; i++) { const u = i / 5, p = [x + (ex - x) * u, y + 3 + (ey - y - 3) * u]; A.px(p[0], p[1], i === 3 || i === 5 ? X('hRope', 3) : X('hLea', 1)); }
        A.px(ex, ey + 1, '#5a0a10');
      }
    },
    // a bandaged forearm: linen wound in diagonal turns, blood seeping through one of them
    wraps(id, flip) { A.fx(id, (x, y, e) => e.l === 1 || e.r === 1 ? null : ((x * (flip ? -1 : 1) + y) % 3 === 0 ? 1 : null)); },
  };
  return K;
}
H32.hemomancer = function (A, J, g) {
  if (J.back) return h32HemoBack(A, J, g);
  const T = g.tier, ph = J.ph, sw = J.walk ? J.sw : 0, X = h32hex, K = h32HemoKit(A, J, g);
  const robe = T ? 'hmRed' : 'hmSack', SK = 'hmSkin', sk = i => X(SK, i);
  const [hx, hy] = J.head, [nx, ny] = J.neck, [cx, cy] = J.chest, [wx, wy] = J.waist;
  // far arm, in shadow: bare, a cord bracelet
  A.limb([J.shF, J.elF], 1.9, 1.6, SK, { tone: -1, contour: false });
  A.limb([J.elF, J.haF], 1.5, 1.3, SK, { tone: -1 });
  A.ell(J.haF[0], J.haF[1] + 1, 1.3, 1.3, SK, { tone: -1 });
  { const m = zlerp32(J.elF, J.haF, 0.8); A.px(m[0], m[1], HM_BEADS[1]); A.px(m[0] + 1, m[1], HM_BEADS[0]); }
  // legs and bare feet under the hem
  for (const [k, a, far] of [['kneeF', 'ankF', true], ['kneeN', 'ankN', false]]) {
    const [ax, ay] = J[a], t = far ? -1 : 0;
    A.limb([J[k], [ax, ay - 1]], 1.3, 1.1, SK, { tone: t });
    K.foot(ax, ay, t, false);
  }
  // the skirt: sackcloth to the ankle, its hem frayed and soaked dark with blood; red at tier 1+, embroidered
  const hem = 43, S = h32Skirt(A, J, robe, hem, { rag: T ? [0, 1] : [0, 1, 0, 2, 1, 0, 1], teeth: T ? 7 : 9, grain: T ? 0 : 0.12 });
  const fs = J.walk ? sw * 0.9 : 0;
  h32Folds(A, S.id, [[wx - 2, wy + 3, wx - 3.5 - fs * 0.4, hem - 1], [wx + 1, wy + 4, wx + 1.5 + fs, hem - 1], [wx + 3.5, wy + 3, S.front - 3 + fs, hem - 1], [wx - 4.5, wy + 7, S.back + 2, hem]]);
  if (T === 0) h32Hem(A, S.id, 3, (x, r) => r === 1 ? ((x & 1) ? '#3a0a0e' : '#5a1216') : r === 2 ? ((x % 3) ? '#4a1214' : null) : ((x % 4 === 1) ? '#5a1a16' : null));
  else {
    // a row of gold sequins on the hem, and above it white veve crosses stitched in a band
    h32Hem(A, S.id, 6, (x, r, y, e) => {
      if (r === 1) return g.trim ? ((x & 1) ? '#fff0a0' : '#a8741e') : ((x & 1) ? '#d8a83a' : '#6a4410');
      if (r === 2) return (x % 3 === 0) ? '#fff0a0' : (x % 3 === 1 ? '#a8741e' : null);
      if (r === 3) return X(robe, 0);
      const c = ((x % 4) + 4) % 4;
      if (r === 5) return c === 1 ? HM_WHITE : null;
      if (r === 4) return c === 0 || c === 2 ? '#b8ae9c' : c === 1 ? HM_WHITE : null;
      if (r === 6) return c === 1 ? '#b8ae9c' : null;
      return null;
    });
  }
  // torso: a sack tunic, a red robe, or the red-hide cuirass
  const tid = A.poly([[J.shF[0] - 1, J.shF[1]], [nx - 1, ny + 1], [nx + 2, ny + 1], [J.shN[0] + 1, J.shN[1]], [cx + 5, cy + 1], [wx + 5, wy + 1], [wx - 5, wy + 1], [cx - 5, cy + 1]], robe, { band: 2, grain: T ? 0 : 0.12 });
  h32Folds(A, tid, [[cx - 2, cy - 1, cx - 3, wy], [cx + 3, cy + 1, cx + 3.5, wy]]);
  // the neck opening: bare skin, a collarbone lit
  A.poly([[nx - 0.5, ny + 1], [nx + 3, ny + 1], [nx + 1.5, cy + 1.5]], SK, {});
  A.px(nx + 2, ny + 1.5, sk(4)); A.px(nx + 1, cy, sk(1));
  if (T === 0) {   // a chalk veve on the breast: a cross with a dot in each quarter
    const vx = cx + 1, vy = cy + 2;
    A.line(vx, vy - 2, vx, vy + 2, HM_WHITE); A.line(vx - 2, vy, vx + 2, vy, HM_WHITE);
    A.px(vx - 1, vy - 1, '#b8ae9c'); A.px(vx + 1, vy + 1, '#b8ae9c'); A.px(vx + 1, vy - 1, '#b8ae9c'); A.px(vx - 1, vy + 1, '#b8ae9c'); A.px(vx, vy - 3, '#b8ae9c');
    A.px(cx - 3, cy + 4, X(robe, 4)); A.line(cx - 4, cy + 5, cx - 2, cy + 6, X(robe, 0));   // a darned rent
  } else if (T === 1) {   // the robe's front: an embroidered placket, a white veve on the breast
    A.line(nx + 1, cy + 2, wx + 1, wy - 1, X('hmRed', 0)); A.line(nx + 2, cy + 2, wx + 2, wy - 1, X('hmRed', 3));
    A.px(nx + 2, cy + 4.5, '#d8a83a'); A.px(nx + 2, cy + 6.5, '#a8741e');
    if (g.trim) { A.px(nx + 2, cy + 3, '#fff0a0'); A.px(nx + 2, cy + 6, '#d8a83a'); }
  } else {   // tier 2: the red-hide cuirass, ribs of bone lashed across it, iron studs at the corners
    const cu = A.poly([[cx - 4.5, cy - 2], [cx + 4.5, cy - 2.5], [cx + 5, wy - 0.5], [cx - 4.5, wy]], 'hLeaRed', { band: 2 });
    h32Folds(A, cu, [[cx + 0.5, cy - 1, cx + 0.5, wy - 1, 0]]);
    for (let i = 0; i < 3; i++) { const y = cy - 0.5 + i * 2.2; A.line(cx - 3, y, cx + 3.5, y - 0.5, X('hBone', 3)); A.px(cx - 3, y, X('hBone', 4)); A.px(cx + 3.5, y + 0.5, X('hBone', 1)); A.px(cx, y + 1, '#2a0c0c'); }
    for (const [x, y] of [[cx - 4, cy - 1.5], [cx + 4, cy - 2], [cx - 4, wy - 1], [cx + 4.5, wy - 1]]) { A.px(x, y, '#c4c8d2'); A.px(x + 1, y + 1, '#262830'); }
    if (g.trim) { A.px(cx - 4, cy - 1.5, '#fff0a0'); A.px(cx + 4, cy - 2, '#fff0a0'); }
  }
  // strands of trade beads round the neck
  K.beads(nx - 2, nx + 4, ny + 1.5, 2.2, 0); K.beads(nx - 1, nx + 4, ny + 2.5, 3.6, 2);
  A.px(nx + 1.5, ny + 6.5, '#d8a83a'); A.px(nx + 1.5, ny + 7.5, '#8e141a');   // a brass medal on the long strand
  // the rope belt, knotted, the scourge and the paket hanging from it
  const bid = A.poly([[wx - 5.5, wy - 0.5], [wx + 5.5, wy - 0.5], [wx + 5.5, wy + 1.5], [wx - 5.5, wy + 1.5]], T === 2 ? 'hLea' : 'hRope', {});
  A.fx(bid, (x, y, e) => T === 2 ? null : ((x + y) % 2 ? 1 : (e.t === 1 ? 4 : null)));   // the twist of the rope
  if (T === 2) { A.px(wx + 1, wy, g.trim ? '#fff0a0' : '#dde4ee'); A.px(wx + 1, wy + 1, '#464a56'); A.px(wx + 2, wy + 0.5, '#7a808e'); }
  A.ell(wx + 2, wy + 1, 1.3, 1.2, 'hRope', {});   // the knot
  const kx = wx + 2, ks = J.walk ? Math.round(sw) : 0;
  A.line(kx, wy + 2, kx + ks * 0.6, wy + 5, X('hRope', 3)); A.px(kx + 1, wy + 2, X('hRope', 1)); A.px(kx + ks * 0.6, wy + 5, X('hRope', 4));
  K.scourge(wx - 4.5, wy + 1, J.walk ? -sw * 1.2 : J.atk ? -1 : 0);
  K.paket(wx + 5.5, wy + 1 + (J.walk ? Math.round(Math.abs(sw) * 0.6) : 0), 0);
  // a mantle of hide over the shoulders, its edge fringed and hung with cowries
  if (T >= 1) {
    const mt = A.poly([[J.shF[0] - 2, J.shF[1] + 3], [J.shF[0] - 1, J.shF[1] - 1], [nx, ny], [J.shN[0] + 2, J.shN[1] - 0.5], [J.shN[0] + 2.5, J.shN[1] + 3], [J.shN[0], J.shN[1] + 2], [nx + 1, ny + 3], [J.shF[0] + 2, J.shF[1] + 4]], 'hLea', { band: 1 });
    h32Hem(A, mt, 1, x => (x % 2) ? X('hLea', 0) : X('hLea', 3));
    for (let i = 0; i < 3; i++) A.px(J.shF[0] - 1 + i * 1.6, J.shF[1] + 4 + (i % 2), HM_WHITE);
    A.px(J.shN[0] + 2, J.shN[1] + 3.5, HM_WHITE);
    A.px(nx + 3, ny + 3, g.trim ? '#fff0a0' : '#d8a83a'); A.px(nx + 3, ny + 4, g.trim ? '#d8a83a' : '#6a4410');
  }
  // the head, turned three-quarters
  A.limb([[nx, ny], [hx - 0.5, hy + 3]], 1.4, 1.4, SK, { tone: -1 });
  // locs falling behind, from under the wrap, tied with a cowrie
  if (g.head !== 'hood') {
    const s = J.walk ? -sw * 0.7 : J.cast ? -0.6 : 0;
    for (const [ox, len, t] of [[-4, 10, -1], [-2.5, 8, 0]]) {
      const p0 = [hx + ox, hy - 1], p2 = [hx + ox - 1.2 + s, hy - 1 + len];
      A.limb([p0, [hx + ox - 0.8 + s * 0.5, hy - 1 + len * 0.5], p2], 1.2, 0.8, 'hHair', { tone: t });
      for (let i = 2; i < len; i += 2) A.px(p0[0] + (p2[0] - p0[0]) * i / len - 0.5, p0[1] + i, X('hHair', t ? 2 : 4));
      A.px(p2[0], p2[1] - 2, HM_WHITE); A.px(p2[0], p2[1] - 3, '#b8ae9c');
    }
  }
  const fid = A.poly([[hx - 3.5, hy - 1], [hx - 2.5, hy - 4.5], [hx + 1, hy - 5], [hx + 3.5, hy - 3.5], [hx + 4, hy - 0.5], [hx + 5, hy + 0.5], [hx + 4, hy + 1.5], [hx + 4, hy + 3], [hx + 2.5, hy + 5], [hx - 0.5, hy + 4.5], [hx - 3.5, hy + 1.5]], SK, {});
  const eyes = (glow) => {
    // the eyes rolled back to the whites: a heavy lid, the white, a grey rim under it
    A.px(hx + 1, hy - 2, sk(0)); A.px(hx + 2, hy - 2, sk(0)); A.px(hx + 3, hy - 2, sk(1)); A.px(hx + 4, hy - 2, sk(0));
    A.px(hx + 2, hy - 1, HM_EYE); A.px(hx + 1, hy - 1, glow ? '#b8b2a4' : sk(1)); A.px(hx + 4, hy - 1, '#d8d2c2'); A.px(hx + 3, hy - 1, sk(2));
    A.px(hx + 2, hy, '#8a8478');
  };
  if (!g.head || g.head === 'none') {
    // the madras wrap: red check over the crown and the back of the skull, knotted high with its ends fanned
    const wr = A.poly([[hx - 3, hy + 1.5], [hx - 5.2, hy - 0.5], [hx - 5.8, hy - 3.5], [hx - 4.2, hy - 6.2], [hx - 1, hy - 6.8], [hx + 2.5, hy - 6], [hx + 4.4, hy - 3.6], [hx + 3.8, hy - 2.5], [hx + 0.5, hy - 3.1], [hx - 1.5, hy - 2], [hx - 2.2, hy + 0.5]], 'hmMad', { band: 2 });
    A.fx(wr, h32Madras);
    A.line(hx - 3, hy - 3, hx + 3, hy - 3, X('hmMad', 0));   // the fold of the brow band
    A.ell(hx + 1, hy - 6.3, 1.5, 1.2, 'hmMad', { tone: 1 });   // the knot at the top front, its two ends standing up
    A.px(hx + 0.5, hy - 8, X('hmMad', 4)); A.px(hx, hy - 8.5, X('hmMad', 3)); A.px(hx + 2.5, hy - 7.5, X('hmMad', 3)); A.px(hx + 3, hy - 8, X('hmMad', 1));
    A.px(hx + 1, hy - 6.5, '#f0cc9c'); A.px(hx - 4, hy - 5, X('hmMad', 4));
    if (g.trim) { A.px(hx + 1, hy - 3, '#d8a83a'); A.px(hx - 1, hy - 3, '#fff0a0'); }
    // the face: brow, rolled eyes, the nose, a cheekbone, a mouth; white chalk on cheek and chin
    eyes(true);
    A.px(hx + 5, hy + 0.5, sk(4)); A.px(hx + 5, hy + 1, sk(3)); A.px(hx + 4, hy + 1.5, sk(0));
    A.px(hx + 2, hy + 1, sk(3)); A.px(hx + 3, hy + 1, sk(3)); A.px(hx + 1, hy + 2, sk(1));
    A.px(hx + 3, hy + 3, sk(0)); A.px(hx + 4, hy + 3, '#3a0c0e'); A.px(hx + 2, hy + 4, sk(1));
    A.px(hx + 3, hy + 4, HM_WHITE); A.px(hx + 1, hy - 3, sk(4)); A.px(hx + 2, hy - 3, sk(3)); A.px(hx + 4, hy - 0.5, sk(3));
    A.px(hx - 1, hy + 1, sk(3)); A.px(hx - 1, hy + 2, sk(2)); A.px(hx - 0.5, hy + 3, sk(1));   // the ear
    A.px(hx - 1, hy + 3.5, '#d8a83a');   // a brass ring in it
    A.px(hx + 3.5, hy - 1.5, H32B);   // a trickle of blood from the brow
  } else if (g.head === 'mask') {
    // a bone mask over the whole face, cut with a cross, the whites showing through its holes
    const mk = A.poly([[hx - 3.5, hy - 1], [hx - 2.5, hy - 4.5], [hx + 1, hy - 5.5], [hx + 4, hy - 4], [hx + 4.8, hy - 0.5], [hx + 5.8, hy + 0.5], [hx + 4.8, hy + 1.5], [hx + 4.8, hy + 3], [hx + 3, hy + 5.5], [hx - 0.5, hy + 5.5], [hx - 3.5, hy + 2]], 'hBone', { band: 2 });
    A.fx(mk, (x, y, e) => (e.k >= 2 && (x + y) % 5 === 0) ? 1 : null);
    A.px(hx + 2, hy - 1, HM_EYE); A.px(hx + 4, hy - 1, '#d8d2c2'); A.px(hx + 2, hy - 2, '#140808'); A.px(hx + 4, hy - 2, '#140808');
    A.line(hx + 3, hy - 3, hx + 3, hy + 3, '#8e141a'); A.line(hx + 1.5, hy + 1, hx + 4.5, hy + 1, '#8e141a');   // a blood cross on it
    for (let i = 0; i < 3; i++) A.px(hx + 2 + i, hy + 4, '#2a1a10');
    A.line(hx - 3, hy - 1, hx, hy - 1, '#2a1a10');
    const hr = A.poly([[hx + 3, hy - 5.2], [hx - 2, hy - 5.8], [hx - 4.5, hy - 3], [hx - 5, hy + 4], [hx - 3, hy + 3], [hx - 1.2, hy + 1.5], [hx - 0.5, hy - 2.5], [hx + 1.5, hy - 3.8], [hx + 3.8, hy - 3.2]], 'hHair', {});
    A.fx(hr, (x, y, e) => (x % 2 === 0 && e.k >= 2) ? 3 : null);
    if (g.trim) { A.px(hx + 1, hy - 3.5, '#d8a83a'); A.px(hx + 4.5, hy + 3.5, '#d8a83a'); }
  }
  if (g.head === 'hood') {
    // the cowl raised into a peak, a seam down it, gold-thread veve at its brim; in the dark of it, the whites of the eyes
    const cm = T ? 'hmRed' : 'hmSack';
    const hd = A.poly([[J.shF[0] - 1, ny + 3], [hx - 5, hy + 2], [hx - 3, hy - 6], [hx - 1, hy - 10], [hx + 3, hy - 6], [hx + 5.8, hy - 1], [hx + 5.8, hy + 4], [hx + 3.5, hy + 6.5], [J.shN[0] + 1, J.shN[1] + 1]], cm, { band: 2, grain: T ? 0 : 0.12 });
    h32Folds(A, hd, [[hx - 1, hy - 9, hx - 2.5, hy + 2], [hx - 3, hy - 3, hx - 4.5, hy + 3]]);
    A.poly([[hx + 1, hy - 3.5], [hx + 4.8, hy - 2.5], [hx + 4.8, hy + 3.5], [hx + 2.5, hy + 5.5], [hx + 0.5, hy + 4]], '#0a0406', { flat: true, contour: false });
    A.px(hx + 2, hy - 1, HM_EYE); A.px(hx + 4, hy - 1, '#b8b2a4'); A.px(hx + 2, hy, '#3a3630');
    A.line(hx + 5.5, hy - 1, hx + 5.5, hy + 4, g.trim ? '#a8741e' : X(cm, 4));   // the brim's lit edge
    A.px(hx - 1, hy - 10, g.trim ? '#fff0a0' : X(cm, 4));
  }
  // near arm: bare upper arm with the lash-scars of the penitent, a bandaged forearm, bead cuff, red fingertips
  if (T === 2) A.ell(J.shN[0], J.shN[1], 3, 2.2, 'hIron', {});
  A.limb([J.shN, J.elN], 2.1, 1.7, SK, { contourAll: true });
  { const a = zlerp32(J.shN, J.elN, 0.35), b = zlerp32(J.shN, J.elN, 0.65); A.px(a[0] + 0.5, a[1], '#7a2420'); A.px(b[0] - 0.5, b[1], '#7a2420'); A.px(a[0] - 0.5, a[1] - 1, sk(4)); }
  const fa = A.limb([J.elN, J.haN], 1.8, 1.4, 'hmLinen', {});
  K.wraps(fa, false);
  A.px(J.elN[0] + (J.haN[0] - J.elN[0]) * 0.55, J.elN[1] + (J.haN[1] - J.elN[1]) * 0.55, H32B);
  { const m = zlerp32(J.elN, J.haN, 0.92); A.px(m[0], m[1] - 1, HM_BEADS[2]); A.px(m[0] + 1, m[1] - 0.5, HM_BEADS[0]); }
  if (T === 2) {
    const pd = A.ell(J.shN[0] + 0.5, J.shN[1] - 0.5, 3, 2.2, 'hIron', { spec: 0.15 });
    A.px(J.shN[0] - 1, J.shN[1] - 1.5, '#ffffff'); A.px(J.shN[0] + 2, J.shN[1] + 0.5, '#262830'); A.px(J.shN[0] + 1, J.shN[1] + 1, g.trim ? '#d8a83a' : '#7a808e');
  }
  weapon32(A, g, J);
  A.ell(J.haN[0], J.haN[1] + 1.2, 1.4, 1.4, SK, {});
  A.px(J.haN[0] - 0.5, J.haN[1] + 0.5, sk(4)); A.px(J.haN[0], J.haN[1] + 2.5, H32B); A.px(J.haN[0] + 1, J.haN[1] + 2, '#5a0a10');
  if (J.cast) h32BloodOrb(A, J);
};
function h32BloodOrb(A, J) {   // blood drawn up out of the palm, beading and spinning
  const q = [J.haN[0] + 2, J.haN[1] - 2 - (J.ph >= 2 ? 1 : 0)], r = [1.2, 1.8, 2.4, 2.2][J.ph % 4];
  A.ell(q[0], q[1], r + 0.6, r + 0.6, '#3a0408', { flat: true, contour: false });
  A.ell(q[0], q[1], r, r, '#8e141a', { flat: true, contour: false });
  A.top(q[0] - 1, q[1] - 1, '#ffb090'); A.top(q[0], q[1], '#c42a22'); A.top(q[0] + 1, q[1] + 1, '#5a0a10');
  for (let i = 0; i < 3; i++) { const a = i * 2.1 + J.ph; A.top(q[0] + Math.cos(a) * (r + 2), q[1] + Math.sin(a) * (r + 2), i ? '#c42a22' : '#ff7050'); }
}
// ---- the Hemomancer from behind: walking away. The weapon arm (N) is the far one now, behind the body; the other
// arm (F) the near one, over it. The sackcloth is torn open down the back over the lash-scars of the penitent.
function h32HemoBack(A, J, g) {
  const T = g.tier, ph = J.ph, sw = J.walk ? J.sw : 0, X = h32hex, K = h32HemoKit(A, J, g);
  const robe = T ? 'hmRed' : 'hmSack', SK = 'hmSkin', sk = i => X(SK, i);
  const [nx, ny] = J.neck, [cx, cy] = J.chest, [wx, wy] = J.waist, [hx, hy] = J.head;
  if (T === 2) A.ell(J.shN[0], J.shN[1], 3, 2.2, 'hIron', { tone: -1 });
  A.limb([J.shN, J.elN], 2.1, 1.7, SK, { tone: -1, contour: false });
  A.limb([J.elN, J.haN], 1.8, 1.4, 'hmLinen', { tone: -1 });
  const wLate = J.atk && J.ph < 2;
  if (!wLate) weapon32(A, g, J);
  A.ell(J.haN[0], J.haN[1] + 1.2, 1.4, 1.4, SK, { tone: -1 });
  const across = J.cast && J.haF[0] > J.shF[0] + 2;
  if (across) { A.limb([J.elF, J.haF], 1.4, 1.2, SK, { tone: -1 }); A.ell(J.haF[0], J.haF[1] + 1, 1.3, 1.3, SK, { tone: -1 }); }
  // the paket glimpsed at the far hip
  K.paket(wx + 5.5, wy + 1 + (J.walk ? Math.round(Math.abs(sw) * 0.6) : 0), -1);
  for (const [k, a, far] of [['kneeN', 'ankN', true], ['kneeF', 'ankF', false]]) {
    const [ax, ay] = J[a], t = far ? -1 : 0;
    A.limb([J[k], [ax, ay - 1]], 1.3, 1.1, SK, { tone: t });
    K.foot(ax, ay, t, true);
  }
  // the skirt from behind: folds, the hem soaked with blood or sewn with sequins
  const hem = 43, S = h32Skirt(A, J, robe, hem, { rag: T ? [0, 1] : [0, 1, 0, 2, 1, 0, 1], teeth: T ? 7 : 9, grain: T ? 0 : 0.12 });
  const fs = J.walk ? -sw * 0.8 : 0;
  h32Folds(A, S.id, [[wx - 3, wy + 3, wx - 4.5 + fs, hem - 1], [wx, wy + 3, wx + fs, hem - 1], [wx + 3, wy + 3, wx + 4.5 + fs, hem - 1]]);
  if (T === 0) h32Hem(A, S.id, 3, (x, r) => r === 1 ? ((x & 1) ? '#3a0a0e' : '#5a1216') : r === 2 ? ((x % 3) ? '#4a1214' : null) : ((x % 4 === 1) ? '#5a1a16' : null));
  else h32Hem(A, S.id, 6, (x, r) => {
    if (r === 1) return g.trim ? ((x & 1) ? '#fff0a0' : '#a8741e') : ((x & 1) ? '#d8a83a' : '#6a4410');
    if (r === 2) return (x % 3 === 0) ? '#fff0a0' : (x % 3 === 1 ? '#a8741e' : null);
    if (r === 3) return X(robe, 0);
    const c = ((x % 4) + 4) % 4;
    if (r === 5) return c === 1 ? HM_WHITE : null;
    if (r === 4) return c === 0 || c === 2 ? '#b8ae9c' : c === 1 ? HM_WHITE : null;
    if (r === 6) return c === 1 ? '#b8ae9c' : null;
    return null;
  });
  if (T === 0) {   // a patch sewn on the seat
    const pt = A.poly([[wx - 4, wy + 6], [wx - 0.5, wy + 5.5], [wx, wy + 10], [wx - 3.5, wy + 10.5]], 'hLea', {});
    for (let i = 0; i < 3; i++) A.px(wx - 3.5 + i * 1.3, wy + 6 - i * 0.2, X('hRope', 4));
    A.px(wx - 0.5, wy + 8, X('hRope', 4));
  }
  // the back of the torso
  const sx = cx - 1;
  const tid = A.poly([[J.shF[0] - 1, J.shF[1]], [nx - 2, ny + 1], [nx + 1, ny + 1], [J.shN[0] + 1, J.shN[1]], [cx + 5, cy + 1], [wx + 5, wy + 1], [wx - 5, wy + 1], [cx - 5, cy + 1]], robe, { band: 2, grain: T ? 0 : 0.12 });
  if (T === 0) {
    // torn open down the back: bare skin in a long V, criss-crossed with fresh lash marks
    const bk = A.poly([[sx - 3, ny + 1.5], [sx + 2.5, ny + 1.5], [sx + 1, wy - 2], [sx - 0.5, wy - 2]], SK, { band: 1 });
    A.fx(bk, (x, y, e) => e.l === 1 || e.r === 1 ? null : ((x + y) % 4 === 0 ? '#8e141a' : (x - y) % 5 === 0 ? '#5a1414' : null));
    A.px(sx - 2, ny + 2, sk(4)); A.px(sx - 1, ny + 3, sk(4));
    A.line(sx - 3.5, ny + 1.5, sx - 1, wy - 2, X(robe, 0)); A.line(sx + 3, ny + 1.5, sx + 1.5, wy - 2, X(robe, 4));   // the torn edges
    for (let i = 0; i < 3; i++) A.px(sx - 3 + i * 0.8, ny + 3 + i * 2, X('hRope', 3));   // the rent stitched loosely
  } else {
    h32Folds(A, tid, [[nx - 1, ny + 2, sx - 0.5, wy - 1, 0], [cx - 3, cy, cx - 3.5, wy], [cx + 3, cy, cx + 3.5, wy]]);
    A.px(sx - 3, cy - 1, X(robe, 4)); A.px(sx + 3, cy - 1, X(robe, 3));
    // a veve embroidered between the shoulders: a heart pierced by a sword, white thread
    const vx = sx, vy = cy - 1;
    A.px(vx - 1, vy, HM_WHITE); A.px(vx + 1, vy, HM_WHITE); A.px(vx - 1, vy + 1, HM_WHITE); A.px(vx, vy + 1, '#b8ae9c'); A.px(vx + 1, vy + 1, HM_WHITE); A.px(vx, vy + 2, HM_WHITE);
    A.line(vx - 2, vy - 1, vx + 2, vy + 3, g.trim ? '#fff0a0' : '#d8a83a');
  }
  if (T === 2) {   // the back of the red-hide cuirass: laced up the spine, vertebrae sewn in a column
    A.poly([[cx - 5, cy - 1], [cx + 4, cy - 1], [cx + 4.5, wy], [cx - 5, wy]], 'hLeaRed', {});
    for (let i = 0; i < 4; i++) { const y = cy + 1 + i * 1.8; A.px(sx, y, X('hBone', i ? 3 : 4)); A.px(sx + 1, y, X('hBone', 2)); A.px(sx - 1, y + 0.5, X('hBone', 1)); A.px(sx + 0.5, y + 1, '#1a0808'); A.px(sx - 2, y, '#c4c8d2'); A.px(sx + 2.5, y, '#464a56'); }
    A.line(cx - 4.5, wy - 1.5, cx + 4, wy - 1.5, X('hLeaRed', 1));
  }
  // the rope belt; the knot's tail and the scourge tied behind; the blood vial at the back hip
  const bid = A.poly([[wx - 5.5, wy - 0.5], [wx + 5.5, wy - 0.5], [wx + 5.5, wy + 1.5], [wx - 5.5, wy + 1.5]], T === 2 ? 'hLea' : 'hRope', {});
  A.fx(bid, (x, y, e) => T === 2 ? null : ((x + y) % 2 ? 1 : (e.t === 1 ? 4 : null)));
  K.scourge(wx - 1, wy + 1, J.walk ? -sw * 1.2 : 0);
  if (T >= 1) {
    const vx = wx - 4, vy = wy + 2 + (J.walk ? Math.round(sw * 0.5) : 0);
    A.poly([[vx - 1, vy], [vx + 1, vy], [vx + 1.5, vy + 4], [vx - 1.5, vy + 4]], '#3a1418', { flat: true });
    A.px(vx, vy + 2, H32B2); A.px(vx, vy + 3, H32B); A.px(vx - 1, vy + 3, H32B); A.px(vx - 1, vy + 1, '#ffd0c8'); A.px(vx, vy - 0.5, X('hWood', 3)); A.px(vx + 1, vy - 0.5, '#d8a83a');
  }
  // the capelet of hide, fringed, cowries along its edge
  if (T >= 1) {
    const L = T === 2 ? 5 : 7, fl = J.walk ? -Math.abs(sw) * 0.8 : J.cast || J.atk ? -0.8 : 0;
    const cp = [[J.shF[0] - 2.5, J.shF[1] + 2], [J.shF[0] - 1, J.shF[1] - 1.5], [nx - 2, ny - 0.5], [J.shN[0] + 1.5, J.shN[1] - 0.5], [J.shN[0] + 2, J.shN[1] + 2]];
    const rag = [0, 2, 0.5, 2.5, 0, 1.5];
    for (let i = 0; i < 6; i++) { const u = i / 5; cp.push([J.shN[0] + 1 - (J.shN[0] - J.shF[0] + 3) * u + fl * u, cy + L - 2 + rag[i] + Math.sin(u * Math.PI)]); }
    const cpid = A.poly(cp, 'hLea', { band: 2 });
    h32Hem(A, cpid, 1, x => (x % 2) ? X('hLea', 0) : X('hLea', 3));
    h32Folds(A, cpid, [[nx - 2, ny + 1, sx - 1, cy + L - 1, 0], [nx + 2, ny + 1, sx + 3, cy + L - 1]]);
    for (let i = 0; i < 4; i++) A.px(J.shF[0] + 0.5 + i * 2.6, cy + L - 2.5 + (i % 2), HM_WHITE);
    if (g.trim) for (let i = 0; i < 3; i++) A.px(J.shF[0] + 2 + i * 2.6, cy + L - 1.5, '#d8a83a');
  }
  // the near arm (bare, scarred), over the body
  if (T === 2) A.ell(J.shF[0], J.shF[1], 3, 2.2, 'hIron', {});
  A.limb([J.shF, J.elF], 2.0, 1.7, SK, { contourAll: true });
  { const a = zlerp32(J.shF, J.elF, 0.4); A.px(a[0], a[1], '#7a2420'); A.px(a[0] + 1, a[1] + 1, '#7a2420'); A.px(a[0] - 1, a[1] - 1, sk(4)); }
  if (!across) {
    const fa = A.limb([J.elF, J.haF], 1.6, 1.3, 'hmLinen', {}); K.wraps(fa, true);
    { const m = zlerp32(J.elF, J.haF, 0.9); A.px(m[0], m[1], HM_BEADS[1]); A.px(m[0] + 1, m[1], HM_BEADS[0]); }
    A.ell(J.haF[0], J.haF[1] + 1.2, 1.4, 1.4, SK, {}); A.px(J.haF[0] - 0.5, J.haF[1] + 0.5, sk(4)); A.px(J.haF[0], J.haF[1] + 2.5, H32B);
  }
  if (T === 2) { A.ell(J.shF[0] - 0.5, J.shF[1] - 0.5, 3, 2, 'hIron', { spec: 0.15 }); A.px(J.shF[0] - 1, J.shF[1] - 1.5, g.trim ? '#fff0a0' : '#ffffff'); A.px(J.shF[0] + 1.5, J.shF[1] + 0.5, '#262830'); }
  // the head from behind
  A.limb([[nx, ny], [hx - 0.5, hy + 3]], 1.4, 1.4, SK, { tone: -1 });
  A.poly([[hx - 4, hy - 1], [hx - 3, hy - 4.5], [hx + 0.5, hy - 5.5], [hx + 3, hy - 4], [hx + 4, hy - 1], [hx + 4.3, hy + 1.5], [hx + 3, hy + 4.5], [hx - 0.5, hy + 5], [hx - 4, hy + 2]], SK, {});
  K.beads(nx - 3, nx + 2, ny + 0.5, -0.8, 1);   // the bead strands at the nape
  if (g.head !== 'hood') {
    // locs down the back, a cowrie tied in the long ones
    const s = J.walk ? -sw * 0.6 : 0;
    for (const [ox, len, t] of [[-3, 11, 0], [-0.5, 12, 0], [2, 10, -1]]) {
      const p0 = [hx + ox, hy - 1], p2 = [hx + ox - 1 + s, hy - 1 + len];
      A.limb([p0, [hx + ox - 0.5 + s * 0.5, hy - 1 + len * 0.5], p2], 1.3, 0.8, 'hHair', { tone: t });
      for (let i = 3; i < len; i += 2) A.px(p0[0] + (p2[0] - p0[0]) * i / len - 0.5, p0[1] + i, X('hHair', t ? 2 : 4));
      A.px(p2[0], p2[1] - 2, HM_WHITE); A.px(p2[0], p2[1] - 3, '#b8ae9c');
    }
    A.px(hx + 3.5, hy + 1, sk(2)); A.px(hx + 3.5, hy + 2, sk(1)); A.px(hx + 3.5, hy + 3, '#d8a83a');   // the ear, its ring
  }
  if (!g.head || g.head === 'none') {
    // the madras wrap from behind: its knot and fanned ends on top
    const wr = A.poly([[hx - 4.8, hy + 0.5], [hx - 5.2, hy - 3], [hx - 3.5, hy - 5.8], [hx + 0.5, hy - 6.5], [hx + 3.5, hy - 5.5], [hx + 4.6, hy - 3], [hx + 4.4, hy + 0.5], [hx, hy + 1.5]], 'hmMad', { band: 2 });
    A.fx(wr, h32Madras);
    A.ell(hx + 1.5, hy - 6, 1.5, 1.2, 'hmMad', { tone: 1 });
    A.px(hx + 1, hy - 7.5, X('hmMad', 4)); A.px(hx + 3, hy - 7.5, X('hmMad', 3)); A.px(hx + 1.5, hy - 6, '#f0cc9c'); A.line(hx - 4, hy - 1, hx + 4, hy - 1, X('hmMad', 0));
    A.px(hx + 4.8, hy - 1, sk(2));
  }
  if (g.head === 'mask') {
    A.px(hx + 4.5, hy - 1, X('hBone', 3)); A.px(hx + 4.5, hy, X('hBone', 2)); A.px(hx + 4.2, hy + 1, X('hBone', 1));
    A.line(hx + 4, hy - 2, hx - 1.5, hy + 0.5, '#2a1a10'); A.line(hx + 3.5, hy + 2, hx - 1.5, hy + 1, '#2a1a10');
    A.px(hx - 2, hy + 0.5, '#644630'); A.px(hx - 1, hy + 0.5, '#46301e'); A.px(hx - 2.5, hy + 2.5, '#46301e'); A.px(hx - 3, hy + 4.5, '#46301e');
  }
  if (g.head === 'hood') {
    const cm = T ? 'hmRed' : 'hmSack';
    const hd = A.poly([[J.shF[0] - 1.5, ny + 3], [hx - 5.5, hy + 2], [hx - 4, hy - 5], [hx - 1, hy - 10], [hx + 3, hy - 6], [hx + 5, hy - 1], [hx + 4.5, hy + 4], [J.shN[0] + 1, J.shN[1] + 1], [nx + 1, ny + 4]], cm, { band: 2, grain: T ? 0 : 0.12 });
    h32Folds(A, hd, [[hx - 1, hy - 9, hx - 1.5, hy + 3, 0], [hx - 4, hy - 3, hx - 5, hy + 2], [hx + 2, hy - 5, hx + 3, hy + 3]]);
    A.line(hx + 4.5, hy - 1, hx + 4, hy + 3, X(cm, 0));
    // the veve on the back of the cowl
    A.px(hx - 1, hy - 2, HM_WHITE); A.px(hx - 2, hy - 1, HM_WHITE); A.px(hx, hy - 1, HM_WHITE); A.px(hx - 1, hy, HM_WHITE); A.px(hx - 1, hy + 1, '#b8ae9c');
    if (g.trim) { A.px(hx - 1, hy - 10, '#fff0a0'); A.line(hx + 4.5, hy - 1, hx + 4, hy + 3, '#a8741e'); }
  }
  if (wLate) weapon32(A, g, J);
  if (J.cast) h32BloodOrb(A, J);
}

// v0.34: the heroes' painter. Pix (zo_pix.js) with three things more, so the heroes can be worked to the Iron
// Golem's finish: (1) hand-placed pixels respect the painting order - a pixel set on the robe is hidden where the
// arm is painted over it later, so detail can be laid down part by part; (2) A.fx(part, fn) paints a pattern
// clipped to one part (embroidery, weave, trims along an edge, folds), fn(x, y, e) -> colour | tone index | null,
// where e.k is the tone the shading chose and e.t / e.b / e.l / e.r the distance in pixels to that part's top,
// bottom, left and right edge (1 = on the edge, counted up to 16); (3) material options: spec (hard glints on lit metal),
// grain (a sparse weave in cloth). Everything else is Pix exactly.
function Pix32(Wd, Ht, outline, DX = 0) {
  const N = Wd * Ht, part = new Int16Array(N).fill(-1), opts = [], over = new Map(), fxs = new Map();
  const OL = outline === null ? null : (outline || [16, 8, 16]);
  const fill = (test, mat, o, bb) => {
    const id = opts.length; opts.push(Object.assign({}, o || {}, { mat }));
    const x0 = Math.max(0, Math.floor(bb[0])), x1 = Math.min(Wd - 1, Math.ceil(bb[2])), y0 = Math.max(0, Math.floor(bb[1])), y1 = Math.min(Ht - 1, Math.ceil(bb[3]));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (test(x + 0.5, y + 0.5)) part[y * Wd + x] = id;
    return id;
  };
  const hash = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const A = {
    W: Wd, H: Ht, DX,
    poly(pts, mat, o) {
      if (DX) pts = pts.map(p => [p[0] + DX, p[1]]);
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      return fill((px, py) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c; } return c; }, mat, o, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
    },
    ell(cx, cy, rx, ry, mat, o) { cx += DX; return fill((x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, mat, o, [cx - rx, cy - ry, cx + rx, cy + ry]); },
    limb(pts, r0, r1, mat, o) {
      if (DX) pts = pts.map(p => [p[0] + DX, p[1]]);
      const n = pts.length, R = Math.max(r0, r1), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      return fill((x, y) => {
        for (let i = 0; i < n - 1; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), r = r0 + (r1 - r0) * (i + t) / Math.max(1, n - 1);
          if ((x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2 <= r * r) return true;
        }
        return false;
      }, mat, o, [Math.min(...xs) - R, Math.min(...ys) - R, Math.max(...xs) + R, Math.max(...ys) + R]);
    },
    // a hand-placed pixel, under anything painted after it
    px(x, y, c) { x = Math.round(x + DX); y = Math.round(y); if (x >= 0 && y >= 0 && x < Wd && y < Ht) over.set(y * Wd + x, [c, opts.length]); },
    // a pixel that goes on top of everything, whatever comes later (glows, sparks)
    top(x, y, c) { x = Math.round(x + DX); y = Math.round(y); if (x >= 0 && y >= 0 && x < Wd && y < Ht) over.set(y * Wd + x, [c, 1e9]); },
    line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) { const t = i / Math.max(1, n); A.px(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, c); } },
    fx(id, fn) { if (!fxs.has(id)) fxs.set(id, []); fxs.get(id).push(fn); return id; },
    tone(mat, i) { const m = PMAT[mat]; if (!m) return mat; const c = m[Math.max(0, Math.min(4, i))]; return `rgb(${c[0]},${c[1]},${c[2]})`; },
    render() {
      const c = mkCanvas(Wd, Ht), x = c.getContext('2d'), img = x.createImageData(Wd, Ht), D = img.data;
      const at = (i, j, p) => i >= 0 && j >= 0 && i < Wd && j < Ht && part[j * Wd + i] === p;
      const run = (i, j, p, dx, dy) => { let n = 1; while (n < 16 && at(i + dx * n, j + dy * n, p)) n++; return n; };
      const rgb = cv => typeof cv !== 'string' ? cv : cv[0] === '#' ? [parseInt(cv.slice(1, 3), 16), parseInt(cv.slice(3, 5), 16), parseInt(cv.slice(5, 7), 16)] : cv.match(/\d+/g).map(Number);
      for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) {
        const p = part[j * Wd + i]; if (p < 0) continue;
        const o = opts[p], T = o.tone || 0; let k = 2 + T, seam = false;
        if (!o.flat) {
          const band = o.band || 1;
          if (!at(i + 1, j, p) || !at(i, j + 1, p)) k = 1 + T;
          else if (band > 1 && (!at(i + 2, j, p) || !at(i + 1, j + 2, p))) k = 1 + T;
          else if (band > 2 && !at(i + 3, j, p) && ((i + j) & 1)) k = 1 + T;
          else if (!at(i - 1, j, p) || !at(i, j - 1, p)) { k = 3 + T; if (!at(i - 1, j, p) && !at(i, j - 1, p) && o.hi !== false) k = 4 + T; }
          if (o.spec && k >= 3 + T && hash(i, j) < o.spec) k = 4 + T;
          else if (o.spec && k === 2 + T && hash(i + 7, j) < o.spec * 0.35) k = 3 + T;
          if (o.grain && k === 2 + T) { const h = hash(i, j * 3 + 1); if (h < o.grain) k = 1 + T; else if (h > 1 - o.grain * 0.6) k = 3 + T; }
        }
        if (o.contour !== false) for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const q = (i + dx >= 0 && j + dy >= 0 && i + dx < Wd && j + dy < Ht) ? part[(j + dy) * Wd + i + dx] : -1; if (q >= 0 && q !== p && q < p && (dx > 0 || dy > 0 || o.contourAll)) { k = 0; seam = true; break; } }
        const m = PMAT[o.mat]; let col;
        if (m) col = m[Math.max(0, Math.min(4, k))]; else col = rgb(o.mat);
        const F = fxs.get(p);
        if (F && !seam) {
          const e = { k: k - T, t: run(i, j, p, 0, -1), b: run(i, j, p, 0, 1), l: run(i, j, p, -1, 0), r: run(i, j, p, 1, 0) };
          for (const fn of F) { const v = fn(i - DX, j, e); if (v == null) continue; col = typeof v === 'number' ? (m ? m[Math.max(0, Math.min(4, v + T))] : col) : rgb(v); }
        }
        const q = (j * Wd + i) * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255;
      }
      if (OL) { const S = new Uint8ClampedArray(D); for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) { const q = (j * Wd + i) * 4; if (S[q + 3]) continue; let n = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + dx, b = j + dy; if (a >= 0 && b >= 0 && a < Wd && b < Ht && S[(b * Wd + a) * 4 + 3]) n = true; } if (n) { D[q] = OL[0]; D[q + 1] = OL[1]; D[q + 2] = OL[2]; D[q + 3] = 255; } } }
      for (const [k, [cv, n]] of over) {
        if (part[k] >= n) continue;   // painted over by a later part
        const q = k * 4; if (cv == null) { D[q + 3] = 0; continue; } const col = rgb(cv); D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255;
      }
      x.putImageData(img, 0, 0); return c;
    }
  };
  return A;
}
const PIX32_CLS = { hemomancer: 1, ossumancer: 1, miasmancer: 1, animancer: 1 };
const AX32 = 17;
// where each hero's head sits against the spine in the straight-on views, so the mirrored halves make one face of
// the right width (the painters place their features differently); unset: the rig's default (down -3, up -2)
const HEAD32 = { animancer: { down: -4, up: -3 }, hemomancer: { down: -4, up: -2 }, miasmancer: { down: -5, up: -5 } };   // the spine of the straight-on views ('down', 'up'): columns >= AX32 are the painted near half
function frame32(cls, pose, ph, g, view) {
  if ((view === 'down' || view === 'up') && pose === 'atk') view = view === 'down' ? 'front' : 'back';   // a strike swings across: 3/4
  const paint = (ph2, g2) => { const A = (PIX32_CLS[cls] ? Pix32 : Pix)(46, 52, undefined, 5), J = rig32(pose, ph2, view); if ((view === 'down' || view === 'up') && HEAD32[cls] && HEAD32[cls][view] != null && pose !== 'atk') J.head = [AX32 + HEAD32[cls][view], J.head[1]]; J.view = view || 'front'; J.back = J.view === 'back' || J.view === 'up'; H32[cls](A, J, g2); return A.render(); };
  let c = paint(ph, g); const W2 = 46, H2 = 52;
  if (view === 'down' || view === 'up') {
    // v0.24: straight toward us / away. The near half as painted, and for the far half the near half again, half a
    // stride on (the other leg's step, the other arm's swing) and empty-handed, mirrored about the spine
    const b = paint(pose === 'walk' ? (ph + 4) % 8 : ph, Object.assign({}, g, { wpn: null, off: null })), m = mkCanvas(W2, H2), mx = m.getContext('2d');
    mx.save(); mx.beginPath(); mx.rect(0, 0, AX32, H2); mx.clip(); mx.translate(AX32 * 2, 0); mx.scale(-1, 1); mx.drawImage(b, 0, 0); mx.restore();
    mx.save(); mx.beginPath(); mx.rect(AX32, 0, W2 - AX32, H2); mx.clip(); mx.drawImage(c, 0, 0); mx.restore();
    c = m;
  }
  const f = mkCanvas(W2, H2), fx = f.getContext('2d'); fx.translate(W2, 0); fx.scale(-1, 1); fx.drawImage(c, 0, 0);
  const wht = src => { const q = mkCanvas(W2, H2), qx = q.getContext('2d'); qx.drawImage(src, 0, 0); qx.globalCompositeOperation = 'source-in'; qx.fillStyle = '#fff'; qx.fillRect(0, 0, W2, H2); return q; };
  // the straight-on views stand on their spine, so they sit on the same spot whichever mirror they keep
  const st = view === 'down' || view === 'up';
  return { c, f, fl: wht(c), flf: wht(f), w: W2, h: H2, ox: st ? AX32 : 21, oy: 47, bb: st ? { x: AX32 - 12, y: 0, w: 24, h: 48 } : { x: 11, y: 0, w: 24, h: 48 } };
}
{
  const _hf = heroFrame;
  heroFrame = function (cls, pose, ph, view) {
    if (!H32[cls]) return _hf(cls, pose, ph);
    if (!view) view = P._view || (P._fb ? 'back' : 'front');
    const g = heroGear(), key = '32|' + cls + '|' + pose + '|' + ph + '|' + g.key + '|' + view; let fr = HERO_FR[key]; if (fr) return fr;
    fr = frame32(cls, pose, ph, g, view); HERO_FR[key] = fr; return fr;
  };
}
// v0.24: the 32-bit rig paints 8 walk frames and 4 of idle, cast and strike. The base pose only steps 4 and 2 of
// them (the walk ran half its cycle and snapped back, which read as walking backwards), so step through them all.
{
  const _hp = heroPose;
  heroPose = function () {
    const r = _hp();
    if (!H32[P.cls]) return r;
    // one full stride per ~1.45 tiles, so the planted foot keeps pace with the ground instead of skating forward
    if (r[0] === 'walk') return ['walk', Math.floor(P._wd * 5.5) % 8];
    if (typeof HPX !== 'undefined' && HPX[P.cls]) return r;   // HPX heroes' other poses are stepped in zl_heroes22.js
    if (P.swing > (P._swL || 0) + 1e-6) P._sw0 = P.swing; P._swL = P.swing;
    if (P.cast > (P._caL || 0) + 1e-6) P._ca0 = P.cast; P._caL = P.cast;
    if (r[0] === 'atk') return ['atk', Math.min(3, Math.floor((1 - P.swing / Math.max(0.05, P._sw0 || 0.22)) * 4))];
    if (r[0] === 'cast') return ['cast', P.cast > 0 ? Math.min(3, Math.floor((1 - P.cast / Math.max(0.05, P._ca0 || 0.5)) * 4)) : 2 + Math.floor(G.time * 5) % 2];
    if (r[0] === 'idle') return ['idle', Math.floor(G.time * 2.2) % 4];
    return r;
  };
}
