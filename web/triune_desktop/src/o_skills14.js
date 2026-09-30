
// =================================================================== v0.14: shared skill systems
// costs that climb with skill level, left-click skills that can be held, melee that walks instead of teleporting,
// and Diablo 2 style synergies.
Object.assign(G, { anvils: [], words: [], banners: [], brains: [], gspirits: [], lashFx: [], siphFx: [], nests: [], bwaves: [], skins: [], spits: [], arcFx14: [], thrustFx: [], reasmQ: [], colRebuild: null, hornT: 0, pactT: 0 });
Object.assign(P, { approach: null, leftHeld: false, barmor: 0, barmorMax: 0, leap: null, oozeHasteT: 0, oozeHasteK: 0, moltT: 0 });

// every level of a skill makes it cost 5% more
function skillCost(id, lvl) {
  const s = SK[id]; if (!s || !s.mana) return 0;
  const L = lvl != null ? lvl : Math.max(1, P.skills[id] || 1);
  return s.mana * arcCost(id) * (1 + 0.05 * (L - 1));
}
// is this skill held down right now, on either mouse button?
function heldSkill(id) {
  if (P.dead || G.paused) return false;
  if (mouse.r && P.right === id && !uiBlocksMouse()) return true;
  if (typeof TOUCH !== 'undefined' && TOUCH.hotHold === id) return true;
  return !!(mouse.l && P.leftHeld && P.left === id);
}
// melee skills never teleport: when the enemy is out of reach you walk to it and strike when you arrive
function meleeFoe(a, maxD) {
  let best = null, bd = 1e9;
  for (const m of G.zone.monsters) { if (m.dead) continue; const dp = dist(m, P); if (dp > maxD + m.r) continue; const d = Math.hypot(m.x - a.x, m.y - a.y) + dp * 0.3; if (d < bd && lineClear(G.zone, P, m)) { bd = d; best = m; } }
  return best;
}
function meleeApproach(id, a, reach, area) {
  if (G.sisterCast) return true;
  if (area) for (const m of G.zone.monsters) if (!m.dead && dist(m, P) <= reach + m.r) return true;
  const m = meleeFoe(a, 9); if (!m) return true;
  if (dist(m, P) <= reach + m.r + 0.05) return true;
  if (P.approach && P.approach.id === id && P.approach.ref === m) return false;
  P.approach = { id, ref: m, reach, t: 4 }; P.target = null; setPathTo(m.x, m.y); P.repathT = 0.25;
  return false;
}
function updateApproach(dt) {
  const A = P.approach; if (!A) return;
  const m = A.ref; A.t -= dt;
  if (!m || m.dead || m.engulfed || A.t <= 0 || P.roll > 0 || !P.skills[A.id]) { P.approach = null; return; }
  if (dist(m, P) <= A.reach + m.r + 0.05) {
    P.path = null; faceTo(m.x, m.y);
    if (P.cast <= 0) { P.approach = null; castSkill(A.id, { x: m.x, y: m.y }); }
    return;
  }
  P.repathT -= dt; if (P.repathT <= 0 || !P.path) { P.repathT = 0.25; setPathTo(m.x, m.y); }
}

// ------------------------------------------------------------------- synergies (Diablo 2): hard points in one skill add to another
const SYN = {
  pillars: [['fissure', 8], ['cage', 6], ['anvil', 6]], fissure: [['pillars', 8], ['anvil', 8]], cage: [['pillars', 8], ['fissure', 6]], anvil: [['fissure', 10], ['pillars', 8]],
  golem: [['thorns', 5], ['challenge', 5], ['overcharge', 5]], toss: [['golem', 6], ['thorns', 4]],
  wisps: [['restless', 6], ['cull', 5]], beam: [['prism', 6], ['totem', 5]], prism: [['beam', 6], ['totem', 5]], condense: [['wisps', 5], ['cull', 4]], leash: [['totem', 6], ['cull', 5]], totem: [['beam', 6], ['leash', 6]],
  swarm: [['storm', 8], ['chain', 6]], lance: [['orb', 6], ['word', 5]], orb: [['lance', 6], ['word', 6]], word: [['orb', 8], ['mark', 6]], chain: [['swarm', 6], ['storm', 6]],
  raise: [['banner', 5], ['horn', 5]], colossus: [['raise', 5], ['reasm', 5], ['horn', 4]], offering: [['raise', 8], ['spear', 5]],
  spear: [['sstorm', 8], ['spirit', 6], ['siphon', 5]], ribcage: [['spikes', 6], ['ossify', 6]], wall: [['spikes', 5], ['bonerain', 5]], spikes: [['ribcage', 8], ['ossify', 6]], sstorm: [['spear', 8], ['bonerain', 6]], siphon: [['spear', 6], ['ossify', 5]], bonerain: [['sstorm', 8], ['spikes', 6]], spirit: [['spear', 8], ['bonerain', 6]],
  bscythe: [['blade', 8], ['crush', 6]], crush: [['blade', 8], ['bscythe', 5]], gcharge: [['host', 6], ['leap', 6]], leap: [['gcharge', 8], ['host', 5]], lash: [['bscythe', 6], ['crush', 6]], barmor: [['aura', 6], ['carapm', 4]],
  eggsac: [['hatch', 6], ['nest', 5]], hatch: [['assim', 5], ['hive', 4]], thrall: [['hatch', 5], ['bboil', 5]], rush: [['hatch', 8], ['bfrenzy', 6]], fgolem: [['hatch', 5], ['devour', 5], ['hive', 5]],
  blance: [['hemor', 6], ['bboil', 6]], hemor: [['blance', 6], ['bboil', 6]], vwhip: [['blance', 6], ['tentacles', 5]], cburst: [['hemor', 6], ['bwave', 6]], spool: [['pact', 6], ['hemor', 5]], bwave: [['blance', 8], ['cburst', 6]], bboil: [['hemor', 6]],
  tentacles: [['vwhip', 6], ['maw', 5]], bilehump: [['eggsac', 6]], maw: [['swallow', 8], ['devour', 5]],
  shuriken: [['vblade', 6], ['rotwall', 6]], pnova: [['mcloud', 6], ['exhale', 6]], rotwall: [['shuriken', 8], ['pnova', 6]], contagion: [['vblade', 6], ['mstorm', 6]], exhale: [['inhale', 8], ['pnova', 6]], mstorm: [['contagion', 8], ['mcloud', 6]], vblade: [['contagion', 6]],
  ntrap: [['bmine', 6], ['mwake', 6]], mwake: [['ntrap', 6], ['bmine', 6]], bmine: [['ntrap', 8], ['mwake', 6]],
  rarc: [['gstrike', 6], ['flurry', 5]], gstrike: [['rarc', 6], ['execute', 5]], thrust: [['dstep', 6], ['gstrike', 5]], talon: [['rarc', 6], ['dstep', 5]], dstep: [['thrust', 8]], flurry: [['rarc', 6], ['talon', 6]], reap: [['execute', 6], ['gstrike', 5]], execute: [['reap', 6], ['gstrike', 5]]
};
function synBonus(id) { const L = SYN[id]; if (!L || !P.hard) return 0; let b = 0; for (const [s, pc] of L) b += pc * (P.hard[s] || 0); return b / 200; }  // v0.22: synergies at half strength
function syn(id) { return 1 + synBonus(id); }
function synLines(id) {
  const L = SYN[id]; if (!L) return [];
  const out = [['Synergies (hard points only):', '#d9a441']];
  for (const [s, pc] of L) if (SK[s]) out.push([`  ${SK[s].name}: +${pc}% per level (now +${pc * ((P.hard && P.hard[s]) || 0)}%)`, (P.hard && P.hard[s]) ? '#e8d6a0' : '#6f6a79']);
  return out;
}
// wrap the class number tables once everything exists
function wrapSyn(o, fn, id) { const f0 = o[fn]; if (!f0) return; o[fn] = (...a) => { const v = f0(...a), k = syn(id); return Array.isArray(v) ? v.map(x => x * k) : v * k; }; }

// ------------------------------------------------------------------- Animancer: Iron Anvil, Cull, Word of Unmaking, Chain of Logos
WS.anvilDmg = () => (22 + 11 * (L1('anvil') - 1)) * D.dmgMult * WS.iron();
WS.wordDmg = () => (30 + 14 * (L1('word') - 1)) * D.dmgMult * WS.nether();
WS.chainDmg = () => (12 + 6 * (L1('chain') - 1)) * D.dmgMult * WS.nether();
WS.chainN = () => 4 + Math.floor(L1('chain') / 4);
function castAnvil(pt) {
  if (!P.skills.anvil || P.cast > 0 || P.roll > 0) return;
  if (!spendMana('anvil')) return;
  endWraith();
  const a = clampCast(pt || aimPoint(), 9);
  dropAnvil(a.x, a.y, 1, 0);
  if (P.skills.anvilrain > 0) for (let i = 0; i < 2; i++) { const ang = Math.random() * 6.28; const q = clampCast({ x: a.x + Math.cos(ang) * 1.7, y: a.y + Math.sin(ang) * 1.7 }, 11); dropAnvil(q.x, q.y, 0.7, 0.2 + i * 0.2); }
  P.cast = 0.45 / D.castSpd; faceTo(a.x, a.y); sfx(300, 0.5, 'sine', 0.03, -250);
}
function dropAnvil(x, y, k, delay) {
  if (G.zone.solidAt(x, y)) return;
  G.anvils.push({ x, y, r: 0.42, fall: 0.5 + delay, fallMax: 0.5, delay, life: P.skills.anvilstay > 0 ? 16 : 8, dmg: WS.anvilDmg() * k, fresh: true });
  while (G.anvils.length > 8) G.anvils.shift();
}
function updateAnvils(dt) {
  for (const a of G.anvils) {
    if (a.fall > 0) {
      a.fall -= dt;
      if (a.fall <= 0 && a.fresh) {
        a.fresh = false; G.shake = Math.max(G.shake, 5); burst(a.x, a.y, '#8b93a0', 24, 3); sfx(55, 0.6, 'square', 0.07, -20); sfx(900, 0.2, 'triangle', 0.03, -500);
        for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - a.x, m.y - a.y); if (d > 1.25 + m.r) continue; hurtMon(m, a.dmg, '#cfd6e0'); m.stun = Math.max(m.stun || 0, m.rank === 'boss' ? 0.4 : 1.2); if (d < a.r + m.r) moveCircle(m, (m.x - a.x) / (d || 1) * (a.r + m.r - d + 0.05), (m.y - a.y) / (d || 1) * (a.r + m.r - d + 0.05)); }
        parts.push({ ring: true, x: a.x, y: a.y, r: 0.3, max: 1.4, t: 0.4, col: '#cfd6e0' });
        if (P.skills.anvilquake > 0) { for (let i = 0; i < 10; i++) { const ang = i / 10 * 6.28; parts.push({ spike: true, x: a.x + Math.cos(ang) * 1.6, y: a.y + Math.sin(ang) * 1.6, t: 0.45 }); } for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - a.x, m.y - a.y) < 2.2 + m.r) hurtMon(m, a.dmg * 0.4, '#cfd6e0'); }
      }
      continue;
    }
    a.life -= dt;
    if (P.skills.anvilstay > 0) for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - a.x, m.y - a.y) < 1.8 + m.r) m.slow = Math.max(m.slow || 0, 0.4);
  }
  G.anvils = G.anvils.filter(a => { if (a.life <= 0) { burst(a.x, a.y, '#6f5a40', 14, 1.6); return false; } return true; });
}
function castCull(pt) {
  if (!P.skills.cull || P.cast > 0 || P.roll > 0) return;
  const a = pt || aimPoint();
  const foes = G.zone.monsters.filter(m => !m.dead && Math.hypot(m.x - a.x, m.y - a.y) < 3.5 && dist(m, P) < 11 && lineClear(G.zone, P, m));
  if (!foes.length) { say('No enemy near the cursor to cull', 1); return; }
  const revs = P.wisps.filter(w => w.kind === 'rev' && w.state === 'drift');
  if (!revs.length) { say('No revenant wisps are drifting', 1); return; }
  if (!spendMana('cull')) return;
  endWraith();
  revs.forEach((w, i) => { w.state = 'dive'; w.target = foes[i % foes.length]; w.cullT = P.skills.cullreturn > 0 ? 2.4 : 1.4; w.cullPool = foes; w.hitT = new Map(); });
  parts.push({ ring: true, x: a.x, y: a.y, r: 3.2, max: 0.3, t: 0.4, col: '#d8f3ff' });
  P.cast = 0.3 / D.castSpd; faceTo(a.x, a.y); sfx(600, 0.2, 'sine', 0.035, 500);
}
function castWord(pt) {
  if (!P.skills.word || P.cast > 0 || P.roll > 0) return;
  if (!spendMana('word')) return;
  endWraith();
  const a = clampCast(pt || aimPoint(), 9), R = 2.4 * (P.skills.wordwide > 0 ? 1.5 : 1), dmg = WS.wordDmg();
  G.words.push({ x: a.x, y: a.y, R, t: 0, dur: 1.1, dmg, seed: Math.random() * 6 });
  if (P.skills.wordecho > 0) G.words.push({ x: a.x, y: a.y, R, t: -0.9, dur: 1.1, dmg: dmg * 0.7, seed: Math.random() * 6 });
  P.cast = 0.55 / D.castSpd; faceTo(a.x, a.y); sfx(140, 0.9, 'sine', 0.05, -60); sfx(420, 0.6, 'triangle', 0.02, 200);
}
function updateWords(dt) {
  for (const w of G.words) {
    w.t += dt; if (w.t < 0) continue;
    if (w.t < w.dur) {
      for (const m of G.zone.monsters) { if (m.dead || m.rank === 'boss') continue; const d = Math.hypot(m.x - w.x, m.y - w.y); if (d < w.R + 1.2 && d > 0.2) { const k = Math.min(d - 0.15, 2.6 * dt); moveCircle(m, (w.x - m.x) / d * k, (w.y - m.y) / d * k); m.slow = Math.max(m.slow || 0, 0.5); } }
      if (Math.random() < 0.8) { const a = Math.random() * 6.28; parts.push({ fly: true, x: w.x + Math.cos(a) * w.R, y: w.y + Math.sin(a) * w.R, z: 4, x0: w.x + Math.cos(a) * w.R, y0: w.y + Math.sin(a) * w.R, z0: 4, to: { x: w.x, y: w.y, z: 10 }, k: 0, t: 0.3 }); }
    } else if (!w.done) {
      w.done = true;
      for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - w.x, m.y - w.y) < w.R + m.r) { hurtMon(m, w.dmg, '#ffffff'); if (m.rank !== 'boss') m.stun = Math.max(m.stun || 0, 0.6); }
      parts.push({ ring: true, x: w.x, y: w.y, r: w.R, max: 0.2, t: 0.35, col: '#ffffff' }); burst(w.x, w.y, '#ffffff', 36, 3.2);
      G.shake = Math.max(G.shake, 4); sfx(50, 0.7, 'sawtooth', 0.06, -20); sfx(1600, 0.3, 'sine', 0.03, -1200);
    }
  }
  G.words = G.words.filter(w => !w.done || w.t < w.dur + 0.3);
}
function castChain(pt) {
  if (!P.skills.chain || P.cast > 0 || P.roll > 0) return;
  const a = pt || aimPoint();
  let first = null, bd = 2.5;
  for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - a.x, m.y - a.y); if (d < bd && dist(m, P) < 10 && lineClear(G.zone, P, m)) { bd = d; first = m; } }
  if (!first) { say('No enemy near the cursor', 0.9); return; }
  if (!spendMana('chain')) return;
  endWraith();
  const dmg = WS.chainDmg(), hit = new Set([first]);
  G.zaps.push({ x0: P.x, y0: P.y, x1: first.x, y1: first.y, t: 0.22, seed: Math.random() * 99, col: '#ffffff' });
  hurtMon(first, dmg, '#ffffff'); P.lastHit = first;
  const n = WS.chainN() - 1;
  if (n > 0) { shockArc(first, dmg * 0.85, n, hit, '#ffffff'); if (P.skills.chainfork > 0) shockArc(first, dmg * 0.7, Math.max(1, n - 1), hit, '#ffffff'); }
  if (P.skills.chainmark > 0) setTimeout(() => { for (const m of hit) if (!m.dead) m.marked = Math.max(m.marked || 0, 3); }, 500);
  P.cast = 0.36 / D.castSpd; faceTo(first.x, first.y); sfx(1300, 0.15, 'square', 0.03, -900);
}

// ------------------------------------------------------------------- Animancer: the berserk golem's phosphorus beam
// Every few seconds of its rampage the golem plants its feet and sweeps a searing white-green beam across its enemies.
function startPhos(src) {
  let best = null, bd = 7;
  for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - src.x, m.y - src.y); if (d < bd && lineClear(G.zone, src, m)) { bd = d; best = m; } }
  if (!best) return null;
  const a = Math.atan2(best.y - src.y, best.x - src.x), dir = Math.random() < 0.5 ? 1 : -1;
  sfx(180, 1.2, 'sawtooth', 0.04, 400); sfx(1200, 1.1, 'sine', 0.02, -300);
  return { t: 0, dur: 1.3, a0: a - dir * 0.85, a1: a + dir * 0.85, len: 6.5, tick: 0, hitT: new Map(), fireT: 0, ang: a - dir * 0.85, end: { x: src.x, y: src.y } };
}
function phosTick(src, ph, dt) {
  ph.t += dt; const k = Math.min(1, ph.t / ph.dur), ease = k * k * (3 - 2 * k);
  ph.ang = ph.a0 + (ph.a1 - ph.a0) * ease;
  const dx = Math.cos(ph.ang), dy = Math.sin(ph.ang); let L = ph.len;
  for (let s = 0.3; s < ph.len; s += 0.2) { const t = G.zone.get(Math.floor(src.x + dx * s), Math.floor(src.y + dy * s)); if (TALL[t] && t !== T.ROCK) { L = s; break; } }
  ph.end = { x: src.x + dx * L, y: src.y + dy * L }; ph.L = L;
  if (src.face != null && src !== P) src.face = dx - dy > 0 ? 1 : -1;
  const dps = WS.auraDps() * 1.6;
  for (const m of G.zone.monsters) {
    if (m.dead || segDist(m.x, m.y, src.x, src.y, ph.end.x, ph.end.y) > m.r + 0.3) continue;
    const last = ph.hitT.get(m) || -9; if (G.time - last < 0.2) continue; ph.hitT.set(m, G.time);
    hurtMon(m, dps * 0.2, '#eaffd8'); burnMon(m, dps * 0.15, 2);
  }
  ph.fireT -= dt; if (ph.fireT <= 0) { ph.fireT = 0.12; fireGround(ph.end.x, ph.end.y, 0.5, dps * 0.1, 2.2); const f = G.fires[G.fires.length - 1]; if (f) f.pale = true; }
  if (Math.random() < 0.7) parts.push({ x: ph.end.x, y: ph.end.y, z: 4, vx: rand(-2, 2), vy: rand(-2, 2), vz: 20, t: 0.4, col: Math.random() < 0.5 ? '#eaffd8' : '#b8ffb0' });
  return ph.t >= ph.dur;
}

// ------------------------------------------------------------------- Ossurarch: new bones
Object.assign(BS, {
  offerDmg: () => (8 + 4 * (L1('offering') - 1)) * BS.power(),
  bannerR: () => (3 + 0.05 * L1('banner')) * (P.skills.bannerwide > 0 ? 1.5 : 1),
  bannerK: () => 1.3 + 0.01 * L1('banner'),
  unearthN: () => 3 + Math.floor(L1('unearth') / 4),
  hornLife: () => 6 + (P.skills.hornlong > 0 ? 4 : 0),
  bwardPct: () => Math.min(0.4, 0.15 + 0.01 * L1('bward')),
  reasmPct: () => Math.min(0.4, 0.15 + 0.01 * L1('reasm')),
  siphonDmg: () => (7 + 3.5 * (L1('siphon') - 1)) * BS.power(),
  ossifyR: () => (1.8 + 0.03 * L1('ossify')) * (P.skills.ossifywide > 0 ? 1.5 : 1),
  rainDmg: () => (6 + 3 * (L1('bonerain') - 1)) * BS.power(),
  spiritDmg: () => (40 + 18 * (L1('spirit') - 1)) * BS.power(),
  barmorMax: () => (30 + 12 * (L1('barmor') - 1)) * syn('barmor'),
  crushDmg: () => BS.weapon() * (1.8 + 0.14 * L1('crush')),
  leapDmg: () => (12 + 6 * (L1('leap') - 1)) * BS.power() + BS.weapon() * 0.5,
  lashDmg: () => BS.weapon() * (1.1 + 0.1 * L1('lash'))
});
function boneInfo14(id) {
  const r = Math.round, pc = v => Math.round(v * 100) + '%';
  switch (id) {
    case 'offering': return `${P.skills.offerwide > 0 ? 12 : 8} shards · ${r(BS.offerDmg())} each · 5 shards back to your aura`;
    case 'banner': return `Minions within ${BS.bannerR().toFixed(1)} yd strike ${pc(BS.bannerK() - 1)} faster and mend 3%/s · enemies slowed`;
    case 'unearth': return `Up to ${BS.unearthN()} corpses rise for ${15 + (P.skills.unearthlong > 0 ? 10 : 0)} s`;
    case 'horn': return `${BS.hornLife()} s · minions +40% attack speed, +20% damage · shakes enemies in 5 yd`;
    case 'bward': return `Skeletons within 3 yd take ${pc(BS.bwardPct())} of each blow meant for you`;
    case 'reasm': return `${pc(BS.reasmPct())} for a skeleton to rise again · Colossus reforms after ${P.skills.reasmfast > 0 ? 3 : 6} s`;
    case 'siphon': return `${r(BS.siphonDmg())} damage in a 3.5 yd cone · a shard from each (up to 4)`;
    case 'ossify': return `${BS.ossifyR().toFixed(1)} yd · 8 s · 30% slower, +20% damage taken`;
    case 'bonerain': return `${r(BS.rainDmg())} per shard · 2.2 yd · ${2 + (P.skills.rainlong > 0 ? 1 : 0)} s`;
    case 'spirit': return `${r(BS.spiritDmg())} to its prey · a nova of 8 shards`;
    case 'barmor': return `Soaks ${r(BS.barmorMax())} damage`;
    case 'crush': return `${r(BS.crushDmg())} damage · +25% damage taken for 5 s · knocks 2 shards loose`;
    case 'leap': return `${r(BS.leapDmg())} in 1.6 yd · up to 6 yd`;
    case 'lash': return `${r(BS.lashDmg())} along 3.5 yd · pulls the farthest`;
  }
  return '';
}
function bannerHaste(e) { for (const b of G.banners) if (Math.hypot(e.x - b.x, e.y - b.y) < b.R) return BS.bannerK(); return 1; }
function onShardGathered(v) {
  if (P.skills.barmorshard > 0 && P.barmorMax > 0) P.barmor = Math.min(P.barmorMax, P.barmor + 2 * v);
}
function onBoneKill14(m) {
  if (m.ossT > 0) { gainShard(m); for (let i = 0; i < 4; i++) { const a = i / 4 * 6.28 + 0.4; G.bspears.push({ x: m.x, y: m.y, vx: Math.cos(a) * 10, vy: Math.sin(a) * 10, t: 0.35, dmg: BS.siphonDmg() * 0.5, hit: new Set([m]), small: true, pierce: 2 }); } }
}
function onSkelDies14(e, quiet) {
  if (e.temp && P.skills.unearthburst > 0) { gainShard(e); gainShard(e); }
  if (!quiet && !e.temp && P.skills.reasm > 0 && Math.random() < BS.reasmPct()) G.reasmQ.push({ x: e.x, y: e.y, sq: e.sq, t: 3.5 });
}
function onColossusFall(c) {
  if (P.skills.reasm > 0) G.colRebuild = { x: c.x, y: c.y, t: P.skills.reasmfast > 0 ? 3 : 6, max: P.skills.reasmfast > 0 ? 3 : 6, n: P.skills.reasmfull > 0 ? c.n : Math.max(1, Math.floor(c.n / 2)) };
}
function boneAbsorb14(d) {
  if (P.barmor > 0 && d > 0) {
    const s = Math.min(P.barmor, d); P.barmor -= s; d -= s;
    if (s > 0.5) burst(P.x, P.y, '#e8e2d0', 3, 1.4);
    if (P.skills.barmorthorn > 0) { const m = nearestMonTo(P, 1.8); if (m) hurtMon(m, BS.moteDmg() * 2, '#e8e2d0'); }
    if (P.barmor <= 0) { floatText(P.x, P.y, 'bone armor shatters', '#cfc6ae'); sfx(500, 0.2, 'square', 0.04, -300); }
  }
  if (P.skills.bward > 0 && d > 0) {
    const guards = G.skels.filter(e => e.rise <= 0 && dist(e, P) < 3);
    if (guards.length) {
      const share = d * BS.bwardPct(), e = pick(guards); d -= share; hurtSkel(e, share, 'magic'); e.guardT = 0.35;
      G.zaps.push({ x0: e.x, y0: e.y, x1: P.x, y1: P.y, t: 0.15, seed: 0, rope: true });
      if (P.skills.bwardthorn > 0) { const m = nearestMonTo(e, 2.2); if (m) hurtMon(m, BS.moteDmg() * 1.5, '#e8e2d0'); }
    }
  }
  return d;
}
function boneCast14(id, a) {
  switch (id) {
    case 'offering': castOffering(a); P.cast = 0.35 / D.castSpd; break;
    case 'banner': castBanner(a); P.cast = 0.45 / D.castSpd; break;
    case 'unearth': castUnearth(a); P.cast = 0.45 / D.castSpd; break;
    case 'horn': castHorn(); P.cast = 0.5 / D.castSpd; break;
    case 'siphon': castSiphon(a); P.cast = 0.4 / D.castSpd; break;
    case 'ossify': castOssify(a); P.cast = 0.4 / D.castSpd; break;
    case 'bonerain': castBoneRain(a); P.cast = 0.45 / D.castSpd; break;
    case 'spirit': castSpirit(a); P.cast = 0.45 / D.castSpd; break;
    case 'barmor': P.barmorMax = BS.barmorMax(); P.barmor = P.barmorMax; burst(P.x, P.y, '#e8e2d0', 22, 2.4); floatText(P.x, P.y, 'bone armor', '#e8e2d0'); sfx(160, 0.35, 'square', 0.05, 80); P.cast = 0.4 / D.castSpd; break;
    case 'crush': castCrush(a); P.cast = 0.55 / D.castSpd; break;
    case 'leap': castLeap(a); break;
    case 'lash': castLash(a); P.cast = 0.45 / D.castSpd; break;
  }
}
function castOffering(a) {
  const e = G.skels.filter(s => s.rise <= 0).sort((p, q) => Math.hypot(p.x - a.x, p.y - a.y) - Math.hypot(q.x - a.x, q.y - a.y))[0];
  if (!e || Math.hypot(e.x - a.x, e.y - a.y) > 4) { say('No skeleton near the cursor to offer', 1.2); return; }
  const x = e.x, y = e.y, wide = P.skills.offerwide > 0, n = wide ? 12 : 8, base = Math.atan2(a.y - P.y, a.x - P.x), dmg = BS.offerDmg();
  skelDies(e, true);
  if (!e.temp) P.shards = Math.min(freeCap(), P.shards + BS.skelCost());
  for (let i = 0; i < n; i++) { const ang = wide ? i / n * 6.28 : base + (i / (n - 1) - 0.5) * 1.3; G.bspears.push({ x, y, vx: Math.cos(ang) * 12, vy: Math.sin(ang) * 12, t: 0.5, dmg, hit: new Set(), small: true, pierce: wide ? 4 : 2 }); }
  if (P.skills.offerheal > 0) { P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.08); floatText(P.x, P.y, 'blood price', '#9fe0a0'); }
  burst(x, y, '#e8e2d0', 20, 2.6); G.shake = Math.max(G.shake, 2); sfx(420, 0.18, 'square', 0.05, -300);
}
function castBanner(a) {
  const p = clampCast(a, 6);
  G.banners = [{ x: p.x, y: p.y, R: BS.bannerR(), t: 15, max: 15, feared: new Set() }];
  burst(p.x, p.y, '#8e2630', 16, 2); sfx(110, 0.5, 'square', 0.05, 60);
}
function castUnearth(a) {
  const cs = G.zone.monsters.filter(c => c.dead && !c.hatched && !c.eaten && !c.burst && !c.erased && c.rank !== 'boss' && G.time - (c.deadAt || 0) < CORPSE_LIFE && Math.hypot(c.x - a.x, c.y - a.y) < 3.5).slice(0, BS.unearthN());
  if (!cs.length) { say('No fresh corpses near the cursor', 1.2); return; }
  for (const c of cs) { c.eaten = true; c.hatched = true; const e = raiseSkel(c.x, c.y, false, 0); e.temp = 15 + (P.skills.unearthlong > 0 ? 10 : 0); }
  floatText(a.x, a.y, `${cs.length} unearthed`, '#cfc6ae'); sfx(90, 0.5, 'square', 0.05, 40);
}
function castHorn() {
  G.hornT = BS.hornLife();
  if (P.skills.hornheal > 0) { for (const e of G.skels) e.hp = Math.min(e.max, e.hp + e.max * 0.25); if (G.colossus) G.colossus.hp = Math.min(G.colossus.max, G.colossus.hp + G.colossus.max * 0.25); }
  for (const m of G.zone.monsters) if (!m.dead && dist(m, P) < 5 + m.r) { m.slow = Math.max(m.slow || 0, 0.6); if (m.rank !== 'boss') m.stun = Math.max(m.stun || 0, 0.3); }
  parts.push({ ring: true, x: P.x, y: P.y, r: 0.3, max: 5, t: 0.6, col: '#c8553d' }); banner('WAR HORN', '#cfc6ae', 1);
  sfx(98, 1.2, 'sawtooth', 0.05, 30); sfx(147, 1, 'sawtooth', 0.03, 20);
}
function castSiphon(a) {
  const d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d, R = 3.5, dmg = BS.siphonDmg();
  let n = 0;
  for (const m of G.zone.monsters) {
    if (m.dead) continue; const ox = m.x - P.x, oy = m.y - P.y, od = Math.hypot(ox, oy); if (od > R + m.r || (ox * dx + oy * dy) / (od || 1) < Math.cos(0.75) || !lineClear(G.zone, P, m)) continue;
    hurtMon(m, dmg, '#e8e2d0'); P.lastHit = m; if (P.skills.siphonslow > 0) m.slow = Math.max(m.slow || 0, 0.6);
    if (n < 4) { gainShard(m); n++; if (P.skills.siphonheal > 0) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.01); }
    G.zaps.push({ x0: m.x, y0: m.y, x1: P.x, y1: P.y, t: 0.25, seed: Math.random() * 99, col: '#e8e2d0' });
  }
  G.siphFx.push({ dx, dy, t: 0.3, R });
  sfx(220, 0.4, 'sine', 0.04, -120);
}
function castOssify(a) {
  const p = clampCast(a, 9), R = BS.ossifyR(); let n = 0;
  for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - p.x, m.y - p.y) < R + m.r) { m.ossT = 8; if (P.skills.ossifylock > 0) m.root = Math.max(m.root || 0, m.rank === 'boss' ? 0.5 : 1.5); aggro(m); n++; }
  parts.push({ ring: true, x: p.x, y: p.y, r: 0.3, max: R, t: 0.5, col: '#e8e2d0' }); burst(p.x, p.y, '#cfc6ae', 18, 2.2);
  sfx(700, 0.4, 'square', 0.03, -500);
}
function castBoneRain(a) {
  const p = clampCast(a, 9);
  G.brains.push({ x: p.x, y: p.y, R: 2.2, t: 2 + (P.skills.rainlong > 0 ? 1 : 0), dmg: BS.rainDmg(), spawnT: 0, drops: [] });
  for (let i = 0; i < 10; i++) { const ang = Math.random() * 6.28, r = Math.random() * 2.5; spawnMote(P.x + Math.cos(ang) * r, P.y + Math.sin(ang) * r, { rise: 0.1, val: 0, dmg: 0, flyUp: true, t: 3.5 }); }
  sfx(300, 0.6, 'triangle', 0.03, 400);
}
function castSpirit(a) {
  const n = P.skills.spirittwin > 0 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    let T = null, bd = 3; for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - a.x, m.y - a.y) + (i ? rand(0, 1.5) : 0); if (d < bd && dist(m, P) < 13) { bd = d; T = m; } }
    const ang = Math.atan2(a.y - P.y, a.x - P.x) + (i ? 0.8 : -0.3);
    G.gspirits.push({ x: P.x, y: P.y, vx: Math.cos(ang) * 4, vy: Math.sin(ang) * 4, tgt: T, tx: a.x, ty: a.y, t: 4, dmg: BS.spiritDmg(), chain: P.skills.spiritchain > 0 ? 1 : 0, hit: new Set(), ph: Math.random() * 6 });
  }
  sfx(160, 0.8, 'sawtooth', 0.04, 200);
}
function spiritBurst(s) {
  s.t = 0; const T = s.tgt && !s.tgt.dead ? s.tgt : null;
  if (T) { hurtMon(T, s.dmg, '#e8e2d0'); s.hit.add(T); P.lastHit = T; }
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.28; G.bspears.push({ x: s.x, y: s.y, vx: Math.cos(a) * 11, vy: Math.sin(a) * 11, t: 0.35, dmg: s.dmg * 0.25, hit: new Set(T ? [T] : []), small: true, pierce: 2 }); }
  burst(s.x, s.y, '#e8e2d0', 26, 3); G.shake = Math.max(G.shake, 2.5); sfx(90, 0.4, 'square', 0.05, -40);
  if (s.chain > 0) {
    let n = null, bd = 5; for (const m of G.zone.monsters) { if (m.dead || s.hit.has(m)) continue; const d = Math.hypot(m.x - s.x, m.y - s.y); if (d < bd) { bd = d; n = m; } }
    if (n) G.gspirits.push({ x: s.x, y: s.y, vx: 0, vy: 0, tgt: n, tx: n.x, ty: n.y, t: 3, dmg: s.dmg * 0.5, chain: s.chain - 1, hit: s.hit, ph: s.ph });
  }
}
function castCrush(a) {
  let m = null, bd = 1e9; const R = meleeReach() + 0.3;
  for (const o of G.zone.monsters) { if (o.dead || dist(o, P) > R + o.r) continue; const d = Math.hypot(o.x - a.x, o.y - a.y); if (d < bd) { bd = d; m = o; } }
  P.swing = 0.3; if (!m) { sfx(300, 0.08, 'triangle', 0.02, -150); return; }
  faceTo(m.x, m.y);
  const dmg = BS.crushDmg();
  hurtMon(m, dmg, '#ffffff'); P.lastHit = m; m.crushT = 5; gainShard(m); gainShard(m); boneSwing(m);
  if (P.skills.crushstun > 0) m.stun = Math.max(m.stun || 0, m.rank === 'boss' ? 0.3 : 1);
  if (P.skills.crushsplash > 0) for (const o of G.zone.monsters) if (!o.dead && o !== m && Math.hypot(o.x - m.x, o.y - m.y) < 1.5 + o.r) hurtMon(o, dmg * 0.6, '#e8e2d0');
  parts.push({ ring: true, x: m.x, y: m.y, r: 0.2, max: 1.2, t: 0.3, col: '#f4efe2' }); burst(m.x, m.y, '#e8e2d0', 16, 2.4);
  G.shake = Math.max(G.shake, 3); sfx(70, 0.3, 'square', 0.06, -30); sfx(900, 0.08, 'square', 0.03, -600);
}
function castLeap(a) {
  const p = clampCast(a, 6), d = Math.hypot(p.x - P.x, p.y - P.y);
  P.leap = { x0: P.x, y0: P.y, x1: p.x, y1: p.y, t: 0, dur: 0.35 + 0.035 * d };
  P.cast = P.leap.dur + 0.1; P.iframe = Math.max(P.iframe, P.leap.dur); P.path = null; faceTo(p.x, p.y);
  sfx(120, 0.3, 'square', 0.04, 150);
}
function updateLeap(dt) {
  const L = P.leap; if (!L) return;
  L.t += dt; const k = Math.min(1, L.t / L.dur);
  P.x = L.x0 + (L.x1 - L.x0) * k; P.y = L.y0 + (L.y1 - L.y0) * k; P.leapZ = Math.sin(k * Math.PI) * 26;
  if (k >= 1) {
    P.leap = null; P.leapZ = 0; pushOut(P);
    const R = 1.6, dmg = BS.leapDmg();
    for (const m of G.zone.monsters) { if (m.dead) continue; const d = dist(m, P); if (d > R + m.r) continue; hurtMon(m, dmg, '#e8e2d0'); P.lastHit = m; if (m.rank !== 'boss') { moveCircle(m, (m.x - P.x) / (d || 1) * 0.8, (m.y - P.y) / (d || 1) * 0.8); if (P.skills.leapstun > 0) m.stun = Math.max(m.stun || 0, 1); } }
    for (let i = 0; i < 10; i++) { const a = i / 10 * 6.28 + Math.random() * 0.3; G.bspikes.push({ x: P.x, y: P.y, a, len: R * (0.6 + Math.random() * 0.4), t: 0.5 }); }
    if (P.skills.leapspikes > 0) for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; const x = P.x + Math.cos(a) * 1.2, y = P.y + Math.sin(a) * 1.2; if (!G.zone.solidAt(x, y)) G.barms.push({ x, y, delay: i * 0.04, rise: 0.2, life: 3, max: 3, dps: BS.armDps(), tick: 0, seed: Math.random() * 6.28, lean: rand(-0.4, 0.4) }); }
    parts.push({ ring: true, x: P.x, y: P.y, r: 0.3, max: R, t: 0.35, col: '#e8e2d0' }); G.shake = Math.max(G.shake, 5); sfx(55, 0.5, 'square', 0.07, -20);
  }
}
function castLash(a) {
  const d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d, arc = P.skills.lashwide > 0, dmg = BS.lashDmg();
  const one = (k) => {
    let far = null, fd = 0;
    for (const m of G.zone.monsters) {
      if (m.dead) continue; const ox = m.x - P.x, oy = m.y - P.y, along = ox * dx + oy * dy, side = Math.abs(ox * dy - oy * dx), od = Math.hypot(ox, oy);
      const inside = arc ? od < 3.2 + m.r && (ox * dx + oy * dy) / (od || 1) > Math.cos(0.9) : along > -0.2 && along < 3.5 + m.r && side < 0.45 + m.r;
      if (!inside || !lineClear(G.zone, P, m)) continue;
      hurtMon(m, dmg * k, '#e8e2d0'); P.lastHit = m; burst(m.x, m.y, '#e8e2d0', 4, 1.4);
      if (od > fd && m.rank !== 'boss') { fd = od; far = m; }
    }
    if (far && fd > 1.2) moveCircle(far, -(far.x - P.x) / fd * (fd - 0.9), -(far.y - P.y) / fd * (fd - 0.9));
    G.lashFx.push({ dx, dy, t: 0, dur: 0.25, L: 3.5, arc });
    sfx(1000, 0.1, 'sawtooth', 0.035, -800); G.shake = Math.max(G.shake, 1.5);
  };
  one(1); if (P.skills.lashtwo > 0) setTimeout(() => { if (G.running && !P.dead) one(0.7); }, 260);
  faceTo(a.x, a.y);
}
function boneZone14() { G.banners = []; G.brains = []; G.gspirits = []; G.lashFx = []; G.siphFx = []; G.reasmQ = []; G.colRebuild = null; P.leap = null; P.leapZ = 0; for (let i = G.skels.length - 1; i >= 0; i--) if (G.skels[i].temp) G.skels.splice(i, 1); }
function updateBones14(dt) {
  if (G.hornT > 0) G.hornT -= dt;
  updateLeap(dt);
  // Grave Banner
  for (const b of G.banners) {
    b.t -= dt;
    for (const e of G.skels) if (Math.hypot(e.x - b.x, e.y - b.y) < b.R) e.hp = Math.min(e.max, e.hp + e.max * 0.03 * dt);
    if (G.colossus && Math.hypot(G.colossus.x - b.x, G.colossus.y - b.y) < b.R) G.colossus.hp = Math.min(G.colossus.max, G.colossus.hp + G.colossus.max * 0.03 * dt);
    for (const m of G.zone.monsters) { if (m.dead || Math.hypot(m.x - b.x, m.y - b.y) > b.R + m.r) continue; m.slow = Math.max(m.slow || 0, 0.35); if (P.skills.bannerfear > 0 && !b.feared.has(m)) { b.feared.add(m); fear(m, 1); } }
  }
  G.banners = G.banners.filter(b => b.t > 0);
  // Shield of Bones: guards mend
  if (P.skills.bwardheal > 0) for (const e of G.skels) if (dist(e, P) < 3) e.hp = Math.min(e.max, e.hp + e.max * 0.02 * dt);
  for (const e of G.skels) if (e.guardT > 0) e.guardT -= dt;
  // Ossify
  for (const m of G.zone.monsters) { if (m.dead) continue; if (m.ossT > 0) { m.ossT -= dt; m.slow = Math.max(m.slow || 0, 0.3); } if (m.crushT > 0) m.crushT -= dt; }
  // Reassemble
  for (const q of G.reasmQ) { q.t -= dt; if (q.t <= 0) { q.done = true; if (liveSkels().length < wantTotal() && reservedShards() + BS.skelCost() <= D.shardCap) { const e = raiseSkel(q.x, q.y, false, q.sq); e.hp = e.max * 0.6; floatText(q.x, q.y, 'reassembles', '#cfc6ae'); } } }
  G.reasmQ = G.reasmQ.filter(q => !q.done);
  const R = G.colRebuild;
  if (R) { R.t -= dt; if (Math.random() < 0.4) burst(R.x, R.y, '#cfc6ae', 1, 0.8); if (R.t <= 0) { G.colRebuild = null; if (!G.colossus) { const hp = BS.colHp(R.n); G.colossus = { isColossus: true, x: R.x, y: R.y, n: R.n, r: 0.42 + 0.035 * R.n, hp: hp * 0.6, max: hp, face: 1, cd: 0.6, state: 'idle', t: 0, hurt: 0, path: null, repath: 0, atk: null, order: null, cc: 3, grow: 0.35 }; burst(R.x, R.y, '#e8e2d0', 30, 3); say('The Colossus drags itself back together', 1.4); sfx(80, 0.6, 'square', 0.05, 60); } } }
  // Bone Rain
  for (const b of G.brains) {
    b.t -= dt; b.spawnT -= dt;
    while (b.t > 0 && b.spawnT <= 0) { b.spawnT += 0.09; const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * b.R; b.drops.push({ x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r, z: 70 + Math.random() * 20 }); }
    for (const s of b.drops) {
      s.z -= 180 * dt;
      if (s.z <= 0 && !s.done) {
        s.done = true; burst(s.x, s.y, '#e8e2d0', 2, 1);
        for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - s.x, m.y - s.y) < 0.5 + m.r) { hurtMon(m, b.dmg, '#e8e2d0'); if (P.skills.rainpin > 0 && m.rank !== 'boss') m.root = Math.max(m.root || 0, 0.3); }
      }
    }
    b.drops = b.drops.filter(s => !s.done);
  }
  G.brains = G.brains.filter(b => b.t > 0 || b.drops.length);
  // Grave Spirit
  for (const s of G.gspirits) {
    s.t -= dt; s.ph += dt * 12;
    if (s.tgt && (s.tgt.dead || s.tgt.engulfed)) s.tgt = null;
    const tx = s.tgt ? s.tgt.x : s.tx, ty = s.tgt ? s.tgt.y : s.ty, dx = tx - s.x, dy = ty - s.y, d = Math.hypot(dx, dy) || 1;
    s.vx += (dx / d * 9 - s.vx) * Math.min(1, dt * 4); s.vy += (dy / d * 9 - s.vy) * Math.min(1, dt * 4);
    s.x += s.vx * dt; s.y += s.vy * dt;
    if (Math.random() < 0.6) parts.push({ x: s.x, y: s.y, z: 10, vx: -s.vx * 0.2, vy: -s.vy * 0.2, vz: 2, t: 0.35, col: Math.random() < 0.5 ? '#e8e2d0' : '#bfe8ff' });
    if (G.zone.solidAt(s.x, s.y) || d < (s.tgt ? s.tgt.r + 0.3 : 0.4) || s.t <= 0) spiritBurst(s);
  }
  G.gspirits = G.gspirits.filter(s => s.t > 0);
  for (const f of G.lashFx) f.t += dt; G.lashFx = G.lashFx.filter(f => f.t < f.dur + 0.1);
  for (const f of G.siphFx) f.t -= dt; G.siphFx = G.siphFx.filter(f => f.t > 0);
}

// ------------------------------------------------------------------- Hemomancer: the Blood Ooze, Brood Nest, Hivemind, Boiling Blood, Blood Wave, Blood Pact, Swallow Whole, Molt
Object.assign(HS, {
  oozeMax: () => 1 + Math.floor(L1('thrall') / 8) + (P.skills.oozetwo > 0 ? 1 : 0),
  oozeHp: () => (60 + 20 * (L1('thrall') - 1)) * (1 + 0.08 * P.skills.broodm),
  oozeDmg: () => (5 + 2.5 * (L1('thrall') - 1)) * HS.power() * (1 + 0.1 * P.skills.broodm),
  oozeHaste: () => 0.2 + 0.01 * L1('thrall'),
  nestLife: () => 15 * (P.skills.nestlong > 0 ? 2 : 1),
  nestRate: () => Math.max(1.2, 3 - 0.08 * L1('nest')),
  hiveK: () => 0.04 + 0.005 * L1('hive'),
  boilR: () => 2.4 * (P.skills.boilwide > 0 ? 1.5 : 1),
  boilK: () => 1.5 + 0.03 * L1('bboil'),
  waveDmg: () => (14 + 7 * (L1('bwave') - 1)) * HS.power(),
  moltHeal: () => Math.min(0.45, 0.2 + 0.01 * L1('molt'))
});
function bloodInfo14(id) {
  const r = Math.round, pc = v => Math.round(v * 100) + '%';
  switch (id) {
    case 'thrall': return `${HS.oozeMax()} ooze${HS.oozeMax() > 1 ? 's' : ''} · life ${r(HS.oozeHp())} · shards ${r(HS.oozeDmg())} · pulse +${pc(HS.oozeHaste())} attack speed for 6 s`;
    case 'nest': return `${HS.nestLife()} s · a spawnling every ${HS.nestRate().toFixed(1)} s · mends minions 3%/s`;
    case 'hive': return `+${(HS.hiveK() * 100).toFixed(1)}% damage and -1.5% damage taken per minion nearby (8 at most)`;
    case 'bboil': return `${HS.boilR().toFixed(1)} yd · 8 s · bleeding x${HS.boilK().toFixed(2)}`;
    case 'bwave': return `${r(HS.waveDmg())} damage · ${(2.6 * (P.skills.wavewide > 0 ? 1.5 : 1)).toFixed(1)} yd wide · sweeps enemies back`;
    case 'pact': return `Costs 12% of your life · minions mend 40%, +30% damage for ${8 + (P.skills.pactlong > 0 ? 4 : 0)} s`;
    case 'swallow': return `Swallows within ${(1.4 + miasReachSafe()).toFixed(1)} yd · digests ${r(HS.digestDps())}/s`;
    case 'molt': return `Mend ${pc(HS.moltHeal())} of your life · skin draws enemies for 3 s`;
  }
  return '';
}
function miasReachSafe() { return 0; }
// minions near each other
function minionsNear(e, R) {
  let n = 0;
  for (const o of G.brood) if (o !== e && !o.rider && o.hatch <= 0 && Math.abs(o.x - e.x) < R && Math.hypot(o.x - e.x, o.y - e.y) < R) n++;
  for (const o of G.thralls) if (o !== e && Math.hypot(o.x - e.x, o.y - e.y) < R) n++;
  if (G.fgolem && G.fgolem !== e && Math.hypot(G.fgolem.x - e.x, G.fgolem.y - e.y) < R) n++;
  return Math.min(8, n);
}
function hiveDmg(e) { return (P.skills.hive > 0 ? 1 + HS.hiveK() * minionsNear(e, 4) : 1) * (G.pactT > 0 ? 1.3 : 1); }
function hiveGuard(e) { return P.skills.hive > 0 ? 1 - Math.min(0.12, 0.015 * minionsNear(e, 4)) : 1; }
function hasteK(e) { return e && e.hasteT > 0 ? 1 + (e.hasteK || 0) : 1; }

// the Blood Ooze
function oozeCount() { return G.thralls.length; }
function oozeSource(a) {
  let best = null, bd = 3;
  for (const m of G.zone.monsters) { if (!m.dead || m.hatched || m.eaten || m.burst || m.erased || m.rank === 'boss' || G.time - (m.deadAt || 0) > CORPSE_LIFE) continue; const d = Math.hypot(m.x - a.x, m.y - a.y); if (d < bd) { bd = d; best = { kind: 'corpse', ref: m }; } }
  for (const p of G.pools) { const d = Math.hypot(p.x - a.x, p.y - a.y) - p.r; if (d < bd) { bd = d; best = { kind: 'pool', ref: p }; } }
  return best;
}
function castOoze(a) {
  const src = oozeSource(a);
  if (!src) { say('No corpse or blood pool near the cursor', 1.2); return false; }
  if (oozeCount() >= HS.oozeMax()) { say(`You can hold ${HS.oozeMax()} ooze${HS.oozeMax() > 1 ? 's' : ''}`, 1.2); return false; }
  if (!spendMana('thrall')) return false;
  const o = src.ref;
  if (src.kind === 'corpse') { o.eaten = true; o.hatched = true; } else G.pools = G.pools.filter(p => p !== o);
  const hp = HS.oozeHp();
  G.thralls.push({ isThrall: true, ooze: true, x: o.x, y: o.y, r: 0.3, hp, max: hp, spd: 2.2, face: 1, t: 0, rise: 0.6, cd: 0.8, size: 1, eat: null, eatT: 0, hurt: 0, frenzyT: 0, path: null, repath: 0, eyes: [0, 1, 2].map(() => ({ a: Math.random() * 6.28, r: Math.random(), s: 0.5 + Math.random() })), pulse: 0, wob: Math.random() * 6 });
  burst(o.x, o.y, '#8e2630', 16, 2); sfx(90, 0.4, 'sine', 0.05, 60);
  return true;
}
function oozeDies(th) {
  const i = G.thralls.indexOf(th); if (i < 0) return; G.thralls.splice(i, 1);
  burst(th.x, th.y, '#8e2630', 24, 2.4); splashDrops(th.x, th.y, 18, 2.2, 6); G.biles.push({ fx: true, splat: true, x: th.x, y: th.y, R: 0.9, t: 0.4 });
  sfx(80, 0.4, 'sine', 0.05, -40);
}
function oozePulse(th) {
  th.pulse = 0.6; const K = HS.oozeHaste(), R = 5;
  if (dist(th, P) < R) { P.oozeHasteT = 6; P.oozeHasteK = K; if (P.skills.oozemend > 0) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.05); }
  for (const e of G.brood) if (Math.hypot(e.x - th.x, e.y - th.y) < R) { e.hasteT = 6; e.hasteK = K; if (P.skills.oozemend > 0) e.hp = Math.min(e.max, e.hp + e.max * 0.05); }
  for (const e of G.thralls) if (Math.hypot(e.x - th.x, e.y - th.y) < R) { e.hasteT = 6; e.hasteK = K; }
  const g = G.fgolem; if (g && Math.hypot(g.x - th.x, g.y - th.y) < R) { g.hasteT = 6; g.hasteK = K; if (P.skills.oozemend > 0) g.hp = Math.min(g.max, g.hp + g.max * 0.05); }
  parts.push({ ring: true, x: th.x, y: th.y, r: 0.3, max: R, t: 0.6, col: '#ff6070' }); floatText(th.x, th.y, 'quickening', '#ff6070');
  sfx(260, 0.3, 'sine', 0.04, 200);
}
function hurtThrall(th, dmg) { th.hp -= dmg * hiveGuard(th) * (P.skills.broodtough > 0 ? 0.8 : 1); th.hurt = 0.1; crownSave(th); if (th.hp <= 0) oozeDies(th); }
function updateThralls(dt) {
  for (const th of G.thralls.slice()) {
    th.t += dt; th.hurt = Math.max(0, th.hurt - dt); th.pulse = Math.max(0, th.pulse - dt); th.wob += dt * 3;
    if (th.frenzyT > 0) th.frenzyT -= dt; if (th.hasteT > 0) th.hasteT -= dt;
    if (th.rise > 0) { th.rise -= dt; continue; }
    th.max = HS.oozeHp() * th.size; th.hp = Math.min(th.hp, th.max);
    if (dist(th, P) > 18) { th.x = P.x + 1; th.y = P.y; if (G.zone.solidAt(th.x, th.y)) { th.x = P.x; th.y = P.y; } th.path = null; th.eat = null; }
    const spd = th.spd * (th.frenzyT > 0 ? 1.4 : 1) * (aM('b_lurch') ? 1.4 : 1);
    th.cd -= dt * hasteK(th) * (th.frenzyT > 0 ? 1.5 : 1) * (aM('b_lurch') ? 2 : 1);
    // slurping a meal
    if (th.eat) {
      const f = th.eat, gone = f.kind === 'corpse' ? f.ref.eaten || f.ref.hatched : !G.pools.includes(f.ref);
      if (gone || Math.hypot(f.ref.x - th.x, f.ref.y - th.y) > 1) th.eat = null;
      else { th.eatT += dt; if (Math.random() < 0.4) parts.push({ x: f.ref.x, y: f.ref.y, z: 2, vx: (th.x - f.ref.x) * 2, vy: (th.y - f.ref.y) * 2, vz: 8, t: 0.3, col: '#b8404a' });
        if (th.eatT > (f.kind === 'corpse' ? 1 : 0.7)) { if (f.kind === 'corpse') { f.ref.eaten = true; f.ref.hatched = true; } else G.pools = G.pools.filter(p => p !== f.ref); th.eat = null; th.size = Math.min(1.5, th.size + 0.08); th.hp = Math.min(th.max, th.hp + th.max * 0.25); oozePulse(th); }
        continue; }
    }
    const T = broodTarget(th);
    if (T) {
      const d = dist(th, T);
      if (Math.abs((T.x - T.y) - (th.x - th.y)) > 0.05) th.face = (T.x - T.y) > (th.x - th.y) ? 1 : -1;
      const see = lineClear(G.zone, th, T);
      if (d > 5 || !see) monMove(th, T.x, T.y, spd, dt);
      else if (d < 2.6) stepToward(th, th.x - (T.x - th.x), th.y - (T.y - th.y), spd * 0.8 * dt);
      if (see && d < 6.5 && th.cd <= 0) {
        th.cd = 1.1; const a = Math.atan2(T.y - th.y, T.x - th.x);
        for (const o of [-0.12, 0.12]) G.arcShots.push({ x: th.x, y: th.y, vx: Math.cos(a + o) * 10, vy: Math.sin(a + o) * 10, t: 0.75, dmg: HS.oozeDmg() * th.size * hiveDmg(th), hit: new Set(), col: '#c24050', pierce: 1, ooze: true });
        th.spit = 0.2; sfx(420 + Math.random() * 80, 0.07, 'sine', 0.025, -200);
      }
    } else {
      // look for something to eat: corpses and blood near you
      let food = null, fd = 6;
      for (const m of G.zone.monsters) { if (!m.dead || m.eaten || m.hatched || m.burst || m.erased || m.rank === 'boss' || G.time - (m.deadAt || 0) > CORPSE_LIFE || dist(m, P) > 10) continue; const d = dist(m, th); if (d < fd) { fd = d; food = { kind: 'corpse', ref: m }; } }
      for (const p of G.pools) { if (dist(p, P) > 10) continue; const d = Math.hypot(p.x - th.x, p.y - th.y); if (d < fd) { fd = d; food = { kind: 'pool', ref: p }; } }
      if (food) { if (fd > 0.5) monMove(th, food.ref.x, food.ref.y, spd, dt); else { th.eat = food; th.eatT = 0; } }
      else if (dist(th, P) > 2.4) monMove(th, P.x, P.y, spd, dt);
    }
    if (th.spit > 0) th.spit -= dt;
    pushOut(th);
  }
}
// what an ooze shard does when it lands
function oozeShardHit(s, m) {
  if (P.skills.oozebleed > 0) addBleed(m, s.dmg * 0.3, 3);
  if (aR('h_pyre')) burnMon(m, s.dmg * 0.4, 3);
}
// Brood Nest
function castNest(a) {
  const p = clampCast(a, 7);
  G.nests.push({ x: p.x, y: p.y, t: HS.nestLife(), max: HS.nestLife(), hatchT: 1, pul: 0 }); while (G.nests.length > 2) G.nests.shift();
  burst(p.x, p.y, '#8e2630', 20, 2.2); sfx(80, 0.5, 'sawtooth', 0.05, 40);
}
function updateNests(dt) {
  for (const n of G.nests) {
    n.t -= dt; n.hatchT -= dt; n.pul += dt;
    if (n.hatchT <= 0) { n.hatchT = HS.nestRate(); const x = n.x + rand(-0.5, 0.5), y = n.y + rand(-0.5, 0.5); if (P.skills.nestbig > 0 && broodCount() < HS.broodMax()) hatchLing(x, y); else tumorLing(x, y); burst(n.x, n.y, '#b8404a', 8, 1.6); }
    for (const e of G.brood) if (Math.hypot(e.x - n.x, e.y - n.y) < 2.5) e.hp = Math.min(e.max, e.hp + e.max * 0.03 * dt);
    for (const e of G.thralls) if (Math.hypot(e.x - n.x, e.y - n.y) < 2.5) e.hp = Math.min(e.max, e.hp + e.max * 0.03 * dt);
    if (G.fgolem && Math.hypot(G.fgolem.x - n.x, G.fgolem.y - n.y) < 2.5) G.fgolem.hp = Math.min(G.fgolem.max, G.fgolem.hp + G.fgolem.max * 0.03 * dt);
  }
  G.nests = G.nests.filter(n => { if (n.t <= 0) { burst(n.x, n.y, '#5a1622', 16, 1.8); return false; } return true; });
}
// Boiling Blood
function castBoil(a) {
  const p = clampCast(a, 9), R = HS.boilR(); let n = 0;
  for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - p.x, m.y - p.y) < R + m.r) { m.boilT = 8; if (m.bleed) { m.bleed.dps *= HS.boilK(); m.bleed.t *= 1.5; } aggro(m); n++; }
  parts.push({ ring: true, x: p.x, y: p.y, r: 0.3, max: R, t: 0.5, col: '#ff6070' }); burst(p.x, p.y, '#ff6070', 18, 2);
  sfx(160, 0.6, 'sawtooth', 0.035, 120);
}
function boilOver(m) {
  const dmg = (6 + 3 * (L1('bboil') - 1)) * HS.power();
  for (const o of G.zone.monsters) if (!o.dead && o !== m && Math.hypot(o.x - m.x, o.y - m.y) < 1.8 + o.r) { hurtMon(o, dmg, '#ff6070'); addBleed(o, dmg * 0.3, 4); }
  splashDrops(m.x, m.y, 20, 2.6, 8); burst(m.x, m.y, '#ff6070', 16, 2.4); sfx(200, 0.2, 'sawtooth', 0.04, -120);
}
// Blood Wave
function castWave(a) {
  const d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d;
  G.bwaves.push({ x: P.x + dx * 0.5, y: P.y + dy * 0.5, dx, dy, w: 2.6 * (P.skills.wavewide > 0 ? 1.5 : 1), t: 0.95, max: 0.95, dmg: HS.waveDmg(), grow: 1, hit: new Set(), carried: new Set() });
  sfx(120, 0.7, 'sawtooth', 0.045, -40); G.shake = Math.max(G.shake, 1.5);
}
function updateWaves(dt) {
  for (const w of G.bwaves) {
    w.t -= dt; const st = 7 * dt; w.x += w.dx * st; w.y += w.dy * st;
    if (G.zone.solidAt(w.x, w.y)) w.t = 0;
    for (const m of G.zone.monsters) {
      if (m.dead) continue; const ox = m.x - w.x, oy = m.y - w.y, along = ox * w.dx + oy * w.dy, side = Math.abs(ox * w.dy - oy * w.dx);
      if (along < -0.6 - m.r || along > 0.5 + m.r || side > w.w / 2 + m.r) continue;
      if (!w.hit.has(m)) { w.hit.add(m); if (m.bleed) w.grow = Math.min(2, w.grow + 0.15); hurtMon(m, w.dmg * w.grow, '#e89aa0'); addBleed(m, HS.bleedOf(w.dmg * w.grow), 4); P.lastHit = m; splashDrops(m.x, m.y, 6, 2, 8); }
      if (m.rank !== 'boss' && w.t > 0) { moveCircle(m, w.dx * st * 0.95, w.dy * st * 0.95); w.carried.add(m); }
    }
    if (w.t <= 0 && !w.done) { w.done = true; if (P.skills.wavedrown > 0) for (const m of w.carried) if (!m.dead) m.stun = Math.max(m.stun || 0, 0.6); }
  }
  G.bwaves = G.bwaves.filter(w => !w.done);
}
// Blood Pact
function castPact() {
  const cost = P.hp * 0.12; if (P.hp <= 1.5) { say('Not enough life', 1); return; }
  P.hp = Math.max(1, P.hp - cost); P.hurt = 0.1; floatText(P.x, P.y, `-${Math.round(cost)} life`, '#c24050');
  G.pactT = 8 + (P.skills.pactlong > 0 ? 4 : 0);
  for (const e of G.brood) e.hp = Math.min(e.max, e.hp + e.max * 0.4);
  for (const e of G.thralls) e.hp = Math.min(e.max, e.hp + e.max * 0.4);
  if (G.fgolem) G.fgolem.hp = Math.min(G.fgolem.max, G.fgolem.hp + G.fgolem.max * 0.4);
  burst(P.x, P.y, '#c24050', 30, 2.6); banner('BLOOD PACT', '#c24050', 1.1); sfx(70, 0.8, 'sine', 0.06, 0);
}
function pactAbsorb(d) {
  if (!(G.pactT > 0) || P.skills.pactshare <= 0 || d <= 0) return d;
  const mins = G.brood.filter(e => !e.rider && e.hatch <= 0).concat(G.thralls, G.fgolem ? [G.fgolem] : []);
  if (!mins.length) return d;
  const share = d * 0.2, each = share / mins.length;
  for (const e of mins) { if (e.isBrood) hurtBrood(e, each, 'magic'); else if (e.isThrall) hurtThrall(e, each); else hurtFGolem(e, each, 'magic'); }
  return d - share;
}
// Swallow Whole
function castSwallow(a) {
  if (!mutOn('maw')) { say('Wear the Belly Maw first (Flesh panel, V)', 1.5); return false; }
  if (engulfing(P)) {
    if (P.skills.swallowspit <= 0) { say('Your belly is full', 1); return false; }
    const e = G.engulfs.find(q => q.h === P); if (!e) return false;
    if (!spendMana('swallow')) return false;
    const d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d, m = e.m;
    e.done = true; G.engulfs = G.engulfs.filter(q => q !== e); m.engulfed = false; m.x = P.x + dx * 0.6; m.y = P.y + dy * 0.6; G.zone.monsters.push(m);
    G.spits.push({ m, dx, dy, t: 0.5, hit: new Set([m]), dmg: HS.digestDps() * 3 }); m.stun = Math.max(m.stun || 0, 1.2);
    P.mawOpen = 1; sfx(90, 0.3, 'sawtooth', 0.06, 100); return true;
  }
  let m = null, bd = 1e9;
  for (const o of G.zone.monsters) { if (o.dead || o.rank === 'boss' || dist(o, P) > 1.5 + o.r) continue; const d = Math.hypot(o.x - a.x, o.y - a.y); if (d < bd) { bd = d; m = o; } }
  if (!m) { say('Nothing close enough to swallow', 1); return false; }
  if (!spendMana('swallow')) return false;
  engulfMon(m, P); P.mawOpen = 1; faceTo(m.x, m.y);
  return true;
}
function updateSpits(dt) {
  for (const s of G.spits) {
    s.t -= dt; const m = s.m;
    if (m.dead) { s.t = 0; continue; }
    const st = 11 * dt; moveCircle(m, s.dx * st, s.dy * st);
    for (const o of G.zone.monsters) if (!o.dead && !s.hit.has(o) && dist(o, m) < o.r + m.r + 0.1) { s.hit.add(o); hurtMon(o, s.dmg, '#ff6070'); hurtMon(m, s.dmg * 0.5, '#ff6070'); if (o.rank !== 'boss') o.stun = Math.max(o.stun || 0, 0.8); burst(o.x, o.y, '#b8404a', 10, 2); }
    if (Math.random() < 0.5) parts.push({ x: m.x, y: m.y, z: 6, vx: 0, vy: 0, vz: 4, t: 0.3, col: '#8e2630' });
  }
  G.spits = G.spits.filter(s => s.t > 0);
}
// Molt
function castMolt() {
  const heal = D.maxHp * HS.moltHeal(); P.hp = Math.min(D.maxHp, P.hp + heal); floatText(P.x, P.y, `+${Math.round(heal)}`, '#9fe0a0');
  const hp = D.maxHp * 0.3;
  G.skins.push({ isSkin: true, x: P.x, y: P.y, r: 0.28, t: 3, hp, max: hp, face: P.face }); while (G.skins.length > 2) G.skins.shift();
  for (const m of G.zone.monsters) if (!m.dead && m.tgt === P && dist(m, P) < 10) m.tgt = null;
  if (P.skills.moltbleed > 0) P.moltT = 4;
  const d = Math.hypot(aimPoint().x - P.x, aimPoint().y - P.y) || 1, ax = (aimPoint().x - P.x) / d, ay = (aimPoint().y - P.y) / d;
  moveCircle(P, ax * 0.9, ay * 0.9);
  burst(P.x, P.y, '#e89aa0', 16, 2); splashDrops(P.x, P.y, 12, 1.8, 6); sfx(140, 0.4, 'sawtooth', 0.04, -80);
}
function skinDies(s) {
  const i = G.skins.indexOf(s); if (i < 0) return; G.skins.splice(i, 1);
  burst(s.x, s.y, '#e89aa0', 14, 2); splashDrops(s.x, s.y, 10, 1.8, 4);
  if (P.skills.moltleech > 0) for (let k = 0; k < 2; k++) { const hp = HS.leechHp(); G.leeches.push({ isLeech: true, x: s.x + rand(-0.3, 0.3), y: s.y + rand(-0.3, 0.3), r: 0.14, hp, max: hp, state: 'wait', ref: null, px: s.x, py: s.y, store: 0, t: 0, latchT: 0, waitT: 4, ph: Math.random() * 6, face: 1, off: Math.random() * 6.28, hurt: 0 }); }
}
function hurtSkin(s, dmg) { s.hp -= dmg; if (s.hp <= 0) skinDies(s); }
function bloodCast14(id, a) {
  switch (id) {
    case 'nest': if (!spendMana('nest')) return; castNest(a); P.cast = 0.45 / D.castSpd; break;
    case 'bboil': if (!spendMana('bboil')) return; castBoil(a); P.cast = 0.4 / D.castSpd; break;
    case 'bwave': if (!spendMana('bwave')) return; castWave(a); P.cast = 0.45 / D.castSpd; break;
    case 'pact': castPact(); P.cast = 0.35 / D.castSpd; break;
    case 'swallow': if (castSwallow(a)) P.cast = 0.4 / D.castSpd; break;
    case 'molt': if (!spendMana('molt')) return; castMolt(); P.cast = 0.35 / D.castSpd; break;
  }
  faceTo(a.x, a.y);
}
function updateBlood14(dt) {
  if (G.pactT > 0) G.pactT -= dt;
  if (P.oozeHasteT > 0) { P.oozeHasteT -= dt; if (P.oozeHasteT <= 0) D = derive(); }
  if (P.moltT > 0) P.moltT -= dt;
  for (const e of G.brood) if (e.hasteT > 0) e.hasteT -= dt;
  if (G.fgolem && G.fgolem.hasteT > 0) G.fgolem.hasteT -= dt;
  for (const m of G.zone.monsters) if (!m.dead && m.boilT > 0) { m.boilT -= dt; if (P.skills.boilslow > 0) m.slow = Math.max(m.slow || 0, 0.25); if (Math.random() < 0.25) parts.push({ x: m.x + rand(-0.2, 0.2), y: m.y + rand(-0.2, 0.2), z: 10 + Math.random() * 6, vx: 0, vy: 0, vz: 10, t: 0.3, col: '#ff6070' }); }
  if (P.skills.hiveheal > 0) { const mins = G.brood.concat(G.thralls, G.fgolem ? [G.fgolem] : []); for (const e of mins) if (minionsNear(e, 4) > 0) e.hp = Math.min(e.max, e.hp + e.max * 0.01 * dt); }
  for (const s of G.skins.slice()) { s.t -= dt; if (s.t <= 0) skinDies(s); }
  updateNests(dt); updateWaves(dt); updateSpits(dt);
}

// ------------------------------------------------------------------- Assassin: martial strikes of many shapes (arc, line, chain) that never teleport
const MIAS_MELEE = { gstrike: [1.1, false], talon: [1.2, false], execute: [1.2, false], rarc: [1.5, true], thrust: [1.9, false], flurry: [1.25, true], reap: [1.5, true] };
function miasApproach(id, a) { const M = MIAS_MELEE[id]; if (!M) return true; return meleeApproach(id, a, M[0] + miasReach(), M[1]); }
function castRarc(a) {
  const d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d, R = 1.8 + miasReach() + (P.skills.arcwide > 0 ? 0.6 : 0), sis = G.sisterCast;
  const sweep = (k, dir) => {
    const hits = [];
    for (const m of G.zone.monsters) { if (m.dead) continue; const ox = m.x - P.x, oy = m.y - P.y, od = Math.hypot(ox, oy); if (od > R + m.r || (ox * dx + oy * dy) / (od || 1) < Math.cos(1.45)) continue; hits.push(m); }
    const dmg = MS.weapon() * (0.95 + 0.09 * L1('rarc')) * syn('rarc') * (1 + 0.1 * Math.max(0, hits.length - 1)) * k;
    for (const m of hits) { hurtMon(m, sis ? dmg : critRoll(dmg), '#e8e2d0'); clawFx(m); miasSwing14(m); P.lastHit = m; if (m.rank !== 'boss') { const od = dist(m, P) || 1; moveCircle(m, (m.x - P.x) / od * 0.25, (m.y - P.y) / od * 0.25); } }
    if (hits.length >= 3) addOmen();
    G.arcFx14.push({ x: P.x, y: P.y, dx, dy, R, t: 0, dur: 0.18, dir, col: '#e8e2d0' });
    sfx(500 + (dir > 0 ? 0 : 150), 0.1, 'sawtooth', 0.035, -400);
  };
  sweep(1, 1); if (P.skills.arcdouble > 0) setTimeout(() => { if (G.running && !P.dead) sweep(0.6, -1); }, 150);
  P.swing = 0.25; G.shake = Math.max(G.shake, 1);
}
function castThrust(a) {
  const d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d, L = 3 + (P.skills.thrustlong > 0 ? 1 : 0) + miasReach(), sis = G.sisterCast;
  const dmg = MS.weapon() * (1.25 + 0.11 * L1('thrust')) * syn('thrust'), hits = [];
  for (const m of G.zone.monsters) { if (m.dead) continue; const ox = m.x - P.x, oy = m.y - P.y, along = ox * dx + oy * dy, side = Math.abs(ox * dy - oy * dx); if (along < -0.1 || along > L + m.r || side > 0.4 + m.r || !lineClear(G.zone, P, m)) continue; hits.push({ m, along }); }
  hits.sort((p, q) => p.along - q.along);
  hits.forEach(({ m }, i) => { hurtMon(m, sis ? dmg : critRoll(dmg), '#ffffff'); clawFx(m); miasSwing14(m); P.lastHit = m; if (i === 0 && P.skills.thrustpin > 0) m.root = Math.max(m.root || 0, m.rank === 'boss' ? 0.3 : 1); burst(m.x, m.y, '#e8e2d0', 5, 1.6); });
  if (hits.length) addOmen();
  G.thrustFx.push({ x: P.x, y: P.y, dx, dy, L, t: 0.22 });
  P.swing = 0.22; sfx(700, 0.1, 'square', 0.035, -500); G.shake = Math.max(G.shake, hits.length ? 1.5 : 0);
}
// Black-Rag Flurry: a chain of quick strikes that hops between enemies within reach; you do not move
function castFlurry14(a) {
  const n = 4 + (P.skills.flurrymore > 0 ? 2 : 0), R = 1.3 + miasReach(), sis = G.sisterCast, every = P.skills.flurryomen > 0 ? 3 : 4;
  const dmg = MS.weapon() * (0.5 + 0.05 * L1('flurry')) * syn('flurry');
  let cur = null, bd = 1e9;
  for (const m of G.zone.monsters) { if (m.dead || dist(m, P) > R + m.r) continue; const d = Math.hypot(m.x - a.x, m.y - a.y); if (d < bd) { bd = d; cur = m; } }
  if (!cur) { P.swing = 0.2; return; }
  const used = [];
  for (let i = 0; i < n; i++) setTimeout(() => {
    if (!G.running || P.dead) return;
    const near = G.zone.monsters.filter(m => !m.dead && dist(m, P) <= R + m.r);
    if (!near.length) return;
    let m = near.find(q => !used.includes(q)) || (cur && !cur.dead && near.includes(cur) ? cur : near[0]);
    used.push(m); if (used.length > near.length) used.length = 0;
    cur = m; faceTo(m.x, m.y);
    hurtMon(m, sis ? dmg : critRoll(dmg), '#e8e2d0'); clawFx(m); miasSwing14(m); P.lastHit = m;
    G.arcFx14.push({ x: P.x, y: P.y, dx: (m.x - P.x) / (dist(m, P) || 1), dy: (m.y - P.y) / (dist(m, P) || 1), R: dist(m, P) + 0.3, t: 0, dur: 0.08, dir: i % 2 ? 1 : -1, col: '#cfc6ae', narrow: true });
    if (!sis && (P.flurryN = (P.flurryN || 0) + 1) % every === 0) addOmen();
    sfx(650 + Math.random() * 300, 0.05, 'sawtooth', 0.022, -500);
  }, i * 75);
  P.swing = 0.4;
}
// the per-hit extras of a claw blow (venom, raking), without the auto-attack's own crit
function miasSwing14(m) {
  if (G.sisterCast || m.dead) return;
  if (P.venomT > 0) { const stk = aU('z_venom') ? 5 : P.skills.vdeep > 0 ? 3 : 1; poisonMon(m, MS.bladePsn() * 0.6, 4, stk); m.slow = Math.max(m.slow || 0, 0.3); }
}

// ------------------------------------------------------------------- wire synergies into every damage number
[[WS, 'pillarDmg', 'pillars'], [WS, 'fissureDmg', 'fissure'], [WS, 'cageDmg', 'cage'], [WS, 'anvilDmg', 'anvil'], [WS, 'tossDmg', 'toss'], [WS, 'revDmg', 'wisps'], [WS, 'beamDps', 'beam'], [WS, 'prismDps', 'prism'], [WS, 'condDmg', 'condense'], [WS, 'leashDps', 'leash'], [WS, 'totemDps', 'totem'], [WS, 'soulDmg', 'swarm'], [WS, 'lanceDps', 'lance'], [WS, 'orbDmg', 'orb'], [WS, 'wordDmg', 'word'], [WS, 'chainDmg', 'chain'],
 [BS, 'skelDmg', 'raise'], [BS, 'colDmg', 'colossus'], [BS, 'offerDmg', 'offering'], [BS, 'spearDmg', 'spear'], [BS, 'ribDps', 'ribcage'], [BS, 'armDps', 'wall'], [BS, 'spikeDmg', 'spikes'], [BS, 'stormDmg', 'sstorm'], [BS, 'siphonDmg', 'siphon'], [BS, 'rainDmg', 'bonerain'], [BS, 'spiritDmg', 'spirit'], [BS, 'sweepDmg', 'bscythe'], [BS, 'crushDmg', 'crush'], [BS, 'chargeDmg', 'gcharge'], [BS, 'leapDmg', 'leap'], [BS, 'lashDmg', 'lash'],
 [HS, 'tumorDmg', 'eggsac'], [HS, 'lingDmg', 'hatch'], [HS, 'oozeDmg', 'thrall'], [HS, 'rushDmg', 'rush'], [HS, 'golemDmg', 'fgolem'], [HS, 'vomitDmg', 'blance'], [HS, 'lanceDmg', 'blance'], [HS, 'hemorMin', 'hemor'], [HS, 'whipDmg', 'vwhip'], [HS, 'burstDmg', 'cburst'], [HS, 'leechDps', 'spool'], [HS, 'waveDmg', 'bwave'], [HS, 'tentDmg', 'tentacles'], [HS, 'bileDmg', 'bilehump'], [HS, 'digestDps', 'maw'],
 [MS, 'shuriDmg', 'shuriken'], [MS, 'novaDmg', 'pnova'], [MS, 'novaPsn', 'pnova'], [MS, 'tideDmg', 'rotwall'], [MS, 'contPsn', 'contagion'], [MS, 'exhaleK', 'exhale'], [MS, 'stormDmg', 'mstorm'], [MS, 'bladePsn', 'vblade'], [MS, 'needleDmg', 'ntrap'], [MS, 'wakeDmg', 'mwake'], [MS, 'mineDmg', 'bmine']
].forEach(([o, fn, id]) => wrapSyn(o, fn, id));
{ const g0 = WS.golem; WS.golem = () => { const g = g0(), b = synBonus('golem'); g.max = Math.round(g.max * (1 + b * 0.6)); g.dmg = g.dmg.map(v => v * (1 + b)); return g; }; }
