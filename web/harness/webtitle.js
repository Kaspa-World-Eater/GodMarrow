const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  await p.goto('file:///tmp/ossport/x73.html'); await p.waitForTimeout(3500);
  await p.screenshot({ path: '/tmp/ossport/webtitle.png' }); await b.close();
})();
