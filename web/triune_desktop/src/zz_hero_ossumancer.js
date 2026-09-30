// =================================================================== v0.37: THE OSSUARCH, sculpted (knight of the Bearing Mother)
// A heavy knight in plate made of real bone, with Tibetan cloth over it. The pauldrons are layered shoulder blades,
// the breastplate is a cage of ribs on a sternum ridge, vertebrae run along the arms, the faulds are hip bones and
// the greaves are shin bones. A torn maroon shawl (the zen) crosses the chest from the left shoulder to the right hip
// and hangs heavy down the back; a saffron under-robe shows at the ragged hem and a saffron fringe crest (the Gelug
// crest) runs over the closed bone helm. A mala of finger bones hangs on the ribs. A darchog pole of joined long bones
// rises from behind the left pauldron with faded prayer flags, and the skull lantern hangs from its crook.
// The weapon is a heavy falchion: a black iron slab with an edge of set bone teeth, a saffron-wrapped grip.
// Matte dry bone; green-white phosphor only in the joint seams.
// v0.37 painter: a small SCULPT. Every part is a 3D form (capsules, ellipsoids, bevelled plates and cloth surfaces
// with real folds) laid into a depth buffer, lit per pixel by a warm key from the upper left, a cool rim, bounce light
// from below, screen-space cast shadows and contact occlusion, then quantized into hand-picked hue-shifted ramps
// (violet shadows, ochre lights) with a coloured, broken outline. Painted as an `_hr` twin at 1.5x the world grain
// (120x102 for an 80x68 world frame, feet at 38,64), so each hero pixel is exactly 2 screen pixels at ZK 0.75.
// Tag: o6 (every top-level name here starts with O6 / o6).
const O6 = { FW: 80, FH: 68, OX: 38, OY: 64, K: 1.5 };
const O6_HW = O6.FW * O6.K, O6_HH = O6.FH * O6.K, O6_HX = O6.OX * O6.K, O6_HY = O6.OY * O6.K, O6_S = O6.K / 2;   // rig units are half-world px
const O6_PHI = { side: 0, front: Math.PI / 4, down: Math.PI / 2, back: -Math.PI / 4, up: -Math.PI / 2 };
const O6_PH = { idle: 4, walk: 8, atk: 4, batk: 4, cast: 4, charge: 4, leap: 2, pull: 4, crush: 4, sweep: 6, lash: 4, lashw: 4, gleap: 5, gcharge: 3 };
// Melee skill ids that pick a Carapace attack pose. Extended per milestone.
const O6_MELEE = { crush: 'crush', bscythe: 'sweep', lash: 'lash', leap: 'gleap', gcharge: 'gcharge', blade: 'batk' };
// which weapon each pose puts in his hands (anything not listed shows the equipped falchion)
const O6_WPN = { crush: 'maul', sweep: 'scythe', gleap: 'scythe', gcharge: 'scythe', lash: 'whip', lashw: 'whip', batk: 'blade' };
const O6_BOX = { w: 22, h: 44 };
const o6A = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], o6S = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], o6M = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const o6Dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], o6Len = a => Math.hypot(a[0], a[1], a[2]), o6N = a => o6M(a, 1 / (o6Len(a) || 1));
const o6Lp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const o6H = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const o6VN = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), h = (a, b) => o6H(a * 7 + s * 131, b * 13 + s * 17); return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
const o6Hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// ------------------------------------------------------------------- materials: hue-shifted ramps, dark to light
const O6M = [], O6MI = {};
function o6Mat(name, hexes, o) { O6MI[name] = O6M.length; O6M.push(Object.assign({ name, ramp: hexes.map(o6Hex), tex: 0.05, crack: 0, spec: 0, wrap: 0, emis: false, ts: 0.45, aniso: 1, gain: 1 }, o || {})); }
o6Mat('bone', ['#150f1b', '#2a2130', '#43383f', '#615246', '#806c55', '#9f876a', '#bda57f', '#d6c296'], { tex: 0.13, crack: 0.028, ts: 0.5 });
o6Mat('boneP', ['#120d17', '#221a27', '#372c35', '#50433e', '#6a584a', '#86705a', '#a88d6c', '#e6d2a2'], { tex: 0.22, crack: 0.042, ts: 0.6, gain: 0.8, spec: 0.035 });
o6Mat('boneD', ['#120d16', '#221a26', '#372c33', '#524439', '#6f5c48', '#8c765a', '#a8906c'], { tex: 0.09, crack: 0.026 });
o6Mat('mar', ['#0f060e', '#1b0914', '#2b0e1b', '#3f1421', '#561c25', '#70292b', '#8a3c33'], { wrap: 0.35, tex: 0.05, ts: 0.3 });
o6Mat('marD', ['#0c050b', '#150810', '#210c16', '#30121c', '#401922', '#542428'], { wrap: 0.3, tex: 0.05 });
o6Mat('saf', ['#200c0b', '#3a1a0e', '#5c2d10', '#824614', '#a5621d', '#c3812d', '#dca248'], { wrap: 0.3, tex: 0.06 });
o6Mat('fringe', ['#1a0b0c', '#2e160f', '#4a2511', '#683714', '#874d1a', '#a36826', '#bd8538'], { wrap: 0.2, tex: 0.3, ts: 0.3, aniso: 6 });
o6Mat('lea', ['#0f0a0f', '#191217', '#261b1d', '#372823', '#4a372c', '#5e4838'], { tex: 0.07 });
o6Mat('iron', ['#0a0910', '#13131c', '#1e1d27', '#2d2b34', '#403c41', '#5a524f', '#86786a', '#c8b89a'], { spec: 0.015, tex: 0.1, gain: 0.8 });
o6Mat('f0', ['#0e1019', '#1a2233', '#28364b', '#3a4c62', '#4e6276'], { wrap: 0.4, tex: 0.08 });
o6Mat('f1', ['#1c1820', '#35302f', '#554d45', '#77695a', '#978670'], { wrap: 0.4, tex: 0.08 });
o6Mat('f2', ['#180810', '#301016', '#4c1a1c', '#682a26', '#823c30'], { wrap: 0.4, tex: 0.08 });
o6Mat('f3', ['#0f120f', '#1c2518', '#2c3a22', '#40502e', '#56663c'], { wrap: 0.4, tex: 0.08 });
o6Mat('f4', ['#1d130c', '#382810', '#5a4216', '#7c5c20', '#9a782e'], { wrap: 0.4, tex: 0.08 });
o6Mat('ink', ['#07050a', '#0b0810', '#100b14'], { tex: 0 });
o6Mat('glow', ['#26402e', '#467a52', '#86bc8c', '#c8ecc8', '#f2fff0'], { emis: true });
o6Mat('boneM', ['#1c1620', '#342a32', '#51443f', '#76644f', '#9a8464', '#bca47c', '#d8c49a', '#ecdcb4'], { tex: 0.12, crack: 0.024, ts: 0.5, gain: 1.12 });
const O6_FLAGS = ['f0', 'f1', 'f2', 'f3', 'f4'];

// ------------------------------------------------------------------- the sculpt: forms into a depth buffer, lit per pixel
function O6Sculpt(W, H) {
  const N = W * H, Z = new Float32Array(N).fill(-1e9), NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N);
  const M = new Int16Array(N).fill(-1), TU = new Float32Array(N), TV = new Float32Array(N), ID = new Int16Array(N).fill(-1), DK = new Float32Array(N), EM = new Float32Array(N);
  let nid = 0;
  const put = (x, y, z, nx, ny, nz, m, tu, tv, id, dk, em) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (z <= Z[i]) return; Z[i] = z; NX[i] = nx; NY[i] = ny; NZ[i] = nz; M[i] = m; TU[i] = tu; TV[i] = tv; ID[i] = id; DK[i] = dk || 0; EM[i] = em || 0; };
  const mi = m => { const v = O6MI[m]; if (v == null) throw new Error('o6 mat ' + m); return v; };
  const tri = (a, b, c, n, m, id, dk, tu, tv) => {
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0]))), y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(d) < 1e-6) return;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5, l1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / d, l2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / d, l3 = 1 - l1 - l2;
      if (l1 < -0.02 || l2 < -0.02 || l3 < -0.02) continue;
      put(x, y, l1 * a[2] + l2 * b[2] + l3 * c[2], n[0], n[1], n[2], m, tu, tv, id, dk);
    }
  };
  const S = {
    W, H, Z, M,
    // a tube along a polyline, radius r0 -> r1 (camera space: x right, y down, z toward us)
    cap(pts, r0, r1, mn, o) {
      o = o || {}; const m = mi(mn), id = nid++, n = pts.length; let acc = 0;
      for (let s = 0; s < n - 1; s++) {
        const a = pts[s], b = pts[s + 1], ra = r0 + (r1 - r0) * s / Math.max(1, n - 1), rb = r0 + (r1 - r0) * (s + 1) / Math.max(1, n - 1);
        const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-6, L = Math.sqrt(L2), R = Math.max(ra, rb) + 0.5;
        const x0 = Math.floor(Math.min(a[0], b[0]) - R), x1 = Math.ceil(Math.max(a[0], b[0]) + R), y0 = Math.floor(Math.min(a[1], b[1]) - R), y1 = Math.ceil(Math.max(a[1], b[1]) + R);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5; let t = ((px - a[0]) * dx + (py - a[1]) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const cx = a[0] + dx * t, cy = a[1] + dy * t, ex = px - cx, ey = py - cy, d2 = ex * ex + ey * ey, r = Math.max(0.45, ra + (rb - ra) * t); if (d2 > r * r) continue;
          const h = Math.sqrt(r * r - d2);
          put(x, y, a[2] + (b[2] - a[2]) * t + h * (o.flat || 1), ex / r, ey / r, h / r, m, acc + t * L, Math.atan2(ex, h) * r * 2, id, o.dk, o.em);
        }
        acc += L;
      }
      return id;
    },
    ell(c, rx, ry, rz, mn, o) {
      o = o || {}; const m = mi(mn), id = nid++;
      for (let y = Math.floor(c[1] - ry - 1); y <= Math.ceil(c[1] + ry); y++) for (let x = Math.floor(c[0] - rx - 1); x <= Math.ceil(c[0] + rx); x++) {
        const qx = (x + 0.5 - c[0]) / Math.max(0.45, rx), qy = (y + 0.5 - c[1]) / Math.max(0.45, ry), q = qx * qx + qy * qy; if (q > 1) continue;
        const h = Math.sqrt(1 - q), nx = qx / rx, ny = qy / ry, nz = h / Math.max(0.3, rz), l = Math.hypot(nx, ny, nz) || 1;
        put(x, y, c[2] + rz * h, nx / l, ny / l, nz / l, m, x - c[0] + (o.tu || 0), y - c[1], id, o.dk, o.em);
      }
      return id;
    },
    // a flat plate with bevelled edges and a little dome (bone plates, the blade, flags)
    plate(pts, mn, o) {
      o = o || {}; const m = mi(mn), id = nid++, n = pts.length;
      let nx = 0, ny = 0, nz = 0, cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); cx += a[0] / n; cy += a[1] / n; cz += a[2] / n; }
      let l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      if (o.face) { nx = nx * 0.7 + o.face[0] * 0.3; ny = ny * 0.7 + o.face[1] * 0.3; nz = nz * 0.7 + o.face[2] * 0.3; }
      const nzc = Math.max(0.3, nz), bev = o.bevel == null ? 1.3 : o.bevel, bul = o.bulge == null ? 0.35 : o.bulge;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      const sz = Math.max(1, Math.max(x1 - x0, y1 - y0) / 2);
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        const px = x + 0.5, py = y + 0.5; let inside = false, dE = 1e9, ex = 0, ey = 0;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
          const dx = xi - xj, dy = yi - yj, L2 = dx * dx + dy * dy || 1e-6; let t = ((px - xj) * dx + (py - yj) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = xj + dx * t, qy = yj + dy * t, d = Math.hypot(px - qx, py - qy); if (d < dE) { dE = d; const L = Math.sqrt(L2); ex = dy / L; ey = -dx / L; if (ex * (cx - qx) + ey * (cy - qy) > 0) { ex = -ex; ey = -ey; } }
        }
        if (!inside) continue;
        const b = dE < bev ? (1 - dE / bev) * 1.1 : 0, rx = (px - cx) / sz, ry = (py - cy) / sz;
        let mx = nx + ex * b + rx * bul, my = ny + ey * b + ry * bul, mz = nz; const ll = Math.hypot(mx, my, mz) || 1;
        const z = cz - (nx * (px - cx) + ny * (py - cy)) / nzc + (1 - Math.min(1, rx * rx + ry * ry)) * bul * sz * 0.35 - b * 0.4 + (o.z || 0);
        put(x, y, z, mx / ll, my / ll, mz / ll, m, (px - pts[0][0]) * (o.tus || 1), py - pts[0][1], id, o.dk, o.em);
      }
      return id;
    },
    // a cloth or shell surface: fn(s, t) -> camera point or null (a tear); the grid is filled as small triangles
    surf(fn, ns, nt, mn, o) {
      o = o || {}; const m = mi(mn), id = nid++, G = [];
      for (let i = 0; i <= ns; i++) { const row = []; for (let j = 0; j <= nt; j++) row.push(fn(i / ns, j / nt)); G.push(row); }
      for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) {
        const a = G[i][j], b = G[i + 1][j], c = G[i + 1][j + 1], d = G[i][j + 1]; if (!a || !b || !c || !d) continue;
        const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2], vx = d[0] - b[0], vy = d[1] - b[1], vz = d[2] - b[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        let dk = o.dk || 0; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; dk += o.inside == null ? 0.35 : o.inside; }
        const tu = i / ns * (o.su || 40), tv = j / nt * (o.sv || 20);
        tri(a, b, c, [nx, ny, nz], m, id, dk, tu, tv); tri(a, c, d, [nx, ny, nz], m, id, dk, tu, tv);
      }
      return id;
    },
    // light, shade, quantize, outline
    render(o) {
      o = o || {};
      const c = mkCanvas(W, H), cx = c.getContext('2d'), img = cx.createImageData(W, H), D = img.data, IX = new Int8Array(N).fill(-1);
      const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
      const L = nrm([-0.68, -0.6, 0.42]), LR = nrm([-0.8, -0.35, -0.45]), BN = nrm([0.35, 0.85, 0.25]), HV = nrm([L[0], L[1], L[2] + 1]);
      const lxy = Math.hypot(L[0], L[1]), sdx = L[0] / lxy, sdy = L[1] / lxy, sdz = L[2] / lxy;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, mm = M[i]; if (mm < 0) continue;
        const mat = O6M[mm], R = mat.ramp, nr = R.length;
        if (mat.emis) { const k = Math.min(nr - 1, 2 + Math.round((EM[i] || 0.5) * 2.2)); IX[i] = k; continue; }
        const nx = NX[i], ny = NY[i], nz = NZ[i];
        let key = nx * L[0] + ny * L[1] + nz * L[2]; if (mat.wrap) key = (key + mat.wrap) / (1 + mat.wrap);
        const lam = Math.max(0, key);
        let sh = 1;
        if (lam > 0.02) for (let k = 2; k <= 14; k++) { const xx = Math.round(x + 0.5 + sdx * k - 0.5), yy = Math.round(y + 0.5 + sdy * k - 0.5); if (xx < 0 || yy < 0 || xx >= W || yy >= H) break; const j = yy * W + xx; if (M[j] >= 0 && Z[j] > Z[i] + sdz * k + 1.6) { sh = 0.3; break; } }
        let occ = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (M[j] >= 0 && Z[j] > Z[i] + 1.8) occ++; }
        const rim = Math.pow(Math.max(0, nx * LR[0] + ny * LR[1] + nz * LR[2]), 2) * (1.15 - nz);
        const bo = Math.max(0, nx * BN[0] + ny * BN[1] + nz * BN[2]);
        let I = (0.13 + 0.82 * lam * sh) * (1 - occ * 0.07) + bo * 0.16 * (1 - lam) + rim * 0.85 - DK[i] * 0.3;
        I *= mat.gain;
        if (mat.tex) I += (o6VN(TU[i] * mat.ts, TV[i] * mat.ts * mat.aniso, mm + ID[i] * 3) - 0.5) * mat.tex * 2;
        let k = Math.round(Math.pow(Math.max(0, I), 1.35) * (nr - 1.25) + 0.1);
        if (mat.crack) { const cr = o6VN(TU[i] * 0.34 + ID[i] * 5.3, TV[i] * 0.34, 91); if (Math.abs(cr - 0.5) < mat.crack) k -= 2; else if (Math.abs(cr - 0.5) < mat.crack * 2 && lam > 0.4) k += 1; }
        if (mat.spec && sh > 0.5) { const hs = nx * HV[0] + ny * HV[1] + nz * HV[2]; if (hs > 1 - mat.spec) k = nr - 1; else if (hs > 1 - mat.spec * 2.5) k = Math.max(k, nr - 2); }
        IX[i] = k < 0 ? 0 : k >= nr ? nr - 1 : k;
      }
      // a pixel just behind a nearer form is in its contact shadow
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (M[i] < 0 || O6M[M[i]].emis) continue;
        for (const [dx, dy] of [[-1, 0], [0, -1], [1, 0]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W) continue; const j = yy * W + xx; if (M[j] >= 0 && Z[j] > Z[i] + 3 && ID[j] !== ID[i]) { IX[i] = Math.max(0, IX[i] - 1); break; } }
      }
      for (let i = 0; i < N; i++) if (M[i] >= 0) { const col = O6M[M[i]].ramp[IX[i]], q = i * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255; }
      // phosphor: the glow pixels bleed a little into what is round them
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (M[i] < 0 || !O6M[M[i]].emis) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (M[j] < 0 || O6M[M[j]].emis) continue; const q = j * 4; D[q] = D[q] * 0.5 + 120 * 0.5; D[q + 1] = D[q + 1] * 0.5 + 190 * 0.5; D[q + 2] = D[q + 2] * 0.5 + 140 * 0.5; }
      }
      // the outline: the darkest tone of what it borders, broken where the light hits the upper-left edge
      const S0 = new Uint8ClampedArray(D);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (M[i] >= 0) continue;
        let best = -1, lit = false;
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (M[j] < 0) continue; if (best < 0) best = j; if ((dx > 0 || dy > 0) && IX[j] >= O6M[M[j]].ramp.length - 2) lit = true; }
        if (best < 0) continue;
        const R = O6M[M[best]].ramp, col = lit ? R[Math.min(2, R.length - 1)] : R[0], q = i * 4;
        if (lit && o6H(x, y) < 0.5) continue;
        D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255;
      }
      cx.putImageData(img, 0, 0); return c;
    }
  };
  return S;
}
// two-bone reach: the middle joint (knee, elbow) bent toward `hint`, and the end clamped to the reach
function o6IK(a, b, L1, L2, hint) {
  const d = o6S(b, a), D0 = o6Len(d) || 1e-6, dir = o6M(d, 1 / D0), D = Math.min(D0, L1 + L2 - 0.05);
  const x = (L1 * L1 - L2 * L2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, L1 * L1 - x * x));
  const pp = o6N(o6S(hint, o6M(dir, o6Dot(hint, dir))));
  return [o6A(a, o6A(o6M(dir, x), o6M(pp, h))), o6A(a, o6M(dir, D))];
}

// ------------------------------------------------------------------- the rig
function o6Rig(pose, ph, view, xl) {
  const phi = O6_PHI[view] != null ? O6_PHI[view] : O6_PHI.front, k = ph % 4;
  let bob = 0, lean = 0, twist = 0, sideR = 0, breath = 0, headT = 0, hipTw = 0;
  let fR = [0, 6.5, 0], fL = [3, -6, 0], liftR = 0, liftL = 0, G = null, d = null, two = false, haL = null, palmL = false;
  let hem = 0, spread = 0, flag = 0, glow = 0.35, smear = null, cloth = 0;
  switch (pose) {
    case 'idle':
      // weight on the right leg, the left foot set wide and forward, shoulders turned against the hips,
      // the falchion held low and slanting down across the front, point toward the enemy
      breath = [0, 0.6, 1, 0.6][k]; bob = -1.4; sideR = 1.8; fR = [-1.5, 5.5, 0]; fL = [7, -10.5, 0]; twist = -0.3; hipTw = 0.22; lean = 0.07; headT = 0.8;
      G = [7, 11, 39 + breath * 0.3]; d = o6N([0.35, 0.75, -0.56]); haL = [5, -15.5, 41 + breath * 0.3];
      flag = [0, 0.5, 1, 0.5][k]; cloth = -0.5 + breath * 0.3; break;
    case 'walk': case 'charge': {
      const ch = pose === 'charge', t = (ch ? k * 2 : ph) / 8 * Math.PI * 2, s = Math.sin(t), c = Math.cos(t), st = ch ? 9.5 : 8;
      fR = [st * s, 6.5, 0]; fL = [-st * s, -6.5, 0]; liftR = Math.max(0, c) * (ch ? 5.5 : 4.5); liftL = Math.max(0, -c) * (ch ? 5.5 : 4.5);
      bob = -1.8 * Math.abs(s) + 0.6; sideR = -0.9 * c; hem = 1.3 * Math.sin(2 * t - 1); spread = Math.abs(s) * 2.5;
      cloth = -2.5 - Math.abs(c); flag = Math.sin(2 * t) * 1.2;
      if (!ch) { twist = 0.2 * s - 0.08; hipTw = -0.12 * s; lean = 0.13; headT = 0.6; G = [-1 + 2 * s, 10.5, 40]; d = o6N([-0.6, 0.2, -0.76]); haL = [3 + 7 * s, -12, 40 + Math.abs(s) * 1.5]; }
      else { twist = -0.4 + 0.08 * s; lean = 0.3; bob -= 2; G = [-4, 8, 39]; d = o6N([-0.8, 0.1, -0.5]); haL = [10, -5, 56]; cloth -= 3; headT = 1.5; }
      break;
    }
    case 'atk': case 'batk': {
      fR = [-4, 6.5, 0]; fL = [8, -5.5, 0];
      bob = [-1.5, -2.5, -5, -3.5][k]; lean = [-0.14, 0.06, 0.32, 0.2][k]; twist = [0.55, 0.15, -0.35, -0.2][k];
      const GG = [[-3, 4, 80], [11, 3, 69], [16, 1, 46], [13, 2, 47]][k], DD = [[-0.55, 0.05, 0.84], [0.82, 0, 0.57], [0.8, 0, -0.6], [0.62, 0, -0.78]][k];
      G = GG; d = o6N(DD); two = true;
      if (k === 1) smear = [2.15, 0.6, 1]; else if (k === 2) smear = [0.75, -0.62, 0.55];
      cloth = [1, -2, -3.5, -2][k]; hem = [0.5, -1, -2, -1][k]; flag = [1.5, -1, -2, -0.5][k]; glow = k === 2 ? 0.7 : 0.45; headT = [-0.5, 0, 1.5, 1][k];
      break;
    }
    case 'crush': {
      // Marrow Crush: 2-handed overhead crack, drawn from ref #40-#43. The falchion goes up almost
      // vertical behind the head, then whips down the front to a heavy ground-strike, then a slow
      // recover with the blade still low. Stance widens for the load, right foot planted back.
      // k=0 windup: back-lean, weapon high & behind, spine loaded
      // k=1 arc:    torso whips forward, blade at head height, smear over the top of the head
      // k=2 impact: deep hunch, blade slammed low front, right knee dropping
      // k=3 recover: straighten a touch, blade still low, cloth trailing forward
      fR = [-5, 7.5, 0]; fL = [9, -6, 0];
      bob   = [-0.4, -3.2, -7.6, -5.4][k];
      lean  = [-0.24, 0.10, 0.42, 0.28][k];
      twist = [ 0.62, 0.14, -0.42, -0.26][k];
      hipTw = [ 0.28, 0.06, -0.20, -0.14][k];
      const GG = [ [-4, -2, 92], [ 6, 3, 78], [17, 2, 32], [15, 2, 40] ][k];
      const DD = [ [-0.30, 0, 0.95], [0.78, 0, 0.62], [0.86, 0, -0.51], [0.68, 0, -0.73] ][k];
      G = GG; d = o6N(DD); two = true;
      // A wider arc than 'atk': smear on k=1 (top of the swing) and k=2 (the killing sweep).
      if (k === 1) smear = [2.55, 0.55, 1.0];
      else if (k === 2) smear = [0.55, -0.85, 0.85];
      cloth = [ 1.8, -2.2, -4.2, -2.4][k];
      hem   = [ 0.8, -1.2, -2.4, -1.2][k];
      flag  = [ 2.0, -1.4, -2.4, -0.6][k];
      spread= [ 1.4,  0.4,  0.0,  0.4][k];
      glow  = [0.45, 0.5, 0.85, 0.6][k];
      headT = [-0.8, 0.2, 2.0, 1.2][k];
      break;
    }
    case 'sweep': {
      // Bone Scythe Sweep: a full-body 360 horizontal arc of the two-handed scythe, drawn from
      // refs #43-#48 of the ossuarch_mj set. The knight winds back over the right shoulder, then
      // walks the scythe around the body in five equal steps until the blade returns behind him.
      // Feet stay planted; the whole spine and hips rotate to carry the sweep.
      // p=0 windup:  weapon high & back-right, spine wound right, weight loading the rear leg
      // p=1 front-R: torso whips forward, scythe out to the right at chest height
      // p=2 front:   torso squared, scythe out ahead, blade at head height crossing
      // p=3 front-L: torso past centre, scythe out to the left, hips carrying through
      // p=4 back-L:  spine unwound left, scythe swept behind the left shoulder
      // p=5 recover: torso settling, blade cross-body low, weight returning to centre
      const p = ph % 6;
      fR = [-4, 7, 0]; fL = [8, -6, 0];
      bob   = [-0.8, -3.2, -4.4, -3.6, -1.8, -1.2][p];
      lean  = [-0.20, 0.18, 0.28, 0.20, 0.02,-0.06][p];
      twist = [ 0.70, 0.25,-0.10,-0.42,-0.66,-0.30][p];
      hipTw = [ 0.30, 0.12,-0.04,-0.18,-0.28,-0.12][p];
      // grip and shaft direction — the scythe travels around the body on a near-horizontal plane
      const SG = [ [-5,-3, 78], [ 4, 5, 60], [14, 3, 54], [10,-4, 58], [-3,-7, 66], [-7,-4, 74] ][p];
      const SD = [ [-0.55, 0.55, 0.63], [ 0.85, 0.15, 0.50], [ 0.72, 0.02,-0.69], [ 0.10,-0.40,-0.91],
                   [-0.62,-0.55,-0.55], [-0.85, 0.20, 0.48] ][p];
      G = SG; d = o6N(SD); two = true;
      // smear on the two loud frames — top of the arc and the crossing frame
      if (p === 1) smear = [ 2.10, 0.65, 1.00];
      else if (p === 2) smear = [ 0.80,-0.55, 0.85];
      else if (p === 3) smear = [-0.55,-1.15, 0.70];
      else if (p === 4) smear = [-1.55,-2.10, 0.55];
      cloth = [ 1.6,-1.8,-3.0,-2.4,-0.6, 0.4][p];
      hem   = [ 0.6,-1.0,-1.6,-1.2,-0.2, 0.2][p];
      flag  = [ 1.6,-1.2,-2.0,-1.4, 0.4, 0.9][p];
      spread= [ 1.2, 0.6, 0.2, 0.4, 0.8, 1.0][p];
      glow  = [0.45,0.60,0.80,0.65,0.50,0.40][p];
      headT = [-0.6, 0.6, 1.4, 1.0, 0.4,-0.2][p];
      break;
    }
    case 'lash': case 'lashw': {
      // Spine Lash: a spine-whip crack, drawn from refs #49-#52. Four beats.
      //  p=0 coil       — whip trailing back-right, arm cocked over shoulder, wound
      //  p=1 snap       — arm punched forward, whip snapping in front of the head, smear high
      //  p=2 follow-through — whip cracked out ahead, tip falling, torso squared
      //  p=3 recover    — whip drawn back cross-body low, weight settling
      // 'lashw' is the Wide-Arc perk variant: same beats but the crack travels horizontally
      // right-to-left instead of forward, so smear runs across the body.
      const p = ph % 4, wide = pose === 'lashw';
      fR = [-3, 7, 0]; fL = [7, -6, 0];
      bob   = [-1.0, -3.0, -2.4, -1.2][p];
      lean  = [-0.15, 0.22, 0.30, 0.10][p];
      twist = wide ? [ 0.55, 0.10,-0.35,-0.55][p] : [ 0.42,-0.05,-0.20,-0.05][p];
      hipTw = [ 0.20, 0.04,-0.08,-0.02][p];
      // grip: the spine-whip's handle is held in one hand; d is roughly along the first metre of whip
      const LG = wide
        ? [ [-4, 2, 70], [ 6, 4, 66], [12,-1, 60], [ 2,-4, 62] ][p]
        : [ [-3, 2, 68], [ 8, 5, 70], [15, 2, 64], [ 4,-3, 62] ][p];
      const LD = wide
        ? [ [-0.50, 0.55, 0.67], [ 0.75, 0.15, 0.64], [ 0.20,-0.50,-0.84], [-0.60,-0.55,-0.58] ][p]
        : [ [-0.30, 0.50, 0.81], [ 0.55, 0.10, 0.83], [ 0.75, 0.00, 0.66], [-0.10,-0.35,-0.93] ][p];
      G = LG; d = o6N(LD); two = false;
      // haL still positioned so the off-hand rides low and forward, wrist counter-balancing
      haL = [ [ 3,-11, 46], [11, -7, 52], [16, -4, 44], [ 8, -8, 40] ][p];
      // whip crack smear on the snap frame (and the follow-through)
      if (p === 1) smear = wide ? [ 1.9, 0.4, 0.9] : [ 1.6, 0.5, 0.95];
      else if (p === 2) smear = wide ? [ 0.4,-1.5, 0.7] : [ 0.6,-0.6, 0.7];
      cloth = [ 0.8,-2.0,-2.4,-1.0][p];
      hem   = [ 0.4,-0.8,-1.2,-0.5][p];
      flag  = [ 0.8,-1.2,-1.6,-0.4][p];
      spread= [ 0.8, 0.3, 0.2, 0.5][p];
      glow  = [0.45,0.75,0.65,0.45][p];
      headT = [-0.4, 0.6, 1.0, 0.4][p];
      break;
    }
    case 'gleap': {
      // Grave Leap: a five-frame compress → launch → apex → descent → impact, drawn from refs
      // #46-#50 in ossuarch_mj. Both hands on the scythe; the arc goes overhead and slams down.
      //  p=0 compress: deep crouch, knees bent, weapon drawn across the chest, shoulders forward
      //  p=1 launch:   legs snapping straight, torso rising, weapon coming up past the head
      //  p=2 apex:     airborne, feet tucked, weapon raised almost vertical behind the head
      //  p=3 descent:  falling, weapon whipping down the front, torso pitching forward
      //  p=4 impact:   landed, wide stance, weapon slammed low front, ground-ring glow
      const p = ph % 5;
      // feet: compress low, tuck at apex, plant wide on impact
      fR = [ [-2, 6.5, 0], [-3, 6.5, 3], [-4, 6, 12], [-4, 6, 8], [-6, 8, 0] ][p];
      fL = [ [ 5,-6,   0], [ 4,-6.5, 3], [ 3,-6, 12], [ 5,-6, 6], [10,-7,   0] ][p];
      bob   = [-8.5,-3.0, 7.5, 2.0,-9.5][p];
      lean  = [ 0.25, 0.06,-0.10, 0.24, 0.48][p];
      twist = [ 0.55, 0.30,-0.05,-0.30,-0.40][p];
      hipTw = [ 0.20, 0.10, 0.00,-0.12,-0.20][p];
      const JG = [ [-2, 4, 60], [ 2, 3, 78], [-4,-1, 96], [ 8, 1, 74], [17, 2, 28] ][p];
      const JD = [ [-0.35, 0.10, 0.93], [-0.10, 0.05, 0.99], [-0.15, 0, 0.99],
                   [ 0.60, 0, 0.80], [ 0.88, 0,-0.47] ][p];
      G = JG; d = o6N(JD); two = true;
      if (p === 2) smear = [ 2.60, 1.40, 0.80];
      else if (p === 3) smear = [ 2.10, 0.20, 0.95];
      else if (p === 4) smear = [ 0.50,-0.95, 1.00];
      cloth = [ 2.0, 0.8,-3.5,-4.0,-2.6][p];
      hem   = [ 1.2, 0.6,-2.6,-3.0,-2.0][p];
      flag  = [ 1.0, 0.6,-3.0,-2.6,-1.4][p];
      spread= [ 0.4, 1.0, 2.0, 1.2, 1.8][p];
      // impact frame lights up the phosphor
      glow  = [ 0.50, 0.65, 0.55, 0.70, 1.00][p];
      headT = [-1.6,-0.4, 0.8, 0.8, 2.4][p];
      break;
    }
    case 'gcharge': {
      // Grinding Charge: a 3-frame shoulder-down running loop, drawn from refs #41-#44 (the
      // running series). Right/left/right stride with shoulder locked forward, head down,
      // weapon dragged low in the trailing hand. This loops seamlessly.
      const p = ph % 3, t = (p / 3) * Math.PI * 2, s = Math.sin(t), c = Math.cos(t);
      fR = [ 8 * s, 6.5, 0]; fL = [-8 * s, -6.5, 0];
      liftR = Math.max(0,  c) * 5.5; liftL = Math.max(0, -c) * 5.5;
      bob = -3.0 + Math.abs(s) * -0.8;
      lean = 0.38; twist = -0.32 + 0.06 * s; hipTw = -0.10 * s;
      // grip low and trailing behind — scythe dragged along the ground on the right
      G = [-6 + 2 * s, 6, 36 + Math.abs(s) * 1.5]; d = o6N([-0.72, 0.20, -0.66]);
      // left hand up on the pauldron / spine ridge, driving forward
      haL = [10 + 3 * s, -5, 58]; two = false;
      cloth = -3.4 - Math.abs(c) * 0.8; hem = 1.6 * Math.sin(2 * t - 1); spread = Math.abs(s) * 2.8;
      flag = Math.sin(2 * t) * 1.4; glow = 0.55; headT = 2.2; smear = null;
      break;
    }
    case 'cast':
      fR = [-1, 6.5, 0]; fL = [5, -6, 0]; bob = [-1, -1.5, -2, -1.5][k]; lean = [0, 0.05, 0.12, 0.1][k]; twist = [0.2, -0.1, -0.3, -0.25][k];
      G = [2, 9.5, 40]; d = o6N([-0.35, 0.12, -0.93]);
      haL = [[6, -5, 58], [13, -6, 64], [21, -5, 62], [20, -5, 61]][k]; palmL = k >= 1; glow = [0.5, 0.8, 1, 0.9][k]; flag = [0, 1, 2, 1.5][k]; cloth = [0, -1, -2, -1.5][k];
      break;
    case 'leap':
      fR = [4, 5, 9 - ph * 4]; fL = [-3, -5, 5 - ph * 2]; bob = 1; lean = [0.05, 0.2][ph & 1]; twist = [0.4, -0.1][ph & 1];
      G = [[-3, 4, 82], [12, 3, 70]][ph & 1]; d = o6N([[-0.5, 0, 0.87], [0.8, 0, 0.6]][ph & 1]); two = true; cloth = 3; hem = 2.5; flag = 2; glow = 0.6;
      break;
    case 'pull':
      bob = -6 + [0, -0.5, 0, 0.5][k]; fR = [-1, 9, 0]; fL = [4, -9, 0]; lean = 0.25; twist = -0.1;
      G = [11, 6.5, 40]; d = o6N([0.08, 0, -1]); haL = [15, -8, 31 + [0, 1, 0, -1][k]]; palmL = true; glow = [0.8, 1, 0.8, 1][k]; cloth = 1; flag = [0, 1, 0, -1][k]; spread = 2;
      break;
  }
  if (xl) { lean += xl; bob -= xl * 7; }
  const J = { pose, ph, view, phi, bob, lean, twist, glow, flag, cloth, hem, spread, smear, two, palmL, sideR };
  const tw = u => hipTw + (twist - hipTw) * Math.max(0, Math.min(1, (u - 44) / 24));
  J.tw = tw;
  // a point on the body at rest-height u, f forward and r right of the spine, turned and leaned with the torso
  J.at = (u, f, r) => {
    const a = tw(u), ca = Math.cos(a), sa = Math.sin(a), h = u - 44, br = breath * Math.max(0, Math.min(1, (u - 52) / 16));
    return [h * Math.sin(lean) + f * ca - r * sa, sideR * 0.6 + f * sa + r * ca, 44 + bob + h * Math.cos(lean) + br];
  };
  J.shR = J.at(66, 0, 12); J.shL = J.at(66, 0, -12); J.neck = J.at(72, 0.5, 0); J.head = J.at(78.5, 1.2 + headT, 0);
  J.hipTw = hipTw; J.hipR = [-4.6 * Math.sin(hipTw), 4.6 * Math.cos(hipTw) + sideR * 0.5, 43 + bob + sideR * 0.35]; J.hipL = [4.6 * Math.sin(hipTw), -4.6 * Math.cos(hipTw) + sideR * 0.5, 43 + bob - sideR * 0.35];
  const leg = (hip, f, lift, side) => {
    const an = [f[0], f[1], f[2] + 4 + lift], [kn, an2] = o6IK(hip, an, 20, 19.5, [1, side * 0.15, 0]);
    return { hip, kn, an: an2, toe: o6A(an2, [6.2, side * 0.3, -3.2 - lift * 0.25]) };
  };
  J.legR = leg(J.hipR, fR, liftR, 1); J.legL = leg(J.hipL, fL, liftL, -1);
  const arm = (sh, ha, side) => { const [el, h2] = o6IK(sh, ha, 15, 14, [-0.45, side * 0.85, -0.35]); return { sh, el, ha: h2 }; };
  const rest = side => o6A(side > 0 ? J.shR : J.shL, [1.5, side * 2.5, -28.5]);
  J.G = G; J.d = d;
  J.armR = arm(J.shR, G ? G : rest(1), 1);
  const hl = two && G ? o6S(G, o6M(d, 4.6)) : haL ? [haL[0], haL[1], haL[2] + bob] : rest(-1);
  J.armL = arm(J.shL, hl, -1);
  // the darchog: a pole of joined long bones behind the left shoulder, a crook at its head
  J.pole = [J.at(57, -7, -9.5), J.at(77, -9.8, -13.5), J.at(96, -12, -18), J.at(99.5, -8.5, -21.5), J.at(97, -6.5, -23.5)];
  return J;
}


// ------------------------------------------------------------------- the knight, as forms
function o6Paint(Sc, J, g) {
  const phi = J.phi, cp = Math.cos(phi), sp = Math.sin(phi), back = sp < -0.05, K = O6_S;
  const dep = p => p[0] * sp + p[1] * cp;
  const C = p => [O6_HX + (p[0] * cp - p[1] * sp) * K, O6_HY + (-p[2] + dep(p) * 0.4) * K, dep(p) * K];
  const cap = (pts, r0, r1, m, o) => Sc.cap(pts.map(C), r0 * K, r1 * K, m, o);
  const ell = (p, rx, ry, rz, m, o) => Sc.ell(C(p), rx * K, ry * K, rz * K, m, o);
  const plate = (pts, m, o) => Sc.plate(pts.map(C), m, o);
  const surf = (fn, ns, nt, m, o) => Sc.surf((s, t) => { const p = fn(s, t); return p && C(p); }, ns, nt, m, o);
  const cloth = J.cloth, flag = J.flag, gl = J.glow;
  const glowAt = (p, r) => ell(p, r || 1.1, r || 1.1, 1, 'glow', { em: gl });
  const TAU = Math.PI * 2;

  // ---- torso rings: [rest height, front half-depth, back half-depth, half-width]
  const TR = [[73, 4.6, 4.6, 5.6], [70, 6.8, 6.4, 11], [66, 8.4, 7, 14], [61, 9.4, 7.4, 13.6], [55, 8.8, 7.2, 11.6], [50, 7.4, 6.8, 10.2], [46, 7.6, 7.2, 10.8], [43, 7.6, 7.2, 10.8]];
  const ring = (tab, u) => { for (let i = 0; i < tab.length - 1; i++) { const a = tab[i], b = tab[i + 1]; if (u <= a[0] && u >= b[0]) { const t = (a[0] - u) / (a[0] - b[0]); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]; } } const e = u > tab[0][0] ? tab[0] : tab[tab.length - 1]; return [e[1], e[2], e[3]]; };
  const surfT = (u, al, s) => { const r = ring(TR, u), c = Math.cos(al), sn = Math.sin(al), f = c * (c > 0 ? r[0] : r[1]); return J.at(u, f * (s || 1), sn * r[2] * (s || 1)); };

  // ---- legs: leather under shin-bone greaves, a kneecap, plated sabatons
  for (const [lg, side] of [[J.legR, 1], [J.legL, -1]]) {
    cap([lg.hip, lg.kn], 4.4, 3.7, 'marD');
    cap([lg.kn, lg.an], 3.3, 2.5, 'lea');
    const fwd = o6N(o6S(lg.toe, lg.an));
    cap([o6A(o6Lp(lg.kn, lg.an, 0.1), o6M(fwd, 1.7)), o6A(o6Lp(lg.kn, lg.an, 0.55), o6M(fwd, 2.1)), o6A(o6Lp(lg.kn, lg.an, 0.92), o6M(fwd, 1.6))], 2.2, 1.6, 'bone');
    ell(o6A(lg.kn, o6M(fwd, 1.8)), 3.2, 3, 3, 'bone');
    glowAt(o6A(o6A(lg.kn, o6M(fwd, 2.4)), [0, 0, -3]), 0.9);
    cap([o6A(lg.an, [-1.2, 0, -1.4]), o6Lp(lg.an, lg.toe, 0.45)], 2.9, 2.6, 'boneD');
    cap([o6Lp(lg.an, lg.toe, 0.4), lg.toe], 2.3, 1.6, 'boneD');
    cap([o6A(lg.an, [-2, 0, -2.6]), o6A(lg.toe, [0.5, 0, -0.9])], 1.6, 1.2, 'lea');
  }

  // ---- skirt: a saffron under-robe and the heavy maroon over it, torn into tatters at the hem
  const skAt = (u, al, s, tab, hemU) => {
    const r = ring(tab, u), c = Math.cos(al), sn = Math.sin(al), t = Math.max(0, Math.min(1, (47 - u) / (47 - hemU)));
    const f = c * ((c > 0 ? r[0] : r[1]) + J.spread * t * Math.abs(c)) * s + (J.hem + cloth * 0.35) * t * t + (u - 44) * Math.sin(J.lean) * 0.4;
    return [f, J.sideR * 0.4 + sn * r[2] * s, u + J.bob * (0.4 + 0.6 * (1 - t))];
  };
  const skirt = (tab, hemU, mat, amp, tear) => surf((s, t) => {
    const al = s * TAU, jag = tear ? 2.6 * Math.pow(Math.max(0, Math.sin(al * 7 + 0.9)), 4) + 1.8 * o6H(Math.floor(s * 23), 5) + 1.2 * Math.max(0, Math.sin(al * 13 + 2)) : 0;
    const u = 47 - t * (47 - (hemU - jag));
    const fo = amp * Math.pow(t, 0.8) * (0.07 * Math.sin(al * 8 + 1.3 + J.hem * 0.2) + 0.04 * Math.sin(al * 15 + 0.4) + 0.03 * Math.sin(al * 23 + 2.1));
    return skAt(u, al, 1 + fo, tab, hemU);
  }, 150, 28, mat, { inside: 0.55, su: 60, sv: 14 });
  skirt([[47, 8, 7.6, 11], [38, 9.2, 8.6, 12.2], [28, 10.3, 9.7, 13.1], [16, 11.2, 10.6, 13.8]], 16.5, 'saf', 0.5, false);
  skirt([[47, 8.4, 8, 11.4], [38, 9.6, 9, 12.6], [28, 10.8, 10.2, 13.6], [19, 12, 11.4, 14.6]], 19.5, 'mar', 1, true);

  // ---- torso: the gambeson, the rib cage over it, the sternum, the spine behind
  surf((s, t) => surfT(73 - t * 30, s * TAU, 1), 96, 30, 'marD', { su: 50, sv: 25 });
  for (let i = 0; i < 4; i++) {
    const u0 = 66.5 - i * 4.6, span = 1.45 - i * 0.06, droop = 4.2 + i * 0.7;
    for (const c of [0, Math.PI]) {
      const pts = []; for (let k = 0; k <= 16; k++) { const a = c - span + 2 * span * k / 16; pts.push(surfT(u0 - droop * Math.pow(Math.abs(a - c) / span, 1.4), a, 1.08)); }
      cap(pts, 1.6, 1.4, 'bone');
    }
  }
  cap([surfT(69, 0, 1.12), surfT(58, 0, 1.15), surfT(51, 0, 1.1)], 2, 1.5, 'bone');
  for (let u = 71; u > 46; u -= 2.8) ell(surfT(u, Math.PI, 1.09), 2.2, 1.4, 1.6, 'bone');
  glowAt(surfT(52.5, 0, 1.13), 0.8);

  // ---- the shawl: over the left shoulder, across the chest to the right hip, round the back
  const bandU = a => 46 + 23 * Math.abs((((a + Math.PI / 2) % TAU) + TAU) % TAU - Math.PI) / Math.PI;
  surf((s, t) => {
    const a = -Math.PI / 2 - 0.2 + s * (TAU + 0.4), u = bandU(a) + 4.6 - t * 9.2, fo = 0.05 * Math.sin(t * Math.PI * 3 + a * 2.2) + 0.03 * Math.sin(a * 9);
    return surfT(u, a, 1.13 + fo);
  }, 170, 9, 'mar', { su: 80, sv: 6 });
  // the shawl's long end down the back, torn at the bottom
  surf((s, t) => {
    const a = Math.PI / 2 + 0.35 + s * (Math.PI - 0.7), top = surfT(67.5, a, 1.2);
    const tat = 3.2 * Math.pow(Math.max(0, Math.sin(s * 19 + 1)), 3) + 2 * o6H(Math.floor(s * 11), 9);
    if (t > 1 - tat / 30 + 0.02 && t > 0.92) return null;
    const bot = o6A(J.at(47, -10.8, (1 - s) * 9.5 - s * 10), [cloth * 0.6 - 1, 0, -25 - tat * 0.8]);
    const p = o6Lp(top, bot, t), fo = t * (0.9 * Math.sin(s * Math.PI * 7 + 0.5) + 0.5 * Math.sin(s * 23)) - Math.sin(Math.PI * t) * 1.6;
    return o6A(p, [fo, 0, 0]);
  }, 60, 30, 'mar', { inside: 0.5, su: 40, sv: 30 });

  // ---- mala: finger bones on a cord, low on the chest; a saffron tassel at the guru bead
  for (let i = 0; i <= 26; i++) { const t = i / 26, a = -0.55 + 1.1 * t, u = 70.5 - 17 * Math.pow(Math.sin(t * Math.PI), 0.8); ell(surfT(u, a, 1.22), 0.8, 0.8, 0.8, i % 3 === 2 ? 'boneD' : 'bone'); }
  cap([surfT(53, 0.03, 1.24), surfT(49, 0.05, 1.26)], 0.9, 1.2, 'saf');

  // ---- belt, buckle, hip-bone faulds, the sash knot
  surf((s, t) => surfT(47.6 - t * 3, s * TAU, 1.07), 80, 4, 'lea', { su: 40 });
  plate([surfT(47.4, 0.02, 1.12), surfT(47.4, 0.3, 1.12), surfT(44.2, 0.3, 1.12), surfT(44.2, 0.02, 1.12)], 'iron', { bevel: 1, bulge: 0.2 });
  for (const al of [-0.62, 0.62, Math.PI - 0.62, Math.PI + 0.62]) {
    plate([surfT(45, al - 0.3, 1.12), surfT(45.5, al, 1.13), surfT(45, al + 0.3, 1.12), surfT(38, al + 0.36, 1.18), surfT(34.5, al, 1.2), surfT(38, al - 0.36, 1.18)], 'bone', { bevel: 1.4, bulge: 0.5 });
    ell(surfT(39.5, al, 1.26), 1, 1.3, 0.5, 'ink');
  }
  const kn = surfT(46, 1.15, 1.15);
  ell(kn, 2.3, 2, 2, 'saf');
  for (const [dx, len] of [[-0.8, 11], [1.1, 8]]) cap([o6A(kn, [dx, 0.3, -1]), o6A(kn, [dx + cloth * 0.3, 0.6, -len * 0.5]), o6A(kn, [dx + cloth * 0.5 - 0.5, 0.8, -len])], 1.1, 0.8, 'saf');

  // ---- the collar: the shawl's heavy fold round the neck
  surf((s, t) => { const a = s * TAU; return surfT(71.5 - t * 3, a, 1.1 + 0.1 * Math.sin(t * Math.PI) + 0.03 * Math.sin(a * 7)); }, 60, 5, 'mar', { su: 30 });

  // ---- arms: sleeve, vertebrae along the arm, vambrace, gauntlet of finger bones
  for (const [a, side] of [[J.armR, 1], [J.armL, -1]]) {
    cap([a.sh, a.el], 4.4, 3.6, 'mar');
    const dirU = o6N(o6S(a.el, a.sh)), out = o6N([dirU[1] * 0 - side * 0.1, side, 0.3]);
    for (const t of [0.4, 0.6, 0.8]) ell(o6A(o6Lp(a.sh, a.el, t), o6M(out, 3.4)), 1.6, 1.3, 1.3, 'bone');
    ell(a.el, 3.3, 3.1, 3, 'bone');
    glowAt(o6A(a.el, o6M(out, 0.5)), 0.9);
    cap([o6Lp(a.el, a.ha, 0.12), o6Lp(a.el, a.ha, 0.86)], 3.6, 2.9, 'bone');
    for (const t of [0.25, 0.43, 0.61, 0.79]) ell(o6A(o6Lp(a.el, a.ha, t), o6M(out, 2.8)), 1.4, 1.1, 1.2, 'boneD');
    const hd = o6N(o6S(a.ha, a.el));
    ell(a.ha, 3.1, 2.8, 2.8, 'boneD');
    if (side < 0 && J.palmL) {
      const up = o6N([0, 0, 1]), sd = o6N([hd[1], -hd[0], 0.2]);
      for (let f = -2; f <= 2; f++) cap([o6A(a.ha, o6M(hd, 1.5)), o6A(a.ha, o6A(o6M(hd, 5 - Math.abs(f) * 0.6), o6A(o6M(sd, f * 1.4), o6M(up, f === -2 ? -1 : 0.6))))], 0.8, 0.6, 'bone');
      glowAt(o6A(a.ha, o6M(hd, 1.8)), 0.8 + gl * 0.5);
    } else cap([o6A(a.ha, o6M(hd, 1)), o6A(a.ha, o6A(o6M(hd, 2.8), [0, 0, -1.2]))], 1.5, 1.2, 'boneD');
  }

  // ---- pauldrons: stacked shoulder-blade lames, the scapular spine, flag strips
  for (const [sh, side] of [[J.shR, 1], [J.shL, -1]]) {
    const a = J.tw(66), fv = [Math.cos(a), Math.sin(a), 0], rv = [-Math.sin(a) * side, Math.cos(a) * side, 0];
    const lc = (f, r, u) => o6A(sh, o6A(o6M(fv, f * 1.2), o6A(o6M(rv, r * 1.1), [0, 0, u * 1.18 + 0.5])));
    plate([[-4.6, 7.2, -8], [4.6, 7.2, -8], [3.6, 9.4, -13], [0, 9.8, -14.2], [-3.6, 9.4, -13]].map(p => lc(...p)), 'boneD', { bevel: 1.5, bulge: 0.5 });
    plate([[-6.2, 5.8, -2], [6.2, 5.8, -2], [5.2, 8.6, -9.5], [0, 9.2, -10.8], [-5.2, 8.6, -9.5]].map(p => lc(...p)), 'boneP', { bevel: 1.5, bulge: 0.6 });
    plate([[-7, -1.5, 5], [-2, -1, 7.2], [4, -1, 6.4], [7.4, 1.5, 2.5], [6.6, 5.6, -2.5], [2, 7.6, -5.4], [-3, 7.4, -4.8], [-7.2, 4.4, -0.5]].map(p => lc(...p)), 'boneP', { bevel: 2.2, bulge: 0.95 });
    cap([lc(-5.5, 0.8, 5.2), lc(0, 3.2, 2.6), lc(5.2, 5.8, -2)], 1, 0.7, 'bone');
    // phosphor in the seams under each lame
    cap([lc(-6.4, 5.2, -1.2), lc(-2.6, 7.6, -5.9), lc(2, 7.8, -6.1), lc(6.1, 5.4, -2.9)], 0.5, 0.5, 'glow', { em: gl * 0.8, flat: 0.15 });
    cap([lc(-5, 8.4, -8.9), lc(0, 9.3, -10.3), lc(5, 8.5, -9)], 0.5, 0.5, 'glow', { em: gl * 0.6, flat: 0.15 });
    glowAt(lc(-1, 9.4, -11.2), 0.9);
    if (side > 0) for (let i = 0; i < 3; i++) {
      const top = lc(-3 + i * 2.6, 9.6, -12.6), sw = flag * 0.6 + Math.sin(i * 2.1 + flag) * 0.7, len = 6 + (i % 2) * 3;
      const bot = o6A(top, [cloth * 0.35 + sw * 0.5 - 1, 0.6, -len]);
      plate([top, o6A(top, [1.8, 0.2, 0]), o6A(bot, [1.5, 0.2, 1 + (i & 1)]), o6A(bot, [0.6, 0, 0]), bot], O6_FLAGS[(i * 2 + 1) % 5], { bevel: 0.6, bulge: 0.3 });
    }
    if (g.host) for (let i = 0; i < Math.min(3, 1 + (g.host >> 1)); i++) cap([lc(-3 + i * 3, 3, 5), lc(-4 + i * 3.5, 4, 9 + g.host * 0.5 - i)], 1.1, 0.4, 'bone');
  }

  // ---- the helm: a tall dome of skull-bone, a face plate with a black slit, a jaw for a bevor, the fringe crest
  {
    const H = J.head, tw = J.tw(78), sp3 = (al, du, s) => o6A(H, [Math.cos(al + tw) * 5.1 * (s || 1), Math.sin(al + tw) * 4.8 * (s || 1), du]);
    ell(H, 5.1 * (Math.abs(cp) * 1 + Math.abs(sp) * 0.94), 8.2, 5, 'boneP');
    ell(o6A(H, [0, 0, 3.4]), 5.2 * (Math.abs(cp) + Math.abs(sp) * 0.94), 4.6, 5.1, 'boneP');
    // the face plate: its own form proud of the dome
    plate([sp3(-0.95, 4.6, 1.05), sp3(0.95, 4.6, 1.05), sp3(1.05, -3.8, 1.02), sp3(0.5, -6.6, 1), sp3(-0.5, -6.6, 1), sp3(-1.05, -3.8, 1.02)], 'boneP', { bevel: 1.3, bulge: 0.9 });
    cap([sp3(-0.95, 1.9, 1.16), sp3(0, 2.4, 1.2), sp3(0.95, 1.9, 1.16)], 1.1, 1.1, 'bone');
    cap([sp3(-0.85, 0.6, 1.17), sp3(0.85, 0.6, 1.17)], 0.75, 0.75, 'ink');
    for (const al of [-0.42, 0.42]) ell(sp3(al, 0.6, 1.22), 0.65, 0.55, 0.3, 'glow', { em: gl > 0.7 ? 1 : 0.5 });
    cap([sp3(0, 2.2, 1.22), sp3(0, -3, 1.18)], 0.8, 0.9, 'bone');
    for (const al of [-0.55, -0.3, 0.3, 0.55]) for (const du of [-2.2, -3.7]) ell(sp3(al, du, 1.15), 0.45, 0.45, 0.2, 'ink');
    // the bevor: a jaw, teeth set along its edge
    plate([sp3(-1.2, -3.8, 1.08), sp3(1.2, -3.8, 1.08), sp3(1.4, -7, 1.1), sp3(0.5, -8.6, 1.06), sp3(-0.5, -8.6, 1.06), sp3(-1.4, -7, 1.1)], 'boneD', { bevel: 1.2, bulge: 0.6 });
    for (let i = -4; i <= 4; i++) ell(sp3(i * 0.2, -5.3, 1.19), 0.45, 0.8, 0.4, 'bone');
    for (let du = 6; du > -7; du -= 2.4) ell(sp3(Math.PI, du, 1.02), 1.5, 1.1, 1, 'boneD');
    // the crest: a saffron fringe standing up from brow to nape, falling behind
    const cr = [sp3(0, 6.2, 0.45), o6A(H, [0.8, 0, 11]), o6A(H, [-3.8, 0, 10.6]), o6A(H, [-6.8 + cloth * 0.4, 0, 5.8]), o6A(H, [-8 + cloth * 0.7, 0.3, 0])];
    cap(cr, 2.1, 1, 'fringe');
    for (const s of [-1, 1]) cap([o6A(H, [-2.5, s * 2, 9]), o6A(H, [-5 + cloth * 0.3, s * 3.2, 5.5]), o6A(H, [-6.2 + cloth * 0.6, s * 3.6, 1])], 0.9, 0.5, 'fringe');
    if (g.host >= 5) for (let i = -1; i <= 1; i++) { const b = o6A(H, [i * 2, 0, 6.5]); cap([b, o6A(b, [i * 2 - 1, 0, 4 + g.host * 0.5 - Math.abs(i) * 2])], 1, 0.4, 'bone'); }
  }

  // ---- the darchog: a pole of joined long bones from behind the left pauldron, flags down it, the crook
  {
    const P0 = J.pole;
    cap([P0[0], P0[1]], 1.35, 1.2, 'bone'); cap([P0[1], P0[2]], 1.2, 1.05, 'bone');
    ell(P0[1], 1.8, 1.8, 1.8, 'bone'); cap([P0[2], P0[3], P0[4]], 1.05, 0.85, 'bone');
    for (const p of [o6Lp(P0[1], P0[2], 0.08), o6Lp(P0[0], P0[1], 0.85)]) cap([o6A(p, [0, 0, 0.8]), o6A(p, [0, 0, -0.8])], 1.6, 1.6, 'saf');
    // a string of prayer flags from the pole's head, sagging down to the back of the left pauldron
    const A0 = o6A(P0[2], [0, 0, -1]), B0 = J.at(69, -5, -15), cord = t => o6A(o6Lp(A0, B0, t), [cloth * 0.3 * Math.sin(Math.PI * t), 0, -5 * Math.sin(Math.PI * t)]);
    const cp2 = []; for (let t = 0; t <= 1.0001; t += 0.1) cp2.push(cord(t)); cap(cp2, 0.35, 0.35, 'lea');
    for (let i = 0; i < 6; i++) {
      const t = 0.1 + i * 0.15, a = cord(t), b = cord(t + 0.09), sw = Math.sin(flag + i * 1.3) * 0.8, len = 4.8 + (i % 2) * 1.2;
      plate([a, b, o6A(b, [sw + cloth * 0.2, -0.6, -len]), o6A(o6Lp(a, b, 0.5), [sw + cloth * 0.2, -0.6, -len + 1.2]), o6A(a, [sw + cloth * 0.2, -0.6, -len])], O6_FLAGS[i % 5], { bevel: 0.7, bulge: 0.35 });
    }
  }

  // ---- the falchion: an iron slab with a bone-toothed edge, a spine so it never vanishes edge-on
  // The weapon in his hands follows the skill, the way a Paladin's Zeal or a Barbarian's Bash keeps the
  // hero's own rig: a plain swing shows the equipped falchion, but Scythe Sweep swings a scythe of vertebrae,
  // Marrow Crush a femur maul, Spine Lash a whip of spine, Bone Blade a long blade of bone.
  const WPN = O6_WPN[J.pose] || 'falchion';
  if (J.G && WPN !== 'falchion') {
    const G = J.G, d = J.d, edgeOn = Math.abs(sp) > 0.8, w = o6N([d[2], edgeOn ? 0.75 * (sp > 0 ? 1 : -1) : 0, -d[0]]), at = (l, e) => o6A(G, o6A(o6M(d, l), o6M(w, e)));
    o6BoneWeapon(WPN, { at, cap, ell, plate, glowAt, d, w, G, J });
  }
  if (J.G && WPN === 'falchion') {
    const G = J.G, d = J.d, edgeOn = Math.abs(sp) > 0.8, w = o6N([d[2], edgeOn ? 0.75 * (sp > 0 ? 1 : -1) : 0, -d[0]]), at = (l, e) => o6A(G, o6A(o6M(d, l), o6M(w, e)));
    ell(at(-6.8, 0), 1.9, 1.9, 1.9, 'boneD');
    cap([at(-5.8, 0), at(3.3, 0)], 1.35, 1.3, 'saf');
    for (let l = -5; l < 3; l += 1.7) cap([at(l, -1.35), at(l + 0.4, 1.35)], 0.5, 0.5, 'lea');
    plate([at(4.5, -2.4), at(4.5, 2.6), at(36, 4.6), at(40.5, 3.2), at(42.5, -2.2), at(38, -2.6)], 'iron', { bevel: 1.2, bulge: 0.15 });
    cap([at(5, -1.6), at(40, -1.8)], 0.95, 0.8, 'iron');
    plate([at(6, 2.3), at(36, 4.3), at(38.8, 5.6), at(35.4, 6.2), at(6, 3.8)], 'bone', { bevel: 0.8, bulge: 0.2 });
    for (let l = 8; l < 36; l += 3.1) plate([at(l, 3.4 + l * 0.03), at(l + 1.6, 3.6 + l * 0.03), at(l + 0.4, 6 + l * 0.035)], 'bone', { bevel: 0.5, bulge: 0.2, z: 0.2 });
    if (g.host) for (let i = 0; i < Math.min(8, g.host); i++) { const l = 10 + i * 3.4; cap([at(l, -2.4), at(l + 2.5, -4.5 - g.host * 0.35)], 0.9, 0.3, 'bone'); }
    cap([at(4, -5), at(3.2, 0), at(4, 5.4)], 1.4, 1.1, 'bone');
  }
  return { hook: C(J.pole[4]) };
}

// ------------------------------------------------------------------- the skill weapons: bone grown for one blow
// W.at(l, e): a point l along the grip line (d) and e across it (w), from the grip G. Same frame as the falchion.
function o6BoneWeapon(kind, W) {
  const { at, cap, ell, plate, glowAt, J } = W, ph = J.ph | 0, TAU = Math.PI * 2;
  if (kind === 'scythe') {
    // a haft of stacked vertebrae, each with its spur, and a crescent of jawbone at the head
    cap([at(-9, 0), at(43, 0)], 0.85, 0.75, 'boneD');
    for (let l = -8, i = 0; l <= 41; l += 3.3, i++) {
      ell(at(l, 0), 1.55, 1.55, 1.45, i % 3 === 0 ? 'boneP' : 'boneM');
      if (i % 2 === 0) cap([at(l + 0.8, 0.9), at(l + 1.9, 3.1)], 0.6, 0.22, 'bone');
    }
    cap([at(-2, 0), at(6, 0)], 1.75, 1.75, 'saf');
    for (let l = -1.5; l < 6; l += 1.8) cap([at(l, -1.7), at(l + 0.4, 1.7)], 0.45, 0.45, 'lea');
    ell(at(43.5, 0), 2.4, 2.4, 2.2, 'boneM');
    const out = [[45, 1.2], [48.5, -6], [48.8, -13], [46.2, -20.5], [41.2, -27], [34.5, -31.5]];
    const inn = [[34.5, -31.5], [38.2, -24.5], [40.6, -18], [41.4, -11], [40.4, -4.5], [41, 0]];
    plate(out.concat(inn).map(q => at(q[0], q[1])), 'boneM', { bevel: 1.1, bulge: 0.35 });
    cap(out.map(q => at(q[0] + 0.3, q[1] + 0.2)), 0.85, 0.45, 'boneD');
    for (let i = 1; i < inn.length - 1; i++) { const q = inn[i], r = inn[i + 1]; plate([at(q[0], q[1]), at((q[0] + r[0]) / 2 + 0.2, (q[1] + r[1]) / 2), at((q[0] + r[0]) / 2 - 2.3, (q[1] + r[1]) / 2 + 0.6)], 'boneP', { bevel: 0.4, bulge: 0.2, z: 0.2 }); }
    glowAt(at(43.5, -1.2), 0.9);
    return;
  }
  if (kind === 'maul') {
    // a femur for a haft, knuckled at the butt, and a fused head of skull and vertebrae
    ell(at(-7.5, 0), 2.3, 2.1, 2.1, 'boneM'); ell(at(-7, 1.6), 1.5, 1.4, 1.4, 'boneD');
    cap([at(-6, 0), at(12, 0.3), at(29, 0)], 1.45, 1.15, 'boneM');
    cap([at(-3, 0), at(5, 0)], 1.8, 1.8, 'saf');
    for (let l = -2.5; l < 5; l += 1.7) cap([at(l, -1.8), at(l + 0.4, 1.8)], 0.45, 0.45, 'lea');
    ell(at(30.5, -1.4), 2.3, 2.2, 2.2, 'boneD'); ell(at(30.5, 1.6), 2.1, 2, 2, 'boneD');
    ell(at(37.5, 0), 7.4, 7.2, 7, 'bone');
    ell(at(41, 0.4), 5.4, 5.6, 5.2, 'boneM');
    ell(at(39.5, -4.4), 1.6, 1.6, 1.4, 'ink'); ell(at(39.5, 4.2), 1.6, 1.6, 1.4, 'ink');
    plate([at(33.2, -3.6), at(33.2, 3.6), at(31.2, 2.6), at(31.2, -2.6)], 'boneD', { bevel: 0.6, bulge: 0.3 });
    for (let i = 0; i < 5; i++) { const a = i / 5 * TAU + 0.4, e = Math.cos(a) * 6.8, l = 37.5 + Math.sin(a) * 6.2; cap([at(l, e), at(l + Math.sin(a) * 5.2, e + Math.cos(a) * 5.2)], 1.1, 0.25, i % 2 ? 'boneP' : 'bone'); }
    glowAt(at(39.5, -4.4), 0.8); glowAt(at(39.5, 4.2), 0.8);
    return;
  }
  if (kind === 'whip') {
    // a short wrapped handle, then a spine that hangs, coils and cracks with the beat
    ell(at(-5.5, 0), 1.7, 1.7, 1.7, 'boneD');
    cap([at(-4.5, 0), at(6, 0)], 1.35, 1.25, 'saf');
    for (let l = -3.5; l < 6; l += 1.7) cap([at(l, -1.4), at(l + 0.4, 1.4)], 0.42, 0.42, 'lea');
    const curl = [1.25, 0.12, 0.45, 0.95][ph % 4], side = [0.9, 0.1, -0.35, -0.8][ph % 4], pts = [];
    for (let i = 0; i <= 18; i++) {
      const t = i / 18, base = at(7 + i * 3.35, side * 9 * t * t);
      pts.push(o6A(base, [0, 0, -curl * 26 * t * t - 2 * t]));
    }
    cap(pts, 1.0, 0.4, 'boneD');
    for (let i = 0; i < pts.length; i++) {
      const r = 2.05 - i * 0.07; ell(pts[i], r, r, r * 0.9, i % 4 === 0 ? 'boneP' : 'boneM');
      if (i % 2 === 1 && i < 16) cap([pts[i], o6A(pts[i], [0, 0, 1.6 - i * 0.05])], 0.45, 0.18, 'bone');
    }
    plate([o6A(pts[18], [0, 0, 1]), o6A(pts[18], [0, 0, -1]), o6A(pts[18], o6M(W.d, 4))], 'boneP', { bevel: 0.4, bulge: 0.2 });
    return;
  }
  if (kind === 'blade') {
    // the falchion's grip, grown over with a long straight blade of bone, serrated, ridged and seamed with light
    ell(at(-6.8, 0), 1.9, 1.9, 1.9, 'boneD');
    cap([at(-5.8, 0), at(3.3, 0)], 1.35, 1.3, 'saf');
    for (let l = -5; l < 3; l += 1.7) cap([at(l, -1.35), at(l + 0.4, 1.35)], 0.5, 0.5, 'lea');
    cap([at(4.5, -6.2), at(3.2, 0), at(4.5, 6.4)], 1.5, 1.1, 'boneM');
    ell(at(4.8, -6.4), 1.1, 1.1, 1.1, 'boneP'); ell(at(4.8, 6.6), 1.1, 1.1, 1.1, 'boneP');
    plate([at(5, -2.8), at(5, 2.8), at(49, 2), at(57, 0), at(49, -2)], 'boneM', { bevel: 1.2, bulge: 0.32 });
    cap([at(6, 0), at(50, 0)], 0.8, 0.4, 'boneD');
    for (let l = 9; l < 48; l += 4.2) {
      const hw = 2.8 - (l - 5) / 44 * 0.8;
      plate([at(l, hw - 0.1), at(l + 2, hw - 0.1), at(l + 0.5, hw + 1.6)], 'boneP', { bevel: 0.35, bulge: 0.15, z: 0.2 });
      plate([at(l + 2, -hw + 0.1), at(l + 4, -hw + 0.1), at(l + 2.5, -hw - 1.6)], 'boneP', { bevel: 0.35, bulge: 0.15, z: 0.2 });
    }
    for (let l = 14; l < 46; l += 10) glowAt(at(l, 0), 0.55);
    return;
  }
}

// ------------------------------------------------------------------- the strike's smear: the arc of the blade's passing
function o6Smear(c, J) {
  if (!J.smear || !J.G) return;
  const [a0, a1, str] = J.smear, cp = Math.cos(J.phi), sp = Math.sin(J.phi), K = O6_S;
  const C = p => { const d = p[0] * sp + p[1] * cp; return [O6_HX + (p[0] * cp - p[1] * sp) * K, O6_HY + (-p[2] + d * 0.4) * K]; };
  const x = c.getContext('2d'), img = x.getImageData(0, 0, c.width, c.height), Dd = img.data, piv = o6S(J.G, o6M(J.d, 3)), pq = C(piv), n = 24, sm = [];
  for (let i = 0; i <= n; i++) { const t = i / n, a = a0 + (a1 - a0) * t, r1 = 44, r0 = 44 - (6 + 18 * t * t); sm.push([C(o6A(piv, [Math.cos(a) * r1, 0, Math.sin(a) * r1])), C(o6A(piv, [Math.cos(a) * r0, 0, Math.sin(a) * r0])), t]); }
  const inside = (px, py) => { for (let i = 0; i < n; i++) { const q = [sm[i][0], sm[i + 1][0], sm[i + 1][1], sm[i][1]]; let cc = false; for (let a = 0, b = 3; a < 4; b = a++) { const [xa, ya] = q[a], [xb, yb] = q[b]; if ((ya > py) !== (yb > py) && px < (xb - xa) * (py - ya) / (yb - ya) + xa) cc = !cc; } if (cc) return sm[i][2]; } return -1; };
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const s of sm) for (const p of [s[0], s[1]]) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  for (let py = Math.max(0, Math.floor(y0)); py <= Math.min(c.height - 1, Math.ceil(y1)); py++) for (let px = Math.max(0, Math.floor(x0)); px <= Math.min(c.width - 1, Math.ceil(x1)); px++) {
    const q = (py * c.width + px) * 4; if (Dd[q + 3] > 0) continue;
    const t = inside(px + 0.5, py + 0.5); if (t < 0) continue;
    const rr = Math.hypot(px - pq[0], py - pq[1]) / K, edge = rr > 40 ? 1 : rr > 33 ? 0.7 : 0.4;
    const al = Math.min(0.95, (0.2 + 0.8 * t) * edge * str);
    if (al <= 0.06 || o6VN(px * 0.5, py * 0.5, 3) < 0.25 * (1 - t)) continue;
    const col = edge >= 1 ? [226, 214, 182] : edge > 0.5 ? [150, 170, 150] : [70, 92, 86];
    Dd[q] = col[0]; Dd[q + 1] = col[1]; Dd[q + 2] = col[2]; Dd[q + 3] = Math.round(255 * al);
  }
  x.putImageData(img, 0, 0);
}

// ------------------------------------------------------------------- the rim: the hero's upper-left edge catches the light, so he reads on any ground
function o6Rim(c) {
  const x = c.getContext('2d'), W = c.width, H = c.height, img = x.getImageData(0, 0, W, H), D = img.data, S = new Uint8ClampedArray(D), a = (i, j) => i < 0 || j < 0 || i >= W || j >= H ? 0 : S[(j * W + i) * 4 + 3];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const q = (j * W + i) * 4; if (!S[q + 3]) continue;
    // the pixel just inside the outline, on a side that faces the light
    if (a(i - 1, j) && a(i, j - 1)) { if (!a(i - 2, j) || !a(i, j - 2)) { const l = (S[q] + S[q + 1] + S[q + 2]) / 3; if (l > 40) { D[q] = Math.min(255, S[q] * 1.25 + 18); D[q + 1] = Math.min(255, S[q + 1] * 1.2 + 14); D[q + 2] = Math.min(255, S[q + 2] * 1.1 + 8); } } }
  }
  x.putImageData(img, 0, 0);
}
// ------------------------------------------------------------------- frames
function o6Gear() { const host = P.host && isBone() ? Math.min(8, P.host.n) : 0; return { host, key: String(host) }; }
function o6Frame(pose, ph, view, g) {
  const key = '37|o6|' + pose + '|' + ph + '|' + view + '|' + g.key;
  let fr = HERO_FR[key]; if (fr) return fr;
  const Sc = O6Sculpt(O6_HW, O6_HH), J = o6Rig(pose, ph, view), out = o6Paint(Sc, J, g);
  const hr = Sc.render(); o6Rim(hr); o6Smear(hr, J);
  const lo = src => { const c = mkCanvas(O6.FW, O6.FH), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, O6.FW, O6.FH); c._hr = src; return c; };
  const flip = src => { const f = mkCanvas(src.width, src.height), x = f.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return f; };
  const tintH = (src, col) => { const q = mkCanvas(src.width, src.height), x = q.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, q.width, q.height); return q; };
  const hf = flip(hr);
  fr = { c: lo(hr), f: lo(hf), fl: lo(tintH(hr, '#fff')), flf: lo(tintH(hf, '#fff')), w: O6.FW, h: O6.FH, ox: O6.OX, oy: O6.OY,
    bb: { x: O6.OX - 11, y: O6.OY - 44, w: 22, h: 45 }, tint: (src, col) => lo(tintH(src._hr || src, col)), hook: out.hook, J };
  HERO_FR[key] = fr; return fr;
}
const O6_LAST = { fr: null, X: 0, Y: 0, face: 1 };
{
  const _hf = heroFrame;
  heroFrame = function (cls, pose, ph, view) {
    if (cls !== 'ossumancer') return _hf(cls, pose, ph, view);
    if (!view) view = P._view || (P._fb ? 'back' : 'front');
    if (O6_PHI[view] == null) view = 'front';
    if (!O6_PH[pose]) pose = pose === 'wind' ? 'cast' : 'idle';
    const n = O6_PH[pose];
    return o6Frame(pose, (((ph | 0) % n) + n) % n, view, o6Gear());
  };
  const _hp = heroPose;
  // Wrap castSkill so a Carapace melee-skill id (crush and later bscythe / lash / leap / gcharge)
  // is remembered while its cast/swing timer runs down. heroPose reads P._melSk to pick the anim.
  if (typeof castSkill === 'function') {
    const _cs_o6 = castSkill;
    castSkill = function (id, pt) {
      if (P && P.cls === 'ossumancer' && O6_MELEE[id]) { P._melSk = O6_MELEE[id]; P._melSk0 = 0; }
      return _cs_o6(id, pt);
    };
    if (window.__spm) window.__spm.castSkill = castSkill;
  }
  heroPose = function () {
    const r = _hp(); if (P.cls !== 'ossumancer') return r;
    if (P.swing > (P._swL || 0) + 1e-6) P._sw0 = P.swing; P._swL = P.swing;
    if (P.cast > (P._caL || 0) + 1e-6) P._ca0 = P.cast; P._caL = P.cast;
    // A Carapace melee skill locks the pose for as long as the cast/swing runs (fall back to swing timer
    // for skills wired as basic attacks). When both timers drain the marker clears on next tick.
    if (P._melSk) {
      let t = -1, dur = P._ca0 || P._sw0 || 0.5;
      if (P.cast > 0) t = 1 - P.cast / Math.max(0.05, P._ca0 || dur);
      else if (P.swing > 0) t = 1 - P.swing / Math.max(0.05, P._sw0 || dur);
      if (t >= 0 && t <= 1.001) {
        const n = O6_PH[P._melSk] || 4, ph = Math.min(n - 1, Math.max(0, Math.floor(t * n)));
        return [P._melSk, ph];
      }
      // timer drained: hold last frame briefly, then release
      P._melSk0 = (P._melSk0 || 0) + 0.016;
      if (P._melSk0 > 0.08) P._melSk = null;
      else return [P._melSk, (O6_PH[P._melSk] || 4) - 1];
    }
    if (P.leap && P.leap.dur) return ['leap', P.leap.t / P.leap.dur < 0.5 ? 0 : 1];
    if (P.dash) return ['charge', Math.floor(G.time * 14) % 4];
    if (P.pulling && P.swing <= 0) return ['pull', Math.floor(G.time * 8) % 4];
    if (r[0] === 'atk') return ['atk', Math.min(3, Math.floor((1 - P.swing / Math.max(0.05, P._sw0 || 0.22)) * 4))];
    if (r[0] === 'cast') return ['cast', P.cast > 0 ? Math.min(3, Math.floor((1 - P.cast / Math.max(0.05, P._ca0 || 0.5)) * 4)) : 2 + Math.floor(G.time * 5) % 2];
    if (r[0] === 'walk') return ['walk', Math.floor((P._wd || 0) * 5.6) % 8];
    if (r[0] === 'idle') return ['idle', Math.floor(G.time * 2) % 4];
    return r;
  };
  if (window.__spm) window.__spm.heroFrame = (...a) => heroFrame(...a);
  window.__o6Rig = (...a) => o6Rig(...a);
}
// the hero on the map (the Bone Host's carapace is painted into the frames themselves)
drawOssu = function (alpha, lift) {
  const q = iso(P.x, P.y), [pose, ph] = heroPose(), fr = heroFrame('ossumancer', pose, ph), face = P.face || 1;
  const X = Math.round(q.sx - (face < 0 ? fr.w - fr.ox : fr.ox)), Y = Math.round(q.sy + 3 - (fr.oy + 1) - lift);
  O6_LAST.fr = fr; O6_LAST.X = X; O6_LAST.Y = Y; O6_LAST.face = face; O6_LAST.roll = P.roll > 0;
  if (alpha !== 1) ctx.globalAlpha = alpha;
  const img = (P.hurt > 0 && OPT.flash) ? (face < 0 ? fr.flf : fr.fl) : (face < 0 ? fr.f : fr.c);
  if (P.roll > 0) ctx.drawImage(img, X, Math.round(Y + fr.h * 0.3), fr.w, Math.round(fr.h * 0.7)); else ctx.drawImage(img, X, Y);
  ctx.globalAlpha = 1;
  return { x: Math.round(q.sx - O6_BOX.w / 2), y: Math.round(q.sy + 3 - O6_BOX.h - lift), w: O6_BOX.w, h: O6_BOX.h };
};

// ------------------------------------------------------------------- the lamp: a skull lantern hung from the darchog's crook
let O6_LAMP = null;
function o6Lamp() {
  if (O6_LAMP) return O6_LAMP;
  const W = 12, H = 21, Sc = O6Sculpt(W, H);
  for (let y = 0; y < 5; y += 2) Sc.ell([6, y + 0.8, 3], 0.6, 1, 0.6, 'iron');
  Sc.ell([6, 11, 4], 3.6, 3.4, 3.4, 'bone');
  Sc.plate([[3.7, 12.6, 5], [8.3, 12.6, 5], [7.9, 15.8, 4.5], [4.1, 15.8, 4.5]], 'boneD', { bevel: 1, bulge: 0.5 });
  Sc.cap([[5.2, 5.6, 7], [5.2, 7.6, 7]], 1, 1, 'bone');
  const c = Sc.render(), x = c.getContext('2d');
  const px = (a, b, col) => { x.fillStyle = col; x.fillRect(a, b, 1, 1); };
  for (const [a, b] of [[4, 11], [4, 12], [7, 11], [7, 12], [8, 12]]) px(a, b, '#e09a40');
  px(4, 11, '#ffe6b0'); px(7, 11, '#ffe6b0'); px(6, 13, '#6a3212');
  for (let a = 4; a <= 8; a++) px(a, 15, a & 1 ? '#c8b48a' : '#1a1016');
  px(5, 4, '#ffb040'); px(5, 3, '#ffe8a0'); px(5, 2, '#fff8e0'); px(4, 3, '#c0602a');
  const lo = src => { const q = mkCanvas(8, 14), qx = q.getContext('2d'); qx.imageSmoothingEnabled = false; qx.drawImage(src, 0, 0, 8, 14); q._hr = src; return q; };
  const f = mkCanvas(W, H), fx = f.getContext('2d'); fx.translate(W, 0); fx.scale(-1, 1); fx.drawImage(c, 0, 0);
  O6_LAMP = { c: lo(c), f: lo(f), w: 8, h: 14, ox: 4, oy: 0 };
  return O6_LAMP;
}
{
  const _lf = lampFrame;
  lampFrame = function (cls) { return cls === 'ossumancer' ? o6Lamp() : _lf(cls); };
  const _dcl = drawClassLamp;
  drawClassLamp = function (list) {
    if (P.cls !== 'ossumancer') return _dcl(list);
    if (P.dead || !G.zone) return;
    const fr0 = O6_LAST.fr, behind = fr0 && fr0.hook && fr0.hook[2] < -2;
    list.push({ d: P.x + P.y + (behind ? -0.05 : 0.05), f: () => {
      const L = O6_LAST, fr = L.fr; if (!fr || !fr.hook || L.roll) return;
      const lf = o6Lamp(), face = L.face, hx = face < 0 ? O6_HW - fr.hook[0] : fr.hook[0];
      const sway = Math.sin(G.time * 2.4) * 0.5 + (P.path ? Math.sin(G.time * 9) * 0.4 : 0);
      const X = Math.round((L.X + hx / O6.K - lf.ox + sway) * 2) / 2, Y = Math.round((L.Y + fr.hook[1] / O6.K - 0.5) * 2) / 2;
      ctx.drawImage(face < 0 ? lf.f : lf.c, X, Y);
      ctx.globalCompositeOperation = 'lighter'; glow(X + lf.w / 2, Y + lf.h * 0.55, 8, '255,214,150', 0.16 + 0.04 * Math.sin(G.time * 9)); ctx.globalCompositeOperation = 'source-over';
    } });
  };
}
// a sliver of dry bone at world grain: two lit pixels and a cool dark tail, a phosphor pip when it is under strain
function o6Sliver(sx, sy, a, len, hot) {
  const X = Math.round(sx), Y = Math.round(sy), c = Math.cos(a), s = Math.sin(a) * 0.6, L = Math.max(1, Math.round(len || 1));
  const dx = Math.abs(c) > Math.abs(s) ? Math.sign(c) : 0, dy = dx ? 0 : Math.sign(s) || 1;
  ctx.fillStyle = '#231a26'; ctx.fillRect(X - dx * (L + 1), Y - dy * (L + 1), 1, 1); ctx.fillRect(X + dy, Y + dx, 1, 1);
  // v0.59: paler, drier bone (was ochre)
  for (let i = -L; i <= L - 1; i++) { ctx.fillStyle = i === -L ? '#9a9282' : i === L - 1 ? '#efe9dc' : '#d4ccba'; ctx.fillRect(X + dx * i, Y + dy * i, 1, 1); }
  if (hot) { ctx.fillStyle = '#b8f4d0'; ctx.fillRect(X + dx * L, Y + dy * L, 1, 1); }
}

// =================================================================== the Ossuarch's bone: minions and every skill's effect
// Bone flies straight. Matte dry bone, cool violet in its shadows, warm ochre where the light takes it; green-white
// phosphor only in the joints of bone under strain. Every effect has its anticipation (a crack that glows, a gathering),
// its burst with a smear (the crescent of vertebrae for the blades and whips), a quick settle, a hit reaction on what
// it strikes (a gouge and calcified dust) and a death signature (bone litter left on the ground).
// Effects are sculpted with the same painter as the knight, at the world grain; the raised dead and the Colossus are
// sculpted characters with `_hr` twins at 1.5x like the heroes.

// ---- a sprite cache: painted once per (quantized) shape
const O6_SPR = new Map();
function o6Spr(key, W, H, ox, oy, paint) {
  let s = O6_SPR.get(key); if (s) return s;
  if (O6_SPR.size > 900) O6_SPR.clear();
  const Sc = O6Sculpt(W, H); paint(Sc);
  s = { c: Sc.render(), w: W, h: H, ox, oy }; O6_SPR.set(key, s); return s;
}
const o6Blit = (s, x, y, a) => { if (a != null && a < 1) ctx.globalAlpha = Math.max(0, a); ctx.drawImage(s.c, Math.round(x - s.ox), Math.round(y - s.oy)); ctx.globalAlpha = 1; };
const o6Px = (x, y, col, w, h) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w || 1, h || 1); };
// the screen direction of a world direction (iso), unit length
const o6Dir = (dx, dy) => { const a = iso(dx, dy), b = iso(0, 0), x = a.sx - b.sx, y = a.sy - b.sy, l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
const o6Ang16 = (x, y) => ((Math.round(Math.atan2(y, x) / (Math.PI / 8)) % 16) + 16) % 16;

// ---- the pieces
// a bone spear: a long shaft with a knuckle at the tail and a barbed head (big), or a splinter (small)
function o6Spear(small, ai) {
  return o6Spr('sp' + (small ? 1 : 0) + '|' + ai, 26, 26, 13, 13, S => {
    const a = ai * Math.PI / 8, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux, L = small ? 4.5 : 10;
    const P0 = [13 - ux * L, 13 - uy * L, 3], P1 = [13 + ux * L * 0.75, 13 + uy * L * 0.75, 3];
    S.cap([P0, P1], small ? 0.7 : 1, small ? 0.6 : 0.8, 'bone');
    if (!small) {
      S.ell([P0[0], P0[1], 3], 1.5, 1.5, 1.5, 'bone');
      const h = [13 + ux * L, 13 + uy * L, 4];
      S.plate([[h[0] + ux * 3, h[1] + uy * 3, 4], [h[0] - ux * 1.5 + nx * 2, h[1] - uy * 1.5 + ny * 2, 4], [h[0] - ux * 0.5, h[1] - uy * 0.5, 4], [h[0] - ux * 1.5 - nx * 2, h[1] - uy * 1.5 - ny * 2, 4]], 'bone', { bevel: 0.8, bulge: 0.4 });
      S.ell([13 + ux * L * 0.6, 13 + uy * L * 0.6, 4.1], 0.5, 0.5, 0.2, 'glow', { em: 0.6 });
    } else S.plate([[P1[0] + ux * 2, P1[1] + uy * 2, 3.5], [P1[0] + nx, P1[1] + ny, 3.5], [P1[0] - nx, P1[1] - ny, 3.5]], 'bone', { bevel: 0.5 });
  });
}
// a vertebra seen from the side: body, spinous process, the gap glowing when it is under strain
function o6Vert(ai, hot) {
  return o6Spr('vt' + ai + (hot ? 'h' : ''), 12, 12, 6, 6, S => {
    const a = ai * Math.PI / 8, ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    S.ell([6, 6, 3], 2.2, 2.2, 2, 'bone');
    S.cap([[6, 6, 3], [6 - nx * 3.6 - ux * 0.8, 6 - ny * 3.6 - uy * 0.8, 3]], 1, 0.5, 'bone');
    S.cap([[6 - ux * 2.4, 6 - uy * 2.4, 3.5], [6 + ux * 2.4, 6 + uy * 2.4, 3.5]], 0.6, 0.6, 'boneD');
    if (hot) S.ell([6 + ux * 2.2, 6 + uy * 2.2, 5.5], 0.5, 0.5, 0.3, 'glow', { em: 0.9 });
  });
}
// a skull: cranium, cheek, jaw open by j (0..3), sockets with a pip of phosphor
function o6Skull(j, face, big) {
  const k = big ? 1.4 : 1;
  return o6Spr('sk' + j + (face < 0 ? 'l' : 'r') + (big ? 'b' : ''), 18, 18, 9, 9, S => {
    const f = face < 0 ? -1 : 1;
    S.ell([9, 8, 4], 4.4 * k, 4 * k, 4, 'bone');
    S.ell([9 + f * 2.2 * k, 10.2, 5], 2.6 * k, 2 * k, 2, 'bone');
    S.plate([[9 - 1.2 * k, 11.5 + j * 0.8, 5], [9 + f * 3.8 * k, 11.5 + j * 0.8, 5], [9 + f * 3.4 * k, 13.5 + j, 4.6], [9, 13.2 + j, 4.6]], 'boneD', { bevel: 0.7, bulge: 0.4 });
    for (const dx of [0.4, 2.8]) S.ell([9 + f * dx * k, 8.6, 7], 0.95 * k, 1.1 * k, 0.4, 'ink');
    S.ell([9 + f * 2.8 * k, 8.8, 7.6], 0.45, 0.45, 0.2, 'glow', { em: 0.8 });
    if (j) S.ell([9 + f * 1.8 * k, 12.2 + j * 0.4, 6], 1.3, 0.5 + j * 0.3, 0.3, 'ink');
  });
}
// a bone arm clawing out of the ground: forearm, wrist, splayed or curled fingers
function o6Arm(grab, sway) {
  return o6Spr('arm' + (grab ? 1 : 0) + sway, 20, 26, 10, 23, S => {
    const tx = 10 + sway * 1.5, c = grab ? 1 : 0;
    S.cap([[10, 24, 3], [10 + sway * 0.6, 17, 3.5], [tx, 10, 4]], 1.6, 1.2, 'bone');
    S.cap([[10.8, 24, 2], [10.8 + sway * 0.6, 17, 2.5], [tx + 1, 11, 3]], 1, 0.8, 'boneD');
    S.ell([tx, 9, 4.5], 2.2, 1.7, 1.6, 'bone');
    for (const [fx, fy, gx, gy] of [[-2, -1, -3 + c * 2, -5 + c * 3], [-1, -1.5, -1 + c, -6 + c * 4], [1, -1.5, 1, -6 + c * 4], [2, -1, 3 - c * 2, -5 + c * 3]])
      S.cap([[tx + fx * 0.6, 9 + fy, 5], [tx + fx, 9 + (fy + gy) / 2, 5.5], [tx + gx, 9 + gy, 5.5 + c]], 0.65, 0.5, 'bone');
    S.cap([[tx + 1.8, 10, 5], [tx + 3.6, 9 + c, 5]], 0.6, 0.5, 'bone');
    S.ell([10 + sway * 0.4, 16.5, 5], 0.5, 0.5, 0.3, 'glow', { em: grab ? 1 : 0.5 });
  });
}
// a spike of bone thrust up out of the ground at a slant
function o6Spike(ai, lb, gb) {
  return o6Spr('spk' + ai + '|' + lb + '|' + gb, 40, 40, 20, 30, S => {
    const a = ai * Math.PI / 8, d = o6Dir(Math.cos(a), Math.sin(a)), L = (6 + lb * 5) * gb / 3, tip = [20 + d[0] * L * 0.7, 30 + d[1] * L * 0.5 - L * 0.75, 4];
    S.cap([[20, 30, 2], [(20 + tip[0]) / 2, (30 + tip[1]) / 2 + 0.5, 3], tip], 2.2 + lb * 0.3, 0.35, 'bone');
    S.cap([[20.8, 30, 1], [tip[0] + 0.5, tip[1] + 1, 2]], 1, 0.3, 'boneD');
    if (gb === 3) S.ell([20 + d[0] * 1.5, 29 - L * 0.1, 5], 0.55, 0.55, 0.3, 'glow', { em: 0.7 });
  });
}
// a rib thrusting up out of the ground, arching in toward the middle
function o6Rib(dx, dy, h, small) {
  const qx = Math.round(dx), qy = Math.round(dy), qh = Math.round(h / 2) * 2;
  return o6Spr('rib' + qx + ',' + qy + ',' + qh + (small ? 's' : ''), 40, 48, 20, 42, S => {
    const pts = []; for (let j = 0; j <= 8; j++) { const t = j / 8, u = 1 - t; pts.push([20 + t * t * qx, 42 - 2 * u * t * qh - t * t * (qh * 1.1) + t * t * qy, 3 + t * 2]); }
    S.cap(pts, small ? 1.3 : 2, small ? 0.5 : 0.6, 'boneM');
    
  });
}
// bone litter: a scatter of broken pieces on the ground
function o6Litter(v) {
  return o6Spr('lit' + v, 24, 14, 12, 8, S => {
    const r = i => o6H(v * 31 + i, 7);
    S.ell([12 + (r(1) - 0.5) * 4, 8, 2], 2.6, 2.2, 2.2, 'bone');
    S.ell([12 + (r(1) - 0.5) * 4 + 1, 8.4, 4], 0.7, 0.7, 0.3, 'ink');
    for (let i = 0; i < 5; i++) { const x = 3 + r(i + 2) * 18, y = 5 + r(i + 9) * 6, a = r(i + 20) * Math.PI; S.cap([[x - Math.cos(a) * 2.5, y - Math.sin(a) * 1.2, 1], [x + Math.cos(a) * 2.5, y + Math.sin(a) * 1.2, 1]], 0.8, 0.7, i % 2 ? 'boneD' : 'bone'); }
    for (let i = 0; i < 3; i++) S.cap([[4 + i * 6, 11, 0.5], [5 + i * 6, 10.5, 0.5]], 0.6, 0.5, 'boneD');
  });
}
// the Grave Banner: a pole of long bones, a skull finial, a torn maroon banner in four flutters
function o6Banner(ph) {
  return o6Spr('ban' + ph, 34, 50, 10, 47, S => {
    S.cap([[10, 47, 2], [10, 29, 2], [10, 10, 2]], 1.3, 1.05, 'boneM'); S.ell([10, 29, 2], 1.8, 1.8, 1.8, 'boneM');
    S.cap([[10, 12, 3], [26, 13, 3]], 0.9, 0.7, 'boneM');
    // three torn strips of heavy cloth hanging from the crossbar, folds swinging with the wind
    for (let k = 0; k < 3; k++) {
      const x0 = 11.5 + k * 4.8, len = [24, 29, 19][k] + [0, 1, 0, -1][(ph + k) % 4];
      S.surf((s, t) => { const x = x0 + s * 4.6, sw = Math.sin(t * 3 + ph * 1.6 + k) * 1.4 * t; if (t > 0.82 && o6H(Math.floor(s * 5) + k * 7, 3) < 0.45) return null; return [x + sw, 13 + t * len, 3 + Math.sin(s * Math.PI * 2 + k + ph) * 1.2 + t * 0.8]; }, 8, 14, 'mar', { inside: 0.45, su: 10, sv: 20 });
      S.cap([[x0 + 0.2, 13.5, 4.6], [x0 + 4.4, 13.5, 4.6]], 0.6, 0.6, 'saf');
    }
    S.ell([10, 6.5, 3], 3, 2.8, 2.8, 'boneM'); S.ell([9.1, 6.7, 5.4], 0.7, 0.8, 0.3, 'ink'); S.ell([11.1, 6.7, 5.4], 0.7, 0.8, 0.3, 'ink'); S.ell([11.1, 6.8, 5.7], 0.35, 0.35, 0.2, 'glow', { em: 0.8 });
  });
}
// a plate of bone armour: a small shoulder blade, four turns
function o6Plate(ai) {
  return o6Spr('pl' + ai, 12, 12, 6, 6, S => {
    const a = ai * Math.PI / 2 + 0.4, c = Math.cos(a), s = Math.sin(a), R = (x, y) => [6 + x * c - y * s, 6 + x * s + y * c, 3];
    S.plate([R(-3.2, -2.4), R(3.2, -2.4), R(2, 2.4), R(0, 3.6), R(-2, 2.4)], 'bone', { bevel: 1, bulge: 0.6 });
    S.cap([R(-2.6, -1.4), R(2.4, 1.2)].map(p => [p[0], p[1], 5]), 0.5, 0.4, 'bone');
  });
}

// ---- litter, dust and gouges: the world remembers where bone broke
function o6Dust(x, y, z, n, hot) { for (let i = 0; i < n; i++) parts.push({ x: x + rand(-0.15, 0.15), y: y + rand(-0.15, 0.15), z: z + rand(-2, 2), vx: rand(-0.9, 0.9), vy: rand(-0.9, 0.9), vz: rand(2, 9), t: rand(0.25, 0.55), col: hot && i === 0 ? '#b8f4d0' : ['#8a7a64', '#b09a78', '#6a5c4c', '#cdbb94'][i % 4] }); }
function o6AddLitter(x, y, n) { const L = G.o6lit || (G.o6lit = []); for (let i = 0; i < (n || 1); i++) L.push({ x: x + rand(-0.3, 0.3), y: y + rand(-0.3, 0.3), v: Math.floor(Math.random() * 6), t: 9 }); if (L.length > 60) L.splice(0, L.length - 60); }
function o6Gouge(m) { const L = G.o6gouge || (G.o6gouge = []); L.push({ m, t: 0.28, s: Math.random() * 99, a: rand(-1, 1) }); if (L.length > 40) L.shift(); }
{
  const _hm = hurtMon;
  hurtMon = function (m, dmg, col) {
    const hp0 = m ? m.hp : 0; _hm(m, dmg, col);
    if (P.cls === 'ossumancer' && m && m.hp < hp0 && (col === '#e8e2d0' || col === '#ffffff' || col === '#f4efe2') && G.time - (m._o6hit || -9) > 0.12) { m._o6hit = G.time; o6Gouge(m); o6Dust(m.x, m.y, 10, 5, dmg > 20); }
  };
  const _km = killMon;
  killMon = function (m) { const was = m && m.dead; _km(m); if (P.cls === 'ossumancer' && m && !was && m.dead) { o6AddLitter(m.x, m.y, 2); o6Dust(m.x, m.y, 6, 8, true); } };
  const _sd = skelDies;
  skelDies = function (e, quiet) { _sd(e, quiet); if (e) { o6AddLitter(e.x, e.y, 2); o6Dust(e.x, e.y, 8, 6, false); } };
}

// ---- the raised dead and the Colossus, sculpted on the knight's rig
function o6Build(hr, W, H, ox, oy, bb, K) {
  const w = Math.round(W / K), h = Math.round(H / K);
  const lo = src => { const c = mkCanvas(w, h), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, w, h); c._hr = src; return c; };
  const flip = src => { const f = mkCanvas(src.width, src.height), x = f.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return f; };
  const tintH = (src, col) => { const q = mkCanvas(src.width, src.height), x = q.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, q.width, q.height); return q; };
  const hf = flip(hr);
  return { c: lo(hr), f: lo(hf), fl: lo(tintH(hr, '#fff')), flf: lo(tintH(hf, '#fff')), w, h, ox, oy, bb, tint: (src, col) => lo(tintH(src._hr || src, col)) };
}
// a body of bare bone: skull, spine, rib cage, pelvis, long bones with knobbed joints. sc scales the whole figure;
// big: the Colossus (bundled bones, skulls studded on it, phosphor burning in the chest)
function o6BonePaint(Sc, J, sc, ox, oy, o) {
  const phi = J.phi, cp = Math.cos(phi), sp = Math.sin(phi), K = O6_S * sc;
  const dep = p => p[0] * sp + p[1] * cp;
  const C = p => [ox + (p[0] * cp - p[1] * sp) * K, oy + (-p[2] + dep(p) * 0.4) * K, dep(p) * K];
  const cap = (pts, r0, r1, m, op) => Sc.cap(pts.map(C), r0 * K, r1 * K, m, op);
  const ell = (p, rx, ry, rz, m, op) => Sc.ell(C(p), rx * K, ry * K, rz * K, m, op);
  const plate = (pts, m, op) => Sc.plate(pts.map(C), m, op);
  const big = o.big, bm = 'boneM', bd = 'bone', r = big ? 1.8 : 1.25;
  const glowAt = (p, s) => ell(p, s || 0.9, s || 0.9, 0.6, 'glow', { em: o.glow || 0.6 });
  for (const lg of [J.legR, J.legL]) {
    cap([lg.hip, lg.kn], 1.6 * r, 1.3 * r, bm); if (big) { cap([o6A(lg.hip, [1.5, 1, 0]), o6A(lg.kn, [1.5, 1, 0])], 1.3, 1.1, bd); cap([o6A(lg.hip, [-1.5, -1, 0]), o6A(lg.kn, [-1, -1, 0])], 1.2, 1, bd); }
    cap([lg.kn, lg.an], 1.4 * r, 1.1 * r, bm); cap([o6A(lg.kn, [-1, 0.8, -1]), o6A(lg.an, [-0.8, 0.8, 1])], 0.8 * r, 0.7 * r, bd);
    ell(lg.kn, 2 * r, 2 * r, 2 * r, bm); glowAt(o6A(lg.kn, [0.5, 0, -2 * r]), 0.7 * r);
    cap([lg.an, lg.toe], 1.4 * r, 0.9 * r, bd);
  }
  const pv = J.at(44, 0, 0);
  plate([J.at(47, 2, -8 * r), J.at(48, 1, 0), J.at(47, 2, 8 * r), J.at(40, 3, 5 * r), J.at(38, 3, 0), J.at(40, 3, -5 * r)], bm, { bevel: 1.4, bulge: 0.6 });
  ell(o6A(pv, [3, 0, -2]), 1.2, 1.5, 0.5, 'ink');
  for (let u = 46; u <= 72; u += 3) ell(J.at(u, -3, 0), 1.9 * r, 1.4 * r, 1.6 * r, u % 2 ? bd : bm);
  if (big) ell(J.at(59, -1.5, 0), 3.2, 4, 3, 'glow', { em: 0.2 + (o.glow || 0) * 0.3 });
  for (let i = 0; i < 5; i++) {
    const u0 = 67 - i * 3.4, span = 1.5, pts = [];
    for (let k = 0; k <= 14; k++) { const a = -span + 2 * span * k / 14, rr = (9 - i * 0.5) * r * (big ? 0.9 : 0.62); pts.push(J.at(u0 - 3 * Math.pow(Math.abs(a) / span, 1.4), Math.cos(a) * rr * 0.85 - 1, Math.sin(a) * rr)); }
    cap(pts, 0.85 * r, 0.7 * r, bm);
  }
  cap([J.at(68, 5, 0), J.at(54, 5.5, 0)], 1.1 * r, 0.9 * r, bm);
  cap([J.shL, J.at(70, 0, 0), J.shR], 1.3 * r, 1.3 * r, bm);
  for (const [a, side] of [[J.armR, 1], [J.armL, -1]]) {
    ell(a.sh, 2.4 * r, 2.4 * r, 2.4 * r, bm);
    cap([a.sh, a.el], 1.3 * r, 1.1 * r, bm); cap([a.el, a.ha], 1.1 * r, 0.9 * r, bm); cap([o6A(a.el, [0, side * 0.8, -0.5]), o6A(a.ha, [0, side * 0.8, 0.5])], 0.7 * r, 0.6 * r, bd);
    ell(a.el, 1.6 * r, 1.6 * r, 1.6 * r, bm); glowAt(a.el, 0.6 * r);
    const hd = o6N(o6S(a.ha, a.el));
    ell(a.ha, 1.6 * r, 1.4 * r, 1.4 * r, bd); for (let f = -1; f <= 1; f++) cap([o6A(a.ha, o6M(hd, 1)), o6A(a.ha, o6A(o6M(hd, 3.2), [0, f * 1.1, -1.2]))], 0.45 * r, 0.4 * r, bm);
  }
  const H = J.head, sp3 = (al, du, s) => o6A(H, [Math.cos(al + J.tw(78)) * 4.4 * r * s, Math.sin(al + J.tw(78)) * 4.4 * r * s, du * r]);
  ell(H, (big ? 3.4 : 4.4) * r, (big ? 3.9 : 5.2) * r, (big ? 3.4 : 4.4) * r, bm);
  plate([sp3(-0.8, -1.5, 1), sp3(0.8, -1.5, 1), sp3(0.7, -5.5, 0.95), sp3(-0.7, -5.5, 0.95)], bd, { bevel: 1, bulge: 0.5 });
  for (const al of [-0.45, 0.45]) { ell(sp3(al, 0.4, 1.05), (big ? 1.5 : 1.1) * r, (big ? 1.6 : 1.3) * r, 0.4, 'ink'); ell(sp3(al, 0.3, 1.1), 0.45 * r, 0.45 * r, 0.2, 'glow', { em: o.glow || 0.6 }); }
  for (let i = -3; i <= 3; i++) ell(sp3(i * 0.2, -3.2, 1.02), 0.45 * r, 0.7 * r, 0.3, bm);
  if (big) {
    for (const s of [-1, 1]) cap([sp3(s * 1.4, 2.5, 0.9), o6A(H, [-1, s * 10, 8]), o6A(H, [2, s * 13, 13])], 1.5, 0.4, bm);
    for (const [sh, s] of [[J.shR, 1], [J.shL, -1]]) for (let i = 0; i < 3; i++) { const p = o6A(sh, [-3 + i * 3, s * 2.5, 3 + (i % 2) * 2]); ell(p, 3, 3.2, 3, bm); ell(o6A(p, [2.5, 0, 0.3]), 0.8, 0.9, 0.3, 'ink'); }
    for (let i = 0; i < 4; i++) { const p = J.at(40, 6, -6 + i * 4); ell(p, 2.6, 2.8, 2.6, bm); ell(o6A(p, [2.2, 0, 0.3]), 0.7, 0.8, 0.3, 'ink'); }
  }
  if (!big && o.rag) Sc.surf((s, t) => { const a = -1.3 + s * 2.6; if (t > 0.8 && o6H(Math.floor(s * 6), 2) < 0.5) return null; return C(J.at(46 - t * 12, Math.cos(a) * 7.5 + t * 1.5, Math.sin(a) * 9.5)); }, 14, 8, 'mar', { inside: 0.5 });
  return { C, cap, ell, plate, K };
}
function o6Shield(B, c) {
  const pts = []; for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; pts.push(o6A(c, [1.5, Math.cos(a) * 7, Math.sin(a) * 8])); }
  B.plate(pts, 'boneD', { bevel: 1.8, bulge: 0.7 });
  B.ell(o6A(c, [2.5, 0, 0]), 2, 2, 1.5, 'bone');
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; B.cap([o6A(c, [2, Math.cos(a) * 2, Math.sin(a) * 2]), o6A(c, [2, Math.cos(a) * 6, Math.sin(a) * 7])], 0.5, 0.5, 'bone'); }
}
// the raised dead's weapons, by loadout
function o6SkelWeapon(B, J, load) {
  const { cap, ell, plate } = B, ha = J.armR.ha, hl = J.armL.ha;
  const d = J.pose === 'atk' ? J.d : o6N([0.45, 0.05, 0.9]), w = o6N([d[2], 0.35, -d[0]]), at = (l, e) => o6A(ha, o6A(o6M(d, l), o6M(w, e)));
  if (load === 'bow') { cap([o6A(hl, [0, 0, 12]), o6A(hl, [2.5, 0, 0]), o6A(hl, [0, 0, -12])], 0.8, 0.8, 'lea'); cap([o6A(hl, [-0.5, 0, 12]), o6A(hl, [-0.5, 0, -12])], 0.2, 0.2, 'f1'); return; }
  if (load === 'mage') { cap([at(-12, 0), at(24, 0)], 0.9, 0.8, 'lea'); ell(at(25.5, 0), 2, 2, 2, 'bone'); ell(at(25.5, 0.6), 0.8, 0.8, 0.4, 'glow', { em: 0.9 }); return; }
  if (load === 'halberd') { cap([at(-14, 0), at(30, 0)], 0.85, 0.8, 'lea'); plate([at(24, -0.5), at(24, 5), at(29, 6), at(31, 0.5)], 'iron', { bevel: 1 }); cap([at(29, 0), at(35, 0)], 0.8, 0.2, 'iron'); return; }
  if (load === 'flail') { cap([at(-3, 0), at(10, 0)], 0.9, 0.8, 'lea'); const e = at(10, 0), b = o6A(e, J.pose === 'atk' ? o6M(d, 8) : [1, 0, -7]); cap([e, o6Lp(e, b, 0.5), b], 0.35, 0.35, 'iron'); ell(b, 2.6, 2.6, 2.6, 'bone'); return; }
  const L = load === 'greatsword' ? 30 : 18;
  cap([at(-4, 0), at(3, 0)], 0.9, 0.9, 'lea'); cap([at(3, -3), at(3, 3)], 0.8, 0.8, 'iron');
  plate([at(3.5, -1.6), at(3.5, 1.6), at(L - 3, 1.6), at(L, 0), at(L - 3, -1.6)], 'iron', { bevel: 0.9, bulge: 0.2 });
  if (load === 'shield') o6Shield(B, o6A(hl, [2.5, -1.5, 0]));
}
function o6SkelFrame(load, pose, ph, view) {
  const key = 'o6sk|' + load + '|' + pose + '|' + ph + '|' + view; let fr = MN32.fr[key]; if (fr) return fr;
  const W = 96, H = 90, ox = 48, oy = 84, Sc = O6Sculpt(W, H), rp = pose === 'wind' ? 'atk' : pose, rph = pose === 'wind' ? 0 : pose === 'atk' ? Math.min(3, ph + 1) : ph;
  const J = o6Rig(rp, rph, view);
  if (load === 'shield' || load === 'bow' || load === 'mage') { const [el, ha] = o6IK(J.shL, J.at(56, 9, -9), 15, 14, [-0.4, -0.9, -0.3]); J.armL = { sh: J.shL, el, ha }; }
  if (pose !== 'atk' && pose !== 'wind') { const [el, ha] = o6IK(J.shR, J.at(50, 8, 11), 15, 14, [-0.4, 0.9, -0.3]); J.armR = { sh: J.shR, el, ha }; }
  const B = o6BonePaint(Sc, J, 0.95, ox, oy, { rag: true, glow: pose === 'atk' ? 0.9 : 0.5 });
  o6SkelWeapon(B, J, load);
  fr = o6Build(Sc.render(), W, H, 32, 56, { x: 26, y: 26, w: 12, h: 30 }, 1.5);
  MN32.fr[key] = fr; return fr;
}
{
  drawSkel16 = function (e, flash, sink) {
    const mv = e._px == null ? 0 : Math.hypot(e.x - e._px, e.y - e._py); e._px = e.x; e._py = e.y; e._wd = (e._wd || 0) + mv;
    let pose = 'idle', ph = Math.floor(G.time * 2.2 + ((e.x * 7) % 4 + 4)) % 4;
    if (e.state === 'windup') { pose = 'wind'; ph = 0; }
    else if ((e.swingT || 0) > 0) { pose = 'atk'; ph = e.swingT > 0.14 ? 0 : e.swingT > 0.07 ? 1 : 2; }
    else if (mv > 0.004) { pose = 'walk'; ph = Math.floor(e._wd * 6) % 8; }
    const view = mnView(e, mv), fr = o6SkelFrame(e.load || 'shield', pose, ph, view), p = iso(e.x, e.y), face = e.face || 1;
    if (Math.random() < 0.04) parts.push({ x: e.x + rand(-0.2, 0.2), y: e.y + rand(-0.2, 0.2), z: 1 + Math.random() * 4, vx: rand(-0.2, 0.2), vy: rand(-0.2, 0.2), vz: 3 + Math.random() * 3, t: 0.8 + Math.random() * 0.6, col: Math.random() < 0.5 ? '#8a7a64' : '#5e5046' });
    const r = mnBlit(fr, p.sx, p.sy + (sink || 0), face, flash, e.temp ? 0.85 : 1);
    return { x: Math.round(p.sx - 6), y: r.y, w: 12, h: Math.round(p.sy + 3 - r.y) };
  };
}
// the Ossuary Colossus: a hunched giant of bundled bone, skulls studded on it, phosphor burning in its chest
function o6ColFrame(wpn, pose, ph, view, s) {
  s = Math.round(s * 10) / 10;
  const key = 'o6col|' + wpn + '|' + pose + '|' + ph + '|' + view + '|' + s; let fr = MN32.fr[key]; if (fr) return fr;
  const sc = 1.6 * s, W = Math.ceil(100 * s * 1.5), H = Math.ceil(100 * s * 1.5), ox = Math.round(W / 2), oy = H - 6;
  const rp = pose === 'wind' ? 'atk' : pose, rph = pose === 'wind' ? 0 : pose === 'atk' ? Math.min(3, ph + 1) : ph;
  const J = o6Rig(rp, rph, view, 0.32), Sc = O6Sculpt(W, H);
  const B = o6BonePaint(Sc, J, sc, ox, oy, { big: true, glow: pose === 'atk' || pose === 'wind' ? 1 : 0.6 });
  const { cap, ell, plate } = B, ha = J.armR.ha, d = J.pose === 'atk' ? J.d : o6N([0.3, 0.1, -0.95]), w = o6N([d[2], 0.3, -d[0]]), at = (l, e) => o6A(ha, o6A(o6M(d, l), o6M(w, e)));
  if (wpn === 'scythe') { cap([at(-6, 0), at(26, 0)], 1.1, 1, 'bone'); const pts = []; for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(o6A(at(26, 0), o6A(o6M(w, -t * 18), o6M(d, -t * t * 8)))); } cap(pts, 1.8, 0.3, 'bone'); }
  else if (wpn === 'swords') { for (const hh of [ha, J.armL.ha]) { const a2 = (l, e) => o6A(hh, o6A(o6M(d, l), o6M(w, e))); plate([a2(2, -1.5), a2(2, 1.5), a2(22, 1.2), a2(26, 0), a2(22, -1.2)], 'bone', { bevel: 0.8 }); } }
  else if (wpn === 'flail') { cap([at(-2, 0), at(8, 0)], 1, 1, 'bone'); const b = o6A(at(8, 0), J.pose === 'atk' ? o6M(d, 12) : [2, 0, -12]); cap([at(8, 0), b], 0.5, 0.5, 'bone'); ell(b, 4.5, 4.5, 4.5, 'bone'); ell(o6A(b, [3, 0, 0.5]), 1.2, 1.3, 0.4, 'ink'); }
  else if (wpn === 'ribs') { for (let i = 0; i < 4; i++) { const pts = []; for (let k = 0; k <= 8; k++) { const a = -1.3 + 2.6 * k / 8; pts.push(J.at(66 - i * 5, 10 + Math.cos(a) * 6, Math.sin(a) * 14)); } cap(pts, 1, 0.8, 'bone'); } cap([at(-2, 0), at(12, 0)], 1, 0.8, 'bone'); }
  else { o6Shield(B, o6A(J.armL.ha, [3, -2, 0])); plate([at(2, -1.8), at(2, 1.8), at(20, 1.6), at(24, 0), at(20, -1.6)], 'bone', { bevel: 0.9 }); }
  fr = o6Build(Sc.render(), W, H, Math.round(ox / 1.5), Math.round(oy / 1.5), { x: Math.round(ox / 1.5) - Math.round(18 * s), y: Math.round(oy / 1.5) - Math.round(66 * s), w: Math.round(36 * s), h: Math.round(66 * s) }, 1.5);
  MN32.fr[key] = fr; return fr;
}
// the vertebrae-blade crescent: an arc of vertebrae riding a pale smear, the leading bones hot at the joints
function o6Crescent(cx, cy, R, a0, a1, fade, sq) {
  if (fade <= 0) return;
  sq = sq || 0.5; const n = Math.max(6, Math.round(Math.abs(a1 - a0) * R / 4));
  for (let i = 0; i <= n * 3; i++) {
    const t = i / (n * 3), a = a0 + (a1 - a0) * t, w = 1 + Math.round(t * 3);
    for (let j = 0; j < w; j++) { const rr = R - j; o6Px(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * sq, j === 0 ? `rgba(226,214,182,${0.55 * fade * t})` : `rgba(140,160,140,${0.3 * fade * t})`); }
  }
  ctx.globalAlpha = Math.max(0, Math.min(1, fade * 1.4));
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + (a1 - a0) * t; if (t < 0.35) continue;
    const x = cx + Math.cos(a) * (R - 1), y = cy + Math.sin(a) * (R - 1) * sq, ta = a + (a1 > a0 ? Math.PI / 2 : -Math.PI / 2);
    const s = o6Vert(o6Ang16(Math.cos(ta), Math.sin(ta) * sq), t > 0.85); ctx.drawImage(s.c, Math.round(x - s.ox), Math.round(y - s.oy));
  }
  ctx.globalAlpha = 1;
}
{
  const _dg = drawGiant;
  drawGiant = function (kind, s, o, x, y, face, flash, alpha, k, lift) {
    if (!o || kind !== 'colossus') return _dg(kind, s, o, x, y, face, flash, alpha, k, lift);
    const p = iso(x, y), [pose, ph, view] = mnGiantPose(o, o.atk, 3.6), fr = o6ColFrame(P.cweapon || 'shield', pose, ph, view === 'back' ? 'back' : 'front', (k || 1.5) / 1.5);
    if (Math.random() < 0.15) parts.push({ x: x + rand(-0.4, 0.4), y: y + rand(-0.4, 0.4), z: 20 + Math.random() * 30, vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: rand(-4, 2), t: 0.7, col: Math.random() < 0.3 ? '#b8f4d0' : '#8a7a64' });
    return mnBlit(fr, p.sx, p.sy - (lift || 0), face, flash, alpha == null ? 1 : alpha);
  };
  drawColossusWeapon = function (c, p, k) {
    if (!c.atk) return;
    const kk = c.atk.t / c.atk.dur, f = c.face; if (!(kk > 0.5 && kk < 0.85)) return;
    const s = k / 1.5, t = (kk - 0.5) / 0.35;
    o6Crescent(p.sx + f * 10 * s, p.sy - 40 * s, 30 * s, f > 0 ? -2.2 : Math.PI + 2.2, f > 0 ? -2.2 + 3 * Math.min(1, t * 2.5) : Math.PI + 2.2 - 3 * Math.min(1, t * 2.5), 1 - t, 0.45);
  };
}

// ---- effect drawing, in the world's draw list
{
  const _br = boneRender;
  boneRender = function (list, hoverCands) {
    if (!G.zone) return _br(list, hoverCands);
    const bone = isBone() && !P.dead, s0 = P.shards, RC = G.ribcages, AR = G.barms, BM = G.bmotes, SP = G.bspears, SK = G.bspikes, BA = G.barrows;
    G.ribcages = []; G.barms = []; G.bmotes = []; G.bspears = []; G.bspikes = []; G.barrows = [];
    if (bone) P.shards = 0;
    try { _br(list, hoverCands); } finally { P.shards = s0; G.ribcages = RC; G.barms = AR; G.bmotes = BM; G.bspears = SP; G.bspikes = SK; G.barrows = BA; }
    // bone litter and the gouges of fresh hits
    const dt = Math.min(0.1, Math.max(0, G.time - (G.o6t || G.time))); G.o6t = G.time;
    for (const b of SK) if (b.pile && !b._o6) { b._o6 = 1; o6AddLitter(b.x, b.y, b.big ? 3 : 1); }
    if (G.o6lit) { for (const l of G.o6lit) l.t -= dt; G.o6lit = G.o6lit.filter(l => l.t > 0); for (const l of G.o6lit) list.push({ d: l.x + l.y - 0.6, f: () => { const q = iso(l.x, l.y); o6Blit(o6Litter(l.v), q.sx, q.sy, Math.min(1, l.t / 2)); } }); }
    if (G.o6gouge) { for (const g of G.o6gouge) g.t -= dt; G.o6gouge = G.o6gouge.filter(g => g.t > 0 && !g.m.dead); for (const g of G.o6gouge) list.push({ d: g.m.x + g.m.y + 0.06, f: () => {
      const q = iso(g.m.x, g.m.y), k = g.t / 0.28, x = q.sx + Math.sin(g.s) * 3, y = q.sy - 10 - Math.cos(g.s) * 4;
      for (let i = -2; i <= 2; i++) o6Px(x + i, y + Math.round(i * g.a), i === 0 && k > 0.6 ? '#e6f8dc' : k > 0.5 ? '#d2c09a' : '#1a1220');
      if (k > 0.5) { o6Px(x - 1, y + Math.round(-g.a) - 1, '#241a26'); o6Px(x + 1, y + Math.round(g.a) + 1, '#241a26'); }
    } }); }
    // the shard aura
    if (bone) {
      // v0.59 (user): the aura was too dominant and floated too fast: half as many slivers, a slow drift, a gentle bob
      const n = Math.round(9 * P.shards / Math.max(1, D.shardCap)), R = 0.5 * (P.host ? 1 + 0.04 * Math.min(8, P.host.n) : 1), lift = P.leapZ || 0;
      for (let i = 0; i < n; i++) {
        const a = G.time * 0.55 + i / Math.max(1, n) * Math.PI * 2, x = P.x + Math.cos(a) * R, y = P.y + Math.sin(a) * R, z = 22 + Math.sin(G.time * 1.1 + i * 1.3) * 2 + (i % 3) * 2 + lift;
        list.push({ d: x + y + 0.02, f: () => { const q = iso(x, y); o6Sliver(q.sx, q.sy - z, a + i, 1, P.pulling && (i + Math.floor(G.time * 6)) % 5 === 0); } });
      }
    }
    // rib cages: a glowing crack in a ring, ribs thrust up and arch in, a crumble into litter
    for (const c of RC) {
      const age = c.max - c.t, k = Math.min(1, age / 0.15), fade = Math.min(1, c.t * 2), ribs = c.small ? 5 : 9;
      if (c.t < 0.12 && !c._o6) { c._o6 = 1; o6AddLitter(c.x, c.y, c.small ? 1 : 3); o6Dust(c.x, c.y, 4, 10, false); }
      list.push({ d: c.x + c.y - 0.55, f: () => { for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, rr = c.R * (0.9 + 0.2 * o6H(i, 3)), p = iso(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr); o6Px(p.sx, p.sy, k < 1 && i % 3 === 0 ? '#9fe8c0' : '#1a1218'); } } });
      for (let i = 0; i < ribs; i++) {
        const a = i / ribs * Math.PI * 2, x = c.x + Math.cos(a) * c.R, y = c.y + Math.sin(a) * c.R;
        list.push({ d: x + y, f: () => {
          const q = iso(x, y), top = iso(c.x + Math.cos(a) * c.R * 0.35, c.y + Math.sin(a) * c.R * 0.35), h = (c.small ? 12 : 22) * k * (fade < 1 ? 0.6 + 0.4 * fade : 1);
          o6Blit(o6Rib(top.sx - q.sx, top.sy - q.sy, h, c.small), q.sx, q.sy, fade);
        } });
      }
    }
    // bone arms: a glowing crack while they gather, then they claw up out of it
    for (const a of AR) list.push({ d: a.x + a.y, f: () => {
      const q = iso(a.x, a.y), sx = Math.round(q.sx), sy = Math.round(q.sy);
      if (a.delay > 0) { for (let i = -3; i <= 3; i++) o6Px(sx + i, sy + (i & 1), Math.abs(i) < 2 ? '#9fe8c0' : '#1a1218'); return; }
      const k = a.rise > 0 ? 1 - a.rise / 0.2 : Math.min(1, a.life / 0.4);
      for (let i = -4; i <= 4; i++) o6Px(sx + i, sy + 1 + (i & 1 ? 0 : -1), i % 3 ? '#1a1218' : '#3a2e2a');
      if (k <= 0) return;
      const sway = Math.max(-1, Math.min(1, Math.round(Math.sin(G.time * 3 + a.seed) * 0.8 + a.lean * 1.2 + (a.grab ? Math.sin(G.time * 18) : 0)))), fr = o6Arm(!!a.grab, sway), h = Math.round(fr.h * k);
      ctx.save(); ctx.beginPath(); ctx.rect(sx - 12, sy + 1 - 30, 24, 30); ctx.clip(); o6Blit(fr, sx, sy + (fr.h - h) * 0.9, 1); ctx.restore();
    } });
    // shard motes: slivers rising out of the ground, flying straight to the aura
    for (const b of BM) list.push({ d: b.x + b.y + 0.03, f: () => { const q = iso(b.x, b.y); if (!b.vis && b.rise > 0) { o6Px(q.sx - 1, q.sy, '#1a1218', 3, 1); o6Px(q.sx, q.sy, '#9fe8c0'); } o6Sliver(q.sx, q.sy - b.z, Math.atan2((b.vy || 0), (b.vx || 1)), 1, false); } });
    // bone spears and splinters: straight, a short smear behind, a phosphor pip at the joint
    for (const s of SP.concat(BA)) list.push({ d: s.x + s.y + 0.05, f: () => {
      const q = iso(s.x, s.y), d = o6Dir(s.vx, s.vy), small = s.small || BA.includes(s), sy = q.sy - 12;
      o6Px(q.sx - d[0] * 4 - 1, q.sy, 'rgba(0,0,0,0.3)', 3, 1);
      for (let i = 1; i <= (small ? 4 : 9); i++) o6Px(q.sx - d[0] * (i + (small ? 3 : 7)), sy - d[1] * (i + (small ? 3 : 7)), `rgba(214,200,170,${0.35 * (1 - i / 10)})`);
      o6Blit(o6Spear(small, o6Ang16(d[0], d[1])), q.sx, sy);
    } });
    // spikes tearing up out of the ground
    for (const s of SK) if (!s.pile) {
      const k = 1 - s.t / 0.5, grow = Math.min(1, k * 5), gb = Math.max(1, Math.min(3, Math.ceil(grow * 3))), lb = Math.max(0, Math.min(3, Math.round((s.len || 1) * 1.2)));
      list.push({ d: s.x + s.y + 0.3, f: () => {
        const q = iso(s.x, s.y); if (grow < 0.2) { o6Px(q.sx - 1, q.sy, '#9fe8c0', 2, 1); return; }
        o6Blit(o6Spike(((Math.round(s.a / (Math.PI / 8)) % 16) + 16) % 16, lb, gb), q.sx, q.sy, Math.min(1, s.t * 4));
      } });
    }
  };
}
{
  const _r14 = render14;
  render14 = function (list) {
    if (!G.zone) return _r14(list);
    const BN = G.banners, BR = G.brains, GS = G.gspirits, LF = G.lashFx, SF = G.siphFx, BAR = P.barmor, MS = [];
    G.banners = []; G.brains = []; G.gspirits = []; G.lashFx = []; G.siphFx = []; if (isBone()) P.barmor = 0;
    for (const m of G.zone.monsters) if (m.ossT > 0 || m.crushT > 0) { MS.push([m, m.ossT, m.crushT]); m.ossT = 0; m.crushT = 0; }
    try { _r14(list); } finally { G.banners = BN; G.brains = BR; G.gspirits = GS; G.lashFx = LF; G.siphFx = SF; P.barmor = BAR; for (const [m, o, c] of MS) { m.ossT = o; m.crushT = c; } }
    // Grave Banner: the pole, the torn banner, a ring of bone dust on the ground
    for (const b of BN) {
      list.push({ d: b.x + b.y - 0.5, f: () => { for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2 + G.time * 0.2, p = iso(b.x + Math.cos(a) * b.R, b.y + Math.sin(a) * b.R); o6Px(p.sx, p.sy, i % 5 === 0 ? 'rgba(160,232,192,0.5)' : 'rgba(150,130,104,0.35)'); } } });
      list.push({ d: b.x + b.y, f: () => { const q = iso(b.x, b.y); o6Blit(o6Banner(Math.floor(G.time * 5) % 4), q.sx, q.sy); } });
    }
    // Bone Rain: splinters falling straight, a smear above each, dust where they strike
    for (const b of BR) {
      list.push({ d: b.x + b.y - 0.5, f: () => { if (b.t <= 0) return; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, p = iso(b.x + Math.cos(a) * b.R, b.y + Math.sin(a) * b.R); o6Px(p.sx, p.sy, 'rgba(26,18,24,0.5)'); } } });
      for (const s of b.drops) list.push({ d: s.x + s.y + 0.1, f: () => {
        const q = iso(s.x, s.y), y = q.sy - s.z;
        o6Px(q.sx - 1, q.sy, 'rgba(0,0,0,0.35)', 3, 1);
        for (let i = 1; i <= 8; i++) o6Px(q.sx, y - 6 - i, `rgba(214,200,170,${0.4 * (1 - i / 9)})`);
        o6Blit(o6Spear(true, 4), q.sx, y);
        if (s.z < 3 && !s._o6) { s._o6 = 1; o6Dust(s.x, s.y, 1, 2, false); }
      } });
    }
    // Grave Spirit: a howling skull, a tail of phosphor and bone grit
    for (const s of GS) list.push({ d: s.x + s.y + 0.2, f: () => {
      const q = iso(s.x, s.y), sy = q.sy - 12 + Math.sin(s.ph) * 2, d = o6Dir(s.vx || 1, s.vy || 0);
      for (let i = 1; i <= 10; i++) { const x = q.sx - d[0] * i * 1.6 + Math.sin(i + G.time * 20) * 0.8, y = sy - d[1] * i * 1.6; o6Px(x, y, i < 4 ? `rgba(200,248,220,${0.8 - i * 0.1})` : `rgba(140,150,130,${0.5 - i * 0.04})`); }
      ctx.globalCompositeOperation = 'lighter'; glow(q.sx, sy, 10, '150,230,180', 0.28); ctx.globalCompositeOperation = 'source-over';
      o6Blit(o6Skull(Math.floor(G.time * 12) % 4, d[0] < 0 ? -1 : 1, false), q.sx, sy);
    } });
    // Spine Lash: a whip of vertebrae cracked in a straight line (or swept in an arc)
    for (const f of LF) list.push({ d: P.x + P.y + 0.3, f: () => {
      const k = Math.min(1, f.t / f.dur), fade = 1 - Math.max(0, (f.t - f.dur) / 0.1), a0 = Math.atan2(f.dy, f.dx), q0 = iso(P.x, P.y), lift = P.leapZ || 0;
      if (f.arc) { const d0 = o6Dir(Math.cos(a0 - 0.9), Math.sin(a0 - 0.9)), d1 = o6Dir(Math.cos(a0 - 0.9 + 1.8 * k), Math.sin(a0 - 0.9 + 1.8 * k)); o6Crescent(q0.sx, q0.sy - 12 - lift, 64, Math.atan2(d0[1] * 2, d0[0]), Math.atan2(d1[1] * 2, d1[0]), fade, 0.5); return; }
      const n = Math.round(14 * k), d = o6Dir(f.dx, f.dy), L = f.L * 20;
      ctx.globalAlpha = Math.max(0, fade);
      for (let i = 0; i <= n; i++) { const t = i / 14, wob = Math.sin(t * 12 + G.time * 30) * (1 - t) * 1.5, x = q0.sx + d[0] * L * t - d[1] * wob, y = q0.sy - 12 - lift + d[1] * L * t + d[0] * wob + t * 4; const s = o6Vert(o6Ang16(-d[1], d[0]), i >= n - 1); ctx.drawImage(s.c, Math.round(x - s.ox), Math.round(y - s.oy)); }
      ctx.globalAlpha = 1;
    } });
    // Marrow Siphon: threads of marrow drawn out of the cone to the knight's hand
    for (const f of SF) list.push({ d: P.x + P.y + 0.3, f: () => {
      const a0 = Math.atan2(f.dy, f.dx), k = f.t / 0.3;
      for (let i = 0; i < 26; i++) { const a = a0 - 0.75 + 1.5 * o6H(i, 5), r = f.R * ((o6H(i, 9) + (1 - k) * 1.5) % 1), p = iso(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r); o6Px(p.sx, p.sy - 8 + r * 2, i % 4 === 0 ? `rgba(180,244,208,${k})` : `rgba(200,178,140,${0.8 * k})`); }
    } });
    // Bone Armor: plates of shoulder blade circling the knight
    if (isBone() && BAR > 0 && !P.dead) list.push({ d: P.x + P.y + 0.08, f: () => { const q = iso(P.x, P.y), n = Math.max(1, Math.ceil(6 * BAR / Math.max(1, P.barmorMax))); for (let i = 0; i < n; i++) { const a = i / 6 * 6.28 + G.time * 0.8, x = q.sx + Math.cos(a) * 12, y = q.sy - 20 + Math.sin(a) * 6 - (P.leapZ || 0); if (Math.sin(a) < -0.2) continue; o6Blit(o6Plate(Math.floor(a * 2 / Math.PI + 8) % 4), x, y); } } });
    // ossified (calcified crust on them) and crushed (a crack with phosphor in it)
    for (const [m, os, cr] of MS) {
      if (m.dead) continue;
      if (os > 0) list.push({ d: m.x + m.y + 0.04, f: () => { const q = iso(m.x, m.y); for (let i = 0; i < 7; i++) { const x = q.sx - 5 + o6H(i, Math.floor(m.x * 9)) * 10, y = q.sy - 3 - o6H(i + 3, 5) * 16; o6Px(x, y, '#cbb892'); o6Px(x + 1, y, '#8a7458'); o6Px(x, y + 1, '#43363a'); } } });
      if (cr > 0) list.push({ d: m.x + m.y + 0.04, f: () => { const q = iso(m.x, m.y); [[-3, -20], [0, -17], [-1, -14], [2, -12], [1, -9]].forEach(([x, y], i) => { o6Px(q.sx + x, q.sy + y, '#1a1220'); if (i % 2) o6Px(q.sx + x + 1, q.sy + y, '#9fe8c0'); }); } });
    }
    // Scythe Sweep: a full crescent of vertebrae round the knight
    if (isBone() && P.sweepFx > 0 && !P.dead) list.push({ d: P.x + P.y + 0.3, f: () => {
      const q = iso(P.x, P.y), k = 1 - P.sweepFx / 0.3, R = (1.6 + (P.host ? 0.1 * P.host.n : 0)) * (P.skills.sweepwide > 0 ? 1.5 : 1) * 18, f = P.face < 0 ? -1 : 1, a0 = -Math.PI * 0.5 + (f < 0 ? Math.PI : 0);
      o6Crescent(q.sx, q.sy - 8 - (P.leapZ || 0), R, a0, a0 + f * Math.PI * 2 * Math.min(1, k * 1.6), 1 - Math.max(0, k - 0.6) / 0.4, 0.5);
    } });
  };
}
window.__o6 = { skel: (...a) => o6SkelFrame(...a), col: (...a) => o6ColFrame(...a) };
