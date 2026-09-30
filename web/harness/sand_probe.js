const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await p.waitForTimeout(800);
 const f = () => p.evaluate(() => { const q = window.__spm.KS.fill(); return Math.round(q.fR * 100) + '/' + Math.round(q.fA * 100); });
 const ids = await p.evaluate(() => { const S = window.__spm; return Object.keys(S.SK).filter(k => S.SK[k].cls === 'monk' && S.SK[k].kind !== 'passive' && S.SK[k].tab < 2).map(k => [k, S.SK[k].kind, S.skillCost(k, 1)]); });
 console.log(JSON.stringify(ids));
 for (const [id] of ids) {
   await p.evaluate(() => { window.__spm.P.kR = 0; window.__spm.P.kA = 0; });
   await p.evaluate(id => { const S = window.__spm, P = S.P; P.skills[id] = P.hard[id] = 5; P.cast = 0; S.castSkill(id, { x: P.x + 3, y: P.y + 1 }); }, id);
   const a = await f(); await p.waitForTimeout(1500); const b2 = await f();
   await p.evaluate(() => { const P = window.__spm.P; P.keye = null; P.klotus = null; P.kwalk = false; P.kamber = false; });
   console.log(id, a, '→1.5s', b2);
 }
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
