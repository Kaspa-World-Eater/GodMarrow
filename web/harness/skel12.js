// ------------------------------------------------------------------- skeletons: three squads, each with a count, a loadout and orders
const SLOADS = ['shield', 'greatsword', 'halberd', 'flail', 'bow'];
const SLOAD_NAMES = { shield: 'Sword and Shield', greatsword: 'Greatsword', halberd: 'Halberd', flail: 'Flail', bow: 'Bow' };
const SLOAD_DESC = {
  shield: 'Sturdy and slow to fall. Their blows draw the enemy onto them.',
  greatsword: 'Heavy two-handed sweeps that cut everything in front.',
  halberd: 'Long reach from behind the line. Knocks enemies back.',
  flail: 'Slow, crushing blows that stun.',
  bow: 'Shoot from range. Frail up close.'
};
const SL = {
  shield: { hp: 1.45, dmg: 0.7, reach: 0.85, cd: 0.8, dr: 0.25, taunt: 2.5 },
  greatsword: { hp: 1.0, dmg: 1.15, reach: 0.95, cd: 1.1, arc: 1.2 },
  halberd: { hp: 0.95, dmg: 1.0, reach: 1.55, cd: 1.0, knock: 0.35 },
  flail: { hp: 1.1, dmg: 1.2, reach: 1.0, cd: 1.3, stun: 0.5 },
  bow: { hp: 0.8, dmg: 0.8, reach: 5.5, cd: 1.25, ranged: true }
};
function defaultBeh(x, y) { return { x, y, focus: false, hold: false }; }
function defaultSquads() { return [{ load: 'shield', n: 2, beh: defaultBeh(1, 2) }, { load: 'greatsword', n: 2, beh: defaultBeh(2, 3) }, { load: 'halberd', n: 2, beh: defaultBeh(2, 3) }]; }
function loadOk(l) { return l !== 'bow' || P.skills.archers > 0; }
function squadOf(e) { return P.squads[e.sq] || P.squads[0]; }
function skelLoad(e) { return SL[e.load] || SL.shield; }
function newSkel(x, y, sq) {
  const S = P.squads[sq] || P.squads[0], load = loadOk(S.load) ? S.load : 'shield', hp = BS.skelHp() * SL[load].hp;
  return { isSkel: true, sq, load, x, y, r: 0.27, hp, max: hp, spd: 3.2, face: 1, cd: 0.4, state: 'idle', t: 0, hurt: 0, path: null, repath: 0, rise: 0.45, tgt: null, hold: null };
}
// which squad is short: squads fill in order I, II, III
function squadCount(i) { return G.skels.filter(e => e.sq === i).length; }
function nextSquad() { for (let i = 0; i < P.squads.length; i++) if (squadCount(i) < P.squads[i].n) return i; return -1; }
function wantTotal() { return Math.min(BS.skelMax(), P.squads.reduce((a, s) => a + s.n, 0)); }
function raiseSkel(x, y, silent, sq) {
  if (sq == null || sq < 0) { sq = nextSquad(); if (sq < 0) sq = 0; }
  const e = newSkel(x, y, sq);
  if (squadOf(e).beh.hold) e.hold = { x, y };
  G.skels.push(e);
  if (!silent) { burst(x, y, '#e8e2d0', 14, 2.2); burst(x, y, '#6f6a5c', 8, 1.5); }
  return e;
}
// a skeleton whose squad changed loadout re-arms itself where it stands
function rearm() { for (const e of G.skels) { const S = squadOf(e); const l = loadOk(S.load) ? S.load : 'shield'; if (e.load !== l) { const f = e.hp / e.max; e.load = l; e.max = BS.skelHp() * SL[l].hp; e.hp = e.max * f; burst(e.x, e.y, '#cfc6ae', 4, 1.2); } } }
function behOf(e) { return e && e.isColossus ? P.sbeh : e ? squadOf(e).beh : P.sbeh; }
function skelOrders(e) { const B = behOf(e); return { aggro: 3 + B.x * 1.6, guard: B.y <= 1, leash: 3 + B.x * 1.5 }; }
function minionAnchor(e) {
  if (G.cmd && G.cmd.pt) return G.cmd.pt;
  if (behOf(e).hold && e.hold) return e.hold;
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
  dmg *= (type === 'phys' ? 100 / 120 : 0.9) * (P.skills.shieldb > 0 ? 0.65 : 1) * (1 - (skelLoad(e).dr || 0));
  e.hp -= dmg; e.hurt = 0.1;
  if (e.hp <= 0) skelDies(e);
}
function skelDies(e, quiet) {
  const i = G.skels.indexOf(e); if (i < 0) return;
  G.skels.splice(i, 1); burst(e.x, e.y, '#e8e2d0', 14, 2.2); sfx(300, 0.12, 'square', 0.03, -200);
  if (!quiet && P.skills.bburst > 0) { for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28 + rand(0, 0.5); spawnMote(e.x, e.y, { rise: 0, out: 0.3, vx: Math.cos(a) * 8, vy: Math.sin(a) * 8, dmg: BS.burstDmg(), val: 0.5 }); } sfx(420, 0.15, 'square', 0.04, -250); }
  G.bspikes.push({ x: e.x, y: e.y, t: 0.9, pile: true });
}
function skelStrike(e, T) {
  const L = skelLoad(e), dm = BS.skelDmg(), dmg = rand(dm[0], dm[1]) * L.dmg;
  if (L.ranged) { const d = dist(e, T) || 1; G.barrows.push({ x: e.x, y: e.y, vx: (T.x - e.x) / d * 9, vy: (T.y - e.y) / d * 9, t: 1.2, dmg }); sfx(520, 0.05, 'triangle', 0.02, -200); return; }
  if (dist(e, T) > L.reach + T.r + 0.25) return;
  const fx = T.x - e.x, fy = T.y - e.y, fl = Math.hypot(fx, fy) || 1;
  const hit = m => {
    hurtMon(m, dmg, '#e8e2d0');
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
    e.hurt = Math.max(0, e.hurt - dt); e.t += dt; e.cd -= dt; e.swingT = Math.max(0, (e.swingT || 0) - dt);
    if (e.rise > 0) { e.rise -= dt; continue; }
    const L = skelLoad(e);
    e.max = BS.skelHp() * L.hp; e.hp = Math.min(e.max, e.hp + (dist(e, P) < 3 ? e.max * 0.02 * dt : 0));
    if (dist(e, P) > 18) { e.x = P.x + rand(-1, 1); e.y = P.y + rand(-1, 1); if (G.zone.solidAt(e.x, e.y)) { e.x = P.x; e.y = P.y; } e.path = null; }
    if (e.state === 'windup') {
      if (e.t > (L.ranged ? 0.45 : 0.3 + L.cd * 0.15)) { e.state = 'idle'; e.cd = L.cd; if (e.tgt && !e.tgt.dead) skelStrike(e, e.tgt); }
      continue;
    }
    const T = minionTarget(e), an = minionAnchor(e);
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
    for (const m of G.zone.monsters) if (!m.dead && Math.abs(m.x - s.x) < 1 && Math.hypot(m.x - s.x, m.y - s.y) < m.r + 0.12) { hurtMon(m, s.dmg, '#e8e2d0'); s.t = 0; break; }
  }
  G.barrows = G.barrows.filter(s => s.t > 0);
}

