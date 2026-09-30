// =================================================================== skills (data)
// tab: 0 Wisps, 1 Iron, 2 Anima · r/c: position in the D2-style grid · kind: passive | cast | hold | weapon
const SK = {
  wisps: { name: 'Wisps', tab: 0, r: 0, c: 1, req: 1, kind: 'passive', desc: 'Your choir of wisps drifts around you. More points: more wisps, faster regrowth, stronger revenants. Press V to choose how many of each wisp type you keep.' },
  restless: { name: 'Restless Dead', tab: 0, r: 1, c: 0, req: 3, pre: 'wisps', kind: 'passive', desc: 'Revenant wisps fly faster and pass through more enemies before they perish.' },
  beam: { name: 'Spirit Beam', tab: 0, r: 1, c: 2, req: 3, pre: 'wisps', kind: 'passive', desc: 'Unlocks beam wisps: a sustained golden beam that fades out. Levels add damage, pierce and a little range. Beams bounce off metal.' },
  burst: { name: 'Grave Burst', tab: 0, r: 2, c: 0, req: 6, pre: 'restless', kind: 'passive', desc: 'Revenant wisps explode when they perish, damaging everything nearby.' },
  prism: { name: 'Prism Wisps', tab: 0, r: 2, c: 1, req: 9, pre: 'beam', kind: 'passive', desc: 'Unlocks prism wisps: their beam strikes one foe and refracts into rays that jump to others nearby.' },
  leech: { name: 'Soul Leech', tab: 0, r: 3, c: 0, req: 12, pre: 'burst', kind: 'passive', desc: 'Every revenant pass steals life and mana for you.' },
  sweep: { name: 'Sweeping Beam', tab: 0, r: 3, c: 2, req: 12, pre: 'beam', kind: 'passive', desc: 'Beam wisps sweep their beam back and forth across an arc as it burns.' },
  choir: { name: 'Choir Mastery', tab: 0, r: 4, c: 1, req: 18, kind: 'passive', desc: 'All wisp damage is increased and wisps regrow faster.' },

  golem: { name: 'Iron Golem', tab: 1, r: 0, c: 1, req: 3, kind: 'cast', desc: 'A knight of iron that never dies: at zero life it falls dormant and rises again. Charges with its tower shield. Recast to move it. Hold right-click on it to pour wisps into it and heal it.' },
  sword: { name: 'Knight Sword', tab: 1, r: 1, c: 0, req: 6, pre: 'golem', kind: 'weapon', desc: 'The golem wields a sword: fast, precise strikes that sometimes land twice.' },
  axe: { name: 'Headsman Axe', tab: 1, r: 1, c: 1, req: 6, pre: 'golem', kind: 'weapon', desc: 'The golem wields a great axe: slower swings that cleave every enemy in a wide arc.' },
  flail: { name: 'Morning Star', tab: 1, r: 1, c: 2, req: 6, pre: 'golem', kind: 'weapon', desc: 'The golem wields a flail: slow, long-reaching smashes that crush an area and stun.' },
  bulwark: { name: 'Bulwark', tab: 1, r: 2, c: 0, req: 12, pre: 'golem', kind: 'passive', desc: 'When the golem plants its shield after a charge, the ground shatters: damage and stun around it. It fetches the shield back sooner.' },
  anvil: { name: 'Anvil', tab: 1, r: 2, c: 1, req: 12, pre: 'golem', kind: 'cast', desc: 'Drop an iron anvil: impact damage and stun, then it stays as an obstacle. Beams bounce off it.' },
  thorns: { name: 'Iron Thorns', tab: 1, r: 2, c: 2, req: 12, pre: 'golem', kind: 'passive', desc: 'Enemies that strike the golem in melee take part of the damage back.' },
  overcharge: { name: 'Overcharge', tab: 1, r: 3, c: 0, req: 18, pre: 'golem', kind: 'passive', desc: 'Keep pouring wisps into a golem at full life: each one powers it up. At the limit it detonates, then reanimates.' },
  overflow: { name: 'Anima Overflow', tab: 1, r: 3, c: 2, req: 18, pre: 'thorns', kind: 'passive', desc: 'Damage the golem takes builds up. When full, it bursts out as a ring of seeking wisps, and the golem shuts down and reanimates whole.' },
  ironm: { name: 'Iron Mastery', tab: 1, r: 4, c: 1, req: 24, kind: 'passive', desc: 'Your golem gains life, damage and armor.' },

  ward: { name: 'Mana Ward', tab: 2, r: 0, c: 0, req: 1, kind: 'passive', desc: 'Mana absorbs part of the damage you take before your life does. Levels absorb more, with less mana per hit.' },
  swarm: { name: 'Soul Swarm', tab: 2, r: 0, c: 2, req: 1, kind: 'cast', desc: 'Spend up to 3 wisps. The more wisps you hold, the more seeking souls fly.' },
  condense: { name: 'Condense', tab: 2, r: 1, c: 1, req: 3, kind: 'hold', desc: 'Hold: stand still and crush your wisps into one great wisp that grows with each one. Release it to hunt your foes for a short time.' },
  radiance: { name: 'Radiant Core', tab: 2, r: 2, c: 0, req: 9, pre: 'condense', kind: 'passive', desc: 'The great wisp pulses light that burns every enemy around it.' },
  nova: { name: 'Supernova', tab: 2, r: 2, c: 2, req: 9, pre: 'condense', kind: 'passive', desc: 'When the great wisp fades, it detonates. Bigger wisps, bigger blast.' },
  wraith: { name: 'Wraith Form', tab: 2, r: 3, c: 1, req: 12, kind: 'cast', desc: 'Toggle: fast, phasing through enemies, immune to physical harm. Drains mana. Any attack ends it.' },
  animam: { name: 'Anima Mastery', tab: 2, r: 4, c: 1, req: 18, kind: 'passive', desc: 'Soul Swarm, the great wisp and golem bursts deal more damage. Increases mana.' }
};
const SK_ORDER = Object.keys(SK);
const TAB_NAMES = ['Wisps', 'Iron', 'Anima'];
const RIGHT_SKILLS = ['swarm', 'condense', 'wraith', 'golem', 'anvil'];
const LEFT_SKILLS = ['attack', 'swarm', 'golem', 'anvil'];
const WEAPONS = ['sword', 'axe', 'flail'];
function defaultSkills() { const s = {}; for (const k of SK_ORDER) s[k] = 0; s.wisps = 1; s.ward = 1; return s; }
const BASE_ATTRS = { vit: 15, ene: 20, spi: 20, dex: 15 };

// =================================================================== state
const G = {
  running: false, paused: false, time: 0, zone: null, zones: {}, seed: 1,
  msg: '', msgT: 0, banner: '', bannerT: 0, bannerMax: 1, bannerCol: '#d9a441', shake: 0,
  panels: { inv: false, char: false, skills: false, vendor: false, lantern: false, choir: false }, map: false,
  cursorItem: null, hover: null, error: '', bossFight: false, seal: [], saveT: 0, exploreT: 0,
  golem: null, anvils: [], shieldDrop: null, great: null, pick: null, tab: 0, saveKey: 'spiritmancer.save.v2'
};
const P = {
  x: 15.5, y: 18.5, r: 0.28, face: 1, level: 1, xp: 0,
  attrs: { ...BASE_ATTRS }, statPts: 0, skillPts: 1,
  skills: defaultSkills(), left: 'attack', right: 'swarm', gweapon: 'sword', alloc: { beam: 0, prism: 0 }, gold: 0,
  hp: 1, mana: 1, stam: 1, stamDelay: 0, wisps: [], wispT: 0,
  roll: 0, rollDir: { x: 0, y: 0 }, iframe: 0, cast: 0, swing: 0, wraith: false, infuse: false, infT: 0, condensing: false, condT: 0,
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
  return s;
}
function derive() {
  const s = itemStatSum(), b = P.buffs, K = P.skills;
  const d = { vit: P.attrs.vit + (s.vit || 0), ene: P.attrs.ene + (s.ene || 0), spi: P.attrs.spi + (s.spi || 0), dex: P.attrs.dex + (s.dex || 0) };
  d.maxHp = Math.round(28 + d.vit * 3 + P.level * 3 + (s.life || 0));
  d.maxMana = Math.round((8 + d.ene * 2 + P.level * 1.5 + (s.mana || 0)) * (1 + 0.03 * K.animam));
  d.maxStam = Math.round(50 + d.dex + d.vit);
  d.armor = Math.round(d.dex / 2 + (s.armorBase || 0) + (s.armor || 0) + (b.stone > 0 ? 100 : 0));
  d.wispCap = 4 + Math.floor(K.wisps / 2) + (s.wisp || 0) + (b.wisp > 0 ? 3 : 0);
  d.wispRegen = Math.max(0.4, 2.6 - 0.1 * K.wisps) / (1 + ((s.regen || 0) + 4 * K.choir + (b.wisp > 0 ? 100 : 0)) / 100);
  d.dmgMult = (1 + d.spi * 0.02 + (s.dmg || 0) / 100) * (b.echo > 0 ? 1.5 : 1);
  d.castSpd = 1 + (s.fcr || 0) / 100;
  d.moveSpd = 3.9 * (1 + (s.frw || 0) / 100);
  d.res = Math.min(75, s.res || 0); d.mf = s.mf || 0; d.lok = s.lok || 0;
  d.wmin = s.wmin || 1; d.wmax = s.wmax || 2;
  d.meleeMult = 1 + d.dex * 0.01;
  d.manaRegen = 1.2 + d.ene * 0.04;
  d.wardPct = K.ward > 0 ? Math.min(0.95, 0.68 + 0.015 * K.ward) : 0;
  d.wardEff = 1 + 0.06 * K.ward;
  return d;
}
const xpNext = l => Math.floor(60 * Math.pow(l, 1.9) + 40 * l);
const L1 = id => Math.max(1, P.skills[id]);
const WS = {
  choir: () => 1 + 0.12 * P.skills.choir,
  anima: () => 1 + 0.1 * P.skills.animam,
  revDmg: () => (3 + 1.5 * (L1('wisps') - 1)) * D.dmgMult * WS.choir(),
  hits: () => 3 + Math.floor(P.skills.restless / 3),
  flySpd: () => 7 * (1 + 0.05 * P.skills.restless),
  burstDmg: () => (5 + 3 * (L1('burst') - 1)) * D.dmgMult * WS.choir(),
  burstR: () => 1.2 + 0.05 * P.skills.burst,
  leech: () => P.skills.leech > 0 ? 0.08 + 0.02 * P.skills.leech : 0,
  beamDps: () => (8 + 4 * (L1('beam') - 1)) * D.dmgMult * WS.choir(),
  range: kind => 4.5 + 0.15 * L1(kind),
  pierce: kind => kind === 'prism' ? 1 : 1 + Math.floor(P.skills.beam / 4),
  sweepAmp: () => P.skills.sweep > 0 ? 0.35 + 0.025 * P.skills.sweep : 0,
  prismDps: () => (7 + 3.5 * (L1('prism') - 1)) * D.dmgMult * WS.choir(),
  prismN: () => 2 + Math.floor(P.skills.prism / 4),
  prismPct: () => 0.45 + 0.025 * P.skills.prism,
  soulDmg: () => (4 + 2 * (L1('swarm') - 1)) * D.dmgMult * WS.anima(),
  condRate: () => Math.max(0.14, 0.32 - 0.009 * P.skills.condense),
  condMax: () => 6 + P.skills.condense,
  condDmg: () => (5 + 2.5 * (L1('condense') - 1)) * D.dmgMult * WS.anima(),
  condLife: () => 5 + 0.3 * P.skills.condense,
  radDmg: () => (4 + 2 * (L1('radiance') - 1)) * D.dmgMult * WS.anima(),
  novaDmg: () => (15 + 8 * (L1('nova') - 1)) * D.dmgMult * WS.anima(),
  wraithDrain: () => Math.max(2, 7 - 0.25 * P.skills.wraith),
  wraithSpd: () => 1.5 + 0.02 * P.skills.wraith,
  golem: () => {
    const l = L1('golem'), im = P.skills.ironm;
    return { max: Math.round((60 + 35 * l + P.level * 6) * (1 + 0.1 * im)), dmg: [(4 + 3 * l) * (1 + 0.08 * im), (8 + 4 * l) * (1 + 0.08 * im)], armor: 40 + 8 * l + 6 * im, spd: 3.4, recharge: Math.max(8, 22 - 0.7 * l) };
  },
  weapon: (id = P.gweapon) => {
    const l = P.skills[id] || 0;
    if (id === 'axe') return { id, dur: 1.05, reach: 1.15, mult: 1.2 + 0.12 * l, arc: 0.9 + 0.02 * l };
    if (id === 'flail') return { id, dur: 1.35, reach: 1.7, mult: 1.4 + 0.18 * l, aoe: 1.0 + 0.03 * l, stun: 0.5 + 0.02 * l };
    return { id: 'sword', dur: 0.75 / (1 + 0.03 * l), reach: 1.05, mult: 1 + 0.15 * l, twice: 0.2 + 0.01 * l };
  },
  shieldTime: () => P.skills.bulwark > 0 ? Math.max(15, 30 - 0.75 * P.skills.bulwark) : 30,
  shockDmg: () => (10 + 6 * (L1('bulwark') - 1)) * (1 + 0.08 * P.skills.ironm),
  shockR: () => 1.6 + 0.05 * P.skills.bulwark,
  thornsPct: () => 60 + 25 * P.skills.thorns,
  overMax: () => 6 + Math.floor(P.skills.overcharge / 3),
  detDmg: () => (30 + 15 * (L1('overcharge') - 1)) * (1 + 0.08 * P.skills.ironm),
  detR: () => 2.4 + 0.05 * P.skills.overcharge,
  flowPct: () => Math.max(0.45, 0.9 - 0.02 * P.skills.overflow),
  flowN: () => 8 + P.skills.overflow,
  flowDmg: () => (6 + 3 * (L1('overflow') - 1)) * D.dmgMult * WS.anima(),
  anvilDmg: () => (18 + 9 * (L1('anvil') - 1)) * D.dmgMult,
  anvilLife: () => 8 + 0.5 * P.skills.anvil,
  anvilMax: () => 1 + Math.floor(P.skills.anvil / 6)
};
function skillInfo(id, l) {
  const old = P.skills[id]; P.skills[id] = Math.max(1, l);
  let s = '';
  try {
    switch (id) {
      case 'wisps': s = `${4 + Math.floor(P.skills.wisps / 2)} wisps · ${Math.round(WS.revDmg())} per pass · regrow ${Math.max(0.4, 2.6 - 0.1 * P.skills.wisps).toFixed(2)}s`; break;
      case 'restless': s = `${WS.hits()} passes per wisp · flight speed +${5 * P.skills.restless}%`; break;
      case 'burst': s = `Explodes for ${Math.round(WS.burstDmg())} in ${WS.burstR().toFixed(1)} yards`; break;
      case 'leech': s = `Steals ${Math.round(WS.leech() * 100)}% of pass damage as life and mana`; break;
      case 'beam': s = `${Math.round(WS.beamDps())} dmg/s · range ${WS.range('beam').toFixed(2)} · pierce ${WS.pierce('beam')}`; break;
      case 'prism': s = `${Math.round(WS.prismDps())} dmg/s · ${WS.prismN()} rays at ${Math.round(WS.prismPct() * 100)}% · range ${WS.range('prism').toFixed(2)}`; break;
      case 'sweep': s = `Sweeps ${Math.round(WS.sweepAmp() * 57)}° each way`; break;
      case 'choir': s = `+${12 * P.skills.choir}% wisp damage · +${4 * P.skills.choir}% regrowth`; break;
      case 'golem': { const g = WS.golem(); s = `Life ${g.max} · hits ${Math.round(g.dmg[0])}-${Math.round(g.dmg[1])} · rises after ${Math.round(g.recharge)}s`; break; }
      case 'sword': { const w = WS.weapon('sword'); s = `x${w.mult.toFixed(2)} damage · ${Math.round(w.twice * 100)}% strike twice · ${(1 / w.dur).toFixed(2)} swings/s`; break; }
      case 'axe': { const w = WS.weapon('axe'); s = `x${w.mult.toFixed(2)} damage · cleaves ${Math.round(w.arc * 114)}°`; break; }
      case 'flail': { const w = WS.weapon('flail'); s = `x${w.mult.toFixed(2)} damage · ${w.aoe.toFixed(1)} yd smash · stun ${w.stun.toFixed(1)}s`; break; }
      case 'bulwark': s = `Shatter ${Math.round(WS.shockDmg())} in ${WS.shockR().toFixed(1)} yd · fetches shield after ${Math.round(WS.shieldTime())}s`; break;
      case 'thorns': s = `Returns ${WS.thornsPct()}% of melee damage`; break;
      case 'overcharge': s = `${WS.overMax()} charges (+8% damage and speed each) · detonates for ${Math.round(WS.detDmg())}`; break;
      case 'overflow': s = `Bursts after taking ${Math.round(WS.flowPct() * 100)}% of its life · ${WS.flowN()} wisps × ${Math.round(WS.flowDmg())}`; break;
      case 'ironm': s = `Golem +${10 * P.skills.ironm}% life · +${8 * P.skills.ironm}% damage · +${6 * P.skills.ironm} armor`; break;
      case 'ward': s = `Mana absorbs ${Math.round(Math.min(0.95, 0.68 + 0.015 * P.skills.ward) * 100)}% of damage · 1 mana stops ${(1 + 0.06 * P.skills.ward).toFixed(2)} damage`; break;
      case 'swarm': s = `Soul damage ${Math.round(WS.soulDmg())} each`; break;
      case 'condense': s = `1 wisp per ${WS.condRate().toFixed(2)}s · up to ${WS.condMax()} wisps · ${Math.round(WS.condDmg())} per pass (+35% per wisp) · lasts ${WS.condLife().toFixed(1)}s+`; break;
      case 'radiance': s = `Pulses ${Math.round(WS.radDmg())} (+15% per wisp) every 0.8s`; break;
      case 'nova': s = `Detonates for ${Math.round(WS.novaDmg())} (+25% per wisp)`; break;
      case 'wraith': s = `Drain ${WS.wraithDrain().toFixed(1)} mana/s · speed x${WS.wraithSpd().toFixed(2)}`; break;
      case 'animam': s = `+${10 * P.skills.animam}% Anima damage · +${3 * P.skills.animam}% mana`; break;
      case 'anvil': s = `${Math.round(WS.anvilDmg())} impact · lasts ${WS.anvilLife().toFixed(1)}s · up to ${WS.anvilMax()}`; break;
    }
  } finally { P.skills[id] = old; }
  return s;
}
function skillReady(id) { const k = SK[id]; return P.level >= k.req && (!k.pre || P.skills[k.pre] > 0); }
function onLearn(id) {
  if (P.skills[id] !== 1) return;
  const k = SK[id];
  if (k.kind === 'cast' || k.kind === 'hold') P.right = id;
  if (k.kind === 'weapon') P.gweapon = id;
  if (id === 'beam') P.alloc.beam = Math.max(P.alloc.beam, 2);
  if (id === 'prism') P.alloc.prism = Math.max(P.alloc.prism, 2);
}
function learn(id) {
  if (P.skillPts <= 0 || !skillReady(id) || P.skills[id] >= 20) return false;
  P.skills[id]++; P.skillPts--; onLearn(id); D = derive(); sfx(660, 0.08, 'square', 0.03, 200); return true;
}
function respecSkills() {
  let spent = 0, free = 0; const d = defaultSkills();
  for (const k in P.skills) spent += P.skills[k] || 0;
  for (const k in d) free += d[k];
  P.skillPts += Math.max(0, spent - free); P.skills = d;
  P.alloc = { beam: 0, prism: 0 }; P.gweapon = 'sword'; P.left = 'attack'; P.right = 'swarm';
  G.golem = null; G.shieldDrop = null; G.great = null; G.anvils = [];
  if (P.wraith) P.wraith = false;
  D = derive(); say('Skills reset', 1.4);
}
function respecStats() {
  let spent = 0; for (const k in BASE_ATTRS) spent += P.attrs[k] - BASE_ATTRS[k];
  P.statPts += Math.max(0, spent); P.attrs = { ...BASE_ATTRS }; D = derive();
  P.hp = Math.min(P.hp, D.maxHp); P.mana = Math.min(P.mana, D.maxMana); say('Attributes reset', 1.4);
}

