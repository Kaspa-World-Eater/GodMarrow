// Act 2: THE BLEACHED BARRENS OF OSSA (mlvl 18-24). Replaces the old Weeping-Steppe scaffold entirely.
// Oss-Vharoth's bone lies here ground to powder under an unblinking sun. The sand is pulverized holy bone; the god's
// rib-arches rise out of white dunes like the hulls of wrecked ships; chalk storms roll across the flats.
//
//   a2_town      Citadel of the Shattered Femur   safe hub inside a titan leg-bone (npcSpots for the Quest agent)
//   a2_dunes     The Bleached Dunes               mlvl 18-19  170x150  open bone-dust, lone rib-arches
//   a2_avenue    Reliquary Avenue                 mlvl 19-20  180x120  processional road of calcified lantern-bearers
//   a2_chapter   The Buried Chapter-House         mlvl 19-21  hall     a crusader order's house under the sand
//   a2_ribvalley The Valley of Standing Ribs      mlvl 20-21  170x160  wrecked rib-hulls between low mesas
//   a2_stormflat The Chalk Flats                  mlvl 21-22  180x170  chalk storms: the lamp shrinks, arrows drift
//   a2_tomb      The Sand-Choked Tomb             mlvl 21-23  hall     sand drifts in the halls; wyrms swim in them
//   a2_banners   The Field of Fallen Standards    mlvl 22-23  170x150  banners of lost holy wars, shield-walls
//   a2_oasis     The Dry Oasis                    mlvl 22-23  160x160  a cracked basin at the femur's knee
//   a2_marrow    The Marrow Cavity                mlvl 23-24  hall     inside the god's great femur
//   a2_lair      The Empty Socket                 mlvl 24     140x140  the hip-socket bowl; z.bossSpot for the act boss
//
// OPENNESS first: outdoor zones are 150-180 tiles a side, ~90% open ground, landmarks sparse and monumental;
// dungeon halls are big chambers joined by 5-6 tile corridors. Nothing here uses T.TREE as a barrier (zz_pace_and_density
// halves trees on entry), so every boundary is cliff or rock.
// Links inside the act only. Inter-act links (Act 1 -> a2_town, a2_lair -> Act 3) belong to the Quest agent;
// a2_town leaves z.questSpots.actGate by its west gate for that.
// Wraps ZONE_GEN, ZONE_NAMES, isOutdoor, ambient37, ztClassOf, ztDeep, ztWallTheme, genProps, updateDay,
// heroLightR, monVisibility, drawAtmos. No base file is touched.
{
  if (typeof ZONE_GEN === 'object' && typeof T !== 'undefined' && typeof Zone === 'function') {
    const rep = e => { if (typeof reportError === 'function') reportError(e); };

    // =================================================================== themes
    // outdoor: 'ossa' (bone-sand desert) and 'ossa_town' (the citadel). Deep: each borrows a base look until painted.
    const OSSA_OUT = { ossa: 1, ossa_town: 1 };
    const OSSA_DEEP = { ossa_chapter: 'crypt', ossa_tomb: 'barrow', ossa_marrow: 'bone' };
    const isOssa = z => !!(z && (OSSA_OUT[z.theme] || OSSA_DEEP[z.theme]));

    if (typeof isOutdoor === 'function') {
      const _io = isOutdoor;
      isOutdoor = function (z) { return _io(z) || !!(z && OSSA_OUT[z.theme]); };
    }
    // a hard white sun by day, a cold violet night; underground, warm dust
    const OSSA_DAY = [236, 226, 204], OSSA_NIGHT = [60, 62, 96];
    const OSSA_AMB_DEEP = { ossa_chapter: [70, 68, 84], ossa_tomb: [86, 76, 62], ossa_marrow: [82, 76, 70] };
    if (typeof ambient37 === 'function') {
      const _a37 = ambient37;
      ambient37 = function (z) {
        if (!isOssa(z)) return _a37(z);
        if (OSSA_DEEP[z.theme]) return OSSA_AMB_DEEP[z.theme];
        const k = dayK(), p = dayPhase(), e = k * k * (3 - 2 * k);
        let c = OSSA_DAY.map((v, i) => OSSA_NIGHT[i] + (v - OSSA_NIGHT[i]) * e);
        const dusk = p > 0.5 && p < 0.72 ? Math.sin((p - 0.5) / 0.22 * Math.PI) : 0, dawn = p > 0.9 ? Math.sin((p - 0.9) / 0.1 * Math.PI) : 0;
        if (dusk > 0) c = c.map((v, i) => v + ([170, 96, 70][i] - v) * 0.55 * dusk);
        if (dawn > 0) c = c.map((v, i) => v + ([196, 170, 150][i] - v) * 0.4 * dawn);
        return c.map(v => Math.round(v));
      };
    }
    // ground classes: until the bone-sand tiles are painted, sand reads as the pale ash-drift ground of the moor and
    // hardpan as bare earth. Change these two lines to swap the fallback.
    const A2CFG = { sand: 'MOOR', hard: 'DIRT' };
    const SAND_CLASS = () => ZT_G[A2CFG.sand], HARD_CLASS = () => ZT_G[A2CFG.hard];
    if (typeof ztClassOf === 'function' && typeof ZT_G === 'object') {
      const _zc = ztClassOf;
      ztClassOf = function (z, x, y) {
        if (!z || !OSSA_OUT[z.theme]) return _zc(z, x, y);
        if (x < 0 || y < 0 || x >= z.w || y >= z.h) return ZT_G.VOID;
        switch (z.t[y * z.w + x]) {
          case 0: case 2: case 3: return SAND_CLASS();                     // sand, dead palm, calcified boulder
          case 11: case 10: return HARD_CLASS();                           // hardpan, stockade
          case 1: return ZT_G.ROAD;
          case 4: return ZT_G.WATER;
          case 12: return ZT_G.SHALLOW;
          case 13: return ZT_G.MUD;
          case 14: case 15: case 6: case 8: case 9: return z.inBoss && z.inBoss(x, y) ? ZT_G.ARENA : ZT_G.FLAGS;
          default: return ZT_G.VOID;
        }
      };
    }
    if (typeof ztDeep === 'function' && typeof ZT_G === 'object') {
      const _zd = ztDeep, M = { crypt: 'CRYPT', barrow: 'BARROW', bone: 'BONE' };
      ztDeep = function (z, x, y) {
        if (!z || !OSSA_DEEP[z.theme]) return _zd(z, x, y);
        if (z.inBoss && z.inBoss(x, y)) return ZT_G.ARENA;
        return ZT_G[M[OSSA_DEEP[z.theme]]];
      };
    }
    if (typeof ztWallTheme === 'function') {
      const _wt = ztWallTheme;
      ztWallTheme = function (z) {
        if (!z) return _wt(z);
        if (z.theme === 'ossa') return 'moor';        // cliffs and mesa rims
        if (z.theme === 'ossa_town') return 'bone';   // the femur's inner wall
        if (OSSA_DEEP[z.theme]) return OSSA_DEEP[z.theme];
        return _wt(z);
      };
    }

    // =================================================================== the Ossan bestiary
    // Mechanics only; every sprite is a painted key reused with a tint until the real art is drawn.
    if (typeof MON === 'object') {
      Object.assign(MON, {
        // rusted plate fused to brittle bone; the shield takes what comes from the front
        calc_knight:  { name: 'Calcified Knight',  spr: 'warden', tint: '#d8cdb0', hp: 58, dmg: [8, 14],  spd: 1.5, r: .36, xp: 44, ai: 'shield',  range: 1.05, wind: .65, rec: .85, armor: 45, poiseK: 1.0 },
        // a knight of the same chapter who swore the second oath: parries, ripostes
        oath_blade:   { name: 'Oath-Fused Blade',  spr: 'warden', tint: '#a8926a', hp: 46, dmg: [9, 15],  spd: 2.1, r: .33, xp: 40, ai: 'duelist', range: 1.05, wind: .42, rec: .55, armor: 30, poiseK: .75 },
        // a great gnawing thing that drags a heraldic shield; it tolls it against the ground, then charges
        marrow_ghoul: { name: 'Marrow-Ghoul',      spr: 'hand',   tint: '#cdbb94', hp: 84, dmg: [10, 17], spd: 1.8, r: .46, xp: 58, ai: 'charger', range: 1.25, wind: .7, rec: 1.0, armor: 20, poiseK: 1.1 },
        // swims the bone-sand; cannot cross the avenue's paving or a chapter-house floor
        chalk_worm:   { name: 'Chalk-Wyrm',        spr: 'worm',   tint: '#e4dac4', hp: 34, dmg: [6, 11],  spd: 3.1, r: .34, xp: 30, ai: 'burrow',  range: 1.4, wind: .35, poiseK: .55 },
        // drifts through stone; in a chalk storm it is nearly unseen
        chalk_wraith: { name: 'Chalk Wraith',      spr: 'gasp',   tint: '#f2ecdc', hp: 26, dmg: [7, 12],  spd: 1.6, r: .28, xp: 32, ai: 'ghost',   wind: .85, poiseK: .3 },
        // keeps its distance and spits ground bone
        dune_kite:    { name: 'Grit-Wick',         spr: 'moth',   tint: '#d6c49c', hp: 20, dmg: [5, 9],   spd: 2.0, r: .28, xp: 26, ai: 'kiter',   wind: .6, poiseK: .35 }
      });
    }
    // pack tables: [type, min, max, type, min, max]
    const PK = {
      dunes:   [['chalk_worm', 2, 3], ['dune_kite', 2, 3, 'chalk_worm', 1, 1], ['marrow_ghoul', 1, 1, 'dune_kite', 1, 2], ['ossarcher', 2, 3, 'calc_knight', 1, 1], ['calc_knight', 1, 2, 'chalk_worm', 1, 2]],
      avenue:  [['calc_knight', 2, 3], ['calc_knight', 1, 2, 'ossarcher', 2, 2], ['oath_blade', 1, 2, 'calc_knight', 1, 1], ['chalk_wraith', 2, 3], ['dune_kite', 2, 3, 'oath_blade', 1, 1], ['chalk_worm', 2, 3]],
      ribs:    [['marrow_ghoul', 1, 2, 'chalk_worm', 1, 2], ['chalk_worm', 3, 4], ['calc_knight', 2, 2, 'dune_kite', 1, 2], ['oath_blade', 2, 2], ['dune_kite', 3, 4], ['marrow_ghoul', 1, 1, 'ossarcher', 2, 2]],
      storm:   [['chalk_wraith', 2, 4], ['chalk_wraith', 2, 2, 'dune_kite', 1, 2], ['chalk_worm', 2, 3], ['marrow_ghoul', 1, 2], ['dune_kite', 2, 3, 'chalk_wraith', 1, 1]],
      banners: [['calc_knight', 2, 3, 'oath_blade', 1, 1], ['oath_blade', 2, 3], ['marrow_ghoul', 1, 2, 'calc_knight', 1, 1], ['ossarcher', 3, 3, 'calc_knight', 1, 1], ['chalk_wraith', 2, 2, 'calc_knight', 1, 1]],
      oasis:   [['chalk_worm', 3, 4], ['marrow_ghoul', 1, 2, 'dune_kite', 1, 2], ['dune_kite', 3, 3], ['chalk_wraith', 2, 3], ['oath_blade', 1, 2, 'chalk_worm', 1, 2]],
      chapter: [['calc_knight', 2, 3], ['oath_blade', 2, 2, 'ossarcher', 1, 2], ['chalk_wraith', 2, 3, 'calc_knight', 1, 1], ['calc_knight', 1, 1, 'oath_blade', 1, 1, 'ossarcher', 1, 2], ['marrow', 2, 2]],
      tomb:    [['chalk_wraith', 2, 3], ['marrow_ghoul', 1, 2], ['chalk_worm', 2, 3], ['oath_blade', 1, 2, 'chalk_wraith', 1, 1], ['calc_knight', 2, 2]],
      marrow:  [['marrow_ghoul', 2, 2], ['marrow_ghoul', 1, 1, 'marrow', 1, 2], ['oath_blade', 2, 3], ['calc_knight', 2, 2, 'chalk_wraith', 1, 1], ['chalk_wraith', 3, 3]],
      lair:    [['calc_knight', 2, 3, 'oath_blade', 1, 1], ['oath_blade', 2, 2, 'marrow_ghoul', 1, 1]]
    };

    // =================================================================== shared helpers
    const inb = (z, x, y, m) => x >= m && y >= m && x < z.w - m && y < z.h - m;
    function paint(z, x, y, t, keep) { if (!inb(z, x, y, 3)) return; if (keep && keep.has(y * z.w + x)) return; z.set(x, y, t); }
    function disc(z, cx, cy, r, t, keep, only) {
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r * r) continue;
        if (only && !only(z.get(x, y))) continue;
        paint(z, x, y, t, keep);
      }
    }
    const mark = (z, m) => (z.a2marks || (z.a2marks = [])).push(m);
    // a wide, gently wandering track of hardpan between two points (width w)
    function carveTrack(z, ax, ay, bx, by, rng, w, tile, keep) {
      let x = ax, y = ay, guard = 0, ang = Math.atan2(by - ay, bx - ax);
      const half = (w - 1) / 2;
      while (Math.hypot(bx - x, by - y) > 1.5 && guard++ < 4000) {
        const want = Math.atan2(by - y, bx - x);
        let d = want - ang; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        ang += d * 0.18 + (rng() - 0.5) * 0.35;
        x += Math.cos(ang) * 0.8; y += Math.sin(ang) * 0.8;
        x = clamp(x, 4, z.w - 5); y = clamp(y, 4, z.h - 5);
        for (let j = -Math.ceil(half); j <= Math.ceil(half); j++) for (let i = -Math.ceil(half); i <= Math.ceil(half); i++) {
          if (i * i + j * j > (half + 0.5) * (half + 0.5)) continue;
          const tx = Math.round(x + i), ty = Math.round(y + j), t = z.get(tx, ty);
          if (tile === T.DIRT && (t === T.ROAD || t === T.FLAGS)) continue;
          paint(z, tx, ty, tile, keep);
        }
      }
    }
    // every open tile reachable from the start: pockets are joined to the main ground by a carved lane, or filled
    function connectAll(z, sx, sy) {
      const W = z.w, H = z.h, N = W * H;
      for (let pass = 0; pass < 60; pass++) {
        const seen = floodFrom(z, sx, sy);
        let s = -1; for (let i = 0; i < N; i++) if (!seen[i] && SOLID[z.t[i]] === 0) { s = i; break; }
        if (s < 0) return true;
        // the pocket
        const comp = [], cq = [s], inC = new Uint8Array(N); inC[s] = 1;
        while (cq.length) { const i = cq.pop(); comp.push(i); const x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue; const j = ny * W + nx; if (!inC[j] && SOLID[z.t[j]] === 0) { inC[j] = 1; cq.push(j); } } }
        if (comp.length < 24) { for (const i of comp) z.t[i] = T.ROCK; continue; }
        // a lane through whatever stands between it and the reached ground
        const prev = new Int32Array(N).fill(-2), q = new Int32Array(N); let h = 0, tl = 0;
        for (const i of comp) { prev[i] = -1; q[tl++] = i; }
        let hit = -1;
        while (h < tl && hit < 0) { const i = q[h++], x = i % W, y = (i / W) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!inb(z, nx, ny, 3)) continue; const j = ny * W + nx; if (prev[j] !== -2) continue; prev[j] = i; if (seen[j]) { hit = j; break; } q[tl++] = j; } }
        if (hit < 0) { for (const i of comp) z.t[i] = T.ROCK; continue; }
        const floorT = OSSA_DEEP[z.theme] ? T.FLOOR : T.DIRT;
        for (let i = hit; i >= 0; i = prev[i]) { const x = i % W, y = (i / W) | 0; for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) if (inb(z, x + k, y + j, 3) && SOLID[z.get(x + k, y + j)]) z.set(x + k, y + j, floorT); }
      }
      return false;
    }
    // packs, chests and shrines on open ground, well apart, levelled by walking distance from the start
    function fillZone(z, table, lo, hi, o) {
      const rng = o.rng, W = z.w, H = z.h;
      const d0 = bfsDist(z, Math.floor(z.start.x), Math.floor(z.start.y));
      let dmax = 1; for (let i = 0; i < d0.length; i++) if (d0[i] > dmax) dmax = d0[i];
      const ok = o.tiles || [T.GRASS, T.DIRT, T.ROAD, T.FLAGS, T.FLOOR];
      const anchors = z.objects.filter(o2 => o2.type === 'portal' || o2.type === 'lantern' || o2.type === 'vendor');
      const spots = [];
      for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
        const i = y * W + x;
        if (d0[i] <= (o.minDist || 22) || !ok.includes(z.t[i])) continue;
        if (o.avoid && o.avoid(x, y)) continue;
        if (anchors.some(a => Math.hypot(a.x - x, a.y - y) < (o.portalClear || 10))) continue;
        spots.push([x, y, d0[i]]);
      }
      for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
      const used = [], far = (x, y, r) => used.every(([ux, uy]) => Math.hypot(ux - x, uy - y) > r);
      const lvl = d => clamp(lo + Math.floor((hi - lo + 1) * d / (dmax + 1)), lo, hi);
      let np = 0, nc = 0, ns = 0;
      for (const [x, y, d] of spots) {
        if (np < o.packs && far(x, y, o.spacing || 10)) { placePack(z, x + 0.5, y + 0.5, lvl(d), table, (o.prefix || z.id) + np, rng); used.push([x, y]); np++; continue; }
        if (nc < (o.chests || 0) && far(x, y, 6)) { z.objects.push({ type: 'chest', x: x + 0.5, y: y + 0.5, open: false, ilvl: lvl(d) + 1 }); used.push([x, y]); nc++; continue; }
        if (ns < (o.shrines || 0) && far(x, y, 8)) { z.objects.push({ type: 'shrine', x: x + 0.5, y: y + 0.5, used: false, kind: pick(['echo', 'wisp', 'stone', 'refill']) }); used.push([x, y]); ns++; }
      }
      return np;
    }
    function addLantern(z, x, y, name) { z.lanterns.push({ x, y, name }); z.objects.push({ type: 'lantern', x, y, idx: z.lanterns.length - 1, name }); }
    function addPortal(z, x, y, p) {
      z.objects.push({ type: 'portal', x, y, to: p.to, name: p.name, spr: p.spr || 'gate' });
      z.arrive = z.arrive || {}; z.arrive[p.to] = p.arrive || { x, y: y + 1.5 };
    }

    // =================================================================== landmarks
    // a rib-hull: a wrecked ship of the god's ribs. Only the tips of the ribs stand out of the sand, in two curving rows
    // either side of a broken spine of low vertebrae, so the hull is open to walk through.
    function ribHull(z, cx, cy, len, half, horiz, rng, keep) {
      const L = Math.floor(len / 2);
      for (let k = -L; k <= L; k++) {
        const ax = horiz ? cx + k : cx, ay = horiz ? cy : cy + k;
        if ((k & 1) === 0 && rng() < 0.55) paint(z, ax, ay, T.ROCK, keep);
        if ((k + L) % 3 !== 0) continue;
        const taper = Math.sqrt(Math.max(0, 1 - (k / (L + 1.5)) ** 2)), h = Math.max(2, Math.round(half * taper));
        for (const s of [-1, 1]) {
          if (rng() < 0.16) continue;                                  // a rib snapped off below the sand
          const px = horiz ? ax : ax + s * h, py = horiz ? ay + s * h : ay;
          paint(z, px, py, T.PILLAR, keep);
          if (Math.abs(k) < L * 0.5 && rng() < 0.5) paint(z, horiz ? px + 1 : px, horiz ? py : py + 1, T.PILLAR, keep);   // the thick middle ribs
        }
      }
      mark(z, { kind: 'rib_hull', x: cx, y: cy, len, half, horiz });
    }
    // a lone rib-arch: two great footings where one rib goes into the sand and comes out again; walk under it
    function ribArch(z, cx, cy, span, horiz, rng, keep) {
      const hs = Math.floor(span / 2) + 1;
      for (const s of [-1, 1]) {
        const fx = horiz ? cx + s * hs : cx, fy = horiz ? cy : cy + s * hs;
        for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) paint(z, fx + i - (s < 0 ? 1 : 0), fy + j - (s < 0 ? 1 : 0), i + j === 0 || rng() < 0.7 ? T.PILLAR : T.ROCK, keep);
        const sx = horiz ? fx - s * 2 : fx + (rng() < 0.5 ? 1 : -1), sy = horiz ? fy + (rng() < 0.5 ? 1 : -1) : fy - s * 2;
        if (rng() < 0.6) paint(z, sx, sy, T.ROCK, keep);            // a shard fallen from the curve
      }
      mark(z, { kind: 'rib_arch', x: cx, y: cy, span, horiz });
    }
    // bone-rubble: a low scatter of calcified boulders
    function rubble(z, cx, cy, r, rng, n) { for (let k = 0; k < n; k++) { const a = rng() * 6.283, d = rng() * r; paint(z, Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d), T.ROCK); } }
    // a sunken stair: flagstone apron, broken posts, the way down in the middle
    function sunkenStair(z, cx, cy, rng, keep) {
      disc(z, cx, cy, 4.2, T.FLAGS, keep);
      for (const [i, j] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) if (rng() < 0.8) paint(z, cx + i, cy + j, rng() < 0.7 ? T.PILLAR : T.ROCK, keep);
      for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (keep && Math.abs(i) <= 2 && Math.abs(j) <= 2) keep.add((cy + j) * z.w + cx + i);
    }

    // =================================================================== the desert generator
    // o: {id, name, seed, W, H, dark, lo, hi, packs, table, entry:{side,...portal}, exit:{side,...portal},
    //     rock, mesa, sites:[...], build(z, ctx), packsN, chests, shrines, spacing}
    function sidePoint(side, W, H, R) {
      if (side === 'w') return { x: 7, y: R(Math.floor(H * 0.3), Math.floor(H * 0.7)) };
      if (side === 'e') return { x: W - 8, y: R(Math.floor(H * 0.3), Math.floor(H * 0.7)) };
      if (side === 'n') return { x: R(Math.floor(W * 0.3), Math.floor(W * 0.7)), y: 7 };
      return { x: R(Math.floor(W * 0.3), Math.floor(W * 0.7)), y: H - 8 };
    }
    const inward = { w: [2, 0], e: [-2, 0], n: [0, 2], s: [0, -2] };
    function genDesert(o) {
      const rng = mulberry32(o.seed), R = (a, b) => a + Math.floor(rng() * (b - a + 1));
      const W = o.W, H = o.H;
      const z = new Zone(o.id, o.name, W, H, o.dark || 0.3); z.theme = 'ossa'; z.seed = o.seed; z.act = 2;
      const n1 = makeNoise(rng), n2 = makeNoise(rng), n3 = makeNoise(rng), n4 = makeNoise(rng);
      const rockK = o.rock == null ? 1 : o.rock, mesa = o.mesa == null ? 7 : o.mesa;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
        const m = fbm(n2, x / 14, y / 14), dune = fbm(n1, x / 22, y / 11), r = n3(x / 2.2, y / 2.2), b = fbm(n4, x / 9, y / 9);
        let t = T.GRASS;
        if (edge < 3 || (edge < mesa && m > 0.46 + edge * 0.012)) t = T.CLIFF;          // a ragged mesa rim, never deep
        else if (b > 0.66 - 0.04 * (rockK - 1) && r > 0.62) t = T.ROCK;                  // calcified boulders, sparse
        else if (dune > 0.6) t = T.DIRT;                                                   // hardpan between the drifts
        z.set(x, y, t);
      }
      const keep = new Set();
      const entry = sidePoint(o.entry.side, W, H, R), exit = sidePoint(o.exit.side, W, H, R);
      const hub = o.hub || { x: R(Math.floor(W * 0.4), Math.floor(W * 0.6)), y: R(Math.floor(H * 0.4), Math.floor(H * 0.6)) };
      const sites = [];
      const ctx = { rng, R, keep, entry, exit, hub, sites, W, H };
      // the zone's own set pieces first, so sites, tracks and clearings respect them
      if (o.build) o.build(z, ctx);
      // named sites, spread out: far from each other, from the gates and from the zone's set pieces
      const nearKeep = (p, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (keep.has((p.y + j) * W + p.x + i)) return true; return false; };
      for (const s of (o.sites || [])) {
        let best = null, bs = -1;
        for (let k = 0; k < 120; k++) {
          const p = { x: R(18, W - 19), y: R(18, H - 19) };
          if (nearKeep(p, 12)) continue;
          const dmin = Math.min(Math.hypot(p.x - entry.x, p.y - entry.y), Math.hypot(p.x - exit.x, p.y - exit.y), Math.hypot(p.x - hub.x, p.y - hub.y) + 6, ...sites.map(q => Math.hypot(p.x - q.x, p.y - q.y)));
          if (dmin > bs) { bs = dmin; best = p; }
        }
        if (!best) best = { x: R(18, W - 19), y: R(18, H - 19) };
        sites.push(Object.assign(best, { spec: s }));
      }
      for (const s of sites) if (s.spec.build) s.spec.build(z, s, ctx);
      // wide tracks: entry -> hub -> exit, hub -> each site
      const tw = o.trackW || 3;
      carveTrack(z, entry.x + inward[o.entry.side][0], entry.y + inward[o.entry.side][1], hub.x, hub.y, rng, tw, T.DIRT, keep);
      carveTrack(z, hub.x, hub.y, exit.x + inward[o.exit.side][0], exit.y + inward[o.exit.side][1], rng, tw, T.DIRT, keep);
      for (const s of sites) carveTrack(z, hub.x, hub.y, s.x, s.y + 5, rng, tw, T.DIRT, keep);
      // clearings where you arrive and where the tracks meet
      for (const p of [entry, exit]) disc(z, p.x, p.y, 4.5, T.GRASS, keep);
      disc(z, hub.x, hub.y, 4.5, T.DIRT, keep);
      connectAll(z, entry.x, entry.y);
      const ie = inward[o.entry.side], ix = inward[o.exit.side];
      z.start = { x: entry.x + ie[0] + 0.5, y: entry.y + ie[1] + 0.5 };
      addPortal(z, entry.x + 0.5, entry.y + 0.5, Object.assign({ arrive: z.start }, o.entry));
      addPortal(z, exit.x + 0.5, exit.y + 0.5, Object.assign({ arrive: { x: exit.x + ix[0] + 0.5, y: exit.y + ix[1] + 0.5 } }, o.exit));
      addLantern(z, entry.x + ie[0] + (ie[1] ? 2 : 0) + 0.5, entry.y + ie[1] + (ie[0] ? -2 : 0) + 0.5, o.threshold);
      addLantern(z, hub.x + 0.5, hub.y + 0.5, o.crossing);
      for (const s of sites) if (s.spec.lantern) addLantern(z, s.x + 0.5, s.y + 3.5, s.spec.lantern);
      for (const s of sites) if (s.spec.portal) { const p = s.spec.portal; addPortal(z, s.x + 0.5, s.y + 0.5, Object.assign({ arrive: { x: s.x + 0.5, y: s.y + 2.5 } }, p)); }
      if (o.after) o.after(z, ctx);
      fillZone(z, o.table, o.lo, o.hi, { rng, packs: o.packsN || 38, chests: o.chests || 7, shrines: o.shrines || 4, spacing: o.spacing || 10, minDist: 22, prefix: o.id.slice(3) });
      if (o.late) o.late(z, ctx);
      return z;
    }

    // =================================================================== the dungeon generator: great halls
    // Big chambers (14-24 tiles) joined by corridors 5-6 wide; the long rooms keep two rows of columns and a wide nave.
    function genHalls(o) {
      const rng = mulberry32(o.seed), R = (a, b) => a + Math.floor(rng() * (b - a + 1));
      const S = o.size, z = new Zone(o.id, o.name, S, S, o.dark || 0.82); z.theme = o.theme; z.seed = o.seed; z.act = 2;
      z.t.fill(T.WALL);
      const rooms = [];
      if (o.hall) { const w = o.hall[0], h = o.hall[1]; rooms.push({ x: Math.floor(S / 2 - w / 2), y: Math.floor(S / 2 - h / 2), w, h, round: false, great: true }); }
      for (let i = 0; i < 900 && rooms.length < o.rooms; i++) {
        const w = R(o.rmin || 14, o.rmax || 22), h = R(o.rmin || 14, o.rmax || 22), x = R(3, S - w - 4), y = R(3, S - h - 4);
        if (rooms.some(r => x < r.x + r.w + 6 && x + w + 6 > r.x && y < r.y + r.h + 6 && y + h + 6 > r.y)) continue;
        rooms.push({ x, y, w, h, round: rng() < (o.roundK || 0) });
      }
      rooms.forEach(r => { r.cx = r.x + r.w / 2; r.cy = r.y + r.h / 2; });
      const carve = (x0, y0, x1, y1) => { for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (inb(z, x, y, 2)) z.set(x, y, T.FLOOR); };
      for (const r of rooms) {
        if (!r.round) { carve(r.x, r.y, r.x + r.w - 1, r.y + r.h - 1); continue; }
        for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) { const dx = (x + 0.5 - r.cx) / (r.w / 2), dy = (y + 0.5 - r.cy) / (r.h / 2); if (dx * dx + dy * dy <= 1) z.set(x, y, T.FLOOR); }
      }
      const cw = o.corridor || 5;
      const corridor = (a, b) => {
        const ax = Math.floor(a.cx), ay = Math.floor(a.cy), bx = Math.floor(b.cx), by = Math.floor(b.cy), h = Math.floor(cw / 2);
        if (rng() < 0.5) { carve(ax, ay - h, bx, ay - h + cw - 1); carve(bx - h, ay, bx - h + cw - 1, by); }
        else { carve(ax - h, ay, ax - h + cw - 1, by); carve(ax, by - h, bx, by - h + cw - 1); }
      };
      rooms.sort((a, b) => (a.cx + a.cy) - (b.cx + b.cy));
      for (let i = 1; i < rooms.length; i++) {
        let best = 0, bd = 1e9;
        for (let j = 0; j < i; j++) { const d = Math.hypot(rooms[i].cx - rooms[j].cx, rooms[i].cy - rooms[j].cy); if (d < bd) { bd = d; best = j; } }
        corridor(rooms[i], rooms[best]);
      }
      for (let k = 0; k < (o.loops || 3); k++) corridor(rooms[R(0, rooms.length - 1)], rooms[R(0, rooms.length - 1)]);
      // columns: two rows down the long axis of the big rooms, a wide nave between
      for (const r of rooms) {
        if (r.round || Math.min(r.w, r.h) < 15) continue;
        const along = r.w >= r.h;
        const L = along ? r.w : r.h, Wd = along ? r.h : r.w;
        for (let k = 3; k < L - 3; k += 4) for (const off of [3, Wd - 4]) {
          const x = along ? r.x + k : r.x + off, y = along ? r.y + off : r.y + k;
          z.set(x, y, T.PILLAR);
        }
      }
      if (o.decorate) o.decorate(z, rooms, rng);
      const start = rooms[0];
      const d0 = bfsDist(z, Math.floor(start.cx), Math.floor(start.cy));
      const rd = r => { let best = -1; for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) best = Math.max(best, d0[(Math.floor(r.cy) + j) * S + Math.floor(r.cx) + i]); return best; };
      const byFar = rooms.filter(r => r !== start).sort((a, b) => rd(b) - rd(a));
      z.start = { x: start.cx + 0.5, y: start.cy + 1.5 };
      addPortal(z, start.cx - 1.5, start.cy - 1.5, Object.assign({ spr: 'stairs', arrive: z.start }, o.up));
      addLantern(z, start.cx + 2.5, start.cy - 1.5, o.lantern);
      const down = o.down ? byFar[0] : null;
      if (down) addPortal(z, down.cx, down.cy - 1, Object.assign({ spr: 'stairs', arrive: { x: down.cx, y: down.cy + 1.5 } }, o.down));
      // a second lantern halfway in
      const mid = byFar[Math.floor(byFar.length / 2)];
      if (mid && o.midLantern) addLantern(z, mid.cx + 0.5, mid.cy + 0.5, o.midLantern);
      const far = Math.max(1, rd(byFar[0]));
      let packId = 0;
      for (const r of rooms) {
        if (r === start) continue;
        const mlvl = clamp(o.lo + Math.round((o.hi - o.lo) * rd(r) / far), o.lo, o.hi);
        const area = r.w * r.h, n = area > 380 ? 3 : area > 220 ? 2 : 1;
        for (let k = 0; k < n; k++) placePack(z, r.x + 3 + rng() * (r.w - 6), r.y + 3 + rng() * (r.h - 6), mlvl, o.table, o.id.slice(3) + (packId++), rng);
        if (rng() < (o.chests || 0.45)) { const c = roomSpot(z, r, r.x + 1, r.y + 1); if (c) z.objects.push({ type: 'chest', x: c.x, y: c.y, open: false, ilvl: mlvl + 1 }); }
      }
      // a dead-end hall keeps its reward at the far end, guarded
      if (!o.down) { const f = byFar[0]; for (const dx of [1.5, -1.5]) { const c = roomSpot(z, f, f.cx + dx, f.cy); if (c) z.objects.push({ type: 'chest', x: c.x, y: c.y, open: false, ilvl: o.hi + 1 }); } placePack(z, f.cx, f.cy + 2, o.hi, o.table, 'lord', rng); z.a2reward = { x: f.cx, y: f.cy }; }
      // corridors in the corridor bays of corridors: a wall of wall between two rooms can leave a pocket
      connectAll(z, Math.floor(z.start.x), Math.floor(z.start.y));
      for (const m of z.monsters) if (z.solidAt(m.x, m.y)) { const p = openSpot(z, m.x, m.y); if (p) { m.x = m.hx = p.x; m.y = m.hy = p.y; } }
      z.a2rooms = rooms.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h, round: r.round }));
      return z;
    }

    // the open floor tile inside a room nearest to (px, py), with a clear ring around it
    function roomSpot(z, r, px, py) {
      let best = null, bd = 1e9;
      for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) {
        if (z.get(x, y) !== T.FLOOR && z.get(x, y) !== T.DIRT) continue;
        let ok = true; for (let j = -1; j <= 1 && ok; j++) for (let i = -1; i <= 1; i++) if (SOLID[z.get(x + i, y + j)]) { ok = false; break; }
        if (!ok || z.objects.some(o => Math.hypot(o.x - x - 0.5, o.y - y - 0.5) < 2)) continue;
        const d = Math.hypot(x + 0.5 - px, y + 0.5 - py); if (d < bd) { bd = d; best = { x: x + 0.5, y: y + 0.5 }; }
      }
      return best;
    }

    // =================================================================== the zones
    // --- a2_town: the Citadel of the Shattered Femur ------------------------------------------------------------
    // A titan's leg-bone lies across the dunes, hollow; the order built inside its shaft. From above: a long oval of
    // bone wall with a knuckle at each end, gates east and west, an open courtyard of flagstones down the middle.
    function genTown(seed) {
      const rng = mulberry32(seed), W = 124, H = 96;
      const z = new Zone('a2_town', 'Citadel of the Shattered Femur', W, H, 0.25); z.theme = 'ossa_town'; z.seed = seed; z.act = 2; z.town = true;
      const n1 = makeNoise(rng);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const e = Math.min(x, y, W - 1 - x, H - 1 - y); z.set(x, y, e < 3 ? T.CLIFF : fbm(n1, x / 20, y / 10) > 0.56 ? T.DIRT : T.GRASS); }
      const cx = W / 2, cy = H / 2, rx = 40, ry = 17;
      // the femur: a shaft and two knuckles
      const inside = (x, y) => {
        const dx = (x - cx) / rx, dy = (y - cy) / ry; if (dx * dx + dy * dy <= 1) return true;
        for (const s of [-1, 1]) for (const t of [-1, 1]) { const kx = cx + s * (rx - 2), ky = cy + t * 9; if ((x - kx) ** 2 + (y - ky) ** 2 <= 12.5 * 12.5) return true; }
        return false;
      };
      const wallTh = 3;
      for (let y = 4; y < H - 4; y++) for (let x = 4; x < W - 4; x++) {
        if (!inside(x, y)) continue;
        let rim = false; for (let j = -wallTh; j <= wallTh && !rim; j++) for (let i = -wallTh; i <= wallTh; i++) if (i * i + j * j <= wallTh * wallTh && !inside(x + i, y + j)) { rim = true; break; }
        z.set(x, y, rim ? T.WALL : T.FLAGS);
      }
      // lanes of packed dust inside, and the old marrow-channel down the middle
      for (let x = Math.floor(cx - rx + 4); x <= Math.ceil(cx + rx - 4); x++) for (let j = -2; j <= 2; j++) if (z.get(x, Math.round(cy) + j) === T.FLAGS) z.set(x, Math.round(cy) + j, T.ROAD);
      // gates: 7 wide, east and west, through the knuckles' waist
      const gate = (dir) => { for (let x = dir > 0 ? Math.floor(cx + rx - 8) : 2; dir > 0 ? x < W - 3 : x <= Math.ceil(cx - rx + 8); x++) for (let j = -3; j <= 3; j++) { const t = z.get(x, Math.round(cy) + j); if (t === T.WALL) z.set(x, Math.round(cy) + j, T.ROAD); } };
      gate(1); gate(-1);
      // the marrow-pillars: a colonnade either side of the channel, well apart
      for (let x = Math.floor(cx - rx + 10); x <= cx + rx - 10; x += 6) for (const j of [-7, 7]) if (z.get(x, Math.round(cy) + j) === T.FLAGS) z.set(x, Math.round(cy) + j, T.PILLAR);
      // the Femur's Heart: a dry marrow-well in the middle
      const hx = Math.round(cx), hy = Math.round(cy);
      for (const [i, j] of [[0, 0], [1, 0], [0, 1], [1, 1]]) z.set(hx + i - 6, hy + j - 5, T.ROCK);
      // the approach roads outside
      for (let x = 4; x < W - 4; x++) for (let j = -1; j <= 1; j++) { const t = z.get(x, Math.round(cy) + j); if (t === T.GRASS || t === T.DIRT) z.set(x, Math.round(cy) + j, T.ROAD); }
      // a few rib-arches out on the sand, for the view from the gates
      ribArch(z, 14, 16, 5, true, rng); ribArch(z, W - 16, H - 15, 5, false, rng); ribArch(z, W - 20, 14, 6, true, rng); ribArch(z, 18, H - 16, 4, false, rng);
      z.start = { x: cx + 0.5 - 4, y: cy + 3.5 };
      addLantern(z, cx + 0.5 + 3, cy - 3.5, "The Femur's Heart");
      // the way out into the desert, beyond the east gate
      const ex = W - 9, ey = Math.round(cy);
      addPortal(z, ex + 0.5, ey + 0.5, { to: 'a2_dunes', name: 'Out to the Bleached Dunes', spr: 'gate', arrive: { x: ex - 1.5, y: ey + 0.5 } });
      // where the Quest agent puts the services and the road from Act 1
      const S = (x, y) => ({ x: Math.round(x) + 0.5, y: Math.round(y) + 0.5 });
      z.npcSpots = [
        Object.assign(S(cx - 18, cy - 9), { role: 'vendor' }),
        Object.assign(S(cx - 6, cy + 9), { role: 'healer' }),
        Object.assign(S(cx + 6, cy - 9), { role: 'stash' }),
        Object.assign(S(cx + 18, cy + 9), { role: 'smith' })
      ];
      for (const s of z.npcSpots) { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (z.get(Math.floor(s.x) + i, Math.floor(s.y) + j) === T.PILLAR) z.set(Math.floor(s.x) + i, Math.floor(s.y) + j, T.FLAGS); }
      z.questSpots = { actGate: S(10, cy), actGateArrive: S(13, cy), waypoint: S(cx + 3, cy + 5) };
      mark(z, { kind: 'femur', x: cx, y: cy, rx, ry });
      z.a2props = [];
      for (const s of [-1, 1]) for (const t of [-1, 1]) z.a2props.push({ kind: 'brazier', x: cx + s * 12 + 0.5, y: cy + t * 4 + 0.5, light: 70, lrgb: '255,150,70', lz: 20 });
      connectAll(z, Math.floor(z.start.x), Math.floor(z.start.y));
      return z;
    }

    // --- a2_dunes --------------------------------------------------------------------------------------------------
    function genDunes(seed) {
      return genDesert({
        id: 'a2_dunes', name: 'The Bleached Dunes', seed, W: 170, H: 150, dark: 0.28, lo: 18, hi: 19, table: PK.dunes,
        entry: { side: 'w', to: 'a2_town', name: 'Back to the Citadel of the Femur', spr: 'gate' },
        exit: { side: 'e', to: 'a2_avenue', name: 'On to Reliquary Avenue', spr: 'gate' },
        threshold: 'Femur Gate Road', crossing: 'The Salt Cairn',
        packsN: 34, chests: 7, shrines: 4, spacing: 11, rock: 0.9,
        sites: [
          { lantern: 'The Drowned Caravan', build: (z, s, c) => { // a ring of buried wagons, their cargo still lashed
            for (let k = 0; k < 9; k++) { const a = k / 9 * 6.283; if (c.rng() < 0.8) paint(z, Math.round(s.x + Math.cos(a) * 5), Math.round(s.y + Math.sin(a) * 4), T.ROCK, c.keep); }
            z.objects.push({ type: 'chest', x: s.x + 0.5, y: s.y + 0.5, open: false, ilvl: 20 }); mark(z, { kind: 'caravan', x: s.x, y: s.y });
          } },
          { build: (z, s, c) => ribArch(z, s.x, s.y, 6, c.rng() < 0.5, c.rng, c.keep) },
          { build: (z, s, c) => ribArch(z, s.x, s.y, 5, c.rng() < 0.5, c.rng, c.keep) },
          { lantern: 'The Keel of Saint Ivel', build: (z, s, c) => ribHull(z, s.x, s.y, 22, 6, true, c.rng, c.keep) }
        ]
      });
    }

    // --- a2_avenue: Reliquary Avenue ---------------------------------------------------------------------------------
    // A processional road miles long, paved, six wide, lined both sides by calcified pilgrims who died holding stone
    // lanterns; some of the lanterns still burn. Paving is stone: the wyrms cannot follow you onto it.
    function genAvenue(seed) {
      return genDesert({
        id: 'a2_avenue', name: 'Reliquary Avenue', seed, W: 180, H: 120, dark: 0.3, lo: 19, hi: 20, table: PK.avenue,
        entry: { side: 'w', to: 'a2_dunes', name: 'Back to the Bleached Dunes', spr: 'gate' },
        exit: { side: 'e', to: 'a2_ribvalley', name: 'On to the Valley of Standing Ribs', spr: 'gate' },
        threshold: 'The First Bearer', crossing: 'The Halfway Kneeler',
        packsN: 36, chests: 7, shrines: 4, spacing: 11, rock: 0.8, trackW: 3,
        hub: { x: 90, y: 60 },
        sites: [
          { lantern: 'The Chapter Stair', portal: { to: 'a2_chapter', name: 'Down into the Buried Chapter-House', spr: 'stairs' }, build: (z, s, c) => sunkenStair(z, s.x, s.y, c.rng, c.keep) },
          { build: (z, s, c) => ribHull(z, s.x, s.y, 18, 5, c.rng() < 0.5, c.rng, c.keep) },
          { build: (z, s, c) => ribArch(z, s.x, s.y, 6, c.rng() < 0.5, c.rng, c.keep) }
        ],
        build: (z, c) => {
          // the avenue itself: a straight stone road across the whole zone with two shallow bends
          const W = z.w, y0 = 60, pts = [[6, y0 + c.R(-6, 6)], [60, y0 + c.R(-10, 10)], [120, y0 + c.R(-10, 10)], [W - 6, y0 + c.R(-6, 6)]];
          c.avenue = [];
          z.a2props = [];
          let lit = 0;
          for (let s = 0; s < pts.length - 1; s++) {
            const [ax, ay] = pts[s], [bx, by] = pts[s + 1], n = Math.ceil(Math.hypot(bx - ax, by - ay));
            const ux = (bx - ax) / n, uy = (by - ay) / n, px = -uy, py = ux;
            for (let k = 0; k <= n; k++) {
              const x = ax + ux * k, y = ay + uy * k; c.avenue.push([x, y]);
              for (let w = -3; w <= 3; w++) { const tx = Math.round(x + px * w), ty = Math.round(y + py * w); if (inb(z, tx, ty, 3)) { z.set(tx, ty, T.ROAD); c.keep.add(ty * W + tx); } }
              // the bearers: every five paces either side, some fallen, some gone
              if (k % 5 === 0 && x > 12 && x < W - 12) for (const sd of [-1, 1]) {
                const bx2 = Math.round(x + px * 5 * sd), by2 = Math.round(y + py * 5 * sd), r = c.rng();
                if (r < 0.12) continue;
                paint(z, bx2, by2, r < 0.24 ? T.ROCK : T.PILLAR); c.keep.add(by2 * W + bx2);
                mark(z, { kind: 'lantern_bearer', x: bx2, y: by2, fallen: r < 0.24 });
                if (r >= 0.24 && (lit++ % 3) === 0) z.a2props.push({ kind: 'brazier', x: bx2 + 0.5 - px * 0.9 * sd, y: by2 + 0.5 - py * 0.9 * sd, light: 64, lrgb: '255,160,80', lz: 20 });
              }
            }
          }
          // the gates sit on the avenue
          c.entry.y = Math.round(pts[0][1]); c.exit.y = Math.round(pts[pts.length - 1][1]);
          const mid = c.avenue[Math.floor(c.avenue.length / 2)]; c.hub.x = Math.round(mid[0]); c.hub.y = Math.round(mid[1]);
        }
      });
    }

    // --- a2_chapter: the Buried Chapter-House (dead end, reward at the far end) -----------------------------------
    function genChapter(seed) {
      return genHalls({
        id: 'a2_chapter', name: 'The Buried Chapter-House', seed, size: 104, rooms: 11, hall: [30, 20], theme: 'ossa_chapter', dark: 0.84,
        lo: 19, hi: 21, table: PK.chapter, corridor: 5, rmin: 14, rmax: 20, loops: 3, chests: 0.5,
        up: { to: 'a2_avenue', name: 'Up to Reliquary Avenue' }, lantern: 'The Chapter Door', midLantern: 'The Hall of Oaths'
      });
    }

    // --- a2_ribvalley: the Valley of Standing Ribs -----------------------------------------------------------------
    function genRibValley(seed) {
      return genDesert({
        id: 'a2_ribvalley', name: 'The Valley of Standing Ribs', seed, W: 170, H: 160, dark: 0.3, lo: 20, hi: 21, table: PK.ribs,
        entry: { side: 's', to: 'a2_avenue', name: 'Back to Reliquary Avenue', spr: 'gate' },
        exit: { side: 'n', to: 'a2_stormflat', name: 'On to the Chalk Flats', spr: 'gate' },
        threshold: 'The Valley Mouth', crossing: 'The Keel-Stone',
        packsN: 38, chests: 8, shrines: 4, spacing: 11, mesa: 12, rock: 1.1,
        sites: [
          { lantern: 'The Great Hull', build: (z, s, c) => ribHull(z, s.x, s.y, 30, 8, c.rng() < 0.5, c.rng, c.keep) },
          { build: (z, s, c) => ribHull(z, s.x, s.y, 20, 6, c.rng() < 0.5, c.rng, c.keep) },
          { build: (z, s, c) => ribHull(z, s.x, s.y, 16, 5, c.rng() < 0.5, c.rng, c.keep) },
          { build: (z, s, c) => ribArch(z, s.x, s.y, 7, c.rng() < 0.5, c.rng, c.keep) },
          { build: (z, s, c) => ribArch(z, s.x, s.y, 5, c.rng() < 0.5, c.rng, c.keep) }
        ]
      });
    }

    // --- a2_stormflat: the Chalk Flats (dust storms) ------------------------------------------------------------------
    function genStormFlat(seed) {
      const z = genDesert({
        id: 'a2_stormflat', name: 'The Chalk Flats', seed, W: 180, H: 170, dark: 0.3, lo: 21, hi: 22, table: PK.storm,
        entry: { side: 's', to: 'a2_ribvalley', name: 'Back to the Valley of Standing Ribs', spr: 'gate' },
        exit: { side: 'e', to: 'a2_banners', name: 'On to the Field of Fallen Standards', spr: 'gate' },
        threshold: 'The Last Shade', crossing: 'The White Pan',
        packsN: 36, chests: 7, shrines: 5, spacing: 12, rock: 0.55, mesa: 5,
        sites: [
          { lantern: 'The Tomb Mouth', portal: { to: 'a2_tomb', name: 'Down into the Sand-Choked Tomb', spr: 'stairs' }, build: (z, s, c) => sunkenStair(z, s.x, s.y, c.rng, c.keep) },
          { build: (z, s, c) => ribArch(z, s.x, s.y, 6, c.rng() < 0.5, c.rng, c.keep) },
          { lantern: 'The Chalk Pillar', build: (z, s, c) => { paint(z, s.x, s.y, T.PILLAR, c.keep); paint(z, s.x + 1, s.y, T.PILLAR, c.keep); mark(z, { kind: 'chalk_pillar', x: s.x, y: s.y }); } }
        ],
        // salt pans: wide hardpan sheets where nothing stands
        build: (z, c) => { const n = makeNoise(c.rng); for (let y = 8; y < z.h - 8; y++) for (let x = 8; x < z.w - 8; x++) if (z.get(x, y) !== T.CLIFF && fbm(n, x / 26, y / 26) > 0.55) z.set(x, y, T.DIRT); }
      });
      z.a2storm = { period: 58, dur: 22 };
      return z;
    }

    // --- a2_tomb: the Sand-Choked Tomb (dead end) ----------------------------------------------------------------------
    // sand has poured in through the broken vaults and lies in drifts across the floors; the wyrms swim in the drifts
    function genTomb(seed) {
      return genHalls({
        id: 'a2_tomb', name: 'The Sand-Choked Tomb', seed, size: 100, rooms: 12, theme: 'ossa_tomb', dark: 0.86,
        lo: 21, hi: 23, table: PK.tomb, corridor: 5, rmin: 14, rmax: 21, loops: 3, roundK: 0.3, chests: 0.5,
        up: { to: 'a2_stormflat', name: 'Up to the Chalk Flats' }, lantern: 'The Tomb Stair', midLantern: 'The Choked Nave',
        decorate: (z, rooms, rng) => { const n = makeNoise(rng); for (let y = 2; y < z.h - 2; y++) for (let x = 2; x < z.w - 2; x++) if (z.get(x, y) === T.FLOOR && fbm(n, x / 7, y / 7) > 0.52) z.set(x, y, T.DIRT); }
      });
    }

    // --- a2_banners: the Field of Fallen Standards ---------------------------------------------------------------------
    // where the holy wars of the Ossan orders ended; the cloth rotted a thousand years ago and the metal thread stayed
    function genBanners(seed) {
      return genDesert({
        id: 'a2_banners', name: 'The Field of Fallen Standards', seed, W: 170, H: 150, dark: 0.3, lo: 22, hi: 23, table: PK.banners,
        entry: { side: 'w', to: 'a2_stormflat', name: 'Back to the Chalk Flats', spr: 'gate' },
        exit: { side: 'n', to: 'a2_oasis', name: 'On to the Dry Oasis', spr: 'gate' },
        threshold: "The Herald's Post", crossing: 'The Standard of Nine Wars',
        packsN: 38, chests: 8, shrines: 4, spacing: 11, rock: 0.8,
        sites: [
          { lantern: 'The Last Shield-Wall', build: (z, s, c) => shieldWall(z, s.x, s.y, c) },
          { build: (z, s, c) => shieldWall(z, s.x, s.y, c) },
          { build: (z, s, c) => ribArch(z, s.x, s.y, 6, c.rng() < 0.5, c.rng, c.keep) }
        ],
        after: (z, c) => {
          // standards stuck in the sand across the whole field, in loose battle lines
          z.a2props = z.a2props || [];
          for (let k = 0; k < 70; k++) {
            const x = c.R(10, z.w - 11), y = c.R(10, z.h - 11);
            if (z.get(x, y) !== T.GRASS && z.get(x, y) !== T.DIRT) continue;
            if (z.objects.some(o => Math.hypot(o.x - x, o.y - y) < 4)) continue;
            z.a2props.push({ kind: 'gibbet', x: x + 0.5, y: y + 0.5, ph: c.rng() * 6 });
            mark(z, { kind: 'banner', x, y });
          }
        }
      });
    }
    // a line of shields fused into a low wall, broken where the line broke; flagstones of the camp behind it
    function shieldWall(z, cx, cy, c) {
      const horiz = c.rng() < 0.5, L = 14;
      for (let k = -L / 2; k <= L / 2; k++) {
        const x = horiz ? cx + k : cx, y = horiz ? cy : cy + k;
        if (Math.abs(k) === 2 || Math.abs(k) === 5 || c.rng() < 0.15) continue;   // the breaches
        paint(z, x, y, T.RUIN, c.keep);
      }
      for (let j = 2; j <= 5; j++) for (let k = -4; k <= 4; k++) { const x = horiz ? cx + k : cx + j, y = horiz ? cy + j : cy + k; if (c.rng() < 0.6 && z.get(x, y) !== T.CLIFF) paint(z, x, y, T.FLAGS); }
      mark(z, { kind: 'shield_wall', x: cx, y: cy, horiz, len: L });
    }

    // --- a2_oasis: the Dry Oasis ------------------------------------------------------------------------------------------
    // a basin that held sweet water once; cracked mud, dead palms, a well-house fallen in. The femur's knee rises at its
    // edge, and a split in the knuckle is the way into the marrow.
    function genOasis(seed) {
      return genDesert({
        id: 'a2_oasis', name: 'The Dry Oasis', seed, W: 160, H: 160, dark: 0.3, lo: 22, hi: 23, table: PK.oasis,
        entry: { side: 's', to: 'a2_banners', name: 'Back to the Field of Fallen Standards', spr: 'gate' },
        exit: { side: 'n', to: 'a2_marrow', name: "Into the Femur's Knee", spr: 'cave' },
        threshold: 'The Palm-Stumps', crossing: 'The Well-House',
        packsN: 36, chests: 8, shrines: 4, spacing: 11, rock: 0.9,
        hub: { x: 80, y: 84 },
        build: (z, c) => {
          const bx = 80, by = 84;
          // the basin: cracked mud ringed by hardpan, a few last puddles gone to brine
          for (let y = by - 22; y <= by + 22; y++) for (let x = bx - 26; x <= bx + 26; x++) {
            const d = Math.hypot((x - bx) / 26, (y - by) / 22); if (d > 1 || z.get(x, y) === T.CLIFF) continue;
            z.set(x, y, d < 0.7 ? T.MUD : T.DIRT);
          }
          for (let k = 0; k < 6; k++) { const a = c.rng() * 6.283, d = 4 + c.rng() * 10; disc(z, bx + Math.cos(a) * d * 1.2, by + Math.sin(a) * d, 1.3, T.SHALLOW, c.keep); }
          // dead palms round the rim, far apart
          for (let k = 0; k < 22; k++) { const a = k / 22 * 6.283 + c.rng() * 0.2, x = Math.round(bx + Math.cos(a) * 27), y = Math.round(by + Math.sin(a) * 23); if (c.rng() < 0.7) paint(z, x, y, T.TREE); }
          // the well-house: a fallen square of flagstones and posts
          for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) paint(z, bx + i, by + j, T.FLAGS, c.keep);
          for (const [i, j] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) if (c.rng() < 0.75) paint(z, bx + i, by + j, T.PILLAR, c.keep);
          paint(z, bx, by - 1, T.ROCK, c.keep);
          // the femur's knee: a great knuckle of bone at the north edge, split open
          const kx = c.R(60, 100), ky = 16;
          disc(z, kx - 7, ky, 7.5, T.CLIFF); disc(z, kx + 7, ky, 7.5, T.CLIFF);
          for (let y = ky - 4; y <= ky + 8; y++) for (let x = kx - 2; x <= kx + 2; x++) paint(z, x, y, T.DIRT);
          c.exit.x = kx; c.exit.y = ky + 2;
          mark(z, { kind: 'femur_knee', x: kx, y: ky }); mark(z, { kind: 'well_house', x: bx, y: by });
        },
        sites: [
          { build: (z, s, c) => ribArch(z, s.x, s.y, 6, c.rng() < 0.5, c.rng, c.keep) },
          { lantern: 'The Brine Shrine', build: (z, s, c) => { disc(z, s.x, s.y, 3.2, T.FLAGS, c.keep); paint(z, s.x - 3, s.y, T.PILLAR, c.keep); paint(z, s.x + 3, s.y, T.PILLAR, c.keep); } }
        ]
      });
    }

    // --- a2_marrow: the Marrow Cavity ------------------------------------------------------------------------------------
    // the god's great femur, hollow; rounded chambers of spongy bone joined by wide canals
    function genMarrow(seed) {
      return genHalls({
        id: 'a2_marrow', name: 'The Marrow Cavity', seed, size: 112, rooms: 13, theme: 'ossa_marrow', dark: 0.86,
        lo: 23, hi: 24, table: PK.marrow, corridor: 6, rmin: 15, rmax: 23, loops: 4, roundK: 0.7, chests: 0.45,
        up: { to: 'a2_oasis', name: "Out through the Femur's Knee" }, down: { to: 'a2_lair', name: 'Up into the Empty Socket' },
        lantern: 'The Knee-Split', midLantern: 'The Marrow-Lake Shore',
        decorate: (z, rooms, rng) => {
          // trabeculae: lone struts of spongy bone standing in the round chambers, far apart
          for (const r of rooms) if (r.round && r.w * r.h > 250) for (let k = 0; k < 3; k++) {
            const x = Math.round(r.cx + (rng() - 0.5) * r.w * 0.5), y = Math.round(r.cy + (rng() - 0.5) * r.h * 0.5);
            if (Math.hypot(x - r.cx, y - r.cy) > 3) z.set(x, y, T.PILLAR);
          }
        }
      });
    }

    // --- a2_lair: the Empty Socket ---------------------------------------------------------------------------------------
    // the hip-socket where the femur's head once turned: a vast white bowl under the sun, its rim a ring of broken teeth
    // of bone, the floor at its heart laid with the order's last altar-stones. The act's master waits at z.bossSpot.
    function genLair(seed) {
      const rng = mulberry32(seed), W = 140, H = 140;
      const z = new Zone('a2_lair', 'The Empty Socket', W, H, 0.3); z.theme = 'ossa'; z.seed = seed; z.act = 2;
      const cx = 70, cy = 66, n1 = makeNoise(rng);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const d = Math.hypot(x - cx, y - cy), e = Math.min(x, y, W - 1 - x, H - 1 - y), wob = (fbm(n1, x / 9, y / 9) - 0.45) * 8;
        z.set(x, y, e < 3 || d > 60 + wob ? T.CLIFF : d < 22 ? T.FLAGS : fbm(n1, x / 16 + 7, y / 16) > 0.55 ? T.DIRT : T.GRASS);
      }
      // the rim of the socket: broken teeth of bone in a ring, gaps wide enough for a column of pilgrims
      for (let k = 0; k < 40; k++) { const a = k / 40 * 6.283; if (k % 5 === 0 || rng() < 0.3) continue; const x = Math.round(cx + Math.cos(a) * 36), y = Math.round(cy + Math.sin(a) * 36); z.set(x, y, T.PILLAR); if (rng() < 0.4) z.set(x + 1, y, T.PILLAR); }
      // the altar-stones: a cross of pillars at the arena's edge, and the arena itself
      for (let k = 0; k < 8; k++) { const a = k / 8 * 6.283 + 0.39, x = Math.round(cx + Math.cos(a) * 19), y = Math.round(cy + Math.sin(a) * 19); z.set(x, y, T.PILLAR); }
      z.inBoss = (x, y) => Math.hypot(x - cx, y - cy) < 17;
      z.bossSpot = { x: cx + 0.5, y: cy + 0.5 };
      z.bossArena = { x: cx + 0.5, y: cy + 0.5, r: 21 };
      // the way in, from the marrow below
      const ex = cx, ey = cy + 54;
      for (let y = ey - 8; y <= ey + 3; y++) for (let x = ex - 3; x <= ex + 3; x++) if (inb(z, x, y, 3)) z.set(x, y, T.DIRT);
      z.start = { x: ex + 0.5, y: ey - 1.5 };
      addPortal(z, ex + 0.5, ey + 0.5, { to: 'a2_marrow', name: 'Down into the Marrow Cavity', spr: 'cave', arrive: z.start });
      addLantern(z, ex + 3.5, ey - 2.5, "The Socket's Lip");
      ribArch(z, cx - 30, cy + 30, 6, true, rng); ribArch(z, cx + 32, cy - 26, 6, false, rng);
      connectAll(z, Math.floor(z.start.x), Math.floor(z.start.y));
      // the guard: packs between the lip and the rim, none inside the arena
      fillZone(z, PK.lair, 23, 24, { rng, packs: 7, chests: 2, shrines: 2, spacing: 12, minDist: 14, prefix: 'lair', avoid: (x, y) => Math.hypot(x - cx, y - cy) < 26 });
      mark(z, { kind: 'socket', x: cx, y: cy, r: 60 }); mark(z, { kind: 'boss', x: cx, y: cy });
      return z;
    }

    // =================================================================== registry
    const REG = {
      a2_town:      { gen: s => genTown(s * 151 + 3),       band: null,     name: 'Citadel of the Shattered Femur', dress: false },
      a2_dunes:     { gen: s => genDunes(s * 157 + 5),      band: [18, 19], name: 'The Bleached Dunes' },
      a2_avenue:    { gen: s => genAvenue(s * 163 + 7),     band: [19, 20], name: 'Reliquary Avenue' },
      a2_chapter:   { gen: s => genChapter(s * 167 + 11),   band: [19, 21], name: 'The Buried Chapter-House' },
      a2_ribvalley: { gen: s => genRibValley(s * 173 + 13), band: [20, 21], name: 'The Valley of Standing Ribs' },
      a2_stormflat: { gen: s => genStormFlat(s * 179 + 17), band: [21, 22], name: 'The Chalk Flats' },
      a2_tomb:      { gen: s => genTomb(s * 181 + 19),      band: [21, 23], name: 'The Sand-Choked Tomb' },
      a2_banners:   { gen: s => genBanners(s * 191 + 23),   band: [22, 23], name: 'The Field of Fallen Standards' },
      a2_oasis:     { gen: s => genOasis(s * 193 + 29),     band: [22, 23], name: 'The Dry Oasis' },
      a2_marrow:    { gen: s => genMarrow(s * 197 + 31),    band: [23, 24], name: 'The Marrow Cavity' },
      a2_lair:      { gen: s => genLair(s * 199 + 37),      band: [23, 24], name: 'The Empty Socket', dress: false }
    };
    for (const zid in REG) {
      const e = REG[zid];
      ZONE_GEN[zid] = function (seed) {
        const prev = (typeof G !== 'undefined' && G) ? G.__genZone : undefined;
        if (typeof G !== 'undefined' && G) G.__genZone = zid;
        try {
          const z = e.gen(seed);
          if (e.dress !== false) { try { if (typeof dressZone === 'function') dressZone(z, seed); } catch (err) { rep(err); } }
          return z;
        } finally { if (typeof G !== 'undefined' && G) G.__genZone = prev; }
      };
      if (typeof ZONE_NAMES === 'object') ZONE_NAMES[zid] = e.name;
    }

    // =================================================================== props: the few things standing on the sand
    // Existing prop kinds only (bones, skulls, cairns, braziers as the bearers' stone lanterns, gibbets as standards).
    if (typeof genProps === 'function') {
      const _gp = genProps;
      genProps = function (z) {
        const out = _gp(z);
        try {
          if (z && OSSA_OUT[z.theme]) {
            const occ = new Set(z.objects.map(o => Math.floor(o.x) + ',' + Math.floor(o.y)));
            for (let y = 2; y < z.h - 2; y++) for (let x = 2; x < z.w - 2; x++) {
              if (occ.has(x + ',' + y)) continue;
              const t = z.get(x, y), r = hash(x * 31 + 7, y * 17 + 13), v = Math.floor(hash(x * 31 + 14, y * 17 + 26) * 4);
              const px = x + 0.2 + hash(x * 31 + 21, y * 17 + 39) * 0.6, py = y + 0.2 + hash(x * 31 + 28, y * 17 + 52) * 0.6;
              if (hash(Math.floor(x / 11) * 7 + 3, Math.floor(y / 11) * 5 + 1) < 0.5) continue;   // long quiet stretches
              if (t === T.GRASS || t === T.DIRT) { if (r < 0.004) out.push({ kind: 'bones', v, x: px, y: py }); else if (r < 0.0065) out.push({ kind: 'skulls', v, x: px, y: py }); else if (r < 0.0078) out.push({ kind: 'cairn', v, x: px, y: py }); }
              else if (t === T.ROAD && r < 0.004) out.push({ kind: 'bones', v, x: px, y: py });
              else if (t === T.FLAGS) { if (r < 0.03) out.push({ kind: 'rubble', v, x: px, y: py }); else if (r < 0.04) out.push({ kind: 'skulls', v, x: px, y: py }); }
            }
          }
          if (z && z.a2props) for (const p of z.a2props) out.push(Object.assign({ v: Math.floor(hash(p.x * 13, p.y * 7) * 4) }, p));
        } catch (e) { rep(e); }
        return out;
      };
    }

    // =================================================================== the chalk storm (a2_stormflat)
    // Every minute or so a storm of chalk rolls across the flats for twenty breaths: your lamp shrinks to a few yards,
    // creatures fade into the white, their arrows drift in the wind, and the Chalk Wraiths go unseen until they are close.
    const STORM = { k: 0, t: 0, on: false, zone: null, streaks: [] };
    function stormK() { return (G.zone && G.zone.a2storm && G.zone === STORM.zone) ? STORM.k : 0; }
    function stormTick(dt) {
      const z = G.zone;
      if (!z || !z.a2storm) { STORM.k = 0; STORM.zone = null; return; }
      if (STORM.zone !== z) { STORM.zone = z; STORM.t = z.a2storm.period * 0.45; STORM.on = false; STORM.k = 0; }
      const S = z.a2storm; STORM.t += dt;
      const ph = STORM.t % (S.period + S.dur), was = STORM.on;
      STORM.on = ph > S.period;
      const into = ph - S.period, target = STORM.on ? Math.min(1, into / 3, (S.dur - into) / 3) : 0;
      STORM.k += (Math.max(0, target) - STORM.k) * Math.min(1, dt * 3);
      if (STORM.on && !was) say('A chalk storm rolls across the flats. The light goes white and blind.', 3);
      if (!STORM.on && was) say('The chalk settles.', 2);
      if (STORM.k > 0.02) {
        // arrows and spittle loosed in the storm drift off their line
        if (typeof shots !== 'undefined' && shots) for (const s of shots) if (!s._a2j) { s._a2j = 1; const a = (Math.random() - 0.5) * 0.5 * STORM.k, c = Math.cos(a), si = Math.sin(a), vx = s.vx, vy = s.vy; if (vx != null && vy != null) { s.vx = vx * c - vy * si; s.vy = vx * si + vy * c; } }
        // the wraiths ride the storm
        for (const m of z.monsters) if (m.type === 'chalk_wraith' && !m.dead) { if (m._spd0 == null) m._spd0 = m.spd; m.spd = m._spd0 * (1 + 0.45 * STORM.k); }
      } else for (const m of z.monsters) if (m._spd0 != null) { m.spd = m._spd0; m._spd0 = null; }
    }
    if (typeof updateDay === 'function') {
      const _ud = updateDay;
      updateDay = function (dt) { _ud(dt); try { stormTick(dt); } catch (e) { rep(e); } };
    }
    if (typeof heroLightR === 'function') {
      const _hl = heroLightR;
      heroLightR = function () { const r = _hl(); const k = stormK(); return k > 0 ? r * (1 - 0.5 * k) : r; };
    }
    if (typeof monVisibility === 'function') {
      const _mv = monVisibility;
      monVisibility = function (m) {
        const v = _mv(m), k = stormK(); if (k <= 0 || !m) return v;
        const d = Math.hypot(m.x - P.x, m.y - P.y);
        if (m.type === 'chalk_wraith' && d > 2.5 && !(m.hurt > 0)) return Math.min(v, 1 - 0.92 * k);
        return d < 3 ? v : Math.min(v, 1 - 0.65 * k * Math.min(1, (d - 3) / 4));
      };
    }
    if (typeof drawAtmos === 'function') {
      const _da = drawAtmos;
      drawAtmos = function () {
        _da();
        try {
          const k = stormK(); if (k <= 0.01 || typeof ctx === 'undefined') return;
          const dt = Math.min(0.05, G.dtLast || 0.016), Wd = typeof W !== 'undefined' ? W : 960, Hd = typeof H !== 'undefined' ? H : 540;
          ctx.save();
          ctx.globalAlpha = 0.34 * k; ctx.fillStyle = '#e6dfcc'; ctx.fillRect(0, 0, Wd, Hd);
          const want = Math.round(160 * k);
          while (STORM.streaks.length < want) STORM.streaks.push({ x: Math.random() * Wd, y: Math.random() * Hd, v: 160 + Math.random() * 220, l: 3 + Math.random() * 8, a: 0.3 + Math.random() * 0.5 });
          if (STORM.streaks.length > want) STORM.streaks.length = want;
          ctx.fillStyle = '#f4efe2';
          for (const s of STORM.streaks) {
            s.x += s.v * dt; s.y += s.v * 0.18 * dt;
            if (s.x > Wd + 10) { s.x = -10; s.y = Math.random() * Hd; } if (s.y > Hd + 4) s.y = -4;
            ctx.globalAlpha = s.a * k; ctx.fillRect(Math.round(s.x), Math.round(s.y), Math.round(s.l), 1);
          }
          ctx.restore();
        } catch (e) { rep(e); }
      };
    }

    // =================================================================== for tests
    if (typeof window !== 'undefined') {
      window.__act2 = {
        zones: Object.keys(REG),
        bands: Object.fromEntries(Object.entries(REG).map(([k, v]) => [k, v.band])),
        monsters: ['calc_knight', 'oath_blade', 'marrow_ghoul', 'chalk_worm', 'chalk_wraith', 'dune_kite'],
        packs: PK,
        gen: (zid, seed) => ZONE_GEN[zid] ? ZONE_GEN[zid](seed) : null,
        storm: STORM, stormK, cfg: A2CFG
      };
    }
  }
}
