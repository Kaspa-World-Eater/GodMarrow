// zz_zz_thread93.js — three things from the user (2026-09-29):
//  1. "there are some enemies or objects that don't die and my wisps just keep attacking. I suspect it's worms, so they
//     shouldn't be targetable while underground." Burrowers (m.hidden) take no damage, but wisps (and the v90 sparks,
//     needles and threads) still chose them. Now nothing of the Mystic's targets a creature while it is underground.
//  2. "Soul Leash should be a burst that puts threads on every enemy or maybe every wisp for a few seconds; enemies caught
//     take damage and enemies caught between the threads take damage." And: "Soul Leash should be a Thread skill, so it'll
//     need a replacement."
//     SOUL LEASH (now in the Thread tree, under Needle's Mark): every wisp throws a thread to an enemy near it. For a few
//     seconds each thread burns the enemy it holds, and cuts whatever crosses it. The threads move with the wisps, so they
//     sweep. With no wisps the Mystic throws three threads himself, weaker.
//  3. The replacement in the Soul tree (under Condense): PROCESSION. Hold: the choir leaves you and circles the cursor in a
//     slow ring, striking what is inside it. Release and it comes home. Costs a little Essence while held.
(function () {
  const MY = () => P.cls === 'animancer';
  const Lv = id => P.skills[id] || 0;
  const live = m => m && !m.dead && !m.hidden;

  // ---------------------------------------------------------------- 1. burrowed creatures are out of reach
  // while the wisps (and everything that runs inside their update) think, underground things count as not there
  function withBuried(fn) {
    const z = G.zone, hid = [];
    if (z) for (const m of z.monsters) if (!m.dead && m.hidden) { m.dead = true; hid.push(m); }
    try { return fn(); } finally { for (const m of hid) m.dead = false; }
  }
  const _uw = updateWisps;
  updateWisps = function (dt) { return withBuried(() => _uw.call(this, dt)); };
  const _cc = castChain;
  castChain = function (pt) { return withBuried(() => _cc.call(this, pt)); };

  // ---------------------------------------------------------------- 2. Soul Leash: a burst of threads
  const T = { threads: [], proc: { on: false, x: 0, y: 0, t: 0 } };
  const leashDur = () => 3 + 0.1 * Lv('leash');
  const leashDps = () => WS.leashDps();
  castLeash = function (pt) {
    if (!P.skills.leash || P.cast > 0 || P.roll > 0) return;
    const z = G.zone, near = z.monsters.filter(m => live(m) && dist(m, P) < 7 && lineClear(z, P, m));
    if (!near.length) { say('No enemy near enough to bind', 1); return; }
    if (!spendMana('leash')) return;
    endWraith();
    const per = P.skills.twin > 0 ? 2 : 1, used = new Map();
    const pick = (src) => {
      let best = null, bd = 1e9;
      for (const m of near) { const dd = Math.hypot(m.x - src.x, m.y - src.y); if (dd > 5) continue; const d = dd + (used.get(m) || 0) * 3; if (d < bd) { bd = d; best = m; } }
      if (best) used.set(best, (used.get(best) || 0) + 1);
      return best;
    };
    const srcs = P.wisps.length ? P.wisps.slice() : null, dur = leashDur();
    if (srcs) { for (const w of srcs) for (let i = 0; i < per; i++) { const m = pick(w); if (m) T.threads.push({ src: w, m, life: dur, max: dur, tick: 0.05, k: 1, freed: false }); } }
    else { for (let i = 0; i < 3 * per; i++) { const m = pick(P); if (m) T.threads.push({ src: P, m, life: dur, max: dur, tick: 0.05, k: 0.65, freed: false }); } }
    P.cast = 0.35 / D.castSpd; faceTo(near[0].x, near[0].y);
    sfx(520, 0.18, 'triangle', 0.025, -260); sfx(180, 0.3, 'sine', 0.02, 40);
  };
  function srcPos(th) { const s = th.src; return s === P ? { x: P.x, y: P.y, z: 12 } : { x: s.x, y: s.y, z: s.z || 9 }; }
  function updThreads(dt) {
    const z = G.zone;
    for (const th of T.threads) {
      th.life -= dt;
      if (th.src !== P && !P.wisps.includes(th.src)) th.life = Math.min(th.life, 0.15);   // its wisp is gone: the thread falls slack
      const m = th.m;
      if (!m || m.dead) {
        if (m && m.dead && !th.freed && P.skills.snare > 0 && P.wisps.length < effCap()) { th.freed = true; spawnWisp(); floatText(m.x, m.y, 'wisp freed', '#d8f3ff'); }
        th.life = Math.min(th.life, 0.15); continue;
      }
      if (m.hidden) { th.life = Math.min(th.life, 0.15); continue; }
      const s = srcPos(th);
      if (Math.hypot(m.x - s.x, m.y - s.y) > 6.5) { th.life = Math.min(th.life, 0.15); continue; }
      if (P.skills.barbs > 0) m.slow = Math.max(m.slow || 0, 0.4);
      th.tick -= dt;
      if (th.tick > 0 || th.life <= 0.15) continue;
      th.tick = 0.25;
      const dmg = leashDps() * 0.25 * th.k;
      hurtMon(m, dmg, '#bfe8ff');
      for (const o of z.monsters) {
        if (o === m || !live(o)) continue;
        if (segDist(o.x, o.y, s.x, s.y, m.x, m.y) < (o.r || 0.3) + 0.18) { hurtMon(o, dmg * 0.7, '#bfe8ff'); if (P.skills.barbs > 0) o.slow = Math.max(o.slow || 0, 0.5); }
      }
    }
    T.threads = T.threads.filter(th => th.life > 0);
  }

  // ---------------------------------------------------------------- 3. Procession
  const procR = () => 1.7 + (P.skills.procwide > 0 ? 0.9 : 0);
  const procCost = () => (SK.proc ? SK.proc.mana : 3);
  function procActive() { return MY() && Lv('proc') > 0 && typeof heldSkill === 'function' && heldSkill('proc') && P.roll <= 0 && !P.dead; }
  function updProcession(dt) {
    const pr = T.proc;
    const want = procActive();
    if (want) {
      const need = procCost() * dt;
      if (P.mana < need) { if (pr.on) say('Your Essence is spent', 0.8); pr.on = false; return; }
      P.mana -= need;
      const a = aimPoint(), dx = a.x - P.x, dy = a.y - P.y, d = Math.hypot(dx, dy) || 1, lim = 8;
      pr.x = d > lim ? P.x + dx / d * lim : a.x; pr.y = d > lim ? P.y + dy / d * lim : a.y;
      if (!pr.on) sfx(260, 0.4, 'sine', 0.02, 60);
      pr.on = true; pr.t += dt;
    } else if (pr.on) { pr.on = false; for (const w of P.wisps) { w.state = 'drift'; w.cd = 0.3; } }
  }
  const _urw = updateRevWisp;
  updateRevWisp = function (w, dt) {
    const pr = T.proc;
    if (!pr.on) return _urw.apply(this, arguments);
    const n = Math.max(1, P.wisps.length), i = P.wisps.indexOf(w), R = procR(), ang = (i / n) * Math.PI * 2 + pr.t * 1.1;
    const tx = pr.x + Math.cos(ang) * R, ty = pr.y + Math.sin(ang) * R, dx = tx - w.x, dy = ty - w.y, d = Math.hypot(dx, dy) || 1;
    const sp = WS.flySpd() * 1.15, st = Math.min(d, sp * dt);
    w.dir = { x: dx / d, y: dy / d }; w.x += dx / d * st; w.y += dy / d * st; w.z += (9 - w.z) * Math.min(1, dt * 6); w.state = 'proc';
    w._pT = (w._pT || 0) - dt;
    if (w._pT > 0) return;
    // strike the creature inside the ring nearest this wisp
    let best = null, bd = 1.6;
    for (const m of G.zone.monsters) { if (!live(m)) continue; if (Math.hypot(m.x - pr.x, m.y - pr.y) > R + (m.r || 0.3)) continue; const dm = Math.hypot(m.x - w.x, m.y - w.y); if (dm < bd) { bd = dm; best = m; } }
    if (!best) { w._pT = 0.15; return; }
    w._pT = 0.45;
    hurtMon(best, WS.revDmg() * 0.6, '#cfe6f2');
    if (P.skills.procslow > 0) best.slow = Math.max(best.slow || 0, 0.45);
    const M = window.__mystic90;   // the v90 chances ride on procession strikes too
    if (M && !best.dead) { try { if (Math.random() < M.CH.thread()) M.snag(w, best); if (Math.random() < M.CH.needle()) M.needle(w, best); if (Math.random() < M.CH.split()) M.split(best); } catch (e) { } }
  };

  // run the threads and the procession every frame the wisps run
  const _uw2 = updateWisps;
  updateWisps = function (dt) {
    try { updProcession(dt); } catch (e) { if (typeof reportError === 'function') reportError(e); }
    const r = _uw2.apply(this, arguments);
    try { withBuried(() => updThreads(dt)); } catch (e) { if (typeof reportError === 'function') reportError(e); }
    return r;
  };
  // castSkill: Procession is held, never cast
  const _cs = castSkill;
  castSkill = function (id) { if (id === 'proc') return; return _cs.apply(this, arguments); };

  // ---------------------------------------------------------------- drawing: pale threads, no glow
  function drawT() {
    for (const th of T.threads) {
      const m = th.m; if (!m || m.dead) continue;
      const s = srcPos(th), a = iso(s.x, s.y), b = iso(m.x, m.y), f = Math.min(1, th.life / 0.3) * Math.min(1, (th.max - th.life) / 0.12 + 0.2);
      const x0 = a.sx, y0 = a.sy - s.z, x1 = b.sx, y1 = b.sy - 10, sag = 8 + 4 * Math.sin(G.time * 3 + x0 * 0.1);
      ctx.strokeStyle = '#aebdc6'; ctx.globalAlpha = 0.38 * f; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(x0) + 0.5, Math.round(y0) + 0.5); ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + sag, Math.round(x1) + 0.5, Math.round(y1) + 0.5); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    const pr = T.proc;
    if (pr.on) {   // a faint worn ring on the ground where the procession walks
      const c = iso(pr.x, pr.y), R = procR(), e = iso(pr.x + R, pr.y), rx = Math.abs(e.sx - c.sx) * 1.414, ry = rx * 0.5;
      ctx.strokeStyle = 'rgba(200,214,222,0.18)'; ctx.lineWidth = 1; ctx.setLineDash([2, 4]);
      ctx.beginPath(); ctx.ellipse(Math.round(c.sx), Math.round(c.sy), rx, ry, 0, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  const _rw = renderWorld;
  renderWorld = function (list) { _rw(list); if (T.threads.length || T.proc.on) list.push({ d: 1e6 - 1, f: drawT }); };

  // ---------------------------------------------------------------- the tree: Leash moves, Procession takes its place
  if (SK.leash) {
    Object.assign(SK.leash, { tab: 2, r: 3, c: 1, pre: 'mark', req: ROWREQ[3],
      desc: 'Every wisp in your choir throws a thread to an enemy near it. For a few seconds each thread burns the enemy it holds and cuts whatever crosses it. The threads move with the wisps, so they sweep through a crowd. With no wisps you throw three threads yourself, weaker.' });
    const pk = [{ name: 'Barbed Thread', desc: 'The threads slow whatever they hold or cut, and bite harder.' }, { name: 'Double Thread', desc: 'Each wisp throws two threads.' }, { name: 'Soul Snare', desc: 'An enemy that dies on a thread frees a wisp.' }];
    (SK.leash.perks || []).forEach((p, i) => { if (pk[i]) { p.name = pk[i].name; p.desc = pk[i].desc; } });
  }
  if (!SK.proc) {
    const s = { name: 'Procession', tab: 1, r: 3, c: 1, pre: 'condense', kind: 'hold', mana: 3,
      desc: 'Hold: your choir leaves you and circles the cursor in a slow ring, striking whatever is inside it. The wisps\' chances to snag, pierce and split ride on every strike. Release and they come home. Costs Essence while held.',
      perks: [{ l: 5, v: 'procwide', name: 'Wide Procession', desc: 'The ring is almost a yard wider.' }, { l: 10, v: 'procslow', name: 'Dirge', desc: 'What the procession strikes is slowed.', stat: ['spi', 50] }] };
    s.req = ROWREQ[s.r]; s.cls = 'animancer';
    SK.proc = s; SK_ORDER.push('proc'); s.perks.forEach((p, i) => { VIRT[p.v] = { s: 'proc', i }; });
    try { RIGHT_SKILLS.push('proc'); LEFT_SKILLS.push('proc'); } catch (e) { }
  }
  // an icon for Procession: a ring of pale motes around a faint centre (18 x 18, the tree's icon grid)
  if (typeof icon14 === 'function') {
    const _ic = icon14;
    icon14 = function (id, x, y) {
      if (id !== 'proc' && id !== 'procwide' && id !== 'procslow') return _ic.apply(this, arguments);
      const n = id === 'procwide' ? 8 : 6, R = id === 'procwide' ? 7 : 6;
      ctx.fillStyle = '#2a3440'; ctx.fillRect(x + 8, y + 8, 2, 2);
      for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + 0.4, px = Math.round(x + 9 + Math.cos(a) * R), py = Math.round(y + 9 + Math.sin(a) * R * 0.7);
        ctx.fillStyle = 'rgba(190,226,240,0.35)'; ctx.fillRect(px - 1, py, 3, 1); ctx.fillStyle = '#e4f4fa'; ctx.fillRect(px, py, 1, 1); }
      if (id === 'procslow') { ctx.fillStyle = '#8fa4b2'; ctx.fillRect(x + 4, y + 15, 10, 1); }
    };
  }
  const r = Math.round;
  const _si = skillInfo;
  skillInfo = function (id, l) {
    if (!MY() || (id !== 'leash' && id !== 'proc')) return _si(id, l);
    const old = P.skills[id]; P.skills[id] = Math.max(1, l); if (typeof syncPerks === 'function') syncPerks(D);
    let s = '';
    try { s = id === 'leash' ? `${r(leashDps())} a second on each thread · ${leashDur().toFixed(1)}s · ${P.skills.twin > 0 ? 2 : 1} per wisp` : `${r(WS.revDmg() * 0.6)} per strike · ring ${procR().toFixed(1)} yd · ${procCost()} Essence a second`; }
    catch (e) { s = _si(id, l); } finally { P.skills[id] = old; if (typeof syncPerks === 'function') syncPerks(D); }
    return s;
  };
  try { window.__thread93 = { T, withBuried, updThreads }; } catch (e) { }
})();
