
// =================================================================== v0.23: the native pixel painter (32-bit style)
// One unit is one pixel. Parts are filled with no anti-aliasing (a pixel is in if its centre is), then shaded in
// flat bands: light along the upper-left edges, shadow along the lower-right, a second shadow band on wide parts.
// Where a part lies over an earlier one a dark contour separates them; the whole figure gets a dark outline; then
// hand-placed pixels go on top. Materials are 5-tone ramps: [deep, shadow, base, light, highlight].
const PMAT = {};
function pmat(name, tones) { PMAT[name] = tones.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]); return name; }
function Pix(Wd, Ht, outline, DX = 0) {
  const N = Wd * Ht, part = new Int16Array(N).fill(-1), opts = [], over = new Map();
  const OL = outline === null ? null : (outline || [16, 8, 16]);
  const fill = (test, mat, o, bb) => {
    const id = opts.length; opts.push(Object.assign({}, o || {}, { mat }));
    const x0 = Math.max(0, Math.floor(bb[0])), x1 = Math.min(Wd - 1, Math.ceil(bb[2])), y0 = Math.max(0, Math.floor(bb[1])), y1 = Math.min(Ht - 1, Math.ceil(bb[3]));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (test(x + 0.5, y + 0.5)) part[y * Wd + x] = id;
    return id;
  };
  const A = {
    W: Wd, H: Ht,
    poly(pts, mat, o) {
      if (DX) pts = pts.map(p => [p[0] + DX, p[1]]);
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      return fill((px, py) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) c = !c; } return c; }, mat, o, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
    },
    ell(cx, cy, rx, ry, mat, o) { cx += DX; return fill((x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, mat, o, [cx - rx, cy - ry, cx + rx, cy + ry]); },
    limb(pts, r0, r1, mat, o) {
      if (DX) pts = pts.map(p => [p[0] + DX, p[1]]);
      const n = pts.length, R = Math.max(r0, r1), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      return fill((x, y) => {
        for (let i = 0; i < n - 1; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[i + 1], dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1e-9;
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), r = r0 + (r1 - r0) * (i + t) / Math.max(1, n - 1);
          if ((x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2 <= r * r) return true;
        }
        return false;
      }, mat, o, [Math.min(...xs) - R, Math.min(...ys) - R, Math.max(...xs) + R, Math.max(...ys) + R]);
    },
    px(x, y, c) { x = Math.round(x + DX); y = Math.round(y); if (x >= 0 && y >= 0 && x < Wd && y < Ht) over.set(y * Wd + x, c); },
    line(x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) | 0; for (let i = 0; i <= n; i++) { const t = i / Math.max(1, n); A.px(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, c); } },
    tone(mat, i) { const m = PMAT[mat]; if (!m) return mat; const c = m[Math.max(0, Math.min(4, i))]; return `rgb(${c[0]},${c[1]},${c[2]})`; },
    render() {
      const c = mkCanvas(Wd, Ht), x = c.getContext('2d'), img = x.createImageData(Wd, Ht), D = img.data;
      const at = (i, j, p) => i >= 0 && j >= 0 && i < Wd && j < Ht && part[j * Wd + i] === p;
      for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) {
        const p = part[j * Wd + i]; if (p < 0) continue;
        const o = opts[p], T = o.tone || 0; let k = 2 + T;
        if (!o.flat) {
          const band = o.band || 1;
          if (!at(i + 1, j, p) || !at(i, j + 1, p)) k = 1 + T;
          else if (band > 1 && (!at(i + 2, j, p) || !at(i + 1, j + 2, p))) k = 1 + T;
          else if (band > 2 && !at(i + 3, j, p) && ((i + j) & 1)) k = 1 + T;
          else if (!at(i - 1, j, p) || !at(i, j - 1, p)) { k = 3 + T; if (!at(i - 1, j, p) && !at(i, j - 1, p) && o.hi !== false) k = 4 + T; }
        }
        if (o.contour !== false) for (const [dx, dy] of [[1, 0], [0, 1], [-1, 0], [0, -1]]) { const q = (i + dx >= 0 && j + dy >= 0 && i + dx < Wd && j + dy < Ht) ? part[(j + dy) * Wd + i + dx] : -1; if (q >= 0 && q !== p && q < p && (dx > 0 || dy > 0 || o.contourAll)) { k = 0; break; } }
        const m = PMAT[o.mat]; let col;
        if (m) col = m[Math.max(0, Math.min(4, k))]; else { const h = o.mat; col = [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
        const q = (j * Wd + i) * 4; D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255;
      }
      if (OL) { const S = new Uint8ClampedArray(D); for (let j = 0; j < Ht; j++) for (let i = 0; i < Wd; i++) { const q = (j * Wd + i) * 4; if (S[q + 3]) continue; let n = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + dx, b = j + dy; if (a >= 0 && b >= 0 && a < Wd && b < Ht && S[(b * Wd + a) * 4 + 3]) n = true; } if (n) { D[q] = OL[0]; D[q + 1] = OL[1]; D[q + 2] = OL[2]; D[q + 3] = 255; } } }
      for (const [k, cv] of over) { const q = k * 4; if (cv == null) { D[q + 3] = 0; continue; } const col = cv[0] === '#' ? [parseInt(cv.slice(1, 3), 16), parseInt(cv.slice(3, 5), 16), parseInt(cv.slice(5, 7), 16)] : cv.match(/\d+/g).map(Number); D[q] = col[0]; D[q + 1] = col[1]; D[q + 2] = col[2]; D[q + 3] = 255; }
      x.putImageData(img, 0, 0); return c;
    }
  };
  return A;
}
// v0.36: the same painter at a finer grain. Coordinates are given in the old units and every shape is laid down
// S times larger on the pixel grid, so a painter written for the 32-bit scale draws the same object bigger and
// with more pixels in it. Hand-placed pixels cover their whole scaled cell (no gaps in pixel patterns); lines and
// the outline stay one pixel wide, which is where the extra detail comes from.
function PixS(Wd, Ht, S, outline, DX = 0) {
  if (!S || S === 1) return Pix(Wd, Ht, outline, DX);
  const W2 = Math.ceil(Wd * S), H2 = Math.ceil(Ht * S), B = Pix(W2, H2, outline, 0), sp = p => [(p[0] + DX) * S, p[1] * S];
  const A = {
    W: Wd, H: Ht, S, W2, H2,
    poly(pts, mat, o) { return B.poly(pts.map(sp), mat, o); },
    ell(cx, cy, rx, ry, mat, o) { return B.ell((cx + DX) * S, cy * S, rx * S, ry * S, mat, o); },
    limb(pts, r0, r1, mat, o) { return B.limb(pts.map(sp), Math.max(0.5, r0 * S), Math.max(0.5, r1 * S), mat, o); },
    px(x, y, c) { const X = Math.round(x + DX), Y = Math.round(y), x0 = Math.floor(X * S), x1 = Math.floor((X + 1) * S), y0 = Math.floor(Y * S), y1 = Math.floor((Y + 1) * S); for (let j = y0; j < Math.max(y1, y0 + 1); j++) for (let i = x0; i < Math.max(x1, x0 + 1); i++) B.px(i, j, c); },
    line(x0, y0, x1, y1, c) { B.line((x0 + DX) * S, y0 * S, (x1 + DX) * S, y1 * S, c); },
    fpx(x, y, c) { B.px(Math.floor((x + DX) * S), Math.floor(y * S), c); },          // one fine pixel at a fractional old-unit point
    fline(x0, y0, x1, y1, c) { B.line((x0 + DX) * S, y0 * S, (x1 + DX) * S, y1 * S, c); },
    fine: B,                                                                           // the underlying painter, in fine pixels
    tone(mat, i) { return B.tone(mat, i); },
    render() { return B.render(); }
  };
  return A;
}
