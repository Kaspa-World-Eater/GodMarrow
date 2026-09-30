const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 400)); });
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.evaluate(() => { const S = window.__spm; S.G.pickCls = 'ossumancer'; S.startGame('test'); const _e = window.onerror; });
  await p.waitForTimeout(800);
  console.log(await p.evaluate(() => window.__spm.G.error || 'no G.error'));
  console.log(await p.evaluate(() => (window.__spm.G.errStack || '')));
  await b.close();
})();
