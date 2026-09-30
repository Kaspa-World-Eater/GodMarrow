// =================================================================== v0.24: the minions in 32-bit pixel art
// Every player minion and summoned object is repainted with the native pixel painter (Pix, zo_pix.js) at the scale
// of the 32-bit heroes (the hero stands 48 px): the Ossurarch's raised dead, the Colossus, the Bone Host and its
// bone spells; the Animancer's mirror-iron golem, its shield, wisps, the great wisp, echoes, mirror-steles, the
// mirror slab and the soul lantern; the Hemomancer's brood, flesh golem, heap, ooze, sacs and nests; the Assassin's
// mirror-sister, decoys and traps; and the class lamps. Frames are painted once, cached, flipped, and drawn in place
// of the old sprites through overrides of the old (global) draw functions, so the game logic is untouched.
// Tag: mn (every top-level name here starts with MN / mn).

// ------------------------------------------------------------------- materials (5 tones: deep, shadow, base, light, highlight)
pmat('mnBone', ['#221e16', '#5a5242', '#948870', '#c8bc9c', '#eee6cc']);
pmat('mnBoneD', ['#16120c', '#3a3428', '#625846', '#8a7e66', '#aea28a']);
pmat('mnIron', ['#0c0c10', '#22242c', '#3e424c', '#6a707c', '#aab0bc']);
pmat('mnRust', ['#100806', '#2c160e', '#4c2a18', '#74442a', '#9a6a44']);
pmat('mnWood', ['#0e0806', '#2a1a0e', '#4a3018', '#6a4a26', '#8a6634']);
pmat('mnLea', ['#0e0806', '#241610', '#3c2618', '#583a24', '#785236']);
pmat('mnRag', ['#08070a', '#16131a', '#26212a', '#3a323e', '#524656']);
pmat('mnCowl', ['#0a0610', '#1c1428', '#302440', '#4a3a5e', '#6a5680']);
pmat('mnRed', ['#140408', '#360a10', '#5c141a', '#862226', '#aa3a30']);
pmat('mnGold', ['#2a1a06', '#6a4410', '#a8741e', '#d8a83a', '#fff0a0']);
// polished mirror-iron: a steep, cold ramp that throws hard white glints
pmat('mnMir', ['#07090e', '#27303f', '#5a6a84', '#b4c6dc', '#ffffff']);
pmat('mnMirD', ['#05070b', '#141a24', '#2e3a4c', '#5e6e86', '#aebed4']);
pmat('mnGlass', ['#0c1420', '#24364c', '#4a6a8a', '#8eb4d4', '#e8f6ff']);
// flesh and blood
pmat('mnFlesh', ['#180508', '#461216', '#7a2a2a', '#ac5a4e', '#dc9a86']);
pmat('mnMeat', ['#1e0408', '#4a0a12', '#7e1820', '#b0302c', '#d8604a']);
pmat('mnGore', ['#14040a', '#4a0a14', '#86141e', '#c42a32', '#ff8a7a']);
pmat('mnSkin', ['#1c0e0c', '#4a2a24', '#8a5a4a', '#c08a70', '#e8c0a0']);
pmat('mnFat', ['#3a2a18', '#8a7050', '#c8b078', '#eedcaa', '#fff6d8']);
pmat('mnVein', ['#10040c', '#2e0a1a', '#541428', '#7e2438', '#a84050']);
pmat('mnChit', ['#0e0806', '#2a1c14', '#4a3428', '#6a5040', '#8a6a4a']);
// the assassin's brass, lacquer and rot
pmat('mnBrass', ['#1e1206', '#4a2c0e', '#7a4e1c', '#a8783a', '#d8b070']);
pmat('mnLacq', ['#0c0408', '#2a0a14', '#4a1220', '#6e1e2c', '#94343a']);
pmat('mnRot', ['#0a0610', '#221430', '#3e2456', '#643a86', '#9a64c0']);
pmat('mnBile', ['#0a1006', '#1e2c10', '#3a4e1c', '#62782c', '#9ab04a']);
pmat('mnPaper', ['#2a1a10', '#6a4a30', '#a88660', '#d8bc90', '#f6e6c4']);

const MNK = '#100810';                                  // the outline / darkest ink
const mnHex = (m, i) => { const c = PMAT[m][Math.max(0, Math.min(4, i))]; return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };
const mnLerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const mnDir = (p, a, d) => [p[0] + Math.cos(a) * d, p[1] + Math.sin(a) * d];

// ------------------------------------------------------------------- frames: painted once, flipped, whitened for hit flashes
const MN32 = { fr: {} };
window.__mn32 = { ev: s => eval(s) };   // for the sheet and screenshot tools
function mnBuild(c, W, H, ox, oy) {
  const f = mkCanvas(W, H), fx = f.getContext('2d'); fx.translate(W, 0); fx.scale(-1, 1); fx.drawImage(c, 0, 0);
  const wht = src => { const q = mkCanvas(W, H), qx = q.getContext('2d'); qx.drawImage(src, 0, 0); qx.globalCompositeOperation = 'source-in'; qx.fillStyle = '#fff'; qx.fillRect(0, 0, W, H); return q; };
  const d = c.getContext('2d').getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (d[(j * W + i) * 4 + 3]) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  if (x1 < x0) { x0 = ox; x1 = ox; y0 = oy; y1 = oy; }
  return { c, f, fl: wht(c), flf: wht(f), w: W, h: H, ox, oy, bb: { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 } };
}
// paint(A) draws facing right; (ox, oy) is where the feet stand in the frame
function mnFrame(key, W, H, ox, oy, paint, outline) {
  let fr = MN32.fr[key]; if (fr) return fr;
  const A = Pix(W, H, outline); paint(A);
  fr = mnBuild(A.render(), W, H, ox, oy); MN32.fr[key] = fr; return fr;
}
// draws a frame with its feet at screen (sx, sy) the way the old sprites stood (feet row at sy + 2); returns the painted rect
function mnBlit(fr, sx, sy, face, flash, alpha, K) {
  K = K || 1;
  const img = (flash && OPT.flash) ? (face < 0 ? fr.flf : fr.fl) : (face < 0 ? fr.f : fr.c);
  const X = Math.round(sx) - Math.round((face < 0 ? fr.w - fr.ox : fr.ox) * K), Y = Math.round(sy) + 3 - Math.round((fr.oy + 1) * K);
  if (alpha != null && alpha !== 1) ctx.globalAlpha = alpha;
  ctx.drawImage(img, X, Y, Math.round(fr.w * K), Math.round(fr.h * K));
  ctx.globalAlpha = 1;
  const bx = face < 0 ? fr.w - fr.bb.x - fr.bb.w : fr.bb.x;
  return { x: X + Math.round(bx * K), y: Y + Math.round(fr.bb.y * K), w: Math.max(1, Math.round(fr.bb.w * K)), h: Math.max(1, Math.round(fr.bb.h * K)) };
}
// the view a moving thing is seen from: its back while it walks up the screen, its front coming toward us
function mnView(o, mv) {
  if (mv > 0.004) { const v = (o.x + o.y) - (o._vx2 != null ? o._vx2 : o.x) - (o._vy2 != null ? o._vy2 : o.y); if (Math.abs(v) > mv * 0.25) o._fb = v < 0; }
  o._vx2 = o.x; o._vy2 = o.y;
  return o._fb ? 'back' : 'front';
}
// a spectral copy of a frame (echoes, reflections): its own light, tinted, cached on the frame
function mnGhost(fr, rgb, key) {
  const k = '_gh' + key; if (fr[k]) return fr[k];
  const mk = src => {
    const q = mkCanvas(fr.w, fr.h), x = q.getContext('2d'); x.drawImage(src, 0, 0);
    x.globalCompositeOperation = 'color'; x.fillStyle = `rgb(${rgb})`; x.fillRect(0, 0, fr.w, fr.h);
    x.globalCompositeOperation = 'screen'; x.fillStyle = `rgba(${rgb},0.35)`; x.fillRect(0, 0, fr.w, fr.h);
    x.globalCompositeOperation = 'destination-in'; x.drawImage(src, 0, 0);
    return q;
  };
  fr[k] = Object.assign({}, fr, { c: mk(fr.c), f: mk(fr.f) }); return fr[k];
}
// a flat strip of pixels as a part (so later parts still cover it, unlike A.px): columns x0..x1, rows y..y+h-1
function mnRow(A, x0, x1, y, col, h) { x0 = Math.round(x0); x1 = Math.round(x1); y = Math.round(y); A.poly([[x0, y], [x1 + 1, y], [x1 + 1, y + (h || 1)], [x0, y + (h || 1)]], col, { flat: true, contour: false }); }
// hand-placed helpers
function mnBladePx(A, from, ang, len, edge, body, dark, w) {
  const ca = Math.cos(ang), sa = Math.sin(ang);
  for (let i = 0; i <= len * 2; i++) {
    const d = i / 2, x = from[0] + ca * d, y = from[1] + sa * d, tip = d > len - 1.5;
    A.px(x, y, tip ? edge : body);
    if (w > 1 && !tip) A.px(x - sa, y + ca, dark);
    if (w > 2 && d < len - 2.5) A.px(x - sa * 2, y + ca * 2, dark);
    if (i % 2 === 0 && d > 1 && d < len - 1) A.px(x + sa * 0.7, y - ca * 0.7, edge);
  }
  return [from[0] + ca * len, from[1] + sa * len];
}

// =================================================================== OSSUMANCER: the raised dead
// A soldier of dry bone, 38 px tall: a cold light in the sockets, a ribcage you can see through, and its loadout
// (shield and blade, greatsword, halberd, flail, bow or a grave-mage's staff) painted into every pose.
const MN_EYE = '#9fe8ff', MN_EYE2 = '#e8fbff', MN_GAP = '#140f12';
function mnSkelRig(pose, ph) {
  const walk = pose === 'walk', idle = pose === 'idle', wind = pose === 'wind', atk = pose === 'atk';
  const a = walk ? ph / 8 * Math.PI * 2 : 0, sw = walk ? Math.sin(a) : 0;
  const bob = walk ? Math.round(-Math.abs(Math.cos(a)) * 1.2 + 0.6) : idle && (ph === 1 || ph === 2) ? 1 : 0;
  const lean = wind ? -1 : atk ? [1, 2, 2][ph] : 0;
  const J = { walk, idle, wind, atk, a, sw, bob, lean, ph };
  J.hip = [21 + lean * 0.5, 32 + bob]; J.ch = [22 + lean, 23 + bob]; J.shF = [18 + lean, 19 + bob]; J.shN = [25 + lean, 19 + bob]; J.head = [24 + lean, 12 + bob];
  if (walk) { J.ankN = [23 + sw * 4, 47 - Math.max(0, Math.cos(a)) * 2]; J.ankF = [19 - sw * 4, 47 - Math.max(0, -Math.cos(a)) * 2]; }
  else if (atk) { J.ankN = [27, 47]; J.ankF = [16, 47]; }
  else if (wind) { J.ankN = [25, 47]; J.ankF = [16, 47]; }
  else { J.ankN = [24, 47]; J.ankF = [18, 47]; }
  J.kN = [(J.hip[0] + J.ankN[0]) / 2 + 1.5, 40 + bob * 0.5]; J.kF = [(J.hip[0] + J.ankF[0]) / 2 + 1, 40 + bob * 0.5];
  // the weapon hand: hanging, raised back in the tell, then swept through
  const s = J.shN, asw = walk ? -sw * 2 : 0;
  if (wind) { J.haN = [s[0] - 3, s[1] - 6]; J.elN = [s[0] - 2, s[1] - 1]; J.ang = -2.2; }
  else if (atk) { J.haN = [[s[0] + 4, s[1] - 5], [s[0] + 7, s[1] + 2], [s[0] + 5, s[1] + 7]][ph]; J.elN = [[s[0] + 3, s[1] + 1], [s[0] + 4, s[1] + 3], [s[0] + 3, s[1] + 4]][ph]; J.ang = [-1.0, 0.1, 0.9][ph]; }
  else { J.haN = [s[0] + 1 + asw, s[1] + 8 + (idle && ph > 1 ? 1 : 0)]; J.elN = [s[0] + 2 + asw * 0.5, s[1] + 4]; J.ang = 1.25; J.rest = true; }
  J.haF = [J.shF[0] - 1 - asw, J.shF[1] + 8]; J.elF = [J.shF[0] - 1.5 - asw * 0.5, J.shF[1] + 4];
  return J;
}
function mnSkelLeg(A, hip, k, an, t, bone) {
  A.limb([hip, k], 1.2, 1, bone, { tone: t }); A.limb([k, an], 1, 0.8, bone, { tone: t });
  A.ell(k[0] + 0.3, k[1], 1.3, 1.1, bone, { tone: t });
  A.poly([[an[0] - 1.5, an[1] - 1], [an[0] + 1, an[1] - 1.2], [an[0] + 3.5, an[1] + 0.6], [an[0] + 3.5, an[1] + 1.5], [an[0] - 1.5, an[1] + 1.5]], bone, { tone: t });
}
function mnSkull(A, h, bone, back, helm) {
  const [x, y] = h;
  A.ell(x, y, 3.3, 3.5, bone, {});
  if (!back) {
    A.poly([[x - 0.5, y + 1.5], [x + 3.6, y + 1.2], [x + 3.2, y + 4.2], [x + 0.2, y + 4]], bone, {});    // the jaw, hanging a little open
    A.px(x + 0.5, y - 0.5, MN_GAP); A.px(x + 1.5, y - 0.5, MN_GAP); A.px(x + 0.5, y + 0.5, MN_GAP); A.px(x + 1.5, y + 0.5, MN_GAP);   // near socket
    A.px(x - 1.5, y - 0.5, MN_GAP); A.px(x - 1.5, y + 0.5, MN_GAP);                                                              // far socket
    A.px(x + 1.5, y - 0.5, MN_EYE); A.px(x + 0.5, y + 0.5, MN_EYE2); A.px(x - 1.5, y - 0.5, MN_EYE);
    A.px(x + 3, y + 1, MN_GAP); A.px(x + 3, y + 2, MN_GAP);                                                                      // nasal hole
    for (let i = 0; i < 3; i++) A.px(x + 1 + i, y + 2.5, i % 2 ? mnHex(bone, 4) : MN_GAP);                                       // teeth
    A.px(x - 1, y - 3, mnHex(bone, 4)); A.px(x, y - 3, mnHex(bone, 4));
  } else {
    A.px(x - 1, y - 1, mnHex(bone, 1)); A.px(x - 2, y, mnHex(bone, 1)); A.px(x - 1, y + 1, mnHex(bone, 1));   // an old crack in the crown
    A.px(x, y - 3, mnHex(bone, 4));
  }
  if (helm) {   // a dented iron kettle-helm with a rusted brim
    A.poly([[x - 3.8, y - 0.5], [x - 3.2, y - 3.2], [x - 1, y - 4.6], [x + 1.5, y - 4.6], [x + 3.4, y - 3], [x + 3.9, y - 0.4]], 'mnIron', {});
    A.poly([[x - 5, y - 0.4], [x + 5.2, y - 0.4], [x + 5, y + 0.8], [x - 4.8, y + 0.8]], 'mnIron', { tone: -1 });
    A.px(x - 1, y - 3.5, mnHex('mnIron', 4)); A.px(x, y - 3.5, mnHex('mnIron', 3)); A.px(x + 3, y - 1, mnHex('mnRust', 3)); A.px(x - 3, y, mnHex('mnRust', 2));
  }
}
function mnRibcage(A, J, bone, back) {
  const c = J.ch, bd = 'mnBoneD';
  // spine, pelvis
  A.limb([[J.hip[0], J.hip[1] - 1], [c[0] - 0.5, c[1] + 3]], 0.9, 0.9, bone, { tone: -1 });
  A.poly([[J.hip[0] - 3.2, J.hip[1] - 2], [J.hip[0] + 3.2, J.hip[1] - 2.2], [J.hip[0] + 2.4, J.hip[1] + 1], [J.hip[0], J.hip[1] + 2], [J.hip[0] - 2.4, J.hip[1] + 1]], bone, {});
  A.px(J.hip[0] - 1, J.hip[1], MN_GAP); A.px(J.hip[0] + 1, J.hip[1], MN_GAP);
  for (let i = 0; i < 3; i++) A.px(J.hip[0] - 0.3 + i * 0.1, J.hip[1] - 3 - i * 1.5, mnHex(bone, 4));
  if (!back) {
    A.ell(c[0], c[1], 4, 4.4, bd, { tone: -1, band: 2 });                 // the dark inside of the cage
    // ribs: bright curved bars with a shadow line under each, the dark of the empty chest between them
    for (let i = 0; i < 4; i++) {
      const y = Math.round(c[1] - 3.2 + i * 2), w = Math.round(3.6 - Math.abs(i - 1.3) * 0.6);
      mnRow(A, c[0] - w + 1, c[0] + w - 1, y, mnHex(bone, 3)); mnRow(A, c[0] - w, c[0] - w, y + 1, mnHex(bone, 2)); mnRow(A, c[0] + w, c[0] + w, y + 1, mnHex(bone, 2));
      mnRow(A, c[0] - w + 1, c[0] - w + 1, y, mnHex(bone, 4));
    }
    mnRow(A, c[0] + 0.5, c[0] + 0.5, c[1] - 4, mnHex(bone, 4), 5);   // sternum
    A.px(c[0] - 2, c[1] - 3, mnHex(bone, 4)); A.px(c[0] + 1, c[1] - 1, mnHex(bone, 4));
    A.px(c[0] - 1, c[1] + 3, MN_GAP); A.px(c[0] + 1, c[1] + 3, MN_GAP);
  } else {
    A.ell(c[0], c[1], 4, 4.4, bone, { band: 2 });
    for (let i = 0; i < 4; i++) { const y = c[1] - 3 + i * 1.9; A.line(c[0] - 3.4, y + 1, c[0] + 3.4, y + 0.6, mnHex(bone, 1)); }
    A.poly([[c[0] - 3.5, c[1] - 3.8], [c[0] - 0.8, c[1] - 3.5], [c[0] - 1.5, c[1]], [c[0] - 3.2, c[1] - 1]], bone, {});   // shoulder blades
    A.poly([[c[0] + 0.8, c[1] - 3.5], [c[0] + 3.5, c[1] - 3.8], [c[0] + 3.2, c[1] - 1], [c[0] + 1.5, c[1]]], bone, {});
    for (let i = 0; i < 6; i++) A.px(c[0], c[1] - 4 + i * 1.5, i % 2 ? mnHex(bone, 4) : mnHex(bone, 1));   // vertebrae down the back
  }
  A.limb([[c[0], c[1] - 4], [J.head[0] - 1, J.head[1] + 3]], 0.7, 0.7, bone, { tone: -1 });   // neck
}
// the weapon in the near hand; returns nothing (all painted into A)
function mnSkelWeapon(A, J, load) {
  const h = J.haN, ang = J.ang, IR = k => mnHex('mnIron', k), WD = k => mnHex('mnWood', k);
  if (load === 'shield') {
    mnBladePx(A, h, ang, 8, IR(4), IR(3), IR(1), 2);
    for (let k = -1.5; k <= 1.5; k++) A.px(h[0] - Math.sin(ang) * k, h[1] + Math.cos(ang) * k, mnHex('mnRust', 3));
  } else if (load === 'greatsword') {
    const t = mnBladePx(A, mnDir(h, ang, 1), ang, 15, '#e8ecf4', IR(3), IR(1), 3);
    for (let k = -2.5; k <= 2.5; k += 0.5) A.px(h[0] + Math.cos(ang) * 1 - Math.sin(ang) * k, h[1] + Math.sin(ang) * 1 + Math.cos(ang) * k, k === 0 ? IR(4) : IR(2));
    A.px(h[0] - Math.cos(ang) * 2, h[1] - Math.sin(ang) * 2, mnHex('mnGold', 3)); A.px(h[0] - Math.cos(ang), h[1] - Math.sin(ang), WD(2));
    void t;
  } else if (load === 'halberd') {
    const hang = J.wind ? -2.1 : J.atk ? [-1.2, -0.2, 0.4][J.ph] : -1.5, ca = Math.cos(hang), sa = Math.sin(hang);
    for (let d = -7; d <= 13; d += 0.5) A.px(h[0] + ca * d, h[1] + sa * d, d > 11 ? IR(3) : WD(d % 2 ? 2 : 3));
    const top = mnDir(h, hang, 11), nx = -sa, ny = ca;          // the axe blade on the leading side, a hook behind
    A.poly([[top[0] + nx * 0.5, top[1] + ny * 0.5], [top[0] + nx * 4 - ca * 2, top[1] + ny * 4 - sa * 2], [top[0] + nx * 4.5 + ca * 2.5, top[1] + ny * 4.5 + sa * 2.5], [top[0] + ca * 1.5, top[1] + sa * 1.5]], 'mnIron', {});
    A.poly([[top[0] - nx * 0.5, top[1] - ny * 0.5], [top[0] - nx * 3 + ca * 0.5, top[1] - ny * 3 + sa * 0.5], [top[0] - nx * 0.5 + ca * 1.5, top[1] - ny * 0.5 + sa * 1.5]], 'mnIron', { tone: -1 });
    A.line(top[0] + nx * 4.5 - ca * 1.5, top[1] + ny * 4.5 - sa * 1.5, top[0] + nx * 4.8 + ca * 2.2, top[1] + ny * 4.8 + sa * 2.2, '#dde4ee');
  } else if (load === 'flail') {
    const e = mnDir(h, ang, 5);
    for (let d = -1; d <= 5; d += 0.5) A.px(h[0] + Math.cos(ang) * d, h[1] + Math.sin(ang) * d, WD(3));
    const off = J.wind ? [-4, 3] : J.atk ? [[-3, -5], [7, 0], [4, 5]][J.ph] : [0, 6 + (J.walk ? Math.round(J.sw) : 0)];
    const b = [e[0] + off[0], e[1] + off[1]];
    for (let t = 0; t <= 1; t += 0.2) A.px(e[0] + (b[0] - e[0]) * t, e[1] + (b[1] - e[1]) * t, t * 5 % 2 < 1 ? mnHex('mnIron', 3) : mnHex('mnIron', 1));
    A.ell(b[0], b[1], 2.1, 2.1, 'mnIron', {});
    A.px(b[0], b[1] - 3, IR(3)); A.px(b[0] + 3, b[1], IR(3)); A.px(b[0], b[1] + 3, IR(2)); A.px(b[0] - 3, b[1], IR(2)); A.px(b[0] - 1, b[1] - 1, IR(4));
  } else if (load === 'mage') {
    const top = [h[0] - 0.5, h[1] - (J.wind ? 12 : 12)], bot = [h[0] + 0.5, J.wind || J.atk ? h[1] + 6 : 47];
    A.limb([bot, top], 0.6, 0.6, 'mnWood', {});
    A.limb([[top[0] - 1.5, top[1] + 2], [top[0], top[1] - 1], [top[0] + 1.5, top[1] + 2]], 0.5, 0.5, 'mnBone', {});   // a finger-bone cradle
    const hot = J.wind || J.atk;
    A.px(top[0], top[1] - 1, hot ? '#ffffff' : '#e8d6ff'); A.px(top[0] - 1, top[1] - 1, '#b48ad9'); A.px(top[0] + 1, top[1] - 1, '#b48ad9'); A.px(top[0], top[1] - 2, '#b48ad9'); A.px(top[0], top[1], '#7a4ea8');
    if (hot) for (let i = 0; i < 4; i++) { const an = i * 1.57 + J.ph * 0.6; A.px(top[0] + Math.cos(an) * 3, top[1] - 1 + Math.sin(an) * 3, i % 2 ? '#e8d6ff' : '#b48ad9'); }
  }
}
function mnSkelBow(A, J, bone) {
  const hx = J.shN[0] + 6, hy = J.shN[1] + 2, drawn = J.wind || (J.atk && J.ph === 0);
  const haN = [hx, hy], elN = [J.shN[0] + 3, J.shN[1] + 2];
  A.limb([J.shN, elN], 0.8, 0.7, bone, { contourAll: true }); A.limb([elN, haN], 0.7, 0.6, bone, {});
  A.limb([[hx - 1.5, hy - 9], [hx + 1.2, hy - 4], [hx + 1.5, hy], [hx + 1.2, hy + 4], [hx - 1.5, hy + 9]], 0.7, 0.7, 'mnWood', {});
  A.px(hx - 1.5, hy - 9, mnHex('mnBone', 4)); A.px(hx - 1.5, hy + 9, mnHex('mnBone', 4));
  const sx = drawn ? J.shF[0] + 1 : hx - 1.5;
  A.line(hx - 1.5, hy - 8, sx, hy, '#cfc6ae'); A.line(sx, hy, hx - 1.5, hy + 8, '#cfc6ae');
  if (drawn) { A.line(sx, hy, hx + 4, hy, mnHex('mnWood', 3)); A.px(hx + 5, hy, '#dde4ee'); A.px(hx + 4, hy - 1, '#aab0bc'); A.px(hx + 4, hy + 1, '#aab0bc'); A.px(sx, hy - 1, '#8e2630'); A.px(sx, hy + 1, '#8e2630'); }
  // the drawing hand: at the string when drawn, else at the hip by the quiver
  const haF = drawn ? [sx, hy] : J.haF, elF = drawn ? [J.shF[0] - 1, J.shF[1] + 3] : J.elF;
  return { haF, elF };
}
function mnSkelPaint(A, pose, ph, load, view) {
  const J = mnSkelRig(pose, ph), back = view === 'back', bone = 'mnBone';
  const helm = load === 'greatsword' || load === 'halberd', mage = load === 'mage', bow = load === 'bow';
  const farArm = (t) => {
    if (bow && !back) return;
    A.limb([J.shF, J.elF], 0.8, 0.7, bone, { tone: t }); A.limb([J.elF, J.haF], 0.7, 0.6, bone, { tone: t }); A.ell(J.haF[0], J.haF[1] + 0.5, 1, 1, bone, { tone: t });
  };
  const shield = (bk) => {
    const c = [J.ch[0] + 2.5 + (J.wind ? -1 : 0), J.ch[1] + 3 - (J.wind ? 2 : 0)];
    const pts = [[c[0] - 3.5, c[1] - 5.5], [c[0] + 3.5, c[1] - 5.5], [c[0] + 4, c[1] + 1], [c[0], c[1] + 6.5], [c[0] - 4, c[1] + 1]];
    A.poly(pts.map(([x, y]) => [c[0] + (x - c[0]) * 1.2, c[1] + (y - c[1]) * 1.12]), 'mnIron', {});
    A.poly(pts, 'mnWood', { band: 2 });
    if (!bk) {
      A.line(c[0] - 2, c[1] - 4, c[0] - 2, c[1] + 2, mnHex('mnWood', 1)); A.line(c[0] + 1, c[1] - 4, c[0] + 1, c[1] + 4, mnHex('mnWood', 1));
      A.ell(c[0], c[1] - 1.5, 1.8, 1.8, 'mnBone', {}); A.px(c[0] - 0.6, c[1] - 1.5, MN_GAP); A.px(c[0] + 0.8, c[1] - 1.5, MN_GAP); A.px(c[0] - 1, c[1] - 3, mnHex('mnBone', 4));
      A.line(c[0] - 2, c[1] + 2, c[0] - 1, c[1] + 4, '#8e2630'); A.line(c[0] + 2, c[1] + 2, c[0] + 1, c[1] + 4, '#8e2630'); A.px(c[0], c[1] + 3, '#b8404a');
    } else { A.line(c[0] - 2, c[1] - 2, c[0] + 2, c[1] - 2, mnHex('mnLea', 3)); A.line(c[0] - 2, c[1] + 1, c[0] + 2, c[1] + 1, mnHex('mnLea', 3)); A.px(c[0] - 2, c[1] - 2, mnHex('mnIron', 3)); A.px(c[0] + 2, c[1] + 1, mnHex('mnIron', 3)); }
  };
  const nearArm = (t) => {
    if (bow) return mnSkelBow(A, J, bone);
    if (load === 'halberd' && J.rest) { J.haN = [J.shN[0] + 4 + (J.walk ? Math.round(-J.sw) : 0), J.shN[1] + 6]; J.elN = [J.shN[0] + 3, J.shN[1] + 4]; }
    if (load === 'halberd' || load === 'greatsword') {   // two-handed: the far hand joins the grip
      J.haF = mnDir(J.haN, J.ang + Math.PI, 2.5); J.elF = [(J.shF[0] + J.haF[0]) / 2, Math.max(J.shF[1], J.haF[1]) + 2];
    }
    if (!back) mnSkelWeapon(A, J, load);
    A.limb([J.shN, J.elN], 0.8, 0.7, bone, { contourAll: true, tone: t }); A.limb([J.elN, J.haN], 0.7, 0.6, bone, { tone: t }); A.ell(J.haN[0], J.haN[1], 1.1, 1.1, bone, { tone: t });
    if (back) mnSkelWeapon(A, J, load);
  };
  const robe = () => {   // the grave-mage's tattered cowl and robe
    const c = J.ch, sw = J.walk ? Math.round(-J.sw) : 0, fr = ph % 2;
    A.poly([[c[0] - 5, c[1] - 4], [c[0] + 4, c[1] - 4.5], [c[0] + 5, c[1] + 6], [J.hip[0] + 6 + sw, 42 + fr], [J.hip[0] + 3, 40], [J.hip[0] + 1 + sw, 43 - fr], [J.hip[0] - 2, 40], [J.hip[0] - 5 + sw, 42], [c[0] - 6 + sw, c[1] + 8]], 'mnCowl', { band: 2 });
    A.line(c[0] - 5, c[1] + 6, J.hip[0] - 4 + sw, 41, mnHex('mnCowl', 1));
    A.line(c[0] + 1, c[1] + 1, J.hip[0] + 3, 39, mnHex('mnCowl', 1));
  };
  const cowl = () => {
    const [x, y] = J.head;
    A.poly([[x - 5, y + 5], [x - 5, y - 1], [x - 2.5, y - 5], [x + 1.5, y - 5.2], [x + 4, y - 2.5], [x + 4.5, y + 1], [x + 1, y - 2], [x - 1.5, y + 1], [x - 1.5, y + 6]], 'mnCowl', {});
    if (!back) { A.px(x + 3, y - 2, mnHex('mnCowl', 4)); } else A.poly([[x - 4, y - 2], [x + 3, y - 3], [x + 4, y + 3], [x - 4, y + 5]], 'mnCowl', { tone: -1 });
  };
  if (!back) {
    farArm(-1);
    if (bow) { A.poly([[J.shF[0] - 3, J.shF[1] - 4], [J.shF[0] - 1, J.shF[1] - 5], [J.shF[0] + 1, J.shF[1] + 6], [J.shF[0] - 1, J.shF[1] + 7]], 'mnLea', { tone: -1 }); for (let i = 0; i < 3; i++) A.px(J.shF[0] - 2 + i, J.shF[1] - 6 - (i % 2), i === 1 ? '#8e2630' : '#cfc6ae'); }
    mnSkelLeg(A, J.hip, J.kF, J.ankF, -1, bone);
    if (mage) robe();
    mnRibcage(A, J, bone, false);
    mnSkelLeg(A, J.hip, J.kN, J.ankN, 0, bone);
    if (mage) robe();
    if (load === 'shield') shield(false);
    mnSkull(A, J.head, bone, false, helm);
    if (mage) cowl();
    nearArm(0);
  } else {
    nearArm(-1);
    mnSkelLeg(A, J.hip, J.kN, J.ankN, -1, bone);
    mnSkelLeg(A, J.hip, J.kF, J.ankF, 0, bone);
    mnRibcage(A, J, bone, true);
    if (mage) robe();
    if (bow) { A.poly([[J.ch[0] - 3, J.ch[1] - 6], [J.ch[0], J.ch[1] - 7], [J.ch[0] + 2, J.ch[1] + 5], [J.ch[0] - 1, J.ch[1] + 6]], 'mnLea', {}); for (let i = 0; i < 4; i++) A.px(J.ch[0] - 2 + i, J.ch[1] - 8 - (i % 2), i === 1 ? '#8e2630' : '#cfc6ae'); }
    mnSkull(A, J.head, bone, true, helm);
    if (mage) cowl();
    farArm(0);
    if (load === 'shield') shield(true);
  }
}
function mnSkelFrame(load, pose, ph, view) {
  return mnFrame('sk|' + load + '|' + pose + '|' + ph + '|' + view, 54, 52, 22, 48, A => mnSkelPaint(A, pose, ph, load, view));
}

// ------------------------------------------------------------------- drawing the raised dead
{
  drawSkel16 = function (e, flash, sink) {
    const mv = e._px == null ? 0 : Math.hypot(e.x - e._px, e.y - e._py); e._px = e.x; e._py = e.y; e._wd = (e._wd || 0) + mv;
    let pose = 'idle', ph = Math.floor(G.time * 2.2 + ((e.x * 7) % 4 + 4)) % 4;
    if (e.state === 'windup') { pose = 'wind'; ph = 0; }
    else if ((e.swingT || 0) > 0) { pose = 'atk'; ph = e.swingT > 0.14 ? 0 : e.swingT > 0.07 ? 1 : 2; }
    else if (mv > 0.004) { pose = 'walk'; ph = Math.floor(e._wd * 6) % 8; }
    const view = mnView(e, mv), fr = mnSkelFrame(e.load || 'shield', pose, ph, view), p = iso(e.x, e.y), face = e.face || 1;
    ctx.globalCompositeOperation = 'lighter'; glow(p.sx, p.sy - 3, 12, '200,190,170', 0.07 + 0.03 * Math.sin(G.time * 2 + e.x)); ctx.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.05) parts.push({ x: e.x + rand(-0.2, 0.2), y: e.y + rand(-0.2, 0.2), z: 1 + Math.random() * 4, vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2), vz: 3 + Math.random() * 3, t: 0.8 + Math.random() * 0.6, col: Math.random() < 0.5 ? '#8f8a7c' : '#6f6a60' });
    const r = mnBlit(fr, p.sx, p.sy + (sink || 0), face, flash, e.temp ? 0.8 : 1);
    return { x: Math.round(p.sx - 6), y: r.y, w: 12, h: Math.round(p.sy + 3 - r.y) };
  };
}

// ------------------------------------------------------------------- a scaled drawing kit: local coordinates (feet at 0,0, up is -y)
// so the big minions can grow (the Colossus with every skeleton fused in) and still be painted at native pixels
function mnKit(A, ox, oy, s) {
  const X = x => ox + x * s, Y = y => oy + y * s, R = r => Math.max(0.5, r * s), P = pts => pts.map(([x, y]) => [X(x), Y(y)]);
  return {
    s, X, Y, R,
    E: (x, y, rx, ry, m, o) => A.ell(X(x), Y(y), R(rx), R(ry), m, o || {}),
    L: (pts, r0, r1, m, o) => A.limb(P(pts), R(r0), R(r1), m, o || {}),
    Q: (pts, m, o) => A.poly(P(pts), m, o || {}),
    D: (x, y, c) => A.px(X(x), Y(y), c),
    N: (x0, y0, x1, y1, c) => A.line(X(x0), Y(y0), X(x1), Y(y1), c),
    row: (x0, x1, y, c, h) => mnRow(A, X(x0), X(x1), Y(y), c, h)
  };
}

// =================================================================== the Ossuary Colossus
// A hunched giant knit from the bones of the skeletons fused into it: legs of bundled thighbones, a pelvis and
// shoulders studded with skulls, a cavernous ribcage with the soul-light burning inside, a horned skull sunk
// between its shoulders, and its weapon grown from its own bone (scythe arm, twin swords, spine-flail, rib shield).
function mnColPaint(A, K, pose, ph, wpn, view) {
  const { E, L, Q, D, N } = K, bone = 'mnBone', bd = 'mnBoneD', back = view === 'back';
  const walk = pose === 'walk', idle = pose === 'idle', wind = pose === 'wind', atk = pose === 'atk';
  const a = walk ? ph / 8 * Math.PI * 2 : 0, sw = walk ? Math.sin(a) : 0;
  const bob = walk ? -Math.abs(Math.cos(a)) * 1.5 + 0.7 : idle && (ph === 1 || ph === 2) ? 0.8 : 0, lean = wind ? -2 : atk ? [2, 4, 3][ph] : 0;
  const hip = [0 + lean * 0.3, -24 + bob], ch = [2 + lean, -38 + bob], shF = [-12 + lean, -46 + bob], shN = [15 + lean, -45 + bob], hd = [11 + lean * 1.2, -48 + bob];
  const ankF = walk ? [-7 - sw * 5, -Math.max(0, -Math.cos(a)) * 2.5] : atk ? [-9, 0] : [-7, 0], ankN = walk ? [7 + sw * 5, -Math.max(0, Math.cos(a)) * 2.5] : atk ? [10, 0] : [7, 0];
  const kF = [(hip[0] + ankF[0]) / 2 - 1, -12 + bob * 0.5], kN = [(hip[0] + ankN[0]) / 2 + 2, -12 + bob * 0.5];
  const asw = walk ? -sw * 3 : 0;
  // the weapon hand's path: hanging low, raised high behind for the tell, then brought down through the blow
  let haN, elN, ang;
  if (wind) { haN = [shN[0] - 6, shN[1] - 12]; elN = [shN[0] - 3, shN[1] - 3]; ang = -2.3; }
  else if (atk) { haN = [[shN[0] + 8, shN[1] - 10], [shN[0] + 15, shN[1] + 6], [shN[0] + 10, shN[1] + 17]][ph]; elN = [[shN[0] + 6, shN[1] + 1], [shN[0] + 8, shN[1] + 5], [shN[0] + 6, shN[1] + 9]][ph]; ang = [-1.2, 0.1, 1.0][ph]; }
  else { haN = [shN[0] + 4 + asw, shN[1] + 24]; elN = [shN[0] + 5 + asw * 0.5, shN[1] + 12]; ang = 1.3; }
  const haF = [shF[0] - 3 - asw, shF[1] + 24], elF = [shF[0] - 5 - asw * 0.5, shF[1] + 12];
  const skullAt = (x, y, r, t, noEyes) => {
    E(x, y, r, r * 0.95, bone, { tone: t || 0 });
    if (!noEyes) { D(x - r * 0.35, y, MN_GAP); D(x + r * 0.4, y, MN_GAP); D(x + r * 0.4, y - 0.8 * 0, MN_GAP); D(x, y + r * 0.6, MN_GAP); D(x - r * 0.4, y - r * 0.55, mnHex(bone, 4)); }
  };
  const bundleLeg = (h, k, an, t) => {
    L([h, k], 3.2, 2.6, bone, { tone: t, band: 2 }); L([[h[0] + 1.5, h[1]], [k[0] + 1.5, k[1]]], 1.3, 1.1, bd, { tone: t });
    L([k, an], 2.4, 1.8, bone, { tone: t, band: 2 });
    skullAt(k[0] + 0.5, k[1], 2.4, t);
    Q([[an[0] - 3, an[1] - 2], [an[0] + 2, an[1] - 2.5], [an[0] + 7, an[1] - 0.5], [an[0] + 7, an[1] + 0.8], [an[0] - 3.5, an[1] + 0.8]], bone, { tone: t });
    for (let i = 0; i < 3; i++) D(an[0] + 3 + i * 1.5, an[1] - 0.5, MN_GAP);
  };
  const arm = (sh, el, ha, t) => { L([sh, el], 3.8, 3, bone, { tone: t, band: 2 }); L([[sh[0] - 1, sh[1] + 1], [el[0] - 1, el[1]]], 1, 1, bd, { tone: t }); L([el, ha], 3, 2.4, bone, { tone: t }); E(el[0], el[1], 2.8, 2.5, bone, { tone: t }); };
  const fist = (ha, t) => { E(ha[0], ha[1], 3.6, 3.2, bone, { tone: t }); for (let i = 0; i < 3; i++) D(ha[0] + 1 + i, ha[1] + 2, MN_GAP); };
  const weapon = (t) => {
    const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
    if (wpn === 'scythe') {       // the forearm itself grows into a great hooked blade of bone
      const b0 = ha => ha, tip = [haN[0] + ca * 20, haN[1] + sa * 20];
      L([haN, [haN[0] + ca * 10 + nx * 1, haN[1] + sa * 10 + ny * 1], tip], 3, 0.8, bone, { tone: t });
      Q([[haN[0] + ca * 3 + nx * 1, haN[1] + sa * 3 + ny * 1], [tip[0] + nx * 1, tip[1] + ny * 1], [tip[0] + nx * 7 - ca * 4, tip[1] + ny * 7 - sa * 4], [haN[0] + ca * 12 + nx * 8, haN[1] + sa * 12 + ny * 8], [haN[0] + ca * 6 + nx * 5, haN[1] + sa * 6 + ny * 5]], bone, { tone: t, band: 2 });
      for (let i = 5; i < 18; i += 1) D(haN[0] + ca * i + nx * (2.5 + (i - 5) * 0.35), haN[1] + sa * i + ny * (2.5 + (i - 5) * 0.35), mnHex(bone, 4));
      void b0;
    } else if (wpn === 'swords' || wpn === 'ribs') {
      fist(haN, t);
      for (let i = 2; i <= 22; i++) { D(haN[0] + ca * i, haN[1] + sa * i, mnHex(bone, i > 20 ? 4 : 3)); D(haN[0] + ca * i - nx, haN[1] + sa * i - ny, mnHex(bone, 1)); if (i < 21) D(haN[0] + ca * i + nx * 2, haN[1] + sa * i + ny * 2, mnHex(bone, 2)); if (i < 21) D(haN[0] + ca * i + nx, haN[1] + sa * i + ny, mnHex(bone, 4)); }
      for (let k = -3; k <= 3; k++) D(haN[0] + ca * 1.5 + nx * k, haN[1] + sa * 1.5 + ny * k, mnHex(bone, 2));
    } else if (wpn === 'flail') {  // a spine for a chain, a horned skull for a head
      fist(haN, t);
      const e = [haN[0] + ca * 4, haN[1] + sa * 4];
      const off = wind ? [-7, 6] : atk ? [[-6, -9], [12, 1], [7, 9]][ph] : [1 + asw * 0.3, 11];
      const b = [e[0] + off[0], e[1] + off[1]];
      for (let i = 0; i <= 8; i++) { const p = mnLerp(e, b, i / 8); E(p[0], p[1], 1.1, 1.1, bone, { tone: t }); }
      E(b[0], b[1], 3.3, 3, bone, {}); D(b[0] + 1, b[1], MN_GAP); D(b[0] + 2, b[1], MN_GAP); D(b[0] + 1, b[1], MN_EYE); D(b[0] - 1, b[1], MN_GAP);
      L([[b[0] - 2, b[1] - 2], [b[0] - 4, b[1] - 5]], 1, 0.5, bone, {}); L([[b[0] + 2, b[1] - 2], [b[0] + 4, b[1] - 5]], 1, 0.5, bone, {});
    } else fist(haN, t);   // shield: the near hand swings a bare bone fist
  };
  const ribShield = (t) => {   // a tower shield of fused ribs and skulls, braced on the far arm in front of the body
    const c = [ch[0] + 5 + (wind ? -2 : 0), ch[1] + 8];
    Q([[c[0] - 6, c[1] - 12], [c[0] + 6, c[1] - 13], [c[0] + 7, c[1] + 6], [c[0], c[1] + 13], [c[0] - 7, c[1] + 6]], back ? 'mnWood' : 'mnBone', { tone: t, band: 3 });
    if (!back) {
      for (let i = 0; i < 5; i++) N(c[0] - 5, c[1] - 8 + i * 4, c[0] + 6, c[1] - 9 + i * 4, mnHex('mnBone', 1));
      skullAt(c[0] + 0.5, c[1] - 1, 3, 0);
      D(c[0] + 0.5, c[1] - 1, MN_EYE);
    }
  };
  // ---- paint, far to near (the back view swaps the arms and turns the torso)
  const body = () => {
    // pelvis with a skull at each hip
    Q([[hip[0] - 8, hip[1] - 4], [hip[0] + 8, hip[1] - 4.5], [hip[0] + 6, hip[1] + 3], [hip[0], hip[1] + 4], [hip[0] - 6, hip[1] + 3]], bone, { band: 2 });
    skullAt(hip[0] - 5, hip[1] - 1, 2.3, 0, back); skullAt(hip[0] + 5, hip[1] - 1, 2.3, 0, back);
    // the spine arching up into the cage
    L([[hip[0], hip[1] - 3], [ch[0] - 3, ch[1] + 6]], 2, 2, bone, { tone: -1 });
    if (!back) {
      Q(mnColCage(ch), bd, { tone: -1, band: 3 });
      // the soul-light burning in the hollow of the chest
      E(ch[0] + 1, ch[1] + 1, 4, 4, '#1a3040', { flat: true, contour: false }); E(ch[0] + 1, ch[1] + 1, 2.2, 2.2, '#4a90b8', { flat: true, contour: false }); E(ch[0] + 1, ch[1] + 1, 1, 1, MN_EYE2, { flat: true, contour: false });
      for (let i = 0; i < 6; i++) {
        const y = ch[1] - 8 + i * 3.1, w = 12 - Math.max(0, i - 1) * 1.7;
        L([[ch[0] - w + 0.5, y + 2.5], [ch[0] - w * 0.5, y], [ch[0] + w * 0.5, y - 0.3], [ch[0] + w, y + 2]], 0.9, 0.7, bone, { contour: false });
      }
      L([[ch[0] + 1, ch[1] - 10], [ch[0] + 1, ch[1] + 3]], 1.2, 1, bone, {});   // sternum
      for (let i = 0; i < 4; i++) D(ch[0] - 6 + i * 4, ch[1] - 7 + (i % 2), mnHex(bone, 4));
    } else {
      Q(mnColCage(ch), bone, { band: 3 });
      for (let i = 0; i < 6; i++) N(ch[0] - 10, ch[1] - 8 + i * 3.4, ch[0] + 10, ch[1] - 8.5 + i * 3.4, mnHex(bone, 1));
      Q([[ch[0] - 10, ch[1] - 10], [ch[0] - 2, ch[1] - 9], [ch[0] - 3, ch[1] - 1], [ch[0] - 9, ch[1] - 3]], bone, {});
      Q([[ch[0] + 2, ch[1] - 9], [ch[0] + 10, ch[1] - 10], [ch[0] + 9, ch[1] - 3], [ch[0] + 3, ch[1] - 1]], bone, {});
      for (let i = 0; i < 8; i++) { E(ch[0], ch[1] - 11 + i * 3, 1.4, 1.1, bone, {}); }
      for (let i = 0; i < 3; i++) skullAt(ch[0] - 5 + i * 5, ch[1] + 7 - (i % 2) * 2, 2, -1, true);   // skulls packed into the small of the back
    }
  };
  const shoulders = () => {
    for (const [x, y, r] of [[shF[0] - 1, shF[1] - 1, 3], [shF[0] + 3, shF[1] - 3.5, 2.6], [shN[0] + 1, shN[1] - 1, 3.2], [shN[0] - 3, shN[1] - 4, 2.6]]) skullAt(x, y, r, 0, back);
  };
  const head = () => {
    const [x, y] = hd;
    // horns of curved ribs
    L([[x - 3, y - 3], [x - 7, y - 6], [x - 9, y - 3], [x - 8, y + 1]], 2.2, 0.8, 'mnBoneD', {});                // ram horns curling down
    L([[x + 1, y - 4], [x + 3, y - 9], [x + 7, y - 11], [x + 10, y - 9], [x + 10, y - 6]], 2.2, 0.8, bone, {});
    for (let i = 0; i < 3; i++) D(x + 3 + i * 2.2, y - 9.5 - (i === 1 ? 1 : 0), mnHex(bone, 1));
    E(x, y, 5.6, 5.4, bone, {});
    if (!back) {
      Q([[x - 1, y + 2.5], [x + 6.5, y + 2], [x + 6, y + 7.5], [x + 0, y + 7]], bone, {});
      for (const [a, b] of [[1, -1], [2, -1], [3, -1], [1, 0], [2, 0], [3, 0], [-2, -1], [-3, -1], [-2, 0], [5, 2], [5, 3]]) D(x + a, y + b, MN_GAP);
      D(x + 2, y - 1, MN_EYE); D(x + 2, y, MN_EYE2); D(x - 2, y - 1, MN_EYE);
      for (let i = 0; i < 6; i++) D(x + i, y + 4.5, i % 2 ? mnHex(bone, 4) : MN_GAP);
      D(x - 2, y - 4, mnHex(bone, 4)); D(x - 1, y - 4, mnHex(bone, 4));
    } else { D(x - 1, y - 2, mnHex(bone, 1)); D(x, y - 1, mnHex(bone, 1)); D(x - 1, y, mnHex(bone, 1)); D(x - 2, y - 3, mnHex(bone, 4)); }
  };
  if (!back) {
    arm(shF, elF, haF, -1); fist(haF, -1);
    bundleLeg(hip, kF, ankF, -1);
    body();
    bundleLeg(hip, kN, ankN, 0);
    if (wpn === 'shield') ribShield(0);
    shoulders(); head();
    if (wpn !== 'scythe') arm(shN, elN, haN, 0); else { L([shN, elN], 3, 2.4, bone, { band: 2 }); E(elN[0], elN[1], 2.2, 2, bone, {}); L([elN, haN], 2.4, 2.4, bone, {}); }
    weapon(0);
  } else {
    if (wpn !== 'scythe') arm(shN, elN, haN, -1); else { L([shN, elN], 3, 2.4, bone, { tone: -1 }); L([elN, haN], 2.4, 2.4, bone, { tone: -1 }); }
    weapon(-1);
    bundleLeg(hip, kN, ankN, -1);
    bundleLeg(hip, kF, ankF, 0);
    body(); head(); shoulders();
    arm(shF, elF, haF, 0); fist(haF, 0);
    if (wpn === 'shield') ribShield(0);
  }
}
// the cage: broad at the shoulders, narrowing to the waist
function mnColCage(ch) { const [x, y] = ch; return [[x - 12, y - 10], [x - 4, y - 12], [x + 6, y - 12], [x + 13, y - 9], [x + 13, y - 1], [x + 9, y + 8], [x + 3, y + 11], [x - 4, y + 10], [x - 9, y + 5], [x - 13, y - 2]]; }
function mnColFrame(wpn, pose, ph, view, s) {
  s = Math.round(s * 20) / 20;
  const W = Math.ceil(96 * s), H = Math.ceil(90 * s), ox = Math.round(40 * s), oy = H - 4;
  return mnFrame('col|' + wpn + '|' + pose + '|' + ph + '|' + view + '|' + s, W, H, ox, oy, A => mnColPaint(A, mnKit(A, ox, oy, s), pose, ph, wpn, view));
}

// =================================================================== ANIMANCER: the Iron Golem, polished to a mirror
// A hulking knight of iron worked to a mirror sheen: every plate throws back a hard white glint and a dark band of
// the horizon, the soul-core burns behind a grille in its chest, the visor slit glows. Sword, great axe or morning
// star in the near hand; the tower shield (itself a mirror) braced on the far arm until it is thrown.
const MN_CORE = '#6ad0ff', MN_CORE2 = '#d8f6ff';
// a plate of polished mirror-iron: base shading from the painter, then the reflection: a dark horizon band across
// the middle and a bright diagonal glint
function mnPlate(K, pts, t, o) {
  const { Q, D } = K; Q(pts, t < 0 ? 'mnMirD' : 'mnMir', Object.assign({ band: 2 }, o || {}));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const hy = y0 + (y1 - y0) * 0.55, inside = (x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
  for (let x = Math.ceil(x0) + 1; x < x1 - 1; x++) if (inside(x + 0.5, hy)) D(x, hy, t < 0 ? '#0a0e16' : '#18202e');
  for (let x = Math.ceil(x0) + 1; x < x1 - 1; x++) if (inside(x + 0.5, hy + 1) && (x & 1)) D(x, hy + 1, t < 0 ? '#1a2230' : '#3a4862');
  const gx = x0 + (x1 - x0) * 0.3;
  if (y1 - y0 >= 9) for (let i = 0; i < 3; i++) if (inside(gx + i + 0.5, y0 + 2.5 + i)) D(gx + i, y0 + 2 + i, t < 0 ? '#aebed4' : '#ffffff');
}
function mnGolemPaint(A, K, pose, ph, o) {
  const { E, L, Q, D, N } = K, back = o.view === 'back', dorm = pose === 'dorm';
  const walk = pose === 'walk', idle = pose === 'idle', wind = pose === 'wind', atk = pose === 'atk', chg = o.charge;
  const a = walk ? ph / 8 * Math.PI * 2 : 0, sw = walk ? Math.sin(a) : 0;
  const bob = walk ? -Math.abs(Math.cos(a)) * 1.5 + 0.8 : idle && (ph === 1 || ph === 2) ? 1 : 0;
  const lean = dorm ? 4 : chg ? 4 : wind ? -2 : atk ? [2, 4, 3][ph] : 0, sink = dorm ? 12 : 0;
  const hip = [0 + lean * 0.3, -24 + bob + sink], ch = [1 + lean, -36 + bob + sink * 0.9], shF = [-10 + lean, -44 + bob + sink * 0.85], shN = [11 + lean, -43 + bob + sink * 0.85];
  const hd = [4 + lean * 1.3, -49 + bob + sink * (dorm ? 1.05 : 0.8)];
  let ankF = walk ? [-6 - sw * 5, -Math.max(0, -Math.cos(a)) * 3] : atk || chg ? [-9, 0] : [-6, 0], ankN = walk ? [7 + sw * 5, -Math.max(0, Math.cos(a)) * 3] : atk || chg ? [10, 0] : [7, 0];
  let kF = [(hip[0] + ankF[0]) / 2 - 1, -12 + bob * 0.5], kN = [(hip[0] + ankN[0]) / 2 + 2, -12 + bob * 0.5];
  if (dorm) { kN = [9, -2]; ankN = [0, 0]; kF = [-8, -7]; ankF = [-10, 0]; }       // down on one knee
  const asw = walk ? -sw * 3 : 0;
  let haN, elN, ang;
  if (dorm) { haN = [shN[0] + 6, -2]; elN = [shN[0] + 5, shN[1] + 9]; ang = 0.15; }
  else if (wind) { haN = [shN[0] - 5, shN[1] - 11]; elN = [shN[0] - 2, shN[1] - 2]; ang = -2.25; }
  else if (atk) { haN = [[shN[0] + 7, shN[1] - 9], [shN[0] + 13, shN[1] + 5], [shN[0] + 9, shN[1] + 15]][ph]; elN = [[shN[0] + 5, shN[1] + 1], [shN[0] + 7, shN[1] + 5], [shN[0] + 5, shN[1] + 9]][ph]; ang = [-1.15, 0.15, 1.0][ph]; }
  else if (chg) { haN = [shN[0] + 7, shN[1] + 8]; elN = [shN[0] + 4, shN[1] + 7]; ang = -0.35; }
  else { haN = [shN[0] + 3 + asw, shN[1] + 18]; elN = [shN[0] + 4 + asw * 0.5, shN[1] + 9]; ang = -1.0; }
  const haF = dorm ? [shF[0] - 2, -1] : [shF[0] - 1 - asw, shF[1] + 17], elF = dorm ? [shF[0] - 3, shF[1] + 9] : [shF[0] - 3 - asw * 0.5, shF[1] + 9];
  const coreOn = !dorm, cc = coreOn ? (ph % 2 ? MN_CORE : MN_CORE2) : '#1a2230';
  const leg = (h, k, an, t) => {
    mnPlate(K, [[h[0] - 3.5, h[1] - 1], [h[0] + 3.5, h[1] - 1], [k[0] + 3, k[1] - 1], [k[0] - 3, k[1] - 1]], t);                 // cuisse
    mnPlate(K, [[k[0] - 3, k[1] + 1], [k[0] + 3.2, k[1] + 1], [an[0] + 2.8, an[1] - 3], [an[0] - 2.6, an[1] - 3]], t);           // greave
    E(k[0] + 0.5, k[1], 3.2, 2.6, t < 0 ? 'mnMirD' : 'mnMir', {}); D(k[0], k[1] - 1, t < 0 ? '#aebed4' : '#ffffff');              // poleyn
    Q([[an[0] - 3.5, an[1] - 3.5], [an[0] + 3, an[1] - 3.5], [an[0] + 8, an[1] - 0.5], [an[0] + 8, an[1] + 0.8], [an[0] - 4, an[1] + 0.8]], t < 0 ? 'mnMirD' : 'mnMir', { band: 1 });   // sabaton
    D(an[0] + 5, an[1] - 1, t < 0 ? '#5e6e86' : '#f4f8ff');
  };
  const arm = (sh, el, ha, t) => {
    L([sh, el], 3.2, 2.8, t < 0 ? 'mnMirD' : 'mnMir', { band: 2 }); L([el, ha], 2.8, 3, t < 0 ? 'mnMirD' : 'mnMir', { band: 2 });
    E(el[0], el[1], 2.8, 2.4, t < 0 ? 'mnMirD' : 'mnMir', {}); D(el[0] - 1, el[1] - 1, t < 0 ? '#aebed4' : '#ffffff');
    E(ha[0], ha[1], 3.4, 3, t < 0 ? 'mnMirD' : 'mnMir', {}); D(ha[0] - 1, ha[1] - 1.5, t < 0 ? '#aebed4' : '#ffffff'); D(ha[0] + 1, ha[1] + 1.5, '#0a0e16');
  };
  const weapon = (t) => {
    const ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca, h = haN, W = o.wpn;
    if (W === 'axe') {
      for (let d = -6; d <= 20; d += 0.5) { D(h[0] + ca * d, h[1] + sa * d, mnHex('mnWood', d % 2 ? 2 : 3)); D(h[0] + ca * d + nx, h[1] + sa * d + ny, mnHex('mnWood', 1)); }
      const top = mnDir(h, ang, 17);
      Q([[top[0] - ca * 3, top[1] - sa * 3], [top[0] - ca * 5 + nx * 7, top[1] - sa * 5 + ny * 7], [top[0] + ca * 5 + nx * 8, top[1] + sa * 5 + ny * 8], [top[0] + ca * 3, top[1] + sa * 3]], 'mnMir', { band: 2 });
      N(top[0] - ca * 5 + nx * 7.5, top[1] - sa * 5 + ny * 7.5, top[0] + ca * 5 + nx * 8.5, top[1] + sa * 5 + ny * 8.5, '#ffffff');
      Q([[top[0] - ca * 1.5 - nx, top[1] - sa * 1.5 - ny], [top[0] - nx * 4, top[1] - ny * 4], [top[0] + ca * 1.5 - nx, top[1] + sa * 1.5 - ny]], 'mnMirD', {});
    } else if (W === 'flail') {
      for (let d = -3; d <= 8; d += 0.5) { D(h[0] + ca * d, h[1] + sa * d, mnHex('mnWood', 3)); D(h[0] + ca * d + nx, h[1] + sa * d + ny, mnHex('mnWood', 1)); }
      const e = mnDir(h, ang, 8), off = dorm ? [5, 1] : wind ? [-7, 6] : atk ? [[-6, -8], [12, 1], [7, 8]][ph] : chg ? [-8, 2] : [1, 10];
      const b = [e[0] + off[0], e[1] + off[1]];
      for (let t2 = 0; t2 <= 1; t2 += 0.1) D(e[0] + (b[0] - e[0]) * t2, e[1] + (b[1] - e[1]) * t2, t2 * 10 % 2 < 1 ? '#9aacc4' : '#2e3a4c');
      E(b[0], b[1], 3.6, 3.6, 'mnMir', { band: 2 });
      for (const [dx, dy] of [[0, -5], [5, 0], [0, 5], [-5, 0], [3.5, -3.5], [-3.5, 3.5], [3.5, 3.5], [-3.5, -3.5]]) D(b[0] + dx, b[1] + dy, Math.abs(dx) + Math.abs(dy) > 6 ? '#9aacc4' : '#f4f8ff');
      D(b[0] - 1, b[1] - 1, '#ffffff'); D(b[0] - 2, b[1] - 1, '#ffffff');
    } else {   // a broad sword, mirror-bright
      Q([[h[0] + ca * 2 + nx * 1.6, h[1] + sa * 2 + ny * 1.6], [h[0] + ca * 20 + nx * 1.2, h[1] + sa * 20 + ny * 1.2], [h[0] + ca * 23, h[1] + sa * 23], [h[0] + ca * 20 - nx * 1.2, h[1] + sa * 20 - ny * 1.2], [h[0] + ca * 2 - nx * 1.6, h[1] + sa * 2 - ny * 1.6]], 'mnMir', { band: 1 });
      for (let d = 3; d < 20; d++) D(h[0] + ca * d, h[1] + sa * d, d % 5 === 0 ? '#ffffff' : '#9aacc4');     // the fuller
      for (let k = -3.5; k <= 3.5; k += 0.5) D(h[0] + ca * 1.5 + nx * k, h[1] + sa * 1.5 + ny * k, Math.abs(k) > 3 ? mnHex('mnGold', 4) : mnHex('mnGold', 2));
      for (let d = -1; d >= -3; d--) D(h[0] + ca * d, h[1] + sa * d, mnHex('mnLea', 3));
      D(h[0] - ca * 4, h[1] - sa * 4, mnHex('mnGold', 3));
    }
  };
  const tower = (t) => {    // the tower shield: a slab of mirror with a riveted rim
    const c = chg ? [ch[0] + 11, ch[1] + 4] : back ? [ch[0] - 7, ch[1] + 6] : [ch[0] - 5 + (wind ? -2 : 0), ch[1] + 7];
    const pts = [[c[0] - 5, c[1] - 11], [c[0] + 5, c[1] - 12], [c[0] + 5.5, c[1] + 8], [c[0], c[1] + 12], [c[0] - 5.5, c[1] + 8]];
    if (back) { Q(pts, 'mnIron', { band: 2 }); N(c[0] - 4, c[1] - 4, c[0] + 4, c[1] - 4, mnHex('mnLea', 3)); N(c[0] - 4, c[1] + 3, c[0] + 4, c[1] + 3, mnHex('mnLea', 3)); return; }
    Q(pts.map(([x, y]) => [c[0] + (x - c[0]) * 1.15, c[1] + (y - c[1]) * 1.08]), 'mnIron', {});
    mnPlate(K, pts, t);
    for (const [dx, dy] of [[-4, -10], [4, -11], [-4.5, 7], [4.5, 7], [0, 10]]) D(c[0] + dx, c[1] + dy, '#f4f8ff');
    for (let i = 0; i < 4; i++) D(c[0] - 3 + i, c[1] - 8 + i * 2, '#ffffff');    // a long reflected streak
    // what it reflects: a small dark shape of the one standing before it
    D(c[0] + 1, c[1] + 2, '#0a0e16'); D(c[0] + 1, c[1] + 3, '#0a0e16'); D(c[0], c[1] + 3, '#0a0e16'); D(c[0] + 2, c[1] + 3, '#0a0e16'); D(c[0] + 1, c[1] + 4, '#0a0e16');
  };
  const torso = () => {
    // tassets over the hips, then the barrel of the breastplate, a belly band, the grille over the soul-core
    mnPlate(K, [[hip[0] - 7, hip[1] - 5], [hip[0] + 7, hip[1] - 5], [hip[0] + 8, hip[1] + 3], [hip[0] + 1, hip[1] + 4], [hip[0] - 8, hip[1] + 3]], 0);
    mnPlate(K, [[ch[0] - 10, ch[1] - 8], [ch[0] - 4, ch[1] - 11], [ch[0] + 6, ch[1] - 11], [ch[0] + 11, ch[1] - 7], [ch[0] + 10, ch[1] + 5], [ch[0] + 5, ch[1] + 9], [ch[0] - 5, ch[1] + 9], [ch[0] - 10, ch[1] + 4]], 0, { band: 3 });
    Q([[ch[0] - 9, ch[1] + 6], [ch[0] + 9, ch[1] + 5], [ch[0] + 8, ch[1] + 8], [ch[0] - 8, ch[1] + 9]], 'mnMirD', {});
    for (let i = 0; i < 5; i++) D(ch[0] - 7 + i * 3.6, ch[1] + 7, '#aebed4');
    if (!back) {
      const g = [ch[0] + 2, ch[1] - 2];
      Q([[g[0] - 3.5, g[1] - 4], [g[0] + 3.5, g[1] - 4], [g[0] + 3.5, g[1] + 3.5], [g[0] - 3.5, g[1] + 3.5]], '#07090e', { flat: true });
      E(g[0], g[1], 2.6, 2.6, cc, { flat: true, contour: false }); if (coreOn) { E(g[0], g[1], 1.4, 1.4, MN_CORE2, { flat: true, contour: false }); D(g[0], g[1], '#ffffff'); }
      for (let i = 0; i < 3; i++) N(g[0] - 2 + i * 2, g[1] - 4, g[0] - 2 + i * 2, g[1] + 3, '#4c5a72');
      for (const [dx, dy] of [[-8, -6], [8, -6], [-8, 2], [8, 2], [-3, -9], [5, -9]]) D(ch[0] + dx, ch[1] + dy, '#f4f8ff');
    } else {
      N(ch[0], ch[1] - 10, ch[0], ch[1] + 6, '#1e2634');
      for (let i = 0; i < 4; i++) D(ch[0] - 6 + i * 4, ch[1] - 3, '#f4f8ff');
    }
  };
  const pauldron = (sh, t, far) => {
    E(sh[0] + (far ? -1 : 1), sh[1] - 1, 6, 4.6, t < 0 ? 'mnMirD' : 'mnMir', { band: 2 });
    E(sh[0] + (far ? -1 : 1), sh[1] + 2, 5.4, 2, t < 0 ? 'mnMirD' : 'mnMir', { tone: -1 });
    L([[sh[0] + (far ? -2 : 2), sh[1] - 4], [sh[0] + (far ? -3 : 4), sh[1] - 9]], 1.3, 0.4, t < 0 ? 'mnMirD' : 'mnMir', {});
    D(sh[0] - 2, sh[1] - 3, t < 0 ? '#aebed4' : '#ffffff'); D(sh[0] - 1, sh[1] - 4, t < 0 ? '#aebed4' : '#ffffff'); D(sh[0] + 3, sh[1] - 1, '#18202e'); D(sh[0] + 4, sh[1] - 1, '#18202e');
  };
  const helm = () => {
    const [x, y] = hd;
    mnPlate(K, [[x - 5, y + 4], [x - 5.5, y - 3], [x - 3, y - 6.5], [x + 3, y - 6.5], [x + 5.5, y - 3], [x + 6, y + 4], [x + 1, y + 6]], 0);
    N(x - 1, y - 6, x - 1, y + 5, '#9aacc4');       // the crest ridge
    if (!back) {
      N(x - 1, y - 1, x + 5.5, y - 1, '#07090e'); N(x - 1, y, x + 5.5, y, '#07090e');
      if (!dorm) { N(x, y - 1, x + 5, y - 1, '#9fe8ff'); D(x + 3, y - 1, '#ffffff'); D(x + 2, y, MN_CORE); }
      for (let i = 0; i < 3; i++) D(x + 3, y + 2 + i, '#07090e');          // breaths
    }
  };
  if (!back) {
    if (!(o.shield)) { arm(shF, elF, haF, -1); }
    else arm(shF, elF, haF, -1);
    leg(hip, kF, ankF, -1);
    torso();
    leg(hip, kN, ankN, 0);
    pauldron(shF, -1, true);
    helm();
    if (o.shield) tower(0);
    arm(shN, elN, haN, 0);
    weapon(0);
    pauldron(shN, 0, false);
  } else {
    arm(shN, elN, haN, -1); weapon(-1);
    leg(hip, kN, ankN, -1);
    leg(hip, kF, ankF, 0);
    torso();
    pauldron(shN, -1, false);
    helm();
    arm(shF, elF, haF, 0);
    pauldron(shF, 0, true);
    if (o.shield) tower(0);
  }
  if (dorm) { for (const [x, y] of [[-3, -30], [5, -22], [-6, -18]]) { D(x, y, mnHex('mnRust', 3)); D(x + 1, y + 1, mnHex('mnRust', 2)); } }
}
function mnGolemFrame(pose, ph, o) {
  const key = 'gol|' + pose + '|' + ph + '|' + o.view + '|' + (o.wpn || 'sword') + '|' + (o.shield ? 1 : 0) + '|' + (o.charge ? 1 : 0);
  return mnFrame(key, 84, 78, 36, 74, A => mnGolemPaint(A, mnKit(A, 36, 74, 1), pose, ph, o));
}

// ------------------------------------------------------------------- the golem's flying tower shield (face on)
function mnShieldFrame() {
  return mnFrame('tshield', 18, 30, 9, 27, A => {
    const K = mnKit(A, 9, 27, 1), c = [0, -13];
    const pts = [[c[0] - 6, c[1] - 12], [c[0] + 6, c[1] - 13], [c[0] + 6.5, c[1] + 9], [c[0], c[1] + 13], [c[0] - 6.5, c[1] + 9]];
    K.Q(pts.map(([x, y]) => [c[0] + x * 1.12, c[1] + (y - c[1]) * 1.06]), 'mnIron', {});
    mnPlate(K, pts, 0);
    for (const [dx, dy] of [[-5, -11], [5, -12], [-5.5, 8], [5.5, 8], [0, 11]]) K.D(c[0] + dx, c[1] + dy, '#f4f8ff');
    for (let i = 0; i < 4; i++) K.D(c[0] - 3 + i, c[1] - 8 + i * 2, '#ffffff');
  });
}

// =================================================================== wisps: souls you carry
// A soul-flame: a bright core in a teardrop of light with a tail that curls and flickers. Revenants burn cold
// blue-white, beam wisps gold, prism wisps violet with a shifting spark of colour.
const MN_WISP = {
  rev: ['#0e2a44', '#2e6a9a', '#6ab4e8', '#bfe8ff', '#ffffff'],
  beam: ['#3a2206', '#8a5a14', '#e0a838', '#ffe2a0', '#ffffff'],
  prism: ['#24123e', '#5a3a96', '#a882e0', '#e6d4ff', '#ffffff'],
  gold: ['#3a2206', '#8a5a14', '#e0a838', '#ffe2a0', '#ffffff']
};
function mnWispFrame(kind, ph) {
  return mnFrame('wisp|' + kind + '|' + ph, 11, 15, 5, 9, A => {
    const C = MN_WISP[kind] || MN_WISP.rev, t = ph / 4 * Math.PI * 2, sw = Math.round(Math.sin(t) * 1.2), sw2 = Math.round(Math.sin(t + 1.6) * 1.2);
    // the tail: curls down and away
    const tail = [[5, 9], [5 + sw * 0.5, 11], [4 + sw, 12], [4 + sw2, 13], [5 + sw2, 14]];
    tail.forEach(([x, y], i) => A.px(x, y, C[i < 2 ? 2 : i < 4 ? 1 : 0]));
    A.px(6 + sw * 0.5, 11, C[1]);
    // the teardrop of flame, its tip licking up
    for (const [x, y, c] of [[5, 2 + (ph % 2), 1], [4, 3, 1], [5, 3, 2], [6, 3, 1], [3, 4, 1], [4, 4, 2], [5, 4, 3], [6, 4, 2], [7, 4, 1], [3, 5, 2], [4, 5, 3], [5, 5, 4], [6, 5, 3], [7, 5, 2], [3, 6, 2], [4, 6, 3], [5, 6, 4], [6, 6, 3], [7, 6, 2], [3, 7, 1], [4, 7, 2], [5, 7, 3], [6, 7, 2], [7, 7, 1], [4, 8, 1], [5, 8, 2], [6, 8, 1]]) A.px(x, y, C[c]);
    A.px(5, 5, '#ffffff'); A.px(4, 5, C[4]); A.px(5, 6, C[4]);
    A.px(5 + (ph % 2 ? 1 : -1), 1 + (ph % 2), C[0]);
    if (kind === 'prism') A.px(3 + (ph % 3), 4 + (ph % 2), ['#ffb0d0', '#b0ffd0', '#b0d0ff', '#fff0a0'][ph]);
  }, null);
}
// the great wisp: many souls crushed into one, a burning skull of light in a mane of flame
function mnGreatFrame(R, ph) {
  R = Math.max(3, Math.min(10, Math.round(R)));
  const W = R * 4 + 6, H = R * 5 + 6, ox = W >> 1, oy = Math.round(H * 0.58);
  return mnFrame('great|' + R + '|' + ph, W, H, ox, oy, A => {
    const C = MN_WISP.rev, t = ph / 4 * Math.PI * 2;
    // mane: flame tongues licking up and back
    for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.38, L = R * (1.5 + 0.35 * Math.sin(t + i * 1.7)); A.limb([[ox + Math.cos(a) * R * 0.5, oy + Math.sin(a) * R * 0.5], [ox + Math.cos(a) * L - Math.sin(t + i) * 1, oy + Math.sin(a) * L]], R * 0.32, 0.5, '#2e6a9a', { flat: true, contour: false }); }
    for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.42, L = R * (1.1 + 0.25 * Math.sin(t * 1.3 + i * 2.1)); A.limb([[ox + Math.cos(a) * R * 0.3, oy + Math.sin(a) * R * 0.3], [ox + Math.cos(a) * L, oy + Math.sin(a) * L]], R * 0.24, 0.5, '#6ab4e8', { flat: true, contour: false }); }
    A.ell(ox, oy, R, R, '#6ab4e8', { flat: true, contour: false });
    A.ell(ox - R * 0.12, oy - R * 0.12, R * 0.78, R * 0.78, '#bfe8ff', { flat: true, contour: false });
    A.ell(ox - R * 0.15, oy - R * 0.2, R * 0.5, R * 0.5, '#ffffff', { flat: true, contour: false });
    // the skull that forms in it once it is big enough: slanted sockets burning dark, a howling jaw with fangs
    if (R >= 5) {
      const ex = Math.round(R * 0.42), ey = Math.round(oy - R * 0.18), e = Math.max(2, Math.round(R * 0.28));
      for (const sx of [-1, 1]) for (let j = 0; j < e; j++) for (let i = 0; i < e + 1 - j; i++) A.px(ox + sx * (ex - i) + (sx < 0 ? 0 : 0), ey + j - (i === 0 ? 1 : 0), j === e - 1 && i === 1 ? '#6ab4e8' : '#0e2a44');
      const mh = Math.round(R * 0.55), my = Math.round(oy + R * 0.18);
      for (let j = 0; j < mh; j++) for (let i = -1; i <= 1; i++) if (!(Math.abs(i) === 1 && (j === 0 || j === mh - 1))) A.px(ox + i, my + j, '#0e2a44');
      A.px(ox - 1, my + 1, '#ffffff'); A.px(ox + 1, my + 1, '#ffffff'); A.px(ox, my + mh - 2, '#bfe8ff');
      A.px(ox - ex, ey + e, '#2e6a9a'); A.px(ox + ex, ey + e, '#2e6a9a');
    } else { A.px(ox - 1, oy, '#0e2a44'); A.px(ox + 1, oy, '#0e2a44'); }
  }, [14, 40, 70]);
}

// =================================================================== mirror-steles, the mirror slab, the soul lantern
// Iron Pillars rise as tall steles faced with silvered mirror in a gilt-iron frame, with a pointed arch; the
// Anvil falls as a great slab of mirror bound in iron. They keep their work: beams and the lance bounce off them.
function mnMirrorFace(K, x0, y0, x1, y1, seed) {
  const { Q, D } = K;
  Q([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 'mnGlass', { band: 1 });
  // the reflection: the sky light above, a dark horizon, a pale band of ground; one hard streak
  for (let x = Math.ceil(x0) + 1; x < x1 - 1; x++) { D(x, y0 + (y1 - y0) * 0.55, '#0c1420'); if ((x + seed) & 1) D(x, y0 + (y1 - y0) * 0.55 + 1, '#24364c'); D(x, y0 + (y1 - y0) * 0.8, '#4a6a8a'); }
  const n = Math.min(9, (y1 - y0) * 0.45); for (let i = 0; i < n; i++) { D(x0 + 1.5 + i * 0.5, y0 + 2 + i, '#ffffff'); if (i > 1 && i < n - 2) D(x0 + 3.5 + i * 0.5, y0 + 2 + i, '#8eb4d4'); }
  D(x1 - 2, y0 + 2, '#e8f6ff');
}
function mnSteleFrame(bone) {
  return mnFrame('stele|' + (bone ? 1 : 0), 18, 40, 9, 37, A => {
    const K = mnKit(A, 9, 37, 1), { Q, E, D, L, N } = K;
    if (bone) {   // a column of stacked vertebrae and a skull at its crown
      for (let i = 0; i < 8; i++) { const y = -2 - i * 3.5; E(0, y, 3.6 - i * 0.12, 1.8, 'mnBone', {}); D(-2, y - 1, mnHex('mnBone', 4)); L([[3, y], [5, y + 1]], 0.7, 0.4, 'mnBone', {}); L([[-3, y], [-5, y + 1]], 0.7, 0.4, 'mnBone', { tone: -1 }); }
      E(0, -31, 3.4, 3.2, 'mnBone', {}); D(1, -31, MN_GAP); D(-1, -31, MN_GAP); D(1, -31, MN_EYE); D(0, -29, MN_GAP);
      return;
    }
    Q([[-7, -3], [7, -3], [8, 0], [-8, 0]], 'mnIron', {});                    // the plinth
    Q([[-6, -32], [-3, -35], [0, -36.5], [3, -35], [6, -32], [6, -3], [-6, -3]], 'mnIron', { band: 2 });   // the frame
    mnMirrorFace(K, -4.5, -31, 4.5, -4, 3);
    Q([[-4.5, -31], [-2.5, -33.5], [0, -34.5], [2.5, -33.5], [4.5, -31]], 'mnGlass', {});
    N(-6, -32, 0, -36.5, mnHex('mnGold', 3)); N(0, -36.5, 6, -32, mnHex('mnGold', 2));
    for (const y of [-26, -18, -10]) { D(-5.5, y, mnHex('mnGold', 4)); D(5.5, y, mnHex('mnGold', 2)); }
    D(0, -36, mnHex('mnGold', 4)); D(0, -37, mnHex('mnGold', 3));
  });
}
function mnSlabFrame() {
  return mnFrame('slab', 36, 34, 18, 30, A => {
    const K = mnKit(A, 18, 30, 1), { Q, D, N } = K;
    // top face, then the front: a thick slab of mirror-steel bound in black iron, standing where it fell
    Q([[-14, -22], [0, -27], [15, -22], [1, -17]], 'mnMir', { band: 2 });
    Q([[-14, -22], [1, -17], [1, 2], [-14, -3]], 'mnIron', { band: 2 });
    Q([[1, -17], [15, -22], [15, -3], [1, 2]], 'mnIron', { tone: -1, band: 2 });
    mnMirrorFace(K, -12, -18.5, -0.5, -2.5, 1);
    mnMirrorFace(K, 2.5, -19, 13, -3.5, 2);
    N(-14, -22, 1, -17, '#ffffff'); N(1, -17, 15, -22, '#9aacc4');
    for (const [x, y] of [[-13, -20], [-13, -5], [0, -16], [0, 0], [14, -20], [14, -5]]) D(x, y, mnHex('mnIron', 4));
    D(-4, -24, '#ffffff'); D(-3, -24, '#ffffff'); D(6, -23, '#ffffff');
  });
}
function mnLanternFrame(dim, ph) {
  return mnFrame('lantern|' + (dim ? 1 : 0) + '|' + ph, 20, 40, 8, 37, A => {
    const K = mnKit(A, 8, 37, 1), { Q, E, D, L, N } = K;
    Q([[-5, -2], [5, -2], [6, 0], [-6, 0]], 'mnIron', {});                   // a spiked iron foot
    L([[0, 0], [0, -30]], 1.1, 0.9, 'mnWood', {});                           // the pole
    L([[0, -29], [5, -31], [7, -30]], 0.7, 0.6, 'mnIron', {});                // the crook
    for (let i = 0; i < 4; i++) D(0, -4 - i * 7, mnHex('mnWood', 4));
    // the cage lantern hanging from the crook, the soul-flame inside
    const cx = 7, cy = -22 + (ph % 2 ? 0.5 : 0);
    N(7, -30, cx, cy - 5, mnHex('mnIron', 2));
    Q([[cx - 3.5, cy - 4], [cx + 3.5, cy - 4], [cx + 2.5, cy - 5.5], [cx - 2.5, cy - 5.5]], 'mnIron', {});
    Q([[cx - 3.5, cy - 4], [cx + 3.5, cy - 4], [cx + 3.5, cy + 4], [cx - 3.5, cy + 4]], dim ? '#3a2a14' : '#e0a838', { flat: true });
    if (!dim) { E(cx, cy + 0.5, 2.2, 3, '#ffe2a0', { flat: true, contour: false }); E(cx, cy + 1, 1, 1.6, '#ffffff', { flat: true, contour: false }); D(cx + (ph % 2 ? 1 : -1), cy - 3, '#ffe2a0'); }
    for (const x of [-3.5, 0, 3.5]) N(cx + x, cy - 4, cx + x, cy + 4, mnHex('mnIron', 1));
    Q([[cx - 3.5, cy + 4], [cx + 3.5, cy + 4], [cx + 1.5, cy + 6], [cx - 1.5, cy + 6]], 'mnIron', {});
    D(cx, cy + 7, mnHex('mnIron', 3));
  });
}

// =================================================================== drawing: the giants, the Animancer's summons
// the pose of a big minion from how it moved since the last frame and where its blow stands
function mnGiantPose(o, atk, stride) {
  const mv = o._mnx == null ? 0 : Math.hypot(o.x - o._mnx, o.y - o._mny); o._mnx = o.x; o._mny = o.y; o._mnw = (o._mnw || 0) + mv;
  const view = mnView(o, mv);
  if (atk) { const k = atk.t / atk.dur; return k < 0.5 ? ['wind', 0, view] : ['atk', k < 0.6 ? 0 : k < 0.72 ? 1 : 2, view]; }
  if (mv > 0.004) return ['walk', Math.floor(o._mnw * (stride || 4.5)) % 8, view];
  return ['idle', Math.floor(G.time * 2 + (o.x * 3 % 4 + 4)) % 4, view];
}
{
  const _dg = drawGiant;
  drawGiant = function (kind, s, o, x, y, face, flash, alpha, k, lift) {
    if (!o || (kind !== 'igolem' && kind !== 'colossus')) return _dg(kind, s, o, x, y, face, flash, alpha, k, lift);
    const p = iso(x, y), A0 = alpha == null ? 1 : alpha;
    if (kind === 'igolem') {
      const dorm = o.state === 'dormant', chg = o.state === 'charge' || o.state === 'chargeWind';
      let [pose, ph, view] = mnGiantPose(o, o.atk, 4.2);
      if (dorm) { pose = 'dorm'; ph = 0; view = 'front'; }
      else if (o.state === 'chargeWind') { pose = 'idle'; ph = 0; }
      const fr = mnGolemFrame(pose, ph, { view, wpn: P.gweapon || 'sword', shield: !!o.shield, charge: chg && !o.atk });
      return mnBlit(fr, p.sx, p.sy - (lift || 0), face, flash, A0 * (dorm ? 0.92 : 1));
    }
    const [pose, ph, view] = mnGiantPose(o, o.atk, 3.6), fr = mnColFrame(P.cweapon || 'shield', pose, ph, view, (k || 1.5) / 1.5);
    return mnBlit(fr, p.sx, p.sy - (lift || 0), face, flash, A0);
  };
  // the weapons are painted into the golem and the Colossus now; only the sweep of the blow is drawn here
  drawGolemWeapon = function (g, p, dorm) {
    if (dorm || !g.atk) return;
    const k = g.atk.t / g.atk.dur, f = g.face; if (!(k > 0.5 && k < 0.85)) return;
    const hx = p.sx + f * 12, hy = p.sy - 32, ang = -2.3 + 3.1 * Math.min(1, (k - 0.5) / 0.15), L = 22;
    ctx.strokeStyle = `rgba(232,240,255,${0.6 * (1 - (k - 0.5) / 0.35)})`; ctx.lineWidth = 2; ctx.beginPath();
    if (f > 0) ctx.arc(hx, hy, L, -2.3, ang); else ctx.arc(hx, hy, L, Math.PI + 2.3, Math.PI - ang, true);
    ctx.stroke(); ctx.lineWidth = 1;
  };
  drawColossusWeapon = function (c, p, k) {
    if (!c.atk) return;
    const kk = c.atk.t / c.atk.dur, f = c.face; if (!(kk > 0.5 && kk < 0.85)) return;
    const s = k / 1.5, hx = p.sx + f * 15 * s, hy = p.sy - 44 * s, ang = -2.2 + 3 * Math.min(1, (kk - 0.5) / 0.15), L = 24 * s;
    ctx.strokeStyle = `rgba(232,226,208,${0.55 * (1 - (kk - 0.5) / 0.35)})`; ctx.lineWidth = 2; ctx.beginPath();
    if (f > 0) ctx.arc(hx, hy, L, -2.2, ang); else ctx.arc(hx, hy, L, Math.PI + 2.2, Math.PI - ang, true);
    ctx.stroke(); ctx.lineWidth = 1;
  };
  // the old tower-shield sprite is painted into the golem now; the thrown shield has its own frame
  SPR.towerShield = { c: mkCanvas(1, 1), f: mkCanvas(1, 1), fl: mkCanvas(1, 1), flf: mkCanvas(1, 1), w: 1, h: 1 };
  // mirror-steles (and bone pillars) rising out of the ground
  drawPillar = function (pl) {
    const p = iso(pl.x, pl.y), k = pl.rise > 0 ? 1 - pl.rise / 0.22 : 1, sx = Math.round(p.sx), sy = Math.round(p.sy);
    if (pl.life < 1.5 && pl.rise <= 0 && Math.floor(G.time * 8) % 2) return;
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(sx, sy + 1, 7, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    const fr = mnSteleFrame(!!pl.bone), h = Math.round(fr.h * k);
    ctx.save(); ctx.beginPath(); ctx.rect(sx - fr.w, sy + 3 - 60, fr.w * 2, 60); ctx.clip();
    mnBlit(fr, sx, sy + (fr.h - h), 1, false, 1);
    ctx.restore();
    if (pl.rise > 0) { ctx.fillStyle = '#8f8a7c'; for (let i = 0; i < 4; i++) ctx.fillRect(sx - 7 + i * 4, sy - 1 - (i % 2), 2, 1); }
  };
}
// the Soul Lantern, its wisps and the echoes of the dead: drawn in place of the old list items (see the wrapper below)
function mnDrawWisp(w) {
  const rgb = { rev: '160,215,255', beam: '255,226,160', prism: '225,200,255' }[w.kind] || '160,215,255';
  ctx.globalCompositeOperation = 'lighter';
  w.trail.forEach((q, i) => { const p = iso(q.x, q.y); ctx.fillStyle = `rgba(${rgb},${0.1 + i * 0.05})`; ctx.fillRect(Math.round(p.sx), Math.round(p.sy - q.z), 2, 2); });
  const p = iso(w.x, w.y), sx = Math.round(p.sx), sy = Math.round(p.sy - w.z);
  glow(sx + .5, sy + .5, w.kind !== 'rev' ? 8 : 7, rgb, w.state === 'drift' ? 0.45 : 0.7);
  ctx.globalCompositeOperation = 'source-over';
  const fr = mnWispFrame(w.kind || 'rev', Math.floor(G.time * 10 + (w.wt || 0) * 3) % 4);
  ctx.drawImage(fr.c, sx - fr.ox, sy - fr.oy + 4);
}
function mnDrawGreat(gw) {
  const p = iso(gw.x, gw.y), sx = p.sx, sy = p.sy - gw.z, r = 3 + gw.size * 0.45;
  if (gw.state === 'hunt') { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy + 1, r * 0.9, r * 0.45, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, r * 3, '160,215,255', 0.5); ctx.globalCompositeOperation = 'source-over';
  const fr = mnGreatFrame(r * (1 + 0.08 * Math.sin(G.time * 9)), Math.floor(G.time * 9) % 4);
  ctx.drawImage(fr.c, Math.round(sx - fr.ox), Math.round(sy - fr.oy));
  for (let i = 0; i < Math.min(12, gw.size); i++) { const a = G.time * 3 + i / Math.min(12, gw.size) * Math.PI * 2; ctx.fillStyle = i % 3 ? '#bfe8ff' : '#ffffff'; ctx.fillRect(Math.round(sx + Math.cos(a) * r * 1.3), Math.round(sy + Math.sin(a) * r * 0.7), 1, 1); }
  if (gw.state === 'hunt') { const k = clamp(gw.life / (WS.condLife() + 0.15 * gw.size), 0, 1); ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(sx - 8), Math.round(sy - r * 1.8 - 6), 16, 2); ctx.fillStyle = '#d8f3ff'; ctx.fillRect(Math.round(sx - 8), Math.round(sy - r * 1.8 - 6), Math.round(16 * k), 2); }
  else txt(String(gw.size), Math.round(sx), Math.round(sy - r * 1.8 - 3), '#d8f3ff', 'center');
}
function mnDrawTotem(t) {
  const q = iso(t.x, t.y), sx = Math.round(q.sx), sy = Math.round(q.sy), fl = t.life < 2 && Math.floor(G.time * 8) % 2;
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(sx, sy + 1, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  mnBlit(mnLanternFrame(fl, Math.floor(G.time * 5) % 2), sx, sy, 1, false, 1);
  ctx.globalCompositeOperation = 'lighter'; glow(sx + 7, sy - 22, 14, '255,226,160', fl ? 0.2 : 0.55); ctx.globalCompositeOperation = 'source-over';
  for (const w of t.wisps) { const p = iso(w.x, w.y); ctx.globalCompositeOperation = 'lighter'; glow(p.sx, p.sy - w.z, 5, '255,226,160', 0.55); ctx.globalCompositeOperation = 'source-over'; const fr = mnWispFrame('gold', Math.floor(G.time * 10 + w.x * 3) % 4); ctx.drawImage(fr.c, Math.round(p.sx) - fr.ox, Math.round(p.sy - w.z) - fr.oy + 4); }
}
function mnDrawFlyShield(s) {
  const p = iso(s.x, s.y), fr = mnShieldFrame(), sq = Math.abs(Math.cos(s.spin));
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(p.sx, p.sy + 1, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
  const w = Math.max(2, Math.round(fr.w * sq));
  ctx.drawImage(Math.cos(s.spin) < 0 ? fr.f : fr.c, Math.round(p.sx - w / 2), Math.round(p.sy - 30), w, fr.h);
  ctx.globalCompositeOperation = 'lighter'; glow(p.sx, p.sy - 16, 10, '216,243,255', 0.3); ctx.globalCompositeOperation = 'source-over';
}
// an echo: the 32-bit creature it was, drawn as a pale spectre of cold light
function mnEchoFrame(e) {
  const type = e.b && e.b.spr; if (typeof M32 === 'undefined' || !M32[type]) return null;
  const mv = e._px == null ? 0 : Math.hypot(e.x - e._px, e.y - e._py); e._px = e.x; e._py = e.y; e._wd = (e._wd || 0) + mv;
  let pose = 'idle', ph = Math.floor(G.time * 2.2 + (e.x * 7 % 4 + 4)) % 4;
  if (e.state === 'windup') { pose = 'wind'; ph = Math.min(2, Math.floor(clamp((e.t || 0) / 0.5, 0, 0.999) * 3)); }
  else if (e.state === 'recover' && (e.t || 0) < 0.35) { pose = 'atk'; ph = Math.min(2, Math.floor((e.t || 0) / 0.12)); }
  else if (mv > 0.004) { pose = 'walk'; ph = Math.floor(e._wd * ((M32WALK && M32WALK[type]) || 5.2)) % 8; }
  const view = mnView(e, mv), fr = monFrame(type, 'echo', Object.assign({}, MPAL[type] || {}), pose, ph, view);
  return mnGhost(fr, '170,220,255', 'echo');
}
function mnDrawEcho(e) {
  shadow(e.x, e.y, e.r);
  const q = iso(e.x, e.y), fr = mnEchoFrame(e);
  ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 12, 14, '200,235,255', 0.25); ctx.globalCompositeOperation = 'source-over';
  let r;
  if (fr) r = mnBlit(fr, q.sx, q.sy, e.face || 1, e.hurt > 0, 0.72 + 0.1 * Math.sin(G.time * 4 + e.x));
  else { const spr = echoSprite(e); r = drawSpr(spr, e.x, e.y, e.face, e.hurt > 0, 0.72 + 0.1 * Math.sin(G.time * 4 + e.x)); }
  if (e.hp < e.max) { ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(q.sx - 6), r.y - 3, 12, 2); ctx.fillStyle = '#bfe8ff'; ctx.fillRect(Math.round(q.sx - 6), r.y - 3, Math.round(12 * e.hp / e.max), 2); }
}
// the Animancer's phantoms (afterimages): the 32-bit hero, washed white
function mnDrawPhantom(ph) {
  const fr = heroFrame(P.cls, 'walk', 2, 'front'), q = iso(ph.x, ph.y);
  mnBlit(fr, q.sx, q.sy, ph.face || 1, true, 0.25 + 0.3 * (1 - ph.t / 0.8));
}
{
  // renderWorld lists these summons with the old art; hide them from it for that one call, then list them here
  const _rw = renderWorld;
  renderWorld = function (list) {
    const W0 = P.wisps, GW = G.great, TO = G.totems, EC = G.echoes, FS = G.flyShield, PH = G.phantoms;
    P.wisps = []; G.great = null; G.totems = []; G.echoes = []; G.flyShield = null; G.phantoms = [];
    try { _rw(list); } finally { P.wisps = W0; G.great = GW; G.totems = TO; G.echoes = EC; G.flyShield = FS; G.phantoms = PH; }
    if (!P.dead) for (const w of P.wisps) list.push({ d: w.x + w.y + 0.01, f: () => mnDrawWisp(w) });
    if (G.great) { const gw = G.great; list.push({ d: gw.x + gw.y + 0.02, f: () => mnDrawGreat(gw) }); }
    for (const t of G.totems) list.push({ d: t.x + t.y, f: () => mnDrawTotem(t) });
    for (const e of G.echoes) list.push({ d: e.x + e.y, f: () => mnDrawEcho(e) });
    if (G.flyShield) { const s = G.flyShield; list.push({ d: s.x + s.y, f: () => mnDrawFlyShield(s) }); }
    for (const ph of G.phantoms) list.push({ d: ph.x + ph.y, f: () => mnDrawPhantom(ph) });
  };
  // the Anvil falls as a great mirror slab
  const _r14 = render14;
  render14 = function (list) {
    const AN = G.anvils; G.anvils = [];
    try { _r14(list); } finally { G.anvils = AN; }
    for (const a of G.anvils) list.push({ d: a.x + a.y, f: () => {
      const q = iso(a.x, a.y), k = a.fall > 0 ? Math.max(0, a.fall - a.delay) / a.fallMax : 0, z = Math.max(0, k) * 130;
      if (a.fall - a.delay > a.fallMax) return;
      ctx.fillStyle = `rgba(0,0,0,${0.25 + 0.3 * (1 - k)})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy + 1, 13 * (1.2 - k * 0.6), 6.5 * (1.2 - k * 0.6), 0, 0, 6.28); ctx.fill();
      if (a.fall <= 0 && a.life < 1.5 && Math.floor(G.time * 8) % 2) return;
      const fr = mnSlabFrame(), r = mnBlit(fr, q.sx, q.sy - z, 1, false, 1);
      if (z > 0) { ctx.strokeStyle = 'rgba(207,214,224,0.35)'; ctx.beginPath(); ctx.moveTo(q.sx - 8, r.y); ctx.lineTo(q.sx - 8, r.y - 16); ctx.moveTo(q.sx + 8, r.y); ctx.lineTo(q.sx + 8, r.y - 12); ctx.stroke(); }
    } });
  };
}

// =================================================================== the Ossurarch's bone spells, drawn as crisp pixel bone
// a pixel line of bone: a dark outline, a core, a lit upper edge (for spears, ribs, spikes; they point any way)
function mnPxStroke(pts, core, lite, out, w) {
  const P2 = []; w = w || 1;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let k = 0; k <= n; k++) P2.push([Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n)]);
  }
  ctx.fillStyle = out || '#0e0d12'; for (const [x, y] of P2) ctx.fillRect(x - 1, y - 1, w + 2, w + 2);
  ctx.fillStyle = core; for (const [x, y] of P2) ctx.fillRect(x, y, w, w);
  if (lite) { ctx.fillStyle = lite; for (let i = 0; i < P2.length; i += 2) ctx.fillRect(P2[i][0], P2[i][1], 1, 1); }
  return P2;
}
// a skeletal arm clawing up out of the ground: open, or curled round what it caught; leaning three ways
function mnArmFrame(grab, lean) {
  return mnFrame('barm|' + (grab ? 1 : 0) + '|' + lean, 16, 24, 8, 21, A => {
    const K = mnKit(A, 8, 21, 1), { L, E, D } = K, tx = lean * 2;
    L([[0, 1], [tx * 0.4, -7], [tx, -13]], 1.2, 0.9, 'mnBone', {});
    L([[1, 0], [tx * 0.4 + 1, -7]], 0.6, 0.6, 'mnBoneD', {});
    E(tx * 0.4, -7, 1.4, 1.2, 'mnBone', {});
    E(tx, -14, 1.8, 1.4, 'mnBone', {});
    const c = grab ? 1 : 0;
    for (const [fx, fy, gx, gy] of [[-2, -15, -3 + c * 2, -19 + c * 3], [-1, -16, -1 + c, -20 + c * 4], [1, -16, 1, -20 + c * 4], [2, -15, 3 - c * 2, -19 + c * 3]]) L([[tx + fx * 0.5, fy], [tx + fx, (fy + gy) / 2], [tx + gx, gy]], 0.5, 0.45, 'mnBone', {});
    L([[tx + 1.5, -13], [tx + 3.5, -14 + c]], 0.5, 0.45, 'mnBone', {});
    D(tx - 1, -14, mnHex('mnBone', 4));
    // the earth it tears through
    for (const [x, y] of [[-4, 1], [-3, 0], [3, 0], [4, 1], [-2, 1], [2, 1]]) D(x, y, mnHex('mnWood', (x + 9) % 3));
  });
}
{
  const _br = boneRender;
  boneRender = function (list, hoverCands) {
    if (!G.zone) return _br(list, hoverCands);
    const SK = G.skels, SP = G.bspears, AR = G.barms, RC = G.ribcages, BM = G.bmotes, BS2 = G.bspikes;
    G.skels = []; G.bspears = []; G.barms = []; G.ribcages = []; G.bmotes = []; G.bspikes = BS2.filter(s => s.pile);
    try { _br(list, hoverCands); } finally { G.skels = SK; G.bspears = SP; G.barms = AR; G.ribcages = RC; G.bmotes = BM; G.bspikes = BS2; }
    // rib cages: curved ribs thrust up out of the ground, arching in toward the middle
    for (const c of G.ribcages) {
      const k = Math.min(1, (c.max - c.t) / 0.15), fade = Math.min(1, c.t * 2), ribs = c.small ? 5 : 9;
      for (let i = 0; i < ribs; i++) {
        const a = i / ribs * Math.PI * 2, x = c.x + Math.cos(a) * c.R, y = c.y + Math.sin(a) * c.R;
        list.push({ d: x + y, f: () => {
          const q = iso(x, y), top = iso(c.x + Math.cos(a) * c.R * 0.35, c.y + Math.sin(a) * c.R * 0.35), h = (c.small ? 12 : 22) * k, pts = [];
          for (let j = 0; j <= 6; j++) { const t = j / 6, u = 1 - t; pts.push([u * u * q.sx + 2 * u * t * q.sx + t * t * top.sx, u * u * q.sy + 2 * u * t * (q.sy - h) + t * t * (top.sy - h * 1.1)]); }
          ctx.globalAlpha = fade; mnPxStroke(pts, '#c8bc9c', '#eee6cc', '#140f12', c.small ? 1 : 2); ctx.globalAlpha = 1;
          ctx.fillStyle = '#eee6cc'; const tp = pts[pts.length - 1]; ctx.fillRect(Math.round(tp[0]), Math.round(tp[1]) - 1, 1, 1);
        } });
      }
      if (!c.small) { const q = iso(c.x, c.y); ctx.fillStyle = `rgba(142,38,48,${0.18 * fade})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, c.R * ISO_R, c.R * ISO_RY, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    // bone arms clawing out of the ground
    for (const a of G.barms) if (a.delay <= 0) list.push({ d: a.x + a.y, f: () => {
      const q = iso(a.x, a.y), sx = Math.round(q.sx), sy = Math.round(q.sy), k = a.rise > 0 ? 1 - a.rise / 0.2 : Math.min(1, a.life / 0.4);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(sx - 4, sy + 1, 8, 1);
      if (k <= 0) return;
      const sway = Math.sin(G.time * 3 + a.seed) * 0.8 + a.lean * 1.2 + (a.grab ? Math.sin(G.time * 18) : 0), fr = mnArmFrame(!!a.grab, Math.max(-1, Math.min(1, Math.round(sway))));
      const h = Math.round(fr.h * k);
      ctx.save(); ctx.beginPath(); ctx.rect(sx - 12, sy + 3 - 40, 24, 40); ctx.clip(); mnBlit(fr, sx, sy + (fr.h - h), 1, false, 1); ctx.restore();
    } });
    // the raised dead (a taller clip than before: they rise out of the ground at full size now)
    for (const e of G.skels) list.push({ d: e.x + e.y, f: () => {
      shadow(e.x, e.y, e.r);
      if (aU('o_pyredead') && e.rise <= 0) { const q = iso(e.x, e.y); ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 14, 14, '255,140,50', 0.45 + 0.15 * Math.sin(G.time * 17 + e.x)); ctx.globalCompositeOperation = 'source-over'; if (Math.random() < 0.6) parts.push({ x: e.x + rand(-0.15, 0.15), y: e.y + rand(-0.15, 0.15), z: 4 + Math.random() * 18, vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: 14 + Math.random() * 10, t: 0.35 + Math.random() * 0.2, col: Math.random() < 0.5 ? '#ff9a3c' : '#ffd070' }); }
      const risek = e.rise > 0 ? 1 - e.rise / 0.45 : 1, q = iso(e.x, e.y), sink = Math.round((1 - risek) * 44);
      ctx.save(); ctx.beginPath(); ctx.rect(q.sx - 30, q.sy - 60, 60, 63); ctx.clip();
      const r = drawSkel16(e, e.hurt > 0, sink);
      ctx.restore();
      if (e.hp < e.max) { ctx.fillStyle = '#0e0d12'; ctx.fillRect(r.x + 1, r.y - 3, 10, 2); ctx.fillStyle = '#cfc6ae'; ctx.fillRect(r.x + 1, r.y - 3, Math.round(10 * e.hp / e.max), 2); }
    } });
    // shard motes: little splinters of bone
    for (const b of G.bmotes) list.push({ d: b.x + b.y + 0.03, f: () => {
      const q = iso(b.x, b.y), x = Math.round(q.sx), y = Math.round(q.sy - b.z), v = (Math.floor(G.time * 12 + b.x * 5) & 1);
      if (!b.vis && b.rise > 0) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x - 2, Math.round(q.sy), 4, 1); }
      mnPxStroke(v ? [[x - 1, y + 1], [x + 1, y - 1]] : [[x - 1, y], [x + 2, y]], '#c8bc9c', '#f4efe2', '#140f12', 1);
    } });
    // bone spears: a long pale shaft with a barbed head
    for (const s of G.bspears) list.push({ d: s.x + s.y + 0.05, f: () => {
      const q = iso(s.x, s.y), dx = (s.vx - s.vy) * 0.5, dy = (s.vx + s.vy) * 0.25, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, L = s.small ? 7 : 15, sx = q.sx, sy = q.sy - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(Math.round(sx - ux * L / 2) - 3, Math.round(q.sy), 6, 1);
      mnPxStroke([[sx - ux * L, sy - uy * L], [sx, sy]], '#c8bc9c', '#eee6cc', '#140f12', s.small ? 1 : 1);
      const nx = -uy, ny = ux;
      mnPxStroke([[sx + nx * 2 - ux * 2, sy + ny * 2 - uy * 2], [sx + ux * 2, sy + uy * 2], [sx - nx * 2 - ux * 2, sy - ny * 2 - uy * 2]], '#eee6cc', '#ffffff', '#140f12', 1);
    } });
    // spikes bursting out along the ground
    for (const s of G.bspikes) if (!s.pile) {
      const k = 1 - s.t / 0.5, grow = Math.min(1, k * 5), x2 = s.x + Math.cos(s.a) * s.len * grow, y2 = s.y + Math.sin(s.a) * s.len * grow;
      list.push({ d: x2 + y2, f: () => { const a = iso(s.x, s.y), b = iso(x2, y2); ctx.globalAlpha = Math.min(1, s.t * 4); mnPxStroke([[a.sx, a.sy - 5], [b.sx, b.sy - 9]], '#c8bc9c', '#f4efe2', '#140f12', 2); ctx.globalAlpha = 1; } });
    }
  };
}
// ------------------------------------------------------------------- the Bone Host: skeletons worn as a carapace
// ribs clamp over the shoulders like pauldrons, a ridge of vertebrae climbs the back, skulls hang at the belt, and a
// jagged blade of bone grows along the weapon arm, longer with every skeleton worn. Painted on the hero's own rig.
const MN_LASTHERO = { pose: 'idle', ph: 0, view: 'front' };
{
  const _hf = heroFrame;
  heroFrame = function (cls, pose, ph, view) {
    if (cls === P.cls) { MN_LASTHERO.pose = pose; MN_LASTHERO.ph = ph; MN_LASTHERO.view = view || (P._fb ? 'back' : 'front'); }
    return _hf(cls, pose, ph, view);
  };
}
function mnHostFrame(n, pose, ph, view) {
  n = Math.max(1, Math.min(8, n));
  // a larger frame than the hero's (60x62, feet at 28,57) so the carapace can outgrow the silhouette
  return mnFrame('host|' + n + '|' + pose + '|' + ph + '|' + view, 60, 62, 28, 57, A => {
    if (typeof rig32 !== 'function') return;
    const J0 = rig32(pose, ph, view), back = view === 'back', bone = 'mnBone', OX = 12, OY = 10, J = {};
    for (const k in J0) J[k] = Array.isArray(J0[k]) && J0[k].length === 2 && typeof J0[k][0] === 'number' ? [J0[k][0] + OX, J0[k][1] + OY] : J0[k];
    const sk = (x, y, r, eyes, t) => { A.ell(x, y, r, r * 0.95, bone, { tone: t || 0 }); if (eyes) { A.px(x + r * 0.3, y, MN_GAP); A.px(x + r * 0.3 + 1, y, MN_GAP); A.px(x - r * 0.4, y, MN_GAP); A.px(x + r * 0.3, y, MN_EYE); A.px(x + 0.5, y + r * 0.6, MN_GAP); A.px(x - r * 0.4, y - r * 0.6, mnHex(bone, 4)); } };
    const big = 1 + Math.min(8, n) * 0.05;
    // a pauldron of ribs clamped over the shoulder, with a skull set on it once the host grows
    const pad = (sh, t, far, skull) => {
      const d = far ? -1 : 1;
      for (let i = 0; i < 4; i++) A.limb([[sh[0] - 4 * big + i * 1.2, sh[1] - 1 + i * 1.8], [sh[0] + d * 1.5, sh[1] - 4.5 * big + i * 1.8], [sh[0] + d * 6 * big, sh[1] + 1 + i * 1.6]], 0.8, 0.55, bone, { tone: t });
      A.ell(sh[0] + d, sh[1] - 1, 2.6 * big, 2.1, bone, { tone: t });
      if (skull) sk(sh[0] + d * 2, sh[1] - 4 * big, 2.3, !back, t);
    };
    if (!back) pad(J.shF, -1, true, n >= 3);
    // the back: vertebrae climb the spine, spurs of bone jut from them
    if (back) {
      for (let i = 0; i < 7; i++) { const p = mnLerp(J.neck, J.waist, i / 6); A.ell(p[0], p[1], 1.7, 1.1, bone, {}); if (n >= 4 && i % 2 === 0) A.limb([[p[0], p[1]], [p[0] - 3 - n * 0.3, p[1] - 3 - n * 0.3]], 0.9, 0.4, bone, {}); }
      pad(J.shF, 0, true, n >= 3);
    } else {
      // a cage of ribs strapped over the chest
      for (let i = 0; i < Math.min(4, 1 + Math.ceil(n / 2)); i++) { const y = J.chest[1] - 1 + i * 2.4; A.limb([[J.chest[0] - 5.5, y + 1.5], [J.chest[0] - 1, y - 0.5], [J.chest[0] + 5.5, y + 1.2]], 0.6, 0.5, bone, {}); }
      A.limb([[J.chest[0] + 0.5, J.chest[1] - 2], [J.chest[0] + 0.5, J.chest[1] + 7]], 0.6, 0.5, bone, {});
    }
    // skulls hung at the belt, one per two skeletons
    for (let i = 0; i < Math.min(4, Math.ceil(n / 2)); i++) sk(J.hip[0] - 5 + i * 3.3, J.hip[1] + 1.5 + (i % 2), 1.7, !back);
    pad(J.shN, 0, false, n >= 2);
    // a crown of bone spurs over the head once it is deep in the host
    if (n >= 5) for (let i = 0; i < 3; i++) A.limb([[J.head[0] - 3 + i * 3, J.head[1] - 4], [J.head[0] - 4 + i * 3.5, J.head[1] - 8 - (i === 1 ? 2 : 0) - (n - 5)]], 0.9, 0.35, bone, {});
    // the blade of bone along the weapon arm: from the elbow out past the hand, teeth along its edge
    if (!back) {
      const L = 4 + 1.6 * Math.min(8, n), a = Math.atan2(J.haN[1] - J.elN[1], J.haN[0] - J.elN[0]), ca = Math.cos(a), sa = Math.sin(a), b0 = J.elN;
      const tip = [b0[0] + ca * (L + 5), b0[1] + sa * (L + 5)];
      A.poly([[b0[0] - sa * 1.4, b0[1] + ca * 1.4], [tip[0], tip[1]], [b0[0] + sa * 1.8, b0[1] - ca * 1.8]], bone, {});
      for (let i = 2; i < L + 3; i += 3) { A.px(b0[0] + ca * i + sa * 2.2, b0[1] + sa * i - ca * 2.2, mnHex(bone, 4)); A.px(b0[0] + ca * (i + 1) + sa * 1.6, b0[1] + sa * (i + 1) - ca * 1.6, mnHex(bone, 2)); }
    }
  });
}
{
  drawOssu = function (alpha, lift) {
    // v0.24: the host no longer blows the hero's pixels up: the carapace itself grows around the figure
    const k = 1, r = drawScaled(SPR.ossu, P.x, P.y, P.face, P.hurt > 0, k, alpha, lift);
    if (P.host && !P.dead) {
      const H = MN_LASTHERO, fr = mnHostFrame(P.host.n, H.pose, H.ph, H.view), p = iso(P.x, P.y), f = P.face;
      if (alpha !== 1) ctx.globalAlpha = alpha;
      const img = (P.hurt > 0 && OPT.flash) ? (f < 0 ? fr.flf : fr.fl) : (f < 0 ? fr.f : fr.c);
      const X = Math.round(p.sx - (f < 0 ? fr.w - fr.ox : fr.ox) * k), Y = Math.round(p.sy + 3 - (fr.oy + 1) * k - (lift || 0));
      if (P.roll > 0) ctx.drawImage(img, X, Math.round(Y + fr.h * k * 0.3), fr.w * k, Math.round(fr.h * k * 0.7)); else ctx.drawImage(img, X, Y, fr.w * k, fr.h * k);
      ctx.globalAlpha = 1;
    }
    return r;
  };
}

// =================================================================== HEMOMANCER: the brood
// A spawnling: the gory upper half of a body hauling itself along on its hands, ribs split open, the jaw hanging,
// its entrails dragging behind. Four crawl frames (each hand in turn reaches, plants, hauls); spider legs if grafted.
function mnLingPaint(A, ph, legs, view) {
  const K = mnKit(A, 13, 17, 1), { E, L, Q, D } = K, back = view === 'back';
  const a = ph / 4 * Math.PI * 2, surge = Math.round(Math.sin(a) * 0.8), up = Math.cos(a);
  if (legs) for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) {
    const lp = Math.sin(a * 2 + i * 2 + (sd > 0 ? 0 : 1.5)), bx = -2 + i * 2.2 + surge;
    L([[bx, -5], [bx + lp * 2 + sd * 2, -10 - (sd < 0 ? 1 : 0)], [bx + lp * 3 + sd * 3.5, 0]], 0.5, 0.45, 'mnChit', { tone: sd < 0 ? -1 : 0 });
  }
  // entrails trailing behind
  L([[-4 + surge, -2], [-7, -1 + Math.round(Math.sin(a) * 0.6)], [-10, 0], [-12 + Math.round(Math.sin(a + 1)), 0]], 1.1, 0.7, 'mnGore', { tone: -1 });
  L([[-5 + surge, -1], [-8, 0]], 0.7, 0.6, 'mnVein', {});
  // the far arm
  const shF = [2 + surge, -7], haF = [7 - Math.sin(a) * 3 + surge, -Math.max(0, -up) * 2], elF = [(shF[0] + haF[0]) / 2 + 1, -8.5];
  L([shF, elF, haF], 1, 0.8, 'mnSkin', { tone: -1 });
  // the torso: a torn rib-cage, wet and raw where the legs used to be
  Q([[-5 + surge, -2], [-4 + surge, -7], [0 + surge, -10], [4 + surge, -9], [5 + surge, -5], [3 + surge, -1], [-3 + surge, 0]], 'mnSkin', { band: 2 });
  E(-4.5 + surge, -2, 2.2, 2, 'mnMeat', {});
  if (!back) { for (let i = 0; i < 3; i++) { D(-1 + i * 1.5 + surge, -7 + i * 0.5, mnHex('mnFat', 3)); D(-1 + i * 1.5 + surge, -6 + i * 0.5, mnHex('mnMeat', 1)); } }
  else { for (let i = 0; i < 4; i++) D(-2 + i * 1.6 + surge, -9 + i * 0.3, mnHex('mnFat', 3)); }        // the spine through the skin
  D(-6 + surge, -1, mnHex('mnGore', 4)); D(-5 + surge, 0, mnHex('mnGore', 3));
  // the head: low and thrust forward, the jaw hanging open
  const hx = 7 + surge, hy = -9 + (ph % 2 ? 0 : 1);
  E(hx, hy, 3, 2.8, 'mnSkin', {});
  if (!back) {
    Q([[hx, hy + 1], [hx + 3.5, hy + 0.5], [hx + 3, hy + 4], [hx + 0.5, hy + 3.5]], 'mnSkin', { tone: -1 });
    D(hx + 1, hy - 1, '#1a0606'); D(hx + 2, hy - 1, '#ffd070'); D(hx + 2, hy + 1, '#3a0808'); D(hx + 3, hy + 1, '#3a0808'); D(hx + 2, hy + 2, '#f4efe2'); D(hx + 3, hy + 3, mnHex('mnGore', 3));
  } else { D(hx - 1, hy - 2, mnHex('mnSkin', 1)); D(hx, hy - 2, mnHex('mnSkin', 1)); }
  // the near arm, reaching
  const shN = [3 + surge, -6], haN = [9 + Math.sin(a) * 3 + surge, -Math.max(0, up) * 2], elN = [(shN[0] + haN[0]) / 2 + 1, -7.5];
  L([shN, elN, haN], 1.1, 0.9, 'mnSkin', {});
  for (const h of [haN]) { D(h[0] + 1, h[1], mnHex('mnSkin', 4)); D(h[0] + 2, h[1] + 1, '#1a0606'); }
}
function mnLingFrame(ph, legs, view) { return mnFrame('ling|' + ph + '|' + (legs ? 1 : 0) + '|' + view, 28, 22, 13, 18, A => mnLingPaint(A, ph, legs, view)); }

// =================================================================== the Flesh Golem
// A heaving mound of melted-down bodies that drags itself on one great clawed arm: a long slope from its tail to a
// brow over one swollen eye, a jaw of fangs splitting its whole front, pale fat dripping, and the faces of what it
// ate pressed out through the skin at its base, one for every meal.
function mnFGolemPaint(A, K, o) {
  const { E, L, Q, D, N } = K, pose = o.pose, ph = o.ph, back = o.view === 'back';
  const crawl = pose === 'walk', cp = crawl ? ph / 8 * Math.PI * 2 : 0, slam = pose === 'atk' ? [0.5, 1, 0.3][ph] : pose === 'wind' ? 0.8 : 0;
  const B = pose === 'idle' ? [0, 0.8, 1.4, 0.8][ph] : crawl ? Math.cos(cp) * 1.2 : 0, open = o.open, raised = pose === 'wind' || (pose === 'atk' && ph === 0);
  const surge = crawl ? Math.round(-1.6 * Math.sin(cp)) : 0, drag = crawl ? Math.round(Math.sin(cp + 1.5) * 2) : 0, fl = 'mnFlesh';
  // tentacles from its back (a mutation)
  if (o.tent) for (let i = 0; i < 3; i++) { const pts = []; const a0 = -Math.PI / 2 - (0.6 + i * 0.4); for (let j = 0; j <= 5; j++) { const t = j / 5, an = a0 + Math.sin(ph * 0.8 + i + t * 4) * 0.4 * t; pts.push([-8 + surge + Math.cos(an) * 20 * t, -34 + B + Math.sin(an) * 20 * t]); } L(pts, 2.2, 0.8, 'mnGore', { tone: -1 }); }
  // the far stump dragging behind
  E(-24 - drag + surge, -2, 4, 2.6, fl, { tone: -1 });
  // the mound
  const S = [[-32, 0], [-31, -4], [-26, -11], [-18, -19], [-8, -26 + B * 0.5], [2, -31 + B * 0.7], [10, -33 + B], [17, -29 + B], [20, -12], [17, -1], [8, 1], [-10, 1]].map(([x, y]) => [x + surge, y]);
  Q(S, fl, { band: 3 });
  // folds of skin down the slope, blisters on the crest
  for (let i = 0; i < 5; i++) { const x0 = -26 + i * 7 + surge; N(x0, -8 - i * 4 + B * 0.3, x0 + 3, -1, mnHex(fl, 1)); N(x0 - 1, -9 - i * 4 + B * 0.3, x0 + 1, -5 - i * 2, mnHex(fl, 3)); }
  for (const [x, y, r] of [[-6, -24, 2], [3, -29, 2.4], [-16, -16, 1.6], [-24, -8, 1.3]]) { E(x + surge, y + B * 0.5, r, r * 0.7, fl, { tone: -1 }); D(x - 0.6 + surge, y - 0.8 + B * 0.5, mnHex(fl, 4)); }
  if (o.hump) { E(-8 + surge, -32 + B, 4, 4, 'mnGore', { band: 2 }); E(-4 + surge, -35 + B, 3, 3, 'mnGore', {}); D(-5 + surge, -36 + B, '#ffb0b8'); D(-9 + surge, -33 + B, '#ffb0b8'); }
  if (o.chitin) { for (const [x, y] of [[-6, -30], [-16, -21], [-25, -11]]) Q([[x - 4 + surge, y + 1], [x + surge, y - 2.5], [x + 4 + surge, y + 1], [x + surge, y + 2]], 'mnChit', {}); }
  // the faces of the eaten, pressed out through the skin at its base
  for (let i = 0; i < Math.max(1, Math.min(6, o.meals)); i++) {
    const x = -22 + i * 5 + surge, y = -4.5 - (i % 2) * 1.5;
    E(x, y, 2.2, 2.7, 'mnSkin', {}); D(x - 1, y - 1, '#2a0606'); D(x + 1, y - 1, '#2a0606'); D(x, y + 1, '#2a0606'); D(x, y + 2, '#2a0606'); D(x - 1, y - 2, mnHex('mnSkin', 4));
  }
  if (back) {   // from behind: the ridge of the mound, no face
    for (let i = 0; i < 6; i++) D(-20 + i * 6 + surge, -14 - i * 3 + B * 0.5, mnHex(fl, 4));
  }
  // the head: a great dome shoved forward out of the mound
  const hx = 19 + surge, hy = -24 + B;
  E(hx, hy, 12, 16, fl, { band: 3 });
  if (!back) {
    // the brow, one great eye (the pupil a slit of fire), a small one weeping below
    Q([[hx - 9, hy - 7], [hx - 1, hy - 12], [hx + 9, hy - 10], [hx + 11, hy - 6], [hx + 2, hy - 7]], fl, {});
    E(hx + 2, hy - 4, 5, 4, '#e8d8b8', {});
    E(hx + 3, hy - 4, 2.2, 2.6, open > 0.5 ? '#e04030' : '#d88a28', { flat: true, contour: false });
    for (let j = -2; j <= 1; j++) D(hx + 3, hy - 4 + j, '#140404');
    D(hx + 1, hy - 6, '#ffffff'); N(hx - 2, hy - 4, hx - 1, hy - 3, '#c0404a'); N(hx + 6, hy - 2, hx + 5, hy - 3, '#c0404a');
    E(hx + 9, hy + 1, 1.4, 1.1, '#e8d8b8', {}); D(hx + 9, hy + 1, '#140404');
    // the jaw splits the whole front: fangs top and bottom, two tusks at the corners
    const mx = hx + 3, my = hy + 8, mh = 1.5 + 5 * open, mw = 8;
    Q([[mx - mw, my - mh], [mx + mw, my - mh - 1], [mx + mw + 1, my + mh], [mx - mw, my + mh]], '#2a0606', { flat: true });
    if (open > 0.3) { E(mx - 1, my + mh * 0.3, 4, mh * 0.5, 'mnGore', { flat: true, contour: false }); }
    for (let i = 0; i < 7; i++) { const x = mx - mw + 1.5 + i * 2.2; Q([[x - 0.9, my - mh], [x + 0.9, my - mh], [x, my - mh + 2 + (i % 2) + open]], '#e6ecee', { flat: true, contour: false }); if (i > 0 && i < 6) Q([[x - 0.8, my + mh], [x + 0.8, my + mh], [x + 0.2, my + mh - 2 - open]], '#c8d0d4', { flat: true, contour: false }); }
    L([[mx + mw, my - 1], [mx + mw + 2, my + 3], [mx + mw + 2, my + 6 + open * 2]], 1, 0.4, 'mnFat', {});
  }
  // the arm: huge, lumpy, hauling it forward; it rises and crashes down in a slam
  const sh = [10 + surge, -10 + B * 0.5];
  const hand = raised ? [36 + surge, -44] : pose === 'atk' ? [[36, -40], [40, -3], [38, -1]][ph].map((v, i) => i ? v : v + surge) : [34 + drag + Math.round(3 * Math.sin(cp)) + surge, -1 - Math.round(3 * Math.max(0, Math.cos(cp)))];
  const el = raised ? [28 + surge, -22] : pose === 'atk' && ph === 0 ? [28 + surge, -20] : [25 + surge + (crawl ? Math.round(Math.sin(cp)) : 0), -7 + (crawl ? -Math.round(2 * Math.max(0, Math.cos(cp))) : 0)];
  L([sh, el], 5, 4.4, fl, { band: 2 }); L([el, hand], 4.4, 3.4, fl, { band: 2 });
  E(el[0], el[1], 4.2, 3.6, fl, {}); D(el[0] - 1, el[1] - 2, mnHex(fl, 4));
  E(hand[0], hand[1], 5, 3.4, fl, {});
  for (let i = 0; i < 3; i++) { const bx = hand[0] + 2 + i * 1.8, by = hand[1] - 1.5 + i * 1.5; L([[bx, by], [bx + 3, by - 0.5], [bx + 4.5, by + 2]], 0.9, 0.35, '#2a2020', {}); D(bx + 3, by - 0.5, '#8a8078'); }
  // pale fat dripping off the brow, the jaw and the arm
  const drips = [[hx - 4, hy - 7], [hx + 7, hy - 8], [hx + 1, hy + 12], [el[0], el[1] + 4], [-2 + surge, -1]];
  drips.forEach(([x, y], i) => { const len = 1 + ((ph + i) % 4); for (let j = 0; j < len; j++) D(x, y + j, mnHex('mnFat', j === len - 1 ? 4 : 3)); });
  for (let i = 0; i < 8; i++) D(hx - 7 + i * 1.8, hy - 11 + (i % 2), mnHex('mnFat', 4));
}
function mnFGolemFrame(o, s) {
  s = Math.round(s * 20) / 20;
  const W = Math.ceil(90 * s), H = Math.ceil(66 * s), ox = Math.round(38 * s), oy = H - 5;
  const key = 'fg|' + o.pose + '|' + o.ph + '|' + o.view + '|' + (o.open > 0.5 ? 2 : o.open > 0.2 ? 1 : 0) + '|' + Math.min(6, o.meals || 0) + '|' + (o.tent ? 1 : 0) + (o.hump ? 1 : 0) + (o.chitin ? 1 : 0) + '|' + s;
  return mnFrame(key, W, H, ox, oy, A => mnFGolemPaint(A, mnKit(A, ox, oy, s), Object.assign({}, o, { open: o.open > 0.5 ? 1 : o.open > 0.2 ? 0.5 : 0 })));
}
// the heap it falls into, heaving as it regrows: a pile of lobes, a sunken eye, a twitching maw
function mnHeapFrame(stage, beat) {
  return mnFrame('fheap|' + stage + '|' + beat, 48, 28, 24, 24, A => {
    const s = 0.55 + 0.15 * stage, b = beat ? 1.07 : 1, K = mnKit(A, 24, 24, 1), { E, D, N } = K;
    for (const [x, y, rx, ry, t] of [[-7, -2, 9, 4.5, -1], [6, -1, 8, 4, -1], [0, -5, 11, 6, 0], [-3, -9, 7, 4.5, 0], [4, -10, 5, 3.4, 0]]) E(x * s, y * s * b, rx * s * b, ry * s * b, 'mnFlesh', { tone: t, band: 2 });
    for (let i = 0; i < 5; i++) D(-8 * s + i * 4 * s, (-5 + Math.sin(i * 2.1) * 2) * s, '#c86a5a');
    E(3 * s, -8 * s, 1.6, 1.2, '#e8d8a0', {}); D(3 * s, -8 * s, '#1a0806');
    N(-6 * s, -2 * s, -2 * s, -2 * s + (beat ? 1 : 0), '#1a0608');
    for (let i = 0; i < 4; i++) D(-9 * s + i * 5 * s, -1, mnHex('mnFat', 3));
  });
}

// ------------------------------------------------------------------- the blood ooze, tumours and sacs, the nest
// an ooze: a quivering dome of blood, darker at its heart, a wet highlight, drowned eyes turning inside it
function mnOozeFrame(R, ph) {
  R = Math.max(3, Math.min(14, Math.round(R)));
  return mnFrame('ooze|' + R + '|' + ph, R * 2 + 8, R * 2 + 6, R + 4, R * 2 + 2, A => {
    const cx = R + 4, by = R * 2 + 2, w = [0, 0.6, 0, -0.6][ph], rx = R + w, ry = R * 0.85 - w * 0.6;
    A.ell(cx, by - 1, rx + 1.5, 2, 'mnGore', { tone: -1 });
    A.ell(cx, by - ry * 0.95, rx, ry, 'mnGore', { band: 3 });
    A.ell(cx - rx * 0.3, by - ry * 1.3, rx * 0.35, ry * 0.25, '#e05a62', { flat: true, contour: false });
    A.px(cx - rx * 0.4, by - ry * 1.5, '#ffd0d0'); A.px(cx - rx * 0.3 + 1, by - ry * 1.5, '#ffb0b8');
    for (let i = 0; i < 3; i++) A.px(cx - rx + 2 + i * rx * 0.8, by + 1 + (i + ph) % 2, mnHex('mnGore', 1));
  });
}
function mnTumorFrame(K2, ph) {
  K2 = Math.max(0.6, Math.min(1.6, Math.round(K2 * 5) / 5));
  return mnFrame('tum|' + K2 + '|' + ph, 16, 16, 8, 13, A => {
    const K = mnKit(A, 8, 13, K2 * (ph ? 1.08 : 1)), { E, D, N } = K;
    E(0, -3.5, 4.2, 3.8, 'mnMeat', { band: 2 });
    E(-1.5, -4.5, 2, 1.8, 'mnSkin', {}); E(1.8, -5, 1.4, 1.3, 'mnGore', {}); E(1, -2, 1.2, 1, 'mnVein', {});
    N(-1, -6, -1, -3, mnHex('mnVein', 1)); N(1, -2, 3, -2, mnHex('mnVein', 1)); D(-2, -6, '#ffd0c0'); D(2, -6, '#ffb0b8');
  });
}
function mnNestFrame(ph) {
  return mnFrame('nest|' + ph, 34, 20, 17, 16, A => {
    const K = mnKit(A, 17, 16, 1), { E, D, L } = K, p = ph ? 0.6 : 0;
    E(0, -1, 13, 5, 'mnVein', { tone: -1 });
    for (let i = 0; i < 4; i++) { const a = i * 1.6; L([[0, -3], [Math.cos(a) * 7, -5], [Math.cos(a) * 13, Math.sin(a) * 4]], 0.8, 0.5, 'mnVein', {}); }
    E(0, -4, 9 + p, 4.5 + p * 0.5, 'mnMeat', { band: 2 });
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + 0.3, x = Math.cos(a) * 7, y = -4 + Math.sin(a) * 3; E(x, y - 1.5, 2.4 + (i % 2 ? p : 0), 2.1, 'mnGore', {}); D(x - 1, y - 2.5, '#ffb0b8'); }
    E(-2, -6, 3.4, 2.2, 'mnGore', {}); D(-3, -7, '#ffd0d0');
  });
}

// ------------------------------------------------------------------- drawing the Hemomancer's brood and growths
{
  drawSpawnling = function (e) {
    const q = iso(e.x, e.y), hk = e.hatch > 0 ? 1 - e.hatch / (e.temp ? 0.15 : 0.35) : 1;
    const K = Math.max(0.2, hk) * (e.rush ? 1 + 0.6 * e.rush.swell : 1), f = e.face || 1;
    const hop = e.leap ? Math.sin(Math.min(1, e.leap.t / 0.25) * Math.PI) * 6 : 0;
    const mv = e._mlx == null ? 0 : Math.hypot(e.x - e._mlx, e.y - e._mly); e._mlx = e.x; e._mly = e.y;
    const view = mnView(e, mv), ph = Math.floor((e.wob || 0) / 1.5) % 4;
    const X = Math.round(q.sx), Y = Math.round(q.sy - hop - (e.cling ? 6 : 0));
    shadow(e.x, e.y, e.r * K);
    if (e.frenzyT > 0 || e.rush) { ctx.globalCompositeOperation = 'lighter'; glow(X, Y - 5 * K, 10 * K, '255,70,90', 0.35 + 0.15 * Math.sin(G.time * 18)); ctx.globalCompositeOperation = 'source-over'; }
    const fr = mnLingFrame(ph, graftOn('legs'), view), r = mnBlit(fr, X, Y, f, e.hurt > 0, e.temp ? 0.85 : 1, K === 1 ? 1 : K);
    if (e.temp) { ctx.fillStyle = '#c24050'; ctx.fillRect(X - 1, r.y - 2, 2, 2); }
    if (e.biteT > 0) { e.biteT -= 0.016; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(X + f * 9), Math.round(Y - 8), 1, 1); }
    if (e.hp < e.max && !e.temp) { const bw = 10, by = r.y - 3; ctx.fillStyle = '#0e0d12'; ctx.fillRect(X - 5, by, bw, 1); ctx.fillStyle = '#e89aa0'; ctx.fillRect(X - 5, by, Math.round(bw * e.hp / e.max), 1); }
    return r;
  };
  drawFleshGolem = function (g, x, y, k, sp) {
    const mv = g._px == null ? 0 : Math.hypot(x - g._px, y - g._py); g._px = x; g._py = y; g._wd = (g._wd || 0) + mv; g._mv = (g._mv || 0) * 0.85 + (mv > 0.003 ? 0.15 : 0);
    const q = iso(x, y), f = g.face || 1, t = G.time, shake = g.hurt > 0 ? Math.round((Math.random() - 0.5) * 2.2) : 0;
    const eating = !!g.eat, chew = eating ? 0.35 + 0.55 * Math.abs(Math.sin(t * 8)) : 0, open = Math.max(chew, clamp(g.mawOpen || 0, 0, 1));
    let pose = 'idle', ph = Math.floor(t * 2.2 + x) % 4;
    if (g.slam > 0) { const u = 1 - g.slam / 0.3; if (u < 0.35) { pose = 'wind'; ph = 0; } else { pose = 'atk'; ph = u < 0.6 ? 1 : 2; } }
    else if (g._mv > 0.3) { pose = 'walk'; ph = Math.floor(g._wd * 5.5 / (Math.PI * 2) * 8) % 8; }
    const view = g === P ? 'front' : mnView(g, mv);
    if (g.frenzyT > 0) { ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 20, 40, '255,70,90', 0.3 + 0.1 * Math.sin(t * 14)); ctx.globalCompositeOperation = 'source-over'; }
    const s = k / 0.62;
    ctx.fillStyle = 'rgba(40,14,8,0.55)'; ctx.beginPath(); ctx.ellipse(q.sx - f * 12 * s, q.sy + 2, 32 * s, 7 * s, 0, 0, 6.28); ctx.fill();
    const fr = mnFGolemFrame({ pose, ph, view, open: (sp && sp.eng) ? Math.max(open, 0.6) : open, meals: g.meals || 0, tent: sp && sp.tent, hump: sp && sp.hump, chitin: sp && sp.chitin }, s);
    const r = mnBlit(fr, q.sx + shake, q.sy, f, g.hurt > 0.08, 1);
    if (sp && sp.vomit) for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#b8404a' : '#8e2630'; ctx.fillRect(Math.round(q.sx + f * (30 + i * 3) * s), Math.round(q.sy - 16 * s + i), 2, 2); }
    return r;
  };
  drawFHeap = function (h) {
    const q = iso(h.x, h.y), X = Math.round(q.sx), Y = Math.round(q.sy), prog = clamp(1 - h.rt / h.rtMax, 0, 1);
    shadow(h.x, h.y, 0.7 + 0.4 * prog);
    const beat = Math.sin(G.time * (4 + 4 * h.boost)) > 0.3 ? 1 : 0;
    mnBlit(mnHeapFrame(Math.min(3, Math.floor(prog * 4)), beat), X, Y, 1, false, 1);
    const bw = 22; ctx.fillStyle = '#0e0d12'; ctx.fillRect(X - bw / 2, Y - 20, bw, 2); ctx.fillStyle = h.downT < GOLEM_MIN_DOWN ? '#8a3a44' : '#e89aa0'; ctx.fillRect(X - bw / 2, Y - 20, Math.round(bw * prog), 2);
  };
  drawTumor = function (sx, sy, k, pul, glowA) {
    if (glowA) { ctx.globalCompositeOperation = 'lighter'; glow(sx, sy - 3 * k, 8 * k, '255,90,110', glowA); ctx.globalCompositeOperation = 'source-over'; }
    const fr = mnTumorFrame(k, pul > 0.3 ? 1 : 0);
    ctx.drawImage(fr.c, Math.round(sx) - fr.ox, Math.round(sy) - fr.oy - 1);
  };
  drawOoze = function (th) {
    const q = iso(th.x, th.y), rk = th.rise > 0 ? 1 - th.rise / 0.6 : 1, k = th.size * rk, pul = th.pulse > 0 ? th.pulse / 0.6 : 0;
    const R = (7 + pul * 3) * k * 0.95, ph = Math.floor((th.wob || G.time * 3) * 2) % 4, X = q.sx, Y = q.sy;
    shadow(th.x, th.y, 0.32 * k);
    if (th.hasteT > 0 || pul > 0) { ctx.globalCompositeOperation = 'lighter'; glow(X, Y - R, R * 2, '255,70,90', 0.2 + 0.4 * pul); ctx.globalCompositeOperation = 'source-over'; }
    const fr = mnOozeFrame(R, ph), r = mnBlit(fr, X, Y, th.face || 1, th.hurt > 0, 1);
    // eyes drifting in the blood
    for (const e of th.eyes || []) { const a = e.a + G.time * 0.6 * e.s, ex = X + Math.cos(a) * R * 0.45 * e.r, ey = r.y + r.h * 0.5 + Math.sin(a * 1.3) * R * 0.3 * e.r; ctx.fillStyle = '#f4efe2'; ctx.fillRect(Math.round(ex) - 1, Math.round(ey) - 1, 3, 2); ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(ex + ((th.face || 1) > 0 ? 1 : -1)), Math.round(ey) - 1, 1, 1); }
    if (th.hp < th.max) { ctx.fillStyle = '#0e0d12'; ctx.fillRect(Math.round(X - 6), r.y - 4, 12, 2); ctx.fillStyle = '#e89aa0'; ctx.fillRect(Math.round(X - 6), r.y - 4, Math.round(12 * clamp(th.hp / th.max, 0, 1)), 2); }
  };
  drawNest = function (n) {
    const q = iso(n.x, n.y), fade = Math.min(1, n.t / 1);
    mnBlit(mnNestFrame(Math.sin(n.pul * 5) > 0 ? 1 : 0), q.sx, q.sy, 1, false, fade);
  };
}
// a shed skin, a decoy, the mirror-sister: the 32-bit hero again, in a ghostly light
function mnHeroGhost(cls, pose, ph, view, rgb, key) {
  const fr = heroFrame(cls, pose, ph, view);
  return mnGhost(fr, rgb, key);
}
{
  const _r14b = render14;
  render14 = function (list) {
    const SKN = G.skins; G.skins = [];
    try { _r14b(list); } finally { G.skins = SKN; }
    for (const s of G.skins) list.push({ d: s.x + s.y, f: () => {
      const q = iso(s.x, s.y), fr = mnHeroGhost('hemomancer', 'idle', 0, 'front', '232,120,130', 'skin');
      const r = mnBlit(fr, q.sx, q.sy, s.face || 1, false, 0.5 + 0.15 * Math.sin(G.time * 5));
      ctx.fillStyle = '#0e0d12'; ctx.fillRect(r.x + 1, r.y - 3, r.w - 2, 2); ctx.fillStyle = '#e89aa0'; ctx.fillRect(r.x + 1, r.y - 3, Math.round((r.w - 2) * clamp(s.hp / s.max, 0, 1)), 2);
    } });
  };
}

// =================================================================== ASSASSIN: traps, lures, decoys and the mirror-sister
function mnTrapFrame(kind, ph) {
  return mnFrame('trap|' + kind + '|' + ph, 24, 30, 12, 26, A => {
    const K = mnKit(A, 12, 26, 1), { E, L, Q, D, N } = K;
    if (kind === 'ntrap') {          // a needle sentry: a squat iron drum on claw feet bristling with needles
      for (const x of [-5, 0, 5]) L([[x * 0.6, -3], [x, 0]], 0.7, 0.5, 'mnIron', {});
      E(0, -5, 5, 3, 'mnIron', { band: 2 }); E(0, -7, 4.2, 2, 'mnIron', {});
      for (let i = 0; i < 7; i++) { const a = -Math.PI + i * Math.PI / 6, x = Math.cos(a) * 3.6, y = -7 + Math.sin(a) * 1.5; N(x, y, x * 1.6, y - 4 - (i % 2), '#dde4ee'); D(x * 1.6, y - 4 - (i % 2), '#ffffff'); }
      D(0, -5, ph ? '#b070e0' : '#6a3a8a'); D(1, -5, '#e0b8ff');
    } else if (kind === 'mwake') {   // the censer: a pierced brass bowl on a tripod, rot-smoke curling out
      for (const [a, b] of [[-5, 0], [5, 0], [0, 1]]) L([[a * 0.4, -6], [a, b]], 0.6, 0.5, 'mnBrass', { tone: a < 0 ? -1 : 0 });
      E(0, -8, 4.6, 3.4, 'mnBrass', { band: 2 }); Q([[-4.5, -9], [4.5, -9], [3, -12], [-3, -12]], 'mnBrass', {});
      L([[0, -12], [0, -15]], 0.6, 0.6, 'mnBrass', {}); E(0, -16, 1.2, 1.2, 'mnBrass', {});
      for (const x of [-2, 0, 2]) D(x, -8, ph ? '#e0b8ff' : '#8a4ab8');
      for (let i = 0; i < 4; i++) D(Math.round(Math.sin(ph * 1.7 + i) * 1.5) + (i % 2), -18 - i * 2, i < 2 ? '#8a4ab8' : '#643a86');
    } else if (kind === 'dsentry') { // the death sentry: a spine of bone on a tripod of femurs, needle-quills, a violet eye
      for (const [a, t] of [[-5, -1], [4, 0], [0, 0]]) L([[0, -8], [a, 0]], 0.9, 0.7, 'mnBone', { tone: t });
      for (let i = 0; i < 5; i++) { E(0, -9 - i * 2.6, 1.8 - i * 0.12, 1.2, 'mnBone', {}); L([[1, -9 - i * 2.6], [4 + (i % 2), -12 - i * 2.6]], 0.5, 0.3, 'mnBone', {}); L([[-1, -9 - i * 2.6], [-4, -11 - i * 2.6]], 0.5, 0.3, 'mnBone', { tone: -1 }); }
      E(0, -23, 2.8, 2.6, 'mnBone', {}); D(1, -23, MN_GAP); D(-1, -23, MN_GAP); D(1, -23, ph ? '#e0b8ff' : '#b070e0'); D(0, -21, MN_GAP);
    } else if (kind === 'lure') {    // the siren lure: a small cracked bell hung on a stake, a red ribbon streaming
      L([[0, 0], [0, -16]], 0.8, 0.7, 'mnWood', {}); L([[0, -16], [3, -17]], 0.6, 0.5, 'mnWood', {});
      Q([[1.5, -15], [4.5, -15], [5.5, -9], [0.5, -9]], 'mnGold', { band: 2 }); E(3, -9, 3, 1, 'mnGold', {});
      D(3, -8, ph ? '#fff0a0' : '#6a4410'); N(2, -14, 2, -11, '#6a4410');
      L([[-0.5, -14], [-3, -13 + (ph ? 1 : 0)], [-6, -14 + (ph ? 0 : 1)]], 0.6, 0.4, 'mnRed', {});
    } else {                          // the bloat mine: a swollen gut sac sewn shut, a gristle fuse, leaking rot
      E(0, -4, 5.5 + (ph ? 0.5 : 0), 4 + (ph ? 0.4 : 0), 'mnRot', { band: 2 }); E(-1.5, -6, 2.4, 1.6, 'mnBile', {});
      for (let i = 0; i < 4; i++) D(-3 + i * 2, -2, mnHex('mnLea', 1)); N(-3, -3, 3, -3, mnHex('mnLea', 1));
      L([[1, -8], [2, -10], [1, -12]], 0.5, 0.4, 'mnMeat', {}); D(1, -12, ph ? '#ffd070' : '#c8553d');
      D(-2, -6, '#e0b8ff'); D(2, -1, mnHex('mnBile', 4));
    }
  });
}
{
  const _mr = miasRender;
  miasRender = function (list) {
    const TR = G.mtraps, LU = G.lures, DC = G.decoys; G.mtraps = []; G.lures = []; G.decoys = [];
    try { _mr(list); } finally { G.mtraps = TR; G.lures = LU; G.decoys = DC; }
    for (const l of G.lures) list.push({ d: l.x + l.y, f: () => {
      const q = iso(l.x, l.y); mnBlit(mnTrapFrame('lure', Math.floor(G.time * 6) % 2), q.sx, q.sy, 1, false, 1);
      ctx.strokeStyle = `rgba(217,164,65,${0.4 * (1 - (G.time * 1.5) % 1)})`; const R = ((G.time * 1.5) % 1) * 5; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, R * ISO_R, R * ISO_RY, 0, 0, 6.28); ctx.stroke();
    } });
    for (const t of G.mtraps) list.push({ d: t.x + t.y - 0.3, f: () => {
      const q = iso(t.x, t.y), armed = t.arm <= 0, kind = t.kind === 'ntrap' || t.kind === 'mwake' || t.kind === 'dsentry' ? t.kind : 'bmine';
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(q.sx, q.sy + 1, 5, 2.5, 0, 0, 6.28); ctx.fill();
      mnBlit(mnTrapFrame(kind, Math.floor(G.time * 4) % 2), q.sx, q.sy, 1, false, armed ? 1 : 0.6);
      if (kind === 'mwake' && Math.random() < 0.5) parts.push({ x: t.x + rand(-0.1, 0.1), y: t.y + rand(-0.1, 0.1), z: 14, vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: 6, t: 0.8, col: '#8a4ab8' });
      if (armed && Math.floor(G.time * 3) % 2 === 0) { ctx.fillStyle = '#c8553d'; ctx.fillRect(Math.round(q.sx), Math.round(q.sy), 1, 1); }
    } });
    for (const e of G.decoys) list.push({ d: e.x + e.y, f: () => {
      const q = iso(e.x, e.y); mnBlit(mnHeroGhost('miasmancer', 'idle', Math.floor(G.time * 2) % 4, 'front', '176,120,224', 'decoy'), q.sx, q.sy, e.face || 1, false, 0.45 + 0.1 * Math.sin(G.time * 9));
    } });
  };
  // the Mirror-Sister: your reflection, turned the wrong way, drawn in torn slices that slide against each other
  drawSister = function (s) {
    const q = iso(s.x, s.y), jit = s.blink > 0 ? rand(-2, 2) : Math.sin(G.time * 13) * 0.6;
    const mv = s._mlx == null ? 0 : Math.hypot(s.x - s._mlx, s.y - s._mly); s._mlx = s.x; s._mly = s.y; s._wd = (s._wd || 0) + mv;
    const view = mnView(s, mv), pose = s.act > 0 ? 'atk' : mv > 0.004 ? 'walk' : 'idle', ph = pose === 'atk' ? 2 : pose === 'walk' ? Math.floor(s._wd * 4.5) % 8 : Math.floor(G.time * 2) % 4;
    ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 18, 18, '150,180,220', 0.22 + 0.1 * Math.sin(G.time * 7)); ctx.globalCompositeOperation = 'source-over';
    shadow(s.x, s.y, 0.25);
    const fr = mnHeroGhost('miasmancer', pose, ph, view, '168,196,232', 'sister'), img = (s.face || 1) < 0 ? fr.f : fr.c;
    const rx = Math.round(q.sx) - ((s.face || 1) < 0 ? fr.w - fr.ox : fr.ox), ry = Math.round(q.sy) + 3 - (fr.oy + 1);
    for (let y = 0; y < fr.h; y += 3) { const off = Math.round(Math.sin(G.time * 9 + y * 0.9) * (y % 2 ? 1 : -1) + jit), hh = Math.min(3, fr.h - y); ctx.globalAlpha = 0.8; ctx.drawImage(img, 0, y, fr.w, hh, rx + off, ry + y, fr.w, hh); }
    ctx.globalAlpha = 0.2; ctx.drawImage(img, rx - 2, ry); ctx.drawImage(img, rx + 2, ry); ctx.globalAlpha = 1;
    if (s.act > 0) s.act -= 0.016;
  };
}

// =================================================================== the class lamps
// the Animancer a caged wisp, the Ossurarch a skull with a candle in it, the Hemomancer a heart-lamp of smouldering
// blood, the Assassin a paper lantern on a pole
{
  const LF = {};
  lampFrame = function (cls) {
    if (LF[cls]) return LF[cls];
    LF[cls] = mnFrame('lamp|' + cls, 14, 20, 7, 18, A => {
      const K = mnKit(A, 7, 18, 1), { E, L, Q, D, N } = K;
      if (cls === 'animancer') {
        N(0, -18, 0, -16, mnHex('mnIron', 3)); Q([[-3, -15], [3, -15], [2, -16], [-2, -16]], 'mnIron', {});
        Q([[-3, -15], [3, -15], [3, -7], [-3, -7]], '#20384c', { flat: true });
        E(0, -11, 1.6, 2.2, '#bfe8ff', { flat: true, contour: false }); D(0, -11, '#ffffff'); D(0, -13, '#6ab4e8');
        for (const x of [-3, -1, 1, 3]) N(x, -15, x, -7, mnHex('mnIron', 2));
        Q([[-3.5, -7], [3.5, -7], [2, -5], [-2, -5]], 'mnIron', {});
      } else if (cls === 'ossumancer') {
        N(0, -18, 0, -15, mnHex('mnLea', 3));
        E(0, -10, 4, 3.8, 'mnBone', {}); Q([[-1, -8], [3, -8.5], [2.5, -5.5], [-1, -5.5]], 'mnBone', {});
        D(1, -10, '#ffd070'); D(2, -10, '#ffd070'); D(-2, -10, '#ffb040'); D(1, -9, '#fff6c8'); D(2, -7, MN_GAP); D(0, -7, MN_GAP);
        L([[0, -13], [0, -15]], 0.6, 0.6, mnHex('mnFat', 3)); D(0, -16, '#ffd070'); D(0, -17, '#fff6c8');
      } else if (cls === 'hemomancer') {
        N(0, -18, 0, -15, mnHex('mnIron', 3)); Q([[-3, -14], [3, -14], [2, -15], [-2, -15]], 'mnIron', {});
        E(0, -10, 3.4, 4, 'mnGore', { band: 2 }); L([[1, -14], [2, -16]], 0.7, 0.5, 'mnVein', {});
        N(-2, -12, 0, -9, mnHex('mnVein', 0)); N(2, -8, 0, -9, mnHex('mnVein', 0)); D(-1, -12, '#ffd0c0'); D(-1, -11, '#ff9a8a');
        Q([[-3, -6], [3, -6], [2, -5], [-2, -5]], 'mnIron', {});
      } else {
        N(0, -18, 0, -15, mnHex('mnWood', 3)); Q([[-1.5, -15], [1.5, -15], [1.5, -14], [-1.5, -14]], MNK, {});
        E(0, -10, 3.4, 4.2, 'mnRed', { band: 2 }); E(-0.5, -10.5, 1.8, 2.4, '#ffb070', { flat: true, contour: false });
        for (let i = 0; i < 3; i++) N(-3, -12 + i * 2, 3, -12 + i * 2, mnHex('mnRed', 0));
        Q([[-1.5, -6], [1.5, -6], [1.5, -5], [-1.5, -5]], MNK, {}); N(0, -4, 0, -2, mnHex('mnGold', 3));
      }
    });
    return LF[cls];
  };
}
