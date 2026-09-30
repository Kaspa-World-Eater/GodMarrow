const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('.cls[data-cls=hemomancer]'); await p.click('#testBtn'); await p.waitForTimeout(400); await p.keyboard.press('Escape');
  await p.evaluate(() => { const { SK, P } = window.__spm; for (const id in SK) if (SK[id].cls === 'hemomancer') { P.hard[id] = 10; P.skills[id] = 10; } P.hp = 99999; P.muts = ['maw', 'bilehump']; });
  const st = () => p.evaluate(() => { const { G, P } = window.__spm; return { brood: G.brood.length, sacs: G.sacs.length, thralls: G.thralls.length, corpses: G.zone.monsters.filter(m => m.dead && !m.hatched && !m.eaten).length, kills: G.zone.monsters.filter(m => m.dead).length, err: G.error }; });
  const cast = (id, x, y) => p.evaluate(([id, x, y]) => { const { castSkill, P } = window.__spm; P.cast = 0; P.mana = 999; castSkill(id, { x, y }); }, [id, x, y]);
  const rel = (dx, dy) => p.evaluate(([dx, dy]) => { const { P } = window.__spm; return [P.x + dx, P.y + dy]; }, [dx, dy]);
  // move to a pack, kill some by lance to make corpses
  await p.evaluate(() => { const { P, G } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; P.x = m.x - 3.5; P.y = m.y; });
  for (let i = 0; i < 14; i++) { const t = await p.evaluate(() => { const { G, P } = window.__spm; const m = G.zone.monsters.filter(m => !m.dead).sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; return [m.x, m.y]; }); await cast('blance', t[0], t[1]); await p.waitForTimeout(250); }
  await p.waitForTimeout(3000);
  console.log('after lance (no auto-hatch expected)', JSON.stringify(await st()));
  let c = await rel(1, 1); await cast('eggsac', c[0], c[1]); await p.waitForTimeout(3500);
  console.log('sac waits', JSON.stringify(await st()));
  const corpse = await p.evaluate(() => { const { G } = window.__spm; const m = G.zone.monsters.find(m => m.dead && !m.hatched && !m.eaten); return m ? [m.x, m.y] : null; });
  if (corpse) { await cast('hatch', corpse[0], corpse[1]); await p.waitForTimeout(200); console.log('hatched corpse', JSON.stringify(await st())); }
  await cast('hatch', c[0], c[1]); await p.waitForTimeout(200); console.log('hatched sac', JSON.stringify(await st()));
  await cast('eggsac', c[0], c[1]); await p.waitForTimeout(100); await cast('thrall', c[0], c[1]); await p.waitForTimeout(200);
  console.log('thrall', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot14_thrall.png' });
  await p.waitForTimeout(5000); console.log('thrall walked/burst', JSON.stringify(await st()));
  c = await p.evaluate(() => { const { G, P } = window.__spm; const e = G.brood[0]; return e ? [e.x, e.y] : [P.x, P.y]; });
  await cast('rupture', c[0], c[1]); await p.waitForTimeout(800);
  console.log('ruptured', JSON.stringify(await st()));
  await p.screenshot({ path: 'shot14_rupture.png' });
  console.log('ERRORS', errs.slice(0, 8));
  await b.close();
})();
