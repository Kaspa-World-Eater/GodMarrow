// zz_arcana_web.js · The Arcana Weaver · THE LONG WEB
// A wide passive web of small knots laid around the Inverted Triune, in the manner of the old passive trees.
// Every level from the second gives one knot to tie; quests may give more (webGrantPoints). Each knot is very small
// (about +1% of one thing), so the web carries the sense of growth when levelling slows late in the walk, without
// running away with the numbers. Every region has two great knots (notables). The five class regions sit on a ring
// round a small hub; hybrid roads join neighbours. Your class's Arcana cards are the keystones at the rim of your
// region: a card you hold lights its keystone, and a lit keystone is a second place a road may begin.
// Save: P.arc.web = { taken: {id:1}, pts, bonus }. Old saves load with an empty web and their full level's knots.
// Nothing here edits another file: derive() is wrapped last (after every other file has loaded), so the knots ride
// on top of the pace, poise and walk-speed tuning, and walk speed goes through the same cap as boots do.

// quest rewards: the Quest agent calls this (also on window.webGrantPoints)
function webGrantPoints(n, why) { return PW.grant(n, why); }

const PW = (() => {
  const D2R = Math.PI / 180;
  const pol = (r, deg) => ({ x: Math.cos(deg * D2R) * r, y: Math.sin(deg * D2R) * r });

  // ------------------------------------------------------------------ what one knot gives
  const V = { life: 1, ess: 1, regen: 2, armor: 2, poise: 2, prec: 3, shard: 1, dmg: 1, melee: 1, fcr: 1, wisp: 2, res: 1, mf: 2, frw: 0.5, lok: 1, bleed: 2, sick: 2, evade: 0.5, sun: 1.5, moon: 1.5, vit: 1, spi: 1, con: 1 };
  const nf = v => (Math.round(v * 10) / 10).toString();
  const rn = () => { try { return P.cls === 'hemomancer' ? 'Vitae' : P.cls === 'miasmancer' ? 'Miasma' : 'Essence'; } catch (e) { return 'Essence'; } };
  const FXT = {
    life: v => `+${nf(v)}% maximum life`, ess: v => `+${nf(v)}% maximum ${rn()}`, regen: v => `+${nf(v)}% ${rn()} regained`,
    armor: v => `+${nf(v)} armor`, poise: v => `+${nf(v)} poise`, prec: v => `+${nf(v)}% poise recovery`,
    shard: v => `+${nf(v)} bone shard held (Ossuarch)`, dmg: v => `+${nf(v)}% skill damage`, melee: v => `+${nf(v)}% melee damage`,
    fcr: v => `+${nf(v)}% faster casting`, wisp: v => `+${nf(v)}% faster wisp regrowth (Weaver)`, res: v => `+${nf(v)}% magic resist`,
    mf: v => `+${nf(v)}% magic find`, frw: v => `+${nf(v)}% faster walking (within the usual limit)`, lok: v => `+${nf(v)} life on kill`,
    bleed: v => `+${nf(v)}% bleeding damage`, sick: v => `+${nf(v)}% sickness damage`, evade: v => `+${nf(v)}% chance a blow misses you`,
    sun: v => `+${nf(v)}% skill damage under an open sky by day`, moon: v => `+${nf(v)}% melee damage in the dark (night, or under the earth)`,
    vit: v => `+${nf(v)} Vitality`, spi: v => `+${nf(v)} to the Essence attribute`, con: v => `+${nf(v)} Constitution`
  };
  // the short form, for the sums box
  const FXS = { life: '% life', ess: () => '% ' + rn(), regen: () => '% ' + rn() + ' regained', armor: ' armor', poise: ' poise', prec: '% poise recovery', shard: ' shard held', dmg: '% skill damage', melee: '% melee', fcr: '% cast speed', wisp: '% wisp regrowth', res: '% magic resist', mf: '% magic find', frw: '% walk speed', lok: ' life on kill', bleed: '% bleeding', sick: '% sickness', evade: '% blows miss', sun: '% skill dmg by day', moon: '% melee in the dark', vit: ' Vitality', spi: ' Essence (attr)', con: ' Constitution' };
  const shortFx = (k, v) => '+' + nf(v) + (typeof FXS[k] === 'function' ? FXS[k]() : FXS[k]);
  const FXC = { life: '#c24050', lok: '#e06a78', bleed: '#9a1a22', ess: '#6fa8dc', regen: '#9fd8ff', fcr: '#bfe8ff', wisp: '#e8f7ff', dmg: '#b48ad9', melee: '#d07a3c', armor: '#a8a08a', poise: '#e8e2d0', prec: '#cfc8b0', shard: '#f4efe2', res: '#9a7ad0', evade: '#a488c8', sick: '#7aa040', mf: '#e8c860', frw: '#8fbf8f', sun: '#fff0b0', moon: '#6a6aa8', vit: '#ffffff', spi: '#ffffff', con: '#ffffff' };
  // names: elegiac, one pool per kind of knot, handed out in turn
  const NAMES = {
    life: ['Warm Under the Ash', 'The Second Heartbeat', 'Blood Kept Close', 'A Slow Pulse', 'The Wick Still Lit', 'Heavy Heart', 'Red Thread', 'Kept Warmth', 'The Stumps Are Warm', 'Still Breathing'],
    ess: ['The Held Candle', 'Deep Well', 'Breath Kept Back', 'A Full Censer', 'Still Water', 'The Lamp Unspent', 'Lantern Oil', 'Unspoken Word'],
    regen: ['The Wick Drinks', 'Slow Refilling', 'Rain in the Font', 'The Tide Returns', 'Evening Oil', 'Seep'],
    armor: ['Ash Under Foot', 'Kept-Bone Weave', 'Rib Plate', 'The Lintel', 'Fitted Stone', 'Old Ivory', 'Sister Un\'s Lid', 'The Counting Wall'],
    poise: ['Kneeler\'s Vow', 'Rooted Heel', 'The Warm Wall', 'Heavy Tread', 'The Salute', 'Unbending Knee', 'Standing Stone', 'The Grieving Stone'],
    prec: ['The Long Breath', 'Rise Again', 'Settled Dust', 'Kneel and Rise'],
    shard: ['A Shard Kept', 'Splinter Hoard', 'The Cup Wall', 'Loose Teeth', 'The Miscount'],
    dmg: ['The Sharpened Word', 'Bitter Hymn', 'The Unfinished Note', 'Iron Psalm', 'A Hard Sermon', 'The Knell', 'Ink That Burns', 'The Last Verse', 'Tolled Twice', 'The Cracked Bell', 'Chalk on the Milestone'],
    melee: ['The Slow Hand', 'Knuckle and Bone', 'The Closed Fist', 'Weight of the Palm', 'A Heavy Blow', 'The Struck Bell', 'Stone in the Sleeve', 'Iron Heel', 'The Wrapped Hand', 'Split Knuckle'],
    fcr: ['Quick Tongue', 'The Hurried Rite', 'Fast Fingers', 'The Half-Said Prayer', 'Swift Ink', 'The Skipped Verse', 'The Short Litany', 'Mouthed, Not Sung'],
    wisp: ['The Wisps Return', 'Wisp-Roost', 'Lantern Motes', 'Kindled Again'],
    res: ['Salt Line', 'The Warded Door', 'Paper Doll', 'Stone on the Gate', 'Turned Torii', 'Charm of Linen', 'Sealed Lips', 'The Closed Eye', 'The Bowed Boatman'],
    mf: ['The Gleaner\'s Eye', 'Graverobber\'s Luck', 'The Reader\'s Ink', 'Coin on the Stone', 'Gleaner'],
    frw: ['Light Foot', 'The Pilgrim Road', 'Ash Does Not Hold', 'Swift Mourner', 'The Milestone', 'Long Stride', 'Down the Lane', 'Unlingering'],
    lok: ['Taking Back', 'Last Warmth', 'The Drink After', 'What Spills', 'Communion'],
    bleed: ['The Weeping Rib', 'Slow Drip', 'Thin Blood', 'The Wound Stays Open', 'Red Hands', 'Dowager\'s Arc', 'The Drinking Kiss', 'The Unscabbed'],
    sick: ['Sour Wind', 'Fen Breath', 'Sour Bloom', 'Carrion Air', 'Green Fire', 'Iron and Incense', 'Lymph and Reed'],
    evade: ['Blur of Linen', 'Not Quite There', 'The Late Sister', 'Step Aside', 'Shadow Lag', 'Half-Seen', 'The Unwound Strip', 'Film Missing Frames'],
    sun: ['Noon Bell', 'Glass That Remembers', 'White Hour', 'Sunstruck'],
    moon: ['Black Glass', 'Lantern Out', 'Under the Hide', 'Night Hands'],
    vit: ['The Stubborn Body', 'The Yoked Heart'], spi: ['The Inner Lamp', 'The Unbowed Mind'], con: ['Marrow Stock', 'The Iron Frame']
  };
  const nameIx = {};
  const nextName = k => { const L = NAMES[k] || ['A Minor Arcanum']; const i = nameIx[k] = (nameIx[k] || 0) + 1; return L[(i - 1) % L.length]; };

  // ------------------------------------------------------------------ the five regions, on a ring
  // slot order: c1 c2 c3 | wheel ring w0..w4 | l1..l6 | r1..r6 | x1 x2
  const REG = [
    { key: 'oss', cls: 'ossumancer', who: 'Ossuarch', name: 'The Ossuary', gate: 'The Ossuary Gate', col: '#e8e2d0', rgb: '232,226,208',
      s: ['armor', 'armor', 'poise', 'armor', 'poise', 'shard', 'armor', 'poise', 'life', 'prec', 'poise', 'life', 'prec', 'con', 'dmg', 'shard', 'res', 'dmg', 'shard', 'armor', 'poise', 'life'],
      nA: { name: 'The Kept Wall', fx: { armor: 10, poise: 8 }, lore: 'The ribs were a vault before they were a crypt.' },
      nB: { name: 'Marrow Patience', fx: { prec: 6, life: 3 }, lore: 'The duelists in the dark still go through their forms. They are in no hurry.' } },
    { key: 'hem', cls: 'hemomancer', who: 'Hemomancer', name: 'The Red Nave', gate: 'The Bleeding Door', col: '#c24050', rgb: '194,64,80',
      s: ['life', 'lok', 'life', 'lok', 'life', 'lok', 'life', 'lok', 'bleed', 'bleed', 'dmg', 'bleed', 'bleed', 'vit', 'ess', 'res', 'regen', 'ess', 'res', 'dmg', 'bleed', 'life'],
      nA: { name: 'The Red Tithe', fx: { lok: 3, life: 3 }, lore: 'The Maiden takes her tenth. She leaves you the rest, warm.' },
      nB: { name: 'Open Veins', fx: { bleed: 8, dmg: 2 }, lore: 'A wound that never scabbed is a well that never dries.' } },
    { key: 'shr', cls: 'miasmancer', who: 'Shrine Keeper', name: 'The Well-Shrine', gate: 'The Well Door', col: '#8a4ab8', rgb: '138,74,184',
      s: ['sick', 'sick', 'evade', 'sick', 'evade', 'sick', 'evade', 'dmg', 'res', 'res', 'mf', 'res', 'res', 'mf', 'evade', 'frw', 'dmg', 'evade', 'frw', 'regen', 'res', 'life'],
      nA: { name: 'The Held Breath', fx: { evade: 1.5, sick: 6 }, lore: 'She did not breathe out. She is still looking for someone who will.' },
      nB: { name: 'Salt on the Threshold', fx: { res: 4, evade: 1 }, lore: 'The guardian stone at the torii faces the wrong way. She turns it back each time she passes.' } },
    { key: 'kus', cls: 'monk', who: 'The Empty Hand', name: 'The Black-Flame Road', gate: 'The Barefoot Gate', col: '#d8c890', rgb: '216,200,144',
      s: ['melee', 'poise', 'melee', 'sun', 'moon', 'sun', 'moon', 'melee', 'frw', 'melee', 'frw', 'melee', 'frw', 'con', 'moon', 'sun', 'life', 'armor', 'poise', 'frw', 'melee', 'life'],
      nA: { name: 'Noon and Midnight', fx: { sun: 3, moon: 3 }, lore: 'The glass remembers his laugh by day. By night it remembers what he laughed at.' },
      nB: { name: 'The Empty Laugh', fx: { melee: 4, frw: 1 }, lore: 'Ha. Once. It is enough.' } },
    { key: 'ani', cls: 'animancer', who: 'Hollow Mystic', name: 'The Hall of Mirrors', gate: 'The Mirror Door', col: '#bfe8ff', rgb: '191,232,255',
      s: ['ess', 'regen', 'ess', 'ess', 'regen', 'ess', 'wisp', 'regen', 'fcr', 'fcr', 'dmg', 'fcr', 'fcr', 'spi', 'wisp', 'dmg', 'mf', 'wisp', 'res', 'fcr', 'ess', 'dmg'],
      nA: { name: 'The Lantern\'s Patience', fx: { ess: 5, regen: 5 }, lore: 'A little longer. A little longer. Every wick says this.' },
      nB: { name: 'Quicksilver Tongue', fx: { fcr: 4, dmg: 2 }, lore: 'The prayer is shorter if you leave out the parts that beg.' } }
  ];
  // the roads between neighbours: six knots with a great knot in the middle
  const BRIDGE = [
    { name: 'The Marrow-Kin Road', s: ['life', 'armor', 'lok', 'poise', 'bleed', 'life'], n: { name: 'Blood Set in Bone', fx: { life: 3, armor: 6 }, lore: 'Blood from the kill hardens as it cools. Some of it keeps the shape.' } },
    { name: 'The Sour Lymph', s: ['bleed', 'sick', 'life', 'res', 'sick', 'bleed'], n: { name: 'Iron and Incense', fx: { bleed: 5, sick: 5 }, lore: 'The fen smells of iron and old incense: the incense from the chapels, the iron from what was left.' } },
    { name: 'The Turned-Stone Path', s: ['evade', 'frw', 'res', 'melee', 'evade', 'melee'], n: { name: 'The Wrong-Side Stone', fx: { evade: 1, melee: 2, frw: 1 }, lore: 'Each time it is turned back, it turns again.' } },
    { name: 'The Black-Flame Stair', s: ['melee', 'frw', 'fcr', 'dmg', 'ess', 'fcr'], n: { name: 'Lantern in the Fist', fx: { melee: 3, fcr: 3 }, lore: 'His black-flame lantern reads brighter the deeper he walks.' } },
    { name: 'The Revenant\'s Road', s: ['ess', 'wisp', 'dmg', 'poise', 'armor', 'shard'], n: { name: 'Bone Under Candle', fx: { dmg: 3, poise: 6 }, lore: 'The votive candles in the ribs never blow out. The ribs keep the wind off them.' } }
  ];
  const HUB = { s: ['dmg', 'life', 'mf', 'ess', 'vit', 'dmg', 'life', 'res', 'spi', 'mf'], n: { name: 'The Wound at the Centre', fx: { dmg: 2, life: 2, ess: 2 }, lore: 'The god is not here. The god is under you. It is under everyone.' } };

  // ------------------------------------------------------------------ build the graph (stable ids: saves keep them)
  const N = {};
  const add = (id, kind, x, y, o) => (N[id] = Object.assign({ id, kind, x, y, links: new Set() }, o || {}));
  const link = (a, b) => { if (!N[a] || !N[b]) return; N[a].links.add(b); N[b].links.add(a); };
  const fxOf = k => ({ [k]: V[k] });
  const peg = (id, k, p, reg, area) => add(id, 'peg', p.x, p.y, { fx: fxOf(k), stat: k, name: nextName(k), reg, area });
  REG.forEach((R, i) => {
    const A = -90 + i * 72; R.ang = A; const at = (r, off) => pol(r, A + off), k = R.key, s = R.s, area = R.name;
    add(`w_${k}_root`, 'root', at(4.2, 0).x, at(4.2, 0).y, { reg: k, name: R.gate, fx: {} });
    peg(`w_${k}_c1`, s[0], at(5.5, 0), k, area); peg(`w_${k}_c2`, s[1], at(6.7, 0), k, area); peg(`w_${k}_c3`, s[2], at(7.9, 0), k, area);
    const wc = at(10.1, 0);
    add(`w_${k}_nA`, 'notable', wc.x, wc.y, { reg: k, area, name: R.nA.name, fx: R.nA.fx, lore: R.nA.lore });
    for (let j = 0; j < 5; j++) { const q = pol(1.2, A + 180 + j * 72); peg(`w_${k}_w${j}`, s[3 + j], { x: wc.x + q.x, y: wc.y + q.y }, k, area); }
    const Lr = [5.4, 6.5, 7.6, 8.7, 11.1, 12.3], Rr = [5.4, 6.6, 7.8, 9.0, 10.2, 11.4];
    Lr.forEach((r, j) => peg(`w_${k}_l${j + 1}`, s[8 + j], at(r, -18), k, area));
    const nb = at(9.9, -18); add(`w_${k}_nB`, 'notable', nb.x, nb.y, { reg: k, area, name: R.nB.name, fx: R.nB.fx, lore: R.nB.lore });
    Rr.forEach((r, j) => peg(`w_${k}_r${j + 1}`, s[14 + j], at(r, 18), k, area));
    peg(`w_${k}_x1`, s[20], at(6.2, -9), k, area); peg(`w_${k}_x2`, s[21], at(6.2, 9), k, area);
    // links
    const rt = `w_${k}_root`;
    link(rt, `w_${k}_c1`); link(`w_${k}_c1`, `w_${k}_c2`); link(`w_${k}_c2`, `w_${k}_c3`); link(`w_${k}_c3`, `w_${k}_w0`);
    for (let j = 0; j < 5; j++) link(`w_${k}_w${j}`, `w_${k}_w${(j + 1) % 5}`);
    link(`w_${k}_nA`, `w_${k}_w2`); link(`w_${k}_nA`, `w_${k}_w3`);
    link(rt, `w_${k}_l1`); for (let j = 1; j < 4; j++) link(`w_${k}_l${j}`, `w_${k}_l${j + 1}`); link(`w_${k}_l4`, `w_${k}_nB`); link(`w_${k}_nB`, `w_${k}_l5`); link(`w_${k}_l5`, `w_${k}_l6`);
    link(rt, `w_${k}_r1`); for (let j = 1; j < 6; j++) link(`w_${k}_r${j}`, `w_${k}_r${j + 1}`);
    link(`w_${k}_x1`, `w_${k}_c2`); link(`w_${k}_x1`, `w_${k}_l2`); link(`w_${k}_x2`, `w_${k}_c2`); link(`w_${k}_x2`, `w_${k}_r2`);
    // keystones: the class's three card pages at the rim, its two hybrids in the gaps beside it
    [[12.5, -9, `w_${k}_w2`], [12.8, 0, `w_${k}_nA`], [12.5, 9, `w_${k}_w3`]].forEach(([r, off, to], j) => { const q = at(r, off); add(`w_${k}_K${j}`, 'key', q.x, q.y, { reg: k, page: j, name: '' }); link(`w_${k}_K${j}`, to); });
    [[9.4, -30, [`w_${k}_l3`, `w_${k}_l4`]], [9.4, 30, [`w_${k}_r3`, `w_${k}_r4`]]].forEach(([r, off, to], j) => { const q = at(r, off); add(`w_${k}_H${j}`, 'key', q.x, q.y, { reg: k, hyb: j, name: '' }); to.forEach(t => link(`w_${k}_H${j}`, t)); });
  });
  // hub: a ring of ten round a great knot; each gate meets the ring
  for (let j = 0; j < 10; j++) { const q = pol(2.3, -90 + j * 36); peg(`w_hub_${j}`, HUB.s[j], q, 'hub', 'The Hub of Pips'); }
  add('w_hub_n', 'notable', 0, 0, { reg: 'hub', area: 'The Hub of Pips', name: HUB.n.name, fx: HUB.n.fx, lore: HUB.n.lore });
  for (let j = 0; j < 10; j++) { link(`w_hub_${j}`, `w_hub_${(j + 1) % 10}`); if (j % 2) link(`w_hub_${j}`, 'w_hub_n'); }
  REG.forEach((R, i) => link(`w_${R.key}_root`, `w_hub_${i * 2}`));
  // bridges: from region i's right arm to region i+1's left arm, bowing outward
  BRIDGE.forEach((B, i) => {
    const R = REG[i], R2 = REG[(i + 1) % 5], A = R.ang, rad = [12.4, 13.2, 13.8, 14.1, 13.8, 13.2, 12.9];
    const ids = [];
    for (let j = 0; j < 7; j++) {
      const q = pol(rad[j], A + 22.5 + j * 4.5), id = j === 3 ? `w_br${i}_n` : `w_br${i}_${j < 3 ? j : j - 1}`;
      if (j === 3) add(id, 'notable', q.x, q.y, { reg: 'br' + i, area: B.name, name: B.n.name, fx: B.n.fx, lore: B.n.lore });
      else peg(id, B.s[j < 3 ? j : j - 1], q, 'br' + i, B.name);
      ids.push(id);
    }
    link(`w_${R.key}_r6`, ids[0]); for (let j = 0; j < 6; j++) link(ids[j], ids[j + 1]); link(ids[6], `w_${R2.key}_l6`);
  });
  const REGK = {}; REG.forEach(R => { REGK[R.key] = R; });
  const isPeg = n => n && (n.kind === 'peg' || n.kind === 'notable' || n.kind === 'root');
  const COUNT = { pegs: 0, notables: 0, keys: 0, roots: 0 }; for (const id in N) { const n = N[id]; if (n.kind === 'peg') COUNT.pegs++; else if (n.kind === 'notable') COUNT.notables++; else if (n.kind === 'key') COUNT.keys++; else COUNT.roots++; }

  // ------------------------------------------------------------------ state, points, anchors
  function st() {
    if (!P.arc) P.arc = newArc();
    const a = P.arc; if (!a.web || typeof a.web !== 'object') a.web = { taken: {}, pts: 0, bonus: 0 };
    if (!a.web.taken || typeof a.web.taken !== 'object') a.web.taken = {};
    if (!(a.web.bonus >= 0)) a.web.bonus = 0;
    return a.web;
  }
  const ownReg = () => REG.find(R => R.cls === P.cls) || null;
  const earned = () => Math.max(0, ((P.level | 0) - 1)) + (st().bonus | 0);
  const spent = () => { const t = st().taken; let n = 0; for (const k in t) if (t[k] && isPeg(N[k])) n++; return n; };
  const avail = () => earned() - spent();
  const tk = id => !!st().taken[id];
  // a keystone is lit when you hold one of its cards
  function keyCards(n) {
    const R = REGK[n.reg]; if (!R || typeof WEB_DEF === 'undefined') return [];
    const def = WEB_DEF[R.cls]; if (!def) return [];
    if (n.page != null) { const c = def.clusters[n.page]; return c ? c.majors.slice() : []; }
    if (n.hyb != null) { const h = def.hybrids[n.hyb]; return h ? [h] : []; }
    return [];
  }
  function keyLit(n) {
    if (!n || n.kind !== 'key') return false;
    const R = REGK[n.reg]; if (!R || R.cls !== P.cls) return false;
    return keyCards(n).some(c => typeof arcOf === 'function' && arcOf(c));
  }
  function anchors() {
    const out = new Set(), R = ownReg(); if (R) out.add(`w_${R.key}_root`);
    if (R) for (const id in N) { const n = N[id]; if (n.kind === 'key' && n.reg === R.key && keyLit(n)) out.add(id); else if (n.kind === 'card' && typeof arcOf === 'function' && arcOf(n.card)) out.add(id); }
    return out;
  }
  const isAnchor = (id, A) => (A || anchors()).has(id);
  const passable = (id, A) => { const n = N[id]; if (!n) return false; if (n.kind === 'key' || n.kind === 'card') return isAnchor(id, A); return true; };
  function reachable(id) {
    const n = N[id]; if (!isPeg(n) || tk(id)) return false; const A = anchors(); if (A.has(id)) return false;
    for (const l of n.links) if (A.has(l) || tk(l)) return true;
    return false;
  }
  // the cheapest road from what you hold to a knot: every knot on it that you don't hold yet, nearest first
  let pathCache = { key: '', path: null };
  function roadTo(id) {
    const n = N[id]; if (!isPeg(n) || tk(id)) return null;
    const A = anchors(); if (A.has(id)) return null;
    const ck = id + '|' + Object.keys(st().taken).join(',') + '|' + [...A].join(','); if (pathCache.key === ck) return pathCache.path;
    const par = new Map(), q = [];
    for (const a of A) { par.set(a, null); q.push(a); }
    for (const t in st().taken) if (st().taken[t] && N[t] && !par.has(t)) { par.set(t, null); q.push(t); }
    let found = false;
    for (let i = 0; i < q.length && !found; i++) {
      for (const l of N[q[i]].links) {
        if (par.has(l) || !passable(l, A)) continue;
        if (N[l].kind === 'key' || N[l].kind === 'card') continue;   // an untaken card is a wall; a taken one is already an anchor
        par.set(l, q[i]); q.push(l); if (l === id) { found = true; break; }
      }
    }
    let path = null;
    if (found) { path = []; let c = id; while (c && !tk(c) && !A.has(c)) { path.push(c); c = par.get(c); } path.reverse(); }
    pathCache = { key: ck, path }; return path;
  }
  // can a held knot be let go without leaving another hanging in the air?
  function canUntie(id) {
    if (!tk(id)) return false;
    // a knot that a taken card stands on cannot be let go (the card would hang in the air)
    for (const l of N[id].links) if (N[l] && N[l].kind === 'card' && typeof arcOf === 'function' && arcOf(N[l].card)) return false;
    const A = anchors(), t = st().taken, seen = new Set(), q = [...A];
    q.forEach(a => seen.add(a));
    for (let i = 0; i < q.length; i++) for (const l of N[q[i]].links) { if (seen.has(l) || l === id || !t[l]) continue; seen.add(l); q.push(l); }
    for (const k in t) if (t[k] && k !== id && !seen.has(k)) return false;
    return true;
  }
  // drop knots no longer tied to anything (a card given back at a full reset, an edited save)
  function prune() {
    const A = anchors(), t = st().taken, seen = new Set([...A]), q = [...A];
    for (let i = 0; i < q.length; i++) for (const l of N[q[i]].links) { if (seen.has(l) || !t[l]) continue; seen.add(l); q.push(l); }
    let n = 0; for (const k in t) if (!seen.has(k) || !isPeg(N[k])) { delete t[k]; n++; }
    return n;
  }
  const untieCost = () => 10 + 5 * Math.max(1, P.level | 0);

  // ------------------------------------------------------------------ sums (cached until the web changes)
  let sumsCache = null;
  function sums() {
    if (sumsCache && sumsCache.ver === ver && sumsCache.cls === P.cls) return sumsCache.s;
    const s = {}; for (const k in V) s[k] = 0;
    const t = st().taken;
    for (const id in t) { const n = N[id]; if (!t[id] || !isPeg(n) || !n.fx) continue; for (const k in n.fx) s[k] = (s[k] || 0) + n.fx[k]; }
    // attributes: at most two knots of each in the whole web, so this is already bounded; keep a hard cap anyway
    for (const k of ['vit', 'spi', 'con']) s[k] = Math.min(2, s[k]);
    s.evade = Math.min(8, s.evade);
    sumsCache = { ver, cls: P.cls, s }; return s;
  }
  let ver = 1;
  function changed(quiet) {
    ver++; pathCache.key = ''; st().pts = avail();
    try { D = derive(); P.hp = Math.min(P.hp, D.maxHp); P.mana = Math.min(P.mana, D.maxMana); } catch (e) { reportError && reportError(e); }
    if (!quiet) try { if (typeof save === 'function' && G.saveKey) save(); } catch (e) { }
  }
  function tie(id) {
    const path = roadTo(id); if (!path || !path.length) return false;
    const a = avail();
    if (path.length > a) { say(a > 0 ? `That road needs ${path.length} Minor Arcana; you have ${a}` : 'No Minor Arcana left to lay: one comes with each new level', 2); sfx(160, 0.12, 'square', 0.03, -40); return false; }
    for (const p of path) st().taken[p] = 1;
    changed(); sfx(520, 0.2, 'sine', 0.05, 180); if (path.length > 1) sfx(660, 0.25, 'sine', 0.03, 200);
    return true;
  }
  function untie(id) {
    if (!tk(id)) return false;
    if (!canUntie(id)) { say('Other Minor Arcana hang from this one: lift them first', 2); return false; }
    const c = untieCost();
    if ((P.gold | 0) < c) { say(`Lifting a Minor Arcanum costs ${c} gold`, 2); return false; }
    P.gold -= c; delete st().taken[id]; changed(); sfx(300, 0.2, 'sine', 0.04, -120); say(`Lifted for ${c} gold`, 1.4);
    return true;
  }
  function grant(n, why) {
    n = Math.max(0, n | 0); if (!n) return 0;
    st().bonus = (st().bonus | 0) + n; changed(true);
    try { banner(n > 1 ? `${n} MINOR ARCANA` : 'A MINOR ARCANUM', '#d9a441', 2.5); say(`${why || 'A gift'}: +${n} Minor Arcan${n > 1 ? 'a' : 'um'} for your body (press A)`, 3); } catch (e) { }
    return n;
  }

  // ------------------------------------------------------------------ derive: applied last, over every other file's tuning
  // open sky: whatever isOutdoor says (the act files extend it), plus the known outdoor themes of Acts 1-4 as a
  // fallback in case a wrapper is missing (Act 5 is inside the god's body: never open sky)
  const OPEN_SKY = { moor: 1, fen: 1, hollow_wood: 1, root_deep: 1, ossa: 1, ossa_town: 1, shogmire: 1, anvhar: 1 };
  function lit() { try { const z = G.zone; const out = (typeof isOutdoor === 'function' && isOutdoor(z)) || !!(z && OPEN_SKY[z.theme]); return out && !G.night; } catch (e) { return true; } }
  function frwEff(x) { const e = x <= 25 ? x : 25 + (Math.min(x, 80) - 25) * 0.6; return Math.min(40, e); }   // the walk-speed curve's own cap
  function install() {
    if (PW.installed || typeof derive !== 'function') return; PW.installed = true;
    const _d = derive;
    derive = function () {
      let S; try { S = sums(); } catch (e) { return _d.apply(this, arguments); }
      const bump = {}; let d;
      try { for (const k of ['vit', 'spi', 'con']) if (S[k] && P.attrs && P.attrs[k] != null) { P.attrs[k] += S[k]; bump[k] = S[k]; } d = _d.apply(this, arguments); }
      finally { for (const k in bump) P.attrs[k] -= bump[k]; }
      if (!d) return d;
      try {
        const sunK = S.sun && lit() ? S.sun : 0, moonK = S.moon && !lit() ? S.moon : 0;
        if (S.life) d.maxHp = Math.round(d.maxHp * (1 + S.life / 100));
        if (S.ess) d.maxMana = Math.round(d.maxMana * (1 + S.ess / 100));
        if (S.armor) d.armor = (d.armor || 0) + S.armor;
        if (S.poise && d.maxStam != null) d.maxStam = Math.round(d.maxStam + S.poise);
        if (S.prec && d.stamRegen) d.stamRegen *= 1 + S.prec / 100;
        if (S.dmg || sunK) d.dmgMult *= 1 + (S.dmg + sunK) / 100;
        if (S.melee || moonK) d.meleeMult *= 1 + (S.melee + moonK) / 100;
        const it = (() => { try { return itemStatSum(); } catch (e) { return {}; } })();
        if (S.fcr && d.castSpd) { const f = it.fcr || 0; d.castSpd *= (1 + (f + S.fcr) / 100) / (1 + f / 100); }
        if (S.frw && d.moveSpd) { const f = it.frw || 0; d.moveSpd *= (1 + frwEff(f + S.frw) / 100) / (1 + frwEff(f) / 100); }
        if (S.res) { d.res = Math.min(75, (d.res || 0) + S.res); if (d.resists && d.resists.magic != null) d.resists.magic = Math.min(75, d.resists.magic + S.res); }
        if (S.mf) d.mf = (d.mf || 0) + S.mf;
        if (S.lok) d.lok = (d.lok || 0) + S.lok;
        if (S.regen && d.manaRegen) d.manaRegen *= 1 + S.regen / 100;
        if (S.wisp && d.wispRegen) d.wispRegen /= 1 + S.wisp / 100;
        if (S.shard && d.shardCap > 0) d.shardCap += S.shard;
        d.webEvade = S.evade / 100; d.webBleed = S.bleed; d.webSick = S.sick;
      } catch (e) { reportError && reportError(e); }
      return d;
    };
    try { if (typeof window !== 'undefined' && window.__spm) Object.assign(window.__spm, { rederive: () => { D = derive(); return D; }, fullRespec, gainXp, poisonMon, addBleed }); } catch (e) { }
    // the panel: the Web tab replaces the card web while it is open (so no other file's hover reads the cards underneath)
    const _da = drawArcana;
    drawArcana = function () {
      if (!G.arcTab) G.arcTab = (typeof WEB_DEF !== 'undefined' && WEB_DEF[P.cls]) ? 'arcana' : 'web';
      if (G.arcTab === 'web') { try { drawWeb(); } catch (e) { reportError && reportError(e); } return; }
      const r = _da.apply(this, arguments);
      try { drawTabs(AP); } catch (e) { }
      return r;
    };
    try { if (G.running && P && P.attrs) D = derive(); } catch (e) { }
  }

  // ------------------------------------------------------------------ small hooks that don't depend on order
  if (typeof miasEvade === 'function') {
    const _me = miasEvade;
    miasEvade = function () {
      if (_me.apply(this, arguments)) return true;
      if (P.dead || !D || !(D.webEvade > 0)) return false;
      if (Math.random() < D.webEvade) { floatText(P.x, P.y, 'miss', '#a488c8'); return true; }
      return false;
    };
  }
  if (typeof addBleed === 'function') { const _ab = addBleed; addBleed = function (m, dps, t) { if (D && D.webBleed > 0 && dps > 0) dps *= 1 + D.webBleed / 100; return _ab.call(this, m, dps, t); }; }
  if (typeof poisonMon === 'function') { const _pm = poisonMon; poisonMon = function (m, dps) { const a = Array.prototype.slice.call(arguments); if (D && D.webSick > 0 && dps > 0) a[1] = dps * (1 + D.webSick / 100); return _pm.apply(this, a); }; }
  if (typeof updateDay === 'function') {
    const _ud = updateDay; let was = null;
    updateDay = function () { const r = _ud.apply(this, arguments); try { const l = lit(); if (l !== was) { was = l; const S = sums(); if ((S.sun || S.moon) && P.attrs) { D = derive(); P.hp = Math.min(P.hp, D.maxHp); } } } catch (e) { } return r; };
  }
  if (typeof gainXp === 'function') {
    const _gx = gainXp;
    gainXp = function () { const l0 = P.level; const r = _gx.apply(this, arguments); if (P.level > l0) { st().pts = avail(); say('Points to spend: stats (C), skills (S) and a Minor Arcanum (A)', 2.8); } return r; };
  }
  if (typeof fullRespec === 'function') {
    const _fr = fullRespec;
    fullRespec = function () { const r = _fr.apply(this, arguments); if (r) { st().taken = {}; changed(true); } return r; };
  }
  if (typeof applySave === 'function') {
    const _as = applySave;
    applySave = function (d) {
      const r = _as.apply(this, arguments);
      try {
        const w = st(); w.taken = {}; w.bonus = 0;
        const src = d && d.arc && d.arc.web;
        if (src && typeof src === 'object') { w.bonus = Math.max(0, src.bonus | 0); for (const k in (src.taken || {})) if (src.taken[k] && isPeg(N[k])) w.taken[k] = 1; }
        prune();
        // more knots tied than the level allows (an edited save): let go of the farthest until it fits
        let guard = 200; while (avail() < 0 && guard-- > 0) { const t = Object.keys(w.taken).filter(canUntie); if (!t.length) { w.taken = {}; break; } delete w.taken[t[t.length - 1]]; }
        w.pts = avail(); ver++;
      } catch (e) { reportError && reportError(e); }
      return r;
    };
  }

  // ------------------------------------------------------------------ the panel
  const view = { z: 9, cx: 0, cy: 0, init: '' };
  const VIEW_MIN = 5.2, VIEW_MAX = 30;
  function home(fit) {
    const R = ownReg();
    if (fit || !R) { view.z = 5.6; view.cx = -6; view.cy = 0.9; }
    else { const q = pol(7.2, R.ang); view.z = 11; view.cx = q.x; view.cy = q.y; }
    view.init = P.cls;
  }
  let vp = { x: 0, y: 0, w: 1, h: 1 }, hover = null, showSums = true;
  const toS = (x, y) => ({ x: vp.x + vp.w / 2 + (x - view.cx) * view.z, y: vp.y + vp.h / 2 + (y - view.cy) * view.z });
  const toW = (sx, sy) => ({ x: view.cx + (sx - vp.x - vp.w / 2) / view.z, y: view.cy + (sy - vp.y - vp.h / 2) / view.z });
  function zoomAt(sx, sy, k) {
    const w = toW(sx, sy); view.z = Math.max(VIEW_MIN, Math.min(VIEW_MAX, view.z * k));
    view.cx = w.x - (sx - vp.x - vp.w / 2) / view.z; view.cy = w.y - (sy - vp.y - vp.h / 2) / view.z; clampView();
  }
  function clampView() { const L = 17; view.cx = Math.max(-L, Math.min(L, view.cx)); view.cy = Math.max(-L, Math.min(L, view.cy)); }
  const isOpen = () => G.panels && G.panels.arcana && G.arcTab === 'web' && G.running !== false;
  function drawTabs(p) {
    const tabs = [['arcana', 'Arcana'], ['web', 'Web']]; let x = p.x + 176;
    for (const [id, lab] of tabs) {
      const w = tw(lab) + 10, on = G.arcTab === id || (!G.arcTab && id === 'arcana');
      ctx.fillStyle = '#0a090d'; ctx.fillRect(x - 1, p.y + 4, w + 2, 14);
      ctx.fillStyle = on ? '#3a3446' : '#1b1920'; ctx.fillRect(x, p.y + 5, w, 12);
      ctx.fillStyle = on ? '#d9a441' : '#2e2a36'; ctx.fillRect(x, p.y + 5, w, 1);
      txt(lab, x + 5, p.y + 14, on ? '#e8e2d0' : '#8f8a7c', 'left', false);
      if (id === 'web' && !on && avail() > 0) { ctx.fillStyle = '#d9a441'; ctx.fillRect(x + w - 4, p.y + 6, 3, 3); }
      if (id === 'arcana' && !on && P.arc && P.arc.pts > 0) { ctx.fillStyle = '#d9a441'; ctx.fillRect(x + w - 4, p.y + 6, 3, 3); }
      uiButton(x, p.y + 5, w, 12, () => { G.arcTab = id; hover = null; });
      x += w + 4;
    }
  }
  function nodeR(n, s) { return n.kind === 'notable' ? 5.2 * s : n.kind === 'root' ? 5 * s : n.kind === 'key' ? 5 * s : 3 * s; }
  function drawWeb() {
    const p = AP;
    if (view.init !== P.cls) home(false);
    ctx.fillStyle = '#0a090e'; ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#3a3446'; ctx.strokeRect(p.x + .5, p.y + .5, p.w - 1, p.h - 1);
    ctx.font = TITLE_FONT; ctx.textAlign = 'left'; ctx.fillStyle = '#e8e2d0'; ctx.fillText('The Long Web', p.x + 8, p.y + 17);
    const a = avail();
    txt(`Minor ${a}`, p.x + 318, p.y + 15, a > 0 ? '#d9a441' : '#6f6a79', 'left', false);
    txt(`${spent()} laid`, p.x + 390, p.y + 15, '#8f8a7c', 'left', false);
    txt('x', p.x + p.w - 10, p.y + 12, '#6f6a79'); uiButton(p.x + p.w - 14, p.y + 4, 12, 12, () => { G.panels.arcana = false; });
    drawTabs(p);
    vp = { x: p.x + 4, y: p.y + 22, w: p.w - 8, h: p.h - 36 };
    // swallow clicks on the web itself (our own listeners do the work, so a drag never ties a knot)
    uiButton(vp.x, vp.y, vp.w, vp.h, () => { }, () => { });
    ctx.fillStyle = '#07060a'; ctx.fillRect(vp.x, vp.y, vp.w, vp.h);
    ctx.save(); ctx.beginPath(); ctx.rect(vp.x, vp.y, vp.w, vp.h); ctx.clip();
    const z = view.z, s = Math.max(0.62, Math.min(1.6, z / 10)), t = G.time || 0, A = anchors(), T = st().taken;
    // the ground: faint rings and the star between the five gates
    const o = toS(0, 0);
    ctx.strokeStyle = 'rgba(180,138,217,0.06)'; for (const r of [2.3, 4.2, 8, 12, 14.3]) { ctx.beginPath(); ctx.arc(o.x, o.y, r * z, 0, 6.29); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(180,138,217,0.09)'; ctx.beginPath();
    for (let i = 0; i <= 5; i++) { const q = pol(4.2, -90 + (i * 2 % 5) * 72), S2 = toS(q.x, q.y); i ? ctx.lineTo(S2.x, S2.y) : ctx.moveTo(S2.x, S2.y); } ctx.stroke();
    for (const R of REG) {
      const q = pol(15, R.ang), S2 = toS(q.x, q.y), own = R.cls === P.cls, c = Math.cos(R.ang * D2R);
      const al = c > 0.3 ? 'left' : c < -0.3 ? 'right' : 'center', ly = z < 8 ? Math.max(vp.y + 9, Math.min(vp.y + vp.h - 12, S2.y + 3)) : S2.y + 3;
      ctx.globalAlpha = own ? 0.95 : 0.55; txt(R.name.toUpperCase(), S2.x, ly, own ? R.col : '#6f6a79', al, false); ctx.globalAlpha = 1;
      if (z >= 11) txt(R.who, S2.x, ly + 9, '#4a4556', al, false);
    }
    // hover: the nearest node under the mouse
    hover = null; let hd = 1e9;
    if (inRect(mouse, vp.x, vp.y, vp.w, vp.h) && !(drag && drag.moved)) for (const id in N) { const n = N[id], q = toS(n.x, n.y), d = Math.hypot(q.x - mouse.x, q.y - mouse.y), rr = Math.max(4.5, nodeR(n, s) + 2); if (d < rr && d < hd) { hd = d; hover = id; } }
    const road = hover && isPeg(N[hover]) && !T[hover] && !A.has(hover) ? roadTo(hover) : null, onRoad = new Set(road || []);
    // links
    const drawn = new Set();
    for (const id in N) for (const l of N[id].links) {
      const key = id < l ? id + '|' + l : l + '|' + id; if (drawn.has(key)) continue; drawn.add(key);
      const a1 = N[id], b1 = N[l], qa = toS(a1.x, a1.y), qb = toS(b1.x, b1.y);
      if (Math.max(qa.x, qb.x) < vp.x - 5 || Math.min(qa.x, qb.x) > vp.x + vp.w + 5 || Math.max(qa.y, qb.y) < vp.y - 5 || Math.min(qa.y, qb.y) > vp.y + vp.h + 5) continue;
      const ha = T[id] || A.has(id), hb = T[l] || A.has(l), ra = onRoad.has(id) || id === hover, rb = onRoad.has(l) || l === hover;
      const keyLink = a1.kind === 'key' || b1.kind === 'key';
      if (ha && hb) { ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 2; }
      else if ((ra && (rb || hb)) || (rb && ha)) { ctx.strokeStyle = `rgba(240,224,176,${0.65 + 0.3 * Math.sin(t * 6)})`; ctx.lineWidth = 1.6; }
      else if (ha || hb) { ctx.strokeStyle = 'rgba(217,164,65,0.4)'; ctx.lineWidth = 1; }
      else { ctx.strokeStyle = keyLink ? 'rgba(180,138,217,0.18)' : '#2a2632'; ctx.lineWidth = 1; }
      ctx.beginPath(); ctx.moveTo(qa.x, qa.y); ctx.lineTo(qb.x, qb.y); ctx.stroke();
    }
    ctx.lineWidth = 1;
    // nodes
    for (const id in N) {
      const n = N[id], q = toS(n.x, n.y), r = nodeR(n, s);
      if (q.x < vp.x - 12 || q.x > vp.x + vp.w + 12 || q.y < vp.y - 12 || q.y > vp.y + vp.h + 12) continue;
      const held = !!T[id] || A.has(id), can = !held && isPeg(n) && reachable(id), path = onRoad.has(id);
      if (n.kind === 'key') {
        const R = REGK[n.reg], own = R && R.cls === P.cls, on = keyLit(n), cards = keyCards(n);
        if (on) glow(q.x, q.y, 12 * s, '217,190,120', 0.35);
        if (own && cards.length && typeof drawCardGlyph === 'function') {
          const c = ARC[cards.find(k => arcOf(k)) || cards[0]] || { cls: P.cls }, held1 = cards.find(k => arcOf(k));
          drawCardGlyph(q.x, q.y, c, held1 || cards[0], held1 ? arcOf(held1) : 0, on);
          if (on) { ctx.strokeStyle = '#d9a441'; ctx.strokeRect(Math.round(q.x) - 5.5, Math.round(q.y) - 7.5, 11, 15); }
        } else {
          const k = 4.2 * s; ctx.fillStyle = '#0a090d'; ctx.beginPath(); ctx.moveTo(q.x, q.y - k - 1.5); ctx.lineTo(q.x + k + 1.5, q.y); ctx.lineTo(q.x, q.y + k + 1.5); ctx.lineTo(q.x - k - 1.5, q.y); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = own ? '#6a5a7a' : '#3a3446'; ctx.beginPath(); ctx.moveTo(q.x, q.y - k); ctx.lineTo(q.x + k, q.y); ctx.lineTo(q.x, q.y + k); ctx.lineTo(q.x - k, q.y); ctx.closePath(); ctx.stroke();
        }
      } else if (n.kind === 'root') {
        const R = REGK[n.reg], own = R && R.cls === P.cls;
        if (own) glow(q.x, q.y, 14 * s, R.rgb, 0.3);
        ctx.fillStyle = '#0a090d'; ctx.beginPath(); ctx.arc(q.x, q.y, r + 1.5, 0, 6.29); ctx.fill();
        ctx.strokeStyle = held ? R.col : can || path ? '#8f7a55' : '#3a3446'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 6.29); ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = held ? R.col : '#3a3446'; ctx.beginPath(); ctx.arc(q.x, q.y, r * 0.42, 0, 6.29); ctx.fill();
        for (let j = 0; j < 4; j++) { const a2 = j * Math.PI / 2 + Math.PI / 4; ctx.fillStyle = held ? R.col : '#3a3446'; ctx.fillRect(Math.round(q.x + Math.cos(a2) * (r + 2.5)) - 0.5, Math.round(q.y + Math.sin(a2) * (r + 2.5)) - 0.5, 1.2, 1.2); }
      } else if (n.kind === 'notable') {
        if (can || path) glow(q.x, q.y, 12 * s, '217,164,65', 0.2 + 0.12 * Math.sin(t * 4));
        if (held) glow(q.x, q.y, 13 * s, '217,190,120', 0.4);
        ctx.fillStyle = '#0a090d'; ctx.beginPath(); ctx.arc(q.x, q.y, r + 1.6, 0, 6.29); ctx.fill();
        ctx.strokeStyle = held ? '#d9a441' : path ? '#f0e0b0' : can ? '#8f7a55' : '#4a4556'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 6.29); ctx.stroke();
        ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(q.x, q.y, r * 0.66, 0, 6.29); ctx.stroke();
        ctx.fillStyle = held ? '#e8d6a0' : '#231f2a'; ctx.beginPath(); ctx.arc(q.x, q.y, r * 0.5, 0, 6.29); ctx.fill();
        const k0 = Object.keys(n.fx)[0]; ctx.fillStyle = FXC[k0] || '#fff'; ctx.globalAlpha = held ? 1 : 0.6; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(1, r * 0.24), 0, 6.29); ctx.fill(); ctx.globalAlpha = 1;
        if (z >= 15) txt(n.name, q.x, q.y + r + 9, held ? '#e8d6a0' : '#8f8a7c', 'center', false);
      } else {
        if (can) glow(q.x, q.y, 8 * s, '217,164,65', 0.14 + 0.1 * Math.sin(t * 4));
        ctx.fillStyle = '#0a090d'; ctx.beginPath(); ctx.arc(q.x, q.y, r + 1.2, 0, 6.29); ctx.fill();
        ctx.fillStyle = held ? '#d9a441' : path ? '#f0e0b0' : can ? '#6f6250' : '#2a2632'; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, 6.29); ctx.fill();
        ctx.fillStyle = FXC[n.stat] || '#fff'; ctx.globalAlpha = held ? 1 : 0.5; ctx.beginPath(); ctx.arc(q.x, q.y, Math.max(0.8, r * 0.42), 0, 6.29); ctx.fill(); ctx.globalAlpha = 1;
      }
      if (id === hover) { ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.arc(q.x, q.y, r + 3, 0, 6.29); ctx.stroke(); }
    }
    // the sums of what you hold
    if (showSums) {
      const S = sums(), lines = []; for (const k in FXT) if (S[k]) lines.push([shortFx(k, S[k]), FXC[k]]);
      if (lines.length) {
        const w = Math.min(200, Math.max(tw('The web gives'), ...lines.map(l => tw(l[0]))) + 14), h = lines.length * 9 + 14, x0 = vp.x + 2, y0 = vp.y + vp.h - h - 2;
        ctx.fillStyle = 'rgba(10,9,14,0.85)'; ctx.fillRect(x0, y0, w, h); ctx.strokeStyle = '#2e2a36'; ctx.strokeRect(x0 + .5, y0 + .5, w - 1, h - 1);
        txt('The web gives', x0 + 4, y0 + 9, '#8f8a7c', 'left', false);
        lines.forEach((l, i) => { ctx.fillStyle = l[1]; ctx.fillRect(x0 + 4, y0 + 15 + i * 9, 2, 2); txt(l[0], x0 + 9, y0 + 18 + i * 9, '#c8c2b0', 'left', false); });
      }
    }
    ctx.restore();
    // footer: controls
    const fy = p.y + p.h - 5;
    txt(`drag, wheel · click: lay · right-click: lift, ${untieCost()} gold`, p.x + 6, fy, '#5a5563', 'left', false);
    let bx = p.x + p.w - 6;
    for (const [lab, fn] of [['Whole web', () => home(true)], ['Mine', () => home(false)], [showSums ? 'Hide sums' : 'Sums', () => { showSums = !showSums; }]]) { const w = tw(lab) + 8; bx -= w; smallBtn(lab, bx, p.y + p.h - 14, fn); bx -= 3; }
    // the reader, as a tooltip
    if (hover) tooltip = tipFor(hover, road);
  }
  function kindLabel(n) {
    if (n.kind === 'root') { const R = REGK[n.reg]; return R.cls === P.cls ? `Where the ${R.who} begins` : `The ${R.who}'s gate`; }
    if (n.kind === 'notable') return 'A great Minor Arcanum · ' + (n.area || '');
    return 'A Minor Arcanum · ' + (n.area || '');
  }
  function tipFor(id, road) {
    const n = N[id], out = [];
    if (n.kind === 'key') {
      const R = REGK[n.reg], own = R && R.cls === P.cls, cards = keyCards(n);
      const nm = own && cards.length ? (n.hyb != null ? (ARC[cards[0]] || {}).name || 'A hybrid' : (tabNames()[(WEB_DEF[P.cls].clusters[n.page] || {}).page] || 'A page') + ': the Majors') : `A keystone of the ${R.who}`;
      out.push([nm, '#e8d6a0', { dk: 'web' }]);
      if (own && cards.length) {
        out.push([n.hyb != null ? 'Keystone · a hybrid Major Arcanum' : 'Keystone · Major Arcana', '#6f6a79']);
        for (const c of cards) out.push([(ARC[c] ? ARC[c].name : c) + (arcOf(c) ? ' (held)' : ''), arcOf(c) ? '#e8e2d0' : '#6f6a79']);
        out.push([keyLit(n) ? 'Lit: a road may begin here' : 'Set one of these in the Arcana tab and a road may begin here', keyLit(n) ? '#d9a441' : '#a39d8c']);
      } else out.push([R && R.cls === P.cls ? 'This keystone is not yet written for you.' : `Only a ${R.who} can light it.`, '#6f6a79']);
      return out;
    }
    out.push([n.name, n.kind === 'notable' ? '#e8d6a0' : n.kind === 'root' ? (REGK[n.reg] || {}).col || '#e8e2d0' : '#e8e2d0', { dk: 'web' }]);
    out.push([kindLabel(n), '#6f6a79']);
    const fx = Object.keys(n.fx || {});
    if (fx.length) for (const k of fx) out.push([FXT[k](n.fx[k]), '#8f9cff']);
    else out.push(['A gate. It gives nothing but the way through.', '#a39d8c']);
    if (n.lore) out.push([n.lore, '#7f7a6c']);
    const A = anchors();
    if (A.has(id)) out.push(['Your road begins here', '#d9a441']);
    else if (tk(id)) out.push([canUntie(id) ? `Laid · right-click to lift (${untieCost()} gold)` : 'Laid · other Minor Arcana hang from it', '#d9a441']);
    else if (road && road.length) { const a = avail(); out.push([road.length === 1 ? `Click to lay (1 Minor Arcanum · ${a} left)` : `Click to lay the road: ${road.length} Minor Arcana (${a} left)`, road.length <= a ? '#e8e2d0' : '#c8553d']); }
    else out.push(['No road reaches it', '#c8553d']);
    return out;
  }

  // ------------------------------------------------------------------ mouse: drag to pan, wheel to zoom, click to tie
  let drag = null;
  const lpos = e => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * W / r.width, y: (e.clientY - r.top) * H / r.height }; };
  const inVp = m => m.x >= vp.x && m.x < vp.x + vp.w && m.y >= vp.y && m.y < vp.y + vp.h;
  try {
    cv.addEventListener('mousedown', e => { if (!isOpen() || G.paused) return; const m = lpos(e); if (!inVp(m)) return; drag = { x0: m.x, y0: m.y, cx0: view.cx, cy0: view.cy, moved: false, b: e.button }; });
    addEventListener('mousemove', e => { if (!drag) return; if (!isOpen()) { drag = null; return; } const m = lpos(e), dx = m.x - drag.x0, dy = m.y - drag.y0; if (!drag.moved && Math.hypot(dx, dy) > 2.5) drag.moved = true; if (drag.moved) { view.cx = drag.cx0 - dx / view.z; view.cy = drag.cy0 - dy / view.z; clampView(); } });
    addEventListener('mouseup', e => {
      const d = drag; drag = null; if (!d || d.moved || !isOpen()) return;
      const m = lpos(e); mouse.x = m.x; mouse.y = m.y;
      const s = Math.max(0.62, Math.min(1.6, view.z / 10)); let best = null, bd = 1e9;
      for (const id in N) { const n = N[id], q = toS(n.x, n.y), dd = Math.hypot(q.x - m.x, q.y - m.y), rr = Math.max(4.5, nodeR(n, s) + 2); if (dd < rr && dd < bd) { bd = dd; best = id; } }
      if (!best) return;
      if (d.b === 2) untie(best); else if (d.b === 0) { if (N[best].kind === 'key') { G.arcTab = 'arcana'; return; } tie(best); }
    });
    cv.addEventListener('wheel', e => { if (!isOpen()) return; const m = lpos(e); if (!inVp(m)) return; e.preventDefault(); zoomAt(m.x, m.y, e.deltaY < 0 ? 1.18 : 1 / 1.18); }, { passive: false });
    addEventListener('keydown', e => {
      if (!isOpen()) return; const k = e.key;
      if (k === '+' || k === '=') zoomAt(vp.x + vp.w / 2, vp.y + vp.h / 2, 1.25);
      else if (k === '-' || k === '_') zoomAt(vp.x + vp.w / 2, vp.y + vp.h / 2, 0.8);
      else if (k === '0') home(false);
    });
  } catch (e) { }

  setTimeout(install, 0);
  const api = { N, REG, BRIDGE, COUNT, V, FXT, st, earned, spent, avail, sums, roadTo, tie, untie, canUntie, anchors, keyLit, grant, prune, view, home, zoomAt, install, untieCost, lit, setTab: t => { G.arcTab = t; }, installed: false, get vp() { return vp; } };
  return api;
})();
try { if (typeof window !== 'undefined') { window.webGrantPoints = webGrantPoints; window.__web = PW; } } catch (e) { }
