const SK = {
  // ---------------- IRON: the golem, metal and the ground
  pillars: { name: 'Iron Pillars', tab: 0, r: 0, c: 0, kind: 'cast', mana: 14, desc: 'Iron pillars burst from the ground in a wall at the target: damage and stun as they rise, then they stand as cover. Beams bounce off them.',
    perks: [{ l: 6, v: 'magnet', name: 'Lodestone', desc: 'Pillars drag nearby enemies toward them.' }, { l: 12, v: 'resonance', name: 'Resonance', desc: 'Beams bounce off metal harder, and more times.', stat: ['spi', 50] }] },
  golem: { name: 'Iron Golem', tab: 0, r: 0, c: 1, kind: 'cast', mana: 20, desc: 'A hulking iron knight that never dies: at zero life it falls dormant and rises again. Once summoned, casting it again orders it to that spot. Hold right-click on it to pour wisps in: each one heals it and adds a charge that stays. Full charge sends it berserk. G opens its orders and weapon loadout.',
    perks: [{ l: 5, v: 'bulwark', name: 'Bulwark', desc: 'Its shield charge knocks enemies back harder.' }, { l: 10, v: 'jugg', name: 'Juggernaut', desc: 'Berserk lasts longer (up to 30s), hits harder and its white fire spreads wider.' }, { l: 15, v: 'ironm', name: 'Living Iron', desc: 'More life, damage and armor.', stat: ['vit', 60] }] },
  fissure: { name: 'Iron Fissure', tab: 0, r: 1, c: 0, pre: 'pillars', kind: 'cast', mana: 18, desc: 'A line of iron spikes tears out of the ground toward the target. The last spikes stay standing as pillars.' },
  toss: { name: 'Shield Toss', tab: 0, r: 1, c: 2, pre: 'golem', kind: 'passive', desc: 'The golem hurls its tower shield at distant foes. It spins at the end of its flight, then flies back. Beams bounce off it the whole way.',
    perks: [{ l: 5, v: 'rico', name: 'Ricochet', desc: 'The shield bounces between more enemies.' }] },
  challenge: { name: 'Iron Challenge', tab: 0, r: 2, c: 1, pre: 'golem', kind: 'passive', desc: 'Every few seconds the golem bellows a challenge: nearby enemies must fight it instead of you.' },
  cage: { name: 'Iron Maiden', tab: 0, r: 2, c: 0, pre: 'pillars', kind: 'cast', mana: 24, desc: 'A ring of pillars bursts up around the target, caging whatever stands inside.' },
  thorns: { name: 'Iron Thorns', tab: 0, r: 2, c: 2, pre: 'golem', kind: 'passive', desc: 'Enemies that strike the golem in melee take part of the damage back.',
    perks: [{ l: 8, v: 'overflow', name: 'Anima Overflow', desc: 'Damage the golem takes also charges it, and its final burst looses a ring of seeking souls.' }] },
  overcharge: { name: 'Overcharge', tab: 0, r: 3, c: 1, pre: 'golem', kind: 'passive', desc: 'Each wisp poured into the golem adds more charge; its berserk white fire burns hotter and its final burst hits harder.' },
  forge: { name: 'Forge Heart', tab: 0, r: 5, c: 1, kind: 'passive', desc: 'Pillars, spikes and the golem all hit harder. Your metal lasts longer.' },

  // ---------------- ANIMA: wisps and what you bind
  wisps: { name: 'Wisps', tab: 1, r: 0, c: 1, kind: 'passive', desc: 'Your choir of wisps drifts around you. More points: more wisps, faster regrowth, stronger revenants. V opens the choir: wisp types and how they behave.' },
  restless: { name: 'Restless Dead', tab: 1, r: 1, c: 0, pre: 'wisps', kind: 'passive', desc: 'Revenant wisps fly faster and pass through more enemies before they perish.',
    perks: [{ l: 5, v: 'burst', name: 'Grave Burst', desc: 'Revenants explode when they perish.' }, { l: 10, v: 'leech', name: 'Soul Leech', desc: 'Revenant passes steal life and mana.', stat: ['spi', 45] }] },
  beam: { name: 'Beam Wisps', tab: 1, r: 1, c: 2, pre: 'wisps', kind: 'passive', desc: 'Unlocks beam wisps: a sustained golden beam that fades out. Levels add damage, pierce and range. Beams bounce off metal.',
    perks: [{ l: 5, v: 'sweep', name: 'Sweeping Beam', desc: 'Beams sweep back and forth across an arc.' }] },
  condense: { name: 'Condense', tab: 1, r: 2, c: 1, pre: 'wisps', kind: 'hold', mana: 2, desc: 'Hold: stand still and crush wisps into one great wisp that grows with each one. Release it to hunt. Those wisps stay spent until it fades.',
    perks: [{ l: 5, v: 'radiance', name: 'Radiant Core', desc: 'The great wisp pulses light that burns everything around it.' }, { l: 10, v: 'nova', name: 'Supernova', desc: 'When it fades, it detonates.', stat: ['spi', 55] }] },
  prism: { name: 'Prism Wisps', tab: 1, r: 2, c: 2, pre: 'beam', kind: 'passive', desc: 'Unlocks prism wisps: their beam strikes one foe and refracts into rays that jump to others nearby.' },
  leash: { name: 'Soul Leash', tab: 1, r: 3, c: 0, kind: 'cast', mana: 10, desc: 'Throw a swaying chain of anima from you to what you cast it on. Anything it sweeps through burns. On a monster: it is leashed to you and drained. On your golem: it is fed and quickened. On the ground: an anchor your chain whips around as you move.',
    perks: [{ l: 5, v: 'barbs', name: 'Barbed Chain', desc: 'The chain slows what it touches and bites harder.' }, { l: 10, v: 'twin', name: 'Twin Leash', desc: 'Hold two leashes at once.' }, { l: 15, v: 'snare', name: 'Soul Snare', desc: 'Ground anchors burst when they fade; leashed monsters that die free a wisp.', stat: ['spi', 70] }] },
  totem: { name: 'Wisp Lantern', tab: 1, r: 3, c: 2, pre: 'beam', kind: 'cast', mana: 15, desc: 'Plant a lantern that houses a few of your wisps: they burn nearby enemies with beams until it gutters out. Its beams bounce off metal.',
    perks: [{ l: 8, v: 'beacon', name: 'Beacon', desc: 'You and your golem mend while standing in its light.' }] },
  choir: { name: 'Choir Mastery', tab: 1, r: 4, c: 0, kind: 'passive', desc: 'All wisp damage is increased and wisps regrow faster.',
    perks: [{ l: 5, v: 'harvest', name: 'Soul Harvest', desc: 'Kills can free a wisp at once.' }] },
  animam: { name: 'Anima Mastery', tab: 1, r: 5, c: 1, kind: 'passive', desc: 'The great wisp, Soul Leash and the Wisp Lantern all grow stronger.' },

  // ---------------- LOGOS: the word made force
  swarm: { name: 'Soul Swarm', tab: 2, r: 0, c: 0, kind: 'cast', mana: 8, desc: 'Spend up to 3 wisps to loose a swarm of seeking souls. The more wisps you still hold, the more souls fly.',
    perks: [{ l: 5, v: 'hunger', name: 'Ravenous Souls', desc: 'Souls tear through several enemies.' }, { l: 10, v: 'legion', name: 'Soul Legion', desc: 'Each wisp spent looses more souls.', stat: ['ene', 50] }] },
  ward: { name: 'Mana Ward', tab: 2, r: 0, c: 1, kind: 'passive', desc: 'Mana absorbs part of the damage you take before your life does.',
    perks: [{ l: 6, v: 'rebuke', name: 'Rebuke', desc: 'When the ward soaks enough, a whip of white light lashes out at your attackers.', stat: ['ene', 50] }] },
  lance: { name: 'Spirit Lance', tab: 2, r: 0, c: 2, kind: 'hold', mana: 4, desc: 'Hold: channel a searing white lance at the cursor. It pierces, shoves enemies back and reflects off your golem, its shield and your pillars, growing stronger with every reflection.',
    perks: [{ l: 5, v: 'focus', name: 'Focused Lance', desc: 'The longer you hold it, the harder it burns.' }, { l: 10, v: 'prismL', name: 'Prismatic Lance', desc: 'Every reflection splits off rays at nearby enemies.' }, { l: 15, v: 'siphon', name: 'Siphon', desc: 'Returns part of its damage as life and mana.', stat: ['spi', 60] }] },
  wraith: { name: 'Wraith Form', tab: 2, r: 1, c: 1, kind: 'cast', mana: 8, desc: 'Toggle: fast, phasing through enemies, immune to physical harm. Drains mana. Any attack ends it.',
    perks: [{ l: 5, v: 'phantom', name: 'Phantom Step', desc: 'You leave afterimages that burst a moment later.' }] },
  storm: { name: 'Soul Storm', tab: 2, r: 2, c: 0, pre: 'swarm', kind: 'cast', mana: 25, desc: 'Spend 2 wisps to open a vortex at the target that spits seeking souls for a few seconds.' },
  mark: { name: 'Mark of Logos', tab: 2, r: 2, c: 1, kind: 'cast', mana: 10, desc: 'Brand every enemy in an area: they take more damage from everything you command.',
    perks: [{ l: 8, v: 'markSoul', name: 'Soul Brand', desc: 'Marked enemies that die release a seeking soul.' }] },
  orb: { name: 'Nether Orb', tab: 2, r: 2, c: 2, kind: 'cast', mana: 18, desc: 'Hurl a slow white orb that sprays nether shards in a spiral as it flies, then bursts into a ring of shards.',
    perks: [{ l: 5, v: 'shards', name: 'Nether Shards', desc: 'More shards, and each one pierces.' }, { l: 10, v: 'cascade', name: 'Orb Cascade', desc: 'The burst splits into smaller orbs.', stat: ['ene', 60] }] },
  nmastery: { name: 'Nether Mastery', tab: 2, r: 5, c: 1, kind: 'passive', desc: 'All Logos spells deal more damage, and mana flows back faster.' }
};
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
  P.skills.ironm = Math.max(P.skills.ironm || 0, 0);
}
const STAT_NAME = { spi: 'Spirit', ene: 'Energy', vit: 'Vitality', dex: 'Dexterity' };
const TAB_NAMES = ['Iron', 'Anima', 'Logos'];
const RIGHT_SKILLS = SK_ORDER.filter(k => SK[k].kind === 'cast' || SK[k].kind === 'hold');
const LEFT_SKILLS = ['attack'].concat(SK_ORDER.filter(k => SK[k].kind === 'cast' && k !== 'wraith'));
const WEAPONS = ['sword', 'axe', 'flail'];
const WEAPON_NAMES = { sword: 'Knight Sword', axe: 'Headsman Axe', flail: 'Morning Star' };
const BINDABLE = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'o', 'f', 'z', 'x', 'b', 'n'];
function defaultKeys() { return { q: 'swarm', w: 'condense', e: 'wraith', r: 'golem', t: 'pillars', y: 'lance', u: 'orb', f: 'leash' }; }
function defaultSkills() { const s = {}; for (const k of SK_ORDER) s[k] = 0; s.wisps = 1; s.ward = 1; return s; }
function defaultGbeh() { return { x: 2, y: 2, charge: true, toss: true, focus: false, hold: false }; }
function defaultWbeh() { return { x: 2, y: 2, focus: false, hold: false }; }
