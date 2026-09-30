// enter each zone, walk the camera a little, report page errors and in-game error banners
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await p.waitForTimeout(600);
 for (const z of (process.env.ZONES || 'moor,hollow_wood,root_deep,fen,crypt,barrow,cata1,ossa').split(',')) {
   const r = await p.evaluate(z => { try { window.__spm.enterZone(z); return 'ok'; } catch (e) { return 'ERR ' + e.message; } }, z); await p.waitForTimeout(900);
   const msg = await p.evaluate(() => { const G = window.__spm.G; return (G.errMsg || G.lastError || '') + ''; });
   console.log(z, r, msg);
 }
 console.log('ERRS', [...new Set(errs)].slice(0, 6).join(' | ') || 'none'); await b.close(); })();
