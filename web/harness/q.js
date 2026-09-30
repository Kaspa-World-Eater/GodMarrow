const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 for (const c of ['ossumancer', 'hemomancer', 'animancer', 'miasmancer', 'monk']) {
   await p.evaluate(c => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, c); await p.waitForTimeout(500);
   console.log(await p.evaluate(() => { const A = window.__spm.ARC; return [window.__spm.P.cls, A.v_crown.name, A.v_unwritten.up.slice(60)].join(' | '); }));
 }
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
