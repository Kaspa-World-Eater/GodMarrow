
// =================================================================== THE ASSASSIN (build step 4a, reworked in v0.13): the Unthawed
// A death-cult assassin from the Vharn taiga, fighting with claws. The Miasma cloud about them is armor, weapon and
// resource at once: it sickens what stands in it, blurs them (evasion) and pays for miasma skills.
// Distortion controls, lays miasma traps and sends out the Mirror-Sister; Death is martial: kicks, claws and finishers.
Object.assign(G, { clouds: [], mnovas: [], rtides: [], mtraps: [], mthrows: [], decoys: [], mirages: [], lures: [], mdash: null, rscythes: [], shuris: [], clawfx: [], sister: null, sisterCast: false });
Object.assign(P, { omens: 0, omenT: 0, venomT: 0, venomN: 0, blurEv: 0, breathCd: 0, unseenT: 0, hazeMantle: 0, auraT: 0, wornTraps: [], mstormT: 0, mstormTick: 0, inMiasma: false, gcount: 0, trailD: 0 });
function isMias() { return P.cls === 'miasmancer'; }
function clawOn() { const w = P.eq && P.eq.weapon; return !!(w && BASES[w.base] && BASES[w.base].claw); }

// ------------------------------------------------------------------- numbers
const MS = {
  sisterK: () => 0.35 + 0.015 * L1('sister'),
  power: () => D.dmgMult * (1 + 0.1 * P.skills.toxic) * (G.sisterCast ? MS.sisterK() : 1),
  frac: () => clamp(P.mana / Math.max(1, D.maxMana), 0, 1),
  auraR: () => (1.1 + 1.9 * MS.frac() + 0.03 * L1('mcloud')) * (aM('zm_thick') ? 1.2 : 1),
  auraDps: () => (2 + 1.2 * (L1('mcloud') - 1)) * MS.power() * (0.35 + 0.65 * MS.frac()),
  evade: () => Math.min(0.6, (0.06 + 0.012 * L1('mcloud')) * MS.frac() + (P.skills.shroud > 0 ? 0.1 : 0) + 0.01 * P.skills.unseen + (P.blurEv > 0 ? 0.3 : 0)),
  cloudLife: () => (1 + 0.05 * P.skills.toxic) * (aM('zm_seep') ? 1.5 : 1),
  ctrl: () => (1 + 0.04 * P.skills.unseen) * (P.skills.unseenlong > 0 ? 1.25 : 1),
  fangDmg: () => (5 + 2.5 * (L1('vblade') - 1)) * MS.power(),
  novaDmg: () => (8 + 4 * (L1('pnova') - 1)) * MS.power(),
  novaPsn: () => (4 + 2.2 * (L1('pnova') - 1)) * MS.power(),
  tideDmg: () => (10 + 5 * (L1('rotwall') - 1)) * MS.power(),
  contPsn: () => (3 + 1.5 * (L1('contagion') - 1)) * MS.power(),
  exhaleK: () => (0.9 + 0.05 * L1('exhale')) * MS.power(),
  bladePsn: () => ((D.wmin + D.wmax) / 2 * 0.5 + 2 + 1.2 * (L1('vblade') - 1)) * MS.power(),
  shuriDmg: () => (6 + 3 * (L1('shuriken') - 1)) * MS.power(),
  stormDmg: () => (5 + 2.4 * (L1('mstorm') - 1)) * MS.power(),
  stormR: () => 3.2 + (P.skills.stormwide > 0 ? 1 : 0),
  stormLife: () => 8 + 0.3 * L1('mstorm'),
  trapK: () => (1 + 0.08 * P.skills.unseen) * MS.power(),
  needleDmg: () => (4 + 2 * (L1('ntrap') - 1)) * MS.trapK(),
  wakeDmg: () => (5 + 2.5 * (L1('mwake') - 1)) * MS.trapK() * (aM('zd_snare') ? 1.25 : 1),
  wakeLife: () => 12 * (P.skills.wakelong > 0 ? 2 : 1) * (aM('zd_snare') ? 1.5 : 1),
  mineDmg: () => (18 + 8 * (L1('bmine') - 1)) * MS.trapK(),
  sentryDmg: () => (20 + 9 * (L1('ntrap') - 1)) * MS.trapK(),
  trapMax: () => 2 + (P.skills.unseen >= 1 ? 1 : 0) + (P.skills.unseen >= 5 ? 1 : 0) + (P.skills.unseen >= 10 ? 1 : 0) + (aU('z_trapq') ? 2 : 0) + (P.skills.trapmax2 > 0 ? 1 : 0),
  armT: () => aU('z_trapq') || P.skills.trapquick > 0 ? 0 : 0.8 / (1 + 0.05 * P.skills.unseen),
  weapon: () => (D.wmin + D.wmax) / 2 * D.meleeMult * (1 + 0.06 * P.skills.deathm) * (clawOn() ? 1.25 : 1) * (1 + 0.06 * P.omens) * (G.sisterCast ? MS.sisterK() : 1),
  crit: fin => (P.skills.dhead > 0 ? Math.min(0.4, 0.03 + 0.015 * P.skills.dhead) : 0) + (fin && aM('zx_crit') ? 0.1 : 0),
  omenMax: () => aR('z_death') ? 2 : 3 + (P.skills.omen4 > 0 ? 1 : 0),
  omenLife: () => aM('zx_omen') ? 24 : 14
};
function miasDerive(d) {
  if (!isMias()) return;
  d.wispCap = 0; d.wardPct = 0;
  d.maxMana = Math.round(30 + d.spi * 1.2 + P.level * 1.5 + (itemStatSum().mana || 0));
  d.manaRegen = 1.5 + d.spi * 0.03;
  d.meleeMult *= 1 + 0.06 * P.skills.deathm;
  // Omens quicken you; claws are the Unthawed weapon
  d.castSpd *= (1 + 0.05 * P.omens) * (clawOn() ? 1.15 : 1) * (P.skills.deathspd > 0 ? 1.1 : 1);
}
function miasReach() { return clawOn() ? 0.15 : 0; }
function miasInfo(id) {
  const r = Math.round, pc = v => Math.round(v * 100) + '%';
  switch (id) {
    case 'mcloud': return `Cloud ${MS.auraR().toFixed(1)} yd · sickens ${r(MS.auraDps())}/s · ${pc(MS.evade())} of blows miss (full cloud: more)`;
    case 'vblade': return `40 s · claws sicken ${r(MS.bladePsn())}/s for 4 s and slow`;
    case 'fang': return `${P.skills.fan5 > 0 ? 5 : 3} knives · ${r(MS.fangDmg())} each · miasma ${r(MS.fangDmg() * 0.5)}/s`;
    case 'pnova': return `${r(MS.novaDmg())} damage · sickens ${r(MS.novaPsn())}/s for 4 s · 5 yd`;
    case 'contagion': return `Leaps every 1.5 s · ${r(MS.contPsn())}/s miasma · 10 s`;
    case 'rotwall': return `${r(MS.tideDmg())} damage · miasma ${r(MS.tideDmg() * 0.4)}/s · ${(P.skills.wwide > 0 ? 3.6 : 2.4).toFixed(1)} yd wide`;
    case 'inhale': return `Miasma torn out strikes for ${Math.round((0.8 + 0.04 * L1('inhale')) * (P.skills.sickbreath > 0 ? 150 : 100))}% of what it had left · clouds within 8 yd refill Miasma`;
    case 'exhale': return `${r(MS.exhaleK() * Math.max(5, P.mana))} damage now (x${MS.exhaleK().toFixed(2)} per Miasma) · 3.5 yd`;
    case 'shuriken': return `${r(MS.shuriDmg())} per cut · spirals out to ~4.5 yd · trails miasma`;
    case 'mstorm': return `${r(MS.stormDmg())}/s in ${MS.stormR().toFixed(1)} yd · slows · ${MS.stormLife().toFixed(0)} s`;
    case 'toxic': return `+${10 * P.skills.toxic}% miasma · clouds +${5 * P.skills.toxic}% longer`;
    case 'blur': return `Step up to 6 yd · decoy ${3 + (aM('zd_blur') ? 2 : 0)} s`;
    case 'ntrap': return `${12 + (P.skills.needlemore > 0 ? 6 : 0)} needles · ${r(MS.needleDmg())} each · miasma`;
    case 'mwake': return `Smokes ${MS.wakeLife().toFixed(0)} s · waves ${r(MS.wakeDmg())} and sicken`;
    case 'haze': return `${(4 + (P.skills.hazelong > 0 ? 2 : 0)).toFixed(0)} s · 2.2 yd · confuses`;
    case 'mirage': return `${6 + (P.skills.miragelong > 0 ? 3 : 0)} s · 2.6 yd · half speed · missiles veer`;
    case 'bmine': return `Bursts for ${r(MS.mineDmg())} · cloud ${(P.skills.minebig > 0 ? 3.3 : 2.2).toFixed(1)} yd`;
    case 'dsentry': return `Needles ${r(MS.needleDmg())} · corpse bursts ${r(MS.sentryDmg())} · stands ${P.skills.sentrylong > 0 ? 24 : 12} s`;
    case 'lure': return `${3 + (P.skills.lurelong > 0 ? 2 : 0)} s · pulls within ${P.skills.lurewide > 0 ? 8 : 5} yd`;
    case 'warp': return `${pc(warpChance())} per tick per enemy in your miasma`;
    case 'sister': return `Acts every ${sisterCd().toFixed(1)} s · ${pc(MS.sisterK())} of your strength`;
    case 'unseen': return `+${4 * P.skills.unseen}% control time · +${P.skills.unseen}% evasion · ${MS.trapMax()} traps, +${8 * P.skills.unseen}% trap damage`;
    case 'rarc': return `${Math.round(MS.weapon() * (0.95 + 0.09 * L1('rarc')) * syn('rarc'))} to each in a half-circle · +10% per extra enemy`;
    case 'thrust': return `${Math.round(MS.weapon() * (1.25 + 0.11 * L1('thrust')) * syn('thrust'))} to each in a ${3 + (P.skills.thrustlong > 0 ? 1 : 0)} yd line`;
    case 'gstrike': return `${r(MS.weapon() * (1.4 + 0.12 * L1('gstrike')) * syn('gstrike'))} damage · +1 Omen · each Omen +6% damage, +5% speed`;
    case 'talon': return `${2 + 1 + (P.skills.talonkick > 0 ? 1 : 0) + (aM('zx_kiss') ? 1 : 0)} kicks · ${r(MS.weapon() * (0.55 + 0.06 * L1('talon')))} each · +1 Omen`;
    case 'dstep': return `${r(MS.weapon() * (0.9 + 0.08 * L1('dstep')))} to each · ${P.skills.steplong > 0 ? 8 : 5} yd`;
    case 'flurry': return `${4 + (P.skills.flurrymore > 0 ? 2 : 0)} strikes · ${r(MS.weapon() * (0.5 + 0.05 * L1('flurry')) * syn('flurry'))} each · hops between enemies in reach`;
    case 'reap': return `${r(MS.weapon() * (1.2 + 0.1 * L1('reap')))} · +70% and +0.3 yd per Omen`;
    case 'execute': return `${r(MS.weapon() * (1.6 + 0.12 * L1('execute')))} · +90% per Omen · kills below ${pc(P.skills.execthr > 0 ? 0.15 : 0.1)} +8% per Omen`;
    case 'dflight': return `${r(MS.weapon() * (1.5 + 0.12 * L1('dflight')))} · up to 9 yd · stuns 1 s`;
    case 'dhead': return `${pc(MS.crit())} critical chance`;
    case 'deathm': return `+${6 * P.skills.deathm}% melee · ${MS.omenMax()} Omens${clawOn() ? ' · claws: +25% strikes, +15% speed' : ' · wield claws for more'}`;
  }
  return '';
}
function breathCdLen() { return (aM('zx_breath') ? 40 : 60) - (P.skills.breathcd > 0 ? 15 : 0); }

// ------------------------------------------------------------------- the cloud and its tools
function addCloud(x, y, R, t, dps, kind) {
  if (G.zone.solidAt(x, y)) return null;
  const c = { x, y, R, t: t * MS.cloudLifeSafe(), max: t * MS.cloudLifeSafe(), dps, kind: kind || 'poison', tick: 0, seed: Math.random() * 99 };
  G.clouds.push(c); while (G.clouds.length > 70) G.clouds.shift(); return c;
}
MS.cloudLifeSafe = () => isMias() && D ? MS.cloudLife() : 1;
function nearMon(pt, R, filt) { let best = null, bd = R; for (const m of G.zone.monsters) { if (m.dead || (filt && !filt(m))) continue; const d = Math.hypot(m.x - pt.x, m.y - pt.y); if (d < bd) { bd = d; best = m; } } return best; }
function confuse(m, t) { if (m.dead || m.rank === 'boss') return; m.confused = Math.max(m.confused || 0, t * MS.ctrl()); if (m.state === 'idle') m.state = 'chase'; }
function fear(m, t) { if (m.dead || m.rank === 'boss') return; m.feared = Math.max(m.feared || 0, t); }
function knife(x, y, ang, dmg, pierce) { G.arcShots.push({ x, y, vx: Math.cos(ang) * 12, vy: Math.sin(ang) * 12, t: 0.55, dmg, hit: new Set(), col: '#d0a0f0', psn: dmg * 0.5, pierce: pierce || 1, knife: true }); }
function addOmen() {
  if (G.sisterCast) return;
  const mx = MS.omenMax(); if (P.omens < mx) { P.omens++; floatText(P.x, P.y - 0.3, `omen ${P.omens}`, '#e8e2d0'); sfx(220 + P.omens * 70, 0.12, 'triangle', 0.03, -40); burst(P.x, P.y, '#e8e2d0', 6, 1.4); D = derive(); }
  P.omenT = MS.omenLife();
}
function spendOmens() { const n = P.omens; P.omens = 0; if (n) D = derive(); return n; }
function critRoll(dmg, fin) { if (Math.random() < MS.crit(fin)) { floatText(P.x, P.y - 0.5, 'critical', '#ffffff'); if (P.skills.critomen > 0) addOmen(); return dmg * (P.skills.critdmg > 0 ? 3 : 2); } return dmg; }
// melee skills reach for the enemy nearest the cursor, lunging a step if it is a little out of reach
function meleeTarget(a, reach) {
  reach += miasReach();
  let best = null, bd = 1e9;
  for (const m of G.zone.monsters) { if (m.dead) continue; const dp = dist(m, P); if (dp > 3.6 + m.r) continue; const d = Math.hypot(m.x - a.x, m.y - a.y) + dp * 0.3; if (d < bd && lineClear(G.zone, P, m)) { bd = d; best = m; } }
  if (!best) return null;
  if (dist(best, P) > reach + best.r + 0.3) return null;
  faceTo(best.x, best.y);
  return best;
}
// The Grave upright: strikes root what they hit
function graveRoot(m) { if (aU('z_grave') && m && !m.dead) m.root = Math.max(m.root || 0, m.rank === 'boss' ? 0.3 : 1); }

// ------------------------------------------------------------------- casting
function miasCast(id, pt) {
  if (!isMias() || !SK[id] || SK[id].cls !== 'miasmancer' || !P.skills[id] || SK[id].kind === 'passive') return;
  if (P.roll > 0 || P.cast > 0) return;
  const a = G.sisterCast ? pt : losPoint(pt || aimPoint());
  const st = id === 'execute' && P.skills.execcheap > 0 ? 0 : SK[id].stam || 0; if (st && P.stam < st * 0.5) { say('Too weary', 0.8); return; }
  if (!miasApproach(id, a)) return;
  if (!spendMana(id)) return;
  if (st) useStam(st);
  faceTo(a.x, a.y); P.path = null;
  switch (id) {
    case 'vblade': P.venomT = 40; burst(P.x, P.y, '#b070e0', 12, 1.8); sfx(300, 0.3, 'sawtooth', 0.03, -120); say('Miasma coats your claws', 1); P.cast = 0.3; break;
    case 'fang': castFang(a); P.cast = 0.32 / D.castSpd; break;
    case 'pnova': castNova(a); P.cast = 0.45 / D.castSpd; break;
    case 'contagion': { const m = nearMon(a, 2.5); if (m) { m.contagion = 10; poisonMon(m, MS.contPsn(), 5); floatText(m.x, m.y, 'contagion', '#b070e0'); } else say('No enemy near the cursor', 1); P.cast = 0.35 / D.castSpd; break; }
    case 'rotwall': castTide(a); P.cast = 0.45 / D.castSpd; break;
    case 'exhale': castExhale(); P.cast = 0.5 / D.castSpd; break;
    case 'inhale': castInhale(); P.cast = 0.45 / D.castSpd; break;
    case 'shuriken': castShuriken(a); P.cast = 0.35 / D.castSpd; break;
    case 'mstorm': P.mstormT = MS.stormLife(); P.mstormTick = 0; banner('MIASMA VORTEX', '#b070e0', 1); sfx(80, 1.2, 'sawtooth', 0.04, 40); P.cast = 0.45 / D.castSpd; break;
    case 'blur': castBlur(a); P.cast = 0.2; break;
    case 'ntrap': case 'mwake': case 'bmine': throwTrap(id, a); P.cast = 0.35 / D.castSpd; break;
    case 'haze': if (aR('z_hanged')) { P.hazeMantle = 6 * MS.ctrl(); say('The haze wraps you', 1); } else { const p = clampCast(a, 9); addCloud(p.x, p.y, 2.2, 4 + (P.skills.hazelong > 0 ? 2 : 0), 0, 'haze'); } sfx(420, 0.5, 'sine', 0.03, -200); P.cast = 0.4 / D.castSpd; break;
    case 'mirage': { const p = clampCast(a, 9), t = 6 + (P.skills.miragelong > 0 ? 3 : 0); G.mirages.push({ x: p.x, y: p.y, R: 2.6, t, max: t }); sfx(600, 0.5, 'sine', 0.025, 300); P.cast = 0.4 / D.castSpd; break; }
    case 'lure': { const p = clampCast(a, 9); G.lures.push({ x: p.x, y: p.y, t: 3 + (P.skills.lurelong > 0 ? 2 : 0), R: P.skills.lurewide > 0 ? 8 : 5 }); sfx(880, 0.6, 'sine', 0.03, -100); P.cast = 0.35 / D.castSpd; break; }
    case 'gstrike': deathStrike(a); P.cast = 0.42 / D.castSpd; break;
    case 'talon': castTalon(a); P.cast = 0.5 / D.castSpd; break;
    case 'flurry': castFlurry14(a); P.cast = 0.45 / D.castSpd; break;
    case 'rarc': castRarc(a); P.cast = 0.4 / D.castSpd; break;
    case 'thrust': castThrust(a); P.cast = 0.4 / D.castSpd; break;
    case 'dstep': castDeathStep(a); break;
    case 'dflight': castFlight(a); P.cast = 0.4 / D.castSpd; break;
    case 'reap': if (aR('z_reaper')) throwScythe(a); else castReap(); P.cast = 0.5 / D.castSpd; break;
    case 'execute': castExecute(a); P.cast = 0.5 / D.castSpd; break;
  }
}
function castFang(a) {
  const n = P.skills.fan5 > 0 ? 5 : 3, base = Math.atan2(a.y - P.y, a.x - P.x), dmg = MS.fangDmg();
  for (let i = 0; i < n; i++) knife(P.x, P.y, base + (n > 1 ? (i / (n - 1) - 0.5) * (n > 3 ? 0.8 : 0.5) : 0), dmg, (P.skills.fpierce > 0 ? 2 : 1) + (aM('zm_fang') ? 1 : 0));
  sfx(900, 0.08, 'triangle', 0.025, -400);
}
function castNova(a) {
  const c = aR('z_bloom') ? clampCast(a, 8) : { x: P.x, y: P.y };
  const one = () => G.mnovas.push({ x: c.x, y: c.y, r: 0.3, max: 5, hit: new Set(), dmg: MS.novaDmg(), psn: MS.novaPsn() });
  one(); if (P.skills.twinnova > 0) { const d = MS.novaDmg(), ps = MS.novaPsn(); setTimeout(() => { if (G.running && isMias()) G.mnovas.push({ x: c.x, y: c.y, r: 0.3, max: 5, hit: new Set(), dmg: d, psn: ps }); }, 500); }
  sfx(160, 0.5, 'sawtooth', 0.04, -60);
}
function castTide(a) {
  const d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d, w = P.skills.wwide > 0 ? 3.6 : 2.4;
  if (aR('z_tide')) { G.rtides.push({ spin: true, cx: P.x, cy: P.y, follow: !G.sisterCast, ang: Math.atan2(dy, dx), t: 2, w: 1.7, hitT: new Map(), dmg: MS.tideDmg() * 0.6 }); sfx(260, 0.6, 'sawtooth', 0.035, -80); return; }
  const angs = aU('z_tide') ? [-0.45, 0, 0.45] : [0];
  for (const o of angs) { const c = Math.cos(o), s = Math.sin(o), ex = dx * c - dy * s, ey = dx * s + dy * c; G.rtides.push({ x: P.x + ex * 0.4, y: P.y + ey * 0.4, dx: ex, dy: ey, w: o ? w * 0.7 : w, t: 1.1, hit: new Set(), dmg: MS.tideDmg() * (o ? 0.7 : 1), trailT: 0, trail: P.skills.wtrail > 0 }); }
  sfx(200, 0.5, 'sawtooth', 0.04, -100);
}
function castExhale() {
  const spent = Math.max(5, P.mana), dmg = MS.exhaleK() * spent, R = 3.5;
  P.mana = spent * ((aM('zm_breath') ? 0.25 : 0) + (P.skills.exhalekeep > 0 ? 0.33 : 0));
  for (const m of G.zone.monsters) if (!m.dead && dist(m, P) < R + m.r) { hurtMon(m, dmg, '#b070e0'); poisonMon(m, dmg * 0.2, 4); if (P.skills.gasp > 0) confuse(m, 2); if (m.rank !== 'boss') { const d = dist(m, P) || 1; moveCircle(m, (m.x - P.x) / d * 0.8, (m.y - P.y) / d * 0.8); } }
  parts.push({ ring: true, x: P.x, y: P.y, r: 0.3, max: R, t: 0.45, col: '#b070e0' }); burst(P.x, P.y, '#b070e0', 40, 3.5); G.shake = Math.max(G.shake, 3);
  floatText(P.x, P.y, `exhale ${Math.round(spent)}`, '#b070e0'); sfx(90, 0.7, 'sawtooth', 0.06, -30);
}
// Inhale: pull the miasma back into you
function castInhale() {
  let gain = 0, n = 0;
  for (const c of G.clouds) { if (c.kind !== 'poison' || Math.hypot(c.x - P.x, c.y - P.y) > (aM('zm_breath') ? 16 : 8)) continue; gain += 3 + c.t * 1.5; for (let i = 0; i < 4; i++) flyMote(c.x + rand(-c.R, c.R) * 0.6, c.y + rand(-c.R, c.R) * 0.6, 6, P, '#b070e0'); c.t = 0; n++; }
  const k = (0.8 + 0.04 * L1('inhale')) * (P.skills.sickbreath > 0 ? 1.5 : 1);
  for (const m of G.zone.monsters) {
    if (m.dead || !m.poison || dist(m, P) > 6) continue;
    const left = m.poison.dps * Math.max(0, m.poison.t); m.poison = null;
    for (let i = 0; i < 3; i++) flyMote(m.x, m.y, 10, P, '#b070e0');
    hurtMon(m, left * k, '#b070e0'); gain += 2 + left * 0.05; n++;
    if (P.skills.deepdraw > 0 && m.rank !== 'boss' && !m.dead) { const d = dist(m, P) || 1; moveCircle(m, (P.x - m.x) / d * Math.min(d - 0.8, 1.5), (P.y - m.y) / d * Math.min(d - 0.8, 1.5)); }
  }
  P.mana = Math.min(D.maxMana, P.mana + gain);
  parts.push({ ring: true, x: P.x, y: P.y, r: 6, max: 0.3, t: 0.45, col: '#b070e0' });
  floatText(P.x, P.y, n ? `+${Math.round(gain)} Miasma` : 'nothing to draw in', '#b070e0'); sfx(120, 0.6, 'sine', 0.05, 200);
}
// Rot Shuriken: a spinning star that spirals outward from where you threw it, like a blessed hammer
function castShuriken(a) {
  const base = Math.atan2(a.y - P.y, a.x - P.x), dmg = MS.shuriDmg();
  const one = dir => G.shuris.push({ cx: P.x, cy: P.y, a0: base - dir * 0.6, dir, t: 0, life: 2.4, dmg, hitT: new Map(), x: P.x, y: P.y, spin: 0, trailT: 0.2 });
  one(1); if (P.skills.shuritwo > 0) one(-1);
  sfx(1100, 0.12, 'triangle', 0.025, -600);
}
function updateShuris(dt) {
  for (const s of G.shuris) {
    s.t += dt; s.spin += dt * 30;
    const ang = s.a0 + s.dir * 6.5 * s.t, r = 0.5 + 1.7 * s.t, ox = s.x, oy = s.y;
    s.x = s.cx + Math.cos(ang) * r; s.y = s.cy + Math.sin(ang) * r;
    if (G.zone.solidAt(s.x, s.y)) continue;
    s.trailT -= Math.hypot(s.x - ox, s.y - oy);
    if (s.trailT <= 0) { s.trailT = 0.55; const c = addCloud(s.x, s.y, 0.55, 2.2, s.dmg * 0.15, 'poison'); if (c) c.trail = true; }
    for (const m of G.zone.monsters) {
      if (m.dead || Math.abs(m.x - s.x) > 1.2 || Math.hypot(m.x - s.x, m.y - s.y) > 0.45 + m.r) continue;
      const last = s.hitT.get(m) || -9; if (G.time - last < 0.45) continue; s.hitT.set(m, G.time);
      hurtMon(m, s.dmg, '#d0a0f0'); poisonMon(m, s.dmg * 0.3, 3); burst(m.x, m.y, '#e8e2d0', 3, 1.2);
      if (P.skills.shurisplit > 0) { const o = nearMon(m, 5, q => q !== m); if (o) knife(m.x, m.y, Math.atan2(o.y - m.y, o.x - m.x), s.dmg * 0.5, 1); }
    }
  }
  G.shuris = G.shuris.filter(s => s.t < s.life);
}
// Miasma Hurricane: a storm of rot turning around you
function updateHurricane(dt) {
  if (!(P.mstormT > 0)) return;
  P.mstormT -= dt; P.mstormTick -= dt;
  const R = MS.stormR();
  if (Math.random() < 0.9) for (let i = 0; i < 2; i++) { const a = Math.random() * 6.28, rr = R * (0.3 + Math.random() * 0.7); parts.push({ x: P.x + Math.cos(a) * rr, y: P.y + Math.sin(a) * rr, z: 2 + Math.random() * 14, vx: -Math.sin(a) * 4, vy: Math.cos(a) * 4, vz: 3, t: 0.5, col: Math.random() < 0.5 ? '#8a4ab8' : '#b070e0' }); }
  if (P.mstormTick > 0) return; P.mstormTick = 0.35;
  for (const m of G.zone.monsters) {
    if (m.dead) continue; const d = dist(m, P); if (d > R + m.r) continue;
    hurtMon(m, MS.stormDmg() * 0.35, '#b070e0'); poisonMon(m, MS.stormDmg() * 0.25, 2); m.slow = Math.max(m.slow || 0, 0.35);
    if (m.rank !== 'boss' && d > 0.1) { const tx = -(m.y - P.y) / d, ty = (m.x - P.x) / d; moveCircle(m, tx * 0.3, ty * 0.3); if (P.skills.stormpull > 0 && d > 1) moveCircle(m, (P.x - m.x) / d * 0.3, (P.y - m.y) / d * 0.3); }
  }
}
function castBlur(a) {
  const p = clampCast(a, 6), ox = P.x, oy = P.y;
  if (aR('z_mirror')) {
    const m = nearMon(a, 3); if (m) { const d = dist(m, P) || 1; const k = Math.max(0, (d - m.r - 0.4) / d); moveCircle(P, (m.x - P.x) * k, (m.y - P.y) * k); hurtMon(m, critRoll(MS.weapon() * 1.5), '#e8e2d0'); P.lastHit = m; addOmen(); }
    else { P.x = p.x; P.y = p.y; }
  } else { P.x = p.x; P.y = p.y; }
  const life = 3 + (aM('zd_blur') ? 2 : 0), hp = D.maxHp * 0.3;
  G.decoys.push({ isDecoy: true, x: ox, y: oy, r: 0.28, t: life, hp, max: hp, face: P.face });
  if (aU('z_mirror')) G.decoys.push({ isDecoy: true, x: ox + 0.8, y: oy + 0.4, r: 0.28, t: life, hp, max: hp, face: -P.face });
  for (const m of G.zone.monsters) if (!m.dead && m.tgt === P && dist(m, P) < 12) m.tgt = null;
  if (P.skills.smear > 0) P.blurEv = 2;
  if (P.skills.unseenstep > 0) P.unseenT = Math.max(P.unseenT, 1);
  P.iframe = Math.max(P.iframe, 0.15); P.path = null;
  burst(ox, oy, '#a488c8', 14, 2); burst(P.x, P.y, '#a488c8', 10, 1.8); sfx(700, 0.2, 'sine', 0.03, -500);
}
function decoyDies(e) {
  const i = G.decoys.indexOf(e); if (i < 0) return; G.decoys.splice(i, 1);
  burst(e.x, e.y, '#a488c8', 12, 2);
  if (P.skills.rotdouble > 0) addCloud(e.x, e.y, 1.6, 4, MS.auraDps() * 1.5, 'poison');
}
function hurtDecoy(e, dmg) { e.hp -= dmg; if (e.hp <= 0) decoyDies(e); }
// traps: thrown, they arm, then they wait
function throwTrap(kind, a) {
  if (aR('z_trapq') && !G.sisterCast) { if (P.wornTraps.length >= MS.trapMax()) P.wornTraps.shift(); P.wornTraps.push(kind); floatText(P.x, P.y, 'trap worn', '#c9a66b'); sfx(500, 0.1, 'square', 0.02, 100); return; }
  const p = clampCast(a, 8);
  G.mthrows.push({ kind, x0: P.x, y0: P.y, x1: p.x, y1: p.y, t: 0, dur: 0.3, k: G.sisterCast ? MS.sisterK() : 1 });
  sfx(400, 0.12, 'triangle', 0.025, 200);
}
function placeTrap(kind, x, y, armed, k) {
  const mine = G.mtraps.filter(t => !t.done);
  while (mine.length >= MS.trapMax()) { const o = mine.shift(); o.done = true; burst(o.x, o.y, '#6f6a79', 6, 1); }
  const life = kind === 'mwake' ? MS.wakeLife() : 40;
  G.mtraps.push({ kind, x, y, arm: armed ? 0 : MS.armT(), charges: kind === 'ntrap' ? 12 + (P.skills.needlemore > 0 ? 6 : 0) : kind === 'dsentry' ? 999 : 1, cd: 0, t: life, max: life, k: k || 1, leakT: 0, waveT: 0.4, burstT: 1 });
}
function trapTrigger(t, m) {
  if (t.kind === 'bmine') {
    t.done = true; const R = P.skills.minebig > 0 ? 2.4 : 1.6;
    const boom = (k) => { for (const o of G.zone.monsters) if (!o.dead && Math.hypot(o.x - t.x, o.y - t.y) < R + o.r) { hurtMon(o, MS.mineDmg() * k * t.k, '#b070e0'); poisonMon(o, MS.mineDmg() * 0.15 * k * t.k, 4); if (P.skills.minefear > 0) fear(o, 1.5); } addCloud(t.x, t.y, R * 1.35, 6, MS.mineDmg() * 0.15 * t.k, 'poison'); burst(t.x, t.y, '#b070e0', 30, 3); G.shake = Math.max(G.shake, 2.5); sfx(80, 0.5, 'sawtooth', 0.06, -30); };
    boom(1); if (aM('zd_mine')) setTimeout(() => { if (G.running) boom(0.6); }, 700);
  }
}
function updateTraps(dt) {
  for (const th of G.mthrows) { th.t += dt; if (th.t >= th.dur && !th.done) { th.done = true; placeTrap(th.kind, th.x1, th.y1, false, th.k); } }
  G.mthrows = G.mthrows.filter(t => !t.done);
  for (const t of G.mtraps) {
    if (t.done) continue; t.t -= dt; if (t.t <= 0) { t.done = true; burst(t.x, t.y, '#6f6a79', 8, 1.2); continue; }
    if (t.arm > 0) { t.arm -= dt; continue; }
    if (t.kind === 'ntrap') {
      t.cd -= dt;
      if (t.cd <= 0) {
        const m = nearMon(t, 5.5, m => lineClear(G.zone, t, m));
        if (!m) t.cd = 0.2;
        else {
          t.cd = t.kind === 'dsentry' ? 0.9 : 0.7; const a = Math.atan2(m.y - t.y, m.x - t.x);
          for (let k = 0; k < (aM('zd_needle') ? 2 : 1); k++) knife(t.x, t.y, a + (k ? 0.12 : 0), MS.needleDmg() * t.k, (aM('zm_fang') ? 2 : 1) + (P.skills.needlepierce > 0 ? 1 : 0));
          if (--t.charges <= 0) t.done = true; sfx(1200, 0.04, 'square', 0.012, -300);
        }
      }
      // the Corpse Sentry bursts the dead near it into great clouds
      if (P.skills.sentryburst > 0) {
        t.burstT -= dt;
        if (t.burstT <= 0) {
          t.burstT = 2;
          const cs = G.zone.monsters.filter(c => c.dead && !c.burst && !c.eaten && !c.erased && G.time - (c.deadAt || 0) < CORPSE_LIFE && Math.hypot(c.x - t.x, c.y - t.y) < 5).slice(0, 1);
          for (const c of cs) { c.burst = true; c.eaten = true; c.hatched = true; for (const o of G.zone.monsters) if (!o.dead && Math.hypot(o.x - c.x, o.y - c.y) < 1.8 + o.r) { hurtMon(o, MS.sentryDmg() * 0.6 * t.k, '#b070e0'); poisonMon(o, MS.sentryDmg() * 0.12 * t.k, 4); } addCloud(c.x, c.y, 2.2, 6, MS.sentryDmg() * 0.12 * t.k, 'poison'); burst(c.x, c.y, '#8a4ab8', 26, 3); G.biles.push({ fx: true, x: t.x, y: t.y, tx: c.x, ty: c.y, t: 0.3 }); sfx(90, 0.4, 'sawtooth', 0.05, -30); }
        }
      }
    } else if (t.kind === 'mwake') {
      // it leaks miasma all the time, and breathes waves at anything that comes near
      t.leakT -= dt; if (t.leakT <= 0) { t.leakT = 0.7; const a = Math.random() * 6.28, r = Math.random() * 1.2; addCloud(t.x + Math.cos(a) * r, t.y + Math.sin(a) * r, 0.8, 3, MS.wakeDmg() * 0.12 * t.k, 'poison'); }
      t.waveT -= dt;
      if (t.waveT <= 0) {
        const m = nearMon(t, 5.5, m => lineClear(G.zone, t, m));
        if (!m) t.waveT = 0.3;
        else {
          t.waveT = 1.2; const d = Math.hypot(m.x - t.x, m.y - t.y) || 1, dx = (m.x - t.x) / d, dy = (m.y - t.y) / d;
          G.rtides.push({ x: t.x + dx * 0.3, y: t.y + dy * 0.3, dx, dy, w: P.skills.wakewide > 0 ? 2.4 : 1.6, t: P.skills.wakewide > 0 ? 1 : 0.75, hit: new Set(), dmg: MS.wakeDmg() * t.k, trailT: 0, trail: true, wake: true });
          sfx(170, 0.3, 'sawtooth', 0.025, -60);
        }
      }
    } else {
      const R = t.kind === 'bmine' ? 1.4 : 0.8;
      const m = nearMon(t, R + 0.4); if (m && Math.hypot(m.x - t.x, m.y - t.y) < R + m.r) trapTrigger(t, m);
    }
  }
  G.mtraps = G.mtraps.filter(t => !t.done);
}
// ------------------------------------------------------------------- death: martial strikes that build Omens, finishers that spend them
function deathStrike(a) {
  const m = meleeTarget(a, 1.1);
  if (!m) { sfx(320, 0.05, 'triangle', 0.02, -150); P.swing = 0.22; return; }
  const dmg = MS.weapon() * (1.4 + 0.12 * L1('gstrike')) * syn('gstrike');
  P.gcount = (P.gcount + 1) % 3;
  const hit = () => { if (m.dead) return; hurtMon(m, critRoll(dmg), '#e8e2d0'); clawFx(m); };
  hit(); if (P.skills.gravecombo > 0 && P.gcount === 0) setTimeout(() => { if (G.running) hit(); }, 130);
  P.lastHit = m; P.swing = 0.22; graveRoot(m); miasSisterHex(m);
  if (P.skills.soulrend > 0 && P.omens) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.02 * P.omens);
  addOmen(); burst(m.x, m.y, '#cfc6ae', 6, 1.6); sfx(180, 0.1, 'square', 0.04, -100);
}
// Carrion Talon: a spinning flurry of kicks
function castTalon(a) {
  const m = meleeTarget(a, 1.2);
  if (!m) { P.swing = 0.22; return; }
  const n = 3 + (P.skills.talonkick > 0 ? 1 : 0) + (aM('zx_kiss') ? 1 : 0), dmg = MS.weapon() * (0.55 + 0.06 * L1('talon')) * syn('talon'), sis = G.sisterCast;
  for (let i = 0; i < n; i++) setTimeout(() => {
    if (!G.running || m.dead) return;
    const last = i === n - 1;
    hurtMon(m, sis ? dmg : critRoll(dmg), '#e8e2d0'); poisonMon(m, MS.auraDps() * 0.5, 2); burst(m.x, m.y, '#e8e2d0', 4, 1.4); sfx(240 + i * 40, 0.06, 'square', 0.035, -120);
    if (last) { if (m.rank !== 'boss') { const d = dist(m, P) || 1; moveCircle(m, (m.x - P.x) / d * 1.1, (m.y - P.y) / d * 1.1); } if (P.skills.talonstun > 0 && m.rank !== 'boss') m.stun = Math.max(m.stun || 0, 1); G.shake = Math.max(G.shake, 2); }
  }, i * 90);
  P.lastHit = m; P.swing = 0.3; P.kickT = 0.45; graveRoot(m); miasSisterHex(m); addOmen();
}
// Black-Rag Flurry: raking claw slashes across everything in reach
function castFlurry(a) {
  const n = 5 + (P.skills.flurrymore > 0 ? 2 : 0), dmg = MS.weapon() * (0.45 + 0.05 * L1('flurry')), R = 1.7 + miasReach(), sis = G.sisterCast, sx = P.x, sy = P.y;
  const foes = G.zone.monsters.filter(m => !m.dead && Math.hypot(m.x - sx, m.y - sy) < R + m.r);
  if (!foes.length) { const m = meleeTarget(a, 1.2); if (m) foes.push(m); }
  if (!foes.length) { P.swing = 0.22; return; }
  for (let i = 0; i < n; i++) setTimeout(() => {
    if (!G.running) return;
    const live = foes.filter(m => !m.dead); if (!live.length) return;
    const m = live[i % live.length];
    hurtMon(m, sis ? dmg : critRoll(dmg), '#e8e2d0'); clawFx(m); if (P.venomT > 0) poisonMon(m, MS.bladePsn(), 4);
    if (P.skills.flurryomen > 0 && !sis && Math.random() < 0.4) addOmen();
    sfx(700 + Math.random() * 300, 0.05, 'sawtooth', 0.02, -500);
  }, i * 70);
  P.swing = 0.4; P.lastHit = foes[0];
}
// Death's Flight: vanish, reappear beside the prey and kick it flying
function castFlight(a, bounce) {
  let m = null, bd = 3;
  for (const o of G.zone.monsters) { if (o.dead || o === bounce) continue; const d = Math.hypot(o.x - a.x, o.y - a.y); if (d < bd && dist(o, P) < 9 && lineClear(G.zone, P, o)) { bd = d; m = o; } }
  if (!m) { if (!bounce) say('No enemy near the cursor', 0.8); return; }
  burst(P.x, P.y, '#a488c8', 12, 2);
  const d = dist(m, P) || 1, k = Math.max(0, (d - m.r - 0.45) / d); P.x += (m.x - P.x) * k; P.y += (m.y - P.y) * k;
  if (G.zone.solidAt(P.x, P.y)) { P.x = m.x; P.y = m.y; pushOut(P); }
  faceTo(m.x, m.y); P.iframe = Math.max(P.iframe, 0.25); P.kickT = 0.4;
  hurtMon(m, G.sisterCast ? MS.weapon() * (1.5 + 0.12 * L1('dflight')) : critRoll(MS.weapon() * (1.5 + 0.12 * L1('dflight'))), '#e8e2d0'); P.lastHit = m;
  if (m.rank !== 'boss') { m.stun = Math.max(m.stun || 0, 1); const dd = dist(m, P) || 1; moveCircle(m, (m.x - P.x) / dd * 1.3, (m.y - P.y) / dd * 1.3); } else m.stun = Math.max(m.stun || 0, 0.3);
  burst(m.x, m.y, '#e8e2d0', 14, 2.2); G.shake = Math.max(G.shake, 3); sfx(110, 0.25, 'square', 0.05, -60);
  addOmen(); if (P.skills.flightomen > 0) addOmen(); miasSisterHex(m);
  if (P.skills.flightchain > 0 && !bounce) setTimeout(() => { if (G.running && !P.dead) castFlight({ x: m.x, y: m.y }, m); }, 200);
}
function clawFx(m) { const a = Math.atan2(m.y - P.y, m.x - P.x); G.clawfx.push({ x: m.x, y: m.y, a: a + rand(-0.4, 0.4), t: 0.2 }); }
function castDeathStep(a) {
  const d = Math.hypot(a.x - P.x, a.y - P.y) || 1, L = Math.min(d, P.skills.steplong > 0 ? 8 : 5);
  G.mdash = { dx: (a.x - P.x) / d, dy: (a.y - P.y) / d, left: L, hit: new Set(), omen: false, trailT: 0 };
  P.cast = L / 14 + 0.12; P.iframe = Math.max(P.iframe, L / 14 + 0.1);
  sfx(500, 0.2, 'sawtooth', 0.03, -300);
}
function updateMDash(dt) {
  const s = G.mdash; if (!s) return;
  const step = Math.min(s.left, 14 * dt), ox = P.x, oy = P.y;
  moveCircle(P, s.dx * step, s.dy * step); s.left -= step;
  if (Math.hypot(P.x - ox, P.y - oy) < step * 0.3) s.left = 0;
  burst(P.x, P.y, '#6a5a7a', 1, 0.8);
  if (aM('zx_step')) { s.trailT -= step; if (s.trailT <= 0) { s.trailT = 1; addCloud(P.x, P.y, 0.8, 3, MS.auraDps(), 'poison'); } }
  for (const m of G.zone.monsters) {
    if (m.dead || s.hit.has(m) || dist(m, P) > m.r + P.r + 0.5) continue;
    s.hit.add(m); hurtMon(m, critRoll(MS.weapon() * (0.9 + 0.08 * L1('dstep')) * syn('dstep')), '#e8e2d0'); P.lastHit = m; burst(m.x, m.y, '#e8e2d0', 5, 1.6); clawFx(m);
    if (!s.omen || P.skills.stepomen > 0) { s.omen = true; addOmen(); }
  }
  if (s.left <= 0) { G.mdash = null; P.cast = Math.min(P.cast, 0.08); }
}
function finisherKill(m, n) {
  if (!m.dead) return;
  if (P.skills.knell > 0) { const R = 4; for (const o of G.zone.monsters) if (!o.dead && dist(o, P) < R) fear(o, 2 + (aM('zx_knell') ? 1 : 0)); parts.push({ ring: true, x: P.x, y: P.y, r: 0.3, max: R, t: 0.6, col: '#e8e2d0' }); sfx(98, 1.4, 'sine', 0.06, 0); }
  if (aM('z_widow')) { for (const o of G.zone.monsters) if (!o.dead && Math.hypot(o.x - m.x, o.y - m.y) < 2.5 + o.r) o.root = Math.max(o.root || 0, o.rank === 'boss' ? 0.4 : 1.5); parts.push({ ring: true, x: m.x, y: m.y, r: 2.5, max: 0.3, t: 0.4, col: '#8a4ab8' }); addCloud(m.x, m.y, 1.8, 3, MS.auraDps(), 'poison'); }
  if (aU('z_reaper')) G.reapKept = n;
}
function castReap() {
  const n = spendOmens(), R = (1.6 + 0.3 * n) * (P.skills.reapwide > 0 ? 1.3 : 1) + miasReach(), dmg = MS.weapon() * (1.2 + 0.1 * L1('reap')) * syn('reap') * (1 + 0.7 * n) * (aR('z_death') ? 2 : 1);
  G.reapKept = 0; const hits = [];
  for (const m of G.zone.monsters) if (!m.dead && dist(m, P) < R + m.r) { hurtMon(m, critRoll(dmg, true), '#e8e2d0'); P.lastHit = m; hits.push(m); graveRoot(m); if (n >= 3 && m.rank !== 'boss') { const d = dist(m, P) || 1; moveCircle(m, (m.x - P.x) / d * 1.1, (m.y - P.y) / d * 1.1); } }
  for (const m of hits) finisherKill(m, n);
  if (P.skills.reapmend > 0 && n) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.03 * n);
  if (G.reapKept) { P.omens = Math.min(MS.omenMax(), G.reapKept); P.omenT = MS.omenLife(); D = derive(); }
  G.reapFx = { R, t: 0.3, x: P.x, y: P.y }; parts.push({ ring: true, x: P.x, y: P.y, r: 0.3, max: R, t: 0.3, col: '#e8e2d0' });
  if (n) floatText(P.x, P.y, `reap x${n}`, '#e8e2d0'); sfx(140, 0.3, 'sawtooth', 0.05, -80); G.shake = Math.max(G.shake, 1 + n);
}
function throwScythe(a) {
  const n = spendOmens(), d = Math.hypot(a.x - P.x, a.y - P.y) || 1;
  G.rscythes.push({ x: P.x, y: P.y, dx: (a.x - P.x) / d, dy: (a.y - P.y) / d, out: Math.min(6, d + 1), dist: 0, back: false, hit: new Set(), dmg: MS.weapon() * (1.2 + 0.1 * L1('reap')) * (1 + 0.7 * n) * (aR('z_death') ? 2 : 1), n, spin: 0 });
  sfx(300, 0.3, 'triangle', 0.04, 100);
}
function updateScythes(dt) {
  for (const s of G.rscythes) {
    s.spin += dt * 20;
    if (!s.back) { const st = 11 * dt; s.x += s.dx * st; s.y += s.dy * st; s.dist += st; if (s.dist >= s.out || G.zone.solidAt(s.x, s.y)) { s.back = true; s.hit.clear(); } }
    else { const d = dist(s, P); if (d < 0.5) { s.done = true; continue; } const st = Math.min(d, 13 * dt); s.x += (P.x - s.x) / d * st; s.y += (P.y - s.y) / d * st; }
    for (const m of G.zone.monsters) if (!m.dead && !s.hit.has(m) && Math.hypot(m.x - s.x, m.y - s.y) < 0.7 + m.r) { s.hit.add(m); hurtMon(m, critRoll(s.dmg, true), '#e8e2d0'); finisherKill(m, s.n); }
  }
  G.rscythes = G.rscythes.filter(s => !s.done);
}
function castExecute(a) {
  const m = meleeTarget(a, 1.2);
  if (!m) { say('Nothing in reach to execute', 0.8); return; }
  const n = spendOmens(), thr = (P.skills.execthr > 0 ? 0.15 : 0.1) + 0.08 * n, frac = m.hp / m.max;
  let dmg = MS.weapon() * (1.6 + 0.12 * L1('execute')) * syn('execute') * (1 + 0.9 * n) * (aR('z_death') ? 2 : 1);
  if (frac < thr) { if (m.rank === 'boss') dmg *= 3; else { dmg = m.hp + 9999; floatText(m.x, m.y, 'EXECUTED', '#ffffff'); } }
  hurtMon(m, critRoll(dmg, true), '#ffffff'); P.lastHit = m; P.swing = 0.25; clawFx(m);
  burst(m.x, m.y, '#e8e2d0', 16, 2.4); G.shake = Math.max(G.shake, 2 + n); sfx(80, 0.4, 'sawtooth', 0.06, -30);
  G.reapKept = 0; finisherKill(m, n); if (G.reapKept) { P.omens = Math.min(MS.omenMax(), G.reapKept); P.omenT = MS.omenLife(); D = derive(); }
}

// ------------------------------------------------------------------- Warped Miasma: distortion that procs in every cloud
function warpChance() { return P.skills.warp > 0 ? (0.04 + 0.004 * L1('warp')) * (P.skills.warpmore > 0 ? 2 : 1) : 0; }
function warpProc(m, cx, cy) {
  if (!isMias() || m.dead || m.rank === 'boss' || Math.random() >= warpChance()) return;
  const opts = ['confuse', 'slow', 'twist'].concat(P.skills.warpfear > 0 ? ['fear'] : []), k = pick(opts);
  if (k === 'confuse') confuse(m, 1.2);
  else if (k === 'slow') m.slow = Math.max(m.slow || 0, 0.8);
  else if (k === 'fear') fear(m, 1.2);
  else { const d = Math.hypot(cx - m.x, cy - m.y) || 1; moveCircle(m, (cx - m.x) / d * Math.min(d, 0.9), (cy - m.y) / d * Math.min(d, 0.9)); }
  burst(m.x, m.y, '#a8c0e0', 5, 1.4); floatText(m.x, m.y, k === 'twist' ? 'twisted' : k === 'slow' ? 'warped' : k === 'fear' ? 'terror' : 'lost', '#a8c0e0');
}

// ------------------------------------------------------------------- the Mirror-Sister: a distorted reflection that fights with your skills
const SISTER_SKILLS = ['pnova', 'contagion', 'rotwall', 'shuriken', 'haze', 'mirage', 'lure', 'gstrike', 'talon', 'flurry', 'rarc', 'thrust', 'reap', 'execute', 'ntrap', 'bmine', 'mwake'];
const SISTER_MELEE = ['gstrike', 'talon', 'flurry', 'rarc', 'thrust', 'reap', 'execute'];
function sisterCd() { return Math.max(1.2, 3.2 - 0.05 * L1('sister')) / (P.skills.sisterfast > 0 ? 2 : 1); }
function miasSisterHex(m) { if (G.sisterCast && P.skills.sisterhex > 0 && m && !m.dead) confuse(m, 1); }
function updateSister(dt) {
  if (!isMias() || !(P.skills.sister > 0) || P.dead) { G.sister = null; return; }
  if (!G.sister) { G.sister = { x: P.x - P.face * 1.2, y: P.y + 0.4, face: -P.face, cd: 1.5, t: 0, blink: 0.4 }; burst(G.sister.x, G.sister.y, '#a8c0e0', 18, 2); }
  const s = G.sister; s.t += dt; s.cd -= dt; s.blink = Math.max(0, s.blink - dt);
  if (dist(s, P) > 14) { s.x = P.x - P.face; s.y = P.y; s.blink = 0.4; }
  // she walks as your mirror: across from you, facing the other way
  const foe = nearMon(s, 9, m => lineClear(G.zone, s, m));
  const gx = P.x - Math.cos(G.time * 0.4) * 1.4, gy = P.y - Math.sin(G.time * 0.4) * 1.4;
  if (!foe) { const d = Math.hypot(gx - s.x, gy - s.y); if (d > 0.3) moveCircle(s, (gx - s.x) / d * Math.min(d, 4 * dt), (gy - s.y) / d * Math.min(d, 4 * dt)); s.face = -P.face; }
  else if (Math.abs((foe.x - foe.y) - (s.x - s.y)) > 0.05) s.face = (foe.x - foe.y) > (s.x - s.y) ? 1 : -1;
  // she walks to her prey for melee, like you do
  if (s.go) { const g = s.go; if (g.foe.dead) s.go = null; else { const d = dist(g.foe, s); if (d > g.foe.r + 0.9) { const st = Math.min(d, 6 * dt); moveCircle(s, (g.foe.x - s.x) / d * st, (g.foe.y - s.y) / d * st); s.face = (g.foe.x - g.foe.y) > (s.x - s.y) ? 1 : -1; if ((g.t -= dt) <= 0) s.go = null; return; } s.go = null; sisterCast(g.id, { x: g.foe.x, y: g.foe.y }, g.foe); return; } }
  if (s.cd > 0 || !foe) return;
  const list = SISTER_SKILLS.filter(id => P.skills[id] > 0 && !(['ntrap', 'bmine', 'mwake'].includes(id) && G.mtraps.length >= MS.trapMax()));
  if (!list.length) { s.cd = 1; return; }
  const id = pick(list);
  s.cd = sisterCd();
  // melee skills: she blinks in beside her prey
  if (SISTER_MELEE.includes(id) && dist(foe, s) > foe.r + 0.9) { s.go = { id, foe, t: 3 }; return; }
  sisterCast(id, { x: foe.x, y: foe.y }, foe);
}
function sisterCast(id, pt, foe) {
  const s = G.sister, keep = { x: P.x, y: P.y, face: P.face, mana: P.mana, stam: P.stam, omens: P.omens, omenT: P.omenT, cast: P.cast, roll: P.roll, swing: P.swing, iframe: P.iframe, path: P.path, lastHit: P.lastHit, venomT: P.venomT, kickT: P.kickT };
  P.x = s.x; P.y = s.y; P.face = s.face; P.mana = 9999; P.stam = 9999; P.omens = 0; P.cast = 0; P.roll = 0;
  G.sisterCast = true;
  try { miasCast(id, pt); }
  catch (e) { reportError(e); }
  finally {
    G.sisterCast = false;
    s.x = P.x; s.y = P.y; s.face = P.face; s.act = 0.3; s.actId = id;
    Object.assign(P, keep);
  }
  if (P.skills.sisterhex > 0 && foe && !foe.dead) confuse(foe, 1);
  burst(s.x, s.y, '#a8c0e0', 6, 1.2);
}

// ------------------------------------------------------------------- hooks used by the shared code
function miasEvade() {
  if (!isMias() || P.dead) return false;
  if (P.unseenT > 0) return true;
  if (Math.random() < MS.evade()) { floatText(P.x, P.y, 'miss', '#a488c8'); burst(P.x, P.y, '#a488c8', 3, 1); return true; }
  return false;
}
function miasLastBreath() {
  if (!isMias() || P.skills.lbreath <= 0 || P.breathCd > 0) return false;
  P.breathCd = breathCdLen(); P.hp = P.skills.breathheal > 0 ? D.maxHp * 0.3 : 1; P.iframe = 2; P.unseenT = 2;
  for (const m of G.zone.monsters) if (!m.dead && m.tgt === P) { m.state = 'idle'; m.path = null; }
  banner('LAST BREATH', '#e8e2d0', 1.4); burst(P.x, P.y, '#e8e2d0', 20, 2); sfx(60, 0.8, 'sine', 0.06, 0);
  return true;
}
function miasOnHit() {
  if (!isMias() || !P.wornTraps.length) return;
  const k = P.wornTraps.shift(); placeTrap(k, P.x, P.y, true);
  const t = G.mtraps[G.mtraps.length - 1];
  if (k === 'bmine') { const m = nearMon(P, 2.5); trapTrigger(t, m); }
}
function miasSwing(m) {
  if (!isMias() || !m) return;
  if (P.skills.dhead > 0 && Math.random() < MS.crit()) { hurtMon(m, (D.wmin + D.wmax) / 2 * D.meleeMult * (P.skills.critdmg > 0 ? 2 : 1), '#ffffff'); floatText(P.x, P.y - 0.5, 'critical', '#ffffff'); if (P.skills.critomen > 0) addOmen(); }
  clawFx(m);
  if (P.venomT > 0 && !m.dead) {
    const stk = aU('z_venom') ? 5 : P.skills.vdeep > 0 ? 3 : 1; poisonMon(m, MS.bladePsn(), 4, stk); m.slow = Math.max(m.slow || 0, aU('z_venom') ? 0.25 + 0.08 * (m.poison ? m.poison.n : 1) : 0.3);
    P.venomN++; if (P.skills.vflick > 0 && P.venomN % 3 === 0) { const o = nearMon(m, 5, q => q !== m) || m; knife(P.x, P.y, Math.atan2(o.y - P.y, o.x - P.x), MS.fangDmg() * 0.8, 1); }
    if (P.skills.vclaw > 0) { const o = nearMon(m, 1.4, q => q !== m && dist(q, P) < 2.2); if (o) { hurtMon(o, (D.wmin + D.wmax) / 2 * D.meleeMult * 0.6, '#e8e2d0'); poisonMon(o, MS.bladePsn(), 4); clawFx(o); } }
  }
}
// The Serpent reversed: your claws throw instead of cutting
function miasThrows() { return isMias() && aR('z_venom') && P.venomT > 0; }
function miasThrowSwing(m) { const b = Math.atan2(m.y - P.y, m.x - P.x); for (const o of [-0.18, 0, 0.18]) knife(P.x, P.y, b + o, (D.wmin + D.wmax) / 2 * D.meleeMult * 0.6, 1); P.cast = 0.45 / D.castSpd; P.swing = 0.2; faceTo(m.x, m.y); sfx(900, 0.06, 'triangle', 0.02, -400); }
function miasMonTarget(m, best, bd) {
  if (!isMias()) return { best, bd };
  if (P.unseenT > 0 && best === P) { best = null; bd = 1e9; }
  for (const e of G.decoys) { const d = dist(m, e) - 2.5; if (d < bd) { bd = d; best = e; } }
  return { best, bd };
}
function miasShotHit(s) {
  if (s.friendly) { const m = G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - s.x, m.y - s.y) < m.r + s.r); if (m) { hurtMon(m, s.dmg * 1.5, '#a8c0e0'); return true; } return false; }
  for (const e of G.decoys) if (Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.r) { hurtDecoy(e, s.dmg); return true; }
  for (const f of G.mirages) if (!s.veered && Math.hypot(f.x - s.x, f.y - s.y) < f.R) {
    s.veered = true;
    if (P.skills.miragewarp > 0) { s.vx = -s.vx; s.vy = -s.vy; s.friendly = true; }
    else { const a = (Math.random() < 0.5 ? 1 : -1) * rand(0.7, 1.4), c = Math.cos(a), n = Math.sin(a); const vx = s.vx * c - s.vy * n, vy = s.vx * n + s.vy * c; s.vx = vx; s.vy = vy; }
  }
  return false;
}
function onMiasKill(m) {
  if (!isMias()) return;
  if (m.contagion > 0) addCloud(m.x, m.y, 2.2, 6, MS.contPsn() * 1.2, 'poison');
  if (aU('z_death')) addOmen();
}
function miasZone() { G.clouds = []; G.mnovas = []; G.rtides = []; G.mtraps = []; G.mthrows = []; G.decoys = []; G.mirages = []; G.lures = []; G.mdash = null; G.rscythes = []; G.shuris = []; G.clawfx = []; if (G.sister) { G.sister.x = P.x - 1; G.sister.y = P.y; } }
function resetMias() { miasZone(); G.sister = null; P.omens = 0; P.venomT = 0; P.blurEv = 0; P.unseenT = 0; P.hazeMantle = 0; P.wornTraps = []; P.mstormT = 0; }

// ------------------------------------------------------------------- per frame
function updateMias(dt) {
  const frac = MS.frac();
  // the cloud: sicken everything inside, thicken faster near the sickened
  P.auraT -= dt;
  const R = MS.auraR();
  let fed = 0;
  if (P.auraT <= 0 && !P.dead) {
    P.auraT = 0.5;
    for (const m of G.zone.monsters) {
      if (m.dead || Math.abs(m.x - P.x) > R + 1 || dist(m, P) > R + m.r) continue; fed++;
      if (aR('z_grave')) { m.slow = Math.max(m.slow || 0, 0.4); m.graveT = 0.7; }
      else if (aR('z_plague')) { P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.005); }
      else poisonMon(m, MS.auraDps(), 2);
      if (aM('z_veiled') && Math.random() < 0.15) confuse(m, 1);
      warpProc(m, P.x, P.y);
    }
    P.fedAura = fed;
  }
  if (!P.dead && P.fedAura && P.skills.thickair > 0) P.mana = Math.min(D.maxMana, P.mana + D.manaRegen * dt);
  // the sickened leak miasma behind them; standing in miasma thickens yours
  for (const m of G.zone.monsters) {
    if (m.dead || !m.poison) continue;
    m.dripT = (m.dripT || 0) - dt;
    if (m.dripT <= 0) { m.dripT = P.skills.toxdrip > 0 ? 1 : 2; const c = addCloud(m.x + rand(-0.2, 0.2), m.y + rand(-0.2, 0.2), 0.55, 2.5, 0, 'poison'); if (c) c.drip = true; }
  }
  P.inMiasma = !P.dead && G.clouds.some(c => c.kind === 'poison' && Math.abs(c.x - P.x) < c.R + 0.5 && Math.hypot(c.x - P.x, c.y - P.y) < c.R + 0.3);
  if (P.inMiasma) P.mana = Math.min(D.maxMana, P.mana + D.manaRegen * 1.5 * (P.skills.toxfeed > 0 ? 2 : 1) * dt);
  // The Plague upright: a trail of miasma where you walk
  if (aU('z_plague') && !P.dead) { P.trailD += Math.hypot(P.x - (P.lastX || P.x), P.y - (P.lastY || P.y)); if (P.trailD > 1.2) { P.trailD = 0; addCloud(P.x, P.y, 0.8, 3, MS.auraDps() * 0.6, 'poison'); } }
  P.lastX = P.x; P.lastY = P.y;
  if (Math.random() < 0.3 + frac * 0.5) parts.push({ x: P.x + rand(-R, R) * 0.7, y: P.y + rand(-R, R) * 0.7, z: rand(2, 10), vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: 2, t: 0.7, col: aR('z_grave') ? '#8f8a7c' : '#8a4ab8' });
  // timers
  if (P.venomT > 0) P.venomT -= dt;
  if (P.blurEv > 0) P.blurEv -= dt;
  if (P.breathCd > 0) P.breathCd -= dt;
  if (P.unseenT > 0) P.unseenT -= dt;
  if (P.kickT > 0) P.kickT -= dt;
  if (P.omens > 0 && !aR('z_death')) { P.omenT -= dt; if (P.omenT <= 0) { P.omens = 0; D = derive(); floatText(P.x, P.y, 'omens fade', '#6f6a79'); } }
  if (P.hazeMantle > 0) { P.hazeMantle -= dt; for (const m of G.zone.monsters) if (!m.dead && dist(m, P) < 1.9 + m.r) confuse(m, 2); }
  for (const m of G.zone.monsters) if (m.graveT > 0) m.graveT -= dt;
  updateMDash(dt); updateTraps(dt); updateScythes(dt); updateShuris(dt); updateHurricane(dt); updateSister(dt);
  for (const f of G.clawfx) f.t -= dt; G.clawfx = G.clawfx.filter(f => f.t > 0);
  // miasma novas
  for (const n of G.mnovas) {
    n.r += 8 * dt;
    for (const m of G.zone.monsters) if (!m.dead && !n.hit.has(m) && Math.abs(Math.hypot(m.x - n.x, m.y - n.y) - n.r) < 0.5 + m.r) { n.hit.add(m); hurtMon(m, n.dmg, '#b070e0'); poisonMon(m, n.psn, 4); if (m.rank !== 'boss') { const d = Math.hypot(m.x - n.x, m.y - n.y) || 1; moveCircle(m, (m.x - n.x) / d * 0.9, (m.y - n.y) / d * 0.9); } }
    if (n.r >= n.max) { n.done = true; if (P.skills.novacloud > 0 || aU('z_bloom')) for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; addCloud(n.x + Math.cos(a) * 4.2, n.y + Math.sin(a) * 4.2, 1, aU('z_bloom') ? 8 : 5, n.psn * 0.5, 'poison'); } }
  }
  G.mnovas = G.mnovas.filter(n => !n.done);
  // rot tides and wake waves
  for (const w of G.rtides) {
    w.t -= dt;
    if (w.spin) {
      if (w.follow) { w.cx = P.x; w.cy = P.y; }
      w.ang += dt * 7; const ex = w.cx + Math.cos(w.ang) * w.w, ey = w.cy + Math.sin(w.ang) * w.w; w.x = ex; w.y = ey;
      for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - w.cx, m.y - w.cy); if (d > w.w + 0.6 + m.r || d < w.w - 0.7) continue; const last = w.hitT.get(m) || -9; if (G.time - last < 0.4) continue; w.hitT.set(m, G.time); hurtMon(m, w.dmg, '#b070e0'); poisonMon(m, w.dmg * 0.3, 3); }
      continue;
    }
    const st = (w.wake ? 6 : 7) * dt; w.x += w.dx * st; w.y += w.dy * st;
    if (G.zone.solidAt(w.x, w.y)) { w.t = 0; continue; }
    for (const m of G.zone.monsters) {
      if (m.dead || w.hit.has(m)) continue; const ox = m.x - w.x, oy = m.y - w.y, along = ox * w.dx + oy * w.dy, side = Math.abs(ox * w.dy - oy * w.dx);
      if (Math.abs(along) > 0.5 + m.r || side > w.w / 2 + m.r) continue;
      w.hit.add(m); hurtMon(m, w.dmg, '#b070e0'); poisonMon(m, w.dmg * 0.4, 4); if (!w.wake) P.lastHit = m;
    }
    // a wave carries what it hits along before it
    for (const m of w.hit) if (!m.dead && m.rank !== 'boss') { const ox = m.x - w.x, oy = m.y - w.y, along = ox * w.dx + oy * w.dy, side = Math.abs(ox * w.dy - oy * w.dx); if (along > -0.9 && along < 0.9 + m.r && side < w.w / 2 + m.r) moveCircle(m, w.dx * st * (w.wake ? 0.6 : 0.9), w.dy * st * (w.wake ? 0.6 : 0.9)); }
    if (w.trail) { w.trailT -= st; if (w.trailT <= 0) { w.trailT = 1.2; addCloud(w.x, w.y, 1, 4, w.dmg * 0.15, 'poison'); } }
  }
  G.rtides = G.rtides.filter(w => w.t > 0);
  // contagion leaps
  for (const m of G.zone.monsters) {
    if (m.dead || !(m.contagion > 0)) continue; m.contagion -= dt; m.contT = (m.contT || 0) - dt;
    if (m.contT <= 0) { m.contT = 1.5; const n = (P.skills.epidemic > 0 ? 3 : 2) + (aM('zm_contag') ? 1 : 0), LR = P.skills.contspread > 0 ? 5 : 3.2; const near = G.zone.monsters.filter(o => !o.dead && o !== m && dist(o, m) < LR).sort((a, b) => dist(a, m) - dist(b, m)).slice(0, n); for (const o of near) { poisonMon(o, MS.contPsn(), 4); G.zaps.push({ x0: m.x, y0: m.y, x1: o.x, y1: o.y, t: 0.2, seed: Math.random() * 99, col: '#b070e0' }); } }
  }
  // decoys, mirages, lures
  for (const e of G.decoys.slice()) { e.t -= dt; if (e.t <= 0) decoyDies(e); }
  for (const f of G.mirages) { f.t -= dt; for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - f.x, m.y - f.y) < f.R + m.r) { m.slow = Math.max(m.slow || 0, 0.5); if (aM('zd_mirage')) m.frail = 0.3; } }
  G.mirages = G.mirages.filter(f => f.t > 0);
  for (const l of G.lures) { l.t -= dt; const LR = l.R || 5; for (const m of G.zone.monsters) { if (m.dead || m.rank === 'boss') continue; const d = Math.hypot(m.x - l.x, m.y - l.y); if (d < LR && d > 0.4) { moveCircle(m, (l.x - m.x) / d * Math.min(d, 2.5 * dt), (l.y - m.y) / d * Math.min(d, 2.5 * dt)); if (aM('zd_lure')) confuse(m, 1); } } }
  G.lures = G.lures.filter(l => l.t > 0);
  for (const m of G.zone.monsters) if (m.frail > 0) m.frail -= dt;
  // hold to repeat quick casts
  if (P.cast <= 0 && P.roll <= 0 && !P.dead) for (const id of ['gstrike', 'talon', 'flurry', 'shuriken', 'rarc', 'thrust']) if (heldSkill(id)) { miasCast(id); break; }
}
// confused enemies stumble about and turn on each other; terrified ones run from you
function updateConfused(m, dt) {
  m.hurt = Math.max(0, m.hurt - dt); m.cd -= dt;
  if (Math.random() < 0.2) parts.push({ x: m.x + rand(-0.2, 0.2), y: m.y, z: 16, vx: 0, vy: 0, vz: 4, t: 0.4, col: '#a8c0e0' });
  let T = null, bd = 4; for (const o of G.zone.monsters) { if (o.dead || o === m) continue; const d = dist(o, m); if (d < bd) { bd = d; T = o; } }
  if (T) {
    if (Math.abs((T.x - T.y) - (m.x - m.y)) > 0.05) m.face = (T.x - T.y) > (m.x - m.y) ? 1 : -1;
    if (bd > m.r + T.r + 0.35) monMove(m, T.x, T.y, m.spd * 0.8, dt);
    else if (m.cd <= 0) { m.cd = 1.1; G.noProc = true; hurtMon(T, rand(m.dmg[0], m.dmg[1]), '#a8c0e0'); G.noProc = false; }
  } else {
    m.wander = (m.wander || 0) - dt;
    if (m.wander <= 0 || !m.wpt) { m.wander = rand(0.6, 1.4); const a = Math.random() * 6.28; m.wpt = { x: m.x + Math.cos(a) * 2, y: m.y + Math.sin(a) * 2 }; }
    moveCircle(m, (m.wpt.x - m.x) * dt * 0.8, (m.wpt.y - m.y) * dt * 0.8);
  }
}
function updateFeared(m, dt) {
  m.feared -= dt; m.hurt = Math.max(0, m.hurt - dt);
  const d = dist(m, P) || 1; moveCircle(m, (m.x - P.x) / d * m.spd * 1.1 * dt, (m.y - P.y) / d * m.spd * 1.1 * dt);
  if (Math.abs((m.x - m.y) - (P.x - P.y)) > 0.05) m.face = (m.x - m.y) > (P.x - P.y) ? 1 : -1;
  if (Math.random() < 0.15) parts.push({ x: m.x, y: m.y, z: 18, vx: 0, vy: 0, vz: 3, t: 0.4, col: '#e8e2d0' });
}
