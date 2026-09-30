// =================================================================== v0.37 hero: the WEAVER OF MIRRORS (class id 'animancer')
// A servant of the Veiled Crone out of the iron Needle Spires. Spliced inside the main IIFE (build.sh / build_x.sh).
// v0.37: sculpted and lit. Every frame is laid down at 1.5x (each hero pixel is two screen pixels at the 640x360 view)
// by a small sculpt painter: shapes carry surface normals, a warm key and a cool rim light them, later forms cast
// shadow onto earlier ones, and the light is quantized into hue-shifted six-tone ramps with a coloured, broken outline.
// The world-scale canvas carries the painting as its `_hr` twin. Frame 72x60 world px (108x90 HD), feet at 30,55.
// The look: a tall, spare figure, about seven heads high, under a tall felt hat; a veil of charcoal gauze falls from
// the brim over the whole face. A heavy patched coat to the ankles hangs in folds from a sash; its hem is weighed down
// by a band of sewn trinkets (thimbles, keys, rings, tiny mirrors) and more run down its front edges and cuffs, so they
// catch the light only where the light falls. A short mantle of mirror scales over the shoulders. At the near hip an
// iron spool of pale-blue soul-wire running to the eye of the weapon, a heavy iron sewing needle; a satchel of
// mirrors on the far hip. No drum, no fur. The Weaver's skills are redrawn further down (the Weaver's effects).
const WV_FW = 72, WV_FH = 60, WV_OX = 30, WV_OY = 55, WV_S = 1.5;
const WV_PH = { idle: 4, walk: 8, atk: 4, cast: 4 };
const wvH = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const wvAdd = (p, dx, dy) => [p[0] + dx, p[1] + dy];
const wvLerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
// the horizontal extent of a polygon at height y (world units)
function wvSpan(pts, y) {
  let lo = 1e9, hi = -1e9;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y)) { const x = xi + (xj - xi) * (y - yi) / (yj - yi); lo = Math.min(lo, x); hi = Math.max(hi, x); }
  }
  return lo < hi ? [lo, hi] : null;
}
// a painter kit in world units with the origin at the feet (y up is negative); it paints on the 2x grid
// ------------------------------------------------------------------- the rig: every pose, every view
// Feet at the origin. Crown of the skull -38.5, chin -33, shoulders -30.5, sash -21, knees -10.5, hem -2.2.
// Views: 'front' / 'back' are 3/4 (facing right), 'side' the profile, 'down' / 'up' straight on.
function wvRig(pose, ph, view) {
  const walk = pose === 'walk', k = ph % 4, a = walk ? ph / 8 * Math.PI * 2 : 0, sw = walk ? Math.sin(a) : 0, cw = walk ? Math.cos(a) : 0;
  const side = view === 'side', back = view === 'back' || view === 'up', sym = view === 'down' || view === 'up';
  const J = { pose, ph, k, view, walk, sw, cw, a, side, back, sym };
  let bob = 0, br = 0, lean = 0;
  if (walk) { bob = Math.abs(sw) > 0.75 ? 0.5 : Math.abs(sw) < 0.3 ? -0.5 : 0; lean = 0.5; }
  if (pose === 'idle') br = [0, -0.5, -0.5, 0][k];
  if (pose === 'atk') { lean = [-1.5, 1.5, 2.5, 1][k]; bob = [0.5, 0.5, 1, 0.5][k]; }
  if (pose === 'cast') { lean = [0, -0.5, -1, -1][k]; br = [0, -0.5, -0.5, -0.5][k]; }
  if (side || view === 'up' || view === 'down') lean *= side ? 1 : 0.3;
  J.lean = lean; J.bob = bob;
  const sh = side ? [[0.9, -30.5], [-0.7, -30.6]] : sym ? [[4.1, -30.4], [-4.1, -30.4]] : [[4.0, -30.4], [-3.6, -30.5]];
  const U = (p, f) => [p[0] + lean * (f == null ? 1 : f), p[1] + bob + br * (f == null ? 1 : 0.6)];
  J.shN = U(sh[0]); J.shF = U(sh[1]);
  J.neck = U([side ? 0.5 : sym ? 0 : 0.3, -32]);
  J.head = U([side ? 1.1 : sym ? 0 : 0.6, -35.6]);
  J.chest = U([sym ? 0 : 0.3, -26.5], 0.8);
  J.waist = [lean * 0.45, -21 + bob];
  const rest = pose === 'idle' || pose === 'cast';
  J.rest = rest;
  J.hip = [lean * 0.3 + (rest && !sym ? 0.6 : 0), -18 + bob];
  if (rest && !sym) { J.shN[1] += 0.4; J.shF[1] -= 0.2; }
  // legs (only the boots show under the hem)
  const lift = Math.max(0, cw) * 1.4, liftF = Math.max(0, -cw) * 1.4;
  if (side && rest) { J.ankN = [0.4, 0]; J.ankF = [-2.0, -0.2]; }
  else if (!sym && rest) { J.ankN = [1.6, 0]; J.ankF = [-3.0, 0.6]; }
  else if (side) { J.ankN = [0.8 + sw * 4.8, -lift]; J.ankF = [-0.6 - sw * 4.8, -liftF]; }
  else if (sym) { const s = view === 'down' ? 1 : -1; J.ankN = [2.2, s * sw * 0.8 - lift]; J.ankF = [-2.2, -s * sw * 0.8 - liftF]; }
  else { const s = back ? -1 : 1; J.ankN = [2.3 + sw * 3.2, s * sw * 0.9 - lift]; J.ankF = [-2.0 - sw * 3.2, -0.4 - s * sw * 0.9 - liftF]; }
  if (pose === 'atk' && !sym) { const st = [[-0.8, 0.8], [1.8, -0.6], [2.4, -0.8], [1.2, -0.4]][k]; J.ankN[0] += st[0]; J.ankF[0] += st[1]; }
  // arms at rest; the walk swings them against the legs
  const sN = J.shN, sF = J.shF;
  let elN = wvAdd(sN, side ? 0.6 : 2.0, 6.5), haN = wvAdd(sN, side ? 1.9 : 3.4, 12.4), elF = wvAdd(sF, side ? 0.2 : -1.2, 6.7), haF = wvAdd(sF, side ? 0.4 : -1.5, 12.9);
  let na = 1.2, sag = 9;
  if (!sym) { elN = wvAdd(sN, side ? 1.6 : 2.4, 6.0); haN = wvAdd(sN, side ? 3.6 : 4.4, 10.8); na = 0.8; }   // the needle held out, point forward and down   // the needle's angle (screen radians, 0 = forward) and the slack in the wire
  if (walk) {
    const s = sw * (side ? 2.8 : sym ? 0.6 : 1.9);
    haN = wvAdd(haN, -s, -Math.max(0, -sw) * 0.6); elN = wvAdd(elN, -s * 0.45, 0); haF = wvAdd(haF, s, -Math.max(0, sw) * 0.6); elF = wvAdd(elF, s * 0.45, 0);
    na = (sym ? 1.2 : 0.85) + sw * 0.14;
  }
  if (pose === 'idle') { haN = wvAdd(haN, 0, [0, 0, 0.5, 0.5][k] - br * 0.4); na += [0, 0.04, 0.07, 0.03][k]; sag = [8, 9.5, 10.5, 9.5][k]; }
  J.hN = 'grip'; J.hF = 'open';
  if (pose === 'atk') {
    if (k === 0) { elN = wvAdd(sN, -2.6, 4.2); haN = wvAdd(sN, -4.2, 6.6); na = 0.06; elF = wvAdd(sF, 2.6, 5.4); haF = wvAdd(sF, 5.8, 7.6); sag = 4.5; }
    else if (k === 1) { elN = wvAdd(sN, 4.4, 2.4); haN = wvAdd(sN, 10.2, 3.2); na = 0.26; elF = wvAdd(sF, -1.8, 6.2); haF = wvAdd(sF, -3.8, 11.2); sag = 1.5; }
    else if (k === 2) { elN = wvAdd(sN, 5.6, 2.1); haN = wvAdd(sN, 12, 2.8); na = 0.2; elF = wvAdd(sF, -2.2, 6.2); haF = wvAdd(sF, -4.4, 11.4); sag = 0.6; }
    else { elN = wvAdd(sN, 2.8, 5.4); haN = wvAdd(sN, 6.6, 9); na = 0.72; elF = wvAdd(sF, -0.8, 6.6); haF = wvAdd(sF, -1.8, 12.4); sag = 3.5; }
    if (side) { elF = wvAdd(elF, 1.2, 0); haF = wvAdd(haF, 1.2, 0); }
  } else if (pose === 'cast') {
    if (k === 0) { elF = wvAdd(sF, -0.8, 6.6); haF = wvAdd(sF, -1.4, 11.4); J.hF = 'mirror'; na = 1.05; }
    else if (k === 1) { elF = wvAdd(sF, 3.2, 4.4); haF = wvAdd(sF, 7.6, 1.8); J.hF = 'mirror'; na = 0.9; elN = wvAdd(sN, 1.6, 6.4); haN = wvAdd(sN, 3.6, 11.8); sag = 5; }
    else { elF = wvAdd(sF, 4.6, -0.2); haF = wvAdd(sF, 10.4, -4.6 - (k === 3 ? 0.5 : 0)); J.hF = 'mirror'; na = 0.62; elN = wvAdd(sN, 2.2, 6); haN = wvAdd(sN, 5.4, 10.2); sag = 2.2; }
    if (sym) { elF = wvAdd(elF, -2, 0); haF = wvAdd(haF, -4, 0); }
  }
  J.elN = elN; J.haN = haN; J.elF = elF; J.haF = haF; J.na = na; J.sag = sag;
  // the coat's hem lags behind the body and swings through (follow-through)
  J.hemDX = walk ? -Math.sin(a - 0.9) * (side ? 1.4 : sym ? 0.2 : 0.9) : pose === 'idle' ? [0, 0.25, 0.5, 0.25][k] * (side ? 1 : 0.5) : pose === 'atk' ? [-0.8, 0.4, 1.6, 1.2][k] : pose === 'cast' ? [0, 0.3, 0.6, 0.5][k] : 0;
  J.hemY = -2.2 + (walk ? (Math.abs(sw) > 0.75 ? 0.3 : 0) : 0);
  return J;
}
// ------------------------------------------------------------------- the pieces
const WV_EDGES = {   // coat edges [far, near] at the chest, the sash and the hem, by view
  front: { ch: [-3.9, 4.2], w: [-3.1, 3.4], hp: [-3.8, 4.1], hem: [-6.0, 6.5] },
  back: { ch: [-3.9, 4.2], w: [-3.1, 3.4], hp: [-3.8, 4.1], hem: [-6.0, 6.5] },
  side: { ch: [-3.7, 3.6], w: [-3.1, 3.1], hp: [-3.9, 3.7], hem: [-6.4, 5.8] },
  down: { ch: [-4.1, 4.1], w: [-3.2, 3.2], hp: [-3.9, 3.9], hem: [-6.3, 6.3] },
  up: { ch: [-4.1, 4.1], w: [-3.2, 3.2], hp: [-3.9, 3.9], hem: [-6.3, 6.3] }
};
function wvCoatPts(J) {
  const E = WV_EDGES[J.view] || WV_EDGES.front, l = J.lean, b = J.bob, hx = J.hemDX, hy = J.hemY;
  let hl = E.hem[0] + hx, hr = E.hem[1] + hx;
  if (J.walk && !J.side && !J.sym) { hr += Math.max(0, J.sw) * 0.7; hl -= Math.max(0, -J.sw) * 0.7; }
  if (J.walk && J.side) { hr += Math.max(0, Math.abs(J.sw) - 0.3) * 1.1; hl -= Math.max(0, Math.abs(J.sw) - 0.3) * 0.6; }
  if (J.pose === 'atk' && J.k >= 1) hr += 0.8;
  const pts = [[E.ch[0] - 0.3 + l, -30.8 + b], [E.ch[0] + l * 0.9, -28.5 + b], [E.w[0] + l * 0.5, -21 + b], [E.hp[0] + l * 0.35, -17 + b], [hl * 0.97 + (hl - E.hp[0]) * 0.05, -8 + b * 0.5], [hl, hy - 0.2]];
  for (let i = 1; i < 16; i++) {   // a ragged hem: torn strips hang lower here and there
    const u = i / 16, x = hl + (hr - hl) * u, w = J.sym ? 1 : J.back ? 0.7 : 1, tear = i % 3 === 1 ? 0.7 + wvH(i, 9) * 0.9 : i % 3 === 2 ? -0.2 : 0.2;
    pts.push([x + (wvH(i, 5) - 0.5) * 0.4, hy + (J.side ? 0.3 : 0.9 * w) * (1 - (2 * u - 1) ** 2) + tear * 0.8 + (J.walk ? Math.sin(J.a * 1 + i) * 0.2 : 0)]);
  }
  pts.push([hr, hy - 0.2], [hr * 0.97, -8 + b * 0.5], [E.hp[1] + l * 0.35, -17 + b], [E.w[1] + l * 0.5, -21 + b], [E.ch[1] + l * 0.9, -28.5 + b], [E.ch[1] + 0.3 + l, -30.8 + b]);
  return pts;
}
// ------------------------------------------------------------------- the sculpt painter (v0.37)
// Forms are laid down as shapes that carry a surface normal (spheres, tubes, and cloth panels whose normals come from
// a function: a cylinder under the cloth plus folds that follow gravity). Then every pixel is lit: a warm key from the
// upper left, a cool rim on the edges that face away from us, cast shadow where a later form overhangs an earlier one
// toward the light, and tight specular hits on metal and glass. The light is quantized into a hand-picked six-tone
// ramp per material, hue-shifted (violet shadows, ochre lights), with blocky cluster noise so the bands break into
// clusters rather than stripes or speckle. Orphan pixels are cleaned up; the outline is coloured and breaks where the
// light hits the edge.
const WV_MAT = [], WV_MID = {};
function wvMat(name, hexes, o) {
  const r = hexes.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  const ol = o && o.ol ? [parseInt(o.ol.slice(1, 3), 16), parseInt(o.ol.slice(3, 5), 16), parseInt(o.ol.slice(5, 7), 16)] : r[0].map(v => Math.round(v * 0.6));
  WV_MID[name] = WV_MAT.length; WV_MAT.push(Object.assign({ amb: 0.03, dif: 0.92, rim: 0.9, spec: 0, shin: 30, noise: 0.14, em: false }, o || {}, { name, r, ol }));
  return WV_MID[name];
}
wvMat('coat', ['#170f18', '#2b1c23', '#45322d', '#664c38', '#8f6c48', '#bf9862'], { ol: '#0a0610', dif: 0.58 });
wvMat('coatB', ['#0e0e1e', '#1b1f38', '#2d3552', '#465268', '#6b7680', '#9c9c90'], { ol: '#0a0610', dif: 0.58 });
wvMat('coatD', ['#140914', '#2a0f1e', '#451b23', '#632f2b', '#875038', '#ad774e'], { ol: '#0a0610', dif: 0.58 });
wvMat('under', ['#141220', '#2a2634', '#4a4450', '#6e6670', '#958b8c', '#bdb2a8'], { ol: '#07060c' });
wvMat('trews', ['#1a1622', '#2e2834', '#4a434c', '#6c6468', '#958a86', '#c2b4a8'], { ol: '#07060c', amb: 0.12 });
wvMat('veil', ['#06060d', '#11121f', '#1f2233', '#33374a', '#50566a', '#7c8290'], { ol: '#04040a', rim: 1.0 });
wvMat('felt', ['#120a10', '#23151e', '#3a2926', '#574032', '#7a6045', '#a3845c'], { ol: '#0a0610' });
wvMat('mirror', ['#0c0f1c', '#1c2638', '#34465a', '#566e80', '#8ea6b2', '#e8f2f2'], { ol: '#05060e', spec: 0.7, shin: 60, noise: 0.05 });
wvMat('iron', ['#07070f', '#141528', '#28293d', '#474b5b', '#7a7e88', '#e8e4d8'], { ol: '#04040a', spec: 1.0, shin: 26, noise: 0.06 });
wvMat('brass', ['#190b0b', '#381c14', '#613e1d', '#906c2d', '#c49e48', '#f6e2a2'], { ol: '#0c0508', spec: 0.9, shin: 20, noise: 0.05 });
wvMat('leather', ['#0e0710', '#211319', '#382521', '#543e2d', '#735d3c', '#968155'], { ol: '#08040a' });
wvMat('glove', ['#0b080e', '#191318', '#2a2225', '#413631', '#5c4e42', '#7a6a56'], { ol: '#06040a' });
wvMat('sash', ['#14040e', '#300812', '#560e18', '#7e1a1c', '#a82e22', '#d0543a'], { ol: '#0a0308' });
wvMat('glass', ['#0c1224', '#1d2c46', '#35506e', '#5d7f9c', '#9fc4da', '#f2fbff'], { ol: '#060a14', spec: 1.4, shin: 14, noise: 0.03 });
wvMat('wire', ['#2a6490', '#58a2d4', '#8fcaf0', '#bfe6fa', '#e4f6ff', '#ffffff'], { em: true, emI: 3 });
wvMat('wireCore', ['#58a2d4', '#8fcaf0', '#bfe6fa', '#e4f6ff', '#f6fcff', '#ffffff'], { em: true, emI: 4 });
wvMat('smearA', ['#2c3244', '#2c3244', '#3a4256', '#3a4256', '#3a4256', '#3a4256'], { em: true, emI: 2 });
wvMat('smearB', ['#6c7a90', '#6c7a90', '#7e8ca2', '#7e8ca2', '#7e8ca2', '#7e8ca2'], { em: true, emI: 2 });
wvMat('smearC', ['#b4c4d6', '#b4c4d6', '#cad8e6', '#cad8e6', '#cad8e6', '#cad8e6'], { em: true, emI: 2 });
const wvRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function wvSculpt(Wd, Ht) {
  const N = Wd * Ht, M = new Int16Array(N).fill(-1), LY = new Int16Array(N), GR = new Int16Array(N);
  const NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N), TX = new Float32Array(N), top = new Map();
  let L = 0;
  const set = (i, m, a, b, c, t, g) => { M[i] = m; LY[i] = L; GR[i] = g == null ? L : g; NX[i] = a; NY[i] = b; NZ[i] = c; TX[i] = t || 0; };
  const box = (x0, y0, x1, y1, fn) => { const ya = Math.max(0, Math.floor(y0)), yb = Math.min(Ht - 1, Math.ceil(y1)), xa = Math.max(0, Math.floor(x0)), xb = Math.min(Wd - 1, Math.ceil(x1)); for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) fn(x, y, x + 0.5, y + 0.5); };
  const nrm = (a, b, c) => { const l = Math.hypot(a, b, c) || 1; return [a / l, b / l, c / l]; };
  const S = {
    W: Wd, H: Ht, M,
    layer: () => L,
    ell(cx, cy, rx, ry, m, o) {
      o = o || {}; L++; const fl = o.flat || 0;
      box(cx - rx, cy - ry, cx + rx, cy + ry, (x, y, px, py) => {
        if (o.clip && !o.clip(px, py)) return;
        const dx = (px - cx) / rx, dy = (py - cy) / ry, d2 = dx * dx + dy * dy; if (d2 > 1) return;
        const n = nrm(dx * (1 - fl) + (o.tilt ? o.tilt[0] : 0), dy * (1 - fl) + (o.tilt ? o.tilt[1] : 0), Math.sqrt(1 - d2) + fl);
        set(y * Wd + x, o.mf ? o.mf(x, y) : m, n[0], n[1], n[2], o.tex ? o.tex(x, y) : 0, o.group);
      });
      return L;
    },
    tube(pts, r0, r1, m, o) {
      o = o || {}; L++; const n = pts.length, R = Math.max(r0, r1), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), fl = o.flat || 0;
      box(Math.min(...xs) - R, Math.min(...ys) - R, Math.max(...xs) + R, Math.max(...ys) + R, (x, y, px, py) => {
        if (o.clip && !o.clip(px, py)) return;
        let best = 9, bv = null;
        for (let i = 0; i < n - 1; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
          const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)), r = r0 + (r1 - r0) * (i + t) / Math.max(1, n - 1);
          const vx = (px - ax - t * dx) / r, vy = (py - ay - t * dy) / r, d = vx * vx + vy * vy;
          if (d <= 1 && d < best) { best = d; bv = [vx, vy, t, i]; }
        }
        if (!bv) return;
        const nn = nrm(bv[0] * (1 - fl), bv[1] * (1 - fl) + (o.ny || 0), Math.sqrt(Math.max(0, 1 - best)) + fl);
        set(y * Wd + x, o.mf ? o.mf(x, y) : m, nn[0], nn[1], nn[2], o.tex ? o.tex(x, y, bv) : 0, o.group);
      });
      return L;
    },
    // nf(px, py) -> [nx, ny, nz, mat?, tex?] (need not be normalized)
    poly(pts, m, nf, o) {
      o = o || {}; L++; const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      box(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys), (x, y, px, py) => {
        if (o.clip && !o.clip(px, py)) return;
        let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c; }
        if (!c) return;
        const r = nf ? nf(px, py) : [0, 0, 1]; if (!r) return; const nn = nrm(r[0], r[1], r[2]);
        set(y * Wd + x, r[3] != null ? r[3] : m, nn[0], nn[1], nn[2], r[4] || 0, o.group);
      });
      return L;
    },
    // a 2x2 raised stud (a trinket): its upper-left pixel faces the light
    stud(i, j, m, big) {
      L++; const n = [[-0.55, -0.55], [0.5, -0.5], [-0.5, 0.5], [0.55, 0.55]];
      [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b], k) => { const x = i + a, y = j + b; if (x < 0 || y < 0 || x >= Wd || y >= Ht) return; const q = nrm(n[k][0], n[k][1], 0.62); set(y * Wd + x, m, q[0], q[1], q[2], 0); });
      if (big) { const x = i, y = j + 2; if (y < Ht && x >= 0 && x < Wd) { const q = nrm(-0.2, 0.7, 0.6); set(y * Wd + x, m, q[0], q[1], q[2], 0); } }
      return L;
    },
    px(i, j, c) { i = Math.floor(i); j = Math.floor(j); if (i >= 0 && j >= 0 && i < Wd && j < Ht) top.set(j * Wd + i, c); },
    render() {
      const Kx = -0.6, Ky = -0.72, Kz = 0.42, kl = Math.hypot(Kx, Ky, Kz), kx = Kx / kl, ky = Ky / kl, kz = Kz / kl;
      const hl = Math.hypot(kx, ky, kz + 1), hx = kx / hl, hy = ky / hl, hz = (kz + 1) / hl;
      const IDX = new Int8Array(N).fill(-1);
      const cn = (x, y) => { const a = wvH(x >> 1, y >> 1), b = wvH((x + 1) / 3 | 0, (y + 2) / 3 | 0); return a * 0.6 + b * 0.4; };
      for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) {
        const i = y * Wd + x, m = M[i]; if (m < 0) continue; const mt = WV_MAT[m];
        if (mt.em) { IDX[i] = mt.emI; continue; }
        const nx = NX[i], ny = NY[i], nz = NZ[i], d = nx * kx + ny * ky + nz * kz, diff = Math.max(0, Math.min(1, (d + 0.25) / 1.25));
        let sh = 1;
        for (const [ox, oy, s] of [[1, 1, 0.42], [0, 1, 0.5], [1, 0, 0.5], [2, 2, 0.6], [1, 2, 0.62], [2, 1, 0.62], [3, 3, 0.75]]) {
          const X = x - ox, Y = y - oy; if (X < 0 || Y < 0) continue; const j = Y * Wd + X;
          if (M[j] >= 0 && LY[j] > LY[i] && GR[j] !== GR[i] && !WV_MAT[M[j]].em) { sh = s; break; }
        }
        const rim = Math.pow(Math.max(0, 1 - Math.max(0, nz)), 2.2) * Math.max(0, Math.min(1, -(nx * 0.8 + ny * 0.62)));
        let v = -0.08 * Math.max(0, Math.min(1, (y / Ht - 0.5) / 0.45)) + mt.amb + diff * sh * mt.dif + rim * mt.rim * (sh > 0.55 ? 1 : 0.4) + TX[i] + (cn(x, y) - 0.5) * mt.noise;
        if (mt.spec) { const s = Math.pow(Math.max(0, nx * hx + ny * hy + nz * hz), mt.shin); v += s * mt.spec * (sh > 0.55 ? 1 : 0.2); }
        IDX[i] = Math.max(0, Math.min(5, Math.floor(v * 6)));
      }
      // orphans: a lone pixel whose four neighbours agree takes their tone
      for (let y = 1; y < Ht - 1; y++) for (let x = 1; x < Wd - 1; x++) {
        const i = y * Wd + x; if (M[i] < 0 || WV_MAT[M[i]].em || top.has(i)) continue;
        const a = i - 1, b = i + 1, c = i - Wd, e = i + Wd;
        if (M[a] === M[i] && M[b] === M[i] && M[c] === M[i] && M[e] === M[i] && IDX[a] === IDX[b] && IDX[a] === IDX[c] && IDX[a] === IDX[e] && IDX[a] !== IDX[i] && IDX[i] < 5) IDX[i] = IDX[a];
      }
      const cv = mkCanvas(Wd, Ht), cx = cv.getContext('2d'), img = cx.createImageData(Wd, Ht), D = img.data;
      for (let i = 0; i < N; i++) { if (M[i] < 0) continue; const c = WV_MAT[M[i]].r[IDX[i]]; D[i * 4] = c[0]; D[i * 4 + 1] = c[1]; D[i * 4 + 2] = c[2]; D[i * 4 + 3] = 255; }
      // the coloured, selective outline
      for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) {
        const i = y * Wd + x; if (M[i] >= 0 || top.has(i)) continue;
        let q = -1, lit = false;
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) {
          const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= Wd || Y >= Ht) continue; const j = Y * Wd + X;
          if (M[j] < 0) continue; if (WV_MAT[M[j]].em) { q = -2; break; }
          if (q < 0) q = j;
          if ((dx > 0 || dy > 0) && IDX[j] >= 4) lit = true;   // the light side of the form: the edge is left open
        }
        if (q < 0 || lit) continue;
        const c = WV_MAT[M[q]].ol; D[i * 4] = c[0]; D[i * 4 + 1] = c[1]; D[i * 4 + 2] = c[2]; D[i * 4 + 3] = 255;
      }
      for (const [i, col] of top) { const c = typeof col === 'string' ? wvRGB(col) : col; D[i * 4] = c[0]; D[i * 4 + 1] = c[1]; D[i * 4 + 2] = c[2]; D[i * 4 + 3] = 255; }
      cx.putImageData(img, 0, 0); return cv;
    }
  };
  return S;
}
function wvKit2(Sc) {
  const S = WV_S, X = x => (WV_OX + x) * S, Y = y => (WV_OY + y) * S, P2 = pts => pts.map(p => [X(p[0]), Y(p[1])]);
  const wx = px => px / S - WV_OX, wy = py => py / S - WV_OY;
  return {
    Sc, X, Y, S, wx, wy,
    E: (x, y, rx, ry, m, o) => Sc.ell(X(x), Y(y), rx * S, ry * S, WV_MID[m], o),
    L: (pts, r0, r1, m, o) => Sc.tube(P2(pts), r0 * S, r1 * S, WV_MID[m], o),
    Q: (pts, m, nf, o) => Sc.poly(P2(pts), WV_MID[m], nf, o),
    St: (x, y, m, big) => Sc.stud(Math.floor(X(x)), Math.floor(Y(y)), WV_MID[m], big),
    U: (x, y, c) => Sc.px(X(x), Y(y), c),
    u: (i, j, c) => Sc.px(i, j, c)
  };
}

// ------------------------------------------------------------------- the hero, sculpted and lit
// the coat's surface: a cylinder under the cloth, folds that hang from the sash and fan out toward the hem (they swing
// with the hem's follow-through), the flare facing up into the light, soft diagonal pulls over the chest from the
// satchel strap, bunching above the sash, a crease above the heavy hem band, and a few patches of other cloth
function wvCoatNF(K, J, pts) {
  const rows = new Map(), sashY = -21 + J.bob, hemY = J.hemY, topY = -30.5 + J.bob;
  const span = py => { const k = Math.floor(py); let s = rows.get(k); if (s === undefined) { s = wvSpan(pts, K.wy(k + 0.5)); rows.set(k, s); } return s; };
  const c0 = J.side ? 0.12 : J.sym ? 0 : J.back ? -0.1 : 0.2;
  return (px, py) => {
    const x = K.wx(px), y = K.wy(py), sp = span(py); if (!sp) return [0, 0, 1];
    const u = ((x - sp[0]) / (sp[1] - sp[0])) * 2 - 1, uc = (u - c0) / (1 + Math.abs(c0));
    let nx = uc * 0.92, ny = 0, tex = 0, mat;
    const t = (y - sashY) / (hemY - sashY);
    if (t > 0) {
      const nf = 2.3 + t * 1.5, ph = 0.9 + J.hemDX * 1.1 * t, k = Math.floor((u + 1) * nf * 0.5 + ph / Math.PI);
      const qq = (u + 1) * nf * 0.5 + ph / (Math.PI * 2) + (wvH(k, 3) - 0.5) * 0.3 * t, q = qq - Math.floor(qq), amp = (0.35 + 0.6 * t) * (0.5 + wvH(Math.floor(qq), 11) * 0.9);
      nx += (q < 0.5 ? 0.75 : -0.75) * amp; ny -= 0.22 * t;          // flat facets that meet at crisp edges
      if (q > 0.47 && q < 0.56) tex -= 0.22 * Math.min(1, t * 2 + 0.3);   // the crease in the valley
      else if (q < 0.05 || q > 0.97) tex += 0.1;                     // the lit ridge
      if (y > hemY - 2.5 && y < hemY - 1.9) ny += 0.55;
      if (J.back && Math.abs(uc) < 0.06) tex -= 0.1;   // the seam down the back
    } else {
      const tt = (y - topY) / (sashY - topY);
      ny = -0.5 + tt * 0.55; nx += Math.sin((u * 2 + tt * 1.4) * Math.PI) * 0.16;
      if (tt > 0.82) ny += Math.sin((y - sashY) * 4.2) * 0.45;
    }
    const cy = Math.floor((y + 40 + wvH(Math.floor(x + 20), 1) * 0.9) / 4.6), off = (cy & 1) * 1.8, cxp = Math.floor((x + 20 + off) / 3.6), h = wvH(cxp, cy + 50);
    if (h < 0.13) mat = WV_MID.coatB; else if (h < 0.22) mat = WV_MID.coatD;
    const fx = (x + 20 + off + 360) % 3.6, fy = (y + 40 + 360) % 4.6;
    if (h < 0.22 && (fx < 0.4 || fy < 0.35) && ((Math.floor(px) + Math.floor(py)) % 3 !== 0)) tex -= 0.14;   // stitched seams, in short runs
    return [nx, ny, Math.sqrt(Math.max(0.05, 1 - nx * nx * 0.8)), mat, tex];
  };
}
const WV_TRINK = ['brass', 'iron', 'iron', 'mirror', 'brass', 'iron'];
function wvPaint2(K, J, g) {
  const { E, L, Q, St, U, u, X, Y, S, Sc } = K, back = J.back, side = J.side, sym = J.sym, view = J.view, ph = J.ph;
  const coatPts = wvCoatPts(J), dens = g.tier === 0 ? 0.42 : g.tier === 1 ? 0.6 : 0.8;
  const wire = [];   // fine pixels of the soul-wire, laid on last
  const armGrp = { n: 9001, f: 9002 };
  // ---- an arm: a heavy sleeve that opens into a bell, a dark glove
  const arm = (sh, el, ha, hand, far) => {
    const grp = far ? armGrp.f : armGrp.n, cuff = wvLerp(el, ha, 0.72), dx = ha[0] - el[0], dy = ha[1] - el[1], n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n;
    L([wvAdd(sh, 0, 0.3), el, cuff], 1.3, 1.5, 'coat', { group: grp, tex: (x, y, bv) => (far ? -0.1 : 0) + (Math.sin((bv[3] + bv[2]) * 5.5 + bv[0] * 1.5) > 0.75 ? -0.12 : 0) });
    L([wvAdd(cuff, -ux * 0.6, -uy * 0.6), wvAdd(cuff, ux * 0.5, uy * 0.5 + 0.35)], 1.55, 1.95, 'coat', { group: grp, flat: 0.25, tex: () => (far ? -0.1 : 0) });
    if (!far) for (let s = -1.4; s <= 1.4; s += 0.7) { const p = wvAdd(cuff, -uy * s + ux * 0.55, ux * s + uy * 0.55 + 0.4); if (wvH(Math.round(s * 10), 17) < dens) St(p[0], p[1], WV_TRINK[Math.floor(wvH(Math.round(s * 10), 5) * 6)], false); }
    const hx = ha[0] + ux * 0.5, hy = ha[1] + uy * 0.5;
    if (hand === 'open') L([[hx, hy], [hx + ux * 1.3, hy + uy * 1.3 + 0.3]], 0.85, 0.55, 'glove', { group: grp });
    else E(hx, hy, 1.0, 0.95, 'glove', { group: grp });
  };
  const needleEnds = () => { const c = Math.cos(J.na), s = Math.sin(J.na); return [[J.haN[0] - c * 4.6, J.haN[1] - s * 4.6], [J.haN[0] + c * 14, J.haN[1] + s * 14]]; };
  const spoolAt = side ? [2.4 + J.lean * 0.3, -17.3 + J.bob] : sym ? [4.0, -17.4 + J.bob] : back ? [3.6 + J.lean * 0.3, -17.3 + J.bob] : [3.8 + J.lean * 0.3, -17.3 + J.bob];
  const satAt = side ? [-4.1 + J.lean * 0.3, -18 + J.bob] : [-4.6 + J.lean * 0.3, -17.8 + J.bob];
  const wireSway = J.walk ? -J.sw * 1.2 : J.pose === 'idle' ? [0, 0.3, 0.6, 0.3][J.k] : 0;
  const needle = () => {
    // drawn pixel by pixel: a dark iron shaft, a lit upper edge, a darker lower edge, the eye as a slot, a bright point
    const [b, t] = needleEnds(), c = Math.cos(J.na), sn = Math.sin(J.na), Ln = Math.hypot(t[0] - b[0], t[1] - b[1]), px = -sn, py = c, hx = X(J.haN[0]), hy = Y(J.haN[1]);
    const seen = new Set();
    for (let d = 0; d <= Ln; d += 0.3) {
      const f = d / Ln, x = b[0] + c * d, y = b[1] + sn * d, w = f < 0.12 ? 1 : f < 0.8 ? 0.55 : 0.2;
      for (const [o, col] of [[-w - 0.45, '#05050b'], [-w, f > 0.5 ? '#b8bcc4' : '#8a8e98'], [0, '#474b5b'], [w * 0.7, '#28293d'], [w + 0.45, '#05050b']]) {
        const i = Math.floor(X(x + px * o)), j = Math.floor(Y(y + py * o)), k = i + ',' + j;
        if (Math.hypot(i + 0.5 - hx, j + 0.5 - hy) < 1.3 * S) continue;   // under the fist
        if (seen.has(k) && col === '#05050b') continue; seen.add(k); wire.push([i, j, col]);
      }
    }
    for (const d of [0.5, 0.9, 1.3]) wire.push([Math.floor(X(b[0] + c * d)), Math.floor(Y(b[1] + sn * d)), '#05050b']);
    wire.push([Math.floor(X(t[0] - c * 0.2)), Math.floor(Y(t[1] - sn * 0.2)), '#e8e4d8']);
    return [b, t];
  };
  const wireTo = (a, b, sag) => {
    const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2 + sag * 3) + 4, c = [(a[0] + b[0]) / 2 + wireSway, (a[1] + b[1]) / 2 + sag];
    let li = -1e9, lj = -1e9;
    for (let s = 0; s <= n; s++) {
      const t = s / n, x = (1 - t) * (1 - t) * a[0] + 2 * (1 - t) * t * c[0] + t * t * b[0], y = (1 - t) * (1 - t) * a[1] + 2 * (1 - t) * t * c[1] + t * t * b[1];
      const i = Math.floor(X(x)), j = Math.floor(Y(y)); if (i === li && j === lj) continue; li = i; lj = j;
      wire.push([i, j, s % 6 === 0 ? '#ffffff' : '#bfe8fb'], [i, j + 1, '#58a2d4'], [i, j - 1, '#2f6aa0']);
    }
  };
  // ---- the thrust's smear: a blur of the shaft between where it was drawn back and where it strikes
  const smear = () => {
    if (J.pose !== 'atk' || J.k !== 1) return;
    const J0 = wvRig('atk', 0, view), c0 = Math.cos(J0.na), s0 = Math.sin(J0.na);
    const b0 = [J0.haN[0] - c0 * 2, J0.haN[1] - s0 * 2], t0 = [J0.haN[0] + c0 * 14, J0.haN[1] + s0 * 14], [b1, t1] = needleEnds(), m = wvLerp;
    Q([b0, t0, m(t0, t1, 0.5), t1, m(b1, t1, 0.55), m(b0, b1, 0.8)], 'smearA');
    Q([m(b0, t0, 0.45), m(t0, t1, 0.35), t1, m(b1, t1, 0.35)], 'smearB');
    Q([m(t0, t1, 0.62), t1, m(b1, t1, 0.72), m(m(b0, t0, 0.6), m(b1, t1, 0.6), 0.7)], 'smearC');
    for (let i = 0; i <= 12; i++) { const p = m(m(b0, t0, 0.3), m(b1, t1, 0.3), i / 12); wire.push([Math.floor(X(p[0])), Math.floor(Y(p[1] + 0.6)), i > 8 ? '#ffffff' : '#8fcaf0']); }
  };
  const boots = () => {
    const toe = { front: 1.3, side: 1.9, down: 0.3, back: 0.6, up: 0 }[view] || 1;
    for (const [ak, far] of [[J.ankF, true], [J.ankN, false]]) {
      const [x, y] = ak; E(x, y - 1.2, 1.25, 1.3, 'leather', { tex: () => far ? -0.12 : 0 });
      if (toe > 0.2) E(x + toe * 0.7, y - 0.45, 0.9 + toe * 0.3, 0.6, 'leather', { tex: () => far ? -0.12 : 0 });
    }
  };
  const coat = () => {
    const nfC = wvCoatNF(K, J, coatPts);
    if (back) Q(coatPts, 'coat', nfC);
    if (!back) {   // the opening: a V of linen tunic above the belt; below it the coat parts over the legs in boots
      const ox = side ? 2.3 : sym ? 0 : 0.5 + J.lean * 0.4, hx = J.hemDX, gw = side ? 0.45 : 1, wS = J.walk && side ? Math.max(0, Math.abs(J.sw) - 0.2) * 1.8 : 0, by = -19.4 + J.bob;
      const gl = [ox - 0.5 * gw, by], gr = [ox + 0.5 * gw, by], hl = [ox - 4.4 * gw + hx - wS * 0.3, J.hemY + 1.4], hr = [ox + 4.2 * gw + hx + wS, J.hemY + 1.4];
      const op = [[ox - 0.9 * gw, -26.2 + J.bob], [ox + 0.8 * gw, -26.2 + J.bob], [ox + 0.7 * gw, -20 + J.bob], hr, hl, [ox - 0.8 * gw, -20 + J.bob]];
      const G2 = [gl, gr, hr, hl].map(p => [K.X(p[0]), K.Y(p[1])]);
      const inGap = (px, py) => { let c = false; for (let i = 0, j = 3; i < 4; j = i++) { const [xi, yi] = G2[i], [xj, yj] = G2[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c; } return c; };
      Q([gl, gr, hr, hl], 'coatD', () => [0.3, 0.1, 1, null, -0.25]);   // the dark red lining, seen in the gap
      for (const [far, hp0, an] of [[true, [J.hip[0] - 1.1, -17 + J.bob], J.ankF], [false, [J.hip[0] + 1.1, -17 + J.bob], J.ankN]]) {
        const knee = wvAdd(wvLerp(hp0, an, 0.5), side ? 0.5 : 0.3, 0);
        L([hp0, knee], 1.3, 1.1, 'trews', { group: 8800, tex: () => far ? -0.05 : 0.1 });
        L([wvAdd(knee, 0, -0.3), [an[0], an[1] - 1.2]], 1.15, 1.0, 'leather', { group: 8800, tex: (x, y, bv) => (far ? -0.05 : 0.08) + (bv[2] < 0.12 ? 0.15 : 0) });   // tall boots, the cuff catching light
      }
      Q(coatPts, 'coat', (px, py) => inGap(px, py) ? null : nfC(px, py), { group: 8800 });   // the coat, parted over them
      Q([[ox - 0.9 * gw + J.lean * 0.2, -26.4 + J.bob], [ox + 0.8 * gw + J.lean * 0.2, -26.4 + J.bob], [ox + 0.3 * gw, by - 1.2], [ox - 0.3 * gw, by - 1.2]], 'under', px => [Math.sin(px * 1.3) * 0.25 - 0.15, -0.25, 1]);
      L([gl, wvLerp(gl, hl, 0.5), hl], 0.32, 0.42, 'coatD', { group: 8800, tex: () => 0.1 });   // the turned-back edges of the panels
      L([gr, wvLerp(gr, hr, 0.5), hr], 0.3, 0.38, 'coat', { group: 8800, tex: () => -0.05 });
      // trinkets sewn in two runs down the front edges, thickest low
      for (let y = -24.5 + J.bob; y < J.hemY - 1; y += 1.25) {
        const t = (y - (-25.6 + J.bob)) / (J.hemY + 25.6 - J.bob), lx = op[0][0] + (op[4][0] - op[0][0]) * t - 0.9, rx = op[1][0] + (op[3][0] - op[1][0]) * t + 0.35;
        for (const [x, s] of [[lx, 1], [rx, 2]]) if (wvH(Math.round(y * 8), s) < dens * (0.15 + t * 0.35)) St(x, y, WV_TRINK[Math.floor(wvH(Math.round(y * 8), s + 7) * 6)], t > 0.6 && s === 2);
      }
    }
    // the heavy band of trinkets at the hem: two rows, jittered, swinging with the stride
    const sw2 = J.walk ? -J.sw * 0.5 : 0;
    for (let row = 0; row < 1; row++) {
      const y0 = J.hemY - 1.25 - row * 0.85, sp = wvSpan(coatPts, y0); if (!sp) continue;
      for (let x = sp[0] + 0.45; x < sp[1] - 0.4; x += 1.05) {
        const h = wvH(Math.round(x * 10) + row * 97, 23), cl = Math.sin(x * 1.1 + 0.7) > 0.35; if (!cl || h > dens * 0.8) continue;
        const u0 = (x - sp[0]) / (sp[1] - sp[0]), sag = (J.side ? 0.3 : 0.8 * (back ? 0.7 : 1)) * (1 - (2 * u0 - 1) ** 2);
        St(x + sw2 * (1 - row * 0.5) + (wvH(Math.round(x * 10), 29) - 0.5) * 0.5, y0 + sag + (wvH(Math.round(x * 10), 31) - 0.5) * 0.4, WV_TRINK[Math.floor(h * 60) % 6], row === 0 && h < 0.3);
      }
    }
  };
  const sash = () => {
    const y0 = -20.9 + J.bob, a = wvSpan(coatPts, y0); if (!a) return;
    const yb = -19.6 + J.bob, ab = wvSpan(coatPts, yb);
    L([[a[0] - 0.1, y0], [(a[0] + a[1]) / 2, y0 + (back ? -0.1 : 0.35)], [a[1] + 0.1, y0 + (back ? 0 : 0.2)]], 1.0, 1.0, 'sash', { flat: 0.15, tex: (x, y) => ((x * 3 + y * 2) % 7 === 0 ? -0.12 : 0) });
    if (!back) {
      const kx = side ? 2.2 : sym ? -1.8 : -1.9 + J.lean * 0.4;
      E(kx, -20.6 + J.bob, 0.95, 0.85, 'sash');
      L([[kx - 0.2, -20.0 + J.bob], [kx - 0.5 + J.hemDX * 0.2, -16.5], [kx - 0.3 + J.hemDX * 0.4, -14.2]], 0.5, 0.6, 'sash', { flat: 0.3 });
      St(kx - 0.2, -13.6, 'brass', true);
    }
    if (ab) {   // a broad leather belt over the sash, a brass buckle, a ring of keys
      L([[ab[0] - 0.15, yb], [(ab[0] + ab[1]) / 2, yb + (back ? -0.1 : 0.3)], [ab[1] + 0.15, yb + (back ? 0 : 0.15)]], 0.55, 0.55, 'leather', { flat: 0.2, tex: (x, y) => (x % 5 === 0 ? -0.1 : 0) });
      if (!back) { const bx = side ? 2.0 : sym ? 0 : 0.7 + J.lean * 0.4; E(bx, yb + 0.25, 0.75, 0.6, 'brass', { flat: 0.3 }); E(bx, yb + 0.25, 0.3, 0.25, 'leather'); St(bx + (side ? -1.2 : 1.6), yb + 1.0, 'iron', true); St(bx + (side ? -0.8 : 2.1), yb + 1.4, 'brass', true); }
    }
  };
  const satchel = withStrap => {
    const [x, y] = satAt;
    if (withStrap && !side) L([[J.shN[0] - 1.8, -26.8 + J.bob], [(J.shN[0] - 1.8 + x + 1.4) / 2, (-26.8 + J.bob + y - 1.6) / 2 + 0.3], [x + 1.4, y - 1.6]], 0.4, 0.4, 'leather', { flat: 0.2 });
    const cx = X(x), cy = Y(y), w = 1.8 * S, h = 1.9 * S;
    Q([[x - 1.7, y - 1.3], [x + 1.6, y - 1.5], [x + 1.8, y + 1.5], [x - 1.5, y + 1.9]], 'leather', (px, py) => [(px - cx) / w * 0.7, (py - cy) / h * 0.6 - 0.05, 1, null, ((Math.floor(py) % 4 === 0 && (Math.floor(px) & 1)) ? -0.1 : 0)]);
    Q([[x - 1.4, y - 1.4], [x - 0.9, y - 3.2], [x - 0.2, y - 1.5]], 'glass', () => [-0.35, -0.3, 1]);
    Q([[x - 0.1, y - 1.5], [x + 0.6, y - 2.7], [x + 1.3, y - 1.6]], 'glass', () => [0.3, -0.2, 1]);
    Q([[x - 1.8, y - 1.5], [x + 1.7, y - 1.7], [x + 1.6, y + 0.1], [x + 0.1, y + 0.5], [x - 1.7, y + 0.1]], 'leather', (px, py) => [(px - cx) / w * 0.5, -0.35, 1]);
    St(x - 0.2, y + 0.1, 'brass');
  };
  const spool = () => {
    const [x, y] = spoolAt;
    L([[x - 0.3, -20 + J.bob], [x, y - 1.5]], 0.22, 0.22, 'iron');
    E(x, y - 1.15, 1.35, 0.5, 'iron', { tilt: [0, -0.5] });
    Q([[x - 1.0, y - 1.0], [x + 1.0, y - 1.0], [x + 1.0, y + 1.0], [x - 1.0, y + 1.0]], 'wire');
    for (let yy = -0.6; yy <= 0.8; yy += 0.66) for (let xx = -0.9; xx <= 0.9; xx += 0.66) U(x + xx, y + yy, (Math.round((xx + yy) * 3) & 1) ? '#58a2d4' : '#e4f6ff');
    E(x, y + 1.1, 1.35, 0.5, 'iron', { tilt: [0, -0.3] });
  };
  const mantle = () => {
    const n = J.neck, b = J.bob + (J.pose === 'idle' ? [0, -0.5, -0.5, 0][J.k] * 0.6 : 0), sN = J.shN, sF = J.shF;
    const pts = side
      ? [[n[0] - 2.4, n[1] - 0.2], [sF[0] - 3.0, sF[1] + 0.9], [sF[0] - 3.3, -27 + b], [n[0] - 1.2, -25.6 + b], [n[0] + 1.4, -25.4 + b], [sN[0] + 3.0, -26.6 + b], [sN[0] + 2.8, sN[1] + 0.5], [n[0] + 1.6, n[1] - 0.4]]
      : [[n[0] - 1.6, n[1] - 0.7], [sF[0] + 0.2, sF[1] - 0.3], [sF[0] - 1.1, sF[1] + 0.8], [sF[0] - 1.6, sF[1] + 2.4], [sF[0] - 0.6, -26.8 + b], [sF[0] + 1.6, -26.3 + b], [n[0] + (back ? 0 : 0.4), -25.4 + b], [sN[0] - 1.4, -26.2 + b], [sN[0] + 1.1, -26.9 + b], [sN[0] + 1.8, sN[1] + 2.4], [sN[0] + 1.3, sN[1] + 0.8], [sN[0] - 0.1, sN[1] - 0.3], [n[0] + 1.7, n[1] - 0.7]];
    const cxw = n[0] + (side ? 0 : 0.2), top = n[1] - 0.7;
    const lower = pts.map(([x, y]) => [cxw + (x - cxw) * 1.18, y + (y > n[1] + 1 ? 1.6 : 0.3)]);   // the cape under it, longer and wider, cut in points
    for (let i = 0; i < lower.length; i++) if (lower[i][1] > n[1] + 2) lower[i][1] += (i % 2) * 0.9;
    Q(lower, 'coat', (px, py) => { const x = K.wx(px), y = K.wy(py); return [(x - cxw) / 5.2, -0.5 + (y - top) / 5.5, 0.9, null, -0.08 + ((Math.floor(px * 0.7) % 3) === 0 ? -0.1 : 0)]; });
    Q(pts, 'mirror', (px, py) => {
      const x = K.wx(px), y = K.wy(py), r = Math.floor(py / 2), o = r & 1, c = Math.floor((px + o) / 2), ix = Math.floor(px + o) & 1, iy = Math.floor(py) & 1;
      const jx = (wvH(c, r) - 0.5) * 0.9, jy = (wvH(c + 31, r) - 0.5) * 0.7;
      return [(x - cxw) / 5 + jx, -0.75 + (y - top) / 4.5 + jy, 0.75, null, iy === 1 && ix === 1 ? -0.14 : 0];
    });
    const sp = wvSpan(pts, -26.4 + b);
    if (sp) for (let x = sp[0] + 0.5; x < sp[1] - 0.3; x += 1.1) St(x, -25.9 + b + Math.abs(Math.sin(x * 1.3)) * 0.7, wvH(Math.round(x * 9), 4) < 0.5 ? 'mirror' : 'brass', true);
  };
  const head = () => {
    const [hx, hy] = J.head, tip = g.head ? 0.8 : 0, lean = side ? 0.25 : 0.1;
    const vp = side
      ? [[hx - 1.9, hy - 2.1], [hx + 1.8, hy - 2.1], [hx + 2.6, hy + 0.6], [hx + 3.0, hy + 4.4], [hx + 1.8, hy + 5.0], [hx + 0.5, hy + 4.6], [hx - 0.9, hy + 5.1], [hx - 2.5, hy + 4.4], [hx - 2.5, hy + 0.8]]
      : [[hx - 1.8, hy - 2.1], [hx + 2.0, hy - 2.1], [hx + 2.5, hy + 1.2], [hx + 3.0, hy + 4.6], [hx + 1.9, hy + 5.2], [hx + 0.6, hy + 4.7], [hx - 0.8, hy + 5.3], [hx - 2.2, hy + 4.6], [hx - 2.4, hy + 1.2]];
    const fcx = hx + (side ? 1.4 : sym ? 0 : back ? -0.2 : 0.6);
    Q(vp, 'veil', (px, py) => {
      const x = K.wx(px), y = K.wy(py), dx = (x - fcx) / 2.4, dy = (y - hy + 0.2) / 3.2;
      let nx = dx * 0.9, ny = dy * 0.7 - 0.25;
      if (!back) {   // the brow catches the light, the eyes sink into shadow, the nose stands out, the chin below
        const nsx = hx + (side ? 2.3 : sym ? 0 : 1.35);
        if (y > hy - 1.3 && y < hy - 0.55) ny -= 0.55;
        else if (y >= hy - 0.55 && y < hy + 0.15 && Math.abs(x - nsx) > 0.45) ny += 0.6;
        const ndx = (x - nsx) / 0.55, ndy = (y - hy - 0.5) / 0.9; if (ndx * ndx + ndy * ndy < 1) { nx = ndx * 1.1; ny = ndy * 0.6 - 0.2; }
        if (y > hy + 1.4 && y < hy + 1.9) ny += 0.45;
      }
      if (y > hy + 1.6) nx += Math.sin(px * 1.25) * 0.35;         // the gauze falls in fine folds below the chin
      return [nx, ny, 1, null, (!back && dx * dx + dy * dy < 0.5 ? 0.06 : 0)];
    });
    if (!back) { const ex = side ? [hx + 1.9] : sym ? [hx - 0.8, hx + 0.8] : [hx + 0.3, hx + 1.5]; for (const x of ex) U(x, hy - 0.3, '#3f86bd'); U(ex[ex.length - 1], hy - 0.3, '#8fcaf0'); }
    for (let i = 0; i < vp.length; i++) if (vp[i][1] > hy + 3.5) St(vp[i][0] - 0.3, vp[i][1] - 0.6, i % 2 ? 'brass' : 'mirror');
    const bx = hx + (side ? -0.1 : 0.1), by = hy - 1.9, ax = bx + lean * 0.5;
    Q([[bx - 1.95, by + 0.4], [bx + 1.95, by + 0.4], [bx + 1.45 + lean, by - 5.2 - tip], [bx - 1.35 + lean, by - 5.4 - tip]], 'felt', (px, py) => {
      const x = K.wx(px), y = K.wy(py), hw = 1.95 - (by - y) / 5.3 * 0.5; return [(x - ax - 0.1) / hw * 0.95, -0.12, 1, null, (Math.floor(py) % 5 === 0 ? -0.06 : 0)];
    });
    E(bx + lean + 0.05, by - 5.3 - tip, 1.4, 0.6, 'felt', { tilt: [0, -1.1] });
    L([[bx - 2.3, by + 0.1], [bx, by + 0.45], [bx + 2.3, by + 0.1]], 0.75, 0.75, 'under', { tex: (x, y, bv) => (Math.floor(bv[2] * 9 + bv[3] * 9) % 2 ? -0.12 : 0.04) });   // a rolled cloth wrapped round the hat's foot
    L([[bx - 1.9, by - 0.45], [bx, by - 0.3], [bx + 1.9, by - 0.45]], 0.3, 0.3, g.head ? 'iron' : 'leather');
    if (g.head) for (let i = -1; i <= 1; i++) L([[bx + i * 1.4 + lean * 0.5, by - 0.2], [bx + i * 2.1 + lean, by - 3.2 - (i ? 0 : 1)]], 0.24, 0.1, 'iron');
  };
  const mirrorInHand = () => {
    if (J.hF !== 'mirror') return;
    const [x0, y0] = J.haF, x = x0 + 0.4, y = y0 - 1.4, big = J.k >= 2, r = big ? 1.7 : 1.4, flash = J.pose === 'cast' ? (J.k === 2 ? 2 : J.k === 3 ? 1 : 0) : 0;
    E(x, y, r, r * 1.05, 'brass');
    E(x - 0.1, y - 0.1, r - 0.5, r * 1.05 - 0.5, 'glass', { flat: 0.5, tilt: [-0.4, -0.4] });
    if (flash) {
      const Lr = flash === 2 ? 5 : 3;
      for (let s = 0.9; s < Lr; s += 0.5) {
        const f = s / Lr, c = f < 0.3 ? '#ffffff' : f < 0.65 ? '#bfe8fb' : '#58a2d4';
        U(x + s, y, c); U(x - s, y, c); U(x, y - s * 0.9, c); U(x, y + s * 0.9, c);
        if (s < Lr * 0.5) { U(x + s * 0.6, y - s * 0.6, '#8fcaf0'); U(x - s * 0.6, y + s * 0.6, '#58a2d4'); }
      }
      U(x, y, '#ffffff'); U(x - 0.5, y - 0.5, '#ffffff');
    }
  };
  const tier2 = () => {
    if (g.tier < 2) return;
    const [hx] = J.head, base = [hx - (side ? 1.2 : 0.2), -30.6 + J.bob];
    for (const [dx, h] of [[-3.4, 7], [-1.8, 9], [1.8, 8.4], [3.4, 6.2]]) L([[base[0] + dx * 0.6, base[1]], [base[0] + dx * 1.3, base[1] - h]], 0.3, 0.12, 'iron');
  };
  const raisedFar = J.hF === 'mirror' && J.pose === 'cast' && J.k >= 1 && !back && !side;

  if (!back) {
    tier2();
    if (!raisedFar) { arm(J.shF, J.elF, J.haF, J.hF, true); mirrorInHand(); }
    if (side) satchel(false);
    boots(); coat(); sash();
    if (!side) satchel(true);
    else L([[J.shN[0] - 0.6, -27 + J.bob], [satAt[0] + 1.5, satAt[1] - 1.8]], 0.4, 0.4, 'leather', { flat: 0.2 });
    mantle(); spool(); head();
    if (raisedFar) { arm(J.shF, J.elF, J.haF, J.hF, false); mirrorInHand(); }
    smear();
    arm(J.shN, J.elN, J.haN, J.hN, false);
    const [b] = needle();
    wireTo(spoolAt, wvAdd(b, Math.cos(J.na) * 0.9, Math.sin(J.na) * 0.9), J.sag);
    { const c = wvLerp(J.elN, J.haN, 0.78); for (let k = -1; k <= 1; k++) { wire.push([Math.floor(X(c[0] + k * 0.45)), Math.floor(Y(c[1] - k * 0.3 - 0.5)), '#bfe8fb'], [Math.floor(X(c[0] + k * 0.45)), Math.floor(Y(c[1] - k * 0.3 + 0.5)), '#58a2d4']); } }   // turns of wire round the wrist
    for (const [i, j, c] of wire) u(i, j, c);
  } else {
    smear();
    arm(J.shN, J.elN, J.haN, J.hN, true);
    const [b] = needle();
    wireTo(spoolAt, wvAdd(b, Math.cos(J.na) * 0.9, Math.sin(J.na) * 0.9), J.sag);
    boots(); coat(); sash(); satchel(true); mantle(); tier2(); head();
    arm(J.shF, J.elF, J.haF, J.hF, false); mirrorInHand();
    for (const [i, j, c] of wire) if (i >= 0 && j >= 0 && i < Sc.W && j < Sc.H && Sc.M[j * Sc.W + i] < 0) u(i, j, c);   // only where it shows past the body
  }
}

// ------------------------------------------------------------------- frames and their HD twins; the cache
function wvFrame(pose, ph, view, g) {
  const key = 'wv37|' + pose + '|' + ph + '|' + view + '|' + g.key;
  let fr = HERO_FR[key]; if (fr) return fr;
  const W2 = Math.round(WV_FW * WV_S), H2 = Math.round(WV_FH * WV_S), Sc = wvSculpt(W2, H2), K = wvKit2(Sc), J = wvRig(pose, ph, view);
  wvPaint2(K, J, g);
  const hr = Sc.render();
  const lo = src => { const q = mkCanvas(WV_FW, WV_FH), x = q.getContext('2d'); x.imageSmoothingEnabled = true; x.drawImage(src, 0, 0, WV_FW, WV_FH); return q; };
  const flip = src => { const q = mkCanvas(src.width, src.height), x = q.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return q; };
  const tint1 = (src, col) => { const q = mkCanvas(src.width, src.height), x = q.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, q.width, q.height); return q; };
  const tint = (src, col) => { const q = tint1(src, col); if (src._hr) q._hr = tint1(src._hr, col); return q; };
  const c = lo(hr); c._hr = hr;
  const hf = flip(hr), f = lo(hf); f._hr = hf;
  fr = { c, f, fl: tint(c, '#fff'), flf: tint(f, '#fff'), w: WV_FW, h: WV_FH, ox: WV_OX, oy: WV_OY, bb: { x: WV_OX - 8, y: WV_OY - 44, w: 16, h: 45 }, tint, J };
  HERO_FR[key] = fr; return fr;
}
const WV_BOX = { w: 16, h: 44 };
const wvIs = () => P.cls === 'animancer';
{
  const _hf = heroFrame;
  heroFrame = function (cls, pose, ph, view) {
    if (cls !== 'animancer') return _hf(cls, pose, ph, view);
    if (!view) view = P._view || (P._fb ? 'back' : 'front');
    if (!WV_EDGES[view]) view = 'front';
    if ((view === 'down' || view === 'up') && !(pose === 'idle' || pose === 'walk')) view = view === 'down' ? 'front' : 'back';
    if (!WV_PH[pose]) pose = 'idle';
    const g0 = heroGear(), g = { tier: g0.tier, head: g0.head, key: g0.tier + '|' + (g0.head ? 'h' : '-') };
    return wvFrame(pose, ((ph | 0) % WV_PH[pose] + WV_PH[pose]) % WV_PH[pose], view, g);
  };
  const _hp = heroPose;
  heroPose = function () {
    const r = _hp(); if (!wvIs()) return r;
    if (P.swing > (P._swL || 0) + 1e-6) P._sw0 = P.swing; P._swL = P.swing;
    if (P.cast > (P._caL || 0) + 1e-6) P._ca0 = P.cast; P._caL = P.cast;
    // a thrust: the wind-up, the smear, the extension and a quick settle, spread over the swing whatever its length
    if (r[0] === 'atk') { const u = 1 - P.swing / Math.max(0.05, P._sw0 || 0.22); return ['atk', u < 0.22 ? 0 : u < 0.45 ? 1 : u < 0.75 ? 2 : 3]; }
    if (r[0] === 'cast') return ['cast', P.cast > 0 ? Math.min(3, Math.floor((1 - P.cast / Math.max(0.05, P._ca0 || 0.5)) * 4)) : 2 + Math.floor(G.time * 5) % 2];
    if (r[0] === 'walk') return ['walk', Math.floor(P._wd * 5.2) % 8];
    if (r[0] === 'idle') return ['idle', Math.floor(G.time * 1.8) % 4];
    return r;
  };
  const _dh = drawHero;
  drawHero = function (s, x, y, face, flash, alpha, lift, k) {
    if (!wvIs()) return _dh(s, x, y, face, flash, alpha, lift, k);
    const [pose, ph] = heroPose(), fr = heroFrame('animancer', pose, ph), p = iso(x, y), K = k || 1;
    WF.lastJ = fr.J;
    const img = (flash && OPT.flash) ? (face < 0 ? fr.flf : fr.fl) : (face < 0 ? fr.f : fr.c);
    const w = fr.w * K, h = fr.h * K, X = Math.round(p.sx - (face < 0 ? fr.w - fr.ox : fr.ox) * K), Y = Math.round(p.sy + 3 - (fr.oy + 1) * K - lift);
    if (P.roll > 0) ctx.drawImage(img, X, Math.round(Y + h * 0.3), w, Math.round(h * 0.7));
    else ctx.drawImage(img, X, Y, w, h);
    const sw = Math.round(WV_BOX.w * K), sh = Math.round(WV_BOX.h * K);
    return { x: Math.round(p.sx - sw / 2), y: Math.round(p.sy + 3 - sh - lift), w: sw, h: sh };
  };
  // the lamp hangs from the satchel's strap at the far hip, clear of the needle hand
  const _dcl = drawClassLamp;
  drawClassLamp = function (list) {
    if (!wvIs() || P.dead || !G.zone) return _dcl(list);
    list.push({ d: P.x + P.y + 0.05, f: () => {
      // a small iron cage-lantern on a short chain from the belt at the far hip, a pale soul-flame inside
      const q = iso(P.x, P.y), f = P.face || 1, sway = Math.sin(G.time * 2.4) * 0.7 + (P.path ? Math.sin(G.time * 9) * 0.5 : 0);
      const J = WF.lastJ || wvRig('idle', 0, 'front'), ax = Math.round(q.sx + f * (J.side ? -3.2 : -3.6)), ay = Math.round(q.sy - 19 + J.bob - (P.leapZ || 0));
      const lx = Math.round(ax + sway), ly = ay + 4, fl = Math.floor(G.time * 7) % 3;
      wfLine(ax, ay, lx, ly - 1, '#2a2b3d');
      const img = WF_CV.lamp || (WF_CV.lamp = wfCanvas('lamp', 5, 8, (x, p) => {
        p(2, 0, '#7a7e88'); for (let i = 0; i < 5; i++) p(i, 1, i < 2 ? '#8a8e98' : '#28293d');
        for (let j = 2; j < 6; j++) { p(0, j, '#474b5b'); p(4, j, '#141528'); p(1, j, '#2c5288'); p(2, j, '#8fcaf0'); p(3, j, '#2c5288'); }
        p(2, 3, '#ffffff'); p(2, 4, '#d4f0fc');
        for (let i = 0; i < 5; i++) p(i, 6, i < 2 ? '#5e6270' : '#28293d'); p(2, 7, '#474b5b');
      }));
      ctx.drawImage(img, lx - 2, ly);
      if (fl === 0) wfPx(lx, ly + 2, '#ffffff');
      ctx.globalCompositeOperation = 'lighter'; glow(lx + 0.5, ly + 3.5, 7, '150,210,255', 0.22 + 0.04 * Math.sin(G.time * 9)); ctx.globalCompositeOperation = 'source-over';
    } });
  };
}

// =================================================================== v0.37: the Weaver's effects
// Every effect of the Weaver's skills is redrawn here at the world grain, pixel by pixel: pale ghost-blue soul-thread,
// hot white cores with frayed blue comet tails, and glass that flashes white at the instant it cracks. Each skill has
// an anticipation (threads gather), a burst with a smear, a quick settle, a hit reaction (a snag of thread and a
// flash where a blow lands) and a death signature (the soul unravelling out of the body as a single thread).
// How: while the Weaver's world is drawn, the effect lists the old art reads are swapped out (and always swapped back,
// in a finally), and the same objects are listed here with the new art. Gameplay objects are never changed.
const WF = { st: null, fx: [], threads: [], seen: new WeakMap(), born: new WeakMap() };
const WF_T = ['#231c4a', '#2c5288', '#4f93c8', '#8fcaf0', '#d4f0fc', '#ffffff'];   // thread, tail to head: violet-dark to white
const wfIs = () => P.cls === 'animancer' && !!G.zone;
const wfAge = o => { let b = WF.born.get(o); if (b == null) { b = G.time; WF.born.set(o, b); } return G.time - b; };
const wfR = (seed) => { let s = (seed * 9301 + 49297) % 233280; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; };
function wfPx(x, y, c, a) { if (a != null) ctx.globalAlpha = a; ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); if (a != null) ctx.globalAlpha = 1; }
function wfLine(x0, y0, x1, y1, c, a, skip) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy, n = 0;
  if (a != null) ctx.globalAlpha = a; ctx.fillStyle = c;
  for (let k = 0; k < 400; k++) { if (!skip || (n++ % skip) === 0) ctx.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  if (a != null) ctx.globalAlpha = 1;
}
// a soul-thread along screen points: a pale core with a darker blue shoulder below it; it frays toward its tail
function wfThread(pts, alpha, o) {
  o = o || {}; if (pts.length < 2) return;
  const fray = o.fray == null ? 0.35 : o.fray, seed = o.seed || 1, n = pts.length, hot = o.hot == null ? 4 : o.hot;
  for (let i = 0; i < n - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay)));
    for (let s = 0; s < L; s++) {
      const t = (i + s / L) / (n - 1), x = ax + (bx - ax) * s / L, y = ay + (by - ay) * s / L;
      const ci = Math.max(2, Math.min(hot, Math.floor(2 + t * (hot - 1))));
      if (o.bloom !== false && ((i * 31 + s) % 7) === 0 && t > fray) { ctx.globalCompositeOperation = 'lighter'; glow(x, y, 4, '110,180,255', 0.13 * alpha); ctx.globalCompositeOperation = 'source-over'; }
      ctx.globalAlpha = alpha * (0.35 + 0.65 * Math.min(1, t * 1.6));
      if (t < fray) {   // the frayed end: two loose strands wandering apart
        const f = (fray - t) / fray, w = Math.sin(t * 40 + seed + G.time * 9) * f * 2.2;
        ctx.fillStyle = WF_T[ci]; ctx.fillRect(Math.round(x), Math.round(y + w), 1, 1);
        ctx.fillStyle = WF_T[Math.max(0, ci - 1)]; ctx.fillRect(Math.round(x), Math.round(y - w * 0.8 + 1), 1, 1);
      } else {
        ctx.fillStyle = WF_T[Math.max(0, ci - 2)]; ctx.fillRect(Math.round(x), Math.round(y) + 1, 1, 1);
        ctx.fillStyle = WF_T[ci]; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
    }
  }
  ctx.globalAlpha = 1;
}
// a hot soul-core: a white heart in a pale-blue body, with a soft bloom
function wfCore(sx, sy, size, a, rgb) {
  a = a == null ? 1 : a; sx = Math.round(sx); sy = Math.round(sy);
  ctx.globalCompositeOperation = 'lighter'; glow(sx + 0.5, sy + 0.5, size * 4 + 3, rgb || '120,190,255', 0.45 * a); ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = a;
  if (size >= 2) {
    ctx.fillStyle = WF_T[2]; ctx.fillRect(sx - 2, sy, 5, 1); ctx.fillRect(sx, sy - 2, 1, 5);
    ctx.fillStyle = WF_T[3]; ctx.fillRect(sx - 1, sy - 1, 3, 3);
    ctx.fillStyle = WF_T[5]; ctx.fillRect(sx, sy - 1, 1, 2); ctx.fillRect(sx - 1, sy, 2, 1);
  } else if (size >= 1) {
    ctx.fillStyle = WF_T[3]; ctx.fillRect(sx - 1, sy, 3, 1); ctx.fillRect(sx, sy - 1, 1, 3);
    ctx.fillStyle = WF_T[5]; ctx.fillRect(sx, sy, 1, 1);
  } else { ctx.fillStyle = WF_T[5]; ctx.fillRect(sx, sy, 1, 1); }
  ctx.globalAlpha = 1;
}
// a comet: a hot core and its tail (screen points, tail first)
function wfComet(pts, size, a, seed, quiet) {
  if (quiet) { pts = pts.slice(-4); size = Math.min(size, 1); a = (a == null ? 1 : a) * 0.6; }
  if (pts.length > 1) {
    wfThread(pts, a == null ? 1 : a, { fray: 0.45, seed, hot: 5, bloom: !quiet });
    // the tail's shoulder, two pixels wide close to the head
    const n = pts.length, [hx, hy] = pts[n - 1], [px, py] = pts[Math.max(0, n - 3)];
    if (size >= 1) { ctx.globalAlpha = 0.8 * (a == null ? 1 : a); wfLine(px, py - 1, hx, hy - 1, WF_T[3]); ctx.globalAlpha = 1; }
  }
  const h = pts[pts.length - 1]; wfCore(h[0], h[1], size, quiet ? a * 0.7 : a);
}
const wfS = (x, y, z) => { const q = iso(x, y); return [q.sx, q.sy - (z || 0)]; };

// ------------------------------------------------------------------- fx bookkeeping: snags, unravellings, gathers
function wfAddFx(o) { o.t0 = G.time; WF.fx.push(o); if (WF.fx.length > 140) WF.fx.splice(0, WF.fx.length - 140); }
function wfDrawFx(f) {
  const age = G.time - f.t0, k = age / f.dur;
  if (f.k === 'snag') {       // a blow lands: a white flash, and a few short threads snap outward and hang
    const [sx, sy] = wfS(f.x, f.y, f.z), r = wfR(f.seed);
    if (age < 0.05) { ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, 10, '200,235,255', 0.7); ctx.globalCompositeOperation = 'source-over'; wfPx(sx, sy, '#ffffff'); wfPx(sx - 1, sy, '#ffffff'); wfPx(sx, sy - 1, '#ffffff'); }
    for (let i = 0; i < 4; i++) {
      const a = r() * 6.28, L = 3 + r() * 5, e = Math.min(1, k * 3);
      const pts = [[sx, sy], [sx + Math.cos(a) * L * e * 0.6, sy + Math.sin(a) * L * e * 0.4], [sx + Math.cos(a) * L * e, sy + Math.sin(a) * L * e * 0.5 + k * 4]];
      wfThread(pts.reverse(), 1 - k, { fray: 0.6, seed: i, hot: 3 });
    }
  } else if (f.k === 'unravel') {   // the soul leaves as a single thread: it spirals up, frays and is gone
    const [sx, sy] = wfS(f.x, f.y, 6), H = 26 + f.big * 14, pts = [], e = Math.min(1, k * 2.2), fade = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
    for (let i = 0; i <= 18; i++) { const u = i / 18, h = u * H * e, a = u * 9 + f.seed + age * 4; pts.push([sx + Math.sin(a) * (2 + u * 4) * (1 - u * 0.3), sy - h + Math.cos(a) * 1.2]); }
    wfThread(pts, fade, { fray: 0.5, seed: f.seed, hot: 5 });
    const hi = Math.min(18, Math.floor(e * 18)); wfCore(pts[hi][0], pts[hi][1], k < 0.5 ? 1 : 0, fade);
    if (age < 0.08) { ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, 14, '170,220,255', 0.5); ctx.globalCompositeOperation = 'source-over'; }
  } else if (f.k === 'gather') {  // anticipation: threads drawn in to the hand that casts
    if (P.dead) return;
    const J = WF.lastJ; if (!J) return; const face = P.face || 1, ha = J.hF === 'mirror' ? J.haF : J.haN, q = iso(P.x, P.y);
    const hx = q.sx + ha[0] * face, hy = q.sy + 3 - 1 + ha[1] - 1;
    for (let i = 0; i < 5; i++) { const a = i * 1.257 + f.seed, R = 14 * (1 - k) + 2; wfThread([[hx + Math.cos(a) * R, hy + Math.sin(a) * R * 0.7], [hx + Math.cos(a + 0.5) * R * 0.5, hy + Math.sin(a + 0.5) * R * 0.35], [hx, hy]], 0.9, { fray: 0.4, seed: i, hot: 4 }); }
    wfCore(hx, hy, k > 0.5 ? 1 : 0, 1);
  } else if (f.k === 'ring') {    // a burst: a flat ring of thread thrown out along the ground
    const [sx, sy] = wfS(f.x, f.y, 0), R = f.R * (0.3 + 0.7 * Math.sqrt(k)), n = Math.max(12, Math.round(R * ISO_R * 5.2));
    for (let i = 0; i < n; i++) { const a = i / n * 6.28, x = sx + Math.cos(a) * R * ISO_R / 1, y = sy + Math.sin(a) * R * ISO_RY; wfPx(x, y, i % 3 ? WF_T[3] : WF_T[5], 1 - k); }
  } else if (f.k === 'flash') {   // glass cracking: a white flash that is gone in a blink
    const [sx, sy] = wfS(f.x, f.y, f.z); ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, f.r * (1 + k), '230,245,255', 0.9 * (1 - k)); ctx.globalCompositeOperation = 'source-over';
    if (k < 0.5) { const L = Math.round(f.r * 0.6 * (1 - k)); ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(sx) - L, Math.round(sy), L * 2 + 1, 1); ctx.fillRect(Math.round(sx), Math.round(sy) - L, 1, L * 2 + 1); }
  }
}
{
  // hit reaction and death signature on anything the Weaver's power strikes or kills
  const _hm = hurtMon;
  hurtMon = function (m, dmg, col) {
    const was = m && !m.dead;
    _hm(m, dmg, col);
    if (was && wfIs() && (m._wfT == null || G.time - m._wfT > 0.1)) { m._wfT = G.time; wfAddFx({ k: 'snag', x: m.x, y: m.y, z: 12 + (m.r || 0.3) * 10, dur: 0.22, seed: Math.random() * 99 }); }
  };
  const _km = killMon;
  killMon = function (m) {
    const was = m && !m.dead;
    _km(m);
    if (was && wfIs()) wfAddFx({ k: 'unravel', x: m.x, y: m.y, dur: 0.9, seed: Math.random() * 6, big: m.rank === 'boss' || m.rank === 'champion' ? 1 : 0 });
  };
  // anticipation on every cast: threads gather at the casting hand for a moment (no added waiting)
  const _cs = castSkill;
  castSkill = function (id, pt) {
    const c0 = P.cast; _cs(id, pt);
    if (wfIs() && P.cast > c0 + 1e-6) wfAddFx({ k: 'gather', dur: Math.min(0.18, P.cast * 0.6), seed: Math.random() * 6 });
  };
}

// ------------------------------------------------------------------- mirrors and glass (painted once, cached)
const WF_CV = {};
function wfCanvas(key, w, h, paint) { if (WF_CV[key]) return WF_CV[key]; const c = mkCanvas(w, h), x = c.getContext('2d'); paint(x, (i, j, col) => { x.fillStyle = col; x.fillRect(i, j, 1, 1); }); return (WF_CV[key] = c); }
// a standing mirror: a tall pane of old silvered glass in a black iron frame with a needle finial, on an iron foot.
// The glass holds a dim reflection: a cold grey-blue sky over a dark horizon, one hard diagonal streak.
function wfMirror(w, h, cracked, streak) {
  return wfCanvas('mir' + w + 'x' + h + (cracked ? 'c' : '') + streak, w, h, (x, p) => {
    const gx0 = 2, gx1 = w - 3, gy0 = 5, gy1 = h - 5, hz = Math.round(gy0 + (gy1 - gy0) * 0.58);
    // the foot and the frame
    for (let i = 0; i < w; i++) { p(i, h - 1, '#0a0a14'); p(i, h - 2, i < w / 2 ? '#4a4e5e' : '#28293d'); p(i, h - 3, '#141528'); }
    for (let j = 3; j < h - 3; j++) { p(0, j, '#0a0a14'); p(1, j, j % 5 === 0 ? '#9a9ea8' : '#5e6270'); p(w - 2, j, '#28293d'); p(w - 1, j, '#0a0a14'); }
    for (let i = 1; i < w - 1; i++) { const arch = Math.round(Math.abs(i - (w - 1) / 2) * 0.5); p(i, 2 + (2 - Math.min(2, arch)), '#0a0a14'); p(i, 3 + (2 - Math.min(2, arch)), i < w / 2 ? '#7a7e88' : '#3a3c50'); }
    for (let j = 0; j < 4; j++) p(Math.floor(w / 2), j, j === 0 ? '#e8e4d8' : '#5e6270');   // the needle finial
    for (let j = gy0; j <= gy1; j++) for (let i = gx0; i <= gx1; i++) {
      const v = (j - gy0) / (hz - gy0);
      let c = j < hz ? (v < 0.3 ? '#56708a' : v < 0.65 ? '#3e5670' : '#2c3e56') : j === hz ? '#0b0f1c' : ((j - hz) % 3 === 0 ? '#1a1e2c' : '#141826');
      if (i === gx0) c = j < hz ? '#8aa6bc' : '#2c3444';
      const u = (i - gx0) - (j - gy0) * 0.42 - streak;
      if (u >= 0 && u < 1) c = j < hz ? '#e2f2fa' : '#6a7e92'; else if (u >= 1 && u < 2) c = j < hz ? '#9fc4da' : '#3e4e62';
      p(i, j, c);
    }
    if (cracked) { const r = wfR(w * 7 + h), cx = gx0 + Math.round((gx1 - gx0) * 0.6), cy = Math.round((gy0 + gy1) * 0.45); for (let k = 0; k < 6; k++) { let a = k / 6 * 6.28 + r(), X = cx, Y = cy; for (let s = 0; s < 3 + r() * (h * 0.25); s++) { a += (r() - 0.5) * 0.5; X += Math.cos(a); Y += Math.sin(a); const I = Math.round(X), J = Math.round(Y); if (I < gx0 || I > gx1 || J < gy0 || J > gy1) break; p(I, J, '#070a12'); if (s & 1) p(I - 1, J - 1, '#dff2fa'); } } p(cx, cy, '#ffffff'); }
  });
}
function wfDrawMirror(pl) {
  const [sx, sy] = wfS(pl.x, pl.y, 0), age = wfAge(pl), k = pl.rise > 0 ? Math.max(0, 1 - pl.rise / 0.22) : 1;
  const big = !!pl.hall, w = big ? 12 : 11, h = big ? 34 : 30;
  // it cracks: in the last instant the glass flashes white, then (zy_anim) bursts into shards
  const cracking = pl.life != null && pl.life < 0.14 && pl.rise <= 0;
  ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.fillRect(Math.round(sx - w / 2 - 1), Math.round(sy), w + 2, 2);
  const img = wfMirror(w, h, !!pl.cracked || cracking, Math.floor(((G.time * 0.7 + pl.x * 3.1 + pl.y) % 4) * 3) === 0 ? 1 : 3), hh = Math.max(1, Math.round(h * k));
  ctx.drawImage(img, 0, 0, w, hh, Math.round(sx - w / 2), Math.round(sy + 1 - hh), w, hh);
  if (pl.rise > 0 || age < 0.12) {    // the burst up out of the ground: a smear of pale streaks and a ring of grit
    ctx.globalAlpha = 0.7; ctx.fillStyle = WF_T[4];
    for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(sx - w / 2 + 2 + i * 3), Math.round(sy - hh - 6 - i * 2), 1, 6 + i * 2);
    ctx.globalAlpha = 1; ctx.fillStyle = '#6a6e7a'; for (let i = -3; i <= 3; i++) ctx.fillRect(Math.round(sx + i * 2), Math.round(sy - (i & 1)), 1, 1);
  }
  if (cracking) { ctx.globalCompositeOperation = 'lighter'; glow(sx, sy - h * 0.55, 16, '235,248,255', 0.9); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.85; ctx.fillStyle = '#f4fbff'; ctx.fillRect(Math.round(sx - w / 2 + 2), Math.round(sy + 1 - hh + 5), w - 4, hh - 10); ctx.globalAlpha = 1; }
  else if (pl.life != null && pl.life < 1.2 && Math.floor(G.time * 10) % 3 === 0) wfPx(sx, sy - h * 0.5, '#ffffff');
}
function wfDrawCrack(c) {
  const [sx, sy] = wfS(c.x, c.y, 0), age = c.max - c.t, r = wfR(c.v * 31 + 7);
  const img = wfCanvas('crk' + c.v, 22, 11, (x, p) => {
    const pts = []; for (let i = 0; i < 9; i++) { const a = i / 9 * 6.28 + r() * 0.3, R = 0.75 + r() * 0.3; pts.push([11 + Math.cos(a) * 9.5 * R, 5.5 + Math.sin(a) * 4.6 * R]); }
    for (let j = 0; j < 11; j++) for (let i = 0; i < 22; i++) { let inside = false; for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) { const [xa, ya] = pts[a], [xb, yb] = pts[b]; if ((ya > j + 0.5) !== (yb > j + 0.5) && i + 0.5 < (xb - xa) * (j + 0.5 - ya) / (yb - ya) + xa) inside = !inside; } if (inside) p(i, j, (Math.floor(i / 3) + Math.floor(j / 2)) % 3 === 0 ? '#2c3e56' : (i + j) % 4 === 0 ? '#1a2436' : '#141c2c'); }
    for (let k = 0; k < 5; k++) { let a = k * 1.26 + r(), X = 11, Y = 5.5; for (let s = 0; s < 9; s++) { a += (r() - 0.5) * 0.6; X += Math.cos(a) * 1.1; Y += Math.sin(a) * 0.55; const I = Math.round(X), J = Math.round(Y); if (I < 1 || I > 20 || J < 1 || J > 9) break; p(I, J, s % 3 === 0 ? '#9fc4da' : '#07090f'); } }
    p(11, 5, '#e2f2fa'); p(12, 5, '#9fc4da');
  });
  if (c.t < 0.8 && Math.floor(G.time * 12) % 2) return;
  ctx.globalAlpha = Math.min(1, c.t / 0.4); ctx.drawImage(img, Math.round(sx - 11), Math.round(sy - 5)); ctx.globalAlpha = 1;
  if (age < 0.07) { ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, 12, '235,248,255', 0.85); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#f4fbff'; ctx.fillRect(Math.round(sx - 7), Math.round(sy - 1), 14, 2); }
  const tw = (G.time * 1.1 + c.tw) % 3; if (tw < 0.2) wfPx(sx - 6 + tw * 60, sy - 1, '#e2f2fa');
}
function wfDrawSpike(s) {
  const [sx, sy] = wfS(s.x, s.y, 0), k = 1 - s.t / s.max, up = k < 0.15 ? k / 0.15 : k > 0.75 ? (1 - k) / 0.25 : 1, r = wfR(s.v * 13 + 1);
  for (let n = 0; n < 3; n++) {   // three slivers of mirror-glass, each lit on its left face
    const ox = [-3, 0, 3][n] + Math.round(r() * 2 - 1), H = Math.round((8 + r() * 8) * up * (n === 1 ? 1.3 : 1)), W = 2 + (n === 1 ? 1 : 0);
    for (let j = 0; j < H; j++) { const ww = Math.max(1, Math.round(W * (1 - j / H) + 0.4)); for (let i = 0; i < ww; i++) wfPx(sx + ox + i - (ww >> 1), sy - j, i === 0 ? (j > H * 0.6 ? '#e2f2fa' : '#8aa6bc') : j % 4 === 0 ? '#1a2436' : '#2c3e56'); }
    if (k < 0.12 && H > 1) { ctx.globalCompositeOperation = 'lighter'; glow(sx + ox, sy - H, 6, '235,248,255', 0.9); ctx.globalCompositeOperation = 'source-over'; wfPx(sx + ox, sy - H, '#ffffff'); }
    if (k < 0.2) { ctx.globalAlpha = 0.6; ctx.fillStyle = WF_T[4]; ctx.fillRect(Math.round(sx + ox), Math.round(sy - H - 6), 1, 5); ctx.globalAlpha = 1; }   // the smear of the burst
  }
}
function wfDrawGlass(g) {
  const [sx, sy] = wfS(g.x, g.y, g.z), fresh = g.max - g.t < 0.08, ph = Math.floor(G.time * 14 + g.seed) % 4;
  if (g.t < 0.35 && ph % 2) return;
  if (g.z <= 0) wfPx(sx, sy + 1, '#07090f');
  const c = fresh ? '#ffffff' : ph === 0 ? '#e2f2fa' : ph === 1 ? '#8aa6bc' : ph === 2 ? '#4f6a84' : '#9fc4da';
  wfPx(sx, sy, c); if (g.s > 1) wfPx(sx + (ph & 1), sy + 1 - (ph & 1), ph === 0 ? '#ffffff' : '#2c3e56');
}
function wfDrawGlassShot(s) {
  const [sx, sy] = wfS(s.x, s.y, 9), l = Math.hypot(s.vx, s.vy) || 1, dx = (s.vx - s.vy) / l, dy = (s.vx + s.vy) / l * 0.5;
  for (let i = 0; i < 6; i++) wfPx(sx - dx * i, sy - dy * i, i === 0 ? '#ffffff' : i < 2 ? '#e2f2fa' : i < 4 ? '#8aa6bc' : '#2c3e56', 1 - i * 0.12);
}
function wfDrawGlint(g) {
  const [sx, sy] = wfS(g.x, g.y, g.z), k = g.t / g.max, L = Math.round((g.big ? 5 : 3) * Math.sin(Math.PI * k));
  ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, g.big ? 7 : 4, '220,240,255', 0.4 * k); ctx.globalCompositeOperation = 'source-over';
  for (let i = 1; i <= L; i++) { const c = i === 1 ? '#e2f2fa' : WF_T[3]; wfPx(sx + i, sy, c); wfPx(sx - i, sy, c); wfPx(sx, sy - i, c); wfPx(sx, sy + i, c); }
  wfPx(sx, sy, '#ffffff');
}
// the great mirror falls out of the sky: a streaked smear as it drops, a white flash and a crack as it lands
function wfDrawAnvil(a) {
  if (a.fall - a.delay > a.fallMax) return;
  const [sx, sy] = wfS(a.x, a.y, 0), k = a.fall > 0 ? Math.max(0, a.fall - a.delay) / a.fallMax : 0, z = k * 130, landed = a.fall <= 0;
  ctx.fillStyle = `rgba(0,0,0,${0.25 + 0.3 * (1 - k)})`; ctx.fillRect(Math.round(sx - 12 * (1.2 - k * 0.6)), Math.round(sy - 1), Math.round(24 * (1.2 - k * 0.6)), 3);
  if (landed && a.life < 1.5 && Math.floor(G.time * 8) % 2) return;
  const img = wfMirror(20, 40, landed, 4);
  ctx.drawImage(img, Math.round(sx - 10), Math.round(sy + 1 - 40 - z));
  if (z > 0) { ctx.globalAlpha = 0.55; for (const [dx, L] of [[-7, 22], [-2, 34], [3, 28], [8, 16]]) { ctx.fillStyle = WF_T[3]; ctx.fillRect(Math.round(sx + dx), Math.round(sy - 40 - z - L), 1, L); } ctx.globalAlpha = 1; }
  const since = landed ? wfAge(a) - (WF.seen.get(a) || 0) : -1;
  if (landed && !WF.seen.has(a)) WF.seen.set(a, wfAge(a));
  if (landed && since < 0.09) { ctx.globalCompositeOperation = 'lighter'; glow(sx, sy - 20, 34, '235,248,255', 0.95); ctx.globalCompositeOperation = 'source-over'; const wimg = WF_CV.anvW || (WF_CV.anvW = (() => { const q = mkCanvas(20, 40), x = q.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#f4fbff'; x.fillRect(0, 0, 20, 40); return q; })()); ctx.globalAlpha = 1 - since / 0.09; ctx.drawImage(wimg, Math.round(sx - 10), Math.round(sy + 1 - 40)); ctx.globalAlpha = 1; }
}

// ------------------------------------------------------------------- souls, wisps, darts and threads
function wfTrail(o, x, y, z, n) {   // a short remembered path for things that keep none of their own
  let t = WF.seen.get(o); if (!t || !Array.isArray(t)) { t = []; WF.seen.set(o, t); }
  const [sx, sy] = wfS(x, y, z), l = t[t.length - 1];
  if (!l || Math.abs(l[0] - sx) + Math.abs(l[1] - sy) >= 1) { t.push([sx, sy]); if (t.length > n) t.shift(); }
  return t;
}
function wfDrawWisp(w) {
  const t = wfTrail(w, w.x, w.y, w.z, w.dart ? 10 : 6), size = w.kind === 'rev' || w.dart ? 1 : 0;
  if (w.dart) { const M = w.dart; wfTrackRicochet(M); const pts = M.trail.map(q => wfS(q.x, q.y, q.z)); pts.push(wfS(w.x, w.y, w.z)); wfComet(pts, 1, 1, w.x, WF.busy > 4); return; }
  const bob = Math.sin(G.time * 3 + (w.wt || 0)) * 0.5;
  wfComet(t.map(p => [p[0], p[1] + bob]), size, 0.9, (w.wt || 0) * 7);
  if (w.kind === 'prism') wfPx(t[t.length - 1][0] + 1, t[t.length - 1][1] - 1, '#c8b0f0');
}
function wfTrackRicochet(M) {   // a ricochet leaves a thread hanging in the air where the wisp turned
  const f = M.from; if (!f) return;
  const key = f.x.toFixed(2) + ',' + f.y.toFixed(2);
  if (M._wfFrom && M._wfFrom !== key && M._wfP) { WF.threads.push({ a: M._wfP, b: { x: f.x, y: f.y }, t0: G.time, dur: 0.7, seed: Math.random() * 9 }); if (WF.threads.length > 60) WF.threads.shift(); }
  M._wfFrom = key; M._wfP = { x: f.x, y: f.y };
}
function wfDrawDart(d) {
  wfTrackRicochet(d);
  const pts = d.trail.map(q => wfS(q.x, q.y, q.z)); pts.push(wfS(d.x, d.y, d.z));
  wfComet(pts, d.small ? 0 : 2, 1, d.t * 7, WF.busy > 4 && d.kind !== 'lance');
}
function wfDrawThread(T) {
  const k = (G.time - T.t0) / T.dur; if (k >= 1) return;
  const [ax, ay] = wfS(T.a.x, T.a.y, 11), [bx, by] = wfS(T.b.x, T.b.y, 11), pts = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10; pts.push([ax + (bx - ax) * u, ay + (by - ay) * u + Math.sin(u * Math.PI) * (2 + k * 6)]); }   // it sags as it fades
  wfThread(pts, 0.8 * (1 - k), { fray: 0.3 + k * 0.6, seed: T.seed, hot: 4 });
}
function wfDrawSoul(s) {
  const [sx, sy] = wfS(s.x, s.y, 8), l = Math.hypot(s.vx, s.vy) || 1, dx = (s.vx - s.vy) / l, dy = (s.vx + s.vy) / l * 0.5, pts = [];
  for (let i = 6; i >= 0; i--) pts.push([sx - dx * i * 1.3 + Math.sin(i * 1.3 + (s.wob || 0) + G.time * 14) * i * 0.3, sy - dy * i * 1.3]);
  wfComet(pts, 0, 0.95, s.wob || 1);
}
function wfDrawGreat(gw) {
  const [sx, sy] = wfS(gw.x, gw.y, gw.z), R = 5 + Math.min(12, gw.size || 1) * 0.8, pul = 1 + 0.12 * Math.sin(G.time * 9);
  for (let i = 0; i < Math.min(12, gw.size || 1) + 3; i++) {   // threads wound in toward the heart
    const a0 = G.time * 2.2 + i * 2.4, pts = [];
    for (let s = 0; s <= 8; s++) { const u = s / 8, r = R * 2.2 * (1 - u) + 1, a = a0 + u * 2.2; pts.push([sx + Math.cos(a) * r, sy + Math.sin(a) * r * 0.75]); }
    wfThread(pts, 0.75, { fray: 0.35, seed: i, hot: 5 });
  }
  ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, R * 2.6 * pul, '130,200,255', 0.55); ctx.globalCompositeOperation = 'source-over';
  const r = Math.round(R * 0.45 * pul);
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i, j * 1.1) / r; if (d > 1) continue; wfPx(sx + i, sy + j, d < 0.35 ? '#ffffff' : d < 0.65 ? WF_T[4] : d < 0.85 ? WF_T[3] : WF_T[2]); }
}
function wfDrawOrb(o) {   // a ball of wound soul-thread with a white heart; it throws off shards of glass as it turns
  const [sx, sy] = wfS(o.x, o.y, 10), r = o.gen ? 2.5 : 4, age = wfAge(o);
  ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, r * 4, '150,210,255', 0.55); ctx.globalCompositeOperation = 'source-over';
  for (let k = 0; k < 3; k++) {
    const ang = o.ang * (k + 1) * 0.7 + k * 2.1 + G.time * (3 + k);
    for (let i = 0; i < 16; i++) { const a = i / 16 * 6.28, x = Math.cos(a) * r, y = Math.sin(a) * r * 0.45, ca = Math.cos(ang), sa = Math.sin(ang), X = x * ca - y * sa, Y = x * sa + y * ca; wfPx(sx + X, sy + Y * 0.9, Y < 0 ? WF_T[4] : WF_T[2]); }
  }
  wfCore(sx, sy, o.gen ? 1 : 2, 1);
  if (age < 0.1) { const L = Math.round(10 * (1 - age / 0.1)); ctx.globalAlpha = 0.7; wfLine(sx, sy, sx - (o.vx - o.vy) * L * 0.3, sy - (o.vx + o.vy) * L * 0.15, WF_T[4]); ctx.globalAlpha = 1; }   // the launch smear
}
function wfDrawShard(s) {
  const [sx, sy] = wfS(s.x, s.y, 9), dx = (s.vx - s.vy) * 0.22, dy = (s.vx + s.vy) * 0.11;
  wfLine(sx, sy, sx - dx, sy - dy, '#8aa6bc'); wfPx(sx, sy, '#ffffff'); wfPx(sx - dx * 0.5, sy - dy * 0.5, '#e2f2fa');
}
function wfDrawStorm(st) {   // a vortex of soul-thread with a dark eye: it opens with a snap, spins, and spits souls
  const [sx, sy] = wfS(st.x, st.y, 0), age = wfAge(st), open = Math.min(1, age / 0.18), fade = Math.min(1, st.life / 0.4);
  for (let arm = 0; arm < 4; arm++) {
    const pts = []; for (let i = 0; i <= 16; i++) { const u = i / 16, r = (2 + u * 26) * open, a = st.spin * 1.4 + arm * 1.571 + u * 3.2; pts.push([sx + Math.cos(a) * r, sy - 6 - u * 4 + Math.sin(a) * r * 0.5]); }
    wfThread(pts.reverse(), 0.85 * fade, { fray: 0.4, seed: arm, hot: 5 });
  }
  ctx.fillStyle = '#0b0a18'; ctx.globalAlpha = 0.7 * fade; ctx.fillRect(Math.round(sx - 3), Math.round(sy - 8), 7, 3); ctx.globalAlpha = 1;
  wfCore(sx, sy - 7, 1, fade);
  if (age < 0.14) { ctx.globalCompositeOperation = 'lighter'; glow(sx, sy - 6, 30 * (1 - age / 0.14) + 6, '170,220,255', 0.6); ctx.globalCompositeOperation = 'source-over'; }
}
function wfDrawLeash(L) {   // a twisted double soul-thread with hot beads riding it
  const fade = Math.min(1, L.life / 1.5), pts = L.pts.map(p => wfS(p.x, p.y, p.z)), n = pts.length; if (n < 2) return;
  const twist = s => pts.map(([x, y], i) => [x, y + (i === 0 || i === n - 1 ? 0 : Math.sin(G.time * 18 + i * 1.1 + s) * 1.2)]);
  wfThread(twist(0), 0.9 * fade, { fray: 0, hot: 5 }); wfThread(twist(Math.PI), 0.55 * fade, { fray: 0, hot: 3 });
  for (let i = Math.floor((G.time * 20) % 4); i < n; i += 4) wfCore(pts[i][0], pts[i][1], 0, fade);
  if (L.kind === 'ground') { const [gx, gy] = wfS(L.ax, L.ay, 0); wfCore(gx, gy - 2, 1, fade); }
}
function wfDrawMark(m) {   // a ring of stitches sewn into the ground; it closes in from wide as it lands
  const [sx, sy] = wfS(m.x, m.y, 0), age = wfAge(m), c = Math.min(1, age / 0.16), R = m.R * (1.35 - 0.35 * c), a = Math.min(1, m.t * 2), n = Math.round(R * ISO_R * 5.2);
  for (let i = 0; i < n; i++) {
    const t = i / n * 6.28 + G.time * 0.6, x = sx + Math.cos(t) * R * ISO_R, y = sy + Math.sin(t) * R * ISO_RY;
    if (i % 3 === 2) continue;   // a stitch, a gap
    const tx = -Math.sin(t) * 1, c = i % 3 === 0 ? WF_T[5] : WF_T[4]; wfPx(x, y, c, a); wfPx(x + tx, y, c, a); wfPx(x, y + 1, WF_T[1], a * 0.8);
    if (i % 9 === 0) { ctx.globalCompositeOperation = 'lighter'; glow(x, y, 5, '110,180,255', 0.2 * a); ctx.globalCompositeOperation = 'source-over'; }
  }
  if (age < 0.1) { ctx.globalCompositeOperation = 'lighter'; glow(sx, sy, R * ISO_R, '170,220,255', 0.35); ctx.globalCompositeOperation = 'source-over'; }
  for (let i = 0; i < 8; i++) { const t = i / 8 * 6.28 + G.time * 0.6; wfCore(sx + Math.cos(t) * R * ISO_R, sy + Math.sin(t) * R * ISO_RY - 1, 0, a); }   // knots where the thread is tied down
  for (let i = 0; i < 14; i++) { const t = G.time * 3 + i * 0.02; wfPx(sx + Math.cos(t) * R * ISO_R, sy + Math.sin(t) * R * ISO_RY, i < 3 ? '#ffffff' : WF_T[4], a * (1 - i / 14)); }   // a bright stitch running round
  // the needle's mark at the centre: a small stitched cross
  for (let i = -2; i <= 2; i++) { wfPx(sx + i, sy + i * 0.5, WF_T[3], a); wfPx(sx + i, sy - i * 0.5, WF_T[3], a); }
}
function wfDrawWord(w) {   // Word of Unmaking: a sigil of thread that winds tight, then snaps shut with a flash
  const [sx, sy] = wfS(w.x, w.y, 0), k = Math.min(1, w.t / w.dur), R = w.R * (1 - 0.8 * k * k), a0 = G.time * 2 + w.seed;
  if (w.done) { const e = (w.t - w.dur) / 0.3; ctx.globalCompositeOperation = 'lighter'; glow(sx, sy - 4, 40 * (1 - e) + 6, '220,240,255', 0.8 * (1 - e)); ctx.globalCompositeOperation = 'source-over'; return; }
  const n = Math.round(R * ISO_R * 5.2);
  for (let i = 0; i < n; i++) { const t = i / n * 6.28, x = sx + Math.cos(t + a0 * 0.3) * R * ISO_R, y = sy + Math.sin(t + a0 * 0.3) * R * ISO_RY; wfPx(x, y, i % 2 ? WF_T[3] : WF_T[4], 0.5 + 0.5 * k); }
  for (let i = 0; i < 6; i++) {   // six threads drawn inward, crossing into a star
    const a = a0 + i / 6 * 6.28, b = a + 2.3;
    wfThread([[sx + Math.cos(a) * R * ISO_R, sy + Math.sin(a) * R * ISO_RY], [sx + Math.cos(b) * R * ISO_R * 0.5, sy + Math.sin(b) * R * ISO_RY * 0.5], [sx, sy - 3 * k]], 0.6 + 0.4 * k, { fray: 0.2, seed: i, hot: 4 });
  }
  wfCore(sx, sy - 3 * k, k > 0.6 ? 2 : 1, 1);
}
function wfDrawZap(z) {   // a bolt of speech: a jagged soul-thread, re-kinked every few frames
  const [ax, ay] = wfS(z.x0, z.y0, 12), [bx, by] = wfS(z.x1, z.y1, 12), r = wfR(Math.floor((z.seed || 0) * 13 + G.time * 30)), pts = [[ax, ay]];
  const n = z.rope ? 1 : 5; for (let i = 1; i < n; i++) { const u = i / n; pts.push([ax + (bx - ax) * u + (r() - 0.5) * 7, ay + (by - ay) * u + (r() - 0.5) * 5]); }
  pts.push([bx, by]); wfThread(pts, Math.min(1, z.t / 0.08), { fray: 0, hot: 5 }); wfCore(bx, by, 1, 1);
}
function wfDrawTotem(t) {   // the Soul Lantern: an iron needle-spire driven into the ground with a caged soul at its head
  const [sx, sy] = wfS(t.x, t.y, 0), age = wfAge(t), drop = age < 0.12 ? (1 - age / 0.12) * 30 : 0, fl = t.life < 2 && Math.floor(G.time * 8) % 2, X = Math.round(sx), Y = Math.round(sy - drop);
  ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(X - 4, Math.round(sy), 9, 2);
  for (let j = 0; j < 26; j++) { wfPx(X, Y - j, j % 6 === 0 ? '#7a7e88' : '#28293d'); wfPx(X + 1, Y - j, '#141528'); }
  for (const [j, w] of [[8, 3], [16, 2]]) { wfLine(X - w, Y - j, X + w + 1, Y - j, '#474b5b'); wfPx(X - w, Y - j, '#9a9ea8'); }
  for (let j = 26; j < 31; j++) wfPx(X, Y - j, j === 30 ? '#e8e4d8' : '#5e6270');   // the needle point
  const cy = Y - 21; for (let j = -3; j <= 3; j++) { wfPx(X - 3, cy + j, '#474b5b'); wfPx(X + 4, cy + j, '#28293d'); }   // the cage
  if (!fl) wfCore(X + 0.5, cy, 2, 1, '150,210,255');
  if (drop > 0) { ctx.globalAlpha = 0.6; ctx.fillStyle = WF_T[4]; ctx.fillRect(X, Y - 30 - 12, 1, 12); ctx.globalAlpha = 1; }
  if (age > 0.12 && age < 0.3) wfDrawFx({ k: 'ring', x: t.x, y: t.y, R: 2.5, t0: G.time - (age - 0.12), dur: 0.18 });
  for (const w of t.wisps) { const [wx, wy] = wfS(w.x, w.y, w.z); wfCore(wx, wy, 0, 1); if (w.beam) w.beam.segs.forEach((sg, i) => { const [a1, b1] = wfS(sg[0], sg[1], i ? 10 : w.z), [a2, b2] = wfS(sg[2], sg[3], 8); wfThread([[a1, b1], [a2, b2]], 1 - 0.6 * w.beam.t / w.beam.dur, { fray: 0, hot: 5 }); }); }
}
function wfDrawPhantom(ph) {   // a shed afterimage of the Weaver, unravelling
  const fr = heroFrame('animancer', 'walk', 2, 'front'), q = iso(ph.x, ph.y), f = ph.face || 1, a = 0.25 + 0.35 * (1 - ph.t / 0.8);
  const s = fr._wfSil || (fr._wfSil = fr.tint(fr.c, '#8fcaf0')), sf = fr._wfSilF || (fr._wfSilF = fr.tint(fr.f, '#8fcaf0'));
  ctx.globalAlpha = a; ctx.drawImage(f < 0 ? sf : s, Math.round(q.sx - (f < 0 ? fr.w - fr.ox : fr.ox)), Math.round(q.sy + 3 - (fr.oy + 1)), fr.w, fr.h); ctx.globalAlpha = 1;
  for (let i = 0; i < 3; i++) { const x = q.sx - 3 + i * 3, pts = []; for (let s2 = 0; s2 < 6; s2++) pts.push([x + Math.sin(s2 + G.time * 6 + i) * 1.5, q.sy - 30 - s2 * 3 * (1 - ph.t / 0.8)]); wfThread(pts.reverse(), a, { fray: 0.6, seed: i, hot: 4 }); }
}
function wfDrawWhip(w) {
  if (!w.pts) return; const a = 1 - Math.max(0, (w.t - w.dur) / 0.12), pts = w.pts.map((p, i) => wfS(p.x, p.y, 9 - i * 0.5));
  wfThread(pts, a, { fray: 0, hot: 5 }); const e = pts[pts.length - 1]; wfCore(e[0], e[1], 1, a);
}

// ------------------------------------------------------------------- listing them in the world pass
{
  const KEYS = ['orbs', 'shards', 'storms', 'leashes', 'marks', 'words', 'totems', 'phantoms', 'zaps', 'adarts', 'acracks', 'aspikes', 'aglass', 'agshots', 'aglints', 'anvils', 'whips', 'strails2', 'pulses', 'gbeams'];
  const _render = render;
  render = function () {
    if (!wfIs()) return _render();
    const st = { souls, wisps: P.wisps, great: G.great, lance: P.lance, tether: G.tether, pillars: G.pillars };
    for (const k of KEYS) st[k] = G[k];
    WF.st = st;
    st.parts = parts; st.rings = parts.filter(q => q.ring); parts = parts.filter(q => !q.ring);
    souls = []; P.wisps = []; G.great = null; P.lance = null; G.tether = null; G.pillars = st.pillars.filter(p => p.bone);
    for (const k of KEYS) if (Array.isArray(G[k])) G[k] = [];
    try { _render(); }
    finally { parts = st.parts; souls = st.souls; P.wisps = st.wisps; G.great = st.great; P.lance = st.lance; G.tether = st.tether; G.pillars = st.pillars; for (const k of KEYS) G[k] = st[k]; WF.st = null; }
  };
  const on = (x, y) => typeof onScreen !== 'function' || onScreen(x, y, 80);
  const _ar = arcanaRender;
  arcanaRender = function (list) {
    _ar(list);
    const S = WF.st; if (!S) return;
    WF.busy = (S.adarts || []).length + (S.wisps || []).filter(w => w.dart).length;
    for (const pl of S.pillars) if (!pl.bone && on(pl.x, pl.y)) list.push({ d: pl.x + pl.y, f: () => wfDrawMirror(pl) });
    for (const c of S.acracks || []) if (on(c.x, c.y)) list.push({ d: c.x + c.y - 0.55, f: () => wfDrawCrack(c) });
    for (const s of S.aspikes || []) if (on(s.x, s.y)) list.push({ d: s.x + s.y + 0.02, f: () => wfDrawSpike(s) });
    for (const g of S.aglass || []) list.push({ d: g.x + g.y + (g.z > 0 ? 0.05 : -0.5), f: () => wfDrawGlass(g) });
    for (const s of S.agshots || []) list.push({ d: s.x + s.y + 0.1, f: () => wfDrawGlassShot(s) });
    for (const a of S.anvils || []) list.push({ d: a.x + a.y, f: () => wfDrawAnvil(a) });
    for (const m of S.marks || []) list.push({ d: m.x + m.y - 0.7, f: () => wfDrawMark(m) });
    for (const w of S.words || []) if (w.t >= 0) list.push({ d: w.x + w.y - 0.6, f: () => wfDrawWord(w) });
    for (const t of S.totems || []) list.push({ d: t.x + t.y, f: () => wfDrawTotem(t) });
    for (const ph of S.phantoms || []) list.push({ d: ph.x + ph.y, f: () => wfDrawPhantom(ph) });
    for (const st of S.storms || []) list.push({ d: st.x + st.y, f: () => wfDrawStorm(st) });
    for (const o of S.orbs || []) list.push({ d: o.x + o.y + 0.03, f: () => wfDrawOrb(o) });
    for (const s of S.shards || []) list.push({ d: s.x + s.y + 0.05, f: () => wfDrawShard(s) });
    for (const s of S.souls || []) list.push({ d: s.x + s.y + 0.02, f: () => wfDrawSoul(s) });
    if (!P.dead) for (const w of S.wisps || []) list.push({ d: w.x + w.y + 0.01, f: () => wfDrawWisp(w) });
    if (S.great) { const gw = S.great; list.push({ d: gw.x + gw.y + 0.02, f: () => wfDrawGreat(gw) }); }
    for (const d of S.adarts || []) list.push({ d: d.x + d.y + 0.2, f: () => wfDrawDart(d) });
    for (const L of S.leashes || []) list.push({ d: 1e5 - 3, f: () => wfDrawLeash(L) });
    for (const z of S.zaps || []) list.push({ d: 1e5 - 2, f: () => wfDrawZap(z) });
    for (const w of S.whips || []) list.push({ d: 1e5 - 2, f: () => wfDrawWhip(w) });
    if (S.tether) { const T = S.tether, k = Math.min(1, T.life); list.push({ d: 1e5 - 2, f: () => { const [ax, ay] = wfS(P.x, P.y, 14); for (const o of tetherLinks()) { const [bx, by] = wfS(o.x, o.y, 12); wfThread([[bx, by], [(ax + bx) / 2, (ay + by) / 2 + 4], [ax, ay]], k, { fray: 0, hot: 5 }); wfCore(bx + (ax - bx) * ((G.time * 1.5) % 1), by + (ay - by) * ((G.time * 1.5) % 1), 0, k); } } }); }
    for (const g of S.strails2 || []) list.push({ d: -1e4, f: () => { const [ax, ay] = wfS(g.x0, g.y0, 2), [bx, by] = wfS(g.x1, g.y1, 2); wfThread([[ax, ay], [bx, by]], 0.5 * Math.min(1, g.t), { fray: 0.2, hot: 3 }); } });
    for (const pu of S.pulses || []) list.push({ d: 1e5 - 2, f: () => { const k = pu.t / pu.max; wfThread(pu.pts.map(p => wfS(p[0], p[1], p[2])), Math.min(1, k * 1.6), { fray: 0.2, hot: 5 }); } });
    if (S.lance) list.push({ d: 1e5 - 2, f: () => S.lance.segs.forEach((sg, i) => { const [ax, ay] = wfS(sg[0], sg[1], i ? 10 : 11), [bx, by] = wfS(sg[2], sg[3], 10); wfThread([[ax, ay], [bx, by]], 1, { fray: 0, hot: 5 }); wfCore(bx, by, 1, 1); }) });
    for (const g of S.aglints || []) list.push({ d: 1e5, f: () => wfDrawGlint(g) });
    for (const gb of S.gbeams || []) list.push({ d: 1e5 - 2, f: () => { const [ax, ay] = wfS(gb.x0, gb.y0, 16), [bx, by] = wfS(gb.x1, gb.y1, 8); wfThread([[ax, ay], [(ax + bx) / 2, (ay + by) / 2 - 3], [bx, by]], Math.min(1, gb.t / 0.12), { fray: 0, hot: 5 }); wfCore(bx, by, 1, gb.t / 0.22); } });
    for (const r of S.rings || []) list.push({ d: -1e4, f: () => { const [sx, sy] = wfS(r.x, r.y, 0), a = Math.min(1, r.t * 3), n = Math.max(16, Math.round(r.r * ISO_R * 5.2)); for (let i = 0; i < n; i++) { const t = i / n * 6.28; wfPx(sx + Math.cos(t) * r.r * ISO_R, sy + Math.sin(t) * r.r * ISO_RY, i % 2 ? WF_T[4] : WF_T[2], a); } } });
    WF.threads = WF.threads.filter(T => G.time - T.t0 < T.dur);
    for (const T of WF.threads) list.push({ d: 1e5 - 1, f: () => wfDrawThread(T) });
    WF.fx = WF.fx.filter(f => G.time - f.t0 < f.dur);
    for (const f of WF.fx) list.push({ d: f.k === 'ring' ? -1e4 : 1e5 + 1, f: () => wfDrawFx(f) });
  };
  // the light they give: pale soul-light pools under the cores and along the threads
  const _l14 = light14;
  light14 = function () {
    _l14();
    const S = WF.st; if (!S) return;
    const L = (x, y, z, r, a) => { const [sx, sy] = wfS(x, y, z); lightHole(sx, sy, r, a); };
    for (const w of S.wisps || []) L(w.x, w.y, w.z, 12, 0.35);
    for (const d of S.adarts || []) L(d.x, d.y, d.z, d.small ? 10 : 18, 0.5);
    for (const o of S.orbs || []) L(o.x, o.y, 10, 30, 0.8);
    for (const s of S.souls || []) L(s.x, s.y, 6, 14, 0.5);
    for (const t of S.totems || []) L(t.x, t.y, 18, 60, 0.9);
    for (const st of S.storms || []) L(st.x, st.y, 6, 36, 0.6);
    for (const Ls of S.leashes || []) for (let i = 2; i < Ls.pts.length; i += 4) L(Ls.pts[i].x, Ls.pts[i].y, Ls.pts[i].z, 14, 0.45);
    if (S.great) L(S.great.x, S.great.y, S.great.z, 30 + S.great.size * 3, 0.9);
    for (const g of S.aglints || []) L(g.x, g.y, g.z, 12, 0.4 * g.t / g.max);
  };
}
// wraith form: threads unravel off the Weaver while the body goes thin
{
  const _dh = drawHero;
  drawHero = function (s, x, y, face, flash, alpha, lift, k) {
    const r = _dh(s, x, y, face, flash, alpha, lift, k);
    if (wfIs() && P.wraith && !P.dead) {
      const q = iso(x, y);
      for (let i = 0; i < 5; i++) { const bx = q.sx - 6 + i * 3, by = q.sy - 14 - (i % 2) * 10 - lift, pts = []; for (let s2 = 0; s2 < 7; s2++) pts.push([bx - s2 * 2 * (face || 1) + Math.sin(G.time * 8 + i + s2) * 1.2, by - s2 * 1.5]); wfThread(pts.reverse(), 0.8, { fray: 0.6, seed: i, hot: 4 }); }
    }
    return r;
  };
}
window.__wf = { WF, fx: (o) => wfAddFx(o) };

// the test hooks read heroFrame through window.__spm, which was filled before this file ran: point it at the live chain
if (window.__spm) window.__spm.heroFrame = (...a) => heroFrame(...a);
// warm the frame cache off the hot path: the first frames pay for the painter's warm-up (a few hundred ms), so a few
// are painted as the page loads, and the rest one at a time in the background (slower while a game is running)
{
  const WV_WARM = [];
  for (const v of ['front', 'side', 'back', 'down', 'up']) for (const po of ['idle', 'walk', 'atk', 'cast']) {
    if ((v === 'down' || v === 'up') && (po === 'atk' || po === 'cast')) continue;
    for (let i = 0; i < WV_PH[po]; i++) WV_WARM.push([po, i, v]);
  }
  const g0 = () => { const g = heroGear(); return { tier: g.tier, head: g.head, key: g.tier + '|' + (g.head ? 'h' : '-') }; };
  try { const g = g0(); for (const [po, i] of [['idle', 0], ['walk', 0], ['atk', 1], ['cast', 2]]) wvFrame(po, i, 'front', g); } catch (e) { }
  let wi = 0, wkey = '';
  const step = () => {
    try {
      const g = g0(); if (g.key !== wkey) { wkey = g.key; wi = 0; }
      if (wi < WV_WARM.length && (!G.running || P.cls === 'animancer')) { const [po, i, v] = WV_WARM[wi++]; wvFrame(po, i, v, g); }
    } catch (e) { wi = WV_WARM.length; }
    setTimeout(step, G.running ? 160 : 40);
  };
  setTimeout(step, 400);
}
