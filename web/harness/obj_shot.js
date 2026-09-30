// OBJ=gate ZONES=moor: stand beside the first object matching and take a screenshot
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
 await p.goto('file://' + process.env.HTML); await p.waitForTimeout(1500);
 await p.evaluate(() => { localStorage.removeItem('spiritmancer.test'); const S = window.__spm; S.G.pickCls = 'monk'; S.startGame('test'); }); await p.waitForTimeout(800);
 const want = process.env.OBJ || 'gate', off = (process.env.OFF || '1.5,2').split(',').map(Number);
 for (const z of (process.env.ZONES || 'moor').split(',')) {
   const r = await p.evaluate(([z, want, off]) => { const S = window.__spm; if (S.G.zone.id !== z) S.enterZone(z); const G = S.G; for (const k in G.panels) G.panels[k] = false; G.msgT = 0; G.bannerT = 0;
     const o = G.zone.objects.find(o => o.spr === want || o.type === want) || (G.zone.props || []).find(q => q.kind === want);
     if (!o) return 'none'; S.P.x = o.x + off[0]; S.P.y = o.y + off[1]; G.zone.monsters.forEach(m => { m.hidden = true; }); return o.name || o.kind; }, [z, want, off]);
   await p.waitForTimeout(1600); await p.screenshot({ path: `/tmp/obj_${want}_${z}.png` }); console.log(z, r);
 }
 console.log('ERRS', errs.slice(0, 3).join(' | ') || 'none'); await b.close(); })();
