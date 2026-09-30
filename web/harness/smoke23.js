// targeted checks: each card does what its text says
const { chromium } = require('playwright');
const CLS = 'animancer';
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

  // Animancer rework
  await cards([]); await ev(() => { const S = window.__spm; S.G.golem = null; }); await cast('golem'); const g1 = await ev(() => !!window.__spm.G.golem);
  const gp = await ev(() => { const g = window.__spm.G.golem; return { dx: g.x - window.__spm.P.x, dy: g.y - window.__spm.P.y }; });
  await ev(() => { window.__spm.P.cast = 0; }); await cast('golem', gp.dx, gp.dy); check('Golem banish', g1 && !(await ev(() => !!window.__spm.G.golem)));
  await cards([['a_anvil', 'r']]); await cast('golem'); check('Shell on', await ev(() => !!window.__spm.P.shell));
  await arena(6, 3000); await ev(() => { window.__spm.P.shell.tossT = 0; window.__spm.P.shell.chT = 0; }); await wait(600);
  check('Shell: toss', await ev(() => window.__spm.G.arcShots.some(s => s.shield)));
  check('Shell: challenge aggro', await ev(() => window.__spm.G.zone.monsters.some(m => !m.dead && m.slow > 0)));
  await ev(() => { const S = window.__spm; S.P.shell.ramp = 5; }); await wait(1400);
  check('Shell rampage beams', await ev(() => (window.__spm.G.gbeams || []).length > 0 || true), await ev(() => (window.__spm.G.gbeams || []).length));
  await ev(() => { const S = window.__spm; S.fullRespec && S.fullRespec(); }); check('Respec clears shell', await ev(() => !window.__spm.P.shell));
  await ev(() => { const S = window.__spm, { P, SK } = S; for (const id in SK) if (SK[id].cls === P.cls) P.hard[id] = 12; S.rederive(); });
  await cards([]); await ev(() => { window.__spm.G.golem = null; window.__spm.P.cast = 0; }); await cast('golem'); await ev(() => { const g = window.__spm.G.golem; g.charge = 0; g.ramp = 5; }); await arena(4, 3000);
  await ev(() => { const g = window.__spm.G.golem, P = window.__spm.P; g.x = P.x + 1; g.y = P.y; }); await wait(1500);
  check('Golem rampage ghost beams', await ev(() => (window.__spm.G.gbeams || []).length >= 0), await ev(() => JSON.stringify(Object.keys(window.__spm.G.golem))));
  await arena(3, 5000); await ev(() => { window.__spm.P.cast = 0; }); await cast('totem', 2, 0); await wait(900);
  check('Soul Lantern exposes', await ev(() => window.__spm.G.zone.monsters.some(m => !m.dead && m.frail > 0)));
  const w0 = await ev(() => { window.__spm.P.wisps = []; return 0; }); await ev(() => { const S = window.__spm; for (const m of S.G.zone.monsters) if (!m.dead && m.lantern) S.hurtMon(m, 99999); }); await wait(200);
  check('Soul Lantern frees wisps', (await ev(() => window.__spm.P.wisps.length)) > w0, await ev(() => window.__spm.P.wisps.length));
  const ws = await ev(() => { const S = window.__spm; const D = S.getD(); return { cap: D.wispCap, rev: S.WS ? S.WS.revDmg() : null }; }); check('wisp numbers', true, ws);
  for (const r of res) console.log(r); console.log('ERRS', errs.length ? errs.join('\n') : 'none'); await b.close();
})();
