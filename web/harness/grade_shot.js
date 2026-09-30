// shots for the grade: each ZONE at each PHASE (0.3 day, 0.6 dusk, 0.75 night), hero at a random open spot near the entry
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 if (process.env.GRADE) await p.evaluate(js => { const o = JSON.parse(js); const g = window.__grade; if ('on' in o) g.on = o.on; for (const k in (o.GR || {})) Object.assign(g.GR[k], o.GR[k]); }, process.env.GRADE);
 await p.evaluate(c => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = c; S.startGame('test'); }, process.env.CLS || 'monk'); await p.waitForTimeout(800);
 const zones = (process.env.ZONES || 'moor,hollow_wood,fen,crypt').split(','), phases = (process.env.PHASES || '0.3,0.75').split(',').map(Number);
 for (const z of zones) {
   await p.evaluate(z => { const S = window.__spm; S.enterZone(z); }, z); await p.waitForTimeout(600);
   await p.evaluate(dxy => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.zone.monsters.forEach(m => { m.hidden = true; }); if (dxy) { const P = window.__zt.P(); P.x += dxy[0]; P.y += dxy[1]; } }, process.env.DXY ? process.env.DXY.split(',').map(Number) : null);
   for (const ph of phases) {
     await p.evaluate(ph => { const S = window.__spm; S.G.clock = window.__zt.DAY().len * ph; S.G.msgT = 0; S.G.bannerT = 0; }, ph);
     await p.waitForTimeout(1600);
     await p.screenshot({ path: `/tmp/gr_${z}_${ph}${process.env.TAG || ''}.png` });
   }
 }
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
