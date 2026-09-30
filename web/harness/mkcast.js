const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
 const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 const ev = (f, a) => p.evaluate(f, a), wait = ms => p.waitForTimeout(ms);
 await ev(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await wait(800);
 await ev(() => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.msgT = 0; });
 const shots = [];
 for (const id of (process.env.IDS || 'khands,kfist,kclap,kpalm').split(',')) {
   await ev(id => { const S = window.__spm, P = S.P; P.skills[id] = Math.max(1, P.skills[id] || 0); P.kcd = {}; P.kskyCd = 0; P.cast = 0; S.castSkill(id, { x: P.x + 3, y: P.y + 1 }); }, id);
   for (let i = 0; i < 3; i++) { await wait(120); const f = `/tmp/mc_${id}_${i}.png`; await p.screenshot({ path: f, clip: { x: 760, y: 280, width: 400, height: 320 } }); shots.push(f); }
   await wait(900);
 }
 console.log(shots.length, 'ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
