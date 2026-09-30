const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 810 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  await p.goto('file://' + process.cwd() + '/spiritmancer.html');
  await p.screenshot({ path: 'shot8_title.png' });
  await p.click('.cls[data-cls=animancer]');
  await p.click('#newBtn'); await p.waitForTimeout(600);
  console.log('new', JSON.stringify(await p.evaluate(() => { const { P } = window.__spm; return { cls: P.cls, attrs: P.attrs }; })));
  await p.keyboard.press('c'); await p.waitForTimeout(200); await p.screenshot({ path: 'shot8_char.png' });
  // fake a v6 save with spent points
  const key = await p.evaluate(() => Object.keys(localStorage).find(k => k.startsWith('spiritmancer.save')));
  await p.evaluate((key) => { const d = JSON.parse(localStorage.getItem(key)); d.v = 6; delete d.cls; d.attrs = { vit: 20, ene: 25, spi: 30, dex: 18 }; d.statPts = 2; localStorage.setItem(key, JSON.stringify(d)); }, key);
  await p.reload(); await p.waitForTimeout(300);
  await p.click('#continueBtn'); await p.waitForTimeout(600);
  console.log('migrated', JSON.stringify(await p.evaluate(() => { const { P } = window.__spm; return { cls: P.cls, attrs: P.attrs, pts: P.statPts }; })));
  await p.waitForTimeout(3000);
  console.log('errs', errs);
  await b.close();
})();
