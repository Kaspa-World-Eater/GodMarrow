// =================================================================== Spirit Lance (channeled, reflects off metal)
function lancePath(ox, oy, dx, dy) {
  const z = G.zone; let left = WS.lanceRange(), pierce = WS.lancePierce(), mult = 1;
  const segs = [], hits = [], bounces = [], used = new Set(), maxB = WS.maxBounce();
  for (let b = 0; b <= maxB && left > 0.2; b++) {
    let len = left;
    for (let s = 0.2; s < left; s += 0.2) { const t = z.get(Math.floor(ox + dx * s), Math.floor(oy + dy * s)); if (TALL[t] && t !== T.ROCK) { len = s; break; } }
    let mhit = null, mt = len;
    for (const me of metals()) {
      if (used.has(me)) continue;
      const rr = me.r + 0.12, px = me.x - ox, py = me.y - oy, tc = px * dx + py * dy; if (tc < 0.05) continue;
      const d2 = px * px + py * py - tc * tc; if (d2 > rr * rr) continue;
      const t0 = tc - Math.sqrt(rr * rr - d2); if (t0 > 0.05 && t0 < mt) { mt = t0; mhit = me; }
    }
    let end = mhit ? mt : len;
    const along = [];
    for (const m of z.monsters) {
      if (m.dead || hits.some(h => h.m === m)) continue;
      const px = m.x - ox, py = m.y - oy, t = px * dx + py * dy;
      if (t < 0 || t > end) continue;
      if (Math.abs(px * dy - py * dx) <= m.r + 0.15) along.push({ t, m });
    }
    along.sort((a, c) => a.t - c.t);
    let stopped = false;
    for (const a of along) { hits.push({ m: a.m, mult }); if (--pierce <= 0) { end = a.t; stopped = true; break; } }
    segs.push([ox, oy, ox + dx * end, oy + dy * end, mult]);
    if (stopped || !mhit) break;
    const hx = ox + dx * mt, hy = oy + dy * mt; let nx = hx - mhit.x, ny = hy - mhit.y; const nl = Math.hypot(nx, ny) || 1; nx /= nl; ny /= nl;
    const dot = dx * nx + dy * ny; dx -= 2 * dot * nx; dy -= 2 * dot * ny;
    used.add(mhit); mult *= WS.bounceMult(); left -= mt; ox = hx; oy = hy;
    bounces.push({ x: hx, y: hy, mult });
  }
  return { segs, hits, bounces };
}
function updateLance(dt) {
  const want = mouse.r && P.right === 'lance' && P.skills.lance > 0 && P.roll <= 0 && P.cast <= 0 && !P.infuse && !uiBlocksMouse();
  if (!want || P.mana < 1) { if (P.lancing && P.mana < 1) say('Not enough mana', 0.8); P.lancing = false; P.lance = null; P.lanceT = 0; return; }
  if (!P.lancing) { P.lancing = true; P.lanceTick = 0; sfx(400, 0.3, 'sine', 0.03, 400); }
  endWraith(); P.path = null; P.target = null;
  P.lanceT += dt; P.mana -= WS.lanceMana() * dt;
  const a = aimPoint(), d = Math.hypot(a.x - P.x, a.y - P.y) || 1; faceTo(a.x, a.y);
  const path = lancePath(P.x, P.y, (a.x - P.x) / d, (a.y - P.y) / d);
  path.refr = [];
  P.lanceTick -= dt;
  if (P.lanceTick <= 0) {
    P.lanceTick = 0.1;
    const ramp = 1 + WS.focusMax() * Math.min(1, P.lanceT / 2), base = WS.lanceDps() * 0.1 * ramp;
    let dealt = 0; const hitSet = new Set(path.hits.map(h => h.m));
    for (const h of path.hits) { hurtMon(h.m, base * h.mult, '#ffffff'); dealt += base * h.mult; P.lastHit = h.m; }
    if (P.skills.prismL > 0) for (const b of path.bounces) {
      const near = G.zone.monsters.filter(o => !o.dead && !hitSet.has(o) && Math.hypot(o.x - b.x, o.y - b.y) < 4.5 && lineClear(G.zone, b, o)).sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y)).slice(0, WS.prismLN());
      for (const o of near) { hurtMon(o, base * b.mult * WS.prismLPct(), '#e6f4ff'); hitSet.add(o); path.refr.push([b.x, b.y, o.x, o.y]); dealt += base * b.mult * WS.prismLPct(); }
    }
    const sp = WS.siphon(); if (sp && dealt) { P.hp = Math.min(D.maxHp, P.hp + dealt * sp); P.mana = Math.min(D.maxMana, P.mana + dealt * sp); }
    if (path.refr.length) P.lanceRefr = path.refr;
  }
  path.refr = P.lanceRefr || [];
  P.lance = path;
}

// =================================================================== Nether Orb
function castOrb(pt) {
  if (!P.skills.orb || P.cast > 0 || P.roll > 0) return;
  if (!spendMana('orb')) return;
  endWraith();
  const a = pt || aimPoint(), d = Math.hypot(a.x - P.x, a.y - P.y) || 1;
  G.orbs.push({ x: P.x, y: P.y, vx: (a.x - P.x) / d * 4, vy: (a.y - P.y) / d * 4, life: 2, ang: Math.random() * 6, st: 0, pow: 1, gen: 0 });
  P.cast = 0.45 / D.castSpd; faceTo(a.x, a.y); sfx(300, 0.4, 'sine', 0.04, 300);
}
function shard(x, y, ang, pow) { G.shards.push({ x, y, vx: Math.cos(ang) * 6.5, vy: Math.sin(ang) * 6.5, t: 0.75, dmg: WS.orbDmg() * pow, pierce: WS.shardPierce(), hit: new Set() }); }
function orbBurst(o) {
  const n = 14;
  for (let i = 0; i < n; i++) shard(o.x, o.y, i / n * Math.PI * 2, o.pow * 1.2);
  burst(o.x, o.y, '#ffffff', 16, 2.5); sfx(700, 0.3, 'sine', 0.04, -500);
  if (o.gen === 0 && WS.cascadeN() > 0) {
    const k = WS.cascadeN(), base = Math.atan2(o.vy, o.vx);
    for (let i = 0; i < k; i++) { const a = base + (i - (k - 1) / 2) * 0.9; G.orbs.push({ x: o.x, y: o.y, vx: Math.cos(a) * 4.5, vy: Math.sin(a) * 4.5, life: 0.9, ang: Math.random() * 6, st: 0, pow: WS.cascadePct(), gen: 1 }); }
  }
}
function updateOrbs(dt) {
  const z = G.zone;
  for (const o of G.orbs) {
    o.life -= dt; o.st -= dt;
    const nx = o.x + o.vx * dt, ny = o.y + o.vy * dt, tt = z.get(Math.floor(nx), Math.floor(ny));
    if (TALL[tt] && tt !== T.ROCK) o.life = 0; else { o.x = nx; o.y = ny; }
    while (o.st <= 0 && o.life > 0) { o.st += WS.orbRate() * (o.gen ? 1.6 : 1); o.ang += 2.3; shard(o.x, o.y, o.ang, o.pow); }
    if (o.life <= 0) orbBurst(o);
  }
  G.orbs = G.orbs.filter(o => o.life > 0);
  for (const s of G.shards) {
    s.t -= dt; const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt, tt = z.get(Math.floor(nx), Math.floor(ny));
    if (TALL[tt] && tt !== T.ROCK) { s.t = 0; continue; }
    s.x = nx; s.y = ny;
    for (const m of z.monsters) {
      if (m.dead || s.hit.has(m) || Math.abs(m.x - s.x) > 1 || Math.hypot(m.x - s.x, m.y - s.y) > m.r + 0.1) continue;
      s.hit.add(m); hurtMon(m, s.dmg, '#ffffff'); if (--s.pierce <= 0) { s.t = 0; break; }
    }
  }
  G.shards = G.shards.filter(s => s.t > 0);
  if (G.shards.length > 400) G.shards.splice(0, G.shards.length - 400);
}

// =================================================================== Soul Storm
function castStorm(pt) {
  if (!P.skills.storm || P.cast > 0 || P.roll > 0) return;
  if (P.wisps.length < 2) { say('Soul Storm needs 2 wisps', 1); return; }
  if (!spendMana('storm')) return;
  endWraith();
  for (let i = 0; i < 2; i++) { const w = takeWisp(); if (w) burst(w.x, w.y, '#d8f3ff', 4, 1.5); }
  const a = pt || aimPoint();
  G.storms.push({ x: a.x, y: a.y, life: WS.stormLife(), st: 0, spin: 0 });
  P.cast = 0.5 / D.castSpd; faceTo(a.x, a.y); sfx(200, 0.6, 'sawtooth', 0.04, 400);
}
function newSoul(x, y, ang, spd, dmg) { souls.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, t: 2.2, target: null, retarget: Math.random() * 0.15, wob: Math.random() * 6, dmg, hits: WS.soulHits(), hit: new Set() }); }
function updateStorms(dt) {
  for (const s of G.storms) {
    s.life -= dt; s.st -= dt; s.spin += dt * 6;
    while (s.st <= 0) { s.st += WS.stormRate(); newSoul(s.x, s.y, Math.random() * Math.PI * 2, 5, WS.soulDmg() * 0.75); }
  }
  G.storms = G.storms.filter(s => s.life > 0);
}

// =================================================================== Echoes & Soul Tether
function castEcho(pt) {
  if (!P.skills.echo || P.cast > 0 || P.roll > 0) return;
  const a = pt || aimPoint();
  if (G.echoes.length >= WS.echoMax()) { say(`You can hold ${WS.echoMax()} echo${WS.echoMax() > 1 ? 'es' : ''}`, 1.2); return; }
  let best = null, bd = 2.5;
  for (const m of G.zone.monsters) {
    if (!m.dead || m.echoed || m.rank === 'boss' || G.time - (m.deadAt || -99) > 45) continue;
    const d = Math.hypot(m.x - a.x, m.y - a.y); if (d < bd && dist(m, P) < 12) { bd = d; best = m; }
  }
  if (!best) { say('No fresh corpse near the cursor', 1.2); return; }
  const cost = WS.echoCost();
  if (P.wisps.length < cost) { say(`An echo needs ${cost} wisps`, 1.2); return; }
  if (!spendMana('echo')) return;
  endWraith();
  for (let i = 0; i < cost; i++) { const w = takeWisp(); if (w) flyMote(w.x, w.y, w.z, best, '#d8f3ff'); }
  best.echoed = true;
  const b = best.b, hp = Math.round(best.max * WS.echoHp());
  G.echoes.push({ isEcho: true, type: best.type, b, x: best.x, y: best.y, r: best.r, hp, max: hp, dmg: best.dmg.map(v => v * WS.echoDmg()), spd: best.spd * 1.1, face: 1, cd: 0.5, state: 'idle', t: 0, aim: { x: 1, y: 0 }, hurt: 0, rank: best.rank, mods: [], name: 'Echo of ' + best.name, path: null, repath: 0 });
  burst(best.x, best.y, '#e8f7ff', 20, 2.5); P.cast = 0.5 / D.castSpd; faceTo(best.x, best.y);
  sfx(500, 0.5, 'sine', 0.04, 400);
}
function castTether() {
  if (!P.skills.tether || P.cast > 0) return;
  if (!G.echoes.length && !G.golem) { say('Nothing to bind: raise echoes or your golem', 1.3); return; }
  if (!spendMana('tether')) return;
  G.tether = { life: WS.tetherLife(), tick: 0 };
  P.cast = 0.3 / D.castSpd; sfx(250, 0.4, 'triangle', 0.04, 250);
}
function hurtEcho(e, dmg, type) {
  dmg *= type === 'phys' ? 0.8 : 1; e.hp -= dmg; e.hurt = 0.1;
  if (e.hp <= 0) echoDies(e);
}
function echoDies(e) {
  const i = G.echoes.indexOf(e); if (i < 0) return;
  G.echoes.splice(i, 1); burst(e.x, e.y, '#e8f7ff', 16, 2);
  if (P.skills.ascend > 0) {
    const dmg = (10 + 5 * P.skills.ascend) * D.dmgMult * WS.anima();
    for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - e.x, m.y - e.y) < 1.8) hurtMon(m, dmg, '#e8f7ff');
    parts.push({ ring: true, x: e.x, y: e.y, r: 0.2, max: 1.8, t: 0.4, col: '#e8f7ff' });
  }
  say('An echo fades', 1);
}
function echoTarget(e) {
  let best = null, bd = 7;
  for (const m of G.zone.monsters) { if (m.dead || (m.state === 'idle' && dist(m, P) > 6)) continue; const d = dist(m, e); if (d < bd && dist(m, P) < 10) { bd = d; best = m; } }
  return best;
}
function updateEchoes(dt) {
  for (const e of G.echoes.slice()) {
    e.hurt = Math.max(0, e.hurt - dt); e.t += dt; e.cd -= dt;
    if (P.skills.ascend > 0) e.hp = Math.min(e.max, e.hp + e.max * 0.02 * dt);
    if (dist(e, P) > 16) { e.x = P.x + rand(-1, 1); e.y = P.y + rand(-1, 1); if (G.zone.solidAt(e.x, e.y)) { e.x = P.x; e.y = P.y; } }
    const b = e.b, T = echoTarget(e);
    if (e.state === 'windup') {
      if (e.t > b.wind * 0.8) {
        e.state = 'idle'; e.cd = (b.rec || 0.7) + 0.3;
        if (e.tgt && !e.tgt.dead) {
          if (b.ai === 'melee' || b.ai === 'boss') { if (dist(e, e.tgt) < (b.range || 1) + 0.4) { hurtMon(e.tgt, rand(e.dmg[0], e.dmg[1]), '#e8f7ff'); burst(e.tgt.x, e.tgt.y, '#e8f7ff', 3, 1); } }
          else if (b.ai === 'bomber') {
            for (const m of G.zone.monsters) if (!m.dead && dist(m, e) < 1.9) hurtMon(m, rand(e.dmg[0], e.dmg[1]) * 1.5, '#e8f7ff');
            burst(e.x, e.y, '#e8f7ff', 26, 3); echoDies(e); continue;
          } else {
            const d = dist(e, e.tgt) || 1, v = b.ai === 'caster' ? 5 : 8.5;
            G.eshots.push({ x: e.x, y: e.y, vx: (e.tgt.x - e.x) / d * v, vy: (e.tgt.y - e.y) / d * v, t: 2, dmg: rand(e.dmg[0], e.dmg[1]), orb: b.ai === 'caster' });
            e.cd = 1.4;
          }
          sfx(600, 0.05, 'sine', 0.02);
        }
      }
      continue;
    }
    if (T) {
      const d = dist(T, e); if (Math.abs((T.x - T.y) - (e.x - e.y)) > 0.05) e.face = (T.x - T.y) > (e.x - e.y) ? 1 : -1;
      const ranged = b.ai === 'ranged' || b.ai === 'caster', reach = ranged ? 5.5 : b.ai === 'bomber' ? 1.1 : (b.range || 1) + 0.1;
      if (d > reach || (ranged && !lineClear(G.zone, e, T))) monMove(e, T.x, T.y, e.spd, dt);
      else if (e.cd <= 0) { e.state = 'windup'; e.t = 0; e.tgt = T; }
    } else if (dist(e, P) > 2) monMove(e, P.x, P.y, e.spd * 1.1, dt);
    pushOut(e);
  }
  for (const s of G.eshots) {
    s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    const tt = G.zone.get(Math.floor(s.x), Math.floor(s.y)); if (TALL[tt] && tt !== T.ROCK) { s.t = 0; continue; }
    for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - s.x, m.y - s.y) < m.r + 0.15) { hurtMon(m, s.dmg, '#e8f7ff'); s.t = 0; break; }
  }
  G.eshots = G.eshots.filter(s => s.t > 0);
  // Soul Tether: chains from you to each echo and the golem burn whatever they cross
  const tq = G.tether;
  if (tq) {
    tq.life -= dt; tq.tick -= dt;
    if (tq.tick <= 0) {
      tq.tick = 0.2; const dmg = WS.tetherDps() * 0.2;
      for (const a of tetherLinks()) for (const m of G.zone.monsters) {
        if (m.dead) continue; const dx = a.x - P.x, dy = a.y - P.y, L = Math.hypot(dx, dy) || 1, px = m.x - P.x, py = m.y - P.y, t = (px * dx + py * dy) / L;
        if (t < 0 || t > L) continue; if (Math.abs(px * dy - py * dx) / L <= m.r + 0.2) hurtMon(m, dmg, '#bfe8ff');
      }
    }
    if (tq.life <= 0) G.tether = null;
  }
}
function tetherLinks() { const out = G.echoes.slice(); if (G.golem && G.golem.state !== 'dormant') out.push(G.golem); return out; }

// =================================================================== Phantom Step & Rebuke
function updatePhantoms(dt) {
  if (P.wraith && P.skills.phantom > 0 && P.path && P.path.length) {
    P.phantomT -= dt; if (P.phantomT <= 0) { P.phantomT = 0.3; G.phantoms.push({ x: P.x, y: P.y, t: 0.8, face: P.face }); }
  }
  for (const p of G.phantoms) {
    p.t -= dt;
    if (p.t <= 0) {
      for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - p.x, m.y - p.y) < 1.2 + m.r) hurtMon(m, WS.phantomDmg(), '#e8f7ff');
      parts.push({ ring: true, x: p.x, y: p.y, r: 0.2, max: 1.2, t: 0.3, col: '#e8f7ff' });
    }
  }
  G.phantoms = G.phantoms.filter(p => p.t > 0);
}
function rebukeAbsorb(a) {
  if (!P.skills.rebuke) return;
  P.rebukeAcc += a;
  if (P.rebukeAcc < WS.rebukeNeed()) return;
  P.rebukeAcc = 0;
  for (const m of G.zone.monsters) {
    if (m.dead) continue; const d = Math.hypot(m.x - P.x, m.y - P.y); if (d > 2.2 + m.r) continue;
    hurtMon(m, WS.rebukeDmg(), '#9fd8ff');
    for (let i = 0; i < 5; i++) moveCircle(m, (m.x - P.x) / (d || 1) * 0.25, (m.y - P.y) / (d || 1) * 0.25);
  }
  parts.push({ ring: true, x: P.x, y: P.y, r: 0.2, max: 2.2, t: 0.35, col: '#9fd8ff' }); sfx(800, 0.2, 'sine', 0.04, -400);
}
function updateSpells(dt) { updateOrbs(dt); updateStorms(dt); updateEchoes(dt); updatePhantoms(dt); updatePillars(dt); }

