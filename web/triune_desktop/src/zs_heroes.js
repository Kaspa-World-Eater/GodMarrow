
(function () {  // file scope: each art file keeps its own helpers
// =================================================================== v0.23: the other three heroes in 32-bit pixel art
// Same rig (rig32), frame (46x52) and gear rules as H32.hemomancer in zq_hero32.js.
//   animancer  - a gaunt mourner of the northern steppe and taiga: ash funeral wraps, a stole stitched red at its ends
//                like a grave towel, an embroidered velvet skullcap and a face-veil, bronze shaman-mirrors on breast,
//                back and belt, iron jingle-cones, fur at the collar; cold wisp-light in the hand.
//   ossumancer - a bone-priest of the high charnel grounds: maroon robe and shawl, saffron vest, bone net apron and
//                collar, a mala with turquoise and coral, a silver amulet-box, a thighbone trumpet; a skull-painted face.
//   miasmancer - the Shrine Keeper: white kosode, asagi or vermilion hakama, a shimenawa belt with paper shide, fans
//                (one open in the off hand, one tucked shut in the belt), tabi and straw sandals, a gourd seeping rot.
// v0.34: worked to the Iron Golem's finish with the Pix32 kit in zq_hero32.js (folds, hems, clipped patterns).
pmat('zsAsh', ['#1a191e', '#403e46', '#6a6870', '#96948f', '#c2c0b6']);
pmat('zsStole', ['#24262e', '#666a74', '#a2a6aa', '#d2d4d0', '#f2f2ea']);
pmat('zsVest', ['#101219', '#282e3a', '#434b59', '#646d7c', '#8a93a0']);
pmat('zsCoat', ['#0a0a10', '#181a24', '#2a2e3a', '#3e4452', '#586072']);
pmat('zsCloak', ['#08080c', '#14141c', '#22222c', '#34343e', '#4a4a52']);
pmat('zsSkinA', ['#1c1418', '#4a3c3e', '#8a7a74', '#b8a89c', '#dcd0c2']);
pmat('zsHairA', ['#0a0a0e', '#1c1c24', '#30303a', '#56565f', '#8a8a92']);
pmat('zsVeil', ['#06060e', '#10122a', '#1c2046', '#2c3266', '#40488a']);
pmat('zsBronze', ['#1e1206', '#4a2e12', '#7a5222', '#a87c3a', '#d8b060']);
pmat('zsBlack', ['#050407', '#110d14', '#211a25', '#342b38', '#524656']);
pmat('zsSkinO', ['#221816', '#4a3a34', '#76604e', '#9e846c', '#c2a88a']);
pmat('zsWhite', ['#24222a', '#5e5a66', '#a09c9e', '#cec8bc', '#eee8da']);
pmat('zsVerm', ['#260a08', '#521812', '#80301f', '#a8482e', '#c66a48']);
pmat('zsLacq', ['#050305', '#120a0e', '#221216', '#381e22', '#5e3438']);
pmat('zsStraw', ['#22180a', '#4a381c', '#76602e', '#9e8444', '#c4a862']);
pmat('zsSkinM', ['#22161a', '#56403c', '#8c6e60', '#b69480', '#d8b8a0']);
pmat('zsHaka', ['#1a0c0c', '#3a1a18', '#5a2c26', '#7a4034', '#965844']);
const zsHex = (m, i) => { const c = PMAT[m][i]; return `rgb(${c[0]},${c[1]},${c[2]})`; };
const ZS_WISP = ['#1e3a66', '#4a7ab0', '#aad7ff', '#e8f6ff'], ZS_CANDLE = ['#5a1a06', '#c2561a', '#ffa640', '#ffe6a0'];
const ZS_MIAS = ['#2a1234', '#5a2a74', '#8a52a8', '#6a9a3a', '#a8d85a', '#e0ffa0'];
// a skirt / coat hem hung from the waist, pushed by the near knee and trailing behind; returns [front, back]
function zsSkirt(A, J, mat, hem, o) {
  o = o || {};
  const [wx, wy] = J.waist, front = Math.max(J.kneeN[0] + (o.fw || 3), o.fmin || 21), back = Math.min(J.kneeF[0] - (o.bw || 4), o.bmax || 10) - (J.walk ? 1 : 0);
  const pts = [[wx - (o.ww || 5), wy], [wx + (o.ww || 5), wy], [front, hem - 1]], n = o.teeth || 7;
  for (let i = 0; i < n; i++) { const u = i / (n - 1); pts.push([front - (front - back) * u, hem + (o.rag ? [0, 2, 0, 1, 3, 0, 2, 1, 0][i % 9] : i % 2)]); }
  pts.push([back, hem], [wx - (o.ww || 5) - 1, wy + 6]);
  A.poly(pts, mat, { band: 2, tone: o.tone || 0 });
  return [front, back];
}
// a bare or bound leg and a foot
function zsLeg(A, J, far, legMat, footMat, o) {
  o = o || {};
  const k = far ? 'kneeF' : 'kneeN', a = far ? 'ankF' : 'ankN', [ax, ay] = J[a], t = far ? -1 : 0;
  A.limb([J[k], [ax, ay - 1]], o.r0 || 1.3, o.r1 || 1.1, legMat, { tone: t });
  if (o.boot) A.poly([[ax - 1.8, ay - 4], [ax + 1.2, ay - 4], [ax + 1.5, ay - 1.5], [ax + 3.8, ay + 0.5], [ax + 3.8, ay + 2], [ax - 1.8, ay + 2]], footMat, { tone: t });
  else A.poly([[ax - 1.5, ay - 1.5], [ax + 1, ay - 1.5], [ax + 3.5, ay + 1], [ax + 3.5, ay + 2], [ax - 1.5, ay + 2]], footMat, { tone: t });
  return [ax, ay];
}
const zsLerp = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];

// the cast effects, shared by the front and back views
function zsWisp(A, J) {
  const ph = J.ph;
    const q = [J.haN[0] + 2, J.haN[1] - 3 - (ph >= 2 ? 1 : 0)], r = [1.2, 1.8, 2.3, 2.0][ph % 4];
    A.ell(q[0], q[1], r + 0.8, r + 0.4, ZS_WISP[1], { flat: true, contour: false });
    A.ell(q[0], q[1], r, r * 0.8, ZS_WISP[2], { flat: true, contour: false });
    A.px(q[0], q[1], ZS_WISP[3]); A.px(q[0] - 1, q[1], ZS_WISP[3]); A.px(q[0], q[1] - 1, ZS_WISP[3]);
    // its flame-tail, and the motes torn off it
    for (let i = 1; i < 4 + (ph % 2); i++) A.px(q[0] - i * 0.7, q[1] - r - i, i < 2 ? ZS_WISP[2] : ZS_WISP[1]);
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + ph * 0.9; A.px(q[0] + Math.cos(a) * (r + 3), q[1] + Math.sin(a) * (r + 2.5), i ? ZS_WISP[2] : ZS_WISP[3]); }
}
function zsCandle(A, J) {
  const ph = J.ph, BN = n => zsHex('hBone', n);
    const q = [J.haN[0] + 1.5, J.haN[1] - 2 - (ph >= 2 ? 1 : 0)], fh = [2, 3, 4, 3.5][ph % 4];
    for (let y = -fh - 2; y <= 2; y++) for (let x = -3; x <= 3; x++) { const e = x * x / 9 + (y + fh / 2) ** 2 / ((fh / 2 + 2.5) ** 2); if (e <= 1 && e > 0.45 && ((x + y + ph) & 1) && ((x - y) % 3 === 0)) A.px(q[0] + x, q[1] + y, '#8a3a12'); }
    A.ell(q[0], q[1] - fh / 2 + 0.5, 1.1, fh / 2 + 0.3, ZS_CANDLE[1], { flat: true, contour: false });
    A.px(q[0], q[1], ZS_CANDLE[3]); A.px(q[0], q[1] - 1, ZS_CANDLE[3]); A.px(q[0], q[1] - 2, ZS_CANDLE[2]); A.px(q[0], q[1] - fh, ZS_CANDLE[2]);
    for (let i = 0; i < 4; i++) {
      const a = -0.4 - i * 0.75, rr = 4 + (i % 2), lift = (ph * 1.1 + i * 0.7) % 3, c = [q[0] + Math.cos(a) * rr, q[1] - 1 + Math.sin(a) * rr - lift], d = i % 2 ? 1 : -1;
      A.px(c[0], c[1], '#fff4dc'); A.px(c[0] + d, c[1] - 1, BN(3)); A.px(c[0] + 2 * d, c[1] - 2, BN(2)); A.px(c[0] - d, c[1] + 1, BN(1)); A.px(c[0], c[1] + 1, ZS_CANDLE[2]); A.px(c[0] - d, c[1] + 2, ZS_CANDLE[1]);
    }
}
function zsRot(A, J) {
  const ph = J.ph;
    const q = [J.haN[0] + 2, J.haN[1] - 3 - (ph >= 2 ? 1 : 0)], r = [1.2, 1.8, 2.4, 2.1][ph % 4];
    for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1.5; x <= r + 1.5; x++) if (x * x / ((r + 1.5) ** 2) + y * y / ((r + 1) ** 2) <= 1 && ((x + y + ph) & 1)) A.px(q[0] + x, q[1] + y, ZS_MIAS[1]);
    A.ell(q[0], q[1], r, r * 0.85, ZS_MIAS[2], { flat: true, contour: false });
    A.ell(q[0] + 0.3, q[1] + 0.3, r * 0.55, r * 0.5, ZS_MIAS[3], { flat: true, contour: false });
    A.px(q[0], q[1], ZS_MIAS[5]); A.px(q[0] - 1, q[1] - 1, ZS_MIAS[4]);
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + ph * 0.8; A.px(q[0] + Math.cos(a) * (r + 2.5), q[1] + Math.sin(a) * (r + 2), i ? ZS_MIAS[2] : ZS_MIAS[4]); }
    A.px(q[0], q[1] + r + 1 + ph % 2, ZS_MIAS[3]); A.px(q[0] + 1, q[1] + r + 3, ZS_MIAS[1]);
}

// =================================================================== the back views (J.back): walking away up the screen
// The weapon arm (N) turns away and goes behind the body; the other arm (F) comes round in front of it. The weapon
// shows past the body, and in the draw-back and raise of a strike (atk 0-1) it comes up past the head and shoulder.
// a leg seen from behind: the heel toward us, the toes turned away
function zsLegB(A, J, near, legMat, footMat, o) {
  o = o || {};
  const k = near ? 'kneeF' : 'kneeN', a = near ? 'ankF' : 'ankN', [ax, ay] = J[a], t = near ? 0 : -1;
  A.limb([J[k], [ax, ay - 1]], o.r0 || 1.3, o.r1 || 1.1, legMat, { tone: t });
  if (o.boot) A.poly([[ax - 2, ay - 4], [ax + 1.2, ay - 4], [ax + 1.5, ay - 1.5], [ax + 2.8, ay + 0.5], [ax + 2.3, ay + 2], [ax - 2, ay + 2]], footMat, { tone: t });
  else A.poly([[ax - 2, ay - 1.5], [ax + 1, ay - 1.5], [ax + 2.5, ay + 0.5], [ax + 2, ay + 2], [ax - 2, ay + 2]], footMat, { tone: t });
  return [ax, ay];
}
// the far (weapon) arm: sleeve, forearm, the weapon unless it comes later, the hand
function zsArmFarB(A, J, g, upper, fore, hand, r) {
  A.limb([J.shN, J.elN], r[0], r[1], upper, { tone: -1, contour: false });
  A.limb([J.elN, J.haN], r[2], r[3], fore, { tone: -1 });
  if (!(J.atk && J.ph < 2)) weapon32(A, g, J);
  A.ell(J.haN[0], J.haN[1] + 1.2, 1.3, 1.4, hand, { tone: -1 });
  // the near hand reaching round the front of the body in a cast: only a glimpse of it
  const across = J.cast && J.haF[0] > J.shF[0] + 2;
  if (across) { A.limb([J.elF, J.haF], r[2] * 0.85, r[3] * 0.85, fore, { tone: -1 }); A.ell(J.haF[0], J.haF[1] + 1, 1.2, 1.3, hand, { tone: -1 }); }
  return across;
}
const zsLateWpn = (A, J, g) => { if (J.atk && J.ph < 2) weapon32(A, g, J); };
// the back of a torso: the same block as the front, the neck opening set back
const zsTorsoB = (A, J, mat, w, o) => {
  const [nx, ny] = J.neck, [cx, cy] = J.chest, [wx, wy] = J.waist, sF = o && o.shF || J.shF, sN = o && o.shN || J.shN;
  A.poly([[sF[0] - 1, sF[1]], [nx - 2, ny + 1], [nx + 1, ny + 1], [sN[0] + 1, sN[1]], [cx + w, cy + 1], [wx + w, wy + 1], [wx - w, wy + 1], [cx - w - (o && o.wb || 0), cy + 1]], mat, { band: 2 });
};

// ------------------------------------------------------------------------ the Animancer's kit (v0.34)
// A mourner of the northern steppe and taiga: bronze shaman-mirrors (one on the breast, one between the shoulders,
// one swinging from the belt) that catch the wisp-light, a funeral stole embroidered red at its ends like a grave
// towel, an embroidered velvet skullcap, fur at the collar, iron jingle-cones on the belt, leather fringe on the arm.
pmat('anCap', ['#060a08', '#12201a', '#1e3428', '#2e4a3a', '#44664e']);
pmat('anFur', ['#140c08', '#3a2616', '#5e4026', '#86603a', '#b08a5a']);
pmat('anBronze', ['#1a1008', '#4a2e12', '#86582a', '#c49050', '#fff0c0']);
// a polished bronze mirror: the rim, a dark band of reflected horizon, a hard glint, the wisp's cold light in it
function anMirror(A, x, y, r, t, back) {
  const id = A.ell(x, y, r, r, 'anBronze', { tone: t, band: 1 });
  if (back) { A.px(x, y, '#1a1008'); A.px(x - 0.5, y - 0.5, h32hex('anBronze', t ? 3 : 4)); A.fx(id, (px, py, e) => (e.l === 1 || e.r === 1 || e.t === 1 || e.b === 1) ? null : ((px + py) % 3 === 0 ? 1 : null)); return id; }
  A.fx(id, (px, py, e) => {
    if (e.l === 1 || e.r === 1 || e.t === 1 || e.b === 1) return null;
    const d = (px + 0.5 - x) + (py + 0.5 - y);
    return d > r * 0.7 ? (t ? '#27303f' : '#5a6a84') : d > 0 ? (t ? '#5a6a84' : '#8eb4d4') : (t ? '#8eb4d4' : '#c4d8ec');
  });
  A.px(x - r * 0.4, y - r * 0.4, '#ffffff'); if (r > 2) A.px(x - r * 0.4 + 1, y - r * 0.4 + 1, '#ffffff');
  return id;
}
// fur: a soft irregular edge, clumps lit and shadowed
const anFurFx = (x, y, e) => { const h = ((x * 73856093) ^ (y * 19349663)) >>> 0; return (h % 5 === 0) ? 1 : (h % 7 === 0 ? 4 : null); };
// the red cross-stitch of a grave towel: rows of little crosses and diamonds
const anStitch = (x, r) => r === 1 ? ((x & 1) ? '#c43a22' : '#6a1414') : r === 2 ? null : r === 3 ? ((x % 3 === 1) ? '#c43a22' : ((x % 3) ? null : '#8a1a1a')) : r === 4 ? ((x % 3 === 1) ? '#8a1a1a' : null) : null;
function anCones(A, x, y, n, t, sway) {
  for (let i = 0; i < n; i++) { const cx = x + i * 2 + sway * (i + 1) * 0.3, cy = y + (i % 2); A.px(cx, cy, '#262830'); A.px(cx, cy + 1, t ? '#464a56' : '#7a808e'); A.px(cx, cy + 2, t ? '#7a808e' : '#dde4ee'); }
}
// the embroidered skullcap: velvet, a band of gold and red stitches round it
function anSkullcap(A, hx, hy, back, trim) {
  const pts = back ? [[hx - 4.4, hy - 1.5], [hx - 4, hy - 4.8], [hx - 1.5, hy - 6.6], [hx + 1.5, hy - 6.6], [hx + 4, hy - 4.8], [hx + 4.4, hy - 1.5]] : [[hx - 4, hy - 2], [hx - 3.6, hy - 5], [hx - 1, hy - 6.8], [hx + 2, hy - 6.6], [hx + 4, hy - 4.8], [hx + 4.4, hy - 2.6]];
  const id = A.poly(pts, 'anCap', { band: 1 });
  A.fx(id, (x, y, e) => e.b === 1 ? (x % 2 ? (trim ? '#fff0a0' : '#d8a83a') : '#c43a22') : e.b === 2 ? ((x % 3 === 0) ? '#d8a83a' : null) : ((x + y) % 4 === 0 && e.k >= 2 ? '#c43a22' : null));
  A.px(hx + 0.5, hy - 6, '#6a9a7a');
  return id;
}
// ------------------------------------------------------------------------ Animancer, from behind
function zsAnimBack(A, J, g) {
  const T = g.tier, ph = J.ph, sw = J.walk ? J.sw : 0, hex = zsHex;
  const [hx, hy] = J.head, [nx, ny] = J.neck, [cx, cy] = J.chest, [wx, wy] = J.waist;
  const cloth = T === 0 ? 'zsAsh' : T === 1 ? 'zsVest' : 'zsCoat';
  const gust = J.walk ? 1 : J.cast ? 1.25 : J.atk ? 0.8 : 0.45, wv = J.walk ? ph / 8 * Math.PI * 2 : ph / 4 * Math.PI * 2;
  // the weapon arm, behind; the belt-mirror on that hip, its back glimpsed past the body
  if (T === 2) A.ell(J.shN[0] - 0.5, J.shN[1] + 0.5, 3.2, 2.4, 'hIron', { tone: -1 });
  {
    const sway = J.walk ? -sw * 1.6 : J.atk ? [0, 1, -2, -1][ph] : J.cast ? -1 : 0, c0 = [wx + 3, wy + 1], c1 = [wx + 4.5 + sway, wy + 6];
    for (let i = 0; i <= 5; i++) { const p = zsLerp(c0, c1, i / 5); A.px(p[0], p[1], i % 2 ? '#6a6e7a' : '#2a2e38'); }
    anMirror(A, c1[0] + 0.5, c1[1] + 2.5, 2.4, -1, true);
  }
  const across = zsArmFarB(A, J, g, cloth, T === 2 ? 'zsCoat' : cloth, 'hSkinPale', [1.9, 1.6, 1.6, 1.3]);
  // legs
  for (const near of [false, true]) {
    const [ax, ay] = zsLegB(A, J, near, T === 2 ? 'zsCoat' : 'hBand', T === 2 ? 'hIron' : T === 1 ? 'hLea' : 'zsAsh', { r0: 1.2, r1: 1.0, boot: T === 2 });
    if (T < 2) { A.px(ax, ay - 3, hex('hBand', near ? 1 : 0)); A.px(ax - 1, ay - 5, hex('hBand', 1)); }
    else A.px(ax - 1, ay - 3, near ? '#7a808e' : '#464a56');
  }
  // skirts from behind
  if (T === 0) {
    zsSkirt(A, J, 'zsAsh', 39, { rag: true, teeth: 9 });
    for (let y = wy + 4; y < 38; y += 3) A.line(wx - 4, y - 1, wx + 4, y + 1, hex('zsAsh', 1));
    A.px(wx - 2, wy + 9, hex('zsAsh', 4)); A.px(wx + 2, wy + 6, hex('zsAsh', 3));
  } else if (T === 1) {
    zsSkirt(A, J, 'zsVest', 44, { teeth: 7, fw: 3, bw: 5, tone: -1 });
    const [f2, b2] = zsSkirt(A, J, 'zsVest', 37, { teeth: 7, fw: 1, bw: 3, fmin: 19 });
    for (const fx of [-3, 0, 3]) A.line(wx + fx, wy + 3, wx + fx * 1.3 - sw * 0.6, 36, hex('zsVest', fx ? 1 : 0));
    for (let i = 0; i < 4; i++) A.px(f2 - (f2 - b2) * (i + 0.5) / 4, 37, hex('zsVest', 3));
    if (g.trim) for (let i = 0; i < 7; i++) A.px(f2 - (f2 - b2) * i / 6, 36 + (i % 2), '#d8a83a');
  } else {
    const [fr, bk] = zsSkirt(A, J, 'zsCoat', 41, { teeth: 6, fw: 2, bw: 4 });
    A.line(wx - 1, wy + 3, wx - 1 - sw * 1.2, 40, hex('zsCoat', 0));   // the back vent
    for (let i = 0; i < 6; i++) A.px(fr - (fr - bk) * i / 5, 40, g.trim ? '#d8a83a' : hex('hIron', 3));
  }
  // the back
  zsTorsoB(A, J, cloth, 4);
  const sx = cx - 1;
  if (T === 0) {
    for (let i = 0; i < 4; i++) A.line(cx - 3, cy - 3 + i * 2, cx + 3, cy - 2 + i * 2, hex('zsAsh', 1));
    A.px(cx - 2, cy + 1, hex('zsAsh', 4)); A.px(cx + 2, cy + 3, hex('zsAsh', 3));
  } else if (T === 1) {
    A.line(nx - 1, ny + 2, sx, wy - 1, hex('zsVest', 1));
    A.px(sx - 3, cy - 1, hex('zsVest', 3)); A.px(sx + 3, cy - 1, hex('zsVest', 3));
  } else {
    for (let i = 0; i < 3; i++) {
      const y = cy - 1 + i * 3; A.poly([[cx - 4.5, y - 0.5], [cx + 4, y], [cx + 4, y + 1.7], [cx - 4.5, y + 1.2]], 'hIron', {});
      A.px(cx - 3, y + 0.5, g.trim ? '#fff0a0' : '#c4c8d2'); A.px(cx + 2, y + 0.8, '#262830');
    }
  }
  A.poly([[wx - 4.5, wy - 0.5], [wx + 4.5, wy - 0.5], [wx + 4.5, wy + 1.2], [wx - 4.5, wy + 1.2]], T ? 'hLea' : 'hRope', {});
  anCones(A, wx - 2.5, wy + 1.5, 4, 0, J.walk ? -sw : 0);
  // the great mirror between the shoulder blades, on crossed cords
  // tier 2: the wind-torn cloak, over the whole back
  if (T === 2) {
    const b = -2 - gust * 5, rag = [0, 3, 1, 4, 0, 2];
    const pts = [[J.shF[0] - 2, J.shF[1] - 1], [nx - 2, ny - 1], [J.shN[0] + 1, J.shN[1] - 0.5], [J.shN[0] + 2, J.shN[1] + 3], [wx + 4, wy + 3], [wx + 3, 40]];
    for (let i = 0; i < 6; i++) { const u = i / 5; pts.push([wx + 2 - (wx + 5 - J.shF[0] - b) * u - Math.sin(wv + u * 3) * u * 1.5, 40 + u * 1.5 + rag[i] * 0.6]); }
    pts.push([J.shF[0] - 3 + b * 0.4, J.shF[1] + 8]);
    A.poly(pts, 'zsCloak', { band: 2 });
    for (let i = 0; i < 3; i++) A.line(nx - 1 - i * 1.5, ny + 3, wx + 1 - i * 3 + b * 0.3 * i, 39, hex('zsCloak', i === 1 ? 0 : 1));
    A.px(J.shF[0], J.shF[1] + 1, hex('zsCloak', 4)); A.px(nx - 3, ny + 1, hex('zsCloak', 3));
  }
  if (T >= 1) { const fr = A.poly([[J.shF[0] - 1, J.shF[1] - 1], [nx - 2, ny - 1.5], [J.shN[0] + 1, J.shN[1] - 1], [J.shN[0] + 1.5, J.shN[1] + 1.5], [nx, ny + 2.5], [J.shF[0] - 1, J.shF[1] + 1.5]], 'anFur', { band: 1 }); A.fx(fr, anFurFx); }
  // the stole across the nape, its two tails streaming out behind over the back
  // (from behind they hang down the back first, then the wind takes them out to the side)
  const sa = J.walk ? 1.75 : J.cast ? 1.95 : J.atk ? 1.7 : 1.6;
  A.limb([[nx - 3, ny + 0.5], [nx + 2, ny + 1]], 1.4, 1.3, 'zsStole', {});
  for (let k = 1; k >= 0; k--) {
    const t = [[nx - 1.5 + k * 1.5, ny + 1.5]];
    for (let i = 1; i <= (k ? 5 : 7); i++) { const p = t[i - 1], an = sa + i * gust * 0.045 + Math.sin(wv * (1 + k * 0.5) - i * 0.85 + k * 1.7) * (0.08 + i * 0.04) - k * 0.25; t.push([p[0] + Math.cos(an) * 2.1, p[1] + Math.sin(an) * 2.1]); }
    const e = t[t.length - 1], f = t[t.length - 2];
    A.limb(t, 1.4, 1.2, 'zsStole', { tone: k ? -1 : 0 });
    A.px(e[0] + (e[0] - f[0]) * 0.5, e[1] + (e[1] - f[1]) * 0.5 + 0.5, hex('zsStole', 1));
    { const m = t[t.length - 2]; A.px(m[0], m[1], k ? '#8a1a1a' : '#c43a22'); A.px(e[0], e[1], k ? '#6a1414' : '#8a1a1a'); if (!k) { const m2 = t[t.length - 3]; A.px(m2[0], m2[1], '#6a1414'); } }
    if (g.trim) A.px(e[0], e[1], '#d8a83a');
  }
  // the great mirror between the shoulder blades, on crossed cords over the stole
  A.line(J.shF[0], J.shF[1], cx + 0.5, cy + 3, '#2a1a10'); A.line(J.shN[0], J.shN[1], cx - 2.5, cy + 3, '#2a1a10'); anMirror(A, cx - 1, cy + 2, 2.8, 0, false);
  // the near arm, in front of the body
  if (T === 2) A.ell(J.shF[0] + 0.5, J.shF[1] + 0.5, 3.2, 2.4, 'hIron', {});
  A.limb([J.shF, J.elF], 1.9, 1.6, cloth, { contourAll: true });
  if (!across) {
    A.limb([J.elF, J.haF], 1.6, 1.3, cloth, {});
    if (T === 2) { const m = zsLerp(J.elF, J.haF, 0.6); A.ell(m[0], m[1], 1.9, 1.6, 'hIron', {}); }
    else { const m = zsLerp(J.elF, J.haF, 0.75); A.px(m[0], m[1], hex('hBand', 3)); A.px(m[0] + 1, m[1], hex('hBand', 2)); }
    A.ell(J.haF[0], J.haF[1] + 1.2, 1.3, 1.4, 'hSkinPale', {});
  }
  if (T === 2) { A.ell(J.shF[0], J.shF[1] - 0.2, 3, 2, 'hIron', {}); A.px(J.shF[0] - 1, J.shF[1] - 1, '#c4c8d2'); A.px(J.shF[0] + 1.5, J.shF[1] + 1, g.trim ? '#d8a83a' : '#262830'); }
  // the head from behind: lank grey hair, the ties of the mourning-veil knotted at the back
  A.limb([[nx, ny], [hx - 0.5, hy + 3]], 1.3, 1.3, 'zsSkinA', { tone: -1 });
  A.poly([[hx - 4, hy - 1], [hx - 3, hy - 4.5], [hx + 0.5, hy - 5.3], [hx + 3, hy - 4], [hx + 4, hy - 1], [hx + 4.2, hy + 1.5], [hx + 3, hy + 4.5], [hx - 0.5, hy + 5], [hx - 4, hy + 2]], 'zsSkinA', {});
  if (g.head !== 'hood') {
    const hb = hx - 1 - gust * 1.2;
    // lank hair to the nape, hanging in a few thin ragged locks
    A.poly([[hx + 2.5, hy - 5.3], [hx - 1.5, hy - 5.8], [hx - 4.5, hy - 3.5], [hx - 4.8, hy + 1.5], [hb - 3.5, hy + 7], [hb - 2.5, hy + 5.5], [hb - 1.5, hy + 8], [hb - 0.5, hy + 5.5], [hb + 1, hy + 7.5], [hx + 1.5, hy + 4.5], [hx + 2.3, hy + 4], [hx + 2.5, hy + 1.5], [hx + 3.5, hy - 0.5], [hx + 3.8, hy - 3]], 'zsHairA', {});
    // thin locks trailing in the wind, parted strands, the crown lit
    for (const [x0, len, t] of [[hx + 1, 4, -1], [hx - 3.5, 5, 0], [hx - 1, 6, 0]]) A.limb([[x0, hy + 2], [x0 - 0.5 - gust * 0.6, hy + 2 + len * 0.6], [x0 - 1 - gust * 1.6, hy + 2 + len]], 1.1, 0.4, 'zsHairA', { tone: t });
    A.line(hx - 3, hy - 3, hx - 0.5, hy - 5, hex('zsHairA', 4)); A.px(hx - 4, hy - 1, hex('zsHairA', 3)); A.px(hx + 1, hy - 4, hex('zsHairA', 3));
    A.line(hx - 1.5, hy - 3, hx - 2, hy + 3, hex('zsHairA', 1)); A.line(hx + 1, hy - 3, hx + 0.5, hy + 3, hex('zsHairA', 1)); A.line(hx + 2, hy - 1, hx + 2, hy + 3, hex('zsHairA', 0));
    A.px(hx - 3, hy + 1, hex('zsHairA', 3)); A.px(hx - 0.5, hy, hex('zsHairA', 3));
    A.px(hx + 3.3, hy + 1, hex('zsSkinA', 2)); A.px(hx + 3.3, hy + 2, hex('zsSkinA', 1));   // the ear
    if (!g.head) anSkullcap(A, hx, hy, true, g.trim);
    if (g.head === 'mask') {   // the bronze snout past the cheek, its strap buckled behind
      A.poly([[hx + 4, hy + 0.5], [hx + 6.5, hy + 1], [hx + 6.5, hy + 4], [hx + 4, hy + 4.5]], 'zsBronze', {});
      A.line(hx + 4, hy - 0.5, hx - 4.5, hy + 0.5, '#2a1a10'); A.px(hx - 2, hy + 0.3, g.trim ? '#fff0a0' : hex('zsBronze', 3));
      for (let i = 0; i < 4; i++) A.px(hx + 3.5 - i * 0.2, hy + 5 + i, i % 2 ? hex('zsBronze', 1) : hex('zsBronze', 3));   // the hose
    } else {   // the veil's edge past the cheek, its black ties fluttering from a knot
      A.poly([[hx + 3.3, hy + 1], [hx + 5, hy + 0.5], [hx + 4.8, hy + 4], [hx + 4, hy + 6], [hx + 3, hy + 4.5]], 'zsVeil', {});
      const tl = J.walk ? -Math.abs(sw) : J.cast ? -1 : 0;   // its ties knotted at the nape, fluttering
      A.px(hx - 1, hy + 3.5, '#24242e'); A.px(hx, hy + 3.5, '#0c0c12'); A.px(hx - 2 + tl * 0.5, hy + 5, '#16161e'); A.px(hx - 2.5 + tl, hy + 6, '#0c0c12'); A.px(hx - 0.5 + tl * 0.5, hy + 5.5, '#16161e');
      if (g.trim) A.px(hx - 1, hy + 3.5, '#d8a83a');
    }
  } else {
    // the back of the deep cowl; the grave-veil's edge showing past it on the face side
    const cm = T === 2 ? 'zsCloak' : T === 1 ? 'zsVest' : 'zsAsh', vl = J.walk ? -Math.round(sw * 0.8) : J.cast ? -1 : 0;
    A.poly([[hx + 4, hy - 3], [hx + 6.5, hy + 1], [hx + 6.5 + vl, hy + 9], [hx + 4.5 + vl, hy + 9.5], [hx + 4, hy + 4]], 'zsStole', { tone: -1 });
    A.poly([[J.shF[0] - 1.5, ny + 3], [hx - 5.5, hy + 3], [hx - 5, hy - 4], [hx - 1.5, hy - 7.5], [hx + 2.5, hy - 6.5], [hx + 5, hy - 2], [hx + 4.5, hy + 4], [J.shN[0] + 1, J.shN[1] + 1], [nx + 1, ny + 4]], cm, { band: 2 });
    A.line(hx - 1.5, hy - 7, hx - 2, hy + 3, hex(cm, 1)); A.px(hx - 3, hy - 4, hex(cm, 3)); A.px(hx - 4, hy, hex(cm, 3));
    if (g.trim) { A.px(hx - 1.5, hy - 7, '#d8a83a'); A.line(hx - 5, hy + 3, J.shF[0] - 1, ny + 3, '#a8741e'); }
  }
  zsLateWpn(A, J, g);
  if (J.cast) zsWisp(A, J);
}

// ------------------------------------------------------------------------ Ossurarch, from behind
function zsOssBack(A, J, g) {
  const T = g.tier, ph = J.ph, sw = J.walk ? J.sw : 0, X = h32hex, BN = n => X('hBone', n), SK = 'zsSkinO', sk = i => X(SK, i), K = osKit(A, J, g);
  const [hx, hy] = J.head, [nx, ny] = J.neck, [cx, cy] = J.chest, [wx, wy] = J.waist;
  const shF = [J.shF[0] - 1, J.shF[1]], shN = [J.shN[0] + 1, J.shN[1]], JB = Object.assign({}, J, { shN, shF });
  // the weapon arm, bare, behind the body
  if (T === 2) A.poly([[shN[0] - 3, shN[1] - 1.5], [shN[0] + 1, shN[1] - 2.5], [shN[0] + 3.5, shN[1] + 0.5], [shN[0] + 2, shN[1] + 4], [shN[0] - 2, shN[1] + 2]], 'hBone', { tone: -1 });
  const armM = T === 2 ? 'osMaroon' : SK;
  const across = zsArmFarB(A, JB, g, armM, armM, SK, [2.2, 1.8, 1.9, 1.5]);
  for (const near of [false, true]) {
    const k = J[near ? 'kneeF' : 'kneeN'], [ax, ay] = J[near ? 'ankF' : 'ankN'], t = near ? 0 : -1;
    A.limb([k, [ax, ay - 1]], 1.5, 1.3, T === 0 ? SK : 'osMaroon', { tone: t });
    K.boot(ax, ay, t, true);
    if (T === 2) A.line(k[0] - 0.5, k[1] + 1, ax - 0.5, ay - 5.5, BN(near ? 3 : 1));
  }
  const hem = T === 0 ? 42 : 44, S = h32Skirt(A, J, 'osMaroon', hem, T === 0 ? { rag: [0, 1, 0, 2, 1, 0, 1, 2, 0], teeth: 9, ww: 6 } : { teeth: 7, ww: 6, bw: 5 });
  const fs = J.walk ? -sw * 0.8 : 0;
  h32Folds(A, S.id, [[wx - 4, wy + 3, S.back + 2.5, hem], [wx - 1.5, wy + 3, wx - 2 + fs, hem], [wx + 1, wy + 3, wx + 1.5 + fs, hem], [wx + 3.5, wy + 3, S.front - 3 + fs, hem - 1]]);
  if (T >= 1) h32Hem(A, S.id, 3, (x, r) => r === 1 ? '#2a1606' : r === 2 ? ((x % 3) ? (g.trim ? '#fff0a0' : '#d8a83a') : '#6a3a0e') : ((x % 3) === 1 ? '#a8741e' : '#12060a'));
  else h32Hem(A, S.id, 1, x => (x & 1) ? '#12060a' : null);
  // the back: saffron vest, the shawl coming over the far shoulder and down across the back to the near hip
  const tv = A.poly([[shF[0] - 1, shF[1]], [nx - 2, ny + 1], [nx + 1, ny + 1], [shN[0] + 1, shN[1]], [cx + 5, cy + 1], [wx + 5, wy + 1], [wx - 5, wy + 1], [cx - 5.5, cy + 1]], 'osSaffron', { band: 2 });
  A.fx(tv, (x, y, e) => e.l <= 1 && y < cy + 2 ? (x % 2 ? '#fff0a0' : '#6a3a0e') : (e.k === 2 && (x * 3 + y * 5) % 11 === 0 ? 3 : null));
  const shw = A.poly([[shN[0] + 2, shN[1] - 1.5], [nx + 1, ny - 0.5], [nx - 2, ny + 1], [cx - 1.5, cy + 1], [cx - 5.5, wy - 2], [wx - 5.5, wy + 1.5], [wx + 5.5, wy + 1.5], [cx + 5.5, cy + 2], [shN[0] + 2.5, shN[1] + 3]], 'osMaroon', { band: 2 });
  h32Folds(A, shw, [[nx + 1, ny + 2, cx - 3, wy - 1, 0], [cx + 3, cy - 1, cx - 0.5, wy], [shN[0] - 1, shN[1] + 2, cx + 3.5, wy]]);
  A.line(nx - 2, ny + 1, cx - 5.5, wy - 2, X('osMaroon', 4));
  if (g.trim) A.line(nx - 2.5, ny + 1.5, cx - 6, wy - 2, '#d8a83a');
  const sx = cx - 1;
  if (T === 2) {   // the back of the bone harness: a spine and two shoulder blades
    A.poly([[sx - 5, ny + 3], [sx - 1, ny + 2.5], [sx - 1.5, cy + 3], [sx - 4.5, cy + 1.5]], 'hBone', {});
    A.poly([[sx + 1, ny + 2.5], [sx + 5, ny + 3], [sx + 4, cy + 1.5], [sx + 1.5, cy + 3]], 'hBone', { tone: -1 });
    A.px(sx - 3.5, ny + 4, BN(4)); A.px(sx - 2, cy + 1, BN(1)); A.px(sx + 3, cy, BN(1)); A.px(sx - 3, cy, OS_TURQ[1]);
    for (let i = 0; i < 6; i++) { const y = ny + 2 + i * 1.8; A.px(sx, y, BN(i % 2 ? 3 : 4)); A.px(sx + 1, y, BN(2)); A.px(sx, y + 1, '#1a1418'); }
    if (g.trim) { A.px(sx, ny + 2, '#fff0a0'); A.px(sx - 4.5, ny + 3, '#d8a83a'); }
  } else if (T === 1) {   // the bone wheel between the shoulders, hung in its net
    const wh = [sx, cy];
    const nt = A.poly([[sx - 4.5, ny + 2], [sx + 4.5, ny + 2], [sx + 3, cy + 4.5], [sx - 3, cy + 4.5]], 'osMaroon', { band: 1 });
    A.fx(nt, osNet);
    A.ell(wh[0], wh[1], 2.4, 2.2, 'hBone', {}); A.px(wh[0], wh[1], OS_CORAL); A.px(wh[0] - 1, wh[1] - 1, BN(4));
    for (const [dx, dy] of [[0, -2], [2, 0], [0, 2], [-2, 0]]) A.px(wh[0] + dx, wh[1] + dy, '#2a1a10');
  }
  // the sash, its knot's tails at the back; the thighbone trumpet thrust through it on this side
  const sa = A.poly([[wx - 5.5, wy - 0.5], [wx + 5.5, wy - 0.5], [wx + 5.5, wy + 1.5], [wx - 5.5, wy + 1.5]], 'osSaffron', {});
  A.fx(sa, (x, y, e) => e.t === 1 ? 3 : ((x & 1) && e.b === 1 ? 1 : null));
  K.kangling([wx - 6, wy - 3], [wx - 2.5, wy + 5.5], 0);
  // the near arm, over the body
  A.limb([shF, J.elF], 2.2, 1.8, 'osMaroon', { contourAll: true });
  if (!across) {
    A.limb([J.elF, J.haF], 1.9, 1.5, 'osMaroon', {});
    if (T === 2) { const a = zlerp32(J.elF, J.haF, 0.35), b = zlerp32(J.elF, J.haF, 0.85); A.limb([a, b], 1.6, 1.5, 'hBone', {}); A.px(a[0], a[1], BN(1)); A.px(b[0] - 1, b[1] - 1, BN(4)); }
    A.ell(J.haF[0], J.haF[1] + 1.2, 1.4, 1.4, SK, {}); A.px(J.haF[0] - 0.5, J.haF[1] + 0.5, sk(4));
    const m = zlerp32(J.elF, J.haF, 0.92); A.px(m[0], m[1], BN(4)); A.px(m[0] + 1, m[1], OS_TURQ[2]);
  }
  if (T === 2) {
    A.poly([[shF[0] - 3, shF[1] + 0.5], [shF[0] - 1, shF[1] - 2.5], [shF[0] + 3, shF[1] - 1.5], [shF[0] + 2, shF[1] + 2], [shF[0] - 2, shF[1] + 4]], 'hBone', {});
    A.line(shF[0] + 1, shF[1] - 0.5, shF[0] - 2, shF[1] + 2, BN(1)); A.px(shF[0] - 1, shF[1] - 1.5, BN(4)); if (g.trim) A.px(shF[0] - 3, shF[1] + 1, '#d8a83a');
  }
  // the head from behind: the shaved skull branded with the Standing Dead
  A.limb([[nx, ny], [hx - 0.5, hy + 3]], 1.7, 1.6, SK, { tone: -1 });
  A.poly([[hx - 4, hy - 1], [hx - 3.5, hy - 4], [hx - 0.5, hy - 5.5], [hx + 2.5, hy - 5], [hx + 4, hy - 3], [hx + 4.5, hy], [hx + 4, hy + 3], [hx + 2.5, hy + 5], [hx - 0.5, hy + 5], [hx - 4, hy + 1.5]], SK, {});
  for (let i = 0; i < 5; i++) A.px(nx - 2 + i * 1.2, ny + 1.5 + (i === 1 || i === 3 ? 0.5 : 0), i % 2 ? BN(4) : BN(2));   // the mala at the nape
  if (!g.head) {
    A.px(hx - 3, hy - 2, sk(1)); A.px(hx - 3.5, hy, sk(1)); A.px(hx + 3, hy - 4, sk(1));
    A.line(hx - 1.5, hy - 4.5, hx - 1.5, hy - 1.5, '#2a1a14'); A.line(hx - 2.5, hy - 3.5, hx - 0.5, hy - 3.5, '#2a1a14'); A.px(hx - 1.5, hy - 5, '#1a1210');
    A.px(hx - 1.5, hy - 1.5, '#5a2a1a');
    A.px(hx + 2, hy + 2, sk(1)); A.px(hx + 1, hy + 3, sk(1)); A.px(hx + 2.5, hy + 3.5, sk(1)); A.line(hx - 2, hy + 4, hx + 1, hy + 4, sk(1));
    A.px(hx - 3, hy - 3.5, sk(4)); A.px(hx - 2.5, hy - 4.5, sk(3));
    A.px(hx + 4, hy - 1, BN(3)); A.px(hx + 4, hy, BN(2)); A.px(hx + 3.5, hy + 2, BN(2));
    A.px(hx + 3, hy + 0.5, sk(3)); A.px(hx + 3, hy + 1.5, sk(1));
    if (T >= 1) K.crown(hx, hy, true);
    else { A.line(hx - 4, hy - 2.5, hx + 3.5, hy - 3, '#6a3a0e'); A.px(hx - 3.5, hy - 1.5, '#6a3a0e'); A.px(hx - 3.5, hy - 0.5, OS_CORAL); }   // the cord band, knotted behind
  }
  if (g.head === 'mask') {
    A.px(hx + 4.5, hy - 2, BN(3)); A.px(hx + 4.8, hy - 1, BN(2)); A.px(hx + 4.8, hy + 1, BN(2)); A.px(hx + 4.5, hy + 3, BN(1));
    A.line(hx + 4, hy - 1.5, hx - 4, hy - 1, '#1a1210'); A.line(hx + 4, hy + 2, hx - 3.5, hy + 1.5, '#1a1210');
    A.line(hx - 1, hy - 1, hx - 1, hy + 1.5, '#2a1a10'); A.px(hx - 1, hy + 0.3, BN(3));
    K.crown(hx, hy - 1, true);
  }
  if (g.head === 'hood') {
    const hd = A.poly([[shF[0], ny + 3], [hx - 5.5, hy + 3], [hx - 5, hy - 3], [hx - 2, hy - 6.5], [hx + 2, hy - 6.5], [hx + 5, hy - 3], [hx + 5, hy + 4], [shN[0], shN[1] + 1], [nx + 1, ny + 4]], 'osMaroon', { band: 2 });
    h32Folds(A, hd, [[hx - 1, hy - 6, hx - 1.5, hy + 3, 0], [hx - 4, hy - 2, hx - 5, hy + 3], [hx + 2.5, hy - 4, hx + 3.5, hy + 3]]);
    for (let i = 0; i < 6; i++) A.px(hx - 1.5 - i * 0.2, hy - 6 + i * 1.8, i % 2 ? BN(2) : BN(4));
    for (let i = 0; i < 4; i++) A.px(shF[0] + 1 + i * 2.5, ny + 3.5 + (i % 2) * 0.5, i % 2 ? '#6a3a0e' : '#d8a83a');
    A.line(hx + 4.5, hy - 2, hx + 4.5, hy + 3, '#060406');
    if (g.trim) { A.px(hx - 2, hy - 7, '#d8a83a'); A.px(hx - 1.5, hy - 6, '#fff0a0'); }
  }
  if (T === 2) osGorget(A, J, g, true);
  zsLateWpn(A, JB, g);
  if (J.cast) zsCandle(A, J);
}

// ------------------------------------------------------------------------ the Shrine Keeper's kit (v0.34)
// asagi - the pale blue hakama of a junior priest - at tier 0, vermilion above it; the fans: a closed one tucked in
// the belt, and an open one in the off hand, white paper on black lacquer ribs with a red sun, a brass rivet
pmat('msAsagi', ['#0e1620', '#223246', '#3a5470', '#58789a', '#86a8c4']);
pmat('msPaper', ['#3a3430', '#8a8276', '#cfc6b2', '#eee8da', '#ffffff']);
pmat('msKosode', ['#262430', '#6a6672', '#aaa6a8', '#d6d0c4', '#f4eee2']);
// an open fan pivoting on the hand at (px, py): a sector from angle a0 to a1 (radians), radius r
function msFan(A, px, py, a0, a1, r, t, trim) {
  const pts = [[px, py]], n = 8;
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([px + Math.cos(a) * r, py + Math.sin(a) * r]); }
  const id = A.poly(pts, 'msPaper', { tone: t, band: 1, hi: false });
  const am = (a0 + a1) / 2, sx = px + Math.cos(am) * r * 0.62, sy = py + Math.sin(am) * r * 0.62;
  A.fx(id, (x, y, e) => {
    const dx = x + 0.5 - px, dy = y + 0.5 - py, d = Math.hypot(dx, dy); let a = Math.atan2(dy, dx); while (a < Math.min(a0, a1) - 0.01) a += Math.PI * 2;
    if (d < r * 0.3) return t ? '#110a0e' : (((a - a0) / (a1 - a0) * 6 | 0) % 2 ? '#221216' : '#381e22');   // the lacquered ribs at the pivot
    if (d > r - 0.9) return trim ? (x & 1 ? '#fff0a0' : '#a8741e') : (t ? '#521812' : '#a8482e');           // the red-lacquered edge
    if ((sx - x - 0.5) ** 2 + (sy - y - 0.5) ** 2 < 1.6) return t ? '#8a2418' : '#d0402a';               // the sun
    const u = (a - a0) / (a1 - a0) * 7; if (Math.abs(u - Math.round(u)) < 0.12) return 1;                  // the pleats
    return null;
  });
  A.px(px, py, trim ? '#fff0a0' : '#d8a83a');   // the rivet
  return id;
}
// a closed fan: lacquered guard sticks, the paper's edge, a brass rivet at the head
function msFanShut(A, a, b, t) {
  A.limb([a, b], 0.9, 0.7, 'zsLacq', { tone: t, spec: 0.2 });
  const m = [a[0] + (b[0] - a[0]) * 0.55, a[1] + (b[1] - a[1]) * 0.55]; A.px(m[0] + 0.5, m[1], t ? '#8a8276' : '#eee8da');
  A.px(a[0], a[1], '#d8a83a'); A.px(b[0], b[1], t ? '#521812' : '#a8482e');
}
// the off-hand fan for a pose: open and raised in a cast, spread for a strike, open at rest, shut on the walk
function msFanPose(A, J, g, h, t, back) {
  if (J.walk) { msFanShut(A, [h[0], h[1] + 0.5], [h[0] - 1.5 - J.sw, h[1] + 6], t); return; }
  const base = J.cast ? [-3.3 - J.ph * 0.08, -1.9 - J.ph * 0.12] : J.atk ? [-3.8, -2.4] : [-3.65, -2.3];
  msFan(A, h[0], h[1] + 0.5, base[0], base[1], J.cast ? 8.5 : 8, t, g.trim);
}
// ------------------------------------------------------------------------ Miasmancer, from behind
function zsMiasBack(A, J, g) {
  const T = g.tier, ph = J.ph, sw = J.walk ? J.sw : 0, hex = zsHex;
  const [hx, hy] = J.head, [nx, ny] = J.neck, [cx, cy] = J.chest, [wx, wy] = J.waist;
  const shF = [J.shF[0] + 1, J.shF[1]], shN = [J.shN[0] - 0.5, J.shN[1]], JB = Object.assign({}, J, { shN, shF });
  const top = T === 2 ? 'zsLacq' : 'msKosode', haka = T === 0 ? 'msAsagi' : 'zsVerm';
  const wv = J.walk ? ph / 8 * Math.PI * 2 : ph / 4 * Math.PI * 2, fl = J.walk ? -1.2 - sw * 0.5 : J.cast ? -1 : J.atk ? -0.6 : Math.sin(wv) * 0.4;
  const sleeve = (sh, el, far) => {
    const tr = J.walk ? -2 - Math.abs(sw) * 1.2 : J.cast || J.atk ? -2.5 : -0.8, t = far ? -1 : 0;
    A.poly([[sh[0] - 2, sh[1] - 1], [sh[0] + 2, sh[1] - 0.5], [el[0] + 2, el[1] + 1], [el[0] + 1 + tr, el[1] + 8], [el[0] - 2.5 + tr, el[1] + 8.5], [sh[0] - 3 + tr * 0.4, sh[1] + 5]], 'msKosode', { tone: t, band: 2 });
    A.line(el[0] + 1 + tr, el[1] + 8, el[0] - 2.5 + tr, el[1] + 8.5, hex('zsVerm', far ? 1 : 2));
    if (g.trim) A.px(el[0] + 0.5 + tr, el[1] + 8, '#d8a83a');
  };
  if (T === 1) sleeve(shN, J.elN, true);
  const across = zsArmFarB(A, JB, g, top, T === 2 ? 'zsLacq' : 'zsWhite', 'zsSkinM', [1.7, 1.4, 1.4, 1.2]);
  for (const near of [false, true]) {
    const [ax, ay] = zsLegB(A, J, near, 'zsWhite', 'zsWhite', { r0: 1.1, r1: 1.0 });
    A.line(ax - 2, ay + 2, ax + 2.5, ay + 2, hex('zsStraw', near ? 2 : 1)); A.px(ax - 1, ay + 1, hex('zsStraw', 1));
    for (let y = ay - 5; y < ay - 1; y += 2) A.px(ax, y, hex('zsWhite', near ? 1 : 0));
  }
  // the hakama, the far leg first
  for (const near of [false, true]) {
    const k = J[near ? 'kneeF' : 'kneeN'], a = J[near ? 'ankF' : 'ankN'], t = near ? 0 : -1, hb = 41 - (J.walk ? Math.max(0, (near ? -1 : 1) * Math.cos(wv)) : 0);
    const bx = a[0] + (k[0] - a[0]) * 0.3;
    const hk = A.poly([[wx - 4 + (near ? 0 : 3), wy], [wx + 1 + (near ? 0 : 3), wy], [k[0] + 2.5, k[1]], [bx + 3.5, hb], [bx - 3.5, hb + 0.5], [k[0] - 3, k[1]]], haka, { tone: t, band: 2 });
    h32Folds(A, hk, [[wx - 2.5 + (near ? 0 : 3), wy + 2, bx - 1.8, hb - 1], [wx + 0 + (near ? 0 : 3), wy + 2, bx + 1.2, hb - 1]]);
    h32Hem(A, hk, 1, x => x & 1 ? hex(haka, 0) : null);
    if (g.trim) A.line(bx - 3, hb, bx + 3, hb - 0.5, '#a8741e');
  }
  if (T === 2) {
    for (let i = 0; i < 3; i++) {
      const x = wx - 4 + i * 3.3 - (i === 0 ? Math.max(0, -sw) : 0), t = i === 2 ? -1 : 0;
      A.poly([[x - 1.8, wy + 1], [x + 1.8, wy + 1], [x + 1.6 - i * 0.3, wy + 9], [x - 2 - i * 0.3, wy + 9]], 'zsLacq', { tone: t });
      for (let r = 0; r < 3; r++) A.line(x - 1.6, wy + 3 + r * 2.4, x + 1.4, wy + 3 + r * 2.4, hex('zsLacq', 0));
      A.px(x - 1, wy + 4, hex('zsLacq', 4)); A.px(x - i * 0.3, wy + 8.5, g.trim ? '#d8a83a' : '#8a3020');
    }
  }
  // the back
  zsTorsoB(A, JB, top, 3.5, { shF, shN, wb: 0.5 });
  const sx = cx - 1;
  if (T < 2) {
    A.line(nx - 1, ny + 2, sx, wy - 1, hex('zsWhite', 1));
    A.px(sx - 3, cy - 1, hex('zsWhite', 4)); A.px(sx + 2, cy + 1, hex('zsWhite', 1));
    A.poly([[nx - 3, ny + 0.5], [nx + 1.5, ny + 0.5], [nx + 1.5, ny + 2], [nx - 3, ny + 2]], T === 1 ? 'zsVerm' : 'zsWhite', {});   // the collar
    if (T === 0) { A.px(cx + 1, cy + 3, hex('zsWhite', 1)); A.px(cx + 2, cy + 4, hex('zsWhite', 1)); A.px(cx - 2, wy - 2, '#8a8680'); }
    if (T === 1) { A.px(sx - 1, cy + 1, '#8a3020'); A.px(sx, cy + 1, '#a8482e'); A.px(sx - 1, cy + 2, '#a8482e'); A.px(sx, cy + 2, '#8a3020'); }   // a vermilion crest between the shoulders
    if (g.trim) A.line(nx - 3, ny + 2, nx + 1.5, ny + 2, '#d8a83a');
  } else {
    for (let r = 0; r < 4; r++) { const y = cy - 2 + r * 2.4; A.line(cx - 4, y, cx + 3, y + 0.3, hex('zsLacq', 0)); A.line(cx - 3, y + 1, cx, y + 0.8, hex('zsLacq', 3)); A.px(cx - 3, y + 1, '#8a3020'); }
    A.line(cx - 4, wy - 1, cx + 3, wy - 1.3, '#8a3020');
    A.poly([[nx - 3, ny], [nx + 2, ny], [nx + 2, ny + 2], [nx - 3, ny + 2]], 'zsLacq', {});
    A.px(cx - 3, cy - 3, '#f0d8d0');
    if (g.trim) { A.line(nx - 3, ny + 2, nx + 2, ny + 2, '#d8a83a'); A.px(cx - 1, wy - 1, '#fff0a0'); }
  }
  // the koshi-ita: the stiff board of the hakama at the small of the back, its ties wound round and knotted
  { const kb = A.poly([[wx - 3.5, wy], [wx + 2.5, wy], [wx + 2, wy + 5], [wx - 3, wy + 5]], haka, { tone: 1, band: 1 });
    h32Hem(A, kb, 1, x => hex(haka, 0)); A.px(wx - 0.5, wy + 2.5, T ? '#fff0a0' : '#eee8da'); A.px(wx - 2.5, wy + 1, hex(haka, 4)); }
  // the shimenawa, its great knot tied at the back, paper shide hanging off it
  A.fx(A.poly([[wx - 4.5, wy - 1.5], [wx + 4.5, wy - 1.5], [wx + 4.5, wy + 1.8], [wx - 4.5, wy + 1.8]], 'zsStraw', {}), (x, y) => { const q = ((x - y) % 3 + 3) % 3; return q === 0 ? 4 : q === 1 ? 2 : 0; });
  A.ell(wx - 1, wy + 0.3, 2.2, 1.8, 'zsStraw', {}); A.px(wx - 2, wy - 0.5, hex('zsStraw', 4)); A.px(wx, wy + 1, hex('zsStraw', 1));
  zsShide(A, wx - 4, wy + 2, fl, false);
  // the gourd, on this hip now, seeping rot
  {
    const gx = wx - 5.5, gy = wy + 3 + (J.walk ? Math.round(sw * 0.5) : 0), m = ph % 4;
    A.ell(gx, gy + 3, 2.2, 2.4, 'zsStraw', {}); A.ell(gx + 0.3, gy, 1.4, 1.5, 'zsStraw', {});
    A.px(gx + 0.5, gy - 2, '#3a2a16'); A.px(gx, gy + 1.5, hex('zsVerm', 2)); A.px(gx + 1, gy + 1.5, hex('zsVerm', 2));
    A.px(gx + 0.5, gy - 3 - m % 2, ZS_MIAS[4]); A.px(gx - 0.5 - (m > 1 ? 1 : 0), gy - 5 - m % 2, ZS_MIAS[2]); A.px(gx - 1 - m * 0.5, gy - 7, ZS_MIAS[1]);
    A.px(gx + 1, gy + 5.5 + m % 2, ZS_MIAS[3]);
  }
  // the near arm
  if (T === 1) sleeve(shF, J.elF, false);
  A.limb([shF, J.elF], 1.7, 1.4, top, { contourAll: true });
  if (!across) {
    A.limb([J.elF, J.haF], 1.4, 1.2, T === 2 ? 'zsLacq' : T === 1 ? 'zsWhite' : 'zsSkinM', {});
    const m = zsLerp(J.elF, J.haF, 0.8); A.px(m[0], m[1], '#f6f2e8'); A.px(m[0] + 1, m[1] + 0.5, '#aaa8ac');
    A.ell(J.haF[0], J.haF[1] + 1.1, 1.2, 1.3, 'zsSkinM', {});
    msFanPose(A, J, g, J.haF, 0, true);
  }
  if (T === 2) {   // the sode on this shoulder now
    const [px_, py] = shF, dr = J.atk || J.cast ? -1 : 0;
    A.poly([[px_ - 2.5, py - 2], [px_ + 3, py - 1.5], [px_ + 2 + dr, py + 6.5], [px_ - 3.5 + dr, py + 6]], 'zsLacq', { band: 2 });
    for (let r = 0; r < 3; r++) A.line(px_ - 2.8 + dr * r * 0.3, py + 0.3 + r * 2, px_ + 2.4 + dr * r * 0.3, py + 0.5 + r * 2, r === 2 ? '#8a3020' : hex('zsLacq', 0));
    A.px(px_ - 1, py - 1, hex('zsLacq', 4)); A.px(px_ - 3 + dr, py + 6, g.trim ? '#d8a83a' : '#a8482e');
  }
  // the head from behind: black hair drawn back hard into a ponytail bound in white paper
  A.limb([[nx, ny], [hx - 0.5, hy + 3]], 1.2, 1.2, 'zsSkinM', { tone: -1 });
  A.poly([[hx - 3.5, hy - 1], [hx - 3, hy - 4.2], [hx + 0.5, hy - 5], [hx + 3, hy - 3.6], [hx + 3.8, hy - 1], [hx + 4, hy + 1.5], [hx + 3, hy + 4.2], [hx - 0.5, hy + 4.8], [hx - 3.5, hy + 1.5]], 'zsSkinM', {});
  if (g.head === 'mask') {   // the mask's ears or horns showing above the head, its cord tied behind
    if (T < 2) { A.poly([[hx + 2, hy - 4], [hx + 3.5, hy - 8], [hx + 4.8, hy - 3.5]], 'zsWhite', {}); A.px(hx + 3.5, hy - 6, '#a8482e'); A.px(hx + 4.5, hy - 1, hex('zsWhite', 3)); A.px(hx + 4.8, hy, hex('zsWhite', 2)); }
    else { A.limb([[hx + 1, hy - 4], [hx + 0.5, hy - 6], [hx - 0.5, hy - 7]], 1, 0.4, 'hBone', {}); A.limb([[hx + 4, hy - 4], [hx + 4.5, hy - 6], [hx + 5.5, hy - 7]], 0.9, 0.4, 'hBone', { tone: -1 }); A.px(hx + 4.6, hy - 0.5, hex('zsVerm', 3)); A.px(hx + 4.6, hy + 0.5, hex('zsVerm', 2)); }
  }
  if (g.head !== 'hood') {
    A.poly([[hx + 2.5, hy - 5], [hx - 1.5, hy - 5.6], [hx - 4.2, hy - 3], [hx - 4, hy + 2], [hx - 1.5, hy + 3.5], [hx + 2, hy + 3], [hx + 2.5, hy + 1], [hx + 3.4, hy - 0.5], [hx + 3.6, hy - 3]], 'hHair', {});
    for (let i = 0; i < 3; i++) A.line(hx - 3 + i * 1.5, hy - 4 + i * 0.3, hx - 1.5 + i * 0.6, hy + 1, hex('hHair', i === 0 ? 4 : 3));
    A.px(hx + 3, hy + 1, hex('zsSkinM', 3)); A.px(hx + 3, hy + 2, hex('zsSkinM', 1));   // the ear
    if (g.head === 'mask') { A.line(hx + 3.5, hy - 1.5, hx - 1.5, hy - 1, '#a8482e'); A.px(hx - 1.5, hy - 1, '#c66a48'); }
    // the ponytail: tied high at the back of the head, streaming down and back
    const t0 = [hx - 1.5, hy - 1], t1 = [hx - 3 + fl * 1.5, hy + 4 - fl * 0.5], t2 = [hx - 4 + fl * 3, hy + 10 - fl * 1.5 + Math.sin(wv) * 0.6];
    A.limb([t0, t1, t2], 1.7, 0.7, 'hHair', {});
    A.line(t0[0] - 0.5, t0[1] + 1.5, t1[0], t1[1], hex('hHair', 3));
    { const p = zsLerp(t0, t1, 0.75); A.px(p[0] - 1, p[1], '#f6f2e8'); A.px(p[0], p[1], '#d8d4c8'); A.px(p[0] + 1, p[1] - 0.5, '#aaa8ac'); A.px(p[0], p[1] + 1, '#a8482e'); if (g.trim) A.px(p[0] - 1, p[1] + 1, '#d8a83a'); }   // the paper tie, a red cord through it
  } else {
    // the kasa from behind: a wide cone of plaited straw over the whole head; the hair knot below it
    const hm = T === 2 ? 'zsLacq' : 'zsStraw', tl = J.walk ? 0.5 : 0;
    A.poly([[hx - 4, hy + 1], [hx - 3.5, hy - 2], [hx + 2.5, hy - 2.5], [hx + 3, hy + 3.5], [hx - 1, hy + 4]], 'hHair', {});
    A.ell(hx - 1.5, hy + 4.5, 1.5, 1.3, 'hHair', {}); A.px(hx - 1.5, hy + 3.5, '#f6f2e8');
    A.poly([[hx - 9.5, hy + 1.5 + tl], [hx - 3, hy - 5], [hx - 0.5, hy - 7], [hx + 1.5, hy - 7], [hx + 4, hy - 5], [hx + 10.5, hy + 2.5 - tl], [hx + 9.5, hy + 3.5 - tl], [hx + 1, hy + 4], [hx - 9, hy + 2.8]], hm, { band: 2 });
    for (let i = -3; i <= 3; i++) A.line(hx + 0.5 + i * 0.4, hy - 6, hx + 0.5 + i * 2.8, hy + 2.5 - (i > 0 ? tl : 0), hex(hm, i < 0 ? 3 : 1));
    for (let i = 0; i < 2; i++) A.line(hx - 6 + i * 2, hy + 1 - i * 3, hx + 7 - i * 2, hy + 1.5 - i * 3, hex(hm, 1));
    A.line(hx - 9, hy + 2.5, hx + 10, hy + 3.2 - tl, T === 2 ? '#8a3020' : hex(hm, 0));
    A.line(hx + 2.5, hy + 3.5, hx + 2 + fl * 0.5, hy + 7, '#8a3020'); A.px(hx + 2 + fl * 0.5, hy + 7.5, '#a8482e');   // the chin-cord's end
    if (g.trim) { A.px(hx + 0.5, hy - 7, '#fff0a0'); A.px(hx + 10, hy + 2.5, '#d8a83a'); A.px(hx - 9, hy + 2, '#d8a83a'); }
  }
  zsLateWpn(A, JB, g);
  if (J.cast) zsRot(A, J);
}

// ------------------------------------------------------------------------------------------------ the Animancer
H32.animancer = function (A, J, g) {
  if (J.back) return zsAnimBack(A, J, g);
  const T = g.tier, ph = J.ph, sw = J.walk ? J.sw : 0, hex = zsHex;
  const [hx, hy] = J.head, [nx, ny] = J.neck, [cx, cy] = J.chest, [wx, wy] = J.waist;
  const cloth = T === 0 ? 'zsAsh' : T === 1 ? 'zsVest' : 'zsCoat';
  // the wind of the Last Breath never stops: the stole lifts even at rest
  const gust = J.walk ? 1 : J.cast ? 1.25 : J.atk ? 0.8 : 0.45, wv = J.walk ? ph / 8 * Math.PI * 2 : ph / 4 * Math.PI * 2;
  // the stole's tail: it runs down the back and streams out behind from the waist, widening, cut in a swallowtail
  // two long thin tails of the stole stream from the nape, each on its own wave
  const sa = J.walk ? 2.45 : J.cast ? 2.65 : J.atk ? 2.3 : 1.9, tails = [];
  for (const [k, len, off] of [[0, 9, 0], [1, 6, 1.7]]) {
    const t = [[nx - 2, ny + 0.5 + k]];
    for (let i = 1; i <= len; i++) { const p = t[i - 1], an = sa + i * (J.walk || J.cast ? 0.05 : 0.02) + Math.sin(wv * (1 + k * 0.5) - i * 0.85 + off) * (0.1 + i * 0.045) - k * 0.3; t.push([p[0] + Math.cos(an) * 2.3, p[1] + Math.sin(an) * 2.3]); }
    tails.push(t);
  }
  // tier 2: a wind-torn cloak streaming behind
  if (T === 2) {
    const b = -2 - gust * 5, rag = [0, 3, 1, 4, 0, 2];
    const pts = [[J.shN[0] - 1, J.shN[1] - 1], [nx - 1, ny - 1], [J.shF[0] - 2, J.shF[1] + 1]];
    for (let i = 0; i < 6; i++) { const u = i / 5; pts.push([J.shF[0] - 3 + b * u - Math.sin(wv + u * 3) * u * 1.5 - rag[i] * 0.4, J.shF[1] + 5 + u * 18 + rag[i]]); }
    pts.push([wx - 1, 41], [wx + 2, 40], [wx + 1, wy]);
    A.poly(pts, 'zsCloak', { band: 2 });
    for (let i = 0; i < 3; i++) A.px(J.shF[0] - 2 + b * (0.3 + i * 0.25), J.shF[1] + 10 + i * 5, hex('zsCloak', 3));
  }
  for (let k = 1; k >= 0; k--) {
    const t = tails[k], e = t[t.length - 1], f = t[t.length - 2];
    A.limb(t, 1.0, 0.9, 'zsStole', { tone: -k });
    // the fringed end, and on the long tail the black mourning-band sewn across it
    A.px(e[0] + (e[0] - f[0]) * 0.5, e[1] + (e[1] - f[1]) * 0.5 + 0.5, hex('zsStole', 1));
    { const m = t[t.length - 2]; A.px(m[0], m[1], k ? '#8a1a1a' : '#c43a22'); A.px(e[0], e[1], k ? '#6a1414' : '#8a1a1a'); }
    if (g.trim) A.px(e[0], e[1], '#d8a83a');
  }
  // far arm in shadow
  A.limb([J.shF, J.elF], 1.6, 1.4, cloth, { tone: -1, contour: false });
  A.limb([J.elF, J.haF], 1.3, 1.1, T === 2 ? 'zsCoat' : 'hBand', { tone: -1 });
  A.ell(J.haF[0], J.haF[1] + 1, 1.2, 1.3, 'hSkinPale', { tone: -1 });
  // thin legs bound in grave-cloth; bare wrapped feet, sandals, or iron-shod boots
  for (const far of [true, false]) {
    const [ax, ay] = zsLeg(A, J, far, T === 2 ? 'zsCoat' : 'hBand', T === 2 ? 'hIron' : T === 1 ? 'hLea' : 'zsAsh', { r0: 1.2, r1: 1.0, boot: T === 2 });
    if (T < 2) { A.px(ax - 1, ay - 3, hex('hBand', 1)); A.px(ax, ay - 5, hex('hBand', 1)); }
    else A.px(ax, ay - 3, '#c4c8d2');
  }
  // skirt: ragged shroud wraps to the shin (T0), layered vestments to the ankle (T1), a split coat (T2)
  if (T === 0) {
    const [fr, bk] = zsSkirt(A, J, 'zsAsh', 39, { rag: true, teeth: 9 });
    for (let y = wy + 4; y < 38; y += 3) A.line(wx - 4, y + 1, wx + 4, y - 1, hex('zsAsh', 1));
  } else if (T === 1) {
    zsSkirt(A, J, 'zsVest', 44, { teeth: 7, fw: 3, bw: 5, tone: -1 });
    // an inner pale layer showing at the split
    const fr = Math.max(J.kneeN[0] + 3, 21);
    A.poly([[wx + 1, wy + 2], [wx + 4, wy + 2], [fr - 1, 43], [wx + 3, 44]], 'zsAsh', {});
    for (let y = wy + 4; y < 43; y += 2) A.px(wx + 2 + (y - wy) * 0.2, y, hex('zsAsh', 1));
    // the outer vestment, cut shorter, its hem pinked into points
    const [f2, b2] = zsSkirt(A, J, 'zsVest', 37, { teeth: 7, fw: 1, bw: 3, fmin: 19 });
    for (let i = 0; i < 4; i++) A.px(f2 - (f2 - b2) * (i + 0.5) / 4, 37, hex('zsVest', 3));
    if (g.trim) for (let i = 0; i < 7; i++) A.px(f2 - (f2 - b2) * i / 6, 36 + (i % 2), '#d8a83a');
  } else {
    const [fr, bk] = zsSkirt(A, J, 'zsCoat', 41, { teeth: 6, fw: 2, bw: 4 });
    // the split front of the coat, iron-bound hem
    A.line(wx + 2, wy + 3, J.kneeN[0], 40, hex('zsCoat', 0));
    for (let i = 0; i < 6; i++) A.px(fr - (fr - bk) * i / 5, 40, g.trim ? '#d8a83a' : hex('hIron', 3));
  }
  // torso
  A.poly([[J.shF[0] - 1, J.shF[1]], [nx - 1, ny + 1], [nx + 2, ny + 1], [J.shN[0] + 1, J.shN[1]], [cx + 4, cy + 1], [wx + 4, wy + 1], [wx - 4, wy + 1], [cx - 4, cy + 1]], cloth, { band: 2 });
  if (T === 0) {   // grave-wraps wound around the chest
    for (let i = 0; i < 4; i++) A.line(cx - 3, cy - 2 + i * 2, cx + 3, cy - 3 + i * 2, hex('zsAsh', 1));
    A.px(cx + 2, cy + 3, hex('zsAsh', 4)); A.px(cx - 2, cy + 1, hex('zsAsh', 3));
  } else if (T === 1) {   // layered vestments: an under-robe collar and an overlapping front
    A.poly([[nx - 0.5, ny + 1], [nx + 3, ny + 1], [cx + 3, wy], [cx, wy]], 'zsAsh', {});
    A.line(nx + 1, ny + 2, cx + 1, wy - 1, hex('zsAsh', 1));
  } else {   // the coat bound in iron bands, riveted
    for (let i = 0; i < 3; i++) {
      const y = cy - 1 + i * 3; A.poly([[cx - 4, y], [cx + 4.5, y - 0.5], [cx + 4.5, y + 1.2], [cx - 4, y + 1.7]], 'hIron', {});
      A.px(cx + 2, y + 0.5, g.trim ? '#fff0a0' : '#c4c8d2');
    }
  }
  // belt: a plain cord, or a leather cincture; iron jingle-cones on it, a bronze mirror swinging on a chain at the hip
  A.poly([[wx - 4.5, wy - 0.5], [wx + 4.5, wy - 0.5], [wx + 4.5, wy + 1.2], [wx - 4.5, wy + 1.2]], T ? 'hLea' : 'hRope', {});
  if (T) A.px(wx + 1, wy, g.trim ? '#fff0a0' : '#dde4ee');
  anCones(A, wx - 3.5, wy + 1.5, 3, 0, J.walk ? -sw : 0);
  {
    const sway = J.walk ? -sw * 1.6 : J.atk ? [0, 1, -2, -1][ph] : J.cast ? -1 : 0, c0 = [wx + 3, wy + 1], c1 = [wx + 4.5 + sway, wy + 6];
    for (let i = 0; i <= 5; i++) { const p = zsLerp(c0, c1, i / 5); A.px(p[0], p[1], i % 2 ? '#8a90a0' : '#3a3e48'); }
    anMirror(A, c1[0] + 0.5, c1[1] + 2.5, 2.4, 0, false);
    if (g.trim) A.px(c1[0] + 0.5, c1[1] + 5, '#fff0a0');
  }
  // the stole: laid over the far shoulder, hanging down the chest on the near side
  A.limb([[nx - 2.5, ny + 0.5], [nx + 1, ny + 1]], 1.5, 1.4, 'zsStole', {});
  const stl = A.poly([[nx + 1, ny], [nx + 4.5, ny + 1], [cx + 4, wy + 6], [cx + 0.5, wy + 6.5]], 'zsStole', {});
  for (let y = cy + 4; y < wy; y += 2) A.px(nx + 2 + (y - ny) * 0.12, y, hex('zsStole', 1));
  h32Hem(A, stl, 5, anStitch);
  A.px(cx + 1, wy + 7, hex('zsStole', 2)); A.px(cx + 3, wy + 7, hex('zsStole', 2));
  // a sigil of Yh'Anuul stitched on it: an open mouth exhaling
  A.px(cx + 2, cy + 1, '#3a5a86'); A.px(cx + 3, cy + 1, '#3a5a86'); A.px(cx + 2, cy + 2, '#4a7ab0');
  if (g.trim) { A.px(cx + 1, wy + 7, '#d8a83a'); A.px(cx + 3, wy + 7, '#d8a83a'); A.px(cx + 2, wy + 7, '#fff0a0'); A.line(cx + 0.5, wy + 4, cx + 4, wy + 3.5, '#a8741e'); }
  // the breast mirror on its cord
  A.line(nx - 1.5, ny + 1, cx - 1.5, cy - 1.5, '#2a1a10'); anMirror(A, cx - 1.5, cy + 1, 2.3, 0, false);
  if (T >= 1) { const fr = A.poly([[J.shF[0] + 1, J.shF[1] - 1.5], [nx - 1, ny - 1], [nx + 4, ny], [nx + 5, ny + 2], [nx + 1, ny + 2.5], [J.shF[0] + 1.5, J.shF[1] + 1.5]], 'anFur', { band: 1 }); A.fx(fr, anFurFx); }
  if (T === 2) {   // a pauldron of blackened iron
    A.ell(J.shN[0] - 0.5, J.shN[1] + 0.5, 3.2, 2.4, 'hIron', { spec: 0.2 });
    A.px(J.shN[0] - 1.5, J.shN[1] - 0.5, '#c4c8d2'); A.px(J.shN[0] + 1, J.shN[1] + 1.5, g.trim ? '#d8a83a' : '#262830');
  }
  // the head: gaunt, hollow-cheeked, lank dark hair; a breath-cloth over the mouth
  A.limb([[nx, ny], [hx - 0.5, hy + 3]], 1.3, 1.3, 'zsSkinA', { tone: -1 });
  A.poly([[hx - 3.5, hy - 1], [hx - 2.5, hy - 4.5], [hx + 1, hy - 5], [hx + 3.5, hy - 3.5], [hx + 4, hy - 0.5], [hx + 4.8, hy + 0.5], [hx + 4, hy + 1.5], [hx + 3.6, hy + 3], [hx + 2, hy + 5], [hx - 0.5, hy + 4.5], [hx - 3.5, hy + 1.5]], 'zsSkinA', {});
  if (g.head !== 'hood') {
    A.poly([[hx + 3, hy - 5], [hx - 2, hy - 5.6], [hx - 4.3, hy - 3], [hx - 4.5, hy + 4], [hx - 5 - gust * 1.5, hy + 9 + (J.walk ? 0 : 1)], [hx - 3, hy + 8], [hx - 2, hy + 5], [hx - 1.2, hy + 1.5], [hx - 0.5, hy - 2.5], [hx + 1.5, hy - 3.8], [hx + 3.8, hy - 3.4]], 'zsHairA', {});
    A.px(hx - 3, hy + 2, hex('zsHairA', 1)); A.px(hx - 2, hy - 1, hex('zsHairA', 1)); A.px(hx - 4, hy + 6, hex('zsHairA', 1)); A.px(hx - 3.5, hy + 4, hex('zsHairA', 4));
    if (!g.head) anSkullcap(A, hx, hy, false, g.trim);
  }
  const sp = PMAT.zsSkinA, sh = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  if (g.head === 'mask') {
    // a bronze breathing-mask over the whole face: riveted plates, glass over the eyes, a snout of vents, a hose down to the collar
    const bm = A.poly([[hx - 3.5, hy - 1], [hx - 2.5, hy - 4.5], [hx + 1, hy - 5.5], [hx + 4, hy - 4], [hx + 4.8, hy - 0.5], [hx + 5.5, hy + 1], [hx + 5, hy + 5.5], [hx + 2, hy + 6], [hx - 0.5, hy + 4.5], [hx - 3.5, hy + 2]], 'zsBronze', { band: 2, spec: 0.12 });
    A.fx(bm, (x, y, e) => y === Math.round(hy + 1) && e.l > 1 && e.r > 1 ? 0 : null);   // the seam between the eye-plate and the muzzle
    A.poly([[hx + 4, hy + 1.5], [hx + 7, hy + 2], [hx + 7.5, hy + 3.5], [hx + 7, hy + 5.5], [hx + 4, hy + 5.5]], 'zsBronze', { band: 2 });
    A.px(hx + 7, hy + 3, '#1e1206'); A.px(hx + 7, hy + 4, '#1e1206'); A.px(hx + 7, hy + 5, '#1e1206');
    A.px(hx + 2, hy - 1.5, '#aad7ff'); A.px(hx + 3, hy - 1.5, '#4a7ab0'); A.px(hx + 4, hy - 1, '#aad7ff'); A.px(hx + 2, hy - 2.5, '#e8f6ff');   // the glass, the wisp-light behind it
    A.px(hx - 2, hy - 2, g.trim ? '#fff0a0' : hex('zsBronze', 4)); A.px(hx + 1, hy + 3, g.trim ? '#fff0a0' : hex('zsBronze', 4)); A.px(hx - 1, hy + 3, hex('zsBronze', 1)); A.px(hx + 5, hy + 1, hex('zsBronze', 4));
    for (let i = 0; i < 4; i++) A.px(hx + 1 + i * 0.3, hy + 6 + i, i % 2 ? hex('zsBronze', 1) : hex('zsBronze', 3));
  }
  // the eye: a sunken socket with a pale ghost-light in it
  if (!g.head) {
    for (let x = 1; x < 5; x++) A.px(hx + x, hy - 2, sh(sp[1]));
    A.px(hx + 1, hy - 1, sh(sp[0])); A.px(hx + 2, hy - 1, '#aad7ff'); A.px(hx + 3, hy - 1, sh(sp[0])); A.px(hx + 4, hy - 1, '#6a90b8');
    A.px(hx + 1, hy + 1, sh(sp[1])); A.px(hx + 1, hy + 2, sh(sp[1])); A.px(hx + 4, hy - 3, sh(sp[3]));
  }
  if (!g.head) {
    // the black mourning-veil over mouth and nose
    const vl = J.walk ? -Math.round(sw * 0.6) : J.cast ? -1 : 0;
    const vid = A.poly([[hx + 0.5, hy + 0.5], [hx + 5.2, hy + 0.2], [hx + 5, hy + 4], [hx + 3.5 + vl, hy + 8], [hx + 1.5 + vl, hy + 7.5], [hx, hy + 3.5]], 'zsVeil', {});
    A.fx(vid, (x, y, e) => e.t === 1 ? (x & 1 ? '#d8a83a' : '#c43a22') : e.b === 1 ? '#8a1a1a' : null);
    A.px(hx + 3 + vl, hy + 8, hex('zsVeil', 2)); A.px(hx + 2, hy + 3, hex('zsVeil', 3)); A.px(hx + 4, hy + 2, hex('zsVeil', 3)); A.px(hx + 4, hy + 5, hex('zsVeil', 3));
    A.px(hx + 5, hy + 1, '#46485a');
    if (g.trim) { A.line(hx + 1, hy + 0.5, hx + 5, hy + 0.5, '#d8a83a'); A.px(hx + 3 + vl, hy + 9, '#d8a83a'); }
  }
  if (g.head === 'hood') {
    // a deep cowl, and a pale grave-veil falling from its brim over the face to the chest; the ghost-light shows through
    A.poly([[J.shF[0] - 1, ny + 3], [hx - 5, hy + 3], [hx - 4.5, hy - 4], [hx - 1, hy - 7.5], [hx + 3, hy - 6.5], [hx + 6, hy - 2], [hx + 5.5, hy + 4], [J.shN[0] + 1, J.shN[1] + 1]], T === 2 ? 'zsCloak' : T === 1 ? 'zsVest' : 'zsAsh', { band: 2 });
    A.poly([[hx + 0.5, hy - 4.5], [hx + 5.2, hy - 3.5], [hx + 5.5, hy + 4], [hx + 2.5, hy + 5.5], [hx + 0.5, hy + 4]], '#07080c', { flat: true, contour: false });
    const vl = J.walk ? -Math.round(sw * 0.8) : J.cast ? -1 : 0;
    // the grave-veil hangs from the brim below the eyes, over mouth and chest
    A.poly([[hx + 1, hy + 1], [hx + 5.5, hy + 0.5], [hx + 6.5 + vl, hy + 9], [hx + 5 + vl, hy + 10], [hx + 3 + vl, hy + 9.5], [hx + 1.5, hy + 8]], 'zsStole', { band: 1 });
    for (let y = hy + 2; y < hy + 8; y++) for (let x = hx + 2; x < hx + 6; x++) if (((x + y) & 1)) A.px(x + vl * (y - hy) / 10, y, hex('zsStole', 1));
    A.px(hx + 2, hy - 1.5, '#e8f6ff'); A.px(hx + 4, hy - 1.5, '#aad7ff'); A.px(hx + 2, hy - 0.5, '#4a7ab0');
    for (let i = 0; i < 3; i++) A.px(hx + 2.5 + i * 1.3 + vl, hy + 9 + (i % 2), hex('zsStole', 1));
    if (g.trim) { A.line(hx + 2, hy - 4.5, hx + 5, hy - 3.5, '#d8a83a'); A.px(hx - 1, hy - 7, '#d8a83a'); }
  }
  // near arm: a long sleeve, a wrapped wrist, a thin pale hand
  A.limb([J.shN, J.elN], 1.9, 1.6, cloth, { contourAll: true });
  A.limb([J.elN, J.haN], 1.6, 1.3, T === 2 ? 'zsCoat' : cloth, {});
  if (T === 2) { const m = zsLerp(J.elN, J.haN, 0.6); A.ell(m[0], m[1], 1.9, 1.6, 'hIron', { spec: 0.2 }); A.px(m[0] - 0.5, m[1] - 1, '#ffffff'); }
  else { const m = zsLerp(J.elN, J.haN, 0.8), m2 = zsLerp(J.elN, J.haN, 0.9); A.px(m[0], m[1], '#c43a22'); A.px(m[0] - 1, m[1], '#8a1a1a'); A.px(m2[0], m2[1], '#6a1414'); A.px(m2[0] + 1, m2[1], '#c43a22'); }
  { const a = zsLerp(J.shN, J.elN, 0.3), b = zsLerp(J.shN, J.elN, 0.9), fs = J.walk ? -sw : 0; for (let i = 0; i < 4; i++) { const p = zsLerp(a, b, i / 3); A.px(p[0] - 1.5 + fs * 0.3, p[1] + 1.5, '#644630'); A.px(p[0] - 1.5 + fs * 0.6, p[1] + 2.5, i % 2 ? '#46301e' : '#80603e'); } }
  weapon32(A, g, J);
  A.ell(J.haN[0], J.haN[1] + 1.2, 1.3, 1.4, 'hSkinPale', {});
  if (J.cast) zsWisp(A, J);
};

// ------------------------------------------------------------------------------------------------ the Ossurarch
// v0.34: a bone-priest of the high charnel grounds, worked to the Iron Golem's finish. A maroon robe with the shawl
// thrown over the far shoulder and the weapon arm bare, a saffron vest with brocade at the armhole, a pleated skirt;
// a long mala of bone beads with a turquoise counter and a silver amulet-box; a thighbone trumpet with a silver bell
// thrust through the sash; felt boots striped at the ankle. Tier 1 adds the apron and collar of carved bone net
// hung with rosettes; tier 2 the rib cuirass, the spine gorget, bone greaves. The shaved head is painted as a skull
// and crowned with small skulls.
pmat('osMaroon', ['#12060a', '#2e0e16', '#4e1a22', '#74282c', '#9a443a']);
pmat('osSaffron', ['#2a1606', '#6a3a0e', '#a8641a', '#d8922a', '#f6c860']);
pmat('osFelt', ['#0c0608', '#241014', '#40181c', '#5e2824', '#7e3c30']);
const OS_TURQ = ['#0e3a3a', '#2a8a86', '#6ad0c0'], OS_CORAL = '#e0583a', OS_SILVER = ['#262830', '#7a808e', '#c4c8d2', '#ffffff'];
// the bone net: beads at the crossings of a diamond lattice, the cloth under it showing through the holes
const osNet = (x, y, e) => (e.l === 1 || e.r === 1) ? '#d8ceb0' : ((x + y) % 4 === 0 && (x - y) % 4 === 0 ? (e.k >= 3 ? '#f4eedc' : '#d8ceb0') : ((x + y) % 4 === 0 || (x - y) % 4 === 0 ? '#6a6250' : null));
function osKit(A, J, g) {
  const X = h32hex, BN = n => X('hBone', n), T = g.tier;
  return {
    boot(ax, ay, t, back) {
      if (T === 0) {   // sandals, the shins bound in cord
        if (back) A.poly([[ax - 2, ay - 1.5], [ax + 1, ay - 1.5], [ax + 2.5, ay + 0.5], [ax + 2, ay + 2], [ax - 2, ay + 2]], 'zsSkinO', { tone: t });
        else A.poly([[ax - 1.5, ay - 1.5], [ax + 1, ay - 1.5], [ax + 3.5, ay + 0.5], [ax + 3.8, ay + 2], [ax - 1.5, ay + 2]], 'zsSkinO', { tone: t });
        A.line(ax - 1.5, ay + 2, ax + (back ? 2 : 3.5), ay + 2, X('hLea', t ? 0 : 1)); A.px(ax, ay, X('hLea', 3)); A.px(ax + (back ? -1 : 1), ay - 1, X('hLea', 2));
        for (let i = 0; i < 3; i++) A.px(ax - 1 + (i % 2), ay - 3 - i * 1.5, X('hRope', t ? 2 : 3 + (i % 2)));
        return;
      }
      // felt boots with an upturned toe, striped red, green and gold at the ankle
      const pts = back ? [[ax - 2, ay - 5], [ax + 1.5, ay - 5], [ax + 1.8, ay - 1.5], [ax + 2.8, ay + 0.5], [ax + 2.3, ay + 2], [ax - 2, ay + 2]]
        : [[ax - 1.8, ay - 5], [ax + 1.5, ay - 5], [ax + 1.8, ay - 1.5], [ax + 3.5, ay - 0.5], [ax + 4.5, ay - 1.5], [ax + 4.2, ay + 1], [ax + 3.5, ay + 2], [ax - 1.8, ay + 2]];
      const id = A.poly(pts, 'osFelt', { tone: t });
      A.fx(id, (x, y) => y === Math.round(ay - 4) ? (t ? '#8a2418' : '#c43a22') : y === Math.round(ay - 3) ? (t ? '#1e5a3a' : '#2e8a5a') : y === Math.round(ay - 2) ? (t ? '#8a6a1e' : '#d8a83a') : null);
      if (!back) A.px(ax + 3.5, ay - 1, t ? '#5e2824' : '#9a443a');
      A.line(ax - 1.5, ay + 2, ax + (back ? 2 : 3.5), ay + 2, '#0c0608');
    },
    // a long mala of bone beads looping from the neck; a turquoise counter-bead at its lowest point
    mala(x0, y0, x1, y1, sag, t) {
      const n = Math.round(Math.hypot(x1 - x0, y1 - y0) + sag);
      for (let i = 0; i <= n; i++) { const u = i / n, x = x0 + (x1 - x0) * u, y = y0 + (y1 - y0) * u + Math.sin(u * Math.PI) * sag; A.px(x, y, i % 2 ? BN(t ? 2 : 4) : BN(t ? 1 : 2)); }
      const m = [x0 + (x1 - x0) * 0.55, y0 + (y1 - y0) * 0.55 + Math.sin(0.55 * Math.PI) * sag]; A.px(m[0], m[1] + 1, OS_TURQ[2]); A.px(m[0], m[1] + 2, OS_TURQ[1]); A.px(m[0], m[1] + 3, OS_CORAL);
    },
    // the ga'u: a little silver shrine-box with a turquoise in its window, a coral bead set above
    gau(x, y) {
      const id = A.poly([[x - 2, y - 1], [x, y - 2.5], [x + 2, y - 1], [x + 2, y + 2], [x - 2, y + 2]], 'hSteel', { spec: 0.2 });
      A.px(x, y, OS_TURQ[2]); A.px(x, y + 1, OS_TURQ[1]); A.px(x - 1, y - 1, OS_SILVER[3]); A.px(x, y - 2, OS_CORAL); A.px(x + 1.5, y + 1.5, OS_SILVER[0]);
      return id;
    },
    // the thighbone trumpet: the knuckle-ends, a silver bell-mouth with a hard glint
    kangling(a, b, t) {
      A.limb([a, b], 0.9, 0.9, 'hBone', { tone: t });
      A.ell(a[0], a[1], 1.2, 1.1, 'hBone', { tone: t }); A.px(a[0] - 0.5, a[1] - 0.5, BN(t ? 3 : 4));
      const d = [b[0] - a[0], b[1] - a[1]], L = Math.hypot(d[0], d[1]) || 1, u = [d[0] / L, d[1] / L];
      A.poly([[b[0] - u[1] * 1.2, b[1] + u[0] * 1.2], [b[0] + u[0] * 2 - u[1] * 2, b[1] + u[1] * 2 + u[0] * 2], [b[0] + u[0] * 2 + u[1] * 2, b[1] + u[1] * 2 - u[0] * 2], [b[0] + u[1] * 1.2, b[1] - u[0] * 1.2]], 'hSteel', { tone: t, spec: 0.3 });
      A.px(b[0] + u[0] * 1.5, b[1] + u[1] * 1.5, t ? OS_SILVER[1] : OS_SILVER[3]);
      const m = [a[0] + d[0] * 0.5, a[1] + d[1] * 0.5]; A.px(m[0], m[1], OS_SILVER[2]); A.px(m[0] + u[0], m[1] + u[1], OS_TURQ[1]);
    },
    // a crown of small skulls on a band; from the front three show, the middle one largest
    crown(hx, hy, back) {
      A.line(hx - 4, hy - 3, hx + 3.5, hy - 3.5, X('hGold', 1)); A.line(hx - 4, hy - 2.5, hx + 3.5, hy - 3, X('hGold', 2));
      const sk = back ? [[hx - 2.5, 1.4], [hx + 1.5, 1.4]] : [[hx - 2.5, 1.2], [hx + 0.5, 1.6], [hx + 3, 1.2]];
      for (const [x, r] of sk) {
        const y = hy - 4 - r; A.ell(x, y, r + 0.3, r + 0.2, 'hBone', { tone: back ? -1 : 0 });
        if (!back) { A.px(x - 0.5, y, '#1a1210'); A.px(x + 0.5, y, '#1a1210'); A.px(x, y + 1, '#1a1210'); } else A.px(x - 0.5, y - 0.5, BN(3));
        A.px(x - 0.5, y - r + 0.3, BN(4));
      }
      if (!back) { A.px(hx + 0.5, hy - 2.8, OS_TURQ[2]); A.px(hx - 2.5, hy - 2.8, OS_CORAL); A.px(hx + 3, hy - 3.2, OS_CORAL); }
      if (g.trim) A.px(hx + 0.5, hy - 7, '#fff0a0');
    },
  };
}
function osGorget(A, J, g, back) {
  const BN = n => h32hex('hBone', n), [hx, hy] = J.head, [nx, ny] = J.neck, sp = [];
  if (!back) {
    for (let i = 0; i < 7; i++) { const u = i / 6; sp.push([nx - 3 - Math.sin(u * 2.4) * 2.2 + u * 1.5, ny + 1 - u * 12]); }
    for (let i = 0; i < 7; i++) {
      const p = sp[i], r = 1.7 - i * 0.14;
      A.limb([p, [p[0] - 1.8 - (6 - i) * 0.15, p[1] + 0.6]], 0.6, 0.4, 'hBone', { tone: -1 });
      A.ell(p[0], p[1], r + 0.3, r * 0.7, 'hBone', { tone: i % 2 ? -1 : 0 });
      A.px(p[0] - 0.5, p[1] - 0.5, BN(i % 2 ? 3 : 4)); A.px(p[0] + 0.5, p[1] + 1, '#1a1210');
    }
  } else {
    for (let i = 0; i < 7; i++) { const u = i / 6; sp.push([nx + (hx + 1 - nx) * u - Math.sin(u * 2.4) * 1.2, ny + 2 - u * 16.5]); }
    for (let i = 0; i < 7; i++) {
      const p = sp[i], r = 1.5 - i * 0.1;
      A.ell(p[0], p[1], r + 0.4, r * 0.75, 'hBone', { tone: i > 4 ? -1 : 0 });
      A.px(p[0] - r - 0.8, p[1] + 0.5, BN(3)); A.px(p[0] + r + 0.8, p[1] + 0.5, BN(1));
      A.px(p[0] - 0.5, p[1] - 0.5, BN(4)); A.px(p[0], p[1] + 1.2, '#1a1210'); A.px(p[0] + 1, p[1] + 1.2, '#1a1210');
    }
  }
  if (g.trim) A.px(sp[6][0], sp[6][1] - 1, '#d8a83a');
}
H32.ossumancer = function (A, J, g) {
  if (J.back) return zsOssBack(A, J, g);
  const T = g.tier, ph = J.ph, sw = J.walk ? J.sw : 0, X = h32hex, BN = n => X('hBone', n), SK = 'zsSkinO', sk = i => X(SK, i), K = osKit(A, J, g);
  const [hx, hy] = J.head, [nx, ny] = J.neck, [cx, cy] = J.chest, [wx, wy] = J.waist;
  const shF = [J.shF[0] - 1, J.shF[1]], shN = [J.shN[0] + 1, J.shN[1]];
  if (T === 2) osGorget(A, J, g, false);
  // the far arm under the shawl, in shadow
  A.limb([shF, J.elF], 2.0, 1.7, 'osMaroon', { tone: -1, contour: false });
  A.limb([J.elF, J.haF], 1.6, 1.3, 'osMaroon', { tone: -1 });
  A.ell(J.haF[0], J.haF[1] + 1, 1.3, 1.3, SK, { tone: -1 });
  { const m = zlerp32(J.elF, J.haF, 0.95); A.px(m[0], m[1], BN(2)); A.px(m[0] - 1, m[1], BN(1)); }
  // legs and boots
  for (const far of [true, false]) {
    const k = J[far ? 'kneeF' : 'kneeN'], [ax, ay] = J[far ? 'ankF' : 'ankN'], t = far ? -1 : 0;
    A.limb([k, [ax, ay - 1]], 1.5, 1.3, T === 0 ? SK : 'osMaroon', { tone: t });
    K.boot(ax, ay, t, false);
    if (T === 2) { A.ell(k[0] + 0.5, k[1], 1.7, 1.5, 'hBone', { tone: t }); A.px(k[0], k[1] - 0.5, BN(far ? 3 : 4)); A.line(k[0] + 1, k[1] + 2, ax + 1, ay - 5, BN(far ? 2 : 3)); }
  }
  // the pleated skirt, a brocade band at the hem
  const hem = T === 0 ? 42 : 44, S = h32Skirt(A, J, 'osMaroon', hem, T === 0 ? { rag: [0, 1, 0, 2, 1, 0, 1, 2, 0], teeth: 9, ww: 6 } : { teeth: 7, ww: 6, bw: 5 });
  const fs = J.walk ? sw * 0.9 : 0;
  h32Folds(A, S.id, [[wx - 4, wy + 3, S.back + 2.5, hem], [wx - 1.5, wy + 3, wx - 2.5 - fs * 0.3, hem], [wx + 1, wy + 3, wx + 1.5 + fs * 0.6, hem], [wx + 3.5, wy + 3, S.front - 3 + fs, hem - 1]]);
  if (T >= 1) h32Hem(A, S.id, 3, (x, r) => r === 1 ? '#2a1606' : r === 2 ? ((x % 3) ? (g.trim ? '#fff0a0' : '#d8a83a') : '#6a3a0e') : ((x % 3) === 1 ? '#a8741e' : '#12060a'));
  else h32Hem(A, S.id, 1, x => (x & 1) ? '#12060a' : null);
  // tier 1+: the apron of carved bone net over the skirt, plaques at its corners, bead tassels along its edge
  if (T >= 1) {
    const ab = wy + 13 + (J.walk ? 0 : 0), ax0 = wx - 3.5, ax1 = wx + 4.5 + Math.max(0, sw) * 1.2;
    const ap = A.poly([[ax0, wy + 1], [ax1 - 0.5, wy + 1], [ax1, ab], [ax0 - 0.5 + Math.min(0, sw) * 0.5, ab]], 'osMaroon', { band: 1 });
    A.fx(ap, osNet);
    for (const [x, y] of [[ax0 + 0.5, wy + 2], [ax1 - 1, wy + 2], [(ax0 + ax1) / 2, wy + 7]]) { A.ell(x, y, 1.3, 1.2, 'hBone', {}); A.px(x, y, '#2a1a10'); A.px(x - 0.5, y - 0.8, BN(4)); }
    for (let i = 0; i < 5; i++) { const x = ax0 + (ax1 - ax0) * i / 4, L = 2 + (i % 2); for (let j = 1; j <= L; j++) A.px(x + (J.walk ? -sw * j * 0.2 : 0), ab + j, j === L ? BN(4) : BN(2)); }
  }
  // torso: the saffron vest, and the maroon shawl across it from the far shoulder to the near hip
  const tv = A.poly([[shF[0] - 1, shF[1]], [nx - 1, ny + 1], [nx + 2, ny + 1], [shN[0] + 1, shN[1]], [cx + 5, cy + 1], [wx + 5, wy + 1], [wx - 5, wy + 1], [cx - 5.5, cy + 1]], 'osSaffron', { band: 1, tone: 1 });
  A.fx(tv, (x, y, e) => e.r <= 1 && y < cy + 2 ? (x % 2 ? '#fff0a0' : '#6a3a0e') : ((x * 3 + y * 5) % 7 === 0 ? 2 : null));   // brocade at the armhole, a woven figure
  const shw = A.poly([[shF[0] - 2, shF[1] - 1.5], [nx - 1, ny - 0.5], [nx + 0.5, ny + 1.5], [cx - 2, cy + 3], [cx - 1, wy + 1.5], [wx - 5.5, wy + 1.5], [cx - 5.5, cy + 2], [shF[0] - 2.5, shF[1] + 3]], 'osMaroon', { band: 2 });
  h32Folds(A, shw, [[nx - 2, ny + 2, cx - 2.5, wy, 0], [shF[0], shF[1] + 2, cx - 4, wy]]);
  A.line(nx + 0.5, ny + 1.5, cx - 2, cy + 3, X('osMaroon', 4)); A.line(cx - 2, cy + 3, cx - 1, wy + 1, X('osMaroon', 4));   // the shawl's lit rolled edge
  if (g.trim) A.line(cx - 1.5, cy + 3.5, cx - 0.5, wy + 1, '#d8a83a');
  if (T === 2) {   // the rib cuirass over it all: a sternum and five curved ribs
    const rc = A.poly([[cx - 4.5, ny + 3], [cx + 4.5, ny + 3], [cx + 5, wy - 1], [cx - 4.5, wy - 1]], '#1a1418', { flat: true });
    for (let i = 0; i < 5; i++) {
      const y = ny + 4 + i * 2.1, w = 4.5 - Math.abs(i - 1.5) * 0.4;
      A.line(cx + 1, y, cx + 1 + w, y + 1.2, BN(i < 2 ? 4 : 3)); A.line(cx, y, cx - w + 0.5, y + 1.2, BN(2));
      A.px(cx + 1 + w, y + 1.2, BN(1)); A.px(cx + 2, y + 1, '#0c0806');
    }
    A.line(cx + 0.5, ny + 3, cx + 0.5, wy - 1, BN(4)); A.line(cx + 1.5, ny + 4, cx + 1.5, wy - 2, BN(2));
    if (g.trim) { A.px(cx + 0.5, ny + 4, '#fff0a0'); A.px(cx + 0.5, cy + 2, '#d8a83a'); }
  }
  // the sash: saffron, knotted at the near hip, its ends hanging
  const sa = A.poly([[wx - 5.5, wy - 0.5], [wx + 5.5, wy - 0.5], [wx + 5.5, wy + 1.5], [wx - 5.5, wy + 1.5]], 'osSaffron', {});
  A.fx(sa, (x, y, e) => e.t === 1 ? 3 : ((x & 1) && e.b === 1 ? 1 : null));
  { const kx = wx + 4, s = J.walk ? -sw * 0.8 : 0; A.ell(kx, wy + 0.5, 1.2, 1.1, 'osSaffron', {}); A.limb([[kx, wy + 1.5], [kx + 0.5 + s, wy + 6]], 0.7, 0.6, 'osSaffron', {}); A.px(kx + 0.5 + s, wy + 6.5, '#d8a83a'); A.px(kx + s * 0.5, wy + 4, '#6a3a0e'); }
  // the thighbone trumpet thrust through the sash
  K.kangling([wx - 6, wy - 3], [wx - 2.5, wy + 5.5], -1);
  // the head: shaved, heavy-browed, painted as a skull
  const ex = hx + 2, ey = hy - 1;
  A.limb([[nx, ny], [hx - 0.5, hy + 3]], 1.7, 1.6, SK, { tone: -1 });
  A.poly([[hx - 3.5, hy - 1], [hx - 3, hy - 4], [hx - 0.5, hy - 5.5], [hx + 2.5, hy - 5], [hx + 4, hy - 3], [hx + 4.2, hy - 1], [hx + 5, hy + 0.5], [hx + 4.2, hy + 1.5], [hx + 4.2, hy + 3.5], [hx + 2.5, hy + 5], [hx - 0.5, hy + 4.5], [hx - 3.5, hy + 1.5]], SK, {});
  if (g.head !== 'mask' && g.head !== 'hood') {
    A.px(hx - 2, hy - 3, sk(1)); A.px(hx - 3, hy - 1, sk(1)); A.px(hx - 1, hy - 4.5, sk(4)); A.px(hx, hy - 5, sk(3));
    A.px(hx - 1.5, hy + 0.5, sk(3)); A.px(hx - 1.5, hy + 1.5, sk(1)); A.px(hx - 1, hy + 2.5, '#1a1210');   // the ear
    // the painted skull: white over the face, black sockets and nose, teeth drawn across the lips
    A.poly([[hx - 2, hy - 3], [hx + 0.5, hy - 4.5], [hx + 3, hy - 4], [hx + 4.2, hy - 2.5], [hx + 4.7, hy + 0.5], [hx + 4.2, hy + 3.5], [hx + 2.5, hy + 5], [hx - 0.5, hy + 4.5], [hx - 2.5, hy + 2]], 'hBone', { hi: false, contour: false });
    A.px(hx - 1, hy - 2, BN(2)); A.px(hx - 1.5, hy + 0.5, BN(1)); A.px(hx - 1, hy + 3, BN(2));   // the paint thinning at the cheekbone
    for (const [x, y] of [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [0, 1], [1, 1], [3, 0], [3, 1], [3, -1]]) A.px(ex + x, ey + y, '#0c0806');
    A.px(ex, ey, ZS_CANDLE[2]); A.px(ex + 3, ey, ZS_CANDLE[1]);
    A.px(hx + 4, hy + 1, '#0c0806'); A.px(hx + 3.8, hy + 1.8, '#0c0806');
    for (let i = 0; i < 3; i++) A.px(hx + 2 + i, hy + 3, '#1a1210');
    A.px(hx + 2, hy + 2, BN(4)); A.px(hx + 3, hy + 4, '#1a1210'); A.px(hx + 2.5, hy + 3.5, BN(4)); A.px(hx + 3.5, hy + 3.5, BN(3));
    A.px(hx + 4, hy - 3, sk(1));
    if (T >= 1) K.crown(hx, hy, false);
    else { A.line(hx - 3.5, hy - 3, hx + 3, hy - 3.5, '#6a3a0e'); A.px(hx - 1, hy - 3.2, OS_TURQ[2]); A.px(hx + 1.5, hy - 3.5, BN(4)); A.px(hx - 3, hy - 3, OS_CORAL); }   // a cord band, a turquoise and a bone bead
  }
  if (g.head === 'mask') {
    // a skull mask of real bone lashed over the face, a crown of little skulls above it
    const mk = A.poly([[hx - 3.5, hy - 1], [hx - 3, hy - 4.5], [hx - 0.5, hy - 6], [hx + 3.5, hy - 5], [hx + 5.5, hy - 2], [hx + 5.8, hy + 1], [hx + 5, hy + 2.5], [hx + 5, hy + 5], [hx + 2, hy + 5.8], [hx - 1, hy + 5], [hx - 3.5, hy + 2]], 'hBone', { band: 2 });
    A.fx(mk, (x, y, e) => e.k >= 2 && (x * 2 + y) % 7 === 0 ? 1 : null);
    A.px(ex, ey, '#0c0806'); A.px(ex + 1, ey, '#0c0806'); A.px(ex, ey + 1, '#0c0806'); A.px(ex + 1, ey + 1, '#0c0806'); A.px(ex + 3, ey, '#0c0806'); A.px(ex + 3, ey + 1, '#0c0806');
    A.px(ex, ey + 1, ZS_CANDLE[2]); A.px(ex + 3, ey + 1, ZS_CANDLE[1]);
    A.px(hx + 4, hy + 1.5, '#0c0806'); A.line(hx + 1.5, hy + 3, hx + 4.8, hy + 3, '#2a1a10');
    for (let i = 0; i < 3; i++) A.px(hx + 2 + i, hy + 4, BN(i % 2 ? 2 : 4));
    A.px(hx + 1, hy - 3, BN(4)); A.px(hx + 3, hy - 2, BN(1));
    A.line(hx - 3, hy - 1, hx + 0.5, hy - 1, '#1a1210');
    K.crown(hx, hy - 1, false);
  }
  if (g.head === 'hood') {
    // a maroon cowl with a rim of bone beads and a brocade edge; the painted skull grins out of the dark
    const hd = A.poly([[shF[0], ny + 3], [hx - 5, hy + 3], [hx - 5, hy - 3], [hx - 2, hy - 6.5], [hx + 2, hy - 6.5], [hx + 5.5, hy - 3], [hx + 6, hy + 4], [hx + 3.5, hy + 6.5], [shN[0], shN[1] + 1]], 'osMaroon', { band: 2 });
    h32Folds(A, hd, [[hx - 2, hy - 5, hx - 3.5, hy + 3], [hx - 4, hy - 1, hx - 4.5, hy + 3]]);
    A.poly([[hx + 1, hy - 4], [hx + 5.5, hy - 3], [hx + 5.5, hy + 4], [hx + 3, hy + 5.8], [hx + 0.8, hy + 4.5]], '#060406', { flat: true, contour: false });
    for (let i = 0; i < 6; i++) A.px(hx + 1 + (i < 3 ? i * 1.4 : 4.6), hy - 4.5 + (i < 3 ? i * 0.4 : (i - 2) * 2.4), i % 2 ? BN(2) : BN(4));
    for (let i = 0; i < 4; i++) A.px(hx - 4, hy - 2 + i * 1.6, i % 2 ? '#6a3a0e' : '#d8a83a');
    A.px(ex + 1, ey + 1, ZS_CANDLE[2]); A.px(ex + 3, ey + 1, ZS_CANDLE[1]);
    for (let i = 0; i < 3; i++) A.px(hx + 2 + i, hy + 3, i % 2 ? '#6a6250' : '#d8ceb0');
    if (g.trim) { A.px(hx - 2, hy - 7, '#d8a83a'); A.px(hx + 5, hy - 3, '#fff0a0'); }
  }
  // tier 1: the bone collar - a yoke of net over the shoulders, rosettes at the shoulder and the breast
  if (T === 1) {
    const cl = A.poly([[shF[0] - 1, shF[1] - 0.5], [nx - 1, ny - 0.5], [nx + 2.5, ny], [shN[0], shN[1] - 0.5], [shN[0] - 1, shN[1] + 2.5], [nx + 2, ny + 5], [nx - 1, ny + 5], [shF[0] + 1, shF[1] + 3]], 'osMaroon', { band: 1 });
    A.fx(cl, osNet);
    for (const [x, y] of [[shF[0] + 1, shF[1] + 1], [nx + 0.5, ny + 5]]) { A.ell(x, y, 1.4, 1.3, 'hBone', {}); A.px(x, y, OS_TURQ[1]); A.px(x - 0.5, y - 1, BN(4)); }
  }
  // the mala, and the silver ga'u hung on its own cord at the breast
  K.mala(nx - 2, ny + 1, nx + 4, ny + 1.5, T === 2 ? 5 : 8, 0);
  if (T >= 1) { A.line(nx - 0.5, ny + 1.5, nx + 1.5, ny + 5, '#2a1a10'); K.gau(nx + 2, ny + 6.5); }
  // near arm: bare to the shoulder - a bone armlet, a wrist-mala; at tier 2 a maroon sleeve and a bone vambrace
  const armM = T === 2 ? 'osMaroon' : SK;
  A.limb([shN, J.elN], 2.2, 1.8, armM, { contourAll: true });
  A.limb([J.elN, J.haN], 1.9, 1.5, armM, {});
  if (T < 2) {
    const a = zlerp32(shN, J.elN, 0.45); A.px(a[0] - 1, a[1], BN(4)); A.px(a[0], a[1], BN(2)); A.px(a[0] + 1, a[1], BN(1)); A.px(a[0] - 1, a[1] - 1, sk(4));   // armlet
    const m = zlerp32(J.elN, J.haN, 0.4); A.px(m[0] - 0.5, m[1] - 1, sk(4)); A.px(m[0] + 0.5, m[1] + 1, sk(1));
  } else { const a = zlerp32(J.elN, J.haN, 0.3), b = zlerp32(J.elN, J.haN, 0.85); A.limb([a, b], 1.6, 1.5, 'hBone', {}); A.px(a[0], a[1], BN(1)); A.px(b[0] - 1, b[1] - 1, BN(4)); A.px((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, '#1a1210'); }
  { const m = zlerp32(J.elN, J.haN, 0.9); A.px(m[0], m[1] - 1, BN(4)); A.px(m[0] + 1, m[1] - 0.5, BN(2)); A.px(m[0] - 1, m[1] - 0.5, OS_TURQ[2]); }
  if (T === 2) {   // a shoulder blade for a pauldron
    const pd = A.poly([[shN[0] - 3, shN[1] - 1.5], [shN[0] + 1, shN[1] - 2.5], [shN[0] + 3.5, shN[1] + 0.5], [shN[0] + 2, shN[1] + 4], [shN[0] - 2, shN[1] + 2]], 'hBone', {});
    A.line(shN[0] - 1, shN[1] - 0.5, shN[0] + 2, shN[1] + 2, BN(1)); A.px(shN[0] - 1.5, shN[1] - 1.5, BN(4)); A.px(shN[0] + 1, shN[1] + 2.5, OS_TURQ[1]);
    if (g.trim) A.px(shN[0] + 3, shN[1] + 1, '#d8a83a');
  }
  weapon32(A, g, J);
  A.ell(J.haN[0], J.haN[1] + 1.2, 1.4, 1.4, SK, {});
  A.px(J.haN[0] - 0.5, J.haN[1] + 0.5, sk(4)); A.px(J.haN[0] + 1, J.haN[1] + 2, sk(0));
  if (J.cast) zsCandle(A, J);
};

// ------------------------------------------------------------------------------------------------ the Miasmancer
// paper shide: a zig-zag of white paper hanging from (x, y), flicking with the wind
function zsShide(A, x, y, fl, far) {
  const W = far ? '#a09c9e' : '#eee8da', S = far ? '#5e5a66' : '#a09c9e';
  const P = [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2], [0, 3], [1, 3], [0, 4], [0, 5], [1, 5], [1, 6], [1, 7], [2, 7]];
  for (const [px, py] of P) A.px(x + px + fl * py * 0.25, y + py, px === 2 ? S : W);
  A.px(x + 2 + fl * 0.75, y + 3, S); A.px(x + 1 + fl * 1.25, y + 4, S);
}
H32.miasmancer = function (A, J0, g) {
  const T = g.tier, ph = J0.ph, sw = J0.walk ? J0.sw : 0, hex = zsHex;
  // lighter on the feet: pitched forward into the walk, crouched into the strike
  const J = Object.assign({}, J0), pitch = J0.walk ? 1 : J0.atk && ph >= 2 ? 1 : 0;
  for (const k of ['head', 'neck', 'chest', 'shN', 'shF']) J[k] = [J0[k][0] + pitch, J0[k][1] + (J0.atk && ph >= 2 ? 1 : 0)];
  if (J.back) return zsMiasBack(A, J, g);
  const [hx, hy] = J.head, [nx, ny] = J.neck, [cx, cy] = J.chest, [wx, wy] = J.waist;
  const shF = [J.shF[0] + 1, J.shF[1]], shN = [J.shN[0] - 0.5, J.shN[1]];
  const top = T === 2 ? 'zsLacq' : 'msKosode', haka = T === 0 ? 'msAsagi' : 'zsVerm';
  const wv = J.walk ? ph / 8 * Math.PI * 2 : ph / 4 * Math.PI * 2, fl = J.walk ? -1.2 - sw * 0.5 : J.cast ? -1 : J.atk ? -0.6 : Math.sin(wv) * 0.4;
  // the ponytail, bound in white paper, streaming back
  if (g.head !== 'hood') {
    const t0 = [hx - 3, hy - 3], t1 = [hx - 6 + fl * 2, hy + 1 - fl], t2 = [hx - 8 + fl * 3.5, hy + 7 - fl * 2.2 + Math.sin(wv) * 0.6];
    A.limb([t0, t1, t2], 1.5, 0.7, 'hHair', {});
    A.px(t0[0] - 1, t0[1] + 0.5, '#f6f2e8'); A.px(t0[0] - 1.5, t0[1] + 1.5, '#aaa8ac');
  }
  // tier 1: the far trailing sleeve, behind the body
  const sleeve = (sh, el, far) => {
    const tr = J.walk ? -2 - Math.abs(sw) * 1.2 : J.cast || J.atk ? -2.5 : -0.8, t = far ? -1 : 0;
    const pts = [[sh[0] - 2, sh[1] - 1], [sh[0] + 2, sh[1] - 0.5], [el[0] + 2, el[1] + 1], [el[0] + 1 + tr, el[1] + 8], [el[0] - 2.5 + tr, el[1] + 8.5], [sh[0] - 3 + tr * 0.4, sh[1] + 5]];
    A.poly(pts, 'msKosode', { tone: t, band: 2 });
    if (!far) { A.line(el[0] + 1.5, el[1] + 1.5, el[0] + 1 + tr, el[1] + 7.5, hex('zsVerm', 3)); A.line(el[0] + 1 + tr, el[1] + 8, el[0] - 2.5 + tr, el[1] + 8.5, hex('zsVerm', 2)); }
    if (g.trim) A.px(el[0] + 0.5 + tr, el[1] + 8, '#d8a83a');
  };
  if (T === 1) sleeve(shF, J.elF, true);
  // far arm
  A.limb([shF, J.elF], 1.5, 1.3, top, { tone: -1, contour: false });
  A.limb([J.elF, J.haF], 1.2, 1.0, T === 2 ? 'zsLacq' : 'zsWhite', { tone: -1 });
  A.ell(J.haF[0], J.haF[1] + 1, 1.1, 1.2, 'zsSkinM', { tone: -1 });
  msFanPose(A, J, g, J.haF, -1, false);
  // the gourd on the far hip, seeping rot
  {
    const gx = wx - 5, gy = wy + 3 + (J.walk ? Math.round(sw * 0.5) : 0);
    A.ell(gx, gy + 3, 2.2, 2.4, 'zsStraw', { tone: -1 }); A.ell(gx + 0.3, gy, 1.4, 1.5, 'zsStraw', { tone: -1 });
    A.px(gx + 0.5, gy - 2, '#3a2a16'); A.px(gx, gy + 1.5, hex('zsVerm', 2)); A.px(gx + 1, gy + 1.5, hex('zsVerm', 2));
    const m = ph % 4;
    A.px(gx + 0.5, gy - 3 - m % 2, ZS_MIAS[4]); A.px(gx - 0.5 - (m > 1 ? 1 : 0), gy - 5 - m % 2, ZS_MIAS[2]); A.px(gx - 1 - m * 0.5, gy - 7, ZS_MIAS[1]);
    A.px(gx + 1, gy + 5.5 + m % 2, ZS_MIAS[3]);
  }
  // legs: bandaged shins, straw sandals with white tabi
  for (const far of [true, false]) {
    const [ax, ay] = zsLeg(A, J, far, 'zsWhite', 'zsWhite', { r0: 1.1, r1: 1.0 });
    A.line(ax - 1.5, ay + 2, ax + 3.5, ay + 2, hex('zsStraw', far ? 1 : 2));
    A.px(ax + 1, ay, hex('zsStraw', 1));
    for (let y = ay - 5; y < ay - 1; y += 2) A.px(ax - 1, y, hex('zsWhite', far ? 0 : 1));
  }
  // hakama: wide pleated trouser-skirts, split between the legs, pleats swinging
  for (const far of [true, false]) {
    const k = J[far ? 'kneeF' : 'kneeN'], a = J[far ? 'ankF' : 'ankN'], t = far ? -1 : 0, hb = 41 - (J.walk ? Math.max(0, (far ? -1 : 1) * Math.cos(wv)) : 0);
    const bx = a[0] + (k[0] - a[0]) * 0.3;
    const hk = A.poly([[wx - 4 + (far ? 0 : 3), wy], [wx + 1 + (far ? 0 : 3), wy], [k[0] + 2.5, k[1]], [bx + 3.5, hb], [bx - 3.5, hb + 0.5], [k[0] - 3, k[1]]], haka, { tone: t, band: 2 });
    h32Folds(A, hk, [[wx - 2.5 + (far ? 0 : 3), wy + 2, bx - 1.8, hb - 1], [wx + 0 + (far ? 0 : 3), wy + 2, bx + 1.2, hb - 1]]);
    h32Hem(A, hk, 1, x => x & 1 ? hex(haka, 0) : null);
    if (g.trim) A.line(bx - 3, hb, bx + 3, hb - 0.5, '#a8741e');
  }
  // tier 2: kusazuri, skirts of lacquered lamellae over the hakama
  if (T === 2) {
    for (let i = 0; i < 3; i++) {
      const x = wx - 4 + i * 3.3 + (i === 2 ? Math.max(0, sw) : 0), t = i === 0 ? -1 : 0;
      A.poly([[x - 1.8, wy + 1], [x + 1.8, wy + 1], [x + 2 + i * 0.3, wy + 9], [x - 1.6 + i * 0.3, wy + 9]], 'zsLacq', { tone: t });
      for (let r = 0; r < 3; r++) A.line(x - 1.4 + r * 0.1, wy + 3 + r * 2.4, x + 1.6 + r * 0.1, wy + 3 + r * 2.4, hex('zsLacq', 0));
      A.px(x - 1 + i * 0.3, wy + 4, hex('zsLacq', 4)); A.px(x + 1 + i * 0.3, wy + 8.5, g.trim ? '#d8a83a' : '#8a3020');
    }
  }
  // torso: slim; a white kosode with crossed collar (T0/T1), black lacquered lamellar (T2)
  const kt = A.poly([[shF[0] - 1, shF[1]], [nx - 1, ny + 1], [nx + 2, ny + 1], [shN[0] + 1, shN[1]], [cx + 3.5, cy + 1], [wx + 3.5, wy + 1], [wx - 3.5, wy + 1], [cx - 4, cy + 1]], top, { band: 2, spec: T === 2 ? 0.12 : 0 });
  if (T < 2) h32Folds(A, kt, [[cx - 2, cy, cx - 2.5, wy], [cx + 2.5, cy + 2, cx + 2, wy]]);
  if (T < 2) {
    A.poly([[nx + 0.5, ny + 1], [nx + 3, ny + 1], [cx + 1, cy + 3], [cx - 0.5, cy + 3]], 'zsSkinM', {});
    A.line(nx - 1, ny + 1.5, cx + 1.5, cy + 4, hex(T === 1 ? 'zsVerm' : 'zsWhite', T === 1 ? 2 : 1));
    A.line(nx + 3, ny + 1.5, cx + 1.5, cy + 3, hex('msKosode', 4)); A.line(nx + 2, ny + 1.5, cx + 0.5, cy + 3, T === 1 ? '#c43a22' : hex('msKosode', 1));
    if (T === 0) { A.px(cx - 2, cy + 3, hex('zsWhite', 1)); A.px(cx - 1, cy + 4, hex('zsWhite', 1)); A.px(cx + 2, wy - 2, '#8a8680'); }   // a darned tear
    if (g.trim) A.line(nx + 3, ny + 1, cx + 1.5, cy + 3.5, '#d8a83a');
  } else {
    for (let r = 0; r < 4; r++) {
      const y = cy - 2 + r * 2.4; A.line(cx - 3.5, y, cx + 3.5, y - 0.3, hex('zsLacq', 0)); A.line(cx - 2.5, y + 1, cx + 0.5, y + 0.8, hex('zsLacq', 3));
      A.px(cx + 2.5, y + 1, '#8a3020');
    }
    A.line(cx - 3.5, wy - 1, cx + 3.5, wy - 1.3, '#8a3020');
    A.px(cx + 2, cy - 3, '#f0d8d0'); A.px(cx + 3, cy - 1, hex('zsLacq', 4));   // a hard lacquer gleam
    A.poly([[nx - 1.5, ny], [nx + 3.5, ny], [nx + 3.5, ny + 2], [nx - 1.5, ny + 2]], 'zsLacq', {});   // the collar
    if (g.trim) { A.line(nx - 1, ny + 2, nx + 3.5, ny + 2, '#d8a83a'); A.px(cx + 1, wy - 1, '#fff0a0'); }
  }
  // the shimenawa: a thick twisted straw rope, knotted, with paper shide hanging off it
  A.fx(A.poly([[wx - 4.5, wy - 1.5], [wx + 4.5, wy - 1.5], [wx + 4.5, wy + 1.8], [wx - 4.5, wy + 1.8]], 'zsStraw', {}), (x, y) => { const q = ((x - y) % 3 + 3) % 3; return q === 0 ? 4 : q === 1 ? 2 : 0; });
  A.ell(wx + 4, wy + 0.5, 1.4, 1.4, 'zsStraw', {});
  zsShide(A, wx + 2, wy + 2, fl, false);
  msFanShut(A, [wx - 1, wy - 3], [wx + 1.5, wy + 3], 0);   // a second fan, shut, tucked through the rope
  // tier 2: the sode, a great square shoulder-plate of lacquered lamellae
  const sode = () => {
    const [sx, sy] = shN, dr = J.atk || J.cast ? 1 : 0;
    A.poly([[sx - 3, sy - 1.5], [sx + 2.5, sy - 2], [sx + 3.5 + dr, sy + 6], [sx - 2 + dr, sy + 6.5]], 'zsLacq', { band: 2 });
    for (let r = 0; r < 3; r++) A.line(sx - 2.4 + dr * r * 0.3, sy + 0.5 + r * 2, sx + 2.8 + dr * r * 0.3, sy + 0.3 + r * 2, r === 2 ? '#8a3020' : hex('zsLacq', 0));
    A.px(sx - 1, sy - 1, hex('zsLacq', 4)); A.px(sx + 3 + dr, sy + 6, g.trim ? '#d8a83a' : '#a8482e');
  };
  // the head: fine-boned, black hair pulled back, a sickly green glint in the eye
  const sk = PMAT.zsSkinM, sh = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  A.limb([[nx, ny], [hx - 0.5, hy + 3]], 1.2, 1.2, 'zsSkinM', { tone: -1 });
  A.poly([[hx - 3, hy - 1], [hx - 2.5, hy - 4.2], [hx + 1, hy - 4.8], [hx + 3.3, hy - 3.3], [hx + 3.8, hy - 0.5], [hx + 4.6, hy + 0.6], [hx + 3.8, hy + 1.5], [hx + 3.4, hy + 3], [hx + 2, hy + 4.6], [hx - 0.5, hy + 4.2], [hx - 3, hy + 1.5]], 'zsSkinM', {});
  if (g.head !== 'hood') {
    A.poly([[hx + 3, hy - 5], [hx - 2, hy - 5.6], [hx - 4.2, hy - 3], [hx - 4, hy + 2], [hx - 2.2, hy + 3], [hx - 1.5, hy + 0.5], [hx - 0.5, hy - 2.5], [hx + 1.5, hy - 3.5], [hx + 3.6, hy - 3]], 'hHair', {});
    A.px(hx - 1, hy - 5, '#5c4a56'); A.px(hx + 1, hy - 5, '#443640');
  }
  const eyes = () => {
    A.px(hx + 1, hy - 2, sh(sk[1])); A.px(hx + 2, hy - 2, '#140a0a'); A.px(hx + 3, hy - 2, '#140a0a');
    A.px(hx + 2, hy - 1, ZS_MIAS[4]); A.px(hx + 3, hy - 1, '#140a0a'); A.px(hx + 1, hy - 1, sh(sk[1]));
    A.px(hx + 4, hy + 0.5, sh(sk[3])); A.px(hx + 2, hy + 3, sh(sk[0])); A.px(hx + 3, hy + 3, sh(sk[1]));
    // a vermilion stroke of purification under the eye
    A.px(hx + 2, hy, '#a8482e'); A.px(hx + 3, hy + 1, '#8a3020');
  };
  if (g.head === 'mask' && T < 2) {
    // a white fox half-mask: pointed ear, long snout over the nose, vermilion flame marks
    A.poly([[hx - 1.5, hy - 3.5], [hx - 0.5, hy - 8], [hx + 1.5, hy - 5], [hx + 2.5, hy - 5], [hx + 4.5, hy - 7.5], [hx + 4.5, hy - 3], [hx + 5.5, hy - 1], [hx + 7, hy + 0.5], [hx + 5, hy + 1.5], [hx + 4.4, hy + 3.5], [hx + 2.5, hy + 5.2], [hx - 0.5, hy + 4.8], [hx - 2.5, hy + 2]], 'zsWhite', { band: 2 });
    A.px(hx, hy - 6, '#a8482e'); A.px(hx + 4, hy - 6, '#a8482e'); A.px(hx, hy - 5, '#8a3020'); A.px(hx + 2, hy - 1.5, '#0c0608'); A.px(hx + 3, hy - 1.5, '#0c0608'); A.px(hx + 2, hy - 1.5, ZS_MIAS[4]);
    A.line(hx + 1.5, hy - 3, hx + 4, hy - 2.5, '#a8482e'); A.px(hx + 4, hy - 0.5, '#c66a48'); A.px(hx + 7, hy + 1, '#140a0a');
    A.line(hx + 2, hy + 3, hx + 4, hy + 3, '#a8482e'); A.px(hx + 1, hy + 1, hex('zsWhite', 1)); A.px(hx + 3.5, hy + 4.5, hex('zsWhite', 1));   // the mouth, its grin
    if (g.trim) { A.px(hx + 1, hy - 3, '#d8a83a'); A.px(hx + 5, hy, '#d8a83a'); }
  } else if (g.head === 'mask') {
    // tier 2: a red oni mask: ivory horns, gold eyes, bared fangs
    A.poly([[hx - 2, hy - 4.5], [hx + 3.5, hy - 4.5], [hx + 5.5, hy - 2], [hx + 5.5, hy + 1.5], [hx + 5, hy + 4.5], [hx + 2, hy + 5.5], [hx - 1, hy + 5], [hx - 3, hy + 2], [hx - 3, hy - 1]], 'zsVerm', { band: 2 });
    A.limb([[hx + 1, hy - 4], [hx + 0.5, hy - 6], [hx - 0.5, hy - 7]], 1, 0.4, 'hBone', {}); A.limb([[hx + 4, hy - 4], [hx + 4.5, hy - 6], [hx + 5.5, hy - 7]], 0.9, 0.4, 'hBone', {});
    A.line(hx + 1.5, hy - 2.5, hx + 4.5, hy - 2, '#260a08');
    A.px(hx + 2, hy - 1.5, '#ffd24a'); A.px(hx + 4, hy - 1.5, '#ffd24a'); A.px(hx + 3, hy - 1.5, '#260a08');
    A.px(hx + 5.5, hy + 0.5, '#c66a48'); A.line(hx + 2, hy + 3, hx + 5, hy + 3, '#140404');
    A.px(hx + 2.5, hy + 2, '#f6f2e8'); A.px(hx + 4.5, hy + 2, '#f6f2e8'); A.px(hx + 3.5, hy + 4, '#f6f2e8');
    if (g.trim) { A.px(hx + 0.5, hy - 6, '#d8a83a'); A.px(hx + 5, hy - 6, '#d8a83a'); }
  } else if (g.head !== 'hood') eyes();
  if (g.head === 'hood') {
    // a wide kasa of plaited straw (black-lacquered at tier 2), the eyes lost in its shade
    const hm = T === 2 ? 'zsLacq' : 'zsStraw', tl = J.walk ? 0.5 : 0;
    A.poly([[hx - 5, hy + 2], [hx - 4, hy - 3], [hx + 3, hy - 3.5], [hx + 4.5, hy + 1]], 'hHair', {});
    A.poly([[hx - 9.5, hy + 1.5 + tl], [hx - 3, hy - 5], [hx - 0.5, hy - 7], [hx + 1.5, hy - 7], [hx + 4, hy - 5], [hx + 10.5, hy + 2.5 - tl], [hx + 9.5, hy + 3.2 - tl], [hx - 9, hy + 2.5]], hm, { band: 2 });
    for (let i = -3; i <= 3; i++) A.line(hx + 0.5 + i * 0.4, hy - 6, hx + 0.5 + i * 2.8, hy + 2 - (i > 0 ? tl : 0), hex(hm, i < 0 ? 1 : 2));
    for (let i = 0; i < 6; i++) A.px(hx - 8 + i * 3.4, hy + 3 - (i % 2) + (i > 2 ? -tl : 0), hex(hm, 0));   // frayed brim
    A.line(hx - 9, hy + 2, hx + 10, hy + 2.8 - tl, T === 2 ? '#8a3020' : hex(hm, 1));
    // the face lost in its shade, one sick-green eye; an ofuda talisman hangs from the brim over it
    A.poly([[hx - 3.5, hy - 1], [hx - 2.5, hy - 3], [hx + 2, hy - 3.5], [hx + 4, hy - 2], [hx + 5, hy + 0.6], [hx + 3.8, hy + 3.5], [hx + 2, hy + 5], [hx - 0.5, hy + 4.6], [hx - 3.5, hy + 2]], '#140a0a', { flat: true, contour: false });
    A.px(hx + 2, hy - 0.5, ZS_MIAS[4]); A.px(hx + 3, hy - 0.5, '#2a1a1a'); A.px(hx + 4, hy + 0.5, '#2a1a1a'); A.px(hx + 2.5, hy + 3, '#2a1a1a');
    const ox = hx + 6 + (J.walk ? -1 : 0) + (J.cast ? -1 : 0);
    A.poly([[ox - 1, hy + 2], [ox + 1, hy + 2], [ox + 1, hy + 8], [ox - 1, hy + 8.5]], '#e8e0cc', { flat: true });
    A.px(ox, hy + 3, '#a8482e'); A.px(ox, hy + 5, '#8a3020'); A.px(ox - 1, hy + 6, '#8a3020'); A.px(ox, hy + 7, '#a8482e');
    if (g.trim) { A.px(hx + 0.5, hy - 7, '#fff0a0'); A.px(hx + 10, hy + 2.5, '#d8a83a'); A.px(hx - 9, hy + 2, '#d8a83a'); }
  }
  // near arm: sleeve or armour; the claw hand, bound at the wrist
  if (T === 1) sleeve(shN, J.elN, false);
  A.limb([shN, J.elN], 1.7, 1.4, top, { contourAll: true });
  A.limb([J.elN, J.haN], 1.4, 1.2, T === 2 ? 'zsLacq' : T === 1 ? 'zsWhite' : 'zsSkinM', {});
  if (T === 2) { A.px(J.elN[0] + (J.haN[0] - J.elN[0]) * 0.5, J.elN[1] + (J.haN[1] - J.elN[1]) * 0.5 - 1, hex('zsLacq', 4)); sode(); }
  { const m = zsLerp(J.elN, J.haN, 0.8); A.px(m[0], m[1], '#f6f2e8'); A.px(m[0] - 1, m[1] + 0.5, '#aaa8ac'); }
  weapon32(A, g, J);
  A.ell(J.haN[0], J.haN[1] + 1.1, 1.2, 1.3, 'zsSkinM', {});
  if (J.cast) zsRot(A, J);
};

})();
