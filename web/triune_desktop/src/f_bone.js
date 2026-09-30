
// =================================================================== OSSUMANCER (build step 2)
// The bone knight: a shard aura that is armor, ammunition and army. Skeletons, the Ossuary Colossus,
// Bone Host, and Marrow spells that weaken as the aura thins.
Object.assign(G, { barms: [], skels: [], colossus: null, bspears: [], ribcages: [], bspikes: [], barrows: [], bmotes: [], cmd: null, fallen: 0 });
Object.assign(P, { shards: 0, shardT: 0, host: null, fusing: false, fuseT: 0, dash: null, swings: 0, rebuildT: 0, sbeh: defaultSbeh(), cweapon: 'shield', archerN: 0, summonT: 0, skelWant: 99, squads: defaultSquads() });
function defaultSbeh() { return { x: 2, y: 3, focus: false, hold: false }; }
const CWEAPONS = ['shield', 'scythe', 'swords', 'flail'];
const CWEAPON_NAMES = { shield: 'Tower Shield', scythe: 'Bone-Scythe Arm', swords: 'Twin Swords', flail: 'Spine-Flail' };
const CWEAPON_DESC = {
  shield: 'Slow bashes. Takes far less damage and draws enemies to it.',
  scythe: 'Wide sweeps that cut everything in front of it.',
  swords: 'Fast paired strikes: two hits per swing.',
  flail: 'Slow, long-reaching smashes that stun and splash.'
};
const CW = {
  shield: { mult: 0.75, dur: 1.0, reach: 1.1, dr: 0.3 },
  scythe: { mult: 0.9, dur: 1.15, reach: 1.5, arc: 1.4 },
  swords: { mult: 0.55, dur: 0.62, reach: 1.1, twice: true },
  flail: { mult: 1.3, dur: 1.45, reach: 2.0, stun: 0.7, aoe: 1.1 }
};
function isBone() { return P.cls === 'ossumancer'; }

// ------------------------------------------------------------------- numbers
const BS = {
  cap: () => Math.round((20 + 2 * P.skills.aura + Math.floor((D ? D.spi : 25) / 5) + 4 * Math.min(3, (itemStatSum().wisp || 0))) * (P.host && P.skills.shardskin > 0 ? 1.5 : 1)),
  rate: () => Math.min(2.4, (0.22 + 0.014 * P.skills.aura + (D ? D.spi : 25) * 0.0016) * chantBoost() * (P.skills.carapregen > 0 ? 1.15 : 1) * (P.pulling ? 4 : 1)),
  // v0.22d: the army's own reserve of marrow, refilled apart from the free shards; a fallen skeleton gives nothing back
  marrowCap: () => BS.skelCost() * Math.max(1, typeof wantTotal === 'function' ? wantTotal() : BS.skelMax()),
  marrowRate: () => (0.36 + 0.012 * (P.skills.raise || 0)) * (P.pulling ? 4 : 1) * (nearCorpse() ? 1.5 : 1),
  pullR: () => (3 + 0.25 * L1('aura')) * (P.skills.deeppull > 0 ? 1.5 : 1),
  moteDmg: () => (2 + 1 * (L1('aura') - 1)) * D.dmgMult * (1 + 0.05 * P.skills.carapm),
  skelCost: () => 5,
  summonT: () => Math.max(2.4, 4 - 0.06 * (P.skills.raise || 0)),   // v0.22d: slower rising (the user: skeletons respawned too fast)
  burstDmg: () => (5 + 2.5 * (L1('raise') - 1)) * D.dmgMult * (1 + 0.08 * P.skills.legion),
  frac: () => clamp(P.shards / Math.max(1, D.shardCap), 0, 1),
  floor: () => Math.min(0.95, 0.55 + 0.02 * P.skills.marrowm + (P.skills.marrowfloor > 0 ? 0.2 : 0)),
  power: () => D.dmgMult * (1 + 0.1 * P.skills.marrowm) * (BS.floor() + (1 - BS.floor()) * BS.frac()),
  dr: () => aR('o_maelstrom') ? 0 : Math.min(0.45 + 0.01 * P.skills.carapm, P.shards * (0.006 + 0.0008 * P.skills.carapm)),
  spurs: () => (3 + 2 * L1('aura')) * (0.3 + BS.frac()),
  spearDmg: () => (9 + 4.5 * (L1('spear') - 1)) * BS.power(),
  ribDps: () => (5 + 2.5 * (L1('ribcage') - 1)) * BS.power(),
  ribLife: () => 2.4 + 0.12 * L1('ribcage'),
  spikeDmg: () => (14 + 6 * (L1('spikes') - 1)) * BS.power(),
  spikeR: () => (1.7 + 0.05 * L1('spikes')) * (P.skills.spikewide > 0 ? 1.5 : 1),
  armN: () => 6 + Math.floor(L1('wall') / 3),
  armLife: () => 4 + 0.2 * L1('wall'),
  armDps: () => (5 + 2.5 * (L1('wall') - 1)) * BS.power(),
  hostMax: () => 3 + Math.floor(L1('host') / 3),
  stormMax: () => 6 + Math.floor(L1('sstorm') / 2),
  stormDmg: () => (7 + 3.2 * (L1('sstorm') - 1)) * BS.power(),
  skelMax: () => 2 + Math.floor((L1('raise') - 1) / 3) + (P.skills.legion >= 1 ? 1 : 0) + (P.skills.legion >= 10 ? 1 : 0) + (P.skills.legionmax > 0 ? 1 : 0),
  skelHp: () => (18 + 7 * (L1('raise') - 1)) * (1 + 0.08 * P.skills.legion) * 0.5,
  skelDmg: () => { const L = L1('raise'), k = 1 + 0.1 * P.skills.legion; return [(1.6 + 0.8 * (L - 1)) * k, (3 + 1.3 * (L - 1)) * k]; },
  colMax: () => 4 + Math.floor(L1('colossus') / 2),
  colHp: n => (80 + 32 * (L1('colossus') - 1)) * (0.6 + 0.4 * n) * (1 + 0.1 * P.skills.legion) * (P.skills.colgiant > 0 ? 1.25 : 1),
  colDmg: n => (12 + 6 * (L1('colossus') - 1)) * (0.8 + 0.25 * n) * (1 + 0.1 * P.skills.legion),
  colSpd: () => 3.6 * (P.skills.colgiant > 0 ? 1.1 : 1),
  leapCd: () => P.skills.colleap > 0 ? 3 : 5,
  tithe: () => Math.min(0.4, 0.12 + 0.012 * P.skills.tithe),
  blade: () => 1 + 0.15 * P.skills.blade,
  cleave: () => 0.5 + 0.02 * P.skills.blade,
  weapon: () => (D.wmin + D.wmax) / 2 * D.meleeMult,
  sweepDmg: () => BS.weapon() * (1.4 + 0.15 * L1('bscythe')),
  chargeDmg: () => BS.weapon() * (1.2 + 0.12 * L1('gcharge')),
  chargeLen: () => 5 + 0.1 * L1('gcharge'),
  hostPer: () => (18 + 7 * (L1('raise') - 1)) * (1 + 0.08 * P.skills.legion) * 0.9,
  hostMelee: () => 0.25 + 0.02 * P.skills.host,
  hostReach: () => (P.host ? 0.35 + 0.1 * Math.min(8, P.host.n) : 0) + (P.skills.bladereach > 0 ? 0.33 : 0)
};
// called from derive(): class-specific numbers
function boneDerive(d) {
  if (!isBone()) { d.shardCap = 0; return; }
  d.wispCap = 0; d.wardPct = 0;
  d.shardCap = BS.cap();
  d.meleeMult *= BS.blade() * (1 + 0.06 * P.skills.carapm) * (P.host ? 1 + BS.hostMelee() * P.host.n : 1);
  if (P.host) { d.armor += 8 * P.host.n; d.moveSpd *= 1 + 0.03 * Math.min(8, P.host.n); }
}
function boneInfo(id) {
  const r = Math.round, pc = v => Math.round(v * 100) + '%';
  switch (id) {
    case 'raise': { const dm = BS.skelDmg(); return `Up to ${BS.skelMax()} skeletons · life ${r(BS.skelHp())} · hits ${r(dm[0])}-${r(dm[1])} · each holds ${BS.skelCost()} shards`; }
    case 'bburst': return `6 shards burst out for ${r(BS.burstDmg())} each · half the bone flies home`;
    case 'shieldb': return 'Skeletons take 35% less damage';
    case 'mknit': return 'Skeletons mend 6% per second near you, 1% anywhere';
    case 'tithe': return `${pc(BS.tithe())} chance per kill for a shard`;
    case 'colossus': return `Fuses up to ${BS.colMax()} skeletons · per skeleton: life ${r(BS.colHp(1) * 0.5)}, damage +15%`;
    case 'bulwarkC': return 'Colossus takes 25% less damage · challenges foes every 6s';
    case 'cracked': return '25% chance per blow to knock a shard loose to you';
    case 'legion': return `Skeletons and Colossus +${8 * P.skills.legion}% life, +${10 * P.skills.legion}% damage`;
    case 'spear': return `${r(BS.spearDmg())} damage · pierces everything`;
    case 'splinter': return `Splinters for ${r(BS.spearDmg() * 0.5)} to either side`;
    case 'impale': return 'Pins what it pierces for 0.6s';
    case 'ribcage': return `${r(BS.ribDps())} dmg/s to all inside · holds ${BS.ribLife().toFixed(1)}s`;
    case 'mdrain': return '1 shard per held enemy each second';
    case 'wall': return `${BS.armN()} arms · ${r(BS.armDps())} dmg/s to what walks over them · slows · last ${BS.armLife().toFixed(1)}s`;
    case 'charnel': return `${Math.round(BS.armN() * 1.4)} arms across ${(1.6 + 0.04 * L1('wall')).toFixed(1)} yd around the target`;
    case 'spikes': return `${r(BS.spikeDmg())} damage in ${BS.spikeR().toFixed(1)} yd`;
    case 'bloom': return 'Spike kills burst again at 70%';
    case 'sstorm': return `Fires up to ${BS.stormMax()} shards in a fan · ${r(BS.stormDmg())} each · pierce 2`;
    case 'marrowm': return `+${10 * P.skills.marrowm}% bone spell damage · thin aura floor ${pc(BS.floor())}`;
    case 'aura': return `Holds ${20 + 2 * P.skills.aura} shards · pulls ${BS.rate().toFixed(2)}/s from ${BS.pullR().toFixed(1)} yd · each cuts for ${r(BS.moteDmg())} · ${(0.6 + 0.08 * P.skills.carapm).toFixed(2)}% damage turned per shard`;
    case 'spurs': return `Cuts melee attackers for ${r(BS.spurs())}`;
    case 'deeppull': return 'Pull range x1.5 · corpses give bone 3.5x as fast';
    case 'reforge': return 'Each shard gathered mends 1.5% life';
    case 'blade': return `x${BS.blade().toFixed(2)} melee damage · cleaves for ${pc(BS.cleave())}`;
    case 'bscythe': return `${r(BS.sweepDmg())} damage all around you`;
    case 'host': return `Carries up to ${BS.hostMax()} skeletons · each: +${r(BS.hostMelee() * 100)}% melee, +6 armor, ${r(BS.hostPer())} carapace`;
    case 'everst': return '20% less damage and no knockback while hosting';
    case 'shardskin': return 'Aura holds 50% more shards while hosting';
    case 'titan': return `Every third blow slams for ${r(BS.weapon() * 1.5)} in 1.8 yd`;
    case 'gcharge': return `${r(BS.chargeDmg())} damage · ${BS.chargeLen().toFixed(1)} yd`;
    case 'carapm': return `+${6 * P.skills.carapm}% melee · +${(0.08 * P.skills.carapm).toFixed(2)}% per shard turned · shards cut +${5 * P.skills.carapm}%`;
  }
  return boneInfo14(id);
}

// ------------------------------------------------------------------- shards
function spendShards(n) {
  if (!n) return true;
  if (P.shards < n) { say('Not enough bone shards', 1.1); sfx(90, 0.12, 'sawtooth', 0.03); return false; }
  P.shards -= n; return true;
}
// visual-only bone flying to a minion
function boneMote(x, y, to) { G.bmotes.push({ vis: true, x0: x, y0: y, x, y, z: 2, k: 0, to: to || P }); }
// a real shard: rises out of the ground, flies to you, cuts what it passes through, and fills the aura when it arrives
function spawnMote(x, y, o) { G.bmotes.push(Object.assign({ x, y, z: 0, rise: 0.22, out: 0, vx: 0, vy: 0, spd: 4, t: 0, val: 1, dmg: BS.moteDmg(), hit: new Set() }, o || {})); }
function gainShard(from) { const f = from || P; spawnMote(f.x + rand(-0.3, 0.3), f.y + rand(-0.3, 0.3), { rise: 0.1 }); }
function liveSkels() { return G.skels.filter(e => !e.temp); }
function reservedShards() { return BS.skelCost() * (liveSkels().length + (G.colossus ? G.colossus.n : 0) + (P.host ? P.host.n : 0)); }
function freeCap() { return Math.max(0, (D ? D.shardCap : 0) - reservedShards()); }
function inFlight() { let n = 0; for (const b of G.bmotes) if (!b.vis) n += b.val; return n; }
function spawnPull(corpse) {
  const R = BS.pullR(); let x, y;
  if (corpse) { x = corpse.x + rand(-0.3, 0.3); y = corpse.y + rand(-0.3, 0.3); }
  else {
    const foes = G.zone.monsters.filter(m => !m.dead && m.state !== 'idle' && Math.abs(m.x - P.x) < R && Math.hypot(m.x - P.x, m.y - P.y) < R - 0.3);
    if (foes.length && Math.random() < 0.65) {
      // tear the bone up from behind an enemy so it cuts through on its way in
      const m = pick(foes), d = dist(m, P) || 1, ext = Math.min(R, d + rand(0.6, 1.8)), j = rand(-0.4, 0.4);
      x = P.x + (m.x - P.x) / d * ext - (m.y - P.y) / d * j; y = P.y + (m.y - P.y) / d * ext + (m.x - P.x) / d * j;
    } else { const a = Math.random() * 6.28, r = rand(R * 0.45, R); x = P.x + Math.cos(a) * r; y = P.y + Math.sin(a) * r; }
  }
  spawnMote(x, y); burst(x, y, '#6f6a5c', 2, 0.8);
}
function updateMotes(dt) {
  for (const b of G.bmotes) {
    if (b.vis) { b.k = Math.min(1, b.k + dt / 0.35); const to = b.to; b.x = b.x0 + (to.x - b.x0) * b.k; b.y = b.y0 + (to.y - b.y0) * b.k; b.z = 2 + Math.sin(b.k * Math.PI) * 10 + b.k * 6; if (b.k >= 1) b.done = true; continue; }
    b.t += dt;
    if (b.rise > 0) { b.rise -= dt; b.z = 7 * (1 - Math.max(0, b.rise) / 0.22); continue; }
    if (b.out > 0) { b.out -= dt; b.x += b.vx * dt; b.y += b.vy * dt; b.z = 6; }
    else {
      const dx = P.x - b.x, dy = P.y - b.y, d = Math.hypot(dx, dy) || 1;
      b.spd = Math.min(15, b.spd + 22 * dt); const st = Math.min(d, b.spd * dt);
      b.x += dx / d * st; b.y += dy / d * st; b.z = 6 + Math.sin(b.t * 10) * 1.2;
      if (d < 0.35 || P.dead) {
        b.done = true;
        if (!P.dead) { P.shards = Math.min(freeCap(), P.shards + b.val); if (P.skills.reforge > 0) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.015 * b.val); onShardGathered(b.val); }
        continue;
      }
    }
    if (b.dmg > 0) for (const m of G.zone.monsters) {
      if (m.dead || b.hit.has(m) || Math.abs(m.x - b.x) > 1 || Math.hypot(m.x - b.x, m.y - b.y) > m.r + 0.15) continue;
      b.hit.add(m); hurtMon(m, b.dmg, '#e8e2d0'); burst(b.x, b.y, '#e8e2d0', 2, 1); if (aM('c_grind')) m.slow = Math.max(m.slow || 0, 0.45);
    }
    if (b.t > 4) b.done = true;
  }
  G.bmotes = G.bmotes.filter(b => !b.done);
}
// called from hurtPlayer (after armor/resist): shards turn part of the blow, host skeletons soak half
function boneAbsorb(d) {
  if (!isBone()) return d;
  d = boneAbsorb14(d);
  d *= 1 - BS.dr();
  if (P.host) {
    if (P.skills.everst > 0) d *= 0.8;
    const h = P.host, soak = d * 0.5; h.pool -= soak; d -= soak;
    while (h.n > 0 && h.pool <= (h.n - 1) * BS.hostPer()) { h.n--; onCarapaceCrack(); burst(P.x, P.y, '#e8e2d0', 10, 2.2); floatText(P.x, P.y, 'carapace cracks', '#cfc6ae'); sfx(260, 0.12, 'square', 0.035, -180); D = derive(); }
    if (h.n <= 0) { P.host = null; say('Your Bone Host is broken', 1.4); }
  }
  if (P.shards >= 1 && d > 1 && Math.random() < 0.25) { P.shards -= 1; burst(P.x, P.y, '#e8e2d0', 3, 2); }
  return d;
}
function boneSpurs(m) {
  if (!isBone() || !P.skills.spurs || !m || m.dead || P.shards < 1) return;
  hurtMon(m, BS.spurs(), '#e8e2d0'); burst(m.x, m.y, '#e8e2d0', 3, 1.2);
}
function onBoneKill(m) {
  if (!isBone()) return;
  if (P.skills.tithe > 0) { const big = P.skills.tithemore > 0 && (m.rank === 'champion' || m.rank === 'unique'), n = big ? 2 : Math.random() < BS.tithe() ? 1 : 0; for (let i = 0; i < n; i++) { gainShard(m); if (P.skills.tithemend > 0) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.01); } }
  onBoneKill14(m);
  if (P.skills.carapheal > 0) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.02);
  if (m.spiked > G.time && P.skills.bloom > 0 && !G.echoSpike) { const v = m.spikeDmg * 0.7; setTimeout(() => spikeBurst(m.x, m.y, v, BS.spikeR() * 0.8, m), 0); }
}
// corpses: each fresh corpse has a few shards to give
function nearCorpse() {
  const R = P.skills.deeppull > 0 ? 7 : 3.5;
  for (const m of G.zone.monsters) {
    if (!m.dead || m.drained || G.time - (m.deadAt || 0) > CORPSE_LIFE || m.rank === 'boss') continue;
    if (Math.abs(m.x - P.x) > R || Math.abs(m.y - P.y) > R || Math.hypot(m.x - P.x, m.y - P.y) > R) continue;
    return m;
  }
  return null;
}

// ------------------------------------------------------------------- casting
function boneCast(id, pt) {
  if (!isBone() || !SK[id] || SK[id].cls !== 'ossumancer' || !P.skills[id] || SK[id].kind === 'passive') return;
  if (P.roll > 0) return;
  const a = losPoint(pt || aimPoint());
  if (id === 'colossus') { colossusPress(a); return; }
  if (id === 'host') { hostPress(); return; }
  if (id === 'aura') return;   // held: the channel runs in updateBone
  if (P.cast > 0) return;
  if (id === 'crush' && !meleeApproach(id, a, meleeReach() + 0.1)) return;
  const cost = Math.max(0, (SK[id].shards || 0) - (P.skills.marrowcost > 0 && SK[id].tab === 1 && SK[id].shards ? 1 : 0));
  if (cost && P.shards < cost) { say('Not enough bone shards', 1.1); sfx(90, 0.12, 'sawtooth', 0.03); return; }
  if (id === 'sstorm' && P.shards < 1) { say('No shards to fire', 1); return; }
  if (!spendMana(id)) return;
  spendShards(cost);
  faceTo(a.x, a.y); P.path = null;
  switch (id) {
    case 'raise': { const p = clampCast(a, 6); raiseSkel(p.x, p.y); P.cast = 0.4 / D.castSpd; sfx(180, 0.25, 'square', 0.04, 120); break; }
    case 'spear': if (aR('o_tower')) { castThrust(a); P.cast = 0.3 / D.castSpd; } else { castSpear(a); P.cast = 0.36 / D.castSpd; } break;
    case 'ribcage': if (!cageWarden(clampCast(a, 9))) castRibcage(clampCast(a, 9)); P.cast = 0.45 / D.castSpd; break;
    case 'wall': if (aR('o_grasp')) { P.armWalk = BS.armLife(); P.armLast = null; sfx(110, 0.3, 'square', 0.05, 80); } else castBoneArms(clampCast(a, 8)); P.cast = 0.45 / D.castSpd; break;
    case 'spikes': castSpikes(a); P.cast = 0.4 / D.castSpd; break;
    case 'sstorm': castShardStorm(a); P.cast = 0.45 / D.castSpd; break;
    case 'bscythe': castSweep(); P.cast = 0.42 / D.castSpd; break;
    case 'gcharge': castGCharge(a); break;
    default: boneCast14(id, a);
  }
  onBoneCastArc(id, a);
}
function clampCast(a, R) {
  let tx = a.x, ty = a.y; const d = Math.hypot(tx - P.x, ty - P.y);
  if (d > R) { tx = P.x + (tx - P.x) / d * R; ty = P.y + (ty - P.y) / d * R; }
  if (G.zone.solidAt(tx, ty)) { const nw = nearestWalk(G.zone, Math.floor(tx), Math.floor(ty)); if (nw) { tx = nw[0] + 0.5; ty = nw[1] + 0.5; } else { tx = P.x; ty = P.y; } }
  return { x: tx, y: ty };
}

// ------------------------------------------------------------------- skeletons: three squads, each with a count, a loadout and orders
const SLOADS = ['shield', 'greatsword', 'halberd', 'flail', 'bow', 'mage'];
const SLOAD_NAMES = { shield: 'Sword and Shield', greatsword: 'Greatsword', halberd: 'Halberd', flail: 'Flail', bow: 'Bow', mage: 'Grave Staff (Mage)' };
const SLOAD_DESC = {
  shield: 'Sturdy and slow to fall. Their blows draw the enemy onto them.',
  greatsword: 'Heavy two-handed sweeps that cut everything in front.',
  halberd: 'Long reach from behind the line. Knocks enemies back.',
  flail: 'Slow, crushing blows that stun.',
  bow: 'Shoot from range. Frail up close.',
  mage: 'Casts a small copy of your last Marrow spell. Frail.'
};
const SL = {
  shield: { hp: 1.45, dmg: 0.7, reach: 0.85, cd: 0.8, dr: 0.25, taunt: 2.5 },
  greatsword: { hp: 1.0, dmg: 1.15, reach: 0.95, cd: 1.1, arc: 1.2 },
  halberd: { hp: 0.95, dmg: 1.0, reach: 1.55, cd: 1.0, knock: 0.35 },
  flail: { hp: 1.1, dmg: 1.2, reach: 1.0, cd: 1.3, stun: 0.5 },
  bow: { hp: 0.8, dmg: 0.8, reach: 5.5, cd: 1.25, ranged: true },
  mage: { hp: 0.7, dmg: 0.9, reach: 5, cd: 1.7, ranged: true, mage: true }
};
function defaultBeh(x, y) { return { x, y, focus: false, hold: false }; }
function defaultSquads() { return [{ load: 'shield', n: 2, beh: defaultBeh(1, 2) }, { load: 'greatsword', n: 2, beh: defaultBeh(2, 3) }, { load: 'halberd', n: 2, beh: defaultBeh(2, 3) }]; }
function loadOk(l) { return l === 'bow' ? bowOk() : l === 'mage' ? mageOk() : true; }
function squadOf(e) { return P.squads[e.sq] || P.squads[0]; }
function skelLoad(e) { return SL[e.load] || SL.shield; }
function newSkel(x, y, sq) {
  const S = P.squads[sq] || P.squads[0], load = loadOk(S.load) ? S.load : 'shield', hp = BS.skelHp() * SL[load].hp;
  return { isSkel: true, sq, load, x, y, r: 0.27, hp, max: hp, spd: 3.2, face: 1, cd: 0.4, state: 'idle', t: 0, hurt: 0, path: null, repath: 0, rise: 0.45, tgt: null, hold: null };
}
// which squad is short: squads fill in order I, II, III
function squadCount(i) { return G.skels.filter(e => e.sq === i && !e.temp).length; }
function nextSquad() { for (let i = 0; i < P.squads.length; i++) if (squadCount(i) < P.squads[i].n) return i; return -1; }
function wantTotal() { return Math.min(BS.skelMax(), P.squads.reduce((a, s) => a + s.n, 0)); }
function skelHaste() { return (G.hornT > 0 ? 1.4 : 1); }
function raiseSkel(x, y, silent, sq) {
  if (sq == null || sq < 0) { sq = nextSquad(); if (sq < 0) sq = 0; }
  const e = newSkel(x, y, sq);
  if (squadOf(e).beh.hold) e.hold = { x, y };
  G.skels.push(e);
  if (!silent) { burst(x, y, '#e8e2d0', 14, 2.2); burst(x, y, '#6f6a5c', 8, 1.5); onSkelRise(e); }
  return e;
}
// a skeleton whose squad changed loadout re-arms itself where it stands
function rearm() { for (const e of G.skels) { const S = squadOf(e); const l = loadOk(S.load) ? S.load : 'shield'; if (e.load !== l) { const f = e.hp / e.max; e.load = l; e.max = BS.skelHp() * SL[l].hp; e.hp = e.max * f; burst(e.x, e.y, '#cfc6ae', 4, 1.2); } } }
function behOf(e) { return e && e.isColossus ? P.sbeh : e ? squadOf(e).beh : P.sbeh; }
function skelOrders(e) { if (e && !e.isColossus && aU('o_pyredead')) return { aggro: 10, guard: false, leash: 10 }; if (e && !e.isColossus && aU('o_oath')) return { aggro: 4, guard: false, leash: 4 }; if (e && !e.isColossus && aR('o_oath')) return { aggro: 12, guard: false, leash: 12 }; const B = behOf(e); return { aggro: 3 + B.x * 1.6, guard: B.y <= 1, leash: 3 + B.x * 1.5 }; }
function minionAnchor(e) {
  if (G.cmd && G.cmd.pt) return G.cmd.pt;
  if (behOf(e).hold && e.hold && !aU('o_oath')) return e.hold;
  return P;
}
function threatens(m) { const t = m.tgt; return t === P || (t && (t.isSkel || t.isColossus)); }
function minionTarget(e) {
  if (G.cmd && G.cmd.ref && !G.cmd.ref.dead) return G.cmd.ref;
  const B = behOf(e), O = skelOrders(e), an = minionAnchor(e);
  if (B.focus && P.lastHit && !P.lastHit.dead && dist(P.lastHit, P) < 12) return P.lastHit;
  let best = null, bd = 1e9;
  for (const m of G.zone.monsters) {
    if (m.dead) continue;
    if (m.state === 'idle' && dist(m, P) > 6) continue;
    const da = dist(m, an); if (da > O.aggro + 1) continue;
    if (O.guard && !threatens(m)) continue;
    const d = dist(m, e) + (B.y >= 3 ? 0 : da * 0.5); if (d < bd) { bd = d; best = m; }
  }
  return best;
}
function hurtSkel(e, dmg, type) {
  if (e.rise > 0) dmg *= 0.5;
  dmg *= (type === 'phys' ? 100 / 120 : 0.9) * (P.skills.shieldb > 0 ? 0.65 : 1) * (1 - (skelLoad(e).dr || 0)) * (aU('o_oath') ? 0.7 : 1);
  e.hp -= dmg; e.hurt = 0.1; crownSave(e);
  if (e.hp <= 0) skelDies(e);
}
function skelDies(e, quiet) {
  const i = G.skels.indexOf(e); if (i < 0) return;
  G.skels.splice(i, 1); if (!e.temp && !quiet) P.summonT = Math.max(P.summonT, 6); burst(e.x, e.y, '#e8e2d0', 14, 2.2); sfx(300, 0.12, 'square', 0.03, -200); onSkelFall(e, quiet);
  if (!quiet && P.skills.bburst > 0) { for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + rand(0, 0.5); spawnMote(e.x, e.y, { rise: 0, out: 0.3, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, dmg: BS.burstDmg(), val: e.temp ? 0 : 0.25 }); } sfx(420, 0.15, 'square', 0.04, -250); }
  onSkelDies14(e, quiet);
  G.bspikes.push({ x: e.x, y: e.y, t: 0.9, pile: true });
}
function skelStrike(e, T) { G.noProc = true; G.hitSrc = e; try { skelStrike0(e, T); } finally { G.noProc = false; G.hitSrc = null; } }
function skelStrike0(e, T) {
  const L = skelLoad(e), dm = BS.skelDmg(), dmg = rand(dm[0], dm[1]) * L.dmg * (G.hornT > 0 ? 1.2 : 1) * (e.temp ? 0.8 : 1);
  if (L.mage) { if (!aR('o_chanter')) mageCast(e, T); return; }
  if (L.ranged) { const d = dist(e, T) || 1; G.barrows.push({ x0: e.x, y0: e.y, x: e.x, y: e.y, vx: (T.x - e.x) / d * 9, vy: (T.y - e.y) / d * 9, t: 1.2, dmg }); sfx(520, 0.05, 'triangle', 0.02, -200); return; }
  if (dist(e, T) > L.reach + T.r + 0.25) return;
  const fx = T.x - e.x, fy = T.y - e.y, fl = Math.hypot(fx, fy) || 1;
  const hit = m => {
    hurtMon(m, dmg, '#e8e2d0'); onSkelHit(e, m);
    if (L.taunt && m.rank !== 'boss') { m.staunt = L.taunt; m.stauntBy = e; }
    if (L.knock && m.rank !== 'boss') moveCircle(m, (m.x - e.x) / (dist(m, e) || 1) * L.knock, (m.y - e.y) / (dist(m, e) || 1) * L.knock);
    if (L.stun && m.rank !== 'boss') m.stun = Math.max(m.stun || 0, L.stun);
  };
  if (L.arc) { for (const m of G.zone.monsters) { if (m.dead) continue; const dx = m.x - e.x, dy = m.y - e.y, d = Math.hypot(dx, dy); if (d > L.reach + m.r + 0.2) continue; if ((dx * fx + dy * fy) / (d * fl || 1) > Math.cos(L.arc)) hit(m); } }
  else hit(T);
  e.swingT = 0.2;
  burst((e.x + T.x) / 2, (e.y + T.y) / 2, '#cfc6ae', 3, 1); sfx(240, 0.05, 'square', 0.02, -80);
}
function updateSkels(dt) {
  for (const e of G.skels.slice()) {
    const smul = skelSpdMul(e); e.spd = 3.2 * smul;
    e.hurt = Math.max(0, e.hurt - dt); e.t += dt; e.cd -= dt * smul; e.swingT = Math.max(0, (e.swingT || 0) - dt);
    if (e.rise > 0) { e.rise -= dt; continue; }
    if (e.temp) { e.temp -= dt; if (e.temp <= 0) { skelDies(e); continue; } }
    const L = skelLoad(e);
    e.max = BS.skelHp() * L.hp; if (!aU('o_pyredead')) e.hp = Math.min(e.max, e.hp + (dist(e, P) < 3 ? e.max * (P.skills.mknit > 0 ? 0.06 : 0.02) * dt : P.skills.mknit > 0 ? e.max * 0.01 * dt : 0));
    if (dist(e, P) > 18) { e.x = P.x + rand(-1, 1); e.y = P.y + rand(-1, 1); if (G.zone.solidAt(e.x, e.y)) { e.x = P.x; e.y = P.y; } e.path = null; }
    if (e.state === 'windup') {
      if (e.t > (L.ranged ? 0.45 : 0.3 + L.cd * 0.15)) { e.state = 'idle'; e.cd = L.cd * (aU('o_pyredead') ? 0.65 : 1) / skelHaste() / bannerHaste(e); if (e.tgt && !e.tgt.dead) skelStrike(e, e.tgt); }
      continue;
    }
    const T = L.mage && aR('o_chanter') ? null : minionTarget(e), an = minionAnchor(e);
    if (T) {
      const d = dist(e, T), reach = L.ranged ? L.reach : L.reach + T.r;
      if (Math.abs((T.x - T.y) - (e.x - e.y)) > 0.05) e.face = (T.x - T.y) > (e.x - e.y) ? 1 : -1;
      if (d > reach || (L.ranged && !lineClear(G.zone, e, T))) monMove(e, T.x, T.y, e.spd, dt);
      else if (L.ranged && d < 2) stepToward(e, e.x - (T.x - e.x), e.y - (T.y - e.y), e.spd * 0.8 * dt);
      else if (e.cd <= 0) { e.state = 'windup'; e.t = 0; e.tgt = T; }
    } else {
      // form up: shields in front, reach and bows behind
      const mates = G.skels.filter(o => o.sq === e.sq), i = mates.indexOf(e), n = Math.max(1, mates.length);
      const ring = L.ranged ? 2.1 : e.load === 'halberd' ? 1.7 : e.load === 'shield' ? 1.1 : 1.4;
      const ang = i / n * Math.PI * 2 + e.sq * 1.1 + 0.6;
      const gx = an.x + Math.cos(ang) * ring, gy = an.y + Math.sin(ang) * ring;
      if (Math.hypot(gx - e.x, gy - e.y) > 0.5) monMove(e, gx, gy, e.spd * (dist(e, an) > 4 ? 1.3 : 1), dt);
    }
    pushOut(e);
    for (const m of G.zone.monsters) { if (m.dead) continue; const dd = dist(m, e), mm = m.r + e.r; if (dd < mm && dd > 0.001) moveCircle(e, (e.x - m.x) / dd * (mm - dd) * 0.6, (e.y - m.y) / dd * (mm - dd) * 0.6); }
  }
  for (const s of G.barrows) {
    s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    const tt = G.zone.get(Math.floor(s.x), Math.floor(s.y)); if (TALL[tt] && tt !== T.ROCK) { s.t = 0; continue; }
    for (const m of G.zone.monsters) if (!m.dead && Math.abs(m.x - s.x) < 1 && Math.hypot(m.x - s.x, m.y - s.y) < m.r + 0.12) { hurtMon(m, s.dmg, '#e8e2d0'); arrowHit(s, m); s.t = 0; break; }
  }
  G.barrows = G.barrows.filter(s => s.t > 0);
}

// ------------------------------------------------------------------- Ossuary Colossus
// a tap directs the Colossus: an enemy near the cursor is its prey, otherwise it marches to the spot. The skeletons follow its lead.
function colossusPress(a) {
  P.fuseT = 0.3;
  if (G.colossus) {
    const c = G.colossus; let best = null, bd = 1.6;
    for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - a.x, m.y - a.y); if (d < bd) { bd = d; best = m; } }
    c.path = null;
    if (best) { c.order = null; c.prey = best; G.cmd = { ref: best, t: 8 }; aggro(best); floatText(best.x, best.y, 'the Colossus comes', '#e8e2d0'); }
    else { const p = clampCast(a, 14); c.order = { x: p.x, y: p.y, t: 5 }; c.prey = null; G.cmd = { pt: { x: p.x, y: p.y }, t: 5 }; }
    for (const e of G.skels) { e.path = null; if (e.state !== 'windup') e.state = 'idle'; }
  }
  else if (!G.skels.length) say('Raise skeletons first: the Colossus is built from them', 1.4);
}
function fuseOne() {
  const lim = BS.colMax();
  if (G.colossus && G.colossus.n >= lim) { if (!P.fuseMsg) { say(`The Colossus holds ${lim} skeletons at most`, 1.2); P.fuseMsg = true; } return; }
  if (!G.skels.length) { if (!P.fuseMsg) { say('No skeletons left to fuse', 1); P.fuseMsg = true; } return; }
  if (!spendMana('colossus')) return;
  const a = aimPoint(), ref = G.colossus || a;
  const e = G.skels.slice().sort((p, q) => dist(p, ref) - dist(q, ref))[0];
  if (!G.colossus) {
    const p = clampCast(a, 6), hp = BS.colHp(1);
    G.colossus = { isColossus: true, x: p.x, y: p.y, n: 0, r: 0.45, hp, max: hp, face: 1, cd: 0.6, state: 'idle', t: 0, hurt: 0, path: null, repath: 0, atk: null, order: null, cc: 3, grow: 0 };
    burst(p.x, p.y, '#e8e2d0', 24, 3); G.shake = Math.max(G.shake, 2);
  }
  const c = G.colossus;
  for (let i = 0; i < 4; i++) boneMote(e.x, e.y, c);
  skelDies(e, true);
  const frac = c.hp / c.max; c.n++; c.max = BS.colHp(c.n); c.hp = Math.max(c.hp, c.max * frac) + c.max * 0.15; c.hp = Math.min(c.hp, c.max);
  c.r = 0.42 + 0.035 * c.n; c.grow = 0.35;
  floatText(c.x, c.y, `${c.n} bones`, '#e8e2d0'); sfx(110 + c.n * 8, 0.3, 'square', 0.05, 60);
}
function hurtColossus(c, dmg, type, src) {
  const w = CW[P.cweapon] || CW.shield;
  dmg *= (type === 'phys' ? 100 / 140 : 0.85) * (1 - (w.dr || 0)) * (P.skills.bulwarkC > 0 ? 0.75 : 1);
  c.hp -= dmg; c.hurt = 0.1; crownSave(c);
  if (P.skills.cracked > 0 && Math.random() < 0.12) gainShard(c);
  if (c.hp <= 0) {
    burst(c.x, c.y, '#e8e2d0', 40, 3.5); G.shake = Math.max(G.shake, 4);
    for (let i = 0; i < Math.min(8, c.n * 2); i++) gainShard(c);
    G.bspikes.push({ x: c.x, y: c.y, t: 1.4, pile: true, big: true });
    G.colossus = null; say('The Colossus collapses', 1.6); sfx(60, 0.8, 'sawtooth', 0.06, -30); onColossusFall(c);
  }
}
function colossusStrike(c, T) { G.noProc = true; G.hitSrc = c; try { colossusStrike0(c, T); } finally { G.noProc = false; G.hitSrc = null; } }
function colossusStrike0(c, T) {
  const w = CW[P.cweapon] || CW.shield, base = BS.colDmg(c.n) * w.mult * (G.hornT > 0 ? 1.2 : 1), fx = T.x - c.x, fy = T.y - c.y, fl = Math.hypot(fx, fy) || 1;
  const hitOne = (m, k = 1) => { hurtMon(m, base * k, '#e8e2d0'); if (w.stun && m.rank !== 'boss') m.stun = Math.max(m.stun || 0, w.stun); if (w.root) { m.root = Math.max(m.root || 0, m.rank === 'boss' ? w.root / 2 : w.root); G.ribcages.push({ x: m.x, y: m.y, R: m.r + 0.3, t: w.root, max: w.root, small: true, dps: 0, ref: m }); } };
  if (P.cweapon === 'scythe') {
    for (const m of G.zone.monsters) { if (m.dead) continue; const dx = m.x - c.x, dy = m.y - c.y, d = Math.hypot(dx, dy); if (d > w.reach + m.r + c.r) continue; const cos = (dx * fx + dy * fy) / (d * fl || 1); if (cos > Math.cos(w.arc)) hitOne(m); }
  } else if (P.cweapon === 'flail') {
    const hx = c.x + fx / fl * Math.min(fl, w.reach), hy = c.y + fy / fl * Math.min(fl, w.reach);
    for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - hx, m.y - hy) < w.aoe + m.r) hitOne(m, m === T ? 1 : 0.6);
    parts.push({ ring: true, x: hx, y: hy, r: 0.2, max: w.aoe, t: 0.3, col: '#cfc6ae' }); G.shake = Math.max(G.shake, 2);
  } else { hitOne(T); if (w.twice) setTimeout(() => { if (!T.dead && G.colossus === c) hitOne(T); }, 120); if (P.cweapon === 'shield' && T.rank !== 'boss') { moveCircle(T, fx / fl * 0.4, fy / fl * 0.4); T.ctaunt = 3; } }
  burst(T.x, T.y, '#cfc6ae', 5, 1.6); sfx(110, 0.1, 'square', 0.045, -50);
}
// the Colossus leaps onto distant prey and lands in a burst of bone
function colLeap(c, T) {
  const d = dist(c, T) || 1, k = Math.max(0, (d - T.r - c.r - 0.2) / d);
  c.leap = { x0: c.x, y0: c.y, x1: c.x + (T.x - c.x) * k, y1: c.y + (T.y - c.y) * k, t: 0, dur: 0.5 + 0.03 * d };
  if (G.zone.solidAt(c.leap.x1, c.leap.y1)) { c.leap.x1 = c.x; c.leap.y1 = c.y; }
  c.leapCd = BS.leapCd(); c.face = (T.x - T.y) > (c.x - c.y) ? 1 : -1;
  sfx(90, 0.3, 'square', 0.05, 120);
}
function updateColLeap(c, dt) {
  const L = c.leap; L.t += dt; const k = Math.min(1, L.t / L.dur);
  c.x = L.x0 + (L.x1 - L.x0) * k; c.y = L.y0 + (L.y1 - L.y0) * k; c.z = Math.sin(k * Math.PI) * (22 + 6 * Math.min(8, c.n));
  if (k >= 1) {
    c.leap = null; c.z = 0;
    const R = 1.6 + 0.08 * Math.min(10, c.n), dmg = BS.colDmg(c.n) * 1.4;
    G.noProc = true; try { for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - c.x, m.y - c.y) < R + m.r) { hurtMon(m, dmg * (P.skills.colleap > 0 ? 1.3 : 1), '#e8e2d0'); if (m.rank !== 'boss') { m.stun = Math.max(m.stun || 0, 0.8); const d = dist(m, c) || 1; moveCircle(m, (m.x - c.x) / d * 0.6, (m.y - c.y) / d * 0.6); } } } finally { G.noProc = false; }
    parts.push({ ring: true, x: c.x, y: c.y, r: 0.3, max: R, t: 0.4, col: '#e8e2d0' }); burst(c.x, c.y, '#e8e2d0', 30, 3.2);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; G.bspikes.push({ x: c.x + Math.cos(a) * R * 0.7, y: c.y + Math.sin(a) * R * 0.7, t: 0.6, pile: true }); }
    G.shake = Math.max(G.shake, 5); sfx(55, 0.6, 'square', 0.07, -30);
  }
}
function updateColossus(dt) {
  const c = G.colossus; if (!c) return;
  c.hurt = Math.max(0, c.hurt - dt); c.t += dt; c.cd -= dt; c.cc -= dt; c.grow = Math.max(0, c.grow - dt);
  c.max = BS.colHp(c.n); c.hp = Math.min(c.hp, c.max);
  if (dist(c, P) > 20) { c.x = P.x + 1; c.y = P.y; if (G.zone.solidAt(c.x, c.y)) { c.x = P.x; c.y = P.y; } c.path = null; }
  if (P.skills.bulwarkC > 0 && c.cc <= 0) {
    c.cc = 6; let n = 0;
    for (const m of G.zone.monsters) if (!m.dead && m.rank !== 'boss' && dist(m, c) < 4.5) { m.ctaunt = 4; aggro(m); n++; }
    if (n) { parts.push({ ring: true, x: c.x, y: c.y, r: 0.3, max: 4.5, t: 0.5, col: '#c8553d' }); sfx(90, 0.35, 'sawtooth', 0.04, 40); }
  }
  const w = CW[P.cweapon] || CW.shield, spd = BS.colSpd();
  c.leapCd = (c.leapCd == null ? 2 : c.leapCd) - dt;
  if (c.leap) { updateColLeap(c, dt); return; }
  if (c.atk) { c.atk.t += dt; if (!c.atk.hit && c.atk.t > c.atk.dur * 0.55) { c.atk.hit = true; if (!c.atk.T.dead) colossusStrike(c, c.atk.T); } if (c.atk.t >= c.atk.dur) c.atk = null; return; }
  if (c.order) {
    const o = c.order; if (dist(c, o) > 0.6) { monMove(c, o.x, o.y, spd * 1.2, dt); if (Math.abs((o.x - o.y) - (c.x - c.y)) > 0.05) c.face = (o.x - o.y) > (c.x - c.y) ? 1 : -1; pushOut(c); return; }
    o.t -= dt; if (o.t <= 0) c.order = null;
  }
  if (c.prey && (c.prey.dead || c.prey.engulfed)) c.prey = null;
  const T = c.prey || minionTarget(c);
  if (T) {
    const d = dist(c, T), reach = w.reach + T.r + c.r * 0.5;
    if (Math.abs((T.x - T.y) - (c.x - c.y)) > 0.05) c.face = (T.x - T.y) > (c.x - c.y) ? 1 : -1;
    if (d > 2.6 && d < 7.5 && c.leapCd <= 0 && lineClear(G.zone, c, T)) colLeap(c, T);
    else if (d > reach) monMove(c, T.x, T.y, spd, dt);
    else if (c.cd <= 0) { const ws = 1 / skelHaste() / bannerHaste(c); c.atk = { t: 0, dur: w.dur * 0.7 * ws, T, hit: false }; c.cd = w.dur * 0.7 * ws + 0.05; }
  } else if (!c.order) {
    const an = G.cmd && G.cmd.pt ? G.cmd.pt : P.sbeh.hold && c.hold ? c.hold : P;
    if (dist(c, an) > (an === P ? 2.2 : 0.5)) monMove(c, an.x, an.y, spd * (dist(c, an) > 5 ? 1.3 : 1), dt);
  }
  pushOut(c);
  for (const m of G.zone.monsters) { if (m.dead) continue; const dd = dist(m, c), mm = m.r + c.r; if (dd < mm && dd > 0.001) moveCircle(m, (m.x - c.x) / dd * (mm - dd) * 0.6, (m.y - c.y) / dd * (mm - dd) * 0.6); }
}

// ------------------------------------------------------------------- Bone Host
function hostPress() {
  P.hostPressT = G.time; P.hostFused = false; P.fuseT = 0.3;
  if (!P.host && !G.skels.length) say('No skeletons standing to fuse onto you', 1.3);
}
function hostOne() {
  const lim = BS.hostMax();
  if (P.host && P.host.n >= lim) { if (!P.fuseMsg) { say(`Your carapace holds ${lim} skeletons at most`, 1.2); P.fuseMsg = true; } return; }
  const e = G.skels.filter(s => s.rise <= 0 && dist(s, P) < 8).sort((p, q) => dist(p, P) - dist(q, P))[0];
  if (!e) { if (!P.fuseMsg) { say('No skeletons near enough to fuse', 1); P.fuseMsg = true; } return; }
  if (!spendMana('host')) return;
  for (let i = 0; i < 4; i++) boneMote(e.x, e.y);
  skelDies(e, true);
  if (!P.host) { P.host = { n: 0, pool: 0 }; banner('BONE HOST', '#e8e2d0', 1.4); G.shake = Math.max(G.shake, 2); }
  P.host.n++; P.host.pool += BS.hostPer(); P.hostFused = true;
  burst(P.x, P.y, '#e8e2d0', 12, 2.4); sfx(90 + P.host.n * 10, 0.3, 'square', 0.05, 60);
  D = derive();
}
function toggleHost() {
  if (P.host) {
    const n = P.host.n; P.host = null;
    let out = 0;
    for (let i = 0; i < n; i++) { if (G.skels.length >= BS.skelMax()) { gainShard(P); continue; } const a = i / n * 6.28; const p = clampCast({ x: P.x + Math.cos(a) * 1.2, y: P.y + Math.sin(a) * 1.2 }, 2); raiseSkel(p.x, p.y, true).rise = 0.2; out++; }
    burst(P.x, P.y, '#e8e2d0', 24, 3); say(`Released ${out} skeleton${out === 1 ? '' : 's'}`, 1.2); sfx(200, 0.3, 'square', 0.04, -100);
    P.cast = 0.3; D = derive(); return;
  }
  if (!G.skels.length) { say('Raise skeletons first: they become your armor', 1.3); return; }
  if (!spendMana('host')) return;
  const n = G.skels.length;
  for (const e of G.skels.slice()) { for (let i = 0; i < 3; i++) boneMote(e.x, e.y); skelDies(e, true); }
  P.host = { n, pool: n * BS.hostPer() };
  G.bspikes = G.bspikes.filter(s => !s.pile);
  burst(P.x, P.y, '#e8e2d0', 30, 3); G.shake = Math.max(G.shake, 3);
  banner('BONE HOST', '#e8e2d0', 1.6); sfx(80, 0.6, 'square', 0.06, 80);
  P.cast = 0.5; D = derive();
}

// ------------------------------------------------------------------- Marrow spells
function castSpear(a) {
  const d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d;
  G.bspears.push({ x: P.x + dx * 0.3, y: P.y + dy * 0.3, vx: dx * 13, vy: dy * 13, t: 0.75, dmg: BS.spearDmg(), hit: new Set(), splint: P.skills.splinter > 0, main: true, tri: aU('o_tower') });
  sfx(420, 0.12, 'square', 0.04, -260); sfx(160, 0.1, 'triangle', 0.03, 60);
}
function updateSpears(dt) {
  for (const s of G.bspears) {
    s.t -= dt;
    const steps = 3;
    for (let k = 0; k < steps && s.t > 0; k++) {
      s.x += s.vx * dt / steps; s.y += s.vy * dt / steps;
      const tt = G.zone.get(Math.floor(s.x), Math.floor(s.y)); if (TALL[tt] && tt !== T.ROCK) { s.t = 0; s.wall = true; s.x -= s.vx * dt / steps; s.y -= s.vy * dt / steps; burst(s.x, s.y, '#e8e2d0', 6, 1.5); break; }
      for (const m of G.zone.monsters) {
        if (m.dead || s.hit.has(m) || Math.abs(m.x - s.x) > 1.2 || Math.hypot(m.x - s.x, m.y - s.y) > m.r + 0.2) continue;
        s.hit.add(m); hurtMon(m, s.dmg, '#e8e2d0'); P.lastHit = m; burst(m.x, m.y, '#e8e2d0', 5, 1.8);
        if (s.storm && aU('o_rime')) chillMon(m, 0.3);
        if (s.tri) { s.tri = false; const ang = Math.atan2(s.vy, s.vx); for (const o of [-0.45, 0, 0.45]) G.bspears.push({ x: m.x, y: m.y, vx: Math.cos(ang + o) * 11, vy: Math.sin(ang + o) * 11, t: 0.45, dmg: s.dmg * 0.6, hit: new Set([m]), small: true }); }
        if (s.pierce && s.hit.size >= s.pierce) { s.t = 0; break; }
        if (s.main && P.skills.impale > 0 && m.rank !== 'boss') m.stun = Math.max(m.stun || 0, 0.6);
        if (s.splint) { s.splint = false; const ang = Math.atan2(s.vy, s.vx); for (const o of [1.1, -1.1]) G.bspears.push({ x: m.x, y: m.y, vx: Math.cos(ang + o) * 10, vy: Math.sin(ang + o) * 10, t: 0.35, dmg: s.dmg * 0.5, hit: new Set([m]), small: true }); }
      }
    }
  }
  for (const s of G.bspears) if (s.t <= 0 && !s.ended) { s.ended = true; spearEnd(s); }
  G.bspears = G.bspears.filter(s => s.t > 0);
}
function castRibcage(p) {
  const R = 1.25, life = BS.ribLife();
  const cage = { x: p.x, y: p.y, R, t: life, max: life, dps: BS.ribDps(), tick: 0, drainT: 1 };
  G.ribcages.push(cage);
  for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - p.x, m.y - p.y) < R + m.r * 0.5) { m.root = Math.max(m.root || 0, m.rank === 'boss' ? life / 2 : life); hurtMon(m, cage.dps * 0.6, '#e8e2d0'); aggro(m); }
  burst(p.x, p.y, '#e8e2d0', 18, 2.5); G.shake = Math.max(G.shake, 2); sfx(90, 0.4, 'square', 0.05, 50);
}
function updateRibcages(dt) {
  for (const c of G.ribcages) {
    c.t -= dt;
    if (c.small) { if (c.ref && !c.ref.dead) { c.x = c.ref.x; c.y = c.ref.y; } continue; }
    c.tick -= dt; c.drainT -= dt;
    const inside = G.zone.monsters.filter(m => !m.dead && Math.hypot(m.x - c.x, m.y - c.y) < c.R + m.r * 0.5);
    if (c.tick <= 0) { c.tick = 0.25; for (const m of inside) { hurtMon(m, c.dps * 0.25, '#cfc6ae'); if (m.root < 0.3 && m.rank !== 'boss') m.root = 0.3; } }
    if (c.drainT <= 0) { c.drainT = 2; if (P.skills.mdrain > 0) for (const m of inside) gainShard(m); }
    if (c.t <= 0 && P.skills.ribspike > 0) spikeBurst(c.x, c.y, BS.ribDps() * 2, c.R + 0.4, null);
  }
  G.ribcages = G.ribcages.filter(c => c.t > 0);
}
function castBoneArms(p) {
  const life = BS.armLife(), dps = BS.armDps(), pts = [];
  if (P.skills.charnel > 0) {
    const n = Math.round(BS.armN() * 1.4), R = 1.6 + 0.04 * L1('wall');
    for (let i = 0; i < n; i++) { const a = i * 2.39996, r = R * Math.sqrt((i + 0.5) / n); pts.push({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, delay: r / R * 0.25 }); }
  } else {
    const d = Math.hypot(p.x - P.x, p.y - P.y) || 1, dx = (p.x - P.x) / d, dy = (p.y - P.y) / d, n = BS.armN(), L = Math.max(d, 3.5), step = L / n;
    for (let i = 0; i < n; i++) { const t = 0.9 + i * step; pts.push({ x: P.x + dx * t + rand(-0.12, 0.12), y: P.y + dy * t + rand(-0.12, 0.12), delay: i * 0.045 }); }
  }
  for (const q of pts) { if (G.zone.solidAt(q.x, q.y)) continue; G.barms.push({ x: q.x, y: q.y, delay: q.delay, rise: 0.2, life, max: life, dps, tick: 0, seed: Math.random() * 6.28, lean: rand(-0.4, 0.4) }); }
  while (G.barms.length > 60) G.barms.shift();
  sfx(110, 0.3, 'square', 0.05, 80); sfx(300, 0.2, 'triangle', 0.03, -150);
}
function updateArms(dt) {
  for (const a of G.barms) {
    if (a.delay > 0) { a.delay -= dt; continue; }
    if (a.rise > 0) {
      a.rise -= dt;
      if (a.rise <= 0) { burst(a.x, a.y, '#6f6a5c', 4, 1.2); for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - a.x, m.y - a.y) < m.r + 0.45) { hurtMon(m, a.dps * 0.6, '#e8e2d0'); aggro(m); if (aM('m_tread') && m.rank !== 'boss') m.stun = Math.max(m.stun || 0, 0.35); } }
      continue;
    }
    a.life -= dt; a.tick -= dt;
    if (a.tick <= 0) {
      a.tick = 0.3; a.grab = null;
      for (const m of G.zone.monsters) {
        if (m.dead || Math.abs(m.x - a.x) > 1 || Math.hypot(m.x - a.x, m.y - a.y) > m.r + 0.42) continue;
        hurtMon(m, a.dps * 0.3 * (P.skills.armcrush > 0 ? 2 : 1), '#cfc6ae'); m.slow = Math.max(m.slow || 0, m.rank === 'boss' ? 0.2 : 0.45); a.grab = m;
        if (aU('o_grasp') && !a.held) { a.held = true; m.root = Math.max(m.root || 0, m.rank === 'boss' ? 0.75 : 1.5); G.ribcages.push({ x: m.x, y: m.y, R: m.r + 0.25, t: 1.5, max: 1.5, small: true, dps: 0, ref: m }); }
      }
    }
  }
  G.barms = G.barms.filter(a => a.delay > 0 || a.rise > 0 || a.life > 0);
}
function castSpikes(a) {
  let best = null, bd = 2.2;
  for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - a.x, m.y - a.y); if (d < bd && dist(m, P) < 12) { bd = d; best = m; } }
  if (!best) { const p = clampCast(a, 8); spikeBurst(p.x, p.y, BS.spikeDmg() * 0.6, BS.spikeR() * 0.7, null); return; }
  spikeBurst(best.x, best.y, BS.spikeDmg(), BS.spikeR(), best);
}
function spikeBurst(x, y, dmg, R, src) {
  for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28 + Math.random() * 0.3; G.bspikes.push({ x, y, a, len: R * (0.6 + Math.random() * 0.4), t: 0.5 }); }
  for (const m of G.zone.monsters) {
    if (m.dead) continue; const d = Math.hypot(m.x - x, m.y - y); if (d > R + m.r) continue;
    m.spiked = G.time + 0.6; m.spikeDmg = dmg;
    hurtMon(m, m === src ? dmg : dmg * 0.8, '#e8e2d0'); aggro(m);
  }
  burst(x, y, '#e8e2d0', 16, 2.8); G.shake = Math.max(G.shake, 1.5); sfx(260, 0.2, 'square', 0.045, -160);
  onSpikeBurst(x, y, dmg, R, src, G.echoSpike);
}
function castShardStorm(a) {
  const n = Math.min(Math.floor(P.shards), BS.stormMax()); P.shards -= n;
  const base = Math.atan2(a.y - P.y, a.x - P.x), dmg = BS.stormDmg();
  const spread = Math.min(1.1, 0.12 * n);
  for (let i = 0; i < n; i++) { const a = base + (n > 1 ? (i / (n - 1) - 0.5) * spread : 0) + rand(-0.03, 0.03); G.bspears.push({ x: P.x + Math.cos(a) * 0.3, y: P.y + Math.sin(a) * 0.3, vx: Math.cos(a) * rand(11, 13), vy: Math.sin(a) * rand(11, 13), t: 0.6, dmg, hit: new Set(), small: true, pierce: 2 + (P.skills.stormpierce > 0 ? 2 : 0), storm: true }); }
  if (P.skills.stormback > 0) { const ax = a.x, ay = a.y; setTimeout(() => { for (let i = 0; i < Math.floor(n / 3); i++) gainShard({ x: ax, y: ay }); }, 650); }
  floatText(P.x, P.y, `${n} shards loosed`, '#e8e2d0'); sfx(600, 0.15, 'square', 0.035, -300);
}
function castSweep() {
  const R = (1.6 + (P.host ? 0.1 * P.host.n : 0)) * (P.skills.sweepwide > 0 ? 1.5 : 1), dmg = BS.sweepDmg();
  for (const m of G.zone.monsters) {
    if (m.dead) continue; const d = dist(m, P); if (d > R + m.r) continue;
    hurtMon(m, dmg, '#e8e2d0'); P.lastHit = m; if (P.skills.sweepshard > 0 && (P.sweepN = (P.sweepN || 0) + 1) % 3 === 0) gainShard(m);
    if (m.rank !== 'boss') moveCircle(m, (m.x - P.x) / (d || 1) * 0.6, (m.y - P.y) / (d || 1) * 0.6);
  }
  parts.push({ ring: true, x: P.x, y: P.y, r: 0.3, max: R, t: 0.3, col: '#e8e2d0' }); P.sweepFx = 0.3; onSweep();
  sfx(300, 0.18, 'sawtooth', 0.035, -200);
}
function castGCharge(a) {
  const d = Math.hypot(a.x - P.x, a.y - P.y) || 1, L = Math.min(d, BS.chargeLen());
  P.dash = { dx: (a.x - P.x) / d, dy: (a.y - P.y) / d, left: L, hit: new Set() };
  P.cast = L / 11 + 0.15; P.iframe = Math.max(P.iframe, 0.15);
  sfx(90, 0.3, 'sawtooth', 0.05, 80);
}
function updateDash(dt) {
  const s = P.dash; if (!s) return;
  const step = Math.min(s.left, 11 * dt), ox = P.x, oy = P.y;
  moveCircle(P, s.dx * step, s.dy * step); s.left -= step;
  if (Math.hypot(P.x - ox, P.y - oy) < step * 0.3) s.left = 0;
  if (Math.random() < 0.6) burst(P.x, P.y, '#8f8a7c', 1, 1);
  if (P.skills.chargetrail > 0) { s.armT = (s.armT || 0) - dt; if (s.armT <= 0) { s.armT = 0.09; G.barms.push({ x: P.x + rand(-0.2, 0.2), y: P.y + rand(-0.2, 0.2), delay: 0.1, rise: 0.2, life: BS.armLife() * 0.6, max: BS.armLife() * 0.6, dps: BS.armDps(), tick: 0, seed: Math.random() * 6.28, lean: rand(-0.4, 0.4) }); } }
  for (const m of G.zone.monsters) {
    if (m.dead || s.hit.has(m) || dist(m, P) > m.r + P.r + 0.35) continue;
    s.hit.add(m); hurtMon(m, BS.chargeDmg(), '#e8e2d0'); P.lastHit = m; G.shake = Math.max(G.shake, 2);
    if (m.rank !== 'boss') { moveCircle(m, -s.dy * 0.9 * (Math.random() < 0.5 ? 1 : -1) + s.dx * 0.4, s.dx * 0.9 * (Math.random() < 0.5 ? 1 : -1) + s.dy * 0.4); m.stun = Math.max(m.stun || 0, P.skills.chargestun > 0 ? 1 : 0.5); }
  }
  if (s.left <= 0) { P.dash = null; P.cast = Math.min(P.cast, 0.1); onChargeEnd(); }
}
// melee extras: Bone Blade cleave and Titanfall
function boneSwing(m) {
  if (!isBone() || !m) return;
  if (P.skills.blade > 0) {
    const n = P.skills.bladecleave > 0 ? 3 : 1, R = 1.4 + BS.hostReach() * 0.5;
    const os = G.zone.monsters.filter(q => !q.dead && q !== m && dist(q, m) < R && dist(q, P) < 2 + BS.hostReach()).sort((a, b) => dist(a, m) - dist(b, m)).slice(0, n);
    for (const o of os) { hurtMon(o, rand(D.wmin, D.wmax) * D.meleeMult * BS.cleave(), '#cfc6ae'); burst(o.x, o.y, '#cfc6ae', 2, 1); }
  }
  if (P.host && P.skills.titan > 0) {
    P.swings = (P.swings + 1) % 3;
    if (P.swings === 0) {
      for (const q of G.zone.monsters) if (!q.dead && dist(q, P) < 1.8 + q.r) { hurtMon(q, BS.weapon() * 1.5, '#e8e2d0'); if (q.rank !== 'boss') q.stun = Math.max(q.stun || 0, 0.4); }
      parts.push({ ring: true, x: P.x, y: P.y, r: 0.3, max: 1.8, t: 0.35, col: '#cfc6ae' }); G.shake = Math.max(G.shake, 3.5); sfx(60, 0.35, 'sawtooth', 0.06, -20);
    }
  }
}

// ------------------------------------------------------------------- hooks used by the shared code
function boneMonTarget(m, best, bd) {
  if (!isBone()) return { best, bd };
  if (m.ctaunt > 0 && G.colossus) return { best: G.colossus, bd: 0 };
  if (m.staunt > 0 && m.stauntBy && G.skels.includes(m.stauntBy)) return { best: m.stauntBy, bd: 0 };
  for (const e of G.skels) { if (e.rise > 0) continue; const d = dist(m, e) + 0.3; if (d < bd) { bd = d; best = e; } }
  if (G.colossus) { const d = dist(m, G.colossus) - 0.2; if (d < bd) { bd = d; best = G.colossus; } }
  return { best, bd };
}
function boneShotHit(s) {
  for (const e of G.skels) if (Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.r) { hurtSkel(e, s.dmg, s.type); return true; }
  const c = G.colossus; if (c && Math.hypot(c.x - s.x, c.y - s.y) < c.r + s.r) { hurtColossus(c, s.dmg, s.type); return true; }
  return false;
}
function boneAoeHurt(x, y, R, dmg, type) {
  for (const e of G.skels.slice()) if (Math.hypot(e.x - x, e.y - y) < R) hurtSkel(e, dmg, type);
  if (G.colossus && Math.hypot(G.colossus.x - x, G.colossus.y - y) < R + G.colossus.r) hurtColossus(G.colossus, dmg, type);
}
function boneZone(z) {
  for (const e of G.skels) { e.x = P.x + rand(-1, 1); e.y = P.y + rand(-1, 1); if (z.solidAt(e.x, e.y)) { e.x = P.x; e.y = P.y; } e.path = null; e.state = 'idle'; e.hold = behOf(e).hold ? { x: e.x, y: e.y } : null; }
  if (G.colossus) { const c = G.colossus; c.x = P.x + 1; c.y = P.y; if (z.solidAt(c.x, c.y)) { c.x = P.x; c.y = P.y; } c.path = null; c.order = null; c.atk = null; }
  G.bspears = []; G.ribcages = []; G.bspikes = []; G.barrows = []; G.bmotes = []; G.barms = []; G.cmd = null; boneZone14();
}
function resetBone() { boneZone14(); P.barmor = 0; G.hornT = 0; G.colRebuild = null; G.barms = []; G.skels = []; G.colossus = null; G.bspears = []; G.ribcages = []; G.bspikes = []; G.barrows = []; G.bmotes = []; G.cmd = null; G.fallen = 0; P.summonT = 0.5; P.marrow = null; P.pulling = false; P.host = null; P.dash = null; P.fusing = false; P.shards = 0; P.shardT = 0; P.rebuildT = 0; }

// ------------------------------------------------------------------- per-frame
function updateBones(dt) {
  const K = P.skills;
  // v0.22d: holding Shard Aura plants your feet and tears bone out of the ground, four times as fast
  P.pulling = !!(K.aura > 0 && P.roll <= 0 && !P.dead && heldSkill('aura'));
  if (P.pulling) { P.path = null; P.pullFx = (P.pullFx || 0) - dt; if (P.pullFx <= 0) { P.pullFx = 0.12; const a = Math.random() * 6.28, r = 0.6 + Math.random() * 1.6; burst(P.x + Math.cos(a) * r, P.y + Math.sin(a) * r, '#8a8068', 2, 0.6); } }
  // the aura: pull shards out of the ground, faster near the dead
  const free = freeCap();
  if (P.shards > free) P.shards = free;
  let rate = BS.rate(); const corpse = nearCorpse();
  if (corpse) rate *= K.deeppull > 0 ? 2.2 : 1.6;
  if (P.shards + inFlight() < free && !P.dead) {
    P.shardT += dt * rate;
    while (P.shardT >= 1) {
      P.shardT -= 1; spawnPull(corpse);
      if (corpse) { corpse.boneLeft = (corpse.boneLeft == null ? 4 : corpse.boneLeft) - 1; if (corpse.boneLeft <= 0) corpse.drained = true; }
    }
  } else P.shardT = Math.min(P.shardT, 0.9);
  // skeletons claw their way up out of the aura whenever there is room
  P.summonT -= dt;
  const want = wantTotal();
  if (P.marrow == null) P.marrow = BS.marrowCap();
  if (!P.dead) P.marrow = Math.min(BS.marrowCap(), P.marrow + dt * BS.marrowRate());
  if (K.raise > 0 && !P.dead && !P.fusing && liveSkels().length < want && nextSquad() >= 0 && P.summonT <= 0 && reservedShards() + BS.skelCost() <= D.shardCap) {
    P.summonT = BS.summonT();   // v0.52: marrow is only the name of the Ossuarch's mana; skeletons rise on shards alone
    const a = Math.random() * 6.28, p = clampCast({ x: P.x + Math.cos(a) * 1.3, y: P.y + Math.sin(a) * 1.3 }, 2);
    raiseSkel(p.x, p.y); sfx(160, 0.2, 'square', 0.03, 90);
  }
  // holding the Colossus or Bone Host: feed skeletons in one by one
  const held = P.roll <= 0 && !P.dead && !G.paused;
  const chanCol = held && heldSkill('colossus') && K.colossus > 0, chanHost = held && heldSkill('host') && K.host > 0;
  P.fusing = chanCol || chanHost; P.hostChan = chanHost;
  if (P.fusing) { P.path = null; P.fuseT -= dt; if (P.fuseT <= 0) { P.fuseT = 0.4; if (chanCol) fuseOne(); else hostOne(); } } else { P.fuseT = 0; P.fuseMsg = false; }
  // a quick tap of Bone Host sheds the carapace
  if (P.hostHeldPrev && !chanHost && P.host && !P.hostFused && G.time - (P.hostPressT || 0) < 0.3) toggleHost();
  P.hostHeldPrev = chanHost;
  // hold to repeat quick casts
  for (const id of ['spear', 'bscythe', 'crush', 'siphon']) if (heldSkill(id) && P.cast <= 0 && P.roll <= 0 && !P.dead) boneCast(id);
  updateDash(dt);
  if (G.cmd) { G.cmd.t -= dt; if (G.cmd.t <= 0 || (G.cmd.ref && G.cmd.ref.dead)) G.cmd = null; }
  for (const m of G.zone.monsters) { if (m.ctaunt > 0) m.ctaunt -= dt; if (m.staunt > 0) m.staunt -= dt; if (m.root > 0) m.root -= dt; }
  // squads shrunk in army orders: the extra skeletons crumble back into the aura
  P.trimT = (P.trimT || 0) - dt;
  if (P.trimT <= 0) { P.trimT = 0.6; for (let i = 0; i < P.squads.length; i++) { const mine = G.skels.filter(e => e.sq === i); if (mine.length > P.squads[i].n) { const e = mine[mine.length - 1]; skelDies(e, true); gainShard(e); } } }
  P.sweepFx = Math.max(0, (P.sweepFx || 0) - dt);
  updateBones14(dt);
  updateSkels(dt); updateColossus(dt); updateSpears(dt); updateRibcages(dt); updateArms(dt);
  for (const s of G.bspikes) s.t -= dt; G.bspikes = G.bspikes.filter(s => s.t > 0);
  updateMotes(dt);
}
