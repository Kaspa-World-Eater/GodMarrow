
// =================================================================== v0.22e: the ANIMANCER and the OSSUMANCER, painted on the shared rig
// Both seen three-quarters from the front like the Hemomancer, in flat cel bands, lit by one cold sky behind and a
// lamp of their own. The Animancer is a gaunt mourner-exorcist of Yh'Anuul, the Last Breath: grey funeral wraps,
// a veil over the mouth, a long stole that never stops streaming in a wind no one else feels, and a caged wisp
// held out behind in a lantern. The Ossurarch is an ossuary priest of Oss-Vharoth, the Standing Dead: a black
// cassock to the ground, a shaven head painted as a skull, finger bones on a cord, a candle burning on a skull at
// the hip; the better the gear, the more of the dead it wears, until it walks in a cuirass of fused ribs with its
// own spine rising behind its head.
defMat('zoaFlesh', '#0b0c10', '#262a33', '#4c5059', '#7a7e85', '#a8aaa8');
defMat('zoaWrap', '#12110f', '#302d28', '#504b43', '#746d61', '#948c7e');
defMat('zoaAsh', '#121418', '#2e3137', '#4e5258', '#72767b', '#989b9e');
defMat('zoaStole', '#34343a', '#6c6b6a', '#a6a39a', '#d0ccc0', '#f0ece0');
defMat('zoaCloak', '#05060a', '#10141b', '#1b212d', '#2b3344', '#414b60');
defMat('zoaHair', '#16181c', '#3c3f46', '#6a6c70', '#9a9a98', '#c6c3ba');
defMat('zoaWisp', '#20405e', '#5a90bc', '#9ccbec', '#d4efff', '#ffffff');
defMat('zooFlesh', '#100a08', '#34261f', '#5c4838', '#8a725a', '#b0987a');
defMat('zooBlack', '#040305', '#100d12', '#1d191f', '#2e282f', '#453c44');
defMat('zooDrab', '#0a0807', '#1b1612', '#2c251f', '#41372e', '#57493d');
defMat('zooGold', '#1e1406', '#4a3410', '#80601e', '#ac883a', '#d6b868');
const zoA_lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
// a one-pixel line that only lands on what is already painted (folds, wraps, stitching that must stay inside a part)
function zoA_in(A, x0, y0, x1, y1, col) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * A.U));
  for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; if (A.at(x, y)) A.fine(x, y, col); }
}
// a ribbon of cloth (a stole, a torn cloak tail, a strand of hair) along a centreline, tapering, with a torn end
function zoA_ribbon(A, P, w0, w1, mat, o, torn, tw) {
  const n = P.length, Lf = [], Rt = [];
  for (let i = 0; i < n; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * i / Math.max(1, n - 1)) * (tw == null ? 1 : 0.4 + 0.6 * Math.abs(Math.cos(tw - i * 0.75)));
    Lf.push([P[i][0] - dy / l * w, P[i][1] + dx / l * w]); Rt.push([P[i][0] + dy / l * w, P[i][1] - dx / l * w]);
  }
  const e = P[n - 1], p = P[n - 2] || P[0], dl = Math.hypot(e[0] - p[0], e[1] - p[1]) || 1, ux = (e[0] - p[0]) / dl, uy = (e[1] - p[1]) / dl;
  const tail = torn ? [[Lf[n - 1][0] + ux * 1.8, Lf[n - 1][1] + uy * 1.8], [e[0] - ux * 0.4, e[1] - uy * 0.4], [Rt[n - 1][0] + ux * 1.1, Rt[n - 1][1] + uy * 1.1]] : [[e[0] + ux * 0.6, e[1] + uy * 0.6]];
  A.poly([...Lf, ...tail, ...Rt.reverse()], mat, o);
  return { Lf, Rt: Rt.reverse() };
}
// a streaming centreline: from a root, each segment turned a little more by a travelling wave (so it ripples)
function zoA_stream(root, N, seg, base, wave, t, droop = 0) {
  const P = [root]; let p = root;
  for (let i = 1; i <= N; i++) { const a = base + Math.sin(t - i * 0.85) * wave * (0.3 + i / N) + droop * i / N; p = [p[0] + Math.cos(a) * seg, p[1] + Math.sin(a) * seg]; P.push(p); }
  return P;
}
// strips wound on the diagonal around a limb
function zoA_wrap(A, e, ha, r, mat, nS, far, stain) {
  const R = MAT[mat], dx = ha[0] - e[0], dy = ha[1] - e[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * r, ny = dx / l * r;
  A.limb([zoA_lerp(e, ha, 0.08), zoA_lerp(e, ha, 0.92)], r, r * 0.9, mat, { sh: 0.6, hl: 0.6, tone: far ? -1.6 : 0, contour: false });
  for (let i = 0; i < nS; i++) {
    const k = 0.14 + i * (0.8 / nS), p = zoA_lerp(e, ha, k), q = zoA_lerp(e, ha, k + 0.12);
    zoA_in(A, p[0] - nx, p[1] - ny, q[0] + nx, q[1] + ny, far ? R[0] : R[1]); if (!far) zoA_in(A, p[0] - nx * 0.9, p[1] - ny * 0.9 + 0.5, q[0] + nx * 0.5, q[1] + ny * 0.5 + 0.5, R[3]);
  }
  if (stain) { const b = zoA_lerp(e, ha, 0.6); A.fine(b[0], b[1], stain); A.fine(b[0] + 0.4, b[1] + 0.5, stain); }
}
// a long thin hand: palm, four jointed fingers
function zoA_hand(A, e, ha, mat, o, tip, len = 1.5, knuckle) {
  const dx = ha[0] - e[0], dy = ha[1] - e[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, ang = Math.atan2(uy, ux);
  A.ell(ha[0] + ux * 0.9, ha[1] + uy * 0.9, 1.5, 1.15, mat, { ...o, round: 1, rot: ang });
  for (let i = 0; i < 4; i++) {
    const a = ang + (i - 1.5) * 0.28, f1 = [ha[0] + ux * 1.7 + Math.cos(a) * len * 0.9, ha[1] + uy * 1.7 + Math.sin(a) * len * 0.9], f2 = [f1[0] + Math.cos(a + 0.5) * len, f1[1] + Math.sin(a + 0.5) * len];
    A.limb([[ha[0] + ux * 1.3, ha[1] + uy * 1.3], f1, f2], 0.45, 0.32, mat, { ...o, round: 0.4, edge: false });
    if (knuckle) A.fine(f1[0], f1[1], knuckle);
    if (tip) A.fine(f2[0], f2[1], tip);
  }
}
// a torn hem: a zig-zag from a to b, teeth hanging down
function zoA_hem(cx, X, Y, a, b, N, d, seed = 0) {
  for (let i = 1; i <= N; i++) { const p = zoA_lerp(a, b, i / N), k = (i + seed) % 3; cx.lineTo(X(p[0]), Y(p[1] + (i % 2) * d + (k === 0 ? d * 0.8 : 0))); }
}
// a chain of alternating links between two points
function zoA_chain(A, a, b, sag = 0) {
  const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.1));
  for (let i = 0; i <= n; i++) { const u = i / n, p = zoA_lerp(a, b, u); p[1] += Math.sin(u * Math.PI) * sag; A.fine(p[0], p[1], i % 2 ? MAT.steel[3] : MAT.steelDark[1]); if (i % 2 === 0) A.fine(p[0] + 0.5, p[1], MAT.steelDark[0]); }
}

// ------------------------------------------------------------------- the ANIMANCER
HPX.animancer = function (A, pose, ph, g, J) {
  const T = g.tier, S = MAT.zoaFlesh, L = zoA_lerp;
  const FAR = { contour: false, tone: -1.6 }, NEAR = {};
  const h = J.head, n = J.neck, c = J.chest, w = J.waist;
  const t = ph * Math.PI / 2;
  const gust = J.walk ? 1 : J.cast ? 0.9 : J.atk ? 0.75 : 0.4;
  // the wind always comes from ahead: behind in a walk, gusting back as the spell draws breath, drooping at rest
  const base = J.walk ? Math.atan2(0.28, -1) : J.cast ? Math.atan2(0.15 + (ph === 0 ? 0.3 : 0), -1) : J.atk ? Math.atan2([0.7, 0.9, 0.2, 0.35][ph % 4], -1) : Math.atan2(0.85, -0.8);
  const lag = J.walk ? Math.sin(J.G.a - 1.3) : J.atk ? [0.5, 0.8, -0.9, -0.5][ph % 4] : J.cast ? [0.3, 0.5, -0.5, -0.3][ph % 4] : Math.sin(t) * 0.25;
  const robe = T === 2 ? 'zoaAsh' : T === 1 ? 'zoaAsh' : 'zoaWrap', R = MAT[robe];
  const stole = T === 0 ? 'zoaWrap' : 'zoaStole', ST = MAT[stole];
  // the far arm holds the lantern out behind, away from the body
  let elF = J.elF, haF = J.haF;
  if (!J.cast && !J.atk) { elF = [J.elF[0] - 0.8, J.elF[1] + 0.4]; haF = [J.haF[0] - 2.6, J.haF[1] - 2]; }
  const WB = [w[0] - 5, w[1] + 0.5], WF = [w[0] + 4.4, w[1] + 0.5];
  // ---- the arms
  const arm = (s, e, ha, far) => {
    const o = far ? FAR : NEAR;
    if (T === 0) {
      A.limb([s, L(s, e, 0.5), e], 1.9, 1.4, 'zoaFlesh', o);
      if (!far) { const m = L(s, e, 0.35); A.hair(m[0] - 1.3, m[1] - 0.5, m[0] - 1, m[1] + 2, S[3]); }
      A.limb([e, L(e, ha, 0.5), ha], 1.5, 1.05, 'zoaFlesh', o);
      zoA_wrap(A, e, ha, 1.45, 'zoaWrap', 4, far);
      A.limb([s, L(s, e, 0.3)], 2.3, 2.1, 'zoaWrap', { ...o, round: 1.5 });                // a rag knotted round the shoulder
    } else {
      A.limb([s, L(s, e, 0.5), e], 2.4, 2, robe, o);
      if (!far) zoA_in(A, s[0] - 1.2, s[1] + 1, e[0] - 1, e[1], R[3]);
      if (T === 1) {
        // a wide mourning sleeve, hanging open under the forearm and trailing back
        const m = L(e, ha, 0.6), dr = [m[0] - 1 - gust * 1.2 - lag * 0.6, m[1] + 4.2];
        A.poly([[e[0] - 1.6, e[1] + 0.6], [m[0] + 1.4, m[1] - 0.6], [m[0] + 0.8, m[1] + 2.4], dr, [e[0] - 1.8, e[1] + 2.6]], robe, { ...o, round: 1.5 });
        A.limb([e, m], 2, 2.3, robe, o);
        if (!far) { A.hair(m[0] + 0.4, m[1] + 0.8, dr[0] + 0.3, dr[1] - 0.6, R[1]); if (g.trim) A.hair(m[0] + 1.3, m[1] - 0.5, m[0] + 0.8, m[1] + 2.3, MAT.gold[3]); }
        A.limb([L(e, ha, 0.7), ha], 1.2, 1, 'zoaFlesh', o);
      } else {
        A.limb([e, L(e, ha, 0.5), ha], 1.6, 1.2, robe, o);
        const v0 = L(e, ha, 0.15), v1 = L(e, ha, 0.85);
        A.limb([v0, v1], 1.75, 1.5, 'steelDark', { ...o, metal: true, round: 1 });
        if (!far) { const p = L(v0, v1, 0.5); A.stud(p[0] - 0.6, p[1] - 0.4, 'steel'); }
      }
    }
    zoA_hand(A, e, ha, 'zoaFlesh', o, far ? S[1] : S[3], 1.6);
  };
  // ---- the lantern: a caged wisp on a chain, swinging a beat behind the hand
  const lantern = () => {
    const a = lag * 0.45, hk = [haF[0] + 0.6, haF[1] + 1], top = [hk[0] + Math.sin(a) * 2.6, hk[1] + Math.cos(a) * 2.6], ux = Math.sin(a) * 0.5;
    zoA_chain(A, hk, top);
    const cy = top[1] + 3.8, cx0 = top[0] + ux * 3.8;
    A.ell(cx0, cy, 2.3, 2.7, 'zoaWisp', { sh: 0.7, hl: 0.8 });
    A.ell(cx0 - 0.3, cy - 0.2, 1, 1.3, '#f4fbff', { flat: true, contour: false, edge: false });
    A.fine(cx0 - 0.7, cy - 0.5, MAT.zoaWisp[0]); A.fine(cx0 + 0.1, cy - 0.5, MAT.zoaWisp[0]); A.fine(cx0 - 0.3, cy + 0.5, MAT.zoaWisp[1]);   // a face in the light, mouth open
    for (const dx of [-1.2, 1.2]) A.line(cx0 + dx, cy - 2.4, cx0 + dx * 1.1, cy + 2.4, MAT.steelDark[0], 0.8);
    A.poly([[top[0] - 2.8, top[1] + 1.6], [top[0] - 1, top[1]], [top[0] + 1, top[1]], [top[0] + 2.8, top[1] + 1.6]], 'steelDark', { sh: 0.5, hl: 0.5, metal: true });
    A.poly([[cx0 - 2.7, cy + 2.2], [cx0 + 2.7, cy + 2.2], [cx0 + 1.4, cy + 3.4], [cx0, cy + 4.8], [cx0 - 1.4, cy + 3.4]], 'steelDark', { sh: 0.5, hl: 0.5, metal: true });
    A.fine(top[0], top[1] - 0.6, MAT.steel[4]);
    // a thread of spirit leaking from the cage, pulled by the wind
    for (let i = 0; i < 4; i++) A.fine(cx0 - 2.4 + Math.cos(base) * i * 1.1 + Math.sin(t + i) * 0.4, cy - 2 + Math.sin(base) * i * 1.1 - i * 0.4, i < 2 ? MAT.zoaWisp[3] : MAT.zoaWisp[2]);
    A.lamp(cx0, cy, [170, 215, 255], 13, 0.55);
  };
  const leg = (k, a, far) => {
    const o = far ? FAR : NEAR;
    A.limb([k, L(k, a, 0.5), a], 1.6, 1.1, 'zoaFlesh', o);
    if (T === 2) { A.limb([L(k, a, 0.1), L(k, a, 0.92)], 1.9, 1.5, 'steelDark', { ...o, metal: true, round: 1 }); if (!far) A.hair(k[0] + 1, k[1] + 1.5, a[0] + 0.9, a[1] - 1.5, MAT.steel[3]); }
    else zoA_wrap(A, L(k, a, 0.1), a, 1.4, 'zoaWrap', 4, far);
    const fm = T === 0 ? 'zoaWrap' : T === 1 ? 'leather' : 'steelDark';
    A.shape((cx, X, Y) => { cx.moveTo(X(a[0] - 2), Y(Math.min(0, a[1] + 3))); cx.lineTo(X(a[0] - 1.6), Y(a[1] - 0.5)); cx.lineTo(X(a[0] + 1.2), Y(a[1] - 0.5)); cx.quadraticCurveTo(X(a[0] + 2.5), Y(a[1] + 1.5), X(a[0] + 5.2), Y(Math.min(0, a[1] + 2.4))); cx.lineTo(X(a[0] + 5.4), Y(Math.min(0, a[1] + 3))); }, fm, { ...o, round: 1, metal: T === 2 });
    if (!far && T !== 2) for (let i = 0; i < 3; i++) A.fine(a[0] + 0.5 + i * 1.3, Math.min(0, a[1] + 3) - 1 - i * 0.2, MAT[fm][1]);
  };
  // ---------------------------------------------------------------- behind everything: the cloak, the stole's long end, the hair
  if (T === 2) {
    const back = 2.5 + gust * 5.5, s0 = [J.shF[0] - 2.2, J.shF[1] + 1], hemY = -7;
    const edge = []; for (let k = 1; k <= 6; k++) { const u = k / 6, y = s0[1] + (hemY - s0[1]) * u; edge.push([s0[0] - 1.2 * u - back * u * u + Math.sin(t - k * 0.9) * 0.8 * gust * u, y]); }
    const last = edge[5];
    A.shape((cx, X, Y) => {
      cx.moveTo(X(w[0] + 1), Y(w[1])); cx.lineTo(X(J.shN[0] - 1), Y(J.shN[1] + 1)); cx.lineTo(X(n[0] - 1), Y(n[1] + 0.5));
      cx.quadraticCurveTo(X(J.shF[0] - 1.5), Y(J.shF[1] - 1.5), X(s0[0]), Y(s0[1]));
      for (const p of edge) cx.lineTo(X(p[0]), Y(p[1]));
      zoA_hem(cx, X, Y, last, [w[0] + 1, hemY + 1], 8, 1.6, ph);
    }, 'zoaCloak', { round: 3 });
    for (let i = 0; i < 3; i++) { const a = [J.shF[0] - 1 + i * 1.5, J.shF[1] + 3], b = L(edge[5], [w[0], hemY], 0.15 + i * 0.25); zoA_in(A, a[0], a[1], b[0], b[1] + 0.5, MAT.zoaCloak[0]); zoA_in(A, a[0] + 0.6, a[1], b[0] + 0.6, b[1], MAT.zoaCloak[3]); }
    for (let i = 0; i < 3; i++) { const p = edge[2 + i]; A.fine(p[0] + 0.8, p[1], MAT.zoaCloak[0]); A.fine(p[0] + 1.2, p[1] + 0.4, MAT.zoaCloak[0]); }   // holes worn through
  }
  // long ash-white hair, streaming with the stole
  if (g.head !== 'hood') {
    const wx = -gust * 2.6 - (J.walk ? Math.sin(t) * 0.5 : Math.sin(t) * 0.3), wy = -gust * 1.6;
    A.shape((cx, X, Y) => {
      cx.moveTo(X(h[0] + 1.6), Y(h[1] - 5.6)); cx.quadraticCurveTo(X(h[0] - 3.8), Y(h[1] - 6.4), X(h[0] - 4.3), Y(h[1] - 1.5));
      cx.quadraticCurveTo(X(h[0] - 4.6 + wx * 0.4), Y(h[1] + 3), X(h[0] - 4.8 + wx), Y(h[1] + 7 + wy)); cx.lineTo(X(h[0] - 3.4 + wx * 0.8), Y(h[1] + 5.8 + wy * 0.8));
      cx.lineTo(X(h[0] - 2.8 + wx * 0.9), Y(h[1] + 8.2 + wy)); cx.lineTo(X(h[0] - 1.6 + wx * 0.5), Y(h[1] + 5.8 + wy * 0.5)); cx.lineTo(X(h[0] - 1), Y(h[1] + 6.6));
      cx.quadraticCurveTo(X(h[0] - 1.2), Y(h[1] + 1), X(h[0] + 0.5), Y(h[1] - 3));
    }, 'zoaHair', { sh: 1, hl: 0.8 });
    for (let i = 0; i < 3; i++) zoA_in(A, h[0] - 1.4 - i * 1, h[1] - 4.4 + i * 0.4, h[0] - 3 - i * 0.5 + wx * 0.7, h[1] + 5 + i + wy * 0.7, MAT.zoaHair[i % 2 ? 1 : 3]);
  }
  // ---------------------------------------------------------------- far arm, legs
  arm(J.shF, elF, haF, true);
  leg(J.kneeF, J.ankF, true);
  leg(J.kneeN, J.ankN, false);
  // ---------------------------------------------------------------- the robe below the belt
  const sway = J.walk ? J.sw : 0;
  const hemY = T === 0 ? -12 : T === 1 ? -5 : -8;
  const HF = [Math.max(J.kneeN[0] + 3.6, 7.2), hemY - 1.5], HB = [Math.min(J.kneeF[0] - 5, -8.5) - sway * 1.2 - (J.walk ? 1.2 : 0) - gust * 0.6, hemY + 0.5];
  const RQ = (u, v) => L(L(WB, WF, u), L(HB, HF, u), v);
  const skirt = (hb, hf, mat, teeth, d, tone) => {
    const Q = (u, v) => L(L(WB, WF, u), L(hb, hf, u), v);
    A.shape((cx, X, Y) => {
      cx.moveTo(X(WB[0]), Y(WB[1])); cx.lineTo(X(WF[0]), Y(WF[1]));
      cx.quadraticCurveTo(X(WF[0] + 1.3), Y((WF[1] + hf[1]) / 2), X(hf[0]), Y(hf[1]));
      for (let i = 1; i <= teeth; i++) { const p = Q(1 - i / teeth, 1), k = (i % 2) * d + (i % 3 === 0 ? d * 1.1 : 0); cx.lineTo(X(p[0]), Y(p[1] + k)); }
      cx.quadraticCurveTo(X(WB[0] - 2), Y((WB[1] + hb[1]) / 2), X(WB[0]), Y(WB[1]));
    }, mat, { round: 4, tone: tone || 0 });
    [0.16, 0.4, 0.62, 0.85].forEach((u, i) => {
      const du = 0.035 + i * 0.004, sv = 0.2 + (i % 2) * 0.1, sh = J.walk ? J.sw * 0.04 * (i - 1.5) : 0;
      const a = Q(u, sv), b = Q(u - du + sh, 1), b2 = Q(u + du + sh, 1);
      A.poly([a, [b[0], b[1] + 0.6], [b2[0], b2[1] + 0.6]], mat, { flat: true, tone: -1.4 + (tone || 0), contour: false, edge: false });
      const la = Q(u + 0.05, sv + 0.1), lb = Q(u + 0.06 + sh, 0.95); zoA_in(A, la[0], la[1], lb[0], lb[1], MAT[mat][3]);
    });
    return Q;
  };
  if (T === 1) {
    // layered mourning vestments: a long dark underrobe, a grey overrobe cut shorter and split at the side
    skirt([HB[0] - 0.8, HB[1] + 1.5], [HF[0] + 0.4, HF[1] + 1.5], 'zoaCloak', 11, 1.2);
    const Q = skirt([HB[0] + 1.5, -14], [HF[0] - 1, -15.5], robe, 7, 1.5);
    if (g.trim) for (let i = 0; i < 9; i++) { const p = Q(i / 8, 0.94); A.fine(p[0], p[1], MAT.gold[3]); }
  } else {
    const Q = skirt(HB, HF, robe, T === 0 ? 7 : 9, T === 0 ? 2 : 1.4, T === 2 ? -0.5 : 0);
    if (g.trim) for (let i = 0; i < 9; i++) { const p = Q(i / 8, 0.93); A.fine(p[0], p[1], MAT.gold[3]); }
  }
  if (T === 2) {
    // iron tassets over the near thigh: three lames that swing with the stride
    for (let i = 0; i < 3; i++) { const y = w[1] + 1.5 + i * 2.6, x = w[0] + 1 + i * 0.3 + sway * 0.3 * i; A.poly([[x - 1.2, y], [x + 4.6, y - 0.3], [x + 4.4, y + 2.8], [x - 1, y + 3]], 'steelDark', { sh: 0.8, hl: 0.5, metal: true }); }
  }
  // ---------------------------------------------------------------- the lantern, held out behind
  lantern();
  // ---------------------------------------------------------------- the torso: narrow, sunken
  const torso = (cx, X, Y) => {
    cx.moveTo(X(J.shF[0] - 1), Y(J.shF[1] + 0.6)); cx.quadraticCurveTo(X(J.shF[0] + 0.5), Y(n[1] + 0.8), X(n[0]), Y(n[1] + 1.5));
    cx.quadraticCurveTo(X(J.shN[0] - 1.5), Y(n[1] + 1.2), X(J.shN[0] + 1.4), Y(J.shN[1] + 0.4));
    cx.quadraticCurveTo(X(c[0] + 5.2), Y(c[1] - 1), X(c[0] + 4.2), Y(c[1] + 3)); cx.quadraticCurveTo(X(w[0] + 3.8), Y(w[1] - 2), X(WF[0]), Y(w[1] + 1));
    cx.lineTo(X(WB[0]), Y(w[1] + 1)); cx.quadraticCurveTo(X(c[0] - 5.2), Y(c[1] + 1), X(J.shF[0] - 1), Y(J.shF[1] + 0.6));
  };
  A.shape(torso, robe, { round: 4 });
  if (T === 0) {
    // funeral wraps, wound tight over a starved chest; the throat and collarbones bare
    A.poly([[n[0] - 1.5, n[1] + 1.2], [n[0] + 3.6, n[1] + 1], [c[0] + 1.6, c[1] - 2]], 'zoaFlesh', { round: 2 });
    A.hair(n[0] - 0.8, n[1] + 2.1, n[0] + 1, n[1] + 2.6, S[3]); A.hair(n[0] + 1.6, n[1] + 2.6, n[0] + 3.2, n[1] + 2, S[3]);
    for (let i = 0; i < 4; i++) { const y = c[1] - 1.5 + i * 3; zoA_in(A, c[0] - 5, y + 1.6, c[0] + 5, y - 1, MAT.zoaWrap[0]); zoA_in(A, c[0] - 5, y + 2.2, c[0] + 5, y - 0.4, MAT.zoaWrap[3]); }
    A.speck(c[0] - 4, c[1] - 2, 8, 9, MAT.zoaWrap[1], 7, 3);
  } else {
    // a vestment crossed over the chest, a high collar
    A.poly([[J.shN[0] + 1, J.shN[1] + 0.8], [c[0] + 4.6, c[1] + 2], [w[0] - 1, w[1] + 0.5], [w[0] - 3, w[1] + 0.5]], robe, { flat: true, tone: -1.2, contour: false, edge: false });
    zoA_in(A, J.shN[0], J.shN[1] + 1, w[0] - 2.5, w[1], R[4]);
    A.poly([[c[0] - 3, c[1] - 2], [w[0] - 1.5, w[1]], [w[0] - 3, w[1]]], robe, { flat: true, tone: -1.4, contour: false, edge: false });
  }
  if (T === 2) {
    // iron bands riveted over the vestment; a gorget; a chain across the chest
    A.shape((cx, X, Y) => { cx.moveTo(X(c[0] - 4.6), Y(c[1] - 3.5)); cx.quadraticCurveTo(X(c[0]), Y(c[1] - 6.4), X(c[0] + 5.3), Y(c[1] - 2.8)); cx.quadraticCurveTo(X(c[0] + 5.8), Y(c[1] + 3), X(w[0] + 3.8), Y(w[1] - 0.6)); cx.lineTo(X(w[0] - 4.4), Y(w[1] - 0.6)); cx.quadraticCurveTo(X(c[0] - 5.6), Y(c[1] + 1), X(c[0] - 4.6), Y(c[1] - 3.5)); }, 'steelDark', { metal: true, sh: 1.3, hl: 0.8 });
    zoA_in(A, c[0] + 1.6, c[1] - 5, w[0] + 1, w[1] - 1, MAT.steel[3]); zoA_in(A, c[0] + 2.1, c[1] - 5, w[0] + 1.5, w[1] - 1, MAT.steelDark[0]);   // the ridge
    for (let i = 0; i < 3; i++) { const y = c[1] - 1.2 + i * 3; zoA_in(A, c[0] - 5, y + 0.6, c[0] + 6, y - 0.4, MAT.steelDark[0]); zoA_in(A, c[0] - 5, y + 1.1, c[0] + 6, y + 0.1, MAT.steel[2]); A.stud(c[0] - 2.6, y + 1.4, 'steel'); A.stud(c[0] + 4, y + 0.3, g.trim ? 'gold' : 'steel'); }
    A.speck(c[0] - 4, c[1] - 3, 9, 10, MAT.rust[2], 6, 4);
  }
  // the long end of the stole (a short rag at tier 0), thrown back over the far shoulder
  const sRoot = [J.shF[0] - 0.8, J.shF[1] - 0.2];
  // it falls from the shoulder, then the wind takes it: more of it lifts the harder the wind
  const sBase = J.walk ? Math.atan2(1.1, -1) : J.cast ? Math.atan2([0.9, 0.5, 0.35, 0.45][ph % 4], -1) : J.atk ? Math.atan2([1, 1.2, 0.5, 0.6][ph % 4], -1) : Math.atan2(1, -0.3);
  const sCurl = J.walk ? 0.45 : J.cast ? 0.35 : J.atk ? 0.4 : 0.4;
  const SP = zoA_stream(sRoot, T === 0 ? 5 : 7, T === 0 ? 1.9 : 2.2, sBase, 0.6 * gust + 0.16, t, sCurl);
  { const rb = zoA_ribbon(A, SP, T === 0 ? 1.2 : 1.3, T === 0 ? 1.3 : 2, stole, { sh: 0.6, hl: 0.7 }, true, t * 0.5 + 0.6);
    for (let i = 2; i < SP.length - 1; i += 2) { const a = rb.Rt[i], b = L(SP[i], rb.Lf[i + 1], 0.5); zoA_in(A, a[0], a[1], b[0], b[1], ST[1]); }   // the twist of the cloth
    if (T >= 1) for (let i = 1; i < rb.Lf.length; i += 2) A.fine(rb.Lf[i][0], rb.Lf[i][1] + 0.3, g.trim ? MAT.gold[3] : ST[1]);
    if (T >= 1) { const e = SP[SP.length - 1]; for (let i = 0; i < 3; i++) A.fine(e[0] - 0.8 + i * 0.6 + Math.cos(base) * 1.4, e[1] + Math.sin(base) * 1.4 + 0.6, ST[2]); } }   // the fringe
  // ---- the belt; the soul-leash coiled at the hip
  if (T === 0) {
    A.limb([[w[0] - 5, w[1] + 0.3], [w[0], w[1] - 0.2], [w[0] + 4.4, w[1] - 0.2]], 0.85, 0.85, 'rope', { round: 0.8 });
    for (let i = 0; i < 8; i++) A.hair(w[0] - 4.7 + i * 1.2, w[1] - 0.5, w[0] - 4.2 + i * 1.2, w[1] + 0.6, MAT.rope[1]);
  } else {
    A.poly([[w[0] - 5.1, w[1] - 0.8], [w[0] + 4.5, w[1] - 1.1], [w[0] + 4.5, w[1] + 0.9], [w[0] - 5.1, w[1] + 1.3]], 'leather', { bevel: 0.6 });
    A.stud(w[0] + 0.5, w[1] - 0.4, g.trim ? 'gold' : 'steel'); if (T === 2) { A.stud(w[0] - 2.5, w[1] - 0.2, 'steel'); A.stud(w[0] + 3, w[1] - 0.5, 'steel'); }
  }
  {
    const k = [w[0] + 2.6, w[1] + 3.4];
    A.ell(k[0], k[1], 2, 1.7, 'rope', { round: 1 }); A.ell(k[0], k[1], 1, 0.8, MAT.rope[0], { flat: true, contour: false, edge: false });
    A.hair(k[0] - 1.8, k[1] - 0.3, k[0] + 1.6, k[1] + 0.5, MAT.rope[1]); A.hair(k[0] - 1.4, k[1] + 0.8, k[0] + 1.4, k[1] - 0.9, MAT.rope[3]);
    const sw2 = lag * 1.1; A.limb([[k[0] + 1, k[1] + 1], [k[0] + 1.4 - sw2 * 0.5, k[1] + 4], [k[0] + 0.8 - sw2, k[1] + 7]], 0.4, 0.35, 'rope', { round: 0.4 });
    if (T >= 1) { A.fine(k[0] - 1, k[1] - 1.2, MAT.zoaWisp[3]); A.fine(k[0] + 1.5, k[1] + 0.6, MAT.zoaWisp[2]); A.fine(k[0] + 0.8 - sw2, k[1] + 7.2, MAT.zoaWisp[4]); }   // the leash, still humming
  }
  // ---- the stole around the neck, its short end hanging down the front (tier 1+); a rag scarf at tier 0
  A.shape((cx, X, Y) => { cx.moveTo(X(J.shF[0] - 1.2), Y(n[1] + 2.6)); cx.quadraticCurveTo(X(J.shF[0] - 0.5), Y(n[1] - 2.8), X(n[0] + 1), Y(n[1] - 1.4)); cx.quadraticCurveTo(X(n[0] + 4), Y(n[1] - 1), X(n[0] + 3.6), Y(n[1] + 1.2)); cx.quadraticCurveTo(X(n[0]), Y(n[1] + 2.2), X(J.shF[0] - 1.2), Y(n[1] + 2.6)); }, stole, { round: 1.5 });
  zoA_in(A, J.shF[0] - 0.5, n[1] + 1.4, n[0] + 3, n[1] - 0.2, ST[1]);
  if (T >= 1) {
    const s0 = [n[0] + 2, n[1] + 0.8], sw2 = J.walk ? -lag * 0.5 : J.cast ? -1 : 0;
    const P = [s0, [c[0] + 1.2 + sw2 * 0.3, c[1] - 2], [c[0] + 1 + sw2 * 0.6, w[1]], [c[0] + 0.8 + sw2, w[1] + 5], [c[0] + 0.6 + sw2 * 1.4, w[1] + 9.5]];
    const rb = zoA_ribbon(A, P, 1.3, 1.5, stole, { sh: 0.6, hl: 0.7 }, false);
    A.hair(P[1][0] - 0.3, P[1][1], P[3][0] - 0.3, P[3][1], ST[1]);
    for (let i = 0; i < 4; i++) A.fine(P[4][0] - 1.1 + i * 0.7, P[4][1] + 1.2, ST[i % 2 ? 1 : 3]);    // fringe
    // a black cross of mourning stitched on its end, gold on a fine piece
    const q = P[3]; A.hair(q[0], q[1] - 1.4, q[0], q[1] + 1.4, g.trim ? MAT.gold[3] : '#101216'); A.hair(q[0] - 0.8, q[1] - 0.5, q[0] + 0.8, q[1] - 0.5, g.trim ? MAT.gold[3] : '#101216');
  }
  if (T === 2) { A.limb([[J.shF[0] + 0.5, n[1] + 1.5], [n[0] + 1, n[1] + 2.4], [J.shN[0] - 0.5, n[1] + 2]], 1.1, 1.1, 'steelDark', { metal: true, round: 0.9 }); }
  // ---------------------------------------------------------------- the head: gaunt, a mourner's veil, cold blue eyes
  A.limb([[n[0] + 0.4, n[1] + 1], [h[0] + 1, h[1] + 3.2]], 1.5, 1.4, 'zoaFlesh', { round: 1.3 });
  A.shape((cx, X, Y) => {
    cx.moveTo(X(h[0] - 3.4), Y(h[1] + 0.5)); cx.quadraticCurveTo(X(h[0] - 3.9), Y(h[1] - 5.4), X(h[0] + 0.5), Y(h[1] - 5.5));
    cx.quadraticCurveTo(X(h[0] + 4), Y(h[1] - 5.3), X(h[0] + 4.2), Y(h[1] - 1.8));
    cx.lineTo(X(h[0] + 4.9), Y(h[1] + 0.5)); cx.lineTo(X(h[0] + 4.1), Y(h[1] + 1));
    cx.lineTo(X(h[0] + 3.8), Y(h[1] + 2.6)); cx.lineTo(X(h[0] + 3), Y(h[1] + 4.2)); cx.lineTo(X(h[0] + 1.4), Y(h[1] + 4.4));
    cx.quadraticCurveTo(X(h[0] - 1.2), Y(h[1] + 3.2), X(h[0] - 3.4), Y(h[1] + 0.5));
  }, 'zoaFlesh', { round: 3 });
  const eyes = (glow) => {
    A.ell(h[0] + 1.8, h[1] - 0.9, 1.05, 0.8, '#07080c', { flat: true, contour: false, edge: false }); A.ell(h[0] + 3.8, h[1] - 0.9, 0.6, 0.7, '#07080c', { flat: true, contour: false, edge: false });
    A.fine(h[0] + 2, h[1] - 0.9, glow ? '#e8f8ff' : '#bfe6ff'); A.fine(h[0] + 1.6, h[1] - 0.9, '#5a8ab8'); A.fine(h[0] + 3.9, h[1] - 0.9, '#8cc4ec');
  };
  if (g.head !== 'hood') {
    A.poly([[h[0] + 0.3, h[1] - 0.5], [h[0] + 4.2, h[1] - 0.5], [h[0] + 3.8, h[1] + 2.6], [h[0] + 3, h[1] + 4.2], [h[0] + 1.4, h[1] + 4.4], [h[0] - 0.3, h[1] + 2.6]], 'zoaFlesh', { round: 1.2, tone: -1.2, contour: false, edge: false });
    A.hair(h[0] + 0.5, h[1] - 1.9, h[0] + 4.3, h[1] - 2.1, S[0]);
    eyes(false);
    A.fine(h[0] + 4.4, h[1] - 0.3, S[3]); A.fine(h[0] + 4.6, h[1] + 0.2, S[3]);
    A.fine(h[0] + 1, h[1] + 0.6, S[3]); A.hair(h[0] + 1.3, h[1] + 1.2, h[0] + 1.7, h[1] + 3, S[0]);   // the cheekbone and the hollow under it
    // the scalp: ash-white hair, parted and combed back flat
    A.shape((cx, X, Y) => { cx.moveTo(X(h[0] + 2.2), Y(h[1] - 5.6)); cx.quadraticCurveTo(X(h[0] - 3.4), Y(h[1] - 6.6), X(h[0] - 4), Y(h[1] - 1)); cx.lineTo(X(h[0] - 3.6), Y(h[1] + 2.5)); cx.lineTo(X(h[0] - 2.2), Y(h[1] + 0.5)); cx.quadraticCurveTo(X(h[0] - 1.6), Y(h[1] - 3.2), X(h[0] + 3.8), Y(h[1] - 3.9)); }, 'zoaHair', { round: 2 });
    for (let i = 0; i < 3; i++) A.hair(h[0] + 1 - i * 1.2, h[1] - 5.3 + i * 0.2, h[0] - 3 - i * 0.2, h[1] - 2 + i * 1.2, MAT.zoaHair[i % 2 ? 1 : 3]);
    if (g.head === 'mask') {
      // a bronze breathing-mask: a snout with a round grille, a hose back to the collar, a strap round the skull
      A.hair(h[0] + 0.3, h[1] - 0.1, h[0] - 3.4, h[1] - 1.2, MAT.leather[2]);
      A.limb([[h[0] + 1.5, h[1] + 3.2], [h[0] - 1, h[1] + 4.8], [n[0] - 1.5, n[1] + 2]], 0.7, 0.6, 'bronze', { round: 0.6 });
      for (let i = 0; i < 4; i++) { const p = L([h[0] + 1.2, h[1] + 3.6], [n[0] - 1.5, n[1] + 2], i / 4); A.fine(p[0], p[1], MAT.bronze[0]); }
      A.shape((cx, X, Y) => { cx.moveTo(X(h[0] + 0.4), Y(h[1] + 0.1)); cx.lineTo(X(h[0] + 4.6), Y(h[1] + 0.1)); cx.lineTo(X(h[0] + 6.4), Y(h[1] + 1.4)); cx.lineTo(X(h[0] + 6.4), Y(h[1] + 3.4)); cx.lineTo(X(h[0] + 4.2), Y(h[1] + 4.8)); cx.lineTo(X(h[0] + 1.2), Y(h[1] + 4.4)); cx.lineTo(X(h[0] + 0.2), Y(h[1] + 2.4)); }, g.trim ? 'gold' : 'bronze', { round: 1.5, metal: true });
      A.ell(h[0] + 5.2, h[1] + 2.4, 1.3, 1.4, 'verdigris', { round: 1 });
      for (const [dx, dy] of [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4], [0, 0]]) A.fine(h[0] + 5.2 + dx, h[1] + 2.4 + dy, '#0a0c0c');
      A.hair(h[0] + 0.6, h[1] + 2.4, h[0] + 3.8, h[1] + 2.2, MAT.bronze[0]); A.stud(h[0] + 1.2, h[1] + 1, 'bronze');
      A.speck(h[0] + 0.5, h[1] + 0.3, 5, 4, MAT.verdigris[3], 4, 5);
      // breath fogging out of the grille
      { const f = [h[0] + 7, h[1] + 2.2 - (ph % 4) * 0.4]; A.fine(f[0] + (ph % 4) * 0.4, f[1], 'rgba(200,225,255,0.5)'); A.fine(f[0] + 0.8 + (ph % 4) * 0.5, f[1] - 0.6, 'rgba(200,225,255,0.3)'); }
    } else {
      // the mourner's veil: from under the eyes to a point below the chin, stirring
      const vx = -gust * 0.8 - lag * 0.3;
      A.shape((cx, X, Y) => { cx.moveTo(X(h[0] - 0.6), Y(h[1] + 0.2)); cx.lineTo(X(h[0] + 4.7), Y(h[1] + 0.3)); cx.lineTo(X(h[0] + 5.1), Y(h[1] + 1)); cx.lineTo(X(h[0] + 4.4 + vx * 0.5), Y(h[1] + 4.5)); cx.lineTo(X(h[0] + 3 + vx), Y(h[1] + 7)); cx.lineTo(X(h[0] + 1.5 + vx), Y(h[1] + 5.4)); cx.lineTo(X(h[0] - 0.2 + vx * 0.6), Y(h[1] + 6)); cx.lineTo(X(h[0] - 1), Y(h[1] + 3)); }, stole, { sh: 0.9, tone: T ? -0.8 : 0.4 });
      A.hair(h[0] + 4.7, h[1] + 0.3, h[0] - 0.6, h[1] + 0.2, ST[4]);
      A.hair(h[0] + 2.4, h[1] + 1, h[0] + 2.7 + vx, h[1] + 5.6, ST[1]); A.hair(h[0] + 3.9, h[1] + 1.2, h[0] + 3.6 + vx * 0.6, h[1] + 4.6, ST[1]);
      A.fine(h[0] + 4.4, h[1] + 1.6, ST[1]);   // the breath under the cloth
    }
  } else {
    // a deep cowl, the face lost in it; a pale veil hung inside; a long tail streaming off the back
    const hm = T === 0 ? 'zoaWrap' : 'zoaCloak', HM = MAT[hm];
    const TP = zoA_stream([h[0] - 3.8, h[1] - 4.5], 5, 2, base - 0.1, 0.5 * gust + 0.12, t + 1, 0.2);
    zoA_ribbon(A, TP, 1.5, 0.6, hm, { sh: 0.6, hl: 0.6 }, true);
    A.shape((cx, X, Y) => {
      cx.moveTo(X(J.shF[0] - 2.2), Y(n[1] + 3.5)); cx.quadraticCurveTo(X(h[0] - 6.5), Y(h[1] - 1), X(h[0] - 4.2), Y(h[1] - 6.2));
      cx.quadraticCurveTo(X(h[0] - 1), Y(h[1] - 8.4), X(h[0] + 3.4), Y(h[1] - 6.4)); cx.quadraticCurveTo(X(h[0] + 6.4), Y(h[1] - 4), X(h[0] + 6), Y(h[1] + 1.5));
      cx.lineTo(X(h[0] + 5.4), Y(h[1] + 5)); cx.quadraticCurveTo(X(n[0] + 4), Y(n[1] + 2.5), X(J.shN[0] + 1.5), Y(J.shN[1] + 1.2)); cx.lineTo(X(J.shF[0] - 2.2), Y(n[1] + 3.5));
    }, hm, { round: 3 });
    A.shape((cx, X, Y) => { cx.moveTo(X(h[0] + 0.6), Y(h[1] - 4)); cx.quadraticCurveTo(X(h[0] + 4.6), Y(h[1] - 4.2), X(h[0] + 5.2), Y(h[1] + 0.2)); cx.lineTo(X(h[0] + 4.9), Y(h[1] + 4.4)); cx.quadraticCurveTo(X(h[0] + 1.2), Y(h[1] + 4.5), X(h[0] + 0.6), Y(h[1] - 4)); }, '#050608', { flat: true, contour: false, edge: false });
    A.fine(h[0] + 2.4, h[1] - 1, '#e8f8ff'); A.fine(h[0] + 2, h[1] - 1, '#6aa0d0'); A.fine(h[0] + 4, h[1] - 1, '#9ccbec');
    A.poly([[h[0] + 1.2, h[1] + 0.2], [h[0] + 5, h[1] + 0.2], [h[0] + 4.6, h[1] + 4.4], [h[0] + 3.2 - gust * 0.4, h[1] + 6.2], [h[0] + 1.6, h[1] + 4.2]], T === 0 ? 'zoaWrap' : 'zoaStole', { round: 1, tone: -0.8 });
    A.hair(h[0] + 2.8, h[1] + 0.8, h[0] + 3 - gust * 0.3, h[1] + 5.4, MAT[T === 0 ? 'zoaWrap' : 'zoaStole'][1]);
    A.hair(h[0] - 4.2, h[1] - 6, h[0] - 1.5, h[1] + 3, HM[1]); A.hair(h[0] - 3.8, h[1] - 6.6, h[0] + 3, h[1] - 6.3, HM[3]);
    zoA_in(A, h[0] + 0.3, h[1] - 4.4, h[0] + 4.6, h[1] - 4.6, g.trim ? MAT.gold[3] : HM[4]);
  }
  // ---------------------------------------------------------------- the near arm
  if (T === 2) {
    A.ell(J.shN[0] + 0.3, J.shN[1] + 0.3, 3.2, 2.5, 'steelDark', { round: 2, metal: true, rot: -0.2 });
  }
  arm(J.shN, J.elN, J.haN, false);
  if (T === 2) {
    for (let i = 0; i < 3; i++) A.ell(J.shN[0] + 0.3 + i * 0.3, J.shN[1] - 0.2 + i * 1.4, 3.3 - i * 0.4, 1.5, 'steelDark', { round: 1, metal: true, rot: -0.25 });
    A.stud(J.shN[0] - 1.2, J.shN[1] - 0.2, g.trim ? 'gold' : 'steel');
  }
  pxWeapon(A, g, J, 'animancer');
  // casting: breath drawn out of the air into the palm, wisps spiralling in, a small face crying out in the light
  if (J.cast) {
    const q = [J.haN[0] + 2.6, J.haN[1] - 2.2 - ph * 0.4], r = [6.5, 4.2, 2.6, 2.9][ph % 4];
    for (let i = 0; i < 5; i++) {
      const a = i * 1.26 + ph * 0.8, p = [q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r * 0.8];
      A.fine(p[0], p[1], MAT.zoaWisp[4]); A.px(p[0], p[1], MAT.zoaWisp[3]);
      for (let k = 1; k <= 3; k++) { const b = a - k * 0.22, rr = r + k * 0.5; A.fine(q[0] + Math.cos(b) * rr, q[1] + Math.sin(b) * rr * 0.8, k === 1 ? MAT.zoaWisp[2] : MAT.zoaWisp[1]); }
    }
    const cr = 1 + ph * 0.45;
    A.ell(q[0], q[1], cr + 1.3, cr + 1.3, 'rgba(150,200,255,0.28)', { flat: true, contour: false, edge: false }); A.ell(q[0], q[1], cr + 0.6, cr + 0.6, 'rgba(170,215,255,0.45)', { flat: true, contour: false, edge: false });
    A.ell(q[0], q[1], cr, cr, 'zoaWisp', { round: 1 }); A.fine(q[0] - 0.4, q[1] - 0.4, '#ffffff');
    if (ph >= 2) { A.fine(q[0] - 0.5, q[1] - 0.3, '#20405e'); A.fine(q[0] + 0.5, q[1] - 0.3, '#20405e'); A.fine(q[0], q[1] + 0.5, '#20405e'); A.fine(q[0], q[1] + 0.9, '#3a6a94'); }
    A.hair(J.haN[0] + 1.2, J.haN[1] - 0.4, q[0], q[1], MAT.zoaWisp[2]);
    A.lamp(q[0], q[1], [170, 215, 255], 13 + ph * 2, 0.9);
  }
  A.rim([150, 178, 215], 0.34);
};

// ------------------------------------------------------------------- the OSSUMANCER
HPX.ossumancer = function (A, pose, ph, g, J) {
  const T = g.tier, S = MAT.zooFlesh, L = zoA_lerp, B = MAT.bone;
  const FAR = { contour: false, tone: -1.6 }, NEAR = {};
  const h = J.head, n = J.neck, c = J.chest, w = J.waist;
  const t = ph * Math.PI / 2;
  const lag = J.walk ? Math.sin(J.G.a - 1.3) : J.atk ? [0.5, 0.8, -0.9, -0.5][ph % 4] : J.cast ? [0.2, 0.4, -0.5, -0.3][ph % 4] : Math.sin(t) * 0.15;
  const cas = T === 0 ? 'zooDrab' : 'zooBlack', C = MAT[cas];
  const WB = [w[0] - 6, w[1] + 0.5], WF = [w[0] + 5.4, w[1] + 0.5];
  // a finger bone: two joints and a knuckle
  const finger = (p, a, len = 1.5) => { const q = [p[0] + Math.cos(a) * len, p[1] + Math.sin(a) * len]; A.hair(p[0], p[1], q[0], q[1], B[3]); A.fine(p[0], p[1], B[4]); A.fine(q[0], q[1], B[2]); A.fine((p[0] + q[0]) / 2 + 0.4, (p[1] + q[1]) / 2, B[1]); };
  const arm = (s, e, ha, far) => {
    const o = far ? FAR : NEAR;
    A.limb([s, L(s, e, 0.5), e], 2.7, 2.3, cas, o);
    if (!far) zoA_in(A, s[0] - 1.4, s[1] + 1, e[0] - 1.2, e[1], C[3]);
    if (T === 0) {
      // the sleeve rotted off at the elbow; the forearm painted with its own bones
      A.limb([e, L(e, ha, 0.5), ha], 1.6, 1.15, 'zooFlesh', o);
      A.poly([[e[0] - 2.3, e[1] - 0.5], [e[0] + 2.3, e[1] - 0.3], [e[0] + 1.6, e[1] + 2.2], [e[0] + 0.4, e[1] + 1.4], [e[0] - 0.6, e[1] + 2.6], [e[0] - 2, e[1] + 1.6]], cas, { ...o, bevel: 0.6 });
      if (!far) { const a = L(e, ha, 0.3), b = L(e, ha, 0.85); A.hair(a[0] - 0.4, a[1], b[0] - 0.4, b[1], B[3]); A.hair(a[0] + 0.5, a[1] + 0.2, b[0] + 0.4, b[1], B[2]); }
    } else {
      A.limb([e, L(e, ha, 0.5), L(e, ha, 0.82)], 2.2, 2.3, cas, o);
      const cf = L(e, ha, 0.8);
      if (T === 1) { A.limb([L(e, ha, 0.7), cf], 2.45, 2.45, 'clothBone', { ...o, bevel: 0.5 }); if (!far) for (let i = 0; i < 3; i++) A.fine(cf[0] - 1.2 + i * 1.1, cf[1] + 1.8, B[3]); }
      else { const v0 = L(e, ha, 0.15); A.limb([v0, cf], 2.1, 2, 'boneOld', { ...o, round: 1 }); if (!far) for (let i = 0; i < 3; i++) { const p = L(v0, cf, 0.2 + i * 0.3); A.hair(p[0] - 1.6, p[1] + 0.8, p[0] + 1.6, p[1] - 0.6, MAT.boneOld[0]); } }
    }
    // a hand with its bones painted white down every finger
    zoA_hand(A, e, ha, 'zooFlesh', o, far ? S[1] : B[2], 1.5, far ? null : B[1]);
  };
  const leg = (k, a, far) => {
    const o = far ? FAR : NEAR;
    A.limb([k, L(k, a, 0.5), a], 1.9, 1.35, T === 2 ? 'boneOld' : 'zooFlesh', o);
    const fm = T === 0 ? 'zooFlesh' : T === 1 ? 'zooBlack' : 'boneOld';
    A.shape((cx, X, Y) => { cx.moveTo(X(a[0] - 2), Y(Math.min(0, a[1] + 3))); cx.lineTo(X(a[0] - 1.6), Y(a[1] - 0.5)); cx.lineTo(X(a[0] + 1.2), Y(a[1] - 0.5)); cx.quadraticCurveTo(X(a[0] + 2.5), Y(a[1] + 1.5), X(a[0] + 5.2), Y(Math.min(0, a[1] + 2.4))); cx.lineTo(X(a[0] + 5.4), Y(Math.min(0, a[1] + 3))); }, fm, { ...o, round: 1 });
    if (T === 0 && !far) { for (let i = 0; i < 3; i++) A.fine(a[0] + 3.4 + i * 0.7, Math.min(0, a[1] + 3) - 0.4, S[0]); A.hair(a[0] - 1.4, a[1] + 1, a[0] + 2, a[1] + 1.8, MAT.leather[2]); }   // a sandal thong, dirty toes
    if (T === 2 && !far) { A.hair(a[0] - 1, a[1] + 1.2, a[0] + 3, a[1] + 2, MAT.boneOld[0]); A.fine(a[0] + 4.8, Math.min(0, a[1] + 3) - 0.8, B[4]); }
  };
  // ---------------------------------------------------------------- behind: the spine rising over the head (tier 2)
  if (T === 2) {
    for (let i = 0; i < 7; i++) {
      const u = i / 6;
      // an arc of vertebrae from the nape up behind the skull and over the crown, each spine pointing outward
      const th = 2.45 + u * 2.05, rr = 6.6 - u * 0.4, v = [h[0] - 0.4 + Math.cos(th) * rr, h[1] - 0.5 + Math.sin(th) * rr * 1.05], ox = Math.cos(th), oy = Math.sin(th), sp = 2.2 - u * 0.7;
      A.poly([[v[0] - oy * 0.55, v[1] + ox * 0.55], [v[0] + ox * (1 + sp), v[1] + oy * (1 + sp)], [v[0] + oy * 0.55, v[1] - ox * 0.55]], 'boneOld', { sh: 0.4, hl: 0.4, contour: false });   // the spinous process
      A.ell(v[0], v[1], 1.45 - u * 0.4, 1.1 - u * 0.2, 'bone', { sh: 0.5, hl: 0.6, rot: th });
      A.fine(v[0] - ox * 0.8, v[1] - oy * 0.8, B[0]);
    }
  }
  // ---------------------------------------------------------------- far arm, legs
  arm(J.shF, J.elF, J.haF, true);
  // a string of finger-bone beads hanging from the far hand, swinging behind it
  { const a0 = J.haF, sw = lag * 0.5; for (let i = 0; i < 6; i++) { const p = [a0[0] + 0.8 - sw * i * 0.3, a0[1] + 2 + i * 0.9]; A.fine(p[0], p[1], i % 2 ? B[2] : B[4]); } A.px(a0[0] + 0.8 - sw * 1.8, a0[1] + 7.4, B[3]); }
  leg(J.kneeF, J.ankF, true);
  leg(J.kneeN, J.ankN, false);
  // ---------------------------------------------------------------- the cassock below the belt: long, wide, dragging
  const sway = J.walk ? J.sw : 0, hemY = T === 0 ? -5.5 : -2.8;
  const HF = [Math.max(J.kneeN[0] + 5, 9), hemY - 0.8], HB = [Math.min(J.kneeF[0] - 6.8, -10.6) - sway * 1.3 - (J.walk ? 1 : 0), hemY + 0.3];
  const RQ = (u, v) => L(L(WB, WF, u), L(HB, HF, u), v);
  A.shape((cx, X, Y) => {
    cx.moveTo(X(WB[0]), Y(WB[1])); cx.lineTo(X(WF[0]), Y(WF[1]));
    cx.quadraticCurveTo(X(WF[0] + 1.6), Y((WF[1] + HF[1]) / 2), X(HF[0]), Y(HF[1]));
    const N = T === 0 ? 9 : 10; for (let i = 1; i <= N; i++) { const p = RQ(1 - i / N, 1), d = T === 0 ? (i % 2) * 1.6 + (i % 3 === 0 ? 1.4 : 0) : (i % 2) * 0.6; cx.lineTo(X(p[0]), Y(Math.min(-0.2, p[1] + d))); }
    cx.quadraticCurveTo(X(WB[0] - 2.8), Y((WB[1] + HB[1]) / 2), X(WB[0]), Y(WB[1]));
  }, cas, { round: 5 });
  [0.14, 0.36, 0.58, 0.8].forEach((u, i) => {
    const du = 0.04 + i * 0.004, sv = 0.2 + (i % 2) * 0.1, sh = J.walk ? J.sw * 0.04 * (i - 1.5) : 0;
    const a = RQ(u, sv), b = RQ(u - du + sh, 1), b2 = RQ(u + du + sh, 1);
    A.poly([a, [b[0], b[1] + 0.5], [b2[0], b2[1] + 0.5]], cas, { flat: true, tone: -1.4, contour: false, edge: false });
    const la = RQ(u + 0.05, sv + 0.1), lb = RQ(u + 0.06 + sh, 0.95); zoA_in(A, la[0], la[1], lb[0], lb[1], C[3]);
  });
  if (T === 0) {
    // patched, the hem gone to rags, grave dirt caked up it
    { const p = RQ(0.3, 0.45); A.poly([[p[0] - 1.2, p[1] - 1.4], [p[0] + 1.4, p[1] - 1.2], [p[0] + 1.3, p[1] + 1.2], [p[0] - 1.1, p[1] + 1.3]], 'clothBrown', { bevel: 0.4 }); for (let i = 0; i < 4; i++) A.fine(p[0] - 1.1 + i * 0.8, p[1] - 1.5, B[2]); }
    A.speck(HB[0], hemY - 5, HF[0] - HB[0], 5, MAT.clothBrown[2], 14, 7);
  }
  if (T >= 1) {
    // the scapular: a long panel of bleached cloth down the front, a black ossuary cross stitched on it
    const P0 = RQ(0.58, 0), P1 = RQ(0.8, 0), P2 = RQ(0.84, 0.96), P3 = RQ(0.56, 0.96);
    A.poly([P0, P1, P2, [L(P2, P3, 0.5)[0], L(P2, P3, 0.5)[1] + 1.2], P3], T === 2 ? 'clothBone' : 'clothBone', { round: 1.5 });
    const m = L(L(P0, P1, 0.5), L(P2, P3, 0.5), 0.45); A.hair(m[0], m[1] - 2.4, m[0] + 0.3, m[1] + 2.4, '#0c0a0c'); A.hair(m[0] - 1.1, m[1] - 1, m[0] + 1.3, m[1] - 1.1, '#0c0a0c');
    A.fine(m[0] - 1.3, m[1] - 1.1, B[4]); A.fine(m[0] + 1.5, m[1] - 1.1, B[4]); A.fine(m[0], m[1] - 2.6, B[4]);
    zoA_in(A, P0[0] + 0.3, P0[1] + 0.5, P3[0] + 0.4, P3[1] - 0.5, MAT.clothBone[1]);
    // bone chips stitched in a row above the hem
    for (let i = 0; i < 8; i++) { const p = RQ(0.04 + i * 0.13, 0.84); A.ell(p[0], p[1], 0.5, 0.75, g.trim ? 'gold' : 'bone', { round: 0.5, contour: false }); A.fine(p[0], p[1] - 0.9, C[4]); }
  }
  if (T === 2) {
    // faulds of fused bone over the hips, two rows
    for (let r = 1; r >= 0; r--) for (let i = 0; i < 3; i++) {
      const u = 0.04 + i * 0.31 + r * 0.14, p = RQ(u, 0.03 + r * 0.22), q = RQ(u + 0.32, 0.03 + r * 0.22), mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      A.poly([p, q, [q[0] + 0.2, q[1] + 2.6], [mid[0] + 0.8, mid[1] + 3.6], [mid[0] - 0.8, mid[1] + 3.6], [p[0] - 0.2, p[1] + 2.6]], 'boneOld', { sh: 0.9, hl: 0.6, tone: r ? -0.8 : 0 });
      zoA_in(A, p[0] + 0.6, p[1] + 0.7, q[0] - 0.4, q[1] + 0.7, MAT.boneOld[1]); A.fine(mid[0], mid[1] + 1.8, MAT.boneOld[0]); A.fine(mid[0] + 0.5, mid[1] + 1.8, MAT.boneOld[0]);   // sutures, a rivet hole
    }
  }
  // ---------------------------------------------------------------- the candle-skull, hung from the belt at the back
  {
    const a = lag * 0.35, top = [w[0] - 5.2, w[1] + 0.8], s = [top[0] + Math.sin(a) * 6 - 3.6, top[1] + Math.cos(a) * 6];
    zoA_chain(A, top, [s[0] + 0.3, s[1] - 1.8]);
    A.ell(s[0], s[1], 2.4, 2.1, 'bone', { sh: 0.8, hl: 0.8 });
    A.poly([[s[0] - 0.4, s[1] + 0.8], [s[0] + 2.2, s[1] + 0.6], [s[0] + 2, s[1] + 2.5], [s[0] + 0.2, s[1] + 2.4]], 'boneOld', { bevel: 0.5 });
    A.ell(s[0] + 0.3, s[1] + 0.1, 0.55, 0.55, '#0a0605', { flat: true, contour: false, edge: false }); A.ell(s[0] + 1.6, s[1] + 0.1, 0.45, 0.55, '#0a0605', { flat: true, contour: false, edge: false });
    for (let i = 0; i < 3; i++) A.fine(s[0] + 0.5 + i * 0.6, s[1] + 1.8, '#1a120c');
    // the candle stuck in the crown, wax running down the brow
    A.rect(s[0] - 0.2, s[1] - 4, 1.1, 2.6, MAT.wax[3]); A.fine(s[0] - 0.2, s[1] - 4, MAT.wax[4]); A.fine(s[0] + 0.7, s[1] - 2.6, MAT.wax[1]);
    A.hair(s[0] + 0.9, s[1] - 1.6, s[0] + 1.1, s[1] - 0.5, MAT.wax[3]); A.hair(s[0] - 0.4, s[1] - 1.6, s[0] - 0.7, s[1] + 0.3, MAT.wax[2]);
    const fl = [s[0] + 0.3 - lag * 0.4, s[1] - 5.2]; A.fine(fl[0], fl[1] + 0.6, '#ffb040'); A.fine(fl[0], fl[1], '#ffe8a0'); A.fine(fl[0] - lag * 0.3, fl[1] - 0.6, '#fff4d0'); A.fine(fl[0], fl[1] + 1.1, '#e06018');
    A.lamp(fl[0], fl[1] + 0.5, [255, 226, 170], 17, 0.8);
  }
  // ---------------------------------------------------------------- the torso: a broad priest's chest under the cassock
  const torso = (cx, X, Y) => {
    cx.moveTo(X(J.shF[0] - 1.8), Y(J.shF[1] + 0.5)); cx.quadraticCurveTo(X(J.shF[0]), Y(n[1] + 0.5), X(n[0]), Y(n[1] + 1.5));
    cx.quadraticCurveTo(X(J.shN[0] - 1), Y(n[1] + 1), X(J.shN[0] + 2), Y(J.shN[1] + 0.2));
    cx.quadraticCurveTo(X(c[0] + 6.5), Y(c[1] - 1), X(c[0] + 5.2), Y(c[1] + 3)); cx.quadraticCurveTo(X(w[0] + 5), Y(w[1] - 2), X(WF[0]), Y(w[1] + 1));
    cx.lineTo(X(WB[0]), Y(w[1] + 1)); cx.quadraticCurveTo(X(c[0] - 6.2), Y(c[1] + 1), X(J.shF[0] - 1.8), Y(J.shF[1] + 0.5));
  };
  A.shape(torso, cas, { round: 4 });
  A.poly([[c[0] - 3, c[1] - 2], [w[0] - 1.5, w[1]], [w[0] - 3, w[1]]], cas, { flat: true, tone: -1.4, contour: false, edge: false });
  if (T === 0) {
    // torn open at the chest: a starved breast with its ribs painted on in ivory
    A.poly([[n[0] - 1.2, n[1] + 1.2], [n[0] + 4.4, n[1] + 1], [c[0] + 3.4, c[1] + 2.5], [c[0] + 1.4, c[1] + 4]], 'zooFlesh', { round: 2 });
    A.hair(n[0] + 1.5, n[1] + 2.4, c[0] + 2, c[1] + 3, B[3]);
    for (let i = 0; i < 3; i++) { const y = c[1] - 3 + i * 2; zoA_in(A, c[0] + 1.6, y, c[0] + 0.2, y + 0.9, B[2]); zoA_in(A, c[0] + 2.3, y, c[0] + 3.4, y + 0.8, B[1]); }
    zoA_in(A, c[0] - 3.5, c[1] - 3, c[0] - 2.5, w[1] - 1, C[1]);
  } else {
    // a black cassock kept like a relic: the scapular goes over it below, and over the mozzetta above
  }
  if (T === 2) {
    // the rib cuirass: a sternum plate, ribs curving round the chest, the black showing between
    // one fused mass of ivory over the chest, the gaps between the ribs cut dark through it
    A.shape((cx, X, Y) => { cx.moveTo(X(c[0] - 4.8), Y(c[1] - 3.2)); cx.quadraticCurveTo(X(c[0]), Y(c[1] - 6.6), X(c[0] + 5.6), Y(c[1] - 2.8)); cx.quadraticCurveTo(X(c[0] + 6), Y(c[1] + 3), X(c[0] + 3.2), Y(c[1] + 4.6)); cx.lineTo(X(c[0] + 1.9), Y(c[1] + 3.4)); cx.lineTo(X(c[0] + 0.6), Y(c[1] + 4.6)); cx.quadraticCurveTo(X(c[0] - 5.6), Y(c[1] + 2), X(c[0] - 4.8), Y(c[1] - 3.2)); }, 'boneOld', { sh: 1.1, hl: 0.7 });
    for (let i = 0; i < 3; i++) {
      const y = c[1] - 2.6 + i * 2.6;
      zoA_in(A, c[0] + 0.9, y, c[0] - 2.2, y - 0.1 + i * 0.1, '#0c0a0c'); zoA_in(A, c[0] - 2.2, y + i * 0.1, c[0] - 5, y + 1.6, '#0c0a0c');
      zoA_in(A, c[0] + 2.9, y, c[0] + 4.6, y + 0.2, '#0c0a0c'); zoA_in(A, c[0] + 4.6, y + 0.2, c[0] + 6, y + 1.4, '#0c0a0c');
    }
    zoA_in(A, c[0] + 0.9, n[1] + 2.6, c[0] + 0.9, c[1] + 3.6, B[1]); zoA_in(A, c[0] + 1.5, n[1] + 2.8, c[0] + 1.5, c[1] + 3, B[4]);   // the sternum
    for (let i = 0; i < 2; i++) { const y = w[1] - 4.2 + i * 2; A.poly([[w[0] - 4.8, y], [w[0] + 4.6, y - 0.4], [w[0] + 4.4, y + 1.7], [w[0] - 4.6, y + 2]], 'boneOld', { sh: 0.6, hl: 0.5, tone: -0.1 }); A.fine(w[0] - 2, y + 1, MAT.boneOld[0]); A.fine(w[0] + 2.4, y + 0.8, MAT.boneOld[0]); }
  }
  // ---- the belt: a knotted cord (tier 0), a black girdle with a bone clasp
  if (T === 0) {
    A.limb([[w[0] - 6, w[1] + 0.3], [w[0], w[1] - 0.2], [w[0] + 5.4, w[1] - 0.2]], 0.9, 0.9, 'rope', { round: 0.8 });
    for (let i = 0; i < 9; i++) A.hair(w[0] - 5.7 + i * 1.2, w[1] - 0.6, w[0] - 5.2 + i * 1.2, w[1] + 0.7, MAT.rope[1]);
    const k = [w[0] + 2.8, w[1] + 0.5], sw = lag * 1; A.ell(k[0], k[1], 1.1, 1, 'rope', { round: 0.8 }); A.limb([k, [k[0] + 0.4 - sw * 0.5, k[1] + 4], [k[0] - sw, k[1] + 7]], 0.5, 0.4, 'rope', { round: 0.4 });
  } else {
    A.poly([[w[0] - 6.1, w[1] - 1], [w[0] + 5.5, w[1] - 1.3], [w[0] + 5.5, w[1] + 1], [w[0] - 6.1, w[1] + 1.4]], 'zooBlack', { bevel: 0.6, tone: 1 });
    A.ell(w[0] + 1.6, w[1] - 0.1, 1.4, 1.3, g.trim ? 'gold' : 'bone', { round: 1 }); A.fine(w[0] + 1.3, w[1] - 0.2, '#100a08'); A.fine(w[0] + 2, w[1] - 0.2, '#100a08');   // a tiny skull clasp
  }
  // ---- the shoulders: a mozzetta hung with finger bones (tier 1), scapula pauldrons (tier 2)
  if (T === 1) {
    const fr = [];
    A.shape((cx, X, Y) => {
      cx.moveTo(X(J.shF[0] - 3.2), Y(J.shF[1] + 4.5)); cx.quadraticCurveTo(X(J.shF[0] - 2.6), Y(n[1] - 1), X(n[0] + 0.5), Y(n[1] + 0.2));
      cx.quadraticCurveTo(X(J.shN[0] + 1), Y(n[1]), X(J.shN[0] + 3.6), Y(J.shN[1] + 3));
      const pts = [[J.shN[0] + 3, J.shN[1] + 5], [J.shN[0] + 0.5, J.shN[1] + 5.6], [c[0] + 1.5, c[1] - 0.6], [c[0] - 1.5, c[1] - 0.4], [c[0] - 4, c[1] - 0.8], [J.shF[0] - 1.6, J.shF[1] + 5.5]];
      for (const p of pts) { cx.lineTo(X(p[0]), Y(p[1])); fr.push(p); }
    }, 'zooBlack', { round: 3, tone: 0.6 });
    A.line(J.shF[0] - 1.5, J.shF[1] + 0.8, n[0] + 0.5, n[1] + 0.8, C[4]);
    const sw = J.walk ? -lag * 0.35 : J.cast ? -0.4 : 0;
    for (let i = 0; i < fr.length - 1; i++) for (let k = 0; k < 2; k++) { const p = L(fr[i], fr[i + 1], 0.25 + k * 0.5); finger([p[0], p[1] + 0.5], Math.PI / 2 - sw - 0.1 * (i % 2), 1.6); }
    for (let i = 0; i < fr.length - 1; i++) { const p = L(fr[i], fr[i + 1], 0.5); A.fine(p[0], p[1] - 0.2, g.trim ? MAT.gold[3] : B[3]); }
  }
  if (T === 1) {
    // the scapular carried up over the chest (under the mozzetta's opening)
    A.poly([[n[0] + 0.4, n[1] + 1.6], [n[0] + 3.6, n[1] + 1.4], [w[0] + 3.8, w[1] + 0.6], [w[0] + 0.4, w[1] + 0.6]], 'clothBone', { sh: 0.8, hl: 0.6 });
    zoA_in(A, n[0] + 0.8, n[1] + 2.4, w[0] + 0.9, w[1], MAT.clothBone[1]);
    { const m = [c[0] + 1.9, c[1] + 1.5]; A.ell(m[0], m[1] - 0.6, 0.9, 0.8, '#0c0a0c', { flat: true, contour: false, edge: false }); A.hair(m[0] - 0.4, m[1] + 0.2, m[0] + 0.4, m[1] + 0.2, '#0c0a0c'); A.fine(m[0] - 0.3, m[1] - 0.6, MAT.clothBone[3]); A.fine(m[0] + 0.3, m[1] - 0.6, MAT.clothBone[3]); }   // a stitched skull
  }
  // ---- the finger-bone necklace (tier 0/1), the reliquary (tier 1), the spine gorget (tier 2)
  if (T < 2) {
    const a = [n[0] - 1.8, n[1] + 1.8], b = [n[0] + 3.6, n[1] + 1.4], sw = J.walk ? -lag * 0.3 : 0;
    for (let i = 0; i <= 8; i++) { const u = i / 8, p = L(a, b, u); p[1] += Math.sin(u * Math.PI) * (T === 1 ? 1.2 : 2.6); A.fine(p[0], p[1], MAT.rope[2]); if ((T === 0 ? i === 3 || i === 5 : i % 2 === 0) && i > 0 && i < 8) finger([p[0], p[1] + 0.4], Math.PI / 2 - sw, 1.3); }
  }
  if (T === 1) {
    const q = [c[0] + 1.6 - (J.walk ? lag * 0.3 : 0), c[1] - 0.5];
    A.hair(n[0] - 0.8, n[1] + 1.8, q[0], q[1] - 1.6, MAT.zooGold[2]); A.hair(n[0] + 3.4, n[1] + 1.4, q[0] + 0.4, q[1] - 1.6, MAT.zooGold[1]);
    A.poly([[q[0] - 1.3, q[1] - 1.6], [q[0] + 1.4, q[1] - 1.6], [q[0] + 1.5, q[1] + 1.6], [q[0], q[1] + 2.8], [q[0] - 1.4, q[1] + 1.6]], g.trim ? 'gold' : 'zooGold', { bevel: 0.5, metal: true });
    A.rect(q[0] - 0.5, q[1] - 0.7, 1.1, 1.8, '#1a0c06'); A.hair(q[0] - 0.1, q[1] - 0.5, q[0] + 0.1, q[1] + 0.8, B[4]);   // a window, a relic bone inside
    A.hair(q[0], q[1] - 3, q[0], q[1] - 1.8, MAT.zooGold[3]); A.hair(q[0] - 0.6, q[1] - 2.5, q[0] + 0.6, q[1] - 2.5, MAT.zooGold[3]);
  }
  if (T === 2) {
    for (let i = 0; i < 5; i++) { const u = i / 4, p = L([J.shF[0] + 1, n[1] + 1.6], [J.shN[0] - 0.6, n[1] + 1.8], u); p[1] += Math.sin(u * Math.PI) * 1.4; A.ell(p[0], p[1], 1, 0.9, 'bone', { round: 0.8 }); A.fine(p[0], p[1] + 0.9, B[4]); }
    for (const [s, far] of [[J.shF, true]]) {
      A.poly([[s[0] - 3.4, s[1] + 2.6], [s[0] - 2.4, s[1] - 1.6], [s[0] + 1.2, s[1] - 2], [s[0] + 2.4, s[1] + 0.2], [s[0] - 0.6, s[1] + 3.4]], 'boneOld', { round: 1.5, tone: far ? -0.6 : 0 });
      A.hair(s[0] - 2.4, s[1] - 0.6, s[0] + 1.6, s[1] - 0.8, B[4]); A.poly([[s[0] - 1.4, s[1] - 1.8], [s[0] - 2.2, s[1] - 4.2], [s[0] - 0.2, s[1] - 1.9]], 'bone', { bevel: 0.4 });
    }
  }
  // ---------------------------------------------------------------- the head: shaven, painted as a skull
  A.limb([[n[0] + 0.5, n[1] + 1], [h[0] + 1, h[1] + 3.2]], 1.9, 1.8, 'zooFlesh', { round: 1.4 });
  const skull = (cx, X, Y) => {
    cx.moveTo(X(h[0] - 3.8), Y(h[1] + 0.5)); cx.quadraticCurveTo(X(h[0] - 4.4), Y(h[1] - 5.8), X(h[0] + 0.5), Y(h[1] - 5.9));
    cx.quadraticCurveTo(X(h[0] + 4.4), Y(h[1] - 5.6), X(h[0] + 4.5), Y(h[1] - 1.8));
    cx.lineTo(X(h[0] + 5), Y(h[1] + 0.5)); cx.lineTo(X(h[0] + 4.3), Y(h[1] + 1));
    cx.lineTo(X(h[0] + 4.3), Y(h[1] + 2.6)); cx.lineTo(X(h[0] + 3.5), Y(h[1] + 4.2)); cx.lineTo(X(h[0] + 1.2), Y(h[1] + 4.5));
    cx.quadraticCurveTo(X(h[0] - 1.6), Y(h[1] + 3.8), X(h[0] - 3.8), Y(h[1] + 0.5));
  };
  A.shape(skull, 'zooFlesh', { round: 3.5 });
  const paint = (hood) => {
    // the bone-white paint over brow, cheek and nose; black sockets; teeth drawn across the lips
    A.poly([[h[0] + 0.2, h[1] - 3.6], [h[0] + 4.4, h[1] - 3], [h[0] + 4.9, h[1] + 0.5], [h[0] + 4.3, h[1] + 2.8], [h[0] + 3.6, h[1] + 4.2], [h[0] + 1.3, h[1] + 4.4], [h[0] - 0.2, h[1] + 1.5]], 'bone', { round: 1.2, tone: hood ? -2.2 : -0.3, contour: false });
    A.ell(h[0] + 1.8, h[1] - 0.9, 1.3, 1.05, '#0a0607', { flat: true, contour: false, edge: false }); A.ell(h[0] + 3.9, h[1] - 0.9, 0.7, 0.95, '#0a0607', { flat: true, contour: false, edge: false });
    A.fine(h[0] + 2, h[1] - 0.8, '#e8c070'); A.fine(h[0] + 4, h[1] - 0.8, '#a07a3a');
    A.fine(h[0] + 4.3, h[1] + 0.9, '#0a0607'); A.fine(h[0] + 4.6, h[1] + 1.1, '#0a0607');
    A.hair(h[0] + 1.6, h[1] + 2.9, h[0] + 4.1, h[1] + 2.7, '#0a0607');
    for (let i = 0; i < 4; i++) A.hair(h[0] + 1.8 + i * 0.7, h[1] + 2.3, h[0] + 1.8 + i * 0.7, h[1] + 3.5, '#0a0607');
    A.hair(h[0] - 0.2, h[1] + 1.4, h[0] + 1, h[1] + 2.4, '#0a0607');   // the line of the painted jaw
  };
  if (g.head !== 'mask') paint(g.head === 'hood');
  if (!g.head) {
    // the bare shaven crown: a black sigil of the Standing Dead, the ear
    A.hair(h[0] - 1.6, h[1] - 5.2, h[0] - 1.6, h[1] - 2.4, '#140c0a'); A.hair(h[0] - 2.6, h[1] - 4.2, h[0] - 0.6, h[1] - 4.2, '#140c0a'); A.fine(h[0] - 1.6, h[1] - 1.9, '#140c0a');
    A.hair(h[0] - 3.2, h[1] - 4, h[0] + 0.6, h[1] - 5.4, S[4]);
    A.ell(h[0] - 1.4, h[1] + 0.2, 0.9, 1.3, 'zooFlesh', { round: 0.8 }); A.fine(h[0] - 1.3, h[1] + 0.3, S[0]);
    A.fine(h[0] - 1.4, h[1] + 1.6, MAT.zooGold[3]);   // a gold ring in the ear
  }
  if (g.head === 'mask') {
    // a skull worn as a face: the dome over the brow, the sockets, the nasal cavity, the upper teeth; his own chin below
    A.shape((cx, X, Y) => { cx.moveTo(X(h[0] - 1), Y(h[1] - 5.2)); cx.quadraticCurveTo(X(h[0] + 4.4), Y(h[1] - 6.6), X(h[0] + 5.8), Y(h[1] - 1.6)); cx.lineTo(X(h[0] + 5.6), Y(h[1] + 1.4)); cx.lineTo(X(h[0] + 5), Y(h[1] + 3)); cx.lineTo(X(h[0] + 1.4), Y(h[1] + 3.2)); cx.lineTo(X(h[0] + 0.6), Y(h[1] + 1.4)); cx.quadraticCurveTo(X(h[0] - 1.6), Y(h[1] - 1), X(h[0] - 1), Y(h[1] - 5.2)); }, 'bone', { round: 2.2 });
    A.ell(h[0] + 2, h[1] - 0.8, 1.3, 1.15, '#080405', { flat: true, contour: false, edge: false }); A.ell(h[0] + 4.5, h[1] - 0.8, 0.8, 1.05, '#080405', { flat: true, contour: false, edge: false });
    A.fine(h[0] + 2.1, h[1] - 0.7, '#ffb050'); A.fine(h[0] + 4.5, h[1] - 0.7, '#b07028');
    A.poly([[h[0] + 4.9, h[1] + 0.4], [h[0] + 5.4, h[1] + 1.8], [h[0] + 4.5, h[1] + 1.8]], '#080405', { flat: true, contour: false, edge: false });
    for (let i = 0; i < 5; i++) { A.hair(h[0] + 1.6 + i * 0.75, h[1] + 2.3, h[0] + 1.6 + i * 0.75, h[1] + 3.3, B[0]); A.fine(h[0] + 1.9 + i * 0.75, h[1] + 2.6, g.trim && i === 2 ? MAT.gold[4] : B[4]); }
    A.hair(h[0] + 0.8, h[1] - 3.2, h[0] - 0.4, h[1] - 0.6, B[1]); A.hair(h[0] + 1.6, h[1] - 5, h[0] + 3.2, h[1] - 3.6, B[1]);   // a suture, a crack
    A.hair(h[0] - 0.8, h[1] - 3.8, h[0] - 3.4, h[1] - 2.4, MAT.leather[2]);   // the strap
    A.hair(h[0] - 2.4, h[1] - 5, h[0] - 3.4, h[1] - 3.4, S[3]);
  }
  if (g.head === 'hood') {
    // a black cowl, heavy and round, its opening sewn with a row of teeth
    const hm = T === 0 ? 'zooDrab' : 'zooBlack', HM = MAT[hm], edge = [];
    A.shape((cx, X, Y) => {
      cx.moveTo(X(J.shF[0] - 2.8), Y(n[1] + 4)); cx.quadraticCurveTo(X(h[0] - 7), Y(h[1] - 1), X(h[0] - 4.4), Y(h[1] - 6.4));
      cx.quadraticCurveTo(X(h[0] - 0.5), Y(h[1] - 8), X(h[0] + 3.8), Y(h[1] - 6.4)); cx.quadraticCurveTo(X(h[0] + 6.8), Y(h[1] - 4), X(h[0] + 6.2), Y(h[1] + 1.5));
      cx.lineTo(X(h[0] + 5.8), Y(h[1] + 5)); cx.quadraticCurveTo(X(n[0] + 4), Y(n[1] + 2.5), X(J.shN[0] + 2), Y(J.shN[1] + 1.5)); cx.lineTo(X(J.shF[0] - 2.8), Y(n[1] + 4));
    }, hm, { round: 3, tone: 0.5 });
    A.shape((cx, X, Y) => { cx.moveTo(X(h[0] + 0.4), Y(h[1] - 4.2)); cx.quadraticCurveTo(X(h[0] + 4.8), Y(h[1] - 4.6), X(h[0] + 5.4), Y(h[1] + 0.2)); cx.lineTo(X(h[0] + 5.1), Y(h[1] + 4.6)); cx.quadraticCurveTo(X(h[0] + 1), Y(h[1] + 4.6), X(h[0] + 0.4), Y(h[1] - 4.2)); }, '#040305', { flat: true, contour: false, edge: false });
    // the painted skull faint in the dark of it
    A.poly([[h[0] + 1.6, h[1] - 2.4], [h[0] + 4.6, h[1] - 2], [h[0] + 4.8, h[1] + 1], [h[0] + 4.1, h[1] + 3.6], [h[0] + 2, h[1] + 3.8], [h[0] + 1.4, h[1] + 1]], MAT.bone[1], { flat: true, contour: false, edge: false });
    A.ell(h[0] + 2.4, h[1] - 0.8, 0.8, 0.8, '#040305', { flat: true, contour: false, edge: false }); A.ell(h[0] + 4, h[1] - 0.8, 0.55, 0.8, '#040305', { flat: true, contour: false, edge: false });
    A.fine(h[0] + 2.5, h[1] - 0.7, '#ffc060'); A.fine(h[0] + 4, h[1] - 0.7, '#a07030');
    for (let i = 0; i < 3; i++) A.fine(h[0] + 2.4 + i * 0.7, h[1] + 2.4, '#040305');
    for (let i = 0; i <= 9; i++) { const u = i / 9, a = -1.9 + u * 3.2, p = [h[0] + 2.9 + Math.cos(a) * 2.9, h[1] + 0.2 + Math.sin(a) * 4.7]; A.px(p[0], p[1], g.trim && i % 3 === 0 ? MAT.gold[3] : B[3]); A.fine(p[0] + 0.5, p[1] + 0.5, B[1]); }
    A.hair(h[0] - 4.4, h[1] - 6.2, h[0] - 1.5, h[1] + 3, HM[1]); A.hair(h[0] - 4, h[1] - 6.8, h[0] + 3.4, h[1] - 6.8, HM[4]);
  }
  // ---------------------------------------------------------------- the near arm, the near pauldron
  arm(J.shN, J.elN, J.haN, false);
  if (T === 2) {
    const s = J.shN;
    A.poly([[s[0] - 2.8, s[1] + 0.6], [s[0] - 1.6, s[1] - 2.6], [s[0] + 2.2, s[1] - 2.8], [s[0] + 4, s[1] + 0.4], [s[0] + 3, s[1] + 3.4], [s[0] - 0.8, s[1] + 3]], 'bone', { round: 1.6 });
    A.hair(s[0] - 1.4, s[1] - 1.4, s[0] + 3.4, s[1] - 0.2, B[1]); A.hair(s[0] - 1.2, s[1] - 1.8, s[0] + 2.2, s[1] - 2.2, B[4]);   // the ridge of the scapula
    A.poly([[s[0] - 0.2, s[1] - 2.6], [s[0] - 0.6, s[1] - 5.4], [s[0] + 1.4, s[1] - 2.7]], 'bone', { bevel: 0.4 }); A.poly([[s[0] + 2.2, s[1] - 2.4], [s[0] + 3, s[1] - 4.6], [s[0] + 3.4, s[1] - 1.8]], 'bone', { bevel: 0.4 });
    A.stud(s[0] + 1, s[1] + 1, g.trim ? 'gold' : 'zooGold');
  }
  pxWeapon(A, g, J, 'ossumancer');
  // casting: bone shards drawn up out of nothing round the hand, a candle-warm light between the fingers
  if (J.cast) {
    const q = [J.haN[0] + 2.2, J.haN[1] - 1.5];
    for (let i = 0; i < 6; i++) {
      const a = i * 1.047 + ph * 0.45, r = [4.6, 3.8, 3.2, 3.5][ph % 4] + (i % 2) * 0.8, rise = [3.5, 0.5, -1.5, -0.8][ph % 4] - (i % 3) * 1.1;
      const p = [q[0] + Math.cos(a) * r + (ph === 2 ? 1.5 : 0), q[1] + rise + Math.sin(a) * r * 0.45], dir = ph === 2 ? -0.3 : -1.57 + Math.cos(a) * 0.4, len = 2.8 + (i % 3) * 0.7;
      const tip = [p[0] + Math.cos(dir) * len, p[1] + Math.sin(dir) * len], sx = -Math.sin(dir) * 0.75, sy = Math.cos(dir) * 0.75;
      A.poly([[p[0] - sx, p[1] - sy], tip, [p[0] + sx, p[1] + sy], [p[0] - Math.cos(dir) * 0.5, p[1] - Math.sin(dir) * 0.5]], i % 2 ? 'bone' : 'boneOld', { sh: 0.4, hl: 0.5, contour: false });
      if (ph < 2) A.fine(p[0] - Math.cos(dir) * 1.2, p[1] - Math.sin(dir) * 1.2, B[1]);
    }
    A.ell(q[0], q[1], 1.6 + ph * 0.3, 1.6 + ph * 0.3, 'rgba(255,200,120,0.3)', { flat: true, contour: false, edge: false }); A.ell(q[0], q[1], 0.9 + ph * 0.2, 0.9 + ph * 0.2, 'ember', { sh: 0.4, hl: 0.5 }); A.fine(q[0], q[1] - 0.3, '#fff4d0');
    A.lamp(q[0], q[1], [255, 226, 170], 14 + ph * 2, 0.9);
  }
  A.rim([140, 128, 150], 0.3);
};
