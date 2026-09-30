
// v0.35 UI overrides (spliced inside the main IIFE before zz_polish)

// =================================================================== v0.35: the grimoire. Skill page, character page, inventory and compact tooltips
// The user: "update the character building art, the placeholder looks bad" and "the skill tool tips have too much
// info". Every character-building window is now an illuminated page: dark vellum in a carved stone frame with corner
// rosettes in the class colour, a proper header with a rule, tier numerals in the margin, prerequisite arrows cut as
// channels that light up when the parent is learned, carved tabs, and a real 24px pixel-art icon for every skill of
// all five classes (painted by the small painter below, cached per state: learned lit, unlearned dim, locked dark).
// Tooltips are capped: name, three lines of text, the cost, one "Now:" line. Shift (or the MORE stud) shows the rest.
{
  // ---- five-tone ramps: [seam, shade, mid, light, glint]
  const M = {
    bone: ['#2a2420', '#8f8570', '#cfc6ae', '#ece6d4', '#ffffff'],
    iron: ['#0e0d12', '#3a3d48', '#6b7280', '#a3aab8', '#e6ecf5'],
    silver: ['#141826', '#4a5878', '#8fa4c8', '#d0e0f8', '#ffffff'],
    gold: ['#2a1c08', '#8a5c1a', '#d9a441', '#f0d080', '#fff6d0'],
    blood: ['#2a0810', '#6a1622', '#b8303f', '#e05060', '#ffb0b8'],
    flesh: ['#2a1410', '#6a3a34', '#a86a5c', '#d09a88', '#f0c8b8'],
    violet: ['#140a20', '#3a2248', '#7a4ab8', '#b070e0', '#e8c8ff'],
    aether: ['#102030', '#2a5a8a', '#5c9ce0', '#9fd8ff', '#ffffff'],
    shadow: ['#000000', '#0a0a10', '#1a1a24', '#2e2e3c', '#4a4a5c'],
    stone: ['#121014', '#3a3634', '#6a6460', '#948c84', '#c8c0b4'],
    wood: ['#1a0e08', '#3e2a18', '#6a4a2a', '#9a7040', '#c8a060'],
    amber: ['#3a1a04', '#a04a10', '#e88a20', '#ffc040', '#fff0a0'],
    verd: ['#0a1a10', '#1e4a30', '#3a8a58', '#6ec888', '#c0ffd0'],
    ash: ['#0a0a0a', '#2a2a2a', '#4a4a4a', '#707070', '#a0a0a0'],
    white: ['#1a1a20', '#8a8a98', '#d8d8e0', '#f4f4f8', '#ffffff'],
    pitch: ['#000000', '#0c0c18', '#1e1e30', '#3c3c58', '#9090c8'],
    sick: ['#101a10', '#3a5a2a', '#7aa040', '#b8d860', '#f0ffb0'],
  };
  // ---- the class and tree colours
  const CLSCOL = { animancer: '#8ecbff', ossumancer: '#e8e2d0', hemomancer: '#e05060', miasmancer: '#b070e0', monk: '#f0c040' };
  const TABCOL = {
    animancer: ['#b8ccf0', '#8ecbff', '#f4f0ff'], ossumancer: ['#e8e2d0', '#f0c8a0', '#b8ae94'], hemomancer: ['#e05060', '#ff8090', '#d09a88'],
    miasmancer: ['#b070e0', '#8ab8ff', '#d8c8e8'], monk: ['#ffc040', '#8a80c0', '#c8c0b4'],
  };
  const clsCol = () => CLSCOL[P.cls] || '#c9a45a';
  const tabCol = t => (TABCOL[P.cls] || TABCOL.animancer)[t] || clsCol();
  const hexRgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const rgba = (h, a) => { const [r, g, b] = hexRgb(h); return `rgba(${r},${g},${b},${a})`; };

  // ---- the icon painter: pixel primitives on a small canvas, no anti-aliasing anywhere
  function PX(q) {
    const o = {};
    o.R = (x, y, w, h, c) => { q.fillStyle = c; q.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    o.D = (x, y, c) => o.R(x, y, 1, 1, c);
    o.L = (x0, y0, x1, y1, c) => {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
      for (let n = 0; n < 200; n++) { o.D(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
    };
    o.LW = (x0, y0, x1, y1, w, c) => { const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; for (let i = 0; i < w; i++) { const k = i - (w - 1) / 2; o.L(x0 + nx * k, y0 + ny * k, x1 + nx * k, y1 + ny * k, c); } };
    o.P = (pts, c) => { for (let i = 1; i < pts.length; i++) o.L(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], c); };
    o.F = (cx, cy, r, c) => { for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy <= r * r) o.D(x, y, c); } };
    o.E = (cx, cy, rx, ry, c) => { for (let y = Math.floor(cy - ry - 1); y <= cy + ry + 1; y++) for (let x = Math.floor(cx - rx - 1); x <= cx + rx + 1; x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) o.D(x, y, c); } };
    o.C = (cx, cy, r, c) => { for (let y = Math.floor(cy - r - 1); y <= cy + r + 1; y++) for (let x = Math.floor(cx - r - 1); x <= cx + r + 1; x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.sqrt(dx * dx + dy * dy); if (d >= r - 0.5 && d < r + 0.5) o.D(x, y, c); } };
    o.A = (cx, cy, r, a0, a1, c) => { const n = Math.max(4, Math.ceil(Math.abs(a1 - a0) * r * 1.5)); for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.D(Math.floor(cx + Math.cos(a) * r), Math.floor(cy + Math.sin(a) * r), c); } };
    o.T = (pts, c) => { let x0 = 99, y0 = 99, x1 = -99, y1 = -99; for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      for (let y = Math.floor(y0); y <= y1; y++) for (let x = Math.floor(x0); x <= x1; x++) { const px = x + 0.5, py = y + 0.5; let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside; } if (inside) o.D(x, y, c); } };
    o.X = (x, y, c, c2) => { o.D(x - 1, y, c); o.D(x + 1, y, c); o.D(x, y - 1, c); o.D(x, y + 1, c); o.D(x, y, c2 || '#ffffff'); };
    o.rays = (cx, cy, r0, r1, n, c, off = 0) => { for (let i = 0; i < n; i++) { const a = off + i / n * Math.PI * 2; o.L(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, c); } };
    o.plate = (x, y, w, h, m) => { o.R(x, y, w, h, m[0]); o.R(x + 1, y + 1, w - 2, h - 2, m[2]); o.R(x + 1, y + 1, w - 2, 1, m[3]); o.R(x + 1, y + 1, 1, h - 2, m[3]); o.R(x + 1, y + h - 2, w - 2, 1, m[1]); o.R(x + w - 2, y + 1, 1, h - 2, m[1]); o.D(x + 2, y + 2, m[4]); };
    o.orb = (cx, cy, r, m) => {
      o.F(cx, cy, r, m[0]); o.F(cx, cy, r - 1, m[2]);
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.sqrt(dx * dx + dy * dy); if (d > r - 1) continue; const k = (dx + dy) / r; if (k > 0.55) o.D(x, y, m[1]); else if (k < -0.7) o.D(x, y, m[3]); }
      o.D(Math.round(cx - r * 0.45) - 1, Math.round(cy - r * 0.45) - 1, m[4]);
    };
    o.skull = (x, y, m) => { o.R(x, y, 7, 6, m[0]); o.R(x + 1, y + 1, 5, 4, m[2]); o.R(x + 1, y + 1, 5, 1, m[3]); o.D(x + 1, y + 1, m[4]); o.R(x + 2, y + 3, 1, 1, m[0]); o.R(x + 4, y + 3, 1, 1, m[0]); o.R(x + 2, y + 6, 3, 2, m[0]); o.R(x + 2, y + 6, 3, 1, m[2]); o.D(x + 3, y + 7, m[2]); o.D(x + 3, y + 5, m[1]); };
    o.fig = (x, y, m) => { o.R(x + 1, y, 3, 3, m[0]); o.R(x + 2, y + 1, 1, 1, m[3]); o.R(x, y + 3, 5, 5, m[0]); o.R(x + 1, y + 4, 3, 3, m[2]); o.R(x + 1, y + 4, 1, 3, m[3]); o.R(x + 1, y + 8, 1, 3, m[0]); o.R(x + 3, y + 8, 1, 3, m[0]); };
    o.drop = (x, y, m) => { o.D(x, y, m[2]); o.R(x - 1, y + 1, 3, 2, m[2]); o.R(x - 1, y + 3, 3, 1, m[1]); o.D(x - 1, y + 1, m[3]); };
    o.bone = (x0, y0, x1, y1, m) => { o.LW(x0, y0, x1, y1, 3, m[0]); o.LW(x0, y0, x1, y1, 1, m[2]); o.F(x0, y0, 1.6, m[0]); o.F(x1, y1, 1.6, m[0]); o.D(x0, y0, m[3]); o.D(x1, y1, m[3]); o.D(x0 - 1, y0 - 1, m[3]); o.D(x1 + 1, y1 - 1, m[3]); };
    // a monk's open hand, palm out: a palm plate and four fingers with a thumb, 9 wide and 12 tall from x,y
    o.hand = (x, y, m) => { o.R(x + 1, y + 5, 7, 6, m[0]); o.R(x + 2, y + 6, 5, 4, m[2]); o.R(x + 2, y + 6, 5, 1, m[3]); for (let i = 0; i < 4; i++) { const h = [3, 5, 5, 4][i]; o.R(x + 1 + i * 2, y + 5 - h, 1, h + 1, m[0]); o.R(x + 1 + i * 2, y + 6 - h, 1, h - 1, i === 1 || i === 2 ? m[3] : m[2]); } o.R(x, y + 6, 1, 3, m[0]); o.D(x, y + 7, m[2]); o.R(x + 8, y + 6, 1, 3, m[0]); o.D(x + 8, y + 7, m[2]); o.D(x + 4, y + 8, m[1]); };
    return o;
  }
  // the tiny lock stamped on skills you can't learn yet
  const lockStamp = o => { o.R(15, 16, 7, 6, M.stone[0]); o.R(16, 17, 5, 4, M.stone[2]); o.R(16, 17, 5, 1, M.stone[3]); o.D(18, 18, M.stone[0]); o.D(18, 19, M.stone[0]); o.C(18.5, 15.5, 2.2, M.stone[0]); o.D(16, 14, M.stone[3]); o.D(17, 13, M.stone[3]); o.D(19, 13, M.stone[3]); o.D(20, 14, M.stone[3]); };

  // ---- the icons, one recipe per skill. Each draws into a 24x24 cell; o is the painter, m the ramps.
  const K = '#0a090d', WH = '#ffffff';
  const ICON = {
    // ================= ANIMANCER: Mirror (silver and iron), Anima (wisps), Logos (white speech)
    pillars: o => { const S = M.silver; [[3, 8, 5, 13], [9, 4, 6, 17], [16, 7, 5, 14]].forEach(([x, y, w, h]) => { o.plate(x, y, w, h, S); o.R(x + 1, y + 1, 1, h - 2, S[4]); }); o.R(2, 21, 20, 1, M.stone[1]); o.X(12, 3, S[3]); },
    golem: o => { const I = M.iron; o.plate(6, 3, 12, 10, I); o.R(5, 12, 14, 9, I[0]); o.R(6, 13, 12, 7, I[2]); o.R(6, 13, 12, 1, I[3]); o.R(8, 7, 8, 3, K); o.R(9, 8, 2, 1, M.aether[3]); o.R(13, 8, 2, 1, M.aether[3]); o.R(9, 1, 6, 2, M.gold[2]); o.R(11, 0, 2, 1, M.gold[3]); o.R(4, 14, 2, 6, I[1]); o.R(18, 14, 2, 6, I[1]); o.D(7, 4, I[4]); o.D(11, 14, I[4]); },
    fissure: o => { const S = M.silver; o.R(2, 20, 20, 2, M.stone[1]); o.P([[2, 21], [7, 17], [9, 19], [13, 14], [15, 16], [21, 10]], S[0]); o.P([[2, 20], [7, 16], [9, 18], [13, 13], [15, 15], [21, 9]], S[3]); o.T([[6, 17], [8, 9], [10, 17]], S[2]); o.T([[13, 14], [16, 5], [17, 14]], S[3]); o.D(9, 10, S[4]); o.D(16, 6, S[4]); o.T([[4, 20], [5, 14], [7, 20]], S[1]); },
    toss: o => { const S = M.silver; o.T([[8, 3], [16, 3], [17, 14], [12, 21], [7, 14]], S[0]); o.T([[9, 4], [15, 4], [16, 13], [12, 19], [8, 13]], S[2]); o.R(10, 5, 1, 9, S[4]); o.R(11, 5, 3, 1, S[3]); o.D(13, 12, S[1]); o.A(12, 12, 10.5, 2.2, 3.4, S[3]); o.A(12, 12, 10.5, -0.8, 0.4, S[3]); o.D(2, 9, S[4]); },
    challenge: o => { const S = M.silver, G = M.gold; o.rays(12, 12, 6, 11, 8, G[2], 0.39); o.rays(12, 12, 5, 9, 8, G[3]); o.plate(8, 7, 8, 10, S); o.R(10, 10, 4, 1, K); o.D(10, 10, G[3]); o.D(13, 10, G[3]); o.X(12, 2, G[4]); },
    cage: o => { const S = M.silver; o.F(12, 14, 2.5, M.blood[2]); o.D(11, 13, M.blood[3]); [[3, 5], [8, 2], [14, 2], [19, 5], [3, 13], [19, 13], [8, 17], [14, 17]].forEach(([x, y]) => { o.R(x, y, 3, 6, S[0]); o.R(x + 1, y + 1, 1, 4, S[3]); }); o.R(6, 22, 12, 1, M.stone[1]); },
    thorns: o => { const S = M.silver; o.plate(9, 3, 6, 18, S); o.R(10, 4, 1, 16, S[4]); [[2, 6], [2, 12], [2, 18]].forEach(([x, y]) => { o.L(x, y, 8, y, M.blood[2]); o.T([[5, y - 2], [2, y], [5, y + 2]], M.blood[3]); }); [[22, 6], [22, 12], [22, 18]].forEach(([x, y]) => { o.L(16, y, x, y, M.blood[2]); o.T([[19, y - 2], [22, y], [19, y + 2]], M.blood[3]); }); },
    overcharge: o => { const I = M.iron, A = M.aether; o.plate(7, 9, 10, 12, I); o.R(9, 12, 6, 2, K); o.D(10, 12, A[4]); o.D(13, 12, A[4]); o.P([[3, 2], [7, 6], [5, 8], [9, 11]], A[3]); o.P([[21, 2], [17, 6], [19, 8], [15, 11]], A[3]); o.D(3, 2, A[4]); o.D(21, 2, A[4]); o.R(9, 16, 6, 2, A[2]); o.D(10, 16, A[4]); o.X(12, 4, A[3]); },
    anvil: o => { const S = M.silver; o.T([[6, 2], [18, 2], [17, 12], [7, 12]], S[0]); o.T([[7, 3], [17, 3], [16, 11], [8, 11]], S[2]); o.R(8, 4, 1, 6, S[4]); o.R(9, 4, 5, 1, S[3]); o.R(3, 4, 1, 5, S[1]); o.R(21, 4, 1, 5, S[1]); o.R(2, 20, 20, 2, M.stone[1]); o.P([[5, 19], [8, 15], [11, 19], [14, 14], [17, 19], [19, 16]], S[3]); o.D(11, 13, S[4]); o.D(13, 14, S[4]); },
    forge: o => { const S = M.silver; o.T([[12, 21], [3, 11], [3, 6], [6, 3], [9, 3], [12, 7], [15, 3], [18, 3], [21, 6], [21, 11]], S[0]); o.T([[12, 19], [5, 11], [5, 7], [7, 5], [9, 5], [12, 9], [15, 5], [17, 5], [19, 7], [19, 11]], S[2]); o.R(6, 7, 2, 3, S[4]); o.R(8, 6, 1, 1, S[3]); o.R(12, 12, 1, 6, S[3]); o.D(12, 19, S[1]); o.drop(12, 21, M.aether); },
    wisps: o => { const A = M.aether; o.P([[4, 12], [2, 16], [4, 20]], A[1]); o.P([[19, 9], [22, 12], [21, 16]], A[1]); o.P([[9, 20], [6, 23]], A[1]); o.orb(7, 8, 4, A); o.orb(17, 6, 3.5, A); o.orb(12, 16, 4.5, A); o.X(21, 20, A[3]); o.D(3, 4, A[3]); },
    restless: o => { const A = M.aether; o.orb(15, 9, 3, A); o.P([[12, 8], [4, 5]], A[2]); o.P([[12, 10], [3, 10]], A[1]); o.P([[12, 12], [5, 15]], A[2]); o.F(18, 17, 2.5, M.blood[2]); o.D(17, 16, M.blood[3]); o.P([[15, 12], [17, 15]], A[3]); o.X(20, 4, A[3]); },
    beam: o => { const A = M.aether; o.LW(3, 20, 18, 5, 3, A[1]); o.LW(3, 20, 18, 5, 1, A[3]); o.F(18, 5, 2, A[3]); o.D(18, 5, WH); o.D(17, 4, WH); o.X(21, 2, A[4]); o.D(5, 17, A[4]); o.D(10, 12, A[4]); },
    cull: o => { const A = M.aether; o.E(12, 19, 8, 2.5, M.blood[1]); o.E(12, 19, 6, 1.5, M.blood[2]); o.orb(5, 4, 2.2, A); o.orb(12, 3, 2.2, A); o.orb(19, 4, 2.2, A); o.P([[5, 7], [10, 15]], A[2]); o.P([[12, 6], [12, 15]], A[2]); o.P([[19, 7], [14, 15]], A[2]); o.T([[9, 14], [12, 18], [15, 14]], A[3]); },
    condense: o => { const A = M.aether; o.orb(12, 12, 5.5, A); o.F(12, 12, 2, WH); [[2, 2, 7, 7], [22, 2, 17, 7], [2, 22, 7, 17], [22, 22, 17, 17], [12, 1, 12, 5], [12, 23, 12, 19]].forEach(([a, b, c, d]) => { o.L(a, b, c, d, A[2]); o.D(c, d, A[4]); }); },
    prism: o => { const A = M.aether; o.orb(7, 12, 3.5, A); o.P([[10, 11], [17, 5]], A[2]); o.P([[10, 12], [19, 12]], A[2]); o.P([[10, 13], [17, 19]], A[2]); o.orb(18, 4, 2, A); o.orb(20, 12, 2, A); o.orb(18, 20, 2, A); o.X(13, 8, '#ffe28a', WH); o.X(14, 16, '#8affa8', WH); },
    leash: o => { const A = M.aether; o.plate(1, 15, 6, 6, M.iron); o.plate(17, 3, 6, 6, M.iron); const pts = [[6, 17], [9, 13], [11, 15], [13, 10], [15, 12], [17, 7]]; for (let i = 0; i < pts.length - 1; i++) { o.L(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], A[1]); } pts.forEach(([x, y]) => { o.C(x, y, 1.5, A[3]); o.D(x, y, A[0]); }); o.X(20, 18, A[3]); },
    totem: o => { const I = M.iron, A = M.aether; o.R(10, 1, 4, 1, I[2]); o.R(11, 2, 2, 1, I[1]); o.plate(7, 3, 10, 3, I); o.R(7, 6, 1, 10, I[0]); o.R(16, 6, 1, 10, I[0]); o.R(8, 6, 8, 10, A[1]); o.R(9, 7, 6, 8, A[2]); o.F(12, 11, 2.5, A[3]); o.D(11, 10, WH); o.plate(6, 16, 12, 3, I); o.R(11, 19, 2, 4, I[1]); o.D(3, 8, A[3]); o.D(21, 10, A[3]); },
    choir: o => { const A = M.aether; o.R(8, 2, 8, 2, M.gold[2]); o.D(8, 1, M.gold[3]); o.D(12, 0, M.gold[3]); o.D(15, 1, M.gold[3]); [[3, 13], [7, 8], [12, 6], [17, 8], [21, 13]].forEach(([x, y], i) => o.orb(x, y, i === 2 ? 3.5 : 2.5, i % 2 ? ['#2a2010', '#8a6a20', '#ffe2a0', '#fff2d0', WH] : A)); o.A(12, 14, 8, 0.5, 2.6, A[1]); },
    animam: o => { const A = M.aether; o.orb(12, 13, 6, A); o.C(12, 13, 9, M.gold[2]); o.C(12, 13, 9.5, M.gold[1]); o.D(12, 3, M.gold[4]); o.D(3, 13, M.gold[4]); o.D(21, 13, M.gold[4]); o.F(12, 13, 2, WH); },
    swarm: o => { const A = M.aether; [[4, 6], [9, 3], [14, 7], [6, 13], [11, 11], [17, 13], [9, 18], [15, 19], [20, 4]].forEach(([x, y]) => { o.L(x - 3, y + 2, x, y, A[1]); o.F(x, y, 1.5, A[3]); o.D(x, y, WH); }); },
    ward: o => { const A = M.aether; o.T([[12, 2], [21, 5], [20, 13], [12, 22], [4, 13], [3, 5]], A[0]); o.T([[12, 4], [19, 6], [18, 12], [12, 20], [6, 12], [5, 6]], A[1]); o.T([[12, 7], [16, 8], [15, 13], [12, 17], [9, 13], [8, 8]], A[2]); o.F(12, 12, 2, A[4]); o.R(6, 6, 1, 5, A[3]); o.D(7, 5, A[4]); },
    lance: o => { const A = M.aether; o.LW(2, 21, 11, 10, 2, A[2]); o.LW(11, 10, 21, 14, 2, A[2]); o.L(2, 21, 11, 10, A[4]); o.L(11, 10, 21, 14, A[4]); o.F(11, 10, 2, WH); o.F(21, 14, 2.2, M.blood[2]); o.X(21, 4, A[3]); o.D(4, 18, A[4]); },
    wraith: o => { const Wt = M.white; o.T([[12, 2], [5, 9], [4, 22], [8, 18], [12, 22], [16, 18], [20, 22], [19, 9]], Wt[1]); o.T([[12, 4], [7, 10], [7, 20], [12, 17], [17, 20], [17, 10]], Wt[2]); o.R(9, 7, 6, 5, Wt[0]); o.D(10, 9, M.aether[3]); o.D(13, 9, M.aether[3]); o.R(11, 12, 2, 4, Wt[3]); },
    storm: o => { const A = M.aether; for (let i = 0; i < 40; i++) { const a = i * 0.32, r = 1 + i * 0.24; o.D(Math.round(12 + Math.cos(a) * r), Math.round(12 + Math.sin(a) * r * 0.8), i % 3 ? A[2] : A[3]); } o.F(12, 12, 1.5, WH); o.X(4, 19, A[3]); o.X(20, 5, A[3]); },
    mark: o => { const Wt = M.white; o.P([[12, 2], [21, 12], [12, 22], [3, 12], [12, 2]], Wt[3]); o.P([[12, 5], [18, 12], [12, 19], [6, 12], [12, 5]], Wt[1]); o.F(12, 12, 2.5, M.gold[2]); o.D(11, 11, M.gold[4]); o.D(12, 2, WH); o.D(3, 12, WH); o.D(21, 12, WH); o.D(12, 22, WH); },
    orb: o => { const Wt = M.white; o.orb(11, 12, 5.5, Wt); o.F(10, 11, 1.5, WH); for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.5, r = 7.5 + i * 0.4; o.D(Math.round(11 + Math.cos(a) * r), Math.round(12 + Math.sin(a) * r), i % 2 ? M.aether[3] : WH); } },
    word: o => { const Wt = M.white; o.C(12, 12, 9, Wt[2]); o.C(12, 12, 4, Wt[3]); o.rays(12, 12, 5, 8, 6, Wt[3], 0.5); [[0, -9], [8, -5], [8, 5], [0, 9], [-8, 5], [-8, -5]].forEach(([a, b]) => o.D(12 + a, 12 + b, WH)); o.F(12, 12, 1.5, K); },
    chain: o => { const Wt = M.white; o.P([[2, 20], [6, 12], [10, 16], [14, 7], [18, 11], [22, 3]], Wt[3]); o.P([[3, 21], [7, 13], [11, 17], [15, 8], [19, 12], [22, 4]], Wt[1]); [[6, 12], [14, 7], [22, 3]].forEach(([x, y]) => o.X(x, y, Wt[3], WH)); o.F(2, 20, 1.5, M.blood[2]); o.F(10, 16, 1.5, M.blood[2]); o.F(18, 11, 1.5, M.blood[2]); },
    nmastery: o => { const Wd = M.wood, Wt = M.white; o.T([[2, 4], [12, 6], [22, 4], [22, 20], [12, 22], [2, 20]], Wd[0]); o.T([[3, 5], [11, 7], [11, 21], [3, 19]], M.bone[2]); o.T([[13, 7], [21, 5], [21, 19], [13, 21]], M.bone[2]); o.R(12, 6, 1, 16, Wd[1]); [[4, 9], [4, 12], [4, 15]].forEach(([x, y]) => o.R(x, y, 6, 1, M.bone[1])); o.P([[15, 9], [19, 9], [17, 9], [17, 17], [15, 17], [19, 17]], Wt[3]); o.X(17, 13, Wt[3], WH); },
    // ================= OSSURARCH: Ossuary (skeletons), Marrow (bone spells), Carapace (melee)
    offering: o => { const B = M.bone; o.skull(8, 8, B); o.rays(11, 11, 6, 10, 8, B[3], 0.4); [[2, 2], [21, 3], [2, 20], [21, 20], [12, 1], [12, 22]].forEach(([x, y]) => o.D(x, y, B[4])); o.R(9, 17, 5, 2, M.blood[2]); },
    raise: o => { const B = M.bone; o.R(2, 19, 20, 3, M.stone[1]); o.R(2, 19, 20, 1, M.stone[2]); o.R(9, 12, 6, 7, B[0]); o.R(10, 13, 4, 5, B[2]); [[8, 5, 7], [10, 3, 9], [12, 2, 10], [14, 4, 8], [16, 8, 4]].forEach(([x, y, h]) => { o.R(x, y, 2, h, B[0]); o.R(x, y + 1, 1, h - 2, B[3]); }); o.D(10, 14, B[4]); },
    banner: o => { const B = M.bone, F = M.flesh; o.R(4, 2, 2, 20, B[0]); o.R(4, 3, 1, 18, B[2]); o.skull(2, 0, B); o.T([[6, 4], [20, 5], [18, 9], [20, 13], [6, 14]], M.blood[1]); o.T([[7, 5], [18, 6], [16, 9], [18, 12], [7, 13]], F[1]); o.R(9, 8, 5, 1, B[2]); o.R(11, 6, 1, 5, B[2]); o.D(16, 7, M.blood[3]); },
    tithe: o => { const B = M.bone; o.C(12, 13, 8, B[1]); o.orb(12, 13, 4, B); o.D(12, 13, B[0]); o.P([[2, 3], [8, 9]], B[3]); o.T([[6, 6], [9, 10], [4, 9]], B[4]); o.F(2, 3, 1.5, M.blood[2]); o.D(20, 4, B[4]); o.D(21, 20, B[3]); },
    unearth: o => { const B = M.bone; o.E(12, 20, 10, 3.5, M.wood[1]); o.E(12, 19, 8, 2.5, M.wood[2]); o.skull(9, 8, B); o.R(4, 13, 2, 7, B[0]); o.R(4, 14, 1, 5, B[3]); o.R(3, 12, 1, 3, B[0]); o.R(6, 12, 1, 2, B[0]); o.R(18, 11, 2, 9, B[0]); o.R(18, 12, 1, 7, B[3]); o.D(17, 10, B[0]); o.D(20, 10, B[0]); o.D(14, 6, M.verd[3]); },
    colossus: o => { const B = M.bone; o.R(6, 2, 12, 9, B[0]); o.R(7, 3, 10, 7, B[2]); o.R(7, 3, 10, 1, B[3]); o.R(9, 6, 2, 2, K); o.R(13, 6, 2, 2, K); o.D(9, 6, M.blood[3]); o.D(13, 6, M.blood[3]); o.R(8, 11, 8, 3, B[0]); o.R(9, 11, 6, 2, B[2]); for (let i = 0; i < 4; i++) { o.R(4 + i * 4, 14, 2, 8 - i % 2 * 2, B[0]); o.R(4 + i * 4, 15, 1, 6 - i % 2 * 2, B[2]); o.R(17 - i * 4 + 3, 14, 2, 8 - i % 2 * 2, B[0]); } o.R(3, 12, 2, 4, B[1]); o.R(19, 12, 2, 4, B[1]); o.D(7, 3, B[4]); },
    horn: o => { const B = M.bone; o.T([[3, 20], [6, 12], [10, 6], [16, 3], [21, 4], [17, 6], [12, 9], [9, 14], [7, 21]], B[0]); o.T([[5, 19], [7, 13], [11, 8], [16, 5], [18, 5], [13, 9], [10, 14], [7, 19]], B[2]); o.P([[7, 12], [11, 7], [16, 4]], B[3]); o.D(17, 4, B[4]); o.R(3, 19, 5, 3, M.gold[1]); o.R(3, 19, 5, 1, M.gold[3]); o.D(19, 8, B[3]); o.D(21, 10, B[3]); },
    bward: o => { const B = M.bone; o.T([[12, 2], [21, 5], [20, 13], [12, 22], [4, 13], [3, 5]], B[0]); o.T([[12, 4], [19, 6], [18, 12], [12, 20], [6, 12], [5, 6]], B[1]); [[7, 8], [7, 12], [8, 16]].forEach(([x, y], i) => { o.R(x, y, 10 - i, 2, B[2]); o.R(x, y, 10 - i, 1, B[3]); }); o.R(11, 5, 2, 15, B[2]); o.D(11, 5, B[4]); },
    reasm: o => { const B = M.bone; o.bone(4, 6, 10, 4, B); o.bone(14, 18, 20, 14, B); o.bone(5, 18, 9, 13, B); o.A(12, 12, 8, 3.6, 5.6, M.gold[2]); o.T([[17, 5], [21, 6], [18, 9]], M.gold[3]); o.D(12, 12, B[3]); },
    legion: o => { const B = M.bone; o.skull(9, 2, B); o.skull(2, 11, B); o.skull(9, 12, B); o.skull(16, 11, B); o.R(2, 21, 20, 1, M.stone[1]); },
    spear: o => { const B = M.bone; o.LW(3, 21, 18, 6, 3, B[0]); o.LW(3, 21, 18, 6, 1, B[2]); o.T([[16, 8], [21, 1], [22, 4], [19, 7]], B[0]); o.T([[17, 7], [20, 3], [19, 6]], B[3]); o.D(20, 3, B[4]); o.F(4, 20, 1.6, B[0]); o.D(4, 20, B[3]); o.D(9, 14, B[3]); },
    siphon: o => { const B = M.bone, Bl = M.blood; o.T([[3, 12], [20, 2], [20, 22]], Bl[0]); o.T([[5, 12], [19, 4], [19, 20]], Bl[1]); o.T([[7, 12], [18, 6], [18, 18]], Bl[2]); o.fig(1, 7, B); [[10, 8], [13, 15], [15, 11]].forEach(([x, y]) => o.drop(x, y, Bl)); o.D(17, 7, Bl[4]); },
    ribcage: o => { const B = M.bone; o.R(11, 2, 2, 20, B[0]); o.R(11, 3, 1, 18, B[2]); for (let i = 0; i < 4; i++) { const y = 5 + i * 4, w = 8 - i; o.A(12, y + 3, w, 3.14, 4.7, B[0]); o.A(12, y + 3, w - 1, 3.14, 4.7, B[2]); o.A(12, y + 3, w, 4.7, 6.28, B[0]); o.A(12, y + 3, w - 1, 4.7, 6.28, B[2]); o.D(12 - w, y + 3, B[3]); o.D(12 + w - 1, y + 3, B[3]); } o.F(12, 14, 1.5, M.blood[2]); },
    ossify: o => { const B = M.bone, F = M.flesh; o.R(8, 2, 8, 7, F[0]); o.R(9, 3, 3, 5, F[2]); o.R(12, 3, 3, 5, B[2]); o.D(10, 5, K); o.D(13, 5, K); o.R(6, 9, 12, 10, F[0]); o.R(7, 10, 5, 8, F[2]); o.R(12, 10, 5, 8, B[2]); o.R(12, 10, 5, 1, B[3]); o.R(7, 19, 4, 3, F[1]); o.R(13, 19, 4, 3, B[1]); o.R(4, 10, 2, 6, F[1]); o.R(18, 10, 2, 6, B[1]); o.D(13, 11, B[4]); o.D(14, 14, B[0]); o.D(15, 16, B[0]); o.D(2, 4, M.violet[3]); },
    wall: o => { const B = M.bone; o.R(2, 19, 20, 3, M.wood[1]); [[3, 9], [9, 5], [15, 8]].forEach(([x, y]) => { o.R(x + 1, y + 4, 3, 16 - y, B[0]); o.R(x + 2, y + 5, 1, 14 - y, B[2]); [[0, 0], [2, -1], [4, 0], [1, 3]].forEach(([a, b]) => { o.R(x + a, y + b, 1, 4, B[0]); o.D(x + a, y + b, B[3]); }); }); o.D(10, 8, B[4]); },
    spikes: o => { const B = M.bone; o.F(12, 12, 3, M.blood[1]); o.D(11, 11, M.blood[3]); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + 0.2, x0 = 12 + Math.cos(a) * 3, y0 = 12 + Math.sin(a) * 3, x1 = 12 + Math.cos(a) * 10, y1 = 12 + Math.sin(a) * 10; o.LW(x0, y0, x1, y1, 2, B[0]); o.L(x0, y0, x1, y1, B[2]); o.D(Math.round(x1), Math.round(y1), B[4]); } },
    sstorm: o => { const B = M.bone; o.C(4, 12, 3, B[1]); for (let i = 0; i < 5; i++) { const a = -0.7 + i * 0.35, x1 = 6 + Math.cos(a) * 16, y1 = 12 + Math.sin(a) * 16; o.LW(6, 12, x1, y1, 2, B[0]); o.L(6, 12, x1, y1, B[2]); o.T([[x1, y1], [x1 - Math.cos(a) * 3 - Math.sin(a) * 1.5, y1 - Math.sin(a) * 3 + Math.cos(a) * 1.5], [x1 - Math.cos(a) * 3 + Math.sin(a) * 1.5, y1 - Math.sin(a) * 3 - Math.cos(a) * 1.5]], B[3]); } },
    bonerain: o => { const B = M.bone; for (let i = 0; i < 6; i++) { const x = 3 + i * 3.4, y = 2 + (i * 5) % 8; o.R(x, y, 2, 8, B[0]); o.R(x, y + 1, 1, 6, B[2]); o.D(x, y, B[3]); o.T([[x - 1, y + 8], [x + 1, y + 11], [x + 3, y + 8]], B[3]); } o.R(2, 21, 20, 1, M.stone[2]); },
    spirit: o => { const B = M.bone, A = M.aether; o.P([[2, 16], [6, 12], [4, 9]], A[1]); o.P([[3, 19], [8, 15], [7, 12]], A[2]); o.R(9, 5, 11, 9, B[0]); o.R(10, 6, 9, 7, B[2]); o.R(10, 6, 9, 1, B[3]); o.R(12, 8, 2, 2, K); o.R(16, 8, 2, 2, K); o.D(12, 8, A[3]); o.D(16, 8, A[3]); o.R(11, 14, 7, 5, B[0]); o.R(12, 14, 5, 4, B[2]); o.R(12, 15, 5, 2, K); [[13, 14], [15, 14], [17, 14], [13, 18], [16, 18]].forEach(([x, y]) => o.D(x, y, B[3])); o.D(10, 6, B[4]); },
    marrowm: o => { const B = M.bone; o.LW(5, 19, 19, 5, 5, B[0]); o.LW(5, 19, 19, 5, 3, B[2]); o.F(5, 19, 2.6, B[0]); o.F(19, 5, 2.6, B[0]); o.F(5, 19, 1.6, B[2]); o.F(19, 5, 1.6, B[2]); o.D(4, 18, B[3]); o.D(18, 4, B[3]); o.LW(8, 16, 16, 8, 1, M.blood[2]); o.L(9, 15, 15, 9, M.blood[3]); o.D(12, 12, M.blood[4]); o.X(20, 19, B[4]); },
    barmor: o => { const B = M.bone; o.R(5, 3, 14, 18, B[0]); [[6, 4, 12, 4], [6, 9, 12, 4], [6, 14, 12, 4]].forEach(([x, y, w, h], i) => { o.R(x, y, w, h, B[2]); o.R(x, y, w, 1, B[3]); o.R(x + 5 + (i % 2), y, 1, h, B[1]); o.D(x + 1, y + 1, B[4]); }); o.R(11, 18, 2, 2, B[1]); o.R(4, 7, 1, 8, B[1]); o.R(19, 7, 1, 8, B[1]); },
    aura: o => { const B = M.bone; o.C(12, 12, 8.5, B[1]); o.fig(10, 7, M.stone); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + 0.2, x = 12 + Math.cos(a) * 9, y = 12 + Math.sin(a) * 8.5; o.T([[x + Math.cos(a) * 3, y + Math.sin(a) * 3], [x - Math.sin(a) * 2.2 - Math.cos(a) * 1.5, y + Math.cos(a) * 2.2 - Math.sin(a) * 1.5], [x + Math.sin(a) * 2.2 - Math.cos(a) * 1.5, y - Math.cos(a) * 2.2 - Math.sin(a) * 1.5]], B[0]); o.T([[x + Math.cos(a) * 2.5, y + Math.sin(a) * 2.5], [x - Math.sin(a) * 1.2 - Math.cos(a) * 1, y + Math.cos(a) * 1.2 - Math.sin(a) * 1], [x + Math.sin(a) * 1.2 - Math.cos(a) * 1, y - Math.cos(a) * 1.2 - Math.sin(a) * 1]], B[3]); } },
    blade: o => { const B = M.bone; o.LW(3, 20, 12, 11, 3, M.wood[0]); o.LW(3, 20, 12, 11, 1, M.wood[2]); o.R(9, 12, 6, 1, M.iron[2]); o.T([[11, 12], [22, 1], [22, 5], [14, 13]], B[0]); o.T([[12, 11], [21, 2], [21, 4], [14, 11]], B[2]); o.L(13, 10, 20, 3, B[3]); o.D(21, 2, B[4]); o.D(4, 20, M.wood[3]); },
    gcharge: o => { const B = M.bone, S = M.stone; o.R(9, 4, 7, 6, S[0]); o.R(10, 5, 5, 4, S[2]); o.R(6, 9, 12, 8, B[0]); o.R(7, 10, 10, 6, B[2]); o.R(7, 10, 10, 1, B[3]); o.T([[16, 9], [21, 12], [17, 16]], B[3]); [[2, 6], [1, 10], [2, 14]].forEach(([x, y]) => o.L(x, y, x + 3, y, S[3])); o.R(8, 17, 2, 4, S[1]); o.R(13, 17, 2, 4, S[1]); o.D(20, 12, B[4]); },
    crush: o => { const B = M.bone; o.LW(4, 21, 12, 9, 3, M.wood[0]); o.LW(4, 21, 12, 9, 1, M.wood[2]); o.R(9, 2, 11, 8, B[0]); o.R(10, 3, 9, 6, B[2]); o.R(10, 3, 9, 1, B[3]); o.R(11, 5, 2, 2, B[1]); o.R(16, 5, 2, 2, B[1]); o.D(10, 3, B[4]); o.P([[2, 6], [4, 4]], B[3]); o.P([[20, 12], [22, 14]], B[3]); o.P([[7, 1], [8, 1]], B[3]); },
    host: o => { const B = M.bone; o.fig(9, 4, M.stone); o.R(5, 8, 14, 10, B[0]); o.R(6, 9, 12, 8, B[1]); for (let i = 0; i < 3; i++) { o.R(7, 10 + i * 3, 10, 2, B[2]); o.R(7, 10 + i * 3, 10, 1, B[3]); } o.R(11, 9, 2, 9, B[2]); o.R(3, 6, 2, 6, B[0]); o.R(19, 6, 2, 6, B[0]); o.D(3, 7, B[3]); o.D(19, 7, B[3]); o.R(8, 18, 2, 4, B[0]); o.R(14, 18, 2, 4, B[0]); },
    bscythe: o => { const B = M.bone; o.LW(6, 22, 13, 8, 3, M.wood[0]); o.LW(6, 22, 13, 8, 1, M.wood[2]); o.A(9, 11, 9, 4.2, 6.7, B[0]); o.A(9, 11, 8, 4.2, 6.7, B[2]); o.A(9, 11, 7, 4.4, 6.5, B[0]); o.A(9, 11, 8, 4.4, 5.4, B[3]); o.R(12, 7, 3, 2, M.iron[2]); o.D(18, 11, B[4]); },
    leap: o => { const B = M.bone; o.A(12, 18, 12, 3.4, 5.9, M.stone[3]); o.fig(14, 2, M.stone); [[3, 21], [7, 19], [12, 20], [17, 19], [21, 21]].forEach(([x, y]) => { o.T([[x - 2, 22], [x, y - 5], [x + 2, 22]], B[0]); o.L(x, y - 3, x, 21, B[2]); o.D(x, y - 4, B[4]); }); },
    lash: o => { const B = M.bone; o.R(2, 18, 4, 4, M.wood[1]); o.D(2, 18, M.wood[3]); for (let i = 0; i < 8; i++) { const x = 5 + i * 2.2, y = 17 - i * 1.9; o.R(x, y, 2, 3, B[0]); o.R(x, y, 2, 1, B[3]); o.D(x + 1, y + 1, B[2]); } o.T([[20, 2], [23, 3], [21, 6]], B[3]); o.D(22, 3, B[4]); },
    carapm: o => { const B = M.bone; o.E(12, 12, 9, 8, B[0]); o.E(12, 12, 8, 7, B[2]); [[6, 7, 12, 3], [5, 11, 14, 3], [6, 15, 12, 3]].forEach(([x, y, w, h]) => { o.R(x, y, w, 1, B[0]); o.R(x, y + 1, w, 1, B[3]); }); o.R(12, 5, 1, 14, B[0]); o.D(7, 8, B[4]); o.D(6, 12, B[4]); },
    // ================= HEMOMANCER: Brood, Blood, Flesh
    eggsac: o => { const F = M.flesh, Bl = M.blood; o.A(12, 16, 10, 3.5, 5.6, F[1]); o.orb(16, 8, 5, F); o.D(17, 9, Bl[2]); o.D(14, 10, Bl[1]); o.D(18, 6, Bl[3]); o.fig(2, 12, F); o.D(15, 2, F[4]); },
    hatch: o => { const B = M.bone, Bl = M.blood; o.E(12, 14, 8, 8, B[0]); o.E(12, 14, 7, 7, B[2]); o.P([[5, 12], [8, 10], [10, 13], [13, 9], [16, 12], [19, 10]], K); o.F(12, 8, 3, Bl[1]); o.D(11, 7, Bl[3]); o.D(13, 7, Bl[3]); o.D(11, 7, WH); o.D(13, 7, WH); o.R(9, 10, 6, 1, Bl[2]); o.D(6, 16, B[3]); },
    thrall: o => { const Bl = M.blood; o.E(12, 15, 9, 6, Bl[0]); o.E(12, 14, 8, 5, Bl[2]); o.E(11, 12, 5, 3, Bl[3]); o.F(8, 13, 1.6, WH); o.D(8, 13, K); o.F(14, 12, 1.6, WH); o.D(14, 12, K); o.drop(4, 6, Bl); o.drop(19, 4, Bl); o.D(6, 20, Bl[1]); o.D(18, 20, Bl[1]); },
    rush: o => { const Bl = M.blood, F = M.flesh; o.E(14, 13, 7, 5, F[0]); o.E(14, 13, 6, 4, F[2]); o.E(13, 11, 3, 2, F[3]); o.R(17, 11, 2, 1, Bl[3]); o.R(17, 11, 1, 1, WH); o.R(16, 14, 4, 2, K); o.D(17, 14, WH); o.D(19, 14, WH); [[2, 9], [1, 12], [2, 15]].forEach(([x, y]) => o.L(x, y, x + 4, y, F[3])); o.R(10, 17, 2, 3, F[1]); o.R(16, 17, 2, 3, F[1]); },
    graft: o => { const F = M.flesh, B = M.bone; o.R(3, 6, 18, 12, F[0]); o.R(4, 7, 16, 10, F[2]); o.R(4, 7, 16, 1, F[3]); o.R(11, 6, 1, 12, F[0]); for (let i = 0; i < 5; i++) o.R(9 + (i % 2) * 2, 7 + i * 2, 2, 1, B[3]); o.L(14, 3, 20, 9, B[3]); o.D(20, 9, B[4]); o.D(6, 10, F[4]); o.D(16, 13, F[1]); },
    fgolem: o => { const F = M.flesh, B = M.bone; o.R(4, 4, 16, 16, F[0]); o.R(5, 5, 14, 14, F[2]); o.R(5, 5, 14, 1, F[3]); o.R(7, 8, 3, 2, K); o.R(14, 8, 3, 2, K); o.D(8, 8, M.blood[3]); o.D(15, 8, M.blood[3]); o.R(6, 13, 12, 4, M.blood[0]); for (let i = 0; i < 6; i++) o.R(6 + i * 2, 13 + (i % 2) * 3, 1, 1, B[3]); o.R(2, 8, 2, 8, F[1]); o.R(20, 8, 2, 8, F[1]); o.R(6, 20, 3, 3, F[1]); o.R(15, 20, 3, 3, F[1]); o.D(10, 6, F[4]); },
    assim: o => { const F = M.flesh; o.E(5, 16, 3, 2.5, F[1]); o.D(5, 15, F[3]); o.T([[9, 12], [13, 12], [11, 9]], F[3]); o.R(10, 12, 2, 3, F[3]); o.E(17, 13, 6, 5, F[0]); o.E(17, 13, 5, 4, F[2]); o.E(16, 11, 3, 2, F[3]); o.R(14, 13, 2, 1, WH); o.D(15, 13, K); o.R(18, 12, 2, 1, WH); o.D(19, 12, K); o.D(20, 8, F[4]); },
    nest: o => { const F = M.flesh, Bl = M.blood; o.E(12, 15, 10, 6, F[0]); o.E(12, 14, 9, 5, F[2]); o.E(12, 15, 7, 3.5, Bl[1]); [[7, 15], [12, 13], [17, 15], [10, 17], [14, 17]].forEach(([x, y]) => { o.F(x, y, 1.8, Bl[2]); o.D(x - 1, y - 1, Bl[4]); }); o.D(4, 13, F[4]); o.D(20, 12, F[4]); },
    hive: o => { const Bl = M.blood, F = M.flesh; const pts = [[5, 5], [18, 6], [12, 12], [4, 17], [19, 18], [12, 21]]; o.L(5, 5, 12, 12, F[2]); o.L(18, 6, 12, 12, F[2]); o.L(4, 17, 12, 12, F[2]); o.L(19, 18, 12, 12, F[2]); o.L(12, 21, 12, 12, F[2]); pts.forEach(([x, y], i) => o.orb(x, y, i === 2 ? 3.5 : 2.3, Bl)); },
    broodm: o => { const F = M.flesh, Bl = M.blood; o.E(12, 11, 8, 7, F[0]); o.E(12, 11, 7, 6, F[2]); o.E(11, 8, 4, 2, F[3]); o.R(9, 10, 2, 1, WH); o.D(10, 10, K); o.R(14, 10, 2, 1, WH); o.D(15, 10, K); o.R(9, 14, 6, 2, Bl[1]); [[3, 20], [8, 21], [15, 21], [20, 20]].forEach(([x, y]) => { o.E(x, y, 2.5, 2, Bl[1]); o.D(x - 1, y - 1, Bl[3]); }); },
    bboil: o => { const Bl = M.blood; o.R(3, 12, 18, 9, M.iron[0]); o.R(4, 13, 16, 7, M.iron[1]); o.E(12, 13, 8, 2.5, Bl[2]); o.E(12, 13, 6, 1.5, Bl[3]); [[6, 8], [11, 5], [16, 9], [9, 10], [14, 3]].forEach(([x, y], i) => { o.C(x, y, i % 2 ? 1.5 : 2, Bl[2]); o.D(x - 1, y - 1, Bl[4]); }); o.R(2, 19, 3, 3, M.iron[2]); o.R(19, 19, 3, 3, M.iron[2]); },
    blance: o => { const Bl = M.blood, F = M.flesh; o.R(2, 5, 7, 12, F[0]); o.R(3, 6, 5, 10, F[2]); o.R(4, 8, 1, 1, K); o.R(5, 12, 3, 3, Bl[0]); o.T([[8, 12], [22, 5], [22, 20]], Bl[1]); o.T([[9, 12], [21, 7], [21, 18]], Bl[2]); o.P([[10, 12], [20, 9]], Bl[3]); [[16, 14], [19, 17]].forEach(([x, y]) => o.drop(x, y, Bl)); o.D(21, 6, Bl[4]); },
    hemor: o => { const Bl = M.blood; o.T([[12, 3], [15, 9], [21, 8], [17, 13], [20, 20], [13, 16], [7, 21], [8, 14], [2, 12], [8, 9]], Bl[1]); o.T([[12, 6], [14, 10], [18, 10], [15, 13], [17, 18], [13, 15], [9, 19], [9, 14], [5, 12], [10, 10]], Bl[2]); o.F(12, 12, 2.5, Bl[3]); o.D(11, 11, Bl[4]); o.P([[3, 3], [9, 9]], Bl[0]); o.P([[21, 2], [16, 8]], Bl[0]); },
    vwhip: o => { const B = M.bone, Bl = M.blood; o.R(2, 14, 10, 8, B[1]); [[2, 15], [2, 18], [2, 21]].forEach(([x, y]) => o.R(x, y, 10, 1, B[3])); o.R(10, 12, 3, 10, M.flesh[2]); const roots = [[[11, 13], [14, 9], [13, 4]], [[12, 13], [17, 10], [21, 6]], [[12, 14], [18, 14], [22, 17]], [[11, 15], [15, 19], [20, 22]]]; roots.forEach(r => { o.P(r, Bl[1]); }); roots.forEach(r => { o.D(r[2][0], r[2][1], Bl[3]); o.D(r[1][0], r[1][1], Bl[2]); }); o.D(3, 15, B[4]); },
    bfrenzy: o => { const Bl = M.blood, F = M.flesh; o.R(8, 6, 8, 10, F[0]); o.R(9, 7, 6, 8, F[2]); o.R(10, 9, 1, 1, K); o.R(13, 9, 1, 1, K); o.R(10, 12, 4, 3, Bl[0]); o.D(11, 12, WH); o.D(13, 12, WH); o.rays(12, 11, 7, 11, 8, Bl[3], 0.39); o.D(12, 1, Bl[4]); o.R(11, 16, 2, 5, F[1]); },
    cburst: o => { const F = M.flesh, Bl = M.blood; o.fig(9, 9, M.stone); o.rays(12, 13, 4, 10, 8, Bl[2], 0.2); [[3, 4], [20, 5], [4, 20], [21, 19], [12, 1]].forEach(([x, y]) => { o.F(x, y, 1.6, F[2]); o.D(x, y, Bl[3]); }); o.D(2, 12, Bl[4]); o.D(22, 12, Bl[4]); },
    spool: o => { const Bl = M.blood, Wd = M.wood; o.R(3, 2, 14, 8, M.blood[0]); o.R(4, 3, 12, 6, '#5a1622'); o.R(4, 3, 12, 1, '#8a2a3a'); o.R(4, 8, 12, 1, M.gold[1]); [[6, 11], [11, 13], [15, 11]].forEach(([x, y], i) => { o.E(x + 1, y + 4, 1.6, 3.5, Bl[0]); o.E(x + 1, y + 4, 1, 2.5, i === 1 ? Bl[2] : '#3a1a24'); o.D(x + 1, y + 1, Bl[3]); o.D(x + 1, y + 6, Bl[1]); }); o.D(19, 19, Bl[2]); o.D(20, 21, Bl[1]); },
    bwave: o => { const Bl = M.blood; o.R(2, 20, 20, 2, Bl[0]); for (let i = 0; i < 5; i++) { const x = 3 + i * 4, h = 5 + i * 3; o.R(x, 20 - h, 4, h, Bl[1]); o.R(x, 20 - h, 4, 1, Bl[3]); o.R(x + 1, 21 - h, 1, h - 2, Bl[2]); } o.A(19, 10, 5, 3.2, 5.2, Bl[3]); o.D(20, 5, Bl[4]); o.drop(16, 3, Bl); },
    pact: o => { const F = M.flesh, Bl = M.blood; o.hand(7, 2, F); o.R(9, 9, 3, 2, Bl[1]); o.D(10, 9, Bl[3]); [[9, 15], [12, 17], [15, 15]].forEach(([x, y]) => o.drop(x, y, Bl)); o.E(12, 21, 6, 1.5, Bl[1]); o.E(12, 21, 4, 1, Bl[2]); },
    hemom: o => { const Bl = M.blood; o.T([[12, 21], [3, 11], [3, 6], [6, 3], [9, 3], [12, 7], [15, 3], [18, 3], [21, 6], [21, 11]], Bl[0]); o.T([[12, 19], [5, 11], [5, 7], [7, 5], [9, 5], [12, 9], [15, 5], [17, 5], [19, 7], [19, 11]], Bl[2]); o.R(6, 7, 2, 3, Bl[4]); o.D(8, 6, Bl[3]); o.P([[11, 9], [13, 13], [10, 15], [12, 18]], Bl[1]); o.D(12, 19, Bl[3]); },
    maw: o => { const F = M.flesh, Bl = M.blood; o.E(12, 12, 10, 8, F[0]); o.E(12, 12, 9, 7, F[2]); o.E(12, 12, 8, 4, Bl[0]); o.E(12, 12, 6, 2.5, Bl[1]); for (let i = 0; i < 6; i++) { o.T([[5 + i * 2.6, 8], [6 + i * 2.6, 12], [7 + i * 2.6, 8]], M.bone[3]); o.T([[6 + i * 2.6, 16], [7 + i * 2.6, 12], [8 + i * 2.6, 16]], M.bone[2]); } o.D(5, 6, F[4]); },
    chitin: o => { const C = ['#1a1410', '#4a3a28', '#7a6040', '#a88860', '#e0c890']; o.plate(2, 2, 10, 8, C); o.plate(12, 2, 10, 8, C); o.plate(4, 9, 8, 7, C); o.plate(12, 9, 8, 7, C); o.plate(6, 15, 12, 7, C); o.D(8, 5, C[4]); o.D(15, 12, C[4]); },
    swallow: o => { const F = M.flesh, Bl = M.blood; o.E(12, 13, 10, 8, F[0]); o.E(12, 13, 9, 7, F[2]); o.E(12, 14, 8, 5, Bl[0]); o.E(12, 15, 6, 3, Bl[1]); for (let i = 0; i < 5; i++) o.T([[5 + i * 3.4, 9], [6.5 + i * 3.4, 13], [8 + i * 3.4, 9]], M.bone[3]); o.fig(10, 2, M.stone); o.D(5, 7, F[4]); },
    tentacles: o => { const F = M.flesh, Bl = M.blood; o.R(8, 14, 8, 8, F[1]); o.R(9, 15, 6, 6, F[2]); [[[9, 14], [5, 9], [3, 3]], [[11, 14], [10, 7], [8, 2]], [[13, 14], [15, 8], [15, 2]], [[15, 14], [19, 10], [21, 4]]].forEach(t => { o.LW(t[0][0], t[0][1], t[1][0], t[1][1], 3, F[0]); o.LW(t[1][0], t[1][1], t[2][0], t[2][1], 2, F[0]); o.L(t[0][0], t[0][1], t[1][0], t[1][1], F[3]); o.L(t[1][0], t[1][1], t[2][0], t[2][1], F[2]); o.D(t[2][0], t[2][1], Bl[3]); }); },
    gills: o => { const F = M.flesh, Bl = M.blood; o.R(7, 2, 10, 8, F[0]); o.R(8, 3, 8, 6, F[2]); o.R(8, 10, 8, 12, F[0]); o.R(9, 11, 6, 10, F[2]); o.R(9, 11, 6, 1, F[3]); [[10, 13], [10, 16], [10, 19]].forEach(([x, y]) => { o.R(x, y, 4, 2, Bl[0]); o.R(x, y, 4, 1, Bl[2]); }); o.D(10, 5, K); o.D(13, 5, K); o.D(9, 3, F[4]); },
    devour: o => { const F = M.flesh, Bl = M.blood; o.T([[3, 4], [21, 4], [18, 12], [6, 12]], F[0]); o.T([[4, 5], [20, 5], [17, 11], [7, 11]], F[2]); o.T([[6, 14], [18, 14], [21, 22], [3, 22]], F[0]); o.T([[7, 15], [17, 15], [20, 21], [4, 21]], F[2]); o.R(6, 11, 12, 4, Bl[0]); for (let i = 0; i < 5; i++) { o.T([[6 + i * 3, 11], [7 + i * 3, 14], [8 + i * 3, 11]], M.bone[3]); o.T([[7 + i * 3, 15], [8 + i * 3, 12], [9 + i * 3, 15]], M.bone[2]); } o.E(12, 13, 3, 1.5, Bl[2]); o.D(11, 13, WH); },
    bilehump: o => { const F = M.flesh, S = M.sick; o.R(7, 12, 10, 10, F[1]); o.E(12, 11, 8, 6, F[0]); o.E(12, 11, 7, 5, F[2]); [[8, 10], [13, 8], [16, 12], [11, 13]].forEach(([x, y]) => { o.F(x, y, 2, S[2]); o.D(x - 1, y - 1, S[4]); }); o.D(4, 4, S[3]); o.D(19, 3, S[3]); o.D(21, 8, S[3]); },
    molt: o => { const F = M.flesh; o.T([[3, 4], [9, 4], [10, 20], [4, 22]], F[1]); o.T([[4, 5], [8, 5], [9, 19], [5, 21]], F[3]); o.R(5, 8, 2, 1, F[1]); o.fig(14, 5, M.blood); o.P([[10, 10], [13, 8]], F[4]); o.D(20, 6, F[4]); o.D(6, 15, F[1]); },
    heart: o => { const Bl = M.blood, H = (x, y, s, m) => { o.T([[x, y + s * 2], [x - s, y + s * 0.7], [x - s, y], [x - s * 0.6, y - s * 0.4], [x - s * 0.3, y - s * 0.4], [x, y + s * 0.1], [x + s * 0.3, y - s * 0.4], [x + s * 0.6, y - s * 0.4], [x + s, y], [x + s, y + s * 0.7]], m[0]); o.T([[x, y + s * 1.6], [x - s + 1, y + s * 0.6], [x - s + 1, y + 1], [x - s * 0.5, y - s * 0.2 + 1], [x, y + s * 0.3], [x + s * 0.5, y - s * 0.2 + 1], [x + s - 1, y + 1], [x + s - 1, y + s * 0.6]], m[2]); o.D(x - s + 2, y + 1, m[4]); }; H(8, 8, 5, Bl); H(16, 11, 5, Bl); o.P([[10, 12], [14, 12]], Bl[3]); },
    fmastery: o => { const F = M.flesh, Bl = M.blood; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 - 1.57; o.E(12 + Math.cos(a) * 6, 12 + Math.sin(a) * 6, 4, 3, F[0]); } for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 - 1.57; o.E(12 + Math.cos(a) * 6, 12 + Math.sin(a) * 6, 3, 2, F[2]); o.D(Math.round(12 + Math.cos(a) * 6) - 1, Math.round(12 + Math.sin(a) * 6) - 1, F[4]); } o.F(12, 12, 3.5, Bl[1]); o.F(12, 12, 2, Bl[3]); o.D(11, 11, Bl[4]); },
    // ================= ASSASSIN (miasmancer): Miasma, Distortion, Death
    vblade: o => { const V = M.violet, B = M.bone; for (let i = 0; i < 3; i++) { const x = 5 + i * 6; o.T([[x, 3], [x + 3, 3], [x + 2, 17], [x + 1, 17]], B[0]); o.T([[x + 1, 4], [x + 2, 4], [x + 2, 15], [x + 1, 15]], B[2]); o.D(x + 1, 4, B[4]); o.drop(x + 1, 18, V); } o.R(4, 1, 16, 2, M.iron[1]); },
    mcloud: o => { const V = M.violet; o.E(12, 14, 9, 5, V[0]); o.E(8, 10, 5, 4, V[0]); o.E(15, 9, 6, 5, V[0]); o.E(12, 14, 8, 4, V[2]); o.E(8, 10, 4, 3, V[2]); o.E(15, 9, 5, 4, V[2]); o.E(14, 8, 3, 2, V[3]); o.D(6, 9, V[4]); o.D(4, 17, V[3]); o.D(21, 17, V[3]); },
    shuriken: o => { const B = M.bone; for (let i = 0; i < 4; i++) { const a = i * 1.571 + 0.3; o.T([[12 + Math.cos(a) * 11, 12 + Math.sin(a) * 11], [12 + Math.cos(a + 1.1) * 4.5, 12 + Math.sin(a + 1.1) * 4.5], [12 + Math.cos(a - 0.7) * 4.5, 12 + Math.sin(a - 0.7) * 4.5]], B[0]); } for (let i = 0; i < 4; i++) { const a = i * 1.571 + 0.3; o.T([[12 + Math.cos(a) * 9.5, 12 + Math.sin(a) * 9.5], [12 + Math.cos(a + 0.9) * 4, 12 + Math.sin(a + 0.9) * 4], [12 + Math.cos(a - 0.5) * 4, 12 + Math.sin(a - 0.5) * 4]], B[2]); o.L(12 + Math.cos(a) * 4, 12 + Math.sin(a) * 4, 12 + Math.cos(a) * 9, 12 + Math.sin(a) * 9, B[3]); o.D(Math.round(12 + Math.cos(a) * 9), Math.round(12 + Math.sin(a) * 9), B[4]); } o.F(12, 12, 3, B[0]); o.C(12, 12, 2, M.violet[3]); o.D(12, 12, M.violet[1]); },
    inhale: o => { const V = M.violet; o.R(9, 4, 8, 10, M.stone[0]); o.R(10, 5, 6, 8, M.stone[2]); o.R(11, 7, 1, 1, K); o.R(14, 7, 1, 1, K); o.R(12, 11, 3, 1, V[2]); [[2, 6, 8, 10], [2, 18, 8, 14], [22, 6, 17, 10], [22, 18, 17, 14]].forEach(([a, b, c, d]) => { o.L(a, b, c, d, V[2]); o.D(c, d, V[4]); }); o.R(10, 14, 6, 8, M.stone[1]); },
    pnova: o => { const V = M.violet; o.C(12, 12, 9.5, V[1]); o.C(12, 12, 8.5, V[2]); o.C(12, 12, 5, V[3]); o.F(12, 12, 2, V[4]); [[12, 1], [23, 12], [12, 23], [1, 12]].forEach(([x, y]) => o.D(x, y, V[4])); },
    contagion: o => { const V = M.violet, Bl = M.blood; o.F(12, 12, 3.5, Bl[1]); o.C(12, 12, 4.5, V[3]); o.D(11, 11, Bl[3]); [[3, 4], [20, 5], [4, 20], [20, 19]].forEach(([x, y]) => { o.L(12, 12, x, y, V[1]); o.F(x, y, 2, V[2]); o.D(x, y, V[4]); }); },
    rotwall: o => { const V = M.violet; for (let i = 0; i < 5; i++) { const x = 2 + i * 4, h = 6 + (i % 2) * 4; o.R(x, 20 - h, 4, h, V[1]); o.R(x + 1, 21 - h, 2, h - 2, V[2]); o.R(x, 20 - h, 4, 1, V[3]); } o.R(2, 20, 20, 2, V[0]); o.T([[18, 6], [23, 10], [18, 14]], V[3]); o.D(5, 8, V[4]); o.D(13, 5, V[4]); },
    exhale: o => { const V = M.violet; o.R(9, 5, 6, 8, M.stone[0]); o.R(10, 6, 4, 6, M.stone[2]); o.R(11, 8, 1, 1, K); o.R(13, 8, 1, 1, K); o.R(11, 11, 2, 1, V[3]); o.rays(12, 12, 6, 11, 10, V[2], 0.3); o.rays(12, 12, 5, 8, 10, V[3], 0.3); o.C(12, 12, 10.5, V[1]); },
    mstorm: o => { const V = M.violet; for (let i = 0; i < 46; i++) { const a = i * 0.3, r = 1 + i * 0.22; o.D(Math.round(12 + Math.cos(a) * r), Math.round(12 + Math.sin(a) * r), i % 3 === 0 ? V[3] : V[2]); } o.F(12, 12, 1.5, V[4]); o.D(2, 4, V[3]); o.D(21, 20, V[3]); },
    toxic: o => { const V = M.violet, G = M.silver; o.R(9, 1, 6, 2, M.wood[2]); o.R(10, 3, 4, 4, G[1]); o.T([[10, 7], [14, 7], [19, 20], [5, 20]], G[0]); o.T([[11, 8], [13, 8], [17, 19], [7, 19]], G[1]); o.T([[9, 13], [15, 13], [17, 19], [7, 19]], V[2]); o.D(9, 15, V[4]); o.D(12, 11, V[3]); o.R(8, 9, 1, 6, G[3]); },
    ntrap: o => { const B = M.bone, V = M.violet; o.R(8, 9, 8, 8, M.iron[0]); o.R(9, 10, 6, 6, M.iron[2]); o.D(9, 10, M.iron[4]); o.R(10, 17, 4, 3, M.iron[1]); o.rays(12, 13, 4, 10, 8, B[2], 0.4); o.rays(12, 13, 8, 10, 8, B[4], 0.4); o.F(12, 13, 1.5, V[3]); },
    blur: o => { const S = M.stone, V = M.violet; o.R(3, 3, 6, 6, V[1]); o.R(2, 9, 8, 9, V[1]); o.R(3, 18, 2, 4, V[1]); o.R(7, 18, 2, 4, V[1]); o.R(4, 4, 4, 4, V[2]); o.R(3, 10, 6, 7, V[2]); o.R(14, 3, 6, 6, S[0]); o.R(15, 4, 4, 4, S[2]); o.R(13, 9, 8, 9, S[0]); o.R(14, 10, 6, 7, S[2]); o.R(14, 10, 2, 7, S[3]); o.R(14, 18, 2, 4, S[1]); o.R(18, 18, 2, 4, S[1]); o.D(16, 5, K); [[10, 6], [10, 12], [10, 17]].forEach(([x, y]) => o.L(x, y, x + 2, y, V[3])); o.D(21, 2, V[4]); },
    mwake: o => { const I = M.iron, V = M.violet; o.R(11, 1, 2, 5, I[1]); o.R(7, 6, 10, 3, I[0]); o.R(8, 7, 8, 1, I[3]); o.T([[6, 9], [18, 9], [16, 18], [8, 18]], I[0]); o.T([[7, 10], [17, 10], [15, 17], [9, 17]], I[2]); o.R(9, 12, 2, 2, K); o.R(13, 12, 2, 2, K); o.D(9, 12, V[3]); o.D(13, 12, V[3]); o.R(9, 18, 6, 2, I[1]); o.P([[3, 8], [5, 4], [3, 1]], V[2]); o.P([[20, 9], [22, 5], [20, 2]], V[2]); o.D(4, 3, V[4]); },
    haze: o => { const V = M.violet; o.E(12, 13, 10, 7, V[0]); o.E(12, 13, 9, 6, V[1]); for (let i = 0; i < 30; i++) { const a = i * 0.45, r = 0.5 + i * 0.22; o.D(Math.round(12 + Math.cos(a) * r), Math.round(13 + Math.sin(a) * r * 0.7), i % 2 ? V[3] : V[2]); } o.D(12, 13, V[4]); o.R(6, 4, 2, 1, V[3]); o.R(17, 5, 2, 1, V[3]); },
    bmine: o => { const V = M.violet, S = M.sick; o.E(12, 13, 9, 7, V[0]); o.E(12, 13, 8, 6, V[2]); o.E(10, 11, 4, 2.5, V[3]); [[6, 15], [12, 17], [17, 14], [15, 9]].forEach(([x, y]) => { o.F(x, y, 1.5, S[2]); o.D(x, y, S[4]); }); o.R(11, 4, 2, 3, S[1]); o.D(11, 3, S[3]); o.D(8, 18, V[1]); },
    mirage: o => { const V = M.violet; for (let y = 4; y <= 20; y += 4) for (let x = 2; x < 22; x++) o.D(x, y + Math.round(Math.sin(x * 0.8 + y) * 1.5), V[2]); o.fig(10, 6, [V[0], V[1], V[2], V[3], V[4]]); o.D(3, 3, V[4]); o.D(21, 21, V[4]); },
    lure: o => { const B = M.bone, Wd = M.wood, V = M.violet; o.R(10, 8, 4, 12, Wd[0]); o.R(11, 9, 2, 10, Wd[3]); o.R(11, 13, 2, 1, Wd[0]); o.skull(9, 1, B); o.R(8, 20, 8, 2, B[2]); o.A(12, 12, 8, -0.8, 0.8, V[3]); o.A(12, 12, 11, -0.6, 0.6, V[2]); o.A(12, 12, 8, 2.3, 3.9, V[3]); o.A(12, 12, 11, 2.5, 3.7, V[2]); },
    warp: o => { const V = M.violet; o.E(12, 13, 9, 6, V[0]); o.E(12, 13, 8, 5, V[2]); o.E(9, 11, 3, 2, V[3]); o.P([[4, 13], [7, 10], [10, 15], [13, 10], [16, 15], [19, 11]], V[0]); o.P([[5, 13], [8, 10], [11, 15], [14, 10], [17, 15], [20, 11]], V[4]); o.D(3, 5, V[3]); o.D(21, 4, V[3]); },
    sister: o => { const S = M.stone, V = M.violet; o.R(11, 2, 2, 20, V[1]); o.R(11, 3, 1, 18, V[3]); o.R(3, 3, 6, 6, S[0]); o.R(4, 4, 4, 4, S[2]); o.R(2, 9, 8, 9, S[0]); o.R(3, 10, 6, 7, S[2]); o.R(3, 10, 2, 7, S[3]); o.R(15, 3, 6, 6, V[0]); o.R(16, 4, 4, 4, V[2]); o.R(14, 9, 8, 9, V[0]); o.R(15, 10, 6, 7, V[2]); o.R(19, 10, 2, 7, V[3]); o.D(5, 5, K); o.D(18, 5, V[4]); o.R(3, 18, 2, 4, S[1]); o.R(7, 18, 2, 4, S[1]); o.R(15, 18, 2, 4, V[1]); o.R(19, 18, 2, 4, V[1]); },
    unseen: o => { const V = M.violet; o.A(12, 12, 9, 3.4, 6.0, V[2]); o.A(12, 12, 8, 3.4, 6.0, V[1]); o.A(12, 10, 9, 0.3, 2.8, V[3]); for (let i = 0; i < 5; i++) o.L(5 + i * 3.5, 15, 4 + i * 3.5, 19, V[2]); o.D(12, 3, V[4]); o.E(12, 12, 3, 2, V[0]); },
    rarc: o => { const B = M.bone, V = M.violet; o.A(6, 12, 12, -1.3, 1.3, V[1]); o.A(6, 12, 11, -1.3, 1.3, V[3]); o.A(6, 12, 9, -1.1, 1.1, B[3]); o.A(6, 12, 8, -1.0, 1.0, B[4]); o.R(2, 9, 4, 6, M.stone[1]); o.R(3, 10, 2, 4, M.stone[3]); o.D(18, 4, V[4]); o.D(18, 20, V[4]); },
    gstrike: o => { const B = M.bone, V = M.violet; o.skull(3, 2, [B[0], B[1], '#d8d0c8', B[3], WH]); for (let i = 0; i < 3; i++) { o.LW(8 + i * 3, 22, 16 + i * 3, 10, 2, B[0]); o.L(8 + i * 3, 22, 16 + i * 3, 10, B[3]); o.D(16 + i * 3, 10, B[4]); } o.D(6, 11, V[3]); o.D(4, 13, V[2]); },
    thrust: o => { const B = M.bone; o.R(2, 8, 6, 8, M.stone[1]); o.R(3, 9, 4, 6, M.stone[3]); for (let i = 0; i < 2; i++) { const y = 10 + i * 4; o.LW(8, y, 21, y - 1, 2, B[0]); o.L(8, y, 21, y - 1, B[3]); o.D(21, y - 1, WH); } o.P([[11, 5], [15, 5]], B[3]); o.P([[11, 18], [15, 18]], B[3]); o.D(22, 10, M.violet[3]); },
    talon: o => { const B = M.bone, V = M.violet; o.A(9, 14, 10, 3.6, 6.0, V[2]); o.A(9, 14, 9, 3.7, 5.9, V[3]); o.R(3, 12, 6, 9, M.stone[0]); o.R(4, 13, 4, 7, M.stone[2]); o.R(4, 13, 4, 1, M.stone[3]); o.R(8, 15, 6, 4, M.stone[0]); o.R(9, 16, 5, 2, M.stone[2]); for (let i = 0; i < 3; i++) { o.LW(14, 16 + i, 21, 10 + i * 3, 1, B[0]); o.L(14, 16 + i, 20, 11 + i * 3, B[3]); o.D(21, 10 + i * 3, B[4]); } o.D(4, 4, V[4]); },
    dstep: o => { const V = M.violet, S = M.stone; o.fig(16, 4, S); o.LW(2, 20, 15, 10, 3, V[1]); o.L(2, 20, 15, 10, V[3]); [[5, 6], [9, 18], [20, 18]].forEach(([x, y]) => { o.F(x, y, 2, M.blood[1]); o.L(x - 2, y + 2, x + 2, y - 2, M.bone[3]); }); o.D(2, 20, V[4]); },
    reap: o => { const B = M.bone, V = M.violet; o.C(12, 12, 9.5, V[1]); o.C(12, 12, 9, B[2]); o.C(12, 12, 8, B[3]); o.R(10, 8, 4, 8, M.stone[1]); o.R(11, 9, 2, 6, M.stone[3]); [[3, 3], [21, 3], [3, 21], [21, 21]].forEach(([x, y]) => { o.R(x - 1, y - 1, 3, 3, B[3]); o.D(x, y, K); }); o.D(12, 1, V[4]); },
    flurry: o => { const B = M.bone, V = M.violet; for (let i = 0; i < 5; i++) { const x = 3 + i * 4; o.LW(x, 21, x + 4, 5, 2, B[0]); o.L(x, 21, x + 4, 5, i % 2 ? B[3] : B[4]); } o.F(18, 16, 2, M.blood[1]); o.D(3, 3, V[4]); o.D(21, 20, V[4]); },
    dhead: o => { const B = ['#1a1a20', '#8a8a98', '#e0dce0', '#f4f4f8', WH]; o.R(5, 3, 14, 11, B[0]); o.R(6, 4, 12, 9, B[2]); o.R(6, 4, 12, 1, B[3]); o.R(8, 7, 3, 3, K); o.R(13, 7, 3, 3, K); o.D(9, 8, M.violet[3]); o.D(14, 8, M.violet[3]); o.R(11, 11, 2, 2, B[0]); o.R(8, 14, 8, 6, B[0]); o.R(9, 15, 6, 4, B[2]); [[10, 15], [12, 15], [14, 15], [10, 18], [13, 18]].forEach(([x, y]) => o.D(x, y, K)); o.D(6, 4, WH); },
    execute: o => { const B = M.bone, V = M.violet; o.fig(9, 12, M.stone); o.T([[12, 1], [14, 1], [13, 12], [13, 12]], B[0]); o.LW(12, 1, 12, 11, 3, B[0]); o.L(12, 1, 12, 11, B[3]); o.D(12, 1, B[4]); o.R(10, 10, 5, 2, M.iron[2]); o.rays(12, 14, 4, 7, 6, V[3], 0.5); o.F(4, 18, 1.8, M.blood[2]); o.F(19, 19, 1.5, M.blood[2]); },
    deathm: o => { const B = M.bone, V = M.violet; for (let i = 0; i < 3; i++) { o.LW(3, 5 + i * 5, 21, 8 + i * 5, 2, B[0]); o.L(3, 5 + i * 5, 21, 8 + i * 5, B[3]); o.LW(21, 5 + i * 5, 3, 8 + i * 5, 2, B[0]); o.L(21, 5 + i * 5, 3, 8 + i * 5, B[2]); } o.F(12, 12, 2.5, V[2]); o.D(11, 11, V[4]); },
    // ================= KUSHO (monk): Radiance (gold suns and hands), Absence (black and grey), Destroyer (stone)
    kdawn: o => { const G = M.gold, A = M.amber; o.F(12, 7, 5, A[3]); o.F(12, 7, 3, A[4]); o.rays(12, 7, 6, 9, 8, A[2], 0.39); o.hand(7, 9, G); },
    kamber: o => { const A = M.amber; o.fig(10, 7, M.gold); o.C(12, 12, 9, A[1]); o.C(12, 12, 8, A[2]); for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + 0.3; o.T([[12 + Math.cos(a) * 8, 12 + Math.sin(a) * 8], [12 + Math.cos(a + 0.25) * 9, 12 + Math.sin(a + 0.25) * 9], [12 + Math.cos(a + 0.1) * 12, 12 + Math.sin(a + 0.1) * 12]], i % 2 ? A[3] : A[4]); } },
    khands: o => { const G = M.gold; o.hand(1, 9, [G[0], G[1], G[1], G[2], G[3]]); o.hand(13, 9, [G[0], G[1], G[1], G[2], G[3]]); o.hand(7, 3, G); o.D(3, 2, G[4]); o.D(20, 2, G[4]); o.D(12, 22, G[4]); },
    klaugh: o => { const G = M.gold, Wt = M.white; o.E(12, 14, 9, 7, G[0]); o.E(12, 14, 8, 6, G[2]); o.E(11, 11, 4, 2, G[3]); o.D(9, 12, G[4]); o.R(8, 4, 8, 6, G[0]); o.R(9, 5, 6, 4, G[2]); o.R(10, 7, 4, 1, K); o.D(10, 6, K); o.D(13, 6, K); o.C(12, 13, 11, Wt[3]); o.D(1, 13, WH); o.D(23, 13, WH); },
    kstar: o => { const A = M.amber, G = M.gold; o.R(2, 8, 6, 8, G[0]); o.R(3, 9, 4, 6, G[2]); o.D(4, 11, K); o.R(5, 13, 2, 1, A[2]); o.T([[7, 12], [22, 3], [22, 21]], A[1]); o.T([[8, 12], [21, 5], [21, 19]], A[2]); o.T([[9, 12], [20, 8], [20, 16]], A[3]); o.X(19, 12, A[4], WH); o.D(15, 9, A[4]); },
    kfist: o => { const G = M.gold, A = M.amber; o.R(6, 1, 12, 6, G[0]); o.R(7, 2, 10, 4, G[2]); o.R(7, 2, 10, 1, G[3]); o.R(5, 6, 14, 8, G[0]); o.R(6, 7, 12, 6, G[2]); for (let i = 0; i < 4; i++) o.R(7 + i * 3, 7, 1, 6, G[1]); o.R(17, 8, 2, 4, G[3]); o.D(6, 7, G[4]); o.R(2, 20, 20, 2, M.stone[1]); o.rays(12, 18, 3, 6, 6, A[3], 0.2); o.P([[3, 17], [6, 19]], A[3]); o.P([[21, 17], [18, 19]], A[3]); },
    ksutra: o => { const A = M.amber, B = M.bone; o.C(12, 12, 9, A[2]); for (let i = 0; i < 5; i++) { const a = -1.57 + i * 1.256, x = 12 + Math.cos(a) * 9, y = 12 + Math.sin(a) * 9; o.R(x - 1, y - 3, 3, 6, B[0]); o.R(x, y - 2, 1, 4, B[3]); o.D(x, y - 1, M.blood[2]); o.D(x, y + 1, M.blood[2]); } o.F(12, 12, 2, A[4]); },
    ktears: o => { const A = M.amber, G = M.gold; o.R(8, 2, 8, 7, G[0]); o.R(9, 3, 6, 5, G[2]); o.D(10, 5, K); o.D(13, 5, K); [[6, 10], [16, 10], [4, 16], [12, 14], [19, 17], [9, 19]].forEach(([x, y]) => { o.drop(x, y, A); o.D(x, y + 1, A[4]); }); o.rays(9, 20, 2, 4, 6, A[3]); },
    keye: o => { const G = M.gold, Wt = M.white; o.R(3, 7, 12, 12, G[0]); o.R(4, 8, 10, 10, G[2]); o.R(4, 8, 10, 1, G[3]); o.R(6, 14, 2, 2, K); o.R(10, 14, 2, 2, K); o.E(9, 11, 2.5, 1.5, Wt[3]); o.D(9, 11, K); o.LW(11, 11, 23, 3, 3, Wt[1]); o.LW(11, 11, 23, 3, 1, WH); o.X(22, 3, Wt[3], WH); o.R(6, 19, 6, 3, G[1]); },
    kbell: o => { const G = M.gold, A = M.amber; o.R(11, 1, 2, 3, G[1]); o.T([[9, 4], [15, 4], [17, 14], [20, 18], [4, 18], [7, 14]], G[0]); o.T([[10, 5], [14, 5], [16, 14], [18, 17], [6, 17], [8, 14]], G[2]); o.R(10, 6, 1, 8, G[4]); o.R(11, 6, 3, 1, G[3]); o.R(10, 19, 4, 2, G[1]); o.A(12, 12, 11, 2.3, 3.9, A[3]); o.A(12, 12, 11, -0.8, 0.8, A[3]); },
    klotus: o => { const A = M.amber, G = M.gold; for (let i = 0; i < 24; i++) { const a = i * 0.5, r = 3 + i * 0.35; o.D(Math.round(12 + Math.cos(a) * r), Math.round(12 + Math.sin(a) * r), A[2]); } o.T([[6, 20], [18, 20], [12, 12]], G[0]); o.T([[7, 19], [17, 19], [12, 14]], G[2]); o.T([[9, 14], [15, 14], [12, 8]], G[1]); o.T([[10, 14], [14, 14], [12, 10]], G[3]); o.D(12, 11, G[4]); },
    ksun: o => { const A = M.amber; o.F(12, 12, 7.5, A[1]); o.F(12, 12, 6.5, A[2]); o.F(12, 12, 4.5, A[3]); o.F(11, 11, 2, A[4]); o.rays(12, 12, 8, 11, 12, A[2], 0.2); o.rays(12, 12, 8, 10, 12, A[3], 0.46); o.fig(10, 8, M.gold); },
    keclipse: o => { const Pt = M.pitch, A = M.amber; o.F(12, 12, 9, A[3]); o.C(12, 12, 9.5, A[2]); o.rays(12, 12, 10, 12, 12, A[2], 0.2); o.F(12, 12, 7.5, Pt[0]); o.F(12, 12, 6.5, Pt[1]); o.A(12, 12, 6, 2.5, 4.5, Pt[3]); o.hand(8, 6, [Pt[0], Pt[1], Pt[2], Pt[3], Pt[4]]); },
    kpalm: o => { const G = M.gold, Pt = M.pitch; o.hand(7, 6, G); o.F(11.5, 14, 3.5, Pt[0]); o.C(11.5, 14, 4, Pt[3]); o.C(11.5, 14, 5.5, M.violet[1]); o.D(9, 12, Pt[4]); [[3, 4], [20, 5], [4, 21], [20, 20]].forEach(([x, y]) => { o.L(x, y, 11.5 + (x - 11.5) * 0.4, 14 + (y - 14) * 0.4, M.violet[1]); o.D(x, y, M.violet[3]); }); },
    kclap: o => { const G = M.gold; o.C(12, 12, 10, M.violet[1]); o.C(12, 12, 8.5, M.white[2]); o.R(4, 6, 5, 12, G[0]); o.R(5, 7, 3, 10, G[2]); o.R(5, 7, 3, 1, G[3]); o.R(15, 6, 5, 12, G[0]); o.R(16, 7, 3, 10, G[2]); o.R(16, 7, 3, 1, G[3]); o.rays(12, 12, 1, 4, 6, WH, 0.5); o.D(5, 7, G[4]); o.D(16, 7, G[4]); },
    kbowl: o => { const Wd = M.wood, Pt = M.pitch; o.T([[3, 9], [21, 9], [18, 19], [6, 19]], Wd[0]); o.T([[4, 10], [20, 10], [17, 18], [7, 18]], Wd[2]); o.E(12, 9, 9, 2.5, Wd[0]); o.E(12, 9, 8, 1.5, Pt[1]); o.R(5, 11, 1, 5, Wd[3]); o.R(9, 20, 6, 2, Wd[1]); o.P([[2, 3], [7, 8]], M.aether[3]); o.D(2, 3, WH); o.P([[21, 2], [16, 8]], M.blood[3]); o.D(21, 2, M.blood[4]); },
    kspade: o => { const I = M.iron, Pt = M.pitch; o.LW(3, 21, 11, 10, 2, M.wood[1]); o.L(3, 21, 11, 10, M.wood[3]); o.T([[9, 9], [15, 2], [21, 5], [16, 12]], I[0]); o.T([[10, 9], [15, 4], [19, 6], [15, 11]], I[2]); o.L(11, 8, 16, 4, I[4]); o.E(14, 19, 7, 2.5, Pt[0]); o.E(14, 19, 5, 1.5, Pt[2]); o.P([[18, 15], [21, 20]], Pt[3]); },
    kpinch: o => { const G = M.gold, Wt = M.white; o.R(3, 12, 5, 9, G[0]); o.R(4, 13, 3, 7, G[2]); o.L(6, 12, 11, 7, G[0]); o.L(7, 12, 11, 8, G[0]); o.L(6, 13, 11, 9, G[3]); o.L(6, 16, 11, 11, G[0]); o.L(6, 17, 11, 12, G[3]); o.D(11, 9, G[4]); o.P([[13, 8], [15, 4], [19, 3]], Wt[2]); o.P([[13, 11], [16, 14], [20, 15]], Wt[2]); o.P([[19, 3], [21, 1]], Wt[1]); o.D(12, 9, WH); o.fig(17, 16, M.stone); },
    kbelow: o => { const Pt = M.pitch, S = M.stone; o.R(2, 20, 20, 2, S[1]); o.R(2, 20, 20, 1, S[2]); o.R(7, 12, 10, 8, Pt[3]); o.R(8, 13, 8, 7, Pt[1]); o.R(8, 13, 8, 1, Pt[4]); [[5, 2, 7], [8, 0, 9], [11, 1, 8], [14, 0, 9], [17, 3, 6]].forEach(([x, y, h]) => { o.R(x - 1, y + 3, 4, h + 3, Pt[3]); o.R(x, y + 4, 2, h + 2, Pt[1]); o.D(x, y + 4, Pt[4]); }); o.R(2, 10, 6, 4, Pt[3]); o.R(3, 11, 4, 2, Pt[1]); o.D(9, 15, Pt[4]); o.fig(19, 8, S); },
    kspit: o => { const Pt = M.pitch, S = M.stone; o.R(2, 8, 20, 3, S[1]); o.R(2, 8, 20, 1, S[3]); o.drop(12, 2, M.white); const roots = [[[12, 11], [8, 15], [4, 21]], [[12, 11], [11, 17], [9, 23]], [[12, 11], [15, 16], [19, 22]], [[12, 11], [17, 13], [22, 16]]]; roots.forEach(r => { o.LW(r[0][0], r[0][1], r[1][0], r[1][1], 4, Pt[3]); o.LW(r[1][0], r[1][1], r[2][0], r[2][1], 3, Pt[3]); }); roots.forEach(r => { o.LW(r[0][0], r[0][1], r[1][0], r[1][1], 2, Pt[1]); o.L(r[1][0], r[1][1], r[2][0], r[2][1], Pt[1]); }); o.D(12, 11, Pt[4]); o.D(8, 15, Pt[4]); },
    kwalk: o => { const Pt = M.pitch, G = M.gold; o.R(6, 4, 5, 8, G[0]); o.R(7, 5, 3, 6, G[2]); o.R(13, 3, 5, 8, G[0]); o.R(14, 4, 3, 6, G[2]); o.R(7, 12, 4, 2, Pt[0]); o.R(14, 11, 4, 2, Pt[0]); for (let i = 0; i < 3; i++) o.A(12, 20 - i * 2, 4 + i * 4, 3.4, 6.0, i ? Pt[3] : Pt[4]); o.R(2, 20, 20, 2, Pt[0]); },
    kmirror: o => { const Pt = M.pitch; o.R(6, 2, 12, 18, Pt[3]); o.R(7, 3, 10, 16, Pt[0]); o.R(8, 4, 8, 14, Pt[1]); o.L(8, 17, 15, 4, Pt[2]); o.D(9, 5, Pt[4]); o.R(11, 20, 2, 2, Pt[3]); o.R(9, 22, 6, 1, Pt[3]); o.F(20, 10, 1.6, M.blood[2]); o.T([[18, 10], [16, 8], [16, 12]], M.blood[1]); },
    knothing: o => { const A = M.ash; o.C(12, 12, 9, A[3]); o.C(12, 12, 8, A[1]); o.rays(12, 12, 9.5, 11, 8, A[2]); o.D(11, 11, A[4]); o.D(13, 13, A[2]); },
    kbar: o => { const S = M.stone; o.R(3, 4, 18, 18, S[0]); [[4, 5, 16, 3], [4, 9, 16, 4], [4, 14, 16, 3], [4, 18, 16, 3]].forEach(([x, y, w, h], i) => { o.R(x, y, w, h, S[2]); o.R(x, y, w, 1, S[3]); for (let k = 0; k < 3; k++) o.R(x + 4 + k * 5 + (i % 2) * 2, y, 1, h, S[0]); }); o.R(2, 2, 3, 3, S[1]); o.R(8, 2, 3, 3, S[1]); o.R(13, 2, 3, 3, S[1]); o.R(19, 2, 3, 3, S[1]); o.R(10, 13, 4, 9, K); o.R(10, 13, 4, 1, S[1]); o.D(5, 6, S[4]); },
    kgrip: o => { const S = M.stone, A = M.ash; o.R(6, 9, 12, 10, A[0]); o.R(7, 10, 10, 8, S[2]); o.R(7, 10, 10, 1, S[3]); for (let i = 0; i < 4; i++) { o.R(6 + i * 3, 3, 2, 8, A[0]); o.R(6 + i * 3, 4, 1, 6, S[3]); } o.R(4, 12, 2, 5, A[0]); o.D(4, 13, S[3]); o.fig(10, 12, S); o.drop(12, 20, M.aether); o.D(8, 11, S[4]); },
    kfinger: o => { const G = M.gold, A = M.amber; o.R(7, 12, 10, 9, G[0]); o.R(8, 13, 8, 7, G[2]); o.R(8, 13, 8, 1, G[3]); o.R(10, 2, 3, 11, G[0]); o.R(11, 3, 1, 9, G[3]); o.D(11, 3, G[4]); o.R(15, 14, 2, 5, G[1]); o.rays(11, 2, 3, 6, 6, A[3], 0.5); o.X(11, 0, A[4], WH); o.R(4, 15, 3, 4, G[0]); o.D(5, 16, G[2]); },
    kobsid: o => { const Pt = ['#000000', '#101018', '#1c1c28', '#303040', '#8080b0']; o.T([[12, 2], [20, 8], [18, 20], [6, 20], [4, 8]], Pt[0]); o.T([[12, 3], [19, 8], [17, 19], [7, 19], [5, 8]], Pt[2]); o.T([[12, 3], [19, 8], [12, 12]], Pt[3]); o.R(8, 10, 3, 2, Pt[0]); o.R(13, 10, 3, 2, Pt[0]); o.D(9, 10, M.amber[3]); o.D(14, 10, M.amber[3]); o.L(6, 8, 11, 4, Pt[4]); o.D(7, 7, WH); o.R(10, 16, 4, 1, Pt[0]); },
    kmount: o => { const S = M.stone, G = M.gold; o.T([[2, 20], [8, 8], [12, 13], [17, 5], [22, 20]], S[0]); o.T([[4, 19], [8, 10], [12, 15], [17, 7], [20, 19]], S[2]); o.T([[16, 8], [17, 7], [19, 12]], S[4]); o.R(2, 20, 20, 2, S[1]); o.E(12, 5, 4, 3, G[0]); o.E(12, 5, 3, 2, G[2]); o.D(11, 4, G[4]); o.P([[6, 3], [8, 5]], G[3]); o.P([[18, 2], [16, 4]], G[3]); },
    kstep: o => { const S = M.stone; o.R(2, 20, 20, 2, S[1]); [[3, 12], [7, 8], [11, 5], [15, 8], [19, 12]].forEach(([x, y]) => { o.T([[x - 2, 20], [x, y], [x + 2, 20]], S[0]); o.L(x, y + 2, x, 19, S[3]); o.D(x, y + 1, S[4]); }); o.R(10, 21, 5, 2, M.gold[1]); o.D(11, 21, M.gold[3]); },
    kpagoda: o => { const S = M.stone; [[2, 6], [4, 11], [6, 16]].forEach(([x, y], i) => { o.T([[x, y + 2], [12, y - 3], [24 - x, y + 2]], S[0]); o.T([[x + 1, y + 2], [12, y - 1], [23 - x, y + 2]], S[3]); o.R(x + 4, y + 2, 16 - x * 2, 3, S[0]); o.R(x + 5, y + 3, 14 - x * 2, 1, S[2]); }); o.R(11, 0, 2, 4, S[3]); o.R(8, 19, 8, 3, S[0]); o.R(9, 20, 6, 1, S[2]); o.R(11, 8, 2, 2, K); o.R(10, 13, 4, 2, K); o.D(11, 13, M.blood[3]); },
    kweep: o => { const S = M.stone, A = M.aether; o.R(8, 3, 8, 7, S[0]); o.R(9, 4, 6, 5, S[2]); o.R(9, 4, 6, 1, S[3]); o.R(6, 10, 12, 12, S[0]); o.R(7, 11, 10, 10, S[2]); o.R(7, 11, 10, 1, S[3]); o.R(10, 6, 1, 1, K); o.R(13, 6, 1, 1, K); [[10, 8], [13, 8], [10, 12], [13, 13]].forEach(([x, y]) => o.D(x, y, A[3])); [[2, 5], [2, 10], [2, 15]].forEach(([x, y]) => { o.R(x, y, 4, 2, S[1]); o.D(x, y, S[3]); }); [[18, 5], [18, 10], [18, 15]].forEach(([x, y]) => { o.R(x, y, 4, 2, S[1]); o.D(x + 3, y, S[3]); }); o.D(9, 12, S[4]); },
    kthousand: o => { const G = M.gold, S = M.stone; for (let i = 0; i < 9; i++) { const a = 3.3 + i * 0.35, m = i % 2 ? G : S; o.L(12, 20, 12 + Math.cos(a) * 11, 20 + Math.sin(a) * 11, m[2]); o.R(Math.round(12 + Math.cos(a) * 11) - 1, Math.round(20 + Math.sin(a) * 11) - 1, 2, 2, m[3]); } o.R(9, 13, 6, 9, G[0]); o.R(10, 14, 4, 7, G[2]); o.R(10, 14, 4, 1, G[3]); o.R(10, 9, 4, 4, G[0]); o.R(11, 10, 2, 2, G[3]); },
  };

  // ---- icon cache: one 24x24 canvas per skill and state. Unlearned icons are washed out, locked ones dark and stamped.
  const IC = {};
  function iconCanvas(id, state) {
    const key = id + '|' + state; if (IC[key]) return IC[key];
    if (!ICON[id]) return null;
    const c = mkCanvas(24, 24), q = c.getContext('2d'); q.imageSmoothingEnabled = false;
    const o = PX(q); ICON[id](o);
    if (state !== 'lit') {
      const im = q.getImageData(0, 0, 24, 24), d = im.data, sat = state === 'dim' ? 0.5 : 0.15, br = state === 'dim' ? 0.82 : 0.46;
      for (let i = 0; i < d.length; i += 4) { if (!d[i + 3]) continue; const g = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; d[i] = (g + (d[i] - g) * sat) * br; d[i + 1] = (g + (d[i + 1] - g) * sat) * br; d[i + 2] = (g + (d[i + 2] - g) * sat) * br + (state === 'lock' ? 6 : 0); }
      q.putImageData(im, 0, 0);
      if (state === 'lock') lockStamp(o);
    }
    IC[key] = c; return c;
  }
  const _skillIcon0 = skillIcon;
  // the carved cell an icon sits in: a recess in the page, a glow when learned, a gold rim when a point can go in
  function iconCell(x, y, id, state, col, canAdd) {
    ctx.fillStyle = '#050407'; ctx.fillRect(x - 1, y - 1, 26, 26);
    ctx.fillStyle = state === 'lock' ? '#0c0a0e' : '#120f14'; ctx.fillRect(x, y, 24, 24);
    ctx.fillStyle = '#08070a'; ctx.fillRect(x, y, 24, 1); ctx.fillRect(x, y, 1, 24);
    ctx.fillStyle = state === 'lock' ? '#1c1820' : '#2a2530'; ctx.fillRect(x, y + 23, 24, 1); ctx.fillRect(x + 23, y, 1, 24);
    if (state === 'lit') { const g = ctx.createRadialGradient(x + 12, y + 12, 2, x + 12, y + 12, 13); g.addColorStop(0, rgba(col, 0.32)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(x + 1, y + 1, 22, 22); }
    const c = iconCanvas(id, state);
    if (c) ctx.drawImage(c, x, y);
    else { if (state !== 'lit') ctx.globalAlpha = state === 'dim' ? 0.6 : 0.3; _skillIcon0(id, x + 3, y + 3, state === 'lit'); ctx.globalAlpha = 1; }
    if (canAdd) { const k = 0.6 + 0.4 * Math.sin(G.time * 5); ctx.strokeStyle = rgba('#d9a441', k); ctx.strokeRect(x - 0.5, y - 0.5, 25, 25); ctx.fillStyle = '#f0d080'; for (const [a, b] of [[x - 1, y - 1], [x + 23, y - 1], [x - 1, y + 23], [x + 23, y + 23]]) ctx.fillRect(a, b, 2, 2); }
    else if (state === 'lit') { ctx.strokeStyle = rgba(col, 0.45); ctx.strokeRect(x - 0.5, y - 0.5, 25, 25); }
  }

  // ---- the page: dark vellum in a carved stone frame, corner rosettes in the class colour. Cached per size and tint.
  const PG = {};
  function pageBg(p, tint) {
    const key = p.w + 'x' + p.h + tint; let c = PG[key];
    if (!c) {
      c = mkCanvas(p.w, p.h); const x = c.getContext('2d'), w = p.w, h = p.h, im = x.createImageData(w, h), d = im.data, [tr, tg, tb] = hexRgb(tint);
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const n = hash(i * 7 + 3, j * 11 + 5), m = hash(i >> 3, j >> 3), s = hash((i + 9) >> 5, (j + 4) >> 5), e = Math.min(i, j, w - 1 - i, h - 1 - j);
        const vig = e < 30 ? 0.62 + e * 0.0127 : 1, fib = hash(i, j >> 1) > 0.965 ? 1.14 : 1;
        const k = (0.9 + (m - 0.5) * 0.18 + (s > 0.78 ? -0.11 : 0) + (n > 0.94 ? 0.08 : n < 0.05 ? -0.08 : 0)) * vig * fib;
        const q = (j * w + i) * 4; d[q] = 58 * k; d[q + 1] = 48 * k; d[q + 2] = 38 * k; d[q + 3] = 255;
      }
      x.putImageData(im, 0, 0);
      // the frame: black edge, a bevel, a band of stone with the class colour inlaid, a seam
      const band = (i, col) => { x.fillStyle = col; x.fillRect(i, i, w - 2 * i, 1); x.fillRect(i, h - 1 - i, w - 2 * i, 1); x.fillRect(i, i, 1, h - 2 * i); x.fillRect(w - 1 - i, i, 1, h - 2 * i); };
      band(0, '#050407'); band(1, '#3a3544'); band(2, '#2e2a38'); band(3, '#2e2a38'); band(4, '#2e2a38'); band(5, '#221e2a'); band(6, '#0a090d');
      x.fillStyle = '#5a5468'; x.fillRect(1, 1, w - 2, 1); x.fillRect(1, 1, 1, h - 2);
      x.fillStyle = `rgba(${tr},${tg},${tb},0.55)`; x.fillRect(3, 3, w - 6, 1); x.fillRect(3, h - 4, w - 6, 1); x.fillRect(3, 3, 1, h - 6); x.fillRect(w - 4, 3, 1, h - 6);
      for (let i = 0; i < w; i += 3) for (const jj of [2, 4]) if (hash(i, jj) > 0.5) { x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(i, jj, 1, 1); x.fillRect(jj, i, 1, 1); x.fillRect(i, h - 1 - jj, 1, 1); x.fillRect(w - 1 - jj, i, 1, 1); }
      // rivets along the band
      for (let i = 22; i < w - 22; i += 24) for (const yy of [2, h - 5]) { x.fillStyle = '#0a090d'; x.fillRect(i, yy, 3, 3); x.fillStyle = '#7a7688'; x.fillRect(i, yy, 2, 2); x.fillStyle = '#b8b4c4'; x.fillRect(i, yy, 1, 1); }
      for (let j = 22; j < h - 22; j += 24) for (const xx of [2, w - 5]) { x.fillStyle = '#0a090d'; x.fillRect(xx, j, 3, 3); x.fillStyle = '#7a7688'; x.fillRect(xx, j, 2, 2); x.fillStyle = '#b8b4c4'; x.fillRect(xx, j, 1, 1); }
      // corner rosettes: a carved plate, a diamond of the class colour, a bone stud at the centre
      for (const [cx, cy] of [[0, 0], [w - 15, 0], [0, h - 15], [w - 15, h - 15]]) {
        x.fillStyle = '#050407'; x.fillRect(cx, cy, 15, 15); x.fillStyle = '#3a3544'; x.fillRect(cx + 1, cy + 1, 13, 13); x.fillStyle = '#5a5468'; x.fillRect(cx + 1, cy + 1, 13, 1); x.fillRect(cx + 1, cy + 1, 1, 13); x.fillStyle = '#221e2a'; x.fillRect(cx + 1, cy + 13, 13, 1); x.fillRect(cx + 13, cy + 1, 1, 13);
        x.fillStyle = '#0a090d'; for (let k = 0; k < 6; k++) { x.fillRect(cx + 7 - k, cy + 2 + k, 1 + 2 * k, 1); x.fillRect(cx + 7 - k, cy + 12 - k, 1 + 2 * k, 1); }
        x.fillStyle = `rgba(${tr},${tg},${tb},0.85)`; for (let k = 0; k < 4; k++) { x.fillRect(cx + 7 - k, cy + 4 + k, 1 + 2 * k, 1); x.fillRect(cx + 7 - k, cy + 10 - k, 1 + 2 * k, 1); }
        x.fillStyle = '#e8e2d0'; x.fillRect(cx + 6, cy + 6, 3, 3); x.fillStyle = '#ffffff'; x.fillRect(cx + 6, cy + 6, 1, 1); x.fillStyle = '#0a090d'; x.fillRect(cx + 8, cy + 8, 1, 1);
        x.fillStyle = '#8a8698'; for (const [a, b] of [[2, 2], [12, 2], [2, 12], [12, 12]]) x.fillRect(cx + a, cy + b, 1, 1);
      }
      PG[key] = c;
    }
    ctx.drawImage(c, p.x, p.y);
  }
  // an engraved rule: a dark groove with a lit lower edge, a diamond at each end
  function rule(x, y, w, col) {
    ctx.fillStyle = '#0a090d'; ctx.fillRect(x, y, w, 1); ctx.fillStyle = rgba(col, 0.5); ctx.fillRect(x, y + 1, w, 1);
    ctx.fillStyle = col; ctx.fillRect(x - 2, y - 1, 3, 3); ctx.fillRect(x + w - 1, y - 1, 3, 3); ctx.fillStyle = '#0a090d'; ctx.fillRect(x - 1, y, 1, 1); ctx.fillRect(x + w, y, 1, 1);
  }
  // an inset field on the page (the tree area, a stat row): a recess with a dark top-left seam and a lit bottom-right
  function recess(x, y, w, h, fill) {
    ctx.fillStyle = '#050407'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); ctx.fillStyle = fill || '#1a1518'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#0c0a0e'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillStyle = '#332c34'; ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x + w - 1, y, 1, h);
  }
  // a carved stud: a raised stone button with a bevel
  function stud(x, y, w, h, label, on, col) {
    ctx.fillStyle = '#050407'; ctx.fillRect(x, y, w, h); ctx.fillStyle = on ? '#3a3446' : '#1f1c24'; ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = on ? '#6a6478' : '#2e2a36'; ctx.fillRect(x + 1, y + 1, w - 2, 1); ctx.fillRect(x + 1, y + 1, 1, h - 2);
    ctx.fillStyle = on ? '#15121a' : '#0e0c12'; ctx.fillRect(x + 1, y + h - 2, w - 2, 1); ctx.fillRect(x + w - 2, y + 1, 1, h - 2);
    if (on) { ctx.fillStyle = '#8a8698'; ctx.fillRect(x + 2, y + 2, 1, 1); }
    if (label != null) txt(label, x + w / 2, y + h - 3, on ? (col || '#e8e2d0') : '#5a5563', 'center', false);
  }
  function titleRow(p, title, col) {
    ctx.font = TITLE_FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#0a090d'; ctx.fillText(title, p.x + p.w / 2 + 1, p.y + 19); ctx.fillStyle = col || '#e8e2d0'; ctx.fillText(title, p.x + p.w / 2, p.y + 18);
    const tw0 = Math.min(p.w - 60, ctx.measureText(title).width + 16); rule(Math.round(p.x + p.w / 2 - tw0 / 2), p.y + 23, Math.round(tw0), col || clsCol());
  }
  function closeStud(p, fn) { stud(p.x + p.w - 15, p.y + 4, 12, 12, null, true); txt('x', p.x + p.w - 9, p.y + 13, '#a39d8c', 'center', false); uiButton(p.x + p.w - 14, p.y + 4, 12, 12, fn); }

  // ---- compact tooltips. A skill: name and level, three lines of text, the cost, one "Now:" line, a hint. Shift or
  // the MORE stud adds perks, synergies, the next level and the rest.
  const cut = (s, n) => s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s;
  const descLines = (desc, n = 3, w = 40) => { const L = wrap(desc, w); if (L.length > n) { const out = L.slice(0, n); out[n - 1] = cut(out[n - 1] + ' ' + L[n], w); return out; } return L; };
  const moreOn = () => keys.has('shift') || !!G.tipMore;
  const resName = () => P.cls === 'hemomancer' ? 'Vitae' : P.cls === 'miasmancer' ? 'Miasma' : P.cls === 'ossumancer' ? 'Marrow' : 'Essence';
  function tipSkill(id, full) {
    if (!id || id === 'attack' || !SK[id]) return [['Attack', '#e8e2d0'], ['Strike with your weapon', '#a39d8c']];
    const s = SK[id], l = P.skills[id] || 0, hl = P.hard[id] || 0, ready = skillReady(id), col = tabCol(s.tab);
    const lines = [[s.name + (l ? ` · level ${l}` : ''), col]].concat(descLines(s.desc).map(t => [t, '#a39d8c']));
    if (s.mana) { let c = `${resName()} ${skillCost(id, Math.max(1, l)).toFixed(1)}`; if (s.kind === 'hold') c += id === 'lance' ? '/s' : id === 'colossus' || id === 'host' ? ' per skeleton' : id === 'overcharge' || id === 'condense' ? ' per wisp' : '/s'; if (P.cls === 'hemomancer') c += ` · ${(bloodLifeCost(skillCost(id, Math.max(1, l))) * 100 / Math.max(1, D.maxHp)).toFixed(1)}% life`; if (s.stam) c += ` · poise ${s.stam}`; if (s.shards) c += ` · ${s.shards} shards`; lines.push([c, '#5c86d6']); }
    else if (s.stam || s.shards) lines.push([(s.stam ? `Poise ${s.stam}` : '') + (s.stam && s.shards ? ' · ' : '') + (s.shards ? `${s.shards} shards` : ''), '#d9a441']);
    let info = ''; try { info = skillInfo(id, l || 1) || ''; } catch (e) { info = ''; }
    if (info) lines.push([cut((l ? 'Now: ' : 'Level 1: ') + info, 48), '#8b95ff']);
    if (!ready) lines.push([P.level < s.req ? `Requires level ${s.req}` : `Requires ${SK[s.pre].name}`, '#c8553d']);
    if (!full) { lines.push([G.touch ? 'MORE stud: perks and synergies' : 'shift: perks and synergies', '#5a5563']); return lines; }
    if (l > 0 && hl < 20) { let nx = ''; try { nx = skillInfo(id, l + 1) || ''; } catch (e) { } if (nx) lines.push([cut('Next: ' + nx, 48), '#6f7bd8']); }
    if (l > hl) lines.push([`${hl} points + ${l - hl} from items and Major Arcana`, '#8b95ff']);
    for (const [pi, pk] of (s.perks || []).entries()) { const on = perkOn(id, pi), need = `lv ${pk.l}` + (pk.stat ? ` + ${pk.stat[1]} ${STAT_NAME[pk.stat[0]]}` : ''); lines.push([(on ? '+ ' : '- ') + pk.name + (on ? '' : ` (${need})`), on ? '#d9a441' : '#6f6a79']); lines.push(['   ' + cut(pk.desc, 44), on ? '#a39d8c' : '#5a5563']); }
    for (const q of synLines(id)) lines.push([cut(q[0], 48), q[1]]);
    const how = s.kind === 'weapon' ? (l > 0 ? (P.gweapon === id ? 'Wielded by your golem' : 'Right-click: golem wields it') : 'Learn it to arm your golem') : s.kind === 'cast' || s.kind === 'hold' ? 'Right-click: right skill · shift+right: left · key: bind' : 'Passive';
    lines.push([how, '#5a5563']);
    return lines;
  }
  skillTip = function (id) { return tipSkill(id, moreOn()); };
  const _itemLines = itemLines;
  itemLines = function (it) { const L = _itemLines(it); return L.length > 9 ? L.slice(0, 8).concat([['…', '#6f6a79']]) : L; };
  // the tooltip box: carved, and never taller than three fifths of the screen
  drawTooltip = function () {
    if (!tooltip) return;
    const maxL = Math.floor(H * 0.6 / 10) - 1; let lines = tooltip; if (lines.length > maxL) lines = lines.slice(0, maxL - 1).concat([['…', '#6f6a79']]);
    const w = Math.max(...lines.map(l => tw(l[0]))) + 14, h = lines.length * 10 + 8;
    let x = mouse.x + 10, y = mouse.y + 10;
    if (x + w > W) x = mouse.x - w - 6; if (y + h > HUD_Y) y = HUD_Y - h - 2; if (x < 0) x = 0; if (y < 0) y = 0;
    const qc = lines[0] && lines[0][1] || '#8a6a2a';
    ctx.fillStyle = 'rgba(6,5,9,0.97)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = '#050407'; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1); ctx.strokeStyle = '#4a4458'; ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); ctx.strokeStyle = '#1a1720'; ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    ctx.fillStyle = rgba(qc, 0.7); ctx.fillRect(x + 4, y + 13, w - 8, 1); ctx.fillStyle = qc; ctx.fillRect(x + 4, y + 13, 3, 1); ctx.fillRect(x + w - 7, y + 13, 3, 1);
    ctx.fillStyle = '#8a8698'; for (const [cx, cy] of [[x + 2, y + 2], [x + w - 4, y + 2], [x + 2, y + h - 4], [x + w - 4, y + h - 4]]) { ctx.fillRect(cx, cy, 2, 2); ctx.fillStyle = '#d0ccdc'; ctx.fillRect(cx, cy, 1, 1); ctx.fillStyle = '#8a8698'; }
    lines.forEach((l, i) => txt(l[0], x + w / 2, y + 11 + i * 10 + (i ? 2 : 0), l[1], 'center', false));
  };

  // ---- the skill page
  const arrowPath = (pa, ch) => {
    const px = TREE.col(pa.c), py = TREE.row(pa.r), cx = TREE.col(ch.c), cy = TREE.row(ch.r);
    const between = SK_ORDER.some(id => { const s = SK[id]; return s.cls === ch.cls && s.tab === ch.tab && s.c === ch.c && s.r > pa.r && s.r < ch.r; });
    if (pa.c === ch.c && !between) return { pts: [[px + .5, py + 13], [cx + .5, cy - 14]], head: [[cx - 2.5, cy - 15], [cx + 3.5, cy - 15], [cx + .5, cy - 12]] };
    const gy = py + 15.5, gx = cx + (ch.c > pa.c || ch.c === pa.c ? -20.5 : 20.5);
    if (gx < cx) return { pts: [[px + .5, py + 13], [px + .5, gy], [gx, gy], [gx, cy + .5], [cx - 14, cy + .5]], head: [[cx - 15, cy - 2.5], [cx - 15, cy + 3.5], [cx - 12, cy + .5]] };
    return { pts: [[px + .5, py + 13], [px + .5, gy], [gx, gy], [gx, cy + .5], [cx + 14, cy + .5]], head: [[cx + 15, cy - 2.5], [cx + 15, cy + 3.5], [cx + 12, cy + .5]] };
  };
  const strokePts = (pts, col, wd) => { ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.lineJoin = 'miter'; ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.stroke(); };
  const fillPts = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); pts.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.closePath(); ctx.fill(); };
  treeArrow = function (pa, ch, lit) {
    const { pts, head } = arrowPath(pa, ch), col = tabCol(ch.tab);
    strokePts(pts, '#050407', 3); strokePts(pts.map(([a, b]) => [a, b + 1]), '#3a322e', 1);   // the channel and its lit lower edge
    if (lit) { strokePts(pts, rgba(col, 0.28), 3); strokePts(pts, col, 1); }
    else strokePts(pts, '#1c1618', 1);
    fillPts(head.map(([a, b]) => [a + (a < head[2][0] ? -1 : a > head[2][0] ? 1 : 0), b + (b < head[2][1] ? -1 : b > head[2][1] ? 1 : 0)]), '#050407'); fillPts(head, lit ? col : '#2a2426');
    ctx.lineWidth = 1;
  };
  const ROMAN = ['I', 'VI', 'XII', 'XVIII', 'XXIV', 'XXX'];
  drawSkills = function () {
    const p = LP, col = tabCol(G.tab), names = tabNames();
    pageBg(p, clsCol());
    closeStud(p, () => { G.panels.skills = false; });
    // the header: the tree's name and an engraved rule
    ctx.font = TITLE_FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#0a090d'; ctx.fillText(names[G.tab], 21, 20); ctx.fillStyle = col; ctx.fillText(names[G.tab], 20, 19);
    rule(20, 23, 156, col);
    // the points plate
    stud(182, 8, 44, 28, null, true); txt('POINTS', 204, 17, '#8f8a7c', 'center', false);
    ctx.font = TITLE_FONT; ctx.textAlign = 'center'; ctx.fillStyle = '#0a090d'; ctx.fillText(String(P.skillPts), 205, 34); ctx.fillStyle = P.skillPts ? '#f0d080' : '#6f6a79'; ctx.fillText(String(P.skillPts), 204, 33);
    // the tabs: carved, each in its tree's colour, the open one joined to the page
    names.forEach((name, t) => {
      const y = 44 + t * 46, on = G.tab === t, tc = tabCol(t);
      ctx.fillStyle = '#050407'; ctx.fillRect(182, y, 44, 42);
      ctx.fillStyle = on ? '#2c2632' : '#181419'; ctx.fillRect(183, y + 1, 42, 40);
      ctx.fillStyle = rgba(tc, on ? 0.22 : 0.08); ctx.fillRect(183, y + 1, 42, 40);
      ctx.fillStyle = on ? '#6a6478' : '#2e2a36'; ctx.fillRect(183, y + 1, 42, 1); ctx.fillRect(183, y + 1, 1, 40);
      ctx.fillStyle = '#0e0c12'; ctx.fillRect(183, y + 40, 42, 1); ctx.fillRect(224, y + 1, 1, 40);
      ctx.fillStyle = on ? tc : rgba(tc, 0.35); ctx.fillRect(182, y + 4, 2, 34);   // the spine
      if (on) { ctx.fillStyle = '#1a1518'; ctx.fillRect(178, y + 6, 5, 30); ctx.fillStyle = tc; ctx.fillRect(178, y + 6, 1, 30); }
      ctx.font = TITLE_FONT; if (ctx.measureText(name).width > 40) ctx.font = '12px "IM Fell English SC", Georgia, serif'; if (ctx.measureText(name).width > 40) ctx.font = '10px "IM Fell English SC", Georgia, serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#0a090d'; ctx.fillText(name, 205, y + 21); ctx.fillStyle = on ? tc : '#8f8a7c'; ctx.fillText(name, 204, y + 20);
      let n = 0; for (const id of SK_ORDER) if (SK[id].tab === t && SK[id].cls === P.cls) n += P.hard[id] || 0;
      txt(`${n} pts`, 204, y + 34, on ? '#f0d080' : '#6f6a79', 'center', false);
      uiButton(182, y, 44, 42, () => { G.tab = t; });
    });
    // the tree field, with the tier numerals in the right margin
    recess(8, 27, 170, 193, '#161114');
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let r = 0; r < 6; r++) ctx.fillRect(10, TREE.row(r) + 12, 166, 1);
    ROWREQ.forEach((lv, r) => { const y = TREE.row(r); ctx.fillStyle = rgba(col, 0.3); ctx.fillRect(163, y + 1, 12, 1); txt(String(lv), 175, y - 1, rgba(col, 0.5), 'right', false); });
    const ids = SK_ORDER.filter(id => SK[id].tab === G.tab && SK[id].cls === P.cls);
    for (const id of ids) { const s = SK[id]; if (s.pre && SK[s.pre].tab === G.tab) treeArrow(SK[s.pre], s, P.skills[s.pre] > 0); }
    for (const id of ids) {
      const s = SK[id], l = P.skills[id] || 0, ready = skillReady(id), cx = TREE.col(s.c), cy = TREE.row(s.r);
      const hl = P.hard[id] || 0, x = cx - 9, y = cy - 9, canAdd = P.skillPts > 0 && ready && hl < 20;
      iconCell(x - 3, y - 3, id, l > 0 ? 'lit' : ready ? 'dim' : 'lock', col, canAdd);
      if (s.kind === 'weapon' && P.gweapon === id) { ctx.strokeStyle = '#d8f3ff'; ctx.strokeRect(x - 4.5, y - 4.5, 27, 27); }
      const kk = keyOf(id); if (kk && l > 0) { ctx.fillStyle = 'rgba(5,4,7,0.8)'; ctx.fillRect(x - 3, y - 3, tw(kk) + 3, 8); txt(kk, x - 2, y + 4, '#f0d080', 'left', false); }
      (s.perks || []).forEach((pk, pi) => { const on = perkOn(id, pi); ctx.fillStyle = '#050407'; ctx.fillRect(x + 18, y - 2 + pi * 4, 3, 3); ctx.fillStyle = on ? '#f0d080' : '#2a2530'; ctx.fillRect(x + 19, y - 1 + pi * 4, 2, 2); if (on) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 19, y - 1 + pi * 4, 1, 1); } });
      if (P.right === id) txt('R', x - 2, y + 20, '#d8f3ff', 'left');
      // the level plate in the corner
      ctx.fillStyle = '#050407'; ctx.fillRect(x + 12, y + 13, 11, 9); ctx.fillStyle = '#1e1a22'; ctx.fillRect(x + 13, y + 14, 9, 7); ctx.fillStyle = '#3a3446'; ctx.fillRect(x + 13, y + 14, 9, 1); ctx.fillRect(x + 13, y + 14, 1, 7);
      txt(String(l), x + 18, y + 20, l > hl ? '#8b95ff' : l > 0 ? col : '#5a5563', 'center', false);
      uiButton(x - 3, y - 3, 24, 24, () => {
        if (learn(id)) return;
        if (s.kind === 'weapon' && l > 0) { P.gweapon = id; say(`Golem wields the ${s.name}`, 1.2); }
        else if (!ready) say(P.level < s.req ? `Requires level ${s.req}` : `Requires ${SK[s.pre].name}`, 1.2);
      }, () => {
        if (s.kind === 'weapon' && l > 0) { P.gweapon = id; say(`Golem wields the ${s.name}`, 1.2); }
        else if ((s.kind === 'cast' || s.kind === 'hold') && l > 0) { if (keys.has('shift')) setLeft(id); else setRight(id); }
      });
      if (inRect(mouse, x - 3, y - 3, 24, 24)) { G.hoverSkill = id; tooltip = tipSkill(id, moreOn()); }
    }
    txt('Click: learn · Right: use · Key: bind', 20, 231, '#6f6a79', 'left', false);
    stud(184, 186, 44, 12, `Reset ${P.respecs}`, P.respecs > 0, '#e8e2d0'); if (P.respecs > 0) uiButton(184, 186, 44, 12, () => respecSkills());
    if (inRect(mouse, 184, 186, 44, 12)) tooltip = [['Full reset', '#e8e2d0'], ['Refunds skills, attributes and Arcana', '#a39d8c'], [`${P.respecs} left · bosses leave Hollow Tokens`, '#a39d8c']];
    stud(184, 202, 44, 12, G.tipMore ? 'LESS' : 'MORE', true, G.tipMore ? '#f0d080' : '#a39d8c'); uiButton(184, 202, 44, 12, () => { G.tipMore = !G.tipMore; });
    if (inRect(mouse, 184, 202, 44, 12)) tooltip = [['Tooltip detail', '#e8e2d0'], ['Perks, synergies and the next level', '#a39d8c'], ['Holding shift shows them too', '#6f6a79']];
  };

  // ---- the character page: attributes as carved rows with small pixel sigils, the studs to spend points
  function attrSigil(k, x, y) {
    ctx.save(); ctx.translate(x, y); const o = PX(ctx);
    if (k === 'vit') { const B = M.blood; o.T([[6, 11], [1, 6], [1, 3], [3, 1], [5, 1], [6, 3], [7, 1], [9, 1], [11, 3], [11, 6]], B[0]); o.T([[6, 9], [2, 6], [2, 4], [3, 3], [5, 3], [6, 5], [7, 3], [9, 3], [10, 4], [10, 6]], B[2]); o.D(3, 3, B[4]); o.D(4, 4, B[3]); }
    else if (k === 'spi') { const A = P.cls === 'hemomancer' ? M.blood : P.cls === 'miasmancer' ? M.violet : P.cls === 'monk' ? M.amber : P.cls === 'ossumancer' ? M.bone : M.aether; for (let i = 0; i < 22; i++) { const a = i * 0.55, r = 0.6 + i * 0.22; o.D(Math.round(6 + Math.cos(a) * r), Math.round(6 + Math.sin(a) * r), i % 3 === 0 ? A[3] : A[2]); } o.D(6, 6, A[4]); }
    else { const G = M.gold; o.R(2, 4, 9, 7, G[0]); o.R(3, 5, 7, 5, G[2]); for (let i = 0; i < 4; i++) { o.R(3 + i * 2, 5, 1, 2, G[3]); o.D(3 + i * 2, 4, G[0]); } o.R(3, 8, 7, 1, G[1]); o.R(1, 6, 2, 4, G[0]); o.D(1, 7, G[2]); o.D(3, 6, G[4]); }
    ctx.restore();
  }
  drawChar = function () {
    const p = LP, col = clsCol();
    pageBg(p, col); titleRow(p, CLASS_NAME[P.cls] || 'Animancer', col);
    closeStud(p, () => { G.panels.char = G.panels.skills = G.panels.vendor = G.panels.lantern = false; });
    let y = 36;
    txt(`Level ${P.level}`, 14, y, '#f0d080'); txt(`${P.xp} / ${xpNext(P.level)}`, 222, y, '#a39d8c', 'right');
    ctx.fillStyle = '#050407'; ctx.fillRect(14, 38, 208, 3); ctx.fillStyle = '#8a6a2a'; ctx.fillRect(15, 39, Math.round(206 * clamp(P.xp / xpNext(P.level), 0, 1)), 1);
    y += 16;
    txt(`Stat points: ${P.statPts}`, 14, y, P.statPts ? '#f0d080' : '#6f6a79'); y += 14;
    [['vit', 'Vitality', 'Life and poise'], ['spi', 'Essence', P.cls === 'hemomancer' ? 'Vitae: size, refill, spell power' : P.cls === 'miasmancer' ? 'Miasma: size, refill, spell power' : P.cls === 'ossumancer' ? 'Essence and shards: size, refill, power' : 'Essence pool, refill and spell power'], ['con', 'Constitution', 'Melee, armor, poise']].forEach(([k, name, desc]) => {
      recess(10, y - 9, 216, 22, '#1a1418');
      ctx.fillStyle = '#050407'; ctx.fillRect(13, y - 6, 16, 16); ctx.fillStyle = '#100d12'; ctx.fillRect(14, y - 5, 14, 14); ctx.fillStyle = '#2a2530'; ctx.fillRect(14, y + 8, 14, 1); ctx.fillRect(27, y - 5, 1, 14);
      attrSigil(k, 15, y - 4);
      txt(name, 33, y, '#e8e2d0'); txt(desc, 33, y + 10, '#6f6a79', 'left', false);
      const bonus = D[k] - P.attrs[k];
      txt(String(D[k]), 186, y + 4, bonus ? '#8b95ff' : '#e8e2d0', 'right');
      if (P.statPts > 0) { const w = tw('+') + 8; stud(196, y - 4, w, 12, '+', true, '#f0d080'); uiButton(196, y - 4, w, 12, () => { P.attrs[k]++; P.statPts--; D = derive(); }); }
      y += 24;
    });
    y += 2;
    rule(14, y - 10, 208, col);
    const rows = [
      ['Life', `${Math.ceil(P.hp)} / ${D.maxHp}`], [P.cls === 'hemomancer' ? 'Vitae' : P.cls === 'miasmancer' ? 'Miasma' : P.cls === 'ossumancer' ? 'Marrow' : 'Essence', `${Math.ceil(P.mana)} / ${D.maxMana}` + (P.cls === 'hemomancer' ? ` · heals ${(vitaeHeal() * 100).toFixed(1)}%/s` : '') + (D.wardPct ? ` · ward ${Math.round(D.wardPct * 100)}%` : '')], ['Poise', `${Math.ceil(P.stam)} / ${D.maxStam}`],
      ['Armor', `${D.armor}  (-${Math.round(100 - 10000 / (100 + D.armor))}% physical)`], ['Skill damage', `+${Math.round((D.dmgMult - 1) * 100)}%`],
      P.cls === 'miasmancer' ? ['Cloud', `${MS.auraR().toFixed(1)} yd · ${Math.round(MS.evade() * 100)}% of blows miss · ${MS.omenMax()} Omens`] : P.cls === 'hemomancer' ? ['Brood', `${HS.broodMax()} max · ${mutSlots()} mutation slots`] : P.cls === 'ossumancer' ? ['Shards', `${D.shardCap} max · 1 per ${(1 / BS.rate()).toFixed(2)}s · turns ${Math.round(BS.dr() * 100)}%`] : P.cls === 'monk' ? ['The glass', typeof KS !== 'undefined' && KS.fill ? `Radiance at ${Math.round(KS.sand(0) * 100)}% · Absence at ${Math.round(KS.sand(1) * 100)}%` : ''] : ['Wisps', `${D.wispCap} max (items +${D.itemWisps}, cap 3) · ${D.wispRegen.toFixed(2)}s`], ['Cast rate', `+${Math.round((D.castSpd - 1) * 100)}%`],
      ['Magic resist', `${D.res}%`], ['Magic find', `${D.mf}%`], ['Gold', `${P.gold}`]
    ];
    rows.forEach(([a, b], i) => { if (i % 2) { ctx.fillStyle = 'rgba(0,0,0,0.14)'; ctx.fillRect(12, y - 7, 212, 9); } txt(a, 14, y, '#a39d8c'); txt(b, 222, y, i === rows.length - 1 ? '#f0d080' : '#e8e2d0', 'right'); y += 9.5; });
    if (P.fate && inRect(mouse, 8, 30, 220, 20)) tooltip = [['Your fate, as the Mysterious Stranger read it', '#b48ad9']].concat(...fateLines().map(([a, b]) => [[a, '#e8e2d0'], ['  ' + b, '#8b95ff']]));
    if (P.fate) txt('fate', 118, 36, '#6a5a7a', 'center', false);
    { const lb = `Reset all (${P.respecs})`, w = tw(lb) + 8; stud(138, 43, w, 12, lb, P.respecs > 0, '#e8e2d0'); if (P.respecs > 0) uiButton(138, 43, w, 12, () => respecStats()); }
  };

  // ---- the inventory: engraved slots with a faint sigil of what goes there, a carved grid
  function slotSigil(slot, x, y, w, h) {
    ctx.save(); ctx.translate(Math.round(x + w / 2 - 6), Math.round(y + h / 2 - 6)); const o = PX(ctx), c = '#2a2430', c2 = '#332c3a';
    switch (slot) {
      case 'head': o.T([[2, 8], [2, 5], [6, 1], [10, 5], [10, 8]], c); o.R(3, 8, 6, 2, c); o.R(5, 5, 2, 5, c2); break;
      case 'neck': o.C(6, 4, 4, c); o.R(5, 8, 2, 3, c2); break;
      case 'weapon': o.LW(3, 10, 9, 2, 2, c); o.R(2, 8, 4, 1, c2); o.D(2, 10, c2); break;
      case 'body': o.T([[2, 2], [5, 1], [7, 1], [10, 2], [10, 11], [2, 11]], c); o.R(5, 3, 2, 8, c2); break;
      case 'offhand': o.T([[6, 1], [11, 3], [10, 8], [6, 11], [2, 8], [1, 3]], c); o.R(5, 3, 2, 6, c2); break;
      case 'hands': o.R(3, 5, 6, 6, c); for (let i = 0; i < 4; i++) o.R(3 + i * 2, 2 + (i % 2), 1, 3, c); o.D(1, 6, c2); break;
      case 'ring1': case 'ring2': o.C(6, 6, 4, c); o.R(5, 1, 2, 2, c2); break;
      case 'waist': o.R(1, 4, 10, 3, c); o.R(5, 3, 3, 5, c2); break;
      case 'feet': o.R(3, 1, 4, 6, c); o.R(3, 7, 7, 3, c); o.D(9, 8, c2); break;
    }
    ctx.restore();
  }
  // v0.53: "the inventory screen is too big, remove the dead spaces". The page is now only as wide as the grid and
  // only as tall as its contents, pinned to the top right; the paper doll sits tight above the grid.
  RP.w = INV_W * CELL + 28; RP.x = W - RP.w; RP.h = 196;
  Object.assign(EQ_SLOTS, {
    weapon: [14, 28, 24, 48], head: [62, 28, 24, 24], neck: [92, 34, 12, 12], offhand: [110, 28, 24, 48],
    body: [62, 56, 24, 36], ring1: [44, 70, 12, 12], ring2: [92, 70, 12, 12],
    hands: [14, 82, 24, 24], waist: [62, 96, 24, 12], feet: [110, 82, 24, 24]
  });
  GRID.x = RP.x + 14; GRID.y = 120;
  { const _ub = uiBlocksMouse; uiBlocksMouse = function () {
      // below the shorter page the world is live again
      if (G.panels.inv && mouse.x >= RP.x && mouse.y >= RP.y + RP.h && mouse.y < HUD_Y) { G.panels.inv = false; try { return _ub.apply(this, arguments); } finally { G.panels.inv = true; } }
      return _ub.apply(this, arguments);
    }; }
  drawInventory = function () {
    const p = RP, col = clsCol();
    pageBg(p, col); titleRow(p, 'Inventory', col);
    closeStud(p, () => { G.panels.inv = false; });
    for (const slot in EQ_SLOTS) {
      const [ox, oy, w, h] = EQ_SLOTS[slot], x = RP.x + ox, y = oy;
      ctx.fillStyle = '#050407'; ctx.fillRect(x - 2, y - 2, w + 4, h + 4); ctx.fillStyle = '#3a3446'; ctx.fillRect(x - 1, y - 1, w + 2, 1); ctx.fillRect(x - 1, y - 1, 1, h + 2); ctx.fillStyle = '#221e2a'; ctx.fillRect(x - 1, y + h, w + 2, 1); ctx.fillRect(x + w, y - 1, 1, h + 2);
      ctx.fillStyle = '#100d12'; ctx.fillRect(x, y, w, h); ctx.fillStyle = '#08070a'; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y, 1, h);
      const it = P.eq[slot];
      if (it) {
        const ic = getIcon(BASES[it.base].icon, it.w, it.h);
        const iw = Math.min(w, it.w * CELL), ih = Math.min(h, it.h * CELL);
        ctx.fillStyle = it.q === 'unique' ? 'rgba(201,164,90,0.18)' : it.q === 'rare' ? 'rgba(241,224,90,0.14)' : it.q === 'magic' ? 'rgba(139,149,255,0.14)' : 'rgba(0,0,0,0)';
        ctx.fillRect(x, y, w, h);
        ctx.drawImage(ic, Math.round(x + (w - iw) / 2), Math.round(y + (h - ih) / 2), iw, ih);
        if (inRect(mouse, x, y, w, h) && !G.cursorItem) tooltip = itemLines(it);
      } else slotSigil(slot, x, y, w, h);
      uiButton(x, y, w, h, () => equipSwap(slot), () => { if (P.eq[slot] && !G.cursorItem && invAdd(P.eq[slot])) { P.eq[slot] = null; D = derive(); } });
    }
    // the grid
    ctx.fillStyle = '#050407'; ctx.fillRect(GRID.x - 2, GRID.y - 2, INV_W * CELL + 4, INV_H * CELL + 4); ctx.fillStyle = '#3a3446'; ctx.fillRect(GRID.x - 1, GRID.y - 1, INV_W * CELL + 2, 1); ctx.fillRect(GRID.x - 1, GRID.y - 1, 1, INV_H * CELL + 2);
    for (let y = 0; y < INV_H; y++) for (let x = 0; x < INV_W; x++) { const gx = GRID.x + x * CELL, gy = GRID.y + y * CELL; ctx.fillStyle = (x + y) % 2 ? '#141117' : '#171319'; ctx.fillRect(gx, gy, CELL, CELL); ctx.fillStyle = '#0a090d'; ctx.fillRect(gx, gy, CELL, 1); ctx.fillRect(gx, gy, 1, CELL); }
    for (const e of P.inv) {
      const it = e.item, x = GRID.x + e.x * CELL, y = GRID.y + e.y * CELL;
      if (it.q !== 'normal' && it.q !== 'potion') { ctx.fillStyle = it.q === 'unique' ? 'rgba(201,164,90,0.18)' : it.q === 'rare' ? 'rgba(241,224,90,0.14)' : 'rgba(139,149,255,0.16)'; ctx.fillRect(x, y, it.w * CELL, it.h * CELL); }
      ctx.drawImage(getIcon(it.potion || BASES[it.base].icon, it.w, it.h), x, y);
      if (it.lvl > P.level) { ctx.fillStyle = 'rgba(200,40,40,0.25)'; ctx.fillRect(x, y, it.w * CELL, it.h * CELL); }
      if (inRect(mouse, x, y, it.w * CELL, it.h * CELL) && !G.cursorItem) tooltip = itemLines(it).concat(G.panels.vendor ? [[`Sell value: ${itemValue(it)} gold (right-click)`, '#d9a441']] : []);
    }
    uiButton(GRID.x, GRID.y, INV_W * CELL, INV_H * CELL, () => gridClick(false), () => gridClick(true));
    const gy = GRID.y + INV_H * CELL + 5;
    rule(RP.x + 12, gy, RP.w - 24, col);
    txt(`Gold ${P.gold}`, RP.x + RP.w / 2, gy + 12, '#f0d080', 'center', false);   // selling and using are in each item's tooltip
  };

  // ---- the same art in the small slots (hotbar, the pick popup, the Flesh page): the 24px icon scaled to 18
  const IC18 = {};
  skillIcon = function (id, x, y, active) {
    if (!ICON[id]) return _skillIcon0(id, x, y, active);
    let c = IC18[id]; if (!c) { c = mkCanvas(18, 18); const q = c.getContext('2d'); q.imageSmoothingEnabled = true; q.imageSmoothingQuality = 'high'; q.drawImage(iconCanvas(id, 'lit'), 0, 0, 18, 18); IC18[id] = c; }
    ctx.fillStyle = '#0a090d'; ctx.fillRect(x - 1, y - 1, 20, 20); ctx.fillStyle = active ? '#221e26' : '#15121a'; ctx.fillRect(x, y, 18, 18);
    ctx.drawImage(c, x, y);
  };
  window.__spm.ui35 = { iconCanvas, ICON, M, pageBg };
}
