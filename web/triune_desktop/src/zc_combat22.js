
// =================================================================== v0.22: poise, terrain and creatures you learn
// POISE is the old stamina bar, made to matter. It is one pool: rolling spends it, and blows that land drain it.
// Empty it and the next blow staggers you. Heavier armour gives more of it. Creatures have poise too: break
// theirs and they reel, open to punishment (+25% damage taken while they reel).
const POISE = { rollCost: 34, rollMin: 16, regen: 30, delay: 1.0, reel: 0.55, grace: 1.1, breakBonus: 1.25 };
function poiseRegen(dt) {
  P.stamDelay -= dt; if (P.poiseGrace > 0) P.poiseGrace -= dt;
  if (P.stamDelay <= 0 && P.roll <= 0) P.stam = Math.min(D.maxStam, P.stam + POISE.regen * dt);
}
function playerPoiseHit(d, fx, fy) {
  if (P.dead || d <= 0 || P.poiseGrace > 0) return;
  const heavy = d > D.maxHp * 0.12;
  P.stam -= Math.max(4, d * 1.8 * (heavy ? 1.5 : 1)); P.stamDelay = POISE.delay;
  if (P.stam > 0) return;
  // broken: a short stagger, then a moment where blows cannot break you again
  P.stam = 0; P.poiseGrace = POISE.reel + POISE.grace; P.stagger = POISE.reel;
  P.cast = Math.max(P.cast, POISE.reel); P.path = null; P.target = null; P.approach = null; P.infuse = false;
  parts.push({ ring: true, x: P.x, y: P.y, r: 0.2, max: 1.1, t: 0.35, col: '#d9a441' });
  say('Poise broken', 0.9); sfx(140, 0.25, 'square', 0.05, -90);
}
function monPoiseMax(m) { return m.max * (m.b.poiseK || 0.6) * (m.rank === 'boss' ? 1.6 : m.rank === 'unique' ? 1.2 : 1); }
function poiseHit(m, amt) {
  if (!m || m.dead || m.reel > 0 || amt <= 0) return;
  if (m.poise == null) m.poise = monPoiseMax(m);
  m.poise -= amt; m.poiseT = 2.2;
  if (m.poise > 0) return;
  m.poise = monPoiseMax(m); m.reel = m.rank === 'boss' ? 0.5 : 1.0; m.stun = Math.max(m.stun || 0, m.reel);
  m.path = null; if (m.state !== 'idle') m.state = 'chase';
  parts.push({ ring: true, x: m.x, y: m.y, r: 0.15, max: 0.9 + m.r, t: 0.3, col: '#f0e0b0' });
  burst(m.x, m.y, '#f0e0b0', 8, 1.6); sfx(220, 0.18, 'square', 0.04, -140);
}
function updatePoise22(m, dt) {
  if (m.reel > 0) m.reel -= dt;
  if (m.poiseT > 0) { m.poiseT -= dt; if (m.poiseT <= 0) m.poise = monPoiseMax(m); }
}

// ------------------------------------------------------------------- terrain
// Shallows and mud slow anything that walks; things that fly or drift do not care.
function terrainSpd(o) {
  if (!G.zone || o.fly || o.ghost) return 1;
  const t = G.zone.get(Math.floor(o.x), Math.floor(o.y));
  return t === T.SHALLOW ? 0.72 : t === T.MUD ? 0.8 : 1;
}
function tileAt(o) { return G.zone.get(Math.floor(o.x), Math.floor(o.y)); }
function isWet(o) { const t = tileAt(o); return t === T.SHALLOW; }
function isStone(x, y) { const t = G.zone.get(Math.floor(x), Math.floor(y)); return t === T.ROAD || t === T.FLOOR || t === T.FLAGS || t === T.PILLAR; }

// light, as the creatures feel it: lanterns, braziers, fires on the ground
function lightNear(x, y) {
  let best = null, bd = 1e9;
  for (const o of G.zone.objects) if (o.type === 'lantern' || o.type === 'altar') { const d = Math.hypot(o.x - x, o.y - y); if (d < 5 && d < bd) { bd = d; best = o; } }
  if (G.props) for (const p of G.props) if (p.kind === 'brazier' || p.kind === 'candles') { const d = Math.hypot(p.x - x, p.y - y); if (d < 3.2 && d < bd) { bd = d; best = p; } }
  for (const f of G.fires) { const d = Math.hypot(f.x - x, f.y - y); if (d < 2.2 && d < bd) { bd = d; best = f; } }
  for (const f of G.efires || []) { const d = Math.hypot(f.x - x, f.y - y); if (d < 2.2 && d < bd) { bd = d; best = f; } }
  return best;
}

// ------------------------------------------------------------------- the enemy's fire (Pyre-Saints)
if (!G.efires) G.efires = [];
function enemyFire(x, y, R, dps, t) { if (G.zone.solidAt(x, y) || isWet({ x, y })) return; G.efires.push({ x, y, R, dps, t, max: t, tick: 0 }); while (G.efires.length > 60) G.efires.shift(); }
function updateEFires(dt) {
  if (!G.efires.length) return;
  for (const f of G.efires) {
    f.t -= dt; f.tick -= dt;
    if (f.tick <= 0) {
      f.tick = 0.35;
      if (!P.dead && Math.hypot(P.x - f.x, P.y - f.y) < f.R + P.r) hurtPlayer(f.dps * 0.35, 'magic', f.x, f.y);
      for (const T of minionList()) if (T && !T.dead && Math.hypot(T.x - f.x, T.y - f.y) < f.R + (T.r || 0.3)) hitTarget(T, f.dps * 0.35, 'magic', f.x, f.y);
    }
    if (Math.random() < dt * 5) parts.push({ x: f.x + rand(-f.R, f.R) * 0.7, y: f.y + rand(-f.R, f.R) * 0.4, z: 2, vx: 0, vy: 0, vz: 10 + Math.random() * 8, t: 0.45, col: Math.random() < 0.5 ? '#ffb050' : '#ff6a3d', g: '255,140,50', s: 0.6, t0: 0.45 });
  }
  G.efires = G.efires.filter(f => f.t > 0);
}
function drawEFires(list) {
  for (const f of G.efires) { if (!onScreen(f.x, f.y)) continue; list.push({ d: f.x + f.y - 0.6, f: () => {
    const q = iso(f.x, f.y), a = Math.min(1, f.t / 0.6), fl = 0.8 + 0.2 * Math.sin(G.time * 13 + f.x * 5);
    ctx.fillStyle = `rgba(90,24,8,${0.45 * a})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, f.R * ISO_R, f.R * ISO_RY, 0, 0, 6.28); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 2, f.R * 12, '255,120,40', 0.35 * a * fl); ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 4; i++) { const ox = Math.sin(i * 2.3 + f.x) * f.R * 8, h = 3 + 3 * Math.abs(Math.sin(G.time * 9 + i * 1.7 + f.y)); ctx.fillStyle = i % 2 ? '#ff8a3a' : '#ffd070'; ctx.fillRect(Math.round(q.sx + ox), Math.round(q.sy - h + Math.cos(i) * 2), 1, Math.round(h * a)); }
  } }); }
}

// ------------------------------------------------------------------- creature behaviours
// Every creature keeps the three poses the painters know (idle/walk, wind-up, strike) and its tell is a pose or a
// sound, never a flash.
function faceMon(m, T) { if (Math.abs((T.x - T.y) - (m.x - m.y)) > 0.05) m.face = (T.x - T.y) > (m.x - m.y) ? 1 : -1; }
function strikeAt(m, T, reach, mult = 1) {
  const hx = m.x + m.aim.x * reach * 0.8, hy = m.y + m.aim.y * reach * 0.8, extra = T === G.golem ? 0.35 : T.isColossus || T.isFGolem ? T.r * 0.7 : 0;
  burst(hx, hy, '#6f6a79', 3, 1);
  if (Math.hypot(T.x - hx, T.y - hy) < 0.8 + extra) { hitTarget(T, rand(m.dmg[0], m.dmg[1]) * mult, 'phys', m.x, m.y, m); return true; }
  return false;
}
// the plain melee rhythm: close in, wind up, strike, recover
function meleeStd(m, dt, T, d, tp, reach, spdK = 1) {
  const b = m.b;
  if (m.state === 'chase') {
    if (d > reach) monMove(m, T.x, T.y, m.spd * spdK, dt);
    else if (m.cd <= 0) { m.state = 'windup'; m.t = 0; m.aim = { x: tp.x, y: tp.y }; }
  } else if (m.state === 'windup') {
    if (m.t > b.wind) { m.state = 'recover'; m.t = 0; strikeAt(m, T, b.range || 1); sfx(160, 0.07, 'square', 0.025, -60); }
  } else if (m.state === 'recover') { if (m.t > (b.rec || 0.7)) { m.state = 'chase'; m.cd = 0.3; } }
  else m.state = 'chase';
}
function playerFront(T) {
  if (T === P) { const a = aimPoint(), dx = a.x - P.x, dy = a.y - P.y, l = Math.hypot(dx, dy); if (l > 0.2) return { x: dx / l, y: dy / l }; if (P.lastDir) return P.lastDir; }
  if (T.aim) return T.aim;
  return { x: T.face || 1, y: -(T.face || 1) };
}
function awakePackmates(m, R) { let n = 0; for (const o of G.zone.monsters) if (o !== m && !o.dead && o.state !== 'idle' && o.type === m.type && Math.hypot(o.x - m.x, o.y - m.y) < R) n++; return n; }

const AI22 = {
  // HUSKS wait for company, then surge; a lone husk shambles. When you turn your back close by, they lunge.
  husk(m, dt, T, d, tp) {
    const b = m.b, mates = awakePackmates(m, 4.5), surge = mates >= 2;
    if (m.state === 'chargeWind') { if (m.t > 0.38) { m.state = 'charge'; m.t = 0; m.hitOnce = false; } return; }
    if (m.state === 'charge') {
      moveCircle(m, m.aim.x * 6.5 * dt, m.aim.y * 6.5 * dt);
      if (!m.hitOnce && Math.hypot(T.x - m.x, T.y - m.y) < m.r + (T.r || 0.3) + 0.25) { m.hitOnce = true; hitTarget(T, rand(m.dmg[0], m.dmg[1]) * 1.2, 'phys', m.x, m.y, m); }
      if (m.t > 0.3) { m.state = 'recover'; m.t = 0; }
      return;
    }
    if (m.state === 'chase' && m.cd <= 0 && d > 1.3 && d < 2.6 && lineClear(G.zone, m, T)) {
      const f = playerFront(T), behind = (m.x - T.x) * f.x + (m.y - T.y) * f.y < 0;
      if (surge || (T === P && behind)) { m.state = 'chargeWind'; m.t = 0; m.aim = { x: tp.x, y: tp.y }; m.cd = 2.5; sfx(120, 0.2, 'sawtooth', 0.03, 60); return; }
    }
    meleeStd(m, dt, T, d, tp, b.range, surge ? 1.35 : 0.78);
  },
  // TITHE-HANDS circle, then dart in from behind or while you are busy with something else. The last one flees.
  flank(m, dt, T, d, tp) {
    const b = m.b;
    if (m.flee > 0) { m.flee -= dt; stepToward(m, m.x - tp.x * 2, m.y - tp.y * 2, m.spd * 1.1 * dt); return; }
    if (m.hp < m.max * 0.5 && awakePackmates(m, 10) === 0 && !m.fled) { m.fled = true; m.flee = 3; return; }
    if (m.state === 'windup' && d > b.range * 0.8 && !G.zone.solidAt(m.x + tp.x * 0.3, m.y + tp.y * 0.3)) stepToward(m, T.x, T.y, m.spd * 1.7 * dt);   // v0.88: the lunge
    if (m.state === 'windup' || m.state === 'recover') { meleeStd(m, dt, T, d, tp, b.range); if (m.state === 'chase') { m.orbit = 1.1; } return; }
    if (m.orbit > 0) m.orbit -= dt;
    m.oa = (m.oa == null ? Math.atan2(m.y - T.y, m.x - T.x) : m.oa) + dt * 1.1 * (m.odir || (m.odir = Math.random() < 0.5 ? 1 : -1));
    const f = playerFront(T), busy = T === P && (P.cast > 0 || P.target) && !(P.target && P.target.ref === m);
    const others = G.zone.monsters.some(o => o !== m && !o.dead && o.state !== 'idle' && Math.hypot(o.x - T.x, o.y - T.y) < 1.4);
    const hasTurn = window.__mobai && window.__mobai.TOK && window.__mobai.TOK.has(m);   // v0.88: a hand with an attack turn commits
    if (!((m.orbit || 0) > 0) && m.cd <= 0 && (hasTurn || busy || others || Math.random() < dt * 0.25)) {
      // aim for the back: a point behind the target, turned a little per hand
      const off = (m.odir || 1) * 0.5, bx = -f.x * Math.cos(off) + f.y * Math.sin(off), by = -f.y * Math.cos(off) - f.x * Math.sin(off);
      const px = T.x + bx * 0.9, py = T.y + by * 0.9;
      if (!G.zone.solidAt(px, py)) {
        // v0.88: in reach, strike from where it is; if the back can't be reached in a moment (a crowd), come straight in
        m._bk = (m._bk || 0) + dt;
        if (d > b.range + 0.6 && m._bk > 1.2) { monMove(m, T.x, T.y, m.spd * 1.25, dt); return; }
        if (Math.hypot(m.x - px, m.y - py) > 0.5 && d > b.range + 0.6) { monMove(m, px, py, m.spd * 1.25, dt); return; }
        m._bk = 0;
        m.state = 'windup'; m.t = 0; m.aim = { x: tp.x, y: tp.y }; return;
      }
      // your back is to a wall: they can only wait and circle
    }
    const ox = T.x + Math.cos(m.oa) * 2.7, oy = T.y + Math.sin(m.oa) * 2.7;
    if (G.zone.solidAt(ox, oy)) m.odir = -(m.odir || 1);
    monMove(m, ox, oy, m.spd * 0.8, dt);
  },
  // WEEPERS keep their distance, back away from you, and slip behind cover when you close in
  kiter(m, dt, T, d, tp) {
    const b = m.b, see = lineClear(G.zone, m, T);
    if (m.state === 'windup') {
      m.aim = { x: tp.x, y: tp.y };
      if (m.t > b.wind) {
        shots.push({ x: m.x + tp.x * 0.4, y: m.y + tp.y * 0.4, vx: tp.x * 8.5, vy: tp.y * 8.5, t: 2.2, dmg: rand(m.dmg[0], m.dmg[1]), type: 'phys', kind: 'arrow', r: 0.12 });
        m.state = 'chase'; m.cd = 1.8 + Math.random() * 0.8; sfx(420, 0.08, 'triangle', 0.03, -200);
        if (Math.random() < 0.5) m.duck = 1.2;
      }
      return;
    }
    m.state = 'chase';
    if (d < 4.2 || m.duck > 0) {
      if (m.duck > 0) m.duck -= dt;
      // back off; if something is behind, slide sideways
      let ax = -tp.x, ay = -tp.y;
      if (G.zone.solidAt(m.x + ax * 0.8, m.y + ay * 0.8)) { const s = m.odir || (m.odir = Math.random() < 0.5 ? 1 : -1); ax = -tp.y * s; ay = tp.x * s; if (G.zone.solidAt(m.x + ax * 0.8, m.y + ay * 0.8)) m.odir = -s; }
      stepToward(m, m.x + ax, m.y + ay, m.spd * 1.1 * dt);
    } else if (d > 6.5 || !see) monMove(m, T.x, T.y, m.spd, dt);
    if (see && d < 8 && m.cd <= 0 && !(m.duck > 0)) { m.state = 'windup'; m.t = 0; m.aim = { x: tp.x, y: tp.y }; }
  },
  // GASPS drift through stone, never through light. Lit, they recoil and are easier to hurt.
  ghost(m, dt, T, d, tp) {
    const b = m.b; m.ghost = true;
    const L = lightNear(m.x, m.y); m.lit = L ? 0.4 : Math.max(0, (m.lit || 0) - dt);
    if (L) { const dx = m.x - L.x, dy = m.y - L.y, l = Math.hypot(dx, dy) || 1; m.x += dx / l * m.spd * 1.3 * dt; m.y += dy / l * m.spd * 1.3 * dt; m.state = 'chase'; return; }
    if (m.state === 'windup') {
      m.aim = { x: tp.x, y: tp.y };
      if (m.t > b.wind) {
        shots.push({ x: m.x + tp.x * 0.4, y: m.y + tp.y * 0.4, vx: tp.x * 4.6, vy: tp.y * 4.6, t: 2.2, dmg: rand(m.dmg[0], m.dmg[1]), type: 'magic', kind: 'orb', r: 0.3 });
        m.state = 'chase'; m.cd = 2 + Math.random(); sfx(250, 0.08, 'sine', 0.03, 150);
      }
      return;
    }
    // drift: straight through walls toward a spot a few yards off the target, bobbing
    const want = d > 6 ? 4.5 : d < 3.5 ? 5 : d;
    const gx = T.x - tp.x * want, gy = T.y - tp.y * want, l = Math.hypot(gx - m.x, gy - m.y);
    if (l > 0.2) { m.x += (gx - m.x) / l * m.spd * dt; m.y += (gy - m.y) / l * m.spd * dt; }
    m.x += Math.cos(G.time * 1.3 + m.hx) * 0.3 * dt; m.y += Math.sin(G.time * 1.1 + m.hy) * 0.3 * dt;
    m.x = clamp(m.x, 2, G.zone.w - 3); m.y = clamp(m.y, 2, G.zone.h - 3);
    if (d < 7.5 && m.cd <= 0 && !G.zone.solidAt(m.x, m.y) && lineClear(G.zone, m, T)) { m.state = 'windup'; m.t = 0; }
  },
  // PYRE-SAINTS walk straight at you in burning footprints and burst when close. Water puts them out for good.
  pyre(m, dt, T, d, tp) {
    const b = m.b;
    if (!m.doused && isWet(m)) {
      m.doused = true; m.spd *= 0.7; m.dmg = m.dmg.map(v => v * 0.45); m.name = 'Doused ' + m.name.replace(/^Champion /, '');
      burst(m.x, m.y, '#c8d0d8', 26, 2.2); for (let i = 0; i < 8; i++) parts.push({ x: m.x, y: m.y, z: 10, vx: rand(-1, 1), vy: rand(-1, 1), vz: 14, t: 0.9, col: '#8f8a7c' });
      say('The Pyre-Saint gutters out', 1.2); sfx(900, 0.5, 'noise' === 'x' ? 'sine' : 'sawtooth', 0.02, -800);
    }
    if (m.doused) { meleeStd(m, dt, T, d, tp, 0.95, 1); return; }
    m.trailT = (m.trailT || 0) - dt;
    if (m.trailT <= 0 && (m.x !== m._fx || m.y !== m._fy)) { m.trailT = 0.45; m._fx = m.x; m._fy = m.y; enemyFire(m.x, m.y, 0.45, (m.dmg[0] + m.dmg[1]) * 0.5 * 0.7, 3.5); }
    if (m.state === 'windup') {
      if (m.t > b.wind) { pyreErupt(m, 1); killMon(m); }
      return;
    }
    m.state = 'chase';
    if (d < 1.35) { m.state = 'windup'; m.t = 0; sfx(160, 0.9, 'sawtooth', 0.04, 220); return; }
    monMove(m, T.x, T.y, m.spd, dt);
  },
  // BELLWETHERS toll twice, lock on, and charge in a straight line. A wall stops them hard and breaks their poise.
  charger(m, dt, T, d, tp) {
    const b = m.b;
    if (m.state === 'dazed') { if (m.t > 2.2) { m.state = 'chase'; m.cd = 1.5; } return; }
    if (m.state === 'chargeWind') {
      if (m.t < 0.65) m.aim = { x: tp.x, y: tp.y };   // it tracks you until just before it goes
      if (m.t > 0.2 && !m.toll1) { m.toll1 = true; bellToll(m); }
      if (m.t > 0.55 && !m.toll2) { m.toll2 = true; bellToll(m); }
      if (m.t > 0.9) { m.state = 'charge'; m.t = 0; m.hitSet = new Set(); }
      return;
    }
    if (m.state === 'charge') {
      const ox = m.x, oy = m.y; moveCircle(m, m.aim.x * 8.5 * dt, m.aim.y * 8.5 * dt);
      for (const X of [P].concat(minionList())) {
        if (!X || X.dead || (X === P && (P.dead || P.roll > 0)) || m.hitSet.has(X)) continue;
        if (Math.hypot(X.x - m.x, X.y - m.y) < m.r + (X.r || 0.3) + 0.15) {
          m.hitSet.add(X); hitTarget(X, rand(m.dmg[0], m.dmg[1]) * 1.6, 'phys', ox, oy, m);
          if (X === P) { playerPoiseHit(D.maxStam, ox, oy); for (let i = 0; i < 4; i++) moveCircle(P, m.aim.x * 0.25, m.aim.y * 0.25); } else X.stun = Math.max(X.stun || 0, 0.6);
          G.shake = Math.max(G.shake, 4);
        }
      }
      const blocked = Math.hypot(m.x - ox, m.y - oy) < 8.5 * dt * 0.3;
      if (blocked) { m.state = 'dazed'; m.t = 0; m.stun = 2.2; m.reel = 2.2; G.shake = Math.max(G.shake, 5); bellToll(m, true); burst(m.x + m.aim.x * 0.6, m.y + m.aim.y * 0.6, '#b8a070', 20, 2.5); return; }
      if (m.t > 1.3) { m.state = 'recover'; m.t = 0; }
      return;
    }
    if (m.state === 'chase' && m.cd <= 0 && d > 2.8 && d < 9 && lineClear(G.zone, m, T)) { m.state = 'chargeWind'; m.t = 0; m.toll1 = m.toll2 = false; m.cd = 5; return; }
    meleeStd(m, dt, T, d, tp, b.range, 1);
  },
  // VEIN-WORMS travel under soft ground and burst up beneath you. They cannot dig through stone.
  burrow(m, dt, T, d, tp) {
    const b = m.b;
    if (m.state === 'chase' || m.state === 'under') {
      m.state = 'under'; m.hidden = true;
      m.rip = (m.rip || 0) - dt; if (m.rip <= 0) { m.rip = 0.18; (G.ripples || (G.ripples = [])).push({ x: m.x, y: m.y, t: 0.9 }); }
      if (isStone(T.x, T.y)) {
        // it can smell you on the flagstones but cannot reach: it circles at the edge
        m.oa = (m.oa || 0) + dt * 0.9; const gx = T.x + Math.cos(m.oa) * 3, gy = T.y + Math.sin(m.oa) * 3;
        const nx = m.x + clamp(gx - m.x, -1, 1) * m.spd * dt, ny = m.y + clamp(gy - m.y, -1, 1) * m.spd * dt;
        if (!isStone(nx, ny) && !G.zone.solidAt(nx, ny)) { m.x = nx; m.y = ny; }
        return;
      }
      const nx = m.x + tp.x * m.spd * dt, ny = m.y + tp.y * m.spd * dt;
      if (!isStone(nx, ny) && !G.zone.solidAt(nx, ny)) { m.x = nx; m.y = ny; }
      if (d < 0.5 && m.cd <= 0) { m.state = 'windup'; m.t = 0; m.spot = { x: T.x, y: T.y }; sfx(70, 0.6, 'sine', 0.05, 40); }
      return;
    }
    if (m.state === 'windup') {
      if (m.t > 0.75) {
        m.state = 'surfaced'; m.t = 0; m.hidden = false; m.x = m.spot.x; m.y = m.spot.y; pushOut(m);
        burst(m.x, m.y, '#8e2630', 22, 2.6); if (typeof splatPool === 'function') splatPool(m.x, m.y, 0.6, 8);
        for (const X of [P].concat(minionList())) if (X && !X.dead && !(X === P && P.roll > 0) && Math.hypot(X.x - m.x, X.y - m.y) < 0.95) hitTarget(X, rand(m.dmg[0], m.dmg[1]) * 1.4, 'phys', m.x, m.y, m);
        G.shake = Math.max(G.shake, 2.5);
      }
      return;
    }
    if (m.state === 'surfaced' || m.state === 'recover' || m.state === 'lash') {
      if (m.state === 'lash') { if (m.t > 0.35) { m.state = 'recover'; m.t = 0; strikeAt(m, T, 1.3); } return; }
      if (m.state === 'recover' && m.t > 0.5) m.state = 'surfaced';
      m.up = (m.up || 0) + dt;
      if (d < 1.4 && m.cd <= 0 && m.state === 'surfaced') { m.state = 'lash'; m.t = 0; m.aim = { x: tp.x, y: tp.y }; m.cd = 0.9; return; }
      if (m.up > 2.8) { m.up = 0; m.state = 'under'; m.cd = 1.2; burst(m.x, m.y, '#5a2a22', 10, 1.5); }
      return;
    }
    m.state = 'under';
  },
  // MOTH-SAINTS hover out of reach, fold their wings, and swoop through you in an arc. Low, they are fragile.
  flyer(m, dt, T, d, tp) {
    m.fly = true; if (m.z == null) m.z = 14;
    if (m.state === 'chargeWind') { m.z = Math.max(9, m.z - dt * 8); if (m.t > 0.45) { m.state = 'charge'; m.t = 0; m.from = { x: m.x, y: m.y }; m.to = { x: T.x + tp.x * 2.2, y: T.y + tp.y * 2.2 }; m.hitOnce = false; } return; }
    if (m.state === 'charge') {
      const k = Math.min(1, m.t / 0.75), side = Math.sin(k * Math.PI) * 1.2 * (m.odir || 1);
      const bx = m.from.x + (m.to.x - m.from.x) * k, by = m.from.y + (m.to.y - m.from.y) * k, nx = -(m.to.y - m.from.y), ny = m.to.x - m.from.x, nl = Math.hypot(nx, ny) || 1;
      m.x = bx + nx / nl * side; m.y = by + ny / nl * side; m.z = 3 + 11 * Math.abs(k - 0.5) * 2 * 0.6;
      if (!m.hitOnce && Math.hypot(T.x - m.x, T.y - m.y) < 0.75) { m.hitOnce = true; hitTarget(T, rand(m.dmg[0], m.dmg[1]), 'phys', m.x, m.y, m); }
      if (k >= 1) { m.state = 'recover'; m.t = 0; m.cd = 2.4 + Math.random(); }
      return;
    }
    m.z = Math.min(14, m.z + dt * 10); m.state = 'chase';
    // hover in a slow circle, drawn toward light when there is any
    const L = lightNear(m.x, m.y), cx = L && Math.random() < 0.5 ? L.x : T.x, cy = L && Math.random() < 0.5 ? L.y : T.y;
    m.oa = (m.oa == null ? Math.random() * 6.28 : m.oa) + dt * 0.8 * (m.odir || (m.odir = Math.random() < 0.5 ? 1 : -1));
    const gx = cx + Math.cos(m.oa) * 4.2, gy = cy + Math.sin(m.oa) * 4.2, l = Math.hypot(gx - m.x, gy - m.y);
    if (l > 0.1) { m.x += (gx - m.x) / l * m.spd * dt; m.y += (gy - m.y) / l * m.spd * dt; }
    m.x = clamp(m.x, 2, G.zone.w - 3); m.y = clamp(m.y, 2, G.zone.h - 3);
    if (m.cd <= 0 && d < 7) { m.state = 'chargeWind'; m.t = 0; sfx(600, 0.3, 'sine', 0.02, -300); }
  },
  // OSSUARY WARDENS hold a tower shield of fused skulls: what comes from the front is blocked
  shield(m, dt, T, d, tp) { m.fdir = { x: tp.x, y: tp.y }; meleeStd(m, dt, T, d, tp, m.b.range, 0.9); },
  // MARROW DUELISTS parry a flurry of quick blows and riposte. Heavy blows break through.
  duelist(m, dt, T, d, tp) {
    if (m.state === 'parry') { if (m.t > 0.7) { m.state = 'chase'; m.cd = 0.2; } return; }
    meleeStd(m, dt, T, d, tp, m.b.range, 1.05);
  }
};
function bellToll(m, crack) { sfx(crack ? 90 : 180, crack ? 1.2 : 0.9, 'sine', 0.06, crack ? -20 : -8); sfx(crack ? 135 : 271, 0.7, 'triangle', 0.03, -10); parts.push({ ring: true, x: m.x, y: m.y, r: 0.3, max: 2.4, t: 0.5, col: '#b8a070' }); }
function pyreErupt(m, k) {
  const R = 1.8 * k, dmg = rand(m.dmg[0], m.dmg[1]) * 1.6 * k;
  burst(m.x, m.y, '#ffb050', 36, 3.2); burst(m.x, m.y, '#fff0c0', 12, 2); G.shake = Math.max(G.shake, 4 * k);
  if (!P.dead && dist(m, P) < R && P.roll <= 0) hurtPlayer(dmg, 'magic', m.x, m.y);
  for (const X of minionList()) if (X && !X.dead && Math.hypot(X.x - m.x, X.y - m.y) < R) hitTarget(X, dmg, 'magic', m.x, m.y);
  for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; enemyFire(m.x + Math.cos(a) * R * 0.55, m.y + Math.sin(a) * R * 0.55, 0.5, dmg * 0.4, 4); }
  sfx(60, 0.7, 'sawtooth', 0.07, -30);
}
// damage the creatures take, bent by what they are doing
function monDmg22(m, d) {
  if (m.hidden) return 0;
  const ai = m.b.ai, src = G.hitSrc || P;
  if (ai === 'flyer') d *= (m.z || 0) > 8 ? 0.35 : 1.3;
  if (ai === 'ghost' && m.lit > 0) d *= 1.5;
  if (ai === 'shield' && m.state !== 'recover' && m.fdir && m.reel <= 0) {
    const dx = src.x - m.x, dy = src.y - m.y, l = Math.hypot(dx, dy) || 1;
    if ((dx * m.fdir.x + dy * m.fdir.y) / l > 0.34) { d *= 0.15; if (Math.random() < 0.5) sfx(900, 0.05, 'square', 0.02, -300); burst(m.x + m.fdir.x * 0.4, m.y + m.fdir.y * 0.4, '#e8e2d0', 2, 1); }
  }
  if (ai === 'duelist' && m.reel <= 0) {
    const now = G.time; m.hitLog = (m.hitLog || []).filter(t => now - t < 1.2); m.hitLog.push(now);
    const heavy = d > m.max * 0.14;
    if (m.state === 'parry' && !heavy) {
      d = 0; burst(m.x, m.y - 0.1, '#ffffff', 3, 1); sfx(1200, 0.05, 'square', 0.02, -600);
      if (!m.riposte && dist(m, src) < 1.8) { m.riposte = true; m.aim = { x: (src.x - m.x) / (dist(m, src) || 1), y: (src.y - m.y) / (dist(m, src) || 1) }; hitTarget(src === P ? P : src, rand(m.dmg[0], m.dmg[1]) * 1.5, 'phys', m.x, m.y, m); if (src === P) playerPoiseHit(D.maxStam * 0.6, m.x, m.y); }
    } else if (!heavy && m.hitLog.length >= 3 && m.state !== 'windup' && m.stun <= 0) { m.state = 'parry'; m.t = 0; m.riposte = false; m.hitLog = []; }
  }
  if (m.reel > 0) d *= POISE.breakBonus;
  return d;
}
function monDeath22(m) {
  if (m.herald) heraldDeath(m); else arcanaDrop22(m);
  if (m.b.ai === 'pyre' && !m.doused && m.state !== 'windup') pyreErupt(m, 0.55);
  m.hidden = false;
}
function untargetable(m) { return m.dead || m.hidden; }
// ripples in the soil above a burrowing worm, and a blood-bubble ring where it is about to burst up
function drawBurrowFx(list) {
  const R = G.ripples || [];
  for (const r of R) r.t -= G.dtLast || 0.016;
  G.ripples = R.filter(r => r.t > 0);
  for (const r of G.ripples) { if (!onScreen(r.x, r.y)) continue; list.push({ d: r.x + r.y - 0.7, f: () => { const q = iso(r.x, r.y), a = r.t / 0.9, k = 1 - a; ctx.strokeStyle = `rgba(60,34,26,${0.7 * a})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, 2 + 6 * k, 1 + 3 * k, 0, 0, 6.28); ctx.stroke(); ctx.fillStyle = `rgba(90,60,40,${0.6 * a})`; ctx.fillRect(Math.round(q.sx) - 1, Math.round(q.sy) - 1, 2, 1); } }); }
  // v0.55: no marker where a burrower will surface
}
// placeholder bodies for the new creatures until their own painters exist (the hi-res bestiary replaces these)
const SPR_ALIAS = { hand: 'hound', weeper: 'archer', gasp: 'caster', warden: 'knight', pyre: 'hollow', bell: 'knight', worm: 'hound', moth: 'caster', duelist: 'knight' };
for (const k in SPR_ALIAS) { const a = SPR_ALIAS[k]; if (!MPAINT[k]) MPAINT[k] = MPAINT[a]; if (!MPAL[k]) MPAL[k] = MPAL[a]; if (!MFRAME[k]) MFRAME[k] = MFRAME[a]; if (!SPR[k]) SPR[k] = SPR[a]; }
Object.assign(BONY, { warden: 1, duelist: 1 });
// the nearest open spot to a point, as world coordinates (tile centre when the point itself is blocked)
function openSpot(z, x, y) {
  if (!z.solidAt(x, y)) return { x, y };
  const r = nearestWalk(z, Math.floor(x), Math.floor(y)); return r ? { x: r[0] + 0.5, y: r[1] + 0.5 } : null;
}
