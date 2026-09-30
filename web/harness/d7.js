// =================================================================== v0.7: wisp orders
// x: how far the choir ranges (0 close .. 4 roam) · y: guard (0) .. attack (4)
function wispRange(base) { return base + (P.wbeh.x - 2) * 1.1; }
function wispAllowed(m) {
  const W = P.wbeh;
  if (W.hold) return false;
  if (W.y <= 1) { const g = G.golem; return dist(m, P) < 2.6 + W.y * 0.8 || m.tgt === P || (g && m.tgt === g && dist(m, g) < 2.5); }
  return true;
}
function wispFocus(maxFromP) {
  const t = P.lastHit;
  if (P.wbeh.focus && t && !t.dead && dist(t, P) < maxFromP + 1.5 && lineClear(G.zone, P, t)) return t;
  return null;
}

// =================================================================== golem orders by recasting
function commandGolem(pt) {
  const g = G.golem;
  if (g.state === 'dormant') { say('Your golem is dormant', 1); return; }
  const a = pt || aimPoint(), nw = nearestWalk(G.zone, Math.floor(a.x), Math.floor(a.y));
  if (!nw) return;
  g.order = { x: nw[0] + 0.5, y: nw[1] + 0.5, t: 7 };
  g.atk = null; g.path = null; if (g.state === 'charge' || g.state === 'chargeWind') g.state = 'active';
  if (P.gbeh.hold) g.hold = { x: g.order.x, y: g.order.y };
  parts.push({ ring: true, x: g.order.x, y: g.order.y, r: 0.9, max: 0.25, t: 0.5, col: '#aab4c2' });
  sfx(180, 0.12, 'square', 0.03, 80); P.cast = 0.15;
}

// =================================================================== Iron Challenge
function updateChallenge(g, dt) {
  if (!P.skills.challenge || g.state === 'dormant') return;
  g.chT = (g.chT || 1) - dt;
  if (g.chT > 0) return;
  g.chT = WS.challengeCd();
  const R = WS.challengeR(); let n = 0;
  for (const m of G.zone.monsters) if (!m.dead && m.rank !== 'boss' && Math.hypot(m.x - g.x, m.y - g.y) < R) { m.taunt = 3; aggro(m); n++; }
  if (n) { parts.push({ ring: true, x: g.x, y: g.y, r: 0.4, max: R, t: 0.45, col: '#c8553d' }); sfx(70, 0.3, 'sawtooth', 0.04, 20); }
}

// =================================================================== Soul Leash: a swaying rope of anima
function castLeash(pt) {
  if (!P.skills.leash || P.cast > 0 || P.roll > 0) return;
  const a = pt || aimPoint();
  let kind = 'ground', ref = null;
  const gr = G.golemRect;
  if (G.golem && G.golem.state !== 'dormant' && (Math.hypot(G.golem.x - a.x, G.golem.y - a.y) < 1 || (!pt && gr && inRect(mouse, gr.x, gr.y, gr.w, gr.h)))) { kind = 'golem'; ref = G.golem; }
  else { const h = !pt && G.hover && G.hover.kind === 'mon' ? G.hover.ref : nearestMonTo(a, 1); if (h && !h.dead) { kind = 'mon'; ref = h; } }
  if (dist(ref || a, P) > 9) { say('Too far to leash', 1); return; }
  if (!spendMana('leash')) return;
  endWraith();
  while (G.leashes.length >= WS.leashMax()) G.leashes.shift();
  const ax = ref ? ref.x : a.x, ay = ref ? ref.y : a.y, N = 14, pts = [];
  for (let i = 0; i <= N; i++) { const t = i / N, x = P.x + (ax - P.x) * t, y = P.y + (ay - P.y) * t, z = 9 - 3 * Math.sin(t * Math.PI); pts.push({ x, y, z, px: x, py: y, pz: z }); }
  G.leashes.push({ kind, ref, ax, ay, pts, life: WS.leashLife(), tick: 0, hit: new Map() });
  P.cast = 0.35 / D.castSpd; faceTo(ax, ay);
  sfx(300, 0.35, 'triangle', 0.04, 300);
}
function leashEnd(L) { return L.ref ? { x: L.ref.x, y: L.ref.y, z: L.kind === 'golem' ? 16 : 9 } : { x: L.ax, y: L.ay, z: 2 }; }
function updateLeashes(dt) {
  for (const L of G.leashes) {
    L.life -= dt;
    if (L.ref && (L.ref.dead || (L.kind === 'golem' && (L.ref !== G.golem || L.ref.state === 'dormant')))) {
      if (L.kind === 'mon' && P.skills.snare > 0 && L.ref.dead && P.wisps.length < effCap()) { spawnWisp(); floatText(L.ref.x, L.ref.y, 'wisp freed', '#d8f3ff'); }
      L.life = 0; continue;
    }
    const e = leashEnd(L), n = L.pts.length - 1;
    // a monster on the leash cannot stray farther than the chain allows
    if (L.kind === 'mon') {
      const m = L.ref, d = dist(m, P), max = WS.leashLen();
      if (d > max) moveCircle(m, (P.x - m.x) / d * (d - max), (P.y - m.y) / d * (d - max));
      m.slow = Math.max(m.slow || 0, 0.25);
    }
    // verlet rope: slack chain with gravity and a restless sway
    const len = Math.max(dist(P, e), 0.5) * 1.12 / n, sway = 0.6 + 0.4 * Math.sin(G.time * 1.7);
    for (let i = 1; i < n; i++) {
      const p = L.pts[i], vx = (p.x - p.px) * 0.96, vy = (p.y - p.py) * 0.96, vz = (p.z - p.pz) * 0.96;
      p.px = p.x; p.py = p.y; p.pz = p.z;
      const wob = Math.sin(G.time * 5 + i * 0.9) * 0.012 * sway;
      p.x += vx + wob; p.y += vy - wob; p.z += vz - 14 * dt * dt * 60 * 0.004;
      if (p.z < 0.5) p.z = 0.5;
    }
    L.pts[0].x = P.x; L.pts[0].y = P.y; L.pts[0].z = 9;
    L.pts[n].x = e.x; L.pts[n].y = e.y; L.pts[n].z = e.z;
    for (let it = 0; it < 4; it++) for (let i = 0; i < n; i++) {
      const a = L.pts[i], b = L.pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, dz = (b.z - a.z) / 12, d = Math.hypot(dx, dy, dz) || 1e-4, diff = (d - len) / d * 0.5;
      if (d <= len) continue;
      if (i > 0) { a.x += dx * diff; a.y += dy * diff; a.z += dz * 12 * diff; }
      if (i + 1 < n) { b.x -= dx * diff; b.y -= dy * diff; b.z -= dz * 12 * diff; }
    }
    // burn what the chain sweeps through
    L.tick -= dt;
    if (L.tick <= 0) {
      L.tick = 0.2; const dmg = WS.leashDps() * 0.2;
      for (const m of G.zone.monsters) {
        if (m.dead) continue;
        let touch = L.kind === 'mon' && m === L.ref;
        for (let i = 0; i < n && !touch; i++) { const a = L.pts[i], b = L.pts[i + 1]; if (a.z > 11 && b.z > 11) continue; if (segDist(m.x, m.y, a.x, a.y, b.x, b.y) < m.r + 0.2) touch = true; }
        if (!touch) continue;
        hurtMon(m, dmg * (m === L.ref ? 1.5 : 1), '#bfe8ff');
        if (P.skills.barbs > 0) m.slow = Math.max(m.slow || 0, 0.5);
        if (m === L.ref) { P.hp = Math.min(D.maxHp, P.hp + dmg * 0.15); P.lastHit = m; }
      }
      if (L.kind === 'golem') { const g = L.ref; g.hp = Math.min(g.max, g.hp + g.max * 0.012); g.leashed = 0.3; }
    }
    if (L.life <= 0 && L.kind === 'ground' && P.skills.snare > 0) {
      const R = 1.8, dmg = WS.leashDps() * 1.5;
      for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - L.ax, m.y - L.ay) < R) hurtMon(m, dmg, '#bfe8ff');
      parts.push({ ring: true, x: L.ax, y: L.ay, r: 0.2, max: R, t: 0.4, col: '#bfe8ff' });
    }
  }
  G.leashes = G.leashes.filter(L => L.life > 0);
}
function segDist(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1e-6; const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1); return Math.hypot(px - ax - dx * t, py - ay - dy * t); }

// =================================================================== Wisp Lantern (a totem that houses wisps)
function castTotem(pt) {
  if (!P.skills.totem || P.cast > 0 || P.roll > 0) return;
  const need = Math.min(WS.totemN(), P.wisps.length);
  if (need < 1) { say('No wisps to house', 1); return; }
  const a = pt || aimPoint(); if (G.zone.solidAt(a.x, a.y) || dist(a, P) > 9) { say('Cannot plant it there', 1); return; }
  if (!spendMana('totem')) return;
  endWraith();
  G.totems = [];
  const t = { x: a.x, y: a.y, r: 0.3, life: WS.totemLife(), wisps: [] };
  for (let i = 0; i < need; i++) { const w = takeWisp(); flyMote(w.x, w.y, w.z, t, '#ffe2a0'); t.wisps.push({ ang: i / need * 6.28, cd: 0.3 + i * 0.25, beam: null, x: t.x, y: t.y, z: 18, kind: 'beam' }); }
  G.totems.push(t);
  P.cast = 0.4 / D.castSpd; faceTo(a.x, a.y); sfx(500, 0.4, 'sine', 0.04, 200);
}
function updateTotems(dt) {
  for (const t of G.totems) {
    t.life -= dt;
    for (const w of t.wisps) {
      w.ang += dt * 1.6; w.x = t.x + Math.cos(w.ang) * 0.5; w.y = t.y + Math.sin(w.ang) * 0.5; w.z = 20 + Math.sin(G.time * 3 + w.ang) * 2;
      if (!w.beam) {
        w.cd -= dt; if (w.cd > 0) continue;
        const a = lanternAim(w, true);
        if (a) w.beam = { t: 0, dur: 0.8, tick: 0, target: a.target, metal: !!a.metal, ang: Math.atan2(a.target.y - w.y, a.target.x - w.x), segs: [] }; else w.cd = 0.3;
        continue;
      }
      const b = w.beam; b.t += dt; b.tick -= dt;
      if (b.target && !b.target.dead && !b.metal) b.ang = Math.atan2(b.target.y - w.y, b.target.x - w.x);
      const path = beamPath(w, b.ang, 'beam'); b.segs = path.segs;
      if (b.tick <= 0) { b.tick = 0.15; const dmg = WS.totemDps() * 0.15 * (1 - 0.6 * b.t / b.dur); for (const h of path.hits) hurtMon(h.m, dmg * h.mult, '#fff2c8'); }
      if (b.t >= b.dur) { w.beam = null; w.cd = 1.1; }
    }
    if (P.skills.beacon > 0 && t.life > 0) {
      if (dist(P, t) < 3) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.02 * dt);
      const g = G.golem; if (g && g.state !== 'dormant' && dist(g, t) < 3) g.hp = Math.min(g.max, g.hp + g.max * 0.02 * dt);
    }
    if (t.life <= 0) burst(t.x, t.y, '#ffe2a0', 16, 2);
  }
  G.totems = G.totems.filter(t => t.life > 0);
}

// =================================================================== Mark of Logos
function castMark(pt) {
  if (!P.skills.mark || P.cast > 0 || P.roll > 0) return;
  if (!spendMana('mark')) return;
  endWraith();
  const a = pt || aimPoint(), R = WS.markR(), life = WS.markLife(); let n = 0;
  for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - a.x, m.y - a.y) < R + m.r) { m.marked = life; aggro(m); n++; }
  G.marks.push({ x: a.x, y: a.y, R, t: 0.6 });
  P.cast = 0.4 / D.castSpd; faceTo(a.x, a.y); sfx(220, 0.5, 'sine', 0.04, -100);
  if (n) say(`${n} marked`, 0.8);
}

// =================================================================== Rebuke: a whip of white light
function rebukeAbsorb(a) {
  if (!P.skills.rebuke) return;
  P.rebukeAcc += a;
  if (P.rebukeAcc < WS.rebukeNeed()) return;
  P.rebukeAcc = 0;
  let tgt = null, bd = 5;
  for (const m of G.zone.monsters) { if (m.dead) continue; const d = dist(m, P); if (d < bd) { bd = d; tgt = m; } }
  const base = tgt ? Math.atan2(tgt.y - P.y, tgt.x - P.x) : Math.random() * 6.28;
  G.whips.push({ base, t: 0, dur: 0.32, hit: new Set(), dmg: WS.rebukeDmg(), len: 4.5 });
  sfx(900, 0.18, 'sawtooth', 0.04, -700);
}
function whipPts(w, k) {
  // a lash that sweeps from one side to the other, curling at the tip
  const sweep = w.base - 1.1 + 2.2 * k, out = [], n = 12;
  for (let i = 0; i <= n; i++) { const t = i / n, a = sweep - Math.sin(t * Math.PI) * 0.35 * (1 - k) + t * t * 0.5 * (k - 0.5); out.push({ x: P.x + Math.cos(a) * w.len * t, y: P.y + Math.sin(a) * w.len * t }); }
  return out;
}
function updateWhips(dt) {
  for (const w of G.whips) {
    w.t += dt; const k = Math.min(1, w.t / w.dur), pts = whipPts(w, k);
    for (const m of G.zone.monsters) {
      if (m.dead || w.hit.has(m)) continue;
      for (let i = 0; i < pts.length - 1; i++) if (segDist(m.x, m.y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) < m.r + 0.15) {
        w.hit.add(m); hurtMon(m, w.dmg, '#ffffff'); const d = dist(m, P) || 1;
        for (let j = 0; j < 5; j++) moveCircle(m, (m.x - P.x) / d * 0.22, (m.y - P.y) / d * 0.22);
        m.stun = Math.max(m.stun || 0, 0.3); break;
      }
    }
    w.pts = pts;
  }
  G.whips = G.whips.filter(w => w.t < w.dur + 0.12);
}
function updateMarks(dt) { for (const k of G.marks) k.t -= dt; G.marks = G.marks.filter(k => k.t > 0); }
