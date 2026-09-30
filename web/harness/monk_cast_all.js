const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 960, height: 540 } });
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
 await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await wait(800);
 const ids = await ev(() => { const S = window.__spm; return Object.keys(S.SK).filter(k => S.SK[k].cls === 'monk' && S.SK[k].kind !== 'passive'); });
 const out = [];
 for (const id of ids) {
   await ev(id => { const S = window.__spm, P = S.P; P.skills[id] = Math.max(1, P.skills[id] || 0); P.kcd = {}; P.kskyCd = 0; P.cast = 0; S.castSkill(id, { x: P.x + 3, y: P.y + 1 }); }, id);
   await wait(350);
   out.push(id + ':' + await ev(() => { const q = window.__spm.KS.fill(); return Math.round(q.fR * 100) + '/' + Math.round(q.fA * 100); }));
 }
 console.log(out.join(' '));
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
