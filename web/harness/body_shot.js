const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(c => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, process.env.CLS || 'monk'); await p.waitForTimeout(700);
 await p.evaluate(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.panels.arcana = true; S.G.arcTab = 'body'; S.G.msgT = 0; });
 await p.waitForTimeout(400);
 // hover near the centre of the board to get a tooltip
 await p.mouse.move(1000, 560); await p.waitForTimeout(300);
 await p.screenshot({ path: '/tmp/body1.png' });
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
