const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await p.waitForTimeout(800);
 for (const z of (process.env.ZONES || 'hollow_wood,moor').split(',')) {
   const ok = await p.evaluate(z => { try { const S = window.__spm; S.enterZone(z); for (const k in S.G.panels) S.G.panels[k] = false; S.G.msgT = 0; S.G.bannerT = 0; S.G.zone.monsters.forEach(m => { m.hidden = true; }); return S.G.zone.id; } catch (e) { return 'ERR ' + e.message; } }, z);
   await p.waitForTimeout(1500); await p.screenshot({ path: `/tmp/ws_${z}${process.env.TAG || ''}.png` }); console.log(z, ok);
 }
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
