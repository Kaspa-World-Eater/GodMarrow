// screenshot next to the first object matching FIND (a JS predicate on o) in ZONE
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await p.waitForTimeout(800);
 await p.evaluate(z => { window.__spm.enterZone(z); }, process.env.ZONE || 'moor'); await p.waitForTimeout(700);
 const r = await p.evaluate(([z, find, nth, dx, dy]) => { const S = window.__spm; for (const k in S.G.panels) S.G.panels[k] = false; S.G.msgT = 0; S.G.bannerT = 0;
   const f = new Function('o', 'return ' + find); const L = S.G.zone.objects.concat(S.G.props16 || []).filter(f); const o = L[nth % Math.max(1, L.length)]; if (!o) return 'none';
   S.G.zone.monsters.forEach(m => { m.hidden = true; }); const P = window.__zt.P(); P.x = o.x + dx; P.y = o.y + dy; return `${L.length} found; at ${o.x},${o.y}`; }, [process.env.ZONE || 'moor', process.env.FIND, +(process.env.NTH || 0), +(process.env.DX || 1.8), +(process.env.DY || 2.2)]);
 await p.waitForTimeout(3500);
 await p.evaluate(() => { const S = window.__spm; S.G.msgT = 0; S.G.bannerT = 0; try { S.G.sayT = 0; } catch (e) { } });
 await p.screenshot({ path: process.env.OUT || '/tmp/obj_at.png' }); console.log(r); console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
