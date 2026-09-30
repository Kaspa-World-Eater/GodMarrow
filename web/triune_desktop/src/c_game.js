
// =================================================================== audio
let actx = null, muted = false;
function sfx(freq, dur = 0.08, type = 'square', vol = 0.04, slide = 0) {
  if (muted || !actx) return;
  try {
    const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + 0.02);
  } catch (e) { /* audio is optional */ }
}

// =================================================================== monsters
const MON = {
  // v0.22: the Act I bestiary (see the world bible). Nothing here is an animal: everything grew out of the dead god.
  hollow: { name: 'Husk', spr: 'hollow', hp: 20, dmg: [3, 7], spd: 1.9, r: .3, xp: 12, ai: 'husk', range: .95, wind: .5, rec: .7, poiseK: .5 },
  hound: { name: 'Tithe-Hand', spr: 'hand', hp: 13, dmg: [2, 5], spd: 3.4, r: .28, xp: 11, ai: 'flank', range: .85, wind: .26, rec: .45, poiseK: .4 },
  archer: { name: 'Weeper', spr: 'weeper', hp: 15, dmg: [3, 6], spd: 1.8, r: .28, xp: 15, ai: 'kiter', wind: .75, poiseK: .4 },
  caster: { name: 'Gasp', spr: 'gasp', hp: 17, dmg: [5, 9], spd: 1.5, r: .28, xp: 20, ai: 'ghost', wind: .9, poiseK: .3 },
  bloat: { name: 'Gravebloat', spr: 'bloat', hp: 28, dmg: [10, 16], spd: 1.4, r: .36, xp: 18, ai: 'bomber', wind: .8, poiseK: .8 },
  knight: { name: 'Ossuary Warden', spr: 'warden', hp: 44, dmg: [7, 12], spd: 1.7, r: .34, xp: 30, ai: 'shield', range: 1.0, wind: .6, rec: .8, armor: 30, poiseK: .9 },
  pyre: { name: 'Pyre-Saint', spr: 'pyre', hp: 26, dmg: [6, 10], spd: 1.55, r: .3, xp: 22, ai: 'pyre', wind: .9, poiseK: .6 },
  bell: { name: 'Bellwether', spr: 'bell', hp: 70, dmg: [9, 15], spd: 1.3, r: .5, xp: 45, ai: 'charger', range: 1.2, wind: .7, rec: 1, armor: 20, poiseK: 1.1 },
  worm: { name: 'Vein-Borer', spr: 'worm', hp: 22, dmg: [4, 8], spd: 3.0, r: .3, xp: 18, ai: 'burrow', range: 1.3, wind: .35, poiseK: .5 },
  moth: { name: 'Wick-Saint', spr: 'moth', hp: 14, dmg: [4, 7], spd: 2.6, r: .3, xp: 17, ai: 'flyer', wind: .45, poiseK: .3 },
  boss: { name: 'The Carrion Warden', spr: 'boss', hp: 300, dmg: [14, 22], spd: 2.1, r: .6, xp: 900, ai: 'boss' },
  drowned: { name: 'Drowned Husk', spr: 'hollow', tint: '#2f6a5a', hp: 26, dmg: [4, 8], spd: 1.7, r: .3, xp: 16, ai: 'husk', range: .95, wind: .55, rec: .7, poiseK: .5 },
  leech: { name: 'Mire Vein-Borer', spr: 'worm', tint: '#3a5a4a', hp: 24, dmg: [4, 8], spd: 3.2, r: .3, xp: 18, ai: 'burrow', range: 1.3, wind: .35, poiseK: .5 },
  bogwitch: { name: 'Mire Gasp', spr: 'gasp', tint: '#4f7a5a', hp: 20, dmg: [6, 10], spd: 1.5, r: .28, xp: 22, ai: 'ghost', wind: .8, poiseK: .3 },
  marrow: { name: 'Marrow Duelist', spr: 'duelist', hp: 50, dmg: [8, 14], spd: 2.2, r: .32, xp: 34, ai: 'duelist', range: 1.05, wind: .45, rec: .6, armor: 30, poiseK: .7 },
  ossarcher: { name: 'Ossuary Weeper', spr: 'weeper', tint: '#f0ead8', hp: 18, dmg: [4, 8], spd: 1.9, r: .28, xp: 18, ai: 'kiter', wind: .65, poiseK: .4 },
  matron: { name: 'The Ossuary Matron', spr: 'boss', tint: '#e8e2d0', hp: 420, dmg: [18, 28], spd: 2.2, r: .6, xp: 2400, ai: 'boss', summon: ['marrow', 'ossarcher'] }
};
const UNAME_A = ['Gnash', 'Sorrow', 'Mire', 'Ash', 'Grim', 'Rot', 'Pale', 'Bitter', 'Hush', 'Dusk'];
const UNAME_B = ['maw', 'hide', 'wail', 'fang', 'shroud', 'born', 'gut', 'thorn', 'rattle', 'moan'];
const UNAME_C = ['the Hungry', 'the Wretched', 'the Unburied', 'the Cold', 'the Drowned', 'the Foul', 'the Patient'];
function makeMon(type, x, y, mlvl, rank, mods) {
  const b = MON[type];
  // v0.13: enemies are tougher and hit harder
  // v0.18: the opening is 35% gentler (monster levels 1-5), easing back to full strength by level 15
  // v0.20: another 30% off the opening (0.65 x 0.7), still easing back to full strength by level 15
  const ease = mlvl <= 5 ? 0.455 : mlvl >= 15 ? 1 : 0.455 + 0.545 * (mlvl - 5) / 10;
  const hm = (1 + 0.35 * (mlvl - 1)) * 1.6 * ease, dm = (1 + 0.2 * (mlvl - 1)) * 1.35 * ease;
  const m = {
    type, b, x, y, hx: x, hy: y, mlvl, rank, mods: mods || [], r: b.r, spd: b.spd,
    dmg: [b.dmg[0] * dm, b.dmg[1] * dm], xp: Math.round(b.xp * (1 + 0.3 * (mlvl - 1))),
    state: 'idle', t: 0, cd: Math.random(), face: 1, hurt: 0, dead: false, path: null, repath: 0,
    name: b.name, armor: b.armor || 0, aim: { x: 1, y: 0 }, target: { x, y }, phase: 1
  };
  let hp = b.hp * hm;
  if (rank === 'champion') { hp *= 2.5; m.dmg = m.dmg.map(v => v * 1.4); m.xp *= 3; m.spd *= 1.1; m.name = 'Champion ' + b.name; }
  if (rank === 'unique') { hp *= 4; m.dmg = m.dmg.map(v => v * 1.7); m.xp *= 5; m.name = pick(UNAME_A) + pick(UNAME_B) + ' ' + pick(UNAME_C); }
  if (rank === 'minion') { hp *= 1.3; }
  if (rank !== 'normal' && rank !== 'boss') for (const md of m.mods) {
    if (md === 'Extra Fast') m.spd *= 1.4;
    if (md === 'Extra Strong') m.dmg = m.dmg.map(v => v * 1.5);
    if (md === 'Stone Skin') m.armor += 80;
  }
  m.hp = m.max = Math.round(hp);
  return m;
}

// =================================================================== items
const BASES = {
  wand: { name: 'Bone Wand', slot: 'weapon', w: 1, h: 2, dmg: [2, 5], lvl: 1, icon: 'wand' },
  dagger: { name: 'Ritual Knife', slot: 'weapon', w: 1, h: 2, dmg: [3, 7], lvl: 3, icon: 'dagger' },
  staff: { name: 'Grave Staff', slot: 'weapon', w: 1, h: 3, dmg: [5, 10], lvl: 6, icon: 'staff' },
  claw: { name: 'Vharn Claws', slot: 'weapon', w: 1, h: 2, dmg: [3, 6], lvl: 1, icon: 'claw', claw: true, cls: 'miasmancer' },
  talons: { name: 'Grave-Hooks', slot: 'weapon', w: 1, h: 3, dmg: [6, 11], lvl: 6, icon: 'talons', claw: true, cls: 'miasmancer' },
  relic: { name: 'Skull Relic', slot: 'offhand', w: 2, h: 2, armor: [2, 5], lvl: 1, icon: 'relic' },
  hood: { name: 'Mourning Hood', slot: 'head', w: 2, h: 2, armor: [3, 6], lvl: 1, icon: 'hood' },
  mask: { name: 'Bone Mask', slot: 'head', w: 2, h: 2, armor: [7, 11], lvl: 5, icon: 'mask' },
  robe: { name: 'Ash Robe', slot: 'body', w: 2, h: 3, armor: [6, 12], lvl: 1, icon: 'robe' },
  mail: { name: 'Grave Mail', slot: 'body', w: 2, h: 3, armor: [15, 24], lvl: 6, icon: 'mail' },
  gloves: { name: 'Wrappings', slot: 'hands', w: 2, h: 2, armor: [1, 3], lvl: 1, icon: 'gloves' },
  boots: { name: 'Grave Boots', slot: 'feet', w: 2, h: 2, armor: [2, 4], lvl: 1, icon: 'boots' },
  belt: { name: 'Cord Belt', slot: 'waist', w: 2, h: 1, armor: [1, 3], lvl: 1, icon: 'belt' },
  amulet: { name: 'Amulet', slot: 'neck', w: 1, h: 1, lvl: 3, icon: 'amulet' },
  ring: { name: 'Ring', slot: 'ring', w: 1, h: 1, lvl: 2, icon: 'ring' }
};
const AFFIX = [
  { n: 'Sturdy', p: 1, s: 'life', r: [5, 15], l: 1 }, { n: 'Stalwart', p: 1, s: 'life', r: [16, 32], l: 6 },
  { n: 'Lucid', p: 1, s: 'mana', r: [5, 12], l: 1 }, { n: 'Brimming', p: 1, s: 'mana', r: [13, 26], l: 6 },
  { n: 'Keen', p: 1, s: 'dmg', r: [3, 8], l: 1, rare: true, w: 0.12 }, { n: 'Cruel', p: 1, s: 'dmg', r: [9, 15], l: 8, rare: true, w: 0.06 },
  { n: 'Warded', p: 1, s: 'armor', r: [5, 15], l: 1 }, { n: 'Bulwark', p: 1, s: 'armor', r: [16, 30], l: 6 },
  { n: 'Haunted', p: 1, s: 'wisp', r: [1, 1], l: 5, rare: true, only: ['weapon', 'offhand', 'neck', 'head'] }, { n: 'Legion', p: 1, s: 'wisp', r: [1, 2], l: 10, rare: true, only: ['weapon', 'offhand', 'neck'] },
  { n: 'of the Mountain', p: 0, s: 'con', r: [2, 5], l: 1 }, { n: 'of the Yoke', p: 0, s: 'vit', r: [2, 6], l: 1 },
  { n: 'of Essence', p: 0, s: 'spi', r: [2, 6], l: 1 },
  { n: 'of Speed', p: 0, s: 'frw', r: [5, 15], l: 1, only: ['feet'] },
  { n: 'of Incantation', p: 0, s: 'fcr', r: [10, 20], l: 2, only: ['weapon', 'offhand', 'neck', 'ring', 'hands'] },
  { n: 'of Regrowth', p: 0, s: 'regen', r: [10, 30], l: 3 },
  { n: 'of Warding', p: 0, s: 'res', r: [5, 15], l: 1 },
  { n: 'of Fortune', p: 0, s: 'mf', r: [5, 20], l: 1 },
  { n: 'of the Open Vein', p: 0, s: 'lok', r: [1, 3], l: 2 },
  // +skills, as in D2: one page, or everything
  { n: 'Adept', p: 1, s: 'skt0', r: [1, 1], l: 6, only: ['weapon', 'offhand', 'head', 'neck'] }, { n: 'Scholarly', p: 1, s: 'skt1', r: [1, 1], l: 6, only: ['weapon', 'offhand', 'head', 'neck'] }, { n: 'Hierophantic', p: 1, s: 'skt2', r: [1, 1], l: 6, only: ['weapon', 'offhand', 'head', 'neck'] },
  { n: 'Exalted', p: 1, s: 'skall', r: [1, 1], l: 12, rare: true, only: ['weapon', 'neck'] },
  // the three elements, carried on your weapon attacks
  { n: 'of Embers', p: 0, s: 'fire', r: [2, 5], l: 1, only: ['weapon', 'hands', 'ring', 'neck'] }, { n: 'of the Pyre', p: 0, s: 'fire', r: [6, 12], l: 8, only: ['weapon', 'hands', 'ring', 'neck'] },
  { n: 'of Frost', p: 0, s: 'cold', r: [2, 4], l: 1, only: ['weapon', 'hands', 'ring', 'neck'] }, { n: 'of Rime', p: 0, s: 'cold', r: [5, 10], l: 8, only: ['weapon', 'hands', 'ring', 'neck'] },
  { n: 'of Venom', p: 0, s: 'psn', r: [3, 8], l: 1, only: ['weapon', 'hands', 'ring', 'neck'] }, { n: 'of the Plague', p: 0, s: 'psn', r: [9, 18], l: 8, only: ['weapon', 'hands', 'ring', 'neck'] },
  { n: 'of Sparks', p: 0, s: 'ltng', r: [1, 6], l: 1, only: ['weapon', 'hands', 'ring', 'neck'] }, { n: 'of the Storm', p: 0, s: 'ltng', r: [4, 14], l: 8, only: ['weapon', 'hands', 'ring', 'neck'] }
];
const STAT_TEXT = {
  life: '+# to Life', mana: '+# to Maximum Essence', dmg: '+#% Skill Damage', armor: '+# Armor', wisp: '+# to Maximum Wisps',
  con: '+# to Constitution', dex: '+# to Constitution', vit: '+# to Vitality', ene: '+# to Essence', spi: '+# to Essence', frw: '+#% Faster Movement',
  fcr: '+#% Faster Cast Rate', fire: '+# Fire Damage to weapon attacks (burns)', cold: '+# Cold Damage to weapon attacks (chills)', ltng: '+# Lightning Damage to weapon attacks (stuns, arcs)', psn: '+# Miasma Damage over 3 s to weapon attacks', skall: '+# to All Skills', regen: '+#% Faster Wisp Regrowth', res: '+#% Magic Resist', mf: '+#% Better Chance of Magic Items', lok: '+# Life after each Kill'
};
const UNIQUES = [
  { name: "Lanternkeeper's Hood", base: 'hood', stats: { life: 20, wisp: 1, res: 10 }, lvl: 3 },
  { name: 'The Hollow Choir', base: 'amulet', stats: { wisp: 1, regen: 30, spi: 5 }, lvl: 5 },
  { name: "Warden's Ribcage", base: 'mail', stats: { armor: 40, life: 30, frw: -5 }, lvl: 7 },
  { name: 'Whisperbone', base: 'wand', stats: { dmg: 12, fcr: 20, wisp: 1 }, lvl: 3 },
  { name: 'Grave-Walkers', base: 'boots', stats: { frw: 25, con: 5, res: 10 }, lvl: 4 },
  { name: 'Knot of Sorrows', base: 'ring', stats: { mana: 20, lok: 3, dmg: 6 }, lvl: 4 }
];
const RARE_A = ['Grim', 'Ash', 'Hollow', 'Dread', 'Pale', 'Carrion', 'Bone', 'Mourn', 'Wraith', 'Cinder'];
const RARE_B = { weapon: ['Whisper', 'Spike', 'Call'], offhand: ['Ward', 'Idol', 'Eye'], head: ['Cowl', 'Visage', 'Crown'], body: ['Shroud', 'Hide', 'Shell'], hands: ['Grip', 'Claw', 'Touch'], feet: ['Stride', 'Tread', 'Path'], waist: ['Cord', 'Coil', 'Lash'], neck: ['Charm', 'Heart', 'Knot'], ring: ['Loop', 'Band', 'Coil'] };
const QCOL = { normal: '#d6d2c8', magic: '#8b95ff', rare: '#f1e05a', unique: '#c9a45a', potion: '#d6d2c8' };
let itemUid = 1;
function pickW(list) { let t = 0; for (const a of list) t += a.w || 1; let r = Math.random() * t; for (const a of list) { r -= a.w || 1; if (r <= 0) return a; } return list[list.length - 1]; }
function affixPool(base, ilvl, pre, rare) { return AFFIX.filter(a => a.p === pre && a.l <= ilvl + 1 && (!a.only || a.only.includes(base.slot)) && (!a.rare || rare)); }
function newBaseItem(baseId) {
  const b = BASES[baseId];
  const it = { uid: itemUid++, base: baseId, q: 'normal', name: b.name, w: b.w, h: b.h, stats: {}, lvl: 1 };
  if (b.armor) it.armor = randi(b.armor[0], b.armor[1]);
  if (b.dmg) it.dmg = [b.dmg[0], b.dmg[1]];
  return it;
}
function rollItem(ilvl, mf = 0) {
  const pool = Object.keys(BASES).filter(k => BASES[k].lvl <= ilvl + 1 && (!BASES[k].cls || BASES[k].cls === P.cls));
  let baseId = pick(pool);
  const m = 1 + mf / 100, r = Math.random();
  let q = r < 0.012 * m ? 'unique' : r < 0.075 * m ? 'rare' : r < 0.36 * m ? 'magic' : 'normal';
  if (q === 'unique') {
    const us = UNIQUES.filter(u => u.lvl <= ilvl + 2);
    if (us.length) {
      const u = pick(us); const it = newBaseItem(u.base);
      it.q = 'unique'; it.name = u.name; it.stats = { ...u.stats }; it.lvl = u.lvl;
      if (it.armor) it.armor = Math.round(it.armor * 1.3);
      return it;
    }
    q = 'rare';
  }
  const it = newBaseItem(baseId), b = BASES[baseId];
  it.q = q; it.lvl = Math.max(1, b.lvl);
  const capDmg = () => { if (it.stats.dmg > 15) it.stats.dmg = 15; };
  const add = (a) => { const v = randi(a.r[0], a.r[1]); it.stats[a.s] = (it.stats[a.s] || 0) + v; it.lvl = Math.max(it.lvl, a.l); };
  if (q === 'magic') {
    let pre = null, suf = null;
    if (Math.random() < .7) { pre = pickW(affixPool(b, ilvl, 1)); add(pre); }
    if (!pre || Math.random() < .6) { suf = pickW(affixPool(b, ilvl, 0)); add(suf); }
    it.name = (pre ? pre.n + ' ' : '') + b.name + (suf ? ' ' + suf.n : '');
  } else if (q === 'rare') {
    const n = randi(3, Math.min(6, 3 + Math.floor(ilvl / 3)));
    const pres = affixPool(b, ilvl, 1, true), sufs = affixPool(b, ilvl, 0, true), usedS = new Set();
    for (let i = 0; i < n; i++) {
      const src = i % 2 ? sufs : pres; const cands = src.filter(a => !usedS.has(a.s));
      if (!cands.length) continue; const a = pickW(cands); usedS.add(a.s); add(a);
    }
    it.name = pick(RARE_A) + ' ' + pick(RARE_B[b.slot]); capDmg();
    if (it.armor) it.armor = Math.round(it.armor * 1.15);
  }
  return it;
}
function newPotion(kind) { return { uid: itemUid++, potion: kind, q: 'potion', name: kind === 'hp' ? 'Healing Draught' : 'Essence Draught', w: 1, h: 1 }; }
function itemValue(it) { if (it.potion) return 8; return ({ normal: 5, magic: 25, rare: 70, unique: 160 }[it.q] || 5) + (it.lvl || 1) * 4; }
function itemLines(it) {
  const L = [];
  L.push([it.name, QCOL[it.q] || QCOL.normal]);
  if (it.potion) { L.push([it.potion === 'hp' ? 'Restores life over time' : 'Restores Essence over time', '#a39d8c']); L.push(['Right-click or 1-4 on the belt to drink', '#6f6a79']); return L; }
  const b = BASES[it.base];
  if (it.q === 'rare' || it.q === 'unique') L.push([b.name, QCOL[it.q]]);
  if (it.dmg) L.push([`Essence Damage: ${it.dmg[0]} to ${it.dmg[1]}`, '#d6d2c8']);
  if (it.armor) L.push([`Armor: ${it.armor}`, '#d6d2c8']);
  if (it.lvl > 1) L.push([`Required Level: ${it.lvl}`, P.level >= it.lvl ? '#d6d2c8' : '#c8553d']);
  for (const k in it.stats) L.push([k.startsWith('skt') ? `+${it.stats[k]} to ${tabNames()[+k[3]]} Skills` : (STAT_TEXT[k] || k + ' #').replace('#', it.stats[k]), '#8b95ff']);
  return L;
}

// =================================================================== skills (data)
// tab: 0 Iron, 1 Anima, 2 Logos · r/c: position in the D2-style grid (row sets the level tier) · kind: passive | cast | hold | weapon
const ROWREQ = [1, 6, 12, 18, 24, 30]; // Diablo 2's skill tiers
const SK = {
  // ---------------- IRON: the golem, metal and the ground
  pillars: { name: 'Iron Pillars', tab: 0, r: 0, c: 0, kind: 'cast', mana: 14, desc: 'Iron pillars burst from the ground in a wall at the target: damage and stun as they rise, then they stand as cover. Beams bounce off them.',
    perks: [{ l: 6, v: 'magnet', name: 'Lodestone', desc: 'Pillars drag nearby enemies toward them.' }, { l: 12, v: 'resonance', name: 'Resonance', desc: 'Beams bounce off metal harder, and more times.', stat: ['spi', 50] }] },
  golem: { name: 'Iron Golem', tab: 0, r: 0, c: 1, kind: 'cast', mana: 20, desc: 'A hulking iron knight that never dies: at zero life it falls dormant and rises again. Once summoned, casting it again orders it to that spot; casting it on the golem itself banishes it. With Overcharge you pour wisps into it: each one heals it and adds a charge. Full charge sends it berserk. G opens its orders and weapon loadout.',
    perks: [{ l: 5, v: 'bulwark', name: 'Bulwark', desc: 'Its shield charge knocks enemies back harder.' }, { l: 10, v: 'jugg', name: 'Juggernaut', desc: 'Berserk lasts longer (up to 30s), hits harder and its white fire spreads wider.' }, { l: 15, v: 'ironm', name: 'Living Iron', desc: 'More life, damage and armor.', stat: ['vit', 60] }] },
  fissure: { name: 'Iron Fissure', tab: 0, r: 1, c: 0, pre: 'pillars', kind: 'cast', mana: 18, desc: 'A line of iron spikes tears out of the ground toward the target. The last spikes stay standing as pillars.',
    perks: [{ l: 5, v: 'fdeep', name: 'Deep Rift', desc: 'The spikes stun twice as long.' }, { l: 10, v: 'fshrap', name: 'Shrapnel', desc: 'Every spike flings iron shards to either side.', stat: ['con', 50] }] },
  toss: { name: 'Shield Toss', tab: 0, r: 1, c: 2, pre: 'golem', kind: 'passive', desc: 'The golem hurls its tower shield at distant foes. It spins at the end of its flight, then flies back. Beams bounce off it the whole way.',
    perks: [{ l: 5, v: 'rico', name: 'Ricochet', desc: 'The shield bounces between more enemies.' }, { l: 10, v: 'tossstun', name: 'Crushing Rim', desc: 'The shield stuns what it hits for a full second.', stat: ['con', 45] }] },
  challenge: { name: 'Iron Challenge', tab: 0, r: 2, c: 1, pre: 'overcharge', kind: 'passive', desc: 'Every few seconds the golem bellows a challenge: nearby enemies must fight it instead of you.',
    perks: [{ l: 5, v: 'warcry', name: 'War Cry', desc: 'The challenge also slows enemies by 30% for 3 s.' }, { l: 10, v: 'defy', name: 'Defiance', desc: 'For 3 s after each challenge, the challenger takes 30% less damage.', stat: ['vit', 50] }] },
  cage: { name: 'Iron Maiden', tab: 0, r: 2, c: 0, pre: 'fissure', kind: 'cast', mana: 24, desc: 'A ring of pillars bursts up around the target, caging whatever stands inside.',
    perks: [{ l: 5, v: 'spikedcage', name: 'Spiked Maiden', desc: 'Whatever is caged inside is cut every second.' }, { l: 10, v: 'maidcrush', name: 'Crushing Maiden', desc: 'When the cage ends its pillars fall inward, crushing everything inside.', stat: ['con', 50] }] },
  thorns: { name: 'Iron Thorns', tab: 0, r: 2, c: 2, pre: 'toss', kind: 'passive', desc: 'Enemies that strike the golem in melee take part of the damage back.',
    perks: [{ l: 8, v: 'overflow', name: 'Anima Overflow', desc: 'Damage the golem takes also charges it, and its final burst looses a ring of seeking souls.' }, { l: 14, v: 'barbiron', name: 'Barbed Iron', desc: 'Enemies that strike your iron are staggered.', stat: ['vit', 55] }] },
  overcharge: { name: 'Overcharge', tab: 0, r: 1, c: 1, pre: 'golem', kind: 'hold', mana: 0, desc: 'Hold to pour your wisps into the Iron Golem. Each wisp heals it and adds a charge; at full charge it goes berserk in white fire, then bursts. Each level needs more wisps for a full charge, but the rampage lasts longer and hits harder. The charge never needs more wisps than you can hold, and a charge left alone slowly bleeds its wisps back to you.',
    perks: [{ l: 5, v: 'ghostfire', name: 'Ghostfire', desc: 'While berserk, its white beams fire twice as often.' }, { l: 10, v: 'wispreturn', name: 'Wellspring', desc: 'When the rampage ends, every wisp poured in returns to you at once.' }, { l: 15, v: 'overload', name: 'Overload', desc: 'The final burst is half again as wide and twice as hard.', stat: ['spi', 55] }] },
  anvil: { name: 'Iron Anvil', tab: 0, r: 3, c: 0, pre: 'cage', kind: 'cast', mana: 20, desc: 'A great iron anvil drops out of the sky onto the target. It crushes and stuns everything under it, then sits there as metal that your beams and lance bounce off, until it rusts away.',
    perks: [{ l: 5, v: 'anvilquake', name: 'Aftershock', desc: 'The impact throws a ring of iron spikes outward.' }, { l: 10, v: 'anvilstay', name: 'Heavy Iron', desc: 'Anvils stand twice as long and enemies near them are slowed.' }, { l: 15, v: 'anvilrain', name: 'Anvil Rain', desc: 'Two more anvils fall around the first.', stat: ['con', 55] }] },
  forge: { name: 'Forge Heart', tab: 0, r: 5, c: 1, kind: 'passive', desc: 'Pillars, spikes and the golem all hit harder. Your metal lasts longer.',
    perks: [{ l: 5, v: 'temper', name: 'Tempered Iron', desc: 'Pillars stand 50% longer.' }, { l: 10, v: 'moltencore', name: 'Molten Core', desc: 'Golem blows set enemies on fire.', stat: ['con', 60] }] },
  // ---------------- ANIMA: wisps and what you bind
  wisps: { name: 'Wisps', tab: 1, r: 0, c: 1, kind: 'passive', desc: 'Your choir of wisps drifts around you. More points: more wisps, faster regrowth, stronger revenants. V opens the choir: wisp types and how they behave.',
    perks: [{ l: 5, v: 'swiftw', name: 'Quickened', desc: 'Wisps regrow 20% faster.' }, { l: 10, v: 'bright', name: 'Bright Choir', desc: 'One more wisp in your choir.', stat: ['spi', 50] }] },
  restless: { name: 'Restless Dead', tab: 1, r: 1, c: 0, pre: 'wisps', kind: 'passive', desc: 'Revenant wisps fly faster and pass through more enemies before they perish.',
    perks: [{ l: 5, v: 'burst', name: 'Grave Burst', desc: 'Revenants explode when they perish.' }, { l: 10, v: 'leech', name: 'Soul Leech', desc: 'Revenant passes steal life and Essence.', stat: ['spi', 45] }] },
  beam: { name: 'Beam Wisps', tab: 1, r: 1, c: 2, pre: 'wisps', kind: 'passive', desc: 'Unlocks beam wisps: a sustained golden beam that fades out. Levels add damage, pierce and range. Beams bounce off metal.',
    perks: [{ l: 5, v: 'sweep', name: 'Sweeping Beam', desc: 'Beams sweep back and forth across an arc.' }, { l: 10, v: 'beamburn', name: 'Searing Beam', desc: 'Beams set what they touch on fire.', stat: ['spi', 50] }] },
  cull: { name: 'Cull', tab: 1, r: 2, c: 0, pre: 'restless', kind: 'cast', mana: 6, desc: 'Every drifting revenant wisp dives at once through the enemies at the cursor, then comes home. No wisps are spent.',
    perks: [{ l: 5, v: 'cullmark', name: 'Culling Mark', desc: 'Enemies the dive strikes take 15% more damage for 4 s.' }, { l: 10, v: 'cullreturn', name: 'Twice Through', desc: 'The revenants strike again on their way home.', stat: ['spi', 50] }] },
  condense: { name: 'Condense', tab: 1, r: 2, c: 1, pre: 'wisps', kind: 'hold', mana: 2, desc: 'Hold: stand still and crush wisps into one great wisp that grows with each one. Release it to hunt. Those wisps stay spent until it fades.',
    perks: [{ l: 5, v: 'radiance', name: 'Radiant Core', desc: 'The great wisp pulses light that burns everything around it.' }, { l: 10, v: 'nova', name: 'Supernova', desc: 'When it fades, it detonates.', stat: ['spi', 55] }] },
  prism: { name: 'Prism Wisps', tab: 1, r: 2, c: 2, pre: 'beam', kind: 'passive', desc: 'Unlocks prism wisps: their beam strikes one foe and refracts into rays that jump to others nearby.',
    perks: [{ l: 5, v: 'prismex', name: 'Wide Refraction', desc: 'One more ray on every refraction.' }, { l: 10, v: 'prismchain', name: 'Bright Rays', desc: 'Refracted rays hit 30% harder.', stat: ['spi', 55] }] },
  leash: { name: 'Soul Leash', tab: 1, r: 3, c: 0, pre: 'cull', kind: 'cast', mana: 10, desc: 'Throw a swaying chain of anima from you to what you cast it on. Anything it sweeps through burns. On a monster: it is leashed to you and drained. On your golem: it is fed and quickened. On the ground: an anchor your chain whips around as you move.',
    perks: [{ l: 5, v: 'barbs', name: 'Barbed Chain', desc: 'The chain slows what it touches and bites harder.' }, { l: 10, v: 'twin', name: 'Twin Leash', desc: 'Hold two leashes at once.' }, { l: 15, v: 'snare', name: 'Soul Snare', desc: 'Ground anchors burst when they fade; leashed monsters that die free a wisp.', stat: ['spi', 70] }] },
  totem: { name: 'Soul Lantern', tab: 1, r: 3, c: 2, pre: 'prism', kind: 'cast', mana: 15, desc: 'Plant a lantern of grave-light. Enemies in its light are exposed (they take 15% more damage), and each one that dies in it frees a wisp for you and mends a little of your life.',
    perks: [{ l: 5, v: 'beacon', name: 'Beacon', desc: 'You and your golem mend while standing in its light.' }, { l: 10, v: 'lantgrasp', name: 'Grasping Light', desc: 'The lantern drags enemies toward it.', stat: ['spi', 55] }] },
  choir: { name: 'Choir Mastery', tab: 1, r: 4, c: 0, pre: 'leash', kind: 'passive', desc: 'All wisp damage is increased and wisps regrow faster.',
    perks: [{ l: 5, v: 'harvest', name: 'Soul Harvest', desc: 'Kills can free a wisp at once.' }, { l: 10, v: 'hymn', name: 'Hymn of Rest', desc: 'Every kill mends 1% of your life for each 3 wisps in your choir.', stat: ['spi', 60] }] },
  animam: { name: 'Anima Mastery', tab: 1, r: 5, c: 1, kind: 'passive', desc: 'The great wisp, Soul Leash and the Soul Lantern all grow stronger.',
    perks: [{ l: 5, v: 'bindings', name: 'Stronger Bindings', desc: 'Soul Leash lasts half again as long.' }, { l: 10, v: 'greatsoul', name: 'Great Soul', desc: 'The great wisp holds 20% more.', stat: ['spi', 65] }] },
  // ---------------- LOGOS: the word made force
  swarm: { name: 'Soul Swarm', tab: 2, r: 0, c: 0, kind: 'cast', mana: 8, desc: 'Spend up to 3 wisps to loose a swarm of seeking souls. The more wisps you still hold, the more souls fly.',
    perks: [{ l: 5, v: 'hunger', name: 'Ravenous Souls', desc: 'Souls tear through several enemies.' }, { l: 10, v: 'soullegion', name: 'Soul Legion', desc: 'Each wisp spent looses more souls.', stat: ['spi', 50] }] },
  ward: { name: 'Spirit Ward', tab: 2, r: 0, c: 1, kind: 'passive', desc: 'Essence absorbs part of the damage you take before your life does.',
    perks: [{ l: 3, v: 'wardfast', name: 'Quick Ward', desc: 'The ward soaks a little more at once.' }, { l: 6, v: 'rebuke', name: 'Rebuke', desc: 'When the ward soaks enough, a whip of white light lashes out at your attackers.', stat: ['spi', 50] }] },
  lance: { name: 'Spirit Lance', tab: 2, r: 0, c: 2, kind: 'hold', mana: 3, desc: 'Pulse a quick beam of soul-light at the enemy nearest the cursor. It leaps from foe to foe, weaker with each leap, and fades out along its path. Mirrors catch it: a bounce off your golem, its shield or your pillars costs it nothing and buys two more leaps. Hold to keep pulsing.',
    perks: [{ l: 5, v: 'focus', name: 'Focused Lance', desc: 'The longer you hold it, the harder it burns.' }, { l: 10, v: 'prismL', name: 'Prismatic Lance', desc: 'Every reflection splits off rays at nearby enemies.' }, { l: 15, v: 'lsiphon', name: 'Siphon', desc: 'Returns part of its damage as life and Essence.', stat: ['spi', 60] }] },
  wraith: { name: 'Wraith Form', tab: 2, r: 1, c: 1, kind: 'cast', mana: 8, desc: 'Toggle: fast, phasing through enemies, immune to physical harm. Drains Essence. Any attack ends it.',
    perks: [{ l: 5, v: 'phantom', name: 'Phantom Step', desc: 'You leave afterimages that burst a moment later.' }, { l: 10, v: 'wraithhaste', name: 'Wraith Haste', desc: 'Wraith Form is a quarter faster.', stat: ['spi', 50] }] },
  storm: { name: 'Soul Storm', tab: 2, r: 2, c: 0, pre: 'swarm', kind: 'cast', mana: 25, desc: 'Spend 2 wisps to open a vortex at the target that spits seeking souls for a few seconds.',
    perks: [{ l: 5, v: 'eye', name: 'Wide Eye', desc: 'The storm lasts half again as long.' }, { l: 10, v: 'tempest', name: 'Tempest', desc: 'Storm souls strike one more time.', stat: ['spi', 60] }] },
  mark: { name: 'Mark of Logos', tab: 2, r: 2, c: 1, kind: 'cast', mana: 10, desc: 'Brand every enemy in an area: they take more damage from everything you command.',
    perks: [{ l: 5, v: 'markwide', name: 'Wide Brand', desc: 'The brand covers half again the area.' }, { l: 10, v: 'markSoul', name: 'Soul Brand', desc: 'Marked enemies that die release a seeking soul.', stat: ['spi', 50] }] },
  orb: { name: 'Aether Orb', tab: 2, r: 2, c: 2, kind: 'cast', mana: 18, desc: 'Hurl a slow white orb of bound life essence. It sprays aether shards in a spiral as it flies, then bursts into a ring of shards.',
    perks: [{ l: 5, v: 'shards', name: 'Aether Shards', desc: 'More shards, and each one pierces.' }, { l: 10, v: 'cascade', name: 'Orb Cascade', desc: 'The burst splits into smaller orbs.', stat: ['spi', 60] }] },
  word: { name: 'Word of Unmaking', tab: 2, r: 3, c: 2, pre: 'orb', kind: 'cast', mana: 28, desc: 'Speak a word that unmakes. A sigil opens at the target, drags every enemy near it toward its heart for a second, then implodes.',
    perks: [{ l: 5, v: 'wordwide', name: 'Wide Sigil', desc: 'The sigil is half again as wide.' }, { l: 10, v: 'wordecho', name: 'Echoing Word', desc: 'The word is spoken twice.', stat: ['spi', 60] }] },
  chain: { name: 'Chain of Logos', tab: 2, r: 4, c: 0, pre: 'storm', kind: 'cast', mana: 12, desc: 'A bolt of white speech leaps from you to the enemy at the cursor and on to others nearby, weakening a little with each leap.',
    perks: [{ l: 5, v: 'chainfork', name: 'Forked Word', desc: 'It forks at the first enemy it strikes.' }, { l: 10, v: 'chainmark', name: 'Binding Word', desc: 'Every enemy it strikes is Marked for 3 s.', stat: ['spi', 55] }] },
  nmastery: { name: 'Logos Mastery', tab: 2, r: 5, c: 1, kind: 'passive', desc: 'All Logos spells deal more damage, and Essence flows back faster.',
    perks: [{ l: 5, v: 'wordpower', name: 'Word of Power', desc: 'Logos spells cost 10% less.' }, { l: 10, v: 'lastword', name: 'Last Word', desc: 'Every kill returns 3 Essence.', stat: ['spi', 70] }] }
};

// =================================================================== OSSUMANCER skills (cls: 'ossumancer')
// tab: 0 Ossuary (army) · 1 Marrow (bone spells) · 2 Carapace (body)
Object.assign(SK, {
  // ---------------- OSSUARY: the army
  offering: { cls: 'ossumancer', name: 'Bone Offering', tab: 0, r: 0, c: 0, kind: 'cast', mana: 3, desc: 'Tear apart the skeleton nearest the cursor. Its bones burst outward as a spray of shards that pierce what they hit, and its share of the aura comes straight back to you.',
    perks: [{ l: 5, v: 'offerheal', name: 'Blood Price', desc: 'Each offering mends 8% of your life.' }, { l: 10, v: 'offerwide', name: 'Bone Nova', desc: 'The shards fly out in a full ring and pierce twice as many.', stat: ['spi', 50] }] },
  raise: { cls: 'ossumancer', name: 'Raise Skeleton', tab: 0, r: 0, c: 1, kind: 'passive', desc: 'Skeletons claw their way up out of your aura on their own whenever there is room for them. Each one holds 5 shards of the aura while it stands. In army orders (V) you split them into three squads, each with its own size, loadout and orders. When you direct the Colossus, they follow it.',
    perks: [{ l: 5, v: 'bburst', name: 'Bone Burst', desc: 'Skeletons that fall burst into shards that cut everything around them.' }, { l: 10, v: 'mknit', name: 'Marrow-Knit', desc: 'Skeletons mend three times as fast near you, and slowly everywhere else.' }, { l: 15, v: 'shieldb', name: 'Hardened Bone', desc: 'All your skeletons take far less damage.', stat: ['vit', 50] }] },
  banner: { cls: 'ossumancer', name: 'Grave Banner', tab: 0, r: 1, c: 0, pre: 'raise', kind: 'cast', mana: 12, desc: 'Plant a standard of bone and flayed hide. Skeletons and the Colossus near it strike faster and mend, and enemies near it are slowed. It stands for 15 s.',
    perks: [{ l: 5, v: 'bannerwide', name: 'Tall Banner', desc: 'It reaches half again as far.' }, { l: 10, v: 'bannerfear', name: 'Dread Standard', desc: 'Enemies that first come near it flee in terror for a second.', stat: ['con', 50] }] },
  tithe: { cls: 'ossumancer', name: 'Grave Tithe', tab: 0, r: 1, c: 2, pre: 'raise', kind: 'passive', desc: 'Every kill gives up bone: a chance for a shard to fly straight into your aura.',
    perks: [{ l: 5, v: 'tithemore', name: 'Full Tithe', desc: 'Champions and uniques always give two shards.' }, { l: 10, v: 'tithemend', name: 'Bone Tax', desc: 'Each tithed shard mends 1% of your life.', stat: ['vit', 45] }] },
  unearth: { cls: 'ossumancer', name: 'Unearth', tab: 0, r: 2, c: 0, pre: 'banner', kind: 'cast', mana: 10, desc: 'The corpses near the cursor claw their way back up as grave-risen skeletons. They fight for 15 s and cost your aura nothing.',
    perks: [{ l: 5, v: 'unearthlong', name: 'Restless Graves', desc: 'They stand 10 s longer.' }, { l: 10, v: 'unearthburst', name: 'Crumbling Dead', desc: 'When they fall, their bones fly to your aura as shards.', stat: ['vit', 55] }] },
  colossus: { cls: 'ossumancer', name: 'Ossuary Colossus', tab: 0, r: 2, c: 1, pre: 'raise', kind: 'hold', mana: 4, desc: 'Hold: skeletons march into one giant skeleton at the cursor, one by one. The more it holds, the bigger, faster and deadlier it is, and it keeps their shards of the aura. It leaps onto distant enemies and lands in a burst of bone. Tap to direct it: on an enemy it attacks it, on the ground it marches there, and your skeletons follow it. Its weapon is chosen in army orders (V).',
    perks: [{ l: 5, v: 'bulwarkC', name: 'Unbroken Bulwark', desc: 'The Colossus takes less damage and bellows a challenge that draws nearby enemies to it.' }, { l: 8, v: 'cracked', name: 'Cracked Marrow', desc: 'Blows that land on the Colossus now and then knock a shard loose that flies to you.' }, { l: 12, v: 'colleap', name: 'Earthshaker', desc: 'It leaps every 3 s and lands 30% harder.' }, { l: 16, v: 'colgiant', name: 'Titan of Bone', desc: 'A quarter more life, and it moves faster.', stat: ['vit', 60] }] },
  horn: { cls: 'ossumancer', name: 'War Horn', tab: 0, r: 2, c: 2, pre: 'tithe', kind: 'cast', mana: 10, desc: 'Sound a horn of hollow bone. For 6 s your skeletons and the Colossus fight faster and hit harder, and enemies near you are shaken and slowed.',
    perks: [{ l: 5, v: 'hornlong', name: 'Long Call', desc: 'The call lasts 4 s longer.' }, { l: 10, v: 'hornheal', name: 'Rally Call', desc: 'The horn mends every skeleton and the Colossus by 25%.', stat: ['spi', 45] }] },
  bward: { cls: 'ossumancer', name: 'Shield of Bones', tab: 0, r: 3, c: 0, pre: 'unearth', kind: 'passive', desc: 'Skeletons standing within 3 yd of you throw themselves in front of the blows meant for you and take a share of them.',
    perks: [{ l: 5, v: 'bwardthorn', name: 'Bristling', desc: 'A skeleton that takes a blow for you cuts the attacker.' }, { l: 10, v: 'bwardheal', name: 'Knitting Guard', desc: 'Skeletons near you mend 2% of their life each second.', stat: ['vit', 55] }] },
  reasm: { cls: 'ossumancer', name: 'Reassemble', tab: 0, r: 4, c: 1, pre: 'colossus', kind: 'passive', desc: 'Fallen skeletons may pull themselves back together where they fell. The Colossus, when it collapses, reforms from its own rubble after a while, at half its size.',
    perks: [{ l: 5, v: 'reasmfast', name: 'Quick Mending', desc: 'The Colossus reforms in half the time.' }, { l: 10, v: 'reasmfull', name: 'Whole Again', desc: 'The Colossus reforms at its full size.', stat: ['vit', 60] }] },
  legion: { cls: 'ossumancer', name: 'Bone Legion', tab: 0, r: 5, c: 1, kind: 'passive', desc: 'Skeletons and the Colossus gain life and damage. You can keep one more skeleton standing at levels 1 and 10.',
    perks: [{ l: 5, v: 'legionspd', name: 'Forced March', desc: 'Skeletons move 15% faster.' }, { l: 10, v: 'legionmax', name: 'Endless Legion', desc: 'One more skeleton can stand.', stat: ['vit', 65] }] },
  // ---------------- MARROW: bone spells (weaker as your aura runs thin)
  spear: { cls: 'ossumancer', name: 'Bone Spear', tab: 1, r: 0, c: 0, kind: 'cast', mana: 5, shards: 1, desc: 'Hurl a spear of bone that pierces everything in its line. Like all bone spells, it hits harder the more shards orbit you.',
    perks: [{ l: 5, v: 'splinter', name: 'Splinter', desc: 'The first enemy it pierces sprays bone splinters to either side.' }, { l: 10, v: 'impale', name: 'Impale', desc: 'Enemies it pierces are pinned in place for a moment.', stat: ['spi', 50] }] },
  siphon: { cls: 'ossumancer', name: 'Marrow Siphon', tab: 1, r: 1, c: 0, pre: 'spear', kind: 'cast', mana: 6, desc: 'Draw the marrow out of the enemies in a cone before you. They are torn for damage, and each one hit sends a shard flying into your aura (four at most).',
    perks: [{ l: 5, v: 'siphonslow', name: 'Hollowed', desc: 'Siphoned enemies are slowed for 2 s.' }, { l: 10, v: 'siphonheal', name: 'Marrow Draught', desc: 'Every shard you siphon mends 1% of your life.', stat: ['spi', 50] }] },
  ribcage: { cls: 'ossumancer', name: 'Rib Cage', tab: 1, r: 1, c: 1, kind: 'cast', mana: 8, shards: 4, desc: 'A great rib cage erupts under the target: the ribs pierce everything inside and hold it there, bleeding marrow, until the cage crumbles.',
    perks: [{ l: 5, v: 'mdrain', name: 'Marrow Drain', desc: 'Held enemies feed your aura a shard every other second.' }, { l: 10, v: 'ribspike', name: 'Iron Maiden of Bone', desc: 'When the cage crumbles its ribs burst inward as spikes.', stat: ['spi', 55] }] },
  ossify: { cls: 'ossumancer', name: 'Ossify', tab: 1, r: 1, c: 2, kind: 'cast', mana: 9, desc: 'The enemies in an area at the cursor turn partly to bone for 8 s: they move 30% slower and take 20% more damage. An ossified enemy that dies bursts into shards.',
    perks: [{ l: 5, v: 'ossifywide', name: 'Creeping Bone', desc: 'The area is half again as wide.' }, { l: 10, v: 'ossifylock', name: 'Calcify', desc: 'For the first 1.5 s they cannot move at all.', stat: ['spi', 50] }] },
  wall: { cls: 'ossumancer', name: 'Bone Arms', tab: 1, r: 2, c: 0, pre: 'siphon', kind: 'cast', mana: 8, shards: 3, desc: 'Skeletal arms claw up out of the ground in a line toward the target. They stay, tearing at and dragging on anything that walks over them.',
    perks: [{ l: 5, v: 'charnel', name: 'Charnel Field', desc: 'The arms erupt across a wide field around the target instead of in a line.' }, { l: 10, v: 'armcrush', name: 'Crushing Grip', desc: 'Arms that catch something crush it for double damage.', stat: ['spi', 55] }] },
  spikes: { cls: 'ossumancer', name: 'Bone Spikes', tab: 1, r: 2, c: 2, pre: 'ribcage', kind: 'cast', mana: 9, shards: 4, desc: 'Spikes burst outward from the bones of the enemy at the cursor, tearing it and everything around it.',
    perks: [{ l: 5, v: 'bloom', name: 'Ossuary Bloom', desc: 'Enemies killed by the spikes burst into spikes again.' }, { l: 10, v: 'spikewide', name: 'Thicket', desc: 'The spikes reach half again as far.', stat: ['spi', 55] }] },
  sstorm: { cls: 'ossumancer', name: 'Shard Storm', tab: 1, r: 3, c: 0, pre: 'wall', kind: 'cast', mana: 8, desc: 'Fire your aura: a fan of shards flies out in straight lines toward the target, each one piercing a few enemies. Your armor goes with them.',
    perks: [{ l: 5, v: 'stormpierce', name: 'Needle Storm', desc: 'Each shard pierces two more enemies.' }, { l: 10, v: 'stormback', name: 'Homing Bone', desc: 'A third of the shards fly back into your aura.', stat: ['spi', 55] }] },
  bonerain: { cls: 'ossumancer', name: 'Bone Rain', tab: 1, r: 3, c: 2, pre: 'spikes', kind: 'cast', mana: 14, shards: 3, desc: 'Shards tear up out of the ground, rise high and fall back as a rain of bone over the target area for 2 s.',
    perks: [{ l: 5, v: 'rainlong', name: 'Downpour', desc: 'The rain falls a second longer.' }, { l: 10, v: 'rainpin', name: 'Pinning Rain', desc: 'Every shard pins what it hits for a moment.', stat: ['spi', 55] }] },
  spirit: { cls: 'ossumancer', name: 'Grave Spirit', tab: 1, r: 4, c: 1, pre: 'sstorm', kind: 'cast', mana: 18, shards: 2, desc: 'Loose a howling skull of bone and anima. It seeks the enemy nearest the cursor and bursts into a nova of shards.',
    perks: [{ l: 5, v: 'spirittwin', name: 'Twin Skulls', desc: 'Two skulls fly at once.' }, { l: 10, v: 'spiritchain', name: 'Hungry Skull', desc: 'After it bursts it seeks one more victim at half strength.', stat: ['spi', 60] }] },
  marrowm: { cls: 'ossumancer', name: 'Marrow Mastery', tab: 1, r: 5, c: 1, kind: 'passive', desc: 'All bone spells deal more damage, and thin aura weakens them less.',
    perks: [{ l: 5, v: 'marrowcost', name: 'Lean Marrow', desc: 'Bone spells cost one shard less.' }, { l: 10, v: 'marrowfloor', name: 'Deep Marrow', desc: 'A thin aura weakens your bone spells far less.', stat: ['spi', 65] }] },
  // ---------------- CARAPACE: the body
  barmor: { cls: 'ossumancer', name: 'Bone Armor', tab: 2, r: 0, c: 0, kind: 'cast', mana: 11, desc: 'Plates of bone lock over your body and soak every blow until they break.',
    perks: [{ l: 5, v: 'barmorthorn', name: 'Barbed Plates', desc: 'Enemies that strike the plates are cut.' }, { l: 10, v: 'barmorshard', name: 'Shard Plates', desc: 'Every shard your aura gathers rebuilds the plates a little.', stat: ['con', 50] }] },
  aura: { cls: 'ossumancer', name: 'Shard Aura', tab: 2, r: 0, c: 1, kind: 'hold', desc: 'You are always pulling bone out of the earth, slowly: shards tear up from the ground around you and fly into your aura, cutting any enemy in their path. Hold it (bind it like any skill) to plant your feet and tear bone out four times as fast, shards and marrow both. Your army rises from its own reserve of marrow, which refills on its own and gives nothing back when a skeleton falls. The aura is your armor, your skeletons and the fuel for your spells. Levels pull from farther away and a little faster. Corpses give bone up faster.',
    perks: [{ l: 5, v: 'spurs', name: 'Bone Spurs', desc: 'Enemies that strike you in melee are cut by your shards.' }, { l: 10, v: 'deeppull', name: 'Deep Pull', desc: 'You pull bone from half again as far, and corpses give it up faster.' }, { l: 15, v: 'reforge', name: 'Reforge', desc: 'Every shard you gather mends you.', stat: ['vit', 60] }] },
  blade: { cls: 'ossumancer', name: 'Bone Blade', tab: 2, r: 0, c: 2, kind: 'passive', desc: 'A long blade of bone grows along your weapon: your attacks hit harder and cleave into a second enemy.',
    perks: [{ l: 5, v: 'bladecleave', name: 'Great Cleave', desc: 'The cleave reaches two more enemies.' }, { l: 10, v: 'bladereach', name: 'Long Bone', desc: 'Your weapon reaches a third of a yard farther.', stat: ['con', 50] }] },
  gcharge: { cls: 'ossumancer', name: 'Grinding Charge', tab: 2, r: 1, c: 0, pre: 'barmor', kind: 'cast', mana: 6, shards: 2, desc: 'Lower your shoulder and charge to the cursor, grinding through enemies and flinging them aside.',
    perks: [{ l: 5, v: 'chargestun', name: 'Bowl Over', desc: 'Enemies you grind through are stunned for a full second.' }, { l: 10, v: 'chargetrail', name: 'Grave Wake', desc: 'Bone arms claw up along your path.', stat: ['con', 55] }] },
  crush: { cls: 'ossumancer', name: 'Marrow Crush', tab: 2, r: 1, c: 2, pre: 'blade', kind: 'cast', mana: 5, desc: 'A heavy two-handed blow that cracks bone. The enemy takes 25% more damage from everything for 5 s, and two shards are knocked loose from it.',
    perks: [{ l: 5, v: 'crushstun', name: 'Concuss', desc: 'The blow stuns for a second.' }, { l: 10, v: 'crushsplash', name: 'Shatterblow', desc: 'The blow splashes everything within 1.5 yd of the target.', stat: ['con', 55] }] },
  host: { cls: 'ossumancer', name: 'Bone Host', tab: 2, r: 2, c: 1, pre: 'aura', kind: 'hold', mana: 5, desc: 'Hold: your skeletons march onto you one by one and fuse into a carapace. For each one you grow larger, faster and harder-hitting, and bone grows out along your weapon so it reaches farther. Blows break the carapace down and every skeleton lost frees its shards for the aura to raise new ones. Hold again to channel them back on. Tap to shed the carapace.',
    perks: [{ l: 5, v: 'everst', name: 'Everstanding', desc: 'While hosting you take less damage and cannot be knocked back.' }, { l: 10, v: 'shardskin', name: 'Shard Skin', desc: 'While hosting, your aura holds half again as many shards.' }, { l: 15, v: 'titan', name: 'Titanfall', desc: 'While hosting, every third blow slams the ground around you.', stat: ['con', 60] }] },
  bscythe: { cls: 'ossumancer', name: 'Scythe Sweep', tab: 2, r: 2, c: 2, pre: 'crush', kind: 'cast', mana: 4, shards: 2, desc: 'Swing a bone scythe in a full circle, cutting everything around you and knocking it back.',
    perks: [{ l: 5, v: 'sweepwide', name: 'Wide Arc', desc: 'The sweep reaches half again as far.' }, { l: 10, v: 'sweepshard', name: 'Reaping', desc: 'Every third enemy the sweep hits gives up a shard.', stat: ['con', 50] }] },
  leap: { cls: 'ossumancer', name: 'Grave Leap', tab: 2, r: 3, c: 0, pre: 'gcharge', kind: 'cast', mana: 8, shards: 2, desc: 'Leap to the cursor and come down in a burst of bone spikes that throws enemies back.',
    perks: [{ l: 5, v: 'leapstun', name: 'Crater', desc: 'The landing stuns for a second.' }, { l: 10, v: 'leapspikes', name: 'Spike Field', desc: 'Bone arms claw up where you land.', stat: ['con', 55] }] },
  lash: { cls: 'ossumancer', name: 'Spine Lash', tab: 2, r: 3, c: 2, pre: 'bscythe', kind: 'cast', mana: 6, shards: 1, desc: 'Crack a whip of vertebrae in a long straight line. It cuts everything along it and yanks the farthest enemy it catches to your feet.',
    perks: [{ l: 5, v: 'lashtwo', name: 'Double Lash', desc: 'It cracks twice.' }, { l: 10, v: 'lashwide', name: 'Flayed Arc', desc: 'The lash sweeps an arc instead of a line.', stat: ['con', 55] }] },
  carapm: { cls: 'ossumancer', name: 'Carapace Mastery', tab: 2, r: 5, c: 1, kind: 'passive', desc: 'Your melee hits harder and every shard in your aura turns aside more.',
    perks: [{ l: 5, v: 'carapregen', name: 'Quick Bone', desc: 'Your aura regrows 15% faster.' }, { l: 10, v: 'carapheal', name: 'Marrow Feast', desc: 'Every kill mends 2% of your life.', stat: ['con', 65] }] }
});

// =================================================================== HEMOMANCER skills (cls: 'hemomancer')
// tab: 0 Brood (minions) · 1 Blood (bleeding, leeches, blood magic) · 2 Flesh (mutations and consumption)
Object.assign(SK, {
  // ---------------- BROOD
  eggsac: { cls: 'hemomancer', name: 'Tumor Toss', tab: 0, r: 0, c: 0, kind: 'cast', mana: 7, desc: 'Tear tumors off your body and hurl them. Each bursts on the first enemy it hits, or where it lands, into a spray of gore and a spawnling with a single point of life that rots away after a while. More levels throw more tumors.',
    perks: [{ l: 5, v: 'tumorbig', name: 'Malignant', desc: 'Tumors burst half again as hard and wider.' }, { l: 10, v: 'tumorlive', name: 'Viable Growths', desc: 'Tumor spawnlings get a quarter of a real spawnling\'s life and last twice as long.', stat: ['vit', 45] }] },
  hatch: { cls: 'hemomancer', name: 'Hatch Brood', tab: 0, r: 0, c: 1, kind: 'hold', mana: 4, desc: 'With no flesh near the cursor, hold it to bleed a brood out of yourself: a swarmling every moment, paid in life (never the last of it). Otherwise: split open the corpses and tumors around the cursor: each corpse spills out spawnlings, torn torsos that crawl on their hands, and each tumor a whole clutch. V opens the Flesh panel: grafts, orders and the golem.',
    perks: [{ l: 5, v: 'frenzy', name: 'Frenzy', desc: 'Spawnlings bite much faster when the enemy is bleeding.' }, { l: 8, v: 'quicken', name: 'Quickening', desc: 'Tumors hatch on their own a few seconds after they are laid.' }, { l: 12, v: 'swollen', name: 'Swollen Brood', desc: 'Every corpse hatches one more spawnling.' }, { l: 16, v: 'infest', name: 'Infestation', desc: 'Corpses that died bleeding hatch twice over.', stat: ['vit', 50] }] },
  thrall: { cls: 'hemomancer', name: 'Blood Ooze', tab: 0, r: 1, c: 0, pre: 'eggsac', kind: 'cast', mana: 8, desc: 'Pour the corpse or blood pool nearest the cursor into an ooze: a quivering mass of blood with eyes drifting inside it. It keeps its distance and spits shards of clotted blood. It slurps up corpses and blood, and every meal makes it pulse: you and your minions near it strike faster for a while.',
    perks: [{ l: 5, v: 'oozetwo', name: 'Budding', desc: 'You can keep one more ooze.' }, { l: 10, v: 'oozebleed', name: 'Clotted Shards', desc: 'Its shards leave enemies bleeding.' }, { l: 15, v: 'oozemend', name: 'Rich Blood', desc: 'Its pulse also mends you and your minions by 5% of their life.', stat: ['vit', 55] }] },
  rush: { cls: 'hemomancer', name: 'Rabid Charge', tab: 0, r: 1, c: 2, pre: 'hatch', kind: 'cast', mana: 5, desc: 'Drive the spawnling nearest the target berserk. It swells up and charges the enemy at the cursor, bursting on impact in a blast of gore. The only way to spend your brood as a bomb.',
    perks: [{ l: 5, v: 'rushtwo', name: 'Pack Charge', desc: 'Two spawnlings charge at once.' }, { l: 10, v: 'rushchain', name: 'Rebirth', desc: 'Every enemy the burst kills rises as a spawnling.', stat: ['vit', 55] }] },
  graft: { cls: 'hemomancer', name: 'Graft', tab: 0, r: 2, c: 0, pre: 'thrall', kind: 'passive', desc: 'Graft a trait onto the whole brood: Fevered Blood, Leapers, Clingers, Volatile or Spider Legs. Chosen in the Flesh panel (V). Levels strengthen every graft.',
    perks: [{ l: 5, v: 'graftmend', name: 'Knitting Flesh', desc: 'Spawnlings mend twice as fast in blood.' }, { l: 10, v: 'graft2', name: 'Second Graft', desc: 'A second graft slot.', stat: ['vit', 50] }] },
  fgolem: { cls: 'hemomancer', name: 'Flesh Golem', tab: 0, r: 2, c: 1, pre: 'hatch', kind: 'cast', mana: 22, desc: 'Knit a hunched giant of sewn meat with a maw in its belly. It engulfs enemies whole and digests them, spitting out what it cannot kill, spews blood at what it cannot reach, eats corpses and lays a tumor for each. It hurls itself at enemies a few yards off and draws nearby enemies onto itself. It can wear one of your mutations (Flesh panel, V). It never dies for good: at zero life it slumps into a heap and regrows (at least 10 s). Cast it on the golem or its heap to feed it your life: that heals it, or quickens the regrowth. Cast elsewhere to send it to the cursor.',
    perks: [{ l: 5, v: 'sacs', name: 'Brood Tumors', desc: 'Each meal lays two tumors.' }, { l: 10, v: 'gorge', name: 'Gorge', desc: 'Meals heal it far more, and it grows larger and stronger with every one.' }, { l: 15, v: 'splitG', name: 'Split', desc: 'When it dies it tears apart into a swarm of spawnlings.', stat: ['vit', 60] }] },
  assim: { cls: 'hemomancer', name: 'Assimilate', tab: 0, r: 2, c: 2, pre: 'rush', kind: 'passive', desc: 'Spawnlings that kill grow fat on it: bigger, tougher and harder-biting, up to twice over. Grown spawnlings give more when devoured.',
    perks: [{ l: 5, v: 'assimfast', name: 'Quick Growth', desc: 'They grow twice as much from each kill.' }, { l: 10, v: 'assimbig', name: 'Monstrous', desc: 'They can grow to two and a half times their size.', stat: ['vit', 55] }] },
  nest: { cls: 'hemomancer', name: 'Brood Nest', tab: 0, r: 3, c: 0, pre: 'graft', kind: 'cast', mana: 16, desc: 'Seed a pulsing nest of flesh on the ground. For 15 s it spits out a tumor spawnling every few seconds and mends the minions around it.',
    perks: [{ l: 5, v: 'nestbig', name: 'Swelling Nest', desc: 'It hatches real spawnlings while your brood has room.' }, { l: 10, v: 'nestlong', name: 'Deep Roots', desc: 'It lasts twice as long.', stat: ['vit', 55] }] },
  hive: { cls: 'hemomancer', name: 'Hivemind', tab: 0, r: 4, c: 1, pre: 'fgolem', kind: 'passive', desc: 'Your minions think as one: each one hits harder and takes less damage for every other minion within 4 yd of it.',
    perks: [{ l: 5, v: 'hiveheal', name: 'Shared Blood', desc: 'Minions near each other mend 1% of their life each second.' }, { l: 10, v: 'hivefocus', name: 'One Mind', desc: 'Every minion turns on whatever you last struck.', stat: ['vit', 60] }] },
  broodm: { cls: 'hemomancer', name: 'Brood Mother', tab: 0, r: 5, c: 1, kind: 'passive', desc: 'Spawnlings, oozes and the Flesh Golem gain life and damage, and your brood can grow larger.',
    perks: [{ l: 5, v: 'broodmore', name: 'Teeming', desc: 'One more spawnling in your brood.' }, { l: 10, v: 'broodtough', name: 'Tough Hide', desc: 'Your brood takes 20% less damage.', stat: ['vit', 65] }] },

  // ---------------- BLOOD
  bboil: { cls: 'hemomancer', name: 'Boiling Blood', tab: 1, r: 0, c: 0, kind: 'cast', mana: 8, desc: 'Bring the blood of everything around the cursor to a boil for 8 s. Boiling enemies bleed half again as hard and as long, and each one that dies boils over, scalding those next to it.',
    perks: [{ l: 5, v: 'boilwide', name: 'Rolling Boil', desc: 'The area is half again as wide.' }, { l: 10, v: 'boilslow', name: 'Scalded', desc: 'Boiling enemies move 25% slower.', stat: ['spi', 50] }] },
  blance: { cls: 'hemomancer', name: 'Blood Vomit', tab: 1, r: 0, c: 1, kind: 'cast', mana: 0.9, desc: 'Hold: spew a sloshing stream of blood in a narrow cone. It soaks through everything in its way, splashes where it lands and leaves them all bleeding. Every Hemomancer skill costs life as well as Vitae; the fuller your Vitae, the less life.',
    perks: [{ l: 5, v: 'coag', name: 'Coagulate', desc: 'The stream slows what it soaks.' }, { l: 10, v: 'lacer', name: 'Lacerate', desc: 'Its bleeding runs twice as deep.', stat: ['spi', 50] }] },
  hemor: { cls: 'hemomancer', name: 'Hemorrhage', tab: 1, r: 1, c: 0, pre: 'bboil', kind: 'cast', mana: 10, desc: 'Burst the veins of the enemy nearest the cursor: it loses a share of its current life at once (far less for bosses), and the spray makes everything close by bleed.',
    perks: [{ l: 5, v: 'exsang', name: 'Exsanguinate', desc: 'Bleeding enemies that die spray their blood over everything around them.' }, { l: 10, v: 'hemdeep', name: 'Open Veins', desc: 'The target also bleeds for a third of what it lost.' }, { l: 15, v: 'hemsplash', name: 'Arterial Spray', desc: 'The splash is wider and cuts everything in it.', stat: ['spi', 60] }] },
  vwhip: { cls: 'hemomancer', name: 'Vein Whip', tab: 1, r: 1, c: 2, pre: 'blance', kind: 'cast', mana: 6, desc: 'Veins burst out of your arm and lash across everything in a wide arc before you, tearing it open. Now and then a vein tears loose on an enemy and constricts it, holding it fast and squeezing out blood.',
    perks: [{ l: 5, v: 'veinlong', name: 'Strangling Veins', desc: 'The veins constrict half again as long, and tear loose more often.' }, { l: 10, v: 'veinhook', name: 'Hooked Veins', desc: 'The lash drags what it hits toward you.', stat: ['spi', 50] }] },
  bfrenzy: { cls: 'hemomancer', name: 'Blood Frenzy', tab: 1, r: 2, c: 0, pre: 'hemor', kind: 'cast', mana: 12, desc: 'Scream the blood hot. Every minion around you goes rabid: faster, quicker to bite and hungry for anything nearby. You run and strike faster and your wounds knit.',
    perks: [{ l: 5, v: 'bloodlust', name: 'Bloodlust', desc: 'Frenzied minions mend as they fight.' }, { l: 10, v: 'rage', name: 'Red Rage', desc: 'Frenzied minions hit 25% harder.', stat: ['vit', 55] }] },
  cburst: { cls: 'hemomancer', name: 'Corpse Burst', tab: 1, r: 2, c: 2, pre: 'vwhip', kind: 'cast', mana: 9, desc: 'Detonate the corpse or tumor nearest the cursor in a burst of meat and blood that makes what it hits bleed.',
    perks: [{ l: 5, v: 'chainb', name: 'Chain Burst', desc: 'The burst sets off other corpses it reaches.' }, { l: 10, v: 'bursttumor', name: 'Seeding Burst', desc: 'Every burst flings a tumor.', stat: ['spi', 55] }] },
  spool: { cls: 'hemomancer', name: 'Leech Swarm', tab: 1, r: 3, c: 1, pre: 'hemor', kind: 'cast', mana: 12, desc: 'Fat leeches drop off your body and crawl to the enemies at the cursor. They latch on and drink, then crawl back and feed you what they drank.',
    perks: [{ l: 5, v: 'fatleech', name: 'Fat Leeches', desc: 'Leeches drink half again as fast.' }, { l: 10, v: 'leechmore', name: 'Leech Mother', desc: 'Two more leeches.', stat: ['vit', 55] }] },
  bwave: { cls: 'hemomancer', name: 'Blood Wave', tab: 1, r: 3, c: 2, pre: 'cburst', kind: 'cast', mana: 14, desc: 'A wave of blood rolls out from you, sweeping enemies back before it and leaving them bleeding. It grows taller for every bleeding enemy it swallows.',
    perks: [{ l: 5, v: 'wavewide', name: 'Riptide', desc: 'The wave is half again as wide.' }, { l: 10, v: 'wavedrown', name: 'Drown', desc: 'What the wave carries is stunned when it lets go.', stat: ['spi', 55] }] },
  pact: { cls: 'hemomancer', name: 'Blood Pact', tab: 1, r: 4, c: 0, pre: 'bfrenzy', kind: 'cast', mana: 0, desc: 'Open your veins for your children: lose 12% of your current life, and every minion is mended 40% and strikes 30% harder for 8 s.',
    perks: [{ l: 5, v: 'pactlong', name: 'Binding Oath', desc: 'The pact lasts 4 s longer.' }, { l: 10, v: 'pactshare', name: 'Shared Veins', desc: 'While the pact lasts, a fifth of the damage you take is spread among your minions.', stat: ['vit', 55] }] },
  hemom: { cls: 'hemomancer', name: 'Hemomancy Mastery', tab: 1, r: 5, c: 1, kind: 'passive', desc: 'All blood magic and bleeding deal more damage.',
    perks: [{ l: 5, v: 'hemovit', name: 'Blood Scent', desc: 'Vitae refills 25% faster near bleeding enemies and blood.' }, { l: 10, v: 'bloodprice', name: 'Cheap Blood', desc: 'Your skills cost 25% less life.', stat: ['spi', 65] }] },

  // ---------------- FLESH (mutations are worn in slots: two, three with Flesh Mastery; swap them any time in the Flesh panel)
  maw: { cls: 'hemomancer', name: 'Belly Maw', tab: 2, r: 0, c: 0, kind: 'passive', mut: true, desc: 'Mutation: your belly splits into a toothed maw. Your blows bite harder, open bleeding wounds and drink life, and now and then the maw swallows the enemy whole. While something is inside you, you mend; if it has not died when you are done with it, you spit it out.',
    perks: [{ l: 5, v: 'carnal', name: 'Carnal Hunger', desc: 'Your bites drink twice as much life.' }, { l: 10, v: 'gorgemaw', name: 'Bottomless', desc: 'You swallow twice as often and digest faster.', stat: ['vit', 50] }] },
  chitin: { cls: 'hemomancer', name: 'Chitin Plates', tab: 2, r: 0, c: 2, kind: 'passive', mut: true, desc: 'Mutation: plates of chitin grow over your skin. More armor, and less damage from every blow.',
    perks: [{ l: 5, v: 'barbed', name: 'Barbed Chitin', desc: 'Enemies that strike you in melee are cut on the barbs.' }, { l: 10, v: 'chitinthick', name: 'Thick Carapace', desc: 'Half again as much armor.', stat: ['con', 55] }] },
  swallow: { cls: 'hemomancer', name: 'Swallow Whole', tab: 2, r: 1, c: 0, pre: 'maw', kind: 'cast', mana: 10, desc: 'Needs the Belly Maw worn. Your belly splits wide and swallows the enemy nearest the cursor within reach (not bosses) and begins to digest it.',
    perks: [{ l: 5, v: 'swallowheal', name: 'Warm Meal', desc: 'While something digests inside you, you mend twice as fast.' }, { l: 10, v: 'swallowspit', name: 'Spit Bone', desc: 'Cast it again while full to spit what you hold at the cursor, hard.', stat: ['vit', 55] }] },
  tentacles: { cls: 'hemomancer', name: 'Tentacles', tab: 2, r: 1, c: 1, pre: 'maw', kind: 'passive', mut: true, desc: 'Mutation: tentacles sprout from your back. Each one lashes out once at an enemy in reach, tears off and constricts it where it stands, then slowly grows back on your body. More points grow more tentacles, up to eight, and regrow them faster.',
    perks: [{ l: 5, v: 'tentbind', name: 'Coiling Grip', desc: 'Torn-off tentacles constrict twice as long.' }, { l: 10, v: 'tentrip', name: 'Barbed Suckers', desc: 'Tentacles strike half again as hard and leave enemies bleeding.', stat: ['vit', 55] }] },
  gills: { cls: 'hemomancer', name: 'Blood Gills', tab: 2, r: 2, c: 0, pre: 'swallow', kind: 'passive', mut: true, desc: 'Mutation: gills split open along your neck. Standing in blood heals you three times as fast and refills Vitae far more.',
    perks: [{ l: 5, v: 'bbreath', name: 'Blood Breath', desc: 'Pools you stand in spread wider and last longer.' }, { l: 10, v: 'gillsvit', name: 'Deep Breath', desc: 'Blood refills your Vitae twice as fast.', stat: ['vit', 50] }] },
  devour: { cls: 'hemomancer', name: 'Devour', tab: 2, r: 2, c: 2, pre: 'chitin', kind: 'cast', mana: 0, desc: 'Eat the spawnling or tumor nearest you: it restores life and Vitae and gives a stacking bonus to all damage. The bigger the meal, the bigger the gain.',
    perks: [{ l: 5, v: 'glutton', name: 'Gluttony', desc: 'Devour stacks higher and lasts longer.' }, { l: 10, v: 'feast', name: 'Shared Feast', desc: 'Every meal also mends your minions nearby by 30%.', stat: ['vit', 55] }] },
  bilehump: { cls: 'hemomancer', name: 'Tumor Hump', tab: 2, r: 3, c: 1, pre: 'tentacles', kind: 'passive', mut: true, desc: 'Mutation: a glowing hump of tumors swells on your back. It buds tumor spawn that float off after enemies and burst in a spray of gore.',
    perks: [{ l: 5, v: 'bloated', name: 'Bloated', desc: 'The spawn burst wider.' }, { l: 10, v: 'twinbud', name: 'Twin Buds', desc: 'The hump buds two at a time.', stat: ['vit', 55] }] },
  molt: { cls: 'hemomancer', name: 'Molt', tab: 2, r: 3, c: 2, pre: 'devour', kind: 'cast', mana: 12, desc: 'Shed your skin in one wet heave: mend a share of your life and shake off anything slowing you. The empty skin stands where you were and draws the enemy for 3 s.',
    perks: [{ l: 5, v: 'moltbleed', name: 'Raw Flesh', desc: 'For 4 s after, your blows open deep bleeding wounds.' }, { l: 10, v: 'moltleech', name: 'Crawling Skin', desc: 'When the skin falls, two leeches crawl out of it.', stat: ['vit', 55] }] },
  heart: { cls: 'hemomancer', name: 'Second Heart', tab: 2, r: 4, c: 0, pre: 'gills', kind: 'passive', mut: true, desc: 'Mutation: a second heart beats beside the first. You mend steadily, and when you fall near death it pounds you back up once in a while.',
    perks: [{ l: 5, v: 'heartfast', name: 'Strong Beat', desc: 'It is ready again in half the time.' }, { l: 10, v: 'twinbeat', name: 'Shared Pulse', desc: 'When it pounds, your brood and golem heal fully too.', stat: ['vit', 60] }] },
  fmastery: { cls: 'hemomancer', name: 'Flesh Mastery', tab: 2, r: 5, c: 1, kind: 'passive', desc: 'Opens a third mutation slot, and every worn mutation grows stronger.',
    perks: [{ l: 5, v: 'mutflow', name: 'Quick Flesh', desc: 'Mutations work half again as fast in blood.' }, { l: 10, v: 'fleshlord', name: 'Flesh Lord', desc: 'Your Flesh Golem can wear a second mutation.', stat: ['vit', 70] }] },

  // =============================== THE ASSASSIN (the Unthawed): Miasma · Distortion · Death
  vblade: { cls: 'miasmancer', name: 'Venom Claws', tab: 0, r: 0, c: 0, kind: 'cast', mana: 6, desc: 'Draw miasma along your claws. For 40 s your blows leave it in the wound and slow what they cut.',
    perks: [{ l: 5, v: 'vflick', name: 'Venom Flick', desc: 'Every third blow also flicks a miasma-soaked knife at the next enemy.' }, { l: 10, v: 'vdeep', name: 'Deep Venom', desc: 'Miasma from your claws stacks up to three times.' }, { l: 15, v: 'vclaw', name: 'Raking Claws', desc: 'Your blows also rake a second enemy beside the first.', stat: ['con', 50] }] },
  mcloud: { cls: 'miasmancer', name: 'Miasma', tab: 0, r: 0, c: 1, kind: 'passive', desc: 'Miasma hangs about you as a cloud. It sickens whatever stands in it and blurs your outline, so blows miss you. The sickened leak miasma behind them, and standing in miasma thickens yours fast. The thicker the cloud, the wider it spreads, the harder it bites and the harder you are to hit.',
    perks: [{ l: 5, v: 'thickair', name: 'Thick Air', desc: 'The cloud thickens twice as fast while sickened enemies stand in it.' }, { l: 10, v: 'cbloom', name: 'Carrion Bloom', desc: 'Sickened enemies that die burst into a miasma cloud twice as often.' }, { l: 15, v: 'shroud', name: 'Shroud', desc: '+10% chance for blows to miss you.', stat: ['spi', 60] }] },
  shuriken: { cls: 'miasmancer', name: 'Miasma Shuriken', tab: 0, r: 0, c: 2, kind: 'cast', mana: 6, desc: 'Hurl a spinning bone shuriken that spirals outward from where you stand, cutting everything it passes and trailing miasma behind it.',
    perks: [{ l: 5, v: 'shuritwo', name: 'Twin Stars', desc: 'Two shurikens spiral out in opposite turns.' }, { l: 10, v: 'shurisplit', name: 'Splintering Star', desc: 'Every enemy a shuriken cuts sheds a knife at the next.', stat: ['con', 50] }] },
  inhale: { cls: 'miasmancer', name: 'Inhale', tab: 0, r: 1, c: 0, pre: 'vblade', kind: 'cast', mana: 0, desc: 'Draw the miasma back into you. Your clouds nearby rush to you and are breathed in, and the miasma in every enemy around you is torn out at once, striking for what it had left. All of it thickens your Miasma.',
    perks: [{ l: 5, v: 'deepdraw', name: 'Deep Draw', desc: 'Inhale also drags the sickened toward you.' }, { l: 10, v: 'sickbreath', name: 'Sick Breath', desc: 'Torn-out miasma strikes for half again as much.', stat: ['spi', 50] }] },
  pnova: { cls: 'miasmancer', name: 'Miasma Nova', tab: 0, r: 1, c: 1, pre: 'mcloud', kind: 'cast', mana: 12, desc: 'Breathe out a ring of miasma that rolls outward from you, shoving back and sickening hard everything it touches.',
    perks: [{ l: 5, v: 'novacloud', name: 'Lingering Ring', desc: 'The ring leaves a circle of miasma clouds where it ends.' }, { l: 10, v: 'twinnova', name: 'Second Breath', desc: 'A second ring follows half a second later.', stat: ['spi', 55] }] },
  contagion: { cls: 'miasmancer', name: 'Contagion', tab: 0, r: 2, c: 0, pre: 'inhale', kind: 'cast', mana: 9, desc: 'Mark the enemy nearest the cursor. Its miasma leaps to the two nearest enemies every 1.5 s, and when it dies it bursts into a great cloud.',
    perks: [{ l: 5, v: 'epidemic', name: 'Epidemic', desc: 'It leaps to three enemies instead of two.' }, { l: 10, v: 'contspread', name: 'Carried on the Wind', desc: 'It leaps from 5 yd away.', stat: ['spi', 50] }] },
  rotwall: { cls: 'miasmancer', name: 'Miasma Tide', tab: 0, r: 2, c: 2, pre: 'shuriken', kind: 'cast', mana: 14, desc: 'A slashing wall of miasma rolls forward from you in a straight line. It cuts and sickens everything it passes and carries enemies along before it.',
    perks: [{ l: 5, v: 'wwide', name: 'Broad Tide', desc: 'The wall is half again as wide.' }, { l: 10, v: 'wtrail', name: 'Lingering Wake', desc: 'It leaves miasma clouds along its path.', stat: ['spi', 50] }] },
  exhale: { cls: 'miasmancer', name: 'Exhale', tab: 0, r: 3, c: 1, pre: 'pnova', kind: 'cast', mana: 0, desc: 'Empty your lungs: the whole cloud bursts out around you at once and blows enemies back. The more Miasma you spend, the harder it hits. The cloud must then thicken again from nothing.',
    perks: [{ l: 5, v: 'gasp', name: 'Last Gasp', desc: 'The burst also leaves enemies confused for 2 s.' }, { l: 10, v: 'exhalekeep', name: 'Held Back', desc: 'Exhale keeps a third of what it spends.', stat: ['spi', 60] }] },
  mstorm: { cls: 'miasmancer', name: 'Miasma Hurricane', tab: 0, r: 4, c: 0, pre: 'contagion', kind: 'cast', mana: 22, desc: 'Whip your cloud into a howling storm that turns around you for a while, tearing at and sickening everything caught in it and slowing it down.',
    perks: [{ l: 5, v: 'stormwide', name: 'Wide Eye', desc: 'The storm reaches a yard farther.' }, { l: 10, v: 'stormpull', name: 'Undertow', desc: 'The storm drags enemies in toward you.', stat: ['spi', 55] }] },
  toxic: { cls: 'miasmancer', name: 'Toxicology', tab: 0, r: 5, c: 1, kind: 'passive', desc: 'All the miasma you make is stronger, and your clouds last longer.',
    perks: [{ l: 5, v: 'toxdrip', name: 'Seeping Sickness', desc: 'The sickened leak miasma twice as often.' }, { l: 10, v: 'toxfeed', name: 'Miasma-Eater', desc: 'Standing in miasma thickens yours twice as fast again.', stat: ['spi', 65] }] },
  ntrap: { cls: 'miasmancer', name: 'Needle Sentry', tab: 1, r: 0, c: 0, kind: 'cast', mana: 7, desc: 'Throw a sentry of bone needles. Once armed it spits miasma-soaked needles at the nearest enemy until it runs dry.',
    perks: [{ l: 5, v: 'needlemore', name: 'Full Quiver', desc: 'Six more needles.' }, { l: 8, v: 'sentryburst', name: 'Corpse Sentry', desc: 'Every couple of seconds it bursts a corpse near it into a great miasma cloud.' }, { l: 12, v: 'needlepierce', name: 'Long Needles', desc: 'Needles pass through an enemy.', stat: ['con', 45] }] },
  blur: { cls: 'miasmancer', name: 'Blur', tab: 1, r: 0, c: 1, kind: 'cast', mana: 8, desc: 'Bend the air and step to the cursor. A decoy of you stays behind and draws the enemy for 3 s.',
    perks: [{ l: 5, v: 'rotdouble', name: 'Miasmic Double', desc: 'The decoy bursts into a miasma cloud when it fades or falls.' }, { l: 10, v: 'smear', name: 'Smear', desc: 'For 2 s after you step, blows miss you 30% more often.', stat: ['spi', 45] }] },
  mwake: { cls: 'miasmancer', name: 'Miasma Wake', tab: 1, r: 1, c: 0, pre: 'ntrap', kind: 'cast', mana: 10, desc: 'Throw a cracked censer that never stops smoking. It leaks miasma all around it and, whenever an enemy comes near, breathes a rolling wave of it that shoves them back.',
    perks: [{ l: 5, v: 'wakewide', name: 'Deep Censer', desc: 'Its waves are wider and roll farther.' }, { l: 10, v: 'wakelong', name: 'Everburning', desc: 'It smokes twice as long.', stat: ['spi', 50] }] },
  haze: { cls: 'miasmancer', name: 'Haze', tab: 1, r: 1, c: 1, pre: 'blur', kind: 'cast', mana: 11, desc: 'A cloud of distortion at the cursor. Enemies inside lose their minds: they wander and turn on each other.',
    perks: [{ l: 5, v: 'hazelong', name: 'Deep Haze', desc: 'The haze lasts 2 s longer.' }, { l: 10, v: 'madness', name: 'Madness', desc: 'Confused enemies take 20% more damage.', stat: ['spi', 50] }] },
  bmine: { cls: 'miasmancer', name: 'Bloat Mine', tab: 1, r: 2, c: 0, pre: 'mwake', kind: 'cast', mana: 12, desc: 'Throw a swollen spore mine. When anything comes near it bursts into a great miasma cloud.',
    perks: [{ l: 5, v: 'minebig', name: 'Fat Spores', desc: 'The burst is half again as wide.' }, { l: 10, v: 'minefear', name: 'Spore Panic', desc: 'The burst terrifies what it hits for 1.5 s.', stat: ['spi', 50] }] },
  mirage: { cls: 'miasmancer', name: 'Mirage', tab: 1, r: 2, c: 2, pre: 'haze', kind: 'cast', mana: 13, desc: 'A field of bent light at the cursor. Enemies inside move at half speed, and missiles that cross it veer off course.',
    perks: [{ l: 5, v: 'miragelong', name: 'Lasting Mirage', desc: 'It lasts 3 s longer.' }, { l: 10, v: 'miragewarp', name: 'Folded Air', desc: 'Missiles that cross it turn back the way they came.', stat: ['spi', 55] }] },
  lure: { cls: 'miasmancer', name: 'Siren Lure', tab: 1, r: 3, c: 1, pre: 'haze', kind: 'cast', mana: 10, desc: 'Throw a charm of birch and bone that sings. For 3 s it drags every enemy within 5 yd toward it.',
    perks: [{ l: 5, v: 'lurelong', name: 'Long Song', desc: 'It sings 2 s longer.' }, { l: 10, v: 'lurewide', name: 'Siren Call', desc: 'It pulls from 8 yd away.', stat: ['spi', 50] }] },
  warp: { cls: 'miasmancer', name: 'Warped Miasma', tab: 1, r: 3, c: 2, pre: 'mirage', kind: 'passive', desc: 'Your distortion seeps into every miasma cloud you make, and into your own. Enemies in them are now and then struck by it: confused, slowed to a crawl, or twisted toward the heart of the cloud.',
    perks: [{ l: 5, v: 'warpmore', name: 'Thin Veil', desc: 'It strikes twice as often.' }, { l: 10, v: 'warpfear', name: 'Night Terrors', desc: 'It can also terrify.', stat: ['spi', 55] }] },
  sister: { cls: 'miasmancer', name: 'The Mirror-Sister', tab: 1, r: 4, c: 2, pre: 'warp', kind: 'passive', desc: 'A distorted reflection of you steps out of the haze and walks at your side. You do not command her. She fights with your own skills, as she sees fit, at a share of your strength.',
    perks: [{ l: 5, v: 'sisterfast', name: 'Eager Reflection', desc: 'She acts twice as often.' }, { l: 10, v: 'sisterhex', name: 'Wrong Face', desc: 'Whatever she strikes is confused for a moment.', stat: ['spi', 60] }] },
  unseen: { cls: 'miasmancer', name: 'The Unseen', tab: 1, r: 5, c: 1, kind: 'passive', desc: 'Your confusion, slows and snares last longer, blows miss you more often, and your traps hit harder. You can have more traps out at once (one more at levels 1, 5 and 10).',
    perks: [{ l: 5, v: 'unseenstep', name: 'Vanish', desc: 'After a Blur you are unseen for 1 s.' }, { l: 8, v: 'trapquick', name: 'Hair Trigger', desc: 'Traps arm the moment they land.' }, { l: 12, v: 'trapmax2', name: 'Trap Field', desc: 'One more trap.' }, { l: 16, v: 'unseenlong', name: 'Deep Dark', desc: 'Your control lasts a quarter longer again.', stat: ['spi', 60] }] },
  rarc: { cls: 'miasmancer', name: 'Rending Arc', tab: 2, r: 0, c: 0, kind: 'cast', mana: 0, stam: 5, desc: 'A wide, sweeping claw cut in a half-circle before you, tearing everything in reach. Each enemy caught beyond the first adds 10% to the blow. Catching three or more gives an Omen.',
    perks: [{ l: 5, v: 'arcdouble', name: 'Crossing Arcs', desc: 'A second arc tears back across the first.' }, { l: 10, v: 'arcwide', name: 'Wide Sweep', desc: 'The arc reaches 0.6 yd farther.', stat: ['con', 50] }] },
  gstrike: { cls: 'miasmancer', name: 'Grave Strike', tab: 2, r: 0, c: 1, kind: 'cast', mana: 0, stam: 6, desc: 'A heavy claw blow that marks you with an Omen of death. Omens circle you as pale skulls: each one makes you strike harder and faster. They stack up to three and fade after a while. Finishers (Reap, Execute) spend them.',
    perks: [{ l: 5, v: 'soulrend', name: 'Soul Rend', desc: 'Strikes mend 2% of your life for each Omen you hold.' }, { l: 10, v: 'gravecombo', name: 'Grave Combo', desc: 'Every third Grave Strike hits twice.', stat: ['con', 50] }] },
  thrust: { cls: 'miasmancer', name: 'Impaling Thrust', tab: 2, r: 0, c: 2, kind: 'cast', mana: 0, stam: 6, desc: 'Drive both claws forward in a straight, piercing thrust that runs through every enemy in a 3 yd line. Gives an Omen if it pierces anything.',
    perks: [{ l: 5, v: 'thrustlong', name: 'Long Reach', desc: 'The thrust reaches a yard farther.' }, { l: 10, v: 'thrustpin', name: 'Pinned', desc: 'The first enemy it runs through is pinned in place for a second.', stat: ['con', 50] }] },
  talon: { cls: 'miasmancer', name: 'Carrion Talon', tab: 2, r: 1, c: 0, pre: 'rarc', kind: 'cast', mana: 0, stam: 7, desc: 'A spinning flurry of three kicks into the enemy nearest the cursor, the last one throwing it back. Gives an Omen.',
    perks: [{ l: 5, v: 'talonkick', name: 'Fourth Kick', desc: 'One more kick.' }, { l: 10, v: 'talonstun', name: 'Crushing Heel', desc: 'The last kick stuns for a second.', stat: ['con', 50] }] },
  dstep: { cls: 'miasmancer', name: "Death's Step", tab: 2, r: 1, c: 2, pre: 'thrust', kind: 'cast', mana: 0, stam: 10, desc: 'Rush to the cursor through your enemies, cutting each one you pass. Gives an Omen if you cut anything.',
    perks: [{ l: 5, v: 'steplong', name: 'Long Stride', desc: 'You rush up to 8 yd.' }, { l: 10, v: 'stepomen', name: 'Omen Trail', desc: 'An Omen for every enemy you cut.', stat: ['con', 50] }] },
  reap: { cls: 'miasmancer', name: 'Reap', tab: 2, r: 2, c: 0, pre: 'talon', kind: 'cast', mana: 0, stam: 8, desc: 'Finisher: a sweeping claw cut all around you that spends every Omen. Each Omen widens it and adds damage; with three it throws enemies back.',
    perks: [{ l: 5, v: 'reapwide', name: 'Wide Harvest', desc: 'Reap reaches 30% farther.' }, { l: 8, v: 'knell', name: 'Mourning Knell', desc: 'Kills made by a finisher ring a funeral knell: enemies around you flee in terror for 2 s.' }, { l: 12, v: 'reapmend', name: 'Harvest Feast', desc: 'Mend 3% of your life for each Omen spent.' }, { l: 16, v: 'knelldmg', name: 'Dread', desc: 'Terrified enemies take 20% more damage.', stat: ['spi', 50] }] },
  flurry: { cls: 'miasmancer', name: 'Black-Rag Flurry', tab: 2, r: 2, c: 1, pre: 'gstrike', kind: 'cast', mana: 0, stam: 7, desc: 'Hold: a fast chain of claw strikes at the enemy nearest the cursor. Each strike leaps to another enemy within reach if there is one, like a raven moving between carcasses. Every fourth strike gives an Omen.',
    perks: [{ l: 5, v: 'flurrymore', name: 'Murder of Crows', desc: 'Two more strikes in each chain.' }, { l: 10, v: 'flurryomen', name: 'Carrion Omen', desc: 'Every third strike gives an Omen instead.', stat: ['con', 55] }] },
  dhead: { cls: 'miasmancer', name: "Death's Head", tab: 2, r: 2, c: 2, pre: 'dstep', kind: 'passive', desc: 'A chance for your blows and strikes to hit critically, for double damage.',
    perks: [{ l: 5, v: 'critdmg', name: 'Deathblow', desc: 'Critical hits strike for triple instead.' }, { l: 10, v: 'critomen', name: 'Death Sign', desc: 'Critical hits give an Omen.', stat: ['con', 55] }] },
  execute: { cls: 'miasmancer', name: 'Execute', tab: 2, r: 3, c: 1, pre: 'flurry', kind: 'cast', mana: 0, stam: 8, desc: 'Finisher: strike the enemy nearest the cursor, spending every Omen. Below 10% life (+8% per Omen) it dies outright; bosses take triple damage instead.',
    perks: [{ l: 5, v: 'execcheap', name: 'Clean Kill', desc: 'Execute costs no stamina.' }, { l: 10, v: 'execthr', name: 'Headsman', desc: 'It kills outright below 15% life (+8% per Omen).', stat: ['con', 60] }] },
  deathm: { cls: 'miasmancer', name: 'Death Mastery', tab: 2, r: 5, c: 1, kind: 'passive', desc: 'More melee damage from your claws and strikes.',
    perks: [{ l: 5, v: 'deathspd', name: 'Swift Death', desc: 'You strike 10% faster.' }, { l: 8, v: 'lbreath', name: 'Last Breath', desc: 'Once a minute, a killing blow leaves you at 1 life instead, unseen and untouchable for 2 s.' }, { l: 12, v: 'breathheal', name: 'Second Wind', desc: 'Last Breath also mends 30% of your life.' }, { l: 16, v: 'omen4', name: 'Fourth Omen', desc: 'You can hold a fourth Omen.', stat: ['con', 65] }] }
});

for (const k in SK) SK[k].cls = SK[k].cls || 'animancer';
const COST_MULT = 1.6;
for (const k in SK) if (SK[k].mana) SK[k].mana = Math.round(SK[k].mana * COST_MULT * (SK[k].cls === 'hemomancer' ? 1.5 : 1) * 10) / 10;

for (const k in SK) SK[k].req = SK[k].req || ROWREQ[SK[k].r];
const SK_ORDER = Object.keys(SK);
// perk "virtual skills": a perk is live once its skill reaches the level (and the stat if any); it then scales with that skill
const VIRT = {};
for (const k of SK_ORDER) (SK[k].perks || []).forEach((p, i) => { VIRT[p.v] = { s: k, i }; });
function perkOn(id, i, d = D) { const p = SK[id].perks[i]; if ((P.skills[id] || 0) < p.l) return false; if (p.stat && d && (d[p.stat[0]] || 0) < p.stat[1]) return false; return true; }
function syncPerks(d) {
  for (const v in VIRT) { const { s, i } = VIRT[v]; P.skills[v] = perkOn(s, i, d) ? P.skills[s] : 0; }
  // the golem's weapons are a loadout: they scale with the golem itself
  P.skills.sword = P.skills.axe = P.skills.flail = P.skills.golem || 0;
}
const STAT_NAME = { spi: 'Essence', vit: 'Vitality', con: 'Constitution' };
const TAB_SETS = { animancer: ['Iron', 'Anima', 'Logos'], ossumancer: ['Ossuary', 'Marrow', 'Carapace'], hemomancer: ['Brood', 'Blood', 'Flesh'], miasmancer: ['Miasma', 'Distortion', 'Death'] };
function tabNames() { return TAB_SETS[P.cls] || TAB_SETS.animancer; }
const RIGHT_SKILLS = ['attack'].concat(SK_ORDER.filter(k => SK[k].kind === 'cast' || SK[k].kind === 'hold'));   // v0.23: the basic attack can go on either button
const LEFT_SKILLS = ['attack'].concat(SK_ORDER.filter(k => SK[k].kind === 'cast' || SK[k].kind === 'hold'));
const WEAPONS = ['sword', 'axe', 'flail'];
const WEAPON_NAMES = { sword: 'Knight Sword', axe: 'Headsman Axe', flail: 'Morning Star' };
const BINDABLE = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'o', 'f', 'z', 'x', 'b', 'n'];
function defaultKeys(cls) { const c = cls || P.cls; if (c === 'miasmancer') return { q: 'shuriken', w: 'pnova', e: 'rarc', r: 'haze', t: 'blur', y: 'ntrap', u: 'reap', f: 'gstrike' }; if (c === 'hemomancer') return { q: 'blance', w: 'eggsac', e: 'hatch', r: 'thrall', t: 'cburst', y: 'devour', u: 'rush', f: 'fgolem' }; if (c === 'ossumancer') return { q: 'spear', w: 'ribcage', e: 'spikes', r: 'colossus', t: 'wall', y: 'host', u: 'sstorm', f: 'barmor' }; return { q: 'swarm', w: 'condense', e: 'wraith', r: 'golem', t: 'pillars', y: 'lance', u: 'orb', f: 'leash' }; }
function defaultRight(cls) { const c = cls || P.cls; return c === 'ossumancer' ? 'spear' : c === 'hemomancer' ? 'blance' : c === 'miasmancer' ? 'shuriken' : 'swarm'; }
// v0.14: you start with nothing learned and one point to spend, as in Diablo 2
function defaultSkills(cls) { const s = {}; for (const k of SK_ORDER) s[k] = 0; return s; }
function defaultGbeh() { return { x: 2, y: 2, charge: true, toss: true, focus: false, hold: false }; }
function defaultWbeh() { return { x: 2, y: 2, focus: false, hold: false }; }
const BASE_ATTRS = { vit: 15, spi: 25, con: 15 };

// =================================================================== state
const G = {
  running: false, paused: false, time: 0, zone: null, zones: {}, seed: 1,
  msg: '', msgT: 0, banner: '', bannerT: 0, bannerMax: 1, bannerCol: '#d9a441', shake: 0,
  panels: { inv: false, char: false, skills: false, vendor: false, lantern: false, choir: false, gbeh: false }, map: false,
  cursorItem: null, hover: null, error: '', bossFight: false, seal: [], saveT: 0, exploreT: 0,
  golem: null, anvils: [], pillars: [], flyShield: null, great: null, echoes: [], tether: null, leashes: [], totems: [], marks: [], whips: [], orbs: [], shards: [], storms: [], phantoms: [], eshots: [],
  pick: null, tab: 1, hoverSkill: null, saveKey: 'spiritmancer.save.v2'
};
const P = {
  x: 15.5, y: 18.5, r: 0.28, face: 1, level: 1, xp: 0, cls: 'animancer',
  attrs: { ...BASE_ATTRS }, statPts: 0, skillPts: 1,
  skills: defaultSkills('animancer'), left: 'attack', right: 'swarm', keys: defaultKeys('animancer'), gweapon: 'sword', gbeh: defaultGbeh(), wbeh: defaultWbeh(), alloc: { beam: 0, prism: 0 }, gold: 0,
  hp: 1, mana: 1, stam: 1, stamDelay: 0, wisps: [], wispT: 0,
  roll: 0, rollDir: { x: 0, y: 0 }, iframe: 0, cast: 0, swing: 0, wraith: false, infuse: false, infT: 0, condensing: false, condT: 0,
  lancing: false, lance: null, lanceT: 0, lanceTick: 0, rebukeAcc: 0, phantomT: 0, lastHit: null,
  hurt: 0, dead: false, deadT: 0,
  path: null, target: null, repathT: 0, stuckT: 0, buffs: {}, heal: 0, restore: 0,
  lastLantern: { zone: 'moor', idx: 0 }, found: ['moor:0'], inv: [], eq: {}, belt: [null, null, null, null], remnant: null
};
let D = null;
function itemStatSum() {
  const s = {};
  for (const k in P.eq) {
    const it = P.eq[k]; if (!it) continue;
    for (const st in it.stats) s[st] = (s[st] || 0) + it.stats[st];
    if (it.armor) s.armorBase = (s.armorBase || 0) + it.armor;
    if (it.dmg && k === 'weapon') { s.wmin = it.dmg[0]; s.wmax = it.dmg[1]; }
  }
  return fateStats(s);
}
function derive() {
  const s = itemStatSum(), b = P.buffs, K = P.skills;
  const d = { vit: P.attrs.vit + (s.vit || 0), spi: P.attrs.spi + (s.spi || 0) + (s.ene || 0), con: P.attrs.con + (s.con || 0) + (s.dex || 0) };
  applyHard(s);
  syncPerks(d);
  d.maxHp = Math.round(28 + d.vit * 3 + P.level * 3 + (s.life || 0));
  d.maxMana = P.cls === 'hemomancer' ? Math.round(20 + d.spi * 2 + P.level * 2 + (s.mana || 0)) : Math.round(8 + d.spi * 2 + P.level * 1.5 + (s.mana || 0));
  d.armor = Math.round(d.con / 2 + (s.armorBase || 0) + (s.armor || 0) + (b.stone > 0 ? 100 : 0));
  // v0.22: poise (the old stamina). Heavier armour holds you up.
  d.maxStam = Math.round(50 + d.con + d.vit + (s.armorBase || 0) * 0.35);
  d.itemWisps = Math.min(3, s.wisp || 0);
  d.wispCap = 4 + Math.floor(K.wisps / 3) + (K.bright > 0 ? 1 : 0) + d.itemWisps + (b.wisp > 0 ? 2 : 0);
  d.wispRegen = Math.max(0.4, 2.6 - 0.1 * K.wisps) / (1 + ((s.regen || 0) + 4 * K.choir + (b.wisp > 0 ? 100 : 0)) / 100) / (K.swiftw > 0 ? 1.2 : 1);
  d.dmgMult = (1 + d.spi * 0.012 + (s.dmg || 0) / 100) * (b.echo > 0 ? 1.5 : 1);
  d.castSpd = 1 + (s.fcr || 0) / 100;
  d.moveSpd = 4.5 * (1 + (s.frw || 0) / 100);
  d.res = Math.min(75, s.res || 0); d.mf = s.mf || 0; d.lok = s.lok || 0;
  d.wmin = s.wmin || 1; d.wmax = s.wmax || 2;
  d.meleeMult = 1 + d.con * 0.015;
  d.manaRegen = P.cls === 'hemomancer' ? 0.6 + d.spi * 0.02 : (1.2 + d.spi * 0.04) * (1 + 0.05 * K.nmastery);
  d.wardPct = K.ward > 0 ? Math.min(0.95, 0.68 + 0.015 * K.ward + (K.wardfast > 0 ? 0.04 : 0)) : 0;
  d.wardEff = 1 + 0.06 * K.ward;
  arcDerive(d, s);
  boneDerive(d); bloodDerive(d); miasDerive(d); fateDerive(d);
  return d;
}
// Diablo 2's curve shape: gentle early, steep past 30, a wall past 85
const xpNext = l => Math.floor((60 * Math.pow(l, 1.9) + 40 * l) * (l > 30 ? 1 + Math.pow((l - 30) / 25, 2) : 1) * (l > 85 ? 1 + (l - 85) * 0.35 : 1));
// v0.22: skills grow more slowly: every level past the first counts for 60% of what it used to
const SKILL_GROWTH = 0.6;
const L1 = id => { const L = Math.max(1, P.skills[id]); return 1 + (L - 1) * SKILL_GROWTH; };
const WISP_NERF = 0.65 * 0.65;
const WS = {
  choir: () => (1 + 0.08 * P.skills.choir) * WISP_NERF,
  anima: () => 1 + 0.1 * P.skills.animam,
  nether: () => 1 + 0.1 * P.skills.nmastery,
  iron: () => 1 + 0.08 * P.skills.forge,
  revDmg: () => (3 + 1.0 * (L1('wisps') - 1)) * D.dmgMult * WS.choir(),
  hits: () => 3 + Math.floor(P.skills.restless / 3),
  flySpd: () => 7 * (1 + 0.05 * P.skills.restless),
  burstDmg: () => (5 + 3 * (L1('burst') - 1)) * D.dmgMult * WS.choir(),
  burstR: () => 1.2 + 0.05 * P.skills.burst,
  leech: () => P.skills.leech > 0 ? 0.06 + 0.015 * P.skills.leech : 0,
  beamDps: () => (8 + 2.6 * (L1('beam') - 1)) * D.dmgMult * WS.choir(),
  range: kind => 4.5 + 0.15 * L1(kind),
  pierce: kind => kind === 'prism' ? 1 : 1 + Math.floor(P.skills.beam / 4),
  sweepAmp: () => P.skills.sweep > 0 ? 0.35 + 0.025 * P.skills.sweep : 0,
  prismDps: () => (7 + 2.3 * (L1('prism') - 1)) * D.dmgMult * WS.choir(),
  prismN: () => 2 + Math.floor(P.skills.prism / 4) + (P.skills.prismex > 0 ? 1 : 0),
  prismPct: () => (0.45 + 0.025 * P.skills.prism) * (P.skills.prismchain > 0 ? 1.3 : 1),
  bounceMult: () => 1.25 + (P.skills.resonance > 0 ? 0.1 + 0.03 * P.skills.resonance : 0),
  maxBounce: () => 3 + (P.skills.resonance > 0 ? 1 : 0) + Math.floor(P.skills.resonance / 8),
  // logos
  soulDmg: () => (7 + 3.5 * (L1('swarm') - 1)) * D.dmgMult * WS.nether() * (1 + 0.05 * P.skills.hunger),
  soulHits: () => (P.skills.hunger > 0 ? 2 + Math.floor(P.skills.hunger / 5) : 1) + (aM('g_swarm') ? 1 : 0),
  soulsPerWisp: () => 3 + Math.floor(P.skills.soullegion / 3),
  stormLife: () => (3 + 0.2 * P.skills.storm) * (P.skills.eye > 0 ? 1.5 : 1),
  stormRate: () => Math.max(0.08, 0.2 - 0.005 * P.skills.storm),
  lanceDps: () => (26 + 10 * (L1('lance') - 1)) * D.dmgMult * WS.nether(),
  lanceRange: () => 6 + 0.2 * L1('lance'),
  lancePierce: () => 2 + Math.floor(P.skills.lance / 5) + lancePierceBonus(),
  lanceMana: () => Math.max(2, 4 - 0.1 * P.skills.lance) * COST_MULT,
  focusMax: () => P.skills.focus > 0 ? 0.4 + 0.08 * P.skills.focus : 0,
  prismLN: () => 1 + Math.floor(P.skills.prismL / 5),
  prismLPct: () => 0.4 + 0.03 * P.skills.prismL,
  siphon: () => P.skills.lsiphon > 0 ? 0.02 + 0.005 * P.skills.lsiphon : 0,
  orbDmg: () => (5 + 2.5 * (L1('orb') - 1)) * D.dmgMult * WS.nether(),
  orbRate: () => Math.max(0.035, 0.07 - 0.0015 * P.skills.shards),
  shardPierce: () => P.skills.shards > 0 ? 2 + Math.floor(P.skills.shards / 6) : 1,
  cascadeN: () => P.skills.cascade > 0 ? 2 + Math.floor(P.skills.cascade / 8) : 0,
  cascadePct: () => 0.45 + 0.025 * P.skills.cascade,
  phantomDmg: () => (8 + 4 * (L1('phantom') - 1)) * D.dmgMult * WS.nether(),
  rebukeDmg: () => (10 + 5 * (L1('rebuke') - 1)) * D.dmgMult * WS.nether(),
  rebukeNeed: () => Math.max(10, 30 - 0.8 * P.skills.rebuke),
  wraithDrain: () => Math.max(2, 7 - 0.25 * P.skills.wraith),
  wraithSpd: () => 1.5 + 0.02 * P.skills.wraith + (P.skills.wraithhaste > 0 ? 0.25 : 0),
  // anima summons
  condRate: () => Math.max(0.14, 0.32 - 0.009 * P.skills.condense),
  condMax: () => Math.round((6 + P.skills.condense + (aM('w_host') ? 3 : 0)) * (P.skills.greatsoul > 0 ? 1.2 : 1)),
  condDmg: () => (5 + 2.5 * (L1('condense') - 1)) * D.dmgMult * WS.anima(),
  condLife: () => 5 + 0.3 * P.skills.condense,
  radDmg: () => (4 + 2 * (L1('radiance') - 1)) * D.dmgMult * WS.anima(),
  novaDmg: () => (15 + 8 * (L1('nova') - 1)) * D.dmgMult * WS.anima(),
  echoMax: () => Math.min(6, 1 + Math.floor(P.skills.echo / 3)),
  echoCost: () => P.skills.ascend >= 10 ? 2 : 3,
  echoHp: () => (0.7 + 0.12 * L1('echo')) * (1 + 0.08 * P.skills.animam + 0.06 * P.skills.ascend),
  echoDmg: () => (0.6 + 0.1 * L1('echo')) * WS.anima() * (1 + 0.06 * P.skills.ascend),
  leashDps: () => (9 + 4 * (L1('leash') - 1)) * D.dmgMult * WS.anima() * (P.skills.barbs > 0 ? 1.3 : 1),
  leashLife: () => (18 + P.skills.leash) * (P.skills.bindings > 0 ? 1.5 : 1),
  leashLen: () => 5 + 0.1 * P.skills.leash,
  leashMax: () => P.skills.twin > 0 ? 2 : 1,
  totemN: () => 3 + Math.floor(P.skills.totem / 5),
  totemLife: () => 14 + 0.8 * P.skills.totem,
  totemDps: () => (8 + 4 * (L1('totem') - 1)) * D.dmgMult * WS.anima(),
  markR: () => (2.2 + 0.08 * P.skills.mark) * (P.skills.markwide > 0 ? 1.5 : 1),
  markPct: () => 0.2 + 0.02 * P.skills.mark,
  markLife: () => 8 + 0.4 * P.skills.mark,
  challengeR: () => 3.5 + 0.1 * P.skills.challenge,
  challengeCd: () => Math.max(3, 6 - 0.15 * P.skills.challenge),
  harvest: () => P.skills.harvest > 0 ? 0.04 + 0.02 * P.skills.harvest : 0,
  // iron
  golem: () => {
    const l = L1('golem'), im = P.skills.ironm;
    return { max: Math.round((60 + 35 * l + P.level * 6) * (1 + 0.1 * im)), dmg: [(4 + 3 * l) * (1 + 0.08 * im), (8 + 4 * l) * (1 + 0.08 * im)], armor: 40 + 8 * l + 6 * im, spd: 4.2, recharge: Math.max(8, 22 - 0.7 * l) };
  },
  weapon: (id = P.gweapon) => {
    const l = P.skills[id] || 0;
    if (id === 'axe') return { id, dur: 1.05, reach: 1.15, mult: 1.2 + 0.12 * l, arc: 0.9 + 0.02 * l };
    if (id === 'flail') return { id, dur: 1.35, reach: 1.7, mult: 1.4 + 0.18 * l, aoe: 1.0 + 0.03 * l, stun: 0.5 + 0.02 * l };
    return { id: 'sword', dur: 0.75 / (1 + 0.03 * l), reach: 1.05, mult: 1 + 0.15 * l, twice: 0.2 + 0.01 * l };
  },
  chargeMax: () => Math.max(2, Math.min(3 + Math.floor(0.5 * (P.skills.overcharge || 0)), (typeof D !== 'undefined' && D ? D.wispCap : 4))),
  perWisp: () => 1,
  flowRate: () => P.skills.overflow > 0 ? 3 + 0.3 * P.skills.overflow : 0,
  rampLife: () => Math.min(30, 10 + 0.6 * P.skills.overcharge + 0.75 * P.skills.jugg),
  rampMult: () => 1.3 + 0.03 * P.skills.overcharge + 0.05 * P.skills.jugg,
  detDmg: () => (25 + 6 * L1('golem') + 12 * P.skills.overcharge) * WS.iron(),
  detR: () => (2.4 + 0.05 * P.skills.overcharge) * (P.skills.overload > 0 ? 1.5 : 1),
  detK: () => P.skills.overload > 0 ? 2 : 1,
  flowN: () => 8 + P.skills.overflow,
  flowDmg: () => (6 + 3 * (L1('overflow') - 1)) * D.dmgMult,
  tossDmg: () => 0.8 + 0.1 * L1('toss'),
  tossHover: () => 0.8 + 0.05 * P.skills.toss,
  ricochet: () => P.skills.bulwark > 0 ? 1 + Math.floor(P.skills.bulwark / 4) : 0,
  thornsPct: () => 60 + 25 * P.skills.thorns,
  fissureDmg: () => (16 + 8 * (L1('fissure') - 1)) * D.dmgMult * WS.iron(),
  fissureLen: () => 5 + 0.2 * P.skills.fissure,
  fissureKeep: () => 1 + Math.floor(P.skills.fissure / 6),
  auraDps: () => (8 + 3 * L1('golem') + 4 * P.skills.overcharge) * WS.iron() * (1 + 0.05 * P.skills.jugg),
  auraR: () => 2 + 0.05 * P.skills.jugg,
  pillarDmg: () => (14 + 7 * (L1('pillars') - 1)) * D.dmgMult * WS.iron(),
  pillarN: () => 3 + Math.floor(P.skills.pillars / 5),
  pillarLife: () => (10 + 0.5 * P.skills.pillars) * (1 + 0.04 * P.skills.forge) * (P.skills.temper > 0 ? 1.5 : 1),
  cageN: () => 7 + Math.floor(P.skills.cage / 5),
  cageDmg: () => (10 + 5 * (L1('cage') - 1)) * D.dmgMult * WS.iron(),
  cageLife: () => 6 + 0.3 * P.skills.cage,
  magnetR: () => 2.5 + 0.1 * P.skills.magnet,
  magnetPull: () => 0.7 + 0.04 * P.skills.magnet
};
function skillInfo(id, l) {
  const old = P.skills[id]; P.skills[id] = Math.max(1, l); syncPerks(D);
  let s = '';
  try {
    const r = Math.round, pc = v => Math.round(v * 100) + '%';
    switch (id) {
      case 'pillars': s = `${WS.pillarN()} pillars · ${r(WS.pillarDmg())} damage · stand ${WS.pillarLife().toFixed(1)}s`; break;
      case 'golem': { const g = WS.golem(); s = `Life ${g.max} · hits ${r(g.dmg[0])}-${r(g.dmg[1])} · charged aura ${r(WS.auraDps())}/s · rises after ${r(g.recharge)}s`; break; }
      case 'fissure': s = `${r(WS.fissureDmg())} per spike · ${WS.fissureLen().toFixed(1)} yd long · last ${WS.fissureKeep()} stay as pillars`; break;
      case 'sword': { const w = WS.weapon('sword'); s = `x${w.mult.toFixed(2)} damage · ${pc(w.twice)} strike twice · ${(1 / w.dur).toFixed(2)} swings/s`; break; }
      case 'toss': s = `Shield hits for x${WS.tossDmg().toFixed(2)} golem damage · spins ${WS.tossHover().toFixed(1)}s`; break;
      case 'magnet': s = `Pulls enemies within ${WS.magnetR().toFixed(1)} yd`; break;
      case 'axe': { const w = WS.weapon('axe'); s = `x${w.mult.toFixed(2)} damage · cleaves ${r(w.arc * 114)}°`; break; }
      case 'bulwark': s = `Shield ricochets to ${WS.ricochet()} more foes · harder charge knockback`; break;
      case 'cage': s = `${WS.cageN()} pillars · ${r(WS.cageDmg())} damage each · stand ${WS.cageLife().toFixed(1)}s`; break;
      case 'flail': { const w = WS.weapon('flail'); s = `x${w.mult.toFixed(2)} damage · ${w.aoe.toFixed(1)} yd smash · stun ${w.stun.toFixed(1)}s`; break; }
      case 'thorns': s = `Returns ${WS.thornsPct()}% of melee damage`; break;
      case 'resonance': s = `x${WS.bounceMult().toFixed(2)} per bounce · up to ${WS.maxBounce()} bounces`; break;
      case 'overcharge': s = `Full charge: ${WS.chargeMax()} wisps · rampage ${WS.rampLife().toFixed(1)}s at x${WS.rampMult().toFixed(2)} · burst ${r(WS.detDmg() * WS.detK())}`; break;
      case 'overflow': s = `Taking a full life of damage adds ${WS.flowRate().toFixed(1)} charge · ${WS.flowN()} souls × ${r(WS.flowDmg())}`; break;
      case 'ironm': s = `Golem +${10 * P.skills.ironm}% life · +${8 * P.skills.ironm}% damage · metal +${8 * P.skills.ironm}%`; break;
      case 'jugg': s = `Rampage ${WS.rampLife().toFixed(1)}s at x${WS.rampMult().toFixed(2)} damage · aura ${WS.auraR().toFixed(1)} yd`; break;
      case 'wisps': s = `${4 + Math.floor(P.skills.wisps / 2)} wisps · ${r(WS.revDmg())} per pass · regrow ${Math.max(0.4, 2.6 - 0.1 * P.skills.wisps).toFixed(2)}s`; break;
      case 'restless': s = `${WS.hits()} passes per wisp · flight speed +${5 * P.skills.restless}%`; break;
      case 'condense': s = `1 wisp per ${WS.condRate().toFixed(2)}s · up to ${WS.condMax()} · ${r(WS.condDmg())} per pass (+35% per wisp)`; break;
      case 'beam': s = `${r(WS.beamDps())} dmg/s · range ${WS.range('beam').toFixed(2)} · pierce ${WS.pierce('beam')}`; break;
      case 'burst': s = `Explodes for ${r(WS.burstDmg())} in ${WS.burstR().toFixed(1)} yd`; break;
      case 'echo': s = `Up to ${WS.echoMax()} echoes · ${pc(WS.echoHp())} life · ${pc(WS.echoDmg())} damage of the fallen`; break;
      case 'prism': s = `${r(WS.prismDps())} dmg/s · ${WS.prismN()} rays at ${pc(WS.prismPct())}`; break;
      case 'leech': s = `Steals ${pc(WS.leech())} of pass damage as life and Essence`; break;
      case 'leash': s = `${r(WS.leashDps())} dmg/s along the chain · lasts ${r(WS.leashLife())}s · ${WS.leashMax()} at once`; break;
      case 'totem': s = `Houses ${WS.totemN()} wisps · ${r(WS.totemDps())} dmg/s each · lasts ${r(WS.totemLife())}s`; break;
      case 'mark': s = `+${pc(WS.markPct())} damage taken · ${WS.markR().toFixed(1)} yd · ${r(WS.markLife())}s`; break;
      case 'challenge': s = `Taunts within ${WS.challengeR().toFixed(1)} yd every ${WS.challengeCd().toFixed(1)}s`; break;
      case 'forge': s = `Metal +${8 * P.skills.forge}% damage · pillars last +${4 * P.skills.forge}%`; break;
      case 'tether': s = `${r(WS.tetherDps())} dmg/s along each chain · lasts ${WS.tetherLife().toFixed(1)}s`; break;
      case 'sweep': s = `Sweeps ${r(WS.sweepAmp() * 57)}° each way`; break;
      case 'radiance': s = `Pulses ${r(WS.radDmg())} (+15% per wisp) every 0.8s`; break;
      case 'ascend': s = `Echoes +${6 * P.skills.ascend}% life and damage · mend 2%/s · burst when they fall`; break;
      case 'nova': s = `Detonates for ${r(WS.novaDmg())} (+25% per wisp)`; break;
      case 'choir': s = `+${12 * P.skills.choir}% wisp damage · +${4 * P.skills.choir}% regrowth`; break;
      case 'animam': s = `+${10 * P.skills.animam}% echo and great wisp damage · echoes +${8 * P.skills.animam}% life`; break;
      case 'harvest': s = `${pc(WS.harvest())} chance per kill to free a wisp`; break;
      case 'swarm': s = `${r(WS.soulDmg())} per soul · ${WS.soulsPerWisp() - 1} souls per wisp spent`; break;
      case 'ward': s = `Essence absorbs ${r(Math.min(0.95, 0.68 + 0.015 * P.skills.ward) * 100)}% of damage · 1 Essence stops ${(1 + 0.06 * P.skills.ward).toFixed(2)}`; break;
      case 'lance': s = `${r(WS.lanceDps() * 0.42)} damage per leap · ${WS.lancePierce() + 1} leaps · reach ${WS.lanceRange().toFixed(1)} yd · -18% per leap`; break;
      case 'hunger': s = `Souls hit ${WS.soulHits()} foes · +${5 * P.skills.hunger}% damage`; break;
      case 'wraith': s = `Drain ${WS.wraithDrain().toFixed(1)} Essence/s · speed x${WS.wraithSpd().toFixed(2)}`; break;
      case 'focus': s = `Up to +${r(WS.focusMax() * 100)}% after 2s of channeling`; break;
      case 'soullegion': s = `${WS.soulsPerWisp() - 1} souls per wisp spent`; break;
      case 'rebuke': s = `Every ${r(WS.rebukeNeed())} damage soaked: ${r(WS.rebukeDmg())} pulse`; break;
      case 'prismL': s = `Splits into ${WS.prismLN()} rays at ${pc(WS.prismLPct())} on each reflection`; break;
      case 'storm': s = `Lasts ${WS.stormLife().toFixed(1)}s · a soul every ${WS.stormRate().toFixed(2)}s`; break;
      case 'orb': s = `${r(WS.orbDmg())} per shard · range 8`; break;
      case 'lsiphon': s = `Returns ${pc(WS.siphon())} as life and Essence`; break;
      case 'phantom': s = `Afterimages burst for ${r(WS.phantomDmg())}`; break;
      case 'shards': s = `A shard every ${WS.orbRate().toFixed(3)}s · pierce ${WS.shardPierce()}`; break;
      case 'cascade': s = `Splits into ${WS.cascadeN()} orbs at ${pc(WS.cascadePct())} strength`; break;
      case 'nmastery': s = `+${10 * P.skills.nmastery}% Logos damage · +${5 * P.skills.nmastery}% Essence regen`; break;
      default: s = boneInfo(id) || bloodInfo(id) || miasInfo(id);
    }
  } finally { P.skills[id] = old; syncPerks(D); }
  return s;
}
function skillReady(id) { const k = SK[id]; return P.level >= k.req && (!k.pre || P.skills[k.pre] > 0); }
function onLearn(id) {
  if (P.hard[id] !== 1) return;
  const k = SK[id];
  if (k.kind === 'cast' || k.kind === 'hold') P.right = id;
  if (k.kind === 'weapon') P.gweapon = id;
  if (id === 'beam') P.alloc.beam = Math.max(P.alloc.beam, 2);
  if (id === 'prism') P.alloc.prism = Math.max(P.alloc.prism, 2);
}
function learn(id) {
  if (P.skillPts <= 0 || !skillReady(id) || (P.hard[id] || 0) >= 20) return false;
  P.hard[id] = (P.hard[id] || 0) + 1; P.skillPts--; D = derive(); onLearn(id); sfx(660, 0.08, 'square', 0.03, 200); return true;
}
function respecSkills() { armReset(); }
function oldRespecSkills() {
  let spent = 0, free = 0; const d = defaultSkills();
  for (const k of SK_ORDER) spent += P.skills[k] || 0;
  for (const k in d) free += d[k];
  P.skillPts += Math.max(0, spent - free); P.skills = d;
  P.alloc = { beam: 0, prism: 0 }; P.left = 'attack'; P.right = 'swarm';
  G.golem = null; G.flyShield = null; G.great = null; G.anvils = []; G.pillars = []; G.echoes = []; G.tether = null; G.storms = []; G.leashes = []; G.totems = []; G.marks = [];
  if (P.wraith) P.wraith = false;
  D = derive(); say('Skills reset', 1.4);
}
function respecStats() { armReset(); }
function oldRespecStats() {
  let spent = 0; for (const k in BASE_ATTRS) spent += P.attrs[k] - BASE_ATTRS[k];
  P.statPts += Math.max(0, spent); P.attrs = { ...BASE_ATTRS }; D = derive();
  P.hp = Math.min(P.hp, D.maxHp); P.mana = Math.min(P.mana, D.maxMana); say('Attributes reset', 1.4);
}

let shots = [], bolts = [], souls = [], beams = [], parts = [], texts = [];
function say(m, t = 2.2) { G.msg = m; G.msgT = t; }
function banner(m, col = '#d9a441', t = 3) { G.banner = m; G.bannerT = t; G.bannerMax = t; G.bannerCol = col; }
function burst(x, y, col, n = 8, spd = 2) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, s = spd * (0.4 + Math.random());
    parts.push({ x, y, z: 6 + Math.random() * 6, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 20 + Math.random() * 20, t: 0.5 + Math.random() * 0.4, col });
  }
  if (parts.length > 600) parts.splice(0, parts.length - 600);
}
function floatText(x, y, s, col) { texts.push({ x, y, z: 18, s, col, t: 0.9 }); if (texts.length > 60) texts.shift(); }

// =================================================================== inventory
const INV_W = 10, INV_H = 4;
function invFits(it, x, y, ignore) {
  if (x < 0 || y < 0 || x + it.w > INV_W || y + it.h > INV_H) return false;
  return !P.inv.some(e => e.item !== ignore && x < e.x + e.item.w && x + it.w > e.x && y < e.y + e.item.h && y + it.h > e.y);
}
function invOverlaps(it, x, y) { return P.inv.filter(e => x < e.x + e.item.w && x + it.w > e.x && y < e.y + e.item.h && y + it.h > e.y); }
function invAdd(it) {
  for (let x = 0; x < INV_W; x++) for (let y = 0; y < INV_H; y++) if (invFits(it, x, y)) { P.inv.push({ item: it, x, y }); return true; }
  return false;
}
function beltAdd(it) {
  if (!it.potion) return false;
  for (let i = 0; i < 4; i++) { const s = P.belt[i]; if (s && s.kind === it.potion && s.n < 4) { s.n++; return true; } }
  for (let i = 0; i < 4; i++) if (!P.belt[i]) { P.belt[i] = { kind: it.potion, n: 1 }; return true; }
  return false;
}
function drink(kind) {
  if (kind === 'hp') { P.heal += potionHeal(D.maxHp * 0.4); sfx(300, 0.2, 'sine', 0.04, 200); }
  else { P.restore += D.maxMana * 0.5; sfx(500, 0.2, 'sine', 0.04, 200); }
}
function drinkBelt(i) {
  const s = P.belt[i]; if (!s || P.dead) return;
  drink(s.kind); s.n--; if (s.n <= 0) P.belt[i] = null;
  // refill from inventory
  if (!P.belt[i] || P.belt[i].n < 4) {
    const e = P.inv.find(e => e.item.potion === s.kind);
    if (e) { P.inv.splice(P.inv.indexOf(e), 1); if (!beltAdd(e.item)) invAdd(e.item); }
  }
}
function slotFor(it) { return it.potion ? null : BASES[it.base].slot; }
function canEquip(it, slot) {
  if (it.potion) return false;
  const s = BASES[it.base].slot;
  if (s === 'ring') return slot === 'ring1' || slot === 'ring2';
  return s === slot;
}
function equipSwap(slot) {
  const c = G.cursorItem;
  if (c) {
    if (!canEquip(c, slot)) { say('That does not go there', 1.2); return; }
    if (c.lvl > P.level) { say(`Requires level ${c.lvl}`, 1.4); return; }
    const old = P.eq[slot] || null; P.eq[slot] = c; G.cursorItem = old;
  } else if (P.eq[slot]) { G.cursorItem = P.eq[slot]; P.eq[slot] = null; }
  D = derive(); P.hp = Math.min(P.hp, D.maxHp); P.mana = Math.min(P.mana, D.maxMana);
  sfx(240, 0.05, 'square', 0.03);
}
function quickEquip(entry) {
  const it = entry.item;
  if (it.potion) { P.inv.splice(P.inv.indexOf(entry), 1); if (!beltAdd(it)) drink(it.potion); return; }
  if (it.lvl > P.level) { say(`Requires level ${it.lvl}`, 1.4); return; }
  let slot = BASES[it.base].slot;
  if (slot === 'ring') slot = !P.eq.ring1 ? 'ring1' : !P.eq.ring2 ? 'ring2' : 'ring1';
  const old = P.eq[slot] || null;
  P.inv.splice(P.inv.indexOf(entry), 1);
  P.eq[slot] = it;
  if (old && !invAdd(old)) { dropItem(old, P.x, P.y); }
  D = derive(); sfx(240, 0.05, 'square', 0.03);
}
function dropItem(it, x, y) {
  G.zone.items.push({ item: it, x: x + rand(-.4, .4), y: y + rand(-.4, .4), t: 0.4 });
}

// =================================================================== loot
function dropLoot(x, y, ilvl, kind) {
  const mf = D.mf;
  const drops = [];
  const itemRolls = kind === 'boss' ? 6 : kind === 'unique' ? 3 : kind === 'champion' ? 2 : kind === 'chest' ? randi(1, 3) : 1;
  const itemChance = kind === 'normal' || kind === 'minion' ? 0.1 : kind === 'chest' ? 0.75 : kind === 'champion' ? 0.5 : 1;
  for (let i = 0; i < itemRolls; i++) if (Math.random() < itemChance * 0.6) drops.push(rollItem(ilvl, mf + (kind === 'boss' ? 250 : kind === 'unique' ? 120 : 0)));
  if (kind === 'boss') { let it; do { it = rollItem(ilvl + 2, 400); } while (it.q !== 'rare' && it.q !== 'unique'); drops.push(it); }
  const goldChance = kind === 'normal' || kind === 'minion' ? 0.35 : 0.9;
  if (Math.random() < goldChance * 0.55) drops.push({ gold: Math.round(rand(3, 9) * ilvl * (kind === 'boss' ? 12 : kind === 'unique' ? 4 : kind === 'champion' ? 2 : 1)) });
  if (Math.random() < (kind === 'normal' || kind === 'minion' ? 0.12 : 0.6) * 0.5) drops.push(newPotion(Math.random() < .55 ? 'hp' : 'mp'));
  drops.forEach(d => {
    const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * (drops.length > 3 ? 1.3 : 0.7);
    let px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (G.zone.solidAt(px, py)) { px = x; py = y; }
    if (d.gold) G.zone.items.push({ gold: d.gold, x: px, y: py, t: 0.4 });
    else G.zone.items.push({ item: d, x: px, y: py, t: 0.4 });
  });
  if (drops.some(d => d.q === 'unique')) sfx(880, 0.4, 'sine', 0.05, 440);
}
function pickup(g) {
  const z = G.zone, i = z.items.indexOf(g);
  if (i < 0) return;
  if (g.gold) { g.gold = Math.max(1, Math.round(g.gold * (D.goldK || 1))); P.gold += g.gold; floatText(g.x, g.y, `+${g.gold} gold`, '#d9a441'); z.items.splice(i, 1); sfx(1200, 0.05, 'square', 0.02); return; }
  const it = g.item;
  if ((it.potion && beltAdd(it)) || invAdd(it)) { z.items.splice(i, 1); sfx(700, 0.05, 'square', 0.03); if (it.q === 'unique' || it.q === 'rare') say(it.name, 1.5); }
  else say('No room in your inventory', 1.4);
}
