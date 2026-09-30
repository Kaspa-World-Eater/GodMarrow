
// =================================================================== v0.17: right-click a corpse to raise it
// Whatever skill sits on the right button, right-clicking close to a fresh corpse turns it into a minion:
// the Ossurarch drags a skeleton up out of it, the Hemomancer splits it open into spawnlings.
const CORPSE_SKILLS = ['hatch', 'unearth', 'thrall', 'swallow', 'fgolem', 'nest'];
function corpseSummonKind() {
  if (P.cls === 'ossumancer' && P.skills.raise > 0) return 'skel';
  if (P.cls === 'hemomancer' && P.skills.hatch > 0) return 'ling';
  return null;
}
function corpseUnderCursor(R = 1.1) {
  const wm = worldMouse(), w = screenToWorld(wm.x, wm.y); let best = null, bd = R;
  for (const m of G.zone.monsters) {
    if (!m.dead || m.hatched || m.eaten || m.burst || m.erased || m.rank === 'boss' || G.time - (m.deadAt || 0) > CORPSE_LIFE) continue;
    const d = Math.hypot(m.x - w.x, m.y - w.y); if (d < bd) { bd = d; best = m; }
  }
  return best;
}
function corpseSummon() {
  const kind = corpseSummonKind(); if (!kind || CORPSE_SKILLS.includes(P.right)) return false;
  const c = corpseUnderCursor(); if (!c) return false;
  if (Math.hypot(c.x - P.x, c.y - P.y) > 12) { say('Too far away', 0.8); return true; }
  if (kind === 'skel') {
    if (liveSkels().length >= BS.skelMax()) { say(`Your army is full (${BS.skelMax()})`, 1.2); return true; }
    c.eaten = true; c.hatched = true;
    const e = raiseSkel(c.x, c.y); e.rise = 0.6;
    P.cast = 0.35 / D.castSpd; sfx(150, 0.3, 'square', 0.04, 110);
    return true;
  }
  if (kind === 'ling') { castHatch({ x: c.x, y: c.y }); return true; }
  return false;
}
// the corpse under the cursor shows it can be raised
function corpseHint() {
  // v0.22: raising follows your skill setup; the glow shows only while a corpse skill sits on a mouse button
  const kind = corpseSummonKind(); if (!kind || P.dead || kind === 'skel' || !(CORPSE_SKILLS.includes(P.left) || CORPSE_SKILLS.includes(P.right))) return;
  const c = corpseUnderCursor(); if (!c) return;
  const q = iso(c.x, c.y), t = G.time, rgb = kind === 'skel' ? '232,226,208' : '232,90,110';
  ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 2, 14, rgb, 0.25 + 0.1 * Math.sin(t * 6)); ctx.globalCompositeOperation = 'source-over';
  ctx.strokeStyle = `rgba(${rgb},${0.55 + 0.25 * Math.sin(t * 6)})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, 9, 4.5, 0, 0, 6.28); ctx.stroke();
  for (let i = 0; i < 4; i++) { const a = t * 1.5 + i * Math.PI / 2; ctx.fillStyle = `rgb(${rgb})`; ctx.fillRect(Math.round(q.sx + Math.cos(a) * 9), Math.round(q.sy + Math.sin(a) * 4.5), 1, 1); }
}

// =================================================================== v0.20: the wand's magic missile
// A wand in hand turns the plain attack into a bolt of pale force that flies to its mark from range, so you can
// back away and shoot. Damage is the wand's own, scaled by spell power.
const WAND_RANGE = 6.5;
function hasWand() { const w = P.eq && P.eq.weapon; return !!(w && BASES[w.base] && BASES[w.base].icon === 'wand'); }
if (!G.mmiss) G.mmiss = [];
function fireMissile(m, pt) {
  endWraith();
  const to = m || pt; if (!to) return;
  P.cast = 0.5 / D.castSpd; P.swing = 0.2; P.path = null; faceTo(to.x, to.y);
  const a = Math.atan2(to.y - P.y, to.x - P.x);
  G.mmiss.push({ x: P.x + Math.cos(a) * 0.4, y: P.y + Math.sin(a) * 0.4, z: 11, vx: Math.cos(a), vy: Math.sin(a), ref: m || null, t: 1.4, dmg: rand(D.wmin, D.wmax) * D.dmgMult * 1.15, spd: 11 });
  sfx(880, 0.08, 'sine', 0.03, -500); sfx(420, 0.1, 'triangle', 0.02, 200);
}
function updateMissiles(dt) {
  if (!G.mmiss || !G.mmiss.length) return;
  for (const s of G.mmiss) {
    s.t -= dt;
    if (s.ref && !s.ref.dead) { const dx = s.ref.x - s.x, dy = s.ref.y - s.y, d = Math.hypot(dx, dy) || 1; s.vx += (dx / d - s.vx) * Math.min(1, dt * 10); s.vy += (dy / d - s.vy) * Math.min(1, dt * 10); const l = Math.hypot(s.vx, s.vy) || 1; s.vx /= l; s.vy /= l; }
    const nx = s.x + s.vx * s.spd * dt, ny = s.y + s.vy * s.spd * dt;
    if (G.zone.solidAt(nx, ny) && TALL[G.zone.get(Math.floor(nx), Math.floor(ny))]) { s.t = 0; ember(s.x, s.y, s.z, '190,225,255', 5, 1, 0.35); continue; }
    s.x = nx; s.y = ny;
    for (const m of G.zone.monsters) {
      if (m.dead || Math.hypot(m.x - s.x, m.y - s.y) > m.r + 0.2) continue;
      hurtMon(m, s.dmg, '#bfe8ff'); P.lastHit = m; aggro(m);
      ember(s.x, s.y, s.z, '190,225,255', 7, 1.3, 0.4, 1.2); s.t = 0; break;
    }
  }
  G.mmiss = G.mmiss.filter(s => s.t > 0);
}
function drawMissiles(list) {
  if (!G.mmiss) return;
  for (const s of G.mmiss) list.push({ d: s.x + s.y + 0.2, f: () => {
    const q = iso(s.x, s.y), sx = q.sx, sy = q.sy - s.z;
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i <= 4; i++) { const b = iso(s.x - s.vx * i * 0.14, s.y - s.vy * i * 0.14); glow(b.sx, b.sy - s.z, 5 - i * 0.8, '150,200,255', 0.35 - i * 0.07); }
    glow(sx, sy, 8, '170,215,255', 0.55); glow(sx, sy, 3, '240,250,255', 0.9);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(sx) - 1, Math.round(sy) - 1, 2, 2);
  } });
}
