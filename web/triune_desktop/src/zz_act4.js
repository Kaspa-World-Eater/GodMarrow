// Act IV: The Frigid Heights of An-Vhar (mlvl 30-34). Yh'Anuul's breath, frozen on the roof of the world.
// A mountain pass above the clouds: black basalt under glass ice, broad ledges and plateaus that end at the drop,
// chime-bell winds, the Sky-Climber's Monastery clinging to its cliff, Lantern-Spires of hollow brass whose pale
// flame warms without fuel.
//
//   a4_town        Bellrest Hearth                    hub on a broad ledge (no monsters)
//   a4_foothills   The Chime-Foothills           30-31 open snowfields, outcrops, the first bells
//   a4_glasspass   The Glass Pass                30-31 a wide pass of glass-ice between cliff walls
//   a4_flags       The Prayer-Flag Terraces      31-32 broad terraces stepped up the mountain, humming flags
//   a4_spires      Field of Lantern-Spires       31-32 open plateau of brass spires; shelter from the wind
//   a4_cloudshelf  The Cloud-Shelf               32-33 plateaus above the clouds, chasms, stone bridges
//   a4_windscour   The Wind-Scoured Ridges       32-33 long ridge-walls, wind-cut basalt
//   a4_stair       Stair of the Sky-Climbers     33-34 the great terraced stair to the monastery
//   a4_breathcaves The Breath-Caves              31-32 dungeon (off the Glass Pass)
//   a4_bellhollow  The Bell-Hollow               32-33 dungeon (off the Cloud-Shelf)
//   a4_monastery   Sky-Climber's Monastery       33-34 dungeon (off the Stair), up to the summit
//   a4_lair        Summit of the Unrung Bell     34    open summit, z.bossSpot for the act boss
//
// Chime-winds: every 10-16 s a gust comes down off the heights for ~2.4 s and drains poise (never below 35% of
// the pool, so it never reaches the heavy band and never locks you out). Standing within a few paces of a lantern
// or a Lantern-Spire's pale flame shelters you. Chime-Golems stand dormant until the harmony breaks: they wake
// when struck, when you brush against them, or when something dies near them.
// Built on the shared kit from zz_act3.js (window.__A34).
{
  const A34 = (typeof window !== 'undefined') ? window.__A34 : null;
  if (A34 && typeof ZONE_GEN === 'object' && typeof T !== 'undefined' && typeof Zone === 'function') {
    const { K, stamp, blob, rect, openNear, addLantern, addPortal, genOutdoor, genHalls, reg, report } = A34;

    // =============================================================================== Act IV bestiary
    Object.assign(MON, {
      a4_animamonk:     { name: 'Anima-Bound Monk',  spr: 'warden', tint: '#d8d0b8', hp: 52, dmg: [8, 14],  spd: 2.3, r: .32, xp: 38, ai: 'duelist', range: 1.05, wind: .42, rec: .55, armor: 30, poiseK: .75 },
      a4_chimegolem:    { name: 'Chime-Golem',       spr: 'warden', tint: '#b08a4a', hp: 90, dmg: [12, 18], spd: 1.35, r: .5, xp: 60, ai: 'charger', range: 1.25, wind: .75, rec: 1.0, armor: 45, poiseK: 1.2, chime: 1 },
      a4_rimewraith:    { name: 'Rime-Wraith',       spr: 'gasp',   tint: '#bcd8ec', hp: 24, dmg: [7, 12],  spd: 1.6, r: .28, xp: 30, ai: 'ghost',   wind: .85, poiseK: .3 },
      a4_flagmoth:      { name: 'Prayer-Flag Wick',  spr: 'moth',   tint: '#e8e0d0', hp: 18, dmg: [5, 9],   spd: 2.9, r: .3,  xp: 22, ai: 'flyer',   wind: .42, poiseK: .3 },
      a4_tetherpilgrim: { name: 'Tethered Pilgrim',  spr: 'hand',   tint: '#8a9aa8', hp: 26, dmg: [5, 9],   spd: 3.3, r: .28, xp: 24, ai: 'flank',   range: .9, wind: .26, rec: .45, poiseK: .4 },
      a4_basaltborer:   { name: 'Basalt Borer',      spr: 'worm',   tint: '#2a2a32', hp: 36, dmg: [8, 13],  spd: 3.1, r: .36, xp: 34, ai: 'burrow',  range: 1.4, wind: .35, poiseK: .6 }
    });
    function packs4() {
      const CH = K('chorister', 'caster'), BE = K('bell', 'a4_chimegolem'), MA = K('marrow', 'a4_animamonk');
      return {
        foot:   [['a4_tetherpilgrim', 3, 4], ['a4_flagmoth', 3, 3], ['a4_animamonk', 1, 2, 'a4_tetherpilgrim', 2, 2], ['a4_basaltborer', 2, 2], ['a4_rimewraith', 2, 2, 'a4_tetherpilgrim', 1, 2]],
        glass:  [['a4_rimewraith', 2, 3], ['a4_basaltborer', 2, 3], ['a4_animamonk', 2, 2], ['a4_flagmoth', 3, 4], ['a4_tetherpilgrim', 3, 3, 'a4_rimewraith', 1, 1]],
        flags:  [['a4_animamonk', 2, 3], ['a4_flagmoth', 3, 4], ['a4_chimegolem', 1, 1, 'a4_animamonk', 2, 2], ['a4_tetherpilgrim', 3, 4]],
        spires: [['a4_chimegolem', 1, 2], ['a4_animamonk', 2, 2, 'a4_rimewraith', 1, 2], ['a4_flagmoth', 3, 3], ['a4_basaltborer', 2, 3], ['a4_chimegolem', 1, 1, 'a4_tetherpilgrim', 2, 3]],
        cloud:  [['a4_flagmoth', 4, 4], ['a4_rimewraith', 2, 3], ['a4_animamonk', 2, 3], ['a4_basaltborer', 2, 2], ['a4_chimegolem', 1, 1, 'a4_rimewraith', 2, 2]],
        wind:   [['a4_tetherpilgrim', 4, 4], ['a4_rimewraith', 3, 3], ['a4_basaltborer', 3, 3], ['a4_animamonk', 2, 2, 'a4_flagmoth', 2, 2], ['a4_chimegolem', 1, 2]],
        stair:  [['a4_animamonk', 3, 3], ['a4_chimegolem', 1, 2, 'a4_animamonk', 1, 1], ['a4_flagmoth', 3, 3, 'a4_rimewraith', 1, 1], ['a4_tetherpilgrim', 3, 3, 'a4_animamonk', 1, 1]],
        caves:  [['a4_basaltborer', 3, 3], ['a4_rimewraith', 3, 3], [CH, 2, 3], ['a4_tetherpilgrim', 3, 4]],
        bell:   [['a4_chimegolem', 2, 2], ['a4_chimegolem', 1, 1, 'a4_animamonk', 2, 2], [BE, 1, 1, 'a4_animamonk', 2, 2], ['a4_rimewraith', 3, 3]],
        monastery: [['a4_animamonk', 3, 4], ['a4_chimegolem', 1, 1, 'a4_animamonk', 2, 3], [MA, 2, 2, 'a4_animamonk', 1, 1], ['a4_rimewraith', 2, 2, 'a4_animamonk', 2, 2], ['a4_chimegolem', 2, 2]],
        lair:   [['a4_animamonk', 3, 3], ['a4_chimegolem', 1, 1, 'a4_animamonk', 2, 2]]
      };
    }

    // =============================================================================== Act IV terrain
    const AV = 'anvhar';
    const cliffBorder = { tile: T.CLIFF, min: 3, var: 6 };
    const bridge4 = c => (c === T.CLIFF ? T.FLAGS : c === T.WATER ? T.SHALLOW : T.GRASS);
    const nearTile = (z, x, y, t, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (z.get(x + i, y + j) === t) return true; return false; };
    function scatterDecor(z, rng, kind, n, ok) {
      for (let i = 0, tries = 0; i < n && tries < n * 60; tries++) {
        const x = 6 + Math.floor(rng() * (z.w - 12)), y = 6 + Math.floor(rng() * (z.h - 12));
        if (!ok(z.get(x, y), x, y)) continue;
        z.decor.push({ kind, x: x + 0.5, y: y + 0.5, v: Math.floor(rng() * 4) }); i++;
      }
    }
    // a Lantern-Spire: a 2x2 brass tower; its pale flame shelters from the chime-wind
    function spire(z, x, y) {
      for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) z.set(x + i, y + j, T.PILLAR);
      z.decor.push({ kind: 'lantern_spire', x: x + 1, y: y + 1 });
      (z.shelters || (z.shelters = [])).push({ x: x + 1, y: y + 1, r: 4.5 });
    }
    function spireField(z, rng, n, minGap) {
      const put = [];
      for (let i = 0, tries = 0; i < n && tries < n * 80; tries++) {
        const x = 10 + Math.floor(rng() * (z.w - 22)), y = 10 + Math.floor(rng() * (z.h - 22));
        let ok = true;
        for (let j = -2; j <= 3 && ok; j++) for (let k = -2; k <= 3; k++) { const t = z.get(x + k, y + j); if (t !== T.GRASS && t !== T.DIRT) { ok = false; break; } }
        if (!ok || put.some(([px, py]) => Math.hypot(px - x, py - y) < minGap)) continue;
        spire(z, x, y); put.push([x, y]); i++;
      }
    }
    // horizontal cliff bands with ramps: the path crossings stay open as stairs, plus a few wide gaps
    function terraces(z, rng, ys, thick, gaps) {
      for (const fy of ys) {
        const y0 = Math.round(fy * z.h), ph = rng() * 6.28, open = [];
        for (let g = 0; g < gaps; g++) { const gx = 12 + Math.floor(rng() * (z.w - 24)); open.push([gx, gx + 9 + Math.floor(rng() * 6)]); }
        for (let x = 3; x < z.w - 3; x++) {
          if (open.some(([a, b]) => x >= a && x <= b)) continue;
          const yy = y0 + Math.round(Math.sin(x / 11 + ph) * 3);
          for (let t = 0; t < thick; t++) { const c = z.get(x, yy + t); if (c === T.ROAD || c === T.FLAGS || c === T.PILLAR) continue; z.set(x, yy + t, T.CLIFF); }
        }
      }
    }
    function prayerFlags(z, rng, n) {
      for (let i = 0, tries = 0; i < n && tries < n * 60; tries++) {
        const x = 8 + Math.floor(rng() * (z.w - 20)), y = 8 + Math.floor(rng() * (z.h - 16)), L = 5 + Math.floor(rng() * 4);
        let ok = true; for (let k = 0; k <= L && ok; k++) { const t = z.get(x + k, y); if (t !== T.GRASS && t !== T.DIRT) ok = false; }
        if (!ok) continue;
        z.set(x, y, T.PILLAR); z.set(x + L, y, T.PILLAR);
        z.decor.push({ kind: 'prayer_flags', x: x + 0.5, y: y + 0.5, x2: x + L + 0.5, y2: y + 0.5 }); i++;
      }
    }
    const heightsDecor = (z, rng, extra) => {
      scatterDecor(z, rng, 'frozen_prayer_slip', 14, t => t === T.SHALLOW);
      scatterDecor(z, rng, 'chime_bell', 6, (t, x, y) => t === T.GRASS && nearTile(z, x, y, T.ROCK, 1));
      scatterDecor(z, rng, 'basalt_glass', 12, (t, x, y) => t === T.GRASS && nearTile(z, x, y, T.CLIFF, 1));
      if (extra) extra(z, rng);
    };
    const ICE = { tile: T.SHALLOW, s: 12, frac: 0.1 };

    const Z4 = {
      a4_foothills: s => genOutdoor({
        id: 'a4_foothills', name: 'The Chime-Foothills', W: 160, H: 150, theme: AV, act: 4, seed: s * 113 + 3, dark: 0.3, lo: 30, hi: 31,
        border: cliffBorder,
        layers: [{ tile: T.CLIFF, s: 16, frac: 0.07 }, { tile: T.ROCK, s: 3, frac: 0.03, speck: 0.7 }, { tile: T.TREE, s: 13, frac: 0.07, speck: 0.5 }, ICE, { tile: T.DIRT, s: 9, frac: 0.1 }],
        clearings: { n: 4, r: [10, 15], over: [T.TREE, T.ROCK, T.CLIFF] },
        sites: { entry: { at: [0.04, 0.62], r: 6, tile: T.DIRT, edge: 1 }, mid: { at: [0.46, 0.5], r: 8, tile: T.FLAGS }, cairn: { at: [0.3, 0.2], r: 6, tile: T.DIRT }, exit: { at: [0.96, 0.34], r: 6, tile: T.DIRT, edge: 1 } },
        paths: [['entry', 'mid'], ['mid', 'exit'], ['mid', 'cairn']], pathTile: T.ROAD, pathOverShallow: T.ROAD, bridgeTile: T.FLAGS,
        custom: (z, rng) => { spireField(z, rng, 4, 30); prayerFlags(z, rng, 5); },
        lanterns: [['entry', 'Foot of the Heights'], ['mid', 'The First Chime'], ['cairn', 'Cairn of Mantras']],
        portals: [{ site: 'entry', to: 'a4_town', name: 'Back to Bellrest Hearth', spr: 'gate' }, { site: 'exit', to: 'a4_glasspass', name: 'Up into the Glass Pass', spr: 'gate' }],
        fill: T.CLIFF, bridge: bridge4, ruins: 2, packs: () => packs4().foot, packPer: 470,
        decor: z => heightsDecor(z, mulberry32(s + 41))
      }),
      a4_glasspass: s => genOutdoor({
        id: 'a4_glasspass', name: 'The Glass Pass', W: 150, H: 150, theme: AV, act: 4, seed: s * 127 + 5, dark: 0.3, lo: 30, hi: 31,
        border: cliffBorder,
        layers: [{ tile: T.SHALLOW, s: 11, frac: 0.2 }, { tile: T.ROCK, s: 3, frac: 0.03, speck: 0.7 }, { tile: T.CLIFF, s: 14, frac: 0.05 }],
        sites: { entry: { at: [0.03, 0.5], r: 6, tile: T.DIRT, edge: 1 }, mid: { at: [0.5, 0.52], r: 9, tile: T.FLAGS }, caves: { at: [0.5, 0.17], r: 6, tile: T.DIRT }, exit: { at: [0.97, 0.48], r: 6, tile: T.DIRT, edge: 1 } },
        paths: [['entry', 'mid'], ['mid', 'exit'], ['mid', 'caves']], pathTile: T.ROAD, pathOverShallow: T.ROAD,
        custom: (z, rng, S) => {
          // the walls of the pass: basalt cliffs rise on both flanks, the pass between them wide open
          const n = makeNoise(rng);
          for (let x = 3; x < z.w - 3; x++) {
            const top = Math.round(z.h * (0.1 + 0.08 * n(x / 14, 3))), bot = Math.round(z.h * (0.9 - 0.08 * n(x / 14, 9)));
            for (let y = 3; y < top; y++) if (Math.abs(x - S.caves.x) > 5 || y < S.caves.y - 6) z.set(x, y, T.CLIFF);
            for (let y = bot; y < z.h - 3; y++) z.set(x, y, T.CLIFF);
          }
          // two rifts cross the pass north to south; the road bridges them
          for (const fx of [0.3, 0.72]) {
            const x0 = Math.round(fx * z.w), ph = rng() * 6.28;
            for (let y = 3; y < z.h - 3; y++) { const xx = x0 + Math.round(Math.sin(y / 9 + ph) * 3); for (let t = 0; t < 3; t++) { const c = z.get(xx + t, y); if (c !== T.ROAD) z.set(xx + t, y, T.CLIFF); } }
          }
          scatterDecor(z, rng, 'glass_ice_sheet', 10, t => t === T.SHALLOW);
        },
        lanterns: [['entry', 'Mouth of the Pass'], ['mid', 'The Glass Saddle']],
        portals: [{ site: 'entry', to: 'a4_foothills', name: 'Back down to the Chime-Foothills', spr: 'gate' }, { site: 'caves', to: 'a4_breathcaves', name: 'Into the Breath-Caves', spr: 'cave' }, { site: 'exit', to: 'a4_flags', name: 'On to the Prayer-Flag Terraces', spr: 'gate' }],
        fill: T.CLIFF, bridge: bridge4, bridgeR: 2.8, ruins: 1, packs: () => packs4().glass, packPer: 440,
        decor: z => heightsDecor(z, mulberry32(s + 43))
      }),
      a4_flags: s => genOutdoor({
        id: 'a4_flags', name: 'The Prayer-Flag Terraces', W: 150, H: 150, theme: AV, act: 4, seed: s * 131 + 7, dark: 0.3, lo: 31, hi: 32,
        border: cliffBorder,
        layers: [{ tile: T.ROCK, s: 3, frac: 0.025, speck: 0.7 }, ICE, { tile: T.DIRT, s: 8, frac: 0.12 }],
        sites: { entry: { at: [0.15, 0.95], r: 6, tile: T.DIRT, edge: 1 }, low: { at: [0.62, 0.72], r: 7, tile: T.FLAGS }, high: { at: [0.3, 0.32], r: 7, tile: T.FLAGS }, exit: { at: [0.86, 0.05], r: 6, tile: T.DIRT, edge: 1 } },
        paths: [['entry', 'low'], ['low', 'high'], ['high', 'exit']], pathTile: T.ROAD, pathOverShallow: T.ROAD,
        custom: (z, rng, S) => {
          terraces(z, rng, [0.2, 0.42, 0.62, 0.82], 2, 3);
          prayerFlags(z, rng, 16);
          for (const k of ['low', 'high']) { const c = S[k]; for (const [i, j] of [[-5, -3], [5, -3], [-5, 3], [5, 3]]) if (z.get(c.x + i, c.y + j) !== T.CLIFF) z.set(c.x + i, c.y + j, T.PILLAR); z.decor.push({ kind: 'monastery_shrine', x: c.x + 0.5, y: c.y + 0.5 }); }
        },
        lanterns: [['entry', 'Lowest Terrace'], ['low', 'Shrine of the Humming Silk'], ['high', 'The Ninth Terrace']],
        portals: [{ site: 'entry', to: 'a4_glasspass', name: 'Back to the Glass Pass', spr: 'gate' }, { site: 'exit', to: 'a4_spires', name: 'Up to the Field of Lantern-Spires', spr: 'gate' }],
        fill: T.CLIFF, bridge: c => (c === T.CLIFF ? T.ROAD : bridge4(c)), bridgeR: 2.8, ruins: 1, packs: () => packs4().flags, packPer: 440,
        decor: z => heightsDecor(z, mulberry32(s + 47))
      }),
      a4_spires: s => genOutdoor({
        id: 'a4_spires', name: 'Field of Lantern-Spires', W: 160, H: 160, theme: AV, act: 4, seed: s * 137 + 9, dark: 0.28, lo: 31, hi: 32,
        border: cliffBorder,
        layers: [{ tile: T.CLIFF, s: 17, frac: 0.08 }, ICE, { tile: T.ROCK, s: 3, frac: 0.02, speck: 0.7 }, { tile: T.DIRT, s: 9, frac: 0.1 }],
        clearings: { n: 3, r: [10, 14], over: [T.ROCK, T.CLIFF] },
        sites: { entry: { at: [0.04, 0.84], r: 6, tile: T.DIRT, edge: 1 }, mid: { at: [0.5, 0.5], r: 9, tile: T.FLAGS }, cold: { at: [0.22, 0.24], r: 6, tile: T.FLAGS }, exit: { at: [0.96, 0.15], r: 6, tile: T.DIRT, edge: 1 } },
        paths: [['entry', 'mid'], ['mid', 'exit'], ['mid', 'cold']], pathTile: T.ROAD, pathOverShallow: T.ROAD,
        custom: (z, rng) => { spireField(z, rng, 18, 17); },
        lanterns: [['entry', 'Edge of the Spire-Field'], ['mid', 'The Pale Flame'], ['cold', 'The Spire That Went Out']],
        portals: [{ site: 'entry', to: 'a4_flags', name: 'Back down the Prayer-Flag Terraces', spr: 'gate' }, { site: 'exit', to: 'a4_cloudshelf', name: 'Out onto the Cloud-Shelf', spr: 'gate' }],
        fill: T.CLIFF, bridge: bridge4, ruins: 2, packs: () => packs4().spires, packPer: 470,
        decor: z => heightsDecor(z, mulberry32(s + 53))
      }),
      a4_cloudshelf: s => genOutdoor({
        id: 'a4_cloudshelf', name: 'The Cloud-Shelf', W: 170, H: 150, theme: AV, act: 4, seed: s * 139 + 11, dark: 0.28, lo: 32, hi: 33,
        border: cliffBorder,
        layers: [{ tile: T.CLIFF, s: 15, frac: 0.28 }, ICE, { tile: T.ROCK, s: 3, frac: 0.02, speck: 0.7 }],
        sites: { entry: { at: [0.03, 0.5], r: 6, tile: T.DIRT, edge: 1 }, mid: { at: [0.46, 0.44], r: 9, tile: T.FLAGS }, bell: { at: [0.52, 0.86], r: 6, tile: T.DIRT }, east: { at: [0.76, 0.2], r: 7, tile: T.FLAGS }, exit: { at: [0.97, 0.52], r: 6, tile: T.DIRT, edge: 1 } },
        paths: [['entry', 'mid'], ['mid', 'east'], ['east', 'exit'], ['mid', 'bell'], ['mid', 'exit']], pathTile: T.ROAD, pathOverShallow: T.ROAD, bridgeTile: T.FLAGS,
        custom: (z, rng) => { spireField(z, rng, 5, 30); scatterDecor(z, rng, 'cloud_sea_edge', 16, (t, x, y) => t === T.GRASS && nearTile(z, x, y, T.CLIFF, 1)); },
        lanterns: [['entry', 'Shelf Threshold'], ['mid', 'Above the Clouds'], ['east', 'Bridge of Held Breath']],
        portals: [{ site: 'entry', to: 'a4_spires', name: 'Back to the Field of Lantern-Spires', spr: 'gate' }, { site: 'bell', to: 'a4_bellhollow', name: 'Down into the Bell-Hollow', spr: 'cave' }, { site: 'exit', to: 'a4_windscour', name: 'On to the Wind-Scoured Ridges', spr: 'gate' }],
        fill: T.CLIFF, bridge: bridge4, bridgeR: 2.8, minComp: 60, ruins: 1, packs: () => packs4().cloud, packPer: 440,
        decor: z => heightsDecor(z, mulberry32(s + 59))
      }),
      a4_windscour: s => genOutdoor({
        id: 'a4_windscour', name: 'The Wind-Scoured Ridges', W: 150, H: 150, theme: AV, act: 4, seed: s * 149 + 13, dark: 0.3, lo: 32, hi: 33,
        border: cliffBorder,
        layers: [{ tile: T.CLIFF, s: 24, frac: 0.07, ridge: true, speck: 0.22, ss: 6 }, { tile: T.ROCK, s: 3, frac: 0.04, speck: 0.65 }, ICE, { tile: T.DIRT, s: 8, frac: 0.14 }],
        clearings: { n: 3, r: [9, 13], over: [T.ROCK, T.CLIFF] },
        sites: { entry: { at: [0.04, 0.2], r: 6, tile: T.DIRT, edge: 1 }, mid: { at: [0.5, 0.5], r: 8, tile: T.FLAGS }, cut: { at: [0.2, 0.78], r: 6, tile: T.DIRT }, exit: { at: [0.95, 0.86], r: 6, tile: T.DIRT, edge: 1 } },
        paths: [['entry', 'mid'], ['mid', 'exit'], ['mid', 'cut']], pathTile: T.ROAD, pathOverShallow: T.ROAD,
        custom: (z, rng) => { prayerFlags(z, rng, 6); scatterDecor(z, rng, 'wind_cut_basalt', 14, (t, x, y) => t === T.GRASS && nearTile(z, x, y, T.CLIFF, 1)); },
        lanterns: [['entry', 'Ridge Threshold'], ['mid', 'Where the Wind Turns'], ['cut', 'The Cut Stone']],
        portals: [{ site: 'entry', to: 'a4_cloudshelf', name: 'Back to the Cloud-Shelf', spr: 'gate' }, { site: 'exit', to: 'a4_stair', name: 'On to the Stair of the Sky-Climbers', spr: 'gate' }],
        fill: T.CLIFF, bridge: bridge4, ruins: 2, packs: () => packs4().wind, packPer: 450,
        decor: z => heightsDecor(z, mulberry32(s + 61))
      }),
      a4_stair: s => genOutdoor({
        id: 'a4_stair', name: 'Stair of the Sky-Climbers', W: 140, H: 160, theme: AV, act: 4, seed: s * 151 + 17, dark: 0.3, lo: 33, hi: 34,
        border: cliffBorder,
        layers: [{ tile: T.ROCK, s: 3, frac: 0.02, speck: 0.7 }, ICE],
        sites: { entry: { at: [0.5, 0.96], r: 6, tile: T.DIRT, edge: 1 }, t1: { at: [0.25, 0.7], r: 7, tile: T.FLAGS }, t2: { at: [0.72, 0.45], r: 7, tile: T.FLAGS }, t3: { at: [0.3, 0.2], r: 7, tile: T.FLAGS }, exit: { at: [0.62, 0.05], j: 0.02, r: 7, tile: T.FLAGS, edge: 1 } },
        paths: [['entry', 't1'], ['t1', 't2'], ['t2', 't3'], ['t3', 'exit']], pathR: 4.2, pathTile: T.ROAD, pathOverShallow: T.ROAD,
        custom: (z, rng, S) => {
          terraces(z, rng, [0.3, 0.57, 0.82], 3, 1);
          prayerFlags(z, rng, 10);
          for (const k of ['t1', 't2', 't3']) { const c = S[k]; for (const [i, j] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) if (z.get(c.x + i, c.y + j) !== T.CLIFF) z.set(c.x + i, c.y + j, T.PILLAR); }
          z.decor.push({ kind: 'monastery_facade', x: S.exit.x + 0.5, y: S.exit.y - 1.5 });
        },
        lanterns: [['entry', 'Foot of the Stair'], ['t1', 'First Landing'], ['t2', 'Landing of the Bronze Bells'], ['t3', 'The Last Landing']],
        portals: [{ site: 'entry', to: 'a4_windscour', name: 'Back to the Wind-Scoured Ridges', spr: 'gate' }, { site: 'exit', to: 'a4_monastery', name: "Into the Sky-Climber's Monastery", spr: 'stairs' }],
        fill: T.CLIFF, bridge: c => (c === T.CLIFF ? T.ROAD : bridge4(c)), bridgeR: 2.8, ruins: 0, packs: () => packs4().stair, packPer: 420,
        decor: z => heightsDecor(z, mulberry32(s + 67))
      })
    };

    const D4 = {
      a4_breathcaves: s => genHalls({
        id: 'a4_breathcaves', name: 'The Breath-Caves', W: 110, H: 110, theme: 'anvhar_deep', act: 4, seed: s * 157 + 3, dark: 0.82, lo: 31, hi: 32,
        rooms: 14, rmin: 12, rmax: 20, gap: 5, cw: 6, blob: true, loops: 0.35,
        up: { to: 'a4_glasspass', name: 'Out to the Glass Pass', spr: 'stairs' }, lanterns: ['Cave of the First Breath', 'The Held Exhale'],
        packs: () => packs4().caves, chests: 0.45,
        custom: (z, rng, rooms) => { for (const r of rooms) if (rng() < 0.5) z.decor.push({ kind: 'ice_organ', x: r.x + r.w / 2, y: r.y + 1.5 }); }
      }),
      a4_bellhollow: s => genHalls({
        id: 'a4_bellhollow', name: 'The Bell-Hollow', W: 110, H: 110, theme: 'anvhar_deep', act: 4, seed: s * 163 + 5, dark: 0.85, lo: 32, hi: 33,
        rooms: 13, rmin: 13, rmax: 22, gap: 5, cw: 6, pillars: true, loops: 0.3,
        up: { to: 'a4_cloudshelf', name: 'Up to the Cloud-Shelf', spr: 'stairs' }, lanterns: ['Hollow Mouth', 'The Cracked Chime'],
        packs: () => packs4().bell, chests: 0.5,
        custom: (z, rng, rooms) => { for (const r of rooms) if (rng() < 0.5) z.decor.push({ kind: 'hanging_bell', x: r.x + r.w / 2, y: r.y + r.h / 2 }); }
      }),
      a4_monastery: s => genHalls({
        id: 'a4_monastery', name: "Sky-Climber's Monastery", W: 130, H: 120, theme: 'anvhar_deep', act: 4, seed: s * 167 + 7, dark: 0.8, lo: 33, hi: 34,
        rooms: 16, rmin: 14, rmax: 24, gap: 5, cw: 7, pillars: true, loops: 0.35,
        up: { to: 'a4_stair', name: 'Out to the Stair of the Sky-Climbers', spr: 'stairs' }, down: [{ to: 'a4_lair', name: 'Up to the Summit of the Unrung Bell', spr: 'stairs' }],
        lanterns: ['Gate of the Sky-Climbers', 'Hall of Soul-Threads', 'The Mantra Loft'],
        packs: () => packs4().monastery, chests: 0.45,
        custom: (z, rng, rooms) => { for (const r of rooms) if (rng() < 0.5) z.decor.push({ kind: rng() < 0.5 ? 'prayer_wheel' : 'thread_loom', x: r.x + r.w / 2, y: r.y + 1.5 }); }
      })
    };

    // ------------------------------------------------------------- a4_town: Bellrest Hearth
    function genTown4(seed) {
      const rng = mulberry32(seed * 173 + 11), W = 86, H = 80, cx = 43, cy = 40;
      const z = new Zone('a4_town', 'Bellrest Hearth', W, H, 0.25);
      z.theme = AV; z.act = 4; z.seed = seed; z.decor = []; z.town = true; z.shelters = [];
      z.t.fill(T.CLIFF);
      // the ledge: broad and flat, the mountain wall to the north, the drop to the south
      const n = makeNoise(rng);
      for (let x = 4; x < W - 4; x++) {
        const top = 12 + Math.round(n(x / 9, 1) * 6), bot = H - 12 - Math.round(n(x / 9, 5) * 6);
        for (let y = top; y <= bot; y++) z.set(x, y, T.GRASS);
      }
      rect(z, cx - 15, cy - 9, cx + 15, cy + 9, T.FLAGS);
      // low walls of the hearth-yard with wide gaps
      for (let x = cx - 15; x <= cx + 15; x++) for (const y of [cy - 9, cy + 9]) if (Math.abs(x - cx) > 4 && Math.abs(x - cx) < 13) z.set(x, y, T.RUIN);
      rect(z, 4, cy - 2, W - 5, cy + 2, c => (c === T.CLIFF ? T.FLAGS : T.ROAD), { margin: 3 });
      // two Lantern-Spires flank the hearth; a bell-frame stands at the north wall
      for (const [dx, dy] of [[-10, -4], [9, -4]]) { const x = cx + dx, y = cy + dy; for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) z.set(x + i, y + j, T.PILLAR); z.decor.push({ kind: 'lantern_spire', x: x + 1, y: y + 1 }); z.shelters.push({ x: x + 1, y: y + 1, r: 4.5 }); }
      z.set(cx - 1, cy - 12, T.PILLAR); z.set(cx + 1, cy - 12, T.PILLAR);
      z.decor.push({ kind: 'bell_frame', x: cx + 0.5, y: cy - 12 }, { kind: 'hearth_fire', x: cx + 0.5, y: cy + 0.5 }, { kind: 'prayer_flags', x: cx - 14.5, y: cy - 8.5, x2: cx + 14.5, y2: cy - 8.5 });
      for (let i = 0; i < 10; i++) { const x = 6 + Math.floor(rng() * (W - 12)), y = 8 + Math.floor(rng() * (H - 16)); if (z.get(x, y) === T.GRASS && Math.abs(x - cx) > 18) z.set(x, y, T.ROCK); }
      z.start = { x: cx + 0.5, y: cy + 3.5 };
      z.npcSpots = [
        { x: cx - 6.5, y: cy - 4.5, role: 'vendor' }, { x: cx + 6.5, y: cy - 4.5, role: 'healer' },
        { x: cx - 6.5, y: cy + 5.5, role: 'stash' }, { x: cx + 6.5, y: cy + 5.5, role: 'smith' }
      ];
      z.waypointSpot = { x: cx + 0.5, y: cy + 0.5 };
      z.prevActSpot = { x: 7.5, y: cy + 0.5 };   // the Quest agent's arrival point from Act III (west road end)
      z.questSpots = { actGate: z.prevActSpot, waypoint: z.waypointSpot };
      addLantern(z, cx + 0.5, cy - 5.5, 'Bellrest Hearth');
      addPortal(z, W - 7.5, cy + 0.5, 'a4_foothills', 'Out to the Chime-Foothills', 'gate');
      z.arrive.a4_foothills = { x: W - 10.5, y: cy + 0.5 };
      return z;
    }

    // ------------------------------------------------------------- a4_lair: Summit of the Unrung Bell
    function genLair4(seed) {
      const rng = mulberry32(seed * 179 + 13), W = 100, H = 100, cx = 50, cy = 44;
      const z = new Zone('a4_lair', 'Summit of the Unrung Bell', W, H, 0.3);
      z.theme = AV; z.act = 4; z.seed = seed; z.decor = []; z.shelters = [];
      z.t.fill(T.CLIFF);
      blob(z, cx, cy + 4, 40, T.GRASS, rng, { amp: 0.12 });
      stamp(z, cx + 0.5, cy + 0.5, 18, T.FLAGS);
      const ar = { x: cx - 18, y: cy - 18, w: 37, h: 37 };
      // eight Lantern-Spires ring the summit; the great bell hangs in its frame at the north of the ring
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2 + Math.PI / 8, x = Math.floor(cx + Math.cos(a) * 15), y = Math.floor(cy + Math.sin(a) * 15); for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) z.set(x + k, y + j, T.PILLAR); z.decor.push({ kind: 'lantern_spire', x: x + 1, y: y + 1 }); }
      rect(z, cx - 1, cy - 11, cx + 1, cy - 9, T.ROCK);
      z.decor.push({ kind: 'unrung_bell', x: cx + 0.5, y: cy - 10 });
      // the way up from the monastery roof
      rect(z, cx - 3, cy + 17, cx + 3, H - 5, T.ROAD, { margin: 3 });
      rect(z, cx - 10, H - 14, cx + 10, H - 5, T.FLAGS, { margin: 3 });
      for (let y = cy + 20; y < H - 14; y += 5) { z.set(cx - 5, y, T.PILLAR); z.set(cx + 5, y, T.PILLAR); z.decor.push({ kind: 'prayer_flags', x: cx - 4.5, y: y + 0.5, x2: cx + 5.5, y2: y + 0.5 }); }
      const sp = openNear(z, cx + 0.5, H - 8.5);
      z.start = sp; z.arrive = {};
      addPortal(z, cx + 0.5, H - 6.5, 'a4_monastery', "Down into the Sky-Climber's Monastery", 'stairs');
      z.arrive.a4_monastery = sp;
      addLantern(z, cx + 3.5, H - 10.5, 'The Last Lantern');
      z.bossSpot = { x: cx + 0.5, y: cy + 0.5 };
      z.bossArena = ar; z.bossRoom = ar;
      const P = packs4().lair;
      if (typeof placePack === 'function') [[cx - 7, cy + 30], [cx + 7, cy + 24]].forEach(([x, y], i) => { const p = openNear(z, x + 0.5, y + 0.5); placePack(z, p.x, p.y, 34, P, 'a4_lair_' + i, rng); });
      return z;
    }

    reg('a4_town', 'Bellrest Hearth', 4, genTown4);
    const NAMES4 = { a4_foothills: 'The Chime-Foothills', a4_glasspass: 'The Glass Pass', a4_flags: 'The Prayer-Flag Terraces', a4_spires: 'Field of Lantern-Spires', a4_cloudshelf: 'The Cloud-Shelf', a4_windscour: 'The Wind-Scoured Ridges', a4_stair: 'Stair of the Sky-Climbers', a4_breathcaves: 'The Breath-Caves', a4_bellhollow: 'The Bell-Hollow', a4_monastery: "Sky-Climber's Monastery" };
    for (const id in Z4) reg(id, NAMES4[id], 4, Z4[id], { dress: true });
    for (const id in D4) reg(id, NAMES4[id], 4, D4[id], { dress: true });
    reg('a4_lair', 'Summit of the Unrung Bell', 4, genLair4);

    // =============================================================================== Act IV mechanics
    const inHeights = () => G && G.zone && G.zone.theme === AV;
    // Chime-Golems: dormant until the harmony breaks
    const dormant = m => m && m.b && m.b.chime && !m.woken && m.rank !== 'boss';
    function wake(m, why) {
      if (!dormant(m)) return;
      m.woken = true;
      if (typeof floatText === 'function' && why) floatText(m.x, m.y, why, '#d8c080');
      if (typeof sfx === 'function') { sfx(1175, 0.5, 'sine', 0.02, -40); sfx(880, 0.6, 'sine', 0.016, -20); }
      if (typeof aggro === 'function') aggro(m);
    }
    if (typeof aggro === 'function') { const _ag = aggro; aggro = function (m) { if (dormant(m)) return; return _ag(m); }; }
    if (typeof hurtMon === 'function') { const _hm = hurtMon; hurtMon = function (m) { try { if (dormant(m) && !m.dead) { m.woken = true; } } catch (e) { } return _hm.apply(this, arguments); }; }
    if (typeof updateMon === 'function') {
      const _um = updateMon;
      updateMon = function (m, dt, dp) {
        if (dormant(m)) {
          if (m.state !== 'idle') { m.state = 'idle'; m.path = null; }
          if (dp < 1.8) wake(m, 'the chime cracks');
          else return;
        }
        return _um.apply(this, arguments);
      };
    }
    if (typeof killMon === 'function') {
      const _km = killMon;
      killMon = function (m) {
        const was = m && m.dead;
        const r = _km.apply(this, arguments);
        try {
          if (m && !was && m.dead && G.zone) for (const o of G.zone.monsters) if (dormant(o) && !o.dead && Math.hypot(o.x - m.x, o.y - m.y) < 9) wake(o, 'the harmony breaks');
        } catch (e) { report(e); }
        return r;
      };
    }
    // chime-winds: a gust off the heights drains poise; the pale flames shelter you
    const GUST = { next: 8, on: 0, warned: false, told: false, zone: null, fx: 0 };
    const sheltered = () => {
      const z = G.zone;
      for (const s of (z.shelters || [])) if (Math.hypot(s.x - P.x, s.y - P.y) < s.r) return true;
      for (const o of z.objects) if (o.type === 'lantern' && Math.hypot(o.x - P.x, o.y - P.y) < 4) return true;
      return false;
    };
    if (typeof update === 'function') {
      const _up = update;
      update = function (dt) {
        const r = _up(dt);
        try {
          if (inHeights() && !G.zone.town && !P.dead && typeof D === 'object' && D) {
            if (GUST.zone !== G.zone.id) { GUST.zone = G.zone.id; GUST.next = 7 + Math.random() * 4; GUST.on = 0; GUST.warned = false; }
            GUST.next -= dt;
            if (!GUST.warned && GUST.next < 1.1 && GUST.on <= 0) { GUST.warned = true; if (typeof sfx === 'function') { sfx(1568, 0.4, 'sine', 0.014, -120); sfx(2093, 0.3, 'sine', 0.01, -200); } }
            if (GUST.next <= 0 && GUST.on <= 0) {
              GUST.on = 2.4; GUST.next = 10 + Math.random() * 6; GUST.warned = false;
              if (!GUST.told) { GUST.told = true; if (typeof say === 'function') say('A chime-wind comes down off the heights. Keep near the pale flames.', 3.2); }
            }
            if (GUST.on > 0) {
              GUST.on -= dt;
              const cover = sheltered(), floor = D.maxStam * 0.35;
              if (!cover && P.stam > floor) { P.stam = Math.max(floor, P.stam - 12 * dt); P.stamDelay = Math.max(P.stamDelay || 0, 0.25); }
              GUST.fx -= dt;
              if (GUST.fx <= 0 && typeof burst === 'function') { GUST.fx = 0.06; burst(P.x - 4 + Math.random() * 8, P.y - 5 + Math.random() * 3, cover ? '#f0d8a0' : '#dfe8f2', 1, 3.2); }
            }
          }
        } catch (e) { report(e); }
        return r;
      };
    }

    window.__act4 = {
      zones: ['a4_town', 'a4_foothills', 'a4_glasspass', 'a4_flags', 'a4_spires', 'a4_cloudshelf', 'a4_windscour', 'a4_stair', 'a4_breathcaves', 'a4_bellhollow', 'a4_monastery', 'a4_lair'],
      bands: { a4_foothills: [30, 31], a4_glasspass: [30, 31], a4_flags: [31, 32], a4_spires: [31, 32], a4_cloudshelf: [32, 33], a4_windscour: [32, 33], a4_stair: [33, 34], a4_breathcaves: [31, 32], a4_bellhollow: [32, 33], a4_monastery: [33, 34], a4_lair: [34, 34] },
      monsters: ['a4_animamonk', 'a4_chimegolem', 'a4_rimewraith', 'a4_flagmoth', 'a4_tetherpilgrim', 'a4_basaltborer'],
      gen: (id, seed) => ZONE_GEN[id](seed),
      audit: z => A34.audit(z),
      gust: GUST, sheltered: () => sheltered(),
      updateMon: (m, dt, dp) => updateMon(m, dt, dp), killMon: m => killMon(m), hurtMon: (m, d) => hurtMon(m, d), update: dt => update(dt)
    };
  }
}
