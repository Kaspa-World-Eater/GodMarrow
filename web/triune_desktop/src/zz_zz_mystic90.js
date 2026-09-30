// zz_zz_mystic90.js — the user (2026-09-29): "some of the skills like the thread skills kind of seem the same. One is
// basically chain lightning and another one is basically chain lightning. So that needs to be different." And: "the wisps
// where we choose the different types of our army. I don't want it to be like that. I want the wisp skills to be like
// passives where they have a chance to do something like a chance to split or chance to shoot a little beam or chance to
// pull thread or chance to keep piercing."
//  * BINDING THREAD (chain): no longer a leaping bolt. Threads run from the enemy at the cursor to others near it; they
//    draw taut and drag them in against it; on the snap all of them are struck, jarred (poise) and slowed. Needle and
//    Thread (lance) stays the leaping dart.
//  * ONE CHOIR: every wisp is a revenant; there are no types to choose. The wisp passives become chances on each strike:
//      Wisps            — snag a thread: the foe is slowed and jarred
//      Restless Dead    — pass on without tiring (the strike doesn't count toward the wisp's rest)
//      Darting Wisps    — a needle of light runs straight through the foe and cuts what stands behind it
//      Splitting Wisps  — a spark splits off and darts at another foe nearby
//    Nothing glows: a needle is a short pale dash that runs out and is gone, sparks are motes like the wisps themselves.
(function () {
  const MY = () => P.cls === 'animancer';
  const L = id => P.skills[id] || 0;
  const CH = {
    thread: () => L('wisps') > 0 ? Math.min(0.20, 0.04 + 0.01 * L('wisps')) : 0,
    pass: () => L('restless') > 0 ? Math.min(0.45, 0.10 + 0.03 * L('restless')) : 0,
    needle: () => L('beam') > 0 ? Math.min(0.40, 0.08 + 0.025 * L('beam')) : 0,
    split: () => L('prism') > 0 ? Math.min(0.40, 0.08 + 0.025 * L('prism')) : 0,
  };
  const needleDmg = () => WS.revDmg() * (0.6 + 0.04 * L('beam'));
  const needleLen = () => P.skills.sweep > 0 ? 4.5 : 2.6;
  const sparkDmg = () => WS.revDmg() * (0.5 + 0.04 * L('prism')) * (P.skills.prismchain > 0 ? 1.3 : 1);
  const sparkN = () => P.skills.prismex > 0 ? 2 : 1;
  const FX = { sparks: [], needles: [], snags: [], binds: [] };
  let curW = null, inProc = false;

  // ---------------------------------------------------------------- one choir: every wisp a revenant
  const _wt = wispTargets;
  wispTargets = function () { if (!MY()) return _wt(); return { rev: effCap(), beam: 0, prism: 0 }; };

  // ---------------------------------------------------------------- the chances, on each revenant strike
  const _urw = updateRevWisp;
  updateRevWisp = function (w, dt) { curW = w; try { return _urw(w, dt); } finally { curW = null; } };
  const _hm = hurtMon;
  hurtMon = function (m, dmg, col) {
    const w = curW, direct = w && !inProc && col === '#d8f3ff' && MY() && m && !m.dead;
    const r = _hm.apply(this, arguments);
    if (!direct) return r;
    inProc = true;
    try {
      if (Math.random() < CH.pass()) w.hits--;                             // passes on untired (the caller adds one back)
      if (!m.dead && Math.random() < CH.thread()) snag(w, m);
      if (Math.random() < CH.needle()) needle(w, m);
      if (Math.random() < CH.split()) split(m);
    } catch (e) { if (typeof reportError === 'function') reportError(e); }
    inProc = false;
    return r;
  };
  function snag(w, m) {
    m.slow = Math.max(m.slow || 0, 0.6);
    if (typeof poiseHit === 'function') poiseHit(m, 10);
    FX.snags.push({ w, m, x: w.x, y: w.y, t: 0, dur: 0.5 });
  }
  function needle(w, m) {
    const d = w.dir || { x: m.x - P.x, y: m.y - P.y }, l = Math.hypot(d.x, d.y) || 1, dx = d.x / l, dy = d.y / l, len = needleLen(), z = G.zone;
    let end = len;
    for (let s = 0.25; s < len; s += 0.25) { const t = z.get(Math.floor(m.x + dx * s), Math.floor(m.y + dy * s)); if (TALL[t] && t !== T.ROCK) { end = s; break; } }
    const dmg = needleDmg();
    for (const o of z.monsters) {
      if (o.dead || o === m) continue;
      const px = o.x - m.x, py = o.y - m.y, t = px * dx + py * dy;
      if (t < 0 || t > end || Math.abs(px * dy - py * dx) > o.r + 0.2) continue;
      hurtMon(o, dmg, '#cfdde6'); if (P.skills.beamburn > 0) burnMon(o, dmg * 0.5, 2);
    }
    if (P.skills.beamburn > 0) burnMon(m, dmg * 0.5, 2);
    FX.needles.push({ x: m.x, y: m.y, dx, dy, end, t: 0, dur: 0.05 + end * 0.035 });
    sfx(2200 + Math.random() * 300, 0.03, 'triangle', 0.008, -900);
  }
  function split(m) {
    const near = G.zone.monsters.filter(o => !o.dead && o !== m && Math.hypot(o.x - m.x, o.y - m.y) < 4.5).sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y));
    for (let i = 0; i < sparkN() && i < near.length; i++) FX.sparks.push({ x: m.x, y: m.y, z: 9, tgt: near[i], dmg: sparkDmg(), t: 0, trail: [] });
  }

  // ---------------------------------------------------------------- Binding Thread
  castChain = function (pt) {
    if (!P.skills.chain || P.cast > 0 || P.roll > 0) return;
    const a = pt || aimPoint();
    let first = null, bd = 2.5;
    for (const m of G.zone.monsters) { if (m.dead) continue; const d = Math.hypot(m.x - a.x, m.y - a.y); if (d < bd && dist(m, P) < 10 && lineClear(G.zone, P, m)) { bd = d; first = m; } }
    if (!first) { say('No enemy near the cursor', 0.9); return; }
    if (!spendMana('chain')) return;
    endWraith();
    const n = Math.max(0, WS.chainN() - 1) + (P.skills.chainfork > 0 ? 2 : 0);
    const others = G.zone.monsters.filter(o => !o.dead && o !== first && Math.hypot(o.x - first.x, o.y - first.y) < 5.5 && lineClear(G.zone, first, o))
      .sort((p, q) => Math.hypot(p.x - first.x, p.y - first.y) - Math.hypot(q.x - first.x, q.y - first.y)).slice(0, n);
    const dmg = WS.chainDmg();
    hurtMon(first, dmg * 0.4, '#e8e2d0'); P.lastHit = first;
    FX.binds.push({ a: first, bound: others.map(m => ({ m })), t: 0, dur: 0.55, dmg, done: false, fade: 0 });
    P.cast = 0.36 / D.castSpd; faceTo(first.x, first.y);
    sfx(700, 0.12, 'triangle', 0.02, -300); sfx(180, 0.25, 'sine', 0.02, 60);
  };
  const heavy = m => m.rank === 'boss' || (m.b && m.b.ai === 'boss');
  function updBinds(dt) {
    for (const b of FX.binds) {
      if (b.done) { b.fade += dt; continue; }
      b.t += dt; const A = b.a;
      for (const e of b.bound) {
        const m = e.m; if (m.dead || A.dead) continue;
        m.slow = Math.max(m.slow || 0, 0.5);
        if (heavy(m)) continue;
        const dx = A.x - m.x, dy = A.y - m.y, d = Math.hypot(dx, dy) || 1, stop = (A.r || 0.3) + (m.r || 0.3) + 0.15;
        if (d <= stop) continue;
        const left = Math.max(0.06, b.dur - b.t), step = Math.min(d - stop, Math.min(9, (d - stop) / left) * dt) * (m.rank === 'champion' || m.rank === 'unique' ? 0.6 : 1);
        moveCircle(m, dx / d * step, dy / d * step);
      }
      if (b.t >= b.dur) {
        b.done = true;
        const all = [A, ...b.bound.map(e => e.m)].filter(m => !m.dead);
        for (const m of all) {
          hurtMon(m, b.dmg, '#e8e2d0');
          if (!m.dead) { if (typeof poiseHit === 'function') poiseHit(m, 18); m.slow = Math.max(m.slow || 0, 0.8); if (P.skills.chainmark > 0) m.marked = Math.max(m.marked || 0, 3); }
        }
        if (all.length > 1) { burst(A.x, A.y, '#6e685c', 6, 1.2); G.shake = Math.max(G.shake, 2); }
        sfx(90, 0.2, 'sawtooth', 0.035, -40); sfx(420, 0.08, 'triangle', 0.015, -200);
      }
    }
    FX.binds = FX.binds.filter(b => !b.done || b.fade < 0.3);
  }
  function updFx(dt) {
    for (const s of FX.sparks) {
      s.t += dt; const g = s.tgt; if (!g || g.dead) { s.t = 9; continue; }
      const dx = g.x - s.x, dy = g.y - s.y, d = Math.hypot(dx, dy) || 1, st = Math.min(d, 11 * dt);
      s.trail.push({ x: s.x, y: s.y }); if (s.trail.length > 3) s.trail.shift();
      s.x += dx / d * st; s.y += dy / d * st;
      if (d < 0.3) { inProc = true; try { hurtMon(g, s.dmg, '#d8f3ff'); } finally { inProc = false; } s.t = 9; }
    }
    FX.sparks = FX.sparks.filter(s => s.t < 1);
    for (const n of FX.needles) n.t += dt; FX.needles = FX.needles.filter(n => n.t < n.dur);
    for (const s of FX.snags) { s.t += dt; if (P.wisps.includes(s.w)) { s.x = s.w.x; s.y = s.w.y; } } FX.snags = FX.snags.filter(s => s.t < s.dur && !s.m.dead);
    updBinds(dt);
  }
  const _uw = updateWisps;
  updateWisps = function (dt) { const r = _uw.apply(this, arguments); try { updFx(dt); } catch (e) { if (typeof reportError === 'function') reportError(e); } return r; };
  window.__mystic90 = { FX, CH, updFx, snag, needle, split };

  // ---------------------------------------------------------------- drawing: thin, pale, no glow
  function sag(x0, y0, x1, y1, s, a, col) {
    ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(Math.round(x0) + 0.5, Math.round(y0) + 0.5);
    ctx.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + s, Math.round(x1) + 0.5, Math.round(y1) + 0.5); ctx.stroke(); ctx.globalAlpha = 1;
  }
  function drawFx() {
    for (const b of FX.binds) {
      const A = b.a, pa = iso(A.x, A.y), k = b.done ? 0 : 1 - b.t / b.dur, al = b.done ? 0.6 * (1 - b.fade / 0.3) : 0.6;
      for (const e of b.bound) { if (e.m.dead) continue; const pm = iso(e.m.x, e.m.y); sag(pa.sx, pa.sy - 11, pm.sx, pm.sy - 11, 2 + k * 12, al, '#d6cfbf'); }
      if (!b.done) { ctx.fillStyle = 'rgba(214,207,191,0.7)'; ctx.fillRect(Math.round(pa.sx) - 1, Math.round(pa.sy) - 12, 2, 2); }
    }
    for (const s of FX.snags) { const a = iso(s.x, s.y), b = iso(s.m.x, s.m.y); sag(a.sx, a.sy - 9, b.sx, b.sy - 10, 6 * (1 - s.t / s.dur) + 1, 0.5 * (1 - s.t / s.dur), '#c9d6de'); }
    for (const n of FX.needles) {   // a short dash that runs out and is gone: a needle, not a beam
      const k = n.t / n.dur, s1 = n.end * k, s0 = Math.max(0, s1 - 0.7), a = iso(n.x + n.dx * s0, n.y + n.dy * s0), b = iso(n.x + n.dx * s1, n.y + n.dy * s1);
      ctx.strokeStyle = '#b8d0de'; ctx.globalAlpha = 0.5 * (1 - k * 0.5); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(Math.round(a.sx) + 0.5, Math.round(a.sy - 10) + 0.5); ctx.lineTo(Math.round(b.sx) + 0.5, Math.round(b.sy - 10) + 0.5); ctx.stroke(); ctx.globalAlpha = 1;
    }
    for (const s of FX.sparks) {
      for (let i = 0; i < s.trail.length; i++) { const q = iso(s.trail[i].x, s.trail[i].y); ctx.fillStyle = `rgba(200,228,240,${0.15 + i * 0.12})`; ctx.fillRect(Math.round(q.sx), Math.round(q.sy - s.z), 1, 1); }
      const p = iso(s.x, s.y); ctx.fillStyle = '#e4f4fa'; ctx.fillRect(Math.round(p.sx) - 1, Math.round(p.sy - s.z) - 1, 2, 2);
    }
  }
  const _rw = renderWorld;
  renderWorld = function (list) {
    _rw(list);
    if (FX.binds.length || FX.snags.length || FX.needles.length || FX.sparks.length) list.push({ d: 1e6, f: drawFx });
  };

  // ---------------------------------------------------------------- the choir panel: no types to choose, the chances instead
  const _dc = drawChoir;
  drawChoir = function () {
    _dc();
    if (!MY()) return;
    const p = POP;
    ctx.fillStyle = '#121016'; ctx.fillRect(p.x + 3, p.y + 13, p.w - 6, 62);
    const rows = [['thread', 'Snag a thread'], ['pass', 'Pass on'], ['needle', 'Needle'], ['split', 'Split']];   // chances on each wisp strike
    rows.forEach(([k, name], i) => {
      const y = p.y + 15 + i * 14, c = CH[k]();
      ctx.fillStyle = '#1b1920'; ctx.fillRect(p.x + 4, y, p.w - 8, 13);
      txt(name, p.x + 8, y + 9, c > 0 ? '#e8e2d0' : '#5a5563', 'left', false);
      txt(c > 0 ? Math.round(c * 100) + '%' : '-', p.x + p.w - 8, y + 9, c > 0 ? '#bfe8ff' : '#5a5563', 'right', false);
    });
  };

  // ---------------------------------------------------------------- words
  const SET = {
    wisps: { desc: 'Your choir of wisps drifts around you and dives at what comes near. More points: more wisps, faster regrowth, harder strikes, and a better chance that a strike snags a thread: the foe is slowed and jarred. V: how they behave.' },
    restless: { desc: 'Revenants fly faster and pass through more of the living before they tire. Each strike has a chance to pass on without tiring at all.' },
    beam: { name: 'Darting Wisps', desc: 'Each wisp strike has a chance to drive a needle of soul-light straight through the foe, cutting everything standing behind it.',
      perks: [{ name: 'Long Needle', desc: 'The needle runs much farther.' }, { name: 'Searing Needle', desc: 'The needle sets what it cuts on fire.' }] },
    prism: { name: 'Splitting Wisps', desc: 'Each wisp strike has a chance to split: a spark of the wisp breaks off and darts at another foe nearby.',
      perks: [{ name: 'Wide Split', desc: 'Two sparks break off instead of one.' }, { name: 'Bright Sparks', desc: 'Sparks hit 30% harder.' }] },
    chain: { name: 'Binding Thread', desc: 'Threads run from the enemy at the cursor to others near it, draw taut and drag them in against it. When they snap tight, every one of them is struck, jarred and slowed. The great are held, not dragged.',
      perks: [{ name: 'More Thread', desc: 'Two more enemies are bound.' }, { name: 'Knotted', desc: 'Every enemy bound is Marked for 3 s.' }] },
  };
  for (const k in SET) {
    const s = SK[k], o = SET[k]; if (!s) continue;
    if (o.name) s.name = o.name;
    if (o.desc) s.desc = (/^\[Passive\]/.test(s.desc) ? '[Passive] ' : '') + o.desc;
    if (o.perks) o.perks.forEach((q, i) => { if (s.perks && s.perks[i]) { const pas = /^\[Passive\]/.test(s.perks[i].desc || ''); Object.assign(s.perks[i], q); if (pas) s.perks[i].desc = '[Passive] ' + q.desc; } });
  }
  const r = Math.round, pc = v => Math.round(v * 100) + '%';
  const INFO = {
    wisps: () => `${4 + Math.floor(P.skills.wisps / 2)} wisps · ${r(WS.revDmg())} per strike · snag ${pc(CH.thread())}`,
    restless: () => `${WS.hits()} strikes before rest · pass on ${pc(CH.pass())}`,
    beam: () => `needle ${pc(CH.needle())} · ${r(needleDmg())} damage · ${needleLen().toFixed(1)} yd`,
    prism: () => `split ${pc(CH.split())} · ${sparkN()} spark${sparkN() > 1 ? 's' : ''} · ${r(sparkDmg())} damage`,
    chain: () => `binds ${Math.max(0, WS.chainN() - 1) + (P.skills.chainfork > 0 ? 2 : 0)} more · ${r(WS.chainDmg())} on the snap · 5.5 yd`,
  };
  const _si = skillInfo;
  skillInfo = function (id, l) {
    const f = INFO[id]; if (!f || !MY()) return _si(id, l);
    const old = P.skills[id]; P.skills[id] = Math.max(1, l); if (typeof syncPerks === 'function') syncPerks(D);
    let s = ''; try { s = f(); } catch (e) { s = _si(id, l); } finally { P.skills[id] = old; if (typeof syncPerks === 'function') syncPerks(D); }
    return s;
  };
})();
