// =================================================================== desktop fork: the heavy swing
// Hold the attack button to wind up a heavy swing. A tap is still a normal blow. Held past a short threshold the hero
// holds the wind-up of the attack pose (no new art), an ember gleam gathers on the weapon, and releasing it lunges a
// step toward the centre of the target under the cursor and strikes: more damage, far more poise damage, a heartbeat
// of hit-stop, and a higher poise cost. A full charge flashes and thumps. Walking is slow while charging; a roll
// cancels it. Poise is stamina: nothing locks you out. Under 10% poise the wind-up and the recovery are slower.
// Off in the options ("Hold to charge heavy attacks"): holding repeats normal blows, as in v0.40.
// Covers the basic melee attack on either mouse button and on the pad's A / X / RT. Wands and the Shrine Keeper's
// thrown knives are ranged and are left alone.
{
  const HVC = {
    thr: 0.18,          // hold longer than this and it is a wind-up, not a tap
    charge: 0.75,       // seconds from wind-up start to full charge
    lowPoise: 0.10,     // below this share of max poise the heavy swing is slower (never locked out)
    lowK: 1.35,         // wind-up takes this much longer below lowPoise
    lowRecover: 1.3,    // and the recovery this much longer
    walkK: 0.35,        // walking speed while winding up
    dmg0: 1.25, dmg1: 1.75, dmgFull: 2.0,        // damage multiplier: start of wind-up -> just short of full -> full
    poise0: 2.0, poise1: 3.0, poiseFull: 3.5,    // poise damage per point of damage dealt (a normal blow is 1)
    cost0: 12, costFull: 24,                      // player's poise cost (a roll is 34, a normal blow is 0)
    recover: 1.25,      // the recovery after a heavy blow is this much longer than a normal one
    lungeMax: 0.9, lungeAir: 0.5, lungeT: 0.12,  // root motion: at most this far, over this long
    stop0: 0.06, stopFull: 0.11                   // hit-stop on impact
  };
  const HV = { st: 'idle', heldT: 0, t: 0, m: null, full: false, block: false, fire: false, mul: 0, pmul: 0, hitAny: false, L: null, lastC: 0, sparkT: 0, stats: { heavy: 0, taps: 0, cancels: 0 } };
  if (OPT.heavy === undefined) OPT.heavy = true;

  const hvOn = () => OPT.heavy !== false;
  const hvCapable = () => { try { return !hasWand() && !(typeof miasThrows === 'function' && miasThrows()); } catch (e) { return true; } };
  const padA = () => typeof PAD !== 'undefined' && PAD.aHeld;
  // is an attack button held right now? (left button on a monster / shift, right button, or the pad's A)
  function hvHeld() {
    if (P.dead || !G.running || G.paused) return false;
    return (mouse.l && P.left === 'attack' && !mouse.holdMove) || (mouse.r && P.right === 'attack') || (padA() && P.left === 'attack');
  }
  const poiseLow = () => D && D.maxStam > 0 && P.stam / D.maxStam < HVC.lowPoise;
  const chargeFrac = () => HV.full ? 1 : Math.min(1, HV.t / HVC.charge);
  const charging = () => HV.st === 'charge' || HV.st === 'lunge';

  // ---- the swing: while an attack button is held, the blow waits for the release
  const _swing = swing;
  swing = function (m) {
    if (HV.fire) return _swing.apply(this, arguments);
    // the button came up between frames: settle the wind-up here (the per-frame tick would be too late)
    if (!hvHeld() && (HV.st === 'pre' || HV.st === 'charge') && hvOn() && P.roll <= 0 && P.cast <= 0) { if (m && !m.dead) HV.m = m; hvRelease(HV.st === 'charge'); return; }
    if (HV.st === 'lunge') return;
    if (!hvOn() || !hvCapable() || P.roll > 0 || !hvHeld()) return _swing.apply(this, arguments);
    if (HV.block) return;                                   // a roll or a stagger broke the wind-up: let go and press again
    if (HV.st === 'idle') {
      HV.st = HV.heldT >= HVC.thr ? 'charge' : 'pre'; HV.t = 0; HV.full = false; HV.sparkT = 0;
      P.path = null; endWraith();
    }
    if (HV.st === 'lunge') return;
    if (m && !m.dead) { HV.m = m; faceTo(m.x, m.y); }
  };

  function hvCancel(why) {
    if (HV.st === 'idle') return;
    HV.st = 'idle'; HV.m = null; HV.L = null; HV.block = true; HV.stats.cancels++;
    if (why === 'roll') burst(P.x, P.y, '#6a2a1e', 5, 1.2);
  }
  function clearTarget() { const t = P.target; if (t && ((t.kind === 'mon' && !t.auto) || t.kind === 'leftAt') && !hvHeld()) P.target = null; }
  function fire(m) { HV.fire = true; try { swing(m); } finally { HV.fire = false; } }

  // released: a tap swings normally; a wind-up lunges, then strikes heavy
  function hvRelease(heavy) {
    const m = HV.m && !HV.m.dead ? HV.m : null;
    if (!heavy) { HV.st = 'idle'; HV.m = null; HV.stats.taps++; fire(m); clearTarget(); return; }
    const c = chargeFrac(), low = poiseLow();
    // aim at the centre of the creature under the cursor; else the one being charged at; else the cursor
    const h = G.hover && G.hover.kind === 'mon' && G.hover.ref && !G.hover.ref.dead ? G.hover.ref : null;
    const tg = h || m, a = tg ? { x: tg.x, y: tg.y } : aimPoint();
    const dx = a.x - P.x, dy = a.y - P.y, l = Math.hypot(dx, dy) || 1;
    const want = tg ? l - ((P.r || 0.35) + tg.r + 0.25) : HVC.lungeAir;
    const len = Math.max(0, Math.min(HVC.lungeMax, want));
    // the cost: taken on release, and never refused
    P.stam = Math.max(0, P.stam - (HVC.cost0 + (HVC.costFull - HVC.cost0) * c)); P.stamDelay = POISE.delay;
    HV.st = 'lunge'; HV.m = tg; HV.lastC = c;
    HV.L = { dx: dx / l, dy: dy / l, left: len, spd: len / HVC.lungeT, t: HVC.lungeT, c, full: HV.full, low };
    P.cast = HVC.lungeT + 0.05; P.path = null; faceTo(a.x, a.y);
    sfx(110, 0.1, 'triangle', 0.04, -40);
  }
  function hvStrike() {
    const L = HV.L, c = L.c; let m = HV.m && !HV.m.dead ? HV.m : null;
    if (!m) m = nearestMonTo({ x: P.x + L.dx, y: P.y + L.dy }, 1.3);
    HV.st = 'idle'; HV.L = null; HV.m = null; HV.stats.heavy++;
    P.cast = 0;
    HV.mul = L.full ? HVC.dmgFull : HVC.dmg0 + (HVC.dmg1 - HVC.dmg0) * c;
    HV.pmul = L.full ? HVC.poiseFull : HVC.poise0 + (HVC.poise1 - HVC.poise0) * c;
    HV.hitAny = false;
    try { fire(m); } finally { HV.mul = 0; HV.pmul = 0; }
    P.cast *= HVC.recover * (L.low ? HVC.lowRecover : 1); P.swing = Math.max(P.swing, 0.26);
    if (HV.hitAny) {
      hitStop(HVC.stop0 + (HVC.stopFull - HVC.stop0) * c);
      G.shake = Math.max(G.shake, 1.5 + 2 * c);
      if (m) { burst(m.x, m.y, '#b8402a', 6 + Math.round(6 * c), 1.8); parts.push({ ring: true, x: m.x, y: m.y, r: 0.15, max: 0.7 + m.r, t: 0.25, col: '#8a2a1c' }); }
      sfx(95, 0.16, 'square', 0.05, -50);
    }
    clearTarget();
  }

  // ---- damage and poise, only inside a heavy swing (the blow, its carry to neighbours and its on-swing procs)
  const _hm = hurtMon;
  hurtMon = function (m, dmg, col) {
    const k = HV.mul;
    if (!(k > 0) || !m || m.dead) return _hm.apply(this, arguments);
    const hp0 = m.hp, pk = HV.pmul;
    HV.mul = 0; HV.pmul = 0;
    try { _hm.call(this, m, dmg * k, col); }
    finally { HV.mul = k; HV.pmul = pk; }
    const dealt = hp0 - m.hp;
    if (dealt > 0) { HV.hitAny = true; if (!m.dead && pk > 1) poiseHit(m, dealt * (pk - 1)); }
  };

  // ---- per frame: the hold timer, the wind-up, the lunge
  function hvTick(dt, held) {
    if (!held) HV.block = false;
    if (HV.st === 'idle') return;
    if (HV.st === 'lunge') {
      const L = HV.L;
      if (P.dead || !L) { HV.st = 'idle'; HV.L = null; return; }
      const s = Math.min(L.left, L.spd * dt);
      if (s > 0) { moveCircle(P, L.dx * s, L.dy * s); L.left -= s; }
      L.t -= dt; if (L.t <= 0 || L.left <= 1e-3) hvStrike();
      return;
    }
    if (P.dead || !hvOn() || !hvCapable()) { HV.st = 'idle'; HV.m = null; return; }
    if (P.roll > 0) { hvCancel('roll'); return; }
    if (P.stagger > 0 || P.cast > 0) { hvCancel('stagger'); return; }
    if (HV.m && HV.m.dead) HV.m = null;
    if (HV.st === 'pre') {
      if (!held) { hvRelease(false); return; }
      if (HV.heldT >= HVC.thr) { HV.st = 'charge'; HV.t = 0; }
      return;
    }
    // charging
    HV.t += dt / (poiseLow() ? HVC.lowK : 1);
    if (!HV.full && HV.t >= HVC.charge) {
      HV.full = true;
      parts.push({ ring: true, x: P.x, y: P.y, r: 0.2, max: 1.0, t: 0.32, col: '#c0482c' });
      burst(P.x, P.y, '#9a3020', 8, 1.4);
      sfx(80, 0.22, 'square', 0.05, -25); sfx(330, 0.09, 'triangle', 0.03, -180);
    }
    const tg = HV.m || (G.hover && G.hover.kind === 'mon' && G.hover.ref);
    if (tg && !tg.dead) faceTo(tg.x, tg.y); else if (!(P.path && P.path.length)) { const a = aimPoint(); faceTo(a.x, a.y); }
    // embers drift off the weapon as it gathers
    const c = chargeFrac(); HV.sparkT -= dt;
    if (HV.sparkT <= 0) { HV.sparkT = 0.12 - 0.07 * c; parts.push({ x: P.x + rand(-0.2, 0.2) + (P.face || 1) * 0.25, y: P.y + rand(-0.2, 0.2), z: 10 + Math.random() * 6, vx: rand(-0.3, 0.3), vy: rand(-0.3, 0.3), vz: 8 + Math.random() * 10, t: 0.4, col: Math.random() < 0.3 ? '#d86a3a' : '#7a2418' }); }
    if (!held) hvRelease(true);
  }
  const _up = updatePlayer;
  updatePlayer = function (dt) {
    const held = hvHeld();
    HV.heldT = held ? HV.heldT + dt : 0;
    const r = _up.apply(this, arguments);
    try { hvTick(dt, held); } catch (e) { HV.st = 'idle'; HV.L = null; reportError(e); }
    return r;
  };
  // slow walking while winding up
  const _fp = followPath;
  followPath = function (dt) { return _fp.call(this, HV.st === 'charge' || HV.st === 'pre' ? dt * HVC.walkK : dt); };

  // ---- the pose: hold the attack's wind-up frame while charging and lunging
  const _hp = heroPose;
  heroPose = function () { const r = _hp.apply(this, arguments); return charging() ? ['atk', 0] : r; };

  // remember how tall the hero's current frame stands, so the gleam sits at the weapon hand whatever the class
  const _hf = heroFrame;
  heroFrame = function (cls) { const fr = _hf.apply(this, arguments); if (fr && cls === P.cls && fr.oy > 0) { HV.frH = fr.oy; HV.frW = fr.w || 0; } return fr; };
  // v0.59 (user): no glow while charging or attacking; the wind-up pose carries the charge

  // ---- the options menu: one more toggle, saved with the rest
  {
    const box = document.getElementById('menuOpts');
    if (box && !document.getElementById('oHeavy')) {
      const b = document.createElement('button'); b.id = 'oHeavy'; b.type = 'button'; b.className = 'ghost';
      box.appendChild(b);
      b.addEventListener('click', () => { OPT.heavy = OPT.heavy === false; saveOpts(); if (!hvOn()) hvCancel(); HV.block = false; optLabels(); });
    }
    const _ol = optLabels;
    optLabels = function () { const r = _ol.apply(this, arguments); const e = document.getElementById('oHeavy'); if (e) e.textContent = 'Hold to charge heavy attacks: ' + (hvOn() ? 'on' : 'off'); return r; };
    optLabels();
  }
  if (typeof window !== 'undefined' && window.__spm) Object.assign(window.__spm, { HV, HVC, swingNow: m => swing(m), hvHeld });
}
