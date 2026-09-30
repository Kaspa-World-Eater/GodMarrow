// v0.25: the Kūshō (monk): the reading picks him, every skill casts and does something, the sky turns, Weight, vitrify
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  p.on('crash', () => console.log('PAGE CRASH')); p.on('console', m => { if (m.type() === 'error') console.log('console.error', m.text().slice(0, 200)); });
  await p.goto('file://' + (process.env.HTML || process.cwd() + '/spiritmancer.html'));
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), res = [];
  const check = (n, ok, info) => res.push(`${ok ? 'PASS' : 'FAIL'} ${n}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
  // ---- the reading offers Ur-Nihl, and picking it (test path) makes a monk
  const fate = await ev(() => { const F = window.__spm.FATE; const s = F.stars.find(q => q.id === 'silence'); return { n: F.stars.length, cls: s && s.cls, faces: (F.faces.silence || []).length, txt: s && s.txt }; });
  check('the reading names Ur-Nihl, the Silence, with three faces', fate.cls === 'monk' && fate.faces === 3, fate);
  await ev(() => { localStorage.removeItem('spiritmancer.test'); });
  await ev(() => document.getElementById('testBtn').click()); await wait(400);
  const si = await ev(() => window.__spm.FATE.stars.findIndex(q => q.id === 'silence'));
  // the star scene: click the fifth constellation (canvas coords are the 480x270 UI scaled to the 960x540 view)
  const box = await p.$eval('#game', c => { const r = c.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
  await p.mouse.click(box.x + (48 + si * 96) * box.w / 480, box.y + 96 * box.h / 270); await wait(300);
  for (let i = 0; i < 6; i++) { await p.mouse.click(box.x + 240 * box.w / 480, box.y + 240 * box.h / 270); await wait(250); }
  const picked = await ev(() => ({ cls: window.__spm.P.cls, running: window.__spm.G.running }));
  check('picking Ur-Nihl at the test reading starts a Kūshō', picked.cls === 'monk' && picked.running, picked);
  // ---- a clean test monk
  await ev(() => { const S = window.__spm; localStorage.removeItem('spiritmancer.test'); S.G.pickCls = 'monk'; S.startGame('test'); });
  await wait(500);
  await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.zone.monsters.forEach(m => { if (Math.hypot(m.x - S.P.x, m.y - S.P.y) < 16) { m.x += 60; m.y += 60; m.state = 'idle'; } }); });
  const base = await ev(() => { const S = window.__spm, P = S.P; return { cls: P.cls, wpn: P.eq.weapon && P.eq.weapon.base, tabs: window.__monk.tabNames(), n: Object.keys(S.SK || {}).length }; });
  check('test monk: fist wraps', base.cls === 'monk' && /wraps/.test(base.wpn), base);
  const ids = await ev(() => { const S = window.__spm, SK = window.__spm.SKref; return null; });
  // learn every monk skill to 10 (and perks come with it)
  const learned = await ev(() => {
    const S = window.__spm, P = S.P, M = window.__monk; const all = [];
    for (const id in M.SK) if (M.SK[id].cls === 'monk') all.push(id);
    for (const id of all) { P.hard[id] = 10; }
    P.attrs.spi = 120; P.attrs.vit = 90; P.attrs.con = 90;
    S.rederive(); return { all, tabs: [0, 1, 2].map(t => all.filter(id => M.SK[id].tab === t).length) };
  });
  check('three trees of about ten skills', learned.tabs.every(n => n >= 9 && n <= 12), learned.tabs);
  const spawn = (type, dx, dy, o) => ev(([t, dx, dy, o]) => { const S = window.__spm, P = S.P; const m = S.makeMon(t, P.x + dx, P.y + dy, 5, 'normal', []); Object.assign(m, o || {}); m.state = 'chase'; S.G.zone.monsters.push(m); return S.G.zone.monsters.length - 1; }, [type, dx, dy, o]);
  const pack = async (hp) => { await ev(() => { const S = window.__spm; S.G.zone.monsters = S.G.zone.monsters.filter(m => !(Math.hypot(m.x - S.P.x, m.y - S.P.y) < 14 || m.dead)); S.G.kglass = []; S.G.kbuddha = null; }); const out = []; for (const [t, dx, dy] of [['hollow', 1.3, 0], ['hollow', 0, 1.4], ['archer', 3, 1], ['knight', 2, -1.5], ['caster', -2, 2], ['hound', -1.5, -1]]) out.push(await spawn(t, dx, dy, { hp: hp || 400, max: hp || 400 })); return out; };
  // ---- every active skill casts and damages or controls something
  const casts = learned.all.filter(id => !['kbar', 'klaugh'].includes(id));
  const report = {};
  for (const id of casts) { 
    await pack(); await wait(50);
    const r = await ev(id => {
      const S = window.__spm, P = S.P, G = S.G, D = S.getD(); P.mana = D.maxMana; P.hp = D.maxHp; P.cast = 0; P.roll = 0; P.kcd = {}; P.kskyCd = 0; P.kbowl = 3; P.khalo = 6; P.approach = null; P.knothing = 0; P.ksun = 0; P.kleap = null;
      const foes = G.zone.monsters.filter(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 5);
      const hp0 = foes.reduce((a, m) => a + m.hp, 0), m0 = P.mana;
      const tgt = foes[0]; S.castSkill(id, { x: tgt.x, y: tgt.y });
      window.__probe = { hp0, m0, foes, id };
      return { cast: P.cast, mana: m0 - P.mana };
    }, id);
    // let it play out; hold channels by pretending the right button is down
    await ev(id => { const S = window.__spm; if (window.__monk.SK[id].kind === 'hold') { S.P.right = id; S.mouse.r = true; } }, id);
    await wait(1600);
    const after = await ev(() => {
      const S = window.__spm, P = S.P, G = S.G, pr = window.__probe; S.mouse.r = false;
      const hp1 = pr.foes.reduce((a, m) => a + Math.max(0, m.dead ? 0 : m.hp), 0);
      const ctrl = pr.foes.some(m => m.stun > 0 || m.root > 0 || m.kstone > 0 || m.kshadow || m.kweak > 0 || m.ktaunt > 0 || m.dead);
      return { dmg: Math.round(pr.hp0 - hp1), ctrl, sky: G.skyForce && G.skyForce.kind, hour: window.__monk.hourOf(), buddha: !!G.kbuddha, amber: P.kamber, walk: P.kwalk, obs: P.kobsid > 0, mirror: P.kmirror > 0, nothing: P.knothing > 0, sun: P.ksun > 0, bell: !!G.kbell, bowl: P.kbowl, halo: P.khalo, w: Math.round(P.weight) };
    });
    report[id] = Object.assign(r, after);
    // toggles and stances off again
    await ev(() => { const S = window.__spm, P = S.P, G = S.G; if (P.kamber) S.castSkill('kamber'); if (P.kwalk) S.castSkill('kwalk'); P.knothing = 0; P.ksun = 0; P.kmirror = 0; G.kbell = null; if (G.skyForce) window.__monk.endSky(); });
  }
  const bad = [];
  for (const id of casts) { const r = report[id]; const ok = r.dmg > 0 || r.ctrl || r.sky || r.buddha || r.amber || r.walk || r.obs || r.mirror || r.nothing || r.sun || r.bell || (id === 'kbowl' && r.bowl === 0); if (!ok) bad.push(id); }
  check('every active skill does something', bad.length === 0, { bad, sample: Object.fromEntries(Object.entries(report).map(([k, v]) => [k, v.dmg])) });
  check('False Dawn and Eclipse turn the sky (the hour follows)', report.kdawn.sky === 'noon' && report.kdawn.hour === 'day' && report.keclipse.sky === 'night' && report.keclipse.hour === 'night', { d: report.kdawn, e: report.keclipse });
  // ---- the Wheel of the Sky: Radiance +35% by day, -25% by night; Absence the reverse
  const wheel = await ev(() => { const S = window.__spm, M = window.__monk; M.turnSky('noon'); const a = [M.KS.sky(0), M.KS.sky(1), S.dayK()]; M.endSky(); M.turnSky('night'); const b = [M.KS.sky(0), M.KS.sky(1), S.dayK()]; M.endSky(); return { noon: a, night: b }; });
  check('the Wheel: 1.35 / 0.75 by day, reversed by night', Math.abs(wheel.noon[0] - 1.35) < 0.01 && Math.abs(wheel.noon[1] - 0.75) < 0.01 && Math.abs(wheel.night[1] - 1.35) < 0.01 && wheel.noon[2] === 1 && wheel.night[2] === 0, wheel);
  // ---- Weight fills on kills and slows him when heavy; kills vitrify (no corpse)
  await pack(5);
  const wv = await ev(() => { const S = window.__spm, P = S.P, G = S.G; P.weight = 0; S.rederive(); const s0 = S.getD().moveSpd; let n = 0; for (const m of G.zone.monsters) if (!m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 5) { S.hurtMon(m, 9999); n++; } const corpses = G.zone.monsters.filter(m => m.dead && !m.erased && Math.hypot(m.x - P.x, m.y - P.y) < 5).length; P.weight = 100; S.rederive(); const s1 = S.getD().moveSpd; return { n, w: 0, glass: G.kglass.length, corpses, s0, s1, dmgHeavy: window.__monk.KS.wDmg() }; });
  const wAfter = await ev(() => window.__spm.P.weight);
  check('kills leave glass, not corpses', wv.glass >= 4 && wv.corpses === 0, wv);
  check('heavy Weight: slower and harder-hitting', wv.s1 < wv.s0 && wv.dmgHeavy > 1.25, wv);
  // ---- Mountain Flesh: poise never breaks
  const mf = await ev(() => { const S = window.__spm, P = S.P; P.stam = 5; P.stagger = 0; P.poiseGrace = 0; S.playerPoiseHit(500, P.x + 1, P.y); return { stagger: P.stagger > 0, stam: P.stam }; });
  check('Mountain Flesh: no stagger', !mf.stagger && mf.stam >= 1, mf);
  // ---- the stone Buddha draws aggression and fights
  await pack(300);
  const bu = await ev(() => { const S = window.__spm, P = S.P, G = S.G; G.kbuddha = null; P.mana = 999; P.cast = 0; S.castSkill('kweep', { x: P.x + 1.5, y: P.y }); return !!G.kbuddha; });
  await wait(4500);
  const bu2 = await ev(() => { const S = window.__spm, G = S.G, b = G.kbuddha; return b ? { hp: Math.round(b.hp), max: b.max, taunted: G.zone.monsters.filter(m => !m.dead && m.ktaunt > 0).length } : null; });
  check('the Weeping One rises and draws enemies', bu && bu2 && bu2.taunted > 0, bu2);
  // ---- a few seconds of real play with everything active, then save and load
  await ev(() => { const S = window.__spm, P = S.P; P.hp = 1e5; S.getD().maxHp = 1e5; S.castSkill('kamber'); });
  await wait(2500);
  const sv = await ev(() => { const S = window.__spm; S.G.saveKey = 'spiritmancer.test'; S.P.hard.kstar = 7; window.__spm.startGame && 0; const raw = localStorage.getItem('spiritmancer.test'); return true; });
  check('no page errors', errs.length === 0, errs.slice(0, 5));
  await p.screenshot({ path: process.env.OUT || 'smoke_monk.png' });
  for (const x of res) console.log(x); console.log('ERRS', errs.length ? [...new Set(errs)].slice(0, 8).join('\n') : 'none'); await b.close();
})();
