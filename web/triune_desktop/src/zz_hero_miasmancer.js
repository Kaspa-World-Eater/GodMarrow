// =================================================================== v0.36: THE SHRINE KEEPER, painted at the finer grain
// She keeps the god's last breath. A broad black-lacquered ichime-gasa, and hung from under its brim a long sheer white
// veil that falls to the waist all round and is stained from the inside where her mouth is. Under it a white kosode with
// its sleeves bound in rope, a faded vermilion hakama-dress that darkens from the hem upward as if it had stood in ash
// water, a straw shimenawa rope for a belt hung with paper shide, and two lidded bronze urns on chains at her hips that
// smoke faintly bruise-purple. An iron war-fan (tessen) in the right hand, lacquered claws on the left.
// Painted as an HD twin: the frame is 64x62 world px (feet at 32,58) and carries a 128x124 `_hr` twin, so she is drawn
// one screen pixel per pixel. The rig is a small 3D skeleton (X across her, Y up, Z the way she faces) projected by
// the view's yaw, so front, back, side, down and up are the same body seen from five places.
{
pmat('kpVeil', ['#4a4550', '#8a8590', '#bcb7b6', '#d8d3cc', '#eeeae0']);
pmat('kpWhite', ['#221e26', '#4d4850', '#827c80', '#aca5a0', '#cdc6ba']);
pmat('kpVerm', ['#1c0a09', '#44170f', '#76291b', '#9c432c', '#bc6a4a']);
pmat('kpLacq', ['#050407', '#0e0a0e', '#1a1418', '#2e2428', '#5a4a46']);
pmat('kpStraw', ['#141008', '#302818', '#524630', '#766a4a', '#9c8f6c']);
pmat('kpPaper', ['#2a2622', '#58524a', '#8e8778', '#bab29e', '#dcd4c0']);
pmat('kpBronze', ['#100a05', '#30200c', '#5a401c', '#8a6630', '#c29a56']);
pmat('kpIron', ['#07070a', '#18191f', '#2e3038', '#50535c', '#8c9098']);
pmat('kpSkin', ['#1e1418', '#463234', '#765c58', '#9c807a', '#bea498']);
pmat('kpHair', ['#040305', '#0c090e', '#18141a', '#28222c', '#443c48']);
pmat('kpClaw', ['#060204', '#1c060a', '#3a0c10', '#64181a', '#a03c2c']);
pmat('kpTabi', ['#09080b', '#17151b', '#27242b', '#3e3a42', '#5e5a62']);
pmat('kpCord', ['#1a0a08', '#3e140e', '#6a2416', '#924028', '#b86a48']);
const KP_INK = [11, 8, 13], KP_S = 2, KP_FW = 64, KP_FH = 62, KP_OX = 32, KP_OY = 58, KP_W = KP_FW * KP_S, KP_H = KP_FH * KP_S, KP_X0 = KP_OX * KP_S, KP_Y0 = KP_OY * KP_S;
const kpC = (m, i) => PMAT[m][Math.max(0, Math.min(4, i))];
const kpHex = (m, i) => '#' + kpC(m, i).map(v => v.toString(16).padStart(2, '0')).join('');
const kpMix = (a, b, t) => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
const kpH = (i, j) => hash(i * 7 + 11, j * 13 + 5);
const KP_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const kpClamp = (v, a, b) => v < a ? a : v > b ? b : v;
const v3 = { add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k], len: a => Math.hypot(a[0], a[1], a[2]), dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2] };
v3.norm = a => { const l = v3.len(a) || 1; return v3.mul(a, 1 / l); };
// two-bone reach: the middle joint bent toward the pole
function kpIK(a, c, l1, l2, pole) {
  let d = v3.sub(c, a), L = v3.len(d);
  if (L > l1 + l2 - 0.3) { c = v3.add(a, v3.mul(d, (l1 + l2 - 0.3) / L)); d = v3.sub(c, a); L = l1 + l2 - 0.3; }
  const u = v3.norm(d), x = (L * L + l1 * l1 - l2 * l2) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  let p = v3.sub(pole, v3.mul(u, v3.dot(pole, u))); p = v3.norm(p);
  return [v3.add(a, v3.add(v3.mul(u, x), v3.mul(p, h))), c];
}

// ------------------------------------------------------------------- the rig
// Units are HD pixels, feet at the origin, Y up. She is 82 px (41 world px) to the crown: about seven heads.
const KP_PH = { idle: 4, walk: 8, atk: 4, cast: 4, rake: 4, thrust: 4, spin: 4, lunge: 2 };
const KP_YAW = { down: 0, front: 0.72, side: Math.PI / 2, back: Math.PI - 0.72, up: Math.PI };
function kpRig(pose, ph, view) {
  const R = { pose, ph, view, a: KP_YAW[view] != null ? KP_YAW[view] : 0.95, tw: 0, bz: 0, cr: 0, lean: 0, br: 0, drag: 0, sway: 0, fan: 'shut', fanOpen: 0, smear: null, smoke: 1 };
  const walk = pose === 'walk', t = walk ? ph / 8 * Math.PI * 2 : 0, s = Math.sin(t), c = Math.cos(t), k = ph % 4;
  // feet (lower-body local) and hands (upper-body local); poles for the knees and elbows
  let fR = [-3.6, 0, 1], fL = [3.6, 0, -1], liftR = 0, liftL = 0;
  let hR = [-12.5, 43, 3.5], hL = [12.5, 43, 2.5], pR = [-0.4, -0.2, -1], pL = [0.4, -0.2, -1], tipR = null, tipL = null;
  R.hipX = 0; R.tilt = 0; R.headTilt = 0; R.headBow = 0.06; R.headSide = 0;
  if (pose === 'idle') { R.br = [0, 0.6, 1, 0.5][k]; Object.assign(R, { hipX: 1.8, tilt: -0.07, headTilt: 0.06, headBow: 0.16, headSide: -0.05 }); fL = [3.4, 0, -0.6]; fR = [-6.4, 0.5, 3.6]; hR = [-7.5, 51.5 + R.br * 0.3, 9.5]; pR = [-1, -0.2, -0.6]; tipR = [-1.5, 44, 23]; hL = [12.8, 44 + R.br * 0.4, 1.5]; R.sway = [0, 0.3, 0.5, 0.2][k]; }
  if (walk) {
    fR = [-3.4, 0, 1 + 8.5 * s]; fL = [3.4, 0, 1 - 8.5 * s];
    liftR = Math.max(0, c) * 3.2; liftL = Math.max(0, -c) * 3.2; fR[1] += liftR; fL[1] += liftL;
    R.bob = 1.4 * s * s - 0.7; R.drag = 2.2; R.sway = s * 0.8; R.tw = -0.12 * s;
    hR = [-12.2, 43.5, 2 - 5 * s]; hL = [12.2, 43.5, 2 + 5 * s]; R.lean = 1; R.hipX = -s * 0.9; R.tilt = s * 0.03; R.headBow = 0.1;
  }
  const P = (o) => Object.assign(R, o);
  if (pose === 'atk') {       // the fan: drawn back high, a whip across, open at full reach, snapped shut
    [
      () => { P({ tw: -0.55, cr: 2.5, lean: -1.5, drag: -1 }); hR = [-11, 63, -10]; pR = [-1, -0.4, 0.2]; tipR = [-12, 76, -22]; hL = [5, 54, 11]; pL = [0.6, -0.4, -0.3]; fR = [-4, 0, -4]; fL = [4, 0, 4]; },
      () => { P({ tw: -0.05, cr: 3, bz: 2, lean: 2, drag: 1.5, fan: 'open', fanOpen: 0.55 }); hR = [-2, 61, 17]; pR = [-1, -0.3, -0.4]; tipR = [12, 66, 26]; hL = [8, 52, 6]; fR = [-4, 0, 5]; fL = [4, 0, -4]; },
      () => { P({ tw: 0.5, cr: 3.5, bz: 4, lean: 3, drag: 3, fan: 'open', fanOpen: 1 }); hR = [5, 55, 20]; pR = [-1, -0.5, 0]; tipR = [20, 50, 28]; hL = [10.5, 48, -7]; pL = [0.5, -0.2, 1]; fR = [-4, 0, 8]; fL = [4.2, 0, -5]; },
      () => { P({ tw: 0.2, cr: 1.5, bz: 2, lean: 1, drag: 1.5 }); hR = [-5, 50, 12]; pR = [-1, -0.2, -0.5]; tipR = [-1, 38, 24]; hL = [10, 45, 1]; fR = [-4, 0, 5]; fL = [4, 0, -3]; }
    ][k]();
    if (k === 1) R.smear = 'R';
  }
  if (pose === 'rake') {      // the claws: cocked back, raked across, through, recovered
    [
      () => { P({ tw: 0.5, cr: 2.5, lean: -1.5, drag: -1 }); hL = [11, 63, -10]; pL = [1, -0.4, 0.2]; tipL = [12, 72, -20]; hR = [-5, 53, 10]; pR = [-0.6, -0.4, -0.3]; tipR = [-4, 38, 13]; fR = [-4, 0, 3]; fL = [4, 0, -3]; },
      () => { P({ tw: 0, cr: 3, bz: 2, lean: 2, drag: 1.5 }); hL = [2, 60, 17]; pL = [1, -0.3, -0.4]; tipL = [-6, 60, 24]; hR = [-8, 51, 5]; fR = [-4, 0, -3]; fL = [4, 0, 5]; },
      () => { P({ tw: -0.45, cr: 3.5, bz: 4, lean: 3, drag: 3 }); hL = [-4, 53, 19]; pL = [1, -0.5, 0]; tipL = [-12, 46, 22]; hR = [-10.5, 48, -6]; pR = [-0.5, -0.2, 1]; fR = [-4.2, 0, -5]; fL = [4, 0, 8]; },
      () => { P({ tw: -0.15, cr: 1.5, bz: 2, lean: 1, drag: 1.5 }); hL = [5, 50, 11]; pL = [1, -0.2, -0.5]; hR = [-10, 45, 1]; fR = [-4, 0, -3]; fL = [4, 0, 5]; }
    ][k]();
    if (k === 1) R.smear = 'L';
  }
  if (pose === 'thrust') {    // both hands driven forward in a line: claws and the shut fan together
    const q = [0, 0.55, 1, 0.6][k];
    P({ cr: [3, 2.5, 3.5, 2][k], bz: q * 6, lean: -1 + q * 5, drag: q * 3 });
    hR = [-7 + q * 5, 51 + q * 6, -5 + q * 27]; hL = [7 - q * 5, 50 + q * 6, -5 + q * 26]; pR = [-1, -0.3, -0.2]; pL = [1, -0.3, -0.2];
    tipR = v3.add(hR, [q * 2, q * 1, 6 + q * 12]); if (q < 0.3) tipR = v3.add(hR, [0, -14, 4]);
    fR = [-4, 0, 5 * q]; fL = [4, 0, -5 * q];
  }
  if (pose === 'cast') {      // the offering: the fan opened upright before the veil, the claws lifted beside it
    [
      () => { P({ cr: 0.5 }); hR = [-3, 57, 9]; tipR = [-3, 73, 10]; hL = [3, 56, 9]; pR = [-1, -0.5, 0]; pL = [1, -0.5, 0]; },
      () => { P({ cr: 1, fan: 'open', fanOpen: 0.4 }); hR = [-8, 62, 15]; tipR = [-9, 78, 17]; hL = [6, 64, 13]; pR = [-1, -0.5, 0]; pL = [1, -0.5, 0]; },
      () => { P({ cr: 1.5, fan: 'open', fanOpen: 1, smoke: 2.5, br: 1 }); hR = [-9, 61, 16]; tipR = [-12, 77, 19]; hL = [10, 70, 13]; pR = [-1, -0.6, 0]; pL = [1, -0.8, 0]; tipL = [13, 82, 16]; },
      () => { P({ cr: 1.5, fan: 'open', fanOpen: 1, smoke: 3, br: 0.3 }); hR = [-9, 62, 16]; tipR = [-12, 78, 19]; hL = [10, 71, 13.5]; pR = [-1, -0.6, 0]; pL = [1, -0.8, 0]; tipL = [13, 83, 16]; }
    ][k]();
  }
  if (pose === 'spin') {      // arms flung wide, the fan open, the body turning a quarter each frame
    P({ a: R.a + k * Math.PI / 2, cr: 2, lean: 1, drag: 2.5, fan: 'open', fanOpen: 1 });
    hR = [-21, 58, 3]; hL = [21, 58, 3]; pR = [0, -0.2, -1]; pL = [0, -0.2, -1]; tipR = [-34, 60, 8]; fR = [-5, 0, 2]; fL = [5, 0, -2];
    R.smear = 'spin';
  }
  if (pose === 'lunge') {     // a low dash, everything trailing
    P({ cr: 5, lean: 4, bz: 3 + k, drag: 4 });
    hR = [-9, 53, -12]; hL = [9, 53, -11]; pR = [-1, 0, 0.3]; pL = [1, 0, 0.3]; tipR = [-8, 46, -27]; fR = [-4, 0, 9]; fL = [4, 2.5, -8];
  }
  R.tw *= 0.4 + 0.6 * Math.abs(Math.cos(R.a));   // seen side-on, a twist of the shoulders would turn the strike away from us
  R.fR = fR; R.fL = fL; R.liftR = liftR; R.liftL = liftL; R.hR = hR; R.hL = hL; R.pR = pR; R.pL = pL; R.tipR = tipR; R.tipL = tipL; R.walk = walk; R.s = s; R.c = c; R.t = t;
  return R;
}

// ------------------------------------------------------------------- v0.37: the sculpt painter
// She is modelled, not drawn: every part is a 3D surface (spheres, capsules, surfaces of revolution with folds and
// pleats, flat sheets) splatted into a depth buffer with its normal. Then one pass lights every pixel with a warm key
// from the upper left, a cool rim from behind, self-shadow read off the depth buffer and a little ambient occlusion,
// and quantizes the light into a hand-picked, hue-shifted ramp per material (shadows cool and violet, lights warm and
// ochre), broken into clusters by a coarse value noise, never by dither. The veil is a second buffer, lit the same way
// and laid over the body as sheer cloth. A coloured outline goes round the figure, broken where the key light hits.
const KS = 0.75, KW = 96, KH = 96, KX0 = 48, KY0 = 90, KFW = 64, KFH = 64, KOX = 32, KOY = 60, KN = KW * KH, KT = 0.29;
const kpRamp = hs => hs.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
// materials: ramp (dark to light, 7 tones), wrap (soft cloth light), tex (cluster noise, in tones), spec (tight metal hits)
const KM = [null], KMI = {};
const kpMat = (name, hs, o) => { KMI[name] = KM.length; KM.push(Object.assign({ name, r: kpRamp(hs), wrap: 0.25, tex: 0.5, spec: 0, rim: 1, amb: 0, gain: 1 }, o || {})); };
kpMat('veil', ['#2a2536', '#4a4458', '#6e6878', '#958e96', '#bcb3ac', '#dad0bc', '#f2e8d0'], { wrap: 0.4, tex: 0.15 });
kpMat('kosode', ['#0a0812', '#161222', '#282236', '#443c4e', '#6c6268', '#998d86', '#c4b6a4'], { wrap: 0.1, tex: 0.3 });
kpMat('verm', ['#110510', '#24091a', '#3d111c', '#5c1d1e', '#7c3024', '#9a4a30', '#b46a44'], { wrap: 0.3, tex: 0.55 });
kpMat('lacq', ['#040307', '#09060e', '#110c15', '#1a131d', '#261c26', '#3a2c32', '#8a6a52'], { wrap: 0.05, tex: 0.3, spec: 0.9, gain: 0.5 });
kpMat('straw', ['#0e0a09', '#1e1711', '#302619', '#453824', '#5e4e32', '#7a6a4a', '#9a8a68'], { tex: 0.9 });
kpMat('paper', ['#1a1622', '#36303e', '#5a525c', '#857b7a', '#aca193', '#cbc0aa', '#e8dec4'], { wrap: 0.4, tex: 0.3 });
kpMat('bronze', ['#0a0706', '#18100b', '#281a10', '#3c2a16', '#584020', '#7c5c30', '#b8965a'], { wrap: 0, tex: 0.6, spec: 1, gain: 0.8 });
kpMat('iron', ['#06060b', '#12131d', '#222430', '#363a48', '#535764', '#7a7e88', '#b8bab8'], { wrap: 0, tex: 0.5, spec: 1 });
kpMat('skin', ['#130b13', '#2b1a22', '#4a3132', '#6d4d47', '#916c60', '#b28e7e', '#cfb09c'], { wrap: 0.35, tex: 0.2 });
kpMat('hair', ['#040308', '#09070f', '#120e18', '#1c1724', '#2a2432', '#403848', '#5e5466'], { wrap: 0.1, tex: 0.4, spec: 0.3 });
kpMat('claw', ['#070205', '#130409', '#22070d', '#3a0c10', '#5a1614', '#8a2c1e', '#c8684a'], { wrap: 0, tex: 0.2, spec: 1.2 });
kpMat('tabi', ['#07060b', '#110f18', '#1c1924', '#2a2632', '#3b3743', '#524d59', '#6e6772'], { wrap: 0.2, tex: 0.4 });
kpMat('cord', ['#110509', '#280b10', '#451515', '#662217', '#8a3820', '#ab5731', '#c87d4c'], { wrap: 0.2, tex: 0.5 });
kpMat('verdi', ['#07100e', '#10201c', '#1c3530', '#2c4c42', '#406656', '#5e826c', '#86a48a'], { wrap: 0.1, tex: 0.6 });
const KP_SOOT = [20, 11, 16];
const kpVN = (() => { const g = (i, j) => hash(i * 17 + 3, j * 31 + 7); return (x, y, s) => { const X = x / s, Y = y / s, i = Math.floor(X), j = Math.floor(Y), fx = X - i, fy = Y - j, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return (g(i, j) * (1 - u) + g(i + 1, j) * u) * (1 - v) + (g(i, j + 1) * (1 - u) + g(i + 1, j + 1) * u) * v; }; })();
function kpBuf() { return { z: new Float32Array(KN).fill(-1e9), nx: new Float32Array(KN), ny: new Float32Array(KN), nz: new Float32Array(KN), m: new Uint8Array(KN), dv: new Float32Array(KN), aux: new Float32Array(KN), col: new Int32Array(KN).fill(-1), id: new Int16Array(KN).fill(-1), inn: new Uint8Array(KN) }; }
const kpNorm = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
const kpCross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

function kpPaint(pose, ph, view, g) {
  const R = kpRig(pose, ph, view), bob = R.bob || 0, cr = R.cr, ca = Math.cos(R.a), sa = Math.sin(R.a), cT = Math.cos(KT), sT = Math.sin(KT);
  // ---- camera: rig units (Y up, Z the way she faces) to HD pixels, with depth toward the camera
  const prj = (p, tw) => { const A = R.a + (tw || 0), C = Math.cos(A), S = Math.sin(A), x = p[0], z = p[2]; const sx = x * C + z * S + R.bz * sa, d = z * C - x * S + R.bz * ca; return [KX0 + KS * sx, KY0 - KS * p[1] + KS * d * sT, d * cT + p[1] * sT]; };
  const nrm = (n, tw) => { const A = R.a + (tw || 0), C = Math.cos(A), S = Math.sin(A); const nsx = n[0] * C + n[2] * S, nd = n[2] * C - n[0] * S; return [nsx, -n[1] * cT + nd * sT, nd * cT + n[1] * sT]; };
  const U = p => { const hy = Math.max(0, p[1] - 66); const y = p[1] - cr + bob + (p[1] > 58 ? R.br * 0.5 : 0) + p[0] * R.tilt * Math.min(1, Math.max(0, (p[1] - 44) / 18)) + p[0] * R.headTilt * Math.min(1, hy / 4); return [p[0] + R.hipX * 0.35 + hy * R.headSide, y, p[2] + R.lean * Math.max(0, p[1] - 44) / 26 + hy * R.headBow]; };
  const TWU = R.tw, TWL = R.tw * 0.25;
  const B = kpBuf(), V = kpBuf();
  let pid = 0;
  const put = (b, x, y, z, n, m, dv, aux, col, inner) => {
    x |= 0; y |= 0; if (x < 0 || y < 0 || x >= KW || y >= KH) return; const i = y * KW + x; if (z <= b.z[i]) return;
    b.z[i] = z; b.nx[i] = n[0]; b.ny[i] = n[1]; b.nz[i] = n[2]; b.m[i] = m; b.dv[i] = dv || 0; b.aux[i] = aux || 0; b.col[i] = col == null ? -1 : col; b.id[i] = pid; b.inn[i] = inner ? 1 : 0;
  };
  const rgbI = c => (c[0] << 16) | (c[1] << 8) | c[2];
  // ---- primitives
  // a sphere (centre in rig space, radius in rig units); tex(n) -> [mat, dv, col]
  const sphere = (b, c3, r, mat, tw, tex) => {
    pid++; const c = prj(c3, tw), rp = r * KS, m0 = KMI[mat];
    for (let y = Math.floor(c[1] - rp); y <= c[1] + rp; y++) for (let x = Math.floor(c[0] - rp); x <= c[0] + rp; x++) {
      const dx = (x + 0.5 - c[0]) / rp, dy = (y + 0.5 - c[1]) / rp, d2 = dx * dx + dy * dy; if (d2 > 1) continue;
      const nz = Math.sqrt(1 - d2), n = [dx, dy, nz]; let m = m0, dv = 0, col = null;
      if (tex) { const t = tex(n, x, y); if (t) { if (t[0]) m = KMI[t[0]]; dv = t[1] || 0; col = t[2]; } }
      put(b, x, y, c[2] + nz * r, n, m, dv, 0, col);
    }
  };
  // a capsule chain between rig points with radii r0..r1; tex(t along, n, x, y) -> [mat, dv, col]
  const capsule = (b, pts3, r0, r1, mat, tw, tex) => {
    pid++; const P2 = pts3.map(p => prj(p, tw)), m0 = KMI[mat], n = P2.length, R0 = Math.max(r0, r1) * KS;
    const xs = P2.map(p => p[0]), ys = P2.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys) - R0); y <= Math.max(...ys) + R0; y++) for (let x = Math.floor(Math.min(...xs) - R0); x <= Math.max(...xs) + R0; x++) {
      let best = null;
      for (let i = 0; i < n - 1; i++) {
        const a = P2[i], c = P2[i + 1], dx = c[0] - a[0], dy = c[1] - a[1], L2 = dx * dx + dy * dy || 1e-9;
        const t = Math.max(0, Math.min(1, ((x + 0.5 - a[0]) * dx + (y + 0.5 - a[1]) * dy) / L2)), T = (i + t) / Math.max(1, n - 1), r = (r0 + (r1 - r0) * T) * KS;
        const qx = x + 0.5 - a[0] - t * dx, qy = y + 0.5 - a[1] - t * dy, d = Math.hypot(qx, qy);
        if (d <= r) { const nz = Math.sqrt(1 - (d / r) ** 2), z = a[2] + (c[2] - a[2]) * t + nz * r / KS; if (!best || z > best[0]) best = [z, qx / r, qy / r, nz, T]; }
      }
      if (!best) continue;
      const nn = [best[1], best[2], best[3]]; let m = m0, dv = 0, col = null;
      if (tex) { const t = tex(best[4], nn, x, y); if (t) { if (t[0]) m = KMI[t[0]]; dv = t[1] || 0; col = t[2]; } }
      put(b, x, y, best[0], nn, m, dv, 0, col);
    }
  };
  // a surface of revolution: profile [[Y, r], ...] walked by arc length; surf(th, Y, r) -> [x, y, z] offsets and
  // radius changes (folds, pushes) through o.rad(th, Y) and o.off(th, Y); o.cut(th, Y) skips samples (ragged hems);
  // o.tex(th, Y, s) -> [mat, dv, aux, col]; o.xf maps a rig point to where it is drawn (U for the upper body)
  const revolve = (b, o) => {
    pid++; const m0 = KMI[o.mat], kz = o.kz || 1, prof = o.prof, xf = o.xf || (p => p), tw = o.tw || 0, cx = o.cx || 0, cz = o.cz || 0;
    const P3 = (th, Y, r) => { const rr = r + (o.rad ? o.rad(th, Y, r) : 0), off = o.off ? o.off(th, Y) : null; return xf([cx + Math.cos(th) * rr + (off ? off[0] : 0), Y + (off ? off[1] : 0), cz + Math.sin(th) * rr * kz + (off ? off[2] : 0)]); };
    const t0 = o.th0 != null ? o.th0 : 0, t1 = o.th1 != null ? o.th1 : Math.PI * 2;
    for (let k = 0; k < prof.length - 1; k++) {
      const [Ya, ra] = prof[k], [Yb, rb] = prof[k + 1], L = Math.hypot(Yb - Ya, rb - ra), ns = Math.max(1, Math.ceil(L / 0.5));
      for (let j = 0; j < ns; j++) {
        const u = j / ns, Y = Ya + (Yb - Ya) * u, r = ra + (rb - ra) * u, dth = 0.5 / Math.max(0.6, r);
        for (let th = t0; th < t1; th += dth) {
          if (o.cut && o.cut(th, Y)) continue;
          const p = P3(th, Y, r), e = 0.04, pa = P3(th + e, Y, r), pb = P3(th, Y + (Yb - Ya) / (L || 1) * 0.2, r + (rb - ra) / (L || 1) * 0.2);
          const dT = [pa[0] - p[0], pa[1] - p[1], pa[2] - p[2]], dY = [pb[0] - p[0], pb[1] - p[1], pb[2] - p[2]];
          let n = kpNorm(...kpCross(dY, dT)); const rad = [Math.cos(th), 0, Math.sin(th)];
          if (n[0] * rad[0] + n[2] * rad[2] + (o.up ? n[1] : 0) < 0) n = [-n[0], -n[1], -n[2]];
          const s = prj(p, tw); let nv = nrm(n, tw), inner = false;
          if (nv[2] < 0) { nv = [-nv[0], -nv[1], -nv[2]]; inner = true; }
          let m = m0, dv = 0, aux = 0, col = null;
          if (o.tex) { const t = o.tex(th, Y, r); if (t) { if (t[0]) m = KMI[t[0]]; dv = t[1] || 0; aux = t[2] || 0; col = t[3]; } }
          put(b, s[0], s[1], s[2], nv, m, dv, aux, col, inner);
        }
      }
    }
  };
  // a flat sheet (convex or not) through rig points; lit on the side facing us
  const sheet = (b, pts3, mat, tw, tex) => {
    pid++; const P2 = pts3.map(p => prj(p, tw)), m0 = KMI[mat];
    let n = kpNorm(...kpCross([pts3[1][0] - pts3[0][0], pts3[1][1] - pts3[0][1], pts3[1][2] - pts3[0][2]], [pts3[2][0] - pts3[0][0], pts3[2][1] - pts3[0][1], pts3[2][2] - pts3[0][2]]));
    let nv = nrm(n, tw); if (nv[2] < 0) nv = [-nv[0], -nv[1], -nv[2]];
    const xs = P2.map(p => p[0]), ys = P2.map(p => p[1]), zav = P2.reduce((a, p) => a + p[2], 0) / P2.length;
    for (let y = Math.floor(Math.min(...ys)); y <= Math.max(...ys); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.max(...xs); x++) {
      const px = x + 0.5, py = y + 0.5; let c = false;
      for (let i = 0, j = P2.length - 1; i < P2.length; j = i++) { const [xi, yi] = P2[i], [xj, yj] = P2[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c; }
      if (!c) continue;
      let wz = 0, ws = 0; for (const p of P2) { const w = 1 / (0.3 + Math.hypot(p[0] - px, p[1] - py)); wz += w * p[2]; ws += w; }
      let m = m0, dv = 0, col = null; if (tex) { const t = tex(x, y); if (t) { if (t[0]) m = KMI[t[0]]; dv = t[1] || 0; col = t[2]; } }
      put(b, x, y, wz / ws, nv, m, dv, 0, col);
    }
  };

  // ======== the rig in 3D
  const hipY = 41 - cr + bob * 0.6, hipZ = R.lean * 0.2;
  const hipR = [-3.4 + R.hipX, hipY - R.hipX * 0.45, hipZ], hipL = [3.4 + R.hipX, hipY + R.hipX * 0.45, hipZ];
  const [kneeR, ankR] = kpIK(hipR, v3.add(R.fR, [0, 4, 0]), 19, 19, [0, 0, 1]), [kneeL, ankL] = kpIK(hipL, v3.add(R.fL, [0, 4, 0]), 19, 19, [0, 0, 1]);
  const shR = [-8.8, 64.5, 0], shL = [8.8, 64.5, 0];
  const [elR, waR] = kpIK(shR, R.hR, 13, 12.5, R.pR), [elL, waL] = kpIK(shL, R.hL, 13, 12.5, R.pL);
  const stainN = g.stain || 0, front = pose !== 'idle' && pose !== 'walk';
  const flut = (k2) => R.walk ? -1.4 - Math.abs(R.s) * 0.8 : front ? -R.drag * 0.5 : Math.sin(ph * 1.6 + k2) * 0.35;

  // ---- legs: dark leggings bound with straw rope, straw-soled sandals
  for (const [hip, knee, ank, lift] of [[hipR, kneeR, ankR, R.liftR], [hipL, kneeL, ankL, R.liftL]]) {
    capsule(B, [hip, knee], 3.4, 2.8, 'tabi', TWL);
    capsule(B, [knee, ank], 2.7, 2.0, 'tabi', TWL, (t, n, x, y) => (Math.round(t * 9) % 3 === 0 && t > 0.35 ? ['straw', 0.3] : null));
    const heel = v3.add(ank, [0, -3, -1.3]), toe = v3.add(ank, [0, -3.2 + (lift ? 0.8 : 0), 4.6]);
    capsule(B, [heel, toe], 1.9, 1.6, 'tabi', TWL, (t, n) => (n[1] > 0.45 ? ['straw', 0] : t > 0.55 && n[1] < -0.2 ? ['cord', 0.4] : null));
  }
  // ---- the hakama-dress: a heavy pleated mass flaring to the ground, pushed by the legs, dragged by the walk,
  //      darkening from the hem upward
  {
    const wy = 47.8 - cr + bob * 0.8, drag = R.drag, zR = R.fR[2], zL = R.fL[2];
    const hemAt = th => 7 + cr * 0.25 + (kpVN(th * 9, 3, 1) - 0.5) * 2.4 + Math.max(0, kpVN(th * 23, 7, 1) - 0.55) * 11 + (R.walk ? (Math.cos(th) < 0 ? R.liftR : R.liftL) * 0.5 : 0);
    revolve(B, {
      mat: 'verm', tw: TWL, cx: R.hipX * 0.8, cz: hipZ, kz: 0.86,
      prof: [[wy, 6.8], [wy - 3, 7.7], [hipY, 8.7], [30, 9.7], [18, 10.7], [5, 11.8]],
      rad: (th, Y) => { const k = kpClamp((wy - Y) / (wy - 5), 0, 1), pl = (th * 14 / (Math.PI * 2) + 0.25) % 1, tri = Math.abs(pl - 0.5) * 2 - 0.5; return tri * (0.25 + 0.95 * k) + Math.sin(th * 3 + 1) * 0.35 * k; },
      off: (th, Y) => { const k = kpClamp((wy - Y) / (wy - 5), 0, 1), x = Math.cos(th), wR = kpClamp((1 - x) / 2, 0, 1) ** 2, wL = kpClamp((1 + x) / 2, 0, 1) ** 2; return [R.sway * 0.6 * k, 0, (0.7 * (zR * wR + zL * wL) + 0.3 * Math.max(zR, zL, 0) * Math.max(0, Math.sin(th))) * k * k - drag * k * (0.7 + 0.3 * (1 - Math.sin(th)))]; },
      cut: (th, Y) => Y < hemAt(th) || (Y < 17 && Math.abs(Math.sin(th) - 1) < 0.02 + 0.05 * (17 - Y) / 10) || (Y < 13 && Math.abs(Math.sin(th) + 1) < 0.03 * (13 - Y) / 6),
      tex: (th, Y) => { const h = hemAt(th), f0 = (h + 26 + stainN * 4 - Y) / (22 + stainN * 4) + (kpVN(th * 11, 1, 1) - 0.5) * 0.5, f = kpClamp(f0, 0, 1); return [null, Y - h < 1.2 ? -0.6 : 0, f]; }
    });
  }
  // ---- the kosode: white, the collar crossed left over right with a vermilion under-collar
  const collar = (th, Y) => { const f = th - Math.PI / 2; const l1 = f - (-0.55 + (67 - Y) * 0.05), l2 = f - (0.35 - (67 - Y) * 0.045); if (Y < 53 || Y > 67.6) return null; if (Math.abs(l2) < 0.07) return ['cord', -0.2]; if (Math.abs(l1) < 0.08) return ['cord', 0.2]; if (l1 > 0.08 && l1 < 0.2) return [null, 0.6]; return null; };
  revolve(B, { mat: 'kosode', tw: TWU, xf: U, kz: 0.62, prof: [[43, 6.8], [49, 6.4], [55, 7.5], [60.5, 8.6], [64, 9.3], [65.6, 8], [67, 3.4], [68.4, 2.4]], rad: (th, Y) => Math.sin(th * 5 + Y * 0.2) * 0.2 * (Y < 58 ? 1 : 0.3), tex: (th, Y) => { const c = collar(th, Y); if (c) return [c[0], c[1]]; { const f2 = th - Math.PI / 2; for (const sgn of [-1, 1]) { const u = (65.5 - Y) / 8; if (u > 0 && u < 1 && Math.abs(f2 - sgn * (0.95 + u * 0.55)) < 0.13) return ['cord', u < 0.5 ? 0.4 : -0.2]; } } if (Math.sin(th) < -0.2 && Math.abs(Math.abs(th - Math.PI * 1.5) - (Y - 48) * 0.035) < 0.06 && Y > 48 && Y < 64) return ['cord', 0]; return null; } });
  // ---- neck, head, hair (all under the veil)
  capsule(B, [U([0, 66.6, 0.3]), U([0, 71.5, 0.8])], 2.1, 2.0, 'skin', TWU);
  sphere(B, U([0, 75.4, 0.6]), 4.8, 'hair', TWU, (n) => null);
  sphere(B, U([0, 74.8, 2.0]), 3.9, 'skin', TWU, (n, x, y) => (n[1] < -0.55 ? ['hair', 0] : null));
  capsule(B, [U([0, 76, -2.8]), U([0, 64, -5]), U([0, 51.5 + (R.walk ? 1 : 0), -4.8 - R.drag * 0.4])], 4.1, 2.3, 'hair', TWU, (t) => (Math.abs(t - 0.62) < 0.05 ? ['paper', 0.4] : null));
  // ---- the shimenawa belt: a thick twisted straw rope, its knot and tails
  {
    const y0 = 46.2 - cr + bob * 0.8;
    revolve(B, { mat: 'straw', tw: TWL, cx: R.hipX * 0.8, cz: hipZ, kz: 0.86, prof: [[y0 + 2.4, 7.3], [y0 + 1.4, 8.1], [y0 - 0.8, 8.2], [y0 - 2.2, 7.5]], rad: (th, Y) => 0.35 * Math.sin((th * 7.5 + (Y - y0) * 1.3) * Math.PI), tex: (th, Y) => { const q = ((th * 7.5 + (Y - y0) * 1.3) % 1 + 1) % 1; return [null, q < 0.18 ? -1.2 : q > 0.7 ? 0.5 : 0]; } });
    const kn = [1.4 + R.hipX * 0.8, y0, hipZ + 7.4];
    const knD = prj(kn, TWL)[2] - prj([0, y0, hipZ], TWL)[2];
    if (knD > -2) {
      sphere(B, kn, 2.6, 'straw', TWL, (n, x, y) => [null, ((x + y) % 3 === 0) ? -0.8 : 0]);
      const sw2 = R.walk ? R.s * 1.2 : 0;
      capsule(B, [kn, v3.add(kn, [1.2 + sw2, -5, 0.6 - R.drag * 0.4]), v3.add(kn, [1.6 + sw2 * 1.4, -9.5, 0.4 - R.drag * 0.7])], 1.5, 1.0, 'straw', TWL);
      capsule(B, [kn, v3.add(kn, [-1.1 + sw2 * 0.6, -4, 0.7]), v3.add(kn, [-1.4 + sw2, -7.5, 0.5 - R.drag * 0.5])], 1.3, 0.9, 'straw', TWL);
    }
    // shide: zigzag paper cut hanging from the rope
    for (const th of [0.25, 2.9]) {
      const bx = Math.cos(th) * 9.2 + R.hipX * 0.8, bz = hipZ + Math.sin(th) * 8.2, fl = flut(th), ox = 0, oz = 0;
      for (let i = 0; i < 4; i++) {
        const yT = y0 - 1.5 - i * 2.6, yB = yT - 2.8, sh = (i % 2 ? 1.2 : 0), dz = fl * i * 0.5, tx = Math.cos(R.a + TWL), tz = Math.sin(R.a + TWL);
        sheet(B, [[bx + ox + tx * (sh - 1.3), yT, bz + oz + tz * (sh - 1.3) + dz], [bx + ox + tx * (sh + 1.3), yT, bz + oz + tz * (sh + 1.3) + dz], [bx + ox + tx * (sh + 1.3), yB, bz + oz + tz * (sh + 1.3) + dz + fl * 0.3], [bx + ox + tx * (sh - 1.3), yB, bz + oz + tz * (sh - 1.3) + dz + fl * 0.3]], 'paper', TWL, () => [null, i % 2 ? -0.7 : 0.2]);
      }
    }
  }
  // ---- the urns: lidded bronze on short chains, sealed with paper, verdigris in the pits
  const smokes = [];
  for (const sx of [-1, 1]) {
    const y0 = 45.5 - cr + bob * 0.8, sw3 = R.walk ? -Math.sin(R.t - 0.9) * 2.4 : front ? -R.drag * 0.6 : 0, lat = R.walk ? Math.cos(R.t) * 0.5 : 0;
    const hang = [sx * 8.4 + R.hipX * 0.8, y0 - sx * R.hipX * 0.4, hipZ - 1.6], top = [sx * 9.6 + lat + R.hipX * 0.8, y0 - 6.5 - sx * R.hipX * 0.4, hipZ - 2 + sw3];
    for (let i = 0; i < 4; i++) { const a = v3.add(hang, v3.mul(v3.sub(top, hang), i / 4)), c = v3.add(hang, v3.mul(v3.sub(top, hang), (i + 1) / 4)); capsule(B, [a, c], i % 2 ? 0.55 : 0.8, i % 2 ? 0.55 : 0.8, 'iron', TWL); }
    const U0 = v3.sub(top, [0, 12.5, 0]);
    revolve(B, { mat: 'bronze', tw: TWL, cx: U0[0], cz: U0[2], prof: [[12.9 + U0[1], 0], [12.6 + U0[1], 1.4], [11.6 + U0[1], 2.6], [10.8 + U0[1], 3.6], [10.1 + U0[1], 2.4], [8.8 + U0[1], 3.6], [6 + U0[1], 4.6], [3 + U0[1], 4.0], [1 + U0[1], 2.6], [0.2 + U0[1], 2.8], [U0[1] - 0.2, 0]],
      tex: (th, Y, r) => { const yy = Y - U0[1], h = hash(Math.round(th * 9), Math.round(yy * 1.5)); if (Math.abs(Math.sin(th) - 0.9) < 0.12 && yy > 2 && yy < 10.6) return ['paper', yy > 5 && yy < 6.4 ? -3 : 0, 0, yy > 5 && yy < 6.4 ? rgbI([140, 52, 34]) : null]; if (yy < 6 && h < 0.3) return ['verdi', 0]; if (Math.abs(yy - 10.4) < 0.4) return [null, -1.2]; return null; } });
    smokes.push([prj([top[0], top[1] + 0.6, top[2]], TWL), sx]);
  }
  // ---- arms: bound white sleeves with a hanging sleeve-bag, cord wound up the forearm, pale hands; fan and claws
  const armOrder = ['R', 'L'];
  for (const side of armOrder) {
    const sh = side === 'R' ? shR : shL, el = side === 'R' ? elR : elL, wr = side === 'R' ? waR : waL, S3 = U(sh), E3 = U(el), W3 = U(wr);
    const lag = (R.walk ? R.s * (side === 'R' ? 1 : -1) * 1.8 : 0) - (front ? R.drag * 0.8 : 0);
    const mid = v3.mul(v3.add(E3, W3), 0.5);
    sheet(B, [v3.add(E3, [0, -1, -0.6]), v3.add(W3, [0, -1.4, -0.6]), v3.add(mid, [0, -8.5, -2 + lag]), v3.add(E3, [0, -7, -2.2 + lag * 0.6])], 'kosode', TWU, (x, y) => [null, (x % 3 === 0) ? -0.8 : -0.3]);
    capsule(B, [S3, E3], 3.0, 2.7, 'kosode', TWU, (t, n) => [null, Math.sin(t * 12) * 0.25]);
    capsule(B, [E3, W3], 2.6, 2.1, 'kosode', TWU, (t, n, x, y) => (t > 0.45 && Math.round(t * 14 + n[0] * 2) % 3 === 0 ? ['cord', 0] : t > 0.45 ? ['cord', -0.9] : null));
    const dir = v3.norm(v3.sub(W3, E3)), H3 = v3.add(W3, v3.mul(dir, 1.6));
    sphere(B, H3, 2.1, 'skin', TWU);
    const tip3 = side === 'R' ? (R.tipR ? U(R.tipR) : null) : (R.tipL ? U(R.tipL) : null);
    const fd = tip3 ? v3.norm(v3.sub(tip3, H3)) : v3.norm(v3.add(dir, [0, 0.2, 0.25]));
    if (side === 'L') {
      // lacquered claws: a guard over the knuckles and three curved blades
      const side3 = v3.norm(kpCross(fd, [0, 1, 0.001])), up3 = v3.norm(kpCross(side3, fd)), len = g.clawLong ? 12 : 9.5;
      sphere(B, v3.add(H3, v3.mul(fd, 1.2)), 2.2, 'claw', TWU);
      for (let i = 0; i < 3; i++) { const o = (i - 1) * 1.6, b0 = v3.add(v3.add(H3, v3.mul(fd, 2.2)), v3.mul(side3, o)), m = v3.add(b0, v3.add(v3.mul(fd, len * 0.55), v3.mul(side3, o * 0.3))), e = v3.add(m, v3.add(v3.mul(fd, len * 0.45), v3.mul(up3, -1.6))); capsule(B, [b0, m, e], 0.8, 0.3, 'claw', TWU); }
    } else {
      // the iron tessen: shut, a tapering ribbed bar; open, iron leaves spread about the rivet with a faded sun
      let upv = v3.norm(v3.sub([0, 1, 0], v3.mul(fd, fd[1]))); if (!isFinite(upv[0])) upv = [1, 0, 0];
      const open = R.fan === 'open' ? R.fanOpen : 0, len = 17;
      if (open > 0.05) {
        const span = 0.3 + 1.9 * open, pts = [v3.add(H3, v3.mul(fd, -1))];
        for (let i = 0; i <= 12; i++) { const q = -span / 2 + span * i / 12, r = len - (i % 2 ? 0.6 : 0); pts.push(v3.add(H3, v3.add(v3.mul(fd, Math.cos(q) * r), v3.mul(upv, Math.sin(q) * r)))); }
        const Hs = prj(H3, TWU), T0 = prj(v3.add(H3, v3.mul(fd, len)), TWU), U1 = prj(v3.add(H3, v3.mul(upv, len)), TWU);
        sheet(B, pts, 'iron', TWU, (x, y) => {
          const px = x + 0.5 - Hs[0], py = y + 0.5 - Hs[1], ax = T0[0] - Hs[0], ay = T0[1] - Hs[1], bx = U1[0] - Hs[0], by = U1[1] - Hs[1], det = ax * by - ay * bx || 1e-6;
          const u = (px * by - py * bx) / det, v = (ax * py - ay * px) / det, rr = Math.hypot(u, v), q = Math.atan2(v, u), rib = (q + span / 2) / span * 10, fr = rib - Math.round(rib);
          if (rr > 0.9) return [null, 3]; if (Math.abs(fr) < 0.12) return [null, -0.6]; if (fr > 0 && fr < 0.3) return [null, 2.4];
          if (Math.abs(rr - 0.58) < 0.13 && Math.abs(q) < span * 0.2) return ['verm', -0.5];
          return [null, 1.5];
        });
        // the lit outer edge and the two guard leaves: an open fan seen edge-on still reads as a bright iron arc
        capsule(B, pts.slice(1), 0.55, 0.55, 'iron', TWU, () => [null, 2.5]);
        capsule(B, [pts[0], pts[1]], 0.6, 0.5, 'iron', TWU, () => [null, 1.5]); capsule(B, [pts[0], pts[pts.length - 1]], 0.6, 0.5, 'iron', TWU, () => [null, 1.5]);
        sphere(B, H3, 1.2, 'bronze', TWU);
      } else {
        const side3 = v3.norm(kpCross(fd, [0, 0.001, 1])), a0 = v3.add(H3, v3.mul(fd, -1.5)), a1 = v3.add(H3, v3.mul(fd, len));
        sheet(B, [v3.add(a0, v3.mul(side3, -1.3)), v3.add(a1, v3.mul(side3, -0.9)), v3.add(a1, v3.mul(fd, 1)), v3.add(a1, v3.mul(side3, 0.9)), v3.add(a0, v3.mul(side3, 1.3))], 'iron', TWU, (x, y) => [null, ((x + y) % 2 ? 0.5 : -0.6)]);
        sphere(B, H3, 1.0, 'bronze', TWU);
      }
      // the faded vermilion tassel at the rivet
      const pv = v3.add(H3, v3.mul(fd, -1.8)), sw4 = R.walk ? R.s * 1.5 : 0;
      capsule(B, [pv, v3.add(pv, [0.6 + sw4, -3.2, 0]), v3.add(pv, [0.3 + sw4 * 1.4, -6, -0.4])], 0.7, 1.1, 'cord', TWU);
    }
  }
  // ---- the ichime-gasa: black lacquer over woven bamboo, a raised crown, worn at the rim, shide on the brim
  {
    const hc = [0, 80.6, 0.6];
    revolve(B, { mat: 'lacq', tw: TWU, xf: U, cz: 0.6, up: true, prof: [[88.6, 0], [88.4, 1.4], [87.6, 2.3], [86, 3], [83, 5.2], [81.6, 6.4], [81.1, 8.5], [80.6, 12], [80, 14.6], [79.5, 15.3], [79.1, 15.4]],
      tex: (th, Y, r) => { if (r > 14.8) return [null, 1.3]; if (r > 7 && ((th * 36 / (Math.PI * 2)) % 1) < 0.16) return [null, -0.9]; if (Math.abs(r - 12) < 0.35) return [null, -0.8]; if (r < 3.2 && Y > 87) return [null, 0.6]; return null; } });
    for (const th of [0.5, 2.4, 3.9]) {
      const bx = Math.cos(th) * 15.5, bz = 0.6 + Math.sin(th) * 15.5, fl = flut(th), tx = Math.cos(R.a + TWU), tz = Math.sin(R.a + TWU);
      for (let i = 0; i < 4; i++) {
        if (i === 3) break;
        const yT = 79.4 - i * 4, yB = yT - 4.3, sh = (i % 2 ? 1.4 : 0), dz = fl * i * 0.6;
        sheet(B, [U([bx + tx * (sh - 1.7), yT, bz + tz * (sh - 1.7) + dz]), U([bx + tx * (sh + 1.7), yT, bz + tz * (sh + 1.7) + dz]), U([bx + tx * (sh + 1.7), yB, bz + tz * (sh + 1.7) + dz + fl * 0.3]), U([bx + tx * (sh - 1.7), yB, bz + tz * (sh - 1.7) + dz + fl * 0.3])], 'paper', TWU, () => [null, i % 2 ? -0.7 : 0.2]);
      }
    }
  }
  // ======== the veil: sheer silk draped over the head and shoulders, falling in folds, stained from the inside
  {
    const faceTh = Math.PI / 2, drag = R.drag;
    const hemAt = th => 55 + (kpVN(th * 7, 9, 1) - 0.5) * 3 + Math.sin(th) * 2 + Math.max(0, kpVN(th * 19, 4, 1) - 0.6) * 9;
    revolve(V, {
      mat: 'veil', tw: TWU, xf: U, cz: 0.9, kz: 0.92,
      prof: [[80.3, 5.5], [77, 5.9], [73.5, 5.6], [70.5, 5.5], [68.4, 6.2], [66.8, 7.8], [65, 9.0], [62, 9.3], [57, 9.2], [52, 9.4]],
      rad: (th, Y) => { const k = kpClamp((70 - Y) / 18, 0, 1); return Math.sin(th * 9 + 0.6) * 0.9 * k + Math.sin(th * 4 + 2) * 0.5 * k; },
      off: (th, Y) => { const k = kpClamp((66 - Y) / 15, 0, 1); return [R.sway * k, 0, -drag * k * (0.8 + 0.4 * (1 - Math.sin(th)))]; },
      cut: (th, Y) => Y < hemAt(th),
      tex: (th, Y) => {
        const h = hemAt(th), df = th - faceTh; let col = null, dv = 0;
        if (Y - h < 1) dv = -1.2; else if (Y - h < 2.5) dv = -0.5;
        // the stain: a blot at the mouth, runs below it, old blood at the heart and bruise at the rim
        const sx = df * 6.5, sy = Y - 71.6, r0 = 3.4 + stainN * 0.7, d = Math.hypot(sx / (r0 * 1.2), sy / r0) + (kpVN(sx * 3 + 20, sy * 3 + 20, 1.3) - 0.5) * 0.6;
        const runs = [[-1.8, 9 + stainN * 2], [0.4, 14 + stainN * 3], [2.2, 7 + stainN * 2]];
        let st = d < 1.25 ? (d < 0.5 ? 0 : d < 0.85 ? 1 : 2) : -1;
        for (const [rx, L] of runs) if (Math.abs(sx - rx - Math.sin(sy * 0.6) * 0.3) < 0.7 && sy < 0 && -sy < L) st = st < 0 ? (-sy < L * 0.5 ? 1 : 2) : st;
        if (st >= 0) col = rgbI([[34, 12, 22], [58, 26, 40], [84, 56, 86]][st]);
        return [null, dv, st >= 0 ? 1 : 0, col];
      }
    });
  }
  // ======== the smear of a strike
  let smear = null;
  if (R.smear) {
    const side = R.smear === 'L' ? 'L' : 'R';
    if (R.smear === 'spin') { const cc = prj(U([0, 58, 0]), TWU); smear = { spin: cc }; }
    else {
      const a0 = kpRig(pose, 0, view), a2 = kpRig(pose, 2, view);
      const tipOf = Rg => { const h = side === 'R' ? Rg.hR : Rg.hL, tp = side === 'R' ? Rg.tipR : Rg.tipL; return [h, tp || h]; };
      const [h0, t0] = tipOf(a0), [h2, t2] = tipOf(a2), hm = side === 'R' ? R.hR : R.hL, tm = (side === 'R' ? R.tipR : R.tipL) || hm;
      const hp = [], tp = [];
      for (let i = 0; i <= 10; i++) { const u = i / 10, bz = (a, m, b) => a.map((v, j) => (1 - u) * (1 - u) * v + 2 * u * (1 - u) * (m[j] * 2 - (a[j] + b[j]) / 2) + u * u * b[j]); hp.push(prj(U(bz(h0, hm, h2)), TWU)); tp.push(prj(U(bz(t0, tm, t2)), TWU)); }
      smear = { hp, tp };
    }
  }
  return { R, B, V, smokes, smear, front };
}

// ------------------------------------------------------------------- lighting, compositing and the outline
const KP_L = kpNorm(-0.62, -0.58, 0.53), KP_RIM = kpNorm(0.75, -0.25, -0.45), KP_HV = kpNorm(-0.62, -0.58, 1.53);
function kpShade(b, out, isVeil) {
  for (let y = 0; y < KH; y++) for (let x = 0; x < KW; x++) {
    const i = y * KW + x, mi = b.m[i]; if (!mi) continue;
    const M = KM[mi], n = [b.nx[i], b.ny[i], b.nz[i]], z = b.z[i];
    // self-shadow: something well in front of this pixel, toward the light, casts on it
    let sh = 1;
    for (let k = 1; k <= 5; k++) { const qx = Math.round(x - k * 0.75), qy = Math.round(y - k * 0.75); if (qx < 0 || qy < 0) break; const q = qy * KW + qx; if (b.m[q] && b.z[q] > z + 1.2 + k * 0.5) { sh = 0.3; break; } }
    // ambient occlusion: crowded by nearer surfaces
    let ao = 0; for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) { const qx = x + dx, qy = y + dy; if (qx < 0 || qy < 0 || qx >= KW || qy >= KH) continue; const q = qy * KW + qx; if (b.m[q] && b.z[q] > z + 2.5) ao += 0.07; }
    let d = n[0] * KP_L[0] + n[1] * KP_L[1] + n[2] * KP_L[2]; d = Math.max(0, (d + M.wrap) / (1 + M.wrap)); d = Math.max(0, Math.min(1, (d - 0.12) * 1.4));   // a firmer terminator: the core shadow turns sharply
    const rim = Math.max(0, n[0] * KP_RIM[0] + n[1] * KP_RIM[1] + n[2] * KP_RIM[2]) ** 1.5 * 0.5 * M.rim * (1 - n[2] * 0.6);
    const spec = M.spec ? Math.pow(Math.max(0, (n[0] * KP_HV[0] + n[1] * KP_HV[1] + n[2] * KP_HV[2])), 28) * M.spec * sh : 0;
    const bounce = Math.max(0, n[1]) * 0.08;
    let v = 0.03 + 0.98 * d * sh * M.gain + rim * 1.3 + bounce + spec * 1.2 - ao;
    if (b.inn[i]) v = v * 0.35 - 0.05;
    let idx = v * 6 + b.dv[i] + (kpVN(x + mi * 13, y, 2.2) - 0.5) * M.tex * 2;
    idx = Math.max(0, Math.min(6, Math.round(idx)));
    let c = b.col[i] >= 0 ? [(b.col[i] >> 16) & 255, (b.col[i] >> 8) & 255, b.col[i] & 255] : M.r[idx];
    if (b.col[i] >= 0) { const k = 0.55 + v * 0.7; c = [c[0] * k, c[1] * k, c[2] * k]; }
    if (!isVeil && b.aux[i] > 0) { const q = Math.min(3, Math.floor(b.aux[i] * 3.99)) / 3; c = [c[0] + (KP_SOOT[0] - c[0]) * q * 0.85, c[1] + (KP_SOOT[1] - c[1]) * q * 0.85, c[2] + (KP_SOOT[2] - c[2]) * q * 0.85]; }
    const o = i * 4; out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2];
    out[o + 3] = isVeil ? Math.round(255 * (b.aux[i] > 0 ? 0.92 : b.dv[i] < -0.3 ? 0.66 : idx >= 5 ? 0.42 : idx <= 1 ? 0.34 : 0.14)) : 255;
    b.v = b.v || new Float32Array(KN); b.v[i] = idx;
  }
}
function kpCompose(o, ph) {
  const W = KW, H = KH, D = new Uint8ClampedArray(KN * 4), VV = new Uint8ClampedArray(KN * 4);
  kpShade(o.B, D, false); kpShade(o.V, VV, true);
  // the veil over the body where it is nearer, with its own edge a little denser
  const vB = o.V, bB = o.B, vin = i => i >= 0 && i < KN && vB.m[i];
  for (let i = 0; i < KN; i++) {
    if (window.__kpNoVeil || !vB.m[i] || (bB.m[i] && bB.z[i] > vB.z[i])) continue;
    const q = i * 4, x = i % W; let a = VV[q + 3] / 255;
    if (!vin(i - 1) || !vin(i + 1) || !vin(i - W) || !vin(i + W) || x === 0 || x === W - 1) a = Math.max(a, 0.85);
    if (!D[q + 3]) a *= 0.9;
    const b = D[q + 3] / 255, oa = a + b * (1 - a);
    for (let k = 0; k < 3; k++) D[q + k] = (VV[q + k] * a + D[q + k] * b * (1 - a)) / Math.max(1e-6, oa);
    D[q + 3] = oa * 255; bB.v = bB.v || new Float32Array(KN); bB.v[i] = vB.v ? vB.v[i] : 3; bB.m[i] = bB.m[i] || vB.m[i];
  }
  // the outline: a dark edge tinted by the material it borders, broken to a lit edge where the key light falls on it
  const S = new Uint8ClampedArray(D), mOf = i => (bB.m[i] || vB.m[i]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, q = i * 4; if (S[q + 3] > 90) continue;
    let nb = -1, lit = false;
    for (const [dx, dy, l] of [[1, 0, 1], [0, 1, 1], [-1, 0, 0], [0, -1, 0]]) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= W || b >= H) continue; const j = b * W + a; if (S[j * 4 + 3] > 90) { if (nb < 0 || l) { nb = j; lit = !!l; } } }
    if (nb < 0) continue;
    const M = KM[mOf(nb)] || KM[1], vi = bB.v ? bB.v[nb] : 2;
    let c;
    if (lit && vi >= 4) c = M.r[Math.max(1, Math.min(3, vi - 2))];             // on the lit side the edge breaks: a mid tone
    else c = [M.r[0][0] * 0.7 + 4, M.r[0][1] * 0.6 + 2, M.r[0][2] * 0.8 + 8];   // elsewhere the deepest tone, pushed to violet
    D[q] = c[0]; D[q + 1] = c[1]; D[q + 2] = c[2]; D[q + 3] = 255;
  }
  // the smear: a sheer band of pale iron light following the weapon, brightest on the leading edge
  const cv = mkCanvas(W, H), x = cv.getContext('2d', { willReadFrequently: true }), img = x.createImageData(W, H);
  if (o.smear && !o.smear.spin) {
    const { hp, tp } = o.smear, poly = tp.concat(hp.slice().reverse());
    let x0 = W, x1 = 0, y0 = H, y1 = 0; for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let yy = Math.max(0, Math.floor(y0)); yy <= Math.min(H - 1, y1); yy++) for (let xx = Math.max(0, Math.floor(x0)); xx <= Math.min(W - 1, x1); xx++) {
      let c2 = false; const px = xx + 0.5, py = yy + 0.5;
      for (let a = 0, b = poly.length - 1; a < poly.length; b = a++) { const [xa, ya] = poly[a], [xb, yb] = poly[b]; if ((ya > py) !== (yb > py) && px < (xb - xa) * (py - ya) / (yb - ya) + xa) c2 = !c2; }
      if (!c2) continue;
      const q = (yy * W + xx) * 4, al = 0.26 + (kpVN(xx, yy * 2, 2) > 0.6 ? 0.14 : 0), bb = D[q + 3] / 255, cc = [196, 186, 188];
      for (let k = 0; k < 3; k++) D[q + k] = cc[k] * al + D[q + k] * (1 - al) * (bb > 0 ? 1 : 0) + (bb > 0 ? 0 : 0);
      D[q + 3] = Math.max(D[q + 3], al * 255 * 1.5);
    }
    for (let k = 0; k < tp.length - 1; k++) { const [a0, b0] = tp[k], [a1, b1] = tp[k + 1], n = Math.max(1, Math.ceil(Math.hypot(a1 - a0, b1 - b0))); for (let s = 0; s < n; s++) { const xx = Math.round(a0 + (a1 - a0) * s / n), yy = Math.round(b0 + (b1 - b0) * s / n); if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = (yy * W + xx) * 4; D[q] = 226; D[q + 1] = 216; D[q + 2] = 200; D[q + 3] = 230; } }
  }
  if (o.smear && o.smear.spin) {
    const [cx, cy] = o.smear.spin;
    for (let a = -Math.PI * 0.95; a < 0; a += 0.02) for (let r = 16; r < 24; r += 0.7) { const xx = Math.round(cx + Math.cos(a) * r), yy = Math.round(cy + Math.sin(a) * r * 0.32 + 2); if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = (yy * W + xx) * 4; if (D[q + 3] > 200) continue; const al = r > 22.5 ? 0.8 : 0.25; D[q] = 200; D[q + 1] = 190; D[q + 2] = 190; D[q + 3] = al * 255; }
  }
  img.data.set(D); x.putImageData(img, 0, 0);
  // the urns' breath: a thin, murky thread that curls up from each lid and darkens as it thins
  const pal = ['rgba(34,22,40,0.8)', 'rgba(62,42,70,0.72)', 'rgba(88,70,92,0.6)', 'rgba(104,96,98,0.42)'];
  for (const [p, side] of o.smokes) {
    const n = Math.round(6 * o.R.smoke);
    for (let i = 0; i < n; i++) {
      const u = i / Math.max(1, n - 1), yy = p[1] - 1 - i * 1.3, xx = p[0] + Math.sin(i * 0.8 + ph * 1.4 + side) * (0.5 + u * 2) - (o.R.walk ? u * 2.5 : 0);
      x.fillStyle = pal[Math.min(3, Math.floor(u * 4))]; x.fillRect(Math.round(xx), Math.round(yy), 1, 1);
      if (i % 3 === 1) x.fillRect(Math.round(xx) + 1, Math.round(yy), 1, 1);
    }
  }
  return cv;
}

// ------------------------------------------------------------------- frames
function kpStain() { if (!G.running || !isMias()) return 0; const f = MS.frac(); return f < 0.3 ? 0 : f < 0.7 ? 1 : 2; }
function kpGear() { const w = P.eq && P.eq.weapon; return { stain: kpStain(), clawLong: !!(w && BASES[w.base] && BASES[w.base].claw) }; }
function kpFrame(pose, ph, view, g) {
  const key = '37|keeper|' + pose + '|' + ph + '|' + view + '|' + g.stain + (g.clawLong ? 'c' : '');
  let fr = HERO_FR[key]; if (fr) return fr;
  const hr = kpCompose(kpPaint(pose, ph, view, g), ph);
  const lo = mkCanvas(KFW, KFH), lx = lo.getContext('2d'); lx.imageSmoothingEnabled = true; lx.drawImage(hr, 0, 0, KFW, KFH);
  lo._hr = hr;
  const flip = (src, W, H) => { const f = mkCanvas(W, H), fx = f.getContext('2d'); fx.translate(W, 0); fx.scale(-1, 1); fx.drawImage(src, 0, 0); return f; };
  const f = flip(lo, KFW, KFH); f._hr = flip(hr, KW, KH);
  const tint = (src, col) => {
    const mk = (s2, W, H) => { const q = mkCanvas(W, H), qx = q.getContext('2d'); qx.drawImage(s2, 0, 0); qx.globalCompositeOperation = 'source-in'; qx.fillStyle = col; qx.fillRect(0, 0, W, H); return q; };
    const q = mk(src, KFW, KFH); if (src._hr) q._hr = mk(src._hr, KW, KH); return q;
  };
  fr = { c: lo, f, w: KFW, h: KFH, ox: KOX, oy: KOY, bb: { x: KOX - 9, y: KOY - 44, w: 18, h: 45 }, tint };
  let fl = null, flf = null;   // the hit-flash silhouettes are made the first time they are asked for
  Object.defineProperty(fr, 'fl', { get: () => fl || (fl = tint(lo, '#fff')), enumerable: true });
  Object.defineProperty(fr, 'flf', { get: () => flf || (flf = tint(f, '#fff')), enumerable: true });
  HERO_FR[key] = fr; return fr;
}
window.__kpFrame = (...a) => kpFrame(...a); window.__kpDbg = { kpPaint, KMI };
{
  const _hf = heroFrame;
  heroFrame = function (cls, pose, ph, view) {
    if (cls !== 'miasmancer') return _hf(cls, pose, ph, view);
    if (!view) view = P._view || (P._fb ? 'back' : 'front');
    if (!KP_YAW.hasOwnProperty(view)) view = 'front';
    if (pose === 'wind') pose = 'cast';
    if (!KP_PH[pose]) pose = 'idle';
    if ((view === 'down' || view === 'up') && pose !== 'idle' && pose !== 'walk' && pose !== 'spin') view = view === 'down' ? 'front' : 'back';
    if (typeof MN_LASTHERO !== 'undefined' && cls === P.cls) { MN_LASTHERO.pose = pose; MN_LASTHERO.ph = ph; MN_LASTHERO.view = view; }
    return kpFrame(pose, ((ph | 0) % KP_PH[pose] + KP_PH[pose]) % KP_PH[pose], view, kpGear());
  };
  if (window.__spm) window.__spm.heroFrame = (...a) => heroFrame(...a);
  // each skill picks one of her poses; the cast remembers which skill it was (miasCast is the gate they all pass)
  const KP_SKPOSE = { vblade: 'cast', fang: 'atk', shuriken: 'atk', mcloud: 'cast', inhale: 'cast', exhale: 'cast', pnova: 'cast', contagion: 'cast', rotwall: 'atk', mstorm: 'spin',
    blur: 'lunge', dstep: 'lunge', dflight: 'lunge', ntrap: 'cast', mwake: 'cast', bmine: 'cast', haze: 'cast', mirage: 'cast', lure: 'cast',
    rarc: 'atk', gstrike: 'rake', thrust: 'thrust', talon: 'rake', reap: 'spin', flurry: 'rake', execute: 'thrust', fkiss: 'rake' };
  const _mc = miasCast;
  miasCast = function (id, pt) {
    const c0 = P.cast, s0 = P.swing, sis = G.sisterCast;
    _mc(id, pt);
    if (sis) return;
    if (P.cast > c0 + 1e-6 || P.swing > s0 + 1e-6 || G.mdash) { P._kpId = id; P._kpT = G.time; }
  };
  if (window.__spm) window.__spm.miasCast = (...a) => miasCast(...a);
  const _hp = heroPose;
  heroPose = function () {
    const r = _hp(); if (!isMias()) return r;
    if (P.swing > (P._swL || 0) + 1e-6) P._sw0 = P.swing; P._swL = P.swing;
    if (P.cast > (P._caL || 0) + 1e-6) P._ca0 = P.cast; P._caL = P.cast;
    const id = P._kpId, po = id && KP_SKPOSE[id];
    if (G.mdash) return ['lunge', Math.floor(G.time * 12) % 2];
    if (P.mstormT > 0 && P.cast <= 0 && P.swing <= 0 && r[0] !== 'walk') return ['spin', Math.floor(G.time * 8) % 4];
    // a strike runs anticipation, smear, reach, settle over its own length; no frames are added to it
    const prog = (v, v0) => Math.min(3, Math.floor((1 - v / Math.max(0.05, v0)) * 4));
    if (po && (P.cast > 0 || P.swing > 0) && G.time - (P._kpT || -9) < 1.5) {
      if (po === 'lunge') return ['lunge', Math.floor(G.time * 12) % 2];
      if (po === 'spin') return ['spin', Math.floor(G.time * 10) % 4];
      if (id === 'flurry') return ['rake', 1 + Math.floor(G.time * 14) % 2];
      const p = P.cast > 0 ? prog(P.cast, P._ca0 || 0.4) : prog(P.swing, P._sw0 || 0.22);
      return [po, p];
    }
    if (P.kickT > 0 && P.cast <= 0 && P.swing <= 0) return ['rake', 2];
    if (r[0] === 'atk') return [clawOn() ? 'rake' : 'atk', prog(P.swing, P._sw0 || 0.22)];
    if (r[0] === 'cast') return ['cast', P.cast > 0 ? prog(P.cast, P._ca0 || 0.5) : 2 + Math.floor(G.time * 5) % 2];
    if (r[0] === 'walk') return ['walk', Math.floor(P._wd * 5.5) % 8];
    if (r[0] === 'idle') return ['idle', Math.floor(G.time * 1.8) % 4];
    return r;
  };
}
// frames are painted when first needed (15-30 ms each); in the quiet between, paint ahead the ones she will need soon,
// one at a time, so turning or striking never waits on the painter
{
  const order = () => {
    const v0 = P._view || 'front', vs = [v0, 'front', 'side', 'back', 'down', 'up'].filter((v, i, a) => a.indexOf(v) === i), out = [];
    for (const v of vs) { for (let i = 0; i < 4; i++) out.push(['idle', i, v]); for (let i = 0; i < 8; i++) out.push(['walk', i, v]); }
    for (const v of ['front', 'side', 'back']) for (const po of ['atk', 'cast', 'rake', 'thrust']) for (let i = 0; i < 4; i++) out.push([po, i, v]);
    return out;
  };
  let q = null, st = -1, idx = 0;
  const tick = () => {
    try {
      if (G.running && isMias()) {
        const s2 = kpStain(); if (s2 !== st || !q) { st = s2; q = order(); idx = 0; }
        const t0 = performance.now();
        while (idx < q.length && performance.now() - t0 < 8) { const [po, ph, v] = q[idx++]; kpFrame(po, ph, v, kpGear()); }
      }
    } catch (e) { q = null; }
    setTimeout(tick, idx < (q ? q.length : 0) ? 120 : 500);
  };
  setTimeout(tick, 1500);
}
// =================================================================== v0.37: her skills, repainted
// Everything she breathes is murk, never light: miasma is bruise-purple going sick green at the edges, drawn as
// pixel-art smoke (clusters lit from the upper left, a dark tinted underside), never as clean rings or bright glows.
// Each breath carries the dream steeped in it and looks it:
//   drowning   (Nova, Tide, the censer)   black-teal water-murk that rolls like a wave, pale foam on the crest, drips
//   the kami   (Mirage, Lure, talismans)  ash-gold dust, paper, shimenawa rope; sigils burned into the ground
//   long sleep (Haze)                     heavy slate-violet fog lying low, slow dark motes, a burned eyelid sigil
//   the dying  (Contagion, Exhale, Inhale) sick ochre-green breath, ash, a burned ring under the marked
//   miasma     (the cloud she wears, clouds, venom, hurricane, shuriken, mines)  bruise-purple
// Every cast: a short gather at her veil (anticipation), the fan snapping open as a pale iron smear and a burst of the
// breath (release), then nothing that waits. Every hit: the victim coughs a spray of the murk. Every death: the victim
// breathes out a last plume that drifts across to her and is drawn in under her veil.
{
  const PAL = {
    mias: ['#1c1224', '#34203e', '#4e3456', '#6a4a6c', '#8a6a82', '#7a8a5e'],
    drown: ['#0a1618', '#16282e', '#244240', '#365e56', '#56806e', '#a8b8a0'],
    kami: ['#221c14', '#3e3222', '#5e4e34', '#86724c', '#b09a6e', '#d8c8a0'],
    sleep: ['#141424', '#242440', '#3a3a5a', '#545474', '#727090', '#9a90a8'],
    dying: ['#1a160c', '#322c16', '#4e461e', '#6c622c', '#8c8040', '#aea060']
  };
  const FLAV = { pnova: 'drown', rotwall: 'drown', mwake: 'drown', haze: 'sleep', mirage: 'kami', lure: 'kami', ntrap: 'kami', contagion: 'dying', exhale: 'dying', inhale: 'dying' };
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const vn = kpVN;
  // ---- a puff of smoke: an irregular blob lit from the upper left in four tones, a dark tinted underside, the
  //      palette's accent on a few lit pixels at the rim (sick green in miasma, foam in drowning)
  const PUFF = {};
  const puff = (pal, r, v) => {
    const key = pal + r + '|' + v; if (PUFF[key]) return PUFF[key];
    const P2 = PAL[pal.replace('~', '')].map(rgb), S = r * 2 + 3, c = mkCanvas(S, S), x = c.getContext('2d'), im = x.createImageData(S, S), D = im.data, cx = S / 2, cy = S / 2;
    const inside = (i, j) => { const dx = (i + 0.5 - cx) / r, dy = (j + 0.5 - cy) / (r * 0.82); return Math.hypot(dx, dy) + (vn(i + v * 31, j + v * 17, Math.max(1.5, r * 0.45)) - 0.5) * 0.75 < 1; };
    const torn = pal.endsWith('~'); if (torn) pal = pal.slice(0, -1);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      if (!inside(i, j)) continue;
      if (torn && vn(i * 1.3 + v * 11, j * 2.2 + v * 7, 1.6) > 0.62) continue;   // holes torn through the smoke
      const dx = (i + 0.5 - cx) / r, dy = (j + 0.5 - cy) / r, nz = Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
      let l = (-dx * 0.62 - dy * 0.58 + nz * 0.53) * 0.8 + 0.4 + (vn(i * 1.7 + v * 5, j * 1.7, 2) - 0.5) * 0.5;
      if (!inside(i + 1, j + 1)) l -= 0.45;                                    // the underside of the billow
      let k = Math.max(0, Math.min(4, Math.round(l * 4)));
      if (!inside(i - 1, j - 1) && k >= 3 && hash(i + v, j) < 0.35) k = 5;     // an accent on the lit rim
      const q = (j * S + i) * 4, cc = P2[k], edge = !inside(i + 1, j) || !inside(i - 1, j) || !inside(i, j + 1) || !inside(i, j - 1); D[q] = cc[0]; D[q + 1] = cc[1]; D[q + 2] = cc[2]; D[q + 3] = edge ? 140 : 255;
    }
    x.putImageData(im, 0, 0); return (PUFF[key] = c);
  };
  const drawPuff = (pal, sx, sy, r, a, v) => { r = Math.max(2, Math.round(r * 1.15)); const c = puff(pal, r, (v | 0) % 5); ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.35)); ctx.drawImage(c, Math.round(sx - c.width / 2), Math.round(sy - c.height / 2)); ctx.globalAlpha = 1; };
  // ---- a sigil burned into the ground: a charred ring, broken, with glyph strokes, embers dying in the char
  const SIG = {};
  const sigil = (kind, R) => {
    const key = kind + R; if (SIG[key]) return SIG[key];
    const W2 = Math.ceil(R * ISO_R * 2 + 6), H2 = Math.ceil(R * ISO_RY * 2 + 6), c = mkCanvas(W2, H2), x = c.getContext('2d'), cx = W2 / 2, cy = H2 / 2;
    const char = '#0a0506', burn = '#3a1a10', ash = '#5a5044', ember = '#7a2e14';
    const dot = (px, py, col) => { x.fillStyle = col; x.fillRect(Math.round(px), Math.round(py), 1, 1); };
    const ring = (rr, gaps, w) => { for (let a = 0; a < Math.PI * 2; a += 0.6 / (rr * ISO_R)) { if (vn(a * 6, rr, 1) < gaps) continue; for (let t = 0; t < w; t++) { const px = cx + Math.cos(a) * (rr * ISO_R - t * 0.8), py = cy + Math.sin(a) * (rr * ISO_RY - t * 0.4); dot(px, py, t === 0 ? burn : char); } const hh = hash(Math.round(a * 50), rr * 7 | 0); if (hh < 0.1) dot(cx + Math.cos(a) * rr * ISO_R, cy + Math.sin(a) * rr * ISO_RY, hh < 0.03 ? '#b0582a' : ember); } };
    ring(R, 0.28, 3); ring(R * 0.72, 0.4, 2);
    const glyph = (a0) => { const n = 5; for (let i = 0; i < n; i++) { const a = a0 + i * 0.04, r1 = R * (0.74 + i * 0.05); dot(cx + Math.cos(a) * r1 * ISO_R, cy + Math.sin(a) * r1 * ISO_RY, char); } };
    for (let i = 0; i < 8; i++) glyph(i * Math.PI / 4 + 0.2);
    if (kind === 'sleep') { for (let a = 0.3; a < Math.PI - 0.3; a += 0.05) { dot(cx + Math.cos(a) * R * 0.4 * ISO_R, cy - 1 + Math.sin(a) * R * 0.18 * ISO_R, char); dot(cx + Math.cos(a) * R * 0.4 * ISO_R, cy - 1 - Math.sin(a) * R * 0.08 * ISO_R, burn); } dot(cx, cy, ember); }
    else if (kind === 'kami') { for (let t = -1; t <= 1; t += 0.08) { dot(cx + t * R * 0.45 * ISO_R, cy - R * 0.14 * ISO_R, char); dot(cx + t * R * 0.36 * ISO_R, cy - R * 0.06 * ISO_R, burn); } for (const s of [-0.3, 0.3]) for (let t = -0.1; t < 0.28; t += 0.05) dot(cx + s * R * ISO_R * 0.8, cy + t * R * ISO_R, char); }
    else if (kind === 'dying') { for (let i = 0; i < 3; i++) for (let a = 0; a < Math.PI * 2; a += 0.12) if (hash(i, a * 10 | 0) < 0.6) dot(cx + Math.cos(a) * R * (0.2 + i * 0.12) * ISO_R, cy + Math.sin(a) * R * (0.2 + i * 0.12) * ISO_RY, i === 1 ? ash : char); }
    else { for (let a = 0; a < Math.PI * 2; a += 0.06) dot(cx + Math.cos(a * 3) * Math.cos(a) * R * 0.45 * ISO_R, cy + Math.cos(a * 3) * Math.sin(a) * R * 0.45 * ISO_RY, char); }
    return (SIG[key] = c);
  };
  const drawSigil = (kind, wx, wy, R, a) => { const c = sigil(kind, Math.round(R * 2) / 2), q = iso(wx, wy); { const pu = 0.5 + 0.5 * Math.sin(G.time * 2.3 + wx * 3); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.max(0, Math.min(1, a * (0.5 + 0.6 * pu))); ctx.drawImage(c, Math.round(q.sx - c.width / 2), Math.round(q.sy - c.height / 2)); ctx.globalCompositeOperation = 'source-over'; } ctx.globalAlpha = Math.max(0, Math.min(1, a * 1.5)); ctx.drawImage(c, Math.round(q.sx - c.width / 2), Math.round(q.sy - c.height / 2)); ctx.globalAlpha = 1; };
  // ---- small painted props at the world grain (Pix32 with the hero ramps)
  pmat('kfPaper', ['#2a2622', '#5a534a', '#8c8474', '#b8ae98', '#d8cfb6']); pmat('kfBamboo', ['#141208', '#2c2a14', '#48441f', '#66602e', '#8a8246']);
  pmat('kfBronze', ['#120b06', '#2e1e0e', '#523818', '#7e5a28', '#b08846']); pmat('kfIron', ['#08080c', '#1a1b24', '#30323e', '#4e515e', '#7c808a']);
  pmat('kfVerd', ['#08120e', '#14261e', '#22403a', '#345a4c', '#50786a']); pmat('kfLacq', ['#060408', '#140c10', '#241418', '#3c2226', '#5e3a34']);
  const PROP = {};
  const prop = (kind, f) => {
    const key = kind + f; if (PROP[key]) return PROP[key];
    const W2 = 16, H2 = 22, A = Pix32(W2, H2, [14, 8, 14]), ox = 8, oy = 20;
    if (kind === 'fuda') {                   // an ofuda on a split bamboo stake, its tail of paper lifting in the breath
      A.limb([[ox, oy], [ox, oy - 15]], 0.8, 0.7, 'kfBamboo', {});
      const id = A.poly([[ox - 3, oy - 16], [ox + 3, oy - 16], [ox + 3, oy - 6], [ox - 3, oy - 6]], 'kfPaper', { band: 1 });
      A.fx(id, (x, y) => ((x === ox || x === ox - 1) && y > oy - 15 && y < oy - 7 && (y % 2 === 0 || y === oy - 10)) ? '#6a2014' : null);
      A.poly([[ox + 3, oy - 15], [ox + 5 + f, oy - 13], [ox + 5 + f, oy - 11], [ox + 3, oy - 12]], 'kfPaper', { tone: -1 });
      A.px(ox, oy - 16, '#8a3a22');
    } else if (kind === 'censer') {          // a cracked bronze censer on three feet, its lid pierced
      A.limb([[ox - 3, oy], [ox - 2, oy - 3]], 0.7, 0.7, 'kfBronze', {}); A.limb([[ox + 3, oy], [ox + 2, oy - 3]], 0.7, 0.7, 'kfBronze', {});
      const b = A.ell(ox, oy - 5.5, 4.5, 3.6, 'kfBronze', { band: 2, spec: 0.1 });
      A.fx(b, (x, y) => (hash(x, y) < 0.14 ? '#2c4a3c' : (x === ox + 1 && y > oy - 8 && y < oy - 3) ? '#0a0806' : null));
      A.ell(ox, oy - 9, 3.4, 1.4, 'kfBronze', { band: 1, spec: 0.3 }); A.ell(ox, oy - 10.5, 1.2, 1.2, 'kfBronze', {});
      A.px(ox - 1, oy - 9, '#0a0806'); A.px(ox + 1, oy - 9, '#0a0806');
    } else if (kind === 'urn') {             // a lidded urn stoppered with one of her held breaths, sealed with paper
      const b = A.ell(ox, oy - 4.5, 4, 4.5, 'kfBronze', { band: 2, spec: 0.12 });
      A.fx(b, (x, y) => (hash(x * 3, y) < 0.12 ? '#2c4a3c' : null));
      A.ell(ox, oy - 9, 2.4, 1.2, 'kfBronze', { tone: -1 }); A.ell(ox, oy - 10, 3, 1.1, 'kfBronze', { spec: 0.3 }); A.px(ox, oy - 11.5, '#b08846');
      A.poly([[ox - 1, oy - 10], [ox + 1, oy - 10], [ox + 1, oy - 2], [ox - 1, oy - 2]], 'kfPaper', { band: 1 }); A.px(ox, oy - 6, '#6a2014');
    } else if (kind === 'bell') {            // the lure: a talisman staked with a small bronze bell under it
      A.limb([[ox, oy], [ox, oy - 16]], 0.8, 0.7, 'kfBamboo', {});
      A.poly([[ox - 3, oy - 17], [ox + 3, oy - 17], [ox + 3, oy - 9], [ox - 3, oy - 9]], 'kfPaper', { band: 1 });
      A.px(ox, oy - 15, '#6a2014'); A.px(ox, oy - 13, '#6a2014'); A.px(ox - 1, oy - 12, '#6a2014');
      A.line(ox + 3, oy - 9, ox + 4 + f, oy - 6, '#6a2414');
      A.ell(ox + 4 + f, oy - 4.5, 2, 2, 'kfBronze', { spec: 0.4 }); A.px(ox + 4 + f, oy - 2.5, '#0a0806');
    } else if (kind === 'fan') {             // the thrown tessen, open, seen turning (f: 0..7)
      const a0 = f / 8 * Math.PI * 2, pts = [[ox, oy - 8]];
      for (let i = 0; i <= 8; i++) { const a = a0 - 0.9 + i * 0.225; pts.push([ox + Math.cos(a) * 7, oy - 8 + Math.sin(a) * 4]); }
      const id = A.poly(pts, 'kfIron', { band: 1, spec: 0.3 });
      A.fx(id, (x, y) => { const a = Math.atan2((y + 0.5 - (oy - 8)) / 4, (x + 0.5 - ox) / 7) - a0 + 0.9, r = (a / 0.225) % 1; return r < 0.2 ? 0 : null; });
    }
    const cv = A.render(), cx2 = cv.getContext('2d'), im = cx2.getImageData(0, 0, W2, H2), D = im.data, S0 = new Uint8ClampedArray(D);
    // a lit rim along the upper-left edge of the silhouette, so a small prop reads on dark stone
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) { const q = (y * W2 + x) * 4; if (!S0[q + 3]) continue; const up = y > 0 ? S0[q - W2 * 4 + 3] : 0, lf = x > 0 ? S0[q - 4 + 3] : 0; if (!up || !lf) { D[q] = Math.min(255, D[q] * 0.4 + 120); D[q + 1] = Math.min(255, D[q + 1] * 0.4 + 100); D[q + 2] = Math.min(255, D[q + 2] * 0.4 + 78); } }
    cx2.putImageData(im, 0, 0);
    return (PROP[key] = cv);
  };
  const drawProp = (kind, f, wx, wy, a, lift) => { const c = prop(kind, f), q = iso(wx, wy); if (!lift) { ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 6, 9, '120,70,40', 0.16); ctx.globalCompositeOperation = 'source-over'; } ctx.globalAlpha = a == null ? 1 : a; ctx.drawImage(c, Math.round(q.sx - 8), Math.round(q.sy - 20 - (lift || 0))); ctx.globalAlpha = 1; };
  // ---- pixel strokes (smears, rakes, streams): a line of world pixels, dark underside, lit top
  const px1 = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
  const stroke = (pts, col, dark) => { for (let i = 0; i < pts.length - 1; i++) { const [a0, b0] = pts[i], [a1, b1] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(a1 - a0, b1 - b0))); for (let s = 0; s < n; s++) { const x = a0 + (a1 - a0) * s / n, y = b0 + (b1 - b0) * s / n; if (dark) px1(x, y + 1, dark); px1(x, y, col); } } };

  // ======== the fx list: timed effects of her own
  G.kpfx = [];
  const addFx = o => { if (G.kpfx.length > 160) G.kpfx.shift(); o.t0 = o.t; G.kpfx.push(o); return o; };
  let lastT = null;
  const stepFx = () => {
    const dt = lastT == null ? 0 : Math.max(0, Math.min(0.1, G.time - lastT)); lastT = G.time;
    for (const f of G.kpfx) {
      f.t -= dt;
      if (f.k === 'plume') {   // the last breath drifts to her: rises first, then is drawn across
        const u = 1 - f.t / f.t0, tx = P.x, ty = P.y;
        if (u > 0.3) { const k = Math.min(1, dt * (2 + u * 7)); f.x += (tx - f.x) * k; f.y += (ty - f.y) * k; }
        f.z = u < 0.3 ? 4 + u * 40 : 16 + Math.sin(u * 5) * 2;
        f.trail.unshift([f.x, f.y, f.z]); if (f.trail.length > 9) f.trail.pop();
        if (Math.hypot(f.x - tx, f.y - ty) < 0.35 && u > 0.35) { f.t = Math.min(f.t, 0.001); addFx({ k: 'drink', t: 0.3, x: P.x, y: P.y }); }
      }
      if (f.k === 'hit') for (const p of f.ps) { p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 30 * dt; }
    }
    G.kpfx = G.kpfx.filter(f => f.t > 0);
    // her murk takes the place of the old bright lavender wherever the shared particles still carry it
    if (isMias()) {
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        if (p.col && KP_REMAP[p.col]) p.col = KP_REMAP[p.col];
        // her glowing motes and sparks become matter: murky specks that do not shine
        if (p.g && KP_GLOW[p.g]) { p.col = KP_GLOW[p.g]; p.g = null; if (p.vz > 0) p.vz *= 0.5; }
        // the motes drawn to her (Inhale, clouds breathed in) fly as smoke, not as white light
        if (p.fly && (p.col === '#4a3052' || p.col === '#b070e0')) { parts.splice(i, 1); addFx({ k: 'fly', t: 0.35, x0: p.x0, y0: p.y0, z0: p.z0, to: p.to }); }
      }
    }
    for (const s of G.arcShots) if (s.knife && s.col === '#d0a0f0') s.col = '#6e5068';
  };
  const KP_GLOW = { '190,130,255': '#4e3456', '176,112,224': '#4e3456', '208,160,240': '#6a4a6c', '220,200,255': '#5e4e60', '232,226,208': '#8a8076', '255,255,255': '#a09688', '224,184,255': '#6a4a6c', '138,74,184': '#3e2848' };
  const KP_REMAP = { '#b070e0': '#4a3052', '#d0a0f0': '#6a5064', '#e0b8ff': '#76686c', '#8a4ab8': '#3e2848', '#9aff6a': '#5e6a3a' };
  const flavOf = id => FLAV[id] || 'mias';

  // ---- casting: the gather and the fan's snap
  const _mc = miasCast;
  miasCast = function (id, pt) {
    const c0 = P.cast, s0 = P.swing, sis = G.sisterCast, a = pt || (typeof aimPoint === 'function' ? aimPoint() : { x: P.x + 1, y: P.y });
    _mc(id, pt);
    if (sis || !(P.cast > c0 + 1e-6 || P.swing > s0 + 1e-6 || G.mdash)) return;
    const ang = Math.atan2(a.y - P.y, a.x - P.x), fl = flavOf(id);
    addFx({ k: 'gather', t: 0.14, fl });
    addFx({ k: 'snap', t: 0.2, ang, fl, id, x: P.x, y: P.y });
    if (id === 'contagion') { const m = nearMon(a, 2.5); if (m) addFx({ k: 'mark', t: 10, m }); }
    if (id === 'exhale') addFx({ k: 'exhale', t: 0.7, x: P.x, y: P.y });
    if (id === 'inhale') addFx({ k: 'inhale', t: 0.5, x: P.x, y: P.y });
  };
  if (window.__spm) window.__spm.miasCast = (...a) => miasCast(...a);
  // ---- hit reaction: the struck coughs up a spray of the murk, flung away from her
  const MCOL = { '#b070e0': 1, '#d0a0f0': 1, '#e0b8ff': 1, '#8a4ab8': 1 };
  const _vh = vfxHit;
  vfxHit = function (m, col, d) {
    _vh(m, col, d);
    if (!isMias() || !m || !G.kpfx) return;
    const ours = MCOL[col] || (P.swing > 0 || P.cast > 0);
    if (!ours) return;
    const a = Math.atan2(m.y - P.y, m.x - P.x), ps = [];
    for (let i = 0; i < 4; i++) { const b = a + (Math.random() - 0.5) * 1.4, s = 1.2 + Math.random() * 1.8; ps.push({ x: m.x, y: m.y, z: 10 + Math.random() * 6, vx: Math.cos(b) * s, vy: Math.sin(b) * s, vz: 8 + Math.random() * 10, r: 2 + (i % 2) }); }
    addFx({ k: 'hit', t: 0.4, ps, fl: m.poison ? 'mias' : 'dying' });
  };
  // ---- the death signature: the last breath leaves the body and goes to her
  const _df = deathFx;
  deathFx = function (m) { _df(m); if (isMias() && G.kpfx && m) addFx({ k: 'plume', t: 1.6, x: m.x, y: m.y, z: 4, trail: [] }); };

  // ======== drawing
  const _mr = miasRender;
  miasRender = function (list) {
    if (!isMias() && !(G.clouds && G.clouds.length)) return _mr(list);
    stepFx();
    const keep = { decoys: G.decoys, clouds: G.clouds, mirages: G.mirages, lures: G.lures, mtraps: G.mtraps, mthrows: G.mthrows, shuris: G.shuris, rtides: G.rtides, rscythes: G.rscythes, clawfx: G.clawfx, mnovas: G.mnovas };
    const stormT = P.mstormT, reap = G.reapFx;
    for (const k in keep) G[k] = [];
    // the base still draws the Mirror-Sister, decoys and the confused and feared; its flat aura disc and contagion
    // ring are ours now, so it is shown a dead keeper and unmarked enemies while it runs
    P.mstormT = 0; G.reapFx = null; const dead0 = P.dead, marked = G.zone.monsters.filter(m => m.contagion > 0).map(m => [m, m.contagion]);
    if (isMias()) P.dead = true; for (const [m] of marked) m.contagion = 0;
    try { _mr(list); } finally { for (const k in keep) G[k] = keep[k]; P.mstormT = stormT; G.reapFx = reap; P.dead = dead0; for (const [m, c] of marked) m.contagion = c; }
    const ti = G.time;
    // -- the cloud she wears: low bruise-purple smoke about her feet, thicker as her Miasma fills
    if (isMias() && !P.dead) {
      const R = MS.auraR(), k = MS.frac();
      list.push({ d: P.x + P.y - 0.9, f: () => {
        const n = 7 + Math.round(R * 4);
        for (let L = 0; L < 2; L++) for (let i = 0; i < n; i++) {
          const a = i / n * Math.PI * 2 + ti * (L ? -0.1 : 0.16) + Math.sin(ti * 0.3 + i) * 0.3, rr = R * (0.4 + 0.55 * vn(i * 3 + L * 9, ti * 0.4, 1)), q = iso(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr);
          drawPuff('mias~', q.sx, q.sy - 1 - L * 3 - (i % 3), 2.5 + (i % 3) * 0.8 + k * 1.5 + L, (0.12 + 0.16 * k) * (0.6 + 0.4 * Math.sin(ti * 0.9 + i + L)), i + L * 2);
        }
      } });
    }
    // -- decoys: a shed husk of her, grey paper-thin, torn in slices that slide
    for (const e of keep.decoys) list.push({ d: e.x + e.y, f: () => {
      const q = iso(e.x, e.y), fr = heroFrame('miasmancer', 'idle', Math.floor(ti * 2) % 4, 'front'), face = e.face || 1, g2 = fr._ghost || (fr._ghost = fr.tint(fr.c, '#3e3446')), gf = fr._ghostf || (fr._ghostf = fr.tint(fr.f, '#3e3446'));
      const img = face < 0 ? gf : g2, rx = Math.round(q.sx) - (face < 0 ? fr.w - fr.ox : fr.ox), ry = Math.round(q.sy) + 3 - (fr.oy + 1);
      for (let y = 0; y < fr.h; y += 4) { const off = Math.round(Math.sin(ti * 7 + y * 0.7) * (y % 8 ? 1 : -1)); ctx.globalAlpha = 0.55; ctx.drawImage(img, 0, y, fr.w, 4, rx + off, ry + y, fr.w, 4); }
      ctx.globalAlpha = 0.3; ctx.drawImage(face < 0 ? fr.f : fr.c, rx, ry); ctx.globalAlpha = 1;
      drawPuff('mias', q.sx, q.sy - 4, 3, 0.35, 2);
    } });
    // -- clouds: poison in bruise, haze as the long sleep's low fog with a burned eyelid under it
    for (const c of keep.clouds) {
      if (!onScreen(c.x, c.y)) continue;
      const fade = Math.min(1, c.t / 0.8), pal = c.kind === 'haze' ? 'sleep' : c.kind === 'frost' ? 'sleep' : 'mias';
      if (c.kind === 'haze') list.push({ d: -9e3, f: () => drawSigil('sleep', c.x, c.y, c.R * 0.8, 0.5 * fade) });
      list.push({ d: c.x + c.y - 0.4, f: () => {
        const n = c.trail ? 2 : 3 + Math.round(c.R * 2);
        for (let i = 0; i < n; i++) {
          const a = c.seed + i * 2.4 + ti * (pal === 'sleep' ? 0.12 : 0.3), rr = c.R * (0.25 + 0.55 * ((i * 0.37) % 1)), q = iso(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * 0.8);
          const lift = pal === 'sleep' ? 1 + (i % 2) : 3 + (i % 4) + Math.sin(ti * 1.3 + i) * 1.5;
          drawPuff(pal, q.sx, q.sy - lift, (pal === 'sleep' ? 5 : 3.5) + (i % 3) + c.R, (pal === 'sleep' ? 0.42 : 0.36) * fade, i + (c.seed | 0));
        }
        if (pal === 'sleep') for (let i = 0; i < 4; i++) { const q = iso(c.x + Math.cos(c.seed + i * 1.7) * c.R * 0.6, c.y + Math.sin(c.seed + i * 1.7) * c.R * 0.5); px1(q.sx + Math.sin(ti + i) * 2, q.sy - 6 - ((ti * 3 + i * 5) % 10), '#0c0a14'); }
      } });
    }
    // -- Mirage (the kami): a shimenawa rope laid in a ring with paper shide, ash-gold dust turning over it
    for (const f of keep.mirages) list.push({ d: -9e3 + 1, f: () => {
      const q = iso(f.x, f.y), fade = Math.min(1, f.t / 0.6, (f.max - f.t) / 0.3 + 0.2);
      drawSigil('kami', f.x, f.y, f.R, 0.55 * fade);
      for (let a = 0; a < Math.PI * 2; a += 0.09) { const x = q.sx + Math.cos(a) * f.R * 0.92 * ISO_R, y = q.sy + Math.sin(a) * f.R * 0.92 * ISO_RY; const tw2 = ((a * 12) | 0) % 2; ctx.globalAlpha = fade; px1(x, y - 1, tw2 ? '#86704a' : '#a8905e'); px1(x, y, tw2 ? '#5e4c2a' : '#6e5a36'); px1(x, y + 1, '#1c140c'); ctx.globalAlpha = 1; }
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3, x = q.sx + Math.cos(a) * f.R * 0.92 * ISO_R, y = q.sy + Math.sin(a) * f.R * 0.92 * ISO_RY; ctx.globalAlpha = fade; for (let j = 0; j < 4; j++) { px1(x + (j % 2), y + 1 + j, '#c8bea4'); px1(x + (j % 2) + 1, y + 1 + j, '#8c8474'); } ctx.globalAlpha = 1; }
      for (let i = 0; i < 10; i++) { const a = ti * 0.5 + i * 0.63, rr = f.R * (0.3 + 0.6 * ((i * 0.41) % 1)), x = q.sx + Math.cos(a) * rr * ISO_R, y = q.sy + Math.sin(a) * rr * ISO_RY - 4 - ((ti * 4 + i * 3) % 12); ctx.globalAlpha = 0.6 * fade; px1(x, y, i % 3 ? '#94805a' : '#c0ac80'); ctx.globalAlpha = 1; }
    } });
    // -- Lure (the kami): a staked talisman with a bronze bell, a burned sigil pulsing out from it
    for (const l of keep.lures) {
      list.push({ d: -9e3 + 2, f: () => { const k = (ti * 1.2) % 1; drawSigil('kami', l.x, l.y, 0.8 + k * 1.6, 0.6 * (1 - k)); } });
      list.push({ d: l.x + l.y, f: () => { drawProp('bell', Math.floor(ti * 6) % 2, l.x, l.y); for (let i = 0; i < 3; i++) { const q = iso(l.x, l.y); ctx.globalAlpha = 0.5; px1(q.sx + Math.sin(ti * 2 + i * 2) * 4, q.sy - 18 - ((ti * 6 + i * 4) % 10), '#94805a'); ctx.globalAlpha = 1; } } });
    }
    // -- traps: talismans and urns
    for (const t of keep.mtraps) list.push({ d: t.x + t.y - 0.3, f: () => {
      const q = iso(t.x, t.y), armed = t.arm <= 0, kind = t.kind;
      ctx.fillStyle = 'rgba(8,4,10,0.45)'; ctx.fillRect(Math.round(q.sx) - 4, Math.round(q.sy) - 1, 9, 2);
      if (kind === 'ntrap' || kind === 'dsentry') { drawProp('fuda', Math.floor(ti * 5) % 2, t.x, t.y, armed ? 1 : 0.65); if (armed) drawSigil('kami', t.x, t.y, 0.7, 0.35); }
      else if (kind === 'mwake') { drawProp('censer', 0, t.x, t.y); for (let i = 0; i < 3; i++) { const u = ((ti * 0.7 + i / 3) % 1); drawPuff('drown', q.sx + Math.sin(ti + i * 2) * 2 * u, q.sy - 12 - u * 14, 2 + u * 3, 0.5 * (1 - u), i); } }
      else { drawProp('urn', 0, t.x, t.y, armed ? 1 : 0.7); if (armed && Math.floor(ti * 2) % 2 === 0) px1(q.sx, q.sy - 7, '#8a3018'); const u = (ti * 0.5) % 1; drawPuff('mias', q.sx + 1, q.sy - 12 - u * 6, 2, 0.35 * (1 - u), 1); }
    } });
    for (const th of keep.mthrows) list.push({ d: 1e4, f: () => { const k = Math.min(1, th.t / th.dur), x = th.x0 + (th.x1 - th.x0) * k, y = th.y0 + (th.y1 - th.y0) * k, z = Math.sin(k * Math.PI) * 18 + 6, kind = th.kind === 'mwake' ? 'censer' : th.kind === 'bmine' ? 'urn' : 'fuda'; drawProp(kind, 0, x, y, 1, z - 6); } });
    // -- shuriken: a turning iron leaf of the fan, trailing bruise smoke
    for (const sh of keep.shuris) list.push({ d: sh.x + sh.y + 0.1, f: () => { const q = iso(sh.x, sh.y); drawPuff('mias', q.sx - 2, q.sy - 6, 2.5, 0.35, 2); drawProp('fan', Math.floor(sh.spin * 1.3) % 8, sh.x, sh.y, 1, 4); } });
    // -- Miasma Nova (drowning): a black-water wave rolling out, foam on its crest, drips falling behind it
    for (const n of keep.mnovas) list.push({ d: -9e3 + 3, f: () => {
      const q = iso(n.x, n.y), k = n.r / n.max, a = 1 - k * 0.55, N = Math.round(10 + n.r * 5);
      for (let i = 0; i < N; i++) { const t2 = i / N * Math.PI * 2, x = q.sx + Math.cos(t2) * n.r * ISO_R, y = q.sy + Math.sin(t2) * n.r * ISO_RY; drawPuff('drown', x, y - 3 - (i % 2), 3 + (i % 3), 0.55 * a, i); if (i % 3 === 0) { ctx.globalAlpha = a; px1(x - 1, y - 6, '#8a9888'); px1(x, y - 6, '#5e7064'); ctx.globalAlpha = 1; } }
      for (let i = 0; i < N / 2; i++) { const t2 = i / (N / 2) * Math.PI * 2 + 0.2, r2 = n.r * 0.8, x = q.sx + Math.cos(t2) * r2 * ISO_R, y = q.sy + Math.sin(t2) * r2 * ISO_RY; ctx.globalAlpha = a * 0.8; px1(x, y - 2 + (i % 3), '#1e3a3c'); ctx.globalAlpha = 1; }
    } });
    // -- Miasma Tide (drowning): a wall of murk-water rolling along its line, a curled crest of foam
    for (const w of keep.rtides) list.push({ d: (w.x || P.x) + (w.y || P.y) + 0.1, f: () => {
      if (w.spin) { for (let i = 0; i <= 10; i++) { const a = w.ang - i * 0.25, p = iso(P.x + Math.cos(a) * w.w, P.y + Math.sin(a) * w.w); drawPuff('drown', p.sx, p.sy - 5, 3 + (i % 2), 0.6 * (1 - i / 12), i); } return; }
      const px = -w.dy, py = w.dx, n = 8;
      for (let i = 0; i < n; i++) { const o = (i / (n - 1) - 0.5) * w.w, q = iso(w.x + px * o, w.y + py * o), h = 7 + Math.sin(G.time * 12 + i) * 2; drawPuff('drown', q.sx, q.sy - 3, 4, 0.7, i); drawPuff('drown', q.sx + 1, q.sy - h, 3, 0.6, i + 2); ctx.globalAlpha = 0.9; px1(q.sx - 1, q.sy - h - 3, '#8a9888'); px1(q.sx, q.sy - h - 3, '#aab4a6'); px1(q.sx + 1, q.sy - h - 2, '#5e7064'); ctx.globalAlpha = 1; if (i % 2) px1(q.sx, q.sy + 1 + ((G.time * 20 + i) % 3), '#183032'); }
    } });
    // -- Miasma Hurricane: bands of bruise smoke wheeling about her, torn paper caught in them
    if (stormT > 0 && isMias()) list.push({ d: P.x + P.y + 0.3, f: () => {
      const R = MS.stormR(), fade = Math.min(1, stormT);
      for (let b = 0; b < 3; b++) { const rr = R * (0.45 + 0.27 * b); for (let i = 0; i < 9; i++) { const a = ti * (4 - b) + b * 2 + i * 0.32, p = iso(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr); drawPuff('mias', p.sx, p.sy - 5 - b * 5 - i * 0.4, 2.5 + (i % 2) + b * 0.5, (0.55 - b * 0.1) * fade * (1 - i / 10), i + b); } }
      for (let i = 0; i < 5; i++) { const a = ti * 5 + i * 1.3, p = iso(P.x + Math.cos(a) * R * 0.8, P.y + Math.sin(a) * R * 0.8); px1(p.sx, p.sy - 10 - i * 3, '#b8ae98'); px1(p.sx + 1, p.sy - 10 - i * 3, '#6a6254'); }
    } });
    // -- claw rakes: three curved cuts, dark lacquer-red at the root, pale where they tear
    for (const c of keep.clawfx) list.push({ d: c.x + c.y + 0.2, f: () => {
      const q = iso(c.x, c.y), k = Math.max(0, c.t / 0.2), dx = Math.cos(c.a + 1.2), dy = Math.sin(c.a + 1.2) * 0.6;
      ctx.globalAlpha = k;
      for (let i = -1; i <= 1; i++) { const pts = []; for (let s = -6; s <= 6; s++) pts.push([q.sx + dx * s + i * 2 + (s * s) * 0.03 * i, q.sy - 10 + dy * s + i + s * s * 0.04]); stroke(pts.slice(0, 5), '#5e1414', null); stroke(pts.slice(4), '#b8a898', '#3a0c10'); }
      ctx.globalAlpha = 1;
    } });
    // -- the thrown fan, and Reap's wide sweep
    for (const s of keep.rscythes) list.push({ d: s.x + s.y + 0.1, f: () => { const q = iso(s.x, s.y); drawProp('fan', Math.floor(s.spin * 1.3) % 8 + 8 * 0, s.x, s.y, 1, 6); drawPuff('mias', q.sx - 3, q.sy - 8, 2, 0.3, 3); } });
    if (reap && reap.t > 0) { reap.t -= 0.016; const R = reap.R, k = 1 - reap.t / 0.3; G.reapFx = reap; list.push({ d: P.x + P.y + 0.2, f: () => {
      const pts = []; for (let i = 0; i <= 18; i++) { const a = k * 6.28 - i * 0.28, p = iso(P.x + Math.cos(a) * R, P.y + Math.sin(a) * R); pts.push([p.sx, p.sy - 7]); }
      ctx.globalAlpha = 1 - k; stroke(pts.slice(0, 8), '#d8ccb8', '#2a1a24'); stroke(pts.slice(7), '#6e6470', null); ctx.globalAlpha = 1;
      for (let i = 0; i < 6; i++) { const [x, y] = pts[i * 3]; drawPuff('mias', x, y, 2.5, 0.4 * (1 - k), i); }
    } }); }
    // -- the marked (the dying): a ring burned under the victim and a sick seep off it
    for (const f of G.kpfx) if (f.k === 'mark' && f.m && !f.m.dead && f.m.contagion > 0) { const m = f.m; list.push({ d: -9e3 + 4, f: () => drawSigil('dying', m.x, m.y, 0.9, 0.7) }); list.push({ d: m.x + m.y + 0.06, f: () => { const q = iso(m.x, m.y), u = (ti * 0.8) % 1; drawPuff('dying', q.sx + Math.sin(ti * 2) * 2, q.sy - 14 - u * 10, 2 + u * 2, 0.45 * (1 - u), 2); } }); }
    // -- her own timed effects
    for (const f of G.kpfx) {
      const u = 1 - f.t / f.t0;
      if (f.k === 'gather') list.push({ d: P.x + P.y + 0.5, f: () => { const q = iso(P.x, P.y); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + ti, r = 9 * (1 - u); px1(q.sx + Math.cos(a) * r, q.sy - 33 + Math.sin(a) * r * 0.5, PAL[f.fl][3 + (i % 2)]); } } });
      else if (f.k === 'snap') list.push({ d: f.x + f.y + 0.4, f: () => {
        // the fan snaps open: an arc of pale iron swept through the cast direction, the breath bursting off its edge
        const q = iso(f.x, f.y), pts = [], R2 = 1.1, a0 = f.ang - 0.9, a1 = f.ang + 0.9, e = Math.min(1, u * 2.5);
        for (let i = 0; i <= 10; i++) { const a = a0 + (a1 - a0) * i / 10 * e, p = iso(f.x + Math.cos(a) * R2, f.y + Math.sin(a) * R2); pts.push([p.sx, p.sy - 16]); }
        ctx.globalAlpha = 1 - u * 0.8; stroke(pts, '#cfc4b4', '#20161e'); ctx.globalAlpha = 1;
        const end = pts[pts.length - 1];
        for (let i = 0; i < 4; i++) { const b = f.ang + (i - 1.5) * 0.35, d = 6 + u * 16; drawPuff(f.fl, end[0] + Math.cos(b) * d * ISO_R / 18, end[1] + Math.sin(b) * d * 0.4, 2.5 + u * 3, 0.65 * (1 - u), i); }
      } });
      else if (f.k === 'hit') list.push({ d: f.ps[0].x + f.ps[0].y + 0.3, f: () => { for (const p of f.ps) { const q = iso(p.x, p.y); drawPuff(f.fl, q.sx, q.sy - p.z, p.r * (0.6 + u), 0.75 * (1 - u), p.r); } } });
      else if (f.k === 'plume') list.push({ d: f.x + f.y + 0.5, f: () => {
        f.trail.forEach(([x, y, z], i) => { const q = iso(x, y); drawPuff(i < 2 ? 'dying' : 'mias', q.sx, q.sy - z, 3.5 - i * 0.3, (0.8 - i * 0.08) * Math.min(1, f.t * 3), i); });
        const q = iso(f.x, f.y); ctx.globalAlpha = Math.min(1, f.t * 3); px1(q.sx, q.sy - f.z - 3, '#8c7c4a'); ctx.globalAlpha = 1;
      } });
      else if (f.k === 'fly') list.push({ d: 1e4, f: () => { const k = u, to = f.to || P, x = f.x0 + (to.x - f.x0) * k, y = f.y0 + (to.y - f.y0) * k, z = f.z0 + (20 - f.z0) * k + Math.sin(k * Math.PI) * 6, q = iso(x, y); drawPuff('dying', q.sx, q.sy - z, 2 - k, 0.8, 3); px1(q.sx, q.sy - z, '#2a1e12'); } });
      else if (f.k === 'drink') list.push({ d: P.x + P.y + 0.5, f: () => { const q = iso(P.x, P.y); for (let i = 0; i < 5; i++) { const a = i * 1.26 + ti * 6, r = 5 * (1 - u); drawPuff('mias', q.sx + Math.cos(a) * r, q.sy - 32 + Math.sin(a) * r * 0.5, 1.5 + (1 - u), 0.7 * (1 - u), i); } } });
      else if (f.k === 'exhale') list.push({ d: -9e3 + 5, f: () => {
        // the whole held breath let out at once: a ring of sick ash-breath rolling over the ground, the burned ring under it
        const R = 3.5 * Math.min(1, u * 1.8), q = iso(f.x, f.y), N = 22;
        drawSigil('dying', f.x, f.y, 1.4, 0.6 * (1 - u));
        for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2, x = q.sx + Math.cos(a) * R * ISO_R, y = q.sy + Math.sin(a) * R * ISO_RY; drawPuff(i % 3 ? 'dying' : 'mias', x, y - 4 - (i % 3), 4 + (i % 2), 0.7 * (1 - u * 0.9), i); }
      } });
      else if (f.k === 'inhale') list.push({ d: P.x + P.y + 0.45, f: () => {
        const q = iso(f.x, f.y), R = 6 * (1 - u);
        for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + u * 2, x = q.sx + Math.cos(a) * R * ISO_R, y = q.sy + Math.sin(a) * R * ISO_RY; drawPuff('dying', x, y - 6 - u * 20, 2 + (i % 2), 0.55 * (1 - u * 0.5), i); }
      } });
    }
  };

  // her numbers and words in the murk's colour, not the old lavender
  const _ft = floatText;
  floatText = function (x, y, t, col) { if (isMias() && (col === '#b070e0' || col === '#d0a0f0')) col = '#a08a98'; return _ft(x, y, t, col); };
  // Rending Arc / Black-Rag Flurry and Impaling Thrust: the fan's iron edge and the claws' lacquer, not white light
  const _r14 = render14;
  render14 = function (list) {
    if (!isMias()) return _r14(list);
    const A = G.arcFx14, T = G.thrustFx; G.arcFx14 = []; G.thrustFx = [];
    try { _r14(list); } finally { G.arcFx14 = A; G.thrustFx = T; }
    for (const f of A) list.push({ d: f.x + f.y + 0.3, f: () => {
      const k = Math.min(1, f.t / f.dur), fade = 1 - Math.max(0, (f.t - f.dur) / 0.12), a0 = Math.atan2(f.dy, f.dx), span = f.narrow ? 0.5 : 1.45, pts = [], inner = [];
      for (let i = 0; i <= 16; i++) { const a = a0 + f.dir * (-span + 2 * span * k * i / 16), p = iso(f.x + Math.cos(a) * f.R, f.y + Math.sin(a) * f.R), p2 = iso(f.x + Math.cos(a) * f.R * 0.7, f.y + Math.sin(a) * f.R * 0.7); pts.push([p.sx, p.sy - 8]); inner.push([p2.sx, p2.sy - 8]); }
      ctx.globalAlpha = fade * 0.35; for (let i = 0; i < pts.length; i++) stroke([inner[i], pts[i]], '#8a8088', null);
      ctx.globalAlpha = fade; stroke(pts.slice(-6), '#d8ccb8', '#1a1016'); stroke(pts.slice(0, 11), '#6e6470', null); ctx.globalAlpha = 1;
      const e = pts[pts.length - 1]; drawPuff('mias', e[0], e[1], 2.5, 0.5 * fade, 1);
    } });
    for (const f of T) list.push({ d: f.x + f.y + 0.3, f: () => {
      const k = f.t / 0.22, pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12, p = iso(f.x + f.dx * f.L * u, f.y + f.dy * f.L * u); pts.push([p.sx, p.sy - 8 + Math.sin(u * 9) * 0.4]); }
      ctx.globalAlpha = k; stroke(pts.slice(0, 6), '#5e1414', '#12060a'); stroke(pts.slice(5), '#c8b8a4', '#3a0c10'); ctx.globalAlpha = 1;
      for (let i = 2; i < 12; i += 3) drawPuff('mias', pts[i][0], pts[i][1] + 2, 2, 0.45 * k, i);
    } });
  };
}
}
