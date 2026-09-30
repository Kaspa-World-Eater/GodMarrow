
// =================================================================== v0.36: the title — the dead god weeps into the Seer's bowl
// A colossal stone face is sunk in the wall of a chapel, crowned with a broken halo of thorns. Its eyes are shut; blood
// runs from them, down the cheeks, and drips from the chin into a tarnished bronze bowl on the altar below. The god's
// dying breath (the miasma) spills slowly from its open mouth and pools on the altar. Candles, lit from below, the only
// warm light. In the blood, broken by every ripple, the reflection of whoever is looking down into it: you.
// The menu itself is the HTML panel on the left (a_head.html); this is its backdrop. Painted pixel by pixel.
const TT = { bg: null, frame: null, fd: null, refl: null, mist: null, grain: null, drops: [], rings: [], sparks: [], motes: [], hover: null, nextDrop: 1.4, drip: 0 };
const TT_OBJ = [];   // the table used to be the menu; the touch code still asks it what is under a finger (nothing now)
const TTC = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const TT_STONE = ['#030204', '#070609', '#0c0a0d', '#121014', '#1a1619', '#231d1d', '#2e2521', '#3c3027', '#4e3d2e', '#654e37', '#826443', '#a27f52'].map(TTC);
const TT_BRZ = ['#050303', '#0f0905', '#1b1008', '#2a190c', '#3d2512', '#553418', '#704622', '#945e2e', '#c08644', '#ecc47e'].map(TTC);
const TT_BLD = ['#070103', '#120205', '#1f0408', '#2e060c', '#420a10', '#5e1016', '#84181c', '#b83026', '#e8704e'].map(TTC);
const TT_WAX = ['#140f0b', '#2c2319', '#4a3d2c', '#6e5c42', '#948060', '#bca47a', '#dcc79a'].map(TTC);
const TT_IRON = ['#040405', '#0b0b0d', '#151518', '#222226', '#34333a', '#4e4b52'].map(TTC);
const TT_PAT = ['#0a1410', '#132219', '#1d3326', '#2a4735'].map(TTC);
const TT_GX = 340, TT_GY = 64, TT_HZ = 139, TT_FS = 1.14;   // TT_FS: the face's scale                         // the god's face centre, and the altar's back edge
const TT_CHIN = TT_GY + Math.round(54 * TT_FS) - 1;
const TT_BX = TT_GX, TT_BY = 198;                                    // the bowl's centre
const TT_ORX = 92, TT_ORY = 42, TT_IRX = 81, TT_IRY = 36;            // outer and inner rim
const TT_SX = TT_GX, TT_SY = 202, TT_SRX = 75, TT_SRY = 32;          // the blood's surface
const TT_RS = 1.35;                                                  // the reflection is sampled at this scale
// 4x4 ordered dither, for every soft edge of light, so it stays pixel art
const TT_B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => v / 16 - 0.47);
const TT_RUNES = ['10001|01010|00100|01010|10001', '11111|00100|00100|00100|11111', '10101|10101|11111|00100|00100', '01110|10001|10101|10001|01110', '11100|10010|11100|10100|10010', '00100|01110|10101|00100|00100', '10000|11000|10100|10010|11111', '11011|01010|00100|01010|11011', '01010|11111|01010|11111|01010', '00111|01000|11111|00010|11100'];
// the lights: two clusters of candles behind the bowl, the blood itself (a dull red bounce), two stubs in front
const TT_LIGHTS = [{ x: 236, y: 140, z: 34, i: 1.7, r: 90 }, { x: 452, y: 140, z: 34, i: 1.7, r: 90 }, { x: TT_GX, y: 196, z: 44, i: 0.55, r: 105, red: 1 }, { x: 248, y: 238, z: 18, i: 0.5, r: 55 }, { x: 434, y: 238, z: 18, i: 0.5, r: 55 }];
// candles: base x, base y, height, width
const TT_CANDLES = [[220, 167, 6, 3], [226, 161, 18, 4], [233, 164, 12, 4], [240, 159, 26, 5], [247, 166, 9, 3], [437, 168, 7, 3], [444, 159, 28, 5], [452, 164, 16, 4], [459, 161, 21, 4], [466, 167, 9, 3], [244, 254, 12, 4], [252, 258, 6, 3], [436, 254, 14, 4], [428, 259, 7, 3]];
// value noise, for weathering and the breath
const TT_NZ = (() => { const a = new Float32Array(64 * 64); for (let i = 0; i < a.length; i++) a[i] = hash(i & 63, (i >> 6) + 777); return a; })();
function ttNoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const i0 = xi & 63, i1 = (xi + 1) & 63, j0 = (yi & 63) * 64, j1 = ((yi + 1) & 63) * 64;
  const a = TT_NZ[j0 + i0], b = TT_NZ[j0 + i1], c = TT_NZ[j1 + i0], d = TT_NZ[j1 + i1];
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
const ttFbm = (x, y) => ttNoise(x, y) * 0.55 + ttNoise(x * 2.1 + 17, y * 2.1 + 9) * 0.3 + ttNoise(x * 4.3 + 3, y * 4.3 + 41) * 0.15;
// the god's face as a height field (u, v from the face's centre); null outside it. cav: 1 in the open mouth
function ttFace(u, v) {
  u /= TT_FS; v /= TT_FS;
  const hw = v > 20 ? Math.sqrt(Math.max(0, 47 * 47 - ((v - 20) * 1.38) ** 2)) : 47 - Math.max(0, -v - 28) * 0.55;
  if (hw < 1) return null;
  const e = 1 - (u / hw) ** 2 - (v < 0 ? (v / 54) ** 2 : (v / 56) ** 2 * 0.5); if (e <= 0) return null;
  const B = (cu, cv, rx, ry, a) => { const d = ((u - cu) / rx) ** 2 + ((v - cv) / ry) ** 2; return d < 1 ? a * (1 - d) * (1 - d) : 0; };
  let h = 22 * Math.sqrt(e);
  h += B(-16, -13, 19, 5.5, 7) + B(16, -13, 19, 5.5, 7) + B(0, -13, 9, 5, 3);                        // the heavy brow
  for (const s of [-1, 1]) {
    h += B(17 * s, -4, 12, 8, -13) + B(17 * s, -3, 8.5, 3.8, 6.5) + B(17 * s, 1.5, 9, 1.4, -2.5);                                 // sunken sockets, lids shut
    h += B(28 * s, 8, 11, 7, 5) + B(22 * s, 26, 9, 10, -6) + B(13 * s, 36, 5, 8, -2.5) + B(40 * s, -2, 8, 14, -3);           // cheekbones, hollow cheeks, the lines by the mouth
    h += B(4 * s, 20, 2.6, 1.6, -5);                                                               // nostrils
  }
  if (v > -11 && v < 21) { const w = 2.6 + (v + 11) * 0.14, k = Math.min(1, (v + 11) / 6); if (Math.abs(u) < w) h += (1 - (u / w) ** 2) * (5 + (v + 11) * 0.25) * k; }
  h += B(0, 17, 6, 4, 3.5) + B(0, 27, 3, 4, -1.5) + B(0, 50, 14, 7, 5) + B(0, 43.5, 10, 2.2, -2.5);                             // nose-tip, philtrum, chin
  if (v < -18) h += 0.7 * Math.sin(v * 0.95) * Math.max(0, 1 - (u / 30) ** 2);                  // the furrowed forehead
  const mcv = 36 + (u / 11) ** 2 * 2.6, md = (u / 11) ** 2 + ((v - mcv) / (3.4 - (u / 11) ** 2 * 1.6)) ** 2;           // the mouth, open, a grieving curve
  const lip = (u / 16) ** 2 + ((v - 35) / 9) ** 2; if (lip < 1) h += 4.5 * (1 - lip);
  return { h, cav: md < 1 ? 1 : 0, e };
}
// the stone veil that hoods the head and falls to the shoulders, heavy folds
function ttVeil(u, v) {
  u /= TT_FS; v /= TT_FS;
  const au = Math.abs(u); let q;
  if (v < 16) { const d = Math.hypot(u / 60, (v - 16) / 84); if (d >= 1) return 0; q = 1 - d; }
  else { const hw = 60 + (v - 16) * 0.35; if (au >= hw) return 0; q = 1 - au / hw; }
  const top = clamp((16 - v) / 40, 0, 1), ang = Math.atan2(v - 16, u);
  const fold = (1 - top) * Math.sin(au * 0.42 + v * 0.04 + Math.sin(v * 0.07) * 1.2) * 2.6 + top * Math.sin(ang * 26) * 2;
  return Math.min(q * 3, 1) * (9 + 7 * q) + fold * Math.min(1, q * 4);
}
// the broken halo of thorns behind the head
function ttHalo(u, v) {
  const r = Math.hypot(u, (v + 10) / 0.97), a = Math.atan2(v + 10, u), R0 = 80;
  const broken = a > 0.15 && a < 0.8;                    // a piece has fallen away, low on the right
  let h = 0;
  if (Math.abs(r - R0) < 5 && !(broken && Math.abs(r - R0) > -1)) { h = 5 * (1 - ((r - R0) / 5) ** 2); const bead = Math.abs(((a * 30 / Math.PI) % 1 + 1) % 1 - 0.5); if (Math.abs(r - R0) < 2.2 && bead < 0.22) h += 1.6; }
  if (!broken) for (let k = 0; k < 26; k++) {
    const ta = -Math.PI + k / 26 * Math.PI * 2 + 0.06, len = 9 + hash(k, 5) * 12, da = Math.atan2(Math.sin(a - ta), Math.cos(a - ta));
    const t = (r - R0 - 4) / len; if (t < 0 || t > 1 || (hash(k, 9) < 0.18 && t > 0.45)) continue;
    const half = 2.8 * (1 - t) + 0.3; if (Math.abs(da * r) < half) h = Math.max(h, 3.2 * (1 - t) + 0.8 - Math.abs(da * r) / half);
  }
  return h;
}
function ttBuildBg() {
  const w = W, hgt = H, N = w * hgt, Hm = new Float32Array(N), Cv = new Uint8Array(N), Fm = new Uint8Array(N);
  const c = mkCanvas(w, hgt), x = c.getContext('2d'), img = x.createImageData(w, hgt), D = img.data;
  const put = (i, j, col) => { if (i < 0 || j < 0 || i >= w || j >= hgt) return; const o = (j * w + i) * 4; D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255; };
  const dith = (i, j) => TT_B4[(j & 3) * 4 + (i & 3)];
  // ---- the wall: coursed masonry, a moulding along its foot, the face and its halo carved out of it
  // ashlar courses of uneven height, blocks of uneven length
  const courses = []; for (let y = 0, r = 0; y < TT_HZ; r++) { const hgt2 = 15 + Math.floor(hash(r, 3) * 7), cuts = []; for (let x = -Math.floor(hash(r, 31) * 40); x < w + 60; x += 24 + Math.floor(hash(r, x + 500) * 34)) cuts.push(x); courses.push({ y, h: hgt2, cuts }); y += hgt2; }
  let cr = 0;
  for (let j = 0; j < TT_HZ; j++) {
    while (courses[cr + 1] && courses[cr + 1].y <= j) cr++;
    const C = courses[cr], top = j - C.y; let ci = 0;
    for (let i = 0; i < w; i++) {
      while (C.cuts[ci + 1] <= i) ci++;
      const inb = i - C.cuts[ci], bw = C.cuts[ci + 1] - C.cuts[ci], edge = Math.min(top, C.h - 1 - top, inb, bw - 1 - inb);
      let hh = 1.6 + hash(ci, cr + 90) * 1.2 + (ttFbm(i * 0.16, j * 0.16) - 0.5) * 2 - (edge < 2 ? (2 - edge) * 0.7 : 0);
      if (top === 0 || inb === 0) hh = -2.2; else if (edge < 3 && hash(i >> 1, j >> 1) < 0.3) hh -= 1.4;   // mortar, chipped arrises
      if (j >= TT_HZ - 12) { const t = j - (TT_HZ - 12); hh = [2, 4, 5, 5, 4, 2, 1, 1, 2, 3, 3, 2][t] + (hash(i >> 1, j) - 0.5) * 0.6; if ((i % 23) === 0) hh -= 1.2; }
      const u = i - TT_GX, v = j - TT_GY, abv = j < TT_HZ - 12, f = abv ? ttFace(u, v) : null, vl = abv ? ttVeil(u, v) : 0;
      const o = j * w + i, hem = -24 + (u / TT_FS / 40) ** 2 * 7, vs = v / TT_FS, gr = (ttFbm(i * 0.3, j * 0.3) - 0.5) * 1.6 + (hash(i, j + 1) - 0.5) * 0.5;
      if (f && vs > hem + 2.5) { Hm[o] = f.h + 2 + gr; Cv[o] = f.cav; Fm[o] = 1; }
      else if (f && vs > hem - 1) { Hm[o] = f.h + 5.5 - (vs - hem) * 0.4 + gr * 0.5; Fm[o] = 3; }          // the veil's hem across the brow
      else if (vl > 0) { Hm[o] = vl + gr * 0.8; Fm[o] = 3; }
      else { const hl = abv ? ttHalo(u, v) : 0; Hm[o] = hl > 0 ? hl + 0.8 + (hash(i, j) - 0.5) * 0.5 : hh; if (hl > 0) Fm[o] = 2; }
    }
  }
  // cracks: random walks cut into face, halo and wall
  const crack = (sx, sy, n, dx, seed) => { let px = sx, py = sy; for (let k = 0; k < n; k++) { const o = Math.round(py) * w + Math.round(px); if (o >= 0 && o < N) Hm[o] -= 3; py += 1; px += dx + (hash(k, seed) - 0.5) * 1.6; if (hash(k, seed + 1) < 0.05) { let qx = px, qy = py; for (let q = 0; q < 10; q++) { qx += (hash(q, seed + k) - 0.3) * 1.5; qy += 0.8; const o2 = Math.round(qy) * w + Math.round(qx); if (o2 >= 0 && o2 < N) Hm[o2] -= 2.5; } } } };
  crack(TT_GX + 9, TT_GY - 52, 44, 0.25, 11); crack(TT_GX + 20, TT_GY - 8, 30, 0.05, 21); crack(TT_GX - 30, TT_GY - 40, 26, -0.2, 31); crack(TT_GX - 8, TT_GY + 40, 16, -0.15, 41);
  crack(TT_GX + 54, 2, 40, 0.3, 51); crack(TT_GX - 60, 8, 34, -0.3, 61); crack(270, 60, 60, -0.1, 71); crack(430, 30, 80, 0.12, 81); crack(120, 0, 120, 0.1, 91);
  // a box blur of the heights, for ambient occlusion in the hollows
  const Bl = new Float32Array(N), T2 = new Float32Array(N), R = 4;
  for (let j = 0; j < TT_HZ; j++) { let s = 0; for (let i = -R; i <= R; i++) s += Hm[j * w + clamp(i, 0, w - 1)]; for (let i = 0; i < w; i++) { T2[j * w + i] = s / (2 * R + 1); s += Hm[j * w + clamp(i + R + 1, 0, w - 1)] - Hm[j * w + clamp(i - R, 0, w - 1)]; } }
  for (let i = 0; i < w; i++) { let s = 0; for (let j = -R; j <= R; j++) s += T2[clamp(j, 0, TT_HZ - 1) * w + i]; for (let j = 0; j < TT_HZ; j++) { Bl[j * w + i] = s / (2 * R + 1); s += T2[clamp(j + R + 1, 0, TT_HZ - 1) * w + i] - T2[clamp(j - R, 0, TT_HZ - 1) * w + i]; } }
  const vign = (i, j) => { const e = Math.min(i * 1.2, w - i, (hgt - j) * 1.8); let k = e < 60 ? 0.3 + 0.7 * e / 60 : 1; k *= 0.3 + 0.7 * clamp((j + 10) / 130, 0, 1); return k; };
  const rgb = (i, j, val, red) => {
    let t = Math.floor(Math.sqrt(Math.max(0, val)) * 12.5 + dith(i, j) * 1.1 + (hash(i, j + 5) > 0.985 ? 1 : 0) - (hash(i + 3, j) > 0.97 ? 1 : 0));
    const col = TT_STONE[clamp(t, 0, 11) || 0];
    return red > 0 ? [Math.min(255, col[0] * (1 + red * 0.55)), col[1] * (1 - red * 0.3), col[2] * (1 - red * 0.25)] : col;
  };
  for (let j = 0; j < TT_HZ; j++) for (let i = 0; i < w; i++) {
    const o = j * w + i;
    if (Cv[o]) { put(i, j, !Cv[o - w] ? TT_STONE[3] : hash(i, j) < 0.25 ? [22, 14, 30] : TT_STONE[0]); continue; }   // the throat
    const hx = i > 0 && i < w - 1 ? (Hm[o + 1] - Hm[o - 1]) * 0.8 : 0, hy = j > 0 && j < TT_HZ - 1 ? (Hm[o + w] - Hm[o - w]) * 0.8 : 0;
    const nl = Math.hypot(hx, hy, 1), nx = -hx / nl, ny = -hy / nl, nz = 1 / nl;
    let val = 0.008 + Math.max(0, -nx * 0.55 - ny * 0.62 + nz * 0.4) ** 2 * 0.07, red = 0;
    for (const L of TT_LIGHTS) {
      const lx = L.x - i, ly = L.y - j, lz = L.z - Hm[o], d = Math.hypot(lx, ly, lz), ndl = Math.max(0, (nx * lx + ny * ly + nz * lz) / d);
      const k = ndl ** 1.5 * L.i / (1 + (d / L.r) ** 2); val += k * 0.8; if (L.red) red += k * 1.6;
    }
    // a cold shaft from high on the left, falling across the god's brow
    const bd = Math.abs((i - 312) - (j - 30) * 0.5) / 1.118, beam = clamp(1 - bd / 30, 0, 1) ** 1.5 * clamp(1.2 - j / 140, 0, 1);
    const cold = beam * Math.max(0, -nx * 0.5 - ny * 0.75 + nz * 0.45) * 0.55;
    val += cold; const cf = cold / (val + 0.0001);
    const ao = clamp(1 + (Hm[o] - Bl[o]) * 0.2, 0.15, 1.25);
    val *= ao * vign(i, j) * (Fm[o] ? 1 : 0.72 + 0.4 * ttNoise(i * 0.45, j * 0.025 + 30));
    if (j === TT_HZ - 1 || j === TT_HZ - 2) val *= 0.35;                // the altar's contact shadow on the wall
    const cc = rgb(i, j, val, Math.min(0.8, red * (ny > 0 ? 1 : 0.4)));
    put(i, j, cf > 0.05 ? [cc[0] * (1 - 0.4 * cf), cc[1] * (1 - 0.12 * cf), Math.min(255, cc[2] * (1 + 0.35 * cf))] : cc);
  }
  // blood from the shut eyes: runs down the cheeks, gathers at the jaw and the chin
  const F = TT_FS, ey = TT_GY + Math.round(2 * F);
  const tear = (sx, out, seed, len, wet) => { let px = sx, py = ey; for (let k = 0; k < len; k++) { const ix = Math.round(px), iy = Math.round(py); if (!Fm[iy * w + ix]) break; put(ix, iy, TT_BLD[k < 3 ? 4 : hash(k, seed) < 0.12 ? 4 : 3]); if (k < 4 || (k < 30 && hash(k, seed + 5) < 0.25)) put(ix + 1, iy, TT_BLD[2]); if (wet && k % 7 === 3) put(ix - Math.sign(out), iy, TT_BLD[5]); py += 1; const f = k / len; px += out * 0.06 + (hash(k, seed) - 0.5) * 0.3; if (f > 0.7 && hash(k, seed + 9) < (f - 0.7) * 3) break; } };
  tear(TT_GX - Math.round(17 * F), -1, 3, 66, 1); tear(TT_GX + Math.round(17 * F), 1, 7, 64, 1);
  for (let j = TT_CHIN - 9; j <= TT_CHIN; j++) for (let i = TT_GX - 8; i <= TT_GX + 7; i++) if (Fm[j * w + i] && hash(i, j) < 0.2 + (j - TT_CHIN + 9) * 0.07) put(i, j, TT_BLD[j === TT_CHIN ? 4 : 2 + (hash(i + 1, j) < 0.2 ? 1 : 0)]);
  put(TT_GX - 2, TT_CHIN - 1, TT_BLD[6]); put(TT_GX + 3, TT_CHIN - 4, TT_BLD[5]);
  // ---- chains hanging out of the dark
  const chain = (cx, len) => { for (let y = 0; y < len; y++) { const lk = Math.floor(y / 4), side = lk & 1, lit = clamp(0.25 + 0.5 * (y / len), 0, 1) * vign(cx, y); const tn = Math.round(lit * 4); const cy = y % 4; if (side) { put(cx, y, TT_IRON[clamp(tn + (cy === 1 ? 1 : 0), 0, 5)]); put(cx + 1, y, TT_IRON[clamp(tn - 1, 0, 5)]); } else if (cy === 0 || cy === 3) { put(cx - 1, y, TT_IRON[clamp(tn, 0, 5)]); put(cx, y, TT_IRON[clamp(tn + 1, 0, 5)]); put(cx + 1, y, TT_IRON[clamp(tn, 0, 5)]); put(cx + 2, y, TT_IRON[1]); } else { put(cx - 1, y, TT_IRON[clamp(tn + 1, 0, 5)]); put(cx + 2, y, TT_IRON[clamp(tn - 1, 0, 5)]); put(cx, y, TT_IRON[0]); put(cx + 1, y, TT_IRON[0]); } }
    for (let a = 0; a < 6.28; a += 0.25) { const px = Math.round(cx + 0.5 + Math.cos(a) * 3.5), py = Math.round(len + 3 + Math.sin(a) * 3.5); put(px, py, TT_IRON[a > 3.14 ? 2 : 4]); } };
  chain(262, 58); chain(270, 36); chain(418, 46); chain(470, 72);
  // ---- the altar top: flagstones in perspective, grit, old wax and old blood
  const vpY = TT_HZ - 300, rows = [TT_HZ, TT_HZ + 8, TT_HZ + 20, TT_HZ + 37, TT_HZ + 60, TT_HZ + 92, 999];
  for (let j = TT_HZ; j < hgt; j++) {
    let r = 0; while (rows[r + 1] <= j) r++;
    const sc = (TT_HZ - vpY) / (j - vpY), roff = hash(r, 17) * 50;
    for (let i = 0; i < w; i++) {
      let val = 0.02;
      for (const L of TT_LIGHTS) { const dx = L.x - i, dy = (L.y + 14 - j) * 2.1; val += L.i * 0.5 / (1 + (dx * dx + dy * dy) / (L.r * L.r * 0.9)); }
      const vx = TT_GX + (i - TT_GX) * sc + roff, cell = Math.floor(vx / 52), inx = ((vx % 52) + 52) % 52;
      val *= 0.72 + (ttFbm(i * 0.12, j * 0.3) - 0.5) * 0.55 + (hash(cell, r + 40) - 0.5) * 0.25;
      if (j === rows[r] && r > 0) val *= 0.2; else if (j === rows[r] + 1 && r > 0) val *= 1.25;
      if (inx < sc * 1.2) val *= 0.25; else if (inx < sc * 2.4) val *= 1.2;
      if (j === TT_HZ) val = val * 1.5 + 0.06;                          // the altar's worn back edge catching the candles
      // the bowl's shadow and the candles' contact shadows, pushed forward by the lights behind
      const sh = Math.hypot((i - TT_BX) / (TT_ORX + 12), (j - TT_BY - 22) / (TT_ORY + 10)); if (sh < 1) val *= 0.3 + 0.6 * sh * sh;
      val *= vign(i, j);
      put(i, j, rgb(i, j, val, 0));
    }
  }
  // cracks in the altar top
  for (let k = 0; k < 7; k++) { let px = 200 + hash(k, 3) * 270, py = TT_HZ + 3 + hash(k, 4) * 110; for (let q = 0; q < 30 + hash(k, 5) * 40; q++) { const o = (Math.round(py) * w + Math.round(px)) * 4; if (o > 0 && o < D.length) { D[o] *= 0.4; D[o + 1] *= 0.4; D[o + 2] *= 0.4; } px += 1; py += (hash(q, k + 7) - 0.5) * 1.3; } }
  // old blood: stains, and a spill run from the bowl's lip down the front of the altar
  const stain = (sx, sy, rx, ry, k2) => { for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) if ((i / rx) ** 2 + (j / ry) ** 2 < 0.6 + 0.4 * ttNoise((sx + i) * 0.3, (sy + j) * 0.3 + k2)) { const o = ((sy + j) * w + sx + i) * 4; if (o >= 0 && o < D.length) { D[o] = D[o] * 0.7 + 14; D[o + 1] *= 0.35; D[o + 2] *= 0.4; } } };
  stain(300, 160, 18, 5, 1); stain(410, 172, 10, 3, 2); stain(280, 262, 24, 6, 3); stain(398, 258, 14, 4, 4); stain(215, 190, 9, 3, 5);
  // ---- the bronze bowl: its shadowed belly, a wide rim cut with runes, the inside wall above the blood
  const inE = (i, j, cx, cy, rx, ry) => ((i - cx) / rx) ** 2 + ((j - cy) / ry) ** 2 <= 1;
  const aL = Math.atan2((TT_LIGHTS[0].y - TT_BY) / TT_ORY, (TT_LIGHTS[0].x - TT_BX) / TT_ORX), aR = Math.atan2((TT_LIGHTS[1].y - TT_BY) / TT_ORY, (TT_LIGHTS[1].x - TT_BX) / TT_ORX);
  for (let j = TT_BY; j < hgt; j++) for (let i = TT_BX - TT_ORX; i <= TT_BX + TT_ORX; i++) {
    // a squat foot under the belly
    if (inE(i, j, TT_BX, TT_BY + 50, 34, 9) && !inE(i, j, TT_BX, TT_BY + 14, TT_ORX - 6, TT_ORY - 2)) { const u = (i - TT_BX) / 34; put(i, j, TT_BRZ[clamp(Math.floor(1.6 + Math.abs(u) * 2 * (Math.abs(u) > 0.7 ? 1 : 0.3) + dith(i, j)), 0, 4)]); continue; }
    if (!inE(i, j, TT_BX, TT_BY + 14, TT_ORX - 6, TT_ORY - 2) || inE(i, j, TT_BX, TT_BY, TT_ORX, TT_ORY)) continue;
    const u = (i - TT_BX) / (TT_ORX - 6), v = (j - TT_BY - 14) / (TT_ORY - 2);
    let L = 0.16 + Math.max(0, Math.abs(u) - 0.62) * 1.5 + (v > 0.88 ? 0.1 : 0) + dith(i, j) * 0.14 - Math.max(0, v - 0.4) * 0.2;
    if (Math.abs(Math.abs(u) - 0.8) < 0.02) L += 0.25;                     // two sharp gleams on the flanks
    if (Math.abs(v + 0.1 - u * u * 0.05) < 0.06) L += 0.1;                 // a raised band round the belly
    const pt = ttFbm(i * 0.2, j * 0.25);
    if (pt > 0.7 && v > 0.1 && hash(i, j) < 0.5) put(i, j, TT_PAT[clamp(Math.floor((pt - 0.7) * 12 + dith(i, j)), 0, 2)]);
    else put(i, j, TT_BRZ[clamp(Math.floor(L * 9), 0, 6)]);
  }
  // blood that ran over the lip and down the belly
  for (const [bx, len, s] of [[TT_BX - 22, 16, 1], [TT_BX + 9, 26, 2], [TT_BX + 30, 11, 3], [TT_BX - 50, 9, 4]]) { let px = bx; for (let k = 0; k < len; k++) { const py = TT_BY + TT_ORY - 3 + k + Math.round(Math.abs(bx - TT_BX) * -0.18 * 0); put(Math.round(px), py, TT_BLD[k === len - 1 ? 5 : 3]); if (k < len - 2) put(Math.round(px) + 1, py, TT_BLD[2]); px += (hash(k, s) - 0.5) * 0.4; } put(Math.round(px), TT_BY + TT_ORY - 3 + len, TT_BLD[6]); }
  for (let j = 0; j < hgt; j++) for (let i = TT_BX - TT_ORX; i <= TT_BX + TT_ORX; i++) {
    const o = Math.hypot((i - TT_BX) / TT_ORX, (j - TT_BY) / TT_ORY), n = Math.hypot((i - TT_BX) / TT_IRX, (j - TT_BY) / TT_IRY);
    if (o > 1 || n < 1) continue;
    const ang = Math.atan2((j - TT_BY) / TT_ORY, (i - TT_BX) / TT_ORX), lit = Math.max(Math.cos(ang - aL), Math.cos(ang - aR), 0) ** 4;
    const across = (1 - o) / (1 - TT_IRX / TT_ORX);
    let L = 0.2 + lit * 0.5 + (across < 0.12 ? 0.18 : across > 0.88 ? -0.14 : 0) + dith(i, j) * 0.12 + (ttFbm(i * 0.4, j * 0.4) - 0.5) * 0.18;
    if (lit > 0.9 && across > 0.3 && across < 0.55) L = 1.08;
    if (Math.sin(ang) > 0.2 && across > 0.35 && ttFbm(i * 0.25 + 5, j * 0.3) > 0.7 && hash(i, j) < 0.6) put(i, j, TT_PAT[clamp(Math.floor(1 + dith(i, j) * 2), 0, 3)]);
    else put(i, j, TT_BRZ[clamp(Math.floor(L * 9), 0, 9)]);
  }
  for (let k = 0; k < 22; k++) {
    const a = k / 22 * Math.PI * 2 + 0.1, mr = (1 + TT_IRX / TT_ORX) / 2, cx = TT_BX + Math.cos(a) * TT_ORX * mr, cy = TT_BY + Math.sin(a) * TT_ORY * mr;
    const g = TT_RUNES[k % TT_RUNES.length].split('|'), front = Math.sin(a) > 0, sy = front ? 1 : 0.8;
    for (let r = 0; r < 5; r++) for (let q = 0; q < 5; q++) if (g[r][q] === '1') { const px = Math.round(cx - 2 + q), py = Math.round(cy - 2 + r * sy); put(px, py, TT_BRZ[0]); if (g[r + 1] == null || g[r + 1][q] !== '1') put(px, py + 1, TT_BRZ[4]); }
  }
  for (let j = 0; j < hgt; j++) for (let i = TT_BX - TT_IRX; i <= TT_BX + TT_IRX; i++) {
    if (!inE(i, j, TT_BX, TT_BY, TT_IRX, TT_IRY) || inE(i, j, TT_SX, TT_SY, TT_SRX, TT_SRY)) continue;
    const u = (i - TT_BX) / TT_IRX; let L = 0.1 + Math.abs(u) * 0.22 + dith(i, j) * 0.1; if (j > TT_SY) L -= 0.1;
    put(i, j, TT_BRZ[clamp(Math.floor(L * 8), 0, 3)]);
  }
  // ---- candles: tallow gone yellow and grey, drips down their sides, pooled wax at their feet
  for (const [cx, by, ch, cw] of TT_CANDLES) {
    const x0 = cx - (cw >> 1);
    for (let i = -cw - 2; i <= cw + 2; i++) for (let j = -2; j <= 1; j++) if ((i / (cw + 2.5)) ** 2 + (j / 2.2) ** 2 < 1 && hash(i + cx, j + by) < 0.9) put(cx + i, by + j, TT_WAX[j < 0 ? 2 : 1]);
    for (let c2 = 0; c2 < cw; c2++) {
      const top = ch - (hash(c2, cx) < 0.35 ? 1 : 0) - (c2 === 0 || c2 === cw - 1 ? 1 : 0);
      for (let r = 0; r < top; r++) { let t = 3 + (c2 === 0 ? 1 : c2 === cw - 1 ? -1 : 0) + (r > top - 4 ? 1 : 0) - (r < 3 ? 1 : 0); if (hash(cx + c2, by - r) < 0.12) t -= 1; put(x0 + c2, by - r, TT_WAX[clamp(t, 0, 6)]); }
    }
    for (const [dc, s] of [[-1, 1], [cw, 2]]) if (hash(cx, s) < 0.7) { const l = 2 + Math.floor(hash(cx, s + 4) * ch * 0.6); for (let r = 0; r < l; r++) put(x0 + dc, by - ch + 2 + r, TT_WAX[r === l - 1 ? 5 : 4]); }
    put(cx, by - ch, TT_WAX[5]); put(cx, by - ch - 1, [20, 12, 8]);
  }
  x.putImageData(img, 0, 0);
  return c;
}
// the reflection: a hooded figure bent over the bowl, a face lost in the hood's dark, two points of light for eyes
function ttBuildRefl() {
  const w = 220, h = 110, c = mkCanvas(w, h), x = c.getContext('2d');
  x.fillStyle = '#fff';
  x.beginPath(); x.moveTo(0, h); x.quadraticCurveTo(20, 60, 70, 52); x.quadraticCurveTo(84, 18, 110, 4); x.quadraticCurveTo(136, 18, 150, 52); x.quadraticCurveTo(200, 60, w, h); x.fill();
  const m = x.getImageData(0, 0, w, h).data, M = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) if (m[i * 4 + 3] > 120) M[i] = 1;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const d = Math.hypot((i - 110) / 13, (j - 54) / 25); if (d < 1 && M[j * w + i]) M[j * w + i] = 2; }
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if (M[j * w + i] !== 2) continue; const u = (i - 110) / 13, v = (j - 54) / 25; if (v < -0.3 || Math.abs(u) > 0.62 || (v > 0.35 && Math.abs(u) > 0.35 && Math.abs(u) < 0.75) || (Math.abs(u) < 0.12 && v > 0.1 && v < 0.35)) M[j * w + i] = 1; if (Math.abs(u) > 0.3 && Math.abs(u) < 0.62 && v > -0.05 && v < 0.12) M[j * w + i] = 4; }
  for (const ex of [104, 116]) { for (let i = ex - 2; i <= ex + 2; i++) M[45 * w + i] = 1; for (let i = ex - 1; i <= ex + 1; i++) M[46 * w + i] = 1; M[46 * w + ex] = 3; M[46 * w + ex + (ex < 110 ? 1 : -1)] = 3; }
  for (let i = 106; i <= 114; i++) M[70 * w + i] = 1;
  const E = M.slice(); for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) if (M[j * w + i] === 1 && (!M[j * w + i - 1] || !M[j * w + i + 1] || !M[(j - 1) * w + i])) E[j * w + i] = 5;
  return { w, h, M: E };
}
// film grain: a few frames of scattered dark and pale specks, cycled
function ttBuildGrain() {
  const out = [];
  for (let f = 0; f < 4; f++) {
    const c = mkCanvas(W, H), x = c.getContext('2d'), img = x.createImageData(W, H), D = img.data;
    for (let i = 0; i < W * H; i++) { const r = hash(i, f * 31 + 7); if (r < 0.07) { D[i * 4 + 3] = 70; } else if (r > 0.988) { D[i * 4] = 200; D[i * 4 + 1] = 170; D[i * 4 + 2] = 140; D[i * 4 + 3] = 18; } }
    x.putImageData(img, 0, 0); out.push(c);
  }
  return out;
}
// the shaft of cold light from high on the left: dithered bands, drawn additively
function ttBuildShaft() {
  const c = mkCanvas(W, H), x = c.getContext('2d'), img = x.createImageData(W, H), D = img.data;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const bd = ((i - 312) - (j - 30) * 0.5) / 1.118, a = clamp(1 - Math.abs(bd) / 32, 0, 1) * clamp(1.15 - j / 170, 0, 1) * (0.55 + 0.45 * ttNoise(bd * 0.18 + 40, 3));
    const q = a * 3 + TT_B4[(j & 3) * 4 + (i & 3)] * 0.9; if (q < 0.6) continue;
    const o = (j * W + i) * 4; D[o] = 70; D[o + 1] = 84; D[o + 2] = 110; D[o + 3] = q > 1.8 ? 60 : q > 1.1 ? 38 : 20;
  }
  x.putImageData(img, 0, 0); return c;
}
function ttUpdate(dt) {
  TT.hover = null;
  if (!(dt > 0)) return;
  // a drop swells on the god's chin, lets go, and falls into the bowl
  TT.nextDrop -= dt; TT.drip = clamp(1 - TT.nextDrop / 2.4, 0, 1);
  if (TT.nextDrop <= 0) { TT.nextDrop = 1.8 + Math.random() * 2.4; TT.drops.push({ x: TT_GX - 1, y: TT_CHIN + 1, ty: TT_SY - 4 + Math.random() * 10, v: 10 }); }
  for (const d of TT.drops) { d.v += 380 * dt; d.y += d.v * dt; if (d.y >= d.ty) { d.done = true; TT.rings.push({ x: d.x, y: d.ty, r: 0, t: 0 }); for (let k = 0; k < 6; k++) TT.sparks.push({ x: d.x, y: d.ty, vx: (Math.random() - 0.5) * 34, vy: -34 - Math.random() * 34, t: 0 }); if (typeof sfx === 'function' && G.musicOn !== false && Math.random() < 0.7) sfx(700 + Math.random() * 250, 0.06, 'sine', 0.008, -520); } }
  TT.drops = TT.drops.filter(d => !d.done);
  for (const r of TT.rings) { r.t += dt; r.r += dt * 14 / (1 + r.t * 0.6); }
  TT.rings = TT.rings.filter(r => r.t < 3.4);
  for (const s of TT.sparks) { s.t += dt; s.vy += 260 * dt; s.x += s.vx * dt; s.y += s.vy * dt; }
  TT.sparks = TT.sparks.filter(s => s.t < 0.35);
  // embers off the candles, ash drifting down through the dark
  if (TT.motes.length < 46 && Math.random() < dt * 9) {
    if (Math.random() < 0.55) { const c = TT_CANDLES[(Math.random() * TT_CANDLES.length) | 0]; TT.motes.push({ x: c[0], y: c[1] - c[2] - 4, vx: (Math.random() - 0.5) * 4, vy: -8 - Math.random() * 10, t: 0, life: 1.4 + Math.random() * 2.2, ember: true }); }
    else TT.motes.push({ x: 290 + Math.random() * 120, y: -2, vx: (Math.random() - 0.3) * 3, vy: 3 + Math.random() * 4, t: 0, life: 20, ember: false });
  }
  for (const m of TT.motes) { m.t += dt; m.x += (m.vx + Math.sin(G.time * 1.3 + m.y * 0.1) * (m.ember ? 3 : 1.5)) * dt; m.y += m.vy * dt; }
  TT.motes = TT.motes.filter(m => m.t < m.life && m.y < H + 2 && m.y > -4);
}
function ttDrawBlood() {
  if (!TT.frame) { TT.frame = mkCanvas(TT_SRX * 2 + 2, TT_SRY * 2 + 2); TT.fx = TT.frame.getContext('2d'); TT.fd = TT.fx.createImageData(TT.frame.width, TT.frame.height); }
  const Wf = TT.frame.width, Hf = TT.frame.height, D = TT.fd.data, R = TT.refl, t = G.time;
  const x0 = TT_SX - TT_SRX - 1, y0 = TT_SY - TT_SRY - 1;
  const cand = [[TT_SX - (236 - TT_SX) * 0.42, TT_SY - 17], [TT_SX - (452 - TT_SX) * 0.42, TT_SY - 17]];
  for (let j = 0; j < Hf; j++) for (let i = 0; i < Wf; i++) {
    const X = x0 + i, Y = y0 + j, u = (X - TT_SX) / TT_SRX, v = (Y - TT_SY) / TT_SRY, rr = u * u + v * v, o = (j * Wf + i) * 4;
    if (rr > 1) { D[o + 3] = 0; continue; }
    let crest = 0, bend = 0;
    for (const r of TT.rings) { const d = Math.hypot(X - r.x, (Y - r.y) * 2.2), f = Math.max(0, 1 - r.t / 3.4), q = d - r.r; if (Math.abs(q) < 5) { bend += Math.sin(q * 1.4) * 2.2 * f; if (Math.abs(q) < 0.9) crest += f; else if (q > 0.9 && q < 2) crest -= f * 0.5; } }
    const sx = X + Math.sin(Y * 0.31 + t * 1.1) * 0.9 + bend, sy = Y + Math.sin(X * 0.07 + t * 0.7) * 0.6 + bend * 0.5;
    let L = 3.6 - rr * 2.2;
    const ri = Math.round((sx - TT_SX) * TT_RS + R.w / 2), rj = Math.round((sy - TT_SY) * TT_RS + R.h * 0.6);
    const m = ri >= 0 && rj >= 0 && ri < R.w && rj < R.h ? R.M[rj * R.w + ri] : 0;
    if (m === 1) L -= 2.4; else if (m === 5) L -= 0.4; else if (m === 2) L -= 1.4; else if (m === 4) L -= 0.4; else if (m === 3) L = 7.4 + Math.sin(t * 2) * 0.4;
    for (const [mx, my] of cand) { const dx = Math.abs(sx - mx), dy = Math.abs(sy - my); if (dx < 0.8 && dy < 3.5) L = Math.max(L, 8 - dy * 0.5); else if (dx < 5 && dy < 7 && m !== 1) L += (5 - dx) * 0.1; }
    L += crest * 2.2 + TT_B4[(Y & 3) * 4 + (X & 3)] * 0.9;
    if (rr > 0.88) L = Math.min(L, 1 + (1 - rr) * 8);
    const col = TT_BLD[clamp(Math.floor(L), 0, 8)];
    D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255;
  }
  TT.fx.putImageData(TT.fd, 0, 0);
  ctx.drawImage(TT.frame, x0, y0);
}
// the god's dying breath: slow, heavy, it spills from the mouth and pools across the altar
const TT_MX = TT_GX - 130, TT_MY = TT_GY + 30, TT_MW = 260, TT_MH = H - TT_GY - 30;
function ttDrawBreath() {
  if (!TT.mist) { TT.mist = mkCanvas(TT_MW, TT_MH); TT.mx = TT.mist.getContext('2d'); TT.md = TT.mx.createImageData(TT_MW, TT_MH); TT.mistT = -1; }
  if (G.time - TT.mistT < 0.066 && G.time >= TT.mistT) { ctx.drawImage(TT.mist, TT_MX, TT_MY); return; }   // the breath is slow: 15 updates a second are plenty
  TT.mistT = G.time;
  const D = TT.md.data, t = G.time, br = 0.75 + 0.25 * Math.sin(t * 0.55), my0 = TT_GY + Math.round(38 * TT_FS);
  const C = [[50, 42, 60, 0.18], [72, 60, 84, 0.26], [100, 88, 116, 0.34]];
  for (let j = 0; j < TT_MH; j++) {
    const Y = TT_MY + j, yy = Y - my0;
    for (let i = 0; i < TT_MW; i++) {
      const X = TT_MX + i, u = X - TT_GX, o = (j * TT_MW + i) * 4;
      const wd = 6 + Math.max(0, yy) * 0.55, core = Math.exp(-((u / wd) ** 2)) * clamp(1 - yy / 150, 0, 1) * clamp((yy + 4) / 8, 0, 1);
      const inB = ((X - TT_SX) / TT_SRX) ** 2 + ((Y - TT_SY) / TT_SRY) ** 2 < 1 ? 0.2 : 1;
      const pool = Y > TT_HZ ? inB * 0.5 * Math.exp(-(((Y - 176) / 34) ** 2)) * Math.exp(-((u / 125) ** 2)) : 0;
      let d = Math.max(core * br * (inB < 1 ? 0.55 : 1), pool * (0.8 + 0.2 * br));
      if (d < 0.05) { D[o + 3] = 0; continue; }
      const n = ttFbm(X * 0.05 + Math.sin(t * 0.15) * 0.6, (Y - t * 9) * 0.06 + (u * u) * 0.0004);
      d *= n * 2.1 - 0.35;
      const q = d + TT_B4[(Y & 3) * 4 + (X & 3)] * 0.18;
      const lv = q > 0.62 ? 2 : q > 0.4 ? 1 : q > 0.22 ? 0 : -1;
      if (lv < 0) { D[o + 3] = 0; continue; }
      const c = C[lv]; D[o] = c[0]; D[o + 1] = c[1]; D[o + 2] = c[2]; D[o + 3] = c[3] * 255;
    }
  }
  TT.mx.putImageData(TT.md, 0, 0);
  ctx.drawImage(TT.mist, TT_MX, TT_MY);
}
function ttDrawFlame(cx, top, k, seed) {
  const fx = cx, fy = top - 2, lean = Math.round(Math.sin(G.time * 5 + seed) * 0.8 + k * 0.4), tall = 3 + (Math.sin(G.time * 11 + seed * 3) > 0.3 ? 1 : 0);
  ctx.fillStyle = '#7a2a10'; ctx.fillRect(fx + lean, fy - tall - 1, 1, 2); ctx.fillRect(fx - 1, fy - 2, 3, 3);
  ctx.fillStyle = '#d0601c'; ctx.fillRect(fx + lean, fy - tall, 1, tall); ctx.fillRect(fx, fy - 2, 1, 3);
  ctx.fillStyle = '#ffc070'; ctx.fillRect(fx, fy - 1, 1, 2);
  ctx.fillStyle = '#2a3080'; ctx.fillRect(fx, fy + 1, 1, 1);
}
function drawTitleScene(dt) {
  if (!TT.bg) { TT.bg = ttBuildBg(); TT.refl = ttBuildRefl(); TT.grain = ttBuildGrain(); const bx = TT.bg.getContext('2d'); bx.globalCompositeOperation = 'lighter'; bx.drawImage(ttBuildShaft(), 0, 0); bx.globalCompositeOperation = 'source-over'; }
  ttUpdate(dt);
  const t = G.time;
  ctx.drawImage(TT.bg, 0, 0);
  ttDrawBlood();
  // the drop swelling on the chin, then falling, and the crowns it throws up
  if (TT.drip > 0.3) { ctx.fillStyle = '#5e1016'; ctx.fillRect(TT_GX - 1, TT_CHIN, 1, 1 + (TT.drip > 0.75 ? 1 : 0)); if (TT.drip > 0.75) { ctx.fillStyle = '#b83026'; ctx.fillRect(TT_GX - 1, TT_CHIN + 1, 1, 1); } }
  for (const d of TT.drops) { const x = Math.round(d.x), y = Math.round(d.y); ctx.fillStyle = '#420a10'; ctx.fillRect(x, y - 3, 1, 3); ctx.fillStyle = '#84181c'; ctx.fillRect(x, y, 1, 2); ctx.fillStyle = '#e8704e'; ctx.fillRect(x, y, 1, 1); }
  for (const s of TT.sparks) { ctx.fillStyle = s.t < 0.15 ? '#b83026' : '#5e1016'; ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1); }
  ttDrawBreath();
  // flames, and the light they throw, breathing with them
  ctx.globalCompositeOperation = 'lighter';
  const fl = (s) => 0.5 + 0.5 * Math.sin(t * 9 + s) * Math.sin(t * 5.3 + s * 2);
  glow(238, 142, 80 + fl(1) * 6, '255,120,50', 0.09 + fl(1) * 0.025); glow(452, 142, 80 + fl(2) * 6, '255,120,50', 0.09 + fl(2) * 0.025);
  glow(TT_SX, TT_SY, 95, '140,16,20', 0.08);
  ctx.globalCompositeOperation = 'source-over';
  TT_CANDLES.forEach(([cx, by, ch], n) => ttDrawFlame(cx, by - ch, fl(n), n * 1.7));
  ctx.globalCompositeOperation = 'lighter';
  TT_CANDLES.forEach(([cx, by, ch], n) => glow(cx + 0.5, by - ch - 4, 10 + fl(n) * 3, '255,150,70', 0.2));
  for (const m of TT.motes) {
    const a = m.ember ? Math.max(0, 1 - m.t / m.life) : Math.min(1, m.t) * 0.5;
    ctx.fillStyle = m.ember ? `rgba(255,${120 + (a * 60 | 0)},50,${a})` : `rgba(160,140,120,${a * 0.5})`;
    ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
  }
  ctx.globalCompositeOperation = 'source-over';
  if (TT.grain) ctx.drawImage(TT.grain[((Math.floor(t * 14) % 4) + 4) % 4], 0, 0);
}
