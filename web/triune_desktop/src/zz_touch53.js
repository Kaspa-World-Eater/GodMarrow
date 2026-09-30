// zz_touch53.js (v0.53) — the phone controls, as the user asked (2026-09-28):
//  - "It should only have the one ... skill set on the right click as a single bubble. Drink and roll are fine."
//    The right-hand column is now: LOOT (show items on the ground), the right-click skill, DRINK, ROLL.
//    Tap the skill bubble to cast it at the nearest foe; hold it to open the skill picker (hold skills keep casting).
//  - "Mobile can't hit shift to see details ... we don't need a button for shift, just a long press."
//    A long press over a panel or the bar shows the full details (what Shift shows) until your next touch.
//    A quick double tap on something in a panel does what a right click does (equip, drink, sell, set a skill).
//  - "an onscreen button we can press to show items on ground": LOOT toggles the labels (what Alt shows).
(function () {
  if (typeof TOUCH === 'undefined') return;
  TOUCH.loot = false; TOUCH.detail = false;

  touchButtons = function () {
    const b = [];
    b.push({ id: 'loot', x: 452, y: 40, r: 11, label: 'LOOT' });
    const sk = P.right && SK[P.right] && P.right !== 'attack' ? P.right : null;
    if (sk) b.push({ id: 'skill', skill: sk, x: 452, y: HUD_Y - 94, r: 14 });
    b.push({ id: 'potion', x: 452, y: HUD_Y - 64, r: 11, label: 'DRINK' });
    b.push({ id: 'roll', x: 452, y: HUD_Y - 36, r: 13, label: 'ROLL' });
    return b;
  };

  const _press = pressButton;
  pressButton = function (b, long) {
    if (b.id === 'loot') { TOUCH.loot = !TOUCH.loot; if (!TOUCH.loot) keys.delete('alt'); return; }
    if (b.id === 'skill' && long) { G.pick = 'R'; return; }   // hold the bubble: choose what it casts
    return _press.apply(this, arguments);
  };

  // long press = details (Shift); it stays on until the next touch
  const clearDetail = () => { if (TOUCH.detail) { TOUCH.detail = false; keys.delete('shift'); } };
  cv.addEventListener('touchstart', () => clearDetail(), { passive: true });

  const _upd = updateTouch;
  updateTouch = function (dt) {
    if (TOUCH.on && G.running) {
      const now = performance.now();
      for (const f of TOUCH.fingers.values()) if (f.mode === 'pending' && now - f.t0 >= TOUCH.hold * 1000) {
        f.mode = 'detail'; TOUCH.detail = true; keys.add('shift');
        if (navigator.vibrate) try { navigator.vibrate(10); } catch (e) { }
      }
      if (TOUCH.loot) keys.add('alt');
      if (TOUCH.detail) keys.add('shift');
    }
    return _upd.apply(this, arguments);
  };

  const _end = endFinger;
  endFinger = function (t) {
    const f = TOUCH.fingers.get(t.identifier);
    if (f && f.mode === 'detail') { TOUCH.fingers.delete(t.identifier); return; }   // lifting just leaves the details up
    if (f && f.mode === 'pending' && mouse.y < HUD_Y && anyPanelOpen() && !f.moved) {
      // a quick second tap on the same spot is a right click
      const now = performance.now(), L = TOUCH.lastTap;
      if (L && now - L.t < 380 && Math.hypot(mouse.x - L.x, mouse.y - L.y) < 8) {
        TOUCH.fingers.delete(t.identifier); TOUCH.lastTap = null; TOUCH.armed = null;
        fireMouse('down', 2); fireMouse('up', 2); return;
      }
      TOUCH.lastTap = { t: now, x: mouse.x, y: mouse.y };
    }
    return _end.apply(this, arguments);
  };

  // the bubbles: LOOT lit while the labels are on; a short line under the skill bubble says what holding it does
  const _draw = drawTouchUI;
  drawTouchUI = function () {
    const r = _draw.apply(this, arguments);
    if (!TOUCH.on || !G.running || anyPanelOpen()) return r;
    if (TOUCH.loot) { ctx.strokeStyle = '#d9a441'; ctx.beginPath(); ctx.arc(452, 40, 12.5, 0, 6.28); ctx.stroke(); }
    return r;
  };
  try { window.__spm.TOUCH = TOUCH; window.__spm.keys = keys; } catch (e) { }
})();
