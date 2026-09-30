// Mirror skills scenes: cast each mirror skill at a pack and screenshot at 1920x1080
const { chromium } = require('playwright');
(async () => {
  const OUT = process.env.OUT || '/tmp/mr';
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + process.env.HTML);
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms), res = [];
  const check = (n, ok, info) => res.push(`${ok ? 'PASS' : 'FAIL'} ${n}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`);
  const start = async () => {
    await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'animancer'; S.startGame('test'); });
    await wait(700);
    await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.zone.monsters.forEach(m => { if (Math.hypot(m.x - S.P.x, m.y - S.P.y) < 18) { m.x += 80; m.y += 80; m.state = 'idle'; } }); });
    await wait(3800);
    await ev(() => { const S = window.__spm, P = S.P; for (const k in S.G.panels) S.G.panels[k] = false; S.G.zone.monsters.forEach(m => { if (Math.hypot(m.x - P.x, m.y - P.y) < 18) { m.x += 80; m.y += 80; m.state = 'idle'; } });
      const L = { pillars: 10, fissure: 10, cage: 10, anvil: 10, wisps: 6, lance: 1 }; Object.assign(P.hard, L); Object.assign(P.skills, L); if (S.rederive) S.rederive(); S.fillWispsNow && S.fillWispsNow(); P.hp = 1e6; P.mana = 1e4; });
  };
  const pack = (list) => ev(L => { const S = window.__spm, P = S.P; const out = []; for (const [t, dx, dy] of L) { const m = S.makeMon(t, P.x + dx, P.y + dy, 8, 'normal', []); m.state = 'chase'; S.G.zone.monsters.push(m); out.push(S.G.zone.monsters.length - 1); } return out; }, list);
  const keep = () => ev(() => { const S = window.__spm, P = S.P; P.hp = 1e6; P.mana = 1e4; P.cast = 0; P.roll = 0; });
  const hold = async (ms) => { for (let t = 0; t < ms; t += 250) { await keep(); await wait(250); } };
  const stats = () => ev(() => { const S = window.__spm; return Object.assign({}, S.MR.stats, { refl: S.mrRefls().length, pend: S.MR.pend.length }); });
  const walkable = async () => ev(() => { const S = window.__spm, P = S.P, z = S.G.zone; let n = 0; for (let dx = -5; dx <= 5; dx++) for (let dy = -5; dy <= 5; dy++) if (!z.solidAt(P.x + dx, P.y + dy)) n++; return n; });

  // ---- 1. Standing Mirror: a pack walks past it and is reflected
  await start();
  check('open ground around the hero', (await walkable()) > 90, await walkable());
  await ev(() => { const S = window.__spm, P = S.P; S.castPillarsNow({ x: P.x + 2.2, y: P.y - 1.2 }); P.cast = 0; S.castPillarsNow({ x: P.x + 2.2, y: P.y + 1.4 }); });
  console.log('pillars', await ev(() => JSON.stringify(window.__spm.G.pillars.map(q => [q.wm, q.life]))));
  await hold(500);
  await pack([['hollow', 5, 0], ['hollow', 5.5, 1], ['knight', 6, -1], ['hound', 6.5, 0.5], ['marrow', 6, 2]]);
  await hold(400);
  for (let k = 0; k < 8; k++) { await wait(160); await p.screenshot({ path: OUT + '_seq' + k + '.png' }); }
  await p.screenshot({ path: OUT + '_1a_catch.png' });
  await hold(1500);
  const s1 = await stats(); console.log('pillars2', await ev(() => JSON.stringify(window.__spm.G.pillars.map(q => [q.wm, q.life]))));
  await p.screenshot({ path: OUT + '_1b_fight.png' });
  check('standing mirrors catch and release reflections', s1.caught >= 2 && s1.stepped >= 2, s1);
  const tg = await ev(() => { const S = window.__spm; return S.mrRefls().map(e => ({ t: e.type, huntsOrig: S.G.zone.monsters.includes(e.orig) && !e.orig.dead ? (e.tgt === e.orig || e.state !== 'windup') : 'dead', hp: Math.round(e.hp) + '/' + e.max })); });
  check('reflections list', true, tg);
  const info = await ev(() => { const S = window.__spm; return ['pillars', 'fissure', 'cage', 'anvil'].map(id => S.skillInfoNow(id, 10)); });
  check('skill tooltips', info.every(s => s && s.length > 10), info);
  console.log(await ev(() => { const S = window.__spm; return JSON.stringify(S.mrRefls().map(e => [e.type, S.mrCapture(e)])); }));
  console.log('ERRS', errs.join('|') || 'none'); await b.close();
})();
