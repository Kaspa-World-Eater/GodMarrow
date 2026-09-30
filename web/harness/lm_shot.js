const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(2500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await p.waitForTimeout(800);
 let n = 0;
 for (const z of (process.env.ZONES || 'moor').split(',')) {
   await p.evaluate(z => window.__zt.ez(z), z); await p.waitForTimeout(600);
   const L = await p.evaluate(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.zone.monsters.forEach(m => { m.hidden = true; }); return (S.G.zone._lm55 || []).map(o => [o.d.id, o.cx, o.cy, o.fw, o.fh]); });
   console.log(z, JSON.stringify(L));
   for (const [id, cx, cy, fw, fh] of L) {
     await p.evaluate(([cx, cy, fw, fh]) => { const P = window.__zt.P(); P.x = cx - fw / 2 - 1; P.y = cy + fh / 2 + 2.5; const S = window.__spm; S.G.clock = window.__zt.DAY().len * (+(window.__ph || 0.3)); }, [cx, cy, fw, fh]);
     await p.evaluate(() => { const S = window.__spm; S.G.msgT = 0; S.G.bannerT = 0; }); await p.waitForTimeout(1800); await p.screenshot({ path: `/tmp/lm_${id}.png` }); n++;
   }
 }
 console.log('shots', n, 'ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
