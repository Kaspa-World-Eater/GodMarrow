
// =================================================================== v0.17: phones and tablets
// Detected automatically: a touch screen without a fine pointer gets touch controls, and so does anyone who touches
// the screen at all (a mouse movement later switches back).
//   tap              = left click (move, attack, pick up, press a button)
//   touch and hold   = right click, held for as long as your finger stays down (drag to aim)
//   buttons at right = auto-attack on/off, roll, drink a potion, and your hotbar skills (tap to cast at the
//                      nearest enemy; hold one to make it your touch-and-hold skill)
const TOUCH = { on: false, fingers: new Map(), auto: true, autoT: 0, lastTouch: -9, hold: 0.33, btns: [], hotHold: null };
try { TOUCH.on = (matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches) || (navigator.maxTouchPoints > 0 && !matchMedia('(hover: hover)').matches); } catch (e) { }
try { const a = localStorage.getItem('triune.autoAttack'); if (a != null && OPT.auto == null) OPT.auto = a === '1'; } catch (e) { }
G.touch = TOUCH.on;
function touchPos(t) { const r = cv.getBoundingClientRect(); return { x: (t.clientX - r.left) * W / r.width, y: (t.clientY - r.top) * H / r.height }; }
function overUI(p) { return p.y >= HUD_Y - 4 || uiBlocksMouse(); }
// the on-screen buttons, rebuilt each frame so they follow the hotbar
function touchButtons() {
  const b = [], hot = touchHotbar();
  b.push({ id: 'auto', x: 452, y: 36, r: 11, label: 'AUTO' });
  hot.forEach((id, i) => b.push({ id: 'skill', skill: id, x: 452, y: 64 + i * 25, r: 11 }));
  b.push({ id: 'potion', x: 452, y: HUD_Y - 64, r: 11, label: 'DRINK' });
  b.push({ id: 'roll', x: 452, y: HUD_Y - 36, r: 13, label: 'ROLL' });
  return b;
}
function touchHotbar() {
  const out = [];
  for (const k of BINDABLE) { const id = P.keys && P.keys[k]; if (id && SK[id] && P.skills[id] > 0 && !out.includes(id)) out.push(id); }
  for (const id of SK_ORDER) { if (out.length >= 5) break; const s = SK[id]; if (s.cls === P.cls || (!s.cls && P.cls === 'animancer')) if ((s.kind === 'cast' || s.kind === 'hold') && P.skills[id] > 0 && !out.includes(id)) out.push(id); }
  return out.slice(0, 5);
}
function hitButton(p) { if (!G.running || G.paused || G.divine || anyPanelOpen()) return null; for (const b of touchButtons()) if (Math.hypot(p.x - b.x, p.y - b.y) < b.r + 4) return b; return null; }
// the nearest enemy you can see, else a point a few yards ahead of you
function autoTarget(R = 9) {
  let best = null, bd = R;
  for (const m of G.zone.monsters) { if (m.dead || m.hidden || (m.fly && m.z > 8 && P.left === 'attack' && !hasWand())) continue; const d = Math.hypot(m.x - P.x, m.y - P.y); if (d < bd && lineClear(G.zone, P, m)) { bd = d; best = m; } }
  if (best) return { x: best.x, y: best.y, m: best };
  const dx = P.lastDir ? P.lastDir.x : (P.face || 1) * 0.7, dy = P.lastDir ? P.lastDir.y : -(P.face || 1) * 0.7;
  return { x: P.x + dx * 3, y: P.y + dy * 3, m: null };
}
function aimMouseAt(pt) { const q = iso(pt.x, pt.y); mouse.x = q.sx; mouse.y = q.sy - 4; }
function pressButton(b, long) {
  if (b.id === 'auto') { OPT.auto = !autoOn(); saveOpts(); say('Auto-attack ' + (autoOn() ? 'on' : 'off'), 1); return; }
  if (b.id === 'roll') { const t = autoTarget(); aimMouseAt(P.lastDir ? { x: P.x + P.lastDir.x * 3, y: P.y + P.lastDir.y * 3 } : t); tryRoll(); return; }
  if (b.id === 'potion') { const low = P.hp < D.maxHp * 0.7 || P.mana > D.maxMana * 0.4; let i = P.belt.findIndex(s => s && s.kind === (low ? 'hp' : 'mp')); if (i < 0) i = P.belt.findIndex(it => it); if (i >= 0) drinkBelt(i); else say('No potions in your belt', 1); return; }
  if (b.id === 'skill') {
    if (long) { setRight(b.skill); say(`Touch and hold casts ${SK[b.skill].name}`, 1.4); return; }
    const t = autoTarget(); aimMouseAt(t);
    if (SK[b.skill].kind === 'hold') { TOUCH.hotHold = b.skill; castSkill(b.skill, { x: t.x, y: t.y }); return; }
    castSkill(b.skill, { x: t.x, y: t.y });
  }
}
function fireMouse(type, button) {
  if (type === 'down') {
    if (G.divine) { if (button === 0) divineClick(); return; }
    if (!G.running || G.paused) return;
    if (button === 0) { mouse.l = true; onLeftDown(); } else { mouse.r = true; onRightDown(); }
  } else {
    if (button === 0) { mouse.l = false; mouse.holdMove = false; P.leftHeld = false; } else mouse.r = false;
  }
}
cv.addEventListener('touchstart', e => {
  e.preventDefault(); TOUCH.lastTouch = performance.now(); if (!TOUCH.on) { TOUCH.on = true; G.touch = true; }
  try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (er) { }
  for (const t of e.changedTouches) {
    const p = touchPos(t); mouse.x = p.x; mouse.y = p.y;
    const b = hitButton(p);
    const f = { id: t.identifier, x0: p.x, y0: p.y, t0: performance.now(), btn: b, mode: 'pending', ui: !b && G.running && overUI(p) };
    TOUCH.fingers.set(t.identifier, f);
    if (b) { f.mode = 'button'; if (b.id !== 'skill' && b.id !== 'auto') { pressButton(b, false); f.done = true; } continue; }   // v0.54: AUTO waits too (hold it to choose)
    // v0.24: on a touch screen a choice takes two taps: the first shows it (as a hover would), the second makes it
    if (G.divine) { touchConfirm(p, (G.divine.btn || []), b2 => b2.fn(), () => divineAdvance()); f.mode = 'tap'; continue; }
    if (!G.running && typeof TT !== 'undefined' && !document.getElementById('intro').hidden) { mouse.x = p.x; mouse.y = p.y; ttUpdate(0); const o = TT.hover; if (o) touchConfirm(p, [{ x: o.x - 6, y: o.y - 6, w: 60, h: 50, fn: () => { if (!(o.need && !o.need())) o.act(); } }], b2 => b2.fn(), () => { }); else TOUCH.armed = null; f.mode = 'tap'; continue; }
    // in the world a touch acts at once as a left click; over the HUD or a panel we wait to tell a tap from a hold
    if (!f.ui) { fireMouse('down', 0); mouse.holdMove = false; f.mode = 'left'; }
  }
}, { passive: false });
cv.addEventListener('touchmove', e => {
  e.preventDefault();
  for (const t of e.changedTouches) {
    const f = TOUCH.fingers.get(t.identifier); if (!f) continue;
    const p = touchPos(t);
    if (f.mode === 'button') continue;
    mouse.x = p.x; mouse.y = p.y;
    if (Math.hypot(p.x - f.x0, p.y - f.y0) > 7) f.moved = true;
  }
}, { passive: false });
function endFinger(t) {
  const f = TOUCH.fingers.get(t.identifier); if (!f) return;
  TOUCH.fingers.delete(t.identifier);
  const long = performance.now() - f.t0 > TOUCH.hold * 1000;
  if (f.mode === 'button') { if ((f.btn.id === 'skill' || f.btn.id === 'auto') && !f.done) { if (TOUCH.hotHold) { TOUCH.hotHold = null; } else pressButton(f.btn, long); } return; }
  if (f.mode === 'pending') {
    // inside an open panel a tap first shows what it would do; the same tap again does it. The HUD bar answers at once.
    const bt = mouse.y < HUD_Y && anyPanelOpen() ? BTN.slice().reverse().find(q => mouse.x >= q.x - 3 && mouse.x < q.x + q.w + 3 && mouse.y >= q.y - 3 && mouse.y < q.y + q.h + 3) : null;
    if (bt) { const key = bt.x + ',' + bt.y + ',' + bt.w; if (TOUCH.armed !== key || performance.now() - TOUCH.armedT > 4000) { TOUCH.armed = key; TOUCH.armedT = performance.now(); sfx(700, 0.03, 'sine', 0.012); return; } TOUCH.armed = null; mouse.x = bt.x + bt.w / 2; mouse.y = bt.y + bt.h / 2; }
    fireMouse('down', 0); fireMouse('up', 0); return;
  }
  if (f.mode === 'left') fireMouse('up', 0);
  if (f.mode === 'right') fireMouse('up', 2);
}
cv.addEventListener('touchend', e => { e.preventDefault(); TOUCH.lastTouch = performance.now(); for (const t of e.changedTouches) endFinger(t); }, { passive: false });
cv.addEventListener('touchcancel', e => { for (const t of e.changedTouches) endFinger(t); }, { passive: false });
// a real mouse moving (not one a touch pretends to be) hands control back to the mouse
cv.addEventListener('mousemove', () => { if (TOUCH.on && performance.now() - TOUCH.lastTouch > 1500) { TOUCH.on = false; G.touch = false; } });
// runs every frame: long presses turn into right clicks, held hotbar skills keep aiming, auto-attack finds work
// v0.22 auto-attack (every input; on by default for touch, off for mouse; Options or the AUTO button)
// It locks onto the nearest enemy it can see and keeps striking it until it dies, walks out of reach or you
// give another order; then it picks the next one straight away.
function autoRange() { return P.left === 'attack' ? (hasWand() ? WAND_RANGE : 8) : 9; }   // v0.24: reaches for enemies from farther
function autoUsable() { const s = SK[P.left]; return P.left === 'attack' || (s && s.kind === 'cast'); }
function updateAuto(dt) {
  const t = P.target;
  if (t && t.auto) {
    const m = t.ref;
    if (m.dead || m.erased || m.hidden || dist(m, P) > autoRange() + 3 || mouse.l || mouse.r) { P.target = null; TOUCH.autoT = 0; return; }
    // v0.24: aggro: if something else is on you while you chase or fight, turn on it (melee most of all)
    if (t.kind === 'mon') { let near = null, nd = meleeReach() + 1.2; for (const o of G.zone.monsters) { if (o === m || o.dead || o.hidden || (o.fly && o.z > 8)) continue; const d = dist(o, P) - o.r; if (d < nd && o.state !== 'idle' && lineClear(G.zone, P, o)) { nd = d; near = o; } } if (near && dist(m, P) - m.r > nd + 0.6) t.ref = near; }
    return;
  }
  TOUCH.autoT -= dt;
  if (!autoOn() || TOUCH.autoT > 0 || P.dead) return;
  TOUCH.autoT = 0.08;
  const padMove = typeof PAD !== 'undefined' && PAD.on && G.time - PAD.lastMove < 0.25;
  const idle = !P.path && !P.target && !P.approach && !mouse.l && !mouse.r && P.cast <= 0 && P.roll <= 0 && !TOUCH.hotHold && !anyPanelOpen() && !padMove && !P.infuse;
  if (!idle) return;
  const a = autoTarget(autoRange()); if (!a.m) return;
  const skill = autoUsable() ? P.left : 'attack';
  P.target = skill === 'attack' ? { kind: 'mon', ref: a.m, auto: true } : { kind: 'castMon', ref: a.m, auto: true, skill };
}
function updateTouch(dt) {
  if (!G.running || G.paused) return;
  updateAuto(dt);
  if (!TOUCH.on) return;
  const now = performance.now();
  for (const f of TOUCH.fingers.values()) {
    // a finger held on a bubble long enough does its long press (v0.54: this check sat inside the short-press branch
    // and could never fire)
    if (f.mode === 'button') { if (((f.btn.id === 'skill' && SK[f.btn.skill].kind !== 'hold') || f.btn.id === 'auto') && !f.done && now - f.t0 >= 450) { pressButton(f.btn, true); f.done = true; if (navigator.vibrate) try { navigator.vibrate(10); } catch (e) { } } continue; }
    if (now - f.t0 < TOUCH.hold * 1000) continue;
    if (f.mode === 'left') {
      // held: that was a right click after all. Undo the walk and cast instead.
      fireMouse('up', 0); P.path = null; P.target = null; P.approach = null; f.mode = 'right'; fireMouse('down', 2);
      if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) { }
    } else if (f.mode === 'pending') { f.mode = 'right'; fireMouse('down', 2); }
  }
  if (TOUCH.hotHold) { const t = autoTarget(); aimMouseAt(t); if (![...TOUCH.fingers.values()].some(f => f.mode === 'button' && f.btn.skill === TOUCH.hotHold)) TOUCH.hotHold = null; }
}
// the direction you last walked, for rolls and for aiming when nothing is near
function trackDir() { if (P._tdx != null) { const dx = P.x - P._tdx, dy = P.y - P._tdy, l = Math.hypot(dx, dy); if (l > 0.01) P.lastDir = { x: dx / l, y: dy / l }; } P._tdx = P.x; P._tdy = P.y; }
function drawTouchUI() {
  if (!TOUCH.on || !G.running || anyPanelOpen()) return;
  for (const b of touchButtons()) {
    const pressed = [...TOUCH.fingers.values()].some(f => f.btn && f.btn.x === b.x && f.btn.y === b.y);
    ctx.fillStyle = pressed ? 'rgba(80,70,96,0.8)' : 'rgba(14,12,18,0.55)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.28); ctx.fill();
    ctx.strokeStyle = b.id === 'auto' && autoOn() ? '#d9a441' : 'rgba(200,190,220,0.45)'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.28); ctx.stroke();
    if (b.id === 'skill') { ctx.save(); ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 1, 0, 6.28); ctx.clip(); skillIcon(b.skill, b.x - 9, b.y - 9, P.right === b.skill); ctx.restore(); if (P.right === b.skill) { ctx.strokeStyle = '#d9a441'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 1.5, 0, 6.28); ctx.stroke(); } }
    else txt(b.label, b.x, b.y + 3, b.id === 'auto' && !autoOn() ? '#6f6a79' : '#e8e2d0', 'center', false);
  }
  // where a held finger is casting, a ring
  for (const f of TOUCH.fingers.values()) if (f.mode === 'right') { ctx.strokeStyle = `rgba(217,164,65,${0.5 + 0.3 * Math.sin(G.time * 10)})`; ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 9, 0, 6.28); ctx.stroke(); }
}

// =================================================================== v0.20: full screen
// The Full screen buttons (title and pause menu) fill the whole display. On a phone the game asks for full screen
// and landscape on its own when you start. Opening the page with #fullscreen (or ?fullscreen) in the link does the
// same on any device the first time you press a start button.
const FS_WANT = /fullscreen|fs\b/i.test(location.hash + location.search);
function inFullscreen() { return !!(document.fullscreenElement || document.webkitFullscreenElement); }
function goFullscreen(quiet) {
  const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) { if (!quiet) say('This browser cannot go full screen here', 2); return; }
  try {
    const p = req.call(el, { navigationUI: 'hide' });
    const lock = () => { try { if (screen.orientation && screen.orientation.lock && G.touch) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { } };
    if (p && p.then) p.then(() => { lock(); setTimeout(fit, 150); }).catch(() => { if (!quiet) fsBlocked(); }); else { lock(); setTimeout(fit, 150); }
  } catch (e) { if (!quiet) fsBlocked(); }
}
function fsBlocked() {
  const n = document.getElementById('fsNote'); if (n) { n.hidden = false; return; }
  say('Full screen was blocked by the page around the game. Open the link in its own tab, or press F11.', 4);
}
function toggleFullscreen() { if (inFullscreen()) { (document.exitFullscreen || document.webkitExitFullscreen).call(document); } else goFullscreen(false); }
document.getElementById('fsBtn').addEventListener('click', () => toggleFullscreen());
document.getElementById('mFull').addEventListener('click', () => { toggleFullscreen(); });
for (const id of ['newBtn', 'continueBtn', 'testBtn']) document.getElementById(id).addEventListener('click', () => { if ((G.touch || FS_WANT) && !inFullscreen()) goFullscreen(true); });
document.addEventListener('fullscreenchange', () => { setTimeout(fit, 100); const b = document.getElementById('fsBtn'), m = document.getElementById('mFull'); const t = inFullscreen() ? 'Leave full screen' : 'Full screen'; if (b) b.textContent = t; if (m) m.textContent = t; });

// v0.24: two taps to choose on touch screens. The first tap on a choice arms it (and shows its hover); tapping the
// same choice again within four seconds makes it. Hit areas are padded so fingers find them.
function touchConfirm(p, btns, fire, none) {
  const b = btns.find(q => p.x >= q.x - 5 && p.x < q.x + q.w + 5 && p.y >= q.y - 5 && p.y < q.y + q.h + 5);
  if (!b) { TOUCH.armed = null; mouse.x = p.x; mouse.y = p.y; none(); return; }
  const key = b.x + ',' + b.y + ',' + b.w;
  mouse.x = b.x + b.w / 2; mouse.y = b.y + b.h / 2;
  if (TOUCH.armed === key && performance.now() - TOUCH.armedT < 4000) { TOUCH.armed = null; fire(b); return; }
  TOUCH.armed = key; TOUCH.armedT = performance.now(); sfx(700, 0.03, 'sine', 0.012);
}
{
  const _dd = drawDivine;
  drawDivine = function () { _dd(); if (TOUCH.on && TOUCH.armed && performance.now() - TOUCH.armedT < 4000) { ctx.fillStyle = 'rgba(10,8,12,0.75)'; ctx.fillRect(W / 2 - 60, H - 16, 120, 12); txt('Tap again to choose', W / 2, H - 7, '#d9a441', 'center'); } };
}
