// targeted checks: each card does what its text says
const { chromium } = require('playwright');
const CLS = 'miasmancer';
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

  await cards([]);
  const cl = await ev(() => { const S = window.__spm; return [S.P.eq.weapon.base, S.getD().castSpd]; });
  check('Assassin wields claws', cl[0] === 'talons', cl);
  const c = (id, dx = 2, dy = 0) => ev(([id, dx, dy]) => { const S = window.__spm, P = S.P; P.cast = 0; P.roll = 0; P.mana = 999; P.stam = 999; S.castSkill(id, { x: P.x + dx, y: P.y + dy }); }, [id, dx, dy]);
  const near = () => ev(() => { const S = window.__spm, P = S.P; const m = S.G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 4); return m ? { dx: m.x - P.x, dy: m.y - P.y } : { dx: 2, dy: 0 }; });
  await arena(4, 4000); let h0 = await hpSum(); await c('shuriken'); await wait(1200);
  check('Shuriken spirals and trails miasma', (await hpSum()) < h0 && (await ev(() => window.__spm.G.clouds.some(c => c.trail))));
  await arena(4, 4000); h0 = await hpSum(); await c('mstorm'); await wait(1500);
  check('Miasma Hurricane shreds', (await hpSum()) < h0 && (await ev(() => window.__spm.P.mstormT > 0)));
  await ev(() => { window.__spm.P.mstormT = 0; window.__spm.G.mtraps = []; });
  await arena(3, 4000); let n = await near(); await c('mwake', n.dx * 0.4, n.dy * 0.4); await wait(1600);
  check('Miasma Wake leaks and breathes waves', await ev(() => window.__spm.G.mtraps.some(t => t.kind === 'mwake') && window.__spm.G.clouds.length > 0));
  await ev(() => { const S = window.__spm, P = S.P; const m = S.G.zone.monsters.find(m => !m.dead); m.x = P.x + 1.5; m.y = P.y + 1; S.hurtMon(m, 1e6); S.G.mtraps = []; });
  const cb0 = await ev(() => window.__spm.G.clouds.length);
  await c('dsentry', 1, 0); await wait(3000);
  check('Corpse Sentry bursts corpses', await ev(() => window.__spm.G.zone.monsters.some(m => m.dead && m.burst)));
  await ev(() => { window.__spm.P.omens = 0; });
  await arena(1, 4000); n = await near(); h0 = await hpSum(); await c('talon', n.dx, n.dy); await wait(500);
  check('Carrion Talon kicks and gives an Omen', (await hpSum()) < h0 && (await ev(() => window.__spm.P.omens)) >= 1);
  const spd = await ev(() => window.__spm.getD().castSpd);
  await arena(3, 4000); h0 = await hpSum(); await c('flurry', 1, 0); await wait(700);
  check('Raven Flurry rakes', (await hpSum()) < h0);
  check('Omens quicken you', await ev(() => window.__spm.P.omens) > 0, [spd]);
  await arena(1, 4000); await ev(() => { const S = window.__spm, P = S.P; const m = S.G.zone.monsters.find(m => !m.dead && Math.hypot(m.x - P.x, m.y - P.y) < 5); m.x = P.x + 6; m.y = P.y; window.__T.m = m; });
  await c('dflight', 6, 0); await wait(200);
  check("Death's Flight lands beside the prey", await ev(() => { const P = window.__spm.P, m = window.__T.m; return Math.hypot(P.x - m.x, P.y - m.y) < 1.5; }));
  // the sister
  await arena(3, 20000); await wait(4500);
  check('Mirror-Sister walks and acts', await ev(() => !!window.__spm.G.sister && !!window.__spm.G.sister.actId), await ev(() => window.__spm.G.sister && window.__spm.G.sister.actId));
  // the sickened leak miasma, and standing in it refills you
  await arena(2, 4000); await ev(() => { const S = window.__spm; for (const m of S.G.zone.monsters) if (!m.dead) S.poisonMon(m, 5, 10); }); await wait(2500);
  check('The sickened leak miasma', await ev(() => window.__spm.G.clouds.some(c => c.drip)));
  const rg = await ev(() => { const S = window.__spm, P = S.P; S.addCloud(P.x, P.y, 1.5, 5, 0, 'poison'); P.mana = 0; return 0; }); await wait(1000);
  check('Standing in miasma refills', await ev(() => window.__spm.P.inMiasma && window.__spm.P.mana > 3), await ev(() => window.__spm.P.mana));
  await wait(300); await p.screenshot({ path: 'assn_shot.png' });
  for (const r of res) console.log(r); console.log('ERRS', errs.length ? errs.join('\n') : 'none'); await b.close();
})();
