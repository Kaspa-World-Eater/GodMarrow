// v0.51 act1-expand (v0.52: layouts reworked for openness by The Openness Warden, see zz_openness.js): seventeen new Act I zones so the god's Hide reads as a region, not a corridor.
//   Open zones (v0.52: 124-184 tile grids, each with its own layout):
//     sighing_ridge   mlvl 2-4   windswept ridge off the Ashen Moor, pilgrim-lanterns hung along the crest
//     ash_shore       mlvl 3-5   black-glass coastal shore where the Moor breaks off, tide drags at the ash
//     burnt_heath     mlvl 4-6   a heath a Pyre-Saint walked, off the ridge; the ground crackles under boots
//     fern_gully      mlvl 3-6   a berry-and-fern gully between the moor and the wood, warm-earthed and shallow
//     pilgrim_road    mlvl 5-8   a stone road with tall waystones running off the Hollow Wood toward the fen
//     drowned_village mlvl 6-9   houses half-under lymph, off the Drowned Fen: doors ajar, thatch rotted through
//     sunken_bog      mlvl 8-11  bog of sunken shrines, off the village; the water beads on the sash of a drowned monk
//   Dungeons (v0.52: ~30% larger grids, rooms 11+ a side, halls 5-7 wide):
//     fallen_monastery mlvl 6-9   collapsed monastery off the Hollow Crypt: half floor, half sky
//     wolf_den_chapel  mlvl 4-7   a chapel taken by a den off the sighing ridge; broken pews and old kills
//     plague_hospice   mlvl 8-11  hospice off cata1: rows of cots, sheets that still lift on their own breath
//     well_shaft       mlvl 9-12  a flooded well-shaft off the drowned village, coiling deep
//     smugglers_hold   mlvl 5-8   a smugglers' cellar hidden under cata2, its ledger still open
//   Dens (v0.52: outdoor clearings, ~104 tiles, the structure is the landmark):
//     bogwitch_shack   mlvl 7-10  a bog-witch's shack off the sunken bog: two rooms of tallow and bones
//     tree_hollow      mlvl 5-7   the hollow inside a great tree off the Hollow Wood, two rooms sharing a knot
//     hunter_cache     mlvl 3-5   a hunter's stone cache off the fern gully: three crates and a snare-wall
//   Ruins (v0.52: outdoor, a hilltop tor and a river crossing, dead-end loot):
//     fallen_watchtower mlvl 6-8  a leaning tower off the Old Barrow, its bell half-buried in the turf
//     broken_bridge     mlvl 9-12 a snapped stone bridge off the Root Deep, a river camp under its shadow
//
// The file wraps ZONE_GEN, ZONE_NAMES and injects one new portal off each of the 8 existing Act I zones,
// then chains the remaining 9 zones off the newly-added ones. Base files are untouched.
{
  if (typeof ZONE_GEN === 'object' && typeof T !== 'undefined' && typeof Zone === 'function') {

    // ---- pack fallbacks -----------------------------------------------------
    // Existing PACKS_LOW/MID/HIGH/FEN/CRYPT/BONE are the tables the base game uses. Newer monsters (moth_saint,
    // veinworm_elder, stalker_crone, trunk_thing, chorister, bloatling) have already been pushed into those
    // tables by zz_monsters_new.js; we simply reuse the same tables and per-zone tune the mlvl band.
    function bestTable(prefer) {
      const names = prefer.concat(['PACKS_MID', 'PACKS_LOW', 'PACKS_FEN', 'PACKS_CRYPT', 'PACKS_HIGH', 'PACKS_BONE']);
      for (const n of names) if (typeof window !== 'undefined' && window[n]) return window[n];
      for (const n of names) { try { const v = eval(n); if (v) return v; } catch (e) { /* ignore */ } }
      return null;
    }

    // ---- v0.52 openness rework (The Openness Warden) ---------------------------
    // Every open zone now has its own layout (crest line, coastal L, ring road, gully, S-curve road, flooded grid,
    // bog islands, hilltop tor, river crossing); dens are outdoor clearings with the shack / hollow / cache as a
    // landmark in the middle; dungeons go through genDungeon, which zz_openness.js widens for these ids.
    // All builders live in OPENNESS (zz_openness.js, a hoisted var: it is defined by the time zones generate).
    const OP = () => OPENNESS;
    const NT = (z, x, y) => z.get(Math.floor(x), Math.floor(y));
    // a landmark site: a flagstone disc with two standing stones
    function markSite(z, n, rng, r) {
      r = r || 3;
      OP().disc(z, n.x, n.y, r, T.FLAGS, t => t === T.CLIFF || t === T.WATER);
      for (const [dx, dy] of [[-r, 0], [r, 0]]) if (rng() < 0.85 && NT(z, n.x + dx, n.y + dy) !== T.CLIFF) z.set(Math.floor(n.x + dx), Math.floor(n.y + dy), T.PILLAR);
    }
    // a small roofless building: walls of RUIN with a doorway, flagstone floor, a few gaps where it fell in
    function hut(z, x0, y0, w, h, door, rng, gaps) {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
        if (x < 3 || y < 3 || x >= z.w - 3 || y >= z.h - 3) continue;
        const edge = x === x0 || y === y0 || x === x0 + w - 1 || y === y0 + h - 1;
        if (!edge) { z.set(x, y, T.FLAGS); continue; }
        const side = y === y0 ? 0 : x === x0 + w - 1 ? 1 : y === y0 + h - 1 ? 2 : 3;
        const mid = side % 2 ? y - y0 - Math.floor(h / 2) : x - x0 - Math.floor(w / 2);
        if (side === door && mid >= -1 && mid <= 0) { z.set(x, y, T.FLAGS); continue; }
        z.set(x, y, rng() < (gaps == null ? 0.18 : gaps) ? T.FLAGS : T.RUIN);
      }
    }
    const tbl = (prefer) => bestTable(prefer);
    // clears trees/rocks off lantern + portal footprints (post may have put stones there)
    function openZone(id, name, seed, spec) { return OP().buildOpen(Object.assign({ id, name, seed }, spec)); }

    // -- sighing_ridge: a long crest line with rock tors; lantern posts along the crest (mlvl 2-4) ------------
    function genSighingRidge(seed) {
      let ph = 0;
      const yc = (x, H) => H * 0.46 + 14 * Math.sin(x / 27 + ph);
      return openZone('sighing_ridge', 'Sighing Ridge', seed, {
        W: 172, H: 124, theme: 'moor', dark: 0.32, rim: 6,
        nodes: S => {
          const { W, H, R } = S; ph = S.rng() * 6.28;
          const at = x => ({ x, y: yc(x, H) });
          return {
            entry: Object.assign(at(12), { r: 5 }), exit: Object.assign(at(W - 12), { r: 5 }),
            mid: Object.assign(at(Math.round(W * 0.52)), { r: 6, floor: T.DIRT }),
            m0: Object.assign(at(Math.round(W * 0.28)), { r: 4 }),
            m1: { x: Math.round(W * 0.72) + R(-6, 6), y: Math.min(H - 20, yc(W * 0.72, H) + R(26, 32)), r: 5 }
          };
        },
        shape: (x, y, S) => {
          const d = y - yc(x, S.H);
          if (d > 44 + fbm(S.nW, x / 10, y / 10) * 14) return T.CLIFF;               // the southern scarp
          if (Math.abs(d) > 8 && fbm(S.nX, x / 13, y / 13) > 0.62) return T.CLIFF;   // wind-cut tors
          if (Math.abs(d) > 6 && fbm(S.nX, x / 13, y / 13) > 0.58 && S.rng() < 0.3) return T.ROCK;
          return null;
        },
        grove: { scale: 16, cut: 0.62, dens: 0.45, lone: 0.004, rock: 0.004, dirt: 0.7 },
        roads: S => {
          const pts = []; for (let x = 12; x <= S.W - 12; x += 8) pts.push({ x, y: yc(x, S.H) });
          return [{ pts, r: 1.3, verge: 4 }, { a: 'mid', b: 'm1', r: 1.1, bend: 0.2 }];
        },
        post: (z, S) => {
          markSite(z, S.N.m0, S.rng); markSite(z, S.N.m1, S.rng);
          // pilgrim-lantern posts along the crest, alternating sides
          for (let x = 26, k = 0; x < S.W - 20; x += 18, k++) { const y = yc(x, S.H) + (k % 2 ? 3.5 : -3.5); if (NT(z, x, y) !== T.CLIFF) z.set(Math.floor(x), Math.floor(y), T.PILLAR); }
        },
        lanterns: [{ at: 'entry', name: 'Ridge Threshold', dx: 1 }, { at: 'mid', name: 'The Lantern Line', dy: 0 }, { at: 'm0', name: 'The Sighing Lantern', dy: 0 }, { at: 'm1', name: "The Widow's Stumps", dy: 0 }],
        portals: [
          { at: 'entry', to: 'moor', name: 'Back to the Ashen Moor', spr: 'gate', dx: -2 },
          { at: 'exit', to: 'burnt_heath', name: 'On to the Burnt Heath', spr: 'gate' },
          { at: 'm1', to: 'wolf_den_chapel', name: 'Down to the The Gnawed Chapel', spr: 'cave', dy: 2 }
        ],
        packs: { table: tbl(['PACKS_LOW', 'PACKS_MID']), count: 16, spacing: 13, sizeK: 1.1, minStart: 18, lo: 2, hi: 4 },
        chests: 5, shrines: 3
      });
    }

    // -- ash_shore: a coastal L around a black-glass sea; tide flats you can wade (mlvl 3-5) ------------------
    function genAshShore(seed) {
      return openZone('ash_shore', 'Ash Shore', seed, {
        W: 152, H: 152, theme: 'moor', dark: 0.34, rim: 5, fill: T.WATER,
        nodes: S => {
          const { W, H, R } = S;
          return {
            entry: { x: W - 14, y: R(20, 30), r: 5 }, mid: { x: Math.round(W * 0.56), y: R(22, 34), r: 6, floor: T.DIRT },
            corner: { x: R(24, 32), y: R(24, 32), r: 5 }, m0: { x: R(24, 34), y: Math.round(H * 0.56), r: 5 }, m1: { x: R(26, 36), y: H - 18, r: 5 }
          };
        },
        shape: (x, y, S) => {
          const n = fbm(S.nW, x / 11, y / 11) * 14 - 7;
          const s = Math.min(x - S.W * 0.42, y - S.H * 0.38) + n;   // >0: the sea side of the L
          if (s > 9) return fbm(S.nX, x / 5, y / 5) > 0.7 ? T.ROCK : T.WATER;   // open sea, the odd sea-stack
          if (s > 1) return T.SHALLOW;                                            // tide flats
          return null;
        },
        grove: { scale: 14, cut: 0.64, dens: 0.42, lone: 0.003, rock: 0.009, dirt: 0.64 },
        roads: S => [{ a: 'entry', b: 'mid', r: 1.2 }, { a: 'mid', b: 'corner', r: 1.2 }, { a: 'corner', b: 'm0', r: 1.2 }, { a: 'm0', b: 'm1', r: 1.2 }],
        post: (z, S) => { markSite(z, S.N.m0, S.rng); markSite(z, S.N.m1, S.rng); },
        lanterns: [{ at: 'entry', name: 'Shore Threshold', dx: -2 }, { at: 'mid', name: 'Tide-Line Lantern', dy: 0 }, { at: 'm0', name: 'The Broken Kneeler', dy: 0 }, { at: 'm1', name: 'Ashwake Milestone', dy: 0 }],
        portals: [{ at: 'entry', to: 'burnt_heath', name: 'Back to the Burnt Heath', spr: 'gate', dx: 2 }],
        after: (z, S) => { const m = S.N.m1; z.objects.push({ type: 'chest', x: Math.floor(m.x) + 2.5, y: Math.floor(m.y) + 1.5, open: false, ilvl: 6 }); },
        packs: { table: tbl(['PACKS_LOW', 'PACKS_MID']), count: 16, spacing: 13, sizeK: 1.1, minStart: 18, lo: 3, hi: 5 },
        chests: 6, shrines: 3
      });
    }

    // -- burnt_heath: a ring road around the Pyre-Saint's ash circle; spokes out to three exits (mlvl 4-6) ----
    function genBurntHeath(seed) {
      const ringPts = (c, r) => { const p = []; for (let a = 0; a <= 64; a++) p.push({ x: c.x + Math.cos(a / 64 * 6.2832) * r, y: c.y + Math.sin(a / 64 * 6.2832) * r }); return p; };
      return openZone('burnt_heath', 'Burnt Heath', seed, {
        W: 152, H: 152, theme: 'moor', dark: 0.36, rim: 6,
        nodes: S => {
          const { W, H, R } = S, c = { x: W / 2 + R(-4, 4), y: H / 2 + R(-4, 4) };
          S.ringR = Math.round(W * 0.3);
          return {
            entry: { x: 12, y: c.y + R(-10, 10), r: 5 }, exit: { x: c.x + R(-10, 10), y: H - 12, r: 5 }, m1: { x: W - 12, y: c.y + R(-10, 10), r: 5 },
            mid: { x: c.x - S.ringR * 0.707, y: c.y - S.ringR * 0.707, r: 5, floor: T.DIRT }, m0: Object.assign({ r: 8, floor: T.DIRT }, c)
          };
        },
        grove: {
          scale: 15, cut: 0.56, dens: 0.5, lone: 0.004, rock: 0.005, dirt: 0.58,
          densAt: (x, y, S, g) => { const d = Math.hypot(x - S.N.m0.x, y - S.N.m0.y); if (d < S.ringR - 5) return g > 0.66 ? 0.18 : 0.004; return g > 0.56 ? 0.5 * (0.35 + 0.65 * OP().smooth(0.56, 0.64, g)) : 0; }
        },
        roads: S => [
          { pts: ringPts(S.N.m0, S.ringR), r: 1.3, verge: 4 },
          { a: 'entry', b: { x: S.N.m0.x - S.ringR, y: S.N.m0.y }, r: 1.2, bend: 0.1 },
          { a: 'exit', b: { x: S.N.m0.x, y: S.N.m0.y + S.ringR }, r: 1.2, bend: 0.1 },
          { a: 'm1', b: { x: S.N.m0.x + S.ringR, y: S.N.m0.y }, r: 1.2, bend: 0.1 },
          { a: 'mid', b: 'm0', r: 1.0, bend: 0.15 }
        ],
        post: (z, S) => {
          const c = S.N.m0; OP().disc(z, c.x, c.y, 5, T.FLAGS);
          for (let k = 0; k < 7; k++) { const a = k / 7 * 6.2832 + 0.3; z.set(Math.floor(c.x + Math.cos(a) * 6.5), Math.floor(c.y + Math.sin(a) * 6.5), S.rng() < 0.25 ? T.ROCK : T.PILLAR); }
          markSite(z, S.N.m1, S.rng);
        },
        lanterns: [{ at: 'entry', name: 'Heath Threshold', dx: 1 }, { at: 'mid', name: 'The Cinder Line', dy: 0 }, { at: 'm0', name: "Pyre-Saint's Ash-Circle", dy: 0 }, { at: 'm1', name: 'The Cracked Milestone', dx: -3, dy: 0 }],
        portals: [
          { at: 'entry', to: 'sighing_ridge', name: 'Back to the Sighing Ridge', spr: 'gate', dx: -2 },
          { at: 'exit', to: 'ash_shore', name: 'Down to the Ash Shore', spr: 'gate' },
          { at: 'm1', to: 'fern_gully', name: 'Off to the Fern Gully', spr: 'gate', dx: 2 }
        ],
        packs: { table: tbl(['PACKS_MID', 'PACKS_LOW']), count: 18, spacing: 13, sizeK: 1.1, minStart: 18, lo: 4, hi: 6 },
        chests: 6, shrines: 3
      });
    }

    // -- fern_gully: a long valley between cliff walls, a stream down the middle, ferns banked on the slopes --
    function genFernGully(seed) {
      let ph = 0;
      const cx = (y, W) => W / 2 + 16 * Math.sin(y / 31 + ph);
      const hw = (y) => 36 + 7 * Math.sin(y / 23 + ph * 2);
      const sx = (y, W) => cx(y, W) + 7 * Math.sin(y / 12 + ph);
      return openZone('fern_gully', 'Fern Gully', seed, {
        W: 132, H: 172, theme: 'hollow_wood', dark: 0.4, rim: 4,
        nodes: S => {
          const { W, H } = S; ph = S.rng() * 6.28;
          return {
            entry: { x: cx(12, W), y: 12, r: 5 }, exit: { x: cx(H - 12, W), y: H - 12, r: 5 }, mid: { x: cx(H * 0.5, W) + 10, y: H * 0.5, r: 5, floor: T.DIRT },
            m0: { x: cx(H * 0.3, W) - hw(H * 0.3) * 0.6, y: H * 0.3, r: 5 }, m1: { x: cx(H * 0.72, W) + hw(H * 0.72) * 0.55, y: H * 0.72, r: 6 }
          };
        },
        shape: (x, y, S) => {
          const off = Math.abs(x - cx(y, S.W)), w = hw(y) + fbm(S.nW, x / 9, y / 9) * 10 - 5;
          if (off > w) return T.CLIFF;
          if (Math.abs(x - sx(y, S.W)) < 1.4 + fbm(S.nX, x / 6, y / 6) * 1.2) return T.WATER;
          return null;
        },
        grove: {
          scale: 13, cut: 0.5, dens: 0.55, lone: 0.006, rock: 0.004, dirt: 0.72,
          densAt: (x, y, S, g) => { const k = Math.abs(x - cx(y, S.W)) / hw(y); if (k > 0.72 && g > 0.46) return 0.55; if (g > 0.64) return 0.45; return 0; }
        },
        roads: S => { const pts = []; for (let y = 12; y <= S.H - 12; y += 8) pts.push({ x: cx(y, S.W) + 9 * Math.sin(y / 19), y }); return [{ pts, r: 1.2, verge: 3.5, ford: T.SHALLOW }, { a: 'mid', b: 'm0', r: 1, ford: T.SHALLOW }, { a: 'mid', b: 'm1', r: 1, ford: T.SHALLOW }]; },
        post: (z, S) => {
          markSite(z, S.N.m0, S.rng);
          const c = S.N.m1; for (let k = 0; k < 9; k++) { const a = k / 9 * 6.2832; z.set(Math.floor(c.x + Math.cos(a) * 4.5), Math.floor(c.y + Math.sin(a) * 4.5), T.ROCK); }   // the fern-ring: a ring of mossy stones
          OP().disc(z, c.x, c.y, 3, T.GRASS);
        },
        fill: T.TREE,
        lanterns: [{ at: 'entry', name: 'Gully Threshold', dy: 2 }, { at: 'mid', name: 'The Gully Ford', dy: 0 }, { at: 'm0', name: 'The Berry-Warden', dy: 0 }, { at: 'm1', name: 'The Fern-Ring', dy: 0 }],
        portals: [
          { at: 'entry', to: 'burnt_heath', name: 'Up to the Burnt Heath', spr: 'gate', dy: -2 },
          { at: 'exit', to: 'hunter_cache', name: "To the Hunter's Cache", spr: 'cave' }
        ],
        packs: { table: tbl(['PACKS_MID', 'PACKS_LOW']), count: 16, spacing: 13, sizeK: 1.1, minStart: 18, lo: 3, hi: 6 },
        chests: 6, shrines: 3
      });
    }

    // -- pilgrim_road: a wide flagstone road in a long S across open meadow, waystones every stretch --------
    function genPilgrimRoad(seed) {
      let ph = 0;
      const yr = (x, H) => H / 2 + 30 * Math.sin(x / 38 + ph);
      return openZone('pilgrim_road', 'Pilgrim Road', seed, {
        W: 184, H: 128, theme: 'moor', dark: 0.34, rim: 6,
        nodes: S => {
          const { W, H, R } = S; ph = S.rng() * 6.28;
          const on = x => ({ x, y: yr(x, H) });
          const off = (x, d) => ({ x, y: clamp(yr(x, H) + d, 16, H - 16) });
          return {
            entry: Object.assign(on(12), { r: 5 }), exit: Object.assign(on(W - 12), { r: 5 }), mid: Object.assign(on(Math.round(W / 2)), { r: 6, floor: T.FLAGS }),
            m0: Object.assign(off(Math.round(W * 0.24), yr(W * 0.24, H) > H / 2 ? -26 : 26), { r: 5 }),
            m1: Object.assign(off(Math.round(W * 0.56), yr(W * 0.56, H) > H / 2 ? -26 : 26), { r: 5 }),
            m2: Object.assign(off(Math.round(W * 0.8), yr(W * 0.8, H) > H / 2 ? -28 : 28), { r: 5 })
          };
        },
        grove: { scale: 17, cut: 0.57, dens: 0.5, lone: 0.005, rock: 0.004, dirt: 0.72 },
        roads: S => {
          const pts = []; for (let x = 12; x <= S.W - 12; x += 6) pts.push({ x, y: yr(x, S.H) });
          return [{ pts, r: 2, tile: T.FLAGS, verge: 5 }, { a: 'm0', b: { x: S.N.m0.x, y: yr(S.N.m0.x, S.H) }, r: 1 }, { a: 'm1', b: { x: S.N.m1.x, y: yr(S.N.m1.x, S.H) }, r: 1 }, { a: 'm2', b: { x: S.N.m2.x, y: yr(S.N.m2.x, S.H) }, r: 1 }];
        },
        post: (z, S) => {
          for (let x = 30; x < S.W - 20; x += 22) { const y = yr(x, S.H), s = Math.cos(x / 38 + ph) * 30 / 38, L = Math.hypot(1, s); for (const k of [-4.5, 4.5]) { const px = x - s / L * k, py = y + 1 / L * k; if (NT(z, px, py) !== T.CLIFF) z.set(Math.floor(px), Math.floor(py), T.PILLAR); } }
          markSite(z, S.N.m0, S.rng); markSite(z, S.N.m1, S.rng, 4); markSite(z, S.N.m2, S.rng);
        },
        lanterns: [{ at: 'entry', name: 'Road Threshold', dx: 1 }, { at: 'mid', name: 'Waystone Crossing', dy: -3 }, { at: 'm0', name: 'Ashwake Waystone', dy: 0 }, { at: 'm1', name: 'The Empty Reliquary Milestone', dy: 0 }, { at: 'm2', name: 'The Kneeling Post', dy: 0 }],
        portals: [
          { at: 'entry', to: 'hollow_wood', name: 'Back to the Hollow Wood', spr: 'gate', dx: -2 },
          { at: 'exit', to: 'fen', name: 'On toward the Drowned Fen', spr: 'gate' },
          { at: 'm2', to: 'tree_hollow', name: 'Into the Tree-Hollow', spr: 'cave', dy: 2 }
        ],
        packs: { table: tbl(['PACKS_MID']), count: 20, spacing: 13, sizeK: 1.1, minStart: 18, lo: 5, hi: 8 },
        chests: 7, shrines: 4
      });
    }

    // -- drowned_village: a street grid of roofless houses, half the blocks under lymph (mlvl 6-9) -----------
    function genDrownedVillage(seed) {
      return openZone('drowned_village', 'Drowned Village', seed, {
        W: 152, H: 144, theme: 'fen', dark: 0.4, rim: 5, fill: T.WATER,
        nodes: S => {
          const { W, H, R } = S; S.gx = R(20, 26); S.gy = R(20, 24); S.ox = R(22, 30); S.oy = R(18, 26);
          const col = k => S.ox + k * S.gx, row = k => S.oy + k * S.gy;
          const nc = Math.floor((W - S.ox - 14) / S.gx), nr = Math.floor((H - S.oy - 14) / S.gy); S.nc = nc; S.nr = nr;
          const cr = Math.floor(nr / 2), cc = Math.floor(nc / 2);
          return {
            entry: { x: 12, y: row(cr), r: 5 }, exit: { x: W - 12, y: row(Math.max(0, cr - 1)), r: 5 },
            mid: { x: col(cc), y: row(cr), r: 7, floor: T.FLAGS },
            m0: { x: col(1) + S.gx / 2, y: row(0) + S.gy / 2, r: 0 }, m1: { x: col(nc - 1) - S.gx / 2, y: row(nr) - S.gy / 2, r: 0 }, m2: { x: col(1), y: row(nr), r: 4 }
          };
        },
        shape: (x, y, S) => {
          const w = fbm(S.nW, x / 17, y / 17) - (y / S.H) * 0.12 - (x / S.W) * 0.06;   // the low south-east floods deepest
          if (w < 0.25) return T.WATER;
          return null;
        },
        grove: { scale: 14, cut: 0.63, dens: 0.4, lone: 0.004, rock: 0.003, dirt: 0.7 },
        roads: S => {
          const out = [];
          for (let k = 0; k <= S.nc; k++) { const x = S.ox + k * S.gx; out.push({ pts: [{ x, y: S.oy }, { x, y: S.oy + S.nr * S.gy }], r: 1.2, verge: 2.5 }); }
          for (let k = 0; k <= S.nr; k++) { const y = S.oy + k * S.gy; out.push({ pts: [{ x: S.ox, y }, { x: S.ox + S.nc * S.gx, y }], r: 1.2, verge: 2.5 }); }
          out.push({ a: 'entry', b: { x: S.ox, y: S.N.entry.y }, r: 1.2 }, { a: 'exit', b: { x: S.ox + S.nc * S.gx, y: S.N.exit.y }, r: 1.2 });
          return out;
        },
        post: (z, S) => {
          // one or two roofless houses per block, doors onto a street; marks 0/1 are named houses
          for (let r = 0; r < S.nr; r++) for (let c = 0; c < S.nc; c++) {
            const bx = S.ox + c * S.gx + 3, by = S.oy + r * S.gy + 3, bw = S.gx - 6, bh = S.gy - 6;
            const isMark = [S.N.m0, S.N.m1].some(m => m.x > bx && m.x < bx + bw && m.y > by && m.y < by + bh);
            const nH = isMark ? 1 : (S.rng() < 0.3 ? 0 : S.rng() < 0.6 ? 1 : 2);
            for (let k = 0; k < nH; k++) {
              const w = S.R(7, 9), h = S.R(6, 7), x0 = k ? bx + bw - w : bx, y0 = k ? by + bh - h : by;
              if (!isMark && S.rng() < 0.25 && fbm(S.nW, x0 / 17, y0 / 17) < 0.3) continue;   // this one went under
              hut(z, isMark ? Math.floor(bx + bw / 2 - w / 2) : x0, isMark ? Math.floor(by + bh / 2 - h / 2) : y0, w, h, k ? 0 : 2, S.rng, isMark ? 0.1 : 0.22);
            }
          }
          const c = S.N.mid; z.set(Math.floor(c.x) + 3, Math.floor(c.y) + 3, T.PILLAR);   // the square's well-head
        },
        lanterns: [{ at: 'entry', name: 'Village Threshold', dx: 1 }, { at: 'mid', name: 'The Sunken Square', dy: 0 }, { at: 'm0', name: 'The Ajar Door', dy: 0 }, { at: 'm1', name: 'The Rotted Loom', dy: 0 }, { at: 'm2', name: 'The Reed That Points Home', dy: 0 }],
        portals: [
          { at: 'entry', to: 'fen', name: 'Back to the Drowned Fen', spr: 'gate', dx: -2 },
          { at: 'exit', to: 'sunken_bog', name: 'On to the Sunken Bog', spr: 'gate' },
          { at: 'm1', to: 'well_shaft', name: 'Down the Well-Shaft', spr: 'cave', dx: 1, dy: 1 }
        ],
        packs: { table: tbl(['PACKS_FEN', 'PACKS_MID']), count: 22, spacing: 12, sizeK: 1.1, minStart: 18, lo: 6, hi: 9 },
        chests: 8, shrines: 4
      });
    }

    // -- sunken_bog: wide wadeable flats, deep pools, hummock islands with sunken shrines (mlvl 8-11) --------
    function genSunkenBog(seed) {
      return openZone('sunken_bog', 'Sunken Bog', seed, {
        W: 164, H: 152, theme: 'fen', dark: 0.44, rim: 5, fill: T.SHALLOW,
        nodes: S => {
          const { W, H, R } = S;
          return {
            entry: { x: 12, y: R(60, 90), r: 6 }, mid: { x: W / 2 + R(-8, 8), y: H / 2 + R(-8, 8), r: 16 },
            m0: { x: R(W - 40, W - 24), y: R(22, 40), r: 8 }, m1: { x: R(W - 44, W - 26), y: R(H - 40, H - 24), r: 8 }, m2: { x: R(30, 50), y: R(H - 38, H - 24), r: 8 }
          };
        },
        shape: (x, y, S) => {
          const w = fbm(S.nW, x / 19, y / 19);
          if (w < 0.33) return T.WATER;
          if (w < 0.45) return T.SHALLOW;
          return null;
        },
        grove: { scale: 12, cut: 0.62, dens: 0.45, lone: 0.006, rock: 0.002, dirt: 0.75 },
        roads: S => [{ a: 'entry', b: 'mid', r: 1.1 }, { a: 'mid', b: 'm0', r: 1.1 }, { a: 'mid', b: 'm1', r: 1.1 }, { a: 'mid', b: 'm2', r: 1.1 }],
        post: (z, S) => {
          markSite(z, S.N.m0, S.rng, 4); markSite(z, S.N.m1, S.rng); markSite(z, S.N.m2, S.rng);
          const c = S.N.mid; for (let k = 0; k < 6; k++) { const a = k / 6 * 6.2832; z.set(Math.floor(c.x + Math.cos(a) * 9), Math.floor(c.y + Math.sin(a) * 9), S.rng() < 0.3 ? T.ROCK : T.PILLAR); }   // a drowned shrine circle on the great hummock
        },
        lanterns: [{ at: 'entry', name: 'Bog Threshold', dx: 1 }, { at: 'mid', name: 'The Sunken Crossing', dy: 0 }, { at: 'm0', name: 'The Kneeling Arch', dy: 0 }, { at: 'm1', name: 'The Iron Hook', dy: 0 }, { at: 'm2', name: "The Drowned Monk's Sash", dy: 0 }],
        portals: [
          { at: 'entry', to: 'drowned_village', name: 'Back to the Drowned Village', spr: 'gate', dx: -2 },
          { at: 'm0', to: 'bogwitch_shack', name: "To the Bog-Witch's Shack", spr: 'cave', dy: 2 }
        ],
        packs: { table: tbl(['PACKS_FEN', 'PACKS_HIGH']), count: 22, spacing: 13, sizeK: 1.1, minStart: 18, lo: 8, hi: 11 },
        chests: 8, shrines: 4
      });
    }

    // -- dungeons: genDungeon is widened for these ids by zz_openness.js --------------------------------------
    function genAct1Dungeon(id, name, seed, opts) {
      const table = opts.packTable || bestTable(opts.tablePrefer || []);
      const z = genDungeon({
        id, name, seed, size: opts.size || 84, rooms: opts.rooms || 14, dark: opts.dark || 0.8,
        theme: opts.theme || 'crypt', lo: opts.lo, hi: opts.hi, packs: table,
        up: opts.up, down: opts.down || null, lantern: opts.lantern || (name + ' Threshold'),
        chests: opts.chests || 0.5, boss: opts.boss || null, style: opts.style, corr: opts.corr, grow: opts.grow
      });
      // extra named lanterns in the middle of the dungeon (open floor, clear of pillars)
      const names = opts.extraLanterns || [];
      if (names.length) {
        const rms = [];
        for (let y = 4; y < z.h - 4; y += 2) for (let x = 4; x < z.w - 4; x += 2) { let ok = true; for (let b = -2; b <= 2 && ok; b++) for (let a = -2; a <= 2; a++) if (z.get(x + a, y + b) !== T.FLOOR) { ok = false; break; } if (ok) rms.push([x, y]); }
        for (let i = 0; i < names.length && rms.length; i++) {
          const idx = Math.floor(rms.length * (0.35 + i * 0.25)) % rms.length;
          const [lx, ly] = rms[idx];
          z.lanterns.push({ x: lx + 0.5, y: ly + 0.5, name: names[i] });
          z.objects.push({ type: 'lantern', x: lx + 0.5, y: ly + 0.5, idx: z.lanterns.length - 1, name: names[i] });
        }
      }
      return z;
    }

    // -- fallen_monastery (dungeon, mlvl 6-9, off crypt) ----------------------
    function genFallenMonastery(seed) {
      return genAct1Dungeon('fallen_monastery', 'Fallen Monastery', seed, {
        size: 92, rooms: 16, dark: 0.72, theme: 'crypt', lo: 6, hi: 9, grow: 1.3, corr: 3,
        tablePrefer: ['PACKS_CRYPT', 'PACKS_MID'],
        up:   { to: 'crypt',         name: 'Back to the Hollow Crypt' },
        down: { to: 'bogwitch_shack',name: "Out to the Bog-Witch's Shack" },
        lantern: 'Monastery Threshold',
        extraLanterns: ['The Half-Sky Nave', 'The Counting Wall']
      });
    }
    // -- wolf_den_chapel (dungeon, mlvl 4-7, off sighing_ridge) ---------------
    function genWolfDen(seed) {
      return genAct1Dungeon('wolf_den_chapel', 'The Gnawed Chapel', seed, {
        size: 80, rooms: 12, dark: 0.85, theme: 'crypt', lo: 4, hi: 7, grow: 1.3, style: 'round',
        tablePrefer: ['PACKS_MID', 'PACKS_LOW'],
        up: { to: 'sighing_ridge', name: 'Up to the Sighing Ridge' },
        lantern: 'Chapel Threshold',
        extraLanterns: ['The Broken Pew', 'The Old Kill-Floor']
      });
    }
    // -- plague_hospice (dungeon, mlvl 8-11, off cata1): long wards with rows of posts --
    function genPlagueHospice(seed) {
      return genAct1Dungeon('plague_hospice', 'Plague Hospice', seed, {
        size: 92, rooms: 18, dark: 0.82, theme: 'crypt', lo: 8, hi: 11, grow: 1.3, style: 'ward',
        tablePrefer: ['PACKS_CRYPT', 'PACKS_MID'],
        up: { to: 'cata1', name: 'Back to the Bone Catacombs' },
        lantern: 'Hospice Threshold',
        extraLanterns: ['The Row of Cots', "The Sister's Alcove"]
      });
    }
    // -- well_shaft (dungeon, mlvl 9-12, off drowned_village): round cisterns --
    function genWellShaft(seed) {
      return genAct1Dungeon('well_shaft', 'The Well-Shaft', seed, {
        size: 78, rooms: 12, dark: 0.9, theme: 'crypt', lo: 9, hi: 12, grow: 1.35, style: 'round',
        tablePrefer: ['PACKS_FEN', 'PACKS_HIGH'],
        up: { to: 'drowned_village', name: 'Up to the Drowned Village' },
        lantern: 'Well-Head Threshold',
        extraLanterns: ['The First Rung', 'The Coiling Deep']
      });
    }
    // -- smugglers_hold (dungeon, mlvl 5-8, off cata2) ------------------------
    function genSmugglersHold(seed) {
      return genAct1Dungeon('smugglers_hold', "Smugglers' Hold", seed, {
        size: 82, rooms: 14, dark: 0.78, theme: 'barrow', lo: 5, hi: 8, grow: 1.3,
        tablePrefer: ['PACKS_MID', 'PACKS_CRYPT'],
        up: { to: 'cata2', name: 'Back up to the Bone Catacombs II' },
        lantern: 'Smugglers Threshold',
        extraLanterns: ["The Ledger's Bay", 'The Salt Cellar']
      });
    }

    // -- dens: outdoor clearings with the structure as the landmark in the middle ------------------------------
    // spec: theme, lo, hi, table, build(z, S) -> places the structure around S.N.mid, back portals
    function genClearing(id, name, seed, o) {
      return openZone(id, name, seed, Object.assign({
        W: 104, H: 104, dark: 0.42, rim: 5,
        nodes: S => {
          const { W, H, R } = S;
          return { entry: { x: W / 2 + R(-10, 10), y: H - 12, r: 5 }, mid: { x: W / 2 + R(-4, 4), y: H / 2 - 4 + R(-4, 4), r: 11, floor: o.floor == null ? T.GRASS : o.floor }, back: { x: W / 2 + R(-16, 16), y: 14, r: 4 } };
        },
        grove: {
          scale: 11, cut: 0.5, dens: 0.55, lone: 0.006, rock: 0.004, dirt: 0.7,
          // the wood closes in at the rim and opens into a meadow around the landmark
          densAt: (x, y, S, g) => { const d = Math.hypot(x - S.W / 2, y - S.H / 2) / (S.W / 2); if (d > 0.84) return g > 0.44 ? 0.48 : 0.1; if (d > 0.5) return g > 0.6 ? 0.4 : 0; return g > 0.72 ? 0.3 : 0; }
        },
        roads: S => [{ a: 'entry', b: 'mid', r: 1, bend: 0.25 }].concat(o.back ? [{ a: 'mid', b: 'back', r: 1, bend: 0.25 }] : []),
        lanterns: [{ at: 'entry', name: o.lantern, dx: 2, dy: -1 }],
        portals: [{ at: 'entry', to: o.up.to, name: o.up.name, spr: 'gate', dy: 2 }].concat(o.back ? [{ at: 'back', to: o.back.to, name: o.back.name, spr: o.back.spr || 'stairs' }] : []),
        after: (z, S) => {
          // the landmark's own guard and the prize inside it
          const m = S.N.mid, table = OP().scaleTable(o.table, 1.2);
          for (const c of (S.chestSpots || [])) z.objects.push({ type: 'chest', x: c.x, y: c.y, open: false, ilvl: o.hi + 1 });
          const g = OP().nearestOpen(z, m.x, m.y + 7, 5); placePack(z, g.x, g.y, o.hi, table, id.slice(0, 3) + 'g', S.rng);
        },
        packs: { table: o.table, count: o.packs || 6, spacing: 14, sizeK: 1.15, minStart: 14, lo: o.lo, hi: o.hi },
        chests: 1, shrines: 1
      }, o.spec || {}));
    }
    // -- bogwitch_shack (den, mlvl 7-10, off sunken_bog; the fallen monastery also comes up here) ------------
    function genBogwitchShack(seed) {
      return genClearing('bogwitch_shack', "Bog-Witch's Shack", seed, {
        theme: 'fen', lo: 7, hi: 10, table: tbl(['PACKS_FEN', 'PACKS_MID']), lantern: 'Shack Doorstone', floor: T.MUD,
        up: { to: 'sunken_bog', name: 'Back to the Sunken Bog' }, back: { to: 'fallen_monastery', name: 'Down to the Fallen Monastery', spr: 'stairs' },
        spec: {
          theme: 'fen', fill: T.SHALLOW,
          shape: (x, y, S) => { const w = fbm(S.nW, x / 12, y / 12); return w < 0.3 ? T.WATER : w < 0.37 ? T.SHALLOW : null; },
          post: (z, S) => {
            const m = S.N.mid, x0 = Math.floor(m.x) - 4, y0 = Math.floor(m.y) - 3;
            hut(z, x0, y0, 9, 7, 2, S.rng, 0.06);
            z.set(x0 + 4, y0 + 2, T.PILLAR);   // the witch's cauldron-post
            for (const [dx, dy] of [[-3, 5], [11, 1], [10, 7], [-2, -2]]) if (NT(z, x0 + dx, y0 + dy) !== T.CLIFF) z.set(x0 + dx, y0 + dy, T.PILLAR);   // bone-hung stakes
            S.chestSpots = [{ x: x0 + 2.5, y: y0 + 3.5 }, { x: x0 + 6.5, y: y0 + 3.5 }];
          }
        }
      });
    }
    // -- tree_hollow (den, mlvl 5-7, off pilgrim_road): one vast hollow tree in an old-growth glade ----------
    function genTreeHollow(seed) {
      return genClearing('tree_hollow', 'The Tree-Hollow', seed, {
        theme: 'hollow_wood', lo: 5, hi: 7, table: tbl(['PACKS_MID', 'PACKS_HIGH']), lantern: 'Hollow Knot', floor: T.GRASS,
        up: { to: 'pilgrim_road', name: 'Back to the Pilgrim Road' },
        spec: {
          theme: 'hollow_wood',
          post: (z, S) => {
            const m = S.N.mid, cx = Math.floor(m.x), cy = Math.floor(m.y);
            for (let y = cy - 7; y <= cy + 7; y++) for (let x = cx - 7; x <= cx + 7; x++) {
              const d = Math.hypot(x - cx, y - cy);
              if (d <= 4.2) z.set(x, y, T.DIRT);
              else if (d <= 6.4) { const opening = y > cy + 3 && Math.abs(x - cx) <= 1; z.set(x, y, opening ? T.DIRT : T.TREE); }
            }
            S.chestSpots = [{ x: cx - 1.5, y: cy - 1.5 }, { x: cx + 1.5, y: cy - 1.5 }];
          }
        }
      });
    }
    // -- hunter_cache (den, mlvl 3-5, off fern_gully): a stone cache in a heath clearing, snare-walls about ---
    function genHunterCache(seed) {
      return genClearing('hunter_cache', "Hunter's Cache", seed, {
        theme: 'moor', lo: 3, hi: 5, table: tbl(['PACKS_LOW', 'PACKS_MID']), lantern: 'Cache Doorstone', floor: T.DIRT,
        up: { to: 'fern_gully', name: 'Back to the Fern Gully' },
        spec: {
          theme: 'moor',
          post: (z, S) => {
            const m = S.N.mid, x0 = Math.floor(m.x) - 3, y0 = Math.floor(m.y) - 3;
            hut(z, x0, y0, 7, 6, 2, S.rng, 0.05);
            // snare-walls: short palisade runs on the approaches, never closing a way
            for (const [dx, dy, len, vert] of [[-9, -6, 6, 1], [11, -4, 5, 1], [-6, 9, 6, 0], [6, -9, 5, 0]]) for (let k = 0; k < len; k++) { const x = x0 + dx + (vert ? 0 : k), y = y0 + dy + (vert ? k : 0); if (NT(z, x, y) !== T.CLIFF) z.set(x, y, T.PALISADE); }
            for (const [dx, dy] of [[-4, 2], [-4, 4], [10, 3], [10, 5]]) z.set(x0 + dx, y0 + dy, T.PILLAR);   // drying racks
            S.chestSpots = [{ x: x0 + 2.5, y: y0 + 2.5 }, { x: x0 + 4.5, y: y0 + 2.5 }, { x: x0 + 3.5, y: y0 + 3.5 }];
          }
        }
      });
    }

    // -- fallen_watchtower (mlvl 6-8, up from the Old Barrow): a terraced tor, the leaning tower on its crown -
    function genFallenWatchtower(seed) {
      return openZone('fallen_watchtower', 'Fallen Watchtower', seed, {
        W: 124, H: 124, theme: 'moor', dark: 0.4, rim: 5,
        nodes: S => {
          const { W, H, R } = S, c = { x: W * 0.52 + R(-4, 4), y: H * 0.42 + R(-4, 4) };
          S.gaps = [0, 1].map(() => [0, 1, 2].map(k => S.rng() * 1.2 + k * 2.09));
          return { entry: { x: W / 2 + R(-12, 12), y: H - 12, r: 5 }, mid: Object.assign({ r: 9, floor: T.DIRT }, c), m0: { x: c.x + R(-26, -18), y: c.y + R(14, 24), r: 4 } };
        },
        shape: (x, y, S) => {
          const c = S.N.mid, d = Math.hypot(x - c.x, y - c.y) + fbm(S.nW, x / 8, y / 8) * 6 - 3, a = Math.atan2(y - c.y, x - c.x) + Math.PI;
          for (const [ri, rr] of [[0, 18], [1, 34]]) if (Math.abs(d - rr) < 1.3) { if (!S.gaps[ri].some(g => Math.abs(((a - g + 9.42) % 6.283) - 3.14) < (ri ? 0.16 : 0.28))) return T.CLIFF; }
          return null;
        },
        grove: { scale: 14, cut: 0.6, dens: 0.45, lone: 0.004, rock: 0.006, dirt: 0.68 },
        roads: S => [{ a: 'entry', b: 'm0', r: 1, bend: 0.2 }],
        post: (z, S) => {
          const c = S.N.mid, cx = Math.floor(c.x), cy = Math.floor(c.y), fall = S.rng() * 6.28;
          // the tower: a ring of wall, the side it leaned toward broken open and strewn downhill
          for (let y = cy - 6; y <= cy + 6; y++) for (let x = cx - 6; x <= cx + 6; x++) {
            const d = Math.hypot(x - cx, y - cy), a = Math.atan2(y - cy, x - cx), open = Math.abs(((a - fall + 9.42) % 6.283) - 3.14) < 0.7;
            if (d < 4.3) z.set(x, y, T.FLAGS); else if (d < 5.4) z.set(x, y, open ? T.FLAGS : T.RUIN);
          }
          for (let k = 0; k < 7; k++) { const r = 7 + k * 1.3, x = cx + Math.cos(fall) * r + (S.rng() - 0.5) * 3, y = cy + Math.sin(fall) * r + (S.rng() - 0.5) * 3; if (NT(z, x, y) !== T.CLIFF) z.set(Math.floor(x), Math.floor(y), T.ROCK); }
          markSite(z, S.N.m0, S.rng);
          S.fall = fall;
        },
        lanterns: [{ at: 'entry', name: 'Tower Threshold', dx: 2 }, { at: 'mid', name: 'The Buried Bell', dy: 0 }],
        portals: [{ at: 'entry', to: 'barrow', name: 'Back to the Old Barrow', spr: 'cave', dy: 2 }],
        after: (z, S) => {
          const c = S.N.mid, t = OP().scaleTable(tbl(['PACKS_MID', 'PACKS_CRYPT']), 1.2);
          z.objects.push({ type: 'chest', x: Math.floor(c.x) - 1.5, y: Math.floor(c.y) - 1.5, open: false, ilvl: 9 }, { type: 'chest', x: Math.floor(c.x) + 1.5, y: Math.floor(c.y) - 1.5, open: false, ilvl: 9 });
          const g = OP().nearestOpen(z, c.x, c.y + 2, 4); placePack(z, g.x, g.y, 9, t, 'lord', S.rng);
        },
        packs: { table: tbl(['PACKS_MID', 'PACKS_CRYPT']), count: 9, spacing: 14, sizeK: 1.2, minStart: 16, lo: 6, hi: 8 },
        chests: 3, shrines: 2
      });
    }

    // -- broken_bridge (mlvl 9-12, off the Root Deep): a river, a snapped bridge, fords up and down, a camp --
    function genBrokenBridge(seed) {
      let ph = 0;
      const rx = (y, W) => W * 0.52 + 10 * Math.sin(y / 25 + ph);
      return openZone('broken_bridge', 'The Broken Bridge', seed, {
        W: 152, H: 132, theme: 'moor', dark: 0.42, rim: 5,
        nodes: S => {
          const { W, H, R } = S; ph = S.rng() * 6.28; S.by = Math.round(H * 0.46);
          return {
            entry: { x: 12, y: S.by + R(-6, 6), r: 5 }, mid: { x: rx(S.by, W) - 16, y: S.by, r: 5, floor: T.DIRT },
            fordN: { x: rx(H * 0.16, W), y: H * 0.16, r: 0 }, fordS: { x: rx(H * 0.84, W), y: H * 0.84, r: 0 },
            camp: { x: W - 30 + R(-4, 4), y: S.by + R(-8, 8), r: 9, floor: T.DIRT }
          };
        },
        shape: (x, y, S) => { const w = 6 + fbm(S.nW, x / 9, y / 9) * 4; if (Math.abs(x - rx(y, S.W)) < w) return T.WATER; return null; },
        grove: { scale: 15, cut: 0.55, dens: 0.5, lone: 0.005, rock: 0.004, dirt: 0.7 },
        roads: S => [
          { a: 'entry', b: 'mid', r: 1.2 },
          { a: 'mid', b: 'fordN', r: 1.2, ford: T.SHALLOW }, { a: 'mid', b: 'fordS', r: 1.2, ford: T.SHALLOW },
          { a: 'fordN', b: 'camp', r: 1.2, ford: T.SHALLOW }, { a: 'fordS', b: 'camp', r: 1.2, ford: T.SHALLOW },
          { pts: [{ x: S.N.fordN.x - 14, y: S.N.fordN.y }, { x: S.N.fordN.x + 14, y: S.N.fordN.y }], r: 2.2, ford: T.SHALLOW, verge: 3 },
          { pts: [{ x: S.N.fordS.x - 14, y: S.N.fordS.y }, { x: S.N.fordS.x + 14, y: S.N.fordS.y }], r: 2.2, ford: T.SHALLOW, verge: 3 }
        ],
        post: (z, S) => {
          // the bridge: a flagstone deck on piers, the middle span fallen into the river
          const y0 = S.by, x0 = Math.floor(rx(y0, S.W)) - 16, x1 = Math.floor(rx(y0, S.W)) + 16, gap0 = Math.floor(rx(y0, S.W)) - 2, gap1 = gap0 + 4;
          for (let x = x0; x <= x1; x++) for (let y = y0 - 2; y <= y0 + 2; y++) { if (x >= gap0 && x <= gap1) { z.set(x, y, T.WATER); continue; } z.set(x, y, (y === y0 - 2 || y === y0 + 2) && (x - x0) % 4 === 0 ? T.PILLAR : T.FLAGS); }
          for (const x of [gap0 - 1, gap1 + 1]) { z.set(x, y0 - 1, T.ROCK); }
          // the camp: stakes and lean-tos round a fire-ring
          const c = S.N.camp; for (let k = 0; k < 10; k++) { const a = k / 10 * 6.28; if (k % 3) z.set(Math.floor(c.x + Math.cos(a) * 8), Math.floor(c.y + Math.sin(a) * 8), T.PALISADE); }
          hut(z, Math.floor(c.x) + 2, Math.floor(c.y) - 6, 6, 5, 3, S.rng, 0.3);
        },
        lanterns: [{ at: 'entry', name: 'Bridge Threshold', dx: 2 }, { at: 'camp', name: 'The River Camp', dx: -3, dy: 0 }],
        portals: [{ at: 'entry', to: 'root_deep', name: 'Back to the Root Deep', spr: 'gate', dx: -2 }],
        after: (z, S) => {
          const c = S.N.camp, t = OP().scaleTable(tbl(['PACKS_HIGH', 'PACKS_MID']), 1.2);
          z.objects.push({ type: 'chest', x: Math.floor(c.x) + 0.5, y: Math.floor(c.y) + 2.5, open: false, ilvl: 13 }, { type: 'chest', x: Math.floor(c.x) - 1.5, y: Math.floor(c.y) + 2.5, open: false, ilvl: 13 });
          const g = OP().nearestOpen(z, c.x - 2, c.y - 2, 4); placePack(z, g.x, g.y, 13, t, 'lord', S.rng);
        },
        packs: { table: tbl(['PACKS_HIGH', 'PACKS_MID']), count: 11, spacing: 14, sizeK: 1.2, minStart: 16, lo: 9, hi: 12 },
        chests: 3, shrines: 2
      });
    }

    // =====================================================================
    // Registry
    // =====================================================================
    const REG = {
      sighing_ridge:    (s) => genSighingRidge(s * 61 + 7),
      ash_shore:        (s) => genAshShore(s * 67 + 11),
      burnt_heath:      (s) => genBurntHeath(s * 71 + 13),
      fern_gully:       (s) => genFernGully(s * 73 + 17),
      pilgrim_road:     (s) => genPilgrimRoad(s * 79 + 19),
      drowned_village:  (s) => genDrownedVillage(s * 83 + 23),
      sunken_bog:       (s) => genSunkenBog(s * 89 + 29),
      fallen_monastery: (s) => genFallenMonastery(s * 97 + 31),
      wolf_den_chapel:  (s) => genWolfDen(s * 101 + 37),
      plague_hospice:   (s) => genPlagueHospice(s * 103 + 41),
      well_shaft:       (s) => genWellShaft(s * 107 + 43),
      smugglers_hold:   (s) => genSmugglersHold(s * 109 + 47),
      bogwitch_shack:   (s) => genBogwitchShack(s * 113 + 53),
      tree_hollow:      (s) => genTreeHollow(s * 127 + 59),
      hunter_cache:     (s) => genHunterCache(s * 131 + 61),
      fallen_watchtower:(s) => genFallenWatchtower(s * 137 + 67),
      broken_bridge:    (s) => genBrokenBridge(s * 139 + 71)
    };

    // wrap each so dressZone is applied + G.__genZone is set (matches zz_act2 pattern)
    for (const zid in REG) {
      const _g = REG[zid];
      ZONE_GEN[zid] = function (seed) {
        const prev = (typeof G !== 'undefined' && G) ? G.__genZone : undefined;
        if (typeof G !== 'undefined' && G) G.__genZone = zid;
        try {
          const z = _g(seed);
          try { if (typeof dressZone === 'function') dressZone(z, seed); }
          catch (e) { if (typeof reportError === 'function') reportError(e); }
          return z;
        } finally { if (typeof G !== 'undefined' && G) G.__genZone = prev; }
      };
    }
    if (typeof ZONE_NAMES === 'object') {
      ZONE_NAMES.sighing_ridge     = 'Sighing Ridge';
      ZONE_NAMES.ash_shore         = 'Ash Shore';
      ZONE_NAMES.burnt_heath       = 'Burnt Heath';
      ZONE_NAMES.fern_gully        = 'Fern Gully';
      ZONE_NAMES.pilgrim_road      = 'Pilgrim Road';
      ZONE_NAMES.drowned_village   = 'Drowned Village';
      ZONE_NAMES.sunken_bog        = 'Sunken Bog';
      ZONE_NAMES.fallen_monastery  = 'Fallen Monastery';
      ZONE_NAMES.wolf_den_chapel   = 'The Gnawed Chapel';
      ZONE_NAMES.plague_hospice    = 'Plague Hospice';
      ZONE_NAMES.well_shaft        = 'The Well-Shaft';
      ZONE_NAMES.smugglers_hold    = "Smugglers' Hold";
      ZONE_NAMES.bogwitch_shack    = "Bog-Witch's Shack";
      ZONE_NAMES.tree_hollow       = 'The Tree-Hollow';
      ZONE_NAMES.hunter_cache      = "Hunter's Cache";
      ZONE_NAMES.fallen_watchtower = 'Fallen Watchtower';
      ZONE_NAMES.broken_bridge     = 'The Broken Bridge';
    }

    // ---- ZONE_MLVL_BUMP: no bump — each zone already places at its target band ---
    if (typeof window !== 'undefined') {
      window.__ACT1X_ZONE_MLVL_BUMP = window.__ACT1X_ZONE_MLVL_BUMP || {
        sighing_ridge: 0, ash_shore: 0, burnt_heath: 0, fern_gully: 0,
        pilgrim_road: 0, drowned_village: 0, sunken_bog: 0,
        fallen_monastery: 0, wolf_den_chapel: 0, plague_hospice: 0, well_shaft: 0, smugglers_hold: 0,
        bogwitch_shack: 0, tree_hollow: 0, hunter_cache: 0,
        fallen_watchtower: 0, broken_bridge: 0
      };
    }

    // ---- portal injections into the 8 existing Act I zones -----------------
    // Each existing zone gets exactly one new outgoing portal, spread across the map.
    // Rules recap: don't stack on top of an existing portal/lantern/altar/vendor.
    // (v0.52: every injector skips a zone that already has a way to the target, e.g. the reworked moor/fen
    //  generators in zz_openness.js place these portals as part of their layout)
    const hasWay = (z, target) => z.objects.some(o => o.type === 'portal' && o.to === target);
    function injectOpenPortal(z, target, name, spr, prefer) {
      if (hasWay(z, target)) return true;
      const inSet = new Set([T.GRASS, T.DIRT, T.ROAD]);
      let best = null, bestScore = -Infinity;
      const rng = mulberry32(881 + z.w * 11 + target.length * 17);
      for (let tries = 0; tries < 1500; tries++) {
        const x = Math.floor(prefer.x0 + rng() * Math.max(1, (prefer.x1 - prefer.x0)));
        const y = Math.floor(prefer.y0 + rng() * Math.max(1, (prefer.y1 - prefer.y0)));
        if (x < 3 || y < 3 || x >= z.w - 3 || y >= z.h - 3) continue;
        if (!inSet.has(z.get(x, y))) continue;
        if (z.solidAt(x, y)) continue;
        if (z.objects.some(o => (o.type === 'portal' || o.type === 'lantern' || o.type === 'vendor' || o.type === 'altar') && Math.hypot(o.x - (x + 0.5), o.y - (y + 0.5)) < 5)) continue;
        const cx = (prefer.x0 + prefer.x1) / 2, cy = (prefer.y0 + prefer.y1) / 2;
        const score = -Math.hypot(x - cx, y - cy) + rng() * 3;
        if (score > bestScore) { bestScore = score; best = { x, y }; }
      }
      if (!best) return false;
      z.objects.push({ type: 'portal', x: best.x + 0.5, y: best.y + 0.5, to: target, name, spr });
      z.arrive = z.arrive || {};
      z.arrive[target] = { x: best.x + 0.5, y: best.y + 1.5 };
      return true;
    }
    function injectDungeonPortal(z, target, name, spr) {
      if (hasWay(z, target)) return true;
      const inSet = new Set([T.FLOOR]);
      let best = null, bestScore = -Infinity;
      const rng = mulberry32(919 + z.w * 13 + target.length * 19);
      for (let tries = 0; tries < 1500; tries++) {
        const x = 4 + Math.floor(rng() * (z.w - 8));
        const y = 4 + Math.floor(rng() * (z.h - 8));
        if (!inSet.has(z.get(x, y))) continue;
        if (z.solidAt(x, y)) continue;
        // v0.52: stand the stair in open floor (2 tiles clear all round) so its arrival point is never in a wall
        let open = true; for (let b = -2; b <= 2 && open; b++) for (let a = -2; a <= 2; a++) if (!z.walkTile(x + a, y + b)) { open = false; break; }
        if (!open) continue;
        if (z.objects.some(o => (o.type === 'portal' || o.type === 'lantern' || o.type === 'altar' || o.type === 'vendor') && Math.hypot(o.x - (x + 0.5), o.y - (y + 0.5)) < 4)) continue;
        if (z.inBoss && z.inBoss(x, y)) continue;
        const dS = Math.hypot(x - z.start.x, y - z.start.y);
        const score = dS + rng() * 3;
        if (score > bestScore) { bestScore = score; best = { x, y }; }
      }
      if (!best) return false;
      z.objects.push({ type: 'portal', x: best.x + 0.5, y: best.y + 0.5, to: target, name, spr });
      z.arrive = z.arrive || {};
      z.arrive[target] = { x: best.x + 0.5, y: best.y + 1.2 };
      return true;
    }

    function wrapInject(zoneId, fn) {
      if (!ZONE_GEN[zoneId]) return;
      const _prev = ZONE_GEN[zoneId];
      ZONE_GEN[zoneId] = function (s) {
        const z = _prev(s);
        try { fn(z); } catch (e) { if (typeof reportError === 'function') reportError(e); }
        return z;
      };
    }

    // moor -> sighing_ridge (top-left area away from cave/east/south exits)
    wrapInject('moor', z => injectOpenPortal(z, 'sighing_ridge', 'North to the Sighing Ridge', 'gate',
      { x0: 30, y0: 20, x1: 55, y1: 45 }));
    // crypt -> fallen_monastery
    wrapInject('crypt', z => injectDungeonPortal(z, 'fallen_monastery', 'Through to the Fallen Monastery', 'stairs'));
    // barrow -> fallen_watchtower
    wrapInject('barrow', z => injectDungeonPortal(z, 'fallen_watchtower', 'Up to the Fallen Watchtower', 'stairs'));
    // fen -> drowned_village (south-east quarter, away from existing chapel/cata1/moor portals)
    wrapInject('fen', z => injectOpenPortal(z, 'drowned_village', 'On to the Drowned Village', 'gate',
      { x0: Math.max(40, z.w - 60), y0: Math.max(40, z.h - 60), x1: z.w - 12, y1: z.h - 12 }));
    // cata1 -> plague_hospice
    wrapInject('cata1', z => injectDungeonPortal(z, 'plague_hospice', 'Aside to the Plague Hospice', 'stairs'));
    // cata2 -> smugglers_hold
    wrapInject('cata2', z => injectDungeonPortal(z, 'smugglers_hold', "Down to the Smugglers' Hold", 'stairs'));
    // hollow_wood -> pilgrim_road and root_deep -> broken_bridge: these used to be injected here, but this file
    // loads before zz_world_expand.js registers those zones, so the portals were never placed (Pilgrim Road,
    // Tree-Hollow and Broken Bridge were unreachable). The reworked generators in zz_world_expand.js now place
    // them as part of their layouts.

    // ---- expose for tests ---------------------------------------------------
    if (typeof window !== 'undefined') {
      window.__act1x = {
        zones: Object.keys(REG),
        bands: {
          sighing_ridge:    [2, 4],
          ash_shore:        [3, 5],
          burnt_heath:      [4, 6],
          fern_gully:       [3, 6],
          pilgrim_road:     [5, 8],
          drowned_village:  [6, 9],
          sunken_bog:       [8, 11],
          fallen_monastery: [6, 9],
          wolf_den_chapel:  [4, 7],
          plague_hospice:   [8, 11],
          well_shaft:       [9, 12],
          smugglers_hold:   [5, 8],
          bogwitch_shack:   [7, 10],
          tree_hollow:      [5, 7],
          hunter_cache:     [3, 5],
          fallen_watchtower:[6, 8],
          broken_bridge:    [9, 12]
        },
        gen: (zid, seed) => ZONE_GEN[zid] ? ZONE_GEN[zid](seed) : null,
        enterFn: (zid) => (typeof enterZone === 'function') ? enterZone(zid) : null
      };
    }
  }
}
