const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.click('.cls[data-cls=ossumancer]'); await p.click('#newBtn'); await p.waitForTimeout(400);
  await p.keyboard.press('c'); await p.waitForTimeout(150); await p.screenshot({ path: 'shot21_char.png' });
  await p.keyboard.press('s'); await p.waitForTimeout(150); await p.screenshot({ path: 'shot21_skills.png' });
  await p.keyboard.press('Escape'); await p.keyboard.press('a'); await p.waitForTimeout(150); await p.screenshot({ path: 'shot21_web.png' });
  // walk the moor looking for the arcana shrine: report where it is
  console.log(await p.evaluate(() => { const { G, P } = window.__spm; const o = G.zone.objects.find(o => o.kind === 'arcana'); return JSON.stringify({ shrine: o && [Math.round(o.x), Math.round(o.y)], p: [Math.round(P.x), Math.round(P.y)] }); }));
  await p.evaluate(() => { const { G, P, interact } = window.__spm; const o = G.zone.objects.find(o => o.kind === 'arcana'); P.x = o.x; P.y = o.y + 1; interact(o); });
  await p.waitForTimeout(300);
  console.log('after shrine', await p.evaluate(() => JSON.stringify({ pts: window.__spm.P.arc.pts, done: window.__spm.P.done })));
  await p.keyboard.press('Escape'); await p.waitForTimeout(100); await p.screenshot({ path: 'shot21_shrine.png' });
  console.log('errs', errs);
  await b.close();
})();
