const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 console.log(await p.evaluate(() => typeof ZONE_GEN !== 'undefined' ? Object.keys(ZONE_GEN).join(' ') : 'noglobal'));
 await b.close(); })();
