
// =================================================================== HEMOMANCER (build step 3, reworked in v0.13)
// Vigor turned on itself: bleeding, blood pools and leeches; a brood of crawling spawnlings; tumors;
// a Flesh Golem with a belly maw; mutations worn in slots; every skill paid in life, softened by Vitae.
Object.assign(G, { thralls: [], brood: [], sacs: [], pools: [], blances: [], vwhips: [], biles: [], fgolem: null, tents: [], bcmd: null, tumors: [], rveins: [], leeches: [], veins: [], vgrnd: [], tbinds: [], engulfs: [], gvomit: [] });
Object.assign(P, { muts: ['maw', 'chitin'], gmuts: [], grafts: ['fevered'], hbeh: defaultBeh(2, 3), fbeh: defaultBeh(2, 2), devour: 0, devourT: 0, heartCd: 0, tentT: 0, bileT: 0, inPool: false, nearBlood: false, bfrenzyT: 0, tentArms: [], lifeAcc: 0, lifeAccT: 0 });
const GRAFTS = ['fevered', 'leapers', 'clingers', 'volatile', 'legs'];
const GRAFT_NAMES = { fevered: 'Fevered Blood', leapers: 'Leapers', clingers: 'Clingers', volatile: 'Volatile', legs: 'Spider Legs' };
const GRAFT_DESC = {
  fevered: 'Their bites open bleeding wounds.',
  leapers: 'They leap onto enemies from a distance.',
  clingers: 'They latch onto what they bite and ride it, biting without pause.',
  volatile: 'They burst into gore when they die.',
  legs: 'Jointed spider legs split out of their sides: they scuttle 45% faster.'
};
const MUTS = ['maw', 'chitin', 'tentacles', 'gills', 'bilehump', 'heart'];
function isBlood() { return P.cls === 'hemomancer'; }

// ------------------------------------------------------------------- numbers
const HS = {
  power: () => D.dmgMult * (1 + 0.1 * P.skills.hemom) * (1 + 0.08 * P.devour) * (P.weakK > 0 ? P.weakK : 1),
  mutK: () => 1 + 0.06 * P.skills.fmastery,
  broodMax: () => 4 + Math.floor(L1('hatch') / 2) + (P.skills.broodm > 0 ? 2 : 0) + (P.skills.broodmore > 0 ? 1 : 0),
  lingHp: () => (10 + 4 * (L1('hatch') - 1)) * (1 + 0.08 * P.skills.broodm),
  lingDmg: () => { const L = L1('hatch'), k = (1 + 0.1 * P.skills.broodm) * (1 + 0.08 * P.devour); return [(1.5 + 0.7 * (L - 1)) * k, (3 + 1.1 * (L - 1)) * k]; },
  graftK: () => 1 + 0.06 * P.skills.graft,
  graftSlots: () => P.skills.graft2 > 0 ? 2 : P.skills.graft > 0 ? 1 : 0,
  sacN: () => 2 + Math.floor(L1('eggsac') / 5),
  tumorN: () => Math.min(5, 1 + Math.floor((L1('eggsac') - 1) / 4)),
  tumorDmg: () => (5 + 2.5 * (L1('eggsac') - 1)) * HS.power() * (P.skills.tumorbig > 0 ? 1.5 : 1),
  tumorLife: () => P.skills.tumorlive > 0 ? 24 : 12,
  hatchR: () => 2.5 + 0.05 * L1('hatch'),
  thrallDmg: () => (16 + 7 * (L1('thrall') - 1)) * HS.power(),
  thrallR: () => P.skills.contag > 0 ? 2.4 : 1.8,
  ruptDmg: () => (6 + 3 * (L1('rupture') - 1)) * HS.power(),
  rushDmg: () => (18 + 8 * (L1('rush') - 1)) * HS.power(),
  lanceDmg: () => (8 + 4 * (L1('blance') - 1)) * HS.power(),
  vomitDmg: () => (1.9 + 0.9 * (L1('blance') - 1)) * HS.power(),
  bleedOf: dmg => dmg * 0.3 * (P.skills.lacer > 0 ? 2 : 1),
  hemorPct: () => Math.min(0.35, 0.16 + 0.006 * L1('hemor')),
  hemorBoss: () => Math.min(0.1, 0.04 + 0.002 * L1('hemor')),
  hemorMin: () => (8 + 4 * (L1('hemor') - 1)) * HS.power(),
  hemorDps: () => (4 + 2 * (L1('hemor') - 1)) * HS.power(),
  hemorR: () => P.skills.hemsplash > 0 ? 2.2 : 1.2,
  frenzyDur: () => 6 + 0.25 * L1('bfrenzy'),
  frenzyR: () => 6 * (aM('l_wind') ? 2 : 1),
  // v0.34: Root Veins: a burst of veins out of the forearm that root into several enemies at once
  whipDmg: () => (9 + 4.5 * (L1('vwhip') - 1)) * HS.power(),
  whipR: () => HS.rootR(),
  rootN: () => 3 + Math.floor((L1('vwhip') - 1) / 3) + (P.skills.veinhook > 0 ? 1 : 0),
  rootR: () => 3.5 + 0.22 * L1('vwhip'),
  veinT: () => (1.2 + 0.05 * L1('vwhip')) * (P.skills.veinlong > 0 ? 1.5 : 1),
  veinChance: () => P.skills.veinlong > 0 ? 1 : Math.min(0.6, 0.3 + 0.012 * L1('vwhip')),
  burstDmg: () => (15 + 7 * (L1('cburst') - 1)) * HS.power(),
  // v0.34: The Leeches is a passive: they drop from his sleeves whenever he wounds something
  leechN: () => Math.min(8, 2 + Math.floor(L1('spool') / 4) + (P.skills.leechmore > 0 ? 2 : 0)),
  leechDps: () => (3 + 1.5 * (L1('spool') - 1)) * HS.power() * (P.skills.fatleech > 0 ? 1.5 : 1),
  leechHp: () => 10 + 2 * L1('spool'),
  leechChance: () => Math.min(0.9, 0.3 + 0.025 * L1('spool')),
  leechSpd: () => 4.5 + 0.2 * L1('spool'),
  leechFill: () => HS.leechDps() * (3 + 0.1 * L1('spool')),
  golemHp: () => (90 + 30 * (L1('fgolem') - 1)) * (1 + 0.08 * P.skills.broodm) * 3.25,
  golemRegrow: () => Math.max(14, 30 - 0.6 * L1('fgolem')),
  golemDmg: () => (8 + 4 * (L1('fgolem') - 1)) * (1 + 0.1 * P.skills.broodm) * (1 + 0.08 * P.devour) * 1.5,
  // v0.34: brood stock: its gut fills as it eats corpses and empties as it pukes up swarmlings
  hatchBleedVitae: () => 6 + 0.5 * L1('hatch'),
  golemStockMax: () => P.skills.sacs > 0 ? 10 : 6,
  golemPukeCost: () => 3,
  golemPukeN: () => 3 + Math.floor((L1('fgolem') - 1) / 6) + (P.skills.sacs > 0 ? 2 : 0),
  golemMealStock: live => (live ? 2 : 3) + (P.skills.sacs > 0 ? 1 : 0),
  pukeLingHp: () => (8 + 3 * (L1('fgolem') - 1)) * (1 + 0.08 * P.skills.broodm),
  pukeLingLife: () => 12,
  pukeDmg: () => HS.golemDmg() * 0.7,
  golemSlots: () => 1 + (P.skills.fleshlord > 0 ? 1 : 0),
  tentN: () => Math.min(8, 2 + Math.floor((L1('tentacles') - 1) / 3)),
  tentCd: () => Math.max(2.5, 6 - 0.15 * L1('tentacles')) / HS.feed(),
  tentR: () => Math.min(6.5, 4 + 0.08 * L1('tentacles')),
  tentDmg: () => (5 + 2.5 * (L1('tentacles') - 1)) * HS.power() * HS.mutK() * (P.skills.tentrip > 0 ? 1.5 : 1),
  tentBind: () => (1.1 + 0.02 * L1('tentacles')) * (P.skills.tentbind > 0 ? 2 : 1) + (aM('f_coil') ? 1 : 0),
  bileCd: () => Math.max(1.5, 3.5 - 0.08 * L1('bilehump')) / HS.feed(),
  bileDmg: () => (8 + 4 * (L1('bilehump') - 1)) * HS.power() * HS.mutK(),
  chitinArmor: () => (10 + 6 * L1('chitin')) * HS.mutK() * (P.skills.chitinthick > 0 ? 1.5 : 1),
  chitinDr: () => Math.min(0.25, 0.05 + 0.01 * L1('chitin')),
  mawMult: () => 1 + (0.2 + 0.04 * L1('maw')) * HS.mutK(),
  mawLeech: () => (0.04 + 0.004 * L1('maw')) * (P.skills.carnal > 0 ? 2 : 1),
  engulfPct: () => Math.min(0.4, (0.08 + 0.005 * L1('maw')) * (P.skills.gorgemaw > 0 ? 2 : 1)),
  digestDps: () => (6 + 3 * (L1('maw') - 1)) * HS.power() * HS.mutK() * (P.skills.gorgemaw > 0 ? 1.4 : 1),
  heartRegen: () => (0.005 + 0.0005 * L1('heart')) * HS.mutK(),
  heartCd: () => Math.max(20, 60 - 1.5 * L1('heart')) * (P.skills.heartfast > 0 ? 0.5 : 1),
  devourMax: () => P.skills.glutton > 0 ? 8 : 5,
  devourLife: () => P.skills.glutton > 0 ? 22 : 15,
  // mutations work faster while you stand in blood
  feed: () => P.inPool ? (P.skills.mutflow > 0 ? 2.25 : 1.5) : 1,
  // Vitae refills faster near blood
  vitaeRegen: () => D.manaRegen * 1.15 * (P.nearBlood ? 1.8 * (P.skills.hemovit > 0 ? 1.25 : 1) : 1)
};
// the Vitae pool: the fuller it is, the faster your flesh knits (0.3%/s empty, 2.3%/s full) and the less life your skills cost
function vitaeFrac() { return clamp(P.mana / Math.max(1, D.maxMana), 0, 1); }
function vitaeHeal() { return 0.002 + 0.008 * vitaeFrac(); }
// v0.22: the life price is a share of your maximum life, scaled by how much of the Vitae pool the skill drinks
// (so it stays the same weight at level 5 and level 50). Full Vitae pays most of it; an empty pool doubles it.
function bloodLifeCost(need) {
  if (need <= 0) return 0;
  if (aU('h_heart') && vitaeFrac() >= 0.8) return 0;
  const share = need / Math.max(20, D.maxMana), pct = Math.min(0.15, share * 0.35 * (0.4 + 1.3 * (1 - vitaeFrac())));
  return D.maxHp * pct * (P.skills.bloodprice > 0 ? 0.75 : 1);
}
// Paying in life never kills you: at the edge you give what you have (down to 1 life) and the skill comes out
// weaker in proportion (never below 30%). Returns the life actually paid.
function bloodPay(life) {
  if (life <= 0) return 0;
  const can = Math.max(0, P.hp - 1), paid = Math.min(life, can);
  P.weakK = paid >= life ? 0 : Math.max(0.3, paid / life); P.weakT = 0.05;
  P.hp -= paid; P.lifeAcc = (P.lifeAcc || 0) + paid; if (paid > 1) P.hurt = Math.max(P.hurt, 0.04);
  if (P.weakK) floatText(P.x, P.y, 'weakened', '#8a2a36');
  return paid;
}
// every Hemomancer skill costs life: full Vitae pays most of it
function bloodSpend(id, need) {
  if (need <= 0) return true;
  bloodPay(bloodLifeCost(need));
  P.mana = Math.max(0, P.mana - need);
  arcOnSpend(id, need);
  return true;
}
function mutOn(id) { return isBlood() && (P.muts.includes(id) || tempMutOn(id)) && P.skills[id] > 0; }
function gmutOn(id) { return isBlood() && P.gmuts.slice(0, HS.golemSlots()).includes(id) && P.skills[id] > 0; }
function mutSlots() { return 2 + (P.skills.fmastery > 0 ? 1 : 0); }
function graftOn(id) { return P.grafts.slice(0, HS.graftSlots()).includes(id); }
function broodCount() { let n = 0; for (const e of G.brood) if (!e.temp) n++; return n; }
function bloodDerive(d) {
  if (!isBlood()) return;
  d.wispCap = 0; d.wardPct = 0;
  if (mutOn('chitin')) d.armor += Math.round(HS.chitinArmor());
  if (mutOn('maw')) d.meleeMult *= HS.mawMult();
  d.dmgMult *= 1 + 0.08 * P.devour;
  d.manaRegen = 0.5 + d.spi * 0.012;
  if (P.bfrenzyT > 0) { d.moveSpd *= 1.25; d.castSpd *= 1.25; }
  if (P.oozeHasteT > 0) d.castSpd *= 1 + P.oozeHasteK;
}
function bloodInfo(id) {
  const r = Math.round, pc = v => Math.round(v * 100) + '%';
  switch (id) {
    case 'hatch': { const dm = HS.lingDmg(); return `Brood of ${HS.broodMax()} · life ${r(HS.lingHp())} · bites ${r(dm[0])}-${r(dm[1])} · ${1 + (P.skills.swollen > 0 ? 1 : 0)} per corpse, ${HS.sacN()} per tumor · ${HS.hatchR().toFixed(1)} yd · bled: ${r(HS.hatchBleedVitae())} Vitae + ${r(bloodLifeCost(HS.hatchBleedVitae()) * 1.4)} life each (less life the fuller your Vitae)`; }
    case 'eggsac': return `${HS.tumorN()} tumor${HS.tumorN() > 1 ? 's' : ''} · ${r(HS.tumorDmg())} burst · each leaves a 1-life spawnling for ${HS.tumorLife()}s`;
    case 'rush': return `Burst ${r(HS.rushDmg())} (more when grown) in 1.8 yd · ${P.skills.rushtwo > 0 ? 2 : 1} at a time`;
    case 'graft': return `${HS.graftSlots()} graft slot${HS.graftSlots() === 1 ? '' : 's'} · grafts x${HS.graftK().toFixed(2)} strength`;
    case 'fgolem': return `Life ${r(HS.golemHp())} · crushes ${r(HS.golemDmg())} · gut holds ${HS.golemStockMax()} stock · pukes ${HS.golemPukeN()} swarmlings (life ${r(HS.pukeLingHp())}, ${HS.pukeLingLife()}s) and ${r(HS.pukeDmg())} bile for ${HS.golemPukeCost()} · +${HS.golemMealStock()} stock per corpse · ${HS.golemSlots()} mutation slot${HS.golemSlots() > 1 ? 's' : ''}`;
    case 'assim': return `Kills grow a spawnling: up to x${P.skills.assimbig > 0 ? 2.5 : 2} life and bite`;
    case 'broodm': return `Brood +${8 * P.skills.broodm}% life, +${10 * P.skills.broodm}% damage · +2 brood`;
    case 'blance': return `${r(HS.vomitDmg())} per gout, ~18 gouts/s · bleeds ${r(HS.bleedOf(HS.vomitDmg()))}/s · soaks through`;
    case 'hemor': return `Tears ${pc(HS.hemorPct())} of current life (bosses ${pc(HS.hemorBoss())}), at least ${r(HS.hemorMin())} · splash ${HS.hemorR().toFixed(1)} yd`;
    case 'bfrenzy': return `${HS.frenzyDur().toFixed(1)}s · minions in ${HS.frenzyR()} yd: +40% speed, +50% attack speed · you: +25% speed and attack speed, 1.5% life/s`;
    case 'vwhip': return `${HS.rootN()} veins · ${HS.rootR().toFixed(1)} yd · each bites ${r(HS.whipDmg())} and bleeds ${r(HS.bleedOf(HS.whipDmg()))}/s · ${pc(HS.veinChance())} to hold and squeeze for ${HS.veinT().toFixed(1)}s (${r(HS.whipDmg() * 0.3)}/s)`;
    case 'cburst': return `${r(HS.burstDmg())} damage in 2 yd · bleeds`;
    case 'spool': return `${pc(HS.leechChance())} per wound (half per bleed tick) · up to ${HS.leechN()} out at once · drink ${r(HS.leechDps())}/s, crawl home full at ${r(HS.leechFill())} · ${HS.leechSpd().toFixed(1)} yd/s · life ${r(HS.leechHp())} · you get 80% as life and 40% as Vitae`;
    case 'hemom': return `+${10 * P.skills.hemom}% blood magic and bleed damage`;
    case 'maw': return `x${HS.mawMult().toFixed(2)} melee · drinks ${pc(HS.mawLeech())} · ${pc(HS.engulfPct())} to engulf · digests ${r(HS.digestDps())}/s`;
    case 'chitin': return `+${r(HS.chitinArmor())} armor · ${pc(HS.chitinDr())} less damage`;
    case 'tentacles': return `${HS.tentN()} tentacles · ${HS.tentR().toFixed(1)} yd · ${r(HS.tentDmg())} damage · constrict ${HS.tentBind().toFixed(1)}s · regrow ${HS.tentCd().toFixed(1)}s each`;
    case 'gills': return 'Blood heals 3% life/s and refills 2.5 Vitae/s while you stand in it';
    case 'devour': return `+15% life and +12% Vitae (more for fat meals) · +8% damage per stack (${HS.devourMax()} max, ${HS.devourLife()}s)`;
    case 'bilehump': return `A tumor spawn every ${HS.bileCd().toFixed(1)}s · bursts for ${r(HS.bileDmg())}`;
    case 'heart': return `Mend ${(HS.heartRegen() * 100).toFixed(2)}% life/s · below 25%: heal 40% (every ${r(HS.heartCd())}s)`;
    case 'fmastery': return `3 mutation slots · mutations x${HS.mutK().toFixed(2)}`;
  }
  return bloodInfo14(id);
}

// ------------------------------------------------------------------- bleeding and pools
function addBleed(m, dps, t) { if (m.dead) return; if (m.boilT > 0) { dps *= HS.boilK(); t *= 1.5; } if (!m.bleed || m.bleed.dps * m.bleed.t < dps * t) m.bleed = { dps, t, drip: 0 }; else m.bleed.t = Math.max(m.bleed.t, t); aggro(m); }
function addBlight(m, dps, t) { addBleed(m, dps, t); } // blight is gone: anything that asked for it bleeds instead
function splatPool(x, y, r, life) { const p = addPool(x, y, r * 0.8, life * 0.5); if (p) p.own = true; }
function addPool(x, y, r, life) {
  if (G.zone.solidAt(x, y)) return null;
  r *= poolScale();
  for (const p of G.pools) if (Math.hypot(p.x - x, p.y - y) < p.r * 0.6) { p.r = Math.min(p.big ? 2.4 : 1.2, Math.max(p.r, r) + 0.05); p.life = Math.max(p.life, life); p.max = Math.max(p.max, p.life); return p; }
  const p = { x, y, r, life, max: life, seed: Math.random() * 99 }; G.pools.push(p);
  while (G.pools.length > 60) G.pools.shift();
  return p;
}
function inPoolAt(o, real) { for (const p of G.pools) if ((!real || !p.own) && Math.abs(p.x - o.x) < 3 && Math.hypot(p.x - o.x, p.y - o.y) < p.r + 0.15) return p; return null; }
function updateAfflictions(dt) { G.noProc = true; try { updateAfflictions0(dt); } finally { G.noProc = false; } }
function updateAfflictions0(dt) {
  for (const m of G.zone.monsters) {
    if (m.dead) continue;
    if (m.bleed) {
      const b = m.bleed; b.t -= dt; b.tick = (b.tick || 0) - dt; b.drip -= dt;
      if (b.tick <= 0) { b.tick = 0.5; if (aR('h_blight')) b.store = (b.store || 0) + b.dps * 0.5; else { hurtMon(m, b.dps * 0.5, '#c24050'); leechProc(m, 0.5); } }
      if (b.drip <= 0 && !m.dead) { b.drip = 0.3; if (Math.hypot(m.x - (m.trX || -99), m.y - (m.trY || -99)) > 0.45) { m.trX = m.x; m.trY = m.y; const p = addPool(m.x + rand(-0.1, 0.1), m.y + rand(-0.1, 0.1), 0.2, 3); if (p) p.trail = true; } }
      if (b.t <= 0) { m.bleed = null; if (b.store > 0 && !m.dead) { hurtMon(m, b.store * 1.5, '#c24050'); splashDrops(m.x, m.y, 16, 2.4, 8); addPool(m.x, m.y, 0.6, 8); sfx(130, 0.2, 'sawtooth', 0.04, -80); } }
    }
    if (m.dead) continue;
    const pool = inPoolAt(m); if (pool && pool.slow) m.slow = Math.max(m.slow || 0, 0.3);
  }
  for (const p of G.pools) p.life -= dt;
  G.pools = G.pools.filter(p => p.life > 0);
}
// gore: a wet burst of meat and blood that cuts and bleeds what it hits
function bileBurst(x, y, dmg, R) {
  for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - x, m.y - y) < R + m.r) { if (dmg > 0) hurtMon(m, dmg, '#e89aa0'); addBleed(m, Math.max(1.5, dmg * 0.12), 3); }
  G.biles.push({ fx: true, splat: true, x, y, R, t: 0.4 }); burst(x, y, '#b8404a', 14, 2.2); splashDrops(x, y, 10, 2.2, 5);
  sfx(150, 0.2, 'sawtooth', 0.035, -100);
}
const goreBurst = bileBurst;

// ------------------------------------------------------------------- the brood: spawnlings, torn torsos crawling on their hands
function newLing(x, y) { const hp = HS.lingHp(); return { isBrood: true, x, y, r: 0.2, hp, max: hp, size: 1, spd: 4.4, face: 1, cd: 0.3, state: 'idle', t: 0, hurt: 0, path: null, repath: 0, hatch: 0.35, tgt: null, cling: null, leapT: 0, hold: null, wob: Math.random() * 6, frenzyT: 0 }; }
function hatchLing(x, y, force) {
  if (!force && broodCount() >= HS.broodMax()) return null;
  const e = newLing(x, y); if (P.hbeh.hold) e.hold = { x, y };
  G.brood.push(e); burst(x, y, '#b8404a', 8, 1.8); sfx(300 + Math.random() * 200, 0.08, 'sawtooth', 0.02, -150);
  return e;
}
// a tumor spawnling: one life, and it rots away on its own
function tumorLing(x, y) {
  const temps = G.brood.filter(e => e.temp); if (temps.length >= 12) broodDies(temps[0], true);
  const e = hatchLing(x, y, true); if (!e) return null;
  e.temp = true; e.max = e.hp = P.skills.tumorlive > 0 ? Math.max(1, HS.lingHp() * 0.25) : 1; e.life = HS.tumorLife(); e.hatch = 0.15;
  return e;
}
function hurtBrood(e, dmg, type) {
  if (e.rider) return;
  dmg *= (type === 'phys' ? 100 / 110 : 1) * (e.hatch > 0 ? 0.5 : 1) * lingArmor() * (P.skills.broodtough > 0 ? 0.8 : 1);
  if (inPoolAt(e)) dmg *= 0.85;
  dmg *= hiveGuard(e);
  e.hp -= dmg; e.hurt = 0.1; crownSave(e); if (e.hp <= 0) broodDies(e);
}
function broodDies(e, quiet) {
  const i = G.brood.indexOf(e); if (i < 0) return;
  G.brood.splice(i, 1); burst(e.x, e.y, '#8e2630', 10, 1.8); splatPool(e.x, e.y, 0.3, 5); onLingDies(e, quiet);
  if (!quiet && graftOn('volatile')) bileBurst(e.x, e.y, (6 + 3 * (L1('graft') - 1)) * HS.power() * HS.graftK() * e.size, 1.3);
}
function broodOrders(e) { const B = e && e.isFGolem ? P.fbeh : P.hbeh; return { B, aggro: 3 + B.x * 1.6 + (e && e.frenzyT > 0 ? 4 : 0), guard: B.y <= 1 && !(e && e.frenzyT > 0) }; }
function broodAnchor(e) { if (G.bcmd && G.bcmd.pt) return G.bcmd.pt; const B = broodOrders(e).B; if (B.hold && e.hold) return e.hold; return P; }
function broodTarget(e) {
  if (G.bcmd && G.bcmd.ref && !G.bcmd.ref.dead) return G.bcmd.ref;
  const { B, aggro, guard } = broodOrders(e), an = broodAnchor(e);
  if ((B.focus || P.skills.hivefocus > 0) && P.lastHit && !P.lastHit.dead && !P.lastHit.engulfed && dist(P.lastHit, P) < 12) return P.lastHit;
  let best = null, bd = 1e9;
  for (const m of G.zone.monsters) {
    if (m.dead || (m.state === 'idle' && dist(m, P) > 6)) continue;
    const da = dist(m, an); if (da > aggro + 1) continue;
    if (guard && !(m.tgt === P || (m.tgt && (m.tgt.isBrood || m.tgt.isFGolem)))) continue;
    const d = dist(m, e) + (B.y >= 3 ? 0 : da * 0.5); if (d < bd) { bd = d; best = m; }
  }
  return best;
}
function frenzyK(e) { return e.frenzyT > 0 ? 1 : 0; }
function lingBite(e, T) { G.noProc = true; G.hitSrc = e; try { lingBite0(e, T); } finally { G.noProc = false; G.hitSrc = null; } }
function lingBite0(e, T) {
  const dm = HS.lingDmg(), dmg = rand(dm[0], dm[1]) * (0.7 + 0.3 * e.size + (e.size - 1) * 0.3) * (e.frenzyT > 0 && P.skills.rage > 0 ? 1.25 : 1) * hiveDmg(e);
  hurtMon(T, dmg, '#e89aa0'); onLingBite(e, T, dmg);
  if (graftOn('fevered')) addBleed(T, dmg * 0.35 * HS.graftK(), 3);
  const cap = P.skills.assimbig > 0 ? 2.5 : 2;
  if (T.dead && P.skills.assim > 0 && e.size < cap && !e.temp) { e.size = Math.min(cap, e.size + (0.25 + 0.01 * P.skills.assim) * (P.skills.assimfast > 0 ? 2 : 1)); e.max = HS.lingHp() * e.size; e.hp = Math.min(e.max, e.hp + e.max * 0.3); floatText(e.x, e.y, 'grows', '#e89aa0'); }
}
function updateBrood(dt) {
  if (G.bcmd) { G.bcmd.t -= dt; if (G.bcmd.t <= 0 || (G.bcmd.ref && G.bcmd.ref.dead)) G.bcmd = null; }
  for (const e of G.brood.slice()) {
    e.hurt = Math.max(0, e.hurt - dt); e.t += dt; e.cd -= dt; e.leapT -= dt; e.wob += dt * 12 * (e.frenzyT > 0 ? 1.4 : 1);
    if (e.frenzyT > 0) { e.frenzyT -= dt; if (P.skills.bloodlust > 0) e.hp = Math.min(e.max, e.hp + e.max * 0.03 * dt); }
    if (e.fly) { const F = e.fly; F.t += dt; const u = Math.min(1, F.t / F.dur); e.x = F.x0 + (F.x1 - F.x0) * u; e.y = F.y0 + (F.y1 - F.y0) * u; if (u >= 1) { e.fly = null; e.hatch = 0; burst(e.x, e.y, '#8e2630', 5, 1.4); splatPool(e.x, e.y, 0.25, 4); } else continue; }
    if (e.hatch > 0) { e.hatch -= dt; continue; }
    if (e.temp) { e.life -= dt; if (e.life <= 0) { broodDies(e, true); continue; } }
    if (e.rider) continue;
    if (e.rush) { updateRush(e, dt); continue; }
    if (!e.temp) { e.max = HS.lingHp() * e.size; e.hp = Math.min(e.max, e.hp + (inPoolAt(e) ? e.max * 0.05 * (P.skills.graftmend > 0 ? 2 : 1) * dt : 0)); }
    if (dist(e, P) > 18) { e.x = P.x + rand(-1, 1); e.y = P.y + rand(-1, 1); if (G.zone.solidAt(e.x, e.y)) { e.x = P.x; e.y = P.y; } e.path = null; e.cling = null; }
    const fr = (e.frenzyT > 0 ? 1.5 : 1) * hasteK(e), spd = e.spd * (e.frenzyT > 0 ? 1.4 : 1);
    // clinging: ride the victim and chew
    if (e.cling) {
      const m = e.cling;
      if (m.dead || m.engulfed || !graftOn('clingers')) { e.cling = null; }
      else {
        e.x = m.x + Math.cos(e.wob * 0.3) * m.r * 0.6; e.y = m.y + Math.sin(e.wob * 0.3) * m.r * 0.6;
        if (e.cd <= 0) { e.cd = 0.4 / fr / (P.skills.frenzy > 0 && m.bleed ? 1.6 : 1); lingBite(e, m); }
        continue;
      }
    }
    const T = broodTarget(e), an = broodAnchor(e);
    if (T) {
      const d = dist(e, T);
      if (Math.abs((T.x - T.y) - (e.x - e.y)) > 0.05) e.face = (T.x - T.y) > (e.x - e.y) ? 1 : -1;
      if (graftOn('leapers') && d > 1.2 && d < 4.5 && e.leapT <= 0 && lineClear(G.zone, e, T)) {
        e.leapT = 3; e.leap = { x0: e.x, y0: e.y, t: 0 };
        const k = (d - T.r - 0.2) / d; moveCircle(e, (T.x - e.x) * k, (T.y - e.y) * k); e.leap.x1 = e.x; e.leap.y1 = e.y;
        hurtMon(T, HS.lingDmg()[1] * HS.graftK() * e.size, '#e89aa0'); sfx(500, 0.06, 'triangle', 0.02, 200);
      } else if (d > T.r + e.r + 0.25) monMove(e, T.x, T.y, spd, dt);
      else if (e.cd <= 0) {
        e.cd = 0.55 / fr / (P.skills.frenzy > 0 && T.bleed ? 1.6 : 1); lingBite(e, T); e.biteT = 0.15;
        if (graftOn('clingers') && !T.dead && T.rank !== 'boss') e.cling = T;
      }
    } else {
      const i = G.brood.indexOf(e), n = Math.max(1, G.brood.length), ang = i / n * Math.PI * 2 + G.time * 0.3;
      const gx = an.x + Math.cos(ang) * 1.3, gy = an.y + Math.sin(ang) * 1.3;
      if (Math.hypot(gx - e.x, gy - e.y) > 0.4) monMove(e, gx, gy, spd * (dist(e, an) > 4 ? 1.2 : 0.8), dt);
    }
    if (e.leap) { e.leap.t += dt; if (e.leap.t > 0.25) e.leap = null; }
    pushOut(e);
    for (const m of G.zone.monsters) { if (m.dead) continue; const dd = dist(m, e), mm = m.r + e.r; if (dd < mm && dd > 0.001) moveCircle(e, (e.x - m.x) / dd * (mm - dd) * 0.6, (e.y - m.y) / dd * (mm - dd) * 0.6); }
  }
  // tumors wait to be used, then rot
  for (const s of G.sacs) {
    s.t -= dt; s.age = (s.age || 0) + dt;
    if (P.skills.quicken > 0 && s.age > 3 && !s.done) { let n = 0; for (let i = 0; i < s.n; i++) if (hatchLing(s.x + rand(-0.3, 0.3), s.y + rand(-0.3, 0.3))) n++; if (n) { s.done = true; burst(s.x, s.y, '#c9a66b', 12, 2); floatText(s.x, s.y, 'hatches', '#e89aa0'); continue; } }
    if (s.t <= 0) { s.done = true; burst(s.x, s.y, '#8e2630', 8, 1.2); }
  }
  G.sacs = G.sacs.filter(s => !s.done);
  updateThralls(dt);
}

// ------------------------------------------------------------------- Rabid Charge: a minion swells and charges to its death
function castRush(a) {
  let T = null, bd = 2.8;
  for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - a.x, m.y - a.y); if (d < bd) { bd = d; T = m; } }
  const pt = clampCast(a, 12), n = P.skills.rushtwo > 0 ? 2 : 1;
  if (aR('h_graft')) for (const e of G.brood) if (e.rider) { e.rider = false; const q = clampCast({ x: pt.x + rand(-0.5, 0.5), y: pt.y + rand(-0.5, 0.5) }, 9); e.x = q.x; e.y = q.y; e.flung = true; }
  const pool = G.brood.filter(e => e.hatch <= 0 && !e.rider && !e.rush).map(e => ({ e, d: dist(e, T || pt) }))
    .sort((p, q) => p.d - q.d).slice(0, n);
  if (!pool.length) { say('No spawnling to send', 1.2); return false; }
  if (!spendMana('rush')) return false;
  for (const { e } of pool) {
    e.cling = null; e.rush = { ref: T, x: pt.x, y: pt.y, t: 2.4, swell: 0 };
    floatText(e.x, e.y, 'RABID', '#ff6070');
    if (e.isThrall) { e.spd = 7.5; }
  }
  if (T) aggro(T);
  sfx(640, 0.16, 'sawtooth', 0.035, -300); sfx(220, 0.3, 'sawtooth', 0.03, 80);
  return true;
}
function updateRush(e, dt) {
  const r = e.rush; r.t -= dt; r.swell = Math.min(1, r.swell + dt * 2.5);
  const T = r.ref && !r.ref.dead && !r.ref.engulfed ? r.ref : null, tx = T ? T.x : r.x, ty = T ? T.y : r.y;
  if (Math.abs((tx - ty) - (e.x - e.y)) > 0.05) e.face = (tx - ty) > (e.x - e.y) ? 1 : -1;
  const d = Math.hypot(tx - e.x, ty - e.y);
  if (d < (T ? T.r + e.r + 0.3 : 0.4) || r.t <= 0) { rushBurst(e); return; }
  // it also bursts if it runs into anything else on the way
  for (const m of G.zone.monsters) if (!m.dead && m !== T && dist(m, e) < m.r + e.r + 0.15) { rushBurst(e); return; }
  monMove(e, tx, ty, 8.5, dt);
  if (Math.random() < 0.4) parts.push({ x: e.x, y: e.y, z: 3, vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5), vz: 6, t: 0.4, col: '#b8404a' });
}
function rushBurst(e) {
  const x = e.x, y = e.y, sz = e.size || 1, R = 1.8 + 0.2 * (sz - 1), dmg = HS.rushDmg() * (0.8 + 0.4 * sz);
  const hit = G.zone.monsters.filter(m => !m.dead && Math.hypot(m.x - x, m.y - y) < R + m.r);
  if (e.isThrall) { const i = G.thralls.indexOf(e); if (i >= 0) G.thralls.splice(i, 1); } else broodDies(e, true);
  bileBurst(x, y, dmg, R); splatPool(x, y, 0.8, 10);
  for (const m of hit) if (!m.dead && m.rank !== 'boss') m.stun = Math.max(m.stun || 0, 0.5);
  parts.push({ ring: true, x, y, r: 0.2, max: R, t: 0.35, col: '#ff6070' }); G.shake = Math.max(G.shake, 3);
  if (P.skills.rushchain > 0) for (const m of hit) if (m.dead) hatchLing(m.x, m.y);
  sfx(70, 0.4, 'sawtooth', 0.06, -30);
}

// ------------------------------------------------------------------- engulfing: the golem's belly and your own maw
// an engulfed enemy is taken out of the world until it is digested or spat back out
function engulfMon(m, h) {
  if (!m || m.dead || m.engulfed || m.rank === 'boss') return false;
  const i = G.zone.monsters.indexOf(m); if (i < 0) return false;
  G.zone.monsters.splice(i, 1); m.engulfed = true; m.bleed = null;
  for (const e of G.brood) if (e.cling === m) e.cling = null;
  G.engulfs.push({ m, h, t: 0, max: 4, tick: 0.25, zone: G.zone });
  burst(m.x, m.y, '#8e2630', 16, 2); floatText(m.x, m.y, 'ENGULFED', '#ff6070'); sfx(90, 0.35, 'sawtooth', 0.06, -50);
  return true;
}
function spitOut(e) {
  const m = e.m, h = e.h; m.engulfed = false;
  const f = h.face || 1, x = h.x + f * 0.7, y = h.y - f * 0.2;
  m.x = G.zone.solidAt(x, y) ? h.x : x; m.y = G.zone.solidAt(x, y) ? h.y : y;
  if (e.zone === G.zone) { e.zone.monsters.push(m); m.stun = Math.max(m.stun || 0, 1); addBleed(m, 4 * HS.power(), 4); splashDrops(m.x, m.y, 14, 2, 8); splatPool(m.x, m.y, 0.6, 8); floatText(m.x, m.y, 'spat out', '#e89aa0'); }
  else if (e.zone) e.zone.monsters.push(m);
}
function updateEngulfs(dt) {
  for (const e of G.engulfs) {
    const h = e.h, gone = h !== P && h !== G.fgolem;
    if (gone || (h === P && (P.dead || !mutOn('maw')))) { spitOut(e); e.done = true; continue; }
    e.t += dt; e.tick -= dt; e.m.x = h.x; e.m.y = h.y;
    if (e.tick <= 0) {
      e.tick = 0.25;
      const dps = h === P ? HS.digestDps() : HS.golemDmg() * 0.9 * (gmutOn('maw') ? 1.5 : 1);
      G.noProc = true; try { hurtMon(e.m, dps * 0.25, '#ff6070'); } finally { G.noProc = false; }
      if (h === P) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.03 * 0.25 * (P.skills.swallowheal > 0 ? 2 : 1));
      if (Math.random() < 0.5) parts.push({ x: h.x, y: h.y, z: 12, vx: rand(-0.6, 0.6), vy: rand(-0.6, 0.6), vz: 8, t: 0.4, col: '#8e2630' });
    }
    if (e.m.dead) {
      e.done = true; e.m.eaten = true; e.m.hatched = true;
      burst(h.x, h.y, '#8e2630', 20, 2.2); floatText(h.x, h.y, 'consumed', '#ff6070'); sfx(60, 0.3, 'sawtooth', 0.05, -20);
      if (h === P) P.mana = Math.min(D.maxMana, P.mana + D.maxMana * 0.08);
      else golemMeal(h, true);
      continue;
    }
    if (e.t >= e.max) { spitOut(e); e.done = true; }
  }
  G.engulfs = G.engulfs.filter(e => !e.done);
}
function engulfing(h) { return G.engulfs.some(e => e.h === h); }

// ------------------------------------------------------------------- the Flesh Golem
function newFGolem(x, y, hp) {
  const mx = HS.golemHp();
  return { isFGolem: true, big: true, x, y, r: 0.6, hp: hp == null ? mx : Math.min(mx, hp), max: mx, grow: 0, meals: 0, spd: 1.8, face: 1, cd: 1, state: 'idle', t: 0, hurt: 0, path: null, repath: 0, eat: null, order: null, slam: 0, hold: null, engulfCd: 3, vomitT: 0, mawOpen: 0, frenzyT: 0, tentCd: 1, budT: 3, heartCd: 0, stock: 3, pukeCd: 1.5, puke: null };
}
function castFGolem(pt) {
  if (aR('h_giant')) { suitCast(); return; }
  const a = clampCast(pt || aimPoint(), 6);
  // v0.22: the golem never dies for good. Recast on its heap (or on the golem) to feed it your own life.
  if (G.fheap) { feedFGolem(); return; }
  if (G.fgolem && Math.hypot(a.x - G.fgolem.x, a.y - G.fgolem.y) < 1.4 + G.fgolem.r) { feedFGolem(); return; }
  if (G.fgolem) { G.fgolem.order = { x: a.x, y: a.y, t: 5 }; G.fgolem.path = null; say('The Flesh Golem lumbers off', 0.8); return; }
  if (!spendMana('fgolem')) return;
  G.fgolem = newFGolem(a.x, a.y);
  burst(a.x, a.y, '#b8404a', 30, 3); splatPool(a.x, a.y, 0.9, 12); G.shake = Math.max(G.shake, 3); sfx(70, 0.6, 'sawtooth', 0.06, 30);
  P.cast = 0.5 / D.castSpd;
}
function layEggSac(x, y, n) { const p = clampCast({ x, y }, 20); G.sacs.push({ x: p.x, y: p.y, t: 45, max: 45, n: n || HS.sacN() }); while (G.sacs.length > 12) G.sacs.shift(); }
// what can be turned into minions near a point: fresh corpses and tumors
function fleshNear(a, R) {
  const out = [];
  for (const m of G.zone.monsters) if (m.dead && !m.hatched && !m.eaten && !m.burst && m.rank !== 'boss' && G.time - (m.deadAt || 0) < CORPSE_LIFE && Math.hypot(m.x - a.x, m.y - a.y) < R) out.push({ ref: m, kind: 'corpse', d: Math.hypot(m.x - a.x, m.y - a.y) });
  for (const s of G.sacs) if (Math.hypot(s.x - a.x, s.y - a.y) < R) out.push({ ref: s, kind: 'sac', d: Math.hypot(s.x - a.x, s.y - a.y) });
  return out.sort((p, q) => p.d - q.d);
}
function castHatch(a) {
  const list = fleshNear(a, HS.hatchR());
  if (!list.length) { if (!P.hatchChan) say('No flesh here: hold to bleed a brood out of yourself', 1.2); return false; }
  if (broodCount() >= HS.broodMax()) { say(`Your brood is full (${HS.broodMax()})`, 1.2); return false; }
  if (!spendMana('hatch')) return false;
  let n = 0;
  for (const t of list) {
    if (broodCount() >= HS.broodMax()) break;
    const o = t.ref;
    let k;
    if (t.kind === 'sac') { k = o.n; G.sacs = G.sacs.filter(s => s !== o); burst(o.x, o.y, '#c9a66b', 12, 2); }
    else { o.hatched = true; const bled = !!o.infected; k = 1 + (P.skills.swollen > 0 ? 1 : 0); if (bled && P.skills.infest > 0) k *= 2; k += hatchBonus(); burst(o.x, o.y, '#8e2630', 12, 2); splatPool(o.x, o.y, 0.45, 8); }
    for (let i = 0; i < k; i++) if (hatchLing(o.x + rand(-0.4, 0.4), o.y + rand(-0.4, 0.4))) n++;
  }
  sfx(200, 0.25, 'sawtooth', 0.04, -100); floatText(a.x, a.y, `${n} hatched`, '#e89aa0');
  return true;
}
function hurtFGolem(g, dmg, type) {
  dmg *= (type === 'phys' ? 100 / 130 : 0.9) * (gmutOn('chitin') ? 0.7 : 1) * hiveGuard(g) * (P.skills.broodtough > 0 ? 0.8 : 1);
  g.hp -= dmg; g.hurt = 0.1; crownSave(g); giantHurt(g);
  if (g.hp <= 0 && gmutOn('heart') && g.heartCd <= 0) { g.heartCd = 60; g.hp = g.max * 0.4; banner('THE GOLEM\'S HEART POUNDS', '#c24050', 1.2); return; }
  if (g.hp <= 0) {
    burst(g.x, g.y, '#8e2630', 50, 3.5); splatPool(g.x, g.y, 1.4, 16); G.shake = Math.max(G.shake, 4);
    if (P.skills.splitG > 0) for (let i = 0; i < 6; i++) hatchLing(g.x + rand(-0.8, 0.8), g.y + rand(-0.8, 0.8), true);
    G.fgolem = null; say('The Flesh Golem slumps into a heap. It will regrow.', 1.8); sfx(55, 0.9, 'sawtooth', 0.06, -20);
    const rt = HS.golemRegrow(); G.fheap = { x: g.x, y: g.y, rt, rtMax: rt, downT: 0, boost: 0, meals: g.meals, t: 0 };
  }
}
// Feeding the golem your life: on the heap it quickens the regrowth (at most about double speed, and never
// sooner than 10 seconds), on the living golem it knits its wounds.
function feedFGolem() {
  if (P.cast > 0) return;
  const h = G.fheap, g = G.fgolem, tgt = h || g;
  if (!tgt) return;
  if (Math.hypot(tgt.x - P.x, tgt.y - P.y) > 9) { say('Too far from your golem', 1); return; }
  bloodPay(D.maxHp * 0.06);
  if (h) h.boost = Math.min(golemBoostCap(), h.boost + 0.25 * (P.weakK || 1));
  else g.hp = Math.min(g.max, g.hp + g.max * 0.2 * (P.weakK || 1));
  for (let i = 0; i < 6; i++) flyMote(P.x, P.y, 10, tgt, '#c24050');
  splashDrops(P.x, P.y, 5, 1.5, 9); floatText(tgt.x, tgt.y, h ? 'fed · regrowing faster' : 'fed', '#e89aa0');
  P.cast = 0.35 / D.castSpd; sfx(90, 0.3, 'sine', 0.05, -30);
}
function updateFHeap(dt) {
  const h = G.fheap; if (!h) return;
  h.t += dt; h.downT += dt; h.boost = Math.max(0, h.boost - 0.06 * dt); h.rt -= dt * (1 + h.boost);
  if (Math.random() < dt * 3) splashDrops(h.x + rand(-0.3, 0.3), h.y + rand(-0.3, 0.3), 1, 0.6, 3);
  if (h.rt <= 0 && h.downT >= GOLEM_MIN_DOWN) {
    const g = newFGolem(h.x, h.y); g.meals = h.meals; G.fgolem = g; G.fheap = null;
    burst(g.x, g.y, '#b8404a', 34, 3); splatPool(g.x, g.y, 1, 12); G.shake = Math.max(G.shake, 2.5); say('The Flesh Golem hauls itself up again', 1.4); sfx(70, 0.6, 'sawtooth', 0.06, 30);
  }
}
function golemMeal(g, live) {
  g.hp = Math.min(g.max, g.hp + g.max * ((P.skills.gorge > 0 ? 0.35 : 0.15) + (aM('b_glut') ? 0.1 : 0)));
  if (P.skills.gorge > 0 && g.meals < 6) g.meals++;
  const was = g.stock || 0; g.stock = Math.min(HS.golemStockMax(), was + HS.golemMealStock(live));
  sfx(120, 0.3, 'sawtooth', 0.04, -60); floatText(g.x, g.y, (live ? 'digests' : 'gorges') + (g.stock > was ? ` · stock ${g.stock}/${HS.golemStockMax()}` : ''), '#e89aa0');
}
// v0.34: the puke. It rears back, the stitches down its gut tear, and the gut-maw spews a gout of blood and bile at
// the enemy: the gout splashes where it lands and a clutch of swarmlings tumbles out of it and falls on them.
const FG_PUKE_WIND = 0.4, FG_PUKE_END = 1.05;
function pukeLing(g, T, i, n) {
  const temps = G.brood.filter(e => e.temp); if (temps.length >= 16) broodDies(temps[0], true);
  const e = hatchLing(g.x, g.y, true); if (!e) return null;
  const hp = HS.pukeLingHp(); e.temp = true; e.puke = true; e.max = e.hp = hp; e.life = HS.pukeLingLife();
  const f = g.face || 1, ax = T ? T.x - g.x : f * 0.7, ay = T ? T.y - g.y : -f * 0.7, d = Math.hypot(ax, ay) || 1, reach = Math.min(d - 0.5, 3.6);
  const ang = Math.atan2(ay, ax) + (i - (n - 1) / 2) * 0.35 + rand(-0.12, 0.12), R = Math.max(1.2, reach * rand(0.7, 1.05));
  e.x = g.x + ax / d * 0.6; e.y = g.y + ay / d * 0.6;
  const p = clampCast({ x: g.x + Math.cos(ang) * R, y: g.y + Math.sin(ang) * R }, 30), land = G.zone.solidAt(p.x, p.y) ? { x: e.x, y: e.y } : p;
  e.fly = { x0: e.x, y0: e.y, x1: land.x, y1: land.y, t: 0, dur: 0.3 + R * 0.06, h: 14 + R * 3 };
  e.hatch = 1; e.face = f;
  return e;
}
function golemPuke(g, dt) {
  const K = g.puke; K.t += dt; g.mawOpen = K.t > FG_PUKE_WIND ? 1 : 0.5;
  const T = K.tgt && !K.tgt.dead ? K.tgt : null;
  if (T && Math.abs((T.x - T.y) - (g.x - g.y)) > 0.05) g.face = (T.x - T.y) > (g.x - g.y) ? 1 : -1;
  if (K.t > FG_PUKE_WIND) {
    const f = g.face || 1, mx = g.x + f * 0.45, my = g.y - f * 0.45;
    if (!K.gout) {
      K.gout = true; g.stock = Math.max(0, (g.stock || 0) - HS.golemPukeCost());
      const at = T ? { x: T.x, y: T.y } : { x: g.x + f * 2, y: g.y - f * 2 };
      bileBurst(at.x, at.y, HS.pukeDmg(), 1.2); splatPool(at.x, at.y, 0.7, 10);
      G.shake = Math.max(G.shake, 2); sfx(95, 0.55, 'sawtooth', 0.06, -45); setTimeout(() => sfx(160, 0.3, 'sawtooth', 0.04, -90), 120);
      floatText(g.x, g.y, 'PUKES', '#c8d070');
    }
    // the gout: a stream of blood and bile arcing out of the maw
    const at = T || { x: g.x + f * 2, y: g.y - f * 2 };
    for (let i = 0; i < 3; i++) { const u = rand(0.1, 1); parts.push({ x: mx + (at.x - mx) * u * 0.4, y: my + (at.y - my) * u * 0.4, z: 14, vx: (at.x - mx) * rand(0.9, 1.6), vy: (at.y - my) * rand(0.9, 1.6), vz: rand(4, 9), t: rand(0.35, 0.6), col: Math.random() < 0.3 ? '#9ab04a' : Math.random() < 0.5 ? '#b8404a' : '#8e2630' }); }
    const n = HS.golemPukeN(), due = Math.min(n, Math.floor((K.t - FG_PUKE_WIND) / 0.07) + 1);
    while (K.n < due) { pukeLing(g, T, K.n, n); K.n++; }
  } else if (Math.random() < 0.4) parts.push({ x: g.x, y: g.y, z: 12, vx: rand(-0.4, 0.4), vy: rand(-0.4, 0.4), vz: 3, t: 0.3, col: '#8e2630' });
  if (K.t >= FG_PUKE_END) { g.puke = null; g.pukeCd = (g.frenzyT > 0 ? 3.5 : 5.5) / hasteK(g); }
}
function fgFood(g, R) {
  let food = null, fd = R;
  for (const m of G.zone.monsters) { if (!m.dead || m.eaten || m.hatched || m.burst || m.erased || m.rank === 'boss' || G.time - (m.deadAt || 0) > CORPSE_LIFE) continue; const d = dist(m, g); if (d < fd && dist(m, P) < 12) { fd = d; food = m; } }
  return food ? { m: food, d: fd } : null;
}
function updateFGolem(dt) {
  const g = G.fgolem; if (!g) return;
  if (g.stock == null) g.stock = 0; if (g.pukeCd == null) g.pukeCd = 2; if (g.engulfCd == null) g.engulfCd = 3; if (g.tentCd == null) g.tentCd = 1; if (g.budT == null) g.budT = 3; if (g.heartCd == null) g.heartCd = 0; if (g.frenzyT == null) g.frenzyT = 0;
  g.hurt = Math.max(0, g.hurt - dt); g.t += dt; g.cd -= dt; g.slam = Math.max(0, g.slam - dt); g.engulfCd -= dt; g.pukeCd -= dt; g.tentCd -= dt; g.budT -= dt; g.heartCd = Math.max(0, g.heartCd - dt);
  g.stock = Math.min(g.stock, HS.golemStockMax());
  g.mawOpen = Math.max(engulfing(g) ? 0.5 : 0, g.mawOpen - dt * 2);
  if (g.frenzyT > 0) { g.frenzyT -= dt; if (P.skills.bloodlust > 0) g.hp = Math.min(g.max, g.hp + g.max * 0.03 * dt); }
  const k = 1 + 0.08 * g.meals, fr = g.frenzyT > 0, spd = g.spd * (fr ? 1.4 : 1);
  g.max = HS.golemHp() * k; g.hp = Math.min(g.hp, g.max); g.r = 0.6 * (1 + 0.05 * g.meals);
  if (dist(g, P) > 20) { g.x = P.x + 1; g.y = P.y; if (G.zone.solidAt(g.x, g.y)) { g.x = P.x; g.y = P.y; } g.path = null; g.eat = null; g.puke = null; }
  if (inPoolAt(g)) g.hp = Math.min(g.max, g.hp + g.max * 0.02 * (gmutOn('gills') ? 3 : 1) * dt);
  if (gmutOn('heart')) g.hp = Math.min(g.max, g.hp + g.max * 0.01 * dt);
  // mutations it wears
  if (gmutOn('tentacles') && g.tentCd <= 0) {
    let best = null, bd = 3.8; for (const m of G.zone.monsters) { if (m.dead || m.state === 'idle') continue; const d = dist(m, g); if (d < bd) { bd = d; best = m; } }
    if (best) { g.tentCd = 2; hurtMon(best, HS.golemDmg() * 0.5, '#e89aa0'); if (best.rank !== 'boss' && bd > 1) moveCircle(best, -(best.x - g.x) / bd * Math.min(1.4, bd - 0.9), -(best.y - g.y) / bd * Math.min(1.4, bd - 0.9)); best.root = Math.max(best.root || 0, 0.8); G.tents.push({ ref: best, from: g, t: 0, dur: 0.6, side: 1 }); } else g.tentCd = 0.3;
  }
  if (gmutOn('bilehump') && g.budT <= 0) { const any = G.zone.monsters.some(m => !m.dead && m.state !== 'idle' && dist(m, g) < 8); if (any) { g.budT = HS.bileCd() * 1.3; G.biles.push({ orb: true, x: g.x, y: g.y - 0.2, z: 26, vz: 3, t: 5, spd: 3.4, tgt: null }); } else g.budT = 0.4; }
  // eating corpses
  if (g.eat) {
    const c = g.eat;
    if (c.eaten || dist(g, c) > 1.4) { g.eat = null; }
    else {
      g.eatT = (g.eatT || 0) + dt; g.mawOpen = 0; g.chew = (g.chew || 0) + dt;
      if (Math.abs((c.x - c.y) - (g.x - g.y)) > 0.05) g.face = (c.x - c.y) > (g.x - g.y) ? 1 : -1;
      // a chomp every few tenths: the mandibles tear, gore flies
      g.chompT = (g.chompT || 0) - dt;
      if (g.chompT <= 0) { g.chompT = 0.28; splashDrops(c.x, c.y, 4, 1.6, 5); burst(c.x, c.y, '#8e2630', 4, 1.4); sfx(140 + Math.random() * 60, 0.08, 'sawtooth', 0.03, -120); }
      if (g.eatT > (aM('b_glut') ? 0.7 : 1.4)) {
        c.eaten = true; c.hatched = true; g.eat = null; g.eatT = 0;
        burst(c.x, c.y, '#8e2630', 18, 2.2); burst(c.x, c.y, '#e6dcc4', 6, 1.6); splatPool(c.x, c.y, 0.6, 10); sfx(70, 0.35, 'sawtooth', 0.05, -30);
        golemMeal(g);
      }
      pushOut(g); return;
    }
  }
  if (g.order) {
    const o = g.order; if (dist(g, o) > 0.6) { monMove(g, o.x, o.y, spd * 1.3, dt); pushOut(g); return; }
    o.t -= dt; if (o.t <= 0) g.order = null;
  }
  const T = broodTarget(g);
  if (g.puke) { golemPuke(g, dt); pushOut(g); return; }
  // hungry: with too little stock to puke and no enemy at its throat, it goes for the nearest corpse
  if (g.stock < HS.golemPukeCost() && !g.lunge && (!T || dist(g, T) > T.r + g.r + 1.2)) {
    const F = fgFood(g, T ? 4.5 : 7);
    if (F) { if (F.d > 1.1) monMove(g, F.m.x, F.m.y, spd * 1.15, dt); else { g.eat = F.m; g.eatT = 0; g.chompT = 0.1; } pushOut(g); return; }
  }
  // v0.22: like the iron golem, it hurls its bulk at enemies a few yards off, bowling them over
  g.lungeCd = (g.lungeCd || 2) - dt;
  if (g.lunge) {
    const L = g.lunge; L.t -= dt;
    if (L.t > 0.25) { g.mawOpen = 0.6; pushOut(g); return; }
    moveCircle(g, L.dx * 9 * dt, L.dy * 9 * dt);
    for (const m of G.zone.monsters) {
      if (m.dead || L.hit.has(m) || Math.hypot(m.x - g.x, m.y - g.y) > g.r + m.r + 0.2) continue;
      L.hit.add(m); hurtMon(m, HS.golemDmg() * 1.3 * k, '#e89aa0'); poiseHit(m, 60);
      if (m.rank !== 'boss') { m.stun = Math.max(m.stun || 0, 0.8); for (let i = 0; i < 5; i++) moveCircle(m, L.dx * 0.22, L.dy * 0.22); }
      G.shake = Math.max(G.shake, 2); splatPool(m.x, m.y, 0.35, 5);
    }
    if (L.t <= 0) g.lunge = null;
    pushOut(g); return;
  }
  if (T && g.lungeCd <= 0) { const d = dist(g, T); if (d > 2.4 && d < 5.5 && lineClear(G.zone, g, T)) { g.lungeCd = rand(5, 7); g.lunge = { t: 0.25 + 0.42, dx: (T.x - g.x) / d, dy: (T.y - g.y) / d, hit: new Set() }; sfx(75, 0.4, 'sawtooth', 0.05, 50); } }
  if (T) {
    const d = dist(g, T);
    if (Math.abs((T.x - T.y) - (g.x - g.y)) > 0.05) g.face = (T.x - T.y) > (g.x - g.y) ? 1 : -1;
    if (d < 6.5 && g.pukeCd <= 0 && g.stock >= HS.golemPukeCost() && T.state !== 'idle' && lineClear(G.zone, g, T)) { g.puke = { t: 0, tgt: T, n: 0 }; sfx(60, 0.4, 'sawtooth', 0.05, 20); }
    else if (d > T.r + g.r + 0.4) monMove(g, T.x, T.y, spd, dt);
    else if (g.engulfCd <= 0 && T.rank !== 'boss' && !engulfing(g)) { g.engulfCd = gmutOn('maw') ? 3.5 : 7; g.mawOpen = 1; engulfMon(T, g); }
    else if (g.cd <= 0) {
      g.cd = 1.4 / (fr ? 1.5 : 1) / hasteK(g); g.slam = 0.3;
      for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - T.x, m.y - T.y) < 1 + m.r) {
        hurtMon(m, HS.golemDmg() * k * (m === T ? 1 : 0.6) * (fr && P.skills.rage > 0 ? 1.25 : 1) * hiveDmg(g), '#e89aa0'); poiseHit(m, 35);
        if (m.rank !== 'boss' && !m.dead) { m.stun = Math.max(m.stun || 0, 0.3); const dd = dist(m, g) || 1; for (let i = 0; i < 3; i++) moveCircle(m, (m.x - g.x) / dd * 0.15, (m.y - g.y) / dd * 0.15); }
      }
      parts.push({ ring: true, x: T.x, y: T.y, r: 0.2, max: 1, t: 0.3, col: '#b8404a' }); splatPool(T.x, T.y, 0.4, 6); G.shake = Math.max(G.shake, 1.5); sfx(80, 0.2, 'sawtooth', 0.05, -30);
    }
  } else {
    // find something to eat: while its gut is not full, or while it is hurt
    const F = (g.stock < HS.golemStockMax() || g.hp < g.max * 0.9) ? fgFood(g, 7) : null;
    if (F) { if (F.d > 1.1) monMove(g, F.m.x, F.m.y, spd, dt); else { g.eat = F.m; g.eatT = 0; g.chompT = 0.1; } }
    else {
      const B = P.fbeh, an = G.bcmd && G.bcmd.pt ? G.bcmd.pt : B.hold && g.hold ? g.hold : P;
      if (dist(g, an) > (an === P ? 2.2 : 0.5)) monMove(g, an.x, an.y, spd * (dist(g, an) > 5 ? 1.4 : 1), dt);
    }
  }
  pushOut(g);
  for (const m of G.zone.monsters) { if (m.dead) continue; const dd = dist(m, g), mm = m.r + g.r; if (dd < mm && dd > 0.001) moveCircle(m, (m.x - g.x) / dd * (mm - dd) * 0.6, (m.y - g.y) / dd * (mm - dd) * 0.6); }
}

// ------------------------------------------------------------------- casting
function bloodCast(id, pt) {
  if (!isBlood() || !SK[id] || SK[id].cls !== 'hemomancer' || !P.skills[id] || SK[id].kind === 'passive') return;
  if (P.roll > 0 || P.cast > 0) return;
  const a = losPoint(pt || aimPoint());
  if (id === 'fgolem') { castFGolem(a); return; }
  if (id === 'devour') { castDevour(); return; }
  if (id === 'hatch') { if (castHatch(a)) { P.cast = 0.4 / D.castSpd; faceTo(a.x, a.y); } return; }
  if (id === 'thrall') { if (castOoze(a)) { P.cast = 0.45 / D.castSpd; faceTo(a.x, a.y); } return; }
  if (id === 'swallow' && !engulfing(P) && mutOn('maw') && !meleeApproach('swallow', a, 1.5)) return;
  if (['nest', 'bboil', 'bwave', 'pact', 'swallow', 'molt'].includes(id)) { bloodCast14(id, a); return; }
  if (id === 'rush') { if (castRush(a)) { P.cast = 0.3 / D.castSpd; faceTo(a.x, a.y); } return; }
  if (id === 'hemor') { if (castHemorrhage(a)) { P.cast = 0.4 / D.castSpd; faceTo(a.x, a.y); } return; }
  if (id === 'cburst' && !burstTarget(a)) { say('Nothing near the cursor to burst: a corpse or tumor', 1.3); return; }
  if (id === 'blance' && aR('h_tide')) { if (!spendMana(id, 5 * arcCost(id))) return; castBloodSword(a); faceTo(a.x, a.y); P.cast = 0.42 / D.castSpd; return; }
  if (!spendMana(id)) return;
  faceTo(a.x, a.y); P.path = null;
  switch (id) {
    case 'eggsac': throwTumors(a); P.cast = 0.4 / D.castSpd; break;
    case 'blance': castVomit(a); P.cast = 0.11; P.vomiting = 0.2; break;
    case 'vwhip': if (aR('h_leech')) castTendril(a); else castRootVeins(a); P.cast = 0.4 / D.castSpd; break;
    case 'bfrenzy': castFrenzy(); P.cast = 0.35 / D.castSpd; break;
    case 'cburst': castCorpseBurst(a); P.cast = 0.4 / D.castSpd; break;
  }
}
// Tumor Toss: tumors that burst on what they hit, each leaving a spawnling with one life
function throwTumors(a) {
  const n = HS.tumorN(), p = clampCast(a, 8), d = Math.hypot(p.x - P.x, p.y - P.y) || 1, base = Math.atan2(p.y - P.y, p.x - P.x), fat = aR('h_clutch');
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * 0.22, dd = d * (0.85 + Math.random() * 0.3), x1 = P.x + Math.cos(base + o) * dd, y1 = P.y + Math.sin(base + o) * dd;
    G.tumors.push({ x0: P.x, y0: P.y, x1, y1, x: P.x, y: P.y, z: 8, t: 0, dur: (fat ? 0.6 : 0.42) + i * 0.03, fat });
  }
  sfx(170, 0.2, 'sawtooth', 0.035, 80);
}
function tumorPop(s, hitM) {
  s.done = true;
  const x = hitM ? hitM.x : s.x, y = hitM ? hitM.y : s.y, R = (P.skills.tumorbig > 0 ? 1.3 : 0.9) * (s.fat ? 1.3 : 1);
  if (!hitM && aU('h_clutch') && !G.zone.solidAt(x, y)) { layEggSac(x, y, s.fat ? 3 : 1); burst(x, y, '#c9a66b', 6, 1.4); return; }
  bileBurst(x, y, HS.tumorDmg() * (s.fat ? 1.4 : 1), R); splatPool(x, y, 0.4, 6);
  const k = s.fat ? 3 : 1; for (let i = 0; i < k; i++) { const q = clampCast({ x: x + rand(-0.4, 0.4), y: y + rand(-0.4, 0.4) }, 30); tumorLing(q.x, q.y); }
}
function updateTumors(dt) {
  for (const s of G.tumors) {
    if (s.done) continue;
    s.t += dt; const k = Math.min(1, s.t / s.dur);
    s.x = s.x0 + (s.x1 - s.x0) * k; s.y = s.y0 + (s.y1 - s.y0) * k; s.z = Math.sin(k * Math.PI) * 22 + 6 * (1 - k);
    if (k > 0.35) { const m = G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - s.x, m.y - s.y) < m.r + 0.25); if (m) { tumorPop(s, m); continue; } }
    if (G.zone.solidAt(s.x, s.y) && k > 0.2) { s.x -= (s.x1 - s.x0) * 0.05; s.y -= (s.y1 - s.y0) * 0.05; tumorPop(s); continue; }
    if (k >= 1) tumorPop(s);
  }
  G.tumors = G.tumors.filter(s => !s.done);
}
// Blood Frenzy: you and every minion around you go rabid
function castFrenzy() {
  const dur = HS.frenzyDur(), R = HS.frenzyR();
  P.bfrenzyT = dur; D = derive();
  let n = 0;
  for (const e of G.brood) if (dist(e, P) < R) { e.frenzyT = dur; n++; }
  for (const th of G.thralls) if (dist(th, P) < R) { th.frenzyT = dur; n++; }
  if (G.fgolem && dist(G.fgolem, P) < R) { G.fgolem.frenzyT = dur; n++; }
  parts.push({ ring: true, x: P.x, y: P.y, r: 0.3, max: R, t: 0.5, col: '#ff6070' });
  burst(P.x, P.y, '#ff6070', 24, 2.6); banner('BLOOD FRENZY', '#ff6070', 1.1);
  for (let i = 0; i < 3; i++) sfx(500 + i * 170, 0.12, 'sawtooth', 0.03, -300);
}
// droplets of blood flung into the air; they fall and patter
function splashDrops(x, y, n, spd, z = 6) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = spd * (0.3 + Math.random()); parts.push({ x, y, z: z + Math.random() * 3, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 14 + Math.random() * 22, t: 0.45 + Math.random() * 0.35, col: Math.random() < 0.5 ? '#b8404a' : '#8e2630' }); }
  if (parts.length > 600) parts.splice(0, parts.length - 600);
}
// a gout bursts: a small splash that bleeds everything nearby and leaves a pool
function lanceSplash(s) {
  if (s.done) return; s.done = true; s.t = 0;
  const R = (0.9 + 0.25 * s.mass) * (s.vomit ? 0.6 : 1), dmg = s.dmg * 0.5 * s.mass;
  for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - s.x, m.y - s.y) < R + m.r) { hurtMon(m, dmg, '#e89aa0'); addBleed(m, HS.bleedOf(s.dmg) * 0.7, 3); if (!s.golem) P.lastHit = m; if (!s.golem && P.skills.coag > 0) m.slow = Math.max(m.slow || 0, 0.35); }
  if (!s.golem) onGoutSplash(s, R);
  splashDrops(s.x, s.y, s.vomit ? 6 : 14, 2.4, 4);
  if (!s.vomit) parts.push({ ring: true, x: s.x, y: s.y, r: 0.2, max: R, t: 0.3, col: '#8e2630' });
  if (!s.vomit || Math.random() < 0.25) splatPool(s.x, s.y, 0.4, 4);
  if (!s.vomit) sfx(150 + Math.random() * 40, 0.12, 'triangle', 0.03, -90);
}
// Blood Vomit: held, a sloshing stream of gouts in a narrow cone
function castVomit(a) {
  const base = Math.atan2(a.y - P.y, a.x - P.x);
  for (let k = 0; k < 2; k++) {
    const ang = base + rand(-0.2, 0.2), dx = Math.cos(ang), dy = Math.sin(ang), v = 10 + Math.random() * 3;
    G.blances.push({ x: P.x + dx * 0.35, y: P.y + dy * 0.35, bx: P.x + dx * 0.35, by: P.y + dy * 0.35, dx, dy, v, vx: dx * v, vy: dy * v, ph: Math.random() * 6.28, amp: 0.12 + Math.random() * 0.1, age: 0, z: 12, t: 0.55, mass: 0.65, dmg: HS.vomitDmg(), hit: new Set(), dripT: 0, drop: 0, trail: [], vomit: true, split: Math.random() > 0.3 });
  }
  if (Math.random() < 0.5) sfx(120 + Math.random() * 60, 0.1, 'sawtooth', 0.03, -60);
}
function updateLances(dt) {
  for (const s of G.blances) {
    if (s.done) continue;
    s.t -= dt; s.dripT -= dt; s.drop -= dt;
    const ox = s.x, oy = s.y, z0 = s.vomit ? 12 : s.golem ? 16 : 9;
    for (let k = 0; k < 3 && !s.done; k++) {
      const h = dt / 3; s.age += h; s.v *= Math.exp(-1.0 * h);
      s.bx += s.dx * s.v * h; s.by += s.dy * s.v * h;
      // weave side to side like a flung slop of liquid; the sway grows as it leaves your mouth
      const off = Math.sin(s.age * 13 + s.ph) * s.amp * Math.min(1, s.age * 5);
      s.x = s.bx - s.dy * off; s.y = s.by + s.dx * off;
      s.z = z0 - (s.vomit ? 30 : 15) * s.age * s.age;
      const tt = G.zone.get(Math.floor(s.x), Math.floor(s.y)); if (TALL[tt] && tt !== T.ROCK) { s.x -= s.dx * 0.15; s.y -= s.dy * 0.15; lanceSplash(s); break; }
      for (const m of G.zone.monsters) {
        if (m.dead || s.hit.has(m) || Math.abs(m.x - s.x) > 1.2 || Math.hypot(m.x - s.x, m.y - s.y) > m.r + 0.25) continue;
        s.hit.add(m); hurtMon(m, s.dmg * s.mass, '#e89aa0'); addBleed(m, HS.bleedOf(s.dmg), 4); if (!s.golem) P.lastHit = m; splashDrops(m.x, m.y, s.vomit ? 3 : 7, 1.8, 8);
        s.mass = Math.max(0.3, s.mass * 0.8); // every body it soaks through thins it a little
        if (!s.golem) onGoutHit(s, m);
      }
      if (s.t <= 0 || s.z <= 0) { lanceSplash(s); break; }
    }
    if (!s.done) { s.vx = (s.x - ox) / dt; s.vy = (s.y - oy) / dt; }
    s.trail.unshift({ x: s.x, y: s.y, z: s.z }); if (s.trail.length > (s.vomit ? 3 : 5)) s.trail.pop();
    if (s.drop <= 0 && !s.done) { s.drop = s.vomit ? 0.1 : 0.05; parts.push({ x: s.x, y: s.y, z: Math.max(2, s.z + 6), vx: s.vx * 0.15 + rand(-0.4, 0.4), vy: s.vy * 0.15 + rand(-0.4, 0.4), vz: rand(-4, 6), t: 0.4, col: '#8e2630' }); }
  }
  G.blances = G.blances.filter(s => !s.done);
}
// Hemorrhage: tear a share of one enemy's life out through its skin, with a small splash
function castHemorrhage(a) {
  let m = null, bd = 2.5;
  for (const o of G.zone.monsters) { if (o.dead) continue; const d = Math.hypot(o.x - a.x, o.y - a.y); if (d < bd && dist(o, P) < 12 && lineClear(G.zone, P, o)) { bd = d; m = o; } }
  if (!m) { say('No enemy near the cursor', 1); return false; }
  if (!spendMana('hemor')) return false;
  const pct = m.rank === 'boss' ? HS.hemorBoss() : HS.hemorPct(), dealt = Math.max(m.hp * pct, HS.hemorMin());
  hurtMon(m, dealt * (100 + (m.armor || 0)) / 100, '#ff3048'); P.lastHit = m;
  if (P.skills.hemdeep > 0) addBleed(m, dealt / 12, 4);
  splashDrops(m.x, m.y, 22, 2.6, 12); splatPool(m.x, m.y, 0.7, 9);
  const R = HS.hemorR();
  for (const o of G.zone.monsters) {
    if (o.dead || o === m || Math.hypot(o.x - m.x, o.y - m.y) > R + o.r) continue;
    addBleed(o, dealt * 0.15, 4); if (P.skills.hemsplash > 0) hurtMon(o, Math.min(dealt * 0.5, HS.hemorMin() * 3), '#e89aa0');
    if (aM('l_drag') && o.rank !== 'boss') { const d = Math.hypot(o.x - m.x, o.y - m.y) || 1; moveCircle(o, (m.x - o.x) / d * Math.min(d - 0.6, 1.2), (m.y - o.y) / d * Math.min(d - 0.6, 1.2)); }
  }
  G.hemorFx = { x: m.x, y: m.y, R, t: 0.6, veins: [0, 1, 2, 3, 4, 5].map(() => Math.random() * 6.28) };
  sfx(110, 0.4, 'sawtooth', 0.045, -40); sfx(300, 0.15, 'square', 0.03, -200);
  return true;
}
// Root Veins: a burst of red veins erupts from the bandaged forearm like roots and snakes out to several enemies at
// once. Each vein bites and bleeds its target; some hold on and squeeze. Veins that reach nothing thrash in the air
// and leave small pools where their tips bleed.
function castRootVeins(a) {
  const d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d, R = HS.rootR(), n = HS.rootN(), dmg = HS.whipDmg();
  const x0 = P.x + dx * 0.35, y0 = P.y + dy * 0.35, a0 = Math.atan2(dy, dx);
  const cands = [];
  for (const m of G.zone.monsters) {
    if (m.dead || m.engulfed) continue; const ox = m.x - x0, oy = m.y - y0, od = Math.hypot(ox, oy); if (od > R + m.r) continue;
    if ((ox * dx + oy * dy) / (od || 1) < Math.cos(1.35) || !lineClear(G.zone, P, m)) continue;
    cands.push({ m, od });
  }
  cands.sort((p, q) => p.od - q.od);
  const hit = cands.slice(0, n);
  hit.forEach(({ m, od }, i) => G.rveins.push({ x0, y0, ref: m, t: 0, grow: 0.1 + od * 0.045, hold: 0, seed: Math.random() * 6.28, i, dmg }));
  // the rest thrash into the air, spreading through the cone; their tips bleed onto the ground
  const spare = n - hit.length, used = hit.map(h => Math.atan2(h.m.y - y0, h.m.x - x0));
  for (let i = 0; i < spare; i++) {
    let ang = a0 + (spare === 1 ? rand(-0.5, 0.5) : -1 + 2 * (i + 0.5) / spare + rand(-0.25, 0.25));
    for (const u of used) if (Math.abs(((ang - u + Math.PI) % (Math.PI * 2)) - Math.PI) < 0.3) ang += 0.45;
    let L = R * rand(0.45, 0.8); while (L > 0.6 && G.zone.solidAt(x0 + Math.cos(ang) * L, y0 + Math.sin(ang) * L)) L -= 0.3;
    G.rveins.push({ x0, y0, ex: x0 + Math.cos(ang) * L, ey: y0 + Math.sin(ang) * L, t: 0, grow: 0.12 + L * 0.05, thrash: true, seed: Math.random() * 6.28, i: hit.length + i, dmg });
  }
  while (G.rveins.length > 24) G.rveins.shift();
  splashDrops(x0, y0, 5, 1.6, 8); G.shake = Math.max(G.shake, hit.length ? 1.5 : 0.6);
  sfx(700, 0.1, 'sawtooth', 0.035, -500); sfx(140, 0.14, 'sawtooth', 0.03, -60);
}
function rootBite(v) {
  const m = v.ref, dmg = v.dmg; v.bit = true;
  hurtMon(m, dmg, '#e89aa0'); addBleed(m, HS.bleedOf(dmg), aM('l_lash') ? 8 : 4); P.lastHit = m; splashDrops(m.x, m.y, 8, 1.8, 9); splatPool(m.x, m.y, 0.3, 5);
  if (aU('h_leech')) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.02);
  if (P.skills.veinhook > 0 && m.rank !== 'boss') { const ox = m.x - v.x0, oy = m.y - v.y0, od = Math.hypot(ox, oy) || 1; if (od > 1.2) moveCircle(m, -ox / od * Math.min(1, od - 1.1), -oy / od * Math.min(1, od - 1.1)); }
  if (!m.dead && Math.random() < HS.veinChance()) { v.hold = HS.veinT() * (m.rank === 'boss' ? 0.3 : 1); v.holdMax = v.hold; m.root = Math.max(m.root || 0, v.hold); floatText(m.x, m.y, 'held', '#e89aa0'); }
  sfx(260 + Math.random() * 80, 0.07, 'sawtooth', 0.03, -160);
}
function updateRootVeins(dt) {
  for (const v of G.rveins) {
    v.t += dt;
    if (v.thrash) { if (v.t >= v.grow && !v.pooled) { v.pooled = true; splatPool(v.ex, v.ey, 0.28, 5); splashDrops(v.ex, v.ey, 3, 1.2, 4); } if (v.t > v.grow + 0.95) v.done = true; continue; }
    const m = v.ref;
    if (m.dead || m.engulfed) { if (v.hold > 0) v.hold = 0; if (v.t > v.grow + 0.25) v.done = true; continue; }
    if (!v.bit && v.t >= v.grow) rootBite(v);
    if (v.hold > 0) {
      v.hold -= dt; v.tick = (v.tick || 0) - dt; m.root = Math.max(m.root || 0, Math.min(v.hold, 0.1));
      if (v.tick <= 0) { v.tick = 0.25; G.noProc = true; try { hurtMon(m, v.dmg * 0.3 * 0.25, '#c24050'); } finally { G.noProc = false; } if (Math.random() < 0.5) parts.push({ x: m.x + rand(-0.2, 0.2), y: m.y + rand(-0.2, 0.2), z: 8, vx: rand(-0.5, 0.5), vy: rand(-0.5, 0.5), vz: 4, t: 0.35, col: '#b8404a' }); }
      if (v.hold <= 0) v.hold = 0;
    } else if (v.bit && v.t > v.grow + 0.4 + (v.holdMax || 0)) v.done = true;
  }
  G.rveins = G.rveins.filter(v => !v.done);
}
const castVeinWhip = castRootVeins;
function updateVeins(dt) {
  for (const v of G.veins) {
    v.t -= dt; v.tick -= dt; const m = v.ref;
    if (m.dead || m.engulfed) { v.t = 0; continue; }
    if (v.tick <= 0) { v.tick = 0.25; G.noProc = true; try { hurtMon(m, v.dps * 0.25, '#c24050'); } finally { G.noProc = false; } }
    m.root = Math.max(m.root || 0, Math.min(v.t, 0.1));
  }
  G.veins = G.veins.filter(v => v.t > 0);
  for (const g of G.vgrnd) {
    g.t -= dt;
    for (const m of G.zone.monsters) if (!m.dead && !g.hit.has(m) && Math.hypot(m.x - g.x, m.y - g.y) < 0.5 + m.r) { g.hit.add(m); m.root = Math.max(m.root || 0, m.rank === 'boss' ? 0.3 : 1); hurtMon(m, HS.whipDmg() * 0.3, '#c24050'); }
  }
  G.vgrnd = [];
}
function burstTarget(a) {
  let best = null, bd = 2.5, kind = null;
  for (const m of G.zone.monsters) { if (!m.dead || m.eaten || m.burst || G.time - (m.deadAt || 0) > CORPSE_LIFE || m.rank === 'boss') continue; const d = Math.hypot(m.x - a.x, m.y - a.y); if (d < bd) { bd = d; best = m; kind = 'corpse'; } }
  for (const s of G.sacs) { const d = Math.hypot(s.x - a.x, s.y - a.y); if (d < bd) { bd = d; best = s; kind = 'sac'; } }
  return best ? { ref: best, kind } : null;
}
function castCorpseBurst(a) {
  const t = burstTarget(a); if (!t) return;
  const o = t.ref, x = o.x, y = o.y;
  let mult = 1;
  if (t.kind === 'corpse') { o.burst = true; o.eaten = true; o.hatched = true; mult = 1 + Math.min(1, (o.max || 20) / 150); }
  else if (t.kind === 'sac') { o.done = true; G.sacs = G.sacs.filter(s => s !== o); mult = 1.2; }
  else { broodDies(o, true); mult = 0.7 + 0.5 * o.size; }
  corpseExplode(x, y, HS.burstDmg() * mult, 0);
}
function corpseExplode(x, y, dmg, depth) {
  bileBurst(x, y, dmg, 2); splatPool(x, y, 0.7, 10);
  if (aM('l_sympathy')) for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - x, m.y - y) < 2 + m.r) addBleed(m, dmg * 0.15, 4);
  G.shake = Math.max(G.shake, 2.5); sfx(70, 0.35, 'sawtooth', 0.06, -30);
  if (P.skills.bursttumor > 0 && depth === 0) G.tumors.push({ x0: x, y0: y, x1: x + rand(-2, 2), y1: y + rand(-2, 2), x, y, z: 8, t: 0, dur: 0.4 });
  if (P.skills.chainb > 0 && depth < 3) for (const m of G.zone.monsters) {
    if (!m.dead || m.burst || m.eaten || m.rank === 'boss' || G.time - (m.deadAt || 0) > CORPSE_LIFE || Math.hypot(m.x - x, m.y - y) > 2.2) continue;
    m.burst = true; m.eaten = true; m.hatched = true; setTimeout(() => corpseExplode(m.x, m.y, dmg * 0.75, depth + 1), 180);
  }
}
// The Leeches (passive): whenever he wounds an enemy a fat leech may drop out of his sleeve, crawl to the wound,
// drink until it is full, then crawl back and give him what it drank (life and Vitae).
function newLeech(m) {
  const ang = Math.random() * 6.28, hp = HS.leechHp();
  return { isLeech: true, x: P.x + Math.cos(ang) * 0.3, y: P.y + Math.sin(ang) * 0.3, r: 0.14, hp, max: hp, state: 'crawl', ref: m, px: m.x, py: m.y, store: 0, t: 0, latchT: 0, waitT: 3, ph: Math.random() * 6, face: 1, off: Math.random() * 6.28, hurt: 0 };
}
function leechProc(m, k) {
  if (!isBlood() || !(P.skills.spool > 0) || P.dead || !m || m.dead || m.engulfed) return;
  if (G.leeches.filter(l => !l.dead).length >= HS.leechN()) return;
  if ((P.leechCd || 0) > 0) return;
  if (dist(m, P) > 12 || Math.random() > HS.leechChance() * (k || 1)) return;
  P.leechCd = 0.2;
  G.leeches.push(newLeech(m));
  burst(P.x, P.y, '#5a1622', 4, 1.2); floatText(P.x, P.y - 0.3, 'a leech drops', '#8a5a66'); sfx(300, 0.08, 'sawtooth', 0.02, -150);
}
// the wounds he deals himself: any damage from the player's own hand (not a minion, not an affliction tick)
{ const _hmL = hurtMon; hurtMon = function (m, dmg, col) { const hp0 = m && m.hp; _hmL(m, dmg, col); if (!G.noProc && !G.hitSrc && m && !m.dead && m.hp < hp0) leechProc(m, 1); }; }
function castLeeches(a) { /* kept for old bindings: the leeches come on their own now */ }
function leechDies(l) {
  if (l.dead) return; l.dead = true;
  splatPool(l.x, l.y, 0.7 + Math.min(0.5, l.store / 40), 10); splashDrops(l.x, l.y, 12, 2, 4); burst(l.x, l.y, '#b8404a', 10, 1.6); sfx(200, 0.1, 'sawtooth', 0.03, -120);
}
function hurtLeech(l, dmg) { l.hp -= dmg; l.hurt = 0.1; if (l.hp <= 0) leechDies(l); }
function updateLeeches(dt) {
  for (const l of G.leeches) {
    if (l.dead) continue;
    l.t += dt; l.ph += dt * 10; l.hurt = Math.max(0, l.hurt - dt);
    const go = (tx, ty, s) => { const dx = tx - l.x, dy = ty - l.y, d = Math.hypot(dx, dy) || 1; if (Math.abs(dx - dy) > 0.05) l.face = dx - dy > 0 ? 1 : -1; moveCircle(l, dx / d * Math.min(d, s * dt), dy / d * Math.min(d, s * dt)); return d; };
    if (l.state === 'crawl') {
      if (!l.ref || l.ref.dead || l.ref.engulfed) { const o = G.zone.monsters.filter(m => !m.dead && dist(m, l) < 4).sort((p, q) => dist(p, l) - dist(q, l))[0]; if (o) l.ref = o; else { l.state = 'back'; continue; } }
      if (go(l.ref.x, l.ref.y, HS.leechSpd()) < l.ref.r + 0.12) { l.state = 'latch'; l.latchT = 0; floatText(l.x, l.y, 'latches', '#e89aa0'); }
    } else if (l.state === 'wait') {
      l.waitT -= dt; go(l.px, l.py, 5);
      const o = G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - l.x, m.y - l.y) < 3);
      if (o) { l.ref = o; l.state = 'crawl'; } else if (l.waitT <= 0) l.state = 'back';
    } else if (l.state === 'latch') {
      const m = l.ref;
      if (!m || m.dead || m.engulfed) { l.state = 'back'; continue; }
      l.latchT += dt; l.off += dt * 0.6;
      l.x = m.x + Math.cos(l.off) * m.r * 0.7; l.y = m.y + Math.sin(l.off) * m.r * 0.7;
      l.tick = (l.tick || 0) - dt;
      if (l.tick <= 0) { l.tick = 0.25; const hp0 = m.hp; G.noProc = true; try { hurtMon(m, HS.leechDps() * 0.25, '#c24050'); } finally { G.noProc = false; } l.store += Math.max(0, hp0 - Math.max(0, m.hp)); if (Math.random() < 0.3) parts.push({ x: l.x, y: l.y, z: 10, vx: 0, vy: 0, vz: 4, t: 0.3, col: '#b8404a' }); }
      // the host tries to swat it off
      if (m.rank !== 'boss' && Math.random() < 0.08 * dt) { floatText(l.x, l.y, 'swatted', '#a39d8c'); leechDies(l); continue; }
      if (l.latchT > 6 || l.store >= HS.leechFill()) l.state = 'back';
    } else if (l.state === 'back') {
      if (go(P.x, P.y, HS.leechSpd() + 1) < 0.45) {
        l.dead = true; l.home = true;
        const heal = l.store * 0.8 + 2, vit = l.store * 0.4 + 1;
        P.hp = Math.min(D.maxHp, P.hp + heal); P.mana = Math.min(D.maxMana, P.mana + vit);
        floatText(P.x, P.y, `+${Math.round(heal)}`, '#ff6070'); burst(P.x, P.y, '#b8404a', 6, 1.2);
      }
    }
  }
  G.leeches = G.leeches.filter(l => !l.dead);
}
function castDevour() {
  let best = null, bd = 3.2;
  for (const e of G.brood) { const d = dist(e, P) - e.size * 0.3; if (d < bd) { bd = d; best = e; } }
  for (const s of G.sacs) { const d = dist(s, P); if (d < bd) { bd = d; best = s; } }
  if (!best) { say('Nothing of yours near enough to eat', 1.2); return; }
  const size = best.isBrood ? (best.temp ? 0.4 : best.size) : 1.3;
  if (best.isBrood) broodDies(best, true); else G.sacs = G.sacs.filter(s => s !== best);
  if (devourArc(size)) { P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.15 * size); P.mana = Math.min(D.maxMana, P.mana + D.maxMana * 0.12 * size * (aM('f_quick') ? 1.5 : 1)); }
  P.devour = Math.min(HS.devourMax(), P.devour + 1); P.devourT = HS.devourLife();
  if (P.skills.feast > 0) { for (const e of G.brood) if (dist(e, P) < 5) e.hp = Math.min(e.max, e.hp + e.max * 0.3); if (G.fgolem && dist(G.fgolem, P) < 5) G.fgolem.hp = Math.min(G.fgolem.max, G.fgolem.hp + G.fgolem.max * 0.3); }
  burst(P.x, P.y, '#8e2630', 16, 2); floatText(P.x, P.y, `devoured · x${P.devour}`, '#e89aa0'); sfx(100, 0.3, 'sawtooth', 0.05, -50); sfx(60, 0.2, 'square', 0.04, 20);
  P.cast = aM('f_quick') ? 0 : 0.35; D = derive();
}

// ------------------------------------------------------------------- mutations
function nearBloodAt(o, R) {
  if (nearPool(o, R * 0.5, true)) return true;
  for (const m of G.zone.monsters) if (!m.dead && m.bleed && Math.abs(m.x - o.x) < R && Math.hypot(m.x - o.x, m.y - o.y) < R) return true;
  return false;
}
function updateMutations(dt) {
  const K = P.skills;
  if (!P.dead) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * vitaeHeal() * dt);
  // Vitae: refills on its own, three times as fast near blood
  P.nearBlood = !P.dead && nearBloodAt(P, 3);
  if (!P.dead) P.mana = Math.min(D.maxMana, P.mana + (HS.vitaeRegen() - D.manaRegen) * dt);
  // the life your skills cost, shown in lumps
  P.lifeAccT -= dt; if (P.lifeAccT <= 0) { P.lifeAccT = 0.5; if (P.lifeAcc >= 1) floatText(P.x, P.y, `-${Math.round(P.lifeAcc)} life`, '#c24050'); P.lifeAcc = 0; }
  if (P.vomiting > 0) P.vomiting -= dt;
  P.mawOpen = Math.max(engulfing(P) ? 0.45 : 0, (P.mawOpen || 0) - dt * 2);
  // Blood Frenzy on you
  if (P.weakT > 0) { P.weakT -= dt; if (P.weakT <= 0) P.weakK = 0; }
  if (P.bfrenzyT > 0) { P.bfrenzyT -= dt; if (!P.dead) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.015 * dt); if (P.bfrenzyT <= 0) D = derive(); }
  // Second Heart
  P.heartCd = Math.max(0, P.heartCd - dt);
  if (mutOn('heart')) {
    P.hp = Math.min(D.maxHp, P.hp + D.maxHp * HS.heartRegen() * dt);
    if (P.hp < D.maxHp * 0.25 && P.heartCd <= 0 && !P.dead) { P.heartCd = HS.heartCd(); P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.4); if (K.twinbeat > 0) { for (const e of G.brood) e.hp = e.max; if (G.fgolem) G.fgolem.hp = G.fgolem.max; } burst(P.x, P.y, '#c24050', 20, 2.5); banner('SECOND HEART', '#c24050', 1.4); sfx(60, 0.25, 'sine', 0.08); setTimeout(() => sfx(60, 0.25, 'sine', 0.08), 220); }
  }
  // blood pools underfoot
  const pool = inPoolAt(P, true) || (aM('f_gills') && mutOn('gills') ? nearPool(P, 1, true) : null); P.inPool = !!pool;
  if (pool && !P.dead) {
    const gills = mutOn('gills');
    P.hp = Math.min(D.maxHp, P.hp + D.maxHp * (gills ? 0.03 : pool.heal ? 0.03 : 0.01) * dt);
    P.mana = Math.min(D.maxMana, P.mana + (gills ? 2.5 * (K.gillsvit > 0 ? 2 : 1) : 0.8) * dt * (pool.trail ? 0.6 : 1));
    if (gills) { if (K.bbreath > 0) { pool.life = Math.min(pool.max + 4, pool.life + dt * 0.5); pool.r = Math.min(pool.big ? 2.6 : 1.4, pool.r + dt * 0.04); } }
  }
  updateTentacles(dt);
  for (const t of G.tents) t.t += dt; G.tents = G.tents.filter(t => t.t < t.dur);
  for (const b of G.tbinds) { b.t -= dt; const m = b.ref; if (m.dead || m.engulfed) { b.t = 0; continue; } m.root = Math.max(m.root || 0, Math.min(0.1, b.t)); b.tick = (b.tick || 0) - dt; if (b.tick <= 0) { b.tick = 0.5; G.noProc = true; try { hurtMon(m, b.dps * 0.5, '#c24050'); } finally { G.noProc = false; } } }
  G.tbinds = G.tbinds.filter(b => b.t > 0);
  // Tumor Hump
  P.bileT -= dt;
  if (mutOn('bilehump') && P.bileT <= 0 && !P.dead) {
    const any = G.zone.monsters.some(m => !m.dead && m.state !== 'idle' && dist(m, P) < 8);
    if (any) { P.bileT = HS.bileCd(); const n = K.twinbud > 0 ? 2 : 1; for (let i = 0; i < n; i++) G.biles.push({ orb: true, x: P.x - P.face * 0.2 + i * 0.2, y: P.y - 0.2, z: 16, vz: 3, t: 5, spd: 3.4, tgt: null }); sfx(200, 0.14, 'sine', 0.03, 120); }
    else P.bileT = 0.3;
  }
  // Devour stacks fade
  if (P.devour > 0) { P.devourT -= dt; if (P.devourT <= 0) { P.devour = 0; D = derive(); } }
}
// Tentacles: each one strikes once at an enemy in reach, tears off and constricts it, then slowly grows back
function updateTentacles(dt) {
  const on = mutOn('tentacles') && !P.dead, n = on ? HS.tentN() : 0;
  while (P.tentArms.length < n) P.tentArms.push({ state: 'ready', t: 0, ref: null, grow: 1, ph: Math.random() * 6.28, cd: Math.random() * 0.4 });
  if (P.tentArms.length > n) P.tentArms.length = n;
  const R = HS.tentR(), busy = new Set(P.tentArms.filter(a => a.ref).map(a => a.ref).concat(G.tbinds.map(b => b.ref)));
  for (const a of P.tentArms) {
    a.ph += dt * 3;
    if (a.state === 'regrow') { a.grow = Math.min(1, a.grow + dt / HS.tentCd()); if (a.grow >= 1) { a.state = 'ready'; a.cd = 0.2; } continue; }
    if (a.state === 'ready') {
      a.cd -= dt; if (a.cd > 0) continue;
      let best = null, bd = R;
      for (const m of G.zone.monsters) { if (m.dead || m.state === 'idle' || busy.has(m)) continue; const d = Math.hypot(m.x - P.x, m.y - P.y) - m.r; if (d < bd && lineClear(G.zone, P, m)) { bd = d; best = m; } }
      if (!best) { a.cd = 0.2; continue; }
      a.state = 'coil'; a.t = 0; a.ref = best; a.hit = false; busy.add(best); sfx(180 + Math.random() * 60, 0.12, 'sawtooth', 0.025, 80);
      continue;
    }
    // coil back (0.18 s), then lash out (0.14 s), bite, and tear off
    a.t += dt; const m = a.ref;
    if (!m || m.dead || m.engulfed) { a.state = 'ready'; a.ref = null; a.cd = 0.2; continue; }
    if (a.state === 'coil' && a.t >= 0.32) { a.state = 'lash'; a.t = 0; sfx(500 + Math.random() * 100, 0.08, 'sawtooth', 0.03, -350); }
    else if (a.state === 'lash' && a.t >= 0.2 && !a.hit) {
      a.hit = true; hurtMon(m, HS.tentDmg(), '#e89aa0'); P.lastHit = m;
      if (P.skills.tentrip > 0) addBleed(m, HS.tentDmg() * 0.3, 3);
      const bt = HS.tentBind() * (m.rank === 'boss' ? 0.3 : 1);
      G.tbinds.push({ ref: m, t: bt, max: bt, dps: HS.tentDmg() * 0.35, seed: Math.random() * 6 });
      splashDrops(m.x, m.y, 7, 1.4, 10); burst(m.x, m.y, '#b8404a', 5, 1.4); floatText(m.x, m.y, 'constricted', '#e89aa0');
      a.torn = { x0: P.x, y0: P.y, m, t: 0.35 };
      a.state = 'regrow'; a.grow = 0; a.ref = null;
    }
  }
}
function updateBiles(dt) {
  for (const b of G.biles) {
    b.t -= dt;
    if (!b.orb) continue;
    b.vz -= 16 * dt; b.z = Math.max(8, b.z + b.vz * dt * 4) + Math.sin(G.time * 5 + b.x) * 0.1;
    if (!b.tgt || b.tgt.dead || b.tgt.engulfed) { let best = null, bd = 8; for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - b.x, m.y - b.y); if (d < bd) { bd = d; best = m; } } b.tgt = best; }
    if (b.tgt) {
      const dx = b.tgt.x - b.x, dy = b.tgt.y - b.y, d = Math.hypot(dx, dy) || 1;
      moveCircle(b, dx / d * b.spd * dt, dy / d * b.spd * dt); b.face = dx - dy > 0 ? 1 : -1;
      if (d < b.tgt.r + 0.25) { b.t = 0; bileBurst(b.x, b.y, HS.bileDmg(), (P.skills.bloated > 0 ? 1.9 : 1.2) * (aM('f_rain') ? 1.5 : 1)); splatPool(b.x, b.y, 0.4, 6); }
    } else if (dist(b, P) > 1.5) { const dx = P.x - b.x, dy = P.y - b.y, d = Math.hypot(dx, dy) || 1; moveCircle(b, dx / d * b.spd * 0.6 * dt, dy / d * b.spd * 0.6 * dt); }
  }
  G.biles = G.biles.filter(b => b.t > 0);
  for (const w of G.vwhips) w.t += dt; G.vwhips = G.vwhips.filter(w => w.t < w.dur + 0.18);
  if (G.hemorFx) { G.hemorFx.t -= dt; if (G.hemorFx.t <= 0) G.hemorFx = null; }
}

// ------------------------------------------------------------------- hooks used by the shared code
function bloodAbsorb(d) {
  if (!isBlood()) return d;
  if (mutOn('chitin')) d *= 1 - HS.chitinDr();
  return pactAbsorb(d);
}
function bloodThorns(m, dmg) {
  if (!isBlood() || !m || m.dead) return;
  if (mutOn('chitin') && P.skills.barbed > 0) hurtMon(m, Math.max(2, (dmg || 5) * 0.25), '#e89aa0');
}
function bloodSwing(m, dmg) {
  if (!isBlood() || !m) return;
  if (P.moltT > 0 && !mutOn('maw')) addBleed(m, dmg * 0.6, 3);
  if (mutOn('maw')) {
    addBleed(m, dmg * 0.3 * (P.moltT > 0 ? 2.5 : 1), 3); P.hp = Math.min(D.maxHp, P.hp + dmg * HS.mawLeech());
    if (aM('f_gnash')) { const o = G.zone.monsters.find(q => !q.dead && q !== m && dist(q, m) < 1.3 && dist(q, P) < 2.2); if (o) { hurtMon(o, dmg * 0.6, '#e89aa0'); addBleed(o, dmg * 0.3, 3); } }
    // the belly maw may swallow it whole
    if (!m.dead && m.rank !== 'boss' && !engulfing(P) && Math.random() < HS.engulfPct()) { engulfMon(m, P); P.mawOpen = 1; }
  }
  for (const e of G.brood) if (e.rider && !m.dead) lingBite(e, m);
}
function onBloodKill(m) {
  if (!isBlood()) return;
  const bled = m.bleed;
  if (m.bleed && dist(m, P) < 8) P.mana = Math.min(D.maxMana, P.mana + D.maxMana * 0.02);
  // only the bleeding leave blood behind
  if (!m.engulfed && bled) addPool(m.x, m.y, 0.65, 10);
  if (m.boilT > 0) boilOver(m);
  if (m.bleed && P.skills.exsang > 0) { const v = m.bleed.dps * 6 * 0.6; setTimeout(() => { for (const o of G.zone.monsters) if (!o.dead && Math.hypot(o.x - m.x, o.y - m.y) < 1.8 + o.r) { hurtMon(o, v, '#c24050'); addBleed(o, v * 0.2, 3); } burst(m.x, m.y, '#c24050', 20, 3); }, 0); }
  m.infected = m.bleed ? 'bleed' : null;
  onBloodKillArc(m);
}
function bloodMonTarget(m, best, bd) {
  if (!isBlood()) return { best, bd };
  for (const e of G.brood) { if (e.hatch > 0 || e.rider) continue; const d = dist(m, e) + 0.6; if (d < bd) { bd = d; best = e; } }
  for (const th of G.thralls) { if (th.rise > 0) continue; const d = dist(m, th) + 0.2; if (d < bd) { bd = d; best = th; } }
  // the Flesh Golem draws enemies close to it onto itself
  if (G.fgolem) { const dd = dist(m, G.fgolem), d = dd - (dd < 3.2 ? 1.4 : 0.3); if (d < bd) { bd = d; best = G.fgolem; } }
  for (const s of G.skins) { const d = dist(m, s) - 2.5; if (d < bd) { bd = d; best = s; } }
  return { best, bd };
}
function bloodShotHit(s) {
  for (const e of G.brood) if (e.hatch <= 0 && !e.rider && Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.r) { hurtBrood(e, s.dmg, s.type); return true; }
  for (const th of G.thralls) if (Math.hypot(th.x - s.x, th.y - s.y) < th.r + s.r) { hurtThrall(th, s.dmg); return true; }
  for (const k of G.skins) if (Math.hypot(k.x - s.x, k.y - s.y) < k.r + s.r) { hurtSkin(k, s.dmg); return true; }
  for (const l of G.leeches) if (!l.dead && l.state !== 'latch' && Math.hypot(l.x - s.x, l.y - s.y) < l.r + s.r) { hurtLeech(l, s.dmg); return true; }
  const g = G.fgolem; if (g && Math.hypot(g.x - s.x, g.y - s.y) < g.r + s.r) { hurtFGolem(g, s.dmg, s.type); return true; }
  return false;
}
function bloodAoeHurt(x, y, R, dmg, type) {
  for (const e of G.brood.slice()) if (Math.hypot(e.x - x, e.y - y) < R) hurtBrood(e, dmg, type);
  for (const l of G.leeches) if (!l.dead && Math.hypot(l.x - x, l.y - y) < R) hurtLeech(l, dmg);
  if (G.fgolem && Math.hypot(G.fgolem.x - x, G.fgolem.y - y) < R + G.fgolem.r) hurtFGolem(G.fgolem, dmg, type);
}
function bloodZone(z) {
  for (const e of G.engulfs) { e.m.engulfed = false; if (e.zone) e.zone.monsters.push(e.m); }
  G.engulfs = [];
  for (const e of G.brood) { e.x = P.x + rand(-1, 1); e.y = P.y + rand(-1, 1); if (z.solidAt(e.x, e.y)) { e.x = P.x; e.y = P.y; } e.path = null; e.cling = null; e.rush = null; e.hold = P.hbeh.hold ? { x: e.x, y: e.y } : null; }
  G.brood = G.brood.filter(e => !e.temp);
  if (G.fgolem) { const g = G.fgolem; g.x = P.x + 1; g.y = P.y; if (z.solidAt(g.x, g.y)) { g.x = P.x; g.y = P.y; } g.path = null; g.order = null; g.eat = null; g.vomitT = 0; g.lunge = null; g.puke = null; }
  if (G.fheap) { G.fheap.x = P.x + 1; G.fheap.y = P.y; if (z.solidAt(G.fheap.x, G.fheap.y)) { G.fheap.x = P.x; G.fheap.y = P.y; } }
  for (const th of G.thralls) { th.x = P.x + rand(-1, 1); th.y = P.y + rand(-1, 1); if (z.solidAt(th.x, th.y)) { th.x = P.x; th.y = P.y; } th.path = null; th.eat = null; }
  G.sacs = []; G.pools = []; G.blances = []; G.vwhips = []; G.biles = []; G.tents = []; G.bcmd = null; G.tumors = []; G.leeches = []; G.veins = []; G.vgrnd = []; G.tbinds = []; G.nests = []; G.rveins = []; G.bwaves = []; G.skins = []; G.spits = [];
}
function resetBlood() {
  for (const e of G.engulfs || []) { e.m.engulfed = false; if (e.zone) e.zone.monsters.push(e.m); }
  G.nests = []; G.bwaves = []; G.skins = []; G.spits = []; G.pactT = 0; P.oozeHasteT = 0; P.moltT = 0;
  G.thralls = []; G.brood = []; G.sacs = []; G.pools = []; G.blances = []; G.vwhips = []; G.biles = []; G.fgolem = null; G.fheap = null; G.tents = []; G.bcmd = null; G.tumors = []; G.rveins = []; G.leeches = []; G.veins = []; G.vgrnd = []; G.tbinds = []; G.engulfs = [];
  P.devour = 0; P.devourT = 0; P.heartCd = 0; P.bfrenzyT = 0; P.tentArms = []; P.lifeAcc = 0;
}
function updateBlood(dt) {
  updateMutations(dt); updateAfflictions(dt); updateBrood(dt); updateFGolem(dt); updateFHeap(dt); updateLances(dt); updateBiles(dt);
  P.leechCd = Math.max(0, (P.leechCd || 0) - dt); updateTumors(dt); updateLeeches(dt); updateVeins(dt); updateRootVeins(dt); updateEngulfs(dt); updateBlood14(dt);
  if (P.cast <= 0 && P.roll <= 0 && !P.dead) for (const id of ['blance', 'vwhip']) if (heldSkill(id)) { bloodCast(id); break; }
}

// v0.24: with no corpse or tumor to split, holding Hatch Brood bleeds a brood out of your own body: every 0.7 s
// a swarmling tears free at your feet, paid for in life (never the last of it).
function updateHatchChannel(dt) {
  const held = isBlood() && P.skills.hatch > 0 && heldSkill('hatch') && P.roll <= 0 && !P.dead;
  if (!held) { P.hatchChan = false; P.hatchT = 0; return; }
  const a = aimPoint();
  if (fleshNear(a, HS.hatchR()).length) { P.hatchChan = false; return; }
  if (broodCount() >= HS.broodMax()) { if (!P.hatchChan) say(`Your brood is full (${HS.broodMax()})`, 1); P.hatchChan = true; return; }
  P.hatchChan = true; P.path = null; P.target = null; P.cast = Math.max(P.cast, 0.1);
  P.hatchT = (P.hatchT || 0) + dt;
  if (Math.random() < dt * 14) burst(P.x + rand(-0.5, 0.5), P.y + rand(-0.5, 0.5), '#8e2630', 1, 0.8);
  if (P.hatchT >= 0.7) {
    P.hatchT = 0;
    // v0.34: paid in Vitae first, like every other skill (the fuller the pool, the more of it Vitae covers), the rest in life
    const need = HS.hatchBleedVitae(); bloodPay(bloodLifeCost(need) * 1.4); P.mana = Math.max(0, P.mana - need); arcOnSpend('hatch', need);
    const ang = Math.random() * 6.28, x = P.x + Math.cos(ang) * 0.7, y = P.y + Math.sin(ang) * 0.7;
    if (hatchLing(x, y)) { splatPool(x, y, 0.3, 6); floatText(P.x, P.y, 'bled', '#e89aa0'); }
  }
}
{ const _ub = updateBlood; updateBlood = function (dt) { _ub(dt); try { updateHatchChannel(dt); } catch (e) { } }; }
