const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(2500);
 if (process.env.HOVER) { const [x, y] = process.env.HOVER.split(',').map(Number); await p.mouse.move(x, y); await p.waitForTimeout(700); }
 await p.screenshot({ path: process.env.OUT || '/tmp/title.png' });
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
