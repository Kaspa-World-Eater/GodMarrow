const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1000, height: 1100 } }); await p.goto('file://' + process.cwd() + '/spiritmancer.html'); await p.click('.cls[data-cls=miasmancer]'); await p.screenshot({ path: 'shot_menu.png', fullPage: true }); await b.close(); })();
