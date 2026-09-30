const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message + ' ' + (e.stack || '').split('\n')[1]));
  await p.goto('file://' + process.cwd() + '/spiritmancer.html'); await p.waitForTimeout(2500);
  await p.mouse.move(80 * 2, 225 * 2); await p.waitForTimeout(400);
  await p.screenshot({ path: '/tmp/title1.png' });
  await p.waitForTimeout(1300); await p.mouse.move(412 * 2, 128 * 2); await p.waitForTimeout(300);
  await p.screenshot({ path: '/tmp/title2.png' });
  console.log(errs); await b.close();
})();
