// =================================================================== v0.34: THE KŪSHŌ drawn: sprite, world effects, HUD, icons, lamp
// H32.monk paints him natively in the 32-bit style on his own big frame (88x92, feet at 44,86): a towering dome of a
// man, a gilded Buddha fused with plate. A vast round belly plate and a breastplate of gold embossed with lotus and
// sutra, rounded gold pauldrons in two lames, gilt vambraces on tree-trunk arms, thick short legs; the robe's heavy
// cloth flowing under and around the plate (the sleeves, the collar he sinks into, the flared skirt), a patchwork kesa
// stole, strands of rosewood beads and lacquered ofuda hanging from his belt; and the mask: a golden face that laughs
// by day and weeps blood by night, with a ring of fire behind the head once he wears a body of any tier. His robe
// follows the sky: saffron gold at noon, through amber and umber at dusk, to black at midnight (five steps, so the
// frames cache), and the mask turns with it: the noon grin flattens through dusk into a wailing mouth, the brows climb
// in grief, and thick blood tears run from the shut eyes down the cheeks, first drops at dusk, to the jaw at midnight. His
// Weight shows in the body: light, he rides high and narrow with the hem lifted; heavy, he squats low and spreads wide.
const mkLerpHex = (a, b, t) => { const p = x => [parseInt(x.slice(1, 3), 16), parseInt(x.slice(3, 5), 16), parseInt(x.slice(5, 7), 16)]; const A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const MK_ROBE = [['#360c04', '#7a2406', '#bc4810', '#e47c2a', '#ffb050'], ['#030205', '#08060c', '#110d18', '#1d1727', '#2f2740']];
const MK_TRIM = [['#4a2a04', '#9a6410', '#dca030', '#ffd860', '#fffbd0'], ['#1e1406', '#46300c', '#8a6420', '#c09438', '#e8c870']];
const MK_GOLD = [['#3a2004', '#8a5010', '#d09428', '#f8d060', '#fffbe0'], ['#160e04', '#3a2808', '#7a5818', '#b08a30', '#e0c068']];
const MK_LIN = [['#3a0806', '#6e140e', '#a42618', '#d44a30', '#f07a50'], ['#0c0204', '#1c060a', '#34101a', '#4e1824', '#6e2430']];
for (let n = 0; n < 5; n++) {
  const t = Math.pow(n / 4, 0.85);
  pmat('mkRobe' + n, MK_ROBE[0].map((c, i) => mkLerpHex(c, MK_ROBE[1][i], t)));
  pmat('mkTrim' + n, MK_TRIM[0].map((c, i) => mkLerpHex(c, MK_TRIM[1][i], t)));
  pmat('mkLin' + n, MK_LIN[0].map((c, i) => mkLerpHex(c, MK_LIN[1][i], t)));
  pmat('mkGold' + n, MK_GOLD[0].map((c, i) => mkLerpHex(c, MK_GOLD[1][i], t)));
}
pmat('mkSkin', ['#2e1216', '#6a2a2c', '#b4644e', '#e0966e', '#fcc8a0']);
pmat('mkObs', ['#020104', '#0a0810', '#1a1526', '#342c4c', '#9a92c0']);
pmat('mkMask', ['#3a2204', '#8a5a0c', '#dca422', '#fad852', '#fffce4']);
pmat('mkBead', ['#0e0404', '#24090a', '#3e1410', '#6a2618', '#a8482a']);
pmat('mkLacq', ['#030203', '#0a0708', '#161012', '#261c1e', '#4a3a3a']);
pmat('mkStone', ['#1c1b1a', '#3c3a36', '#62605a', '#8e8b82', '#bcb8ac']);
pmat('mkHalo', ['#6a1a04', '#c04408', '#f89020', '#ffd848', '#fffcf0']);
pmat('mkWrap', ['#2a2620', '#5a5446', '#9a927c', '#cac2a8', '#eee8d4']);
// =================================================================== v0.36: the Kūshō in HD
// He is painted at twice the world grain (one screen pixel per pixel on a desktop) on his own frame, and drawn through
// the canvas's _hr twin. A big heavy man of real proportion (about 6.5 heads, 52 world px from sole to crown, broad and
// deep, not tall-and-thin and not a dome): a vast gilded body, bare from the throat to the sash like a temple Budai,
// the gold leaf worn to its red bole at the creases and crazed with fine cracks; gold silk robes open over it, heavy,
// hanging in long pleats to the ankles, great bell sleeves lined in madder; a mala of rosewood on his chest; a black
// lacquer sash with paper ofuda; and the mask: a polished gold face whose shut eyes laugh while carved tears run from
// them, grinning by day and wailing by night, when the carved tears run with blood. His silks follow the sky: at dusk
// the black climbs from the hem, at midnight he is gold only in the flesh.
// The painter below is his own: every part carries a surface normal (sphere, cylinder, pleated cloth), lit from the
// upper left and cut into hard 5-tone bands (never a smooth gradient); parts cast a short shadow down-right onto what
// lies under them; the silhouette takes a lit rim upper-left and a dark selective outline; materials carry texture
// in their own local coordinates (twill in the silk, craquelure and bole in the gilt, grain in the wood).
const MK_S = 0.88;   // (kept: the skill effects place their flames on the old scale)
const MKV = {};
const mkRGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
// v0.37: materials are hand-picked, hue-shifted ramps (shadows cooler and more saturated, toward violet or deep red;
// lights warmer, toward ochre): [core shadow, shadow, reflected / half-shadow, mid, light, highlight] and, for metal
// and lacquer, a seventh tone for the specular hit. o.spec is how tight the hit is (the cosine it needs).
function mkMat(name, tones, o) { MKV[name] = Object.assign({ r: tones.map(mkRGB), nd: o && o.spec ? tones.length - 1 : tones.length }, o || {}); return name; }
const MKD = {
  gilt: [['#18060e', '#3a100e', '#682a10', '#a0561c', '#d68c2e', '#ffcc58', '#fffae0'], ['#0a0710', '#1a1220', '#2e2226', '#4a3a2a', '#6a5634', '#9a8250', '#d8c890']],
  mask: [['#200c16', '#4a2218', '#80501c', '#b88428', '#e2b444', '#fae08a', '#ffffff'], ['#0c0810', '#22161a', '#3e2e1e', '#665026', '#94783a', '#c8b06a', '#f0e6c0']],
  silk: [['#08030a', '#16070c', '#2c100e', '#4a2010', '#7a3e16', '#b06a22'], ['#120a12', '#261616', '#3e2616', '#58381a', '#745022', '#906c34']],
  lin: [['#16040e', '#340a14', '#5a161a', '#822c22', '#a84c34', '#c87050'], ['#07030a', '#12060e', '#220b12', '#341218', '#481c20', '#5c2a2a']],
  rim: [['#20100e', '#4a2a14', '#7a5018', '#aa7c24', '#d6aa40', '#f6dc86', '#fffae0'], ['#0c0810', '#201814', '#3a2c18', '#5a4620', '#806834', '#a88e50', '#d8c890']]
};
mkMat('silkK', ['#050309', '#0b0712', '#140e1c', '#1e1628', '#2a2036', '#3c3048'], { tex: 'silk' });
mkMat('lacq', ['#060408', '#0e080c', '#181014', '#2a1c1c', '#3e2c28', '#5a4438', '#b09878'], { tex: 'lacq', spec: 0.93 });
mkMat('bead', ['#120408', '#2a0a0c', '#4a1810', '#702c16', '#984a22', '#bc6c34', '#f0b080'], { spec: 0.9 });
mkMat('wrap', ['#1a1418', '#3a3230', '#625846', '#8c8062', '#b4a886', '#d8ceae'], { tex: 'wrap' });
mkMat('obs', ['#010103', '#05040a', '#0a0812', '#110e1c', '#1c1830', '#302a4c', '#e4dcff'], { spec: 0.985 });
mkMat('iron', ['#08080e', '#161822', '#282c36', '#3e444c', '#5a6268', '#7e878c', '#e4ecee'], { spec: 0.92 });
mkMat('wood', ['#120708', '#26120e', '#3e2214', '#5a341c', '#7a4c28', '#9c6a3a'], { tex: 'wood' });
mkMat('paper', ['#2a1e1c', '#4e3e32', '#7a6a50', '#a49270', '#c8b894', '#e6d8b4'], {});
mkMat('bole', ['#1a0610', '#360c14', '#561a18', '#74281c', '#8e3a24', '#a8502e'], {});
for (let n = 0; n < 5; n++) {
  const t = Math.pow(n / 4, 0.9), L = k => MKD[k][0].map((c, i) => mkLerpHex(c, MKD[k][1][i], t));
  mkMat('gilt' + n, L('gilt'), { tex: 'gilt', spec: 0.994 });
  mkMat('mask' + n, L('mask'), { spec: 0.975 });
  mkMat('silk' + n, L('silk'), { tex: 'silk', drain: 'silkK' });
  mkMat('lin' + n, L('lin'), { tex: 'silk' });
  mkMat('rim' + n, L('rim'), { tex: 'brocade', drain: 'silkK', spec: 0.95 });
}
const MK_INK = '#1a0608', MK_BLOOD = '#7a0810', MK_BLOODH = '#e0301e', MK_BLOODD = '#34020a';   // the blood tears
// a tone of a material on the old 0..4 scale (so hand-placed details can name 'shadow' or 'light' whatever the ramp)
const mkHex = (m, i) => {
  const M = MKV[m]; let v;
  if (M) v = M.r[Math.max(0, Math.min(M.nd - 1, Math.round(i / 4 * (M.nd - 1))))]; else if (PMAT[m]) v = PMAT[m][Math.max(0, Math.min(4, i))]; else v = [0, 0, 0];
  return '#' + v.map(q => q.toString(16).padStart(2, '0')).join('');
};
const mkAdd = (p, d) => [p[0] + d[0], p[1] + d[1]];
const mkH = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ------------------------------------------------------------------- the HD painter: a normal-mapped sculpt
// World units in, fine pixels out (MK_HS fine pixels per world pixel: 1.5, so each fine pixel is 2 screen pixels at
// the 0.75 camera). Every part stores a surface normal per pixel: ellipsoids, capsules, height-field blobs merged by
// their highest surface (so chest, breasts and belly meet in real creases), and pleated cloth. The render lights the
// normals with one key from the upper left-front, a warm bounce from the lower right (reflected light beyond the core
// shadow) and, for metal and lacquer, a tight specular hit; parts cast a short shadow down-right onto what lies under
// them; stray single pixels are cleaned into their neighbours; the silhouette takes a lit rim and a hue-tinted outline
// that breaks where the light hits. Everything lands on the materials' own palettes: no blending, no gradients.
const MK_HS = 1.5;
function mkHD(FW, FH, OX, OY) {
  const S = MK_HS, W = Math.round(FW * S), H = Math.round(FH * S), N = W * H;
  const part = new Int16Array(N).fill(-1), NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N), lu = new Int16Array(N), lv = new Int16Array(N), opts = [], over = new Map();
  const nrm = (x, y, z) => { const L = Math.hypot(x, y, z) || 1; return [x / L, y / L, z / L]; };
  const sph = (nx, ny, fz) => { const r = nx * nx + ny * ny; return nrm(nx, ny, Math.sqrt(Math.max(0, 1 - Math.min(1, r))) * (fz || 1)); };
  const fill = (bb, fn, mat, o) => {
    o = o || {}; const id = opts.length; opts.push(Object.assign({}, o, { mat }));
    const ax = Math.round(((o.ax != null ? o.ax : bb[0]) + OX) * S), ay = Math.round(((o.ay != null ? o.ay : bb[1]) + OY) * S);
    const i0 = Math.max(0, Math.floor((bb[0] + OX) * S) - 1), i1 = Math.min(W - 1, Math.ceil((bb[2] + OX) * S) + 1), j0 = Math.max(0, Math.floor((bb[1] + OY) * S) - 1), j1 = Math.min(H - 1, Math.ceil((bb[3] + OY) * S) + 1);
    const bx = o.n ? o.n[0] : 0, by = o.n ? o.n[1] : 0;
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const x = (i + 0.5) / S - OX, y = (j + 0.5) / S - OY, n = fn(x, y, bx, by); if (n === null) continue;
      const k = j * W + i; part[k] = id; NX[k] = n[0]; NY[k] = n[1]; NZ[k] = n[2]; lu[k] = i - ax; lv[k] = j - ay;
    }
    return id;
  };
  const inPoly = (pts, px, py) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c; } return c; };
  const A = {
    W, H, S,
    ell(cx, cy, rx, ry, mat, o) {
      o = o || {}; const rd = o.round != null ? o.round : 1;
      return fill([cx - rx, cy - ry, cx + rx, cy + ry], (x, y, bx, by) => { const nx = (x - cx) / rx, ny = (y - cy) / ry; if (nx * nx + ny * ny > 1) return null; return sph(nx * rd + bx, ny * rd + by, o.fz); }, mat, Object.assign({ ax: cx, ay: cy }, o));
    },
    // a sculpted mass: ellipsoid blobs [cx, cy, rx, ry, depth], the surface is the highest of them at each pixel
    blob(bl, mat, o) {
      o = o || {};
      const bb = [Math.min(...bl.map(b => b[0] - b[2])), Math.min(...bl.map(b => b[1] - b[3])), Math.max(...bl.map(b => b[0] + b[2])), Math.max(...bl.map(b => b[1] + b[3]))];
      return fill(bb, (x, y, bx, by) => {
        let best = -1, g = null;
        for (const [cx, cy, rx, ry, d] of bl) {
          const u = (x - cx) / rx, w = (y - cy) / ry, r = u * u + w * w; if (r >= 1) continue;
          const s = Math.sqrt(1 - r), h = d * s; if (h <= best) continue;
          best = h; const sc = Math.max(s, 0.18); g = [d * u / (rx * sc), d * w / (ry * sc)];
        }
        if (!g) return null;
        return nrm(g[0] * (o.round || 1) + bx * 3, g[1] * (o.round || 1) + by * 3, 1.6);
      }, mat, o);
    },
    limb(pts, r0, r1, mat, o) {
      o = o || {}; const n = pts.length, R = Math.max(r0, r1), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), rd = o.round != null ? o.round : 1;
      return fill([Math.min(...xs) - R, Math.min(...ys) - R, Math.max(...xs) + R, Math.max(...ys) + R], (x, y, bx, by) => {
        let best = null, bd = 1e9;
        for (let i = 0; i < n - 1; i++) {
          const [ax, ay] = pts[i], [qx, qy] = pts[i + 1], dx = qx - ax, dy = qy - ay, L2 = dx * dx + dy * dy || 1e-9;
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), r = r0 + (r1 - r0) * (i + t) / Math.max(1, n - 1);
          const ex = x - ax - t * dx, ey = y - ay - t * dy, e2 = ex * ex + ey * ey;
          if (e2 <= r * r && e2 / (r * r) < bd) { bd = e2 / (r * r); best = [ex / r, ey / r]; }
        }
        return best ? sph(best[0] * rd + bx, best[1] * rd + by, o.fz) : null;
      }, mat, Object.assign({ ax: pts[0][0], ay: pts[0][1] }, o));
    },
    // a flat or pleated panel. o.fold: {cx, y0, y1, w0, w1, n, amp, ph, curve, skew, twist}: a cylinder's curve and pleats
    // that fan out and deepen toward y1, with a second, finer set of folds riding on them (heavy silk never pleats evenly)
    poly(pts, mat, o) {
      o = o || {}; const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), f = o.fold;
      const rg = o.rough || 0, sd = (o.seed || 0) + opts.length * 7, vn = (t, q) => { const i = Math.floor(t), f = t - i, a = mkH(i, q), b = mkH(i + 1, q); return a + (b - a) * f * f * (3 - 2 * f) - 0.5; };
      return fill([Math.min(...xs) - rg, Math.min(...ys) - rg, Math.max(...xs) + rg, Math.max(...ys) + rg], (x, y, bx, by) => {
        if (!inPoly(pts, rg ? x + rg * (vn(y * 0.9, sd) + 0.5 * vn(y * 2.3, sd + 1)) : x, rg ? y + rg * (vn(x * 0.9, sd + 2) + 0.5 * vn(x * 2.3, sd + 3)) : y)) return null;
        let nx = bx, ny = by;
        if (f) {
          const u = Math.max(0, Math.min(1, (y - f.y0) / ((f.y1 - f.y0) || 1))), hw = f.w0 + (f.w1 - f.w0) * u, xr = (x - f.cx - (f.skew || 0) * u) / (hw || 1);
          const a = xr * (f.n || 4) * Math.PI + (f.ph || 0) + (f.twist || 0) * u;
          nx += (f.curve || 0) * xr + (f.amp || 0) * (Math.sin(a) + 0.45 * Math.sin(a * 2.3 + 1.7 + u * 2)) * (0.3 + 0.7 * u);
        }
        return nrm(nx, ny, o.fz || 1);
      }, mat, o);
    },
    // hand-placed fine pixels, at world coordinates (fx/fy: a fine pixel's offset from there)
    px(x, y, c, fx = 0, fy = 0) { const i = Math.floor((x + OX) * S) + fx, j = Math.floor((y + OY) * S) + fy; if (i >= 0 && j >= 0 && i < W && j < H) over.set(j * W + i, c); },
    line(x0, y0, x1, y1, c) { const a = [(x0 + OX) * S, (y0 + OY) * S], b = [(x1 + OX) * S, (y1 + OY) * S], n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))); for (let i = 0; i <= n; i++) { const t = i / Math.max(1, n), X = Math.floor(a[0] + (b[0] - a[0]) * t), Y = Math.floor(a[1] + (b[1] - a[1]) * t); if (X >= 0 && Y >= 0 && X < W && Y < H) over.set(Y * W + X, c); } },
    fp(i, j, c) { i = Math.round(i); j = Math.round(j); if (i >= 0 && j >= 0 && i < W && j < H) over.set(j * W + i, c); },
    fx: x => Math.floor((x + OX) * S), fy: y => Math.floor((y + OY) * S),
    // darken (or lighten) whatever is under a fine point by k tones, after the render
    shade: [],
    dk(x, y, k) { A.shade.push([Math.floor((x + OX) * S), Math.floor((y + OY) * S), k]); },
    dkl(x0, y0, x1, y1, k) { const a = [(x0 + OX) * S, (y0 + OY) * S], b = [(x1 + OX) * S, (y1 + OY) * S], n = Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))); for (let i = 0; i <= n; i++) { const t = i / Math.max(1, n); A.shade.push([Math.floor(a[0] + (b[0] - a[0]) * t), Math.floor(a[1] + (b[1] - a[1]) * t), k]); } },
    render(rd) {
      rd = rd || {};
      const c = mkCanvas(W, H), cx = c.getContext('2d'), img = cx.createImageData(W, H), Dd = img.data, tk = new Int8Array(N).fill(-1), dr = new Uint8Array(N);
      const pa = (i, j) => (i < 0 || j < 0 || i >= W || j >= H) ? -1 : part[j * W + i];
      const L = nrm(-0.55, -0.72, 0.55), B = nrm(0.8, 0.3, 0.35), Hh = nrm(L[0], L[1], L[2] + 1);
      const TH = [-0.25, 0.06, 0.32, 0.6, 0.84];
      const drain = rd.drain || 0;
      // 1. light every pixel onto its material's ramp
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const k = j * W + i, p = part[k]; if (p < 0) continue;
        const o = opts[p], M = MKV[o.mat]; if (!M) continue;
        const nx = NX[k], ny = NY[k], nz = NZ[k], dif = nx * L[0] + ny * L[1] + nz * L[2];
        let v = dif;
        const bo = nx * B[0] + ny * B[1] + nz * B[2];
        if (dif < 0.02 && bo > 0.62 && o.bounce !== false) v = Math.max(v, -0.02);   // the reflected light past the core shadow
        let kk = 0; for (const t of TH) if (v > t) kk++;
        kk = Math.round(kk * (M.nd - 1) / 5) + (o.tone || 0);
        if (M.spec && (nx * Hh[0] + ny * Hh[1] + nz * Hh[2]) > M.spec && o.spec !== false && (o.tone || 0) >= 0) kk = 99;   // the specular hit
        if (kk !== 99) {
          const eL = pa(i - 1, j) < 0, eU = pa(i, j - 1) < 0;
          if (o.rim !== false && (eL || eU)) kk += 1;
          else if (pa(i + 1, j) < 0 || pa(i, j + 1) < 0) kk -= 1;
          if (o.ao !== false) {
            const q1 = pa(i - 1, j - 1), q2 = pa(i - 2, j - 2), q3 = pa(i - 1, j), q4 = pa(i, j - 1);
            if ((q1 > p && opts[q1].cast !== false) || (q3 > p && opts[q3].cast !== false) || (q4 > p && opts[q4].cast !== false)) kk -= 2;
            else if (q2 > p && opts[q2].cast !== false) kk -= 1;
          }
          if (o.edge) { const r = pa(i + 1, j), b = pa(i, j + 1); if ((r >= 0 && r < p) || (b >= 0 && b < p)) kk = Math.min(kk, 0); }
          // materials' texture, as small clusters in the part's own coordinates
          const U = lu[k], V = lv[k];
          if (M.tex === 'gilt') {
            const cu = Math.floor(U / 3), cv = Math.floor(V / 3), h0 = mkH(cu + 31, cv * 3 + 7);
            if (h0 > 0.9 && kk >= 3 && (U % 3 !== 2 || V % 3 !== 2)) kk -= 1;                        // rubbed gilt: a small dull patch
            else if (kk <= 1 && mkH(Math.floor(U / 4), Math.floor(V / 3)) > 0.95 && (U + V) % 4 !== 0) kk = -5;   // the red bole in the creases
            else if (kk >= 2 && ((U % 7 === 0 && mkH(Math.floor(U / 7), Math.floor(V / 3)) > 0.86) || (V % 5 === 0 && mkH(Math.floor(U / 3) + 11, Math.floor(V / 5)) > 0.9))) kk -= 1;   // hairline cracks
          } else if (M.tex === 'silk') {
            if (mkH(U >> 1, V >> 2) > 0.93 && kk >= 1) kk += (mkH(U, 3) > 0.5 ? 1 : -1);             // slubs in the weave, along the grain
          } else if (M.tex === 'brocade') {
            if ((U & 3) === 1 && (V & 3) === 1 && kk >= 2) kk += 1; else if (((U + V) & 3) === 0) kk -= 1;
          } else if (M.tex === 'wood') { if (((U + (V >> 2)) % 3) === 0) kk -= 1; }
          else if (M.tex === 'wrap') { if (((V + (U >> 1)) % 3) === 0) kk -= 1; }
          if (kk !== -5) kk = Math.max(0, Math.min(M.nd - 1, kk));
        }
        // the night: the black climbs up the silk from the hem, wicking higher along the pleats
        if (drain && M.drain) {
          const y = (j + 0.5) / S - rd.oy, wick = mkH(Math.floor(i / 1.5), 17) * 2.2 + (mkH(i >> 1, 29) > 0.72 ? 3.5 : 0), yD = rd.dy0 - drain * 48 - wick;
          if (y > yD) dr[k] = 1;
          if (kk !== 99 && kk !== -5 && y > yD - 0.7 && y < yD + 0.7) kk = Math.max(0, kk - 1);
        }
        tk[k] = kk;
      }
      // 2. clean up: a lone pixel whose four neighbours in the same part agree takes their tone
      for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) {
        const k = j * W + i, p = part[k]; if (p < 0 || tk[k] === 99 || tk[k] === -5) continue;
        const a = tk[k - 1], b = tk[k + 1], cc = tk[k - W], d = tk[k + W];
        if (part[k - 1] === p && part[k + 1] === p && part[k - W] === p && part[k + W] === p && a === b && b === cc && cc === d && a !== tk[k] && a >= 0 && a !== 99) tk[k] = a;
      }
      for (const [i, j, s] of A.shade) { if (!(i >= 0 && j >= 0 && i < W && j < H)) continue; const k = j * W + i; if (part[k] < 0 || tk[k] === 99 || tk[k] === -5) continue; tk[k] = Math.max(0, Math.min(MKV[opts[part[k]].mat].nd - 1, tk[k] + s)); }
      // 3. colour
      for (let k = 0; k < N; k++) {
        const p = part[k]; if (p < 0) continue; const o = opts[p]; let M = MKV[o.mat]; if (!M) continue;
        if (dr[k]) M = MKV[M.drain];
        const kk = tk[k], col = kk === 99 ? (M.spec ? M.r[M.r.length - 1] : M.r[M.nd - 1]) : kk === -5 ? MKV.bole.r[2] : M.r[Math.max(0, Math.min(M.nd - 1, kk))];
        const q = k * 4; Dd[q] = col[0]; Dd[q + 1] = col[1]; Dd[q + 2] = col[2]; Dd[q + 3] = 255;
      }
      // 4. the selective outline, hue-tinted: the neighbour's own deepest tone, darker down-right; broken up-left where
      // the light strikes the edge
      const S2 = new Uint8ClampedArray(Dd);
      for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
        const q = (j * W + i) * 4; if (S2[q + 3]) continue;
        const at = (a, b) => a >= 0 && b >= 0 && a < W && b < H && S2[(b * W + a) * 4 + 3] ? (b * W + a) : -1;
        const r = at(i - 1, j), dn = at(i, j - 1), l = at(i + 1, j), u = at(i, j + 1);
        const nb = r >= 0 ? r : dn >= 0 ? dn : l >= 0 ? l : u; if (nb < 0) continue;
        const p = part[nb], M = p >= 0 ? MKV[opts[p].mat] : null, base = M ? (dr[nb] ? MKV[M.drain] : M).r[0] : [20, 10, 14];
        if (r >= 0 || dn >= 0) { Dd[q] = base[0] * 0.55; Dd[q + 1] = base[1] * 0.5; Dd[q + 2] = base[2] * 0.6 + 4; }
        else { if (tk[nb] >= (M ? M.nd - 2 : 9) || tk[nb] === 99) continue; Dd[q] = base[0]; Dd[q + 1] = base[1]; Dd[q + 2] = base[2]; }
        Dd[q + 3] = 255;
      }
      for (const [k, cv] of over) { const q = k * 4; if (cv == null) { Dd[q + 3] = 0; continue; } const col = mkRGB(cv); Dd[q] = col[0]; Dd[q + 1] = col[1]; Dd[q + 2] = col[2]; Dd[q + 3] = 255; }
      cx.putImageData(img, 0, 0); return c;
    }
  };
  return A;
}
// ------------------------------------------------------------------- the rig: every pose, every view, every Weight
// wt: 0 light, 1 settled, 2 heavy, 3 perfect poise. Feet at the origin, y up is negative, one unit a world pixel.
// Crown at -52, the head centred at -47, shoulders at -40, the chest at -35, the belly at -27 (11.5 x 9.5), the sash at
// -18, the hem at -2.5. Poses beyond the shared four are the skills' own.
const MK_PH = { idle: 4, walk: 8, atk: 4, cast: 4, sit: 2, sun: 2, eye: 2, raise: 4, clap: 4, stomp: 4, breath: 4, weep: 4, grasp: 4, chant: 2, leap: 2, slap: 4, flurry: 4 };
const MK_AS = 1.08;   // the pose tables (shoulder-relative elbow and hand offsets) were drawn for an older arm
function mkRig(pose, ph, view, wt) {
  const walk = pose === 'walk', a = walk ? ph / 8 * Math.PI * 2 : 0, sw = walk ? Math.sin(a) : 0, cw = walk ? Math.cos(a) : 0;
  const sq = [-1, 0, 1, 1.5][wt], wd = [-1.5, 0, 1.5, 2.5][wt];
  // the walk: lowest where the legs are apart, the belly and robe following a beat behind
  let bob = walk ? Math.round(Math.abs(sw) * (wt >= 2 ? 3 : 2)) / 2 : pose === 'idle' ? [0, 0, 0.5, 0.5][ph % 4] : 0;
  let lean = walk ? sw * 0.6 : 0;
  const breath = pose === 'idle' ? [0, 0.5, 1, 0.5][ph % 4] : pose === 'breath' ? [1.5, 2, -0.5, 0][ph % 4] : 0;
  const chk = pose === 'idle' && ph === 3 ? -0.5 : pose === 'weep' ? (ph % 2 ? -0.5 : 0) : 0;   // the chuckle / the sob
  if (pose === 'atk') lean = [-1, -1.5, 2, 1.5][ph % 4];
  else if (pose === 'flurry') lean = 2;
  else if (pose === 'breath') lean = [-0.5, -1.5, 1.5, 1][ph % 4];
  else if (pose === 'grasp' || pose === 'cast') lean = [0, -0.5, 1, 1][ph % 4];
  else if (pose === 'stomp') bob = [0, -1, 3, 2.5][ph % 4];
  else if (pose === 'slap') { bob = [0, -1, 4, 3.5][ph % 4]; lean = [0, -1, 3, 3][ph % 4]; }
  else if (pose === 'clap') lean = [0, -0.5, 1, 1][ph % 4];
  else if (pose === 'weep') lean = 0.5;
  else if (pose === 'sit') bob = 9;
  const dy = sq + bob, jig = walk ? Math.abs(Math.sin(a - 0.7)) * 0.8 : 0;
  const J = { pose, ph, view, walk, sw, cw, a, wt, lean, back: view === 'back' || view === 'up' };
  J.head = [1.5 + lean, -47 + dy + (pose === 'breath' && ph < 2 ? -0.5 : 0) + (pose === 'weep' ? 1 : 0) + chk * 0.5];
  if (pose === 'breath') J.head[0] += ph < 2 ? -0.5 : 0.5;
  J.belly = [2 + lean * 0.7, -27 + dy * 0.85 + jig, 11.5 + wd * 0.5 + breath * 0.35, 9.5 + breath * 0.3 + (wt >= 2 ? 0.3 : 0)];
  J.chest = [1 + lean * 0.9, -35 + dy];
  J.shN = [9.5 + lean + wd * 0.4, -40 + dy + chk]; J.shF = [-8 + lean - wd * 0.4, -40.5 + dy + chk];
  J.hemY = -2.5 - (wt === 0 ? 0.5 : 0); J.hemW = 13.5 + wd * 0.7; J.sashY = -18 + dy * 0.6;
  const st = [3.5, 4.5, 5.5, 6][wt];
  if (walk) { const lf = Math.max(0, cw), lfF = Math.max(0, -cw); J.ankN = [st * 0.5 + sw * 4.5, -lf * 1.5]; J.ankF = [-st * 0.6 - sw * 4.5, -lfF * 1.5]; }
  else { J.ankN = [st, 0.5]; J.ankF = [-st * 0.8, -0.5]; }
  const sN = J.shN, sF = J.shF, S = MK_AS, add = (p, d) => [p[0] + d[0] * S, p[1] + d[1] * S];
  // arms: elbow and hand for each side, and the kind of hand (open, palm, claw, pray)
  let elN = add(sN, [3.6, 8.8]), haN = add(sN, [5, 17]), elF = add(sF, [-3.4, 8.8]), haF = add(sF, [-4, 17]), hN = 'open', hF = 'open';
  if (walk) { const as = -sw * 2.6; haN[0] += as; elN[0] += as * 0.4; haF[0] -= as; elF[0] -= as * 0.4; haN[1] -= Math.max(0, as) * 0.3; haF[1] -= Math.max(0, -as) * 0.3; }
  if (pose === 'idle') {
    // contrapposto: his weight sinks onto the far leg, the near hip and shoulder drop, the belly leads; the near hand
    // opens forward and out, palm to the world, as if offering it something; the far hand hangs open, loose
    const br = [0, 0, 0.5, 0.5][ph % 4];
    J.belly[0] += 1.2; J.head[0] -= 0.4; J.chest[0] += 0.4; J.shN[1] += 0.7; J.shF[1] -= 0.3;
    elN = add(J.shN, [4.4, 8.2]); haN = add(J.shN, [8.2, 15.4 + br]); hN = 'open';
    elF = add(J.shF, [-3.4, 8.8]); haF = add(J.shF, [-3.2, 17 + br]);
    J.ankN = [st + 1.6, 1]; J.ankF = [-st * 0.55, -0.8];
  }
  if (walk) { J.belly[0] += 0.8; J.head[0] -= 0.3; }   // walking, the belly goes first
  const k = ph % 4;
  switch (pose) {
    case 'atk':
      elN = add(sN, [[-2, 7], [-4, 5], [7, 1], [6, 4]][k]); haN = add(sN, [[1, 4], [-2, 2], [16, 1], [12, 5]][k]); hN = k >= 2 ? 'palm' : 'open';
      elF = add(sF, [[5, 7], [6, 6], [-4, 6], [-2, 7]][k]); haF = add(sF, [[11, 5], [12, 4], [-2, 12], [2, 12]][k]);
      break;
    case 'flurry':
      if (ph % 2 === 0) { elN = add(sN, [7, 1]); haN = add(sN, [16, 0]); hN = 'palm'; elF = add(sF, [4, 7]); haF = add(sF, [9, 8]); }
      else { elN = add(sN, [0, 6]); haN = add(sN, [3, 4]); elF = add(sF, [13, 2]); haF = add(sF, [25, 1]); hF = 'palm'; }
      break;
    case 'cast':
      elN = add(sN, [[1, 9], [4, 5], [7, 2], [7, 2]][k]); haN = add(sN, [[-1, 13], [5, 2], [15, 0], [15, 1]][k]); hN = k >= 2 ? 'palm' : 'open';
      elF = add(sF, [[4, 9], [2, 8], [-3, 8], [-3, 8]][k]); haF = add(sF, [[9, 13], [7, 13], [-1, 15], [-1, 15]][k]);
      break;
    case 'raise':
      elN = add(sN, [[3, 8], [5, 0], [3, -8], [3, -8]][k]); haN = add(sN, [[2, 14], [6, -7], [1, -18], [1, -18]][k]); hN = k >= 1 ? 'palm' : 'open';
      elF = add(sF, [4, 8]); haF = add(sF, [9, 14]);
      break;
    case 'clap':
      elN = add(sN, [[6, 3], [7, -1], [4, 5], [4, 5]][k]); haN = add(sN, [[12, -1], [11, -6], [5, 1], [5, 1]][k]); hN = 'palm';
      elF = add(sF, [[-6, 3], [-6, -1], [8, 6], [8, 6]][k]); haF = add(sF, [[-9, -1], [-8, -6], [17, 2], [17, 2]][k]); hF = 'palm';
      break;
    case 'grasp':
      elN = add(sN, [[-2, 7], [8, 1], [8, 1], [7, 2]][k]); haN = add(sN, [[1, 5], [16, -1], [17, -1], [16, 0]][k]); hN = k ? 'claw' : 'open';
      elF = add(sF, [-3, 8]); haF = add(sF, [0, 15]);
      break;
    case 'chant': case 'eye':
      elN = add(sN, [2, 8]); haN = [J.chest[0] + 6.5, J.chest[1] + 1]; hN = 'pray'; elF = add(sF, [7, 8]); haF = [J.chest[0] + 5.5, J.chest[1] + 2]; hF = 'pray';
      break;
    case 'weep':
      elN = add(sN, [2, 7]); haN = [J.head[0] + 3.5, J.head[1] + 2.5]; hN = 'palm'; elF = add(sF, [6, 6]); haF = [J.head[0] - 0.5, J.head[1] + 3]; hF = 'palm';
      break;
    case 'breath':
      elN = add(sN, [[6, 5], [7, 3], [4, 9], [4, 9]][k]); haN = add(sN, [[10, 10], [11, 7], [2, 16], [2, 16]][k]); hN = 'palm';
      elF = add(sF, [[-6, 5], [-7, 3], [-2, 9], [-2, 9]][k]); haF = add(sF, [[-9, 10], [-10, 7], [2, 16], [2, 16]][k]); hF = 'palm';
      break;
    case 'stomp':
      elN = add(sN, [[7, 2], [8, 0], [6, 5], [5, 6]][k]); haN = add(sN, [[13, 0], [14, -3], [11, 9], [10, 10]][k]); hN = 'palm';
      elF = add(sF, [[-7, 2], [-8, 0], [-6, 5], [-5, 6]][k]); haF = add(sF, [[-12, 0], [-13, -3], [-10, 9], [-9, 10]][k]); hF = 'palm';
      if (k < 2) { J.ankN = [st + 2, -[4, 7][k]]; J.kneeUp = true; } else J.ankN = [st + 3, 0.5];
      break;
    case 'slap':
      elN = add(sN, [[5, 0], [5, -7], [6, 10], [6, 10]][k]); haN = add(sN, [[8, -8], [6, -17], [9, 20], [9, 20]][k]); hN = 'palm';
      elF = add(sF, [[-3, 0], [-2, -7], [12, 11], [12, 11]][k]); haF = add(sF, [[-2, -8], [0, -17], [20, 20], [20, 20]][k]); hF = 'palm';
      break;
    case 'leap':
      elN = add(sN, [5, -6]); haN = add(sN, [8, -14]); hN = 'palm'; elF = add(sF, [-5, -6]); haF = add(sF, [-7, -14]); hF = 'palm';
      J.ankN = [4, -6]; J.ankF = [-3.5, -5]; J.kneeUp = true;
      break;
    case 'sun':
      elN = add(sN, [8, -4]); haN = add(sN, [14, -12]); hN = 'palm'; elF = add(sF, [-8, -4]); haF = add(sF, [-13, -12]); hF = 'palm';
      break;
    case 'sit':
      elN = add(sN, [4, 8]); haN = [J.belly[0] + 5, J.belly[1] + 8]; hN = 'open'; elF = add(sF, [-1, 9]); haF = [J.belly[0] - 3, J.belly[1] + 9]; hF = 'open';
      break;
  }
  J.elN = elN; J.haN = haN; J.elF = elF; J.haF = haF; J.hN = hN; J.hF = hF;
  // ---- the views. 'front' and 'back' are 3/4 (toward us / away, facing right), 'side' the profile, 'down' / 'up'
  // straight toward us / away (symmetrical)
  const shift = (keys, dx) => { for (const q of keys) J[q] = [J[q][0] + dx, J[q][1]]; };
  if (view === 'side') {
    shift(['shN', 'elN', 'haN'], -8.5); shift(['shF', 'elF', 'haF'], 6.5); J.belly[0] += 3.5; J.belly[2] -= 2; J.head[0] -= 0.5; J.hemW -= 2.5; J.chest[0] += 0.5; J.shN[1] += 0.5;
    if (walk || pose === 'idle') { const as = walk ? -sw * 3 : 0; J.elN = [J.shN[0] + 1 + as * 0.4, J.shN[1] + 9.5]; J.haN = [J.shN[0] + 2.5 + as, J.shN[1] + 18.5]; J.elF = [J.shF[0] - 0.5 - as * 0.4, J.shF[1] + 9.5]; J.haF = [J.shF[0] - 1 - as, J.shF[1] + 18.5]; }
    if (!walk && pose !== 'stomp' && pose !== 'leap') { J.ankN = [st * 0.5, 0]; J.ankF = [-st * 0.4, 0]; }
    else if (walk) { J.ankN[0] = sw * 5.5; J.ankF[0] = -sw * 5.5; }
  } else if (view === 'down' || view === 'up') {
    const s = view === 'down' ? 1 : -1, c = 9.5 + wd * 0.4;
    J.head = [0, J.head[1]]; J.belly[0] = 0; J.chest[0] = 0; J.shN = [c, J.shN[1] + 0.5]; J.shF = [-c, J.shN[1]];
    const as = walk ? -sw * 2 * s : 0;
    J.elN = [c + 2, J.shN[1] + 9 + as * 0.4]; J.haN = [c + 2.5, J.shN[1] + 18 + as]; J.elF = [-c - 2, J.shF[1] + 9 - as * 0.4]; J.haF = [-c - 2.5, J.shF[1] + 18 - as];
    if (walk) { const lf = Math.max(0, cw), lfF = Math.max(0, -cw); J.ankN = [st * 0.9, s * sw * 1.2 - lf * 1.5]; J.ankF = [-st * 0.9, -s * sw * 1.2 - lfF * 1.5]; }
    else { J.ankN = [st * 0.9, 0]; J.ankF = [-st * 0.9, 0]; }
  }
  return J;
}

// ------------------------------------------------------------------- the painter
// the hands: big, heavy, gilded, and open. 'open' hangs relaxed, the fingers together and a little curled; 'palm'
// thrusts flat with the fingers spread; 'claw' grips; 'pray' is the two palms pressed together
function mkHand(A, ha, el, kind, g, far) {
  const SK = g.skin, t = far ? -1 : 0, dx = ha[0] - el[0], dy = ha[1] - el[1], Ln = Math.hypot(dx, dy) || 1, ux = dx / Ln, uy = dy / Ln;
  let px = -uy, py = ux; if (px > 0) { px = -px; py = -py; }   // p points to the thumb side (toward the viewer's left)
  const P = (a, b) => [ha[0] + (ux * a + px * b) * 1.15, ha[1] + (uy * a + py * b) * 1.15];
  if (kind === 'pray') {
    A.ell(ha[0], ha[1] - 1, 1.6, 3.2, SK, { tone: t, round: 0.8 }); A.limb([[ha[0] - 0.4, ha[1] - 1.5], [ha[0] + 0.1, ha[1] - 4.2]], 1.1, 0.7, SK, { tone: t });
    A.line(ha[0] + 0.2, ha[1] - 3.8, ha[0] + 0.2, ha[1] + 1.5, mkHex(SK, 0));
    return;
  }
  if (kind === 'open') {
    // the palm, then the fingers as one heavy curled mass, their seams cut in, the thumb along the side
    A.ell(...P(1.2, 0), 2.1, 2.0, SK, { tone: t, ax: ha[0], ay: ha[1] });
    A.limb([P(1.6, 0.2), P(3.6, 0.1), P(4.4, -0.6)], 1.65, 1.15, SK, { tone: t, edge: true });
    for (const s of [-0.55, 0.35]) A.line(...P(2.4, s), ...P(4.1, s - 0.2), mkHex(SK, far ? 0 : 1));
    A.limb([P(0.8, 1.4), P(2.4, 1.9)], 0.75, 0.6, SK, { tone: t });
    const nl = P(4.3, 0.9); A.px(nl[0], nl[1], mkHex(SK, far ? 2 : 4));
    return;
  }
  const c = P(1.3, 0);
  A.ell(c[0], c[1], 2.2, 2.1, SK, { tone: t });
  const spread = kind === 'claw' ? 0.45 : 0.6, len = kind === 'claw' ? 2.4 : 3.4;
  for (let i = -1.5; i <= 1.5; i++) {
    const b = P(2.6, i * 0.85), e = P(2.6 + len, i * 0.85 * (1 + spread)), m = kind === 'claw' ? P(2.6 + len * 0.7, i * 0.85 + 0.6) : e;
    A.limb(kind === 'claw' ? [b, m, [e[0] - px * 0.9, e[1] - py * 0.9]] : [b, e], 0.62, 0.5, SK, { tone: t, edge: true });
  }
  A.limb([P(0.6, -1.6), P(2.2, -2.6)], 0.6, 0.5, SK, { tone: t, edge: true });   // the thumb, out
  if (!far) { const q = P(1.1, 0.2); A.px(q[0], q[1], mkHex(SK, 1)); A.px(q[0] + ux * 0.5, q[1] + uy * 0.5, mkHex(SK, 1)); }   // the crease of the palm
}
// the wraps on his hands (a weapon slot): grimed linen round the palm and wrist, iron studs on the iron-bound pair
function mkWraps(A, ha, el, g) {
  if (g.wpn !== 'wraps' && g.wpn !== 'iwraps') return;
  const dx = ha[0] - el[0], dy = ha[1] - el[1], Ln = Math.hypot(dx, dy) || 1, ux = dx / Ln, uy = dy / Ln, px = -uy, py = ux;
  for (let i = 0; i < 3; i++) { const c = [ha[0] - ux * (0.4 + i * 0.7), ha[1] - uy * (0.4 + i * 0.7)]; A.limb([[c[0] - px * 1.7, c[1] - py * 1.7 + 0.3], [c[0] + px * 1.7, c[1] + py * 1.7 - 0.3]], 0.42, 0.42, 'wrap', { edge: true }); }
  if (g.wpn === 'iwraps') { const c = [ha[0] - ux * 0.8, ha[1] - uy * 0.8]; A.px(c[0], c[1], '#b8c0c4'); A.px(c[0] + px, c[1] + py, '#5e666c'); A.px(c[0] - ux * 1.4, c[1] - uy * 1.4, '#8a1810'); }
}
// the arm: a great bell sleeve of gold silk from the shoulder, hanging heavy below the elbow and lined with madder;
// then the bare gilded forearm with a cord of beads at the wrist, then the open hand
function mkArm(A, sh, el, ha, kind, g, far, stage) {
  const R = g.robe, SK = g.skin, doS = stage !== 'fore', doF = stage !== 'sleeve', t = far ? -1 : 0;
  const dx = ha[0] - el[0], dy = ha[1] - el[1], Ln = Math.hypot(dx, dy) || 1, ux = dx / Ln, uy = dy / Ln;
  const cuff = [el[0] + ux * 0.9, el[1] + uy * 0.9];
  const sway = g.walk ? -g.sw * 1.2 : 0;
  if (doS) {
    // the sleeve: a tube of heavy silk from the shoulder, flaring to a wide bell past the elbow; its underside sags with
    // the weight of the cloth (more as the arm lifts), and the mouth shows the madder lining round the forearm
    const d1x = el[0] - sh[0], d1y = el[1] - sh[1], L1 = Math.hypot(d1x, d1y) || 1, u1 = [d1x / L1, d1y / L1];
    const perp = u => { let q = [-u[1], u[0]]; if (q[1] < 0 || (Math.abs(q[1]) < 0.15 && q[0] > 0)) q = [-q[0], -q[1]]; return q; };   // toward the ground side
    const p1 = perp(u1), p2 = perp([ux, uy]), horiz = Math.min(1, Math.abs(ux) * 1.2);
    const sag = 0.8 + horiz * 3.2;
    const up = [[sh[0] - p1[0] * 2.9, sh[1] - p1[1] * 2.9], [el[0] - p1[0] * 2.8, el[1] - p1[1] * 2.8], [cuff[0] - p2[0] * 3.5, cuff[1] - p2[1] * 3.5]];
    const dn = [[cuff[0] + p2[0] * 3.9 + sway * 0.5, cuff[1] + p2[1] * 3.6 + sag], [el[0] + p1[0] * 3.4 + sway * 0.3, el[1] + p1[1] * 3.4 + sag * 0.6], [sh[0] + p1[0] * 3.1, sh[1] + p1[1] * 3.1]];
    const pts = [...up, ...dn];
    A.poly(pts, R, { tone: t, rough: 0.5, n: [0.15, 0], fold: { cx: el[0], y0: sh[1], y1: cuff[1] + sag, w0: 3, w1: 4.5, n: 3, amp: 0.8, ph: 1.3, curve: 0.55 }, ax: el[0], ay: el[1] });
    A.ell(sh[0] + u1[0] * 1.4 + (sh[0] > 0 ? 0.6 : -0.6), sh[1] + 1.4, 3.8, 3.4, R, { tone: t, cast: false, ao: false, round: 1.1, ax: sh[0], ay: sh[1] });   // the round of the shoulder: a heavy dome of muscle under the silk
    // creases where the silk bunches at the inside of the elbow
    for (let i = 0; i < 2; i++) { const u = 0.45 + i * 0.25, cx0 = sh[0] + (el[0] - sh[0]) * u, cy0 = sh[1] + (el[1] - sh[1]) * u; A.dkl(cx0 - p1[0] * 1.5, cy0 - p1[1] * 1.5 + 0.4, cx0 + p1[0] * 2.4, cy0 + p1[1] * 2.4 - 0.4 + i * 0.3, -2); A.dkl(cx0 - p1[0] * 1.5, cy0 - p1[1] * 1.5 - 0.3, cx0 + p1[0] * 2.2, cy0 + p1[1] * 2.2 - 1.1 + i * 0.3, 1); }
    // the mouth of the sleeve: lining inside, the brocade hem round it
    const m0 = up[2], m1 = dn[0];
    { const q0 = [m0[0] + (m1[0] - m0[0]) * 0.3, m0[1] + (m1[1] - m0[1]) * 0.3], q1 = [m0[0] + (m1[0] - m0[0]) * 0.7, m0[1] + (m1[1] - m0[1]) * 0.7]; A.limb([q0, q1], 0.5, 0.6, g.lin, { tone: t - 1, ao: false, rim: false }); }
    { const L0 = [m0[0] + (m1[0] - m0[0]) * 0.12, m0[1] + (m1[1] - m0[1]) * 0.12], L1 = [m0[0] + (m1[0] - m0[0]) * 0.88, m0[1] + (m1[1] - m0[1]) * 0.88];
      A.line(L0[0] + ux * 0.3, L0[1] + uy * 0.3, L1[0] + ux * 0.3, L1[1] + uy * 0.3, mkHex(g.rim, far ? 1 : 3)); }
  }
  if (!doF) return;
  // the forearm, bare gold, and a cord of beads round the wrist
  const w0 = [cuff[0] - ux * 0.5, cuff[1] - uy * 0.5], w1 = [ha[0] - ux * 0.6, ha[1] - uy * 0.6];
  if (Math.hypot(w1[0] - w0[0], w1[1] - w0[1]) > 0.8) { const fl = Math.hypot(w1[0] - w0[0], w1[1] - w0[1]), nb = Math.max(3, Math.ceil(fl / 0.9)), bl = []; for (let i = 0; i <= nb; i++) { const u = i / nb, r = u < 0.35 ? 2.3 + u * 0.4 : 2.44 - (u - 0.35) * 1.3; bl.push([w0[0] + (w1[0] - w0[0]) * u, w0[1] + (w1[1] - w0[1]) * u, r, r, r * 1.05]); } A.blob(bl, SK, { tone: t, ax: w0[0], ay: w0[1] }); }   // the forearm: heavy, the muscle swelling below the elbow
  if (!far || true) { const b = [ha[0] - ux * 1.4, ha[1] - uy * 1.4], px = -uy, py = ux; for (let i = -1; i <= 1; i++) { const q = [b[0] + px * i * 1.1, b[1] + py * i * 1.1]; A.px(q[0], q[1], i ? '#6c2a16' : '#a8542e'); A.px(q[0], q[1], '#22090a', 1, 1); } }
  // a heavy gilt armlet below the elbow, chased with a line of pips
  { const a0 = [w0[0] + (w1[0] - w0[0]) * 0.18, w0[1] + (w1[1] - w0[1]) * 0.18], px = -uy, py = ux;
    A.limb([[a0[0] - px * 2.3, a0[1] - py * 2.3], [a0[0] + px * 2.3, a0[1] + py * 2.3]], 0.75, 0.75, g.gold, { tone: t, edge: true, round: 1.2 });
    for (let i = -1; i <= 1; i++) A.px(a0[0] + px * i * 1.2 - ux * 0.3, a0[1] + py * i * 1.2 - uy * 0.3, i ? mkHex(g.gold, far ? 2 : 4) : mkHex('lin0', 3)); }
  mkHand(A, ha, el, kind, g, far);
  if (!far || kind !== 'open') mkWraps(A, ha, el, g);
}
// the mala: rosewood beads, big enough to count, lying in a U on his chest; the gold guru bead and a madder tassel
function mkMala(A, cx, y0, rw, depth, n, g) {
  for (let i = 0; i <= n; i++) {
    const a = i / n * Math.PI, X = cx - Math.cos(a) * rw, Y = y0 + Math.sin(a) * depth;
    if (i === Math.round(n / 2)) {
      A.ell(X, Y + 0.2, 0.95, 0.95, g.gold || 'gilt0', { edge: true });
      A.limb([[X, Y + 1.2], [X + 0.1, Y + 3.4]], 0.45, 0.75, g.lin, { ao: false });
      continue;
    }
    A.ell(X, Y, 1.0, 1.0, 'bead', { round: 1.3, edge: true, cast: true });
  }
}
// an ofuda: a black lacquer tag on a cord, a long paper slip under it, a red seal and a brushed line of ink
function mkOfuda(A, x, y, g, far, sway) {
  const paper = g.night >= 3 ? '#7a746a' : '#d8d0b8';
  A.line(x, y - 1, x, y, '#8a6420');
  A.poly([[x - 0.9, y], [x + 0.9, y], [x + 0.9, y + 1.6], [x - 0.9, y + 1.6]], 'lacq', { ao: false });
  A.poly([[x - 0.9, y + 1.6], [x + 0.9, y + 1.6], [x + 0.9 + sway, y + 6.5], [x - 0.9 + sway, y + 6.5]], 'paper', { tone: far ? -1 : 0, n: [0.2, 0], edge: true });
  A.px(x + sway * 0.4, y + 3, '#9a2012'); A.px(x + sway * 0.4, y + 3, '#c42a18', 1, 0);
  A.line(x + sway * 0.6, y + 4, x + sway * 0.9, y + 6, '#241a14');
  if (g.night >= 3) A.px(x + sway, y + 6.4, '#3e0204');
}
// the mask: a polished gold face, the shut eyes turned up in laughter while grooves of carved tears run down from them.
// By day the mouth grins wide; through dusk the grin falls; at night it wails, and the carved tears run with blood.
// Drawn fine pixel by fine pixel so it reads at one screen pixel per pixel.
function mkMask(A, J, g) {
  const V = J.view, [hx, hy] = J.head, n = clamp(g.night || 0, 0, 4), M = g.mask;
  const side = V === 'side', sym = V === 'down';
  const mcx = hx + (side ? 1.5 : sym ? 0 : 0.7), mcy = hy + 0.5;
  const rx = side ? 2.4 : sym ? 3.3 : 3.2;
  if (!side) A.ell(mcx, mcy, rx, 3.95, M, { n: [side ? 0.35 : 0.05, 0], round: 0.8 });
  if (side) {   // the mask in profile: forehead, brow, nose, lips and chin cut against the air
    const P0 = [[hx - 0.3, hy - 3.2], [hx + 1.2, hy - 3.4], [hx + 2.5, hy - 2.1], [hx + 2.7, hy - 1.2], [hx + 3.8, hy + 0.9], [hx + 2.9, hy + 1.4], [hx + 3.2, hy + 2.1], [hx + 2.9, hy + 2.7], [hx + 3.1, hy + 3.4], [hx + 2.3, hy + 4.2], [hx - 0.2, hy + 4.2]];
    A.poly(P0, M, { n: [0.45, 0.05], edge: true, ax: hx, ay: hy });
    const X = A.fx(hx), Y = A.fy(hy), C = i => mkHex(M, i), f = (i, j, c) => A.fp(X + i, Y + j, c);
    f(1, -4, C(4)); f(2, -4, C(4)); f(3, -3, C(4)); f(3, -2, C(1));   // the brow ridge
    f(1, -1, MK_INK); f(2, -2, MK_INK); f(3, -1, MK_INK); f(2, -1, C(3));   // the laughing eye
    for (let j = 0; j < 4; j++) { f(1, j, j === 3 ? C(1) : C(0)); f(2, j, C(3)); }   // the carved tear
    if (n >= 1) { const bl = [0, 1, 3, 4, 6][n]; for (let j = 0; j < bl; j++) f(1, j, j % 3 === 1 ? MK_BLOODH : MK_BLOOD); }
    f(4, 1, C(1)); f(5, 1, C(4));   // the nostril, the nose's lit tip
    if (n <= 1) { f(3, 3, MK_INK); f(4, 3, n ? MK_INK : '#efe2c0'); f(2, 2, MK_INK); f(5, 3, MK_INK); }   // the grin, its corner dug up
    else if (n === 2) { f(3, 3, MK_INK); f(4, 3, MK_INK); f(5, 3, MK_INK); }
    else { f(3, 3, MK_INK); f(4, 3, '#2a0404'); f(4, 4, '#2a0404'); f(5, 3, MK_INK); f(3, 4, MK_INK); f(3, 5, MK_INK); }   // the wail
    if (g.eye) { f(3, -5, '#ffffff'); f(4, -5, '#9fe0ff'); } else f(3, -5, '#b02818');
    return;
  }
  const X = A.fx(mcx), Y = A.fy(mcy), C = i => mkHex(M, i), f = (i, j, c) => A.fp(X + i, Y + j, c);
  // the brow ridge: a lit bar with the sockets cut under it
  const eyes = side ? [1] : sym ? [-4, 1] : [-4, 1];
  for (const e of eyes) {
    const far = !side && !sym && e < 0, w = far ? 3 : 4, x0 = e + (far ? 0 : 0);
    // the brow: level and lifted in laughter, the inner end climbs as night comes on
    for (let i = 0; i < w; i++) f(x0 + i, -4 + ((n >= 3 && (e < 0 ? i === w - 1 : i === 0)) ? -1 : 0), C(4));
    for (let i = 0; i < w; i++) f(x0 + i, -3, C(1));
    // the shut eye: an upturned crescent (laughing), a dark cut
    f(x0, -1, MK_INK); for (let i = 1; i < w - 1; i++) f(x0 + i, -2, MK_INK); f(x0 + w - 1, -1, MK_INK);
    for (let i = 1; i < w - 1; i++) f(x0 + i, -1, C(3));
    // the carved tear: a groove from the outer corner down the cheek, lit on its far lip
    const ox = e < 0 || side ? x0 : x0 + w - 1, len = side ? 4 : 5;
    for (let j = 0; j < len; j++) { f(ox + (j > 2 ? (e < 0 || side ? -0 : 0) : 0), j, j === len - 1 ? C(1) : C(0)); f(ox + 1, j, C(3)); }
    if (n >= 1) {   // blood in the groove, filling it further as the night deepens
      const bl = [0, 1, 3, 5, 6][n];
      for (let j = 0; j < Math.min(bl, len + 1); j++) f(ox, j, j % 3 === 1 ? MK_BLOODH : MK_BLOOD);
      if (n >= 3) f(ox, len, MK_BLOOD); if (n >= 4) { f(ox, len + 1, MK_BLOODD); f(ox, len + 2, MK_BLOOD); }
      if (n >= 2) f(ox - (e < 0 || side ? 1 : -1) * 0, -1, MK_BLOODD);
    }
  }
  // the nose: a short lit ridge, a shadowed underside
  if (!side) { f(-1, 0, C(4)); f(-1, 1, C(3)); f(0, 1, C(2)); f(0, 2, C(1)); }
  // the mouth
  const mx = side ? 1 : sym ? -1 : -1, my = 4, w = side ? 2 : 3, LIP = '#6a0a06', CAV = '#2a0404', TOOTH = '#efe2c0';
  const row = (y, x0, x1, c) => { for (let x = x0; x <= x1; x++) f(mx + x, my + y, typeof c === 'function' ? c(x) : c); };
  if (n === 0) {   // the wide grin: the corners dug up into the cheeks, the mouth open on teeth and dark
    f(mx - w - 1, my - 1, MK_INK); f(mx + w + 1, my - 1, MK_INK); f(mx - w - 1, my - 2, C(1)); f(mx + w + 1, my - 2, C(1));
    row(0, -w, w, x => Math.abs(x) === w ? MK_INK : TOOTH); row(1, -w + 1, w - 1, x => Math.abs(x) === w - 1 ? MK_INK : CAV); row(2, -w + 2, w - 2, MK_INK);
    row(3, -w + 2, w - 2, C(4));
  } else if (n === 1) {   // the grin closing: a smile, the corners still up
    f(mx - w - 1, my - 1, MK_INK); f(mx + w + 1, my - 1, MK_INK); row(0, -w, w, x => Math.abs(x) === w ? MK_INK : MK_INK); row(1, -w + 1, w - 1, LIP); row(2, -w + 2, w - 2, C(4));
  } else if (n === 2) {   // the smile gone: a flat, pressed mouth
    row(0, -w - 1, w + 1, MK_INK); row(1, -w, w, LIP); row(2, -w + 1, w - 1, C(4));
  } else if (n === 3) {   // the corners dragged down in grief
    row(0, -w + 1, w - 1, MK_INK); f(mx - w, my + 1, MK_INK); f(mx + w, my + 1, MK_INK); f(mx - w - 1, my + 2, MK_INK); f(mx + w + 1, my + 2, MK_INK); row(1, -w + 1, w - 1, LIP);
  } else {   // the wail: an open, downturned arch on a dark cavity, the corners at the jaw
    row(-1, -w + 2, w - 2, MK_INK); row(0, -w + 1, w - 1, x => Math.abs(x) === w - 1 ? MK_INK : TOOTH); row(1, -w, w, x => Math.abs(x) === w ? MK_INK : CAV); row(2, -w, w, x => Math.abs(x) === w ? MK_INK : CAV);
    f(mx - w - 1, my + 3, MK_INK); f(mx + w + 1, my + 3, MK_INK); row(3, -w + 1, w - 1, x => Math.abs(x) <= 1 ? LIP : CAV);
  }
  // the third eye (Opening of the Eye) or the red urna
  if (g.eye) { f(-1, -6, '#ffffff'); f(-1, -7, '#9fe0ff'); f(-2, -6, '#4cb8ff'); f(0, -6, '#4cb8ff'); f(-1, -5, '#4cb8ff'); }
  else { f(-1, -6, '#b02818'); f(-1, -5, '#5a1008'); }
  if (g.head === 'mask') { for (let x = -2; x <= 1; x++) f(mx + x, my + 5, x === -2 || x === 1 ? '#5a1008' : '#b02818'); f(mx - 1, my + 6, '#efe2c0'); }   // the second mouth under the first
}
// the halo: a thin gilt ring behind the head, burning like phosphorus by day (a white-gold inner edge and a corona of
// short, frayed tongues of gold, never a sunburst), and by night an eaten black ring with a ragged gold rim
function mkHalo(A, J, g) {
  const [hx, hy] = J.head, cx = hx + (J.view === 'side' ? 0.5 : J.back ? -0.5 : 0.5), cy = hy - 0.5, r0 = 6.6, night = (g.night || 0) >= 3, big = g.tier >= 2;
  const ring = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * 6.2832; ring.push([cx + Math.cos(a) * r0, cy + Math.sin(a) * r0]); }
  A.limb(ring, 0.6, 0.6, night ? 'lacq' : g.gold, { round: 1.3, ao: false, rim: false, cast: false });
  const N = 72, D = night ? ['#e0b860', '#6a4a22', '#1a1020'] : ['#fff6d0', '#f2b640', '#9a4c12'];
  for (let i = 0; i < N; i++) {
    const a = i / N * 6.2832, h = mkH(i, (J.ph % 4) * 7 + 3), h2 = mkH(i >> 1, (J.ph % 4) + 11);
    if (night && h2 < 0.4) continue;   // the night eats the rim away in gaps
    const len = (night ? 0.4 : 0.5) + (h * h) * (big ? 2.6 : 1.9) + (h2 > 0.85 ? 1 : 0), tw = (h2 - 0.5) * 0.25;
    for (let d = 0; d < len; d += 0.6) { const aa = a + tw * d, x = cx + Math.cos(aa) * (r0 + 0.7 + d), y = cy + Math.sin(aa) * (r0 + 0.7 + d); A.px(x, y, d < 0.6 ? D[0] : d < len * 0.7 ? D[1] : D[2]); }
    if (!night && i % 3 === 0) A.px(cx + Math.cos(a) * (r0 - 0.6), cy + Math.sin(a) * (r0 - 0.6), Math.sin(a) < 0 && Math.cos(a) < 0.3 ? '#fff6d0' : '#c88a2a');   // the white-hot inner edge
  }
}
function mkHead(A, J, g) {
  const [hx, hy] = J.head, SK = g.skin, V = J.view, side = V === 'side';
  // the thick neck and the fold of fat at the nape, then the shaved skull, gilded
  A.ell(hx - 0.5, hy + 4.4, 3.8, 2.2, SK, { round: 0.7 });
  A.ell(hx - 0.3, hy - 0.4, 3.5, 3.9, SK, { round: 0.95, tone: J.back ? 0 : -1 });
  if (J.back) {
    // from behind: the skull, the long lobes of the ears, the mask's madder cords knotted at the nape, its gold rim at the cheek
    const s = V === 'up' ? 0 : 1;
    if (s) { A.ell(hx + 2.7, hy + 0.7, 0.9, 3.1, g.mask, { tone: -1, ao: false }); }
    for (const e of s ? [-1] : [-1, 1]) { const ex = hx + e * 3.3 + (s ? 0.2 : 0); A.limb([[ex, hy - 0.5], [ex - e * 0.1, hy + 3.2]], 0.8, 1.0, SK, { tone: -1, edge: true }); }
    A.line(hx - 3.2, hy + 0.2, hx + 3.2, hy - 0.1, '#6a1810'); A.line(hx - 3.2, hy + 0.7, hx + 3.2, hy + 0.4, '#a8301c');
    A.ell(hx - 0.2, hy + 0.5, 0.9, 0.7, g.lin, { ao: false });
    A.line(hx - 0.4, hy + 1.2, hx - 1.2, hy + 4.4, '#6a1810'); A.line(hx, hy + 1.2, hx + 0.2, hy + 4.6, '#a8301c');
    A.dkl(hx - 2.6, hy + 3.4, hx + 2.2, hy + 3.4, -1);   // the fold of the nape
  } else {
    // the near ear with its long Buddha lobe, gilded
    if (!side && V !== 'down') { A.limb([[hx - 2.9, hy - 0.4], [hx - 3.1, hy + 3.1]], 0.85, 1.05, SK, { tone: 0, edge: true }); A.dk(hx - 2.9, hy + 0.2, -2); }
    else if (V === 'down') for (const s of [-1, 1]) A.limb([[hx + s * 3.3, hy - 0.4], [hx + s * 3.5, hy + 3]], 0.8, 1.0, SK, { edge: true });
    else { A.limb([[hx - 0.8, hy - 0.2], [hx - 0.9, hy + 3.2]], 0.9, 1.1, SK, { edge: true }); A.dk(hx - 0.8, hy + 0.4, -2); }
    mkMask(A, J, g);
  }
  if (g.head === 'hood') {   // a small lacquered abbot's cap on the crown
    A.poly([[hx - 3.2, hy - 2.6], [hx - 2.8, hy - 4.9], [hx - 0.6, hy - 5.8], [hx + 1.8, hy - 5.6], [hx + 3.2, hy - 4.4], [hx + 3.4, hy - 2.6]], 'lacq', { edge: true });
    A.line(hx - 3.2, hy - 2.8, hx + 3.4, hy - 2.8, g.trimOn ? '#e8c050' : '#6a1810');
  }
}
function mkWeapon(A, J, g) {
  const [hx, hy] = J.haN, [ex, ey] = J.elN;
  if (g.wpn === 'spade') {
    let ang = J.pose === 'atk' ? Math.atan2(hy - ey, hx - ex) : 1.2; if (J.pose === 'atk' && J.ph <= 1) ang = -1.75;
    const at = (d, s = 0) => [hx + Math.cos(ang) * d - Math.sin(ang) * s, hy + Math.sin(ang) * d + Math.cos(ang) * s];
    A.limb([at(-9), at(11)], 0.6, 0.6, 'wood', {});
    A.poly([at(11, -2.8), at(11, 2.8), at(16.5, 2.4), at(18.5, 0), at(16.5, -2.4)], 'iron', { edge: true, n: [0.2, -0.2] });
    const e = at(18.3); A.px(e[0], e[1], '#d8dee4'); A.line(...at(12, -2.4), ...at(16.4, -2.2), '#8a9298');
    const tg = at(-9.3); A.ell(tg[0], tg[1], 0.9, 0.9, g.gold, {});
  } else if (g.wpn === 'shakujo') {
    const top = [hx + 0.5, hy - 26], bot = [hx - 0.4, Math.min(0.5, hy + 18)];
    if (J.pose === 'atk' && J.ph >= 2) { top[0] = hx + 20; top[1] = hy - 6; bot[0] = hx - 10; bot[1] = hy + 5; }
    A.limb([bot, top], 0.55, 0.5, 'lacq', {});
    A.limb([[top[0], top[1]], [top[0] - 2.2, top[1] - 2], [top[0] - 2, top[1] - 4.5], [top[0], top[1] - 5.8], [top[0] + 2, top[1] - 4.5], [top[0] + 2.2, top[1] - 2], [top[0], top[1]]], 0.45, 0.45, g.gold, { ao: false });
    A.ell(top[0], top[1] - 6.6, 0.7, 0.9, g.gold, {});
    const j = J.walk ? (J.ph % 2 ? 0.5 : -0.5) : 0;
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) A.ell(top[0] + s * (2.6 + (i % 2) * 0.3) + j * 0.5, top[1] - 1 - i * 1.3, 0.6, 0.6, g.gold, { ao: false });
  }
}
function mkPaint(A, J, g) {
  const V = J.view, back = J.back, R = g.robe, LN = g.lin, SK = g.skin, RM = g.rim;
  const [bx, by, brx, bry] = J.belly, [hx, hy] = J.head, sw = J.sw, walk = J.walk, sym = V === 'down' || V === 'up', side = V === 'side';
  const hemY = J.hemY, hw = J.hemW, sit = J.pose === 'sit', sY = J.sashY;
  const sL = J.shF, sR = J.shN, cy = J.chest[1], cx = J.chest[0];
  // the robe's follow-through: the hem swings a beat behind the stride, heavy silk
  const lag = walk ? Math.sin(J.a - 0.9) : 0, trail = walk && !sym ? -1.5 - Math.abs(sw) * 1.2 : 0, lite = J.wt === 0;
  const hemAt = x => hemY + 0.8 * Math.sqrt(Math.max(0, 1 - (x / (hw + 1)) ** 2)) + 0.75 * Math.abs(Math.sin((x / (hw + 1)) * 4 * Math.PI + 0.6 + lag * 0.5)) - 0.4 + (lite ? -0.5 : 0);   // the hem scallops where the pleats fall
  const feet = () => {
    if (sit) {
      for (const s of [-1, 1]) { const f = s < 0; A.ell(bx + s * 6, hemY - 1.5, 5.5, 2.3, SK, { tone: f ? -1 : 0, edge: true }); A.ell(bx + s * 9.5, hemY - 2, 1.6, 1.2, SK, { tone: f ? -1 : 0, edge: true }); }
      return;
    }
    for (const far of [true, false]) {
      const [ax, ay] = far ? J.ankF : J.ankN, t = far ? -1 : 0, dir = sym ? 0 : 1;
      // the ankle and shin, thick; a raised knee pushes the robe out
      A.limb([[ax - dir * 0.3, Math.min(ay - 4, hemY - 3)], [ax, ay - 1.4]], 2.1, 1.8, SK, { tone: t });
      if (J.kneeUp && !far) A.limb([[ax - 2, ay - 7], [ax, ay - 1.5]], 2.3, 1.9, SK, { tone: t });
      // the foot in a wooden-soled sandal, the madder thong over the instep
      if (dir) A.poly([[ax - 1.9, ay - 1.8], [ax + 1.4, ay - 1.8], [ax + 3.6, ay - 0.5], [ax + 3.8, ay + 0.4], [ax - 2.1, ay + 0.4]], SK, { tone: t, n: [0.1, -0.3], edge: true });
      else A.poly([[ax - 1.9, ay - 1.8], [ax + 1.9, ay - 1.8], [ax + 2.2, ay + 0.4], [ax - 2.2, ay + 0.4]], SK, { tone: t, n: [0, -0.3], edge: true });
      A.poly([[ax - 2.3, ay + 0.3], [ax + (dir ? 4.1 : 2.4), ay + 0.3], [ax + (dir ? 4.1 : 2.4), ay + 1.1], [ax - 2.3, ay + 1.1]], 'wood', { tone: t, edge: true });
      A.line(ax - 0.4, ay - 1.6, ax + (dir ? 1.8 : 1.2), ay - 0.4, mkHex(LN, far ? 1 : 3));
      if (!far) for (let i = 0; i < 3; i++) A.px(ax + (dir ? 2.4 + i * 0.5 : -1 + i), ay + 0.1, mkHex(SK, 1));   // the toes
    }
  };
  // the under-robe (madder), a hand longer than the outer silk
  const underHem = () => { if (sit) return; A.poly([[-hw + 1 + trail, hemY - 5], [hw - 0.5, hemY - 5], [hw - 0.2 + lag * 0.4, hemY + 0.6], [-hw + 0.8 + trail + lag * 0.4, hemY + 0.6]], LN, { n: [0, 0.1], fold: { cx: 0, y0: hemY - 5, y1: hemY + 1, w0: hw, w1: hw, n: 7, amp: 0.4, curve: 0.6 } }); };
  // the outer robe's skirt: a heavy bell of silk from the sash to the ankle, pleated, swinging behind the stride
  const skirt = () => {
    if (sit) { A.poly([[bx - brx - 1.5, sY - 1], [bx + brx + 1.5, sY - 1], [bx + brx + 7, hemY - 0.5], [bx - brx - 7, hemY - 0.5]], R, { fold: { cx: bx, y0: sY, y1: hemY, w0: brx, w1: brx + 7, n: 6, amp: 0.6, curve: 0.7 } }); return; }
    const pts = [[bx - brx + 1, sY - 2], [bx + brx - 1, sY - 2]];
    pts.push([hw + 0.5 + lag * 0.8, hemY - 3]);
    const n = 14; for (let i = 0; i <= n; i++) { const u = 1 - i / n, x = -hw + trail + (2 * hw - trail) * u; pts.push([x + lag * 0.9 * (1 - u * 0.5), hemAt(x)]); }
    pts.push([-hw - 0.5 + trail * 1.1 + lag * 0.6, hemY - 3]);
    A.poly(pts, R, { rough: 0.7, fold: { cx: bx * 0.5, y0: sY, y1: hemY, w0: brx - 1, w1: hw + 1, n: side ? 6 : 8, amp: 1.25, ph: lag * 0.8 + 0.3, curve: 0.8, skew: trail * 0.5 + lag }, ax: 0, ay: sY });
    // the kesa's patchwork: the skirt is sewn from rectangles of silk, the seams stitched (a dark seam, pale stitches)
    if (!sit) {
      const yS = sY + (hemY - sY) * 0.55;
      for (let x = -hw + 1.5 + trail; x < hw - 1; x += 0.5) { const y = yS + Math.sin(x * 0.7 + lag) * 0.4; A.dk(x, y, -2); if (Math.round(x * 2) % 3 === 0) A.dk(x, y - 0.6, 1); }
      for (const f of [-0.5, 0, 0.5]) { const x0 = bx * 0.5 + f * (brx - 1), x1 = f * hw + lag * 0.6; for (let u = 0.05; u < 0.95; u += 0.07) { const x = x0 + (x1 - x0) * u, y = sY + 2 + (hemY - 2 - sY) * u; A.dk(x, y, -1); if (Math.round(u * 28) % 2 === 0) A.dk(x + 0.6, y, 1); } }
    }
    // the deep valleys between the heaviest pleats, broken where the cloth turns, each with a lit ridge beside it
    for (const f of side ? [-0.4, 0.3] : [-0.72, -0.3, 0.12, 0.5, 0.82]) {
      const x0 = bx * 0.5 + f * (brx - 1.5), x1 = f * (hw + 0.5) + lag * 0.8 + trail * 0.3 * (f < 0 ? 1 : 0), y0 = sY + 1.5, y1 = hemAt(x1) - 0.8;
      for (let u = 0; u < 1; u += 0.08) { if (mkH(Math.floor(u * 12), Math.floor(f * 10 + 20)) < 0.2) continue; const x = x0 + (x1 - x0) * u + Math.sin(u * 5 + f * 3) * 0.25, y = y0 + (y1 - y0) * u; A.dk(x, y, u < 0.25 ? -1 : -2); A.dk(x - 0.7, y, 1); }
    }
    // the gold brocade border of the hem
    for (let x = -hw + trail + 0.5; x <= hw - 0.3; x += 0.5) { const xx = x + lag * 0.9 * (1 - (hw - x) / (2 * hw) * 0.5); const HB = g.night >= 1 ? 'silkK' : RM; A.px(xx, hemAt(x) - 0.6, mkHex(HB, (Math.floor(x * 2) % 4 === 0) ? 4 : 2)); A.px(xx, hemAt(x) - 1.1, mkHex(HB, 1)); }
  };
  // the coat: the silk over the shoulders and down his flanks and back, open in front over the bare body
  const coat = () => {
    // (narrower than the belly below the chest: the belly makes his silhouette, the silk hangs behind it)
    const pts = [[hx - 3, hy + 4], [sL[0] + 2, sL[1] - 0.6], [sL[0] - 1.2, sL[1] + 0.6], [sL[0] - 2.4, sL[1] + 3.5], [bx - brx + 0.6, by - 4], [bx - brx + 1.4, sY + 1],
      [bx + brx - 1.4, sY + 1], [bx + brx - (side ? 1 : 0.6), by - 4], [sR[0] + 2.4, sR[1] + 3.5], [sR[0] + 1.2, sR[1] + 0.6], [sR[0] - 2, sR[1] - 0.6], [hx + 3.4, hy + 4]];
    A.poly(pts, R, { tone: 0, rough: 0.6, fold: { cx: bx, y0: sL[1], y1: sY, w0: 10, w1: brx + 2, n: 4, amp: 0.7, curve: 0.9 }, ax: bx, ay: sL[1] });
  };
  // the open front of the coat: two lapels with gold brocade, falling from the neck past the chest, pushed out by the belly
  const lapels = () => {
    for (const s of side ? [1] : [-1, 1]) {
      const n0 = [hx + s * (side ? 1.8 : 2.4) - 0.2, hy + 5.2], sh = s < 0 ? sL : sR;
      if (side) {   // in profile the coat's open edge runs down behind the chest and the belly
        const e = [n0, [cx + 1.5, cy + 3], [bx - 3, by - 1], [bx - 4.5, sY]];
        A.poly([[sh[0] - 1, sh[1] - 1.5], ...e, [bx - 8, sY], [bx - 8.5, by], [sh[0] - 3, sh[1] + 3]], R, { tone: 0, n: [0.3, -0.1], edge: true, fold: { cx: bx - 6, y0: sh[1], y1: sY, w0: 3, w1: 3, n: 2, amp: 0.4 }, ax: sh[0], ay: sh[1] });
        A.limb(e, 0.75, 0.75, RM, { round: 0.6, ax: n0[0], ay: n0[1] });
        continue;
      }
      const pts = s < 0 ? [[sh[0] + 1, sh[1] - 1.8], n0, [cx - 5.5, cy + 2], [bx - brx + 2.2, by - 2], [bx - brx + 1.4, sY], [bx - brx + 0.2, sY], [bx - brx + 0.2, by - 3], [sh[0] - 1.5, sh[1] + 2]]
        : [[sh[0] - 1, sh[1] - 1.8], n0, [cx + (side ? 4 : 6), cy + 2], [bx + brx - (side ? 0.6 : 1.4), by - 1], [bx + brx - 1, sY], [bx + brx - 0.2, sY], [bx + brx - 0.2, by - 3], [sh[0] + 1.5, sh[1] + 2]];
      A.poly(pts, R, { tone: s < 0 ? -1 : 0, n: [s * 0.35, -0.1], edge: true, fold: { cx: bx + s * brx, y0: sh[1], y1: sY, w0: 3, w1: 2, n: 2, amp: 0.4, curve: 0 }, ax: sh[0], ay: sh[1] });
      // the brocade band along its inner edge
      const e = s < 0 ? [n0, [cx - 5.5, cy + 2], [bx - brx + 2.2, by - 2], [bx - brx + 1.4, sY]] : [n0, [cx + (side ? 4 : 6), cy + 2], [bx + brx - (side ? 0.6 : 1.4), by - 1], [bx + brx - 1, sY]];
      A.limb(e, 0.75, 0.75, RM, { tone: s < 0 ? -1 : 0, round: 0.6, ax: n0[0], ay: n0[1] });
    }
  };
  // the body: the gilded chest and the vast belly, bare
  const body = () => {
    // one sculpted mass: the chest, the heavy breasts, the vast belly and the sag of it over the sash, meeting in creases
    const bl = side ? [[cx, cy + 0.5, 6.2, 5.4, 5], [cx + 3, cy + 1.4, 3.6, 3.4, 6.2], [bx, by, brx, bry, 9], [bx + 0.5, by + 2.6, brx * 0.9, bry * 0.76, 9.3]]
      : [[cx - 0.5, cy + 0.5, 8.6, 5.4, 5], [cx + 3.2, cy + 1.5, 4.3, 3.5, 6.3], [cx - 4.4, cy + 1.6, 3.7, 3.2, 5.7], [bx, by, brx, bry, 9], [bx + 0.8, by + 2.6, brx * 0.92, bry * 0.78, 9.4], [bx - brx + 1.8, by + 2.5, 3, 5.2, 6.2]];
    A.blob(bl, SK, { ax: bx, ay: by });
    // the crease under the breasts, the navel, the fold where the belly hangs over the sash
    if (!side) { A.dkl(cx - 6.5, cy + 3.8, cx - 2.5, cy + 4.6, -2); A.dkl(cx + 0.5, cy + 4.6, cx + 6.5, cy + 4.2, -2); A.dkl(cx - 1.5, cy + 3.2, cx + 0.2, cy + 4.3, -1); }
    else A.dkl(cx + 1, cy + 4.5, cx + 6, cy + 3.8, -2);
    const nv = [bx + (side ? brx - 3 : sym ? 0 : 2.4), by + 1.5]; A.dk(nv[0], nv[1], -3); A.dk(nv[0], nv[1] + 0.5, -3); A.dk(nv[0] - 0.5, nv[1] - 0.5, 1); A.dk(nv[0], nv[1] + 1, 1);
    A.dkl(bx - brx + 3, by + bry - 1.6, bx + brx - 3, by + bry - 1.4, -1);
    if (!side) { A.dkl(bx - brx + 1.5, by + 1, bx - brx + 3.5, by + 5, -2); A.dkl(bx - brx + 1.8, by + 0.5, bx - brx + 3.8, by + 4.4, 1); A.dkl(bx + brx - 2.2, by + 2, bx + brx - 3.6, by + 5.5, -1); }   // the fat folding at his flanks
    // the light pooled on the dome and a scatter of wear
    for (const [ox, oy] of [[-4.5, -4.5], [-5, -3.5], [-3.5, -5.2]]) A.dk(bx + ox, by + oy, 1);
  };
  // the sash under the belly: a heavy black lacquer-silk band, knotted at the near hip, its ends hanging; the ofuda on it
  const sash = () => {
    const x0 = bx - brx - 0.6, x1 = bx + brx + 0.6, y = sY;
    A.poly([[x0, y - 2.2], [bx, y - 1.2], [x1, y - 2.4], [x1 + 0.4, y + 2.2], [bx, y + 3.2], [x0 - 0.3, y + 2.4]], 'lacq', { n: [0, 0.1], rough: 0.3, fold: { cx: bx, y0: y - 2, y1: y + 3, w0: brx, w1: brx, n: 5, amp: 0.5 }, ax: bx, ay: y });
    A.line(x0 + 0.5, y + 0.2, x1 - 0.5, y, mkHex(RM, 2));
    const kx = side ? bx + brx - 3 : sym ? bx : bx + brx - 4, ky = y + 0.4;
    A.ell(kx, ky, 1.5, 1.3, 'lacq', { edge: true });
    for (let i = 0; i < 7; i++) { const cx0 = x0 + 1 + (x1 - x0 - 2) * mkH(i, 3), cy0 = y - 1 + mkH(i, 5) * 2.5; A.dk(cx0, cy0, 2); A.dk(cx0 + 0.6, cy0, 1); }   // the lacquer chipped to the pale undercoat
    for (const s2 of [-1, 1]) { const tx = kx + s2 * 1.6 + lag * 0.3; A.line(kx + s2 * 0.8, ky + 0.6, tx, ky + 4.5, mkHex(g.lin, 2)); A.limb([[tx, ky + 4.5], [tx + lag * 0.3, ky + 6.3]], 0.5, 0.7, g.gold, { edge: true }); }   // cords with gold tassels
    A.limb([[kx - 0.5, ky + 1], [kx - 1 + lag * 0.6, ky + 6], [kx - 0.8 + lag, ky + 9]], 0.8, 0.95, 'lacq', { edge: true });
    A.limb([[kx + 0.5, ky + 1], [kx + 1.4 + lag * 0.6, ky + 5], [kx + 2 + lag, ky + 7]], 0.8, 0.9, 'lacq', { tone: -1, edge: true });
    const n = side ? 2 : sym ? 3 : 3; for (let i = 0; i < n; i++) { const x = x0 + 2.5 + (kx - 3 - x0 - 2.5) * i / Math.max(1, n - 1); if (!sym || Math.abs(x - bx) > 2) mkOfuda(A, x, y + 1.5 - Math.abs(x - bx) * 0.05, g, i === 0 && !side, lag * 0.7 + (walk ? Math.sin(J.ph + i) * 0.3 : 0)); }
  };
  if (!back) {
    if (g.tier >= 1) mkHalo(A, J, g);
    if (!sit && !sym) mkArm(A, J.shF, J.elF, J.haF, J.hF, g, true);
    feet();
    underHem();
    coat();
    skirt();
    body();
    lapels();
    sash();
    if (sym || sit) mkArm(A, J.shF, J.elF, J.haF, J.hF, g, false, 'sleeve');
    mkArm(A, J.shN, J.elN, J.haN, J.hN, g, false, 'sleeve');
    // the mala on the chest
    if (side) mkMala(A, hx + 2.2, hy + 4.2, 2.2, 6.5, 8, g); else mkMala(A, hx + (sym ? 0 : 0.8), hy + 4.6, sym ? 5.6 : 5.2, 10, 14, g);
    mkHead(A, J, g);
    if (sym || sit) mkArm(A, J.shF, J.elF, J.haF, J.hF, g, false, 'fore');
    mkArm(A, J.shN, J.elN, J.haN, J.hN, g, false, 'fore');
    mkWeapon(A, J, g);
  } else {
    // ---- from behind: the broad back of the coat, the sash knot, the kesa of madder across it, the skull and cords
    if (!sym) { mkArm(A, J.shN, J.elN, J.haN, J.hN, g, true); if (J.pose !== 'atk') mkWeapon(A, J, g); }
    feet();
    underHem();
    skirt();
    // the back of the coat: the whole silk, broad as a door, a seam down the spine, long folds from the shoulders
    const pts = [[hx - 3.6, hy + 4], [sL[0] + 2, sL[1] - 1.4], [sL[0] - 2, sL[1] + 0.4], [sL[0] - 3.6, sL[1] + 3.5], [bx - brx - 1.2, by - 3], [bx - brx - 1.5, by + 3], [bx - brx - 0.5, sY + 1.5],
      [bx + brx + 0.5, sY + 1.5], [bx + brx + 1.5, by + 3], [bx + brx + 1.2, by - 3], [sR[0] + 3.6, sR[1] + 3.5], [sR[0] + 2, sR[1] + 0.4], [sR[0] - 2, sR[1] - 1.4], [hx + 3.6, hy + 4]];
    A.poly(pts, R, { fold: { cx: bx, y0: sL[1], y1: sY, w0: 10, w1: brx + 1, n: 5, amp: 0.55, curve: 0.9, ph: 0.4 }, ax: bx, ay: sL[1] });
    A.dkl(bx - 0.5, cy - 2, bx - 0.3, sY - 1, -1);
    // the kesa: a stole of madder patchwork from the near shoulder across the back to the far hip, gold-bordered
    const k0 = sym ? [0, sR[1] - 1] : [sR[0] - 3, sR[1] - 1], k1 = sym ? [0, sY + 1] : [bx - brx + 1.5, sY + 1];
    A.poly([[k0[0] - 3.2, k0[1]], [k0[0] + 3.2, k0[1]], [k1[0] + 3.4, k1[1]], [k1[0] - 3.2, k1[1]]], LN, { n: [0.1, 0], edge: true, fold: { cx: (k0[0] + k1[0]) / 2, y0: k0[1], y1: k1[1], w0: 3, w1: 3, n: 1, amp: 0.3, curve: 0.5 }, ax: k0[0], ay: k0[1] });
    for (let i = 1; i < 5; i++) { const u = i / 5, q = [k0[0] + (k1[0] - k0[0]) * u, k0[1] + (k1[1] - k0[1]) * u]; A.dkl(q[0] - 3, q[1], q[0] + 3.2, q[1], -2); }
    A.line(k0[0] - 3.2, k0[1], k1[0] - 3.2, k1[1], mkHex(RM, 3)); A.line(k0[0] + 3.2, k0[1], k1[0] + 3.4, k1[1], mkHex(RM, 1));
    sash();
    mkHead(A, J, g);
    if (g.tier >= 1) mkHalo(A, J, g);
    if (sym) { mkArm(A, J.shN, J.elN, J.haN, J.hN, g, false, 'sleeve'); mkArm(A, J.shN, J.elN, J.haN, J.hN, g, false, 'fore'); }
    if (!sit) mkArm(A, J.shF, J.elF, J.haF, J.hF, g, false, 'sleeve');
    if (!sit) mkArm(A, J.shF, J.elF, J.haF, J.hF, g, false, 'fore');
    if (J.pose === 'atk') mkWeapon(A, J, g);
  }
  // the smear of the strike: the arm's path from the wound-up pose to the palm, a few streaks of lit gold and silk
  if ((J.pose === 'atk' && J.ph === 2) || (J.pose === 'flurry')) {
    const flu = J.pose === 'flurry', h1 = flu && J.ph % 2 ? J.haF : J.haN, s0 = flu && J.ph % 2 ? J.shF : J.shN, h0 = [s0[0] - 2 * MK_AS, s0[1] + 2 * MK_AS];
    const dx = h1[0] - h0[0], dy = h1[1] - h0[1], Ln = Math.hypot(dx, dy) || 1, px = -dy / Ln, py = dx / Ln;
    for (let i = -2; i <= 2; i++) { const k = Math.abs(i), e = 3 + k * 1.2; A.line(h0[0] + px * i * 0.9 + dx * 0.25 * k / 2, h0[1] + py * i * 0.9 + dy * 0.25 * k / 2, h1[0] - dx / Ln * e + px * i * 0.9, h1[1] - dy / Ln * e + py * i * 0.9, mkHex(k === 2 ? g.robe : SK, k === 0 ? 4 : k === 1 ? 3 : 2)); }
  }
  // light gathered in the palm while he casts: gold (Radiance), violet-black (Absence), stone dust (Destroyer)
  if (g.glow && ['cast', 'raise', 'grasp', 'clap', 'sun', 'chant', 'eye'].includes(J.pose)) {
    const q = back ? J.haF : J.haN, e = back ? J.elF : J.elN, r = [0.9, 1.3, 1.7, 1.5][J.ph % 4], C = g.glow === 'a' ? ['#1a1024', '#8a6ac8', '#d8c8ff'] : g.glow === 'd' ? ['#5a5448', '#bcb8ac', '#fffce8'] : ['#f0a020', '#ffe08a', '#fffbe8'];
    const dx = q[0] - e[0], dy = q[1] - e[1], Ln = Math.hypot(dx, dy) || 1, c = [q[0] + dx / Ln * 3, q[1] + dy / Ln * 3];
    for (let i = 0; i < 10; i++) { const a = i * 0.628 + J.ph * 0.5, rr = r + 1.2 + (i % 2) * 0.6; A.px(c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr, C[1]); }
    for (let yy = -r; yy <= r; yy += 0.5) for (let xx = -r; xx <= r; xx += 0.5) { const d = Math.hypot(xx, yy) / r; if (d <= 1) A.px(c[0] + xx, c[1] + yy, d < 0.5 ? C[2] : C[1]); }
    A.px(c[0] - r - 0.5, c[1], C[0]); A.px(c[0] + r + 0.5, c[1], C[0]);
  }
}
H32.monk = function (A, J0, g0) {   // kept for anything that asks the shared 32-bit rig for him: a plain stand-in
  A.ell(21, 30, 8, 9, '#8a6424', {}); A.ell(21, 16, 3, 3.5, '#b88626', {}); A.poly([[13, 30], [29, 30], [31, 46], [11, 46]], '#864616', {});
};
function mkGearMats(g) {
  const n = g.night || 0; g.trimOn = !!g.trimOn || g.trim === true;
  g.robe = 'silk' + n; g.lin = 'lin' + n; g.rim = 'rim' + (g.trimOn ? Math.max(0, n - 1) : n); g.gold = 'gilt' + n; g.mask = 'mask' + n; g.skin = g.obs ? 'obs' : 'gilt' + Math.min(n, 3);
  g.trim = g.rim;
}

// ------------------------------------------------------------------- frames: the sky in the robe, Weight in the body
function monkNight() {
  if (P.kwalk || P.kmirror > 0 || P.knothing > 0) return 4;
  if (!G.zone) return 0;
  const k = KS.skyK(); if (k == null) return 2;   // underground: dusk
  return clamp(Math.round((1 - k) * 4), 0, 4);
}
function monkWtBucket() { if (P.kpoise) return 3; const w = P.weight; return w >= 66 ? 2 : w <= 34 ? 0 : 1; }
// the frame, in world pixels: 80 x 76 with the feet at (40, 70). The painting is its _hr twin at 160 x 152.
const MK_FW = 80, MK_FH = 76, MK_OX = 40, MK_OY = 70, MK_DRAIN = [0, 0.16, 0.42, 0.74, 1.4];
function mkFrame(pose, ph, view, g) {
  const key = '36|monk|' + pose + '|' + ph + '|' + g.key + '|' + view + '|' + g.night + '|' + g.wt + (g.obs ? 'o' : '') + (g.glow || '') + (g.eye ? 'e' : '');
  let fr = HERO_FR[key]; if (fr) return fr;
  const A = mkHD(MK_FW, MK_FH, MK_OX, MK_OY), J = mkRig(pose, ph, view, g.wt);
  const g2 = Object.assign({}, g, { walk: pose === 'walk', sw: J.sw }); mkGearMats(g2);
  mkPaint(A, J, g2);
  const hd = A.render({ drain: MK_DRAIN[clamp(g.night || 0, 0, 4)], oy: MK_OY, dy0: 0.5 });
  const W2 = A.W, H2 = A.H, flip = src => { const f = mkCanvas(src.width, src.height), fx = f.getContext('2d'); fx.translate(src.width, 0); fx.scale(-1, 1); fx.drawImage(src, 0, 0); return f; };
  // the world-grain copy (what the game measures and what older code reads), each with its fine twin
  const lo = src => { const c = mkCanvas(MK_FW, MK_FH), cx = c.getContext('2d'); cx.imageSmoothingEnabled = false; cx.drawImage(src, 0, 0, MK_FW, MK_FH); c._hr = src; return c; };
  const tint = (src, col) => { const s = src._hr || src, q = mkCanvas(s.width, s.height), qx = q.getContext('2d'); qx.drawImage(s, 0, 0); qx.globalCompositeOperation = 'source-in'; qx.fillStyle = col; qx.fillRect(0, 0, s.width, s.height); return src._hr ? lo(q) : q; };
  const hdf = flip(hd), c = lo(hd), f = lo(hdf);
  fr = { c, f, fl: tint(c, '#fff'), flf: tint(f, '#fff'), w: MK_FW, h: MK_FH, ox: MK_OX, oy: MK_OY, bb: { x: MK_OX - 13, y: MK_OY - 52, w: 26, h: 53 }, tint, hd: true };
  HERO_FR[key] = fr; return fr;
}
// the bright gold pixels of a frame (the plates' highlights), cached on it: perfect poise runs a shimmer over them
function mkGoldPts(fr, face) {
  const k = face < 0 ? '_gf' : '_gc'; if (fr[k]) return fr[k];
  const c0 = face < 0 ? fr.f : fr.c, c = c0._hr || c0, W = c.width, Hh = c.height, s = W / fr.w, d = c.getContext('2d').getImageData(0, 0, W, Hh).data, out = [];
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (d[i + 3] > 200 && d[i] > 170 && d[i + 1] > 120 && d[i + 2] < 150 && d[i] - d[i + 2] > 70 && ((x * 7 + y * 13) % 5 === 0)) out.push([x / s, y / s]); }
  out.s = 1 / s; return fr[k] = out;
}
// a silhouette of a frame in one colour (for the afterimages), cached on it
function mkSil(fr, face, col) { const k = '_s' + col + (face < 0 ? 'f' : 'c'); return fr[k] || (fr[k] = fr.tint(face < 0 ? fr.f : fr.c, col)); }
{
  const _hf = heroFrame;
  heroFrame = function (cls, pose, ph, view) {
    if (cls !== 'monk') return _hf(cls, pose, ph, view);
    if (!view) view = P._view || (P._fb ? 'back' : 'front');
    if ((view === 'down' || view === 'up') && !(pose === 'idle' || pose === 'walk')) view = view === 'down' ? 'front' : 'back';
    if (!MK_PH[pose]) pose = 'idle';
    const g = heroGear(); g.night = G.running ? monkNight() : 0; g.obs = P.kobsid > 0; g.wt = G.running && isMonk() ? monkWtBucket() : 1;
    if (g.wpn && !['wraps', 'iwraps', 'spade', 'shakujo'].includes(g.wpn)) g.wpn = null;
    const tab = P.kposeId && SK[P.kposeId] ? SK[P.kposeId].tab : -1; g.glow = G.running && isMonk() ? (tab === 1 ? 'a' : tab === 2 ? 'd' : tab === 0 ? 'r' : '') : 'r';
    g.eye = pose === 'eye';
    return mkFrame(pose, ph % (MK_PH[pose] || 4), view, g);
  };
  // the skills' own poses: each cast picks its pose and runs through its phases
  const MK_SKPOSE = { kdawn: 'raise', keclipse: 'raise', kfist: 'raise', kamber: 'chant', khands: 'flurry', kstar: 'breath', ksutra: 'cast', ktears: 'weep', kbell: 'chant', kpalm: 'grasp', kclap: 'clap', kbowl: 'chant', kspade: 'atk', kpinch: 'grasp',
    kbelow: 'grasp', kspit: 'breath', kwalk: 'chant', kmirror: 'chant', knothing: 'chant', kgrip: 'grasp', kfinger: 'atk', kobsid: 'chant', kmount: 'leap', kstep: 'stomp', kpagoda: 'slap', kweep: 'slap', kthousand: 'clap' };
  window.__mkSkPose = MK_SKPOSE;
  const _hp = heroPose;
  heroPose = function () {
    const r = _hp(); if (!isMonk()) return r;
    if (P.ksun > 0) return ['sun', Math.floor(G.time * 3) % 2];
    if (P.klotus) return ['sit', Math.floor(G.time * 3) % 2];
    if (P.keye) return ['eye', 0];
    if (P.kleap) return ['leap', 0];
    if (G.kflurry) return ['flurry', Math.floor(G.time * 16) % 4];
    if (G.kpalm) return ['grasp', 3];
    if (G.kthousand) return ['clap', 3];
    if (P.swing > (P._swL || 0) + 1e-6) P._sw0 = P.swing; P._swL = P.swing;
    if (P.cast > (P._caL || 0) + 1e-6) P._ca0 = P.cast; P._caL = P.cast;
    const prog = () => P.cast > 0 ? Math.min(3, Math.floor((1 - P.cast / Math.max(0.05, P._ca0 || 0.5)) * 4)) : 3;
    if (P.kposeT > 0 && P.kposeId && P.cast > 0) {
      const po = MK_SKPOSE[P.kposeId] || 'cast';
      if (po === 'atk') return ['atk', Math.min(3, prog() + 1)];
      if (po === 'chant') return ['chant', Math.floor(G.time * 4) % 2];
      if (po === 'weep') return ['weep', Math.floor(G.time * 8) % 4];
      return [po, prog()];
    }
    if (r[0] === 'atk') return ['atk', Math.min(3, Math.floor((1 - P.swing / Math.max(0.05, P._sw0 || 0.22)) * 4))];
    if (r[0] === 'cast') return ['cast', prog()];
    if (r[0] === 'walk') return ['walk', Math.floor(P._wd * 4.4) % 8];
    if (r[0] === 'idle') return ['idle', Math.floor(G.time * 2.2) % 4];
    return r;
  };
}
const MONK_BOX = { w: 26, h: 52 };   // v0.36: his body, sole to crown
// the hero on the map: sprite, fire, Weight
function drawMonk(alpha, lift) {
  const nothing = P.knothing > 0, q = iso(P.x, P.y), k = KS.skyK(), wk = P.weight;
  const [pose, ph] = heroPose(), fr = heroFrame('monk', pose, ph), face = P.face || 1;
  const X = Math.round(q.sx - (face < 0 ? fr.w - fr.ox : fr.ox)), Y = Math.round(q.sy + 3 - (fr.oy + 1) - lift);
  // light: the afterimages he leaves behind him, pale and quick
  for (const a of P.kghost || []) {
    const gf = heroFrame('monk', a.pose, a.ph, a.view); const s = mkSil(gf, a.face, a.col || '#bfe6ff'), aq = iso(a.x, a.y);
    ctx.globalAlpha = 0.5 * (a.t / a.t0) * alpha; ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(s, Math.round(aq.sx - (a.face < 0 ? gf.w - gf.ox : gf.ox)), Math.round(aq.sy + 3 - (gf.oy + 1) - (a.lift || 0)));
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  // by day a faint amber heat-shimmer; the sun is a small sun
  if (!nothing && P.ksun > 0) { ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 26 - lift, 50, '255,200,110', 0.35); ctx.globalCompositeOperation = 'source-over'; }
  // perfect poise: the ground cracks under him (no outline: v0.35), and the gold plates take a slow shimmer
  if (P.kpoise && !nothing) mkDrawFx({ k: 'crack', x: P.x, y: P.y, R: 1.5, n: 8, seed: 1.3, t: 1, t0: 1, glint: `rgb(255,${200 + Math.round(40 * Math.sin(G.time * 4))},100)` });
  if (alpha !== 1 || nothing) ctx.globalAlpha = alpha * (nothing ? 0.18 : 1);
  ctx.drawImage((P.hurt > 0 && OPT.flash) ? (face < 0 ? fr.flf : fr.fl) : (face < 0 ? fr.f : fr.c), X, Y);
  ctx.globalAlpha = 1;
  if (P.kpoise && !nothing) {
    const pts = mkGoldPts(fr, face), t = G.time * 1.6; ctx.fillStyle = 'rgba(255,244,200,0.85)';
    for (let i = 0; i < pts.length; i++) { const ph = (t + i * 0.37) % 1; if (ph < 0.08) ctx.fillRect(X + pts[i][0], Y + pts[i][1], pts.s || 1, pts.s || 1); }
  }
  if (!nothing && (k == null || k > 0.5) && Math.random() < 0.3) { ctx.fillStyle = 'rgba(255,240,180,0.9)'; ctx.fillRect(Math.round(q.sx + rand(-12, 12)), Math.round(q.sy - rand(4, 40) - lift), 1, 1); }
  if (P.kmirror > 0) { ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 24 - lift, 24, '120,90,170', 0.12 + 0.06 * Math.sin(G.time * 9)); ctx.globalCompositeOperation = 'source-over'; }
  // Amber-That-Eats-Itself: he burns. Flames lick up his robes and body, embers stream off him
  if (P.kamber && !nothing) mkDrawSelfFire(q.sx, q.sy - lift, face, fr);
  const sw = Math.round(MONK_BOX.w), sh = Math.round(MONK_BOX.h);
  return { x: Math.round(q.sx - sw / 2), y: Math.round(q.sy + 3 - sh - lift), w: sw, h: sh };
}
window.__mkFrame = (...a) => mkFrame(...a); window.__mkNoon = () => noonFistFrame(); window.__mkGolem = (x, y) => (G.golem = newGolem(x, y));   // test hooks (scale checks)

// ------------------------------------------------------------------- v0.37 effects: phosphor by day, the void by night
// Every effect is pixel clusters at the world grain, from three hand-picked ramps:
// - day: burning phosphorus. A white-gold core, a gold body, a frayed amber edge licking out in tongues, burning out
//   into embers and char. Never a soft round glow.
// - void (night, and the Absence tree): light swallowed. A black body whose edge is eaten ragged, a thin violet-grey rim
//   in broken flecks, and bites taken out of it as it closes.
// - stone (the Destroyer): dust and grit, lit from the upper left, with gold glints.
// A skill's effect is born with a white flash (or a black one), bursts with a smear, and settles fast into embers,
// ash or grit. Struck enemies are stripped to grey with gold light on their edges; the dead burn to a charred skeleton
// that stands a moment and clatters down (by day) or turn to black glass (by night).
const FXP = { day: ['#fffdf0', '#fff0a8', '#f4c44a', '#d8862a', '#96461a', '#40180e'], void: ['#000000', '#07050c', '#15101f', '#30264a', '#7a68a4', '#dcd2f6'], stone: ['#161412', '#322e2a', '#56514a', '#827c72', '#b0a998', '#e4dac2'] };
const FXR = { day: FXP.day.map(mkRGB), void: FXP.void.map(mkRGB), stone: FXP.stone.map(mkRGB) };
let FX_RIM = false;   // the post-light pass: only the void's lit rims are drawn again, over the dark
function mkDay() { if (typeof KS === 'undefined' || !G.zone) return true; const k = KS.skyK(); return k == null ? false : k > 0.5; }
const MKFX = {};
// a sprite built from a mask: tones by depth inside the shape (core deep inside, frayed edge outside), lit from the
// upper left; mode picks the ramp. inside(i, j) -> bool, on the sprite's own pixels.
function fxShape(key, Wd, Ht, inside, mode, seed, o) {
  if (MKFX[key]) return MKFX[key];
  o = o || {};
  const c = mkCanvas(Wd, Ht), x = c.getContext('2d'), img = x.createImageData(Wd, Ht), D = img.data, C = FXR[mode], IN = new Uint8Array(Wd * Ht);
  for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) IN[j * Wd + i] = inside(i + 0.5, j + 0.5) ? 1 : 0;
  const at = (i, j) => i >= 0 && j >= 0 && i < Wd && j < Ht && IN[j * Wd + i];
  const put = (i, j, col) => { const q = (j * Wd + i) * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255; };
  for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) {
    if (!at(i, j)) {   // the frayed fringe: a few pixels licking out from the edge
      if (o.fray === false) continue;
      let n = 0; for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (at(i + a, j + b)) n++;
      if (n && mkH(i * 13 + seed, j * 7 + seed) > (mode === 'stone' ? 0.8 : 0.62) && !(o.rimOnly && mode !== 'void')) put(i, j, C[mode === 'void' ? 4 : mode === 'stone' ? 2 : 3]);
      continue;
    }
    let d = 0; for (let r = 1; r <= 4; r++) { let all = true; for (let a = -r; a <= r && all; a++) for (let b = -r; b <= r; b++) if (Math.abs(a) + Math.abs(b) <= r && !at(i + a, j + b)) { all = false; break; } if (!all) break; d = r; }
    const litE = !at(i - 1, j) || !at(i, j - 1), darkE = !at(i + 1, j) || !at(i, j + 1);
    let ci;
    if (mode === 'day') ci = d >= 4 ? 1 : litE ? (d ? 1 : 0) : darkE ? (d ? 3 : 4) : d >= 1 ? 2 : 3;
    else if (mode === 'void') ci = d >= 2 ? 0 : d === 1 ? 1 : litE ? (mkH(i, j + seed) > 0.3 ? 5 : 4) : 3;
    else { ci = litE ? 4 : darkE ? 1 : d >= 2 ? 3 : 2; if (ci >= 3 && mkH(i * 3 + seed, j) > 0.93) ci = 5; if (ci === 3 && mkH(i, j * 5 + seed) > 0.85) ci = 2; }
    if (o.gold && mode === 'stone' && litE && mkH(i + 7, j + seed) > 0.7) { put(i, j, FXR.day[2]); continue; }
    if (o.rimOnly && ci < 4) continue;
    put(i, j, C[ci]);
  }
  x.putImageData(img, 0, 0); return (MKFX[key] = c);
}
// a burst: a ragged disc that flashes white-hot (or black), swells, frays and burns out in embers (8 frames)
function fxBurstSpr(mode, r, fi, sv) {
  const ro = FX_RIM && mode === 'void';
  r = Math.max(2, Math.min(44, Math.round(r))); const key = 'bu' + mode + r + '|' + fi + '|' + sv + (ro ? 'r' : ''); if (MKFX[key]) return MKFX[key];
  const S = r * 2 + 9, c = mkCanvas(S, S), x = c.getContext('2d'), img = x.createImageData(S, S), D = img.data, C = FXR[mode], k = fi / 7, cx = S / 2, cy = S / 2;
  const put = (i, j, col) => { const q = (j * S + i) * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255; };
  const NS = 14 + (r >> 1), vn = a => { const t = (a / 6.2832 + 0.5) * NS, i = Math.floor(t), f = t - i, h = n => mkH(((n % NS) + NS) % NS, sv * 31 + 5 + r); return h(i) + (h(i + 1) - h(i)) * f * f * (3 - 2 * f); };
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const dx = i + 0.5 - cx, dy = j + 0.5 - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const grow = mode === 'void' ? Math.sin(Math.min(1, k * 1.25) * Math.PI * 0.5) * (k > 0.7 ? 1 - (k - 0.7) * 1.6 : 1) : 0.35 + 0.65 * Math.sqrt(k);
    const edge = r * grow * (0.7 + 0.5 * vn(a));
    if (d > edge + 0.5) {
      const tg = mkH(Math.floor((a + 3.1416) * r * 0.8), sv * 7 + fi);
      if (tg > 0.8 && d < edge + 1 + (tg - 0.8) * r * 1.4 * (1 - k * 0.6)) put(i, j, C[mode === 'void' ? (tg > 0.93 ? 5 : 4) : tg > 0.93 ? 2 : 3]);
      continue;
    }
    const u = d / Math.max(1, edge);
    let ci;
    if (mode === 'void') {
      ci = u > 0.86 ? (mkH(i * 3 + j, fi + sv) > 0.4 ? 5 : 4) : u > 0.74 ? 3 : u > 0.5 ? 1 : 0;
      if (k > 0.55 && u > 0.5 && mkH(Math.floor(i / 2) + sv, Math.floor(j / 2) * 5 + fi) < (k - 0.55) * 2.2) continue;   // bites taken out as it closes
    } else if (mode === 'stone') {
      ci = u > 0.85 ? 1 : u > 0.6 ? 2 : 3; if (dx + dy < -edge * 0.4) ci++;
      if (mkH(i * 7 + sv, j * 3 + fi) < k * 0.9) continue;
      if (mkH(i, j * 9 + sv) > 0.94) ci = 5;
    } else {
      const core = (1 - k) * 0.5; ci = u < core ? 0 : u < core + 0.2 ? 1 : u < 0.72 ? 2 : u < 0.9 ? 3 : 4;
      if (k > 0.45) { if (mkH(i * 7 + sv, j * 3 + fi) < (k - 0.45) * 1.7) continue; ci = Math.min(5, ci + 1 + (k > 0.8 ? 1 : 0)); }
    }
    if (ro && ci < 4) continue;
    put(i, j, C[Math.max(0, Math.min(5, ci))]);
  }
  x.putImageData(img, 0, 0); return (MKFX[key] = c);
}
function fxBurst(sx, sy, r, k, mode, sv, alpha, sq) {
  const fi = Math.max(0, Math.min(7, Math.floor(k * 8))), s = fxBurstSpr(mode, r, fi, (sv | 0) % 3);
  if (alpha != null) ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  if (sq) ctx.drawImage(s, Math.round(sx - s.width / 2), Math.round(sy - s.height * sq / 2), s.width, Math.max(1, Math.round(s.height * sq)));
  else ctx.drawImage(s, Math.round(sx - s.width / 2), Math.round(sy - s.height / 2));
  ctx.globalAlpha = 1;
}
// a ring on the ground: a line of white-gold fire licking up in tongues (day), a band of black with violet flecks,
// eaten in gaps (void), or a rolling rim of grit (stone). It breaks up as it spends itself.
function fxRing(sx, sy, R, k, mode, w, seed, lick) {
  const rx = R * ISO_R, ry = R * ISO_RY, C = FXP[mode], per = Math.max(24, Math.round(Math.PI * (rx + ry) * 1.1)), sd = Math.floor((seed || 0) * 97);
  w = Math.max(1, Math.round(w || 2));
  for (let i = 0; i < per; i++) {
    const a = i / per * 6.2832, x = Math.round(sx + Math.cos(a) * rx), y = Math.round(sy + Math.sin(a) * ry), h = mkH(i + sd, 3), h2 = mkH((i >> 2) + sd, 5);
    if (mode === 'void') {
      if (h2 < 0.2 + k * 0.55) continue;
      if (!FX_RIM) { ctx.fillStyle = C[1]; ctx.fillRect(x, y - 1, 1, w); ctx.fillStyle = C[0]; ctx.fillRect(x, y, 1, Math.max(1, w - 2)); }
      if (h > 0.4) { ctx.fillStyle = C[h > 0.8 ? 5 : 4]; ctx.fillRect(x, y - 1 - (h > 0.85 ? 1 : 0), 1, 1); }
      continue;
    }
    if (mode === 'stone') {
      if (h2 < k * 0.65) continue;
      ctx.fillStyle = C[h > 0.55 ? 3 : 2]; ctx.fillRect(x, y - 1, 1, w); ctx.fillStyle = C[1]; ctx.fillRect(x, y - 1 + w, 1, 1);
      if (h > 0.88) { ctx.fillStyle = h > 0.97 ? FXP.day[2] : C[5]; ctx.fillRect(x, y - 2, 1, 1); }
      continue;
    }
    if (h2 < k * 0.75 - 0.12) continue;
    ctx.fillStyle = C[3]; ctx.fillRect(x, y - 1, 1, w);
    ctx.fillStyle = C[k < 0.45 ? 0 : k < 0.7 ? 1 : 2]; ctx.fillRect(x, y - 1, 1, Math.max(1, w - 1));
    const tl = lick ? Math.floor(h * h * lick * (1.1 - k)) : 0;
    if (tl > 0) { ctx.fillStyle = C[2]; ctx.fillRect(x, y - 1 - tl, 1, tl); ctx.fillStyle = C[tl > 2 ? 4 : 3]; ctx.fillRect(x, y - 1 - tl, 1, 1); }
  }
}
// a beam: a white core, a gold body, sparks fraying off its sides (day); a black cut with violet flecks (void)
function fxBeam(x0, y0, x1, y1, w, mode, seed, fray) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux, C = FXP[mode], sd = Math.floor(seed || 0);
  for (let s = 0; s <= L; s++) {
    const x = x0 + ux * s, y = y0 + uy * s, h = mkH(s + sd, 9), h2 = mkH((s >> 2) + sd, 13), hw = w * (0.75 + 0.5 * h2);
    const n = Math.ceil(hw);
    if (mode === 'day' && !FX_RIM) { ctx.fillStyle = C[5]; ctx.fillRect(Math.round(x + px * (n + 1)), Math.round(y + py * (n + 1)), 1, 1); ctx.fillRect(Math.round(x - px * (n + 1)), Math.round(y - py * (n + 1)), 1, 1); }   // a char edge, so the white reads on a pale ground
    for (let o = -n; o <= n; o++) {
      const d = Math.abs(o) / (hw || 1); if (d > 1) continue;
      const ci = mode === 'void' ? (d > 0.7 ? (h > 0.3 ? (o < 0 ? 5 : 4) : 3) : d > 0.4 ? 1 : 0) : (d < 0.3 ? 0 : d < 0.55 ? 1 : d < 0.82 ? 2 : 3);
      if (FX_RIM && ci < 4) continue;
      ctx.fillStyle = C[ci]; ctx.fillRect(Math.round(x + px * o), Math.round(y + py * o), 1, 1);
    }
    if (fray !== false && h > 0.84) { const sg = (s & 1) ? 1 : -1, e = hw + 1 + h2 * 3; ctx.fillStyle = C[mode === 'void' ? 5 : h > 0.95 ? 1 : 3]; ctx.fillRect(Math.round(x + px * e * sg), Math.round(y + py * e * sg), 1, 1); }
  }
}
// a smear: the path of a fast blow as streaks, bright at the head, frayed and dimmer at the tail
function fxSmear(x0, y0, x1, y1, w, mode, k) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, px = -dy / L, py = dx / L, C = FXP[mode];
  for (let o = -w; o <= w; o++) {
    const len = L * (1 - Math.abs(o) / (w + 1) * 0.6) * (1 - k * 0.7), st = L - len;
    for (let s = st; s <= L; s += 1) { const u = (s - st) / Math.max(1, len); if (mkH(Math.floor(s) + o * 31, 7) > 0.3 + u * 0.7) continue; ctx.fillStyle = C[mode === 'void' ? (u > 0.8 ? 4 : 1) : u > 0.85 ? 0 : u > 0.6 ? 1 : u > 0.3 ? 2 : 3]; ctx.fillRect(Math.round(x0 + dx / L * s + px * o), Math.round(y0 + dy / L * s + py * o), 1, 1); }
  }
}
// a licking flame (11x18, base at the bottom middle): white-gold at the root, gold, amber tongues, char at the tips;
// or (mkFireV) a black flame with a violet edge
function mkFlameFrame(v, ph, mat) {
  const key = 'fl2' + v + ph + (mat || ''); if (MKFX[key]) return MKFX[key];
  const Wd = 11, Ht = 18, c = mkCanvas(Wd, Ht), x = c.getContext('2d'), img = x.createImageData(Wd, Ht), D = img.data, vd = mat === 'mkFireV', C = vd ? FXR.void : FXR.day;
  const h = [14, 16, 13, 15][(ph + v) % 4] - v, sw = [0, 1, 0, -1][ph];
  for (let j = 0; j < Ht; j++) {
    const t = (Ht - 1 - j) / h; if (t > 1.08) continue;
    const cxj = 5.5 + sw * t * t * 1.8 + Math.sin(t * 5 + ph + v) * 0.7 * t, hw = 4.4 * Math.pow(Math.max(0, 1 - Math.min(1, t)), 0.75) * (1 - 0.18 * Math.sin(t * 9 + v)) + 0.3;
    for (let i = 0; i < Wd; i++) {
      const d = Math.abs(i + 0.5 - cxj) / Math.max(0.4, hw);
      if (d > 1 && !(d < 1.6 && mkH(i * 5 + ph, j * 3 + v) > 0.78)) continue;
      let ci;
      if (vd) ci = d > 0.8 ? (mkH(i, j + ph) > 0.5 ? 5 : 4) : t > 0.85 ? 3 : d > 0.45 ? 1 : 0;
      else ci = d > 1 ? 3 : t > 0.88 ? 5 : t > 0.7 ? 4 : d > 0.72 ? 3 : (d > 0.4 || t > 0.45) ? 2 : t > 0.22 ? 1 : 0;
      const q = (j * Wd + i) * 4, col = C[ci]; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0); return (MKFX[key] = c);
}
const fxMode = mat => mat === 'mkVoidFx' || mat === 'mkFireV' ? 'void' : mat === 'mkStoneFx' ? 'stone' : 'day';
// an open palm print, fingers up (15x18)
function mkPalmFrame(mat) {
  const mode = fxMode(mat);
  const ro = FX_RIM && mode === 'void';
  return fxShape('palm' + mode + (ro ? 'r' : ''), 15, 18, (x, y) => {
    if (((x - 7.5) / 5) ** 2 + ((y - 11.5) / 4.4) ** 2 <= 1) return true;
    for (const [fx, t, l] of [[3.6, 7.8, 4.4], [6.1, 6.2, 5.8], [8.7, 6.2, 6], [11.2, 7.6, 4.6]]) if (Math.abs(x - fx - (fx - 7.5) * 0.12 * (t + 2 - y) / l) < 1.05 && y > t + 2 - l && y < t + 3) return true;
    return Math.hypot(x - 2.2, y - 11) < 1.4 || Math.hypot(x - 1.4, y - 9.4) < 1.2;
  }, mode, 3, { gold: true, rimOnly: ro });
}
// a ghostly arm thrown out along an angle (44x44, shoulder at the centre): a great sleeve, a forearm, a palm or fist
function mkArmFxFrame(ai, kind, mat) {
  const mode = fxMode(mat), a = ai / 16 * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
  const ro = FX_RIM && mode === 'void';
  return fxShape('arm' + ai + kind + mode + (ro ? 'r' : ''), 44, 44, (x, y) => {
    const u = (x - 22) * ca + (y - 22) * sa, w = -(x - 22) * sa + (y - 22) * ca;
    if (u < 0 || u > 24) return false;
    const r = u < 9 ? 4.6 + u * 0.1 : u < 17 ? 2.9 - (u - 9) * 0.05 : u < 22 ? 3.5 : kind === 'palm' ? (Math.abs(w) < 3.2 && Math.abs(w % 1.6) > 0.3 ? 3.3 : 0) : 2.6;
    return Math.abs(w) <= r;
  }, mode, ai, { gold: true, rimOnly: ro });
}
// a stone spear of bedrock (11x24), three heights; gold glints where the light catches its break
function mkSpikeFrame(v, road) {
  const h = [22, 18, 14][v];
  return fxShape('sp2' + v + (road ? 'r' : ''), 11, 24, (x, y) => { const t = (23 - y) / h; if (t < 0 || t > 1) return false; const c = 5.5 + (t > 0.5 ? (t - 0.5) * 1.4 : 0) - (x > 5.5 ? 0.3 : 0), hw = 4.6 * (1 - t) + 0.4 + (mkH(Math.floor(y), v) - 0.5) * 0.8; return Math.abs(x - c) < hw; }, 'stone', v + 5, { gold: !!road });
}
// the lotus petal of solid light (9x12)
function mkPetalFrame() { return fxShape('petal2', 9, 12, (x, y) => { const t = (y - 0.5) / 11; if (t < 0 || t > 1) return false; return Math.abs(x - 4.5) < 3.8 * Math.sin(Math.PI * Math.pow(t, 0.7)) + 0.2; }, 'day', 2); }
// an ofuda talisman: paper with a red seal (7x13)
function mkOfudaFrame() {
  if (MKFX.ofuda2) return MKFX.ofuda2;
  const A = Pix(7, 13, [34, 14, 10]); A.poly([[1, 1], [6, 1], [6, 12], [1, 12]], '#d8ccaa', { band: 1 });
  A.line(3.5, 3, 3.5, 7, '#9a2014'); A.px(2.5, 4, '#9a2014'); A.px(4.5, 5, '#9a2014'); A.px(3.5, 9, '#241a14'); A.px(3.5, 10, '#241a14'); A.px(1, 12, '#6a5a3a'); A.px(6, 1, '#fff6d8');
  return (MKFX.ofuda2 = A.render());
}
// a bronze bell of light (44x50): drawn as its rim, its lip and its ribs, burning like the rest of his light
function mkBellFrame() {
  if (MKFX.bell2) return MKFX.bell2;
  const inside = (x, y) => { if (y < 1 || y > 48) return false; if (y < 5) return Math.abs(x - 22) < 1.6; const t = (y - 5) / 43, hw = 8 + Math.pow(t, 1.6) * 13 + (y > 44 ? 1 : 0); return Math.abs(x - 22) < hw; };
  const shell = (x, y) => inside(x, y) && (!inside(x - 2.2, y) || !inside(x + 2.2, y) || !inside(x, y - 2.2) || y > 43 || (Math.abs(y - 14) < 0.8) || (Math.abs(y - 36) < 0.8) || (Math.abs(x - 15) < 0.6 && y > 8 && y < 40));
  return (MKFX.bell2 = fxShape('bell2s', 44, 50, shell, 'day', 4));
}
function mkBlit(img, sx, sy, k, alpha, add) {
  const w = img.width * (k || 1), h = img.height * (k || 1);
  if (alpha != null) ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  if (add) ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(img, Math.round(sx - w / 2), Math.round(sy - h), Math.round(w), Math.round(h));
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
const fxLum = c => { const m = String(c).match(/[0-9a-f]{6}/i); if (!m) return 128; const v = mkRGB('#' + m[0]); return (v[0] + v[1] + v[2]) / 3; };
const fxSat = c => { const m = String(c).match(/[0-9a-f]{6}/i); if (!m) return 0; const v = mkRGB('#' + m[0]); return Math.max(...v) - Math.min(...v); };
// a shockwave on the ground: the ring, and at its birth a flash in the middle (white-hot, or black)
function mkShockDraw(s) {
  const q = iso(s.x, s.y), k = 1 - s.t / s.t0, R = s.R * (0.25 + 0.75 * Math.sqrt(k)), y0 = q.sy - (s.z || 0);
  const mode = s.mode || (s.mode = fxLum(s.c0) < 40 ? 'void' : fxSat(s.c1) < 40 && fxSat(s.c0) < 40 ? 'stone' : 'day');
  if (k < 0.3 && !s.z) fxBurst(q.sx, y0 - 2, Math.min(18, 4 + s.R * 3), k / 0.3 * 0.9, mode, s.seed | 0, 1, 0.55);
  fxRing(q.sx, y0, R, k, mode, Math.max(2, (s.w || 3) - 1), s.seed, mode === 'day' ? 5 : 0);
}
function mkShock(x, y, R, c0, c1, t0, w, z) { (G.kfx || (G.kfx = [])).push({ k: 'shock', x, y, R, c0, c1, t: t0 || 0.4, t0: t0 || 0.4, w, z, seed: Math.random() * 6 }); }
function mkFx(o) { (G.kfx || (G.kfx = [])).push(o); if (G.kfx.length > 220) G.kfx.splice(0, G.kfx.length - 220); }
// the name of the skill he just used, rising over his head
const MK_TABCOL = ['#ffe07a', '#c8b0ff', '#d8d0c0'];
function monkCallout(id) {
  const s = SK[id]; if (!s) return;
  G.kcall = { name: s.name.toUpperCase().replace(/-/g, ' '), jp: s.jp || '', t: 1.5, t0: 1.5, col: MK_TABCOL[s.tab] || '#e8e2d0', tab: s.tab };
}
function mkDrawCallout() {
  const C = G.kcall; if (!C || P.dead) return;
  const q = iso(P.x, P.y), k = 1 - C.t / C.t0, a = C.t < 0.4 ? C.t / 0.4 : 1, y = Math.round(q.sy - 70 - (P.leapZ || 0) - k * 10), x = Math.round(q.sx);
  ctx.font = FONT; const w = Math.ceil(ctx.measureText(C.name).width) + 10;
  ctx.globalAlpha = a * 0.85; ctx.fillStyle = '#0a080c'; ctx.fillRect(x - w / 2, y - 9, w, 12);
  ctx.fillStyle = C.col; ctx.fillRect(x - w / 2, y - 9, w, 1); ctx.fillRect(x - w / 2, y + 2, w, 1); ctx.fillRect(x - w / 2 - 1, y - 8, 1, 10); ctx.fillRect(x + w / 2, y - 8, 1, 10);
  ctx.globalAlpha = a; txt(C.name, x, y, C.col, 'center', true);
  ctx.globalAlpha = 1;
}
// Amber-That-Eats-Itself sets him alight: phosphor flames lick up his hem, flanks, sleeves, shoulders and crown
// (anchored to his v0.36 body: sole to crown 52), embers stream off him
const MK_FIRE_PTS = [[-12, 0, 0], [-5, 1, 1], [2, 1, 2], [9, 0, 0], [14, -1, 1], [-13, -14, 2], [14, -14, 0], [-12, -24, 1], [14, -26, 2], [-11, -36, 0], [12, -37, 1], [-4, -44, 2], [5, -44, 0], [0, -54, 1], [-3, -51, 2], [3, -51, 1]];
function mkDrawSelfFire(sx, sy, face, fr) {
  const t = G.time;
  const s = mkSil(fr, face, '#f08a28'); ctx.globalAlpha = 0.28 + 0.1 * Math.sin(t * 13); ctx.globalCompositeOperation = 'lighter';
  ctx.drawImage(s, Math.round(sx - (face < 0 ? fr.w - fr.ox : fr.ox)), Math.round(sy + 3 - (fr.oy + 1)));
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  MK_FIRE_PTS.forEach(([dx, dy, v], i) => {
    const ph = Math.floor(t * 12 + i * 1.7) % 4, fl = mkFlameFrame(v, ph), k = i < 5 ? 1 : i >= 13 ? 0.7 : 0.85;
    mkBlit(fl, sx + dx * face, sy + dy + 2, k, 0.95);
  });
  if (Math.random() < 0.9) (G.kembers || (G.kembers = [])).push({ x: P.x + rand(-0.5, 0.5), y: P.y + rand(-0.5, 0.5), z: rand(4, 50), vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4), vz: rand(18, 34), t: rand(0.5, 1), s: 1, col: Math.random() < 0.5 ? FXP.day[1] : FXP.day[3] });
}
function mkDrawEmbers() {
  for (const e of G.kembers || []) { const q = iso(e.x, e.y); ctx.globalAlpha = Math.min(1, e.t * 2); ctx.fillStyle = e.t < 0.25 ? FXP.day[4] : e.col; ctx.fillRect(Math.round(q.sx), Math.round(q.sy - e.z), e.s, e.s); }
  ctx.globalAlpha = 1;
}
function mkUpdateFx(dt) {
  if (G.kembers) { for (const e of G.kembers) { e.t -= dt; e.x += e.vx * dt; e.y += e.vy * dt; e.z += e.vz * dt; e.vx += rand(-2, 2) * dt; } G.kembers = G.kembers.filter(e => e.t > 0); if (G.kembers.length > 160) G.kembers.splice(0, G.kembers.length - 160); }
  if (G.kfx) { for (const f of G.kfx) { f.t -= dt; if (f.vx) { f.x += f.vx * dt; f.y += f.vy * dt; } if (f.vz) f.z += f.vz * dt; if (f.k === 'rock') { f.vz -= 140 * dt; if (f.z < 0) { f.z = 0; f.vz = 0; f.vx = 0; f.vy = 0; } } } G.kfx = G.kfx.filter(f => f.t > 0); }
  if (G.kcall) { G.kcall.t -= dt; if (G.kcall.t <= 0) G.kcall = null; }
  if (P.kghost) { for (const a of P.kghost) a.t -= dt; P.kghost = P.kghost.filter(a => a.t > 0); }
  if (G.kxray) { G.kxray.t -= dt; if (G.kxray.t <= 0) G.kxray = null; }
  if (G.kgath) { G.kgath = G.kgath.filter(p => (p.t -= dt) > 0); }
  if (G.kafter) { G.kafter = G.kafter.filter(p => (p.after -= dt) > 0); }
}
// the generic effects list: palm prints, ghost arms, shockwaves, flames, pillars, ground cracks
function mkDrawFx(f) {
  const q = iso(f.x, f.y), a = f.t / f.t0, k = 1 - a;
  if (f.k === 'shock') return mkShockDraw(f);
  if (f.k === 'palm') {   // a palm print of light stamped in the air: a white flash, then the print, burning out
    const mode = fxMode(f.mat), img = mkPalmFrame(f.mat || 'mkGoldFx'), sc = (f.sc || 1) * (1 + k * 0.3), y = q.sy - (f.z || 0);
    if (k < 0.25) fxBurst(q.sx, y - 8 * sc, 5 * sc, k * 3, mode, (f.x * 7) | 0);
    mkBlit(img, q.sx, y, sc, Math.min(1, a * 1.8));
    if (k > 0.5 && mode === 'day') for (let i = 0; i < 3; i++) { ctx.fillStyle = FXP.day[4]; ctx.fillRect(Math.round(q.sx + (mkH(i, f.x * 9 | 0) - 0.5) * 12 * sc), Math.round(y - 8 * sc - k * 10 - i * 2), 1, 1); }
    return;
  }
  if (f.k === 'arm') {   // an afterimage arm blasting out of him, with the smear of its path
    const mode = fxMode(f.mat), img = mkArmFxFrame(f.ai, f.kind || 'fist', f.mat || 'mkGoldFx'), ox = Math.round(q.sx - 22 + (f.dx || 0) * k * 0.5), oy = Math.round(q.sy - (f.z || 0) - 22 + (f.dy || 0) * k * 0.5);
    const an = f.ai / 16 * Math.PI * 2;
    if (k < 0.5) fxSmear(ox + 22 - Math.cos(an) * 6, oy + 22 - Math.sin(an) * 6, ox + 22 + Math.cos(an) * 20, oy + 22 + Math.sin(an) * 20, 2, mode, k * 2);
    ctx.globalAlpha = Math.min(1, a * 1.5); ctx.drawImage(img, ox, oy); ctx.globalAlpha = 1; return;
  }
  if (f.k === 'flame') { const ph = Math.floor(k * 8 + (f.seed || 0)) % 4; mkBlit(mkFlameFrame(f.v || 0, ph, f.mat), q.sx, q.sy - (f.z || 0) + 2, (f.sc || 1) * (0.6 + 0.5 * a), Math.min(1, a * 2)); return; }
  if (f.k === 'pillar') {   // a column of phosphor falling out of the sky onto him (or a column of the void)
    const mode = f.dark ? 'void' : 'day', w = Math.max(3, Math.round(f.w * (0.35 + 0.65 * a) * (k < 0.12 ? k / 0.12 : 1))), C = FXP[mode];
    for (let y = 0; y < q.sy; y += 1) {
      const h = mkH(y >> 1, (f.x * 13) | 0), hw = w * (0.8 + 0.35 * h) * (0.6 + 0.4 * y / q.sy);
      for (let o = -Math.ceil(hw); o <= Math.ceil(hw); o++) {
        const d = Math.abs(o) / hw; if (d > 1) continue; if (k > 0.5 && mkH(o + 40, y * 3 + ((G.time * 20) | 0)) < (k - 0.5) * 1.6) continue;
        const ci = mode === 'void' ? (d > 0.82 ? (mkH(o, y) > 0.5 ? (o < 0 ? 5 : 4) : 2) : d > 0.5 ? 1 : 0) : (d < 0.25 ? 0 : d < 0.5 ? 1 : d < 0.8 ? 2 : 3); if (FX_RIM && ci < 4) continue;
        ctx.fillStyle = C[ci];
        ctx.fillRect(Math.round(q.sx + o), y, 1, 1);
      }
    }
    fxBurst(q.sx, q.sy - 2, Math.min(26, f.w * 1.2), Math.min(0.99, k * 1.2), mode, 1, 1, 0.5);
    return;
  }
  if (f.k === 'crack') {   // cracks torn into the ground, embers glowing in them
    ctx.globalAlpha = Math.min(1, a * 2);
    for (let i = 0; i < (f.n || 7); i++) {
      const an = f.seed + i * 6.283 / (f.n || 7), L = f.R * (0.6 + 0.4 * ((i * 7) % 3) / 2) * ISO_R;
      let x = q.sx, y = q.sy, dir = an;
      for (let s = 0; s < L; s += 1) {
        dir += (mkH(i * 31 + (s | 0), 3) - 0.5) * 0.5; x += Math.cos(dir); y += Math.sin(dir) * 0.5;
        ctx.fillStyle = '#0e0a08'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
        if (s < L * 0.6 && mkH(i, s | 0) > 0.55) { ctx.fillStyle = s < L * 0.25 ? FXP.day[1] : f.glint === '#bcb8ac' ? FXP.stone[4] : FXP.day[3]; ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 1); }
      }
    }
    ctx.globalAlpha = 1; return;
  }
  if (f.k === 'rock') {   // a flung chip of stone, lit from above
    ctx.globalAlpha = Math.min(1, a * 3); ctx.fillStyle = f.col || FXP.stone[3]; ctx.fillRect(Math.round(q.sx), Math.round(q.sy - f.z), 2, 2); ctx.fillStyle = FXP.stone[5]; ctx.fillRect(Math.round(q.sx), Math.round(q.sy - f.z), 1, 1); ctx.fillStyle = FXP.stone[0]; ctx.fillRect(Math.round(q.sx) + 1, Math.round(q.sy - f.z) + 1, 1, 1); ctx.globalAlpha = 1;
    return;
  }
  if (f.k === 'dust') {   // a burst of grit and dust at his feet: clusters, not blobs
    const C = FXP.stone;
    for (let i = 0; i < 9; i++) { const an = f.seed + i * 0.7, r = 4 + k * 16 * (0.6 + mkH(i, 3) * 0.6), x = q.sx + Math.cos(an) * r, y = q.sy - 2 - k * 6 * mkH(i, 5) + Math.sin(an) * r * 0.45; if (mkH(i, 9) < k * 0.8) continue; ctx.fillStyle = C[2 + (i % 3)]; ctx.fillRect(Math.round(x), Math.round(y), 2, 1); ctx.fillStyle = C[1]; ctx.fillRect(Math.round(x) + 1, Math.round(y) + 1, 1, 1); if (i % 3 === 0) { ctx.fillStyle = C[4]; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 1, 1); } }
    return;
  }
  if (f.k === 'glyph') {   // a hanging syllable, burning in the air
    ctx.globalAlpha = Math.min(1, a * 2); ctx.font = '16px "IM Fell English SC", Georgia, serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#0a0608'; ctx.fillText(f.s, q.sx + 1, q.sy - f.z + 1); ctx.fillStyle = k < 0.15 ? '#fffdf0' : f.col; ctx.fillText(f.s, q.sx, q.sy - f.z); ctx.globalAlpha = 1; return;
  }
  if (f.k === 'hole') { fxBurst(q.sx, q.sy - f.z, f.r * 1.6, Math.min(0.99, k), 'void', 2); return; }   // a hole in the sky
}
// the halo of ofuda behind his head: paper talismans turning, each burning at its tail
function drawHalo(behind) {
  const n = P.khalo; if (!n || P.dead || P.knothing > 0) return;
  const q = iso(P.x, P.y), cx = q.sx - (P.face || 1) * 1, cy = q.sy - 50 - (P.leapZ || 0);
  for (let i = 0; i < n; i++) {
    const a = G.time * 0.8 + i / n * 6.283, x = cx + Math.cos(a) * 11, y = cy + Math.sin(a) * 3.5, front = Math.sin(a) > 0;
    if (front === behind) continue;
    ctx.fillStyle = '#241a14'; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 3, 4, 7);
    ctx.fillStyle = '#d8ccaa'; ctx.fillRect(Math.round(x), Math.round(y) - 2, 2, 5); ctx.fillStyle = '#9a2014'; ctx.fillRect(Math.round(x), Math.round(y) - 1, 1, 1);
    const ph = Math.floor(G.time * 12 + i) % 4; mkBlit(mkFlameFrame(i % 3, ph), x + 1, y + 5, 0.4, 0.95);
  }
}
// ------------------------------------------------------------------- struck and killed
// struck: while he is the one fighting, a hit strips a creature's colour to grey and lights its edges gold
{
  const _dm = drawMon16;
  drawMon16 = function (m, flash, alpha) {
    if (!(flash && m.hurt > 0 && typeof isMonk === 'function' && isMonk() && G.running)) return _dm(m, flash, alpha);
    const night = !mkDay();
    ctx.save(); ctx.filter = night ? 'grayscale(1) brightness(0.55) contrast(1.5)' : 'grayscale(1) brightness(0.95) contrast(1.35)';
    let r; try { r = _dm(m, false, alpha); } finally { ctx.restore(); }
    if (!r) return r;
    // the gold light on its edges: the same drawing again, tinted, added only where it is bright
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = night ? 0.35 : 0.55; ctx.filter = night ? 'grayscale(1) brightness(0.45) sepia(1) hue-rotate(220deg) saturate(3)' : 'grayscale(1) brightness(0.55) sepia(1) saturate(4) contrast(1.6)';
    try { _dm(m, false, alpha); } finally { ctx.restore(); }
    return r;
  };
}
// the charred dead: a skeleton of burnt bone that stands a moment, buckles, and clatters down into a heap (16x30)
function mkCharFrame(f) {
  const key = 'char' + f; if (MKFX[key]) return MKFX[key];
  const A = Pix(18, 30, [12, 6, 6]), B = '#4a3024', B2 = '#9a806a', B3 = '#d2bc98', E = '#f08a2a', E2 = '#ffd060';
  const drop = [0, 4, 9, 20][f], tilt = [0, 0.1, 0.45, 0][f];
  const R = (x, y) => [9 + (x - 9) * Math.cos(tilt) - (y - 28) * Math.sin(tilt), 28 + (x - 9) * Math.sin(tilt) + (y - 28) * Math.cos(tilt) + drop * (y < 20 ? 1 : 0.3)];
  if (f < 3) {
    const kn = f === 1 ? 2 : 0;
    A.limb([R(7, 28), R(6 + kn, 23), R(7, 18)], 0.8, 0.9, B2, { band: 1 }); A.limb([R(11, 28), R(12 - kn, 23), R(11, 18)], 0.8, 0.9, B, { band: 1 });   // the legs
    A.ell(...R(9, 17), 3, 1.6, B, {});   // the pelvis
    A.limb([R(9, 16), R(9, 8)], 0.6, 0.6, B2, {});   // the spine
    for (let i = 0; i < 4; i++) { const y = 9 + i * 1.7; A.limb([R(6, y), R(9, y - 0.4), R(12, y)], 0.45, 0.45, i % 2 ? B2 : B3, {}); }   // the ribs
    A.limb([R(6, 8), R(4.5, 13), R(4, 17 + f * 2)], 0.55, 0.5, B2, {}); A.limb([R(12, 8), R(13.5, 13), R(14, 17 + f * 2)], 0.55, 0.5, B2, {});   // the arms, hanging
    A.ell(...R(9, 4.5), 2.6, 2.8, B2, {}); A.px(...R(8, 4.5), '#0a0404'); A.px(...R(10, 4.5), '#0a0404'); A.px(...R(9, 6.5), '#0a0404');   // the skull
    A.px(...R(8, 3), B3); A.px(...R(9, 11), E); A.px(...R(7, 23), E); A.px(...R(9, 17), E2);
  } else {
    // the heap: the skull on top of the broken ribs and long bones
    for (const [x0, y0, x1, y1] of [[3, 28, 10, 26], [8, 29, 15, 27], [5, 26, 12, 28], [10, 25, 16, 26]]) A.limb([[x0, y0], [x1, y1]], 0.6, 0.6, B2, {});
    for (let i = 0; i < 4; i++) A.limb([[6 + i * 2, 27], [7 + i * 2, 25.5]], 0.4, 0.4, B3, {});
    A.ell(11, 24.5, 2.2, 2, B2, {}); A.px(10, 24.5, '#0a0404'); A.px(12, 24.5, '#0a0404'); A.px(7, 27, E); A.px(13, 27, E2);
  }
  return (MKFX[key] = A.render());
}
// the X-ray: for a breath as he becomes the sun, his gilded body goes white-hot and the skeleton shows black through it
function mkXrayFrame(pose, ph, view) {
  const key = 'xr|' + pose + '|' + ph + '|' + view; if (MKFX[key]) return MKFX[key];
  const A = mkHD(MK_FW, MK_FH, MK_OX, MK_OY), J = mkRig(pose, ph, view, 1), [hx, hy] = J.head, BN = 'xbone';
  const L = (a, b, r) => A.limb([a, b], r, r * 0.9, BN, { rim: false, ao: false });
  L([J.ankN[0], -1], [J.ankN[0] * 0.8, -12], 1); L([J.ankF[0], -1], [J.ankF[0] * 0.8, -12], 1); L([J.ankN[0] * 0.8, -12], [4, -21], 1.2); L([J.ankF[0] * 0.8, -12], [-3, -21], 1.2);
  A.ell(0.5, -21.5, 5, 2.4, BN, { rim: false }); L([0.5, -21], [0.5, -41], 0.9);
  for (let i = 0; i < 6; i++) { const y = -39 + i * 2.2, w = 6.5 - Math.abs(i - 2) * 0.5; A.limb([[0.5 - w, y + 1.2], [0.5, y], [0.5 + w, y + 1.2]], 0.5, 0.5, BN, { rim: false }); }
  for (const [s, e, h] of [[J.shN, J.elN, J.haN], [J.shF, J.elF, J.haF]]) { L(s, e, 0.9); L(e, h, 0.75); A.ell(h[0], h[1], 1.3, 1.3, BN, { rim: false }); L([0.5, -40.5], s, 0.7); }
  A.ell(hx - 0.2, hy - 0.3, 3.3, 3.7, BN, {}); A.ell(hx + 0.8, hy + 2.8, 2, 1.2, BN, {});
  const c = A.render();
  const cx = c.getContext('2d'), d = cx.getImageData(0, 0, c.width, c.height);
  // the sockets and the jaw: holes of white light
  const put = (x, y) => { const i = (Math.floor((y + MK_OY) * MK_HS) * c.width + Math.floor((x + MK_OX) * MK_HS)) * 4; if (i >= 0 && i < d.data.length) { d.data[i + 3] = 0; } };
  for (const [ex, ey] of [[hx - 0.6, hy - 0.4], [hx + 1.6, hy - 0.4], [hx + 0.6, hy + 1.2]]) { put(ex, ey); put(ex + 0.6, ey); }
  cx.putImageData(d, 0, 0);
  const lo = mkCanvas(MK_FW, MK_FH); lo._hr = c;
  return (MKFX[key] = lo);
}
mkMat('xbone', ['#0a0404', '#1a0c08', '#2a140c', '#3a2012', '#4e2e18', '#6a4424'], {});

// ------------------------------------------------------------------- the Weeping One Who Walks: a many-armed stone Buddha
const BUD_FR = {};
function buddhaFrame(pose, ph) {
  const key = pose + '|' + ph; if (BUD_FR[key]) return BUD_FR[key];
  const A = Pix(60, 66, undefined, 0), S = 'mkStone', st = i => A.tone(S, i);
  const walk = pose === 'walk', sw = walk ? [1, 0, -1, 0][ph % 4] : 0, bob = walk ? (ph % 2 ? -1 : 0) : pose === 'idle' && ph ? 1 : 0;
  const Y = v => v + bob;
  // the stone halo behind the head, cracked through
  A.ell(31, Y(15), 11, 11, S, { tone: -1, band: 2 }); A.ell(31, Y(15), 7.5, 7.5, '#16140f', { flat: true, contour: false });
  A.line(24, Y(8), 28, Y(14), st(0)); A.line(38, Y(22), 35, Y(18), st(0));
  // the upper arms, raised to the sky; the middle pair spread
  const arm = (a, b, c, t, r) => { A.limb([a, b, c], r || 2.3, (r || 2.3) * 0.8, S, { tone: t }); A.ell(c[0], c[1], 2.4, 2.2, S, { tone: t }); A.px(c[0], c[1] - 1, st(t < 0 ? 1 : 4)); };
  arm([20, Y(25)], [14, Y(18)], [11, Y(9)], -1); arm([40, Y(25)], [46, Y(18)], [49, Y(9)], -1);
  arm([19, Y(29)], [11, Y(31)], [5, Y(29)], -1, 2.1); arm([41, Y(29)], [49, Y(31)], [55, Y(29)], 0, 2.1);
  // legs: squat pillars under a skirt of carved folds
  for (const [x, far] of [[23, true], [35, false]]) { const lx = x + (far ? -sw : sw) * 1.5; A.limb([[x, Y(48)], [lx, 60]], 3.4, 3.2, S, { tone: far ? -1 : 0 }); A.poly([[lx - 3.5, 59], [lx + 4.5, 59], [lx + 5, 62], [lx - 3.5, 62]], S, { tone: far ? -1 : 0 }); }
  A.poly([[17, Y(42)], [43, Y(42)], [45 + sw, 57], [15 + sw, 57]], S, { band: 2 });
  for (const fx of [21, 27, 33, 39]) A.line(fx, Y(44), fx + sw * 0.6, 56, st(1));
  // the body: a vast seated calm made to walk; the belly, the chest
  A.ell(30, Y(38), 12, 9, S, { band: 3 }); A.ell(30, Y(28), 11, 6.5, S, { band: 2 });
  A.px(31, Y(39), st(0)); A.px(31, Y(40), st(1));
  // cracks, lichen
  A.line(22, Y(33), 26, Y(39), st(0)); A.line(26, Y(39), 25, Y(44), st(0)); A.line(37, Y(26), 40, Y(31), st(0));
  for (const [x, y] of [[19, 36], [38, 41], [27, 26], [41, 35], [24, 50]]) { A.px(x, Y(y), '#4a5a32'); A.px(x + 1, Y(y), '#6a7a42'); }
  // the head: long ears, the ushnisha, eyes closed and weeping
  const hx = 31, hy = Y(14);
  A.limb([[hx - 6, hy - 1], [hx - 6.5, hy + 6]], 1.4, 1.8, S, { tone: -1 }); A.limb([[hx + 6.5, hy - 1], [hx + 7, hy + 6]], 1.4, 1.8, S, {});
  A.ell(hx, hy, 6.2, 6.8, S, { band: 2 }); A.ell(hx - 0.5, hy - 7.5, 3.2, 2.8, S, {});
  for (let i = 0; i < 6; i++) A.px(hx - 4 + i * 1.6, hy - 5 + (i % 2), st(1));   // the snail-shell curls
  A.px(hx + 0.5, hy - 3, '#6a1a10');   // the urna
  for (const ex of [-3, 2.5]) { A.px(hx + ex, hy - 1, st(0)); A.px(hx + ex + 1, hy - 0.5, st(0)); A.px(hx + ex + 2, hy - 1, st(0)); }
  // the tears: dark wet streaks down the stone, a glistening drop at the end
  const drip = ph % 3;
  for (const ex of [-2, 3.5]) { A.line(hx + ex, hy + 0.5, hx + ex - 0.3, hy + 5 + drip, '#2a3a44'); A.px(hx + ex, hy + 1, '#bfeaff'); A.px(hx + ex - 0.3, hy + 5 + drip, '#e8fbff'); }
  A.line(hx - 1.5, hy + 4, hx + 2, hy + 4, st(0)); A.px(hx + 0.5, hy + 2, st(3));
  // the main pair: folded before the belly, or raised and brought down in a slam
  const sl = pose === 'slam' ? ph : -1;
  const hn = sl === 0 ? [36, Y(0)] : sl === 1 ? [48, Y(18)] : sl === 2 ? [52, Y(46)] : [37, Y(36)];
  const hf = sl === 0 ? [27, Y(0)] : sl === 1 ? [42, Y(16)] : sl === 2 ? [47, Y(46)] : [24, Y(36)];
  const en = sl === 0 ? [42, Y(14)] : sl === 1 ? [46, Y(28)] : sl === 2 ? [47, Y(36)] : [42, Y(31)];
  const ef = sl === 0 ? [21, Y(16)] : sl === 1 ? [35, Y(26)] : sl === 2 ? [40, Y(36)] : [19, Y(31)];
  arm([20, Y(24)], ef, hf, -1, 2.8); arm([40, Y(24)], en, hn, 0, 2.9);
  if (sl === 2) for (let i = 0; i < 5; i++) A.px(46 + i * 2, 60 - (i % 2), '#8e8b82');
  const c = A.render(), f = mkCanvas(60, 66), fx = f.getContext('2d'); fx.translate(60, 0); fx.scale(-1, 1); fx.drawImage(c, 0, 0);
  const wh = src => { const q = mkCanvas(60, 66), qx = q.getContext('2d'); qx.drawImage(src, 0, 0); qx.globalCompositeOperation = 'source-in'; qx.fillStyle = '#fff'; qx.fillRect(0, 0, 60, 66); return q; };
  return (BUD_FR[key] = { c, f, fl: wh(c), flf: wh(f), w: 60, h: 66, ox: 30, oy: 61 });
}
function drawBuddha(b) {
  const q = iso(b.x, b.y);
  let pose = 'idle', ph = Math.floor(G.time * 1.2) % 2;
  if (b.atk) { pose = 'slam'; ph = b.atk.t < 0.4 ? 0 : b.atk.t < 0.55 ? 1 : 2; }
  else if (b.walkD != null && Math.abs(b.walkD - (b._wd0 || 0)) > 0.001) { pose = 'walk'; ph = Math.floor(b.walkD * 3) % 4; }
  b._wd0 = b.walkD;
  const fr = buddhaFrame(pose, ph), img = b.hurt > 0 && OPT.flash ? (b.face < 0 ? fr.flf : fr.fl) : (b.face < 0 ? fr.f : fr.c);
  shadow(b.x, b.y, 0.75);
  const rise = b.rise > 0 ? b.rise : 0, X = Math.round(q.sx - (b.face < 0 ? fr.w - fr.ox : fr.ox)), Y = Math.round(q.sy + 3 - fr.oy + rise * 50);
  ctx.save(); if (rise) { ctx.beginPath(); ctx.rect(X - 10, Y - 20, fr.w + 20, (q.sy + 4) - (Y - 20)); ctx.clip(); }
  ctx.drawImage(img, X, Y); ctx.restore();
  if (rise) { for (let i = 0; i < 3; i++) parts.push({ x: b.x + rand(-0.6, 0.6), y: b.y + rand(-0.6, 0.6), z: 1, vx: rand(-1, 1), vy: rand(-1, 1), vz: 20, t: 0.4, col: '#6a6258' }); }
  // its life, when hurt
  if (b.hp < b.max) { const w = 26, x = Math.round(q.sx - w / 2), y = Math.round(Y - 4); ctx.fillStyle = '#0a090d'; ctx.fillRect(x - 1, y - 1, w + 2, 4); ctx.fillStyle = '#8e8b82'; ctx.fillRect(x, y, Math.round(w * clamp(b.hp / b.max, 0, 1)), 2); }
  return { x: X + 12, y: Y + 4, w: fr.w - 24, h: fr.h - 8 };
}

// the colossal fist of light, knuckles down: sculpted with his own painter (forearm, a gilt cuff, the back of the hand,
// four knuckles, the fingers folded under, the thumb wrapped across) and lit like burning gold. 30 x 44 world px.
mkMat('noon', ['#2a0c10', '#5e2410', '#9a4e14', '#d08422', '#f4b83a', '#ffe888', '#ffffff'], { spec: 0.96 });
let NOON_FIST = null;
function noonFistFrame() {
  if (NOON_FIST) return NOON_FIST;
  const A = mkHD(30, 44, 15, 43), M = 'noon';
  A.limb([[0.5, -44], [0, -27]], 5.6, 5.1, M, { fz: 1.2 });                                             // the forearm, out of the sky
  A.limb([[-5.4, -26.5], [5.4, -26.5]], 1.4, 1.4, 'rim0', { edge: true });                             // the cuff of gilt
  A.blob([[0, -18, 8.2, 7.4, 6.5], [0.8, -13, 8.6, 5, 6.2]], M, { ax: 0, ay: -18 });                   // the back of the hand
  for (let i = 0; i < 4; i++) { const x = -6 + i * 4; A.limb([[x, -11], [x + 0.2, -6.5]], 2.05, 2.0, M, { edge: true, ax: x, ay: -11 }); }   // the fingers, folded under
  for (let i = 0; i < 4; i++) { const x = -6 + i * 4; A.ell(x + 0.2, -4.4, 2.2, 2.3, M, { edge: true, ax: x, ay: -5 }); }   // the four knuckles, driving down
  A.limb([[8.6, -19], [8.2, -13], [4.4, -9.8]], 2.4, 2, M, { edge: true, ax: 8, ay: -19 });             // the thumb, wrapped across the fingers
  for (let i = 0; i < 3; i++) { const x = -4 + i * 4; A.dkl(x, -10.5, x, -3, -2); }                     // the dark between the fingers
  A.dkl(-7, -13.4, 6, -13.4, -1); A.dk(-6, -4.5, 2); A.dk(-2, -4.6, 2);
  const hd = A.render(), c = mkCanvas(30, 44); c._hr = hd;
  return (NOON_FIST = c);
}
// ------------------------------------------------------------------- the world: everything he makes
function kFlame(x, y, col) { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); }
function monkRender(list) {
  if (!G.zone) return;
  const me = isMonk();
  // the dead: by day a charred skeleton that stands, buckles and clatters down; by night black glass; dust, rubble, red mist
  for (const g of G.kglass) {
    if (!onScreen(g.x, g.y)) continue;
    if (g.day == null) g.day = mkDay();
    list.push({ d: g.x + g.y - (g.max - g.t < 0.9 ? -0.1 : 0.45), f: () => {
      const q = iso(g.x, g.y), age = g.max - g.t, fade = Math.min(1, g.t / 1.5);
      if (g.kind === 'glass' && g.day) {
        // the flesh flashes off white, then the burnt skeleton
        if (age < 0.18) { fxBurst(q.sx, q.sy - 14, 12, age / 0.18 * 0.6, 'day', g.seed | 0); return; }
        const f = age < 0.55 ? 0 : age < 0.68 ? 1 : age < 0.8 ? 2 : 3, fr = mkCharFrame(f);
        ctx.globalAlpha = fade; ctx.drawImage(fr, Math.round(q.sx - 9), Math.round(q.sy - 29)); ctx.globalAlpha = 1;
        if (age < 1.6 && Math.random() < 0.35) parts.push({ x: g.x + rand(-0.2, 0.2), y: g.y + rand(-0.2, 0.2), z: rand(4, 22), vx: 0, vy: 0, vz: rand(8, 16), t: 0.6, col: Math.random() < 0.5 ? '#3a2a24' : FXP.day[3] });
        if (f === 3 && age < 0.95) for (let i = 0; i < 4; i++) { ctx.fillStyle = FXP.stone[3]; ctx.fillRect(Math.round(q.sx - 6 + i * 4), Math.round(q.sy - 2 - (0.95 - age) * 30 * mkH(i, g.seed | 0)), 1, 1); }   // the clatter: chips thrown up
        return;
      }
      if (age < 0.7 && g.kind !== 'mist' && MPAINT[g.spr]) {
        try {
          const pal = MPAL[g.spr] || {}, fr = monFrame(g.spr, 'k' + g.spr, pal, 'idle', 0);
          ctx.save(); ctx.globalAlpha = 1 - Math.max(0, age - 0.45) / 0.25;
          ctx.filter = g.kind === 'glass' ? 'grayscale(1) brightness(0.22) contrast(1.8)' : 'grayscale(1) brightness(0.85)';
          ctx.drawImage(fr.c, Math.round(q.sx - fr.ox), Math.round(q.sy - fr.oy - 1)); ctx.filter = 'none'; ctx.restore();
          if (g.kind === 'glass') { ctx.fillStyle = FXP.void[5]; ctx.fillRect(Math.round(q.sx - 2 + age * 8), Math.round(q.sy - 14), 1, 5); ctx.fillRect(Math.round(q.sx - 1 + age * 8), Math.round(q.sy - 16), 1, 1); }
        } catch (e) { }
      }
      if (g.kind === 'glass') {
        // a pool of black glass, cracked, a few glinting shards
        ctx.globalAlpha = fade; const rx = 7 + g.r * 6, ry = 3 + g.r * 3;
        for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(1 - (y / (ry + 0.5)) ** 2) * (0.85 + 0.25 * mkH(y + 9, g.seed | 0))); ctx.fillStyle = y < -ry + 1 ? FXP.void[3] : FXP.void[1]; ctx.fillRect(Math.round(q.sx - w), Math.round(q.sy + 1 + y), w * 2, 1); }
        ctx.fillStyle = FXP.void[4]; ctx.fillRect(Math.round(q.sx - 4), Math.round(q.sy), 4, 1);
        for (let i = 0; i < 6; i++) { const a = g.seed + i * 1.3, x = q.sx + Math.cos(a) * (4 + i * 1.6), y = q.sy + Math.sin(a) * 2.5; ctx.fillStyle = FXP.void[2]; ctx.fillRect(Math.round(x), Math.round(y) - 2, 2, 2); if ((Math.floor(G.time * 2 + i) % 5) === 0) { ctx.fillStyle = FXP.void[5]; ctx.fillRect(Math.round(x), Math.round(y) - 2, 1, 1); } }
        ctx.globalAlpha = 1;
      } else if (g.kind === 'rubble') {
        ctx.globalAlpha = fade; for (let i = 0; i < 8; i++) { const a = g.seed + i * 0.9, x = q.sx + Math.cos(a) * (2 + i), y = q.sy + Math.sin(a) * 2; ctx.fillStyle = FXP.stone[i % 2 ? 2 : 1]; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 3, 2); ctx.fillStyle = FXP.stone[4]; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 1, 1); if (i % 4 === 0) { ctx.fillStyle = FXP.day[3]; ctx.fillRect(Math.round(x) + 1, Math.round(y) - 2, 1, 1); } } ctx.globalAlpha = 1;
      } else if (g.kind === 'dust') {
        for (let i = 0; i < 10; i++) { const t2 = age + i * 0.08; if (mkH(i, g.seed | 0) < t2 / 2.2) continue; ctx.fillStyle = FXP.stone[2 + (i % 3)]; ctx.fillRect(Math.round(q.sx + Math.sin(g.seed + i) * (4 + t2 * 6)), Math.round(q.sy - 4 - t2 * 12 - i * 2), 2, 1); }
      } else {
        for (let i = 0; i < 12; i++) { const t2 = age + i * 0.05; if (mkH(i, 7) < t2 / 2.2) continue; ctx.fillStyle = i % 3 ? '#6a0c14' : '#a01a20'; ctx.fillRect(Math.round(q.sx + Math.cos(g.seed + i * 0.9) * (4 + t2 * 10)), Math.round(q.sy - 8 - Math.sin(g.seed + i) * 6 - t2 * 4), 2, 2); }
      }
    } });
  }
  // the weeping stone: a calcified enemy is drawn again, grey, tears running down it
  for (const m of G.zone.monsters) {
    if (m.dead || m.hidden || !onScreen(m.x, m.y)) continue;
    if (m.kstone > 0 && MPAINT[m.b.spr]) list.push({ d: m.x + m.y + 0.02, f: () => {
      try {
        const [pk, pal] = monPal(m, m.b.spr), fr = monFrame(m.b.spr, pk, pal, 'idle', 0), q = iso(m.x, m.y), face = m.face || 1;
        ctx.save(); ctx.filter = 'grayscale(1) brightness(0.75) contrast(1.3)'; ctx.drawImage(face < 0 ? fr.f : fr.c, Math.round(q.sx - (face < 0 ? fr.w - fr.ox : fr.ox)), Math.round(q.sy - fr.oy - 1)); ctx.filter = 'none'; ctx.restore();
        const ty = q.sy - fr.oy + 6 + ((G.time * 8) % 10); ctx.fillStyle = '#bfeaff'; ctx.fillRect(Math.round(q.sx + 1), Math.round(ty), 1, 2);
        ctx.fillStyle = '#2a2824'; ctx.fillRect(Math.round(q.sx - 3), Math.round(q.sy - 10), 1, 5); ctx.fillRect(Math.round(q.sx - 2), Math.round(q.sy - 6), 3, 1);
      } catch (e) { }
    } });
    if (m.kshadow) list.push({ d: m.x + m.y + 0.03, f: () => { const q = iso(m.x, m.y); for (let i = 0; i < 4; i++) { const a = G.time * 3 + i * 1.6; ctx.fillStyle = FXP.void[i % 2 ? 1 : 3]; ctx.fillRect(Math.round(q.sx + Math.cos(a) * 6), Math.round(q.sy - 4 + Math.sin(a) * 2), 2, 1); } } });
    if (m.kfault > 0 && P.kobsid > 0) list.push({ d: m.x + m.y + 0.03, f: () => { const q = iso(m.x, m.y); for (let i = 0; i < m.kfault; i++) { ctx.fillStyle = FXP.void[1]; ctx.fillRect(Math.round(q.sx - 4 + i * 2), Math.round(q.sy - 20 + i * 2), 1, 5); ctx.fillStyle = FXP.void[5]; ctx.fillRect(Math.round(q.sx - 3 + i * 2), Math.round(q.sy - 19 + i * 2), 1, 1); } } });
    if (P.knothing > 0 && G.kmarks.includes(m)) list.push({ d: m.x + m.y + 0.03, f: () => { const q = iso(m.x, m.y); fxRing(q.sx, q.sy - 12, 0.22, 0.2, 'void', 1, m.x, 0); ctx.fillStyle = '#e8e2d0'; ctx.fillRect(Math.round(q.sx), Math.round(q.sy - 12), 1, 1); } });
    if (m.kdazzle > 0) list.push({ d: m.x + m.y + 0.03, f: () => { const q = iso(m.x, m.y); for (let i = 0; i < 4; i++) { const a = G.time * 6 + i * 1.57; ctx.fillStyle = i % 2 ? FXP.day[0] : FXP.day[2]; ctx.fillRect(Math.round(q.sx + Math.cos(a) * 5), Math.round(q.sy - 22 + Math.sin(a) * 2), 1, 1); } } });
  }
  // the stone Buddha
  if (G.kbuddha) { const b = G.kbuddha; list.push({ d: b.x + b.y, f: () => drawBuddha(b) }); }
  if (!me) return;
  const pq = () => iso(P.x, P.y), lift = () => P.leapZ || 0;
  // the void's work is drawn once in the world and its rims once more after the light (so the dark does not eat them)
  const post = fn => (G.kpost || (G.kpost = [])).push(fn);
  for (const f of G.kfx || []) if (f.k === 'shock' ? f.mode === 'void' : (f.k === 'hole' || f.dark || fxMode(f.mat) === 'void')) post(() => mkDrawFx(f));
  for (const w of G.kwaves) post(() => { const q = iso(w.x, w.y), k = w.t / w.dur; fxRing(q.sx, q.sy, w.R * k, k, 'void', 3, w.x + w.y, 0); });
  for (const c of G.kclaps) post(() => { const q = iso(c.x, c.y), k = c.t / c.dur; fxRing(q.sx, q.sy - 4, c.R * (0.2 + 0.8 * k), k, 'void', 4, c.x, 0); });
  for (const b of G.kbeams) if (b.thread || b.spit) post(() => drawBeam(b));
  for (const sl of G.kslams) if (sl.kind === 'arc' || sl.kind === 'mirror' || sl.kind === 'implode') post(() => drawSlam(sl));
  if (G.kpalm) post(() => { const q = pq(); fxBurst(q.sx + (P.face || 1) * 20, q.sy - 30 - lift(), 12, 0.35, 'void', Math.floor(G.time * 10) % 3); });
  for (const f of G.kfx || []) list.push({ d: f.k === 'crack' || f.k === 'shock' && !f.z ? -1e4 + 1 : f.k === 'pillar' ? P.x + P.y - 0.05 : f.k === 'glyph' ? 1e4 : f.x + f.y + 0.4, f: () => mkDrawFx(f) });
  list.push({ d: 1e4, f: () => { mkDrawEmbers(); mkDrawCallout(); } });
  list.push({ d: P.x + P.y - 0.02, f: () => drawHalo(true) }); list.push({ d: P.x + P.y + 0.04, f: () => drawHalo(false) });
  // Amber-That-Eats-Itself: a ring of phosphor fire on the ground, licking up
  if (P.kamber && !P.dead) {
    const ring = front => () => {
      const q = pq(), R = KS.amberR(), rx = R * ISO_R, ry = R * ISO_RY, per = Math.round(Math.PI * (rx + ry));
      for (let i = 0; i < per; i++) {
        const a = i / per * 6.2832; if ((Math.sin(a) > 0) !== front) continue;
        const x = Math.round(q.sx + Math.cos(a) * rx), y = Math.round(q.sy + Math.sin(a) * ry), h = mkH(i, Math.floor(G.time * 10)), tl = Math.floor(h * h * 7);
        ctx.fillStyle = FXP.day[3]; ctx.fillRect(x, y - 1, 1, 2); ctx.fillStyle = FXP.day[1]; ctx.fillRect(x, y - 1, 1, 1);
        if (tl) { ctx.fillStyle = FXP.day[2]; ctx.fillRect(x, y - 1 - tl, 1, tl); ctx.fillStyle = FXP.day[h > 0.9 ? 5 : 4]; ctx.fillRect(x, y - 1 - tl, 1, 1); }
      }
      for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 + G.time * 0.5; if ((Math.sin(a) > 0) !== front) continue; mkBlit(mkFlameFrame(i % 3, Math.floor(G.time * 10 + i) % 4), q.sx + Math.cos(a) * rx, q.sy + Math.sin(a) * ry + 2, 0.8, 1); }
    };
    list.push({ d: P.x + P.y - 0.9, f: ring(false) }); list.push({ d: P.x + P.y + 0.9, f: ring(true) });
  }
  // Walks-Without-Feet: rings of the void rolling out, and a pool of dark under him
  for (const w of G.kwaves) list.push({ d: P.x + P.y - 0.8, f: () => { const q = iso(w.x, w.y), k = w.t / w.dur; fxRing(q.sx, q.sy, w.R * k, k, 'void', 3, w.x + w.y, 0); } });
  if (P.kwalk) list.push({ d: P.x + P.y - 0.5, f: () => { const q = pq(); for (let y = -4; y <= 4; y++) { const w = Math.round(12 * Math.sqrt(1 - (y / 5) ** 2) * (0.85 + 0.2 * mkH(y, Math.floor(G.time * 6)))); ctx.fillStyle = Math.abs(y) > 2 ? FXP.void[2] : FXP.void[1]; ctx.fillRect(Math.round(q.sx - w), Math.round(q.sy + 1 + y), w * 2, 1); } if (Math.random() < 0.5) parts.push({ x: P.x + rand(-0.4, 0.4), y: P.y + rand(-0.4, 0.4), z: 1, vx: 0, vy: 0, vz: 5, t: 0.6, col: FXP.void[3] }); } });
  // Lotus-Without-Mercy: petals of solid phosphor turning around him, a ring of fire at their feet
  if (P.klotus && P.klotus.R) list.push({ d: P.x + P.y + 0.05, f: () => {
    const q = pq(), R = P.klotus.R, n = 12;
    fxRing(q.sx, q.sy, R, 0.2, 'day', 2, 3, 3);
    for (let b = 0; b < 2; b++) for (let i = 0; i < n; i++) {
      const a = i / n * 6.283 + G.time * (b ? -3 : 4.5), rr = R * (b ? 0.6 : 1), x = q.sx + Math.cos(a) * rr * ISO_R, y = q.sy + Math.sin(a) * rr * ISO_RY - 6 - b * 8;
      mkBlit(mkPetalFrame(), x, y + 6, b ? 0.8 : 1, 1);
      if (i % 3 === 0) fxSmear(x - Math.sin(a) * 8 * (b ? -1 : 1), y - Math.cos(a) * 3, x, y, 1, 'day', 0.3);
    }
  } });
  // Eye-Between-The-Brows: a thin beam of burning phosphor from the forehead
  if (P.keye) list.push({ d: 1e4, f: () => {
    const q = pq(), a = P.keye.ang, L = 7.5, e = iso(P.x + Math.cos(a) * L, P.y + Math.sin(a) * L), sy = q.sy - 48 - lift(), sx = q.sx + (P.face || 1) * 2;
    fxBeam(sx, sy, e.sx, e.sy - 12, 2.2, 'day', Math.floor(G.time * 30));
    fxBurst(sx, sy, 5, 0.1 + 0.1 * Math.sin(G.time * 30), 'day', 1); fxBurst(e.sx, e.sy - 12, 8, (G.time * 3) % 1, 'day', 2);
    if (Math.random() < 0.6) { const t2 = Math.random(); parts.push({ x: P.x + Math.cos(a) * L * t2, y: P.y + Math.sin(a) * L * t2, z: 12, vx: rand(-1, 1), vy: rand(-1, 1), vz: 10, t: 0.3, col: FXP.day[1] }); }
  } });
  // He-Who-Hangs-As-The-Sun: a small sun of phosphor, white at the heart, its corona frayed into gold tongues
  if (P.ksun > 0) list.push({ d: P.x + P.y - 0.1, f: () => {
    const q = pq(), cx = q.sx, cy = q.sy - 30 - lift();
    fxBurst(cx, cy, 24, 0.12 + 0.06 * Math.sin(G.time * 11), 'day', Math.floor(G.time * 8) % 3);
    for (let i = 0; i < 40; i++) { const a = i / 40 * 6.2832 + G.time * 0.6, h = mkH(i, Math.floor(G.time * 12)), r0 = 22, r1 = r0 + 3 + h * h * 12; for (let r = r0; r < r1; r += 1) { ctx.fillStyle = FXP.day[r > r1 - 1.5 ? 4 : r > r0 + (r1 - r0) * 0.5 ? 3 : 2]; ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); } }
  } });
  // the X-ray flash when he becomes the sun: the immolated monk, white-hot, his skeleton black inside the light
  if (P.ksun > 0 && !(P._ksun0 > 0)) G.kxray = { t: 0.45, t0: 0.45 };
  P._ksun0 = P.ksun;
  const xray = (k, flash) => {
    const [pose, ph] = heroPose(), fr = heroFrame('monk', pose, ph), face = P.face || 1, q = pq();
    if (Math.floor(k * 10) % 3 === 2) return;   // it flickers, like a strobe on film
    const x = Math.round(q.sx - (face < 0 ? fr.w - fr.ox : fr.ox)), y = Math.round(q.sy + 3 - (fr.oy + 1) - lift());
    ctx.drawImage(mkSil(fr, face, k < 0.3 ? '#fffdf0' : '#fff0a8'), x, y);
    const xr = mkXrayFrame(pose, ph, P._view || (P._fb ? 'back' : 'front'));
    if (face < 0) { ctx.save(); ctx.translate(x + fr.w, y); ctx.scale(-1, 1); ctx.drawImage(xr, 0, 0); ctx.restore(); } else ctx.drawImage(xr, x, y);
    if (flash && k < 0.25) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = `rgba(255,250,230,${0.5 * (1 - k * 4)})`; ctx.fillRect(0, 0, cv.width, cv.height); ctx.restore(); }
  };
  if (G.kxray && !P.dead) list.push({ d: P.x + P.y + 0.06, f: () => xray(1 - G.kxray.t / G.kxray.t0, true) });
  // Eternal Radiance (Amber-That-Eats-Itself): while he burns, every few seconds the fire flares through him and for a
  // breath he is the immolated monk: white-hot, his skeleton black inside the light
  if (P.kamber && !P.dead && !G.kxray) { const cyc = (G.time % 2.6) / 0.34; if (cyc < 1) list.push({ d: P.x + P.y + 0.06, f: () => { xray(cyc, false); const q = pq(); fxBurst(q.sx, q.sy - 28 - lift(), 22, cyc * 0.9, 'day', 1, 0.8); } }); }
  // beams: the sun's melting beams, the pinch's golden thread, the spit
  for (const b of G.kbeams) list.push({ d: 1e4, f: () => drawBeam(b) });
  function drawBeam(b) {
    const q = pq(), e = iso(b.x, b.y), k = b.t / (b.spit ? 0.25 : b.thread ? 0.3 : 0.22);
    if (b.thread) {   // Pinch-That-Cuts-The-Strings: a pale string drawn taut from his pinched fingers to the heart of it, a
      // black shadow-line under it; halfway through it snaps, the two ends whip back, and the heart flashes
      const x0 = q.sx + (P.face || 1) * 11, y0 = q.sy - 30 - lift(), x1 = e.sx, y1 = e.sy - 16, pr = 1 - k, snap = pr > 0.45;
      fxBurst(x0, y0, 4, Math.min(0.99, pr * 1.5), 'void', 1);
      const seg = (xa, ya, xb, yb, curl) => { for (let i = 0; i <= 24; i++) { const t = i / 24, x = xa + (xb - xa) * t + curl * Math.sin(t * 3.14) * t * 8, y = ya + (yb - ya) * t - curl * t * t * 6; ctx.fillStyle = FXP.void[1]; ctx.fillRect(Math.round(x), Math.round(y) + 1, 1, 1); ctx.fillStyle = FXP.void[i % 4 ? 5 : 4]; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); } };
      if (!snap) seg(x0, y0, x1, y1, 0);
      else { const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, w = (pr - 0.45) * 1.8; seg(x0, y0, mx - (mx - x0) * w, my - (my - y0) * w, 1.2 * w); seg(x1, y1, mx + (x1 - mx) * w, my + (y1 - my) * w, -1.2 * w); }
      fxBurst(x1, y1, 9, snap ? Math.min(0.99, (pr - 0.45) * 2) : 0.05, 'void', 2);
      if (snap) for (let i = 0; i < 4; i++) { const an = i * 1.571 + 0.785, r = 4 + (pr - 0.45) * 20; ctx.fillStyle = FXP.void[5]; ctx.fillRect(Math.round(x1 + Math.cos(an) * r), Math.round(y1 + Math.sin(an) * r), 1, 1); }
    } else if (b.spit) {   // the spit: a black glob with a violet sheen arcing to the ground, drops trailing it; a splash where it lands
      const t2 = 1 - k, arc = t => [q.sx + (e.sx - q.sx) * t, q.sy - 30 + (e.sy - q.sy + 30) * t - Math.sin(t * 3.14) * 18];
      for (let i = 1; i <= 4; i++) { const [xd, yd] = arc(Math.max(0, t2 - i * 0.07)); ctx.fillStyle = FXP.void[i < 3 ? 1 : 3]; ctx.fillRect(Math.round(xd), Math.round(yd), 1, 1); }
      const [x, yb] = arc(t2), X = Math.round(x), Y = Math.round(yb);
      for (let j = -3; j <= 3; j++) { const w = Math.round(3.4 * Math.sqrt(1 - (j / 3.6) ** 2)); for (let i = -w; i <= w; i++) { const edge = Math.abs(i) === w || Math.abs(j) === 3, ci = edge ? (i + j < 0 ? 5 : 4) : (i === -1 && j === -1) ? 5 : 0; if (FX_RIM && ci < 4) continue; ctx.fillStyle = FXP.void[ci]; ctx.fillRect(X + i, Y + j, 1, 1); } }   // a fat black glob with a violet rim
      if (t2 > 0.7) { const k2 = (t2 - 0.7) / 0.3; fxBurst(e.sx, e.sy - 3, 14, k2 * 0.85, 'void', 1, 1, 0.55); fxRing(e.sx, e.sy, 0.4 + k2 * 0.8, k2, 'void', 2, 9, 0); }   // the splash where it lands
    }
    else { fxBeam(q.sx, q.sy - 30 - lift(), e.sx, e.sy - 10, 1.4 * k + 0.4, 'day', b.x * 7); fxBurst(e.sx, e.sy - 10, 7, 1 - k, 'day', 2); }
  }
  // Morning-Star-Exhaled: a cone of phosphor fire sweeping the arc, its leading edge a white-hot blade
  for (const c of G.kcones) list.push({ d: c.x + c.y + 0.5, f: () => {
    const q = iso(c.x, c.y), k = Math.min(1, c.t / c.dur), sweep = c.a0 + (c.a1 - c.a0) * k, fade = c.t > c.dur ? Math.max(0, 1 - (c.t - c.dur) / 0.35) : 1;
    // the burnt ground under the swept part: clusters of fire at every depth
    for (let i = 0; i < 70; i++) { const u = mkH(i, 3), a = c.a0 + (sweep - c.a0) * mkH(i, 5), r = c.R * (0.2 + 0.8 * u), p2 = iso(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r); if (mkH(i, Math.floor(G.time * 10)) > fade) continue; ctx.fillStyle = FXP.day[u > 0.8 ? 4 : u > 0.5 ? 3 : 2]; ctx.fillRect(Math.round(p2.sx), Math.round(p2.sy - 2 - mkH(i, 9) * 6), 2, 1); }
    for (let i = 0; i < 14; i++) { const u = ((G.time * 3 + i / 14) % 1), a = c.a0 + (sweep - c.a0) * ((i * 0.618) % 1), p2 = iso(c.x + Math.cos(a) * c.R * (0.25 + 0.75 * u), c.y + Math.sin(a) * c.R * (0.25 + 0.75 * u)); mkBlit(mkFlameFrame(i % 3, Math.floor(G.time * 12 + i) % 4), p2.sx, p2.sy - 4, 1 + u * 1.1, fade * (1 - u * 0.4)); }
    if (fade > 0.3) { const e = iso(c.x + Math.cos(sweep) * c.R, c.y + Math.sin(sweep) * c.R); fxBeam(q.sx, q.sy - 18, e.sx, e.sy - 8, 1.6, 'day', Math.floor(sweep * 40)); }
  } });
  // Fist-Of-High-Noon: a colossal fist of phosphor coming down out of the sky: a column of light marks the spot, the
  // fist smears down it, and bursts on the ground
  for (const f of G.kfists) list.push({ d: f.x + f.y + 0.3, f: () => {
    const q = iso(f.x, f.y), k = Math.min(1, f.t / f.dur), drop = (1 - k * k) * 170, x = Math.round(q.sx), y = Math.round(q.sy - 16 - drop);
    if (!f.done) { for (let yy = 0; yy < q.sy; yy += 2) if (mkH(yy, Math.floor(G.time * 20)) < 0.3 + k * 0.5) { ctx.fillStyle = FXP.day[yy % 6 ? 3 : 2]; ctx.fillRect(x - 6 + Math.floor(mkH(yy, 5) * 12), yy, 1, 2); } fxRing(q.sx, q.sy, 0.9, 1 - k, 'day', 2, 5, 2); }
    const a = f.done ? Math.max(0, 1 - (f.t - f.dur) / 0.5) : 1;
    if (a > 0) {
      const fr = noonFistFrame(), fx0 = x - fr.width, fy0 = y - fr.height * 2 + 8;
      if (!f.done && k > 0.4) fxSmear(x, fy0 - 40, x, fy0 + 20, 12, 'day', 0.2);
      fxBurst(x, fy0 + fr.height * 1.3, 26, 0.08 + 0.05 * Math.sin(G.time * 17), 'day', 1, a * 0.9);   // the burning air around it
      ctx.globalAlpha = a; ctx.drawImage(fr, fx0, fy0, fr.width * 2, fr.height * 2); ctx.globalAlpha = 1;
      for (let i = 0; i < 4; i++) mkBlit(mkFlameFrame(i % 3, Math.floor(G.time * 14 + i) % 4), fx0 + 18 + i * 8, fy0 + fr.height * 2 - 2, 0.9, a);
      if (f.done) fxBurst(q.sx, q.sy - 8, 30, Math.min(0.99, (f.t - f.dur) / 0.5), 'day', 1, 1, 0.7);
    }
  } });
  // the ofuda in flight: burning paper, a phosphor tongue behind it
  for (const o of G.kofuda) list.push({ d: o.x + o.y + 0.2, f: () => { const q = iso(o.x, o.y), y = q.sy - o.z, s = Math.sin(o.spin); const of = mkOfudaFrame(); ctx.drawImage(of, 0, 0, 7, 13, Math.round(q.sx - 3.5 * Math.max(0.3, Math.abs(s))), Math.round(y - 7), Math.max(2, Math.round(7 * Math.abs(s))), 13); mkBlit(mkFlameFrame(1, Math.floor(G.time * 12) % 4), q.sx, y + 10, 0.6, 1); } });
  // tears: falling white-gold drops, lying as mines that pulse, geysers of phosphor
  for (const t of G.ktears) list.push({ d: t.x + t.y - 0.3, f: () => {
    const q = iso(t.x, t.y);
    if (t.fall > 0) { const k = 1 - t.fall / 0.4, s = iso(t.x0 + (t.x - t.x0) * k, t.y0 + (t.y - t.y0) * k), yy = s.sy - 34 + k * 34 - Math.sin(k * 3.14) * 10; ctx.fillStyle = FXP.day[0]; ctx.fillRect(Math.round(s.sx), Math.round(yy), 1, 2); ctx.fillStyle = FXP.day[2]; ctx.fillRect(Math.round(s.sx), Math.round(yy) - 2, 1, 2); ctx.fillStyle = FXP.day[4]; ctx.fillRect(Math.round(s.sx), Math.round(yy) - 4, 1, 1); return; }
    const pulse = Math.floor(G.time * 5 + t.x * 3) % 4;
    ctx.fillStyle = FXP.day[4]; ctx.fillRect(Math.round(q.sx) - 2, Math.round(q.sy) - 1, 5, 2); ctx.fillStyle = FXP.day[2]; ctx.fillRect(Math.round(q.sx) - 1, Math.round(q.sy) - 3, 3, 3); ctx.fillStyle = FXP.day[pulse ? 1 : 0]; ctx.fillRect(Math.round(q.sx), Math.round(q.sy) - 3, 1, 2);
    if (t.arm <= 0 && pulse === 0) { ctx.fillStyle = FXP.day[3]; ctx.fillRect(Math.round(q.sx) - 3, Math.round(q.sy) - 2, 1, 1); ctx.fillRect(Math.round(q.sx) + 3, Math.round(q.sy) - 2, 1, 1); }
  } });
  for (const g of G.kgeysers) list.push({ d: g.x + g.y + 0.25, f: () => {
    const q = iso(g.x, g.y), k = g.t / 0.7, h = 40 * Math.sin((1 - k) * 3.14) + 6;
    for (let yy = 0; yy < h; yy++) { const u = yy / h, hw = 3 + (1 - u) * 2 + mkH(yy, Math.floor(G.time * 16)) * 2; for (let o = -hw; o <= hw; o++) { const d = Math.abs(o) / hw; if (u > 0.8 && mkH(o + 9, yy) > 1.5 - u) continue; ctx.fillStyle = FXP.day[u > 0.85 ? 4 : d > 0.7 ? 3 : d > 0.35 ? 2 : u < 0.6 ? 0 : 1]; ctx.fillRect(Math.round(q.sx + o), Math.round(q.sy - yy), 1, 1); } }
    for (let i = 0; i < 3; i++) mkBlit(mkFlameFrame(i, Math.floor(G.time * 14 + i) % 4), q.sx + (i - 1) * 5, q.sy + 2, 1.1, k * 1.5);
  } });
  // Bell-Of-One-Syllable: a bell of phosphor dropping over him; each ring flashes white through it
  if (G.kbell) list.push({ d: P.x + P.y + 0.3, f: () => {
    const B = G.kbell, q = pq(), dropK = B.drop > 0 ? B.drop / 0.25 : 0, bot = q.sy + 4, ring = B.ring > 0 ? B.ring / 0.4 : 0, fade = Math.min(1, B.t / 0.6);
    const bf = mkBellFrame(), yb = Math.round(bot - 50 - dropK * 60);
    if (dropK > 0) fxSmear(q.sx, yb - 30, q.sx, yb + 10, 14, 'day', 1 - dropK);
    ctx.globalAlpha = fade * (0.7 + 0.3 * ring); ctx.drawImage(bf, Math.round(q.sx - 22), yb); ctx.globalAlpha = 1;
    if (ring > 0) fxRing(q.sx, bot - 2, 1.2 + (1 - ring) * 1.8, 1 - ring, 'day', 2, 7, 4);
  } });
  // Palm-That-Is-Hungry: a black hole opened in his palm, the air and its grit dragged into it, its edge eaten
  if (G.kpalm) list.push({ d: P.x + P.y + 0.2, f: () => {
    const q = pq(), x = q.sx + (P.face || 1) * 20, y = q.sy - 30 - lift();
    fxBurst(x, y, 12, 0.35 + 0.05 * Math.sin(G.time * 20), 'void', Math.floor(G.time * 10) % 3);
    for (let i = 0; i < 16; i++) { const a = G.time * 4 + i * 0.393, rr = 14 + ((G.time * 40 + i * 7) % 22), px2 = x + Math.cos(a) * rr, py2 = y + Math.sin(a) * rr * 0.6; ctx.fillStyle = i % 3 ? FXP.void[3] : FXP.void[5]; ctx.fillRect(Math.round(px2), Math.round(py2), 2, 1); ctx.fillStyle = FXP.void[1]; ctx.fillRect(Math.round(px2 + (x - px2) * 0.1), Math.round(py2 + (y - py2) * 0.1), 1, 1); }
  } });
  // Clap-That-Ends-Speech: a ring of the void, the air itself torn away
  for (const c of G.kclaps) list.push({ d: -1e4, f: () => { const q = iso(c.x, c.y), k = c.t / c.dur, R = c.R * (0.2 + 0.8 * k); fxRing(q.sx, q.sy - 4, R, k, 'void', 4, c.x, 0); } });
  // torn-off shadows, fleeing
  for (const s of G.kshades) list.push({ d: s.x + s.y - 0.2, f: () => { const q = iso(s.x, s.y), k = s.t / 1.1; const rx = 6 + s.w * 6, ry = 2.5 + s.w * 2; for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + 0.5)) ** 2)) * (0.8 + 0.3 * mkH(y + 5, Math.floor(G.time * 8)))); if (mkH(y, 3) > k + 0.3) continue; ctx.fillStyle = FXP.void[Math.abs(y) > ry - 1 ? 3 : 1]; ctx.fillRect(Math.round(q.sx - w + y), Math.round(q.sy + y), w * 2, 1); } for (let i = 0; i < 3; i++) { ctx.fillStyle = FXP.void[1]; ctx.fillRect(Math.round(q.sx) - 1 + i, Math.round(q.sy - 12 * (1 - k)) - i * 2, 1, Math.round(12 * (1 - k))); } } });
  // Hand-From-Below: a colossal many-jointed hand of the void closing on its prey, its edges eaten ragged
  for (const h of G.khands) list.push({ d: h.x + h.y + 0.1, f: () => {
    const q = iso(h.x, h.y), rise = Math.min(1, h.t / 0.3), close = Math.min(1, h.t / 0.6), out = h.t > h.dur ? Math.max(0, 1 - (h.t - h.dur) / 0.4) : 1;
    for (let y = -6; y <= 6; y++) { const w = Math.round(15 * Math.sqrt(1 - (y / 6.5) ** 2) * out); ctx.fillStyle = FXP.void[Math.abs(y) > 4 ? 2 : 0]; ctx.fillRect(Math.round(q.sx - w), Math.round(q.sy + 1 + y), w * 2, 1); }
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * 6.283 + 0.3; let x = q.sx + Math.cos(a) * 13, y = q.sy + Math.sin(a) * 5, ang = -1.57 + Math.cos(a) * 0.2; const L = (26 + (i % 2) * 6) * rise * out;
      for (let j = 0; j < 3; j++) {
        ang += (Math.cos(a) > 0 ? -1 : 1) * 0.55 * close * (j + 1) * 0.6; const nx = x + Math.cos(ang) * L / 3, ny = y + Math.sin(ang) * L / 3 * 0.9, wj = 3 - j * 0.7;
        fxBeam(x, y, nx, ny, wj, 'void', i * 7 + j, false); { const X0 = x, Y0 = y, X1 = nx, Y1 = ny; post(() => fxBeam(X0, Y0, X1, Y1, wj, 'void', i * 7 + j, false)); }
        ctx.fillStyle = FXP.void[4]; ctx.fillRect(Math.round(nx) - 1, Math.round(ny) - 1, 2, 1);   // a knuckle catching what light there is
        x = nx; y = ny;
      }
      ctx.fillStyle = FXP.void[5]; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
  } });
  // Spit-For-The-Starving: black roots of the starved dead, twisting up; a ring of old blood
  for (const r of G.kroots) post(() => { const q = iso(r.x, r.y), k = Math.min(1, (r.max - r.t) / 0.3); for (let i = 0; i < 9; i++) { const a = r.seed + i * 0.7, d0 = (i % 3) * 0.3 * r.R, h = (9 + (i % 4) * 3) * k; let x = q.sx + Math.cos(a) * d0 * ISO_R, y = q.sy + Math.sin(a) * d0 * ISO_RY; for (let s2 = 0; s2 < h; s2++) { x += Math.sin(G.time * 3 + i + s2 * 0.4) * 0.5 + Math.cos(a) * 0.2; y -= 1; if (s2 % 2 === 0) { ctx.fillStyle = FXP.void[s2 > h - 2 ? 5 : 4]; ctx.fillRect(Math.round(x) - 1, Math.round(y), 1, 1); } } } });
  for (const r of G.kroots) list.push({ d: r.x + r.y - 0.6, f: () => {
    const q = iso(r.x, r.y), k = Math.min(1, (r.max - r.t) / 0.3), fade = Math.min(1, r.t / 0.5);
    ctx.globalAlpha = fade;
    for (let i = 0; i < 9; i++) {
      const a = r.seed + i * 0.7, d0 = (i % 3) * 0.3 * r.R, x0 = q.sx + Math.cos(a) * d0 * ISO_R, y0 = q.sy + Math.sin(a) * d0 * ISO_RY, h = (9 + (i % 4) * 3) * k;
      let x = x0, y = y0; for (let s = 0; s < h; s++) { const w = s < h * 0.4 ? 2 : 1; x += Math.sin(G.time * 3 + i + s * 0.4) * 0.5 + Math.cos(a) * 0.2; y -= 1; ctx.fillStyle = FXP.void[s > h - 2 ? 5 : 1]; ctx.fillRect(Math.round(x), Math.round(y), w, 1); ctx.fillStyle = FXP.void[4]; ctx.fillRect(Math.round(x) - 1, Math.round(y), 1, 1); if (s % 4 === 1) { ctx.fillStyle = '#4a0a12'; ctx.fillRect(Math.round(x) + w, Math.round(y), 1, 1); } }
    }
    const rx = r.R * ISO_R, ry = r.R * ISO_RY; for (let i = 0; i < 60; i++) { const a = i / 60 * 6.283; if (mkH(i, 3) < 0.4) continue; ctx.fillStyle = i % 4 ? '#3a0610' : '#7a1420'; ctx.fillRect(Math.round(q.sx + Math.cos(a) * rx), Math.round(q.sy + Math.sin(a) * ry), 1, 1); }
    ctx.globalAlpha = 1;
  } });
  // stone: bedrock spears, the rolling quake
  for (const s of G.kspikes) list.push({ d: s.x + s.y, f: () => {
    const q = iso(s.x, s.y), k = s.t / s.max, up = k > 0.7 ? (1 - k) / 0.3 : k > 0.25 ? 1 : k / 0.25, img = mkSpikeFrame(s.small ? 2 : s.road ? 0 : 1, s.road), h = Math.max(1, Math.round(img.height * up));
    ctx.drawImage(img, 0, 0, img.width, h, Math.round(q.sx - img.width / 2), Math.round(q.sy + 1 - h), img.width, h);
    if (k > 0.7) for (let i = 0; i < 4; i++) { ctx.fillStyle = FXP.stone[2 + (i % 3)]; ctx.fillRect(Math.round(q.sx - 5 + i * 3), Math.round(q.sy - (1 - k) * 30 * mkH(i, s.x * 9 | 0)), 1, 1); }   // grit thrown up as it bursts out
    ctx.fillStyle = FXP.stone[0]; ctx.fillRect(Math.round(q.sx - 5), Math.round(q.sy), 10, 2);
  } });
  if (G.kquake) { const Q = G.kquake; list.push({ d: -1e4, f: () => { const q = iso(Q.x, Q.y); fxRing(q.sx, q.sy, Q.r, 0.3, 'stone', 2, Q.x, 0); } }); }
  // Pagoda-For-One: three tiers of stone burst up around the prey, then fall in on it
  for (const p of G.kpagodas) list.push({ d: p.x + p.y + 0.05, f: () => {
    const q = iso(p.x, p.y), grow = Math.min(1, p.t / 0.25), fall = p.done ? Math.min(1, (p.t - p.dur) / 0.35) : 0, x = Math.round(q.sx), C = FXP.stone;
    for (let i = 0; i < 3; i++) {
      const w = 22 - i * 5, yb = q.sy - i * 13 * grow + fall * i * 11, hh = Math.round(12 * grow); if (fall >= 1) break;
      ctx.globalAlpha = 1 - fall * 0.8;
      for (let yy = 0; yy < hh; yy++) for (let xx = -w / 2 + 2; xx < w / 2 - 2; xx++) { const lit = xx < -w / 2 + 5, dk = xx > w / 2 - 5; ctx.fillStyle = C[lit ? 3 : dk ? 1 : mkH(xx + i * 9, yy) > 0.85 ? 3 : 2]; ctx.fillRect(x + xx, Math.round(yb - hh + yy), 1, 1); }
      ctx.fillStyle = C[0]; ctx.fillRect(x - 2, Math.round(yb - hh + 3), 4, 5);
      for (let xx = -w / 2 - 3; xx <= w / 2 + 3; xx++) { const t = 1 - Math.abs(xx) / (w / 2 + 3), ty = Math.round(yb - hh + 1 - t * 6); ctx.fillStyle = C[xx < 0 ? 4 : 2]; ctx.fillRect(x + xx, ty, 1, 2); ctx.fillStyle = C[1]; ctx.fillRect(x + xx, ty + 2, 1, 1); }
      if (i === 2) { ctx.fillStyle = FXP.day[2]; ctx.fillRect(x - 1, Math.round(yb - hh - 7), 2, 2); }
    }
    if (!p.done && grow >= 1) { ctx.fillStyle = C[4]; ctx.fillRect(x - 1, Math.round(q.sy - 46), 2, 5); }
    if (p.done && fall < 1) fxBurst(q.sx, q.sy - 14, 18, fall, 'stone', 2);
    ctx.globalAlpha = 1;
  } });
  // the many small blows: palms of light, stone fists, shadow arcs, cauterized holes, craters, collapsing marks, mirrors
  for (const sl of G.kafter || []) { list.push({ d: sl.x + sl.y + 0.3, f: () => drawSlam(sl) }); post(() => drawSlam(sl)); }
  for (const sl of G.kslams) list.push({ d: sl.kind === 'crater' || sl.kind === 'implode' ? -1e4 : sl.x + sl.y + 0.3, f: () => drawSlam(sl) });
  function drawSlam(s) {
    const q = iso(s.x, s.y), y = q.sy - (s.z || 0) - 8, k = s.t;
    if (s.kind === 'arc' || s.kind === 'implode' || s.kind === 'mirror') { if (!s._p) { s._p = 1; } }
    if (s.kind === 'palm' || s.kind === 'stonefist') { const mode = s.kind === 'palm' ? 'day' : 'stone'; fxBurst(q.sx, y, 8, Math.max(0, 1 - k * 4), mode, (s.x * 5) | 0); if (k > 0.1) mkBlit(mkPalmFrame(mode === 'day' ? 'mkGoldFx' : 'mkStoneFx'), q.sx, y + 8, 0.7, Math.min(1, k * 5)); }
    else if (s.kind === 'arc') {   // Spade-That-Cuts-Shadows: a black crescent cut sweeping the arc, a white-violet blade
      // at its leading edge, a flash where it bites; it trails off frayed
      const pr = s.after ? 1 : 1 - s.t / 0.25, fade = s.after ? s.after / 0.35 : 1, R = (s.R || 2) * ISO_R * 0.95, a0 = s.a - 1.6, a1 = s.a + 1.6, head = a0 + (a1 - a0) * Math.min(1, pr * 1.5), n = Math.round(R * 3.5), cy = q.sy - 10;
      for (let i = 0; i <= n; i++) {
        const a = a0 + (head - a0) * i / n, u = i / n, th = Math.round((2 + 7 * Math.pow(u, 1.2)) * (s.after ? fade : 1));
        if ((u < pr - 0.55 || (s.after && mkH(i, 11) > fade)) && mkH(i, 7) > 0.4) continue;   // the tail frays away
        for (let o = 0; o < th; o++) { const rr = R - o * 0.9, ci = o === 0 ? (u > 0.85 ? 5 : mkH(i, 3) > 0.35 ? 5 : 4) : o === th - 1 ? 4 : o === 1 ? 3 : o % 3 === 0 ? 2 : 1; if (FX_RIM && ci < 4) continue; ctx.fillStyle = FXP.void[ci]; ctx.fillRect(Math.round(q.sx + Math.cos(a) * rr), Math.round(cy + Math.sin(a) * rr * 0.5), 1, 1); }
      }
      if (!s.after) { fxBurst(q.sx + Math.cos(head) * R, cy + Math.sin(head) * R * 0.5, 10, Math.min(0.99, pr), 'void', 2); if (!s._aft) { s._aft = 1; (G.kafter || (G.kafter = [])).push(Object.assign({}, s, { after: 0.35 })); } }
    }
    else if (s.kind === 'hole') {   // One-Finger-Truth: a needle of white-hot light straight through it, a flash going in,
      // a spray of embers coming out the far side, and the cauterized hole left smoking
      const pr = 1 - k / 0.5, e = iso(s.x + Math.cos(s.a), s.y + Math.sin(s.a)), dx = (e.sx - q.sx), dy = (e.sy - q.sy), L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      if (pr < 0.3) { fxBeam(q.sx - ux * 26, y - uy * 26, q.sx + ux * 30, y + uy * 30, 1.6 * (1 - pr / 0.3) + 0.5, 'day', 3); fxBurst(q.sx - ux * 4, y - uy * 4, 9, pr / 0.3 * 0.7, 'day', 1); }
      for (let i = 0; i < 10; i++) { const t2 = pr * (0.6 + mkH(i, 3) * 0.8), sp = (mkH(i, 5) - 0.5) * 0.7; if (t2 > 1) continue; ctx.fillStyle = FXP.day[t2 < 0.3 ? 1 : t2 < 0.6 ? 3 : 4]; ctx.fillRect(Math.round(q.sx + (ux - uy * sp) * t2 * 34), Math.round(y + (uy + ux * sp) * t2 * 34 + t2 * t2 * 8), 1, 1); }
      ctx.fillStyle = '#0a0606'; ctx.fillRect(Math.round(q.sx) - 1, Math.round(y) - 1, 3, 3); ctx.fillStyle = FXP.day[pr < 0.5 ? 0 : 2]; ctx.fillRect(Math.round(q.sx), Math.round(y), 1, 1); ctx.fillStyle = FXP.day[3]; ctx.fillRect(Math.round(q.sx) + 1, Math.round(y) - 1, 1, 1); ctx.fillRect(Math.round(q.sx) - 1, Math.round(y) + 1, 1, 1);
      if (Math.random() < 0.4) parts.push({ x: s.x, y: s.y, z: 12, vx: 0, vy: 0, vz: 10, t: 0.6, col: '#4a3a34' });
    }
    else if (s.kind === 'crater') { const R = (s.R || 1.5) * (1.2 - k * 0.2), rx = R * ISO_R, ry = R * ISO_RY; for (let yy = -ry; yy <= ry; yy++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (yy / (ry + 0.5)) ** 2)) * (0.9 + 0.15 * mkH(yy, 7))); ctx.globalAlpha = Math.min(0.85, k * 1.5); ctx.fillStyle = yy < -ry + 2 ? FXP.stone[0] : yy > ry - 2 ? FXP.stone[3] : FXP.stone[1]; ctx.fillRect(Math.round(q.sx - w), Math.round(q.sy + yy), w * 2, 1); } ctx.globalAlpha = 1; fxRing(q.sx, q.sy, R * 1.05, 0.2, 'stone', 2, s.x, 0); }
    else if (s.kind === 'implode') { fxBurst(q.sx, q.sy - 8, 14, Math.min(0.99, 1 - k * 2), 'void', 1); }
    else if (s.kind === 'mirror') {   // the blow comes back out of a pane of black glass: the pane, its crack, the flash
      const pr = 1 - k / 0.35, h = 26, w = 7;
      for (let yy = 0; yy < h; yy++) { const ww = Math.round(w * Math.sqrt(1 - ((yy - h / 2) / (h / 2 + 0.5)) ** 2)); for (let xx = -ww; xx <= ww; xx++) { const edge = Math.abs(xx) >= ww - 0 || yy === 0 || yy === h - 1, ci = edge ? (xx < 0 ? 5 : 4) : (xx + yy) % 9 === 0 ? 3 : 0; if (FX_RIM && ci < 4) continue; ctx.fillStyle = FXP.void[ci]; ctx.fillRect(Math.round(q.sx) + xx, Math.round(q.sy) - h - 2 + yy, 1, 1); } }
      if (pr > 0.2) { let cx0 = q.sx, cy0 = q.sy - h / 2 - 2; for (let i = 0; i < 12; i++) { cx0 += (mkH(i, 3) - 0.5) * 3; cy0 += (i % 2 ? 1.5 : -1.2); ctx.fillStyle = FXP.void[5]; ctx.fillRect(Math.round(cx0), Math.round(cy0), 1, 1); } }
      if (pr < 0.4) fxBurst(q.sx, q.sy - h / 2, 12, pr / 0.4 * 0.8, 'void', 1);
      fxSmear(q.sx - s.face * 4, q.sy - 14, q.sx + s.face * 14, q.sy - 12, 2, 'void', pr);
    }
  }
  // Mirror-With-No-Face while it holds: shards of black glass turning round him, catching a violet light
  if (P.kmirror > 0 && !P.dead) for (const front of [false, true]) list.push({ d: P.x + P.y + (front ? 0.05 : -0.05), f: () => {
    const q = pq();
    for (let i = 0; i < 7; i++) { const a = G.time * 1.6 + i / 7 * 6.283; if ((Math.sin(a) > 0) !== front) continue; const x = q.sx + Math.cos(a) * 17, y = q.sy - 24 - lift() + Math.sin(a) * 6 + Math.sin(G.time * 3 + i) * 2; for (let yy = -4; yy <= 4; yy++) { const ww = Math.round(2.2 * (1 - Math.abs(yy) / 5)); for (let xx = -ww; xx <= ww; xx++) { ctx.fillStyle = FXP.void[xx === -ww ? 5 : xx === ww ? 3 : (xx + yy) === 1 ? 4 : 0]; ctx.fillRect(Math.round(x) + xx, Math.round(y) + yy, 1, 1); } } }
  } });
  // Thousand-Arms-Of-Nothing: a colossal bodhisattva of phosphor and stone standing up behind him, its arms striking out
  if (G.kthousand) list.push({ d: P.x + P.y - 0.3, f: () => {
    const Th = G.kthousand, q = pq(), up = Math.min(1, Th.t / 0.35), out = Th.t > 1.4 ? Math.max(0, 1 - (Th.t - 1.4) / 0.4) : 1, a = up * out, cx = q.sx - (P.face || 1) * 6, cy = q.sy - 30 - 30 * up;
    if (a <= 0) return;
    const gf = heroFrame('monk', 'sun', 0, 'down'), gs = mkSil(gf, 1, '#c88a2a'); ctx.globalAlpha = 0.55 * a; ctx.drawImage(gs, Math.round(cx - gf.ox * 1.6), Math.round(cy + 40 - gf.oy * 1.6), Math.round(gf.w * 1.6), Math.round(gf.h * 1.6)); ctx.globalAlpha = 1;
    for (let i = 0; i < 18; i++) {
      const an = -Math.PI + i / 17 * Math.PI, L = (38 + (i % 3) * 8 + Math.sin(G.time * 12 + i) * 4) * a, ex = cx + Math.cos(an) * L, ey = cy + 2 + Math.sin(an) * L * 0.8, mode = i % 2 ? 'day' : 'stone';
      fxBeam(cx + Math.cos(an) * 8, cy + 2 + Math.sin(an) * 6, ex, ey, 1.5, mode, i * 5, false);
      mkBlit(mkPalmFrame(mode === 'day' ? 'mkGoldFx' : 'mkStoneFx'), ex, ey + 8, 0.6, 1);
    }
    fxBurst(cx, cy - 18, 10, 0.1, 'day', 0, a);
  } });
  // the leap: his shadow racing ahead of him on the ground, a ring of grit where he will land
  if (P.kleap) { const L = P.kleap; list.push({ d: -1e4, f: () => { const q = iso(L.x1, L.y1); fxRing(q.sx, q.sy, 1.5 + 1.6 * L.wk, 0.1, 'stone', 1, 3, 0); } }); }
  // the gathering before a cast: motes drawn into his open palm (sparks by day, the dark by night)
  if (P.cast > 0 && P.kposeId && !P.dead && P.knothing <= 0) {
    const tab = SK[P.kposeId] ? SK[P.kposeId].tab : 0, mode = tab === 1 ? 'void' : tab === 2 ? 'stone' : 'day';
    list.push({ d: P.x + P.y + 0.07, f: () => {
      const [pose, ph] = heroPose(); if (ph > 1) return;
      const J = mkRig(pose, ph, P._view || (P._fb ? 'back' : 'front'), typeof monkWtBucket === 'function' ? monkWtBucket() : 1), face = P.face || 1, q = pq();
      const hx = q.sx + J.haN[0] * face, hy = q.sy + J.haN[1] + 3 - 1 - lift(), C = FXP[mode];
      for (let i = 0; i < 10; i++) { const u = ((G.time * 2.5 + i / 10) % 1), a = i * 2.4, r = (1 - u) * 16; ctx.fillStyle = C[u > 0.8 ? (mode === 'void' ? 4 : 0) : mode === 'void' ? 3 : 2]; ctx.fillRect(Math.round(hx + Math.cos(a) * r), Math.round(hy + Math.sin(a) * r * 0.8), 1, 1); }
      fxBurst(hx, hy, 3 + ph * 2, 0.15, mode, 1);
    } });
  }
}

// ------------------------------------------------------------------- light: by day he is the light
function monkLight() {
  if (!isMonk() || P.dead || !G.zone) return;
  const q = iso(P.x, P.y), k = KS.skyK(), lf = P.leapZ || 0;
  if (P.knothing > 0) return;
  if (k == null || k > 0.5) lightHole(q.sx, q.sy - 16 - lf, 70, 0.5);
  if (P.ksun > 0) lightHole(q.sx, q.sy - 26 - lf, 90, 1);
  if (P.kamber) lightHole(q.sx, q.sy - 6, 40, 0.6);
  if (P.klotus) lightHole(q.sx, q.sy - 10 - lf, 50, 0.7);
  if (P.keye) { const a = P.keye.ang; for (let i = 1; i <= 5; i++) { const e = iso(P.x + Math.cos(a) * i * 1.5, P.y + Math.sin(a) * i * 1.5); lightHole(e.sx, e.sy - 10, 18, 0.6); } }
  for (const f of G.kfists) { const e = iso(f.x, f.y); lightHole(e.sx, e.sy - 10, 45, 0.4); }
  for (const g of G.kgeysers) { const e = iso(g.x, g.y); lightHole(e.sx, e.sy - 10, 40, 0.7); }
  for (const t of G.ktears) { const e = iso(t.x, t.y); lightHole(e.sx, e.sy, 10, 0.3); }
  for (const o of G.kofuda) { const e = iso(o.x, o.y); lightHole(e.sx, e.sy - o.z, 14, 0.5); }
  if (G.kbell) lightHole(q.sx, q.sy - 26, 44, 0.5);
  // v0.37: the void's work, lit only enough to see its eaten edges; the phosphor's bursts, lit as they burn
  const LH = (x, y, r, a) => { const e = iso(x, y); lightHole(e.sx, e.sy - 8, r, a); };
  for (const f of G.kfx || []) { const k = f.t / f.t0; if (f.k === 'shock') LH(f.x, f.y, 20 + f.R * 22, 0.45 * k); else if (f.k === 'arm' || f.k === 'palm' || f.k === 'hole') LH(f.x, f.y, 26, 0.4 * k); else if (f.k === 'pillar') LH(f.x, f.y, 60, 0.7 * k); }
  for (const c of G.kclaps) LH(c.x, c.y, 30 + c.R * 20, 0.4);
  for (const w of G.kwaves) LH(w.x, w.y, 30 + w.R * 18 * (w.t / w.dur), 0.35);
  for (const h of G.khands) LH(h.x, h.y, 40, 0.45);
  for (const r of G.kroots) LH(r.x, r.y, 20 + r.R * 22, 0.45);
  for (const s of G.kslams) LH(s.x, s.y, 28, 0.45);
  for (const s of G.kshades) LH(s.x, s.y, 20, 0.35);
  for (const c of G.kcones) LH(c.x, c.y, 50 + c.R * 12, 0.6);
  for (const s of G.kspikes) LH(s.x, s.y, 16, 0.3);
  for (const p of G.kpagodas) LH(p.x, p.y, 30, 0.4);
  if (G.kpalm) lightHole(q.sx + (P.face || 1) * 20, q.sy - 30, 40, 0.5);
  if (G.kthousand) lightHole(q.sx, q.sy - 50, 90, 0.7);
  for (const b of G.kbeams) { const e = iso(b.x, b.y); lightHole(e.sx, e.sy - 10, 24, 0.5); }
}
{
  const _l14 = light14;
  light14 = function () { _l14(); try { monkLight(); } catch (e) { } };
  // the whole world drains to grey while he does not exist; a false dawn and an eclipse come on with a flash
  const _da = drawAtmos;
  drawAtmos = function () {
    _da();
    if (!isMonk() || !G.running) return;
    if (G.kpost && G.kpost.length) { FX_RIM = true; try { for (const fn of G.kpost) fn(); } catch (e) { } finally { FX_RIM = false; } }
    G.kpost = [];
    if (P.knothing > 0) { ctx.save(); ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = `rgba(128,128,128,${Math.min(1, P.knothing * 2, 1)})`; ctx.fillRect(0, 0, VW, VH); ctx.restore(); ctx.fillStyle = 'rgba(20,18,26,0.18)'; ctx.fillRect(0, 0, VW, VH); }
    if (G.kflash) { const k = G.kflash.t / 0.9; ctx.fillStyle = G.kflash.kind === 'noon' ? `rgba(255,248,220,${0.75 * k})` : `rgba(0,0,0,${0.8 * k})`; ctx.fillRect(0, 0, VW, VH); }
    if (G.skyForce && G.skyForce.kind === 'night') { const g = ctx.createRadialGradient(VW / 2, VH / 2, VH * 0.25, VW / 2, VH / 2, VW * 0.7); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(4,2,8,0.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH); }
  };
}

// ------------------------------------------------------------------- the lamp: none by day; by night a paper lantern with a black flame
{
  const _lf = lampFrame;
  lampFrame = function (cls) {
    if (cls !== 'monk') return _lf(cls);
    if (LAMP_FR.monk) return LAMP_FR.monk;
    const fr = mkFrameHR(12, 16, (x, ox, oy) => {
      const A = painter2(x, ox, oy, {});
      A.L(0, -15, 0, -12.5, '#1a1210', 0.5); A.R(-1.4, -12.6, 2.8, 0.6, '#0a0808');
      // grey paper gone dark, black ribs, a black flame with a thin violet-white edge
      A.ball(0, -9, 2.5, 3.3, mkRamp('#060408', '#2a2430', '#6a6070', 5), { lit: 0.05 });
      for (let i = 0; i < 4; i++) A.L(-2.4, -11 + i * 1.4, 2.4, -11 + i * 1.4, 'rgba(0,0,0,0.6)', 0.5);
      A.E(0, -8.6, 1.1, 1.6, '#e8d8ff'); A.E(0, -8.4, 0.8, 1.3, '#000000'); A.P(0, -10.2, '#000000');
      A.R(-1.4, -5.8, 2.8, 0.6, '#0a0808'); A.L(0, -5.2, 0, -3.6, '#6a5a8a', 0.5);
    });
    LAMP_FR.monk = fr; return fr;
  };
  const _dcl = drawClassLamp;
  drawClassLamp = function (list) { if (isMonk()) { const k = KS.skyK(); if ((k == null ? 0.4 : k) > 0.5 || P.ksun > 0 || P.knothing > 0) return; } return _dcl(list); };
}
Object.defineProperty(LAMP_RGB, 'monk', { enumerable: true, get() { const k = typeof KS !== 'undefined' ? KS.skyK() : 1; return k == null || k > 0.5 ? '255,214,140' : '150,130,190'; } });

// ------------------------------------------------------------------- the sky dial: cracked while he holds the sky
function drawSkyCrack() {
  const f = G.skyForce; if (!f) return;
  const cx = W - 22, cy = 14;
  if (!isOutdoor(G.zone)) {   // underground there is no dial: draw a small one, cracked
    ctx.fillStyle = 'rgba(10,9,13,0.6)'; ctx.beginPath(); ctx.arc(cx, cy, 8, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#3a3446'; ctx.beginPath(); ctx.arc(cx, cy, 8, Math.PI, 0); ctx.stroke();
  }
  const noon = f.kind === 'noon';
  ctx.fillStyle = noon ? '#fff0b0' : '#05040a'; ctx.beginPath(); ctx.arc(cx, cy - 6, 2.2, 0, 6.28); ctx.fill(); if (!noon) { ctx.strokeStyle = '#a898c8'; ctx.stroke(); }
  ctx.strokeStyle = noon ? '#fff6d0' : '#b8a8d8'; ctx.beginPath(); ctx.moveTo(cx - 7, cy - 1); ctx.lineTo(cx - 3, cy - 4); ctx.lineTo(cx - 1, cy - 2); ctx.lineTo(cx + 2, cy - 7); ctx.lineTo(cx + 4, cy - 5); ctx.lineTo(cx + 7, cy - 6); ctx.stroke();
  ctx.fillStyle = 'rgba(10,9,13,0.85)'; ctx.fillRect(cx - 16, cy + 3, 32, 8);
  txt(`${noon ? 'NOON' : 'ECLIPSE'} ${Math.ceil(f.t)}`, cx, cy + 9, noon ? '#fff0b0' : '#b8a8d8', 'center', false);
}

// ------------------------------------------------------------------- HUD: Weight (a stance gauge beside the Essence orb)
function drawMonkRow() {
  // Weight: a balance bar. The notch is the middle (50, where he starts); it fills right toward HEAVY, left toward LIGHT
  const x0 = 68, y0 = HUD_Y + 11, w = 120, c = x0 + w / 2, s = KS.wS(), perfect = P.kpoise, t = G.time;
  ctx.fillStyle = perfect ? `rgba(240,208,112,${0.6 + 0.4 * Math.sin(t * 6)})` : '#0a090d'; ctx.fillRect(x0 - 2, y0 - 2, w + 4, 10);
  ctx.fillStyle = '#0a090d'; ctx.fillRect(x0 - 1, y0 - 1, w + 2, 8);
  ctx.fillStyle = '#1a1c24'; ctx.fillRect(x0, y0, w / 2, 6); ctx.fillStyle = '#231d16'; ctx.fillRect(c, y0, w / 2, 6);
  const len = Math.round(Math.abs(s) * w / 2);
  if (s > 0) { const g = ctx.createLinearGradient(c, 0, x0 + w, 0); g.addColorStop(0, '#8a7a5a'); g.addColorStop(1, perfect ? '#fff0a0' : '#d8a840'); ctx.fillStyle = g; ctx.fillRect(c, y0, len, 6); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(c, y0, len, 1); }
  else if (s < 0) { const g = ctx.createLinearGradient(c, 0, x0, 0); g.addColorStop(0, '#6a8aa8'); g.addColorStop(1, '#d8f0ff'); ctx.fillStyle = g; ctx.fillRect(c - len, y0, len, 6); ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(c - len, y0, len, 1); }
  for (const f of [0.17, 0.33, 0.67, 0.83]) { ctx.fillStyle = 'rgba(10,9,13,0.7)'; ctx.fillRect(x0 + Math.round(w * f), y0 + 4, 1, 2); }
  ctx.fillStyle = '#e8e2d0'; ctx.fillRect(c - 1, y0 - 3, 2, 12);   // the middle notch
  const kx = c + Math.round(s * w / 2); ctx.fillStyle = '#0a090d'; ctx.fillRect(kx - 2, y0 - 2, 4, 10); ctx.fillStyle = perfect ? '#fff0a0' : s > 0 ? '#f0c860' : s < 0 ? '#d8f0ff' : '#e8e2d0'; ctx.fillRect(kx - 1, y0 - 1, 2, 8);
  // labels at each end, the reading in the middle
  const ly = HUD_Y + 26;
  txt('LIGHT', x0, ly, s < -0.3 ? '#d8f0ff' : '#6a7a8a'); txt('HEAVY', x0 + w, ly, s > 0.3 ? '#f0c860' : '#7a6a50', 'right');
  txt(perfect ? 'POISED' : `${Math.round(P.weight)} · Lv ${P.level}`, c, ly, perfect ? `rgb(255,${220 + Math.round(35 * Math.sin(t * 6))},140)` : '#e8e2d0', 'center');
  const k = KS.skyK();
  if (inRect(mouse, 66, HUD_Y + 8, 140, 22)) { const h = KS.wH(), l = KS.wL(); tooltip = [['Weight (重)', '#c9a66b'], [`${Math.round(P.weight)} / 100 · ${KS.stance()}`, '#e8e2d0'],
    ['It starts in the middle and follows what you do:', '#a39d8c'], ['standing still, slams, rooting, blocking and the', '#c9a66b'], ['heavy skills push it up; moving, rolling, leaping,', '#9ab0c8'], ['quick strikes and the light skills push it down.', '#9ab0c8'],
    [`Now: damage x${KS.wDmg().toFixed(2)} · speed x${((1 - 0.18 * h) * (1 + 0.25 * l)).toFixed(2)} · attack speed x${((1 - 0.06 * h) * (1 + 0.25 * l)).toFixed(2)}`, '#e8e2d0'],
    [`knockback x${(P.kpoise ? 0 : (1 - 0.6 * h) * (1 + 0.3 * l)).toFixed(2)} · poise x${(1 + 0.5 * h).toFixed(2)}`, '#e8e2d0'],
    ['Heavy: up to -18% speed, +25% damage. Light: up to +25% speed.', '#a39d8c'],
    ['At 100: PERFECT POISE. No stagger, no knockback,', '#f0d070'], ['no slows, +8% damage (until it falls below 90).', '#f0d070'],
    ['The Wheel of the Sky', '#d9a441'], [k == null ? 'Underground: dusk, neutral' : `Radiance x${KS.sky(0).toFixed(2)} · Absence x${KS.sky(1).toFixed(2)}`, '#a39d8c']]; }
}
function monkHudText() {
  let y = 22; const line = (s, c) => { txt(s, 8, y, c); y += 10; };
  if (G.skyForce) line(`${G.skyForce.kind === 'noon' ? 'FALSE NOON' : 'ECLIPSE'} ${Math.ceil(G.skyForce.t)}s`, G.skyForce.kind === 'noon' ? '#fff0b0' : '#b8a8d8');
  else if (P.kskyCd > 0 && (P.skills.kdawn > 0 || P.skills.keclipse > 0)) line(`The sky turns again in ${Math.ceil(P.kskyCd)}s`, '#6f6a79');
  if (P.kamber) line('AMBER THAT EATS ITSELF', '#ffd870');
  if (P.kwalk) line('WALKS WITHOUT FEET', '#8a7aa8');
  if (P.kobsid > 0) line(`MANTRA OF OBSIDIAN ${Math.ceil(P.kobsid)}s`, '#8a86a0');
  if (P.kmirror > 0) line(`MIRROR WITH NO FACE ${P.kmirror.toFixed(1)}s`, '#8a7aa8');
  if (P.knothing > 0) line(`ONE WITH NOTHING ${Math.ceil(P.knothing)}s · ${G.kmarks.length} marked`, '#c8c4d6');
  if (P.ksun > 0) line(`HANGING AS THE SUN ${Math.ceil(P.ksun)}s`, '#ffd870');
  if (G.kbell) line(`BELL ${Math.ceil(G.kbell.t)}s`, '#f0d890');
  if (P.klotus) line('LOTUS WITHOUT MERCY', '#ffe8a0');
  if (P.kbarHold) line('HOLDING THE WAY', '#b0aca0');
  if (P.kpoise) line('PERFECT POISE: unmoved', '#f0d070');
  if (P.skills.kbowl > 0) line(`Bowl ${P.kbowl}/6`, '#c9a66b');
  if (P.skills.ksutra > 0) line(`Halo ${P.khalo}/${KS.haloMax()}`, '#ffb060');
  if (G.kbuddha) line(`The Weeping One ${Math.ceil(G.kbuddha.hp)}/${G.kbuddha.max}`, '#b0aca0');
}

// ------------------------------------------------------------------- icons
function monkIcon(id, x, y) {
  const f = (col, a, b, w, h) => { ctx.fillStyle = col; ctx.fillRect(x + a, y + b, w, h); };
  const Au = '#f0c848', Au2 = '#fff6c0', Am = '#ffb060', K = '#0e0d12', V = '#6a5a8a', V2 = '#b8a8d8', St = '#8e8b82', St2 = '#bcb8ac', Sk = '#8a8a90', Pa = '#f2ecd8', R = '#b02818';
  const fist = (a, b, col) => { f(col, a, b, 5, 4); f(K, a + 1, b + 1, 1, 1); f(K, a + 3, b + 1, 1, 1); f(col, a + 4, b + 2, 2, 2); };
  const sun = (a, b, r) => { ctx.fillStyle = Au; ctx.beginPath(); ctx.arc(x + a, y + b, r, 0, 6.28); ctx.fill(); };
  switch (id) {
    case 'kdawn': sun(9, 10, 4); f(Au2, 8, 9, 2, 2); for (let i = 0; i < 8; i++) { const a = i * 0.785; f(Au2, 9 + Math.round(Math.cos(a) * 7), 10 + Math.round(Math.sin(a) * 7), 1, 1); } f(Sk, 3, 14, 12, 3); break;
    case 'kdawn2': case 'kdawn3': sun(9, 9, 5); f('#ffffff', 8, 8, 2, 2); break;
    case 'keclipse': case 'kecl2': case 'kecl3': sun(9, 9, 6); ctx.fillStyle = K; ctx.beginPath(); ctx.arc(x + 9, y + 9, 5, 0, 6.28); ctx.fill(); f(Sk, 3, 14, 12, 3); break;
    case 'kamber': case 'kash': case 'kamberw': for (let i = 0; i < 6; i++) f(i % 2 ? Am : Au2, 2 + i * 2.6, 6 + (i % 3), 2, 10 - (i % 3)); f(Sk, 6, 12, 6, 4); break;
    case 'khands': case 'khshove': for (let i = 0; i < 4; i++) f(i % 2 ? Au : Au2, 2 + i * 3, 3 + i * 3, 5, 4); break;
    case 'klaugh': case 'klaughw': ctx.strokeStyle = Au2; ctx.beginPath(); ctx.arc(x + 9, y + 9, 7, 0, 6.28); ctx.stroke(); f(Au, 5, 10, 8, 2); f(K, 6, 10, 6, 1); f(K, 5, 6, 2, 1); f(K, 11, 6, 2, 1); break;
    case 'kstar': case 'kstarun': ctx.fillStyle = Am; ctx.beginPath(); ctx.moveTo(x + 3, y + 9); ctx.lineTo(x + 16, y + 3); ctx.lineTo(x + 16, y + 15); ctx.closePath(); ctx.fill(); f(Au2, 3, 8, 6, 2); break;
    case 'kfist': case 'kfring': f(Au, 5, 1, 7, 8); fist(4, 8, Au2); f(Am, 2, 15, 14, 2); break;
    case 'ksutra': case 'ksmore': for (let i = 0; i < 3; i++) { f(Pa, 3 + i * 5, 4 + (i % 2) * 3, 3, 8); f(R, 4 + i * 5, 6 + (i % 2) * 3, 1, 2); f(Am, 4 + i * 5, 12 + (i % 2) * 3, 1, 2); } break;
    case 'ktears': case 'ktmore': for (const [a, b] of [[4, 4], [11, 6], [7, 11]]) { f('#bfeaff', a, b, 2, 3); f('#ffffff', a, b, 1, 1); } f(Am, 3, 15, 12, 1); break;
    case 'keye': case 'keyecut': f(Au, 3, 7, 12, 5); f('#ffffff', 8, 7, 2, 5); f('#ffffff', 10, 9, 7, 1); break;
    case 'kbell': case 'kbloud': f('#c8963c', 5, 4, 8, 9); f('#c8963c', 3, 12, 12, 2); f(Au2, 8, 2, 2, 2); f(K, 8, 14, 2, 2); break;
    case 'klotus': case 'klpull': for (let i = 0; i < 5; i++) { const a = -2.8 + i * 0.7; f(i % 2 ? Au2 : Au, 8 + Math.round(Math.cos(a) * 6), 11 + Math.round(Math.sin(a) * 6), 3, 3); } f(Sk, 6, 11, 6, 4); break;
    case 'ksun': case 'ksunlong': sun(9, 7, 5); f(Sk, 7, 12, 4, 5); f(Sk, 3, 11, 4, 1); f(Sk, 11, 11, 4, 1); break;
    case 'kpalm': case 'kpalmw': ctx.fillStyle = K; ctx.beginPath(); ctx.arc(x + 9, y + 9, 5, 0, 6.28); ctx.fill(); ctx.strokeStyle = V2; ctx.beginPath(); ctx.arc(x + 9, y + 9, 6, 0.5, 5); ctx.stroke(); break;
    case 'kclap': case 'kclapw': f(Sk, 4, 4, 4, 9); f(Sk, 10, 4, 4, 9); ctx.strokeStyle = V2; ctx.beginPath(); ctx.arc(x + 9, y + 9, 8, 0, 6.28); ctx.stroke(); break;
    case 'kbowl': case 'kbowlw': f('#6a4a30', 3, 9, 12, 4); f('#8a6844', 3, 8, 12, 1); f(K, 5, 9, 8, 1); break;
    case 'kspade': case 'kspadew': f('#6a4a30', 3, 12, 8, 2); f('#8a96aa', 10, 9, 5, 7); f(K, 2, 15, 14, 2); break;
    case 'kpinch': case 'kpinchx': f(Sk, 3, 6, 5, 2); f(Sk, 3, 10, 5, 2); f(Au, 8, 9, 8, 1); f(R, 12, 8, 1, 3); break;
    case 'kbelow': case 'kbelow2': for (let i = 0; i < 4; i++) f(K, 3 + i * 3, 4 + (i % 2) * 2, 2, 11); f(V, 3, 14, 12, 2); break;
    case 'kspit': case 'kspitw': for (let i = 0; i < 4; i++) f('#140a0c', 3 + i * 4, 7 + (i % 2) * 2, 1, 8); f('#8e2630', 7, 4, 3, 3); break;
    case 'kwalk': case 'kwalkw': f(K, 6, 3, 6, 10); f(V, 3, 15, 12, 1); f(V2, 6, 13, 6, 1); break;
    case 'kmirror': case 'kmirror2': f(K, 3, 3, 12, 12); f(V2, 4, 4, 1, 10); f(V, 9, 5, 4, 8); break;
    case 'knothing': case 'knoth2': ctx.strokeStyle = '#c8c4d6'; ctx.setLineDash([2, 2]); ctx.beginPath(); ctx.arc(x + 9, y + 9, 6, 0, 6.28); ctx.stroke(); ctx.setLineDash([]); break;
    case 'kbar': case 'kbarthorn': f(St, 2, 3, 4, 13); f(St, 12, 3, 4, 13); f(Sk, 7, 5, 4, 11); f(St2, 2, 3, 4, 1); break;
    case 'kgrip': case 'kgrip2': f(St, 4, 5, 10, 10); f(St2, 5, 6, 3, 3); f('#bfeaff', 10, 8, 1, 4); f(K, 7, 11, 5, 1); break;
    case 'kfinger': case 'kfinger2': f(Sk, 4, 9, 6, 5); f(Sk, 9, 4, 2, 7); f('#ffffff', 10, 3, 6, 1); break;
    case 'kobsid': case 'kobsid2': f('#15111f', 4, 3, 10, 13); f('#8a84a8', 5, 4, 2, 3); f('#2c2640', 10, 8, 3, 6); break;
    case 'kmount': case 'kmount2': f(Sk, 6, 2, 6, 6); f(St, 2, 13, 14, 3); for (let i = 0; i < 4; i++) f(St2, 2 + i * 4, 11 + (i % 2), 2, 2); break;
    case 'kstep': case 'kstep2': for (let i = 0; i < 4; i++) { f(St, 2 + i * 4, 14 - i * 3, 3, 3 + i * 3); f(St2, 3 + i * 4, 14 - i * 3, 1, 2); } break;
    case 'kpagoda': case 'kpagoda2': for (let i = 0; i < 3; i++) { f(St2, 3 + i * 2, 12 - i * 4, 12 - i * 4, 1); f(St, 4 + i * 2, 13 - i * 4, 10 - i * 4, 3); } break;
    case 'kweep': case 'kweep2': case 'kweep3': f(St, 5, 5, 8, 11); f(St2, 7, 2, 4, 4); f('#bfeaff', 8, 5, 1, 3); f(St, 2, 6, 3, 1); f(St, 13, 6, 3, 1); f(St, 1, 3, 2, 3); f(St, 15, 3, 2, 3); break;
    case 'kthousand': case 'kthous2': for (let i = 0; i < 9; i++) { const a = -3.14 + i * 0.39; f(i % 2 ? Au : St2, 8 + Math.round(Math.cos(a) * 7), 10 + Math.round(Math.sin(a) * 7), 2, 2); } f(Au2, 8, 9, 2, 6); break;
    default: return false;
  }
  return true;
}
{
  const _i14 = icon14;
  icon14 = function (id, x, y) { if (SK[id] && SK[id].cls === 'monk' || VIRT[id] && SK[VIRT[id].s] && SK[VIRT[id].s].cls === 'monk') return monkIcon(id, x, y); return _i14(id, x, y); };
  // item icons: fist wraps, the spade, the ringed staff
  const _ic = icon;
  icon = function (id, w, h) {
    if (!['wraps', 'iwraps', 'spade', 'shakujo'].includes(id)) return _ic(id, w, h);
    const c = mkCanvas(w * CELL, h * CELL), x = c.getContext('2d'), R = (col, a, b, cw, ch) => { x.fillStyle = col; x.fillRect(a, b, cw, ch); }, cx = w * CELL / 2 | 0;
    if (id === 'wraps' || id === 'iwraps') { for (let i = 0; i < 6; i++) R(i % 2 ? '#cac2a8' : '#eee8d4', cx - 4, 3 + i * 3, 8, 2); R('#5a5446', cx - 5, 3, 1, 18); if (id === 'iwraps') { R('#d8a83a', cx - 3, 6, 6, 1); R('#b02818', cx, 12, 1, 3); R('#d8a83a', cx - 3, 18, 6, 1); } }
    else if (id === 'spade') { R('#4a3020', cx - 1, 2, 3, 22); R('#6a4a30', cx, 2, 1, 22); R('#3a3a40', cx - 5, 1, 11, 2); R('#7a808e', cx - 4, 24, 9, 9); R('#c4c8d2', cx - 3, 25, 2, 6); R('#464a56', cx - 4, 32, 9, 2); }
    else { R('#1a1012', cx - 1, 9, 3, 26); R('#d8a83a', cx - 4, 2, 9, 8); R('#2a1a06', cx - 2, 4, 5, 4); R('#fff0a0', cx - 5, 5, 1, 2); R('#fff0a0', cx + 5, 5, 1, 2); R('#fff0a0', cx, 1, 1, 1); }
    return c;
  };
}
