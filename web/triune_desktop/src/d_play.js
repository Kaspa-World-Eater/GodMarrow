
// =================================================================== extra sprites
Object.assign(PAL, { l: '#9aa3b0', m: '#5d6470', o: '#2c3038', c: '#8e2630' });
// the golem knight: hulking plate armor, crested helm, glowing visor and chest core (weapon and shield are drawn separately)
// the golem: an all-iron knight centaur (horse body, armored knight torso, crested helm, glowing visor and core)
// the golem: a hulking, monstrous iron knight (weapon and tower shield are drawn separately)
SPR.golem = sprite([
  '....KK..............KK....',
  '...KlK.....KKKK.....KlK...',
  '..KllK....KlllmK....KllK..',
  '.KKlmKK..KlKKKKmK..KKmlKK.',
  'KlllmmmKKlKBBBBKmKKmmmlllK',
  'KllmmmmmKmllllllmKmmmmmllK',
  'KlmmmmmmmKmmmmmmKmmmmmmmlK',
  '.KmmoKmmllmmmmmmllmmKommK.',
  '.KmooKlmmmmmBBmmmmmlKoomK.',
  '.KmooKlmmmmBBBBmmmmlKoomK.',
  '.KmooKlmmmmmBBmmmmmlKoomK.',
  '.KmoKKmlmmmmmmmmmmlmKKomK.',
  '.KlmK.KmmlmmmmmmlmmK.KmlK.',
  'KllmK.KommmmmmmmmmoK.KmllK',
  'KlllK.KKoooooooooKKK.KlllK',
  'KlmlK..KmmmKKmmmmK...KlmlK',
  '.KKK...KmmlK.KlmmK....KKK.',
  '.......KmmmK.KmmmK........',
  '......KommlK.KlmmoK.......',
  '......KmmmmK.KmmmmK.......',
  '.....KllllmK.KmllllK......',
  '.....KKKKKKK.KKKKKKK......'
]);
SPR.golemDormant = tint(SPR.golem, '#15141a', 0.55);
SPR.towerShield = sprite([
  '.KKKKKKKK.',
  'KmllllllmK',
  'KlmmBBmmlK',
  'KlmmBBmmlK',
  'KlBBBBBBlK',
  'KlBBBBBBlK',
  'KlmmBBmmlK',
  'KlmmBBmmlK',
  'KlmmBBmmlK',
  'KlmmmmmmlK',
  '.KlmmmmlK.',
  '..KlmmlK..',
  '...KllK...',
  '....KK....'
]);
SPR.anvil = tint(sprite(['KKKKKKKKKKKK..', 'KhhhhhhhhhhhKK', 'KiiiiiiiiiiiiK', '.KKKiiiiiiKKK.', '....KiiiiK....', '....KiiiiK....', '...KiiiiiiK...', '..KiiiiiiiiK..', '..KKKKKKKKKK..']), '#8b93a0', 0.3);

// =================================================================== camera & coords
const cam = { x: 0, y: 0 };
const iso = (x, y) => ({ sx: (x - y) * TW / 2 - cam.x, sy: (x + y) * TH / 2 - cam.y });
function screenToWorld(sx, sy) {
  const ax = (sx + cam.x) / (TW / 2), ay = (sy + cam.y) / (TH / 2);
  return { x: (ax + ay) / 2, y: (ay - ax) / 2 };
}
function camTarget() { return { x: (P.x - P.y) * TW / 2 - VW / 2, y: (P.x + P.y) * TH / 2 - VH / 2 + 12 }; }
function worldMouse() { return G._inWorld ? { x: mouse.x, y: mouse.y } : { x: mouse.x / ZK, y: mouse.y / ZK }; }
function snapCam() { const t = camTarget(); cam.x = t.x; cam.y = t.y; }

// =================================================================== input
const keys = new Set();
const mouse = { x: W / 2, y: H / 2, l: false, r: false, holdMove: false, moveT: 0 };
function aimPoint() { const m = worldMouse(); return screenToWorld(m.x, m.y + 4); }
addEventListener('keydown', e => {
  if (G.divine) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); divineAdvance(); } if (e.key === 'Escape') skipDivination(); return; }
  if (!G.running) return;
  const k = e.key.toLowerCase();
  if (['tab', ' ', 'alt'].includes(k) || e.key === 'Tab') e.preventDefault();
  if (k === 'shift') { keys.add('shift'); return; }
  if (keys.has(k)) return;
  keys.add(k);
  if (k === 'escape') { if (menuOpen()) closeMenu(); else if (anyPanelOpen()) closeAll(); else openMenu(); return; }
  if (G.paused) return;
  if (k === 'i') togglePanel('inv');
  if (k === 'c') togglePanel('char');
  if (k === 's') togglePanel('skills');
  if (k === 'a') G.panels.arcana = !G.panels.arcana;
  if (k === 'v' || k === 'g') { if (P.cls === 'hemomancer') G.panels.blood = !G.panels.blood; else if (P.cls === 'ossumancer') G.panels.army = !G.panels.army; else if (k === 'v') G.panels.choir = !G.panels.choir; else G.panels.gbeh = !G.panels.gbeh; }
  if (k === 'tab') G.map = !G.map;
  if (k === 'm') { muted = !muted; say(muted ? 'Sound off' : 'Sound on', 1); }
  if (P.dead) return;
  if (k === ' ') tryRoll();
  if (BINDABLE.includes(k)) {
    for (const kk in P.keys) if (!SK[P.keys[kk]] || !['cast', 'hold'].includes(SK[P.keys[kk]].kind)) delete P.keys[kk];
    const hs = G.hoverSkill;
    if (hs && hs !== 'attack' && P.skills[hs] > 0 && (SK[hs].kind === 'cast' || SK[hs].kind === 'hold')) {
      for (const kk in P.keys) if (P.keys[kk] === hs) delete P.keys[kk];
      P.keys[k] = hs; say(`${SK[hs].name} bound to ${k.toUpperCase()}`, 1.2); return;
    }
    if (P.keys[k]) { if (keys.has('shift')) setLeft(P.keys[k]); else setRight(P.keys[k]); }
  }
  if (['1', '2', '3', '4'].includes(k)) drinkBelt(+k - 1);
});
addEventListener('keyup', e => { const k = e.key.toLowerCase(); keys.delete(k); if (k === 'shift') keys.delete('shift'); });
function mpos(e) { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * W / r.width; mouse.y = (e.clientY - r.top) * H / r.height; }
cv.addEventListener('mousemove', mpos);
cv.addEventListener('mousedown', e => {
  mpos(e); cv.focus();
  if (G.divine) { if (e.button === 0) divineClick(); return; }
  if (!G.running || G.paused) return;
  if (e.button === 0) { mouse.l = true; onLeftDown(); }
  if (e.button === 2) { mouse.r = true; onRightDown(); }
});
addEventListener('mouseup', e => { if (e.button === 0) { mouse.l = false; mouse.holdMove = false; P.leftHeld = false; } if (e.button === 2) mouse.r = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('blur', () => { keys.clear(); mouse.l = mouse.r = false; mouse.holdMove = false; });

function setRight(id) {
  if (id === 'attack') { P.right = 'attack'; say('Right skill: Attack', 1); return; }
  if (!P.skills[id]) { say(`${SK[id].name} is not learned yet (press S)`, 1.6); return; }
  P.right = id; say(`Right skill: ${SK[id].name}`, 1);
}
function setLeft(id) {
  if (id !== 'attack' && !P.skills[id]) return;
  P.left = id; say(`Left skill: ${id === 'attack' ? 'Attack' : SK[id].name}`, 1);
}
function togglePanel(p) {
  const was = G.panels[p];
  if (p === 'char' || p === 'skills') { G.panels.char = G.panels.skills = G.panels.vendor = G.panels.lantern = false; }
  G.panels[p] = !was;
}
function closeAll() { for (const k in G.panels) G.panels[k] = false; G.map = false; G.pick = null; if (G.cursorItem) { if (!invAdd(G.cursorItem)) dropItem(G.cursorItem, P.x, P.y); G.cursorItem = null; } }

function onLeftDown() {
  if (uiClick(mouse.x, mouse.y, 0)) return;
  if (G.cursorItem) { dropItem(G.cursorItem, P.x, P.y); G.cursorItem = null; return; }
  if (P.dead) return;
  const h = G.hover;
  P.approach = null;
  const holdL = SK[P.left] && SK[P.left].kind === 'hold' && !(h && (h.kind === 'item' || h.kind === 'obj'));
  if (keys.has('shift') || (h && h.kind === 'mon') || holdL) P.leftHeld = P.left !== 'attack';
  if (P.leftHeld && SK[P.left] && SK[P.left].kind === 'hold') { castSkill(P.left, h && h.kind === 'mon' ? { x: h.ref.x, y: h.ref.y } : undefined); P.path = null; return; }
  if (keys.has('shift')) { P.target = { kind: 'leftAt' }; P.path = null; return; }
  if (h && h.kind === 'mon') { P.target = P.left === 'attack' ? { kind: 'mon', ref: h.ref } : { kind: 'castMon', ref: h.ref }; P.path = null; return; }
  if (h && h.kind === 'item') { P.target = { kind: 'item', ref: h.ref }; setPathTo(h.ref.x, h.ref.y); return; }
  if (h && h.kind === 'obj') { P.target = { kind: 'obj', ref: h.ref }; setPathTo(h.ref.x, h.ref.y + 0.6); return; }
  P.target = null; mouse.holdMove = true; mouse.moveT = 0;
  const p = aimPoint(); setPathTo(p.x, p.y);
}
function onRightDown() {
  if (uiClick(mouse.x, mouse.y, 2)) return;
  if (P.dead) return;
  castSkill(P.right);
}
// skills need line of sight: a target point behind a wall is pulled back to the wall
function losPoint(a) {
  if (!a || !G.zone) return a;
  const dx = a.x - P.x, dy = a.y - P.y, d = Math.hypot(dx, dy); if (d < 0.3) return a;
  const n = Math.ceil(d / 0.2); let lx = P.x, ly = P.y;
  for (let i = 1; i <= n; i++) { const x = P.x + dx * i / n, y = P.y + dy * i / n, t = G.zone.get(Math.floor(x), Math.floor(y)); if (TALL[t] && t !== T.ROCK) return { x: lx, y: ly, los: true }; lx = x; ly = y; }
  return a;
}
// v0.23: the basic attack as a skill on any button: strike (or loose a wand bolt) at the cursor; on a monster, walk to it and strike
function basicAttack(pt) {
  if (P.cast > 0 || P.swing > 0 || P.roll > 0) return;
  const h = G.hover;
  if (h && h.kind === 'mon' && !h.ref.dead && !(hasWand() && dist(h.ref, P) <= WAND_RANGE)) { const r = meleeReach ? meleeReach() : 1.2; if (dist(h.ref, P) > r + h.ref.r) { P.target = { kind: 'mon', ref: h.ref }; P.path = null; return; } }
  const a = pt || aimPoint(); faceTo(a.x, a.y);
  if (hasWand()) { const m = nearestMonTo(a, 1.2); fireMissile(m && !m.dead ? m : null, a); }
  else { const m = (h && h.kind === 'mon' && !h.ref.dead) ? h.ref : nearestMonTo({ x: P.x + clamp(a.x - P.x, -1, 1), y: P.y + clamp(a.y - P.y, -1, 1) }, 1.3); swing(m); }
}
function castSkill(id, pt) {
  if (id === 'attack') { basicAttack(pt); return; }
  pt = losPoint(pt || aimPoint());
  P.approach = null;
  if (id === 'wraith') toggleWraith();
  else if (id === 'anvil') castAnvil(pt);
  else if (id === 'cull') castCull(pt);
  else if (id === 'word') castWord(pt);
  else if (id === 'chain') castChain(pt);
  else if (id === 'swarm') castSwarm(pt);
  else if (id === 'golem') castGolem(pt);
  else if (id === 'overcharge') { if (!G.golem) say('Summon your golem first', 1); else startInfuse(); }
  else if (id === 'pillars') castPillars(pt);
  else if (id === 'cage') castCage(pt);
  else if (id === 'fissure') castFissure(pt);
  else if (id === 'orb') castOrb(pt);
  else if (id === 'storm') castStorm(pt);
  else if (id === 'leash') castLeash(pt);
  else if (id === 'totem') castTotem(pt);
  else if (id === 'mark') castMark(pt);
  else { boneCast(id, pt); bloodCast(id, pt); miasCast(id, pt); }
}
function setPathTo(tx, ty) {
  const z = G.zone;
  if (lineWalk(z, P.x, P.y, tx, ty, 0.22)) { P.path = [{ x: tx, y: ty }]; return; }
  const p = findPath(z, P.x, P.y, tx, ty, 6000);
  P.path = p && p.length ? p : null;
}

// =================================================================== player actions
function useStam(n) { P.stam = Math.max(0, P.stam - n); P.stamDelay = 0.6; }
function endWraith() { if (P.wraith) { P.wraith = false; burst(P.x, P.y, '#d8f3ff', 10, 2); onWraithEnd(); } }
function tryRoll() {
  if (P.roll > 0 || P.cast > 0) return;
  if (P.stam < POISE.rollMin) { say('Your poise is spent', 1); return; }
  endWraith(); useStam(POISE.rollCost); P.stamDelay = POISE.delay;
  const a = aimPoint(); const dx = a.x - P.x, dy = a.y - P.y, l = Math.hypot(dx, dy) || 1;
  P.rollDir = { x: dx / l, y: dy / l }; P.roll = 0.34; P.iframe = 0.3; P.infuse = false; P.path = null; P.target = null; P.approach = null; onRoll();
  sfx(180, 0.12, 'triangle', 0.05, -80);
}
function toggleWraith() {
  if (!P.skills.wraith) return;
  if (P.wraith) { endWraith(); return; }
  if (!spendMana('wraith')) return;
  P.wraith = true; P.infuse = false;
  burst(P.x, P.y, '#d8f3ff', 14, 2.5); sfx(520, 0.25, 'sine', 0.05, -300);
}
function faceTo(x, y) { if (Math.hypot(x - P.x, y - P.y) > 0.02) dir8(P, x - P.x, y - P.y, !!(P.path && P.path.length && P.cast <= 0 && P.swing <= 0)); }   // v0.24: one of eight facings (dir8, u_hero17.js); walking keeps its octant near an edge
function meleeReach() { return 1.5 +   // v0.24: a little more reach, so you needn't stand in their faces
  0 + (isBone() ? BS.hostReach() : 0) + (P.cls === 'miasmancer' ? miasReach() : 0); }
function swing(m) {
  endWraith();
  if (m && miasThrows()) { miasThrowSwing(m); return; }
  P.cast = 0.55 / D.castSpd; P.swing = 0.22; P.path = null;
  if (m) faceTo(m.x, m.y);
  if (m && !m.dead && dist(m, P) <= meleeReach() + m.r) {
    const dmg0 = rand(D.wmin, D.wmax) * D.meleeMult; hurtMon(m, dmg0, '#e8e2d0'); P.lastHit = m;
    // v0.24: the swing carries: a third of the blow to anything else close beside the one you struck
    for (const o of G.zone.monsters) { if (o === m || o.dead || o.hidden || o.fly) continue; if (Math.hypot(o.x - m.x, o.y - m.y) < 1.1 + o.r && dist(o, P) < meleeReach() + 0.8 + o.r) hurtMon(o, dmg0 * 0.33, '#bdb6a2'); }
    boneSwing(m); bloodSwing(m, (D.wmin + D.wmax) / 2 * D.meleeMult); arcSwing(m);
    burst((m.x + P.x) / 2, (m.y + P.y) / 2, '#cfc6ae', 3, 1);
    sfx(200, 0.06, 'square', 0.035, -80);
  } else sfx(320, 0.05, 'triangle', 0.02, -150);
}
function allWisps() { return P.wisps.length; }
function countKinds() { const c = { rev: 0, beam: 0, prism: 0 }; for (const w of P.wisps) c[w.kind]++; return c; }
function wispTargets() {
  const cap = effCap(), K = P.skills;
  const beam = K.beam > 0 ? Math.min(P.alloc.beam, cap) : 0;
  const prism = K.prism > 0 ? Math.min(P.alloc.prism, cap - beam) : 0;
  return { rev: cap - beam - prism, beam, prism };
}
// take one wisp to spend: from whichever kind you have the most of
function takeWisp() {
  if (!P.wisps.length) return null;
  const c = countKinds(); let kind = 'rev';
  for (const k of ['beam', 'prism']) if (c[k] > c[kind]) kind = k;
  for (let i = P.wisps.length - 1; i >= 0; i--) if (P.wisps[i].kind === kind) return P.wisps.splice(i, 1)[0];
  return P.wisps.pop();
}
function flyMote(x0, y0, z0, to, col) { parts.push({ fly: true, x: x0, y: y0, z: z0, x0, y0, z0, to, k: 0, t: 0.35, col }); }
function castSwarm(pt) {
  if (P.roll > 0 || P.cast > 0 || !P.skills.swarm) return;
  endWraith();
  if (aR('a_sage')) { castDrainTether(pt); return; }
  if (allWisps() <= 0) { say('Your wisps are spent', 1); sfx(90, 0.15, 'sawtooth', 0.03); return; }
  if (!spendMana('swarm')) return;
  useStam(4);
  let spend = Math.min(3, allWisps());
  for (let i = 0; i < spend; i++) { const w = takeWisp(); if (w) burst(w.x, w.y, '#d8f3ff', 4, 1.5); }
  const count = 1 + spend * (WS.soulsPerWisp() - 1) + Math.floor(allWisps() / 2);
  const a = pt || aimPoint(), base = Math.atan2(a.y - P.y, a.x - P.x), dmg = WS.soulDmg();
  for (let i = 0; i < count; i++) {
    const ang = base + (Math.random() - 0.5) * 1.6;
    newSoul(P.x, P.y, ang, 6, dmg);
  }
  P.cast = 0.34 / D.castSpd; P.path = null; faceTo(a.x, a.y);
  floatText(P.x, P.y, `-${spend} wisp${spend > 1 ? 's' : ''} · ${count} souls`, '#d8f3ff');
  sfx(700, 0.1, 'square', 0.035, 500); sfx(300, 0.18, 'triangle', 0.04, -150);
}

// =================================================================== wisp costs & mana
// wisps spent on the great wisp, the golem's charge and echoes stay spent: they hold slots out of your choir
function reservedWisps() {
  let n = 0;
  if (G.great) n += G.great.size;
  const g = G.golem; if (g && g.infused > 0) n += g.infused;
  for (const t of G.totems) n += t.wisps.length;
  return n;
}
function effCap() { return Math.max(0, D.wispCap - reservedWisps()); }
function spendMana(id, amt) {
  const need = amt != null ? amt : skillCost(id);
  const lc = arcLifeCost(need); if (lc !== null) return lc;
  if (!bellCheck(amt)) return false;
  if (isBlood()) return bloodSpend(id, need);
  if (P.mana < need) { say(P.cls === 'hemomancer' ? 'Not enough Vitae' : P.cls === 'miasmancer' ? 'Not enough Miasma' : P.cls === 'ossumancer' ? 'Not enough Marrow' : 'Not enough Essence', 1.1); sfx(90, 0.12, 'sawtooth', 0.03); return false; }
  P.mana -= need; arcOnSpend(id, amt); return true;
}

// =================================================================== golem knight
function newGolem(x, y) {
  const st = WS.golem();
  return { x, y, r: 0.62, hp: st.max, max: st.max, state: 'active', rt: 0, rtMax: 1, cd: 0, cc: 2, face: 1, hurt: 0, t: 0, hitSet: null, aim: { x: 1, y: 0 }, shield: true, tossCd: 1, atk: null, charge: 0, infused: 0, idleT: 0, ramp: 0, auraT: 0, hold: null };
}
function castGolem(pt) {
  if (!P.skills.golem || P.cast > 0 || P.roll > 0) return;
  if (aR('a_anvil')) { shellCast(); return; }
  if (G.golem) { const a0 = pt || aimPoint(); if (Math.hypot(G.golem.x - a0.x, G.golem.y - a0.y) < 1.3) { burst(G.golem.x, G.golem.y, '#aab4c2', 24, 2.4); { const g0 = G.golem; G.golemMem = { frac: g0.hp / Math.max(1, g0.max), dormant: g0.state === 'dormant', rt: g0.rt || 0, rtMax: g0.rtMax || 0, downT: g0.downT || 0, boost: g0.boost || 0, at: G.time }; } G.golem = null; G.flyShield = null; P.infuse = false; say('Golem banished: cast it again to summon it', 1.6); P.cast = 0.3; sfx(90, 0.4, 'square', 0.04, -60); return; } commandGolem(pt); return; }
  if (!spendMana('golem')) return;
  endWraith();
  const a = pt || aimPoint(); let tx = a.x, ty = a.y;
  const d = Math.hypot(tx - P.x, ty - P.y); if (d > 6) { tx = P.x + (tx - P.x) / d * 6; ty = P.y + (ty - P.y) / d * 6; }
  const nw = nearestWalk(G.zone, Math.floor(tx), Math.floor(ty)) || [Math.floor(P.x), Math.floor(P.y)];
  if (!G.golem) {
    G.golem = newGolem(nw[0] + .5, nw[1] + .5);
    // v0.23: banishing and recalling the golem gives back the same golem, not a fresh one: its wounds stay, and a
    // dormant golem is still dormant for whatever was left of its sleep
    const M = G.golemMem; G.golemMem = null;
    if (M) {
      const el = G.time - M.at, g = G.golem;
      g.hp = Math.max(1, Math.min(g.max, g.max * (M.frac + 0.01 * el)));
      if (M.dormant) { const left = Math.max(0, M.rt - el), dl = M.downT + el; if (left > 0 || dl < GOLEM_MIN_DOWN) { golemDown(g, Math.max(left, 0.1), 'Your golem is still dormant'); g.rt = Math.max(left, 0.1); g.rtMax = M.rtMax || g.rt; g.downT = dl; g.boost = M.boost; g.hp = 0; } }
    }
  }
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
  for (const a of G.anvils) if (a.fall <= 0) out.push(a);
  return out;
}
function golemDown(g, rt, msg) {
  g.state = 'dormant'; g.rt = g.rtMax = rt; g.downT = 0; g.boost = 0; g.atk = null; g.path = null; g.ramp = 0;
  burst(g.x, g.y, '#6f6a79', 20, 2); if (msg) say(msg, 1.6); sfx(80, 0.6, 'square', 0.05, -30);
}
const GOLEM_MIN_DOWN = 10;
function golemBoostCap() { return 1 + Math.min(0.5, 0.025 * (P.skills.overcharge || 0)); }
function golemRise(g) {
  g.state = 'active'; g.hp = g.max;
  if (aM('i_rally')) { P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.15); floatText(P.x, P.y, 'rally', '#9fe0a0'); }
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
  const R = WS.detR(), dmg = WS.detDmg() * WS.detK();
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
  const back = g.infused || 0;
  g.charge = 0; g.infused = 0;
  if (P.skills.wispreturn > 0) for (let i = 0; i < back; i++) spawnWisp();
  golemDown(g, 3);
}
function hurtGolem(dmg, type, src) {
  const g = G.golem; if (!g || g.state === 'dormant') return;
  const st = WS.golem(), armor = st.armor * (g.shield ? 1 : 0.6);
  dmg *= type === 'phys' ? 100 / (100 + armor) : 0.8;
  if (g.ramp > 0) dmg *= 0.6;
  if (g.defyT > 0) dmg *= 0.7;
  g.hp -= dmg; g.hurt = 0.1; crownSave(g);
  if (P.skills.thorns > 0 && src && !src.dead && type === 'phys') { hurtMon(src, dmg * WS.thornsPct() / 100 + 2 * P.skills.thorns, '#cfd6e0'); burst(src.x, src.y, '#cfd6e0', 3, 1); if (P.skills.barbiron > 0 && src.rank !== 'boss') src.stun = Math.max(src.stun || 0, 0.3); }
  if (WS.flowRate() > 0 && g.hp > 0) addCharge(g, dmg / g.max * WS.flowRate());
  if (g.hp <= 0) { g.hp = 0; golemDown(g, WS.golem().recharge, 'Your golem falls dormant'); }
}
function golemStrike(g, tgt) { G.noProc = true; G.hitSrc = g; try { golemStrike0(g, tgt); } finally { G.noProc = false; G.hitSrc = null; } }
function golemStrike0(g, tgt) {
  const st = WS.golem(), w = WS.weapon(), rm = g.ramp > 0 ? WS.rampMult() : 1 + 0.04 * g.charge;
  const base = () => rand(st.dmg[0], st.dmg[1]) * w.mult * rm;
  if (w.id === 'sword') {
    if (tgt.dead || dist(tgt, g) > w.reach + tgt.r + 0.3) return;
    hurtMon(tgt, base(), '#cfd6e0');
    if (Math.random() < w.twice && !tgt.dead) { hurtMon(tgt, base(), '#cfd6e0'); floatText(g.x, g.y, 'twice', '#aab4c2'); }
    burst(tgt.x, tgt.y, '#cfd6e0', 4, 1.2); sfx(240, 0.06, 'square', 0.035, -120); onGolemStrike(g, tgt);
  } else if (w.id === 'axe') {
    let n = 0;
    for (const m of G.zone.monsters) {
      if (m.dead) continue; const dx = m.x - g.x, dy = m.y - g.y, d = Math.hypot(dx, dy);
      if (d > w.reach + m.r + 0.3) continue;
      const da = Math.acos(clamp((dx * g.aim.x + dy * g.aim.y) / (d || 1), -1, 1));
      if (da > w.arc && d > 0.4) continue;
      hurtMon(m, base(), '#cfd6e0'); burst(m.x, m.y, '#cfd6e0', 3, 1); n++;
    }
    sfx(n ? 170 : 300, 0.09, 'square', 0.04, -80); onGolemStrike(g, tgt);
  } else {
    const reach = Math.min(dist(tgt, g), w.reach + 0.2), px = g.x + g.aim.x * reach, py = g.y + g.aim.y * reach;
    for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - px, m.y - py) < w.aoe + m.r) { hurtMon(m, base(), '#cfd6e0'); m.stun = Math.max(m.stun || 0, w.stun); }
    parts.push({ ring: true, x: px, y: py, r: 0.2, max: w.aoe, t: 0.3, col: '#cfd6e0' }); burst(px, py, '#cfc6ae', 10, 2);
    G.shake = Math.max(G.shake, 2.5); sfx(90, 0.2, 'square', 0.05, -40); onGolemStrike(g, tgt);
  }
}
// Secret-of-Mana-style orders: x = how far it ranges (0 close .. 4 roam), y = how it fights (0 guard .. 4 attack)
function golemOrders() {
  const B = P.gbeh;
  return { leash: 1.8 + B.x * 1.7, aggro: 2.5 + B.y * 1.5 + B.x * 0.6, guard: B.y <= 1 };
}
function golemPick(g) {
  const B = P.gbeh, O = golemOrders(), anchor = g.order && dist(g, g.order) < 0.6 ? g.order : B.hold && g.hold ? g.hold : P;
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
  G.flyShield = { x: g.x, y: g.y, r: 0.42, dir: { x: (tgt.x - g.x) / d, y: (tgt.y - g.y) / d }, dist: 0, R: Math.min(7, d + 1) * (aM('i_shield') ? 1.5 : 1), state: 'out', t: 0, hit: new Set(), rico: WS.ricochet(), spin: 0 };
  sfx(260, 0.2, 'triangle', 0.04, 200);
}
function shieldHits(s) {
  const g = G.golem, st = WS.golem();
  for (const m of G.zone.monsters) {
    if (m.dead || s.hit.has(m) || Math.hypot(m.x - s.x, m.y - s.y) > s.r + m.r) continue;
    s.hit.add(m);
    const tdm = rand(st.dmg[0], st.dmg[1]) * WS.tossDmg() * (g && g.ramp > 0 ? WS.rampMult() : 1); hurtMon(m, tdm, '#cfd6e0'); onShieldHit(m, tdm);
    m.stun = Math.max(m.stun || 0, P.skills.tossstun > 0 ? 1 : 0.4); burst(m.x, m.y, '#cfd6e0', 4, 1.5); sfx(500, 0.05, 'square', 0.03, -200);
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
  // v0.22: wisps only quicken the recharge (at most about double speed, a little more with Overcharge ranks),
  // and a fallen golem always stays down at least 10 seconds
  if (g.state === 'dormant') { g.downT = (g.downT || 0) + dt; g.boost = Math.max(0, (g.boost || 0) - 0.06 * dt); g.rt -= dt * (1 + g.boost); if (g.rt <= 0 && g.downT >= GOLEM_MIN_DOWN) golemRise(g); return; }
  // a partial charge left alone bleeds its wisps back, one at a time, so none are ever stuck inside
  if (g.ramp <= 0 && g.charge > 0 && !P.infuse) { g.idleT = (g.idleT || 0) + dt; if (g.idleT > 12) { g.idleT = 11; g.charge = Math.max(0, g.charge - 1); if (g.infused > 0) { g.infused--; flyMote(g.x, g.y, 14, P, '#d8f3ff'); } } }
  // rampage: white fire aura, faster and stronger, then the burst
  if (g.ramp > 0) {
    g.ramp -= dt; g.auraT -= dt;
    if (g.auraT <= 0) {
      g.auraT = 0.25; const R = WS.auraR(), dmg = WS.auraDps() * 0.25;
      for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - g.x, m.y - g.y) < R + m.r) hurtMon(m, dmg, '#ffffff');
    }
    g.beamT = (g.beamT || 0) - dt;
    if (!g.phos && g.beamT <= 0) { g.phos = startPhos(g); g.beamT = g.phos ? (P.skills.ghostfire > 0 ? 2.2 : 3.5) : 0.3; }
    if (g.ramp <= 0) { g.phos = null; golemBurst(g); return; }
    if (g.phos) { g.atk = null; g.path = null; if (g.state === 'charge' || g.state === 'chargeWind') g.state = 'active'; if (phosTick(g, g.phos, dt)) g.phos = null; return; }
  }
  g.cd -= dt; g.cc -= dt; if (g.defyT > 0) g.defyT -= dt;
  const spd = st.spd * (g.ramp > 0 ? 1.4 : 1 + 0.03 * g.charge) * (g.leashed > 0 ? (aM('w_tether') ? 1.5 : 1.25) : 1) * (aM('i_stride') ? 1.25 : 1);
  if (g.leashed > 0) g.leashed -= dt;
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
  updateChallenge(g, dt);
  if (g.order) {
    const o = g.order, d = dist(g, o);
    if (d > 0.5) { monMove(g, o.x, o.y, spd * 1.25, dt); if (Math.abs((o.x - o.y) - (g.x - g.y)) > 0.05) g.face = (o.x - o.y) > (g.x - g.y) ? 1 : -1; return; }
    o.t -= dt; if (o.t <= 0) g.order = null;
  }
  if (dist(g, P) > 16) { g.x = P.x + 1; g.y = P.y; if (G.zone.solidAt(g.x, g.y)) { g.x = P.x; g.y = P.y; } g.path = null; }
  const tgt = golemPick(g);
  if (tgt) {
    const d = dist(tgt, g), w = WS.weapon();
    g.aim = { x: (tgt.x - g.x) / (d || 1), y: (tgt.y - g.y) / (d || 1) };
    if (Math.abs((tgt.x - tgt.y) - (g.x - g.y)) > 0.05) g.face = (tgt.x - tgt.y) > (g.x - g.y) ? 1 : -1;
    if (B.toss && P.skills.toss > 0 && g.shield && d > 2.4 && d < 7 && g.tossCd <= 0 && lineClear(G.zone, g, tgt)) { tossShield(g, tgt); g.cd = 0.5; return; }
    if (B.charge && g.shield && d > 2.5 && d < 5.5 && g.cc <= 0 && lineClear(G.zone, g, tgt)) { g.state = 'chargeWind'; g.t = 0; sfx(100, 0.3, 'sawtooth', 0.04, 80); return; }
    if (d > w.reach + tgt.r - 0.05) monMove(g, tgt.x, tgt.y, spd, dt);
    else if (g.cd <= 0) { const dur = w.dur / (g.ramp > 0 ? 1.35 : 1) / (g.leashed > 0 ? 1.25 : 1); g.atk = { t: 0, dur, target: tgt, done: false }; g.cd = dur; }
  } else if (g.order) {
    // wait at the ordered spot
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
  if (g.state === 'dormant') { g.boost = Math.min(golemBoostCap(), (g.boost || 0) + 0.12 + 0.004 * P.skills.wisps); floatText(g.x, g.y, 'quickening', '#d8f3ff'); }
  else {
    g.infused++;
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
  if (maidenCast(a)) return;
  for (let i = 0; i < n; i++) { const ang = i / n * Math.PI * 2; raisePillar(a.x + Math.cos(ang) * 1.8, a.y + Math.sin(ang) * 1.8, WS.cageLife(), WS.cageDmg()); }
  (G.cages = G.cages || []).push({ x: a.x, y: a.y, t: WS.cageLife(), tick: 1 });
  P.cast = 0.5 / D.castSpd; faceTo(a.x, a.y); sfx(60, 0.4, 'square', 0.05, 40);
}
function castFissure(pt) {
  if (!P.skills.fissure || P.cast > 0 || P.roll > 0) return;
  if (!spendMana('fissure')) return;
  endWraith();
  const a = pt || aimPoint(), d = Math.hypot(a.x - P.x, a.y - P.y) || 1, dx = (a.x - P.x) / d, dy = (a.y - P.y) / d;
  const L = WS.fissureLen(), n = Math.round(L / 0.6), keep = WS.fissureKeep() + (aM('i_spikes') ? 1 : 0);
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
          hurtMon(m, p.dmg, '#cfd6e0'); m.stun = Math.max(m.stun || 0, aM('i_quake') ? 1 : 0.5);
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
        for (const m of G.zone.monsters) if (!m.dead && !f.hit.has(m) && Math.hypot(m.x - x, m.y - y) < 0.7 + m.r) { f.hit.add(m); hurtMon(m, WS.fissureDmg(), '#cfd6e0'); m.stun = Math.max(m.stun || 0, P.skills.fdeep > 0 ? 0.8 : 0.4); }
        if (P.skills.fshrap > 0) for (const sg of [1, -1]) arcShard(x, y, -f.dy * 9 * sg, f.dx * 9 * sg, WS.fissureDmg() * 0.3, '#cfd6e0');
        if (f.i > f.n - f.keep) raisePillar(x + f.dy * 0.01, y, WS.pillarLife() * 0.7, 0);
        if (f.i % 2) sfx(90 + f.i * 6, 0.06, 'square', 0.03, -30);
      }
    }
    G.fissures = G.fissures.filter(f => f.i < f.n);
  }
}
function pushOut(o) {
  const obs = G.pillars.filter(p => p.rise <= 0).concat(G.anvils.filter(a => a.fall <= 0));
  if (G.golem && G.golem.state === 'dormant' && o !== G.golem) obs.push(G.golem);
  for (const b of obs) {
    const d = Math.hypot(o.x - b.x, o.y - b.y), mm = o.r + b.r;
    if (d < mm) { const nx = d > 1e-3 ? (o.x - b.x) / d : 1, ny = d > 1e-3 ? (o.y - b.y) / d : 0; moveCircle(o, nx * (mm - d), ny * (mm - d)); }
  }
}

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
// v0.24: Spirit Lance is now a pulse: a quick beam of soul-light that leaps from enemy to enemy and fades out
// along its path. Mirrors (the golem's polished iron, its shield, pillars and anvils) catch it: a bounce off one
// costs no strength and buys two more leaps. Holding the button pulses again and again.
if (!G.pulses) G.pulses = [];
function lancePulse() {
  const a = aimPoint(), R0 = WS.lanceRange(), jumps0 = WS.lancePierce() + 1, base = WS.lanceDps() * 0.42;
  faceTo(a.x, a.y);
  // the first target: whoever is nearest the cursor, in reach and in sight
  let first = null, bd = 2.2;
  for (const m of G.zone.monsters) { if (m.dead || m.hidden) continue; const dc = Math.hypot(m.x - a.x, m.y - a.y), dp = dist(m, P); if (dp > R0 + m.r || dc > bd || !lineClear(G.zone, P, m)) continue; bd = dc; first = m; }
  const pts = [[P.x, P.y, 12]], hit = new Set(), used = new Set(); let cur = null, mult = 1, left = jumps0, dealt = 0;
  if (!first) {   // nothing there: the pulse flies to the cursor and gutters out (or finds a mirror on the way)
    const d = Math.min(R0, Math.hypot(a.x - P.x, a.y - P.y)) || 1, ang = Math.atan2(a.y - P.y, a.x - P.x);
    pts.push([P.x + Math.cos(ang) * d, P.y + Math.sin(ang) * d, 9]);
  }
  cur = first;
  while (cur && left > 0) {
    hurtMon(cur, base * mult, '#e8f6ff'); dealt += base * mult; P.lastHit = cur; hit.add(cur); left--;
    pts.push([cur.x, cur.y, 10]); burst(cur.x, cur.y, '#d8f3ff', 4, 1.2);
    // a mirror close by catches the light and throws it on, whole again
    let mir = null; for (const o of metals()) { if (used.has(o) || o.state === 'dormant') continue; if (Math.hypot(o.x - cur.x, o.y - cur.y) < 3.2 && lineClear(G.zone, cur, o)) { mir = o; break; } }
    if (mir) { used.add(mir); pts.push([mir.x, mir.y, 14]); mult = 1; left += 2; burst(mir.x, mir.y, '#ffffff', 6, 1.6); }
    const from = mir || cur; let nx = null, nd = 4.2;
    for (const m of G.zone.monsters) { if (m.dead || m.hidden || hit.has(m)) continue; const d = Math.hypot(m.x - from.x, m.y - from.y); if (d < nd && lineClear(G.zone, from, m)) { nd = d; nx = m; } }
    if (!mir) mult *= 0.82;
    cur = nx;
  }
  // prism: every mirror bounce throws a few thin rays at others nearby
  if (P.skills.prismL > 0) for (const o of used) { const near = G.zone.monsters.filter(m => !m.dead && !hit.has(m) && Math.hypot(m.x - o.x, m.y - o.y) < 4.5).slice(0, WS.prismLN()); for (const m of near) { hurtMon(m, base * WS.prismLPct(), '#e6f4ff'); hit.add(m); G.pulses.push({ pts: [[o.x, o.y, 14], [m.x, m.y, 10]], t: 0.3, max: 0.3, thin: true }); } }
  const sp = WS.siphon() + lanceSiphon(); if (sp && dealt) { P.hp = Math.min(D.maxHp, P.hp + dealt * sp); P.mana = Math.min(D.maxMana, P.mana + dealt * sp); }
  G.pulses.push({ pts, t: 0.38, max: 0.38 });
  if (hit.size) G.shake = Math.max(G.shake, 0.5);
  sfx(900 + Math.random() * 200, 0.12, 'sine', 0.03, 600);
}
function updateLance(dt) {
  for (const p of G.pulses) p.t -= dt; G.pulses = G.pulses.filter(p => p.t > 0);
  if (aR('a_blade')) { updateSpiritSword(dt); return; }
  P.lance = null;
  const want = heldSkill('lance') && P.skills.lance > 0 && P.roll <= 0 && !P.infuse;
  P.lancing = false;
  if (!want) { P.lanceTick = 0; return; }
  P.lanceTick = (P.lanceTick || 0) - dt;
  if (P.lanceTick > 0 || P.cast > 0) return;
  if (!spendMana('lance')) return;
  endWraith(); P.path = null; P.target = null;
  P.lanceTick = 0.42 / D.castSpd; P.cast = 0.22 / D.castSpd;
  lancePulse();
}
function updateLanceOld(dt) {
  if (aR('a_blade')) { updateSpiritSword(dt); return; }
  const want = heldSkill('lance') && P.skills.lance > 0 && P.roll <= 0 && P.cast <= 0 && !P.infuse;
  if (!want || P.mana < 1) { if (P.lancing && P.mana < 1) say('Not enough Essence', 0.8); P.lancing = false; P.lance = null; P.lanceT = 0; return; }
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
    for (const h of path.hits) { hurtMon(h.m, base * h.mult, '#ffffff'); dealt += base * h.mult; P.lastHit = h.m; if (h.m.rank !== 'boss') { const d = dist(h.m, P) || 1; moveCircle(h.m, (h.m.x - P.x) / d * 0.05, (h.m.y - P.y) / d * 0.05); } burst(h.m.x, h.m.y, '#ffffff', 2, 1.5); }
    if (path.hits.length) G.shake = Math.max(G.shake, 0.8);
    if (P.skills.prismL > 0) for (const b of path.bounces) {
      const near = G.zone.monsters.filter(o => !o.dead && !hitSet.has(o) && Math.hypot(o.x - b.x, o.y - b.y) < 4.5 && lineClear(G.zone, b, o)).sort((p, q) => Math.hypot(p.x - b.x, p.y - b.y) - Math.hypot(q.x - b.x, q.y - b.y)).slice(0, WS.prismLN());
      for (const o of near) { hurtMon(o, base * b.mult * WS.prismLPct(), '#e6f4ff'); hitSet.add(o); path.refr.push([b.x, b.y, o.x, o.y]); dealt += base * b.mult * WS.prismLPct(); }
    }
    lanceArc(path, base);
    const sp = WS.siphon() + lanceSiphon(); if (sp && dealt) { P.hp = Math.min(D.maxHp, P.hp + dealt * sp); P.mana = Math.min(D.maxMana, P.mana + dealt * sp); }
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
  G.orbs.push({ x: P.x, y: P.y, vx: (a.x - P.x) / d * (aM('g_orb') ? 3 : 4), vy: (a.y - P.y) / d * (aM('g_orb') ? 3 : 4), life: aM('g_orb') ? 3 : 2, ang: Math.random() * 6, st: 0, pow: 1, gen: 0 });
  P.cast = 0.45 / D.castSpd; faceTo(a.x, a.y); sfx(300, 0.4, 'sine', 0.04, 300);
}
function shard(x, y, ang, pow) { G.shards.push({ x, y, vx: Math.cos(ang) * 6.5, vy: Math.sin(ang) * 6.5, t: 0.75, dmg: WS.orbDmg() * pow, pierce: WS.shardPierce(), hit: new Set() }); }
function orbBurst(o) {
  const n = 14;
  for (let i = 0; i < n; i++) shard(o.x, o.y, i / n * Math.PI * 2, o.pow * 1.2);
  burst(o.x, o.y, '#ffffff', 16, 2.5); sfx(700, 0.3, 'sine', 0.04, -500);
  if (o.gen === 0 && WS.cascadeN() > 0 && !aR('a_sage')) {
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
      s.hit.add(m); hurtMon(m, s.dmg, '#ffffff'); onShardHit(s, m); if (--s.pierce <= 0) { s.t = 0; break; }
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
function newSoul(x, y, ang, spd, dmg) { const s = { x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, t: 2.2, target: null, retarget: Math.random() * 0.15, wob: Math.random() * 6, dmg, hits: WS.soulHits(), hit: new Set() }; souls.push(s); return s; }
function updateStorms(dt) {
  for (const s of G.storms) {
    s.life -= dt; s.st -= dt; s.spin += dt * 6;
    while (s.st <= 0) { s.st += WS.stormRate(); const so = newSoul(s.x, s.y, Math.random() * Math.PI * 2, 5, WS.soulDmg() * 0.75); so.storm = true; if (P.skills.tempest > 0) so.hits++; }
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
    if (!m.dead || m.echoed || m.rank === 'boss' || G.time - (m.deadAt || 0) > CORPSE_LIFE) continue;
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
  for (const m of G.zone.monsters) if (!m.dead && m.rank !== 'boss' && Math.hypot(m.x - g.x, m.y - g.y) < R) { m.taunt = 3; aggro(m); n++; if (P.skills.warcry > 0) m.slow = Math.max(m.slow || 0, 0.6); }
  if (n && P.skills.defy > 0) g.defyT = 3;
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
  G.leashes.push({ kind, ref, ax, ay, pts, life: WS.leashLife(), tick: 0, hit: new Map() }); onLeashCast(G.leashes[G.leashes.length - 1]);
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
      p.x += vx + wob; p.y += vy - wob; p.z += vz - 40 * dt * dt;
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
      if (L.kind === 'golem') { const g = L.ref; g.hp = Math.min(g.max, g.hp + g.max * 0.012 * (aM('w_tether') ? 2 : 1)); g.leashed = 0.3; }
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

// =================================================================== Soul Lantern (a totem that houses wisps)
function castTotem(pt) {
  if (!P.skills.totem || P.cast > 0 || P.roll > 0) return;
  if (aR('a_lantern')) { say('Your lantern is in your hand: strike with it', 1.4); return; }
  const a = pt || aimPoint(); if (G.zone.solidAt(a.x, a.y) || dist(a, P) > 9) { say('Cannot plant it there', 1); return; }
  if (!spendMana('totem')) return;
  endWraith();
  G.totems = [];
  const t = { x: a.x, y: a.y, r: 0.3, life: WS.totemLife() * (aM('w_vigil') ? 1.5 : 1), wisps: [] };
  G.totems.push(t);
  P.cast = 0.4 / D.castSpd; faceTo(a.x, a.y); sfx(500, 0.4, 'sine', 0.04, 200);
}
function updateTotems(dt) {
  for (const t of G.totems) {
    t.life -= dt; t.pulse = (t.pulse || 0) - dt;
    if (t.pulse <= 0) { t.pulse = 0.4; for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - t.x, m.y - t.y); if (d > 4.2) continue; m.frail = 0.5; m.lantern = t; if (P.skills.lantgrasp > 0 && m.rank !== 'boss' && d > 0.8) moveCircle(m, (t.x - m.x) / d * 0.35, (t.y - m.y) / d * 0.35); } }
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
  const a = pt || aimPoint(), R = WS.markR(), life = WS.markLife() * (aM('g_mark') ? 2 : 1); let n = 0;
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

function updateSpells(dt) { updateAnvils(dt); updateWords(dt); updateLeashes(dt); updateTotems(dt); updateMarks(dt); updateWhips(dt);  updateOrbs(dt); updateStorms(dt); updateEchoes(dt); updatePhantoms(dt); updatePillars(dt); }

// =================================================================== great wisp (Condense)
function condenseOne() {
  if (!P.wisps.length) return;
  let gw = G.great;
  if (!gw) gw = G.great = { x: P.x, y: P.y, z: 26, vx: 0, vy: 0, size: 0, state: 'form', life: 0, hitT: new Map(), target: null, dir: { x: 1, y: 0 }, over: 0, pulse: 0.8, wt: 0 };
  if (gw.state === 'hunt') gw.state = 'form';
  if (gw.size >= WS.condMax()) { say('The great wisp can hold no more', 0.8); return; }
  if (!spendMana('condense')) return;
  const w = takeWisp();
  flyMote(w.x, w.y, w.z, gw, '#d8f3ff');
  gw.size++;
  sfx(500 + gw.size * 30, 0.06, 'sine', 0.035);
}
function releaseGreat() {
  const gw = G.great; if (!gw || gw.state !== 'form') return;
  gw.state = 'hunt'; gw.life = WS.condLife() + 0.15 * gw.size; gw.hitT = new Map(); gw.target = null;
  sfx(300, 0.4, 'sine', 0.05, 500);
}
function greatRadius(gw) { return 0.3 + 0.035 * gw.size; }
function updateGreat(dt) {
  const gw = G.great; if (!gw) return;
  gw.wt += dt;
  if (gw.state === 'form') {
    const tx = P.x - 0.35, ty = P.y - 0.35;
    gw.vx += ((tx - gw.x) * 8 - gw.vx * 4) * dt; gw.vy += ((ty - gw.y) * 8 - gw.vy * 4) * dt;
    gw.x += gw.vx * dt; gw.y += gw.vy * dt; gw.z += (26 + gw.size * 0.4 - gw.z) * Math.min(1, dt * 4);
    if (!P.condensing) releaseGreat();
    return;
  }
  gw.life -= dt;
  const spd = 5.5, now = G.time, R = greatRadius(gw);
  if (gw.over > 0) { gw.over -= dt; if (gw.over <= 0) gw.target = wispTarget(gw, 7.5); }
  else {
    if (!gw.target || gw.target.dead) gw.target = wispTarget(gw, 7.5);
    if (gw.target) {
      const dx = gw.target.x - gw.x, dy = gw.target.y - gw.y, l = Math.hypot(dx, dy) || 1; gw.dir = { x: dx / l, y: dy / l };
      if (l < 0.3) gw.over = 0.35;
    }
  }
  if (gw.target || gw.over > 0) { gw.x += gw.dir.x * spd * dt; gw.y += gw.dir.y * spd * dt; }
  else { const tx = P.x + Math.cos(gw.wt) * 1.2, ty = P.y + Math.sin(gw.wt) * 1.2; gw.x += (tx - gw.x) * Math.min(1, dt * 3); gw.y += (ty - gw.y) * Math.min(1, dt * 3); }
  gw.z += (14 + gw.size * 0.3 - gw.z) * Math.min(1, dt * 5);
  const dmg = WS.condDmg() * (1 + 0.35 * gw.size); if (gw.target) P.lastHit = gw.target;
  for (const m of G.zone.monsters) {
    if (m.dead || Math.hypot(m.x - gw.x, m.y - gw.y) > m.r + R) continue;
    const last = gw.hitT.get(m); if (last !== undefined && now - last < 0.5) continue;
    gw.hitT.set(m, now); hurtMon(m, dmg, '#d8f3ff'); sfx(700, 0.05, 'square', 0.02);
  }
  if (P.skills.radiance > 0) {
    gw.pulse -= dt;
    if (gw.pulse <= 0) {
      gw.pulse = 0.8; const r = 1.2 + 0.05 * gw.size, pd = WS.radDmg() * (1 + 0.15 * gw.size);
      for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - gw.x, m.y - gw.y) < r) hurtMon(m, pd, '#fff6c8');
      parts.push({ ring: true, x: gw.x, y: gw.y, r: 0.2, max: r, t: 0.3, col: '#fff6c8' });
    }
  }
  if (dist(gw, P) > 11) { gw.x += (P.x - gw.x) * 0.5; gw.y += (P.y - gw.y) * 0.5; }
  if (gw.life <= 0) {
    if (P.skills.nova > 0) {
      const r = 1.5 + 0.08 * gw.size, nd = WS.novaDmg() * (1 + 0.25 * gw.size);
      for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - gw.x, m.y - gw.y) < r) hurtMon(m, nd, '#ffffff');
      parts.push({ ring: true, x: gw.x, y: gw.y, r: 0.2, max: r, t: 0.5, col: '#ffffff' }); burst(gw.x, gw.y, '#ffffff', 40, 4);
      G.shake = Math.max(G.shake, 5); sfx(80, 0.7, 'sawtooth', 0.06, -30);
    } else { burst(gw.x, gw.y, '#d8f3ff', 20, 2.5); sfx(600, 0.3, 'sine', 0.04, -400); }
    G.great = null;
  }
}

// =================================================================== wisps
function newWisp(kind) {
  const a = Math.random() * Math.PI * 2;
  return { kind, x: P.x + Math.cos(a) * .7, y: P.y + Math.sin(a) * .7, z: 14, vx: 0, vy: 0, ang: a, rad: 0.8 + Math.random() * 0.9, wt: Math.random() * 10, state: 'drift', hits: 0, target: null, dir: { x: 1, y: 0 }, over: 0, hitT: new Map(), trail: [], cd: 0.3 + Math.random(), beam: null };
}
function resetWisp(w, kind) { w.kind = kind; w.state = 'drift'; w.beam = null; w.hits = 0; w.cd = 0.3 + Math.random() * 0.5; burst(w.x, w.y, kind === 'rev' ? '#d8f3ff' : kind === 'beam' ? '#ffe2a0' : '#e6d2ff', 3, 1); }
function drift(w, dt, calm) {
  const lan = w.kind !== 'rev';
  w.wt += dt;
  w.ang += dt * (0.5 + 0.5 * Math.sin(w.wt * 0.6 + w.rad)) * (calm ? 0.5 : 1);
  const spread = 0.6 + 0.2 * P.wbeh.x;
  w.rad = clamp(w.rad + (Math.random() - 0.5) * dt * 2.2, lan ? 0.6 : 0.5, (lan ? 1.7 : 2.3) * spread);
  const tx = P.x + Math.cos(w.ang) * w.rad + Math.sin(w.wt * 1.3) * 0.35;
  const ty = P.y + Math.sin(w.ang) * w.rad + Math.cos(w.wt * 1.1) * 0.35;
  const k = calm ? 3 : 6;
  w.vx += ((tx - w.x) * k - w.vx * 2.6) * dt; w.vy += ((ty - w.y) * k - w.vy * 2.6) * dt;
  w.x += w.vx * dt; w.y += w.vy * dt;
  w.z += ((lan ? 17 : 13) + Math.sin(w.wt * 2.3) * 3 - w.z) * Math.min(1, dt * 4);
}
function wispTarget(w, maxFromP) {
  if (w !== G.great) { maxFromP = wispRange(maxFromP); const f = wispFocus(maxFromP); if (f) return f; }
  const z = G.zone; let best = [];
  for (const m of z.monsters) {
    if (m.dead || Math.abs(m.x - P.x) > maxFromP || Math.abs(m.y - P.y) > maxFromP) continue;
    if (m.state === 'idle' && dist(m, P) > 5) continue;
    if (w !== G.great && !wispAllowed(m)) continue;
    const d = dist(m, P); if (d > maxFromP || !lineClear(z, P, m)) continue;
    best.push([d + Math.hypot(m.x - w.x, m.y - w.y) * 0.4, m]);
  }
  if (!best.length) return null;
  best.sort((a, b) => a[0] - b[0]);
  return best[Math.floor(Math.random() * Math.min(3, best.length))][1];
}
function perish(w) {
  const i = P.wisps.indexOf(w); if (i >= 0) P.wisps.splice(i, 1);
  onWispPerish(w);
  burst(w.x, w.y, '#d8f3ff', 8, 2);
  if (P.skills.burst > 0) {
    const r = WS.burstR(), dmg = WS.burstDmg();
    for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - w.x, m.y - w.y) < r) hurtMon(m, dmg, '#bfe8ff');
    parts.push({ ring: true, x: w.x, y: w.y, r: 0.2, max: r, t: 0.35, col: '#d8f3ff' });
    sfx(500, 0.15, 'triangle', 0.03, -300);
  }
}
function updateRevWisp(w, dt) {
  const spd = WS.flySpd(), now = G.time;
  if (w.state === 'drift') {
    drift(w, dt, false); w.cd -= dt;
    if (w.cd <= 0) { const t = wispTarget(w, 4.6); if (t) { w.state = 'dive'; w.target = t; } else w.cd = 0.25; }
  } else {
    if (w.cullT > 0) { w.cullT -= dt; if (w.cullT <= 0) { w.state = 'drift'; w.cd = 0.4; w.cullPool = null; } }
    if (w.state === 'dive') {
      const t = w.target;
      if (!t || t.dead) { const n = wispTarget(w, 5); if (n) w.target = n; else { w.state = 'drift'; w.cd = 0.2; return; } }
      const dx = w.target.x - w.x, dy = w.target.y - w.y, l = Math.hypot(dx, dy) || 1;
      w.dir = { x: dx / l, y: dy / l };
      if (l < 0.3) { w.state = 'over'; w.over = 0.22 + Math.random() * 0.15; }
    } else if (w.state === 'over') {
      w.over -= dt;
      if (w.over <= 0) { const cp = w.cullT > 0 && w.cullPool ? w.cullPool.filter(q => !q.dead) : null; const n = cp && cp.length ? pick(cp) : wispTarget(w, 5.2); if (n) { w.state = 'dive'; w.target = n; } else { w.state = 'drift'; w.cd = 0.15; } }
    }
    w.vx = w.dir.x * spd; w.vy = w.dir.y * spd;
    w.x += w.vx * dt; w.y += w.vy * dt; w.z += (9 - w.z) * Math.min(1, dt * 8);
    for (const m of G.zone.monsters) {
      if (m.dead || Math.abs(m.x - w.x) > 1 || Math.abs(m.y - w.y) > 1) continue;
      if (Math.hypot(m.x - w.x, m.y - w.y) > m.r + 0.22) continue;
      const last = w.hitT.get(m); if (last !== undefined && now - last < 0.45) continue;
      w.hitT.set(m, now);
      if (tryPossess(w, m)) return;
      const dmg = WS.revDmg(); hurtMon(m, dmg, '#d8f3ff');
      const lp = WS.leech(); if (lp) { P.hp = Math.min(D.maxHp, P.hp + dmg * lp); P.mana = Math.min(D.maxMana, P.mana + dmg * lp); }
      sfx(1100 + Math.random() * 400, 0.04, 'square', 0.012);
      if (w.cullT > 0) { if (P.skills.cullmark > 0) m.cullT = 4; } else w.hits++;
      if (w.hits >= WS.hits()) { perish(w); return; }
    }
    if (dist(w, P) > (w.cullT > 0 ? 12 : 7.5)) { w.state = 'drift'; w.cd = 0.3; w.cullT = 0; }
  }
}
function beamPath(w, ang, kind) {
  const z = G.zone, R = WS.range(kind);
  let ox = w.x, oy = w.y, dx = Math.cos(ang), dy = Math.sin(ang);
  let pierce = WS.pierce(kind), mult = 1;
  const segs = [], hits = [];
  const usedMetal = new Set();
  for (let bounce = 0; bounce < 3 && pierce > 0; bounce++) {
    let len = R;
    for (let s = 0.25; s < R; s += 0.25) { const t = z.get(Math.floor(ox + dx * s), Math.floor(oy + dy * s)); if (TALL[t] && t !== T.ROCK) { len = s; break; } }
    const along = [];
    for (const m of z.monsters) {
      if (m.dead || hits.some(h => h.m === m)) continue;
      const px = m.x - ox, py = m.y - oy, t = px * dx + py * dy;
      if (t < 0 || t > len) continue;
      if (Math.abs(px * dy - py * dx) <= m.r + 0.2) along.push({ t, m });
    }
    for (const me of metals()) {
      if (usedMetal.has(me)) continue;
      const px = me.x - ox, py = me.y - oy, t = px * dx + py * dy;
      if (t < 0.3 || t > len) continue;
      if (Math.abs(px * dy - py * dx) <= me.r + 0.1) along.push({ t, metal: me });
    }
    along.sort((a, b) => a.t - b.t);
    let end = len, next = null;
    for (const a of along) {
      if (a.metal) { end = a.t; next = a.metal; break; }
      hits.push({ m: a.m, mult }); pierce--;
      if (pierce <= 0) { end = a.t; break; }
    }
    segs.push([ox, oy, ox + dx * end, oy + dy * end]);
    if (!next) break;
    // bounce off metal toward the nearest enemy
    usedMetal.add(next); mult *= 1.25;
    let tgt = null, bd = 6.5;
    for (const m of z.monsters) { if (m.dead || hits.some(h => h.m === m)) continue; const d = Math.hypot(m.x - next.x, m.y - next.y); if (d < bd && lineClear(z, next, m)) { bd = d; tgt = m; } }
    if (!tgt) break;
    ox = next.x; oy = next.y; const l = Math.hypot(tgt.x - ox, tgt.y - oy) || 1; dx = (tgt.x - ox) / l; dy = (tgt.y - oy) / l;
  }
  return { segs, hits };
}
function lanternAim(w, free) {
  const z = G.zone, R = WS.range(w.kind);
  if (!free) { const f = wispFocus(R); if (f && Math.hypot(f.x - w.x, f.y - w.y) < R && lineClear(z, w, f)) return { target: f }; if (P.wbeh.hold) return null; }
  let best = null, bd = R;
  for (const m of z.monsters) {
    if (m.dead || (m.state === 'idle' && dist(m, P) > 6)) continue;
    if (!free && !wispAllowed(m)) continue;
    const d = Math.hypot(m.x - w.x, m.y - w.y); if (d < bd && lineClear(z, w, m)) { bd = d; best = m; }
  }
  if (best) return { target: best };
  for (const me of metals()) {
    const d = Math.hypot(me.x - w.x, me.y - w.y); if (d > R || !lineClear(z, w, me)) continue;
    if (z.monsters.some(m => !m.dead && m.state !== 'idle' && Math.hypot(m.x - me.x, m.y - me.y) < 6)) return { target: me, metal: true };
  }
  return null;
}
function updateLanternWisp(w, dt) {
  const prism = w.kind === 'prism';
  drift(w, dt, !!w.beam);
  if (!w.beam) {
    w.cd -= dt;
    if (w.cd <= 0) {
      const a = lanternAim(w);
      if (a) { w.beam = { t: 0, dur: (prism ? 0.75 : 0.95) * (aM('w_ember') ? 1.3 : 1), tick: 0, target: a.target, metal: !!a.metal, ang: Math.atan2(a.target.y - w.y, a.target.x - w.x), segs: [], refr: [] }; sfx(prism ? 800 : 600, 0.3, 'sine', 0.02, 300); }
      else w.cd = 0.25;
    }
    return;
  }
  const b = w.beam;
  b.t += dt; b.tick -= dt;
  if (b.target && !b.target.dead && !b.metal) b.ang = Math.atan2(b.target.y - w.y, b.target.x - w.x);
  const amp = prism ? 0 : WS.sweepAmp();
  const ang = b.ang + (amp ? Math.sin(b.t / b.dur * Math.PI * 2) * amp : 0);
  const path = beamPath(w, ang, w.kind);
  b.segs = path.segs;
  if (b.tick <= 0) {
    b.tick = 0.15; b.refr = [];
    const fade = 1 - 0.7 * (b.t / b.dur), dmg = (prism ? WS.prismDps() : WS.beamDps()) * 0.15 * fade;
    const hitSet = new Set(path.hits.map(h => h.m));
    for (const h of path.hits) {
      hurtMon(h.m, dmg * h.mult, prism ? '#eedcff' : '#fff2c8'); if (!prism && P.skills.beamburn > 0) burnMon(h.m, dmg * 2, 2);
      if (prism) {
        const n = WS.prismN(), rp = WS.prismPct();
        const near = G.zone.monsters.filter(o => !o.dead && !hitSet.has(o) && Math.hypot(o.x - h.m.x, o.y - h.m.y) < 3.2).sort((a, c) => Math.hypot(a.x - h.m.x, a.y - h.m.y) - Math.hypot(c.x - h.m.x, c.y - h.m.y)).slice(0, n);
        for (const o of near) { hurtMon(o, dmg * h.mult * rp, '#eedcff'); hitSet.add(o); b.refr.push([h.m.x, h.m.y, o.x, o.y]); }
      }
    }
  }
  if (b.t >= b.dur) { w.beam = null; w.cd = prism ? 1.1 : 1.3; }
}
// keep the choir matching your chosen mix of wisp types
function rebalance() {
  const tg = wispTargets(), c = countKinds();
  const over = k => c[k] - tg[k];
  for (const from of ['rev', 'beam', 'prism']) {
    while (over(from) > 0) {
      const to = ['rev', 'beam', 'prism'].find(k => over(k) < 0);
      const idx = P.wisps.findIndex(w => w.kind === from);
      if (idx < 0) break;
      if (!to) { P.wisps.splice(idx, 1); c[from]--; continue; }
      resetWisp(P.wisps[idx], to); c[from]--; c[to]++;
    }
  }
}
function spawnWisp() {
  const tg = wispTargets(), c = countKinds();
  let kind = null, best = -1;
  for (const k of ['rev', 'beam', 'prism']) { if (tg[k] <= c[k]) continue; const need = (tg[k] - c[k]) / tg[k]; if (need > best) { best = need; kind = k; } }
  if (kind) P.wisps.push(newWisp(kind));
}
function fillWisps() { if (P.cls === 'hemomancer' || P.cls === 'miasmancer') { P.wisps = []; return; } if (P.cls === 'ossumancer') { P.wisps = []; P.shards = freeCap(); return; } P.wisps = []; while (P.wisps.length < effCap()) { const n = P.wisps.length; spawnWisp(); if (P.wisps.length === n) break; } }
function updateWisps(dt) {
  rebalance();
  const cap = effCap();
  if (P.wisps.length < cap && !P.condensing && !P.infuse) {
    P.wispT += dt;
    if (P.wispT >= D.wispRegen) { P.wispT = 0; spawnWisp(); }
  } else if (P.wisps.length >= cap) P.wispT = 0;
  for (const w of P.wisps.slice()) { if (w.kind === 'rev') updateRevWisp(w, dt); else updateLanternWisp(w, dt); }
  for (const w of P.wisps) { w.trail.push({ x: w.x, y: w.y, z: w.z }); if (w.trail.length > (w.state === 'drift' ? 3 : 6)) w.trail.shift(); }
}

// =================================================================== damage
function hurtPlayer(dmg, type, fx, fy) {
  if (P.dead || P.iframe > 0) return;
  if (miasEvade()) return;
  if (P.wraith) { if (type === 'phys') { floatText(P.x, P.y, 'phased', '#a39d8c'); return; } dmg *= 1.5; }
  dmg *= type === 'phys' ? 100 / (100 + D.armor) : 1 - D.res / 100;
  let d = dmg;
  if (D.wardPct > 0 && P.mana > 0) {
    const use = Math.min(P.mana, d * D.wardPct / D.wardEff);
    P.mana -= use; d -= use * D.wardEff; rebukeAbsorb(use * D.wardEff);
    if (use * D.wardEff > 0.5) burst(P.x, P.y, '#9fd8ff', 4, 1.5);
  }
  d = arcAbsorb(bloodAbsorb(boneAbsorb(d)));
  d = Math.max(0, d); P.lastBlow = d;
  P.hp -= d; P.hurt = 0.18; G.shake = Math.max(G.shake, d > 1 ? 3 : 1.5);
  playerPoiseHit(d, fx, fy);
  const kx = P.x - fx, ky = P.y - fy, kl = Math.hypot(kx, ky) || 1;
  if (!(P.host && P.skills.everst > 0)) moveCircle(P, kx / kl * 0.2, ky / kl * 0.2);
  sfx(d > 1 ? 110 : 260, 0.1, 'sawtooth', 0.045, -60);
  miasOnHit();
  if (P.hp <= 0 && !silenceSave() && !miasLastBreath()) die();
}
function hitTarget(T, dmg, type, fx, fy, src) { if (T === G.golem) hurtGolem(dmg, type, src); else if (T.isEcho) hurtEcho(T, dmg, type); else if (T.isSkel) hurtSkel(T, dmg, type); else if (T.isBrood) hurtBrood(T, dmg, type); else if (T.isThrall) hurtThrall(T, dmg); else if (T.isFGolem) hurtFGolem(T, dmg, type); else if (T.isColossus) hurtColossus(T, dmg, type, src); else if (T.isDecoy) hurtDecoy(T, dmg); else if (T.isSkin) hurtSkin(T, dmg); else { hurtPlayer(dmg, type, fx, fy); if (src && type === 'phys') { boneSpurs(src); bloodThorns(src, dmg); arcThorns(src); } } }
function hurtMon(m, dmg, col = '#e8e2d0') {
  if (m.dead) return;
  const d = dmg * 100 / (100 + m.armor) * (m.marked > 0 ? 1 + WS.markPct() : 1) * (m.rust > 0 ? 1.15 : 1) * (m.frail > 0 ? 1.15 : 1) * (m.confused > 0 && P.skills.madness > 0 ? 1.2 : 1) * (m.feared > 0 && P.skills.knelldmg > 0 ? 1.2 : 1) * (m.graveT > 0 ? 1.15 : 1) * (m.crushT > 0 ? 1.25 : 1) * (m.ossT > 0 ? 1.2 : 1) * (m.cullT > 0 ? 1.15 : 1);
  const d2 = monDmg22(m, d); if (d2 <= 0) return;
  m.hp -= d2; m.hurt = 0.1; vfxHit(m, col, d2); poiseHit(m, d2);
  if (OPT.dmgNums) dmgText(m, d2, col);
  aggro(m);
  if (m.hp <= 0) killMon(m); else shatterCheck(m);
}
function killMon(m) {
  if (m.dead) return;
  monDeath22(m);
  m.dead = true; m.deadAt = G.time; deathFx(m);
  if (m.frozen > 0) onShatter(m);
  onKillVoid(m); arcanaOnKill(m); onMiasKill(m); if (isBone()) onBoneKillArc(m);
  onBoneKill(m); onBloodKill(m);
  if (m.marked > 0 && P.skills.markSoul > 0) newSoul(m.x, m.y, Math.random() * 6.28, 5, WS.soulDmg());
  if (WS.harvest() && Math.random() < WS.harvest() && P.wisps.length < effCap()) { spawnWisp(); const w = P.wisps[P.wisps.length - 1]; if (w) { w.x = m.x; w.y = m.y; } floatText(m.x, m.y, 'wisp freed', '#d8f3ff'); }
  const big = m.rank === 'boss';
  burst(m.x, m.y, big ? '#d9a441' : '#9c9584', big ? 50 : 12, big ? 4 : 2);
  let xp = m.xp; const diff = P.level - m.mlvl; if (diff > 5) xp *= Math.max(0.1, 1 - (diff - 5) * 0.15);
  gainXp(Math.round(xp));
  if (D.lok) P.hp = Math.min(D.maxHp, P.hp + D.lok);
  if (!noLoot(m)) dropLoot(m.x, m.y, m.mlvl + (m.rank === 'unique' ? 1 : 0), m.rank === 'boss' ? 'boss' : m.rank);
  sfx(big ? 70 : 140, big ? 1.2 : 0.18, 'triangle', 0.06, -60);
  if (big) { G.bossFight = false; unseal(); banner(m.b.name.replace(/^The /, '').toUpperCase() + ' FELLED', '#d9a441', 5); }
}
function gainXp(n) {
  if (P.level >= LEVEL_CAP) return;
  P.xp += Math.round(n * (D && D.xpK || 1));
  while (P.xp >= xpNext(P.level)) {
    P.xp -= xpNext(P.level); P.level++; P.statPts += 5; P.skillPts += 1;
    D = derive(); P.hp = D.maxHp; P.mana = D.maxMana;
    banner(`LEVEL ${P.level}`, '#d9a441', 2.5); levelPillar(); burst(P.x, P.y, '#d9a441', 24, 3); sfx(523, 0.3, 'sine', 0.05, 520);
    say('Stat and skill points to spend (C and S)', 2.5);
  }
}
function die() {
  deathXpLoss(); resetArcana(); resetMias();
  P.dead = true; P.deadT = 0; P.wraith = false; P.infuse = false; P.condensing = false; P.path = null; P.target = null;
  P.remnant = P.gold > 0 ? { zone: G.zone.id, x: P.x, y: P.y, gold: P.gold } : null;
  P.gold = 0; P.wisps = []; resetBone(); resetBlood(); G.golem = null; G.anvils = []; G.pillars = []; G.flyShield = null; G.great = null; G.echoes = []; G.tether = null; G.orbs = []; G.shards = []; G.storms = []; G.phantoms = []; G.eshots = []; G.leashes = []; G.totems = []; G.marks = []; G.whips = []; P.lancing = false; P.lance = null;
  banner('ANIMA SEVERED', '#8e2630', 3.2); sfx(70, 1.4, 'sawtooth', 0.07, -30);
}
function respawn() {
  P.dead = false; P.roll = 0; P.cast = 0; P.heal = 0; P.restore = 0;
  if (G.bossFight) { G.bossFight = false; unseal(); const bz = G.zones[G.bossZone], b = bz && bz.boss; if (b && !b.dead) { b.hp = b.max; b.x = b.hx; b.y = b.hy; b.state = 'idle'; b.phase = 1; } }
  const L = P.lastLantern; enterZone(L.zone, null, L.idx);
  D = derive(); P.hp = D.maxHp; P.mana = D.maxMana; P.stam = D.maxStam;
  G.zone.monsters.forEach(m => { if (!m.dead && m.state !== 'idle') { m.state = 'idle'; m.path = null; } });
}

// =================================================================== zones
function enterZone(id, pos, lanternIdx) {
  zoneFade();
  let z = G.zones[id];
  if (!z) { z = ZONE_GEN[id](G.seed); G.zones[id] = z; }
  const changed = G.zone !== z;
  G.zone = z;
  if (lanternIdx != null) { const l = z.lanterns[lanternIdx]; P.x = l.x; P.y = l.y + 1.2; }
  else if (pos) { P.x = pos.x; P.y = pos.y; }
  else { P.x = z.start.x; P.y = z.start.y; }
  P.path = null; P.target = null; mouse.holdMove = false;
  shots = []; souls = []; beams = []; G.mmiss = []; G.anvils = []; G.pillars = []; G.orbs = []; G.shards = []; G.storms = []; G.phantoms = []; G.eshots = []; G.fissures = []; G.tether = null; G.leashes = []; G.totems = []; G.marks = []; G.whips = [];
  for (const e of G.echoes) { e.x = P.x + rand(-1, 1); e.y = P.y + rand(-1, 1); if (z.solidAt(e.x, e.y)) { e.x = P.x; e.y = P.y; } e.path = null; e.state = 'idle'; }
  for (const w of P.wisps) { w.x = P.x; w.y = P.y; w.state = 'drift'; w.beam = null; w.trail = []; }
  boneZone(z); bloodZone(z); miasZone(); arcanaZone(z); arcanaZoneChange();
  if (G.great) { G.great.x = P.x; G.great.y = P.y; G.great.target = null; }
  if (G.golem) {
    const g = G.golem; g.x = P.x + 0.8; g.y = P.y; if (z.solidAt(g.x, g.y)) { g.x = P.x; g.y = P.y; } g.path = null; g.atk = null;
    if (g.state === 'charge' || g.state === 'chargeWind') g.state = 'active';
    if (G.flyShield) { G.flyShield = null; g.shield = true; }
    if (P.gbeh.hold) g.hold = { x: g.x, y: g.y };
    g.order = null;
  }
  snapCam();
  if (changed) banner(z.name.toUpperCase(), '#e8e2d0', 2.2);
  save();
}
function usePortal(o) {
  const from = G.zone.id;
  if (!G.zones[o.to]) G.zones[o.to] = ZONE_GEN[o.to](G.seed);
  const z = G.zones[o.to];
  enterZone(o.to, (z.arrive && z.arrive[from]) || z.start);
  sfx(200, 0.5, 'sine', 0.05, -120);
}
function checkBossRoom() {
  const z = G.zone; if (!z.boss || z.boss.dead || G.bossFight) return;
  const r = z.bossRoom;
  if (P.x > r.x + 0.8 && P.y > r.y + 0.8 && P.x < r.x + r.w - 0.8 && P.y < r.y + r.h - 0.8) {
    G.bossFight = true; G.seal = []; G.bossZone = z.id;
    for (let x = r.x - 1; x <= r.x + r.w; x++) for (let y = r.y - 1; y <= r.y + r.h; y++) {
      const ring = x === r.x - 1 || y === r.y - 1 || x === r.x + r.w || y === r.y + r.h;
      if (ring && z.get(x, y) === T.FLOOR) { z.set(x, y, T.FOG); G.seal.push([x, y]); }
    }
    const inRoom = o => o.x > r.x && o.y > r.y && o.x < r.x + r.w && o.y < r.y + r.h;
    if (G.golem && !inRoom(G.golem)) { G.golem.x = P.x; G.golem.y = P.y; }
    for (const e of G.echoes) if (!inRoom(e)) { e.x = P.x; e.y = P.y; }
    for (const e of G.skels) if (!inRoom(e)) { e.x = P.x; e.y = P.y; e.path = null; }
    if (G.colossus && !inRoom(G.colossus)) { G.colossus.x = P.x; G.colossus.y = P.y; G.colossus.path = null; }
    for (const e of G.brood) if (!inRoom(e)) { e.x = P.x; e.y = P.y; e.path = null; e.cling = null; }
    if (G.fgolem && !inRoom(G.fgolem)) { G.fgolem.x = P.x; G.fgolem.y = P.y; G.fgolem.path = null; }
    z.boss.state = 'chase';
    banner(z.boss.name.toUpperCase(), '#c8553d', 3); sfx(60, 1.2, 'sawtooth', 0.06, 40);
  }
}
function unseal() { const z = G.zones[G.bossZone]; if (!z) return; G.seal.forEach(([x, y]) => z.set(x, y, T.FLOOR)); G.seal = []; }

// =================================================================== objects
function interact(o) {
  if (o.type === 'altar') { altarInteract(o); return; }
  switch (o.type) {
    case 'lantern': {
      P.lastLantern = { zone: G.zone.id, idx: o.idx };
      const key = G.zone.id + ':' + o.idx; if (!P.found.includes(key)) P.found.push(key);
      P.hp = D.maxHp; P.mana = D.maxMana; P.stam = D.maxStam;
      while (P.wisps.length < effCap()) { const n = P.wisps.length; spawnWisp(); if (P.wisps.length === n) break; }
      if (P.cls === 'hemomancer' && G.fgolem) G.fgolem.hp = G.fgolem.max;
      if (P.cls === 'ossumancer') { P.shards = freeCap(); if (P.host) { P.host.pool = P.host.n * BS.hostPer(); } if (G.colossus) G.colossus.hp = G.colossus.max; }
      if (G.golem && G.golem.state === 'dormant') { G.golem.rt = 0; G.golem.downT = 99; }
      G.panels.lantern = true; G.panels.vendor = G.panels.char = G.panels.skills = false;
      sfx(440, 0.4, 'sine', 0.05, 220); save(); break;
    }
    case 'vendor': G.panels.vendor = true; G.panels.inv = true; G.panels.char = G.panels.skills = G.panels.lantern = false; break;
    case 'chest':
      if (o.open) return; o.open = true; dropLoot(o.x, o.y + 0.5, o.ilvl, 'chest'); sfx(320, 0.15, 'square', 0.04, 200); break;
    case 'shrine': {
      if (o.used) return;
      if (o.kind === 'arcana') { arcanaShrine(o); break; }
      o.used = true;
      const names = { echo: 'Shrine of Echoes: +50% skill damage', wisp: 'Shrine of the Wisp: more wisps, faster', stone: 'Shrine of Stone: +100 armor', refill: 'Refilling Shrine' };
      if (o.kind === 'refill') { P.hp = D.maxHp; P.mana = D.maxMana; } else P.buffs[o.kind] = 60;
      say(names[o.kind], 2.5); burst(o.x, o.y, '#d8f3ff', 20, 2.5); sfx(660, 0.4, 'sine', 0.05, 330); break;
    }
    case 'portal': usePortal(o); break;
  }
}

// =================================================================== player update
function updatePlayer(dt) {
  if (P.dead) { P.deadT += dt; if (P.deadT > 3) respawn(); return; }
  const z = G.zone;
  D = derive();
  for (const k in P.buffs) { P.buffs[k] -= dt; if (P.buffs[k] <= 0) delete P.buffs[k]; }
  P.iframe = Math.max(0, P.iframe - dt); P.hurt = Math.max(0, P.hurt - dt); P.cast = Math.max(0, P.cast - dt); P.swing = Math.max(0, P.swing - dt);
  poiseRegen(dt); if (P.stagger > 0) P.stagger -= dt;
  if (!P.wraith) P.mana = Math.min(D.maxMana, P.mana + D.manaRegen * dt);
  if (P.heal > 0) { const a = Math.min(P.heal, D.maxHp * 0.3 * dt); P.heal -= a; P.hp = Math.min(D.maxHp, P.hp + a); }
  if (P.restore > 0) { const a = Math.min(P.restore, D.maxMana * 0.4 * dt); P.restore -= a; P.mana = Math.min(D.maxMana, P.mana + a); }
  P.hp = Math.min(P.hp, D.maxHp); P.mana = Math.min(P.mana, D.maxMana);

  // infusing the golem (hold right-click on it)
  // v0.25: Condense and Overcharge no longer fight: holding Condense with the cursor on your golem pours the wisps into
  // the golem instead of into a great wisp, the same as Overcharge
  const condOnGolem = G.golem && P.skills.overcharge > 0 && heldSkill('condense') && (() => { const a = aimPoint(); return Math.hypot(a.x - G.golem.x, a.y - G.golem.y) < 1.6; })();
  if ((condOnGolem || (heldSkill('overcharge') && G.golem)) && !P.infuse && P.roll <= 0) startInfuse();
  if (P.infuse && !((heldSkill('overcharge') || condOnGolem) && G.golem && P.roll <= 0)) P.infuse = false;
  if (P.infuse) { P.path = null; P.infT -= dt; if (P.infT <= 0) { P.infT = 0.16; infuseOne(); } if (G.golem) faceTo(G.golem.x, G.golem.y); }
  // condensing the great wisp (hold right-click with Condense)
  updateLance(dt);
  P.condensing = !P.infuse && heldSkill('condense') && P.skills.condense > 0 && P.roll <= 0 && P.cast <= 0;
  if (P.condensing) { endWraith(); P.path = null; P.condT -= dt; if (P.condT <= 0) { P.condT = WS.condRate(); condenseOne(); } }
  else P.condT = 0;
  if (!P.infuse && P.cast <= 0 && P.roll <= 0 && heldSkill('swarm') && allWisps() > 0) castSwarm();
  const rooted = P.infuse || P.condensing || P.lancing || P.fusing || !!P.dash || !!P.leap || arcRooted();

  if (P.roll > 0) {
    P.roll -= dt; moveCircle(P, P.rollDir.x * 8.5 * dt, P.rollDir.y * 8.5 * dt);
  } else if (!rooted && P.cast <= 0.12) {
    if (mouse.holdMove && mouse.l && !P.target) {
      mouse.moveT -= dt;
      if (mouse.moveT <= 0) { mouse.moveT = 0.18; const p = aimPoint(); if (Math.hypot(p.x - P.x, p.y - P.y) > 0.3) setPathTo(p.x, p.y); }
    }
    handleTarget(dt);
    updateApproach(dt);
    followPath(dt);
  }
  pushOut(P);
  if (P.wraith) { P.mana -= WS.wraithDrain() * dt; if (P.mana <= 0) { P.mana = 0; endWraith(); say('Your Essence gives out', 1.2); } }

  if (P.cls === 'ossumancer') updateBones(dt); else if (P.cls === 'hemomancer') updateBlood(dt); else if (P.cls === 'miasmancer') updateMias(dt); else updateWisps(dt);

  // gold auto-pickup
  for (let i = z.items.length - 1; i >= 0; i--) { const g = z.items[i]; if (g.gold && g.t <= 0 && Math.hypot(g.x - P.x, g.y - P.y) < 0.9) pickup(g); }

  G.exploreT -= dt;
  if (G.exploreT <= 0) {
    G.exploreT = 0.25;
    const R = 11, px = Math.floor(P.x), py = Math.floor(P.y);
    for (let y = py - R; y <= py + R; y++) for (let x = px - R; x <= px + R; x++) if (x >= 0 && y >= 0 && x < z.w && y < z.h && (x - px) ** 2 + (y - py) ** 2 <= R * R) z.explored[y * z.w + x] = 1;
    z.lanterns.forEach((l, i) => { const key = z.id + ':' + i; if (!P.found.includes(key) && Math.hypot(l.x - P.x, l.y - P.y) < 6) { P.found.push(key); say(`${l.name} lantern kindled`, 2); } });
  }
  if (P.remnant && P.remnant.zone === z.id && Math.hypot(P.remnant.x - P.x, P.remnant.y - P.y) < 0.8) {
    P.gold += P.remnant.gold; floatText(P.x, P.y, `+${P.remnant.gold} gold recovered`, '#d9a441'); P.remnant = null; sfx(600, 0.3, 'sine', 0.05, 400);
  }
  checkBossRoom();
}
function nearestMonTo(pt, r) { let best = null, bd = r; for (const m of G.zone.monsters) { if (m.dead || m.hidden) continue; const d = Math.hypot(m.x - pt.x, m.y - pt.y); if (d < bd) { bd = d; best = m; } } return best; }
function repeatRightAttack() { if (mouse.r && P.right === 'attack' && !P.dead && !uiBlocksMouse() && !(P.target && P.target.kind === 'mon')) basicAttack(); }
function handleTarget(dt) {
  repeatRightAttack();
  const t = P.target; if (!t) return;
  const z = G.zone;
  if (t.kind === 'leftAt') {
    if (P.cast <= 0) {
      const a = aimPoint(); faceTo(a.x, a.y);
      if (P.left === 'attack' && hasWand()) { const m = nearestMonTo(a, 1.2); fireMissile(m && !m.dead ? m : null, a); }
      else if (P.left === 'attack') { const m = nearestMonTo({ x: P.x + clamp(a.x - P.x, -1, 1), y: P.y + clamp(a.y - P.y, -1, 1) }, 1.3); swing(m); }
      else if (!(SK[P.left] && SK[P.left].kind === 'hold')) castSkill(P.left, a);
      if (!(mouse.l && keys.has('shift'))) P.target = null;
    }
    return;
  }
  if (t.kind === 'castMon') {
    const m = t.ref;
    if (m.dead) { P.target = null; return; }
    if (P.cast <= 0 && !P.approach) {
      if (t.auto) {
        // out of Essence, or the target is behind a wall: fall back to the plain attack instead of stalling
        const before = P.mana; castSkill(t.skill || P.left, { x: m.x, y: m.y });
        if (P.cast <= 0 && P.mana === before && !P.approach) P.target = { kind: 'mon', ref: m, auto: true };
      } else { castSkill(P.left, { x: m.x, y: m.y }); if (!mouse.l) P.target = null; }
    }
    return;
  }
  if (t.kind === 'mon') {
    const m = t.ref;
    if (m.dead) { P.target = null; return; }
    const d = dist(m, P);
    if (hasWand() && P.left === 'attack' && d <= WAND_RANGE && lineClear(G.zone, P, m)) {
      P.path = null;
      if (P.cast <= 0) { fireMissile(m); if (!mouse.l && !t.auto) P.target = null; }
    } else if (d <= meleeReach() - 0.1 + m.r) {
      P.path = null;
      if (P.cast <= 0) { swing(m); if (!mouse.l && !t.auto) P.target = null; }
    } else {
      P.repathT -= dt;
      if (P.repathT <= 0 || !P.path) { P.repathT = 0.25; setPathTo(m.x, m.y); }
    }
    return;
  }
  if (t.kind === 'item') { if (!z.items.includes(t.ref)) { P.target = null; return; } if (dist(t.ref, P) < 0.9) { pickup(t.ref); P.target = null; P.path = null; } return; }
  if (t.kind === 'obj') { if (Math.hypot(t.ref.x - P.x, t.ref.y - P.y) < 1.7) { P.path = null; P.target = null; interact(t.ref); } }
}
function followPath(dt) {
  if (!P.path || !P.path.length) return;
  const spd = D.moveSpd * (P.wraith ? WS.wraithSpd() : 1) * dt;
  const p = P.path[0], ox = P.x, oy = P.y;
  stepToward(P, p.x, p.y, spd);
  faceTo(p.x, p.y);
  if (Math.hypot(p.x - P.x, p.y - P.y) < 0.12) { P.path.shift(); P.stuckT = 0; }
  else if (Math.hypot(P.x - ox, P.y - oy) < spd * 0.2) { P.stuckT += dt; if (P.stuckT > 0.35) { P.path = null; P.stuckT = 0; } }
  else P.stuckT = 0;
}

// =================================================================== monsters
function aggro(m) {
  if (m.state !== 'idle') return;
  if (m.rank === 'boss' && !G.bossFight) return;
  m.state = 'chase';
  if (m.pack != null) for (const o of G.zone.monsters) if (!o.dead && o.pack === m.pack && o.state === 'idle' && o.rank !== 'boss') o.state = 'chase';
}
function monMove(m, tx, ty, spd, dt) {
  const z = G.zone; if (m.root > 0) return; if (m.slow > 0) spd *= 1 - Math.min(0.6, m.slow);
  m.repath = (m.repath || 0) - dt;
  if (lineWalk(z, m.x, m.y, tx, ty, m.r * 0.8)) { m.path = null; stepToward(m, tx, ty, spd * dt); return; }
  if ((!m.path || m.repath <= 0) && pathBudget > 0) { pathBudget--; m.path = findPath(z, m.x, m.y, tx, ty, 1200); m.repath = 1 + Math.random() * .6; }
  if (m.path && m.path.length) { const p = m.path[0]; stepToward(m, p.x, p.y, spd * dt); if (Math.hypot(p.x - m.x, p.y - m.y) < 0.2) m.path.shift(); }
  else stepToward(m, tx, ty, spd * dt);
}
function monTarget(m) {
  const g = G.golem;
  if (m.taunt > 0 && g && g.state !== 'dormant') return g;
  let best = P.dead ? null : P, bd = P.dead ? 1e9 : dist(m, P);
  if (g && g.state !== 'dormant') { const d = dist(m, g); if (d < bd) { bd = d; best = g; } }
  for (const e of G.echoes) { const d = dist(m, e) + 0.5; if (d < bd) { bd = d; best = e; } }
  ({ best, bd } = boneMonTarget(m, best, bd));
  ({ best, bd } = bloodMonTarget(m, best, bd));
  ({ best, bd } = miasMonTarget(m, best, bd));
  return best || P;
}
function updateMonsters(dt) {
  const z = G.zone, active = [];
  pathBudget = 4;
  for (const m of z.monsters) {
    if (m.dead) continue;
    const d = Math.hypot(m.x - P.x, m.y - P.y);
    if (d > 24 && m.state === 'idle') continue;
    if (d > 40) { m.state = 'idle'; m.path = null; continue; }
    active.push(m);
    try { updateMon(m, dt, d); } catch (e) { m.state = 'idle'; reportError(e); }
  }
  const g = G.golem && G.golem.state !== 'dormant' ? G.golem : null;
  for (const m of active) {
    if (m.dead) continue;
    if (m.ghost || m.fly || m.hidden) continue;
    pushOut(m);
    if (!P.dead && !P.wraith && P.roll <= 0) {
      const d = dist(m, P), mm = m.r + P.r;
      if (d < mm && d > 0.001) moveCircle(P, (P.x - m.x) / d * (mm - d) * 0.5, (P.y - m.y) / d * (mm - d) * 0.5);
    }
    if (g) { const d = dist(m, g), mm = m.r + g.r; if (d < mm && d > 0.001) { moveCircle(m, (m.x - g.x) / d * (mm - d) * 0.6, (m.y - g.y) / d * (mm - d) * 0.6); } }
    // v0.22d: bodies keep their space; the crowd spreads into a ring instead of piling onto one spot
    for (const o of active) {
      if (o === m || o.dead || o.ghost || o.fly || o.hidden) continue;
      const mm = (m.r + o.r) * 1.2; if (Math.abs(m.x - o.x) > mm || Math.abs(m.y - o.y) > mm) continue;
      let d = dist(m, o), ux, uy;
      if (d < 0.001) { const a = ((m.id || 1) * 2.399) % 6.2832; ux = Math.cos(a); uy = Math.sin(a); d = 0; } else { ux = (m.x - o.x) / d; uy = (m.y - o.y) / d; }
      if (d < mm) { const k = (mm - d) * (m.r >= o.r * 1.6 ? 0.25 : 0.55); moveCircle(m, ux * k, uy * k); }
    }
  }
}
function updateMon(m, dt, dp) {
  if (G.timeStop > 0) return;
  if (m.possessed > 0) { updatePossessed(m, dt); return; }
  if (m.feared > 0) { updateFeared(m, dt); return; }
  if (m.confused > 0 && m.rank !== 'boss') { updateConfused(m, dt); return; }
  const z = G.zone;
  m.hurt = Math.max(0, m.hurt - dt); m.t += dt; m.cd -= dt; updatePoise22(m, dt);
  if (m.taunt > 0) m.taunt -= dt; if (m.cullT > 0) m.cullT -= dt; if (m.slow > 0) m.slow = Math.max(0, m.slow - dt * 0.8); if (m.marked > 0) m.marked -= dt;
  if (m.stun > 0) { m.stun -= dt; if (m.state === 'windup' || m.state === 'slamWind' || m.state === 'chargeWind' || m.state === 'charge') { m.state = m.rank === 'boss' ? 'recover' : 'chase'; m.t = 0; } return; }
  if (m.rank === 'boss') { updateBoss(m, dt); return; }
  if (P.dead && !(G.golem && G.golem.state !== 'dormant') && !G.echoes.length && !G.skels.length && !G.colossus && !G.brood.length && !G.fgolem && !G.thralls.length) { if (m.state !== 'idle') { m.state = 'idle'; m.path = null; } return; }
  if (m.state === 'idle') { if (dp < wakeRange() && lineClear(z, m, P)) aggro(m); return; }
  const T = monTarget(m), d = dist(m, T); m.tgt = T;
  const tp = { x: (T.x - m.x) / (d || 1), y: (T.y - m.y) / (d || 1) };
  if (Math.abs(tp.x - tp.y) > 0.05) m.face = tp.x - tp.y > 0 ? 1 : -1;
  const b = m.b, reach = b.range + (T === G.golem ? 0.2 : T.isColossus || T.isFGolem ? T.r * 0.7 : 0);
  if (AI22[b.ai]) { AI22[b.ai](m, dt, T, d, tp); return; }
  if (b.ai === 'melee') {
    if (m.state === 'chase') {
      if (d > reach) monMove(m, T.x, T.y, m.spd, dt);
      else if (m.cd <= 0) { m.state = 'windup'; m.t = 0; m.aim = { x: tp.x, y: tp.y }; }
    } else if (m.state === 'windup') {
      if (m.t > b.wind) {
        m.state = 'recover'; m.t = 0;
        const hx = m.x + m.aim.x * 0.8, hy = m.y + m.aim.y * 0.8;
        burst(hx, hy, '#6f6a79', 3, 1);
        if (Math.hypot(T.x - hx, T.y - hy) < 0.8 + (T === G.golem ? 0.35 : T.isColossus || T.isFGolem ? T.r * 0.7 : 0)) hitTarget(T, rand(m.dmg[0], m.dmg[1]), 'phys', m.x, m.y, m);
        sfx(160, 0.07, 'square', 0.025, -60);
      }
    } else if (m.state === 'recover') { if (m.t > b.rec) { m.state = 'chase'; m.cd = 0.3; } }
    else m.state = 'chase';
  } else if (b.ai === 'ranged' || b.ai === 'caster') {
    const see = lineClear(z, m, T), far = b.ai === 'caster' ? 7 : 6.5, near = b.ai === 'caster' ? 4 : 3.4;
    if (m.state === 'chase') {
      if (d > far || !see) monMove(m, T.x, T.y, m.spd, dt);
      else if (d < near) stepToward(m, m.x - tp.x, m.y - tp.y, m.spd * dt);
      if (see && d < far + 1.5 && m.cd <= 0) { m.state = 'windup'; m.t = 0; m.aim = { x: tp.x, y: tp.y }; }
    } else if (m.state === 'windup') {
      m.aim = { x: tp.x, y: tp.y };
      if (m.t > b.wind) {
        const caster = b.ai === 'caster', v = caster ? 4.6 : 8.5;
        shots.push({ x: m.x + tp.x * 0.4, y: m.y + tp.y * 0.4, vx: tp.x * v, vy: tp.y * v, t: 2.2, dmg: rand(m.dmg[0], m.dmg[1]), type: caster ? 'magic' : 'phys', kind: caster ? 'orb' : 'arrow', r: caster ? 0.3 : 0.12 });
        m.state = 'chase'; m.cd = 1.7 + Math.random() * 0.9;
        sfx(caster ? 250 : 420, 0.08, caster ? 'sine' : 'triangle', 0.03, caster ? 150 : -200);
      }
    } else m.state = 'chase';
  } else if (b.ai === 'bomber') {
    if (m.state === 'chase') { if (d > 1.2) monMove(m, T.x, T.y, m.spd, dt); else { m.state = 'windup'; m.t = 0; } }
    else if (m.state === 'windup') {
      if (m.t > b.wind) {
        burst(m.x, m.y, '#8a9a4a', 26, 3); G.shake = Math.max(G.shake, 3);
        const dmg = rand(m.dmg[0], m.dmg[1]);
        if (dist(m, P) < 1.9) hurtPlayer(dmg, 'magic', m.x, m.y);
        if (G.golem && dist(m, G.golem) < 1.9) hurtGolem(dmg, 'magic');
        for (const e of G.echoes.slice()) if (dist(m, e) < 1.9) hurtEcho(e, dmg, 'magic');
        boneAoeHurt(m.x, m.y, 1.9, dmg, 'magic'); bloodAoeHurt(m.x, m.y, 1.9, dmg, 'magic');
        sfx(80, 0.4, 'sawtooth', 0.06, -40);
        killMon(m);
      }
    } else m.state = 'chase';
  }
}
function updateBoss(m, dt) {
  if (!G.bossFight) { m.state = 'idle'; if (m.hp < m.max) m.hp = Math.min(m.max, m.hp + m.max * 0.2 * dt); return; }
  if (P.dead) return;
  const T = monTarget(m), d = dist(m, T);
  const tp = { x: (T.x - m.x) / (d || 1), y: (T.y - m.y) / (d || 1) };
  if (Math.abs(tp.x - tp.y) > 0.05) m.face = tp.x - tp.y > 0 ? 1 : -1;
  if (m.phase === 1 && m.hp < m.max * 0.5) {
    m.phase = 2; say(`${m.name} calls the dead`, 2); const sum = m.b.summon || ['knight', 'hollow'];
    const r = G.zone.bossRoom;
    for (let i = 0; i < 4; i++) { const h = makeMon(sum[i % 2], r.x + 1.5 + Math.random() * (r.w - 3), r.y + 1.5 + Math.random() * (r.h - 3), m.mlvl - 1, 'normal', []); if (!G.zone.solidAt(h.x, h.y)) { h.state = 'chase'; G.zone.monsters.push(h); } }
  }
  const fast = m.phase === 2 ? 1.25 : 1;
  switch (m.state) {
    case 'idle': m.state = 'chase'; break;
    case 'chase':
      if (d > 1.7) monMove(m, T.x, T.y, m.spd * fast, dt);
      if (m.cd <= 0) {
        if (d < 2.5) { m.state = 'slamWind'; m.t = 0; m.target = { x: m.x + tp.x * 1.2, y: m.y + tp.y * 1.2 }; }
        else if (d < 8) { m.state = 'chargeWind'; m.t = 0; m.aim = { x: tp.x, y: tp.y }; }
      }
      break;
    case 'slamWind':
      if (m.t > 0.9 / fast) {
        m.state = 'recover'; m.t = 0; G.shake = 5;
        burst(m.target.x, m.target.y, '#d8f3ff', 24, 3);
        const dmg = rand(m.dmg[0], m.dmg[1]) * 1.3;
        if (Math.hypot(P.x - m.target.x, P.y - m.target.y) < 2.1) hurtPlayer(dmg, 'magic', m.target.x, m.target.y);
        if (G.golem && Math.hypot(G.golem.x - m.target.x, G.golem.y - m.target.y) < 2.1) hurtGolem(dmg, 'magic', m);
        for (const e of G.echoes.slice()) if (Math.hypot(e.x - m.target.x, e.y - m.target.y) < 2.1) hurtEcho(e, dmg, 'magic');
        sfx(55, 0.5, 'sawtooth', 0.07, -20);
      }
      break;
    case 'chargeWind': if (m.t > 0.7 / fast) { m.state = 'charge'; m.t = 0; sfx(90, 0.4, 'sawtooth', 0.05, 60); } break;
    case 'charge': {
      const ox = m.x, oy = m.y; moveCircle(m, m.aim.x * 10 * dt, m.aim.y * 10 * dt);
      pushOut(m);
      if (Math.hypot(P.x - m.x, P.y - m.y) < m.r + P.r + 0.1) hurtPlayer(rand(m.dmg[0], m.dmg[1]), 'phys', ox, oy);
      if (G.golem && Math.hypot(G.golem.x - m.x, G.golem.y - m.y) < m.r + G.golem.r + 0.1) { hurtGolem(rand(m.dmg[0], m.dmg[1]), 'phys', m); m.state = 'recover'; m.t = 0; }
      if (m.t > 0.6 || (Math.abs(m.x - ox) < 1e-4 && Math.abs(m.y - oy) < 1e-4)) { m.state = 'recover'; m.t = 0; }
      break;
    }
    case 'recover': if (m.t > 0.9 / fast) { m.state = 'chase'; m.cd = 0.5 + Math.random() * 0.8; } break;
    default: m.state = 'chase';
  }
}

// =================================================================== projectiles
function updateProjectiles(dt) {
  const z = G.zone;
  for (const s of souls) {
    s.t -= dt; s.retarget -= dt; s.wob += dt * 9;
    if (!s.target || s.target.dead || s.retarget <= 0) {
      const opts = z.monsters.filter(m => !m.dead && Math.abs(m.x - s.x) < 7 && Math.abs(m.y - s.y) < 7 && Math.hypot(m.x - s.x, m.y - s.y) < 6.5);
      const fresh = s.hit ? opts.filter(m => !s.hit.has(m)) : opts;
      s.target = fresh.length ? pick(fresh) : opts.length ? pick(opts) : null; s.retarget = 0.5;
    }
    if (s.target) {
      const dx = s.target.x - s.x, dy = s.target.y - s.y, l = Math.hypot(dx, dy) || 1;
      s.vx += (dx / l * 9 - s.vx) * Math.min(1, dt * 5); s.vy += (dy / l * 9 - s.vy) * Math.min(1, dt * 5);
    }
    const nx = s.x + (s.vx + Math.cos(s.wob) * 1.2) * dt, ny = s.y + (s.vy + Math.sin(s.wob) * 1.2) * dt;
    const tt = z.get(Math.floor(nx), Math.floor(ny));
    if (TALL[tt] && tt !== T.ROCK) { s.t = 0; burst(s.x, s.y, '#e8e2d0', 3, 1); continue; }
    s.x = nx; s.y = ny;
    for (const m of z.monsters) {
      if (m.dead || Math.abs(m.x - s.x) > 1 || Math.abs(m.y - s.y) > 1) continue;
      if (s.hit && s.hit.has(m)) continue;
      if (Math.hypot(m.x - s.x, m.y - s.y) < m.r + 0.15) {
        hurtMon(m, s.dmg); P.lastHit = m; burst(s.x, s.y, '#e8e2d0', 4, 1.4); onSoulHit(s, m);
        s.hits = (s.hits || 1) - 1; if (s.hit) s.hit.add(m);
        if (s.hits <= 0) { s.t = 0; break; }
        s.target = null; s.retarget = 0;
      }
    }
  }
  souls = souls.filter(s => s.t > 0);
  const g = G.golem && G.golem.state !== 'dormant' ? G.golem : null;
  for (const s of shots) {
    if (G.timeStop > 0) continue;
    s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    const tt = z.get(Math.floor(s.x), Math.floor(s.y));
    if (TALL[tt] && tt !== T.ROCK) { s.t = 0; continue; }
    if (G.anvils.some(a => a.fall <= 0 && Math.hypot(a.x - s.x, a.y - s.y) < a.r + 0.1)) { s.t = 0; burst(s.x, s.y, '#8b93a0', 3, 1); continue; }
    if (G.pillars.some(p => p.rise <= 0 && Math.hypot(p.x - s.x, p.y - s.y) < p.r + 0.12)) { s.t = 0; burst(s.x, s.y, '#8b93a0', 3, 1); continue; }
    if (G.flyShield && Math.hypot(G.flyShield.x - s.x, G.flyShield.y - s.y) < G.flyShield.r + 0.15) { s.t = 0; burst(s.x, s.y, '#aab4c2', 4, 1.2); sfx(700, 0.04, 'square', 0.02); continue; }
    const eh = G.echoes.find(e => Math.hypot(e.x - s.x, e.y - s.y) < e.r + s.r); if (eh) { hurtEcho(eh, s.dmg, s.type); s.t = 0; continue; }
    if (arcShotBlock(s)) { s.t = 0; burst(s.x, s.y, '#c9a66b', 4, 1.2); continue; }
    if (boneShotHit(s) || bloodShotHit(s) || miasShotHit(s)) { s.t = 0; burst(s.x, s.y, '#e8e2d0', 3, 1); continue; }
    if (g && Math.hypot(g.x - s.x, g.y - s.y) < g.r + s.r) { hurtGolem(s.dmg, s.type); s.t = 0; continue; }
    if (!P.dead && !s.friendly && Math.hypot(P.x - s.x, P.y - s.y) < P.r + s.r) {
      if (arcReflect(s)) { s.t = 0; continue; }
      const wasPhys = P.wraith && s.type === 'phys';
      hurtPlayer(s.dmg, s.type, s.x - s.vx, s.y - s.vy);
      if (!wasPhys) s.t = 0;
      if (s.kind === 'orb') burst(s.x, s.y, '#8a9a4a', 6, 1.5);
    }
  }
  shots = shots.filter(s => s.t > 0);
  updateVfx(dt);
  for (const p of parts) {
    p.t -= dt;
    if (p.g) { p.x += p.vx * dt * 0.3; p.y += p.vy * dt * 0.3; p.z = Math.max(0, p.z + p.vz * dt); p.vz *= 0.94; continue; }
    if (p.ring) { p.r += (p.max - p.r) * Math.min(1, dt * 12); continue; }
    if (p.spike) continue;
    if (p.fly) { p.k = Math.min(1, p.k + dt / 0.3); const to = p.to; p.x = p.x0 + (to.x - p.x0) * p.k; p.y = p.y0 + (to.y - p.y0) * p.k; p.z = p.z0 + ((to.z || 12) - p.z0) * p.k + Math.sin(p.k * Math.PI) * 10; continue; }
    p.x += p.vx * dt * 0.3; p.y += p.vy * dt * 0.3; p.vz -= 80 * dt; p.z = Math.max(0, p.z + p.vz * dt);
  }
  parts = parts.filter(p => p.t > 0);
  texts.forEach(t => { t.t -= dt; t.z += (t.dmg ? 10 : 14) * dt; if (t.pop > 0) t.pop -= dt; }); texts = texts.filter(t => t.t > 0);
  for (const it of z.items) if (it.t > 0) it.t -= dt;
}

// =================================================================== save
function save() {
  try {
    const data = { v: 9, fate: P.fate, arc: P.arc, done: P.done, respecs: P.respecs, cls: P.cls, muts: P.muts, grafts: P.grafts, hbeh: P.hbeh, fbeh: P.fbeh, squads: P.squads, skelWant: P.skelWant, sbeh: P.sbeh, cweapon: P.cweapon, wbeh: P.wbeh, level: P.level, xp: P.xp, attrs: P.attrs, statPts: P.statPts, skillPts: P.skillPts, skills: P.hard, left: P.left, right: P.right, keys: P.keys, gbeh: P.gbeh, gweapon: P.gweapon, alloc: P.alloc, gold: P.gold, inv: P.inv, eq: P.eq, belt: P.belt, uid: itemUid };
    localStorage.setItem(G.saveKey, JSON.stringify(data));
  } catch (e) { /* storage is optional */ }
}
function loadSave(key = 'spiritmancer.save.v2') {
  try { const s = localStorage.getItem(key); if (!s) return null; const d = JSON.parse(s); return d && d.v >= 2 && d.v <= 9 ? d : null; } catch (e) { return null; }
}
function applySave(d) {
  P.cls = d.cls || 'animancer';
  Object.assign(P, { level: d.level, xp: d.xp, attrs: d.attrs, statPts: d.statPts, skillPts: d.skillPts, gold: d.gold, inv: d.inv || [], eq: d.eq || {}, belt: d.belt || [null, null, null, null] });
  const sk = defaultSkills();
  P.left = 'attack'; P.right = defaultRight(); P.gweapon = 'sword'; P.sbeh = Object.assign(defaultSbeh(), d.sbeh || {}); P.cweapon = CWEAPONS.includes(d.cweapon) ? d.cweapon : 'shield'; P.muts = Array.isArray(d.muts) ? d.muts.filter(m => MUTS.includes(m)) : ['maw']; P.grafts = Array.isArray(d.grafts) ? d.grafts.filter(g => GRAFTS.includes(g)) : ['fevered']; P.hbeh = Object.assign(defaultBeh(2, 3), d.hbeh || {}); P.fbeh = Object.assign(defaultBeh(2, 2), d.fbeh || {}); P.skelWant = d.skelWant != null ? d.skelWant : 99; P.squads = defaultSquads(); if (Array.isArray(d.squads)) d.squads.slice(0, 3).forEach((q, i) => { if (!q) return; const S = P.squads[i]; if (SLOADS.includes(q.load)) S.load = q.load; if (q.n >= 0) S.n = Math.min(20, q.n | 0); if (q.beh) S.beh = Object.assign(defaultBeh(2, 3), q.beh); }); P.alloc = { beam: 0, prism: 0 }; P.keys = defaultKeys(); P.gbeh = defaultGbeh();
  P.wbeh = defaultWbeh(); P.cls = d.cls || 'animancer';
  // attributes changed in v7 (Vitality / Essence / Constitution): refund every spent point
  if (!d.v || d.v < 7) { let spent = 0; const old = { vit: 15, ene: 20, spi: 20, dex: 15 }; for (const k in old) spent += Math.max(0, ((d.attrs || {})[k] || old[k]) - old[k]); P.attrs = { ...BASE_ATTRS }; P.statPts = (d.statPts || 0) + spent; }
  if (d.v >= 6) {
    if (d.wbeh) P.wbeh = Object.assign(defaultWbeh(), d.wbeh);
    if (d.keys) P.keys = d.keys;
    if (d.gbeh) P.gbeh = Object.assign(defaultGbeh(), d.gbeh);
    for (const k in sk) if (d.skills && d.skills[k] != null) sk[k] = d.skills[k];
    P.skills = { ...sk }; P.hard = { ...sk };
    if (d.v < 9) { let spent = 0; for (const k in (d.skills || {})) spent += d.skills[k] || 0; const free = { animancer: 2, ossumancer: 3, hemomancer: 4, miasmancer: 3 }[P.cls] || 0; P.skills = defaultSkills(); P.hard = defaultSkills(); P.skillPts = Math.max(P.level, (d.skillPts || 0) + spent - free); P.right = defaultRight(); P.left = 'attack'; }
    if (RIGHT_SKILLS.includes(d.right)) P.right = d.right;
    if (LEFT_SKILLS.includes(d.left)) P.left = d.left;
    if (WEAPONS.includes(d.gweapon)) P.gweapon = d.gweapon;
    if (d.alloc) P.alloc = { beam: d.alloc.beam || 0, prism: d.alloc.prism || 0 };
  } else {
    // the skill trees changed: refund every point beyond the free ones
    let spent = 0; for (const k in (d.skills || {})) spent += d.skills[k] || 0;
    P.skills = { ...sk }; P.hard = { ...sk }; P.skillPts = (d.skillPts || 0) + Math.max(0, spent - (d.v === 3 ? 1 : 2));
  }
  P.arc = newArc(); P.done = Array.isArray(d.done) ? d.done.slice() : []; P.respecs = d.respecs != null ? d.respecs : 1;
  if (d.arc && d.arc.taken) { P.arc.pts = d.arc.pts | 0; for (const k in d.arc.taken) if (ARC[k]) P.arc.taken[k] = d.arc.taken[k]; else P.arc.pts++; P.arc.both = d.arc.both && P.arc.taken[d.arc.both] ? d.arc.both : null; P.arc.maj = d.arc.maj | 0; P.arc.got = d.arc.got | 0; P.arc.majAct = d.arc.majAct | 0; }
  itemUid = Math.max(itemUid, d.uid || 1);
  P.fate = d.fate || null;
}
function newCharacter() {
  P.level = 1; P.xp = 0; P.attrs = { ...BASE_ATTRS }; P.statPts = 0; P.cls = G.pickCls || 'animancer';
  P.eq = P.cls === 'miasmancer' ? { weapon: newBaseItem('claw'), body: newBaseItem('robe'), head: newBaseItem('hood') } : P.cls === 'hemomancer' ? { weapon: newBaseItem('dagger'), body: newBaseItem('robe'), head: newBaseItem('mask') } : P.cls === 'ossumancer' ? { weapon: newBaseItem('dagger'), body: newBaseItem('robe'), offhand: newBaseItem('relic') } : { weapon: newBaseItem('wand'), body: newBaseItem('robe') };
  P.inv = []; P.belt = [{ kind: 'hp', n: 2 }, { kind: 'hp', n: 2 }, { kind: 'mp', n: 2 }, null]; P.gold = 40;
  P.fate = G.pendingFate || null; G.pendingFate = null;
  P.skills = defaultSkills(); P.hard = defaultSkills(); P.arc = newArc(); P.done = []; P.respecs = 1; P.skillPts = 1; P.left = 'attack'; P.right = defaultRight(); P.sbeh = defaultSbeh(); P.cweapon = 'shield'; P.squads = defaultSquads(); P.muts = ['maw']; P.grafts = ['fevered']; P.hbeh = defaultBeh(2, 3); P.fbeh = defaultBeh(2, 2); P.gweapon = 'sword'; P.alloc = { beam: 0, prism: 0 }; P.keys = defaultKeys(); P.gbeh = defaultGbeh();
}
// a level 30 character with points to spend, gear and gold, saved separately so it never replaces your real character
function testCharacter() {
  newCharacter();
  P.level = 30; P.statPts = 5 * 29; P.skillPts = 120; P.gold = 50000; P.arc.pts = 20; P.arc.maj = 4; P.respecs = 99;
  const rare = (base, ilvl) => { let it; for (let i = 0; i < 400; i++) { it = rollItem(ilvl, 300); if (it.base === base && (it.q === 'rare' || it.q === 'unique')) break; } if (it.base !== base) it = newBaseItem(base); it.lvl = Math.min(it.lvl, 30); return it; };
  P.eq = { weapon: rare(P.cls === 'miasmancer' ? 'talons' : 'staff', 12), head: rare('mask', 12), body: rare('mail', 12), hands: rare('gloves', 12), feet: rare('boots', 12), waist: rare('belt', 12), offhand: rare('relic', 12), neck: rare('amulet', 12), ring1: rare('ring', 12), ring2: rare('ring', 12) };
  P.belt = [{ kind: 'hp', n: 4 }, { kind: 'hp', n: 4 }, { kind: 'mp', n: 4 }, { kind: 'mp', n: 4 }];
  for (let i = 0; i < 6; i++) invAdd(newPotion(i % 2 ? 'mp' : 'hp'));
}
