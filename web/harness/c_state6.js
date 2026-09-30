// =================================================================== skills (data)
// tab: 0 Iron, 1 Anima, 2 Logos · r/c: position in the D2-style grid (row sets the level tier) · kind: passive | cast | hold | weapon
const ROWREQ = [1, 4, 8, 12, 16, 20];
const SK = {
  // ---------------- IRON: the golem, metal and the ground
  pillars: { name: 'Iron Pillars', tab: 0, r: 0, c: 0, kind: 'cast', mana: 14, desc: 'Iron pillars burst from the ground in a wall at the target: damage and stun as they rise, then they stand as cover. Beams bounce off them.' },
  golem: { name: 'Iron Golem', tab: 0, r: 0, c: 1, kind: 'cast', mana: 20, desc: 'A knight of iron that never dies: at zero life it falls dormant and rises again. Recast to move it. Hold right-click on it to pour wisps in: they heal it and charge it. Fully charged, it rampages wreathed in white fire that burns everything near it, then bursts and reanimates. Press G for its orders.' },
  fissure: { name: 'Iron Fissure', tab: 0, r: 1, c: 0, pre: 'pillars', kind: 'cast', mana: 18, desc: 'A line of iron spikes tears out of the ground toward the target, one after another. The last spikes stay standing as pillars.' },
  sword: { name: 'Knight Sword', tab: 0, r: 1, c: 1, pre: 'golem', kind: 'weapon', desc: 'The golem wields a sword: fast, precise strikes that sometimes land twice.' },
  toss: { name: 'Shield Toss', tab: 0, r: 1, c: 2, pre: 'golem', kind: 'passive', desc: 'The golem hurls its tower shield at distant foes. It spins at the end of its flight, then flies back. Beams bounce off it the whole way.' },
  magnet: { name: 'Lodestone', tab: 0, r: 2, c: 0, pre: 'pillars', kind: 'passive', desc: 'Pillars drag nearby enemies toward them.' },
  axe: { name: 'Headsman Axe', tab: 0, r: 2, c: 1, pre: 'golem', kind: 'weapon', desc: 'The golem wields a great axe: slower swings that cleave every enemy in a wide arc.' },
  bulwark: { name: 'Bulwark', tab: 0, r: 2, c: 2, pre: 'toss', kind: 'passive', desc: 'The thrown shield ricochets between more enemies, and the golem\'s shield charge knocks foes back harder.' },
  cage: { name: 'Iron Maiden', tab: 0, r: 3, c: 0, pre: 'pillars', kind: 'cast', mana: 24, desc: 'A ring of pillars bursts up around the target, caging whatever stands inside.' },
  flail: { name: 'Morning Star', tab: 0, r: 3, c: 1, pre: 'golem', kind: 'weapon', desc: 'The golem wields a flail: slow, long-reaching smashes that crush an area and stun.' },
  thorns: { name: 'Iron Thorns', tab: 0, r: 3, c: 2, pre: 'golem', kind: 'passive', desc: 'Enemies that strike the golem in melee take part of the damage back.' },
  resonance: { name: 'Resonance', tab: 0, r: 4, c: 0, pre: 'pillars', kind: 'passive', desc: 'Every metal bounce strengthens beams more, and beams can bounce more times.' },
  overcharge: { name: 'Overcharge', tab: 0, r: 4, c: 1, pre: 'golem', kind: 'passive', desc: 'Each wisp poured into the golem charges it more; its white aura burns hotter and its final burst hits harder.' },
  overflow: { name: 'Anima Overflow', tab: 0, r: 4, c: 2, pre: 'thorns', kind: 'passive', desc: 'Damage the golem takes also charges it, and its burst releases a ring of seeking souls.' },
  ironm: { name: 'Iron Mastery', tab: 0, r: 5, c: 1, kind: 'passive', desc: 'Your golem gains life, damage and armor. Pillars and spikes hit harder.' },
  jugg: { name: 'Juggernaut', tab: 0, r: 5, c: 2, pre: 'overcharge', kind: 'passive', desc: 'The golem\'s rampage lasts longer, hits harder and its burning aura spreads wider.' },

  // ---------------- ANIMA: wisps and summons
  wisps: { name: 'Wisps', tab: 1, r: 0, c: 1, kind: 'passive', desc: 'Your choir of wisps drifts around you. More points: more wisps, faster regrowth, stronger revenants. Press V (or CHOIR) to set how many of each type you keep.' },
  restless: { name: 'Restless Dead', tab: 1, r: 1, c: 0, pre: 'wisps', kind: 'passive', desc: 'Revenant wisps fly faster and pass through more enemies before they perish.' },
  condense: { name: 'Condense', tab: 1, r: 1, c: 1, pre: 'wisps', kind: 'hold', mana: 2, desc: 'Hold: stand still and crush wisps into one great wisp that grows with each one (2 mana per wisp). Release it to hunt. The wisps stay spent until it fades.' },
  beam: { name: 'Beam Wisps', tab: 1, r: 1, c: 2, pre: 'wisps', kind: 'passive', desc: 'Unlocks beam wisps: a sustained golden beam that fades out. Levels add damage, pierce and a little range. Beams bounce off metal.' },
  burst: { name: 'Grave Burst', tab: 1, r: 2, c: 0, pre: 'restless', kind: 'passive', desc: 'Revenant wisps explode when they perish, damaging everything nearby.' },
  echo: { name: 'Echo', tab: 1, r: 2, c: 1, pre: 'wisps', kind: 'cast', mana: 12, desc: 'Cast on a fresh corpse: its spirit rises as a ghostly echo that fights for you. Each echo holds 3 wisps for as long as it lives.' },
  prism: { name: 'Prism Wisps', tab: 1, r: 2, c: 2, pre: 'beam', kind: 'passive', desc: 'Unlocks prism wisps: their beam strikes one foe and refracts into rays that jump to others nearby.' },
  leech: { name: 'Soul Leech', tab: 1, r: 3, c: 0, pre: 'burst', kind: 'passive', desc: 'Every revenant pass steals life and mana for you.' },
  tether: { name: 'Soul Tether', tab: 1, r: 3, c: 1, pre: 'echo', kind: 'cast', mana: 15, desc: 'Bind your echoes and golem to you with chains of anima. Anything caught along a chain takes magic damage.' },
  sweep: { name: 'Sweeping Beam', tab: 1, r: 3, c: 2, pre: 'beam', kind: 'passive', desc: 'Beam wisps sweep their beam back and forth across an arc as it burns.' },
  radiance: { name: 'Radiant Core', tab: 1, r: 4, c: 0, pre: 'condense', kind: 'passive', desc: 'The great wisp pulses light that burns every enemy around it.' },
  ascend: { name: 'Echo Ascension', tab: 1, r: 4, c: 1, pre: 'echo', kind: 'passive', desc: 'Echoes grow stronger, mend over time and burst when they fall. At level 10 each echo holds one wisp fewer.' },
  nova: { name: 'Supernova', tab: 1, r: 4, c: 2, pre: 'condense', kind: 'passive', desc: 'When the great wisp fades, it detonates. Bigger wisps, bigger blast.' },
  choir: { name: 'Choir Mastery', tab: 1, r: 5, c: 0, kind: 'passive', desc: 'All wisp damage is increased and wisps regrow faster.' },
  animam: { name: 'Anima Mastery', tab: 1, r: 5, c: 1, kind: 'passive', desc: 'Echoes and the great wisp deal more damage, and echoes gain life.' },
  harvest: { name: 'Soul Harvest', tab: 1, r: 5, c: 2, pre: 'wisps', kind: 'passive', desc: 'Kills have a chance to free a wisp at once.' },

  // ---------------- LOGOS: the word made force (spells)
  swarm: { name: 'Soul Swarm', tab: 2, r: 0, c: 0, kind: 'cast', mana: 8, desc: 'Spend up to 3 wisps to loose a swarm of seeking souls. The more wisps you still hold, the more souls fly.' },
  ward: { name: 'Mana Ward', tab: 2, r: 0, c: 1, kind: 'passive', desc: 'Mana absorbs part of the damage you take before your life does. Levels absorb more, with less mana per hit.' },
  lance: { name: 'Spirit Lance', tab: 2, r: 0, c: 2, kind: 'hold', mana: 5, desc: 'Hold: channel a white beam at the cursor. It pierces, and it reflects off your golem, its shield and your pillars at the angle it strikes them.' },
  hunger: { name: 'Ravenous Souls', tab: 2, r: 1, c: 0, pre: 'swarm', kind: 'passive', desc: 'Souls hit harder and tear through several enemies before they fade.' },
  wraith: { name: 'Wraith Form', tab: 2, r: 1, c: 1, kind: 'cast', mana: 8, desc: 'Toggle: fast, phasing through enemies, immune to physical harm. Drains mana. Any attack ends it.' },
  focus: { name: 'Focused Lance', tab: 2, r: 1, c: 2, pre: 'lance', kind: 'passive', desc: 'The longer you hold Spirit Lance, the harder it burns.' },
  legion: { name: 'Soul Legion', tab: 2, r: 2, c: 0, pre: 'hunger', kind: 'passive', desc: 'Every wisp spent on Soul Swarm looses more souls.' },
  rebuke: { name: 'Rebuke', tab: 2, r: 2, c: 1, pre: 'ward', kind: 'passive', desc: 'When Mana Ward soaks enough damage, it lashes out in a pulse that burns and throws back attackers.' },
  prismL: { name: 'Prismatic Lance', tab: 2, r: 2, c: 2, pre: 'lance', kind: 'passive', desc: 'Every time Spirit Lance reflects off metal, it splits into rays that strike nearby enemies.' },
  storm: { name: 'Soul Storm', tab: 2, r: 3, c: 0, pre: 'legion', kind: 'cast', mana: 25, desc: 'Spend 2 wisps to open a vortex at the target that spits seeking souls for a few seconds.' },
  orb: { name: 'Nether Orb', tab: 2, r: 3, c: 1, kind: 'cast', mana: 18, desc: 'Hurl a slow white orb that sprays nether shards in a spiral as it flies, then bursts into a ring of shards. Magic damage.' },
  siphon: { name: 'Siphon', tab: 2, r: 3, c: 2, pre: 'focus', kind: 'passive', desc: 'Spirit Lance returns part of its damage as life and mana.' },
  phantom: { name: 'Phantom Step', tab: 2, r: 4, c: 0, pre: 'wraith', kind: 'passive', desc: 'In Wraith Form you leave afterimages that burst a moment later.' },
  shards: { name: 'Nether Shards', tab: 2, r: 4, c: 1, pre: 'orb', kind: 'passive', desc: 'Nether Orb sprays more shards, and each shard pierces.' },
  cascade: { name: 'Orb Cascade', tab: 2, r: 4, c: 2, pre: 'orb', kind: 'passive', desc: 'When Nether Orb bursts, it splits into smaller orbs that fly on.' },
  nmastery: { name: 'Nether Mastery', tab: 2, r: 5, c: 1, kind: 'passive', desc: 'All Logos spells deal more damage, and mana flows back faster.' }
};
for (const k in SK) SK[k].req = SK[k].req || ROWREQ[SK[k].r];
const SK_ORDER = Object.keys(SK);
const TAB_NAMES = ['Iron', 'Anima', 'Logos'];
const RIGHT_SKILLS = SK_ORDER.filter(k => SK[k].kind === 'cast' || SK[k].kind === 'hold');
const LEFT_SKILLS = ['attack'].concat(SK_ORDER.filter(k => SK[k].kind === 'cast' && k !== 'wraith' && k !== 'tether'));
const WEAPONS = ['sword', 'axe', 'flail'];
const BINDABLE = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'o', 'f', 'z', 'x', 'b', 'n'];
function defaultKeys() { return { q: 'swarm', w: 'condense', e: 'wraith', r: 'golem', t: 'pillars', y: 'lance', u: 'orb' }; }
function defaultSkills() { const s = {}; for (const k of SK_ORDER) s[k] = 0; s.wisps = 1; s.ward = 1; return s; }
function defaultGbeh() { return { x: 2, y: 2, charge: true, toss: true, focus: false, hold: false }; }
const BASE_ATTRS = { vit: 15, ene: 20, spi: 20, dex: 15 };

// =================================================================== state
const G = {
  running: false, paused: false, time: 0, zone: null, zones: {}, seed: 1,
  msg: '', msgT: 0, banner: '', bannerT: 0, bannerMax: 1, bannerCol: '#d9a441', shake: 0,
  panels: { inv: false, char: false, skills: false, vendor: false, lantern: false, choir: false, gbeh: false }, map: false,
  cursorItem: null, hover: null, error: '', bossFight: false, seal: [], saveT: 0, exploreT: 0,
  golem: null, anvils: [], pillars: [], flyShield: null, great: null, echoes: [], tether: null, orbs: [], shards: [], storms: [], phantoms: [], eshots: [],
  pick: null, tab: 1, hoverSkill: null, saveKey: 'spiritmancer.save.v2'
};
const P = {
  x: 15.5, y: 18.5, r: 0.28, face: 1, level: 1, xp: 0,
  attrs: { ...BASE_ATTRS }, statPts: 0, skillPts: 1,
  skills: defaultSkills(), left: 'attack', right: 'swarm', keys: defaultKeys(), gweapon: 'sword', gbeh: defaultGbeh(), alloc: { beam: 0, prism: 0 }, gold: 0,
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
  return s;
}
function derive() {
  const s = itemStatSum(), b = P.buffs, K = P.skills;
  const d = { vit: P.attrs.vit + (s.vit || 0), ene: P.attrs.ene + (s.ene || 0), spi: P.attrs.spi + (s.spi || 0), dex: P.attrs.dex + (s.dex || 0) };
  d.maxHp = Math.round(28 + d.vit * 3 + P.level * 3 + (s.life || 0));
  d.maxMana = Math.round(8 + d.ene * 2 + P.level * 1.5 + (s.mana || 0));
  d.maxStam = Math.round(50 + d.dex + d.vit);
  d.armor = Math.round(d.dex / 2 + (s.armorBase || 0) + (s.armor || 0) + (b.stone > 0 ? 100 : 0));
  d.itemWisps = Math.min(3, s.wisp || 0);
  d.wispCap = 4 + Math.floor(K.wisps / 2) + d.itemWisps + (b.wisp > 0 ? 2 : 0);
  d.wispRegen = Math.max(0.4, 2.6 - 0.1 * K.wisps) / (1 + ((s.regen || 0) + 4 * K.choir + (b.wisp > 0 ? 100 : 0)) / 100);
  d.dmgMult = (1 + d.spi * 0.02 + (s.dmg || 0) / 100) * (b.echo > 0 ? 1.5 : 1);
  d.castSpd = 1 + (s.fcr || 0) / 100;
  d.moveSpd = 3.9 * (1 + (s.frw || 0) / 100);
  d.res = Math.min(75, s.res || 0); d.mf = s.mf || 0; d.lok = s.lok || 0;
  d.wmin = s.wmin || 1; d.wmax = s.wmax || 2;
  d.meleeMult = 1 + d.dex * 0.01;
  d.manaRegen = (1.2 + d.ene * 0.04) * (1 + 0.05 * K.nmastery);
  d.wardPct = K.ward > 0 ? Math.min(0.95, 0.68 + 0.015 * K.ward) : 0;
  d.wardEff = 1 + 0.06 * K.ward;
  return d;
}
const xpNext = l => Math.floor(60 * Math.pow(l, 1.9) + 40 * l);
const L1 = id => Math.max(1, P.skills[id]);
const WISP_NERF = 0.65;
const WS = {
  choir: () => (1 + 0.12 * P.skills.choir) * WISP_NERF,
  anima: () => 1 + 0.1 * P.skills.animam,
  nether: () => 1 + 0.1 * P.skills.nmastery,
  iron: () => 1 + 0.08 * P.skills.ironm,
  revDmg: () => (3 + 1.5 * (L1('wisps') - 1)) * D.dmgMult * WS.choir(),
  hits: () => 3 + Math.floor(P.skills.restless / 3),
  flySpd: () => 7 * (1 + 0.05 * P.skills.restless),
  burstDmg: () => (5 + 3 * (L1('burst') - 1)) * D.dmgMult * WS.choir(),
  burstR: () => 1.2 + 0.05 * P.skills.burst,
  leech: () => P.skills.leech > 0 ? 0.06 + 0.015 * P.skills.leech : 0,
  beamDps: () => (8 + 4 * (L1('beam') - 1)) * D.dmgMult * WS.choir(),
  range: kind => 4.5 + 0.15 * L1(kind),
  pierce: kind => kind === 'prism' ? 1 : 1 + Math.floor(P.skills.beam / 4),
  sweepAmp: () => P.skills.sweep > 0 ? 0.35 + 0.025 * P.skills.sweep : 0,
  prismDps: () => (7 + 3.5 * (L1('prism') - 1)) * D.dmgMult * WS.choir(),
  prismN: () => 2 + Math.floor(P.skills.prism / 4),
  prismPct: () => 0.45 + 0.025 * P.skills.prism,
  bounceMult: () => 1.25 + (P.skills.resonance > 0 ? 0.1 + 0.03 * P.skills.resonance : 0),
  maxBounce: () => 3 + (P.skills.resonance > 0 ? 1 : 0) + Math.floor(P.skills.resonance / 8),
  // logos
  soulDmg: () => (7 + 3.5 * (L1('swarm') - 1)) * D.dmgMult * WS.nether() * (1 + 0.05 * P.skills.hunger),
  soulHits: () => P.skills.hunger > 0 ? 2 + Math.floor(P.skills.hunger / 5) : 1,
  soulsPerWisp: () => 3 + Math.floor(P.skills.legion / 3),
  stormLife: () => 3 + 0.2 * P.skills.storm,
  stormRate: () => Math.max(0.08, 0.2 - 0.005 * P.skills.storm),
  lanceDps: () => (14 + 6 * (L1('lance') - 1)) * D.dmgMult * WS.nether(),
  lanceRange: () => 6 + 0.2 * L1('lance'),
  lancePierce: () => 2 + Math.floor(P.skills.lance / 5),
  lanceMana: () => Math.max(2.5, 5 - 0.1 * P.skills.lance),
  focusMax: () => P.skills.focus > 0 ? 0.4 + 0.08 * P.skills.focus : 0,
  prismLN: () => 1 + Math.floor(P.skills.prismL / 5),
  prismLPct: () => 0.4 + 0.03 * P.skills.prismL,
  siphon: () => P.skills.siphon > 0 ? 0.02 + 0.005 * P.skills.siphon : 0,
  orbDmg: () => (5 + 2.5 * (L1('orb') - 1)) * D.dmgMult * WS.nether(),
  orbRate: () => Math.max(0.035, 0.07 - 0.0015 * P.skills.shards),
  shardPierce: () => P.skills.shards > 0 ? 2 + Math.floor(P.skills.shards / 6) : 1,
  cascadeN: () => P.skills.cascade > 0 ? 2 + Math.floor(P.skills.cascade / 8) : 0,
  cascadePct: () => 0.45 + 0.025 * P.skills.cascade,
  phantomDmg: () => (8 + 4 * (L1('phantom') - 1)) * D.dmgMult * WS.nether(),
  rebukeDmg: () => (10 + 5 * (L1('rebuke') - 1)) * D.dmgMult * WS.nether(),
  rebukeNeed: () => Math.max(10, 30 - 0.8 * P.skills.rebuke),
  wraithDrain: () => Math.max(2, 7 - 0.25 * P.skills.wraith),
  wraithSpd: () => 1.5 + 0.02 * P.skills.wraith,
  // anima summons
  condRate: () => Math.max(0.14, 0.32 - 0.009 * P.skills.condense),
  condMax: () => 6 + P.skills.condense,
  condDmg: () => (5 + 2.5 * (L1('condense') - 1)) * D.dmgMult * WS.anima(),
  condLife: () => 5 + 0.3 * P.skills.condense,
  radDmg: () => (4 + 2 * (L1('radiance') - 1)) * D.dmgMult * WS.anima(),
  novaDmg: () => (15 + 8 * (L1('nova') - 1)) * D.dmgMult * WS.anima(),
  echoMax: () => Math.min(6, 1 + Math.floor(P.skills.echo / 3)),
  echoCost: () => P.skills.ascend >= 10 ? 2 : 3,
  echoHp: () => (0.7 + 0.12 * L1('echo')) * (1 + 0.08 * P.skills.animam + 0.06 * P.skills.ascend),
  echoDmg: () => (0.6 + 0.1 * L1('echo')) * WS.anima() * (1 + 0.06 * P.skills.ascend),
  tetherDps: () => (6 + 3 * (L1('tether') - 1)) * D.dmgMult * WS.anima(),
  tetherLife: () => 6 + 0.5 * P.skills.tether,
  harvest: () => P.skills.harvest > 0 ? 0.04 + 0.02 * P.skills.harvest : 0,
  // iron
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
  chargeMax: () => 8,
  perWisp: () => 1 + (P.skills.overcharge > 0 ? 0.3 + 0.04 * P.skills.overcharge : 0),
  flowRate: () => P.skills.overflow > 0 ? 3 + 0.3 * P.skills.overflow : 0,
  rampLife: () => 6 + 0.4 * P.skills.jugg,
  rampMult: () => 1.4 + 0.05 * P.skills.jugg,
  detDmg: () => (25 + 6 * L1('golem') + 12 * P.skills.overcharge) * WS.iron(),
  detR: () => 2.4 + 0.05 * P.skills.overcharge,
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
  pillarLife: () => 10 + 0.5 * P.skills.pillars,
  cageN: () => 7 + Math.floor(P.skills.cage / 5),
  cageDmg: () => (10 + 5 * (L1('cage') - 1)) * D.dmgMult * WS.iron(),
  cageLife: () => 6 + 0.3 * P.skills.cage,
  magnetR: () => 2.5 + 0.1 * P.skills.magnet,
  magnetPull: () => 0.7 + 0.04 * P.skills.magnet
};
function skillInfo(id, l) {
  const old = P.skills[id]; P.skills[id] = Math.max(1, l);
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
      case 'overcharge': s = `${WS.perWisp().toFixed(2)} charge per wisp · aura ${r(WS.auraDps())}/s · burst ${r(WS.detDmg())}`; break;
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
      case 'leech': s = `Steals ${pc(WS.leech())} of pass damage as life and mana`; break;
      case 'tether': s = `${r(WS.tetherDps())} dmg/s along each chain · lasts ${WS.tetherLife().toFixed(1)}s`; break;
      case 'sweep': s = `Sweeps ${r(WS.sweepAmp() * 57)}° each way`; break;
      case 'radiance': s = `Pulses ${r(WS.radDmg())} (+15% per wisp) every 0.8s`; break;
      case 'ascend': s = `Echoes +${6 * P.skills.ascend}% life and damage · mend 2%/s · burst when they fall`; break;
      case 'nova': s = `Detonates for ${r(WS.novaDmg())} (+25% per wisp)`; break;
      case 'choir': s = `+${12 * P.skills.choir}% wisp damage · +${4 * P.skills.choir}% regrowth`; break;
      case 'animam': s = `+${10 * P.skills.animam}% echo and great wisp damage · echoes +${8 * P.skills.animam}% life`; break;
      case 'harvest': s = `${pc(WS.harvest())} chance per kill to free a wisp`; break;
      case 'swarm': s = `${r(WS.soulDmg())} per soul · ${WS.soulsPerWisp() - 1} souls per wisp spent`; break;
      case 'ward': s = `Mana absorbs ${r(Math.min(0.95, 0.68 + 0.015 * P.skills.ward) * 100)}% of damage · 1 mana stops ${(1 + 0.06 * P.skills.ward).toFixed(2)}`; break;
      case 'lance': s = `${r(WS.lanceDps())} dmg/s · range ${WS.lanceRange().toFixed(1)} · pierce ${WS.lancePierce()} · ${WS.lanceMana().toFixed(1)} mana/s`; break;
      case 'hunger': s = `Souls hit ${WS.soulHits()} foes · +${5 * P.skills.hunger}% damage`; break;
      case 'wraith': s = `Drain ${WS.wraithDrain().toFixed(1)} mana/s · speed x${WS.wraithSpd().toFixed(2)}`; break;
      case 'focus': s = `Up to +${r(WS.focusMax() * 100)}% after 2s of channeling`; break;
      case 'legion': s = `${WS.soulsPerWisp() - 1} souls per wisp spent`; break;
      case 'rebuke': s = `Every ${r(WS.rebukeNeed())} damage soaked: ${r(WS.rebukeDmg())} pulse`; break;
      case 'prismL': s = `Splits into ${WS.prismLN()} rays at ${pc(WS.prismLPct())} on each reflection`; break;
      case 'storm': s = `Lasts ${WS.stormLife().toFixed(1)}s · a soul every ${WS.stormRate().toFixed(2)}s`; break;
      case 'orb': s = `${r(WS.orbDmg())} per shard · range 8`; break;
      case 'siphon': s = `Returns ${pc(WS.siphon())} as life and mana`; break;
      case 'phantom': s = `Afterimages burst for ${r(WS.phantomDmg())}`; break;
      case 'shards': s = `A shard every ${WS.orbRate().toFixed(3)}s · pierce ${WS.shardPierce()}`; break;
      case 'cascade': s = `Splits into ${WS.cascadeN()} orbs at ${pc(WS.cascadePct())} strength`; break;
      case 'nmastery': s = `+${10 * P.skills.nmastery}% Logos damage · +${5 * P.skills.nmastery}% mana regen`; break;
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
  G.golem = null; G.flyShield = null; G.great = null; G.anvils = []; G.pillars = []; G.echoes = []; G.tether = null; G.storms = [];
  if (P.wraith) P.wraith = false;
  D = derive(); say('Skills reset', 1.4);
}
function respecStats() {
  let spent = 0; for (const k in BASE_ATTRS) spent += P.attrs[k] - BASE_ATTRS[k];
  P.statPts += Math.max(0, spent); P.attrs = { ...BASE_ATTRS }; D = derive();
  P.hp = Math.min(P.hp, D.maxHp); P.mana = Math.min(P.mana, D.maxMana); say('Attributes reset', 1.4);
}

