// v0.52 Act 5 — The Descent: into the dead god's body (mlvl 34-40), plus the side region the Scar of Ur-Nihl.
//
//   a5_town      The Last Vigil                  refuge at the lip of the descent (safe; npcSpots)
//   a5_highway   The Grand Calcified Highway     mlvl 34-35  vaulted spinal canal, very wide, side foramina
//   a5_siphon    The Siphon Vaults               mlvl 35-36  marrow-mining vaults on a grid of broad galleries
//   a5_skerries  The Sanguine Cavity             mlvl 36-37  boiling red sea, scab islands linked by shallows
//   a5_valves    The Valve Gates                 mlvl 36-37  ring of arterial chambers joined by valve gates
//   a5_shaft     The Shaft of Fading Echoes      mlvl 37-38  void spanned by broad nerve-strand bridges; the Hanging Bell
//   a5_crucible  The Digesting Crucible          mlvl 38-39  acid basins, grinding bone-piles, pre-human ruins
//   a5_cerebrum  The Cerebrum Labyrinth          mlvl 39-40  folded sulci of ossified brain, entered by the Optic Chiasm Gate
//   a5_lair      The Alien Temple of the Slayers mlvl 40     the labyrinth's heart; boss arena (z.bossSpot)
//   a5_scar      The Scar of Ur-Nihl             mlvl 36-38  side region off the Vigil: black canyon, void rifts, floating rock
//   a5_monolith  The Silent Monolith             mlvl 38-40  crater around the monolith; dead-end treasure
//
// OPENNESS: every walkable region is passed through a morphological opening, so no passage is narrower than a
// five-tile body anywhere (bridges over the void excepted, which are built five tiles wide and opened at r=2).
// The labyrinth is not a grid maze: its walls are the gyri of a band-limited random wave field (the pattern of
// brain coral), its corridors the sulci between them; pinches are opened away, the separate folds are joined by
// seven-tile doors along a random spanning tree plus extra loops, and a few great chambers are forced open.
//
// Wraps ZONE_GEN, ZONE_NAMES, isOutdoor, ambient22 / AMBIENT tables, floorTileFor + the zt tile/wall theme lookups
// (new theme strings fall back to bone / barrow / crypt palettes until they are painted), updateMon, killMon,
// hitTarget, hurtPlayer, followPath and updateMonsters (for the natives' bleed / daze / acid / void-cut marks).
// Nothing links out of the act: the Quest agent owns the links between acts (see z.upSpot on a5_town).
{
  if (typeof ZONE_GEN === 'object' && typeof T !== 'undefined' && typeof Zone === 'function') {
    const rep = e => { try { if (typeof reportError === 'function') reportError(e); } catch (_) { /* */ } };

    // =============================================================== themes: fallback palettes and light
    const A5_FB = { a5_town: 'bone', a5_marrow: 'bone', a5_sanguine: 'barrow', a5_shaft: 'crypt', a5_crucible: 'barrow', a5_cerebrum: 'bone', a5_temple: 'crypt', a5_scar: 'crypt' };
    const A5_AMB = { a5_town: [108, 100, 90], a5_marrow: [98, 92, 82], a5_sanguine: [114, 76, 72], a5_shaft: [74, 86, 112], a5_crucible: [88, 104, 74], a5_cerebrum: [104, 98, 114], a5_temple: [72, 68, 90], a5_scar: [64, 64, 72] };
    const isA5 = z => !!(z && A5_FB[z.theme]);
    try { if (typeof AMB_DEEP === 'object') for (const k in A5_AMB) AMB_DEEP[k] = A5_AMB[k]; } catch (e) { /* */ }
    try { if (typeof AMBIENT === 'object') for (const k in A5_AMB) AMBIENT[k] = A5_AMB[k].map(v => Math.round(v * 0.72)); } catch (e) { /* */ }
    // run fn with the zone wearing its fallback theme for the length of the call
    function asFallback(z, fn) { const th = z.theme; z.theme = A5_FB[th]; try { return fn(); } finally { z.theme = th; } }
    if (typeof isOutdoor === 'function') { const _io = isOutdoor; isOutdoor = function (z) { if (isA5(z)) return false; return _io(z); }; }
    if (typeof ambient22 === 'function') { const _a = ambient22; ambient22 = function (z) { if (isA5(z)) return A5_AMB[z.theme].slice(); return _a(z); }; }
    if (typeof floorTileFor === 'function') { const _ft = floorTileFor; floorTileFor = function (z, x, y, t) { if (isA5(z)) return asFallback(z, () => _ft(z, x, y, t)); return _ft(z, x, y, t); }; }
    if (typeof ztClassOf === 'function') { const _zc = ztClassOf; ztClassOf = function (z, x, y) { if (isA5(z)) return asFallback(z, () => _zc(z, x, y)); return _zc(z, x, y); }; }
    // the abyss: in zones flagged a5void, WATER is not water but the void (solid, flat, see-through, shot-through);
    // it paints as the VOID ground class, rocks standing in it hang there, and it throws no water glints.
    const VOID = T.WATER;
    if (typeof ztClassOf === 'function' && typeof ZT_G === 'object') {
      const _zc2 = ztClassOf;
      ztClassOf = function (z, x, y) {
        if (z && z.a5void && x >= 0 && y >= 0 && x < z.w && y < z.h) { const t = z.t[y * z.w + x]; if (t === VOID) return ZT_G.VOID; if (t === T.ROCK && (z.get(x + 1, y) === VOID || z.get(x - 1, y) === VOID || z.get(x, y + 1) === VOID || z.get(x, y - 1) === VOID)) return ZT_G.VOID; }
        return _zc2(z, x, y);
      };
    }
    if (typeof drawWaterGlints === 'function') { const _wg = drawWaterGlints; drawWaterGlints = function (x, y, a) { if (G.zone && G.zone.a5void) return; return _wg(x, y, a); }; }
    if (typeof ztWallTheme === 'function') { const _zw = ztWallTheme; ztWallTheme = function (z) { if (isA5(z)) return asFallback(z, () => _zw(z)); return _zw(z); }; }

    // =============================================================== grid toolkit
    const WALKV = new Set([T.FLOOR, T.FLAGS, T.ROAD, T.DIRT, T.MUD, T.SHALLOW, T.GRASS]);
    const walk = t => SOLID[t] === 0 && t !== T.FOG;
    const M = 2;   // untouchable border
    const inb = (z, x, y, m = M) => x >= m && y >= m && x < z.w - m && y < z.h - m;
    function cave(id, name, W, H, dark, theme) { const z = new Zone(id, name, W, H, dark); z.theme = theme; z.t.fill(T.WALL); z.props = []; return z; }
    function disc(z, cx, cy, r, v, only) {
      const r2 = r * r;
      for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r); x++) {
        const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy > r2 || !inb(z, x, y)) continue;
        const i = y * z.w + x; if (only && !only(z.t[i])) continue; z.t[i] = v;
      }
    }
    // stroke a polyline with a disc brush; r may be a number or fn(k in 0..1)
    function stroke(z, pts, r, v, only) {
      let tot = 0; for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      let acc = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i], L = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(L * 2));
        for (let s = 0; s <= n; s++) { const k = s / n, px = a.x + (b.x - a.x) * k, py = a.y + (b.y - a.y) * k; disc(z, px, py, typeof r === 'function' ? r((acc + L * k) / (tot || 1)) : r, v, only); }
        acc += L;
      }
    }
    function chaikin(pts, it) { for (let k = 0; k < it; k++) { const o = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; o.push({ x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 }); } o.push(pts[pts.length - 1]); pts = o; } return pts; }
    // a curving path from a to b: midpoint displacement then smoothing
    function wobble(rng, a, b, amp, depth = 3) {
      let pts = [a, b];
      for (let d = 0; d < depth; d++) {
        const o = [pts[0]];
        for (let i = 1; i < pts.length; i++) {
          const p = pts[i - 1], q = pts[i], L = Math.hypot(q.x - p.x, q.y - p.y) || 1, nx = -(q.y - p.y) / L, ny = (q.x - p.x) / L, off = (rng() * 2 - 1) * L * amp;
          o.push({ x: (p.x + q.x) / 2 + nx * off, y: (p.y + q.y) / 2 + ny * off }, q);
        }
        pts = o;
      }
      return chaikin(pts, 2);
    }
    // a noise-edged ellipse
    function blob(z, cx, cy, rx, ry, rng, v, rough = 0.2, only) {
      const H = [2, 3, 4, 5].map(k => [k, (rng() * 2 - 1) * rough / (k - 0.8), rng() * 6.283]);
      for (let y = Math.floor(cy - ry * (1 + rough) - 2); y <= cy + ry * (1 + rough) + 2; y++) for (let x = Math.floor(cx - rx * (1 + rough) - 2); x <= cx + rx * (1 + rough) + 2; x++) {
        if (!inb(z, x, y)) continue;
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, a = Math.atan2(dy, dx);
        let s = 1; for (const [k, amp, ph] of H) s += amp * Math.sin(k * a + ph);
        if (dx * dx + dy * dy <= s * s) { const i = y * z.w + x; if (!only || only(z.t[i])) z.t[i] = v; }
      }
    }
    // cellular smoothing between WALL and one floor kind (other tiles are left alone and count as open)
    function smooth(z, iters, fv = T.FLOOR) {
      for (let it = 0; it < iters; it++) {
        const src = z.t.slice();
        for (let y = M + 1; y < z.h - M - 1; y++) for (let x = M + 1; x < z.w - M - 1; x++) {
          const i = y * z.w + x, t = src[i]; if (t !== T.WALL && t !== fv) continue;
          let w = 0; for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) if (src[i + j * z.w + k] === T.WALL) w++;
          if (w >= 6) z.t[i] = T.WALL; else if (w <= 3) z.t[i] = fv;
        }
      }
    }
    // chamfer distance from each tile to the nearest non-walkable tile (outside the grid counts as solid)
    function distField(z, isOpen = walk) {
      const W = z.w, H = z.h, d = new Float32Array(W * H), INF = 1e9, D2 = 1.4142;
      for (let i = 0; i < W * H; i++) d[i] = isOpen(z.t[i]) ? INF : 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (!d[i]) continue; let v = d[i];
        v = Math.min(v, x > 0 ? d[i - 1] + 1 : 1, y > 0 ? d[i - W] + 1 : 1, x > 0 && y > 0 ? d[i - W - 1] + D2 : D2, x < W - 1 && y > 0 ? d[i - W + 1] + D2 : D2);
        d[i] = v;
      }
      for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) {
        const i = y * W + x; if (!d[i]) continue; let v = d[i];
        v = Math.min(v, x < W - 1 ? d[i + 1] + 1 : 1, y < H - 1 ? d[i + W] + 1 : 1, x < W - 1 && y < H - 1 ? d[i + W + 1] + D2 : D2, x > 0 && y < H - 1 ? d[i + W - 1] + D2 : D2);
        d[i] = v;
      }
      return d;
    }
    // distance from each tile to the nearest tile of a set (set given as a Uint8Array mask)
    function distTo(z, mask) {
      const W = z.w, H = z.h, d = new Float32Array(W * H), D2 = 1.4142;
      for (let i = 0; i < W * H; i++) d[i] = mask[i] ? 0 : 1e9;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x > 0) v = Math.min(v, d[i - 1] + 1); if (y > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + D2); if (x < W - 1) v = Math.min(v, d[i - W + 1] + D2); } d[i] = v; }
      for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (!d[i]) continue; let v = d[i]; if (x < W - 1) v = Math.min(v, d[i + 1] + 1); if (y < H - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + D2); if (x > 0) v = Math.min(v, d[i + W - 1] + D2); } d[i] = v; }
      return d;
    }
    // morphological opening: walkable tiles a body of radius r cannot reach become solid (the nearest solid kind)
    function openWalk(z, r) {
      const d = distField(z), W = z.w, core = new Uint8Array(W * z.h);
      for (let i = 0; i < d.length; i++) if (d[i] >= r) core[i] = 1;
      const dc = distTo(z, core);
      for (let y = 0; y < z.h; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; if (!walk(z.t[i]) || dc[i] < r - 0.01) continue;
        z.t[i] = nearSolid(z, x, y);
      }
    }
    // widen pinches: where two open cores (room for a body of radius r) touch only through a thinner neck, the neck
    // is carved out to a full passage. Multi-source BFS from the cores through the non-core walkable tiles; where
    // the fronts of two different cores meet, a disc of radius r + 0.6 is cut.
    function fixPinches(z, r, fv = T.FLOOR, rounds = 8, alsoVoid = false) {
      const W = z.w, N = W * z.h;
      for (let round = 0; round < rounds; round++) {
        const d = distField(z), lab = new Int32Array(N).fill(-1), q = new Int32Array(N);
        let L = 0;
        for (let s0 = 0; s0 < N; s0++) {
          if (d[s0] < r || lab[s0] >= 0) continue;
          let h = 0, tl = 0; q[tl++] = s0; lab[s0] = L;
          while (h < tl) { const i = q[h++], x = i % W, y = (i / W) | 0; for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const nx = x + k, ny = y + j; if (nx < 0 || ny < 0 || nx >= W || ny >= z.h) continue; const n2 = ny * W + nx; if (lab[n2] < 0 && d[n2] >= r) { lab[n2] = L; q[tl++] = n2; } } }
          L++;
        }
        if (L < 2) return;
        let h = 0, tl = 0; for (let i = 0; i < N; i++) if (lab[i] >= 0) q[tl++] = i;
        const cuts = new Map();
        while (h < tl) {
          const i = q[h++], x = i % W, y = (i / W) | 0;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= z.h) continue;
            const j = ny * W + nx; if (!walk(z.t[j])) continue;
            if (lab[j] < 0) { lab[j] = lab[i]; q[tl++] = j; continue; }
            if (lab[j] !== lab[i]) { const a = Math.min(lab[i], lab[j]), b = Math.max(lab[i], lab[j]), key = a * 1e6 + b; if (!cuts.has(key)) cuts.set(key, { x: (x + nx) / 2 + 0.5, y: (y + ny) / 2 + 0.5 }); }
          }
        }
        if (!cuts.size) return;
        for (const c of cuts.values()) disc(z, c.x, c.y, r + 0.6, fv, t => t === T.WALL || t === T.CLIFF || t === T.ROCK || t === T.PILLAR || t === T.RUIN || (alsoVoid && t === VOID));
        z.a5pinches = (z.a5pinches || 0) + cuts.size;
      }
    }
    function nearSolid(z, x, y) { let cl = 0, wa = 0, wl = 0; for (let j = -2; j <= 2; j++) for (let k = -2; k <= 2; k++) { const t = z.get(x + k, y + j); if (t === T.CLIFF) cl++; else if (t === T.WATER) wa++; else if (t === T.WALL) wl++; } return cl >= wa && cl >= wl && cl > 0 ? T.CLIFF : wa > wl ? T.WATER : T.WALL; }
    // unreachable walkable tiles become solid
    function keepMain(z, sx, sy, fill) {
      const seen = floodFrom(z, Math.floor(sx), Math.floor(sy));
      for (let y = 0; y < z.h; y++) for (let x = 0; x < z.w; x++) { const i = y * z.w + x; if (!seen[i] && walk(z.t[i])) z.t[i] = fill != null ? fill : nearSolid(z, x, y); }
    }
    // label 4-connected walkable components
    function label(z) {
      const W = z.w, N = W * z.h, lab = new Int32Array(N).fill(-1), sizes = [], q = new Int32Array(N);
      for (let s = 0; s < N; s++) {
        if (lab[s] >= 0 || !walk(z.t[s])) continue;
        const L = sizes.length; let h = 0, tl = 0; q[tl++] = s; lab[s] = L;
        while (h < tl) { const i = q[h++], x = i % W; for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) { if (j < 0 || j >= N || lab[j] >= 0 || !walk(z.t[j])) continue; lab[j] = L; q[tl++] = j; } }
        sizes.push(tl);
      }
      return { lab, sizes };
    }
    // join every walkable component with wide doors: multi-source BFS through carveable solid (a Voronoi of the
    // walls) finds the shortest crossing between each pair of neighbouring components; a random spanning tree of
    // those crossings is carved, then a share of the rest for loops.
    function connectAll(z, rng, o) {
      const W = z.w, N = W * z.h;
      let { lab, sizes } = label(z);
      // small scraps become wall (unless they hold a keep point)
      const keepL = new Set((o.keep || []).map(p => lab[Math.floor(p.y) * W + Math.floor(p.x)]).filter(v => v >= 0));
      for (let i = 0; i < N; i++) { const L = lab[i]; if (L >= 0 && sizes[L] < (o.minSize || 40) && !keepL.has(L)) { z.t[i] = nearSolid(z, i % W, (i / W) | 0); lab[i] = -1; } }
      const carve = o.carve || (t => t === T.WALL || t === T.CLIFF || t === T.WATER);
      const dist = new Float32Array(N).fill(-1), src = new Int32Array(N).fill(-1), org = new Int32Array(N).fill(-1), q = new Int32Array(N);
      let h = 0, tl = 0;
      for (let i = 0; i < N; i++) if (lab[i] >= 0) { dist[i] = 0; src[i] = lab[i]; org[i] = i; q[tl++] = i; }
      const best = new Map();
      while (h < tl) {
        const i = q[h++], x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy; if (!inb(z, nx, ny, 3)) continue;
          const j = ny * W + nx;
          if (src[j] >= 0) {
            if (src[j] !== src[i]) { const a = Math.min(src[i], src[j]), b = Math.max(src[i], src[j]), key = a * 100000 + b, c = dist[i] + dist[j] + 1, e = best.get(key); if (!e || c < e.c) best.set(key, { a, b, c, p: org[i], q: org[j] }); }
            continue;
          }
          if (!carve(z.t[j])) continue;
          dist[j] = dist[i] + 1; src[j] = src[i]; org[j] = org[i]; q[tl++] = j;
        }
      }
      const edges = [...best.values()].map(e => Object.assign(e, { w: e.c * (0.7 + 0.6 * rng()) })).sort((a, b) => a.w - b.w);
      const par = new Int32Array(sizes.length).map((_, i) => i), find = a => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
      const doors = [], pt = i => ({ x: (i % W) + 0.5, y: ((i / W) | 0) + 0.5 });
      const cut = e => { const A = pt(e.p), B = pt(e.q), L = Math.hypot(B.x - A.x, B.y - A.y) || 1, ux = (B.x - A.x) / L, uy = (B.y - A.y) / L, ext = o.doorR * 0.6; stroke(z, [{ x: A.x - ux * ext, y: A.y - uy * ext }, { x: B.x + ux * ext, y: B.y + uy * ext }], o.doorR, o.doorV || T.FLOOR, t => !walk(t) || t === o.doorV); doors.push({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, len: L }); };
      const rest = [];
      for (const e of edges) { const ra = find(e.a), rb = find(e.b); if (ra !== rb) { par[ra] = rb; cut(e); } else rest.push(e); }
      for (const e of rest) if (e.c <= (o.maxLoop || 14) && rng() < (o.loops || 0.25)) cut(e);
      return doors;
    }
    // nearest walkable tile centre to (x, y), searching outward
    function spot(z, x, y, clearR = 0) {
      const ok = (X, Y) => { for (let j = -clearR; j <= clearR; j++) for (let k = -clearR; k <= clearR; k++) if (!walk(z.get(X + k, Y + j)) || z.get(X + k, Y + j) === T.SHALLOW) return false; return true; };
      const X0 = Math.floor(x), Y0 = Math.floor(y);
      for (let r = 0; r < 40; r++) for (let j = -r; j <= r; j++) for (let k = -r; k <= r; k++) { if (Math.max(Math.abs(j), Math.abs(k)) !== r) continue; if (ok(X0 + k, Y0 + j)) return { x: X0 + k + 0.5, y: Y0 + j + 0.5 }; }
      return { x: X0 + 0.5, y: Y0 + 0.5 };
    }
    function addLantern(z, x, y, name) { const p = spot(z, x, y, 1); z.lanterns.push({ x: p.x, y: p.y, name }); z.objects.push({ type: 'lantern', x: p.x, y: p.y, idx: z.lanterns.length - 1, name }); return p; }
    function addPortal(z, x, y, to, name, spr) {
      const p = spot(z, x, y, 1);
      z.objects.push({ type: 'portal', x: p.x, y: p.y, to, name, spr });
      z.arrive = z.arrive || {};
      let a = null; for (const [dx, dy] of [[0, 1.6], [1.6, 0], [-1.6, 0], [0, -1.6], [1.2, 1.2], [-1.2, 1.2]]) if (walk(z.get(Math.floor(p.x + dx), Math.floor(p.y + dy)))) { a = { x: p.x + dx, y: p.y + dy }; break; }
      z.arrive[to] = a || p;
      return p;
    }
    function poisson(rng, n, tries, inside, minD) {
      const out = [];
      for (let t = 0; t < tries && out.length < n; t++) { const p = inside(); if (!p) continue; if (out.every(q => Math.hypot(q.x - p.x, q.y - p.y) >= minD(p, q))) out.push(p); }
      return out;
    }
    // Kruskal over candidate pairs (distance-weighted), plus extra loops
    function graphEdges(rng, nodes, maxD, loops) {
      const E = [];
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y); if (d <= maxD) E.push({ i, j, d, w: d * (0.75 + 0.5 * rng()) }); }
      E.sort((a, b) => a.w - b.w);
      const par = nodes.map((_, i) => i), find = a => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; }, out = [], rest = [];
      for (const e of E) { const a = find(e.i), b = find(e.j); if (a !== b) { par[a] = b; out.push(e); } else rest.push(e); }
      // anything left unjoined (maxD too tight) joins its nearest neighbour in another set
      for (let i = 0; i < nodes.length; i++) if (find(i) !== find(0)) { let bj = -1, bd = 1e9; for (let j = 0; j < nodes.length; j++) if (find(j) === find(0)) { const d = Math.hypot(nodes[i].x - nodes[j].x, nodes[i].y - nodes[j].y); if (d < bd) { bd = d; bj = j; } } if (bj >= 0) { par[find(i)] = find(0); out.push({ i, j: bj, d: bd }); } }
      for (const e of rest) if (rng() < loops) out.push(e);
      return out;
    }
    const shuffle = (rng, a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
    const pickR = (rng, a) => a[Math.floor(rng() * a.length)];
    const countWalk = z => { let n = 0; for (let i = 0; i < z.t.length; i++) if (walk(z.t[i])) n++; return n; };
    const octD = (dx, dy) => Math.max(Math.abs(dx), Math.abs(dy), (Math.abs(dx) + Math.abs(dy)) / 1.4142);

    // =============================================================== the natives (mechanics only; art later)
    // spr aliases only to keys with painters; every native is tinted so it reads apart from its Act I cousin.
    Object.assign(MON, {
      a5_sapper:    { name: 'Marrow-Sapper',           spr: 'hand',   tint: '#c8b48a', hp: 34, dmg: [7, 12],  spd: 2.0,  r: .32, xp: 40, ai: 'husk',    range: 1.0,  wind: .5,  rec: .65, poiseK: .55, a5: { bleed: 0.10 } },
      a5_osteo:     { name: 'Osteo-Golem',             spr: 'warden', tint: '#dccca4', hp: 96, dmg: [10, 17], spd: 1.35, r: .5,  xp: 90, ai: 'charger', range: 1.2,  wind: .7,  rec: 1.0, armor: 45, poiseK: 1.25 },
      a5_ribward:   { name: 'Rib-Cage Bulwark',        spr: 'warden', tint: '#b09c78', hp: 70, dmg: [8, 13],  spd: 1.5,  r: .4,  xp: 70, ai: 'shield',  range: 1.05, wind: .6,  rec: .8,  armor: 40, poiseK: 1.0 },
      a5_leaper:    { name: 'Hemorrhagic Leaper',      spr: 'hand',   tint: '#a02a2a', hp: 26, dmg: [6, 11],  spd: 3.6,  r: .3,  xp: 42, ai: 'flank',   range: .9,   wind: .24, rec: .45, poiseK: .4,  a5: { bleed: 0.22 } },
      a5_tumor:     { name: 'Tumor-Swell Monstrosity', spr: 'bloat',  tint: '#b0705a', hp: 80, dmg: [14, 22], spd: 1.1,  r: .5,  xp: 70, ai: 'bomber',  wind: 1.0, armor: 70, poiseK: 1.2, a5: { bile: 1 } },
      a5_wraith:    { name: 'Neural Wraith',           spr: 'gasp',   tint: '#78b8ff', hp: 30, dmg: [8, 13],  spd: 1.6,  r: .3,  xp: 52, ai: 'ghost',   wind: .85, poiseK: .3,  a5: { shot: 'daze' } },
      a5_synapse:   { name: 'Synapse-Walker',          spr: 'hand',   tint: '#5a78c0', hp: 34, dmg: [9, 15],  spd: 2.8,  r: .3,  xp: 55, ai: 'stalker', range: .95,  wind: .3,  rec: .6,  poiseK: .45, a5: { daze: 1 } },
      a5_parasite:  { name: 'Stomach-Tether',   spr: 'worm',   tint: '#96b040', hp: 40, dmg: [8, 13],  spd: 3.0,  r: .36, xp: 50, ai: 'burrow',  range: 1.4,  wind: .4,  poiseK: .6,  a5: { acidSurface: 1 } },
      a5_corroder:  { name: 'Corrosion-Stalker',       spr: 'warden', tint: '#7e8c3a', hp: 60, dmg: [10, 16], spd: 2.1,  r: .34, xp: 62, ai: 'duelist', range: 1.05, wind: .45, rec: .6,  armor: 35, poiseK: .8, a5: { acid: 1 } },
      a5_thought:   { name: 'Thought-Form',            spr: 'gasp',   tint: '#efe6ff', hp: 28, dmg: [8, 13],  spd: 1.9,  r: .28, xp: 54, ai: 'kiter',   wind: .7,  poiseK: .35, a5: { shot: 'mind' } },
      a5_sentinel:  { name: 'Alien Sentinel',          spr: 'gasp',   tint: '#3c3848', hp: 44, dmg: [10, 15], spd: 1.3,  r: .34, xp: 66, ai: 'ghost',   wind: 1.1, armor: 50, poiseK: .9, a5: { shot: 'beam' } },
      a5_nullshade: { name: 'Null-Shade',              spr: 'hand',   tint: '#141218', hp: 36, dmg: [9, 15],  spd: 2.9,  r: .3,  xp: 60, ai: 'stalker', range: .95,  wind: .28, rec: .6,  poiseK: .45, dark: true, a5: { voidcut: 0.04 } },
      a5_silence:   { name: 'Silence-Keeper',          spr: 'warden', tint: '#6a6870', hp: 84, dmg: [10, 16], spd: 1.4,  r: .42, xp: 80, ai: 'shield',  range: 1.1,  wind: .65, rec: .85, armor: 45, poiseK: 1.0, a5: { hush: 1 } }
    });
    const NATIVES = ['a5_sapper', 'a5_osteo', 'a5_ribward', 'a5_leaper', 'a5_tumor', 'a5_wraith', 'a5_synapse', 'a5_parasite', 'a5_corroder', 'a5_thought', 'a5_sentinel', 'a5_nullshade', 'a5_silence'];
    const K = (n, f) => (MON[n] ? n : f);
    function packs() {
      // the stalker AI is registered by zz_monsters_new.js (it loads after this file); fall back to flank without it
      if (typeof AI22 !== 'object' || !AI22.stalker) for (const k of NATIVES) if (MON[k].ai === 'stalker') MON[k].ai = 'flank';
      return {
        marrow:   [['a5_sapper', 3, 4], ['a5_sapper', 2, 3, 'a5_osteo', 1, 1], ['a5_ribward', 2, 2, 'a5_sapper', 2, 3], ['a5_osteo', 1, 2], [K('marrow', 'a5_sapper'), 2, 3, 'a5_sapper', 1, 2]],
        sanguine: [['a5_leaper', 3, 5], ['a5_tumor', 1, 2, 'a5_leaper', 2, 3], ['a5_tumor', 2, 2], ['a5_leaper', 2, 3, 'a5_sapper', 1, 2]],
        shaft:    [['a5_wraith', 2, 3], ['a5_synapse', 2, 3], ['a5_wraith', 1, 2, 'a5_synapse', 1, 2], ['a5_synapse', 1, 1, 'a5_leaper', 2, 3]],
        crucible: [['a5_parasite', 2, 3], ['a5_corroder', 2, 3], ['a5_parasite', 1, 2, 'a5_corroder', 1, 2], ['a5_tumor', 1, 1, 'a5_parasite', 2, 2]],
        cerebrum: [['a5_thought', 3, 4], ['a5_sentinel', 2, 3], ['a5_thought', 2, 3, 'a5_wraith', 1, 2], ['a5_sentinel', 1, 2, 'a5_synapse', 1, 2]],
        temple:   [['a5_sentinel', 2, 3], ['a5_thought', 2, 3, 'a5_sentinel', 1, 1], ['a5_sentinel', 1, 1, 'a5_wraith', 2, 2]],
        scar:     [['a5_nullshade', 2, 3], ['a5_silence', 1, 2, 'a5_nullshade', 1, 2], ['a5_nullshade', 3, 4]]
      };
    }

    // packs, chests and shrines; monster level climbs with walking distance from the start
    function populate(z, rng, table, lo, hi, o) {
      const W = z.w, d0 = bfsDist(z, Math.floor(z.start.x), Math.floor(z.start.y));
      let dmax = 1; for (let i = 0; i < d0.length; i++) if (d0[i] > dmax) dmax = d0[i];
      const df = distField(z), spots = [];
      for (let y = 3; y < z.h - 3; y++) for (let x = 3; x < W - 3; x++) { const i = y * W + x, t = z.t[i]; if (d0[i] > (o.minDist || 20) && df[i] >= 2 && t !== T.SHALLOW && walk(t)) spots.push([x, y, d0[i]]); }
      shuffle(rng, spots);
      const used = z.objects.filter(q => q.type === 'portal' || q.type === 'lantern').map(q => [q.x, q.y, 9]);
      (o.avoid || []).forEach(a => used.push([a.x, a.y, a.r]));
      const far = (x, y, r) => used.every(([ux, uy, ur]) => Math.hypot(ux - x, uy - y) > Math.max(r, ur || 0));
      const nPack = o.packs != null ? o.packs : Math.round(countWalk(z) / (o.per || 240));
      let np = 0, nc = 0, ns = 0;
      for (const [x, y, d] of spots) {
        const lv = clamp(lo + Math.round((hi - lo) * d / dmax), lo, hi);
        if (np < nPack && far(x, y, o.spacing || 12)) { placePack(z, x + 0.5, y + 0.5, lv, table, z.id + '_' + np, rng); used.push([x, y, 0]); np++; continue; }
        if (nc < (o.chests || 8) && far(x, y, 6)) { z.objects.push({ type: 'chest', x: x + 0.5, y: y + 0.5, open: false, ilvl: lv + 1 }); used.push([x, y, 0]); nc++; continue; }
        if (ns < (o.shrines || 3) && far(x, y, 8)) { z.objects.push({ type: 'shrine', x: x + 0.5, y: y + 0.5, used: false, kind: pickR(rng, ['echo', 'wisp', 'stone', 'refill']) }); used.push([x, y, 0]); ns++; }
      }
      z.a5packs = np;
    }
    function prop(z, kind, x, y, extra) { z.props.push(Object.assign({ kind, x, y, a5: true }, extra || {})); }

    // =============================================================== a5_town — The Last Vigil
    function genTown(seed) {
      const rng = mulberry32(seed), W = 104, H = 104;
      const z = cave('a5_town', 'The Last Vigil', W, H, 0.42, 'a5_town');
      blob(z, 52, 54, 45, 43, rng, T.FLOOR, 0.1);
      smooth(z, 2);
      // the sinkhole in the south-east: the throat of the descent
      const sink = { x: 76, y: 76 };
      blob(z, sink.x, sink.y, 13, 11, rng, VOID, 0.18, t => t === T.FLOOR); z.a5void = true;
      const plaza = { x: 46, y: 48 };
      disc(z, plaza.x, plaza.y, 13.5, T.FLAGS, t => t === T.FLOOR);
      // the northern cut toward the Scar, the western road you came down by
      stroke(z, wobble(rng, { x: 52, y: 24 }, { x: 54, y: 4 }, 0.12), 5, T.FLOOR, t => t === T.WALL);
      stroke(z, wobble(rng, { x: 20, y: 50 }, { x: 4, y: 48 }, 0.1), 5, T.FLOOR, t => t === T.WALL);
      // the stair-lip: a road from the plaza to the rim of the sink
      const toSink = Math.atan2(plaza.y - sink.y, plaza.x - sink.x), lip = { x: sink.x + Math.cos(toSink) * 17, y: sink.y + Math.sin(toSink) * 17 };
      stroke(z, [plaza, lip], 1.6, T.ROAD, t => t === T.FLOOR || t === T.FLAGS);
      stroke(z, wobble(rng, plaza, { x: 53, y: 10 }, 0.1), 1.6, T.ROAD, t => t === T.FLOOR || t === T.FLAGS);
      stroke(z, wobble(rng, plaza, { x: 6, y: 48 }, 0.1), 1.6, T.ROAD, t => t === T.FLOOR || t === T.FLAGS);
      // standing stones ring the plaza with wide gaps
      for (let i = 0; i < 10; i++) { const a = i / 10 * 6.283 + 0.3, px = Math.floor(plaza.x + Math.cos(a) * 15.5), py = Math.floor(plaza.y + Math.sin(a) * 15.5); if (z.get(px, py) === T.FLOOR) z.set(px, py, T.PILLAR); }
      // a few fallen blocks in the far cavern
      for (let k = 0; k < 14; k++) { const x = 10 + Math.floor(rng() * (W - 20)), y = 10 + Math.floor(rng() * (H - 20)); if (Math.hypot(x - plaza.x, y - plaza.y) > 22 && z.get(x, y) === T.FLOOR && distField(z)[y * W + x] > 4) z.set(x, y, T.ROCK); }
      openWalk(z, 3); fixPinches(z, 3);
      keepMain(z, plaza.x, plaza.y);
      z.start = { x: plaza.x + 0.5, y: plaza.y + 4.5 };
      addLantern(z, plaza.x, plaza.y - 2, 'The Last Vigil');
      z.npcSpots = [
        { x: plaza.x - 7.5, y: plaza.y - 6.5, role: 'vendor' },
        { x: plaza.x + 8.5, y: plaza.y - 6.5, role: 'healer' },
        { x: plaza.x - 7.5, y: plaza.y + 7.5, role: 'stash' },
        { x: plaza.x + 8.5, y: plaza.y + 7.5, role: 'smith' }
      ].map(s => Object.assign(spot(z, s.x, s.y, 1), { role: s.role }));
      z.upSpot = spot(z, 7, 48, 1);   // where the road down from Act 4 comes in (the Quest agent's portal)
      z.questSpots = { actGate: z.upSpot, waypoint: spot(z, plaza.x + 4, plaza.y + 1, 1) };
      addPortal(z, lip.x, lip.y, 'a5_highway', 'Down into the Marrow Catacombs', 'stairs');
      addPortal(z, 54, 7, 'a5_scar', 'Toward the Scar of Ur-Nihl', 'cave');
      prop(z, 'a5_sinkhole', sink.x + 0.5, sink.y + 0.5, { r: 12 });
      prop(z, 'a5_vigil_fire', plaza.x + 0.5, plaza.y + 1.5);
      z.isTown = true; z.safe = true;
      return z;
    }

    // =============================================================== a5_highway — The Grand Calcified Highway
    function genHighway(seed) {
      const rng = mulberry32(seed), W = 196, H = 92, cy = H / 2;
      const z = cave('a5_highway', 'The Grand Calcified Highway', W, H, 0.6, 'a5_marrow');
      const n = makeNoise(rng), ph = rng() * 6.28;
      const spineY = x => cy + 13 * Math.sin(x / 31 + ph) + (n(x / 22, 3.3) - 0.5) * 10;
      const spine = []; for (let x = 3; x <= W - 4; x += 3) spine.push({ x, y: spineY(x) });
      // the canal itself: wide, breathing in and out at each vertebra
      stroke(z, spine, k => { const x = 3 + k * (W - 7); return 8.2 + 1.6 * Math.cos(x / 24 * 6.283) + (n(x / 9, 7.7) - 0.5) * 2.4; }, T.FLOOR);
      // side foramina: passages out to the nerve-root chambers, some joined to each other
      const chambers = [];
      for (let vx = 30, side = rng() < 0.5 ? 1 : -1; vx < W - 24; vx += 24, side = -side) {
        if (rng() < 0.28) continue;
        const sy = spineY(vx), ty = side > 0 ? Math.min(H - 16, sy + 26 + rng() * 6) : Math.max(15, sy - 26 - rng() * 6), tx = vx + (rng() - 0.5) * 14;
        if (Math.abs(ty - sy) < 16) continue;
        stroke(z, wobble(rng, { x: vx, y: sy }, { x: tx, y: ty }, 0.18), 4.2, T.FLOOR);
        const c = { x: tx, y: ty, r: 9 + rng() * 4, side };
        blob(z, c.x, c.y, c.r * 1.25, c.r, rng, T.FLOOR, 0.18);
        chambers.push(c);
      }
      // chambers on the same side run into each other through the bone: alternate routes
      for (let i = 0; i < chambers.length; i++) for (let j = i + 1; j < chambers.length; j++) {
        const a = chambers[i], b = chambers[j];
        if (a.side === b.side && Math.abs(a.x - b.x) < 56 && rng() < 0.6) { stroke(z, wobble(rng, a, b, 0.2), 4, T.FLOOR); break; }
      }
      smooth(z, 2);
      // the paved way along the canal floor
      stroke(z, spine, 1.7, T.ROAD, t => t === T.FLOOR);
      // vertebral arches: ribbed posts on both flanks every 24 yards, never in the way
      const df = distField(z);
      for (let vx = 18; vx < W - 10; vx += 24) {
        const x0 = vx, y0 = spineY(vx), tx = 1, ty = spineY(vx + 1) - y0, tl = Math.hypot(tx, ty), nx = -ty / tl, ny = tx / tl;
        for (const s of [-1, 1]) {
          // walk out to the wall, step back two
          let r = 3; while (r < 14 && walk(z.get(Math.floor(x0 + nx * s * r), Math.floor(y0 + ny * s * r)))) r++;
          for (const off of [-1.5, 1.5]) { const px = Math.floor(x0 + nx * s * (r - 1) + off), py = Math.floor(y0 + ny * s * (r - 1)); if (z.get(px, py) === T.FLOOR && df[py * W + px] >= 1) z.set(px, py, T.PILLAR); }
          prop(z, 'a5_tallow', x0 + nx * s * (r - 3) + 0.5, y0 + ny * s * (r - 3) + 0.5);
        }
      }
      // marrow-tallow shrines in the chambers, and bone rubble here and there
      for (const c of chambers) { prop(z, 'a5_tallow_shrine', c.x + 0.5, c.y + 0.5); const d2 = distField(z); for (let k = 0; k < 5; k++) { const x = Math.floor(c.x + (rng() - 0.5) * c.r * 1.6), y = Math.floor(c.y + (rng() - 0.5) * c.r * 1.2); if (z.get(x, y) === T.FLOOR && d2[y * W + x] >= 4) z.set(x, y, T.ROCK); } }
      openWalk(z, 3); fixPinches(z, 3);
      const sY = spineY(6), eY = spineY(W - 7);
      keepMain(z, 8, sY);
      z.start = spot(z, 10, sY, 1);
      addPortal(z, 5, sY, 'a5_town', 'Up to the Last Vigil', 'stairs');
      addLantern(z, 12, sY - 4, 'Highway Threshold');
      const midX = W * 0.52; addLantern(z, midX, spineY(midX), 'The Tallow Nave');
      addPortal(z, W - 6, eY, 'a5_siphon', 'Into the Siphon Vaults', 'gate');
      populate(z, rng, packs().marrow, 34, 35, { per: 300, spacing: 14, chests: 12, shrines: 4 });
      z.a5 = { spine, chambers: chambers.length };
      return z;
    }

    // =============================================================== a5_siphon — The Siphon Vaults
    function genSiphon(seed) {
      const rng = mulberry32(seed), W = 144, H = 144, S = 48;
      const z = cave('a5_siphon', 'The Siphon Vaults', W, H, 0.65, 'a5_marrow');
      const V = [];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) {
        const mid = i === 1 && j === 1, cx = 24 + S * i + (mid ? 0 : (rng() - 0.5) * 6), cy = 24 + S * j + (mid ? 0 : (rng() - 0.5) * 6), hw = mid ? 17 : 12 + rng() * 3.5, hh = mid ? 17 : 12 + rng() * 3.5;
        V.push({ i, j, x: cx, y: cy, hw, hh });
        for (let y = Math.floor(cy - hh); y <= cy + hh; y++) for (let x = Math.floor(cx - hw); x <= cx + hw; x++) { const dx = Math.abs(x + 0.5 - cx), dy = Math.abs(y + 0.5 - cy); if (dx + dy <= hw + hh - 6 && inb(z, x, y)) z.set(x, y, T.FLOOR); }
      }
      // galleries: a random spanning tree of the grid plus a few loops; straight and broad, with rails down the middle
      const E = [];
      for (const a of V) for (const b of V) if ((b.i === a.i + 1 && b.j === a.j) || (b.j === a.j + 1 && b.i === a.i)) E.push([a, b, rng()]);
      E.sort((p, q) => p[2] - q[2]);
      const par = new Map(V.map(v => [v, v])), find = v => { while (par.get(v) !== v) v = par.get(v); return v; }, gal = [];
      for (const e of E) { const a = find(e[0]), b = find(e[1]); if (a !== b) { par.set(a, b); gal.push(e); } else if (rng() < 0.35) gal.push(e); }
      for (const [a, b] of gal) {
        const mid = a.i === b.i ? { x: (a.x + b.x) / 2 + (rng() - 0.5) * 6, y: (a.y + b.y) / 2 } : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + (rng() - 0.5) * 6 };
        stroke(z, [a, mid, b], 4.6, T.FLOOR, t => t === T.WALL);
        stroke(z, [a, mid, b], 1.1, T.ROAD, t => t === T.FLOOR);
      }
      // the Sump: a marrow pit in the centre vault, ringed by bucket-chain rigs
      const C = V[4];
      disc(z, C.x, C.y, 5, T.WATER);
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + 0.39, px = Math.floor(C.x + Math.cos(a) * 11.5), py = Math.floor(C.y + Math.sin(a) * 11.5); if (walk(z.get(px, py))) z.set(px, py, T.PILLAR); }
      prop(z, 'a5_marrow_pit', C.x, C.y, { r: 5 });
      // bucket rigs in some of the other vaults: two rows of posts, far apart
      for (const v of V) {
        if (v === C || rng() < 0.45) continue;
        for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) { const px = Math.floor(v.x + k * 7), py = Math.floor(v.y + s * 5.5); if (z.get(px, py) === T.FLOOR) { z.set(px, py, T.PILLAR); prop(z, 'a5_bucket_chain', px + 0.5, py + 0.5); } }
      }
      smooth(z, 1);
      // entry from the west on the middle-left vault, exit east on a corner vault
      const A = V[3], B = rng() < 0.5 ? V[2] : V[8];
      stroke(z, [{ x: A.x - A.hw + 2, y: A.y }, { x: 3, y: A.y }], 4.4, T.FLOOR);
      stroke(z, [{ x: B.x + B.hw - 2, y: B.y }, { x: W - 4, y: B.y }], 4.4, T.FLOOR);
      openWalk(z, 3); fixPinches(z, 3);
      keepMain(z, A.x, A.y, T.WALL);
      z.start = spot(z, 8, A.y, 1);
      addPortal(z, 5, A.y, 'a5_highway', 'Back to the Calcified Highway', 'gate');
      addLantern(z, A.x, A.y - 4, 'Siphon Gallery');
      addLantern(z, C.x, C.y + 10, 'The Sump');
      addPortal(z, W - 6, B.y, 'a5_skerries', 'Down to the Sanguine Cavity', 'stairs');
      populate(z, rng, packs().marrow, 35, 36, { per: 300, spacing: 14, chests: 12, shrines: 4 });
      return z;
    }

    // =============================================================== a5_skerries — The Sanguine Cavity
    function genSkerries(seed) {
      const rng = mulberry32(seed), W = 184, H = 168, cx = W / 2, cy = H / 2;
      const z = cave('a5_skerries', 'The Sanguine Cavity', W, H, 0.55, 'a5_sanguine');
      blob(z, cx, cy, 86, 78, rng, T.FLOOR, 0.08);
      smooth(z, 2);
      // the boiling sea: it meets the cavern wall north and south, so the way on is across the skerries
      blob(z, cx, cy, 58, 90, rng, T.WATER, 0.1, t => t === T.FLOOR);
      const inSea = (x, y) => z.get(Math.floor(x), Math.floor(y)) === T.WATER;
      const isl = poisson(rng, 13, 900, () => { const p = { x: cx + (rng() - 0.5) * 100, y: cy + (rng() - 0.5) * 140, r: 6 + rng() * 6 }; return inSea(p.x, p.y) && inSea(p.x + p.r + 3, p.y) && inSea(p.x - p.r - 3, p.y) && inSea(p.x, p.y + p.r + 3) && inSea(p.x, p.y - p.r - 3) ? p : null; }, (p, q) => p.r + q.r + 9);
      for (const p of isl) blob(z, p.x, p.y, p.r * 1.2, p.r, rng, T.FLOOR, 0.25, t => t === T.WATER);
      // landings on each shore
      const shoreX = s => { let x = s < 0 ? 4 : W - 5; while (x > 3 && x < W - 4 && z.get(x, Math.floor(cy)) !== T.WATER) x -= s; return x + s * 4; };
      const west = [{ x: shoreX(-1), y: cy - 22 }, { x: shoreX(-1), y: cy + 22 }], east = [{ x: shoreX(1), y: cy - 22 }, { x: shoreX(1), y: cy + 22 }];
      const nodes = isl.concat(west, east);
      // shallows between them: walkable red wash, six wide
      for (const e of graphEdges(rng, nodes, 46, 0.3)) { const a = nodes[e.i], b = nodes[e.j]; if (west.includes(a) && west.includes(b)) continue; if (east.includes(a) && east.includes(b)) continue; stroke(z, wobble(rng, a, b, 0.14), 3.6, T.SHALLOW, t => t === T.WATER); }
      // a thin wash where the sea laps the land
      for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if (z.get(x, y) === T.WATER && rng() < 0.45 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => z.get(x + dx, y + dy) === T.FLOOR)) z.set(x, y, T.SHALLOW);
      // scab: hardened crust on the islands
      const nm = makeNoise(rng);
      for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if (z.get(x, y) === T.FLOOR && nm(x / 6, y / 6) > 0.62) z.set(x, y, T.MUD);
      // wrecks of petrified bone-timber beached on a few skerries
      const wrecks = shuffle(rng, isl.slice()).slice(0, 3);
      for (const p of wrecks) { const a0 = rng() * 3.14; for (let k = -4; k <= 4; k++) { const hx = Math.floor(p.x + Math.cos(a0) * k), hy = Math.floor(p.y + Math.sin(a0) * k * 0.6); if (Math.abs(k) >= 2 && walk(z.get(hx, hy + (k % 2 ? 2 : -2)))) z.set(hx, hy + (k % 2 ? 2 : -2), T.RUIN); } prop(z, 'a5_bone_wreck', p.x, p.y); }
      for (let k = 0; k < 18; k++) { const p = { x: cx + (rng() - 0.5) * 110, y: cy + (rng() - 0.5) * 150 }; if (inSea(p.x, p.y)) prop(z, 'a5_blood_steam', p.x, p.y); }
      stroke(z, [{ x: W - 14, y: cy }, { x: W - 4, y: cy }], 3.5, T.FLOOR, t => t === T.WALL);
      stroke(z, [{ x: 14, y: cy }, { x: 3, y: cy }], 3.5, T.FLOOR, t => t === T.WALL);
      openWalk(z, 3); fixPinches(z, 3);
      const sx = shoreX(-1) - 10;
      keepMain(z, sx, cy);
      z.start = spot(z, sx, cy, 1);
      addPortal(z, 5, cy, 'a5_siphon', 'Up to the Siphon Vaults', 'stairs');
      addLantern(z, sx + 2, cy - 5, 'Scab Landing');
      const midI = isl.slice().sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy))[0];
      if (midI) addLantern(z, midI.x, midI.y, 'The Drowned Keel');
      addPortal(z, W - 6, cy, 'a5_valves', 'Through to the Valve Gates', 'gate');
      populate(z, rng, packs().sanguine, 36, 37, { per: 320, spacing: 15, chests: 10, shrines: 4 });
      return z;
    }

    // =============================================================== a5_valves — The Valve Gates
    function genValves(seed) {
      const rng = mulberry32(seed), W = 132, H = 132, cx = W / 2, cy = H / 2;
      const z = cave('a5_valves', 'The Valve Gates', W, H, 0.6, 'a5_sanguine');
      const ch = [];
      for (let k = 0; k < 6; k++) { const a = Math.PI + k / 6 * 6.283 + (rng() - 0.5) * 0.25; ch.push({ x: cx + Math.cos(a) * 40, y: cy + Math.sin(a) * 40, r: 12.5 + rng() * 3.5 }); }
      const heart = { x: cx, y: cy, r: 15 }; ch.push(heart);
      for (const c of ch) blob(z, c.x, c.y, c.r, c.r * (0.85 + rng() * 0.3), rng, T.FLOOR, 0.16);
      // ring links (one left shut) and three spokes to the heart
      const shut = 1 + Math.floor(rng() * 5), links = [];
      for (let k = 0; k < 6; k++) if (k !== shut) links.push([ch[k], ch[(k + 1) % 6]]);
      for (const k of shuffle(rng, [0, 1, 2, 3, 4, 5]).slice(0, 3)) links.push([ch[k], heart]);
      const gates = [];
      for (const [a, b] of links) {
        const path = wobble(rng, a, b, 0.12, 2);
        stroke(z, path, 4.6, T.FLOOR);
        // the valve: tendon cusps on both flanks at the midpoint, the throat still eight wide
        const m = path[Math.floor(path.length / 2)], L = Math.hypot(b.x - a.x, b.y - a.y), nx = -(b.y - a.y) / L, ny = (b.x - a.x) / L;
        gates.push({ x: m.x, y: m.y, nx, ny });
      }
      smooth(z, 2);
      for (const g of gates) { for (const s of [-1, 1]) for (const t of [-1.2, 0, 1.2]) { const px = Math.floor(g.x + g.nx * s * 3.9 + g.ny * t), py = Math.floor(g.y + g.ny * s * 3.9 - g.nx * t); if (z.get(px, py) === T.FLOOR) z.set(px, py, T.PILLAR); } prop(z, 'a5_valve_cusp', g.x, g.y); }
      // clotted pools and crusts in the chambers
      for (const c of ch) { if (c !== heart && rng() < 0.65) blob(z, c.x + (rng() - 0.5) * c.r * 0.6, c.y + (rng() - 0.5) * c.r * 0.6, 3 + rng() * 2.5, 2.5 + rng() * 2, rng, T.SHALLOW, 0.2, t => t === T.FLOOR); }
      const nm = makeNoise(rng);
      for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if (z.get(x, y) === T.FLOOR && nm(x / 5, y / 5) > 0.68) z.set(x, y, T.MUD);
      // the heart: a pulsing pool ringed by four cusps
      disc(z, heart.x, heart.y, 4, T.SHALLOW, t => t === T.FLOOR || t === T.MUD);
      prop(z, 'a5_heart_valve', heart.x, heart.y, { r: 4 });
      const A = ch[0], B = ch[3];
      stroke(z, [{ x: A.x - A.r + 2, y: A.y }, { x: 3, y: A.y }], 4.4, T.FLOOR);
      stroke(z, [{ x: B.x + B.r - 2, y: B.y }, { x: W - 4, y: B.y }], 4.4, T.FLOOR);
      openWalk(z, 3); fixPinches(z, 3);
      keepMain(z, A.x, A.y);
      z.start = spot(z, 8, A.y, 1);
      addPortal(z, 5, A.y, 'a5_skerries', 'Back across the Sanguine Cavity', 'gate');
      addLantern(z, A.x + 3, A.y - 5, 'The Pulmonic Gate');
      addLantern(z, heart.x, heart.y + 8, 'The Tricuspid Heart');
      addPortal(z, W - 6, B.y, 'a5_shaft', 'Into the Shaft of Fading Echoes', 'stairs');
      populate(z, rng, packs().sanguine, 36, 37, { per: 300, spacing: 14, chests: 10, shrines: 3 });
      return z;
    }

    // =============================================================== a5_shaft — The Shaft of Fading Echoes
    function genShaft(seed) {
      const rng = mulberry32(seed), W = 164, H = 164, cx = W / 2, cy = H / 2;
      const z = cave('a5_shaft', 'The Shaft of Fading Echoes', W, H, 0.7, 'a5_shaft');
      blob(z, cx, cy, 76, 76, rng, VOID, 0.05); z.a5void = true;
      const west = { x: 12, y: cy + (rng() - 0.5) * 20, r: 12 }, east = { x: W - 13, y: cy + (rng() - 0.5) * 20, r: 12 }, bell = { x: cx, y: cy, r: 13 };
      blob(z, west.x, west.y, 13, 16, rng, T.FLOOR, 0.15); blob(z, east.x, east.y, 13, 16, rng, T.FLOOR, 0.15);
      disc(z, bell.x, bell.y, bell.r, T.FLOOR);
      const gang = poisson(rng, 11, 900, () => { const a = rng() * 6.283, d = 24 + rng() * 44; return { x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d, r: 5 + rng() * 4 }; }, (p, q) => p.r + q.r + 12);
      const nodes = [west, east, bell].concat(gang.filter(g => Math.hypot(g.x - west.x, g.y - west.y) > g.r + 16 && Math.hypot(g.x - east.x, g.y - east.y) > g.r + 16));
      for (const g of nodes.slice(3)) blob(z, g.x, g.y, g.r, g.r * 0.9, rng, T.FLOOR, 0.2);
      // nerve-strand bridges: five-plus wide, a gentle sag in each span
      const bridges = graphEdges(rng, nodes, 60, 0.35);
      // the bell hangs where every strand meets: make sure both ledges reach it by some road
      for (const e of bridges) { const a = nodes[e.i], b = nodes[e.j]; stroke(z, wobble(rng, a, b, 0.07, 2), 3.2, T.ROAD, t => t === VOID); }
      // the bell's frame: six posts at the edge of the platform, the floor under it open for the fight
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + 0.26, px = Math.floor(bell.x + Math.cos(a) * 10), py = Math.floor(bell.y + Math.sin(a) * 10); if (z.get(px, py) === T.FLOOR) z.set(px, py, T.PILLAR); }
      prop(z, 'a5_hanging_bell', bell.x, bell.y, { r: 5 });
      // stray matter drifting in the abyss
      for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if (z.get(x, y) === VOID && rng() < 0.004) prop(z, 'a5_nerve_mote', x + 0.5, y + 0.5);
      openWalk(z, 3); fixPinches(z, 3, T.ROAD, 3, true);
      keepMain(z, west.x, west.y, VOID);
      z.start = spot(z, west.x, west.y, 1);
      addPortal(z, 5, west.y, 'a5_valves', 'Back to the Valve Gates', 'stairs');
      addLantern(z, west.x + 3, west.y - 5, 'Echo Ledge');
      addLantern(z, bell.x, bell.y + 6, 'The Hanging Bell of Reminiscence');
      const bs = spot(z, bell.x + 3, bell.y - 3, 1); z.objects.push({ type: 'shrine', x: bs.x, y: bs.y, used: false, kind: 'echo', name: 'Strike the Bell' });
      addPortal(z, W - 6, east.y, 'a5_crucible', 'Down to the Digesting Crucible', 'stairs');
      populate(z, rng, packs().shaft, 37, 38, { per: 240, spacing: 13, chests: 9, shrines: 3, avoid: [{ x: bell.x, y: bell.y, r: 6 }] });
      z.a5 = { bridges: bridges.length, nodes: nodes.length };
      return z;
    }

    // =============================================================== a5_crucible — The Digesting Crucible
    function genCrucible(seed) {
      const rng = mulberry32(seed), W = 164, H = 152;
      const z = cave('a5_crucible', 'The Digesting Crucible', W, H, 0.6, 'a5_crucible');
      const west = { x: 22, y: H / 2 + (rng() - 0.5) * 30, r: 18 }, east = { x: W - 23, y: H / 2 + (rng() - 0.5) * 30, r: 18 };
      const ch = [west, east].concat(poisson(rng, 6, 600, () => ({ x: 40 + rng() * (W - 80), y: 24 + rng() * (H - 48), r: 15 + rng() * 8 }), (p, q) => p.r + q.r - 2));
      for (const c of ch) blob(z, c.x, c.y, c.r * 1.15, c.r, rng, T.FLOOR, 0.2);
      for (const e of graphEdges(rng, ch, 90, 0.3)) stroke(z, wobble(rng, ch[e.i], ch[e.j], 0.15), 6.2, T.FLOOR);
      smooth(z, 2);
      // the acid basins, each with a rim of bile shallows (they burn the feet)
      const basins = [];
      for (const c of shuffle(rng, ch.slice(2))) { if (basins.length >= 6) break; const b = { x: c.x + (rng() - 0.5) * c.r * 0.5, y: c.y + (rng() - 0.5) * c.r * 0.5, r: 5 + rng() * 4 }; blob(z, b.x, b.y, b.r * 1.3, b.r, rng, T.SHALLOW, 0.2, t => t === T.FLOOR); blob(z, b.x, b.y, b.r * 1.3 - 2.2, b.r - 2.2, rng, T.WATER, 0.15, t => t === T.SHALLOW); basins.push(b); prop(z, 'a5_acid_basin', b.x, b.y, { r: b.r }); }
      // grinding bone-piles: loose drifts of rubble
      for (let k = 0; k < 8; k++) { const c = pickR(rng, ch), px = c.x + (rng() - 0.5) * c.r, py = c.y + (rng() - 0.5) * c.r; const d = distField(z); for (let m = 0; m < 16; m++) { const x = Math.floor(px + (rng() - 0.5) * 8), y = Math.floor(py + (rng() - 0.5) * 8); if (z.get(x, y) === T.FLOOR && d[y * W + x] >= 4 && rng() < 0.45) z.set(x, y, T.ROCK); } prop(z, 'a5_bone_grind', px, py); }
      // ruins of the Forgotten Epoch: hexagonal courts of non-human stone, three gaps each
      const ruins = [];
      for (const c of shuffle(rng, ch.slice(2))) {
        if (ruins.length >= 3) break;
        const R = 7, a0 = rng() * 1.05, gaps = new Set(shuffle(rng, [0, 1, 2, 3, 4, 5]).slice(0, 3));
        let ok = true; const d = distField(z); if (d[Math.floor(c.y) * W + Math.floor(c.x)] < 9) ok = false; if (!ok) continue;
        for (let s = 0; s < 6; s++) {
          if (gaps.has(s)) continue;
          const p = { x: c.x + Math.cos(a0 + s * 1.047) * R, y: c.y + Math.sin(a0 + s * 1.047) * R }, q = { x: c.x + Math.cos(a0 + (s + 1) * 1.047) * R, y: c.y + Math.sin(a0 + (s + 1) * 1.047) * R };
          for (let k = 0.15; k <= 0.85; k += 0.08) { const x = Math.floor(p.x + (q.x - p.x) * k), y = Math.floor(p.y + (q.y - p.y) * k); if (z.get(x, y) === T.FLOOR || z.get(x, y) === T.MUD) z.set(x, y, rng() < 0.2 ? T.FLAGS : T.RUIN); }
        }
        disc(z, c.x, c.y, R - 1.5, T.FLAGS, t => t === T.FLOOR);
        for (let s = 0; s < 3; s++) { const x = Math.floor(c.x + Math.cos(a0 + s * 2.094) * 2.5), y = Math.floor(c.y + Math.sin(a0 + s * 2.094) * 2.5); z.set(x, y, T.PILLAR); }
        ruins.push(c); prop(z, 'a5_epoch_ruin', c.x, c.y);
      }
      openWalk(z, 3); fixPinches(z, 3);
      keepMain(z, west.x, west.y);
      stroke(z, [{ x: west.x - 8, y: west.y }, { x: 3, y: west.y }], 4.4, T.FLOOR, t => t === T.WALL);
      stroke(z, [{ x: east.x + 8, y: east.y }, { x: W - 4, y: east.y }], 4.4, T.FLOOR, t => t === T.WALL);
      keepMain(z, west.x, west.y);
      z.start = spot(z, 9, west.y, 1);
      addPortal(z, 5, west.y, 'a5_shaft', 'Up into the Shaft of Fading Echoes', 'stairs');
      addLantern(z, west.x, west.y - 6, 'Crucible Brink');
      { const L = ruins[0] || ch.slice(2).sort((p, q) => Math.hypot(p.x - W / 2, p.y - H / 2) - Math.hypot(q.x - W / 2, q.y - H / 2))[0] || east; addLantern(z, L.x, L.y + 2, 'The Swallowed Crowns'); }
      addPortal(z, W - 6, east.y, 'a5_cerebrum', 'The Optic Chiasm Gate', 'gate');
      // swallowed treasures on the basin rims
      for (const b of basins.slice(0, 3)) { const p = spot(z, b.x + b.r * 1.3 + 2, b.y, 0); z.objects.push({ type: 'chest', x: p.x, y: p.y, open: false, ilvl: 40 }); }
      populate(z, rng, packs().crucible, 38, 39, { per: 300, spacing: 14, chests: 10, shrines: 4 });
      z.a5 = { basins: basins.length, ruins: ruins.length };
      return z;
    }

    // =============================================================== the labyrinth: sulci between gyri
    // A band-limited random wave field (many plane waves of one wavelength, random directions and phases), domain
    // warped so the folds wander. Where the field is high, bone (gyri); where low, open sulci. Chambers are forced
    // open by pushing the field down. Pinches are opened away, then every fold is joined to its neighbours by wide
    // doors: a random spanning tree for certainty plus extra doors for loops, so the maze has choices and circuits.
    function brainField(W, H, rng, lambda, nWaves, warp) {
      const k0 = 6.2832 / lambda, waves = [];
      for (let i = 0; i < nWaves; i++) { const a = (i + rng()) / nWaves * Math.PI, kk = k0 * (0.92 + 0.16 * rng()); waves.push([Math.cos(a) * kk, Math.sin(a) * kk, rng() * 6.2832]); }
      const n1 = makeNoise(rng), n2 = makeNoise(rng), F = new Float32Array(W * H), norm = Math.sqrt(2 / nWaves);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const wx = x + (fbm(n1, x / 26, y / 26) - 0.47) * warp, wy = y + (fbm(n2, x / 26 + 9, y / 26 + 9) - 0.47) * warp;
        let s = 0; for (const [kx, ky, p] of waves) s += Math.cos(kx * wx + ky * wy + p);
        F[y * W + x] = s * norm;
      }
      return F;
    }
    function carveLabyrinth(z, rng, o) {
      const W = z.w, H = z.h, F = brainField(W, H, rng, o.lambda, 28, o.warp);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const i = y * W + x; let f = F[i];
        if (!o.mask(x + 0.5, y + 0.5)) f = 9;
        for (const c of o.chambers) { const d = Math.hypot(x + 0.5 - c.x, y + 0.5 - c.y); if (d < c.r) f = Math.min(f, -2); else if (d < c.r + 4) f -= 1.2 * (1 - (d - c.r) / 4); }
        F[i] = f;
        if (inb(z, x, y, 3) && f < o.theta) z.t[i] = T.FLOOR;
      }
      if (o.pre) o.pre(z);
      openWalk(z, 3.5);
      const doors = connectAll(z, rng, { doorR: 4.1, loops: o.loops, maxLoop: o.maxLoop || 16, minSize: 80, keep: o.keep, carve: t => t === T.WALL || t === T.CLIFF || t === VOID });
      openWalk(z, 3.5);
      fixPinches(z, 3.5);
      return { F, doors };
    }

    // =============================================================== a5_cerebrum — The Cerebrum Labyrinth
    function genCerebrum(seed) {
      const rng = mulberry32(seed), W = 208, H = 208, cx = W / 2, cy = 98;
      const z = cave('a5_cerebrum', 'The Cerebrum Labyrinth', W, H, 0.62, 'a5_cerebrum');
      const nm = makeNoise(rng);
      const skull = (x, y) => { const dx = (x - cx) / 96, dy = (y - cy) / 90, a = Math.atan2(dy, dx); return dx * dx + dy * dy < Math.pow(1 + (nm(Math.cos(a) * 2 + 5, Math.sin(a) * 2 + 5) - 0.5) * 0.08, 2); };
      // the Optic Chiasm Gate: an eye-shaped chamber at the front of the skull (a lens of two circles)
      const eye = { x: cx, y: 180 }, lens = (x, y) => Math.hypot(x - eye.x, y - (eye.y - 13)) < 24 && Math.hypot(x - eye.x, y - (eye.y + 13)) < 24;
      const heart = { x: cx, y: cy - 2, r: 15 };
      const chambers = [heart, { x: eye.x, y: eye.y, r: 10 }];
      for (const a of [0.35, 1.25, 2.1, 3.0, 4.0, 5.0].map(v => v + (rng() - 0.5) * 0.4)) { const d = 50 + rng() * 22, p = { x: cx + Math.cos(a) * d * 1.05, y: cy + Math.sin(a) * d, r: 8.5 + rng() * 3.5 }; if (skull(p.x, p.y) && Math.hypot(p.x - eye.x, p.y - eye.y) > 36) chambers.push(p); }
      const keep = chambers.map(c => ({ x: c.x, y: c.y }));
      const res = carveLabyrinth(z, rng, {
        lambda: 21, warp: 10, theta: 0.1, loops: 0.3, maxLoop: 18, keep,
        mask: (x, y) => skull(x, y) || lens(x, y), chambers,
        pre: zz => {
          // the eye opens whole; its rim is set with crystal fibres
          for (let y = 150; y < H - 3; y++) for (let x = 60; x < W - 60; x++) if (lens(x + 0.5, y + 0.5)) zz.set(x, y, T.FLOOR);
          // the longitudinal fissure: a black rift from the crown to the heart, crossed only where doors bridge it
          stroke(zz, wobble(rng, { x: cx, y: 12 }, { x: cx, y: heart.y - heart.r - 3 }, 0.05, 3), 2.6, VOID); zz.a5void = true;
        }
      });
      // crystal fibres around the eye's rim and solidified thought in the widest places
      for (let k = 0; k < 40; k++) { const a = k / 40 * 6.283, x = Math.floor(eye.x + Math.cos(a) * 19), y = Math.floor(eye.y + Math.sin(a) * 8.5); if (z.get(x, y) === T.FLOOR && lens(x + 0.5, y + 0.5) && k % 3 === 0 && y < eye.y + 5) z.set(x, y, T.PILLAR); }
      const df = distField(z);
      for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) { const i = y * W + x; if (z.t[i] === T.FLOOR && df[i] >= 6.5 && rng() < 0.012 && Math.hypot(x - heart.x, y - heart.y) > heart.r + 2) { z.t[i] = T.PILLAR; prop(z, 'a5_thought_crystal', x + 0.5, y + 0.5); } }
      // the heart: the Thalamic Court, eight black stones of the Slayers' forecourt around the temple door
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + 0.39, x = Math.floor(heart.x + Math.cos(a) * 11), y = Math.floor(heart.y + Math.sin(a) * 11); if (z.get(x, y) === T.FLOOR) z.set(x, y, T.RUIN); }
      disc(z, heart.x, heart.y, 5, T.FLAGS, t => t === T.FLOOR);
      fixPinches(z, 3.5, T.FLOOR, 8, true);
      keepMain(z, eye.x, eye.y);
      z.start = spot(z, eye.x, eye.y + 4, 1);
      addPortal(z, eye.x, eye.y + 8, 'a5_crucible', 'Back to the Digesting Crucible', 'gate');
      addLantern(z, eye.x - 6, eye.y, 'The Optic Chiasm Gate');
      addLantern(z, heart.x, heart.y + 7, 'The Thalamic Court');
      addPortal(z, heart.x, heart.y - 3, 'a5_lair', 'Into the Alien Temple of the Slayers', 'gate');
      prop(z, 'a5_optic_gate', eye.x, eye.y - 9, { w: 40 });
      for (const d of res.doors) prop(z, 'a5_gyrus_door', d.x, d.y);
      populate(z, rng, packs().cerebrum, 39, 40, { per: 320, spacing: 15, chests: 14, shrines: 5, avoid: [{ x: heart.x, y: heart.y, r: 10 }] });
      z.a5 = { doors: res.doors.length, chambers: chambers.length };
      return z;
    }

    // =============================================================== a5_lair — The Alien Temple of the Slayers
    function genLair(seed) {
      const rng = mulberry32(seed), W = 148, H = 148, cx = W / 2, cy = W / 2 - 2;
      const z = cave('a5_lair', 'The Alien Temple of the Slayers', W, H, 0.7, 'a5_temple');
      const entry = { x: cx, y: H - 12, r: 8 };
      const res = carveLabyrinth(z, rng, {
        lambda: 19, warp: 8, theta: 0.2, loops: 0.3, maxLoop: 16, keep: [entry, { x: cx, y: cy }],
        mask: (x, y) => { const o = octD(x - cx, y - cy); return o < 68 && o > 40; },
        chambers: [entry, { x: cx, y: cy, r: 44 }],
        pre: zz => {
          // the temple: an octagon of black stone four thick, four gates nine wide at the cardinal points
          for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) {
            const dx = x + 0.5 - cx, dy = y + 0.5 - cy, o = octD(dx, dy);
            if (o >= 31 && o < 35.5) { const gate = (Math.abs(dx) < 4.6 && Math.abs(dy) > 25) || (Math.abs(dy) < 4.6 && Math.abs(dx) > 25); zz.set(x, y, gate ? T.FLAGS : T.WALL); }
            else if (o < 31) zz.set(x, y, T.FLAGS);
          }
        }
      });
      // the inner ring of monoliths and the arena at the centre
      for (let k = 0; k < 24; k++) { const a = k / 24 * 6.283, s = 21 / octD(Math.cos(a), Math.sin(a)), x = Math.floor(cx + Math.cos(a) * s), y = Math.floor(cy + Math.sin(a) * s); if (k % 2 === 0 && z.get(x, y) === T.FLAGS) z.set(x, y, T.PILLAR); }
      for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) z.set(Math.floor(cx + dx * 18.5) + a, Math.floor(cy + dy * 18.5) + b, T.RUIN);
      const R = 16; z.bossRoom = { x: Math.floor(cx - R), y: Math.floor(cy - R), w: 2 * R, h: 2 * R };
      z.inBoss = (x, y) => octD(x + 0.5 - cx, y + 0.5 - cy) < R;
      z.bossSpot = { x: cx, y: cy };
      z.questSpots = { waypoint: spot(z, cx, cy + 27, 1), afterBoss: spot(z, cx, cy - 26, 1) };
      fixPinches(z, 3.5, T.FLOOR, 8);
      prop(z, 'a5_slayer_altar', cx, cy, { r: 3 });
      keepMain(z, entry.x, entry.y);
      z.start = spot(z, entry.x, entry.y, 1);
      addPortal(z, entry.x, entry.y + 5, 'a5_cerebrum', 'Back into the Cerebrum Labyrinth', 'gate');
      addLantern(z, entry.x - 5, entry.y - 2, "The Slayers' Threshold");
      addLantern(z, cx, cy + 27, 'The Angled Door');
      populate(z, rng, packs().temple, 40, 40, { per: 330, spacing: 15, chests: 8, shrines: 3, avoid: [{ x: cx, y: cy, r: 22 }] });
      for (const d of res.doors) prop(z, 'a5_gyrus_door', d.x, d.y);
      return z;
    }

    // =============================================================== a5_scar — The Scar of Ur-Nihl
    function genScar(seed) {
      const rng = mulberry32(seed), W = 188, H = 124, cy = H / 2;
      const z = cave('a5_scar', 'The Scar of Ur-Nihl', W, H, 0.75, 'a5_scar'); z.a5void = true;
      const n = makeNoise(rng), ph = rng() * 6.28, midY = x => cy + 16 * Math.sin(x / 36 + ph) + (n(x / 18, 1.7) - 0.5) * 12;
      const line = []; for (let x = 3; x <= W - 4; x += 3) line.push({ x, y: midY(x) });
      stroke(z, line, k => 15 + 5 * n(k * 9, 4.4), T.FLOOR);
      smooth(z, 2);
      // the Fissure of Erasure: void rifts in the canyon floor, some crossed by ash causeways; rock hangs in them
      const rifts = [];
      for (let x = 26; x < W - 26; x += 28 + rng() * 10) {
        const side = rng() < 0.5 ? -1 : 1, c = { x, y: midY(x) + side * (5 + rng() * 6), rx: 7 + rng() * 6, ry: 5 + rng() * 4 };
        blob(z, c.x, c.y, c.rx, c.ry, rng, VOID, 0.25, t => t === T.FLOOR); rifts.push(c);
      }
      // one great rift across the whole canyon, bridged twice
      const gx = W * (0.45 + rng() * 0.1);
      stroke(z, wobble(rng, { x: gx - 10, y: 4 }, { x: gx + 10, y: H - 5 }, 0.1), 5, VOID, t => t === T.FLOOR);
      for (const dy of [-8, 9]) { const y = midY(gx) + dy; stroke(z, [{ x: gx - 22, y: y - 3 }, { x: gx + 22, y: y + 3 }], 3.6, T.DIRT, t => t === VOID); }
      for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if (z.get(x, y) === VOID && rng() < 0.05 && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => z.get(x + a, y + b) === VOID)) z.set(x, y, T.ROCK);
      // ash drifts and obsidian shards
      for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) { const t = z.get(x, y); if (t === T.FLOOR && n(x / 7 + 30, y / 7) > 0.6) z.set(x, y, T.DIRT); }
      const df = distField(z);
      for (let k = 0; k < 26; k++) { const x = 8 + Math.floor(rng() * (W - 16)), y = 8 + Math.floor(rng() * (H - 16)); if (df[y * W + x] >= 5 && walk(z.get(x, y))) { z.set(x, y, T.ROCK); if (rng() < 0.5 && walk(z.get(x + 1, y))) z.set(x + 1, y, T.ROCK); prop(z, 'a5_obsidian', x + 0.5, y + 0.5); } }
      openWalk(z, 3); fixPinches(z, 3);
      const sY = midY(6), eY = midY(W - 7);
      keepMain(z, 9, sY);
      z.start = spot(z, 10, sY, 1);
      addPortal(z, 5, sY, 'a5_town', 'Back to the Last Vigil', 'cave');
      addLantern(z, 13, sY - 4, 'The Rim of Unmaking');
      addLantern(z, gx - 16, midY(gx - 16), 'Footprints That Fill');
      addPortal(z, W - 6, eY, 'a5_monolith', 'On to the Silent Monolith', 'gate');
      for (const r of rifts) prop(z, 'a5_void_rift', r.x, r.y, { r: r.rx });
      populate(z, rng, packs().scar, 36, 38, { per: 300, spacing: 15, chests: 10, shrines: 3 });
      return z;
    }

    // =============================================================== a5_monolith — The Silent Monolith
    function genMonolith(seed) {
      const rng = mulberry32(seed), W = 140, H = 140, cx = W / 2, cy = H / 2;
      const z = cave('a5_monolith', 'The Silent Monolith', W, H, 0.8, 'a5_scar');
      blob(z, cx, cy, 63, 61, rng, T.FLOOR, 0.07);
      stroke(z, [{ x: 12, y: cy }, { x: 3, y: cy }], 5, T.FLOOR);
      smooth(z, 2);
      blob(z, cx, cy, 36, 35, rng, VOID, 0.08, t => t === T.FLOOR); z.a5void = true;
      disc(z, cx, cy, 8.5, T.FLOOR);
      // three ash causeways to the island, the first from the western lip where you arrive
      const angs = [Math.PI + (rng() - 0.5) * 0.3, Math.PI + 2.0 + (rng() - 0.5) * 0.5, Math.PI - 2.1 + (rng() - 0.5) * 0.5];
      for (const a of angs) stroke(z, wobble(rng, { x: cx + Math.cos(a) * 6, y: cy + Math.sin(a) * 6 }, { x: cx + Math.cos(a) * 40, y: cy + Math.sin(a) * 40 }, 0.06, 2), 3.4, T.DIRT, t => t === VOID);
      // the Monolith: a featureless black block that swallows sound
      for (let y = -2; y <= 1; y++) for (let x = -2; x <= 1; x++) z.set(Math.floor(cx) + x, Math.floor(cy) + y, T.RUIN);
      prop(z, 'a5_silent_monolith', cx, cy, { h: 12 });
      for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if (z.get(x, y) === VOID && rng() < 0.03 && [[1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => z.get(x + a, y + b) === VOID)) z.set(x, y, T.ROCK);
      const n = makeNoise(rng);
      for (let y = 3; y < H - 3; y++) for (let x = 3; x < W - 3; x++) if (z.get(x, y) === T.FLOOR && n(x / 7, y / 7) > 0.62) z.set(x, y, T.DIRT);
      openWalk(z, 3); fixPinches(z, 3);
      keepMain(z, 9, cy);
      z.start = spot(z, 10, cy, 1);
      addPortal(z, 5, cy, 'a5_scar', 'Back into the Scar of Ur-Nihl', 'gate');
      addLantern(z, 14, cy - 6, 'The Crater Lip');
      addLantern(z, cx - 5, cy + 4, 'At the Foot of the Monolith');
      // what the silence keeps: two chests and its keepers at the monolith's foot
      for (const dx of [-3, 3]) { const p = spot(z, cx + dx, cy - 4, 0); z.objects.push({ type: 'chest', x: p.x, y: p.y, open: false, ilvl: 41 }); }
      const P0 = packs().scar;
      placePack(z, cx + 0.5, cy + 5.5, 40, [['a5_silence', 2, 2, 'a5_nullshade', 2, 3]], 'a5_monolith_lord', rng);
      populate(z, rng, P0, 38, 40, { per: 300, spacing: 15, chests: 8, shrines: 3, avoid: [{ x: cx, y: cy, r: 12 }] });
      return z;
    }

    // =============================================================== registration
    const GENS = {
      a5_town:     [genTown, 61, 3, 34, 34, 'The Last Vigil'],
      a5_highway:  [genHighway, 67, 7, 34, 35, 'The Grand Calcified Highway'],
      a5_siphon:   [genSiphon, 71, 11, 35, 36, 'The Siphon Vaults'],
      a5_skerries: [genSkerries, 73, 13, 36, 37, 'The Sanguine Cavity'],
      a5_valves:   [genValves, 79, 17, 36, 37, 'The Valve Gates'],
      a5_shaft:    [genShaft, 83, 19, 37, 38, 'The Shaft of Fading Echoes'],
      a5_crucible: [genCrucible, 89, 23, 38, 39, 'The Digesting Crucible'],
      a5_cerebrum: [genCerebrum, 97, 29, 39, 40, 'The Cerebrum Labyrinth'],
      a5_lair:     [genLair, 101, 31, 40, 40, 'The Alien Temple of the Slayers'],
      a5_scar:     [genScar, 103, 37, 36, 38, 'The Scar of Ur-Nihl'],
      a5_monolith: [genMonolith, 107, 41, 38, 40, 'The Silent Monolith']
    };
    for (const zid in GENS) {
      const [fn, a, b, , , nm] = GENS[zid];
      ZONE_GEN[zid] = function (s) {
        const prev = (typeof G !== 'undefined' && G) ? G.__genZone : undefined;
        if (typeof G !== 'undefined' && G) G.__genZone = zid;
        try {
          const z = fn(((s | 0) || 1) * a + b);
          if (zid !== 'a5_town') { try { if (typeof dressZone === 'function') dressZone(z, s); } catch (e) { rep(e); } }
          return z;
        } finally { if (typeof G !== 'undefined' && G) G.__genZone = prev; }
      };
      if (typeof ZONE_NAMES === 'object') ZONE_NAMES[zid] = nm;
    }

    // =============================================================== the natives' marks on the wanderer
    // bleed (Sappers, Leapers), daze (Neural Wraith orbs, Synapse-Walkers), corrosion (Corrosion-Stalkers: phys
    // hurts more for a while), void-cut (Null-Shades: the top of your life is hollowed, then slowly returns),
    // hush (Silence-Keepers drain essence nearby), bile (Tumor-Swells burst into burning pools), acid (Parasite
    // Worms leave a pool where they surface; the Crucible's bile shallows burn the feet).
    const PS = () => (P.a5fx || (P.a5fx = { bleedT: 0, bleedDps: 0, daze: 0, acid: 0, cut: 0, cutT: 0, msgT: 0, footT: 0 }));
    function markP(x5, dmg) {
      const S = PS();
      if (x5.bleed) { S.bleedDps = Math.max(S.bleedT > 0 ? S.bleedDps * 0.6 : 0, dmg * x5.bleed); S.bleedT = 3; }
      if (x5.daze) { S.daze = 1.4; floatText(P.x, P.y, 'dazed', '#9fc4ff'); }
      if (x5.acid) { if (S.acid <= 0) floatText(P.x, P.y, 'corroded', '#b8d060'); S.acid = 4; }
      if (x5.voidcut) { S.cut = Math.min(0.25, S.cut + x5.voidcut); S.cutT = 4; floatText(P.x, P.y, 'hollowed', '#8a86a0'); }
    }
    function playerDies() { if (P.hp > 0 || P.dead) return; if (typeof silenceSave === 'function' && silenceSave()) return; if (typeof miasLastBreath === 'function' && miasLastBreath()) return; die(); }
    function tickP(dt) {
      if (!P || P.dead || !G.zone) return;
      const S = P.a5fx, z = G.zone;
      if (z.theme === 'a5_crucible' && z.get(Math.floor(P.x), Math.floor(P.y)) === T.SHALLOW && !(P.iframe > 0)) {
        const s = PS(); P.hp -= D.maxHp * 0.025 * dt; s.footT -= dt; if (s.footT <= 0) { s.footT = 2.5; floatText(P.x, P.y, 'the bile burns', '#b8d060'); } playerDies();
      }
      if (!S) return;
      if (S.bleedT > 0) { S.bleedT -= dt; P.hp -= S.bleedDps * dt; S.msgT -= dt; if (S.msgT <= 0) { S.msgT = 1.2; floatText(P.x, P.y, 'bleeding', '#c83030'); } if (S.bleedT <= 0) S.bleedDps = 0; playerDies(); }
      if (S.daze > 0) S.daze -= dt;
      if (S.acid > 0) S.acid -= dt;
      if (S.cut > 0) { S.cutT -= dt; if (S.cutT <= 0) S.cut = Math.max(0, S.cut - 0.02 * dt); const cap = D.maxHp * (1 - S.cut); if (P.hp > cap) P.hp = cap; }
    }
    function bile(x, y, n, R, dps, t) { if (typeof enemyFire !== 'function') return; for (let k = 0; k < n; k++) { const a = k / n * 6.283 + Math.random() * 0.5, d = k === 0 ? 0 : R * (0.4 + Math.random() * 0.6); enemyFire(x + Math.cos(a) * d, y + Math.sin(a) * d, 0.55, dps, t); } }

    if (typeof updateMon === 'function') {
      const _um = updateMon;
      updateMon = function (m, dt, dp) {
        const x5 = m && m.b && m.b.a5;
        if (!x5 && !(m && m.b && m.b.dark)) return _um(m, dt, dp);
        const n0 = shots.length, st0 = m.state;
        const r = _um(m, dt, dp);
        try {
          if (m.b.dark && !m.dark) m.dark = true;
          if (x5 && x5.shot && shots.length > n0) for (let i = n0; i < shots.length; i++) {
            const s = shots[i]; if (s.a5) continue; s.a5 = x5;
            if (x5.shot === 'beam') { s.vx *= 2.3; s.vy *= 2.3; s.r = 0.2; s.type = 'magic'; s.t = 1.2; }
            else if (x5.shot === 'mind') { s.type = 'magic'; s.kind = 'orb'; s.r = 0.2; }
          }
          if (x5 && x5.acidSurface && st0 === 'windup' && m.state === 'surfaced') bile(m.x, m.y, 3, 1.2, (m.dmg[0] + m.dmg[1]) * 0.35, 3);
          if (x5 && x5.hush && !m.dead && !P.dead && Math.hypot(P.x - m.x, P.y - m.y) < 3.5 && P.mana > 0) P.mana = Math.max(0, P.mana - 6 * dt);
        } catch (e) { rep(e); }
        return r;
      };
    }
    if (typeof killMon === 'function') {
      const _km = killMon;
      killMon = function (m) {
        const was = m && m.dead, r = _km.apply(this, arguments);
        try { if (m && !was && m.b && m.b.a5 && m.b.a5.bile && G.zone) { bile(m.x, m.y, 6, 1.9, (m.dmg[0] + m.dmg[1]) * 0.3, 4); if (typeof burst === 'function') burst(m.x, m.y, '#a8b848', 24, 2.6); } } catch (e) { rep(e); }
        return r;
      };
    }
    if (typeof hitTarget === 'function') {
      const _ht = hitTarget;
      hitTarget = function (Tg, dmg, type, fx, fy, src) {
        const h0 = P.hp, r = _ht.apply(this, arguments);
        try { if (Tg === P && src && src.b && src.b.a5 && P.hp < h0) markP(src.b.a5, dmg); } catch (e) { rep(e); }
        return r;
      };
    }
    if (typeof hurtPlayer === 'function') {
      const _hp = hurtPlayer;
      hurtPlayer = function (dmg, type, fx, fy) {
        const S = P.a5fx;
        if (S && S.acid > 0 && type === 'phys') dmg *= 1.15;
        const h0 = P.hp, r = _hp(dmg, type, fx, fy);
        try {
          if (P.hp < h0 && shots.length) for (const s of shots) if (s.a5 && !s.a5hit && s.t > 0 && Math.hypot(P.x - s.x, P.y - s.y) < P.r + (s.r || 0.2) + 0.12) { s.a5hit = 1; if (s.a5.shot === 'daze') markP({ daze: 1 }, dmg); break; }
        } catch (e) { rep(e); }
        return r;
      };
    }
    if (typeof updateMonsters === 'function') {
      const _ums = updateMonsters;
      updateMonsters = function (dt) { const r = _ums.apply(this, arguments); try { tickP(dt); } catch (e) { rep(e); } return r; };
    }
    if (typeof followPath === 'function') {
      const _fp = followPath;
      followPath = function (dt) {
        const S = P.a5fx;
        if (!S || !(S.daze > 0) || !D) return _fp(dt);
        const ms = D.moveSpd; try { D.moveSpd = ms * 0.7; return _fp(dt); } finally { D.moveSpd = ms; }
      };
    }

    // =============================================================== test hooks
    // widthReport: every walkable tile a five-wide body cannot reach (the opening at r = 2.5), the corridor widths
    // along the ridge of the distance field (local maxima: width ~ 2d - 1), and whether all portals, lanterns and the
    // boss spot sit in one connected region of that five-wide core.
    function widthReport(z, r = 3) {
      const W = z.w, N = W * z.h, d = distField(z), core = new Uint8Array(N);
      let walkN = 0, narrow = 0;
      for (let i = 0; i < N; i++) if (d[i] >= r) core[i] = 1;
      const dc = distTo(z, core);
      for (let i = 0; i < N; i++) if (walk(z.t[i])) { walkN++; if (dc[i] >= r - 0.01) narrow++; }
      // corridor widths along the ridge of the distance field, ignoring nooks (d < 2)
      const ridge = [];
      for (let y = 1; y < z.h - 1; y++) for (let x = 1; x < W - 1; x++) {
        const i = y * W + x; if (!walk(z.t[i]) || d[i] < 2) continue;
        let top = true; for (let j = -1; j <= 1 && top; j++) for (let k = -1; k <= 1; k++) if ((j || k) && d[i + j * W + k] > d[i] + 0.01) { top = false; break; }
        if (top) ridge.push(Math.round(2 * d[i] - 1));
      }
      ridge.sort((a, b) => a - b);
      // bottleneck: the widest route joining every portal, lantern and the boss spot passes no point narrower than this
      const keys = z.objects.filter(o => o.type === 'portal' || o.type === 'lantern').concat(z.bossSpot ? [z.bossSpot] : []);
      const ord = []; for (let i = 0; i < N; i++) if (walk(z.t[i])) ord.push(i);
      ord.sort((a, b) => d[b] - d[a]);
      const par = new Int32Array(N).fill(-1), find = a => { while (par[a] !== a) a = par[a] = par[par[a]]; return a; };
      const kIdx = keys.map(o => { const X = Math.floor(o.x), Y = Math.floor(o.y); let best = Y * W + X, bd = -1; for (let j = -5; j <= 5; j++) for (let k = -5; k <= 5; k++) { const i = (Y + j) * W + X + k; if (i >= 0 && i < N && walk(z.t[i]) && d[i] > bd) { bd = d[i]; best = i; } } return best; });
      let bott = null, bottAt = null;
      for (const i of ord) {
        par[i] = i; const x = i % W;
        for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < N && par[j] >= 0) { const a = find(i), b = find(j); if (a !== b) par[a] = b; }
        if (kIdx.every(k => par[k] >= 0) && kIdx.every(k => find(k) === find(kIdx[0]))) { bott = Math.round((2 * d[i] - 1) * 10) / 10; bottAt = { x: i % W, y: (i / W) | 0 }; break; }
      }
      return { walk: walkN, narrowPct: +(100 * narrow / walkN).toFixed(2), ridgeMin: ridge[0], ridgeP10: ridge[Math.floor(ridge.length * 0.1)], ridgeMed: ridge[Math.floor(ridge.length / 2)], bottleneck: bott, bottAt, keys: keys.length };
    }
    function reach(z) {
      const seen = floodFrom(z, Math.floor(z.start.x), Math.floor(z.start.y));
      const near = o => { for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) { const x = Math.floor(o.x) + k, y = Math.floor(o.y) + j; if (x >= 0 && y >= 0 && x < z.w && y < z.h && seen[y * z.w + x]) return true; } return false; };
      let walkN = 0, reached = 0; for (let i = 0; i < z.t.length; i++) if (walk(z.t[i])) { walkN++; if (seen[i]) reached++; }
      const bad = z.objects.filter(o => !near(o)).map(o => o.type + ':' + (o.to || o.name || ''));
      const badMon = z.monsters.filter(m => !near(m)).length;
      return { walkN, reached, unreachableObjects: bad, unreachableMonsters: badMon, bossSpotOk: z.bossSpot ? near(z.bossSpot) : null };
    }
    if (typeof window !== 'undefined') {
      window.__act5 = {
        zones: Object.keys(GENS), natives: NATIVES,
        bands: Object.fromEntries(Object.entries(GENS).map(([k, v]) => [k, [v[3], v[4]]])),
        gen: (zid, seed) => ZONE_GEN[zid](seed), widthReport, reach, distField, fallback: A5_FB, _dbg: { fixPinches, openWalk, label }
      };
    }
  }
}
