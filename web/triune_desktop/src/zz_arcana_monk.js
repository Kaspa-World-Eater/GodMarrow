// zz_arcana_monk.js · The Mendicant Cartomancer · THE KUSHO'S ARCANA
// The Kusho (code class 'monk') had no cards, so his web was empty and his three keystone sockets on the Long Web
// never lit. Here: 9 Majors (three per page: Radiance, Absence, Destroyer), 15 Minors (five per page) and two hybrids
// (the Hollow, his god, with the Lantern and with the Tower). Each card changes one Kusho skill. Everything is done
// by wrapping zw_monk.js's functions from this file; no other file is edited. Card effects never add waits and never
// add skill levels; one reversed Major on each page turns a skill from melee to ranged or back.
// The keystone sockets (zz_arcana_web.js) read WEB_DEF[cls].clusters[i].majors and .hybrids, so WEB_DEF.monk below
// is all they need to light.
(() => {
  if (typeof ARC === 'undefined' || typeof WEB_DEF === 'undefined' || typeof MONK_SK === 'undefined') return;

  // ------------------------------------------------------------------ the cards
  Object.assign(ARC, {
    // Kusho · Radiance
    kr_noon: { cls: 'monk', kind: 'major', name: 'The Noon That Falls', up: 'Fist-Of-High-Noon does not fall alone: two lesser fists follow on the nearest enemies around the first, at half strength.', rev: 'Melee: the fist is your own. Fist-Of-High-Noon comes down from your hand on the enemy in reach, at once and 60% harder.' },
    kr_star: { cls: 'monk', kind: 'major', name: 'The Morning Star', up: 'The breath sweeps back the way it came: a second pass of Morning-Star-Exhaled follows the first, at 60%.', rev: 'The breath is drawn in, not out: Morning-Star-Exhaled drags what it burns 2 yd toward you and blinds it for half a second, but burns 30% less.' },
    kr_sutra: { cls: 'monk', kind: 'major', name: 'The Burning Sutra', up: 'Each talisman of Sutra-That-Seeks leaves a burning seal where it bursts, searing what stands on it for 3 s.', rev: 'The halo is worn, not loosed: while Sutra-That-Seeks holds talismans, a blow struck on you in melee burns one away, and it bursts on the one who struck for double.' },
    kr_ash: { cls: 'monk', kind: 'minor', name: 'Ash in the Palms', up: 'When Hundred-Hands-Of-Morning ends, the ground where its target stood burns for 4 s.' },
    kr_belly: { cls: 'monk', kind: 'minor', name: 'The Wide Belly', up: 'Laughter-Without-Warmth reaches 20% farther.' },
    kr_tears: { cls: 'monk', kind: 'minor', name: 'Tears Without End', up: 'Tears-For-The-Living lets fall two more tears.' },
    kr_brush: { cls: 'monk', kind: 'minor', name: 'The Quick Brush', up: 'The halo of Sutra-That-Seeks regrows 30% faster.' },
    kr_wax: { cls: 'monk', kind: 'minor', name: 'Cooling Wax', up: 'Amber-That-Eats-Itself eats a third less of your life.' },
    // Kusho · Absence
    ka_spade: { cls: 'monk', kind: 'major', name: 'The Gravedigger', up: 'A shadow torn loose by Spade-That-Cuts-Shadows crawls to the nearest other enemy within 3 yd and pins it too.', rev: 'Ranged: the spade flings its cut as a black crescent. Spade-That-Cuts-Shadows flies 7 yd through everything, tearing the shadows of all it crosses, at 80%.' },
    ka_palm: { cls: 'monk', kind: 'major', name: 'The Hungry Ghost', up: 'Palm-That-Is-Hungry eats what it gathers: an enemy dragged to your feet with less than 15% of its life is swallowed whole (not uniques or bosses).', rev: 'The palm casts out instead of drawing in: Palm-That-Is-Hungry throws everything in its reach out to the edge, stunned for 1 s, tearing at it as it goes.' },
    ka_clap: { cls: 'monk', kind: 'major', name: 'The Unstruck Bell', up: 'The clap is answered: a second, wider ring of Clap-That-Ends-Speech follows 0.4 s later, at 60%.', rev: 'Clap-That-Ends-Speech makes no sound. It stuns nothing, but it unmakes every enemy missile within 6 yd, and what stands in the ring cannot strike for 4 s.' },
    ka_bowl: { cls: 'monk', kind: 'minor', name: 'Alms of Nothing', up: 'Drinking from the Bowl-That-Holds-Nothing also restores 3% of your Essence for each thing it held.' },
    ka_roots: { cls: 'monk', kind: 'minor', name: 'The Starved Take Root', up: 'The roots of Spit-For-The-Starving stay 1 s longer.' },
    ka_grip: { cls: 'monk', kind: 'minor', name: 'Cold Fingers Below', up: 'Hand-From-Below holds its prey 1 s longer (bosses excepted).' },
    ka_pitch: { cls: 'monk', kind: 'minor', name: 'Pitch on the Soles', up: 'Walks-Without-Feet drains a third less Essence.' },
    ka_face: { cls: 'monk', kind: 'minor', name: 'The Faceless Hour', up: 'Mirror-With-No-Face lasts 1 s longer.' },
    // Kusho · Destroyer
    kd_finger: { cls: 'monk', kind: 'major', name: 'The Koan', up: 'The answer hardens: an enemy One-Finger-Truth strikes and does not kill turns to weeping stone for 2 s, and your next blow shatters it.', rev: 'Ranged: the finger points and does not touch. One-Finger-Truth strikes the first enemy in a 7 yd line, through armour, at 80%.' },
    kd_mount: { cls: 'monk', kind: 'major', name: 'The Laughing Mountain', up: 'The mountain lands twice: after Mountain-Falls-Laughing you bounce 2 yd onward and fall again, at 60%.', rev: 'Mountain-Falls-Laughing does not leap: you drop where you stand, and the stone rolls out twice as far and stuns what it strikes.' },
    kd_arms: { cls: 'monk', kind: 'major', name: 'The Thousand-Armed', up: 'The arms of Thousand-Arms-Of-Nothing strike all the way round you, not only in a cone.', rev: 'The arms of Thousand-Arms-Of-Nothing do not strike out. For 6 s they close around you as a shell: blows on you lose 40%, and an arm strikes back at whoever struck you in melee.' },
    kd_bedrock: { cls: 'monk', kind: 'minor', name: 'Bedrock Wakes Far', up: 'Step-That-Wakes-Bedrock raises four more spears at the end of its line.' },
    kd_obsid: { cls: 'monk', kind: 'minor', name: 'Slow-Cooling Obsidian', up: 'Mantra-Of-Obsidian lasts 4 s longer.' },
    kd_stone: { cls: 'monk', kind: 'minor', name: 'Stone Patience', up: 'Grip-Of-Old-Stone holds its stone 1 s longer (bosses excepted).' },
    kd_snap: { cls: 'monk', kind: 'minor', name: 'The Early Snap', up: 'Pagoda-For-One collapses 0.7 s sooner.' },
    kd_door: { cls: 'monk', kind: 'minor', name: 'The Unmoving Door', up: 'Once you have stood still for a second, blows on you lose 10%.' },
    // Kusho · hybrids (his god is the Hollow)
    kh_lantern: { cls: 'monk', kind: 'hybrid', name: 'The Black-Flame Lantern', gods: 'Hollow + Lantern', up: 'While you hold the sky (Halo-That-Turns or Gate-Without-A-Gate), each kill holds it 1 s longer, up to 10 s more.' },
    kh_unraised: { cls: 'monk', kind: 'hybrid', name: 'The Unraised', gods: 'Tower + Hollow', up: 'What the Ossuary raises cannot stand before you: the raised dead take 20% more from you, and one that falls bursts into bone-dust that stuns those beside it for half a second.' }
  });
  // left to right: Radiance, Absence, Destroyer. The first two minors of each page are its trunk; the other three lead
  // one to each Major. The Lantern sits between the two sky pages, the Tower between Absence and stone.
  WEB_DEF.monk = {
    clusters: [
      { page: 0, majors: ['kr_noon', 'kr_star', 'kr_sutra'], minors: ['kr_belly', 'kr_wax', 'kr_ash', 'kr_tears', 'kr_brush'] },
      { page: 1, majors: ['ka_spade', 'ka_palm', 'ka_clap'], minors: ['ka_bowl', 'ka_pitch', 'ka_roots', 'ka_grip', 'ka_face'] },
      { page: 2, majors: ['kd_finger', 'kd_mount', 'kd_arms'], minors: ['kd_door', 'kd_obsid', 'kd_stone', 'kd_bedrock', 'kd_snap'] }
    ],
    hybrids: ['kh_lantern', 'kh_unraised']
  };
  if (typeof SUIT !== 'undefined') SUIT.monk = { name: 'Bowls', face: '#d8c890', ink: '#4a3410' };

  // ------------------------------------------------------------------ small tools
  const on = () => { try { return isMonk() && !P.dead && !!G.zone; } catch (e) { return false; } };
  const later = [];   // [t, fn]: short delays inside the game clock (cleared on a zone change)
  const after = (t, fn) => later.push({ t, fn });
  const tally = k => { G.mkStat = G.mkStat || {}; G.mkStat[k] = (G.mkStat[k] || 0) + 1; };   // counts for the checks
  const lessThanBoss = m => m && m.rank !== 'boss' && m.rank !== 'unique';
  G.mkCres = []; G.mkSeals = []; G.mkLines = []; P.mkShell = 0;
  function clearMine() { later.length = 0; G.mkCres = []; G.mkSeals = []; G.mkLines = []; }

  // a damage scale for a whole call (the bounce of the Laughing Mountain)
  const _kh = kHit;
  kHit = function (m, dmg, col, src) { return _kh(m, dmg * (G.mkK || 1), col, src); };

  // melee and ranged flips: the approach table is read by monkCast, so a reversed card changes it for that one cast
  const _mc = monkCast;
  monkCast = function (id, pt) {
    if (!on()) return _mc.apply(this, arguments);
    const saved = {}, swap = (k, v) => { saved[k] = MONK_MELEE[k]; if (v) MONK_MELEE[k] = v; else delete MONK_MELEE[k]; };
    if (id === 'kfist' && aR('kr_noon')) swap('kfist', [1.5, false]);
    if (id === 'kspade' && aR('ka_spade')) swap('kspade', null);
    if (id === 'kfinger' && aR('kd_finger')) swap('kfinger', null);
    const ob = P.kobsid || 0, mi = P.kmirror || 0, th = G.kthousand;
    let r;
    try { r = _mc.apply(this, arguments); }
    finally { for (const k in saved) { if (saved[k] === undefined) delete MONK_MELEE[k]; else MONK_MELEE[k] = saved[k]; } }
    try {
      if (id === 'kobsid' && aM('kd_obsid') && P.kobsid > ob + 1) { P.kobsid += 4; tally('obsid'); }
      if (id === 'kmirror' && aM('ka_face') && P.kmirror > mi + 0.5) { P.kmirror += 1; tally('face'); }
      if (id === 'kthousand' && aR('kd_arms') && G.kthousand && G.kthousand !== th) {
        G.kthousand = null; P.mkShell = 6; P.cast = 0.4; P.mkShellArm = 0;
        banner('THE THOUSAND CLOSE', '#ffd870', 1.2); sfx(70, 0.8, 'sawtooth', 0.05, 20);
        if (typeof mkShock === 'function') mkShock(P.x, P.y, 1.6, '#6a3a04', '#ffe070', 0.5, 4);
      }
    } catch (e) { reportError(e); }
    return r;
  };

  // ------------------------------------------------------------------ Radiance
  // The Noon That Falls
  const _cf = castFist;
  castFist = function (a) {
    if (!on()) return _cf.apply(this, arguments);
    if (aR('kr_noon')) {
      const m = kMeleeTarget(a, 1.5);
      if (!m) { say('No enemy in reach', 0.8); P.mana += skillCost('kfist'); P._kwhiff = true; P.cast = 0.2; return; }
      G.kfists.push({ x: m.x, y: m.y, m, t: 0, dur: 0.1, dmg: KS.d('kfist', 42, 18) * 1.6, mkHand: true }); tally('noonHand');
      P.swing = 0.22; sfx(300, 0.15, 'square', 0.04, -150); return;
    }
    const n0 = G.kfists.length, r = _cf.apply(this, arguments);
    if (aU('kr_noon') && G.kfists[n0]) G.kfists[n0].mkLead = true;
    return r;
  };
  const _uf = updateFists;
  updateFists = function (dt) {
    const r = _uf.apply(this, arguments);
    if (!on()) return r;
    for (const f of G.kfists) {
      if (!f.mkLead || !f.done || f.mkSpawned) continue;
      f.mkSpawned = true;
      const main = f.m, near = kFoes(f.x, f.y, 4.5, q => q !== main).sort((p, q) => Math.hypot(p.x - f.x, p.y - f.y) - Math.hypot(q.x - f.x, q.y - f.y));
      for (let i = 0; i < 2; i++) {
        const m = near[i], a = Math.random() * 6.283, p = m ? { x: m.x, y: m.y } : { x: f.x + Math.cos(a) * 2, y: f.y + Math.sin(a) * 2 };
        if (!m && G.zone.solidAt(p.x, p.y)) continue;
        G.kfists.push({ x: p.x, y: p.y, m: m || null, t: 0, dur: 0.45 + 0.15 * i, dmg: f.dmg * 0.5, mkLesser: true }); tally('noonLesser');
      }
    }
    return r;
  };
  // The Morning Star
  const _cs = castStar;
  castStar = function (a) {
    const n0 = G.kcones.length, r = _cs.apply(this, arguments);
    if (!on()) return r;
    const c = G.kcones[n0]; if (!c) return r;
    if (aR('kr_star')) { c.dmg *= 0.7; c.mkPull = new Set(); }
    else if (aU('kr_star')) {
      const z = G.zone;
      after(c.dur, () => { if (G.zone !== z) return; G.kcones.push({ x: c.x, y: c.y, ang: c.ang, a0: c.a0, a1: c.a1, t: 0, dur: c.dur, R: c.R, hit: new Set(), dmg: c.dmg * 0.6, mkEcho: true }); tally('starEcho'); sfx(200, 0.4, 'sawtooth', 0.03, 200); });
    }
    return r;
  };
  const _uc = updateCones;
  updateCones = function (dt) {
    const r = _uc.apply(this, arguments);
    if (!on()) return r;
    for (const c of G.kcones) {
      if (!c.mkPull) continue;
      for (const m of c.hit) {
        if (c.mkPull.has(m) || m.dead) continue; c.mkPull.add(m);
        if (m.rank !== 'boss') { const d = Math.hypot(m.x - c.x, m.y - c.y) || 1, k = Math.max(0, Math.min(2, d - 0.9)); for (let i = 0; i < 4; i++) moveCircle(m, (c.x - m.x) / d * k / 4, (c.y - m.y) / d * k / 4); }
        kStun(m, 0.5); m.kdazzle = Math.max(m.kdazzle || 0, 1.5); m.mkDrawn = (m.mkDrawn || 0) + 1;
      }
    }
    return r;
  };
  // The Burning Sutra (upright: seals where the talismans burst)
  const _uo = updateOfuda;
  updateOfuda = function (dt) {
    const before = G.kofuda.slice(), r = _uo.apply(this, arguments);
    if (!on() || !aU('kr_sutra')) return r;
    for (const o of before) if (!G.kofuda.includes(o) && o.delay <= 0 && !G.zone.solidAt(o.x, o.y)) G.mkSeals.push({ x: o.x, y: o.y, t: 3, max: 3, R: 1.1, dmg: o.dmg, tick: 0.2, seed: Math.random() * 6 }), tally('seal');
    while (G.mkSeals.length > 14) G.mkSeals.shift();
    return r;
  };
  // Ash in the Palms
  const _ufl = updateFlurry;
  updateFlurry = function (dt) {
    const F = G.kflurry, r = _ufl.apply(this, arguments);
    if (on() && F && !G.kflurry && aM('kr_ash') && F.m && (F.n >= 20 || F.m.dead)) { fireGround(F.m.x, F.m.y, 1.2, Math.max(4, F.dmg * 10), 4); burst(F.m.x, F.m.y, '#ff9a40', 14, 2); G.mkAshN = (G.mkAshN || 0) + 1; }
    return r;
  };
  // The Wide Belly
  const _lr = KS.laughR;
  KS.laughR = function () { return _lr.apply(this, arguments) * (on() && aM('kr_belly') ? 1.2 : 1); };
  // Tears Without End
  const _ct = castTears;
  castTears = function () {
    const r = _ct.apply(this, arguments);
    if (!on() || !aM('kr_tears')) return r;
    for (let i = 0; i < 2; i++) {
      const a = Math.random() * 6.283, d = rand(1.2, 3.2), p = { x: P.x + Math.cos(a) * d, y: P.y + Math.sin(a) * d };
      if (G.zone.solidAt(p.x, p.y)) continue;
      G.ktears.push({ x: p.x, y: p.y, x0: P.x, y0: P.y - 0.1, fall: 0.5 + i * 0.05, arm: 0.8 + i * 0.05, t: 15, dmg: KS.d('ktears', 16, 7), mkMore: true }); tally('tears');
    }
    while (G.ktears.length > 32) G.ktears.shift();
    return r;
  };

  // ------------------------------------------------------------------ Absence
  function tearShadow(m, ang, k) {
    const lit = lightLevel(m.x, m.y) > 0.3 || m.b.ai === 'pyre';
    if (!(lit || P.skills.kspadew > 0)) return false;
    const kk = (lit ? 1 : 0.5) * (k || 1);
    m.kshadow = { t: 4 * KS.dur() * kk, dps: KS.d('kspade', 7, 3), tick: 0.5 }; kRoot(m, 2.5 * KS.dur() * kk);
    G.kshades.push({ x: m.x, y: m.y, vx: Math.cos(ang) * 2 + rand(-0.5, 0.5), vy: Math.sin(ang) * 2 + rand(-0.5, 0.5), t: 1.1, w: m.r });
    floatText(m.x, m.y - 0.3, 'shadowless', '#8a7aa8'); return true;
  }
  // The Gravedigger
  const _csp = castSpade;
  castSpade = function (a) {
    if (!on()) return _csp.apply(this, arguments);
    if (aR('ka_spade')) {
      const ang = Math.atan2(a.y - P.y, a.x - P.x), spade = monkWpn() === 'spade';
      const dmg = KS.fist() * (1.1 + 0.08 * L1('kspade')) * KS.sky(1) * syn('kspade') * (spade ? 1.3 : 1) * 0.8;
      G.mkCres.push({ x: P.x + Math.cos(ang) * 0.5, y: P.y + Math.sin(ang) * 0.5, vx: Math.cos(ang) * 10, vy: Math.sin(ang) * 10, ang, t: 0.7, max: 0.7, dmg, hit: new Set() });
      G.kslams.push({ x: P.x, y: P.y, t: 0.25, kind: 'arc', a: ang, R: 1.3 });
      sfx(240, 0.18, 'sawtooth', 0.04, -160); if (spade) sfx(90, 0.2, 'triangle', 0.03, -20);
      return;
    }
    const prev = new Map(); for (const m of G.zone.monsters) if (!m.dead) prev.set(m, m.kshadow);
    const r = _csp.apply(this, arguments);
    if (aU('ka_spade')) {
      const ang = Math.atan2(a.y - P.y, a.x - P.x), fresh = G.zone.monsters.filter(m => !m.dead && m.kshadow && m.kshadow !== prev.get(m)), taken = new Set(fresh);
      for (const m of fresh) {
        const o = kNear(m, 3, q => !taken.has(q) && q !== m); if (!o) continue;
        taken.add(o); o.kshadow = { t: 3 * KS.dur(), dps: KS.d('kspade', 7, 3), tick: 0.5 }; kRoot(o, 2 * KS.dur()); o.mkCrawl = (o.mkCrawl || 0) + 1;
        G.kshades.push({ x: m.x, y: m.y, vx: (o.x - m.x) / 1.1, vy: (o.y - m.y) / 1.1, t: 1.1, w: m.r }); floatText(o.x, o.y - 0.3, 'pinned', '#8a7aa8');
      }
    }
    return r;
  };
  function updateCres(dt) {
    for (const c of G.mkCres) {
      c.t -= dt; c.x += c.vx * dt; c.y += c.vy * dt;
      if (G.zone.solidAt(c.x, c.y)) { c.t = 0; burst(c.x, c.y, '#2a2034', 6, 1.2); continue; }
      for (const m of kFoes(c.x, c.y, 0.75)) { if (c.hit.has(m)) continue; c.hit.add(m); kHit(m, c.dmg, '#6a5a8a', 'kspade'); kFault(m); tearShadow(m, c.ang); m.mkCres = (m.mkCres || 0) + 1; }
      if (Math.random() < 0.7) parts.push({ x: c.x + rand(-0.3, 0.3), y: c.y + rand(-0.3, 0.3), z: rand(4, 12), vx: 0, vy: 0, vz: 4, t: 0.35, col: Math.random() < 0.5 ? '#15101f' : '#7a68a4' });
    }
    G.mkCres = G.mkCres.filter(c => c.t > 0);
  }
  // The Hungry Ghost
  const _up = updatePalm;
  updatePalm = function (dt) {
    const H = G.kpalm;
    if (!on() || !H) return _up.apply(this, arguments);
    if (aR('ka_palm')) {
      H.t -= dt; H.tick -= dt; const tick = H.tick <= 0; if (tick) H.tick = 0.2;
      if (!H.mkSt) { H.mkSt = new Set(); if (typeof mkShock === 'function') mkShock(P.x, P.y, H.R, '#050308', '#dcd2f6', 0.8, 3); }
      for (const m of kFoes(P.x, P.y, H.R)) {
        const d = dist(m, P) || 0.05;
        if (m.rank !== 'boss' && d < H.R - 0.2) { const s = Math.min(H.R - d, 8 * dt); moveCircle(m, (m.x - P.x) / d * s, (m.y - P.y) / d * s); }
        if (!H.mkSt.has(m)) { H.mkSt.add(m); kStun(m, 1); m.mkCast = (m.mkCast || 0) + 1; }
        if (tick) kHit(m, KS.d('kpalm', 5, 2.4), '#6a5a8a', 'kpalm');
        if (Math.random() < 0.15) parts.push({ x: m.x, y: m.y, z: 8, vx: (m.x - P.x) / d * 3, vy: (m.y - P.y) / d * 3, vz: 4, t: 0.35, col: '#30264a' });
      }
      if (H.t <= 0) G.kpalm = null;
      return;
    }
    const r = _up.apply(this, arguments);
    if (aU('ka_palm')) for (const m of kFoes(P.x, P.y, 1.3)) {
      if (!lessThanBoss(m) || m.hp >= m.max * 0.15) continue;
      const was = G.kSrc; G.kSrc = 'dust'; floatText(m.x, m.y - 0.3, 'swallowed', '#8a7aa8'); burst(m.x, m.y, '#07050c', 16, 1.8);
      try { killMon(m); } finally { G.kSrc = was; }
      G.mkEaten = (G.mkEaten || 0) + 1; sfx(50, 0.3, 'sine', 0.05, -20);
    }
    return r;
  };
  // The Unstruck Bell
  const _ccl = castClap;
  castClap = function () {
    if (!on()) return _ccl.apply(this, arguments);
    const R = 3.4 + (P.skills.kclapw > 0 ? 1.5 : 0), dmg = KS.d('kclap', 6, 2.6);
    if (aR('ka_clap')) {
      const hush = 4 * KS.dur(); let n = 0, u = 0;
      for (const m of kFoes(P.x, P.y, R)) {
        if (/wind|charge/i.test(m.state || '')) { m.state = 'chase'; m.t = 0; }
        m.cd = Math.max(m.cd || 0, hush); m.kweak = Math.max(m.kweak || 0, hush); m.mkHush = hush; kHit(m, dmg, '#b8a8d8', 'kclap'); floatText(m.x, m.y - 0.3, 'hushed', '#b8a8d8'); n++;
      }
      for (const s of shots) if (s.t > 0 && !s.friendly && Math.hypot(s.x - P.x, s.y - P.y) < 6) { s.t = 0; burst(s.x, s.y, '#dcd2f6', 5, 1.2); u++; }
      G.mkUnmade = (G.mkUnmade || 0) + u;
      G.kclaps.push({ x: P.x, y: P.y, t: 0, dur: 0.45, R }); sfx(1800, 0.05, 'sine', 0.02, -1600);
      if (u) say(`${u} missile${u > 1 ? 's' : ''} unmade`, 1);
      return;
    }
    const r = _ccl.apply(this, arguments);
    if (aU('ka_clap')) {
      const x = P.x, y = P.y, z = G.zone, R2 = R + 1.5, st = 0.35 * KS.dur() * (P.skills.kclapw > 0 ? 2 : 1);
      after(0.4, () => {
        if (G.zone !== z || !isMonk()) return;
        for (const m of kFoes(x, y, R2)) { kStun(m, st); kHit(m, dmg * 0.6, '#b8a8d8', 'kclap'); m.mkEcho = (m.mkEcho || 0) + 1; }
        G.kclaps.push({ x, y, t: 0, dur: 0.45, R: R2 }); G.shake = Math.max(G.shake, 2); sfx(50, 0.3, 'square', 0.05, 0);
      });
    }
    return r;
  };
  // Alms of Nothing
  const _db = drinkBowl;
  drinkBowl = function () {
    const f = P.kbowl || 0, r = _db.apply(this, arguments);
    if (on() && aM('ka_bowl') && f > 0) { P.mana = Math.min(D.maxMana, P.mana + D.maxMana * 0.03 * f); tally('alms'); floatText(P.x, P.y - 0.9, 'alms', '#9fd8ff'); }
    return r;
  };
  // The Starved Take Root
  const _csi = castSpit;
  castSpit = function (a) {
    const n0 = G.kroots.length, r = _csi.apply(this, arguments);
    if (on() && aM('ka_roots') && G.kroots[n0]) { G.kroots[n0].t += 1; G.kroots[n0].max += 1; tally('roots'); }
    return r;
  };
  // Cold Fingers Below
  const _cb = castBelow;
  castBelow = function (a) {
    const n0 = G.khands.length, r = _cb.apply(this, arguments);
    if (on() && aM('ka_grip')) for (const h of G.khands.slice(n0)) if (h.m && h.m.rank !== 'boss') { h.dur += 1; kStun(h.m, h.dur); kRoot(h.m, h.dur); tally('below'); }
    return r;
  };

  // ------------------------------------------------------------------ Destroyer
  // The Koan
  const _cfi = castFinger;
  castFinger = function (a) {
    if (!on()) return _cfi.apply(this, arguments);
    if (aR('kd_finger')) {
      const ang = Math.atan2(a.y - P.y, a.x - P.x), dx = Math.cos(ang), dy = Math.sin(ang), L = 7;
      let m = null, bd = 1e9;
      for (const q of G.zone.monsters) {
        if (q.dead || q.hidden) continue; const ox = q.x - P.x, oy = q.y - P.y, al = ox * dx + oy * dy;
        if (al < 0 || al > L + q.r || Math.abs(ox * dy - oy * dx) > 0.45 + q.r || al >= bd) continue;
        if (!lineClear(G.zone, P, q)) continue; bd = al; m = q;
      }
      if (!m) { say('Nothing in the finger\'s line', 0.8); P.mana += skillCost('kfinger'); P._kwhiff = true; P.cast = 0.2; return; }
      faceTo(m.x, m.y);
      const st = m.kstone > 0, dmg = KS.fist() * (1.7 + 0.16 * L1('kfinger')) * syn('kfinger') * (st ? 2.5 : 1) * 0.8;
      const fd = m.fdir; m.fdir = null; kHit(m, dmg * (100 + m.armor) / 100, '#ffffff', 'kfinger'); m.fdir = fd; kFault(m);
      if (st) floatText(m.x, m.y - 0.4, 'truth', '#ffffff');
      G.kslams.push({ x: m.x, y: m.y, t: 0.5, kind: 'hole', a: ang }); G.mkLines.push({ x0: P.x, y0: P.y, x1: m.x, y1: m.y, t: 0.25 });
      m.mkPointed = (m.mkPointed || 0) + 1;
      sfx(1700, 0.06, 'square', 0.04, -1300); return;
    }
    const m = kMeleeTarget(a, 1.6), r = _cfi.apply(this, arguments);
    if (m && !m.dead && aU('kd_finger')) {
      m.kstone = m.rank === 'boss' ? 1 : 2; kStun(m, m.kstone); kRoot(m, m.kstone); m.mkKoan = (m.mkKoan || 0) + 1;
      burst(m.x, m.y, '#8a867c', 10, 1.4); floatText(m.x, m.y - 0.5, 'the answer hardens', '#b0aca0');
    }
    return r;
  };
  // The Laughing Mountain
  const _cm = castMount;
  castMount = function (a) {
    if (!on() || !aR('kd_mount')) return _cm.apply(this, arguments);
    P.kleap = { x0: P.x, y0: P.y, x1: P.x, y1: P.y, t: 0, dur: 0.35, wk: KS.wK(), mkRev: true }; P.cast = 0.5; P.iframe = Math.max(P.iframe, 0.3);
    monkLaughFx(true); sfx(200, 0.3, 'triangle', 0.03, -100);
  };
  const _ul = updateLeap;
  updateLeap = function (dt) {
    const L = P.kleap; G.mkK = L && L.mkK || 1;
    let r; try { r = _ul.apply(this, arguments); } finally { G.mkK = 1; }
    if (!on() || !L || P.kleap) return r;
    // it landed
    if (L.mkK && G.kquake) G.kquake.dmg *= L.mkK;
    if (L.mkRev && G.kquake) { G.kquake.max += 3; G.kquake.mkStun = new Set(); G.mkDrop = (G.mkDrop || 0) + 1; }
    if (aU('kd_mount') && !L.mkBounce && !L.mkRev) {
      let dx = L.x1 - L.x0, dy = L.y1 - L.y0, d = Math.hypot(dx, dy);
      if (d < 0.2) { const f = monkFacing(); dx = f.x; dy = f.y; d = 1; }
      const p = clampCast({ x: P.x + dx / d * 2.2, y: P.y + dy / d * 2.2 }, 2.2);
      P.kleap = { x0: P.x, y0: P.y, x1: p.x, y1: p.y, t: 0, dur: 0.38, wk: L.wk, mkBounce: true, mkK: 0.6 };
      P.cast = Math.max(P.cast, 0.45); P.iframe = Math.max(P.iframe, 0.4); G.mkBounce = (G.mkBounce || 0) + 1;
      monkLaughFx(true);
    }
    return r;
  };
  const _uq = updateQuake;
  updateQuake = function (dt) {
    const Q = G.kquake, r = _uq.apply(this, arguments);
    if (Q && Q.mkStun) for (const m of Q.hit) if (!Q.mkStun.has(m)) { Q.mkStun.add(m); kStun(m, 0.8); tally('quakeStun'); }
    return r;
  };
  // The Thousand-Armed (upright: the arms strike behind you too)
  const _ut = updateThousand;
  updateThousand = function (dt) {
    const Th = G.kthousand, n0 = Th ? Th.n : 0, r = _ut.apply(this, arguments);
    if (!on() || !Th || Th.n <= n0 || !aU('kd_arms')) return r;
    const L = 5.5;
    for (const m of G.zone.monsters) {
      if (m.dead || m.hidden) continue; const dx = m.x - P.x, dy = m.y - P.y, d = Math.hypot(dx, dy); if (d > L + m.r) continue;
      let da = Math.atan2(dy, dx) - Th.ang; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283; if (Math.abs(da) <= 0.85) continue;
      kHit(m, Th.dmg, Th.n % 2 ? '#ffd870' : '#b0aca0', 'kthousand'); m.mkRound = (m.mkRound || 0) + 1;
      if (!m.kpulv) { m.kpulv = true; m.armor = Math.round(m.armor * 0.5); }
    }
    for (let i = 0; i < 3; i++) { const aa = Th.ang + Math.PI + rand(-2.2, 2.2), rr = rand(1.2, L), gold = Math.random() < 0.5; mkFx({ k: 'palm', x: P.x + Math.cos(aa) * rr, y: P.y + Math.sin(aa) * rr, z: rand(4, 24), sc: rand(1, 1.6), mat: gold ? 'mkGoldFx' : 'mkStoneFx', rgb: gold ? '255,210,110' : '200,196,186', t: 0.3, t0: 0.3 }); }
    return r;
  };
  // Bedrock Wakes Far
  const _cst = castStep;
  castStep = function (a) {
    const n0 = G.kstepQ.length, r = _cst.apply(this, arguments);
    if (on() && aM('kd_bedrock')) for (const q of G.kstepQ.slice(n0)) { q.n += 4; tally('bedrock'); }
    return r;
  };
  // Stone Patience
  const _cg = castGrip;
  castGrip = function (a) {
    const prev = new Map(); for (const m of G.zone.monsters) if (!m.dead) prev.set(m, m.kstone || 0);
    const r = _cg.apply(this, arguments);
    if (on() && aM('kd_stone')) for (const m of G.zone.monsters) if (!m.dead && m.rank !== 'boss' && (m.kstone || 0) > (prev.get(m) || 0) + 0.5) { m.kstone += 1; kStun(m, m.kstone); kRoot(m, m.kstone); tally('stone'); }
    return r;
  };
  // The Early Snap
  const _cpa = castPagoda;
  castPagoda = function (a) {
    const n0 = G.kpagodas.length, r = _cpa.apply(this, arguments);
    if (on() && aM('kd_snap')) for (const p of G.kpagodas.slice(n0)) { p.dur = Math.max(0.6, p.dur - 0.7); tally('snap'); }
    return r;
  };

  // ------------------------------------------------------------------ blows on him: the worn halo, the shell, the door
  const _ht = hitTarget;
  hitTarget = function (T, dmg, type, fx, fy, src) {
    try {
      if (T === P && on() && src && !src.dead && src.hp != null && type === 'phys' && dist(src, P) < 2.6 && P.knothing <= 0) {
        if (aR('kr_sutra') && P.skills.ksutra > 0 && P.khalo > 0 && (P.mkWardT || 0) <= 0) {
          P.khalo--; P.mkWardT = 0.25; const d = KS.d('ksutra', 9, 4) * 2;
          kHit(src, d, '#ffb060', 'ksutra'); burnMon(src, d * 0.2, 2); burst(src.x, src.y, '#ffd870', 12, 2); kRing(src.x, src.y, 1, '#ffb060', 0.25); sfx(420, 0.12, 'square', 0.03, -200);
          G.mkWardN = (G.mkWardN || 0) + 1;
        }
        if (P.mkShell > 0 && (src.mkArmT || 0) <= G.time) {
          src.mkArmT = G.time + 0.3; kHit(src, KS.d('kthousand', 9, 3.5) * 1.5, '#ffd870', 'kthousand'); G.mkRiposte = (G.mkRiposte || 0) + 1;
          const sa = iso(P.x, P.y), sb = iso(src.x, src.y), an = Math.atan2(sb.sy - sa.sy, sb.sx - sa.sx), ai = ((Math.round(an / 6.283 * 16) % 16) + 16) % 16;
          mkFx({ k: 'arm', x: P.x, y: P.y, z: 28, ai, kind: 'fist', mat: 'mkGoldFx', dx: (sb.sx - sa.sx), dy: (sb.sy - sa.sy), t: 0.22, t0: 0.22 });
        }
      }
    } catch (e) { reportError(e); }
    return _ht.apply(this, arguments);
  };
  const _hp = hurtPlayer;
  hurtPlayer = function (dmg, type, fx, fy) {
    if (on()) {
      if (P.mkShell > 0) dmg *= 0.6;
      if (aM('kd_door') && P.kstillT > 1) { dmg *= 0.9; tally('door'); }
      arguments[0] = dmg;
    }
    return _hp.apply(this, arguments);
  };

  // ------------------------------------------------------------------ hybrids
  const _hm = hurtMon;
  hurtMon = function (m, dmg, col) {
    if (m && !m.dead && dmg > 0 && on() && aM('kh_unraised')) { try { if (isRaised(m)) { arguments[1] = dmg * 1.2; tally('unraisedDmg'); } } catch (e) { } }
    return _hm.apply(this, arguments);
  };
  const _km = killMon;
  killMon = function (m) {
    const was = !m || m.dead, r = _km.apply(this, arguments);
    if (was || !m.dead || !on()) return r;
    try {
      const S = G.skyForce;
      if (S && aM('kh_lantern') && (S.mkExt || 0) < 10) { S.mkExt = (S.mkExt || 0) + 1; S.t += 1; S.max += 1; tally('lantern'); if (S.mkExt === 1 || S.mkExt % 5 === 0) floatText(P.x, P.y - 0.9, 'the sky holds', S.kind === 'noon' ? '#fff0b0' : '#b8a0f0'); }
      if (aM('kh_unraised') && isRaised(m)) {
        for (const o of kFoes(m.x, m.y, 1.8)) { kStun(o, 0.5); o.mkDusted = (o.mkDusted || 0) + 1; }
        burst(m.x, m.y, '#d8d0c0', 18, 2.2); kRing(m.x, m.y, 1.8, '#d8d0c0', 0.3);
      }
    } catch (e) { reportError(e); }
    return r;
  };

  // ------------------------------------------------------------------ every frame, and a zone change
  function updateSeals(dt) {
    for (const s of G.mkSeals) {
      s.t -= dt; s.tick -= dt; if (s.tick > 0) continue; s.tick = 0.5;
      for (const m of kFoes(s.x, s.y, s.R)) { kHit(m, s.dmg * 0.25, '#ffb060', 'ksutra'); burnMon(m, s.dmg * 0.1, 1.5); m.mkSealed = (m.mkSealed || 0) + 1; }
    }
    G.mkSeals = G.mkSeals.filter(s => s.t > 0);
  }
  const _um = updateMonk;
  updateMonk = function (dt) {
    const r = _um.apply(this, arguments);
    try {
      for (const l of later) l.t -= dt;
      for (let i = later.length - 1; i >= 0; i--) if (later[i].t <= 0) { const f = later[i].fn; later.splice(i, 1); f(); }
      if (P.mkWardT > 0) P.mkWardT -= dt;
      if (aM('kr_brush') && P.skills.ksutra > 0 && P.khalo < KS.haloMax()) P.khaloT += dt * 0.43;
      if (aM('kr_wax') && P.kamber) P.hp = Math.min(D.maxHp, P.hp + D.maxHp * 0.01 * dt / 3);
      if (aM('ka_pitch') && P.kwalk) P.mana = Math.min(D.maxMana, P.mana + 0.5 * dt);
      if (P.mkShell > 0) {
        P.mkShell -= dt; P.poiseGrace = Math.max(P.poiseGrace || 0, 0.1);
        P.mkShellArm = (P.mkShellArm || 0) - dt;
        if (P.mkShellArm <= 0) { P.mkShellArm = 0.12; const ai = Math.floor(Math.random() * 16), an = ai / 16 * 6.283; mkFx({ k: 'arm', x: P.x, y: P.y, z: 20 + rand(-6, 10), ai, kind: Math.random() < 0.5 ? 'palm' : 'fist', mat: Math.random() < 0.5 ? 'mkGoldFx' : 'mkStoneFx', dx: Math.cos(an) * 14, dy: Math.sin(an) * 7, t: 0.3, t0: 0.3 }); }
        if (P.mkShell <= 0) { P.mkShell = 0; floatText(P.x, P.y - 0.7, 'the arms open', '#ffd870'); }
      }
      updateCres(dt); updateSeals(dt);
      for (const l of G.mkLines) l.t -= dt; G.mkLines = G.mkLines.filter(l => l.t > 0);
    } catch (e) { reportError(e); }
    return r;
  };
  const _mz = monkZone;
  monkZone = function () { const r = _mz.apply(this, arguments); clearMine(); return r; };
  const _rm = resetMonk;
  resetMonk = function () { const r = _rm.apply(this, arguments); clearMine(); P.mkShell = 0; return r; };

  // ------------------------------------------------------------------ drawing: the crescent, the seals, the finger's line, the shell
  const _mr = monkRender;
  monkRender = function (list) {
    const r = _mr.apply(this, arguments);
    if (!G.zone || !isMonk()) return r;
    try {
      const V = FXP.void, Dy = FXP.day;
      for (const c of G.mkCres) {
        if (!onScreen(c.x, c.y)) continue;
        list.push({ d: c.x + c.y + 0.2, f: () => {
          const q = iso(c.x, c.y), q2 = iso(c.x + c.vx * 0.05, c.y + c.vy * 0.05), sx = q2.sx - q.sx, sy = q2.sy - q.sy, l = Math.hypot(sx, sy) || 1, ux = sx / l, uy = sy / l, px = -uy, py = ux, w = 11, a = Math.min(1, c.t / 0.15);
          ctx.globalAlpha = a;
          for (const [col, lw, off] of [[V[1], 4, 0], [V[3], 2, 1.5], [V[4], 1, 3]]) {
            ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
            ctx.moveTo(q.sx + px * w - ux * 3, q.sy - 9 + py * w - uy * 3);
            ctx.quadraticCurveTo(q.sx + ux * (7 + off), q.sy - 9 + uy * (7 + off), q.sx - px * w - ux * 3, q.sy - 9 - py * w - uy * 3); ctx.stroke();
          }
          ctx.lineWidth = 1; ctx.globalAlpha = 1;
        } });
      }
      for (const s of G.mkSeals) {
        if (!onScreen(s.x, s.y)) continue;
        list.push({ d: s.x + s.y - 0.6, f: () => {
          const q = iso(s.x, s.y), a = Math.min(1, s.t / 0.6) * (0.75 + 0.25 * Math.sin(G.time * 9 + s.seed));
          ctx.strokeStyle = `rgba(244,196,74,${0.7 * a})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, s.R * ISO_R, s.R * ISO_RY, 0, 0, 6.29); ctx.stroke();
          ctx.strokeStyle = `rgba(255,240,168,${0.5 * a})`; ctx.beginPath(); ctx.ellipse(q.sx, q.sy, s.R * ISO_R * 0.6, s.R * ISO_RY * 0.6, 0, 0, 6.29); ctx.stroke();
          ctx.fillStyle = `rgba(216,134,42,${0.8 * a})`; for (let i = 0; i < 6; i++) { const an = i / 6 * 6.283 + s.seed + G.time * 0.6; ctx.fillRect(Math.round(q.sx + Math.cos(an) * s.R * ISO_R * 0.8), Math.round(q.sy + Math.sin(an) * s.R * ISO_RY * 0.8) - 1, 2, 2); }
          if (Math.random() < 0.25) parts.push({ x: s.x + rand(-s.R, s.R) * 0.6, y: s.y + rand(-s.R, s.R) * 0.6, z: 2, vx: 0, vy: 0, vz: 14, t: 0.4, col: Math.random() < 0.5 ? Dy[2] : Dy[1] });
        } });
      }
      for (const l of G.mkLines) list.push({ d: 1e5, f: () => {
        const a = iso(l.x0, l.y0), b = iso(l.x1, l.y1), k = l.t / 0.25;
        ctx.strokeStyle = `rgba(255,253,240,${k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 22); ctx.lineTo(b.sx, b.sy - 10); ctx.stroke();
        ctx.strokeStyle = `rgba(244,196,74,${k * 0.6})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.sx, a.sy - 21); ctx.lineTo(b.sx, b.sy - 9); ctx.stroke();
      } });
      if (P.mkShell > 0) list.push({ d: P.x + P.y + 0.25, f: () => {
        const q = iso(P.x, P.y), fade = Math.min(1, P.mkShell / 0.5);
        ctx.globalCompositeOperation = 'lighter'; glow(q.sx, q.sy - 16, 26, '255,210,110', 0.22 * fade); ctx.globalCompositeOperation = 'source-over';
        for (let i = 0; i < 12; i++) {
          const an = i / 12 * 6.283 + G.time * 1.3, x = q.sx + Math.cos(an) * 13, y = q.sy - 14 + Math.sin(an) * 9;
          ctx.fillStyle = i % 2 ? Dy[2] : FXP.stone[4]; ctx.globalAlpha = fade * (Math.sin(an) > 0 ? 1 : 0.55);
          ctx.fillRect(Math.round(x) - 1, Math.round(y) - 2, 3, 4); ctx.fillStyle = Dy[1]; ctx.fillRect(Math.round(x), Math.round(y) - 3, 1, 1);
        }
        ctx.globalAlpha = 1;
      } });
    } catch (e) { reportError(e); }
    return r;
  };

  try { if (typeof window !== 'undefined') window.__mkarc = { ids: Object.keys(ARC).filter(k => ARC[k].cls === 'monk'), later, get G() { return G; }, get P() { return P; }, get shots() { return shots; }, KS, MONK_MELEE, hit: (...a) => hitTarget(...a), hurt: (...a) => hurtPlayer(...a), killMon: m => killMon(m), hurtMon: (...a) => hurtMon(...a), updateMonk: dt => updateMonk(dt) }; } catch (e) { }
})();
