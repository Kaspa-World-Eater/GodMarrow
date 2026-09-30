// targeted checks: each card does what its text says
const { chromium } = require('playwright');
const CLS = 'ossumancer';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click(`.cls[data-cls=${CLS}]`); await p.click('#testBtn'); await p.waitForTimeout(500); await p.keyboard.press('Escape');
  await p.evaluate(() => { const S = window.__spm, { P, SK } = S; for (const id in SK) if (SK[id].cls === P.cls) P.hard[id] = 12; S.rederive(); window.__T = {}; });
  // helper: give exactly these cards
  const cards = (list) => p.evaluate((list) => { const S = window.__spm, { P, G } = S; P.arc = S.newArc(); for (const [k, o] of list) P.arc.taken[k] = o; S.rederive(); S.rearm && S.rearm(); }, list);
  // helper: a fresh pack of enemies right in front of you
  const arena = (n = 4, hp = 500) => p.evaluate(([n, hp]) => { const { P, G } = window.__spm; const mons = G.zone.monsters.filter(m => !m.dead).slice(0, n); mons.forEach((m, i) => { m.x = P.x + 2 + (i % 2) * 0.7; m.y = P.y + (i - n / 2) * 0.7; m.hp = m.max = hp; m.state = 'chase'; m.bleed = null; m.burn = null; m.stun = 0; m.root = 0; m.possessed = 0; }); for (const m of G.zone.monsters) if (!mons.includes(m) && Math.hypot(m.x - P.x, m.y - P.y) < 14) { m.x += 40; } P.hp = 1e6; P.mana = 9999; return mons.length; }, [n, hp]);
  const ev = (f, arg) => p.evaluate(f, arg);
  const res = [];
  const check = (name, ok, info) => { res.push(`${ok ? 'PASS' : 'FAIL'} ${name}${info !== undefined ? ' ' + JSON.stringify(info) : ''}`); };
  const cast = (id, dx = 2.3, dy = 0) => ev(([id, dx, dy]) => { const S = window.__spm, { P } = S; P.cast = 0; P.roll = 0; P.mana = 9999; S.castSkill(id, { x: P.x + dx, y: P.y + dy }); }, [id, dx, dy]);
  const wait = ms => p.waitForTimeout(ms);
  const hpSum = () => ev(() => window.__spm.G.zone.monsters.filter(m => !m.dead && Math.hypot(m.x - window.__spm.P.x, m.y - window.__spm.P.y) < 6).reduce((a, m) => a + m.hp, 0));

  await cards([['o_pyredead', 'u']]); await ev(() => { window.__spm.P.shards = 99; }); await wait(2500);
  const r = await ev(() => { const S = window.__spm; return JSON.stringify({ au: S.arcOf ? 1 : 0, taken: S.P.arc.taken, sk: S.G.skels.map(e => [e.rise.toFixed(2), (e.hp / e.max).toFixed(3)]), paused: S.G.paused, t: S.G.time }); });
  await wait(500);
  const r2 = await ev(() => { const S = window.__spm; return JSON.stringify({ sk: S.G.skels.map(e => [e.rise.toFixed(2), (e.hp / e.max).toFixed(3)]), t: S.G.time }); });
  console.log(r); console.log(r2); console.log(errs); await b.close();
})();
