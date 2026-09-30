
// =================================================================== THE INVERTED TRIUNE
// Diablo 2 leveling rules, the three elements, and the arcana web: tarot cards that change how skills work.
// Points (Arcana) come only from bosses, guardians and hidden shrines. Majors are set upright or reversed;
// you can flip them for free at any lantern.
Object.assign(G, { dtethers: [], strails2: [], sswords: [], arcShots: [], soulw: [], sacThrows: [], bswords: [], fspawn: null, fires: [], zaps: [], ghosts: [], caltrops: [], strail: [], thrusts: [], timeStop: 0, silenced: {}, diff: 0 });
Object.assign(P, { arc: newArc(), done: [], respecs: 1, hard: defaultSkills('animancer') });
function newArc() { return { pts: 0, taken: {}, both: null, maj: 0, got: 0, majAct: 0 }; }

// ------------------------------------------------------------------- D2 leveling
const LEVEL_CAP = 99;
const DEATH_XP = [0, 0.05, 0.1]; // Normal, Nightmare, Hell: share of the level's XP lost on death
// hard points live in P.hard; P.skills is the effective level (hard points + items + cards)
function skBonus(k, s) {
  if (!SK[k] || SK[k].cls !== P.cls) return 0;
  let b = (s.skall || 0) + (s['skt' + SK[k].tab] || 0);
  if (aR('v_unmade')) b += Math.min(4, arcMajors());
  return b;
}
function applyHard(s) {
  if (!P.hard) P.hard = { ...P.skills };
  for (const k of SK_ORDER) { const h = P.hard[k] || 0; P.skills[k] = h > 0 ? h + skBonus(k, s) : 0; }
}
function fullRespec(free) {
  if (!free) { if (P.respecs <= 0) { say('No resets left: bosses leave Hollow Tokens', 1.8); return false; } P.respecs--; }
  let spent = 0, base = 0; const d = defaultSkills();
  for (const k of SK_ORDER) spent += P.hard[k] || 0;
  for (const k in d) base += d[k];
  P.skillPts += Math.max(0, spent - base); P.hard = d;
  let sp = 0; for (const k in BASE_ATTRS) sp += P.attrs[k] - BASE_ATTRS[k];
  P.statPts += Math.max(0, sp); P.attrs = { ...BASE_ATTRS };
  P.arc.pts += arcSpent(); P.arc.taken = {}; P.arc.both = null;
  P.shell = null; P.suit = null; P.maiden = 0; P.ribArmor = 0; if (P.host) { P.host = null; } P.hazeMantle = 0; P.wornTraps = [];
  P.alloc = { beam: 0, prism: 0 }; P.left = 'attack'; P.right = defaultRight(); P.keys = defaultKeys();
  G.golem = null; G.flyShield = null; G.great = null; G.anvils = []; G.pillars = []; G.echoes = []; G.tether = null; G.storms = []; G.leashes = []; G.totems = []; G.marks = [];
  if (P.wraith) P.wraith = false;
  D = derive(); P.hp = Math.min(P.hp, D.maxHp); P.mana = Math.min(P.mana, D.maxMana); rearm();
  say(free ? 'Everything reset' : `Skills, attributes and Arcana reset · ${P.respecs} reset${P.respecs === 1 ? '' : 's'} left`, 2.2);
  return true;
}
// a full reset spends a Hollow Token, so it asks twice
function armReset() {
  if (P.respecs <= 0) { say('No resets left: bosses leave Hollow Tokens', 1.8); return; }
  if (G.resetArm > G.time) { G.resetArm = 0; fullRespec(); return; }
  G.resetArm = G.time + 3; say('Click again to spend a Hollow Token: skills, attributes and Arcana all reset', 3);
}
function deathXpLoss() {
  const k = DEATH_XP[G.diff || 0] || 0; if (!k || P.level >= LEVEL_CAP) return;
  const lose = Math.min(P.xp, Math.floor(xpNext(P.level) * k));
  if (lose > 0) { P.xp -= lose; say(`Lost ${lose} experience`, 2); }
}

// ------------------------------------------------------------------- rewards: bosses, guardians and hidden shrines
function gainArcana(n, why) {
  P.arc.pts += n; banner(n > 1 ? `${n} ARCANA` : 'ARCANUM', '#b48ad9', 3);
  say(`${why}: +${n} Arcana (press A)`, 3); sfx(330, 0.5, 'sine', 0.05, 330); sfx(495, 0.6, 'sine', 0.04, 250);
}
function once(key) { if (P.done.includes(key)) return false; P.done.push(key); return true; }
function arcanaOnKill(m) {
  const z = G.zone;
  lanternKill(m);
  if (m.burn && Math.random() < 0.25) fireGround(m.x, m.y, 0.8, m.burn.dps, 3);
  if (m.poison) { const ch = 0.15 * (P.skills.cbloom > 0 ? 2 : 1) + (aM('zm_carrion') ? 0.15 : 0); if (Math.random() < ch) addCloud(m.x, m.y, 1.3, 4, m.poison.dps * 0.8, 'poison'); }
  if (m.rank === 'boss' && z.boss === m && once('boss:' + z.id)) {
    const sk = z.id === 'crypt' ? 1 : 2;
    P.skillPts += sk; P.respecs++;
    setTimeout(() => { gainArcana(2, m.b.name); say(`+${sk} skill point${sk > 1 ? 's' : ''} · +1 Hollow Token (a full reset) · +2 Arcana`, 4); }, 1600);
  }
  if (m.pack === 'lord' && z.id === 'barrow' && !z.monsters.some(o => !o.dead && o.pack === 'lord') && once('lord:barrow')) { P.skillPts += 1; gainArcana(1, 'The Barrow lord falls'); say('Barrow cleared: +1 skill point · +1 Arcana', 3.5); }
  if ((m.pack === 'fne' || m.pack === 'fsw') && !z.monsters.some(o => !o.dead && (o.pack === 'fne' || o.pack === 'fsw')) && once('guard:fen')) { P.statPts += 5; gainArcana(1, 'The Fen guardians fall'); say('Tome of the Drowned: +5 attribute points · +1 Arcana', 3.5); }
}
// every zone hides one Arcana shrine somewhere far from its lantern
function arcanaZone(z) {
  if (z.arcPlaced) return; z.arcPlaced = true;
  const lan = z.objects.find(o => o.type === 'lantern') || { x: z.w / 2, y: z.h / 2 };
  let best = null, bd = 0;
  for (let i = 0; i < 400; i++) {
    const x = randi(2, z.w - 3), y = randi(2, z.h - 3);
    if (z.solidAt(x + 0.5, y + 0.5) || z.objects.some(o => Math.hypot(o.x - x, o.y - y) < 3)) continue;
    let open = 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!z.solidAt(x + 0.5 + dx, y + 0.5 + dy)) open++;
    if (open < 4) continue;
    const d = Math.hypot(x - lan.x, y - lan.y); if (d > bd) { bd = d; best = { x, y }; }
    if (bd > 40) break;
  }
  if (best) z.objects.push({ type: 'shrine', kind: 'arcana', x: best.x + 0.5, y: best.y + 0.5, used: P.done.includes('shrine:' + z.id) });
}
function arcanaShrine(o) {
  o.used = true;
  if (once('shrine:' + G.zone.id)) gainArcana(1, 'A hidden Arcana shrine');
  burst(o.x, o.y, '#b48ad9', 26, 2.8);
}

// ------------------------------------------------------------------- elements: Pyre (fire), Rime (cold), Storm (lightning)
function burnMon(m, dps, t) {
  if (m.dead || dps <= 0) return;
  if (!m.burn || m.burn.dps * m.burn.t < dps * t) m.burn = { dps, t, tick: 0.25 }; else m.burn.t = Math.max(m.burn.t, t);
  aggro(m);
}
function chillMon(m, amt) {
  if (m.dead) return;
  m.cold = (m.cold || 0) + amt * (m.rank === 'boss' ? 0.35 : 1); m.chillT = 3;
  m.slow = Math.max(m.slow || 0, 0.4);
  if (m.cold >= 1) {
    m.cold = 0; m.frozen = m.rank === 'boss' ? 0.6 : 1.5; m.stun = Math.max(m.stun || 0, m.frozen);
    burst(m.x, m.y, '#bfe8ff', 8, 1.6); sfx(1500, 0.12, 'triangle', 0.03, -600);
  }
  aggro(m); shatterCheck(m);
}
function shockArc(from, dmg, jumps, hit, col) {
  hit = hit || new Set();
  let best = null, bd = 3.8;
  for (const m of G.zone.monsters) { if (m.dead || hit.has(m)) continue; const d = Math.hypot(m.x - from.x, m.y - from.y); if (d < bd) { bd = d; best = m; } }
  if (!best) return;
  hit.add(best); G.zaps.push({ x0: from.x, y0: from.y, x1: best.x, y1: best.y, t: 0.18, seed: Math.random() * 99, col });
  hurtMon(best, dmg, col || '#d8f3ff'); if (!col && Math.random() < 0.3 && best.rank !== 'boss') best.stun = Math.max(best.stun || 0, 0.15);
  if (jumps > 1) { const b = best; setTimeout(() => shockArc(b, dmg * 0.75, jumps - 1, hit, col), 60); }
}
function fireGround(x, y, R, dps, t) { if (G.zone.solidAt(x, y)) return; G.fires.push({ x, y, R, dps, t, max: t, tick: 0 }); while (G.fires.length > 40) G.fires.shift(); }
function updateElements(dt) {
  G.noProc = true;
  for (const m of G.zone.monsters) {
    if (m.dead) continue;
    if (m.burn) {
      const b = m.burn; b.t -= dt; b.tick -= dt;
      if (b.tick <= 0) {
        b.tick = 0.5; hurtMon(m, b.dps * 0.5, '#ff9a3c');
        // fire creeps: a low chance to catch the nearest enemy, or to set the ground alight
        if (!m.dead && Math.random() < 0.1) { let o = null, bd = 2; for (const q of G.zone.monsters) { if (q.dead || q === m || q.burn) continue; const d = dist(q, m); if (d < bd) { bd = d; o = q; } } if (o) { burnMon(o, b.dps * 0.7, 2.5); G.zaps.push({ x0: m.x, y0: m.y, x1: o.x, y1: o.y, t: 0.15, seed: 1, col: '#ff9a3c' }); } }
        if (!m.dead && Math.random() < 0.05) fireGround(m.x, m.y, 0.6, b.dps * 0.5, 3);
      }
      if (Math.random() < 0.35) parts.push({ x: m.x + rand(-0.15, 0.15), y: m.y + rand(-0.15, 0.15), z: 6 + Math.random() * 8, vx: 0, vy: 0, vz: 18, t: 0.4, col: Math.random() < 0.5 ? '#ff9a3c' : '#ffd36a' });
      if (m.burn && m.burn.t <= 0) m.burn = null;
    }
    if (!m.dead && m.poison) {
      const q = m.poison; q.t -= dt; q.tick -= dt;
      if (q.tick <= 0) { q.tick = 0.5; hurtMon(m, q.dps * 0.5, '#b070e0'); }
      if (Math.random() < 0.25) parts.push({ x: m.x + rand(-0.15, 0.15), y: m.y + rand(-0.15, 0.15), z: 4 + Math.random() * 8, vx: 0, vy: 0, vz: 6, t: 0.5, col: '#8a4ab8' });
      if (m.poison && m.poison.t <= 0) m.poison = null;
    }
    if (m.frozen > 0) m.frozen -= dt;
    if (m.chillT > 0) { m.chillT -= dt; if (m.chillT <= 0) m.cold = 0; else m.slow = Math.max(m.slow || 0, 0.3); }
    if (m.confused > 0) m.confused -= dt;
  }
  for (const f of G.fires) {
    f.t -= dt; f.tick -= dt;
    if (f.tick <= 0) { f.tick = 0.5; for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - f.x, m.y - f.y) < f.R + m.r) burnMon(m, f.dps, 2); }
    if (Math.random() < 0.5) parts.push({ x: f.x + rand(-f.R, f.R) * 0.7, y: f.y + rand(-f.R, f.R) * 0.7, z: 2, vx: 0, vy: 0, vz: 16, t: 0.35, col: Math.random() < 0.5 ? '#ff9a3c' : '#c8553d' });
  }
  G.fires = G.fires.filter(f => f.t > 0);
  // clouds: poison, haze (confusion), frost (chill)
  for (const c of G.clouds) {
    c.t -= dt; c.tick -= dt;
    if (c.tick > 0) continue; c.tick = 0.5;
    for (const m of G.zone.monsters) {
      if (m.dead || Math.abs(m.x - c.x) > c.R + 1 || Math.hypot(m.x - c.x, m.y - c.y) > c.R + m.r) continue;
      if (c.kind === 'poison') { if (c.dps > 0) poisonMon(m, c.dps, 2, 1, true); if (aM('z_veiled') && Math.random() < 0.3) confuse(m, 1); if (isMias()) warpProc(m, c.x, c.y); }
      else if (c.kind === 'haze') { if (isMias() && aU('z_hanged') && !m.hangT) { m.hangT = 1; m.root = Math.max(m.root || 0, 1.5); } confuse(m, 1.2); }
      else if (c.kind === 'frost') { chillMon(m, 0.2); m.slow = Math.max(m.slow || 0, 0.5); }
    }
  }
  G.clouds = G.clouds.filter(c => c.t > 0);
  for (const z of G.zaps) z.t -= dt; G.zaps = G.zaps.filter(z => z.t > 0);
  G.noProc = false;
}
// poison: stacks only when a skill says so; a hit now and then lingers as a small cloud
function poisonMon(m, dps, t, stacks, noLinger) {
  if (m.dead || dps <= 0) return;
  const q = m.poison;
  if (!q) m.poison = { dps, t, tick: 0.3, n: 1 };
  else if ((stacks || 1) > 1 && q.n < stacks) { q.dps += dps; q.n++; q.t = Math.max(q.t, t); }
  else { if (dps >= q.dps) q.dps = dps; q.t = Math.max(q.t, t); }
  aggro(m);
  if (!noLinger && Math.random() < 0.06 && (m.lingerT || 0) < G.time) { m.lingerT = G.time + 1.5; addCloud(m.x, m.y, 0.9, 3, dps * 0.6, 'poison'); }
}
// shatter: a chilled enemy near death may burst into ice
function shatterCheck(m) {
  if (m.dead || !(m.chillT > 0 || m.frozen > 0) || m.rank === 'boss') return;
  const thr = 0.1;
  if (m.hp < m.max * thr && Math.random() < 0.35) {
    burst(m.x, m.y, '#bfe8ff', 20, 2.6); floatText(m.x, m.y, 'shatter', '#bfe8ff'); sfx(1800, 0.2, 'triangle', 0.04, -900);
    m.frozen = Math.max(m.frozen || 0, 0.01); G.noProc = true; hurtMon(m, m.hp + 1, '#bfe8ff'); G.noProc = false;
  }
}
// elemental damage rolled on gear rides on your weapon attacks only (not spells, minions or damage over time)
function elemProc(m) {
  if (G.noProc || !D || m.dead || (m.procT || 0) > G.time) return;
  if (!(D.fire > 0 || D.cold > 0 || D.ltng > 0 || D.psn > 0)) return;
  m.procT = G.time + 0.35; G.noProc = true;
  try {
    if (D.fire > 0) { hurtMon(m, D.fire * 0.5, '#ff9a3c'); burnMon(m, D.fire * 0.5, 3); }
    if (D.cold > 0 && !m.dead) { hurtMon(m, D.cold, '#bfe8ff'); chillMon(m, 0.3); }
    if (D.ltng > 0 && !m.dead) { hurtMon(m, D.ltng, '#d8f3ff'); if (Math.random() < 0.25 && m.rank !== 'boss') m.stun = Math.max(m.stun || 0, 0.15); if (Math.random() < 0.25) shockArc(m, D.ltng * 0.6, 1, new Set([m])); }
    if (D.psn > 0 && !m.dead) poisonMon(m, D.psn / 2, 3);
  } finally { G.noProc = false; }
}
// elemental damage rolled on gear rides on your weapon attacks
function arcSwing(m) {
  if (!m || !D) return;
  elemProc(m);
  miasSwing(m);
  if (P.shell && !m.dead) {
    shellHit(m);
    const w = WS.weapon();
    if (w.id === 'sword' && Math.random() < 0.4) { hurtMon(m, rand(D.wmin, D.wmax) * D.meleeMult, '#cfd6e0'); floatText(P.x, P.y, 'twice', '#aab4c2'); }
    else if (w.id === 'axe') { for (const o of G.zone.monsters) { if (o.dead || o === m) continue; const dx = o.x - P.x, dy = o.y - P.y, d = Math.hypot(dx, dy), ax = m.x - P.x, ay = m.y - P.y, al = Math.hypot(ax, ay) || 1; if (d < 1.6 + o.r && (dx * ax + dy * ay) / (d * al || 1) > Math.cos(1.1)) hurtMon(o, rand(D.wmin, D.wmax) * D.meleeMult * 0.7, '#cfd6e0'); } }
    else if (w.id === 'flail') { for (const o of G.zone.monsters) if (!o.dead && Math.hypot(o.x - m.x, o.y - m.y) < 1 + o.r) { if (o !== m) hurtMon(o, rand(D.wmin, D.wmax) * D.meleeMult * 0.6, '#cfd6e0'); if (o.rank !== 'boss') o.stun = Math.max(o.stun || 0, 0.5); } parts.push({ ring: true, x: m.x, y: m.y, r: 0.2, max: 1, t: 0.3, col: '#cfd6e0' }); G.shake = Math.max(G.shake, 2); }
  }
  if (P.cls === 'animancer' && aR('a_lantern') && P.skills.totem > 0 && !m.dead) {
    for (const o of G.zone.monsters) if (!o.dead && o !== m && Math.hypot(o.x - m.x, o.y - m.y) < 1.1 + o.r) hurtMon(o, rand(D.wmin, D.wmax) * D.meleeMult * 0.6 + WS.totemDps() * 0.25, '#ffe2a0');
    hurtMon(m, WS.totemDps() * 0.35, '#ffe2a0'); parts.push({ ring: true, x: m.x, y: m.y, r: 0.2, max: 1.1, t: 0.3, col: '#ffe2a0' });
    P.flailN = (P.flailN || 0) + 1; if (P.flailN % 2 === 0 && P.wisps.length < effCap()) { spawnWisp(); const w = P.wisps[P.wisps.length - 1]; if (w) { w.x = m.x; w.y = m.y; } }
  }
  if (isBone() && aR('o_maelstrom')) aimShard(m);
  if (isBone() && aM('c_throw')) { P.throwN = (P.throwN || 0) + 1; if (P.throwN % 4 === 0) throwShard(m); }
}

// ------------------------------------------------------------------- the cards
// kind: minor (1 point, one rule), major (upright or reversed), hybrid (a borrowed god's card on an edge), hollow (a Void pip), void (Ur-Nihl's cards)
const ARC = {
  // Ossurarch · Ossuary
  o_pyredead: { cls: 'ossumancer', kind: 'major', name: 'The Pyre-Dead', up: 'Your skeletons are truly on fire: they run faster, hunt anything in sight, strike faster and burn everything next to them, but the fire eats them fast (6% of their life a second) and they crumble; their bone returns to your aura.', rev: 'Skeletons don\'t burn while they stand. When they fall they burst into fire and leave the ground burning.' },
  o_bowyer: { cls: 'ossumancer', kind: 'major', name: 'The Bowyer', up: 'Squads can take the Bow loadout: archers shoot from range.', rev: 'Squads can take the Bow loadout, and archers become harpooners: their shots hook enemies and drag them toward your melee skeletons.' },
  o_chanter: { cls: 'ossumancer', kind: 'major', name: 'The Grave-Chanter', up: 'Squads can take the Mage loadout: skeleton mages cast a small copy of the last Marrow spell you cast.', rev: 'Squads can take the Mage loadout, but mages don\'t fight. They chant the bone out of the earth: each one near you adds 50% to your aura\'s pull.' },
  o_oath: { cls: 'ossumancer', kind: 'major', name: 'The Oathbound', up: 'Skeletons hold a line: they never stray more than 4 yd from you and take 30% less damage.', rev: 'Skeletons ignore their orders and hunt anything within 12 yd. Each kill makes them all faster for 5 s (up to 5 times).' },
  o_shove: { cls: 'ossumancer', kind: 'minor', name: 'Shoving Dead', up: 'Skeleton melee hits shove enemies back a step.' },
  o_rise: { cls: 'ossumancer', kind: 'minor', name: 'Grave Rise', up: 'A skeleton clawing out of the ground cuts everything around it.' },
  o_return: { cls: 'ossumancer', kind: 'minor', name: 'Bone Returns', up: 'A fallen skeleton sends 2 shards straight back to your aura.' },
  o_stride: { cls: 'ossumancer', kind: 'minor', name: 'Colossal Stride', up: 'The Colossus shoves enemies aside as it walks, staggering them.' },
  o_herald: { cls: 'ossumancer', kind: 'minor', name: 'Heralds of Bone', up: 'While you direct the Colossus, your skeletons move 25% faster.' },
  o_rattle: { cls: 'ossumancer', kind: 'minor', name: 'The Rattle', up: 'A skeleton rising from the ground taunts enemies within 3 yd for 2 s.' },
  // Ossurarch · Marrow
  o_tower: { cls: 'ossumancer', kind: 'major', name: 'The Tower', up: 'Bone Spear splits into 3 splinters on the first enemy it hits.', rev: 'Melee: Bone Spear becomes a thrust from your hand that hits everything in a 3 yd line at once, for half the cost.' },
  o_cage: { cls: 'ossumancer', kind: 'major', name: 'The Cage-Warden', up: 'Rib Cage springs a cage around each of up to 3 enemies near the cursor.', rev: 'Rib Cage closes around you instead: while it lasts you take 35% less damage and anything that hits you is thrown back and cut.' },
  o_grasp: { cls: 'ossumancer', kind: 'major', name: 'The Grasping Earth', up: 'Bone Arms grab: the first enemy each arm catches is held in place for 1.5 s.', rev: 'Melee: for as long as the arms would last, bone arms erupt around your feet as you walk instead of in a line.' },
  o_rime: { cls: 'ossumancer', kind: 'major', name: 'Rime', el: 'cold', up: 'Bone Spikes and Shard Storm chill. Frozen enemies that die shatter into shards for your aura.', rev: 'Your shard aura chills anything that strikes you in melee, but your spells don\'t chill.' },
  m_caltrop: { cls: 'ossumancer', kind: 'minor', name: 'Caltrops', up: 'Bone Spear leaves a caltrop where it stops. It cuts and slows for 3 s.' },
  m_return: { cls: 'ossumancer', kind: 'minor', name: 'Boomerang Bone', up: 'Bone Spear flies back to you when its flight ends, cutting again on the way.' },
  m_hooks: { cls: 'ossumancer', kind: 'minor', name: 'Rib Hooks', up: 'Rib Cage drags the enemies inside it toward its center.' },
  m_echo: { cls: 'ossumancer', kind: 'minor', name: 'Spike Echo', up: 'Bone Spikes erupt a second time 0.6 s later at half damage.' },
  m_scatter: { cls: 'ossumancer', kind: 'minor', name: 'Scatter', up: 'Shard Storm shards that fall to the ground can be pulled back into your aura.' },
  m_tread: { cls: 'ossumancer', kind: 'minor', name: 'Marrow Tread', up: 'Bone Arms knock enemies off their feet as they rise.' },
  // Ossurarch · Carapace
  o_reliq: { cls: 'ossumancer', kind: 'major', name: 'The Reliquary', up: 'While you wear the Bone Host, missiles that strike you are thrown back as bone.', rev: 'Ranged: wearing the Bone Host roots you in place as a bone turret. It fires the carapace at the nearest enemy as shards.' },
  o_maelstrom: { cls: 'ossumancer', kind: 'major', name: 'The Maelstrom', up: 'The shard aura spins wide and slow, cutting everything within 3 yd.', rev: 'Ranged: every attack you make also flings a shard from your aura at the target, but the aura no longer turns blows aside.' },
  c_trail: { cls: 'ossumancer', kind: 'minor', name: 'Shard Trail', up: 'Dodge rolls leave a trail of shards that cut enemies crossing them.' },
  c_fling: { cls: 'ossumancer', kind: 'minor', name: 'Flung Shards', up: 'Scythe Sweep flings 4 shards outward.' },
  c_crash: { cls: 'ossumancer', kind: 'minor', name: 'Crash', up: 'Grinding Charge ends in a shockwave.' },
  c_spines: { cls: 'ossumancer', kind: 'minor', name: 'Carapace Spines', up: 'When your Bone Host carapace cracks, its shards burst outward and cut.' },
  c_grind: { cls: 'ossumancer', kind: 'minor', name: 'Grinding Pull', up: 'Shards your aura pulls through enemies slow them.' },
  c_throw: { cls: 'ossumancer', kind: 'minor', name: 'Thrown Shard', up: 'Every fourth weapon hit throws a shard in a straight line.' },
  // Ossurarch · hybrids
  o_marrowkin: { cls: 'ossumancer', kind: 'hybrid', name: 'The Marrow-Kin', gods: 'Tower + Wheel', up: 'Blood from your kills hardens into bone: a third of them burst into spikes.' },
  o_revenant: { cls: 'ossumancer', kind: 'hybrid', name: 'The Revenant', gods: 'Lantern + Tower', up: 'A fallen skeleton rises as a spirit for 5 s and keeps fighting.' },
  // Hemomancer · Brood
  h_graft: { cls: 'hemomancer', kind: 'major', name: 'The Graft-Father', up: 'Three spawnlings that touch fuse into a chimera: bigger, slower, with a bigger bite and burst.', rev: 'Up to 4 spawnlings ride on your body instead of walking. Your weapon hits get their bites, and Rabid Charge flings them off at the enemy.' },
  h_clutch: { cls: 'hemomancer', kind: 'major', name: 'The Clutch', up: 'Tumors that land without hitting anything lie in wait and hatch into a clutch when an enemy walks close. Every tumor is a trap.', rev: 'Your tumors are fat and slow: each bursts harder and wider, into three spawnlings.' },
  h_giant: { cls: 'hemomancer', kind: 'major', name: 'The Hollow Giant', up: 'When the Flesh Golem drops below half life it tears off a Flesh Spawn, a half-size golem that fights for 20 s.', rev: 'Melee: you wear the golem. You are huge, slow and hit hard, it soaks most blows, and your brood hatches from your body.' },
  h_pyre: { cls: 'hemomancer', kind: 'major', name: 'Pyre', el: 'fire', up: 'Spawnlings burn: their bites set enemies on fire, and they die in a burst of flame.', rev: 'Blood Oozes spit burning shards.' },
  b_scurry: { cls: 'hemomancer', kind: 'minor', name: 'Scurry', up: 'Spawnlings move 25% faster.' },
  b_twin: { cls: 'hemomancer', kind: 'minor', name: 'Twin Birth', up: 'Each corpse you hatch has a 35% chance to give one more spawnling.' },
  b_wall: { cls: 'hemomancer', kind: 'minor', name: 'Tumor Wall', up: 'Tumors lying on the ground stop enemy missiles.' },
  b_throes: { cls: 'hemomancer', kind: 'minor', name: 'Death Throes', up: 'A spawnling that dies bites everything next to it.' },
  b_glut: { cls: 'hemomancer', kind: 'minor', name: 'Glut', up: 'The Flesh Golem eats twice as fast and heals 10% more from each meal.' },
  b_lurch: { cls: 'hemomancer', kind: 'minor', name: 'Quivering Oozes', up: 'Blood Oozes move 40% faster and spit twice as often.' },
  // Hemomancer · Blood
  h_tide: { cls: 'hemomancer', kind: 'major', name: 'The Crimson Tide', up: 'Blood Vomit gouts often split into three after the first body they soak through.', rev: 'Melee: a sword of blood sweeps an arc in front of you and leaves a pool.' },
  h_leech: { cls: 'hemomancer', kind: 'major', name: 'The Tithe-Drinker', up: 'Vein Whip drains 2% of your life for every enemy it hits.', rev: 'Ranged: the veins shoot out as a hooked tendril up to 7 yd and drag the first enemy to you.' },
  h_blight: { cls: 'hemomancer', kind: 'major', name: 'The Blood-Queen', up: 'Bleeding spreads: every 2 s a bleeding enemy passes its bleed to its nearest neighbor.', rev: 'Bleeding doesn\'t tick. It gathers, and bursts all at once for 150% when it ends.' },
  h_rime: { cls: 'hemomancer', kind: 'major', name: 'Rime', el: 'cold', up: 'Blood freezes: bleeding enemies are chilled, and a long bleed freezes them solid.', rev: 'Blood pools freeze into ice. Enemies that step on them slip and can\'t act for 1 s.' },
  l_drag: { cls: 'hemomancer', kind: 'minor', name: 'Undertow', up: 'Hemorrhage drags the enemies around its target in toward it.' },
  l_sympathy: { cls: 'hemomancer', kind: 'minor', name: 'Sympathetic Burst', up: 'Corpse Burst makes everything it hits bleed.' },
  l_clot: { cls: 'hemomancer', kind: 'minor', name: 'Clotting', up: 'Blood Vomit splashes root what they hit for 0.6 s.' },
  l_lash: { cls: 'hemomancer', kind: 'minor', name: 'Deep Lash', up: 'Vein Whip\'s bleeding lasts twice as long.' },
  l_wind: { cls: 'hemomancer', kind: 'minor', name: 'Scent of Blood', up: 'Blood Frenzy reaches twice as far.' },
  l_spread: { cls: 'hemomancer', kind: 'minor', name: 'Spreading Pools', up: 'Blood pools are 30% wider.' },
  // Hemomancer · Flesh
  h_glutton: { cls: 'hemomancer', kind: 'major', name: 'The Glutton', up: 'Each Devour grows an extra mutation you have learned but aren\'t wearing, for 10 s.', rev: 'Ranged: Devour doesn\'t feed you. You vomit what you ate as a cone of blood and gore at the cursor.' },
  h_heart: { cls: 'hemomancer', kind: 'major', name: 'The Bleeding Heart', up: 'Above 80% Vitae, your skills cost no life at all.', rev: 'Your skills take no Vitae, only raw life, and Vitae becomes a shield that soaks 70% of every blow.' },
  f_gnash: { cls: 'hemomancer', kind: 'minor', name: 'Gnashing Maw', up: 'Belly Maw blows also bite a second enemy next to the first.' },
  f_shed: { cls: 'hemomancer', kind: 'minor', name: 'Shed Plates', up: 'When you are struck, Chitin Plates may shed a plate that cuts the attacker.' },
  f_quick: { cls: 'hemomancer', kind: 'minor', name: 'Quick Meal', up: 'Devour takes no time and gives 50% more Vitae.' },
  f_gills: { cls: 'hemomancer', kind: 'minor', name: 'Deep Gills', up: 'Blood Gills work up to 1 yd from a pool.' },
  f_rain: { cls: 'hemomancer', kind: 'minor', name: 'Tumor Rain', up: 'Tumor Hump spawn burst 50% wider.' },
  f_coil: { cls: 'hemomancer', kind: 'minor', name: 'Coiling Tentacles', up: 'Tentacles hold what they catch for 1 s.' },
  // Hemomancer · hybrids
  hk_marrow: { cls: 'hemomancer', kind: 'hybrid', name: 'The Marrow-Kin', gods: 'Tower + Wheel', up: 'Spawnlings grow bone plates: they take 30% less damage and burst into bone shards when they die.' },
  hk_hunger: { cls: 'hemomancer', kind: 'hybrid', name: 'The Hungering Aether', gods: 'Wheel + Lantern', up: 'Your kills leave soul wisps that drift to you and refill 3% Vitae each.' },
  // Animancer · Mirror
  a_anvil: { cls: 'animancer', kind: 'major', name: 'The Anvil', up: 'The Iron Golem\'s blows leave splinters of mirror-glass on the ground that cut enemies walking through it.', rev: 'Melee: you wear the golem as a shell of polished iron. It soaks half of every blow, and your weapon strikes like the golem\'s loadout (sword, axe or flail).' },
  a_maiden: { cls: 'animancer', kind: 'major', name: 'The Maiden\'s Kiss', up: 'The Hall of Mirrors also drags enemies within 3 yd into the cage.', rev: 'The Hall of Mirrors closes on you instead: while it lasts, melee attackers take 60% of their blow back, but you move 20% slower.' },
  a_storm: { cls: 'animancer', kind: 'major', name: 'Storm', el: 'lightning', up: 'Standing mirrors call lightning down on the nearest enemy every second.', rev: 'Shield Toss arcs lightning between everything it hits.' },
  i_quake: { cls: 'animancer', kind: 'minor', name: 'Aftershock', up: 'Rising mirrors stun twice as long.' },
  i_rust: { cls: 'animancer', kind: 'minor', name: 'Tarnish', up: 'Enemies next to your mirrors take 15% more damage.' },
  i_stride: { cls: 'animancer', kind: 'minor', name: 'Quicksilver Stride', up: 'The golem moves 25% faster.' },
  i_rally: { cls: 'animancer', kind: 'minor', name: 'Rally', up: 'When the golem rises from dormancy it mends 15% of your life.' },
  i_shield: { cls: 'animancer', kind: 'minor', name: 'Wide Arc', up: 'The Mirror Shield flies 50% farther.' },
  i_spikes: { cls: 'animancer', kind: 'minor', name: 'Standing Shards', up: 'Mirror Fissure leaves one more mirror standing.' },
  // Animancer · Anima
  a_choir: { cls: 'animancer', kind: 'major', name: 'The Choir', up: 'Every 2 s your whole choir strikes together: revenants dive at one target and darting wisps loose at once.', rev: 'A revenant wisp that strikes an enemy dives into it and possesses it for 3 s. The possessed fights for you.' },
  a_bell: { cls: 'animancer', kind: 'major', name: 'The Bell-Warden', up: 'Every fifth spell rings a bell that stuns enemies within 3.5 yd for 0.5 s.', rev: 'Enemies within 5 yd can\'t cast or shoot, and neither can you for 1 s after each spell.' },
  a_lantern: { cls: 'animancer', kind: 'major', name: 'The Lantern-Bearer', up: 'Your Soul Lantern follows you instead of staying planted.', rev: 'Melee: you swing the lantern as a flail. Each blow splashes around the target, and every other blow frees a wisp.' },
  w_swift: { cls: 'animancer', kind: 'minor', name: 'Swift Wisps', up: 'Wisps regrow 20% faster.' },
  w_ember: { cls: 'animancer', kind: 'minor', name: 'Long Flight', up: 'Darting and splitting wisps ricochet once more before they fly home.' },
  w_host: { cls: 'animancer', kind: 'minor', name: 'Great Host', up: 'The great wisp can hold 3 more wisps.' },
  w_tether: { cls: 'animancer', kind: 'minor', name: 'Silver Tether', up: 'Leashing the golem heals it twice as fast and speeds it up more.' },
  w_vigil: { cls: 'animancer', kind: 'minor', name: 'Long Vigil', up: 'The Soul Lantern lasts 50% longer.' },
  w_wake: { cls: 'animancer', kind: 'minor', name: 'Wake', up: 'A revenant wisp that perishes mends 2% of your life.' },
  // Animancer · Logos
  a_sage: { cls: 'animancer', kind: 'major', name: 'The Aether-Sage', up: 'Chain: Soul Swarm, Spirit Dart and Aether Orb jump to 2 more enemies at 60%.', rev: 'Nothing chains. Soul Swarm becomes a tether that drains its target\'s life into yours for 3 s, and Spirit Dart and Aether Orb heal you for 20% of their damage.' },
  a_blade: { cls: 'animancer', kind: 'major', name: 'The Hollow Blade', up: 'Spirit Dart leaps to 2 more enemies and leaves ghost trails that burn.', rev: 'Melee: Spirit Dart becomes a spirit sword. Hold to swing it in wide arcs.' },
  a_pyre: { cls: 'animancer', kind: 'major', name: 'Pyre', el: 'fire', up: 'Soul Storm souls and Aether Orb shards set enemies on fire.', rev: 'Wraith Form leaves a trail of spirit fire behind you.' },
  a_rebuke: { cls: 'animancer', kind: 'major', name: 'The Rebuke', up: 'Soul Leash cracks like a whip every second: everything touching the rope is struck and thrown back.', rev: 'Ranged: Soul Leash fires as a harpoon. It strikes hard and pins its target in place.' },
  g_ward: { cls: 'animancer', kind: 'minor', name: 'Deep Ward', up: 'Spirit Ward soaks 5% more of every blow.' },
  g_mark: { cls: 'animancer', kind: 'minor', name: 'Branding Mark', up: 'Mark of Logos lasts twice as long.' },
  g_orb: { cls: 'animancer', kind: 'minor', name: 'Heavy Orb', up: 'Aether Orb flies slower and lives 50% longer.' },
  g_swarm: { cls: 'animancer', kind: 'minor', name: 'Soul Hunger', up: 'Souls strike one more time before they fade.' },
  g_wraith: { cls: 'animancer', kind: 'minor', name: 'Wraith Step', up: 'Leaving Wraith Form releases 6 souls.' },
  g_storm: { cls: 'animancer', kind: 'minor', name: 'Eye of the Storm', up: 'Soul Storm drifts after you.' },
  // Animancer · hybrids
  a_revenant: { cls: 'animancer', kind: 'hybrid', name: 'The Revenant', gods: 'Lantern + Tower', up: 'A revenant wisp that perishes returns as a bone-armored spirit for 5 s.' },
  a_hunger: { cls: 'animancer', kind: 'hybrid', name: 'The Hungering Aether', gods: 'Wheel + Lantern', up: 'Soul Swarm souls steal a little life with every hit.' },
  // Assassin · Miasma
  z_bloom: { cls: 'miasmancer', kind: 'major', name: 'The Bloom', up: 'Miasma Nova leaves a ring of miasma clouds where it ends, even without Lingering Ring, and its clouds last longer.', rev: 'Ranged: Miasma Nova erupts at the cursor instead of around you.' },
  z_tide: { cls: 'miasmancer', kind: 'major', name: 'The Tide', up: 'Miasma Tide splits into three walls in a fan.', rev: 'Melee: Miasma Tide whirls around you as a ring of cutting miasma for 2 s instead of rolling forward.' },
  z_venom: { cls: 'miasmancer', kind: 'major', name: 'The Coil', up: 'Venom Blade miasma stacks up to five times, and each stack slows harder.', rev: 'Ranged: while Venom Blade lasts, your weapon attacks throw three venom knives instead of cutting.' },
  z_plague: { cls: 'miasmancer', kind: 'major', name: 'The Plague-Bearer', up: 'You leave a trail of miasma clouds wherever you walk.', rev: 'Your cloud drinks instead of sickening: every enemy in it feeds you a little of its life.' },
  zm_thick: { cls: 'miasmancer', kind: 'minor', name: 'Heavy Air', up: 'Your cloud spreads 20% wider.' },
  zm_fang: { cls: 'miasmancer', kind: 'minor', name: 'Barbed Knives', up: 'Venom knives and needles pass through one more enemy.' },
  zm_seep: { cls: 'miasmancer', kind: 'minor', name: 'Seeping', up: 'Your miasma clouds last 50% longer.' },
  zm_breath: { cls: 'miasmancer', kind: 'minor', name: 'Held Breath', up: 'Exhale keeps a quarter of the Miasma it spends, and Inhale draws in clouds from twice as far.' },
  zm_carrion: { cls: 'miasmancer', kind: 'minor', name: 'Carrion Flowers', up: 'Sickened enemies that die leave a cloud 15% more often.' },
  zm_contag: { cls: 'miasmancer', kind: 'minor', name: 'Wider Contagion', up: 'Contagion leaps to one more enemy each time.' },
  // Assassin · Distortion
  z_mirror: { cls: 'miasmancer', kind: 'major', name: 'The Mirror', up: 'Blur leaves two decoys instead of one.', rev: 'Melee: Blur steps into the enemy nearest the cursor and strikes it, gaining an Omen. The decoy stays where you stood.' },
  z_hanged: { cls: 'miasmancer', kind: 'major', name: 'The Hanged Man', up: 'Enemies that wander into Haze hang in the air: held for 1.5 s before the madness takes them.', rev: 'Haze becomes a mantle on you for 6 s: anything that comes close is confused.' },
  z_trapq: { cls: 'miasmancer', kind: 'major', name: 'The Trapper-Queen', up: 'Traps arm the moment they land, and you can have two more out.', rev: 'Traps are worn, not thrown. Each time you are struck, a worn trap springs at your feet.' },
  zd_needle: { cls: 'miasmancer', kind: 'minor', name: 'Twin Needles', up: 'Needle Sentries fire two needles at a time.' },
  zd_snare: { cls: 'miasmancer', kind: 'minor', name: 'Heavy Smoke', up: 'Miasma Wake smokes 50% longer and its waves hit a quarter harder.' },
  zd_mine: { cls: 'miasmancer', kind: 'minor', name: 'Chain Spores', up: 'Bloat Mine bursts a second time.' },
  zd_blur: { cls: 'miasmancer', kind: 'minor', name: 'Afterimage', up: 'Blur\'s decoy lasts 2 s longer.' },
  zd_lure: { cls: 'miasmancer', kind: 'minor', name: 'Siren Song', up: 'Siren Lure confuses what it drags.' },
  zd_mirage: { cls: 'miasmancer', kind: 'minor', name: 'Warped Flesh', up: 'Enemies in Mirage take 15% more damage.' },
  // Assassin · Death
  z_reaper: { cls: 'miasmancer', kind: 'major', name: 'The Reaper', up: 'A finisher that kills keeps its Omens.', rev: 'Ranged: Reap is thrown. A spectral scythe flies out and back, spending your Omens on everything it cuts.' },
  z_grave: { cls: 'miasmancer', kind: 'major', name: 'The Grave', up: 'Grave Strike, Carrion Talon and Reap root what they hit for a second.', rev: 'Your cloud turns to grave-dust: it stops sickening, but everything in it is slowed hard and takes 15% more damage.' },
  z_death: { cls: 'miasmancer', kind: 'major', name: 'Death', up: 'Every kill, by any means, gives an Omen.', rev: 'Omens never fade, but you can hold only two, and finishers strike for double.' },
  zx_omen: { cls: 'miasmancer', kind: 'minor', name: 'Omen-Sight', up: 'Omens last 15 s instead of 8.' },
  zx_step: { cls: 'miasmancer', kind: 'minor', name: 'Death\'s Wake', up: 'Death\'s Step leaves miasma clouds along its path.' },
  zx_kiss: { cls: 'miasmancer', kind: 'minor', name: 'Iron Heel', up: 'Carrion Talon kicks one more time.' },
  zx_knell: { cls: 'miasmancer', kind: 'minor', name: 'Long Knell', up: 'The Mourning Knell terrifies for 1 s longer.' },
  zx_breath: { cls: 'miasmancer', kind: 'minor', name: 'Grave Breath', up: 'Last Breath returns after 40 s instead of 60.' },
  zx_crit: { cls: 'miasmancer', kind: 'minor', name: 'Death\'s Eye', up: 'Finishers strike critically 10% more often.' },
  // Assassin · hybrids
  z_veiled: { cls: 'miasmancer', kind: 'hybrid', name: 'The Veiled Mother', gods: 'Wheel + Lantern', up: 'Your cloud and your miasma clouds cloud minds: enemies in them are now and then confused.' },
  z_widow: { cls: 'miasmancer', kind: 'hybrid', name: 'The Black Widow', gods: 'Tower + Hollow', up: 'Kills made by a finisher spin a web of miasma: every enemy within 2.5 yd is held fast for 1.5 s.' },
  // the Void (shared by every class)
  h_step: { cls: '*', kind: 'hollow', name: 'Hollow Step', up: 'Dodge rolls leave a silent afterimage. Enemies within 3 yd are staggered for 0.5 s.' },
  h_quiet: { cls: '*', kind: 'hollow', name: 'Unheard', up: 'Enemies notice you at 70% of the usual range.' },
  v_unwritten: { cls: '*', kind: 'void', name: 'The Unwritten', up: 'Your kills leave no corpse and drop nothing, but each one refills 5% of your Essence, shards or Vitae.', rev: 'You leave no trace: an enemy that can\'t see you for 2 s loses you.' },
  v_crown: { cls: '*', kind: 'void', name: 'The Hollow Crown', up: 'Your minions can\'t die while you are above half life, but each one drains 0.5% of your life per second.', rev: 'Potions don\'t heal you. Each minion within 4 yd mends 1% of your life per second instead.' },
  v_silence: { cls: '*', kind: 'void', name: 'The Last Silence', up: 'Once per zone, a killing blow stops time for 3 s and leaves you at 1 life.', rev: 'Your skills make no light: enemies notice you at half range.' },
  v_unmade: { cls: '*', kind: 'void', name: 'The Unmade', up: 'One Major you hold counts upright and reversed at once (choose it in the web). You lose 25% of your maximum life.', rev: '+1 to all your skills for each Major you hold (up to +4). You lose 25% of your maximum life.' }
};
// each class web: three corner clusters left to right, and the hybrids on the two edges between them
const WEB_DEF = {
  ossumancer: {
    clusters: [
      { page: 1, majors: ['o_tower', 'o_cage', 'o_grasp', 'o_rime'], minors: ['m_return', 'm_scatter', 'm_caltrop', 'm_hooks', 'm_tread', 'm_echo'] },
      { page: 0, majors: ['o_pyredead', 'o_bowyer', 'o_chanter', 'o_oath'], minors: ['o_rise', 'o_rattle', 'o_return', 'o_herald', 'o_stride', 'o_shove'] },
      { page: 2, majors: ['o_reliq', 'o_maelstrom'], minors: ['c_trail', 'c_throw', 'c_spines', 'c_grind', 'c_crash', 'c_fling'] }
    ],
    hybrids: ['o_marrowkin', 'o_revenant']
  },
  hemomancer: {
    clusters: [
      { page: 0, majors: ['h_clutch', 'h_graft', 'h_giant', 'h_pyre'], minors: ['b_scurry', 'b_twin', 'b_wall', 'b_throes', 'b_glut', 'b_lurch'] },
      { page: 1, majors: ['h_tide', 'h_leech', 'h_blight', 'h_rime'], minors: ['l_drag', 'l_sympathy', 'l_clot', 'l_lash', 'l_wind', 'l_spread'] },
      { page: 2, majors: ['h_glutton', 'h_heart'], minors: ['f_gnash', 'f_shed', 'f_quick', 'f_gills', 'f_rain', 'f_coil'] }
    ],
    hybrids: ['hk_marrow', 'hk_hunger']
  },
  animancer: {
    clusters: [
      { page: 0, majors: ['a_anvil', 'a_maiden', 'a_storm'], minors: ['i_quake', 'i_rust', 'i_stride', 'i_spikes', 'i_shield', 'i_rally'] },
      { page: 1, majors: ['a_choir', 'a_bell', 'a_lantern'], minors: ['w_swift', 'w_wake', 'w_host', 'w_tether', 'w_vigil', 'w_ember'] },
      { page: 2, majors: ['a_sage', 'a_blade', 'a_pyre', 'a_rebuke'], minors: ['g_swarm', 'g_ward', 'g_orb', 'g_mark', 'g_storm', 'g_wraith'] }
    ],
    hybrids: ['a_revenant', 'a_hunger']
  },
  miasmancer: {
    clusters: [
      { page: 0, majors: ['z_bloom', 'z_tide', 'z_venom', 'z_plague'], minors: ['zm_thick', 'zm_carrion', 'zm_breath', 'zm_fang', 'zm_contag', 'zm_seep'] },
      { page: 1, majors: ['z_mirror', 'z_hanged', 'z_trapq'], minors: ['zd_blur', 'zd_mirage', 'zd_lure', 'zd_needle', 'zd_snare', 'zd_mine'] },
      { page: 2, majors: ['z_reaper', 'z_grave', 'z_death'], minors: ['zx_omen', 'zx_crit', 'zx_knell', 'zx_kiss', 'zx_step', 'zx_breath'] }
    ],
    hybrids: ['z_veiled', 'z_widow']
  }
};
const VOID_GATE = 10;
const WEBS = {};
function buildWeb(cls) {
  const def = WEB_DEF[cls]; if (!def) return null;
  const nodes = {}, add = (id, x, y) => { nodes[id] = { id, x, y, links: new Set() }; return nodes[id]; };
  const link = (a, b) => { nodes[a].links.add(b); nodes[b].links.add(a); };
  add('heart', 0, 0);
  const angs = [-150, -90, -30].map(a => a * Math.PI / 180), trunkEnd = [];
  def.clusters.forEach((c, ci) => {
    const A = angs[ci], at = (r, da) => ({ x: Math.cos(A + da) * r, y: Math.sin(A + da) * r });
    const t0 = c.minors[0], t1 = c.minors[1];
    let p = at(1.1, 0); add(t0, p.x, p.y); link('heart', t0);
    p = at(2.1, 0); add(t1, p.x, p.y); link(t0, t1); trunkEnd.push(t1);
    const rest = c.minors.slice(2), n = c.majors.length, spread = n > 1 ? 0.62 : 0;
    const branches = c.majors.map(() => []); rest.forEach((mi, i) => branches[i % n].push(mi));
    c.majors.forEach((mj, bi) => {
      const da = n > 1 ? (bi / (n - 1) - 0.5) * spread : 0; let prev = t1, r = 2.1;
      for (const mi of branches[bi]) { r += 1.05; const q = at(r, da); add(mi, q.x, q.y); link(prev, mi); prev = mi; }
      r += 1.15; const q = at(r, da); add(mj, q.x, q.y); link(prev, mj);
    });
  });
  def.hybrids.forEach((h, i) => { const A = (angs[i] + angs[i + 1]) / 2; add(h, Math.cos(A) * 2.9, Math.sin(A) * 2.9); link(h, trunkEnd[i]); link(h, trunkEnd[i + 1]); });
  add('h_step', 0, 1.05); link('heart', 'h_step');
  add('h_quiet', 0, 2.0); link('h_step', 'h_quiet');
  ['v_unwritten', 'v_crown', 'v_silence', 'v_unmade'].forEach((v, i) => { const A = Math.PI / 2 + (i / 3 - 0.5) * 1.5; add(v, Math.cos(A) * 3.15, Math.sin(A) * 2.9); link('h_quiet', v); });
  return nodes;
}
function web() { return WEBS[P.cls] || (WEBS[P.cls] = buildWeb(P.cls)); }
function arcOf(id) { return (P.arc && P.arc.taken[id]) || 0; }
function aU(id) { const t = arcOf(id); return t === 'u' || (!!t && P.arc.both === id); }
function aR(id) { const t = arcOf(id); return t === 'r' || (!!t && P.arc.both === id); }
function aM(id) { return !!arcOf(id); }
function arcSpent() { return Object.keys(P.arc.taken).length; }
function arcMajors() { let n = 0; for (const k in P.arc.taken) if (ARC[k] && ARC[k].kind === 'major') n++; return n; }
function hasOrient(id) { const k = ARC[id].kind; return k === 'major' || k === 'void'; }
function atShrine() { return G.panels.lantern || G.zone.objects.some(o => o.type === 'lantern' && Math.hypot(o.x - P.x, o.y - P.y) < 3); }
function arcReachable(id) {
  const W = web(); if (!W || !W[id]) return false;
  for (const l of W[id].links) if (l === 'heart' || arcOf(l)) return true;
  return false;
}
function arcWhyNot(id) {
  if (arcOf(id)) return 'Already taken';
  if (P.arc.pts <= 0) return 'No Arcana to spend';
  if (!arcReachable(id)) return 'Not connected to your Major Arcana yet';
  if (ARC[id].kind === 'void' && arcSpent() < VOID_GATE) return `The Void opens after ${VOID_GATE} Major Arcana (${arcSpent()} now)`;
  return null;
}
function takeCard(id, orient) {
  if (arcWhyNot(id)) return false;
  P.arc.pts--; P.arc.taken[id] = hasOrient(id) ? (orient === 'r' ? 'r' : 'u') : 1;
  onArcChange(); sfx(520, 0.25, 'sine', 0.05, 260); return true;
}
function flipCard(id) {
  const t = P.arc.taken[id]; if (t !== 'u' && t !== 'r') return false;
  if (!atShrine()) { say('Major Arcana can only be turned at a lantern', 1.6); return false; }
  P.arc.taken[id] = t === 'u' ? 'r' : 'u'; onArcChange(); sfx(300, 0.3, 'sine', 0.05, -120); return true;
}
function setBoth(id) {
  if (!aU('v_unmade') || !ARC[id] || ARC[id].kind !== 'major' || !arcOf(id)) return;
  if (!atShrine()) { say('Choose it at a lantern', 1.6); return; }
  P.arc.both = P.arc.both === id ? null : id; onArcChange();
}
function onArcChange() {
  if (P.arc.both && (!arcOf(P.arc.both) || !arcOf('v_unmade'))) P.arc.both = null;
  D = derive(); P.hp = Math.min(P.hp, D.maxHp); rearm();
}
// numbers the cards add to derive()
function arcDerive(d, s) {
  d.fire = s.fire || 0; d.cold = s.cold || 0; d.ltng = s.ltng || 0; d.psn = s.psn || 0;
  if (aM('v_unmade')) d.maxHp = Math.round(d.maxHp * 0.75);
  if (P.suit) { d.meleeMult *= 1.6; d.moveSpd *= 0.8; d.armor += 30; }
  if (P.shell) { d.meleeMult *= 1.5 * WS.iron() * (P.shell.ramp > 0 ? WS.rampMult() : 1); d.moveSpd *= 0.85 * (P.shell.ramp > 0 ? 1.3 : 1); d.armor += 40 + Math.round(WS.golem().armor * 0.3); }
  if (P.maiden > 0) d.moveSpd *= 0.8;
  if (aM('w_swift')) d.wispRegen /= 1.2;
  if (aM('g_ward') && d.wardPct > 0) d.wardPct = Math.min(0.97, d.wardPct + 0.05);
}
function arcCost(id) {
  if (P.cls === 'animancer' && P.skills.wordpower > 0 && SK[id] && SK[id].tab === 2) return 0.9;
  if (id === 'spear' && aR('o_tower')) return 0.5;
    return 1;
}
// The Bleeding Heart reversed: spells are paid in raw life
function arcLifeCost(need) {
  if (!(isBlood() && aR('h_heart')) || need <= 0) return null;
  const life = bloodLifeCost(need) * 1.6 + 1;
  const paid = bloodPay(life); if (paid > 0) floatText(P.x, P.y, `-${Math.round(paid)} life`, '#c24050'); return true;
}

// ------------------------------------------------------------------- Ossurarch card mechanics
function mageOk() { return aM('o_chanter'); }
function bowOk() { return aM('o_bowyer'); }
function skelSpdMul(e) {
  let k = 1;
  if (G.cmd && aM('o_herald')) k *= 1.25;
  if (aR('o_oath') && G.oathRage > 0) k *= 1 + 0.1 * G.oathN;
  if (aU('o_pyredead')) k *= 1.3;
  if (P.skills.legionspd > 0) k *= 1.15;
  return k;
}
function aimShard(m) {
  if (P.shards < 1 || !m || m.dead) return;
  P.shards -= 1; const d = dist(m, P) || 1;
  G.bspears.push({ x: P.x, y: P.y, vx: (m.x - P.x) / d * 13, vy: (m.y - P.y) / d * 13, t: 0.6, dmg: BS.moteDmg() * 1.6, hit: new Set(), small: true, pierce: 1 });
}
function throwShard(m) {
  const d = dist(m, P) || 1;
  G.bspears.push({ x: P.x, y: P.y, vx: (m.x - P.x) / d * 12, vy: (m.y - P.y) / d * 12, t: 0.55, dmg: BS.weapon() * 0.8, hit: new Set(), small: true, pierce: 3 });
  sfx(700, 0.06, 'square', 0.02, -300);
}
function castThrust(a) {
  const d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d, L = 3, dmg = BS.spearDmg() * 1.1;
  for (const m of G.zone.monsters) {
    if (m.dead) continue; const ox = m.x - P.x, oy = m.y - P.y, along = ox * dx + oy * dy, side = Math.abs(ox * dy - oy * dx);
    if (along < -0.2 || along > L + m.r || side > 0.45 + m.r) continue;
    hurtMon(m, dmg, '#e8e2d0'); P.lastHit = m; burst(m.x, m.y, '#e8e2d0', 4, 1.6);
  }
  G.thrusts.push({ dx, dy, t: 0.2, L });
  sfx(300, 0.1, 'square', 0.04, -150); G.shake = Math.max(G.shake, 1);
}
// what happens where a bone spear's flight ends
function spearEnd(s) {
  if (s.main && aM('m_caltrop')) G.caltrops.push({ x: s.x, y: s.y, t: 3, tick: 0, dmg: BS.spearDmg() * 0.12 });
  if (s.main && aM('m_return') && !s.back) G.bspears.push({ x: s.x, y: s.y, vx: -s.vx, vy: -s.vy, t: 0.75 * (s.wall ? 0.7 : 1), dmg: s.dmg * 0.6, hit: new Set(), back: true });
  if (s.storm && aM('m_scatter') && !s.wall) spawnMote(s.x, s.y, { rise: 0.1, val: 0.5 });
}
// mages repeat the last Marrow spell you cast, small
function mageCast(e, T) {
  const k = P.lastMarrow || 'spear', d = dist(e, T) || 1, dx = (T.x - e.x) / d, dy = (T.y - e.y) / d;
  G.arcFx.push({ kind: 'mage', x: e.x, y: e.y, t: 0.25 });
  if (k === 'spikes') spikeBurst(T.x, T.y, BS.spikeDmg() * 0.3, 0.9, T);
  else if (k === 'ribcage') { if (T.rank !== 'boss') T.root = Math.max(T.root || 0, 1.2); G.ribcages.push({ x: T.x, y: T.y, R: T.r + 0.3, t: 1.2, max: 1.2, small: true, dps: 0, ref: T }); hurtMon(T, BS.ribDps() * 0.4, '#e8e2d0'); }
  else if (k === 'wall') { for (let i = 0; i < 2; i++) G.barms.push({ x: T.x + rand(-0.3, 0.3), y: T.y + rand(-0.3, 0.3), delay: i * 0.1, rise: 0.2, life: 2, max: 2, dps: BS.armDps() * 0.5, tick: 0, seed: Math.random() * 6.28, lean: rand(-0.4, 0.4) }); }
  else if (k === 'sstorm') { const b = Math.atan2(dy, dx); for (const o of [-0.2, 0, 0.2]) G.bspears.push({ x: e.x, y: e.y, vx: Math.cos(b + o) * 11, vy: Math.sin(b + o) * 11, t: 0.55, dmg: BS.stormDmg() * 0.35, hit: new Set(), small: true, pierce: 1 }); }
  else G.bspears.push({ x: e.x, y: e.y, vx: dx * 12, vy: dy * 12, t: 0.6, dmg: BS.spearDmg() * 0.35, hit: new Set(), small: true });
  sfx(820, 0.08, 'triangle', 0.02, -300);
}
function onSkelRise(e) {
  if (aM('o_rise')) for (const m of G.zone.monsters) if (!m.dead && dist(m, e) < 1.1 + m.r) hurtMon(m, BS.burstDmg() * 0.6, '#e8e2d0');
  if (aM('o_rattle')) { let n = 0; for (const m of G.zone.monsters) if (!m.dead && m.rank !== 'boss' && dist(m, e) < 3) { m.staunt = 2; m.stauntBy = e; aggro(m); n++; } if (n) parts.push({ ring: true, x: e.x, y: e.y, r: 0.2, max: 3, t: 0.4, col: '#c8553d' }); }
}
function onSkelFall(e, quiet) {
  if (quiet) return;
  if (aM('o_return')) { gainShard(e); gainShard(e); }
  if (aR('o_pyredead')) { fireGround(e.x, e.y, 0.9, BS.burstDmg() * 0.5, 4); for (const m of G.zone.monsters) if (!m.dead && dist(m, e) < 1.2 + m.r) { hurtMon(m, BS.burstDmg() * 0.8, '#ff9a3c'); burnMon(m, BS.burstDmg() * 0.4, 3); } burst(e.x, e.y, '#ff9a3c', 12, 2.2); }
  if (aM('o_revenant')) { const dm = BS.skelDmg(); G.ghosts.push({ x: e.x, y: e.y, r: 0.27, t: 5, cd: 0.3, face: e.face, load: e.load, swingT: 0, dmg: (dm[0] + dm[1]) / 2 * 1.2 }); }
}
function onSkelHit(e, m) {
  if (aU('o_pyredead')) burnMon(m, BS.skelDmg()[1] * 0.5, 3);
  if (aM('o_shove') && m.rank !== 'boss' && !skelLoad(e).ranged) { const d = dist(m, e) || 1; moveCircle(m, (m.x - e.x) / d * 0.3, (m.y - e.y) / d * 0.3); }
}
function arrowHit(s, m) {
  if (aU('o_pyredead')) burnMon(m, s.dmg * 0.5, 3);
  if (aR('o_bowyer') && m.rank !== 'boss') {
    // drag the hooked enemy toward the nearest melee skeleton (or you)
    let to = P, bd = 99; for (const e of G.skels) { if (skelLoad(e).ranged) continue; const d = dist(e, m); if (d < bd) { bd = d; to = e; } }
    const d = dist(m, to) || 1, k = Math.min(1.6, Math.max(0, d - 0.7));
    moveCircle(m, (to.x - m.x) / d * k, (to.y - m.y) / d * k); m.stun = Math.max(m.stun || 0, 0.25);
    G.zaps.push({ x0: s.x0 != null ? s.x0 : s.x, y0: s.y0 != null ? s.y0 : s.y, x1: m.x, y1: m.y, t: 0.15, seed: 0, rope: true });
  }
}
function onSpikeBurst(x, y, dmg, R, src, echo) {
  if (aU('o_rime')) for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - x, m.y - y) < R + m.r) chillMon(m, 0.45);
  if (aM('m_echo') && !echo) setTimeout(() => { if (G.running) { spikeBurstEcho(x, y, dmg * 0.5, R * 0.9); } }, 600);
}
function spikeBurstEcho(x, y, dmg, R) { G.echoSpike = true; spikeBurst(x, y, dmg, R, null); G.echoSpike = false; }
function onShatter(m) {
  if (isBone() && aU('o_rime')) { for (let i = 0; i < 3; i++) gainShard(m); burst(m.x, m.y, '#bfe8ff', 14, 2.4); sfx(1800, 0.15, 'triangle', 0.03, -900); }
}
function onBoneCastArc(id, a) {
  if (SK[id] && SK[id].tab === 1) P.lastMarrow = id;
  if (aR('o_maelstrom') && ['spear', 'spikes', 'ribcage', 'wall', 'sstorm'].includes(id)) {
    let best = null, bd = 2; for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - a.x, m.y - a.y); if (d < bd) { bd = d; best = m; } }
    if (best) aimShard(best);
  }
}
// cages: Cage-Warden upright springs up to three small cages; reversed wraps you
function cageWarden(p) {
  if (aR('o_cage')) {
    const life = BS.ribLife(); P.ribArmor = life; P.ribArmorMax = life;
    G.ribcages.push({ x: P.x, y: P.y, R: 0.7, t: life, max: life, small: true, dps: 0, ref: P, self: true });
    burst(P.x, P.y, '#e8e2d0', 18, 2.2); sfx(90, 0.4, 'square', 0.05, 50); return true;
  }
  if (aU('o_cage')) {
    const foes = G.zone.monsters.filter(m => !m.dead && Math.hypot(m.x - p.x, m.y - p.y) < 3).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 3);
    if (!foes.length) return false;
    const life = BS.ribLife();
    for (const m of foes) { G.ribcages.push({ x: m.x, y: m.y, R: m.r + 0.55, t: life, max: life, dps: BS.ribDps(), tick: 0, drainT: 1, follow: m }); m.root = Math.max(m.root || 0, m.rank === 'boss' ? life / 2 : life); hurtMon(m, BS.ribDps() * 0.6, '#e8e2d0'); }
    burst(p.x, p.y, '#e8e2d0', 14, 2.2); sfx(90, 0.4, 'square', 0.05, 50); return true;
  }
  return false;
}
function arcAbsorb(d) {
  if (P.ribArmor > 0) d *= 0.65;
  if (P.suit && d > 0) {
    const soak = d * 0.6; P.suit.pool -= soak; d -= soak;
    if (P.suit.pool <= 0) { P.suit = null; burst(P.x, P.y, '#8e2630', 40, 3); splatPool(P.x, P.y, 1.2, 12); say('Your flesh suit sloughs away', 1.4); D = derive(); }
  }
  if (P.shell && d > 0) {
    if (P.defyT > 0) d *= 0.7;
    if (P.skills.overflow > 0) { P.shell.charge = Math.min(WS.chargeMax() - 0.01, P.shell.charge + d / P.shell.max * WS.flowRate()); }
    const soak = d * 0.5; P.shell.pool -= soak; d -= soak;
    if (P.shell.pool <= 0) { P.shell = null; burst(P.x, P.y, '#aab4c2', 30, 3); say('Your mirror shell shatters', 1.4); D = derive(); }
  }
  if (isBlood() && aR('h_heart') && P.mana > 0 && d > 0) { const soak = Math.min(P.mana, d * 0.7); P.mana -= soak; d -= soak; if (soak > 0.5) burst(P.x, P.y, '#c24050', 3, 1.2); }
  return d;
}
function arcThorns(src) {
  if (!src || src.dead) return;
  if (isBlood() && aM('f_shed') && mutOn('chitin') && Math.random() < 0.35) { hurtMon(src, HS.chitinArmor() * 0.6, '#e89aa0'); burst(src.x, src.y, '#6a4a3a', 4, 1.4); }
  if (P.maiden > 0) { hurtMon(src, P.lastBlow * 0.6 + 2, '#cfd6e0'); burst(src.x, src.y, '#cfd6e0', 3, 1); }
  if (P.shell && P.skills.thorns > 0) { hurtMon(src, P.lastBlow * WS.thornsPct() / 100 + 2 * P.skills.thorns, '#cfd6e0'); if (P.skills.barbiron > 0 && src.rank !== 'boss') src.stun = Math.max(src.stun || 0, 0.3); }
  if (P.ribArmor > 0) { hurtMon(src, BS.ribDps() * 0.5, '#e8e2d0'); if (src.rank !== 'boss') { const d = dist(src, P) || 1; moveCircle(src, (src.x - P.x) / d * 0.9, (src.y - P.y) / d * 0.9); } }
  if (isBone() && aR('o_rime') && P.shards >= 1) chillMon(src, 0.35);
}
// Reliquary upright: missiles bounce back as bone
function arcReflect(s) {
  if (!(isBone() && P.host && aU('o_reliq'))) return false;
  G.bspears.push({ x: P.x, y: P.y, vx: -s.vx * 1.3, vy: -s.vy * 1.3, t: 0.8, dmg: s.dmg * 2 + BS.spearDmg() * 0.4, hit: new Set(), small: true, pierce: 1 });
  burst(P.x, P.y, '#e8e2d0', 5, 1.5); sfx(900, 0.06, 'square', 0.03, -400);
  return true;
}
function arcRooted() { return isBone() && P.host && aR('o_reliq'); }
function onCarapaceCrack() {
  if (!aM('c_spines')) return;
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; spawnMote(P.x, P.y, { rise: 0, out: 0.3, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, dmg: BS.moteDmg() * 1.5, val: 0.5 }); }
}
function onSweep() {
  if (!aM('c_fling')) return;
  for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + rand(0, 0.8); G.bspears.push({ x: P.x, y: P.y, vx: Math.cos(a) * 11, vy: Math.sin(a) * 11, t: 0.45, dmg: BS.moteDmg() * 2, hit: new Set(), small: true, pierce: 2 }); }
}
function onChargeEnd() {
  if (!aM('c_crash')) return;
  for (const m of G.zone.monsters) if (!m.dead && dist(m, P) < 1.5 + m.r) { hurtMon(m, BS.chargeDmg() * 0.6, '#e8e2d0'); if (m.rank !== 'boss') m.stun = Math.max(m.stun || 0, 0.5); }
  parts.push({ ring: true, x: P.x, y: P.y, r: 0.3, max: 1.5, t: 0.35, col: '#cfc6ae' }); G.shake = Math.max(G.shake, 3);
}
function onRoll() {
  if (aM('h_step')) { for (const m of G.zone.monsters) if (!m.dead && m.rank !== 'boss' && dist(m, P) < 3) { m.stun = Math.max(m.stun || 0, 0.5); } G.arcFx.push({ kind: 'after', x: P.x, y: P.y, t: 0.6, face: P.face }); }
  if (isBone() && aM('c_trail')) P.trailT = 0.4;
}
function onBoneKillArc(m) {
  if (aM('o_marrowkin') && Math.random() < 0.34) setTimeout(() => spikeBurst(m.x, m.y, BS.spikeDmg() * 0.4, 1.0, null), 0);
  if (aR('o_oath')) { G.oathRage = 5; G.oathN = Math.min(5, (G.oathN || 0) + 1); }
}
function updateBoneArc(dt) {
  const K = P.skills;
  // Pyre-Dead upright: the burning dead crumble
  if (aU('o_pyredead')) for (const e of G.skels.slice()) { if (e.rise > 0) continue; e.hp -= e.max * 0.06 * dt; e.fireT = (e.fireT || 0) - dt; if (e.fireT <= 0) { e.fireT = 0.5; for (const m of G.zone.monsters) if (!m.dead && dist(m, e) < 0.9 + m.r) burnMon(m, BS.skelDmg()[1] * 0.3, 2); } if (e.hp <= 0) skelDies(e); }
  if (G.oathRage > 0) { G.oathRage -= dt; if (G.oathRage <= 0) G.oathN = 0; }
  // Maelstrom upright: the aura cuts in a wide ring
  if (aU('o_maelstrom') && P.shards >= 1 && !P.dead) {
    P.maelT = (P.maelT || 0) - dt;
    if (P.maelT <= 0) { P.maelT = 0.5; for (const m of G.zone.monsters) if (!m.dead && dist(m, P) < 3 + m.r) { hurtMon(m, BS.moteDmg() * 0.8, '#e8e2d0'); } }
  }
  // Reliquary reversed: the bone turret
  if (arcRooted() && !P.dead) {
    P.turretT = (P.turretT || 0) - dt;
    if (P.turretT <= 0) {
      let best = null, bd = 9; for (const m of G.zone.monsters) { if (m.dead) continue; const d = dist(m, P); if (d < bd && lineClear(G.zone, P, m)) { bd = d; best = m; } }
      if (best) {
        P.turretT = 0.3; const d = bd || 1;
        G.bspears.push({ x: P.x, y: P.y, vx: (best.x - P.x) / d * 13, vy: (best.y - P.y) / d * 13, t: 0.75, dmg: BS.spearDmg() * 0.55 * (1 + 0.08 * P.host.n), hit: new Set(), small: true, pierce: 2 });
        P.host.pool -= BS.hostPer() * 0.04; faceTo(best.x, best.y); sfx(640, 0.05, 'square', 0.02, -250);
        while (P.host && P.host.n > 0 && P.host.pool <= (P.host.n - 1) * BS.hostPer()) { P.host.n--; onCarapaceCrack(); floatText(P.x, P.y, 'carapace spent', '#cfc6ae'); D = derive(); }
        if (P.host && P.host.n <= 0) { P.host = null; say('The turret has fired its last bone', 1.4); D = derive(); }
      } else P.turretT = 0.15;
    }
  }
  // Grasping Earth reversed: arms erupt around your feet as you walk
  if (P.armWalk > 0) {
    P.armWalk -= dt;
    const moved = Math.hypot(P.x - (P.armLast ? P.armLast.x : P.x), P.y - (P.armLast ? P.armLast.y : P.y));
    if (!P.armLast || moved > 0.55) {
      P.armLast = { x: P.x, y: P.y };
      for (let i = 0; i < 3; i++) { const a = Math.random() * 6.28, r = rand(0.5, 1.2), x = P.x + Math.cos(a) * r, y = P.y + Math.sin(a) * r; if (!G.zone.solidAt(x, y)) G.barms.push({ x, y, delay: i * 0.05, rise: 0.15, life: 1.6, max: 1.6, dps: BS.armDps() * 0.8, tick: 0, seed: Math.random() * 6.28, lean: rand(-0.4, 0.4) }); }
      while (G.barms.length > 60) G.barms.shift();
    }
  }
  if (P.ribArmor > 0) P.ribArmor -= dt;
  // shard trail from dodge rolls
  if (P.trailT > 0) { P.trailT -= dt; P.trailDrop = (P.trailDrop || 0) - dt; if (P.trailDrop <= 0) { P.trailDrop = 0.06; G.strail.push({ x: P.x, y: P.y, t: 3, hitT: new Map() }); } }
  for (const s of G.strail) { s.t -= dt; for (const m of G.zone.monsters) { if (m.dead || Math.abs(m.x - s.x) > 0.8 || Math.hypot(m.x - s.x, m.y - s.y) > m.r + 0.3) continue; const last = s.hitT.get(m) || -9; if (G.time - last > 0.5) { s.hitT.set(m, G.time); hurtMon(m, BS.moteDmg(), '#e8e2d0'); } } }
  G.strail = G.strail.filter(s => s.t > 0);
  // Colossal Stride
  const c = G.colossus;
  if (c && aM('o_stride')) { if (c.lastX != null && Math.hypot(c.x - c.lastX, c.y - c.lastY) > 0.01) for (const m of G.zone.monsters) { if (m.dead || m.rank === 'boss' || dist(m, c) > c.r + m.r + 0.3 || (m.strideT || 0) > G.time) continue; m.strideT = G.time + 1; const d = dist(m, c) || 1; moveCircle(m, (m.x - c.x) / d * 0.6, (m.y - c.y) / d * 0.6); m.stun = Math.max(m.stun || 0, 0.3); hurtMon(m, BS.colDmg(c.n) * 0.3, '#e8e2d0'); } c.lastX = c.x; c.lastY = c.y; }
  // Rib Hooks: cages drag their prisoners inward
  if (aM('m_hooks')) for (const g of G.ribcages) { if (g.small) continue; for (const m of G.zone.monsters) { if (m.dead || m.rank === 'boss') continue; const d = Math.hypot(m.x - g.x, m.y - g.y); if (d < g.R + m.r && d > 0.15) moveCircle(m, (g.x - m.x) / d * Math.min(d, 1.5 * dt), (g.y - m.y) / d * Math.min(d, 1.5 * dt)); } }
  // cages that follow their prisoner (Cage-Warden upright) or you (reversed)
  for (const g of G.ribcages) { if (g.follow && !g.follow.dead) { g.x = g.follow.x; g.y = g.follow.y; } if (g.self) { g.x = P.x; g.y = P.y; } }
  // Chanter reversed: the chant speeds your pull (handled in the pull rate); mages hum
}
function chantBoost() { if (!aR('o_chanter')) return 1; let n = 0; for (const e of G.skels) if (e.load === 'mage' && dist(e, P) < 8) n++; return 1 + 0.5 * n; }

// ------------------------------------------------------------------- the Void
function onKillVoid(m) {
  if (aU('v_unwritten') && m.rank !== 'boss') {
    m.hatched = m.eaten = m.burst = m.drained = m.echoed = m.infected = true; m.erased = true;
    if (isBone()) { P.shards = Math.min(freeCap(), P.shards + D.shardCap * 0.05); }
    else P.mana = Math.min(D.maxMana, P.mana + D.maxMana * 0.05);
    burst(m.x, m.y, '#1a1822', 12, 1.8);
  }
}
function noLoot(m) { return aU('v_unwritten') && m.rank !== 'boss'; }
function crownSave(e) { if (aU('v_crown') && P.hp > D.maxHp * 0.5 && e.hp <= 0) e.hp = 1; }
function potionHeal(amt) { if (aR('v_crown')) { say('The Hollow Crown refuses the draught', 1.4); return 0; } return amt; }
function minionList() {
  const L = [];
  for (const e of G.skels) L.push(e); if (G.colossus) L.push(G.colossus);
  if (G.brood) for (const e of G.brood) L.push(e); if (G.fgolem) L.push(G.fgolem); if (G.thralls) for (const e of G.thralls) L.push(e);
  if (G.golem && G.golem.state !== 'dormant') L.push(G.golem); for (const e of G.echoes) L.push(e);
  return L;
}
function wakeRange() { let r = 7.5; if (aM('h_quiet')) r *= 0.7; if (aR('v_silence')) r *= 0.5; return r; }
function silenceSave() {
  if (!aU('v_silence') || G.silenced[G.zone.id]) return false;
  G.silenced[G.zone.id] = true; P.hp = 1; G.timeStop = 3;
  banner('THE LAST SILENCE', '#b48ad9', 2.5); sfx(55, 2, 'sine', 0.07, 0); return true;
}
function updateVoid(dt) {
  if (G.timeStop > 0) G.timeStop -= dt;
  if (aU('v_crown') && !P.dead) { const n = minionList().length; if (n) P.hp = Math.max(1, P.hp - D.maxHp * 0.005 * n * dt); }
  if (aR('v_crown') && !P.dead) { let n = 0; for (const e of minionList()) if (dist(e, P) < 4) n++; if (n) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.01 * Math.min(5, n) * dt); }
  if (aR('v_unwritten')) for (const m of G.zone.monsters) {
    if (m.dead || m.state === 'idle' || m.rank === 'boss' || m.tgt !== P) { m.losT = 0; continue; }
    if (dist(m, P) > 3 && !lineClear(G.zone, m, P)) { m.losT = (m.losT || 0) + dt; if (m.losT > 2) { m.state = 'idle'; m.path = null; m.losT = 0; floatText(m.x, m.y, '?', '#a39d8c'); } } else m.losT = 0;
  }
}
function updateArcana(dt) {
  // caltrops and shrapnel
  for (const c of G.caltrops) { c.t -= dt; c.tick -= dt; if (c.tick <= 0) { c.tick = 0.4; for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - c.x, m.y - c.y) < 0.7 + m.r) { hurtMon(m, c.dmg, '#cfc6ae'); m.slow = Math.max(m.slow || 0, 0.5); } } }
  G.caltrops = G.caltrops.filter(c => c.t > 0);
  // revenant spirits
  for (const g of G.ghosts) {
    g.t -= dt; g.cd -= dt; g.swingT = Math.max(0, g.swingT - dt);
    let T = null, bd = 6; for (const m of G.zone.monsters) { if (m.dead) continue; const d = dist(m, g); if (d < bd) { bd = d; T = m; } }
    if (T) { if (Math.abs((T.x - T.y) - (g.x - g.y)) > 0.05) g.face = (T.x - T.y) > (g.x - g.y) ? 1 : -1; if (bd > 0.9 + T.r) { const k = Math.min(bd, 4 * dt); g.x += (T.x - g.x) / bd * k; g.y += (T.y - g.y) / bd * k; } else if (g.cd <= 0) { g.cd = 0.8; g.swingT = 0.2; hurtMon(T, g.dmg * rand(0.8, 1.2), '#d8f3ff'); } }
    else if (dist(g, P) > 1.5) { const d = dist(g, P), k = Math.min(d, 4 * dt); g.x += (P.x - g.x) / d * k; g.y += (P.y - g.y) / d * k; }
  }
  G.ghosts = G.ghosts.filter(g => g.t > 0);
  if (P.cls === 'animancer') { updateAnimArc(dt); updateShell(dt); updateCages(dt); }
  updateElements(dt); updateVoid(dt);
  if (isBone()) updateBoneArc(dt);
  if (isBlood()) updateBloodArc(dt);
  updateArcShots(dt);
  for (const f of G.arcFx) f.t -= dt; G.arcFx = G.arcFx.filter(f => f.t > 0);
  for (const t of G.thrusts) t.t -= dt; G.thrusts = G.thrusts.filter(t => t.t > 0);
}
function resetArcana() { G.clouds = []; P.suit = null; P.shell = null; P.maiden = 0; P.bellLock = 0; G.dtethers = []; G.strails2 = []; G.sswords = []; G.arcShots = []; G.soulw = []; G.sacThrows = []; G.bswords = []; G.fspawn = null; P.tempMut = null; G.fires = []; G.zaps = []; G.ghosts = []; G.caltrops = []; G.strail = []; G.thrusts = []; G.arcFx = []; G.timeStop = 0; P.ribArmor = 0; P.armWalk = 0; G.oathRage = 0; G.oathN = 0; }
function arcanaZoneChange() { G.clouds = []; G.dtethers = []; G.strails2 = []; G.sswords = []; G.arcShots = []; G.soulw = []; G.sacThrows = []; G.bswords = []; if (G.fspawn) { G.fspawn.x = P.x + 1; G.fspawn.y = P.y; } G.fires = []; G.zaps = []; G.ghosts = []; G.caltrops = []; G.strail = []; G.thrusts = []; G.timeStop = 0; }

// ------------------------------------------------------------------- shared little projectiles: straight bone shards and drifting soul wisps
function arcShard(x, y, vx, vy, dmg, col) { G.arcShots.push({ x, y, vx, vy, t: 0.5, dmg, hit: new Set(), col: col || '#e8e2d0' }); }
function updateArcShots(dt) {
  for (const s of G.arcShots) {
    s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (G.zone.solidAt(s.x, s.y)) { s.t = 0; continue; }
    for (const m of G.zone.monsters) if (!m.dead && !s.hit.has(m) && Math.abs(m.x - s.x) < 1 && Math.hypot(m.x - s.x, m.y - s.y) < m.r + 0.15) { s.hit.add(m); hurtMon(m, s.dmg, s.col); if (s.psn) poisonMon(m, s.psn, 3); if (s.ooze) oozeShardHit(s, m); if (s.knife) P.lastHit = m; if (s.hit.size >= (s.pierce || 2)) { s.t = 0; break; } }
  }
  G.arcShots = G.arcShots.filter(s => s.t > 0);
  for (const w of G.soulw) {
    w.t += dt; const d = dist(w, P) || 1, sp = Math.min(9, 2 + w.t * 6);
    w.x += (P.x - w.x) / d * Math.min(d, sp * dt); w.y += (P.y - w.y) / d * Math.min(d, sp * dt);
    if (d < 0.4 || w.t > 6) { w.done = true; if (!P.dead) { P.mana = Math.min(D.maxMana, P.mana + D.maxMana * 0.03); sfx(900, 0.05, 'sine', 0.015, 300); } }
  }
  G.soulw = G.soulw.filter(w => !w.done);
}

// ------------------------------------------------------------------- Hemomancer card mechanics
function isRider(e) { return !!(e && e.rider); }
function lingSpd() { return 4.4 * (aM('b_scurry') ? 1.25 : 1) * (graftOn('legs') ? 1.45 * (1 + 0.02 * P.skills.graft) : 1); }
function onLingBite(e, T, dmg) {
  if (aU('h_pyre')) burnMon(T, dmg * 0.5, 3);
}
function onLingDies(e, quiet) {
  if (quiet) return;
  if (aU('h_pyre')) { fireGround(e.x, e.y, 0.6, HS.lingDmg()[1] * 0.6, 2.5); burst(e.x, e.y, '#ff9a3c', 8, 1.6); }
  if (aM('b_throes')) for (const m of G.zone.monsters) if (!m.dead && dist(m, e) < 1 + m.r) hurtMon(m, HS.lingDmg()[1] * e.size, '#e89aa0');
  if (aM('hk_marrow')) for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + rand(0, 0.8); arcShard(e.x, e.y, Math.cos(a) * 9, Math.sin(a) * 9, HS.lingDmg()[1] * 0.8); }
}
function lingArmor() { return aM('hk_marrow') ? 0.7 : 1; }
function hatchBonus() { return aM('b_twin') && Math.random() < 0.35 ? 1 : 0; }
function poolScale() { return aM('l_spread') ? 1.3 : 1; }
function onBloodKillArc(m) {
  if (aM('hk_hunger')) G.soulw.push({ x: m.x, y: m.y, t: 0 });
}
// Crimson Tide: split gouts, or the blood sword
function spawnGout(x, y, dx, dy, dmg, mass, hit) {
  G.blances.push({ x, y, bx: x, by: y, dx, dy, v: 11, vx: dx * 11, vy: dy * 11, ph: Math.random() * 6.28, amp: 0.16, age: 0.1, z: 7, t: 0.55, mass, dmg, hit: hit || new Set(), dripT: 0, drop: 0, trail: [], split: true });
}
function onGoutHit(s, m) {
  if (aU('h_tide') && !s.split) {
    s.split = true; const a = Math.atan2(s.dy, s.dx);
    for (const o of [-0.5, 0.5]) spawnGout(m.x, m.y, Math.cos(a + o), Math.sin(a + o), s.dmg * 0.6, 0.6, new Set([m]));
  }
}
function onGoutSplash(s, R) {
  if (aM('l_clot')) for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - s.x, m.y - s.y) < R + m.r) m.root = Math.max(m.root || 0, m.rank === 'boss' ? 0.3 : 0.6);
}
function castBloodSword(a) {
  const d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d, R = 1.9, dmg = HS.lanceDmg() * 1.3;
  for (const m of G.zone.monsters) {
    if (m.dead) continue; const ox = m.x - P.x, oy = m.y - P.y, od = Math.hypot(ox, oy); if (od > R + m.r) continue;
    if ((ox * dx + oy * dy) / (od || 1) < Math.cos(1.0)) continue;
    hurtMon(m, dmg, '#e89aa0'); addBleed(m, HS.bleedOf(dmg), 4); P.lastHit = m; splashDrops(m.x, m.y, 6, 1.6, 8);
  }
  splatPool(P.x + dx * 1.2, P.y + dy * 1.2, 0.55, 7);
  G.bswords.push({ dx, dy, t: 0, dur: 0.22, R });
  sfx(220, 0.12, 'sawtooth', 0.04, -140);
}
// The Leech reversed: a hooked tendril
function castTendril(a) {
  const d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d, L = 7;
  let best = null, bd = 99;
  for (const m of G.zone.monsters) {
    if (m.dead) continue; const ox = m.x - P.x, oy = m.y - P.y, along = ox * dx + oy * dy, side = Math.abs(ox * dy - oy * dx);
    if (along < 0 || along > L + m.r || side > 0.5 + m.r) continue; if (along < bd && lineClear(G.zone, P, m)) { bd = along; best = m; }
  }
  if (!best) { G.vwhips.push({ dx, dy, t: 0, dur: 0.2, R: 4 }); sfx(700, 0.08, 'sawtooth', 0.03, -500); return; }
  const dmg = HS.whipDmg(); hurtMon(best, dmg, '#e89aa0'); addBleed(best, HS.bleedOf(dmg), aM('l_lash') ? 8 : 4); P.lastHit = best;
  if (best.rank !== 'boss') { const dd = dist(best, P) || 1, k = Math.max(0, dd - 1); moveCircle(best, -(best.x - P.x) / dd * k, -(best.y - P.y) / dd * k); best.stun = Math.max(best.stun || 0, 0.5); }
  G.tents.push({ ref: best, t: 0, dur: 0.35, side: 1 }); sfx(500, 0.1, 'sawtooth', 0.035, -300);
}
// The Clutch reversed: thrown sacs
function throwSac(a) {
  const p = clampCast(a, 8);
  G.sacThrows.push({ x0: P.x, y0: P.y, x1: p.x, y1: p.y, t: 0, dur: 0.45, n: HS.sacN() });
  sfx(180, 0.2, 'sawtooth', 0.035, 60);
}
function landSac(s) {
  let n = 0; for (let i = 0; i < s.n; i++) if (hatchLing(s.x1 + rand(-0.4, 0.4), s.y1 + rand(-0.4, 0.4))) n++;
  burst(s.x1, s.y1, '#c9a66b', 14, 2.2); splatPool(s.x1, s.y1, 0.5, 7);
  if (n < s.n) bileBurst(s.x1, s.y1, HS.ruptDmg() * (s.n - n), 1.3);
  for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - s.x1, m.y - s.y1) < 1 + m.r) aggro(m);
}
// The Glutton
function devourArc(size) {
  if (aU('h_glutton')) {
    const opts = MUTS.filter(id => P.skills[id] > 0 && !P.muts.slice(0, mutSlots()).includes(id));
    if (opts.length) { P.tempMut = pick(opts); P.tempMutT = 10; floatText(P.x, P.y, 'grows ' + SK[P.tempMut].name, '#e89aa0'); D = derive(); }
  }
  if (aR('h_glutton')) {
    const a = aimPoint(), d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d, dmg = HS.burstDmg() * 0.7 * size;
    for (const m of G.zone.monsters) { if (m.dead) continue; const ox = m.x - P.x, oy = m.y - P.y, od = Math.hypot(ox, oy); if (od > 3.6 + m.r || (ox * dx + oy * dy) / (od || 1) < Math.cos(0.55)) continue; hurtMon(m, dmg, '#e89aa0'); addBleed(m, dmg * 0.2, 5); P.lastHit = m; }
    for (let i = 1; i <= 3; i++) G.biles.push({ fx: true, splat: true, x: P.x + dx * i * 1.1, y: P.y + dy * i * 1.1, R: 0.5 + i * 0.25, t: 0.4 });
    sfx(120, 0.3, 'sawtooth', 0.05, -60); return false; // no feeding
  }
  return true;
}
function tempMutOn(id) { return P.tempMut === id && P.tempMutT > 0; }
// The Hollow Giant
function giantHurt(g) {
  if (aU('h_giant') && !g.spawned && g.hp > 0 && g.hp < g.max * 0.5) {
    g.spawned = true; const hp = g.max * 0.4;
    G.fspawn = { x: g.x + 0.8, y: g.y, r: 0.4, hp, max: hp, t: 20, cd: 0.5, face: g.face, slam: 0 };
    burst(g.x, g.y, '#8e2630', 24, 2.6); splatPool(g.x, g.y, 0.8, 10); floatText(g.x, g.y, 'tears loose a spawn', '#e89aa0'); sfx(80, 0.4, 'sawtooth', 0.05, -30);
  }
}
function suitCast() {
  if (P.suit) {
    const pool = P.suit.pool; P.suit = null; D = derive();
    const hp = HS.golemHp(), p = clampCast({ x: P.x + 1, y: P.y }, 2);
    G.fgolem = { isFGolem: true, big: true, x: p.x, y: p.y, r: 0.6, hp: Math.min(hp, pool), max: hp, grow: 0, meals: 0, spd: 1.8, face: 1, cd: 1, state: 'idle', t: 0, hurt: 0, path: null, repath: 0, eat: null, tearT: 6, order: null, slam: 0, hold: null };
    burst(P.x, P.y, '#b8404a', 30, 3); say('You step out of the flesh', 1.2); P.cast = 0.4; return;
  }
  if (!G.fgolem && !spendMana('fgolem')) return;
  const pool = G.fgolem ? G.fgolem.hp : HS.golemHp();
  if (G.fgolem) { burst(G.fgolem.x, G.fgolem.y, '#b8404a', 30, 3); G.fgolem = null; }
  P.suit = { pool, max: HS.golemHp(), hatchT: 4 }; D = derive();
  burst(P.x, P.y, '#8e2630', 40, 3); G.shake = Math.max(G.shake, 3); banner('FLESH SUIT', '#b8404a', 1.4); sfx(70, 0.6, 'sawtooth', 0.06, 30);
  P.cast = 0.5;
}
function updateBloodArc(dt) {
  if (P.tempMutT > 0) { P.tempMutT -= dt; if (P.tempMutT <= 0) { P.tempMut = null; D = derive(); } }
  // swarmling speed, riders, chimeras
  const riders = G.brood.filter(isRider);
  for (const e of G.brood) if (!e.rider) e.spd = lingSpd() * (e.size > 1.6 ? 0.75 : 1);
  if (aR('h_graft')) {
    if (riders.length < 4) for (const e of G.brood) { if (e.rider || e.hatch > 0 || G.brood.filter(isRider).length >= 4) continue; if (dist(e, P) < 1.6) { e.rider = true; e.cling = null; floatText(e.x, e.y, 'climbs on', '#e89aa0'); } }
    G.brood.filter(isRider).forEach((e, i) => { const a = i / 4 * 6.28 + 0.8; e.x = P.x + Math.cos(a) * 0.32; e.y = P.y + Math.sin(a) * 0.32; e.face = P.face; });
  } else for (const e of riders) e.rider = false;
  if (aU('h_graft')) {
    P.fuseChk = (P.fuseChk || 0) - dt;
    if (P.fuseChk <= 0) {
      P.fuseChk = 0.5;
      for (const e of G.brood) {
        if (e.hatch > 0 || e.size >= 1.6 || e.rider) continue;
        const mates = G.brood.filter(o => o !== e && o.hatch <= 0 && o.size < 1.6 && !o.rider && dist(o, e) < 0.8);
        if (mates.length >= 2) {
          const [a, b] = mates; e.size = 2.2; e.max = HS.lingHp() * e.size; e.hp = Math.min(e.max, e.hp + a.hp + b.hp); e.r = 0.3;
          broodDies(a, true); broodDies(b, true); burst(e.x, e.y, '#8e2630', 18, 2.2); floatText(e.x, e.y, 'chimera', '#e89aa0'); sfx(120, 0.3, 'sawtooth', 0.04, -40); break;
        }
      }
    }
  }
  // The Clutch upright: sacs spring when something walks close
  if (aU('h_clutch')) for (const sc of G.sacs.slice()) {
    const m = G.zone.monsters.find(m => !m.dead && m.state !== 'idle' && Math.hypot(m.x - sc.x, m.y - sc.y) < 1.5 + m.r);
    if (!m) continue;
    let n = 0; for (let i = 0; i < sc.n; i++) if (hatchLing(sc.x + rand(-0.3, 0.3), sc.y + rand(-0.3, 0.3))) n++;
    if (!n) continue;
    G.sacs = G.sacs.filter(o => o !== sc); burst(sc.x, sc.y, '#c9a66b', 12, 2); for (const e of G.brood.slice(-n)) e.hatch = 0.1;
  }
  // thrown sacs
  for (const s of G.sacThrows) { s.t += dt; if (s.t >= s.dur && !s.done) { s.done = true; landSac(s); } }
  G.sacThrows = G.sacThrows.filter(s => !s.done);
  // Pyre reversed: burning thralls
  // bleeding: Blight-Queen spreads it, Rime freezes it
  for (const m of G.zone.monsters) {
    if (m.dead || !m.bleed) continue;
    if (aU('h_blight')) { m.bspr = (m.bspr == null ? 2 : m.bspr) - dt; if (m.bspr <= 0) { m.bspr = 2; let o = null, bd = 2.5; for (const q of G.zone.monsters) { if (q.dead || q === m || q.bleed) continue; const d = dist(q, m); if (d < bd) { bd = d; o = q; } } if (o) { addBleed(o, m.bleed.dps, Math.max(2, m.bleed.t)); G.biles.push({ fx: true, x: m.x, y: m.y, tx: o.x, ty: o.y, t: 0.3, blood: true }); } } }
    if (aU('h_rime')) { m.rimeT = (m.rimeT || 0) - dt; if (m.rimeT <= 0) { m.rimeT = 1; chillMon(m, 0.18); } }
  }
  // Rime reversed: pools freeze
  if (aR('h_rime')) for (const m of G.zone.monsters) { if (m.dead || m.rank === 'boss' || (m.slipT || 0) > G.time) continue; if (inPoolAt(m)) { m.slipT = G.time + 3; m.stun = Math.max(m.stun || 0, 1); floatText(m.x, m.y, 'slips', '#bfe8ff'); } }
  // the flesh suit: brood hatches from your body
  if (P.suit && !P.dead) { P.suit.hatchT -= dt; if (P.suit.hatchT <= 0) { P.suit.hatchT = 5; if (hatchLing(P.x + rand(-0.5, 0.5), P.y + rand(-0.5, 0.5))) burst(P.x, P.y, '#8e2630', 10, 2); } }
  // the Flesh Spawn
  const f = G.fspawn;
  if (f) {
    f.t -= dt; f.cd -= dt; f.slam = Math.max(0, f.slam - dt);
    let T = null, bd = 7; for (const m of G.zone.monsters) { if (m.dead) continue; const d = dist(m, f); if (d < bd) { bd = d; T = m; } }
    if (T) { if (Math.abs((T.x - T.y) - (f.x - f.y)) > 0.05) f.face = (T.x - T.y) > (f.x - f.y) ? 1 : -1; if (bd > T.r + f.r + 0.3) monMove(f, T.x, T.y, 2.2, dt); else if (f.cd <= 0) { f.cd = 1.2; f.slam = 0.3; for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - T.x, m.y - T.y) < 0.8 + m.r) hurtMon(m, HS.golemDmg() * 0.6, '#e89aa0'); splatPool(T.x, T.y, 0.35, 5); } }
    else if (dist(f, P) > 2) monMove(f, P.x, P.y, 2.2, dt);
    pushOut(f);
    if (f.t <= 0) { burst(f.x, f.y, '#8e2630', 20, 2.4); splatPool(f.x, f.y, 0.7, 8); G.fspawn = null; }
  }
  for (const w of G.bswords) w.t += dt; G.bswords = G.bswords.filter(w => w.t < w.dur + 0.1);
}

function nearPool(o, pad, real) { for (const p of G.pools) if ((!real || !p.own) && Math.hypot(p.x - o.x, p.y - o.y) < p.r + pad) return p; return null; }
function arcShotBlock(s) {
  if (isBlood() && aM('b_wall')) for (const sc of G.sacs) if (Math.hypot(sc.x - s.x, sc.y - s.y) < 0.45) return true;
  return false;
}

// ------------------------------------------------------------------- Animancer card mechanics
function onGolemStrike(g, tgt) {
  if (P.skills.moltencore > 0 && tgt && !tgt.dead) burnMon(tgt, WS.golem().dmg[1] * 0.4, 3);
  if (aU('a_anvil') && tgt) G.caltrops.push({ x: tgt.x + rand(-0.3, 0.3), y: tgt.y + rand(-0.3, 0.3), t: 3, tick: 0.2, dmg: WS.golem().dmg[1] * 0.25, iron: true });
}
function shellCast() {
  if (P.shell) { P.shell = null; D = derive(); burst(P.x, P.y, '#aab4c2', 24, 2.6); say('You shed the mirror shell', 1.2); P.cast = 0.3; return; }
  if (!spendMana('golem')) return;
  G.golem = null; G.flyShield = null;
  P.shell = { pool: WS.golem().max, max: WS.golem().max, charge: 0, ramp: 0, tossT: 2, chT: 1 }; D = derive();
  burst(P.x, P.y, '#aab4c2', 30, 3); G.shake = Math.max(G.shake, 3); banner('IRON SHELL', '#aab4c2', 1.4); sfx(120, 0.4, 'square', 0.05, -40); P.cast = 0.5;
}
function maidenCast(a) {
  if (aR('a_maiden')) { P.maiden = WS.cageLife(); D = derive(); burst(P.x, P.y, '#8b93a0', 20, 2.4); sfx(60, 0.4, 'square', 0.05, 40); P.cast = 0.4; return true; }
  if (aU('a_maiden')) for (const m of G.zone.monsters) { if (m.dead || m.rank === 'boss') continue; const d = Math.hypot(m.x - a.x, m.y - a.y); if (d < 3.2 && d > 1.2) moveCircle(m, (a.x - m.x) / d * (d - 1), (a.y - m.y) / d * (d - 1)); }
  return false;
}
function onShieldHit(m, dmg) { if (aR('a_storm')) shockArc(m, dmg * 0.6, 2, new Set([m])); }
function tryPossess(w, m) {
  if (!aR('a_choir') || m.rank === 'boss' || m.possessed > 0) return false;
  m.possessed = 3; m.state = 'chase'; perish(w); floatText(m.x, m.y, 'possessed', '#d8f3ff'); sfx(700, 0.2, 'sine', 0.03, -300);
  return true;
}
function updatePossessed(m, dt) {
  m.possessed -= dt; m.hurt = Math.max(0, m.hurt - dt); m.cd -= dt;
  if (Math.random() < 0.3) parts.push({ x: m.x, y: m.y, z: 12, vx: 0, vy: 0, vz: 10, t: 0.3, col: '#d8f3ff' });
  let T = null, bd = 7; for (const o of G.zone.monsters) { if (o.dead || o === m || o.possessed > 0) continue; const d = dist(o, m); if (d < bd) { bd = d; T = o; } }
  if (!T) return;
  if (Math.abs((T.x - T.y) - (m.x - m.y)) > 0.05) m.face = (T.x - T.y) > (m.x - m.y) ? 1 : -1;
  if (bd > m.r + T.r + 0.35) monMove(m, T.x, T.y, m.spd, dt);
  else if (m.cd <= 0) { m.cd = 0.9; hurtMon(T, rand(m.dmg[0], m.dmg[1]) * 1.5, '#d8f3ff'); aggro(T); T.tgtM = m; burst(T.x, T.y, '#d8f3ff', 3, 1); }
  if (m.possessed <= 0) { m.possessed = 0; floatText(m.x, m.y, 'freed', '#a39d8c'); }
}
function bellCheck(amt) {
  if (P.cls !== 'animancer' || amt != null || !aR('a_bell') || !(P.bellLock > 0)) return true;
  say('The bell is still ringing', 0.6); return false;
}
function arcOnSpend(id, amt) {
  if (P.cls !== 'animancer' || amt != null) return;
  if (aR('a_bell')) P.bellLock = 1;
  if (aU('a_bell')) { P.bellN = (P.bellN || 0) + 1; if (P.bellN % 5 === 0) { for (const m of G.zone.monsters) if (!m.dead && dist(m, P) < 3.5 + m.r) { m.stun = Math.max(m.stun || 0, m.rank === 'boss' ? 0.2 : 0.5); } parts.push({ ring: true, x: P.x, y: P.y, r: 0.3, max: 3.5, t: 0.45, col: '#d9a441' }); sfx(880, 0.8, 'sine', 0.05, 0); sfx(1320, 0.6, 'sine', 0.03, 0); } }
}
function onSoulHit(s, m) {
  if (aU('a_sage') && !s.chained) { s.chained = true; shockArc(m, s.dmg * 0.6, 2, new Set([m]), '#ffffff'); }
  if (s.storm && aU('a_pyre')) burnMon(m, s.dmg * 0.5, 3);
  if (aM('a_hunger')) P.hp = Math.min(D.maxHp, P.hp + s.dmg * 0.06);
}
function onShardHit(s, m) {
  if (aU('a_pyre')) burnMon(m, s.dmg * 0.5, 3);
  if (aU('a_sage') && Math.random() < 0.2) shockArc(m, s.dmg * 0.6, 2, new Set([m]), '#ffffff');
  if (aR('a_sage')) { P.hp = Math.min(D.maxHp, P.hp + s.dmg * 0.2); }
}
function lanceArc(path, base) {
  if (aU('a_sage')) { P.lchainT = (P.lchainT || 0) - 0.1; if (P.lchainT <= 0 && path.hits.length) { P.lchainT = 0.3; const h = path.hits[path.hits.length - 1]; shockArc(h.m, base * 3 * 0.6, 2, new Set(path.hits.map(q => q.m)), '#ffffff'); } }
  if (aU('a_blade')) { P.trailT2 = (P.trailT2 || 0) - 0.1; if (P.trailT2 <= 0) { P.trailT2 = 0.3; for (const sg of path.segs) G.strails2.push({ x0: sg[0], y0: sg[1], x1: sg[2], y1: sg[3], t: 1.5, tick: 0 }); while (G.strails2.length > 12) G.strails2.shift(); } }
}
function lanceSiphon() { return aR('a_sage') ? 0.2 : 0; }
function lancePierceBonus() { return aU('a_blade') ? 2 : 0; }
// The Hollow Blade reversed: the spirit sword
function updateSpiritSword(dt) {
  P.lancing = false; P.lance = null;
  const want = mouse.r && P.right === 'lance' && P.skills.lance > 0 && P.roll <= 0 && P.cast <= 0 && !uiBlocksMouse();
  if (!want) return;
  const cost = 3 * COST_MULT; if (!spendMana('lance', cost)) return;
  endWraith(); P.path = null;
  const a = aimPoint(), d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d, R = 2.1, dmg = WS.lanceDps() * 0.4;
  faceTo(a.x, a.y);
  for (const m of G.zone.monsters) { if (m.dead) continue; const ox = m.x - P.x, oy = m.y - P.y, od = Math.hypot(ox, oy); if (od > R + m.r || (ox * dx + oy * dy) / (od || 1) < Math.cos(1.05)) continue; hurtMon(m, dmg, '#ffffff'); P.lastHit = m; if (m.rank !== 'boss') moveCircle(m, ox / (od || 1) * 0.3, oy / (od || 1) * 0.3); }
  G.sswords.push({ dx, dy, t: 0, dur: 0.2, R }); P.cast = 0.42 / D.castSpd; sfx(640, 0.12, 'sine', 0.035, -300);
}
// The Aether-Sage reversed: Soul Swarm becomes a draining tether
function castDrainTether(pt) {
  if (P.roll > 0 || P.cast > 0) return;
  if (allWisps() <= 0) { say('Your wisps are spent', 1); return; }
  const a = pt || aimPoint(); let best = null, bd = 3;
  for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - a.x, m.y - a.y); if (d < bd && dist(m, P) < 8) { bd = d; best = m; } }
  if (!best) { say('No enemy near the cursor to tether', 1); return; }
  if (!spendMana('swarm')) return;
  endWraith(); const w = takeWisp(); if (w) burst(w.x, w.y, '#d8f3ff', 4, 1.5);
  G.dtethers.push({ ref: best, t: 3, tick: 0 }); P.cast = 0.3 / D.castSpd; faceTo(best.x, best.y); sfx(300, 0.5, 'sine', 0.04, -100);
}
function onLeashCast(L) {
  if (!L || L.kind !== 'mon') return;
  if (aR('a_rebuke')) { L.pin = true; hurtMon(L.ref, WS.leashDps() * 2, '#bfe8ff'); L.ref.stun = Math.max(L.ref.stun || 0, 0.4); burst(L.ref.x, L.ref.y, '#bfe8ff', 8, 2); }
}
function onWraithEnd() {
  if (aM('g_wraith')) for (let i = 0; i < 6; i++) newSoul(P.x, P.y, i / 6 * 6.28, 5, WS.soulDmg());
}
function onWispPerish(w) {
  if (aM('w_wake')) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.02);
  if (aM('a_revenant')) G.ghosts.push({ x: w.x, y: w.y, r: 0.27, t: 5, cd: 0.3, face: P.face, swingT: 0, dmg: WS.revDmg() * 1.5 });
}
function updateAnimArc(dt) {
  if (P.bellLock > 0) P.bellLock -= dt;
  if (P.maiden > 0) { P.maiden -= dt; if (P.maiden <= 0) D = derive(); }
  // The Choir upright: volleys
  if (aU('a_choir')) { P.volT = (P.volT || 2) - dt; if (P.volT <= 0) { P.volT = 2; let t = null; for (const w of P.wisps) { if (w.kind === 'rev' && w.state === 'drift') { t = t || wispTarget(w, 5); if (t) { w.state = 'dive'; w.target = t; } } else if (w.kind !== 'rev' && !w.beam) w.cd = 0; } if (t) parts.push({ ring: true, x: P.x, y: P.y, r: 0.2, max: 1.4, t: 0.3, col: '#d8f3ff' }); } }
  // The Bell-Warden reversed: nearby casters and archers fall silent
  if (aR('a_bell')) for (const m of G.zone.monsters) { if (m.dead || dist(m, P) > 5 || !(m.b.ai === 'ranged' || m.b.ai === 'caster')) continue; if (m.state === 'windup') { m.state = 'chase'; m.t = 0; } m.cd = Math.max(m.cd, 0.3); }
  // The Lantern-Bearer upright: the lantern walks with you
  if (aU('a_lantern')) for (const t of G.totems) { const tx = P.x - P.face * 0.8, ty = P.y + 0.6; t.x += (tx - t.x) * Math.min(1, dt * 3); t.y += (ty - t.y) * Math.min(1, dt * 3); }
  // Storm upright: pillars call lightning
  if (aU('a_storm')) { P.pzT = (P.pzT || 0) - dt; if (P.pzT <= 0) { P.pzT = 1; for (const p of G.pillars) { if (p.rise > 0) continue; let best = null, bd = 2.8; for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - p.x, m.y - p.y); if (d < bd) { bd = d; best = m; } } if (best) { G.zaps.push({ x0: p.x, y0: p.y, x1: best.x, y1: best.y, t: 0.18, seed: Math.random() * 99 }); hurtMon(best, WS.pillarDmg() * 0.35 + 2, '#d8f3ff'); } } } }
  // Tarnish
  if (aM('i_rust')) for (const m of G.zone.monsters) { if (m.dead) continue; m.rust = G.pillars.some(p => p.rise <= 0 && Math.hypot(p.x - m.x, p.y - m.y) < 1.4) ? 1 : 0; }
  // Pyre reversed: spirit fire behind the wraith
  if (P.wraith && aR('a_pyre')) { P.wfT = (P.wfT || 0) - dt; if (P.wfT <= 0) { P.wfT = 0.25; fireGround(P.x, P.y, 0.55, WS.soulDmg() * 0.35, 3); } }
  // Eye of the Storm
  if (aM('g_storm')) for (const s of G.storms) { s.x += (P.x - s.x) * Math.min(1, dt * 1.2); s.y += (P.y - s.y) * Math.min(1, dt * 1.2); }
  // The Rebuke: whip cracks, or the pinning harpoon
  for (const L of G.leashes) {
    if (L.pin && L.ref && !L.ref.dead && L.ref.rank !== 'boss') L.ref.root = Math.max(L.ref.root || 0, 0.2);
    if (aU('a_rebuke')) { L.crack = (L.crack == null ? 1 : L.crack) - dt; if (L.crack <= 0) { L.crack = 1; const n = L.pts.length - 1; for (const m of G.zone.monsters) { if (m.dead) continue; let touch = false; for (let i = 0; i < n && !touch; i++) { const a = L.pts[i], b = L.pts[i + 1]; if (segDist(m.x, m.y, a.x, a.y, b.x, b.y) < m.r + 0.3) touch = true; } if (!touch) continue; hurtMon(m, WS.leashDps() * 1.2, '#ffffff'); if (m.rank !== 'boss' && m !== L.ref) { const d = dist(m, P) || 1; moveCircle(m, (m.x - P.x) / d * 0.8, (m.y - P.y) / d * 0.8); m.stun = Math.max(m.stun || 0, 0.3); } } sfx(1000, 0.1, 'sawtooth', 0.03, -700); } }
  }
  // draining tethers
  for (const t of G.dtethers) { t.t -= dt; t.tick -= dt; if (!t.ref || t.ref.dead || dist(t.ref, P) > 9) { t.t = 0; continue; } if (t.tick <= 0) { t.tick = 0.25; const dmg = WS.soulDmg() * 0.45; hurtMon(t.ref, dmg, '#bfe8ff'); P.hp = Math.min(D.maxHp, P.hp + dmg * 0.6); } }
  G.dtethers = G.dtethers.filter(t => t.t > 0);
  // ghost trails from the Hollow Blade
  for (const g of G.strails2) { g.t -= dt; g.tick -= dt; if (g.tick <= 0) { g.tick = 0.4; for (const m of G.zone.monsters) if (!m.dead && segDist(m.x, m.y, g.x0, g.y0, g.x1, g.y1) < m.r + 0.2) hurtMon(m, WS.lanceDps() * 0.08, '#e6f4ff'); } }
  G.strails2 = G.strails2.filter(g => g.t > 0);
  for (const w of G.sswords) w.t += dt; G.sswords = G.sswords.filter(w => w.t < w.dur + 0.1);
}

// ------------------------------------------------------------------- Animancer: the mirror shell inherits the golem's skills; the berserk golem's ghostfire
function ghostBeam(src) {
  let best = null, bd = 6.5; for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - src.x, m.y - src.y); if (d < bd && lineClear(G.zone, src, m)) { bd = d; best = m; } }
  if (!best) return;
  hurtMon(best, WS.auraDps() * 0.6, '#ffffff'); (G.gbeams = G.gbeams || []).push({ x0: src.x, y0: src.y, x1: best.x, y1: best.y, t: 0.22 });
  sfx(1400 + Math.random() * 300, 0.06, 'sine', 0.02, -600);
}
function shellHit(m) {
  const s = P.shell; if (!s || s.ramp > 0) return;
  s.charge = Math.min(WS.chargeMax(), s.charge + 0.35 * WS.perWisp());
  if (s.charge >= WS.chargeMax()) { s.ramp = WS.rampLife(); s.charge = 0; banner('RAMPAGE', '#ffffff', 1.4); G.shake = Math.max(G.shake, 4); D = derive(); }
}
function updateShell(dt) {
  const s = P.shell; if (!s || P.dead) return;
  if (s.ramp > 0) {
    s.ramp -= dt; s.auraT = (s.auraT || 0) - dt; s.beamT = (s.beamT || 0) - dt;
    if (s.auraT <= 0) { s.auraT = 0.25; for (const m of G.zone.monsters) if (!m.dead && dist(m, P) < WS.auraR() + m.r) hurtMon(m, WS.auraDps() * 0.25, '#ffffff'); }
    if (s.phos) { if (phosTick(P, s.phos, dt)) s.phos = null; } else if (s.beamT <= 0) { s.phos = startPhos(P); s.beamT = s.phos ? (P.skills.ghostfire > 0 ? 2.2 : 3.5) : 0.3; }
    if (s.ramp - dt <= 0) s.phos = null;
    if (s.ramp <= 0) { for (const m of G.zone.monsters) if (!m.dead && dist(m, P) < WS.detR() + m.r) { hurtMon(m, WS.detDmg(), '#ffffff'); if (m.rank !== 'boss') m.stun = Math.max(m.stun || 0, 1); } parts.push({ ring: true, x: P.x, y: P.y, r: 0.3, max: WS.detR(), t: 0.5, col: '#ffffff' }); G.shake = Math.max(G.shake, 6); banner('ANIMA BURST', '#ffffff', 1.3); D = derive(); }
  }
  if (P.skills.toss > 0) { s.tossT -= dt; if (s.tossT <= 0) { let best = null, bd = 7; for (const m of G.zone.monsters) { if (m.dead) continue; const d = dist(m, P); if (d > 2.4 && d < bd && lineClear(G.zone, P, m)) { bd = d; best = m; } } if (best) { s.tossT = 3.5; const d = bd || 1; G.arcShots.push({ x: P.x, y: P.y, vx: (best.x - P.x) / d * 10, vy: (best.y - P.y) / d * 10, t: 0.8, dmg: WS.golem().dmg[1] * WS.tossDmg(), hit: new Set(), col: '#cfd6e0', pierce: 1 + WS.ricochet(), shield: true }); sfx(260, 0.2, 'triangle', 0.04, 200); } else s.tossT = 0.5; } }
  if (P.skills.challenge > 0) { s.chT -= dt; if (s.chT <= 0) { s.chT = WS.challengeCd(); let n = 0; for (const m of G.zone.monsters) if (!m.dead && m.rank !== 'boss' && dist(m, P) < WS.challengeR()) { aggro(m); n++; if (P.skills.warcry > 0) m.slow = Math.max(m.slow || 0, 0.6); } if (n) { parts.push({ ring: true, x: P.x, y: P.y, r: 0.4, max: WS.challengeR(), t: 0.45, col: '#c8553d' }); if (P.skills.defy > 0) P.defyT = 3; } } }
  if (P.defyT > 0) P.defyT -= dt;
}
function lanternKill(m) {
  if (P.cls !== 'animancer') return;
  if (m.lantern && m.lantern.life > 0 && Math.hypot(m.x - m.lantern.x, m.y - m.lantern.y) < 4.5) { if (P.wisps.length < effCap()) { spawnWisp(); const w = P.wisps[P.wisps.length - 1]; if (w) { w.x = m.x; w.y = m.y; } } P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.02); floatText(m.x, m.y, 'wisp freed', '#ffe2a0'); }
  if (P.skills.hymn > 0) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.01 * Math.floor(P.wisps.length / 3));
  if (P.skills.lastword > 0) P.mana = Math.min(D.maxMana, P.mana + 3);
}
function updateCages(dt) {
  if (G.gbeams) { for (const b of G.gbeams) b.t -= dt; G.gbeams = G.gbeams.filter(b => b.t > 0); }
  if (!G.cages) return;
  for (const c of G.cages) {
    c.t -= dt; c.tick -= dt;
    if (c.tick <= 0 && P.skills.spikedcage > 0) { c.tick = 1; for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - c.x, m.y - c.y) < 1.7) hurtMon(m, WS.cageDmg() * 0.3, '#e8f6ff'); }
    if (c.t <= 0 && P.skills.maidcrush > 0) { for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - c.x, m.y - c.y) < 1.9) { hurtMon(m, WS.cageDmg() * 1.5, '#cfd6e0'); if (m.rank !== 'boss') m.stun = Math.max(m.stun || 0, 1); } parts.push({ ring: true, x: c.x, y: c.y, r: 1.9, max: 0.2, t: 0.35, col: '#e8f6ff' }); anGlassBurst(c.x, c.y, 30, 3, 14); G.shake = Math.max(G.shake, 3); }
  }
  G.cages = G.cages.filter(c => c.t > 0);
  if (G.gbeams) { for (const b of G.gbeams) b.t -= dt; G.gbeams = G.gbeams.filter(b => b.t > 0); }
}
