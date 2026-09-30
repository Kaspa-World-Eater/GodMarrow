// zz_openness.js — The Openness Warden: Act 1 airiness rework (2026-09-27).
// User rule above all rules: "We want all the open spaces and not overcrowding or too many narrow spaces.
// Act 5 and Act 1 [of Diablo 2] are really good examples..."
//
// This file owns:
//   * OPENNESS — a shared toolkit for open outdoor zones (buildOpen: noise groves that clear into meadows,
//     wide curving roads, irregular rims, per-layout masks, pocket stitching, spaced packs) and for airy dungeons
//     (wideDungeon: rooms >= 11x11, a great hall, 5-7 tile corridors, no closets). zz_act1_expand.js and
//     zz_world_expand.js call it at generation time (it is a hoisted var, so load order does not matter).
//   * genMoor / genFen are reassigned to open layouts (the Ashen Moor as a radial crossroads plain, the Drowned
//     Fen as a braided delta). ZONE_GEN.moor/.fen call them by name, so every wrapper stacked on ZONE_GEN
//     (dressZone, portal injectors, mlvl markers) still runs on top.
//   * genDungeon is wrapped: Act 1 dungeon ids (and any caller passing o.wide) get wideDungeon; everything else
//     (other acts) gets the original generator untouched.
//   * dressZone is wrapped so its random grove-thinning does not shred groves this file already designed
//     (open zones are marked z.__open). zz_pace_and_density's tree-halving is skipped the same way
//     (z.__treesHalved = true) because these layouts are generated at the target density directly.
var OPENNESS = (function () {
  if (typeof Zone !== 'function' || typeof T === 'undefined' || typeof ZONE_GEN !== 'object') return null;

  const ACT1_DUNGEONS = new Set(['crypt', 'barrow', 'cata1', 'cata2', 'fallen_monastery', 'wolf_den_chapel', 'plague_hospice', 'well_shaft', 'smugglers_hold']);
  const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const WALKABLE_FLOOR = new Set([T.GRASS, T.ROAD, T.DIRT, T.FLOOR, T.FLAGS, T.MUD, T.SHALLOW]);

  // D2-style packs: fewer packs, each a little larger. Scales every [type, min, max] triple of a pack table.
  function scaleTable(table, k) {
    if (!table || k === 1) return table;
    return table.map(def => { const d = def.slice(); for (let i = 0; i < d.length; i += 3) { d[i + 1] = Math.max(1, Math.round(d[i + 1] * k)); d[i + 2] = Math.max(d[i + 1], Math.round(d[i + 2] * k)); } return d; });
  }

  // --------------------------------------------------------------------------------------------- terrain bits
  // stamp a disc of `tile` (keeps the outer 2-tile frame as it is)
  function disc(z, cx, cy, r, tile, keep) {
    const r2 = (r + 0.35) * (r + 0.35);
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (x < 2 || y < 2 || x >= z.w - 2 || y >= z.h - 2) continue;
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r2) continue;
      if (keep && keep(z.get(x, y))) continue;
      z.set(x, y, typeof tile === 'function' ? tile(z.get(x, y), x, y) : tile);
    }
  }
  // a gently curving polyline from a to b (midpoints pushed sideways)
  function curve(a, b, rng, bend) {
    const pts = [a], n = Math.max(2, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 14));
    const nx = -(b.y - a.y), ny = b.x - a.x, L = Math.hypot(nx, ny) || 1, amp = (bend == null ? 0.12 : bend) * Math.hypot(b.x - a.x, b.y - a.y);
    const ph = rng() * 6.28;
    for (let i = 1; i < n; i++) { const t = i / n, s = Math.sin(t * Math.PI) * Math.sin(ph + t * 3.1) * amp; pts.push({ x: a.x + (b.x - a.x) * t + nx / L * s, y: a.y + (b.y - a.y) * t + ny / L * s }); }
    pts.push(b); return pts;
  }
  // stamp a road along a polyline: `r` road radius, a wider verge cleared of trees/rocks so the road reads open
  function road(z, pts, r, tile, verge, overWater) {
    tile = tile == null ? T.ROAD : tile; verge = verge == null ? r + 2.5 : verge;
    const soft = t => t === T.TREE || t === T.ROCK || t === T.PILLAR || t === T.RUIN;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 2);
      for (let k = 0; k <= n; k++) {
        const x = a.x + (b.x - a.x) * k / n, y = a.y + (b.y - a.y) * k / n;
        disc(z, x, y, verge, T.GRASS, t => !soft(t));
        disc(z, x, y, r, (t) => (t === T.WATER || t === T.SHALLOW) ? (overWater == null ? tile : overWater) : tile);
      }
    }
  }
  function nearestOpen(z, x, y, rad) {
    x = Math.floor(x); y = Math.floor(y);
    const ok = (i, j) => { for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) if (!z.walkTile(i + a, j + b)) return false; return true; };
    for (let r = 0; r <= (rad || 8); r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue; if (ok(x + i, y + j)) return { x: x + i + 0.5, y: y + j + 0.5 }; }
    for (let r = 0; r <= 12; r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (z.walkTile(x + i, y + j)) return { x: x + i + 0.5, y: y + j + 0.5 };
    return { x: x + 0.5, y: y + 0.5 };
  }
  // stitch every sealed-off walkable pocket back to the main area (big pockets get a carved path, small ones fill)
  function connect(z, sx, sy, opt) {
    opt = opt || {};
    const W = z.w, H = z.h, fill = opt.fill == null ? T.TREE : opt.fill, path = opt.path == null ? T.GRASS : opt.path;
    for (let pass = 0; pass < 8; pass++) {
      const seen = floodFrom(z, sx, sy);
      const lab = new Int32Array(W * H).fill(-1), pockets = [];
      for (let i = 0; i < W * H; i++) {
        if (seen[i] || lab[i] >= 0 || SOLID[z.t[i]] !== 0) continue;
        const id = pockets.length, q = [i]; lab[i] = id; const tiles = [];
        while (q.length) { const j = q.pop(); tiles.push(j); const x = j % W, y = (j / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const k = ny * W + nx; if (lab[k] < 0 && !seen[k] && SOLID[z.t[k]] === 0) { lab[k] = id; q.push(k); } } }
        pockets.push(tiles);
      }
      if (!pockets.length) return;
      const big = pockets.filter(p => p.length >= (opt.minPocket || 36));
      pockets.filter(p => p.length < (opt.minPocket || 36)).forEach(p => p.forEach(j => z.t[j] = fill));
      if (!big.length) return;
      // multi-source BFS from the reached set through anything but the outer frame
      const par = new Int32Array(W * H).fill(-2), dd = new Int32Array(W * H).fill(-1), q = new Int32Array(W * H); let h = 0, tl = 0;
      for (let i = 0; i < W * H; i++) if (seen[i]) { par[i] = -1; dd[i] = 0; q[tl++] = i; }
      while (h < tl) { const i = q[h++], x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 2 || ny < 2 || nx >= W - 2 || ny >= H - 2) continue; const k = ny * W + nx; if (dd[k] >= 0) continue; dd[k] = dd[i] + 1; par[k] = i; q[tl++] = k; } }
      for (const p of big) {
        let best = -1, bd = 1e9; for (const j of p) if (dd[j] >= 0 && dd[j] < bd) { bd = dd[j]; best = j; }
        for (let j = best, g = 0; j >= 0 && par[j] !== -1 && g < 400; j = par[j], g++) {
          const x = j % W, y = (j / W) | 0;
          for (let b = -1; b <= 1; b++) for (let a = -1; a <= 1; a++) { const t = z.get(x + a, y + b); if (x + a < 2 || y + b < 2 || x + a >= W - 2 || y + b >= H - 2) continue; if (SOLID[t] === 1) z.set(x + a, y + b, t === T.WATER ? T.SHALLOW : path); }
        }
      }
    }
  }

  // --------------------------------------------------------------------------------------------- population
  function reachSet(z) { return floodFrom(z, Math.floor(z.start.x), Math.floor(z.start.y)); }
  // spaced packs (Poisson-ish), mlvl rising with walking distance from the start
  function spreadPacks(z, o) {
    const table = scaleTable(o.table, o.sizeK == null ? 1.3 : o.sizeK);
    if (!table || typeof placePack !== 'function') return 0;
    const rng = o.rng, W = z.w, H = z.h, d0 = bfsDist(z, Math.floor(z.start.x), Math.floor(z.start.y));
    const spots = []; let dmax = 1;
    for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
      const i = y * W + x; if (d0[i] < (o.minStart == null ? 20 : o.minStart)) continue;
      if (!WALKABLE_FLOOR.has(z.t[i]) || z.t[i] === T.SHALLOW) continue;
      let open = true; for (let b = -1; b <= 1 && open; b++) for (let a = -1; a <= 1; a++) if (!z.walkTile(x + a, y + b)) { open = false; break; }
      if (!open) continue;
      spots.push([x, y, d0[i]]); if (d0[i] > dmax) dmax = d0[i];
    }
    for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    const keepOff = z.objects.filter(q => q.type === 'portal' || q.type === 'lantern' || q.type === 'vendor');
    const used = (o.used || []).slice(); let n = 0; const sp = o.spacing || 12;
    for (const [x, y, d] of spots) {
      if (n >= o.count) break;
      if (!used.every(([ux, uy]) => Math.hypot(ux - x, uy - y) > sp)) continue;
      if (keepOff.some(q => Math.hypot(q.x - x, q.y - y) < 7)) continue;
      const mlvl = o.mlvl ? o.mlvl(d, dmax) : clamp(o.lo + Math.round((o.hi - o.lo) * d / dmax), o.lo, o.hi);
      placePack(z, x + 0.5, y + 0.5, mlvl, o.tableFor ? scaleTable(o.tableFor(mlvl), o.sizeK == null ? 1.3 : o.sizeK) : table, (o.prefix || z.id.slice(0, 3)) + n, rng);
      used.push([x, y]); n++;
    }
    return n;
  }
  function spreadThings(z, o) {
    const rng = o.rng, W = z.w, H = z.h, d0 = bfsDist(z, Math.floor(z.start.x), Math.floor(z.start.y));
    const spots = []; let dmax = 1;
    for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) { const i = y * W + x; if (d0[i] > 14 && (z.t[i] === T.GRASS || z.t[i] === T.FLOOR || z.t[i] === T.DIRT || z.t[i] === T.FLAGS)) { spots.push([x, y, d0[i]]); if (d0[i] > dmax) dmax = d0[i]; } }
    for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    const used = z.objects.map(q => [q.x, q.y]); let c = 0, s = 0;
    for (const [x, y, d] of spots) {
      if (c >= (o.chests || 0) && s >= (o.shrines || 0)) break;
      if (!used.every(([ux, uy]) => Math.hypot(ux - x, uy - y) > 6)) continue;
      const lv = clamp(o.lo + Math.round((o.hi - o.lo) * d / dmax), o.lo, o.hi);
      if (c < (o.chests || 0)) { z.objects.push({ type: 'chest', x: x + 0.5, y: y + 0.5, open: false, ilvl: lv }); c++; }
      else { z.objects.push({ type: 'shrine', x: x + 0.5, y: y + 0.5, used: false, kind: pick(['echo', 'wisp', 'stone', 'refill']) }); s++; }
      used.push([x, y]);
    }
  }

  // --------------------------------------------------------------------------------------------- open zones
  // spec: { id, name, seed, W, H, theme, dark, nodes(S) -> {key:{x,y,r?,floor?}}, shape(x,y,S) -> tile|null,
  //   grove: {scale, cut, dens, lone, rock, dirt}, roads(S) -> [{pts|a,b, r, tile, verge, bend}], post(z,S),
  //   start: key, lanterns: [{at, name, dx, dy}], portals: [{at, to, name, spr}], packs: {...}, chests, shrines, fill }
  function buildOpen(spec) {
    const rng = mulberry32(spec.seed >>> 0 || 1), R = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const W = spec.W, H = spec.H;
    const z = new Zone(spec.id, spec.name, W, H, spec.dark == null ? 0.35 : spec.dark);
    z.theme = spec.theme || 'moor'; z.__open = true; z.__treesHalved = true; z.seed = spec.seed;
    const S = { rng, R, W, H, z, nG: makeNoise(rng), nE: makeNoise(rng), nD: makeNoise(rng), nW: makeNoise(rng), nX: makeNoise(rng) };
    S.N = spec.nodes(S);
    const rimW = spec.rim == null ? 5 : spec.rim;
    const gv = Object.assign({ scale: 18, cut: 0.56, dens: 0.5, lone: 0.006, rock: 0.004, dirt: 0.68 }, spec.grove || {});
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
      let t = T.GRASS;
      if (edge < 3 || edge < 3 + fbm(S.nE, x / 9, y / 9) * rimW) t = T.CLIFF;
      else {
        const s = spec.shape ? spec.shape(x, y, S) : null;
        if (s != null) t = s;
        else {
          const g = fbm(S.nG, x / gv.scale, y / gv.scale), r = rng();
          const gd = typeof gv.densAt === 'function' ? gv.densAt(x, y, S, g) : (g > gv.cut ? gv.dens * (0.35 + 0.65 * smooth(gv.cut, gv.cut + 0.08, g)) : 0);
          if (r < gd) t = T.TREE;
          else if (r < gd + gv.lone) t = T.TREE;
          else if (r > 1 - gv.rock) t = T.ROCK;
          else if (fbm(S.nD, x / 7, y / 7) > gv.dirt) t = T.DIRT;
        }
      }
      z.set(x, y, t);
    }
    // node clearings (they can bite into the rim so edge portals always have room)
    for (const k in S.N) { const n = S.N[k]; if (n.r !== 0) disc(z, n.x, n.y, n.r || 4, n.floor == null ? T.GRASS : n.floor); }
    for (const rd of (spec.roads ? spec.roads(S) : [])) {
      const pts = rd.pts || curve(S.N[rd.a] || rd.a, S.N[rd.b] || rd.b, rng, rd.bend);
      road(z, pts, rd.r == null ? 1.2 : rd.r, rd.tile, rd.verge, rd.ford);
    }
    if (spec.post) spec.post(z, S);
    // re-open node centres (post may have built on them) then stitch pockets
    for (const k in S.N) { const n = S.N[k]; if (n.r !== 0) disc(z, n.x, n.y, Math.min(2, n.r || 2), n.floor == null ? T.GRASS : n.floor, t => t === T.FLAGS || t === T.ROAD); }
    const st = S.N[spec.start || 'entry'];
    z.start = { x: Math.floor(st.x) + 0.5, y: Math.floor(st.y) + 0.5 };
    connect(z, Math.floor(st.x), Math.floor(st.y), { fill: spec.fill == null ? T.TREE : spec.fill });
    // lanterns (index order is the save's travel order: keep it stable per zone)
    for (const l of (spec.lanterns || [])) { const n = S.N[l.at] || l.at; const p = nearestOpen(z, n.x + (l.dx || 0), n.y + (l.dy == null ? -1 : l.dy)); z.lanterns.push({ x: p.x, y: p.y, name: l.name }); }
    z.lanterns.forEach((l, i) => z.objects.push({ type: 'lantern', x: l.x, y: l.y, idx: i, name: l.name }));
    z.arrive = {};
    for (const p of (spec.portals || [])) {
      const n = S.N[p.at] || p.at; const q = nearestOpen(z, n.x + (p.dx || 0), n.y + (p.dy || 0), 6);
      z.objects.push({ type: 'portal', x: q.x, y: q.y, to: p.to, name: p.name, spr: p.spr || 'gate' });
      if (!z.arrive[p.to]) z.arrive[p.to] = nearestOpen(z, q.x, q.y + 2, 6);
    }
    if (spec.objects) spec.objects(z, S);
    if (spec.packs) spreadPacks(z, Object.assign({ rng, prefix: spec.id.slice(0, 3) }, spec.packs));
    if (spec.chests || spec.shrines) spreadThings(z, { rng, chests: spec.chests || 0, shrines: spec.shrines || 0, lo: spec.packs ? spec.packs.lo : 1, hi: spec.packs ? spec.packs.hi : 1 });
    if (spec.after) spec.after(z, S);
    return z;
  }

  // --------------------------------------------------------------------------------------------- airy dungeons
  // Same contract as genDungeon (o.id/name/seed/size/rooms/dark/theme/lo/hi/packs/up/down/lantern/chests/boss),
  // but: grid grows ~30%, rooms 13-21 a side (never a closet), one great hall, corridors 5-7 wide, loops.
  function wideDungeon(o) {
    const rng = mulberry32((o.seed >>> 0) + 7777), R = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const Sz = Math.round((o.size || 84) * (o.grow || 1.32));
    const z = new Zone(o.id, o.name, Sz, Sz, o.dark); z.theme = o.theme; z.__open = true; z.__wide = true;
    z.t.fill(T.WALL);
    const style = o.style || 'rect';
    const rooms = [];
    const fits = (x, y, w, h, m) => x >= 3 && y >= 3 && x + w < Sz - 3 && y + h < Sz - 3 && !rooms.some(r => x < r.x + r.w + m && x + w + m > r.x && y < r.y + r.h + m && y + h + m > r.y);
    // the great hall, somewhere central
    { const gw = R(22, 28), gh = R(18, 24); let x = Math.floor((Sz - gw) / 2) + R(-8, 8), y = Math.floor((Sz - gh) / 2) + R(-8, 8); rooms.push({ x, y, w: gw, h: gh, great: true }); }
    const want = Math.max(5, Math.round((o.rooms || 12) * 0.85));
    for (let i = 0; i < 3000 && rooms.length < want + 1; i++) {
      let w = R(13, 21), h = R(13, 21);
      if (style === 'ward' && rng() < 0.6) { if (rng() < 0.5) { w = R(22, 28); h = R(11, 13); } else { h = R(22, 28); w = R(11, 13); } }
      const x = R(3, Sz - w - 4), y = R(3, Sz - h - 4);
      if (!fits(x, y, w, h, 5)) continue;
      rooms.push({ x, y, w, h });
    }
    rooms.forEach(r => { r.cx = r.x + r.w / 2; r.cy = r.y + r.h / 2; });
    const carve = (x0, y0, x1, y1) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (x > 1 && y > 1 && x < Sz - 2 && y < Sz - 2) z.set(x, y, T.FLOOR); };
    for (const r of rooms) {
      const round = style === 'round' && !r.great && rng() < 0.7;
      const ch = round ? 0 : (rng() < 0.5 ? R(2, 3) : 0);   // chamfered corners on some rooms
      for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
        if (round) { const ex = (x + 0.5 - r.cx) / (r.w / 2), ey = (y + 0.5 - r.cy) / (r.h / 2); if (ex * ex + ey * ey > 1.02) continue; }
        else if (ch) { const dx = Math.min(x - r.x, r.x + r.w - 1 - x), dy = Math.min(y - r.y, r.y + r.h - 1 - y); if (dx + dy < ch) continue; }
        z.set(x, y, T.FLOOR);
      }
    }
    // corridors: minimum spanning tree over room centres, plus a few loops so it never plays as a line of closets
    const hw = o.corr == null ? 2 : o.corr;   // half-width: 2 -> 5 wide, 3 -> 7 wide
    const corridor = (a, b, h) => {
      const ax = Math.floor(a.cx), ay = Math.floor(a.cy), bx = Math.floor(b.cx), by = Math.floor(b.cy);
      if (rng() < 0.5) { carve(ax - h, ay - h, bx + h, ay + h); carve(bx - h, ay - h, bx + h, by + h); }
      else { carve(ax - h, ay - h, ax + h, by + h); carve(ax - h, by - h, bx + h, by + h); }
    };
    const inT = new Set([0]); const edges = [];
    while (inT.size < rooms.length) {
      let best = null, bd = 1e9;
      for (const i of inT) for (let j = 0; j < rooms.length; j++) { if (inT.has(j)) continue; const d = Math.hypot(rooms[i].cx - rooms[j].cx, rooms[i].cy - rooms[j].cy); if (d < bd) { bd = d; best = [i, j]; } }
      inT.add(best[1]); edges.push(best);
    }
    for (let k = 0; k < Math.max(2, Math.round(rooms.length / 5)); k++) { const i = R(0, rooms.length - 1), j = R(0, rooms.length - 1); if (i !== j) edges.push([i, j]); }
    for (const [i, j] of edges) corridor(rooms[i], rooms[j], (rooms[i].great || rooms[j].great) ? hw + 1 : hw);
    // decoration: colonnades in the great hall, four pillars in big rooms (always 5+ tiles from any wall)
    for (const r of rooms) {
      if (r.great) { for (let x = r.x + 5; x <= r.x + r.w - 6; x += 5) for (const y of [r.y + 5, r.y + r.h - 6]) z.set(x, y, T.PILLAR); }
      else if (r.w >= 16 && r.h >= 16 && style !== 'round') [[5, 5], [r.w - 6, 5], [5, r.h - 6], [r.w - 6, r.h - 6]].forEach(([i, j]) => z.set(r.x + i, r.y + j, T.PILLAR));
      else if (style === 'ward' && (r.w >= 22 || r.h >= 22)) { const vert = r.h > r.w; for (let k = 5; k < (vert ? r.h : r.w) - 5; k += 4) { if (vert) z.set(Math.floor(r.cx), r.y + k, T.PILLAR); else z.set(r.x + k, Math.floor(r.cy), T.PILLAR); } }
    }
    // order rooms like the base game: start near the top-left, far rooms by walking distance
    const nonGreat = rooms.filter(r => !r.great);
    nonGreat.sort((a, b) => (a.cx + a.cy) - (b.cx + b.cy));
    const start = nonGreat[0];
    const d0 = bfsDist(z, Math.floor(start.cx), Math.floor(start.cy));
    const rd = r => d0[Math.floor(r.cy) * z.w + Math.floor(r.cx)];
    const byFar = rooms.filter(r => r !== start).sort((a, b) => rd(b) - rd(a));
    let boss = null, down = null;
    if (o.boss) {
      boss = byFar.find(r => !r.great && r.w >= 14 && r.h >= 14) || byFar.find(r => !r.great) || byFar[0];
      // make the arena a proper arena: at least 16x16
      if (boss.w < 16 || boss.h < 16) { const nw = Math.max(boss.w, 16), nh = Math.max(boss.h, 16); const nx = clamp(Math.round(boss.cx - nw / 2), 3, Sz - nw - 4), ny = clamp(Math.round(boss.cy - nh / 2), 3, Sz - nh - 4); carve(nx, ny, nx + nw - 1, ny + nh - 1); Object.assign(boss, { x: nx, y: ny, w: nw, h: nh, cx: nx + nw / 2, cy: ny + nh / 2 }); }
      z.bossRoom = boss;
      z.inBoss = (x, y) => x >= boss.x && y >= boss.y && x < boss.x + boss.w && y < boss.y + boss.h;
    }
    if (o.down) down = byFar.find(r => r !== boss && !r.great) || byFar[0];
    z.start = { x: start.cx, y: start.cy + 1.5 };
    z.arrive = { [o.up.to]: z.start };
    z.objects.push({ type: 'portal', x: start.cx - 1.5, y: start.cy - 1.5, to: o.up.to, name: o.up.name, spr: 'stairs' });
    z.lanterns.push({ x: start.cx + 1.5, y: start.cy - 1.5, name: o.lantern });
    z.objects.push({ type: 'lantern', x: start.cx + 1.5, y: start.cy - 1.5, idx: 0, name: o.lantern });
    if (down) { z.objects.push({ type: 'portal', x: down.cx, y: down.cy - 1, to: o.down.to, name: o.down.name, spr: 'stairs' }); z.arrive[o.down.to] = { x: down.cx, y: down.cy + 1.2 }; }
    // packs: D2 spacing. About 25% fewer packs than the old closet-per-room layout, each ~30% larger.
    const table = scaleTable(o.packs, o.sizeK || 1.2);
    const far = Math.max(1, rd(byFar[0]));
    const budget = Math.max(4, Math.round((o.rooms || 12) * 1.4 * 0.75));   // the old layout averaged ~1.4 packs a room; keep ~75% of that
    const plan = [];
    rooms.forEach(r => { if (r === start || r === boss) return; const area = r.w * r.h; plan.push([r, r.great ? 3 : area >= 320 ? 3 : area >= 200 ? 2 : 1]); });
    let total = plan.reduce((a, p) => a + p[1], 0);
    plan.sort((a, b) => a[0].w * a[0].h - b[0].w * b[0].h);
    for (const p of plan) { if (total <= budget) break; if (p[1] > 0 && !p[0].great) { p[1]--; total--; } }
    let packId = 0;
    for (const [r, n] of plan) {
      const mlvl = clamp(o.lo + Math.round((o.hi - o.lo) * rd(r) / far), o.lo, o.hi);
      for (let k = 0; k < n; k++) {
        let px = 0, py = 0; for (let t = 0; t < 20; t++) { px = r.x + 3 + rng() * (r.w - 6); py = r.y + 3 + rng() * (r.h - 6); if (!z.solidAt(px, py)) break; }
        placePack(z, px, py, mlvl, table, o.id + (packId++), rng);
      }
      if (rng() < (o.chests || 0.4)) { const c = nearestOpen(z, r.x + 2, r.y + 2, 4); z.objects.push({ type: 'chest', x: c.x, y: c.y, open: false, ilvl: mlvl + 1 }); }
    }
    if (!o.boss && !o.down) { const f = byFar.find(r => !r.great) || byFar[0]; z.objects.push({ type: 'chest', x: f.cx + 1, y: f.cy, open: false, ilvl: o.hi + 1 }); z.objects.push({ type: 'chest', x: f.cx - 1, y: f.cy, open: false, ilvl: o.hi + 1 }); placePack(z, f.cx, f.cy + 1, o.hi + 1, table, 'lord', rng); }
    if (o.boss) { const b = makeMon(o.boss.type, boss.cx, boss.cy, o.boss.lvl, 'boss', []); b.pack = 'boss'; z.monsters.push(b); z.boss = b; }
    connect(z, Math.floor(z.start.x), Math.floor(z.start.y), { fill: T.WALL, path: T.FLOOR });
    return z;
  }

  // --------------------------------------------------------------------------------------------- wrappers
  if (typeof genDungeon === 'function') {
    const _gd = genDungeon;
    genDungeon = function (o) {
      if (o && (o.wide || ACT1_DUNGEONS.has(o.id))) {
        const dz = { crypt: { grow: 1.3 }, barrow: { grow: 1.45, style: 'round' }, cata1: { grow: 1.3, corr: 3 }, cata2: { grow: 1.35, corr: 3 } }[o.id] || {};
        return wideDungeon(Object.assign({}, dz, o));
      }
      return _gd.apply(this, arguments);
    };
  }
  if (typeof dressZone === 'function') {
    const _dz = dressZone;
    dressZone = function (z) {
      if (!z || !z.__open || !z.t) return _dz.apply(this, arguments);
      // hide designed trees from the base grove-thinner (as rock: ruins also keep out of the groves), then restore
      const keep = []; for (let i = 0; i < z.t.length; i++) if (z.t[i] === T.TREE) { z.t[i] = T.ROCK; keep.push(i); }
      try { return _dz.apply(this, arguments); }
      finally { for (const i of keep) if (z.t[i] === T.ROCK) z.t[i] = T.TREE; }
    };
  }

  // ============================================================================================ base zones
  // The Ashen Moor: a radial crossroads plain (D2 Blood Moor / Cold Plains). The walled camp keeps its exact
  // footprint (5..25) so every NPC placement that assumes it still lands inside the palisade.
  function openMoor(seed) {
    const z = buildOpen({
      id: 'moor', name: 'Ashen Moor', seed: seed * 3 + 101, W: 164, H: 164, theme: 'moor', dark: 0.3, rim: 6,
      nodes: S => {
        const { R, W, H } = S;
        return {
          camp: { x: 15, y: 15, r: 0 }, gateE: { x: 29, y: 15, r: 3 }, gateS: { x: 15, y: 29, r: 3 },
          mid: { x: R(72, 88), y: R(72, 88), r: 7, floor: T.DIRT },
          cave: { x: R(W - 26, W - 18), y: R(H - 26, H - 18), r: 5 },
          east: { x: R(W - 32, W - 18), y: R(24, 40), r: 4 },
          south: { x: R(24, 40), y: R(H - 30, H - 18), r: 4 },
          ridge: { x: R(66, 92), y: R(14, 20), r: 4 },
          wood: { x: R(W - 18, W - 13), y: R(88, 110), r: 4 },
          mere: { x: R(40, 60), y: R(96, 116), r: 0 }
        };
      },
      shape: (x, y, S) => {
        if (x <= 27 && y <= 27) return T.GRASS;   // camp plot, built in post
        const m = S.N.mere, d = Math.hypot((x - m.x) / 1.4, y - m.y) + fbm(S.nW, x / 6, y / 6) * 8;
        if (d < 10) return T.WATER;
        if (fbm(S.nX, x / 30 + 9, y / 30 + 9) < 0.2) return T.WATER;   // the odd stray pool
        return null;
      },
      grove: { scale: 17, cut: 0.57, dens: 0.55, lone: 0.005, rock: 0.004, dirt: 0.66 },
      roads: S => [
        { a: 'gateE', b: 'mid', r: 1.3, bend: 0.1 }, { a: 'gateS', b: 'mid', r: 1.3, bend: 0.1 },
        { a: 'mid', b: 'cave', r: 1.3 }, { a: 'mid', b: 'east', r: 1.3 }, { a: 'mid', b: 'south', r: 1.3 },
        { a: 'mid', b: 'ridge', r: 1.1 }, { a: 'mid', b: 'wood', r: 1.1 }
      ],
      post: (z, S) => {
        const C = { x0: 5, y0: 5, x1: 25, y1: 25 };
        for (let y = C.y0; y <= C.y1; y++) for (let x = C.x0; x <= C.x1; x++) { const ring = x === C.x0 || y === C.y0 || x === C.x1 || y === C.y1; z.set(x, y, ring ? T.PALISADE : T.DIRT); }
        for (let k = 13; k <= 16; k++) { z.set(C.x1, k, T.ROAD); z.set(k, C.y1, T.ROAD); }
        for (let k = C.x0 + 1; k < C.x1; k++) { z.set(k, 14, T.ROAD); z.set(k, 15, T.ROAD); z.set(14, k, T.ROAD); z.set(15, k, T.ROAD); }
        for (let y = C.y1 + 1; y <= C.y1 + 3; y++) for (let x = C.x0; x <= C.x1 + 3; x++) if (z.get(x, y) !== T.CLIFF) z.set(x, y, T.GRASS);
        for (let x = C.x1 + 1; x <= C.x1 + 3; x++) for (let y = C.y0; y <= C.y1 + 3; y++) if (z.get(x, y) !== T.CLIFF) z.set(x, y, T.GRASS);
        // the camp's own roads out to the gates
        road(z, [{ x: 26, y: 14.5 }, { x: 30, y: 14.5 }], 1.2); road(z, [{ x: 14.5, y: 26 }, { x: 14.5, y: 30 }], 1.2);
      },
      start: 'camp',
      lanterns: [{ at: { x: 15, y: 12 }, name: 'Lantern Camp', dy: 0 }, { at: 'mid', name: 'Crossroads', dy: 0 }],
      portals: [
        { at: 'cave', to: 'crypt', name: 'Hollow Crypt', spr: 'cave' },
        { at: 'east', to: 'fen', name: 'Road to the Drowned Fen', spr: 'gate' },
        { at: 'south', to: 'barrow', name: 'Old Barrow', spr: 'cave' },
        { at: 'ridge', to: 'sighing_ridge', name: 'North to the Sighing Ridge', spr: 'gate' },
        { at: 'wood', to: 'hollow_wood', name: 'Path to the Hollow Wood', spr: 'gate' }
      ],
      objects: (z, S) => {
        z.start = { x: 15.5, y: 18.5 };
        z.objects.push({ type: 'vendor', x: 10.5, y: 10.5, name: 'Maren the Gravekeeper' });
        const cave = z.objects.find(o => o.to === 'crypt'); z.caveOut = z.arrive.crypt = nearestOpen(z, cave.x, cave.y + 2);
        z.arrive.moor = z.start;
      },
      // 80 packs at 8-tile spacing -> 60 packs at 12-tile spacing, each ~30% larger
      packs: { table: PACKS_LOW, count: 60, spacing: 12, sizeK: 1.3, minStart: 30, lo: 1, hi: 6,
        mlvl: (d) => clamp(1 + Math.floor(d / 30), 1, 6), tableFor: lv => lv <= 2 ? PACKS_LOW : lv <= 4 ? PACKS_MID : PACKS_HIGH },
      chests: 24, shrines: 9
    });
    return z;
  }
  // The Drowned Fen: a braided delta. Three meandering channels run NW->SE; broad hummocks between them; the
  // roads cross on causeways. Fords and shallows (dressZone's fen band) keep the water walkable at its edges.
  function openFen(seed) {
    return buildOpen({
      id: 'fen', name: 'Drowned Fen', seed: seed * 5 + 211, W: 160, H: 160, theme: 'fen', dark: 0.45, rim: 5,
      nodes: S => {
        const { R, W, H } = S;
        return {
          entry: { x: 10, y: R(70, 90), r: 5 }, chapel: { x: R(70, 88), y: R(70, 88), r: 7, floor: T.DIRT },
          cata: { x: R(W - 30, W - 20), y: R(H - 30, H - 20), r: 5 }, ne: { x: R(W - 44, W - 26), y: R(18, 32), r: 5, floor: T.DIRT },
          sw: { x: R(24, 42), y: R(H - 34, H - 22), r: 5, floor: T.DIRT }, village: { x: R(W - 50, W - 34), y: R(H - 60, H - 46), r: 4 },
          roots: { x: R(20, 34), y: R(18, 30), r: 4 }
        };
      },
      shape: (x, y, S) => {
        // channel k: centre line y = off_k + x*0.55 + A*sin(x/f + ph)
        for (let k = 0; k < 3; k++) {
          const off = -40 + k * 62 + (k === 1 ? 6 : 0), cy = off + x * 0.55 + 9 * Math.sin(x / (17 + k * 5) + k * 2.1), w = 2.4 + fbm(S.nW, x / 12 + k * 7, y / 12) * 4.5;
          if (Math.abs(y - cy) < w) return T.WATER;
        }
        if (fbm(S.nX, x / 14, y / 14) < 0.23) return T.WATER;   // standing pools
        return null;
      },
      grove: { scale: 15, cut: 0.6, dens: 0.5, lone: 0.008, rock: 0.003, dirt: 0.72 },
      roads: S => [
        { a: 'entry', b: 'chapel', r: 1.2 }, { a: 'chapel', b: 'cata', r: 1.2 }, { a: 'chapel', b: 'ne', r: 1.1 },
        { a: 'chapel', b: 'sw', r: 1.1 }, { a: 'chapel', b: 'village', r: 1.1 }, { a: 'entry', b: 'roots', r: 1.1, bend: 0.2 }
      ],
      post: (z, S) => { const c = S.N.chapel; [[-4, -4], [4, -4], [-4, 4], [4, 4], [0, -5]].forEach(([i, j]) => { if (S.rng() < 0.8) z.set(c.x + i, c.y + j, T.PILLAR); }); },
      fill: T.WATER,
      lanterns: [{ at: 'entry', name: "Fen's Edge", dx: 1, dy: -2 }, { at: 'chapel', name: 'Sunken Chapel', dy: 0 }],
      portals: [
        { at: 'entry', to: 'moor', name: 'Road to the Ashen Moor', spr: 'gate', dx: -2 },
        { at: 'cata', to: 'cata1', name: 'Bone Catacombs', spr: 'stairs' },
        { at: 'village', to: 'drowned_village', name: 'On to the Drowned Village', spr: 'gate' },
        { at: 'roots', to: 'root_deep', name: 'Path to the Root Deep', spr: 'gate' }
      ],
      objects: (z, S) => {
        z.arrive.moor = z.start;
        // a way back up the Pilgrim Road (it used to be one-way)
        const pr = nearestOpen(z, S.N.entry.x + 4, S.N.entry.y + 10, 8);
        z.objects.push({ type: 'portal', x: pr.x, y: pr.y, to: 'pilgrim_road', name: 'Up the Pilgrim Road', spr: 'gate' });
        z.arrive.pilgrim_road = nearestOpen(z, pr.x, pr.y + 2);
        for (const s of [S.N.ne, S.N.sw]) { z.objects.push({ type: 'chest', x: Math.floor(s.x) + 1.5, y: Math.floor(s.y) + 0.5, open: false, ilvl: 10 }); z.objects.push({ type: 'chest', x: Math.floor(s.x) - 0.5, y: Math.floor(s.y) + 1.5, open: false, ilvl: 10 }); placePack(z, s.x + 0.5, s.y + 0.5, 11, PACKS_FEN, s === S.N.ne ? 'fne' : 'fsw', S.rng); }
      },
      // 70 packs at 8 spacing on 130x130 -> 54 packs at 12 spacing on 160x160, each ~30% larger
      packs: { table: PACKS_FEN, count: 54, spacing: 12, sizeK: 1.3, minStart: 18, lo: 6, hi: 11 },
      chests: 16, shrines: 7
    });
  }

  if (typeof genMoor === 'function') genMoor = function (seed) { return openMoor(seed); };
  if (typeof genFen === 'function') genFen = function (seed) { return openFen(seed); };

  const API = { buildOpen, wideDungeon, spreadPacks, spreadThings, scaleTable, road, curve, disc, connect, nearestOpen, smooth, ACT1_DUNGEONS,
    gen: (zid, seed) => ZONE_GEN[zid] ? ZONE_GEN[zid](seed) : null };
  if (typeof window !== 'undefined') window.__open = API;
  return API;
})();
