
// =================================================================== v0.22: pixel art the way pixel artists paint it
// Every body is built from parts (a plate, a limb, a face, a fold of cloth). Each part is rasterised to a crisp
// mask with no soft edges, then shaded in flat clusters from a single light in the upper left: a band of shadow
// along the edges that face away from it, a lit rim along the edges that face it, a highlight where both lit
// edges meet. Where a part lies over another, a dark contour line separates them. Colours come from small
// hand-picked material ramps (deep, shadow, base, light, highlight), hue-shifted: cool in shadow, warm in light.
// Coordinates are art pixels (two to a world pixel), measured from the feet: x forward, y up (negative).
const MAT = {};
function defMat(name, deep, shadow, base, light, hi) { MAT[name] = [deep, shadow, base, light, hi || light]; return MAT[name]; }
// the palette, pulled toward the references: muted, dark, rust and steel and old leather
defMat('skinPale', '#2a1a1c', '#6e4a44', '#a87a66', '#d8ac8e', '#f0d2b4');
defMat('skinDead', '#161a1e', '#3a4440', '#66706a', '#96a092', '#c4c8b2');
defMat('skinGrave', '#1a1418', '#4a3c40', '#7a6a66', '#a8988a', '#d0c4b0');
defMat('bone', '#2a2620', '#6a6250', '#a89c80', '#d8ceb0', '#f6f0dc');
defMat('boneOld', '#221e18', '#5a5040', '#8e8266', '#bcae8e', '#e0d6bc');
defMat('steel', '#101218', '#2a3040', '#4a5468', '#7c889c', '#c4ccd8');
defMat('steelDark', '#0a0b10', '#1c2028', '#30363f', '#525a66', '#8a94a2');
defMat('rust', '#1a0c08', '#4a2214', '#7a3e22', '#a8643a', '#d09058');
defMat('leather', '#140c08', '#2e1c12', '#4e3020', '#74492e', '#9a6a44');
defMat('leatherRed', '#16080a', '#3a1414', '#5e2220', '#86362c', '#a8503c');
defMat('clothRed', '#12060a', '#361018', '#5a1a22', '#842a2e', '#a84038');
defMat('clothDark', '#08080c', '#16161e', '#262634', '#3a3a4c', '#525266');
defMat('clothBrown', '#0e0a08', '#241a12', '#3c2c1e', '#5a442c', '#78603e');
defMat('clothGreen', '#0a0e0a', '#1a2418', '#2c3a26', '#445636', '#5e724a');
defMat('clothBone', '#28241e', '#5a544a', '#8a8272', '#b8ae98', '#dcd4c0');
defMat('clothTeal', '#081014', '#142428', '#223a3e', '#34565a', '#4c7474');
defMat('hair', '#0a080a', '#1a1414', '#2a2020', '#3e3030', '#584444');
defMat('gold', '#2a1a06', '#6a4410', '#a8741e', '#d8a83a', '#fff0a0');
defMat('bronze', '#1a0e06', '#4a2a10', '#7a4a1e', '#b07a36', '#e8c078');
defMat('verdigris', '#0c1a16', '#1e3a30', '#346050', '#5a8a72', '#8ab89c');
defMat('meat', '#1a0406', '#4a0c10', '#7e1a1c', '#b8342c', '#e8705a');
defMat('meatPale', '#2a1216', '#6a3036', '#a05a58', '#cc8a80', '#eab8a8');
defMat('gut', '#1a0a0e', '#4a1e28', '#7a3a44', '#a86068', '#d0949a');
defMat('char', '#050404', '#140e0c', '#241a16', '#3a2a22', '#56402e');
defMat('ember', '#4a0e04', '#a02a08', '#e0601a', '#ffa040', '#fff0b0');
defMat('wood', '#120a06', '#2e1c10', '#4a3020', '#6a4a30', '#8a6844');
defMat('stone', '#121014', '#2e2a30', '#4a4448', '#6e6668', '#9a908c');
defMat('moss', '#0c120a', '#1c2a16', '#2e4222', '#465e30', '#62783e');
defMat('wax', '#2a2018', '#6a5646', '#a88c74', '#d6bca0', '#f4e4cc');
defMat('porcelain', '#3a3844', '#7a7684', '#b4b0bc', '#e0dce4', '#ffffff');
defMat('mothFur', '#1a140e', '#3e3222', '#6a5a40', '#9a8864', '#c8b88e');
defMat('mothWing', '#1a1812', '#3a3428', '#62584a', '#8e8270', '#b8ac94');
defMat('ghost', 'rgba(20,18,30,0.9)', 'rgba(52,50,72,0.85)', 'rgba(92,92,120,0.8)', 'rgba(140,142,170,0.75)', 'rgba(200,204,228,0.7)');
defMat('shadowCloth', '#030305', '#08070c', '#110f18', '#1c1926', '#2a2636');

// v0.22b: frames are painted at the canvas density (4 pixels to a world pixel on desktop), and every part is lit as
// a form: its distance-to-edge becomes a height (round, bevelled or flat), the height gives a surface normal, the
// normal is lit from the upper left and the light is laid down in nine hue-shifted tones with an ordered dither
// only where one tone gives way to the next. Metal gets a specular glint; every part keeps a crisp lit edge on top
// and a dark one underneath, so it still reads as hand-placed pixels.
const PX_DEN = 2;   // v0.22d: two art pixels to a world pixel, whatever the screen: the user's choice
const RAMP9 = {};
function ramp9(key) {
  if (RAMP9[key]) return RAMP9[key];
  const R = MAT[key]; if (!R) return (RAMP9[key] = Array(9).fill(key));
  const mid = (a, b) => (a[0] === '#' && b[0] === '#') ? mixHex(a, b, 0.5) : a;
  return (RAMP9[key] = [R[0], mid(R[0], R[1]), R[1], mid(R[1], R[2]), R[2], mid(R[2], R[3]), R[3], mid(R[3], R[4]), R[4]]);
}
const LV = (() => { const v = [-0.52, -0.68, 0.52], l = Math.hypot(...v); return v.map(q => q / l); })();
function pxFrame(W16, H16, draw, K = 1) {
  const DEN = window.__pxDen || PX_DEN, U = K * DEN / 2;                                  // physical pixels per painter unit
  const W2 = W16 * DEN, H2 = H16 * DEN, c2 = mkCanvas(W2, H2), x = c2.getContext('2d', { willReadFrequently: true });
  const img = x.createImageData(W2, H2), D = img.data, own = new Int16Array(W2 * H2).fill(-1);
  const ox = W16 * DEN / 2, oy = H2 - 2 * DEN; let partId = 0;
  const hex = {}; const rgba = c => { if (hex[c]) return hex[c]; let r = 0, g = 0, b = 0, a = 255; if (c[0] === '#') { [r, g, b] = hexRgb(c); } else { const m = c.match(/[\d.]+/g).map(Number); [r, g, b] = m; a = m[3] != null ? Math.round(m[3] * 255) : 255; } return (hex[c] = [r, g, b, a]); };
  const set = (X, Y, c, id) => { if (X < 0 || Y < 0 || X >= W2 || Y >= H2 || !c) return; if (MAT[c]) c = MAT[c][2]; const o = (Y * W2 + X) * 4, [r, g, b, a] = rgba(c); if (a < 255 && D[o + 3]) { const k = a / 255; D[o] = D[o] * (1 - k) + r * k; D[o + 1] = D[o + 1] * (1 - k) + g * k; D[o + 2] = D[o + 2] * (1 - k) + b * k; D[o + 3] = Math.max(D[o + 3], a); } else { D[o] = r; D[o + 1] = g; D[o + 2] = b; D[o + 3] = a; } if (id != null) own[Y * W2 + X] = id; };
  const mk = mkCanvas(W2, H2), mx = mk.getContext('2d', { willReadFrequently: true });
  let bx0 = 0, by0 = 0, bx1 = 0, by1 = 0;
  const mask = (pathFn) => { mx.clearRect(0, 0, W2, H2); mx.fillStyle = '#fff'; mx.beginPath(); pathFn(mx); mx.fill(); const d = mx.getImageData(0, 0, W2, H2).data, M = new Uint8Array(W2 * H2); let any = false; bx0 = W2; by0 = H2; bx1 = 0; by1 = 0; for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) if (d[(j * W2 + i) * 4 + 3] > 110) { M[j * W2 + i] = 1; any = true; if (i < bx0) bx0 = i; if (i > bx1) bx1 = i; if (j < by0) by0 = j; if (j > by1) by1 = j; } return any ? M : null; };
  const X = v => ox + v * U, Y = v => oy + v * U;
  const Dm = new Float32Array(W2 * H2);
  const shadePart = (M, mat, o = {}) => {
    if (!o.form && !o.paint && !o.cel) o = { ...o, cel: true };   // v0.22d: flat cel bands by default, never the rounded look
    const key = typeof mat === 'string' ? mat : null, R9 = key && MAT[key] ? ramp9(key) : (Array.isArray(mat) ? mat : Array(9).fill(mat)), id = partId++, N = R9.length;
    const at = (i, j) => i >= 0 && j >= 0 && i < W2 && j < H2 && M[j * W2 + i];
    const i0 = Math.max(0, bx0 - 1), i1 = Math.min(W2 - 1, bx1 + 1), j0 = Math.max(0, by0 - 1), j1 = Math.min(H2 - 1, by1 + 1);
    // distance to the edge (chamfer)
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) Dm[j * W2 + i] = M[j * W2 + i] ? 1e4 : 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const k = j * W2 + i; if (!M[k]) continue; let v = Dm[k]; if (i > 0) v = Math.min(v, Dm[k - 1] + 1); if (j > 0) { v = Math.min(v, Dm[k - W2] + 1); if (i > 0) v = Math.min(v, Dm[k - W2 - 1] + 1.414); if (i < W2 - 1) v = Math.min(v, Dm[k - W2 + 1] + 1.414); } Dm[k] = v; }
    for (let j = j1; j >= j0; j--) for (let i = i1; i >= i0; i--) { const k = j * W2 + i; if (!M[k]) continue; let v = Dm[k]; if (i < W2 - 1) v = Math.min(v, Dm[k + 1] + 1); if (j < H2 - 1) { v = Math.min(v, Dm[k + W2] + 1); if (i < W2 - 1) v = Math.min(v, Dm[k + W2 + 1] + 1.414); if (i > 0) v = Math.min(v, Dm[k + W2 - 1] + 1.414); } Dm[k] = v; }
    let maxd = 1; for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (Dm[j * W2 + i] > maxd) maxd = Dm[j * W2 + i];
    const prof = o.flat ? 'flat' : o.bevel ? 'bevel' : 'round', Rr = o.round ? o.round * U : Math.min(maxd, 7 * U), bw = (o.bevel || 1.5) * U;
    const H = d => prof === 'flat' ? 0 : prof === 'bevel' ? Math.min(d, bw) : Rr * Math.sqrt(Math.max(0, 1 - Math.pow(1 - Math.min(d, Rr) / Rr, 2)));
    const hAt = (i, j) => at(i, j) ? H(Dm[j * W2 + i]) : 0;
    const dith = o.clean ? 0 : o.dither != null ? o.dither : 0.55, amb = o.amb != null ? o.amb : 0.16, toneK = (o.tone || 0) * 0.11;
    // CEL shading (the default): flat bands laid by hand, no gradients. Shadow collects along the edges that face
    // away from the light, deepest right at the edge; a lit band runs along the edges that face it, with the single
    // brightest pixels where the top and the left meet; everything else is the local colour. Big parts get a
    // second, softer core shadow further in. Only that core line is dithered, and only in a checker.
    // PAINT (the default): the light follows the form like the form shading, but it is laid down in a few flat
    // clusters of colour, as a hi-bit pixel artist would (no gradients, no dither), then single stray pixels are
    // folded into their neighbours so every cluster reads cleanly.
    if (!o.form && !o.cel) {
      const toneI = (o.tone || 0) * 0.12 + (o.lit || 0);
      const lev = new Int8Array((i1 - i0 + 1) * (j1 - j0 + 1)), LW = i1 - i0 + 1, Lk = (i, j) => (j - j0) * LW + (i - i0);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        if (!M[j * W2 + i]) continue;
        let v = 0.5;
        if (!o.flat) { const gx = hAt(i + 1, j) - hAt(i - 1, j), gy = hAt(i, j + 1) - hAt(i, j - 1), nl = Math.hypot(gx, gy, 2), dp = (-gx * LV[0] - gy * LV[1] + 2 * LV[2]) / nl; v = 0.4 + 0.95 * (dp - LV[2]) + (o.key ? o.key : 0); if (o.metal) { const rz = 2 * Math.max(0, dp) * (2 / nl) - LV[2]; if (rz > 0.94) v = 1.2; } }
        v += toneI;
        lev[Lk(i, j)] = v > 1.1 ? 5 : v > 0.82 ? 4 : v > 0.6 ? 3 : v > 0.38 ? 2 : v > 0.14 ? 1 : 0;
      }
      // clean up: a pixel alone in its level takes the level most of its neighbours have
      for (let pass = 0; pass < 2; pass++) for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        if (!M[j * W2 + i]) continue; const me = lev[Lk(i, j)]; let same = 0; const cnt = [0, 0, 0, 0, 0, 0];
        for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const ii = i + di, jj = j + dj; if (ii < i0 || jj < j0 || ii > i1 || jj > j1 || !M[jj * W2 + ii]) continue; const l = lev[Lk(ii, jj)]; cnt[l]++; if (l === me) same++; }
        if (same === 0) { let b = me, bc = 0; for (let l = 0; l < 6; l++) if (cnt[l] > bc) { bc = cnt[l]; b = l; } lev[Lk(i, j)] = b; }
      }
      const MAPI = [0, 2, 4, 6, 7, 8];
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        if (!M[j * W2 + i]) continue;
        let idx = MAPI[lev[Lk(i, j)]];
        // the edge that faces the light gets one clean bright pixel line; the far edge one dark line
        const eT = !at(i, j - 1), eL = !at(i - 1, j), eB = !at(i, j + 1), eR = !at(i + 1, j);
        if (o.edge !== false && !o.flat) { if ((eT || eL) && idx < 8) idx = Math.min(8, idx + 2); else if ((eB || eR) && idx > 0) idx = Math.max(0, idx - 2); }
        idx = Math.round(idx * (N - 1) / 8);
        let col = lev[Lk(i, j)] === 5 && o.metal ? '#ffffff' : R9[idx];
        if (o.contour !== false) { const o2 = own[j * W2 + i]; if (o2 >= 0 && o2 !== id && (eT || eL || eB || eR)) col = R9[0]; }
        set(i, j, col, id);
      }
      return;
    }
    if (!o.form) {
      const lx = -1, ly = -1, sw = Math.max(1, Math.round((o.sh != null ? o.sh : 1.4) * U)), lw = Math.max(1, Math.round((o.hl != null ? o.hl : 0.9) * U)), cw = o.core ? Math.round(o.core * U) : (maxd > 5 * U ? Math.round(1.2 * U) : 0);
      const toneI = Math.round((o.tone || 0) * 1.2 + (o.lit || 0) * 8);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        if (!M[j * W2 + i]) continue;
        let idx = 4;
        if (!o.flat) {
          let dk = 0; for (let k = 1; k <= sw + cw; k++) if (!at(i - lx * k, j - ly * k)) { dk = k; break; }
          if (dk) idx = dk === 1 ? 1 : dk <= sw ? 2 : (o.dither && ((i + j) & 1) ? 4 : 3);   // flat clusters, no checker unless asked
          else { let lk = 0; for (let k = 1; k <= lw; k++) if (!at(i + lx * k, j + ly * k)) { lk = k; break; } if (lk) idx = lk === 1 && !at(i + lx, j) && !at(i, j + ly) && o.hi !== false ? 8 : lk === 1 ? 7 : 6; }
        }
        idx = Math.max(0, Math.min(N - 1, Math.round((idx + toneI) * (N - 1) / 8)));
        let col = R9[idx];
        if (o.contour !== false) { const o2 = own[j * W2 + i]; if (o2 >= 0 && o2 !== id && (!at(i, j - 1) || !at(i - 1, j) || !at(i, j + 1) || !at(i + 1, j))) col = R9[0]; }
        set(i, j, col, id);
      }
      return;
    }
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      if (!M[j * W2 + i]) continue;
      let v;
      if (prof === 'flat') v = 0.55;
      else {
        const gx = hAt(i + 1, j) - hAt(i - 1, j), gy = hAt(i, j + 1) - hAt(i, j - 1), nz = 2, nl = Math.hypot(gx, gy, nz);
        const nx = -gx / nl, ny = -gy / nl, nzz = nz / nl, dp = nx * LV[0] + ny * LV[1] + nzz * LV[2], lam = Math.max(0, dp);
        v = 0.46 + 0.62 * (dp - LV[2]) + amb * 0;
        if (o.metal) { const rz = 2 * lam * nzz - LV[2]; if (rz > 0.93) v = 1.15; else if (rz < 0.2) v *= 0.8; }
        // a cool bounce of light on the lower right edge, as from the ground
        if (Dm[j * W2 + i] < 1.5 * U && nx > 0.35 && ny > 0.1) v += 0.07;
      }
      v += toneK + (o.lit || 0);
      // crisp pixel-art edges: lit on top/left, dark underneath/right
      const eT = !at(i, j - 1), eL = !at(i - 1, j), eB = !at(i, j + 1), eR = !at(i + 1, j);
      if (!o.flat && (eT || eL) && o.edge !== false) v += 0.12; else if ((eB || eR) && o.edge !== false) v -= 0.12;
      let idx = v * (N - 1) + (BAYER4[(j & 3) * 4 + (i & 3)] - 0.5) * dith;
      idx = Math.max(0, Math.min(N - 1, Math.round(idx)));
      let col = v > 1.1 && o.metal ? '#ffffff' : R9[idx];
      if (o.contour !== false) { const o2 = own[j * W2 + i]; if (o2 >= 0 && o2 !== id && (eT || eL || eB || eR)) col = R9[0]; }
      set(i, j, col, id);
    }
  };
  const unit = Math.max(1, Math.round(U));
  const A = {
    W2, H2, U,
    poly(pts, mat, o) { const M = mask(c => { pts.forEach(([a, b], k) => k ? c.lineTo(X(a), Y(b)) : c.moveTo(X(a), Y(b))); c.closePath(); }); if (M) shadePart(M, mat, o); },
    ell(cx, cy, rx, ry, mat, o) { const M = mask(c => c.ellipse(X(cx), Y(cy), Math.max(0.5, rx * U), Math.max(0.5, ry * U), (o && o.rot) || 0, 0, 6.2832)); if (M) shadePart(M, mat, o); },
    limb(pts, r0, r1, mat, o) { const M = mask(c => { const n = pts.length; for (let k = 0; k < n; k++) { const r = (r0 + (r1 - r0) * (k / Math.max(1, n - 1))) * U; c.beginPath(); c.arc(X(pts[k][0]), Y(pts[k][1]), r, 0, 6.2832); c.fill(); } for (let k = 1; k < n; k++) { const [a0, b0] = pts[k - 1], [a1, b1] = pts[k], ra = (r0 + (r1 - r0) * ((k - 1) / Math.max(1, n - 1))) * U, rb = (r0 + (r1 - r0) * (k / Math.max(1, n - 1))) * U, ang = Math.atan2(b1 - b0, a1 - a0) + Math.PI / 2, ca = Math.cos(ang), sa = Math.sin(ang); c.beginPath(); c.moveTo(X(a0) + ca * ra, Y(b0) + sa * ra); c.lineTo(X(a1) + ca * rb, Y(b1) + sa * rb); c.lineTo(X(a1) - ca * rb, Y(b1) - sa * rb); c.lineTo(X(a0) - ca * ra, Y(b0) - sa * ra); c.closePath(); c.fill(); } c.beginPath(); }); if (M) shadePart(M, mat, o); },
    shape(fn, mat, o) { const M = mask(c => fn(c, X, Y, U)); if (M) shadePart(M, mat, o); },
    // flat detail: px/line/rect are one painter unit wide; fine()/hair() are single physical pixels
    px(a, b, c) { const X0 = Math.round(X(a)), Y0 = Math.round(Y(b)); for (let j = 0; j < unit; j++) for (let i = 0; i < unit; i++) set(X0 + i, Y0 + j, c); },
    fine(a, b, c) { set(Math.round(X(a)), Math.round(Y(b)), c); },
    line(a0, b0, a1, b1, c, w = 1) { const s = Math.max(1, Math.round(w * unit)), n = Math.max(1, Math.ceil(Math.max(Math.abs(a1 - a0), Math.abs(b1 - b0)) * U)); for (let i = 0; i <= n; i++) { const u = i / n, xx = Math.round(X(a0 + (a1 - a0) * u)), yy = Math.round(Y(b0 + (b1 - b0) * u)); for (let p = 0; p < s; p++) for (let q = 0; q < s; q++) set(xx + p, yy + q, c); } },
    hair(a0, b0, a1, b1, c) { const n = Math.max(1, Math.ceil(Math.max(Math.abs(a1 - a0), Math.abs(b1 - b0)) * U)); for (let i = 0; i <= n; i++) { const u = i / n; set(Math.round(X(a0 + (a1 - a0) * u)), Math.round(Y(b0 + (b1 - b0) * u)), c); } },
    rect(a, b, w, h, c) { const ww = Math.max(1, Math.round(w * U)), hh = Math.max(1, Math.round(h * U)); for (let j = 0; j < hh; j++) for (let i = 0; i < ww; i++) set(Math.round(X(a)) + i, Math.round(Y(b)) + j, c); },
    stud(a, b, mat) { const R = MAT[mat] || mat; A.fine(a, b, R[4]); A.fine(a + 1 / U, b, R[3]); A.fine(a, b + 1 / U, R[2]); A.fine(a + 1 / U, b + 1 / U, R[0]); },
    glow(a, b, c, core) { A.px(a, b, c); if (core) A.fine(a, b, core); },
    // scatter fine specks inside what is already painted (pores, grime, rust, stubble)
    speck(a, b, w, h, c, n, seed = 1) { for (let i = 0; i < n; i++) { const xx = Math.round(X(a + hash(i * 7 + seed, seed * 3) * w)), yy = Math.round(Y(b + hash(seed * 11, i * 5 + seed) * h)); if (xx >= 0 && yy >= 0 && xx < W2 && yy < H2 && D[(yy * W2 + xx) * 4 + 3]) set(xx, yy, c); } },
    at(a, b) { const XX = Math.round(X(a)), YY = Math.round(Y(b)); if (XX < 0 || YY < 0 || XX >= W2 || YY >= H2) return 0; return D[(YY * W2 + XX) * 4 + 3]; },
    mat: n => MAT[n], K,
    // light the painted figure from a source of its own: a flame in the hand, a wound, a lantern. Surfaces near it
    // warm toward its colour, and every edge that faces it catches a bright rim.
    lamp(a, b, rgb, r, k = 1) { lamps.push({ x: X(a), y: Y(b), c: rgb, r: r * U, k }); },
    // a thin cool rim of light on the edges facing away from the key light, as from the sky behind
    rim(rgb, k = 0.6) { rimL = { c: rgb, k }; }
  };
  const lamps = []; let rimL = null;
  draw(A);
  // the lights: rims first (on the silhouette and on part edges), then the warm spill
  if (lamps.length || rimL) {
    const S0 = new Uint8ClampedArray(D), op = (i, j) => i >= 0 && j >= 0 && i < W2 && j < H2 && S0[(j * W2 + i) * 4 + 3] > 40;
    const pid = (i, j) => own[j * W2 + i];
    for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) {
      const o = (j * W2 + i) * 4; if (S0[o + 3] <= 40) continue;
      let r = S0[o], g = S0[o + 1], b = S0[o + 2];
      for (const L of lamps) {
        const dx = L.x - i, dy = L.y - j, d = Math.hypot(dx, dy); if (d > L.r || d < 0.5) continue;
        const f = 1 - d / L.r, sx = Math.round(dx / d * 1.4), sy = Math.round(dy / d * 1.4);
        const edge = !op(i + sx, j + sy);
        const kk = (edge ? 0.6 * f : 0.28 * f * f) * L.k;
        r += (L.c[0] - r) * kk; g += (L.c[1] - g) * kk; b += (L.c[2] - b) * kk;
      }
      if (rimL && (!op(i + 1, j) || !op(i + 1, j + 1)) && op(i - 1, j)) { const k = rimL.k * 0.8; r += (rimL.c[0] - r) * k; g += (rimL.c[1] - g) * k; b += (rimL.c[2] - b) * k; }
      D[o] = r; D[o + 1] = g; D[o + 2] = b;
    }
  }
  // the silhouette: a one-pixel outline in the darkest shade of whatever it touches
  const S = new Uint8ClampedArray(D), a = (i, j) => i >= 0 && j >= 0 && i < W2 && j < H2 && S[(j * W2 + i) * 4 + 3] > 40;
  let minx = W2, miny = H2, maxx = 0, maxy = 0;
  for (let j = 0; j < H2; j++) for (let i = 0; i < W2; i++) {
    const o = (j * W2 + i) * 4;
    if (S[o + 3] > 40) { minx = Math.min(minx, i); maxx = Math.max(maxx, i); miny = Math.min(miny, j); maxy = Math.max(maxy, j); continue; }
    let n = -1, lit = false;
    if (a(i + 1, j)) { n = (j * W2 + i + 1) * 4; lit = true; } else if (a(i, j + 1)) { n = ((j + 1) * W2 + i) * 4; lit = true; } else if (a(i - 1, j)) n = (j * W2 + i - 1) * 4; else if (a(i, j - 1)) n = ((j - 1) * W2 + i) * 4;
    if (n < 0) continue;
    const k = lit ? 0.3 : 0.16;
    D[o] = S[n] * k + 4; D[o + 1] = S[n + 1] * k + 3; D[o + 2] = S[n + 2] * k + 8; D[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const f2 = mkCanvas(W2, H2), fx = f2.getContext('2d'); fx.translate(W2, 0); fx.scale(-1, 1); fx.drawImage(c2, 0, 0);
  const wht = src => { const q = mkCanvas(W2, H2), qx = q.getContext('2d'); qx.drawImage(src, 0, 0); qx.globalCompositeOperation = 'source-in'; qx.fillStyle = '#fff'; qx.fillRect(0, 0, W2, H2); return q; };
  const lo = hi => { const c = mkCanvas(W16, H16), cx = c.getContext('2d'); cx.imageSmoothingEnabled = false; cx.drawImage(hi, 0, 0, W16, H16); c._hr = hi; return c; };
  const bb = { x: Math.floor(Math.max(0, minx - 1) / DEN), y: Math.floor(Math.max(0, miny - 1) / DEN), w: Math.ceil((maxx - minx + 3) / DEN), h: Math.ceil((maxy - miny + 3) / DEN) };
  return { c: lo(c2), f: lo(f2), fl: lo(wht(c2)), flf: lo(wht(f2)), w: W16, h: H16, ox: Math.floor(W16 / 2), oy: H16 - 2, bb, hr: true };
}
// creatures painted this way; the frame cache prefers these over everything else
const MPX = {}, MPX_K = {}, MPX_WALK = {};
// the gait: a phase 0..1 through one full stride (two steps) and the curves a walking body follows
function gait(ph, n = 8) { const t = ph / n, a = t * 6.2832; return { t, a, swing: Math.sin(a), lift: Math.max(0, Math.sin(a + 1.5708)), liftF: Math.max(0, -Math.sin(a + 1.5708)), bob: -Math.abs(Math.cos(a)) , sway: Math.cos(a) }; }
{
  const _mf = monFrame;
  monFrame = function (type, palKey, pal, pose, ph) {
    if (!MPX[type]) return _mf(type, palKey, pal, pose, ph);
    const key = 'PX|' + type + '|' + palKey + '|' + pose + '|' + ph; let fr = ART16.cache[key]; if (fr) return fr;
    const [w, h] = MFRAME[type];
    fr = pxFrame(w, h, A => MPX[type](A, pose, ph, pal || {}), MPX_K[type] || 1);
    ART16.cache[key] = fr; return fr;
  };
}
// helpers for painters: recolour a material by a tint (for champions, uniques, drowned kin)
function tintMat(name, tint, k) { const R = MAT[name]; if (!R || !tint) return name; const key = name + '|' + tint + '|' + k; if (MAT[key]) return key; const T = hexRgb(tint), tl = (T[0] + T[1] + T[2]) / 3 || 1; MAT[key] = R.map(h => { if (h[0] !== '#') return h; const C = hexRgb(h), l = (C[0] + C[1] + C[2]) / 3; return rgbHex(C[0] + (T[0] * l / tl - C[0]) * k, C[1] + (T[1] * l / tl - C[1]) * k, C[2] + (T[2] * l / tl - C[2]) * k); }); return key; }
