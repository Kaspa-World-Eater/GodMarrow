const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'hemomancer'; S.startGame('test'); }); await p.waitForTimeout(800);
 const r = await p.evaluate(() => { const S = window.__spm, P = S.P, G = S.G; const out = [];
   const m = S.makeMon('kneeler', P.x + 2.5, P.y, 5, 'normal', []); out.push('made dead=' + m.dead); G.zone.monsters.push(m); window.__m = m;
   const m2 = S.makeMon('moth', P.x + 2.5, P.y + 1, 5, 'normal', []); G.zone.monsters.push(m2); window.__m2 = m2;
   const _k = S.killMon; return out; });
 for (let i = 0; i < 5; i++) { await p.waitForTimeout(100); console.log(await p.evaluate(() => [__m.dead, __m.hp, __m.deadAt, __m2.dead, __m2.hp].join(','))); }
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
