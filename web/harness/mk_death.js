const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await p.waitForTimeout(800);
 await p.evaluate(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.msgT = 0; S.P.hurt = 0.15; });
 await p.waitForTimeout(30); await p.screenshot({ path: '/tmp/mk_hit.png' });
 await p.evaluate(() => { const S = window.__spm; S.P.hp = 0; S.P.dead = true; });
 await p.waitForTimeout(1200); await p.screenshot({ path: '/tmp/mk_dead.png' });
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
