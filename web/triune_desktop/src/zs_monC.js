
(function () {  // v0.38 file scope: the sculpted creatures (every top-level name here starts with mc / MC)
// =================================================================== v0.38: Act I creatures C, SCULPTED
// The Pyre-Saint, the Bellwether, the Ossuary Warden and the Marrow Duelist, rebuilt at the reference level with the
// heroes' method (zz_hero_ossumancer.js): every part is a 3D form (tapered tubes, oriented ellipsoids, bevelled plates
// and cloth surfaces with folds and tears) laid into a depth buffer, lit per pixel by one warm key from the upper left,
// a cool rim, bounce light, point lights from its own fire, screen-space cast shadows and contact occlusion, then
// quantized into hand-picked hue-shifted ramps with a coloured, broken outline. Fire, smoke and smears are painted
// after, as clustered tongues that respect the depth buffer.
// Each frame is painted as its `_hr` twin at 1.5x the world grain (one creature pixel = two screen pixels at ZK 0.75);
// the world-grain canvas carries it in `_hr` (b_core.js draws the twin), so c, f, fl, flf all have twins.
// Rig units are half world pixels (a person is ~80 units tall); the camera is the heroes': 'front' is the 3/4 view
// facing right and toward us, 'back' the 3/4 view facing right and away.
const MC_K = 1.5, MC_S = 0.75;
const mcA = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], mcS = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mcM = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
const mcDot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], mcLen = a => Math.hypot(a[0], a[1], a[2]), mcN = a => mcM(a, 1 / (mcLen(a) || 1));
const mcLp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mcCr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mcH = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const mcVN = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), h = (a, b) => mcH(a * 7 + s * 131, b * 13 + s * 17); return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
const mcHex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mcCl = (v, a, b) => v < a ? a : v > b ? b : v;
// two-bone reach: the middle joint bent toward `hint`, the end clamped to the reach
function mcIK(a, b, L1, L2, hint) {
  const d = mcS(b, a), D0 = mcLen(d) || 1e-6, dir = mcM(d, 1 / D0), D = Math.min(D0, L1 + L2 - 0.05);
  const x = (L1 * L1 - L2 * L2 + D * D) / (2 * D), h = Math.sqrt(Math.max(0, L1 * L1 - x * x));
  const pp = mcN(mcS(hint, mcM(dir, mcDot(hint, dir))));
  return [mcA(a, mcA(mcM(dir, x), mcM(pp, h))), mcA(a, mcM(dir, D))];
}

// ------------------------------------------------------------------- materials: hue-shifted ramps, dark to light
const MCM = [], MCMI = {};
function mcMat(name, hexes, o) { MCMI[name] = MCM.length; MCM.push(Object.assign({ name, ramp: hexes.map(mcHex), tex: 0.05, crack: 0, spec: 0, wrap: 0, emis: false, ts: 0.45, aniso: 1, gain: 1, hot: null }, o || {})); }
// a champion's / unique's tint shifts every lit ramp toward its colour (fire and glow keep theirs)
function mcRamp(mat, tint) {
  if (!tint || mat.emis) return mat.ramp; const c = mat._t || (mat._t = {}); if (c[tint]) return c[tint];
  const T = mcHex(tint), tl = (T[0] + T[1] + T[2]) / 3 || 1;
  return (c[tint] = mat.ramp.map(col => { const l = (col[0] + col[1] + col[2]) / 3; return col.map((v, i) => Math.round(mcCl(v + (T[i] * l / tl - v) * 0.42, 0, 255))); }));
}
const MC_FIRE = ['#3c0a10', '#7a160e', '#be360c', '#ec6c16', '#ffa632', '#ffda72', '#fff6da'].map(mcHex);
const MC_WFIRE = ['#6a2410', '#c05a1c', '#f09440', '#ffc878', '#ffe6b4', '#fff8ec', '#ffffff'].map(mcHex);
const MC_SMOKE = ['#141218', '#221f26', '#322e36', '#46414a', '#5c565e'].map(mcHex);

// ------------------------------------------------------------------- the sculpt: forms into a depth buffer, lit per pixel
function McSculpt(W, H) {
  const N = W * H, Z = new Float32Array(N).fill(-1e9), NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N);
  const M = new Int16Array(N).fill(-1), TU = new Float32Array(N), TV = new Float32Array(N), ID = new Int16Array(N).fill(-1), DK = new Float32Array(N), EM = new Float32Array(N);
  let nid = 0;
  const put = (x, y, z, nx, ny, nz, m, tu, tv, id, dk, em) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (z <= Z[i]) return; Z[i] = z; NX[i] = nx; NY[i] = ny; NZ[i] = nz; M[i] = m; TU[i] = tu; TV[i] = tv; ID[i] = id; DK[i] = dk || 0; EM[i] = em || 0; };
  const mi = m => { const v = MCMI[m]; if (v == null) throw new Error('mc mat ' + m); return v; };
  const tri = (a, b, c, n, m, id, dk, tu, tv, em) => {
    const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0]))), y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
    const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]); if (Math.abs(d) < 1e-6) return;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const px = x + 0.5, py = y + 0.5, l1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / d, l2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / d, l3 = 1 - l1 - l2;
      if (l1 < -0.02 || l2 < -0.02 || l3 < -0.02) continue;
      put(x, y, l1 * a[2] + l2 * b[2] + l3 * c[2], n[0], n[1], n[2], m, tu, tv, id, dk, em);
    }
  };
  const FL = [], LT = [], POST = [];
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
    // an ellipsoid on three axis vectors (camera space, each as long as its radius): turns and leans with the body
    egg(c, a, b, d, mn, o) {
      o = o || {}; const m = mi(mn), id = nid++;
      const det = a[0] * (b[1] * d[2] - d[1] * b[2]) - b[0] * (a[1] * d[2] - d[1] * a[2]) + d[0] * (a[1] * b[2] - b[1] * a[2]); if (Math.abs(det) < 1e-9) return id;
      // the inverse of [a b d] (columns)
      const I = [(b[1] * d[2] - d[1] * b[2]) / det, (d[0] * b[2] - b[0] * d[2]) / det, (b[0] * d[1] - d[0] * b[1]) / det,
        (d[1] * a[2] - a[1] * d[2]) / det, (a[0] * d[2] - d[0] * a[2]) / det, (d[0] * a[1] - a[0] * d[1]) / det,
        (a[1] * b[2] - b[1] * a[2]) / det, (b[0] * a[2] - a[0] * b[2]) / det, (a[0] * b[1] - b[0] * a[1]) / det];
      const ex = Math.hypot(a[0], b[0], d[0]), ey = Math.hypot(a[1], b[1], d[1]), la = mcLen(a), lb = mcLen(b);
      const v = [I[2], I[5], I[8]], A2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
      for (let y = Math.floor(c[1] - ey - 1); y <= Math.ceil(c[1] + ey); y++) for (let x = Math.floor(c[0] - ex - 1); x <= Math.ceil(c[0] + ex); x++) {
        const dx = x + 0.5 - c[0], dy = y + 0.5 - c[1], u = [I[0] * dx + I[1] * dy, I[3] * dx + I[4] * dy, I[6] * dx + I[7] * dy];
        const B = u[0] * v[0] + u[1] * v[1] + u[2] * v[2], C2 = u[0] * u[0] + u[1] * u[1] + u[2] * u[2] - 1, disc = B * B - A2 * C2; if (disc < 0) continue;
        const t = (-B + Math.sqrt(disc)) / A2, q = [u[0] + t * v[0], u[1] + t * v[1], u[2] + t * v[2]];
        let nx = I[0] * q[0] + I[3] * q[1] + I[6] * q[2], ny = I[1] * q[0] + I[4] * q[1] + I[7] * q[2], nz = I[2] * q[0] + I[5] * q[1] + I[8] * q[2];
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; if (nz < 0.02) nz = 0.02;
        put(x, y, c[2] + t, nx, ny, nz, m, q[0] * la + q[2] * 2 + (o.tu || 0), q[1] * lb + (o.tv || 0), id, o.dk, o.em);
      }
      return id;
    },
    // a flat plate with bevelled edges and a little dome
    plate(pts, mn, o) {
      o = o || {}; const m = mi(mn), id = nid++, n = pts.length;
      let nx = 0, ny = 0, nz = 0, cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); cx += a[0] / n; cy += a[1] / n; cz += a[2] / n; }
      let l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
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
    // a cloth or flesh surface: fn(s, t) -> camera point (a 4th value darkens it: scorch, grime) or null (a tear)
    surf(fn, ns, nt, mn, o) {
      o = o || {}; const m = mi(mn), id = nid++, G = [];
      for (let i = 0; i <= ns; i++) { const row = []; for (let j = 0; j <= nt; j++) row.push(fn(i / ns, j / nt)); G.push(row); }
      for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) {
        const a = G[i][j], b = G[i + 1][j], c = G[i + 1][j + 1], d = G[i][j + 1]; if (!a || !b || !c || !d) continue;
        const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2], vx = d[0] - b[0], vy = d[1] - b[1], vz = d[2] - b[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        let dk = (o.dk || 0) + ((a[3] || 0) + (c[3] || 0)) * 0.5; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; dk += o.inside == null ? 0.35 : o.inside; }
        const tu = i / ns * (o.su || 40), tv = j / nt * (o.sv || 20);
        tri(a, b, c, [nx, ny, nz], m, id, dk, tu, tv, o.em); tri(a, c, d, [nx, ny, nz], m, id, dk, tu, tv, o.em);
      }
      return id;
    },
    // a tongue of fire from its base (camera space) upward: w wide, h tall (hr px); pal is a fire ramp
    flame(x, y, z, w, h, seed, pal, lean, light) { FL.push({ x, y, z, w, h, seed, pal: pal || MC_FIRE, lean: lean || 0 }); if (light !== 0) LT.push({ x, y: y - h * 0.35, z: z + 2, r: 10 + h * 1.9, k: (light || 1) * Math.min(1.1, 0.25 + h * 0.035) }); },
    light(x, y, z, r, k) { LT.push({ x, y, z, r, k }); },
    post(fn) { POST.push(fn); },
    // light, shade, quantize, outline
    render(o) {
      o = o || {};
      const c = mkCanvas(W, H), cx = c.getContext('2d'), img = cx.createImageData(W, H), D = img.data, IX = new Int8Array(N).fill(-1), HOT = new Int8Array(N).fill(-1);
      const nrm = v => { const l = Math.hypot(v[0], v[1], v[2]); return [v[0] / l, v[1] / l, v[2] / l]; };
      const L = nrm(o.L || [-0.68, -0.6, 0.42]), LR = nrm(o.LR || [-0.8, -0.35, -0.45]), BN = nrm([0.35, 0.85, 0.25]), HV = nrm([L[0], L[1], L[2] + 1]);
      const lxy = Math.hypot(L[0], L[1]), sdx = L[0] / lxy, sdy = L[1] / lxy, sdz = L[2] / lxy, amb = o.amb == null ? 0.13 : o.amb, keyK = o.key == null ? 0.82 : o.key;
      const R = MCM.map(m => mcRamp(m, o.tint));
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, mm = M[i]; if (mm < 0) continue;
        const mat = MCM[mm], nr = R[mm].length;
        if (mat.emis) { IX[i] = Math.min(nr - 1, Math.max(0, Math.round((EM[i] || 0.5) * (nr - 1) + (mcVN(TU[i] * 0.5, TV[i] * 0.5, ID[i]) - 0.5) * 1.6))); continue; }
        const nx = NX[i], ny = NY[i], nz = NZ[i];
        let key = nx * L[0] + ny * L[1] + nz * L[2]; if (mat.wrap) key = (key + mat.wrap) / (1 + mat.wrap);
        const lam = Math.max(0, key);
        let sh = 1;
        if (lam > 0.02) for (let k = 2; k <= 14; k++) { const xx = Math.round(x + 0.5 + sdx * k - 0.5), yy = Math.round(y + 0.5 + sdy * k - 0.5); if (xx < 0 || yy < 0 || xx >= W || yy >= H) break; const j = yy * W + xx; if (M[j] >= 0 && Z[j] > Z[i] + sdz * k + 1.6) { sh = 0.3; break; } }
        let occ = 0; for (let e = 0; e < 20; e += 2) { const xx = x + MC_OCC[e], yy = y + MC_OCC[e + 1]; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (M[j] >= 0 && Z[j] > Z[i] + 1.8) occ++; }
        const rim = Math.pow(Math.max(0, nx * LR[0] + ny * LR[1] + nz * LR[2]), 1.4) * (1.1 - nz);
        const bo = Math.max(0, nx * BN[0] + ny * BN[1] + nz * BN[2]);
        let I = (amb + keyK * lam * sh) * (1 - occ * 0.07) + bo * 0.16 * (1 - lam) + rim * (o.rim == null ? 0.7 : o.rim) - DK[i] * 0.3;
        for (let li = 0; li < LT.length; li++) { const l = LT[li], vx = l.x - x, vy = l.y - y; if (vx > l.r || vx < -l.r || vy > l.r || vy < -l.r) continue; const vz = l.z - Z[i], d2 = vx * vx + vy * vy + vz * vz; if (d2 > l.r * l.r || d2 < 1e-4) continue; const d = Math.sqrt(d2); const nd = (nx * vx + ny * vy + nz * vz) / d; if (nd <= 0) continue; const f = 1 - d / l.r; I += nd * f * f * l.k; }
        I *= mat.gain;
        if (mat.tex) I += (mcVN(TU[i] * mat.ts, TV[i] * mat.ts * mat.aniso, mm + ID[i] * 3) - 0.5) * mat.tex * 2;
        let k = Math.round(Math.pow(Math.max(0, I), 1.35) * (nr - 1.25) + 0.1);
        if (mat.crack) {
          const cr = mcVN(TU[i] * 0.34 + ID[i] * 5.3, TV[i] * 0.34, 91), dc = Math.abs(cr - 0.5);
          if (mat.hot && dc < mat.crack) { const hr = R[MCMI[mat.hot]].length; HOT[i] = Math.max(0, Math.min(hr - 1, Math.round((1 - dc / mat.crack) * (hr - 1) * (o.heat == null ? 1 : o.heat) + (mcVN(TU[i] * 0.2, TV[i] * 0.2, 7) - 0.5) * 2))); }
          else if (dc < mat.crack) k -= 2; else if (dc < mat.crack * 2 && (lam > 0.4 || mat.hot)) k += mat.hot ? -1 : 1;
        }
        if (mat.spec && sh > 0.5) { const hs = nx * HV[0] + ny * HV[1] + nz * HV[2]; if (hs > 1 - mat.spec) k = nr - 1; else if (hs > 1 - mat.spec * 2.5) k = Math.max(k, nr - 2); }
        IX[i] = k < 0 ? 0 : k >= nr ? nr - 1 : k;
      }
      // a pixel just behind a nearer form is in its contact shadow
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (M[i] < 0 || MCM[M[i]].emis) continue;
        for (const [dx, dy] of MC_N3) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W) continue; const j = yy * W + xx; if (M[j] >= 0 && Z[j] > Z[i] + 3 && ID[j] !== ID[i]) { IX[i] = Math.max(0, IX[i] - 1); break; } }
      }
      // clean: a lone pixel one tone off the four round it takes their tone (clusters, not noise)
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x; if (M[i] < 0 || HOT[i] >= 0 || MCM[M[i]].spec) continue; const k = IX[i], m = M[i];
        const a = i - 1, b = i + 1, u = i - W, d = i + W;
        if (M[a] === m && M[b] === m && M[u] === m && M[d] === m && IX[a] === IX[b] && IX[b] === IX[u] && IX[u] === IX[d] && IX[a] !== k && Math.abs(IX[a] - k) === 1 && HOT[a] < 0) IX[i] = IX[a];
      }
      for (let i = 0; i < N; i++) if (M[i] >= 0) { const col = HOT[i] >= 0 ? R[MCMI[MCM[M[i]].hot]][HOT[i]] : R[M[i]][IX[i]], q = i * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255; }
      // glow: the lit pixels of emissive forms and hot cracks bleed into what is round them
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (M[i] < 0) continue; const em = MCM[M[i]].emis, ho = HOT[i] >= 2; if (!em && !ho) continue;
        const rr = em ? R[M[i]] : R[MCMI[MCM[M[i]].hot]], gc = rr[Math.min(rr.length - 1, 3)];
        for (const [dx, dy] of MC_N4) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (M[j] < 0 || MCM[M[j]].emis || HOT[j] >= 0) continue; const q = j * 4; D[q] = D[q] * 0.62 + gc[0] * 0.38; D[q + 1] = D[q + 1] * 0.62 + gc[1] * 0.38; D[q + 2] = D[q + 2] * 0.62 + gc[2] * 0.38; }
      }
      // the outline: the darkest tone of what it borders, broken where the light hits the upper-left edge
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (M[i] >= 0) continue;
        let best = -1, lit = false;
        for (const [dx, dy] of MC_N4B) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (M[j] < 0) continue; if (best < 0 || MCM[M[j]].emis) best = j; if ((dx > 0 || dy > 0) && IX[j] >= R[M[j]].length - 2) lit = true; }
        if (best < 0) continue;
        const RR = R[M[best]], em = MCM[M[best]].emis, col = em ? RR[0] : lit ? RR[Math.min(2, RR.length - 1)] : RR[0], q = i * 4;
        if (lit && !em && mcH(x, y) < 0.5) continue;
        D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255;
      }
      // fire: clustered tongues, drawn only where nothing nearer stands
      for (const f of FL) mcDrawFlame(D, W, H, Z, f);
      for (const fn of POST) fn(D, W, H, Z, M);
      cx.putImageData(img, 0, 0); return c;
    }
  };
  return S;
}
// a tongue of fire: a noisy teardrop, hottest low in its middle, its edge the darkest red of the ramp
function mcDrawFlame(D, W, H, Z, f) {
  const { x, y, z, w, h, seed, pal, lean } = f, n = pal.length;
  for (let j = -2; j < h; j++) {
    const t = Math.max(0, j) / h, half = w / 2 * Math.pow(1 - t, 0.7) * (1 + 0.3 * Math.sin(seed * 2.3 + t * 8)) * (j < 0 ? 0.8 : 1);
    const cxp = x + lean * t * h + Math.sin(seed * 1.7 + t * 3.4) * t * w * 0.42;
    const yy = Math.round(y - j); if (yy < 0 || yy >= H) continue;
    for (let xx = Math.floor(cxp - half - 1); xx <= Math.ceil(cxp + half + 1); xx++) {
      if (xx < 0 || xx >= W) continue;
      const d = Math.abs(xx + 0.5 - cxp) / Math.max(0.6, half); if (d > 1.05) continue;
      const nz = mcVN(xx * 0.42 + seed * 5, yy * 0.3 + seed * 3.1, 17);
      const heat = (1 - Math.pow(Math.min(1, d), 1.6)) * Math.pow(1 - t, 0.55) * 1.15 + (nz - 0.5) * 0.55 - (j < 0 ? 0.35 : 0);
      if (heat < 0.07 || (t > 0.55 && nz < 0.3)) continue;
      const i = yy * W + xx; if (Z[i] > z + 0.5) continue;
      const col = pal[Math.max(0, Math.min(n - 1, Math.floor(heat * (n - 0.2))))], q = i * 4;
      D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255;
    }
  }
}
// sparks and smoke, painted onto a finished image
function mcDot4(D, W, H, x, y, col, a) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const q = (y * W + x) * 4, al = a == null ? 1 : a; if (D[q + 3] && al < 1) { D[q] = D[q] * (1 - al) + col[0] * al; D[q + 1] = D[q + 1] * (1 - al) + col[1] * al; D[q + 2] = D[q + 2] * (1 - al) + col[2] * al; } else { D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = Math.max(D[q + 3], Math.round(255 * al)); } }
function mcSmoke(D, W, H, Z, x, y, z, h, seed, dark) {
  for (let j = 0; j < h; j++) {
    const t = j / h, r = 1.2 + t * 3.2, cxp = x + Math.sin(seed + t * 4.5) * (1 + t * 4), yy = Math.round(y - j);
    for (let xx = Math.floor(cxp - r); xx <= Math.ceil(cxp + r); xx++) {
      const d = Math.abs(xx + 0.5 - cxp) / r, nz = mcVN(xx * 0.35 + seed * 3, yy * 0.35 - seed * 2, 5); if (d > 1 || nz < 0.35 + t * 0.35) continue;
      const i = yy * W + xx; if (xx < 0 || yy < 0 || xx >= W || yy >= H || Z[i] > z) continue;
      const k = Math.max(0, Math.min(4, Math.round((1 - d) * 2 + nz * 2.4 - t * 1.5 - (dark ? 1 : 0))));
      mcDot4(D, W, H, xx, yy, MC_SMOKE[k], (0.85 - t * 0.55) * (D[i * 4 + 3] ? 0.8 : 1));
    }
  }
}

// ------------------------------------------------------------------- the camera and the frame
// C(p) for a rig point p = [forward, right, up] (half world px) into the hr canvas; L(v) for a direction
function mcCam(hx, hy, phi, scale) {
  const cp = Math.cos(phi), sp = Math.sin(phi), K = MC_S * (scale || 1);
  const dep = p => p[0] * sp + p[1] * cp;
  const C = p => [hx + (p[0] * cp - p[1] * sp) * K, hy + (-p[2] + dep(p) * 0.4) * K, dep(p) * K];
  const L = v => [(v[0] * cp - v[1] * sp) * K, (-v[2] + dep(v) * 0.4) * K, dep(v) * K];
  return { C, L, cp, sp, back: sp < -0.05, phi, K };
}
// the drawing kit a painter uses: every size in rig units
function mcKit(Sc, cam) {
  const { C, L } = cam, K = cam.K;
  return {
    C, L, cam,
    cap: (pts, r0, r1, m, o) => Sc.cap(pts.map(C), r0 * K, r1 * K, m, o),
    ell: (p, r, m, o) => Sc.egg(C(p), L([r, 0, 0]), L([0, r, 0]), L([0, 0, r]), m, o),
    // an ellipsoid on rig axes f (forward), r (right), u (up) with radii a, b, c
    egg: (p, f, r, u, a, b, c, m, o) => Sc.egg(C(p), L(mcM(mcN(f), a)), L(mcM(mcN(r), b)), L(mcM(mcN(u), c)), m, o),
    plate: (pts, m, o) => Sc.plate(pts.map(C), m, o),
    surf: (fn, ns, nt, m, o) => Sc.surf((s, t) => { const p = fn(s, t); if (!p) return null; const q = C(p); if (p[3]) q.push(p[3]); return q; }, ns, nt, m, o),
    flame: (p, w, h, seed, pal, lean, light) => { const q = C(p); Sc.flame(q[0], q[1], q[2], w * K, h * K, seed, pal, lean, light); },
    light: (p, r, k) => { const q = C(p); Sc.light(q[0], q[1], q[2], r * K, k); },
    post: fn => Sc.post(fn),
  };
}
// a frame the way frameM32 makes one (c, f, fl, flf, w, h, ox, oy, bb), every canvas carrying its 1.5x twin
const MC_TYPES = {};
function mcFrame(type, pose, ph, pal, view) {
  const T = MC_TYPES[type], [W, Hh, ox, oy] = T.F, HW = Math.round(W * MC_K), HH = Math.round(Hh * MC_K);
  const Sc = McSculpt(HW, HH), cam = mcCam(ox * MC_K, oy * MC_K, view === 'back' ? -Math.PI / 4 : Math.PI / 4, T.scale);
  const ro = T.paint(mcKit(Sc, cam), pose, ph, pal || {}, view) || {};
  const hr = Sc.render(Object.assign({ tint: (pal || {}).tint }, ro));
  const lo = src => { const c = mkCanvas(W, Hh), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, W, Hh); c._hr = src; return c; };
  const flip = src => { const f = mkCanvas(src.width, src.height), x = f.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return f; };
  const wht = src => { const q = mkCanvas(src.width, src.height), x = q.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, q.width, q.height); return q; };
  const hf = flip(hr), d = hr.getContext('2d').getImageData(0, 0, HW, HH).data;
  let x0 = HW, y0 = HH, x1 = 0, y1 = 0;
  for (let j = 0; j < HH; j++) for (let i = 0; i < HW; i++) if (d[(j * HW + i) * 4 + 3] > 40) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  const bx = Math.floor(x0 / MC_K), by = Math.floor(y0 / MC_K);
  return { c: lo(hr), f: lo(hf), fl: lo(wht(hr)), flf: lo(wht(hf)), w: W, h: Hh, ox, oy, bb: { x: bx, y: by, w: Math.max(1, Math.ceil((x1 + 1) / MC_K) - bx), h: Math.max(1, Math.ceil((y1 + 1) / MC_K) - by) } };
}
{
  const _fm = frameM32;
  frameM32 = function (type, pose, ph, pal, view) { return MC_TYPES[type] ? mcFrame(type, pose, ph, pal, view) : _fm(type, pose, ph, pal, view); };
}
// a body's frame of reference: J.at(u, f, r) is a point at rest-height u, f forward and r right of the spine, bent
// forward by `lean` about the hips (height u0) and turned by `twist` above them; J.ax(u) its three axes there
function mcBody(u0, bob, lean, twist, sideR, breath, uTw) {
  const tw = u => twist * Math.max(0, Math.min(1, (u - u0) / (uTw || 24)));
  const at = (u, f, r) => {
    const a = tw(u), ca = Math.cos(a), sa = Math.sin(a), h = u - u0, br = breath * Math.max(0, Math.min(1, (u - u0 - 8) / 16));
    const ff = f * (1 + br * 0.04);
    return [h * Math.sin(lean) + ff * ca - r * sa, sideR + ff * sa + r * ca, u0 + bob + h * Math.cos(lean) + br * 0.6];
  };
  const ax = u => { const p = at(u, 0, 0); return { f: mcS(at(u, 1, 0), p), r: mcS(at(u, 0, 1), p), u: mcN(mcS(at(u + 1, 0, 0), p)) }; };
  return { at, ax, tw };
}
// a ring-table body shell: tab rows [u, front depth, back depth, half width], interpolated
function mcRing(tab, u) { for (let i = 0; i < tab.length - 1; i++) { const a = tab[i], b = tab[i + 1]; if (u <= a[0] && u >= b[0]) { const t = (a[0] - u) / (a[0] - b[0]); return [a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t]; } } const e = u > tab[0][0] ? tab[0] : tab[tab.length - 1]; return [e[1], e[2], e[3]]; }
const MC_TAU = Math.PI * 2;
const MC_N3 = [[-1, 0], [0, -1], [1, 0]], MC_N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]], MC_N4B = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const MC_OCC = [1, 0, -1, 0, 0, 1, 0, -1, 2, 0, -2, 0, 0, 2, 0, -2, 1, 1, -1, 1];

// =================================================================== THE PYRE-SAINT
// A martyr whose faith is still burning: an emaciated body charred to a black crust split by ember cracks, bound to
// the stake it died on (strapped down its spine, the crossbar over its shoulders, the rope burnt through at the
// wrists). The crimson penitent's robe is burnt away to the shins and through over the heart, where the ribs show
// with the fire inside them. The head hangs, a charred skull with coals for eyes and fire in the mouth; a hoop of fire
// stands behind it. Its hands, the rope ends and the hem burn. The tell: it rears, throws its arms up and the fire
// roars white. Doused, the crust goes to grey ash, the robe hangs sodden, and it only smokes.
mcMat('pyChar', ['#0a0609', '#150b0e', '#211011', '#301712', '#422016', '#572c1c', '#6e3c26', '#8a5234'], { tex: 0.12, crack: 0.013, hot: 'pyEmb', ts: 0.3 });
mcMat('pyAsh', ['#0c0b10', '#17151b', '#232027', '#302c33', '#3f3a40', '#514b50', '#686064', '#827a7a'], { tex: 0.12, crack: 0.03, hot: 'pyEmbD', ts: 0.55 });
mcMat('pyRobe', ['#10040a', '#1e0710', '#300b15', '#46101a', '#5e171d', '#7a2320', '#983424', '#b84c2a'], { wrap: 0.3, tex: 0.07, ts: 0.35 });
mcMat('pyRobeW', ['#0a060c', '#130a12', '#1c0e18', '#26141e', '#321a24', '#40222a', '#4e2c32'], { wrap: 0.3, tex: 0.06 });
mcMat('pyWood', ['#08050a', '#120b0d', '#1c1210', '#281913', '#362217', '#462d1c', '#5a3b24', '#704c2e'], { tex: 0.16, ts: 0.6, aniso: 0.12, crack: 0.02, hot: 'pyEmb' });
mcMat('pyWoodD', ['#08070b', '#110e12', '#1b1719', '#262021', '#322b2a', '#403733', '#50453e'], { tex: 0.16, ts: 0.6, aniso: 0.12 });
mcMat('pyRope', ['#120a08', '#22150c', '#352112', '#4c3119', '#654422', '#7e5a2e', '#9a723c'], { tex: 0.25, ts: 1.1, aniso: 0.25 });
mcMat('pyBone', ['#1c120f', '#3a281e', '#5a4230', '#7c5e44', '#9c7c5a', '#bc9c74', '#d8bc92', '#eed8b0'], { tex: 0.06 });
mcMat('pyInk', ['#060306', '#0b0508', '#10070a'], { tex: 0 });
mcMat('pyEmb', ['#3a0808', '#6e1208', '#aa2a0a', '#e05a12', '#ff9428', '#ffcf5e', '#fff2c8'], { emis: true });
mcMat('pyEmbW', ['#7a2a10', '#c8601c', '#f39a42', '#ffc878', '#ffe8b6', '#fff8ec', '#ffffff'], { emis: true });
mcMat('pyEmbD', ['#1c0a0a', '#2e0e0a', '#48140c', '#661c0e', '#862a12', '#a63a16'], { emis: true });
MC_TYPES.pyre = { F: [64, 80, 30, 74] };
M32F.pyre = MC_TYPES.pyre.F; M32WALK.pyre = 5; M32BACK.pyre = true;
MC_TYPES.pyre.paint = function (K, pose, ph, pal) {
  const Dz = !!pal._doused, k = ph, walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk';
  const CH = Dz ? 'pyAsh' : 'pyChar', RB = Dz ? 'pyRobeW' : 'pyRobe', EMB = Dz ? 'pyEmbD' : 'pyEmb', WD = Dz ? 'pyWoodD' : 'pyWood';
  let bob = 0, lean = 0.15, twist = 0, sideR = 0, breath = 0, pitch = 0.5, jaw = 0.25, roar = 1, white = false, hemSw = 0, cloth = 0, swing = 0, fire = 1;
  let fR = [1.5, 4.4, 0], fL = [-2.5, -4.4, 0], liftR = 0, liftL = 0, haR = null, haL = null, hintR = [-0.6, 0.5, 0], hintL = [-0.6, -0.5, 0];
  switch (pose) {
    case 'walk': {
      const t = ph / 8 * MC_TAU, s = Math.sin(t), c = Math.cos(t), st = 8.5;
      fR = [st * s, 4.4, 0]; fL = [-st * s, -4.4, 0]; liftR = Math.max(0, c) * 3.4; liftL = Math.max(0, -c) * 3.4;
      bob = -1.5 * Math.abs(s) + 0.4; sideR = -0.7 * c; twist = 0.12 * s; lean = 0.22; hemSw = s; cloth = -1.6; swing = s; pitch = 0.35 + 0.08 * Math.abs(s);
      break;
    }
    case 'wind':
      lean = [0.04, -0.1, -0.2][k]; roar = [1.35, 1.75, 2.15][k]; white = k >= 1; pitch = [0.1, -0.35, -0.6][k]; jaw = [0.7, 1, 1][k]; bob = [0, 0.8, 1.6][k];
      fR = [3, 5.2, 0]; fL = [-3.5, -5.2, 0]; cloth = 0.8; fire = 1.2; break;
    case 'atk':
      lean = [0.5, 0.38, 0.24][k]; bob = [-2.4, -3, -1.6][k]; fR = [8, 4.6, 0]; fL = [-5, -4.6, 0]; jaw = [1, 0.8, 0.4][k]; roar = [1.45, 1.25, 1][k]; twist = [-0.22, -0.34, -0.14][k];
      pitch = [0.05, 0.2, 0.35][k]; cloth = -2; break;
    default:
      breath = [0, 0.6, 1, 0.6][k]; bob = -0.35 * breath; cloth = 0.3 * breath; fire = 1 + 0.08 * (k & 1); pitch = 0.3 + 0.05 * breath;
  }
  const J = mcBody(38, bob, lean, twist, sideR, breath);
  const at = J.at, TAU = MC_TAU;
  const TR = [[66.5, 3.6, 3.6, 4.6], [63.5, 6, 5.6, 11.6], [59, 7, 6.2, 12.2], [54, 6.8, 6, 10.8], [49, 5.6, 5.2, 8.6], [44, 5.2, 5.1, 8.4], [39, 5.8, 5.8, 9.4]];
  const surfT = (u, al, s) => { const r = mcRing(TR, u), c = Math.cos(al), sn = Math.sin(al); return at(u, c * (c > 0 ? r[0] : r[1]) * (s || 1), sn * r[2] * (s || 1)); };
  const shR = at(61.5, -0.6, 11.2), shL = at(61.5, -0.6, -11.2);
  const rest = (sh, side, sw) => mcA(sh, [2.2 + sw * 4.5, side * 1.2, -23.5]);
  if (wind) { haR = mcA(shR, [3 - k * 1.5, 5 + k * 2.4, 13 + k * 5.5]); haL = mcA(shL, [2.5 - k * 1.5, -5 - k * 2.4, 12 + k * 5.5]); hintR = [-0.2, 0.9, -0.5]; hintL = [-0.2, -0.9, -0.5]; }
  else if (atk) { const A = [[25, -2, 1], [23, -1, -8], [15, 0, -15]][k], B = [[23, 3, 4], [21, 2, -5], [14, 1, -13]][k]; haR = mcA(shR, A); haL = mcA(shL, B); hintR = [-0.3, 0.6, -0.8]; hintL = [-0.3, -0.6, -0.8]; }
  else { haR = rest(shR, 1, -swing); haL = rest(shL, -1, swing); }
  const arm = (sh, ha, hint) => { const [el, h2] = mcIK(sh, ha, 13, 12.5, hint); return { sh, el, ha: h2 }; };
  const aR = arm(shR, haR, hintR), aL = arm(shL, haL, hintL);
  const leg = (hip, f, lift, side) => { const an = [f[0], f[1] + sideR * 0.5, 3 + lift], [kn, an2] = mcIK(hip, an, 19.5, 18.2, [1, side * 0.1, 0]); return { hip, kn, an: an2, toe: mcA(an2, [5.2, side * 0.3, -2.4 - lift * 0.3]) }; };
  const lR = leg(at(38, 0, 4.3), fR, liftR, 1), lL = leg(at(38, 0, -4.3), fL, liftL, -1);
  const F = white ? MC_WFIRE : MC_FIRE;

  // ---- legs: burnt to sticks, the knees standing out, bare charred feet
  for (const lg of [lR, lL]) {
    K.cap([lg.hip, lg.kn], 3.3, 2.5, CH); K.ell(mcA(lg.kn, [0.8, 0, 0]), 2.3, CH);
    K.cap([lg.kn, lg.an], 2.3, 1.6, CH);
    K.cap([mcA(lg.an, [-1, 0, 0.4]), mcLp(lg.an, lg.toe, 0.55), lg.toe], 1.9, 1.1, CH);
    for (const d of [-1, 0, 1]) K.cap([mcLp(lg.an, lg.toe, 0.7), mcA(lg.toe, [0.8, d * 0.9, -0.3])], 0.6, 0.45, CH);
  }
  // ---- the body under the robe: a charred shell, burnt open over the heart where ribs and fire show
  const hole = (u, al) => { const a = ((al + Math.PI) % TAU + TAU) % TAU - Math.PI; return u > 48.5 + 1.4 * Math.sin(a * 5) && u < 59.5 - 1.2 * Math.cos(a * 4) && a > -0.55 && a < 0.75; };
  K.surf((s, t) => { const u = 66.5 - t * 28, al = s * TAU; return hole(u, al) ? null : surfT(u, al, 1); }, 56, 22, CH, { su: 30, sv: 20 });
  K.egg(at(54, 1.4, 1), J.ax(54).f, J.ax(54).r, J.ax(54).u, 4, 7, 6.5, EMB, { em: Dz ? 0.55 : 0.78 * fire });
  for (let i = 0; i < 4; i++) {
    const u0 = 58 - i * 2.9, pts = [];
    for (let q = 0; q <= 10; q++) { const a = -0.62 + 1.4 * q / 10; pts.push(surfT(u0 - 2.4 * Math.pow(Math.abs(a - 0.08) / 0.7, 1.6), a, 1.04)); }
    K.cap(pts, 0.95, 0.8, CH);
  }
  K.cap([surfT(60, 0.05, 1.05), surfT(52, 0.05, 1.06)], 1.1, 0.9, CH);   // the sternum
  // ---- the stake strapped down its back: the post, a burnt point, the crossbar over the shoulders
  const st0 = at(21, -8, 0), st1 = at(113, -9, 0), cb0 = at(68.5, -10.2, -20), cb1 = at(68.5, -10.2, 20);
  K.cap([st0, at(60, -8.5, 0), st1], 3, 2.4, WD);
  K.cap([st1, at(119, -9.1, 0.3)], 2.4, 0.4, WD);
  K.cap([cb0, at(68.5, -10.2, 0), cb1], 2, 1.9, WD);
  K.cap([mcA(cb0, [0, 0, 0]), mcA(cb0, [0, -0.2, -0.6])], 2.2, 1.6, CH);
  K.egg(at(68.5, -10, 0), J.ax(68).f, J.ax(68).r, J.ax(68).u, 3.4, 3.3, 3.6, 'pyRope');
  for (const d of [-2, 0, 2]) K.cap([at(68.5 + d, -12.5, -3), at(68.5 + d * 0.4, -12.8, 0), at(68.5 - d, -12.5, 3)], 0.7, 0.7, 'pyRope');
  // rope ends hanging from the crossbar, burnt short
  const drop = [];
  for (const [c, sd] of [[cb0, -1], [cb1, 1]]) { const a = mcA(c, [0.5, sd * -1.5, -1]), b = mcA(a, [cloth * 0.3 - 0.5, 0, -5]), e = mcA(b, [cloth * 0.5 - 1, sd * 0.4, -3.5]); K.cap([a, b, e], 0.8, 0.6, 'pyRope'); drop.push(e); }
  // ---- the robe: burnt through over the heart, torn and scorched at the edges, sleeves burnt away
  const holeR = (u, al) => { const a = ((al + Math.PI) % TAU + TAU) % TAU - Math.PI; return u > 47 + 1.8 * Math.sin(a * 6 + 1) + mcH(Math.floor(a * 9), 3) && u < 61 - 1.5 * Math.cos(a * 5) && a > -0.72 - 0.1 * Math.sin(u) && a < 0.92; };
  const edgeR = (u, al) => { let dmin = 9; for (const [du, da] of [[1.2, 0], [-1.2, 0], [0, 0.12], [0, -0.12]]) if (holeR(u + du, al + da)) dmin = Math.min(dmin, Math.hypot(du, da * 8)); return dmin < 9 ? 1.4 : 0; };
  K.surf((s, t) => {
    const u = 65.5 - t * 25, al = s * TAU; if (holeR(u, al)) return null;
    const fo = 0.06 * Math.sin(al * 5 + t * 3) + 0.04 * Math.sin(al * 11 + 1) * t, p = surfT(u, al, 1.13 + fo); p.push(edgeR(u, al) + (Math.cos(al) < -0.2 ? 0 : 0)); return p;
  }, 90, 20, RB, { su: 50, sv: 16 });
  // the skirt, burnt away to the shins, the hem ragged and charred black, swinging with the stride
  const SK = [[41, 6.2, 6.2, 10], [32, 8, 7.6, 11.8], [22, 9.6, 9, 13.2], [12, 10.8, 10, 14.2]];
  const hemU = s => 17.5 + 6 * Math.pow(Math.max(0, Math.sin(s * 37 + 1.1)), 3) + 3.2 * mcH(Math.floor(s * 23), 11) + 2 * Math.sin(s * TAU * 3 + 0.4) + (Math.cos(s * TAU) > 0.3 ? -1.5 : 1.5);
  const skirtAt = (s, t) => {
    const al = s * TAU, hu = hemU(s), u = 41 - t * (41 - hu), r = mcRing(SK, u), c = Math.cos(al), sn = Math.sin(al), tt = (41 - u) / 24;
    const fo = 1 + tt * (0.08 * Math.sin(al * 7 + 1.3 + hemSw * 0.8) + 0.05 * Math.sin(al * 13 + 0.4));
    const f = c * (c > 0 ? r[0] : r[1]) * fo + (hemSw * 2.2 * Math.abs(sn) * 0 + hemSw * 1.6 * sn) * tt * tt + cloth * tt * tt + (u - 38) * Math.sin(lean) * 0.5;
    const p = [f, sideR * 0.5 + sn * r[2] * fo, u + bob * (0.5 + 0.5 * (1 - tt))], sc = Math.max(0, 1 - (u - hu) / 6);
    p.push(sc * sc * 2.2); return p;
  };
  K.surf(skirtAt, 110, 18, RB, { inside: 0.6, su: 60, sv: 14 });
  // rope round the waist binding it to the stake; the rope crossed over its back
  { const pts = []; for (let q = 0; q <= 24; q++) pts.push(surfT(41.5, q / 24 * TAU, 1.22)); K.cap(pts, 0.95, 0.95, 'pyRope'); }
  for (const sd of [1, -1]) { const pts = []; for (let q = 0; q <= 8; q++) { const t = q / 8; pts.push(surfT(62 - t * 20, Math.PI + sd * (1.1 - 2.2 * t), 1.2)); } K.cap(pts, 0.85, 0.85, 'pyRope'); }
  // ---- the head, hung forward: a charred skull, coals in the sockets, fire in the open mouth
  const ax = J.ax(64), fN = mcN(ax.f), uN = ax.u, rN = mcN(ax.r);
  const hu = mcN(mcA(mcM(uN, Math.cos(pitch)), mcM(fN, Math.sin(pitch)))), hf = mcN(mcA(mcM(fN, Math.cos(pitch)), mcM(uN, -Math.sin(pitch))));
  const neck = at(64.5, 0.4, 0), H = mcA(neck, mcA(mcM(hu, 6.4), mcM(hf, 1.8)));
  const HS = 1.22, HP = (f, r, u) => mcA(H, mcA(mcM(hf, f * HS), mcA(mcM(rN, r * HS), mcM(hu, u * HS))));
  K.cap([at(62, 0, 0), neck, HP(-0.5, 0, -3.2)], 2.3, 2, CH);
  K.egg(HP(-0.4, 0, 0.9), hf, rN, hu, 5.2 * HS, 4.5 * HS, 5.1 * HS, CH);
  K.cap([HP(3.6, -2.9, 1.3), HP(4.4, 0, 1.6), HP(3.6, 2.9, 1.3)], 1.25, 1.25, Dz ? CH : 'pyBone');          // the brow
  for (const r of [-1.65, 1.65]) { K.egg(HP(3.4, r, 0.1), hf, rN, hu, 1.5 * HS, 1.35 * HS, 1.4 * HS, 'pyInk'); K.ell(HP(4.1, r * 0.95, -0.1), 0.62, EMB, { em: Dz ? 0.5 : white ? 1 : 0.9 }); }
  K.egg(HP(3.2, 0, -1.9), hf, rN, hu, 2.9 * HS, 3.4 * HS, 2 * HS, Dz ? CH : 'pyBone');                                    // the cheekbones and the maxilla
  K.ell(HP(4.5, 0, -1.2), 0.65, 'pyInk');
  const jd = jaw * 2.4;
  K.egg(HP(2.4, 0, -3.3 - jd * 0.55), hf, rN, hu, 2.6, 2.4, 1.8, EMB, { em: Dz ? 0.35 : white ? 1 : 0.85 });   // the fire in the mouth
  for (let i = -2; i <= 2; i++) K.cap([HP(4.2 - Math.abs(i) * 0.35, i * 0.75, -2.5), HP(4.3 - Math.abs(i) * 0.35, i * 0.75, -3.4)], 0.4, 0.34, 'pyBone');
  K.egg(HP(1.9, 0, -4.9 - jd), mcN(mcA(hf, mcM(hu, -jaw * 0.35))), rN, hu, 3.1 * HS, 3.1 * HS, 1.3 * HS, Dz ? CH : 'pyBone');  // the jaw
  for (let i = -2; i <= 2; i++) K.cap([HP(4.1 - Math.abs(i) * 0.4, i * 0.75, -4.2 - jd), HP(4.1 - Math.abs(i) * 0.4, i * 0.75, -3.6 - jd)], 0.38, 0.32, 'pyBone');
  // ---- the arms: sticks of char, the burnt rope still knotted at the wrists, hands clawed
  const hands = [];
  for (const [a, side] of [[aR, 1], [aL, -1]]) {
    K.ell(a.sh, 2.6, CH);
    K.cap([a.sh, a.el], 2.4, 2, CH); K.ell(a.el, 1.9, CH);
    K.cap([a.el, a.ha], 1.9, 1.4, CH);
    const d = mcN(mcS(a.ha, a.el)), w = mcLp(a.el, a.ha, 0.84), sd = mcN(mcCr(d, [0, 0, 1])), up = mcN(mcCr(sd, d));
    const ring = []; for (let q = 0; q <= 10; q++) { const an = q / 10 * TAU; ring.push(mcA(w, mcA(mcM(sd, Math.cos(an) * 1.9), mcM(up, Math.sin(an) * 1.9)))); } K.cap(ring, 0.65, 0.65, 'pyRope');
    const e0 = mcA(w, mcM(up, -1.8)), e1 = mcA(e0, [cloth * 0.3 - 0.8, side * 0.3, -3.5]); K.cap([e0, e1], 0.6, 0.45, 'pyRope'); hands.push({ ha: a.ha, d, sd, up, rope: e1 });
    K.egg(mcA(a.ha, mcM(d, 1)), d, sd, up, 2, 1.6, 1.2, CH);
    const curl = atk ? 0.4 : wind ? 0.2 : 1;
    for (let f = -1.5; f <= 1.5; f += 1) {
      const b0 = mcA(a.ha, mcA(mcM(d, 2.2), mcM(sd, f * 1))), b1 = mcA(b0, mcA(mcM(d, 2.3), mcM(up, -0.8 * curl))), b2 = mcA(b1, mcA(mcM(d, 1.2 * (1 - curl * 0.4)), mcM(up, -1.9 * curl)));
      K.cap([b0, b1, b2], 0.62, 0.4, CH);
    }
    K.cap([mcA(a.ha, mcA(mcM(d, 1), mcM(sd, -2 * side))), mcA(a.ha, mcA(mcM(d, 2.6), mcM(sd, -2.8 * side)))], 0.6, 0.45, CH);
  }
  // ---- the halo: a hoop of fire standing behind the head (doused: a charred hoop, still smoking)
  const hc = mcA(H, mcA(mcM(fN, -6), mcM(uN, 4))), Rh = 10.5 + (wind ? k * 1.3 : 0), ring = [];
  for (let q = 0; q <= 40; q++) { const an = q / 40 * TAU; ring.push(mcA(hc, mcA(mcM(rN, Math.cos(an) * Rh), mcM(uN, Math.sin(an) * Rh)))); }
  if (Dz) K.cap(ring, 0.9, 0.9, 'pyWoodD');
  else for (let q = 0; q < 40; q++) K.cap([ring[q], ring[q + 1]], 1.05, 1.05, white ? 'pyEmbW' : 'pyEmb', { em: 0.55 + 0.4 * Math.max(0, Math.sin(q / 40 * TAU)) + 0.12 * Math.sin(q * 1.7 + ph) });
  // ---- fire
  const s0 = ph * 1.9 + pose.length * 1.37;
  if (!Dz) {
    const nt = wind ? 7 : 2;
    for (let i = 0; i < nt; i++) { const an = Math.PI * (nt === 2 ? 0.36 + 0.28 * i : 0.12 + 0.76 * i / (nt - 1)), p = mcA(hc, mcA(mcM(rN, Math.cos(an) * Rh), mcM(uN, Math.sin(an) * Rh))); K.flame(p, 5, (7 + ((i * 5 + ph) % 3) * 2) * roar, s0 + i * 1.9, F, -Math.cos(an) * 0.5 + (atk ? 0.4 : walk ? -0.25 : 0)); }
    for (let i = 0; i < 6; i++) { const s = (i + 0.5) / 6 + 0.03 * Math.sin(ph + i), p = skirtAt(s, 1); p.length = 3; K.flame(mcA(p, [0, 0, -0.5]), 5 + (i % 2), (5 + ((i * 3 + ph) % 3) * 2) * (wind ? roar * 0.8 : 1), s0 + i * 2.3, F, walk ? -0.35 : atk ? -0.3 : 0); }
    for (const h of hands) { K.flame(mcA(h.ha, mcM(h.up, 1.5)), 4.5, 7 * roar, s0 + h.ha[1], F, atk ? 1.1 : 0); K.flame(h.rope, 2.6, 4 * roar, s0 + 3, F, 0, 0.3); }
    for (const e of drop) K.flame(e, 3, 5.5 * roar, s0 + e[1], F, 0, 0.4);
    K.flame(cb0, 3.5, 5.5 * roar, s0 + 5, F, 0); K.flame(cb1, 3.5, 5.5 * roar, s0 + 7, F, 0);
    K.flame(at(119, -9.1, 0.3), 3.6, 6 + (ph % 2) * 2, s0 + 11, F, 0, 0.5);
    if (wind) for (const p of [shR, shL, at(50, 5, 0)]) K.flame(p, 7, 12 * roar, s0 + p[1], F, 0);
    K.light(at(54, 6, 0), 26, 0.35 * fire);
    if (atk) {
      // the gout: the fire leaves its hands in a long tongue, then a rolling ball ahead of it
      const hA = hands[0].ha, dir = mcN(mcS(hA, aR.el));
      if (k === 0) { for (let i = 0; i < 4; i++) K.flame(mcA(hA, mcM(dir, 2 + i * 3.5)), 11 - i * 1.5, 11 - i, s0 + i, MC_WFIRE, 1.6 + i * 0.2); }
      const bc = K.C(mcA(hA, mcM(dir, [9, 17, 24][k]))), br = [9, 12, 9][k] * K.cam.K;
      K.post((D, W, H2, Z) => mcBlob(D, W, H2, bc[0], bc[1] - 2, br, s0, k === 0 ? MC_WFIRE : MC_FIRE, k === 2 ? -0.35 : -0.05));
      K.light(mcA(hA, mcM(dir, [9, 17, 24][k])), 34, 0.7);
    }
    // embers lifting off it
    const top = K.C(mcA(hc, mcM(uN, Rh)));
    K.post((D, W, H2) => { for (let i = 0; i < 9; i++) { const q = (i * 7 + ph * 5) % 17, x = top[0] - 8 + ((i * 13 + ph * 3) % 17) - (walk ? q * 0.3 : 0), y = top[1] - 6 - ((i * 11 + ph * 6) % 19); mcDot4(D, W, H2, x, y, F[i % 3 === 0 ? 6 : i % 2 ? 4 : 5]); if (i % 3 === 0) mcDot4(D, W, H2, x, y + 1, F[3]); } });
  } else {
    // doused: smoke off the skull, the hoop, the shoulders, the hands and the sodden hem; a few coals still breathing
    const pts = [[H, 12], [mcA(hc, mcM(uN, Rh)), 10], [shR, 8], [shL, 7], [hands[0].ha, 7], [hands[1].ha, 6], [at(20, 5, 0), 7]];
    K.post((D, W, H2, Z) => { pts.forEach(([p, h], i) => { const q = K.C(p); mcSmoke(D, W, H2, Z, q[0], q[1] - 1, q[2] + 3, h * 1.5 * (wind ? 1.4 : 1), ph * 0.9 + i * 2.1, i > 3); }); });
    if (wind || atk) for (const h of hands) K.flame(mcA(h.ha, mcM(h.up, 1.2)), 2.5, 3 + k * 1.5, s0, MC_FIRE, 0, 0.3);
  }
  return { amb: 0.12, key: 0.78, heat: Dz ? 0.7 : 1 };
};
// a rolling ball of fire (hr px), ragged at its edge
function mcBlob(D, W, H, cx, cy, r, s, P, hot) {
  const n = P.length;
  for (let y = Math.floor(cy - r * 1.4); y <= cy + r * 1.4; y++) for (let x = Math.floor(cx - r * 1.4); x <= cx + r * 1.4; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, an = Math.atan2(dy, dx), R = r * (1 + 0.24 * Math.sin(an * 5 + s) + 0.14 * Math.sin(an * 9 - s * 2) + (dy < 0 ? 0.15 : 0));
    const d = Math.hypot(dx, dy) / R; if (d > 1) continue;
    const nz = mcVN(x * 0.4 + s * 3, y * 0.4, 23), h = (1 - d) * 1.25 + hot + (nz - 0.5) * 0.6; if (h < 0.05) continue;
    mcDot4(D, W, H, x, y, P[Math.max(0, Math.min(n - 1, Math.floor(h * n)))]);
  }
}

// =================================================================== THE BELLWETHER
// A hulk grown out of a penitent who carried the cathedral's bell until it became his skull: a vast grey-mauve body
// swollen with muscle, walking on its knuckles, its back scarred by the scourge and hung with a burlap penance sack
// knotted with rope. The bell sits where the head should be, sunk between the shoulders, its mouth turned to the
// ground: green-black verdigris over bronze worn bright at the lip, a crack down one side, the bell-rope still knotted
// to its crown. In the dark of the mouth hang two dim coals and a tongue of flesh for a clapper. Iron manacles with
// broken chain on both wrists. The tell: it rears and the bell swings, tolling twice; the strike brings both fists
// and the bell down together.
mcMat('blSkin', ['#0b080e', '#161119', '#231b24', '#33292f', '#473b3a', '#5e5146', '#786a55', '#948666', '#afa27c'], { tex: 0.1, ts: 0.3 });
mcMat('blSkinD', ['#0b080e', '#15101a', '#211a24', '#302730', '#40363a', '#534844'], { tex: 0.1, ts: 0.3 });
mcMat('blScar', ['#12040a', '#240810', '#3a0e16', '#56161c', '#742322', '#92352a'], { tex: 0.08 });
mcMat('blSack', ['#0e0b0a', '#1b1612', '#2b2319', '#3c3120', '#50422a', '#665435', '#7e6a44', '#988252'], { tex: 0.2, ts: 0.9, aniso: 0.35, wrap: 0.2 });
mcMat('blRope', ['#120c08', '#22170d', '#362513', '#4d361b', '#664a25', '#806031', '#9a783e'], { tex: 0.25, ts: 1.1, aniso: 0.25 });
mcMat('blVerd', ['#070d0f', '#0d1a1c', '#132927', '#1c3a32', '#284d3e', '#3a634a', '#557e58', '#7a9c6c'], { tex: 0.2, ts: 0.28, crack: 0.012, spec: 0.01, gain: 0.95 });
mcMat('blBronze', ['#140b08', '#28160c', '#422612', '#603a18', '#81521f', '#a46e2a', '#c6903e', '#e6ba62'], { tex: 0.1, spec: 0.03, ts: 0.4 });
mcMat('blIron', ['#09090d', '#131319', '#1e1d24', '#2c2a31', '#3c3840', '#524b4f', '#6e6360', '#948472'], { tex: 0.12, spec: 0.02, ts: 0.6 });
mcMat('blInk', ['#050407', '#08060a', '#0b080d'], { tex: 0 });
mcMat('blCoal', ['#1c0606', '#3e0a08', '#6c160a', '#a4300e', '#d45a1a', '#f28c34'], { emis: true });
mcMat('blGum', ['#14050a', '#2a0a12', '#44121a', '#621c22', '#82302c', '#a04836'], { tex: 0.08, wrap: 0.2 });
MC_TYPES.bell = { F: [124, 112, 50, 98], scale: 1.3 };
M32F.bell = MC_TYPES.bell.F; M32WALK.bell = 4; M32BACK.bell = true;
MC_TYPES.bell.paint = function (K, pose, ph, pal) {
  const k = ph, walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk';
  let swing = 0, bob = 0, lean = 0.36, twist = 0, sideR = 0, breath = 0, dx = 0, cloth = 0, bellT = 0, bellS = 0, toll = -1, hem = 0;
  let hR = null, hL = null, fR = [-3, 12, 0], fL = [-6, -12, 0], liftR = 0, liftL = 0, fist = true;
  switch (pose) {
    case 'walk': {
      const t = ph / 8 * MC_TAU, s = Math.sin(t), c = Math.cos(t);
      swing = s;
      fR = [-3 + 9 * s, 12, 0]; fL = [-3 - 9 * s, -12, 0]; liftR = Math.max(0, c) * 5; liftL = Math.max(0, -c) * 5;
      bob = -3 * Math.abs(s) + 1; sideR = 2.4 * c; twist = 0.18 * s; lean = 0.46 + 0.05 * Math.abs(c); bellT = 0.08 * Math.sin(t + 0.8); bellS = 0.06 * s; cloth = -1.5; hem = s;
      break;
    }
    case 'wind':
      lean = [0.42, 0.22, 0.1][k]; bob = [2, 4, 5][k]; dx = [-2, -4, -5][k]; fR = [-2, 13, 0]; fL = [-8, -13, 0];
      hR = [[26, 22, 30], [12, 20, 88], [8, 14, 104]][k]; hL = [[22, -21, 28], [9, -19, 86], [5, -13, 102]][k];
      bellT = [-0.25, 0.45, -0.3][k]; bellS = [0.35, -0.35, 0.2][k]; toll = k < 2 ? k : -1; cloth = 1.5; break;
    case 'atk':
      lean = [1.02, 0.95, 0.8][k]; bob = [-4, -6, -3][k]; dx = [6, 7, 4][k]; fR = [0, 13, 0]; fL = [-6, -13, 0];
      hR = [[42, 7, 2.4], [43, 8, 1.5], [38, 11, 2.4]][k]; hL = [[41, -7, 2.4], [42, -8, 1.5], [36, -11, 2.4]][k];
      bellT = [0.75, 0.9, 0.55][k]; cloth = -2.5; break;
    default:
      breath = [0, 0.6, 1, 0.6][k]; bob = -0.6 * breath; bellT = 0.05 * breath; cloth = 0.4 * breath;
  }
  const J = mcBody(42, bob, lean, twist, sideR, breath * 1.6, 20), at = (u, f, r) => mcA(J.at(u, f, r), [dx, 0, -12]), TAU = MC_TAU;
  const AX = u => J.ax(u);
  const BE = (u, f, r, a, b, c, m, o) => { const x = AX(u); return K.egg(at(u, f, r), x.f, x.r, x.u, a, b, c, m, o); };
  // a point on the surface of a body egg (lon 0 = forward, pi/2 = right; lat up), for draping the sack and scars
  const EP = (u, f, r, a, b, c, lon, lat, sc) => { const x = AX(u), p = at(u, f, r), cl = Math.cos(lat) * (sc || 1); return mcA(p, mcA(mcM(mcN(x.f), a * cl * Math.cos(lon)), mcA(mcM(mcN(x.r), b * cl * Math.sin(lon)), mcM(x.u, c * Math.sin(lat) * (sc || 1))))); };
  const shR = at(75, 4, 18), shL = at(75, 4, -18);
  // ---- legs: short and massive, bowed under the haunch
  const leg = (hip, f, lift, side) => { const an = [f[0] + dx * 0.5, f[1], 4 + lift], [kn, an2] = mcIK(hip, an, 17, 16, [1, side * 0.5, 0]); return { hip, kn, an: an2, toe: mcA(an2, [6, side * 0.8, -2.8 - lift * 0.3]) }; };
  const lR = leg(at(41, -4, 11), fR, liftR, 1), lL = leg(at(41, -4, -11), fL, liftL, -1);
  for (const [lg, far] of [[lL, 1], [lR, 0]]) {
    const m = far ? 'blSkinD' : 'blSkin';
    K.cap([lg.hip, lg.kn], 7.4, 5.6, m); { const td = mcN(mcS(lg.kn, lg.hip)); K.egg(mcLp(lg.hip, lg.kn, 0.45), td, [0, 1, 0], mcN(mcCr(td, [0, 1, 0])), 9.5, 8, 7.4, m); K.egg(mcA(mcLp(lg.kn, lg.an, 0.35), [-1.5, 0, 0]), mcS(lg.an, lg.kn), [0, 1, 0], [1, 0, 0], 6.5, 5, 5, m); } K.ell(mcA(lg.kn, [1.2, 0, 0]), 4.2, m);
    K.cap([lg.kn, mcLp(lg.kn, lg.an, 0.45), lg.an], 5.2, 3.6, m);
    K.egg(mcLp(lg.an, lg.toe, 0.4), mcS(lg.toe, lg.an), [0, 1, 0], [0, 0, 1], 5, 3.4, 2.4, m);
    for (const d of [-1.4, 0, 1.4]) K.cap([mcLp(lg.an, lg.toe, 0.75), mcA(lg.toe, [0.6, d * 1.1, -0.2])], 1.1, 0.9, m);
  }
  // ---- arms: long, heavy, knuckle-walking; iron manacles with broken chain at the wrists
  if (!hR) { hR = mcA(shR, [7 - swing * 9, 5, -41 + Math.abs(swing) * 3]); hL = mcA(shL, [5 + swing * 9, -5, -41 + Math.abs(swing) * 3]); }
  const arm = (sh, h, side) => { const [el, ha] = mcIK(sh, h, 27, 26, [-0.5, side * 1, 0.2]); return { sh, el, ha, side }; };
  const aR = arm(shR, hR, 1), aL = arm(shL, hL, -1);
  const drawArm = (a, far) => {
    const m = 'blSkin', dk = far ? { dk: 0.3 } : {}; 
    K.cap([a.sh, a.el], 7, 5.4, m, dk); K.ell(a.el, 4.8, m, dk);
    K.cap([a.el, mcLp(a.el, a.ha, 0.5), a.ha], 5.4, 4.3, m, dk);
    { const ud = mcN(mcS(a.el, a.sh)), o = mcN(mcCr(ud, [0, 0, 1])); K.egg(mcA(mcLp(a.sh, a.el, 0.45), mcM(o, -a.side * 1.5)), ud, o, mcCr(o, ud), 9, 6.2, 6.4, m, dk);
      const fd = mcN(mcS(a.ha, a.el)); K.egg(mcLp(a.el, a.ha, 0.3), fd, mcN(mcCr(fd, [0, 0, 1])), mcN(mcCr(mcCr(fd, [0, 0, 1]), fd)), 8, 6.3, 6, m, dk); }
    const d = mcN(mcS(a.ha, a.el)), sd = mcN(mcCr(d, [0, 0, 1])), up = mcN(mcCr(sd, d));
    // the fist: a block of knuckles, the fingers folded under
    K.egg(mcA(a.ha, mcM(d, 3.2)), d, sd, up, 4.4, 4.6, 3.8, m, dk);
    for (let q = -1.5; q <= 1.5; q++) K.ell(mcA(a.ha, mcA(mcM(d, 6.2), mcA(mcM(sd, q * 2.1), mcM(up, 0.8)))), 1.7, m, dk);
    K.cap([mcA(a.ha, mcA(mcM(d, 2), mcM(sd, -4 * a.side))), mcA(a.ha, mcA(mcM(d, 5), mcM(sd, -4.6 * a.side)))], 1.6, 1.3, m, dk);
    // the manacle: a thick iron cuff, rivets, three broken links hanging
    const w = mcLp(a.el, a.ha, 0.78), ring = [];
    for (let q = 0; q <= 12; q++) { const an = q / 12 * TAU; ring.push(mcA(w, mcA(mcM(sd, Math.cos(an) * 5.3), mcM(up, Math.sin(an) * 5.3)))); }
    K.cap(ring, 1.8, 1.8, 'blIron');
    let c0 = mcA(w, mcM(up, -5.6));
    for (let q = 0; q < 3; q++) {
      const c1 = mcA(c0, [cloth * 0.4 - 0.6 + q * 0.3, a.side * 0.2, -3.2]), o = q & 1 ? sd : d, lk = [];
      for (let e = 0; e <= 8; e++) { const an = e / 8 * TAU; lk.push(mcA(mcLp(c0, c1, 0.5), mcA(mcM(mcN(mcS(c1, c0)), Math.sin(an) * 2), mcM(o, Math.cos(an) * 1.1)))); }
      K.cap(lk, 0.55, 0.55, 'blIron'); c0 = c1;
    }
  };
  drawArm(aL, true);
  // ---- the body: haunch, belly, the great back and the hump over it
  BE(44, -3, 0, 13, 15, 11, 'blSkin');
  BE(52, 5, 0, 13, 14, 12, 'blSkin');
  BE(64, 0, 0, 16, 19, 16, 'blSkin');
  BE(77, -2.5, 0, 13, 18, 11, 'blSkin');
  for (const s of [1, -1]) BE(75, 3, s * 16.5, 8.5, 8, 8.5, s > 0 ? 'blSkin' : 'blSkinD');
  BE(61, 11, 0, 6.5, 13, 9, 'blSkin');
  // anatomy pressing through: the knuckles of the spine along the hump, ribs under the flanks, the lats
  for (let i = 0; i < 7; i++) { const u = 50 + i * 4.2, p = EP(u > 70 ? 77 : 64, u > 70 ? -2.5 : 0, 0, u > 70 ? 13 : 16, u > 70 ? 18 : 19, u > 70 ? 11 : 16, Math.PI, 0.1 + (u - 50) / 30 * 1.2, 0.99); K.ell(p, 2.3 - i * 0.1, 'blSkin'); }
  for (const sd of [1, -1]) for (let i = 0; i < 4; i++) { const pts = []; for (let q = 0; q <= 6; q++) pts.push(EP(62, 0, 0, 16, 19, 16, sd * (Math.PI * 0.35 + q / 6 * 0.9), -0.15 - i * 0.2 + q * 0.03, 1.0)); K.cap(pts, 1.4, 1.1, sd > 0 ? 'blSkin' : 'blSkinD'); }
  for (const sd of [1, -1]) BE(66, 3, sd * 13, 10, 6, 11, sd > 0 ? 'blSkin' : 'blSkinD');                     // the chest, hanging
  // the scourge scars across its back: raised welts of dark crimson
  for (let i = 0; i < 5; i++) {
    const lat0 = 0.25 + i * 0.16, pts = [];
    for (let q = 0; q <= 8; q++) { const lon = Math.PI * (0.62 + 0.76 * q / 8) + Math.sin(i * 2.3) * 0.1; pts.push(EP(64, 0, 0, 16, 19, 16, lon, lat0 + (q / 8 - 0.5) * 0.35 * (i & 1 ? 1 : -1), 1.03)); }
    K.cap(pts, 0.8, 0.6, 'blScar');
  }
  // ---- the penance sack over the hump and down the back, burlap, torn at the hem, lashed on with rope
  K.surf((s, t) => {
    const lon = Math.PI * (0.38 + 1.24 * s), latT = 1.25 - t * 1.4, lat = Math.max(0.05, latT);
    let p = EP(66, -1.5, 0, 16.5, 19.5, 17, lon, lat, 1.07);
    const hang = Math.max(0, 0.05 - latT) * 12 + (latT < 0.05 ? 0 : 0);
    const rag = 3 * Math.pow(Math.max(0, Math.sin(s * 31 + 1)), 3) + 2.4 * mcH(Math.floor(s * 17), 3);
    if (t > 0.86 && hang > 7.5 - rag) return null;
    p = mcA(p, [cloth * 0.1 * hang, 0, -hang * 1.3]);
    const fo = 0.8 * Math.sin(s * 23 + t * 2) * t + 0.5 * Math.sin(s * 9 + hem * 0.5);
    p = mcA(p, mcM(mcN(AX(66).f), fo * 0.3)); p.push(t > 0.8 ? (t - 0.8) * 3 : 0); return p;
  }, 60, 24, 'blSack', { inside: 0.5, su: 30, sv: 18 });
  { const pts = []; for (let q = 0; q <= 14; q++) pts.push(EP(62, 0, 0, 16, 19, 16, Math.PI * (0.35 + 1.3 * q / 14), 0.12, 1.12)); K.cap(pts, 1.1, 1.1, 'blRope'); }
  // ---- a loincloth of the same sackcloth, knotted at the hip, hanging heavy between the legs
  K.surf((s, t) => {
    const lon = s * TAU, x = AX(40), rag = 2.5 * Math.pow(Math.max(0, Math.sin(s * 29 + 2)), 3) + 2 * mcH(Math.floor(s * 19), 7), len = (Math.cos(lon) > 0.2 || Math.cos(lon) < -0.4 ? 13 : 5) - rag;
    const top = EP(42, -1, 0, 12.2, 14.4, 6, lon, 0.25, 1.02), p = mcA(top, [cloth * 0.3 * t + hem * 1.2 * t * Math.sin(lon), 0, -len * t]);
    p.push(t > 0.7 ? (t - 0.7) * 2 : 0); return p;
  }, 60, 10, 'blSack', { inside: 0.6, su: 40, sv: 10 });
  { const pts = []; for (let q = 0; q <= 20; q++) pts.push(EP(42, -1, 0, 12.2, 14.4, 6, q / 20 * TAU, 0.3, 1.08)); K.cap(pts, 1.2, 1.2, 'blRope'); K.ell(EP(42, -1, 0, 12.2, 14.4, 6, 1.1, 0.3, 1.14), 2, 'blRope'); }
  // ---- the bell, where the head should be
  const nb = at(78, 15, 0), ax = AX(78), bf = mcN(ax.f), br = mcN(ax.r), bu = ax.u;
  const tilt = 0.82 + bellT, spin = bellS;
  // the bell's axis runs from its crown to its mouth: forward and down, swung by the toll
  let ba = mcN(mcA(mcA(mcM(bf, Math.sin(tilt)), mcM(bu, -Math.cos(tilt))), mcM(br, Math.sin(spin))));
  const b1 = mcN(mcCr(ba, br)), b2 = mcN(mcCr(ba, b1));
  const crown = mcA(nb, mcA(mcM(ba, -9), mcM(bu, 6))), BL = 26;
  const prof = t => t < 0.12 ? 4.6 + t * 12 : t < 0.55 ? 6 + (t - 0.12) * 3.2 : 7.4 + Math.pow((t - 0.55) / 0.45, 1.7) * 6.2;
  const BP = (t, an, sc) => mcA(crown, mcA(mcM(ba, t * BL), mcA(mcM(b1, Math.cos(an) * prof(t) * (sc || 1)), mcM(b2, Math.sin(an) * prof(t) * (sc || 1)))));
  // the dark inside the mouth, the coals of its eyes, the tongue of flesh for a clapper
  K.egg(mcA(crown, mcM(ba, BL * 0.78)), ba, b1, b2, 3, 8.5, 8.5, 'blInk');
  for (const s of [-1, 1]) K.ell(mcA(crown, mcA(mcM(ba, BL * 0.74), mcA(mcM(b1, s * 3.2), mcM(bf, 1.5)))), 1.1, 'blCoal', { em: wind ? 1 : 0.75 });
  const cl0 = mcA(crown, mcM(ba, BL * 0.45)), cl1 = mcA(cl0, mcA(mcM(ba, 12), mcA(mcM(bf, -bellT * 5), [0, 0, -2]))), cl2 = mcA(cl1, mcA(mcM(ba, 3.5), [0, 0, -2.5]));
  K.cap([cl0, cl1, cl2], 2.2, 2.9, 'blGum');
  K.ell(cl2, 3, 'blGum');
  K.surf((s, t) => { const an = s * TAU, cr = Math.abs(Math.sin((an - 1.1) * 0.5)) < 0.05 && t > 0.3 ? 0.9 : 0, p = BP(t, an, 1 + 0.02 * Math.sin(an * 7)); p.push(cr); return p; }, 64, 20, 'blVerd', { inside: 0.8, su: 50, sv: 20 });
  // the lip, worn to bronze, the waist band and the cast rings, the crown and its yoke
  { const lip = []; for (let q = 0; q <= 40; q++) lip.push(BP(1, q / 40 * TAU, 1.02)); K.cap(lip, 1.5, 1.5, 'blBronze'); }
  for (const tt of [0.3, 0.62]) { const bd = []; for (let q = 0; q <= 40; q++) bd.push(BP(tt, q / 40 * TAU, 1.04)); K.cap(bd, 0.75, 0.75, tt > 0.5 ? 'blBronze' : 'blVerd'); }
  K.egg(crown, ba, b1, b2, 2.8, 5.2, 5.2, 'blVerd');
  { const y = []; for (let q = 0; q <= 12; q++) { const an = Math.PI * q / 12; y.push(mcA(crown, mcA(mcM(ba, -2 - Math.sin(an) * 4.2), mcM(b1, Math.cos(an) * 3.2)))); } K.cap(y, 1.2, 1.2, 'blBronze'); }
  // the bell-rope knotted to the yoke, hanging down its back, frayed at the end
  { const r0 = mcA(crown, mcM(ba, -4)), r1 = mcA(r0, mcA(mcM(bf, -6), [0, -3, -3])), r2 = mcA(at(66, -9, -12), [cloth * 0.6, 0, 0]), r3 = mcA(r2, [cloth * 0.9 - 2, -1, -12]);
    K.cap([r0, r1, r2, r3], 1.2, 1, 'blRope'); K.ell(r1, 1.9, 'blRope'); K.cap([r3, mcA(r3, [-0.6, 0.5, -3])], 1.2, 0.5, 'blRope'); }
  // the neck of the bell sunk in the flesh: a collar of swollen skin rolled over its crown
  { const col = []; for (let q = 0; q <= 18; q++) { const an = q / 18 * TAU; col.push(mcA(BP(0.2, an, 1.08), mcM(ba, -1))); } K.cap(col.filter((p, i) => { const an = i / 18 * TAU; return Math.cos(an) < 0.35; }), 2.3, 2.3, 'blSkin'); }
  drawArm(aR, false);
  // toll rings: the sound going out of the bell in green-white arcs
  if (toll >= 0) {
    const bc = K.C(mcA(crown, mcM(ba, BL * 0.6)));
    K.post((D, W, H) => {
      for (const [rr, col, a] of [[20 + toll * 5, [186, 220, 196], 0.9], [27 + toll * 6, [90, 130, 112], 0.7]]) for (let q = -30; q <= 30; q++) for (const side of [1, -1]) {
        if ((q + rr) % 5 === 0) continue; const an = q * 0.035 + (side > 0 ? 0 : Math.PI);
        mcDot4(D, W, H, bc[0] + Math.cos(an) * rr, bc[1] + Math.sin(an) * rr * 0.8, col, a * (1 - Math.abs(q) / 34));
      }
    });
  }
  // the slam: a crack and a ring of dust thrown up where the fists land
  if (atk && k <= 1) {
    const g = K.C(mcA(mcLp(aR.ha, aL.ha, 0.5), [5, 0, -3]));
    K.post((D, W, H) => {
      const n = k === 0 ? 16 : 22;
      for (let i = 0; i < n; i++) { const an = -Math.PI * (0.02 + 0.96 * i / (n - 1)), r = (k === 0 ? 12 : 19) + (i % 3) * 2.5; for (let e = 0; e < 3; e++) mcDot4(D, W, H, g[0] + Math.cos(an) * (r + e * 1.3) * 1.5, g[1] + 2 + Math.sin(an) * (r + e) * 0.6, e === 0 ? [148, 128, 100] : [96, 82, 64], 0.9 - e * 0.25); }
      for (let i = -14; i <= 14; i++) if (Math.abs(i) > 3) mcDot4(D, W, H, g[0] + i * 1.3, g[1] + 3 + (i & 1), [22, 16, 14]);
    });
  }
  return {};
};

// =================================================================== THE MARROW DUELIST
// A fencer who kept dancing after the flesh went: a clean yellowed skeleton in the ruins of his finery (high cuffed
// boots of cracked leather, a crimson sash, a short cape thrown over one shoulder, a broad felt hat whose plume has
// broken and hangs), sabre in hand and the other hand raised behind for balance. Coals for eyes. It fights in the
// fencer's stance and parries anything quick. The tell: the blade's tip rises; then the lunge, long and fast.
mcMat('dlBone', ['#18120f', '#2e241c', '#4a3c2c', '#68573e', '#877453', '#a6916a', '#c3ae84', '#dccaa0', '#f0e2bc'], { tex: 0.1, crack: 0.018, ts: 0.6 });
mcMat('dlRed', ['#0e0408', '#1c070d', '#2e0b13', '#441119', '#5c1a1e', '#782722', '#94382a', '#b04e34'], { wrap: 0.35, tex: 0.07, ts: 0.4 });
mcMat('dlLea', ['#0b0707', '#170e0b', '#24160f', '#342015', '#462b1b', '#5a3a24', '#704a2e', '#8a5e3a'], { tex: 0.12, ts: 0.5, crack: 0.015 });
mcMat('dlHat', ['#08070a', '#110e11', '#1b1618', '#262020', '#332a28', '#433630', '#56463c'], { tex: 0.08, wrap: 0.2 });
mcMat('dlSteel', ['#0e1016', '#1c2029', '#2e3440', '#454d5c', '#626c7c', '#8792a0', '#b4bec8', '#e4ecf2'], { spec: 0.05, tex: 0.04, gain: 1.1 });
mcMat('dlBrass', ['#140c06', '#2a1a0a', '#46300f', '#664818', '#8a6424', '#b08634', '#d0aa52', '#ecd07e'], { spec: 0.04, tex: 0.05 });
mcMat('dlInk', ['#050407', '#08060a', '#0c090d'], { tex: 0 });
mcMat('dlEye', ['#3a0e06', '#7a1e08', '#c0400c', '#f07a1e', '#ffc04c', '#fff0b0'], { emis: true });
mcMat('dlPlume', ['#12060a', '#240a10', '#3c1216', '#581c1c', '#782c24', '#984030', '#b85a3e'], { wrap: 0.3, tex: 0.3, ts: 1.4, aniso: 0.2 });
MC_TYPES.duelist = { F: [92, 76, 34, 70], scale: 1 };
M32F.duelist = MC_TYPES.duelist.F; M32WALK.duelist = 6.5; M32BACK.duelist = true;
MC_TYPES.duelist.paint = function (K, pose, ph, pal) {
  const k = ph, walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk', parry = pose === 'parry';
  let bob = -2, lean = 0.08, twist = -0.25, sideR = 0, breath = 0, cloth = 0, hem = 0, headP = -0.12;
  let fR = [7, 4, 0], fL = [-6, -5, 0], liftR = 0, liftL = 0, G, d, back, smear = null, glow = 0.8, flag = 0;
  switch (pose) {
    case 'walk': {
      const t = ph / 8 * MC_TAU, s = Math.sin(t), c = Math.cos(t), st = 11;
      fR = [4 + st * s, 4, 0]; fL = [-3 - st * s, -5, 0]; liftR = Math.max(0, c) * 4.5; liftL = Math.max(0, -c) * 4.5;
      bob = -2 - 1.6 * Math.abs(s) + 0.6; sideR = -0.6 * c; twist = -0.25 + 0.08 * s; cloth = -2.5; hem = s; flag = s;
      G = [16, 1, 50 + Math.sin(t * 2) * 0.8]; d = mcN([0.8, -0.35, 0.45]); back = [-10, -12, 64];
      break;
    }
    case 'wind':
      lean = [0.02, -0.04, -0.08][k]; twist = [-0.35, -0.45, -0.5][k]; bob = [-2.5, -3, -3.5][k]; fR = [8, 4, 0]; fL = [-7, -5, 0];
      G = [[14, 2, 58], [10, 3, 70], [7, 4, 80]][k]; d = mcN([[0.55, -0.3, 0.8], [0.15, -0.2, 1], [-0.35, -0.1, 0.95]][k]); back = [-10, -12, 66]; glow = 0.9 + k * 0.05; cloth = 1; break;
    case 'atk':
      lean = [0.42, 0.36, 0.2][k]; twist = [-0.05, 0.05, -0.15][k]; bob = [-8, -8.5, -5][k]; fR = [[20, 5, 0], [21, 5, 0], [14, 5, 0]][k]; fL = [[-12, -5, 0], [-12, -5, 0], [-9, -5, 0]][k];
      G = [[34, -4, 44], [34, -8, 34], [24, -2, 40]][k]; d = mcN([[0.85, -0.5, -0.12], [0.55, -0.55, -0.62], [0.75, -0.3, 0.2]][k]); back = [[-18, -10, 58], [-17, -10, 56], [-12, -12, 62]][k];
      if (k === 0) smear = [G, d]; cloth = [-4, -4, -2][k]; glow = 1; flag = [-2, -1.5, -1][k]; break;
    case 'parry':
      lean = -0.08; twist = -0.45; bob = -3; fR = [4, 4, 0]; fL = [-9, -5, 0]; G = [12, 2, 56]; d = mcN([0.2, -0.75, 0.7]); back = [-8, -11, 66]; cloth = 1.2; glow = 1; break;
    default:
      breath = [0, 0.6, 1, 0.6][k]; bob = -2 - 0.4 * breath; cloth = 0.3 * breath; flag = [0, 0.4, 0.8, 0.4][k];
      G = [16, 1, 51 + breath * 0.5]; d = mcN([0.8, -0.35, 0.45 + breath * 0.02]); back = [-10, -12, 64 + breath * 0.5];
  }
  const J = mcBody(42, bob, lean, twist, sideR, breath, 22), at = J.at, TAU = MC_TAU;
  const X = J.ax(66), fN = mcN(X.f), rN = mcN(X.r), uN = X.u;
  const shR = at(66, 0, 9.5), shL = at(66, 0, -9.5);
  // ---- legs: bone thighs, the kneecaps, the shins lost in tall cuffed boots of cracked leather
  const leg = (hip, f, lift, side) => { const an = [f[0], f[1] + sideR * 0.5, 4.5 + lift], [kn, an2] = mcIK(hip, an, 20, 20, [1, side * 0.15, 0]); return { hip, kn, an: an2, toe: mcA(an2, [6.8, side * 0.3, -3.2 - lift * 0.25]) }; };
  const lR = leg(at(42, 0, 4.6), fR, liftR, 1), lL = leg(at(42, 0, -4.6), fL, liftL, -1);
  for (const lg of [lL, lR]) {
    K.cap([lg.hip, mcLp(lg.hip, lg.kn, 0.5), lg.kn], 1.7, 1.4, 'dlBone');
    K.ell(mcA(lg.hip, [0, 0, 0]), 2, 'dlBone'); K.ell(mcA(lg.kn, [1, 0, 0.3]), 1.9, 'dlBone');
    const cuff = mcLp(lg.kn, lg.an, 0.12), dd = mcN(mcS(lg.an, lg.kn));
    K.cap([mcLp(lg.kn, lg.an, 0.2), lg.an], 3.1, 2.7, 'dlLea');
    K.egg(mcA(cuff, mcM(dd, 1.2)), dd, [0, 1, 0], mcCr(dd, [0, 1, 0]), 2.2, 4.4, 4.4, 'dlLea');   // the folded cuff, flaring round the knee
    K.cap([mcA(lg.an, [-2, 0, -0.5]), mcLp(lg.an, lg.toe, 0.5), lg.toe], 3.1, 1.8, 'dlLea');
    K.cap([mcA(lg.an, [-2.4, 0, -3.3]), mcA(lg.an, [-1, 0, -4])], 1.4, 1.2, 'dlLea');
  }
  // ---- the pelvis, the spine, the cage of ribs (the cape and sash on it), the collar bones
  const X44 = J.ax(44);
  K.egg(at(44, 0, 0), X44.f, X44.r, X44.u, 4, 6.4, 3.2, 'dlBone');
  for (let u = 46; u <= 62; u += 2.6) K.egg(at(u, -2.8, 0), X44.f, X44.r, J.ax(u).u, 1.5, 1.6, 1.1, 'dlBone');
  for (let i = 0; i < 6; i++) {
    const u0 = 63 - i * 2.6, w = 7.4 - Math.abs(i - 2) * 0.55 - (i > 3 ? 1 : 0), dp = 5.4 - Math.abs(i - 2) * 0.35;
    for (const sd of [1, -1]) { const pts = []; for (let q = 0; q <= 10; q++) { const a = q / 10 * Math.PI * 0.92, dr = 2.6 * Math.pow(q / 10, 1.4); pts.push(at(u0 - dr, -2.8 + (1 - Math.cos(a)) * dp * 0.5 + Math.sin(a) * 0.4, sd * Math.sin(a) * w)); } K.cap(pts, 0.75, 0.6, 'dlBone'); }
  }
  K.cap([at(63.5, 4.6, 0), at(52, 4, 0)], 1.1, 0.8, 'dlBone');
  for (const sd of [1, -1]) K.cap([at(65.5, 3.5, sd * 1), at(66.5, 1, sd * 8.6)], 0.8, 0.8, 'dlBone');
  // the crimson sash, knotted at the hip, its ends hanging
  { const pts = []; for (let q = 0; q <= 22; q++) { const a = q / 22 * TAU; pts.push(at(46.5 + 0.6 * Math.sin(a * 2), Math.cos(a) * 5, Math.sin(a) * 7.2)); } K.cap(pts, 1.8, 1.8, 'dlRed');
    const kn = at(46, 3, -6); K.ell(kn, 2, 'dlRed');
    for (const [dx2, len] of [[0, 12], [1.4, 9]]) K.cap([kn, mcA(kn, [cloth * 0.4 + dx2 - 1, -0.5, -len * 0.5]), mcA(kn, [cloth * 0.7 + dx2 - 1.5, -0.8, -len])], 1.2, 0.8, 'dlRed'); }
  // ---- the skull, cocked, under the broad hat
  const H = at(74 + (atk ? 0 : 0), 1.2, 0), hf = mcN(mcA(mcM(fN, Math.cos(headP)), mcM(uN, -Math.sin(headP)))), hu = mcN(mcCr(hf, mcCr(uN, hf)));
  K.cap([at(66, -1.8, 0), mcA(H, mcM(hu, -3))], 1.1, 1, 'dlBone');
  mcSkull(K, H, hf, mcN(mcCr(hu, hf)), hu, 1.3, 'dlBone', 'dlInk', { jaw: atk && k === 0 ? 0.8 : wind ? 0.4 : 0.1, eyes: 'dlEye', em: glow });
  // the hat: a broad felt brim, a dented crown, a band, and the broken plume hanging off the back
  const hb = mcA(H, mcA(mcM(hu, 4.4), mcM(hf, -1.2))), brim = mcN(mcA(hu, mcM(hf, -0.45)));
  const bf = mcN(mcCr(brim, mcCr(hf, brim))), bs = mcN(mcCr(brim, bf));
  K.surf((s, t) => { const a = s * TAU, R = 3 + t * 7.8, sag = t * t * (1.4 + 0.9 * Math.sin(a * 2 + 0.7)) - (Math.cos(a) > 0.4 ? t * t * 1.4 : 0); return mcA(hb, mcA(mcM(bf, Math.cos(a) * R), mcA(mcM(bs, Math.sin(a) * R), mcM(brim, -sag)))); }, 40, 6, 'dlHat', { inside: 0.3, su: 30, sv: 6 });
  K.egg(mcA(hb, mcM(brim, 2.6)), bf, bs, brim, 4.6, 4.2, 3.6, 'dlHat');
  { const pts = []; for (let q = 0; q <= 18; q++) { const a = q / 18 * TAU; pts.push(mcA(hb, mcA(mcM(bf, Math.cos(a) * 4.7), mcA(mcM(bs, Math.sin(a) * 4.3), mcM(brim, 0.9))))); } K.cap(pts, 0.7, 0.7, 'dlRed'); }
  { const p0 = mcA(hb, mcA(mcM(bf, -3.5), mcA(mcM(bs, -3), mcM(brim, 2)))), p1 = mcA(p0, mcA(mcM(bf, -5), mcM(brim, 5 + flag * 0.3))), p2 = mcA(p1, [-3 + cloth * 0.5, -1.5, -1.5]), p3 = mcA(p2, [-1 + cloth * 0.8, -0.5, -7]);
    K.cap([p0, p1], 1.2, 1.5, 'dlPlume'); K.cap([p1, p2, p3], 1.7, 0.6, 'dlPlume'); K.ell(p1, 1.3, 'dlPlume');
    for (let i = 0; i < 4; i++) { const q = mcLp(p1, p3, 0.2 + i * 0.22); K.cap([q, mcA(q, [-1.5, -0.4 - i * 0.2, -2.5 - i * 0.6])], 0.7, 0.3, 'dlPlume'); } }
  // ---- the arms: humerus, the two bones of the forearm, a hand of small bones
  const arm = (sh, ha, hint) => { const [el, h2] = mcIK(sh, ha, 14, 13.5, hint); return { sh, el, ha: h2 }; };
  const aR = arm(shR, G, [-0.5, 0.7, -0.5]), aL = arm(shL, back, [-0.3, -0.6, -0.6]);
  const boneArm = (a, open) => {
    K.ell(a.sh, 2, 'dlBone'); K.cap([a.sh, a.el], 1.4, 1.1, 'dlBone'); K.ell(a.el, 1.5, 'dlBone');
    const dd = mcN(mcS(a.ha, a.el)), sd = mcN(mcCr(dd, [0, 0, 1])), up = mcN(mcCr(sd, dd));
    K.cap([mcA(a.el, mcM(sd, 0.6)), mcA(a.ha, mcM(sd, 0.6))], 0.8, 0.7, 'dlBone'); K.cap([mcA(a.el, mcM(sd, -0.6)), mcA(a.ha, mcM(sd, -0.5))], 0.75, 0.65, 'dlBone');
    K.egg(mcA(a.ha, mcM(dd, 1)), dd, sd, up, 1.5, 1.4, 0.8, 'dlBone');
    for (let f = -1.5; f <= 1.5; f++) { const b0 = mcA(a.ha, mcA(mcM(dd, 2), mcM(sd, f * 0.8))), b1 = mcA(b0, mcA(mcM(dd, open ? 2.4 : 1.2), mcM(up, open ? 0.5 - Math.abs(f) * 0.2 : -1.2))), b2 = mcA(b1, mcA(mcM(dd, open ? 1.3 : -0.5), mcM(up, open ? 0.6 : -1)));
      K.cap([b0, b1, b2], 0.42, 0.32, 'dlBone'); }
  };
  boneArm(aL, true);
  // the short cape over the far shoulder, lined in crimson, hanging down the back
  K.surf((s, t) => {
    const a = -Math.PI * 0.25 - s * Math.PI * 1.15, top = at(68 - Math.abs(Math.sin(a)) * 1.5, Math.cos(a) * 6.5, Math.sin(a) * 10.5);
    const rag = 3 * Math.pow(Math.max(0, Math.sin(s * 17 + 1)), 3) + 2 * mcH(Math.floor(s * 12), 4), len = 21 - rag;
    if (t > 0.9 && rag > 3.5) return null;
    const out = mcN([Math.cos(a) * 0.6 + cloth * 0.04, Math.sin(a) * 0.6, 0]);
    const p = mcA(top, mcA(mcM(out, t * (2.5 + 0.9 * Math.sin(s * 11 + hem))), [cloth * t * t * 1.2 - (walk ? Math.abs(hem) * t : 0), 0, -len * t]));
    p.push(0); return p;
  }, 40, 16, 'dlRed', { inside: 0.15, su: 26, sv: 16 });
  { const pts = []; for (let q = 0; q <= 8; q++) { const a = -Math.PI * 0.25 - q / 8 * Math.PI * 1.15; pts.push(at(68.2, Math.cos(a) * 6.8, Math.sin(a) * 10.8)); } K.cap(pts, 0.9, 0.9, 'dlHat'); }
  boneArm(aR, false);
  // ---- the sabre: a curved blade, a spine, a brass basket over the knuckles
  {
    const sd = mcN(mcCr(d, [0, 0, 1])), w = mcN(mcCr(sd, d)), bl = (l, e) => { const cv = Math.pow(l / 30, 2) * 3.2; return mcA(G, mcA(mcM(d, l), mcM(w, e - cv))); };
    K.cap([mcA(G, mcM(d, -3.2)), mcA(G, mcM(d, 1.2))], 0.9, 0.8, 'dlLea'); K.ell(mcA(G, mcM(d, -3.6)), 1.1, 'dlBrass');
    const bk = []; for (let q = 0; q <= 8; q++) { const a = Math.PI * q / 8; bk.push(mcA(G, mcA(mcM(d, 1.8 - Math.sin(a) * 1.2), mcA(mcM(w, Math.cos(a) * 2.6), mcM(sd, Math.sin(a) * 2.2))))); } K.cap(bk, 0.55, 0.55, 'dlBrass');
    K.cap([mcA(G, mcA(mcM(d, 1.6), mcM(w, -2.8))), mcA(G, mcA(mcM(d, 1.6), mcM(w, 2.8)))], 0.7, 0.7, 'dlBrass');
    K.plate([bl(2, -1), bl(2, 1), bl(26, 0.9), bl(30.5, -0.6), bl(28, -1.2)], 'dlSteel', { bevel: 0.7, bulge: 0.1 });
    const sp = []; for (let q = 0; q <= 8; q++) sp.push(bl(2 + q * 3, -0.8)); K.cap(sp, 0.42, 0.34, 'dlSteel');
    if (smear) {
      const tip = K.C(bl(30, 0)), mid = K.C(mcA(G, [2, 6, 22])), a0 = K.C(mcA(G, [-6, 8, 30]));
      K.post((D, W, H2) => { for (let i = 0; i <= 30; i++) { const t = i / 30, x = (1 - t) * (1 - t) * a0[0] + 2 * t * (1 - t) * mid[0] + t * t * tip[0], y = (1 - t) * (1 - t) * a0[1] + 2 * t * (1 - t) * mid[1] + t * t * tip[1], wd = 0.5 + t * 2.2; for (let e = -wd; e <= wd; e++) { const yy = Math.round(y + e), xx = Math.round(x); if (xx < 0 || yy < 0 || xx >= W || yy >= H2 || D[(yy * W + xx) * 4 + 3]) continue; mcDot4(D, W, H2, xx, yy, e < 0 ? [230, 236, 240] : [120, 136, 152], (0.2 + 0.7 * t) * (1 - Math.abs(e) / (wd + 1))); } } });
    }
  }
  return {};
};

// =================================================================== THE OSSUARY WARDEN
// A dead knight of the ossuary still standing its watch: black iron gone to red rust, a torn grey-brown tabard, a
// mail hood under a great helm with a single cold slit, and on the shield arm a tower shield built of fused skulls set
// in iron bands (the Warden's charge: the dead it guards). It carries a flail, iron ball studded with bone. The tell:
// the shield lowers and the flail climbs behind the shoulder; the strike brings it over the top into the ground.
mcMat('wdIron', ['#08080c', '#101015', '#19181f', '#24222a', '#322e34', '#443d3f', '#5c524e', '#7e6e62', '#a89682'], { tex: 0.12, spec: 0.022, ts: 0.5, crack: 0.012, gain: 1.18 });
mcMat('wdRust', ['#0c0707', '#1a0d0b', '#2a140f', '#3e1d13', '#552818', '#6e371e', '#8a4a28'], { tex: 0.22, ts: 0.7 });
mcMat('wdMail', ['#09090c', '#131217', '#1d1b21', '#29262b', '#373236', '#4a4244', '#625654'], { tex: 0.35, ts: 1.6, aniso: 1, gain: 1.15 });
mcMat('wdRag', ['#0b0909', '#161212', '#221c1a', '#302723', '#40342d', '#524438', '#685646', '#806a54'], { wrap: 0.3, tex: 0.1, ts: 0.45, gain: 1.15 });
mcMat('wdBone', ['#171210', '#2c231c', '#463a2c', '#62523e', '#7f6c50', '#9c8764', '#b9a47c', '#d4c196'], { tex: 0.14, crack: 0.025, ts: 0.55 });
mcMat('wdLea', ['#0c0808', '#170f0d', '#231712', '#322117', '#432c1d', '#563a26'], { tex: 0.08 });
mcMat('wdInk', ['#050407', '#08070a', '#0b090d'], { tex: 0 });
mcMat('wdGlow', ['#16303c', '#2a5a6a', '#4a8e9c', '#86c6cc', '#d0f2f0', '#f4fffe'], { emis: true });
MC_TYPES.warden = { F: [84, 84, 36, 76], scale: 1.08 };
M32F.warden = MC_TYPES.warden.F; M32WALK.warden = 3.6; M32BACK.warden = true;
// a skull on its own axes (f out of the face, r to its right, u up), s its size
function mcSkull(K, p, f, r, u, s, mat, ink, o) {
  o = o || {};
  const P = (a, b, c) => mcA(p, mcA(mcM(f, a * s), mcA(mcM(r, b * s), mcM(u, c * s))));
  K.egg(P(-0.3, 0, 0.5), f, r, u, 3.6 * s, 3.3 * s, 3.4 * s, mat);
  K.egg(P(1.6, 0, -1.6), f, r, u, 2.2 * s, 2.5 * s, 1.8 * s, mat);
  for (const b of [-1.3, 1.3]) K.egg(P(2.6, b, 0), f, r, u, 1.05 * s, 1.05 * s, 1.15 * s, ink);
  K.egg(P(3.1, 0, -1.3), f, r, u, 0.5 * s, 0.45 * s, 0.7 * s, ink);
  if (o.eyes) for (const b of [-1.3, 1.3]) K.ell(P(2.9, b, -0.1), 0.42 * s, o.eyes, { em: o.em || 0.8 });
  for (let i = -2; i <= 2; i++) K.cap([P(2.9 - Math.abs(i) * 0.3, i * 0.55, -2.5), P(2.9 - Math.abs(i) * 0.3, i * 0.55, -3.2 - (o.jaw || 0))], 0.3 * s, 0.26 * s, mat);
  if (o.jaw != null) K.egg(P(1.4, 0, -3.6 - o.jaw), f, r, u, 1.9 * s, 2.2 * s, 0.9 * s, mat);
}
MC_TYPES.warden.paint = function (K, pose, ph, pal) {
  const k = ph, walk = pose === 'walk', wind = pose === 'wind', atk = pose === 'atk', parry = pose === 'parry';
  let bob = 0, lean = 0.05, twist = 0, sideR = 0, breath = 0, cloth = 0, hem = 0, swing = 0, headT = 0;
  let shBack = 0, fR = [2, 5.5, 0], fL = [-3, -5.5, 0], liftR = 0, liftL = 0, shDrop = 0, shOut = 0, shTurn = 0, glow = 0.7;
  let ha = null, ball = null, smear = null, spark = false;
  switch (pose) {
    case 'walk': {
      const t = ph / 8 * MC_TAU, s = Math.sin(t), c = Math.cos(t), st = 9.5;
      fR = [st * s, 5.5, 0]; fL = [-st * s, -5.5, 0]; liftR = Math.max(0, c) * 4; liftL = Math.max(0, -c) * 4;
      bob = -1.6 * Math.abs(s) + 0.5; sideR = -0.7 * c; twist = 0.1 * s; lean = 0.1; cloth = -2; hem = s; swing = s; shDrop = Math.abs(s) * 0.8;
      break;
    }
    case 'wind':
      lean = [-0.02, -0.08, -0.12][k]; twist = [0.2, 0.38, 0.5][k]; shDrop = [5, 9, 11][k]; shOut = [-2, -4, -5][k]; shTurn = [0.2, 0.35, 0.45][k];
      fR = [-2, 6, 0]; fL = [5, -6, 0]; bob = [-0.5, -1, -1.5][k]; glow = 0.85 + k * 0.08; cloth = 1; break;
    case 'atk':
      lean = [0.32, 0.36, 0.22][k]; twist = [-0.16, -0.2, -0.1][k]; shDrop = [9, 10, 7][k]; shOut = [2, 2, 1][k]; shBack = [9, 10, 7][k]; shTurn = [0.6, 0.65, 0.45][k];
      fR = [9, 6, 0]; fL = [-4, -6, 0]; bob = [-3, -3.5, -2][k]; cloth = -2.5; glow = 1; break;
    case 'parry':
      lean = 0.12; fR = [5, 6, 0]; fL = [-4, -6, 0]; bob = -2; shDrop = -3; shTurn = -0.1; break;
    default:
      breath = [0, 0.6, 1, 0.6][k]; bob = -0.3 * breath; cloth = 0.3 * breath; shDrop = breath * 0.6;
  }
  const J = mcBody(44, bob, lean, twist, sideR, breath, 22), at = J.at, TAU = MC_TAU;
  const TR = [[74, 4, 4, 5], [71, 6.4, 6, 11], [67, 8, 7, 13.2], [62, 8.6, 7.2, 12.6], [56, 8, 6.8, 11], [50, 7, 6.4, 10], [46, 7.4, 7, 10.6], [43, 7.4, 7, 10.6]];
  const surfT = (u, al, s) => { const r = mcRing(TR, u), c = Math.cos(al), sn = Math.sin(al); return at(u, c * (c > 0 ? r[0] : r[1]) * (s || 1), sn * r[2] * (s || 1)); };
  const shR = at(67, 0, 12.8), shL = at(67, 0, -12.8), X67 = J.ax(67), fN = mcN(X67.f), rN = mcN(X67.r), uN = X67.u;
  // ---- the flail's hand and ball
  if (wind) { ha = mcA(shR, [[-3, 3, 4], [-7, 2, 12], [-8, 0, 17]][k]); ball = mcA(ha, [[-10, 3, -8], [-12, 2, 5], [-9, 0, 15]][k]); }
  else if (atk) { ha = mcA(shR, [[16, -3, -3], [14, -2, -10], [11, 1, -16]][k]); ball = mcA(ha, [[18, -13, -9], [15, -11, -40], [10, -6, -17]][k]); if (k === 0) smear = true; if (k === 1) spark = true; }
  else if (parry) { ha = mcA(shR, [5, 4, -18]); ball = mcA(ha, [5, 1, -12]); }
  else { ha = mcA(shR, [4 - swing * 5, 5, -24]); ball = mcA(ha, [5 - swing * 2 + cloth * 0.5, 3, -14.5]); }
  if (ball[2] < 5) ball[2] = 5;
  const arm = (sh, h, hint) => { const [el, h2] = mcIK(sh, h, 15, 14.5, hint); return { sh, el, ha: h2 }; };
  const aR = arm(shR, ha, [-0.5, 0.8, -0.3]);
  // the shield arm holds the shield forward on the far side
  const sc = mcA(at(58, 12 + shOut * 0.3 - shBack, -3.5 + shOut), [0, 0, -shDrop]);
  const sf = mcN(mcA(mcM(fN, Math.cos(shTurn)), mcM(rN, -Math.sin(shTurn)))), sr = mcN(mcCr(uN, sf)), su = mcN(mcCr(sf, sr));
  const aL = arm(shL, mcA(sc, mcA(mcM(sf, -4), mcM(sr, -2))), [-0.6, -0.8, -0.2]);
  const leg = (hip, f, lift, side) => { const an = [f[0], f[1] + sideR * 0.5, 4.5 + lift], [kn, an2] = mcIK(hip, an, 20, 19.5, [1, side * 0.12, 0]); return { hip, kn, an: an2, toe: mcA(an2, [6.4, side * 0.3, -3.2 - lift * 0.25]) }; };
  const lR = leg(at(44, 0, 5.2), fR, liftR, 1), lL = leg(at(44, 0, -5.2), fL, liftL, -1);
  // ---- legs: mail over the thighs, knee cops, greaves and sabatons of black iron
  for (const lg of [lR, lL]) {
    K.cap([lg.hip, lg.kn], 4.8, 4, 'wdMail');
    const fw = mcN(mcS(lg.toe, lg.an));
    K.egg(mcA(lg.kn, mcM(fw, 1.6)), fw, [0, 1, 0], [0, 0, 1], 3.2, 3.6, 3.4, 'wdIron');
    K.cap([mcLp(lg.kn, lg.an, 0.12), mcLp(lg.kn, lg.an, 0.95)], 3.7, 2.9, 'wdIron');
    K.cap([mcA(lg.an, [-1.5, 0, -1.2]), mcLp(lg.an, lg.toe, 0.5), lg.toe], 3, 1.7, 'wdIron');
    K.cap([mcA(lg.an, [-1, 0, 1]), mcA(lg.an, [0.5, 0, -0.8])], 3.3, 3.1, 'wdRust');
  }
  // ---- the body: an iron cuirass, rust in its seams, a tabard over it torn into strips below the belt
  K.surf((s, t) => surfT(74 - t * 30, s * TAU, 1), 80, 26, 'wdIron', { su: 40, sv: 24 });
  for (const u of [58, 53]) { const pts = []; for (let q = 0; q <= 20; q++) pts.push(surfT(u, -1.2 + 2.4 * q / 20, 1.03)); K.cap(pts, 0.7, 0.7, 'wdRust'); }
  const SK = [[46, 7.8, 7.4, 11], [36, 9, 8.4, 12.2], [26, 10.2, 9.6, 13]];
  const skirt = (lo, hi, len, mat, off) => K.surf((s, t) => {
    const al = lo + (hi - lo) * s, rag = 3.4 * Math.pow(Math.max(0, Math.sin(s * 23 + off)), 3) + 2.6 * mcH(Math.floor(s * 14 + off), 5);
    const u = 46 - t * (len - rag), r = mcRing(SK, u), c = Math.cos(al), sn = Math.sin(al), tt = (46 - u) / 22;
    if (Math.abs(Math.sin(al * 4 + off)) < 0.06 && t > 0.25) return null;   // split into strips
    const fo = 1 + tt * 0.06 * Math.sin(al * 9 + off);
    const p = [c * (c > 0 ? r[0] : r[1]) * fo + (hem * 1.6 * sn + cloth) * tt * tt + (u - 44) * Math.sin(lean) * 0.6, sideR * 0.5 + sn * r[2] * fo, u + bob * (0.4 + 0.6 * (1 - tt))];
    p.push(t > 0.85 ? (t - 0.85) * 4 : 0); return p;
  }, 50, 12, mat, { inside: 0.6, su: 30, sv: 12 });
  skirt(-1.25, 1.25, 25, 'wdRag', 0.7); skirt(Math.PI - 1.3, Math.PI + 1.3, 27, 'wdRag', 2.1); skirt(1.2, Math.PI - 1.2, 18, 'wdMail', 1.3); skirt(Math.PI + 1.2, TAU - 1.2, 18, 'wdMail', 3.3);
  // the tabard over the chest and back: a panel each, frayed at the neck
  for (const [c0, c1] of [[-0.95, 0.95], [Math.PI - 1, Math.PI + 1]]) K.surf((s, t) => { const al = c0 + (c1 - c0) * s, p = surfT(71 - t * 25, al, 1.07 + 0.02 * Math.sin(al * 11)); p.push(0); return p; }, 24, 14, 'wdRag', { su: 20, sv: 16 });
  { const pts = []; for (let q = 0; q <= 24; q++) pts.push(surfT(46.5, q / 24 * TAU, 1.12)); K.cap(pts, 1.3, 1.3, 'wdLea'); K.plate([surfT(47.6, 0.1, 1.2), surfT(47.6, 0.38, 1.2), surfT(45, 0.38, 1.2), surfT(45, 0.1, 1.2)], 'wdIron', { bevel: 0.8 }); }
  // ---- the mail hood and the great helm: a flat-topped iron barrel, a single slit with the cold light in it
  const H = at(80, 1.2 + headT, 0), hp = (f, r, u) => mcA(H, mcA(mcM(fN, f), mcA(mcM(rN, r), mcM(uN, u))));
  K.egg(at(72, 0, 0), fN, rN, uN, 6.5, 9.5, 4, 'wdMail');
  K.surf((s, t) => { const al = s * TAU, rr = 5.6 - Math.pow(Math.max(0, t - 0.8) / 0.2, 2) * 0.8; return hp(Math.cos(al) * rr * 1.06, Math.sin(al) * rr, 6.5 - t * 13); }, 40, 16, 'wdIron', { su: 30, sv: 16 });
  K.egg(hp(0, 0, 6.5), fN, rN, uN, 5.6, 5.4, 1.2, 'wdIron');
  K.cap([hp(5.2, -3.8, 0.9), hp(6.2, 0, 1.1), hp(5.2, 3.8, 0.9)], 0.95, 0.95, 'wdInk');
  for (const b of [-1.8, 1.8]) K.ell(hp(6, b, 1), 0.6, 'wdGlow', { em: glow });
  K.cap([hp(5.8, 0, 6), hp(6.6, 0, -5.5)], 1, 1, 'wdIron');                                  // the nasal ridge
  for (const [a, b] of [[1, -2.8], [1, 2.8], [-2.8, -2.8], [-2.8, 2.8]]) K.ell(hp(5.7, b, a), 0.5, 'wdRust');
  for (const u of [3.4, -3.8]) { const pts = []; for (let q = 0; q <= 16; q++) { const al = -1.4 + 2.8 * q / 16; pts.push(hp(Math.cos(al) * 5.95, Math.sin(al) * 5.7, u)); } K.cap(pts, 0.55, 0.55, 'wdRust'); }
  // ---- pauldrons: two lames each of rusted iron
  for (const [sh, side] of [[shR, 1], [shL, -1]]) {
    const lc = (f, r, u) => mcA(sh, mcA(mcM(fN, f), mcA(mcM(rN, r * side), mcM(uN, u))));
    K.egg(lc(0, 0.5, 1.2), fN, rN, uN, 6.8, 5.6, 4.6, 'wdIron');
    K.egg(lc(0, 1.8, -2.6), fN, rN, uN, 6, 4.8, 3, 'wdIron');
    K.cap([lc(-5, 2.6, -3.4), lc(0, 4.2, -4.8), lc(5, 2.6, -3.4)], 0.6, 0.6, 'wdRust');
  }
  // ---- the flail arm: mail sleeve, iron vambrace, gauntlet round the haft
  const limb = a => { K.cap([a.sh, a.el], 3.9, 3.3, 'wdMail'); K.ell(a.el, 3.2, 'wdIron'); K.cap([mcLp(a.el, a.ha, 0.1), mcLp(a.el, a.ha, 0.9)], 3.3, 2.8, 'wdIron'); K.ell(a.ha, 2.9, 'wdIron'); };
  limb(aR);
  // the flail: a short haft, a chain of links, an iron ball studded with bone spikes
  const hd = mcN(mcS(ball, ha)), hf = mcA(ha, mcM(hd, 8));
  K.cap([mcA(ha, mcM(hd, -3)), hf], 1.3, 1.1, 'wdLea'); K.ell(hf, 1.6, 'wdIron');
  { const n = 5; let p0 = hf; const sag = [0, 0, -2.5];
    for (let q = 1; q <= n; q++) { const t = q / n, p1 = mcA(mcLp(hf, ball, t), mcM(sag, Math.sin(t * Math.PI))), lk = [], dd = mcN(mcS(p1, p0)), o = q & 1 ? mcN(mcCr(dd, [0, 0, 1])) : mcN(mcCr(dd, mcCr(dd, [0, 0, 1])));
      for (let e = 0; e <= 8; e++) { const an = e / 8 * TAU; lk.push(mcA(mcLp(p0, p1, 0.5), mcA(mcM(dd, Math.sin(an) * mcLen(mcS(p1, p0)) * 0.55), mcM(o, Math.cos(an) * 0.9)))); }
      K.cap(lk, 0.45, 0.45, 'wdIron'); p0 = p1; } }
  K.ell(ball, 5, 'wdIron');
  for (const d of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1], [0.6, 0.6, 0.6], [-0.6, 0.6, -0.6], [0.6, -0.6, -0.6], [-0.6, -0.6, 0.6]]) { const n = mcN(d); K.cap([mcA(ball, mcM(n, 4.2)), mcA(ball, mcM(n, 8))], 1.2, 0.3, 'wdBone'); }
  // ---- the shield arm and the tower shield of fused skulls
  limb(aL);
  const SP = (a, b, z) => mcA(sc, mcA(mcM(sr, a), mcA(mcM(su, b), mcM(sf, z || 0))));
  K.plate([SP(-11, 21), SP(11, 21), SP(12, -8), SP(10, -21), SP(-10, -21), SP(-12, -8)], 'wdBone', { bevel: 1.6, bulge: 0.5 });
  let si = 0;
  for (let row = 0; row < 3; row++) for (let col = 0; col < (row === 1 ? 3 : 2); col++) {
    const a = row === 1 ? (col - 1) * 7.2 : (col - 0.5) * 9, b = 12.5 - row * 12.5, s = 1.3 + mcH(row, col) * 0.15, tip = (mcH(col, row + 3) - 0.5) * 0.3;
    const f2 = mcN(mcA(sf, mcM(sr, tip))), r2 = mcN(mcCr(su, f2)), u2 = mcN(mcCr(f2, r2));
    mcSkull(K, SP(a, b, 1.3), f2, r2, u2, s, 'wdBone', 'wdInk', { jaw: 0, eyes: si++ % 5 === 2 ? 'wdGlow' : null, em: 0.45 });
  }
  for (const b of [19.5, 6.2, -6.2, -19.5]) { const w = Math.abs(b) > 15 ? 10.5 : 12; K.cap([SP(-w, b, 1.6), SP(0, b, 2.6), SP(w, b, 1.6)], 1.1, 1.1, 'wdIron'); for (const a of [-w + 1.5, 0, w - 1.5]) K.ell(SP(a, b, 2.6), 0.75, 'wdRust'); }
  K.cap([SP(0, 21, 2.6), SP(0, -21, 2.6)], 1.2, 1.2, 'wdIron');
  // ---- the strike: a smear of the ball's passing; sparks and grit where it lands
  if (smear) {
    const c0 = K.C(mcA(shR, [-8, 2, 18])), c1 = K.C(ball), cm = K.C(mcA(shR, [16, -6, 22]));
    K.post((D, W, H2, Z) => { for (let i = 0; i <= 26; i++) { const t = i / 26, x = (1 - t) * (1 - t) * c0[0] + 2 * t * (1 - t) * cm[0] + t * t * c1[0], y = (1 - t) * (1 - t) * c0[1] + 2 * t * (1 - t) * cm[1] + t * t * c1[1], w = 1 + t * 3.2; for (let e = -w; e <= w; e++) { const i2 = Math.round(y + e) * W + Math.round(x); if (i2 < 0 || i2 >= W * H2 || D[i2 * 4 + 3]) continue; mcDot4(D, W, H2, x, y + e, e < -w * 0.4 ? [206, 196, 180] : [120, 112, 110], (0.25 + 0.6 * t) * (1 - Math.abs(e) / (w + 1))); } } });
  }
  if (spark) {
    const g = K.C([ball[0], ball[1], 0]);
    K.post((D, W, H2) => { for (let i = 0; i < 18; i++) { const an = -Math.PI * (0.05 + 0.9 * i / 17), r = 6 + (i % 3) * 3; mcDot4(D, W, H2, g[0] + Math.cos(an) * r * 1.6, g[1] + Math.sin(an) * r * 0.7, i % 4 ? [120, 100, 76] : [255, 214, 120]); } for (let i = -10; i <= 10; i++) if (Math.abs(i) > 2) mcDot4(D, W, H2, g[0] + i * 1.2, g[1] + 1 + (i & 1), [24, 18, 14]); });
  }
  return {};
};

// the game asks M32[type] whether a creature has a 32-bit painter (drawMon16's frame counts, monFrame's routing);
// the sculpted frames are made by mcFrame (frameM32 above), so these only mark the four as painted
for (const t in MC_TYPES) M32[t] = function () {};
})();
