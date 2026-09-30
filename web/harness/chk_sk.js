const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(2500);
 console.log(await p.evaluate(() => { const S = window.__spm.SK.chitin; return [S.name, S.desc.slice(0, 60), S.perks[0].name, window.__spm.ARC.f_shed.name]; }));
 await b.close(); })();
