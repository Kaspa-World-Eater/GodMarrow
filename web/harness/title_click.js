const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(2000);
 const L = await p.evaluate(() => window.__title54.layout().map(i => [i.id, i.x, i.y]));
 console.log(JSON.stringify(L));
 const t = L.find(i => i[0] === 'testBtn'); await p.mouse.move(t[1] * 4, (t[2] - 3) * 4); await p.waitForTimeout(200); await p.mouse.click(t[1] * 4, (t[2] - 3) * 4); await p.waitForTimeout(1500);
 console.log('running', await p.evaluate(() => window.__spm.G.running), 'intro hidden', await p.evaluate(() => document.getElementById('intro').hidden));
 await p.keyboard.press('Escape'); await p.waitForTimeout(300);
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
