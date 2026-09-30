// zz_zz_study82.js — the user (2026-09-29), on the game study's ideas: "I liked the other things you mentioned, except the
// throwable light." Four of them, in our own style:
//  1. TURN THE WICK DOWN (Darkest Dungeon's torch, D2's light radius): L, or a tap on the lantern, turns your wick down.
//     The pool shrinks; things notice you later (you can slip past); but they hit harder when they find you, and what you
//     find in the dark is better (more magic find, more gold). Turn it up again the same way.
//  2. THE FINISHING BLOW (Blasphemous' executions, made brief): a melee blow on a creature reeling from a poise break
//     lands heavy (2.2x) and gives something back: a draught of your order's power and a little poise.
//  3. THE LANTERN KEEPS A LITTLE (Blasphemous' Guilt, our Wickbound lore): each fall, the lantern keeps a little of you.
//     Up to three times: each costs 12% of its light and 10% of what you find. What it kept waits where you fell, a small
//     pale light; reach it and the lantern takes it all back.
//  4. THE SOUND OF A DROP (Diablo II): each kind of find has its own sound, so you hear a rare fall before you see it.
(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rederive = () => { try { if (typeof derive === 'function') { D = derive(); P.hp = Math.min(P.hp, D.maxHp); P.mana = Math.min(P.mana, D.maxMana); } } catch (e) { } };
  // ------------------------------------------------------------------ 1 + 3: the lantern's light, dimmed by choice or by what it kept
  const LS = { dim: false, k: 1 };
  const kept = () => clamp(P.kept || 0, 0, 3);
  const target = () => (LS.dim ? 0.62 : 1) * (1 - 0.12 * kept());
  const _lm = window.__lampMood;
  window.__lampMood = function () { LS.k += (target() - LS.k) * 0.08; return (_lm ? _lm() : 1) * LS.k; };
  window.__wick82 = LS;
  function setDim(on) {
    if (P.dead || !G.running) return;
    LS.dim = on; rederive();
    if (typeof say === 'function') say(on ? 'You turn the wick down. The dark comes closer.' : 'You turn the wick up.', 1.6);
    if (typeof sfx === 'function') sfx(on ? 180 : 260, 0.18, 'sine', 0.025, on ? -60 : 60);
  }
  addEventListener('keydown', e => { if (!G.running || G.divine || e.repeat) return; if ((e.key || '').toLowerCase() === 'l' && !(G.panels && Object.values(G.panels).some(Boolean))) setDim(!LS.dim); });
  // a tap or click right on the lantern
  try {
    cv.addEventListener('pointerdown', e => {
      if (!G.running || P.dead || !window.__plLamp) return;
      const L = window.__plLamp(); if (!L) return;
      const r = cv.getBoundingClientRect(), s = RS * ZK, x = (e.clientX - r.left) / r.width * (cv.width / s), y = (e.clientY - r.top) / r.height * (cv.height / s);
      if (Math.hypot(x - L.x, y - L.y) < 7) { e.stopImmediatePropagation(); e.preventDefault(); setDim(!LS.dim); }
    }, true);
  } catch (e) { }
  if (typeof derive === 'function') {
    const _d = derive;
    derive = function () {
      const d = _d.apply(this, arguments);
      try {
        if (LS.dim) { d.mf = (d.mf || 0) + 40; d.goldK = (d.goldK || 1) * 1.25; }
        const k = kept(); if (k) { d.mf = (d.mf || 0) - 10 * k; d.goldK = (d.goldK || 1) * (1 - 0.1 * k); }
      } catch (e) { }
      return d;
    };
  }
  if (typeof wakeRange === 'function') { const _w = wakeRange; wakeRange = function () { return _w.apply(this, arguments) * (LS.dim ? 0.7 : 1); }; }
  if (typeof hurtPlayer === 'function') { const _hp = hurtPlayer; hurtPlayer = function (dmg) { const a = Array.prototype.slice.call(arguments); if (LS.dim && a[0] > 0) a[0] *= 1.15; return _hp.apply(this, a); }; }
  // ------------------------------------------------------------------ 3: the fall, and taking it back
  if (typeof die === 'function') {
    const _die = die;
    die = function () {
      const z = G.zone, x = P.x, y = P.y, r = _die.apply(this, arguments);
      try {
        P.kept = clamp((P.kept || 0) + 1, 0, 3);
        if (!P.remnant && z) P.remnant = { zone: z.id, x, y, gold: 0 };
        LS.dim = false; rederive();
      } catch (e) { }
      return r;
    };
  }
  let hadRem = null;
  function watchRemnant() {
    const R = P.remnant;
    if (hadRem && !R && !P.dead && (P.kept || 0) > 0) {   // it was reached
      P.kept = 0; rederive();
      if (typeof say === 'function') say('The lantern takes back what it kept.', 2.2);
      try { P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.25); } catch (e) { }
      if (typeof sfx === 'function') { sfx(392, 0.5, 'sine', 0.03, 40); setTimeout(() => sfx(523, 0.7, 'sine', 0.025, 20), 140); }
    }
    hadRem = R;
    // the gold rule: a remnant with no gold still waits (the old code only lifts one with gold in it)
    if (R && !P.dead && G.zone && R.zone === G.zone.id) {
      const d = Math.hypot(R.x - P.x, R.y - P.y);
      if (d > 2.5) R.armed = true;                       // you have to come back to it
      if (!R.gold && R.armed && d < 0.8) P.remnant = null;
    }
  }
  // what waits where you fell: a small pale light at knee height, breathing, with a thread of light rising off it
  window.__emberDraw = function (p) {
    const t = G.time, b = 0.7 + 0.3 * Math.sin(t * 1.3), y = p.sy - 7 - Math.sin(t * 0.9) * 1.5;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(p.sx, y, 12, '230,220,200', 0.14 * b); glow(p.sx, y, 5, '240,232,214', 0.4 * b);
    ctx.globalAlpha = 0.9 * b; ctx.fillStyle = '#fbf3e2'; ctx.fillRect(Math.round(p.sx), Math.round(y), 1, 1);
    for (let i = 1; i < 7; i++) { ctx.globalAlpha = 0.28 * b * (1 - i / 7); ctx.fillRect(Math.round(p.sx + Math.sin(t * 1.7 + i) * 0.8), Math.round(y - i * 2), 1, 1); }
    ctx.restore();
  };
  window.__extraHoles = function () {
    const R = P.remnant; if (!R || !G.zone || R.zone !== G.zone.id) return [];
    const p = iso(R.x, R.y); return [{ x: p.sx, y: p.sy, r: 12, core: 0.3, far: 1.5, w: 0.3, rgb: [230, 220, 200] }];
  };
  // ------------------------------------------------------------------ 2: the finishing blow
  if (typeof hurtMon === 'function') {
    const _hm = hurtMon;
    hurtMon = function (m, dmg, col) {
      let fin = false;
      try {
        if (m && !m.dead && m.reel > 0 && P.swing > 0 && !G.hitSrc && dmg > 0 && !(m._finT > G.time - 1.5)) { dmg *= 2.2; m._finT = G.time; fin = true; }
      } catch (e) { }
      const r = _hm.call(this, m, dmg, col);
      if (fin) try {
        if (P.cls === 'monk') { P.kR = (P.kR || 0) * 0.8; P.kA = (P.kA || 0) * 0.8; }
        else P.mana = Math.min(D.maxMana, (P.mana || 0) + D.maxMana * 0.15);
        if (P.cls === 'animancer' && typeof spawnWisp === 'function' && typeof effCap === 'function' && P.wisps.length < effCap()) spawnWisp();
        P.stam = Math.min(D.maxStam, (P.stam || 0) + 20);
        if (typeof hitStop === 'function') hitStop(0.09);
        G.shake = Math.max(G.shake || 0, 3);
        if (typeof sfx === 'function') sfx(90, 0.22, 'square', 0.05, -50);
      } catch (e) { }
      return r;
    };
  }
  // ------------------------------------------------------------------ 4: the sound of a drop
  const RANK = { normal: 1, magic: 2, rare: 3, set: 4, unique: 5 };
  function dropSound(items) {
    if (typeof sfx !== 'function' || !items.length) return;
    let best = 0, gold = false;
    for (const g of items) { if (g.gold) gold = true; else if (g.item && !g.item.potion) best = Math.max(best, RANK[g.item.q] || 1); else if (g.item && g.item.potion) best = Math.max(best, 1); }
    const at = (ms, f) => setTimeout(f, ms);
    if (best >= 5) { sfx(196, 1.4, 'sine', 0.05, -4); at(60, () => sfx(392, 1.1, 'sine', 0.03, -6)); at(160, () => sfx(588, 0.9, 'sine', 0.018)); }   // a deep bell
    else if (best >= 3) { sfx(880, 0.3, 'sine', 0.035); at(110, () => sfx(1318, 0.45, 'sine', 0.03)); }   // two clear notes
    else if (best === 2) { sfx(1560, 0.14, 'triangle', 0.028, -220); }   // a glassy tick
    else if (best === 1) { sfx(170, 0.07, 'square', 0.018, -50); }   // a dull fall
    // v0.88 (user): gold makes no sound when it drops
  }
  function watchDrops(fn) {
    return function () {
      const z = G.zone, n0 = z && z.items ? z.items.length : 0, r = fn.apply(this, arguments);
      try { if (z && z.items && z.items.length > n0) dropSound(z.items.slice(n0)); } catch (e) { }
      return r;
    };
  }
  if (typeof dropLoot === 'function') dropLoot = watchDrops(dropLoot);
  if (typeof dropItem === 'function') dropItem = watchDrops(dropItem);
  // ------------------------------------------------------------------ tick
  if (typeof updateMonsters === 'function') { const _um = updateMonsters; updateMonsters = function () { try { watchRemnant(); } catch (e) { } return _um.apply(this, arguments); }; }
  try { window.__study82 = { LS, setDim, dropSound, hurt: (m, d) => hurtMon(m, d), die: () => die() }; } catch (e) { }
})();
