const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await p.waitForTimeout(800);
 const out = [];
 for (let i = 0; i < 24; i++) {
   out.push(await p.evaluate(() => { const S = window.__spm, P = S.P; P.skills.kstar = P.hard.kstar = 5; P.cast = 0; S.castSkill('kstar', { x: P.x + 3, y: P.y }); const q = S.KS.fill(); return Math.round(q.fR * 100); }));
   await p.waitForTimeout(450);
 }
 await p.waitForTimeout(3000); out.push('idle3s:' + await p.evaluate(() => Math.round(window.__spm.KS.fill().fR * 100)));
 console.log(out.join(' ')); await b.close(); })();
