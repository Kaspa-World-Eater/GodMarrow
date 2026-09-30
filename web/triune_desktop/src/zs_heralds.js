
(function () {  // v0.38: the god-Heralds and the Act I boss, SCULPTED (tag: zh / ZH)
// =================================================================== v0.38: the god-Heralds and the Carrion Warden, sculpted
// Each creature is built as 3D forms (tubes, ellipsoids, bevelled plates and cloth/flesh surfaces with real folds)
// in a depth buffer, lit per pixel by a warm key from the upper left, a cool rim, bounce light from below,
// screen-space cast shadows and contact occlusion, then quantized into hand-picked hue-shifted ramps (cool violet
// shadows, warm ochre lights) with a coloured outline broken where the light hits. Painted directly as the `_hr`
// twin at 1.5x the world grain (each creature pixel = 2 screen pixels at ZK 0.75); the world-grain canvases are the
// same image scaled down, so drawMon16, flashes, tints, corpses and the class agents' hit filters all keep working.
// The back view is the same sculpt seen from behind (depth mirrored), so every form stays whole from both sides.
// Everything here is self-contained (no shared kit); the painters of the older v0.23 creatures are gone.
const ZH_K = 1.5;
const zhH = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const zhVN = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), h = (a, b) => zhH(a * 7 + s * 131, b * 13 + s * 17); return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
const zhHex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const zhA = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], zhS = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], zhM = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const zhL = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const zhLen = a => Math.hypot(a[0], a[1], a[2]), zhN = a => zhM(a, 1 / (zhLen(a) || 1));
const TAU = Math.PI * 2;

// ------------------------------------------------------------------- materials: hue-shifted ramps, dark to light
// tex: grain amount; ts: grain scale; aniso: grain stretch (strands); crack: dark crack lines; spec: tight speculars;
// wrap: soft light (cloth, flesh); emis: glows (bleed = the colour it spills on its neighbours); vd: the void
const ZHM = [], ZHMI = {};
function zhMat(name, hexes, o) { ZHMI[name] = ZHM.length; ZHM.push(Object.assign({ name, ramp: hexes.map(zhHex), tex: 0.05, crack: 0, spec: 0, wrap: 0, emis: false, ts: 0.45, aniso: 1, gain: 1, wet: 0 }, o || {})); }
zhMat('ink', ['#07050a', '#0b0810', '#100b14'], { tex: 0 });
zhMat('bone', ['#140e1a', '#261d2c', '#3f323a', '#5d4c44', '#7e6a54', '#a08a68', '#c2ad84', '#e0d2a6'], { tex: 0.12, crack: 0.026, ts: 0.5 });
zhMat('boneD', ['#110c16', '#1f1824', '#342a31', '#4e4039', '#6a5847', '#88735a', '#a48e6e'], { tex: 0.1, crack: 0.024 });
zhMat('boneY', ['#100e0a', '#221f14', '#3a331c', '#574b26', '#786630', '#9c843c', '#bea452', '#e0cc7a'], { tex: 0.1, crack: 0.016, ts: 0.45 });   // the Gravelord's yellowed bone
zhMat('cope', ['#050407', '#0a080d', '#110d15', '#19141d', '#241c25', '#30262c', '#3e3332', '#524439'], { wrap: 0.25, tex: 0.24, ts: 0.55, aniso: 0.1 });
zhMat('copeIn', ['#050307', '#09060c', '#0f0a12', '#171018', '#20161f'], { wrap: 0.2, tex: 0.1 });
zhMat('gold', ['#1a0c08', '#3a1e0c', '#633812', '#8e5a1a', '#b88428', '#dcb044', '#f6e090'], { spec: 0.02, tex: 0.12, ts: 0.9, gain: 1.05 });
zhMat('goldD', ['#140906', '#2a150a', '#4a2a10', '#6c4416', '#8e5e1e', '#ad7c2c'], { spec: 0.012, tex: 0.12, ts: 0.9 });
zhMat('alb', ['#0f0d0c', '#1e1b17', '#312b21', '#48402c', '#625638', '#7e6f48', '#9a8a5c', '#b6a676'], { wrap: 0.35, tex: 0.1, ts: 0.4, aniso: 0.2 });
zhMat('rust', ['#0e0605', '#22100a', '#3c1c10', '#5a2c16', '#7c421e', '#9c5c2a', '#bc7c3e'], { tex: 0.24, ts: 0.9, crack: 0.02, spec: 0.006 });
zhMat('iron', ['#0a0910', '#13131c', '#1e1d27', '#2d2b34', '#403c41', '#5a524f', '#86786a', '#c8b89a'], { spec: 0.02, tex: 0.1, gain: 0.85 });
zhMat('meat', ['#0c090e', '#171219', '#241d24', '#342a30', '#483c3e', '#5e504a', '#7a6a58', '#9c8c70'], { wrap: 0.25, tex: 0.22, ts: 0.13, wet: 0.012, crack: 0.012 });   // the Warden's grey dead meat
zhMat('meatB', ['#0c0a10', '#18141e', '#261e2a', '#342a36', '#44383e', '#554a48', '#6a5e52', '#80735e'], { wrap: 0.3, tex: 0.1, ts: 0.4, wet: 0.015 });   // bruised, rotting
zhMat('apron', ['#070404', '#120a08', '#1e110c', '#2c1a12', '#3c2618', '#503422', '#66442c'], { wrap: 0.2, tex: 0.16, ts: 0.6, spec: 0.004 });
zhMat('blood', ['#0e0208', '#1e040c', '#320812', '#4a0e16', '#641a1c', '#842a24'], { wet: 0.05, tex: 0.12, ts: 0.5 });
zhMat('rag', ['#0b0908', '#171310', '#241e18', '#342b20', '#463a2a', '#5a4b34', '#6e5c40'], { wrap: 0.3, tex: 0.22, ts: 0.6, aniso: 0.15 });
zhMat('crow', ['#040407', '#08090e', '#0e111a', '#161b28', '#212a3a', '#34405a', '#50608a'], { tex: 0.2, ts: 1.2, aniso: 0.3, spec: 0.01 });
zhMat('flesh', ['#120810', '#22101a', '#381a24', '#50282e', '#6a3a3a', '#845046', '#9e6a58', '#ba8a70'], { wrap: 0.3, tex: 0.16, ts: 0.15, wet: 0.018 });
zhMat('fleshP', ['#140c14', '#26182200', '#3e2a34', '#584040', '#72584e', '#8e7462', '#aa927a', '#c8b098'].map(h => h.slice(0, 7)), { wrap: 0.35, tex: 0.1, ts: 0.5, wet: 0.014 });   // the drowned, fused others
zhMat('fleshD', ['#0e060c', '#1a0c14', '#2a141c', '#3c2024', '#502e2e', '#664038'], { wrap: 0.3, tex: 0.1, ts: 0.6, wet: 0.01 });
zhMat('belly', ['#1a0c14', '#2e1820', '#48262c', '#623836', '#7e4e44', '#986656', '#b4826a', '#d0a488'], { wrap: 0.3, tex: 0.04, ts: 0.25, wet: 0.03 });
zhMat('lip', ['#12020a', '#2a0612', '#480c1c', '#6a1628', '#8e2432', '#b23c40'], { wrap: 0.2, wet: 0.05 });
zhMat('porc', ['#1a1418', '#34282c', '#56484a', '#7e706c', '#a89a90', '#cec2b4', '#ece4d6', '#fffaf0'], { spec: 0.02, tex: 0.03, crack: 0.012 });
zhMat('bronze', ['#0e0806', '#22140a', '#3e2612', '#5e3c1a', '#7e5424', '#9e6e32', '#c09048'], { spec: 0.015, tex: 0.14, ts: 0.9 });
zhMat('gauze', ['#0a0e16', '#141c28', '#202c3c', '#2e3e50', '#405466', '#566c7e', '#728a98', '#94aab4'], { wrap: 0.45, tex: 0.12, ts: 0.5, aniso: 0.15 });
zhMat('gauzeP', ['#0e0e14', '#1a1a20', '#2a2a2c', '#3e3c3a', '#565248', '#716a5a', '#8e866e', '#aca286'], { wrap: 0.45, tex: 0.16, ts: 0.5, aniso: 0.15 });
zhMat('ghost', ['#0c1018', '#161e2a', '#24303e', '#344454', '#4a5c6c', '#647888', '#8298a4', '#a8bcc4'], { wrap: 0.5, tex: 0.04 });   // the faces in the wind, grey-blue skin
zhMat('void', ['#040306', '#070509', '#0a070d', '#0e0a12', '#1c1428', '#3c2c5a', '#7a64b0', '#d8ccff'], { vd: 1 });
zhMat('voidD', ['#030204', '#050407', '#08060a', '#0b080e', '#150f1e', '#2c2044', '#5a4888', '#b0a0e8'], { vd: 1 });
zhMat('gEye', ['#5a3a10', '#a8741e', '#f0c040', '#ffe890', '#fffbe0'], { emis: true, bleed: [240, 190, 80] });   // marrow-light
zhMat('gEmb', ['#4a0e08', '#9a2a0c', '#e0621a', '#ffb040', '#fff0c0'], { emis: true, bleed: [230, 110, 40] });   // coals
zhMat('gBile', ['#2a300a', '#58661a', '#a2b42e', '#dcea6a', '#f8ffc0'], { emis: true, bleed: [170, 190, 60] });
zhMat('gBreath', ['#304860', '#5c8098', '#9cc4d8', '#d8f0fa', '#ffffff'], { emis: true, bleed: [150, 200, 230] });
zhMat('gVoid', ['#3a2a60', '#6a54a8', '#a894e4', '#e0d6ff', '#ffffff'], { emis: true, bleed: [140, 110, 210] });
zhMat('gBlood', ['#3a0408', '#7a0c10', '#c0201a', '#ff5a3a', '#ffc0a0'], { emis: true, bleed: [200, 40, 30] });

// ------------------------------------------------------------------- the sculpt: forms into a depth buffer, lit per pixel
function ZHSculpt(W, H) {
  const N = W * H, Z = new Float32Array(N).fill(-1e9), NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N);
  const M = new Int16Array(N).fill(-1), TU = new Float32Array(N), TV = new Float32Array(N), ID = new Int16Array(N).fill(-1), DK = new Float32Array(N), EM = new Float32Array(N);
  let nid = 0;
  const put = (x, y, z, nx, ny, nz, m, tu, tv, id, dk, em) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (z <= Z[i]) return; Z[i] = z; NX[i] = nx; NY[i] = ny; NZ[i] = nz; M[i] = m; TU[i] = tu; TV[i] = tv; ID[i] = id; DK[i] = dk || 0; EM[i] = em || 0; };
  const mi = m => { const v = ZHMI[m]; if (v == null) throw new Error('zh mat ' + m); return v; };
  const tri = (a, b, c, n, m, id, dk, ta, tb, tc, em) => {
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0]))), y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(d) < 1e-6) return;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5, l1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / d, l2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / d, l3 = 1 - l1 - l2;
      if (l1 < -0.02 || l2 < -0.02 || l3 < -0.02) continue;
      put(x, y, l1 * a[2] + l2 * b[2] + l3 * c[2], n[0], n[1], n[2], m, l1 * ta[0] + l2 * tb[0] + l3 * tc[0], l1 * ta[1] + l2 * tb[1] + l3 * tc[1], id, dk, em);
    }
  };
  const S = {
    W, H, Z, M, ID,
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
    // a flat plate with bevelled edges and a little dome
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
        put(x, y, z, mx / ll, my / ll, mz / ll, m, (px - pts[0][0]), py - pts[0][1], id, o.dk, o.em);
      }
      return id;
    },
    // a cloth, flesh or shell surface: fn(s, t) -> camera point or null (a tear); the grid is filled as small
    // triangles with smooth texture coordinates. o.mat(s, t) may pick a material per cell; o.dkf(s, t) darkens.
    surf(fn, ns, nt, mn, o) {
      o = o || {}; const m0 = mi(mn), id = nid++, G = [];
      for (let i = 0; i <= ns; i++) { const row = []; for (let j = 0; j <= nt; j++) row.push(fn(i / ns, j / nt)); G.push(row); }
      const su = o.su || 40, sv = o.sv || 20;
      for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) {
        const a = G[i][j], b = G[i + 1][j], c = G[i + 1][j + 1], d = G[i][j + 1]; if (!a || !b || !c || !d) continue;
        const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2], vx = d[0] - b[0], vy = d[1] - b[1], vz = d[2] - b[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        let dk = o.dk || 0; if (o.dkf) dk += o.dkf(i / ns, j / nt); if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; dk += o.inside == null ? 0.35 : o.inside; }
        const m = o.mat ? mi(o.mat(i / ns, j / nt) || mn) : m0;
        const ta = [i / ns * su, j / nt * sv], tb = [(i + 1) / ns * su, j / nt * sv], tc = [(i + 1) / ns * su, (j + 1) / nt * sv], td = [i / ns * su, (j + 1) / nt * sv];
        tri(a, b, c, [nx, ny, nz], m, id, dk, ta, tb, tc, o.em); tri(a, c, d, [nx, ny, nz], m, id, dk, ta, tc, td, o.em);
      }
      return id;
    },
    // light, shade, quantize, outline
    render(o) {
      o = o || {};
      const c = mkCanvas(W, H), cx = c.getContext('2d'), img = cx.createImageData(W, H), D = img.data, IX = new Int8Array(N).fill(-1);
      const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
      const L = nrm([-0.68, -0.6, 0.42]), LR = nrm([0.85, -0.3, -0.42]), BN = nrm([0.35, 0.85, 0.25]), HV = nrm([L[0], L[1], L[2] + 1]);
      const lxy = Math.hypot(L[0], L[1]), sdx = L[0] / lxy, sdy = L[1] / lxy, sdz = L[2] / lxy;
      const OCC = [1, 0, -1, 0, 0, 1, 0, -1, 2, 0, -2, 0, 0, 2, 0, -2, 1, 1, -1, 1, 3, 0, -3, 0, 0, 3], EMS = ZHM.map(m => !!m.emis);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, mm = M[i]; if (mm < 0) continue;
        const mat = ZHM[mm], R = mat.ramp, nr = R.length;
        if (mat.emis) { IX[i] = Math.min(nr - 1, Math.max(0, Math.round((EM[i] || 0.5) * (nr - 1) + (NZ[i] - 0.7) * 1.5))); continue; }
        const nx = NX[i], ny = NY[i], nz = NZ[i];
        if (mat.vd) {   // the void: flat dark matter, lit only by a thin rim where the world curls round it
          const rim = Math.max(0, 1 - nz * 1.25), rl = rim * (0.55 + 0.45 * Math.max(0, -nx * 0.7 - ny * 0.7)) + (EM[i] || 0) * rim;
          let k = rl > 0.82 ? 7 : rl > 0.7 ? 6 : rl > 0.58 ? 5 : rl > 0.45 ? 4 : zhVN(TU[i] * 0.3, TV[i] * 0.3, mm) > 0.62 ? 2 : 1;
          if (k >= 5 && zhH(x * 3 + 1, y * 5 + 2) < 0.3) k -= 2;
          IX[i] = Math.min(nr - 1, k); continue;
        }
        let key = nx * L[0] + ny * L[1] + nz * L[2]; if (mat.wrap) key = (key + mat.wrap) / (1 + mat.wrap);
        const lam = Math.max(0, key);
        let sh = 1;
        if (lam > 0.02) for (let k = 2; k <= 22; k += (k < 6 ? 1 : 2)) { const xx = Math.round(x + sdx * k), yy = Math.round(y + sdy * k); if (xx < 0 || yy < 0 || xx >= W || yy >= H) break; const j = yy * W + xx; if (Z[j] > Z[i] + sdz * k + 2 && !EMS[M[j]]) { sh = 0.28; break; } }
        let occ = 0; const zi = Z[i] + 2; for (let q = 0; q < OCC.length; q += 2) { const xx = x + OCC[q], yy = y + OCC[q + 1]; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (Z[j] > zi) occ++; }
        const rim = Math.pow(Math.max(0, nx * LR[0] + ny * LR[1] + nz * LR[2]), 1.4) * (1.1 - nz);
        const bo = Math.max(0, nx * BN[0] + ny * BN[1] + nz * BN[2]);
        let I = (0.07 + 0.95 * lam * sh) * (1 - occ * 0.06) + bo * 0.12 * (1 - lam) + rim * 0.55 - DK[i] * 0.3 + (EM[i] || 0) * 0.5;
        I *= mat.gain;
        if (mat.tex) I += (zhVN(TU[i] * mat.ts, TV[i] * mat.ts * mat.aniso, mm + ID[i] * 3) - 0.5) * mat.tex * 2;
        let k = Math.round(Math.pow(Math.max(0, I), 1.45) * (nr - 0.9) - 0.05);
        if (mat.crack) { const cr = zhVN(TU[i] * 0.34 + ID[i] * 5.3, TV[i] * 0.34, 91); if (Math.abs(cr - 0.5) < mat.crack) k -= 2; else if (Math.abs(cr - 0.5) < mat.crack * 2 && lam > 0.4) k += 1; }
        if ((mat.spec || mat.wet) && sh > 0.5) { const sp = mat.spec || mat.wet, hs = nx * HV[0] + ny * HV[1] + nz * HV[2]; if (hs > 1 - sp && (mat.spec || zhH(x, y * 3) < 0.7)) k = nr - 1; else if (hs > 1 - sp * 2.5) k = Math.max(k, nr - 2); }
        IX[i] = k < 0 ? 0 : k >= nr ? nr - 1 : k;
      }
      // a pixel just behind a nearer form is in its contact shadow
      const N3 = [-1, 0, 0, -1, 1, 0], N4 = [1, 0, 0, 1, -1, 0, 0, -1], N8 = [1, 0, -1, 0, 0, 1, 0, -1, 2, 0, -2, 0, 0, -2, 0, 2];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (M[i] < 0 || ZHM[M[i]].emis || ZHM[M[i]].vd) continue;
        for (let q = 0; q < 6; q += 2) { const xx = x + N3[q], yy = y + N3[q + 1]; if (xx < 0 || yy < 0 || xx >= W) continue; const j = yy * W + xx; if (M[j] >= 0 && Z[j] > Z[i] + 3 && ID[j] !== ID[i]) { IX[i] = Math.max(0, IX[i] - 1); break; } }
      }
      // clean: a lone pixel whose four neighbours all agree on another tone of the same material takes that tone
      const IX2 = new Int8Array(IX);
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x; if (M[i] < 0) continue; const a = i - 1, b = i + 1, u = i - W, d = i + W;
        if (M[a] === M[i] && M[b] === M[i] && M[u] === M[i] && M[d] === M[i] && IX[a] === IX[b] && IX[b] === IX[u] && IX[u] === IX[d] && IX[a] !== IX[i] && Math.abs(IX[a] - IX[i]) === 1) IX2[i] = IX[a];
      }
      for (let i = 0; i < N; i++) if (M[i] >= 0) { const col = ZHM[M[i]].ramp[IX2[i]], q = i * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255; }
      // glows bleed a little into what is round them
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (M[i] < 0 || !ZHM[M[i]].emis) continue; const bl = ZHM[M[i]].bleed || [200, 200, 200], k0 = IX2[i] >= 2 ? 0.4 : 0.22;
        for (let e = 0; e < 16; e += 2) { const dx = N8[e], dy = N8[e + 1], xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (M[j] < 0 || ZHM[M[j]].emis) continue; const q = j * 4, k = Math.abs(dx) + Math.abs(dy) > 1 ? k0 * 0.45 : k0; D[q] = D[q] * (1 - k) + bl[0] * k; D[q + 1] = D[q + 1] * (1 - k) + bl[1] * k; D[q + 2] = D[q + 2] * (1 - k) + bl[2] * k; }
      }
      // the outline: the darkest tone of what it borders, broken where the light hits the upper-left edge
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (M[i] >= 0) continue;
        let best = -1, lit = false;
        for (let q = 0; q < 8; q += 2) { const dx = N4[q], dy = N4[q + 1], xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (M[j] < 0) continue; if (best < 0 || ZHM[M[j]].emis) best = j; if ((dx > 0 || dy > 0) && IX2[j] >= ZHM[M[j]].ramp.length - 2) lit = true; }
        if (best < 0) continue;
        const mb = ZHM[M[best]]; if (mb.emis) continue;
        const R = mb.ramp, col = lit ? R[Math.min(2, R.length - 1)] : R[0], q = i * 4;
        if (lit && zhH(x, y) < 0.5) continue;
        D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255;
      }
      cx.putImageData(img, 0, 0); S.IX = IX2; return c;
    }
  };
  return S;
}
// two-bone reach in 3D: the middle joint bent toward `hint`
function zhIK(a, b, L1, L2, hint) {
  const d = zhS(b, a), D0 = zhLen(d) || 1e-6, dir = zhM(d, 1 / D0), D = Math.min(D0, L1 + L2 - 0.05);
  const x = (L1 * L1 - L2 * L2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, L1 * L1 - x * x));
  const dh = hint[0] * dir[0] + hint[1] * dir[1] + hint[2] * dir[2], pp = zhN(zhS(hint, zhM(dir, dh)));
  return zhA(a, zhA(zhM(dir, x), zhM(pp, h)));
}
// the painter's view of the sculpt in creature units: x forward (right), y up from the feet, z toward the viewer.
// The back view mirrors depth, so the far side of every form comes forward.
function zhView(S, OX, OY, back) {
  const K = ZH_K, C = p => [(OX + p[0]) * K, (OY - p[1]) * K, (back ? -p[2] : p[2]) * K];
  const V = {
    S, C, K, back,
    cap: (pts, r0, r1, m, o) => S.cap(pts.map(C), r0 * K, r1 * K, m, o),
    ell: (p, rx, ry, rz, m, o) => S.ell(C(p), rx * K, ry * K, rz * K, m, o),
    plate: (pts, m, o) => S.plate(pts.map(C), m, o),
    surf: (fn, ns, nt, m, o) => S.surf((s, t) => { const p = fn(s, t); return p && C(p); }, ns, nt, m, o),
    // a body of revolution through rings [y, rx, rzFront, rzBack, cx, cz]: fn-free torso/robe/cope builder.
    // o.a0/o.a1 limit the angle (an open front); o.fold(a, t) adds to the radius; o.hem(a) lowers the last ring.
    rings(R, m, o) {
      o = o || {}; const a0 = o.a0 || 0, a1 = o.a1 == null ? TAU : o.a1, nR = R.length;
      const at = (a, t) => {
        const f = t * (nR - 1), i = Math.min(nR - 2, Math.floor(f)), u = f - i, A = R[i], B = R[i + 1], lp = (k) => A[k] + (B[k] - A[k]) * u;
        let y = lp(0); const s = Math.sin(a), c = Math.cos(a), fo = o.fold ? o.fold(a, t) : 0;
        if (o.hem && t > 0.999) y -= o.hem(a);
        return [lp(4) + c * (lp(1) + fo), y, lp(5) + s * ((s > 0 ? lp(2) : lp(3)) + fo)];
      };
      return V.surf((s, t) => { const a = a0 + (a1 - a0) * s; return o.tear && o.tear(a, t) ? null : at(a, t); }, o.ns || 90, o.nt || (nR - 1) * 8, m, o);
    }
    ,
    // a cloth tube along a polyline (a sleeve, a limb in rags): radius rf(s), with folds o.fold(s, a)
    tube(pts, rf, m, o) {
      o = o || {}; const n = pts.length, segL = [], tot = [0];
      for (let i = 0; i < n - 1; i++) { segL.push(zhLen(zhS(pts[i + 1], pts[i]))); tot.push(tot[i] + segL[i]); }
      const T = tot[n - 1] || 1;
      const at = s => { const d = s * T; let i = 0; while (i < n - 2 && tot[i + 1] < d) i++; const u = (d - tot[i]) / (segL[i] || 1); return [zhL(pts[i], pts[i + 1], Math.max(0, Math.min(1, u))), zhN(zhS(pts[i + 1], pts[i]))]; };
      return V.surf((s, t) => {
        const [p, dv] = at(s), a = t * TAU; let e1 = zhN([-dv[1], dv[0], 0]); if (zhLen(e1) < 0.1) e1 = [1, 0, 0]; const e2 = [0, 0, 1];
        const r = rf(s) + (o.fold ? o.fold(s, a) : 0); if (o.tear && o.tear(s, a)) return null;
        return zhA(p, zhA(zhM(e1, Math.cos(a) * r), zhM(e2, Math.sin(a) * r)));
      }, o.ns || 24, o.nt || 24, m, o);
    }
  };
  return V;
}
// a flipped copy, a flat-colour copy
const zhFlip = src => { const f = mkCanvas(src.width, src.height), x = f.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return f; };
const zhFill = (src, col) => { const q = mkCanvas(src.width, src.height), x = q.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, q.width, q.height); return q; };
// a champion's / the Matron's tint over the finished pixels: hue pulled toward the tint by lightness; lift raises the
// ramp toward the tint's own lightness (a pale tint reads pale)
function zhTint(c, tint, k, lift) {
  if (!tint) return; const T = zhHex(tint), tl = (T[0] + T[1] + T[2]) / 3 || 1, x = c.getContext('2d'), im = x.getImageData(0, 0, c.width, c.height), d = im.data;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue; const l = (d[i] + d[i + 1] + d[i + 2]) / 3;
    for (let j = 0; j < 3; j++) { let v = d[i + j] + (T[j] * l / tl - d[i + j]) * k; if (lift) v += (T[j] - v) * lift * Math.min(1, l / 150); d[i + j] = v; }
  }
  x.putImageData(im, 0, 0);
}
// direct pixel work on the finished hr canvas (effects, sparks, trails): returns a writer with px(x, y, rgb, a)
function zhPx(c) {
  const x = c.getContext('2d'), im = x.getImageData(0, 0, c.width, c.height), d = im.data, W = c.width, H = c.height;
  return {
    px(X, Y, col, a) { X = Math.round(X); Y = Math.round(Y); if (X < 0 || Y < 0 || X >= W || Y >= H) return; const q = (Y * W + X) * 4; a = a == null ? 1 : a; const ao = d[q + 3] / 255, an = a + ao * (1 - a); if (an <= 0) return; for (let j = 0; j < 3; j++) d[q + j] = (col[j] * a + d[q + j] * ao * (1 - a)) / an; d[q + 3] = an * 255; },
    add(X, Y, col, a) { X = Math.round(X); Y = Math.round(Y); if (X < 0 || Y < 0 || X >= W || Y >= H) return; const q = (Y * W + X) * 4; if (!d[q + 3]) { this.px(X, Y, col, a); return; } for (let j = 0; j < 3; j++) d[q + j] = Math.min(255, d[q + j] + col[j] * a); },
    get: (X, Y) => { const q = (Y * W + X) * 4; return [d[q], d[q + 1], d[q + 2], d[q + 3]]; },
    done() { x.putImageData(im, 0, 0); }, W, H
  };
}
// the frame: world-grain canvases carry the 1.5x sculpt as their `_hr` twin
const ZH_FR = new Map(), ZH_DEF = {};
function zhFrame(type, palKey, pal, pose, ph, view) {
  const D = ZH_DEF[type]; pal = pal || {};
  if (!D.poses[pose]) { pose = 'idle'; ph = 0; }
  ph = Math.max(0, Math.min(D.poses[pose] - 1, ph | 0));
  const back = view === 'back', key = type + '|' + palKey + '|' + (pal.tint || '') + (pal._doused ? 'd' : '') + '|' + pose + '|' + ph + '|' + (back ? 'b' : 'f');
  let fr = ZH_FR.get(key); if (fr) return fr;
  const HW = Math.round(D.W * ZH_K), HH = Math.round(D.H * ZH_K), S = ZHSculpt(HW, HH), V = zhView(S, D.OX, D.OY, back);
  const post = D.paint(V, pose, ph, pal) || null;
  const hr = S.render();
  if (post) { const w = zhPx(hr); post(w, V); w.done(); }
  if (pal.tint) zhTint(hr, pal.tint, D.tintK || 0.45, pal.tint === '#e8e2d0' ? 0.45 : 0);
  const lo = src => { const c = mkCanvas(D.W, D.H), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, D.W, D.H); c._hr = src; return c; };
  const hf = zhFlip(hr);
  // the painted bounds of the body (not the effects), for hit boxes and name plates
  let x0 = HW, y0 = HH, x1 = 0, y1 = 0; const MB = S.M;
  for (let j = 0; j < HH; j++) for (let i = 0; i < HW; i++) { const m = MB[j * HW + i]; if (m >= 0 && !ZHM[m].emis) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; } }
  const bb = D.bb || { x: Math.floor(x0 / ZH_K), y: Math.floor(y0 / ZH_K), w: Math.max(1, Math.ceil((x1 - x0 + 1) / ZH_K)), h: Math.max(1, Math.ceil((y1 - y0 + 1) / ZH_K)) };
  // the flash copies are made the first time a hit asks for them (these frames are big: keep memory down)
  fr = { c: lo(hr), f: lo(hf), w: D.W, h: D.H, ox: D.OX, oy: D.OY, bb, tint: (src, col) => lo(zhFill(src._hr || src, col)),
    get fl() { return this._fl || (this._fl = lo(zhFill(hr, '#fff'))); }, get flf() { return this._flf || (this._flf = lo(zhFill(hf, '#fff'))); } };
  if (ZH_FR.size > 240) { let n = 0; for (const k of ZH_FR.keys()) { ZH_FR.delete(k); if (++n > 80) break; } }   // drop the oldest
  ZH_FR.set(key, fr); return fr;
}
// register a sculpted creature: it keeps its M32 entry (so drawMon16 gives it the long idle / 8-step walk / 3-phase
// wind and attack) and every frame of it is served from here
function zhRegister(type, def) {
  ZH_DEF[type] = Object.assign({ poses: { idle: 4, walk: 8, wind: 3, atk: 3 } }, def);
  M32F[type] = [def.W, def.H, def.OX, def.OY]; M32[type] = function () {}; M32BACK[type] = true;
  if (def.walkK) M32WALK[type] = def.walkK;
}
{
  const _mf = monFrame;
  monFrame = function (type, palKey, pal, pose, ph, view) {
    if (!ZH_DEF[type]) return _mf.apply(this, arguments);
    return zhFrame(type, palKey, pal, pose, ph, view === 'back' ? 'back' : 'front');
  };
}
// a skull, turned toward fd (x forward, z to the viewer): cranium, face, cheekbones, brow, deep sockets (with a glow
// in them when o.glow > 0), the nose hole, the teeth and a jaw that drops by o.gape
function zhSkull(V, c, r, fd, o) {
  o = o || {}; const mat = o.mat || 'boneY', f = zhN(fd), sd = zhN([f[2], 0, -f[0]]), gp = o.gape || 0;
  const P = (a, b, d) => zhA(c, zhA(zhM(f, a * r), zhA(zhM(sd, b * r), [0, d * r, 0])));
  V.ell(zhA(c, zhM(f, -0.12 * r)), r * 1.02, r * 1.02, r * 0.98, mat);
  V.ell(P(0.42, 0, -0.5), r * 0.68, r * 0.52, r * 0.6, mat);
  for (const s of [-1, 1]) V.ell(P(0.55, s * 0.6, -0.36), r * 0.26, r * 0.24, r * 0.26, mat);
  V.cap([P(0.86, -0.62, 0.12), P(0.98, 0, 0.2), P(0.86, 0.62, 0.12)], r * 0.19, r * 0.19, o.brow || mat);
  for (const s of [-1, 1]) {
    V.ell(P(1.0, s * 0.36, -0.12), r * 0.3, r * 0.3, r * 0.14, 'ink');
    if (o.glow) V.ell(P(1.08, s * 0.33, -0.14), r * (0.09 + o.glow * 0.08), r * (0.09 + o.glow * 0.08), r * 0.1, o.gm || 'gEye', { em: 0.3 + o.glow * 0.7 });
  }
  V.ell(P(1.02, 0, -0.44), r * 0.1, r * 0.15, r * 0.08, 'ink');
  V.ell(P(0.5, 0, -0.92 - gp), r * 0.56, r * 0.3, r * 0.52, mat);
  if (gp > 0.05) V.ell(P(0.88, 0, -0.76 - gp * 0.5), r * 0.36, r * (0.06 + gp * 0.4), r * 0.1, 'ink');
  for (let i = -3; i <= 3; i++) { const k = 0.9 - Math.abs(i) * 0.05; V.ell(P(k, i * 0.11, -0.68), r * 0.06, r * 0.12, r * 0.05, o.tooth || 'bone'); V.ell(P(k - 0.04, i * 0.11, -0.86 - gp), r * 0.06, r * 0.11, r * 0.05, o.tooth || 'bone'); }
}

// ------------------------------------------------------------------- THE MARROW PONTIFF (Oss-Vharoth, bone)
// A towering skeleton-pope nearly three times a man. A mitre of stacked vertebrae over a yellowed skull; a black cope
// hanging from the shoulders to the ground in heavy ragged folds, gold orphreys down its open front; inside it, where a
// priest's breast should be, the ribcage has grown over with the skulls of the faithful, fused into it, and long bones
// hang from it like tassels over an alb gone the colour of old teeth. Bell sleeves, bone arms, a crozier that is one
// long spine curling to a crook with a skull held in the curl. Wind: the crozier is hauled back high over the mitre,
// the far hand spread, the eyes and the crook's skull kindle. Attack: the crook comes down like a maul and the ground
// splits into bone.
zhRegister('hbone', { W: 136, H: 158, OX: 50, OY: 152, walkK: 4, paint: zhPontiff });
function zhPontiff(V, pose, ph) {
  const { cap, ell, plate, surf, rings } = V;
  const walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk', idle = pose === 'idle';
  const a = walk ? ph / 8 * TAU : idle ? ph / 4 * TAU : 0, sw = walk ? Math.sin(a) : 0;
  let br = idle ? [0, 0.6, 1, 0.6][ph] : 0, bob = walk ? -Math.abs(Math.cos(a)) * 1.2 + 0.6 : 0;
  let lean = walk ? 1.5 : 0, crouch = 0, eye = 0.35, H, th, hF, spread = 0;
  if (idle || walk) { H = [33 + sw * 2, 62 + br * 0.6 + bob, 14]; th = 0.06 - sw * 0.05; hF = [-9 - sw * 2, 50 + bob, -12]; }
  if (wind) { lean = [-1.5, -3.5, -5.5][ph]; H = [[18, 72, 11], [11, 88, 9], [5, 99, 7]][ph]; th = [-0.1, -0.28, -0.42][ph]; hF = [[-15, 68, -9], [-19, 86, -6], [-21, 98, -4]][ph]; spread = [0.4, 0.8, 1][ph]; eye = [0.55, 0.8, 1][ph]; }
  if (atk) { lean = [7, 9, 6][ph]; crouch = [3, 6, 4][ph]; H = [[30, 68, 11], [29, 42, 11], [27, 46, 11]][ph]; th = [1.5, 2.2, 2.05][ph]; hF = [[-12, 58, -11], [-8, 52, -12], [-9, 52, -12]][ph]; eye = [1, 1, 0.7][ph]; }
  const up = crouch ? -crouch : bob + br * 0.5;   // the whole upper body rides this
  const L = y => lean * Math.max(0, (y - 30) / 70);   // the lean grows with height (a stoop, not a slide)
  const hs = sw * 1.8;                              // the hem swings with the walk
  // ---- the cope: a heavy black bell, open at the front, ragged at the hem, strands of rotted silk
  const af = 1.15, gap = 0.8;
  const copeR = [[86 + up, 6, 5, 6, 3 + L(86), 0], [81 + up, 14, 10, 12, 2.5 + L(81), 0], [72 + up, 18.5, 13, 14.5, 1.5 + L(72), 0], [52, 21, 15, 16.5, 0.5 + L(52) * 0.6, 0], [26, 24.5, 17.5, 19, -0.5, 0], [1, 28, 20, 22, -1.5 + hs, 0]];
  const jag = a => 4.2 * Math.pow(Math.max(0, Math.sin(a * 11 + 1.3)), 5) + 2.4 * zhH(Math.floor((a + 7) * 9), 3) + 1.6 * Math.pow(Math.max(0, Math.sin(a * 23 + 0.4)), 3);
  rings(copeR, 'cope', { a0: af + gap, a1: af - gap + TAU, ns: 150, nt: 44, su: 220, sv: 14, inside: 0.6,
    tear: (a, t) => t > 0.8 && zhVN(a * 14, t * 3, 5) < (t - 0.8) * 2.6, fold: (a, t) => (0.3 + 1.9 * t) * (Math.sin(a * 9 + 0.7 + hs * 0.2) * 0.8 + Math.sin(a * 17 + 2.1) * 0.35) + (0.2 + 0.6 * t) * (zhVN(a * 30, t * 2, 8) - 0.5) * 1.6 + (a > af + gap && a < af + gap + 0.5 ? 1.6 * (1 - (a - af - gap) / 0.5) * t : 0),
    hem: a => -jag(a) });
  // ---- the alb: old linen falling in folds to the feet
  rings([[62 + up, 9, 8, 8, 4 + L(62), 0], [40, 12, 10, 10, 3 + L(40) * 0.5, 0], [1, 15, 12.5, 12, 2.5 + hs * 0.5, 0]], 'alb', { a0: -1.2, a1: 2.4, ns: 60, nt: 24, su: 90, sv: 8,
    fold: (a, t) => (0.4 + t) * (Math.sin(a * 7 + 1) * 0.7 + Math.sin(a * 13) * 0.3), hem: a => -1.4 * Math.pow(Math.max(0, Math.sin(a * 9)), 3) });
  // bone toes stepping out under the alb
  const toe = walk ? sw * 3 : atk ? 3 : 0;
  for (const [dz, k] of [[6, 1], [-2, -1]]) { const tx = 16 + toe * k; for (let i = 0; i < 4; i++) cap([[tx - 3, 2.2, dz + i * 1.3 - 2], [tx + 2.2, 1, dz + i * 1.3 - 2]], 1, 0.7, 'bone'); }
  // ---- the ribcage, grown over with the skulls of the faithful
  const cx0 = 5 + L(70), ch = (y) => [cx0 + L(y) - L(70), y + up];
  cap([[cx0 - 4, 52 + up, -2], [cx0 - 3 + L(70) * 0, 70 + up, -4], [cx0 - 1.5, 84 + up, -3]], 2.4, 2, 'boneD');   // the spine
  for (let i = 0; i < 7; i++) {
    const y0 = 80 - i * 3.3, rw = 9 + Math.sin(i / 6 * Math.PI) * 3, drop = 3 + i * 0.4, pts = [];
    for (let k = 0; k <= 12; k++) { const g = -1.9 + k / 12 * 3.4; pts.push([cx0 - 2 + Math.cos(g) * rw, y0 + up - drop * Math.pow(k / 12, 1.5), Math.sin(g) * rw * 0.8]); }
    cap(pts, 1.4, 1.05, i % 2 ? 'bone' : 'boneY');
  }
  plate([[cx0 + 6.5, 82 + up, 7], [cx0 + 9, 81 + up, 6], [cx0 + 9.5, 64 + up, 6.5], [cx0 + 7.5, 60 + up, 7], [cx0 + 5.5, 65 + up, 7.5]], 'bone', { bevel: 1.2, bulge: 0.6 });   // the sternum
  // the skulls, many small ones clustered in the breast and belly, turned every way (the Gravelord's heap)
  const SK = [[7, 73, 9, 4.6, 0.3], [2, 66, 9.5, 3.8, -0.4], [11, 65, 7.5, 3.6, 0.8], [6, 59, 9.6, 3.9, 0.1], [12, 57, 7, 3, 0.6], [0, 58, 8.6, 3, -0.6]];
  const skull = (c, r, turn, mat, lit) => zhSkull(V, c, r, [Math.cos(turn * 1.3) * 0.7 + 0.2, -0.1, 0.8], { mat, glow: lit });
  for (const [x, y, z, r, turn] of SK) skull([cx0 - 2 + x * 1.15 + L(y) - L(70), 70 + (y - 70) * 1.2 + up, z + 2.5], r * 1.3, turn, ['boneY', 'boneY', 'bone', 'boneY'][Math.round(x * 3) & 3], 0);
  // long bones hanging from the cage like tassels, over the alb
  for (let i = 0; i < 7; i++) {
    const x = cx0 - 1 + i * 2.1 + L(55) - L(70), z = 7 + Math.sin(i * 1.3) * 1.8, top = 56 + up - (i % 3) * 1.2, len = 13 + zhH(i, 5) * 11 + (i % 2) * 3, dx = (walk ? -sw * 1.2 : wind ? -ph * 0.6 : atk ? 1.5 : 0);
    cap([[x, top, z], [x + dx * 0.5, top - len * 0.5, z + 0.5], [x + dx, top - len, z]], 1.05, 0.8, i % 2 ? 'boneY' : 'bone');
    ell([x + dx, top - len - 0.6, z], 1.5, 1.3, 1.2, 'boneY');
  }
  // ---- the orphreys: gold bands down both edges of the opening, and the gold hem
  const edge = (aa, s) => { const pts = []; for (let k = 0; k <= 14; k++) { const t = k / 14, f = t * (copeR.length - 1), i = Math.min(copeR.length - 2, Math.floor(f)), u = f - i, A = copeR[i], B = copeR[i + 1], lp = j => A[j] + (B[j] - A[j]) * u, sn = Math.sin(aa); pts.push([lp(4) + Math.cos(aa) * (lp(1) + 0.9), lp(0) - (k === 14 ? -1.5 : 0), sn * ((sn > 0 ? lp(2) : lp(3)) + 0.9)]); } return pts; };
  const eL = edge(af + gap + 0.05), eR = edge(af - gap - 0.05 + TAU);
  cap(eL, 1.9, 2.3, 'goldD'); cap(eR, 1.9, 2.3, 'goldD');
  for (const e of [eL, eR]) for (let k = 2; k < 14; k += 2) ell(zhA(e[k], [0, 0, 1.4]), 1.3, 1.3, 1, 'gold');   // embroidered bosses
  // ---- the hood-shield hanging on the back: a gold lozenge with the triune sigil (seen from behind)
  { const z = -17.5, cxs = -3, cy = 58 + up;
    plate([[cxs - 9, cy + 9, z], [cxs + 9, cy + 9, z], [cxs + 10, cy, z - 0.5], [cxs, cy - 13, z - 0.5], [cxs - 10, cy, z - 0.5]], 'gold', { bevel: 1.6, bulge: 0.3 });
    plate([[cxs - 6.5, cy + 6.8, z + 0.6], [cxs + 6.5, cy + 6.8, z + 0.6], [cxs + 7.2, cy, z + 0.3], [cxs, cy - 9.5, z + 0.3], [cxs - 7.2, cy, z + 0.3]], 'cope', { bevel: 0.8, bulge: 0.2, z: -0.4 });
    for (const dx of [-3.5, 0, 3.5]) cap([[cxs + dx, cy + 5, z + 1.2], [cxs + dx, cy - (dx ? 0 : 7), z + 1.2]], 0.7, 0.7, 'gold');
    cap([[cxs - 3.5, cy, z + 1.2], [cxs + 3.5, cy, z + 1.2]], 0.7, 0.7, 'gold'); ell([cxs, cy - 1, z + 1.8], 1.1, 1.1, 0.6, 'gBlood', { em: 0.5 });
    for (let i = 0; i < 9; i++) cap([[cxs - 7 + i * 1.75, cy - 13 + Math.abs(i - 4) * 2.4, z], [cxs - 7 + i * 1.75, cy - 17 + Math.abs(i - 4) * 2.2, z]], 0.55, 0.45, i & 1 ? 'goldD' : 'gold'); }
  // ---- the head: a yellowed skull bowed forward under a mitre of vertebrae
  const hx = 8 + L(94), hy = 93 + up - (atk ? [1, 3, 2][ph] : 0), hz = 2, HD = [hx, hy, hz];
  // the high collar behind it
  rings([[88 + up, 8, 6, 8, hx - 5, 0], [96 + up, 10, 6, 10, hx - 7, -1]], 'cope', { a0: 1.9, a1: 5.2, ns: 24, nt: 8, inside: 0.2 });
  cap([[hx - 13, 96 + up, -3], [hx - 9, 97 + up, -9], [hx - 2, 96 + up, -10]], 1, 1, 'gold');
  const gape = (wind && ph === 2) || (atk && ph === 1) ? 0.35 : wind ? 0.12 : 0;
  zhSkull(V, HD, 7.2, [0.5, -0.22, 0.84], { mat: 'boneY', glow: eye, gape, brow: 'bone' });
  // the mitre: a gold band, then vertebrae stacked to a crest, their processes flaring like horns
  cap([[hx - 6, hy + 4.2, 0], [hx - 3, hy + 5.4, 5.5], [hx + 3, hy + 5.8, 5.2], [hx + 6, hy + 5, 0]], 1.5, 1.5, 'gold');
  ell([hx + 1.2, hy + 5.7, hz + 5.4], 0.8, 0.8, 0.6, 'goldD');
  const VT = [[7.5, 5, 1.4], [12, 5.2, 2], [16.5, 5, 2.7], [21, 4.4, 3], [25, 3.5, 2.6], [28.5, 2.6, 1.8]];
  VT.forEach(([dy, r, sp], i) => {
    const vx = hx - 0.5 - i * 0.5 + (wind ? -ph * 0.3 * i : 0), vy = hy + dy, bm = i % 2 ? 'bone' : 'boneY';
    ell([vx, vy, 0], r, 2.1, r * 0.85, bm);
    for (const s of [-1, 1]) cap([[vx + s * r * 0.6, vy, s * r * 0.4], [vx + s * (r + sp) * 0.8, vy + sp * 1.1, s * (r + sp) * 0.5]], 1.1, 0.5, bm);
    cap([[vx + r * 0.8, vy - 0.3, 1.5], [vx + r + 1.2, vy - 1.6, 1.2]], 0.7, 0.4, 'boneD');
  });
  cap([[hx - 3.2, hy + 30, 0], [hx - 3.8, hy + 36, 0]], 1.4, 0.4, 'boneY');
  for (let i = 0; i < 7; i++) cap([[hx - 0.5 - i * 0.4, hy + 6 + i * 3.6, 1.8], [hx - 0.7 - i * 0.4, hy + 7.8 + i * 3.6, 2.2]], 0.35, 0.35, 'gold');   // gold wire threaded up it
  // the lappets hanging behind
  const lp = walk ? -sw * 1.4 : wind ? -ph * 1.2 : atk ? 2 : 0;
  for (const z of [-3, 2.5]) plate([[hx - 6, hy + 3, z], [hx - 3.5, hy + 3, z], [hx - 4 + lp, hy - 12, z], [hx - 7.5 + lp, hy - 13, z]], 'cope', { bevel: 0.8, bulge: 0.2 });
  // ---- the arms: bell sleeves with gold cuffs, bone forearms, bone hands
  const arm = (sh, ha, hint, near) => {
    const el = zhIK(sh, ha, 17, 17, hint), cu = zhL(el, ha, 0.45), cu2 = zhL(el, ha, 0.52);
    V.tube([sh, el, cu], u => 4.2 + u * 1.8, 'cope', { dk: near ? 0 : 0.25, ns: 26, nt: 26, su: 40, sv: 30, fold: (u, g) => (0.4 + u) * (0.55 * Math.sin(g * 5 + u * 9) + 0.3 * Math.sin(g * 11 + 2)) });
    // the bell of the sleeve: heavy silk hanging from the forearm, ragged at its edge
    surf((u, t) => { const P = u < 0.5 ? zhL(sh, el, u * 2) : zhL(el, cu, (u - 0.5) * 2), hang = (2 + (near ? 7 : 13) * Math.pow(u, 1.6)) * (1 - (wind && !near ? 0.5 : 0)), rag = t > 0.8 ? 2.5 * Math.pow(Math.max(0, Math.sin(u * 23 + 1)), 3) : 0;
      if (t > 0.92 && zhH(Math.floor(u * 17), 4) < 0.35) return null;
      return zhA(P, [-1.5 * t * u + (walk ? -sw * t * 1.5 : 0), -(hang + rag) * t, (near ? 1 : -1) * (1.5 + Math.sin(t * Math.PI) * 2.5 * u)]); }, 28, 10, 'cope', { su: 60, sv: 8, inside: 0.5, dk: near ? 0 : 0.25 });
    cap([cu, cu2], 5.8, 5.8, 'goldD', { flat: 0.4 });
    cap([cu2, ha], 1.6, 1.3, 'bone');
    cap([zhL(cu2, ha, 0.2), zhA(ha, [0, -0.6, 0.9])], 1, 0.9, 'boneD');
    return el;
  };
  const shN = [11 + L(80), 79 + up, 7], shF = [-4 + L(80), 79 + up, -10];
  arm(shF, hF, [-0.2, -1, -0.3], false);
  if (spread) for (let f = -2; f <= 2; f++) { const g = Math.PI / 2 + f * 0.42 * spread + 0.2, l = 5.5 - Math.abs(f) * 0.6; cap([hF, zhA(hF, [Math.cos(g) * l * 0.9, Math.sin(g) * l, f * 0.6])], 0.75, 0.5, 'bone'); }
  else ell(hF, 2.2, 2.6, 2, 'bone');
  arm(shN, zhA(H, [-0.8, -0.8, 0.8]), atk ? [0.2, -1, 0.5] : [0.6, -1, 0.5], true);
  for (let f = 0; f < 4; f++) cap([zhA(H, [-1.8, 1.8 - f * 1.1, 2.2]), zhA(H, [1.6, 1.6 - f * 1.1, 2.6]), zhA(H, [1.8, 1.2 - f * 1.1, -0.5])], 0.6, 0.5, f % 2 ? 'bone' : 'boneY');
  // ---- the crozier: one long spine, knuckled, curling to a crook with a skull held in it
  const dir = [Math.sin(th), Math.cos(th), 0], perp = [Math.cos(th), -Math.sin(th), 0], Lt = 36, Lb = 44;
  const at = (u, v, w) => zhA(H, zhA(zhM(dir, u), zhA(zhM(perp, v), [0, 0, w || 0])));
  cap([at(-Lb, 0), at(Lt, 0)], 1.35, 1.2, 'boneD');
  for (let u = -Lb + 2; u < Lt - 1; u += 3.1) { ell(at(u, 0, 0.3), 2, 2, 1.8, (u | 0) % 2 ? 'bone' : 'boneY'); cap([at(u, 0.5, 1), at(u + 0.6, 2.6, 1.6)], 0.6, 0.35, 'boneD'); }
  const CR = [[0, 0], [3.4, 0.8], [6.4, 3], [7.8, 6.4], [7.2, 10], [5, 12.4], [2, 13], [-0.4, 11.6], [-1.2, 9]].map(([u, v]) => at(Lt + u, v));
  cap(CR, 2.6, 1.5, 'bone');
  CR.forEach((p, i) => { if (i && i < CR.length - 1) ell(zhA(p, [0, 0, 1.2]), 2.2 - i * 0.12, 2.2 - i * 0.12, 1.5, i % 2 ? 'boneY' : 'bone'); });
  ell(at(Lt - 2, 0, 0.5), 3.2, 3.2, 3, 'gold');                                // the knop
  cap([at(Lt - 4.2, 0), at(Lt - 3.4, 0)], 2.4, 2.4, 'goldD');
  const scC = at(Lt + 2.4, 6.2, 2.5);
  const cl = wind ? eye : atk ? 1 : 0;
  skull(scC, 3.6, th > 0.8 ? 0.6 : 0.8, 'boneY', cl ? 0.35 + cl * 0.65 : 0);
  cap([at(-Lb, 0), at(-Lb - 3, 0)], 1.1, 0.5, 'gold');                            // the ferrule
  // ---- the ground splits: bone thrusts up in front of the blow
  const imp = at(Lt + 5, 11);
  if (atk && ph >= 1) {
    const k = ph === 1 ? 1 : 0.62;
    const SP = [[-9, 7, 1.6, -0.5, 4], [-4, 13, 2.2, -0.2, 7], [1, 19, 2.8, 0.1, 2], [6, 14, 2.3, 0.35, 8], [11, 9, 1.8, 0.5, 3], [15, 5, 1.4, 0.7, 6], [3, 8, 1.8, -0.1, 12], [-7, 5, 1.4, -0.4, -2]];
    for (const [dx, h, r, tilt, dz] of SP) { const b = [imp[0] + dx, 0, dz], hh = h * k; cap([b, [b[0] + tilt * hh * 0.5, hh * 0.55, dz], [b[0] + tilt * hh, hh, dz]], r * 1.3, 0.35, dx % 2 ? 'bone' : 'boneY'); }
    for (let i = 0; i < 6; i++) ell([imp[0] - 8 + i * 4.5, 0.6, 3 + (i % 3) * 3], 2.6, 1.1, 2, 'boneD');
  }
  // ---- effects, painted over the finished pixels
  return (w, V2) => {
    const C = V2.C;
    if (wind) {   // motes of marrow-light drawn up into the crook
      const n = 8 + ph * 8, sc = C(scC);
      for (let i = 0; i < n; i++) { const g = zhH(i, 31) * TAU, r = (10 + zhH(i, 32) * 26) * (1 - ph * 0.22) * ZH_K; const x = sc[0] + Math.cos(g) * r, y = sc[1] + Math.sin(g) * r * 0.8;
        w.add(x, y, [255, 214, 120], 0.8); if (i % 3 === 0) { w.add(x + Math.cos(g) * -2, y + Math.sin(g) * -2, [200, 140, 60], 0.5); } }
      if (ph === 2) for (let i = 0; i < 16; i++) { const g = i / 16 * TAU, r = 9 * ZH_K; w.add(sc[0] + Math.cos(g) * r, sc[1] + Math.sin(g) * r, [255, 240, 180], 0.55); }
    }
    if (atk && ph === 0) {   // the smear: the arc the crook sweeps through, from high behind to the ground ahead
      const piv = C([H[0] - 6, H[1] - 6, 0]), R0 = 44 * ZH_K;
      for (let g = -2.5; g < -0.05; g += 0.012) for (let r = R0 - 16 * ZH_K * (1 + g / 2.5); r < R0; r += 1) {
        const x = piv[0] + Math.cos(g) * r, y = piv[1] + Math.sin(g) * r * 0.95, t = (g + 2.5) / 2.45, e = (r - (R0 - 16 * ZH_K)) / (16 * ZH_K);
        if (zhVN(x * 0.35, y * 0.35, 4) < 0.3 * (1 - t)) continue;
        w.px(x, y, e > 0.8 ? [236, 222, 176] : e > 0.45 ? [170, 150, 110] : [90, 76, 60], Math.min(0.9, 0.15 + 0.75 * t) * (e > 0.2 ? 1 : 0.4));
      }
    }
    if (atk && ph === 1) {   // dust and bone chips thrown up
      const p = C([imp[0], 2, 4]);
      for (let i = 0; i < 40; i++) { const g = -Math.PI * (0.08 + 0.84 * zhH(i, 7)), r = (4 + zhH(i, 8) * 22) * ZH_K; w.px(p[0] + Math.cos(g) * r, p[1] + Math.sin(g) * r * 0.75, i % 4 ? [120, 104, 80] : [230, 214, 170], 0.7 + zhH(i, 9) * 0.3); }
      for (let i = 0; i < 50; i++) { const x = p[0] + (zhH(i, 11) - 0.5) * 50 * ZH_K, y = p[1] + 2 + zhH(i, 12) * 4; w.px(x, y, [60, 50, 40], 0.5); }
    }
  };
}

// ------------------------------------------------------------------- THE WET NURSE (Nol-Shogthuth, flesh)
// A mother-shape made of many bodies fused into one, as tall as three men. She rises out of a heap of the drowned and
// the born: backs, rumps, curled knees, a dragging pair of feet, a hand still clutching at the air, faces surfacing in
// the skin with their eyes shut and their mouths open. On the heap sways the torso: the vast pregnant belly with the
// birth-cleft low on it, two heavy breasts, the heavy arms (one cradling the belly, one planted behind to take the
// weight), a thin arm growing out of her flank. On top, bowed, the tiny serene porcelain face under the broken
// bronze wheel. Walk: a sliding crawl, the heap rolling under her. Wind: she rears back and swells, the cleft gapes,
// every mouth opens, the arms lift. Attack: she heaves forward and the cleft sprays bile.
zhRegister('hflesh', { W: 156, H: 132, OX: 64, OY: 126, walkK: 3.2, paint: zhNurse });
function zhNurse(V, pose, ph) {
  const { cap, ell, plate, surf, rings } = V;
  const walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk', idle = pose === 'idle';
  const a = walk ? ph / 8 * TAU : idle ? ph / 4 * TAU : 0;
  let sway = 0, swell = 0, gape = 0.25, heave = 0, reach = 0, mouth = 0.15, roll = 0, bob = 0;
  if (idle) { sway = Math.sin(a) * 0.03; swell = Math.sin(a) * 0.5 + 0.5; mouth = ph === 2 ? 0.4 : 0.15; }
  if (walk) { sway = Math.sin(a) * 0.06; roll = ph / 8; heave = Math.sin(a) * 1.5; bob = Math.abs(Math.cos(a)) * 1.2; }
  if (wind) { sway = [-0.1, -0.2, -0.3][ph]; swell = [1.2, 2, 3][ph]; gape = [0.6, 0.9, 1.2][ph]; reach = [0.35, 0.7, 1][ph]; mouth = [0.5, 0.8, 1][ph]; }
  if (atk) { sway = [0.28, 0.2, 0.1][ph]; heave = [6, 4, 2][ph]; swell = [0.2, 0, 0][ph]; gape = [1.3, 1, 0.6][ph]; mouth = 1; reach = 0; }
  // the torso turns about a pivot low in the heap
  const PV = [2 + heave, 30 - bob], cs = Math.cos(sway), sn = Math.sin(sway);
  const yw = 0.8, cy = Math.cos(yw), sy = Math.sin(yw);
  const R = p => { const x = (p[0] - 2) * cs + (p[1] - 30) * sn, y = -(p[0] - 2) * sn + (p[1] - 30) * cs; return [PV[0] + x * cy - p[2] * sy, PV[1] + y, x * sy + p[2] * cy]; };
  // ---- the heap: bodies fused into a mound (each one its own form, the drowned paler)
  const rl = roll * TAU;
  const HEAP = [
    [-26, 12, -4, 17, 12, 13, 'fleshP'], [-8, 10, 4, 18, 11, 14, 'flesh'], [12, 9, 6, 17, 10, 13, 'fleshP'], [28, 7, 2, 12, 8, 10, 'flesh'],
    [-18, 22, -10, 13, 9, 10, 'flesh'], [2, 20, -6, 16, 11, 12, 'fleshP'], [18, 18, -2, 11, 8, 9, 'flesh'], [-34, 6, 6, 10, 7, 8, 'fleshD'],
    [36, 5, 8, 8, 6, 7, 'fleshP'], [-2, 6, 14, 12, 7, 8, 'flesh'], [20, 5, 14, 10, 6, 7, 'fleshP'], [-20, 5, 14, 9, 6, 7, 'flesh']
  ];
  HEAP.forEach(([x, y, z, rx, ry, rz, m], i) => { const w = walk ? Math.sin(rl + i * 1.7) * 1.2 : 0; ell([x + w, y + (walk ? Math.cos(rl + i) * 0.6 : 0), z], rx, ry, rz, m); });
  // spines showing through the backs, knees and a rump, the curled limbs of the fused
  for (const [x, y, z, n, dx] of [[-28, 20, -2, 6, 3.2], [-4, 19, 6, 5, 3.4], [14, 17, 8, 4, 3]]) for (let k = 0; k < n; k++) ell([x + k * dx, y + 1.2 - Math.abs(k - n / 2) * 0.5, z + 1], 1.2, 0.9, 1, 'fleshP');
  cap([[-30, 4, 16], [-24, 9, 18], [-16, 6, 19]], 3.4, 2.6, 'fleshP'); ell([-16, 5, 19], 3, 2.6, 2.4, 'fleshP');                 // a bent knee
  cap([[30, 3, 15], [38, 6, 13], [44, 3, 11]], 2.8, 2, 'flesh');                                                            // a leg dragging
  for (const [fx, fz] of [[45, 10], [46, 13]]) { const fw = walk ? Math.sin(rl) * 1.5 : 0; cap([[fx - 1 + fw, 2, fz], [fx + 4 + fw, 1.3, fz + 0.5]], 1.8, 1.3, 'flesh'); }   // the dragging feet
  // a hand clutching up out of the heap
  { const hb = [-38, 10, 4], ht = [-44 - reach * 3, 24 + reach * 6, 6]; cap([hb, zhL(hb, ht, 0.5), ht], 2.4, 1.8, 'fleshP');
    for (let f = 0; f < 4; f++) { const g = 1.6 + f * 0.35 - reach * 0.4; cap([ht, zhA(ht, [Math.cos(g) * 4.6, Math.sin(g) * 4.6, f - 1.5]), zhA(ht, [Math.cos(g + 0.9) * 6.4, Math.sin(g + 0.9) * 5, f - 1.5])], 0.8, 0.6, 'fleshP'); } }
  // faces surfacing in the heap, eyes shut, mouths open
  const face = (c, r, fd, mo) => {
    const f = zhN(fd), sd = zhN([f[2], 0, -f[0]]), P = (u, v, w) => zhA(c, zhA(zhM(f, u * r), zhA(zhM(sd, v * r), [0, w * r, 0])));
    ell(c, r * 0.9, r * 1.25, r * 0.8, 'fleshP');
    ell(P(0.55, 0, -0.55), r * 0.55, r * 0.45, r * 0.5, 'fleshP');                                // the jaw
    for (const s of [-1, 1]) ell(P(0.78, s * 0.34, 0.18), r * 0.2, r * 0.16, r * 0.12, 'fleshD');   // the sunk shut eyes
    cap([P(0.88, 0, 0.12), P(0.94, 0, -0.18)], r * 0.12, r * 0.14, 'fleshP');                    // the nose
    ell(P(0.9, 0, -0.62), r * (0.16 + mo * 0.08), r * (0.16 + mo * 0.32), r * 0.12, 'ink');       // the gasping mouth
  };
  face([-14, 16, 15], 4.2, [0.25, 0.1, 0.9], mouth); face([10, 14, 15], 3.6, [0.4, 0, 0.85], mouth * 0.8); face([-30, 17, 8], 3.4, [-0.2, 0.3, 0.9], mouth);
  face([30, 12, 10], 3, [0.7, 0.2, 0.6], mouth * 0.6);
  // ---- the torso: hips sunk in the heap, a long back, heavy shoulders
  const sw = swell;
  rings([[26, 17, 15, 15, 2, 0], [40, 15, 13, 13, 3, 0], [56, 14, 12, 12, 2, 0], [70, 17, 12, 12, 1, 0], [78, 14, 9, 9, 0.5, 0], [84, 4.5, 4, 4, 2.5, 0]].map(r => { const q = R([r[4], r[0], 0]); return [q[1], r[1], r[2], r[3], q[0], 0]; }), 'flesh', { ns: 60, nt: 40, su: 40, sv: 30, mat: (s2, t) => zhVN(s2 * 10, t * 7, 29) > 0.7 ? 'fleshP' : zhVN(s2 * 8, t * 6, 31) > 0.72 ? 'fleshD' : 'flesh',
    fold: (a, t) => (t < 0.35 ? 1.6 * Math.sin(a * 6 + 1) * (0.35 - t) : 0) + (zhVN(a * 6, t * 9, 3) - 0.5) * 1.2 + (t > 0.25 && t < 0.45 ? Math.sin((t - 0.25) / 0.2 * Math.PI) * 1.2 : 0) });
  // ribs under the skin of the flank
  for (let i = 0; i < 4; i++) cap([R([-6, 66 - i * 3.4, 9]), R([0, 64 - i * 3.6, 10.5]), R([5, 61 - i * 3.8, 10])], 1, 0.8, 'flesh');
  // the belly: vast, pale, stretched shining; the birth-cleft low on it
  const BC = R([15 + sw * 0.6, 43, 6]), br = 18 + sw;
  ell(BC, br, br * 0.95, br * 0.95, 'belly');
  ell(R([20 + sw * 0.8, 47, 14 + sw * 0.8]), 2.2, 2.2, 1.6, 'belly'); ell(R([22.5 + sw, 47, 16.5 + sw * 0.9]), 1, 1.2, 0.6, 'fleshD');   // the navel, pushed out
  cap([R([24 + sw, 45, 16 + sw]), R([28 + sw, 38, 14 + sw]), R([29 + sw, 32, 12 + sw])], 0.35, 0.35, 'fleshD');   // the dark line down to the cleft
  const cl = R([30 + sw, 32, 9.5 + sw * 0.8]);
  cap([zhA(cl, [0.6, 5.5, -1.2]), cl, zhA(cl, [-0.6, -5.5, -1.2])], 1.6 + gape * 0.6, 1.6 + gape * 0.6, 'lip');
  cap([zhA(cl, [0.8, 4, 0.2]), zhA(cl, [1.2, 0, 0.6]), zhA(cl, [0.8, -4, 0.2])], 0.4 + gape * 0.8, 0.4 + gape * 0.8, gape > 0.8 ? 'gBile' : 'ink', { em: 0.3 + gape * 0.3 });
  // the breasts, heavy on the belly
  for (const [z, k] of [[7.5, 1], [-3, 0.9]]) { const c = R([12 + sw * 0.3, 62 - k * 0.5, z + 1]); ell(c, 6.4 * k, 7.4 * k, 6.2 * k, 'belly'); ell(zhA(c, [3.5 * k, -3 * k, 2.5]), 1.3, 1.2, 1, 'lip'); }
  // a hand pressing out from inside the chest, the fingers standing in the skin
  for (let f = 0; f < 4; f++) ell(R([7 + f * 1.6, 70 + f * 0.4, 9.5 - f * 0.4]), 1.3, 2.6, 1.2, 'flesh');
  // a thin pale arm grown out of her flank, reaching
  { const b = R([-2, 46, 12]), e = R([-10 - reach * 4, 38 + reach * 10, 20]), h = R([-15 - reach * 8, 30 + reach * 22, 22]); cap([b, e], 2.3, 1.8, 'fleshP'); cap([e, h], 1.8, 1.4, 'fleshP');
    for (let f = 0; f < 4; f++) cap([h, zhA(h, [-2.5 - f * 0.3, (f - 1.5) * 1.1 - 2.5 + reach * 4, f * 0.5])], 0.6, 0.45, 'fleshP'); }
  // ---- the arms: the near one cradles the belly (or lifts), the far one plants behind in the heap
  const shN = R([3, 75, 14]), shF = R([-1, 75, -14]);
  ell(shN, 6.5, 6, 6, 'flesh'); ell(shF, 6.5, 6, 6, 'fleshD');
  const haN = wind ? R([14 - reach * 6, 74 + reach * 26, 18]) : atk ? R([30, 44, 14]) : R([12 + sw, 32, 19]);
  const haF = wind ? R([-18 - reach * 4, 70 + reach * 24, -12]) : [-24, 22, -14];
  for (const [sh, ha, hint, m] of [[shF, haF, [-1, 0.2, -0.6], 'fleshD'], [shN, haN, wind ? [0.4, -0.2, 1] : [0.3, -1, 0.6], 'flesh']]) {
    const el = zhIK(sh, ha, 24, 24, hint);
    cap([sh, el], 6, 4.8, m); cap([el, ha], 4.6, 3.4, m); ell(el, 4.4, 4.2, 4, m);
    for (let f = 0; f < 4; f++) { const d = zhN(zhS(ha, el)), sd = zhN([d[1], -d[0], 0.3]); cap([ha, zhA(ha, zhA(zhM(d, 3.5), zhM(sd, (f - 1.5) * 1.6))), zhA(ha, zhA(zhM(d, 6 + (wind ? 1.5 : 0)), zhA(zhM(sd, (f - 1.5) * (wind ? 2.6 : 1.6)), [0, wind ? 0 : -1.5, 0])))], 1.1, 0.8, m); }
    ell(ha, 3.4, 3, 3, m);
  }
  // ---- the head: a tiny serene porcelain face, bowed, a black veil falling behind; the broken bronze wheel
  const HD = R([8, 90, 2]);
  ell(HD, 4.2, 5, 4.2, 'cope');
  ell(zhA(HD, [1.8, -0.8, 2.4]), 3.4, 4.6, 2.4, 'porc');
  plate([zhA(HD, [-0.5, 4, 3.5]), zhA(HD, [4.5, 3.6, 3.6]), zhA(HD, [5, -1, 4.2]), zhA(HD, [3, -5.4, 4]), zhA(HD, [0, -5, 3.4]), zhA(HD, [-1.2, 0, 3.2])], 'porc', { bevel: 1.4, bulge: 0.9 });
  for (const s of [-1, 1]) cap([zhA(HD, [1.4 + s * 1.6, 0.4, 6]), zhA(HD, [2.4 + s * 1.6, 0, 6])], 0.3, 0.3, 'ink');
  ell(zhA(HD, [2.2, -1.6, 6]), 0.4, 0.8, 0.3, 'porc');   // the shut eyes
  ell(zhA(HD, [2.2, -3.4, 6]), 0.7, 0.25 + mouth * 0.4, 0.3, 'lip');
  if (mouth > 0.6) cap([zhA(HD, [2.4, -3.6, 6.1]), zhA(HD, [2.6, -8, 5])], 0.35, 0.25, 'lip');   // a thread of blood from the mouth
  rings([[HD[1] + 5, 4.6, 4, 5, HD[0] - 0.5, 0], [HD[1] - 2, 6, 3, 6.5, HD[0] - 2, 0], [HD[1] - 14, 9, 3, 9, HD[0] - 5, 0]], 'cope', { a0: 1.6, a1: 5.3, ns: 24, nt: 12, inside: 0.3, fold: (a, t) => t * 0.8 * Math.sin(a * 7) });
  // the wheel: a broken bronze rim with spokes, standing behind the head
  { const wc = zhA(HD, [-3, 6, -8]), Rw = 14 + (wind ? ph * 1.5 : 0), rot = (walk ? roll * 0.6 : 0) + (wind ? ph * 0.15 : 0);
    const arc = (g0, g1) => { const pts = []; for (let k = 0; k <= 10; k++) { const g = g0 + (g1 - g0) * k / 10 + rot; pts.push(zhA(wc, [Math.cos(g) * Rw, Math.sin(g) * Rw, Math.cos(g) * 1.5])); } cap(pts, 1.5, 1.5, 'bronze'); };
    arc(0.2, 1.9); arc(2.3, 3.6); arc(4.1, 5.5);
    for (let k = 0; k < 7; k++) { const g = k / 7 * TAU + rot + 0.2; if (k === 3) continue; cap([zhA(wc, [Math.cos(g) * 3, Math.sin(g) * 3, 0]), zhA(wc, [Math.cos(g) * (Rw - 1), Math.sin(g) * (Rw - 1), Math.cos(g) * 1.2])], 0.7, 0.6, 'bronze'); }
    ell(wc, 2.6, 2.6, 1.6, 'bronze');
    for (const g of [1.9, 3.6, 5.5]) ell(zhA(wc, [Math.cos(g + rot) * Rw, Math.sin(g + rot) * Rw, 0]), 1.8, 1.8, 1.4, 'bronze'); }
  // ---- bile
  const clP = cl;
  if (atk) {
    const k = [1, 0.7, 0.35][ph], L0 = [34, 44, 40][ph];
    for (let i = 0; i < 9; i++) { const u = i / 8, p = zhA(clP, [u * L0 * k + 2, -u * u * 18 * (ph + 1) * 0.5 + Math.sin(i * 1.7) * 2 * u, 2 + Math.cos(i) * 3 * u]); ell(p, (2 + u * 3) * k, (1.6 + u * 2) * k, 2 * k, 'gBile', { em: 0.9 - u * 0.4 }); }
  }
  return (w, V2) => {
    const C = V2.C, S = V2.S, WW = S.W, HH = S.H;
    // veins mapped over the skin: dark violet threads wandering over the flesh and the belly
    const ok = (x, y) => { if (x < 0 || y < 0 || x >= WW || y >= HH) return false; const m = S.M[y * WW + x]; return m === ZHMI.belly || m === ZHMI.flesh; };
    for (let v = 0; v < 14; v++) {
      let x = Math.round(zhH(v, 41) * WW), y = Math.round(zhH(v, 42) * HH); if (!ok(x, y)) continue;
      let g = zhH(v, 43) * TAU;
      for (let s = 0; s < 26; s++) { g += (zhH(v * 31 + s, 44) - 0.5) * 1.2; x += Math.round(Math.cos(g)); y += Math.round(Math.sin(g)); if (!ok(x, y)) break; const c = w.get(x, y); w.px(x, y, [c[0] * 0.55 + 20, c[1] * 0.4, c[2] * 0.55 + 30], 0.85); }
    }
    // stretch marks: pale short arcs on the belly
    for (let v = 0; v < 12; v++) { let x = Math.round(zhH(v, 71) * WW), y = Math.round(zhH(v, 72) * HH); if (!(x >= 0 && y >= 0 && x < WW && y < HH) || S.M[y * WW + x] !== ZHMI.belly) continue;
      for (let s2 = 0; s2 < 5; s2++) { const xx = x + s2, yy = y + Math.round(s2 * s2 * 0.15); if (xx < WW && yy < HH && S.M[yy * WW + xx] === ZHMI.belly) { const c = w.get(xx, yy); w.px(xx, yy, [c[0] + 26, c[1] + 18, c[2] + 18], 0.8); } } }
    if (atk) {   // the spray: droplets flung ahead
      const p = C(zhA(clP, [8, 0, 3]));
      for (let i = 0; i < 70; i++) { const u = zhH(i, 51), g = -0.35 + (zhH(i, 52) - 0.5) * 0.9 + u * 0.6, r = (6 + u * [46, 56, 50][ph]) * ZH_K; w.px(p[0] + Math.cos(g) * r, p[1] + Math.sin(g) * r * 0.7 + u * u * 10 * ZH_K, i % 5 ? [180, 196, 70] : [240, 250, 170], (1 - u * 0.5) * [1, 0.8, 0.5][ph]); }
    }
    if (wind && ph === 2) { const p = C(clP); for (let i = 0; i < 14; i++) w.add(p[0] + (zhH(i, 61) - 0.5) * 8, p[1] + (zhH(i, 62) - 0.5) * 14, [150, 170, 40], 0.5); }
  };
}

// ------------------------------------------------------------------- THE LONG EXHALE (Yh'Anuul, the Last Breath)
// The god's last breath, still leaving: a column of wind three men tall, wound in grave-shrouds that spiral up it and
// stream away behind in tatters that never stop moving, hooded at the top over one long grey face with its mouth
// torn open in a wail; smaller faces surface in the winding and sink again, every mouth open. Two long arms wrapped in
// the same shrouds end in grey bone hands. It floats; below the shrouds the column thins to a twist of air.
// Wind: it draws in, narrowing and leaning back, the hands pulled to the breast, the world's air streaming into the
// great mouth. Attack: the blast, a cone of grey-white wind out of the mouth.
zhRegister('hbreath', { W: 176, H: 152, OX: 72, OY: 146, walkK: 4, paint: zhBreath });
function zhBreath(V, pose, ph) {
  const { cap, ell, plate, surf, rings } = V;
  const walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk', idle = pose === 'idle';
  const T = walk ? ph / 8 : idle ? ph / 4 : wind ? ph / 3 : ph / 3;   // the phase of the streaming
  let lean = walk ? 3 : 0, narrow = 1, mouth = 0.45, lift = walk ? Math.sin(T * TAU) * 1.5 : idle ? Math.sin(T * TAU) * 1 : 0;
  if (wind) { lean = [-2, -4, -6][ph]; narrow = [0.92, 0.84, 0.76][ph]; mouth = [0.6, 0.8, 1][ph]; }
  if (atk) { lean = [9, 7, 4][ph]; narrow = [1.1, 1.05, 1][ph]; mouth = [1.2, 1.1, 0.8][ph]; }
  const Lx = y => lean * Math.pow(Math.max(0, y - 20) / 100, 1.3);   // the column bends from the base up
  const B = 10 + lift;   // it floats: the shrouds end this far above the ground
  // ---- the core: a column of wound grey gauze, thinning to a twist of air at its foot
  const CR = [[B - 8, 1], [B, 3], [B + 15, 6], [B + 38, 10], [B + 62, 14.5], [B + 80, 18], [B + 90, 15], [B + 100, 8]];
  rings(CR.map(([y, r]) => [y, r * narrow, r * narrow * 0.85, r * narrow * 0.9, Lx(y) + Math.sin(y * 0.09 + T * TAU) * (y < B + 20 ? 2.5 : 0.6), 0]), 'gauze', { ns: 60, nt: 40, su: 80, sv: 16,
    fold: (a, t) => 0.9 * Math.sin(a * 5 + t * 14 + T * TAU) + 0.4 * Math.sin(a * 11 - t * 20) });
  // the winding: shroud bands spiralling up the column, their loose ends flying
  for (let b = 0; b < 4; b++) {
    const y0 = B + 2 + b * 22, turns = 1.3, w = 2.6 + (b % 2) * 1.2, ph0 = b * 1.9 + T * TAU * 0.5;
    surf((s, t) => {
      const g = ph0 + s * turns * TAU, y = y0 + s * 30 + (t - 0.5) * w, r0 = CR.reduce((acc, [yy, rr]) => (y >= yy ? rr : acc), 4) * narrow + 1.4 + Math.sin(s * 30) * 0.3;
      if (s > 0.9 && zhH(Math.floor(t * 6) + b * 7, 3) < (s - 0.9) * 8) return null;
      return [Lx(y) + Math.cos(g) * r0, y + Math.sin(g * 2) * 0.6, Math.sin(g) * r0 * 0.9];
    }, 70, 5, b % 2 ? 'gauzeP' : 'gauze', { su: 50, sv: 5, inside: 0.4 });
  }
  // the tatters streaming behind, rippling
  const TT = [[B + 92, 8, 62, 12, 0.5], [B + 86, -6, 70, 14, 0.62], [B + 76, 12, 56, 11, 0.7], [B + 66, -2, 64, 12, 0.8], [B + 50, 9, 46, 9, 0.85], [B + 36, -8, 40, 8, 0.9], [B + 96, 1, 48, 10, 0.35]];
  TT.forEach(([y, z, L, w, dn], i) => {
    const pw = T * TAU + i * 1.3, amp = walk ? 5 : 3.5, back = atk ? 0.75 : wind ? 1.15 : 1;
    surf((s, t) => {
      const strip = Math.floor(t * 5), tear = zhH(strip + i * 11, 7); if (s > 0.55 && tear < (s - 0.55) * 2.4) return null;
      const g = Math.PI + 0.35 + dn * 0.9 - (wind ? 0.3 : 0), dx = Math.cos(g) * L * s * back, dy = Math.sin(g) * L * s * 0.8;
      const x = Lx(y) - 8 + dx + Math.cos(s * 4 + pw) * amp * s * 0.4, yy = y + dy + (t - 0.5) * w * (1 - s * 0.4) + Math.sin(s * 5 + pw) * amp * s, zz = z + (t - 0.5) * 4 + Math.cos(s * 4 + pw) * amp * 0.6 * s;
      return [x, yy, zz];
    }, 30, 6, i % 2 ? 'gauze' : 'gauzeP', { su: 30, sv: 12, inside: 0.4, fold: null });
  });
  // faces surfacing in the winding, every mouth open
  const face = (c, r, fd, mo, m) => {
    const f = zhN(fd), sd = zhN([f[2], 0, -f[0]]), P = (u, v, w) => zhA(c, zhA(zhM(f, u * r), zhA(zhM(sd, v * r), [0, w * r, 0])));
    ell(c, r * 0.85, r * 1.3, r * 0.75, m || 'ghost');
    for (const s of [-1, 1]) ell(P(0.72, s * 0.34, 0.25), r * 0.2, r * 0.26, r * 0.1, 'ink');
    ell(P(0.78, 0, -0.1), r * 0.12, r * 0.2, r * 0.12, m || 'ghost');
    ell(P(0.74, 0, -0.62), r * 0.24, r * (0.25 + mo * 0.45), r * 0.12, 'ink');
  };
  face([Lx(B + 40) + 9, B + 40, 7], 3.6, [0.5, 0.1, 0.85], mouth * 0.8, 'ghost');
  face([Lx(B + 60) + 3, B + 62, 12], 3.2, [0.1, 0.1, 1], mouth, 'gauzeP');
  face([Lx(B + 24) + 1, B + 22, 8], 2.6, [0.2, 0.2, 1], mouth * 0.7, 'ghost');
  // ---- the arms: long, shroud-wound, grey bone hands
  const top = B + 92, shN = [Lx(top) + 6, top - 4, 10], shF = [Lx(top) + 2, top - 4, -11];
  const haN = wind ? [Lx(top) + 8, top - 22 + ph * 2, 12] : atk ? [Lx(top) + 30, top - 14 - ph * 6, 12] : [Lx(top) + 20 + Math.sin(T * TAU) * 2, top - 34, 12];
  const haF = wind ? [Lx(top) + 4, top - 20 + ph * 2, -10] : atk ? [Lx(top) + 26, top - 4 + ph * 3, -10] : [Lx(top) + 12, top - 40, -12];
  for (const [sh, ha, near] of [[shF, haF, false], [shN, haN, true]]) {
    const el = zhIK(sh, ha, 20, 20, wind ? [-0.4, -0.6, near ? 1 : -1] : [-0.4, -1, near ? 0.5 : -0.5]);
    V.tube([sh, el, ha], u => 3.2 - u * 1.4, near ? 'gauzeP' : 'gauze', { ns: 22, nt: 14, su: 20, sv: 30, dk: near ? 0 : 0.25, fold: (u, g) => 0.5 * Math.sin(u * 30 + g * 2) });
    const d = zhN(zhS(ha, el)), sd = zhN([d[1], -d[0], 0.4]);
    for (let f = 0; f < 4; f++) { const sp = wind ? 0.6 : atk ? 1.6 : 1; cap([ha, zhA(ha, zhA(zhM(d, 4), zhM(sd, (f - 1.5) * 1.3 * sp))), zhA(ha, zhA(zhM(d, 7.5 - Math.abs(f - 1.5)), zhA(zhM(sd, (f - 1.5) * 2 * sp), [0, -1.5, 0])))], 0.7, 0.45, 'ghost'); }
    ell(ha, 2, 2.2, 1.8, 'ghost');
  }
  // ---- the hood and the great face: long, grey, the mouth torn open down to the breast
  const HC = [Lx(B + 104) + 4, B + 104, 3];
  rings([[HC[1] - 14, 15 * narrow, 11, 14, HC[0] - 3, 0], [HC[1] - 2, 13, 11, 12, HC[0] - 2, -1], [HC[1] + 9, 10.5, 8, 10, HC[0] - 4, -1], [HC[1] + 17, 6, 4, 6, HC[0] - 10, 0], [HC[1] + 22, 1.5, 1, 1.5, HC[0] - 20, 0]], 'gauze',
    { a0: 1.15, a1: TAU - 0.15, ns: 48, nt: 24, su: 60, sv: 14, inside: 1.2, fold: (a, t) => (1.4 * Math.sin(a * 7 + 1) + 0.6 * Math.sin(a * 13)) * (1 - t) * (1 - t) + (a < 1.6 ? 1.6 * (1.6 - a) : 0) });
  const FD = zhN([0.75, -0.15, 0.62]), SD = zhN([FD[2], 0, -FD[0]]), FP = (u, v, w) => zhA(HC, zhA(zhM(FD, u), zhA(zhM(SD, v), [0, w, 0])));
  ell(FP(2, 0, -3), 5.8, 10, 5, 'ghost');                                       // the long face
  ell(FP(4.4, 0, 4), 4.6, 3, 3.2, 'ghost');                                      // the brow
  for (const s of [-1, 1]) { ell(FP(6.2, s * 2.3, 1.2), 1.3, 2, 0.8, 'ink'); ell(FP(6.6, s * 2.2, 1), 0.45, 0.45, 0.3, 'gBreath', { em: 0.3 + mouth * 0.3 }); }
  ell(FP(7, 0, -1.4), 0.9, 2, 0.8, 'ghost');                                     // the nose
  const mh = 3 + mouth * 5;
  ell(FP(6.2, 0, -5 - mh * 0.5), 2 + mouth * 0.8, mh, 1.2, 'ink');               // the wail
  for (let i = -2; i <= 2; i++) ell(FP(6.8, i * 0.8, -4.6 + Math.abs(i) * 0.3), 0.3, 0.6, 0.3, 'bone');
  cap([FP(5.4, -2.4, -4), FP(5.8, -2.6, -5 - mh), FP(5, -1.6, -7 - mh)], 0.6, 0.4, 'ghost');   // the stretched cheeks
  cap([FP(5.4, 2.4, -4), FP(5.8, 2.6, -5 - mh), FP(5, 1.6, -7 - mh)], 0.6, 0.4, 'ghost');
  // ---- the blast
  const MO = FP(8, 0, -5 - mh * 0.5);
  return (w, V2) => {
    const C = V2.C, mo = C(MO);
    if (wind) {   // the world's air streaming in toward the mouth
      for (let i = 0; i < 18 + ph * 10; i++) {
        const g = zhH(i, 81) * TAU, r0 = (22 + zhH(i, 82) * 30) * ZH_K * (1 - ph * 0.15), len = (5 + zhH(i, 83) * 7) * ZH_K;
        for (let s = 0; s < len; s++) { const r = r0 - s; w.px(mo[0] + Math.cos(g) * r, mo[1] + Math.sin(g) * r * 0.8, [200, 226, 240], 0.15 + 0.5 * s / len); }
      }
    }
    if (atk) {   // the blast: a cone of grey-white wind, brightest at the mouth, streaked along its length
      const k = [1, 0.8, 0.45][ph], ax = -0.24, R0 = [70, 92, 96][ph] * ZH_K, sp = 0.3;
      for (let y = Math.max(0, Math.floor(mo[1] - R0)); y < Math.min(w.H, mo[1] + R0); y++) for (let x = Math.floor(mo[0]); x < Math.min(w.W, mo[0] + R0); x++) {
        const dx = x - mo[0], dy = y - mo[1], r = Math.hypot(dx, dy); if (r < 2 || r > R0) continue;
        const g = Math.atan2(dy, dx) - ax, e = Math.abs(g) / sp; if (e > 1) continue;
        const st = zhVN(g * 40, r * 0.04 - ph * 1.5, 7), u = r / R0, inner = ph === 2 ? u > 0.35 : true;
        if (!inner) continue;
        const a = (1 - e * e) * (1 - u * 0.8) * (0.25 + st * 0.9) * k; if (a < 0.1) continue;
        w.px(x, y, st > 0.6 && e < 0.6 ? [248, 252, 255] : st > 0.4 ? [196, 222, 236] : [130, 160, 184], Math.min(0.92, a));
      }
    }
    // the twist of air under it: faint streaks
    const bs = C([Lx(B), B - 6, 0]);
    for (let i = 0; i < 10; i++) { const y = bs[1] + i * 1.5, x = bs[0] + Math.sin(i * 0.9 + T * TAU) * 4; for (let s = -3; s <= 3; s++) w.px(x + s + (i & 1) * 2, y, [150, 180, 200], 0.18 * (1 - i / 10)); }
  };
}

// ------------------------------------------------------------------- A SILENT ONE (Ur-Nihl, the Silence)
// Not a creature: a place where the world has been cut out in the shape of one, three men tall. Matte void, no face;
// only a thin broken rim of violet-white light where the edge of the world curls round it, and flakes of that light
// coming loose. Far too tall, far too thin, the legs running down to points that do not touch the ground, arms
// hanging past the knees and fingers as long as forearms. Above the head a crown that is not there: only its rim of
// light, round nothing. Wind: it draws itself up, the arms lift and the fingers fan wide, the rim burns and the crown
// flares. Attack: it folds forward and the long hand rakes down through the air, leaving a cut of light.
zhRegister('hhollow', { W: 132, H: 156, OX: 52, OY: 150, walkK: 3, paint: zhSilent });
function zhSilent(V, pose, ph) {
  const { cap, ell, rings } = V;
  const walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk', idle = pose === 'idle';
  const T = walk ? ph / 8 : idle ? ph / 4 : ph / 3;
  const fl = walk ? Math.sin(T * TAU) * 1.2 : idle ? Math.sin(T * TAU) * 0.8 : 0;
  let lean = 0, rise = 0, burn = 0, tilt = 0;
  if (walk) lean = 2;
  if (wind) { rise = [2, 4, 6][ph]; burn = [0.3, 0.6, 1][ph]; lean = [-1, -3, -4][ph]; tilt = [0.05, 0.1, 0.15][ph]; }
  if (atk) { lean = [14, 11, 7][ph]; rise = [-3, -4, -2][ph]; burn = [1, 0.7, 0.3][ph]; }
  const B = 6 + fl + rise, em = burn;
  const Lx = y => lean * Math.pow(Math.max(0, y - B - 40) / 90, 1.2);
  const vm = { em };
  // ---- legs: two long shanks running down to points
  const hipY = B + 62, sw = walk ? Math.sin(T * TAU) : 0;
  for (const [z, k, m] of [[-4, -1, 'voidD'], [4, 1, 'void']]) {
    const hip = [Lx(hipY) + k * 0.5, hipY, z], knee = [Lx(hipY) + 3 + sw * k * 4, B + 32, z * 1.2], tip = [sw * k * 7 + (atk ? -k * 3 : 0), B, z * 1.4];
    cap([hip, knee], 3.2, 2.4, m, vm); cap([knee, tip], 2.4, 0.5, m, vm);
  }
  // ---- the body: narrow, a hollow chest, shoulders like a coat-hanger
  rings([[hipY - 2, 5, 4, 4], [hipY + 8, 4, 3.5, 3.5], [hipY + 22, 5.5, 4.2, 4.2], [hipY + 36, 8, 5, 5], [hipY + 42, 9, 4.2, 4.2], [hipY + 45, 3, 2.5, 2.5]].map(r => [r[0], r[1], r[2], r[3], Lx(r[0]), 0]), 'void', { ns: 36, nt: 30, em });
  const shY = hipY + 41, neck = [Lx(shY + 6) + 1, shY + 6, 0];
  cap([[Lx(shY), shY, 0], neck], 1.8, 1.4, 'void', vm);
  // ---- the head: long, smooth, featureless, bowed a little
  const HD = [Lx(shY + 14) + 2.5 + tilt * 10, shY + 14, 0];
  ell(HD, 4.2, 7.4, 4.4, 'void', vm);
  ell(zhA(HD, [2, -4, 0.4]), 2.8, 4, 3, 'void', vm);
  // ---- the arms: hanging past the knees (lifting in the wind-up, raking in the attack), the fingers far too long
  const shN = [Lx(shY) + 1, shY - 1, 8.5], shF = [Lx(shY) - 1, shY - 1, -8.5];
  let hN, hF, fanN = 0.25, fanF = 0.25, dN = [0.1, -1, 0], dF = [0.05, -1, 0];
  if (idle || walk) { hN = [Lx(shY) + 13 - sw * 5, B + 26 + (idle ? T * 0 : 0), 14]; hF = [Lx(shY) - 11 + sw * 5, B + 28, -13]; dN = [0.25, -1, 0]; dF = [-0.2, -1, 0]; }
  if (wind) { hN = [Lx(shY) + 14 + ph * 2, shY + 2 + ph * 4, 13]; hF = [Lx(shY) - 13 - ph * 2, shY + 2 + ph * 6, -12]; fanN = fanF = 0.4 + ph * 0.35; dN = [0.4, 1, 0]; dF = [-0.4, 1, 0]; }
  if (atk) { hN = [[Lx(shY) + 40, shY - 30, 12], [Lx(shY) + 36, B + 20, 12], [Lx(shY) + 30, B + 18, 12]][ph]; hF = [Lx(shY) - 8, shY - 20, -11]; dN = [[0.7, -0.8, 0], [0.4, -1, 0], [0.2, -1, 0]][ph]; fanN = 0.5; }
  const arm = (sh, ha, d, fan, m, near) => {
    const el = zhIK(sh, ha, 30, 30, near ? [0.6, 0, 1] : [-0.6, 0, -1]);
    cap([sh, el], 1.9, 1.5, m, vm); cap([el, ha], 1.5, 1.1, m, vm); ell(ha, 1.8, 2.4, 1.4, m, vm);
    const dd = zhN(d), sd = zhN([dd[1], -dd[0], near ? 0.5 : -0.5]);
    for (let f = 0; f < 4; f++) {
      const o = f - 1.5, len = 13 - Math.abs(o) * 1.5, k1 = zhA(ha, zhA(zhM(dd, 4), zhM(sd, o * 1.2 * (1 + fan)))), k2 = zhA(k1, zhA(zhM(dd, len * 0.55), zhM(sd, o * fan * 4))), tp = zhA(k2, zhA(zhM(dd, len * 0.5), zhA(zhM(sd, o * fan * 3), [0, 0, 0])));
      cap([ha, k1, k2, tp], 0.7, 0.25, m, vm);
    }
    return el;
  };
  arm(shF, hF, dF, fanF, 'voidD', false);
  arm(shN, hN, dN, fanN, 'void', true);
  // ---- the crown of nothing: a broken rim of light, tilted, round the empty space above the head
  const CC = [HD[0] - 1, HD[1] + 11 + burn * 2, 0], cr = 8 + burn * 2;
  for (let k = 0; k < 7; k++) { const g0 = k / 7 * TAU + 0.2, g1 = g0 + 0.55, pts = []; for (let j = 0; j <= 4; j++) { const g = g0 + (g1 - g0) * j / 4; pts.push(zhA(CC, [Math.cos(g) * cr, Math.sin(g) * cr * 0.28 + (k % 2 ? 0 : 1.6) * (j === 2 ? 1 : 0.4), Math.sin(g) * cr])); } cap(pts, 0.6, 0.6, 'gVoid', { em: 0.35 + burn * 0.5 }); }
  return (w, V2) => {
    const C = V2.C, S = V2.S, WW = S.W, HH = S.H;
    // the edge of the world curling round it: a broken rim of violet-white on its lit outer edges
    for (let y = 1; y < HH - 1; y++) for (let x = 1; x < WW - 1; x++) {
      const i = y * WW + x, m = S.M[i]; if (m !== ZHMI.void && m !== ZHMI.voidD) continue;
      const lf = S.M[i - 1] < 0, up = S.M[i - WW] < 0, rt = S.M[i + 1] < 0, dn = S.M[i + WW] < 0; if (!lf && !up && !rt && !dn) continue;
      const nz = zhVN(x * 0.25, y * 0.12, 21), hot = (lf || up) ? 1 : 0.45;
      if (nz < 0.36 - burn * 0.2) continue;
      const k = Math.min(1, (nz - 0.3) * 2.2 * hot + burn * 0.4);
      w.px(x, y, k > 0.75 ? [236, 228, 255] : k > 0.45 ? [168, 146, 236] : [92, 70, 160], 0.95);
    }
    // flakes of the rim-light coming loose from the edges, drifting up
    let n = 0;
    for (let i = 0; i < 900 && n < 18 + burn * 30; i++) {
      const x = Math.floor(zhH(i, 101) * WW), y = Math.floor(zhH(i, 102) * HH); if (S.M[y * WW + x] < 0) continue;
      const lft = x > 0 && S.M[y * WW + x - 1] < 0, up = y > 0 && S.M[(y - 1) * WW + x] < 0, rt = x < WW - 1 && S.M[y * WW + x + 1] < 0; if (!lft && !up && !rt) continue;
      const dy = 2 + zhH(i, 103) * 10, dx = (zhH(i, 104) - 0.5) * 6;
      w.px(x + dx, y - dy, zhH(i, 105) < 0.3 ? [240, 232, 255] : [150, 124, 220], 0.4 + 0.5 * zhH(i, 106)); n++;
    }
    if (atk && ph <= 1) {   // the cut of light the hand leaves
      const a = C([Lx(hipY + 40) + 44, hipY + 38, 12]), b = C([Lx(hipY) + 34, B + 14, 12]);
      for (let s = 0; s <= 1; s += 0.004) { const x = a[0] + (b[0] - a[0]) * s + Math.sin(s * Math.PI) * 18, y = a[1] + (b[1] - a[1]) * s, wd = Math.sin(s * Math.PI) * (ph ? 2 : 4);
        for (let k = -wd; k <= wd; k++) w.px(x + k, y, Math.abs(k) < wd * 0.35 ? [250, 246, 255] : [140, 110, 220], (ph ? 0.5 : 0.85) * (1 - Math.abs(k) / (wd + 1))); }
    }
  };
}

// ------------------------------------------------------------------- THE CARRION WARDEN (Act I boss; the Ossuary Matron)
// The jailer of the dead, three men tall even stooped: a hunched giant of grey dead meat, its head shut in a rusted
// cage-helm that crows have nested on, meat-hooks hung from the cage's rim, coals for eyes inside it. On its back, a
// great stitched sack of the dead it has gathered, a hand and a foot hanging out of the seams. A leather apron black
// with old blood; rag wraps on the shins; one arm hanging to the knuckles, the other fist wound in a heavy chain with
// a butcher's hook on the end. Walk: a rolling lumber, the chain dragging. Wind (the slam and the charge): the fist
// goes up and the chain is whirled overhead. Attack: the hook is flung out and brought crashing down.
// Reused for the Ossuary Matron, tinted bone-white through pal.tint over the finished pixels.
zhRegister('boss', { W: 196, H: 150, OX: 78, OY: 144, walkK: 3.8, tintK: 0.6, paint: zhWarden });
function zhWarden(V, pose, ph, pal) {
  const { cap, ell, plate, surf, rings } = V;
  const walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk', idle = pose === 'idle';
  const T = walk ? ph / 8 : idle ? ph / 4 : ph / 3, a = T * TAU, sw = walk ? Math.sin(a) : 0;
  let bob = walk ? -Math.abs(Math.cos(a)) * 2.2 + 1.1 : idle ? Math.sin(a) * 0.8 : 0, lean = walk ? 2 : 0, crouch = 0, roll = walk ? sw * 2 : 0;
  if (wind) { lean = [-2, -3, -4][ph]; crouch = [1, 2, 2][ph]; }
  if (atk) { lean = [8, 12, 9][ph]; crouch = [2, 7, 5][ph]; }
  const up = bob - crouch, U = (x, y, z) => [x + lean * Math.max(0, (y - 30) / 80), y + up * Math.min(1, y / 40), z];   // the upper body rides the bob and the stoop
  // ---- the legs: thick grey meat, rag-wound shins, wide flat feet
  for (const [k, z, m] of [[-1, -12, 'meat'], [1, 13, 'meat']]) {
    const lift = walk ? Math.max(0, Math.sin(a + (k > 0 ? 0 : Math.PI))) * 5 : 0, st = walk ? sw * 12 * k : atk && ph ? k * 10 : wind ? k * 3 : k * 3;
    const hip = U(k * 3, 42, z * 0.8), an = [st + 2, 5 + lift, z], kn = zhIK(hip, an, 22, 22, [1, 0.2, 0]);
    cap([hip, kn], 9, 7.5, m, { dk: k < 0 ? 0.2 : 0 }); cap([kn, an], 7, 5.4, m, { dk: k < 0 ? 0.2 : 0 }); ell(kn, 7.4, 7, 7, m, { dk: k < 0 ? 0.2 : 0 });
    V.tube([zhL(kn, an, 0.2), zhL(kn, an, 0.95)], u => 6.6 - u * 1.2, 'rag', { ns: 16, nt: 18, su: 24, sv: 20, dk: k < 0 ? 0.2 : 0, fold: (u, g) => 0.7 * Math.sin(u * 22 + g) + 0.4 * Math.sin(g * 5) });
    cap([zhA(an, [-3, -1.5, 0]), zhA(an, [8, -3.2 + lift * 0.2, 0])], 5, 4, m, { dk: k < 0 ? 0.2 : 0 });
    for (let t = 0; t < 4; t++) ell(zhA(an, [10, -3.6 + lift * 0.2, (t - 1.5) * 2.4]), 1.6, 1.4, 1.4, m);
  }
  // ---- the body: a hanging gut, a barrel chest thrust forward, the great hunch of the back
  const BR = [[28, 15, 13, 13, 4], [40, 20, 18, 16, 6], [52, 22, 19, 17, 8], [66, 22, 18, 19, 8], [80, 21, 16, 20, 5], [92, 16, 12, 16, 1], [99, 8, 6, 8, -2]];
  rings(BR.map(([y, rx, rf, rb, cx]) => { const q = U(cx + roll * 0.3, y, 0); return [q[1], rx, rf, rb, q[0], 0]; }), 'meat', { ns: 60, nt: 40, su: 50, sv: 40, mat: (s, t) => zhVN(s * 9, t * 6, 19) > 0.66 ? 'meatB' : 'meat',
    fold: (g, t) => (zhVN(g * 5, t * 7, 11) - 0.5) * 2.4 + (t > 0.4 && t < 0.65 ? 1.2 * Math.sin((t - 0.4) / 0.25 * Math.PI) * Math.max(0, Math.cos(g)) : 0) });
  cap([U(10, 86, 0), U(22, 83, 2), zhA(U(27, 82, 5), [-4, -1, 0])], 8, 6.5, 'meat');   // the thick neck
  // folds of loose skin sagging under the chest and over the hips
  for (const [y, r, cx] of [[62, 23, 9], [40, 21, 7]]) surf((s2, t) => { const g = -1.3 + s2 * 2.8; return U(cx + Math.cos(g) * (r + 0.5 + t * 1.2), y - t * 3.5, Math.sin(g) * (r + 0.5 + t * 1.2)); }, 30, 3, 'meat', { su: 20, sv: 4 });
  // iron hooks driven into the back, the sack hung from them
  for (const [x, y, z] of [[-8, 86, 12], [-2, 96, 8]]) { const b = U(x, y, z); cap([b, zhA(b, [2, 3, 1]), zhA(b, [0, 5, 2]), zhA(b, [-2, 4, 2])], 0.8, 0.5, 'iron'); cap([zhA(b, [-2, 4, 2]), zhA(b, [-10, 2, 4])], 0.5, 0.5, 'iron'); }
  // stitched wounds across the shoulder and flank
  for (const [x0, y0, z0, x1, y1, z1] of [[0, 94, 12, 14, 84, 16], [-4, 58, 16, 6, 44, 19]]) { const a2 = U(x0, y0, z0), b2 = U(x1, y1, z1); cap([a2, b2], 0.6, 0.6, 'blood'); for (let i = 1; i < 6; i++) { const m = zhL(a2, b2, i / 6); cap([zhA(m, [-1.2, -1, 0.6]), zhA(m, [1.2, 1, 0.6])], 0.35, 0.35, 'rag'); } }
  ell(U(4, 31, 0), 16, 10, 14, 'meat');                                  // the seat
  ell(U(15, 50, 3), 15, 16, 16, 'meat');                                 // the hanging gut
  ell(U(19, 76, 6), 10, 7, 12, 'meat'); ell(U(17, 75, -8), 9, 7, 10, 'meat', { dk: 0.15 });   // the slabs of the chest
  ell(U(28, 48, 13), 1.4, 1.8, 1, 'meatB');                               // the navel

  ell(U(-5, 90, 0), 17, 13, 17, 'meat');                                 // the hunch
  // a mantle of rags over the hunch and the shoulders, torn at its edge
  rings([[105, 7, 6, 7, -4, 0], [99, 18, 17, 18, -3, 0], [89, 25, 29, 24, 1, 0], [74, 28, 31, 26, 3, 0]].map(r => { const q = U(r[4], r[0], 0); return [q[1], r[1], r[2], r[3], q[0], 0]; }), 'rag',
    { ns: 96, nt: 24, su: 90, sv: 10, inside: 0.5, tear: (g, t) => t > 0.62 + 0.38 * zhH(Math.floor(g * 15), 23), fold: (g, t) => t * (0.9 * Math.sin(g * 11) + 0.5 * Math.sin(g * 23 + 1)), hem: g => -6 * Math.pow(Math.max(0, Math.sin(g * 7 + 1)), 3) - 3 * zhH(Math.floor(g * 12), 5) });
  // stitches across the belly, a butcher's seam
  for (let i = 0; i < 7; i++) { const p = U(18 + i * 0.4, 58 - i * 3.6, 14 - i * 0.2); cap([zhA(p, [-1.6, 0.5, 0.8]), zhA(p, [1.6, -0.5, 0.8])], 0.45, 0.45, 'rag'); }
  cap([U(18, 60, 13.5), U(20.5, 34, 12)], 0.6, 0.6, 'blood');
  // the apron: black leather stiff with blood, hung from the chest to the knees
  surf((s, t) => { const y = 80 - t * 62, g = -0.25 + s * 2.1, r = (t < 0.5 ? 17 + t * 12 : 23 - (t - 0.5) * 6), fo = t * 0.8 * Math.sin(s * 14 + 1);
      if (t > 0.94 && zhH(Math.floor(s * 9), 13) < 0.5) return null; return U(10 + Math.cos(g) * (r + 2) + t * 3 + fo, y, Math.sin(g) * (r + 2) * 0.95 + fo); },
    48, 44, 'apron', { su: 30, sv: 30, inside: 0.5, mat: (s, t) => (zhVN(s * 6, t * 5, 17) + zhH(Math.floor(s * 48), Math.floor(t * 44)) * 0.08 > 0.64 - t * 0.12 ? 'blood' : 'apron') });
  cap([U(-6, 75, 18), U(8, 80, 18), U(22, 78, 12)], 0.9, 0.9, 'apron');   // the strap
  // ---- the sack of the dead on its back, stitched, bulging, a hand and a foot hanging out
  const SC = U(-18 + roll * 0.4, 88, -6);
  ell(SC, 20, 22, 17, 'rag'); ell(zhA(SC, [-6, 12, 2]), 13, 12, 12, 'rag'); ell(zhA(SC, [-10, -8, 4]), 12, 12, 11, 'rag');
  for (const [dx, dy, dz, r] of [[-12, 4, 14, 5], [-2, 16, 12, 4.4], [-18, -12, 10, 4.6], [4, -6, 15, 4]]) ell(zhA(SC, [dx, dy, dz]), r, r * 1.1, r * 0.6, 'rag');   // the bulges of what is inside
  for (let i = 0; i < 9; i++) { const p = zhA(SC, [-2 - i * 1.6, 22 - i * 5, 14 - Math.abs(i - 4) * 0.8]); cap([zhA(p, [-1.4, 0.4, 0.5]), zhA(p, [1.4, -0.4, 0.5])], 0.5, 0.5, 'apron'); }
  cap([U(10, 92, 8), zhA(SC, [8, 10, 12]), zhA(SC, [-4, -20, 14]), U(4, 60, 16)], 1.4, 1.4, 'apron');   // the rope over the shoulder
  { const hb = zhA(SC, [-19, -14, 6]), sway = walk ? sw * 2 : 0, ht = zhA(hb, [-4 + sway, -14, 2]); cap([hb, ht], 2.2, 1.8, 'meatB'); for (let f = 0; f < 4; f++) cap([ht, zhA(ht, [(f - 1.5) * 1.1 + sway * 0.3, -4.5, 0.5])], 0.6, 0.45, 'meatB'); }
  { const fb = zhA(SC, [-22, 8, 0]), ft = zhA(fb, [-9, 2, 3]); cap([fb, ft], 2.4, 2, 'meatB'); cap([ft, zhA(ft, [-2, -5, 1])], 2, 1.6, 'meatB'); }
  // ---- the cage-helm: rusted bars round a dark head, coals for eyes, a crows' nest on top, meat-hooks at the rim
  const HC = U(27, 82, 5), hr = 9.5;
  ell(HC, 7.5, 8, 7, 'meat', { dk: 0.9 });
  const eye = wind ? 0.6 + ph * 0.2 : atk ? 1 : 0.4;
  for (const s of [-1, 1]) ell(zhA(HC, [5, 1, 3 + s * 2.8]), 1.1 + eye * 0.4, 0.9 + eye * 0.3, 0.8, 'gEmb', { em: 0.3 + eye * 0.7 });
  for (let k = 0; k < 11; k++) { const g = k / 11 * TAU, c = Math.cos(g), s = Math.sin(g), pts = []; for (let j = 0; j <= 6; j++) { const v = j / 6 * Math.PI * 0.55, rr = hr * Math.cos(v * 0.9) + 0.6; pts.push(zhA(HC, [c * rr, -8 + j * 3.4 + Math.sin(v) * 2, s * rr])); } cap(pts, 0.75, 0.6, 'rust'); }
  for (const [yy, rr] of [[-8, hr + 0.6], [1, hr + 1]]) { const pts = []; for (let j = 0; j <= 24; j++) { const g = j / 24 * TAU; pts.push(zhA(HC, [Math.cos(g) * rr, yy, Math.sin(g) * rr])); } cap(pts, 1.2, 1.2, 'rust'); }
  cap([zhA(HC, [0, 12, 0]), zhA(HC, [0, 15, 0])], 1.4, 0.8, 'rust');
  // meat-hooks hanging from the lower rim, swinging
  const hs = walk ? sw * 1.6 : wind ? -ph * 0.8 : atk ? 1.5 : 0;
  for (const g of [0.3, 1.3, 2.4, -0.7]) { const b = zhA(HC, [Math.cos(g) * (hr + 1), -8.5, Math.sin(g) * (hr + 1)]), e = zhA(b, [hs, -7, 0]); cap([b, e], 0.45, 0.45, 'iron'); cap([e, zhA(e, [0, -2.4, 0]), zhA(e, [1.8, -2.8, 0]), zhA(e, [2.2, -1, 0])], 0.7, 0.4, 'iron'); }
  // the nest and the crows
  const NC = zhA(HC, [-1, 12.5, 0]);
  for (let i = 0; i < 14; i++) { const g = i * 2.4, r = 5 + zhH(i, 21) * 3; cap([zhA(NC, [Math.cos(g) * r, zhH(i, 22) * 2, Math.sin(g) * r]), zhA(NC, [Math.cos(g + 1.6) * r * 0.8, 1 + zhH(i, 23) * 2, Math.sin(g + 1.6) * r * 0.8])], 0.55, 0.45, i % 3 ? 'rag' : 'apron'); }
  const crow = (c, fx, open) => {
    ell(c, 3.6, 2.8, 2.6, 'crow'); ell(zhA(c, [fx * 3, 2.6, 0]), 2, 2, 1.8, 'crow');
    cap([zhA(c, [fx * 4.4, 2.8, 0]), zhA(c, [fx * 7, 2 - open, 0])], 0.8, 0.3, 'iron');
    ell(zhA(c, [fx * 3.6, 3.2, 1.4]), 0.4, 0.4, 0.3, 'gEmb', { em: 0.5 });
    cap([zhA(c, [-fx * 3, 0.5, 0]), zhA(c, [-fx * 7, -1.5, 0])], 1.6, 0.6, 'crow');
    if (open) { plate([zhA(c, [0, 1, 1]), zhA(c, [-fx * 2, 7, 2]), zhA(c, [-fx * 7, 5, 2.5]), zhA(c, [-fx * 4, 1, 1.5])], 'crow', { bevel: 0.6 }); }
  };
  const cf = wind ? 1 : atk ? 1 : 0;
  crow(zhA(NC, [2, 3.5, 2]), 1, cf * (1 + (ph & 1))); crow(zhA(NC, [-3.5, 3, -2.5]), -1, 0);
  // ---- the arms: one hanging to the knuckles, the other wound in the chain
  const shF = U(4, 84, -19), shN = U(12, 82, 19);
  const haF = walk ? [8 - sw * 10, 16, -20] : atk ? U(-10, 50, -20) : [4, 14, -21];
  let haN;
  if (idle || walk) haN = [32 + sw * 6, 36 + bob, 22];
  if (wind) haN = [U(24, 96, 16), U(14, 124, 12), U(8, 128, 10)][ph];
  if (atk) haN = [U(44, 76, 18), U(44, 44, 18), U(40, 42, 18)][ph];
  const bigArm = (sh, ha, hint, dk) => {
    const el = zhIK(sh, ha, 28, 28, hint);
    cap([sh, el], 9, 7.4, 'meat', { dk }); cap([el, ha], 7.4, 6.4, 'meat', { dk }); ell(sh, 10, 9, 9, 'meat', { dk }); ell(el, 7.4, 7, 7, 'meat', { dk });
    ell(ha, 6.4, 5.8, 6, 'meat', { dk });
    for (let f = 0; f < 4; f++) ell(zhA(ha, [3 + (f === 3 ? -1 : 0), -2 - (f === 3 ? 1 : 0), (f - 1.5) * 2.6]), 2.2, 2.2, 1.8, 'meat', { dk });
    V.tube([zhL(el, ha, 0.35), zhL(el, ha, 0.75)], () => 7.6, 'rag', { ns: 8, nt: 16, su: 10, sv: 16, dk, fold: (u, g) => 0.6 * Math.sin(u * 16 + g * 2) });
    return el;
  };
  bigArm(shF, haF, [-0.5, -0.2, -1], 0.2);
  bigArm(shN, haN, wind ? [0.3, -0.5, 1] : [0.2, -1, 0.6], 0);
  // ---- the chain and the butcher's hook
  let CH = [];
  const H0 = zhA(haN, [2, -2, 3]);
  if (idle || walk) { const end = [H0[0] + 10 - sw * 8, 1.5, 24]; for (let i = 0; i <= 18; i++) { const u = i / 18; CH.push([H0[0] + (end[0] - H0[0]) * u + Math.sin(u * Math.PI) * 4, H0[1] + (end[1] - H0[1]) * Math.pow(u, 0.8) - Math.sin(u * Math.PI) * 2, H0[2] + (end[2] - H0[2]) * u]); } }
  if (wind) { const g0 = [2.4, 0.9, -0.8][ph], R = 30; for (let i = 0; i <= 18; i++) { const u = i / 18, g = g0 - u * 2.2; CH.push([H0[0] + Math.cos(g) * R * u, H0[1] + 4 + Math.sin(g) * R * 0.35 * u + u * 6, H0[2] + Math.sin(g) * R * 0.5 * u]); } }
  if (atk) { const end = [[112, 40, 20], [104, 3, 20], [100, 2, 20]][ph]; for (let i = 0; i <= 18; i++) { const u = i / 18, sag = ph ? Math.sin(u * Math.PI) * (ph === 1 ? 6 : 2) : -Math.sin(u * Math.PI) * 3; CH.push([H0[0] + (end[0] - H0[0]) * u, H0[1] + (end[1] - H0[1]) * u + sag, H0[2] + (end[2] - H0[2]) * u]); } }
  for (let i = 0; i < CH.length - 1; i++) { const a0 = CH[i], b0 = CH[i + 1], m = zhL(a0, b0, 0.5); if (i % 2) cap([a0, b0], 1.05, 1.05, 'iron'); else { cap([zhA(m, [0, 1.4, 0]), zhA(m, [0, -1.4, 0])], 0.9, 0.9, 'iron'); cap([a0, b0], 0.7, 0.7, 'iron'); } }
  { const E = CH[CH.length - 1], d = zhN(zhS(E, CH[CH.length - 3])), d2 = [d[1] * -1, d[0], 0];
    const hk = (u, v) => zhA(E, zhA(zhM(d, u), zhM(d2, v)));
    cap([hk(0, 0), hk(4, 0), hk(10, 0.5), hk(13.5, 3.5), hk(12.5, 8), hk(9, 9.5), hk(6.5, 7.6)], 1.7, 0.4, 'rust');
    ell(hk(0, 0), 2, 2, 1.6, 'iron'); cap([hk(11, 1), hk(12.5, 5)], 0.8, 0.5, 'blood'); }
  // ---- effects
  return (w, V2) => {
    const C = V2.C;
    if (wind) {   // the whirl: a smear of chain round the fist, overhead
      const c = C(H0), n = 220, g0 = [2.4, 0.9, -0.8][ph];
      for (let i = 0; i < n; i++) { const u = i / n, g = g0 + 0.4 + u * 3.2, R = (30 - zhH(i, 5) * 6) * ZH_K; w.px(c[0] + Math.cos(g) * R, c[1] - (4 + u * 0) * ZH_K - Math.sin(g) * R * 0.35, u > 0.5 ? [110, 104, 100] : [70, 64, 66], 0.2 + 0.6 * (1 - u)); }
    }
    if (atk && ph === 0) {   // the hook's path, flung out
      const a0 = C(H0), e = C(CH[CH.length - 1]);
      for (let s = 0; s < 1; s += 0.003) { const x = a0[0] + (e[0] - a0[0]) * s, y = a0[1] + (e[1] - a0[1]) * s - Math.sin(s * Math.PI) * 30 * ZH_K; for (let k = -2; k <= 2; k++) w.px(x, y + k, [150, 130, 110], 0.35 * (1 - Math.abs(k) / 3) * s); }
    }
    if (atk && ph === 1) {   // it lands: dust, grit and blood thrown up
      const p = C([104, 1, 20]);
      for (let i = 0; i < 60; i++) { const g = -Math.PI * (0.05 + 0.9 * zhH(i, 71)), r = (3 + zhH(i, 72) * 26) * ZH_K; w.px(p[0] + Math.cos(g) * r, p[1] + Math.sin(g) * r * 0.6, i % 5 ? [96, 80, 62] : pal.tint ? [140, 130, 110] : [140, 20, 24], 0.55 + zhH(i, 73) * 0.4); }
      for (let i = 0; i < 30; i++) w.px(p[0] + (zhH(i, 74) - 0.5) * 40 * ZH_K, p[1] + zhH(i, 75) * 3, [40, 30, 24], 0.6);
    }
  };
}

})();
