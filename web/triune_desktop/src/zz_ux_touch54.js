// zz_ux_touch54.js (v0.54) — phone controls, second pass. The user (2026-09-29): "the button you assign to auto attack...
// bring that back. I want to be able to find a skill or attack to it that the game uses for autoattack and autoattack
// still feels hard to engage, sometimes it doesn't attack"; "The mobile tool tip. Press option doesn't work well enough".
//  - AUTO is back in the right-hand column, showing the skill it uses. Tap it: auto-attack on or off. Hold it: choose
//    what auto-attack uses (the plain attack or any cast skill you know). The choice is saved with the character.
//  - Engaging: auto now also turns on a foe that is on you while you walk, strikes from the edge of reach instead of
//    shuffling closer forever when bodies block the last step, and falls back to the plain attack when the chosen
//    skill cannot be paid.
//  - A long press pins the details as a card on the far side of the screen from your finger, so your hand never
//    covers it, with a small mark on the thing it describes. It stays until your next touch.
(function () {
  if (typeof TOUCH === 'undefined') return;
  const AX = 452, AY = 70;

  // ---- the column: LOOT, AUTO, the right skill, DRINK, ROLL
  const _tb = touchButtons;
  touchButtons = function () {
    const b = _tb.apply(this, arguments);
    b.splice(1, 0, { id: 'auto', x: AX, y: AY, r: 12, label: 'AUTO' });
    return b;
  };
  const autoSkillOk = id => id === 'attack' || (id && SK[id] && SK[id].kind === 'cast' && P.skills[id] > 0);
  const autoSkill = () => autoSkillOk(P.autoSkill) ? P.autoSkill : null;
  const _press = pressButton;
  pressButton = function (b, long) {
    if (b.id === 'auto') {
      if (long) { G.pick = 'A'; return; }
      OPT.auto = !autoOn(); saveOpts(); say('Auto-attack ' + (autoOn() ? 'on' : 'off'), 1); return;
    }
    return _press.apply(this, arguments);
  };

  // ---- the picker for AUTO: the plain attack and every cast skill you know, opened beside the bubble
  const _po = pickOptions, _pr = pickRect, _dp = drawPick;
  pickOptions = function () {
    if (G.pick !== 'A') return _po.apply(this, arguments);
    return ['attack'].concat(SK_ORDER.filter(k => SK[k].kind === 'cast' && P.skills[k] > 0 && (SK[k].cls === P.cls || !SK[k].cls)));
  };
  pickRect = function () {
    if (G.pick !== 'A') return _pr.apply(this, arguments);
    const n = Math.max(1, pickOptions().length), per = 6, cols = Math.min(per, n), rows = Math.ceil(n / per), w = cols * 20 + 4, h = rows * 20 + 2;
    return { x: AX - 16 - w, y: Math.max(14, AY - 10), w, h, cols };
  };
  drawPick = function () {
    if (G.pick !== 'A') return _dp.apply(this, arguments);
    const r = pickRect(), opts = pickOptions(), cur = autoSkill() || 'attack';
    ctx.fillStyle = 'rgba(14,13,18,0.97)'; ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = '#3a3446'; ctx.strokeRect(r.x + .5, r.y + .5, r.w - 1, r.h - 1);
    txt('Auto-attack uses', r.x + r.w / 2, r.y - 3, '#d9a441', 'center');
    opts.forEach((id, i) => {
      const x = r.x + 3 + (i % r.cols) * 20, y = r.y + 2 + Math.floor(i / r.cols) * 20;
      skillIcon(id, x, y, id === cur);
      if (id === cur) { ctx.strokeStyle = '#d9a441'; ctx.strokeRect(x - .5, y - .5, 19, 19); }
      uiButton(x, y, 18, 18, () => { P.autoSkill = id; G.pick = null; say('Auto-attack uses ' + (id === 'attack' ? 'your weapon' : SK[id].name), 1.4); });
      if (inRect(mouse, x, y, 18, 18)) { G.hoverSkill = id; tooltip = skillTip(id); }
    });
  };

  // a tap in a skill picker chooses at once (no arming tap, and never read as half of a double tap)
  const _end = endFinger;
  endFinger = function (t) {
    const f = TOUCH.fingers.get(t.identifier);
    if (f && f.mode === 'pending' && G.pick && !f.moved) {
      const r = pickRect();
      if (mouse.x >= r.x && mouse.x < r.x + r.w && mouse.y >= r.y && mouse.y < r.y + r.h) {
        TOUCH.fingers.delete(t.identifier); TOUCH.armed = null; TOUCH.lastTap = null; fireMouse('down', 0); fireMouse('up', 0); return;
      }
    }
    return _end.apply(this, arguments);
  };

  // ---- engaging
  const affordable = id => {
    if (id === 'attack') return true;
    if (P.cls === 'monk' || P.cls === 'hemomancer') return true;              // sand, or life: never short
    const s = SK[id]; if (!s) return false;
    if (s.shards) return (P.shards || 0) >= s.shards;
    return !s.mana || P.mana >= skillCost(id) - 1e-6;
  };
  const threat = () => {
    let best = null, bd = meleeReach() + 1.6;
    for (const m of G.zone.monsters) {
      if (m.dead || m.hidden || (m.fly && m.z > 8) || m.state === 'idle') continue;
      const d = dist(m, P) - m.r; if (d < bd && lineClear(G.zone, P, m)) { bd = d; best = m; }
    }
    return best;
  };
  const _ua = updateAuto;
  updateAuto = function (dt) {
    const t = P.target;
    if (!t || !t.auto) {
      // walking (not holding a finger down to steer) and something is on you: turn and fight it
      if (autoOn() && TOUCH.on && P.path && !mouse.l && !mouse.r && P.cast <= 0 && P.roll <= 0 && !anyPanelOpen() && !P.infuse && !TOUCH.hotHold) {
        const m = threat(); if (m) { P.path = null; P.approach = null; TOUCH.autoT = 0; }
      }
    }
    // the chosen skill: swap P.left for this one decision so the base code picks it, then put it back
    const sk = autoSkill(); if (!sk) return _ua.apply(this, arguments);
    const left0 = P.left, use = affordable(sk) ? sk : 'attack';
    P.left = use;
    try { return _ua.apply(this, arguments); } finally { P.left = left0; if (P.target && P.target.auto && P.target.kind === 'castMon') P.target.skill = use; }
  };
  // strike from the edge of reach: the base code waits to be 0.1 closer than a swing actually reaches, and when
  // other bodies block that last step the hero shuffles forever without swinging
  const _ht = handleTarget;
  handleTarget = function (dt) {
    const t = P.target;
    try {
      if (t && t.auto && t.kind === 'mon' && t.ref && !t.ref.dead && P.cast <= 0 && !(hasWand() && P.left === 'attack')) {
        const m = t.ref, d = dist(m, P), reach = meleeReach() + m.r;
        if (d <= reach - 0.02) { P.path = null; swing(m); return; }
        // chasing without closing in: after a moment, take the swing if it is nearly in reach
        if (d < reach + 0.5) { t.stuckT = (t.stuckT || 0) + dt; if (t.stuckT > 0.5) { t.stuckT = 0; P.path = null; swing(m); return; } } else t.stuckT = 0;
      }
    } catch (e) { }
    return _ht.apply(this, arguments);
  };

  // ---- the details card, pinned away from the finger
  const _upd = updateTouch;
  updateTouch = function (dt) {
    const was = TOUCH.detail, r = _upd.apply(this, arguments);
    if (TOUCH.detail && !was) TOUCH.pin = { x: mouse.x, y: mouse.y };
    if (!TOUCH.detail) TOUCH.pin = null;
    return r;
  };
  const _dt = drawTooltip;
  drawTooltip = function () {
    if (!(TOUCH.on && TOUCH.detail && TOUCH.pin && tooltip)) return _dt.apply(this, arguments);
    const pin = TOUCH.pin, mx = mouse.x, my = mouse.y;
    // the mark on the thing described
    ctx.fillStyle = '#d9a441'; ctx.fillRect(Math.round(pin.x) - 1, Math.round(pin.y) - 3, 2, 6); ctx.fillRect(Math.round(pin.x) - 3, Math.round(pin.y) - 1, 6, 2);
    // the card on the other side: a mouse at the far edge makes the box open away from it
    mouse.x = pin.x < W / 2 ? W - 4 : 4; mouse.y = 5;
    if (pin.x >= W / 2) mouse.x = -6;
    try { _dt.apply(this, arguments); } finally { mouse.x = mx; mouse.y = my; }
    txt('touch anywhere to close', pin.x < W / 2 ? W - 6 : 6, 10, '#8a8494', pin.x < W / 2 ? 'right' : 'left');
  };

  // ---- the AUTO bubble: the skill it uses, a gold ring when on
  const _draw = drawTouchUI;
  drawTouchUI = function () {
    if (!TOUCH.on || !G.running || anyPanelOpen()) return _draw.apply(this, arguments);
    const r = _draw.apply(this, arguments);
    const id = autoSkill() || 'attack', on = autoOn();
    ctx.save(); ctx.beginPath(); ctx.arc(AX, AY, 11, 0, 6.28); ctx.clip();
    ctx.fillStyle = 'rgba(14,12,18,0.9)'; ctx.fillRect(AX - 12, AY - 12, 24, 24);
    ctx.globalAlpha = on ? 1 : 0.45; skillIcon(id, AX - 9, AY - 10, false); ctx.restore();
    ctx.strokeStyle = on ? '#d9a441' : 'rgba(200,190,220,0.45)'; ctx.lineWidth = on ? 1.5 : 1; ctx.beginPath(); ctx.arc(AX, AY, 12, 0, 6.28); ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(8,7,10,0.85)'; ctx.fillRect(AX - 10, AY + 8, 20, 7);
    txt('AUTO', AX, AY + 14, on ? '#e8d8a8' : '#6f6a79', 'center', false);
    return r;
  };
  // ---- the choice is kept with the character
  { const _as = applySave; applySave = function (d) { const r = _as.apply(this, arguments); try { P.autoSkill = d && d.autoSkill || null; } catch (e) { } return r; }; }
  { const _nc = newCharacter; newCharacter = function () { const r = _nc.apply(this, arguments); P.autoSkill = null; return r; }; }
  { const _sv = save; save = function () { const r = _sv.apply(this, arguments); try { if (G.saveKey && P.autoSkill) { const s = localStorage.getItem(G.saveKey); if (s) { const d = JSON.parse(s); d.autoSkill = P.autoSkill; localStorage.setItem(G.saveKey, JSON.stringify(d)); } } } catch (e) { } return r; }; }
  try { window.__spm.touch54 = { autoSkill, threat, affordable, pickRect: () => pickRect(), pickOptions: () => pickOptions(), autoOn: () => autoOn(), setAuto: v => { OPT.auto = v; } }; } catch (e) { }
})();
