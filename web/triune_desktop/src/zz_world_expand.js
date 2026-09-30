// v0.50 world-expand: two new Act 1 forest zones between the existing bands.
// (v0.52: both reworked as open old growth by The Openness Warden: Hollow Wood is a Y through lattice-spaced
//  trunks, Root Deep a sunken basin inside a root-band with four wide gaps. Layout builders: zz_openness.js.)
//   hollow_wood — old-growth grove between the Ashen Moor (start) and the Hollow Crypt. Level 4-8.
//                 Trunk-relics (ribcage, skull-in-a-niche, sword grown through a bole), luminous fungi
//                 in teal / ghost / amber, ruined pillars, fern understory, drifting spores.
//   root_deep   — deeper forest between the Drowned Fen and the Bone Catacombs. Level 12-16.
//                 Giant twisted trunks with faces grown in, standing-stone rings, mushroom groves,
//                 half-swallowed shrines. More monsters, larger ruins.
// The file wraps the existing systems (ZONE_GEN, floorTileFor, ambient22, isOutdoor, drawStatues,
// altar placement) so no base file is touched.
{
  if (typeof ZONE_GEN === 'object' && typeof T !== 'undefined' && typeof Zone === 'function') {

    // -- palette helpers ------------------------------------------------------
    // luminous mushroom variants: cap colour, stem colour, glow rgb
    const SHROOM = {
      teal:  { cap: '#4ad0c0', capHi: '#c8f8ee', stem: '#e0e8dc', glow: '150,240,220' },
      ghost: { cap: '#c8d8f0', capHi: '#ffffff', stem: '#dcd8c8', glow: '200,220,255' },
      amber: { cap: '#f0a848', capHi: '#ffe0a0', stem: '#d8c898', glow: '255,190,110' }
    };
    const SHROOM_KEYS = Object.keys(SHROOM);
    // trunk-relic kinds: what has grown through a tree
    const RELIC_KINDS = ['ribcage', 'skull', 'niche', 'sword', 'face'];

    // -- theme registry (ambient light, tile look, outdoor flag) --------------
    const NEW_THEMES = { hollow_wood: 1, root_deep: 1 };
    // greener, wetter ambient than moor: heavier canopy = darker but with a warm-cool cast
    const AMB_DAY_NEW  = { hollow_wood: [120, 138, 110], root_deep:  [ 84, 104,  96] };
    const AMB_NIGHT_NEW= { hollow_wood: [ 46,  62,  70], root_deep:  [ 34,  44,  58] };

    // wrap isOutdoor: our forests are outdoor zones (day/night, sky-dial)
    if (typeof isOutdoor === 'function') {
      const _io = isOutdoor;
      isOutdoor = function (z) { return _io(z) || (z && NEW_THEMES[z.theme]); };
    }
    // wrap ambient22: return per-theme ambient with day/night interpolation
    if (typeof ambient22 === 'function' && typeof dayK === 'function') {
      const _amb = ambient22;
      ambient22 = function (z) {
        if (!z || !NEW_THEMES[z.theme]) return _amb(z);
        const d = AMB_DAY_NEW[z.theme], n = AMB_NIGHT_NEW[z.theme], k = dayK();
        return d.map((v, i) => Math.round(n[i] + (v - n[i]) * k));
      };
    }
    // wrap floorTileFor: use fen tiles (mossy greens) as our forest floor base
    if (typeof floorTileFor === 'function' && typeof TILES === 'object') {
      const _ft = floorTileFor;
      floorTileFor = function (z, x, y, t) {
        if (z && NEW_THEMES[z.theme]) {
          const hv = (typeof hash === 'function') ? hash(x, y) : ((x * 73856093 ^ y * 19349663) >>> 0) / 4294967295;
          if (t === T.GRASS || t === T.TREE || t === T.ROCK) return TILES.fen[Math.floor(hv * 4)];
          if (t === T.DIRT) return TILES.dirt[Math.floor(hv * 2)];
          if (t === T.WATER) return TILES.bog ? TILES.bog[Math.floor(hv * 2)] : TILES.water[Math.floor(hv * 2)];
        }
        return _ft(z, x, y, t);
      };
    }

    // -- prop scatter (mushrooms + trunk-relics) -------------------------------
    // Called from the zone generator; writes into z.props (a lightweight list we own).
    function scatterProps(z, rng, opts) {
      z.props = z.props || [];
      const shroomN = opts.shroomN, relicN = opts.relicN;
      // luminous fungi: clusters of 2-6 caps around a chosen ground tile, ~1/3 near a tree base
      let placed = 0, tries = 0;
      while (placed < shroomN && tries++ < shroomN * 40) {
        const cx = 3 + Math.floor(rng() * (z.w - 6)), cy = 3 + Math.floor(rng() * (z.h - 6));
        const g = z.get(cx, cy);
        if (g !== T.GRASS && g !== T.DIRT) continue;
        // prefer near a tree
        let neighborTree = false;
        for (let dy = -1; dy <= 1 && !neighborTree; dy++) for (let dx = -1; dx <= 1; dx++) if (z.get(cx + dx, cy + dy) === T.TREE) { neighborTree = true; break; }
        if (!neighborTree && rng() < 0.55) continue;
        const kind = SHROOM_KEYS[Math.floor(rng() * SHROOM_KEYS.length)];
        const size = 2 + Math.floor(rng() * 5);
        for (let k = 0; k < size; k++) {
          const px = cx + (rng() - 0.5) * 3, py = cy + (rng() - 0.5) * 3;
          if (z.solidAt(px, py)) continue;
          const scale = 0.6 + rng() * 0.8;
          z.props.push({ kind: 'lum_shroom', variant: kind, x: px + 0.5, y: py + 0.5, s: scale, seed: (rng() * 1e6) | 0, light: 1 });
        }
        placed++;
      }
      // trunk-relics: pick standing trees, mark them with a relic kind
      let r = 0, t2 = 0;
      while (r < relicN && t2++ < relicN * 60) {
        const tx = 4 + Math.floor(rng() * (z.w - 8)), ty = 4 + Math.floor(rng() * (z.h - 8));
        if (z.get(tx, ty) !== T.TREE) continue;
        // avoid clustering
        if (z.props.some(p => p.kind === 'trunk_relic' && Math.hypot(p.x - tx, p.y - ty) < 6)) continue;
        const rk = RELIC_KINDS[Math.floor(rng() * RELIC_KINDS.length)];
        z.props.push({ kind: 'trunk_relic', relic: rk, x: tx + 0.5, y: ty + 0.5, seed: (rng() * 1e6) | 0 });
        r++;
      }
      // scattered stones on the flagstones/shrines: a low ring of rock rubble
      // (we do this by nudging a few grass tiles near ruins into ROCK inline in the ruin builder)
    }

    // -- ruin builder: stone rings, standing stones, half-swallowed shrines ---
    // We reuse T.FLAGS + T.PILLAR + T.ROCK + T.RUIN so lighting and collision already work.
    function placeStandingRing(z, cx, cy, radius, rng) {
      // 5-8 pillars in a ring, one or two toppled to ROCK, flagstones underfoot
      const n = 5 + Math.floor(rng() * 4);
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > (radius + 0.5) * (radius + 0.5)) continue;
        const t = z.get(cx + dx, cy + dy);
        if (t === T.CLIFF) continue;
        if (t === T.TREE) z.set(cx + dx, cy + dy, T.GRASS);
        z.set(cx + dx, cy + dy, T.FLAGS);
      }
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2 + rng() * 0.2;
        const px = cx + Math.round(Math.cos(a) * radius), py = cy + Math.round(Math.sin(a) * radius);
        if (z.get(px, py) !== T.CLIFF) z.set(px, py, rng() < 0.28 ? T.ROCK : T.PILLAR);
      }
    }
    function placeSwallowedShrine(z, cx, cy, rng) {
      // 4x4 flag plinth with two pillars at corners, a broken slab, a curtain of surrounding trees
      const S = 4;
      for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) {
        const t = z.get(cx + dx, cy + dy);
        if (t === T.CLIFF) continue;
        z.set(cx + dx, cy + dy, T.FLAGS);
      }
      z.set(cx, cy, T.PILLAR); z.set(cx + S - 1, cy, T.PILLAR);
      z.set(cx + S - 1, cy + S - 1, T.ROCK);
      // "half-swallowed": bring the forest back in on one side
      for (let dy = -1; dy < S + 1; dy++) { const tx = cx - 1, ty = cy + dy; if (z.get(tx, ty) !== T.CLIFF && rng() < 0.7) z.set(tx, ty, T.TREE); }
    }

    // -- v0.52 openness rework (The Openness Warden): open old growth ----------------------------------------
    // Big trunks stand on a loose lattice (a forest you can walk through and see across, like the v0.48 demo),
    // thickets only where the grove noise peaks, meadows in between. Builders come from OPENNESS (zz_openness.js).
    function oldGrowth(z, S, mask, spacing, keep) {
      for (let gy = 4; gy < S.H - 4; gy += spacing) for (let gx = 4; gx < S.W - 4; gx += spacing) {
        const x = gx + Math.floor(S.rng() * (spacing - 2)), y = gy + Math.floor(S.rng() * (spacing - 2));
        if (!mask(x, y) || S.rng() > keep) continue;
        const t = z.get(x, y); if (t !== T.GRASS && t !== T.DIRT) continue;
        let clear = true; for (let b = -1; b <= 1 && clear; b++) for (let a = -1; a <= 1; a++) { const u = z.get(x + a, y + b); if (u === T.ROAD || u === T.FLAGS || u === T.PILLAR) { clear = false; break; } }
        if (clear) z.set(x, y, T.TREE);
      }
    }
    const OPEN_SCALE = (x, y, S, sc) => fbm(S.nG, x / sc, y / sc);

    // -- generator: hollow_wood: a Y through open old growth (moor -> fork -> crypt / pilgrim road) ---------
    function genHollowWood(seed) {
      const O = OPENNESS;
      const z = O.buildOpen({
        id: 'hollow_wood', name: 'Hollow Wood', seed, W: 152, H: 152, theme: 'hollow_wood', dark: 0.35, rim: 6,
        nodes: S => {
          const { W, H, R } = S;
          return {
            entry: { x: 12, y: R(66, 86), r: 5 }, mid: { x: R(58, 68), y: R(70, 82), r: 6, floor: T.DIRT },
            north: { x: R(96, 116), y: 13, r: 5 }, exit: { x: W - 13, y: R(106, 126), r: 5 },
            shrine: { x: R(34, 54), y: R(24, 40), r: 4 }, ring: { x: R(92, 110), y: R(62, 84), r: 5 }
          };
        },
        shape: (x, y, S) => (fbm(S.nW, x / 22 + 3, y / 22 + 3) < 0.25 ? T.WATER : null),   // rare mossy pools
        grove: { scale: 16, cut: 0.66, dens: 0.55, lone: 0.003, rock: 0.004, dirt: 0.72 },
        roads: S => [{ a: 'entry', b: 'mid', r: 1.1 }, { a: 'mid', b: 'north', r: 1.1, bend: 0.18 }, { a: 'mid', b: 'exit', r: 1.1, bend: 0.18 }, { a: 'mid', b: 'shrine', r: 0.9 }, { a: 'mid', b: 'ring', r: 0.9 }],
        post: (z, S) => {
          oldGrowth(z, S, (x, y) => OPEN_SCALE(x, y, S, 16) > 0.4, 4, 0.85);
          placeSwallowedShrine(z, Math.floor(S.N.shrine.x) - 2, Math.floor(S.N.shrine.y) - 2, S.rng);
          placeStandingRing(z, Math.floor(S.N.ring.x), Math.floor(S.N.ring.y), 4, S.rng);
        },
        lanterns: [{ at: 'entry', name: 'Wood Threshold', dx: 1 }, { at: 'mid', name: 'Fungal Crossroads', dy: 0 }],
        portals: [
          { at: 'entry', to: 'moor', name: 'Back to the Ashen Moor', spr: 'gate', dx: -2 },
          { at: 'exit', to: 'crypt', name: 'Down to the Hollow Crypt', spr: 'cave' },
          { at: 'north', to: 'pilgrim_road', name: 'North along the Pilgrim Road', spr: 'gate', dy: -1 }
        ],
        // 24 packs at 7 spacing on 110x110 -> 20 packs at 13 spacing on 152x152, each ~30% larger
        packs: { table: typeof PACKS_MID !== 'undefined' ? PACKS_MID : PACKS_LOW, count: 20, spacing: 13, sizeK: 1.3, minStart: 22, lo: 4, hi: 8 },
        chests: 8, shrines: 4
      });
      z.arrive.moor = z.start;
      scatterProps(z, mulberry32(seed * 3 + 1), { shroomN: 40, relicN: 10 });
      return z;
    }

    // -- generator: root_deep: a sunken basin walled by a root-band with four wide gaps ---------------------
    function genRootDeep(seed) {
      const O = OPENNESS;
      let C = null, BR = 0;
      const z = O.buildOpen({
        id: 'root_deep', name: 'Root Deep', seed, W: 164, H: 164, theme: 'root_deep', dark: 0.55, rim: 6,
        nodes: S => {
          const { W, H, R } = S; C = { x: W / 2 + R(-4, 4), y: H / 2 + R(-4, 4) }; BR = Math.round(W * 0.26);
          return {
            entry: { x: 12, y: C.y + R(-8, 8), r: 5 }, exit: { x: W - 13, y: C.y + R(-6, 14), r: 5 },
            mid1: { x: C.x - BR - 6, y: C.y, r: 6, floor: T.DIRT }, mid2: { x: C.x + BR + 6, y: C.y + 4, r: 6, floor: T.DIRT },
            bridge: { x: W - R(18, 26), y: R(15, 22), r: 5 }, basin: Object.assign({ r: 8 }, C),
            ringA: { x: C.x + R(-14, -6), y: C.y + R(-22, -12), r: 5 }, ringB: { x: R(98, 124), y: R(128, 146), r: 6 },
            shrine1: { x: R(58, 84), y: R(18, 30), r: 4 }, shrine2: { x: R(22, 40), y: R(116, 138), r: 4 }
          };
        },
        shape: (x, y, S) => {
          const d = Math.hypot(x - C.x, y - C.y) + fbm(S.nW, x / 8, y / 8) * 6;
          if (d < BR - 6 && fbm(S.nX, x / 11, y / 11) < 0.3) return T.WATER;          // the basin's black pools
          if (d > BR && d < BR + 8) return S.rng() < 0.62 ? T.TREE : null;            // the root-band
          return null;
        },
        grove: { scale: 14, cut: 0.64, dens: 0.55, lone: 0.004, rock: 0.005, dirt: 0.72 },
        roads: S => {
          const r = [{ a: 'entry', b: 'mid1', r: 1.2 }, { a: 'mid1', b: 'basin', r: 1.2, bend: 0.1 }, { a: 'basin', b: 'mid2', r: 1.2, bend: 0.1 }, { a: 'mid2', b: 'exit', r: 1.2 },
            { a: 'mid2', b: 'bridge', r: 1.0, bend: 0.2 }, { a: 'mid1', b: 'shrine1', r: 0.9 }, { a: 'mid1', b: 'shrine2', r: 0.9 }, { a: 'basin', b: 'ringA', r: 0.9 }, { a: 'mid2', b: 'ringB', r: 0.9 }];
          return r;
        },
        post: (z, S) => {
          // four wide gaps through the root-band (the roads already cut two of them)
          for (const a of [Math.PI, 0, -Math.PI / 2 + (S.rng() - 0.5), Math.PI / 2 + (S.rng() - 0.5)]) O.disc(z, C.x + Math.cos(a) * (BR + 4), C.y + Math.sin(a) * (BR + 4), 7, T.GRASS, t => t === T.WATER || t === T.CLIFF);
          oldGrowth(z, S, (x, y) => Math.hypot(x - C.x, y - C.y) > BR + 8 && OPEN_SCALE(x, y, S, 14) > 0.4, 5, 0.9);
          placeStandingRing(z, Math.floor(S.N.ringA.x), Math.floor(S.N.ringA.y), 3, S.rng);
          placeStandingRing(z, Math.floor(S.N.ringB.x), Math.floor(S.N.ringB.y), 4, S.rng);
          placeSwallowedShrine(z, Math.floor(S.N.shrine1.x) - 2, Math.floor(S.N.shrine1.y) - 2, S.rng);
          placeSwallowedShrine(z, Math.floor(S.N.shrine2.x) - 2, Math.floor(S.N.shrine2.y) - 2, S.rng);
        },
        lanterns: [{ at: 'entry', name: 'Root Threshold', dx: 1 }, { at: 'mid1', name: 'Face Grove', dy: 0 }, { at: 'mid2', name: 'Ossuary Approach', dy: 0 }],
        portals: [
          { at: 'entry', to: 'fen', name: 'Back to the Drowned Fen', spr: 'gate', dx: -2 },
          { at: 'exit', to: 'cata1', name: 'Down to the Bone Catacombs', spr: 'stairs' },
          { at: 'bridge', to: 'broken_bridge', name: 'Aside to the Broken Bridge', spr: 'gate' }
        ],
        // 34 packs at 7 spacing on 120x120 -> 26 packs at 13 spacing on 164x164, each ~30% larger
        packs: { table: typeof PACKS_HIGH !== 'undefined' ? PACKS_HIGH : PACKS_MID, count: 26, spacing: 13, sizeK: 1.3, minStart: 22, lo: 12, hi: 16 },
        chests: 12, shrines: 6
      });
      z.arrive.fen = z.start;
      scatterProps(z, mulberry32(seed * 3 + 2), { shroomN: 60, relicN: 18 });
      return z;
    }

    // -- a way back up from the dungeons these woods lead into (they used to be one-way) -----------------
    function addBackPortal(z, target, name) {
      if (z.objects.some(o => o.type === 'portal' && o.to === target)) return;
      const up = z.objects.find(o => o.type === 'portal') || z.start;
      const p = OPENNESS && OPENNESS.nearestOpen ? OPENNESS.nearestOpen(z, up.x + 6, up.y + 4, 6) : { x: up.x + 3, y: up.y };
      z.objects.push({ type: 'portal', x: p.x, y: p.y, to: target, name, spr: 'stairs' });
      z.arrive = z.arrive || {}; z.arrive[target] = { x: p.x, y: p.y + 1.2 };
    }

    // -- register zones -------------------------------------------------------
    ZONE_GEN.hollow_wood = s => { const z = genHollowWood(s * 29 + 13); try { if (typeof dressZone === 'function') dressZone(z, s); } catch (e) { if (typeof reportError === 'function') reportError(e); } return z; };
    ZONE_GEN.root_deep   = s => { const z = genRootDeep(s * 31 + 17); try { if (typeof dressZone === 'function') dressZone(z, s); } catch (e) { if (typeof reportError === 'function') reportError(e); } return z; };
    if (typeof ZONE_NAMES === 'object') { ZONE_NAMES.hollow_wood = 'Hollow Wood'; ZONE_NAMES.root_deep = 'Root Deep'; }

    // -- inject portals into the source zones (moor, fen) ---------------------
    // Approach: wrap ZONE_GEN.moor / .fen and, after the base generator runs, find a walkable spot
    // near the far edge and add a portal. Existing portals stay intact.
    function injectPortal(z, target, name, spr, prefer) {
      if (z.objects.some(o => o.type === 'portal' && o.to === target)) return true;   // v0.52: the layout already has it
      // find a walkable grass tile in a preferred region
      const inSet = new Set([T.GRASS, T.DIRT, T.ROAD]);
      let best = null, bestScore = -Infinity;
      const rng = mulberry32((target === 'hollow_wood' ? 401 : 601) + z.w * 7);
      for (let tries = 0; tries < 800; tries++) {
        const x = Math.floor(prefer.x0 + rng() * (prefer.x1 - prefer.x0));
        const y = Math.floor(prefer.y0 + rng() * (prefer.y1 - prefer.y0));
        if (x < 3 || y < 3 || x >= z.w - 3 || y >= z.h - 3) continue;
        if (!inSet.has(z.get(x, y))) continue;
        if (z.solidAt(x, y)) continue;
        // avoid stacking on existing portals or lanterns
        if (z.objects.some(o => (o.type === 'portal' || o.type === 'lantern' || o.type === 'vendor' || o.type === 'altar') && Math.hypot(o.x - (x + 0.5), o.y - (y + 0.5)) < 4)) continue;
        const score = -Math.hypot(x - (prefer.x0 + prefer.x1) / 2, y - (prefer.y0 + prefer.y1) / 2) + rng() * 3;
        if (score > bestScore) { bestScore = score; best = { x, y }; }
      }
      if (!best) return false;
      z.objects.push({ type: 'portal', x: best.x + 0.5, y: best.y + 0.5, to: target, name, spr });
      z.arrive = z.arrive || {};
      z.arrive[target] = { x: best.x + 0.5, y: best.y + 1.5 };
      return true;
    }
    if (ZONE_GEN.moor) {
      const _moor = ZONE_GEN.moor;
      ZONE_GEN.moor = s => { const z = _moor(s); try { injectPortal(z, 'hollow_wood', 'Path to the Hollow Wood', 'gate', { x0: z.w - 30, y0: z.h - 30, x1: z.w - 8, y1: z.h - 8 }); } catch (e) { if (typeof reportError === 'function') reportError(e); } return z; };
    }
    if (ZONE_GEN.fen) {
      const _fen = ZONE_GEN.fen;
      ZONE_GEN.fen = s => { const z = _fen(s); try { injectPortal(z, 'root_deep', 'Path to the Root Deep', 'gate', { x0: 8, y0: 8, x1: 34, y1: 34 }); } catch (e) { if (typeof reportError === 'function') reportError(e); } return z; };
    }
    // v0.52: the Hollow Crypt and the Bone Catacombs get a stair back up into the woods that lead to them
    if (ZONE_GEN.crypt) { const _c = ZONE_GEN.crypt; ZONE_GEN.crypt = s => { const z = _c(s); try { addBackPortal(z, 'hollow_wood', 'Up to the Hollow Wood'); } catch (e) { if (typeof reportError === 'function') reportError(e); } return z; }; }
    if (ZONE_GEN.cata1) { const _c1 = ZONE_GEN.cata1; ZONE_GEN.cata1 = s => { const z = _c1(s); try { addBackPortal(z, 'root_deep', 'Up to the Root Deep'); } catch (e) { if (typeof reportError === 'function') reportError(e); } return z; }; }

    // -- prop rendering: luminous fungi + trunk-relics ------------------------
    // Each pushes into the same iso z-sorted list as trees/statues/altars.
    function drawLuminous(list) {
      const z = G.zone; if (!z || !z.props) return;
      for (const p of z.props) {
        if (p.kind !== 'lum_shroom') continue;
        if (typeof onScreen === 'function' && !onScreen(p.x, p.y, 40)) continue;
        list.push({ d: p.x + p.y, f: () => {
          const q = iso(p.x, p.y), sx = Math.round(q.sx), sy = Math.round(q.sy);
          const S = SHROOM[p.variant] || SHROOM.teal;
          const s = p.s || 1;
          const h = Math.round(6 * s), cw = Math.max(4, Math.round(6 * s));
          // shadow
          ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(sx - cw / 2, sy, cw, 2);
          // stem
          ctx.fillStyle = S.stem; ctx.fillRect(sx - 1, sy - h, 2, h);
          ctx.fillStyle = 'rgba(20,18,22,0.4)'; ctx.fillRect(sx - 1, sy - h, 1, h);
          // cap: rounded slab
          ctx.fillStyle = S.cap;
          for (let r = 0; r < 3; r++) { const w = cw + (r === 1 ? 2 : r === 0 ? 0 : -1); ctx.fillRect(sx - Math.round(w / 2), sy - h - 3 + r, w, 1); }
          // highlight speckles
          ctx.fillStyle = S.capHi;
          const seed = p.seed | 0;
          for (let k = 0; k < 4; k++) { const hx = ((seed * 73 + k * 191) % (cw - 1)) - Math.floor((cw - 1) / 2); ctx.fillRect(sx + hx, sy - h - 2, 1, 1); }
          // glow
          const t = G.time || 0;
          const pul = 0.55 + 0.25 * Math.sin(t * 2 + p.seed * 0.01);
          ctx.globalCompositeOperation = 'lighter';
          if (typeof glow === 'function') glow(sx, sy - h - 1, 8 * s, S.glow, 0.28 * pul);
          ctx.globalCompositeOperation = 'source-over';
        } });
      }
    }
    function drawTrunkRelic(list) {
      const z = G.zone; if (!z || !z.props) return;
      for (const p of z.props) {
        if (p.kind !== 'trunk_relic') continue;
        if (typeof onScreen === 'function' && !onScreen(p.x, p.y, 50)) continue;
        list.push({ d: p.x + p.y + 0.02, f: () => {
          const q = iso(p.x, p.y), sx = Math.round(q.sx), sy = Math.round(q.sy);
          const rk = p.relic;
          // draw on the trunk face, slightly above ground, slightly inset
          if (rk === 'ribcage') {
            ctx.fillStyle = '#d8cfa8';
            for (let i = 0; i < 5; i++) { ctx.fillRect(sx - 4, sy - 18 - i * 2, 8, 1); ctx.fillRect(sx - 4, sy - 18 - i * 2, 1, 2); ctx.fillRect(sx + 3, sy - 18 - i * 2, 1, 2); }
          } else if (rk === 'skull') {
            ctx.fillStyle = '#ede4c4'; ctx.fillRect(sx - 3, sy - 22, 6, 5);
            ctx.fillStyle = '#0a080c'; ctx.fillRect(sx - 2, sy - 21, 2, 2); ctx.fillRect(sx + 1, sy - 21, 2, 2);
            ctx.fillRect(sx - 1, sy - 18, 3, 1);
          } else if (rk === 'niche') {
            ctx.fillStyle = '#1a1210'; ctx.fillRect(sx - 3, sy - 22, 6, 6);
            ctx.fillStyle = '#e8dcc0'; ctx.fillRect(sx - 1, sy - 20, 2, 3);
            ctx.fillStyle = '#ffd070'; ctx.fillRect(sx, sy - 21, 1, 1);
            ctx.globalCompositeOperation = 'lighter';
            if (typeof glow === 'function') glow(sx, sy - 20, 5, '255,220,140', 0.35 + 0.1 * Math.sin(G.time * 6 + p.seed));
            ctx.globalCompositeOperation = 'source-over';
          } else if (rk === 'sword') {
            // pommel high, blade snapped and grown through the bark
            ctx.fillStyle = '#8a8e98'; ctx.fillRect(sx - 1, sy - 24, 2, 10);
            ctx.fillStyle = '#e0e4ea'; ctx.fillRect(sx, sy - 24, 1, 10);
            ctx.fillStyle = '#5a4a2a'; ctx.fillRect(sx - 2, sy - 15, 4, 1);
            ctx.fillStyle = '#c8a040'; ctx.fillRect(sx - 1, sy - 14, 2, 2);
          } else if (rk === 'face') {
            // a very subtle face in the bark: two dark hollows, a downturned line
            ctx.fillStyle = 'rgba(10,8,10,0.55)';
            ctx.fillRect(sx - 3, sy - 20, 2, 2); ctx.fillRect(sx + 1, sy - 20, 2, 2);
            ctx.fillRect(sx - 2, sy - 15, 4, 1);
          }
        } });
      }
    }

    // wrap drawStatues (it already runs on the ground/decor pass with `list`)
    if (typeof drawStatues === 'function') {
      const _ds = drawStatues;
      drawStatues = function (list) {
        try { drawTrunkRelic(list); drawLuminous(list); } catch (e) { if (typeof reportError === 'function') reportError(e); }
        return _ds(list);
      };
    }

    // -- lantern-map recognises the new zones ---------------------------------
    // (nothing to do — the lantern panel reads ZONE_NAMES which we already extended.)

    // -- expose for tests -----------------------------------------------------
    if (typeof window !== 'undefined') { window.__worldExpand = { genHollowWood, genRootDeep, SHROOM, RELIC_KINDS }; }
  }
}
