// Act III: The Parasitic Fen of Shog-Mire (mlvl 24-30). Nol-Shogthuth's flesh, sunk into a hot delta.
// Blood-mud flats that pulse to a heartbeat under the ground, black weeping mangroves, fetish-tree groves hung with
// grass masks and dripping egg sacs, and the Ziggurat of the First Brood with its basin of warm blood on the crown.
//
//   a3_town        Kettlewick Stilts               hub on a mud-brick mound in the delta (no monsters)
//   a3_flats       The Heartbeat Flats        24-25 wide mud flats and blood channels
//   a3_mangroves   The Weeping Mangroves      25-26 black mangrove groves around big clearings
//   a3_fetish      The Fetish-Tree Groves     26-27 masked groves, totem rings
//   a3_delta       The Blood Delta            26-28 braided blood channels, fords and islands
//   a3_amber       The Amber-Grease Mire      27-28 curdled pools, the trees bleed grease
//   a3_broodbanks  The Brood-Banks            28-29 a broad river of blood, egg-sac banks
//   a3_causeway    Causeway of the First Brood 29-30 flooded plaza, the ziggurat's foot
//   a3_sumps       The Leech-Sumps            26-28 dungeon (off the Fetish-Tree Groves)
//   a3_egggal      The Egg-Galleries          28-29 dungeon (off the Brood-Banks)
//   a3_ziggurat    Ziggurat of the First Brood 29-30 dungeon (off the Causeway), up to the crown
//   a3_lair        The Blood-Basin            30    open crown of the ziggurat, z.bossSpot for the act boss
//
// Heartbeat mud: on the beat (every 1.7 s) the blood-mud clutches; anything walking on MUD in an outdoor Shog-Mire
// zone is slowed a further 40% for the beat. Brood-Swollen Husks burst into leech larvae when they die; Masked
// Fetish-Priests leave a venom that eats at you for three seconds.
//
// This file also carries the shared kit used by zz_act4.js (window.__A34): outdoor painter, wide-hall dungeons,
// connectivity repair, pack filler, audit. Base files are untouched: ZONE_GEN, ZONE_NAMES, isOutdoor, ambient22,
// ambient37, atmosKind, floorTileFor, ztClassOf, ztWallTheme, ztTreeKind and genProps are wrapped so the new theme
// strings fall back to the nearest painted palette until the lead paints Shog-Mire and An-Vhar.
{
  if (typeof ZONE_GEN === 'object' && typeof T !== 'undefined' && typeof Zone === 'function') {

    // =============================================================================== shared kit (acts 3 and 4)
    const A34 = window.__A34 || (window.__A34 = (function () {
      const THEME_FB = { shogmire: 'fen', shogmire_deep: 'barrow', anvhar: 'moor', anvhar_deep: 'crypt' };
      const OUTDOOR = { shogmire: 1, anvhar: 1 };
      // day / night ambient per theme (the lighting pass multiplies the world by this)
      const AMB = {
        shogmire: { day: [200, 184, 164], night: [60, 48, 56], dusk: [168, 70, 58] },
        anvhar:   { day: [216, 224, 238], night: [52, 62, 104], dusk: [170, 120, 140] }
      };
      const AMB_DEEP = { shogmire_deep: [84, 64, 58], anvhar_deep: [70, 80, 100] };
      const shadows = new WeakMap();
      // a read-only stand-in for a zone whose theme is one of ours, dressed as the fallback theme
      function fb(z) {
        if (!z || !THEME_FB[z.theme]) return z;
        let s = shadows.get(z);
        if (!s) { s = Object.create(z, { theme: { value: THEME_FB[z.theme], writable: true } }); shadows.set(z, s); }
        return s;
      }
      function report(e) { try { if (typeof reportError === 'function') reportError(e); } catch (_) { } }

      // ------------------------------------------------------------- wraps (theme fallback + outdoor + light)
      if (typeof isOutdoor === 'function') { const _o = isOutdoor; isOutdoor = function (z) { return _o(z) || !!(z && OUTDOOR[z.theme]); }; }
      function ambientFor(z, orig) {
        if (!z) return orig(z);
        if (AMB_DEEP[z.theme]) return AMB_DEEP[z.theme].slice();
        const A = AMB[z.theme]; if (!A) return orig(z);
        const k = typeof dayK === 'function' ? dayK() : 1, p = typeof dayPhase === 'function' ? dayPhase() : 0.2;
        const e = k * k * (3 - 2 * k);
        let c = A.day.map((v, i) => A.night[i] + (v - A.night[i]) * e);
        const dusk = p > 0.5 && p < 0.72 ? Math.sin((p - 0.5) / 0.22 * Math.PI) : 0;
        if (dusk > 0) c = c.map((v, i) => v + (A.dusk[i] - v) * 0.55 * dusk);
        return c.map(v => Math.round(v));
      }
      if (typeof ambient37 === 'function') { const _a = ambient37; ambient37 = function (z) { return ambientFor(z, _a); }; }
      if (typeof ambient22 === 'function') { const _a = ambient22; ambient22 = function (z) { return ambientFor(z, _a); }; }
      if (typeof atmosKind === 'function') { const _a = atmosKind; atmosKind = function (z) { return _a(fb(z)); }; }
      if (typeof floorTileFor === 'function') { const _f = floorTileFor; floorTileFor = function (z, x, y, t) { return _f(fb(z), x, y, t); }; }
      if (typeof ztClassOf === 'function') { const _c = ztClassOf; ztClassOf = function (z, x, y) { return _c(fb(z), x, y); }; }
      if (typeof ztWallTheme === 'function') { const _w = ztWallTheme; ztWallTheme = function (z) { return _w(fb(z)); }; }
      if (typeof ztTreeKind === 'function') { const _k = ztTreeKind; ztTreeKind = function (z, x, y) { return _k(fb(z), x, y); }; }
      if (typeof genProps === 'function') { const _g = genProps; genProps = function (z) { return _g(fb(z)); }; }

      // ------------------------------------------------------------- small helpers
      const inb = (z, x, y, m) => x >= m && y >= m && x < z.w - m && y < z.h - m;
      const K = (name, fallback) => (typeof MON === 'object' && MON[name]) ? name : fallback;
      function stamp(z, cx, cy, r, tile, o) {
        const m = o && o.margin != null ? o.margin : 3, ov = o && o.over, r2 = (r + 0.35) * (r + 0.35);
        for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
          if (!inb(z, x, y, m)) continue;
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy; if (dx * dx + dy * dy > r2) continue;
          const cur = z.t[y * z.w + x]; if (ov && !ov(cur)) continue;
          const v = typeof tile === 'function' ? tile(cur, x, y) : tile; if (v != null) z.t[y * z.w + x] = v;
        }
      }
      // an organic disc: radius wobbles with the angle
      function blob(z, cx, cy, r, tile, rng, o) {
        const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28], amp = o && o.amp != null ? o.amp : 0.2, m = o && o.margin != null ? o.margin : 3, ov = o && o.over;
        const R = Math.ceil(r * (1 + amp) + 1);
        for (let y = Math.floor(cy) - R; y <= Math.floor(cy) + R; y++) for (let x = Math.floor(cx) - R; x <= Math.floor(cx) + R; x++) {
          if (!inb(z, x, y, m)) continue;
          const dx = x + 0.5 - cx, dy = y + 0.5 - cy, a = Math.atan2(dy, dx);
          const rr = r * (1 + amp * (0.5 * Math.sin(3 * a + ph[0]) + 0.3 * Math.sin(5 * a + ph[1]) + 0.2 * Math.sin(2 * a + ph[2])));
          if (dx * dx + dy * dy > rr * rr) continue;
          const cur = z.t[y * z.w + x]; if (ov && !ov(cur)) continue;
          const v = typeof tile === 'function' ? tile(cur, x, y) : tile; if (v != null) z.t[y * z.w + x] = v;
        }
      }
      function rect(z, x0, y0, x1, y1, tile, o) {
        const m = o && o.margin != null ? o.margin : 2, ov = o && o.over;
        for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
          if (!inb(z, x, y, m)) continue; const cur = z.t[y * z.w + x]; if (ov && !ov(cur)) continue;
          const v = typeof tile === 'function' ? tile(cur, x, y) : tile; if (v != null) z.t[y * z.w + x] = v;
        }
      }
      // midpoint displacement: a natural bend between control points
      function meander(pts, rng, jit, iters) {
        let out = pts.map(p => [p[0], p[1]]);
        for (let it = 0; it < (iters || 4); it++) {
          const nx = [];
          for (let i = 0; i < out.length - 1; i++) {
            const a = out[i], b = out[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
            const px = -(b[1] - a[1]) / L, py = (b[0] - a[0]) / L, off = (rng() - 0.5) * L * jit;
            nx.push(a, [(a[0] + b[0]) / 2 + px * off, (a[1] + b[1]) / 2 + py * off]);
          }
          nx.push(out[out.length - 1]); out = nx;
        }
        return out;
      }
      function stroke(z, pts, r, tile, o) {
        const cl = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L * 2));
          for (let k = 0; k < n; k++) { const t = k / n, x = a[0] + (b[0] - a[0]) * t, y = a[1] + (b[1] - a[1]) * t; stamp(z, x, y, r, tile, o); cl.push([x, y]); }
        }
        return cl;
      }
      // a river of `core` tiles with walkable banks and fords every `ford` tiles
      function river(z, pts, w, bank, ford, rng, core, shal) {
        const P = meander(pts, rng, 0.32, 4);
        const keep = c => c !== T.CLIFF && c !== T.WALL;
        stroke(z, P, w / 2 + bank, c => (c === core ? core : shal), { over: keep });
        const cl = stroke(z, P, w / 2, core, { over: keep });
        const step = Math.max(8, ford) * 2;
        for (let i = step >> 1; i < cl.length - 4; i += step) stamp(z, cl[i][0], cl[i][1], w / 2 + bank + 0.6, c => (c === core ? shal : c), { over: keep });
        return cl;
      }
      // nearest walkable tile centre to a world point
      function openNear(z, x, y, maxR) {
        const X = Math.floor(x), Y = Math.floor(y);
        if (z.walkTile(X, Y)) return { x: X + 0.5, y: Y + 0.5 };
        for (let r = 1; r <= (maxR || 10); r++) for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
          if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue;
          if (z.walkTile(X + i, Y + j)) return { x: X + i + 0.5, y: Y + j + 0.5 };
        }
        return { x: X + 0.5, y: Y + 0.5 };
      }
      function addLantern(z, x, y, name) {
        const p = openNear(z, x, y);
        z.lanterns.push({ x: p.x, y: p.y, name });
        z.objects.push({ type: 'lantern', x: p.x, y: p.y, idx: z.lanterns.length - 1, name });
        return p;
      }
      function addPortal(z, x, y, to, name, spr) {
        const p = openNear(z, x, y);
        z.objects.push({ type: 'portal', x: p.x, y: p.y, to, name, spr: spr || 'gate' });
        z.arrive = z.arrive || {};
        z.arrive[to] = openNear(z, p.x, p.y + 1.6);
        return p;
      }
      // connect every walkable pocket bigger than minComp to the start; smaller ones are filled
      function connectAll(z, sx, sy, bridge, bridgeR, minComp, fill) {
        const W = z.w, N = W * z.h;
        for (let pass = 0; pass < 80; pass++) {
          const seen = floodFrom(z, sx, sy);
          const comp = new Int32Array(N).fill(-1), q = new Int32Array(N), big = new Set();
          let id = 0;
          for (let i = 0; i < N; i++) {
            if (seen[i] || comp[i] >= 0 || SOLID[z.t[i]]) continue;
            let h = 0, tl = 0; q[tl++] = i; comp[i] = id;
            while (h < tl) { const k = q[h++], x = k % W, y = (k / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= z.h) continue; const j = ny * W + nx; if (comp[j] < 0 && !seen[j] && !SOLID[z.t[j]]) { comp[j] = id; q[tl++] = j; } } }
            if (tl >= minComp) big.add(id); id++;
          }
          if (!big.size) break;
          const par = new Int32Array(N).fill(-2); let h = 0, tl = 0, hit = -1;
          for (let i = 0; i < N; i++) if (seen[i]) { par[i] = -1; q[tl++] = i; }
          outer: while (h < tl) {
            const k = q[h++], x = k % W, y = (k / W) | 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
              const nx = x + dx, ny = y + dy; if (!inb(z, nx, ny, 3)) continue;
              const j = ny * W + nx; if (par[j] !== -2) continue; par[j] = k;
              if (comp[j] >= 0 && big.has(comp[j])) { hit = j; break outer; }
              q[tl++] = j;
            }
          }
          if (hit < 0) break;
          let k = hit, guard = 0;
          while (k >= 0 && guard++ < N) { const x = k % W, y = (k / W) | 0; if (SOLID[z.t[k]] || !seen[k]) stamp(z, x + 0.5, y + 0.5, bridgeR, c => (SOLID[c] ? bridge(c) : c), { margin: 3 }); if (seen[k]) break; k = par[k]; }
        }
        const seen = floodFrom(z, sx, sy);
        for (let i = 0; i < N; i++) if (!seen[i] && !SOLID[z.t[i]]) z.t[i] = fill;
      }
      // walkable pools next to open ground
      function banks(z, core, shal, p, rng) {
        const out = [];
        for (let y = 1; y < z.h - 1; y++) for (let x = 1; x < z.w - 1; x++) {
          if (z.get(x, y) !== core) continue;
          let ok = false; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const n = z.get(x + dx, y + dy); if (!SOLID[n] && n !== shal) ok = true; }
          if (ok && rng() < p) out.push([x, y]);
        }
        for (const [x, y] of out) z.set(x, y, shal);
      }
      // quantile-thresholded noise layers: `frac` of the eligible tiles become `tile`
      function layer(z, rng, L, base) {
        const W = z.w, H = z.h, n = makeNoise(rng), n2 = makeNoise(rng), ox = rng() * 60, oy = rng() * 60;
        const vals = new Float32Array(W * H), elig = [];
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = y * W + x, cur = z.t[i];
          if (L.over ? !L.over.includes(cur) : cur !== base) continue;
          let v = fbm(n, x / L.s + ox, y / L.s + oy);
          if (L.ridge) v = 1 - Math.abs(v - 0.47) * 4;
          vals[i] = v; elig.push(i);
        }
        if (!elig.length) return;
        const sample = elig.filter((_, k) => k % 5 === 0).map(i => vals[i]).sort((a, b) => a - b);
        const qlo = L.q ? L.q[0] : 1 - L.frac, qhi = L.q ? L.q[1] : 1;
        const tlo = sample[Math.min(sample.length - 1, Math.floor(qlo * sample.length))], thi = qhi >= 1 ? 9 : sample[Math.min(sample.length - 1, Math.floor(qhi * sample.length))];
        for (const i of elig) {
          const v = vals[i]; if (v < tlo || v > thi) continue;
          if (L.speck != null && n2((i % W) / (L.ss || 2.2), ((i / W) | 0) / (L.ss || 2.2)) < L.speck) continue;
          z.t[i] = L.tile;
        }
      }

      // ------------------------------------------------------------- packs, chests, shrines
      const PACKABLE = new Set([T.GRASS, T.ROAD, T.DIRT, T.MUD, T.FLAGS, T.FLOOR]);
      function fillPacks(z, table, lo, hi, o) {
        if (!table || !table.length || typeof placePack !== 'function') return 0;
        const rng = o.rng, W = z.w, H = z.h;
        const d0 = bfsDist(z, Math.floor(z.start.x), Math.floor(z.start.y));
        let walk = 0; for (let i = 0; i < d0.length; i++) if (d0[i] >= 0) walk++;
        const spots = []; let dmax = 1;
        for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
          const i = y * W + x; if (d0[i] < 0) continue; if (d0[i] > dmax) dmax = d0[i];
          if (d0[i] > (o.minDist || 20) && PACKABLE.has(z.t[i])) spots.push([x, y, d0[i]]);
        }
        for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
        const keep = z.objects.filter(o2 => o2.type === 'portal' || o2.type === 'lantern').map(o2 => [o2.x, o2.y]);
        const used = [];
        const far = (x, y, r) => used.every(([ux, uy]) => Math.hypot(ux - x, uy - y) > r) && keep.every(([kx, ky]) => Math.hypot(kx - x, ky - y) > 7);
        const packMax = o.packMax != null ? o.packMax : Math.max(8, Math.min(46, Math.round(walk / (o.packPer || 430))));
        const chestMax = o.chestMax != null ? o.chestMax : Math.max(4, Math.round(packMax / 3));
        const shrineMax = o.shrineMax != null ? o.shrineMax : Math.max(3, Math.round(packMax / 7));
        let np = 0, nc = 0, ns = 0;
        const lvl = d => clamp(lo + Math.floor((hi - lo + 1) * d / (dmax + 1)), lo, hi);
        for (const [x, y, d] of spots) {
          if (np < packMax && far(x, y, o.space || 10)) { placePack(z, x + 0.5, y + 0.5, lvl(d), table, (o.prefix || z.id) + '_' + np, rng); used.push([x, y]); np++; continue; }
          const t = z.t[y * W + x];
          if (nc < chestMax && (t === T.GRASS || t === T.FLOOR || t === T.FLAGS || t === T.DIRT) && far(x, y, 6)) { z.objects.push({ type: 'chest', x: x + 0.5, y: y + 0.5, open: false, ilvl: lvl(d) }); used.push([x, y]); nc++; continue; }
          if (ns < shrineMax && (t === T.GRASS || t === T.FLOOR || t === T.FLAGS) && far(x, y, 8)) { z.objects.push({ type: 'shrine', x: x + 0.5, y: y + 0.5, used: false, kind: pick(['echo', 'wisp', 'stone', 'refill']) }); used.push([x, y]); ns++; }
        }
        return np;
      }

      // ------------------------------------------------------------- outdoor painter
      // o: id name W H theme act seed dark lo hi base border{tile,min,var,fringe,fringeW} layers[] rivers[]
      //    clearings{n,r:[a,b],tile,over} sites{key:{at:[fx,fy],j,r,tile}} paths[[a,b]] pathR pathTile custom(z,rng,S)
      //    bankTile core fill bridge bridgeR lanterns[[site,name]] portals[{site,to,name,spr}] start ruins packs() packPer decor(z,rng,S)
      function genOutdoor(o) {
        const rng = mulberry32(o.seed), W = o.W, H = o.H, base = o.base != null ? o.base : T.GRASS;
        const z = new Zone(o.id, o.name, W, H, o.dark != null ? o.dark : 0.4);
        z.theme = o.theme; z.act = o.act; z.seed = o.seed; z.decor = [];
        z.t.fill(base);
        for (const L of (o.layers || [])) layer(z, rng, L, base);
        // border: a noisy wall of cliff, with an optional fringe inside it (mangrove thicket, scree)
        const B = o.border || {}, nb = makeNoise(rng);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const edge = Math.min(x, y, W - 1 - x, H - 1 - y), n = nb(x / 7, y / 7);
          const th = (B.min || 3) + Math.floor(n * (B.var != null ? B.var : 4));
          if (edge < th) z.t[y * W + x] = B.tile != null ? B.tile : T.CLIFF;
          else if (B.fringe != null && edge < th + (B.fringeW || 2) + Math.floor(n * 3) && rng() < 0.8) z.t[y * W + x] = B.fringe;
        }
        const core = o.core != null ? o.core : T.WATER, shal = o.bankTile != null ? o.bankTile : T.SHALLOW;
        for (const rv of (o.rivers || [])) river(z, rv.pts.map(p => [p[0] * W, p[1] * H]), rv.w, rv.bank != null ? rv.bank : 2, rv.ford || 22, rng, core, shal);
        // sites
        const S = {};
        for (const k in (o.sites || {})) {
          const s = o.sites[k], j = s.j != null ? s.j : 0.05;
          const x = clamp(Math.round((s.at[0] + (rng() - 0.5) * 2 * j) * W), s.edge ? 6 : 10, W - (s.edge ? 7 : 11));
          const y = clamp(Math.round((s.at[1] + (rng() - 0.5) * 2 * j) * H), s.edge ? 6 : 10, H - (s.edge ? 7 : 11));
          S[k] = { x, y, r: s.r || 5, tile: s.tile != null ? s.tile : base };
        }
        // clearings: the open heart of the D2 outdoors
        const C = o.clearings;
        if (C) for (let i = 0; i < C.n; i++) {
          const r = C.r[0] + rng() * (C.r[1] - C.r[0]);
          const cx = r + 8 + rng() * (W - 2 * r - 16), cy = r + 8 + rng() * (H - 2 * r - 16);
          const over = C.over || [T.TREE, T.ROCK];
          blob(z, cx, cy, r, C.tile != null ? C.tile : base, rng, { amp: 0.28, over: c => over.includes(c) });
        }
        const pt = o.pathTile != null ? o.pathTile : T.DIRT;
        const keepMask = new Uint8Array(W * H);   // the ways through: no ruin may choke them
        const pathFn = (c, x, y) => { keepMask[y * W + x] = 1; return c === core ? shal : c === shal ? (o.pathOverShallow != null ? o.pathOverShallow : shal) : c === T.CLIFF ? (o.bridgeTile != null ? o.bridgeTile : T.FLAGS) : c === T.MUD && o.pathKeepsMud ? T.MUD : pt; };
        for (const [a, b] of (o.paths || [])) {
          const A = S[a], Bb = S[b]; if (!A || !Bb) continue;
          stroke(z, meander([[A.x + 0.5, A.y + 0.5], [Bb.x + 0.5, Bb.y + 0.5]], rng, 0.28, 3), o.pathR || 2.8, pathFn, { margin: 3 });
        }
        for (const k in S) blob(z, S[k].x + 0.5, S[k].y + 0.5, S[k].r, (c, x, y) => { keepMask[y * W + x] = 1; return S[k].tile; }, rng, { amp: 0.18, margin: 3 });
        if (o.custom) o.custom(z, rng, S);
        if (o.banks) banks(z, core, shal, o.banks, rng);
        const st = S[o.start || 'entry'];
        const sp = openNear(z, st.x + 2.5, st.y + 0.5);
        const bridge = o.bridge || (c => (c === core ? shal : c === T.CLIFF ? T.FLAGS : T.DIRT));
        connectAll(z, Math.floor(sp.x), Math.floor(sp.y), bridge, o.bridgeR || 2.6, o.minComp || 40, o.fill != null ? o.fill : T.CLIFF);
        z.start = openNear(z, sp.x, sp.y);
        for (const [k, name] of (o.lanterns || [])) { const s = S[k]; if (s) addLantern(z, s.x + (s === st ? 1.5 : 0.5), s.y - (s === st ? 1.5 : 0) + 0.5, name); }
        for (const p of (o.portals || [])) { const s = S[p.site]; if (s) addPortal(z, s.x + 0.5, s.y + 0.5, p.to, p.name, p.spr); }
        if (o.ruins && typeof placeRuin === 'function') {
          // the Triune's ruins, but never across a road or a site: a ruin that lands within 3 paces of one is undone
          let n = 0, tries = 0;
          while (n < o.ruins && tries++ < 300) {
            const snap = z.t.slice(), nObj = z.objects.length, nR = (z.ruins || []).length;
            let ok = false; try { ok = placeRuin(z, rng); } catch (e) { report(e); break; }
            if (!ok) continue;
            let clash = false;
            for (let i = 0; i < z.t.length && !clash; i++) {
              if (z.t[i] === snap[i]) continue;
              const x = i % W, y = (i / W) | 0;
              for (let j = -3; j <= 3 && !clash; j++) for (let k = -3; k <= 3; k++) { const q = (y + j) * W + x + k; if (q >= 0 && q < z.t.length && keepMask[q]) { clash = true; break; } }
            }
            if (clash) { z.t.set(snap); z.objects.length = nObj; if (z.ruins) z.ruins.length = nR; continue; }
            n++;
          }
        }
        const table = o.packs ? o.packs() : null;
        fillPacks(z, table, o.lo, o.hi, { rng, prefix: o.id, packPer: o.packPer, packMax: o.packMax, minDist: o.minDist, space: o.space });
        if (o.decor) o.decor(z, rng, S);
        z.sites = {}; for (const k in S) z.sites[k] = { x: S[k].x + 0.5, y: S[k].y + 0.5 };
        return z;
      }

      // ------------------------------------------------------------- wide-hall dungeons (corridors >= 5)
      // o: id name W H theme act seed dark lo hi rooms rmin rmax gap cw blob pillars loops up{to,name} down[{to,name,spr}]
      //    lanterns[names] packs() chests
      function genHalls(o) {
        const rng = mulberry32(o.seed), R = (a, b) => a + Math.floor(rng() * (b - a + 1)), W = o.W, H = o.H;
        const z = new Zone(o.id, o.name, W, H, o.dark != null ? o.dark : 0.8);
        z.theme = o.theme; z.act = o.act; z.seed = o.seed; z.decor = [];
        z.t.fill(T.WALL);
        const rooms = [], gap = o.gap || 5;
        for (let i = 0; i < 3000 && rooms.length < o.rooms; i++) {
          const w = R(o.rmin, o.rmax), h = R(o.rmin, o.rmax), x = R(3, W - w - 4), y = R(3, H - h - 4);
          if (rooms.some(r => x < r.x + r.w + gap && x + w + gap > r.x && y < r.y + r.h + gap && y + h + gap > r.y)) continue;
          rooms.push({ x, y, w, h, cx: x + w / 2, cy: y + h / 2 });
        }
        rooms.sort((a, b) => (a.cx + a.cy) - (b.cx + b.cy));
        const carve = (x0, y0, x1, y1) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (x >= 2 && y >= 2 && x < W - 2 && y < H - 2) z.t[y * W + x] = T.FLOOR; };
        const nb = makeNoise(rng);
        for (const r of rooms) {
          if (o.blob) {
            for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
              const dx = (x + 0.5 - r.cx) / (r.w / 2), dy = (y + 0.5 - r.cy) / (r.h / 2), k = 1 + (nb(x / 5, y / 5) - 0.5) * 0.3;
              if (dx * dx + dy * dy <= k * k) carve(x, y, x, y);
            }
            r.blob = true;
          } else carve(r.x, r.y, r.x + r.w - 1, r.y + r.h - 1);
        }
        // spanning tree on room centres, then a few loops so nothing is one long dead-end string
        const edges = [], inT = [0], rest = rooms.map((_, i) => i).slice(1);
        while (rest.length) {
          let bi = -1, bj = -1, bd = 1e9;
          for (const i of inT) for (const j of rest) { const d = Math.hypot(rooms[i].cx - rooms[j].cx, rooms[i].cy - rooms[j].cy); if (d < bd) { bd = d; bi = i; bj = j; } }
          edges.push([bi, bj]); inT.push(bj); rest.splice(rest.indexOf(bj), 1);
        }
        const linked = (a, b) => edges.some(e => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a));
        for (let k = 0; k < Math.round(rooms.length * (o.loops != null ? o.loops : 0.3)); k++) {
          const a = R(0, rooms.length - 1); let b = -1, bd = 1e9;
          for (let j = 0; j < rooms.length; j++) { if (j === a || linked(a, j)) continue; const d = Math.hypot(rooms[a].cx - rooms[j].cx, rooms[a].cy - rooms[j].cy); if (d < bd) { bd = d; b = j; } }
          if (b >= 0 && bd < Math.max(W, H) * 0.42) edges.push([a, b]);
        }
        const cw = o.cw || 5, hw = Math.floor(cw / 2);
        for (const [i, j] of edges) {
          const a = rooms[i], b = rooms[j], ax = Math.floor(a.cx), ay = Math.floor(a.cy), bx = Math.floor(b.cx), by = Math.floor(b.cy);
          if (rng() < 0.5) { carve(Math.min(ax, bx) - hw, ay - hw, Math.max(ax, bx) + hw, ay - hw + cw - 1); carve(bx - hw, Math.min(ay, by) - hw, bx - hw + cw - 1, Math.max(ay, by) + hw); }
          else { carve(ax - hw, Math.min(ay, by) - hw, ax - hw + cw - 1, Math.max(ay, by) + hw); carve(Math.min(ax, bx) - hw, by - hw, Math.max(ax, bx) + hw, by - hw + cw - 1); }
        }
        // pillared halls in the big rectangular rooms
        if (o.pillars) for (const r of rooms) {
          if (r === rooms[0] || r.blob || r.w < 17 || r.h < 17) continue;
          for (let y = r.y + 5; y <= r.y + r.h - 6; y += 6) for (let x = r.x + 5; x <= r.x + r.w - 6; x += 6) {
            if (Math.abs(x + 0.5 - r.cx) < 4 || Math.abs(y + 0.5 - r.cy) < 4) continue;   // keep the crossing lanes clear
            z.t[y * W + x] = T.PILLAR;
          }
        }
        if (o.custom) o.custom(z, rng, rooms);
        const start = rooms[0];
        const d0 = bfsDist(z, Math.floor(start.cx), Math.floor(start.cy));
        const rd = r => { const p = openNear(z, r.cx, r.cy); return d0[Math.floor(p.y) * W + Math.floor(p.x)]; };
        const byFar = rooms.filter(r => r !== start).sort((a, b) => rd(b) - rd(a));
        z.start = openNear(z, start.cx, start.cy + 2);
        z.arrive = {};
        const up = addPortal(z, start.cx - 2, start.cy - 2, o.up.to, o.up.name, o.up.spr || 'stairs');
        z.arrive[o.up.to] = z.start;
        void up;
        addLantern(z, start.cx + 2, start.cy - 2, (o.lanterns && o.lanterns[0]) || (o.name + ' Threshold'));
        const downs = o.down || [];
        downs.forEach((d, i) => { const r = byFar[i] || byFar[0]; r.exit = true; addPortal(z, r.cx, r.cy - 1, d.to, d.name, d.spr || 'stairs'); });
        // named lanterns in the middle reaches
        const mids = byFar.filter(r => !r.exit).slice(Math.floor(byFar.length * 0.3));
        (o.lanterns || []).slice(1).forEach((nm, i) => { const r = mids[Math.floor(i * mids.length / Math.max(1, (o.lanterns.length - 1)))] || mids[0]; if (r) addLantern(z, r.cx + 1, r.cy + 1, nm); });
        const table = o.packs ? o.packs() : null, far = Math.max(1, rd(byFar[0]));
        let pid = 0;
        if (table && typeof placePack === 'function') for (const r of rooms) {
          if (r === start) continue;
          const mlvl = clamp(o.lo + Math.round((o.hi - o.lo) * rd(r) / far), o.lo, o.hi);
          const n = clamp(Math.round(r.w * r.h / 150), 1, 3);
          for (let k = 0; k < n; k++) { const p = openNear(z, r.x + 2 + rng() * (r.w - 4), r.y + 2 + rng() * (r.h - 4)); placePack(z, p.x, p.y, mlvl, table, o.id + '_' + (pid++), rng); }
          if (rng() < (o.chests != null ? o.chests : 0.45)) { const p = openNear(z, r.x + 2.5, r.y + 2.5); z.objects.push({ type: 'chest', x: p.x, y: p.y, open: false, ilvl: mlvl + 1 }); }
        }
        if (!downs.length && byFar[0]) {
          const f = byFar[0]; f.vault = true;
          const a = openNear(z, f.cx + 1.5, f.cy), b = openNear(z, f.cx - 1.5, f.cy);
          z.objects.push({ type: 'chest', x: a.x, y: a.y, open: false, ilvl: o.hi + 1 }, { type: 'chest', x: b.x, y: b.y, open: false, ilvl: o.hi + 1 });
          if (table) { const p = openNear(z, f.cx, f.cy + 2); placePack(z, p.x, p.y, o.hi + 1, table, o.id + '_lord', rng); }
        }
        // nothing may stand in a wall
        for (const m of z.monsters) if (z.solidAt(m.x, m.y)) { const p = openNear(z, m.x, m.y); m.x = m.hx = p.x; m.y = m.hy = p.y; }
        z.rooms = rooms.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h }));
        return z;
      }

      // ------------------------------------------------------------- registration
      function reg(id, name, act, fn, opts) {
        ZONE_GEN[id] = function (seed) {
          const g = (typeof G !== 'undefined' && G) ? G : null, prev = g ? g.__genZone : undefined;
          if (g) g.__genZone = id;
          try {
            const z = fn(seed);
            z.act = act;
            if (opts && opts.dress && typeof dressZone === 'function') { try { dressZone(z, seed); } catch (e) { report(e); } }
            return z;
          } finally { if (g) g.__genZone = prev; }
        };
        if (typeof ZONE_NAMES === 'object') ZONE_NAMES[id] = name;
      }

      // ------------------------------------------------------------- audit (tests)
      // reachability of every object / npc spot / boss spot, openness, and the bottleneck width from the start to
      // each portal (widest path's narrowest point: a 5-wide corridor reads 5).
      function audit(z) {
        const W = z.w, N = W * z.h;
        const seen = floodFrom(z, Math.floor(z.start.x), Math.floor(z.start.y));
        const near = (x, y) => { const X = Math.floor(x), Y = Math.floor(y); for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const k = (Y + j) * W + X + i; if (k >= 0 && k < N && seen[k]) return true; } return false; };
        const bad = [];
        for (const o of z.objects) if (!near(o.x, o.y)) bad.push(o.type + ':' + (o.to || o.name || '') + '@' + o.x.toFixed(1) + ',' + o.y.toFixed(1));
        for (const m of z.monsters) if (!near(m.x, m.y)) bad.push('mon:' + m.type);
        for (const s of (z.npcSpots || [])) if (!near(s.x, s.y)) bad.push('npc:' + s.role);
        if (z.bossSpot && !near(z.bossSpot.x, z.bossSpot.y)) bad.push('bossSpot');
        // distance to the nearest solid mass (a 3-4 chamfer, near enough to true distance that a diagonal ford
        // reads as wide as a straight one); a lone pole, tree or stone is walked round, not a choke, so only solid
        // masses (3+ solid neighbours) bound the width. d is kept in half-tiles.
        const massT = t => SOLID[t] && t !== T.PILLAR;
        const mass = i => { if (!massT(z.t[i])) return false; const x = i % W, y = (i / W) | 0; let n = 0; for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) if ((j || k) && massT(z.get(x + k, y + j))) n++; return n >= 3; };
        const ch = new Int32Array(N);
        for (let i = 0; i < N; i++) ch[i] = mass(i) ? 0 : 1e8;
        const H2 = z.h;
        for (let y = 0; y < H2; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let v = ch[i]; if (x > 0) v = Math.min(v, ch[i - 1] + 3); if (y > 0) { v = Math.min(v, ch[i - W] + 3); if (x > 0) v = Math.min(v, ch[i - W - 1] + 4); if (x < W - 1) v = Math.min(v, ch[i - W + 1] + 4); } ch[i] = v; }
        for (let y = H2 - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; let v = ch[i]; if (x < W - 1) v = Math.min(v, ch[i + 1] + 3); if (y < H2 - 1) { v = Math.min(v, ch[i + W] + 3); if (x < W - 1) v = Math.min(v, ch[i + W + 1] + 4); if (x > 0) v = Math.min(v, ch[i + W - 1] + 4); } ch[i] = v; }
        const d = new Int32Array(N); for (let i = 0; i < N; i++) d[i] = Math.min(200, Math.floor(ch[i] * 2 / 3));
        let walk = 0, sum = 0, tight = 0;
        for (let i = 0; i < N; i++) if (seen[i]) { walk++; sum += d[i] / 2; if (d[i] <= 3) tight++; }
        // widest-path bottleneck from the start
        const best = new Int32Array(N).fill(0), buckets = [];
        let s0 = Math.floor(z.start.y) * W + Math.floor(z.start.x);
        for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) { const k = (Math.floor(z.start.y) + j) * W + Math.floor(z.start.x) + i; if (k >= 0 && k < N && seen[k] && d[k] > d[s0]) s0 = k; }
        best[s0] = d[s0]; (buckets[d[s0]] = buckets[d[s0]] || []).push(s0);
        for (let b = buckets.length - 1; b >= 1; b--) {
          const L = buckets[b]; if (!L) continue;
          while (L.length) {
            const k = L.pop(); if (best[k] !== b) continue;
            const x = k % W, y = (k / W) | 0;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= z.h) continue; const n = ny * W + nx; if (!seen[n]) continue; const c = Math.min(b, d[n]); if (c > best[n]) { best[n] = c; (buckets[c] = buckets[c] || []).push(n); } }
          }
        }
        const bn = (x, y) => { let v = 0; const X = Math.floor(x), Y = Math.floor(y); for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const k = (Y + j) * W + X + i; if (k >= 0 && k < N) v = Math.max(v, best[k]); } return v - 1; };
        const portals = z.objects.filter(o => o.type === 'portal').map(o => ({ to: o.to, width: bn(o.x, o.y) }));
        const packs = new Set(z.monsters.map(m => m.pack)).size;
        const lv = z.monsters.map(m => m.mlvlBase != null ? m.mlvlBase : m.mlvl);
        return {
          id: z.id, name: z.name, w: z.w, h: z.h, theme: z.theme, act: z.act,
          walkFrac: +(walk / N).toFixed(3), meanOpen: +(sum / Math.max(1, walk)).toFixed(2), tightFrac: +(tight / Math.max(1, walk)).toFixed(3),
          unreachable: bad, portals, bossWidth: z.bossSpot ? bn(z.bossSpot.x, z.bossSpot.y) : null,
          packs, monsters: z.monsters.length, mlvl: lv.length ? [Math.min(...lv), Math.max(...lv)] : null,
          lanterns: z.lanterns.length, chests: z.objects.filter(o => o.type === 'chest').length,
          npcSpots: (z.npcSpots || []).length, bossSpot: z.bossSpot || null
        };
      }

      return { THEME_FB, OUTDOOR, fb, K, stamp, blob, rect, meander, stroke, river, openNear, addLantern, addPortal, connectAll, banks, layer, fillPacks, genOutdoor, genHalls, reg, audit, report };
    })());

    const { K, stamp, blob, rect, openNear, addLantern, addPortal, genOutdoor, genHalls, reg, report } = A34;

    // =============================================================================== Act III bestiary
    // Raw shapes at mlvl 1; makeMon scales them. Bodies borrow painted sprites and a tint until the lead draws them.
    Object.assign(MON, {
      a3_broodhusk:       { name: 'Brood-Swollen Husk',  spr: 'bloat', tint: '#7a3a2e', hp: 34, dmg: [5, 9],   spd: 1.6, r: .36, xp: 22, ai: 'husk',    range: 1.0, wind: .55, rec: .75, poiseK: .6, brood: 3 },
      a3_larva:           { name: 'Clot-Spawn',         spr: 'worm',  tint: '#b0584a', hp: 7,  dmg: [2, 4],   spd: 3.6, r: .2,  xp: 3,  ai: 'flank',   range: .7,  wind: .22, rec: .4,  poiseK: .2, noLoot: true },
      a3_fetishpriest:    { name: 'Masked Fetish-Priest', spr: 'hand', tint: '#c8a060', hp: 22, dmg: [5, 8],   spd: 3.3, r: .28, xp: 24, ai: 'flank',   range: .9,  wind: .28, rec: .45, poiseK: .4, venom: .5 },
      a3_mudleaper:       { name: 'Mud-Leaper',          spr: 'worm',  tint: '#4a1a18', hp: 30, dmg: [6, 11],  spd: 3.2, r: .32, xp: 26, ai: 'burrow',  range: 1.4, wind: .35, poiseK: .5 },
      a3_mangrovestalker: { name: 'Mangrove Stalker',    spr: 'hand',  tint: '#1e1a14', hp: 30, dmg: [7, 12],  spd: 2.7, r: .3,  xp: 32, ai: 'stalker', range: .95, wind: .3,  rec: .6,  poiseK: .45 },
      a3_amberwitch:      { name: 'Amber-Weeping Gasp',  spr: 'gasp',  tint: '#d89a40', hp: 24, dmg: [7, 11],  spd: 1.5, r: .28, xp: 28, ai: 'ghost',   wind: .85, poiseK: .3 },
      a3_broodsow:        { name: 'Brood-Sow',           spr: 'bloat', tint: '#8a4a52', hp: 80, dmg: [10, 16], spd: 1.3, r: .5,  xp: 52, ai: 'charger', range: 1.2, wind: .7,  rec: 1.0, armor: 20, poiseK: 1.1 }
    });

    // pack tables are built when a zone generates, so kinds registered later are picked up
    function packs3() {
      if (typeof AI22 === 'object' && !AI22.stalker) MON.a3_mangrovestalker.ai = 'flank';   // zz_monsters_new.js brings the stalker AI
      const DR = K('drowned', 'hollow'), BL = K('bloatling', 'bloat'), MS = K('moth_saint', 'moth'), LE = K('leech', 'worm'), BW = K('bogwitch', 'caster');
      return {
        flats:    [['a3_broodhusk', 3, 4], ['a3_mudleaper', 2, 3, 'a3_broodhusk', 1, 2], [DR, 3, 4, 'a3_broodhusk', 1, 1], ['a3_fetishpriest', 2, 3], [BL, 2, 3, 'a3_broodhusk', 1, 2]],
        mangrove: [['a3_mangrovestalker', 1, 2, 'a3_broodhusk', 2, 2], ['a3_fetishpriest', 3, 4], ['a3_amberwitch', 2, 2, 'a3_broodhusk', 2, 2], ['a3_mudleaper', 2, 3], [MS, 3, 3]],
        fetish:   [['a3_fetishpriest', 3, 5], ['a3_fetishpriest', 2, 3, 'a3_amberwitch', 1, 2], ['a3_mangrovestalker', 2, 2], ['a3_broodhusk', 2, 3, 'a3_fetishpriest', 1, 1]],
        delta:    [['a3_mudleaper', 3, 4], ['a3_broodhusk', 3, 4], [LE, 2, 3, 'a3_broodhusk', 1, 2], ['a3_amberwitch', 2, 3], ['a3_fetishpriest', 2, 3, 'a3_mudleaper', 1, 1]],
        amber:    [['a3_amberwitch', 3, 4], ['a3_broodhusk', 3, 3, 'a3_amberwitch', 1, 1], ['a3_mudleaper', 2, 3], ['a3_mangrovestalker', 2, 2], [BW, 2, 3, 'a3_broodhusk', 1, 2]],
        brood:    [['a3_broodsow', 1, 1, 'a3_broodhusk', 2, 3], ['a3_broodhusk', 4, 5], ['a3_fetishpriest', 2, 3, 'a3_broodsow', 1, 1], ['a3_mudleaper', 3, 3]],
        causeway: [['a3_fetishpriest', 3, 4, 'a3_amberwitch', 1, 1], ['a3_broodsow', 1, 2], ['a3_broodhusk', 3, 4, 'a3_fetishpriest', 1, 2], ['a3_mangrovestalker', 2, 2, 'a3_amberwitch', 1, 2], ['a3_mudleaper', 2, 3, 'a3_broodsow', 1, 1]],
        sumps:    [['a3_mudleaper', 2, 3], ['a3_broodhusk', 3, 4], [LE, 3, 3, 'a3_broodhusk', 1, 1], ['a3_amberwitch', 2, 2, 'a3_broodhusk', 1, 2]],
        egggal:   [['a3_broodsow', 1, 2, 'a3_broodhusk', 2, 2], ['a3_broodhusk', 4, 5], ['a3_fetishpriest', 3, 3], ['a3_amberwitch', 2, 3]],
        ziggurat: [['a3_fetishpriest', 3, 4], ['a3_broodsow', 1, 1, 'a3_fetishpriest', 2, 2], ['a3_amberwitch', 2, 3, 'a3_broodhusk', 2, 2], ['a3_mangrovestalker', 2, 3], ['a3_broodhusk', 4, 4]],
        lair:     [['a3_fetishpriest', 3, 4], ['a3_broodhusk', 3, 4], ['a3_amberwitch', 2, 3]]
      };
    }

    // =============================================================================== Act III terrain
    const SH = 'shogmire';
    const notCliff = c => c !== T.CLIFF;
    // the shared jungle kit: black mangrove groves, blood-mud, a thin fringe of thicket inside the border
    const jungleBorder = { tile: T.CLIFF, min: 3, var: 4, fringe: T.TREE, fringeW: 2 };
    const bridge3 = c => (c === T.WATER ? T.SHALLOW : c === T.CLIFF ? T.FLAGS : T.DIRT);
    function fetishRing(z, rng, cx, cy, r) {
      // a totem ring: poles every few paces with wide gaps, bare earth inside, an egg-sac cluster at the heart
      blob(z, cx, cy, r + 1.5, T.DIRT, rng, { amp: 0.12, over: c => c !== T.CLIFF && c !== T.WATER });
      const n = 7 + Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) {
        if (i % 3 === 2) continue;   // gaps you can walk a pack through
        const a = i / n * Math.PI * 2 + rng() * 0.15, px = Math.floor(cx + Math.cos(a) * r), py = Math.floor(cy + Math.sin(a) * r);
        if (z.get(px, py) !== T.CLIFF) { z.set(px, py, T.PILLAR); z.decor.push({ kind: 'fetish_tree', x: px + 0.5, y: py + 0.5 }); }
      }
      z.decor.push({ kind: 'egg_sacs', x: cx, y: cy, n: 3 + Math.floor(rng() * 4) });
      z.decor.push({ kind: 'grass_masks', x: cx, y: cy - 1 });
    }
    function scatterDecor(z, rng, kind, n, ok) {
      for (let i = 0, tries = 0; i < n && tries < n * 60; tries++) {
        const x = 6 + Math.floor(rng() * (z.w - 12)), y = 6 + Math.floor(rng() * (z.h - 12));
        if (!ok(z.get(x, y), x, y)) continue;
        z.decor.push({ kind, x: x + 0.5, y: y + 0.5, v: Math.floor(rng() * 4) }); i++;
      }
    }
    const nearTile = (z, x, y, t, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (z.get(x + i, y + j) === t) return true; return false; };
    const shogDecor = (z, rng, extra) => {
      scatterDecor(z, rng, 'weeping_mangrove', 18, (t, x, y) => t === T.TREE && !nearTile(z, x, y, T.CLIFF, 2));
      scatterDecor(z, rng, 'heartbeat_vent', 10, t => t === T.MUD);
      scatterDecor(z, rng, 'amber_grease', 8, (t, x, y) => t === T.GRASS && nearTile(z, x, y, T.TREE, 1));
      if (extra) extra(z, rng);
    };

    // ------------------------------------------------------------- a3_town: Kettlewick Stilts
    function genTown3(seed) {
      const rng = mulberry32(seed * 61 + 7), W = 84, H = 84, cx = 42, cy = 42;
      const z = new Zone('a3_town', 'Kettlewick Stilts', W, H, 0.3);
      z.theme = SH; z.act = 3; z.seed = seed; z.decor = []; z.town = true;
      z.t.fill(T.WATER);
      rect(z, 0, 0, W - 1, H - 1, (c, x, y) => (Math.min(x, y, W - 1 - x, H - 1 - y) < 3 ? T.CLIFF : c), { margin: 0 });
      // the mound: mud-brick and trodden earth rising out of the blood-lagoon
      blob(z, cx, cy, 30, T.GRASS, rng, { amp: 0.1 });
      blob(z, cx, cy, 24, T.DIRT, rng, { amp: 0.08 });
      stamp(z, cx, cy, 11, T.FLAGS);
      // the stilt-wall, four wide gates
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d < 21.4 || d > 22.6) continue;
        if (Math.abs(x + 0.5 - cx) < 4 || Math.abs(y + 0.5 - cy) < 4) continue;
        z.set(x, y, T.PALISADE);
      }
      // boardwalks: a broad cross to the gates, a causeway east out over the lagoon to the Flats
      rect(z, cx - 2, cy - 27, cx + 1, cy + 27, c => (c === T.WATER ? T.SHALLOW : T.ROAD));
      rect(z, cx - 27, cy - 2, cx + 27, cy + 1, c => (c === T.WATER ? T.SHALLOW : T.ROAD));
      rect(z, cx + 20, cy - 2, W - 5, cy + 2, T.ROAD, { margin: 3 });
      rect(z, 4, cy - 2, cx - 20, cy + 2, T.ROAD, { margin: 3 });
      // stilt-huts between the plaza and the wall
      const huts = [[-15, -9], [-9, -15], [9, -15], [15, -9], [-15, 9], [-9, 15], [9, 15], [15, 9]];
      for (const [dx, dy] of huts) { rect(z, cx + dx - 1, cy + dy - 1, cx + dx + 1, cy + dy + 1, T.PALISADE); z.decor.push({ kind: 'stilt_hut', x: cx + dx + 0.5, y: cy + dy + 0.5 }); }
      A34.banks(z, T.WATER, T.SHALLOW, 0.8, rng);
      z.start = { x: cx + 0.5, y: cy + 4.5 };
      z.npcSpots = [
        { x: cx - 5.5, y: cy - 4.5, role: 'vendor' }, { x: cx + 6.5, y: cy - 4.5, role: 'healer' },
        { x: cx - 5.5, y: cy + 5.5, role: 'stash' }, { x: cx + 6.5, y: cy + 5.5, role: 'smith' }
      ];
      z.waypointSpot = { x: cx + 0.5, y: cy + 0.5 };
      z.prevActSpot = { x: 8.5, y: cy + 0.5 };   // the Quest agent's arrival point from Act II (west causeway end)
      z.questSpots = { actGate: z.prevActSpot, waypoint: z.waypointSpot };
      addLantern(z, cx + 0.5, cy - 7.5, 'Kettlewick Hearth');
      addPortal(z, W - 7.5, cy + 0.5, 'a3_flats', 'Out onto the Heartbeat Flats', 'gate');
      z.arrive = z.arrive || {}; z.arrive.a3_flats = { x: W - 10.5, y: cy + 0.5 };
      z.decor.push({ kind: 'tallow_kettle', x: cx - 3.5, y: cy - 2.5 }, { kind: 'tallow_kettle', x: cx + 4.5, y: cy + 3.5 }, { kind: 'stilt_gate', x: cx + 22.5, y: cy + 0.5 }, { kind: 'stilt_gate', x: cx - 21.5, y: cy + 0.5 });
      return z;
    }

    // ------------------------------------------------------------- outdoor zones
    const Z3 = {
      a3_flats: s => genOutdoor({
        id: 'a3_flats', name: 'The Heartbeat Flats', W: 160, H: 150, theme: SH, act: 3, seed: s * 67 + 3, dark: 0.4, lo: 24, hi: 25,
        border: jungleBorder,
        layers: [{ tile: T.MUD, s: 16, frac: 0.45 }, { tile: T.TREE, s: 11, frac: 0.07, speck: 0.35 }, { tile: T.ROCK, s: 3, frac: 0.02, speck: 0.8 }],
        rivers: [{ pts: [[0, 0.27], [0.45, 0.34], [1, 0.2]], w: 5, bank: 2, ford: 24 }, { pts: [[0.3, 1], [0.58, 0.64], [1, 0.78]], w: 4, bank: 2, ford: 20 }],
        clearings: { n: 5, r: [10, 16] },
        sites: { entry: { at: [0.04, 0.55], j: 0.04, r: 6, tile: T.DIRT, edge: 1 }, mid: { at: [0.45, 0.52], r: 8, tile: T.DIRT }, knoll: { at: [0.28, 0.16], r: 6, tile: T.FLAGS }, exit: { at: [0.95, 0.45], j: 0.04, r: 6, tile: T.DIRT, edge: 1 } },
        paths: [['entry', 'mid'], ['mid', 'exit'], ['mid', 'knoll']], pathR: 2.8, pathKeepsMud: true, banks: 0.5,
        lanterns: [['entry', 'Edge of the Flats'], ['mid', 'The Pulsing Flat'], ['knoll', 'Drowned Kettle-Ring']],
        portals: [{ site: 'entry', to: 'a3_town', name: 'Back to Kettlewick Stilts', spr: 'gate' }, { site: 'exit', to: 'a3_mangroves', name: 'Into the Weeping Mangroves', spr: 'gate' }],
        fill: T.WATER, bridge: bridge3, ruins: 2, packs: () => packs3().flats, packPer: 460,
        decor: z => shogDecor(z, mulberry32(s + 11))
      }),
      a3_mangroves: s => genOutdoor({
        id: 'a3_mangroves', name: 'The Weeping Mangroves', W: 150, H: 150, theme: SH, act: 3, seed: s * 71 + 5, dark: 0.5, lo: 25, hi: 26,
        border: jungleBorder,
        layers: [{ tile: T.TREE, s: 12, frac: 0.25 }, { tile: T.TREE, s: 9, frac: 0.12, speck: 0.5 }, { tile: T.MUD, s: 10, frac: 0.25 }, { tile: T.ROCK, s: 3, frac: 0.015, speck: 0.8 }],
        rivers: [{ pts: [[0.22, 0], [0.5, 0.52], [0.78, 1]], w: 4, bank: 2, ford: 20 }],
        clearings: { n: 7, r: [11, 17] },
        sites: { entry: { at: [0.04, 0.5], r: 6, tile: T.DIRT, edge: 1 }, mid: { at: [0.46, 0.44], r: 9, tile: T.GRASS }, weep: { at: [0.25, 0.8], r: 7, tile: T.DIRT }, exitE: { at: [0.95, 0.3], r: 6, tile: T.DIRT, edge: 1 }, exitN: { at: [0.62, 0.05], r: 6, tile: T.DIRT, edge: 1 } },
        paths: [['entry', 'mid'], ['mid', 'exitE'], ['mid', 'exitN'], ['entry', 'weep'], ['weep', 'mid']], pathR: 3.4, banks: 0.5,
        lanterns: [['entry', 'Mangrove Threshold'], ['mid', 'The Weeping Clearing'], ['weep', 'Where the Bark Bleeds']],
        portals: [{ site: 'entry', to: 'a3_flats', name: 'Back to the Heartbeat Flats', spr: 'gate' }, { site: 'exitE', to: 'a3_delta', name: 'On to the Blood Delta', spr: 'gate' }, { site: 'exitN', to: 'a3_fetish', name: 'Into the Fetish-Tree Groves', spr: 'gate' }],
        fill: T.WATER, bridge: bridge3, ruins: 2, packs: () => packs3().mangrove, packPer: 440,
        decor: z => shogDecor(z, mulberry32(s + 13))
      }),
      a3_fetish: s => genOutdoor({
        id: 'a3_fetish', name: 'The Fetish-Tree Groves', W: 140, H: 140, theme: SH, act: 3, seed: s * 73 + 9, dark: 0.5, lo: 26, hi: 27,
        border: jungleBorder,
        layers: [{ tile: T.TREE, s: 11, frac: 0.28 }, { tile: T.MUD, s: 9, frac: 0.18 }, { tile: T.WATER, s: 13, frac: 0.05 }],
        clearings: { n: 6, r: [10, 14] },
        sites: { entry: { at: [0.5, 0.95], r: 6, tile: T.DIRT, edge: 1 }, mid: { at: [0.48, 0.52], r: 8, tile: T.DIRT }, west: { at: [0.2, 0.32], r: 6, tile: T.DIRT }, sump: { at: [0.82, 0.2], r: 6, tile: T.DIRT } },
        paths: [['entry', 'mid'], ['mid', 'west'], ['mid', 'sump'], ['west', 'sump']], pathR: 2.8, banks: 0.7,
        custom: (z, rng, S) => {
          const rings = [[S.mid.x + 0.5, S.mid.y + 0.5, 11], [S.west.x + 0.5, S.west.y + 0.5, 9]];
          for (let i = 0; i < 4; i++) rings.push([18 + rng() * (z.w - 36), 18 + rng() * (z.h - 36), 8 + rng() * 3]);
          for (const [x, y, r] of rings) fetishRing(z, rng, x, y, r);
        },
        lanterns: [['entry', 'Grove Threshold'], ['mid', 'The Masked Ring'], ['west', 'Sac-Mother\'s Hollow']],
        portals: [{ site: 'entry', to: 'a3_mangroves', name: 'Back to the Weeping Mangroves', spr: 'gate' }, { site: 'sump', to: 'a3_sumps', name: 'Down into the Leech-Sumps', spr: 'cave' }],
        fill: T.WATER, bridge: bridge3, ruins: 1, packs: () => packs3().fetish, packPer: 420,
        decor: z => shogDecor(z, mulberry32(s + 17))
      }),
      a3_delta: s => genOutdoor({
        id: 'a3_delta', name: 'The Blood Delta', W: 170, H: 140, theme: SH, act: 3, seed: s * 79 + 1, dark: 0.42, lo: 26, hi: 28,
        border: jungleBorder,
        layers: [{ tile: T.MUD, s: 12, frac: 0.3 }, { tile: T.TREE, s: 10, frac: 0.1, speck: 0.4 }],
        rivers: [
          { pts: [[0, 0.5], [0.3, 0.46], [0.6, 0.25], [1, 0.1]], w: 5, bank: 2, ford: 20 },
          { pts: [[0.3, 0.46], [0.65, 0.5], [1, 0.42]], w: 4, bank: 2, ford: 18 },
          { pts: [[0.45, 0.5], [0.7, 0.72], [1, 0.72]], w: 4, bank: 2, ford: 18 },
          { pts: [[0.55, 0.62], [0.72, 0.9], [0.85, 1]], w: 3, bank: 2, ford: 16 }
        ],
        clearings: { n: 5, r: [9, 14] },
        sites: { entry: { at: [0.03, 0.3], r: 6, tile: T.DIRT, edge: 1 }, mid: { at: [0.42, 0.72], r: 7, tile: T.DIRT }, isle: { at: [0.72, 0.36], r: 7, tile: T.FLAGS }, exit: { at: [0.96, 0.58], r: 6, tile: T.DIRT, edge: 1 } },
        paths: [['entry', 'mid'], ['mid', 'isle'], ['isle', 'exit'], ['mid', 'exit']], pathR: 2.8, banks: 0.55,
        lanterns: [['entry', 'Delta Mouth'], ['mid', 'The Braided Ford'], ['isle', 'Isle of the Kettle-Priests']],
        portals: [{ site: 'entry', to: 'a3_mangroves', name: 'Back to the Weeping Mangroves', spr: 'gate' }, { site: 'exit', to: 'a3_amber', name: 'On to the Amber-Grease Mire', spr: 'gate' }],
        fill: T.WATER, bridge: bridge3, ruins: 2, packs: () => packs3().delta, packPer: 450,
        decor: z => shogDecor(z, mulberry32(s + 19))
      }),
      a3_amber: s => genOutdoor({
        id: 'a3_amber', name: 'The Amber-Grease Mire', W: 140, H: 140, theme: SH, act: 3, seed: s * 83 + 7, dark: 0.45, lo: 27, hi: 28,
        border: jungleBorder,
        layers: [{ tile: T.WATER, s: 9, frac: 0.12 }, { tile: T.MUD, s: 11, frac: 0.35 }, { tile: T.TREE, s: 12, frac: 0.1, speck: 0.3 }, { tile: T.ROCK, s: 3, frac: 0.03, speck: 0.75 }],
        clearings: { n: 5, r: [10, 15] },
        sites: { entry: { at: [0.03, 0.4], r: 6, tile: T.DIRT, edge: 1 }, mid: { at: [0.5, 0.5], r: 8, tile: T.DIRT }, pool: { at: [0.3, 0.82], r: 6, tile: T.FLAGS }, exit: { at: [0.96, 0.62], r: 6, tile: T.DIRT, edge: 1 } },
        paths: [['entry', 'mid'], ['mid', 'exit'], ['mid', 'pool']], pathR: 2.8, banks: 0.75,
        lanterns: [['entry', 'Mire Threshold'], ['mid', 'The Curdled Crossing'], ['pool', 'Grease-Weeper\'s Pool']],
        portals: [{ site: 'entry', to: 'a3_delta', name: 'Back to the Blood Delta', spr: 'gate' }, { site: 'exit', to: 'a3_broodbanks', name: 'On to the Brood-Banks', spr: 'gate' }],
        fill: T.WATER, bridge: bridge3, ruins: 2, packs: () => packs3().amber, packPer: 430,
        decor: z => shogDecor(z, mulberry32(s + 23), (z2, r2) => scatterDecor(z2, r2, 'amber_grease', 16, t => t === T.GRASS || t === T.MUD))
      }),
      a3_broodbanks: s => genOutdoor({
        id: 'a3_broodbanks', name: 'The Brood-Banks', W: 150, H: 130, theme: SH, act: 3, seed: s * 89 + 11, dark: 0.45, lo: 28, hi: 29,
        border: jungleBorder,
        layers: [{ tile: T.MUD, s: 12, frac: 0.3 }, { tile: T.TREE, s: 11, frac: 0.12, speck: 0.4 }],
        rivers: [{ pts: [[0, 0.52], [0.35, 0.48], [0.65, 0.56], [1, 0.5]], w: 7, bank: 3, ford: 22 }],
        clearings: { n: 5, r: [10, 15] },
        sites: { entry: { at: [0.03, 0.26], r: 6, tile: T.DIRT, edge: 1 }, mid: { at: [0.5, 0.74], r: 8, tile: T.DIRT }, north: { at: [0.55, 0.22], r: 7, tile: T.DIRT }, gall: { at: [0.22, 0.85], r: 6, tile: T.DIRT }, exit: { at: [0.95, 0.2], r: 6, tile: T.DIRT, edge: 1 } },
        paths: [['entry', 'north'], ['north', 'mid'], ['mid', 'gall'], ['north', 'exit']], pathR: 2.8, banks: 0.5,
        custom: (z, rng) => {
          // egg-sac banks: low mounds of sacs along both shores
          for (let i = 0; i < 22; i++) {
            const x = 10 + Math.floor(rng() * (z.w - 20)), y = 10 + Math.floor(rng() * (z.h - 20));
            if (z.get(x, y) !== T.SHALLOW && z.get(x, y) !== T.MUD) continue;
            if (z.get(x, y) === T.MUD && rng() < 0.5) z.set(x, y, T.ROCK);
            z.decor.push({ kind: 'egg_sacs', x: x + 0.5, y: y + 0.5, n: 2 + Math.floor(rng() * 5) });
          }
        },
        lanterns: [['entry', 'Bank Threshold'], ['north', 'The Sac-Weir'], ['mid', 'Hatching Shallows']],
        portals: [{ site: 'entry', to: 'a3_amber', name: 'Back to the Amber-Grease Mire', spr: 'gate' }, { site: 'gall', to: 'a3_egggal', name: 'Down into the Egg-Galleries', spr: 'cave' }, { site: 'exit', to: 'a3_causeway', name: 'On to the Causeway of the First Brood', spr: 'gate' }],
        fill: T.WATER, bridge: bridge3, ruins: 1, packs: () => packs3().brood, packPer: 430,
        decor: z => shogDecor(z, mulberry32(s + 29))
      }),
      a3_causeway: s => genOutdoor({
        id: 'a3_causeway', name: 'Causeway of the First Brood', W: 150, H: 150, theme: SH, act: 3, seed: s * 97 + 13, dark: 0.45, lo: 29, hi: 30,
        border: jungleBorder,
        layers: [{ tile: T.WATER, s: 18, frac: 0.36 }, { tile: T.MUD, s: 10, frac: 0.2 }, { tile: T.TREE, s: 10, frac: 0.07, speck: 0.4 }],
        clearings: { n: 3, r: [9, 12] },
        sites: { entry: { at: [0.04, 0.5], j: 0.02, r: 6, tile: T.DIRT, edge: 1 }, stair: { at: [0.34, 0.24], r: 5, tile: T.FLAGS }, well: { at: [0.34, 0.78], r: 5, tile: T.FLAGS }, foot: { at: [0.62, 0.5], j: 0.01, r: 6, tile: T.FLAGS } },
        paths: [['stair', 'foot'], ['well', 'foot']], pathR: 2.8, pathTile: T.FLAGS, banks: 0.7,
        custom: (z, rng, S) => {
          // the causeway: seven paces of old brick straight across the lagoon to the ziggurat's foot
          const y0 = S.entry.y, zx = Math.round(z.w * 0.82), zy = S.foot.y;
          rect(z, S.entry.x, y0 - 3, zx - 14, y0 + 3, T.FLAGS, { margin: 3 });
          if (zy !== y0) rect(z, S.foot.x - 3, Math.min(y0, zy), S.foot.x + 3, Math.max(y0, zy), T.FLAGS, { margin: 3 });
          for (let x = S.entry.x + 8; x < zx - 16; x += 7) { z.set(x, y0 - 4, T.PILLAR); z.set(x, y0 + 4, T.PILLAR); }
          // sunken step-shrines out in the lagoon
          for (const k of ['stair', 'well']) { const c = S[k]; rect(z, c.x - 4, c.y - 4, c.x + 4, c.y + 4, T.FLAGS); for (const [i, j] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) z.set(c.x + i, c.y + j, T.PILLAR); z.decor.push({ kind: 'step_shrine', x: c.x + 0.5, y: c.y + 0.5 }); }
          // the ziggurat of the First Brood: concentric mud-brick steps; the way in is on its west face
          const half = 14;
          for (let y = zy - half; y <= zy + half; y++) for (let x = zx - half; x <= zx + half; x++) {
            const ring = Math.max(Math.abs(x - zx), Math.abs(y - zy));
            z.set(x, y, ring >= half - 1 ? T.FLAGS : T.RUIN);
          }
          rect(z, zx - half - 2, zy - half - 2, zx - half - 1, zy + half + 2, T.FLAGS, { margin: 3 });
          rect(z, zx - half, zy - 2, zx - half + 3, zy + 2, T.FLAGS);
          S.zig = { x: zx - half + 2, y: zy, r: 1, tile: T.FLAGS };
          rect(z, S.foot.x, zy - 3, zx - half + 3, zy + 3, T.FLAGS);
          z.decor.push({ kind: 'ziggurat', x: zx + 0.5, y: zy + 0.5, half }, { kind: 'blood_basin_crown', x: zx + 0.5, y: zy + 0.5 });
        },
        lanterns: [['entry', 'Head of the Causeway'], ['stair', 'The Drowned Stair'], ['foot', 'Foot of the First Brood']],
        portals: [{ site: 'entry', to: 'a3_broodbanks', name: 'Back to the Brood-Banks', spr: 'gate' }, { site: 'zig', to: 'a3_ziggurat', name: 'Into the Ziggurat of the First Brood', spr: 'stairs' }],
        fill: T.WATER, bridge: bridge3, ruins: 0, packs: () => packs3().causeway, packPer: 400,
        decor: z => shogDecor(z, mulberry32(s + 31))
      })
    };

    // ------------------------------------------------------------- dungeons
    const D3 = {
      a3_sumps: s => genHalls({
        id: 'a3_sumps', name: 'The Leech-Sumps', W: 110, H: 110, theme: 'shogmire_deep', act: 3, seed: s * 101 + 3, dark: 0.82, lo: 26, hi: 28,
        rooms: 14, rmin: 12, rmax: 20, gap: 5, cw: 5, blob: true, loops: 0.35,
        up: { to: 'a3_fetish', name: 'Up to the Fetish-Tree Groves' }, lanterns: ['Sump Mouth', 'The Suckling Pool'],
        packs: () => packs3().sumps, chests: 0.45
      }),
      a3_egggal: s => genHalls({
        id: 'a3_egggal', name: 'The Egg-Galleries', W: 110, H: 100, theme: 'shogmire_deep', act: 3, seed: s * 103 + 5, dark: 0.85, lo: 28, hi: 29,
        rooms: 13, rmin: 13, rmax: 21, gap: 5, cw: 6, pillars: true, loops: 0.3,
        up: { to: 'a3_broodbanks', name: 'Up to the Brood-Banks' }, lanterns: ['Gallery Mouth', 'The Warm Racks'],
        packs: () => packs3().egggal, chests: 0.5,
        custom: (z, rng, rooms) => { for (const r of rooms) if (rng() < 0.6) z.decor.push({ kind: 'egg_racks', x: r.x + r.w / 2, y: r.y + 1.5 }); }
      }),
      a3_ziggurat: s => genHalls({
        id: 'a3_ziggurat', name: 'Ziggurat of the First Brood', W: 120, H: 120, theme: 'shogmire_deep', act: 3, seed: s * 107 + 7, dark: 0.85, lo: 29, hi: 30,
        rooms: 15, rmin: 14, rmax: 24, gap: 5, cw: 6, pillars: true, loops: 0.35,
        up: { to: 'a3_causeway', name: 'Out to the Causeway' }, down: [{ to: 'a3_lair', name: 'Up the stair to the Blood-Basin', spr: 'stairs' }],
        lanterns: ['Brick Threshold', 'The Brood-Nave', 'Stair of Warm Bricks'],
        packs: () => packs3().ziggurat, chests: 0.45,
        custom: (z, rng, rooms) => { for (const r of rooms) if (rng() < 0.4) z.decor.push({ kind: 'brood_font', x: r.x + r.w / 2, y: r.y + r.h / 2 }); }
      })
    };

    // ------------------------------------------------------------- a3_lair: the Blood-Basin on the ziggurat's crown
    function genLair3(seed) {
      const rng = mulberry32(seed * 109 + 17), W = 96, H = 96, cx = 48, cy = 44;
      const z = new Zone('a3_lair', 'The Blood-Basin', W, H, 0.45);
      z.theme = SH; z.act = 3; z.seed = seed; z.decor = [];
      z.t.fill(T.CLIFF);
      // the crown: a broad mud-brick platform, its outer steps broken, the drop all round
      blob(z, cx, cy + 4, 38, T.DIRT, rng, { amp: 0.06 });
      rect(z, cx - 30, cy - 28, cx + 30, cy + 32, T.FLAGS, { over: c => c !== T.CLIFF });
      // the arena proper, and the basin of warm blood at its north end
      const ar = { x: cx - 20, y: cy - 22, w: 41, h: 42 };
      rect(z, ar.x, ar.y, ar.x + ar.w - 1, ar.y + ar.h - 1, T.FLAGS);
      stamp(z, cx + 0.5, cy - 12.5, 6.2, T.SHALLOW);
      stamp(z, cx + 0.5, cy - 12.5, 4.4, T.WATER);
      // fetish poles ring the arena, wide gaps between them
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, px = Math.floor(cx + Math.cos(a) * 19), py = Math.floor(cy + Math.sin(a) * 19); if (i % 3 !== 1) { z.set(px, py, T.PILLAR); z.decor.push({ kind: 'fetish_tree', x: px + 0.5, y: py + 0.5 }); } }
      // the stair up the south face
      rect(z, cx - 4, cy + 20, cx + 4, H - 5, T.ROAD, { margin: 3 });
      rect(z, cx - 12, H - 16, cx + 12, H - 5, T.FLAGS, { margin: 3 });
      for (let y = cy + 22; y < H - 16; y += 5) { z.set(cx - 6, y, T.PILLAR); z.set(cx + 6, y, T.PILLAR); }
      const sp = openNear(z, cx + 0.5, H - 8.5);
      z.start = sp;
      z.arrive = {};
      addPortal(z, cx + 0.5, H - 6.5, 'a3_ziggurat', 'Down into the Ziggurat', 'stairs');
      z.arrive.a3_ziggurat = sp;
      addLantern(z, cx + 3.5, H - 10.5, 'Crown of the First Brood');
      z.bossSpot = { x: cx + 0.5, y: cy - 3.5 };
      z.bossArena = ar; z.bossRoom = ar;
      z.decor.push({ kind: 'blood_basin', x: cx + 0.5, y: cy - 12.5, r: 5 });
      // a few of the brood keep the stair
      const P = packs3().lair;
      if (typeof placePack === 'function') {
        const spots = [[cx - 8, H - 22], [cx + 8, H - 28], [cx, cy + 26]];
        spots.forEach(([x, y], i) => { const p = openNear(z, x + 0.5, y + 0.5); placePack(z, p.x, p.y, 30, P, 'a3_lair_' + i, rng); });
      }
      return z;
    }

    // ------------------------------------------------------------- register
    reg('a3_town', 'Kettlewick Stilts', 3, genTown3);
    const NAMES3 = { a3_flats: 'The Heartbeat Flats', a3_mangroves: 'The Weeping Mangroves', a3_fetish: 'The Fetish-Tree Groves', a3_delta: 'The Blood Delta', a3_amber: 'The Amber-Grease Mire', a3_broodbanks: 'The Brood-Banks', a3_causeway: 'Causeway of the First Brood', a3_sumps: 'The Leech-Sumps', a3_egggal: 'The Egg-Galleries', a3_ziggurat: 'Ziggurat of the First Brood' };
    for (const id in Z3) reg(id, NAMES3[id], 3, Z3[id], { dress: true });
    for (const id in D3) reg(id, NAMES3[id], 3, D3[id], { dress: true });
    reg('a3_lair', 'The Blood-Basin', 3, genLair3);

    // =============================================================================== Act III mechanics
    const inShog = () => G && G.zone && G.zone.theme === SH;
    // the heartbeat under the mud: a 1.7 s swell, the beat itself ~0.45 s
    const BEAT = { period: 1.7, win: 0.45, last: -1 };
    const beatPhase = () => ((G.time || 0) % BEAT.period) / BEAT.period;
    const onBeat = () => beatPhase() < BEAT.win / BEAT.period;
    if (typeof terrainSpd === 'function') {
      const _ts = terrainSpd;
      terrainSpd = function (o) {
        const k = _ts(o);
        try { if (k < 1 && inShog() && onBeat() && G.zone.get(Math.floor(o.x), Math.floor(o.y)) === T.MUD) return k * 0.6; } catch (e) { }
        return k;
      };
    }
    // the pulse shows on the mud itself: a dark swell of red across every mud tile on the beat
    const PULSE = (() => { try { const c = mkCanvas(TW, TH + 1), g = c.getContext('2d'); g.fillStyle = '#7a0e10'; g.beginPath(); g.moveTo(TW / 2, 0); g.lineTo(TW, TH / 2); g.lineTo(TW / 2, TH); g.lineTo(0, TH / 2); g.closePath(); g.fill(); return c; } catch (e) { return null; } })();
    if (typeof renderWorld === 'function' && PULSE) {
      const _rw = renderWorld;
      renderWorld = function (list) {
        const r = _rw(list);
        try {
          if (inShog() && typeof visibleRange === 'function') {
            const ph = beatPhase(), k = ph < 0.3 ? Math.sin(ph / 0.3 * Math.PI) : 0;
            if (k > 0.02) {
              const z = G.zone, v = visibleRange(2);
              ctx.globalAlpha = 0.2 * k;
              for (let y = v.y0; y <= v.y1; y++) for (let x = v.x0; x <= v.x1; x++) {
                if (z.t[y * z.w + x] !== T.MUD) continue;
                const a = iso(x, y); if (a.sx < -30 || a.sx > W + 30 || a.sy < -30 || a.sy > H + 12) continue;
                ctx.drawImage(PULSE, Math.round(a.sx) - TW / 2, Math.round(a.sy));
              }
              ctx.globalAlpha = 1;
            }
          }
        } catch (e) { ctx.globalAlpha = 1; report(e); }
        return r;
      };
    }
    // Brood-Swollen Husks burst: leech larvae spill out of the belly when they fall
    if (typeof killMon === 'function') {
      const _km = killMon;
      killMon = function (m) {
        const was = m && m.dead;
        const r = _km.apply(this, arguments);
        try {
          if (m && !was && m.dead && m.b && m.b.brood && G.zone && G.zone.monsters.includes(m) && typeof makeMon === 'function') {
            const n = m.b.brood + (m.rank === 'champion' || m.rank === 'unique' ? 2 : 0);
            for (let i = 0; i < n; i++) {
              const a = i / n * Math.PI * 2 + Math.random() * 0.5, x = m.x + Math.cos(a) * 0.6, y = m.y + Math.sin(a) * 0.6;
              if (G.zone.solidAt(x, y)) continue;
              const l = makeMon('a3_larva', x, y, Math.max(1, (m.mlvlBase || m.mlvl) - 2), 'normal', []);
              l.state = 'chase'; l.pack = (m.pack || 'brood') + '_larvae'; l.cd = 0.4 + Math.random() * 0.4;
              G.zone.monsters.push(l);
            }
            if (typeof burst === 'function') burst(m.x, m.y, '#8a1c18', 18, 2.4);
            if (typeof floatText === 'function') floatText(m.x, m.y, 'the belly splits', '#c86050');
          }
        } catch (e) { report(e); }
        return r;
      };
    }
    if (typeof noLoot === 'function') { const _nl = noLoot; noLoot = function (m) { return !!(m && m.b && m.b.noLoot) || _nl(m); }; }
    // Fetish-priest venom: a blow that lands leaves poison working for three seconds
    const VEN = { t: 0, dps: 0, tick: 0 };
    if (typeof hitTarget === 'function') {
      const _ht = hitTarget;
      hitTarget = function (Tg, dmg, type, fx, fy, src) {
        const hp0 = (Tg === P) ? P.hp : 0;
        const r = _ht.apply(this, arguments);
        try {
          if (Tg === P && src && src.b && src.b.venom && P.hp < hp0 && !P.dead) {
            const add = dmg * src.b.venom / 3;
            if (VEN.t <= 0 && typeof floatText === 'function') floatText(P.x, P.y, 'venom', '#9ac850');
            VEN.dps = Math.min(add * 2.5, (VEN.t > 0 ? VEN.dps : 0) + add); VEN.t = 3;
          }
        } catch (e) { report(e); }
        return r;
      };
    }
    if (typeof update === 'function') {
      const _up = update;
      update = function (dt) {
        const r = _up(dt);
        try {
          if (VEN.t > 0) {
            VEN.t -= dt;
            if (P.dead) VEN.t = 0;
            else {
              const res = (typeof D === 'object' && D && D.res) ? D.res : 0;
              P.hp -= VEN.dps * dt * (1 - Math.min(75, res) / 100);
              VEN.tick -= dt; if (VEN.tick <= 0) { VEN.tick = 0.45; if (typeof burst === 'function') burst(P.x, P.y - 0.2, '#7ab040', 2, 0.8); }
              if (P.hp <= 0) { P.hp = 0; VEN.t = 0; const saved = (typeof silenceSave === 'function' && silenceSave()) || (typeof miasLastBreath === 'function' && miasLastBreath()); if (!saved && typeof die === 'function') die(); }
            }
          }
          // the beat: a low thump under your boots when you stand in the mud
          if (inShog() && !P.dead) {
            const n = Math.floor((G.time || 0) / BEAT.period);
            if (n !== BEAT.last) {
              BEAT.last = n;
              if (G.zone.get(Math.floor(P.x), Math.floor(P.y)) === T.MUD) {
                if (typeof sfx === 'function') sfx(46, 0.26, 'sine', 0.05, -10);
                if (typeof parts !== 'undefined' && parts.push) parts.push({ ring: true, x: P.x, y: P.y, r: 0.2, max: 1.4, t: 0.4, col: '#7a1a16' });
              }
            }
          }
        } catch (e) { report(e); }
        return r;
      };
    }

    // =============================================================================== tests / other agents
    window.__act3 = {
      zones: ['a3_town', 'a3_flats', 'a3_mangroves', 'a3_fetish', 'a3_delta', 'a3_amber', 'a3_broodbanks', 'a3_causeway', 'a3_sumps', 'a3_egggal', 'a3_ziggurat', 'a3_lair'],
      bands: { a3_flats: [24, 25], a3_mangroves: [25, 26], a3_fetish: [26, 27], a3_delta: [26, 28], a3_amber: [27, 28], a3_broodbanks: [28, 29], a3_causeway: [29, 30], a3_sumps: [26, 28], a3_egggal: [28, 29], a3_ziggurat: [29, 30], a3_lair: [30, 30] },
      monsters: ['a3_broodhusk', 'a3_larva', 'a3_fetishpriest', 'a3_mudleaper', 'a3_mangrovestalker', 'a3_amberwitch', 'a3_broodsow'],
      gen: (id, seed) => ZONE_GEN[id](seed),
      audit: z => A34.audit(z),
      onBeat, venom: VEN,
      terrainSpd: o => terrainSpd(o), killMon: m => killMon(m), update: dt => update(dt), hitTarget: (...a) => hitTarget(...a)
    };
  }
}
