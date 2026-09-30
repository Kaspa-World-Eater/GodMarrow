// =================================================================== wisp costs & mana
// wisps spent on the great wisp, the golem's charge and echoes stay spent: they hold slots out of your choir
function reservedWisps() {
  let n = 0;
  if (G.great) n += G.great.size;
  const g = G.golem; if (g && g.infused > 0) n += Math.min(g.infused, Math.ceil(g.charge / WS.perWisp() - 1e-6));
  n += G.echoes.length * WS.echoCost();
  return n;
}
function effCap() { return Math.max(0, D.wispCap - reservedWisps()); }
function spendMana(id, amt) {
  const need = amt != null ? amt : (SK[id] && SK[id].mana) || 0;
  if (P.mana < need) { say('Not enough mana', 1.1); sfx(90, 0.12, 'sawtooth', 0.03); return false; }
  P.mana -= need; return true;
}

// =================================================================== golem knight
function newGolem(x, y) {
  const st = WS.golem();
  return { x, y, r: 0.55, hp: st.max, max: st.max, state: 'active', rt: 0, rtMax: 1, cd: 0, cc: 2, face: 1, hurt: 0, t: 0, hitSet: null, aim: { x: 1, y: 0 }, shield: true, tossCd: 1, atk: null, charge: 0, infused: 0, idleT: 0, ramp: 0, auraT: 0, hold: null };
}
function castGolem(pt) {
  if (!P.skills.golem || P.cast > 0 || P.roll > 0) return;
  if (!spendMana('golem')) return;
  endWraith();
  const a = pt || aimPoint(); let tx = a.x, ty = a.y;
  const d = Math.hypot(tx - P.x, ty - P.y); if (d > 6) { tx = P.x + (tx - P.x) / d * 6; ty = P.y + (ty - P.y) / d * 6; }
  const nw = nearestWalk(G.zone, Math.floor(tx), Math.floor(ty)) || [Math.floor(P.x), Math.floor(P.y)];
  if (!G.golem) G.golem = newGolem(nw[0] + .5, nw[1] + .5);
  else { const g = G.golem; g.x = nw[0] + .5; g.y = nw[1] + .5; g.path = null; if (g.state === 'charge' || g.state === 'chargeWind') g.state = 'active'; }
  if (P.gbeh.hold) G.golem.hold = { x: G.golem.x, y: G.golem.y };
  P.cast = 0.5 / D.castSpd; faceTo(tx, ty);
  burst(G.golem.x, G.golem.y, '#aab4c2', 18, 2.5); sfx(120, 0.4, 'square', 0.05, -40);
}
function metals() {
  const out = [];
  if (G.golem) out.push(G.golem);
  if (G.flyShield) out.push(G.flyShield);
  for (const p of G.pillars) if (p.rise <= 0) out.push(p);
  return out;
}
function golemDown(g, rt, msg) {
  g.state = 'dormant'; g.rt = g.rtMax = rt; g.atk = null; g.path = null; g.charge = 0; g.infused = 0; g.ramp = 0;
  burst(g.x, g.y, '#6f6a79', 20, 2); if (msg) say(msg, 1.6); sfx(80, 0.6, 'square', 0.05, -30);
}
function golemRise(g) {
  g.state = 'active'; g.hp = g.max;
  burst(g.x, g.y, '#aab4c2', 24, 3); sfx(160, 0.5, 'square', 0.05, 200); say('Your golem rises', 1.2);
}
function addCharge(g, n) {
  if (!g || g.state === 'dormant' || g.ramp > 0) return;
  g.charge = Math.min(WS.chargeMax(), g.charge + n); g.idleT = 0;
  if (g.charge >= WS.chargeMax()) startRampage(g);
}
function startRampage(g) {
  g.ramp = WS.rampLife(); g.charge = WS.chargeMax(); g.cc = 0;
  banner('RAMPAGE', '#ffffff', 1.4); G.shake = Math.max(G.shake, 4);
  parts.push({ ring: true, x: g.x, y: g.y, r: 0.3, max: WS.auraR(), t: 0.5, col: '#ffffff' });
  sfx(140, 0.6, 'sawtooth', 0.06, 300);
}
function golemBurst(g) {
  const R = WS.detR(), dmg = WS.detDmg();
  for (const m of G.zone.monsters) {
    if (m.dead) continue; const d = Math.hypot(m.x - g.x, m.y - g.y); if (d > R) continue;
    hurtMon(m, dmg, '#ffffff'); m.stun = Math.max(m.stun || 0, 1);
    for (let i = 0; i < 5; i++) moveCircle(m, (m.x - g.x) / (d || 1) * 0.2, (m.y - g.y) / (d || 1) * 0.2);
  }
  if (P.skills.overflow > 0) {
    const n = WS.flowN(), sd = WS.flowDmg();
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; souls.push({ x: g.x, y: g.y, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, t: 2.2, target: null, retarget: 0.25, wob: Math.random() * 6, dmg: sd, hits: 1, hit: new Set() }); }
  }
  parts.push({ ring: true, x: g.x, y: g.y, r: 0.3, max: R, t: 0.5, col: '#ffffff' }); burst(g.x, g.y, '#ffffff', 44, 4);
  G.shake = Math.max(G.shake, 7); banner('ANIMA BURST', '#ffffff', 1.3); sfx(60, 0.8, 'sawtooth', 0.07, -20);
  P.infuse = false;
  golemDown(g, 3);
}
function hurtGolem(dmg, type, src) {
  const g = G.golem; if (!g || g.state === 'dormant') return;
  const st = WS.golem(), armor = st.armor * (g.shield ? 1 : 0.6);
  dmg *= type === 'phys' ? 100 / (100 + armor) : 0.8;
  if (g.ramp > 0) dmg *= 0.6;
  g.hp -= dmg; g.hurt = 0.1;
  if (P.skills.thorns > 0 && src && !src.dead && type === 'phys') { hurtMon(src, dmg * WS.thornsPct() / 100 + 2 * P.skills.thorns, '#cfd6e0'); burst(src.x, src.y, '#cfd6e0', 3, 1); }
  if (WS.flowRate() > 0 && g.hp > 0) addCharge(g, dmg / g.max * WS.flowRate());
  if (g.hp <= 0) { g.hp = 0; golemDown(g, WS.golem().recharge, 'Your golem falls dormant'); }
}
function golemStrike(g, tgt) {
  const st = WS.golem(), w = WS.weapon(), rm = g.ramp > 0 ? WS.rampMult() : 1;
  const base = () => rand(st.dmg[0], st.dmg[1]) * w.mult * rm;
  if (w.id === 'sword') {
    if (tgt.dead || dist(tgt, g) > w.reach + tgt.r + 0.3) return;
    hurtMon(tgt, base(), '#cfd6e0');
    if (Math.random() < w.twice && !tgt.dead) { hurtMon(tgt, base(), '#cfd6e0'); floatText(g.x, g.y, 'twice', '#aab4c2'); }
    burst(tgt.x, tgt.y, '#cfd6e0', 4, 1.2); sfx(240, 0.06, 'square', 0.035, -120);
  } else if (w.id === 'axe') {
    let n = 0;
    for (const m of G.zone.monsters) {
      if (m.dead) continue; const dx = m.x - g.x, dy = m.y - g.y, d = Math.hypot(dx, dy);
      if (d > w.reach + m.r + 0.3) continue;
      const da = Math.acos(clamp((dx * g.aim.x + dy * g.aim.y) / (d || 1), -1, 1));
      if (da > w.arc && d > 0.4) continue;
      hurtMon(m, base(), '#cfd6e0'); burst(m.x, m.y, '#cfd6e0', 3, 1); n++;
    }
    sfx(n ? 170 : 300, 0.09, 'square', 0.04, -80);
  } else {
    const reach = Math.min(dist(tgt, g), w.reach + 0.2), px = g.x + g.aim.x * reach, py = g.y + g.aim.y * reach;
    for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - px, m.y - py) < w.aoe + m.r) { hurtMon(m, base(), '#cfd6e0'); m.stun = Math.max(m.stun || 0, w.stun); }
    parts.push({ ring: true, x: px, y: py, r: 0.2, max: w.aoe, t: 0.3, col: '#cfd6e0' }); burst(px, py, '#cfc6ae', 10, 2);
    G.shake = Math.max(G.shake, 2.5); sfx(90, 0.2, 'square', 0.05, -40);
  }
}
// Secret-of-Mana-style orders: x = how far it ranges (0 close .. 4 roam), y = how it fights (0 guard .. 4 attack)
function golemOrders() {
  const B = P.gbeh;
  return { leash: 1.8 + B.x * 1.7, aggro: 2.5 + B.y * 1.5 + B.x * 0.6, guard: B.y <= 1 };
}
function golemPick(g) {
  const B = P.gbeh, O = golemOrders(), anchor = B.hold && g.hold ? g.hold : P;
  const aggro = g.ramp > 0 ? Math.max(O.aggro, 7) : O.aggro;
  if (B.focus && P.lastHit && !P.lastHit.dead && dist(P.lastHit, anchor) < aggro + 3) return P.lastHit;
  let best = null, bd = 1e9;
  for (const m of G.zone.monsters) {
    if (m.dead) continue;
    const dA = dist(m, anchor); if (dA > aggro) continue;
    if (m.state === 'idle' && dist(m, P) > 6) continue;
    if (O.guard && g.ramp <= 0 && dist(m, P) > 3.2 && m.tgt !== P) continue;
    const d = dist(m, g) + dA * 0.3; if (d < bd) { bd = d; best = m; }
  }
  return best;
}
function tossShield(g, tgt) {
  const d = dist(tgt, g) || 1;
  g.shield = false;
  G.flyShield = { x: g.x, y: g.y, r: 0.42, dir: { x: (tgt.x - g.x) / d, y: (tgt.y - g.y) / d }, dist: 0, R: Math.min(7, d + 1), state: 'out', t: 0, hit: new Set(), rico: WS.ricochet(), spin: 0 };
  sfx(260, 0.2, 'triangle', 0.04, 200);
}
function shieldHits(s) {
  const g = G.golem, st = WS.golem();
  for (const m of G.zone.monsters) {
    if (m.dead || s.hit.has(m) || Math.hypot(m.x - s.x, m.y - s.y) > s.r + m.r) continue;
    s.hit.add(m);
    hurtMon(m, rand(st.dmg[0], st.dmg[1]) * WS.tossDmg() * (g && g.ramp > 0 ? WS.rampMult() : 1), '#cfd6e0');
    m.stun = Math.max(m.stun || 0, 0.4); burst(m.x, m.y, '#cfd6e0', 4, 1.5); sfx(500, 0.05, 'square', 0.03, -200);
    if (s.state === 'out' && s.rico > 0) {
      let nt = null, bd = 4;
      for (const o of G.zone.monsters) { if (o.dead || s.hit.has(o)) continue; const dd = Math.hypot(o.x - s.x, o.y - s.y); if (dd < bd) { bd = dd; nt = o; } }
      if (nt) { s.rico--; s.dir = { x: (nt.x - s.x) / bd, y: (nt.y - s.y) / bd }; s.dist = 0; s.R = bd + 0.6; }
    }
  }
}
function updateShield(dt) {
  const s = G.flyShield; if (!s) return;
  const g = G.golem; if (!g) { G.flyShield = null; return; }
  s.spin += dt * 18; s.t += dt;
  if (s.state === 'out') {
    const step = 9 * dt, nx = s.x + s.dir.x * step, ny = s.y + s.dir.y * step, tt = G.zone.get(Math.floor(nx), Math.floor(ny));
    if (TALL[tt] && tt !== T.ROCK) { s.state = 'hover'; s.t = 0; }
    else { s.x = nx; s.y = ny; s.dist += step; if (s.dist >= s.R) { s.state = 'hover'; s.t = 0; } }
    shieldHits(s);
  } else if (s.state === 'hover') {
    s.tick = (s.tick || 0) - dt; if (s.tick <= 0) { s.tick = 0.5; s.hit.clear(); }
    shieldHits(s);
    if (s.t >= WS.tossHover()) { s.state = 'back'; s.hit.clear(); }
  } else {
    const d = dist(s, g);
    if (d < 0.6) { g.shield = true; g.tossCd = 2.5; G.flyShield = null; sfx(320, 0.1, 'square', 0.03, 100); return; }
    const sp = Math.min(d, 11 * dt); s.x += (g.x - s.x) / d * sp; s.y += (g.y - s.y) / d * sp;
    shieldHits(s);
  }
}
function updateGolem(dt) {
  const g = G.golem; if (!g) return;
  const st = WS.golem();
  g.max = st.max; g.hp = Math.min(g.hp, g.max); g.hurt = Math.max(0, g.hurt - dt); g.t += dt; g.tossCd -= dt;
  updateShield(dt);
  if (g.state === 'dormant') { g.rt -= dt; if (g.rt <= 0) golemRise(g); return; }
  // charge slowly bleeds away if you stop feeding it
  g.idleT += dt;
  if (g.ramp <= 0 && g.charge > 0 && g.idleT > 6 && !P.infuse) g.charge = Math.max(0, g.charge - 0.3 * dt);
  // rampage: white fire aura, faster and stronger, then the burst
  if (g.ramp > 0) {
    g.ramp -= dt; g.auraT -= dt;
    if (g.auraT <= 0) {
      g.auraT = 0.25; const R = WS.auraR(), dmg = WS.auraDps() * 0.25;
      for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - g.x, m.y - g.y) < R + m.r) hurtMon(m, dmg, '#ffffff');
    }
    if (g.ramp <= 0) { golemBurst(g); return; }
  }
  g.cd -= dt; g.cc -= dt;
  const spd = st.spd * (g.ramp > 0 ? 1.4 : 1);
  if (g.state === 'chargeWind') { if (g.t > 0.35) { g.state = 'charge'; g.t = 0; g.hitSet = new Set(); sfx(90, 0.3, 'sawtooth', 0.04, 60); } return; }
  if (g.state === 'charge') {
    const ox = g.x, oy = g.y, kb = 0.2 + 0.02 * P.skills.bulwark;
    moveCircle(g, g.aim.x * 11 * dt, g.aim.y * 11 * dt);
    for (const m of G.zone.monsters) {
      if (m.dead || g.hitSet.has(m) || Math.hypot(m.x - g.x, m.y - g.y) > g.r + m.r + 0.15) continue;
      g.hitSet.add(m);
      hurtMon(m, rand(st.dmg[0], st.dmg[1]) * 1.5, '#aab4c2');
      m.stun = Math.max(m.stun || 0, 1.2);
      for (let i = 0; i < 6; i++) moveCircle(m, g.aim.x * kb, g.aim.y * kb);
      G.shake = Math.max(G.shake, 2);
    }
    const stuck = Math.abs(g.x - ox) < 1e-4 && Math.abs(g.y - oy) < 1e-4;
    if (g.t > 0.5 || stuck) { g.state = 'active'; g.cd = 0.3; g.cc = rand(5, 8); }
    return;
  }
  if (g.atk) {
    const a = g.atk; a.t += dt;
    if (!a.done && a.t >= a.dur * 0.55) { a.done = true; golemStrike(g, a.target); }
    if (a.t >= a.dur) g.atk = null;
    return;
  }
  const B = P.gbeh, O = golemOrders(), anchor = B.hold && g.hold ? g.hold : P;
  if (dist(g, P) > 16) { g.x = P.x + 1; g.y = P.y; if (G.zone.solidAt(g.x, g.y)) { g.x = P.x; g.y = P.y; } g.path = null; }
  const tgt = golemPick(g);
  if (tgt) {
    const d = dist(tgt, g), w = WS.weapon();
    g.aim = { x: (tgt.x - g.x) / (d || 1), y: (tgt.y - g.y) / (d || 1) };
    if (Math.abs((tgt.x - tgt.y) - (g.x - g.y)) > 0.05) g.face = (tgt.x - tgt.y) > (g.x - g.y) ? 1 : -1;
    if (B.toss && P.skills.toss > 0 && g.shield && d > 2.4 && d < 7 && g.tossCd <= 0 && lineClear(G.zone, g, tgt)) { tossShield(g, tgt); g.cd = 0.5; return; }
    if (B.charge && g.shield && d > 2.5 && d < 5.5 && g.cc <= 0 && lineClear(G.zone, g, tgt)) { g.state = 'chargeWind'; g.t = 0; sfx(100, 0.3, 'sawtooth', 0.04, 80); return; }
    if (d > w.reach + tgt.r - 0.05) monMove(g, tgt.x, tgt.y, spd, dt);
    else if (g.cd <= 0) { const dur = w.dur / (g.ramp > 0 ? 1.35 : 1); g.atk = { t: 0, dur, target: tgt, done: false }; g.cd = dur; }
  } else if (dist(g, anchor) > (anchor === P ? Math.min(1.8, O.leash) : 0.4)) {
    monMove(g, anchor.x, anchor.y, spd * 1.1, dt);
  }
}
// hold right-click on the golem: pour wisps into it (heals it, wakes it, charges it)
function startInfuse() { P.infuse = true; P.infT = 0; P.path = null; P.target = null; endWraith(); }
function infuseOne() {
  const g = G.golem; if (!g) { P.infuse = false; return; }
  if (dist(P, g) > 8) { say('Too far from your golem', 1); return; }
  if (g.ramp > 0) { say('Your golem is already burning', 0.8); return; }
  if (!P.wisps.length) { say('No wisps to give', 0.8); return; }
  const w = takeWisp();
  flyMote(w.x, w.y, w.z, g, '#d8f3ff');
  g.infused++;
  if (g.state === 'dormant') { g.rt -= 1.2 + 0.08 * P.skills.wisps; floatText(g.x, g.y, 'waking', '#d8f3ff'); }
  else {
    if (g.hp < g.max - 0.5) { const h = g.max * 0.07 + 4 * P.skills.wisps; g.hp = Math.min(g.max, g.hp + h); floatText(g.x, g.y, `+${Math.round(h)}`, '#9fe0a0'); }
    addCharge(g, WS.perWisp());
    if (g.ramp <= 0) floatText(g.x, g.y - 0.3, `charge ${Math.floor(g.charge)}/${WS.chargeMax()}`, '#ffffff');
  }
  sfx(900 + Math.random() * 200, 0.05, 'sine', 0.03);
}

// =================================================================== iron pillars
function raisePillar(x, y, life, dmg) {
  if (G.zone.solidAt(x, y)) return false;
  if (Math.hypot(x - P.x, y - P.y) < P.r + 0.3) return false;
  G.pillars.push({ x, y, r: 0.3, rise: 0.22, life, max: life, dmg, fresh: true });
  while (G.pillars.length > 18) G.pillars.shift();
  return true;
}
function castPillars(pt) {
  if (!P.skills.pillars || P.cast > 0 || P.roll > 0) return;
  if (!spendMana('pillars')) return;
  endWraith();
  const a = pt || aimPoint(); let tx = a.x, ty = a.y;
  const d = Math.hypot(tx - P.x, ty - P.y) || 1; if (d > 8) { tx = P.x + (tx - P.x) / d * 8; ty = P.y + (ty - P.y) / d * 8; }
  const px = -(ty - P.y) / d, py = (tx - P.x) / d, n = WS.pillarN();
  for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 0.8; raisePillar(tx + px * o, ty + py * o, WS.pillarLife(), WS.pillarDmg()); }
  P.cast = 0.45 / D.castSpd; faceTo(tx, ty); sfx(70, 0.3, 'square', 0.05, 60);
}
function castCage(pt) {
  if (!P.skills.cage || P.cast > 0 || P.roll > 0) return;
  if (!spendMana('cage')) return;
  endWraith();
  const a = pt || aimPoint(), n = WS.cageN();
  for (let i = 0; i < n; i++) { const ang = i / n * Math.PI * 2; raisePillar(a.x + Math.cos(ang) * 1.8, a.y + Math.sin(ang) * 1.8, WS.cageLife(), WS.cageDmg()); }
  P.cast = 0.5 / D.castSpd; faceTo(a.x, a.y); sfx(60, 0.4, 'square', 0.05, 40);
}
function castFissure(pt) {
  if (!P.skills.fissure || P.cast > 0 || P.roll > 0) return;
  if (!spendMana('fissure')) return;
  endWraith();
  const a = pt || aimPoint(), d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d;
  const L = WS.fissureLen(), n = Math.round(L / 0.6), keep = WS.fissureKeep();
  G.fissures = G.fissures || [];
  G.fissures.push({ x: P.x, y: P.y, dx, dy, i: 0, n, t: 0, keep, hit: new Set() });
  P.cast = 0.4 / D.castSpd; faceTo(a.x, a.y);
}
function updatePillars(dt) {
  for (const p of G.pillars) {
    if (p.rise > 0) {
      p.rise -= dt;
      if (p.rise <= 0 && p.fresh) {
        p.fresh = false; burst(p.x, p.y, '#8b93a0', 8, 2); G.shake = Math.max(G.shake, 1.5);
        for (const m of G.zone.monsters) {
          if (m.dead) continue; const dd = Math.hypot(m.x - p.x, m.y - p.y); if (dd > 0.9 + m.r) continue;
          hurtMon(m, p.dmg, '#cfd6e0'); m.stun = Math.max(m.stun || 0, 0.5);
          if (dd < p.r + m.r) moveCircle(m, (m.x - p.x) / (dd || 1) * (p.r + m.r - dd + 0.05), (m.y - p.y) / (dd || 1) * (p.r + m.r - dd + 0.05));
        }
      }
    } else p.life -= dt;
  }
  G.pillars = G.pillars.filter(p => { if (p.life <= 0) { burst(p.x, p.y, '#6f6a79', 8, 1.5); return false; } return true; });
  // Lodestone: pillars drag enemies in
  if (P.skills.magnet > 0 && G.pillars.length) {
    const R = WS.magnetR(), pull = WS.magnetPull() * dt;
    for (const m of G.zone.monsters) {
      if (m.dead || m.rank === 'boss') continue;
      let best = null, bd = R;
      for (const p of G.pillars) { if (p.rise > 0) continue; const dd = Math.hypot(m.x - p.x, m.y - p.y); if (dd < bd) { bd = dd; best = p; } }
      if (best && bd > best.r + m.r + 0.08) moveCircle(m, (best.x - m.x) / bd * pull, (best.y - m.y) / bd * pull);
    }
  }
  // Iron Fissure: spikes erupt one after another
  if (G.fissures) {
    for (const f of G.fissures) {
      f.t -= dt;
      while (f.t <= 0 && f.i < f.n) {
        f.t += 0.045; f.i++;
        const x = f.x + f.dx * f.i * 0.6, y = f.y + f.dy * f.i * 0.6;
        if (G.zone.solidAt(x, y)) { f.i = f.n; break; }
        parts.push({ spike: true, x, y, t: 0.45 });
        for (const m of G.zone.monsters) if (!m.dead && !f.hit.has(m) && Math.hypot(m.x - x, m.y - y) < 0.7 + m.r) { f.hit.add(m); hurtMon(m, WS.fissureDmg(), '#cfd6e0'); m.stun = Math.max(m.stun || 0, 0.4); }
        if (f.i > f.n - f.keep) raisePillar(x + f.dy * 0.01, y, WS.pillarLife() * 0.7, 0);
        if (f.i % 2) sfx(90 + f.i * 6, 0.06, 'square', 0.03, -30);
      }
    }
    G.fissures = G.fissures.filter(f => f.i < f.n);
  }
}
function pushOut(o) {
  const obs = G.pillars.filter(p => p.rise <= 0);
  if (G.golem && G.golem.state === 'dormant' && o !== G.golem) obs.push(G.golem);
  for (const b of obs) {
    const d = Math.hypot(o.x - b.x, o.y - b.y), mm = o.r + b.r;
    if (d < mm) { const nx = d > 1e-3 ? (o.x - b.x) / d : 1, ny = d > 1e-3 ? (o.y - b.y) / d : 0; moveCircle(o, nx * (mm - d), ny * (mm - d)); }
  }
}

