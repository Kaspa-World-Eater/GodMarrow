
(function () {  // file scope: each art file keeps its own helpers

// =================================================================== v0.38: the SCULPT kit for creatures B (tag mb)
// Each creature is built as a small 3D sculpt in model space (x forward = facing right, y up, z toward the viewer's
// side), seen through an orthographic camera from the front-right and above (the back view is the same model seen
// from behind-left). Forms (tubes, ellipsoids, bevelled plates, cloth surfaces with smooth normals) go into a depth
// buffer and are lit per pixel: a warm key from the upper left, a cool rim from behind, bounce from below, cast
// shadows and contact occlusion; then quantized into hand-picked hue-shifted ramps (violet/red shadows, ochre
// lights), cleaned of lone pixels, creased where one form passes over another and given a coloured outline that
// breaks where the key light hits. Painted as an `_hr` twin at 1.5x the world grain (2 screen px per pixel).
const MBK = 1.5;
const mbHex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mbH = (i, j) => { let h = (i * 374761393 + j * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const mbVN = (x, y, s) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), h = (a, b) => mbH(a * 7 + s * 131, b * 13 + s * 17); return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; };
const V3 = {
  a: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], s: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], m: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  d: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], l: a => Math.hypot(a[0], a[1], a[2]), x: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  lp: (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
};
V3.n = a => V3.m(a, 1 / (V3.l(a) || 1));
// rotations of model points (radians): about y (yaw), z (pitch, nose up), x (roll)
V3.ry = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; };
V3.rz = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; };
V3.rx = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; };

// ------------------------------------------------------------------- materials
// r: ramp dark -> light (hue-shifted); o: outline colour; tex: cluster texture strength; ts: its scale; fib: fibre
// stretch along the surface's v; spec/sh/sc: a tight specular hit; wrap: soft cloth light; emit: glows; rimK: rim
// strength; gain: overall value; crack: dark crack lines in the texture
const MBM = [], MBMI = {};
function mbMat(name, r, o) { o = o || {}; MBMI[name] = MBM.length; MBM.push(Object.assign({ name, R: r.map(mbHex), O: mbHex(o.o || r[0]), tex: 0.06, ts: 0.45, fib: 1, spec: 0, sh: 24, wrap: 0, emit: 0, rimK: 0.4, gain: 1, crack: 0 }, o, { R: r.map(mbHex), O: mbHex(o.o || r[0]), SC: o.sc ? mbHex(o.sc) : null })); }
const mbTintRamp = (m, tint, k) => {
  const key = tint + k; m._t = m._t || {}; if (m._t[key]) return m._t[key];
  const T = mbHex(tint), tl = (T[0] + T[1] + T[2]) / 3 || 1, f = c => { const l = (c[0] + c[1] + c[2]) / 3; return c.map((v, i) => Math.round(Math.max(0, Math.min(255, v + (T[i] * l / tl - v) * k)))); };
  return (m._t[key] = { R: m.R.map(f), O: f(m.O), SC: m.SC ? f(m.SC) : null });
};

// ------------------------------------------------------------------- the camera: model space -> HR pixels
// yaw turns the camera round the model (positive: from the front-right), el looks down; (ox, oy) is where the model
// origin (the ground under the body) lands in the world frame; s is world px per model unit
function mbCam(yaw, el, ox, oy, s) {
  const C = [Math.sin(yaw) * Math.cos(el), Math.sin(el), Math.cos(yaw) * Math.cos(el)], R = V3.n([C[2], 0, -C[0]]), U = V3.x(C, R), k = s * MBK;
  return { C, R, U, k, p: q => [(ox + s * V3.d(q, R)) * MBK, (oy - s * V3.d(q, U)) * MBK, k * V3.d(q, C)], v: d => [k * V3.d(d, R), -k * V3.d(d, U), k * V3.d(d, C)], n: d => { const q = [V3.d(d, R), -V3.d(d, U), V3.d(d, C)]; return V3.n(q); } };
}

// ------------------------------------------------------------------- the sculpt
function mbSculpt(W, H) {
  const N = W * H, Z = new Float32Array(N).fill(-1e9), NX = new Float32Array(N), NY = new Float32Array(N), NZ = new Float32Array(N);
  const M = new Int16Array(N).fill(-1), GR = new Int16Array(N).fill(-1), BI = new Float32Array(N), TU = new Float32Array(N), TV = new Float32Array(N), FIN = new Map();
  let gid = 0;
  const mi = m => { const v = MBMI[m]; if (v == null) throw new Error('mb mat ' + m); return v; };
  const put = (x, y, z, nx, ny, nz, m, tu, tv, g, bi) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; if (z <= Z[i]) return; Z[i] = z; NX[i] = nx; NY[i] = ny; NZ[i] = nz; M[i] = m; TU[i] = tu; TV[i] = tv; GR[i] = g; BI[i] = bi || 0; };
  const S = {
    W, H, Z, M,
    group() { return gid++; },
    // a tube along a polyline of camera points, radius r0 -> r1, round ends. o: bias, g (group), flat (squash in z)
    cap(pts, r0, r1, mn, o) {
      o = o || {}; const m = mi(mn), g = o.g != null ? o.g : gid++, n = pts.length; let acc = 0; if (r1 == null) r1 = r0;
      for (let s = 0; s < n - 1; s++) {
        const a = pts[s], b = pts[s + 1], ra = r0 + (r1 - r0) * s / Math.max(1, n - 1), rb = r0 + (r1 - r0) * (s + 1) / Math.max(1, n - 1);
        const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1e-6, L = Math.sqrt(L2), R = Math.max(ra, rb) + 0.5;
        const x0 = Math.floor(Math.min(a[0], b[0]) - R), x1 = Math.ceil(Math.max(a[0], b[0]) + R), y0 = Math.floor(Math.min(a[1], b[1]) - R), y1 = Math.ceil(Math.max(a[1], b[1]) + R);
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
          const px = x + 0.5, py = y + 0.5; let t = ((px - a[0]) * dx + (py - a[1]) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const cx = a[0] + dx * t, cy = a[1] + dy * t, ex = px - cx, ey = py - cy, d2 = ex * ex + ey * ey, r = Math.max(0.45, ra + (rb - ra) * t); if (d2 > r * r) continue;
          const h = Math.sqrt(r * r - d2);
          put(x, y, a[2] + (b[2] - a[2]) * t + h * (o.flat || 1), ex / r, ey / r, h / r, m, acc + t * L, Math.atan2(ex, h) * r * 2, g, o.bias);
        }
        acc += L;
      }
      return g;
    },
    // a general ellipsoid: centre c, three axis vectors (camera space, their lengths are the radii)
    ellip(c, a1, a2, a3, mn, o) {
      o = o || {}; const m = mi(mn), g = o.g != null ? o.g : gid++;
      // inverse of the axis matrix (columns a1 a2 a3)
      const A = [[a1[0], a2[0], a3[0]], [a1[1], a2[1], a3[1]], [a1[2], a2[2], a3[2]]];
      const det = A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) - A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) + A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
      if (Math.abs(det) < 1e-9) return g;
      const I = [[(A[1][1] * A[2][2] - A[1][2] * A[2][1]) / det, (A[0][2] * A[2][1] - A[0][1] * A[2][2]) / det, (A[0][1] * A[1][2] - A[0][2] * A[1][1]) / det],
        [(A[1][2] * A[2][0] - A[1][0] * A[2][2]) / det, (A[0][0] * A[2][2] - A[0][2] * A[2][0]) / det, (A[0][2] * A[1][0] - A[0][0] * A[1][2]) / det],
        [(A[1][0] * A[2][1] - A[1][1] * A[2][0]) / det, (A[0][1] * A[2][0] - A[0][0] * A[2][1]) / det, (A[0][0] * A[1][1] - A[0][1] * A[1][0]) / det]];
      const w = [I[0][2], I[1][2], I[2][2]], ww = V3.d(w, w);
      const ex = Math.hypot(a1[0], a2[0], a3[0]), ey = Math.hypot(a1[1], a2[1], a3[1]);
      for (let y = Math.floor(c[1] - ey - 1); y <= Math.ceil(c[1] + ey); y++) for (let x = Math.floor(c[0] - ex - 1); x <= Math.ceil(c[0] + ex); x++) {
        const qx = x + 0.5 - c[0], qy = y + 0.5 - c[1], u0 = [I[0][0] * qx + I[0][1] * qy, I[1][0] * qx + I[1][1] * qy, I[2][0] * qx + I[2][1] * qy];
        const b = V3.d(u0, w), cc = V3.d(u0, u0) - 1, disc = b * b - ww * cc; if (disc < 0) continue;
        const z = (-b + Math.sqrt(disc)) / ww, u = [u0[0] + w[0] * z, u0[1] + w[1] * z, u0[2] + w[2] * z];
        // normal: inverse-transpose times u
        let nx = I[0][0] * u[0] + I[1][0] * u[1] + I[2][0] * u[2], ny = I[0][1] * u[0] + I[1][1] * u[1] + I[2][1] * u[2], nz = I[0][2] * u[0] + I[1][2] * u[1] + I[2][2] * u[2];
        const l = Math.hypot(nx, ny, nz) || 1;
        put(x, y, c[2] + z, nx / l, ny / l, nz / l, m, (Math.atan2(u[2], u[0]) + 3.2) * (o.su || 4), (u[1] + 1) * (o.sv || 4), g, o.bias);
      }
      return g;
    },
    ell(c, rx, ry, rz, mn, o) { return S.ellip(c, [rx, 0, 0], [0, ry, 0], [0, 0, rz], mn, o); },
    // a triangle with a normal per vertex (smooth); two-sided: the inside of cloth is darker
    tri(a, b, c, na, nb, nc, m, g, bi, ua, ub, uc, inside) {
      const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c[0]))), x1 = Math.min(W - 1, Math.ceil(Math.max(a[0], b[0], c[0]))), y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c[1]))), y1 = Math.min(H - 1, Math.ceil(Math.max(a[1], b[1], c[1])));
      const area = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); if (Math.abs(area) < 1e-6) return;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const w0 = ((b[0] - px) * (c[1] - py) - (b[1] - py) * (c[0] - px)) / area, w1 = ((c[0] - px) * (a[1] - py) - (c[1] - py) * (a[0] - px)) / area, w2 = 1 - w0 - w1;
        if (w0 < -0.02 || w1 < -0.02 || w2 < -0.02) continue;
        let nx = na[0] * w0 + nb[0] * w1 + nc[0] * w2, ny = na[1] * w0 + nb[1] * w1 + nc[1] * w2, nz = na[2] * w0 + nb[2] * w1 + nc[2] * w2, l = Math.hypot(nx, ny, nz) || 1, bb = bi;
        nx /= l; ny /= l; nz /= l; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; bb -= inside; }
        put(x, y, a[2] * w0 + b[2] * w1 + c[2] * w2, nx, ny, nz, m, ua[0] * w0 + ub[0] * w1 + uc[0] * w2, ua[1] * w0 + ub[1] * w1 + uc[1] * w2, g, bb);
      }
    },
    // a surface: fn(s, t) -> camera point, or null for a tear. Normals are smoothed over the grid.
    surf(fn, ns, nt, mn, o) {
      o = o || {}; const m = mi(mn), g = o.g != null ? o.g : gid++, G = [];
      for (let i = 0; i <= ns; i++) { const row = []; for (let j = 0; j <= nt; j++) row.push(fn(i / ns, j / nt)); G.push(row); }
      const P = (i, j) => (i < 0 || j < 0 || i > ns || j > nt) ? null : G[i][j];
      const NR = G.map((row, i) => row.map((p, j) => {
        if (!p) return null; const a = P(i + 1, j) || p, b = P(i - 1, j) || p, c = P(i, j + 1) || p, d = P(i, j - 1) || p;
        let n = V3.x(V3.s(a, b), V3.s(c, d)); const l = V3.l(n); if (l < 1e-6) return [0, 0, 1]; n = V3.m(n, 1 / l); return o.flipN ? V3.m(n, -1) : n;
      }));
      const su = o.su || 40, sv = o.sv || 20, bi = o.bias || 0, ins = o.inside == null ? 0.22 : o.inside;
      for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) {
        const a = G[i][j], b = G[i + 1][j], c = G[i + 1][j + 1], d = G[i][j + 1]; if (!a || !b || !c || !d) continue;
        const ua = [i / ns * su, j / nt * sv], ub = [(i + 1) / ns * su, j / nt * sv], uc = [(i + 1) / ns * su, (j + 1) / nt * sv], ud = [i / ns * su, (j + 1) / nt * sv];
        S.tri(a, b, c, NR[i][j], NR[i + 1][j], NR[i + 1][j + 1], m, g, bi, ua, ub, uc, ins); S.tri(a, c, d, NR[i][j], NR[i + 1][j + 1], NR[i][j + 1], m, g, bi, ua, uc, ud, ins);
      }
      return g;
    },
    // a flat polygon (camera points) with bevelled edges and a little dome
    plate(pts, mn, o) {
      o = o || {}; const m = mi(mn), g = o.g != null ? o.g : gid++, n = pts.length;
      let nx = 0, ny = 0, nz = 0, cx = 0, cy = 0, cz = 0;
      for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]); cx += a[0] / n; cy += a[1] / n; cz += a[2] / n; }
      let l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l; let bb = o.bias || 0; if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; bb -= o.inside || 0; }
      const nzc = Math.max(0.25, nz), bev = o.bevel == null ? 1.3 : o.bevel, bul = o.bulge == null ? 0.3 : o.bulge;
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      const sz = Math.max(1, Math.max(x1 - x0, y1 - y0) / 2);
      for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
        const px = x + 0.5, py = y + 0.5; let inside = false, dE = 1e9, ex = 0, ey = 0;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
          if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
          const dx = xi - xj, dy = yi - yj, L2 = dx * dx + dy * dy || 1e-6; let t = ((px - xj) * dx + (py - yj) * dy) / L2; t = t < 0 ? 0 : t > 1 ? 1 : t;
          const qx = xj + dx * t, qy = yj + dy * t, d = Math.hypot(px - qx, py - qy); if (d < dE) { dE = d; const L = Math.sqrt(L2); ex = dy / L; ey = -dx / L; if (ex * (cx - qx) + ey * (cy - qy) > 0) { ex = -ex; ey = -ey; } }
        }
        if (!inside) continue;
        const b = dE < bev ? (1 - dE / bev) * 0.9 : 0, rx = (px - cx) / sz, ry = (py - cy) / sz;
        let mx = nx + ex * b + rx * bul, my = ny + ey * b + ry * bul, mz = nz; const ll = Math.hypot(mx, my, mz) || 1;
        const z = cz - (nx * (px - cx) + ny * (py - cy)) / nzc + (1 - Math.min(1, rx * rx + ry * ry)) * bul * sz * 0.3 - b * 0.4;
        put(x, y, z, mx / ll, my / ll, mz / ll, m, (px - pts[0][0]) * (o.tus || 1), py - pts[0][1], g, bb);
      }
      return g;
    },
    // re-material a surface pixel (keeps its shape and light); with d, only where that surface is at depth ~d
    mark(x, y, mn, bias, d) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= W || y >= H) return false; const i = y * W + x; if (M[i] < 0 || (d != null && Math.abs(Z[i] - d) > 2.5)) return false; M[i] = mi(mn); if (bias != null) BI[i] += bias; return true; },
    // shift the value of a surface pixel (cracks, grime clusters)
    shade(x, y, b, d) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= W || y >= H) return false; const i = y * W + x; if (M[i] < 0 || (d != null && Math.abs(Z[i] - d) > 2.5)) return false; BI[i] += b; return true; },
    // a final colour; with d, only if nothing is in front of depth d there
    dot(x, y, col, d) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= W || y >= H) return false; const i = y * W + x; if (d != null && M[i] >= 0 && Z[i] > d + 1.5) return false; FIN.set(i, col); return true; },
    at(x, y) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= W || y >= H) return null; const i = y * W + x; return M[i] < 0 ? null : { z: Z[i], m: MBM[M[i]].name, g: GR[i] }; },
    clear(x, y) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const i = y * W + x; M[i] = -1; Z[i] = -1e9; FIN.delete(i); },
    render(o) {
      o = o || {};
      const c = mkCanvas(W, H), cx = c.getContext('2d'), img = cx.createImageData(W, H), D = img.data, IX = new Int8Array(N).fill(-1);
      const L = V3.n([-0.56, -0.6, 0.58]), LR = V3.n([0.78, -0.3, -0.55]), BN = V3.n([0.2, 0.9, 0.3]), HV = V3.n([L[0], L[1], L[2] + 1]);
      const lxy = Math.hypot(L[0], L[1]), sdx = L[0] / lxy, sdy = L[1] / lxy, sdz = L[2] / lxy;
      const RMP = MBM.map(m => o.tint ? mbTintRamp(m, o.tint, o.tk || 0.45) : m);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x, mm = M[i]; if (mm < 0) continue;
        const mat = MBM[mm], nr = mat.R.length, nx = NX[i], ny = NY[i], nz = NZ[i];
        let key = nx * L[0] + ny * L[1] + nz * L[2]; if (mat.wrap) key = (key + mat.wrap) / (1 + mat.wrap);
        const lam = Math.max(0, key);
        let sh = 1;
        if (lam > 0.02) for (let k = 2; k <= 16; k++) { const xx = Math.round(x + sdx * k), yy = Math.round(y + sdy * k); if (xx < 0 || yy < 0 || xx >= W || yy >= H) break; const j = yy * W + xx; if (M[j] >= 0 && GR[j] !== GR[i] && Z[j] > Z[i] + sdz * k + 1.4) { sh = 0.32; break; } }
        let occ = 0; for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const j = yy * W + xx; if (M[j] >= 0 && Z[j] > Z[i] + 1.6) occ++; }
        const rim = Math.pow(Math.max(0, nx * LR[0] + ny * LR[1] + nz * LR[2]), 1.3) * (1.05 - nz);
        const bo = Math.max(0, nx * BN[0] + ny * BN[1] + nz * BN[2]);
        let I = (0.05 + 1.0 * lam * sh) * (1 - occ * 0.07) + bo * 0.1 * (1 - lam) + rim * mat.rimK;
        I = I * mat.gain + BI[i];
        if (mat.tex) { const g = mbVN(TU[i] * mat.ts + mm * 3.1, TV[i] * mat.ts * mat.fib, mm + 7); if (g > 0.64) I -= mat.tex * 1.5 * (g - 0.64) / 0.36 + mat.tex * 0.5; else if (g < 0.24) I += mat.tex * 0.8; }
        if (mat.emit) I = Math.max(I, mat.emit + 0.3 * lam);
        let k = Math.round(Math.pow(Math.max(0, Math.min(1.2, I)), 1.4) * (nr - 1) + 0.1);
        if (mat.crack) { const cr = mbVN(TU[i] * 0.4 + GR[i] * 5.3, TV[i] * 0.4, 91); if (Math.abs(cr - 0.5) < mat.crack) k -= 2; }
        IX[i] = k < 0 ? 0 : k >= nr ? nr - 1 : k;
        if (mat.spec && sh > 0.5) { const hs = Math.max(0, nx * HV[0] + ny * HV[1] + nz * HV[2]); if (Math.pow(hs, mat.sh) * mat.spec > 0.55) IX[i] = 99; }
      }
      // lone pixels take the tone their four same-material neighbours agree on
      for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
        const p = y * W + x; if (IX[p] < 0 || IX[p] === 99) continue; const m = M[p]; let t = -2, ok = true;
        for (const q of [p - 1, p + 1, p - W, p + W]) { if (M[q] !== m || IX[q] < 0 || IX[q] === 99) { ok = false; break; } if (t === -2) t = IX[q]; else if (IX[q] !== t) { ok = false; break; } }
        if (ok && t !== IX[p]) IX[p] = t;
      }
      // a crease where a form passes in front of another: the one behind darkens along the edge
      const IX2 = new Int8Array(IX);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const p = y * W + x; if (IX[p] < 0 || IX[p] === 99) continue;
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const q = yy * W + xx; if (M[q] >= 0 && GR[q] !== GR[p] && Z[q] > Z[p] + 2) { IX2[p] = Math.max(0, IX[p] - (dx < 0 || dy < 0 ? 1 : 2)); break; } }
      }
      for (let p = 0; p < N; p++) { if (IX2[p] < 0) continue; const R = RMP[M[p]], col = IX2[p] === 99 ? (R.SC || R.R[R.R.length - 1]) : R.R[IX2[p]], q = p * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255; }
      // frayed cloth: threads and torn strands hang from the bottom and side edges of ragged materials
      { const A1 = new Uint8Array(N); for (let p = 0; p < N; p++) A1[p] = D[p * 4 + 3] ? 1 : 0;
        for (let y = 0; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
          const p = y * W + x; if (!A1[p] || M[p] < 0) continue; const mat = MBM[M[p]]; if (!mat.fray) continue;
          const R = RMP[M[p]].R, hb = mbH(x * 3 + 1, y * 7 + GR[p]);
          let dx = 0; if (!A1[p + W]) dx = 0; else if (!A1[p - 1] && hb < 0.5) dx = -1; else if (!A1[p + 1] && hb < 0.5) dx = 1; else continue;
          if (hb > mat.fray) continue;
          const len = 1 + Math.floor(mbH(x, y + 9) * (dx ? 2 : 4.5));
          for (let i = 1; i <= len; i++) { const xx = x + (dx ? dx * Math.ceil(i / 2) : 0), yy = y + i; if (yy >= H || xx < 0 || xx >= W) break; const q = yy * W + xx; if (A1[q]) break; const col = R[Math.max(0, Math.min(R.length - 1, IX2[p] - i))], o = q * 4; D[o] = col[0]; D[o + 1] = col[1]; D[o + 2] = col[2]; D[o + 3] = 255; M[q] = M[p]; IX2[q] = Math.max(0, IX2[p] - i); }
        } }
      for (const [p, cv] of FIN) { const col = typeof cv === 'string' ? mbHex(cv) : cv, q = p * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255; }
      // the outline: coloured by the form it bounds, left open where that edge faces the key light and is lit
      const A0 = new Uint8ClampedArray(D);
      if (!o.noOutline) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const q = (y * W + x) * 4; if (A0[q + 3]) continue;
        let best = -1, lit = true, n = 0;
        for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= W || b >= H) continue; const p = b * W + a; if (!A0[p * 4 + 3]) continue; n++; if (best < 0 || (M[p] >= 0 && M[best] < 0)) best = p; const m = M[p], hi = m >= 0 && (IX2[p] === 99 || IX2[p] >= MBM[m].R.length - 2); if (!(hi && (dx > 0 || dy > 0))) lit = false; }
        if (best < 0 || (lit && mbH(x, y) < 0.7)) continue;
        const O = M[best] >= 0 ? RMP[M[best]].O : [12, 8, 14]; D[q] = O[0]; D[q + 1] = O[1]; D[q + 2] = O[2]; D[q + 3] = 255;
      }
      cx.putImageData(img, 0, 0); return c;
    }
  };
  return S;
}
// a model-space sculpting front end: the same forms, taking model points, sizes in model units
function mbModel(S, cam) {
  const k = cam.k, P = cam.p;
  return {
    S, cam, P,
    cap: (pts, r0, r1, m, o) => S.cap(pts.map(P), r0 * k, (r1 == null ? r0 : r1) * k, m, o),
    ball: (c, r, m, o) => S.ellip(P(c), [r * k, 0, 0], [0, r * k, 0], [0, 0, r * k], m, o),
    // an ellipsoid along model axes a1, a2, a3 (model vectors with the radii as lengths)
    blob: (c, a1, a2, a3, m, o) => S.ellip(P(c), cam.v(a1), cam.v(a2), cam.v(a3), m, o),
    plate: (pts, m, o) => S.plate(pts.map(P), m, o),
    surf: (fn, ns, nt, m, o) => S.surf((s, t) => { const q = fn(s, t); return q ? P(q) : null; }, ns, nt, m, o),
    mark: (q, m, bias, x = 0, y = 0) => { const p = P(q); return S.mark(p[0] + x, p[1] + y, m, bias, p[2]); },
    shade: (q, b, x = 0, y = 0) => { const p = P(q); return S.shade(p[0] + x, p[1] + y, b, p[2]); },
    dot: (q, col, x = 0, y = 0) => { const p = P(q); return S.dot(p[0] + x, p[1] + y, col, p[2]); },
    // a line of final colour between model points (visible parts only)
    line: (a, b, col, dz = 0) => { const p = P(a), q = P(b), n = Math.max(1, Math.ceil(Math.max(Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1])))); for (let i = 0; i <= n; i++) { const t = i / n; S.dot(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, typeof col === 'function' ? col(t) : col, p[2] + (q[2] - p[2]) * t + dz); } },
    // a line that re-materials the surface under it
    mline: (a, b, m, bias) => { const p = P(a), q = P(b), n = Math.max(1, Math.ceil(Math.max(Math.abs(q[0] - p[0]), Math.abs(q[1] - p[1])))); for (let i = 0; i <= n; i++) { const t = i / n; S.mark(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, m, bias, p[2] + (q[2] - p[2]) * t); } }
  };
}
// the frame the draw code reads: c, f (flipped), fl, flf (white hit-flash) canvases at the world grain, each drawn
// from its `_hr` twin; w, h, ox, oy; bb (the painted bounds, world px)
function mbFrameOf(hr, W, H, ox, oy) {
  const lo = src => { const c = mkCanvas(W, H), x = c.getContext('2d'); x.imageSmoothingEnabled = false; x.drawImage(src, 0, 0, W, H); c._hr = src; return c; };
  const flip = src => { const c = mkCanvas(src.width, src.height), x = c.getContext('2d'); x.translate(src.width, 0); x.scale(-1, 1); x.drawImage(src, 0, 0); return c; };
  const white = src => { const c = mkCanvas(src.width, src.height), x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); return c; };
  const hf = flip(hr), HW = hr.width, HH = hr.height, d = hr.getContext('2d').getImageData(0, 0, HW, HH).data;
  let x0 = HW, y0 = HH, x1 = 0, y1 = 0;
  for (let j = 0; j < HH; j++) for (let i = 0; i < HW; i++) if (d[(j * HW + i) * 4 + 3]) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
  const bx = Math.floor(x0 / MBK), by = Math.floor(y0 / MBK);
  return { c: lo(hr), f: lo(hf), fl: lo(white(hr)), flf: lo(white(hf)), w: W, h: H, ox, oy, bb: { x: bx, y: by, w: Math.max(1, Math.ceil((x1 + 1) / MBK) - bx), h: Math.max(1, Math.ceil((y1 + 1) / MBK) - by) }, tint: (src, col) => { const q = white(src._hr || src); const x = q.getContext('2d'); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, q.width, q.height); return lo(q); } };
}
const MBP = {}, MBF = {};
{
  // hit: struck (or staggered) while not attacking, the creature shows its hit pose; dead: the corpse is its death pose
  let mbCur = null, mbDead = false;
  const _dm = drawMon16;
  drawMon16 = function (m, flash, alpha) { mbCur = m; try { return _dm.apply(this, arguments); } finally { mbCur = null; } };
  const _cl = corpsesToList;
  corpsesToList = function (list) { const n = list.length; _cl(list); for (let i = n; i < list.length; i++) { const f = list[i].f; list[i].f = () => { mbDead = true; try { f(); } finally { mbDead = false; } }; } };
  const _mf = monFrame;
  monFrame = function (type, palKey, pal, pose, ph, view) {
    if (!MBP[type]) return _mf.apply(this, arguments);
    if (mbDead && pose === 'idle') { pose = 'die'; ph = 0; }
    else if (mbCur && (pose === 'idle' || pose === 'walk') && ((mbCur.hurt || 0) > 0 || mbCur.state === 'dazed')) { pose = 'hit'; ph = (mbCur.hurt || 0) > 0.05 ? 0 : 1; }
    view = view === 'back' ? 'back' : 'front';
    const key = 'mb|' + type + '|' + palKey + '|' + pose + '|' + ph + '|' + view; let fr = ART16.cache[key]; if (fr) return fr;
    const [W, H, ox, oy] = MBF[type], S = mbSculpt(W * MBK, H * MBK);
    const hr = MBP[type](S, pose, ph, pal || {}, view, W, H, ox, oy);
    fr = mbFrameOf(hr, W, H, ox, oy); ART16.cache[key] = fr; return fr;
  };
}

// ------------------------------------------------------------------- TITHE-HAND (hound, spr 'hand')
// A right hand of the god, cut off at the wrist when the faithful divided him, grown to the size of a big dog. It
// walks on its fingertips like a spider, the torn wrist held up behind: two snapped bones, strings of sinew, blood.
// Veins and tendons stand up on the back of it; the nails are black and split. An iron tithe-ring is clamped on the
// ring finger, an iron nail is driven through the back. Across the palm runs a lipless mouth of human teeth, seen
// only when it rears.
mbMat('gskin', ['#0e0810', '#1c1020', '#2e1a2a', '#442634', '#5e3a3e', '#7c5248', '#9c6e58', '#bc906c', '#d8b48a', '#ecd4a8'], { o: '#12060e', tex: 0.07, ts: 0.5, rimK: 0.5, crack: 0.012 });
mbMat('gpalm', ['#1c0a14', '#34141e', '#502228', '#6e3432', '#8c4a3e', '#a8664e', '#c28462', '#d8a47c'], { o: '#16060c', tex: 0.05, ts: 0.6 });
mbMat('gvein', ['#0e0a1a', '#1c1430', '#2e2044', '#443056', '#5c4468', '#76587a'], { o: '#0a0612', tex: 0.02, spec: 0.5, sh: 30, sc: '#a894b0' });
mbMat('gnail', ['#050408', '#0c0a12', '#16121c', '#221c28', '#322a38', '#4a4050'], { o: '#040306', tex: 0.04, spec: 1, sh: 26, sc: '#b8b0c8', rimK: 0.6 });
mbMat('gmeat', ['#140208', '#2c040e', '#4a0814', '#6c101a', '#8e1c22', '#ae302c', '#c84c3c', '#e07458'], { o: '#12020a', tex: 0.05, spec: 0.9, sh: 18, sc: '#f4b8a0' });
mbMat('gbone', ['#1a1418', '#302628', '#4c3e38', '#6e5c4a', '#907c60', '#b09c7a', '#cebc98', '#e6d8b8'], { o: '#140e12', tex: 0.08, crack: 0.02, rimK: 0.5 });
mbMat('giron', ['#060608', '#0e0e14', '#1a1920', '#28262e', '#3a363c', '#524a4c', '#6e6260', '#8e7e76'], { o: '#050408', tex: 0.12, ts: 0.9, spec: 0.9, sh: 40, sc: '#d8c8b0' });
mbMat('grust', ['#120808', '#26100c', '#3e1a10', '#582816', '#72381c', '#8a4c26'], { o: '#0e0608', tex: 0.14, ts: 0.9 });
mbMat('gmaw', ['#060104', '#0e0308', '#18060c', '#240a12'], { o: '#060104', tex: 0 });
mbMat('glip', ['#1a0610', '#301018', '#4a1a22', '#66282c', '#823a38', '#9c5044'], { o: '#12040a', tex: 0.03, spec: 0.7, sh: 20, sc: '#e0a098' });
mbMat('gtooth', ['#2a2018', '#4e4232', '#76684e', '#a0906c', '#c8b890', '#e6dab8', '#f6eed8'], { o: '#1a120e', tex: 0.03, spec: 0.5, sh: 30, sc: '#ffffff' });
mbMat('gblood', ['#0e0206', '#22040a', '#3c0810', '#5a0c16', '#7c121c', '#9e1c22'], { o: '#0c0206', tex: 0.02, spec: 1, sh: 16, sc: '#ff9a88' });
MBF.hand = [64, 52, 30, 44];
MBP.hand = function (S, pose, ph, pal, view, FW, FH, OX, OY) {
  const bk = view === 'back';
  const walk = pose === 'walk', idle = pose === 'idle', wind = pose === 'wind', atk = pose === 'atk', hit = pose === 'hit', die = pose === 'die';
  // the rig: body position, roll (near side down), pitch (front up), yaw; the fingers walk on their tips
  let B = [0, 12.5, 0], ro = 0.3, th = -0.38, yw = 0, mouth = 0, curl = 0;
  const rot = l => {
    const [u, v, w] = l, cr = Math.cos(ro), sr = Math.sin(ro), v1 = v * cr - w * sr, w1 = v * sr + w * cr;
    const x = u * Math.cos(th) - v1 * Math.sin(th), y = u * Math.sin(th) + v1 * Math.cos(th);
    return [x * Math.cos(yw) - w1 * Math.sin(yw), y, x * Math.sin(yw) + w1 * Math.cos(yw)];
  };
  const W = l => { const r = rot(l); return [B[0] + r[0], B[1] + r[1], B[2] + r[2]]; };
  const F = {
    thumb: { k: [-2.5, -0.8, -5.2], ang: -1.35, D: 11, off: 0, r: 1.8, arch: 2.5 },
    index: { k: [7, 1.2, -4.4], ang: -0.36, D: 14.5, off: 0.5, r: 1.6, arch: 6.5 },
    middle: { k: [7.6, 1.4, -1.4], ang: -0.1, D: 16.5, off: 0, r: 1.65, arch: 7 },
    ring: { k: [7.1, 1.3, 1.6], ang: 0.16, D: 15, off: 0.5, r: 1.6, arch: 6.5 },
    pinky: { k: [6, 1, 4.3], ang: 0.5, D: 12, off: 0, r: 1.4, arch: 5.5 }
  };
  const tip = {}, arch = {}, lifted = {};
  const rest = (n, k = 1) => { const f = F[n], K = W(f.k), a = f.ang + yw; return [K[0] + Math.cos(a) * f.D * k, 0, K[2] + Math.sin(a) * f.D * k]; };
  const loc = (n, d) => W([F[n].k[0] + d[0], F[n].k[1] + d[1], F[n].k[2] + d[2]]);
  const setPose = () => { for (const n in F) { tip[n] = rest(n); arch[n] = F[n].arch; lifted[n] = 0; } };
  setPose();
  if (idle) {
    const b = [0, 0.5, 1, 0.5][ph]; B[1] -= b; setPose();
    const drum = ['middle', 'ring', 'index', null][ph];   // it drums its fingers, one after another
    if (drum) { tip[drum][1] += 3.5; tip[drum][0] -= 1.5; }
  }
  if (walk) {
    const wt = ph / 8, bb = Math.sin(wt * Math.PI * 4);
    B = [bb * 0.3, 12.9 + bb * 0.7, 0]; th += Math.sin(wt * Math.PI * 4 + 1) * 0.05; ro += Math.sin(wt * Math.PI * 2) * 0.06;
    for (const n in F) {
      const f = F[n], u = (wt + f.off) % 1; let s, lift = 0;
      if (u < 0.5) s = 1 - 4 * u; else { s = -1 + 4 * (u - 0.5); lift = Math.sin((u - 0.5) * 2 * Math.PI) * 5; }
      const r = rest(n); tip[n] = [r[0] + s * 3.5, lift, r[2]]; arch[n] = f.arch + lift * 0.3;
    }
  }
  const raise = (k, fl) => { for (const n in fl) { tip[n] = V3.lp(tip[n], loc(n, fl[n]), k); lifted[n] = k; arch[n] = F[n].arch * (1 - k) + 3.2 * k; } };
  if (wind) {
    // the fingers tense and spread, the wrist sinks, it rears and turns the palm on you: the mouth
    const k = [0.3, 0.8, 1][ph];
    B = [-3 * k, 12.5 + 2 * k, 0]; th = -0.38 + 1.85 * k; yw = 1.3 * k; ro = 0.3 * (1 - k); mouth = [0.2, 0.55, 0.9][ph];
    setPose();
    for (const n of ['thumb', 'pinky']) tip[n] = rest(n, 1 + 0.2 * k);
    raise(k, { index: [11, 2, -6.5], middle: [13, 2, -1.5], ring: [11.5, 2, 4.5] });
    if (ph === 1) tip.ring[1] += 0.5;
  }
  if (atk) {
    // the lunge, palm first and jaws open; the bite; the landing
    const L = [[9, 13, 1.35, 1.15, 1], [12, 11.5, 1.2, 1.15, 0.05], [6, 12, -0.1, 0.1, 0]][ph];
    B = [L[0], L[1], 0]; th = L[2]; yw = L[3]; ro = 0.1 * ph; mouth = L[4];
    setPose();
    if (ph === 0) { raise(1, { index: [10, 3.5, -8], middle: [13, 3, -2], ring: [10, 3.5, 5.5] }); tip.thumb = [B[0] - 17, 1.5, -8]; tip.pinky = [B[0] - 11, 2.5, 11]; }
    else if (ph === 1) { raise(1, { index: [9, -3, -3.5], middle: [10.5, -3.5, -1], ring: [9, -3, 2.5] }); tip.thumb = [B[0] - 14, 0.5, -8]; tip.pinky = [B[0] - 9, 1.5, 11]; }
    else { for (const n in F) tip[n] = rest(n, 1.08); tip.index[1] = 2; }
  }
  if (hit) {
    // struck: the body jerks back and down, the fingers splay and scrabble
    B = [-2 - ph, 11 - ph * 0.5, 0]; th = -0.55 + ph * 0.1; ro = 0.45; setPose();
    for (const n in F) { tip[n] = rest(n, 1.12 - ph * 0.05); arch[n] = F[n].arch * 0.8; }
    tip.index[1] = 2.5; tip.pinky[1] = 1.5;
  }
  if (die) {
    // dead: it has flopped down, the fingers curl in on the palm like a dead spider's legs
    B = [0, 5.5, 0]; th = -0.1; ro = 0.2; setPose(); curl = 1;
    for (const n in F) { tip[n] = V3.lp(rest(n, 0.55), loc(n, [4, -3, 0]), 0.5); tip[n][1] = Math.max(0.5, tip[n][1]); arch[n] = F[n].arch * 0.9; }
  }
  const cam = mbCam(bk ? -0.95 : 0.4, 0.42, OX, OY, 0.95), A = mbModel(S, cam);
  const back = rot([0, 1, 0]), up = [0, 1, 0], VD = cam.C;
  // ------- the fingers: three knobbed phalanges arched between knuckle and tip; a black split nail
  const fingerPts = n => {
    const f = F[n], K = W(f.k), T = tip[n];
    const ch = V3.n(V3.s(T, K));
    const pref = V3.lp(up, back, lifted[n]); let Nn = V3.n(V3.s(pref, V3.m(ch, V3.d(pref, ch))));
    const ar = arch[n];
    let j1 = V3.a(V3.lp(K, T, 0.28), V3.m(Nn, ar)), j2 = V3.a(V3.lp(K, T, 0.64), V3.m(Nn, ar * 0.7));
    if (lifted[n] < 0.5) {   // planted: the first joint carries on the line of the hand, the second breaks down to the ground
      const hx = T[0] - K[0], hz = T[2] - K[2], d = Math.hypot(hx, hz) || 1, Hh = [hx / d, 0, hz / d], l1 = n === 'thumb' ? 4.5 : 6;
      j1 = [K[0] + Hh[0] * Math.min(l1, d * 0.45), K[1] + ar * 0.45, K[2] + Hh[2] * Math.min(l1, d * 0.45)];
      j2 = [K[0] + Hh[0] * d * 0.8, K[1] * 0.55 + T[1] * 0.45 + ar * 0.35, K[2] + Hh[2] * d * 0.8];
    }
    if (curl) { j2 = V3.a(j2, [0, 1.5, 0]); }
    return { K, j1, j2, T, r: f.r * 0.95 };
  };
  const finger = n => {
    const q = fingerPts(n), g = S.group(), r = q.r;
    A.cap([q.K, q.j1], r * 1.05, r * 0.95, 'gskin', { g });
    A.ball(q.j1, r * 1.05, 'gskin', { g });
    A.cap([q.j1, q.j2], r * 0.92, r * 0.8, 'gskin', { g });
    A.ball(q.j2, r * 0.88, 'gskin', { g });
    const d = V3.n(V3.s(q.T, q.j2)), tipC = V3.s(q.T, V3.m(d, 0.6));
    A.cap([q.j2, tipC], r * 0.8, r * 0.62, 'gskin', { g });
    // the nail: a black split shell over the last joint, drawn out past the tip into a point
    const upn = V3.n(V3.s(V3.lp(up, back, lifted[n] * 0.6 + 0.2), V3.m(d, V3.d(V3.lp(up, back, lifted[n] * 0.6 + 0.2), d))));
    const nb = V3.a(V3.lp(q.j2, q.T, 0.45), V3.m(upn, r * 0.55));
    A.cap([nb, V3.a(q.T, V3.m(upn, r * 0.35)), V3.a(q.T, V3.a(V3.m(d, 1.6), V3.m(upn, -0.2)))], r * 0.62, 0.35, 'gnail', { g });
    if (n === 'ring') {   // the tithe-ring: an iron band clamped on the first joint, rust bleeding from it
      const a = V3.n(V3.s(q.j1, q.K)), n1 = V3.n(V3.x(a, [0, 0, 1])), n2 = V3.x(a, n1), c = V3.lp(q.K, q.j1, 0.5), ring = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12 * Math.PI * 2; ring.push(V3.a(c, V3.a(V3.m(n1, Math.cos(t) * (r * 1.05)), V3.m(n2, Math.sin(t) * (r * 1.05))))); }
      A.cap(ring, 0.62, 0.62, 'giron');
    }
    return q;
  };
  const depth = p => V3.d(V3.s(p, B), VD);
  const order = Object.keys(F).map(n => [n, depth(W(F[n].k)) + (lifted[n] ? 3 : 0)]).sort((a, b) => a[1] - b[1]);
  const fq = {};
  for (const [n] of order) fq[n] = finger(n);
  // ------- the torn wrist: two snapped bones jutting from it, raw meat, a ragged cuff of skin
  const bone1 = W([-14, 3, -1.4]), bone2 = W([-11.2, -0.8, 1.9]);
  A.cap([W([-6, 1, -1.5]), W([-10, 2, -1.5]), bone1], 1.25, 1.0, 'gbone');
  A.cap([W([-6, -0.5, 1.8]), bone2], 1.15, 0.95, 'gbone');
  const gB = S.group();
  // the back of the hand: domed, broad at the knuckles and narrowing to the wrist
  A.blob(W([0.6, 0.9, 0]), rot([8.4, 0, 0]), rot([0, 2.7, 0]), rot([0, 0, 6.3]), 'gskin', { g: gB });
  A.blob(W([-5.2, 0.6, 0]), rot([4, 0, 0]), rot([0, 2.9, 0]), rot([0, 0, 4.3]), 'gskin', { g: gB });
  A.blob(W([-1.5, -0.9, -4.2]), rot([4.5, 0, 0]), rot([0, 2, 0]), rot([0, 0, 2.2]), 'gskin', { g: gB });   // the ball of the thumb
  const kn = ['pinky', 'ring', 'middle', 'index'];
  for (const n of kn) { const k = F[n].k; A.ball(W([k[0] - 0.4, k[1] + 0.9, k[2]]), 1.75, 'gskin', { g: gB }); }
  // the stump: a ragged cuff of skin and the raw meat inside it
  const cuff = []; for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI * 2, rr = 1 + (i % 3 === 1 ? -0.14 : i % 2 ? 0.06 : 0); cuff.push(W([-8.4 - (i % 3) * 0.35, 0.5 + Math.sin(a) * 3.1 * rr, Math.cos(a) * 4.2 * rr])); }
  A.cap(cuff, 0.7, 0.7, 'gskin', { g: gB });
  A.blob(W([-8.9, 0.5, 0]), rot([0.9, 0, 0]), rot([0, 2.9, 0]), rot([0, 0, 3.9]), 'gmeat');
  // tendons fanning from the wrist to each knuckle, the dome's surface height at (u, w)
  const top = (u, w) => { const a = (u - 0.6) / 8.4, b = w / 6.3, q = 1 - a * a - b * b; return 0.9 + 2.7 * Math.sqrt(Math.max(0, q)); };
  for (const n of kn) { const k = F[n].k, pts = []; for (let i = 0; i <= 5; i++) { const s = i / 5, u = -6 + (k[0] - 1.2 + 6) * s, w = k[2] * (0.25 + 0.75 * s); pts.push(W([u, Math.max(top(u, w), top(-4.5, w) * (1 - s)) + 0.05, w])); } A.cap(pts, 0.5, 0.42, 'gskin', { g: gB }); }
  // veins standing up between them
  const vein = (pts, r) => A.cap(pts.map(([u, w, e]) => W([u, top(u, w) + (e || 0.15), w])), r, r * 0.8, 'gvein', { g: gB });
  if (!die) { vein([[-7.5, 0.8], [-4.5, 0.1], [-1.5, 0.6], [1.5, -0.6], [4.5, -0.1]], 0.42); vein([[-4, 0.2], [-2, 2.3], [1.5, 3], [3.8, 3.8]], 0.36); vein([[-6, -1.5], [-3, -2.8], [0, -2.4]], 0.3); }
  // ------- the palm: a lipless mouth of human teeth across it, open as it rears
  {
    const pc = [0.9, 0.9 - 2.55, 0], open = 0.5 + mouth * 2.1, L = 4.8, g = S.group();
    A.blob(W([pc[0], pc[1] - 0.05, 0]), rot([open + 0.9, 0, 0]), rot([0, 0.7, 0]), rot([0, 0, L + 0.9]), 'glip', { g });
    A.blob(W([pc[0], pc[1] - 0.25, 0]), rot([open, 0, 0]), rot([0, 0.6, 0]), rot([0, 0, L]), 'gmaw', { g });
    for (let i = -5; i <= 5; i++) {
      const w = i / 5 * L * 0.88, e = Math.sqrt(Math.max(0, 1 - (w / L) ** 2)), ln = 0.7 + 0.35 * e + mouth * 0.25;
      if (Math.abs(i) === 5) continue;
      A.cap([W([pc[0] + open * e, pc[1] - 0.45, w]), W([pc[0] + open * e - ln, pc[1] - 0.6, w])], 0.42, 0.2, 'gtooth', { g });
      A.cap([W([pc[0] - open * e, pc[1] - 0.45, w + 0.4]), W([pc[0] - open * e + ln * 0.85, pc[1] - 0.6, w + 0.4])], 0.4, 0.2, 'gtooth', { g });
    }
    if (mouth > 0.5) A.cap([W([pc[0] - 0.4, pc[1] - 0.5, -1]), W([pc[0] + 0.6, pc[1] - 0.9, 0.5])], 0.8, 0.6, 'gmeat');   // the tongue stump
  }
  // ------- the iron nail driven through the back; sinew and blood hanging from the stump
  const nailP = W([0.4, top(0.4, 1.4) + 0.2, 1.4]);
  A.cap([nailP, W([0.4, top(0.4, 1.4) + 1.5, 1.2])], 0.6, 0.55, 'giron');
  A.ball(W([0.4, top(0.4, 1.4) + 1.6, 1.2]), 0.95, 'giron');
  const sw = walk ? Math.sin(ph / 8 * Math.PI * 2) * 1.5 : atk ? -2 : 0;
  for (const [z, len, mat, r] of [[-2.2, 6, 'gskin', 0.45], [0.6, 9, 'gmeat', 0.5], [2.4, 4.5, 'gmeat', 0.38], [-0.8, 7.5, 'gblood', 0.34]]) {
    const a = W([-9.2, -1.2, z]), pts = [a];
    for (let i = 1; i <= 4; i++) { const t = i / 4; pts.push([a[0] - 1.2 * t - (sw * 0.3 + 0.4) * t * t, Math.max(0.3, a[1] - len * t), a[2] + 0.2 * t]); }
    A.cap(pts, r, r * 0.6, mat);
    if (mat !== 'gskin') A.ball(pts[4], r * 1.15, 'gblood');
  }
  // ------- hand-placed detail at the HR grain
  const P = cam.p, K = cam.k;
  // knuckle creases and the lit crowns of the knuckles
  for (const n of kn) { const k = F[n].k; A.mark(W([k[0] - 0.2, k[1] + 2.4, k[2] - 0.5]), 'gpalm', -0.18); A.mark(W([k[0] - 0.2, k[1] + 2.4, k[2] + 0.4]), 'gpalm', -0.18); }
  for (const n in fq) {
    const q = fq[n];
    for (const j of [q.j1, q.j2]) { const p = P(j); S.shade(p[0], p[1] + 1, -0.22, p[2] - 1.5); S.shade(p[0] + 1, p[1] + 1, -0.22, p[2] - 1.5); }
  }
  // the tithe carved into the back: a scored cross, old and scabbed
  if (!die) { A.mline(W([-4.8, top(-4.8, -2.4), -2.4]), W([-2.2, top(-2.2, -2.4), -2.4]), 'gmeat', -0.25); A.mline(W([-3.5, top(-3.5, -3.8), -3.8]), W([-3.5, top(-3.5, -0.9), -0.9]), 'gmeat', -0.25); }
  // blood welling round the nail and running down the flank
  { const p = P(nailP); for (let i = 0; i < 5; i++) S.mark(p[0] + 1 + (i > 2 ? 1 : 0), p[1] + i, 'gblood', 0.1, null); }
  // the marrow in the snapped bones
  for (const b of [bone1, bone2]) { const p = P(b); S.dot(p[0], p[1], '#5a0a14', p[2] + 2); S.dot(p[0] - 1, p[1], '#2a0408', p[2] + 2); }
  // liver spots and grime clustered down the shadowed flank
  for (let i = 0; i < 7; i++) { const u = -6 + mbH(i, 3) * 11, w = 1.5 + mbH(i, 9) * 4; A.shade(W([u, top(u, w), w]), -0.16); A.shade(W([u, top(u, w), w]), -0.16, 1, 0); }
  // a drop falling from the stump, a small pool under it when it stands
  if (!atk && !wind) { const a = P([B[0] - 12, 0, 0.5]); for (let i = -2; i <= 2; i++) S.dot(a[0] + i, a[1], i === 0 ? '#5a0c16' : '#34060c'); S.dot(a[0], a[1] - 1, '#7c121c'); }
  return S.render({ tint: pal.tint, tk: 0.35 });
};
M32.hand = function () {}; M32F.hand = [64, 52, 30, 44]; M32WALK.hand = 7; M32BACK.hand = true;

// ------------------------------------------------------------------- WEEPER (archer, and the Ossuary Weeper)
// A tall faceless mourner, a head taller than a man: a black veil over a grey shroud that drags on the ground, a
// crown of thorns pressed down over the veil, and in the veil's opening a smooth pale plate with no face at all,
// down which it weeps. The tears set into bone needles; it gathers them in long grey fingers and throws them.
mbMat('wshroud', ['#0a0a12', '#161620', '#242632', '#343844', '#484c56', '#5e6068', '#787672', '#948c80', '#b4a894'], { fray: 0.55, o: '#07060c', tex: 0.07, ts: 0.35, fib: 0.25, wrap: 0.1, rimK: 0.45 });
mbMat('wveil', ['#040306', '#08060c', '#0e0b14', '#16121c', '#201a26', '#2c2432', '#3a3040', '#4c4052'], { fray: 0.55, o: '#030205', tex: 0.05, ts: 0.3, fib: 0.2, wrap: 0.15, rimK: 0.7, spec: 0.35, sh: 12, sc: '#6a6078' });
mbMat('wshroudO', ['#141012', '#262022', '#3c3430', '#564c42', '#726652', '#8e8266', '#aa9e7e', '#c6ba98', '#ded4b4'], { fray: 0.55, o: '#100c0e', tex: 0.08, ts: 0.35, fib: 0.25, wrap: 0.25, rimK: 0.4, crack: 0.01 });
mbMat('wveilO', ['#0c0a0c', '#181418', '#262022', '#362e2c', '#4a4038', '#5e5446', '#766a56'], { fray: 0.55, o: '#080608', tex: 0.06, ts: 0.3, fib: 0.2, wrap: 0.15, rimK: 0.6 });
mbMat('wplate', ['#1e1a22', '#3a3438', '#5a5250', '#7e7670', '#a29a90', '#c2bcb0', '#dcd8cc', '#f2eee4'], { o: '#18141a', tex: 0.02, spec: 0.6, sh: 24, sc: '#ffffff', rimK: 0.5, emit: 0.42 });
mbMat('wthorn', ['#060304', '#140a08', '#24140e', '#382214', '#4e321c', '#684626', '#825c34'], { o: '#050203', tex: 0.12, ts: 1.2, rimK: 0.5 });
mbMat('wgrey', ['#0c0a10', '#1a161e', '#2a2530', '#3e3840', '#554e52', '#6e6664', '#8a8078', '#a89c90'], { o: '#0a080c', tex: 0.05, rimK: 0.5 });
mbMat('wcord', ['#0c0806', '#1c140c', '#2e2214', '#44341e', '#5a4628', '#725c36', '#8c7446'], { o: '#0a0604', tex: 0.2, ts: 1.4, fib: 0.3 });
mbMat('wbead', ['#2a2018', '#4a3e2e', '#6e6048', '#948664', '#b8aa86', '#d8ceae', '#f0e8d0'], { o: '#1a140e', tex: 0.03, spec: 0.6, sh: 20, sc: '#fffaf0' });
mbMat('wneedle', ['#3a3a48', '#6a7080', '#9aa6b8', '#c8d4e2', '#e8f0f8', '#ffffff'], { o: '#1a1c28', tex: 0, spec: 0.8, sh: 20, sc: '#ffffff' });
mbMat('wtear', ['#1a3448', '#2e5a78', '#4a88aa', '#7ab8d8', '#b4e0f4', '#e8fbff'], { o: '#10243a', tex: 0, emit: 0.55 });
MBF.weeper = [60, 64, 28, 58];
MBP.weeper = function (S, pose, ph, pal, view, FW, FH, OX, OY) {
  const oss = pal.tint && parseInt(pal.tint.slice(1, 3), 16) > 200 && parseInt(pal.tint.slice(5, 7), 16) > 180;   // the Ossuary kind: bleached
  const SH = oss ? 'wshroudO' : 'wshroud', VL = oss ? 'wveilO' : 'wveil';
  const walk = pose === 'walk', idle = pose === 'idle', wind = pose === 'wind', atk = pose === 'atk', hit = pose === 'hit', die = pose === 'die';
  let by = 0, lean = 0, tilt = 0, trail = 1, glow = 0, wave = 0, arm = 'hold', k = 0, bow = 0.25, sw = 0;
  if (idle) { by = [0, 0.3, 0.6, 0.3][ph]; wave = ph * 0.8; trail = 1 + [0, 0.5, 1, 0.5][ph]; }
  if (walk) { const a = ph / 8 * Math.PI * 2; sw = Math.sin(a); by = Math.sin(a * 2) * 0.5; lean = 0.08; trail = 3 + Math.sin(a - 1) * 1.5; wave = ph * 0.9; }
  if (wind) { k = [0.35, 0.7, 1][ph]; tilt = k; glow = k; arm = 'draw'; trail = 1.5; by = 0.8 * k; lean = -0.08 * k; bow = 0.25 - 0.5 * k; }
  if (atk) { arm = 'fling'; tilt = [0.6, 0.2, 0][ph]; glow = [1, 0.5, 0.2][ph]; lean = [0.2, 0.18, 0.1][ph]; trail = [0, 0.5, 1][ph]; bow = [0.1, 0.35, 0.3][ph]; }
  if (hit) { lean = -0.16 + ph * 0.06; bow = -0.35 + ph * 0.15; trail = 2; tilt = 0.3; arm = 'flinch'; }
  if (die) { lean = 0.28; bow = 0.9; by = -2.5; trail = 0.5; arm = 'limp'; }
  const bk = view === 'back', cam = mbCam(bk ? -0.8 : 0.72, 0.36, OX, OY, 1), A = mbModel(S, cam);
  // the body leans from the feet: every point above the ground is carried forward by lean
  const L = p => [p[0] + p[1] * lean, p[1] + by * (p[1] / 40), p[2]];
  const HY = 42, head = L([0.8 + Math.sin(bow) * 2.2, HY - Math.abs(bow) * 0.8, 0]);
  const hr = q => { const a = -bow * 0.9 + tilt * 0.35; return V3.a(head, V3.ry(V3.rz(q, -a), -0.55)); };   // head space: bowed forward by bow
  // ------- the shroud: narrow at the shoulders, falling in folds to a ragged hem that drags behind
  const shroud = (s, t) => {
    const a = s * Math.PI * 2, y = 37 - t * 37, rx = 3.6 + t * 5.2 + t * t * 1.4, rz = 3.2 + t * 4 + t * t * 0.8;
    const fold = (0.45 + t * 1.2) * Math.sin(a * 7 + 0.6 + t * 1.5 + (walk ? sw * t : 0)) + 0.25 * t * Math.sin(a * 13 + wave);
    let x = Math.cos(a) * (rx + fold) - trail * t * t * 1.4 + (walk ? sw * t * t * 0.8 : 0), z = Math.sin(a) * (rz + fold * 0.8);
    let yy = y; if (t > 0.97) { const h = mbH(Math.floor(s * 22) + 3, Math.floor(wave)); yy += h * 2.2 - 0.3 + (Math.cos(a) < 0 ? -0.5 * trail * 0.3 : 0); if (h > 0.86) return null; }
    return L([x, Math.max(-0.5, yy), z]);
  };
  const gS = A.surf(shroud, 40, 14, SH, { su: 60, sv: 30, inside: 0.3 });
  // the far arm (behind the body in the front view)
  const sh1 = L([0.2, 36.5, -3.6]), sh2 = L([0.4, 36.5, 3.6]);
  // ------- the long veil falling behind from the crown, trailing as it glides
  const veil = (s, t) => {
    const w = (s - 0.5) * 2, top = hr([-1.2, 2.8, 0]), yb = 4 + (1 - t) * 0;
    const y = top[1] - t * (top[1] - 5 - Math.abs(w) * 3 - (mbH(Math.floor(s * 10), 7) * 3 * (t > 0.95 ? 1 : 0)));
    const x = top[0] - 2.2 - t * 2.5 - trail * t * t * 2.2 - Math.cos(w * 1.4) * 1.6 + Math.sin(t * 9 + w * 3 + wave) * 0.35 * t;
    const z = w * (3.6 + t * 4.2) + Math.sin(t * 7 + wave * 0.7) * 0.3;
    return [x, y, z];
  };
  A.surf(veil, 14, 18, VL, { su: 30, sv: 50, inside: 0.25 });
  // ------- the mourning-cape over the shoulders: its own layer with a ragged edge
  const cape = (s, t) => {
    const a = s * Math.PI * 2, y = 38.5 - t * 9.5, r = 3.8 + t * 3.4, f = 0.3 * t * Math.sin(a * 9 + 1);
    let yy = y; if (t > 0.9) yy += (mbH(Math.floor(s * 18), 3) - 0.5) * 2.4;
    return L([Math.cos(a) * (r + f) - trail * t * 0.3 + 0.2, yy, Math.sin(a) * (r * 0.95 + f)]);
  };
  A.surf(cape, 36, 6, SH, { su: 50, sv: 10, inside: 0.3, bias: 0.04 });
  // the cord round the waist, knotted, its end swinging
  { const ring = []; for (let i = 0; i <= 20; i++) { const a = i / 20 * Math.PI * 2; ring.push(L([Math.cos(a) * 5.3 - 0.1, 23.5 + Math.cos(a) * 0.4, Math.sin(a) * 4.6])); } A.cap(ring, 0.55, 0.55, 'wcord');
    const kx = L([4.6, 23.4, 2.2]); A.ball(kx, 0.9, 'wcord'); const e = [kx, V3.a(kx, [0.4 - sw * 0.6, -3, 0.4]), V3.a(kx, [0.2 - sw * 1.2, -6.5, 0.6])]; A.cap(e, 0.45, 0.35, 'wcord'); A.ball(e[2], 0.6, 'wcord'); }
  // ------- the head: the veil draped over it, the plate in its opening, the crown of thorns
  A.blob(hr([-1.3, 0.8, 0]), [3.5, 0, 0], [0, 4.9, 0], [0, 0, 3.9], VL);
  { const hd = q => V3.ry(V3.rz(q, bow * 0.9 - tilt * 0.35), -0.55); A.blob(hr([2.1, 0, 0]), hd([1.9, 0, 0]), hd([0, 3.7, 0]), hd([0, 0, 2.7]), 'wplate'); }
  // the veil's lip over the brow, throwing its shadow on the plate
  A.cap([hr([-0.8, 3.4, -3.2]), hr([1.8, 3.5, -1.8]), hr([2.6, 3.5, 0]), hr([1.8, 3.5, 1.8]), hr([-0.8, 3.4, 3.2])], 1, 1, VL);
  const crown = []; for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI * 2; crown.push(hr([Math.cos(a) * 3.9 - 0.3, 2.7 + Math.sin(a * 3) * 0.3, Math.sin(a) * 4])); }
  A.cap(crown, 0.62, 0.62, 'wthorn');
  for (let i = 0; i < 11; i++) { const a = i / 11 * Math.PI * 2 + 0.2, b = hr([Math.cos(a) * 4 - 0.3, 2.8, Math.sin(a) * 4.1]), o = [Math.cos(a) * 1.9, 1.2 + mbH(i, 2) * 1.6, Math.sin(a) * 1.9]; A.cap([b, V3.a(b, o)], 0.38, 0.12, 'wthorn'); }
  // ------- arms: wide sleeves, long grey hands, the needles
  let E, Hn, nd, far = [L([0.8, 30, -4]), L([2.8, 26.5, -2.6])];
  if (arm === 'hold') { const s = idle ? [0, 0, 1, 1][ph] * 0.3 : walk ? sw * 0.7 : 0; E = L([2 + s, 29, 4.6]); Hn = L([3.4 + s, 23, 4.8]); nd = [0.35, -1, 0.1]; }
  else if (arm === 'draw') { E = L([-1 - k * 2, 33 + k * 3, 5]); Hn = L([-2.5 - k * 3, 36 + k * 5, 4.5]); nd = [-0.6, 0.8, 0]; }
  else if (arm === 'fling') { E = L([[5, 35, 4], [5.5, 33, 3.5], [4, 29, 4]][ph]); Hn = L([[10, 35, 3], [10, 30, 2.5], [5.5, 24, 4.2]][ph]); nd = [[1, 0.05, -0.1], [1, -0.4, -0.1], [0.4, -1, 0]][ph]; }
  else if (arm === 'flinch') { E = L([3, 32, 5.2]); Hn = L([5.5, 36 - ph, 4.5]); nd = [0.4, 0.9, 0]; far = [L([2.5, 32, -4.5]), L([4.5, 35, -3.5])]; }
  else { E = L([1.2, 28.5, 4.4]); Hn = L([1.6, 21.5, 4.2]); nd = [0.1, -1, 0]; far = [L([0.6, 29, -4.3]), L([1, 22, -4])]; }
  // far arm and hand (at the breast, with the rosary)
  A.cap([sh1, far[0]], 1.9, 2.3, SH); A.cap([far[0], far[1]], 1.3, 0.9, 'wgrey');
  if (arm === 'hold' || arm === 'fling' || arm === 'draw') for (let i = -1; i <= 1; i++) A.cap([far[1], V3.a(far[1], [1.8, 0.8 + i * 0.7, 1.2])], 0.4, 0.3, 'wgrey');
  // the near arm
  A.cap([sh2, E], 1.9, 2.2, SH); A.cap([E, V3.lp(E, Hn, 0.55)], 2.2, 2.7, SH, { flat: 0.8 });
  A.cap([V3.lp(E, Hn, 0.4), Hn], 0.8, 0.75, 'wgrey');
  const nn = V3.n(nd), side = V3.n(V3.x(nn, [0, 0, 1]));
  const needles = arm === 'hold' || arm === 'draw' || (arm === 'fling' && ph === 2);
  for (let i = -1; i <= 1; i++) {
    const dir = V3.n(V3.a(nn, V3.m(side, i * 0.4))), f1 = V3.a(Hn, V3.m(dir, 2.2)), f2 = V3.a(f1, V3.a(V3.m(dir, 1.6), [0, -0.6, 0]));
    A.cap([Hn, f1, f2], 0.42, 0.28, 'wgrey');
    if (needles) A.cap([V3.a(Hn, V3.m(dir, 1)), V3.a(Hn, V3.m(dir, 6.5 + (i === 0 ? 1 : 0)))], 0.3, 0.14, glow > 0.4 ? 'wtear' : 'wneedle');
  }
  // the rosary of small bones hanging from the far fist, swinging
  if (arm !== 'limp') { const rs = walk ? Math.sin(ph / 8 * Math.PI * 2 - 1) * 1.2 : 0; for (let i = 1; i < 9; i++) A.ball(V3.a(far[1], [0.9 + rs * i / 9, -i * 1.15, 1.6]), i % 2 ? 0.45 : 0.55, 'wbead'); A.cap([V3.a(far[1], [0.9 + rs, -10.3, 1.6]), V3.a(far[1], [0.9 + rs, -12.8, 1.6])], 0.35, 0.35, 'wbead'); A.cap([V3.a(far[1], [-0.1 + rs, -11.3, 1.6]), V3.a(far[1], [1.9 + rs, -11.3, 1.6])], 0.35, 0.35, 'wbead'); }
  // ------- detail: the weeping. Tear tracks from where eyes would be, setting into needles at the chin
  const TR = glow > 0.5 ? ['#ffffff', '#bfe8ff', '#6aa8d8'] : glow > 0 ? ['#e8f6ff', '#8ab8d8', '#4a6a88'] : ['#dce4ea', '#8a98a8', '#46505e'];
  const pr = q => hr(V3.rz(q, 0));
  if (!bk || Math.abs(cam.C[0]) < 2) for (const ez of [-1.1, 1]) {
    const e = pr([3.7, 0.9, ez]); A.dot(e, '#2a2630', 0, 0); A.dot(e, '#524a50', 1, 0);
    for (let i = 1; i <= 6; i++) { if (i === 3) continue; const p = pr([3.75 - i * 0.05, 0.9 - i * 0.62, ez * (1 - i * 0.03)]); A.dot(p, TR[i > 4 ? 1 : 2], 0, 0); }
    const c1 = pr([3.2, -3.9, ez]), c2 = pr([3.2, -5.6, ez * 0.9]); A.line(c1, c2, TR[1], 3); A.dot(c2, glow > 0.4 ? '#ffffff' : '#d8dce0', 0, 1);
  }
  // blood run from the thorns down the brow of the plate
  if (!bk) for (const [ez, n] of [[-0.3, 4], [1.6, 2]]) for (let i = 0; i < n; i++) A.dot(pr([3.5, 2.6 - i * 0.55, ez]), i === n - 1 ? '#5a0a14' : '#9e1c22', 0, 0);
  // light on the crown of the veil; grave-dirt on the hem
  for (let i = 0; i < 9; i++) { const a = mbH(i, 5) * Math.PI * 2, t = 0.82 + mbH(i, 8) * 0.16, p = shroud(a / (Math.PI * 2), t); if (p) { A.shade(p, -0.14); A.shade(p, -0.14, 1, 0); } }
  if (glow > 0.3) for (const [dx, dy] of [[4.5, 1], [4.8, -1], [4.2, 3], [4, -3]]) A.dot(hr([dx, dy, 0]), glow > 0.7 ? '#bfe8ff' : '#4a6a88', 0, 0);
  // flung needles in the air, with their streaks
  if (arm === 'fling' && ph < 2) {
    for (const [dy, ln] of [[-1.5, 7], [0, 8], [1.5, 6]]) { const a = V3.a(Hn, [3 + ph * 3, dy * (ph ? 1.4 : 0.8), 0]), b = V3.a(a, [ln, -dy * 0.2, 0]); A.cap([a, b], 0.3, 0.15, 'wtear'); A.line(V3.a(a, [-4, 0, 0]), a, t => t < 0.5 ? '#2e4a64' : '#6aa8d8', 2); }
  }
  return S.render({ tint: oss ? null : pal.tint, tk: 0.4 });
};
M32.weeper = function () {}; M32F.weeper = MBF.weeper; M32WALK.weeper = 3.4; M32BACK.weeper = true;

// ------------------------------------------------------------------- GASP (caster, and the Mire Gasp)
// A stray piece of the god's last breath: a torn grey veil in the shape of a hooded mourner, drifting a hand's
// breadth off the ground, with no face but mouths, gaping all over the cloth. It inhales and billows wide, then
// lunges and exhales.
mbMat('pgauze', ['#0a0c16', '#141a2a', '#20283c', '#2e3a50', '#3e4c64', '#526278', '#6a7a8e', '#8494a6', '#a2b0be', '#c4ccd4'], { fray: 0.55, o: '#080a14', tex: 0.08, ts: 0.3, fib: 0.22, wrap: 0.3, rimK: 0.6 });
mbMat('pgauzeD', ['#06070e', '#0c0f1a', '#141a28', '#1e2636', '#2a3446', '#384456'], { fray: 0.55, o: '#05060c', tex: 0.08, ts: 0.3, fib: 0.22, wrap: 0.3, rimK: 0.5 });
mbMat('phollow', ['#020206', '#05050c', '#0a0a14'], { o: '#020206', tex: 0 });
mbMat('plip', ['#0e0a16', '#1c1424', '#2c1e32', '#3e2a3e', '#523848', '#684854', '#7e5a60'], { o: '#10060c', tex: 0.03, spec: 0.6, sh: 18, sc: '#e8b8b0', rimK: 0.4 });
mbMat('pteeth', ['#2a2216', '#4a3e2a', '#6e6040', '#948458', '#b8a878', '#d6c89c', '#ece2c2'], { o: '#1c160e', tex: 0.02, spec: 0.5, sh: 30, sc: '#fff8e0' });
mbMat('pbreath', ['#2a3244', '#3e4a60', '#5a6880', '#7a8aa0', '#9cacc0', '#c0ccd8', '#e2eaf0'], { o: '#1e2434', tex: 0.1, ts: 0.6, emit: 0.3, wrap: 0.4 });
MBF.gasp = [76, 72, 34, 66];
MBP.gasp = function (S, pose, ph, pal, view, FW, FH, OX, OY) {
  const walk = pose === 'walk', idle = pose === 'idle', wind = pose === 'wind', atk = pose === 'atk', hit = pose === 'hit', die = pose === 'die';
  let by = 0, lean = 0, Wd = 1, trail = 2, wave = 0, open = 0.7, k = 0, blast = 0, reach = 0, sag = 0;
  if (idle) { by = [0, 0.8, 1, 0.3][ph]; wave = ph; trail = 2 + [0, 1, 1, 0][ph] * 0.6; }
  if (walk) { const a = ph / 8 * Math.PI * 2; by = Math.sin(a) * 1.1; lean = 0.1; trail = 5 + Math.sin(a) * 1.5; wave = ph; }
  if (wind) { k = [0.35, 0.7, 1][ph]; Wd = 1 + 0.4 * k; by = 2.5 * k; open = 0.8 + 0.5 * k; trail = 2; wave = ph; lean = -0.1 * k; }
  if (atk) { const L = [[0.14, 1, 1.3, 1, 0.6], [0.2, 0.95, 1.35, 1, 1], [0.08, 0.95, 0.5, 0.35, 0.2]][ph]; lean = L[0]; Wd = L[1]; open = L[2]; blast = L[3]; reach = L[4]; trail = 7 - ph * 2; wave = ph; }
  if (hit) { lean = -0.2; Wd = 0.9; open = 1.2; trail = 4; by = 1 - ph; wave = 2 + ph; }
  if (die) { by = -5; sag = 1; Wd = 1.25; open = 0.35; trail = 1; lean = 0.05; }
  const bk = view === 'back', cam = mbCam(bk ? -0.8 : 0.7, 0.36, OX, OY, 1.25), A = mbModel(S, cam);
  const Y0 = 5 + by;   // it drifts above the ground
  const L = p => [p[0] + (p[1] - Y0) * lean, p[1], p[2]];
  const hc = L([1.5, Y0 + 30 - sag * 5, 0]);
  // ------- the body cloth: a hood that pours down into long torn ribbons trailing behind
  const cloth = (s, t) => {
    const a = s * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
    const y = Y0 + 32 - sag * 6 - t * (31 - sag * 4) - (t > 0.55 ? (t - 0.55) * trail * 0.5 * Math.max(0, -ca) : 0);
    const r = (1.2 + t * 6.8 + Math.sin(t * Math.PI) * 1.8) * Wd * (1 + sag * 0.3 * t), rz = r * 0.85;
    const fold = (0.3 + t * 1.3) * Math.sin(a * 6 + t * 3 + wave * 0.9) + 0.4 * t * Math.sin(a * 11 - wave);
    let x = hc[0] - 0.8 + ca * (r + fold) - trail * t * t * 1.8 + (t - 1) * 0, z = sa * (rz + fold * 0.8);
    // the bottom tears into ribbons: every other strip runs longer, the rest are gone
    if (t > 0.62) { const strip = Math.floor(s * 14), keep = (strip % 2 === 0) || mbH(strip, 11) > 0.55; if (!keep) return null; const ln = 0.8 + mbH(strip, 4) * 0.2; if (t > ln) return null; x -= (t - 0.62) * trail * 1.6 * (0.6 + mbH(strip, 2)); }
    return L([x + 0.1 * Math.sin(t * 8 + wave + s * 20) * t, y, z]);
  };
  const clothN = (s, t) => { const p = cloth(s, t), q1 = cloth(s + 0.01, t), q2 = cloth(s, t + 0.02); if (!p || !q1 || !q2) return null; return { p, n: V3.n(V3.x(V3.s(q2, p), V3.s(q1, p))) }; };
  // an under-veil, darker, hanging inside: it shows between the torn ribbons, so the cloth reads as layers
  A.surf((s, t) => { const a = s * Math.PI * 2, y = Y0 + 20 - t * 17, r = (5 + t * 2) * Wd; return L([hc[0] - 1 + Math.cos(a) * r * 0.9 - trail * t * 0.8, y + Math.sin(a * 5 + wave) * 0.5 * t, Math.sin(a) * r * 0.75]); }, 24, 6, 'pgauzeD', { inside: 0.2 });
  A.surf(cloth, 48, 16, 'pgauze', { su: 70, sv: 40, inside: 0.3 });
  // the hood's peak, bent back, and its hollow: no face in it, only a mouth
  const hp = V3.a(hc, [-2.8 - trail * 0.25 - lean * 4, 6.5 - sag, 0]);
  A.cap([V3.a(hc, [-0.5, 1.5, 0]), V3.a(hc, [-1.5, 3.8, 0]), hp], 2.4, 0.6, 'pgauze');
  const hollowC = V3.a(hc, [3.2 * Wd, -1.8, 0]);
  A.blob(hollowC, [1.2, 0, 0], [0, 3.6, 0], [0, 0, 2.6], 'phollow');
  // the arms: long thin sleeves reaching forward, drawn-out fingers
  const sn = L([hc[0] + 1, Y0 + 24 - sag * 5, 4.6 * Wd]), sf = L([hc[0] - 1, Y0 + 24 - sag * 5, -4.6 * Wd]);
  const hn = wind ? L([hc[0] + 3 + 5 * Wd, Y0 + 30 + 5 * k, 5.5 * Wd]) : atk ? L([hc[0] + 8 + reach * 6, Y0 + 24 + reach * 2, 3.5]) : hit ? L([hc[0] + 7, Y0 + 30, 5]) : die ? L([hc[0] + 3, Y0 + 12, 6]) : L([hc[0] + 6 + (walk ? 1 : 0), Y0 + 15 + (idle ? [0, 1, 1, 0][ph] : 0), 5.2]);
  const hf = wind ? L([hc[0] - 6 * Wd, Y0 + 29 + 4 * k, -6 * Wd]) : L([hc[0] - 4 - trail * 0.6, Y0 + 16, -5.5]);
  const armT = (s0, h, far) => {
    const m = V3.a(V3.lp(s0, h, 0.5), [0, -1.5, far ? -1 : 1]);
    A.cap([s0, m, h], 1.3, 0.45, far ? 'pgauzeD' : 'pgauze');
    const d = V3.n(V3.s(h, m)), sd = V3.n(V3.x(d, [0, 0, 1]));
    for (let i = -1; i <= 1; i++) { const f = V3.a(h, V3.a(V3.m(d, 3.8), V3.m(sd, i * 1.3))), f2 = V3.a(f, V3.a(V3.m(d, 1.5), V3.m(sd, i * 0.6))); A.cap([h, f, f2], 0.36, 0.12, far ? 'pgauzeD' : 'pgauze'); }
  };
  armT(sf, hf, true); armT(sn, hn, false);
  // ------- the mouths: stretched open in a scream, lips pulled back, rows of yellowed human teeth
  const mouth = (s, t, sz, o) => {
    const q = clothN(s, t); if (!q) return;
    let n = q.n; if (V3.d(n, V3.s(q.p, L([hc[0], q.p[1], 0]))) < 0) n = V3.m(n, -1);
    const up = V3.n(V3.s([0, 1, 0], V3.m(n, n[1]))), sd = V3.n(V3.x(up, n)), g = S.group(), RY = sz * (0.55 + o * 0.6), RX = sz * 0.55;
    const c = V3.a(q.p, V3.m(n, 0.15));
    A.blob(c, V3.m(sd, RX + 0.8), V3.m(up, RY + 0.8), V3.m(n, 0.7), 'plip', { g });
    A.blob(V3.a(c, V3.m(n, 0.25)), V3.m(sd, RX), V3.m(up, RY), V3.m(n, 0.6), 'phollow', { g });
    const nt = Math.max(2, Math.round(RX * 2.2));
    for (let i = 0; i < nt; i++) { const u = (i + 0.5) / nt * 2 - 1, e = Math.sqrt(1 - u * u); for (const sg of [1, -1]) { const b = V3.a(c, V3.a(V3.m(sd, u * RX * 0.92), V3.a(V3.m(up, sg * RY * e * 0.95), V3.m(n, 0.55)))); A.cap([b, V3.a(b, V3.m(up, -sg * (0.5 + 0.35 * e)))], 0.34, 0.2, 'pteeth', { g }); } }
  };
  const MS = bk ? [[0.47, 0.42, 2.2], [0.62, 0.28, 2.1], [0.4, 0.62, 1.9], [0.55, 0.66, 1.8]] : [[0.1, 0.38, 2.8], [0.22, 0.57, 2.5], [0.93, 0.5, 2.3], [0.3, 0.3, 2], [0.04, 0.68, 2.1]];
  MS.forEach(([s, t, sz], j) => mouth(s, t, sz, Math.max(0.35, Math.min(1.4, open + (j % 2 ? -0.15 : 0.05) + (idle || walk ? Math.sin(ph * 1.7 + j * 2) * 0.2 : 0)))));
  // the great mouth in the hood's hollow
  if (!bk) { const c = V3.a(hollowC, [1, -0.2, 0.3]), RY = 2.2 * open, g = S.group(); A.blob(c, [0.5, 0, 0], [0, RY + 0.4, 0], [0, 0, 1.8], 'plip', { g }); A.blob(V3.a(c, [0.2, 0, 0]), [0.5, 0, 0], [0, RY, 0], [0, 0, 1.3], 'phollow', { g }); for (let i = -2; i <= 2; i++) for (const sg of [1, -1]) { const b = V3.a(c, [0.5, sg * RY * 0.9, i * 0.5]); A.cap([b, V3.a(b, [0.1, -sg * 0.7, 0])], 0.3, 0.18, 'pteeth', { g }); } }
  // ------- breath: the pale curls it is made of, leaking off the trailing edge; drawn in, blown out
  const B = (q, col) => A.dot(q, col, 0, 0);
  if (!atk) for (let j = 0; j < 3; j++) {
    const o = L([hc[0] - 8 - trail * 0.8 - j * 3.5, Y0 + 30 - j * 7, -2]), q = wave * 0.9 + j * 2.1;
    for (let i = 0; i < 7; i++) { const a = q + i * 0.7, r = 1 + i * 0.4; B([o[0] - i * 0.9 + Math.cos(a) * r * 0.4, o[1] + i * 0.3 + Math.sin(a) * r * 0.6, o[2]], i < 2 ? '#c8d6e6' : i < 4 ? '#8494aa' : '#4c586e'); }
  }
  const mo = V3.a(hollowC, [2, -0.5, 0]);
  if (wind) for (let i = 0; i < 16; i++) { const d = 14 - k * 8 + (i % 3) * 2.5, a = (i - 7.5) * 0.14; B([mo[0] + Math.cos(a) * d, mo[1] + Math.sin(a) * d * 1.3, mo[2]], i % 2 ? '#6a7a90' : '#c8d6e6'); }
  if (blast > 0) {
    // the exhale: puffs of pale breath swelling out of the mouth, bright at the lips and thinning to grey
    const len = 6 + blast * 11 + (ph === 1 ? 4 : 0);
    for (let i = 0; i < 5; i++) { const t = (i + 0.5) / 5, r = 0.8 + t * 2.4 * blast, c = V3.a(mo, [1 + t * len, Math.sin(i * 2.1 + ph) * t * 1.5, 0]); if (t < 0.85) A.ball(c, r, 'pbreath'); }
    for (let i = 0; i < 18; i++) { const t = 0.5 + mbH(i, ph) * 0.7, a = (mbH(i, 3) - 0.5) * 0.7; B([mo[0] + t * len * 1.1, mo[1] + Math.sin(a) * t * len * 0.6, mo[2]], t > 0.95 ? '#5a6a80' : '#a8b8cc'); }
  }
  // grime-dark stains where the cloth folds under, torn holes near the hem
  for (let i = 0; i < 10; i++) { const p = cloth(mbH(i, 3), 0.35 + mbH(i, 7) * 0.3); if (p) { A.shade(p, -0.12); A.shade(p, -0.12, 1, 1); } }
  return S.render({ tint: pal.tint, tk: 0.5 });
};
M32.gasp = function () {}; M32F.gasp = MBF.gasp; M32WALK.gasp = 3; M32BACK.gasp = true;

// ------------------------------------------------------------------- MOTH-SAINT
// A saint's face in cracked white porcelain, eyes shut in bliss, a broken gilt halo behind it, set on a swaddled,
// ruffed body that hangs in segments like a moth's; the wings are stretched vellum, dusted, painted with eyes like
// the eyes of icons. Its thin legs swing a censer and a rosary of finger bones.
mbMat('mporc', ['#1c1822', '#34303a', '#524c54', '#767070', '#9a948e', '#bab4aa', '#d6d0c4', '#ece8dc', '#fcfaf2'], { o: '#16121a', tex: 0.02, spec: 0.7, sh: 30, sc: '#ffffff', rimK: 0.5, emit: 0.18 });
mbMat('mgilt', ['#1a0e04', '#3a2208', '#5e3a0e', '#865616', '#aa7420', '#cc9632', '#e8bc52', '#fae28a'], { o: '#140a02', tex: 0.08, ts: 1, spec: 1, sh: 22, sc: '#fff6c8', rimK: 0.6 });
mbMat('mruff', ['#16100e', '#2a201a', '#423428', '#5c4c3a', '#78664e', '#958266', '#b09e80', '#cabaa0', '#e2d6c0'], { fray: 0.55, o: '#120c0a', tex: 0.12, ts: 1.1, rimK: 0.6 });
mbMat('mfur', ['#0c0808', '#1a1210', '#2a1e18', '#3e2e22', '#54402e', '#6c563e', '#86704e'], { fray: 0.55, o: '#0a0606', tex: 0.14, ts: 1.2, fib: 0.4, rimK: 0.55 });
mbMat('mwing', ['#0e0908', '#1e1410', '#302018', '#442e20', '#5a3e2a', '#725236', '#8c6a46', '#a88658', '#c2a472'], { o: '#0c0706', tex: 0.1, ts: 0.35, rimK: 0.45, wrap: 0.3 });
mbMat('mdust', ['#2a1e14', '#463424', '#665038', '#86704e', '#a69068', '#c4b088', '#dccaa6', '#f0e2c4'], { o: '#1e140c', tex: 0.14, ts: 0.9, wrap: 0.3 });
mbMat('mochre', ['#2a1206', '#4a220a', '#6c3610', '#8e4c18', '#ae6422', '#c87e30'], { o: '#1e0c04', tex: 0.05, wrap: 0.3 });
mbMat('mblack', ['#040304', '#0a0708', '#120d0e', '#1c1516'], { o: '#030203', tex: 0 });
mbMat('mwhite', ['#6a6258', '#9a9284', '#c4bca8', '#e2dac6', '#f6f0e0'], { o: '#4a443c', tex: 0, spec: 0.8, sh: 20, sc: '#ffffff', emit: 0.35 });
mbMat('mleg', ['#060404', '#100a0a', '#1c1412', '#2a201a', '#3a2c22', '#4c3a2c'], { o: '#050303', tex: 0.05, spec: 0.5, sh: 20, sc: '#8a7a64' });
mbMat('mbone', ['#2a2018', '#4a3e2e', '#6e6048', '#948664', '#b8aa86', '#d8ceae', '#f0e8d0'], { o: '#1a140e', tex: 0.03, spec: 0.5, sh: 20, sc: '#fffaf0' });
mbMat('mcoal', ['#4a0c04', '#8a2008', '#c8440c', '#f07818', '#ffb040', '#fff0a0'], { o: '#2a0602', tex: 0, emit: 0.7 });
mbMat('mblood', ['#0e0206', '#22040a', '#3c0810', '#5a0c16', '#7c121c', '#9e1c22'], { o: '#0c0206', tex: 0.02, spec: 1, sh: 16, sc: '#ff9a88' });
MBF.moth = [96, 96, 48, 90];
MBP.moth = function (S, pose, ph, pal, view, FW, FH, OX, OY) {
  const walk = pose === 'walk', idle = pose === 'idle', wind = pose === 'wind', atk = pose === 'atk', hit = pose === 'hit', die = pose === 'die';
  // beat: +1 wings up, -1 down. fold: wings swept back. tl: lean (screen roll). open: the eyes open (empty)
  let beat = 0, bx = 0, by = 40, tl = 0, fold = 0, sw = 0, open = 0, pit = 0;
  if (idle) { beat = [1, 0, -1, 0][ph]; by += [-1, 0, 1, 0][ph]; sw = [0, 1, 0, -1][ph]; }
  if (walk) { beat = [1, 0.3, -0.5, -1, -0.3, 0.5, 1, 0.9][ph]; by += beat * 1.2; tl = -0.1; sw = Math.sin(ph / 8 * Math.PI * 2) * 1.5; pit = 0.2; }
  if (wind) { fold = [0.35, 0.7, 1][ph]; beat = 0.5; by += fold * 3; tl = 0.08 * fold; sw = -1; open = ph >= 1 ? 1 : 0; pit = -0.15 * fold; }
  if (atk) { const L = [[8, -8, -0.45, 0.55, 0.9], [12, -11, -0.3, 0.3, -0.6], [8, -3, 0.1, 0, -1]][ph]; bx += L[0]; by += L[1]; tl = L[2]; fold = L[3]; beat = L[4]; sw = [3, 2, -2][ph]; open = 1; pit = [0.5, 0.6, 0.2][ph]; }
  if (hit) { tl = 0.3; by += 2; beat = -0.6 + ph * 0.5; fold = 0.2; sw = -2; open = 1 - ph; bx -= 2; }
  if (die) { tl = 0.1; by -= 18; beat = -1.2; fold = 0.1; sw = 0; open = 1; pit = 0.5; }
  const bk = view === 'back', cam = mbCam(bk ? Math.PI - 0.3 : 0.3, 0.3, OX, OY, 1.3), A = mbModel(S, cam);
  // body space: origin at the thorax, y up, the face toward +z (the viewer), the lean rolls it in the screen plane
  const R = q => { let p = V3.rx(q, -pit); p = V3.rz(p, -tl); return [bx + p[0], by + p[1], p[2]]; };
  // ------- wings: forewing and hindwing shapes in (u along, v toward the trailing edge)
  const FWG = [[0, -1], [6, -3], [13, -4.5], [19, -5.5], [24.5, -5.5], [23.5, -2.5], [21, 1.5], [16.5, 5], [10, 6.8], [4, 5.5], [1, 2.5]];
  const HW = [[0, 0], [3.5, -1.2], [8, -0.8], [11, 1.8], [11, 5.2], [8.5, 7.8], [4.5, 7.8], [1.3, 4.5]];
  const wing = (side, sc) => {
    const up = 0.3 + 0.3 * beat + fold * (1.05 - 0.3 - 0.3 * beat), sweep = -0.35 - fold * 0.7 + beat * 0.15;
    const U = [side * Math.cos(up) * Math.cos(sweep), Math.sin(up), Math.sin(sweep) * Math.cos(up)], V0 = V3.n(V3.x(U, [0, 0, 1])), V = V0[1] > 0 ? V3.m(V0, -1) : V0;
    const su = sc * (1 - fold * 0.05), sv = sc * (1 - fold * 0.38), root = [side * 2.5, 1, -1.5];
    const mp = ([u, v]) => R(V3.a(root, V3.a(V3.m(U, u * su), V3.m(V, v * sv))));
    const hk = 0.95 - fold * 0.5, HU = V3.n(V3.a(V3.m(U, Math.cos(hk)), V3.m(V, Math.sin(hk)))), HV = V3.n(V3.a(V3.m(V, Math.cos(hk)), V3.m(U, -Math.sin(hk))));
    const mh = ([u, v]) => R(V3.a(root, V3.a(V3.m(HU, u * su), V3.m(HV, v * sv * 0.9))));
    return { mp, mh, side };
  };
  const wR = wing(1, 0.95), wL = wing(-1, 1.05);
  for (const w of [wR, wL]) { A.plate(HW.map(w.mh), 'mwing', { bevel: 1.5, bulge: 0.15, inside: 0.1 }); A.plate(FWG.map(w.mp), 'mwing', { bevel: 1.8, bulge: 0.2, inside: 0.1 }); }
  // wing markings, laid into the vellum: the dust band, veins, the dusted margin, the icon eye
  const MK = (w, u, v, m, b, hind) => A.mark((hind ? w.mh : w.mp)([u, v]), m, b);
  const markW = w => {
    const eyeS = bk ? 0.5 : 1;
    for (let u = 3; u < 23; u += 0.5) { const v0 = -4.4 + u * 0.04; for (let v = v0; v < v0 + 2 - (u % 3 < 1 ? 0.6 : 0); v += 0.5) MK(w, u, v, 'mdust', 0); }
    for (const [vv, sl] of [[-1.2, 0.05], [2, 0.12], [4, 0.2]]) for (let u = 2; u < 19; u += 0.5) MK(w, u, vv + u * sl, 'mwing', -0.2);
    for (let u = 4; u < 20; u += 0.5) { const v = 5.4 - (u > 17 ? (u - 17) * 1.4 : 0) + (Math.floor(u) % 2 ? 0.6 : 0); MK(w, u, v, 'mdust', 0.05); MK(w, u, v - 0.5, 'mwing', -0.25); }
    for (let u = 3; u < 11; u += 0.5) MK(w, u, 6.8 + (Math.floor(u) % 2 ? 0.5 : -0.2), 'mdust', 0, true);
    // the icon eye: rings of ochre and black round a white, a gilt iris, a wet light on it
    if (fold < 0.85) for (let u = 9; u <= 17; u += 0.35) for (let v = -3; v <= 5.4; v += 0.35) {
      const du = (u - 13) / 3.9, dv = (v - 1.2) / 3.6, d = Math.hypot(du, dv);
      if (d > 1) continue; const m = d > 0.78 ? 'mochre' : d > 0.56 ? 'mblack' : d > 0.3 ? 'mwhite' : d > 0.14 ? 'mgilt' : 'mblack';
      MK(w, u, v, bk && d < 0.78 ? 'mochre' : m, bk ? -0.25 : 0);
    }
    for (let u = 6; u <= 10; u += 0.35) for (let v = 2.5; v <= 6.5; v += 0.35) { const d = Math.hypot(u - 8, v - 4.5) / 1.8; if (d < 1) MK(w, u, v, d > 0.55 ? 'mochre' : 'mblack', 0, true); }
  };
  markW(wR); markW(wL);
  // ------- legs: the near pair holds the censer's chain, the other a rosary; the abdomen hangs below
  const LG = [[R([3, -2, 1.5]), R([7, -5, 2.5]), R([8 + (atk ? 2 : 0), -10 + (atk ? 2 : 0), 3])], [R([1, -3, 2]), R([3, -7, 3]), R([3, -11, 3])], [R([-3, -2, 1.5]), R([-7, -5, 2.5]), R([-8, -10, 3])]];
  for (const [a, b, c] of LG) { A.cap([a, b], 0.5, 0.45, 'mleg'); A.cap([b, c], 0.45, 0.3, 'mleg'); A.ball(b, 0.6, 'mleg'); }
  for (let i = 0; i < 5; i++) { const u = i / 4, c = R([sw * u * 0.8 - 0.5, -5 - u * 12, -1 - u]), r = 4.6 - i * 0.62; A.blob(c, [r, 0, 0], [0, r * 0.82, 0], [0, 0, r * 0.9], 'mfur'); }
  A.cap([R([sw * 0.8 - 0.5, -16, -2]), R([sw - 0.5, -21, -2.5])], 1.4, 0.4, 'mfur');
  // ------- the thorax: a pleated ruff of pale fur, like a saint's millstone collar, over a furred core
  A.blob(R([0, -0.5, 0]), [4.6, 0, 0], [0, 3.6, 0], [0, 0, 3.4], 'mfur');
  for (let i = 0; i < 30; i++) { const a = i / 30 * Math.PI * 2, c = Math.cos(a), s2 = Math.sin(a), z = 1.6 + (i % 2 ? 0.7 : 0) + s2 * 0.4; A.cap([R([c * 2.2, s2 * 1.5 + 0.5, z + 1]), R([c * (6.4 + (i % 2) * 0.5), s2 * 4.1 + 0.3, z])], i % 2 ? 0.95 : 1.15, i % 2 ? 0.8 : 1, 'mruff'); }
  // ------- the halo behind the head, broken into fragments, a chip floating loose
  const hc = [0, 11, -1.8], arc = (a0, a1, r) => { const q = []; for (let i = 0; i <= 8; i++) { const a = a0 + (a1 - a0) * i / 8; q.push(R([hc[0] + Math.cos(a) * r, hc[1] + Math.sin(a) * r, hc[2]])); } return q; };
  for (const [a0, a1] of [[-2.9, -1.9], [-1.55, -0.4], [0.05, 1.1], [1.7, 2.6]]) A.cap(arc(a0, a1, 8.5), 0.75, 0.75, 'mgilt');
  A.cap(arc(0.25, 0.5, 10.6 + (idle ? [0, 0.5, 1, 0.5][ph] : 0)), 0.6, 0.6, 'mgilt');
  // feathered antennae curling out over the halo
  for (const sd of [-1, 1]) { const fl = fold * 3, pts = [R([sd * 1.5, 16, 0]), R([sd * 4, 21 + fl * 0.3, -0.5]), R([sd * (9 - fl), 24 + fl * 0.5, -1]), R([sd * (15 - fl * 1.5), 24.5, -1.5])]; A.cap(pts, 0.5, 0.35, 'mfur'); for (let i = 1; i < 12; i++) { const t = i / 12, q = V3.lp(pts[Math.min(2, Math.floor(t * 3))], pts[Math.min(3, Math.floor(t * 3) + 1)], t * 3 % 1); A.cap([q, V3.a(q, [sd * 0.4, 1.3 - t * 0.5, 0])], 0.25, 0.15, 'mfur'); } }
  // ------- the face: cracked white porcelain, a long oval with a narrow chin; eyes shut in bliss (or open on nothing)
  const gF = S.group();
  A.blob(R([0, 11, 1.2]), [3.9, 0, 0], [0, 4.8, 0], [0, 0, 3.3], 'mporc', { g: gF });
  A.blob(R([0, 7.6, 1.6]), [2.6, 0, 0], [0, 3, 0], [0, 0, 2.8], 'mporc', { g: gF });
  A.blob(R([0, 10.4, 4.1]), [0.75, 0, 0], [0, 2, 0], [0, 0, 0.9], 'mporc', { g: gF });   // the long nose
  const FZ = (x, y) => { const q = [x, y + 10, 0]; return R([x, y + 10, 1.2 + 3.3 * Math.sqrt(Math.max(0.05, 1 - (x / 3.9) ** 2 - ((y - 1) / 4.8) ** 2)) + 0.2]); };
  const F = (x, y, c) => A.dot(FZ(x, y), c), FS = (x, y, b) => A.shade(FZ(x, y), b), FL = (pts, c) => { for (let i = 0; i < pts.length - 1; i++) A.line(FZ(...pts[i]), FZ(...pts[i + 1]), c, 1); };
  if (!bk) {
    // the sockets and the brow, carved by the light; the cheek hollows
    for (const sx of [-1, 1]) for (let x = 1.1; x <= 3.3; x += 0.35) for (let y = 0.6; y <= 2.4; y += 0.35) FS(sx * x, y, -0.12);
    for (const sx of [-1, 1]) for (let y = -2.6; y <= -0.6; y += 0.4) FS(sx * 2.9, y, -0.1);
    if (!open) for (const sx of [-1, 1]) { FL([[sx * 1.2, 1.5], [sx * 2, 1.1], [sx * 2.8, 1.1], [sx * 3.3, 1.5]], '#2a2230'); F(sx * 2.2, 1.9, '#fcfaf2'); F(sx * 2.8, 1.9, '#e8e2d6'); F(sx * 2.4, 0.6, '#8a8290'); }
    else for (const sx of [-1, 1]) { FL([[sx * 1.3, 1.4], [sx * 3.1, 1.4]], '#000000'); FL([[sx * 1.6, 1], [sx * 2.9, 1]], '#0a080c'); FL([[sx * 2.2, 0.6], [sx * 2.3, -1.6 - (atk || die ? 1 : 0)]], '#8e141a'); F(sx * 2.25, -0.6, '#c42a22'); }
    FL([[-1, -3.1], [0, -3.3], [1, -3.1]], '#6a2a34'); F(0, -3.2, '#2a0a12'); F(-0.5, -3.8, '#8a3a44'); F(0.5, -3.8, '#8a3a44'); F(0, -4.4, '#bab4aa');
    FL([[0.9, 5], [1.5, 3.6], [2.1, 2.4], [2.9, 1.4], [3.2, 0], [2.7, -1.6], [2.2, -3.4]], '#2a2630');
    FL([[-2.6, -2], [-3.1, -3]], '#08060a'); FL([[-2.2, -2.4], [-2.6, -3.4]], '#08060a'); F(-2.1, -1.8, '#6e6670'); F(-3.3, -1.6, '#6e6670');   // a chip broken out: it is hollow
  } else {
    for (let i = 0; i <= 10; i++) A.dot(R([-3.5 + i * 0.7, 14.5 - i * 1.1, -2]), i % 2 ? '#a8741e' : '#e8bc52');
    for (const [x, y] of [[1.5, 12], [2, 11], [2.6, 9.6], [2.2, 8.2]]) A.dot(R([x, y, -2.2]), '#2a2630');
  }
  // ------- the censer: a pierced gilt bowl on a chain, burning; the rosary of finger bones
  const ch = LG[0][2], cz = V3.a(ch, [sw * 1.2, -10, 0.5]);
  for (let i = 1; i < 12; i++) A.ball(V3.lp(ch, V3.a(cz, [0, 2.5, 0]), i / 12), 0.32, 'mgilt');
  A.blob(cz, [2.6, 0, 0], [0, 2.2, 0], [0, 0, 2.6], 'mgilt'); A.cap([V3.a(cz, [0, 1.8, 0]), V3.a(cz, [0, 3, 0])], 0.9, 0.4, 'mgilt');
  A.ball(V3.a(cz, [0.4, -0.2, 2]), 0.8, 'mcoal'); A.ball(V3.a(cz, [-1.2, 0.2, 1.8]), 0.55, 'mcoal');
  for (let i = 0; i < 7; i++) { const q = V3.a(cz, [1 - sw * 0.3 * i + Math.sin(i * 1.3 + ph) * 1.2, 4 + i * 1.6, 0]); A.dot(q, i < 2 ? '#b8b0a8' : i < 4 ? '#7a7478' : '#4a464c'); if (i % 2) A.dot(q, '#6a646a', 1, 0); }
  { const r0 = LG[2][2]; for (let i = 1; i < 9; i++) A.ball(V3.a(r0, [Math.sin(i * 0.8) * 0.6 - sw * i * 0.1, -i * 1.05, 0.5]), i % 2 ? 0.42 : 0.52, 'mbone'); A.cap([V3.a(r0, [-sw * 0.8, -9.5, 0.5]), V3.a(r0, [-sw * 0.8, -12, 0.5])], 0.35, 0.3, 'mgilt'); A.cap([V3.a(r0, [-sw * 0.8 - 1, -10.4, 0.5]), V3.a(r0, [-sw * 0.8 + 1, -10.4, 0.5])], 0.35, 0.3, 'mgilt'); }
  // the dust of the wings: pale scales caught in the light, drifting off the trailing edges
  for (const w of [wL, wR]) for (let i = 0; i < 6; i++) { const q = w.mp([6 + mbH(i, w.side + 3) * 16, 6 + mbH(i, 5) * 3]); A.dot(V3.a(q, [0, -mbH(i, 9) * 4, 0]), i % 2 ? '#c8b89a' : '#8a7a62'); }
  if (die || hit) for (let i = 0; i < 4; i++) A.dot(R([2.2 + (i % 2), 8 - i, 4.2]), '#7c121c');
  return S.render({ tint: pal.tint, tk: 0.4 });
};
M32.moth = function () {}; M32F.moth = MBF.moth; M32WALK.moth = 4; M32BACK.moth = true;

})();
