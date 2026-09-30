// =================================================================== v0.23: the environment in 32-bit (zt_env32.js)
// The ground is painted in world space, pixel by pixel, into cached chunks (8 x 8 cells): every pixel knows which
// cell it lies in, so chunks meet with no seam and no gap, and the texture never repeats. Terrain edges are warped
// by noise so grass frays into road and mud, water gets a lit lip and a dark wet bank, and walls cast a dithered
// shadow on the floor. Values go through hand-picked 8-tone ramps with a 4x4 ordered dither, like the title.
// Walls, trees, props and objects are painted with the native pixel painter (zo_pix.js) and cached as canvases.
const ZT_HW = TW / 2, ZT_HH = TH / 2, ZT_TREE_S = 1.9, ZT_PROP_S = 1.7;   // trees and props are painted this much larger than the 32-bit originals   // v0.36: half a cell across and down, in art pixels
const ZT_B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16 - 0.47);
const ZT_hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ZT_R = (...a) => a.map(ZT_hex);
// =================================================================== v0.37: hue-shifted ramps and the sculpt painter
// Every ramp runs from a cool, more saturated violet shadow to a warm ochre light. ztHue() derives such a ramp from
// any 5-tone painter material; the hand-picked ones below are the ones the world is mostly made of.
function ztRGB2HSL(c) {
  const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255, mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function ztHSL2RGB(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (!s) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q, f = t => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
}
const ztHueMix = (a, b, t) => { let d = ((b - a + 540) % 360) - 180; return a + d * t; };
// n tones from a 5-tone ramp: lightness spread a little wider, shadows pulled to violet, lights to ochre
function ztHue(tones, n = 8, o = {}) {
  const H = tones.map(c => ztRGB2HSL(Array.isArray(c) ? c : ZT_hex(c)));
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), f = t * (H.length - 1), k = Math.min(H.length - 2, Math.floor(f)), u = f - k, a = H[k], b = H[k + 1];
    let h = ztHueMix(a[0], b[0], u), s = a[1] + (b[1] - a[1]) * u, l = a[2] + (b[2] - a[2]) * u;
    const sh = (o.cool == null ? 0.42 : o.cool) * (1 - t) ** 1.5, wa = (o.warm == null ? 0.3 : o.warm) * t ** 1.5;
    if (s < 0.06 && o.neutral) { out.push(ztHSL2RGB(h, s, l)); continue; }
    h = ztHueMix(ztHueMix(h, 262, sh), 38, wa);
    s = Math.min(1, s * (1 + 0.5 * (1 - t)) + 0.06 * (1 - t) + 0.02);
    l = l * (0.78 + 0.26 * t) + (t > 0.8 ? 0.03 : 0);
    out.push(ztHSL2RGB(h, s, Math.min(0.97, l)));
  }
  return out;
}
// ------------------------------------------------------------------- the sculpt painter
// Forms are laid down as 3D primitives (tubes, ellipsoids, bevelled slabs, iso boxes, upright cylinders), each
// pixel keeps its surface normal and texture coordinates, and the whole is lit per pixel: a warm key from the
// upper left, a cool fill from the right, sky light from above, tight specular hits on metal and wax, a rim on the
// shadow side, and forms in front cast short shadows down-right onto the forms behind them. The light is then
// quantised into the material's hand-picked hue-shifted ramp, stray single pixels are cleaned up, and the
// silhouette gets a coloured outline that breaks where the light hits.
const ZS_L = [-0.52, 0.6, 0.61], ZS_F = [0.72, 0.05, 0.69], ZS_HV = (() => { const v = [ZS_L[0], ZS_L[1], ZS_L[2] + 1], n = Math.hypot(...v); return v.map(a => a / n); })();
const ZS_NUP = [0, 0.87, 0.5], ZS_NL = [-0.71, -0.35, 0.61], ZS_NR = [0.71, -0.35, 0.61], ZS_NF = [-0.28, 0.05, 0.96];
const ZSMAT = {};
// name, ramp (hex list dark -> light), and options: spec (0..1), sh (shininess), tex (bark|stone|metal|wood|cloth|bone|wax|earth|moss|none), tk (texture strength), rim
function zsMat(name, hexes, o) { ZSMAT[name] = Object.assign({ r: hexes.map(h => Array.isArray(h) ? h : ZT_hex(h)), spec: 0, sh: 20, tex: 'none', tk: 1, rim: 1 }, o || {}); return name; }
const ZS_ALIAS = { ztSt: 'zStone', ztStW: 'zStoneW', ztStO: 'zStone', ztIron: 'zIron', ztBone: 'zBone', ztSkull: 'zBone', ztWax: 'zWax', ztCoffin: 'zWood', ztWoodC: 'zWood', ztWood: 'zWood', ztWoodD: 'zWoodD', ztBark: 'zBark', ztBarkB: 'zBarkB', ztBarkC: 'zBarkC', ztBarkF: 'zBarkF', ztEarth: 'zEarth', ztMoss: 'zMoss', ztCloth: 'zCloth', ztRobe: 'zLinen', ztGold: 'zGold', ztBronze: 'zBronzeV', ztRopeT: 'zRope', ztRope: 'zRope', ztBell: 'zBrass', ztStone: 'zStone', ztStoneD: 'zStoneV' };
function zsGet(m) {
  if (ZSMAT[m]) return ZSMAT[m];
  if (ZS_ALIAS[m] && ZSMAT[ZS_ALIAS[m]]) return (ZSMAT[m] = ZSMAT[ZS_ALIAS[m]]);
  if (typeof m === 'string' && m[0] !== '#' && PMAT[m]) {   // any 5-tone painter material becomes a hue-shifted sculpt ramp
    const low = m.toLowerCase(), metal = /iron|gold|bronze|bell/.test(low);
    return (ZSMAT[m] = { r: ztHue(PMAT[m], 8), spec: metal ? 0.9 : /wax|fung|skin/.test(low) ? 0.35 : 0.1, sh: metal ? 26 : 14, tex: /bark/.test(low) ? 'bark' : /st|stone/.test(low) ? 'stone' : /wood|coffin/.test(low) ? 'wood' : /bone|skull/.test(low) ? 'bone' : /cloth|robe|rag/.test(low) ? 'cloth' : /earth/.test(low) ? 'earth' : /moss|reed|lily/.test(low) ? 'moss' : metal ? 'metal' : 'none', tk: 1, rim: 1 });
  }
  return null;
}
zsMat('zBark', ['#060509', '#0d0a10', '#151116', '#1e1819', '#29201e', '#352a24', '#43342a', '#534031', '#664e3a', '#7d6048'], { tex: 'bark', tk: 1.2 });
zsMat('zBarkB', ['#0a0910', '#16141a', '#232023', '#322c2b', '#433b35', '#554a40', '#6a5d4f', '#7f705e', '#94846e', '#a8977d'], { tex: 'bark', tk: 1.1 });
zsMat('zBarkC', ['#040306', '#0a080c', '#120e11', '#1b1516', '#261e1c', '#332822', '#43342a', '#564232'], { tex: 'bark', tk: 1.2 });
zsMat('zBarkF', ['#040509', '#090c0f', '#0f1414', '#151b18', '#1c231d', '#242b22', '#2e3428', '#393e2f', '#464837'], { tex: 'bark', tk: 1.1 });
zsMat('zStone', ['#08070d', '#12111a', '#1e1c26', '#2b2832', '#3a363e', '#4b4549', '#5e5654', '#746960', '#8e806f', '#aa9a82'], { tex: 'stone', tk: 1 });
zsMat('zStoneW', ['#0a080b', '#161217', '#231d20', '#322a29', '#433831', '#56473b', '#6b5946', '#836d53', '#9e8563', '#b99f79'], { tex: 'stone', tk: 1 });
zsMat('zStoneV', ['#07060c', '#100e18', '#1b1824', '#272232', '#342d3f', '#433a4a', '#544852', '#68595c', '#7f6d68', '#9a8577'], { tex: 'stone', tk: 1 });
zsMat('zMarbleD', ['#08080d', '#111118', '#1b1a21', '#26242b', '#333036', '#423d42', '#524b4e', '#645b5c', '#79706b', '#908579'], { tex: 'stone', tk: 1.3, spec: 0.1, sh: 14 });
zsMat('zMarble', ['#0c0b12', '#18161f', '#25222b', '#343038', '#454045', '#585252', '#6d6560', '#857b71', '#9f9383', '#b8ac98'], { tex: 'stone', tk: 0.7, spec: 0.2, sh: 18 });
zsMat('zIron', ['#050508', '#0c0c12', '#15161e', '#20212b', '#2d2e39', '#3d3d48', '#524f58', '#6d6770', '#958a8a', '#c9bba8'], { tex: 'metal', spec: 1, sh: 30 });
zsMat('zRust', ['#080506', '#140b0b', '#22120f', '#331a12', '#462415', '#5b3019', '#733f20', '#8d5129'], { tex: 'metal', spec: 0.3, sh: 12 });
zsMat('zGold', ['#0e0707', '#1f0f0a', '#35190c', '#4f2a10', '#6c4015', '#8c591b', '#ac7424', '#c99232', '#e2b24c', '#f6d680', '#fff2c4'], { tex: 'metal', spec: 1.2, sh: 34 });
zsMat('zBrass', ['#0b0708', '#1a110c', '#2c1d10', '#422c15', '#5a3e1b', '#735222', '#8e672c', '#a97e38', '#c69a4c', '#e2c078'], { tex: 'metal', spec: 1.1, sh: 30 });
zsMat('zBronzeV', ['#07070b', '#0f0f12', '#181a18', '#22251f', '#2d3226', '#3a3f2d', '#4a4c34', '#5d5a3c', '#756d47', '#958655'], { tex: 'metal', spec: 0.5, sh: 18 });
zsMat('zWax', ['#1e1414', '#3a2a24', '#5a4536', '#7a6249', '#9a805e', '#b89e78', '#d2bb94', '#e6d4b0', '#f5e9cc', '#fff9e8'], { tex: 'wax', spec: 0.45, sh: 16 });
zsMat('zBone', ['#141013', '#28201f', '#40352e', '#5b4d3f', '#766752', '#918166', '#aa9b7c', '#c2b493', '#d8cbab', '#ebe1c6'], { tex: 'bone', tk: 0.8, spec: 0.12 });
zsMat('zWood', ['#070507', '#110b0c', '#1c1310', '#291b14', '#372418', '#472f1d', '#5a3c24', '#6f4b2c', '#865d37'], { tex: 'wood', tk: 1 });
zsMat('zWoodD', ['#050406', '#0c0809', '#150e0d', '#1f1511', '#2a1c15', '#372419', '#462e1f', '#573a26'], { tex: 'wood', tk: 1 });
zsMat('zEarth', ['#07060a', '#100c10', '#1a1414', '#251c18', '#31251d', '#3f3023', '#4f3c2a', '#614a33'], { tex: 'earth', tk: 1 });
zsMat('zMoss', ['#06090a', '#0c130f', '#131d13', '#1b2917', '#25351b', '#31421f', '#3f5024', '#50602b', '#657233'], { tex: 'moss', tk: 1.2 });
zsMat('zCloth', ['#0b0409', '#18070d', '#270b12', '#380f16', '#4b151a', '#5f1d1e', '#742822', '#8b3628'], { tex: 'cloth', tk: 1 });
zsMat('zLinen', ['#131015', '#262022', '#3b3330', '#524840', '#6b5e51', '#857664', '#9e8e79', '#b7a78f', '#cdbfa6'], { tex: 'cloth', tk: 1 });
zsMat('zRope', ['#0e0a0b', '#1c1512', '#2d2219', '#403121', '#55422b', '#6b5536', '#826943', '#9a7f53'], { tex: 'wood', tk: 0.8 });
zsMat('zBlood', ['#0a0206', '#18040a', '#28060e', '#3a0a12', '#4e0e16', '#64141a', '#7c1c1e'], { spec: 0.9, sh: 24 });
zsMat('zLeaf', ['#0a0708', '#170f0c', '#25170f', '#342012', '#452a15', '#573518', '#6b421c'], { tex: 'cloth', tk: 0.6 });
// texture: a small bump added to the light of a pixel, as clusters (never per-pixel noise)
function zsTex(tex, x, y, tu, tv, seed) {
  switch (tex) {
    case 'bark': { const r = ztVN(tu / 7.5 + seed, tv * 3.6 + seed * 3, 601), f = ztVN(tu / 14 + seed * 2, tv * 2.2 + 9, 602), c = ztVN(tu / 2.4 + seed, tv * 1.6, 603); return (r - 0.5) * 0.42 + (r < 0.3 ? -0.22 : 0) + (f < 0.28 ? -0.18 : f > 0.8 ? 0.1 : 0) + (c > 0.86 ? -0.16 : 0); }
    case 'wood': { const g = ztVN(tu / 11 + seed, tv * 3.4, 611); return (g - 0.5) * 0.24 + (g < 0.22 ? -0.14 : 0); }
    case 'stone': { const n = ztVN(x / 2.2 + seed, y / 2.2, 621), p = ztVN(x / 1.3 + seed * 3, y / 1.3, 622); return (n - 0.5) * 0.1 + (p > 0.86 ? -0.14 : 0); }
    case 'metal': { const n = ztVN(x / 2.6 + seed, y / 2.6, 631); return (n - 0.5) * 0.1 + (n < 0.18 ? -0.12 : 0); }
    case 'bone': { const n = ztVN(x / 3 + seed, y / 3, 641); return (n - 0.5) * 0.14 + (ztVN(x / 1.5, y / 1.5, 642) > 0.86 ? -0.14 : 0); }
    case 'cloth': { const n = ztVN(tu / 6 + seed, x / 4, 651); return (n - 0.5) * 0.18; }
    case 'earth': { const n = ztVN(x / 3 + seed, y / 2, 661); return (n - 0.5) * 0.24; }
    case 'moss': { const n = ztVN(x / 2 + seed, y / 2, 671); return (n - 0.5) * 0.3; }
    case 'wax': return (ztVN(x / 4, y / 5, 681) - 0.5) * 0.06;
  }
  return 0;
}
function ZSc(Wd, Ht, S = 1, outline) {
  const W2 = Math.ceil(Wd * S), H2 = Math.ceil(Ht * S), N = W2 * H2;
  const part = new Int16Array(N).fill(-1), NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N), TU = new Float32Array(N), TV = new Float32Array(N);
  const parts = [], over = new Map(), OLN = outline === null ? null : 1;
  const add = (mat, o) => { o = o || {}; const m = zsGet(mat); parts.push({ m, flat: !m ? ZT_hex(mat) : null, o, seed: parts.length * 3.7 }); return parts.length - 1; };
  const box4 = (x0, y0, x1, y1) => [Math.max(0, Math.floor(x0)), Math.max(0, Math.floor(y0)), Math.min(W2 - 1, Math.ceil(x1)), Math.min(H2 - 1, Math.ceil(y1))];
  const put = (k, id, nx, ny, nz, tu, tv) => { part[k] = id; NX[k] = nx; NY[k] = ny; NZ[k] = nz; TU[k] = tu; TV[k] = tv; };
  const norm = (a, b, c) => { const l = Math.hypot(a, b, c) || 1; return [a / l, b / l, c / l]; };
  const inPoly = (pts, px, py) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c; } return c; };
  // all shapes are given in input units (scaled by S)
  const F = {
    poly(pts, mat, o) {
      o = o || {}; const id = add(mat, o), P2 = pts.map(p => [p[0] * S, p[1] * S]);
      const n0 = o.n || (o.tone >= 1 ? ZS_NUP : o.tone <= -1 ? ZS_NR : ZS_NF), bev = (o.bevel == null ? 1.6 : o.bevel) * (S > 1 ? 1 : 1);
      // outward edge normals
      let area = 0; for (let i = 0, j = P2.length - 1; i < P2.length; j = i++) area += (P2[j][0] - P2[i][0]) * (P2[j][1] + P2[i][1]);
      const sg = area > 0 ? 1 : -1, E = P2.map((a, i) => { const b = P2[(i + 1) % P2.length], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [a[0], a[1], dx, dy, l, sg * dy / l, -sg * dx / l]; });
      const xs = P2.map(p => p[0]), ys = P2.map(p => p[1]), [x0, y0, x1, y1] = box4(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5; if (!inPoly(P2, px, py)) continue;
        let nx = n0[0], ny = n0[1], nz = n0[2];
        if (bev > 0) {
          let bd = 1e9, be = null; for (const e of E) { const t = Math.max(0, Math.min(1, ((px - e[0]) * e[2] + (py - e[1]) * e[3]) / (e[4] * e[4]))), d = Math.hypot(px - e[0] - t * e[2], py - e[1] - t * e[3]); if (d < bd) { bd = d; be = e; } }
          if (bd < bev) { const k = (1 - bd / bev) * 0.9; [nx, ny, nz] = norm(nx + be[5] * k, ny - be[6] * k, nz); }
        }
        put(y * W2 + x, id, nx, ny, nz, px, py);
      }
      return id;
    },
    ell(cx, cy, rx, ry, mat, o) {
      o = o || {}; const id = add(mat, o); cx *= S; cy *= S; rx *= S; ry *= S; const [x0, y0, x1, y1] = box4(cx - rx, cy - ry, cx + rx, cy + ry), fl = o.dome == null ? 1 : o.dome;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy; if (d > 1) continue;
        const [nx, ny, nz] = o.n ? o.n : norm(dx * fl, -dy * fl, Math.sqrt(1 - d) + (1 - fl) * 0.8);
        put(y * W2 + x, id, nx, ny, nz, x, y);
      }
      return id;
    },
    limb(pts, r0, r1, mat, o) {
      o = o || {}; const id = add(mat, o), P2 = pts.map(p => [p[0] * S, p[1] * S]); r0 = Math.max(0.5, r0 * S); r1 = Math.max(0.5, r1 * S);
      const n = P2.length, R = Math.max(r0, r1), cum = [0]; for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(P2[i][0] - P2[i - 1][0], P2[i][1] - P2[i - 1][1]));
      const xs = P2.map(p => p[0]), ys = P2.map(p => p[1]), [x0, y0, x1, y1] = box4(Math.min(...xs) - R, Math.min(...ys) - R, Math.max(...xs) + R, Math.max(...ys) + R);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5; let best = 1e9, bu = 0, bv = 0, br = 1, bt = 0, bi = 0;
        for (let i = 0; i < n - 1; i++) {
          const [ax, ay] = P2[i], [bx, by] = P2[i + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
          const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L2)), r = r0 + (r1 - r0) * (i + t) / Math.max(1, n - 1), ex = px - ax - t * dx, ey = py - ay - t * dy, d = Math.hypot(ex, ey);
          if (d <= r && d / r < best) { best = d / r; bu = ex / r; bv = ey / r; br = r; bt = t; bi = i; }
        }
        if (best > 1) continue;
        const [ax, ay] = P2[bi], [bx, by] = P2[bi + 1], L = Math.hypot(bx - ax, by - ay) || 1, tv = (bu * (by - ay) - bv * (bx - ax)) / L;
        const [nx, ny, nz] = norm(bu, -bv, Math.sqrt(Math.max(0, 1 - bu * bu - bv * bv)) + 0.08);
        put(y * W2 + x, id, nx, ny, nz, (cum[bi] + bt * L) / S, tv * br / Math.max(1, br) * 1.0);
      }
      return id;
    },
    // an upright cylinder from yb (foot) up to yt, radius rx; the top cap is an ellipse facing up
    cyl(cx, yb, yt, rx, mat, o) {
      o = o || {}; const id = add(mat, o); cx *= S; yb *= S; yt *= S; rx *= S; const ry = rx * 0.5, [x0, y0, x1, y1] = box4(cx - rx, yt - ry, cx + rx, yb + ry);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const u = (x + 0.5 - cx) / rx; if (Math.abs(u) > 1) continue; const c = Math.sqrt(1 - u * u), py = y + 0.5;
        const topCap = o.cap !== false && ((py - yt) / ry) ** 2 + u * u <= 1, body = py >= yt && py <= yb + c * ry;
        if (!topCap && !body) continue;
        if (topCap && (o.cap !== false) && py < yt + c * ry) put(y * W2 + x, id, ZS_NUP[0] + u * 0.15, ZS_NUP[1], ZS_NUP[2], x, 0);
        else { const [nx, ny, nz] = norm(u, -0.35 * c, 0.87 * c + 0.1); put(y * W2 + x, id, nx, ny, nz, (py - yt) / S, u); }
      }
      return id;
    },
    // an iso box standing on (cx, cy): a = half-length along +x (down-right), b = half-length along +y (down-left), h tall
    box(cx, cy, a, b, h, mat, o) {
      o = o || {}; const p = (u, v, z) => [cx + (u - v) * 2, cy + (u + v) - z];
      const L = [p(-a, b, 0), p(a, b, 0), p(a, b, h), p(-a, b, h)], R = [p(a, b, 0), p(a, -b, 0), p(a, -b, h), p(a, b, h)], T = [p(-a, -b, h), p(a, -b, h), p(a, b, h), p(-a, b, h)];
      const bev = o.bevel == null ? 1.2 : o.bevel, t = o.tone || 0;
      const ids = [F.poly(L, mat, Object.assign({}, o, { n: ZS_NL, bevel: bev, tone: t })), F.poly(R, mat, Object.assign({}, o, { n: ZS_NR, bevel: bev, tone: t })), o.top === false ? -1 : F.poly(T, o.topMat || mat, Object.assign({}, o, { n: ZS_NUP, bevel: bev, tone: t }))];
      return ids;
    },
    px(x, y, c) { const X = Math.round(x), Y = Math.round(y), xa = Math.floor(X * S), xb = Math.floor((X + 1) * S), ya = Math.floor(Y * S), yb = Math.floor((Y + 1) * S); for (let j = ya; j < Math.max(yb, ya + 1); j++) for (let i = xa; i < Math.max(xb, xa + 1); i++) if (i >= 0 && j >= 0 && i < W2 && j < H2) over.set(j * W2 + i, c); },
    fpx(x, y, c) { const i = Math.floor(x * S), j = Math.floor(y * S); if (i >= 0 && j >= 0 && i < W2 && j < H2) over.set(j * W2 + i, c); },
    line(x0, y0, x1, y1, c) { x0 *= S; y0 *= S; x1 *= S; y1 *= S; const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) { const t = i / Math.max(1, n), X = Math.round(x0 + (x1 - x0) * t), Y = Math.round(y0 + (y1 - y0) * t); if (X >= 0 && Y >= 0 && X < W2 && Y < H2) over.set(Y * W2 + X, c); } },
    fline(x0, y0, x1, y1, c) { F.line(x0, y0, x1, y1, c); },
    tone(mat, i) { const m = zsGet(mat); if (!m) return mat; const c = m.r[Math.max(0, Math.min(m.r.length - 1, Math.round(i / 4 * (m.r.length - 1))))]; return `rgb(${c[0]},${c[1]},${c[2]})`; },
    // a pixel of a material at a light level 0..1 (for hand-placed detail in the object's own ramp)
    mt(mat, k) { const m = zsGet(mat); const c = m.r[Math.max(0, Math.min(m.r.length - 1, Math.round(k * (m.r.length - 1))))]; return [c[0], c[1], c[2]]; },
    // erase: clear pixels inside a polygon (broken edges, holes)
    cut(pts) { const P2 = pts.map(p => [p[0] * S, p[1] * S]), xs = P2.map(p => p[0]), ys = P2.map(p => p[1]), [x0, y0, x1, y1] = box4(Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inPoly(P2, x + 0.5, y + 0.5)) { part[y * W2 + x] = -1; over.delete(y * W2 + x); } },
    W: Wd, H: Ht, S, W2, H2,
    render() {
      const c = mkCanvas(W2, H2), g = c.getContext('2d'), img = g.createImageData(W2, H2), D = img.data, LV = new Int8Array(N).fill(-1);
      for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
        const k = y * W2 + x, id = part[k]; if (id < 0) continue;
        const P = parts[id], o = P.o;
        if (P.flat) { const q = k * 4; D[q] = P.flat[0]; D[q + 1] = P.flat[1]; D[q + 2] = P.flat[2]; D[q + 3] = 255; continue; }
        const m = P.m, n = m.r.length, nx = NX[k], ny = NY[k], nz = NZ[k];
        if (o.flat || o.emit) { const lv = Math.max(0, Math.min(n - 1, Math.round((0.55 + (o.tone || 0) * 0.14) * (n - 1)))); const col = m.r[lv], q = k * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255; LV[k] = lv; continue; }
        const dif = Math.max(0, nx * ZS_L[0] + ny * ZS_L[1] + nz * ZS_L[2]), fil = Math.max(0, nx * ZS_F[0] + ny * ZS_F[1] + nz * ZS_F[2]);
        let I = 0.13 + 0.1 * ny + dif * 0.78 + fil * 0.2 + (o.tone || 0) * 0.13 + (o.lift || 0);
        if (m.tex !== 'none') I += zsTex(m.tex, x / S, y / S, TU[k], TV[k], P.seed) * m.tk * (o.tk == null ? 1 : o.tk);
        // a front form casts a short shadow down-right onto what lies behind it
        for (let d = 1; d <= 3; d++) { const xx = x - d, yy = y - d; if (xx < 0 || yy < 0) break; const q = part[yy * W2 + xx]; if (q > id && !parts[q].flat && parts[q].o.cast !== false) { I -= 0.26 * (1 - (d - 1) / 3.5); break; } }
        // ambient occlusion where this form tucks under or beside another
        const up = y > 0 ? part[k - W2] : -1; if (up > id && parts[up].o.cast !== false) I -= 0.08;
        let lv = Math.round(Math.max(0, I) * (n - 1) * 0.92);
        if (m.spec) { const s = Math.pow(Math.max(0, nx * ZS_HV[0] + ny * ZS_HV[1] + nz * ZS_HV[2]), m.sh) * m.spec; if (s > 0.55) lv = n - 1; else if (s > 0.28) lv = Math.max(lv, n - 2); }
        // a cool rim along the shadow side of the silhouette
        if (m.rim && nx > 0.3 && (x + 1 >= W2 || part[k + 1] < 0 || (y + 1 < H2 && part[k + W2] < 0 && nx > 0.5))) lv += 1;
        lv = Math.max(0, Math.min(n - 1, lv)); LV[k] = lv;
        const col = m.r[lv], q = k * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255;
      }
      // stray single pixels: a pixel unlike all four neighbours, which agree, takes their colour
      for (let y = 1; y < H2 - 1; y++) for (let x = 1; x < W2 - 1; x++) {
        const k = y * W2 + x; if (LV[k] < 0 || part[k] < 0 || parts[part[k]].flat) continue; const id = part[k], m = parts[id].m; if (LV[k] >= m.r.length - 1) continue;
        const a = k - 1, b = k + 1, cc = k - W2, d = k + W2;
        if (part[a] === id && part[b] === id && part[cc] === id && part[d] === id) {
          const l = LV[a]; if (l !== LV[k] && LV[b] === l && (LV[cc] === l || LV[d] === l)) { LV[k] = l; const col = m.r[l], q = k * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; }
        }
      }
      // the coloured outline, broken where the light hits
      if (OLN) {
        const S0 = new Uint8ClampedArray(D);
        for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) {
          const k = y * W2 + x; if (part[k] >= 0 || over.has(k)) continue; let nb = -1, lit = false;
          for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const i = x + dx, j = y + dy; if (i < 0 || j < 0 || i >= W2 || j >= H2) continue; const q = j * W2 + i; if (part[q] >= 0 && parts[part[q]].o.ol !== false) { nb = q; if ((dx > 0 || dy > 0) && parts[part[q]].m && LV[q] >= parts[part[q]].m.r.length - 3) lit = true; } }
          if (nb < 0 || lit) continue;
          const P = parts[part[nb]], base = P.m ? P.m.r[0] : [S0[nb * 4] * 0.3, S0[nb * 4 + 1] * 0.3, S0[nb * 4 + 2] * 0.3], q = k * 4;
          D[q] = base[0] * 0.8 + 2; D[q + 1] = base[1] * 0.75 + 1; D[q + 2] = base[2] * 0.9 + 4; D[q + 3] = 255;
        }
      }
      for (const [k, cv] of over) { const q = k * 4; if (cv == null) { D[q + 3] = 0; continue; } const col = Array.isArray(cv) ? cv : cv[0] === '#' ? ZT_hex(cv) : cv.match(/\d+/g).map(Number); D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255; }
      g.putImageData(img, 0, 0); return c;
    }
  };
  return F;
}
// ------------------------------------------------------------------- ramps (dark to light, shadows cool, lights warm)
const ZTR = {
  moor: ZT_R('#0c0b0d', '#17151a', '#23201f', '#302b26', '#3f382e', '#514736', '#665940', '#80704f'),
  ash: ZT_R('#141316', '#201f22', '#2e2c2e', '#3d3a3a', '#4e4a47', '#625d58', '#79736b', '#948c80'),
  fen: ZT_R('#0a0d0c', '#111613', '#181f19', '#1f281f', '#283226', '#323d2c', '#3f4a33', '#50593c'),
  dirt: ZT_R('#0d0b0b', '#171311', '#221c18', '#2e261f', '#3b3127', '#4a3e31', '#5c4d3c', '#716049'),
  mud: ZT_R('#080606', '#110c0a', '#1a130f', '#251a14', '#31231a', '#402e21', '#58442f', '#7a6852'),
  road: ZT_R('#0e0d10', '#1a181b', '#272426', '#353130', '#443f3b', '#554e47', '#6a6157', '#83796b'),
  flags: ZT_R('#111014', '#1d1b1f', '#2a272a', '#383435', '#484341', '#5a544e', '#6f685e', '#898074'),
  water: ZT_R('#030406', '#06090e', '#0a0f17', '#0f1622', '#151f2e', '#1c293c', '#29394f', '#3e536a'),
  bog: ZT_R('#030504', '#060a08', '#0a100c', '#0e1611', '#131e16', '#1a281d', '#243526', '#324632'),
  scum: ZT_R('#0c100a', '#141a10', '#1c2414', '#262f19', '#313c1f', '#3e4a26', '#4e5a2e', '#626c38'),
  shallow: ZT_R('#070a0d', '#0c1218', '#121c25', '#192732', '#21333e', '#2b4049', '#3a5256', '#516a66'),
  shallowFen: ZT_R('#060907', '#0b110c', '#121a13', '#19241a', '#212f21', '#2b3c29', '#394c33', '#4e6040'),
  crypt: ZT_R('#0a090d', '#15121b', '#1f1b27', '#2a2533', '#373041', '#453d51', '#554b63', '#6a5f79'),
  barrow: ZT_R('#0a0807', '#140f0c', '#1f1812', '#2b2119', '#382b20', '#473728', '#584532', '#6e573f'),
  bone: ZT_R('#0e0c0b', '#1a1714', '#27231e', '#35302a', '#454036', '#575044', '#6d6454', '#877c68'),
  arena: ZT_R('#0a0607', '#140b0d', '#1f1214', '#2b1a1c', '#382224', '#472c2d', '#583837', '#6c4744'),
  ivory: ZT_R('#1a1712', '#3a342a', '#5e5646', '#857a64', '#aa9e84', '#cabea2', '#e2d8c0', '#f4ecd8'),
};
// ground classes
const ZT_G = { VOID: 0, MOOR: 1, FEN: 2, DIRT: 3, MUD: 4, ROAD: 5, FLAGS: 6, WATER: 7, BOG: 8, SHALLOW: 9, SHALLOWFEN: 10, CRYPT: 11, BARROW: 12, BONE: 13, ARENA: 14 };
const ZT_GSOFT = [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0];     // outdoor classes fray into each other
const ZT_GWET = [0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0];
function ztClassOf(z, x, y) {
  if (x < 0 || y < 0 || x >= z.w || y >= z.h) return ZT_G.VOID;
  const t = z.t[y * z.w + x], fen = z.theme === 'fen', out = z.theme === 'moor' || z.theme === 'fen' || z.theme === 'wild';
  switch (t) {
    case 0: case 2: return fen ? ZT_G.FEN : ZT_G.MOOR;                 // grass, tree
    case 3: return out ? (fen ? ZT_G.FEN : ZT_G.MOOR) : ztDeep(z, x, y);   // rock
    case 1: return ZT_G.ROAD;
    case 11: case 10: return ZT_G.DIRT;                                 // dirt, palisade
    case 4: return fen ? ZT_G.BOG : ZT_G.WATER;
    case 12: return fen ? ZT_G.SHALLOWFEN : ZT_G.SHALLOW;
    case 13: return ZT_G.MUD;
    case 14: case 15: return ZT_G.FLAGS;                                // flags, ruin
    case 6: case 8: case 9: return ztDeep(z, x, y);                   // floor, fog, pillar
    default: return ZT_G.VOID;                                          // wall, cliff
  }
}
function ztDeep(z, x, y) { if (z.inBoss && z.inBoss(x, y)) return ZT_G.ARENA; return z.theme === 'bone' ? ZT_G.BONE : z.theme === 'barrow' ? ZT_G.BARROW : z.theme === 'moor' || z.theme === 'fen' ? ZT_G.FLAGS : ZT_G.CRYPT; }
// ------------------------------------------------------------------- noise
function ztVN(x, y, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash(ix + s * 1013, iy - s * 571), b = hash(ix + 1 + s * 1013, iy - s * 571), c = hash(ix + s * 1013, iy + 1 - s * 571), d = hash(ix + 1 + s * 1013, iy + 1 - s * 571);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}
function ztFBM(x, y, s) { return ztVN(x, y, s) * 0.55 + ztVN(x * 2.1, y * 2.1, s + 7) * 0.3 + ztVN(x * 4.3, y * 4.3, s + 13) * 0.15; }
// the class under a world pixel, with the soft edges warped
function ztTypeAt(cls, X, Y) {
  const u = ((X + 0.5) / ZT_HW + (Y + 0.5) / ZT_HH) / 2, v = ((Y + 0.5) / ZT_HH - (X + 0.5) / ZT_HW) / 2;
  const c0 = cls(Math.floor(u), Math.floor(v));
  if (!ZT_GSOFT[c0]) return c0;
  const wu = u + (ztVN(X * 0.07, Y * 0.14, 3) - 0.5) * 0.62, wv = v + (ztVN(X * 0.07 + 40, Y * 0.14, 5) - 0.5) * 0.62;
  const c1 = cls(Math.floor(wu), Math.floor(wv));
  return ZT_GSOFT[c1] ? c1 : c0;
}
// ------------------------------------------------------------------- materials: a world pixel -> an 8-tone ramp level
const ZT_RUNES = ['10001|01010|00100|01010|10001', '11111|00100|00100|00100|11111', '10101|10101|11111|00100|00100', '01110|10001|10101|10001|01110', '11100|10010|11100|10100|10010', '00100|01110|10101|00100|00100', '10000|11000|10100|10010|11111', '11011|01010|00100|01010|11011', '01010|11111|01010|11111|01010', '00111|01000|11111|00010|11100'].map(s => s.split('|'));
// flagstones laid along the iso axes: returns [level offset, seam?, stone id, fu, fv, len]
function ztFlag(u, v, scale) {
  const su = u * scale, sv = v * scale, r = Math.floor(sv), off = hash(r * 3 + 1, 77), q = su + off, cc = Math.floor(q), pc = cc >> 1;
  const pair = hash(pc * 7 + r, r * 13 + 5) < 0.45, base = pair ? pc * 2 : cc, len = pair ? 2 : 1, fu = (q - base) / len, fv = sv - r;
  return [fu, fv, len, hash(base * 31 + 7, r * 17 + 3)];
}
function ztStone(ramp, u, v, X, Y, scale, o) {
  const [fu, fv, len, id] = ztFlag(u, v, scale), px = 0.085 * scale;    // one pixel, in stone units
  const eu = fu * len, eu2 = (1 - fu) * len;
  if (eu < px * 1.05 || fv < px * 1.05) return -1;                           // the joint
  let L = o.base + (id - 0.5) * o.var + (ztVN(X / 6, Y / 3, 11) - 0.5) * 0.12 + (hash(X, Y) - 0.5) * 0.06;
  if (eu < px * 2.2 || fv < px * 2.2) L += 0.16;                              // the lit upper lips
  else if (eu2 < px * 1.6 || 1 - fv < px * 1.6) L -= 0.14;                    // the shadowed lower edges
  L -= (fu + fv - 1) * 0.08;                                                 // a gentle slope of light across each stone
  if (hash(id * 1000 | 0, 5) < o.crack) { const a = id * 9, d = Math.abs((fu - 0.5) * Math.cos(a) * len + (fv - 0.5) * Math.sin(a) + (ztVN(X / 3, Y / 2, 17) - 0.5) * 0.18); if (d < 0.035) L = 0.05; else if (d < 0.07) L += 0.1; }
  if (o.rune && hash(id * 1000 | 0, 9) < o.rune) {
    const du = (fu - 0.5) * len / scale, dv = (fv - 0.5) / scale, gx = Math.round((du - dv) * ZT_HW / GRAIN) + 2, gy = Math.round((du + dv) * ZT_HH / GRAIN) + 2;
    if (gx >= 0 && gy >= 0 && gx < 5 && gy < 5) { const g = ZT_RUNES[(id * 97 | 0) % ZT_RUNES.length]; if (g[gy][gx] === '1') return -2; }
  }
  return L;
}
function ztCobble(X, Y, S, sd) {
  const gx = X / S, gy = Y * 2 / S, ix = Math.floor(gx), iy = Math.floor(gy);
  let d1 = 9, d2 = 9, cx = 0, cy = 0, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const a = ix + i, b = iy + j, px = a + 0.15 + 0.7 * hash(a * 7 + sd, b * 3), py = b + 0.15 + 0.7 * hash(a * 5, b * 11 + sd), d = Math.hypot(gx - px, gy - py);
    if (d < d1) { d2 = d1; d1 = d; cx = gx - px; cy = gy - py; id = hash(a, b + sd); } else if (d < d2) d2 = d;
  }
  return [d2 - d1, cx, cy, id];
}
// the flat colour of one world pixel of class c (for caps and anything that wants the ground's colour without its relief)
function ztMat(c, X, Y) { ztGS(c, X, Y); const r = ZGR[ZG.R]; return r[Math.max(0, Math.min(r.length - 1, Math.floor((ZG.A + ZG.H * 0.08) * r.length)))]; }
// ------------------------------------------------------------------- v0.37: ground as lit clusters
// Every world pixel of the ground is sampled into a material (a hand-picked hue-shifted ramp), an albedo and a
// height. The heights are then lit like a relief: slopes that face the upper left take the light (the clean lit lip
// of a flagstone, the windward edge of an ash drift), slopes that face away fall into shadow, joints and cracks
// sink dark. The result is quantised into the ramp with no dither, and single stray pixels are cleaned away, so
// every texture reads as clusters (stones, clods, drifts, cushions of moss) rather than as speckle.
const ZGR = [
  null,
  /* 1 earth */ ZT_R('#0a070b', '#140d10', '#211515', '#301e19', '#40281e', '#513323', '#633f29', '#774c30', '#8c5a38'),
  /* 2 ash */ ZT_R('#100e17', '#1c1921', '#29252b', '#383236', '#484042', '#5a5050', '#6e625c', '#83756a', '#9a8a7a'),
  /* 3 grass */ ZT_R('#0e0b0c', '#1c1512', '#2c2116', '#3f2f1b', '#534021', '#6a5228', '#826631', '#9a7a3c'),
  /* 4 moss */ ZT_R('#06080a', '#0c110f', '#141b14', '#1d2616', '#283219', '#353f1d', '#444c22', '#565a28', '#6b6a31'),
  /* 5 peat */ ZT_R('#07060a', '#0f0b0e', '#181113', '#231916', '#2e211a', '#3b2a1f', '#4a3524'),
  /* 6 mud */ ZT_R('#050408', '#0a080c', '#120e11', '#1a1415', '#231b18', '#2e231c', '#3a2c21', '#5a524d', '#847c72'),
  /* 7 crypt stone */ ZT_R('#07060c', '#0f0d17', '#191622', '#231f2d', '#2e2837', '#3b333d', '#4a4044', '#5a4f4b', '#6e6152', '#86755c', '#a08b69'),
  /* 8 flags */ ZT_R('#09080d', '#131119', '#1e1b22', '#2a252b', '#373033', '#453c3b', '#554a44', '#675a4e', '#7c6b5a', '#937f68'),
  /* 9 bone floor */ ZT_R('#0c0a0e', '#171317', '#231d1e', '#312824', '#40352c', '#504234', '#62513d', '#766248', '#8c7555', '#a38a66', '#b9a078'),
  /* 10 bone dust */ ZT_R('#15111a', '#221c20', '#322a27', '#43392f', '#564937', '#6a5a42', '#7f6d4f', '#95815d'),
  /* 11 arena */ ZT_R('#0b060b', '#150b12', '#211119', '#2d171f', '#3a1e25', '#48272b', '#583131', '#6a3d38', '#7f4b41'),
  /* 12 barrow earth */ ZT_R('#07050a', '#0f0b0f', '#181215', '#221919', '#2d201d', '#392822', '#463127', '#553b2d'),
  /* 13 barrow stone */ ZT_R('#09080d', '#131118', '#1d1a21', '#29252b', '#353034', '#433b3d', '#524846', '#635650', '#76665c'),
  /* 14 cobble */ ZT_R('#08070c', '#131016', '#1f1a1e', '#2c2525', '#3b312d', '#4b3e36', '#5d4d40', '#715d4b', '#886f58'),
  /* 15 water */ ZT_R('#030409', '#060910', '#0a0f19', '#0f1623', '#151e2e', '#1d283b', '#28354a', '#37455b', '#4d5d70'),
  /* 16 bog */ ZT_R('#030507', '#060a0b', '#0a100f', '#0e1613', '#131d17', '#1a261c', '#243122', '#34422c'),
  /* 17 scum */ ZT_R('#0a0e0a', '#11170f', '#192014', '#212a18', '#2b351c', '#374221', '#455027', '#56602f'),
  /* 18 shallow */ ZT_R('#05070c', '#0a0f15', '#101820', '#16222a', '#1e2d35', '#28393f', '#344749', '#445753', '#5a6c64'),
  /* 19 shallowFen */ ZT_R('#04070a', '#09100f', '#0f1813', '#162218', '#1e2c1d', '#283823', '#34462a', '#445633'),
  /* 20 blood */ ZT_R('#0c0307', '#17050b', '#23070f', '#310b13', '#420f17', '#57171c', '#6e2222', '#8a342c'),
  /* 21 root */ ZT_R('#060508', '#0d0a0c', '#161010', '#201714', '#2b1f19', '#37281e', '#453224', '#563e2c', '#6a4c34'),
  /* 22 pebble */ ZT_R('#0a090e', '#15131a', '#221d22', '#302829', '#3f3531', '#50443b', '#635447', '#786653', '#8f7a62', '#a8917a'),
];
const ZG = { R: 0, A: 0, H: 0, W: 0 };   // the last sample: ramp, albedo, height, wet
// Voronoi on a jittered grid in iso space (x, 2y): e is the true distance in screen pixels to the nearest joint
const ZV = { e: 0, id: 0, dx: 0, dy: 0, id2: 0 };
function ztVor(X, Y, S, sd) {
  const gx = X / S, gy = Y * 2 / S, ix = Math.floor(gx), iy = Math.floor(gy);
  let d1 = 1e9, d2 = 1e9, ax = 0, ay = 0, bx = 0, by = 0, id = 0, id2 = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const a = ix + i, b = iy + j, px = a + 0.12 + 0.76 * hash(a * 7 + sd, b * 3 - sd), py = b + 0.12 + 0.76 * hash(a * 5 - sd, b * 11 + sd), d = (gx - px) ** 2 + (gy - py) ** 2;
    if (d < d1) { d2 = d1; bx = ax; by = ay; id2 = id; d1 = d; ax = px; ay = py; id = hash(a * 13 + sd, b * 17 - sd); } else if (d < d2) { d2 = d; bx = px; by = py; id2 = hash(a * 13 + sd, b * 17 - sd); }
  }
  const nx = bx - ax, ny = by - ay, L = Math.hypot(nx, ny) || 1e-6, e = (d2 - d1) / (2 * L);   // distance to the bisector in grid units
  ZV.e = e * S / Math.hypot(nx / L, 2 * ny / L); ZV.id = id; ZV.id2 = id2; ZV.dx = (gx - ax) * S; ZV.dy = (gy - ay) * S / 2;
  return ZV;
}
const ztS = (r, a, h, w) => { ZG.R = r; ZG.A = a; ZG.H = h; ZG.W = w || 0; };
function ztGS(c, X, Y) {
  switch (c) {
    case ZT_G.MOOR: {
      const big = ztVN(X / 150, Y / 75, 25), n = ztFBM(X / 44, Y / 22, 21), m = ztVN(X / 6, Y / 3, 22), ash = ztFBM(X / 34 + 90, Y / 17, 23);
      if (ash > 0.62) {   // an ash drift: a soft mound, its windward edge catching the light, wind ripples across it
        const rip = ((Y + ztVN(X / 9, Y / 4.5, 26) * 6) / 3.5) % 1;
        return ztS(2, 0.33 + (ash - 0.62) * 1.2 + (m - 0.5) * 0.08, (ash - 0.62) * 16 + (rip < 0.22 ? 0.35 : 0));
      }
      if (big < 0.36 && n < 0.55) {   // cracked earth: dry plates with dark fissures, curling up at their lips
        const v = ztVor(X, Y, 13, 27);
        if (v.e < 0.9) return ztS(1, 0.1, -0.8);
        return ztS(1, 0.4 + (v.id - 0.5) * 0.14 + (m - 0.5) * 0.08, Math.min(1, (v.e - 0.9) / 1.6) * 0.8 + (v.dx * (v.id - 0.5) + v.dy * (v.id2 - 0.5)) * 0.02);
      }
      if (big > 0.68) return ztS(2, 0.27 + (n - 0.5) * 0.22 + (m - 0.5) * 0.1 + (big - 0.68) * 0.4, ztVN(X / 7, Y / 3.5, 29) * 0.9);   // an ash field
      const g = ztFBM(X / 26, Y / 13, 111);
      if (g > 0.56) return ztS(3, 0.36 + (g - 0.56) * 0.9 + (m - 0.5) * 0.12, ztVN(X / 2.6, Y / 1.6, 112) * 0.9 + g);   // mats of dead grass
      const gr = ztVN(X / 20 + 3, Y / 10, 113);
      if (gr > 0.64) { const v = ztVor(X, Y, 4.5, 114); if (v.e > 0.5) return ztS(22, 0.36 + (v.id - 0.5) * 0.3, Math.min(0.9, v.e / 1.1) + ztFBM(X / 12, Y / 6, 115)); }   // gravel
      return ztS(1, 0.4 + (n - 0.5) * 0.28 + (m - 0.5) * 0.12, ztFBM(X / 12, Y / 6, 115) * 1.3);
    }
    case ZT_G.FEN: {
      const p = ztFBM(X / 26 + 50, Y / 13, 33), m = ztVN(X / 2.4, Y / 1.7, 32);
      if (p < 0.28) return ztS(16, 0.28 + (ztVN(X / 18, Y / 1.4, 34) > 0.72 ? 0.14 : 0), 0, 1);   // a bog pool
      if (p < 0.32) return ztS(6, 0.3, -0.4 + (p - 0.28) * 10, 1);
      const pu = ztVN(X / 16 + 30, Y / 8, 35);
      if (pu > 0.8) return ztS(19, 0.36 + (ztVN(X / 14, Y / 1.3, 36) > 0.7 ? 0.16 : 0), -0.3, 1);
      const v = ztVor(X, Y, 11, 37);
      if (v.e < 1.1 || ztFBM(X / 22 + 70, Y / 11, 38) < 0.4) return ztS(5, 0.4 + (m - 0.5) * 0.12, ztVN(X / 4, Y / 2, 39) * 0.5, 0);   // peat between the cushions
      return ztS(4, 0.42 + (v.id - 0.5) * 0.2 + (m - 0.5) * 0.16, Math.sqrt(Math.min(1, (v.e - 1.1) / 4)) * 1.6 + m * 0.35);          // cushions of moss
    }
    case ZT_G.DIRT: {
      const n = ztFBM(X / 30, Y / 15, 41), m = ztVN(X / 5, Y / 2.5, 42);
      if (n > 0.62) { const v = ztVor(X, Y, 12, 44); if (v.e < 0.85) return ztS(1, 0.12, -0.7); return ztS(1, 0.44 + (v.id - 0.5) * 0.14, Math.min(1, (v.e - 0.85) / 1.5) * 0.7); }
      const gr = ztVN(X / 16 + 3, Y / 8, 43);
      if (gr > 0.66) { const v = ztVor(X, Y, 4, 45); if (v.e > 0.5) return ztS(22, 0.34 + (v.id - 0.5) * 0.3, Math.min(0.8, v.e / 1.1)); }
      return ztS(1, 0.44 + (n - 0.5) * 0.3 + (m - 0.5) * 0.14, ztFBM(X / 10, Y / 5, 46) * 1.2);
    }
    case ZT_G.MUD: {
      const n = ztFBM(X / 18, Y / 9, 51), r = ztVN(X / 6, Y / 3, 52);
      if (n < 0.34) return ztS(15, 0.22 + (ztVN(X / 16, Y / 1.4, 53) > 0.7 ? 0.14 : 0), -0.2, 0);   // standing water in the ruts
      return ztS(6, 0.36 + (n - 0.5) * 0.3, n * 2.4 + r * 0.8, 1);
    }
    case ZT_G.ROAD: {
      const v = ztVor(X, Y, 9, 61);
      if (v.e < 0.8 || v.id > 0.93) return ztVN(X / 9, Y / 5, 62) > 0.64 ? ztS(3, 0.34, 0.2) : ztS(1, 0.16, -0.6);
      const wear = ztFBM(X / 36 + 20, Y / 18, 63);
      return ztS(14, 0.44 + (v.id - 0.5) * 0.22 + (wear - 0.5) * 0.14, Math.sqrt(Math.min(1, (v.e - 0.8) / 2.4)) * 1.1);
    }
    case ZT_G.FLAGS: case ZT_G.CRYPT: case ZT_G.BONE: case ZT_G.ARENA: {
      const R = c === ZT_G.FLAGS ? 8 : c === ZT_G.CRYPT ? 7 : c === ZT_G.BONE ? 9 : 11, S = c === ZT_G.ARENA ? 21 : c === ZT_G.BONE ? 15 : 17;
      if (c === ZT_G.BONE) { const d = ztFBM(X / 30 + 7, Y / 15, 74); if (d > 0.6) return ztS(10, 0.42 + (d - 0.6) * 1.4 + (ztVN(X / 3, Y / 2, 75) - 0.5) * 0.1, (d - 0.6) * 9); }   // drifts of bone dust
      if (c === ZT_G.ARENA) { const b = ztFBM(X / 22 + 3, Y / 11, 76); if (b > 0.66) return ztS(20, 0.3 + (b - 0.66) * 1.5, -0.1, 1); }   // old blood, pooled in the low places
      const v = ztVor(X, Y, S, R * 7), jw = 1 + ztVN(X / 9, Y / 4.5, 77) * 1.3;
      if (v.e < jw) {   // the joint: dark grit, moss outdoors, bone dust in the ossuary
        if (c === ZT_G.FLAGS && ztVN(X / 8, Y / 4, 71) > 0.52) return ztS(4, 0.3 + ztVN(X / 2, Y / 2, 72) * 0.25, -0.6);
        if (c === ZT_G.BONE && ztVN(X / 7, Y / 3.5, 73) > 0.45) return ztS(10, 0.3, -0.5);
        return ztS(R, 0.04, -1.2);
      }
      if (v.id > 0.95 && c !== ZT_G.ARENA) { const w = ztVor(X, Y, 4, 78); return ztS(22, 0.26 + (w.id - 0.5) * 0.2, -0.9 + Math.min(0.5, w.e / 1.2)); }   // a stone gone: rubble in the hole
      const tx = (hash(v.id * 1e4 | 0, 3) - 0.5), ty = (hash(v.id * 1e4 | 0, 5) - 0.5);
      let h = Math.min(1, (v.e - jw) / 1.7) * 0.95 + (v.dx * tx + v.dy * ty) * 0.03, a = 0.56 + (v.id - 0.5) * 0.16 + (ztVN(X / 7, Y / 3.5, 79) - 0.5) * 0.12 + (ztFBM(X / 60, Y / 30, 80) - 0.5) * 0.16;
      if (ztVN(X / 1.8, Y / 1.2, 81 + (v.id * 50 | 0)) > 0.87) h -= 0.45;                                   // pits
      if (v.id2 < 0.3) { const an = v.id * 9, d = Math.abs(v.dx * Math.cos(an) + v.dy * 2 * Math.sin(an) + (ztVN(X / 3, Y / 2, 82) - 0.5) * 3); if (d < 0.7) h -= 0.9; }   // a crack across the stone
      if (c === ZT_G.ARENA && v.id < 0.22) {   // a rune cut into the slab
        const gx = Math.round(v.dx / 1.6) + 2, gy = Math.round(v.dy / 1.6) + 2;
        if (gx >= 0 && gy >= 0 && gx < 5 && gy < 5 && ZT_RUNES[(v.id * 97 | 0) % ZT_RUNES.length][gy][gx] === '1') return ztS(20, 0.4, h - 0.8, 1);
      }
      return ztS(R, a, h);
    }
    case ZT_G.BARROW: {
      const v = ztVor(X, Y, 14, 81), m = ztVN(X / 4, Y / 2, 82);
      if (v.id > 0.42 && v.e > 1.2) return ztS(13, 0.5 + (v.id - 0.5) * 0.24 + (m - 0.5) * 0.1, Math.sqrt(Math.min(1, (v.e - 1.2) / 3.5)) * 1.4);   // fieldstones sunk in the floor
      return ztS(12, 0.34 + (ztFBM(X / 20, Y / 10, 83) - 0.5) * 0.3 + (m - 0.5) * 0.12, ztFBM(X / 9, Y / 4.5, 84) * 1.0);
    }
    case ZT_G.WATER: case ZT_G.BOG: {
      const bog = c === ZT_G.BOG, n = ztFBM(X / 60, Y / 20, 91), st = ztVN(X / 22, Y / 1.5, 92);
      if (bog) { const s = ztFBM(X / 11 + 9, Y / 5.5, 93) + (ztFBM(X / 40, Y / 20, 94) - 0.5) * 0.4; if (s > 0.64) return ztS(17, 0.3 + (s - 0.64) * 1.6, (s - 0.64) * 6); }
      return ztS(bog ? 16 : 15, 0.3 + (n - 0.5) * 0.2 + (st > 0.74 ? 0.1 : st < 0.3 ? -0.06 : 0), 0);
    }
    case ZT_G.SHALLOW: case ZT_G.SHALLOWFEN: {
      const v = ztVor(X, Y, 6, 101), st = ztVN(X / 18, Y / 1.5, 102);
      return ztS(c === ZT_G.SHALLOW ? 18 : 19, 0.36 + (v.e > 0.6 ? (v.id - 0.5) * 0.2 : -0.1) + (st > 0.74 ? 0.2 : 0) + (ztFBM(X / 30, Y / 15, 103) - 0.5) * 0.2, v.e > 0.6 ? Math.min(0.5, v.e / 2) : 0);
    }
  }
  return ztS(1, 0, 0);
}
// the height a class sits at, so the edge where one meets another is lit (flags stand proud of the earth, water lies low)
const ZT_GBASE = [0, 0, 0, 0, -0.3, -0.1, 0.6, -1.4, -1.4, -1, -1, 0, 0, 0, 0];
function ztPaintGround(X0, Y0, Wd, Ht, cls, own) {
  const c = mkCanvas(Wd, Ht), x = c.getContext('2d'), img = x.createImageData(Wd, Ht), D = img.data;
  const MW = Wd + 4, MH = Ht + 4, TY = new Uint8Array(MW * MH);   // classes with a 2px margin
  for (let j = 0; j < MH; j++) for (let i = 0; i < MW; i++) TY[j * MW + i] = ztTypeAt(cls, X0 + i - 2, Y0 + j - 2);
  const ty = (X, Y) => { const i = X - X0 + 2, j = Y - Y0 + 2; return i >= 0 && j >= 0 && i < MW && j < MH ? TY[j * MW + i] : ztTypeAt(cls, X, Y); };
  const owns = (X, Y) => { const u = ((X + 0.5) / ZT_HW + (Y + 0.5) / ZT_HH) / 2, v = ((Y + 0.5) / ZT_HH - (X + 0.5) / ZT_HW) / 2; return own(Math.floor(u), Math.floor(v)); };
  // 1: sample every pixel (with a 1px margin for the slopes)
  const SW = Wd + 2, SH = Ht + 2, RR = new Uint8Array(SW * SH), AA = new Float32Array(SW * SH), HH = new Float32Array(SW * SH), WW = new Uint8Array(SW * SH);
  for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) {
    const X = X0 + i - 1, Y = Y0 + j - 1, t = TY[(j + 1) * MW + i + 1]; if (t === ZT_G.VOID) { HH[j * SW + i] = 2; continue; }
    ztGS(t, X, Y); const k = j * SW + i; RR[k] = ZG.R; AA[k] = ZG.A; HH[k] = ZG.H + ZT_GBASE[t]; WW[k] = ZG.W;
  }
  // 2: light the relief and quantise
  const OWN = new Uint8Array(Wd * Ht), LV = new Int8Array(Wd * Ht), RQ = new Uint8Array(Wd * Ht);
  for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) {
    const X = X0 + i, Y = Y0 + j; if (!owns(X, Y)) continue;
    const t = TY[(j + 2) * MW + i + 2]; if (t === ZT_G.VOID) continue;
    const k = (j + 1) * SW + i + 1, r = RR[k], ramp = ZGR[r], n = ramp.length;
    const hl = HH[k - 1], hr = HH[k + 1], hu = HH[k - SW], hd = HH[k + SW], h0 = HH[k];
    const gx = Math.max(-1.5, Math.min(1.5, (Math.min(hr, h0 + 1.5) - Math.min(hl, h0 + 1.5)) * 0.5)), gy = Math.max(-1.5, Math.min(1.5, (Math.min(hd, h0 + 1.5) - Math.min(hu, h0 + 1.5)) * 0.5));
    let L = AA[k] + (gx * 0.5 + gy * 0.8) * 0.42;
    if (WW[k] && gx * 0.5 + gy * 0.8 > 0.22) L += 0.3;                                      // wet ground shines where it faces the light
    let lv = Math.floor(L * n);
    // shadow at the foot of walls and cliffs: long on the far side of the light, a short contact shadow all round
    const u = ((X + 0.5) / ZT_HW + (Y + 0.5) / ZT_HH) / 2, v = ((Y + 0.5) / ZT_HH - (X + 0.5) / ZT_HW) / 2, cu = Math.floor(u), cv = Math.floor(v), fu = u - cu, fv = v - cv, wob = (ztVN(X / 5, Y / 3, 88) - 0.5) * 0.08;
    let sh = 0;
    if (cls(cu - 1, cv) === ZT_G.VOID) { const d = fu + wob; sh = Math.max(sh, d < 0.18 ? 3 : d < 0.34 ? 2 : d < 0.52 ? 1 : 0); }
    if (cls(cu, cv + 1) === ZT_G.VOID) { const d = 1 - fv + wob; sh = Math.max(sh, d < 0.12 ? 2 : d < 0.26 ? 1 : 0); }
    if (cls(cu, cv - 1) === ZT_G.VOID) { const d = fv + wob; sh = Math.max(sh, d < 0.1 ? 2 : d < 0.22 ? 1 : 0); }
    if (cls(cu + 1, cv) === ZT_G.VOID) { const d = 1 - fu + wob; sh = Math.max(sh, d < 0.1 ? 2 : d < 0.2 ? 1 : 0); }
    if (!sh) { if (cls(cu - 1, cv - 1) === ZT_G.VOID && Math.hypot(fu, fv) < 0.3) sh = 1; if (cls(cu - 1, cv + 1) === ZT_G.VOID && Math.hypot(fu, 1 - fv) < 0.36) sh = 1; if (cls(cu + 1, cv + 1) === ZT_G.VOID && Math.hypot(1 - fu, 1 - fv) < 0.2) sh = 1; }
    lv -= sh;
    // the banks of water: the lip of the bank lit, the bank dark and wet, a broken line of scum along the shore
    const wet = ZT_GWET[t], up = TY[(j + 1) * MW + i + 2], up2 = TY[j * MW + i + 2], dn = TY[(j + 3) * MW + i + 2], dn2 = TY[(j + 4) * MW + i + 2];
    if (wet && !ZT_GWET[up] && up !== ZT_G.VOID) lv = ztVN(X / 5, Y, 89) > 0.45 ? n - 3 : Math.max(lv, 2);
    else if (wet && !ZT_GWET[up2] && up2 !== ZT_G.VOID) lv = 0;
    else if (!wet && (ZT_GWET[dn] || ZT_GWET[dn2])) lv -= ZT_GWET[dn] ? 3 : 1;
    const o = j * Wd + i; OWN[o] = 1; LV[o] = Math.max(0, Math.min(n - 1, lv)); RQ[o] = r;
  }
  // 3: clean up stray pixels (a pixel unlike all its neighbours takes the colour they share)
  for (let j = 1; j < Ht - 1; j++) for (let i = 1; i < Wd - 1; i++) {
    const o = j * Wd + i; if (!OWN[o]) continue; const l = LV[o], r = RQ[o];
    const a = o - 1, b = o + 1, cc = o - Wd, d = o + Wd;
    if (!OWN[a] || !OWN[b] || !OWN[cc] || !OWN[d]) continue;
    const same = (q) => RQ[q] === r && LV[q] === l;
    if (same(a) || same(b) || same(cc) || same(d)) continue;
    if (RQ[a] === RQ[b] && LV[a] === LV[b]) { RQ[o] = RQ[a]; LV[o] = LV[a]; } else if (RQ[cc] === RQ[d] && LV[cc] === LV[d]) { RQ[o] = RQ[cc]; LV[o] = LV[cc]; } else { RQ[o] = RQ[a]; LV[o] = LV[a]; }
  }
  for (let o = 0; o < Wd * Ht; o++) { if (!OWN[o]) continue; const col = ZGR[RQ[o]][LV[o]], q = o * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255; }
  // 4: hand-placed detail, anchored in the world so it crosses chunk edges cleanly
  const put = (X, Y, col, need) => { const i = X - X0, j = Y - Y0; if (i < 0 || j < 0 || i >= Wd || j >= Ht || !OWN[j * Wd + i]) return; if (need != null && ty(X, Y) !== need) return; const o = (j * Wd + i) * 4; D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; };
  const get = (X, Y) => { const i = X - X0, j = Y - Y0; if (i < 0 || j < 0 || i >= Wd || j >= Ht || !OWN[j * Wd + i]) return null; const o = (j * Wd + i) * 4; return [D[o], D[o + 1], D[o + 2]]; };
  ztDecals(X0 - 10, Y0 - 12, Wd + 20, Ht + 24, ty, put, get);
  x.putImageData(img, 0, 0); return c;
}
// ------------------------------------------------------------------- decals: placed as groups, never uniformly
const ZDC = { grass: ZGR[3], fgrass: ZT_R('#07090b', '#0e1411', '#151f16', '#1d2a1a', '#27371f', '#334525', '#42552c', '#556634'), bone: ZT_R('#1a1418', '#2e2527', '#4a3f38', '#6b5e4f', '#8f8068', '#b0a184', '#cdbf9f', '#e5d9bb'), peb: ZGR[22], blood: ZGR[20], root: ZGR[21], wax: ZT_R('#2a1c1a', '#54402f', '#8a7255', '#b89e78', '#dcc79f', '#f3e6c5') };
const ZTC = { blade: ZDC.grass.slice(1, 6), fblade: ZDC.fgrass.slice(1, 6) };
function ztDecals(X0, Y0, Wd, Ht, ty, put, get) {
  // a coarse lattice of sites; each site decides (from the world position) whether a group lives there
  const G = 12;
  for (let Y = Math.floor(Y0 / G) * G; Y < Y0 + Ht; Y += G) for (let X = Math.floor(X0 / (G * 2)) * G * 2; X < X0 + Wd; X += G * 2) {
    const h = hash(X * 13 + 5, Y * 7 + 1), sx = X + Math.floor(hash(X, Y * 3) * G * 2), sy = Y + Math.floor(hash(X * 3, Y) * G), t = ty(sx, sy);
    if (t === ZT_G.MOOR || t === ZT_G.FEN || t === ZT_G.DIRT) {
      const dens = ztFBM(sx / 26, sy / 13, 111), fen = t === ZT_G.FEN;
      if (h < (fen ? 0.5 : 0.62) * Math.max(0, dens - 0.3) * 2.2) ztTufts(sx, sy, put, ty, fen ? ZDC.fgrass : ZDC.grass, 2 + (h * 97 | 0) % 4, h);
      else if (h > 0.985) ztBoneGroup(sx, sy, put, h);
      else if (h > 0.93 && !fen) ztRocks(sx, sy, put, h);
      else if (h > 0.9) ztPebbles(sx, sy, put, h, 2 + (h * 71 | 0) % 3);
      if (fen && h > 0.3 && h < 0.34) ztRoot(sx, sy, put, get, h);
    } else if (t === ZT_G.ROAD) { if (h > 0.93) ztPebbles(sx, sy, put, h, 2); else if (h < 0.12) ztTufts(sx, sy, put, ty, ZDC.grass, 1, h); }
    else if (t === ZT_G.BARROW) { if (h < 0.1) ztRoot(sx, sy, put, get, h); else if (h > 0.93) ztBoneGroup(sx, sy, put, h); else if (h > 0.86) ztPebbles(sx, sy, put, h, 3); }
    else if (t === ZT_G.BONE) { if (h < 0.22) ztBoneGroup(sx, sy, put, h); else if (h > 0.9) ztPebbles(sx, sy, put, h, 2); }
    else if (t === ZT_G.CRYPT || t === ZT_G.FLAGS) { if (h < 0.05) ztBoneGroup(sx, sy, put, h); else if (h > 0.95) ztStain(sx, sy, put, h); else if (h > 0.9) ztPebbles(sx, sy, put, h, 2); else if (t === ZT_G.CRYPT && h > 0.3 && h < 0.33) ztWaxPool(sx, sy, put, h); }
    else if (t === ZT_G.ARENA) { if (h < 0.1) ztBoneGroup(sx, sy, put, h); else if (h > 0.9) ztStain(sx, sy, put, h); }
  }
}
// a clump of dead grass: blades fanned out from one root, lit at the tips, dark at the root
function ztTufts(X, Y, put, ty, R, n, h) {
  for (let k = 0; k < n; k++) {
    const cx = X + Math.round((hash(X + k * 7, Y) - 0.5) * 10), cy = Y + Math.round((hash(X, Y + k * 5) - 0.5) * 5), tt = ty(cx, cy); if (tt !== ZT_G.MOOR && tt !== ZT_G.FEN && tt !== ZT_G.DIRT && tt !== ZT_G.ROAD) continue;
    const nb = 4 + ((h * 1000 + k * 3) | 0) % 4, H0 = 4 + ((h * 300 + k) | 0) % 4;
    for (let b = 0; b < nb; b++) {
      const s = (b / (nb - 1)) * 2 - 1, hb = Math.round(H0 * (1 - Math.abs(s) * 0.35) + hash(cx + b, cy) * 2), lean = s * 1.4 + (hash(cx * 3, b) - 0.5) * 0.8;
      for (let q = 0; q <= hb; q++) { const t = q / hb, xx = Math.round(cx + lean * t * t * 1.6 + s * 0.8), yy = cy - q; put(xx, yy, R[q === hb ? R.length - 1 - (b & 1) : q > hb * 0.6 ? R.length - 3 : q > 0 ? 3 : 1]); }
    }
    put(cx - 1, cy + 1, R[0]); put(cx, cy + 1, R[0]); put(cx + 1, cy + 1, R[1]);
  }
}
// pebbles: small lit stones with a dark underside and a pixel of cast shadow
function ztPebbles(X, Y, put, h, n) {
  const P = ZDC.peb;
  for (let k = 0; k < n; k++) {
    const x = X + Math.round((hash(X + k, Y * 3) - 0.5) * 12), y = Y + Math.round((hash(X * 3, Y + k) - 0.5) * 6), w = 2 + ((h * 1e4 + k) | 0) % 3;
    for (let i = 0; i < w; i++) { put(x + i, y - 1, P[i === 0 ? 8 : i < w - 1 ? 7 : 5]); put(x + i, y, P[i === 0 ? 6 : i < w - 1 ? 5 : 3]); put(x + i + 1, y + 1, P[1]); }
    put(x - 1, y, P[3]); put(x + w, y, P[1]); put(x + w, y + 1, P[0]);
  }
}
// a half-buried stone: lit on its top and upper left, dark beneath, a pixel of cast shadow; now and then two or three
function ztRocks(X, Y, put, h) {
  const P = ZDC.peb, n = 1 + ((h * 997) | 0) % 3;
  for (let k = 0; k < n; k++) {
    const cx = X + Math.round((hash(X + k * 3, Y) - 0.5) * 14), cy = Y + Math.round((hash(X, Y + k * 5) - 0.5) * 6), rx = 2.5 + hash(cx, cy) * 3.5, ry = rx * 0.6;
    for (let j = -Math.ceil(ry) - 1; j <= Math.ceil(ry) + 1; j++) for (let i = -Math.ceil(rx) - 1; i <= Math.ceil(rx) + 1; i++) {
      const d = (i / rx) ** 2 + (j / ry) ** 2; if (d > 1) { if (d < 1.5 && i > 0 && j > 0) put(cx + i, cy + j, P[0]); continue; }
      const lit = -(i / rx) * 0.5 - (j / ry) * 0.8 + (1 - d) * 0.5, lv = Math.max(1, Math.min(9, Math.round(4 + lit * 4 + (ztVN((cx + i) / 2, (cy + j) / 2, 99) - 0.5) * 2)));
      put(cx + i, cy + j, P[lv]);
    }
  }
}
// a few bones together: a long bone with lit knuckles, a rib or two, now and then a skull
function ztBoneGroup(X, Y, put, h) {
  const B = ZDC.bone, dir = hash(X, Y * 7) < 0.5 ? 1 : -1, L = 6 + (h * 1e3 | 0) % 5;
  for (let i = 0; i <= L; i++) { const x = X + i * dir, y = Y + Math.round(i * 0.35); put(x, y - 1, B[i === 0 || i === L ? 7 : 5]); put(x, y, B[i === 0 || i === L ? 5 : 3]); put(x, y + 1, B[0]); }
  put(X - dir, Y - 1, B[6]); put(X - dir, Y, B[4]); put(X + (L + 1) * dir, Y + Math.round(L * 0.35) - 1, B[6]);
  if ((h * 1e5 | 0) % 3 === 0) { // ribs
    for (let r = 0; r < 3; r++) for (let q = 0; q < 5; q++) { const x = X + 3 + r * 2 * dir + (q > 2 ? dir : 0), y = Y + 3 + q - Math.round(r * 0.4); put(x, y, B[q < 1 ? 6 : q < 3 ? 4 : 2]); }
  }
  if ((h * 1e5 | 0) % 2 === 0) ztSkull(X - 5 * dir, Y + 2, put);
}
function ztSkull(X, Y, put) {
  const B = ZDC.bone, S = ['.3553.', '366653', '466654', '503305', '355553', '.4224.', '..00..'];   // lit from the upper left, sockets and nose dark
  for (let j = 0; j < S.length; j++) for (let i = 0; i < 6; i++) { const ch = S[j][i]; if (ch !== '.') put(X + i, Y + j - 4, B[+ch]); }
}
function ztStain(X, Y, put, h) { const P = ZDC.blood, r = 2 + h * 300 % 3; for (let j = -r; j <= r; j++) for (let i = -r * 2; i <= r * 2; i++) { const d = (i / 2) ** 2 + j * j, e = r * r * (0.55 + 0.45 * ztVN((X + i) / 2, (Y + j) / 1.5, 97)); if (d < e) put(X + i, Y + j, P[d < e * 0.3 ? 1 : d < e * 0.7 ? 2 : 3]); } put(X - 1, Y - 1, P[6]); put(X, Y - 1, P[5]); }
function ztRoot(X, Y, put, get, h) {
  const R = ZDC.root; let x = X, y = Y, a = hash(X, Y) * 6.28; const L = 16 + (h * 1e3 | 0) % 20;
  for (let k = 0; k < L; k++) { a += (hash(x * 3 + k, y) - 0.5) * 0.5; x += Math.cos(a); y += Math.sin(a) * 0.5; const X1 = Math.round(x), Y1 = Math.round(y), w = k < L * 0.6 ? 2 : 1; put(X1, Y1 - 1, R[w > 1 ? 7 : 5]); if (w > 1) put(X1, Y1, R[4]); put(X1, Y1 + (w > 1 ? 1 : 0), R[1]); }
}
// a floor candle long burnt out: a pool of wax, two or three stubs
function ztWaxPool(X, Y, put, h) {
  const W = ZDC.wax; for (let i = -4; i <= 4; i++) for (let j = -1; j <= 1; j++) if ((i / 4.5) ** 2 + j * j < 1) put(X + i, Y + j, W[j < 0 ? 3 : 2]);
  for (let k = 0; k < 3; k++) { const x = X - 3 + k * 3, hh = 2 + ((h * 97 + k * 5) | 0) % 4; for (let q = 0; q < hh; q++) { put(x, Y - q, W[q === hh - 1 ? 5 : 4]); put(x + 1, Y - q, W[2]); } put(x, Y - hh, W[0]); }
}

// ------------------------------------------------------------------- chunks: 8 x 8 cells, painted lazily, drawn as one image
const ZT_CH = 4, ZT_CHW = ZT_CH * TW, ZT_CHH = ZT_CH * TH;
const ZTG = { zone: null, map: new Map(), queue: [] };
function ztChunkSum(z, ci, cj) { let s = 7; for (let y = cj * ZT_CH - 1; y <= cj * ZT_CH + ZT_CH; y++) for (let x = ci * ZT_CH - 1; x <= ci * ZT_CH + ZT_CH; x++) s = (Math.imul(s, 31) + ztClassOf(z, x, y)) | 0; return s; }
function ztPaintChunk(z, ci, cj) {
  const x0 = ci * ZT_CH, y0 = cj * ZT_CH, X0 = (x0 - y0 - ZT_CH) * ZT_HW, Y0 = (x0 + y0) * ZT_HH;
  const cls = (cx, cy) => ztClassOf(z, cx, cy), own = (cx, cy) => cx >= x0 && cy >= y0 && cx < x0 + ZT_CH && cy < y0 + ZT_CH;
  const c = ztPaintGround(X0, Y0, ZT_CHW, ZT_CHH, cls, own);
  return { c, X0, Y0, sum: ztChunkSum(z, ci, cj) };
}
// draws the ground for the view; returns a test: is the cell (x, y) already covered by a painted chunk?
function ztDrawGround(z, v) {
  if (ZTG.zone !== z) { ZTG.zone = z; ZTG.map.clear(); ZTG.warm = true; }
  const t0 = performance.now(), budget = ZTG.warm ? 400 : 7;
  const ci0 = Math.floor(v.x0 / ZT_CH), ci1 = Math.floor(v.x1 / ZT_CH), cj0 = Math.floor(v.y0 / ZT_CH), cj1 = Math.floor(v.y1 / ZT_CH);
  const want = [];
  for (let cj = cj0; cj <= cj1; cj++) for (let ci = ci0; ci <= ci1; ci++) {
    const x0 = ci * ZT_CH, y0 = cj * ZT_CH, sx = (x0 - y0) * ZT_HW - cam.x, sy = (x0 + y0) * ZT_HH - cam.y;
    if (sx + ZT_CH * ZT_HW < -4 || sx - ZT_CH * ZT_HW > W + 4 || sy > H + 4 || sy + ZT_CHH < -4) continue;
    want.push([ci, cj, Math.hypot(sx - W / 2, sy + ZT_CHH / 2 - H / 2)]);
  }
  want.sort((a, b) => a[2] - b[2]);
  const done = new Set();
  for (const [ci, cj] of want) {
    const key = ci + ',' + cj; let ch = ZTG.map.get(key);
    if (ch && (ZTG.check = (ZTG.check || 0) + 1) % 97 === 0 && ztChunkSum(z, ci, cj) !== ch.sum) ch = null;
    if (!ch && performance.now() - t0 < budget) { ch = ztPaintChunk(z, ci, cj); ZTG.map.set(key, ch); ZT_PROF.chunks = (ZT_PROF.chunks || 0) + 1; }
    if (!ch) continue;
    ctx.drawImage(ch.c, ch.X0 - cam.x, ch.Y0 - cam.y); done.add(key);
  }
  ZTG.warm = false;
  return (x, y) => done.has(Math.floor(x / ZT_CH) + ',' + Math.floor(y / ZT_CH));
}
// single diamond tiles (24 x 13), for anything that still asks for a tile, and while a chunk is being painted
function ztTile(cls, k) {
  const a = 37 + k * 53, b = 11 + k * 29, X0 = (a - b) * ZT_HW - ZT_HW, Y0 = (a + b) * ZT_HH;
  return ztPaintGround(X0, Y0, TW, TH + 1, (cx, cy) => (cx >= a - 1 && cx <= a + 1 && cy >= b - 1 && cy <= b + 1 ? cls : cls), (cx, cy) => cx === a && cy === b);
}
const ZT_TILES = {};
function ztTileFor(z, x, y) { const c = ztClassOf(z, x, y); if (!c) return null; const k = (hash(x, y) * 4) | 0, key = c * 8 + k; return ZT_TILES[key] || (ZT_TILES[key] = ztTile(c, k)); }
// =================================================================== walls, cliffs, ruins, palisades, pillars, rocks
Object.assign(ZTR, {
  wcrypt: ZT_R('#08070b', '#110f17', '#1a1722', '#24202e', '#2f293b', '#3b3449', '#4a4159', '#5b506c', '#716584'),
  wbarrow: ZT_R('#0a0807', '#15100c', '#201812', '#2b2019', '#382a20', '#463528', '#564232', '#6a523e', '#80644c'),
  wbone: ZT_R('#0a0908', '#141210', '#1e1b17', '#29251f', '#353028', '#433c32', '#544b3e', '#675d4c', '#7e725d'),
  cliff: ZT_R('#0a090a', '#131113', '#1c1a1b', '#262322', '#312d2b', '#3e3935', '#4c4640', '#5e564e', '#746a5f'),
  cliffFen: ZT_R('#080a09', '#101412', '#181d1a', '#212722', '#2b322b', '#363e34', '#434b3e', '#535a4a', '#686c59'),
  ruin: ZT_R('#0f0e11', '#1a181c', '#262327', '#332f32', '#413c3d', '#504a49', '#625a56', '#766d66', '#8e8479'),
  wood: ZT_R('#070504', '#120c08', '#1f150d', '#2d1e12', '#3c2818', '#4d341f', '#614328', '#785534', '#946c46'),
  iron: ZT_R('#0a0a0d', '#17181d', '#26282f', '#383b45', '#50545f', '#6e737e', '#9197a2'),
  moss: ZT_R('#0c110b', '#151e12', '#1f2b19', '#2a3a20', '#374a28', '#465a31'),
  rope: ZT_R('#1a140c', '#3a2e1e', '#5e4c32', '#84704c', '#a8946a'),
});
const ZT_OL = [8, 7, 10];
const ztQ = (ramp, L, X, Y) => ramp[Math.max(0, Math.min(ramp.length - 1, Math.floor(L * ramp.length + ZT_B4[(Y & 3) * 4 + (X & 3)])))];
// the lowest diamond row in column i of a 24 x 12 tile (the ground edge of a face), -1 if the column is empty
const ztHW = j => (j < TH / 2 ? 2 * j + 1 : 2 * (TH - 1 - j) + 1);   // v0.36: half-width of the diamond row j, any tile size
const ztBot = i => { let b = -1; for (let j = 0; j < TH; j++) { const hw = ztHW(j); if (i >= ZT_HW - hw && i < ZT_HW + hw) b = j; } return b; };
const ztTop = i => { for (let j = 0; j < TH; j++) { const hw = ztHW(j); if (i >= ZT_HW - hw && i < ZT_HW + hw) return j; } return -1; };
const ZT_BOT = Array.from({ length: TW }, (_, i) => ztBot(i)), ZT_TOPR = Array.from({ length: TW }, (_, i) => ztTop(i));
// =================================================================== v0.37: walls as lit relief
// A wall cell is painted face by face: every pixel of a face gets a material ramp, an albedo and a relief height
// (how far it stands out of the face). The relief is lit like the ground: lips that face the upper left catch the
// light, undersides fall dark, and anything that stands proud (a pilaster, a sill, a cornice, a skull) throws a short
// shadow down and to the right across the face. So the courses, pilasters, niches, bars and mouldings are modelled
// forms, not lines drawn on a flat face. The left face turns to the key light, the right face takes only the fill.
const ZWR = {
  crypt: ZT_R('#050409', '#0b0911', '#120f19', '#1a1622', '#231e2c', '#2d2735', '#39313f', '#463d48', '#554a51', '#66585b', '#7a6a66', '#907d72'),
  bstone: ZT_R('#060508', '#0d0a0e', '#151115', '#1e181b', '#282021', '#332a27', '#40352f', '#4f4238', '#605142', '#73614e', '#88735b'),
  ivory: ZT_R('#0a080b', '#161214', '#241e1e', '#352c29', '#483d35', '#5d4f42', '#736350', '#8a7860', '#a28f72', '#bba886', '#d1c09d', '#e4d6b6'),
  mortar: ZT_R('#040306', '#08070b', '#0e0c11', '#141117', '#1b171d'),
  iron: ZT_R('#040407', '#0a0a0f', '#121219', '#1c1c25', '#282833', '#373743', '#4b4955', '#66616b', '#8c8388', '#bcb0a6'),
  rust: ZT_R('#0a0506', '#160a09', '#24110d', '#341a11', '#472415', '#5c3019', '#733e1f'),
  wood: ZT_R('#050406', '#0c0809', '#150e0d', '#1f1511', '#2a1c15', '#372419', '#462e1f', '#573a26', '#6b4830'),
  moss: ZT_R('#05080a', '#0b120f', '#121c14', '#1a2718', '#23331c', '#2e4021', '#3b4e27', '#4b5d2e'),
  earth: ZT_R('#050407', '#0b080b', '#130e10', '#1c1515', '#261c19', '#31241e', '#3d2d24', '#4b372b'),
  field: ZT_R('#08070b', '#110f15', '#1b181f', '#262229', '#322c33', '#3f383e', '#4e4549', '#5f5455', '#726462', '#877670'),
  cliff: ZT_R('#060509', '#0d0b10', '#151218', '#1e1a20', '#282329', '#332d32', '#40383c', '#4e4547', '#5f5452', '#72645f', '#88776f'),
  cliffF: ZT_R('#04060a', '#090d0f', '#0f1515', '#161e1b', '#1e2821', '#273228', '#323e31', '#3f4b3a', '#4e5945', '#606951'),
  ruin: ZT_R('#08070b', '#110f14', '#1c181d', '#272227', '#342d31', '#42393c', '#524747', '#635653', '#766761', '#8c7a70', '#a38f81', '#bba692'),
  wax: ZT_R('#1e1413', '#3a2a22', '#5e4834', '#86694a', '#ab8c64', '#cbb08a', '#e4cfaa', '#f6e8cc'),
  red: ZT_R('#0c0306', '#1c050b', '#2e0810', '#420c15', '#58121a', '#701b1f'),
};
const ZW = { r: null, a: 0, h: 0 };
const zw = (r, a, h) => { ZW.r = r; ZW.a = a; ZW.h = h; return ZW; };
// ashlar: courses CH high, blocks about BL long (each course its own length and offset); returns the distance to the nearest joint
const ZA = { id: 0, dj: 0, row: 0 };
function zwAsh(q, hh, CH, BL, sd) {
  const row = Math.floor(hh / CH), hv = hh - row * CH, bl = BL * (0.72 + 0.56 * hash(row * 5 + sd, sd * 3 + 1)), qq = q + hash(row * 3 + sd, sd) * bl, bi = Math.floor(qq / bl), bq = qq - bi * bl;
  ZA.row = row; ZA.id = hash(bi * 7 + row * 131 + sd, row * 17 + sd); ZA.dj = Math.min(bq, bl - bq, hv + 0.5, CH - hv - 0.5); return ZA;
}
// a block standing on one cell. spec: { H, HM, colH(i), face(side, a, h, i, Hc) -> ZW, cap(i, j) -> ZW|null, deco(put, get, y0), flames: [] }
function ztBlock2(spec) {
  const HM = spec.HM || spec.H, PADX = 3, Wd = TW + PADX * 2, Ht = HM + TH + 6, y0 = HM + 3, N = Wd * Ht;
  const RP = new Array(N).fill(null), AL = new Float32Array(N), RE = new Float32Array(N), FC = new Uint8Array(N), over = new Map();
  const colH = spec.colH || (() => spec.H);
  for (let i = 0; i < TW; i++) {
    const b = ZT_BOT[i]; if (b < 0) continue;
    const Hc = Math.round(colH(i)), side = i < ZT_HW ? 0 : 1, a = side ? i - ZT_HW : i, capBot = spec.cap ? y0 - spec.H + b : -1e9;
    for (let y = y0 + b; y > y0 + b - Hc; y--) { if (y <= capBot) break; const h = y0 + b - y, s = spec.face(side, a, h, i, Hc); if (!s || !s.r) continue; const k = y * Wd + PADX + i; RP[k] = s.r; AL[k] = s.a; RE[k] = s.h; FC[k] = side + 1; }
  }
  if (spec.cap) for (let j = 0; j < TH; j++) for (let i = 0; i < TW; i++) {
    const hw = ztHW(j); if (i < ZT_HW - hw || i >= ZT_HW + hw) continue;
    const s = spec.cap(i, j); if (!s || !s.r) continue; const k = (y0 - spec.H + j) * Wd + PADX + i; RP[k] = s.r; AL[k] = s.a; RE[k] = s.h; FC[k] = 3;
  }
  // light the relief
  const LV = new Int8Array(N).fill(-1), KL = [0, 0.05, -0.15, 0];
  for (let y = 1; y < Ht - 1; y++) for (let x = 1; x < Wd - 1; x++) {
    const k = y * Wd + x, r = RP[k]; if (!r) continue; const f = FC[k], h0 = RE[k];
    const rh = FC[k + 1] === f ? RE[k + 1] : h0, lh = FC[k - 1] === f ? RE[k - 1] : h0, dh = FC[k + Wd] === f ? RE[k + Wd] : h0, uh = FC[k - Wd] === f ? RE[k - Wd] : h0;
    const gx = Math.max(-2, Math.min(2, (rh - lh) * 0.5)), gy = Math.max(-2, Math.min(2, (dh - uh) * 0.5));
    let L = AL[k] + KL[f] + (gx * 0.55 + gy * 0.8) * 0.3;
    for (let d = 1; d <= 5; d++) { const q = k - d * Wd - d; if (y - d < 0 || x - d < 0 || FC[q] !== f) break; if (RE[q] - h0 > d * 0.7 + 0.9) { L -= 0.16; break; } }   // cast shadow from proud forms
    LV[k] = Math.max(0, Math.min(r.length - 1, Math.floor(L * r.length)));
    if (f < 3 && !FC[k + Wd]) LV[k] = Math.min(LV[k], 1);   // the foot of the face, where it meets the ground: dark, no stair-stepped glints
  }
  // clean stray pixels
  for (let y = 1; y < Ht - 1; y++) for (let x = 1; x < Wd - 1; x++) {
    const k = y * Wd + x; if (LV[k] < 0) continue; const l = LV[k], r = RP[k], a = k - 1, b = k + 1, c = k - Wd, d = k + Wd;
    if ((RP[a] === r && LV[a] === l) || (RP[b] === r && LV[b] === l) || (RP[c] === r && LV[c] === l) || (RP[d] === r && LV[d] === l)) continue;
    if (RP[a] && RP[a] === RP[b] && LV[a] === LV[b]) { RP[k] = RP[a]; LV[k] = LV[a]; } else if (RP[c] && RP[c] === RP[d] && LV[c] === LV[d]) { RP[k] = RP[c]; LV[k] = LV[c]; }
  }
  const put = (x, y, col) => { const X = PADX + x, Y = y0 + y; if (X >= 0 && Y >= 0 && X < Wd && Y < Ht) over.set(Y * Wd + X, col); }, get = (x, y) => { const X = PADX + x, Y = y0 + y; return X >= 0 && Y >= 0 && X < Wd && Y < Ht && (RP[Y * Wd + X] || over.has(Y * Wd + X)); };
  const flames = [];
  if (spec.deco) spec.deco(put, get, y0, flames);
  const c = mkCanvas(Wd, Ht), cx = c.getContext('2d'), img = cx.createImageData(Wd, Ht), D = img.data;
  for (let k = 0; k < N; k++) { const r = RP[k]; let col = null; if (over.has(k)) col = over.get(k); else if (r && LV[k] >= 0) col = r[LV[k]]; if (!col) continue; D[k * 4] = col[0]; D[k * 4 + 1] = col[1]; D[k * 4 + 2] = col[2]; D[k * 4 + 3] = 255; }
  // a dark, violet-tinted outline along the top of the silhouette (the sides join their neighbours)
  const S0 = new Uint8ClampedArray(D);
  for (let y = 0; y < Ht; y++) for (let x = 0; x < Wd; x++) { const k = y * Wd + x; if (S0[k * 4 + 3]) continue; const dn = y + 1 < Ht && S0[(k + Wd) * 4 + 3] && !(FC[k + Wd] === 3 && (x - PADX < ZT_HW ? spec.nbW : spec.nbN)), sd = spec.olSides && ((x > 0 && S0[(k - 1) * 4 + 3]) || (x + 1 < Wd && S0[(k + 1) * 4 + 3])); if (dn || sd) { D[k * 4] = 7; D[k * 4 + 1] = 6; D[k * 4 + 2] = 11; D[k * 4 + 3] = 255; } }
  cx.putImageData(img, 0, 0);
  return { c, ox: ZT_HW + PADX, oy: y0, fl: flames.map(([x, y, s]) => [x + PADX - ZT_HW - PADX, y, s]), FC, OV: over, Wd, Ht };
}
const ZT_WALLC = new Map(), ZT_NB = {};
function ztWallTheme(z) { return z.theme === 'bone' ? 'bone' : z.theme === 'barrow' ? 'barrow' : z.theme === 'fen' ? 'fen' : z.theme === 'moor' ? 'moor' : 'crypt'; }
const ZT_WALLH = { crypt: 88, bone: 88, barrow: 76 };
// the painted block for a wall-like cell; cut: the low stub shown when the hero stands behind it
function ztWallBlock(z, x, y, t, cut) {
  const th = ztWallTheme(z), key = z.id + '|' + x + ',' + y + '|' + t + (cut ? 'c' : ''); let b = ZT_WALLC.get(key); if (b) return b;
  if (ZT_WALLC.size > 6000) ZT_WALLC.clear();
  const hv = hash(x * 5 + 1, y * 9 + 2), wx = (side, a) => side ? (y + 1 - a / ZT_HW) * ZT_HW : (x + a / ZT_HW) * ZT_HW;   // along-face world coordinate, in px
  const isW = (i, j) => { const q = z.get(x + i, y + j); return q === 7 || q === 5 || q === 15; };
  ZT_NB.W = isW(-1, 0); ZT_NB.N = isW(0, -1); ZT_NB.E = isW(1, 0); ZT_NB.S = isW(0, 1);
  if (t === 5 || (t === 7 && (th === 'moor' || th === 'fen'))) b = ztCliff(z, x, y, th, cut, wx);
  else if (t === 15) b = ztRuin(z, x, y, cut, wx, hv);
  else b = ztDungeonWall(z, x, y, th, cut, wx, hv);
  ZT_WALLC.set(key, b); return b;
}
// ------------------------------------------------------------------- the crypt: gothic ashlar, pilasters, niches, a heavy cornice
const ZT_BAY = 54, ZT_PIL = 11;
function ztBayFeature(bay, line, th) {
  const h = hash(bay * 7 + line * 131, line * 17 + 3);
  if (th === 'bone') return h < 0.2 ? 'niche' : h < 0.3 ? 'bars' : 'skulls';
  if (th === 'barrow') return 'none';
  return h < 0.28 ? 'niche' : h < 0.42 ? 'bars' : h < 0.54 ? 'saint' : h < 0.64 ? 'skull' : 'arch';
}
// the lancet: the pointed arch outline used by niches, windows and blind arches. returns >0 inside
const ztLancet = (dx, h, w, h0, h1) => { const ad = Math.abs(dx); if (ad > w || h < h0) return -1; const top = h1 + Math.sqrt(Math.max(0, w * w * 2.2 - (ad + w * 0.5) ** 2)) - w * 0.2; return Math.min(w - ad, h - h0, top - h); };
function ztCryptFace(wa, h, H, line, th, cut) {
  const R = th === 'bone' ? ZWR.bstone : ZWR.crypt, pos = ((wa % ZT_BAY) + ZT_BAY) % ZT_BAY, bay = Math.floor(wa / ZT_BAY);
  const n1 = ztVN(wa / 4, h / 3.5, 351), grime = (h < 30 ? -(30 - h) * 0.006 : 0) + (ztVN(wa / 3, h / 26, 352) > 0.72 ? -0.08 : 0) + (ztFBM(wa / 30, h / 24, 353) - 0.5) * 0.12;
  const pil = pos < ZT_PIL, pedge = pil ? Math.min(pos, ZT_PIL - pos) : 9;
  // the plinth: two heavy courses and a chamfered moulding along its top
  if (h < 14) {
    if (h >= 11) return zw(R, 0.48 + grime + (h === 13 ? 0.12 : 0), 4.4 - (13 - h) * 0.45 + (pil ? 1 : 0));
    const A = zwAsh(wa + 5, h, 5.5, 26, 11 + line);
    if (A.dj < 0.8) return zw(ZWR.mortar, 0.3, 2.4);
    return zw(R, 0.4 + (A.id - 0.5) * 0.12 + (n1 - 0.5) * 0.08 + grime, 3.4 + Math.min(1, (A.dj - 0.8) / 1.4) * 0.8 + (pil ? 1 : 0));
  }
  if (cut) { const A = zwAsh(wa, h - 14, 9, 22, line); return A.dj < 0.8 ? zw(ZWR.mortar, 0.3, 0) : zw(R, 0.44 + (A.id - 0.5) * 0.14 + grime, 1 + Math.min(1, (A.dj - 0.8) / 1.5) * 0.8); }
  // the cornice: dentils, a deep band with a chamfer under it, a parapet with its coping
  const hc = h - (H - 17);
  if (hc >= 0) {
    if (hc < 3) return zw(R, 0.36 + grime, (((wa % 5) + 5) % 5) < 2.6 ? 4.4 : 2.6);
    if (hc < 10) { const A = zwAsh(wa, hc - 3, 7, 30, 71 + line); return A.dj < 0.7 && hc > 4 ? zw(ZWR.mortar, 0.3, 4.6) : zw(R, 0.46 + (A.id - 0.5) * 0.1 + (n1 - 0.5) * 0.08 + (hc === 3 ? -0.14 : hc === 9 ? 0.14 : 0), hc === 3 ? 4.2 : 5.2); }
    const A = zwAsh(wa + 7, hc - 10, 7, 18, 91 + line); return A.dj < 0.7 ? zw(ZWR.mortar, 0.3, 3.2) : zw(R, 0.42 + (A.id - 0.5) * 0.12 + (hc >= 15 ? 0.16 : 0), 4 + Math.min(1, (A.dj - 0.7) / 1.3) * 0.6);
  }
  // pilasters: they stand out of the wall, their own courses, a capital under the cornice
  if (pil) {
    const bev = Math.min(1, pedge / 1.6);
    if (h >= H - 25) return zw(R, 0.5 + (h === H - 18 ? 0.14 : 0) + grime, 4.6 + bev * 0.6 - (h < H - 22 ? (H - 22 - h) * 0.3 : 0));   // the capital
    const A = zwAsh(pos + 3, h - 14, 11, 40, 31 + bay);
    if (A.dj < 0.8) return zw(ZWR.mortar, 0.3, 3);
    return zw(R, 0.45 + (A.id - 0.5) * 0.12 + (n1 - 0.5) * 0.08 + grime, 3.2 + bev * 0.7 + Math.min(1, (A.dj - 0.8) / 1.4) * 0.4);
  }
  // the bay between two pilasters, and whatever is set into it
  const f = ztBayFeature(bay, line, th), dx = pos - (ZT_PIL + (ZT_BAY - ZT_PIL) / 2);
  if (th === 'bone' && f === 'skulls') return ztOssuary2(wa, h, H, line, grime);
  if (f === 'niche' || f === 'bars') {
    const w = f === 'bars' ? 7 : 6, h0 = f === 'bars' ? 32 : 24, h1 = f === 'bars' ? 58 : 48, e = ztLancet(dx, h, w, h0, h1), e2 = ztLancet(dx, h, w + 2, h0 - 2, h1 + 1);
    if (e > 0) {
      if (f === 'bars') { const bx = ((dx + 30) % 3.5); if (bx < 1.2 || Math.abs(h - (h0 + h1) / 2) < 0.8) return zw(ZWR.iron, 0.34 + (bx < 0.6 ? 0.2 : 0), -0.5); return zw(ZWR.mortar, 0.05, -4); }
      // the niche: a deep recess, its back in shadow, the right-hand reveal catching light
      return zw(R, 0.16 + (dx > w - 2.2 ? 0.2 : 0) - (h > h1 - 4 ? 0.06 : 0) + (n1 - 0.5) * 0.06, -3 + (dx > w - 2 ? 1 : 0));
    }
    if (e2 > 0) return zw(R, 0.5 + grime, 2.2);                                                  // the moulding round the opening
    if (h < h0 && h >= h0 - 3 && Math.abs(dx) < w + 3) return zw(R, 0.5 + (h === h0 - 1 ? 0.14 : 0) + grime, 3.4);   // the sill
    if (f === 'bars' && h < h0 - 3 && h > h0 - 18 && Math.abs(dx) < 3 && ztVN(dx / 1.2, h / 5, 361) > 0.45) return zw(ZWR.rust, 0.4, 0.8);   // rust run down from the bars
  }
  if (f === 'saint') {   // a sunken panel with a hooded mourner carved in it
    const pw = 8, p0 = 24, p1 = 64;
    if (Math.abs(dx) < pw && h >= p0 && h < p1) {
      const ad = Math.abs(dx), hy = h - p0, head = ((dx) / 3.2) ** 2 + ((hy - 31) / 3.6) ** 2, hood = (dx / 4.6) ** 2 + ((hy - 31.5) / 5.8) ** 2 < 1 || (ad < 2 && hy > 34 && hy < 38.5 - ad);
      const body = hy < 27 && ad < 3.6 + (27 - hy) * 0.12 + Math.sin(hy * 0.4) * 0.3, hands = hy > 16 && hy < 21 && ad < 2.4;
      if (hood && head < 0.72) return zw(R, 0.08, 0.2);                                              // the face in the hood: black
      if (hood || body) return zw(R, 0.44 + (hands ? 0.1 : 0) + (n1 - 0.5) * 0.06, 1.6 + Math.cos(dx * 1.5) * 0.35 * (body ? 1 : 0) + (hands ? 0.7 : 0) - (hood ? 0 : (27 - hy) * 0.01));
      return zw(R, 0.3 + grime, -1.4);
    }
    if (Math.abs(dx) < pw + 1.5 && h >= p0 - 1.5 && h < p1 + 1.5) return zw(R, 0.48 + grime, 1.8);
  }
  if (f === 'skull') {   // a small round-headed niche, a skull set in it
    const e = ztLancet(dx, h, 4.5, 34, 44);
    if (e > 0) { const sk = ((dx - 0.3) / 3.4) ** 2 + ((h - 38.5) / 3.8) ** 2; if (sk < 1) { const eye = ((Math.abs(dx - 0.3) - 1.4) / 1.1) ** 2 + ((h - 38) / 1.1) ** 2 < 1; return zw(ZWR.ivory, eye ? 0.06 : 0.5, eye ? -1 : 0.5 + Math.sqrt(1 - sk) * 2.4); } return zw(R, 0.12, -2.6); }
    if (ztLancet(dx, h, 6, 32, 45) > 0) return zw(R, 0.5 + grime, 2);
  }
  if (f === 'arch') {   // a blind lancet arcade: only its moulding stands out of the ashlar
    const e = ztLancet(dx, h, 12, 16, 60); if (e > -0.2 && e < 1.6 && h > 16) return zw(R, 0.5 + grime + (e < 0.6 ? 0.08 : 0), 2.6);
  }
  // plain ashlar, big stones, chipped here and there
  const A = zwAsh(wa, h - 14, 10, 24, line);
  if (A.dj < 0.8) return zw(ZWR.mortar, 0.3 + grime, 0);
  const chip = ztVN(wa / 1.8, h / 1.8, 362 + line) > 0.86 && A.dj < 2.6;
  return zw(R, 0.43 + (A.id - 0.5) * 0.14 + (n1 - 0.5) * 0.09 + grime, 1 + Math.min(1, (A.dj - 0.8) / 1.5) * 0.8 + (A.id > 0.82 ? 0.35 : A.id < 0.12 ? -0.3 : 0) - (chip ? 0.9 : 0));
}
// the ossuary: rows of skulls, lit as the domes they are, between courses of packed long-bone ends
function ztOssuary2(wa, h, H, line, grime) {
  const I = ZWR.ivory, h0 = 15, per = 16, row = Math.floor((h - h0) / per), hv = (h - h0) - row * per;
  if (h < h0) return zw(I, 0.3, 0.5);
  if (hv < 4) {   // packed bone ends: little round knobs
    const q = wa + (hv < 2 ? 0 : 1.6) + row * 0.7, k = Math.floor(q / 3.2), s = q - k * 3.2 - 1.6, v = (hv % 2) - 0.5, d = s * s / 1.9 + v * v * 2;
    if (d > 1) return zw(ZWR.mortar, 0.2, 0);
    return zw(I, 0.36 + (hash(k, row * 2 + (hv < 2 ? 0 : 1)) - 0.5) * 0.16 + grime * 0.5, 0.8 + Math.sqrt(1 - d) * 0.7);
  }
  const q = wa + (row & 1) * 5.5, k = Math.floor(q / 11), dx = q - k * 11 - 5.5, dy = hv - 4 - 6, id = hash(k * 3 + row, row * 7 + line);
  const cr = (dx / 4.9) ** 2 + ((dy - 1) / 5.2) ** 2, jaw = (dx / 3) ** 2 + ((dy + 4.2) / 1.8) ** 2;
  if (cr < 1) {
    const eye = ((Math.abs(dx) - 2) / 1.35) ** 2 + ((dy - 0.2) / 1.4) ** 2 < 1, nose = Math.abs(dx) < 0.7 && dy < -1.4 && dy > -3;
    if (eye || nose) return zw(I, 0.05, 0.4);
    return zw(I, 0.58 + (id - 0.5) * 0.16 + grime * 0.6 - (dy < -2 ? 0.08 : 0), 1 + Math.sqrt(1 - cr) * 1.7);
  }
  if (jaw < 1) return zw(I, 0.38 + (id - 0.5) * 0.14 + (((dx + 9) % 1.4) < 0.45 ? -0.18 : 0), 0.9 + Math.sqrt(1 - jaw) * 0.8);
  return zw(ZWR.mortar, 0.22, -0.3);
}
function ztBoneFace(wa, h, H, line, cut) {
  const pos = ((wa % ZT_BAY) + ZT_BAY) % ZT_BAY;
  if (h >= 14 && !cut && pos < ZT_PIL && h < H - 17) {   // pilasters of stacked femurs
    const s = (pos % 3.6) - 1.8, band = ((h - 14) % 12), I = ZWR.ivory;
    if (band < 2.5) { const k = Math.floor(pos / 3.6), d = (s / 1.9) ** 2 + ((band - 1.2) / 1.4) ** 2; return d < 1 ? zw(I, 0.46 + (hash(k, h >> 3) - 0.5) * 0.16, 3.2 + Math.sqrt(1 - d) * 1.4) : zw(ZWR.mortar, 0.2, 2); }
    return Math.abs(s) < 1.2 ? zw(I, 0.4 + (hash(Math.floor(pos / 3.6), 3) - 0.5) * 0.12, 3 + Math.sqrt(1 - (s / 1.3) ** 2) * 0.9) : zw(ZWR.mortar, 0.18, 2.4);
  }
  return ztCryptFace(wa, h, H, line, 'bone', cut);
}
// the barrow: dry-stone walls of fieldstone packed in earth, heavy timber posts, roots hanging from the roof
function ztBarrowFace(wa, h, H, line, cut) {
  const pos = ((wa % 36) + 36) % 36;
  if (pos < 6 && !cut) { const s = pos - 3; return zw(ZWR.wood, 0.42 + (ztVN(pos / 1.2, h / 9, 371 + line) - 0.5) * 0.24 + (h > H - 6 ? 0.1 : 0), 3 + Math.sqrt(Math.max(0, 1 - (s / 3) ** 2)) * 1.4); }
  const v = ztVor(wa, h * 0.5 + line * 37, 10, 211 + line);
  if (v.e < 1.1) return zw(ZWR.earth, 0.24 + ztVN(wa / 3, h / 3, 372) * 0.2, 0);
  const g = (h < 20 ? -(20 - h) * 0.008 : 0);
  return zw(ZWR.field, 0.4 + (v.id - 0.5) * 0.24 + (ztVN(wa / 3, h / 3, 373) - 0.5) * 0.1 + g, Math.sqrt(Math.min(1, (v.e - 1.1) / 2.8)) * 2.4 + 0.4);
}
function ztDungeonWall(z, x, y, th, cut, wx, hv) {
  const H = cut ? 12 : ZT_WALLH[th] || 96, NB = Object.assign({}, ZT_NB);
  const face = (side, a, h, i, Hc) => {
    const wa = wx(side, a), line = side ? x * 3 + 1 : y * 3;
    // the outer corner of a run: quoins, long and short stones by turns
    const corner = (!side && a < 3 && !NB.W) || (side && a > ZT_HW - 4 && !NB.N);
    if (corner && h >= 14 && h < H - 17 && th !== 'barrow') { const R = th === 'bone' ? ZWR.bstone : ZWR.crypt, c = Math.floor((h - 14) / 10), hv2 = (h - 14) % 10; if (hv2 < 0.8) return zw(ZWR.mortar, 0.3, 2); return zw(R, 0.5 + (hash(c, x + y) - 0.5) * 0.12 + (side ? -0.04 : 0.06), 3 + Math.min(1, hv2 / 1.5) * 0.5); }
    if (th === 'barrow') return ztBarrowFace(wa, h, H, line, cut);
    if (th === 'bone') return ztBoneFace(wa, h, H, line, cut);
    return ztCryptFace(wa, h, H, line, th, cut);
  };
  const R = th === 'bone' ? ZWR.bstone : th === 'barrow' ? ZWR.earth : ZWR.crypt;
  // the top of the wall: coping slabs, dark, their front edges lit
  const cap = (i, j) => {
    const X = (x - y) * ZT_HW - ZT_HW + i, Y = (x + y) * ZT_HH + j, left = i < ZT_HW;
    if (th === 'barrow') { const bL = left && ZT_BOT[i] === j && !NB.S, bR = !left && ZT_BOT[i] === j && !NB.E, v = ztVor(X, Y, 7, 381); if (ztFBM(X / 9, Y / 5, 384) > 0.55 && v.e > 0.8) return zw(ZWR.moss, 0.36 + ztVN(X / 2, Y / 2, 385) * 0.2, 0.8); return zw(v.e < 0.9 ? ZWR.earth : ZWR.field, (v.e < 0.9 ? 0.25 : 0.34 + (v.id - 0.5) * 0.2) + (bL ? 0.24 : bR ? 0.1 : 0), v.e < 0.9 ? 0 : Math.min(1, v.e / 2)); }
    // coping stones along the open edges: the front ones proud and lit, a few broken off; rubble, dust and moss between
    const dF = ZT_BOT[i] - j, dB = j - ZT_TOPR[i], openF = left ? !NB.S : !NB.E, openB = left ? !NB.W : !NB.N;
    const cope = (d, front) => {
      const q = left === front ? X : -X, blk = Math.floor((q + 40) / 8), bq = ((q + 40) % 8 + 8) % 8, id = hash(blk * 7 + (front ? 1 : 3), (left ? x : y) * 13 + line0);
      if (id < 0.16) return null;                                                                                  // a coping stone gone
      const dj = Math.min(bq, 8 - bq, d + 0.5, 3.5 - d); if (dj < 0.7) return zw(ZWR.mortar, 0.3, 1.4);
      return zw(R, (front ? 0.5 : 0.38) + (id - 0.5) * 0.12 + (ztVN(X / 3, Y / 2, 386) - 0.5) * 0.08, 2 + Math.min(1, dj / 1.2) * 0.6);
    };
    const line0 = th === 'bone' ? 7 : 3;
    if (openF && dF < 4) { const c = cope(dF, true); if (c) return c; }
    if (openB && dB < 3) { const c = cope(dB, false); if (c) return c; }
    if (ztFBM(X / 11 + 5, Y / 6, 387) > 0.58) return zw(ZWR.moss, 0.3 + ztVN(X / 2, Y / 1.5, 388) * 0.26, 0.9 + ztVN(X / 3, Y / 2, 389) * 0.6);
    const v = ztVor(X, Y, 5, 382);
    if (v.e < 0.7) return zw(ZWR.earth, 0.18, 0);
    return zw(R, 0.28 + (v.id - 0.5) * 0.18, Math.min(1, v.e / 1.3) * 0.9 + v.id * 0.4);
  };
  const deco = cut ? (put, get) => ztRubble2(put, get, x, y, R) : (put, get, y0, fl) => {
    // candles on the sills of the niches in this cell, their flames drawn live
    if (th !== 'barrow') for (const side of [0, 1]) {
      const line = side ? x * 3 + 1 : y * 3, w0 = wx(side, 0), w1 = wx(side, ZT_HW - 1), lo = Math.min(w0, w1), hi = Math.max(w0, w1);
      for (let bay = Math.floor(lo / ZT_BAY) - 1; bay <= Math.floor(hi / ZT_BAY) + 1; bay++) {
        if (ztBayFeature(bay, line, th) !== 'niche') continue;
        const cw = bay * ZT_BAY + ZT_PIL + (ZT_BAY - ZT_PIL) / 2;
        for (let k = -1; k <= 1; k++) {
          const wc = cw + k * 3.2 + 0.5, a = side ? Math.round((y + 1) * ZT_HW - wc) : Math.round(wc - x * ZT_HW); if (a < 0 || a >= ZT_HW) continue;
          const i = side ? ZT_HW + a : a, hh = 4 + ((hash(bay * 3 + k, line) * 4) | 0), base = ZT_BOT[i] - 24;
          if (hash(bay + k * 5, line * 7) < 0.2) continue;
          for (let q = 0; q < hh; q++) { put(i, base - q, ZWR.wax[q === hh - 1 ? 6 : 4]); put(i + 1, base - q + (side ? -0.5 : 0.5) | 0, ZWR.wax[q > hh - 3 ? 3 : 2]); }
          put(i, base - hh, [26, 16, 12]); put(i - 1, base - 1, ZWR.wax[5]); put(i + 2, base, ZWR.wax[3]);   // wick, a drip, the pooled wax
          if (hash(bay * 7 + k, line + 3) < 0.8) fl.push([i + 0.5, base - hh - 1, 1]);
        }
      }
    }
    if (th !== 'barrow' && hash(x * 29 + 3, y * 31 + 5) < 0.09) {   // candles left burning on the wall top
      const R0 = mulberry32(x * 131 + y), n = 2 + (R0() * 3 | 0);
      for (let k = 0; k < n; k++) { const i = ZT_HW - 6 + Math.round(R0() * 12), jj = -H + 6 + Math.round(R0() * 6), hh = 3 + (R0() * 5 | 0); for (let q = 0; q < hh; q++) { put(i, jj - q, ZWR.wax[q === hh - 1 ? 6 : 4]); put(i + 1, jj - q, ZWR.wax[2]); } put(i, jj - hh, [26, 16, 12]); put(i - 1, jj, ZWR.wax[5]); put(i + 2, jj + 1, ZWR.wax[3]); if (R0() < 0.85) fl.push([i + 0.5, jj - hh - 1, 1]); }
    }
    if (th !== 'bone' && hash(x * 3, y * 11) < 0.2) ztDrip2(put, get, x, y, H);
    if (th === 'barrow' && hash(x * 13 + 7, y * 7 + 3) < 0.45) ztRoots2(put, get, x, y, H);
  };
  return ztBlock2({ H, face, cap, deco, nbW: NB.W, nbN: NB.N });
}
function ztRubble2(put, get, x, y, R) {
  for (let k = 0; k < 7; k++) { const i = 3 + (hash(x * 7 + k, y * 3) * (TW - 7) | 0), yy = -12 + ZT_TOPR[i] + (hash(x + k, y * 5 + k) * 6 | 0), w = 3 + (k % 2); for (let a = 0; a < w; a++) { put(i + a, yy - 1, R[Math.min(R.length - 1, a === 0 ? 8 : 6)]); put(i + a, yy, R[a === 0 ? 6 : 4]); put(i + a, yy + 1, R[2]); } put(i - 1, yy, R[1]); put(i + w, yy + 1, R[1]); }
}
function ztDrip2(put, get, x, y, H) {
  const i = 3 + (hash(x * 7, y * 3) * (TW - 6) | 0), top = -H + ZT_BOT[i] + 18, L = 10 + (hash(x, y * 7) * 30 | 0), red = hash(y, x * 5) < 0.4, R = red ? ZWR.red : ZWR.moss;
  for (let k = 0; k < L; k++) { const yy = top + k; if (!get(i, yy)) continue; put(i, yy, R[k < 3 ? 4 : k > L - 3 ? 2 : 3]); if (k < L * 0.6 && get(i + 1, yy)) put(i + 1, yy, R[1]); }
}
function ztRoots2(put, get, x, y, H) {
  for (let r = 0; r < 3; r++) { let i = 2 + (hash(x * 3 + r, y) * (TW - 4) | 0); const top = -H + ZT_BOT[i] + 1, L = 8 + (hash(x, y + r * 7) * 26 | 0); for (let k = 0; k < L; k++) { const yy = top + k; if (k > 0 && hash(k + r, x) < 0.25) i += hash(y, k) < 0.5 ? 1 : -1; if (!get(i, yy)) continue; put(i, yy, ZWR.wood[k < 3 ? 7 : 5]); put(i + 1, yy, ZWR.wood[1]); if (k === L - 1) put(i, yy + 1, ZWR.wood[3]); } }
}
// cliffs: raw stone in ledges, each ledge lit on its top, overhangs dark, fissures, boulders; the heath goes on above
function ztCliff(z, x, y, th, cut, wx) {
  const R = th === 'fen' ? ZWR.cliffF : ZWR.cliff, H = cut ? 12 : 64, NB = Object.assign({}, ZT_NB);
  const face = (side, a, h, i, Hc) => {
    const wa = wx(side, a), n = ztVN(wa / 14, h / 7, 303), sd = h + n * 9 + ztVN(wa / 5, 1, 304) * 3, band = Math.floor(sd / 11), bv = (sd - band * 11) * 8 / 11;
    if (Math.abs(ztVN(wa / 5, h / 11, 305) - 0.5) < 0.035) return zw(R, 0.08, -1.4);                  // fissures
    const bl = ztVor(wa, h + band * 3, 14, 308 + band);
    let rel = bv / 8 * 2.2 + (bl.e > 1 && bl.id > 0.82 ? Math.sqrt(Math.min(1, (bl.e - 1) / 3)) * 1.6 : 0), al = 0.44 + (hash(band, 77) - 0.5) * 0.14 + (ztVN(wa / 3, h / 3, 306) - 0.5) * 0.12 - (h < 10 ? (10 - h) * 0.012 : 0);
    if (th === 'fen' && ztFBM(wa / 14, h / 7, 307) > (h > H - 10 ? 0.5 : 0.63)) return zw(ZWR.moss, 0.36 + (bv > 5 ? 0.14 : 0) + (ztVN(wa / 2, h / 2, 309) - 0.5) * 0.2, rel + 0.6);
    if (bv > 6.8 && ztVN(wa / 9, band, 310) > 0.55) return zw(th === 'fen' ? ZWR.moss : ZWR.earth, 0.42, rel + 0.3);   // dust and moss on the ledges
    return zw(R, al, rel);
  };
  const gc = th === 'fen' ? ZT_G.FEN : ZT_G.MOOR;
  const cap = (i, j) => { const X = (x - y) * ZT_HW - ZT_HW + i, Y = (x + y) * ZT_HH + j; ztGS(gc, X, Y); const eL = i < ZT_HW && ZT_BOT[i] === j && !NB.S, eR = i >= ZT_HW && ZT_BOT[i] === j && !NB.E; if (eL || eR) return zw(R, eL ? 0.72 : 0.5, 1); return zw(ZGR[ZG.R], ZG.A * 0.85, ZG.H); };
  return ztBlock2({ H, HM: H + 2, face, cap, nbW: NB.W, nbN: NB.N, deco: cut ? (put, get) => ztRubble2(put, get, x, y, R) : (put, get) => ztCrest2(put, get, x, y, H, th) });
}
function ztCrest2(put, get, x, y, H, th) {
  const G = th === 'fen' ? ZDC.fgrass : ZDC.grass, R = th === 'fen' ? ZWR.cliffF : ZWR.cliff;
  for (let i = 1; i < TW - 1; i++) {
    const top = -H + ZT_BOT[i] + 1, n = hash(x * TW + i, y * 7);
    if (n < 0.3) { const L = 2 + (n * 20 | 0) % 5; for (let k = 0; k < L; k++) if (get(i, top + k)) put(i, top + k, G[k === 0 ? 6 : k < 2 ? 4 : 2]); }   // grass spilling over the lip
    else if (n > 0.95) { for (let k = 0; k < 8; k++) if (get(i, top + k)) { put(i + (k > 4 ? 1 : 0), top + k, ZWR.wood[k < 2 ? 6 : 3]); } }   // a root
  }
  for (let k = 0; k < 2; k++) { const n = hash(x * 3 + k, y * 7 + k); if (n > 0.4) continue; const i = 4 + (n * 2.5 * (TW - 10) | 0), top = -H + ZT_BOT[i] - 1, w = 4 + (k % 2) * 2; for (let j = -2; j <= 1; j++) for (let q = 0; q < w; q++) { if ((j === -2 || j === 1) && (q === 0 || q === w - 1)) continue; put(i + q, top + j, R[j === -2 ? 9 : j === 1 ? 2 : q < 2 ? 7 : 5]); } put(i + w, top + 1, R[1]); }
}
// chapel ruins: pale weathered ashlar, a broken jagged top, moss in the joints and on the ledges
function ztRuin(z, x, y, cut, wx, hv) {
  const R = ZWR.ruin, base = cut ? 12 : 30 + (hash(x * 3, y * 5) * 4 | 0) * 11;
  const colH = i => { const side = i < ZT_HW ? 0 : 1, wa = wx(side, side ? i - ZT_HW : i); return cut ? 12 : Math.max(10, base + (ztVN(wa / 6, 9, 311) - 0.5) * 34 + ((wa | 0) % 7 < 1 ? -3 : 0)); };
  const face = (side, a, h, i, Hc) => {
    const wa = wx(side, a), n1 = ztVN(wa / 4, h / 3.5, 315);
    if (h > Hc - 3) return zw(R, 0.62 + (h === Hc - 1 ? 0.12 : 0), 2.4);                                   // the broken top, weathered pale
    if (h < 8) { const A = zwAsh(wa + 4, h, 8, 26, 7); return A.dj < 0.8 ? zw(ZWR.mortar, 0.3, 2) : zw(R, 0.4 + (A.id - 0.5) * 0.12 - (8 - h) * 0.02, 3 + Math.min(1, A.dj / 1.5) * 0.6); }
    const A = zwAsh(wa, h - 8, 9, 22, x + y);
    if (A.dj < 0.8) return ztVN(wa / 5, h / 5, 312) > 0.55 ? zw(ZWR.moss, 0.4 + (n1 - 0.5) * 0.2, 0.4) : zw(ZWR.mortar, 0.3, 0);
    if (ztVN(wa / 5, h / 4, 313) > 0.72 && A.dj < 3) return zw(ZWR.moss, 0.36 + (n1 - 0.5) * 0.24, 1.4);
    return zw(R, 0.46 + (A.id - 0.5) * 0.16 + (n1 - 0.5) * 0.1 - (h < 18 ? (18 - h) * 0.008 : 0), 1 + Math.min(1, (A.dj - 0.8) / 1.5) * 0.8 + (A.id > 0.85 ? 0.4 : 0));
  };
  return ztBlock2({ H: base + 18, HM: base + 20, colH, face, deco: (put, get) => { ztRubble2(put, get, x, y, R); } });
}
// the palisade: sharpened logs along the fence line, wood grain, rope lashing, now and then a skull on a stake
const ZT_STAKE = new Map();
function ztPalisade(z, x, y, cut) {
  const key = z.id + '|' + x + ',' + y + (cut ? 'c' : ''); let b = ZT_STAKE.get(key); if (b) return b;
  const P = t => z.get(x + t[0], y + t[1]) === 10, alongX = P([1, 0]) || P([-1, 0]), alongY = P([0, 1]) || P([0, -1]);
  const Wd = 36, Ht = 64, oy = 50, ox = 18, A = ZSc(Wd, Ht, GRAIN);
  const posts = [];
  const line = (dx, dy) => { for (let k = 0; k < 4; k++) { const t = (k + 0.5) / 4 - 0.5, wx0 = 0.5 + dx * t, wy0 = 0.5 + dy * t; posts.push([wx0, wy0]); } };
  if (alongX || !alongY) line(1, 0); if (alongY) line(0, 1);
  posts.sort((a, b) => a[0] + a[1] - b[0] - b[1]);
  pmat('ztWood', ['#120c08', '#2d1e12', '#4d341f', '#6e4c2e', '#946c46']);
  pmat('ztWoodD', ['#0e0906', '#22170e', '#3a2818', '#553a24', '#6e4c2e']);
  pmat('ztRope', ['#1a140c', '#3a2e1e', '#5e4c32', '#84704c', '#a8946a']);
  pmat('ztSkull', ['#2a2418', '#6a6250', '#a89c80', '#d6cab0', '#f4ecd8']);
  const tops = [];
  posts.forEach(([wx0, wy0], k) => {
    const sx = ox + (wx0 - wy0) * 12, sy = oy + (wx0 + wy0) * 6, hh = cut ? 6 + hash(x + k, y) * 3 : 30 + hash(x * 7 + k, y * 3 + k) * 10, r = 2.2 + hash(k, x + y) * 0.6, lean = (hash(x + k * 3, y) - 0.5) * 2;
    const mat = hash(k * 5, x * y + 1) < 0.35 ? 'ztWoodD' : 'ztWood';
    A.limb([[sx, sy], [sx + lean, sy - hh]], r, r * 0.95, mat, { band: 2 });
    if (!cut) A.poly([[sx + lean - r, sy - hh + 1], [sx + lean + r, sy - hh + 1], [sx + lean + 0.3, sy - hh - 5 - hash(k, y) * 2]], mat, {});
    tops.push([sx + lean, sy - hh, r, mat]);
  });
  // lashing across the posts
  if (!cut) for (const hy of [8, 22]) { const pts = posts.map(([a, b2]) => [ox + (a - b2) * 12, oy + (a + b2) * 6 - hy]); if (pts.length > 1) A.limb(pts, 0.8, 0.8, 'ztRope', { hi: false }); }
  // grain, nails, and the odd skull
  tops.forEach(([tx, ty, r], k) => {
    if (cut) { A.px(tx - 1, ty, '#946c46'); A.px(tx, ty, '#6e4c2e'); A.px(tx + 1, ty, '#2d1e12'); return; }
    if (hash(x * 3 + k, y * 11) < 0.12) { const S = ['.1331.', '134431', '300403', '334433', '.3033.']; for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) { const ch = S[j][i]; if (ch !== '.') A.px(tx - 3 + i, ty - 9 + j, ['#1e1818', '#4a3f36', '#76674f', '#a2916f', '#c4b28c'][+ch]); } A.px(tx - 1, ty - 4, '#4a0e12'); A.px(tx, ty - 3, '#6e1418'); A.px(tx, ty - 2, '#4a0e12'); }
    else if (hash(x + k * 7, y * 3) < 0.08) { for (let j = 0; j < 7; j++) { A.px(tx + 1 + (j > 3 ? 1 : 0), ty + 3 + j, j % 3 ? '#5a4a3a' : '#3a2e24'); A.px(tx + 2 + (j > 3 ? 1 : 0), ty + 4 + j, '#2a221a'); } }
  });
  b = { c: A.render(), ox: Math.round(ox * GRAIN), oy: Math.round(oy * GRAIN) }; ZT_STAKE.set(key, b); return b;
}
// a carved column: an iso plinth, a fluted shaft, a capital; broken off in the open
const ZT_PILLAR = {};
function ztPillar(z, x, y) {
  const th = ztWallTheme(z), out = th === 'moor' || th === 'fen', v = (hash(x * 3, y * 7) * 3) | 0, key = th + v; if (ZT_PILLAR[key]) return ZT_PILLAR[key];
  const mat = out ? 'zStone' : th === 'bone' || th === 'barrow' ? 'zStoneW' : 'zStoneV', shaftH = out ? [34, 46, 24][v] : 58, A = ZSc(32, 84, 1), cx = 16, fy = 72;
  A.box(cx, fy + 1, 2.8, 2.8, 4, mat, { tone: -0.2 }); A.box(cx, fy - 3, 2.2, 2.2, 3, mat, {});
  const top = fy - 6 - shaftH;
  A.cyl(cx, fy - 5, top, 5, mat, { cap: false });
  for (const dx of [-3.4, -1.2, 1.2, 3.4]) A.line(cx + dx, top + 2, cx + dx, fy - 7, A.mt(mat, dx < 0 ? 0.32 : 0.1));   // flutes
  if (!out || v === 1) { A.box(cx, top + 1, 2.3, 2.3, 2.5, mat, { tone: 0.1 }); A.box(cx, top - 1.5, 2.9, 2.9, 2.6, mat, { tone: 0.2 }); }
  else {
    const R = mulberry32(v * 9 + 1), pts = [[cx - 5, top + 3]]; for (let i = -4; i <= 4; i += 2) pts.push([cx + i, top - 1 + R() * 6]); pts.push([cx + 5, top + 3], [cx + 5, top + 5], [cx - 5, top + 5]);
    A.poly(pts, mat, { n: ZS_NUP, tone: 0.2 });
    for (let k = 0; k < 5; k++) A.ell(cx - 4 + R() * 3, top + 8 + k * 6 + R() * 3, 1.4, 1.1, 'zMoss', { dome: 0.6 });
    A.ell(cx + 9, fy + 1, 3, 1.8, mat, {}); A.ell(cx - 8, fy + 2, 2.2, 1.3, mat, { tone: -0.3 });
  }
  return (ZT_PILLAR[key] = { c: A.render(), ox: cx, oy: fy });
}
// boulders: heaped, cracked, mossy
const ZT_ROCK = {};
function ztRock(z, x, y) {
  const th = ztWallTheme(z), v = (hash(x * 11, y * 5) * 4) | 0, key = th + v; if (ZT_ROCK[key]) return ZT_ROCK[key];
  pmat('ztStone', th === 'fen' ? ['#101412', '#262c26', '#3e463c', '#5a6254', '#7c806e'] : ['#121114', '#2c2a2c', '#46423f', '#686058', '#8e8476']);
  pmat('ztStoneD', th === 'fen' ? ['#0c100e', '#1c221c', '#2e362e', '#444c40', '#5a6254'] : ['#0e0d10', '#222022', '#363330', '#4e4943', '#686058']);
  const A = ZSc(34, 30, GRAIN), rng = mulberry32(v * 71 + 3);
  if (v === 0) { A.ell(15, 20, 12, 8, 'ztStoneD', { band: 2 }); A.ell(19, 16, 9, 8, 'ztStone', { band: 2 }); }
  else if (v === 1) { A.poly([[4, 25], [8, 12], [16, 6], [26, 9], [30, 22], [24, 27], [10, 27]], 'ztStone', { band: 3 }); A.poly([[16, 6], [20, 14], [30, 22]], 'ztStoneD', { flat: true, contour: true }); }
  else if (v === 2) { A.ell(10, 22, 7, 5, 'ztStoneD', {}); A.ell(22, 21, 8, 6, 'ztStone', { band: 2 }); A.ell(16, 14, 7, 6, 'ztStone', { band: 2 }); }
  else { A.poly([[3, 26], [6, 16], [13, 9], [23, 10], [31, 18], [30, 26]], 'ztStoneD', { band: 2 }); A.poly([[9, 17], [14, 11], [22, 12], [26, 19], [16, 22]], 'ztStone', { band: 2 }); }
  for (let k = 0; k < 10; k++) { const i = 8 + rng() * 18, j = 8 + rng() * 8; A.px(i, j, rng() < 0.5 ? '#2e3a24' : '#3e4c2c'); }
  return (ZT_ROCK[key] = { c: A.render(), ox: Math.round(17 * GRAIN), oy: Math.round(22 * GRAIN) });
}
// ------------------------------------------------------------------- drawing a wall-like cell, with the cutaway
function ztHeroNear(sx, sy, w, h) {
  if (!P || P.dead) return false;
  const p = iso(P.x, P.y); return p.sx > sx - w - 10 && p.sx < sx + w + 10 && p.sy - 44 < sy + 12 && p.sy > sy - h - 6;
}
// does the hero's figure overlap this screen rect?
function ztHeroOver(X, Y, w, h) { if (!P || P.dead) return false; const q = iso(P.x, P.y); return q.sx + 10 > X && q.sx - 10 < X + w && q.sy > Y + 4 && q.sy - 44 < Y + h; }
// the candle flames on wall blocks drawn this frame, for the lighting pass: key 'x,y' -> { x, y, t, pts: [[dx, dy]] }
// where (dx, dy) is the flame's offset in screen pixels from iso(x, y) and t is G.time of the frame it was drawn
const ZT_WALL_LIGHTS = new Map();
function ztDrawWall(x, y, t, z) {
  const a = iso(x, y), sx = Math.round(a.sx), sy = Math.round(a.sy);
  const behind = P && !P.dead && P.x + P.y < x + y + 1 && t !== 3;
  let b;
  if (t === 10) b = ztPalisade(z, x, y, behind && ztHeroNear(sx, sy, 27, 66));
  else if (t === 9) b = ztPillar(z, x, y);
  else if (t === 3) b = ztRock(z, x, y);
  else b = ztWallBlock(z, x, y, t, behind && ztHeroNear(sx, sy, 24, t === 7 ? (ZT_WALLH[ztWallTheme(z)] || 96) - 6 : 70));
  const X = sx - b.ox, Y = sy - b.oy + (t === 3 || t === 9 ? 9 : 0);
  if (t === 9 && behind && ztHeroOver(X + 6, Y, b.c.width - 12, b.c.height - 8)) ctx.globalAlpha = 0.45;
  ctx.drawImage(b.c, X, Y);
  ctx.globalAlpha = 1;
  if (b.fl && b.fl.length) {
    for (const [fx, fy, fs] of b.fl) ztCandleFlame(sx + fx, sy + fy, x * 7 + y * 13 + fx);
    const k = x + ',' + y; let e = ZT_WALL_LIGHTS.get(k); if (!e) { e = { x, y, t: 0, pts: b.fl.map(q => [q[0], q[1]]) }; ZT_WALL_LIGHTS.set(k, e); } e.t = G.time; e.pts = b.fl.map(q => [q[0], q[1]]);
    if (ZT_WALL_LIGHTS.size > 400) for (const [kk, ee] of ZT_WALL_LIGHTS) if (G.time - ee.t > 1) ZT_WALL_LIGHTS.delete(kk);
  }
}
// =================================================================== trees of the god-corpse: dead, gnarled, grotesque
pmat('ztBark', ['#0b0807', '#1c1511', '#31261d', '#48392b', '#62503c']);
pmat('ztBarkB', ['#15120f', '#383128', '#5e5647', '#8a7f6b', '#b4aa94']);      // bleached, bone-pale
pmat('ztBarkC', ['#050404', '#120f0e', '#211b18', '#322925', '#463a33']);      // charred
pmat('ztBarkF', ['#080a08', '#171b16', '#272e25', '#3a4336', '#4f5a48']);      // fen, wet and green-black
pmat('ztRagR', ['#1a0608', '#3e0e12', '#62181c', '#86282a', '#a43c34']);
pmat('ztRagW', ['#2a2418', '#5e5646', '#8e8470', '#b8ad94', '#d8ceb4']);
pmat('ztBell', ['#2a1a06', '#6a4410', '#a8741e', '#d8a83a', '#fff0a0']);
pmat('ztRopeT', ['#1a140c', '#3a2e1e', '#5e4c32', '#84704c', '#a8946a']);
const ZT_TREE = {};
// seeds >= 10 paint a fen version of the small kinds
// kinds: 0 great oak, 1 reaching hand, 2 pilgrim tree (rags and bells), 3 gallows lean, 4 rib tree, 5 split/charred, 6 thorn crown,
//        fen: 7 drowned willow, 8 stilt roots, 9 bog cypress
const ZT_TREE_SIZE = [[120, 150], [92, 118], [100, 124], [96, 112], [86, 136], [80, 104], [70, 78], [110, 128], [96, 116], [70, 140], [40, 56], [56, 80], [90, 40], [70, 36]];
function ztTreeFrame(kind, seed) {
  const key = kind + '|' + seed; if (ZT_TREE[key]) return ZT_TREE[key];
  const Wd = ZT_TREE_SIZE[kind][0] + 60, Ht = ZT_TREE_SIZE[kind][1] + 50, A = ZSc(Wd, Ht, ZT_TREE_S), rng = mulberry32(seed * 7717 + kind * 131 + 9), R = (a, b) => a + rng() * (b - a);
  const ox = Math.round(Wd / 2), oy = Ht - 7, fen = kind >= 7;
  const burls = (tr, r, n) => { for (let k = 0; k < n; k++) { const q = tr[1 + ((k * 2 + seed) % Math.max(1, tr.length - 2))], s = k % 2 ? 1 : -1; A.ell(q[0] + s * r * 0.75, q[1] + R(-3, 3), r * 0.45, r * 0.55, bark, { tone: s > 0 ? -1 : 0, dome: 0.45 }); } };
  const bark = kind === 5 ? 'zBarkC' : (fen || seed >= 10) ? 'zBarkF' : (kind === 4 || (kind === 1 && seed % 2)) ? 'zBarkB' : 'zBark';
  const tips = [], grain = [];
  // a wandering path from (x, y) along angle a
  const path = (x, y, a, L, n, bend) => { const pts = [[x, y]]; for (let i = 1; i <= n; i++) { a += R(-bend, bend); x += Math.cos(a) * L / n; y += Math.sin(a) * L / n; pts.push([x, y]); } return pts; };
  const limb = (pts, r0, r1, tone) => { A.limb(pts, r0, r1, bark, { tone: tone || 0, band: r0 > 3 ? 2 : 1 }); if (r0 >= 2.5) grain.push([pts, r0, r1]); };
  // recursive clawing branch
  const branch = (x, y, a, L, r, d, tone, spread = 0.55, up = 0.22) => {
    const pts = path(x, y, a, L, 3, 0.35); limb(pts, r, Math.max(0.6, r * 0.55), tone);
    const [ex, ey] = pts[pts.length - 1];
    if (d <= 0 || L < 5) { tips.push([ex, ey]); return; }
    const na = a + (-Math.PI / 2 - a) * up;
    branch(ex, ey, na - R(spread * 0.6, spread), L * R(0.55, 0.75), Math.max(0.6, r * 0.6), d - 1, tone, spread, up);
    branch(ex, ey, na + R(spread * 0.6, spread), L * R(0.5, 0.72), Math.max(0.6, r * 0.55), d - 1, tone, spread, up);
    if (rng() < 0.3) { const [mx, my] = pts[1]; branch(mx, my, a + (rng() < 0.5 ? -1 : 1) * R(0.8, 1.3), L * 0.4, Math.max(0.6, r * 0.45), d - 2, tone, spread, up); }
  };
  const roots = (n, r, spanX) => {
    for (let i = 0; i < n; i++) {
      const s = (i / (n - 1)) * 2 - 1, far = Math.abs(s) < 0.4 && i % 2, ex = ox + s * spanX + R(-2, 2), ey = oy + (far ? -2 : 1);
      A.limb([[ox + s * 3, oy - 6], [ox + s * spanX * 0.6, oy - 1 + (far ? -2 : 0)], [ex, ey]], r, 0.8, bark, { tone: far ? -1 : 0 });
      // v0.35: the roots fork and go into the ground: a side rootlet, a dark seam where the root meets the earth, a heave of soil
      if (!far && r >= 2) { const mx = ox + s * spanX * 0.6, my = oy - 1; A.limb([[mx, my], [mx + s * R(3, 6), my + R(2, 4)]], r * 0.45, 0.5, bark, { tone: -1 }); }
      A.px(ex + (s < 0 ? -1 : 1), ey + 1, '#0b0807'); A.px(ex, ey + 2, '#1e1712'); A.px(ex + (s < 0 ? -2 : 2), ey + 2, '#30251c'); A.px(ex + (s < 0 ? -1 : 1), ey + 3, '#443428');
    }
    for (let k = -2; k <= 2; k++) A.px(ox + k * 2, oy + 2 + (k & 1), k & 1 ? '#1e1712' : '#0d0a09');
  };
  if (kind === 0) {
    // the great oak: a massive twisted bole, a hollow, a crown of clawing limbs
    for (let k = 0; k < 3; k++) branch(ox + R(-6, 6), oy - R(60, 80), -Math.PI / 2 + R(-1.2, 1.2), R(24, 34), 3.2, 3, -1, 0.6, 0.15);
    roots(6, 4.5, 26);
    const tr = path(ox, oy - 2, -Math.PI / 2, 78, 6, 0.18); A.limb(tr, 13, 6, bark, { band: 3 }); grain.push([tr, 13, 6]); burls(tr, 11, 4);
    const top = tr[tr.length - 1];
    branch(top[0], top[1], -Math.PI / 2 - 0.9, R(30, 38), 5, 3, 0, 0.6, 0.2); branch(top[0], top[1], -Math.PI / 2 + 0.8, R(30, 38), 5, 3, 0, 0.6, 0.2);
    branch(tr[3][0], tr[3][1], -Math.PI + 0.35, R(26, 32), 4, 2, 0, 0.6, 0.35); branch(tr[3][0], tr[3][1], -0.3, R(24, 30), 3.6, 2, 0, 0.6, 0.35);
    branch(top[0], top[1], -Math.PI / 2 + R(-0.2, 0.2), R(26, 30), 4, 3, 0, 0.5, 0.1);
    A.ell(ox + 1, oy - 28, 3.2, 6, '#050404', { flat: true, contour: false }); A.px(ox, oy - 33, '#1c1511'); A.px(ox + 2, oy - 24, '#48392b');
  } else if (kind === 1) {
    // the reaching hand: a wrist of a trunk, a palm knot, five long jointed fingers curling in at the tips
    roots(5, 3.5, 18);
    const tr = path(ox, oy - 2, -Math.PI / 2 + R(-0.15, 0.15), 44, 4, 0.1); A.limb(tr, 7, 6, bark, { band: 3 }); grain.push([tr, 7, 6]);
    const [px0, py0] = tr[tr.length - 1]; A.ell(px0, py0 - 3, 9, 7, bark, { band: 2 });
    const fa = [-2.75, -2.2, -1.62, -1.05, -0.5].map(a => a + R(-0.12, 0.12)), order = [0, 4, 1, 3, 2];
    order.forEach(f => {
      const a0 = fa[f], L = [40, 54, 60, 54, 42][f] * R(0.85, 1.15), inw = f < 2 ? 1 : f > 2 ? -1 : (seed % 2 ? 1 : -1); let x = px0 + Math.cos(a0) * 7, y = py0 - 3 + Math.sin(a0) * 5, a = a0; const pts = [[x, y]];
      for (let s = 0; s < 4; s++) { const l = L * [0.34, 0.28, 0.22, 0.16][s]; x += Math.cos(a) * l; y += Math.sin(a) * l; pts.push([x, y]); a += inw * [0.12, 0.3, 0.55, 0.8][s] + R(-0.1, 0.1); }
      const far = f === 0 || f === 4 ? -1 : 0;
      A.limb(pts, 3.2, 0.7, bark, { tone: far });
      for (let s = 1; s < 3; s++) { A.ell(pts[s][0], pts[s][1], 2.8 - s * 0.4, 2.4 - s * 0.3, bark, { tone: far }); if (rng() < 0.5) branch(pts[s][0], pts[s][1], a0 - inw * R(0.6, 1), R(6, 10), 0.9, 0, far); }
      tips.push(pts[4]);
    });
    // the thumb, low on the wrist
    A.limb([[tr[2][0] - 3, tr[2][1]], [tr[2][0] - 14, tr[2][1] - 8], [tr[2][0] - 18, tr[2][1] - 18]], 3, 1.2, bark, { tone: -1 });
  } else if (kind === 2 || kind === 3) {
    // the pilgrim tree (rags, bells, prayer strings) and the gallows lean (a noose, a broken top)
    const lean = kind === 3 ? 0.42 * (seed % 2 ? 1 : -1) : R(-0.12, 0.12);
    roots(5, 3.5, 20);
    const tr = path(ox, oy - 2, -Math.PI / 2 + lean, kind === 3 ? 70 : 62, 5, 0.12); A.limb(tr, 8, 4, bark, { band: 3 }); grain.push([tr, 8, 4]); burls(tr, 7, 2);
    const top = tr[tr.length - 1];
    for (let k = 0; k < 2; k++) branch(tr[2 + k][0], tr[2 + k][1], -Math.PI / 2 + (k ? 0.9 : -0.9) + lean, R(20, 28), 2.4, 2, -1, 0.5, 0.25);
    branch(top[0], top[1], -Math.PI / 2 - 0.7 + lean, R(22, 30), 3.4, 3, 0, 0.55, 0.2); branch(top[0], top[1], -Math.PI / 2 + 0.6 + lean, R(22, 30), 3.4, 3, 0, 0.55, 0.2);
    if (kind === 3) { // a long arm out to the side with a noose on it
      const side = lean > 0 ? 1 : -1, arm = [[tr[3][0], tr[3][1]], [tr[3][0] + side * 16, tr[3][1] - 4], [tr[3][0] + side * 30, tr[3][1] - 2]];
      A.limb(arm, 3.2, 1.6, bark, {}); const [nx, ny] = [arm[2][0] - side * 3, arm[2][1] + 1];
      A.limb([[nx, ny], [nx, ny + 16]], 0.6, 0.6, 'ztRopeT', { contour: false }); A.ell(nx, ny + 20, 3, 3.6, 'ztRopeT', {}); A.ell(nx, ny + 20, 1.8, 2.4, '#07060a', { flat: true, contour: false });
    }
  } else if (kind === 4) {
    // the rib tree: a straight pale spine, pairs of curved branches arching down and in like ribs
    roots(5, 3, 16);
    const tr = path(ox, oy - 2, -Math.PI / 2 + R(-0.1, 0.1), 112, 8, 0.16); A.limb(tr, 6, 2, bark, { band: 2 }); grain.push([tr, 6, 2]);
    for (let k = 2; k < 8; k++) {
      const [sx, sy] = tr[k];
      for (const s of [-1, 1]) { if (rng() < 0.22) continue; const L = (34 - k * 2.6) * R(0.6, 1.15), bent = R(0.35, 0.75), pts = [[sx, sy]]; let a = -Math.PI / 2 + s * R(0.8, 1.3), x = sx, y = sy; const n = rng() < 0.2 ? 2 : 4; for (let i = 0; i < n; i++) { x += Math.cos(a) * L / 4; y += Math.sin(a) * L / 4; pts.push([x, y]); a += s * bent; } A.limb(pts, 2.6 - k * 0.18, 0.7, bark, { tone: s < 0 ? -1 : 0 }); tips.push(pts[pts.length - 1]); }
      A.ell(sx + R(-1, 1), sy, 3.4 - k * 0.2, 2.2, bark, {});   // a vertebra knot
    }
  } else if (kind === 5) {
    // struck by fire: the trunk split in two, charred black, embers still in the cracks
    roots(5, 3.5, 18);
    const base = path(ox, oy - 2, -Math.PI / 2, 26, 2, 0.05); A.limb(base, 8, 7, bark, { band: 3 });
    const [bx, by] = base[2];
    for (const s of [-1, 1]) { const tr = path(bx + s * 3, by, -Math.PI / 2 + s * 0.45, 52, 4, 0.2); A.limb(tr, 5.5, 2, bark, { band: 2, tone: s < 0 ? -1 : 0 }); grain.push([tr, 5.5, 2]); const t = tr[tr.length - 1]; branch(t[0], t[1], -Math.PI / 2 + s * 0.6, 18, 2, 2, s < 0 ? -1 : 0, 0.6, 0.2); branch(tr[2][0], tr[2][1], -Math.PI / 2 + s * 1.2, 16, 1.8, 1, 0, 0.6, 0.2); }
    A.poly([[bx - 3, by + 2], [bx + 3, by + 2], [bx, by - 12]], '#050404', { flat: true, contour: false });
  } else if (kind === 6) {
    // the thorn crown: a squat knotted stump bristling with thorned twigs
    roots(5, 3, 16);
    const tr = path(ox, oy - 2, -Math.PI / 2, 26, 3, 0.2); A.limb(tr, 7, 5, bark, { band: 2 }); grain.push([tr, 7, 5]);
    const top = tr[tr.length - 1];
    for (let k = 0; k < 7; k++) branch(top[0], top[1], -Math.PI / 2 + (k - 3) * 0.42 + R(-0.1, 0.1), R(16, 26), 2.2, 2, k % 2 ? -1 : 0, 0.7, 0.1);
  } else if (kind === 7) {
    // the drowned willow: a hunched trunk, arching limbs, curtains of grey moss hanging to the water
    roots(6, 4, 24);
    const tr = path(ox, oy - 2, -Math.PI / 2 + R(-0.2, 0.2), 56, 5, 0.2); A.limb(tr, 9, 5, bark, { band: 3 }); grain.push([tr, 9, 5]);
    const top = tr[tr.length - 1];
    for (let k = 0; k < 5; k++) branch(top[0], top[1], -Math.PI / 2 + (k - 2) * 0.55, R(26, 36), 3.4, 2, k % 2 ? -1 : 0, 0.5, -0.25);
  } else if (kind === 8) {
    // the stilt tree: the trunk raised on arching roots like the legs of something
    for (let k = 0; k < 6; k++) { const s = (k / 5) * 2 - 1, far = k % 2 === 1; A.limb([[ox + s * 4, oy - 30], [ox + s * 14, oy - 22], [ox + s * 22, oy - 6], [ox + s * 24 + R(-2, 2), oy + (far ? -3 : 0)]], 3, 1.6, bark, { tone: far ? -1 : 0 }); }
    const tr = path(ox, oy - 28, -Math.PI / 2, 46, 4, 0.18); A.limb(tr, 7, 4, bark, { band: 2 }); grain.push([tr, 7, 4]);
    const top = tr[tr.length - 1];
    for (let k = 0; k < 4; k++) branch(top[0], top[1], -Math.PI / 2 + (k - 1.5) * 0.6, R(20, 28), 3, 2, k % 2 ? -1 : 0, 0.55, 0.1);
  } else if (kind === 10) {
    // a snag: a broken stump of a trunk, splintered at the top
    roots(4, 3, 12);
    const tr = path(ox, oy - 2, -Math.PI / 2 + R(-0.2, 0.2), R(22, 34), 3, 0.15); A.limb(tr, 6, 4.5, bark, { band: 2 }); grain.push([tr, 6, 4.5]);
    const [tx, ty] = tr[tr.length - 1]; for (let k = -2; k <= 2; k++) A.limb([[tx + k * 1.6, ty + 2], [tx + k * 2 + R(-1, 1), ty - R(3, 9)]], 1.4, 0.6, bark, { tone: k % 2 ? -1 : 0 });
    if (rng() < 0.6) branch(tr[1][0], tr[1][1], -Math.PI / 2 + (rng() < 0.5 ? -1 : 1) * 1.1, R(10, 16), 1.8, 1, 0, 0.6, 0.3);
  } else if (kind === 11) {
    // a young dead tree, thin and crooked
    roots(3, 2, 10);
    const tr = path(ox, oy - 2, -Math.PI / 2 + R(-0.2, 0.2), R(34, 44), 4, 0.25); A.limb(tr, 3.4, 1.6, bark, { band: 1 }); grain.push([tr, 3.4, 1.6]);
    const top = tr[tr.length - 1]; branch(top[0], top[1], -Math.PI / 2 - 0.5, R(12, 18), 1.6, 2, 0, 0.6, 0.2); branch(top[0], top[1], -Math.PI / 2 + 0.5, R(12, 18), 1.6, 2, -1, 0.6, 0.2); branch(tr[2][0], tr[2][1], -Math.PI / 2 + (rng() < 0.5 ? -1 : 1) * 0.9, R(10, 14), 1.4, 1, 0, 0.6, 0.2);
  } else if (kind === 12) {
    // deadfall: a trunk fallen along the ground, its root plate torn up at one end, broken limbs sticking up, moss on its back
    const s = seed % 2 ? 1 : -1, a = [ox - 30 * s, oy - 12], b = [ox + 28 * s, oy + 4];
    A.ell(a[0] - 3 * s, a[1] - 4, 7, 11, bark, { tone: -0.3, dome: 0.5 }); for (let k = 0; k < 6; k++) A.limb([[a[0] - 3 * s, a[1] - 4], [a[0] - (6 + R(0, 6)) * s, a[1] - 14 + k * 4 + R(-2, 2)]], 1.4, 0.5, bark, { tone: -0.5 });
    A.limb([a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - 1], b], 5.4, 3.6, bark, {}); tips.push(b);
    A.ell(b[0], b[1], 2.4, 3.4, 'zWood', { tone: 0.3, n: [0.5 * s, 0.2, 0.84] });
    for (let k = 0; k < 3; k++) { const t = 0.3 + k * 0.22, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t - 4; branch(x, y, -Math.PI / 2 + R(-0.5, 0.5), R(10, 18), 1.3, 1, k % 2 ? -1 : 0, 0.6, 0.3); }
    for (let k = 0; k < 7; k++) { const t = 0.15 + k * 0.11, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t - 4.2; A.ell(x, y, 2.4, 1.1, fen ? 'zMoss' : 'zLeaf', { dome: 0.6 }); }
    for (let k = 0; k < 5; k++) { const x = ox + R(-30, 30), y = oy + R(-2, 8); A.limb([[x, y], [x + R(-3, 3), y - R(4, 8)]], 0.6, 0.3, 'zLeaf', { tone: -0.2 }); }
  } else if (kind === 13) {
    // undergrowth: a low tangle of bramble and dead fern over a couple of stones
    A.ell(ox, oy, 26, 6, 'zEarth', { dome: 0.35 });
    A.ell(ox - 10, oy - 2, 5, 3.4, 'zStone', {}); A.ell(ox + 12, oy - 1, 4, 2.6, 'zStone', { tone: -0.2 });
    for (let k = 0; k < 9; k++) { const x = ox + R(-22, 22), y = oy + R(-3, 3); branch(x, y, -Math.PI / 2 + R(-1, 1), R(8, 16), 1, 2, k % 2 ? -1 : 0, 0.8, 0.1); }
    for (let k = 0; k < 10; k++) { const x = ox + R(-24, 24), y = oy + R(-2, 4), a = -Math.PI / 2 + R(-1.1, 1.1), L = R(6, 12); A.limb([[x, y], [x + Math.cos(a) * L * 0.6, y + Math.sin(a) * L * 0.8], [x + Math.cos(a) * L, y + Math.sin(a) * L * 0.6]], 0.8, 0.3, fen ? 'zMoss' : 'zLeaf', { tone: k % 3 ? 0 : -0.4 }); }
  } else {
    // the bog cypress: tall, knobbed, knees standing out of the water around it
    for (let k = 0; k < 4; k++) { const kx = ox + [-18, -9, 11, 20][k], ky = oy - [1, -3, -2, 2][k] * 1; A.limb([[kx, ky], [kx + R(-1, 1), ky - R(5, 9)]], 2.4, 1.4, bark, { tone: -1 }); }
    roots(5, 4.5, 16);
    const tr = path(ox, oy - 2, -Math.PI / 2, 120, 8, 0.07); A.limb(tr, 8, 1.6, bark, { band: 3 }); grain.push([tr, 8, 1.6]);
    for (let k = 3; k < 8; k++) branch(tr[k][0], tr[k][1], -Math.PI / 2 + (k % 2 ? 1 : -1) * R(0.9, 1.3), 16 - k, 1.8, 1, k % 2 ? -1 : 0, 0.6, -0.1);
  }
  // v0.35: what clings to the tips: a few clusters of dead leaves on the moor trees, thorns on the thorn crown, moss on the fen kinds
  if (!fen && kind !== 5 && kind !== 4) {
    const LF = [A.mt('zLeaf', 0.15), A.mt('zLeaf', 0.4), A.mt('zLeaf', 0.65), A.mt('zLeaf', 0.95)];
    tips.forEach(([tx, ty], i) => {
      const r = hash(i * 11 + seed, kind * 3 + 1); if (r > (kind === 6 ? 0.18 : 0.26) || ty > oy - 24) return;
      const w = r < 0.1 ? 3 : 2, x0 = Math.round(tx) - w, y0 = Math.round(ty) - 2, rows = r < 0.13 ? 4 : 3;
      for (let j = 0; j < rows; j++) for (let q = 0; q < w * 2 + 1; q++) {
        const edge = (j === 0 || j === rows - 1) && (q === 0 || q === w * 2); if (edge || hash(x0 + q, y0 + j + seed) < 0.22) continue;
        const top = j === 0 && hash(x0 + q * 3, seed + j) < 0.4;
        A.px(x0 + q, y0 + j, LF[top ? 3 : j < rows - 1 ? (q < w ? 2 : 1) : 0]);
      }
      A.px(x0 + w + (i % 2), y0 + rows, LF[0]); A.px(x0 + w + 1 - (i % 2), y0 + rows + 1, LF[1]); if (r < 0.06) { A.px(x0 + w - 1, y0 + rows + 2, LF[0]); A.px(x0 + w + 2, y0 + rows + 3, LF[2]); }
    });
  }
  if (kind === 6) tips.forEach(([tx, ty], i) => { if (hash(i, seed) < 0.6) { const s = i % 2 ? 1 : -1; A.px(tx + s, ty - 1, '#8a7f6b'); A.px(tx + s * 2, ty - 2, '#b4aa94'); A.px(tx - s, ty + 1, '#5e5647'); } });
  // what hangs from the tips
  const hang = [];
  tips.forEach(([tx, ty], i) => { if (ty < oy - 20) hang.push([tx, ty, i]); });
  if (kind === 2) hang.forEach(([tx, ty, i]) => {
    const r = hash(i * 7 + seed, 3);
    if (r < 0.3) { const L = 9 + (hash(i, seed) * 9 | 0), c = r < 0.08 ? ['#3e0e12', '#62181c', '#86282a', '#a43c34'] : ['#3a342a', '#6e6654', '#9e937c', '#c4b89c']; for (let k = 0; k < L; k++) { const w = Math.round(Math.sin(k * 0.45 + i) * 1.2), wd = k < L - 3 ? 3 : 2; for (let q = 0; q < wd; q++) A.px(tx - 1 + w + q, ty + 1 + k, c[q === 0 ? 2 : q === wd - 1 ? 0 : 1 + (k % 4 === 0 ? 1 : 0)]); if (k === L - 1) A.px(tx + w + 1, ty + 2 + k, c[0]); } }
    else if (r < 0.45) { A.line(tx, ty + 1, tx, ty + 5, '#5e4c32'); const by = ty + 6; A.px(tx, by, '#a8741e'); for (let q = -1; q <= 1; q++) A.px(tx + q, by + 1, q < 0 ? '#d8a83a' : '#a8741e'); for (let q = -2; q <= 2; q++) A.px(tx + q, by + 2, q < 0 ? '#d8a83a' : q > 0 ? '#6a4410' : '#fff0a0'); for (let q = -2; q <= 2; q++) A.px(tx + q, by + 3, '#6a4410'); A.px(tx, by + 4, '#2a1a06'); }
  });
  if (kind === 2) { // a prayer string strung between two tips, with scraps of paper
    const hs = hang.slice().sort((p, q) => p[0] - q[0]); if (false) { const a = hs[1], b = hs[hs.length - 2]; const n = Math.ceil(Math.abs(b[0] - a[0])); for (let k = 0; k <= n; k++) { const t = k / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t + Math.sin(t * Math.PI) * 6; A.px(x, y, '#5e4c32'); if (k % 5 === 2) { A.px(x, y + 1, '#b8ad94'); A.px(x, y + 2, '#8e8470'); A.px(x + 1, y + 1, '#d8ceb4'); } } } }
  if (kind === 7 || kind === 9 || (fen && kind === 8)) hang.forEach(([tx, ty, i]) => { if (hash(i, seed * 3) < (kind === 7 ? 0.55 : 0.35)) { const L = 5 + (hash(i * 3, seed) * (kind === 7 ? 18 : 9) | 0), w = hash(i * 5, seed) < 0.5 ? 2 : 1; for (let k = 0; k < L; k++) for (let q = 0; q < w; q++) { const sw = k > L * 0.6 && i % 2 ? 1 : 0; A.px(tx + q + sw, ty + 1 + k, k < 2 ? '#56663a' : q === 0 && w > 1 ? '#3e4c2c' : k === L - 1 ? '#1e2616' : '#2c3822'); } } });
  if (kind === 5) for (let k = 0; k < 14; k++) { const [tx, ty] = tips[k % Math.max(1, tips.length)] || [ox, oy - 30]; const y = oy - 6 - k * 4, x = ox + (hash(k, seed) - 0.5) * 8; if (hash(k * 5, seed) < 0.5) { A.px(x, y, '#c8401e'); A.px(x, y + 1, '#6e1a0c'); } }
  if (kind === 3 || kind === 0) for (let k = 0; k < 2; k++) { const t = tips[(k * 5 + seed) % Math.max(1, tips.length)]; if (t) { const [tx, ty] = t; A.px(tx - 1, ty - 1, '#0e0d12'); A.px(tx, ty - 1, '#0e0d12'); A.px(tx + 1, ty - 2, '#0e0d12'); A.px(tx, ty - 2, '#0e0d12'); A.px(tx + 2, ty - 2, '#6a5a3a'); } }   // crows
  const full = A.render(), FW = full.width, FH = full.height, d = full.getContext('2d').getImageData(0, 0, FW, FH).data;
  let x0 = FW, y0 = FH, x1 = 0, y1 = 0; for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) if (d[(j * FW + i) * 4 + 3]) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  const c = mkCanvas(x1 - x0 + 1, y1 - y0 + 1); c.getContext('2d').drawImage(full, -x0, -y0);
  const fox = Math.round(ox * ZT_TREE_S) - x0, foy = Math.round(oy * ZT_TREE_S) - y0;
  return (ZT_TREE[key] = { c, w: c.width, h: c.height, ox: fox, oy: foy, sh: ztCastShadow(c, fox, foy) });
}
function ztTreeKind(z, x, y) {
  const h = hash(x * 3 + 11, y * 5 + 7), fen = z.theme === 'fen';
  // big trees stand apart; between them snags, saplings and thorn
  let n = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if ((i || j) && z.get(x + i, y + j) === 2) n++;
  const big = hash(x * 7 + 3, y * 3 + 5) < (n >= 6 ? 0.03 : n >= 3 ? 0.09 : n >= 1 ? 0.35 : 0.75);
  if (!big) return n >= 3 ? (h < 0.3 ? 12 : h < 0.72 ? 13 : h < 0.86 ? 10 : 11) : (h < 0.4 ? 10 : h < 0.75 ? 11 : 6);
  if (fen) return h < 0.4 ? 7 : h < 0.7 ? 8 : h < 0.88 ? 9 : 4;
  const k = h < 0.16 ? 0 : h < 0.36 ? 1 : h < 0.45 ? 2 : h < 0.6 ? 3 : h < 0.73 ? 4 : h < 0.88 ? 5 : 6;
  return n >= 3 && (k === 1 || k === 4) ? 3 : k;
}
// the shadow a standing thing throws on the ground: its silhouette laid down away from the light (down and to the
// right), squashed flat, in a cool dark; drawn once per frame, it anchors the thing to the ground
function ztCastShadow(src, ox, oy) {
  const w = src.width, h = src.height, k = 0.34, sk = 0.9, W2 = Math.ceil(w + h * k * sk) + 2, H2 = Math.ceil(oy * k) + 4;
  const c = mkCanvas(W2, H2), g = c.getContext('2d');
  g.setTransform(1, 0, -sk, k, oy * k * sk, 0); g.drawImage(src, 0, 0); g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'source-in'; g.fillStyle = 'rgb(10,8,18)'; g.fillRect(0, 0, W2, H2);
  // a crisp pixel edge: whole pixels only, no soft alpha
  const d = g.getImageData(0, 0, W2, H2), D = d.data; for (let i = 3; i < D.length; i += 4) D[i] = D[i] > 90 ? 255 : 0; g.putImageData(d, 0, 0);
  return { c, ox: ox + Math.round(oy * k * sk) - Math.round(oy * k * sk), dx: Math.round(oy * k * sk), oy: Math.round(oy * k) };
}
// a hole the shape of the hero, stepped in three rings, for thinning whatever stands between the eye and the hero
const ZT_HOLE = (() => {
  const w = 104, h = 132, c = mkCanvas(w, h), g = c.getContext('2d'), img = g.createImageData(w, h), D = img.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const d = Math.hypot((i - w / 2) / (w / 2), (j - h / 2) / (h / 2)); const a = d < 0.55 ? 225 : d < 0.78 ? 165 : d < 1 ? 90 : 0; D[(j * w + i) * 4 + 3] = a; }
  g.putImageData(img, 0, 0); return c;
})();
const ZT_TBUF = mkCanvas(8, 8);
function ztDrawTree(x, y, z) {
  const kind = ztTreeKind(z, x, y), fr = ztTreeFrame(kind, ((hash(x * 7, y * 13) * 4) | 0) + (z.theme === 'fen' && kind >= 10 ? 10 : 0)), p = iso(x + 0.5, y + 0.5);
  const sx = Math.round(p.sx + (hash(x * 5, y) - 0.5) * 6), sy = Math.round(p.sy + 2), X = sx - fr.ox, Y = sy - fr.oy;
  // the cast shadow, then a small dark pool right at the foot
  const S = fr.sh; ctx.globalAlpha = 0.42; ctx.drawImage(S.c, sx - fr.ox - 0 + 0, sy - S.oy + 1 - 0, S.c.width, S.c.height); ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(6,4,12,0.35)'; ctx.beginPath(); ctx.ellipse(sx + 2, sy + 1, Math.max(8, fr.w * 0.1), Math.max(3, fr.w * 0.035), 0, 0, 6.28); ctx.fill();
  const img = fr.c;
  // sway in whole pixels: three horizontal bands, the top one moves most
  const s = Math.sin(G.time * 0.8 + x * 0.7 + y * 0.3) + Math.sin(G.time * 1.9 + x) * 0.3, o1 = Math.round(s * 1.2), o2 = Math.round(s * 0.6);
  const b1 = Math.round(fr.h * 0.38), b2 = Math.round(fr.h * 0.62);
  // thin the crown where it stands between the eye and the hero (a hole the hero's shape, not the whole tree faded)
  const hp = P && !P.dead ? iso(P.x, P.y) : null, front = hp && P.x + P.y < x + y + 1.5 && hp.sx > X - 40 && hp.sx < X + fr.w + 40 && hp.sy - 60 < Y + fr.h && hp.sy + 20 > Y;
  let g = ctx, OX = X, OY = Y;
  if (front) { if (ZT_TBUF.width < fr.w + 4 || ZT_TBUF.height < fr.h) { ZT_TBUF.width = Math.max(ZT_TBUF.width, fr.w + 4); ZT_TBUF.height = Math.max(ZT_TBUF.height, fr.h); } g = ZT_TBUF.getContext('2d'); g.clearRect(0, 0, fr.w + 4, fr.h); OX = 2; OY = 0; }
  const part = (y0, y1, off) => g.drawImage(img, 0, y0, fr.w, y1 - y0, OX + off, OY + y0, fr.w, y1 - y0);
  part(0, b1, o1); part(b1, b2, o2); part(b2, fr.h, 0);
  if (front) {
    g.globalCompositeOperation = 'destination-out'; g.drawImage(ZT_HOLE, Math.round(hp.sx - X + 2 - ZT_HOLE.width / 2), Math.round(hp.sy - Y - 24 - ZT_HOLE.height / 2)); g.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.82; ctx.drawImage(ZT_TBUF, 0, 0, fr.w + 4, fr.h, X - 2, Y, fr.w + 4, fr.h); ctx.globalAlpha = 1;
  }
}
// =================================================================== props: graves, cairns, gibbets, crows, reeds, braziers, candles...
pmat('ztSt', ['#121115', '#2a282d', '#46434a', '#686470', '#948f9a']);         // grave stone, cold
pmat('ztStW', ['#141210', '#302c28', '#504a42', '#766e62', '#a29888']);        // warm weathered stone
pmat('ztMoss', ['#0c110b', '#1f2b19', '#2f3f22', '#43552e', '#5a6c3a']);
pmat('ztEarth', ['#0d0a09', '#1e1712', '#30251c', '#443428', '#584634']);
pmat('ztBone', ['#2a2418', '#6a6250', '#a89c80', '#d6cab0', '#f4ecd8']);
pmat('ztIron', ['#0a0a0d', '#1e2026', '#363a44', '#5a606c', '#8e95a2']);
pmat('ztWax', ['#3a3022', '#7a6a50', '#b0a080', '#d8caa8', '#f2e8cc']);
pmat('ztCoffin', ['#0e0908', '#24170f', '#3c2718', '#583a24', '#78522f']);
pmat('ztFung', ['#0e2622', '#1e4a42', '#3a8a74', '#6ad8b4', '#c8ffe8']);
pmat('ztReed', ['#10160c', '#1e2a16', '#34441e', '#4e6028', '#6a7a36']);
pmat('ztReedH', ['#1a120a', '#3a2814', '#5a3e1e', '#7a5a2c', '#9a7a40']);
pmat('ztLily', ['#0c160c', '#1a2e18', '#2e4a26', '#46663a', '#627e4a']);
pmat('ztGold', ['#2a1a06', '#6a4410', '#a8741e', '#d8a83a', '#fff0a0']);
pmat('ztBronze', ['#141a10', '#2e3a26', '#4a5a3a', '#6e7a4a', '#a09a58']);   // old bronze under verdigris
const ZT_PROPF = {};
// paint into a padded Pix, crop, and keep a flipped copy. (ox, oy): the foot point inside the crop.
function ztFrame(key, Wd, Ht, ox, oy, paint, nf) {
  if (ZT_PROPF[key]) return ZT_PROPF[key];
  const S = ZT_PROP_S, A = ZSc(Wd, Ht, S); A.fl = []; paint(A, ox, oy); const full = A.render(), FW = full.width, FH = full.height, d = full.getContext('2d').getImageData(0, 0, FW, FH).data;
  let x0 = FW, y0 = FH, x1 = 0, y1 = 0; for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) if (d[(j * FW + i) * 4 + 3]) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  if (x1 < x0) { x0 = y0 = 0; x1 = y1 = 1; }
  const FX = Math.round(ox * S), FY = Math.round(oy * S);
  if (nf) { const half = Math.max(FX - x0, x1 - FX); x0 = FX - half; x1 = FX + half; }   // symmetric about the foot: the same frame serves both ways, the light stays on the left
  const w = x1 - x0 + 1, h = y1 - y0 + 1, c = mkCanvas(w, h); c.getContext('2d').drawImage(full, -x0, -y0);
  let f = c; if (!nf) { f = mkCanvas(w, h); const fx = f.getContext('2d'); fx.translate(w, 0); fx.scale(-1, 1); fx.drawImage(c, 0, 0); }
  const fl = (A.fl || []).map(([x, y]) => [Math.round(x * S) - FX, Math.round(y * S) - FY]);
  return (ZT_PROPF[key] = { c, f, w, h, ox: FX - x0, oy: FY - y0, fl });
}
const ZT_SKULL = ['.1331.', '134431', '300403', '334433', '.3033.'], ZT_BONEC = ['#2a2418', '#6a6250', '#a89c80', '#d6cab0', '#f4ecd8'];
const ztSkullPx = (A, x, y) => { for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) { const ch = ZT_SKULL[j][i]; if (ch !== '.') A.px(x + i, y + j, ZT_BONEC[+ch]); } };
const ZT_PROPP = {
  grave(A, v, ox, oy) {
    A.ell(ox, oy - 1, 11, 4, 'ztEarth', {});                                    // the mound
    for (let k = 0; k < 6; k++) A.px(ox - 8 + k * 3, oy - 3 + (k % 2), k % 2 ? '#43552e' : '#2f3f22');
    if (v === 0) { // a round-topped slab, carved, cracked
      A.poly([[ox - 7, oy - 2], [ox - 7, oy - 20], [ox + 7, oy - 20], [ox + 7, oy - 2]], 'ztSt', { band: 2 }); A.ell(ox, oy - 20, 7, 5, 'ztSt', {});
      A.poly([[ox + 7, oy - 20], [ox + 9, oy - 19], [ox + 9, oy - 3], [ox + 7, oy - 2]], 'ztSt', { tone: -1 });
      for (let k = 0; k < 3; k++) A.line(ox - 4, oy - 17 + k * 3, ox + 3 - (k === 2 ? 3 : 0), oy - 17 + k * 3, '#26242a');
      A.line(ox - 3, oy - 22, ox - 3, oy - 20, '#94909a'); A.line(ox - 5, oy - 21, ox - 1, oy - 21, '#94909a');   // a cross
      A.line(ox + 3, oy - 24, ox + 1, oy - 14, '#121115'); A.line(ox + 1, oy - 14, ox + 2, oy - 10, '#121115');
    } else if (v === 1) { // a ringed cross
      A.poly([[ox - 2, oy - 1], [ox - 2, oy - 34], [ox + 2, oy - 34], [ox + 2, oy - 1]], 'ztSt', {});
      A.poly([[ox - 9, oy - 27], [ox + 9, oy - 27], [ox + 9, oy - 23], [ox - 9, oy - 23]], 'ztSt', {});
      for (let a = 0; a < 6.28; a += 0.15) { const x = ox + Math.cos(a) * 6, y = oy - 25 + Math.sin(a) * 6; if (Math.abs(Math.cos(a)) > 0.3 || Math.abs(Math.sin(a)) > 0.3) A.px(x, y, Math.cos(a + 0.8) > 0 ? '#686470' : '#2a282d'); }
      A.px(ox - 1, oy - 26, '#948f9a'); A.px(ox, oy - 25, '#121115');
      A.poly([[ox - 6, oy - 3], [ox + 6, oy - 3], [ox + 5, oy - 7], [ox - 5, oy - 7]], 'ztSt', { tone: -1 });
    } else if (v === 2) { // a leaning obelisk
      A.poly([[ox - 5, oy - 2], [ox - 1, oy - 38], [ox + 3, oy - 38], [ox + 5, oy - 2]], 'ztStW', { band: 2 }); A.poly([[ox - 1, oy - 38], [ox + 3, oy - 38], [ox + 1, oy - 43]], 'ztStW', {});
      for (let k = 0; k < 5; k++) A.px(ox, oy - 30 + k * 5, '#302c28'); A.line(ox - 4, oy - 8, ox + 4, oy - 8, '#302c28');
      for (let k = 0; k < 8; k++) A.px(ox - 4 + (k % 3), oy - 4 - k * 2, k % 2 ? '#43552e' : '#2f3f22');
    } else { // a low tomb slab with a skull on it and a guttered candle
      A.poly([[ox - 12, oy - 2], [ox, oy + 3], [ox + 12, oy - 2], [ox + 12, oy - 8], [ox, oy - 3], [ox - 12, oy - 8]], 'ztSt', { band: 2 });
      A.poly([[ox - 12, oy - 8], [ox, oy - 13], [ox + 12, oy - 8], [ox, oy - 3]], 'ztSt', { tone: 1 });
      ztSkullPx(A, ox - 5, oy - 14); A.poly([[ox + 5, oy - 9], [ox + 7, oy - 9], [ox + 7, oy - 14], [ox + 5, oy - 14]], 'ztWax', {}); A.px(ox + 6, oy - 15, '#1a120c');
      for (let k = 0; k < 4; k++) { A.px(ox - 9 + k * 5, oy - 6 + (k % 2), '#26242a'); }
      A.line(ox - 8, oy - 10, ox - 3, oy - 7, '#121115'); A.px(ox + 9, oy - 5, '#948f9a'); A.px(ox + 10, oy - 4, '#948f9a');   // a crack across the lid, a chipped corner
    }
    // v0.35: the golem's finish on every stone: chips out of the edges, lichen rosettes, a seam of grime
    const chips = [[[-7, -19], [7, -18], [-7, -6], [6, -20]], [[-2, -34], [9, -27], [-9, -24]], [[-1, -37], [4, -20], [-4, -12]], [[-12, -8], [12, -8], [11, -3]]][v];
    for (const [cx, cy] of chips) { A.px(ox + cx, oy + cy, null); A.px(ox + cx + (cx < 0 ? 1 : -1), oy + cy + 1, '#121115'); }
    const lich = [[[-5, -12], [4, -8], [-3, -16]], [[-1, -20], [1, -8], [-7, -25]], [[-2, -20], [1, -27], [3, -9]], [[-8, -6], [8, -4], [-3, -10]]][v];
    lich.forEach(([lx, ly], k) => { A.px(ox + lx, oy + ly, '#6a7a3a'); A.px(ox + lx + 1, oy + ly, '#8a9a4a'); A.px(ox + lx, oy + ly + 1, '#4a5a2a'); if (k === 0) A.px(ox + lx - 1, oy + ly + 1, '#6a7a3a'); });
    for (let k = 0; k < 3; k++) A.px(ox - 3 + k * 3 + (v % 2), oy - 2 - (k % 2), '#1e1c22');
  },
  // a pile of skulls with a jawbone and a few teeth
  skulls(A, v, ox, oy) {
    const R = mulberry32(v * 17 + 3);
    A.ell(ox, oy - 1, 9, 3, 'ztEarth', { tone: -1 });
    const pos = [[ox - 6, oy - 6], [ox + 1, oy - 7], [ox - 2, oy - 11]]; if (v > 1) pos.push([ox + 6, oy - 5]);
    pos.forEach(([x, y], i) => { A.ell(x + 3, y + 2, 3.6, 3.2, 'ztBone', { tone: i === 2 ? 1 : 0, band: 2 }); });
    pos.forEach(([x, y]) => { A.px(x + 1, y + 2, '#16120e'); A.px(x + 2, y + 2, '#16120e'); A.px(x + 4, y + 2, '#16120e'); A.px(x + 5, y + 2, '#16120e'); A.px(x + 3, y + 3, '#2a2418'); A.px(x + 2, y + 4, '#6a6250'); A.px(x + 4, y + 4, '#6a6250'); A.px(x + 3, y, '#f4ecd8'); });
    A.limb([[ox - 9, oy - 1], [ox - 4, oy - 3]], 1, 0.8, 'ztBone', { tone: -1 }); A.px(ox + 8, oy - 2, '#d6cab0'); A.px(ox + 9, oy - 1, '#a89c80');
    for (let k = 0; k < 3; k++) A.px(ox - 3 + k * 4 + (R() * 2 | 0), oy - (R() * 2 | 0), '#f4ecd8');
  },
  // a withered offering at a grave: dead flowers bound in a cloth, a clay bowl, a stub of candle
  offering(A, v, ox, oy) {
    A.ell(ox, oy, 8, 2.4, 'ztEarth', { tone: -1 });
    for (let k = 0; k < 5; k++) { const a = -1.9 + k * 0.32, L = 8 + (k % 2) * 3; A.limb([[ox - 3, oy - 1], [ox - 3 + Math.cos(a) * L, oy - 1 + Math.sin(a) * L]], 0.7, 0.5, 'ztBark', { tone: k % 2 ? -1 : 0, contour: false }); A.px(ox - 3 + Math.cos(a) * L, oy - 2 + Math.sin(a) * L, k % 2 ? '#6e4c2e' : '#8a7f6b'); A.px(ox - 2 + Math.cos(a) * L, oy - 1 + Math.sin(a) * L, '#4a0e12'); }
    A.poly([[ox - 5, oy - 3], [ox - 1, oy - 3], [ox, oy], [ox - 6, oy]], 'ztCloth', { tone: -1 });
    A.ell(ox + 5, oy - 1, 3.4, 1.8, 'ztStW', { band: 1 }); A.ell(ox + 5, oy - 2, 2.2, 0.9, '#1a0a06', { flat: true, contour: false });
    if (v % 2) { A.poly([[ox + 9, oy - 1], [ox + 11, oy - 1], [ox + 11, oy - 5], [ox + 9, oy - 5]], 'ztWax', {}); A.px(ox + 10, oy - 6, '#1a120c'); A.px(ox + 10, oy - 2, '#f2e8cc'); }
  },
  // heaped chains on the floor, one end fixed to a ring, rust and blood
  chains(A, v, ox, oy) {
    const R = mulberry32(v * 5 + 11); let x = ox - 10, y = oy - 2;
    A.ell(ox + 8, oy - 1, 2.6, 1.6, 'ztIron', {}); A.px(ox + 8, oy - 1, '#0a0a0d');
    for (let k = 0; k < 14; k++) { const nx = x + 1.4 + R() * 0.6, ny = y + (Math.sin(k * 0.9 + v) * 1.4); A.limb([[x, y], [nx, ny]], 0.9, 0.9, 'ztIron', { tone: k % 3 ? 0 : -1, contour: false }); if (k % 2) A.px(x, y - 1, '#8e95a2'); if (k % 5 === 2) A.px(x, y + 1, '#6a3a22'); x = nx; y = ny; }
    A.px(ox - 4, oy + 1, '#4a0e12'); A.px(ox - 3, oy + 1, '#34080c'); A.px(ox - 6, oy, '#34080c');
  },
  // broken stone on the floor: a fallen block, chips and dust
  rubble(A, v, ox, oy) {
    A.ell(ox, oy, 10, 3, 'ztEarth', { tone: -1 });
    A.poly([[ox - 8, oy - 1], [ox - 6, oy - 7], [ox + 1, oy - 9], [ox + 5, oy - 4], [ox + 3, oy + 1]], 'ztSt', { band: 2 });
    A.poly([[ox - 6, oy - 7], [ox + 1, oy - 9], [ox + 2, oy - 6], [ox - 4, oy - 4]], 'ztSt', { tone: 1 });
    A.ell(ox + 8, oy - 1, 3, 1.8, 'ztSt', { tone: -1 }); A.ell(ox - 9, oy + 1, 2, 1.2, 'ztSt', {});
    if (v % 2) A.ell(ox + 3, oy + 2, 2.4, 1.4, 'ztSt', { tone: -1 });
    for (let k = 0; k < 6; k++) A.px(ox - 10 + k * 4 + (k % 2), oy + 2 - (k % 3), k % 2 ? '#46434a' : '#2a282d');
    A.line(ox - 4, oy - 6, ox - 1, oy - 2, '#121115');
  },
  // a sunken bell: the great bronze bell of a drowned chapel, on its side in the mud, green with verdigris
  bell(A, v, ox, oy) {
    A.ell(ox, oy, 16, 5, 'ztEarth', { tone: -1 });
    A.poly([[ox - 14, oy - 4], [ox - 12, oy - 18], [ox - 6, oy - 24], [ox + 2, oy - 24], [ox + 8, oy - 18], [ox + 12, oy - 4], [ox + 6, oy + 2], [ox - 8, oy + 2]], 'ztBronze', { band: 3 });
    A.poly([[ox - 6, oy - 24], [ox + 2, oy - 24], [ox + 3, oy - 27], [ox - 5, oy - 27]], 'ztBronze', { tone: 1 });   // the crown
    A.poly([[ox - 14, oy - 4], [ox + 12, oy - 4], [ox + 6, oy + 2], [ox - 8, oy + 2]], 'ztBronze', { tone: -2 });        // the dark mouth
    A.ell(ox - 1, oy - 1, 8, 2.6, '#0a0806', { flat: true, contour: false });
    A.line(ox - 12, oy - 10, ox + 10, oy - 10, '#3a5a3a'); A.line(ox - 13, oy - 7, ox + 11, oy - 7, '#2a1a06');           // bands round the waist
    for (let k = 0; k < 6; k++) A.px(ox - 9 + k * 4, oy - 15 + (k % 2), k % 2 ? '#5a7a4a' : '#3a5a3a');                   // a verdigris crust
    for (let k = 0; k < 9; k++) A.px(ox - 11 + k * 2.6, oy - 21 + (k % 3), ['#3a5a3a', '#5a7a4a', '#7a8a5a'][k % 3]);
    A.line(ox + 4, oy - 22, ox + 6, oy - 12, '#1a1206');                                                                  // a crack down the side
    A.px(ox - 9, oy - 20, '#f0d890'); A.px(ox - 8, oy - 21, '#f0d890');                                                   // where the bronze still shines
    for (let k = 0; k < 5; k++) A.limb([[ox + 10 + k * 2, oy - 2], [ox + 11 + k * 2 + (k % 2), oy - 9 - (k % 3) * 3]], 0.8, 0.5, 'ztReed', { tone: k % 2 ? -1 : 0, contour: false });
  },
  // a broken arch of the old chapel: two piers and the spring of an arch, the keystone long fallen
  arch(A, v, ox, oy) {
    const R = mulberry32(v * 3 + 1);
    for (const s of [-1, 1]) {
      const x = ox + s * 16, h = 30 + (s > 0 ? 8 : 0) + (v % 2) * 6;
      A.poly([[x - 5, oy - 1], [x - 5, oy - h], [x + 5, oy - h - 2], [x + 5, oy - 1]], 'ztStW', { band: 3, tone: s > 0 ? -1 : 0 });
      for (let k = 6; k < h - 2; k += 6) { A.line(x - 5, oy - k, x + 4, oy - k - (k % 12 ? 0 : 1), '#141210'); if (k % 12 === 0) A.px(x + 1, oy - k - 3, '#141210'); }
      for (let i = -5; i <= 5; i++) A.px(x + i, oy - h - (i > 0 ? 2 : 0) + (R() * 3 | 0), '#a29888');   // the broken top
      A.poly([[x - 7, oy - 1], [x + 7, oy - 1], [x + 7, oy - 5], [x - 7, oy - 5]], 'ztStW', { tone: -1 });   // the plinth
      if (s < 0) for (let k = 0; k < 8; k++) A.px(x - 5 + (k % 3), oy - 4 - k * 3 - (k % 2), k % 2 ? '#43552e' : '#2f3f22');   // ivy and moss up the north pier
    }
    // the spring of the arch on each pier, the two halves reaching for a keystone that fell long ago
    const e = (v % 2) * 6, tl = oy - 30 - e, tr = oy - 38 - e;
    A.limb([[ox - 16, tl], [ox - 13, tl - 9], [ox - 8, tl - 16], [ox - 3, tl - 20]], 4.6, 3.2, 'ztStW', { band: 2 });
    A.limb([[ox + 16, tr], [ox + 14, tr - 7], [ox + 10, tr - 12], [ox + 5, tr - 15]], 4.6, 3.2, 'ztStW', { band: 2, tone: -1 });
    for (const [x1, y1, x2, y2] of [[ox - 15, tl - 5, ox - 10, tl - 3], [ox - 12, tl - 12, ox - 7, tl - 9], [ox - 7, tl - 18, ox - 4, tl - 14], [ox + 15, tr - 4, ox + 11, tr - 6], [ox + 12, tr - 10, ox + 8, tr - 11]]) A.line(x1, y1, x2, y2, '#141210');   // the joints between the voussoirs
    A.px(ox - 3, tl - 23, '#a29888'); A.px(ox - 2, tl - 22, '#766e62'); A.px(ox + 5, tr - 18, '#a29888'); A.px(ox + 6, tr - 17, '#766e62');   // the broken ends, lit
    if (v > 1) { A.px(ox - 8, tl - 8, '#43552e'); A.px(ox - 9, tl - 7, '#2f3f22'); A.px(ox - 5, tl - 16, '#43552e'); }
    // fallen blocks in the gap
    A.poly([[ox - 5, oy + 1], [ox - 3, oy - 5], [ox + 4, oy - 6], [ox + 6, oy]], 'ztStW', { band: 2 }); A.ell(ox + 10, oy + 2, 3, 1.6, 'ztStW', { tone: -1 });
    for (let k = 0; k < 5; k++) A.px(ox - 10 + k * 5, oy + 3 - (k % 2), '#302c28');
    ztSkullPx(A, ox - 12, oy - 4);
  },
  // an iron railing round a plot: spiked bars between two posts, one bar bent, rust
  railing(A, v, ox, oy) {
    const n = 7, dx = 3.4, dy = 1.7, dir = v % 2 ? -1 : 1;   // along the +x iso axis (down-right) or the +y axis (down-left)
    const px = k => Math.round(ox + (k - 3) * dx * dir), py = k => Math.round(oy + (k - 3) * dy);
    for (const k of [0, n - 1]) { const x = px(k), y = py(k); A.poly([[x - 1.5, y + 1], [x - 1.5, y - 19], [x + 1.6, y - 19], [x + 1.6, y + 1]], 'ztIron', { band: 1 }); A.px(x, y - 20, '#8e95a2'); A.px(x - 1, y - 20, '#0a0a0d'); A.px(x + 1, y - 20, '#0a0a0d'); A.px(x, y - 21, '#5a606c'); A.px(x, y - 22, '#0a0a0d'); }
    for (let k = 1; k < n - 1; k++) {
      const x = px(k), y = py(k), bent = k === 3 && v > 1, h = 15;
      for (let q = 0; q < h; q++) { const xx = x + (bent && q > 6 ? Math.round((q - 6) * 0.3) : 0); A.px(xx, y - q, q % 5 === 2 ? '#1e2026' : '#363a44'); if (q % 3 === 0) A.px(xx - 1, y - q, '#5a606c'); }
      A.px(x + (bent ? 2 : 0), y - h, '#8e95a2'); A.px(x + (bent ? 2 : 0), y - h - 1, '#5a606c'); A.px(x + (bent ? 2 : 0), y - h - 2, '#0a0a0d');
      if (k % 2) A.px(x + 1, y - 5, '#6a3a22'); A.px(x, y + 1, '#0a0a0d');
    }
    for (const rh of [12, 3]) { A.line(px(0), py(0) - rh, px(n - 1), py(n - 1) - rh, '#5a606c'); A.line(px(0), py(0) - rh + 1, px(n - 1), py(n - 1) - rh + 1, '#1e2026'); }
    A.px(px(2), py(2) - 12, '#8e95a2'); A.px(px(5), py(5) - 3, '#6a3a22');
  },
  // wall-mounted: an iron torch bracket, a wrapped torch; the flame is drawn live
  sconce(A, v, ox, oy) {
    A.ell(ox, oy - 12, 3.2, 3.2, 'ztIron', { band: 1, tone: -1 }); A.px(ox, oy - 12, '#0a0a0d');                          // the wall plate
    A.limb([[ox, oy - 12], [ox + 4, oy - 15], [ox + 5, oy - 20]], 1.2, 1, 'ztIron', {});                                 // the arm
    A.ell(ox + 5, oy - 21, 3, 1.6, 'ztIron', {}); A.ell(ox + 5, oy - 22, 2, 0.8, '#1a0a06', { flat: true, contour: false }); // the cup
    A.poly([[ox + 4, oy - 21], [ox + 6, oy - 21], [ox + 6, oy - 29], [ox + 4, oy - 29]], 'ztWoodC', {});                  // the torch
    for (let k = 0; k < 3; k++) A.px(ox + 4 + (k % 2), oy - 24 - k * 2, '#a8946a');                                        // the wrap
    A.px(ox + 5, oy - 30, '#2a0a04'); A.px(ox - 2, oy - 12, '#8e95a2'); A.px(ox + 2, oy - 14, '#5a606c');
    for (let k = 0; k < 4; k++) A.px(ox - 1 + (k % 3), oy - 10 + k * 2, k % 2 ? '#1a1416' : '#0e0c0c');                    // soot under the bracket
  },
  // wall-mounted: a hanging cloth, torn, the god's colours faded and stained
  cloth(A, v, ox, oy) {
    const mat = v % 2 ? 'ztCloth' : 'ztRobe', L = 22 + (v > 1 ? 6 : 0);
    A.limb([[ox - 7, oy - L - 2], [ox + 7, oy - L - 2]], 0.9, 0.9, 'ztIron', { contour: false });
    const pts = [[ox - 6, oy - L - 1], [ox + 6, oy - L - 1], [ox + 6, oy - 6], [ox + 3, oy - 9], [ox + 1, oy - 2], [ox - 2, oy - 7], [ox - 4, oy - 4], [ox - 6, oy - 8]];
    A.poly(pts, mat, { band: 2 });
    for (let k = 0; k < 3; k++) A.line(ox - 4 + k * 4, oy - L + 2, ox - 4 + k * 4 + (k % 2), oy - 10 + k, v % 2 ? '#3a1014' : '#1c1719');   // folds
    A.px(ox - 1, oy - L + 6, '#f4ecd8'); A.px(ox, oy - L + 6, '#f4ecd8'); A.px(ox - 1, oy - L + 7, '#f4ecd8'); A.px(ox, oy - L + 7, '#f4ecd8'); A.px(ox + 1, oy - L + 8, '#f4ecd8'); A.px(ox - 2, oy - L + 8, '#f4ecd8');   // a pale device
    A.px(ox, oy - L + 9, '#f4ecd8'); A.px(ox - 1, oy - L + 10, '#a89c80');
    for (let k = 0; k < 5; k++) A.px(ox - 5 + k * 2 + (k % 2), oy - 14 + k * 1.4, '#0e0808');   // moth holes
    A.px(ox + 5, oy - 12, '#2a0608'); A.px(ox + 4, oy - 11, '#2a0608');
  },
  // wall-mounted: hanging chains and a manacle
  wallchain(A, v, ox, oy) {
    const L = 16 + v * 3;
    A.ell(ox, oy - L - 4, 2.4, 2.4, 'ztIron', { tone: -1 }); A.px(ox, oy - L - 4, '#0a0a0d');
    for (let k = 0; k < L; k += 2) { A.px(ox + (k % 4 ? 0 : 1) + Math.round(Math.sin(k * 0.5 + v) * 1.2), oy - L - 2 + k, k % 4 ? '#5a606c' : '#8e95a2'); A.px(ox + Math.round(Math.sin(k * 0.5 + v) * 1.2), oy - L - 1 + k, '#1e2026'); }
    A.ell(ox + 1, oy - 1, 3, 2.2, 'ztIron', {}); A.ell(ox + 1, oy - 1, 1.6, 1.1, '#0a0a0d', { flat: true, contour: false });
    if (v % 2) { A.limb([[ox - 4, oy], [ox + 6, oy - 2]], 1.1, 0.9, 'ztBone', { tone: -1 }); A.px(ox + 7, oy - 3, '#f4ecd8'); }
    A.px(ox + 3, oy - 3, '#6a3a22');
  },
  // wall-mounted, in a corner: a cobweb, a few dusty strands and a dead thing wrapped in it
  cobweb(A, v, ox, oy) {
    const c = ['#3a3846', '#5a5868', '#7c7a88'];
    for (let r = 4; r <= 12; r += 4) for (let a = 0.1; a <= 3.05; a += 0.11) { const x = ox + Math.cos(a) * r, y = oy + Math.sin(a) * r * 0.8; if (hash(Math.round(x * 3), Math.round(y * 3) + v) < 0.65) A.px(x, y, c[r === 4 ? 2 : r === 8 ? 1 : 0]); }
    for (let a = 0.2; a <= 3; a += 0.45) A.line(ox, oy, ox + Math.cos(a) * 13, oy + Math.sin(a) * 11, c[1]);
    if (v % 2) { A.px(ox + 6, oy + 5, '#2a2418'); A.px(ox + 7, oy + 5, '#3a342a'); A.px(ox + 7, oy + 6, '#2a2418'); } else { A.px(ox - 5, oy + 7, '#2a2418'); A.px(ox - 4, oy + 8, '#3a342a'); }
  },
  // a puddle under a drip from the vault: dark water, a lit rim, wet stone round it
  drip(A, v, ox, oy) {
    A.ell(ox, oy, 7 + v, 3, '#0a0c12', { flat: true, contour: false });
    for (let x = -6 - v; x <= 6 + v; x++) { const h = Math.round(Math.sqrt(Math.max(0, 1 - (x / (7 + v)) ** 2)) * 3); A.px(ox + x, oy - h, '#3a4656'); A.px(ox + x, oy + h, '#141a22'); }
    A.px(ox - 2, oy - 1, '#5a6a7c'); A.px(ox + 3, oy, '#2a3442');
  },
  cairn(A, v, ox, oy) { // skulls and long bones heaped up
    const n = 5 + v * 2, R = mulberry32(v * 13 + 5);
    for (let i = 0; i < 3 + v; i++) A.limb([[ox - 10 + R() * 6, oy - 1 - R() * 4], [ox + 4 + R() * 6, oy - 3 - R() * 6]], 1.3, 1.1, 'ztBone', { tone: -1 });
    const pos = []; for (let i = 0; i < n; i++) { const row = i < 4 ? 0 : i < 7 ? 1 : i < 9 ? 2 : 3, k = row === 0 ? i : row === 1 ? i - 4 : row === 2 ? i - 7 : 0; pos.push([ox - 9 + k * 6 + row * 3 + (R() - 0.5) * 2, oy - 5 - row * 5]); }
    pos.forEach(([x, y]) => { A.ell(x + 3, y + 2, 3.4, 3, 'ztBone', {}); });
    pos.forEach(([x, y]) => { A.px(x + 1, y + 2, '#16120e'); A.px(x + 2, y + 2, '#16120e'); A.px(x + 4, y + 2, '#16120e'); A.px(x + 5, y + 2, '#16120e'); A.px(x + 3, y + 4, '#2a2418'); });
    A.limb([[ox - 12, oy], [ox + 10, oy - 2]], 1.2, 1, 'ztBone', {}); A.px(ox - 12, oy - 1, '#f4ecd8'); A.px(ox + 11, oy - 3, '#f4ecd8');
  },
  shrub(A, v, ox, oy) { // a dead thorn bush
    const R = mulberry32(v * 31 + 7);
    const br = (x, y, a, L, r, d) => { const x1 = x + Math.cos(a) * L, y1 = y + Math.sin(a) * L; A.limb([[x, y], [x1, y1]], r, r * 0.6, 'ztBark', { tone: d % 2 ? -1 : 0 }); if (d > 0) { br(x1, y1, a - 0.5 - R() * 0.3, L * 0.65, r * 0.6, d - 1); br(x1, y1, a + 0.4 + R() * 0.3, L * 0.6, r * 0.6, d - 1); } else for (let k = 0; k < 2; k++) A.px(x1 + (R() - 0.5) * 3, y1 - 1, '#48392b'); };
    for (let i = 0; i < 6; i++) br(ox + (i - 2.5) * 1.5, oy - 1, -Math.PI / 2 + (i - 2.5) * 0.38 + (R() - 0.5) * 0.2, 7 + R() * 5, 1.4, 2);
  },
  stump(A, v, ox, oy) {
    for (const s2 of [-1, 1]) A.limb([[ox + s2 * 3, oy - 5], [ox + s2 * 8, oy - 2], [ox + s2 * 12, oy + 1]], 2.4, 0.8, 'ztBark', { tone: s2 > 0 ? -1 : 0 });
    A.limb([[ox + 1, oy - 3], [ox + 3, oy + 1], [ox + 2, oy + 3]], 1.8, 0.8, 'ztBark', { tone: -1 });
    A.poly([[ox - 8, oy - 1], [ox - 7, oy - 12], [ox - 4, oy - 15], [ox - 1, oy - 11], [ox + 2, oy - 17], [ox + 5, oy - 12], [ox + 7, oy - 13], [ox + 8, oy - 1]], 'ztBark', { band: 2 });
    A.poly([[ox - 1, oy - 11], [ox + 2, oy - 17], [ox + 3, oy - 11]], 'ztBarkB', { flat: true });
    A.px(ox - 4, oy - 14, '#8a7f6b'); A.px(ox + 6, oy - 12, '#8a7f6b');
    for (let k = 0; k < 5; k++) A.line(ox - 6 + k * 3, oy - 10 + (k % 2), ox - 6 + k * 3, oy - 3, '#140f0c');
    if (v % 2) { A.px(ox - 6, oy - 6, '#43552e'); A.px(ox - 5, oy - 5, '#2f3f22'); A.px(ox - 6, oy - 4, '#43552e'); A.ell(ox + 5, oy - 3, 1.6, 1, 'ztFung', {}); }
  },
  coffin(A, v, ox, oy) { // lying across the floor, iso, lid on or off
    const pts = (dz) => [[ox - 14, oy - 4 - dz], [ox - 4, oy - 11 - dz], [ox + 9, oy - 5 - dz], [ox + 14, oy - dz], [ox + 4, oy + 5 - dz], [ox - 9, oy + 2 - dz]];
    const base = pts(0), top = pts(6);
    A.poly([base[5], base[4], base[3], top[3], top[4], top[5]], 'ztCoffin', { tone: -1 });
    A.poly([base[0], base[5], top[5], top[0]], 'ztCoffin', {});
    if (v % 2) { // open: the lid shoved aside, bones inside
      A.poly(top, '#0a0706', { flat: true, contour: false });
      A.poly([[ox - 12, oy - 5 - 6], [ox - 4, oy - 10 - 6], [ox + 8, oy - 5 - 6], [ox + 12, oy - 1 - 6], [ox + 4, oy + 3 - 6], [ox - 8, oy - 6]], '#140e0b', { flat: true, contour: false });
      ztSkullPx(A, ox - 9, oy - 13); A.line(ox - 3, oy - 9, ox + 7, oy - 5, '#a89c80'); A.line(ox - 2, oy - 8, ox + 7, oy - 4, '#6a6250'); for (let k = 0; k < 3; k++) A.line(ox - 2 + k * 3, oy - 11 + k, ox - 3 + k * 3, oy - 6 + k, '#d6cab0');
      A.poly([[ox + 10, oy + 2], [ox + 18, oy - 6], [ox + 22, oy - 3], [ox + 14, oy + 6]], 'ztCoffin', { tone: 1 });
    } else {
      A.poly(top, 'ztCoffin', { tone: 1, band: 2 });
      A.line(ox - 6, oy - 11, ox + 6, oy - 5, '#24170f'); A.line(ox - 1, oy - 13, ox - 3, oy - 5, '#24170f');   // a carved cross
      A.px(ox - 10, oy - 9, '#8e95a2'); A.px(ox + 10, oy - 5, '#8e95a2'); A.px(ox, oy - 1, '#5a606c');
    }
  },
  pillar(A, v, ox, oy) { // a broken column stub
    const h = 14 + v * 4;
    A.ell(ox, oy - 1, 9, 4, 'ztSt', { tone: -1 });
    A.poly([[ox - 6, oy - 2], [ox - 6, oy - h], [ox + 6, oy - h + 2], [ox + 6, oy - 2]], 'ztSt', { band: 3 });
    for (let x = -4; x <= 4; x += 3) A.line(ox + x, oy - h + 3, ox + x, oy - 4, '#2a282d');
    for (let i = -6; i <= 6; i++) A.px(ox + i, oy - h + (hash(i, v) * 3 | 0) - (i > 0 ? -1 : 0), '#948f9a');
    A.ell(ox + 11, oy - 1, 3, 2, 'ztSt', {}); A.ell(ox - 11, oy, 2, 1.5, 'ztSt', { tone: -1 }); A.ell(ox + 7, oy + 2, 2, 1.2, 'ztSt', {});
  },
  bones(A, v, ox, oy) { // a ribcage and scattered long bones
    A.limb([[ox - 10, oy], [ox - 1, oy - 3]], 1.1, 1, 'ztBone', {}); A.px(ox - 11, oy, '#f4ecd8'); A.px(ox, oy - 4, '#f4ecd8');
    A.limb([[ox + 2, oy + 2], [ox + 11, oy + 1]], 1, 1, 'ztBone', { tone: -1 });
    for (let k = 0; k < 4; k++) { A.px(ox - 4 + k * 2, oy - 5, '#d6cab0'); A.px(ox - 5 + k * 2, oy - 4, '#a89c80'); A.px(ox - 5 + k * 2, oy - 3, '#6a6250'); }
    if (v % 2) ztSkullPx(A, ox + 3 + v, oy - 5);
  },
  fungus(A, v, ox, oy) { // pale caps that glow
    for (let i = 0; i < 3 + v; i++) { const x = ox - 6 + i * 3.5 + (i % 2), h = 3 + ((i * 5 + v) % 5), r = 1.6 + ((i + v) % 3) * 0.6; A.limb([[x, oy], [x, oy - h]], 0.7, 0.6, 'ztWax', { tone: -1 }); A.ell(x, oy - h, r + 0.8, r * 0.7, 'ztFung', {}); A.px(x - 1, oy - h - 1, '#c8ffe8'); }
  },
  gibbetPost(A, v, ox, oy) {
    A.limb([[ox - 5, oy], [ox, oy - 3], [ox + 5, oy]], 1.4, 1.2, 'ztBark', { tone: -1 });
    A.poly([[ox - 2, oy], [ox - 2, oy - 48], [ox + 2, oy - 48], [ox + 2, oy]], 'ztBark', { band: 2 });
    A.poly([[ox - 2, oy - 48], [ox + 20, oy - 48], [ox + 20, oy - 45], [ox - 2, oy - 45]], 'ztBark', {});
    A.limb([[ox, oy - 34], [ox + 11, oy - 46]], 1.2, 1.1, 'ztBark', { tone: -1 });
    for (let k = 0; k < 6; k++) A.px(ox - 1, oy - 44 + k * 7, '#140f0c');
    A.px(ox + 17, oy - 44, '#5a606c'); A.px(ox + 17, oy - 43, '#363a44');
  },
  brazier(A, v, ox, oy) {
    for (const s of [-1, 0, 1]) A.limb([[ox + s * 6, oy + (s ? 0 : 1)], [ox + s * 2, oy - 12]], 0.9, 0.9, 'ztIron', { tone: s ? -1 : 0 });
    A.poly([[ox - 8, oy - 13], [ox + 8, oy - 13], [ox + 6, oy - 18], [ox - 6, oy - 18]], 'ztIron', { band: 2 });
    A.ell(ox, oy - 18, 7, 2, '#1a0a06', { flat: true });
    for (let k = -5; k <= 5; k += 2) { A.px(ox + k, oy - 18, k % 4 ? '#c8401e' : '#ff8a2a'); A.px(ox + k + 1, oy - 19, '#6e1a0c'); }
    for (let k = -6; k <= 6; k += 4) A.px(ox + k, oy - 16, '#8e95a2');
  },
  candles(A, v, ox, oy) {
    const n = 3 + v; A.ell(ox, oy, 8, 2.4, 'ztWax', { tone: -1 });
    for (let i = 0; i < n; i++) { const x = ox - 6 + i * (12 / Math.max(1, n - 1)), h = 5 + (i * 7 + v * 3) % 7; A.poly([[x - 1.2, oy - 1 + (i % 2)], [x - 1.2, oy - h], [x + 1.4, oy - h], [x + 1.4, oy - 1 + (i % 2)]], 'ztWax', {}); A.px(x, oy - h - 1, '#1a120c'); if (i % 2) A.px(x + 1, oy - h + 2, '#f2e8cc'); }
  },
  cage(A, v, ox, oy) { // the gibbet cage with a folded skeleton, hung from its top ring
    A.ell(ox, oy + 2, 5, 1.6, 'ztIron', {});
    ztSkullPx(A, ox - 3, oy + 4); A.line(ox - 1, oy + 9, ox + 1, oy + 15, '#a89c80'); for (let k = 0; k < 3; k++) A.line(ox - 3, oy + 10 + k * 2, ox + 3, oy + 10 + k * 2, '#6a6250');
    for (let i = -2; i <= 2; i++) A.line(ox + i * 2.4, oy + 2, ox + i * 2.7, oy + 18, i < 0 ? '#5a606c' : '#363a44');
    A.ell(ox, oy + 18, 6, 1.8, 'ztIron', {}); A.line(ox, oy - 4, ox, oy + 1, '#363a44');
  },
};
const ZT_PROP_BOX = { gibbetPost: [48, 60, 18, 56], cage: [20, 30, 10, 6], arch: [60, 76, 30, 70], cobweb: [30, 22, 14, 2], sconce: [24, 40, 8, 36], cloth: [24, 40, 12, 36], wallchain: [24, 40, 10, 36] };
function ztPropFrame(kind, v) {
  // landmarks: on the moor, bones left on the road become a broken gothic arch over it
  if (kind === 'bones' && v === 3 && G.zone && G.zone.theme === 'moor') { const b = ZT_PROP_BOX.arch; return ztFrame('pbones3moor', b[0], b[1], b[2], b[3], (A, ox, oy) => ZT_PROPP.arch(A, 2, ox, oy), true); }
  return ztPropFrame0(kind, v);
}
function ztPropFrame0(kind, v) { const b = ZT_PROP_BOX[kind] || [44, 52, 22, 44]; return ztFrame('p' + kind + v, b[0], b[1], b[2], b[3], (A, ox, oy) => ZT_PROPP[kind](A, v, ox, oy), !/^(sconce|cloth|wallchain|cobweb|railing)$/.test(kind)); }
// pixel flames: a few frames per size, from a tapered tongue with a hot core
const ZT_FL = {};
function ztFlame(s, k) {
  const key = s + '|' + k; if (ZT_FL[key]) return ZT_FL[key];
  const Wd = s * 2 + 3, Ht = s * 3 + 3, c = mkCanvas(Wd, Ht), g = c.getContext('2d'), P = ['#6e1a0c', '#c8401e', '#ff8a2a', '#ffd070', '#fff6c8'];
  for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) {
    const t = j / (Ht - 1), sway = Math.sin(t * 4 + k * 1.7) * (1 - t) * s * 0.35, cx = (Wd - 1) / 2 + sway, hw = s * Math.pow(Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62), 0.8) + 0.3, d = Math.abs(i - cx) / hw;
    if (d > 1 || t < 0.05 + (k % 2) * 0.05) continue;
    const e = (1 - d) * 0.7 + t * 0.5 + (hash(i + k * 7, j) - 0.5) * 0.2;
    g.fillStyle = P[Math.max(0, Math.min(4, Math.floor(e * 4.2)))]; g.fillRect(i, j, 1, 1);
  }
  return (ZT_FL[key] = c);
}
const ZT_CGLOW = (() => { const c = mkCanvas(15, 15), g = c.getContext('2d'), r = g.createRadialGradient(7.5, 7.5, 0, 7.5, 7.5, 7.5); r.addColorStop(0, 'rgba(255,150,70,0.24)'); r.addColorStop(1, 'rgba(255,150,70,0)'); g.fillStyle = r; g.fillRect(0, 0, 15, 15); return c; })();
// a candle's flame: two or three pixels that flicker, a hot core, a faint warm halo
function ztCandleFlame(sx, sy, seed) {
  const t = G.time * 9 + seed, f = Math.sin(t) + Math.sin(t * 2.7) * 0.5, x = Math.round(sx), y = Math.round(sy), tall = f > 0.2 ? 1 : 0, lean = f > 1 ? 1 : f < -1 ? -1 : 0;
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.8 + 0.2 * f / 1.5; ctx.drawImage(ZT_CGLOW, x - 7, y - 8); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#b8401a'; ctx.fillRect(x, y, 1, 1); ctx.fillStyle = '#ffb040'; ctx.fillRect(x, y - 1 - tall, 1, 1 + tall); ctx.fillStyle = '#fff2c0'; ctx.fillRect(x, y - 1, 1, 1);
  if (tall) { ctx.fillStyle = '#ff8a2a'; ctx.fillRect(x + lean, y - 3, 1, 1); }
}
function ztDrawFlame(sx, sy, s, seed) {
  const k = Math.floor(G.time * 10 + seed) % 4, c = ztFlame(s, k);
  ctx.globalCompositeOperation = 'lighter'; glow(sx, sy - s * 1.4, s * 4, '255,140,60', 0.28); ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(c, Math.round(sx - c.width / 2), Math.round(sy - c.height + 1));
  if (Math.random() < 0.03) { const w = screenToWorld(sx, sy + 8); parts.push({ g: '255,150,60', s: 0.8, x: w.x, y: w.y, z: 10 + s * 3, vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), vz: 14, t: 0.7, t0: 0.7 }); }
}
// reeds: a clump painted in four sway frames
function ztReeds(n, k, fen) {
  const key = 'reed' + n + k; return ztFrame(key, 44, 40, 22, 34, (A, ox, oy) => {
    const lean = [-1.5, -0.5, 0.6, 1.4][k];
    A.ell(ox, oy + 0.5, 10, 2.4, 'zMoss', { dome: 0.4, tone: -0.4 });
    for (let i = 0; i < n; i++) {
      const bx = ox - 9 + (i * 7) % 18 + (i % 3), h = 9 + (i * 5) % 10, l = lean * (0.6 + (i % 3) * 0.25) + ((i % 2) - 0.5) * 2;
      A.limb([[bx, oy], [bx + l * 0.3, oy - h * 0.5], [bx + l, oy - h]], 0.5, 0.3, i % 4 ? 'ztReedH' : 'ztReed', { tone: i % 3 ? -0.2 : -0.5 });
      if (i % 2) A.limb([[bx, oy - 1], [bx - l * 0.4 - 2, oy - h * 0.35], [bx - l * 0.6 - 4, oy - h * 0.3 + 2]], 0.45, 0.25, 'ztReed', { tone: -0.3 });   // a broad blade, bent over
      if (i % 4 === 0) A.ell(bx + l, oy - h - 1.6, 0.9, 2, 'ztReedH', {});
    }
  });
}
const ZT_CROW = { sit: ['..00...', '.0110..', '0012200', '.01110.', '..0.0..'], peck: ['.......', '..00...', '.0110..', '00122.0', '.011100'], fly0: ['0.....0', '00...00', '.01210.', '...0...'], fly1: ['.......', '..010..', '0012100', '0.....0'] };
function ztCrowImg(k) { return ztFrame('crow' + k, 9, 7, 4, 6, (A) => { const S = ZT_CROW[k]; for (let j = 0; j < S.length; j++) for (let i = 0; i < 7; i++) { const ch = S[j][i]; if (ch !== '.') A.px(i + 1, j + 1, ['#0a090d', '#1e1a26', '#3a3446'][+ch]); } if (k === 'sit' || k === 'peck') { A.px(k === 'peck' ? 7 : 6, k === 'peck' ? 5 : 3, '#6a5a3a'); A.px(3, 2, '#b89a4a'); } }); }
// =================================================================== objects: chest, shrine, lantern, portals, vendor, altar, statue
pmat('ztWoodC', ['#120a06', '#2a190e', '#452a17', '#643e22', '#855530']);
pmat('ztRobe', ['#0c0a0c', '#1c1719', '#2e2628', '#443a38', '#5c4f4a']);
pmat('ztSkin', ['#2a1812', '#5a3a2a', '#8a5e44', '#b08462', '#d0a882']);
pmat('ztCloth', ['#16080a', '#3a1014', '#5e1a1e', '#86282a', '#a83c34']);
pmat('ztStO', ['#0e0d11', '#24222a', '#3c3944', '#5a5664', '#827d8c']);    // old carved stone
const ZT_OBJ = {};
// a frame with its foot at (ox, oy) -> the sprite shape drawSpr wants (centred, feet 3px above the bottom)
function ztSprite(key, fr) {
  if (ZT_OBJ[key]) return ZT_OBJ[key];
  const half = Math.max(fr.ox, fr.w - fr.ox), w = half * 2 + 1, h = fr.oy + 3, c = mkCanvas(w, h); c.getContext('2d').drawImage(fr.c, half - fr.ox, 0);
  const f = mkCanvas(w, h), fx = f.getContext('2d'); fx.translate(w, 0); fx.scale(-1, 1); fx.drawImage(c, 0, 0);
  const wht = src => { const q = mkCanvas(w, h), qx = q.getContext('2d'); qx.drawImage(src, 0, 0); qx.globalCompositeOperation = 'source-in'; qx.fillStyle = '#fff'; qx.fillRect(0, 0, w, h); return q; };
  return (ZT_OBJ[key] = { c, f, fl: wht(c), flf: wht(f), w, h });
}
const ZT_OBJP = {
  chest(A, ox, oy, open) {
    A.ell(ox, oy, 13, 3, '#0a0708', { flat: true, contour: false });
    // body: a front face and a side face, iron-bound
    A.poly([[ox - 11, oy - 1], [ox + 5, oy + 1], [ox + 5, oy - 10], [ox - 11, oy - 12]], 'ztWoodC', { band: 2 });
    A.poly([[ox + 5, oy + 1], [ox + 11, oy - 3], [ox + 11, oy - 14], [ox + 5, oy - 10]], 'ztWoodC', { tone: -1 });
    for (const x of [-8, 1]) A.poly([[ox + x, oy - 1 + (x + 11) * 0.12], [ox + x + 2, oy - 1 + (x + 13) * 0.12], [ox + x + 2, oy - 11 + (x + 13) * 0.12], [ox + x, oy - 11 + (x + 11) * 0.12]], 'ztIron', {});
    if (!open) {
      A.poly([[ox - 11, oy - 12], [ox + 5, oy - 10], [ox + 11, oy - 14], [ox + 11, oy - 17], [ox + 6, oy - 20], [ox - 10, oy - 22], [ox - 12, oy - 18]], 'ztWoodC', { tone: 1, band: 2 });
      A.line(ox - 11, oy - 13, ox + 5, oy - 11, '#1a0f08'); A.line(ox - 11, oy - 12, ox + 5, oy - 10, '#855530');
      for (const x of [-8, 1]) A.line(ox + x, oy - 12 + (x + 11) * 0.12, ox + x + 1, oy - 21 + (x + 11) * 0.1, '#5a606c');
      A.poly([[ox - 4, oy - 12], [ox - 1, oy - 11.5], [ox - 1, oy - 7], [ox - 4, oy - 7.5]], 'ztGold', {}); A.px(ox - 3, oy - 9, '#1a0f08'); A.px(ox - 3, oy - 11, '#fff0a0');
    } else {
      A.poly([[ox - 11, oy - 12], [ox + 5, oy - 10], [ox + 11, oy - 14], [ox - 5, oy - 16]], '#0c0604', { flat: true, contour: false });
      for (let k = 0; k < 6; k++) A.px(ox - 6 + k * 2, oy - 13 + (k % 2), k % 2 ? '#a8741e' : '#6a4410');
      A.poly([[ox - 11, oy - 12], [ox - 5, oy - 16], [ox - 3, oy - 27], [ox - 9, oy - 24]], 'ztWoodC', { tone: -1 });
      A.poly([[ox - 5, oy - 16], [ox + 11, oy - 14], [ox + 9, oy - 25], [ox - 3, oy - 27]], 'ztWoodC', { tone: 0 });
    }
    for (let k = 0; k < 5; k++) A.px(ox - 9 + k * 3, oy - 6 + k * 0.4, '#2a190e');   // grain
  },
  shrine(A, ox, oy, used) {
    // a stepped plinth, a gothic stele with the triune eye cut into it
    A.poly([[ox - 13, oy], [ox, oy + 5], [ox + 13, oy], [ox + 13, oy - 4], [ox, oy + 1], [ox - 13, oy - 4]], 'ztStO', { band: 2 });
    A.poly([[ox - 13, oy - 4], [ox, oy - 9], [ox + 13, oy - 4], [ox, oy + 1]], 'ztStO', { tone: 1 });
    A.poly([[ox - 8, oy - 4], [ox - 8, oy - 32], [ox, oy - 42], [ox + 8, oy - 32], [ox + 8, oy - 4]], 'ztStO', { band: 3 });
    A.poly([[ox + 8, oy - 4], [ox + 11, oy - 6], [ox + 11, oy - 32], [ox + 8, oy - 32]], 'ztStO', { tone: -1 });
    const eye = used ? '#1a1820' : '#bfe8ff', eye2 = used ? '#24222a' : '#6aa8d8';
    for (let x = -5; x <= 5; x++) { const h = Math.round(Math.sqrt(1 - (x / 5.5) ** 2) * 2.4); A.px(ox + x, oy - 22 - h, eye); A.px(ox + x, oy - 22 + h, eye2); }
    for (let j = -1; j <= 1; j++) for (let x = -1; x <= 1; x++) A.px(ox + x, oy - 22 + j, used ? '#0e0d11' : (x || j ? eye : '#ffffff'));
    for (let i = -1; i <= 1; i++) { A.px(ox + i * 4, oy - 29 - Math.abs(i), eye2); A.px(ox + i * 4, oy - 30 - Math.abs(i), eye); }
    if (used) { A.line(ox - 3, oy - 38, ox + 1, oy - 26, '#0e0d11'); A.line(ox + 1, oy - 26, ox - 2, oy - 12, '#0e0d11'); }
    for (const s of [-1, 1]) { A.poly([[ox + s * 11 - 1, oy - 3], [ox + s * 11 + 1, oy - 3], [ox + s * 11 + 1, oy - 8], [ox + s * 11 - 1, oy - 8]], 'ztWax', {}); A.px(ox + s * 11, oy - 9, '#1a120c'); }
  },
  lantern(A, ox, oy) {
    // the pilgrims' lantern: a stone foot, an iron post with a crook, a caged candle-lamp
    A.poly([[ox - 7, oy], [ox, oy + 3], [ox + 7, oy], [ox + 7, oy - 4], [ox, oy - 1], [ox - 7, oy - 4]], 'ztStO', { band: 2 });
    A.poly([[ox - 7, oy - 4], [ox, oy - 7], [ox + 7, oy - 4], [ox, oy - 1]], 'ztStO', { tone: 1 });
    A.poly([[ox - 1, oy - 4], [ox - 1, oy - 46], [ox + 1, oy - 46], [ox + 1, oy - 4]], 'ztIron', {});
    A.limb([[ox, oy - 46], [ox + 4, oy - 50], [ox + 9, oy - 48], [ox + 9, oy - 44]], 0.8, 0.8, 'ztIron', {});
    A.poly([[ox + 5, oy - 43], [ox + 13, oy - 43], [ox + 12, oy - 31], [ox + 6, oy - 31]], '#2a1a08', { flat: true });
    A.poly([[ox + 7, oy - 41], [ox + 11, oy - 41], [ox + 11, oy - 33], [ox + 7, oy - 33]], '#ffd070', { flat: true, contour: false });
    A.poly([[ox + 8, oy - 39], [ox + 10, oy - 39], [ox + 10, oy - 34], [ox + 8, oy - 34]], '#fff6c8', { flat: true, contour: false });
    for (const x of [5, 9, 13]) A.line(ox + x - (x === 13 ? 1 : 0), oy - 43, ox + x - (x === 13 ? 1 : x === 5 ? -1 : 0), oy - 31, '#26282f');
    A.poly([[ox + 4, oy - 44], [ox + 14, oy - 44], [ox + 9, oy - 47]], 'ztIron', {}); A.poly([[ox + 5, oy - 31], [ox + 13, oy - 31], [ox + 12, oy - 29], [ox + 6, oy - 29]], 'ztIron', {});
    for (let k = 0; k < 3; k++) A.px(ox - 1, oy - 12 - k * 11, '#5a606c');
  },
  cave(A, ox, oy) {
    // a barrow mouth: a mound of heaped stone and earth, a slanting black maw, two great tusks of bone either side
    A.ell(ox, oy - 12, 30, 14, 'ztEarth', { band: 3 });
    const R = mulberry32(17);
    for (let k = 0; k < 9; k++) { const a = Math.PI + k / 8 * Math.PI, x = ox + Math.cos(a) * 24 + (R() - 0.5) * 4, y = oy - 12 + Math.sin(a) * 12; A.ell(x, y, 5 + R() * 3, 4 + R() * 2, 'ztStW', { band: 2, tone: x > ox ? -1 : 0 }); }
    A.poly([[ox - 14, oy - 1], [ox - 12, oy - 13], [ox - 5, oy - 20], [ox + 5, oy - 20], [ox + 12, oy - 13], [ox + 14, oy - 1]], '#030203', { flat: true });
    A.poly([[ox - 12, oy - 1], [ox - 10, oy - 11], [ox, oy - 16], [ox + 10, oy - 11], [ox + 12, oy - 1]], '#000000', { flat: true, contour: false });
    for (let k = 0; k < 4; k++) A.line(ox - 11 + k, oy - 1 - k * 2, ox + 11 - k, oy - 1 - k * 2, ['#1a1612', '#120f0c', '#0a0806', '#050404'][k]);   // steps going down
    for (const s2 of [-1, 1]) { A.limb([[ox + s2 * 17, oy + 1], [ox + s2 * 19, oy - 12], [ox + s2 * 14, oy - 26], [ox + s2 * 8, oy - 30]], 2.8, 1, 'ztBone', { tone: s2 > 0 ? -1 : 0, band: 2 }); A.px(ox + s2 * 8, oy - 31, '#f4ecd8'); }
    ztSkullPx(A, ox - 3, oy - 27); A.px(ox - 1, oy - 22, '#6e1418'); A.px(ox + 1, oy - 21, '#4a0e12');
    for (let k = 0; k < 14; k++) A.px(ox - 28 + k * 4.2, oy - 20 - (k % 3) * 3 + Math.abs(k - 7) * 0.8, k % 2 ? '#43552e' : '#2f3f22');
  },
  gate(A, ox, oy) {
    // a pilgrim gate: two stone posts, a pointed lintel, a bell hung in it
    for (const s of [-1, 1]) {
      const x = ox + s * 16;
      A.poly([[x - 5, oy], [x - 5, oy - 44], [x + 5, oy - 44], [x + 5, oy]], 'ztStO', { band: 3, tone: s > 0 ? -1 : 0 });
      A.poly([[x - 6, oy - 44], [x + 6, oy - 44], [x + 6, oy - 48], [x - 6, oy - 48]], 'ztStO', { tone: 1 });
      for (let k = 0; k < 6; k++) A.line(x - 5, oy - 6 - k * 7, x + 4, oy - 6 - k * 7, '#24222a');
    }
    A.poly([[ox - 22, oy - 48], [ox + 22, oy - 48], [ox + 22, oy - 52], [ox, oy - 64], [ox - 22, oy - 52]], 'ztStO', { band: 2 });
    A.poly([[ox - 12, oy - 50], [ox + 12, oy - 50], [ox, oy - 58]], '#0a090d', { flat: true, contour: false });
    A.line(ox, oy - 56, ox, oy - 46, '#5e4c32'); A.ell(ox, oy - 42, 3.4, 4, 'ztBell', {}); A.px(ox, oy - 38, '#2a1a06');
    A.line(ox - 11, oy - 48, ox - 11, oy - 36, '#363a44'); A.line(ox + 11, oy - 48, ox + 11, oy - 40, '#363a44');
    for (let k = 0; k < 5; k++) A.px(ox - 20 + k * 10, oy - 51, '#827d8c');
  },
  stairs(A, ox, oy) {
    // a stair cut down into the ground: a stone frame, steps dropping into the dark
    const fr = (dx, dy) => [ox + dx, oy + dy];
    A.poly([fr(-22, -8), fr(0, -19), fr(22, -8), fr(0, 3)], 'ztStO', { band: 2 });
    A.poly([fr(-16, -8), fr(0, -16), fr(16, -8), fr(0, 0)], '#040305', { flat: true, contour: false });
    for (let k = 0; k < 5; k++) { const t = k * 2.2; A.line(ox - 13 + t, oy - 7 - t * 0.2 + k * 1.2, ox + 1 + t * 0.6, oy - 14 + k * 1.8, ['#6a6674', '#4a4652', '#34313a', '#24222a', '#16151a'][k]); A.line(ox - 13 + t, oy - 6 - t * 0.2 + k * 1.2, ox + 1 + t * 0.6, oy - 13 + k * 1.8, '#0a090c'); }
    A.poly([fr(-22, -8), fr(0, 3), fr(0, 6), fr(-22, -5)], 'ztStO', { tone: -1 }); A.poly([fr(0, 3), fr(22, -8), fr(22, -5), fr(0, 6)], 'ztStO', { tone: -2 });
    for (const [x, y] of [[-20, -9], [20, -9], [0, -18]]) ztSkullPx(A, ox + x - 3, oy + y - 4);
  },
  vendor(A, ox, oy) {
    // the peddler: hunched under a great pack of relics, a lamp on a hooked staff
    A.ell(ox + 2, oy - 22, 9, 11, 'ztWoodC', { tone: -1 });                          // the pack
    for (let k = 0; k < 5; k++) A.px(ox - 2 + k * 2, oy - 30 + (k % 2) * 3, ['#a89c80', '#6a4410', '#86282a', '#d6cab0', '#a8741e'][k]);
    A.limb([[ox + 7, oy - 28], [ox + 11, oy - 16], [ox + 8, oy - 6]], 1.2, 1, 'ztRopeT', {});
    A.poly([[ox - 7, oy], [ox - 6, oy - 20], [ox - 2, oy - 28], [ox + 4, oy - 26], [ox + 6, oy - 12], [ox + 6, oy]], 'ztRobe', { band: 2 });
    A.ell(ox - 3, oy - 30, 5, 5, 'ztRobe', { band: 2 });                               // hood
    A.ell(ox - 5, oy - 29, 2.4, 3, '#060506', { flat: true, contour: false });
    A.px(ox - 6, oy - 29, '#ffcc60'); A.px(ox - 4, oy - 29, '#ffcc60');                  // eyes in the hood
    A.limb([[ox - 11, oy], [ox - 11, oy - 38], [ox - 8, oy - 42], [ox - 6, oy - 40]], 0.8, 0.7, 'ztBark', {});
    A.poly([[ox - 8, oy - 38], [ox - 4, oy - 38], [ox - 4, oy - 33], [ox - 8, oy - 33]], '#ffd070', { flat: true }); A.px(ox - 6, oy - 36, '#fff6c8');
    A.limb([[ox - 3, oy - 20], [ox - 9, oy - 19], [ox - 11, oy - 22]], 1.4, 1.2, 'ztRobe', { tone: 1 }); A.ell(ox - 11, oy - 22, 1.4, 1.4, 'ztSkin', {});
    for (let k = 0; k < 4; k++) A.px(ox - 5 + k * 3, oy - 1, '#1c1719');
  },
};
function ztObjFrame(kind, st) { return ztFrame('o' + kind + (st ? 1 : 0), 80, 80, 40, 70, (A, ox, oy) => ZT_OBJP[kind](A, ox, oy, st), true); }
function ztObjSprite(o) {
  const k = o.type === 'chest' ? ['chest', o.open] : o.type === 'shrine' ? ['shrine', o.used] : o.type === 'lantern' ? ['lantern', 0] : o.type === 'vendor' ? ['vendor', 0] : o.spr === 'cave' ? ['cave', 0] : o.spr === 'gate' ? ['gate', 0] : o.spr === 'stairs' ? ['stairs', 0] : null;
  if (!k) return null;
  return ztSprite(k[0] + (k[1] ? 1 : 0), ztObjFrame(k[0], k[1]));
}
// =================================================================== v0.37: props and objects, sculpted
// Painted with the sculpt painter in the old 32-bit units (the frame scales them by ZT_PROP_S): stone as bevelled
// iso blocks, metal as tubes and domes with tight specular hits, wax with drips, wood with its grain along the plank.
const ztSkullS = (A, x, y, s = 1, mat = 'zBone') => {
  A.ell(x, y, 2.5 * s, 2.3 * s, mat, {}); A.ell(x + 0.2 * s, y + 2.1 * s, 1.5 * s, 1 * s, mat, { tone: -0.5 });
  A.ell(x - 1 * s, y + 0.3 * s, 0.75 * s, 0.8 * s, '#0b080a', {}); A.ell(x + 1.1 * s, y + 0.3 * s, 0.7 * s, 0.8 * s, '#0b080a', {}); A.fpx(x + 0.1 * s, y + 1.3 * s, '#140f0e');
};
// a candle: a waxy upright tube, the pool at its foot, a drip or two, the wick; returns the flame point
const ztCandle = (A, x, y, h, r = 0.8) => {
  A.cyl(x, y, y - h, r, 'zWax', {}); A.fpx(x - r * 0.5, y - h + 1.2, A.mt('zWax', 1)); A.fpx(x - r * 0.4, y - h * 0.5, A.mt('zWax', 0.85));
  A.fpx(x + r * 0.6, y - h + 1.6, A.mt('zWax', 0.6)); A.fpx(x + r * 0.6, y - h + 2.3, A.mt('zWax', 0.55)); A.fpx(x, y - h - 0.2, '#1e1210');
  (A.fl = A.fl || []).push([x, y - h - 1]);
};
Object.assign(ZT_PROPP, {
  grave(A, v, ox, oy) {
    A.ell(ox, oy - 0.5, 11, 4, 'zEarth', { dome: 0.35 });
    for (let k = 0; k < 4; k++) A.ell(ox - 8 + k * 5.2, oy - 1.4 + (k % 2), 2 + (k % 2), 1.2, 'zMoss', { dome: 0.6 });
    if (v === 0) {   // a round-topped slab, leaning a little, an inscription worn to shadows, a crack
      A.box(ox, oy - 1, 3.4, 1, 14, 'zStone'); A.ell(ox - 1.7, oy - 15.3, 6.8, 4.2, 'zStone', { n: ZS_NL }); A.poly([[ox + 5.1, oy - 13], [ox + 7.3, oy - 14.3], [ox + 6.6, oy - 18], [ox + 4.2, oy - 17.5]], 'zStone', { n: ZS_NR });
      A.cut([[ox - 9, oy - 22], [ox - 7, oy - 22], [ox - 9, oy - 17]]);
      for (let k = 0; k < 3; k++) A.line(ox - 5, oy - 13 + k * 2.6 + 0.3 * k, ox + 1 - (k === 2 ? 2.5 : 0), oy - 10 + k * 2.6 + 0.3 * k, A.mt('zStone', 0.12));
      A.line(ox - 2.6, oy - 17.5, ox - 2.6, oy - 14.5, A.mt('zStone', 0.1)); A.line(ox - 4, oy - 16.5, ox - 1.2, oy - 15.8, A.mt('zStone', 0.1));
      A.line(ox + 2, oy - 18, ox + 0.5, oy - 9, '#0c0a10'); A.line(ox + 0.5, oy - 9, ox + 1.6, oy - 5, '#0c0a10');
    } else if (v === 1) {   // a ringed cross
      A.box(ox, oy - 1, 3.2, 2.2, 3, 'zStone', { tone: -0.3 });
      A.box(ox, oy - 4, 1.1, 0.9, 30, 'zStone'); A.box(ox, oy - 25, 4.6, 0.9, 4, 'zStone');
      A.limb([[ox - 7, oy - 30], [ox - 5, oy - 35], [ox, oy - 37], [ox + 5, oy - 35], [ox + 7, oy - 30], [ox + 5, oy - 25], [ox, oy - 23], [ox - 5, oy - 25], [ox - 7, oy - 30]], 1, 1, 'zStone', {});
      A.box(ox, oy - 25, 1.1, 0.9, 7, 'zStone', {});
    } else if (v === 2) {   // a leaning obelisk
      A.box(ox, oy - 1, 3.6, 3.6, 3, 'zStoneW', { tone: -0.2 });
      A.poly([[ox - 5.5, oy - 3], [ox, oy - 0.5], [ox - 0.6, oy - 38], [ox - 3.2, oy - 39]], 'zStoneW', { n: ZS_NL }); A.poly([[ox, oy - 0.5], [ox + 5.5, oy - 3], [ox + 1.6, oy - 39.5], [ox - 0.6, oy - 38]], 'zStoneW', { n: ZS_NR });
      A.poly([[ox - 3.2, oy - 39], [ox - 0.6, oy - 38], [ox + 1.6, oy - 39.5], [ox - 0.4, oy - 44]], 'zStoneW', { n: ZS_NUP });
      for (let k = 0; k < 5; k++) A.fpx(ox - 2.2 - k * 0.1, oy - 30 + k * 5, A.mt('zStoneW', 0.15));
      for (let k = 0; k < 6; k++) A.ell(ox - 4 + (k % 3) * 1.3, oy - 5 - k * 2.6, 1.2, 1, 'zMoss', { dome: 0.6 });
    } else {   // a tomb slab, a skull left on it, a guttered candle
      A.box(ox, oy + 1, 6, 3.5, 5, 'zStone', {}); A.box(ox, oy - 4, 6.4, 3.9, 1.6, 'zStone', { tone: 0.2 });
      ztSkullS(A, ox - 4, oy - 9.5, 1); ztCandle(A, ox + 5, oy - 6.5, 4, 0.9);
      A.line(ox - 8, oy - 6, ox - 2, oy - 4, '#0c0a10');
    }
  },
  skulls(A, v, ox, oy) {
    A.ell(ox, oy, 9, 3, 'zEarth', { dome: 0.3 });
    const pos = [[ox - 5, oy - 3], [ox + 2, oy - 3.5], [ox - 1.5, oy - 7.5]]; if (v > 1) pos.push([ox + 7, oy - 2.5]);
    A.limb([[ox - 10, oy - 0.5], [ox - 3, oy - 2]], 0.9, 0.8, 'zBone', { tone: -0.3 });
    pos.forEach(([x, y]) => ztSkullS(A, x, y, 1.2));
    A.limb([[ox + 3, oy + 1], [ox + 10, oy]], 0.8, 0.7, 'zBone', {});
  },
  cairn(A, v, ox, oy) {
    const R = mulberry32(v * 13 + 5);
    A.ell(ox, oy, 12, 3.5, 'zEarth', { dome: 0.3 });
    for (let i = 0; i < 3 + v; i++) A.limb([[ox - 10 + R() * 6, oy - 1 - R() * 3], [ox + 4 + R() * 6, oy - 3 - R() * 5]], 1, 0.9, 'zBone', { tone: -0.4 });
    const rows = [4, 3, 2, 1].slice(0, 2 + (v % 3));
    rows.forEach((n, r) => { for (let k = 0; k < n; k++) ztSkullS(A, ox - (n - 1) * 2.8 + k * 5.6 + (R() - 0.5), oy - 3 - r * 4.4, 1.15); });
    A.limb([[ox - 12, oy], [ox + 10, oy - 1.5]], 1, 0.9, 'zBone', {});
  },
  bones(A, v, ox, oy) {
    A.limb([[ox - 10, oy], [ox - 1, oy - 3]], 0.9, 0.8, 'zBone', {}); A.ell(ox - 10.5, oy, 1.3, 1, 'zBone', {}); A.ell(ox - 0.5, oy - 3.2, 1.3, 1, 'zBone', {});
    A.limb([[ox + 2, oy + 2], [ox + 11, oy + 1]], 0.8, 0.8, 'zBone', { tone: -0.4 });
    for (let k = 0; k < 4; k++) A.limb([[ox - 4 + k * 2.2, oy - 6], [ox - 5 + k * 2.2, oy - 3.5], [ox - 4.5 + k * 2.2, oy - 1.5]], 0.5, 0.45, 'zBone', { tone: -0.2 });
    if (v % 2) ztSkullS(A, ox + 5 + v, oy - 3, 1.1);
  },
  coffin(A, v, ox, oy) {   // a stone sarcophagus on a plinth; the odd ones broken open
    A.box(ox, oy + 1, 11, 4.6, 2, 'zStoneV', { tone: -0.2 });
    A.box(ox, oy - 1, 10, 3.8, 7, 'zStoneV', {});
    const lid = v % 2 ? 3 : 0;
    if (!lid) {
      A.box(ox, oy - 8, 10.8, 4.4, 1.8, 'zStoneV', { tone: -0.1 }); A.box(ox, oy - 9.8, 9.6, 2.4, 1.2, 'zStoneV', { tone: -0.05 });
      // a carved cross on the long face
      const fp = (u, z) => [ox + (u - 3.8) * 2, oy - 1 + u + 3.8 - z];
      A.line(...fp(-4, 6.2), ...fp(-4, 1.8), A.mt('zStoneV', 0.08)); A.line(...fp(-5.4, 4.8), ...fp(-2.6, 4.8), A.mt('zStoneV', 0.08)); A.line(fp(-4, 6.2)[0] + 0.6, fp(-4, 6.2)[1], fp(-4, 1.8)[0] + 0.6, fp(-4, 1.8)[1], A.mt('zStoneV', 0.6));
    } else {
      A.box(ox, oy - 8, 9.2, 3, 0.4, '#07060a', { top: true });
      ztSkullS(A, ox - 12, oy - 13, 1); A.limb([[ox - 8, oy - 12], [ox + 6, oy - 5]], 0.7, 0.6, 'zBone', {});
      A.box(ox + 8, oy - 1, 10, 4.2, 1.6, 'zStoneV', { tone: 0.1 });   // the lid shoved off, lying on the plinth's end
      A.line(ox + 4, oy - 4, ox + 12, oy - 1, '#0a080e');
    }
  },
  candles(A, v, ox, oy) {
    if (v < 2) {   // a cluster of floor candles in a pool of their own wax
      A.ell(ox, oy, 9, 3, 'zWax', { dome: 0.25, tone: -0.5 });
      const n = 5 + v * 2, R = mulberry32(v * 7 + 3), pts = [];
      for (let i = 0; i < n; i++) pts.push([ox - 7 + R() * 14, oy - 1.5 + R() * 3, 2.5 + R() * 6.5]);
      pts.sort((a, b) => a[1] - b[1]).forEach(([x, y, h]) => ztCandle(A, x, y, h, 0.75 + R() * 0.35));
    } else {       // a standing candelabrum of old brass
      const H = v === 2 ? 30 : 36, n = v === 2 ? 2 : 3;
      for (const s of [-1, 0, 1]) A.limb([[ox, oy - 3], [ox + s * 4, oy - 0.5], [ox + s * 5.5, oy + (s ? 0 : 1)]], 0.7, 0.55, 'zBrass', { tone: s > 0 ? -0.3 : 0 });
      A.ell(ox, oy - 3, 2.2, 1.2, 'zBrass', {});
      A.limb([[ox, oy - 3], [ox, oy - H]], 0.6, 0.5, 'zBrass', {});
      for (const k of [0.3, 0.62, 0.88]) A.ell(ox, oy - 3 - (H - 3) * k, 1.3, 0.8, 'zBrass', {});
      for (let i = n; i >= 1; i--) for (const s of [-1, 1]) {
        const w = i * 3.3, y0 = oy - H + 1, pts = [[ox, y0], [ox + s * w * 0.55, y0 + 1.4], [ox + s * w, y0 - 0.4], [ox + s * w, y0 - 3 - i * 0.8]];
        A.limb(pts, 0.45, 0.4, 'zBrass', { tone: s > 0 ? -0.2 : 0 });
        A.ell(ox + s * w, y0 - 3 - i * 0.8, 1.3, 0.55, 'zBrass', {});
        ztCandle(A, ox + s * w, y0 - 3.3 - i * 0.8, 2.6 + ((i + (s > 0 ? 1 : 0)) % 2) * 1.4, 0.6);
      }
      A.ell(ox, oy - H - 0.3, 1.4, 0.6, 'zBrass', {}); ztCandle(A, ox, oy - H - 0.6, 4.5, 0.65);
    }
  },
  gibbetPost(A, v, ox, oy) {
    A.ell(ox, oy, 7, 2.2, 'zEarth', { dome: 0.3 });
    A.limb([[ox - 5, oy], [ox, oy - 3], [ox + 5, oy]], 1.1, 0.9, 'zWood', { tone: -0.3 });
    A.box(ox, oy, 1.1, 1.1, 48, 'zWood');
    A.limb([[ox - 1, oy - 47], [ox + 21, oy - 47]], 1.3, 1.2, 'zWood', {});
    A.limb([[ox, oy - 34], [ox + 11, oy - 46]], 0.9, 0.8, 'zWood', { tone: -0.3 });
    A.ell(ox + 17, oy - 44.5, 0.8, 1, 'zIron', {});
  },
  cage(A, v, ox, oy) {
    A.ell(ox, oy + 2, 5, 1.6, 'zIron', { dome: 0.4 });
    ztSkullS(A, ox, oy + 7, 1); A.limb([[ox, oy + 9], [ox + 0.5, oy + 15]], 0.5, 0.5, 'zBone', {}); for (let k = 0; k < 3; k++) A.limb([[ox - 2.5, oy + 10.5 + k * 1.8], [ox + 2.5, oy + 10 + k * 1.8]], 0.35, 0.35, 'zBone', { tone: -0.3 });
    for (let i = -2; i <= 2; i++) A.limb([[ox + i * 2.2, oy + 2], [ox + i * 2.6, oy + 10], [ox + i * 2.4, oy + 18]], 0.4, 0.4, 'zIron', { tone: i > 0 ? -0.4 : 0 });
    A.ell(ox, oy + 18, 5.5, 1.6, 'zIron', { dome: 0.4 }); A.limb([[ox, oy - 4], [ox, oy + 1]], 0.4, 0.4, 'zIron', {});
  },
  brazier(A, v, ox, oy) {
    for (const s of [-1, 0, 1]) A.limb([[ox + s * 6, oy + (s ? 0 : 1)], [ox + s * 3, oy - 7], [ox + s * 2, oy - 12]], 0.6, 0.5, 'zIron', { tone: s > 0 ? -0.4 : 0 });
    A.ell(ox, oy - 14.5, 7.5, 3.6, 'zIron', {}); A.ell(ox, oy - 16.5, 6.4, 1.8, '#1a0906', {});
    for (let k = -5; k <= 5; k += 1.6) A.fpx(ox + k, oy - 16.5 + Math.abs(k) * 0.12, Math.abs(k) < 3 ? '#ffb040' : '#c8401e');
  },
  shrub(A, v, ox, oy) {
    const R = mulberry32(v * 31 + 7);
    const br = (x, y, a, L, r, d) => { const x1 = x + Math.cos(a) * L, y1 = y + Math.sin(a) * L; A.limb([[x, y], [x1, y1]], r, r * 0.6, 'zBark', { tone: d % 2 ? -0.4 : 0 }); if (d > 0) { br(x1, y1, a - 0.5 - R() * 0.3, L * 0.65, r * 0.6, d - 1); br(x1, y1, a + 0.4 + R() * 0.3, L * 0.6, r * 0.6, d - 1); } };
    for (let i = 0; i < 6; i++) br(ox + (i - 2.5) * 1.5, oy - 1, -Math.PI / 2 + (i - 2.5) * 0.38 + (R() - 0.5) * 0.2, 7 + R() * 5, 1.1, 2);
  },
  stump(A, v, ox, oy) {
    for (const s2 of [-1, 1]) A.limb([[ox + s2 * 3, oy - 5], [ox + s2 * 8, oy - 2], [ox + s2 * 12, oy + 1]], 2, 0.7, 'zBark', { tone: s2 > 0 ? -0.4 : 0 });
    A.cyl(ox, oy, oy - 13, 6.5, 'zBark', { cap: false });
    A.poly([[ox - 6.5, oy - 13], [ox - 4, oy - 16], [ox - 1, oy - 12.5], [ox + 2, oy - 18], [ox + 4.5, oy - 13], [ox + 6.5, oy - 14], [ox + 6.5, oy - 12], [ox - 6.5, oy - 12]], 'zBarkB', { n: ZS_NUP });
    if (v % 2) { A.ell(ox - 5.5, oy - 5, 1.6, 1.2, 'zMoss', {}); A.ell(ox + 5, oy - 3, 1.6, 1, 'ztFung', {}); }
  },
  pillar(A, v, ox, oy) {   // a broken column stub
    const h = 14 + v * 4;
    A.ell(ox, oy - 0.5, 9, 3.6, 'zEarth', { dome: 0.3 });
    A.box(ox, oy, 3.4, 3.4, 3, 'zStone', { tone: -0.2 });
    A.cyl(ox, oy - 3, oy - h, 5, 'zStone', { cap: false });
    A.poly([[ox - 5, oy - h], [ox - 3, oy - h - 3], [ox, oy - h - 1], [ox + 2, oy - h - 4], [ox + 5, oy - h - 1], [ox + 5, oy - h + 1.5], [ox - 5, oy - h + 1.5]], 'zStone', { n: ZS_NUP, tone: 0.2 });
    for (let x = -3; x <= 3; x += 2.2) A.line(ox + x, oy - h + 3, ox + x, oy - 5, A.mt('zStone', x < 0 ? 0.3 : 0.12));
    A.ell(ox + 11, oy - 1, 3, 2, 'zStone', {}); A.ell(ox - 11, oy, 2, 1.5, 'zStone', { tone: -0.3 });
  },
});
// objects: the chest, the shrine, the pilgrims' lantern, the gates, the altars, the toppled saints
Object.assign(ZT_OBJP, {
  chest(A, ox, oy, open) {
    A.ell(ox, oy + 0.5, 13, 3.4, '#0a0708', {});
    A.box(ox, oy, 5, 3, 6.5, 'zWood', { top: !!open });
    for (const u of [-3.4, 3.4]) A.box(ox + u * 2, oy + u, 0.7, 3.15, 6.6, 'zIron', { top: false });   // iron straps round the body
    if (!open) {
      A.box(ox, oy - 6.5, 5.3, 3.3, 2.4, 'zWood', { tone: 0.1 }); A.box(ox, oy - 8.9, 5.3, 2.2, 1.2, 'zWood', { tone: 0.2 });   // the lid, crowned
      for (const u of [-3.4, 3.4]) { A.box(ox + u * 2, oy + u - 6.5, 0.75, 3.4, 2.5, 'zIron', {}); A.box(ox + u * 2, oy + u - 8.9, 0.75, 2.3, 1.3, 'zIron', {}); }
      A.box(ox - 6.6, oy + 3.3 - 3.4, 1, 0.25, 3.6, 'zGold', { top: false }); A.fpx(ox - 6.6, oy + 3.3 - 5.2, '#120806');
    } else {
      A.box(ox, oy - 6.5, 4.4, 2.5, 0.5, '#0c0604', {});
      for (let k = 0; k < 7; k++) A.ell(ox - 5 + k * 1.7, oy - 7.1 + (k % 2) * 0.8, 1, 0.6, 'zGold', {});
      A.poly([[ox - 10, oy - 11.5], [ox + 2, oy - 17.5], [ox + 2, oy - 26], [ox - 10, oy - 20]], 'zWood', { n: ZS_NL, tone: 0.1 });
      A.poly([[ox + 2, oy - 17.5], [ox + 10, oy - 13.5], [ox + 10, oy - 22], [ox + 2, oy - 26]], 'zWood', { n: ZS_NR });
    }
  },
  shrine(A, ox, oy, used) {
    A.box(ox, oy + 1, 7, 7, 3, 'zStone', { tone: -0.2 }); A.box(ox, oy - 2, 5.2, 5.2, 2.2, 'zStone', {});
    // the stele: two faces and a pointed head
    A.poly([[ox - 8, oy - 4], [ox, oy], [ox, oy - 34], [ox - 8, oy - 36]], 'zStone', { n: ZS_NL }); A.poly([[ox, oy], [ox + 6, oy - 3], [ox + 6, oy - 34.5], [ox, oy - 34]], 'zStone', { n: ZS_NR });
    A.poly([[ox - 8, oy - 36], [ox, oy - 34], [ox - 1, oy - 44]], 'zStone', { n: [-0.5, 0.5, 0.7] }); A.poly([[ox, oy - 34], [ox + 6, oy - 34.5], [ox - 1, oy - 44]], 'zStone', { n: [0.5, 0.45, 0.7] });
    // the triune eye cut into the stele (its light drawn live)
    const eye = used ? '#141218' : '#bfe8ff', eye2 = used ? '#1c1a22' : '#5a9ad0';
    A.ell(ox - 4, oy - 21.5, 3.6, 2.4, '#0b0a10', {});
    if (!used) { A.ell(ox - 4, oy - 21.5, 3, 1.6, eye2, {}); A.ell(ox - 4, oy - 21.7, 1.6, 1.2, eye, {}); A.fpx(ox - 4.2, oy - 22, '#ffffff'); }
    for (const [dx, dy] of [[-6.5, -28], [-1.5, -28.5], [-4, -31]]) { A.ell(ox + dx, oy + dy, 0.9, 0.9, '#0b0a10', {}); if (!used) A.fpx(ox + dx, oy + dy, eye2); }
    if (used) { A.line(ox - 3, oy - 38, ox - 5, oy - 26, '#0a090d'); A.line(ox - 5, oy - 26, ox - 2, oy - 12, '#0a090d'); }
    for (const s of [-1, 1]) ztCandle(A, ox + s * 9.5 + (s > 0 ? -1 : 0), oy - 1 + (s > 0 ? 1 : 0), 4, 0.8);
  },
  lantern(A, ox, oy) {
    A.box(ox, oy, 3.5, 3.5, 3, 'zStone', {}); A.box(ox, oy - 3, 2.2, 2.2, 2, 'zStone', { tone: 0.2 });
    A.limb([[ox, oy - 5], [ox, oy - 46]], 0.7, 0.55, 'zIron', {});
    A.limb([[ox, oy - 45], [ox + 3, oy - 49.5], [ox + 7.5, oy - 49.5], [ox + 9, oy - 46.5]], 0.5, 0.45, 'zIron', {});
    // the caged lamp: a roof, four iron ribs, glass lit from within
    A.poly([[ox + 5.6, oy - 42], [ox + 12.4, oy - 42], [ox + 12, oy - 31], [ox + 6, oy - 31]], '#3a2208', {});
    A.poly([[ox + 6.6, oy - 41], [ox + 11.4, oy - 41], [ox + 11, oy - 32], [ox + 7, oy - 32]], '#ffc860', {});
    A.poly([[ox + 8, oy - 39.5], [ox + 10, oy - 39.5], [ox + 9.8, oy - 33.5], [ox + 8.2, oy - 33.5]], '#fff4c8', {});
    for (const x of [5.6, 9, 12.4]) A.limb([[ox + x, oy - 42.5], [ox + x - (x - 9) * 0.06, oy - 30.5]], 0.4, 0.4, 'zIron', { tone: x > 9 ? -0.4 : 0 });
    A.poly([[ox + 4.2, oy - 42], [ox + 13.8, oy - 42], [ox + 9, oy - 46.5]], 'zIron', { n: [0, 0.6, 0.8] }); A.ell(ox + 9, oy - 30.4, 3.8, 1, 'zIron', {});
  },
  gate(A, ox, oy) {
    for (const s of [-1, 1]) {
      const x = ox + s * 16;
      A.box(x, oy + 1, 3.6, 3.6, 3, 'zStone', { tone: -0.2 }); A.box(x, oy - 2, 2.6, 2.6, 42, 'zStone', {});
      A.box(x, oy - 44, 3.2, 3.2, 3, 'zStone', { tone: 0.2 });
      for (let k = 1; k < 6; k++) { const y = oy - 2 - k * 7; A.line(x - 5.2, y - 2.6 * 0 + 2.6, x, y + 5.2, A.mt('zStone', 0.1)); A.line(x, y + 5.2, x + 5.2, y + 2.6, A.mt('zStone', 0.1)); }
    }
    A.poly([[ox - 21, oy - 47], [ox + 21, oy - 47], [ox + 21, oy - 51], [ox, oy - 63], [ox - 21, oy - 51]], 'zStone', { n: ZS_NF });
    A.poly([[ox - 12, oy - 50], [ox + 12, oy - 50], [ox, oy - 58]], '#08070b', {});
    A.limb([[ox, oy - 57], [ox, oy - 47]], 0.35, 0.35, 'zRope', {}); A.ell(ox, oy - 43.5, 3.4, 4, 'zBrass', {}); A.ell(ox, oy - 40, 3.6, 1, 'zBrass', { tone: -0.5 }); A.fpx(ox, oy - 39.2, '#1a0e06');
  },
  stairs(A, ox, oy) {
    const fr = (dx, dy) => [ox + dx, oy + dy];
    A.poly([fr(-22, -8), fr(0, -19), fr(22, -8), fr(0, 3)], 'zStone', { n: ZS_NUP });
    A.poly([fr(-16, -8), fr(0, -16), fr(16, -8), fr(0, 0)], '#040305', {});
    for (let k = 0; k < 5; k++) { const t = k * 2.2; A.poly([[ox - 13 + t, oy - 7 - t * 0.2 + k * 1.2], [ox + 1 + t * 0.6, oy - 14 + k * 1.8], [ox + 1 + t * 0.6, oy - 13 + k * 1.8], [ox - 13 + t, oy - 6 - t * 0.2 + k * 1.2]], 'zStone', { n: ZS_NUP, tone: -k * 0.35 }); }
    A.poly([fr(-22, -8), fr(0, 3), fr(0, 6), fr(-22, -5)], 'zStone', { n: ZS_NL }); A.poly([fr(0, 3), fr(22, -8), fr(22, -5), fr(0, 6)], 'zStone', { n: ZS_NR });
    for (const [x, y] of [[-20, -9], [20, -9], [0, -18]]) ztSkullS(A, ox + x, oy + y - 2.5, 1.1);
  },
});
function ztAltarFrame(god) {
  const g = GODS22[god], C = ZT_hex(g.col), sh = k => '#' + C.map(v => Math.max(0, Math.min(255, Math.round(v * k))).toString(16).padStart(2, '0')).join('');
  zsMat('zGod' + god, ztHue([sh(0.12), sh(0.3), sh(0.5), sh(0.75), sh(1)], 8).map(c => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('')), { tex: 'cloth' });
  return ztFrame('altar' + god, 70, 74, 35, 62, (A, ox, oy) => {
    A.box(ox, oy + 2, 11, 11, 3, 'zStone', { tone: -0.3 }); A.box(ox, oy - 1, 9.5, 9.5, 2, 'zStone', {});
    A.box(ox, oy - 3, 6.5, 6.5, 17, 'zStone', {}); A.box(ox, oy - 20, 7.6, 7.6, 2.4, 'zStone', { tone: 0.2 });
    // the god's cloth hanging over the front edges, frayed
    A.poly([[ox - 13, oy - 16], [ox, oy - 9.5], [ox, oy - 3], [ox - 2, oy - 5], [ox - 5, oy - 4], [ox - 8, oy - 7], [ox - 11, oy - 6.5], [ox - 13, oy - 9]], 'zGod' + god, { n: ZS_NL, bevel: 1 });
    A.poly([[ox, oy - 9.5], [ox + 13, oy - 16], [ox + 13, oy - 9.5], [ox + 10, oy - 8.5], [ox + 7, oy - 6], [ox + 4, oy - 5.5], [ox, oy - 3]], 'zGod' + god, { n: ZS_NR, bevel: 1 });
    // the mark on the cloth
    const mx = ox - 6.5, my = oy - 10;
    if (god === 'bone') ztSkullS(A, mx, my - 1, 0.9);
    else if (god === 'flesh') { A.ell(mx, my - 1, 1.8, 2.2, 'zBlood', {}); A.line(mx, my + 1, mx, my + 4, '#6e1418'); }
    else if (god === 'breath') { for (let i = 0; i < 3; i++) A.line(mx - 2.5, my - 3 + i * 2, mx + 2.5, my - 1.4 + i * 2, '#bfe8ff'); }
    else { A.ell(mx, my - 1, 2.2, 2.6, '#000000', {}); A.fpx(mx + 0.5, my - 1.6, '#9a7ad0'); }
    // a bowl of the god's light, candles guttering round it
    A.ell(ox, oy - 25, 4.2, 1.8, 'zBrass', {}); A.ell(ox, oy - 25.8, 3, 0.9, sh(1), {});
    for (const [x, y, h] of [[-9, -22.5, 6], [-5.5, -20, 4], [7, -22, 5], [4, -19.5, 3]]) { ztCandle(A, ox + x, oy + y, h, 0.7); }
    for (const [fx, fy] of A.fl) { A.fpx(fx, fy + 0.2, '#ffb040'); A.fpx(fx, fy - 0.4, '#fff2c0'); }
    A.fl = [];
    for (let k = 0; k < 4; k++) A.limb([[ox - 15 + k * 8, oy + 3 + (k % 2) * 2], [ox - 12 + k * 8, oy + 2.5 + (k % 2) * 2]], 0.6, 0.5, 'zBone', {});
  });
}
// candles: the prop draws its own flames at the points its frame recorded
{
  const _dp = drawProp;
  drawProp = function (o) {
    if (o.kind !== 'candles') return _dp(o);
    const fr = ztPropFrame('candles', o.v), p = iso(o.x, o.y), sx = Math.round(p.sx), sy = Math.round(p.sy);
    ctx.drawImage(fr.c, sx - fr.ox, sy - fr.oy);
    if (fr.fl) for (let i = 0; i < fr.fl.length; i++) ztCandleFlame(sx + fr.fl[i][0], sy + fr.fl[i][1], i * 1.7 + o.x * 3);
  };
}
// =================================================================== v0.38: the remaining props, landmarks at the new scale
Object.assign(ZT_PROP_BOX, { arch: [120, 130, 60, 118], shrub: [150, 118, 64, 100], bell: [60, 50, 30, 40] });
Object.assign(ZT_PROPP, {
  // a broken gothic arch over the road: two clustered piers, a pointed arch of heavy voussoirs, one side fallen
  arch(A, v, ox, oy) {
    const R = mulberry32(v * 3 + 1), span = 24, ph = 62 + (v % 2) * 8, apex = ph + 30, broken = v % 2 ? 1 : -1;
    A.ell(ox, oy + 1, 44, 8, 'zEarth', { dome: 0.25 });
    for (const s of [-1, 1]) {
      const x = ox + s * span, h = s === broken && v < 2 ? ph - 14 - v * 10 : ph;
      A.box(x, oy + 2, 4.2, 4.2, 6, 'zStone', { tone: -0.25 });                      // the plinth
      A.box(x, oy - 4, 3.2, 3.2, h - 4, 'zStone', {});                               // the pier
      for (const d of [-1, 1]) A.cyl(x + d * 5.6, oy - 1 + 1, oy - h + 4, 1.4, 'zStone', { cap: false, tone: d > 0 ? -0.3 : 0.1 });   // clustered shafts
      for (let k = 10; k < h - 4; k += 9) { A.line(x - 6.4, oy - 4 + 3.2 - k, x, oy - 4 + 6.4 - k, A.mt('zStone', 0.1)); A.line(x, oy - 4 + 6.4 - k, x + 6.4, oy - 4 + 3.2 - k, A.mt('zStone', 0.1)); }
      if (s === broken && v < 2) { A.poly([[x - 6.4, oy - h + 3], [x - 3, oy - h - 2], [x, oy - h + 1], [x + 3, oy - h - 3], [x + 6.4, oy - h + 2], [x + 6.4, oy - h + 6], [x - 6.4, oy - h + 6]], 'zStone', { n: ZS_NUP, tone: 0.25 }); }
      else A.box(x, oy - h, 3.8, 3.8, 3, 'zStone', { tone: 0.15 });                  // the capital, where the arch springs
    }
    // the arch: two arcs, each struck from the far springing point (an equilateral gothic arch), heavy voussoirs; one side fallen
    for (const s of [-1, 1]) {
      const y0 = oy - ph - 3, cx = ox - s * span, Rr = span * 2, pts = [], full = s !== broken || v >= 2;
      if (!full) continue;
      for (let k = 0; k <= 8; k++) { const th = Math.PI / 3 * k / 8; if (v < 2 && k > 6) break; pts.push([cx + s * Rr * Math.cos(th), y0 - Rr * Math.sin(th)]); }
      A.limb(pts, 4.4, 3.8, 'zStone', { tone: s > 0 ? -0.25 : 0.05 });
      for (let k = 1; k < pts.length; k++) { const [x, y] = pts[k], dx = x - cx, dy = y - y0, L = Math.hypot(dx, dy); A.fline(x - dx / L * 4, y - dy / L * 4, x + dx / L * 4, y + dy / L * 4, A.mt('zStone', 0.08)); }
      if (!full) { const [x, y] = pts[pts.length - 1]; A.ell(x, y, 3.6, 3.6, 'zStone', { tone: 0.3 }); }
    }
    if (v >= 2 || true) { const y0 = oy - ph - 3; if (v >= 2) A.box(ox, y0 - span * 1.73 + 1, 1.6, 1.6, 5, 'zStone', { tone: 0.2 }); }
    // fallen voussoirs and rubble beneath the broken side
    for (let k = 0; k < 4; k++) { const x = ox + broken * (8 + k * 5 + R() * 3), y = oy + 3 + R() * 4; A.box(x, y, 2 + R() * 1.4, 1.6 + R(), 2.4 + R() * 1.4, 'zStone', { tone: -0.1 }); }
    for (let k = 0; k < 8; k++) A.ell(ox - 30 + k * 8 + R() * 3, oy + 4 + R() * 2, 1.4, 1, 'zMoss', { dome: 0.5 });
    ztSkullS(A, ox - broken * 8, oy + 3, 1.1);
  },
  // shrubs: a dead thorn bush; the fourth kind is a landmark: ribs of the god-corpse arching out of the heath
  shrub(A, v, ox, oy) {
    if (v === 3) {
      A.ell(ox, oy + 2, 50, 9, 'zEarth', { dome: 0.25 });
      for (let k = 0; k < 4; k++) {
        const x0 = ox - 40 + k * 8, y0 = oy + 4 - k * 2.4, H = 72 - k * 9, W = 58 - k * 7, pts = [];
        for (let t = 0; t <= 1.001; t += 0.1) pts.push([x0 + Math.sin(t * Math.PI * 0.62) * W, y0 - Math.sin(t * Math.PI) * H * (1 - t * 0.25) + t * t * 16]);
        A.limb(pts, 3.2 - k * 0.3, 1.1, 'zBone', { tone: -0.3 - k * 0.18 });
        A.ell(x0, y0, 4.4 - k * 0.4, 2.2, 'zBone', { tone: -0.3 });   // where the rib breaks the ground, a heave of earth
        A.ell(x0 - 1, y0 + 1.2, 6, 2, 'zEarth', { dome: 0.4 });
      }
      A.limb([[ox - 44, oy + 3], [ox - 40, oy - 2], [ox - 24, oy - 6]], 3.6, 2.8, 'zBone', { tone: -0.2 });   // a length of spine the ribs grow from
      for (let k = 0; k < 5; k++) A.ell(ox - 42 + k * 4.4, oy - 2 - k * 0.9, 2.6, 2, 'zBone', { tone: -0.1 });
      for (let k = 0; k < 10; k++) A.ell(ox - 36 + k * 7, oy + 4 + (k % 3), 1.8, 1, 'zMoss', { dome: 0.5 });
      return;
    }
    const R = mulberry32(v * 31 + 7);
    const br = (x, y, a, L, r, d) => { const x1 = x + Math.cos(a) * L, y1 = y + Math.sin(a) * L; A.limb([[x, y], [x1, y1]], r, r * 0.6, 'zBark', { tone: d % 2 ? -0.4 : 0 }); if (d > 0) { br(x1, y1, a - 0.5 - R() * 0.3, L * 0.65, r * 0.6, d - 1); br(x1, y1, a + 0.4 + R() * 0.3, L * 0.6, r * 0.6, d - 1); } };
    for (let i = 0; i < 6; i++) br(ox + (i - 2.5) * 1.5, oy - 1, -Math.PI / 2 + (i - 2.5) * 0.38 + (R() - 0.5) * 0.2, 7 + R() * 5, 1.1, 2);
  },
  // the great bell of a drowned chapel, on its side in the mud, green-black with verdigris
  bell(A, v, ox, oy) {
    A.ell(ox, oy + 1, 17, 5, 'zEarth', { dome: 0.3 });
    const s = v % 2 ? 1 : -1;
    A.limb([[ox + s * 9, oy - 11], [ox - s * 1, oy - 10], [ox - s * 9, oy - 8]], 5, 11, 'zBronzeV', {});                     // the body, flaring to the lip
    A.ell(ox - s * 10, oy - 7.5, 3.4, 10.5, 'zBronzeV', { tone: 0.25, dome: 0.5 });                                          // the lip
    A.ell(ox - s * 10.4, oy - 7.5, 2.2, 8.4, '#07080a', {});                                                                  // the dark mouth
    A.limb([[ox + s * 13, oy - 13], [ox + s * 15, oy - 16], [ox + s * 16, oy - 12]], 1.2, 1.2, 'zBronzeV', {});             // the crown loop
    for (const t of [0.35, 0.7]) { const x = ox + s * (9 - t * 18), r = 5 + t * 6; A.fline(x, oy - 11 - r, x + s * 0.6, oy - 11 + r * 0.8, A.mt('zBronzeV', 0.15)); }   // bands
    const R = mulberry32(v + 9); for (let k = 0; k < 12; k++) A.ell(ox + (R() - 0.5) * 16, oy - 12 + (R() - 0.5) * 12, 1 + R(), 0.8, R() < 0.5 ? '#3d5a4a' : '#557563', {});   // verdigris
    A.fpx(ox + s * 2, oy - 18.5, '#e8d49a'); A.fpx(ox + s * 1, oy - 18.2, '#b8a068');                                          // where the bronze still shines
    for (let k = 0; k < 5; k++) A.limb([[ox + s * (12 + k * 1.6), oy + 1], [ox + s * (12.5 + k * 1.6), oy - 7 - (k % 3) * 3]], 0.5, 0.35, 'zMoss', { tone: k % 2 ? -0.3 : 0 });
  },
  // an iron railing round a plot: spiked bars between two posts, one bar bent, rust
  railing(A, v, ox, oy) {
    const n = 7, dx = 3.4, dy = 1.7, dir = v % 2 ? -1 : 1, px = k => ox + (k - 3) * dx * dir, py = k => oy + (k - 3) * dy;
    for (const rh of [13, 3]) A.limb([[px(0), py(0) - rh], [px(n - 1), py(n - 1) - rh]], 0.45, 0.45, 'zIron', {});
    for (let k = 1; k < n - 1; k++) { const bent = k === 3 && v > 1, x = px(k), y = py(k); A.limb([[x, y], [x, y - 7], [x + (bent ? 2.5 : 0), y - 16]], 0.4, 0.35, 'zIron', { tone: k % 2 ? -0.2 : 0 }); A.poly([[x - 0.9 + (bent ? 2.5 : 0), y - 16], [x + 0.9 + (bent ? 2.5 : 0), y - 16], [x + (bent ? 2.5 : 0), y - 18.5]], 'zIron', {}); if (k % 2) A.fpx(x + 0.4, y - 6, '#7a4020'); }
    for (const k of [0, n - 1]) { const x = px(k), y = py(k); A.cyl(x, y + 1, y - 20, 0.9, 'zIron', {}); A.ell(x, y - 20.5, 1.2, 1.2, 'zIron', {}); A.fpx(x - 0.5, y - 21, '#c9bba8'); }
  },
  // heaped chains on the floor, one end fixed to a ring
  chains(A, v, ox, oy) {
    const R = mulberry32(v * 5 + 11); let x = ox - 10, y = oy - 1;
    A.ell(ox + 9, oy - 1, 2.4, 1.3, 'zIron', {}); A.ell(ox + 9, oy - 1, 1.2, 0.6, '#07070a', {});
    for (let k = 0; k < 13; k++) { const nx = x + 1.5 + R() * 0.4, ny = y + Math.sin(k * 0.9 + v) * 1.1; if (k % 2) A.limb([[x, y], [nx, ny]], 0.55, 0.55, 'zIron', { tone: -0.2 }); else { A.ell((x + nx) / 2, (y + ny) / 2, 1.1, 0.8, 'zIron', {}); A.fpx((x + nx) / 2, (y + ny) / 2, '#08080b'); } x = nx; y = ny; }
    A.fpx(ox - 4, oy + 1, '#4a0e12'); A.fpx(ox - 3, oy + 1, '#34080c');
  },
  // a hanging cloth: the god's colours faded and stained, torn at the hem, folds hanging with weight
  cloth(A, v, ox, oy) {
    const mat = v % 2 ? 'zCloth' : 'zLinen', L = 22 + (v > 1 ? 6 : 0), top = oy - L - 1;
    A.limb([[ox - 8, top - 1], [ox + 8, top - 1]], 0.7, 0.7, 'zIron', {}); A.ell(ox - 8, top - 1, 1, 1, 'zIron', {}); A.ell(ox + 8, top - 1, 1, 1, 'zIron', {});
    const hem = [[ox + 6, oy - 6], [ox + 4, oy - 3], [ox + 2.5, oy - 8], [ox + 0.5, oy - 1], [ox - 2, oy - 6], [ox - 4, oy - 3], [ox - 6, oy - 8]];
    for (let f = 0; f < 4; f++) {   // four folds, each a slab turned a little to or from the light
      const x0 = ox - 6 + f * 3, x1 = x0 + 3, n = f % 2 ? [0.4, 0.05, 0.9] : [-0.45, 0.05, 0.9];
      const bot = hem.filter(p => p[0] >= x0 - 0.6 && p[0] <= x1 + 0.6).sort((a, b) => b[0] - a[0]);
      A.poly([[x0, top], [x1, top], ...bot, [x0, bot.length ? bot[bot.length - 1][1] : oy - 6]], mat, { n, bevel: 0.6 });
    }
    ztSkullS(A, ox, top + 7, 0.8, 'zLinen');
    for (let k = 0; k < 4; k++) A.fpx(ox - 4 + k * 2.6, top + 12 + k * 2.3, '#0a0608');
    A.fline(ox + 3, top + 4, ox + 3.5, top + 13, v % 2 ? '#2a0608' : '#3a3228');
  },
  // wall chains and a manacle
  wallchain(A, v, ox, oy) {
    const L = 16 + v * 3;
    A.ell(ox, oy - L - 4, 1.8, 1.8, 'zIron', {}); A.fpx(ox, oy - L - 4, '#08080b');
    for (let k = 0; k < L; k += 2) { const x = ox + Math.round(Math.sin(k * 0.5 + v) * 1.2); if ((k / 2) % 2) A.limb([[x, oy - L - 2 + k], [x, oy - L + k]], 0.5, 0.5, 'zIron', { tone: -0.2 }); else { A.ell(x, oy - L - 1 + k, 0.8, 1.1, 'zIron', {}); A.fpx(x, oy - L - 1 + k, '#08080b'); } }
    A.ell(ox + 1, oy - 1, 3, 2.1, 'zIron', {}); A.ell(ox + 1, oy - 1, 1.7, 1.1, '#07070a', {});
    if (v % 2) { A.limb([[ox - 4, oy + 0.5], [ox + 6, oy - 2]], 0.9, 0.8, 'zBone', { tone: -0.2 }); }
    A.fpx(ox + 3, oy - 3, '#6a3a22');
  },
  // a cobweb in a corner: strands radiating from the corner, sagging threads between them, a husk caught in it
  cobweb(A, v, ox, oy) {
    const c = ['#2e2c38', '#4a4856', '#6e6c78'], sp = [];
    for (let a = 0.15; a <= 3; a += 0.42) { sp.push(a); A.fline(ox, oy, ox + Math.cos(a) * 13, oy + Math.sin(a) * 11, c[1]); }
    for (let r = 3.5; r <= 12; r += 2.8) for (let i = 0; i < sp.length - 1; i++) {
      if (hash(i * 7 + v, r * 3 | 0) < 0.25) continue;
      const a0 = sp[i], a1 = sp[i + 1], x0 = ox + Math.cos(a0) * r, y0 = oy + Math.sin(a0) * r * 0.85, x1 = ox + Math.cos(a1) * r, y1 = oy + Math.sin(a1) * r * 0.85;
      for (let t = 0; t <= 1; t += 0.12) A.fpx(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 0.8, c[r < 6 ? 2 : r < 9 ? 1 : 0]);
    }
    A.ell(ox + (v % 2 ? 6 : -4), oy + (v % 2 ? 5 : 7), 1.1, 1.6, 'zLinen', { tone: -0.3 });
  },
});
Object.assign(ZT_OBJP, {
  // a barrow mouth: a mound of heaped stone and earth, a black maw, steps down, two great tusks of bone
  cave(A, ox, oy) {
    const R = mulberry32(17);
    A.ell(ox, oy - 10, 33, 16, 'zEarth', { dome: 0.7 });
    for (let k = 0; k < 11; k++) { const a = Math.PI + (k + 0.5) / 11 * Math.PI, x = ox + Math.cos(a) * 25 + (R() - 0.5) * 4, y = oy - 11 + Math.sin(a) * 13; A.ell(x, y, 5 + R() * 3, 3.6 + R() * 2, 'zStone', { tone: x > ox ? -0.3 : 0 }); }
    for (let k = 0; k < 12; k++) A.ell(ox - 26 + k * 4.8, oy - 22 - Math.sin(k / 11 * Math.PI) * 5 + R() * 2, 2 + R(), 1.2, 'zMoss', { dome: 0.5 });
    A.poly([[ox - 13, oy], [ox - 11.5, oy - 12], [ox - 6, oy - 18.5], [ox + 6, oy - 18.5], [ox + 11.5, oy - 12], [ox + 13, oy]], 'zStone', { n: ZS_NF, bevel: 2.4, tone: 0.1 });   // the lintel stones
    A.poly([[ox - 10.5, oy], [ox - 9, oy - 10.5], [ox, oy - 15.5], [ox + 9, oy - 10.5], [ox + 10.5, oy]], '#030204', {});
    for (let k = 0; k < 4; k++) A.poly([[ox - 10 + k * 0.8, oy - k * 2.2], [ox + 10 - k * 0.8, oy - k * 2.2], [ox + 10 - k * 0.8, oy - k * 2.2 - 0.8], [ox - 10 + k * 0.8, oy - k * 2.2 - 0.8]], 'zStone', { n: ZS_NUP, tone: -0.6 - k * 0.4 });   // steps going down into the dark
    for (const s2 of [-1, 1]) A.limb([[ox + s2 * 17, oy + 1], [ox + s2 * 19.5, oy - 12], [ox + s2 * 14, oy - 27], [ox + s2 * 7, oy - 31]], 2.8, 0.9, 'zBone', { tone: s2 > 0 ? -0.3 : 0.05 });
    ztSkullS(A, ox, oy - 23, 1.3);
    A.fpx(ox + 1, oy - 18, '#5e1016'); A.fpx(ox + 1.3, oy - 17, '#3a0a0e');
  },
  // the peddler: hunched under a great pack of relics, a lamp on a hooked staff
  vendor(A, ox, oy) {
    A.ell(ox + 2, oy + 0.5, 9, 2.4, '#08060a', {});
    A.ell(ox + 3.5, oy - 23, 8.4, 10.5, 'zWood', { tone: -0.2 });                                                 // the pack
    for (let k = 0; k < 3; k++) A.limb([[ox - 3 + k * 4, oy - 32 + k], [ox - 1 + k * 4, oy - 14 + k]], 0.45, 0.45, 'zRope', { tone: -0.3 });
    A.ell(ox + 5, oy - 31, 2.4, 2, 'zBone', {}); A.ell(ox + 8.5, oy - 26, 1.7, 2.2, 'zBrass', {}); A.limb([[ox + 1, oy - 34], [ox + 4, oy - 38]], 0.6, 0.5, 'zBone', {}); A.ell(ox + 9, oy - 19, 1.6, 1.3, 'zCloth', {});
    A.poly([[ox - 7.5, oy], [ox - 6, oy - 18], [ox - 3, oy - 26], [ox + 3, oy - 25], [ox + 6, oy - 12], [ox + 6.5, oy]], 'zLinen', { tone: -0.35, bevel: 2.2 });   // the robe
    for (let k = 0; k < 3; k++) A.fline(ox - 5 + k * 3.5, oy - 18 + k, ox - 5.5 + k * 3.5, oy - 1, A.mt('zLinen', 0.1));                                                // folds
    A.ell(ox - 3, oy - 29, 5, 5, 'zLinen', { tone: -0.3 });                                                          // the hood
    A.ell(ox - 5, oy - 28.4, 2.6, 3, '#050406', {}); A.fpx(ox - 6, oy - 28.6, '#ffb040'); A.fpx(ox - 4.2, oy - 28.6, '#ffb040');   // eyes in the dark of the hood
    A.limb([[ox - 11, oy], [ox - 11, oy - 38], [ox - 8.5, oy - 42], [ox - 6.5, oy - 40]], 0.6, 0.5, 'zWood', {});
    A.poly([[ox - 8, oy - 38.5], [ox - 4.5, oy - 38.5], [ox - 4.8, oy - 33], [ox - 7.7, oy - 33]], '#3a2208', {}); A.poly([[ox - 7.3, oy - 37.6], [ox - 5.2, oy - 37.6], [ox - 5.4, oy - 34], [ox - 7.1, oy - 34]], '#ffc860', {}); A.fpx(ox - 6.3, oy - 36, '#fff4c8');
    A.limb([[ox - 3, oy - 20], [ox - 8.5, oy - 19], [ox - 11, oy - 22]], 1.4, 1.1, 'zLinen', { tone: -0.1 }); A.ell(ox - 11, oy - 22, 1.3, 1.3, 'ztSkin', {});
  },
});
// a colossal face, fallen and half sunk in the heath: a saint of the Triune, larger than any house
function ztStatueFrame(v) {
  return ztFrame('statue' + v, 150, 100, 75, 80, (A, ox, oy) => {
    const R = mulberry32(v * 7 + 2), s = v === 1 ? -1 : 1;
    A.ell(ox + s * 2, oy - 26, 44, 30, 'zMarbleD', { dome: 0.85 });                                               // the head, lying face-up and tilted
    A.cut([[ox - 80, oy + 16], [ox + 80, oy + 16], [ox + 80, oy - 4], [ox - 80, oy - 4]]);          // sunk in the earth
    A.ell(ox, oy - 2, 54, 7, 'zEarth', { dome: 0.4, tone: 0.1 });                                                   // the heave of earth in front
    // the face: brow ridge, two closed lids, the long nose, lips pressed shut; it weeps
    A.limb([[ox - 26 * s, oy - 38], [ox - 8 * s, oy - 44], [ox + 12 * s, oy - 42]], 3.2, 2.6, 'zMarbleD', { tone: 0.25 });
    for (const [ex, ey] of [[-20, -32], [4, -36]]) { A.ell(ox + ex * s, oy + ey, 8, 4, 'zMarbleD', { tone: -0.15, dome: 0.6 }); A.limb([[ox + (ex - 7) * s, oy + ey + 0.8], [ox + ex * s, oy + ey + 2.2], [ox + (ex + 7) * s, oy + ey + 0.6]], 0.7, 0.7, '#0c0b12', {}); }
    A.limb([[ox - 8 * s, oy - 38], [ox - 4 * s, oy - 27], [ox - 1 * s, oy - 20]], 2.4, 4.4, 'zMarbleD', { tone: 0.2 });   // the nose
    A.ell(ox + 1 * s, oy - 19, 5, 2, 'zMarbleD', { tone: -0.2 });
    A.limb([[ox - 12 * s, oy - 12], [ox - 2 * s, oy - 10.5], [ox + 10 * s, oy - 13]], 1.8, 1.6, 'zMarbleD', { tone: 0.1 }); A.fline(ox - 11 * s, oy - 11.5, ox + 9 * s, oy - 12.2, '#0c0b12');
    A.fline(ox + 3 * s, oy - 33, ox + 6 * s, oy - 16, '#5e1016'); A.fline(ox + 3.5 * s, oy - 32, ox + 7 * s, oy - 14, '#3a0a0e');   // tears of old blood
    // cracks, a missing chunk of the brow, moss in the hollows, the broken iron crown
    A.fline(ox + 20 * s, oy - 52, ox + 12 * s, oy - 34, '#0c0b12'); A.fline(ox + 12 * s, oy - 34, ox + 18 * s, oy - 18, '#0c0b12'); A.fline(ox + 12 * s, oy - 34, ox + 26 * s, oy - 30, '#0c0b12');
    A.cut([[ox - 40 * s, oy - 44], [ox - 32 * s, oy - 55], [ox - 26 * s, oy - 50], [ox - 32 * s, oy - 42]]);
    for (let k = 0; k < 7; k++) A.limb([[ox + (28 + k * 3) * s, oy - 46 + k * 4], [ox + (40 + k * 4) * s, oy - 52 + k * 5.5 + R() * 3]], 1.6, 0.4, 'zIron', { tone: -0.1 });
    for (let k = 0; k < 16; k++) A.ell(ox - 40 + R() * 80, oy - 6 - R() * 10, 1.8 + R(), 1.1, 'zMoss', { dome: 0.5 });
    for (let k = 0; k < 6; k++) A.ell(ox + (-20 + R() * 36) * s, oy - 45 + R() * 8, 1.4, 0.9, 'zMoss', { dome: 0.5 });
    if (v === 2) { A.limb([[ox - 58, oy + 1], [ox - 50, oy - 5]], 4, 3.4, 'zMarbleD', {}); for (let k = 0; k < 4; k++) A.limb([[ox - 50 + k * 2, oy - 6], [ox - 47 + k * 2.6, oy - 14 - (k % 2) * 3]], 1.2, 0.9, 'zMarbleD', { tone: -0.1 }); }
  });
}

const ZT_PROF = {};
{ const W = (k, f) => function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { ZT_PROF[k] = (ZT_PROF[k] || 0) + performance.now() - t; } };
  ztDrawTree = W('tree', ztDrawTree); ztDrawWall = W('wall', ztDrawWall); ztDrawGround = W('ground', ztDrawGround); ztCandleFlame = W('flame', ztCandleFlame); drawProp = W('prop', drawProp); }
try { window.__zt = { ZT_WALL_LIGHTS, ZT_PROF, ztPaintChunk, ZTG, ZT_CH, ztTreeFrame, ztWallBlock, ztPalisade, ztPillar, ztRock, ztPropFrame, ztFrame, ztObjFrame, ztAltarFrame, ztStatueFrame }; } catch (e) { }
