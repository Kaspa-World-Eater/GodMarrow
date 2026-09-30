const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('.cls[data-cls=hemomancer]'); await p.click('#newBtn'); await p.waitForTimeout(500);
  const st = () => p.evaluate(() => { const { P, SK } = window.__spm; return { hp: +P.hp.toFixed(1), vitae: +P.mana.toFixed(1), lanceCost: SK.blance.mana, spearCost: SK.spear.mana, swarmCost: SK.swarm.mana }; });
  console.log('start', JSON.stringify(await st()));
  await p.evaluate(() => { window.__spm.P.hp = 40; }); await p.waitForTimeout(2000);
  console.log('full vitae, 2s heal from 40', JSON.stringify(await st()));
  for (let i = 0; i < 9; i++) await p.evaluate(() => { const { castSkill, P } = window.__spm; P.cast = 0; castSkill('blance', { x: P.x + 3, y: P.y }); });
  console.log('after 9 lances', JSON.stringify(await st()));
  await p.evaluate(() => { window.__spm.P.hp = 40; }); await p.waitForTimeout(2000);
  console.log('empty vitae, 2s heal from 40', JSON.stringify(await st()));
  await p.mouse.move(1440 - 60, 810 - 70); await p.waitForTimeout(200); await p.screenshot({ path: 'shot15_orb.png' });
  console.log('ERR', errs); await b.close();
})();
