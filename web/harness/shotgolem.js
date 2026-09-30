const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 2 });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
  await p.evaluate(() => { window.__spm.G.pickCls = 'hemomancer'; window.__spm.startGame('test'); }); await wait(400); await p.keyboard.press('Escape');
  await ev(() => { const S = window.__spm, { P, G } = S; G.zone.monsters.forEach(m => { m.dead = true; }); P.hard.fgolem = 5; S.rederive(); P.mana = 999; P.cast = 0; S.castSkill('fgolem', { x: P.x + 1.2, y: P.y - 1.2 }); });
  await wait(1500);
  await ev(() => { const g = window.__spm.G.fgolem; if (g) { g.face = 1; g.meals = 4; } });
  await p.screenshot({ path: 'shot_golem.png', clip: { x: 380, y: 120, width: 220, height: 160 } });
  await ev(() => { const g = window.__spm.G.fgolem; if (g) { g.mawOpen = 1; g.slam = 0.15; } });
  await wait(30); await p.screenshot({ path: 'shot_golem2.png', clip: { x: 380, y: 120, width: 220, height: 160 } });
  console.log('golem', await ev(() => !!window.__spm.G.fgolem), errs); await b.close();
})();
