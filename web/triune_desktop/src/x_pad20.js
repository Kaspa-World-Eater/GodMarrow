
// =================================================================== v0.20: controllers
// Any standard gamepad (Xbox, PlayStation, Switch Pro, most Bluetooth pads) is picked up the moment a button is
// pressed. In the world:
//   left stick  move                      right stick  aim (idle: aims at the nearest enemy)
//   A / Cross   attack or left skill; picks up and opens things close by
//   X / Square  right skill (hold)        RT          right skill (hold)
//   B / Circle  roll                      Y / Triangle drink a potion
//   LB / RB     cycle the right skill     D-pad ←/→   cycle the left skill
//   D-pad ↑     skills                    D-pad ↓     inventory
//   LT          map                       View/Back   character   Menu/Start  pause
// In panels, menus and the reading the left stick moves a cursor: A clicks, X right-clicks, B backs out.
const PAD = { on: false, idx: -1, prev: [], cur: { x: W / 2, y: H / 2 }, rep: 0, aimT: 0, lastMove: 0, rHeld: false, aHeld: false };
addEventListener('gamepadconnected', e => { PAD.idx = e.gamepad.index; });
function padBtn(gp, i) { const b = gp.buttons[i]; return !!(b && (b.pressed || b.value > 0.5)); }
function padDead(v) { return Math.abs(v) < 0.2 ? 0 : (v - Math.sign(v) * 0.2) / 0.8; }
// screen-space stick to a world direction on the isometric grid
function stickToWorld(u, v) { const wx = u / 2 + v, wy = v - u / 2, l = Math.hypot(wx, wy) || 1; return { x: wx / l, y: wy / l }; }
function padMenuMode() { return !!G.divine || !G.running || G.paused || anyPanelOpen() || !!G.pick; }
function htmlButtons() {
  const root = !menuEl.hidden ? menuEl : !document.getElementById('intro').hidden ? document.getElementById('intro') : null;
  return root ? [...root.querySelectorAll('button')].filter(b => !b.hidden && b.offsetParent !== null) : [];
}
function pollPad(dt) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  let gp = PAD.idx >= 0 ? pads[PAD.idx] : null;
  if (!gp) for (const p of pads) if (p && p.connected) { gp = p; PAD.idx = p.index; break; }
  if (!gp) return;
  const down = gp.buttons.map((b, i) => padBtn(gp, i)), was = PAD.prev, pressed = i => down[i] && !was[i], released = i => !down[i] && was[i];
  const lx = padDead(gp.axes[0] || 0), ly = padDead(gp.axes[1] || 0), rx = padDead(gp.axes[2] || 0), ry = padDead(gp.axes[3] || 0);
  const any = down.some(Boolean) || lx || ly || rx || ry;
  if (any && !PAD.on) { PAD.on = true; G.pad = true; if (G.running) say('Controller connected', 1.5); }
  PAD.prev = down;
  if (!PAD.on) return;
  // the title screen and the pause menu are HTML: the stick and D-pad walk the buttons, A presses
  const hb = G.divine ? [] : htmlButtons();
  if (hb.length) {
    PAD.rep -= dt; const dir = (ly > 0.5 || down[13]) ? 1 : (ly < -0.5 || down[12]) ? -1 : 0;
    if (dir && PAD.rep <= 0) { PAD.rep = 0.22; const i = hb.indexOf(document.activeElement); hb[(i + dir + hb.length) % hb.length].focus(); }
    if (!dir) PAD.rep = 0;
    if (pressed(0)) { const f = hb.includes(document.activeElement) ? document.activeElement : hb[0]; f.click(); }
    if (pressed(1) && !menuEl.hidden) closeMenu();
    if (pressed(9) && !menuEl.hidden) closeMenu();
    return;
  }
  if (padMenuMode()) {
    // a free cursor for panels and the reading
    const sp = 170 * dt; PAD.cur.x = clamp(PAD.cur.x + lx * sp + rx * sp * 0.5, 0, W - 1); PAD.cur.y = clamp(PAD.cur.y + ly * sp + ry * sp * 0.5, 0, H - 1);
    if (lx || ly || rx || ry) { mouse.x = PAD.cur.x; mouse.y = PAD.cur.y; }
    if (pressed(0)) { mouse.x = PAD.cur.x; mouse.y = PAD.cur.y; if (G.divine) divineClick(); else { mouse.l = true; onLeftDown(); } }
    if (released(0)) { mouse.l = false; mouse.holdMove = false; P.leftHeld = false; }
    if (pressed(2) && !G.divine) { mouse.r = true; onRightDown(); }
    if (released(2)) mouse.r = false;
    if (pressed(1)) { if (G.divine) skipDivination(); else closeAll(); }
    if (pressed(9) && G.running && !G.divine) { closeAll(); openMenu(); }
    if (pressed(12) && G.running) togglePanel('skills'); if (pressed(13) && G.running) togglePanel('inv'); if (pressed(8) && G.running) togglePanel('char');
    return;
  }
  if (P.dead) return;
  PAD.cur.x = mouse.x; PAD.cur.y = mouse.y;
  // move with the left stick: a short path just ahead of the hero, renewed every frame
  if (lx || ly) {
    const w = stickToWorld(lx, ly), m = Math.min(1, Math.hypot(lx, ly));
    P.target = null; P.approach = null; P.path = [{ x: P.x + w.x * (0.35 + 0.5 * m), y: P.y + w.y * (0.35 + 0.5 * m) }]; PAD.lastMove = G.time;
    P.lastDir = { x: w.x, y: w.y };
  } else if (G.time - PAD.lastMove < 0.1 && P.path && P.path.length === 1) P.path = null;
  // aim: the right stick points; left alone, it tracks the nearest enemy (or the way you face)
  let aim;
  if (rx || ry) { const w = stickToWorld(rx, ry); aim = { x: P.x + w.x * 4, y: P.y + w.y * 4 }; PAD.aimT = 1.2; }
  else if ((PAD.aimT -= dt) > 0 && PAD.aim) aim = PAD.aim;
  else { const t = autoTarget(9); aim = { x: t.x, y: t.y }; }
  PAD.aim = aim; aimMouseAt(aim);
  // A: attack or the left skill at what you aim at; near a chest, item or lantern it uses that instead
  if (pressed(0)) {
    const it = G.zone.items.find(g => Math.hypot(g.x - P.x, g.y - P.y) < 1.3), ob = G.zone.objects.find(o => Math.hypot(o.x - P.x, o.y - P.y) < 1.8 && !(o.type === 'chest' && o.open) && !(o.type === 'shrine' && o.used));
    if (it) pickup(it); else if (ob) interact(ob);
    else PAD.aHeld = true;
  }
  if (released(0)) PAD.aHeld = false;
  if (PAD.aHeld && P.cast <= 0 && !P.target) {
    const m = nearestMonTo(aim, 1.6) || autoTarget(P.left === 'attack' ? (hasWand() ? WAND_RANGE : 5.5) : 9).m;
    if (m) P.target = P.left === 'attack' ? { kind: 'mon', ref: m } : { kind: 'castMon', ref: m };
    else if (P.left !== 'attack') castSkill(P.left, aim);
  }
  // X or RT: the right skill, held like the right mouse button
  const rNow = down[2] || down[7];
  if (rNow && !PAD.rHeld) { mouse.r = true; PAD.rHeld = true; onRightDown(); }
  if (!rNow && PAD.rHeld) { mouse.r = false; PAD.rHeld = false; }
  if (pressed(1)) tryRoll();
  if (pressed(3)) { const low = P.hp < D.maxHp * 0.7 || P.mana > D.maxMana * 0.4; let i = P.belt.findIndex(s => s && s.kind === (low ? 'hp' : 'mp')); if (i < 0) i = P.belt.findIndex(s => s); if (i >= 0) drinkBelt(i); else say('No potions in your belt', 1); }
  const cyc = (cur, dir, left) => { const L = ['attack'].concat(SK_ORDER.filter(id => (SK[id].cls === P.cls || (!SK[id].cls && P.cls === 'animancer')) && (SK[id].kind === 'cast' || SK[id].kind === 'hold') && P.skills[id] > 0)); if (!L.length) return null; const i = L.indexOf(cur); return L[(i + dir + L.length) % L.length]; };
  if (pressed(4) || pressed(5)) { const n = cyc(P.right, pressed(5) ? 1 : -1, false); if (n) setRight(n); }
  if (pressed(14) || pressed(15)) { const n = cyc(P.left, pressed(15) ? 1 : -1, true); if (n) setLeft(n); }
  if (pressed(12)) togglePanel('skills'); if (pressed(13)) togglePanel('inv'); if (pressed(8)) togglePanel('char');
  if (pressed(6)) G.map = !G.map;
  if (pressed(9)) openMenu();
}
// the controller's cursor, drawn only while it is steering menus
function drawPadCursor() {
  if (!PAD.on || !padMenuMode()) return;
  const x = Math.round(mouse.x), y = Math.round(mouse.y);
  ctx.fillStyle = '#0a090d'; ctx.fillRect(x - 1, y - 1, 3, 9); ctx.fillRect(x - 1, y - 1, 7, 3);
  ctx.fillStyle = '#d9a441'; ctx.fillRect(x, y, 1, 7); ctx.fillRect(x, y, 5, 1); ctx.fillStyle = '#ffe9b0'; ctx.fillRect(x, y, 1, 1);
}
// a real mouse movement takes the cursor back from the controller
cv.addEventListener('mousemove', () => { if (PAD.on) { PAD.cur.x = mouse.x; PAD.cur.y = mouse.y; } });
